// Persistence and policy for the tunable constants.
//
// Split from src/dev/tunables.js on purpose. That file registers accessors at
// module-eval, in whatever order esbuild concatenated the bundle; anything that
// read stored state during that window would depend on link order. This file
// runs later, from Dev.install(), when every module has finished evaluating and
// the registry is complete.
//
// Everything stored is treated as suspect. A tuning saved before a rename, a
// hand-edited localStorage blob, a value from a build whose slider bounds have
// since moved — all of them arrive here and none of them may override a design
// default silently. Unknown names are dropped, out-of-range values are clamped,
// and a blob from an older schema is discarded whole rather than half-applied.
import { readDiag, writeDiag } from '../engine/diag.js';
import { TUNABLES, byName, clampTunable } from '../../tools/lib/tunables.js';
import { applyTuning, defaults, changed, readOne, knows } from './tunables.js';

// Bump when the meaning of a stored value changes — a rename, a unit change, a
// constant that starts counting something else. Old blobs are then dropped
// rather than reinterpreted, because a number that means something new is more
// dangerous than no number at all.
export const SCHEMA_V = 1;

const KEY = 'tune';

/**
 * Validate a raw stored object into values safe to apply.
 * Returns { values, dropped } — `dropped` names what was thrown away and why,
 * so the caller can say so out loud instead of silently ignoring it.
 */
export function sanitize(raw) {
  const dropped = [];
  if (!raw || typeof raw !== 'object') return { values: {}, dropped };
  if (raw.v !== SCHEMA_V) {
    return { values: {}, dropped: [`schema v${raw.v ?? '?'} != v${SCHEMA_V}`] };
  }
  const values = Object.create(null);
  for (const [name, v] of Object.entries(raw.values || {})) {
    const row = byName(name);
    if (!row) { dropped.push(`${name} (unknown)`); continue; }
    if (!knows(name)) { dropped.push(`${name} (unregistered)`); continue; }
    const clamped = clampTunable(row, v);
    if (clamped == null) { dropped.push(`${name} (not a number)`); continue; }
    if (clamped !== Number(v)) dropped.push(`${name} ${v} -> ${clamped} (clamped)`);
    values[name] = clamped;
  }
  return { values, dropped };
}

/** Apply whatever survived validation. Returns { applied, dropped }. */
export function loadTuning() {
  const { values, dropped } = sanitize(readDiag()[KEY]);
  const applied = applyTuning(values);
  return { applied, dropped };
}

/**
 * Persist exactly the constants that differ from what shipped.
 *
 * Storing only the diff means a constant retuned in source later takes effect
 * on the next run rather than being pinned forever by a stale stored copy of
 * its old value — the failure the schema version alone would not catch.
 */
export function saveTuning() {
  const moved = changed();
  if (!moved.length) {
    writeDiag({ [KEY]: null });
    return 0;
  }
  const values = Object.create(null);
  for (const name of moved) values[name] = readOne(name);
  writeDiag({ [KEY]: { v: SCHEMA_V, values } });
  return moved.length;
}

/** Back to the as-shipped numbers, and forget the stored tuning. */
export function revertTuning() {
  const n = changed().length;
  applyTuning(defaults());
  writeDiag({ [KEY]: null });
  return n;
}

/**
 * Move one constant by `delta`, clamped to its manifest range, and persist.
 *
 * `sync` exists because some constants are copied into a live object when a run
 * starts — RunState.enter hands REACT_FLOOR to the Spawner it builds. Writing
 * only the module constant would move the number and change nothing you can
 * see, which reads as a broken tool rather than as a shadowed value.
 */
export function nudge(name, delta, run) {
  const row = byName(name);
  if (!row || !knows(name)) return null;
  const next = clampTunable(row, readOne(name) + delta);
  applyTuning({ [name]: next });
  if (row.sync && run) {
    const [obj, prop] = row.sync.split('.');
    if (run[obj]) run[obj][prop] = next;
  }
  saveTuning();
  return next;
}

/** Push every sync-hooked constant into a freshly built run. */
export function resyncRun(run) {
  if (!run) return;
  for (const row of TUNABLES) {
    if (!row.sync || !knows(row.name)) continue;
    const [obj, prop] = row.sync.split('.');
    if (run[obj]) run[obj][prop] = readOne(row.name);
  }
}
