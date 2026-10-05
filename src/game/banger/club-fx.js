// THE CLUB'S LIVE CONTROLS — what a hero's move and a part icon do to the music. 3 Oct 2026.
//
// HERO MOVES are master effect sections, on the same machinery a song's own Spot FX play
// on (mixer.scheduleBarEffects on `__master`): selected from the next beat, let go `bars`
// later — two for the moves that build (Underwater opening up, the Longbow's riser), one
// for the rest. A move tapped while another is playing takes over from it on its beat.
// Clara's is not an effect but a BREAKDOWN: everything but the drums drops out for the bar
// and comes back on the next (Peter, 3 Oct 2026: the bar of silence did not work).
//
// Some moves are HELD instead (`hold`, Peter, 3 Oct 2026): the effect is in for as long as
// the hero is held down — underwater, a stutter, the speed, the bow drawn — switched in on
// the next sixteenth after the press and out on the next beat after the release, so it
// answers at once and still sits on the grid. The rest are TRIGGERS: they land on the next
// beat and play out on their own (a tape stop, a breakdown, an echo thrown).
//
// 5 Oct 2026 (Peter): every held move can be PLAYED, not only switched — drag the held hero
// up or down (or press up and down on the keys) and the move follows: Lorenzo's water gets
// deeper or shallower, Ramon punches faster or slower, Fernwick draws harder, Rusty runs
// faster or drops into slow-mo. The engine retunes a section that is playing without
// re-grabbing it (mixer.retuneBarEffects, what the desk's Spot FX knobs use). Fernwick's
// LONGBOW became THE DROP — draw, and let go to land on the song's next drop on the next bar
// (club.js) — Grumpos throws a BOOMERANG (his returning axe), Rusty has his SPEED BOOST, and
// B-33P's 8-BIT is the 8-Bit Sound Set itself, on and off with a tap (club-voices.js). FLEX
// is retired: a pump across the finished mix ducked the kick, the one thing that should not.
//
// PARTS go through each channel's MONITORING gate — the gate solo uses — rather than its
// fader: a banger's own automation (its fades and trims) writes to the fader, and would
// undo a level set there; nothing writes the gate during play. The club's mixer panel
// sets each part's level (0–1) on it, at once — a fader is a live control.
//
// The song's own master sections (its builds, stutters, tape stops) are re-selected by the
// sequencer every sixteenth, which would switch a live effect straight off; while one is in,
// Audio.masterLiveUntil holds them back until it ends (audio.js _writeSections).
//
// Everything here is put back by releaseClub(): the mixer's channels outlive the song
// (the next song through reuses them), so a gate left shut would silence that lane in
// whatever plays next.
import { Audio } from '../../engine/audio.js';
import { baseLane, PERCUSSION_LANES } from '../../data/voices.js';

const MASTER = '__master';

/**
 * The heroes, and what each one's move does. `chain` is the master section a move plays.
 * Where each stands on the floor is drawn afresh every visit (club.js), so the order here is
 * only the keys' and the tests'. `drag` says what a held move's drag moves (see dragHold).
 */
export const HERO_MOVES = Object.freeze([
  // The cutoff rides the drag, on a log scale from 140 Hz (the deep end) to 3.2 kHz (just
  // under the surface); a press starts at 420 Hz, where the move always was. SWEEP is on
  // with both ends the same — a flat glide — so a drag eases onto its new cutoff over 20 ms
  // rather than stepping (effects.js sectionGlide).
  { hero: 'lorenzo', name: 'LORENZO', move: 'UNDERWATER', what: 'hold: the room floods — drag to sink or surface', col: '#48e0c8', hold: true,
    drag: { param: 'frequency', also: 'sweepTo', from: 140, to: 3200, start: 0.351 },
    chain: [{ id: 'filter', params: { type: 'lowpass', frequency: 420, Q: 1.4, sweep: 1, sweepTo: 420 } }] },
  // Not an effect: the band's instruments, swapped for the 8-Bit Sound Set's on the next bar
  // and back again at the next tap (club-voices.js).
  { hero: 'b33p', name: 'B-33P', move: '8-BIT', what: 'the whole band goes 8-bit — tap again to go back', col: '#f0c040', toggle: true },
  // A different length of stutter each press (Peter, 3 Oct 2026): quarters, eighths,
  // sixteenths or thirty-seconds (`slices`, in beats). The drag steps from there: up for
  // shorter (faster), down for longer, each step a fresh grab on the next sixteenth.
  { hero: 'ramon', name: 'RAMON', move: 'ROCKET FIST', what: 'hold: punch, punch — drag up to punch faster', col: '#ff7a59', hold: true,
    slices: [1, 0.5, 0.25, 0.125],
    chain: [{ id: 'stutter', params: { slice: 0.25, retrigger: 0, fade: 0 } }] },
  // His returning axe: on the 2 or the 4, that beat is thrown into a ping-pong echo — out
  // one side, back the other, across the next bar or so. High-passed going in, so the
  // repeats carry no kick to smear the beat they land on.
  { hero: 'grumpos', name: 'GRUMPOS', move: 'BOOMERANG', what: 'the beat thrown out one side — and back the other', col: '#e0874a',
    backbeat: true, beats: 1, echo: { every: 0.75, repeats: 6 },
    chain: [{ id: 'filter', params: { type: 'highpass', frequency: 220, Q: 0.7 } },
      { id: 'pingpong', params: { sync: 1, division: 0.75, feedback: 0.6, wet: 0.5 } }] },
  // On the 2 or the 4, whichever comes first (Peter, 3 Oct 2026). On the 4 it winds the
  // tape down across the bar's last beat and the music is back on the next one. On the 2
  // it has half a bar to play with: one long wind-down over beats 2 and 3, or a stop on
  // each — the tape caught, started and stopped again (kikoPlan).
  { hero: 'kiko', name: 'KIKO', move: 'POWER DOWN', what: 'a warning shot stops the tape on the 2 or the 4', col: '#e04848',
    onTwoOrFour: true, beats: 1,
    chain: [{ id: 'stutter', params: { slice: 0, retrigger: 0, fade: 0, stop: 1 } }] },
  { hero: 'clara', name: 'CLARA', move: 'PLOT HOLE', what: 'the band falls through it: drums only', col: '#c9a0ff',
    drop: ['bass', 'chords', 'lead'] },
  // THE DROP (Peter, 5 Oct 2026). Held, the bow is drawn: the high-pass climbs from 30 Hz to
  // 1.8 kHz over `drawBars` and holds there, a noise riser and a snare roll build under it
  // (club-hits.js) and the crowd sinks into a crouch. Let go and the arrow lands on the next
  // bar line: the song jumps to its next drop or chorus, the filter opens, the crowd jumps.
  // The drag draws harder — it lifts where the climb starts from, so the filter follows it.
  { hero: 'fernwick', name: 'FERNWICK', move: 'LONGBOW', what: 'hold to draw — let go and the drop lands on the one', col: '#7ad06a',
    hold: true, draw: true, drawBars: 4,
    drag: { param: 'frequency', from: 30, to: 1800, start: 0 },
    chain: [{ id: 'filter', params: { type: 'highpass', frequency: 30, Q: 0.9, sweep: 1, sweepTo: 1800 } }] },
  // His skill in the game (15% faster), held: the song runs at +15% in its own key, and the
  // drag steps it down through the song's own speed to three-quarters and half — slow-mo.
  // Steps, not a smooth fader: the engine caches rendered notes by length, and every new
  // speed is a new set of renders.
  { hero: 'rusty', name: 'RUSTY', move: 'SPEED BOOST', what: 'hold: the song speeds up — drag down for slow-mo', col: '#e0a04a',
    hold: true, speeds: [0.5, 0.75, 1, 1.15] },
]);

/** The parts the icons switch, in their order on screen. */
export const PARTS = Object.freeze([
  { id: 'drums', label: 'DRUMS' },
  { id: 'bass', label: 'BASS' },
  { id: 'chords', label: 'CHORDS' },
  { id: 'lead', label: 'LEAD' },
]);

/** Which part a lane belongs to: the kit, the bass, the chords, or the tune (everything else). */
export function partOf(key) {
  const base = baseLane(key);
  if (PERCUSSION_LANES.includes(base)) return 'drums';
  if (base === 'bass') return 'bass';
  if (base === 'chords') return 'chords';
  return 'lead';
}

/**
 * The next beat the scheduler has not yet passed: its audio time, the step it falls on and
 * the length of a sixteenth there. Null with no song running.
 */
export function nextBeatAt() {
  const ctx = Audio.ctx;
  if (!ctx || !Audio.bank || !Audio.mixer || !Number.isFinite(Audio.nextTime)) return null;
  const spb = 60 / ((Audio.bpm || 120) * (Audio.tempo || 1)) / 4;
  let step = Math.ceil(Audio.step / 4) * 4;
  let when = Audio.nextTime + (step - Audio.step) * spb;
  // Too close to schedule cleanly: the beat after.
  if (when - ctx.currentTime < 0.04) { step += 4; when += 4 * spb; }
  return { when, step, spb };
}

/** The next sixteenth the scheduler has not yet passed — where a held move goes in or out. */
export function nextSixteenthAt() {
  const ctx = Audio.ctx;
  if (!ctx || !Audio.bank || !Audio.mixer || !Number.isFinite(Audio.nextTime)) return null;
  const spb = 60 / ((Audio.bpm || 120) * (Audio.tempo || 1)) / 4;
  let step = Audio.step;
  let when = Audio.nextTime;
  if (when - ctx.currentTime < 0.01) { step += 1; when += spb; }
  return { when, step, spb };
}

/** The next bar line — where a seek queued now lands (Audio.setStepAtBoundary's own rule). */
export function nextBarAt() {
  const ctx = Audio.ctx;
  if (!ctx || !Audio.bank || !Number.isFinite(Audio.nextTime)) return null;
  const spb = 60 / ((Audio.bpm || 120) * (Audio.tempo || 1)) / 4;
  const step = Audio.step % 16 === 0 ? Audio.step : (Math.floor(Audio.step / 16) + 1) * 16;
  return { when: Audio.nextTime + (step - Audio.step) * spb, step, spb };
}

/** The audio time of absolute step `step`, on the grid the sequencer is writing now. */
export function stepTime(step) {
  if (!Number.isFinite(Audio.nextTime)) return null;
  const spb = 60 / ((Audio.bpm || 120) * (Audio.tempo || 1)) / 4;
  return Audio.nextTime + (step - Audio.step) * spb;
}

/**
 * Whether a change made now lands on a multiple of `every` sixteenths: the sequencer's next
 * step to schedule is one, and is no earlier than `notBefore`. Always, with no song running.
 */
export function gridReady(every, notBefore = -Infinity) {
  if (!Audio.ctx || !Audio.bank || !Number.isFinite(Audio.nextTime)) return true;
  return Audio.step % every === 0 && Audio.nextTime >= notBefore - 1e-4;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** A dragged move's setting at `level` (0–1): its `drag` range, on a log scale. */
export const dragValue = (move, level) => Math.round(move.drag.from * (move.drag.to / move.drag.from) ** clamp01(level));

/** A chain with its first effect's dragged setting at `level`. */
function draggedChain(move, level) {
  const v = dragValue(move, level);
  const set = { [move.drag.param]: v, ...(move.drag.also ? { [move.drag.also]: v } : {}) };
  return move.chain.map((fx, k) => (k === 0 ? { ...fx, params: { ...fx.params, ...set } } : fx));
}
const sliceChain = (move, slice) => move.chain.map((fx) => (fx.id === 'stutter' ? { ...fx, params: { ...fx.params, slice } } : fx));

/** The chain a held move plays this press: Ramon's stutter at one of its lengths. */
export function holdChain(move, random = Math.random) {
  if (move.slices) return sliceChain(move, move.slices[Math.floor(random() * move.slices.length)]);
  if (move.drag) return draggedChain(move, move.drag.start);
  return move.chain;
}

// Each dragged move's master section is filed, in the mixer's switch, under the chain it was
// last retuned to. A new press starts from its own setting, so the old branch is retuned back
// to it first — one branch per move, however many drags, rather than one per setting.
const LIVE = new Map();
function refile(move, list) {
  const was = LIVE.get(move.hero);
  if (was && JSON.stringify(was) !== JSON.stringify(list)) Audio.mixer?.retuneBarEffects?.(MASTER, was, list, Audio.bpm || 120);
  LIVE.set(move.hero, list);
}

/** A held move's speed: Audio's transport warp, the key left where it is. */
export function setSpeed(speed) { Audio.setWarp?.(speed, 1); }

/**
 * A held move goes in at `at`, and stays until endHold. Returns what the drag needs: the
 * move, how far it has been dragged, and where its setting stands.
 */
export function startHold(move, at, random = Math.random) {
  const held = { move, delta: 0, level: move.drag?.start ?? 0, slice: null, slice0: null, speed: null };
  if (move.speeds) {
    held.speed = move.speeds.length - 1;
    setSpeed(move.speeds[held.speed]);
    return held;
  }
  if (move.slices) held.slice = held.slice0 = Math.floor(random() * move.slices.length);
  if (!Audio.mixer?.scheduleBarEffects || !at) return held;
  const list = move.slices ? sliceChain(move, move.slices[held.slice]) : holdChain(move, random);
  if (move.drag) refile(move, list);
  // A dragged filter is booked as a glide across its section (see HERO_MOVES): Fernwick's
  // climbs over his drawBars, Lorenzo's holds still for as long as anyone could hold him.
  const until = move.drag ? at.when + (move.drawBars ? move.drawBars * 16 * at.spb : 3600) : null;
  Audio.mixer.scheduleBarEffects(MASTER, list, at.when, { fresh: true, sixteenth: at.spb, since: at.when, ...(until ? { until } : {}) });
  Audio.masterLiveUntil = Infinity;
  return held;
}

/**
 * The held hero dragged `delta` (a whole drag is ±1, up positive). `at` is the next
 * sixteenth, where Ramon's next grab goes in. Returns true when what is heard moved.
 */
export function dragHold(held, delta, at = null) {
  if (!held) return false;
  const move = held.move;
  held.delta = delta;
  if (move.speeds) {
    const top = move.speeds.length - 1;
    const k = Math.max(0, Math.min(top, top + Math.round(delta * top)));
    if (k === held.speed) return false;
    held.speed = k;
    setSpeed(move.speeds[k]);
    return true;
  }
  if (move.slices) {
    const top = move.slices.length - 1;
    const k = Math.max(0, Math.min(top, held.slice0 + Math.round(delta * top)));
    if (k === held.slice || !at || !Audio.mixer?.scheduleBarEffects) return false;
    held.slice = k;
    Audio.mixer.scheduleBarEffects(MASTER, sliceChain(move, move.slices[k]), at.when, { fresh: true, sixteenth: at.spb, since: at.when });
    return true;
  }
  if (move.drag) {
    const level = clamp01(move.drag.start + delta);
    const list = draggedChain(move, level);
    const was = LIVE.get(move.hero);
    if (!was || JSON.stringify(was) === JSON.stringify(list)) return false;
    held.level = level;
    if (Audio.mixer?.retuneBarEffects?.(MASTER, was, list, Audio.bpm || 120)) LIVE.set(move.hero, list);
    return true;
  }
  return false;
}

/** ...and comes out at `at`. A speed comes back on the club's own beat (club.js). */
export function endHold(at, held = null) {
  if (held?.move?.speeds) return;
  if (!Audio.mixer?.scheduleBarEffects || !at) return;
  Audio.mixer.scheduleBarEffects(MASTER, [], at.when);
  Audio.masterLiveUntil = at.when;
}

/** The next beat 4 of a bar (step 12 of 16) the scheduler has not yet passed. */
export function nextFourAt() {
  const at = nextBeatAt();
  if (!at) return null;
  const ahead = (((12 - at.step) % 16) + 16) % 16;
  return { when: at.when + ahead * at.spb, step: at.step + ahead, spb: at.spb };
}

/** The next beat 2 or 4 of a bar (step 4 or 12 of 16) the scheduler has not yet passed. */
export function nextTwoOrFourAt() {
  const at = nextBeatAt();
  if (!at) return null;
  const ahead = (((4 - at.step) % 8) + 8) % 8;
  return { when: at.when + ahead * at.spb, step: at.step + ahead, spb: at.spb };
}

/**
 * Kiko's tape stop, from where it lands: on the 4, one beat; on the 2, two beats — one
 * long wind-down (`hits: 1`) or a stop on each beat (`hits: 2`), at random.
 */
export function kikoPlan(at, random = Math.random) {
  const onTwo = ((at.step % 16) + 16) % 16 === 4;
  return onTwo ? { beats: 2, hits: random() < 0.5 ? 1 : 2 } : { beats: 1, hits: 1 };
}

/**
 * Where a trigger move lands: the next beat — or the next 4, or 2 or 4, for a move that
 * wants it, or the next bar line for B-33P's sound swap. A move that plays differently by
 * where it lands carries its `plan`.
 */
export function landingFor(move, random = Math.random) {
  if (move.onTwoOrFour) {
    const at = nextTwoOrFourAt();
    return at && { ...at, plan: kikoPlan(at, random) };
  }
  if (move.toggle) return nextBarAt();
  if (move.backbeat) return nextTwoOrFourAt();
  return move.onFour ? nextFourAt() : nextBeatAt();
}

/** How long a move lasts, in seconds, at a sixteenth of `spb` — by its `plan`, if it has one. */
export const moveSeconds = (move, spb, plan = null) => {
  const beats = plan?.beats || move.beats;
  return beats ? 4 * spb * beats : 16 * spb * (plan?.bars || move.bars || 1);
};

/**
 * A hero's move from `at`: their section for its bars, then let go — or, for a breakdown,
 * the parts it drops (only those the player has on, `parts`) out and back.
 */
export function playMove(move, at, { song = null, levels = null } = {}) {
  const mixer = Audio.mixer;
  if (!mixer?.scheduleBarEffects || !at) return;
  const until = at.when + moveSeconds(move, at.spb, at.plan);
  if (move.toggle) return;        // B-33P's swap is the sound set's (club-voices.js)
  if (move.drop) {
    // Each dropped part comes back to where its fader is, not to full.
    for (const id of move.drop) {
      const level = levels ? levels[id] ?? 1 : 1;
      if (level <= 0) continue;
      setPartLevel(song, id, 0, at);
      setPartLevel(song, id, level, { when: until });
    }
    return;
  }
  // A planned move plays as `hits` fresh sections end to end, each its share of the time,
  // a tape stop winding down across each one.
  const hits = at.plan?.hits || 1;
  const each = (until - at.when) / hits;
  const chain = at.plan?.beats
    ? move.chain.map((fx) => (fx.id === 'stutter' ? { ...fx, params: { ...fx.params, stop: at.plan.beats / hits } } : fx))
    : move.chain;
  for (let h = 0; h < hits; h++) {
    const from = at.when + h * each;
    mixer.scheduleBarEffects(MASTER, chain, from, { fresh: true, sixteenth: at.spb, since: from, until: from + each });
  }
  mixer.scheduleBarEffects(MASTER, [], until);
  Audio.masterLiveUntil = until;
}

/** A fader position (0–1) as a gain: squared, so the travel feels even to the ear. */
export const partGain = (level) => Math.max(0, Math.min(1, level)) ** 2;

/** A part's level (a fader, 0–1), from `at` (or now), gliding over `glide` seconds. */
export function setPartLevel(song, id, level, at = null, glide = 0.012) {
  const mixer = Audio.mixer;
  const ctx = Audio.ctx;
  if (!mixer?.lane || !ctx) return;
  const when = at ? at.when : ctx.currentTime;
  for (const key of song?.mix?.order || []) {
    if (partOf(key) !== id) continue;
    const gate = mixer.lane(key)?._monitorNode?.gain;
    if (gate) gate.setTargetAtTime(partGain(level), when, glide);
  }
}

/** A part on or off, from `at` (or now). */
export function setPart(song, id, on, at = null) { setPartLevel(song, id, on ? 1 : 0, at); }

/** Leaving the club: every gate open again, the master's section let go, the song back at
 *  its own speed — now. */
export function releaseClub(song) {
  LIVE.clear();
  setSpeed(1);
  const mixer = Audio.mixer;
  const ctx = Audio.ctx;
  if (!mixer || !ctx) return;
  const now = ctx.currentTime;
  for (const key of song?.mix?.order || []) {
    const gate = mixer.lane(key)?._monitorNode?.gain;
    if (!gate) continue;
    gate.cancelScheduledValues(now);
    gate.setValueAtTime(1, now);
  }
  mixer.scheduleBarEffects?.(MASTER, [], now);
  Audio.masterLiveUntil = -Infinity;
}
