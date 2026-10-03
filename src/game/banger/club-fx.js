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
// the hero is held down — 8-bit, underwater, a stutter, the pump — switched in on the next
// sixteenth after the press and out on the next after the release, so it answers at once
// and still sits on the grid. The rest are TRIGGERS: they land on the next beat and play
// out on their own (a tape stop, a riser, a breakdown, an echo).
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
 * The heroes on the floor, in order, and what each one's move does — the HELD moves first,
 * then the one-shots, so the holds stand on the left of the floor and the one-shots on the
 * right (Peter, 3 Oct 2026). `chain` is the master section a move plays.
 */
export const HERO_MOVES = Object.freeze([
  { hero: 'lorenzo', name: 'LORENZO', move: 'UNDERWATER', what: 'hold: the plumber floods the room', col: '#48e0c8', hold: true,
    chain: [{ id: 'filter', params: { type: 'lowpass', frequency: 420, Q: 1 } }] },
  { hero: 'b33p', name: 'B-33P', move: '8-BIT', what: 'hold: the robot crushes it to bits', col: '#f0c040', hold: true,
    chain: [{ id: 'bitcrusher', params: { bits: 5, downsample: 6, wet: 1 } }] },
  // A different length of stutter each press (Peter, 3 Oct 2026): quarters, eighths,
  // sixteenths or thirty-seconds (`slices`, in beats).
  { hero: 'ramon', name: 'RAMON', move: 'ROCKET FIST', what: 'hold: punch, punch, punch', col: '#ff7a59', hold: true,
    slices: [1, 0.5, 0.25, 0.125],
    chain: [{ id: 'stutter', params: { slice: 0.25, retrigger: 0, fade: 0 } }] },
  // The pump — the whole room ducking on every beat — rather than a bass boost on the
  // finished mix, which most speakers could not show (Peter: "not sure Grumpos is doing
  // anything").
  { hero: 'grumpos', name: 'GRUMPOS', move: 'FLEX', what: 'hold: the whole room pumps', col: '#e0874a', hold: true,
    chain: [{ id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.75 } }] },
  // On the 2 or the 4, whichever comes first (Peter, 3 Oct 2026). On the 4 it winds the
  // tape down across the bar's last beat and the music is back on the next one. On the 2
  // it has half a bar to play with: one long wind-down over beats 2 and 3, or a stop on
  // each — the tape caught, started and stopped again (kikoPlan).
  { hero: 'kiko', name: 'KIKO', move: 'POWER DOWN', what: 'a warning shot stops the tape on the 2 or the 4', col: '#e04848',
    onTwoOrFour: true, beats: 1,
    chain: [{ id: 'stutter', params: { slice: 0, retrigger: 0, fade: 0, stop: 1 } }] },
  { hero: 'clara', name: 'CLARA', move: 'PLOT HOLE', what: 'the band falls through it: drums only', col: '#c9a0ff',
    drop: ['bass', 'chords', 'lead'] },
  // A riser of one, two or four bars, picked each time (Peter, 3 Oct 2026: up to four).
  { hero: 'fernwick', name: 'FERNWICK', move: 'LONGBOW', what: 'a riser, loosed on the one', col: '#7ad06a', bars: 2,
    barChoices: [1, 2, 4],
    chain: [{ id: 'filter', params: { type: 'highpass', frequency: 30, Q: 0.9, sweep: 1, sweepTo: 1800 } }] },
  { hero: 'rusty', name: 'RUSTY', move: 'BOOMERANG', what: 'an echo that comes back', col: '#e0a04a',
    chain: [{ id: 'delay', params: { sync: 1, division: 0.75, feedback: 0.65, wet: 0.55 } }] },
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

/** The chain a held move plays this press: Ramon's stutter at one of its lengths. */
export function holdChain(move, random = Math.random) {
  if (!move.slices) return move.chain;
  const slice = move.slices[Math.floor(random() * move.slices.length)];
  return move.chain.map((fx) => (fx.id === 'stutter' ? { ...fx, params: { ...fx.params, slice } } : fx));
}

/** A held move goes in at `at`, and stays until endHold. */
export function startHold(move, at, random = Math.random) {
  if (!Audio.mixer?.scheduleBarEffects || !at) return;
  Audio.mixer.scheduleBarEffects(MASTER, holdChain(move, random), at.when, { fresh: true, sixteenth: at.spb, since: at.when });
  Audio.masterLiveUntil = Infinity;
}

/** ...and comes out at `at`. */
export function endHold(at) {
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
 * wants it. A move that plays differently by where it lands carries its `plan`.
 */
export function landingFor(move, random = Math.random) {
  if (move.onTwoOrFour) {
    const at = nextTwoOrFourAt();
    return at && { ...at, plan: kikoPlan(at, random) };
  }
  if (move.barChoices) {
    const at = nextBeatAt();
    return at && { ...at, plan: { bars: move.barChoices[Math.floor(random() * move.barChoices.length)], hits: 1 } };
  }
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

/** Leaving the club: every gate open again, the master's section let go — now. */
export function releaseClub(song) {
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
