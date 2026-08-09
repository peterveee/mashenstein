/**
 * NO HIDDEN PARAMETERS, AND NO DEAD POTS.
 *
 * The preset editor and the voice rack are two files that have to agree about one thing:
 * which keys on a preset actually do something. Nothing enforced that agreement, and it
 * drifted in both directions —
 *
 *   · every one of the eight GameSynth presets carried a `fixedLength` the panel hid, so
 *     the length that governed them in every song was invisible and unreachable;
 *   · five pooled presets (four MetalSynths and an FMSynth) carried `taps`/`tapFalloff`,
 *     which `play` honours for any pooled class, with no Taps card on those panels;
 *   · `clapEngine`'s whole shape — `tapGains` and `tapDecays`, the two slaps and then the
 *     room — had no control anywhere;
 *   · the Taps card offered AdditiveSynth a TONE pot whose path never reads `tapTone`.
 *
 * None of it is visible from inside either file. So this test reads the engine's own
 * `v.<key>` accesses out of src/engine/voices.js and src/engine/audio.js, asks the panel
 * what it draws (`panelKeys`), and requires the two to match per PLAY PATH:
 *
 *   forward   a key a path reads must have a control        (no hidden parameter)
 *   reverse   a control drawn must be read by that path     (no dead pot)
 *
 * Both directions, because they are the same bug seen from either end. Every exception is
 * listed below with the reason it is not a bug.
 *
 * The extraction is deliberately dumb — a regex over the method bodies, comments stripped.
 * It over-reports rather than under-reports, and an over-report is a line in one of the
 * two exception tables with a reason beside it, which is the outcome we want anyway.
 */
import { readFileSync } from 'node:fs';
import { panelKeys, EDITABLE_SYNTHS } from '../tools/mixer-voice-editor.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// `v?.transpose` counts: optional chaining is how the static helpers read a preset.
//
// A CALL does not: `v.map(...)` and `v.filter(...)` are a local list of frequencies being
// mapped, not preset keys, and no preset key is ever invoked. Dropping the call form is
// what lets `filter` stay a real key — a GameSynth's tone filter — while the array method
// of the same name in audio.js is ignored.
const readsIn = (body) => {
  const keys = new Set();
  const src = strip(body);
  for (const m of src.matchAll(/\b(?:v|voice)\??\.([A-Za-z_$][\w$]*)\s*(\()?/g)) {
    if (!m[2]) keys.add(m[1]);
  }
  return keys;
};

/** The class's methods, keyed by name — two-space indent is the class body. */
const methodsOf = (src) => {
  const lines = src.split('\n');
  const starts = [];
  lines.forEach((l, i) => {
    const m = l.match(/^  (?:static )?(?:async )?([A-Za-z_$][\w$]*)\s*\(/);
    if (m) starts.push([i, m[1]]);
  });
  starts.push([lines.length, '<eof>']);
  const out = new Map();
  for (let k = 0; k < starts.length - 1; k++) {
    out.set(starts[k][1], lines.slice(starts[k][0], starts[k + 1][0]).join('\n'));
  }
  return out;
};

const METHODS = methodsOf(read('src/engine/voices.js'));

// A play path that hands the whole preset to a helper reads whatever the helper reads.
// `pitchShift` is the one that matters — it is where TRANSPOSE and FINE are honoured, and
// three of the five paths call it.
const HELPERS = ['pitchShift', 'buildSpec', 'tailOf'];
const keysOfMethod = (name, seen = new Set()) => {
  const keys = new Set();
  if (seen.has(name) || !METHODS.has(name)) return keys;
  seen.add(name);
  const body = METHODS.get(name);
  for (const k of readsIn(body)) keys.add(k);
  for (const h of HELPERS) {
    if (new RegExp(`\\b${h}\\(\\s*(?:v|voice)\\b`).test(strip(body))) {
      for (const k of keysOfMethod(h, seen)) keys.add(k);
    }
  }
  return keys;
};

// `length` is the one property access on a list that is not a call. Nothing else survives
// the call rule above.
const BUILTIN = new Set(['length']);

// What a preset IS rather than how it sounds: stamped by the loader, chosen by the picker,
// measured on save, or written for a human — `note` is the blurb the picker searches and
// shows, not a pitch. None of them is a control, and none belongs on a pot.
const STRUCTURAL = new Set(['id', 'kind', 'synth', 'label', 'category', 'homeLane',
  'level', 'peak', 'factory', 'user', 'draft', 'starter', 'songLocal', 'songOrigin',
  'songSourceId', 'engine', 'note', 'origin']);

const clean = (keys) => new Set([...keys].filter((k) => !BUILTIN.has(k) && !STRUCTURAL.has(k)));

// Read for EVERY voice, before the rack is asked to play anything: `noteSeconds` folds
// LENGTH and FIXED LENGTH into the note, and scheduleStep folds TRIM into its gain.
const SHARED = clean(readsIn(read('src/engine/audio.js')));

const POOLED = EDITABLE_SYNTHS.filter((s) => s !== 'GameSynth' && s !== 'AdditiveSynth' && s !== 'MRDR-3');

/**
 * One case per play path. `methods` is what `play` dispatches to for that voice — plus,
 * for the pooled classes, the pool and the spec builder it goes through.
 *
 * The representative presets carry the sections that gate a control into existence: a tap
 * array so the Taps card is drawn at all, and — for the drum — a noise section, which is
 * what `tapDecays` overrides.
 */
const CASES = [
  { name: 'noise', voice: { kind: 'noise', noise: {}, body: {}, taps: [0, 0.01] },
    methods: ['_playNoise'], oneShot: true },
  { name: 'drum', voice: { kind: 'drum', noise: {}, osc: {}, taps: [0, 0.01] },
    methods: ['_playDrum'], oneShot: true },
  { name: 'GameSynth', voice: { synth: 'GameSynth', filter: {} }, methods: ['_playGame'] },
  { name: 'AdditiveSynth', voice: { synth: 'AdditiveSynth', additive: {} },
    methods: ['_playAdditive'] },
  // No tap array: `_playLayer` has no tap loop, so there is no Taps card to gate into
  // existence and a tap array here would only describe a panel that does not exist.
  { name: 'MRDR-3', voice: { synth: 'MRDR-3', layer: {} },
    methods: ['_playLayer'] },
  ...POOLED.map((synth) => ({
    name: synth,
    voice: { synth },
    methods: ['play', '_pool', 'buildSpec', 'refresh'],
  })),
];

/**
 * FORWARD exceptions: keys a path reads that the panel deliberately does not draw.
 *
 * The one-shots still keep `dur` and `fixedLength` hidden because the dispatch computes a
 * length and then hands `_playNoise`/`_playDrum` `{ time, gain, dry, wet, echo }` — no
 * `dur` at all. How long a one-shot rings is on its own panel: DECAY, HOLD and SWEEP.
 *
 * The pitched synths now also keep `dur` and `fixedLength` hidden, but for the opposite
 * reason: they still matter as compatibility fallback for old songs and presets, while the
 * editable model moved to per-note lengths on the piano roll. A control here would be a
 * second, conflicting place to state note length.
 */
const HIDDEN_OK = {
  noise: ['dur', 'fixedLength'],
  drum: ['dur', 'fixedLength'],
};

/**
 * Read on every play path, drawn by no panel, and rightly so.
 *
 * `monoGroup` names a voice-stealing group that spans a whole KIT — "a new drum hit
 * releases the previous one whatever lane made it", which is how the Food Court gets the
 * single percussion channel a tiny console had. That makes it a property of how a kit was
 * authored, not a knob on one preset: a pot on one voice has nothing to say, because the
 * value only means anything when a SECOND voice names the same group. It is set in the
 * song file and read by the rack, which is the one shape "every key gets a pot" was never
 * about — see the note above, and `_monoGroups` in src/engine/voices.js.
 */
const HIDDEN_OK_EVERY = ['monoGroup'];
const LEGACY_LENGTH_KEYS = new Set(['dur', 'fixedLength']);

/**
 * REVERSE exceptions: controls the panel draws that the extraction does not see the path
 * read. Each one is read somewhere the regex cannot follow.
 */
const DRAWN_OK = {
  // The nine drawbars and the two envelopes are `additive.*`, which `_playAdditive` picks
  // apart itself — the root key is what the extraction sees, and panelKeys agrees.
  // Nothing here yet; kept as the place to state a reason rather than widen a set.
};

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };

for (const c of CASES) {
  const engine = clean(new Set(c.methods.flatMap((m) => [...keysOfMethod(m)])));
  // A one-shot never reaches a length: see HIDDEN_OK.
  for (const k of SHARED) if (!(c.oneShot && (k === 'dur' || k === 'fixedLength'))) engine.add(k);

  const panel = panelKeys(c.voice);
  const allowHidden = new Set([
    ...HIDDEN_OK_EVERY,
    ...(HIDDEN_OK[c.name] || []),
    ...((!c.oneShot && c.name !== 'noise' && c.name !== 'drum') ? LEGACY_LENGTH_KEYS : []),
  ]);
  const allowDrawn = new Set(DRAWN_OK[c.name] || []);

  const hidden = [...engine].filter((k) => !panel.has(k) && !allowHidden.has(k)).sort();
  const dead = [...panel].filter((k) => k !== 'options' && !engine.has(k) && !allowDrawn.has(k)).sort();

  if (hidden.length) fail(`${c.name}: the engine reads it, no control draws it — ${hidden.join(', ')}`);
  if (dead.length) fail(`${c.name}: a pot with nothing behind it — ${dead.join(', ')}`);
  if (!hidden.length && !dead.length) {
    console.log(`ok: ${c.name} — ${panel.size} controls, all of them live`);
  }
}

/**
 * And the catalogue, from the same angle: a stored key that no path on that preset's own
 * kind reads is a value nobody can hear. Reported rather than fatal — `bigRoomClap`'s
 * `tapDetune` is one, and teaching `_playNoise` to read it would change a shipped sound.
 */
const { VOICES } = await import('../src/data/voices.js');
const CASE_FOR = (v) => CASES.find((c) => (v.kind === 'noise' && c.name === 'noise')
  || (v.kind === 'drum' && c.name === 'drum')
  || (v.kind !== 'noise' && v.kind !== 'drum' && c.name === v.synth));
const inert = new Map();
for (const [id, v] of Object.entries(VOICES)) {
  const c = CASE_FOR(v);
  if (!c) continue;
  const engine = clean(new Set(c.methods.flatMap((m) => [...keysOfMethod(m)])));
  for (const k of SHARED) if (!(c.oneShot && (k === 'dur' || k === 'fixedLength'))) engine.add(k);
  for (const k of Object.keys(v)) {
    if (STRUCTURAL.has(k) || engine.has(k) || k === 'options') continue;
    const where = `${k} on ${c.name}`;
    (inert.get(where) || inert.set(where, []).get(where)).push(id);
  }
}
if (inert.size) {
  console.log('\nnote: stored keys no play path reads (data, not controls — a preset saying'
    + ' something its own path cannot hear):');
  for (const [where, ids] of [...inert].sort((a, b) => b[1].length - a[1].length)) {
    const shown = ids.slice(0, 3).join(', ') + (ids.length > 3 ? `, +${ids.length - 3} more` : '');
    console.log(`  ${String(ids.length).padStart(3)} × ${where.padEnd(24)} ${shown}`);
  }
}

// ---- NO POT THAT CANNOT REACH ITS OWN PRESETS -------------------------------
//
// The third direction, and the one that bites hardest. The two walks above ask whether a
// control EXISTS for each key. This asks whether it can hold the VALUE.
//
// A pot's min and max are a promise about stored data, not decoration. A preset outside
// them shows on the end stop, and the first touch of the knob writes the stop — so the
// control rewrites the sound it was opened to inspect, silently, and only for the presets
// unusual enough to have gone out there in the first place. Every one this found was a
// preset doing something deliberate that the panel called impossible:
//
//   · `tpPizz` stores a filter envelope of -1.2 octaves — a pluck whose filter SHUTS as
//     the note starts. The pot was positive-only, on the belief that Tone cannot sweep
//     down. It can: FrequencyEnvelope scales to `baseFrequency * 2 ** octaves`, so a
//     negative octaves puts the top below the base. The row is bipolar now, like the
//     Global Filter's, which it should always have matched.
//   · `triangleDing` and `stTriangleDing` ring at 9000 Hz against a RES FREQ ceiling of
//     8000. A ding is a high thin body; that is the preset, not a typo.
//   · the three VL-1 pipe voices store an attack of 0 — no ramp at all, which `env()`
//     honours — under a floor of 1ms.
//   · both CR-78/808 cowbells sweep in 4ms, under a floor of 5ms and off its 5ms grid.
//   · `tpAlienChorus` is ten detuned oscillators against a UNISON stop of 8.
//
// Each preset's OWN panel is asked — `panelSpec(v)` gives the rows that preset would
// really be drawn — so a MonoSynth is never measured against a drum's ranges. That
// distinction matters: a union of every panel's rows reports two dozen phantom failures,
// because `octaves` means PITCH DROP (to 12) on a MembraneSynth and something narrower
// elsewhere. Rows that store one thing and show another are compared through their own
// `read`, which is the number the pot is actually trying to represent.
const { panelSpec: spec } = await import('../tools/mixer-voice-editor.js');
const numericRows = (v) => {
  const { common, groups } = spec(v);
  const out = new Map();
  for (const r of [...common.rows, ...groups.flatMap((g) => g.rows || [])]) {
    if (r.kind === 'num' && typeof r.min === 'number' && typeof r.max === 'number') {
      out.set(r.path, r);
    }
  }
  return out;
};
const numbersIn = (obj, base, out = [], seen = new Set()) => {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) return out;
  seen.add(obj);
  for (const [k, val] of Object.entries(obj)) {
    const p = base ? `${base}.${k}` : k;
    if (typeof val === 'number') out.push([p, val]);
    else if (val && typeof val === 'object') numbersIn(val, p, out, seen);
  }
  return out;
};
let unreachable = 0;
let valuesChecked = 0;
for (const [id, v] of Object.entries(VOICES)) {
  let rows;
  try { rows = numericRows(v); } catch { continue; }
  const stored = [
    ...numbersIn(v, '').filter(([p]) => !p.startsWith('options.')).map(([p, x]) => [`$${p}`, x]),
    ...numbersIn(v.options || {}, '').map(([p, x]) => [p, x]),
  ];
  for (const [path, raw] of stored) {
    const row = rows.get(path);
    if (!row) continue;
    let shown = raw;
    if (row.read) { try { shown = row.read(raw, v); } catch { continue; } }
    if (typeof shown !== 'number' || !Number.isFinite(shown)) continue;
    valuesChecked++;
    // A hair of float slop: 0.30000000000000004 is not an out-of-range value.
    const eps = Math.max(Math.abs(row.max), 1) * 1e-9;
    if (shown > row.max + eps || shown < row.min - eps) {
      unreachable++; failed++;
      console.log(`FAIL: ${id} stores ${path} = ${shown}, outside ${row.label}'s`
        + ` ${row.min}…${row.max} — the knob would rewrite it on first touch`);
    }
  }
}
if (!unreachable) {
  console.log(`ok: ${valuesChecked} stored values all sit inside the pot that edits them`);
}

console.log(failed ? `\nPOT COVERAGE: ${failed} FAILED` : '\nPOT COVERAGE: PASSED');
process.exit(failed ? 1 : 0);
