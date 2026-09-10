// Portrait Lab owns the review values and the short-lived launch session.
// This is deliberately dev-only state: a reload never re-enters a lab run.

export const PORTRAIT_LAB_STORAGE_KEY = 'mash_portrait_lab_v1';

export const PORTRAIT_LAB_DEFAULTS = Object.freeze({
  version: 1,
  worldZoom: 2.3375,
  backgroundZoom: 1,
  cloudOffsetY: 0,
  sunOffsetY: 0,
  groundAnchorRatio: 0.66,
});

const LIMITS = Object.freeze({
  worldZoom: [1.6, 3],
  backgroundZoom: [1, 1.3],
  cloudOffsetY: [-100, 60],
  sunOffsetY: [-100, 60],
  groundAnchorRatio: [0.55, 0.75],
});

const clamp = (value, [lo, hi], fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};

const round = (name, value) => {
  if (name === 'worldZoom') return Math.round(value * 1000) / 1000;
  if (name === 'backgroundZoom') return Math.round(value * 100) / 100;
  if (name === 'groundAnchorRatio') return Math.round(value * 200) / 200;
  return Math.round(value);
};

export function validatePortraitConfig(raw) {
  const candidate = raw && typeof raw === 'object' ? raw : {};
  const source = candidate.version == null || Number(candidate.version) === 1 ? candidate : {};
  const worldZoom = clamp(source.worldZoom, LIMITS.worldZoom, PORTRAIT_LAB_DEFAULTS.worldZoom);
  const out = {
    version: 1,
    // Keep the agreed four-decimal calibration visible in the default record;
    // ordinary fine nudges are still stored at the exposed 0.001 step.
    worldZoom: worldZoom === PORTRAIT_LAB_DEFAULTS.worldZoom ? worldZoom : round('worldZoom', worldZoom),
    backgroundZoom: round('backgroundZoom', clamp(source.backgroundZoom, LIMITS.backgroundZoom, PORTRAIT_LAB_DEFAULTS.backgroundZoom)),
    cloudOffsetY: round('cloudOffsetY', clamp(source.cloudOffsetY, LIMITS.cloudOffsetY, PORTRAIT_LAB_DEFAULTS.cloudOffsetY)),
    sunOffsetY: round('sunOffsetY', clamp(source.sunOffsetY, LIMITS.sunOffsetY, PORTRAIT_LAB_DEFAULTS.sunOffsetY)),
    groundAnchorRatio: round('groundAnchorRatio', clamp(source.groundAnchorRatio, LIMITS.groundAnchorRatio, PORTRAIT_LAB_DEFAULTS.groundAnchorRatio)),
  };
  return Object.freeze(out);
}

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (e) {
    return null;
  }
}

function readStored() {
  const store = storage();
  if (!store) return PORTRAIT_LAB_DEFAULTS;
  try {
    const raw = JSON.parse(store.getItem(PORTRAIT_LAB_STORAGE_KEY) || 'null');
    return validatePortraitConfig(raw);
  } catch (e) {
    return PORTRAIT_LAB_DEFAULTS;
  }
}

function writeStored(config) {
  const store = storage();
  if (!store) return;
  try { store.setItem(PORTRAIT_LAB_STORAGE_KEY, JSON.stringify(config)); } catch (e) { /* best effort */ }
}

const sessionState = {
  active: false,
  startPercent: 0,
  invulnerable: false,
  run: null,
  last: null,
};

export const PortraitLab = {
  config() { return readStored(); },

  adjust(name, delta) {
    if (!Object.prototype.hasOwnProperty.call(LIMITS, name)) return readStored();
    const current = readStored();
    const next = validatePortraitConfig({ ...current, [name]: current[name] + Number(delta || 0) });
    writeStored(next);
    return next;
  },

  reset() {
    const next = validatePortraitConfig(PORTRAIT_LAB_DEFAULTS);
    writeStored(next);
    return next;
  },

  session() {
    return Object.freeze({
      active: !!sessionState.active,
      startPercent: sessionState.startPercent,
      invulnerable: !!sessionState.invulnerable,
    });
  },

  setStartPercent(value) {
    sessionState.startPercent = Math.max(0, Math.min(0.75, Number(value) || 0));
    return this.session();
  },

  setInvulnerable(value) {
    sessionState.invulnerable = !!value;
    return this.session();
  },

  launch({ run = null, cab = null, stage = null, heroId = null, seed = null, startPercent = 0, invulnerable = false } = {}) {
    sessionState.active = true;
    sessionState.startPercent = Math.max(0, Math.min(0.75, Number(startPercent) || 0));
    sessionState.invulnerable = !!invulnerable;
    sessionState.run = run;
    sessionState.last = { cab, stage, heroId, seed, reason: null };
    return validatePortraitConfig(readStored());
  },

  attachRun(run) { sessionState.run = run || null; },

  returnToMenu(reason = 'EXIT') {
    if (!sessionState.active && !sessionState.run) return null;
    const run = sessionState.run;
    const last = {
      ...(sessionState.last || {}),
      stage: run?.stage || sessionState.last?.stage || null,
      reason: String(reason || 'EXIT').toUpperCase(),
    };
    sessionState.active = false;
    sessionState.run = null;
    sessionState.last = last;
    return last;
  },

  last() { return sessionState.last ? { ...sessionState.last } : null; },

  allowsPortrait(state) {
    return !!sessionState.active && !!sessionState.run && state === sessionState.run;
  },
};
