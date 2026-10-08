// Save system: localStorage key mashenstein.v2, 3 slots + global settings,
// versioned migration (imports the hypothetical v1 blob if present).

const KEY = 'mashenstein.v2';
const V1KEY = 'superMashBros.v1';
const RENDER_DENSITY_VERSION = 2;

// ---- the .mash file ----------------------------------------------------------
//
// SETTINGS > IMPORT / EXPORT (8 Oct 2026): the whole save — all three shifts, the
// settings and every Lab song — as one file a player can carry to a new install.
// On an iPhone that is the only way anything survives: the installed app keeps
// its own storage, and deleting it from the home screen deletes the lot.
//
// JSON inside a small envelope that names itself, so a stray JSON file is refused
// by name rather than read as an empty save, and a file from a newer game is
// refused rather than half-understood.
export const SAVE_FILE_EXT = '.mash';
const SAVE_FILE_TAG = 'MASHENSTEIN SAVE';
const SAVE_FILE_FORMAT = 1;
// A real save is a few kilobytes; the Lab keeps recipes, not audio. Anything
// near this is not a save, and reading it would only stall the frame.
export const SAVE_FILE_MAX_BYTES = 2 * 1024 * 1024;
// Measured on THIS device's hardware, so never carried to another: a new phone
// learns its own ceiling. Stripped on export, kept from the device on import.
const DEVICE_ONLY_SETTINGS = ['renderDensityByBackend', 'renderDensityVersion'];

/** The save as the text of a .mash file. */
export function packSaveFile(data, now = new Date()) {
  const save = JSON.parse(JSON.stringify(data));
  if (save.settings) for (const k of DEVICE_ONLY_SETTINGS) delete save.settings[k];
  delete save.importedV1;
  return JSON.stringify({
    mashenstein: SAVE_FILE_TAG, format: SAVE_FILE_FORMAT, exportedAt: now.toISOString(), save,
  });
}

/**
 * Read a .mash file's text. Returns { save, exportedAt, shifts, labSongs } — the
 * counts are what the IMPORT screen shows before anything is replaced — or throws
 * an Error whose message is written for the player.
 *
 * The bare localStorage blob is accepted too (a v2 save without the envelope),
 * since that is what a save looks like copied out of a browser's dev tools.
 */
export function readSaveFile(text) {
  let file = null;
  try { file = JSON.parse(text); } catch (e) { /* not JSON */ }
  if (!file || typeof file !== 'object') throw new Error('THAT IS NOT A MASHENSTEIN SAVE FILE.');
  const enveloped = file.mashenstein === SAVE_FILE_TAG;
  const save = enveloped ? file.save : file;
  if (!enveloped && !(save && 'version' in save && 'slots' in save)) {
    throw new Error('THAT IS NOT A MASHENSTEIN SAVE FILE.');
  }
  if ((enveloped && Number(file.format) > SAVE_FILE_FORMAT) || Number(save?.version) > 2) {
    throw new Error('THAT FILE IS FROM A NEWER VERSION OF THE GAME. UPDATE THE GAME, THEN IMPORT IT.');
  }
  if (!validSave(migrate(save))) throw new Error('THAT SAVE FILE IS DAMAGED AND CANNOT BE READ.');
  const exported = enveloped ? new Date(file.exportedAt) : null;
  return {
    save,
    exportedAt: exported && Number.isFinite(exported.getTime()) ? exported : null,
    shifts: save.slots.filter(Boolean).length,
    labSongs: Array.isArray(save.bangers?.kept) ? save.bangers.kept.length : 0,
  };
}

function validSave(data) {
  return !!data && Array.isArray(data.slots) && data.slots.length === 3
    && !!data.settings && typeof data.settings === 'object';
}

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
    showFps: false,
    assistSpeed: 100, // 80 | 90 | 100
    // Camera framing. false = NORMAL (the pulled-back 1.6), true = ZOOM IN (the
    // original 2). Only consulted on a desktop: a handheld always gets the
    // closer framing, because on a screen that small the hero is what is at
    // risk of becoming unreadable. See ZOOM_NORMAL/ZOOM_CLOSE in game/run.js.
    zoomIn: false,
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
    // SOUNDTRACK: 'original' or '8bit' — every song in its 8-bit version (the 8-bit
    // alternates; src/game/results-chip.js installSoundtrack). Per install, like the volumes.
    soundtrack: 'original',
    // The jukebox's VISUALISER switch: off, a song plays on under the list and the
    // visualiser never takes over. Per install, like SOUNDTRACK beside it.
    jukeboxVisualiser: true,
    // The jukebox's REPEAT switch: on, a song goes round for as long as it is left; off,
    // it plays through twice and the next one comes on.
    jukeboxRepeat: false,
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
    overtime: { best: 0, bestRelay: 0, bestTime: 0, seedBests: {} },
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

function mergeRenamedMastery(oldValue, currentValue) {
  if (!currentValue) return oldValue;
  return {
    ...oldValue,
    ...currentValue,
    xp: Math.max(Number(oldValue?.xp) || 0, Number(currentValue.xp) || 0),
    level: Math.max(Number(oldValue?.level) || 0, Number(currentValue.level) || 0),
    equipped: currentValue.equipped?.length ? currentValue.equipped : (oldValue?.equipped || []),
  };
}

function migrateHeroIds(slot) {
  let changed = false;
  const mastery = slot.mastery;
  if (mastery) {
    if (mastery.raymn) {
      mastery.ramon = mergeRenamedMastery(mastery.raymn, mastery.ramon);
      delete mastery.raymn;
      changed = true;
    }
    // Gary used to occupy this playable slot before the current hero was added.
    if (mastery.gary) {
      mastery.ramon = mergeRenamedMastery(mastery.gary, mastery.ramon);
      delete mastery.gary;
      changed = true;
    }
  }
  const deaths = slot.stats?.deathsByHero;
  if (deaths?.raymn !== undefined) {
    deaths.ramon = (Number(deaths.ramon) || 0) + (Number(deaths.raymn) || 0);
    delete deaths.raymn;
    changed = true;
  }
  return changed;
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
  if (next.soundtrack !== '8bit') next.soundtrack = 'original';
  next.jukeboxVisualiser = next.jukeboxVisualiser !== false;
  next.jukeboxRepeat = next.jukeboxRepeat === true;
  next.audioSyncReportedMs = Number.isFinite(next.audioSyncReportedMs)
    ? Math.round(next.audioSyncReportedMs) : null;
  // RETIRED TOGGLES — everyone gets the same game. The two accessibility
  // switches and the two effect switches are gone; the effects they gated are
  // simply always on. Stripped from existing saves as well as fresh defaults so
  // none of them can linger as ghost state.
  delete next.reducedMotion;
  delete next.reducedFlashing;
  delete next.screenShake;
  delete next.fancyFx;
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
    let heroIdsMigrated = false;
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
      heroIdsMigrated = migrateHeroIds(s) || heroIdsMigrated;
    }
    this.data = data;
    if (normalized.densityHistoryMigrated || heroIdsMigrated) this.persist();
    return this;
  }

  /** Write the save. False when the browser refused (storage full or blocked). */
  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
  }

  // File saves deliberately use the same versioned envelope as localStorage.
  // Import validates the whole envelope before replacing the live save.
  exportData() {
    return JSON.parse(JSON.stringify(this.data));
  }

  /** The whole save as the text of a .mash file (packSaveFile). */
  exportFile(now) {
    return packSaveFile(this.data, now);
  }

  /**
   * Replace the live save with `raw`. The settings this device measured for
   * itself stay (DEVICE_ONLY_SETTINGS). The once-only refunds and renames in
   * load() are not repeated here: the IMPORT screen restarts the game, and
   * load() runs them on the way back up.
   */
  importData(raw) {
    const data = migrate(raw);
    if (!validSave(data)) throw new Error('INVALID SAVE FILE');
    const device = this.data?.settings;
    if (device) for (const k of DEVICE_ONLY_SETTINGS) if (k in device) data.settings[k] = device[k];
    data.settings = normalizeSettings(data.settings).settings;
    data.slots = data.slots.map((s) => (s ? deepMerge(defaultSlot(), s) : null));
    for (const s of data.slots) if (s) migrateHeroIds(s);
    this.data = data;
    this.slotIndex = Math.min(this.slotIndex, this.data.slots.length - 1);
    if (!this.persist()) throw new Error('THIS DEVICE WOULD NOT STORE THE SAVE.');
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
