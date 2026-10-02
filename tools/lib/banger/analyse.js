// MAKE A BANGER — listening to the riff: what key it is in, and what chord each bar
// implies. Then, for every bar the banger plays, which chord goes under it.
//
// The rule the whole file serves: the riff's NOTES are not changed to suit a chord —
// a chord is chosen to suit the notes. A mood's progression is the first choice, and it
// is kept wherever the hook sits on it; where it would clash, the chord that fits the
// hook wins. So the mood decides everything it can without rewriting the tune.
//
// Browser-safe: no `node:*` imports.
import { NAMES, midi, parseChord, chordSym, scaleOf, isDrumPart, mapPitches } from './theory.js';

// Krumhansl–Kessler key profiles.
const KEY_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KEY_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const pcOf = (name) => ((midi(name) % 12) + 12) % 12;

/**
 * A bar's pitch-class weights: every note by how long it sounds, a little more on the
 * beat, a lot more for a bass note (a bass names the chord). Drum parts say nothing.
 */
export function barWeights(parts, { bassWeight = 3 } = {}) {
  const w = new Array(12).fill(0);
  let lowest = null;
  for (const { part, role } of parts) {
    if (!part || isDrumPart(part)) continue;
    part.notes.forEach((v, i) => {
      if (v == null) return;
      const names = Array.isArray(v) ? v : [v];
      const len = Math.min(8, part.lens[i] ?? 1);
      const beat = i % 4 === 0 ? 1.5 : 1;
      const scale = role === 'bass' ? bassWeight : 1;
      for (const name of names) {
        w[pcOf(name)] += len * beat * scale / Math.sqrt(names.length);
        if (role === 'bass' && (lowest == null || midi(name) < midi(lowest.name))) lowest = { name, step: i };
      }
    });
  }
  return { w, bassPc: lowest ? pcOf(lowest.name) : null };
}

/** Pearson correlation of two 12-vectors. */
function correlate(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / 12;
  const mb = b.reduce((s, x) => s + x, 0) / 12;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** The key a set of weights is most likely in: `{ tonic, minor, confidence }`. */
export function detectKey(w) {
  if (!w.some((x) => x > 0)) return { tonic: 9, minor: true, confidence: 0 };
  const scores = [];
  for (const [minor, profile] of [[false, KEY_MAJOR], [true, KEY_MINOR]]) {
    for (let tonic = 0; tonic < 12; tonic++) {
      const rotated = Array.from({ length: 12 }, (_, pc) => profile[((pc - tonic) % 12 + 12) % 12]);
      scores.push({ tonic, minor, score: correlate(w, rotated) });
    }
  }
  scores.sort((x, y) => y.score - x.score);
  const [best, second] = scores;
  return { tonic: best.tonic, minor: best.minor, confidence: Math.max(0, best.score - second.score), score: best.score };
}

/** The relative key: A minor ↔ C major. Same notes, a different home. */
export const relativeKey = ({ tonic, minor }) => ({ tonic: (tonic + (minor ? 3 : 9)) % 12, minor: !minor });

/**
 * The modes a banger can be in. `minor` says whether the mode's third is minor (it
 * decides chord colours and which breakdown a style uses). `ionian` is where the mode's
 * home sits above the major scale it shares notes with — D dorian is C major's notes
 * from D — which is how Keep As Written finds a home for the riff's notes as they are;
 * harmonic minor is not a rotation of anything and takes the minor home. `turn` is the
 * chord a phrase's turnaround lands on: the dominant in major and minor, the mode's own
 * colour chord elsewhere (dorian's IV, phrygian's flat II, mixolydian's flat VII …).
 */
export const MODE_INFO = Object.freeze({
  major: { label: 'major', minor: false, ionian: 0, turn: 'V' },
  minor: { label: 'minor', minor: true, ionian: 9, turn: 'V' },
  dorian: { label: 'dorian', minor: true, ionian: 2, turn: 'IV' },
  phrygian: { label: 'phrygian', minor: true, ionian: 4, turn: 'II' },
  lydian: { label: 'lydian', minor: false, ionian: 5, turn: 'II' },
  mixolydian: { label: 'mixolydian', minor: false, ionian: 7, turn: 'VII' },
  harmonic: { label: 'harmonic minor', minor: true, ionian: null, turn: 'V' },
});

/**
 * The key the banger is in. It is on the riff's own home note unless Home moves it; what
 * changes is the mode, and the riff's notes only if asked:
 *
 *   to         keep, or a home note — everything, the riff included, moves there by the
 *              shorter way (never more than a tritone)
 *   mode       keep, or any of MODE_INFO, on that home
 *   riffNotes  keep — the riff's notes never move. The mode is in the CHORDS: the
 *                mode's own chords wherever the riff sits on them, and the riff's own
 *                chords borrowed wherever it plays the note the mode changes (an A-minor
 *                riff's F, in A dorian), so nothing clashes. The riff's melodic moves —
 *                sequences, the third below — stay in its own scale.
 *              fit — the riff's notes move into the mode, degree by degree (A dorian:
 *                every F becomes F#), and everything is in the mode.
 *              relative — only ever from a banger made with the old Key switch: Major
 *                or Minor as the RELATIVE key (A minor's notes from C), as it was.
 *
 * With mode keep, a riff too short to say which of a relative pair it means is given
 * the one the mood leans to — unless its first bass note has said where home is.
 *
 * Returns `{ tonic, mode, minor, scale, melodyScale, own, remap, transpose }`: `scale` is
 * the mode's (the chords'), `melodyScale` the scale the riff's lines move in, `own` the
 * riff's own key when its chords may be borrowed, `remap` the scale pair the riff's notes
 * move between (null when they do not).
 */
export function chooseKey(detected, { mode = 'keep', riffNotes = 'keep', to = 'keep' } = {}, preferMinor = false, homePc = null) {
  let tonic = detected.tonic;
  let name = detected.minor ? 'minor' : 'major';
  let remap = null;
  let own = null;
  if (mode === 'keep') {
    if (detected.confidence < 0.04 && detected.minor !== preferMinor && homePc !== tonic) {
      const r = relativeKey({ tonic, minor: detected.minor });
      tonic = r.tonic;
      name = r.minor ? 'minor' : 'major';
    }
  } else if (riffNotes === 'fit') {
    remap = { from: scaleOf(tonic, name), to: scaleOf(tonic, mode) };
    name = mode;
  } else if (riffNotes === 'relative') {
    const parent = (tonic - MODE_INFO[name].ionian + 12) % 12;
    tonic = (parent + (MODE_INFO[mode].ionian ?? MODE_INFO.minor.ionian)) % 12;
    name = mode;
  } else {
    if (mode !== name) own = name;
    name = mode;
  }
  let transpose = 0;
  if (to && to !== 'keep' && NAMES.includes(to)) {
    const d = (NAMES.indexOf(to) - tonic + 12) % 12;
    transpose = d > 6 ? d - 12 : d;
    tonic = NAMES.indexOf(to);
  }
  const scale = scaleOf(tonic, name);
  const ownKey = own ? { tonic, mode: own, minor: MODE_INFO[own].minor, scale: scaleOf(tonic, own) } : null;
  return {
    tonic, mode: name, minor: MODE_INFO[name].minor, scale, melodyScale: ownKey ? ownKey.scale : scale, own: ownKey, remap, transpose,
  };
}
export const keyName = (key) => `${NAMES[key.tonic]} ${MODE_INFO[key.mode]?.label ?? (key.minor ? 'minor' : 'major')}`;

/**
 * The riff's tuned parts in the banger's key: moved into the mode degree by degree when
 * the key says so (a note outside the old scale — a passing chromatic — stays put), then
 * transposed to the new home. Drums never move. Returns `{ parts, moved, notes }`:
 * how many of the riff's notes the MODE moved (not the transposition), out of how many.
 */
export function transformParts(parts, key) {
  if (!key.remap && !key.transpose) return { parts, moved: 0, notes: 0 };
  let moved = 0;
  let notes = 0;
  const fn = (m) => {
    let x = m;
    if (key.remap) {
      const d = key.remap.from.indexOf(((m % 12) + 12) % 12);
      if (d >= 0) {
        let delta = key.remap.to[d] - key.remap.from[d];
        if (delta > 6) delta -= 12;
        if (delta < -6) delta += 12;
        if (delta) moved++;
        x += delta;
      }
      notes++;
    }
    return x + key.transpose;
  };
  const out = parts.map((p) => {
    if (p.kind === 'drum') return p;
    const parsed = p.parsed.map((bar) => mapPitches(bar, fn));
    const names = parsed.flatMap((bar) => bar.notes.filter((v) => v != null).flatMap((v) => (Array.isArray(v) ? v : [v])));
    const meanPitch = names.length ? names.reduce((s, x) => s + midi(x), 0) / names.length : p.meanPitch;
    return { ...p, parsed, meanPitch };
  });
  return { parts: out, moved, notes };
}

/** Does every tone of a chord sit in the scale? */
export const fitsScale = (sym, scale) => parseChord(sym).pcs.every((pc) => scale.includes(pc));

// ---------------------------------------------------------------- numerals
const ROMAN = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
/**
 * A numeral as a chord symbol in `key`: 'VI' in D minor → 'A#', 'iv9' → 'Gm9', 'bII' → 'D#'.
 * Upper case is major, lower case minor; the degree is counted on the key's own scale,
 * so III in a minor key is the flat third, as anyone reading a chart expects.
 */
export function romanChord(numeral, key) {
  const m = /^(b|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/.exec(numeral);
  if (!m) throw new Error(`not a numeral: ${numeral}`);
  const acc = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
  const deg = ROMAN[m[2].toUpperCase()];
  const minor = m[2] === m[2].toLowerCase();
  const root = (key.scale[deg] + acc + 12) % 12;
  const suffix = m[3] || '';
  let quality;
  if (!suffix) quality = minor ? 'm' : '';
  else if (minor) quality = { 9: 'm9', 7: 'm7', add9: 'madd9', 6: 'm6' }[suffix] ?? `m${suffix}`;
  else quality = suffix;
  return chordSym(root, quality);
}

/** The key's own triads (no diminished or augmented ones), plus the major V natural minor borrows. */
export function diatonicChords(key) {
  const out = [];
  const s = key.scale;
  for (let d = 0; d < 7; d++) {
    const third = (s[(d + 2) % 7] - s[d] + 12) % 12;
    const fifth = (s[(d + 4) % 7] - s[d] + 12) % 12;
    if (fifth !== 7) continue;
    out.push(chordSym(s[d], third === 3 ? 'm' : ''));
  }
  // Only NATURAL minor borrows the major V — harmonic minor has it already, and dorian or
  // phrygian with a borrowed leading note would stop sounding like themselves.
  if (key.mode === 'minor') out.push(chordSym(s[4], ''));
  return [...new Set(out)];
}

/** The plain triad under a coloured chord: 'Dm9' → 'Dm', 'A#maj9' → 'A#'. */
export function triadOf(sym) {
  const { root, ivs } = parseChord(sym);
  return chordSym(root, ivs.includes(3) ? 'm' : '');
}

/**
 * How well a chord fits a bar's weights, -0.6..1: the share sounding inside it, less
 * most of the share sounding outside. A bass on the root is worth a little more.
 */
export function chordFit({ w, bassPc }, sym) {
  const total = w.reduce((s, x) => s + x, 0);
  if (!total) return 0;
  const { root, pcs } = parseChord(sym);
  let inside = 0; let outside = 0;
  for (let pc = 0; pc < 12; pc++) (pcs.includes(pc) ? (inside += w[pc]) : (outside += w[pc]));
  return (inside - 0.6 * outside) / total + (bassPc === root ? 0.15 : 0) - (bassPc != null && !pcs.includes(bassPc) ? 0.2 : 0);
}

/** The best chord for some weights from `candidates`, each with an optional bonus. */
export function bestChord(weights, candidates, bonus = {}) {
  let best = null;
  for (const sym of candidates) {
    const score = chordFit(weights, sym) + (bonus[sym] || 0);
    if (!best || score > best.score + 1e-9) best = { sym, score };
  }
  return best;
}

/** A part with only one half of the bar left in it. */
export function halfOf(part, half) {
  if (!part || isDrumPart(part)) return part;
  const lo = half * 8;
  return {
    notes: part.notes.map((v, i) => (i >= lo && i < lo + 8 ? v : null)),
    lens: part.lens.map((l, i) => (i >= lo && i < lo + 8 ? l : null)),
  };
}

/**
 * The chord a bar sits on — or the two it sits on, when its halves clearly walk from one
 * to another (an arpeggio over Am then F). `weightsOf(half)` gives a bar's weights, the
 * whole bar for null. Split only when each half is all but
 * entirely its own chord's tones, and one of them sits clearly better on its own chord
 * than on the whole bar's — so a melody that merely passes through a note is never split.
 */
export function chordsOfBar(weightsOf, pool, bonus = {}) {
  const whole = bestChord(weightsOf(null), pool, bonus);
  const halves = [weightsOf(0), weightsOf(1)];
  if (!halves.every((w) => w.w.some((x) => x > 0))) return whole?.sym ?? null;
  const best = halves.map((w) => bestChord(w, pool, bonus));
  const fits = best.map((b, h) => chordFit(halves[h], b.sym));
  // How much better a half sits on its own chord than on the whole bar's.
  const gain = Math.max(...halves.map((w, h) => fits[h] - chordFit(w, whole.sym)));
  if (best[0].sym !== best[1].sym && fits.every((f) => f >= 0.8) && gain >= 0.3) {
    return [best[0].sym, best[1].sym];
  }
  return whole?.sym ?? null;
}

/** Weights for one part alone, or for half of it. */
export function partWeights(part, role = 'hook', half = null) {
  if (!part || isDrumPart(part)) return { w: new Array(12).fill(0), bassPc: null };
  if (half == null) return barWeights([{ part, role }]);
  const lo = half * 8;
  const masked = {
    notes: part.notes.map((v, i) => (i >= lo && i < lo + 8 ? v : null)),
    lens: part.lens.map((l, i) => (i >= lo && i < lo + 8 ? l : null)),
  };
  return barWeights([{ part: masked, role }]);
}

/**
 * The riff, listened to: its key as detected, the key the banger will be in, and the
 * chord each riff bar implies (from all its pitched parts — its own bass and chords
 * name their chord far better than a melody can).
 */
export function analyseRiff(parsedParts, options, style) {
  const pitched = parsedParts.filter((p) => p.kind !== 'drum' && p.kind !== 'gesture');
  const bars = parsedParts[0]?.parsed.length || 0;
  const all = new Array(12).fill(0);
  for (let b = 0; b < bars; b++) {
    const weights = barWeights(pitched.map((p) => ({ part: p.parsed[b], role: p.role })));
    weights.w.forEach((x, pc) => { all[pc] += x; });
  }
  // The first bass note and the hook's last note lean the key the way an ear does.
  const firstOf = (p, fromEnd = false) => {
    const order = [...Array(bars).keys()];
    if (fromEnd) order.reverse();
    for (const b of order) {
      const steps = [...Array(16).keys()];
      if (fromEnd) steps.reverse();
      for (const i of steps) {
        const v = p.parsed[b].notes[i];
        if (v != null) return Array.isArray(v) ? v[0] : v;
      }
    }
    return null;
  };
  const total = all.reduce((s, x) => s + x, 0) || 1;
  const lowest = pitched.filter((p) => p.role === 'bass').sort((x, y) => (x.meanPitch ?? 0) - (y.meanPitch ?? 0))[0];
  // A riff's first bass note is nearly always home — every remix here was written that
  // way, and every cabinet song starts a section on its tonic — so it counts for half
  // again as much as everything else put together leans elsewhere.
  const firstBass = lowest && firstOf(lowest);
  if (firstBass) all[pcOf(firstBass)] += total * 0.5;
  const hook = pitched.find((p) => p.role === 'hook');
  const lastHook = hook && firstOf(hook, true);
  if (lastHook) all[pcOf(lastHook)] += total * 0.1;
  const detected = detectKey(all);
  const mood = style.moods[options.mood] || {};
  const key = chooseKey(detected, options, !!mood.preferMinor, firstBass ? pcOf(firstBass) : null);
  // The riff in the banger's key — moved into the mode and/or to the new home when asked.
  // Everything from here on (its chords, the hook, the parts built over it) hears these.
  const { parts, moved, notes } = transformParts(parsedParts, key);
  const tPitched = parts.filter((p) => p.kind !== 'drum' && p.kind !== 'gesture');
  // The mode's own chords — and, when the riff keeps notes the mode does not have, the
  // riff's own key's chords too, to borrow wherever it plays them.
  const modeChords = diatonicChords(key);
  const candidates = key.own ? [...new Set([...modeChords, ...diatonicChords(key.own)])] : modeChords;
  const tonicChord = chordSym(key.tonic, key.minor ? 'm' : '');
  const riffChords = Array.from({ length: bars }, (_, b) => {
    const of = (half) => barWeights(tPitched.map((p) => ({ part: half == null ? p.parsed[b] : halfOf(p.parsed[b], half), role: p.role })));
    return chordsOfBar(of, candidates, { [tonicChord]: b === 0 ? 0.12 : 0.04 }) ?? tonicChord;
  });
  const hasHarmony = pitched.some((p) => p.role === 'bass' || p.role === 'chords');
  return { detected, key, candidates, modeChords, tonicChord, riffChords, hasHarmony, parts, moved, notes };
}
