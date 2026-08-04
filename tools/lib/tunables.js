// The tunable manifest: which constants the dev build lets you move, and how.
//
// One row per constant, and this file is the only place that knows the full
// set. Three things read it and they must agree, which is why it is data rather
// than three lists that drift:
//
//   tools/lib/tunable-plugin.js  rewrites `const NAME =` to `let NAME =` so a
//                                watch build can assign to it at all
//   src/dev/tune-strip.js        draws the row and applies the arrow keys
//   tests/tunables.js            asserts every name below still exists in the
//                                file it claims, exactly once, as a plain number
//
// Deliberately dependency-free: node loads it for the plugin and the tests, the
// browser bundle loads the same bytes. Nothing here may import from src/.
//
// `step` is one arrow press, `coarse` is shift+arrow. They are chosen so a
// constant can cross its useful range in a handful of presses without ever
// being unable to land on the value you want — GRAVITY moves in tens because
// nobody tunes gravity to the unit, LAND_SQUASH_Y moves in hundredths because
// everybody tunes squash to the hundredth.
//
// `min`/`max` are guard rails against a fat-fingered hold, not design opinions.
// They are wide enough to break the game on purpose, which is frequently the
// fastest way to find out what a number is actually doing.

export const PHYSICS = 'physics';
export const GAIT = 'gait';
export const MOTION = 'motion';

// `sync` names a live object property that shadows the constant once a run is
// under way, and must be written alongside it. Without this the slider moves
// the module constant while the running game keeps using the copy it took at
// construction — the number changes and nothing happens, which reads as a
// broken tool rather than a shadowed value.
export const TUNABLES = [
  // ---- physics: the controller ------------------------------------------
  { file: 'src/game/player.js', name: 'GRAVITY', short: 'GRAVITY', group: PHYSICS, step: 10, coarse: 100, min: 200, max: 2000, fmt: 0 },
  { file: 'src/game/player.js', name: 'BASE_JUMP_V', short: 'BASE_JUMP_V', group: PHYSICS, step: 5, coarse: 50, min: 100, max: 700, fmt: 0 },
  { file: 'src/game/player.js', name: 'HEAVY_GRAVITY_MULT', short: 'HEAVY_GRAV', group: PHYSICS, step: 0.05, coarse: 0.25, min: 1, max: 2.5, fmt: 2 },
  { file: 'src/game/player.js', name: 'AIR_JUMP_SCALE', short: 'AIR_JUMP', group: PHYSICS, step: 0.05, coarse: 0.1, min: 0.2, max: 1.2, fmt: 2 },
  { file: 'src/game/player.js', name: 'VARIABLE_JUMP_CUT', short: 'VJUMP_CUT', group: PHYSICS, step: 5, coarse: 20, min: 0, max: 240, fmt: 0 },
  { file: 'src/game/player.js', name: 'TERMINAL_VY', short: 'TERMINAL_VY', group: PHYSICS, step: 10, coarse: 50, min: -1200, max: -80, fmt: 0 },
  { file: 'src/game/player.js', name: 'STOMP_GRAVITY_MULT', short: 'STOMP_GRAV', group: PHYSICS, step: 0.1, coarse: 0.5, min: 1, max: 6, fmt: 2 },
  { file: 'src/game/player.js', name: 'LANDED_T', short: 'LANDED_T', group: PHYSICS, step: 0.01, coarse: 0.05, min: 0.02, max: 0.6, fmt: 3 },
  { file: 'src/game/player.js', name: 'DUCK_IN_T', short: 'DUCK_IN_T', group: PHYSICS, step: 0.01, coarse: 0.05, min: 0.02, max: 0.6, fmt: 3 },
  { file: 'src/game/player.js', name: 'DUCK_OUT_T', short: 'DUCK_OUT_T', group: PHYSICS, step: 0.01, coarse: 0.05, min: 0.02, max: 0.6, fmt: 3 },
  // The gait/scroll coupling. Lower means faster legs at the same speed, and
  // it is the one number that ties the animation to the world rather than to
  // the clock — which is why it sits in physics and not in gait.
  { file: 'src/game/player.js', name: 'ANIM_SPEED_DIVISOR', short: 'ANIM_DIV', group: PHYSICS, step: 1, coarse: 10, min: 5, max: 200, fmt: 0 },

  // ---- physics: the world -----------------------------------------------
  { file: 'src/game/run.js', name: 'BASE_SPEED', short: 'BASE_SPEED', group: PHYSICS, step: 5, coarse: 20, min: 40, max: 500, fmt: 0 },
  { file: 'src/game/run.js', name: 'SPEED_RAMP_K', short: 'RAMP_K', group: PHYSICS, step: 0.005, coarse: 0.02, min: 0, max: 0.2, fmt: 3 },
  { file: 'src/game/run.js', name: 'SPEED_RAMP_CAP', short: 'RAMP_CAP', group: PHYSICS, step: 0.1, coarse: 0.5, min: 1, max: 4, fmt: 2 },

  // RunState.enter copies this into the spawner it builds, so the live stream
  // keeps its construction-time value unless we write both.
  {
    file: 'src/game/spawner.js', name: 'REACT_FLOOR', short: 'REACT_FLOOR', group: PHYSICS,
    step: 0.01, coarse: 0.05, min: 0.05, max: 1, fmt: 3, sync: 'spawner.react',
  },

  // ---- gait: the run cycle ----------------------------------------------
  { file: 'src/sprites/toons.js', name: 'STRIDE_RUN', short: 'STRIDE', group: GAIT, step: 0.01, coarse: 0.05, min: 0.05, max: 1.4, fmt: 3 },
  { file: 'src/sprites/toons.js', name: 'STRIDE_RUN_HEAVY', short: 'STRIDE_HVY', group: GAIT, step: 0.01, coarse: 0.05, min: 0.05, max: 1.4, fmt: 3 },
  { file: 'src/sprites/toons.js', name: 'LIFT_RUN', short: 'LIFT', group: GAIT, step: 0.01, coarse: 0.05, min: 0, max: 1.4, fmt: 3 },
  { file: 'src/sprites/toons.js', name: 'LIFT_RUN_HEAVY', short: 'LIFT_HVY', group: GAIT, step: 0.01, coarse: 0.05, min: 0, max: 1.4, fmt: 3 },

  // ---- gait: squash and stretch -----------------------------------------
  { file: 'src/sprites/toons.js', name: 'AIR_STRETCH_Y', short: 'STRETCH_Y', group: GAIT, step: 0.005, coarse: 0.02, min: 0, max: 0.5, fmt: 3 },
  { file: 'src/sprites/toons.js', name: 'AIR_STRETCH_X', short: 'STRETCH_X', group: GAIT, step: 0.005, coarse: 0.02, min: 0, max: 0.5, fmt: 3 },
  { file: 'src/sprites/toons.js', name: 'AIR_STRETCH_VY_REF', short: 'STRETCH_REF', group: GAIT, step: 10, coarse: 50, min: 100, max: 1200, fmt: 0 },
  { file: 'src/sprites/toons.js', name: 'LAND_SQUASH_Y', short: 'SQUASH_Y', group: GAIT, step: 0.01, coarse: 0.05, min: 0, max: 0.9, fmt: 3 },
  { file: 'src/sprites/toons.js', name: 'LAND_SQUASH_X', short: 'SQUASH_X', group: GAIT, step: 0.01, coarse: 0.05, min: 0, max: 0.9, fmt: 3 },
  // Paired with LANDED_T in player.js — see the note there. The strip warns
  // when they drift apart rather than silently letting the blend overrun.
  { file: 'src/sprites/toons.js', name: 'SQUASH_T', short: 'SQUASH_T', group: GAIT, step: 0.01, coarse: 0.05, min: 0.02, max: 0.6, fmt: 3 },
  { file: 'src/sprites/toons.js', name: 'RUN_HEAD_TURN', short: 'HEAD_TURN', group: GAIT, step: 1, coarse: 5, min: 0, max: 45, fmt: 0 },

  // ---- motion: velocity smear on obstacles -------------------------------
  // A judder cue has to be judged moving, at the size it will be played at, so
  // these are on the strip rather than settled in a gallery bake-off. STEPS 0
  // is the off position and the honest A/B — flip it while a stage is running.
  { file: 'src/game/run.js', name: 'SMEAR_STEPS', short: 'SMEAR_STEPS', group: MOTION, step: 1, coarse: 4, min: 0, max: 24, fmt: 0 },
  { file: 'src/game/run.js', name: 'SMEAR_ALPHA', short: 'SMEAR_ALPHA', group: MOTION, step: 0.02, coarse: 0.1, min: 0, max: 0.8, fmt: 2 },
  { file: 'src/game/run.js', name: 'SMEAR_SPAN', short: 'SMEAR_SPAN', group: MOTION, step: 0.1, coarse: 0.5, min: 0, max: 3, fmt: 2 },
  { file: 'src/game/run.js', name: 'SMEAR_MAX_PX', short: 'SMEAR_MAX', group: MOTION, step: 1, coarse: 5, min: 1, max: 60, fmt: 0 },
  // The camera's resting magnification, shown as the zoom itself (ships at 2,
  // matching camera.js) rather than as a multiplier — the framing is what you
  // are picturing, not a factor to apply to it. Bound below at 1: VIEW_W-derived
  // spawn and cull distances do not follow it, so far enough out the extra frame
  // shows emptiness and pop-in rather than more game. Also on +/- (dev/index.js).
  { file: 'src/game/run.js', name: 'ZOOM_NORMAL', short: 'ZOOM', group: MOTION, step: 0.05, coarse: 0.25, min: 1, max: 3, fmt: 2 },
  // The ZOOM IN framing, which is also what every handheld gets. On a desktop
  // dev build set to NORMAL this row moves a number the running game is not
  // reading — which is the point: it is here so the other framing can be checked
  // and changed from the same strip.
  { file: 'src/game/run.js', name: 'ZOOM_CLOSE', short: 'ZOOM_CLOSE', group: MOTION, step: 0.05, coarse: 0.25, min: 1, max: 3, fmt: 2 },
  { file: 'src/game/run.js', name: 'ZOOM_PHONE', short: 'ZOOM_PHONE', group: MOTION, step: 0.05, coarse: 0.25, min: 1, max: 3, fmt: 2 },
];

export const GROUPS = [PHYSICS, GAIT, MOTION];

// Files the plugin has to transform, in a stable order.
export const TUNABLE_FILES = [...new Set(TUNABLES.map((t) => t.file))];

export const byGroup = (group) => TUNABLES.filter((t) => t.group === group);
export const byName = (name) => TUNABLES.find((t) => t.name === name) || null;

// Clamp and round one value the way the strip and the persistence loader both
// need to. Rounding to `fmt` keeps 0.1 + 0.2 out of the label, and keeps the
// pasted source line free of a twenty-digit tail.
export function clampTunable(row, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(row.max, Math.max(row.min, n));
  const p = 10 ** row.fmt;
  return Math.round(clamped * p) / p;
}
