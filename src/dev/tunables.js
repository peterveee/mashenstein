// The live tunable registry: accessors for constants the watch build made
// assignable, and nothing else.
//
// Registration only — no storage, no clamping, no policy. That separation is
// deliberate: registration happens at module-eval, in whatever order esbuild
// decided to concatenate the bundle, and anything that reads persisted state
// during that window is a bug waiting for a reordering. src/dev/tune-store.js
// owns loading, validating and applying; this file owns knowing what exists.
//
// In a production bundle nothing ever calls __registerTunables — the plugin did
// not run — so the table stays empty and every function here is a no-op over
// zero entries. That is the intended production behaviour, not a degraded one.

// name -> { get, set, file }
const ACCESSORS = new Map();
// name -> the value the constant had when its module was evaluated. Captured at
// registration rather than read from the manifest so it is unarguably what
// shipped, which is what REVERT and the changed-only copy are measured against.
const DEFAULTS = new Map();

/** Called by generated code appended to each transformed module. */
export function __registerTunables(file, accessors) {
  for (const [name, acc] of Object.entries(accessors)) {
    ACCESSORS.set(name, { ...acc, file });
    DEFAULTS.set(name, acc.get());
  }
}

/** True once at least one module registered — i.e. this is a transformed build. */
export const tuningAvailable = () => ACCESSORS.size > 0;

export const knows = (name) => ACCESSORS.has(name);
export const fileOf = (name) => (ACCESSORS.get(name) || {}).file || null;

export function readOne(name) {
  const acc = ACCESSORS.get(name);
  return acc ? acc.get() : null;
}

/** Every live value, by name. */
export function readAll() {
  const out = Object.create(null);
  for (const [name, acc] of ACCESSORS) out[name] = acc.get();
  return out;
}

/** The as-shipped values, by name. */
export function defaults() {
  const out = Object.create(null);
  for (const [name, v] of DEFAULTS) out[name] = v;
  return out;
}

export const defaultOf = (name) => (DEFAULTS.has(name) ? DEFAULTS.get(name) : null);

/**
 * Assign values by name. Unknown names are skipped rather than thrown on: a
 * tuning stored before a rename should lose the stale entry, not refuse to load
 * the rest of the session's work.
 *
 * Returns the names actually applied.
 */
export function applyTuning(values) {
  const applied = [];
  for (const [name, v] of Object.entries(values || {})) {
    const acc = ACCESSORS.get(name);
    if (!acc || !Number.isFinite(Number(v))) continue;
    acc.set(Number(v));
    applied.push(name);
  }
  return applied;
}

/** Names whose live value differs from what shipped. */
export function changed() {
  const out = [];
  for (const [name, acc] of ACCESSORS) {
    if (acc.get() !== DEFAULTS.get(name)) out.push(name);
  }
  return out;
}

/**
 * Run `fn` with `values` applied, then put everything back — so a readout can
 * ask "what would jumpHeightFor say under this tuning" without the answer
 * leaking into the frame being drawn.
 */
export function withTuning(values, fn) {
  const before = readAll();
  try {
    applyTuning(values);
    return fn();
  } finally {
    applyTuning(before);
  }
}

/**
 * Pastable source for exactly the constants that moved, grouped by file and
 * formatted the way the file already writes them.
 *
 * The point is the hand-edit: you tune, you copy, you paste two lines into
 * player.js. Emitting unchanged constants would bury the two lines that matter
 * in twenty-four that do not.
 */
export function sourceLines(rows) {
  const moved = changed();
  if (!moved.length) return '';
  const rowOf = new Map((rows || []).map((r) => [r.name, r]));
  const byFile = new Map();
  for (const name of moved) {
    const acc = ACCESSORS.get(name);
    if (!byFile.has(acc.file)) byFile.set(acc.file, []);
    byFile.get(acc.file).push(name);
  }
  const out = [];
  for (const [file, names] of byFile) {
    out.push(file);
    for (const name of names) {
      const row = rowOf.get(name);
      const v = ACCESSORS.get(name).get();
      // Match how the file declares it: integers stay integers, and a value is
      // printed to its manifest precision rather than to float noise.
      const text = row && row.fmt > 0
        ? String(Number(v.toFixed(row.fmt)))
        : String(Math.round(v));
      out.push(`  const ${name} = ${text};`);
    }
  }
  return out.join('\n');
}
