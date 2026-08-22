/**
 * NO HIDDEN PARAMETERS, AND NO DEAD POTS.
 *
 * The preset editor and the voice rack are two files that have to agree about one thing:
 * which keys on a preset actually do something. Nothing enforced that agreement, and it
 * drifted in both directions —
 *
 *   · every one of the eight KNDO-5 presets carried a `fixedLength` the panel hid, so
 *     the length that governed them in every song was invisible and unreachable;
 *   · five pooled presets (four Tone drums and an FMSynth) carried `taps`/`tapFalloff`,
 *     which `play` honours for any pooled class, with no Taps card on those panels;
 *   · `clapEngine`'s whole shape — `tapGains` and `tapDecays`, the two slaps and then the
 *     room — had no control anywhere;
 *   · the Taps card offered WNDR-9 a TONE pot whose path never reads `tapTone`.
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
import {
  panelKeys, panelSpec, EDITABLE_SYNTHS, CHORUS_DEFAULTS,
} from '../tools/mixer-voice-editor.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// `v?.transpose` counts: optional chaining is how the static helpers read a preset.
//
// A CALL does not: `v.map(...)` and `v.filter(...)` are a local list of frequencies being
// mapped, not preset keys, and no preset key is ever invoked. Dropping the call form is
// what lets `filter` stay a real key — a KNDO-5's tone filter — while the array method
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
const extraReads = (files) => {
  const keys = new Set();
  for (const file of files || []) {
    for (const k of readsIn(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))) keys.add(k);
  }
  return keys;
};

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

const POOLED = EDITABLE_SYNTHS.filter((s) => s !== 'KNDO-5' && s !== 'WNDR-9'
  && s !== 'MRDR-3' && s !== 'TNGR-2');

/**
 * One case per play path. `methods` is what `play` dispatches to for that voice — plus,
 * for the pooled classes, the pool and the spec builder it goes through.
 *
 * The representative presets carry the sections that gate a control into existence: a tap
 * array so the Taps card is drawn at all, and — for the drum — a noise section, which is
 * what `tapDecays` overrides.
 */
const CASES = [
  { name: 'drum', voice: { kind: 'drum', noise: {}, osc: {}, taps: [0, 0.01] },
    methods: ['_playDrum'], oneShot: true },
  { name: 'KNDO-5', voice: { synth: 'KNDO-5', filter: {} }, methods: ['_playGame'] },
  { name: 'WNDR-9', voice: { synth: 'WNDR-9', additive: {} },
    methods: ['_playAdditive'] },
  // No tap array: `_playLayer` has no tap loop, so there is no Taps card to gate into
  // existence and a tap array here would only describe a panel that does not exist.
  { name: 'MRDR-3', voice: { synth: 'MRDR-3', layer: {} },
    methods: ['_playLayer'] },
  // TNGR-2's parameters are read in two places now: the rack hands a note to the lane's
  // worklet node, and the controller composes the patch that node holds — which is where
  // the shared voice-level controls (key mode, glide, vibrato) are picked up. Both are
  // named, or the shared four would look like pots with nothing behind them.
  { name: 'TNGR-2', voice: { synth: 'TNGR-2', tngr2: { oscA: {}, oscB: {}, amp: {}, filter: {} } },
    methods: ['_playTngr2Node', 'warmTngr2Lane', '_collectTngr2', 'flushTngr2Offline',
      '_tngr2Output'],
    also: ['src/engine/tngr2/controller.js'] },
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
  drum: ['dur', 'fixedLength'],
};

/**
 * Read on every play path, drawn by no panel, and rightly so.
 *
 * `monoGroup` names a voice-stealing group that spans a whole KIT — "a new drum hit
 * releases the previous one whatever lane made it", which is how the Food Court gets the
 * single percussion channel a tiny console had. It is drawn NOW, as CHOKE on the one-shot
 * panels, because the hats every kit wants choked were otherwise only authorable by
 * hand-editing a song file. It stays hidden on the POOLED classes: `play` reads it for
 * any voice, but a choke group on a lead is a kit control on an instrument that is not
 * part of a kit, and the arcade Tone drums that do use one are authored in source.
 *
 * `chorus` is the same kind of compatibility read for the pooled Tone families. The
 * user-facing chorus is a channel insert on MRDR-3 (the three MRDR chorus pots are still
 * checked below); old pooled presets may retain the legacy field, but it is not an
 * editable per-voice control and must not be mistaken for one.
 */
const HIDDEN_OK_EVERY = ['monoGroup', 'chorus'];
const LEGACY_LENGTH_KEYS = new Set(['dur', 'fixedLength']);

/**
 * REVERSE exceptions: controls the panel draws that the extraction does not see the path
 * read. Each one is read somewhere the regex cannot follow.
 */
const DRAWN_OK = {
  // The nine drawbars and the two envelopes are `additive.*`, which `_playAdditive` picks
  // apart itself — the root key is what the extraction sees, and panelKeys agrees.
  //
  // CHOKE is read one frame out from the method this case names: `play` resolves
  // `v.monoGroup` into a group key and hands it down, so `_playNoise`/`_playDrum` never
  // mention the word. The extraction reads method bodies, so it cannot see that — and
  // naming `play` in `methods` here would drag every pooled-path read onto the drum case
  // instead. tests/drum-choke.js is what actually holds the behaviour.
  drum: ['monoGroup'],
};

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };

for (const c of CASES) {
  const engine = clean(new Set([...c.methods.flatMap((m) => [...keysOfMethod(m)]),
    ...extraReads(c.also)]));
  // A one-shot never reaches a length: see HIDDEN_OK.
  for (const k of SHARED) if (!(c.oneShot && (k === 'dur' || k === 'fixedLength'))) engine.add(k);

  const panel = panelKeys(c.voice);
  const allowHidden = new Set([
    ...HIDDEN_OK_EVERY,
    ...(HIDDEN_OK[c.name] || []),
    ...((!c.oneShot && c.name !== 'drum') ? LEGACY_LENGTH_KEYS : []),
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

// Root-key coverage above cannot distinguish `vibrato.rate` from `vibrato.spread`, or
// one supported humanize leaf from another. Assert the shared cards at their real path
// granularity so a permanently false guard cannot make a dead control look covered.
const leafRows = (voice) => {
  const { common, groups } = panelSpec(voice);
  return [...common.rows, ...groups.flatMap((group) => group.rows || [])];
};
const leafMap = (voice) => new Map(leafRows(voice).map((row) => [row.path, row]));
const hasLeaf = (voice, path) => leafMap(voice).has(path);
const expectLeaf = (voice, path, expected, why) => {
  const actual = hasLeaf(voice, path);
  if (actual !== expected) fail(`${voice.kind || voice.synth}: ${path} ${why}`);
};

const NON_MRDR_MELODIC = EDITABLE_SYNTHS
  .filter((synth) => synth !== 'MRDR-3')
  .map((synth) => ({ synth }));
for (const voice of NON_MRDR_MELODIC) {
  expectLeaf(voice, '$vibrato.spread', false,
    'must be absent because this engine has no per-unison vibrato voices');
}
for (const voice of [{ kind: 'drum' }]) {
  expectLeaf(voice, '$vibrato.depth', false, 'must be absent on an unpitched one-shot');
  expectLeaf(voice, '$vibrato.spread', false, 'must be absent on an unpitched one-shot');
  expectLeaf(voice, '$humanize.entry', false, 'must be absent without unison voices');
}
expectLeaf({ synth: 'WNDR-9' }, '$humanize.entry', false,
  'must be absent without unison voices');
expectLeaf({ synth: 'WNDR-9' }, '$humanize.filter', false,
  'must be absent because the additive path never reads filter variation');

const POOLED_GENERIC_VIBRATO = EDITABLE_SYNTHS.filter((synth) =>
  !['KNDO-5', 'WNDR-9', 'MRDR-3', 'TNGR-2'].includes(synth));
for (const synth of POOLED_GENERIC_VIBRATO) {
  const row = leafMap({ synth }).get('$vibrato.depth');
  if (!row || row.min !== 0 || row.max !== 1 || row.unit !== '') {
    fail(`${synth}: VIB DEPTH must expose Tone.Vibrato's normalized 0-1 range without semitone units`);
  }
}

// MRDR is deliberately frozen while its AudioWorklet backend is being built. These
// assertions do not redefine its panel; they ensure this non-MRDR cleanup cannot remove
// or rescale the controls already exposed by the native implementation.
{
  const mrdr = { synth: 'MRDR-3', layer: { osc1: { unison: 2 } } };
  const rows = leafMap(mrdr);
  const depth = rows.get('$vibrato.depth');
  for (const path of ['$vibrato.delay', '$vibrato.spread', '$humanize.entry', '$portamento']) {
    if (!rows.has(path)) fail(`MRDR-3 freeze: ${path} changed during the non-MRDR cleanup`);
  }
  if (!depth || depth.min !== 0 || depth.max !== 12 || depth.unit !== 'semi') {
    fail('MRDR-3 freeze: native VIB DEPTH range or unit changed during the non-MRDR cleanup');
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
  const engine = clean(new Set([...c.methods.flatMap((m) => [...keysOfMethod(m)]),
    ...extraReads(c.also)]));
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
//   · legacy cowbell copies once stored 4ms pitch sweeps, under a floor of 5ms and off
//     its 5ms grid — fixed-frequency 808 recipes now keep that path out entirely.
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

// ---- AND NO POT THAT OPENS ON A VALUE THE ENGINE WOULD NOT USE --------------
//
// The fourth direction. A pot that EXISTS, whose key a path reads, whose range holds every
// stored value — and which still opens on the wrong number, because the sound it is
// drawing has no stored value at all and the engine's own fallback is what you are hearing.
//
// MRDR-3's Chorus 2 is the case. It has no section switch: MIX at zero IS off, the same
// deal the LFO's DEPTH makes, so there is no `SECTION_DEFAULTS` entry to seed it and the
// three shaping pots carry `buildChorus`'s `??` fallbacks as their row defaults instead.
// That is two files stating one number — unavoidably, because the engine imports Tone and
// cannot be loaded here — so the numbers are compared as TEXT rather than trusted.
const engineSrc = strip(read('src/engine/voices.js'));
const drifted = [];
for (const [key, shown] of Object.entries(CHORUS_DEFAULTS)) {
  const m = engineSrc.match(new RegExp(`spec\\.${key}\\s*\\?\\?\\s*(-?[\\d.]+)`));
  if (!m) { drifted.push(`${key}: the panel defaults it, buildChorus has no fallback for it`); continue; }
  if (Number(m[1]) !== shown) drifted.push(`${key}: pot opens on ${shown}, engine falls back to ${m[1]}`);
}
if (drifted.length) {
  failed += drifted.length;
  for (const d of drifted) console.log(`FAIL: chorus default drift — ${d}`);
} else {
  console.log(`\nok: ${Object.keys(CHORUS_DEFAULTS).length} chorus pots open on the value`
    + ' the engine would have used anyway');
}

// ---- THE SAME TWO DIRECTIONS, ONE LEVEL DOWN --------------------------------
//
// Everything above works at ROOT-key granularity: `v.metal` either has a card or it does
// not. That is precisely where `metal.slope` hid — seven presets in the bank stored a
// -24 dB slope on a section whose card had no SLOPE pot, and nothing complained, because
// the Metal card exists and `metal` is therefore "drawn". The same blind spot held the
// cluster's whole pitch sag (`metal.to`, `metal.sweep`), its amp CURVE, the HOLD stage on
// two of the four sections, the ring's COLOUR and SWEEP TIME, and `sagAt` on all of them.
//
// So the drum sections get the same pair of checks their parents get.
const VOICE_COUNT_DRUM = Object.values(VOICES).filter((v) => v.kind === 'drum').length;
const DRUM_SECTIONS = ['osc', 'osc.fm', 'osc2', 'osc2.fm', 'noise', 'ring', 'metal'];
const at = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

/** Section keys a preset may carry with no pot, each with the reason it is not a bug. */
const SECTION_HIDDEN_OK = {
  // Six numbers naming where the cluster's partials sit against its fundamental. It is a
  // LIST, and a list is not a knob: PARTIALS says how many of them sound and PARTIAL
  // SPREAD pulls them apart, which is what a hand reaches for. Choosing the ratios
  // themselves is a preset-level decision, the way `taps` and the drawbars are.
  'metal.ratios': 'the partial ratio list is data, not a control',
  'metal.floor': 'the exact one-shot VCA floor is part of the hardware recipe',
  'metal.hardStop': 'the exact one-shot source stop is part of the hardware recipe',
  'metal.resonator': 'the resonant tail is controlled by the Advanced switch, not separate pots',
};

{
  const sectionMisses = new Map();
  for (const [id, v] of Object.entries(VOICES)) {
    if (v.kind !== 'drum') continue;
    let drawn;
    try {
      const { common, groups } = panelSpec(v);
      drawn = new Set([...common.rows, ...groups.flatMap((g) => g.rows || [])]
        .map((r) => r.path.replace(/^\$/, '')));
    } catch { continue; }
    for (const sec of DRUM_SECTIONS) {
      const obj = at(v, sec);
      if (!obj || typeof obj !== 'object') continue;
      for (const key of Object.keys(obj)) {
        const full = `${sec}.${key}`;
        // A nested SECTION is descended into on its own pass, not treated as a key of
        // its parent — `osc.fm` has a card of its own.
        if (DRUM_SECTIONS.includes(full) || drawn.has(full) || SECTION_HIDDEN_OK[full]) continue;
        if (!sectionMisses.has(full)) sectionMisses.set(full, []);
        sectionMisses.get(full).push(id);
      }
    }
  }
  if (sectionMisses.size) {
    for (const [full, ids] of sectionMisses) {
      failed++;
      console.log(`FAIL: ${ids.length} preset(s) store ${full} and no pot edits it`
        + ` — ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? `, +${ids.length - 3} more` : ''}`);
    }
  } else {
    console.log(`\nok: every key the ${VOICE_COUNT_DRUM} drum presets store on a section`
      + ' has a pot that edits it');
  }
}

// ...and the FORWARD direction for the one helper every section shares.
//
// `env()` shapes all five sources off the section object it is handed, so whatever it
// reads there is a control on all five cards at once — which is how HOLD came to exist on
// two of them and `sagAt` on none. Read out of the engine rather than listed here, so the
// day a sixth stage is added the cards are required to grow it.
{
  const body = read('src/engine/voices.js').split('const env = (param, t, level, sec = {}')[1];
  const envKeys = new Set();
  if (body) {
    for (const m of strip(body.slice(0, body.indexOf('\n    };')))
      .matchAll(/\bsec\.([A-Za-z_$][\w$]*)/g)) envKeys.add(m[1]);
  }
  const shaped = ['osc', 'osc2', 'noise', 'ring', 'metal'];
  const { common, groups } = panelSpec({ kind: 'drum' });
  const drawn = new Set([...common.rows, ...groups.flatMap((g) => g.rows || [])]
    .map((r) => r.path.replace(/^\$/, '')));
  const gaps = [];
  for (const sec of shaped) {
    for (const key of envKeys) if (!drawn.has(`${sec}.${key}`)) gaps.push(`${sec}.${key}`);
  }
  if (!envKeys.size) { failed++; console.log('FAIL: could not read the drum envelope helper'); }
  else if (gaps.length) {
    failed += gaps.length;
    for (const g of gaps) console.log(`FAIL: the drum envelope reads ${g} and no pot writes it`);
  } else {
    console.log(`ok: the drum envelope's ${envKeys.size} stages`
      + ` (${[...envKeys].sort().join(', ')}) each have a pot on all ${shaped.length} sections`);
  }
}

console.log(failed ? `\nPOT COVERAGE: ${failed} FAILED` : '\nPOT COVERAGE: PASSED');
process.exit(failed ? 1 : 0);
