/*
 * JMJR-4 — a preset into the patch one note is built from, or a list of why not.
 *
 * `problems` empty means the engine can sing this preset as authored. Anything in it names
 * something the engine does not do, and the caller must not pretend otherwise: an MRDR-3
 * rule (src/engine/mrdr3/compile.js), kept here for the same reason — a preset that plays
 * something other than what it says is worse than one that refuses.
 *
 * The preset's engine block is `jmjr4: {...}`; every key it may carry, its range and its
 * default are in JMJR4_DEFAULTS below, and the desk's panel draws exactly these (see
 * tests/pot-coverage.js). A key the preset omits takes the default, so an omitted key is
 * the same sound as the default panel. The VOICE named first supplies what the voice table
 * knows (tract, pressure, tilt, nasality, resonance, flutter); explicit keys win over it.
 */
import { JMJR4 } from '../synth-families.js';
import { syllablesFromText, JMJR4_MORPH_TARGETS } from './syll.js';
import { JMJR4_MAX_UNISON, morphTarget, morphNasal } from './note.js';
import { JMJR4_SPEAK_ENDINGS, JMJR4_SPEAK_STEPS } from './text.js';

export const JMJR4_MODES = ['sing', 'speak'];
export const JMJR4_PER_KEY = ['phrase', 'word'];
export const JMJR4_PITCH_FOLLOWS = ['key', 'fixed'];

/** Every `jmjr4.*` key, its default, and its range. The panel and this compiler share it. */
export const JMJR4_DEFAULTS = Object.freeze({
  mode: 'sing',
  voice: 'announcer',
  line: 'aah',
  // SPEAK: the phrase and the sentence melody's pots. `phraseIr` is not a pot — it is the
  // compiled phrase the desk writes beside them, see `jmjr4SpeakSource`.
  phrase: 'pump up the jam',
  speed: 1,          // ×, 0.5–2
  pitchHz: 118,      // Hz, 60–260: the speaking pitch when FOLLOWS is FIXED, the key's reference when KEY
  range: 1,          // 0–2: how far the spoken pitch moves
  step: 0,           // st, 0 (off) / 1 / 2 / 3: the melody quantised to whole steps
  ending: 'fall',    // fall / rise / flat
  perKey: 'phrase',  // phrase / word: what one key says
  pitchFollows: 'key', // key / fixed
  morphTo: 'OO',
  morph: 0,          // 0–100 %
  morphTime: 0,      // s
  bend: 0,           // semitones, −12–12
  bendTime: 0.12,    // s
  unison: 1,         // 1–4
  spread: 20,        // cents, 0–100
  tract: 1.0,        // 0.75–1.3
  press: 0.5,        // 0.3–0.75
  tilt: 0,           // dB, 0–12
  breath: 0.35,      // 0–0.8
  flutter: 0,        // %, 0–2
  jitter: 0,         // %, 0–2
  nasal: 0,          // %, 0–100
  sibilance: 100,    // %, 0–200
  buzz: 40,          // %, 0–100
  resonance: 50,     // 0–100
  bits: 16,          // 4–16, 16 = off: the arcade stage's word length
  rate: 44.1,        // kHz, 2–44.1, 44.1 = off: its hold rate
});
export const JMJR4_RANGES = Object.freeze({
  morph: [0, 100], morphTime: [0, 10], bend: [-12, 12], bendTime: [0, 10], unison: [1, JMJR4_MAX_UNISON],
  spread: [0, 100], tract: [0.75, 1.3], press: [0.3, 0.75], tilt: [0, 12], breath: [0, 0.8],
  flutter: [0, 2], jitter: [0, 2], nasal: [0, 100], sibilance: [0, 200], buzz: [0, 100], resonance: [0, 100],
  speed: [0.5, 2], pitchHz: [60, 260], range: [0, 2], bits: [4, 16], rate: [2, 44.1],
});

/**
 * Everything a compiled phrase depends on, as the desk stamps it into `jmjr4.phraseIr.source`
 * and as the compiler checks it: a block whose source differs from the preset's current keys
 * is stale, and a stale block is refused rather than played, because the preset would then
 * say something other than what its own text and pots say. The keys' defaults are resolved
 * so an omitted key and its default stamp the same source. PER KEY and FOLLOWS are not in
 * it: they choose what a key plays of the block, not what the block holds.
 */
export function jmjr4SpeakSource(voice, data) {
  const j = voice?.jmjr4 || {};
  const throat = data.voices[j.voice ?? JMJR4_DEFAULTS.voice] || {};
  const pick = (key, fromVoice) => (j[key] ?? (fromVoice != null ? num(fromVoice) : null) ?? JMJR4_DEFAULTS[key]);
  return {
    phrase: String(j.phrase ?? JMJR4_DEFAULTS.phrase).trim(),
    voice: j.voice ?? JMJR4_DEFAULTS.voice,
    speed: pick('speed'), pitchHz: pick('pitchHz'), range: pick('range'), step: pick('step'),
    ending: j.ending ?? JMJR4_DEFAULTS.ending,
    tract: pick('tract', throat.fscale), press: pick('press', throat.oq), tilt: pick('tilt', throat.tilt),
    breath: pick('breath'), flutter: pick('flutter', throat.flutter), sibilance: pick('sibilance'),
    buzz: pick('buzz'), resonance: pick('resonance', throat.res),
  };
}
export const JMJR4_AMP_DEFAULTS = Object.freeze({ attack: 0.09, decay: 0.2, sustain: 1, release: 0.5 });

/** RESONANCE 0..100 → a scale on every formant bandwidth, wide (soft) to narrow (ringing). */
export const bandwidthScale = (resonance) => 1.7 - 1.3 * (Math.min(100, Math.max(0, resonance)) / 100);

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/**
 * `opts.forCompile`: the desk asking for the controls it needs to compile the phrase — the
 * phrase block is not checked, because it is about to be written.
 */
export function compileJmjr4(voice, data, { forCompile = false } = {}) {
  const problems = [];
  if (!voice || voice.synth !== JMJR4) return { patch: null, problems: ['not a JMJR-4 preset'] };
  const j = voice.jmjr4 || {};
  const mode = j.mode ?? JMJR4_DEFAULTS.mode;
  if (!JMJR4_MODES.includes(mode)) problems.push(`mode ${JSON.stringify(mode)} is neither sing nor speak`);

  const voiceName = j.voice ?? JMJR4_DEFAULTS.voice;
  const throat = data.voices[voiceName];
  if (!throat) problems.push(`unknown voice ${JSON.stringify(voiceName)}`);

  const line = String(j.line ?? JMJR4_DEFAULTS.line);
  const syls = syllablesFromText(line);
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (!syls.length) problems.push(`line ${JSON.stringify(line)} has no syllable in it`);
  else if (syls.length !== words.length) problems.push(`line ${JSON.stringify(line)}: a word in it is not a syllable`);

  const morphTo = j.morphTo ?? JMJR4_DEFAULTS.morphTo;
  if (!JMJR4_MORPH_TARGETS.includes(morphTo)) problems.push(`morphTo ${JSON.stringify(morphTo)} is not a vowel the panel offers`);

  const val = (key) => {
    const raw = j[key];
    if (raw == null) return null;
    const x = num(raw);
    if (x == null) { problems.push(`${key} is not a number`); return null; }
    const [lo, hi] = JMJR4_RANGES[key];
    if (x < lo || x > hi) problems.push(`${key} ${x} is outside ${lo}–${hi}`);
    return x;
  };
  // the voice's own values first, explicit keys over them
  const fromVoice = throat || {};
  const tract = val('tract') ?? num(fromVoice.fscale) ?? JMJR4_DEFAULTS.tract;
  const press = val('press') ?? num(fromVoice.oq) ?? JMJR4_DEFAULTS.press;
  const tilt = val('tilt') ?? num(fromVoice.tilt) ?? JMJR4_DEFAULTS.tilt;
  const breath = val('breath') ?? JMJR4_DEFAULTS.breath;
  const flutter = val('flutter') ?? num(fromVoice.flutter) ?? JMJR4_DEFAULTS.flutter;
  // JITTER is the one voice-card pot the VOICE dropdown does NOT load, deliberately. The
  // table's `jitter` is the reference's peak-of-walk fraction, a different scale from this
  // pot's RMS percent — and every shipped preset was auditioned and approved with no jitter
  // at all, so loading chorister's 0.05 behind the dropdown would change nine sounds that
  // are already settled. The pot starts at 0 and is the user's.
  const jitter = val('jitter') ?? JMJR4_DEFAULTS.jitter;
  const nasal = val('nasal') ?? num(fromVoice.nasal) ?? JMJR4_DEFAULTS.nasal;
  const sibilance = val('sibilance') ?? JMJR4_DEFAULTS.sibilance;
  const buzz = val('buzz') ?? JMJR4_DEFAULTS.buzz;
  const resonance = val('resonance') ?? num(fromVoice.res) ?? JMJR4_DEFAULTS.resonance;
  const morph = val('morph') ?? JMJR4_DEFAULTS.morph;
  const morphTime = val('morphTime') ?? JMJR4_DEFAULTS.morphTime;
  const bend = val('bend') ?? JMJR4_DEFAULTS.bend;
  const bendTime = val('bendTime') ?? JMJR4_DEFAULTS.bendTime;
  const unison = Math.round(val('unison') ?? JMJR4_DEFAULTS.unison);
  const spread = val('spread') ?? JMJR4_DEFAULTS.spread;
  // the reference's chip() arcade stage, a post stage on the key's lane: off at 16 bits and 44.1 kHz
  const bits = Math.round(val('bits') ?? JMJR4_DEFAULTS.bits);
  const rate = val('rate') ?? JMJR4_DEFAULTS.rate;
  const crush = bits < 16 || rate < 44.1 ? { bits, rate } : null;

  const a = j.amp || {};
  const amp = {
    attack: num(a.attack) ?? JMJR4_AMP_DEFAULTS.attack,
    decay: num(a.decay) ?? JMJR4_AMP_DEFAULTS.decay,
    sustain: num(a.sustain) ?? JMJR4_AMP_DEFAULTS.sustain,
    release: num(a.release) ?? JMJR4_AMP_DEFAULTS.release,
  };
  for (const [k, x] of Object.entries(amp)) {
    if (x < 0 || x > (k === 'sustain' ? 1 : 10)) problems.push(`amp.${k} ${x} is outside its range`);
  }

  // ---- SPEAK: the phrase's pots, and the compiled block that must match them ----
  let speak = null;
  if (mode === 'speak') {
    const speed = val('speed') ?? JMJR4_DEFAULTS.speed;
    const pitchHz = val('pitchHz') ?? JMJR4_DEFAULTS.pitchHz;
    const range = val('range') ?? JMJR4_DEFAULTS.range;
    const step = j.step ?? JMJR4_DEFAULTS.step;
    const ending = j.ending ?? JMJR4_DEFAULTS.ending;
    const perKey = j.perKey ?? JMJR4_DEFAULTS.perKey;
    const pitchFollows = j.pitchFollows ?? JMJR4_DEFAULTS.pitchFollows;
    const phrase = String(j.phrase ?? JMJR4_DEFAULTS.phrase).trim();
    if (!JMJR4_SPEAK_STEPS.includes(step)) problems.push(`step ${JSON.stringify(step)} is not 0, 1, 2 or 3`);
    if (!JMJR4_SPEAK_ENDINGS.includes(ending)) problems.push(`ending ${JSON.stringify(ending)} is not fall, rise or flat`);
    if (!JMJR4_PER_KEY.includes(perKey)) problems.push(`perKey ${JSON.stringify(perKey)} is not phrase or word`);
    if (!JMJR4_PITCH_FOLLOWS.includes(pitchFollows)) problems.push(`pitchFollows ${JSON.stringify(pitchFollows)} is not key or fixed`);
    if (!phrase) problems.push('phrase is empty');
    const source = jmjr4SpeakSource(voice, data);
    const block = j.phraseIr;
    if (!forCompile) {
      if (!block?.ir?.schema) problems.push('phrase not compiled: open the preset on the desk with the dictionary reachable');
      else if (JSON.stringify(block.source) !== JSON.stringify(source)) problems.push('phrase block is stale: the text or a pot changed since it was compiled; the desk recompiles it');
      else if (perKey === 'word' && !(Array.isArray(block.words) && block.words.length)) problems.push('per-key words were not compiled');
    }
    speak = { phrase, speed, pitchHz, range, step, ending, perKey, pitchFollows, source, ir: block?.ir ?? null, words: block?.words ?? [] };
  }

  if (problems.length) return { patch: null, problems };

  const baseVowel = syls[0].vowel;
  const amount = morph / 100;
  const target = morphTarget(data, baseVowel, morphTo, amount);
  const patch = {
    line: syls,
    lineText: words,
    ctl: {
      src: throat.src, oq: press, fscale: tract, tilt_db: tilt, asp: breath,
      flutter: flutter / 100, jitter: jitter / 100, sibilance: sibilance / 100, nasal_buzz: buzz / 100,
      bw: data.tract.bw.map((b) => b * bandwidthScale(resonance)),
    },
    amp,
    nasal: nasal / 100,
    morph: target ? { target, time: morphTime, nasal: morphNasal(data, baseVowel, morphTo, amount, nasal / 100), to: morphTo, amount } : null,
    bend, bendTime, unison, spread,
    crush,
    voice: voiceName,
    throat,
    mode,
    speak,
  };
  return { patch, problems };
}

/** The ids in a catalogue this engine can sing, and what it refuses about the rest. */
export function jmjr4RenderableIds(voices, data) {
  const ok = [];
  const refused = {};
  for (const [id, v] of Object.entries(voices)) {
    if (v?.synth !== JMJR4) continue;
    const { problems } = compileJmjr4(v, data);
    if (problems.length) refused[id] = problems; else ok.push(id);
  }
  return { ok, refused };
}

/** The shared vibrato, as the rack builds it: depth in semitones, rate in Hz, delay in s. */
export const jmjr4VibratoOf = (voice) => {
  const vib = voice?.vibrato;
  const depth = Number(vib?.depth) || 0;
  if (!(depth > 0)) return null;
  return {
    depth: Math.min(24, depth),
    rate: Math.min(64, Math.max(0.01, Number(vib.rate) || 5)),
    delay: Math.max(0, Number(vib.delay) || 0),
  };
};
