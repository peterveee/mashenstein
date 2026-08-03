// Who decides what the music is doing, and when.
//
// `Audio.setBank` changes SONGS, and everything about it says so: it cuts the lanes
// still ringing, opens a clean half-second gap so the old tail cannot run into the new
// downbeat, and sends the sequencer back to the top. That is the right answer to "play
// the food court theme now" and the wrong one to "the same song, with the band arriving".
//
// This is the other question. A treatment is the same composition on the same clock,
// heard another way: the cabinet's theme looping four bars with the drums and bass alone
// while you pick a level, and the whole band walking in on the downbeat as it starts.
// Nothing here moves `step`, `nextTime` or the bpm — the notes already inside the
// quarter-second lookahead ring straight through the change, which is the entire point.
//
// Two things live here and nowhere else: WHICH treatment a screen gets, and WHEN a
// change is allowed to land. Game states say what happened; this says what that sounds
// like. See docs/game-engine-song-mixer-relationship.md.
import { Audio } from './audio.js';
import { AUX_DEFAULTS } from './mixer.js';
import { MIX, VARIANTS } from '../data/mix.js';
import { trackIdOf } from '../data/tracks.js';

const STEPS_PER_BAR = 16;

// A phrase, when no loop is armed to say otherwise: four bars, which is the length
// every song in the game writes its sections in.
const PHRASE_STEPS = 64;

// The scheduler hands a step to the audio thread a quarter of a second before it
// sounds, and can hand one over slightly late after a main-thread stall. Automation
// aimed at a time that has already passed lands wherever the stall ended rather than on
// the bar, so a boundary this close is skipped and the next one used instead.
const TOO_LATE = 0.02;

const DEFAULT_EXIT = {
  // 'immediate' | 'beat' | 'bar' | 'phrase', or a NUMBER OF BARS.
  //
  // The number is there because 'phrase' means the armed loop's own length, and a
  // treatment looping four bars has no way to say "every two" — which is the seam a
  // band actually walks in on. `quantize: 2` is that, and it reads as what it is.
  quantize: 'bar',
  crossfadeBars: 1,
  loopRelease: 'atTransition', // 'atTransition' | 'atLoopEnd'
  // The reverb blooming into the handover and ringing out of it — an accent that adds
  // no new sound to the game, only more of the room the treatment is already in.
  // 0 bars, or no target level, means no swell.
  swellBars: 0,
  swellTo: null,
  // How long the treatment leg takes to fade away, in bars. Null follows crossfadeBars,
  // which is what it did before this existed — and which conflates two different things.
  // The band arriving is a MOMENT and wants to land on the downbeat; a filter coming off
  // is a GESTURE and wants time. Sharing one number meant a snap took the bottom end back
  // in four milliseconds, which is a switch rather than an opening.
  treatBars: null,
};

const EXIT_KEYS = ['quantize', 'crossfadeBars', 'loopRelease', 'swellBars', 'swellTo', 'treatBars'];
const pickExit = (o = {}) => Object.fromEntries(
  EXIT_KEYS.filter((k) => o[k] != null).map((k) => [k, o[k]]),
);

/**
 * One lane, patched FIELD BY FIELD.
 *
 * `{ lead: { mute: true } }` mutes the lead and leaves its gain, pan, width, EQ, sends
 * and effects exactly as the song authored them. Replacing the lane outright would be a
 * far more surprising reading of an entry that says only "mute this" — it would silently
 * take a carefully placed pan and a reverb send with it.
 */
function mergeLane(base = {}, patch = {}) {
  const out = { ...base, ...patch };
  if (base.send || patch.send) out.send = { ...(base.send || {}), ...(patch.send || {}) };
  if (base.eq || patch.eq) out.eq = { ...(base.eq || {}), ...(patch.eq || {}) };
  return out;
}

/**
 * A treatment's patch over the song's own mix, producing a WHOLE mix.
 *
 * Whole, not partial, because that is what Audio.rampMix needs: `mixEntry` is what
 * setArrangement re-shapes the song's sections through, and `layers`, `off` and `voice`
 * are read off it. A patch handed straight to the engine would quietly delete a
 * duplicated lane the next time the arrangement changed. Those three keys are also
 * exactly what a treatment may not carry, so merging over the base always keeps them.
 */
function mergeMix(base, patch) {
  if (!patch) return base || null;
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (k !== 'lanes' && k !== 'fx') out[k] = v;
  }
  if (patch.lanes) {
    out.lanes = { ...(base?.lanes || {}) };
    for (const [key, lane] of Object.entries(patch.lanes)) {
      out.lanes[key] = mergeLane(out.lanes[key], lane);
    }
  }
  if (patch.fx) {
    out.fx = { ...(base?.fx || {}) };
    for (const [id, aux] of Object.entries(patch.fx)) {
      const prev = out.fx[id] || {};
      out.fx[id] = { ...prev, ...aux };
      if (prev.eq || aux.eq) out.fx[id].eq = { ...(prev.eq || {}), ...(aux.eq || {}) };
    }
  }
  return out;
}

/**
 * The mix, loop and exit policy for one treatment of one song.
 *
 * `state` is a word from progress.cabinetMusicState — how far into the cabinet the
 * player is. Matching is plain equality against `when`, with `'always'` matching
 * anything, and the list is walked in order so the first match wins. No predicates and
 * no overlap: exactly one state is true at a time, decided where the campaign is.
 *
 * A song with no treatment, or none matching, resolves to its own saved mix. That is
 * what every cabinet does until someone authors otherwise, and it is not a fallback so
 * much as the ordinary answer.
 */
function resolve(trackId, variantId, state) {
  const base = MIX[trackId] || null;
  const plain = { mix: base, loop: null, exit: { ...DEFAULT_EXIT } };
  if (!trackId || !variantId) return plain;
  const list = VARIANTS[trackId]?.[variantId];
  if (!list) return plain;
  const entries = Array.isArray(list) ? list : [list];
  const hit = entries.find((e) => e.when === 'always' || e.when === state);
  if (!hit) return plain;
  return {
    mix: mergeMix(base, hit.patch),
    // Bars are 1-based and inclusive on the page, because that is how the desk's
    // timeline counts and how anyone says "bars one to four". Steps are absolute
    // sixteenths, because that is what the sequencer loops on.
    loop: hit.loop
      ? { start: (hit.loop.fromBar - 1) * STEPS_PER_BAR, end: hit.loop.toBar * STEPS_PER_BAR }
      : null,
    // Effects that belong to THIS presentation and to no other — a high-pass across the
    // whole cabinet screen, say. Not part of `patch`: a mix's effect chains can only be
    // re-tuned at a boundary, never rebuilt, because rebuilding one disposes the slot.
    // These live on their own leg of the music, which is faded away from rather than
    // switched out, and torn down later when nothing is going through it. See
    // mixer.rampTreatment.
    treatment: hit.treatment ?? null,
    // How much silence to open when this treatment ARRIVES. Half a second is setBank's
    // default and is right for a song change you can see coming; a cabinet screen has a
    // shutter over most of it, and how much of the remainder reads as a beat rather than
    // a dropout is a per-cabinet decision. Null means take setBank's own.
    gap: hit.gap ?? null,
    exit: { ...DEFAULT_EXIT, ...(hit.exit || {}) },
  };
}

export const MusicDirector = {
  bank: null,
  trackId: null,
  variantId: null,
  state: null,
  resolved: null,
  pending: null,
  treated: false,

  /**
   * Play a song in one of its treatments. A real song change, with setBank's gap and
   * its reset — this is for arriving somewhere, not for changing what you are already
   * hearing.
   *
   * The mix is passed explicitly, which also defeats setBank's same-bank early return.
   * That is wanted: re-opening the cabinet screen must re-arm its treatment even when
   * the same song is somehow already up.
   */
  play(bank, variantId = null, state = null, { gap } = {}) {
    this.cancel();
    this.bank = bank || null;
    this.trackId = bank ? trackIdOf(bank) : null;
    this.variantId = variantId;
    this.state = state;
    if (!bank) { this.resolved = null; Audio.setBank(null); return; }
    const r = resolve(this.trackId, variantId, state);
    this.resolved = r;
    // The caller's gap wins over the treatment's, so a screen can override what a song
    // asks for; both absent means setBank's own half second.
    const g = gap ?? r.gap;
    Audio.setBank(bank, r.mix || null, undefined, g == null ? undefined : { gap: g });
    // After setBank, which resets the treatment leg along with everything else on the
    // desk. Built at full wet with no cross-fade because this is already a hard change:
    // there is a gap either side of it and nothing to be smooth about yet.
    this.treated = !!r.treatment?.length;
    if (this.treated && Audio.mixer) {
      Audio.mixer.setTreatment(r.treatment, bank.bpm || Audio.bpm);
      Audio.mixer.rampTreatment(1, Audio.ctx.currentTime, 0);
    }
    if (r.loop) Audio.setLoop(r.loop.start, r.loop.end);
  },

  /**
   * Change treatment without changing song: land `variantId` at the next boundary its
   * exit policy allows, keeping the clock.
   *
   * `variantId` of null means the song's own saved mix — which is what a level plays,
   * and why leaving a treatment needs no treatment of its own.
   *
   * Nothing is scheduled here. The request is held until a step lands on the boundary,
   * and steps only happen while the sequencer is running — so a suspended context or a
   * backgrounded tab cannot produce a change that fires against a clock which is not
   * moving. It waits, and lands on the first boundary after the context comes back.
   */
  request(variantId = null, overrides = {}) {
    if (!this.bank || Audio.sourceBank !== this.bank) { this.cancel(); return false; }
    const target = overrides.mixOverride !== undefined
      ? { mix: overrides.mixOverride }
      : resolve(this.trackId, variantId, this.state);
    // The exit policy belongs to the treatment being LEFT: it is that treatment's answer
    // to "how do I hand over". A level's mix has no opinion about how it was reached.
    const exit = { ...(this.resolved?.exit || DEFAULT_EXIT), ...pickExit(overrides) };
    const p = { variantId, mix: target.mix, exit };

    if (!Audio.ctx || !Audio.bank) {
      // Nothing is playing to transition. Remember the choice so the next thing that
      // reads it is right, and let setBank do the work when a song does arrive.
      this.variantId = variantId;
      this.resolved = { ...(this.resolved || {}), mix: target.mix };
      return false;
    }
    // Latest request wins. Nothing is in the graph yet if the previous one never
    // reached its boundary; if it did, rampMix's cancelAndHoldAtTime takes its ramps
    // off every param this one touches, and this one touches all of them.
    this.pending = p;
    if (exit.quantize === 'immediate') this._fire(p, Audio.ctx.currentTime + TOO_LATE);
    return true;
  },

  /**
   * run.js's one call, when a level begins.
   *
   * If the cabinet screen is already playing this song, hand it over to the level's own
   * mix on a bar line and keep the clock. Otherwise do exactly what run.js did before
   * any of this existed — a dev URL straight into a stage, or a retry from the results
   * screen, has no treatment to leave and should sound as it always has.
   */
  enterStage(bank) {
    if (bank && this.bank === bank && Audio.sourceBank === bank && this.variantId) {
      return this.request(null);
    }
    this.cancel();
    this.bank = bank || null;
    this.trackId = bank ? trackIdOf(bank) : null;
    this.variantId = null;
    this.resolved = null;
    Audio.setBank(bank);
    return false;
  },

  /**
   * The desk's "hear the change": hand the song already playing over to another mix at
   * the next boundary, without a bank change.
   *
   * `play` cannot do this — it goes through setBank, which would stop the desk's
   * transport dead and restart it after a gap, which is the one thing this whole file
   * exists to avoid. The desk has already armed the treatment itself (it has the draft;
   * this module only knows what is on disk), so all that is wanted here is the boundary
   * logic, which is the part worth having in one place rather than two.
   */
  auditionHandover(bank, levelMix, exit = {}, treated = false) {
    this.cancel();
    this.bank = bank || null;
    this.trackId = bank ? trackIdOf(bank) : null;
    this.variantId = 'select';
    this.resolved = { mix: null, loop: null, exit: { ...DEFAULT_EXIT, ...exit } };
    this.treated = !!treated;
    return this.request(null, { mixOverride: levelMix, ...exit });
  },

  /** Drop a change that has not landed. The song moving out from under it is the usual reason. */
  cancel() { this.pending = null; },

  /**
   * The run is over — cleared, failed, or quit.
   *
   * A treatment that has not handed over yet has to hand over NOW, because the boundary
   * it was waiting for no longer means anything. Leave a level inside the first couple
   * of bars — which is exactly when somebody quits — and without this the results screen
   * gets the cabinet screen's own four-bar loop with the tune still muted, and then,
   * partway through it, the band arriving to mark a moment that is not happening.
   *
   * Immediately and dry: there is no musical event left to land on, so the swell and the
   * crossfade are turned off and the song simply becomes itself again. A no-op once the
   * handover has already happened, which is the ordinary case for a run of any length.
   */
  endStage() {
    this.cancel();
    if (!this.variantId || !this.bank || Audio.sourceBank !== this.bank) return;
    this.request(null, { quantize: 'immediate', crossfadeBars: 0, swellBars: 0 });
  },

  current() {
    return { trackId: this.trackId, variantId: this.variantId, state: this.state, pending: !!this.pending };
  },

  /** Seconds per sixteenth, at the tempo as it is right now. */
  _spb() { return (60 / (Audio.bpm * (Audio.tempo || 1))) / 4; },

  /**
   * Is this step the boundary the pending change asked for?
   *
   * `atLoopEnd` is answered first and separately, because releasing the loop and moving
   * the mix are related questions and not the same one. The wrap happens inside
   * scheduleStep between one step and the next, so the loop has to be let go BEFORE it —
   * from the last beat of the last bar, with the ramp aimed at the downbeat that will
   * now follow instead of at the repeat that would have.
   */
  _boundary(p, step, when) {
    if (p.exit.loopRelease === 'atLoopEnd' && Audio.loopEnd != null) {
      const togo = Audio.loopEnd - step;
      if (togo <= 0 || togo > 4) return null;
      Audio.setLoop();
      return { at: when + togo * this._spb(), released: true };
    }
    const q = p.exit.quantize;
    if (q === 'beat') return step % 4 === 0 ? { at: when } : null;
    // Both of the grid answers measure from the MUSICAL ANCHOR, not from zero. A loop
    // over bars 2-5 begins at step 16, and `16 % 64` is not zero — counting from the
    // start of the song would step straight over every boundary that loop has.
    if (q === 'phrase' || (typeof q === 'number' && q > 0)) {
      const anchor = Audio.loopStart ?? 0;
      const len = typeof q === 'number'
        ? Math.round(q * STEPS_PER_BAR)
        : ((Audio.loopEnd != null && Audio.loopStart != null)
          ? Audio.loopEnd - Audio.loopStart : PHRASE_STEPS);
      return len > 0 && (step - anchor) % len === 0 ? { at: when } : null;
    }
    return step % STEPS_PER_BAR === 0 ? { at: when } : null;
  },

  /**
   * Where the reverb bloom sits, or null when this treatment does not ask for one.
   *
   * Deliberately in two halves scheduled either side of the handover, because rampMix
   * anchors every parameter it touches with cancelAndHoldAtTime AT the boundary:
   *
   *   · the RISE goes in first, so that anchor finds the swell in progress and takes
   *     its peak as the value the handover starts from;
   *   · the FALL goes in after, replacing what rampMix put there — which would
   *     otherwise cut the tail off at the exact moment it is meant to bloom.
   *
   * The rise stops a millisecond short of the boundary rather than landing on it, so
   * the anchor reads a finished ramp instead of racing an event at the same time.
   */
  _swellPlan(p, at) {
    const bars = p.exit.swellBars || 0;
    if (!(bars > 0) || p.exit.swellTo == null || !Audio.mixer) return null;
    const secs = bars * STEPS_PER_BAR * this._spb();
    const from = Math.max(Audio.ctx.currentTime, at - secs);
    // A boundary closer than this leaves nothing to rise through; take the handover
    // plain rather than cramming a swell into a few milliseconds, which is a click.
    if (at - from < 0.05) return null;
    return { from, rise: at - from - 0.001, fall: secs };
  },

  _fire(p, at, released = false) {
    // Computed once, here, from the tempo at the moment the change commits. A warp
    // during the crossfade must not stretch or truncate a ramp already in the graph.
    const seconds = Math.max(0, (p.exit.crossfadeBars || 0) * STEPS_PER_BAR * this._spb());
    const swell = this._swellPlan(p, at);
    if (swell) Audio.mixer.rampAux('reverb', { level: p.exit.swellTo }, swell.from, swell.rise);
    try {
      Audio.rampMix(p.mix, at, seconds);
    } catch (err) {
      // A pair of mixes that disagree on the SHAPE of an effect chain — see rampMix,
      // which refuses before it moves anything. The treatment stays up rather than half
      // applying; the desk is where that pair should have been caught.
      console.warn('[music] treatment refused:', err.message);
      this.pending = null;
      return;
    }
    if (swell) {
      // The bloom decaying into the level, over the same length it took to rise. The
      // dry band has already arrived above it by now; this is only the room letting go.
      const settled = p.mix?.fx?.reverb?.level ?? AUX_DEFAULTS.reverb.level;
      Audio.mixer.rampAux('reverb', { level: settled }, at, swell.fall);
    }
    // The treatment leg fades away rather than being switched out, over the same time
    // as the mix change so the filter opens INTO the level instead of snapping off it.
    // Torn down afterwards, on a wall-clock timer, which is safe here and nowhere else
    // in this file: by then the leg is silent, so when the nodes go is inaudible.
    if (this.treated && Audio.mixer) {
      const treatSecs = p.exit.treatBars == null
        ? seconds
        : Math.max(0, p.exit.treatBars * STEPS_PER_BAR * this._spb());
      Audio.mixer.rampTreatment(0, at, treatSecs);
      const done = Math.max(0, (at + treatSecs) - Audio.ctx.currentTime) + 0.25;
      this.treated = false;
      setTimeout(() => {
        if (!this.treated && Audio.mixer) Audio.mixer.clearTreatment();
      }, done * 1000);
    }
    if (!released) Audio.setLoop();
    this.variantId = p.variantId;
    this.resolved = { mix: p.mix, loop: null, exit: p.exit };
    this.pending = null;
  },

  _onBeat(beatIdx, when, step) {
    const p = this.pending;
    if (!p) return;
    // The one guard that covers backing out to the food court, the jukebox, a minigame
    // calling setBank(null), and anything else that changes the song underneath a
    // request. No hooks anywhere else.
    if (!this.bank || Audio.sourceBank !== this.bank) { this.cancel(); return; }
    if (when < Audio.ctx.currentTime + TOO_LATE) return;
    const hit = this._boundary(p, step, when);
    if (hit) this._fire(p, hit.at, hit.released);
  },
};

// One listener, for the life of the process. onBeat has no unsubscribe and needs none
// here: registering per request would leak one per cabinet screen, and the director is
// a singleton with at most one change in flight.
Audio.onBeat((beatIdx, when, step) => MusicDirector._onBeat(beatIdx, when, step));
