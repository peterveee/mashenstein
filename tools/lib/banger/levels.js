// MAKE A BANGER — the levels: every channel's fader, predicted as the banger is made.
// 2 Oct 2026.
//
// Every preset already arrives on its lane at about the same loudness for ONE note: it
// was measured once, and the engine divides that into the lane's target (`voiceGain` in
// src/data/voices.js). What one note cannot know is how a banger PLAYS the sound — a
// chord is three or four notes, a pad held for a bar delivers more than the note it was
// measured on, a pluck in sixteenths less, a bell three octaves up reads differently from
// one at A2. So each fader is set here, from a prediction of how loud its part will be:
//
//   · what it plays — every note in an eight-bar window of its drop: how many at once,
//     how long, how high (`partLevel`);
//   · on what — the preset's own curve of loudness against note length and pitch,
//     measured by tools/banger-levels.js (`curves` in levels-data.js); a preset with no
//     curve yet uses its one catalogue measurement and a typical shape;
//   · against what the channel was SET for. A style's channels were copied from a seed
//     remix's (eurobeat's chords are HAIRPIN's STRINGS), so the fader that channel had
//     is right for the part it played there. The fader here is that one, moved by the
//     predicted difference between the two parts. A channel set by hand (trance's) is
//     matched to the style's own default part instead. Those reference parts are `refs`
//     in levels-data.js, read out of the seed files by the tool.
//
// Drums are matched on the SOUND only — the chosen kit's kick against the seed's kick, on
// the banger's own pattern — because a half-time drop and a full-time one are meant to
// differ. The riff's own parts likewise, the hook among them: a Random sound is matched to
// the riff's own sound on the riff's own notes, and a kept sound is left exactly where it
// was — it arrives with its own song's channel (EQ, inserts) that no prediction here can
// hear, and the check found a kept hook landed better left alone.
//
// One channel setting IS heard: the Stereo Widener. It raises the sides and leaves the
// middle alone (since 2 Oct 2026 — before that it traded the middle away and swallowed a
// mono sound), so a wide sound on a widened channel comes up and a narrow one does not.
// Each curve carries how much of its sound is in the sides, and both parts of a match are
// put through their own channel's widener. Past 0.5 the widener also makes a side out of
// the middle above a 300Hz low cut (2 Oct 2026), so each curve also carries how much of its
// sound gets past that cut at each of its pitches (`highs`), and a part is read at the
// middle of where it plays.
//
// A prediction, not a measurement: `node tools/banger-levels.js check` renders bangers part
// by part and says how far each one landed from its reference, and `check --fit` folds the
// average miss per channel back in (`offsets`). Browser-safe, like the rest of the package.
import { VOICES, voiceGain, baseLane, PERCUSSION_LANES } from '../../../src/data/voices.js';
import { L, P, midi, hasNotes } from './theory.js';
import { isHookSection } from './form-types.js';
import { laneVoiceOf } from './riff.js';
import { DRUM_ROLES } from './lanes.js';
import { hashStr } from '../../../src/engine/rng.js';
import { BANGER_LEVEL_DATA } from './levels-data.js';
import { BANGER_CALIBRATION } from './calibration-data.js';
import { measuredPart, referenceKey } from './calibration.js';

/** How many bars of a part its level is read over: a drop phrase. */
export const LEVEL_WINDOW_BARS = 8;
/** The most a prediction may move a fader either way, in dB. Past that the guess is the problem. */
export const MAX_LEVEL_MOVE = 6;
/**
 * ERR SOFT ON THE LEADS (Peter, 3 Oct 2026: "the leads are often too loud as are the
 * arpeggios… I would prefer to err on the side of caution and have them too soft than too
 * loud"). The parts that sit on top of the mix — the hook's doubles and the arpeggio — come
 * down LEAD_CAUTION_DB below the prediction, and the prediction may raise them by no more
 * than LEAD_MAX_RAISE: a guess that a lead should come UP is the guess that costs most when
 * it is wrong. Only these parts; the rest of the mix is as predicted.
 */
export const LEAD_ROLES = Object.freeze(['square', 'bell', 'megaSaw', 'arp']);
export const LEAD_CAUTION_DB = -2.5;
export const LEAD_MAX_RAISE = 2;
/**
 * The note lengths a curve holds, in seconds — a step to a bar at the bench's 120 BPM, an
 * octave apart. Five, because a sound need not get louder the longer it is held: some
 * peak at an eighth note and fall away, and three points stepped right over that.
 */
export const CURVE_SECONDS = [0.125, 0.25, 0.5, 1, 2];
/** The length a curve's pitches are measured at: a beat. */
export const CURVE_PITCH_SECONDS = 0.5;
/** The pitches a curve holds (MIDI): A1, A2 (the catalogue's own), C4 and A5. */
export const CURVE_MIDI = [33, 45, 60, 81];
/** The bench every level was measured on (tools/lib/measure-voice.js) plays 120 BPM. */
const BENCH_STEP = 0.125;
/** Twice as long can at most deliver twice the energy: 3 dB of level per doubling. */
const PER_DOUBLING = 10 * Math.log10(2);

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round1 = (x) => Math.round(x * 10) / 10;

/**
 * What one note of a lane's own engine voice reaches — the lane's target. `voiceGain`
 * hands a voice that measured exactly 1 and carries no peak the target itself (its
 * "only the one answer" branch), so it is read back from there rather than copied.
 */
const laneTarget = (lane) => voiceGain({ level: 1, peak: 0 }, lane);

const CURVE_X = CURVE_SECONDS.map((s) => Math.log2(s));

/** dB at `seconds` from a curve's lengths: straight in log-time between them, and past either end no steeper than energy can follow. */
function lengthDb(lens, seconds) {
  const x = Math.log2(Math.max(seconds, 0.01));
  const n = CURVE_X.length;
  const slope = (i) => (lens[i + 1] - lens[i]) / (CURVE_X[i + 1] - CURVE_X[i]);
  if (x <= CURVE_X[0]) return lens[0] + (x - CURVE_X[0]) * clamp(slope(0), 0, PER_DOUBLING);
  if (x >= CURVE_X[n - 1]) return lens[n - 1] + (x - CURVE_X[n - 1]) * clamp(slope(n - 2), 0, PER_DOUBLING);
  let i = 0;
  while (x > CURVE_X[i + 1]) i++;
  return lens[i] + (x - CURVE_X[i]) * slope(i);
}

/** A value a curve holds at each of its four pitches, at `m` (MIDI): straight between them, flat past either end. */
function atPitch(values, m) {
  const xs = CURVE_MIDI;
  if (m <= xs[0]) return values[0];
  if (m >= xs[xs.length - 1]) return values[xs.length - 1];
  let i = 0;
  while (m > xs[i + 1]) i++;
  return values[i] + ((values[i + 1] - values[i]) * (m - xs[i])) / (xs[i + 1] - xs[i]);
}

/** How much louder a note at `m` reads than the same note at A2, from a curve's four pitches (measured a beat long). */
function pitchTilt(pitches, m) {
  return atPitch(pitches, m) - pitches[1];
}

/**
 * One note held `seconds` at `m` (MIDI), at unity and dry, in dB (20·log10 of its level).
 * From the preset's curve when it has one (`curveId`); otherwise from its one catalogue
 * measurement — at the preset's own length, at A2 — with a typical shape either side: all
 * of the energy of a shorter note, half the growth of a longer one. A drum is its
 * catalogue level, since a hit is a hit whatever length is written against it, and the
 * lane's own engine voice (`voice` null) is the lane's target.
 */
export function noteDb(voice, curveId, lane, seconds, m, curves = BANGER_LEVEL_DATA.curves) {
  // What the sound really puts out is the library's measurement of it — a song's unedited
  // copy can carry an older number, and that number only decides the gain it is given.
  const library = curveId ? VOICES[curveId] : null;
  const level = library?.level > 0 ? library.level : voice ? voice.level : laneTarget(lane);
  if (!(level > 0)) return null;
  if (PERCUSSION_LANES.includes(baseLane(lane))) return 20 * Math.log10(level);
  const curve = curveId ? curves?.[curveId] : null;
  if (curve?.lens?.length === CURVE_SECONDS.length) return lengthDb(curve.lens, seconds) + (m == null ? 0 : pitchTilt(curve.pitches, m));
  const d0 = ((library || voice)?.dur > 0 ? (library || voice).dur : 4) * BENCH_STEP;
  const doublings = Math.log2(Math.max(seconds, 0.01) / d0);
  return 20 * Math.log10(level) + doublings * (doublings < 0 ? PER_DOUBLING : PER_DOUBLING / 2);
}

/**
 * What a channel's Stereo Widener does to a sound, as amplitudes: the side by 2·WIDTH, the
 * middle not at all (since 2 Oct 2026 — see midAtUnity in src/engine/effects.js; it used to
 * be Tone's 2(1 − width), which swallowed a mono sound), and `made`, the side it makes out
 * of the middle above its low cut past WIDTH 0.5, at 2·WIDTH − 1 (see madeSide). The
 * widener's WET and MONO SPREAD were retired the same day; left in a save they are ignored,
 * as the engine ignores them. Null when the channel has none.
 */
export function widenerOf(strip) {
  const fx = (strip?.effects || []).find((e) => e.id === 'widener' && !e.bypass && !e.off);
  if (!fx) return null;
  const width = clamp(Number(fx.params?.width ?? 0.7), 0, 1);
  return { mid: 1, side: 2 * width, made: Math.max(0, Math.round((2 * width - 1) * 1e6) / 1e6) };
}

/**
 * How much of a sound's middle gets past the made side's low cut, as energy, when a curve has
 * not measured it. At a pitch, the typical curve: the median of the 134 measured on 2 Oct
 * 2026 at A1, A2, C4 and A5. A drum row has no pitch, and a kit is a kick under the cut and
 * hats over it, so it is guessed at about the middle of that.
 */
const HIGHS_TYPICAL = [0.08, 0.19, 0.53, 0.99];
const HIGH_GUESS = 0.6;

/**
 * The dB a widener moves a sound with `side` of its energy in the sides (0 mono, 1 all sides)
 * and `high` of its middle above the made side's low cut. The mid/side merge is orthonormal, so
 * L² + R² is the middle's energy plus the side's, and the made side is a delayed copy of the
 * middle: its energy adds, it does not cancel against anything until the sound is summed to mono.
 *
 * Except, a little, against a side the sound already has. The made side is counted as if
 * it had nothing to do with the real one, which is exact for a mono sound (the curves tool
 * and the engine agree to 0.01 on every one) and slightly generous for a wide one: the
 * choir, 27% sides, lets 0.95 past the cut by the curve and 0.78 by the engine — a third
 * of a dB at WIDTH 1, a tenth at 0.75.
 */
export function stereoDb(side, widener, high = HIGH_GUESS) {
  if (!widener) return 0;
  const s = clamp(side, 0, 1);
  const made = (widener.made ?? 0) ** 2 * clamp(high, 0, 1);
  const e = (1 - s) * (widener.mid ** 2 + made) + s * widener.side ** 2;
  return e > 0 ? 10 * Math.log10(e) : -60;
}

/** How much of a sound is in the sides: measured with its curve, or a guess that most sounds are mostly middle. */
const sideOf = (sound, curves) => {
  const c = sound.curveId ? curves?.[sound.curveId] : null;
  if (Number.isFinite(c?.side)) return c.side;
  return sound.voice ? 0.25 : 0;
};

/** How much of a sound gets past the made side's low cut at `m` (MIDI): measured with its curve, or a guess. */
const highOf = (sound, curves, m) => {
  const c = sound.curveId ? curves?.[sound.curveId] : null;
  if (m == null) return HIGH_GUESS;
  return atPitch(c?.highs?.length === CURVE_MIDI.length ? c.highs : HIGHS_TYPICAL, m);
};

/** The middle of where a part plays (MIDI), every note once; null for a drum row or a part with no notes. */
function partPitch(bars) {
  let sum = 0; let n = 0;
  for (const bar of bars) {
    if (!bar || Array.isArray(bar)) continue;
    for (const v of bar.notes) {
      if (v == null) continue;
      for (const x of Array.isArray(v) ? v : [v]) { sum += midi(x); n++; }
    }
  }
  return n ? sum / n : null;
}

/** What the engine multiplies a preset by on `lane`: its level against the lane's target, and its own trim. */
function playGain(voice, lane) {
  if (!voice) return 1;
  return voiceGain(voice, lane) * 10 ** ((voice.trim ?? 0) / 20);
}

const BIN = 0.01;        // seconds
const BLOCK = 40;        // bins: the meter's 400 ms block
const HOP = 10;          // bins: and its 100 ms step

/**
 * How loud a part plays at a flat fader, in dB: the energy its notes deliver, read the way
 * the loudness meter reads (tools/lib/loudness.js, BS.1770) — 400 ms blocks every 100 ms,
 * the silent ones and those 10 dB under the rest left out — so a part is judged by how
 * loud it is while it plays, not by how often it does. `bars` are the part's bars,
 * `{ notes, lens }` (note names; lengths in steps) or a drum row, null where it rests.
 * Null when it plays nothing. The units are the bench's: only a difference means anything.
 */
export function partLevel({ bars, bpm, voice = null, curveId = null, lane, curves = BANGER_LEVEL_DATA.curves }) {
  const step = 60 / bpm / 4;
  const gain2 = playGain(voice, lane) ** 2;
  const bins = new Float64Array(Math.ceil((bars.length * 16 * step + 3) / BIN) + BLOCK);
  let any = false;
  // Each note's energy, spread over it and a short release — capped, because a long
  // note's energy is in its first seconds whatever is written after them.
  const add = (t, seconds, energy) => {
    const a = Math.floor(t / BIN);
    const n = Math.max(1, Math.round((clamp(seconds, 0.05, 2.5) + 0.1) / BIN));
    for (let i = 0; i < n && a + i < bins.length; i++) bins[a + i] += energy / n;
    any = true;
  };
  bars.forEach((bar, k) => {
    if (!bar) return;
    if (Array.isArray(bar)) {
      const e = noteDb(voice, curveId, lane, 0.25, null, curves);
      if (e == null) return;
      bar.forEach((hit, i) => { if (hit) add((k * 16 + i) * step, 0.25, 10 ** (e / 10) * gain2); });
      return;
    }
    bar.notes.forEach((v, i) => {
      if (v == null) return;
      const names = Array.isArray(v) ? v : [v];
      if (!names.length) return;
      const seconds = (Number(bar.lens?.[i]) > 0 ? Number(bar.lens[i]) : 1) * step;
      const m = names.reduce((s, x) => s + midi(x), 0) / names.length;
      const e = noteDb(voice, curveId, lane, seconds, m, curves);
      if (e == null) return;
      add((k * 16 + i) * step, seconds, names.length * 10 ** (e / 10) * gain2);
    });
  });
  if (!any) return null;
  const pre = new Float64Array(bins.length + 1);
  for (let i = 0; i < bins.length; i++) pre[i + 1] = pre[i] + bins[i];
  const blocks = [];
  for (let a = 0; a + BLOCK <= bins.length; a += HOP) blocks.push(pre[a + BLOCK] - pre[a]);
  const loudest = blocks.reduce((m, e) => (e > m ? e : m), 0);
  if (!(loudest > 0)) return null;
  const heard = blocks.filter((e) => e > loudest * 1e-7);
  const mean = heard.reduce((s, e) => s + e, 0) / heard.length;
  const kept = heard.filter((e) => e >= mean * 0.1);
  return 10 * Math.log10(kept.reduce((s, e) => s + e, 0) / kept.length / (BLOCK * BIN));
}

/** The dry model plus the one channel effect it predicts; calibration stores its residual. */
export function predictedProcessedPart({ bars, bpm, lane, sound, strip, curves = BANGER_LEVEL_DATA.curves }) {
  const value = partLevel({ bars, bpm, lane, ...sound, curves });
  return value == null ? null : value + stereoDb(sideOf(sound, curves), widenerOf(strip), highOf(sound, curves, partPitch(bars)));
}

/**
 * The bars a part's level is read over (0-based, inclusive): from the first bar it plays
 * in the LAST drop it plays in — the fullest one — for up to eight bars, inside that drop.
 * A part no drop has (the breakdown's piano) is read where it first plays. Null if it
 * never does. `plays(bar)` says whether the part has notes in a bar.
 */
export function levelWindow(form, plays) {
  const sections = [...form.filter(isHookSection).reverse(), ...form.filter((f) => !isHookSection(f))];
  for (const sec of sections) {
    for (let b = sec.from - 1; b < sec.to; b++) {
      if (plays(b)) return [b, Math.min(sec.to - 1, b + LEVEL_WINDOW_BARS - 1)];
    }
  }
  return null;
}

// What a song's copy of a preset carries besides the sound itself.
const COPY_META = new Set(['id', 'label', 'note', 'level', 'peak', 'songOrigin', 'songSourceId', 'starter', 'factory',
  'user', 'origin', 'category', 'homeLane', 'kind']);
export const soundKey = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().filter((key) => !(x === v && COPY_META.has(key))).map((key) => [key, x[key]]))
  : x));

/**
 * The library preset a song's copy still sounds exactly like — its `id`, when nothing but
 * the name and the numbers moved — so the copy is measured by that preset's curve. An
 * edited copy is measured in its own right (`copyCurveKey`), or failing that by its level.
 */
export function libraryCurveId(params) {
  const preset = params?.id ? VOICES[params.id] : null;
  return preset && preset.kind !== 'engine' && soundKey(params) === soundKey(preset) ? params.id : null;
}

/** The curve an edited song copy is measured under: its sound, hashed — the same sound in two songs is one curve. */
export function copyCurveKey(params) {
  const key = soundKey(params);
  return `copy:${hashStr(key).toString(36)}-${key.length.toString(36)}`;
}

/**
 * A sound as the level model takes it: the voice (whose `level` the engine divides by),
 * the id of the curve that says how it really plays — a library preset's, a copy that
 * still sounds like one, or an edited copy measured in its own right — and a name.
 */
export function soundOf({ id = null, params = null } = {}, curves = BANGER_LEVEL_DATA.curves) {
  if (params) {
    const own = copyCurveKey(params);
    return { voice: params, curveId: libraryCurveId(params) || (curves?.[own] ? own : null), label: params.label || 'its own copy' };
  }
  const preset = id ? VOICES[id] : null;
  if (preset && preset.kind !== 'engine') return { voice: preset, curveId: id, label: preset.label || id };
  return { voice: null, curveId: null, label: 'the lane\'s own voice' };
}

/** A reference part's sound: the library preset as it is now, or the song copy's numbers (and its preset's curve, while it still sounds like it). */
function refSound(ref, curves) {
  const v = ref.voice || {};
  if (v.id && VOICES[v.id]) return soundOf({ id: v.id });
  if (v.level > 0) {
    const curveId = v.unedited ? v.copyOf : v.copyKey && curves?.[v.copyKey] ? v.copyKey : null;
    return { voice: { level: v.level, peak: v.peak, dur: v.dur, trim: v.trim }, curveId, label: v.label || 'a song copy' };
  }
  return soundOf({});
}

/** A reference part's bars, parsed. */
export const refBars = (ref) => ref.bars.map((s) => (s == null ? null
  : PERCUSSION_LANES.includes(baseLane(ref.lane)) ? P(s) : L(s)));

// The same sound: the same preset, or a song copy carried over unchanged.
const sameSound = (a, b) => a.voice === b.voice
  || (!!a.curveId && a.curveId === b.curveId)
  || (!a.curveId && !b.curveId && !!a.voice && !!b.voice && JSON.stringify(a.voice) === JSON.stringify(b.voice));

/**
 * Set every channel's fader from its part (see the top of this file), moving
 * `mix.lanes[lane].gain`. Returns a row per channel it moved:
 * `{ lane, job, how, from, base, before, after, move, window }` — `how` is 'part' (matched
 * to the part its settings were set for) or 'sound' (the same notes, on the sound it
 * replaced); `base` the fader it was moved from (its reference's); `window` the bars it was
 * read over (0-based, inclusive).
 *
 * `bars` are the banger's bars by ROLE (buildSections), `laneOf` its roles' lanes,
 * `riffParts` the riff's parts as the generator holds them.
 */
export function levelMix({ style, form, bars, laneOf, mix, bank, bpm, riffParts, hookKey, refs: own = null, data = BANGER_LEVEL_DATA, calibration = BANGER_CALIBRATION }) {
  // A Sound Combo brings its own: the banger it was saved from is what its faders were set for.
  const refs = own || data.refs?.[style.id] || {};
  const offsets = data.offsets?.[style.id] || {};
  const balance = style.balance || {};
  const leadCautionDb = Number.isFinite(balance.leadCautionDb) ? balance.leadCautionDb : LEAD_CAUTION_DB;
  const byKey = new Map(riffParts.map((p) => [p.key, p]));
  // What a channel's widener does to `sound` playing `notes`: see stereoDb.
  const stereo = (sound, notes, w) => stereoDb(sideOf(sound, data.curves), w, highOf(sound, data.curves, partPitch(notes)));
  const rows = [];
  for (const [role, lane] of laneOf) {
    if (role === 'riser') continue;
    const window = levelWindow(form, (b) => hasNotes(bars[b]?.[role]));
    if (!window) continue;
    const part = [];
    for (let b = window[0]; b <= window[1]; b++) part.push(bars[b]?.[role] || null);
    const strip = mix.lanes[lane] || (mix.lanes[lane] = {});
    const before = strip.gain ?? 0;
    const now = soundOf(laneVoiceOf(bank, mix, lane), data.curves);
    const riffPart = role.startsWith('riff:') ? byKey.get(role.slice(5)) : role === 'hook' ? byKey.get(hookKey) : null;
    const widener = widenerOf(strip);
    let base; let R; let M; let how; let from; let offset = 0; let wasRiff = null;
    if (riffPart) {
      // The riff's own part, the hook too: left where it is, unless Random gave it a new sound.
      const was = soundOf({ id: riffPart.voice, params: riffPart.voiceParams }, data.curves);
      if (sameSound(was, now)) continue;
      wasRiff = was;
      R = partLevel({ bars: part, bpm, lane, ...was, curves: data.curves });
      M = partLevel({ bars: part, bpm, lane, ...now, curves: data.curves });
      if (R != null) R += stereo(was, part, widener);
      base = before; how = 'sound'; from = `the riff's own ${was.label}`;
    } else {
      const ref = refs[role];
      if (!ref) continue;
      const was = refSound(ref, data.curves);
      base = Number.isFinite(ref.gain) ? ref.gain : before;
      offset = offsets[role] ?? 0;
      from = ref.from;
      if (DRUM_ROLES.has(role)) {
        // The banger's own pattern on both sounds: a different groove is meant to differ.
        R = partLevel({ bars: part, bpm, lane, ...was, curves: data.curves });
        if (R != null) R += stereo(was, part, widener);
        how = 'sound';
      } else {
        const theirs = refBars(ref);
        R = partLevel({ bars: theirs, bpm: ref.bpm, lane: ref.lane, ...was, curves: data.curves });
        if (R != null) R += stereo(was, theirs, ref.widener || null);
        how = 'part';
      }
      M = partLevel({ bars: part, bpm, lane, ...now, curves: data.curves });
    }
    if (M != null) M += stereo(now, part, widener);
    if (R == null || M == null) continue;
    // Only replace a comparison when BOTH sides have measured support. Unmeasured
    // instruments, changed strips and distant scenarios retain the existing predictor.
    const measured = (sound, predicted) => measuredPart({ data: calibration, voice: sound.voice,
      lane, strip, fx: mix.fx, curve: data.curves?.[sound.curveId], bars: part, bpm, predicted });
    const actual = measured(now, M);
    const target = wasRiff ? measured(wasRiff, R) : calibration.references?.[referenceKey(refs[role] || {})];
    const calibrated = !!actual && !!target && Number.isFinite(target.lufs);
    if (calibrated) { R = target.lufs; M = actual.lufs; offset = 0; }
    const lead = LEAD_ROLES.includes(role);
    const move = clamp(R - M, calibrated ? -18 : -MAX_LEVEL_MOVE, calibrated || lead ? LEAD_MAX_RAISE : MAX_LEVEL_MOVE);
    const roleGainDb = Number.isFinite(balance.roleGainDb?.[role]) ? balance.roleGainDb[role] : 0;
    const after = round1(base + move + offset + (lead ? leadCautionDb : 0) + roleGainDb);
    strip.gain = after;
    rows.push({ lane, job: riffPart && role !== 'hook' ? `riff:${riffPart.key}` : role, how, from, base, before, after, move: round1(after - before), window, calibrated });
  }
  return rows;
}
