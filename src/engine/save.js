// Save system: localStorage key mashenstein.v2, 3 slots + global settings,
// versioned migration (imports the hypothetical v1 blob if present).

const KEY = 'mashenstein.v2';
const V1KEY = 'superMashBros.v1';
const RENDER_DENSITY_VERSION = 2;

// AUDIO SYNC: how much LATER than the browser claims the sound actually reaches
// the ear, in milliseconds. Positive is later. Bluetooth is the reason it
// exists: Android Chrome and Windows report the mixer buffer but not the radio,
// so a couple of hundred milliseconds goes unaccounted and the rhythm lane runs
// ahead of the music. The range is one-sided on purpose — a device can hide
// latency from us, it cannot invent negative latency — but a little below zero
// stays available for a player who wants to lean the other way.
export const AUDIO_SYNC_MIN = -100;
export const AUDIO_SYNC_MAX = 500;
export const AUDIO_SYNC_STEP = 10;

export function clampAudioSyncMs(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const stepped = Math.round(n / AUDIO_SYNC_STEP) * AUDIO_SYNC_STEP;
  return Math.max(AUDIO_SYNC_MIN, Math.min(AUDIO_SYNC_MAX, stepped));
}

export function defaultSettings() {
  return {
    volumes: { master: 1, music: 0.7, sfx: 0.9 },
    muted: false,
    reducedMotion: false,
    reducedFlashing: false,
    screenShake: 1,
    showFps: false,
    assistSpeed: 100, // 80 | 90 | 100
    // Camera framing. false = NORMAL (the pulled-back 1.6), true = ZOOM IN (the
    // original 2). Only consulted on a desktop: a handheld always gets the
    // closer framing, because on a screen that small the hero is what is at
    // risk of becoming unreadable. See ZOOM_NORMAL/ZOOM_CLOSE in game/run.js.
    zoomIn: false,
    fancyFx: true,    // WebGL bloom/vignette (when available)
    // A WebGL canvas upload and a direct 2D blit can sustain very different
    // densities on the same device. Keep their learned ceilings separate so a
    // slow diagnostic run on one backend cannot soften the other. Values are a
    // numeric density, 'native' (proved at the display ceiling), or 0 (auto).
    renderDensityByBackend: { webgl: 0, '2d': 0 },
    renderDensityVersion: RENDER_DENSITY_VERSION,
    // Per INSTALL, not per slot: latency belongs to the headphones, not to the
    // save file. `audioSyncAsked` records that the offer has been made once, so
    // the rhythm briefing asks a player exactly one time whichever way they
    // answer. `audioSyncReportedMs` is what the browser claimed at the moment
    // of calibration — kept so a later change of route can be noticed.
    audioSyncMs: 0,
    audioSyncAsked: false,
    audioSyncReportedMs: null,
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

function normalizeSettings(settings) {
  const defaults = defaultSettings();
  const oldVersion = Number(settings && settings.renderDensityVersion) || 0;
  const next = { ...defaults, ...(settings || {}) };
  next.renderDensityByBackend = {
    ...defaults.renderDensityByBackend,
    ...(next.renderDensityByBackend || {}),
  };
  // Direct Canvas2D rendering changed the meaning of the old 2D ceiling.
  // Preserve WebGL history, but let 2D AUTO measure the new path again.
  if (oldVersion < RENDER_DENSITY_VERSION) next.renderDensityByBackend['2d'] = 0;
  next.renderDensityVersion = RENDER_DENSITY_VERSION;
  delete next.renderDensity;
  // HIGH CONTRAST OUTLINES retired: it ringed every obstacle in a white box at
  // hitbox size, which never lined up with art drawn 4/3 bigger. Anyone who had
  // it on is still carrying the flag; drop it so it cannot be read back.
  delete next.highContrast;
  // A hand-edited or half-written offset must not reach the audio clock: every
  // read of it is inside a beat calculation, and NaN there stops the lane dead.
  next.audioSyncMs = clampAudioSyncMs(next.audioSyncMs);
  next.audioSyncAsked = !!next.audioSyncAsked;
  next.audioSyncReportedMs = Number.isFinite(next.audioSyncReportedMs)
    ? Math.round(next.audioSyncReportedMs) : null;
  return { settings: next, densityHistoryMigrated: oldVersion < RENDER_DENSITY_VERSION };
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
    const normalized = normalizeSettings(data.settings);
    data.settings = normalized.settings;
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
    if (normalized.densityHistoryMigrated) this.persist();
    return this;
  }

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full/blocked */ }
  }

  // File saves deliberately use the same versioned envelope as localStorage.
  // Import validates the whole envelope before replacing the live save.
  exportData() {
    return JSON.parse(JSON.stringify(this.data));
  }

  importData(raw) {
    const data = migrate(raw);
    if (!data || !Array.isArray(data.slots) || data.slots.length !== 3
      || !data.settings || typeof data.settings !== 'object') {
      throw new Error('INVALID SAVE FILE');
    }
    data.settings = normalizeSettings(data.settings).settings;
    data.slots = data.slots.map((s) => (s ? deepMerge(defaultSlot(), s) : null));
    this.data = data;
    this.slotIndex = Math.min(this.slotIndex, this.data.slots.length - 1);
    this.persist();
    return this;
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
