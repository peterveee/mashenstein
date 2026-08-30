// The behavioural half of the tuning work. tests/tunables.js reads source and
// asserts the constants still exist; this builds the bundle the way `npm run
// dev` does — plugin on — and asserts that moving them actually moves the game,
// that a stored tuning cannot poison a later session, and that the copy you
// paste back into source says what you changed and nothing else.
import esbuild from 'esbuild';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installDom } from './dom-stub.js';
import { tunablePlugin } from '../tools/lib/tunable-plugin.js';
import { TUNABLES, byName, clampTunable } from '../tools/lib/tunables.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A tiny entry that re-exports exactly what the assertions need, built through
// the real plugin so the accessors under test are the ones the dev build gets.
const ENTRY = `
export * from '${root}/src/dev/tunables.js';
export * from '${root}/src/dev/tune-store.js';
export { jumpHeightFor, airtimeFor } from '${root}/src/game/player.js';
export { worstAirtime, Spawner } from '${root}/src/game/spawner.js';
export { drawToon } from '${root}/src/sprites/toons.js';
// Pulled in for its constants alone: run.js owns BASE_SPEED and the speed ramp,
// and a module that is never imported is a module that never registers.
export { RunState } from '${root}/src/game/run.js';
`;

installDom();

const { outputFiles } = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: root, sourcefile: 'tune-entry.js', loader: 'js' },
  bundle: true, format: 'iife', globalName: 'T', write: false,
  target: ['es2022'], logLevel: 'silent', plugins: [tunablePlugin()],
});
const T = new Function(`${outputFiles[0].text}; return T;`)();

// ---------------------------------------------------------------- registered
assert(T.tuningAvailable(), 'a plugin-built bundle registers its tunables');
{
  const missing = TUNABLES.filter((r) => !T.knows(r.name)).map((r) => r.name);
  assert(missing.length === 0, `every manifest constant is registered (missing: ${missing.join(', ') || 'none'})`);
}

// ------------------------------------------------- moving a constant moves it
// The claim the whole design rests on: a setter reaches the arithmetic, and it
// reaches it ACROSS a module boundary. worstAirtime() lives in spawner.js and
// reads GRAVITY and BASE_JUMP_V from player.js at call time; if that read had
// been folded at import, this is where it would show.
{
  const base = { jumpMult: 1, heavy: false };
  const h0 = T.jumpHeightFor(base);
  const w0 = T.worstAirtime();
  assert(Math.abs(h0 - 56.888) < 0.01, `base jump height starts at 56.9px (${h0.toFixed(3)})`);
  assert(Math.abs(w0 - 0.512) < 0.001, `worstAirtime starts at 0.512s (${w0.toFixed(4)})`);

  T.applyTuning({ GRAVITY: 450 });
  const h1 = T.jumpHeightFor(base);
  const w1 = T.worstAirtime();
  assert(Math.abs(h1 - h0 * 2) < 0.01, 'halving GRAVITY doubles the jump height');
  assert(Math.abs(w1 - w0 * 2) < 0.001,
    'worstAirtime in spawner.js follows GRAVITY in player.js — the fairness floor '
    + 'tracks the physics rather than a value folded at import');
  T.applyTuning(T.defaults());
  assert(T.jumpHeightFor(base) === h0, 'reverting to defaults restores the jump height exactly');
}

// -------------------------------------------------------------- nudge + clamp
{
  const row = byName('GRAVITY');
  T.applyTuning(T.defaults());
  const v = T.nudge('GRAVITY', row.step);
  assert(v === 900 + row.step, `one nudge moves GRAVITY by its step (${v})`);
  // A held key must stop at the rail rather than sail past it.
  for (let i = 0; i < 500; i++) T.nudge('GRAVITY', row.coarse);
  assert(T.readOne('GRAVITY') === row.max, `a held key clamps GRAVITY at its max (${row.max})`);
  for (let i = 0; i < 1000; i++) T.nudge('GRAVITY', -row.coarse);
  assert(T.readOne('GRAVITY') === row.min, `and at its min (${row.min})`);
  T.revertTuning();
  assert(T.readOne('GRAVITY') === 900, 'revert puts GRAVITY back to what shipped');
}

// Every constant must survive a step in both directions without landing on a
// value its own formatter would round to something else — otherwise a label
// reads 0.55 while the number is 0.5500000000000001.
{
  let clean = true;
  for (const row of TUNABLES) {
    if (!T.knows(row.name)) continue;
    T.applyTuning(T.defaults());
    const up = T.nudge(row.name, row.step);
    if (up !== clampTunable(row, up)) clean = false;
    const down = T.nudge(row.name, -row.step * 2);
    if (down !== clampTunable(row, down)) clean = false;
  }
  T.revertTuning();
  assert(clean, 'every constant steps onto values its own precision can express');
}

// ------------------------------------------------------------ the sync hook
// RunState.enter hands REACT_FLOOR to the Spawner it builds, so the constant is
// shadowed the moment a run starts. Moving it must write both or the number
// changes and the stream does not.
{
  const row = byName('REACT_FLOOR');
  assert(row.sync === 'spawner.react', 'REACT_FLOOR declares its sync target');
  const fakeRun = { spawner: { react: 0.25 } };
  T.nudge('REACT_FLOOR', row.step, fakeRun);
  assert(fakeRun.spawner.react === T.readOne('REACT_FLOOR'),
    'nudging REACT_FLOOR writes the live spawner as well as the constant');
  // And a run that starts AFTER the tuning gets it pushed in.
  const fresh = { spawner: { react: 0.25 } };
  T.resyncRun(fresh);
  assert(fresh.spawner.react === T.readOne('REACT_FLOOR'),
    'a freshly built run is resynced to the tuned value');
  T.revertTuning();
}

// ------------------------------------------------------- persistence hygiene
{
  // Unknown names are dropped, not applied.
  const bad = T.sanitize({ v: T.SCHEMA_V, values: { NOT_A_CONSTANT: 5, GRAVITY: 950 } });
  assert(bad.values.GRAVITY === 950 && !('NOT_A_CONSTANT' in bad.values),
    'an unknown name is dropped while the rest of the tuning still loads');
  assert(bad.dropped.some((d) => d.includes('NOT_A_CONSTANT')), 'and the drop is reported, not silent');

  // Out-of-range values are clamped rather than trusted.
  const wild = T.sanitize({ v: T.SCHEMA_V, values: { GRAVITY: 999999 } });
  assert(wild.values.GRAVITY === byName('GRAVITY').max, 'a stored value beyond the rail is clamped');

  // A blob from an older schema is discarded whole. Half-applying a tuning
  // whose numbers may now mean something else is worse than ignoring it.
  const stale = T.sanitize({ v: T.SCHEMA_V - 1, values: { GRAVITY: 100 } });
  assert(Object.keys(stale.values).length === 0, 'a stale schema version is discarded entirely');

  assert(T.sanitize(null).dropped.length === 0 && Object.keys(T.sanitize(null).values).length === 0,
    'no stored tuning is not an error');
  assert(Object.keys(T.sanitize({ v: T.SCHEMA_V, values: { GRAVITY: 'banana' } }).values).length === 0,
    'a non-numeric stored value is refused');
}

// ------------------------------------------------------ save / restore cycle
{
  T.revertTuning();
  T.nudge('GRAVITY', 50);
  T.nudge('STRIDE_RUN', 0.05);
  const n = T.saveTuning();
  assert(n === 2, `only the constants that moved are stored (${n})`);
  // Storing the diff rather than the whole set is what lets a constant retuned
  // in source later take effect, instead of being pinned by a stale copy.
  const raw = JSON.parse(globalThis.localStorage.getItem('mash_diag')).tune;
  assert(Object.keys(raw.values).length === 2 && raw.v === T.SCHEMA_V,
    'the stored blob is the diff plus a schema version');

  T.applyTuning(T.defaults());
  assert(T.readOne('GRAVITY') === 900, 'defaults applied before the restore');
  const { applied } = T.loadTuning();
  assert(applied.length === 2 && T.readOne('GRAVITY') === 950,
    'a stored tuning is restored on the next session');

  T.revertTuning();
  assert(!JSON.parse(globalThis.localStorage.getItem('mash_diag')).tune,
    'revert clears the stored tuning as well as the live values');
}

// ------------------------------------------------------------- sourceLines
{
  T.revertTuning();
  assert(T.sourceLines(TUNABLES) === '', 'an untouched session copies nothing');
  T.nudge('GRAVITY', 50);
  T.nudge('STRIDE_RUN', 0.05);
  const text = T.sourceLines(TUNABLES);
  const lines = text.split('\n');
  assert(lines.includes('src/game/player.js') && lines.includes('src/sprites/toons.js'),
    'the copy is grouped by the file each constant lives in');
  assert(text.includes('const GRAVITY = 950;'), 'an integer constant is copied as an integer');
  assert(text.includes('const STRIDE_RUN = 0.6;'), 'a fractional constant is copied at its own precision');
  assert(!/e[+-]\d/.test(text), 'no value is copied in exponent notation');
  assert(lines.filter((l) => l.startsWith('  const')).length === 2,
    'only the two constants that moved appear — a paste is a diff, not a dump');
  T.revertTuning();
}

// --------------------------------------------------------- the camera budget
// The readout the strip exists for. framingFor spends the crane to its limit
// before it touches zoom, so pan === PAN_MAX is the altitude above which a jump
// starts pulling the whole frame back — a change you feel on every jump in the
// game and cannot see by watching one.
//
// That limit used to sit at 101px, under a double jump, and the strip existed
// to warn you when a jump-power nudge crossed it. The crane is sized off the
// tallest jump anyone can make now, so the limit sits ABOVE the whole cast and
// the zoom never opens in play. The number is still worth watching for exactly
// the same reason, and the assertions below are the same question asked the
// other way round: how much room is there before the zoom comes back.
{
  T.revertTuning();
  const { framingFor, PAN_MAX, GROUND_Y, ZOOM } = await import('../src/engine/camera.js');
  const { jumpHeightFor, BASE_JUMP_V, GRAVITY, AIR_JUMP_SCALE } = await import('../src/game/player.js');
  const { HERO_BY_ID } = await import('../src/data/heroes.js');

  // HERO_HEIGHT (24) and HEAD_MARGIN (10) are private to camera.js; derive the
  // limit from framingFor itself rather than restating them here.
  let limit = 0;
  while (framingFor(limit).pan < PAN_MAX && limit < 400) limit += 0.1;
  // The tallest thing anyone in the cast can do: Clara's 1.15 jumpMult with
  // two air jumps stacked on it (capsule plus cape) — measured at 184.0px.
  const TALLEST = 185;
  assert(limit >= TALLEST,
    `the crane holds the tallest jump in the game before the zoom is touched (${limit.toFixed(1)}px vs ${TALLEST}px)`);

  // Kiko carries the double jump now that Mochi has retired — same numbers
  // (jumpMult 1.0, maxJumps 2), so the 98px budget is unchanged.
  const kiko = HERO_BY_ID.kiko;
  assert(kiko.maxJumps === 2, 'kiko is the double-jump hero the budget is measured against');
  const single = jumpHeightFor(kiko);
  const v2 = BASE_JUMP_V * kiko.jumpMult * AIR_JUMP_SCALE;
  const dbl = single + (v2 * v2) / (2 * GRAVITY);
  const f = framingFor(dbl);
  assert(Math.abs(dbl - 98.0) < 0.2, `an apex-timed double jump peaks at 98px (${dbl.toFixed(1)})`);
  assert(f.zoom === ZOOM && f.pan < PAN_MAX,
    `and still fits the crane without touching zoom (pan ${f.pan.toFixed(1)}/${PAN_MAX})`);
  // And with room to spare, which is the point of the new budget: a routine
  // nudge to jump power no longer brings the zoom back on every double jump.
  assert(PAN_MAX - f.pan > 40,
    `with real headroom left (${(PAN_MAX - f.pan).toFixed(1)}px of ${PAN_MAX})`);

  T.applyTuning({ BASE_JUMP_V: 336 });
  const single2 = jumpHeightFor(kiko);
  const v2b = 336 * kiko.jumpMult * AIR_JUMP_SCALE;
  const dbl2 = single2 + (v2b * v2b) / (2 * GRAVITY);
  assert(framingFor(dbl2).zoom === ZOOM,
    `raising BASE_JUMP_V 320 -> 336 no longer opens the zoom on a double jump (${dbl2.toFixed(1)}px)`);
  T.revertTuning();
}

console.log(failed ? 'TUNE STORE: FAILED' : 'TUNE STORE: PASSED');
process.exit(failed ? 1 : 0);
