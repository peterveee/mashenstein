// VOLUME AUTOMATION — a line per track that the channel's level follows, and the CUTS
// that stop a track dead at a point.
//
// Two things the per-bar edits in src/data/arrangements.js cannot do, and the reason
// this exists beside them rather than inside them:
//
//   · A bar's GAIN belongs to the NOTE. Anything struck in a trimmed bar keeps that
//     bar's level for as long as it rings, by design — so a trim cannot fade a note
//     that is already sounding, and a long pad cannot be brought down under itself.
//   · A bar's MUTE stops new notes. Whatever was already ringing rings on, which is
//     exactly the tail you wanted to cut.
//
// Both answers need something that acts on the CHANNEL and moves under a note that is
// still sounding. That is this file.
//
// ---- THE FORMAT -----------------------------------------------------------------
//
// On an arrangement entry, beside `order`, `loop` and `choke`:
//
//   automation: {
//     pad:  { points: [[9, 0, 0], [13, 0, null, "even"]], cuts: [[14, 6]] },
//     lead: { points: [[9, 0, null], [13, 0, 0, "equal"]] },
//   }
//
// A POINT is `[bar, step, db, shape]`:
//
//   bar    counted from 1, the way the timeline counts
//   step   the sixteenth inside that bar, from 0 — fractional on a finer grid, so
//          8.5 is the 1/32 after the third beat
//   db     the level there, relative to the fader: 0 is "as mixed", -6 is six under
//          it, and `null` is SILENCE. Null rather than -Infinity because the song
//          files are written through JSON, which has no infinity and would write null
//          anyway — so null is what it means on the way back in, said once, here.
//   shape  how the line ARRIVES at this point from the one before it (see SHAPES).
//          Absent means `even`. Meaningless on the first point, which nothing arrives at.
//
// The line HOLDS between and beyond its points, the way a DAW's automation lane does:
// before the first point the track sits at that point's level, after the last it stays
// at the last one's.
//
// A FADE made on the desk (`setLaneFade`) is pinned at BOTH ends, so it changes the bars
// it was drawn over and no others, whatever kind of fade it is. The bars before it keep
// the level the line already gave them, and so do the bars after it: the fade starts
// from its own level on its first bar and the line goes back to what it was on the bar
// after its last — a step at either end where the two differ. A fade-in from silence
// over bars 45–49 of a track that plays from bar 1 is that track at full level for 44
// bars, silent on the downbeat of 45 and full again by 50; a fade-out over bars 9–12 is
// full again on bar 13. A track meant to STAY out after a fade-out is muted there — the
// fade does not decide that for the bars it was not drawn over.
//
// Two points at the SAME position are a step: the first is where the line arrives from
// the left, the second where it leaves to the right. Order inside the stored list is
// what says which is which, so it is preserved exactly.
//
// A CUT is `[bar, step]`. It is a choke: whatever the track has ringing at that point
// stops, and the next note it plays sounds normally. Nothing to reopen. The engine does
// it by routing the notes struck before the cut through a door that closes on it and
// the notes after it through a fresh one — see `_cutLane` in src/engine/audio.js.
//
// Echo and reverb already sent to the SHARED returns ring on through a cut: those are
// every channel's, and a cut on one track cannot reach into them. The channel's OWN delay
// inserts are emptied — what is in their lines is held silent until it has passed, and a
// note struck on the cut keeps its repeats (see `flushEchoes` in src/engine/mixer.js).
// Its own reverb inserts are left alone: a room cannot be emptied, only muted, and a
// muted room would take the next note's reverb with it.
//
// EFFECT SECTIONS — `fx` on a lane — are the third thing, and the one that is not about
// level: a stretch of the song that plays through an effect chain of its own.
//
//   bass:     { fx: [{ from: [16, 12], to: [17, 0], chain: [{ id: 'stutter', params: {…} }] }] },
//   __master: { fx: [{ from: [24, 0], to: [25, 0], chain: [{ id: 'distortion', params: {…} }] }] },
//
// `from` and `to` are places like a point's, so a section can start on any sixteenth (or
// between two, on a finer grid) and runs up to `to`, not including it. They are the finer
// form of the per-bar `inlineFx` snapshot on an order entry, which can only switch at a bar
// line; the desk writes sections now, and a bar's `inlineFx` plays wherever no section
// covers it. On a TRACK the chain runs in front of the channel — before the fader, the
// pan, the EQ and the channel's own inserts — exactly where a bar's snapshot does. The lane
// key `__master` is the whole mix, after the master's inserts and before the limiter, and
// sections are the only thing the master's lane can carry: it has no level line or cuts.
//
// A section's END lets its chain ring out — what is already in an echo or a room is not
// cut off — and its START is an event of its own: a Stutter grabs its slice there, so two
// sections side by side with the same chain are two grabs, where one longer one is one.
//
// Absent — no `automation` key, or a lane with no points, cuts or sections — is every song
// that has not asked, and plays exactly as it did before this file existed.

import { groupIdOf, isGroupKey, GROUP_BY_ID } from './group-buses.js';

/** The shapes a segment can take, in the order the desk offers them. */
export const AUTOMATION_SHAPES = Object.freeze(['even', 'equal', 's']);

/** What each shape is called on screen. */
export const AUTOMATION_SHAPE_NAMES = Object.freeze({
  even: 'Even',
  equal: 'Equal-power',
  s: 'S-curve',
});

/** What each shape is for, in one line — the dropdown's tooltip. */
export const AUTOMATION_SHAPE_NOTES = Object.freeze({
  even: 'A straight line in dB: the ear hears it fall (or rise) at one steady rate',
  equal: 'Sine and cosine: two tracks crossfading on it keep the same loudness through the middle',
  s: 'Eases in and out at both ends — a swell rather than a slope',
});

/**
 * How far down an EVEN or S-curve fade travels in dB before it lets go to silence.
 *
 * A straight line in dB never reaches silence, so it has to be told where to stop:
 * -48 is the floor of the desk's meters, and it is inaudible under anything else in a
 * mix. A fade to silence walks to -48 along the curve and is silent at its end point.
 */
export const AUTOMATION_FLOOR_DB = -48;

/** The loudest a point may ask for. The fader's own ceiling. */
export const AUTOMATION_MAX_DB = 6;

/** Sixteenths in a bar — the unit every position below is counted in. */
const BAR = 16;

/** The lane key that means the whole mix — the name Audio.rampMix already uses for it. */
export const MASTER_KEY = '__master';

/**
 * A BUS's lane: the master's, or one of the four group buses' (`__group:group1`, see
 * src/data/group-buses.js). A bus lane carries effect SECTIONS and nothing else — nothing
 * in the engine plays a level line or a cut on a bus — and it is not a track.
 */
export const isBusKey = (key) => key === MASTER_KEY || !!groupIdOf(key);

/** The most effects one section's chain can hold: an insert strip's six. */
const SECTION_MAX = 6;

const EPS = 1e-6;
const tidyNumber = (n) => Math.round(n * 1e6) / 1e6;

/** A `[bar, step]` as sixteenths from the top of the song. */
export const posOf = (bar, step = 0) => tidyNumber((bar - 1) * BAR + (Number(step) || 0));

/** Sixteenths from the top as `[bar, step]` — the stored form. */
export function barStepOf(pos) {
  const p = Math.max(0, tidyNumber(pos));
  const bar = Math.floor(p / BAR + EPS);
  return [bar + 1, tidyNumber(Math.max(0, p - bar * BAR))];
}

/** dB (null for silence) to a linear gain. */
export const dbToLevel = (db) => (db == null || !Number.isFinite(db) ? 0 : 10 ** (db / 20));

/** A linear gain to dB, null for silence. */
export const levelToDb = (g) => (g > 0 ? tidyNumber(20 * Math.log10(g)) : null);

const clampDb = (db) => (db == null || !Number.isFinite(db) ? null
  : Math.min(AUTOMATION_MAX_DB, Math.max(-120, tidyNumber(db))));

const shapeOf = (shape) => (AUTOMATION_SHAPES.includes(shape) ? shape : 'even');

const floorDb = (g) => (g > 0 ? Math.max(AUTOMATION_FLOOR_DB, 20 * Math.log10(g)) : AUTOMATION_FLOOR_DB);

/**
 * The level a segment of this shape is at, a fraction `t` of the way from `g0` to
 * `g1` (both linear gains). The one place the curves are defined — the engine, the
 * desk's drawing and the tests all read them from here.
 */
export function shapeLevel(shape, g0, g1, t) {
  if (!(t > 0)) return g0;
  if (t >= 1) return g1;
  if (Math.abs(g0 - g1) < 1e-9) return g0;
  if (shape === 'equal') {
    // Whichever way the segment goes, the moving half follows a quarter sine, so a
    // track going out on cos and one coming in on sin sum to constant POWER — the
    // crossfade does not dip in the middle the way two straight lines would.
    return g1 < g0
      ? g1 + (g0 - g1) * Math.cos(t * Math.PI / 2)
      : g0 + (g1 - g0) * Math.sin(t * Math.PI / 2);
  }
  const u = shape === 's' ? t * t * (3 - 2 * t) : t;
  const d0 = floorDb(g0);
  const d1 = floorDb(g1);
  return 10 ** ((d0 + (d1 - d0) * u) / 20);
}

// Normalised lanes, memoised on the stored object: the engine asks for one every
// sixteenth, and the stored form is edited only by replacing it.
const CURVES = new WeakMap();

/**
 * One lane's automation as the engine reads it — `{ points, cuts }` with every position
 * in sixteenths from the top, points in their stored order (sorted by position, the
 * order of equal positions kept), each carrying its linear gain.
 */
export function laneCurve(lane) {
  if (!lane || typeof lane !== 'object') return null;
  if (CURVES.has(lane)) return CURVES.get(lane);
  const points = (Array.isArray(lane.points) ? lane.points : [])
    .map((p, i) => {
      if (!Array.isArray(p) || !Number.isFinite(p[0])) return null;
      const db = clampDb(p[2]);
      return { pos: posOf(p[0], p[1]), db, gain: dbToLevel(db), shape: shapeOf(p[3]), i };
    })
    .filter(Boolean)
    .sort((a, b) => a.pos - b.pos || a.i - b.i);
  const cuts = [...new Set((Array.isArray(lane.cuts) ? lane.cuts : [])
    .filter((c) => Array.isArray(c) && Number.isFinite(c[0]))
    .map((c) => posOf(c[0], c[1])))].sort((a, b) => a - b);
  const fx = readFx(lane.fx);
  const curve = { points, cuts, fx };
  CURVES.set(lane, curve);
  return curve;
}

const validChain = (chain) => Array.isArray(chain) && chain.length > 0 && chain.length <= SECTION_MAX
  && chain.every((e) => e && typeof e.id === 'string');

/**
 * Stored sections as the engine reads them: `{ from, to, chain, sig }` in sixteenths,
 * sorted by where they start, the stored order kept between equals. `sig` is the chain as
 * one string — the key the mixer builds a branch under, worked out once here rather than
 * on every sixteenth that asks.
 */
function readFx(list) {
  return (Array.isArray(list) ? list : [])
    .map((s, i) => {
      if (!s || !Array.isArray(s.from) || !Array.isArray(s.to) || !validChain(s.chain)) return null;
      if (!Number.isFinite(s.from[0]) || !Number.isFinite(s.to[0])) return null;
      const from = posOf(s.from[0], s.from[1]);
      const to = posOf(s.to[0], s.to[1]);
      return to > from + EPS ? { from, to, chain: s.chain, sig: JSON.stringify(s.chain), i } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.from - b.from || a.i - b.i);
}

/** True when an automation object asks for anything at all. */
export function hasAutomation(automation) {
  if (!automation || typeof automation !== 'object') return false;
  return Object.values(automation).some((lane) => lane
    && ((lane.points?.length || 0) + (lane.cuts?.length || 0) + (lane.fx?.length || 0)) > 0);
}

/** The lanes that carry points (a level line), cuts, and effect sections. */
export function automatedLanes(automation) {
  const level = [];
  const cut = [];
  const fx = [];
  for (const [key, lane] of Object.entries(automation || {})) {
    if (lane?.points?.length) level.push(key);
    if (lane?.cuts?.length) cut.push(key);
    if (lane?.fx?.length) fx.push(key);
  }
  return { level, cut, fx };
}

/**
 * The effect section playing at `pos`, or null. Sections run from `from` up to `to`; were
 * two ever to overlap, the one that starts later is the one that plays.
 */
export function fxSectionAt(curve, pos) {
  let found = null;
  for (const s of curve?.fx || []) {
    if (s.from > pos + EPS) break;
    if (pos < s.to - EPS) found = s;
  }
  return found;
}

/** Where a section starts or ends strictly inside (from, to) — the switches a window holds. */
export function fxEdgesBetween(curve, from, to) {
  const edges = new Set();
  for (const s of curve?.fx || []) {
    for (const p of [s.from, s.to]) if (p > from + EPS && p < to - EPS) edges.add(p);
  }
  return [...edges].sort((a, b) => a - b);
}

/** True when a section STARTS at `pos` — a fresh grab, even under the same chain. */
export const fxStartsAt = (curve, pos) => (curve?.fx || [])
  .some((s) => Math.abs(s.from - pos) <= EPS);

/**
 * The line's gain at `pos`, linear. `left: true` asks for the value arriving at `pos`
 * from before it — which only differs from the plain answer on a step.
 */
export function curveLevelAt(curve, pos, { left = false } = {}) {
  const pts = curve?.points || [];
  if (!pts.length) return 1;
  if (pos < pts[0].pos - EPS) return pts[0].gain;
  const last = pts[pts.length - 1];
  if (pos > last.pos + EPS) return last.gain;
  // Points exactly here: the first is the left limit, the last the right.
  let firstHere = -1;
  let lastHere = -1;
  for (let i = 0; i < pts.length; i++) {
    if (Math.abs(pts[i].pos - pos) <= EPS) { if (firstHere < 0) firstHere = i; lastHere = i; }
  }
  if (firstHere >= 0) return pts[left ? firstHere : lastHere].gain;
  let i = 0;
  while (i + 1 < pts.length && pts[i + 1].pos <= pos) i++;
  const a = pts[i];
  const b = pts[i + 1];
  if (!b) return a.gain;
  const span = b.pos - a.pos;
  const t = span > EPS ? (pos - a.pos) / span : 1;
  return shapeLevel(b.shape, a.gain, b.gain, t);
}

/** The line in dB at `pos`, null for silence. */
export const curveDbAt = (curve, pos, opts) => levelToDb(curveLevelAt(curve, pos, opts));

/** Where the line has a point strictly inside (from, to) — the corners a window must hit. */
export function pointsBetween(curve, from, to) {
  return (curve?.points || []).filter((p) => p.pos > from + EPS && p.pos < to - EPS);
}

/** The cuts in [from, to). */
export function cutsBetween(curve, from, to) {
  return (curve?.cuts || []).filter((c) => c >= from - EPS && c < to - EPS);
}

// ---- editing ---------------------------------------------------------------------
//
// Every edit takes an automation object and returns a NEW one — or null when nothing is
// left, so a song whose last fade was removed writes no `automation` key at all. None
// of them touch what they were given: the desk's undo is a snapshot of the draft.

const storedPoint = (p) => {
  const [bar, step] = barStepOf(p.pos);
  const out = [bar, step, p.db == null ? null : tidyNumber(p.db)];
  if (p.shape && p.shape !== 'even') out.push(p.shape);
  return out;
};
const storedCut = (pos) => barStepOf(pos);
const storedFx = (s) => ({
  from: barStepOf(s.from), to: barStepOf(s.to), chain: JSON.parse(JSON.stringify(s.chain)),
});

/** A lane's points as editable `{ pos, db, shape }`, stored order. */
export const lanePoints = (automation, key) => (laneCurve(automation?.[key])?.points || [])
  .map(({ pos, db, shape }) => ({ pos, db, shape }));

/** A lane's cuts, as positions. */
export const laneCuts = (automation, key) => [...(laneCurve(automation?.[key])?.cuts || [])];

/** A lane's effect sections as editable `{ from, to, chain }`, in sixteenths. */
export const laneFx = (automation, key) => (laneCurve(automation?.[key])?.fx || [])
  .map(({ from, to, chain }) => ({ from, to, chain }));

/** Sections in their order, the empty and the backwards ones dropped. */
const tidyFx = (list) => list
  .map((s, i) => ({ from: tidyNumber(s.from), to: tidyNumber(s.to), chain: s.chain, i }))
  .filter((s) => s.from >= 0 && s.to > s.from + EPS && validChain(s.chain))
  .sort((a, b) => a.from - b.from || a.i - b.i)
  .map(({ i, ...s }) => s);

/**
 * Sections with [from, to) taken out of them. One that straddles an edge keeps the part
 * outside; one that covers the whole stretch is cut in two around it — and its second part
 * is a section that STARTS at `to`, which is a fresh grab for a Stutter.
 */
const fxWithout = (sections, from, to) => {
  const kept = [];
  for (const s of sections) {
    if (s.to <= from + EPS || s.from >= to - EPS) { kept.push(s); continue; }
    if (s.from < from - EPS) kept.push({ ...s, to: from });
    if (s.to > to + EPS) kept.push({ ...s, from: to });
  }
  return kept;
};

/**
 * Sorted, clamped, and without exact repeats — two points at the same place and level.
 *
 * Nothing else is taken out. A point on a flat stretch is an anchor somebody put there
 * to drag a fade from, and a line sitting at 0 dB is still a line somebody drew; only
 * the split points a structural edit makes for itself are pruned when they turn out to
 * say nothing (see `pruneSplits`).
 */
export function tidyPoints(list) {
  const pts = [...list].map((p, i) => ({ ...p, db: clampDb(p.db), shape: shapeOf(p.shape), i }))
    .sort((a, b) => a.pos - b.pos || a.i - b.i)
    .map(({ i, ...p }) => p);
  const same = (a, b) => (a.db == null ? b.db == null : b.db != null && Math.abs(a.db - b.db) < 1e-6);
  return pts.filter((p, i) => !(i > 0 && Math.abs(pts[i - 1].pos - p.pos) <= EPS && same(pts[i - 1], p)));
}

/**
 * Take out the SPLIT points an insert, a delete or a paste added (flagged `split`) that
 * turn out to change nothing — one in the hold before the first point, say, or a step
 * whose two sides agree. Tested rather than reasoned about: a split goes only when the
 * line without it is the same line, read at every point and between every pair.
 */
function pruneSplits(points) {
  let pts = tidyPoints(points);
  const probesOf = (list) => {
    const out = [];
    const sorted = [...list].sort((a, b) => a.pos - b.pos);
    if (!sorted.length) return out;
    out.push([sorted[0].pos - 1, false], [sorted[sorted.length - 1].pos + 1, false]);
    for (let i = 0; i < sorted.length; i++) {
      out.push([sorted[i].pos, true], [sorted[i].pos, false]);
      if (i + 1 < sorted.length) out.push([(sorted[i].pos + sorted[i + 1].pos) / 2, false]);
    }
    return out;
  };
  const read = (list, probes) => {
    const curve = { points: list.map((p) => ({ ...p, gain: dbToLevel(p.db) })) };
    return probes.map(([pos, left]) => curveLevelAt(curve, pos, { left }));
  };
  for (let i = pts.length - 1; i >= 0; i--) {
    if (!pts[i].split) continue;
    const without = pts.filter((_, j) => j !== i);
    const probes = probesOf(pts);
    const a = read(pts, probes);
    const b = read(without, probes);
    if (a.every((v, k) => Math.abs(v - b[k]) < 1e-9)) pts = without;
  }
  return pts.map(({ split, ...p }) => p);
}

/**
 * Put one lane back into an automation object — or take it out when it is empty. Its
 * effect sections ride along untouched unless they are what is being written: every edit
 * to a level line or a cut goes through here, and one that rebuilt the lane from its
 * points and cuts alone would quietly delete the sections beside them.
 */
function withLane(automation, key, points, cuts, fx = laneFx(automation, key)) {
  const out = { ...(automation || {}) };
  const pts = tidyPoints(points);
  const cs = [...new Set(cuts.map(tidyNumber))].filter((c) => c >= 0).sort((a, b) => a - b);
  const fs = tidyFx(fx);
  if (!pts.length && !cs.length && !fs.length) delete out[key];
  else {
    out[key] = {};
    if (pts.length) out[key].points = pts.map(storedPoint);
    if (cs.length) out[key].cuts = cs.map(storedCut);
    if (fs.length) out[key].fx = fs.map(storedFx);
  }
  return Object.keys(out).length ? out : null;
}

/** Replace one lane's points AND cuts outright — the Volume strip writes through this. */
export function setLane(automation, key, points, cuts) {
  return withLane(automation, key, points || [], cuts || []);
}

/**
 * The effect sections over [from, to) replaced by `sections` — the bar-effects editor's one
 * write. What was there is taken out (cut at the edges, see `fxWithout`), and each new
 * section is held inside the stretch, so nothing outside it changes.
 */
export function replaceFxRange(automation, key, from, to, sections = []) {
  const laid = (sections || [])
    .map((s) => ({ from: Math.max(from, s.from), to: Math.min(to, s.to), chain: s.chain }));
  return withLane(automation, key, lanePoints(automation, key), laneCuts(automation, key),
    [...fxWithout(laneFx(automation, key), from, to), ...laid]);
}

/** Replace one lane's points outright — the Volume strip's drag writes through this. */
export function setLanePoints(automation, key, points) {
  return withLane(automation, key, points, laneCuts(automation, key));
}

/**
 * A fade: the line goes from `fromDb` at `from` to `toDb` at `to` along `shape`,
 * replacing whatever the line did between them — and nothing outside them.
 *
 * Both ends are PINNED at the level the line already had there (0 dB on a track with no
 * line yet): the level arriving at `from` for the bars before, the level leaving `to` for
 * the bars after. Without the pins the line's hold would carry the fade's ends out over
 * the rest of the song — a fade-in from silence silencing every bar ahead of it, a
 * fade-out silencing every bar after it. See the header.
 */
export function setLaneFade(automation, key, from, to, fromDb, toDb, shape = 'even') {
  const a = Math.min(from, to);
  const b = Math.max(from, to);
  if (!(b > a)) return automation || null;
  const curve = laneCurve(automation?.[key]);
  const arriving = curve?.points.length ? curveDbAt(curve, a, { left: true }) : 0;
  const leaving = curve?.points.length ? curveDbAt(curve, b) : 0;
  const keep = lanePoints(automation, key).filter((p) => p.pos < a - EPS || p.pos > b + EPS);
  const before = keep.filter((p) => p.pos < a);
  const after = keep.filter((p) => p.pos > b);
  return withLane(automation, key, [
    ...before,
    // The pins. Where one agrees with the fade's own end the two are one point (tidied).
    { pos: a, db: arriving, shape: 'even' },
    { pos: a, db: clampDb(fromDb), shape: 'even' },
    { pos: b, db: clampDb(toDb), shape: shapeOf(shape) },
    { pos: b, db: leaving, shape: 'even' },
    ...after,
  ], laneCuts(automation, key));
}

/**
 * Take a lane's points, cuts and/or effect sections out of [from, to). Sections only when
 * asked: Clear Volume is about level and leaves them alone, Reset Edits asks for all three.
 */
export function clearLaneRange(automation, key, from, to, { points = true, cuts = true, fx = false } = {}) {
  const pts = lanePoints(automation, key)
    .filter((p) => !points || p.pos < from - EPS || p.pos >= to - EPS);
  const cs = laneCuts(automation, key)
    .filter((c) => !cuts || c < from - EPS || c >= to - EPS);
  const fs = fx ? fxWithout(laneFx(automation, key), from, to) : laneFx(automation, key);
  return withLane(automation, key, pts, cs, fs);
}

/** A cut at `pos`. A second cut at the same place is the same cut. */
export function addLaneCut(automation, key, pos) {
  return withLane(automation, key, lanePoints(automation, key),
    [...laneCuts(automation, key), Math.max(0, pos)]);
}

/** The cut at `pos` removed, if there is one. */
export function removeLaneCut(automation, key, pos) {
  return withLane(automation, key, lanePoints(automation, key),
    laneCuts(automation, key).filter((c) => Math.abs(c - pos) > EPS));
}

/** A cut moved from one place to another. */
export function moveLaneCut(automation, key, from, to) {
  return withLane(automation, key, lanePoints(automation, key),
    [...laneCuts(automation, key).filter((c) => Math.abs(c - from) > EPS), Math.max(0, to)]);
}

/** Whole lanes gone — a deleted track takes its line and its cuts with it. */
export function dropLanes(automation, keys) {
  if (!automation) return null;
  const out = { ...automation };
  for (const key of keys || []) delete out[key];
  return Object.keys(out).length ? out : null;
}

/** One lane's automation copied onto another — a duplicated track plays the same way. */
export function copyLane(automation, fromKey, toKey) {
  if (!automation?.[fromKey]) return automation || null;
  return { ...automation, [toKey]: JSON.parse(JSON.stringify(automation[fromKey])) };
}

// ---- structure -------------------------------------------------------------------
//
// Positions are sixteenths from the top, so every edit that inserts or removes bars moves
// the music out from under them — the same problem the loop markers have, answered the
// same way: a point follows the music it was on.

const splitValues = (curve, at) => ({
  left: curveDbAt(curve, at, { left: true }),
  right: curveDbAt(curve, at),
});

/**
 * Bars arriving or leaving at `at` (sixteenths): `added` of them inserted there, or
 * `removed` taken out from there. Inserted time holds the level the line had arriving at
 * the insertion; removed time takes its points and cuts with it, and the line either side
 * of the gap is kept exactly, meeting in a step where the two sides disagree.
 */
export function shiftAutomation(automation, at, { added = 0, removed = 0 } = {}) {
  if (!automation || (!added && !removed)) return automation || null;
  let out = { ...automation };
  for (const key of Object.keys(automation)) {
    const curve = laneCurve(automation[key]);
    const pts = lanePoints(automation, key);
    const cuts = laneCuts(automation, key);
    let nextPts;
    let nextCuts;
    // Sections follow the music like everything else. Bars inserted INSIDE one split it
    // round them — the new bars are not part of it, and the music after them starts it
    // again — and bars taken out of one shorten it, the two sides meeting as one section.
    const fx = laneFx(automation, key);
    const nextFx = added
      ? fx.flatMap((s) => (s.to <= at + EPS ? [s]
        : s.from >= at - EPS ? [{ ...s, from: s.from + added, to: s.to + added }]
          : [{ ...s, to: at }, { ...s, from: at + added, to: s.to + added }]))
      : fx.map((s) => {
        const end = at + removed;
        const move = (p) => (p >= end - EPS ? p - removed : p > at ? at : p);
        return { ...s, from: move(s.from), to: move(s.to) };
      }).filter((s) => s.to > s.from + EPS);
    if (added) {
      const { left, right } = splitValues(curve, at);
      const exact = pts.some((p) => Math.abs(p.pos - at) <= EPS);
      nextPts = [
        ...pts.filter((p) => p.pos < at - EPS),
        ...(pts.length ? [{ pos: at, db: left, shape: 'even', split: true }] : []),
        ...(pts.length && !exact ? [{ pos: at + added, db: right, shape: 'even', split: true }] : []),
        ...pts.filter((p) => p.pos >= at - EPS).map((p) => ({ ...p, pos: p.pos + added })),
      ];
      // A point exactly at the insertion had its segment stretched over the new bars;
      // the one arriving there now starts from the held level, so it arrives flat.
      if (exact) {
        const first = nextPts.find((p) => Math.abs(p.pos - (at + added)) <= EPS);
        if (first) first.shape = 'even';
      }
      nextCuts = cuts.map((c) => (c >= at - EPS ? c + added : c));
    } else {
      const end = at + removed;
      const left = curveDbAt(curve, at, { left: true });
      const right = curveDbAt(curve, end);
      nextPts = [
        ...pts.filter((p) => p.pos < at - EPS),
        ...(pts.length ? [{ pos: at, db: left, shape: 'even', split: true },
          { pos: at, db: right, shape: 'even', split: true }] : []),
        ...pts.filter((p) => p.pos > end + EPS).map((p) => ({ ...p, pos: p.pos - removed })),
      ];
      nextCuts = cuts.filter((c) => c < at - EPS || c >= end - EPS)
        .map((c) => (c >= end - EPS ? c - removed : c));
    }
    out = withLane(out, key, pruneSplits(nextPts), nextCuts, nextFx) || {};
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Every lane's automation over [from, to), as a clip that can be laid down elsewhere:
 * positions relative to `from`, with the level at both edges written in so the pasted
 * copy starts and ends where the original did.
 */
export function copyAutomationRange(automation, from, to) {
  const length = Math.max(0, to - from);
  const lanes = {};
  for (const key of Object.keys(automation || {})) {
    const curve = laneCurve(automation[key]);
    const inside = curve.points.filter((p) => p.pos > from + EPS && p.pos < to - EPS);
    // The two edges are the line READ at them, not points anybody placed — flagged, so a
    // paste can drop them where they turn out to say nothing.
    const points = curve.points.length ? [
      { pos: 0, db: curveDbAt(curve, from), shape: 'even', split: true },
      ...inside.map((p) => ({ pos: p.pos - from, db: p.db, shape: p.shape })),
      { pos: length, db: curveDbAt(curve, to, { left: true }), shape: curve.points.find((p) => p.pos >= to - EPS)?.shape || 'even', split: true },
    ] : [];
    const cuts = cutsBetween(curve, from, to).map((c) => c - from);
    // A section that runs over either edge comes as far as the edge and no further.
    const fx = curve.fx.filter((s) => s.to > from + EPS && s.from < to - EPS)
      .map((s) => ({ from: Math.max(s.from, from) - from, to: Math.min(s.to, to) - from, chain: s.chain }));
    if (points.length || cuts.length || fx.length) lanes[key] = { points, cuts, fx };
  }
  return { length, lanes };
}

/**
 * Lay a clip down at `at`, `times` over, into time that is already there — the caller
 * inserts the bars first (shiftAutomation), then pastes over them. The level either side
 * of the pasted stretch is left as the insert made it, so the paste meets the song in a
 * step exactly where the copied bars did.
 */
export function pasteAutomation(automation, at, clip, times = 1) {
  if (!clip?.length || !clip.lanes) return automation || null;
  const span = clip.length * Math.max(1, times);
  let out = automation ? { ...automation } : {};
  const keys = new Set([...Object.keys(out), ...Object.keys(clip.lanes)]);
  for (const key of keys) {
    const piece = clip.lanes[key];
    const pts = lanePoints(out, key);
    const cuts = laneCuts(out, key);
    if (!piece) continue;
    // The clip's sections go down once per copy, over whatever the stretch held — which
    // after the insert that made room for it is nothing.
    const laidFx = [];
    for (let t = 0; t < Math.max(1, times); t++) {
      const base = at + t * clip.length;
      laidFx.push(...(piece.fx || []).map((s) => ({ from: base + s.from, to: base + s.to, chain: s.chain })));
    }
    const fx = [...fxWithout(laneFx(out, key), at, at + span), ...laidFx];
    // The insert left a held stretch between `at` and `at + span`; the clip replaces it.
    // What the line does either side stays exactly as it was: the level ARRIVING at `at`
    // and the level LEAVING `at + span` are read off the line and pinned there, so the
    // paste meets the song in a step on both edges. A lane with no line holds at 0 dB.
    const curve = laneCurve(out[key]);
    const before = pts.filter((p) => p.pos < at - EPS);
    const after = pts.filter((p) => p.pos > at + span + EPS);
    const laid = [];
    const laidCuts = [];
    for (let t = 0; t < Math.max(1, times); t++) {
      const base = at + t * clip.length;
      laid.push(...piece.points.map((p) => ({ ...p, pos: base + p.pos })));
      laidCuts.push(...piece.cuts.map((c) => base + c));
    }
    const edgeBefore = laid.length ? [{ pos: at, db: curve ? curveDbAt(curve, at, { left: true }) : 0, shape: 'even', split: true }] : [];
    const edgeAfter = laid.length ? [{ pos: at + span, db: curve ? curveDbAt(curve, at + span) : 0, shape: 'even', split: true }] : [];
    const keepBefore = laid.length ? before : pts.filter((p) => p.pos <= at + EPS);
    const keepAfter = laid.length ? after : pts.filter((p) => p.pos >= at + span - EPS);
    out = withLane(out, key, pruneSplits([...keepBefore, ...edgeBefore, ...laid, ...edgeAfter, ...keepAfter]),
      [...cuts.filter((c) => c < at - EPS || c >= at + span - EPS), ...laidCuts], fx) || {};
  }
  return Object.keys(out).length ? out : null;
}

// ---- the file --------------------------------------------------------------------

/** What is wrong with an automation object, as sentences. Empty means it plays. */
export function automationIssues(automation, laneKeys = null, bars = null) {
  const issues = [];
  if (automation == null) return issues;
  if (typeof automation !== 'object' || Array.isArray(automation)) {
    return ['the automation is not a map of tracks'];
  }
  for (const [key, lane] of Object.entries(automation)) {
    const master = key === MASTER_KEY;
    const group = groupIdOf(key);
    const bus = master || !!group;
    if (isGroupKey(key) && !group) issues.push(`automation names "${key}", which is not a group`);
    else if (!bus && laneKeys && !laneKeys.includes(key)) issues.push(`automation names "${key}", which is not a lane`);
    if (!lane || typeof lane !== 'object') { issues.push(`automation for "${key}" is not an object`); continue; }
    const place = (p) => Array.isArray(p) && Number.isFinite(p[0]) && p[0] >= 1
      && Number.isFinite(p[1] ?? 0) && (p[1] ?? 0) >= 0 && (p[1] ?? 0) < BAR;
    // The master's lane is effect sections and nothing else: nothing in the engine plays
    // a level line or a cut on the whole mix, and a file that asked for one would be
    // asking for something it silently does not get.
    if (bus && ((lane.points?.length || 0) + (lane.cuts?.length || 0)) > 0) {
      issues.push(`${master ? 'the master' : GROUP_BY_ID[group].name} carries effect sections only — no level line or cuts`);
    }
    for (const s of lane.fx || []) {
      if (!s || typeof s !== 'object' || !place(s.from) || !place(s.to)) {
        issues.push(`automation for "${key}" has an effect section that is not two places`);
      } else if (posOf(s.to[0], s.to[1]) <= posOf(s.from[0], s.from[1])) {
        issues.push(`automation for "${key}" has an effect section that ends where it starts`);
      } else if (!validChain(s.chain)) {
        issues.push(`automation for "${key}" has an effect section with no valid chain`
          + ` (one to ${SECTION_MAX} effects, each with an id)`);
      } else if (bars != null && posOf(s.to[0], s.to[1]) > bars * BAR) {
        issues.push(`automation for "${key}" has an effect section past bar ${bars}, where the song ends`);
      }
    }
    for (const p of lane.points || []) {
      if (!place(p)) issues.push(`automation for "${key}" has a point that is not a bar and a step`);
      else if (p[2] != null && !Number.isFinite(p[2])) issues.push(`automation for "${key}" has a non-numeric level`);
      else if (p[3] != null && !AUTOMATION_SHAPES.includes(p[3])) issues.push(`automation for "${key}" has an unknown shape "${p[3]}"`);
      else if (bars != null && p[0] > bars + 1) issues.push(`automation for "${key}" has a point at bar ${p[0]} and the song is ${bars} bars long`);
    }
    for (const c of lane.cuts || []) {
      if (!place(c)) issues.push(`automation for "${key}" has a cut that is not a bar and a step`);
      else if (bars != null && c[0] > bars) issues.push(`automation for "${key}" cuts at bar ${c[0]} and the song is ${bars} bars long`);
    }
  }
  return issues;
}

/** A position as the desk says it: `12.3.2` — bar, beat, sixteenth, all from 1. */
export function positionLabel(pos) {
  const [bar, step] = barStepOf(pos);
  const beat = Math.floor(step / 4 + EPS);
  const sixteenth = step - beat * 4;
  const whole = Math.abs(sixteenth - Math.round(sixteenth)) < 1e-6;
  return `${bar}.${beat + 1}.${whole ? Math.round(sixteenth) + 1 : tidyNumber(sixteenth + 1)}`;
}

/** A level as the desk says it: `0 dB`, `-6 dB`, `−∞`. */
export const levelLabel = (db) => (db == null ? '−∞' : `${db > 0 ? '+' : ''}${Number(db.toFixed(1))} dB`);
