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
    assistSpeed: 100, // 80 | 90 | 100
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
    },
    coins: 0,
    bench: { shield: 1, magnet: 1, star: 1, slowmo: 1, tuneup: 0, tagWindow: 0, meterRate: 0 },
    mastery: {},      // heroId -> {xp, level, equipped: []}
    mods: { found: [], equipped: [], slots: 2 },
    hub: { roomsOpen: 1, manualsFound: [], npcSeen: {} },
    overtime: { best: 0, bestRelay: 0, seedBests: {} },
    stats: { runs: 0, tags: 0, perfectTags: 0, deaths: 0, coinsEarned: 0 },
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
