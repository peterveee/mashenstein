// MAKE A BANGER — what can be asked for, and the one function that reads an answer.
//
// The dialog, the server and the generator all go through `normaliseBangerOptions`, so
// there is one set of rules for what a banger request is. A STYLE pre-sets the toggles:
// whatever the request leaves out is the style's default, which is how choosing a style
// in the dialog moves every switch under More Options to where that style wants it.
//
// Browser-safe: no `node:*` imports.
import { styleFor, BANGER_STYLES } from './styles/index.js';
import { ARP_FIGURES, BASS_FIGURES } from './theory.js';

export const BANGER_MOODS = Object.freeze([
  { id: 'anthemic', label: 'Anthemic', title: 'Big minor-key festival chords, bright hook — the ABSOLUTE ZERO sound' },
  { id: 'uplifting', label: 'Uplifting', title: 'A lifting four-chord walk, leaning major' },
  { id: 'euphoric', label: 'Euphoric', title: 'The royal-road climb, bright and wide' },
  { id: 'moody', label: 'Moody', title: 'Minor sevenths, darker voices, no exciter' },
  { id: 'dark', label: 'Dark', title: 'Minor with a phrygian flat-two cadence' },
  { id: 'heroic', label: 'Heroic', title: 'The film-score victory lift, bVI–bVII–I — brass up front' },
  { id: 'nostalgic', label: 'Nostalgic', title: 'City-pop royal road in sevenths and ninths — electric piano and warm strings' },
  { id: 'funky', label: 'Funky', title: 'A dorian two-chord vamp in ninths — slap bass and clav' },
  { id: 'gothic', label: 'Gothic', title: 'A descending minor walk to the big V — church organ, choir and tolling bells' },
]);
/**
 * The modes a banger can be in (tools/lib/banger/analyse.js MODE_INFO). Each is major or
 * minor with one note changed, and that note is the flavour.
 */
export const BANGER_MODES = Object.freeze([
  { id: 'keep', label: 'Keep', title: 'The key the riff is in' },
  { id: 'major', label: 'Major', title: 'Bright and plain' },
  { id: 'minor', label: 'Minor', title: 'Dark and plain — with the big major V borrowed for the turnarounds' },
  { id: 'dorian', label: 'Dorian', title: 'Minor with a raised 6th: a bright, groovy minor (house, uplifting minor)' },
  { id: 'phrygian', label: 'Phrygian', title: 'Minor with a flat 2nd: dark and menacing (dark techno, hardstyle)' },
  { id: 'harmonic', label: 'Harmonic Minor', title: 'Minor with a raised 7th: dramatic, a big V chord (trance, eurodance)' },
  { id: 'mixolydian', label: 'Mixolydian', title: 'Major with a flat 7th: rocky and open (festival anthems)' },
  { id: 'lydian', label: 'Lydian', title: 'Major with a raised 4th: dreamy and floating (cinematic, future bass)' },
]);
/**
 * Which modes suit each mood, and which fight it — the dialog marks them in the Mode list
 * and Surprise Me only rolls a mode that suits. Guidance, never a rule: any mode can be
 * picked with any mood.
 */
export const MOOD_MODES = Object.freeze({
  anthemic: { suits: ['minor', 'harmonic', 'mixolydian'], fights: ['lydian'] },
  uplifting: { suits: ['major', 'dorian', 'mixolydian'], fights: ['phrygian'] },
  euphoric: { suits: ['lydian', 'major'], fights: ['phrygian', 'harmonic'] },
  moody: { suits: ['dorian', 'minor'], fights: ['lydian'] },
  dark: { suits: ['phrygian', 'harmonic', 'minor'], fights: ['major', 'lydian'] },
  heroic: { suits: ['mixolydian', 'major', 'harmonic'], fights: ['phrygian'] },
  nostalgic: { suits: ['major', 'dorian', 'lydian'], fights: ['phrygian', 'harmonic'] },
  funky: { suits: ['dorian', 'mixolydian', 'minor'], fights: ['phrygian', 'harmonic'] },
  gothic: { suits: ['harmonic', 'minor', 'phrygian'], fights: ['major', 'lydian', 'mixolydian'] },
});

/**
 * The bass each mood suggests — what choosing the mood moves the Bass switch to, unless the
 * mood is the style's own (that keeps the style's bass) or the style's bass is its signature.
 */
export const MOOD_BASS = Object.freeze({
  funky: 'funk', heroic: 'gallop', gothic: 'pedal', nostalgic: 'walking', dark: 'reese', moody: 'arpeggiated',
});
/** The bass a request should start from for `mood` in `style`. */
export function moodBass(style, mood) {
  const own = styleDefaults(style).parts.bass;
  if (style?.bassFixed || mood === styleDefaults(style).mood) return own;
  return MOOD_BASS[mood] || own;
}

/**
 * Home notes, only ever READ: a banger made while the dialog offered Home (2 Oct) keeps
 * the home it was made in when a take is re-made. Nothing offers it now — a banger stays on
 * its riff's home, and the desk's Transpose moves a finished one.
 */
const HOMES_READ = Object.freeze([
  { id: 'keep', label: 'Keep' },
  ...['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((n) => ({ id: n, label: n.replace('#', '♯') })),
]);
/** What a mode may do to the riff's own notes. */
export const BANGER_RIFF_NOTES = Object.freeze([
  { id: 'keep', label: 'Keep As Written', title: 'Your notes never move: the mode is in the chords, which borrow your riff\'s own wherever it plays the note the mode changes' },
  { id: 'fit', label: 'Fit to the Mode', title: 'Your notes move into the mode, so the riff itself takes on its colour' },
]);
/** Riff Notes values only ever READ: `relative` is the old Key switch's Major / Minor. */
const RIFF_NOTES_READ = ['keep', 'fit', 'relative'];
/** The old Key switch (Keep / Major / Minor — the relative key), still read from bangers made with it. */
export const BANGER_KEYS = Object.freeze(BANGER_MODES.slice(0, 3));
export const BANGER_VARIATIONS = Object.freeze([
  { id: 'faithful', label: 'Faithful', title: 'Your notes as written: only the setting changes — octaves, instruments, harmony, half speed' },
  { id: 'some', label: 'Some', title: 'Also sequences the riff up the scale and turns the phrase ends round' },
  { id: 'wild', label: 'Wild', title: 'Also develops fragments, shifts the rhythm, leaps at the peak and adds a counter-line' },
]);
/** Length presets, in bars. Medium is ABSOLUTE ZERO's shape; Short is a stage. */
export const BANGER_LENGTHS = Object.freeze([
  { id: 'short', label: 'Short', bars: 48 },
  { id: 'medium', label: 'Medium', bars: 64 },
  { id: 'long', label: 'Long', bars: 112 },
  { id: 'custom', label: 'Custom', bars: null },
]);
export const BANGER_TEMPOS = Object.freeze([
  { id: 'style', label: 'Style' },
  { id: 'source', label: 'Source' },
  { id: 'custom', label: 'Custom' },
]);
export const BANGER_LIMITS = Object.freeze({
  minBars: 24, maxBars: 256, barStep: 4, minBpm: 60, maxBpm: 200, maxRiffBars: 8,
});

/**
 * Every switch under More Options, grouped as the dialog shows them. `type` is
 * `toggle` or `select`; a select lists its choices. The dialog is built from this
 * list, so a new option is one entry here plus whatever the generator does with it.
 */
export const BANGER_GROUPS = Object.freeze([
  { id: 'form', label: 'Form', fields: [
    { key: 'script', label: 'Style\'s Own Form',
      title: 'The style\'s own arrangement, bar by bar, in place of the switches below (Kraftwerk: 128 bars, a part joining or leaving on each eight-bar block). Styles without one ignore it' },
    { key: 'intro', label: 'Intro', title: 'Open on the riff as written' },
    { key: 'layers', label: 'Build in Layers', type: 'select',
      title: 'The intro brings the parts in one at a time — drums, bass, chords, the hook last — and the outro takes them away again: on a Long song only (more than 64 bars), or always',
      options: [['off', 'Off'], ['long', 'Long Songs'], ['always', 'Always']] },
    { key: 'grooveIntro', label: 'Drums & Bass Intro', title: 'The intro is the beat and the bass alone, then everything comes in at once (Build in Layers wins where it applies)' },
    { key: 'build', label: 'Build', title: 'A snare-roll build before each drop' },
    { key: 'breakdown', label: 'Breakdown', title: 'The riff at half speed over a pedal, between the drops' },
    { key: 'secondDrop', label: 'Second Drop', title: 'Come back for another drop after the breakdown' },
    { key: 'doubleDrop', label: 'Double Drop', title: 'Drop two runs straight into a third, harder one' },
    { key: 'keyLift', label: 'Key Lift', type: 'select', title: 'The last drop goes up',
      options: [['none', 'None'], ['half', 'Half Step'], ['whole', 'Whole Step'], ['third', 'Major Third']] },
    { key: 'hardStop', label: 'Hard Stop', title: 'Everything cut dead on the last beat before the final drop' },
    { key: 'falseEnding', label: 'False Ending', title: 'Stop after the last drop, then come back for one more' },
    { key: 'halfTime', label: 'Half-Time Switch', title: 'The first phrase of drop two at half time' },
    { key: 'outro', label: 'Outro', title: 'End on the riff as written' },
  ] },
  { id: 'drums', label: 'Drums', fields: [
    { key: 'source', label: 'Source Drums', type: 'select', title: 'What happens to drums already in the riff',
      options: [['add', 'Keep and Add'], ['replace', 'Replace'], ['asis', 'Keep As-Is']] },
    { key: 'kit', label: 'Kit', type: 'select', title: 'The drum sounds',
      options: [['style', 'Style Kit'], ['studio', 'Studio'], ['909', '909'], ['808', '808'], ['ds', 'DS'], ['cr78', 'CR-78']] },
    { key: 'crashes', label: 'Crashes', title: 'A crash on the one of every phrase' },
    { key: 'fills', label: 'Fills', title: 'A snare-and-tom fill every eight bars' },
    { key: 'rolls', label: 'Snare Rolls', title: 'The snare accelerating through every build' },
    { key: 'impact', label: 'Impact', title: 'A deep hit on the first beat of every drop' },
    { key: 'shaker', label: 'Shaker' },
    { key: 'tambourine', label: 'Tambourine' },
    { key: 'congas', label: 'Congas' },
    { key: 'cowbell', label: 'Cowbell' },
    { key: 'ride', label: 'Ride', title: 'A ride in the final drop' },
  ] },
  { id: 'parts', label: 'Bass & Chords', fields: [
    { key: 'bass', label: 'Bass', type: 'select',
      options: [['offbeat', 'Off-Beat'], ['rolling', 'Rolling 16ths'], ...BASS_FIGURES.map((f) => [f.id, f.label]), ['sub', 'Sub Only'], ['none', 'None']] },
    { key: 'bassLift', label: 'Bass Lifts', title: 'The later drops move the bass to a busier, related line — Off-Beat to Octave Eighths, Rolling to Gallop' },
    { key: 'sub', label: 'Sub Layer', title: 'A sine sub under the bass' },
    { key: 'chords', label: 'Chords', type: 'select',
      options: [['saws', 'Pumping Supersaws'], ['piano', 'Piano Stabs'], ['pad', 'Pad'], ['none', 'None']] },
    { key: 'square', label: 'Square Double', title: 'A loud plain square doubling the hook in the drops' },
    { key: 'bell', label: 'Bell Octave', title: 'A bell an octave over the hook from the second phrase' },
    { key: 'octaveDouble', label: 'Octave Hook', title: 'The hook in octaves in the final drop' },
    { key: 'thirdBelow', label: 'Third Below', title: 'A harmony a third under the hook in drop two' },
    { key: 'arp', label: 'Arp', title: 'A sixteenth arpeggio in the builds and later drops' },
    { key: 'arpPattern', label: 'Arp Pattern', type: 'select',
      title: 'Varied: the style\'s own figure first, then a different one each build and drop. Or one figure throughout',
      options: [['vary', 'Varied'], ['style', 'Style\'s Own'], ...ARP_FIGURES.map((f) => [f.id, f.label])] },
    { key: 'choir', label: 'Choir', title: 'A choir in the breakdown and the final drop' },
    { key: 'counter', label: 'Counter-Melody', title: 'A new line in the hook\'s rests' },
    { key: 'writeLead', label: 'Write a Lead', type: 'select',
      title: 'When Needed: a riff with no tune (only chords, or a bass) gets a lead written from its chords — a new one every take. Always: write one even over a riff with its own',
      options: [['auto', 'When Needed'], ['always', 'Always'], ['off', 'Off']] },
    { key: 'riffSound', label: 'Riff Sound', type: 'select',
      title: 'Keep the riff\'s own sounds, or give its tuned parts random presets — a new roll every take',
      options: [['keep', 'Keep'], ['random', 'Random']] },
    { key: 'partSounds', label: 'Part Sounds', type: 'select',
      title: 'Roll: the chords, pad, arp, choir and bell each drawn from the style\'s shortlist — a new roll every take. Style: always the style\'s own',
      options: [['roll', 'Roll'], ['style', 'Style\'s Own']] },
  ] },
  { id: 'fx', label: 'FX', fields: [
    { key: 'riser', label: 'Riser', title: 'A two-bar noise riser into every drop' },
    { key: 'filterBuild', label: 'Filter Build', title: 'The music opens up through a low-pass across each build' },
    { key: 'stutter', label: 'Stutter Before Drop', title: 'The whole mix repeating in 1/16s then 1/32s on the last beat of a build' },
    { key: 'pump', label: 'Sidechain Pump', title: 'The chords duck on every beat' },
    { key: 'delayThrows', label: 'Delay Throws', title: 'An echo thrown off the hook before a breakdown or a stop' },
    { key: 'lowpassIntro', label: 'Low-Pass Intro', title: 'The intro heard through a wall, opening up' },
    { key: 'bitcrushIntro', label: 'Bitcrush Intro', title: 'The intro crushed down to a few bits' },
    { key: 'tapeStop', label: 'Tape-Stop Ending', title: 'The last two bars wind down like a stopped tape — and the song does not loop' },
  ] },
]);

const FIELD = new Map(BANGER_GROUPS.flatMap((g) => g.fields.map((f) => [`${g.id}.${f.key}`, f])));

/** Everything a request can say, with the generator's own defaults (before a style). */
export const BANGER_DEFAULTS = Object.freeze({
  style: 'big-room', mood: 'anthemic', mode: 'keep', riffNotes: 'keep', length: 'medium', customBars: 64,
  variation: 'some', tempo: 'style', bpm: 128, hook: 'auto',
  // A Sound Combo (combos.js) by its id, or null for the style's own sounds and channels.
  combo: null,
  form: {
    script: false, intro: true, layers: 'off', grooveIntro: false, build: true, breakdown: true, secondDrop: true, doubleDrop: true, keyLift: 'whole',
    hardStop: true, falseEnding: false, halfTime: false, outro: true,
  },
  drums: {
    source: 'add', kit: 'style', crashes: true, fills: true, rolls: true, impact: true,
    shaker: true, tambourine: false, congas: false, cowbell: false, ride: true,
  },
  parts: {
    bass: 'offbeat', sub: true, chords: 'saws', square: true, bell: true, octaveDouble: true,
    bassLift: true, thirdBelow: false, arp: true, arpPattern: 'vary', choir: true, counter: false, writeLead: 'auto', riffSound: 'keep', partSounds: 'roll',
  },
  fx: {
    riser: true, filterBuild: true, stutter: true, pump: true, delayThrows: true,
    lowpassIntro: false, bitcrushIntro: false, tapeStop: false,
  },
});

const ids = (list) => list.map((x) => x.id);
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** The defaults a style asks for: the generator's, with the style's own on top. */
export function styleDefaults(style = styleFor(BANGER_DEFAULTS.style)) {
  const d = structuredClone(BANGER_DEFAULTS);
  const s = style?.defaults || {};
  for (const [k, v] of Object.entries(s)) {
    if (isPlain(v)) d[k] = { ...d[k], ...v };
    else d[k] = v;
  }
  d.style = style.id;
  d.bpm = style.bpm;
  return d;
}

/**
 * A request, made whole and checked. Returns `{ options, issues }` — `issues` is empty
 * when it can be generated. Whatever the request leaves out is the style's default;
 * a value of the wrong kind is replaced by the default AND reported, so the dialog
 * can say what it ignored.
 */
export function normaliseBangerOptions(raw = {}, styleArg = null) {
  const issues = [];
  const style = styleArg || styleFor(raw?.style) || styleFor(BANGER_DEFAULTS.style);
  if (raw?.style && !styleFor(raw.style)) issues.push(`there is no style called "${raw.style}"`);
  const base = styleDefaults(style);
  const out = structuredClone(base);
  const pick = (key, allowed) => {
    if (raw?.[key] == null) return;
    if (allowed.includes(raw[key])) out[key] = raw[key];
    else issues.push(`${key} "${raw[key]}" is not one of ${allowed.join(', ')}`);
  };
  pick('mood', ids(BANGER_MOODS));
  // A banger made before Mode existed says `key` (keep / major / minor, the relative key),
  // which is exactly Mode with the riff's notes kept.
  if (raw?.mode == null && raw?.key != null) {
    if (ids(BANGER_KEYS).includes(raw.key)) {
      out.mode = raw.key;
      // Major and Minor were the RELATIVE key (A minor's notes from C), and a take re-made
      // from such a banger must come out the same.
      if (raw.key !== 'keep') out.riffNotes = 'relative';
    } else issues.push(`key "${raw.key}" is not one of ${ids(BANGER_KEYS).join(', ')}`);
  }
  pick('mode', ids(BANGER_MODES));
  pick('to', ids(HOMES_READ));
  pick('riffNotes', RIFF_NOTES_READ);
  pick('length', ids(BANGER_LENGTHS));
  pick('variation', ids(BANGER_VARIATIONS));
  pick('tempo', ids(BANGER_TEMPOS));
  if (raw?.customBars != null) {
    const b = Number(raw.customBars);
    if (Number.isInteger(b) && b >= BANGER_LIMITS.minBars && b <= BANGER_LIMITS.maxBars
      && b % BANGER_LIMITS.barStep === 0) out.customBars = b;
    else issues.push(`a custom length is ${BANGER_LIMITS.minBars}–${BANGER_LIMITS.maxBars} bars in fours, not ${raw.customBars}`);
  }
  if (raw?.bpm != null) {
    const b = Number(raw.bpm);
    if (Number.isFinite(b) && b >= BANGER_LIMITS.minBpm && b <= BANGER_LIMITS.maxBpm) out.bpm = Math.round(b * 100) / 100;
    else issues.push(`a tempo is ${BANGER_LIMITS.minBpm}–${BANGER_LIMITS.maxBpm} BPM, not ${raw.bpm}`);
  }
  if (raw?.hook != null) out.hook = String(raw.hook);
  // Only its shape is checked: which combos a style has is the generator's to know, and a
  // desk older than the page must not refuse a combo saved since it started.
  if (raw?.combo !== undefined) {
    if (raw.combo === null || raw.combo === 'none' || raw.combo === '') out.combo = null;
    else if (typeof raw.combo === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.combo)) out.combo = raw.combo;
    else issues.push(`a Sound Combo is named by its id, not ${JSON.stringify(raw.combo)}`);
  }
  for (const group of BANGER_GROUPS) {
    const given = raw?.[group.id];
    if (given == null) continue;
    if (!isPlain(given)) { issues.push(`${group.id} is not a set of switches`); continue; }
    for (const [k, given1] of Object.entries(given)) {
      const field = FIELD.get(`${group.id}.${k}`);
      // Build in Layers was an on/off switch for its first hour (2 Oct 2026): a banger made
      // then says true or false, and its takes must still re-make.
      const v = group.id === 'form' && k === 'layers' && typeof given1 === 'boolean' ? (given1 ? 'always' : 'off') : given1;
      if (!field) { issues.push(`${group.label} has no switch called "${k}"`); continue; }
      if (field.type === 'select') {
        if (field.options.some(([id]) => id === v)) out[group.id][k] = v;
        else issues.push(`${field.label} "${v}" is not one of ${field.options.map(([id]) => id).join(', ')}`);
      } else if (typeof v === 'boolean') out[group.id][k] = v;
      else issues.push(`${field.label} is on or off, not ${JSON.stringify(v)}`);
    }
  }
  // A mood chosen without a bass brings the bass it suggests.
  if (raw?.mood != null && raw?.parts?.bass == null) out.parts.bass = moodBass(style, out.mood);
  return { options: out, issues };
}

/** How many bars the request is for. */
export function bangerBars(options) {
  if (options.length === 'custom') return options.customBars;
  return BANGER_LENGTHS.find((l) => l.id === options.length)?.bars ?? 64;
}

/** The tempo the banger plays at, given the riff it came from. */
export function bangerBpm(options, style, sourceBpm) {
  if (options.tempo === 'source' && Number.isFinite(sourceBpm) && sourceBpm > 0) return sourceBpm;
  if (options.tempo === 'custom') return options.bpm;
  return style?.bpm ?? options.bpm;
}

// The toggles Surprise Me may flip — the spice, never the spine. A drop, the kick and the
// style's core sound are never at the dice's mercy.
const SPICE = [
  ['form', 'halfTime'], ['form', 'falseEnding'], ['form', 'hardStop'],
  ['drums', 'shaker'], ['drums', 'tambourine'], ['drums', 'congas'], ['drums', 'cowbell'], ['drums', 'ride'],
  ['parts', 'thirdBelow'], ['parts', 'counter'], ['parts', 'choir'], ['parts', 'arp'], ['parts', 'bell'],
  ['fx', 'tapeStop'], ['fx', 'bitcrushIntro'], ['fx', 'lowpassIntro'], ['fx', 'delayThrows'], ['fx', 'stutter'],
];

/**
 * A surprise: mood, mode (one that suits the mood), riff notes, variation and tempo
 * rolled; each spice switch flipped one time in four, the key lift re-rolled one time in
 * four, and Riff Sound set to Random two times in three — a surprise usually gives the
 * riff a new sound, from the style's shortlist. The backbone's SOUND may change — the kit, the bass
 * line, the chord treatment, each one time in three — but never its presence: there is
 * always a bass, always chords, always the kick, the rolls, the riser. Never touches the style, the source bars or the length, and never turns
 * off a drop or the kick. `rng` is anything with `.next()` (src/engine/rng.js).
 */
export function surpriseBangerOptions(rng, base = BANGER_DEFAULTS) {
  const style = styleFor(base.style) || BANGER_STYLES[0];
  const out = normaliseBangerOptions(base, style).options;
  const pickOf = (list) => list[Math.floor(rng.next() * list.length)];
  out.mood = pickOf(BANGER_MOODS).id;
  // Always a mode that suits the mood just rolled — never Keep, never a neutral one.
  out.mode = pickOf(MOOD_MODES[out.mood]?.suits || ['keep']);
  out.riffNotes = rng.next() < 0.3 ? 'fit' : 'keep';
  const v = rng.next();
  out.variation = v < 0.15 ? 'faithful' : v < 0.65 ? 'some' : 'wild';
  if (out.tempo !== 'source') {
    const [lo, hi] = style.tempoRange || [style.bpm, style.bpm];
    out.tempo = 'custom';
    out.bpm = Math.round(lo + rng.next() * (hi - lo));
  }
  for (const [g, k] of SPICE) if (rng.next() < 0.25) out[g][k] = !out[g][k];
  if (rng.next() < 0.25) out.form.keyLift = pickOf(['none', 'half', 'whole', 'third']);
  out.parts.riffSound = rng.next() < 2 / 3 ? 'random' : 'keep';
  if (rng.next() < 1 / 3) out.drums.kit = pickOf(['style', 'studio', '909', '808', 'ds', 'cr78']);
  out.parts.bass = moodBass(style, out.mood);
  if (rng.next() < 1 / 3) out.parts.bass = pickOf(['offbeat', 'rolling', ...BASS_FIGURES.map((f) => f.id)]);
  if (rng.next() < 1 / 3) out.parts.chords = pickOf(['saws', 'piano', 'pad']);
  return out;
}
