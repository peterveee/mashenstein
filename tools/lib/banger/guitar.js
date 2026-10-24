// MAKE A BANGER — GUITARS. 24 Oct 2026.
//
// Two things, both drawn only from Ways Era 5 (ways.js WAYS_ERA), so a kept banger — a Lab song
// made again from its recipe every time it plays, a desk take re-made from its options — comes
// out exactly as it did:
//
// 1. GUITAR CHORDS STRUM (Peter: "any guitar chords should have a strum option built in, e.g.
//    nylon classical for Shibuya-kei"). A part that plays CHORDS — more than one note to a hit,
//    most of the time — on a guitar preset (isGuitarVoice) gets the lane's Note FX Guitar
//    voicing (six-string shapes) and a Strum, in the style's feel (`guitarStrum`, below). Written
//    after the sounds are chosen, so the style's own sound, a mood's, a Random pick, a flavour's
//    and a fusion's are all covered alike. A Note FX setting the lane already has — a seed
//    channel's, the riff's own — is somebody's choice and is left exactly as it is. A chord part
//    on anything that is not a guitar gets none. It is an ordinary lane setting, merged as
//    expression.js merges a slide, and editable on the desk afterwards.
//
// 2. THE STRUMMED FUNK GUITAR (Guitar: Picked / Strummed / Random, options.js). Where a style or
//    a mood plays a funk or disco guitar on the ARP — single notes, picked — a take can play it
//    Chic-style instead: accented chord stabs on a funk guitar on the arp's lane, and muted chucks
//    on a second lane between them, one strumming hand across the two. Each lane strums
//    Alternate-Down (src/engine/note-fx.js), which flips on every chord STRIKE in the lane and
//    starts each bar on a down-stroke — so a lane's strike k in a bar must fall on a step whose
//    parity is k % 2: down-strokes on the eighths, up-strokes on the sixteenths between. The
//    hand patterns below are written that way and checked when this file loads; the chucks fill
//    the sixteenths the stabs leave, keeping their own lane's parity, and a sixteenth that would
//    break it is an air stroke. The voicings are compact top-four-string shapes of the banger's
//    own chords — the third and the seventh, a ninth or a thirteenth where the key has it, the
//    root left out when there is enough without it — one note to a string, as FRPP-6 gives a
//    note the highest string whose open pitch is at or below it (src/engine/frpp6/dsp.js).
//
// Browser-safe: no `node:*` imports.
import { VOICES } from '../../../src/data/voices.js';
import { parseChord, withQuality, midi, nameOf, blank, isDrumPart } from './theory.js';
import { BANGER_SOUNDS } from './sounds.js';
import { resolveSounds } from './sound-rules.js';
import { styleFor } from './styles/index.js';

// ---------------------------------------------------------------- which presets are guitars
/**
 * THE GUITAR RULE. A preset is a guitar if it is one of these — the FRPP-6 guitars and the
 * catalogue's other guitars on MRDR-3 and RMND-7 — or, for a preset added since or a song's own
 * copy of one, if it is a tone whose name says Guitar and is not a bass. Harps, kotos, kalimbas,
 * dulcimers, the sitar and the bowed strings are plucked or struck strings, not guitars, and the
 * bass guitars play bass lines, not chords.
 */
export const GUITAR_PRESETS = Object.freeze([
  // FRPP-6
  'frppNylon', 'frppNylonShimmer', 'frppSteelAcoustic', 'frppSteelAcousticShimmer', 'frppTwelveString',
  'frppCleanElectric', 'frppCleanElectricShimmer', 'frppElectricNeck', 'frppElectricBridge',
  'frppFunkRhythm', 'frppFunkBright', 'frppFunkMuted', 'frppPalmMuted', 'frppSlideGuitar', 'frppBanjo', 'frppMandolin',
  // MRDR-3
  'mrdrAcousticGuitar', 'mrdrWahGuitar', 'mrdrFunkGuitar', 'mrdrFunkGuitarMuted',
  // RMND-7
  'rm7NylonGuitar', 'rm7SteelAcoustic', 'rm7JazzGuitar', 'rm7CleanElectric', 'rm7GuitarHarmonics', 'rm7TremoloGuitar',
]);
const GUITAR_SET = new Set(GUITAR_PRESETS);
/** Plucked and struck strings that are not guitars, by name — what the name rule never lets in. */
const NOT_A_GUITAR = /\b(harp|koto|kalimba|thumb piano|dulcimer|sitar|tanpura|erhu|violin|cello|string section|bass)\b/i;

/** Is this preset (an id, or a voice object — a song's own copy) a guitar? See GUITAR_PRESETS. */
export function isGuitarVoice(voice) {
  const v = typeof voice === 'string' ? VOICES[voice] : voice;
  if (!v || (v.kind && v.kind !== 'tone')) return false;
  const id = typeof voice === 'string' ? voice : v.id;
  if (id && GUITAR_SET.has(id)) return true;
  if (v.category === 'Bass' || NOT_A_GUITAR.test(`${v.label || ''} ${id || ''}`)) return false;
  return /\bguitar\b/i.test(v.label || '');
}

/** The funk and disco guitars — a picked arp on one of these is a funk guitar part, whatever the style. */
export const FUNK_GUITARS = Object.freeze(['frppFunkRhythm', 'frppFunkBright', 'frppFunkMuted', 'mrdrWahGuitar', 'mrdrFunkGuitar', 'mrdrFunkGuitarMuted']);

// ---------------------------------------------------------------- 1. guitar chords strum
/**
 * How a style's guitar chords are strummed (a recipe's `guitarStrum`): `direction` as Note FX
 * names it, the gap between strings in ms, and the up-strokes' trim on an Alternate strum.
 * Unset, a gentle down-strum.
 */
export const GUITAR_STRUM_DEFAULT = Object.freeze({ direction: 'down', gapMs: 14 });
const ALTERNATE = new Set(['alternate-up', 'alternate-down']);

/** The Note FX a guitar chord part is given in `style`: `{ guitar, strum }`, whole, as the desk writes them. */
export function chordStrumFx(style) {
  const feel = { ...GUITAR_STRUM_DEFAULT, ...(style?.guitarStrum || {}) };
  const alternate = ALTERNATE.has(feel.direction);
  return {
    guitar: { enabled: true, style: 'auto', position: 0 },
    strum: { enabled: true, direction: feel.direction, gapMs: feel.gapMs, downDb: 0, upDb: alternate ? (feel.upDb ?? -3) : 0 },
  };
}

/** The notes a hit holds, as distinct names. */
const tonesOf = (v) => (v == null ? [] : [...new Set(Array.isArray(v) ? v : [v])]);

/**
 * Does a part play CHORDS? `parts` are its bars (`{ notes, lens }`, null where it rests): at
 * least two hits of more than one note, and those at least half of all its hits. A melody with
 * the odd double-stop, an arp, a bass are not.
 */
export function playsChords(parts) {
  let hits = 0; let chords = 0;
  for (const part of parts || []) {
    if (!part || isDrumPart(part)) continue;
    for (const v of part.notes) {
      if (v == null) continue;
      hits++;
      if (tonesOf(v).length > 1) chords++;
    }
  }
  return chords >= 2 && chords * 2 >= hits;
}

/** The sound a lane of a mix plays: its song copy, else the library preset it names. */
const laneVoice = (mix, lane) => mix?.voiceParams?.[`${lane}Voice`] || mix?.voice?.[`${lane}Voice`] || null;

/**
 * Feature 1, on a finished mix: every lane playing chords on a guitar gets the style's strum and
 * the six-string voicing, merged into the Note FX it has — a `guitar` or a `strum` already there
 * stays as it is. `barsOf(lane)` gives a lane's bars. `skip`: lanes not to touch (the strummed
 * funk guitar's, which strum their own way and are voiced by hand). Returns the lanes given one.
 */
export function strumGuitarChords({ mix, lanes, barsOf, style, skip = new Set() }) {
  const fx = chordStrumFx(style);
  const applied = [];
  for (const lane of lanes) {
    if (skip.has(lane) || !mix.lanes?.[lane]) continue;
    if (!isGuitarVoice(laneVoice(mix, lane)) || !playsChords(barsOf(lane))) continue;
    const strip = mix.lanes[lane];
    const now = strip.noteFx || {};
    const add = {};
    if (!now.guitar) add.guitar = structuredClone(fx.guitar);
    if (!now.strum) add.strum = structuredClone(fx.strum);
    if (!Object.keys(add).length) continue;
    strip.noteFx = { ...now, ...add };
    applied.push(lane);
  }
  return applied;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/**
 * The same, as a lane's SOUND changes under a finished song (the Lab club's sound swaps): the lane's
 * Note FX as the song has it (`base`), with the style's guitar strum put on if the new sound is a
 * guitar on a chord part, or taken off if not. Only a setting that is the generator's own (equal to
 * chordStrumFx) moves; anything else in it — a seed's, the riff's — is left as it was. Returns the
 * new Note FX, or undefined for none.
 */
export function restrumNoteFx(base, { voice, chords, style }) {
  const fx = chordStrumFx(style);
  const out = { ...(base || {}) };
  const on = chords && isGuitarVoice(voice);
  for (const key of ['guitar', 'strum']) {
    if (out[key] && !same(out[key], fx[key])) continue;
    if (on) out[key] = structuredClone(fx[key]); else delete out[key];
  }
  return Object.keys(out).length ? out : undefined;
}

// ---------------------------------------------------------------- 2. the strummed funk guitar
/**
 * The strumming hand, one bar of sixteenths: `X` a stab of the stab guitar two sixteenths long,
 * choked; `x` one a sixteenth long; `.` a sixteenth the chucks may take; `-` an air stroke kept
 * clear. The stabs alternate down and up by themselves (checked below).
 */
export const FUNK_HANDS = Object.freeze({
  //          1 e & a 2 e & a 3 e & a 4 e & a
  classic: 'X..X....X..X..X.', // the one, the a of one, three, the a of three, the & of four
  push: 'XX....X....XX...', // the one and its e, the & of two, the a of three into four
  sparse: 'X......X..X.....', // the one, the a of two, the & of three — room for the tune
  busy: 'X..X..XX..X..XX.', // every three sixteenths and the pushes — the last chorus
  threes: 'X..X..X..X..X..X', // stabs every three sixteenths across the bar
  chops: '..X..X....X..X..', // the & of one, the a of two, the & of three, the a of four
});
/**
 * How many chucks a section takes between the stabs: every sixteenth that keeps the hand
 * (`full`), a down-and-up pair at most on beats two and four (`light`), or none — the stabs
 * alone (`none`). `beats` the beats they may fall in (0–3), `perBeat` how many in one.
 */
export const CHUCK_DENSITIES = Object.freeze({
  full: Object.freeze({ beats: Object.freeze([0, 1, 2, 3]), perBeat: 4 }),
  light: Object.freeze({ beats: Object.freeze([1, 3]), perBeat: 2 }),
  none: Object.freeze({ beats: Object.freeze([]), perBeat: 0 }),
});

/** Does every strike k of `steps` (a lane's strikes in a bar, in order) fall on a step of parity k % 2? */
export const keepsTheHand = (steps) => steps.every((s, k) => s % 2 === k % 2);

/**
 * A hand pattern as the two guitars' bars: the stabs `[[step, len]]` and the chucks `[step]`,
 * filled greedily round the stabs at `density`, each lane alternating from a down-stroke.
 */
export function handBar(pattern, density = 'full') {
  if (pattern.length !== 16) throw new Error(`a hand pattern needs sixteen steps: ${pattern}`);
  const { beats, perBeat } = CHUCK_DENSITIES[density] || CHUCK_DENSITIES.full;
  const stabs = []; const chucks = [];
  const inBeat = [0, 0, 0, 0];
  let want = 0;
  [...pattern].forEach((c, i) => {
    const beat = i >> 2;
    if (c === 'X') stabs.push([i, 2]);
    else if (c === 'x') stabs.push([i, 1]);
    else if (c === '.' && beats.includes(beat) && inBeat[beat] < perBeat && i % 2 === want) { chucks.push(i); inBeat[beat]++; want ^= 1; }
  });
  if (!keepsTheHand(stabs.map(([s]) => s))) throw new Error(`hand ${pattern}: the stabs do not alternate down and up`);
  if (!keepsTheHand(chucks)) throw new Error(`hand ${pattern}: the chucks do not alternate down and up`);
  return { stabs, chucks };
}
// Every hand at every density, checked once, here: a pattern that breaks the hand never ships.
for (const pat of Object.values(FUNK_HANDS)) for (const d of Object.keys(CHUCK_DENSITIES)) handBar(pat, d);

/**
 * The PATTERN SETS a take draws one of: which hands its sections play, and its stab sound.
 * `main` cycles bar by bar through the drops, choruses and grooves (and the verses and intros,
 * with lighter chucks); `peak` through the last of them; `quiet` through a breakdown or middle 8.
 * A build plays `main` with no chucks — the stabs alone.
 */
export const FUNK_SETS = Object.freeze([
  Object.freeze({ id: 'goodTimes', label: 'Good Times', stab: 'frppFunkRhythm', main: ['classic', 'push'], peak: ['classic', 'busy'], quiet: ['sparse'] }),
  Object.freeze({ id: 'threes', label: 'Threes', stab: 'frppFunkRhythm', main: ['threes', 'classic'], peak: ['threes', 'busy'], quiet: ['sparse'] }),
  Object.freeze({ id: 'chops', label: 'Chops', stab: 'frppFunkBright', main: ['chops', 'push'], peak: ['chops', 'busy'], quiet: ['chops'] }),
  Object.freeze({ id: 'busy', label: 'Busy Hands', stab: 'frppFunkBright', main: ['busy', 'classic'], peak: ['busy'], quiet: ['sparse'] }),
]);
/** The chucks' guitar, palm-muted (its own lane: FRPP's CHUCK control needs velocity, which is parked). */
export const FUNK_CHUCK = 'frppFunkMuted';
/** Every preset the strummed part plays — what tools/banger-levels.js `curves` measures for it. */
export const FUNK_SOUNDS = Object.freeze([...new Set([...FUNK_SETS.map((s) => s.stab), FUNK_CHUCK])]);

/** The two lanes' strums: Alternate-Down, the up-strokes 4 dB under, a tight gap. */
export const FUNK_STRUM = Object.freeze({
  stab: Object.freeze({ enabled: true, direction: 'alternate-down', gapMs: 7, downDb: 0, upDb: -4 }),
  chuck: Object.freeze({ enabled: true, direction: 'alternate-down', gapMs: 6, downDb: 0, upDb: -4 }),
});
/**
 * The two lanes' channels, unless the recipe gives its own (`strips.funkStab`, `strips.funkChuck`):
 * panned apart, a little air on top, a short room. The stabs' fader starts at the style's arp's,
 * which its level reference was set for (levels.js); the chucks ride it (CHUCK_UNDER_DB).
 */
export const FUNK_STRIPS = Object.freeze({
  stab: Object.freeze({ pan: -0.35, eq: Object.freeze({ high: 3 }), send: Object.freeze({ reverb: 0.12 }) }),
  chuck: Object.freeze({ pan: 0.4, eq: Object.freeze({ high: 2.5 }), send: Object.freeze({ reverb: 0.08 }) }),
});
/**
 * How far under the stabs the chucks sit, as heard (dB, the level model's prediction of each part
 * at its fader): AISLE FEVER's balance (stabs −3, chucks −7 on the same two guitars), read back
 * through the model on that remix's own bars — 4.9 dB in its choruses, 3.9 in its groove.
 */
export const CHUCK_UNDER_DB = -4.5;

/**
 * Where a take can play the strummed funk guitar, and how often Random does: `{ chance }`, or null
 * where it cannot. Only where the arp is a guitar (`arpSound`), and only in a funk or disco style
 * (a recipe's `funkGuitar.strummed`), a funk or disco mood (FUNK_MOODS), or — leaning Picked — over
 * a funk guitar's arp anywhere else (Mystery's).
 */
export const FUNK_MOODS = Object.freeze({ disco: 0.65, funky: 0.6 });
export const ELSEWHERE_STRUMMED = 0.3;
export function funkGuitarChance({ style, mood, arpSound }) {
  if (!isGuitarVoice(arpSound)) return null;
  const own = style?.funkGuitar?.strummed;
  if (Number.isFinite(own)) return { chance: own };
  if (Number.isFinite(FUNK_MOODS[mood])) return { chance: FUNK_MOODS[mood] };
  return FUNK_GUITARS.includes(typeof arpSound === 'string' ? arpSound : arpSound?.id) ? { chance: ELSEWHERE_STRUMMED } : null;
}

/**
 * The take's guitar: `{ strummed, set, stab, chuck, chance, asked }`, or null where there is no funk
 * guitar to play or the request's era is before guitars. `asked` is Guitar: 'random' draws (off its
 * own stream, three numbers every time, so the pattern set never depends on the coin), 'picked'
 * keeps the arp as ever, 'strummed' plays the funk part where there is one.
 */
export function planGuitar({ asked = 'picked', era = 0, style, mood, arpSound, rng }) {
  if (era < GUITAR_ERA) return null;
  const odds = funkGuitarChance({ style, mood, arpSound });
  const draws = rng ? [rng.next(), rng.next()] : [1, 0];
  if (!odds) return null;
  const strummed = asked === 'strummed' || (asked === 'random' && draws[0] < odds.chance);
  const set = FUNK_SETS[Math.min(FUNK_SETS.length - 1, Math.floor(draws[1] * FUNK_SETS.length))];
  return { strummed, asked, chance: odds.chance, set: set.id, stab: set.stab, chuck: FUNK_CHUCK };
}
/** The Ways Era the guitars arrive in (ways.js WAYS_ERA). */
export const GUITAR_ERA = 5;

/**
 * Has Guitar anything to choose in `recipe` (a style, flavour, Sound Set or fusion, or its id) and `mood`?
 * Its arp — or one Part Sounds can roll the arp to — is a funk guitar part (funkGuitarChance). The desk
 * dims the switch where it has not.
 */
export function guitarOffered(recipe, mood, table = BANGER_SOUNDS) {
  const st = typeof recipe === 'string' ? styleFor(recipe) : recipe;
  if (!st) return false;
  let sounds;
  try { sounds = resolveSounds(table, st.id, mood); } catch { return false; }
  return [sounds.parts?.arp, ...(sounds.choices?.arp || [])].some((id) => !!funkGuitarChance({ style: st, mood, arpSound: id }));
}

// ---- the voicings
/** Standard tuning's top four strings, as the notes each can take here: D3, G3, B3, and E4 up to C5. */
export const FUNK_ZONES = Object.freeze([Object.freeze([50, 54]), Object.freeze([55, 58]), Object.freeze([59, 63]), Object.freeze([64, 72])]);
/** The string a note goes to (FRPP-6, standard tuning): the highest whose open pitch is at or below it. */
const OPEN = [40, 45, 50, 55, 59, 64];
export const stringOf = (m) => OPEN.filter((o) => o <= m).length - 1;
/** Does a chord put at most one note on each string? */
export const oneNotePerString = (names) => {
  const s = names.map((n) => stringOf(midi(n)));
  return s.every((x) => x >= 0) && new Set(s).size === s.length;
};

/** A funk guitarist's colour on a chord: a ninth, a dominant's thirteenth — where the key has it. */
const EXTEND = Object.freeze({ '': 'add9', m: 'madd9', 7: '9', 9: '13', m7: 'm9', maj7: 'maj9', 6: '6add9' });
export function funkChord(sym, fits = () => true) {
  const q = parseChord(sym).quality;
  const ninth = EXTEND[q] ? withQuality(sym, EXTEND[q]) : null;
  if (!ninth || !fits(ninth)) return sym;
  // A dominant seventh goes on past its ninth to the thirteenth, the funk chord, where the key has it.
  if (q === '7' && fits(withQuality(sym, '13'))) return withQuality(sym, '13');
  return ninth;
}

/** What each interval above the root is worth to a funk voicing: the third and seventh most, the root least. */
const WORTH = Object.freeze({ 0: 2, 1: 0, 2: 6, 3: 10, 4: 10, 5: 7, 6: 7, 7: 3, 8: 5, 9: 4, 10: 8, 11: 8 });
/** Every way to pick `k` of the four strings, low to high. */
const STRING_SETS = Object.freeze([1, 2, 3, 4].map((k) => {
  const out = [];
  const walk = (from, picked) => {
    if (picked.length === k) { out.push(picked); return; }
    for (let z = from; z < 4; z++) walk(z + 1, [...picked, z]);
  };
  walk(0, []);
  return out;
}));
/**
 * Every chord of `size` notes on `size` of the top four strings, one note to a string, no pitch class
 * twice, each note's pitch class in `pcs`: `visit(notes)` for each, low to high.
 */
function onStrings(pcs, size, visit) {
  for (const zones of STRING_SETS[size - 1]) {
    const walk = (z, notes, used) => {
      if (z === zones.length) { visit(notes); return; }
      const [lo, hi] = FUNK_ZONES[zones[z]];
      for (let m = lo; m <= hi; m++) {
        const pc = ((m % 12) + 12) % 12;
        if (!pcs.includes(pc) || used.has(pc)) continue;
        notes.push(m); used.add(pc);
        walk(z + 1, notes, used);
        notes.pop(); used.delete(pc);
      }
    };
    walk(0, [], new Set());
  }
}
const voicingMemo = new Map();
/**
 * A compact top-four-string voicing of `sym` near `centre` (MIDI): one note to a string, no pitch
 * class twice, the third (or a sus chord's fourth or second) and any seventh always in. Four notes
 * where the chord has four pitch classes to give, else three — and where the strings cannot give
 * those, the most of them they can.
 */
export function funkVoicing(sym, centre = 60) {
  const key = `${sym}@${centre}`;
  if (voicingMemo.has(key)) return voicingMemo.get(key);
  const { root, pcs } = parseChord(sym);
  const iv = (pc) => (((pc - root) % 12) + 12) % 12;
  const has = new Set(pcs.map(iv));
  const third = has.has(3) || has.has(4);
  const need = [...has].filter((i) => i === 3 || i === 4 || i === 10 || i === 11 || (!third && (i === 5 || i === 2)) || (i === 6 && !has.has(7)));
  const most = Math.min(4, new Set(pcs).size);
  let best = null;
  for (const [size, must] of [[most, need], [most - 1, need], [most, []], [most - 1, []], [2, []]]) {
    if (size < 2) continue;
    onStrings(pcs, size, (notes) => {
      const ivs = notes.map((m) => iv(m % 12));
      if (!must.every((i) => ivs.includes(i))) return;
      const mean = notes.reduce((x, y) => x + y, 0) / notes.length;
      const rubs = notes.slice(1).filter((m, k) => m - notes[k] === 1).length;
      const span = notes[notes.length - 1] - notes[0];
      const score = ivs.reduce((x, i) => x + WORTH[i], 0) - 3 * rubs - 0.4 * Math.abs(mean - centre) - 0.5 * Math.max(0, span - 14);
      if (!best || score > best.score) best = { notes: [...notes], score };
    });
    if (best) break;
  }
  const out = best.notes.map(nameOf);
  voicingMemo.set(key, out);
  return out;
}

/**
 * A chord moved off its shape — a key lift, the way into one — put back on the strings: as many of its
 * own pitch classes as four strings take, one to a string, as near as they go to where they were.
 * A chord already on the strings is left as it is.
 */
export function onTheStrings(names) {
  const ms = [...new Set(names.map(midi))].sort((a, b) => a - b);
  const inReach = (m) => m >= FUNK_ZONES[0][0] && m <= FUNK_ZONES[3][1];
  if (ms.length <= 4 && ms.every(inReach) && oneNotePerString(ms.map(nameOf))) return ms.map(nameOf);
  const pcs = [...new Set(ms.map((m) => ((m % 12) + 12) % 12))];
  let best = null;
  for (let size = Math.min(4, pcs.length); size >= 2 && !best; size--) {
    onStrings(pcs, size, (notes) => {
      const move = notes.reduce((x, m) => x + Math.min(...ms.map((y) => Math.abs(y - m))), 0);
      if (!best || move < best.move) best = { notes: [...notes], move };
    });
  }
  return best ? best.notes.map(nameOf) : ms.slice(-1).map(nameOf);
}

// ---- the bars
const DROPS = new Set(['drop', 'drop2', 'drop3', 'reprise']);
const isPeakish = (s) => DROPS.has(s.role) || s.type === 'chorus' || s.role === 'chorus' || !!s.hook;
/**
 * What a section asks of the hand: `{ cycle, density }`. The drops, choruses and a groove's fullest
 * sections take every chuck (the last of them the `peak` hands); a build its stabs alone; a breakdown
 * or a middle 8 the `quiet` hands with light chucks; anything else — an intro, a verse, a groove on the
 * way up, an outro — the `main` hands with light chucks.
 */
export function funkSection(sec, form, set) {
  const role = sec?.role;
  if (role === 'build' || role === 'build2' || role === 'preChorus') return { cycle: set.main, density: 'none' };
  if (role === 'breakdown' || role === 'middle8') return { cycle: set.quiet, density: 'light' };
  if (sec && isPeakish(sec)) {
    const last = [...form].reverse().find(isPeakish);
    return { cycle: last === sec ? set.peak : set.main, density: 'full' };
  }
  return { cycle: set.main, density: 'light' };
}

const chordAt = (cs, i) => cs[Math.min(cs.length - 1, Math.floor(i / (16 / cs.length)))];
/**
 * One bar of the strummed funk guitar, bar `bar0` (0-based) of the song: `{ stab, chuck }` parts.
 * `chords` are the bar's chords as the band plays them (one, or one per half or quarter);
 * `fits(sym)` says whether a chord stays in the key; `centre` is the arp's (a note name).
 */
export function funkBar(chords, { bar0, form, set: setId, centre = 'A4', fits = () => true }) {
  const set = FUNK_SETS.find((s) => s.id === setId) || FUNK_SETS[0];
  const sec = form.find((x) => x.from - 1 <= bar0 && bar0 <= x.to - 1) || null;
  const { cycle, density } = funkSection(sec, form, set);
  const hand = FUNK_HANDS[cycle[((bar0 - (sec ? sec.from - 1 : 0)) % cycle.length + cycle.length) % cycle.length]];
  const { stabs, chucks } = handBar(hand, density);
  const cs = (Array.isArray(chords) ? chords : [chords]).map((c) => funkChord(c, fits));
  const at = Math.max(57, Math.min(63, midi(centre)));
  const voiced = (i) => funkVoicing(chordAt(cs, i), at);
  const stab = blank(); const chuck = blank();
  for (const [s, len] of stabs) { stab.notes[s] = voiced(s); stab.lens[s] = len; }
  for (const s of chucks) { chuck.notes[s] = voiced(s); chuck.lens[s] = 1; }
  return { stab, chuck };
}

/**
 * The strummed lanes as the song ends up — after key lifts, the ways into them, cuts and overlaid
 * repeats — put right: every chord back on the strings (onTheStrings), and a strike that would
 * break the hand made an air stroke. `bars` are the song's bars by role; `roles` the funk roles.
 */
export function keepTheHand(bars, roles = ['arp', 'chuck']) {
  for (const bar of bars) {
    for (const role of roles) {
      const part = bar[role];
      if (!part || isDrumPart(part)) continue;
      let k = 0;
      for (let s = 0; s < 16; s++) {
        const v = part.notes[s];
        if (v == null) continue;
        const tones = tonesOf(v);
        if (tones.length < 2) continue;
        if (s % 2 !== k % 2) { part.notes[s] = null; part.lens[s] = null; if (part.vels) part.vels[s] = null; continue; }
        part.notes[s] = onTheStrings(tones);
        k++;
      }
    }
  }
}

/**
 * What is wrong with the strummed lanes of a finished song, as readable lines — empty when every
 * strike keeps the hand and every chord has one note to a string. `barsOf(lane)` gives a lane's bars.
 */
export function funkIssues(lanes, barsOf) {
  const out = [];
  for (const lane of lanes) {
    barsOf(lane).forEach((part, b) => {
      if (!part || isDrumPart(part)) return;
      const strikes = [];
      part.notes.forEach((v, s) => {
        const tones = tonesOf(v);
        if (tones.length < 2) return;
        strikes.push(s);
        if (!oneNotePerString(tones)) out.push(`${lane} bar ${b + 1} step ${s}: ${tones.join(' ')} doubles a string`);
      });
      strikes.forEach((s, k) => {
        if (s % 2 !== k % 2) out.push(`${lane} bar ${b + 1}: strike ${k} at step ${s} is a${k % 2 ? 'n up' : ' down'}-stroke on a${s % 2 ? 'n up' : ' down'} sixteenth`);
      });
    });
  }
  return out;
}
