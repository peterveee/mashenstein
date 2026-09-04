// The mixing desk's output file: what it is allowed to contain, and that the desk
// can write everything it can hold.
//
// The serialiser is the risk here, not the data. It emits `src/data/mix.js` as
// readable source rather than JSON, field by field — so a field nobody thought to
// emit is silently dropped on save. That is exactly how effect chains were lost:
// they could be built, they sounded right, and Save to game quietly wrote a file
// without them. This round-trips a mix that uses every corner.
import { writeFileSync, readFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MIX, LANE_DEFAULTS, laneSettings } from '../src/data/mix.js';
import {
  snapshotMix, freshImport, listHistory, readHistoryVersion, readSongStateDir,
} from '../tools/mixer.js';
// What actually writes a mix now: one song file at a time, its mix serialised by
// `bankSource`. `renderMixFile` wrote all thirty-four songs into src/data/mix.js and
// is gone with it — but the risk it carried is the same one, so the round-trip below
// is unchanged in intent: a field nobody thought to emit is silently dropped.
import { mixEntrySource, variantsSource, validateVariants } from '../tools/lib/mix-source.js';

// One song's mix, as the file would hold it. `renderMixFile` wrote all thirty-four
// into src/data/mix.js and is gone with it; the rules it carried moved here.
const renderMixFile = (mix) => {
  const body = Object.entries(mix)
    .map(([id, e]) => [id, mixEntrySource(e, '  ')])
    // A song carrying no decisions is left out entirely — that is what `null` means
    // coming back from the serialiser, and it is why an untouched song writes nothing.
    .filter(([, src]) => src)
    .map(([id, src]) => `  ${JSON.stringify(id)}: ${src},\n`)
    .join('');
  return `export const MIX = {\n${body}};\n`;
};
// What the DESK means by "this song has changed", which has to mean the same thing as
// "renderMixFile would write something different" — see the last section.
import { mixSignature } from '../tools/lib/mix-signature.js';
import { AUXES, AUX_DEFAULTS } from '../src/engine/mixer.js';
import { EFFECT_BY_ID, MAX_EFFECTS, DEFAULT_MASTER_CHAIN, visibleParams, paramRange } from '../src/engine/effects.js';
import { LANE_KEYS } from '../src/engine/lanes.js';
// The node-side registry, which is the one the desk saves against: a mix can be
// dialled in on an imported song, and an entry for it is not a broken mix file.
import { listTracks } from '../tools/lib/tracks.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---- what is on disk -------------------------------------------------------
const trackIds = new Set(listTracks().map((t) => t.id));
const laneKeys = new Set(LANE_KEYS);
const auxIds = new Set(AUXES.map((a) => a.id));

assert(Object.keys(MIX).every((id) => trackIds.has(id)),
  'every mix entry names a track that exists');

for (const [id, entry] of Object.entries(MIX)) {
  // A duplicated track is a lane key the engine's own list has never heard of — it is
  // minted by this entry's own `layers`, and it is only legal because of that. See
  // tests/layers.js for what makes one.
  const layerKeys = new Set((entry.layers || []).map((l) => l.key));
  // What it copies may be another layer — a duplicate of a duplicate, or of one of the
  // added tracks an imported song is made of — but it has to be a lane that already
  // EXISTS where it is declared: `deskBank` builds the list in order and drops a layer
  // standing on one it has not reached yet.
  const built = new Set(laneKeys);
  for (const l of entry.layers || []) {
    assert(built.has(l.from), `${id}: layer "${l.key}" copies a lane the song has by then`);
    assert(!laneKeys.has(l.key), `${id}: layer "${l.key}" does not shadow a lane of the song`);
    built.add(l.key);
  }
  for (const key of entry.off || []) {
    assert(laneKeys.has(key), `${id}: deleted track "${key}" is a real lane`);
  }
  for (const [key, lane] of Object.entries(entry.lanes || {})) {
    assert(laneKeys.has(key) || layerKeys.has(key),
      `${id}: lane "${key}" is a real lane, or a layer this entry declares`);
    const s = laneSettings(lane);
    assert(s.gain >= -60 && s.gain <= 6, `${id}.${key}: gain ${s.gain} is inside the fader's range`);
    assert(s.pan >= -1 && s.pan <= 1, `${id}.${key}: pan is inside -1..1`);
    for (const [aux, v] of Object.entries(lane.send || {})) {
      assert(auxIds.has(aux), `${id}.${key}: send "${aux}" is a real aux`);
      // The desk's send sliders share a +6 dB face, but reverb runs a 1.5× hotter
      // scale so its ceiling is gain 3.0, not 2.0 — see SEND_DB_MAX/sendGainMax in
      // tools/mixer-entry.js. The bound here is the same ceiling the knob can reach.
      const max = aux === 'reverb' ? 3 : 2;
      assert(v >= 0 && v <= max, `${id}.${key}: ${aux} send is inside 0..${max}`);
    }
    const chain = lane.effects || [];
    assert(chain.length <= MAX_EFFECTS, `${id}.${key}: at most ${MAX_EFFECTS} effects`);
    assert(chain.every((e) => EFFECT_BY_ID[e.id]),
      `${id}.${key}: every effect id is in the catalogue`);
  }
  for (const [aux, patch] of Object.entries(entry.fx || {})) {
    assert(auxIds.has(aux), `${id}: fx "${aux}" is a real aux`);
    assert((patch.effects || []).every((e) => EFFECT_BY_ID[e.id]),
      `${id}: ${aux} return effects are all in the catalogue`);
  }
}

// ---- every control the catalogue declares can be reached -------------------
//
// The desk hides some parameters depending on others: a synced delay shows a note
// division and hides its millisecond TIME, and the reverse. Those rules are keyed on
// the PARAMETER, not on whether the effect has the switch that drives it — and `sync`
// defaults to ON, so the first effect to carry a free `delayMs` without a tempo switch
// had its TIME row skipped in every state. The control existed, saved, loaded and
// rendered; it simply never drew. Nothing caught it because nothing tests the desk's
// parameter list against the catalogue's.
//
// This does, and it runs the desk's OWN rule rather than a copy of it — visibleParams
// is what buildDevices iterates. Every combination of the two tempo switches, and the
// invariant is that no effect can declare a parameter that no state of its own toggles
// will show.
for (const def of Object.values(EFFECT_BY_ID)) {
  // Only the switches the effect ACTUALLY HAS may vary — that is the whole bug. Setting
  // `sync` on an effect with no tempo switch describes a state the desk can never be in,
  // and a test that does it passes on a card the desk draws wrong.
  const states = ['sync', 'rateSync']
    .filter((s) => def.params.includes(s))
    .reduce((acc, s) => acc.flatMap((base) => [{ ...base, [s]: 0 }, { ...base, [s]: 1 }]), [{}]);
  const seen = new Set();
  for (const state of states) {
    for (const p of visibleParams(def, { ...def.defaults, ...state })) seen.add(p);
  }
  for (const p of def.params) {
    assert(seen.has(p), `${def.id}: "${p}" is drawn on the desk in at least one state`);
    assert(def.defaults[p] !== undefined || p.includes('.'),
      `${def.id}: "${p}" has a default, so a fresh insert opens at a known value`);
  }
}

// ---- one word for a left/right control -------------------------------------
//
// BALANCE. The KEYS behind them cannot be standardised — `pan` on the Advanced Delay
// and `dryPan`/`wetPan` on the Doubler are what saved mixes hold, and renaming them
// would read as a reset of every song carrying one — so the cards are where the one
// word has to hold. Read from the desk's source because PARAM_LABELS is browser code:
// importing tools/mixer-entry.js in Node runs a page.
//
// The failure this guards is silent and easy: paramLabel falls back to the KEY,
// uppercased, so a new effect declaring `pan` and no label draws a control reading PAN
// beside three that read BALANCE, and nothing but a screenshot would say so.
const deskSource = readFileSync(new URL('../tools/mixer-entry.js', import.meta.url), 'utf8');
// The label table and the rows that read it moved out of the entry with the rest of the
// control widgets — see tools/mixer-controls.js.
const controlsSource = readFileSync(new URL('../tools/mixer-controls.js', import.meta.url), 'utf8');
// The EQ surface and the effect-card builder moved out too — see tools/mixer-effect-cards.js.
const cardsSource = readFileSync(new URL('../tools/mixer-effect-cards.js', import.meta.url), 'utf8');
const effectSource = readFileSync(new URL('../src/engine/effects.js', import.meta.url), 'utf8');
const limiterSource = effectSource.slice(effectSource.indexOf('function makeLimiter('),
  effectSource.indexOf('const DOUBLER_MOD'));
assert(/node\.createMeter = \(\) => \{[\s\S]*?inputAnalysers[\s\S]*?outputAnalysers[\s\S]*?reductionAnalyser/.test(limiterSource),
  'L7 exposes stereo input/output peaks and its actual reduction control to a live card');
assert(/pname === 'threshold' \|\| pname === 'ceiling'[\s\S]*?l7sliderlevel/.test(cardsSource)
  && /function l7MeterPanel\(grid, linkFor\)[\s\S]*?textContent = 'ATTENUATION'[\s\S]*?data-l7-param="threshold"[\s\S]*?data-l7-param="ceiling"/.test(deskSource)
  && /if \(def\?\.id === 'l7'\)[\s\S]*?l7MeterPanel\(grid, \(\) => liveChain\(selectedLane\)\?\.\[i\]\)/.test(deskSource),
  'an open L7 card overlays mono input/output meters on full-width controls and shows attenuation without fast numbers');
assert(/function checkRow\(label, checked, onChange\)[\s\S]*?className = `fxswitch\$\{box\.checked \? ' on' : ''\}`[\s\S]*?box\.onchange[\s\S]*?sw\.classList\.toggle\('on', box\.checked\)/.test(controlsSource),
  'effect booleans use the synth-editor-style capsule while retaining a native checkbox');
assert(/toggle\.dataset\.l7Param = pname/.test(cardsSource)
  && /const autoRelease = grid\.querySelector\('\[data-l7-param="arc"\]'\);[\s\S]*?autoRelease\.before\(meter\)/.test(deskSource),
  'L7 places its Auto Release switch last, after the attenuation meter');
const labels = controlsSource.slice(controlsSource.indexOf('const PARAM_LABELS = {'));
const labelBlock = labels.slice(0, labels.indexOf('};'));
for (const def of Object.values(EFFECT_BY_ID)) {
  for (const p of def.params) {
    if (!/pan|balance/i.test(p)) continue;
    const label = new RegExp(`\\b${p}: '([^']*)'`).exec(labelBlock)?.[1];
    assert(label && label.includes('BALANCE') && !label.includes('PAN'),
      `${def.id}: "${p}" is labelled BALANCE on the card — got ${
        label ? `"${label}"` : 'no label at all, so it draws as its own key'}`);
  }
}

// New cards must be reachable from the picker as well as from the catalogue. Read
// the browser-side grouping source here because the picker is deliberately not a
// Node-importable module.
const groupBlock = deskSource.slice(deskSource.indexOf('const EFFECT_GROUP_ROWS = ['), deskSource.indexOf('function addEffect('));
for (const id of ['vowel', 'bell', 'chorus2', 'rhythmgate', 'flanger', 'ringmod', 'bitcrusher', 'tape', 'ambience', 'spring', 'noisegate']) {
  assert(groupBlock.includes(`'${id}'`), `${id}: appears in an effect-picker group`);
}
assert(/\['Tone & Filter',[\s\S]*'peq'[\s\S]*'bell'[\s\S]*'vowel'[\s\S]*'filter'[\s\S]*'autofilter'[\s\S]*'autowah'/.test(groupBlock),
  'tone-shaping effects are grouped under Tone & Filter');
assert(/\['Modulation & Rhythm',[\s\S]*'chorus2'[\s\S]*'flanger'[\s\S]*'phaser'[\s\S]*'rhythmgate'/.test(groupBlock),
  'cyclic and rhythmic effects are grouped under Modulation & Rhythm');
assert(/\['Character & Lo-Fi',[\s\S]*'distortion'[\s\S]*'tape'[\s\S]*'bitcrusher'[\s\S]*'ringmod'/.test(groupBlock),
  'colour and lo-fi effects are grouped under Character & Lo-Fi');
assert(JSON.stringify(EFFECT_BY_ID.bitcrusher.params) === JSON.stringify(['bits', 'downsample', 'wet'])
  && !('drive' in EFFECT_BY_ID.bitcrusher.defaults) && !('tone' in EFFECT_BY_ID.bitcrusher.defaults),
  'bit crusher exposes resolution, downsampling, and mix without drive or tone');
assert(/\['Space, Width & Pitch',[\s\S]*'reverb'[\s\S]*'ambience'[\s\S]*'spring'[\s\S]*'widener'[\s\S]*'shifter'[\s\S]*'pitch'/.test(groupBlock),
  'spatial, width, and pitch effects are grouped together');
// THE ROWS ARE THE LAYOUT. The picker draws two groups across, and which two share a row
// is a decision about where the eye goes next, not an accident of declaration order: what
// a sound is made of on the left of a row, what happens to it in space on the right.
// Tone & Filter with Delay & Echo, Modulation & Rhythm with Space, Width & Pitch,
// Dynamics with Character & Lo-Fi.
//
// Read as structure rather than as a pair of greedy regexes over the whole block — those
// matched a name in one row against a name three rows later and called it a pairing, so
// the arrangement could be reshuffled under them without a word.
{
  const rows = [...groupBlock.matchAll(/\n {2}\[\n((?: {4}\['[^']+',[^\n]*\n)+) {2}\],/g)]
    .map((row) => [...row[1].matchAll(/\['([^']+)',\s*\[/g)].map((g) => g[1]));
  const want = [
    ['Tone & Filter', 'Delay & Echo'],
    ['Modulation & Rhythm', 'Space, Width & Pitch'],
    ['Dynamics', 'Character & Lo-Fi'],
  ];
  assert(JSON.stringify(rows) === JSON.stringify(want),
    'the picker groups keep their two-column rows, in order — got '
    + JSON.stringify(rows));
}

// The shared editor needs a meaningful range for every new non-default control;
// otherwise its generic 0..1 fallback makes Hz, dB, and integer controls unusable.
for (const [id, checks] of Object.entries({
  chorus: { delayTime: [2, 20], feedback: [0, 0.6], spread: [0, 180] },
  vowel: { frequency: [0.05, 8], glide: [0, 1], articulation: [0, 1], excite: [0, 1],
    breath: [0, 1], reso: [0.3, 3], spread: [0, 1], body: [0, 1], air: [0, 1] },
  chorus2: { feedback: [0, 0.6], tone: [800, 20000] },
  bitcrusher: { bits: [1, 24], downsample: [1, 40] },
  // ATTACK and DECAY start at the millisecond floor `makeRhythmicGate` itself uses.
  rhythmgate: { gateLength: [0.01, 1], attack: [0.001, 0.25], decay: [0.001, 1] },
  flanger: { feedback: [0, 0.85], delayMs: [0.2, 10] },
  ringmod: { frequency: [0.1, 2000] },
  tape: { bias: [-1, 1], wow: [0, 1], flutter: [0, 1] },
  ambience: { space: [0, 1], damping: [0, 2] },
  spring: { tension: [0, 1], damping: [0, 1], drip: [0, 1] },
  autowah: { baseFrequency: [40, 2000], octaves: [0.5, 8],
    sensitivity: [-40, 0], Q: [0.2, 10] },
  compressor: { inputGain: [-24, 24], outputGain: [-24, 24] },
  noisegate: { threshold: [-80, 0], attack: [0.001, 0.5], release: [0.01, 2] },
  msComp: { pump: [0, 1] },
  // The Bell EQ's band is the Channel EQ's band: a cutoff over the audible span, not
  // the shared LFO `frequency` that stops at 20Hz, and the +/-18dB the five-band card's
  // gains have rather than the Gain card's +/-24.
  bell: { frequency: [20, 18000], gain: [-18, 18], q: [0.2, 10] },
})) {
  const def = EFFECT_BY_ID[id];
  for (const [name, [min, max]] of Object.entries(checks)) {
    const range = paramRange(name, def);
    assert(range.min === min && range.max === max,
      `${id}.${name}: editor range is ${range.min}..${range.max}`);
  }
}
// Every dynamics envelope time reaches the same millisecond floor the preset editor's
// envelope pots do — and steps in milliseconds, so 20ms and 25ms are two settings and
// not one. L7 is the single exception, and it is an exception because its own envelope
// clamps there: a pot must not offer travel the effect will ignore.
for (const [id, name, min, step] of [
  ['compressor', 'attack', 0.001, 0.001], ['compressor', 'release', 0.001, 0.001],
  ['msComp', 'mid.release', 0.001, 0.001],
  ['mbCompN', 'high.attack', 0.001, 0.001], ['rhythmgate', 'decay', 0.001, 0.001],
  ['l7', 'release', 0.01, 0.001],
]) {
  const range = paramRange(name, EFFECT_BY_ID[id]);
  assert(range.min === min && range.step === step && range.log === true,
    `${id}.${name}: ${range.min}s floor, ${range.step}s step, log taper`);
}

const vowelDefaults = EFFECT_BY_ID.vowel.defaults;
assert(vowelDefaults.wet >= 0.85 && vowelDefaults.reso >= 2 && vowelDefaults.glide <= 0.1
  && vowelDefaults.rateDivision <= 0.25 && vowelDefaults.spread > 0.8,
  'vowel defaults expose a pronounced, audible formant walk rather than only thickening');
// Three narrow bandpasses over silence is a reed, not a voice: the body return and the
// air tap are what stop the default sounding thin, so they must not default to nothing.
assert(vowelDefaults.body >= 0.35 && vowelDefaults.air > 0,
  'vowel defaults keep a voiced body and an open top rather than three isolated bands');
for (const label of ['DELAY', 'FEEDBACK', 'SPREAD', 'GATE LENGTH', 'BITS', 'BIAS', 'WAVEFORM',
  'WAVE SHAPE', 'ARTICULATION', 'EXCITE', 'BREATH', 'VOICE', 'VOWELS', 'RESO', 'BODY', 'AIR',
  'SPACE', 'DAMPING', 'MIX', 'FREQ']) {
  assert(Object.values(EFFECT_BY_ID).some((def) => Object.values(def.labels || {}).includes(label)),
    `catalogue has the local ${label} label`);
}

// The trims that stop the songs clipping. These are measured values (see the peak
// apportionment in the handoff notes); if they move, the render is expected to move
// with them — but they should never quietly vanish.
assert(MIX.shop?.lanes?.kick?.gain === -6 && MIX.shop?.lanes?.hats?.gain === -6,
  'shop keeps the kick and hats trim that takes it under full scale');
assert(MIX.finale?.lanes?.kick?.gain === -2, 'finale keeps its kick trim');

// ---- the serialiser --------------------------------------------------------
const sample = {
  plumber: {
    master: -1.5,
    limiter: true,
    voice: { bassType: 'sawtooth' },
    voiceParams: { bass: { attack: 0.02, release: 0.4 } },
    // Both ways of turning an effect off, on the one chain. `bypass` unwires the link
    // and `mute` turns it down, and only the second can differ between a level and its
    // cabinet screen — so only the second is ever the whole content of a cabinet mix,
    // and a serialiser that drops it silently puts the effect back in the level.
    masterEffects: [
      { id: 'compressor', params: { threshold: -12, ratio: 3 } },
      { id: 'phaser', mute: true, params: { frequency: 0.15, octaves: 4.4, wet: 0.6 } },
    ],
    fx: {
      delay: {
        division: 0.5, feedback: 0.4, tone: 3200, level: 0.8, pan: -0.3, mute: true,
        // The return EQ. It was absent from this fixture, which is exactly why the
        // serialiser could drop it for months without a test going red: the desk
        // applies it to the live aux and keeps it in localStorage, so it survived
        // everything except the Save it was meant to survive.
        eq: { low: -3, mid: 1.5, high: -6 },
        effects: [{ id: 'filter', params: { type: 'highpass', frequency: 800, Q: 1 } }],
      },
      reverb: {
        decay: 3.4, preDelay: 0.02, level: 1.2, pan: 0.2,
        // On a convolution reverb this IS the damping control — there is no other.
        eq: { high: -4 },
        effects: [{ id: 'chorus', bypass: true, params: { depth: 0.5 } }],
      },
    },
    lanes: {
      bass: {
        gain: -2.5, pan: 0.25, mute: true,
        noteFx: {
          strum: { enabled: true, direction: 'down', gapMs: 24 },
          arp: { enabled: true, direction: 'updown', rate: 0.5, octaves: 2,
            gate: 75, retrigger: 'bar', latch: false },
        },
        send: { delay: 0.5, reverb: 0.3 },
        eq: { low: 2, mid: -1.5, high: 3 },
        effects: [
          { id: 'peq', params: { f1: 90, g1: 3 } },
          { id: 'filter', bypass: true, params: { type: 'lowpass', frequency: 4200 } },
          { id: 'tremolo', mute: true, params: { frequency: 6, depth: 0.5 } },
          // Dotted parameter names, which the nested compressors use to address the
          // bands inside them. They are emitted as SOURCE, so an unquoted dot here is
          // a syntax error in the file the whole game reads — the one failure mode
          // that takes everything down rather than losing one setting.
          { id: 'mbCompN', params: { lowFrequency: 180, 'low.threshold': -26, 'high.knee': 8 } },
        ],
      },
      // Keep all six new ids in one saved channel fixture so the source serializer
      // proves their arbitrary parameter objects and bypass flags survive a reload.
      kick: {
        gain: 1,
        effects: [
          { id: 'chorus2', params: { rateSync: 0, frequency: 0.65, density: 0.75 } },
          { id: 'bitcrusher', params: { bits: 8, downsample: 4 } },
          { id: 'rhythmgate', bypass: true, params: { division: 0.5, attack: 0.003, decay: 0.035 } },
          { id: 'flanger', params: { rateSync: 1, rateDivision: 0.5, feedback: 0.45 } },
          { id: 'ringmod', params: { rateSync: 0, frequency: 30, waveform: 'triangle' } },
          { id: 'tape', params: { drive: 6, bias: 0.1, wow: 0.12, flutter: 0.05 } },
        ],
      },
      // Stereo width: a real strip parameter with no desk control, so the only way
      // it gets into a mix is by hand — and the serialiser used to erase it on the
      // next Save. 0 is mono, and mono is a decision, so it has to survive a round
      // trip like any other number.
      hats: { width: 0 },
      snare: { width: 1.6 },
    },
  },
};

const dir = mkdtempSync(join(tmpdir(), 'mash-mix-'));
const path = join(dir, 'mix.js');
writeFileSync(path, renderMixFile(sample));
const { MIX: readBack } = await import(path);
const wrote = readBack.plumber;
const sent = sample.plumber;

assert(wrote.master === sent.master && wrote.limiter === sent.limiter,
  'round-trip: master trim and limiter survive');
assert(JSON.stringify(wrote.voice) === JSON.stringify(sent.voice),
  'round-trip: voice overrides survive');
assert(JSON.stringify(wrote.voiceParams) === JSON.stringify(sent.voiceParams),
  'round-trip: song-owned voice parameters survive');
assert(JSON.stringify(wrote.masterEffects) === JSON.stringify(sent.masterEffects),
  'round-trip: the master effect chain survives');
assert(wrote.masterEffects?.[1]?.mute === true,
  'round-trip: an effect MUTED on the master bus comes back muted, not back on');
assert(wrote.lanes.bass.effects.some((e) => e.id === 'tremolo' && e.mute === true),
  'round-trip: an effect muted on a channel comes back muted');
assert(JSON.stringify(wrote.lanes.bass.effects) === JSON.stringify(sent.lanes.bass.effects),
  'round-trip: a channel effect chain survives, bypass flags and string params included');
assert(JSON.stringify(wrote.lanes.bass.noteFx) === JSON.stringify(sent.lanes.bass.noteFx),
  'round-trip: track strum and arpeggiator settings survive');
assert(JSON.stringify(wrote.lanes.kick.effects) === JSON.stringify(sent.lanes.kick.effects),
  'round-trip: all six new effect ids and their custom params survive');
assert(JSON.stringify(wrote.lanes.bass.eq) === JSON.stringify(sent.lanes.bass.eq)
  && JSON.stringify(wrote.lanes.bass.send) === JSON.stringify(sent.lanes.bass.send)
  && wrote.lanes.bass.pan === sent.lanes.bass.pan && wrote.lanes.bass.mute === true,
  'round-trip: a channel keeps its gain, pan, mute, sends and EQ');
assert(wrote.lanes.hats.width === 0 && wrote.lanes.snare.width === 1.6,
  'round-trip: a lane keeps its stereo width, mono included');
assert(!('width' in (wrote.lanes.kick || {})),
  'round-trip: a lane at the default width says nothing about it');
for (const aux of ['delay', 'reverb']) {
  const a = wrote.fx[aux], b = sent.fx[aux];
  assert(Object.entries(b).every(([k, v]) => (k === 'effects'
    ? JSON.stringify(a[k]) === JSON.stringify(v.map((e) => (e.params && !Object.keys(e.params).length
      ? { id: e.id, ...(e.bypass ? { bypass: true } : {}) } : e)))
    // `eq` is an object, and comparing it by identity is how it slipped through: a
    // dropped key and a value that never arrives both read as "not ===", so the
    // assertion could only ever have passed by the fixture not carrying one.
    : (v && typeof v === 'object' ? JSON.stringify(a[k]) === JSON.stringify(v) : a[k] === v))),
    `round-trip: the ${aux} send keeps every setting, its return chain included`);
}

// A mix with nothing in it should write nothing, not an entry full of defaults.
const { MIX: empty } = await (async () => {
  const p = join(dir, 'empty.js');
  writeFileSync(p, renderMixFile({ plumber: { master: 0, limiter: false, lanes: { bass: {} } } }));
  return import(p);
})();
assert(Object.keys(empty).length === 0,
  'a track with no decisions in it is left out of the file entirely');

// The master opens with an EMPTY chain. Adding an effect and taking it off again
// leaves that empty list sitting in the draft, and writing it out would give every
// song in the game a masterEffects line for a chain nobody has anything on.
const { MIX: seeded } = await (async () => {
  const p = join(dir, 'seeded.js');
  writeFileSync(p, renderMixFile({ plumber: { masterEffects: DEFAULT_MASTER_CHAIN() } }));
  return import(p);
})();
assert(DEFAULT_MASTER_CHAIN().length === 0,
  'the master bus starts with no plugins on it at all');
assert(Object.keys(seeded).length === 0,
  'the master chain the desk seeds is a starting point, not a decision, and is not written out');

const { MIX: touched } = await (async () => {
  const p = join(dir, 'touched.js');
  const on = [{ id: 'compressor', params: { threshold: -12, ratio: 2 } }];
  writeFileSync(p, renderMixFile({ plumber: { masterEffects: on } }));
  return import(p);
})();
assert(touched.plumber?.masterEffects?.length === 1 && !touched.plumber.masterEffects[0].bypass,
  'putting a compressor on the master bus is a decision, and is written out');

// ---- defaults --------------------------------------------------------------
// Both sends shut. A lane used to default to the echo if it was a melodic one, which
// is how a channel could echo with nothing in its entry accounting for it; each
// song's echo is per-channel data now.
assert(LANE_DEFAULTS.send.delay === 0 && LANE_DEFAULTS.send.reverb === 0,
  'a lane defaults to no send at all — echo is something a mix asks for');

// The bug that hid every one of those sends the first time they were written: the
// serialiser treated `delay: 1` as the default and dropped it, so the value the
// engine used never reached the file.
const { MIX: unity } = await (async () => {
  const p = join(dir, 'unity.js');
  writeFileSync(p, renderMixFile({ plumber: { lanes: { lead: { send: { delay: 1 } } } } }));
  return import(p);
})();
assert(unity.plumber?.lanes?.lead?.send?.delay === 1,
  'round-trip: a send at 1 is written out, not mistaken for a default');
assert(Object.keys(AUX_DEFAULTS).every((id) => auxIds.has(id))
  && AUXES.every((a) => AUX_DEFAULTS[a.id]),
  'every aux has defaults and every set of defaults has an aux');

// `mergeMix` used to fold one song's edits into a file holding all thirty-four, and
// its tests lived here. Both are gone: a save writes one song's own file now, so
// there is nothing to merge and no way for one song's save to touch another's.

// ---- the version that was overwritten ---------------------------------------
// Saving is not committing, and between two saves nothing held the version being
// replaced: undo lives in the desk, and git only has what Peter has committed.
const histDir = join(dir, 'history');
const histFile = join(dir, 'tosnapshot.js');
writeFileSync(histFile, renderMixFile({ plumber: { master: -3.3 } }));
const snapName = snapshotMix('plumber', histDir, histFile);
assert(/^mix-\d{4}-\d{2}-\d{2}T\d{6}-plumber\.js$/.test(snapName || ''),
  'snapshot: named for the song that was saved and stamped to the second');
const { MIX: snapped } = await import(join(histDir, snapName));
assert(snapped.plumber.master === -3.3,
  'snapshot: it is the file itself, so it loads as a module and reads back as a mix');
// A byte copy, not a re-render: what comes back must be what was there, character
// for character, or "restore" is a re-serialisation of a guess.
assert(readFileSync(join(histDir, snapName), 'utf8') === readFileSync(histFile, 'utf8'),
  'snapshot: byte-identical to the file it replaced');
assert(snapshotMix('plumber', histDir, join(dir, 'not-a-file.js')) === null,
  'snapshot: a first save with no file yet has nothing to lose, and says so');

// Current snapshots carry both halves of one song in one data-only module. The desk
// must not load the balance and leave today's added lanes or painted notes behind.
const songSnap = 'song-2026-07-29T120000-plumber.js';
writeFileSync(join(histDir, songSnap),
  'export const mix = { master: -5, layers: [{ key: "bass2", from: "bass" }] };\n'
  + 'export const arrangement = { order: [2, 1] };\n');
const historicalSong = await readHistoryVersion(songSnap, histDir);
assert(historicalSong.mix.plumber.master === -5
  && historicalSong.arrangements.plumber.order.join(',') === '2,1',
  'history: a per-song snapshot restores its mix and arrangement together');
const listedSong = listHistory(histDir).find((s) => s.file === songSnap);
assert(listedSong?.track === 'plumber',
  'history: current per-song snapshots are listed for their own song');

// The aggregate compatibility modules import songs/index.js, whose dependencies stay
// cached even when only the aggregate URL is cache-busted. Read authoritative song
// files directly, and prove a second read sees a rewrite made between them.
const stateDir = join(dir, 'song-state');
mkdirSync(stateDir, { recursive: true });
const stateFile = join(stateDir, 'plumber.js');
writeFileSync(stateFile,
  'export const mix = { master: -1 };\nexport const arrangement = { order: [0] };\n');
const state1 = await readSongStateDir(stateDir, 'mix');
writeFileSync(stateFile,
  'export const mix = { master: -7 };\nexport const arrangement = { order: [2] };\n');
const state2 = await readSongStateDir(stateDir, 'mix');
const stateArr = await readSongStateDir(stateDir, 'arrangement');
assert(state1.plumber.master === -1 && state2.plumber.master === -7,
  'saved-state readback comes from the rewritten song file, not a cached index');
assert(stateArr.plumber.order[0] === 2,
  'saved-state readback does the same for arrangements');

// ---- the desk's "changed" and the file's "different", held to each other -----
//
// The desk decides whether Save is even offered by reducing draft and file to what
// mix.js can hold and comparing those — `mixSignature`. That reduction used to be a
// hand-written list of fields inside the desk, sitting beside this serialiser's own
// hand-written list of fields, and the two drifted apart: the sends were missing from
// the desk's list entirely, and a channel's effect chain was missing whenever the
// channel was otherwise at unity. The consequence was silent and one-directional — a
// reverb decay or a chorus on an untouched lane left Save reading "Saved — matches the
// file" with the button disabled, so the change stayed in one browser's localStorage,
// the game never heard it, and the day that draft went away, so did the mix.
//
// Nothing red would have caught that, because each half was self-consistent. This is
// the assertion that binds them: for every kind of decision a mix can carry, the desk
// must call it a change EXACTLY when saving would write a different file. Both
// directions matter — miss one and work is lost, invent one and the desk cries wolf.
const sig = (e) => JSON.stringify(mixSignature(e));
const rendered = (e) => renderMixFile({ plumber: e });
const clone = (o) => JSON.parse(JSON.stringify(o));

const varyBase = {
  master: -1.5,
  fx: { delay: { level: 0.8 }, reverb: { decay: 3.4, effects: [{ id: 'chorus' }] } },
  lanes: {
    bass: { gain: -2.5, send: { delay: 0.5 }, effects: [{ id: 'peq', params: { f1: 90, g1: 3 } }] },
    // At unity and untouched: the channel a chorus could be added to without the desk
    // noticing, because the old check called a lane with nothing but a chain "bare".
    kick: {},
  },
};

// Each of these changes what the game plays, so each has to reach the file — and the
// desk has to know it would.
const CHANGES = [
  ['a fader', (m) => { m.lanes.bass.gain = -3; }],
  ['a pan', (m) => { m.lanes.bass.pan = 0.4; }],
  ['a mute', (m) => { m.lanes.bass.mute = true; }],
  ['a stereo width', (m) => { m.lanes.bass.width = 0; }],
  ['a delay send', (m) => { m.lanes.bass.send.delay = 1.2; }],
  ['a reverb send', (m) => { m.lanes.bass.send.reverb = 0.4; }],
  ['a channel EQ band', (m) => { m.lanes.bass.eq = { high: 4 }; }],
  ['an effect added to a channel at unity', (m) => { m.lanes.kick.effects = [{ id: 'chorus' }]; }],
  ['an effect added to a channel that already has one', (m) => { m.lanes.bass.effects.push({ id: 'chorus' }); }],
  ['an effect taken off a channel', (m) => { m.lanes.bass.effects = []; }],
  ['an effect parameter', (m) => { m.lanes.bass.effects[0].params.g1 = 5; }],
  ['an effect bypassed', (m) => { m.lanes.bass.effects[0].bypass = true; }],
  // The one that changes nothing on any fader, so nothing else in the desk notices it.
  // A signature blind to this leaves Save disabled over the entire content of some
  // songs' cabinet mixes — see chainSig.
  ['an effect muted', (m) => { m.lanes.bass.effects[0].mute = true; }],
  ['a channel added to the mix', (m) => { m.lanes.hats = { gain: -1 }; }],
  ['the master trim', (m) => { m.master = -2; }],
  ['the master pan', (m) => { m.masterPan = 0.3; }],
  ['the limiter', (m) => { m.limiter = true; }],
  ['a compressor put on the master bus', (m) => {
    m.masterEffects = [{ id: 'compressor', params: { threshold: -12, ratio: 2 } }];
  }],
  ['that master compressor bypassed', (m) => {
    m.masterEffects = [{ id: 'compressor', bypass: true, params: { threshold: -12, ratio: 2 } }];
  }],
  ['that master compressor muted instead', (m) => {
    m.masterEffects = [{ id: 'compressor', mute: true, params: { threshold: -12, ratio: 2 } }];
  }],
  ['a duplicated track', (m) => { m.layers = [{ key: 'bass2', from: 'bass' }]; }],
  ['an independent percussion sound', (m) => {
    m.layers = [{ key: 'tom2', from: 'tom', independent: true, label: 'Cowbell' }];
  }],
  ['a deleted track', (m) => { m.off = ['hats']; }],
  ['a renamed track', (m) => { m.labels = { bass: 'Sub Bass' }; }],
  ['a voice override', (m) => { m.voice = { bassVoice: 'roundMono' }; }],
  ['the delay time', (m) => { m.fx.delay.division = 0.5; }],
  ['the delay feedback', (m) => { m.fx.delay.feedback = 0.6; }],
  ['the delay damping', (m) => { m.fx.delay.tone = 1200; }],
  ['a return level', (m) => { m.fx.delay.level = 0.5; }],
  ['a return pan', (m) => { m.fx.reverb.pan = -0.4; }],
  ['a return muted', (m) => { m.fx.reverb.mute = true; }],
  ['a return EQ band', (m) => { m.fx.reverb.eq = { high: 6 }; }],
  ['the reverb decay', (m) => { m.fx.reverb.decay = 5; }],
  ['the reverb pre-delay', (m) => { m.fx.reverb.preDelay = 0.05; }],
  ['an effect added to a return', (m) => { m.fx.delay.effects = [{ id: 'filter' }]; }],
  ['an effect taken off a return', (m) => { m.fx.reverb.effects = []; }],
];

// And each of these changes nothing the file can hold, so the desk must stay quiet.
// Every one of them is something the desk does on its own: `editFx` writes a whole set
// of defaults the first time you touch a send, the master arrives with an empty chain
// on it, and a send dragged to zero is a send that is not there.
const NON_CHANGES = [
  ['a send touched and put back to its defaults', (m) => { m.fx.reverb = { ...AUX_DEFAULTS.reverb, decay: 3.4, effects: m.fx.reverb.effects }; }],
  ['the other send written out at its defaults', (m) => { m.fx.delay = { ...AUX_DEFAULTS.delay, level: 0.8 }; }],
  ['a send at an explicit zero', (m) => { m.lanes.kick.send = { delay: 0, reverb: 0 }; }],
  ['a channel at its defaults', (m) => { m.lanes.snare = { gain: 0, pan: 0, mute: false }; }],
  ['an empty effect chain', (m) => { m.lanes.kick.effects = []; }],
  ['the master chain the desk seeds', (m) => { m.masterEffects = DEFAULT_MASTER_CHAIN(); }],
  ['a fourth decimal place', (m) => { m.lanes.bass.gain = -2.5001; }],
  ['an empty voice map', (m) => { m.voice = {}; }],
  ['an empty layer list', (m) => { m.layers = []; }],
  ['an empty track-label map', (m) => { m.labels = {}; }],
];

const renamedTrack = clone(varyBase);
renamedTrack.labels = { bass: 'Sub Bass' };
assert(rendered(renamedTrack).includes('labels: {"bass":"Sub Bass"}')
  && sig(renamedTrack) !== sig(varyBase),
  'a track name is written into song mix source and makes the desk dirty');

for (const [what, change] of [...CHANGES, ...NON_CHANGES]) {
  const v = clone(varyBase);
  change(v);
  const wouldWrite = rendered(v) !== rendered(varyBase);
  const deskSees = sig(v) !== sig(varyBase);
  // One way round, deliberately. The desk must NEVER say "saved, matches the file"
  // when the file would change — that is how work goes missing. The reverse, a dot
  // that lights for something the file will not hold, costs one needless save and
  // Peter would rather have it than the alternative. So: writes implies seen.
  assert(!wouldWrite || deskSees, `the desk sees ${what} exactly when the file would: `
    + `${wouldWrite ? 'writes' : 'writes nothing'}, desk ${deskSees ? 'says changed' : 'says unchanged'}`);
}

// The same agreement on the songs that actually exist: saving one must leave the desk
// reading "Saved — matches the file" rather than dirty against what it just wrote.
const savedAll = await (async () => {
  const p = join(dir, 'whole-mix.js');
  writeFileSync(p, renderMixFile(MIX));
  return (await import(p)).MIX;
})();
for (const [id, entry] of Object.entries(MIX)) {
  assert(sig(savedAll[id]) === sig(entry), `${id}: a save leaves the desk clean, not dirty against itself`);
}
assert(Object.keys(savedAll).length === Object.keys(MIX).length,
  'every song that has a mix still has one after a save');

// ---- reading a file this process has just rewritten --------------------------
//
// Save merges the song being written into the file AS IT STANDS and rewrites the lot,
// so the read behind that merge decides what happens to the other thirty-three songs.
// Node caches an ES module by its full URL, which is why the readers bust the cache
// with a counter in the query — and why there must be exactly ONE counter.
//
// There were two, `historySeq` and `importSeq`, both from zero, both used on mix.js.
// When one reached a number the other had already used, `import()` returned that
// earlier parse: the file as it had been minutes or hours before. Save then merged
// into it, so saving one song put every other song back to an older version of itself
// — silently, in the file the game reads, and in the desk's own idea of what is on
// disk, which is what Revert reverts to. `shop` lost its voices, its delay EQ and its
// distortion that way, to saves of `title` and `megamix`.
//
// The mechanism, first: a read after a write must see the write.
const seq = join(dir, 'seq.js');
const other = join(dir, 'seq-other.js');
writeFileSync(other, 'export const MIX = {};\n');
const reads = [];
for (let i = 1; i <= 4; i++) {
  writeFileSync(seq, `export const MIX = { v: ${i} };\n`);
  reads.push((await freshImport(seq)).MIX.v);
  await freshImport(other);      // another reader, between, as voiceRefs sat between saves
}
assert(JSON.stringify(reads) === '[1,2,3,4]',
  'a file re-read after being rewritten comes back as it is now, not as node cached it');

// And the shape of it, because the mechanism above cannot see a second counter added
// somewhere else in the file. Every cache-busted import goes through `freshImport`, so
// there is exactly one `?v=` in the source that builds one.
const mixerSrc = readFileSync(new URL('../tools/mixer.js', import.meta.url), 'utf8');
assert((mixerSrc.match(/\?v=\$\{/g) || []).length === 1,
  'tools/mixer.js busts the module cache in exactly one place — new readers use freshImport');

// ---- a cabinet treatment, round-tripped ------------------------------------------
//
// The same thesis as the mix above, aimed at the other serialiser. `variantsSource`
// emits a treatment field by field, so a field nobody thought to emit is dropped on
// save — silently, and only noticed in the game, a screen away from the desk that
// wrote it. `startBar` was exactly that: the "Comes in on" control filled the draft,
// passed validation, and then never reached the file.
//
// Key order is not the claim here, so both sides are compared through a stable sort.
const stable = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(stable).join(',')}]`
    : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`);

const cabinet = {
  select: [
    {
      when: 'always',
      // A way in that is not where the loop is: bars 3 and 4 are heard once, on arrival.
      loop: { startBar: 3, fromBar: 5, toBar: 8 },
      treatment: [{ id: 'filter', params: { type: 'highpass', frequency: 520, Q: 0.9 } }],
      gap: 0.15,
      patch: {
        master: -2.5,
        // The master chain RE-TUNED rather than added to: both sides carry the phaser
        // and only its numbers differ, which is a ramp rather than a re-wire. The
        // treatment above is the other answer — an effect the level does not have at
        // all. See cabDiff in tools/mixer-entry.js, and rampMix in src/engine/audio.js.
        // …and the phaser the LEVEL carries is muted, so the same chain is heard on
        // one screen and not the other. `mute` is the field that makes this a mix
        // difference rather than a graph edit; without it the only way to keep an
        // effect off the level was to leave it out of the level's chain entirely and
        // pay for a second leg of the whole master path.
        masterEffects: [{ id: 'phaser', params: { frequency: 0.154, octaves: 4.4, wet: 0.5 } }],
        fx: { reverb: { level: 1.4 } },
        lanes: { lead: { mute: true }, bass: { gain: -3, send: { reverb: 0.32 } } },
      },
      exit: { quantize: 'beat', crossfadeBars: 0, loopRelease: 'atTransition', treatBars: 1.5 },
    },
  ],
};
const cabErrs = validateVariants(cabinet);
assert(!cabErrs.length, `the treatment under test is one the desk would accept${cabErrs.length ? `: ${cabErrs.join('; ')}` : ''}`);

const varPath = join(dir, 'variants.js');
writeFileSync(varPath, `export const variants = ${variantsSource(cabinet, '')};\n`);
const varBack = (await freshImport(varPath)).variants;
assert(stable(varBack) === stable(cabinet),
  'a cabinet treatment survives being written and read back, every field of it');
assert(varBack?.select?.[0]?.loop?.startBar === 3,
  'the bar a cabinet screen comes in on reaches the file');
assert(varBack?.select?.[0]?.patch?.masterEffects?.[0]?.params?.wet === 0.5,
  'a master chain re-tuned for the cabinet screen reaches the file');
assert(varBack?.select?.[0]?.patch?.masterEffects?.[0]?.mute === undefined,
  'the cabinet screen UNMUTES what the level mutes — an absent flag, not a false one');

// A way in with no loop under it is a treatment that starts late and then plays the
// whole form — `loop` carrying nothing but `startBar`. It has to survive as that, and
// not as a pair of undefined bars.
const startOnly = { select: [{ when: 'always', loop: { startBar: 5 }, patch: { master: -1 } }] };
const startPath = join(dir, 'variants-start.js');
writeFileSync(startPath, `export const variants = ${variantsSource(startOnly, '')};\n`);
const startBack = (await freshImport(startPath)).variants;
assert(stable(startBack) === stable(startOnly),
  'a treatment that names a way in and no loop round-trips as exactly that');

// ---- what the stage's realtime pre-warm can actually build --------------------
//
// run.js calls Audio.prepareRealtimeVoices() behind the shutter so a POOLED Tone voice
// builds its graph there instead of at its first note, inside the scheduler's lookahead.
// That only helps the lanes it covers, and it covers exactly the pooled families:
// VoiceRack.prepareRealtimeVoice early-outs on drums, TNGR-2, MRDR-3, KNDO-5 and WNDR-9,
// which build per note or are native Web Audio and have no pool to fill.
//
// So the number worth pinning is which of rhythm — the heaviest mix in the game, and the
// one that crackles on a phone — the warm-up reaches. If a re-voicing moves a lane onto a
// per-note family, the pre-warm silently stops covering it and the hole comes back at the
// handover bar line; this says so.
{
  const { mix: rhythmMix } = await import('../src/data/songs/rhythm.js');
  const { VOICES } = await import('../src/data/voices.js');
  const { synthFamily, KNDO5, WNDR9 } = await import('../src/engine/voices.js');
  // The engine's early-out list, restated: prepareRealtimeVoice is a method on a rack
  // that needs a live AudioContext, so the predicate is mirrored rather than called.
  const pooled = (id) => {
    const v = VOICES[id];
    if (!v || v.kind === 'drum' || v.synth === 'TNGR-2' || v.synth === 'MRDR-3') return false;
    return synthFamily(v.synth) !== KNDO5 && synthFamily(v.synth) !== WNDR9;
  };
  const lanes = Object.entries(rhythmMix.voice || {});
  const warm = lanes.filter(([, id]) => pooled(id));
  assert(warm.length >= 8,
    `rhythm's pre-warm covers ${warm.length} of its ${lanes.length} voiced lanes`);
  assert(new Set(warm.map(([, id]) => id)).size >= 6,
    'and at least six distinct pooled presets, so the walk is building pools not one pool');
  // The excluded families are excluded for a reason, and naming them here is what makes
  // a future "why is lead7 still late" answerable: TNGR-2's cost is its wavetables (see
  // warmTngr2Families) and MRDR-3/KNDO-5/WNDR-9 build per note by design.
  assert(!pooled('tngrBlueCathedral') && !pooled('bestPwmStrings') && !pooled('toneSquare')
    && !pooled('kickMegamix'),
    'TNGR-2, MRDR-3, KNDO-5 and the drums are not pre-warmed here — they have no pool');
}

console.log(failed ? '\nMIX: FAILED' : '\nMIX: PASSED');
process.exit(failed ? 1 : 0);
