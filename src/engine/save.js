// Save system: localStorage key mashenstein.v2, 3 slots + global settings,
// versioned migration (imports the hypothetical v1 blob if present).

const KEY = 'mashenstein.v2';
const V1KEY = 'superMashBros.v1';

export function defaultSettings() {
  return {
    volumes: { master: 1, music: 0.7, sfx: 0.9 },
    muted: false,
    reducedMotion: false,
    reducedFlashing: false,
    screenShake: 1,
    highContrast: false,
    showFps: false,
    assistSpeed: 100, // 80 | 90 | 100
    fancyFx: true,    // WebGL bloom/vignette (when available)
  };
}

export function defaultSlot() {
  return {
    createdAt: 0,
    playtimeSec: 0,
    difficulty: 1, // 1..5 (1-4 identical; 5 = UNPLUGGED)
    campaign: {
      act: 1,
      plugs: {},      // stageId -> [mission, challenge, appliance] booleans
      ranks: {},      // stageId -> 'C'|'B'|'A'|'S'|'CONCERNING'
      cleared: {},    // cabinetId -> true
      bossesDown: {},
      storyFlags: {}, // sawIntro, sawEnding, unplugged, minigamesSeen:[...]
      ngPlus: false,
      bestScore: {},  // stageId -> highest score ever posted on that stage
    },
    coins: 0,
    bench: { shield: 1, magnet: 1, star: 1, tuneup: 0 },
    mastery: {},      // heroId -> {xp, level, equipped: []}
    mods: { found: [], equipped: [], slots: 2 },
    tutor: {},        // one-time teaching prompts already shown
    hub: { roomsOpen: 1, manualsFound: [], npcSeen: {} },
    overtime: { best: 0, bestRelay: 0, seedBests: {} },
    stats: {
      runs: 0, tags: 0, perfectTags: 0, deaths: 0, coinsEarned: 0,
      distanceTraveled: 0, powerupsCollected: 0, appliancesFound: 0,
      deathsByHero: {}, // heroId -> death count while that hero was active
    },
  };
}

function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.version === 2) return data;
  return null;
}

export class Save {
  constructor() {
    this.data = null;
    this.slotIndex = 0;
  }

  load() {
    let data = null;
    try { data = migrate(JSON.parse(localStorage.getItem(KEY))); } catch (e) { /* corrupt -> fresh */ }
    if (!data) {
      data = { version: 2, settings: defaultSettings(), slots: [null, null, null] };
      // v1 import: coins/hiScore/muted acknowledged sincerely in-game later.
      try {
        const v1 = JSON.parse(localStorage.getItem(V1KEY));
        if (v1 && typeof v1 === 'object') {
          const s = defaultSlot();
          s.coins = v1.coins || 0;
          s.overtime.best = v1.hiScore || 0;
          data.settings.muted = !!v1.muted;
          data.slots[0] = s;
          data.importedV1 = true;
        }
      } catch (e) { /* no v1 */ }
    }
    // Deep-default each present slot so new fields appear on old saves.
    data.settings = { ...defaultSettings(), ...data.settings };
    data.slots = data.slots.map((s) => (s ? deepMerge(defaultSlot(), s) : null));
    // Relay simplification: refund the retired PERFECT TAG WINDOW and RELAY
    // METER upgrades exactly once, then drop their bench entries.
    for (const s of data.slots) {
      if (!s || s.relayRefunded) continue;
      let refund = 0;
      if (s.bench && s.bench.tagWindow >= 1) refund += 1500;
      if (s.bench && s.bench.meterRate >= 1) refund += 1200;
      if (s.bench && s.bench.meterRate >= 2) refund += 2400;
      if (s.bench) { delete s.bench.tagWindow; delete s.bench.meterRate; }
      s.coins = (s.coins || 0) + refund;
      s.relayRefunded = true; // migration flag: never refund twice
    }
    // SLOW-MO retired: it fought the player for control of the run. Refund the
    // levels actually paid for (its old track was [0, 800, 2400] over a free
    // base level 1), then drop the bench entry.
    for (const s of data.slots) {
      if (!s || s.slowmoRefunded) continue;
      const lvl = (s.bench && s.bench.slowmo) || 0;
      let refund = 0;
      if (lvl >= 3) refund += 800;
      if (lvl >= 4) refund += 2400;
      if (s.bench) delete s.bench.slowmo;
      s.coins = (s.coins || 0) + refund;
      s.slowmoRefunded = true;
    }
    for (const s of data.slots) {
      if (!s) continue;
      if (s.tutor) delete s.tutor.firstPassive;
      if (s.mastery && s.mastery.gary && !s.mastery.raymn) s.mastery.raymn = s.mastery.gary;
      if (s.mastery) delete s.mastery.gary;
    }
    this.data = data;
    return this;
  }

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full/blocked */ }
  }

  get settings() { return this.data.settings; }
  get slot() { return this.data.slots[this.slotIndex]; }

  newSlot(i, now) {
    const s = defaultSlot();
    s.createdAt = now;
    this.data.slots[i] = s;
    this.slotIndex = i;
    this.persist();
    return s;
  }

  selectSlot(i) { this.slotIndex = i; }

  eraseSlot(i) { this.data.slots[i] = null; this.persist(); }
}

function deepMerge(base, over) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return over !== undefined ? over : base;
  const out = { ...base };
  if (over && typeof over === 'object') {
    for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
  }
  return out;
}

export const save = new Save();
