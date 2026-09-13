// Portrait Lab owns the review values and the short-lived launch session.
// This is deliberately dev-only state: a reload never re-enters a lab run.
import {
  PORTRAIT_GROUND_ANCHOR_RATIO, PORTRAIT_GROUND_ANCHOR_MIN_RATIO,
  PORTRAIT_GROUND_ANCHOR_MAX_RATIO,
} from '../engine/portrait-geometry.js';
import { PORTRAIT_BACKGROUND_ZOOM } from '../engine/frame.js';

export const PORTRAIT_LAB_STORAGE_KEY = 'mash_portrait_lab_v1';

export const PORTRAIT_LAB_DEFAULTS = Object.freeze({
  version: 1,
  // These are the review values that gave the portrait frame its clearest
  // starting composition. The ground is intentionally requested below the
  // shelf-derived floor; portraitGeometry places it just above the largest
  // possible chat card on every supported phone.
  // Landscape phones use a 2.2x camera on the 480x270 frame. A portrait
  // phone's short side is 480 logical px wide, so about 3.75x would match the
  // landscape character scale exactly — and that is where this sat.
  //
  // IT CAME DOWN TO 3.5, and what it buys is RUNWAY. Portrait maps the frame
  // onto the phone's SHORT side, so at equal character size it can only show
  // 46% of the horizontal world landscape does; the hero anchor above claws
  // some back and is already at its leftmost. Measured against the rotated
  // phone (work/local/portrait-zoom):
  //
  //   3.75   view 128 wu   104 ahead of the hero   96% of landscape size
  //   3.50   view 137 wu   113 ahead              89% of size
  //   3.20   view 150 wu   126 ahead              82%
  //   3.00   view 160 wu   136 ahead              77%
  //
  // 3.5 is the step that costs almost nothing to look at — 89% against 96% is
  // not a difference you can see without the two side by side — and returns 9
  // world units of warning, about 6% of the landscape runway. Below it the
  // trade turns honest: 3.2 is visibly smaller for another 9 units. The lane
  // SPEED is deliberately not part of this trade; it is the same on every
  // device, because slowing one orientation changes what a jump clears.
  worldZoom: 3.5,
  // Move the authored player column farther left to pay for the closer view:
  // this is presentation-only and does not change simulation or collisions.
  //
  // 24 -> 16 on 12 Sep 2026, and it is worth a world unit of runway each. The
  // simulation keeps PLAYER_X 59 and the renderer shifts the whole picture
  // left by the difference, so the visible band runs 43..180 world units ahead
  // of the camera rather than 35..172, and the hero sees 121 units of road
  // instead of 113 — about 7%, on top of what the 3.5 zoom buys.
  //
  // What made it safe to spend was fixing the twelve places that spelled the
  // picture's right-hand edge `camX + VIEW_W`: that number is 35-plus world
  // units short once the picture leaves the camera, and everything quoting it
  // was retiring, waking and sweeping entities inside the visible band. They
  // all read RunState.viewRightX() now, so the band this buys is a band the
  // game actually draws and keeps.
  //
  // The floor is what stops here: at 16 the hero's own left edge is 26 CSS px
  // from the glass on a 390px phone, which is inside the corner radius of some
  // handsets and close enough to the edge that a slide's dust is clipped.
  heroAnchorX: 16,
  // Keep background silhouettes at the same physical scale as landscape.
  // Portrait then shows a narrower crop of the authored 480x270 backdrop,
  // rather than shrinking the scenery to expose more of it.
  backgroundZoom: Math.round(PORTRAIT_BACKGROUND_ZOOM * 100) / 100,
  cloudOffsetY: -100,
  sunOffsetY: -100,
  // Lift the mountain/terrain backdrop within the tall portrait sky while
  // leaving the authored ground, hero and controls at their existing anchors.
  sceneryOffsetY: -90,
  groundAnchorRatio: PORTRAIT_GROUND_ANCHOR_RATIO,
});

const LIMITS = Object.freeze({
  worldZoom: [1.6, 4.5],
  heroAnchorX: [12, 72],
  backgroundZoom: [1, 2.2],
  cloudOffsetY: [-100, 60],
  sunOffsetY: [-100, 60],
  sceneryOffsetY: [-120, 40],
  groundAnchorRatio: [PORTRAIT_GROUND_ANCHOR_MIN_RATIO, PORTRAIT_GROUND_ANCHOR_MAX_RATIO],
});

const clamp = (value, [lo, hi], fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};

const round = (name, value) => {
  if (name === 'worldZoom') return Math.round(value * 1000) / 1000;
  if (name === 'heroAnchorX') return Math.round(value);
  if (name === 'backgroundZoom') return Math.round(value * 100) / 100;
  if (name === 'sceneryOffsetY') return Math.round(value);
  if (name === 'groundAnchorRatio') return Math.round(value * 200) / 200;
  return Math.round(value);
};

export function validatePortraitConfig(raw) {
  const candidate = raw && typeof raw === 'object' ? raw : {};
  const source = candidate.version == null || Number(candidate.version) === 1 ? candidate : {};
  const worldZoom = clamp(source.worldZoom, LIMITS.worldZoom, PORTRAIT_LAB_DEFAULTS.worldZoom);
  const out = {
    version: 1,
    // Keep the authored starting calibration visible in the default record;
    // ordinary fine nudges are still stored at the exposed 0.001 step.
    worldZoom: worldZoom === PORTRAIT_LAB_DEFAULTS.worldZoom ? worldZoom : round('worldZoom', worldZoom),
    heroAnchorX: round('heroAnchorX', clamp(source.heroAnchorX, LIMITS.heroAnchorX, PORTRAIT_LAB_DEFAULTS.heroAnchorX)),
    backgroundZoom: round('backgroundZoom', clamp(source.backgroundZoom, LIMITS.backgroundZoom, PORTRAIT_LAB_DEFAULTS.backgroundZoom)),
    cloudOffsetY: round('cloudOffsetY', clamp(source.cloudOffsetY, LIMITS.cloudOffsetY, PORTRAIT_LAB_DEFAULTS.cloudOffsetY)),
    sunOffsetY: round('sunOffsetY', clamp(source.sunOffsetY, LIMITS.sunOffsetY, PORTRAIT_LAB_DEFAULTS.sunOffsetY)),
    sceneryOffsetY: round('sceneryOffsetY', clamp(source.sceneryOffsetY, LIMITS.sceneryOffsetY, PORTRAIT_LAB_DEFAULTS.sceneryOffsetY)),
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
