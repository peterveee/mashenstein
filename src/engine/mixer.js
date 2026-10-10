// Per-lane channel strips — the mixing desk the songs are balanced on.
//
// Until now every voice connected straight to a single shared musicBus, so there
// was no per-instrument node to hang a fader, pan or EQ on; balancing a song meant
// editing gain literals in audio.js and the data files by hand. Each lane now gets
// a strip, and tools/mixer drives them live.
//
// The overriding constraint: AT DEFAULTS THIS MUST BE INAUDIBLE. Every existing
// song has been balanced by ear against the old topology, so a strip at unity has
// to be a pass-through, not "almost" a pass-through. Two places that bites:
//
//   * Panning. StereoPannerNode uses two different pan laws: for a MONO input it
//     is equal-power (0.707 per side at centre), but for a STEREO input at centre
//     it is unity passthrough. Some lanes are already stereo — `sweeps` and `gliss`
//     build their own StereoPanner per voice — so a blanket gain compensation
//     would be right for the mono lanes and +3dB on those two. Instead each lane
//     input is forced to explicit stereo, which upmixes mono voices to L=R at
//     unity exactly as connecting them to a stereo destination always did, and
//     leaves already-stereo voices alone. Centre is then unity everywhere.
//
//     This is why the fader and panner are native nodes rather than Tone.Channel:
//     measured, a native StereoPannerNode fed explicit stereo passes centre at
//     ratio 1.0000, while Tone.Channel downmixes to mono internally and stays at
//     0.7071 no matter what it is fed. Tone earns its place elsewhere here —
//     reverb, metering, limiting — but not in a path that has to be transparent.
//   * EQ. Tone.EQ3 is a crossover splitter: it divides the signal into three bands
//     and sums them, which is not phase-transparent even with all three at 0dB.
//     A serial lowshelf/peaking/highshelf chain IS exactly transparent at 0dB
//     (the biquad coefficients collapse to a pass-through), and it is the topology
//     a console EQ actually uses. So the EQ is native BiquadFilters, not EQ3.
import * as Tone from 'tone';
import { LANES } from './lanes.js';
import {
  createEffect, makeReverb, rampParam, TEMPO_DIVISIONS, MAX_DELAY_SECONDS, delaySeconds,
} from './effects.js';
import { prepareEngineWorklets } from './engine-worklets.js';
import { EFFECT_PRESETS } from '../data/effect-presets.js';
import { MASTER_KEY } from '../data/automation.js';
import { GROUP_IDS, groupIdOf, isGroupKey, groupSettings } from '../data/group-buses.js';

export const dbToGain = (db) => 10 ** (db / 20);
export const gainToDb = (g) => 20 * Math.log10(Math.max(1e-6, g));

/**
 * THE CEILING — the Banger Lab's limiter, last on the song's bus (Peter, 9 Oct 2026: "should we
 * run a limit on the lab overall?", once its faders went past 0 dB). A song switches it on with
 * `ceiling: true` in its mix, and every song has it on the listening screens, the jukebox and the
 * Lab, where the music plays 3 dB up (Audio.setListening). Nothing else has it, so every cabinet
 * still plays in the game as it was balanced.
 *
 * Not the `limiter` beside it: that is Tone.Limiter, a 30 dB soft knee and a 10 ms release, which
 * barely touches a 0 dBFS peak and which the songs that use it were mixed through. This is a
 * native DynamicsCompressorNode with a hard knee at 20:1. Web Audio gives that node a make-up gain
 * of its own — (1 / the curve's gain at 0 dBFS) ^ 0.6, 1.71 dB at these settings — so a trim after
 * it takes exactly that back off: below the threshold the ceiling is unity, measured (Chromium and
 * WebKit, 9 Oct 2026, work/local/_lab-ceiling-comp.mjs), and 12 dB of overs come out at −1 dBFS.
 * Like any DynamicsCompressorNode it costs 6 ms of latency while it is in.
 */
export const CEILING = Object.freeze({ threshold: -3, knee: 0, ratio: 20, attack: 0.002, release: 0.15 });
const CEILING_MAKEUP_DB = -0.6 * CEILING.threshold * (1 - 1 / CEILING.ratio);

// Shelf/peak corners. Broad and musical rather than surgical — this is for
// balancing a chiptune mix, not repairing a recording.
const EQ_LOW_HZ = 250;
const EQ_MID_HZ = 1200;
const EQ_HIGH_HZ = 4000;

// The shared effect sends. Adding another is adding a line here: the strips grow a
// send for it, the desk grows a page for it, and mix.js stores it — nothing else
// needs to know. `legacy` marks the engine's original tempo-synced echo, whose
// nodes live in audio.js and whose per-voice routing the null test depends on.
// One shared delay and one shared reverb. A second of each was built and measured
// out again: per-channel delay INSERTS turned out to cost almost nothing (8.7ms per
// 20s of audio each, against 165ms for a single convolution reverb — one reverb
// costs about what putting a delay on all 21 channels does), so per-channel delay
// is the better shape for the money and the shared rack stays small.
export const AUXES = [
  // defaultSend 0, like every other aux: a channel is on the delay because its mix
  // says so, not because of the family it belongs to.
  { id: 'delay', name: 'Delay', type: 'delay', legacy: true, defaultSend: 0,
    presetParams: ['division', 'feedback', 'tone'] },
  { id: 'reverb', name: 'Reverb', type: 'reverb', defaultSend: 0,
    presetParams: ['decay', 'preDelay'] },
];

const AUX_FALLBACK_DEFAULTS = {
  delay: { division: 0.75, feedback: 0.35, tone: 4500, level: 1, pan: 0, mute: false, eq: { low: 0, mid: 0, high: 0 } },
  reverb: { decay: 2.2, preDelay: 0.012, level: 1, pan: 0, mute: false, eq: { low: 0, mid: 0, high: 0 } },
};

// Return presets own only the effect-local controls. Routing state remains a mix
// concern, so it stays on the fallback object and is never written by the preset
// authoring route.
export const AUX_DEFAULTS = Object.fromEntries(Object.entries(AUX_FALLBACK_DEFAULTS).map(([id, base]) => {
  const saved = EFFECT_PRESETS.returns?.[id]?.default || {};
  const keys = new Set(AUXES.find((a) => a.id === id)?.presetParams || []);
  const local = Object.fromEntries([...keys]
    .filter((key) => Object.prototype.hasOwnProperty.call(saved, key))
    .map((key) => [key, saved[key]]));
  return [id, { ...base, ...local }];
}));

const defaultSends = () => Object.fromEntries(AUXES.map((a) => [a.id, a.defaultSend]));

// A delay on the channel itself rather than a shared send: each instrument can have
// its own time and feedback, which a single shared bus cannot give you. Bypassed by
// disconnecting rather than by turning down, so a channel at mix 0 costs nothing.

const DEFAULTS = {
  gain: 0, pan: 0, mute: false,
  eq: { low: 0, mid: 0, high: 0 },
  width: 1,
  effects: [],
  send: defaultSends(),
};

/**
 * Mid/side stereo width. width 1 is exactly transparent, 0 collapses to mono, and
 * above 1 pushes the sides out past the speakers.
 *
 *   M = (L+R)/2      L' = M + S·w
 *   S = (L-R)/2      R' = M - S·w
 *
 * At w = 1 that reduces to L' = L and R' = R, so at w = 1 the network is not in the
 * graph at all: the stage is `input → output` and nothing else (2 Oct 2026). Every
 * strip carries one, almost every strip sits at 1, and Chrome VISITS every connected
 * node every quantum whether or not it does anything: measured live, a light song made
 * ~1200 node visits a quantum of which only a few percent did real work, and these
 * eleven nodes a strip were the largest share (work/local/_live-trace-probe.mjs). The
 * network is built the first time a width other than 1 is asked for, and taken out again
 * once the width is back at exactly 1 with nothing scheduled (live contexts only).
 *
 * A path swap is a disconnect and a connect in one task, which the audio thread sees
 * whole — never both paths, never neither — and at w = 1 both paths carry the same
 * signal to within a last-bit rounding, so the swap is inaudible.
 */
function makeWidth(ctx) {
  const input = ctx.createGain();
  input.channelCount = 2; input.channelCountMode = 'explicit'; input.channelInterpretation = 'speakers';
  // The stage's one exit, whichever path feeds it, so nothing downstream rewires.
  const output = ctx.createGain();
  const live = typeof ctx.startRendering !== 'function';
  const clamp = (w) => Math.max(0, Math.min(2, w));

  let ms = null;           // the mid/side network while it is in the graph
  let dropTimer = null;    // live only: the pending return to the bypass
  input.connect(output);

  const buildMs = () => {
    const split = ctx.createChannelSplitter(2);
    const merge = ctx.createChannelMerger(2);
    const mid = ctx.createGain(); mid.gain.value = 1;
    const side = ctx.createGain(); side.gain.value = 1;   // transparent until moved
    const lToM = ctx.createGain(); lToM.gain.value = 0.5;
    const rToM = ctx.createGain(); rToM.gain.value = 0.5;
    const lToS = ctx.createGain(); lToS.gain.value = 0.5;
    const rToS = ctx.createGain(); rToS.gain.value = -0.5;
    split.connect(lToM, 0); split.connect(rToM, 1);
    split.connect(lToS, 0); split.connect(rToS, 1);
    lToM.connect(mid); rToM.connect(mid);
    lToS.connect(side); rToS.connect(side);
    const sPos = ctx.createGain(); sPos.gain.value = 1;
    const sNeg = ctx.createGain(); sNeg.gain.value = -1;
    side.connect(sPos); side.connect(sNeg);
    mid.connect(merge, 0, 0); sPos.connect(merge, 0, 0);   // L = M + S
    mid.connect(merge, 0, 1); sNeg.connect(merge, 0, 1);   // R = M - S
    merge.connect(output);
    input.connect(split);
    try { input.disconnect(output); } catch { /* not wired */ }
    return { side, nodes: [split, merge, mid, side, lToM, rToM, lToS, rToS, sPos, sNeg] };
  };
  const ensureMs = () => {
    if (dropTimer != null) { clearTimeout(dropTimer); dropTimer = null; }
    if (!ms) ms = buildMs();
    return ms;
  };
  // Back to the bypass once the side gain has arrived at 1 and nothing newer is asked.
  const dropMsAfter = (seconds) => {
    if (!ms || !live) return;
    if (dropTimer != null) clearTimeout(dropTimer);
    dropTimer = setTimeout(() => {
      dropTimer = null;
      if (!ms || Math.abs(ms.side.gain.value - 1) > 1e-4) return;
      input.connect(output);
      try { input.disconnect(ms.nodes[0]); } catch { /* not wired */ }
      for (const n of ms.nodes) { try { n.disconnect(); } catch { /* already gone */ } }
      ms = null;
    }, Math.max(0, seconds) * 1000 + 250);
  };

  return {
    input,
    output,
    set(w) {
      const v = clamp(w);
      if (v === 1 && !ms) return;
      const { side } = ensureMs();
      side.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
      // setTargetAtTime approaches and never lands: give it ten time constants, then pin.
      if (v === 1) dropMsAfter(0.3);
    },
    /** The same move at an audio time — see rampParam. */
    ramp(w, when, seconds) {
      const v = clamp(w);
      if (v === 1 && !ms) return;
      const { side } = ensureMs();
      rampParam(ctx, side.gain, v, when, seconds);
      if (v === 1) dropMsAfter(Math.max(0, (when ?? ctx.currentTime) - ctx.currentTime) + (seconds || 0));
    },
    /** Whether the mid/side network is in the graph — for tests and the perf probe. */
    get active() { return !!ms; },
  };
}

/**
 * An effect chain spliced between two points in the graph. Used by every channel
 * strip, by each send, and by the master — the wiring is identical wherever a chain
 * can go, and having one implementation means bypass and reordering behave the same
 * everywhere.
 *
 * With no live effects `from` connects straight to `to`: an empty chain is no node
 * at all, not a node doing nothing.
 */
const EFFECT_SLEEP_POLL_MS = 100;
const EFFECT_SLEEP_FLOOR = 1e-5; // -100dBFS: safely below an audible tail.
const EFFECT_SLEEP_SETTLE_S = 0.12;

/**
 * Long feedback does not need a guessed total tail: the branch meter waits for actual
 * silence. What it must not mistake for a finished tail is the quiet GAP before a delay's
 * next repeat. Add the longest possible memory in each serial link, then require that much
 * continuous silence before unhooking the branch from the destination.
 */
function effectSilenceGap(list = [], bpm = 120) {
  let seconds = EFFECT_SLEEP_SETTLE_S;
  for (const effect of list) {
    if (!effect || effect.bypass) continue;
    const p = effect.params || {};
    if (effect.id === 'delay' || effect.id === 'pingpong' || effect.id === 'chandelay') {
      seconds += delaySeconds(p, bpm);
    } else if (effect.id === 'reverb') {
      seconds += Math.max(0, Number(p.preDelay ?? 0.01) || 0);
    } else if (effect.id === 'spring') {
      // The longest spring mode is just under 80ms; leave a full mode gap before
      // deciding a quiet tank has stopped so a late bounce is never cut by sleeping.
      seconds += 0.1;
    } else if (effect.id === 'chorus') {
      seconds += Math.max(0, Number(p.delayTime ?? 3.5) || 0) / 1000;
    } else if (effect.id === 'chorus2' || effect.id === 'flanger' || effect.id === 'doubler') {
      seconds += Math.max(0, Number(p.delayMs ?? 20) || 0) / 1000 * 2;
    } else if (effect.id === 'pitch') {
      seconds += Math.max(0, Number(p.windowSize ?? 0.1) || 0) * 2;
    } else if (effect.id === 'tape' || effect.id === 'vibrato' || effect.id === 'shifter') {
      seconds += 0.25;
    }
  }
  return seconds;
}

function makeChainSlot(ctx, from, to, { sleepWhenSilent = false } = {}) {
  const inGain = ctx.createGain();
  const outGain = ctx.createGain();
  let chain = [];
  let sourceList = [];
  let sourceBpm = 120;

  // OfflineAudioContext is scheduled in one synchronous walk before it renders. Wall-clock
  // sleeping cannot follow that virtual clock, and an offline graph disappears as soon as
  // its render finishes anyway, so this optimisation is live-context only.
  const canSleep = sleepWhenSilent && typeof ctx.startRendering !== 'function';
  const sleeper = canSleep ? ctx.createAnalyser() : null;
  const sleepSamples = sleeper ? new Float32Array(256) : null;
  let awake = true;
  let pinned = false;
  let holdUntil = 0;
  let quietSince = null;
  let sleepTimer = null;
  let disposed = false;
  if (sleeper) {
    sleeper.fftSize = 256;
    sleeper.smoothingTimeConstant = 0;
    outGain.connect(sleeper);
  }

  const liveLinks = () => chain.filter((l) => !l.bypassed);
  const clearSleepTimer = () => {
    if (sleepTimer != null) clearTimeout(sleepTimer);
    sleepTimer = null;
  };
  const connectOutput = () => {
    if (!sleeper || awake || !liveLinks().length) return;
    sleeper.connect(to);
    awake = true;
  };
  const disconnectOutput = () => {
    if (!sleeper || !awake) return;
    try { sleeper.disconnect(to); } catch { /* already asleep */ }
    awake = false;
  };
  const pollForSilence = () => {
    sleepTimer = null;
    if (disposed || !sleeper || pinned || !awake || !liveLinks().length) return;
    const now = ctx.currentTime;
    if (ctx.state === 'suspended' || now < holdUntil) {
      sleepTimer = setTimeout(pollForSilence,
        Math.max(EFFECT_SLEEP_POLL_MS, Math.ceil((holdUntil - now) * 1000)));
      return;
    }
    sleeper.getFloatTimeDomainData(sleepSamples);
    let peak = 0;
    for (let i = 0; i < sleepSamples.length; i++) peak = Math.max(peak, Math.abs(sleepSamples[i]));
    if (peak > EFFECT_SLEEP_FLOOR) quietSince = null;
    else if (quietSince == null) quietSince = now;
    if (quietSince != null && now - quietSince >= effectSilenceGap(sourceList, sourceBpm)) {
      disconnectOutput();
      return;
    }
    sleepTimer = setTimeout(pollForSilence, EFFECT_SLEEP_POLL_MS);
  };
  const watchForSilence = () => {
    if (!sleeper || pinned || !awake || sleepTimer != null || !liveLinks().length) return;
    sleepTimer = setTimeout(pollForSilence, EFFECT_SLEEP_POLL_MS);
  };

  // A chain EMPTIED is not taken out of the graph until the task ends, and a chain set
  // back to the very same effects before then never left it. That is what applyMix does
  // to every slot on the desk — reset() empties them all, then the mix puts each one back
  // — and it runs on every preset choice, not only on a song change.
  //
  // It used to dispose and rebuild them, and the audio thread does not wait for the task
  // to finish: it renders a quantum against whatever the graph is at that instant, so the
  // ~10ms between reset() and the re-apply was heard. A rebuilt chain with lookahead also
  // starts from an empty delay line — a master of mbCompN (6ms) and l7 (3ms) put 9ms of
  // digital silence across the whole mix on every drum preset picked while the song played
  // (2 Oct 2026, measured: three silent render quanta after every applyMix, none after a
  // re-bank, none after this). A compressor's envelope, a reverb's tail and an LFO's phase
  // went the same way. So the links stay wired and in place, `chain` reads empty, and at
  // the end of the task they are either back in `chain` or unwired and disposed.
  let pending = null;      // { links, bpm, wired }: emptied this task, still in the graph
  const disposeLinks = (links) => {
    for (const link of links) {
      try { link.node.dispose(); } catch { /* fine */ }
      try { link.muteDry.disconnect(); } catch { /* fine */ }
      try { link.muteWet.disconnect(); } catch { /* fine */ }
    }
  };
  // The same effects, settings, bypass and mute, at the same tempo: what a fresh build of
  // `list` would be. Anything less is a different chain and is built new, as it always was.
  const sameChain = (links, linksBpm, list, bpm) => linksBpm === bpm
    && links.length === list.length
    && list.every((e, i) => e && links[i].def?.id === e.id
      && JSON.stringify(links[i].params || {}) === JSON.stringify(e.params || {})
      && !!links[i].bypassed === !!e.bypass && !!links[i].muted === !!e.mute);

  const rewire = () => {
    // Anything that rewires while a chain is pending has unwired it — see `pending`.
    if (pending) pending.wired = false;
    try { from.disconnect(to); } catch { /* not wired */ }
    try { from.disconnect(inGain); } catch { /* not wired */ }
    try { outGain.disconnect(to); } catch { /* not wired */ }
    try { sleeper?.disconnect(to); } catch { /* not wired */ }
    for (const link of chain) {
      try { (link.node.output || link.node).disconnect(); } catch { /* fine */ }
      try { link.muteDry.disconnect(); } catch { /* fine */ }
      try { link.muteWet.disconnect(); } catch { /* fine */ }
    }
    // A bypassed effect is skipped in the wiring, not turned down: one with a tail
    // would keep ringing and you would be comparing against its leftovers.
    const live = liveLinks();
    if (!live.length) { from.connect(to); return; }
    from.connect(inGain);
    // Every live link is spliced in TWICE — once through the effect, once around it —
    // and its mute pair decides which of the two is audible. See setMute for why a
    // mute is a pair of gains where a bypass is a disconnect. The pair sums into
    // whatever comes next exactly as treatDry/treatWet sum into the master trim, so
    // no merge node is needed and an unmuted link is `x * 1 + x * 0`: bit-exact, and
    // the null test says so.
    let prev = [inGain];
    for (const link of live) {
      const dst = link.node.input || link.node;
      for (const p of prev) { Tone.connect(p, dst); Tone.connect(p, link.muteDry); }
      Tone.connect(link.node.output || link.node, link.muteWet);
      prev = [link.muteWet, link.muteDry];
    }
    for (const p of prev) Tone.connect(p, outGain);
    if (!sleeper) outGain.connect(to);
    else if (awake) sleeper.connect(to);
  };
  rewire();

  return {
    rewire,
    get chain() { return chain; },
    set(list = [], bpm = 120) {
      clearSleepTimer();
      // The chain emptied earlier in this task, still wired (see `pending`): the same list
      // puts it back untouched; anything else disposes it and builds below. Only ever the
      // PENDING chain — a set onto a standing chain still builds new, even to the same
      // list, because that is how the desk's audio watchdog replaces a chain a NaN has
      // poisoned (checkAudioHealth).
      if (pending) {
        const p = pending;
        pending = null;
        if (!chain.length && sameChain(p.links, p.bpm, list, bpm)) {
          chain = p.links;
          sourceList = list;
          sourceBpm = bpm;
          pinned = false;
          holdUntil = ctx.currentTime + EFFECT_SLEEP_SETTLE_S;
          quietSince = null;
          if (p.wired) connectOutput();
          else { awake = true; rewire(); }
          watchForSilence();
          return chain.length;
        }
        disposeLinks(p.links);
      }
      // Emptied: `chain` reads empty from here, and the graph is left as it is until the
      // task ends — by when applyMix has usually put the same chain straight back.
      if (!list.length && chain.length) {
        const p = { links: chain, bpm: sourceBpm, wired: true };
        pending = p;
        chain = [];
        sourceList = list;
        sourceBpm = bpm;
        queueMicrotask(() => {
          if (pending !== p) return;
          pending = null;
          awake = true;
          rewire();                 // `from` straight to `to` first, then the old links go
          disposeLinks(p.links);
        });
        return 0;
      }
      disposeLinks(chain);
      sourceList = list;
      sourceBpm = bpm;
      chain = list.map((e) => {
        const link = createEffect(e.id, e.params, ctx, bpm);
        if (link) {
          // What it is set to now — so a transition can tell an effect it would have to
          // MOVE from one it merely has to leave alone (see Audio.rampMix).
          link.params = { ...(e.params || {}) };
          link.bypassed = !!e.bypass;
          link.muted = !!e.mute;
          link.muteDry = ctx.createGain();
          link.muteWet = ctx.createGain();
          link.muteDry.gain.value = link.muted ? 1 : 0;
          link.muteWet.gain.value = link.muted ? 0 : 1;
        }
        return link;
      }).filter(Boolean);
      awake = true;
      pinned = false;
      holdUntil = ctx.currentTime + EFFECT_SLEEP_SETTLE_S;
      quietSince = null;
      rewire();
      watchForSilence();
      return chain.length;
    },
    setBypass(i, on) {
      if (!chain[i]) return;
      chain[i].bypassed = !!on;
      if (liveLinks().length) connectOutput();
      rewire();
      watchForSilence();
    },
    /**
     * MUTE, which is not bypass.
     *
     * Bypass unwires the link: free, instant, and impossible to schedule — a
     * `disconnect()` happens at whatever moment the main thread reaches it, and takes
     * any tail with it. That is the right control for A/B-ing on the desk and the wrong
     * one for a transition, which is why rampMix refuses a bypass change by name.
     *
     * A mute leaves the link wired and cross-fades between the effect and the dry signal
     * running around it. So it costs what the effect costs even while silent — the trade
     * for being a pair of AudioParams, which CAN be aimed at a bar line a quarter of a
     * second from now. That is what lets a cabinet screen carry a phaser the level does
     * not, on the master or on any channel, without a second leg of the whole mix.
     *
     * Equal gain rather than equal power, for the reason rampTreatment gives: the two
     * routes are the same music, so they add arithmetically.
     */
    setMute(i, on, when = null, seconds = 0) {
      const link = chain[i];
      if (!link) return;
      link.muted = !!on;
      const wet = link.muted ? 0 : 1;
      if (when == null) {
        link.muteWet.gain.setTargetAtTime(wet, ctx.currentTime, 0.01);
        link.muteDry.gain.setTargetAtTime(1 - wet, ctx.currentTime, 0.01);
      } else {
        rampParam(ctx, link.muteWet.gain, wet, when, seconds);
        rampParam(ctx, link.muteDry.gain, 1 - wet, when, seconds);
      }
      // Unmuting has to have somewhere to arrive: a slept branch is disconnected from
      // the destination, and the ramp would open onto nothing. Same urgency, and same
      // direction-only reasoning, as a send raised off zero — see wakeAux.
      if (!link.muted) {
        connectOutput();
        holdUntil = Math.max(holdUntil, (when ?? ctx.currentTime) + seconds + EFFECT_SLEEP_SETTLE_S);
        quietSince = null;
        watchForSilence();
      }
    },
    /**
     * The same chain with different settings, played by the nodes already built: each
     * link takes its new params through `set` — the insert panel's live write — and a
     * flipped bypass rewires. Answers false, touching nothing, when the list is not the
     * same effects in the same order; that is a new chain, and `set` builds it.
     */
    retune(list = [], bpm = sourceBpm) {
      if (!Array.isArray(list) || list.length !== chain.length
        || list.some((e, i) => e?.id !== chain[i]?.def?.id)) return false;
      list.forEach((e, i) => {
        const link = chain[i];
        const params = { ...(e.params || {}) };
        const changed = Object.fromEntries(Object.entries(params)
          .filter(([k, v]) => JSON.stringify(link.params?.[k]) !== JSON.stringify(v)));
        if (Object.keys(changed).length) link.set(changed, bpm);
        link.params = params;
        if (!!e.bypass !== !!link.bypassed) {
          link.bypassed = !!e.bypass;
          if (liveLinks().length) connectOutput();
          rewire();
        }
      });
      sourceList = list;
      sourceBpm = bpm;
      quietSince = null;
      watchForSilence();
      return true;
    },
    /** Pull a dormant graph back into the render tree before scheduled audio reaches it. */
    wake(until = ctx.currentTime) {
      if (!sleeper || !liveLinks().length) return;
      if (until === Infinity) pinned = true;
      else holdUntil = Math.max(holdUntil, Number.isFinite(until) ? until : ctx.currentTime);
      quietSince = null;
      connectOutput();
      watchForSilence();
    },
    /** The input has closed; keep measuring until every delayed/reverberant sample is gone. */
    release(when = ctx.currentTime) {
      if (!sleeper || !liveLinks().length) return;
      pinned = false;
      holdUntil = Math.max(holdUntil, Number.isFinite(when) ? when : ctx.currentTime);
      quietSince = null;
      watchForSilence();
    },
    dispose() {
      disposed = true;
      clearSleepTimer();
      disposeLinks(chain);
      if (pending) disposeLinks(pending.links);
      pending = null;
      chain = [];
      try { from.disconnect(inGain); } catch { /* not wired */ }
      try { from.disconnect(to); } catch { /* not wired */ }
      try { outGain.disconnect(); } catch { /* not wired */ }
      try { sleeper?.disconnect(); } catch { /* not wired */ }
    },
    get awake() { return !sleeper || awake; },
  };
}

/**
 * One silent source per context, for makeSectionSwitch to wire into a switch it needs kept
 * rendering. A constant through a gain of zero rather than a constant of zero: a gain at
 * zero marks what it sends as SILENCE, which the nodes after it are entitled to skip the
 * work for, where a constant of zero is a signal like any other. Adds exact zeros. Its CPU
 * on a held lane between hits has not been measured.
 *
 * Live only, like the effect sleeper: an offline render was measured switching on time
 * without it (work/local/_rhythm-clap-fx-probe.mjs), and a render is left as it was.
 * WebKit plays the switch right without it too, measured; it is harmless there.
 */
const KEEP_ALIVE = new WeakMap();
function keepAlive(ctx) {
  if (typeof ctx.startRendering === 'function' || typeof ctx.createConstantSource !== 'function') return null;
  let out = KEEP_ALIVE.get(ctx);
  if (!out) {
    const source = ctx.createConstantSource();
    out = ctx.createGain();
    out.gain.value = 0;
    source.connect(out);
    source.start();
    KEEP_ALIVE.set(ctx, out);
  }
  return out;
}

/**
 * BAR-EFFECT SECTIONS — the switch that sends a stretch of a track, or of the whole mix,
 * through an effect chain of its own (src/data/automation.js: a lane's `fx`, and the
 * per-bar `inlineFx` snapshot before it).
 *
 * Every chain the song asks for is built in parallel before playback, and the switch
 * changes which one RECEIVES audio — the inputs, never the outputs. So what is already
 * inside a chain when its section ends rings out (a delay's repeats, a room's tail), and
 * nothing has to be built while the song is playing. With no section selected the direct
 * path is unity and every branch input is zero: `x * 1`, bit-exact, which is what lets a
 * strip or the master carry one of these whether or not a song ever uses it.
 *
 * The other half is WHEN. An effect that cares when its section starts and ends — the
 * Stutter grabs its slice at the one and lets go at the other — is told by `engage` and
 * `disengage`, and told again for a FRESH section of the same chain: two sections side by
 * side with one chain are two grabs, where switching from a chain to itself is otherwise
 * nothing at all.
 *
 * And the switch has to be RENDERED to switch. Chromium stops rendering a chain whose
 * sources have all gone — a drum lane between hits, once the last hit's nodes are
 * disconnected — and a param on a node it is not rendering does not move. When the next
 * hit wakes the chain, an automation that started and finished while it slept is thrown
 * away and the param keeps the value it had before: a section ending in a gap between hits
 * never switched off. That was rhythm's clap (7 Oct 2026): a bar-2 ping-pong on every clap
 * after it, live only. So a switch with branches is held awake by a silent source — see
 * keepAlive.
 */
function makeSectionSwitch(ctx, from, to) {
  const direct = ctx.createGain();
  direct.gain.value = 1;
  from.connect(direct);
  direct.connect(to);
  const branches = new Map();
  let heldAwake = false;
  const holdAwake = (on) => {
    const source = keepAlive(ctx);
    if (!source || on === heldAwake) return;
    heldAwake = on;
    if (on) source.connect(from);
    else try { source.disconnect(from); } catch { /* not wired */ }
  };
  // The initial graph is already direct. Do not schedule a no-op ramp at bar one:
  // OfflineAudioContext receives the whole song's automation before rendering and
  // Chromium can otherwise resolve a later cancel-and-hold through that redundant
  // first event, attenuating the opening direct bar. This also avoids touching the
  // graph between adjacent bars that use the same snapshot.
  let selected = '';
  const live = (signature) => (branches.get(signature)?.slot.chain || []).filter((link) => !link.bypassed);
  const sw = {
    /** Pre-create every route before the scheduler needs to select it. */
    prepare(chains = [], bpm = 120) {
      for (const list of chains) {
        if (!Array.isArray(list) || !list.length) continue;
        const signature = JSON.stringify(list);
        if (branches.has(signature)) continue;
        const input = ctx.createGain(); input.gain.value = 0;
        from.connect(input);
        const slot = makeChainSlot(ctx, input, to, { sleepWhenSilent: true });
        slot.set(list, bpm);
        branches.set(signature, { input, slot, list });
      }
      if (branches.size) holdAwake(true);
    },
    /**
     * Select a prepared route at an audio time; deselected routes keep ringing out.
     * `fresh` says a section STARTS here, `sixteenth` is the sequencer's — what a
     * Stutter measures its slice in — and `since` and `until` are when the section began
     * and ends: where a TAPE STOP stands still, and what a Filter's SWEEP runs between.
     */
    select(list = [], when = ctx.currentTime, { fresh = false, sixteenth = null, until = null, since = null } = {}) {
      const signature = Array.isArray(list) && list.length ? JSON.stringify(list) : '';
      if (signature && !branches.has(signature)) sw.prepare([list]);
      if (signature === selected) {
        if (fresh && signature) {
          const at = Math.max(Number.isFinite(when) ? when : 0, ctx.currentTime);
          for (const link of live(signature)) link.engage?.(at, sixteenth, until, since);
        }
        return;
      }
      const previous = selected;
      selected = signature;
      if (signature) branches.get(signature)?.slot.wake(Infinity);
      // We know both sides of this switch. Anchor them explicitly instead of using
      // cancelAndHoldAtTime: an offline render queues later bars before processing
      // bar one, and Chromium's future hold can leak backwards through that queue.
      // Four milliseconds is the same click-safe edge rampParam uses for a snap.
      const at = Math.max(Number.isFinite(when) ? when : 0, ctx.currentTime);
      const switchGain = (param, a, b) => {
        param.cancelScheduledValues(at);
        param.setValueAtTime(a, at);
        param.linearRampToValueAtTime(b, at + 0.004);
      };
      switchGain(direct.gain, previous ? 0 : 1, signature ? 0 : 1);
      for (const [id, branch] of branches) {
        switchGain(branch.input.gain, id === previous ? 1 : 0, id === signature ? 1 : 0);
      }
      if (previous) {
        for (const link of live(previous)) link.disengage?.(at);
        branches.get(previous)?.slot.release(at + 0.004);
      }
      if (signature) for (const link of live(signature)) link.engage?.(at, sixteenth, until, since);
    },
    /**
     * A chain's settings moved while it may be playing — the Spot FX editor's knobs. The
     * branch built for `oldList` takes `newList`'s params on its own nodes and is filed
     * under the new signature, so a drag is heard at once, keeps the tail it has, and does
     * not re-grab a Stutter; building a fresh branch per value would do all three wrong.
     * False when there is no such branch, the new chain already has one, or the effects
     * themselves differ — then the next `prepare`/`select` builds it as usual. A section
     * elsewhere that still plays `oldList` gets its own branch back from the next prepare.
     */
    retune(oldList = [], newList = [], bpm = 120) {
      const from = JSON.stringify(oldList || []);
      const to = JSON.stringify(newList || []);
      if (from === to) return true;
      const branch = branches.get(from);
      if (!branch || branches.has(to) || !Array.isArray(newList) || !newList.length) return false;
      if (!branch.slot.retune(newList, bpm)) return false;
      branches.delete(from);
      branches.set(to, { ...branch, list: newList });
      if (selected === from) selected = to;
      return true;
    },
    /**
     * The song has stopped: let go of whatever is engaged over `seconds` — the stop's own
     * fade — and go back to direct once it has. A Stutter is downstream of the gates a
     * stop closes, so nothing else would ever stop its loop.
     */
    release(at = ctx.currentTime, seconds = 0) {
      if (!selected) return;
      const t = Math.max(Number.isFinite(at) ? at : 0, ctx.currentTime);
      for (const link of live(selected)) link.disengage?.(t, seconds);
      sw.select([], t + seconds);
    },
    get slots() { return [...branches.values()].map((branch) => branch.slot); },
    get links() { return [...branches.values()].flatMap((branch) => branch.slot.chain || []); },
    /** A new song owns a new set of chains; do not accumulate the last song's graphs. */
    clear() {
      selected = '';
      direct.gain.cancelScheduledValues(ctx.currentTime);
      direct.gain.value = 1;
      for (const branch of branches.values()) {
        branch.slot.dispose();
        try { from.disconnect(branch.input); } catch { /* already gone */ }
        try { branch.input.disconnect(); } catch { /* already gone */ }
      }
      branches.clear();
      holdAwake(false);
    },
  };
  return sw;
}

/** Three serial shelving/peaking filters — transparent at 0dB. */
function makeEq(ctx) {
  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf'; low.frequency.value = EQ_LOW_HZ; low.gain.value = 0;
  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking'; mid.frequency.value = EQ_MID_HZ; mid.Q.value = 0.9; mid.gain.value = 0;
  const high = ctx.createBiquadFilter();
  high.type = 'highshelf'; high.frequency.value = EQ_HIGH_HZ; high.gain.value = 0;
  low.connect(mid); mid.connect(high);
  return {
    input: low,
    output: high,
    set({ low: l, mid: m, high: h } = {}) {
      if (l != null) low.gain.value = l;
      if (m != null) mid.gain.value = m;
      if (h != null) high.gain.value = h;
    },
    /** The same move at an audio time — see rampParam. */
    ramp({ low: l, mid: m, high: h } = {}, when, seconds) {
      if (l != null) rampParam(ctx, low.gain, l, when, seconds);
      if (m != null) rampParam(ctx, mid.gain, m, when, seconds);
      if (h != null) rampParam(ctx, high.gain, h, when, seconds);
    },
  };
}

// Reverb is convolution with a generated impulse response — ours, from
// `makeReverb` in effects.js, not Tone.Reverb.
//
// Tone's builds the same kind of impulse and builds it from `Math.random`, which
// made every render of every song carrying reverb a different file: two renders of
// plumber measured 1.2e-1 apart, against a null-test tolerance of 5e-6. Stems
// stopped summing to the mix they came from, and no baseline could ever match one.
// Ours seeds the noise, which also makes a decay change immediate instead of a
// promise to await.
//
// A hand-built Schroeder network (comb + allpass, the Freeverb topology) was tried
// here to get roomSize/damping controls and cut the cost. It lost on both counts:
// measured at 43.7% over an idle mix against convolution's 31.7%, and its comb bank
// ran away to NaN above roomSize 0.4. Tone.Freeverb is not an option either — it
// renders SILENCE in an OfflineAudioContext (measured peak 0.000), because it needs
// an AudioWorklet, which also needs a secure context and so would fail both the
// render pipeline and the LAN dev server on a phone.
//
// So: decay and pre-delay from the reverb itself, and the send's own 3-band return
// EQ for tone-shaping the tail — which is what a damping control does in practice.

/** A tempo-syncable feedback delay, mirroring the engine's original echo chain. */
function makeDelay(ctx) {
  const input = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
  const line = ctx.createDelay(MAX_DELAY_SECONDS); line.delayTime.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3600;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  input.connect(hp); hp.connect(line); line.connect(lp); lp.connect(fb); fb.connect(line);
  return {
    input,
    output: lp,
    state: { division: 0.5, feedback: 0.28, tone: 3600 },
    set(bpm, { division, feedback, tone } = {}) {
      const t = ctx.currentTime;
      if (division != null) this.state.division = division;
      if (feedback != null) this.state.feedback = Math.max(0, Math.min(0.95, feedback));
      if (tone != null) this.state.tone = Math.max(200, Math.min(ctx.sampleRate / 2, tone));
      line.delayTime.setTargetAtTime(Math.min(0.9, (60 / (bpm || 120)) * this.state.division), t, 0.05);
      fb.gain.setTargetAtTime(this.state.feedback, t, 0.05);
      lp.frequency.setTargetAtTime(this.state.tone, t, 0.05);
    },
  };
}

/**
 * Build one strip per lane plus the shared master chain.
 *
 * @param {BaseAudioContext} ctx
 * @param {object} buses  { musicBus, echoBus, master, destination } — all created by audio.js.
 *                        The strips feed musicBus/echoBus, so the existing echo
 *                        topology is untouched; `master` is re-routed through the
 *                        song master trim and limiter to `destination`.
 * @returns {{ lane(key): Strip, setMasterTrim(db), lanes: string[], setAux(), limiter, ready: Promise }}
 */
// Delay time as a fraction of a beat — the same musical lengths every other synced
// effect offers. The engine has always run a dotted eighth (the YMCK-style bounce
// the songs were written against), so that stays the default.
export const DELAY_DIVISIONS = TEMPO_DIVISIONS;

export function createMixer(ctx, {
  musicBus, echoBus, master, destination = ctx.destination, songTrim, delayLp, metered = true,
}) {
  Tone.setContext(ctx);

  /*
   * Display meters serve the desk. Gameplay opts out; offline always opts out.
   *
   * Every strip, every aux and the master carry a Tone.Meter — a Gain, a
   * ChannelSplitter and an AnalyserNode each — plus a zero-gain sink wired to
   * ctx.destination purely to guarantee the analyser is PULLED (a terminal analyser is
   * not). On this song that is a hundred analysers doing real per-block work for a
   * value that, in a bounce, nothing ever calls getValue() on: the only readers are the
   * desk's own UI in tools/mixer-entry.js.
   *
   * So offline they are not built at all, and the readers return 0. Nothing else in the
   * engine consults them, and a gain-0 contribution sums to the same float either way,
   * so the render is unchanged — which tests/null-test.js is the proof of.
   */
  const metersEnabled = metered && typeof ctx.startRendering !== 'function';
  const makeMeter = (source, opts) => {
    if (!metersEnabled) return null;
    const m = new Tone.Meter({ normalRange: true, smoothing: 0.6, ...opts });
    Tone.connect(source, m);
    const sink = ctx.createGain();
    sink.gain.value = 0;
    Tone.connect(m, sink);
    sink.connect(ctx.destination);
    return m;
  };

  // Every aux returns to songTrim, not musicBus, so a return is scaled by the
  // song's own musicTrim exactly as the original echo always was. Returning some
  // effects pre-trim and some post would make a song's trim change its wet/dry
  // balance, which is the sort of thing you chase for an hour.
  const auxReturn = songTrim || musicBus;
  const auxes = new Map();
  // The Noise Gate and the rewind tap run in the engine's own worklets, which have to be
  // registered on this context before a node can be built. Started here, with the
  // context, and awaited by every offline render through `ready` — so a bounce builds
  // its gates on the worklet from the first sample. Resolves false, never rejects, where
  // no worklet can run.
  const readyPromises = [prepareEngineWorklets(ctx)];

  for (const def of AUXES) {
    const d = AUX_DEFAULTS[def.id];
    const eq = makeEq(ctx);
    const level = ctx.createGain();
    level.gain.value = d.level;
    // Explicit stereo before the panner, exactly as a lane strip does it: a mono
    // return through a StereoPannerNode at centre would come back 3dB down, where a
    // stereo one passes at unity. See the pan note at the top of this file.
    level.channelCount = 2;
    level.channelCountMode = 'explicit';
    level.channelInterpretation = 'speakers';
    const panner = ctx.createStereoPanner();
    panner.pan.value = d.pan;
    // Monitoring only: mute and solo move this, never the level the mix was set to.
    const monitor = ctx.createGain();
    monitor.gain.value = 1;
    level.connect(panner);
    panner.connect(monitor);
    monitor.connect(auxReturn);
    // A chain on the send itself — a chorus on the reverb return, a filter on the
    // echo — which is a different thing from putting it on every channel feeding it.
    const auxSlot = makeChainSlot(ctx, eq.output, level);

    let input, engine = null, reverb = null;
    if (def.legacy) {
      // The engine's own echo: audio.js owns the nodes and retunes them on every
      // bank change. Splice this aux's EQ and level into its return leg.
      input = echoBus;
      if (delayLp) { try { delayLp.disconnect(auxReturn); } catch { /* not yet wired */ } }
      if (delayLp) delayLp.connect(eq.input);
    } else if (def.type === 'delay') {
      engine = makeDelay(ctx);
      input = engine.input;
      engine.output.connect(eq.input);
    } else {
      // Ours rather than Tone.Reverb: same convolution, but the impulse response is
      // generated from a fixed seed instead of Math.random, so a song renders to the
      // same file twice and a stem sums back into its mix. See makeReverb.
      reverb = makeReverb(ctx, { decay: d.decay, preDelay: d.preDelay, wet: 1 });
      input = ctx.createGain();
      input.connect(reverb.input);
      reverb.output.connect(eq.input);
      readyPromises.push(reverb.ready);
    }

    // Metered on the way IN, not on the return. The question a send strip has to
    // answer is "is anything actually going into this", and metering the return
    // would keep the convolver alive against pruneAuxes below — a meter is only
    // pulled if it has a path to the destination, and that path would drag the
    // reverb along with it. Nothing downstream of `input` is pulled by this.
    const meter = makeMeter(input);

    auxes.set(def.id, {
      def, input, eq, level, panner, monitor, engine, reverb, meter,
      active: true, slot: auxSlot,
      state: JSON.parse(JSON.stringify(d)),
    });
  }

  const strips = new Map();
  const soloed = new Set();
  // Soloing a BUS is a different question from soloing a channel: it asks to hear
  // the returns alone, so the channels stay wired into their sends and only their
  // dry path is silenced. That is why each strip has a monitor gain after the send
  // taps — muting at the fader would take the sends down with it.
  const soloedAux = new Set();

  // ---- GROUP BUSES (src/data/group-buses.js) ------------------------------------------
  //
  // A channel routed into a group stops feeding the music bus: its `monitor` — the last
  // node on the strip, after the EQ, inserts, fader and width, and after the send taps —
  // feeds the group's input instead, and nothing else about the strip changes. The group
  // sums its members and runs them through, in this order:
  //
  //   input → EQ → insert chain → Spot FX sections → fader → pan → monitor → musicBus
  //
  // The fader comes AFTER the inserts, as a channel's does, so a bus compressor's drive does
  // not move when the group is turned down; the sections sit after the inserts as the
  // master's do. Out into musicBus, the same place every channel goes, so the game's own
  // ducks on that bus still reach a grouped track.
  //
  // MUTE is a broadcast, not a node: the sends tap each member's fader, upstream of the
  // group, so silencing the group's output would leave its members' echo and reverb
  // playing. Muting a group mutes its members' faders instead, on a flag of their own —
  // a member's level is `!laneMute && !groupMuted`, and the lane's own mute, which is what
  // is saved, is never written. SOLO is the channel solo, widened: a soloed group is heard
  // the way a soloed channel is, members and their sends, and composes with channel solo.
  //
  // Built only when a track is first routed into it, so a song with no groups has no group
  // nodes at all and renders the samples it always did. Its insert chain is loaded while
  // it has members and emptied when the last one leaves — the settings stay in its state
  // for the next — rather than left to sleep on silence: a sleeping chain is woken only by
  // the sequencer's notes, and a desk preview through a grouped track would find it asleep.
  // The master's and the returns' chains do not sleep either, for the same reason.
  const routes = new Map();                        // lane key → group id
  const soloedGroups = new Set();
  const groupBuses = new Map();                    // group id → built bus
  const groupState = new Map(GROUP_IDS.map((id) => [id, groupSettings(null)]));
  const pendingGroupSections = new Map();          // group id → chains to prepare once built
  let groupBpm = 120;

  const anySolo = () => soloed.size > 0 || soloedGroups.size > 0;
  const soloHeard = (key) => soloed.has(key) || soloedGroups.has(routes.get(key));
  const applySoloAll = () => { for (const s of strips.values()) s._applySolo(); };

  const applyGroupLevel = (bus) => {
    const st = groupState.get(bus.id);
    bus.fader.gain.cancelScheduledValues(ctx.currentTime);
    bus.fader.gain.value = dbToGain(st.gain);
    bus.panner.pan.cancelScheduledValues(ctx.currentTime);
    bus.panner.pan.value = Math.max(-1, Math.min(1, st.pan || 0));
  };

  const ensureGroupBus = (id) => {
    if (!groupState.has(id)) return null;
    let bus = groupBuses.get(id);
    if (bus) return bus;
    const input = ctx.createGain();
    input.channelCount = 2;
    input.channelCountMode = 'explicit';
    input.channelInterpretation = 'speakers';
    const eq = makeEq(ctx);
    input.connect(eq.input);
    const sectionIn = ctx.createGain();
    const fader = ctx.createGain();
    // Explicit stereo into the panner, exactly as a lane does it: see the pan note above.
    fader.channelCount = 2;
    fader.channelCountMode = 'explicit';
    fader.channelInterpretation = 'speakers';
    const panner = ctx.createStereoPanner();
    const monitor = ctx.createGain();
    const slot = makeChainSlot(ctx, eq.output, sectionIn);
    const sections = makeSectionSwitch(ctx, sectionIn, fader);
    fader.connect(panner);
    panner.connect(monitor);
    monitor.connect(musicBus);
    bus = { id, input, eq, slot, sections, fader, panner, monitor, active: false, meter: null, meterSink: null };
    groupBuses.set(id, bus);
    const st = groupState.get(id);
    eq.set(st.eq);
    applyGroupLevel(bus);
    const pending = pendingGroupSections.get(id);
    if (pending?.length) sections.prepare(pending, groupBpm);
    if (soloedAux.size) monitor.gain.value = 0;
    return bus;
  };

  /**
   * Each built group, active or not by whether anything is routed into it. An active one
   * has its insert chain loaded (from its state, or rebuilt from it when `rebuild` says the
   * chain itself changed) and a meter; an empty one has neither. A meter is pulled through
   * a muted sink to the destination, so one left on an empty group is a branch the browser
   * processes for nothing.
   */
  const syncGroups = ({ rebuild = false } = {}) => {
    const counts = new Map();
    for (const id of routes.values()) counts.set(id, (counts.get(id) || 0) + 1);
    for (const [id, bus] of groupBuses) {
      const active = (counts.get(id) || 0) > 0;
      if (rebuild || active !== bus.active) {
        bus.slot.set(active ? groupState.get(id).effects : [], groupBpm);
        bus.active = active;
      }
      if (!metersEnabled) continue;
      if (active && !bus.meter) {
        bus.meter = new Tone.Meter({ normalRange: true, smoothing: 0.6, channelCount: 2 });
        Tone.connect(bus.panner, bus.meter);
        bus.meterSink = ctx.createGain();
        bus.meterSink.gain.value = 0;
        Tone.connect(bus.meter, bus.meterSink);
        bus.meterSink.connect(ctx.destination);
      } else if (!active && bus.meter) {
        try { Tone.disconnect(bus.panner, bus.meter); } catch { /* already gone */ }
        try { bus.meterSink.disconnect(); } catch { /* already gone */ }
        try { bus.meter.dispose(); } catch { /* already gone */ }
        bus.meter = null;
        bus.meterSink = null;
      }
    }
  };

  /** Every member's group mute, from the groups' own state. */
  const broadcastGroupMute = () => {
    for (const [key, s] of strips) s._setGroupMute(!!groupState.get(routes.get(key))?.mute);
  };

  /**
   * Point one lane at a group, or back at the mix (`id` null). Instant with no `seconds`
   * — loading a song, applying a mix, an offline render — and a short equal-gain
   * crossfade with them, for a channel moved by hand while it plays.
   */
  const routeLane = (key, id, { seconds = 0, when = ctx.currentTime } = {}) => {
    const strip = strips.get(key);
    if (!strip) return;
    const target = id && groupState.has(id) ? id : null;
    if ((routes.get(key) || null) === target) return;
    const bus = target ? ensureGroupBus(target) : null;
    if (target) routes.set(key, target); else routes.delete(key);
    strip._route(bus ? bus.input : musicBus, { seconds, when });
    strip._setGroupMute(!!(target && groupState.get(target).mute));
    strip._applySolo();
  };

  const applyMonitoring = () => {
    const busSolo = soloedAux.size > 0;
    for (const s of strips.values()) s._monitor(busSolo ? 0 : 1);
    // A group's output is a dry path like a channel's: soloing a return silences it too.
    for (const bus of groupBuses.values()) bus.monitor.gain.setTargetAtTime(busSolo ? 0 : 1, ctx.currentTime, 0.01);
    for (const a of auxes.values()) {
      const heard = busSolo ? soloedAux.has(a.def.id) : !a.state.mute;
      a.monitor.gain.setTargetAtTime(heard ? 1 : 0, ctx.currentTime, 0.01);
    }
  };

  /**
   * Put one aux's return back in the mix, if `pruneAuxes` had taken it out.
   *
   * The counterpart to pruning, and the half that was missing: an aux nothing sent to
   * was unhooked from the return, and only a whole `applyMix` ever hooked it back up.
   * So raising a channel's reverb from zero made no sound at all — the send was live,
   * the convolver was running, and its return was not connected to anything. It came
   * back the moment something re-applied the mix, which on the desk meant holding A/B
   * and letting go. That is the bug, not a slow impulse response.
   *
   * Called from `setSend` rather than by a prune sweep, because waking is the urgent
   * direction: an aux that has just become unused is merely costing CPU until the next
   * apply, but an aux that has just become used is silence where you asked for a sound.
   */
  const wakeAux = (id) => {
    const a = auxes.get(id);
    if (!a || a.active) return;
    a.active = true;
    a.monitor.connect(auxReturn);
  };

  /**
   * Build one channel strip and put it in `strips`.
   *
   * A function rather than the loop body it used to be, because the engine's LANES is
   * no longer the whole list: a LAYER is a lane that arrives with the mix, and the
   * first moment it can be given a strip is applyMix. Everything below is unchanged —
   * a layer's strip is an ordinary strip, wired the same way, so nothing downstream
   * has to know which kind it got. See `ensureLane`.
   */
  const makeStrip = (key) => {
    // Dry input: every voice in the lane connects here. Forced to explicit stereo
    // so the panner downstream always sees two channels — see the pan note above.
    const dry = ctx.createGain();
    dry.channelCount = 2;
    dry.channelCountMode = 'explicit';
    dry.channelInterpretation = 'speakers';
    // Wet input: the inlet the engine's per-voice echo flag has always aimed at.
    // Nothing downstream of it here — the delay send taps the WHOLE lane now, see
    // below — but it stays because it is the destination `lane()` hands to every
    // voice, and because without a mixer (headless renders, before ensure()) that
    // destination is the shared echoBus and the flag still does its old job.
    const wet = ctx.createGain();

    // The gate and the fader are two nodes, not one, and the line between them is the
    // line this whole file already draws: SOLO IS MONITORING AND IS NEVER SAVED; MUTE IS
    // PART OF THE MIX AND IS.
    //
    // `vol` is the GATE, and solo alone owns it: 1 or 0, written with `.value`, because
    // solo has to be instant and it fires on every strip at once.
    // `pres` is the LEVEL — the fader and the mute together, since a mute is only a
    // fader all the way down — and it is the one place a scheduled ramp ever lands.
    //
    // Putting mute on the gate instead looks reasonable and is wrong, which cost an
    // afternoon: applyMix arms a treatment through setMute and a transition leaves it
    // through a ramp, so a lane the cabinet screen silenced was muted on one node and
    // un-muted on the other, and never came back when the level started.
    //
    // They were one node to begin with, which had the matching problem from the other
    // side: soloing any channel rewrote the same AudioParam a transition was ramping.
    // Multiplied together they are the value that node held — a gate of 1 times the
    // fader is the fader — so splitting them is a pass-through change.
    const vol = ctx.createGain();
    vol.gain.value = 1;
    // The ARRANGEMENT's level line — a fade, a crossfade, a track brought down under
    // itself (see src/data/automation.js). A node of its own, between the gate and the
    // fader, for the same reason the gate and the fader are two: each param has exactly
    // one writer. The sequencer writes this one and nothing else ever does, so a fader
    // move, a mute, a solo or a cabinet transition ramping `pres` can never land on top
    // of a fade that is halfway down. Upstream of the send taps, so the echo and reverb
    // a channel sends follow its fade rather than ringing on at full level.
    //
    // At unity it is a multiply by one, which is exact — every song with no automation
    // renders the samples it always did.
    const auto = ctx.createGain();
    auto.gain.value = 1;
    const pres = ctx.createGain();
    pres.gain.value = 1;
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;

    const laneEq = makeEq(ctx);

    const widthNode = makeWidth(ctx);

    // Monitoring only, and last in the chain: soloing a send has to silence the dry
    // path AFTER the send taps below, or the bus you soloed goes quiet along with
    // everything feeding it. Never written to a mix.
    const monitor = ctx.createGain();
    monitor.gain.value = 1;

    // The channel path, in a DAW's order (2 Oct 2026):
    //   Spot FX sections → EQ → insert chain → gate → automation → fader → [sends] → pan → width
    // EQ and inserts are pre-fader, so the sends hear the processed channel — a gated pad
    // sends a gated pad to the reverb — and a fader move or a fade never changes how hard
    // a compressor or a distortion is driven. Pan follows the send taps, so a send is
    // unpanned whatever the channel's pan. It used to be fader → pan → EQ → inserts with
    // the sends tapping the fader, which meant no insert ever reached a send.
    // Bar-scoped inserts switch their INPUTS, never their outputs. The direct input
    // and every distinct effect snapshot are built in parallel before the live strip;
    // at a bar edge only one receives new audio. Turning a branch off therefore stops
    // later notes entering it while delay/reverb already inside keeps its natural tail.
    const pre = ctx.createGain();
    const barSwitch = makeSectionSwitch(ctx, dry, pre);
    // Frozen PCM has already passed through its bar-effect snapshots, but nothing on
    // the live channel. It enters after those branches and before EQ/inserts/fader/pan.
    const frozen = ctx.createGain();
    frozen.connect(pre);
    pre.connect(laneEq.input);
    vol.connect(auto);
    auto.connect(pres);
    pres.connect(panner);
    panner.connect(widthNode.input);
    widthNode.output.connect(monitor);
    // The strip's only route to the mix: the music bus, or the group it is routed into.
    // `routeTo` is where `monitor` goes now, and the only thing a group assignment moves.
    let routeTo = musicBus;
    let routeFade = null;                 // a live reassignment's crossfade, while it runs
    monitor.connect(routeTo);

    // One send per aux, all tapping `pres` — post-gate, post-fader — so a send node
    // carries the send AMOUNT and nothing else.
    //
    // The legacy delay used to tap `dry`, pre-fader, and multiply the fader back into
    // its own gain to compensate, while every other aux tapped `vol` and got the fader
    // for free. Two routes to the same place by different arithmetic, and both of them
    // meant mute and solo had to reach into the send gains to silence a channel.
    // Tapping the fader's OUTPUT makes the gate and the fader implicit for every aux
    // equally, so nothing has to reach into a send gain to silence a channel — which is
    // what lets a ramped send survive you hitting solo. See the note where vol and pres
    // are built.
    //
    // It used to tap `wet`, which is fed only by voices whose own echo flag is set,
    // and that made the send a control you could not trust: a lane the engine keeps
    // dry (percussion, vox), or one carrying a preset that declares itself dry
    // (`addShopOrgan`, `shopOrgan2`), had nothing arriving at the send and the knob
    // did nothing at any position. Every channel can reach the delay now; a channel
    // that should not is a send at zero, which is a thing you can see.
    //
    // A send at ZERO is not connected to its aux (2 Oct 2026). Chrome visits every node
    // with a path to the destination every quantum, so two idle send gains a strip were
    // two more visits a strip for nothing. `linkSend` connects one the moment its amount
    // leaves zero — at call time, before any ramp it starts — and `unlinkSend` takes it
    // out when it is set to zero, or (live only) once a ramp down to zero has finished.
    const sends = new Map();
    const sendLinked = new Map();
    const sendDrop = new Map();
    const linkSend = (id) => {
      const t = sendDrop.get(id);
      if (t != null) { clearTimeout(t); sendDrop.delete(id); }
      if (sendLinked.get(id)) return;
      sends.get(id).connect(auxes.get(id).input);
      sendLinked.set(id, true);
    };
    const unlinkSend = (id) => {
      if (!sendLinked.get(id)) return;
      try { sends.get(id).disconnect(auxes.get(id).input); } catch { /* not wired */ }
      sendLinked.set(id, false);
    };
    const unlinkSendAfter = (id, seconds) => {
      if (typeof ctx.startRendering === 'function') return;   // offline keeps it wired
      const t = sendDrop.get(id);
      if (t != null) clearTimeout(t);
      sendDrop.set(id, setTimeout(() => {
        sendDrop.delete(id);
        if (sends.get(id).gain.value === 0) unlinkSend(id);
      }, Math.max(0, seconds) * 1000 + 100));
    };
    for (const def of AUXES) {
      const g = ctx.createGain();
      g.gain.value = def.defaultSend;
      pres.connect(g);
      sends.set(def.id, g);
      sendLinked.set(def.id, false);
      if (def.defaultSend > 0) linkSend(def.id);
    }

    // A channel insert is pulled only while this lane is producing audio or an actual
    // tail. `wakeEffects` below is called by the sequencer before notes and frozen PCM.
    const slot = makeChainSlot(ctx, laneEq.output, vol, { sleepWhenSilent: true });

    // The meter taps post-pan. It also runs into a muted sink that reaches the
    // destination: a terminal analyser is not guaranteed to be pulled by the graph,
    // and a meter that only sometimes moves is worse than none.

    const meter = makeMeter(widthNode.output);

    const state = {
      ...DEFAULTS,
      eq: { ...DEFAULTS.eq },
      width: 1,
      effects: [],
      send: { ...defaultSends() },
    };

    // A presentation transition writes AudioParams into the future. Keep the
    // corresponding public state in that same future, rather than leaving a
    // treatment's mute flag behind after its fader has already opened. The scheduler
    // commits these values from scheduleEffects(); manual setters cancel only the
    // fields whose AudioParams they take back, so a user edit during a crossfade wins.
    const pendingState = new Map();
    const queueState = (at, key, value) => pendingState.set(key, { at, value });
    const cancelState = (...keys) => { for (const key of keys) pendingState.delete(key); };
    const commitState = (at) => {
      for (const [key, item] of pendingState) {
        if (at + 1e-9 < item.at) continue;
        if (key === 'eq') Object.assign(state.eq, item.value);
        else if (key.startsWith('send:')) state.send[key.slice(5)] = item.value;
        else state[key] = item.value;
        pendingState.delete(key);
      }
    };

    // Solo is a monitoring state, so it is resolved here rather than by Tone's
    // global solo bus: the wet path has to follow it too, and it must never be
    // written into a saved mix.
    //
    // It reaches ONLY the gate, and the gate is upstream of both the fader and the send
    // taps — so silencing a channel silences its sends without this writing them, and
    // without stepping on a ramp a transition has scheduled there.
    const soloGain = () => ((anySolo() && !soloHeard(key)) ? 0 : 1);
    const applySolo = () => {
      vol.gain.value = soloGain() * liveLevel;
    };

    // A LIVE level on the same gate (6 Oct 2026): a performer's fader, mute or solo — the
    // Lab club's mixer — multiplied in with the desk's solo. On the gate, not `monitor`,
    // because the gate is upstream of the send taps: a part pulled down takes its echo and
    // reverb with it, where `monitor` left them ringing on. Playback only, like solo; never
    // in a mix, and 1 (a multiply by one) whenever nobody is playing it.
    let liveLevel = 1;

    // A GROUP's mute, broadcast into its members (see the group buses above). Held apart
    // from `state.mute`, which is the lane's own and is what gets saved: a lane muted by
    // hand stays muted through its group's mute and unmute, and one muted only by its
    // group never gains a mute it did not have.
    let groupMuted = false;

    // The fader, with the mute folded in — one param, so a mix and a transition move a
    // lane's level through the same door whichever of the two things they are changing.
    const applyLevel = () => {
      pres.gain.cancelScheduledValues(ctx.currentTime);
      pres.gain.value = (state.mute || groupMuted) ? 0 : dbToGain(state.gain);
    };

    // The ARRANGEMENT's pan, held apart from the MIX's, and added to it.
    //
    // A bar can move a lane left or right of wherever its pot sits (`bar.pan`, in pot
    // units). The two are separate numbers for the reason the fader and the gate are:
    // one is authored and saved, the other is playback, and only one of them belongs in
    // a mix file. Kept out of `state` deliberately — `state` is what the desk draws and
    // what gets written to disk, and a bar's offset is neither.
    //
    // It is applied to the CHANNEL's panner rather than to a node of its own, because
    // pan does not compose: two StereoPanners in series at +1 and -1 leave the signal
    // hard left, not centred, so an offset can only mean what it says — arithmetic on
    // the pot — if one panner ends up holding the sum. The cost of that is the honest one
    // a DAW's pan automation has: a note still ringing from the bar before moves with it.
    let panOffset = 0;
    const panTarget = () => Math.max(-1, Math.min(1, state.pan + panOffset));
    // The last value this panner was told to arrive at, kept because a ramp needs
    // somewhere to start FROM and the param cannot be asked. `.value` on an untouched
    // AudioParam is not an automation event in Chromium, so a lone
    // `linearRampToValueAtTime` at the top of bar 2 interpolates from time zero: the
    // measured result was a lane sliding across the room for the whole of bar 1 on its
    // way to an edit that belonged to bar 2. See tests/bar-pan.js, claim 1.
    let panWritten = state.pan;

    // What the automation param was last told, as the last two events: a ramp has to
    // start from somewhere, and `.value` cannot be asked about a time in the future.
    // Null when nothing has been written since the song started — the next write then
    // sets its value outright rather than walking to it.
    let autoLast = null;
    let autoPrev = null;
    const AUTO_SNAP = 0.004;
    const autoValueAt = (t) => {
      if (!autoLast) return 1;
      if (!autoPrev || t >= autoLast.t) return autoLast.v;
      if (t <= autoPrev.t) return autoPrev.v;
      return autoPrev.v + (autoLast.v - autoPrev.v) * ((t - autoPrev.t) / (autoLast.t - autoPrev.t));
    };
    const autoWrite = (t, v, ramp = true) => {
      if (ramp) auto.gain.linearRampToValueAtTime(v, t);
      else auto.gain.setValueAtTime(v, t);
      autoPrev = autoLast;
      autoLast = { t, v };
    };

    const strip = {
      key,
      dry,
      wet,
      frozen,
      get state() { return state; },
      // Both write the fader, and both cancel whatever was scheduled on it: you have
      // just taken manual control of this lane, and a transition's ramp arriving on top
      // of the number you dialled is the wrong answer to that.
      setGain(db) { cancelState('gain', 'mute'); state.gain = db; applyLevel(); },
      setMute(m) { cancelState('gain', 'mute'); state.mute = !!m; applyLevel(); },
      // Dragging the pot cancels whatever the arrangement had scheduled and lands on the
      // sum, so the knob still reads as the channel's position while a bar is holding it
      // somewhere else. The sequencer writes its offset again at every bar line, so a
      // cancel here is undone by the next bar rather than being permanent.
      setPan(p) {
        cancelState('pan');
        state.pan = Math.max(-1, Math.min(1, p));
        panner.pan.cancelScheduledValues(ctx.currentTime);
        panner.pan.value = panTarget();
        panWritten = panTarget();
      },
      /**
       * The arrangement's per-bar offset, AT AN AUDIO TIME — see `panOffset` above.
       *
       * Ramped rather than stepped, for the same reason every scheduled move on this
       * desk is: the bar line it lands on is a quarter of a second in the future, and a
       * pan jumped under a note that is still sounding is two gain steps, which is a
       * click in each channel. Twelve milliseconds reads as "on the beat" and has no
       * edge in it.
       *
       * Written by hand rather than through `rampParam`, and the anchor is the reason:
       * a ramp has to be told where it starts, or it starts wherever the last event was
       * — which, on a param nothing has automated yet, is the beginning of the render.
       * The hold and the anchor go on at the same instant, so the anchor replaces the
       * hold and the value cannot move before the bar line that asked for it.
       */
      setPanOffset(offset, when = ctx.currentTime, seconds = 0.012) {
        panOffset = Number.isFinite(offset) ? Math.max(-2, Math.min(2, offset)) : 0;
        const target = panTarget();
        const at = Math.max(Number.isFinite(when) ? when : 0, ctx.currentTime);
        if (panner.pan.cancelAndHoldAtTime) panner.pan.cancelAndHoldAtTime(at);
        else panner.pan.cancelScheduledValues(at);
        panner.pan.setValueAtTime(panWritten, at);
        panner.pan.linearRampToValueAtTime(target, at + Math.max(seconds, 0.004));
        panWritten = target;
      },
      get panOffset() { return panOffset; },
      /**
       * The arrangement's level line over one stretch of time — `events` is
       * `[[time, gain], …]`, ascending, the first being where the stretch starts. The
       * param passes through each of them in straight lines; the sequencer hands over
       * enough of them that a curve is a curve.
       *
       * Continuity is this function's to keep, and it is the whole of the difficulty:
       *
       *   · a stretch that begins where the last one ended, at the level it ended on,
       *     is simply more line;
       *   · one that begins later — the sequencer skipped a stretch, or the transport
       *     stood still — is anchored where it starts, so the ramp that follows does not
       *     begin back where the last event was and slope across the gap;
       *   · one that begins at a DIFFERENT level — a loop wrap, a jump, a bar deleted
       *     under the playhead — walks there in four milliseconds rather than stepping,
       *     which is the click-safe edge rampParam uses for a snap;
       *   · one that begins BEFORE the last event — the transport moved back inside the
       *     lookahead — takes back what was written past its start first.
       *
       * The very first stretch after `clearAutomation` is set outright: nothing on this
       * channel was sounding through a line before it, so there is nothing to walk from.
       */
      automate(events) {
        if (!Array.isArray(events) || !events.length) return;
        const now = ctx.currentTime;
        const [t0raw, v0] = events[0];
        const t0 = Math.max(t0raw, now);
        const near = (a, b) => Math.abs(a - b) < 1e-5;
        let from = 1;
        if (!autoLast) {
          autoWrite(t0, v0, false);
        } else if (t0 < autoLast.t - 1e-6) {
          from = autoValueAt(t0);
          auto.gain.cancelScheduledValues(t0);
          auto.gain.setValueAtTime(from, t0);
          autoPrev = null; autoLast = { t: t0, v: from };
          if (!near(from, v0)) autoWrite(t0 + AUTO_SNAP, v0);
        } else if (near(autoLast.t, t0)) {
          if (!near(autoLast.v, v0)) autoWrite(t0 + AUTO_SNAP, v0);
        } else if (autoLast.t < now - 0.05) {
          // The last thing written is already in the past: the transport stood still
          // (the sequencer writes every sixteenth while it runs), so nothing on this
          // channel is sounding through the old value and the new one is set outright.
          autoWrite(t0, v0, false);
        } else {
          from = autoLast.v;
          autoWrite(t0, from, false);
          if (!near(from, v0)) autoWrite(t0 + AUTO_SNAP, v0);
        }
        for (let i = 1; i < events.length; i++) {
          const [t, v] = events[i];
          if (!(t > autoLast.t + 1e-6)) continue;
          autoWrite(t, v);
        }
      },
      /**
       * The line gone: back to unity. `at` is when; with no time it is now and outright,
       * which is what a song change wants — the old song's notes are already being cut.
       * With a time it walks there over the snap, for a line removed while the song plays.
       */
      clearAutomation(at = null) {
        if (at == null) {
          auto.gain.cancelScheduledValues(ctx.currentTime);
          auto.gain.value = 1;
          autoLast = null; autoPrev = null;
          return;
        }
        this.automate([[at, 1]]);
      },
      /** What the line was last told — for tests and the desk's readouts. */
      get automationLevel() { return autoLast ? autoLast.v : 1; },
      /**
       * A CUT reaching this channel's own ECHOES (src/data/automation.js). The notes are
       * stopped in front of the strip; a Delay on the strip would go on repeating what
       * it already had, so each delay insert is emptied: what is in its line is held
       * silent, and kept from going round again, for as long as the line takes to clear —
       * one delay time, two on a Ping-Pong's right side, which runs a delay behind its left.
       * A note struck on the cut is not touched: its first repeat comes out after that.
       * How each delay does it is its own business — see `flush` in effects.js.
       *
       * Reverb inserts are left alone. A room cannot be emptied, only muted, and a muted
       * room would take the next note's reverb with it.
       */
      flushEchoes(at) {
        const links = [...(slot.chain || []), ...barSwitch.links];
        for (const link of links) {
          if (!link || link.bypassed || link.muted) continue;
          link.flush?.(at);
        }
      },
      get _auto() { return auto; },
      /** 1 = as recorded, 0 = mono, 2 = pushed wide. */
      setWidth(w) { cancelState('width'); state.width = w; widthNode.set(w); },
      setSolo(on) {
        if (on) soloed.add(key); else soloed.delete(key);
        applySoloAll();
      },
      /** The live gate (see liveLevel): `g` from `when`, gliding with time constant `glide`. */
      setLiveLevel(g, when = ctx.currentTime, glide = 0.012) {
        liveLevel = g;
        const at = Math.max(when, ctx.currentTime);
        vol.gain.cancelScheduledValues(at);
        vol.gain.setTargetAtTime(soloGain() * g, at, glide);
      },
      get liveLevel() { return liveLevel; },
      setEQ(patch = {}) {
        cancelState('eq');
        Object.assign(state.eq, patch);
        laneEq.set(patch);
      },
      /** Accepts any subset of aux ids, e.g. { delay: 1, reverb2: 0.3 }. */
      setSend(patch = {}) {
        for (const [id, v] of Object.entries(patch)) {
          if (v == null || !sends.has(id)) continue;
          cancelState(`send:${id}`);
          state.send[id] = v;
          const g = sends.get(id).gain;
          g.cancelScheduledValues(ctx.currentTime);
          g.value = v;
          // A send raised off zero has to have somewhere to arrive — see wakeAux.
          // Only ever upwards here: dropping the last send to zero leaves the return
          // wired and silent until the next applyMix prunes it, which costs a little
          // CPU and never costs a sound.
          if (v > 0) { linkSend(id); wakeAux(id); } else unlinkSend(id);
        }
      },
      /**
       * Replace this channel's effect chain. `list` is [{ id, params }] in order.
       * Rebuilt wholesale rather than diffed: chains are two or three links long and
       * a rebuild is microseconds, where a diff is a source of subtle wrongness.
       */
      setEffects(list = [], bpm = 120) { state.effects = list; return slot.set(list, bpm); },
      get effects() { return slot.chain; },
      wakeEffects(until = ctx.currentTime) { slot.wake(until); },
      get effectsAwake() { return slot.awake; },
      /** Temporarily take one effect out of the chain, without losing its settings. */
      setEffectBypass(index, on) { slot.setBypass(index, on); },
      /** Turn one effect down to nothing, keeping it wired so the move can be scheduled. */
      setEffectMute(index, on) { slot.setMute(index, on); },

      /** Pre-create every bar-effect route before the scheduler needs to select it. */
      prepareBarEffects(chains = [], bpm = 120) { barSwitch.prepare(chains, bpm); },
      /** Select a prepared route at an audio time; see makeSectionSwitch. */
      scheduleBarEffects(list = [], when = ctx.currentTime, opts = {}) { barSwitch.select(list, when, opts); },
      /** A chain's settings moved under it; see makeSectionSwitch's retune. */
      retuneBarEffects(oldList, newList, bpm = 120) { return barSwitch.retune(oldList, newList, bpm); },
      /** The song stopped — see makeSectionSwitch's release. */
      releaseBarEffects(at, seconds = 0) { barSwitch.release(at, seconds); },
      get _barFxSlots() { return barSwitch.slots; },
      /** A new song owns a new set of snapshots; do not accumulate the last song's graphs. */
      clearBarEffects() { barSwitch.clear(); },

      /**
       * Everything a presentation variant can move on this channel, AT AN AUDIO TIME.
       *
       * Absolute targets, not deltas against the authored mix. A ratio cannot express a
       * send that starts at zero — "put reverb on the kick" where the song's own mix has
       * none is exactly the case a cabinet treatment is made of — so the caller resolves
       * what the lane should sound like and says so.
       *
       * `mute` folds into the level as a fade to silence rather than touching the gate.
       * The gate belongs to monitoring; a variant that hides the lead has not muted it,
       * and the desk should go on showing what the song says.
       *
       * `state` is not written immediately. It describes the mix AS AUTHORED, which is
       * what the desk draws and what pruneAuxes counts until the target audio time
       * arrives; the scheduler then commits the staged values without touching the
       * already-scheduled AudioParams.
       */
      rampTo({ gain, mute, pan, width, eq, send } = {}, when, seconds = 0) {
        const at = Math.max(when, ctx.currentTime);
        if (gain != null || mute != null) {
          rampParam(ctx, pres.gain, (mute || groupMuted) ? 0 : dbToGain(gain ?? state.gain), when, seconds);
          queueState(at, 'gain', gain ?? state.gain);
          queueState(at, 'mute', !!mute);
        }
        // The offset rides on top of a variant's pan exactly as it rides on the pot's:
        // a treatment that moves the lead is moving where the lead LIVES, and the bar
        // that pushes it across the room is still that bar's edit.
        //
        // `queueState` records the AUTHORED value, not the offset one: `state.pan` is
        // the channel's own position and the bar's offset rides on top of it, so
        // committing the sum would fold a bar's edit into the channel permanently.
        if (pan != null) {
          const target = Math.max(-1, Math.min(1, pan));
          panWritten = Math.max(-1, Math.min(1, pan + panOffset));
          rampParam(ctx, panner.pan, panWritten, when, seconds);
          queueState(at, 'pan', target);
        }
        if (width != null) {
          widthNode.ramp(width, when, seconds);
          queueState(at, 'width', width);
        }
        if (eq) {
          laneEq.ramp(eq, when, seconds);
          queueState(at, 'eq', { ...eq });
        }
        for (const [id, v] of Object.entries(send || {})) {
          if (v == null || !sends.has(id)) continue;
          // Wired NOW, before the ramp is scheduled, or its opening would be lost.
          if (v > 0) { linkSend(id); wakeAux(id); }
          rampParam(ctx, sends.get(id).gain, v, when, seconds);
          if (v === 0) unlinkSendAfter(id, Math.max(0, (when ?? ctx.currentTime) - ctx.currentTime) + (seconds || 0));
          queueState(at, `send:${id}`, v);
        }
      },

      level: () => (meter ? meter.getValue() : 0),
      _slot: slot,
      // The gate and the fader, reachable so a test can prove which of them monitoring
      // writes to. That split is the whole reason a transition survives you hitting
      // solo, and it is invisible from outside without these.
      _vol: vol,
      _pres: pres,
      _sends: sends,
      _applySolo: applySolo,
      _monitor: (g) => { monitor.gain.setTargetAtTime(g, ctx.currentTime, 0.01); },
      _monitorNode: monitor,
      get _routeTo() { return routeTo; },
      get groupMuted() { return groupMuted; },
      _setGroupMute: (on) => {
        if (groupMuted === !!on) return;
        groupMuted = !!on;
        cancelState('gain', 'mute');
        applyLevel();
      },
      /**
       * Send this strip's output somewhere else: the music bus or a group's input. With no
       * `seconds` it is a reconnection in one task — which the audio thread sees whole, so
       * there is no instant at which the strip feeds both or neither. With them, the old
       * and new paths cross-fade at equal gain through a pair of temporary gains, and once
       * the fade is over (live contexts only — an offline render keeps the pair, which by
       * then is a gain of exactly 1 and 0) the strip is put back on a plain connection.
       */
      _route(dest, { seconds = 0, when = ctx.currentTime } = {}) {
        if (!dest) return;
        if (routeFade) routeFade.finish();
        if (dest === routeTo) return;
        const old = routeTo;
        routeTo = dest;
        if (!(seconds > 0)) {
          monitor.connect(dest);
          try { monitor.disconnect(old); } catch { /* not wired */ }
          return;
        }
        const at = Math.max(Number.isFinite(when) ? when : 0, ctx.currentTime);
        const out = ctx.createGain();
        const into = ctx.createGain();
        out.gain.value = 1;
        into.gain.value = 0;
        out.gain.setValueAtTime(1, at);
        out.gain.linearRampToValueAtTime(0, at + seconds);
        into.gain.setValueAtTime(0, at);
        into.gain.linearRampToValueAtTime(1, at + seconds);
        monitor.connect(out); out.connect(old);
        monitor.connect(into); into.connect(dest);
        try { monitor.disconnect(old); } catch { /* not wired */ }
        let timer = null;
        const fade = {
          finish() {
            if (timer != null) clearTimeout(timer);
            timer = null;
            monitor.connect(dest);
            for (const n of [out, into]) {
              try { monitor.disconnect(n); } catch { /* already gone */ }
              try { n.disconnect(); } catch { /* already gone */ }
            }
            if (routeFade === fade) routeFade = null;
          },
        };
        routeFade = fade;
        if (typeof ctx.startRendering !== 'function') {
          timer = setTimeout(() => fade.finish(), Math.ceil((at + seconds - ctx.currentTime) * 1000) + 60);
        }
      },
      _commitScheduledState: commitState,
      _clearScheduledState: () => pendingState.clear(),
    };
    strips.set(key, strip);
    // A strip built while a send is soloed has to arrive already silenced on its dry
    // path, or the layer you just made is the only channel you can hear.
    if (soloedAux.size) strip._monitor(0);
    return strip;
  };

  // Every canonical lane, whether or not the song has one.
  //
  // This looks like waste — a strip is ~27 nodes and on a song using four of the
  // twenty-two the rest stand idle — and it was tried as one: building strips only for
  // the lanes a song carries cut 18 of 46 here and changed the render cost by NOTHING
  // (199.7 -> 201.6 ms/audio-s, inside the noise). Chromium short-circuits a silent gain
  // chain, so an idle strip is genuinely close to free, and lanes are cheap in exactly
  // the way node-count arithmetic says they should not be.
  //
  // It also broke playback: a lane whose strip does not exist yet is skipped by the
  // voice path, so a song lost audio on the lanes that arrived late. Measured at zero
  // benefit and a real regression, the lazy version is gone. See
  // work/local/standing-graph-findings.md.
  for (const { key } of LANES) makeStrip(key);

  // Master limiter — OFF by default, and deliberately so.
  //
  // Tone.Limiter is a DynamicsCompressorNode, and Web Audio gives that node a 6ms
  // (264-sample) lookahead that cannot be switched off: merely having it in the
  // path delays all audio, whether or not it is reducing anything. Every song was
  // balanced without it, so leaving it in by default would mean no song renders
  // identically and the whole null test is lost.
  //
  // It is worth having available: several banks peak over 1.0 through the real
  // engine (the shop theme hits 1.63) and clip. But that is a trim that needs
  // fixing on the desk, not something a limiter should quietly paper over.
  const limiter = new Tone.Limiter(-1);
  const masterTrim = ctx.createGain();
  masterTrim.gain.value = 1;
  let limiterOn = false;

  // masterOut exists so the limiter can be switched in and out without touching
  // masterTrim's own connections. (Its gain is the Lab's MASTER fader: setMasterLevel.) Rewiring used to call masterTrim.disconnect(),
  // which tore off EVERY downstream node — including the master meter, which
  // applyMix() then silently killed on every song load by calling setLimiter().
  const masterOut = ctx.createGain();
  masterOut.gain.value = 1;
  // ...and what it is set to: the Lab's MASTER fader times the listening screens' lift
  // (setMasterLevel, setListenGain).
  let masterLevel = 1;
  let listenGain = 1;
  const aimMasterOut = (when, glide) => {
    const at = Math.max(when, ctx.currentTime);
    masterOut.gain.cancelScheduledValues(at);
    masterOut.gain.setTargetAtTime(masterLevel * listenGain, at, glide);
  };

  // The master balance, last thing on the bus and before the limiter — the limiter's
  // ceiling is on what leaves, so nothing goes after it. Explicit stereo in, for the
  // same reason the lane panners are: fed stereo, a native StereoPannerNode passes
  // centre at ratio 1.0000, and at centre this has to be a wire (see the note at the
  // top of this file, and tests/null-test.js, which proves it).
  const masterPan = ctx.createStereoPanner();
  masterPan.channelCount = 2;
  masterPan.channelCountMode = 'explicit';
  masterPan.channelInterpretation = 'speakers';
  masterPan.pan.value = 0;
  let masterMeter = null;
  let masterInputMeter = null;
  let masterMeterSource = null;

  // THE CEILING (see CEILING), built the first time a song asks for it: in at `ceilingIn`, out of
  // `ceilingOut`, and from `ceilingIn` a stereo tap — what goes INTO the ceiling, so its meter can
  // show the overs it is catching — that the Lab's MASTER strip reads (ceilingLevels).
  let ceilingOn = false;
  let ceiling = null;
  const makeCeiling = () => {
    const comp = ctx.createDynamicsCompressor();
    for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) comp[k].value = CEILING[k];
    const input = ctx.createGain();
    const out = ctx.createGain();
    out.gain.value = dbToGain(-CEILING_MAKEUP_DB);
    input.connect(comp);
    comp.connect(out);
    const split = ctx.createChannelSplitter(2);
    input.connect(split);
    const taps = [0, 1].map((ch) => {
      const a = ctx.createAnalyser();
      a.fftSize = 2048;   // 46 ms at 44.1k: longer than a frame, so no peak falls between two reads
      split.connect(a, ch);
      return a;
    });
    return { comp, input, out, taps, buf: new Float32Array(2048) };
  };

  const wireMaster = () => {
    if (!master) return;
    if (masterMeter && masterMeterSource) {
      try { Tone.disconnect(masterMeterSource, masterMeter); } catch { /* already detached */ }
      masterMeterSource = null;
    }
    masterOut.disconnect();
    masterPan.disconnect();
    if (ceiling) {
      try { Tone.disconnect(limiter, ceiling.input); } catch { /* not fed from there */ }
      ceiling.out.disconnect();
    }
    masterOut.connect(masterPan);
    let finalSource = masterPan;
    if (limiterOn) {
      Tone.connect(masterPan, limiter);
      finalSource = limiter;
    } else {
      limiter.disconnect();
    }
    if (ceilingOn) {
      ceiling ||= makeCeiling();
      Tone.connect(finalSource, ceiling.input);
      finalSource = ceiling.out;
    }
    Tone.connect(finalSource, destination);
    if (masterMeter) {
      Tone.connect(finalSource, masterMeter);
      masterMeterSource = finalSource;
    }
  };
  // The TREATMENT path: a second way through the music, for effects that only one
  // presentation of a song wants.
  //
  // A cabinet screen putting a high-pass across the whole mix cannot do it on the master
  // chain, because coming off it again is a graph edit — makeChainSlot disposes the whole
  // slot and rebuilds it — and there is no audio time you can schedule that for. Nor can
  // it be left in place at a harmless setting: a Tone.Filter highpass at 20Hz is a real
  // biquad with real phase shift, not a wire, so "the level plays the song's own mix"
  // would stop being true.
  //
  // So the music splits in two and the two legs cross-fade. The filter lives on the wet
  // leg and is never removed while it can be heard; it is simply faded away from, and
  // torn down later when nothing is going through it. At rest — dry 1, wet 0, empty
  // slot — this is `x * 1 + x * 0`, which is exactly `x`, and the null test proves it.
  const treatDry = ctx.createGain();
  const treatWet = ctx.createGain();
  treatDry.gain.value = 1;
  treatWet.gain.value = 0;
  let treatSlot = null;
  let masterSlot = null;
  let masterSections = null;
  if (master) {
    master.disconnect();
    master.connect(treatDry);
    treatDry.connect(masterTrim);
    treatWet.connect(masterTrim);
    treatSlot = makeChainSlot(ctx, master, treatWet);
    // Master chain sits after the trim and before the limiter, so anything here is
    // the last thing to touch the mix — which is where a bus compressor or a final
    // EQ belongs.
    //
    // Then the song's own master SECTIONS (`automation.__master.fx`): a Stutter or a gate
    // across the whole mix for a beat. After the inserts, so they act on the finished mix
    // the way a DJ's effect does — a bus compressor does not pump on a gate's gaps, and a
    // stutter repeats the mix as it is heard — and still before the pan and the limiter,
    // so a distortion section cannot get past the ceiling. Two unity gains on every song
    // that has none, which is `x * 1 * 1`: the null test cannot hear them.
    const sectionIn = ctx.createGain();
    sectionIn.gain.value = 1;
    masterSlot = makeChainSlot(ctx, masterTrim, sectionIn);
    masterSections = makeSectionSwitch(ctx, sectionIn, masterOut);
  }

  // Keep the pre-chain tap for the developer watchdog, which uses it to distinguish
  // "the song reached the master chain" from "the final output died downstream".
  masterInputMeter = makeMeter(masterTrim, { channelCount: 2 });
  // The displayed master meter is the actual output meter: post master inserts, post
  // master pan, and post limiter when the limiter is enabled. It is a monitoring branch,
  // not an inline node, so it cannot alter the rendered signal or the bypass path.
  if (metersEnabled) {
    masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.6, channelCount: 2 });
    const sink = ctx.createGain();
    sink.gain.value = 0;
    Tone.connect(masterMeter, sink);
    sink.connect(ctx.destination);
  }
  // The first wire happens after both meter branches exist; setLimiter() reuses this
  // same path when it switches the final source between masterPan and limiter.
  if (master) wireMaster();

  const readMeterLevels = (meter) => {
    if (!meter) return [0, 0];
    const v = meter.getValue();
    return Array.isArray(v) ? [v[0] || 0, v[1] || 0] : [v || 0, v || 0];
  };

  // The one place a chain TARGET — what Audio.rampMix calls `__master`, `__aux:<id>` or
  // a plain lane key — becomes the slot holding it. Written once because the two scheduled
  // per-link moves, params and mute, must never disagree about where a target points.
  const slotFor = (target) => (target === '__master' ? masterSlot
    : target.startsWith('__aux:') ? auxes.get(target.slice(6))?.slot
      : isGroupKey(target) ? groupBuses.get(groupIdOf(target))?.slot
        : strips.get(target)?._slot);
  // Every insert and section slot a group has built, for the walks that retune them.
  const groupSlots = () => [...groupBuses.values()].flatMap((b) => [b.slot, ...b.sections.slots]);
  // Every slot an effect can sit in — channel inserts, their Spot FX branches, the aux
  // returns, the master and its sections, the groups — for the walks that visit them all.
  const everySlot = () => [
    ...[...strips.values()].map((s) => s._slot),
    ...[...strips.values()].flatMap((s) => s._barFxSlots || []),
    ...[...auxes.values()].map((a) => a.slot),
    masterSlot, treatSlot, ...(masterSections?.slots || []),
    ...groupSlots(),
  ].filter(Boolean);

  return {
    lanes: LANES.map((l) => l.key),
    lane: (key) => strips.get(key),
    /**
     * The strip for a lane, built on demand if the engine's own list has never heard
     * of it — which is what a LAYER is. Layers arrive with the mix rather than with
     * the bank, so applyMix is the first moment one can be given a strip. See
     * makeStrip, whose contract this is.
     *
     * Reconstructed by Claude from that contract after `git checkout` on this file
     * discarded the working copy — compare against the original if it turns up.
     */
    ensureLane: (key) => {
      if (!key) return null;
      if (!strips.has(key)) makeStrip(key);
      return strips.get(key);
    },
    /**
     * Is this lane inaudible BY THE MIX — muted, or losing a channel solo?
     *
     * The question the scheduler's silent-lane skip asks before building a note's
     * nodes (see scheduleStep in audio.js). Only states that silence the lane's dry
     * path AND its sends count: mute zeroes `pres`, which every send taps downstream
     * of, and a channel solo zeroes `vol` upstream of everything — so a skipped
     * lane's synthesis was reaching no output at all. An AUX solo is deliberately
     * not consulted: soloing a return silences only the dry monitors, and the
     * channels must keep feeding their sends or the bus being soloed goes quiet.
     */
    laneSilent(key) {
      const s = strips.get(key);
      if (!s) return false;
      return !!s.state.mute || s.groupMuted || (anySolo() && !soloHeard(key));
    },
    /** The final master output level as one number, after master processing. */
    masterLevel: () => {
      const v = readMeterLevels(masterMeter);
      return Math.max(v[0], v[1]);
    },
    /** Whether this graph owns display-meter branches. */
    metered: metersEnabled,
    /** [left, right], 0..1, from the final master output. */
    masterLevels: () => readMeterLevels(masterMeter),
    /** [left, right], 0..1, before the master insert chain, for diagnostics only. */
    masterInputLevels: () => readMeterLevels(masterInputMeter),

    /** Effects on the master bus, after the trim and before the limiter. */
    setMasterEffects(list = [], bpm = 120) { return masterSlot ? masterSlot.set(list, bpm) : 0; },
    get masterEffects() { return masterSlot ? masterSlot.chain : []; },
    setMasterEffectBypass(i, on) { masterSlot?.setBypass(i, on); },
    setMasterEffectMute(i, on) { masterSlot?.setMute(i, on); },

    /** Effects on one send's return. */
    setAuxEffects(id, list = [], bpm = 120) {
      const a = auxes.get(id);
      return a ? a.slot.set(list, bpm) : 0;
    },
    auxEffects: (id) => auxes.get(id)?.slot.chain || [],
    /** How much is being sent into one aux, 0..1 — the send strip's meter. */
    auxLevel: (id) => auxes.get(id)?.meter?.getValue() ?? 0,
    /**
     * Solo a send: the returns you soloed, and nothing else — no dry channels, no
     * other returns, but the channels still feeding their sends so there is
     * something to hear. Monitoring only, like a channel solo, and never saved.
     */
    setAuxSolo(id, on) {
      if (on) soloedAux.add(id); else soloedAux.delete(id);
      applyMonitoring();
    },
    clearAuxSolo() { soloedAux.clear(); applyMonitoring(); },
    setAuxEffectBypass(id, i, on) { auxes.get(id)?.slot.setBypass(i, on); },
    setAuxEffectMute(id, i, on) { auxes.get(id)?.slot.setMute(i, on); },
    masterTrim,

    // ---- shared FX rack ------------------------------------------------------
    auxes: AUXES,
    aux: (id) => auxes.get(id),
    auxState: (id) => auxes.get(id)?.state,
    /**
     * Set any aux's parameters. Delay params need the song tempo, since the time is
     * a note division rather than milliseconds — a fixed ms would drift out of the
     * groove on every bank with a different bpm. Reverb decay changes rebuild the
     * impulse response asynchronously; the returned promise resolves when it is up.
     */
    setAux(id, patch = {}, bpm = 120) {
      const a = auxes.get(id);
      if (!a) return null;
      const { eq, level, pan, mute, ...rest } = patch;
      Object.assign(a.state, rest);
      if (eq) { Object.assign(a.state.eq, eq); a.eq.set(eq); }
      if (level != null) {
        a.state.level = level;
        a.level.gain.setTargetAtTime(level, ctx.currentTime, 0.03);
      }
      if (pan != null) {
        a.state.pan = Math.max(-1, Math.min(1, pan));
        a.panner.pan.setTargetAtTime(a.state.pan, ctx.currentTime, 0.02);
      }
      if (mute != null) { a.state.mute = !!mute; applyMonitoring(); }
      if (a.engine) a.engine.set(bpm, a.state);
      if (a.reverb) {
        if (rest.decay != null) a.reverb.decay = Math.max(0.05, rest.decay);
        if (rest.preDelay != null) a.reverb.preDelay = Math.max(0, rest.preDelay);
        return a.reverb.ready;
      }
      return null;
    },
    /** Retune every tempo-synced aux and insert after a bank or tempo change. */
    retune(bpm) {
      for (const a of auxes.values()) if (a.engine) a.engine.set(bpm, a.state);
      // Native modulation effects own their LFO sources rather than delegating to
      // Tone.Transport. Re-apply their current state with the new bpm so a synced
      // Chorus 2, Flanger, or Ring Mod changes rate without rebuilding its chain.
      for (const slot of everySlot()) {
        for (const link of slot.chain || []) {
          if (link.def?.params?.includes('rateSync')) link.set({}, bpm);
        }
      }
    },

    // ---- scheduled moves, for presentation variants --------------------------
    // The same three things setMasterTrim/setMasterPan/setAux do, written at an audio
    // time instead of now. Absolute targets throughout — see strip.rampTo.

    // ---- the treatment leg ---------------------------------------------------

    /** Load the treatment chain. Silent until rampTreatment brings the leg in. */
    setTreatment(list = [], bpm = 120) { return treatSlot ? treatSlot.set(list, bpm) : 0; },
    get treatment() { return treatSlot ? treatSlot.chain : []; },

    /**
     * Cross-fade between the two legs at an audio time — `wet` 1 is all treatment, 0 is
     * all dry, and the dry leg is always its complement so the two sum to unity.
     *
     * EQUAL GAIN, not equal power. The usual square-root law is for two UNCORRELATED
     * sources, where the sum is a power sum; these two are the same music by two routes,
     * so they add arithmetically and an equal-power pair would bulge 3dB in the middle of
     * every transition. The filtered leg is not identical to the dry one, so the sum is
     * not perfectly flat either — but arithmetic is the far closer model of the two.
     */
    rampTreatment(wet, when, seconds = 0) {
      const w = Math.max(0, Math.min(1, wet));
      rampParam(ctx, treatWet.gain, w, when, seconds);
      rampParam(ctx, treatDry.gain, 1 - w, when, seconds);
    },

    /** Take the treatment chain out. Only safe once the leg is silent. */
    clearTreatment() { if (treatSlot) treatSlot.set([]); },
    _treat: { dry: treatDry, wet: treatWet },

    /** The master trim and balance. */
    rampMaster({ master, masterPan: mp } = {}, when, seconds = 0) {
      if (master != null) rampParam(ctx, masterTrim.gain, dbToGain(master), when, seconds);
      if (mp != null) rampParam(ctx, masterPan.pan, Math.max(-1, Math.min(1, mp)), when, seconds);
    },

    /**
     * One aux return's level, balance and EQ.
     *
     * Level, pan and EQ only. `decay` and `preDelay` regenerate the impulse response
     * synchronously — a buffer swap, not a parameter — and there is no audio time you
     * can schedule that for. A variant that wants a bigger room asks for more send and
     * more return, which is what the two ends of this actually are.
     */
    rampAux(id, { level, pan, eq } = {}, when, seconds = 0) {
      const a = auxes.get(id);
      if (!a) return;
      if (level != null) rampParam(ctx, a.level.gain, level, when, seconds);
      if (pan != null) rampParam(ctx, a.panner.pan, Math.max(-1, Math.min(1, pan)), when, seconds);
      if (eq) a.eq.ramp(eq, when, seconds);
    },

    /**
     * Parameters on ONE link of a live effect chain.
     *
     * Parameters only. Adding, removing or reordering a link disposes every node in the
     * slot and rebuilds it (see makeChainSlot.set) — a graph edit, with a dropped tail
     * and a click in it, and no time you can schedule it for. So a caller asking for one
     * gets an error rather than a rewire in the middle of a bar: the two sides of a
     * transition have to agree on the SHAPE of their chains, and only on the numbers may
     * they differ.
     */
    rampEffectParams(target, index, params, when, seconds = 0, bpm = 120) {
      const link = slotFor(target)?.chain?.[index];
      if (!link) throw new Error(`mixer: no effect at ${target}[${index}] to ramp`);
      link.setAt(params, when, seconds, bpm);
      link.params = { ...(link.params || {}), ...params };
    },

    /**
     * One link's MUTE, at an audio time — the half of a chain change that a transition
     * is allowed to make.
     *
     * The shape of a chain is frozen across a boundary: adding, removing, reordering or
     * bypassing a link is a graph edit with no time you can aim it at. Whether a link is
     * HEARD is not, because a mute is two gains (see makeChainSlot.setMute). So the two
     * sides of a transition may disagree about it freely, and Audio.rampMix walks this
     * beside rampEffectParams for every chain it moves — which is how a cabinet screen
     * gets an effect the level does not have, on the master or on any channel.
     */
    rampEffectMute(target, index, muted, when, seconds = 0) {
      const slot = slotFor(target);
      if (!slot?.chain?.[index]) throw new Error(`mixer: no effect at ${target}[${index}] to mute`);
      slot.setMute(index, muted, when, seconds);
    },

    /**
     * Give effects that own a rhythmic envelope the sequencer's exact clock. This is
     * deliberately a scheduler hook rather than a wall-clock timer: offline renders
     * walk scheduleStep() ahead of startRendering(), and live playback already has the
     * authoritative audio time in `nextTime`.
     *
     * `swing` rides along because an effect on this hook is the only kind that CAN
     * follow the groove. It is handed the step number, so it knows which sixteenth each
     * of its pulses falls on and can move the off-beat ones exactly as a note moves. A
     * delay line cannot: it applies one interval to whatever arrives, and the interval
     * a swung note needs depends on which side of the beat it started from.
     */
    scheduleEffects(step, when, sixteenth, bpm = 120, swing = 50) {
      for (const strip of strips.values()) strip._commitScheduledState(when);
      for (const slot of everySlot()) {
        for (const link of slot.chain || []) {
          if (typeof link.scheduleRhythm === 'function') {
            link.scheduleRhythm(step, when, sixteenth, bpm, swing);
          }
        }
      }
    },

    /**
     * The tracks some Sidechain Duck is keyed to, anywhere in the mix — the only tracks the
     * sequencer reports hits for (see keyHit). Empty on every song without a duck, which is
     * every song before 10 Oct 2026, so their step walk does nothing new.
     */
    duckTriggers() {
      const keys = new Set();
      for (const slot of everySlot()) {
        for (const link of slot.chain || []) {
          const key = link.keyedTo?.();
          if (key) keys.add(key);
        }
      }
      return keys;
    },

    /**
     * A trigger track's note, at the audio time it plays: every duck keyed to it dips there.
     * From the sequencer's notes rather than the track's audio — see makeSidechainDuck.
     */
    keyHit(key, when) {
      for (const slot of everySlot()) {
        for (const link of slot.chain || []) link.keyHit?.(key, when);
      }
    },

    /**
     * Build all arrangement-owned effect branches while no bar is switching them: every
     * bar's `inlineFx` snapshot and every effect SECTION in the automation, the master's
     * included (src/data/automation.js).
     */
    prepareBarEffects(plan = [], bpm = 120, automation = null) {
      const byLane = new Map();
      const add = (key, chain) => {
        if (!Array.isArray(chain) || !chain.length) return;
        if (!byLane.has(key)) byLane.set(key, []);
        byLane.get(key).push(chain);
      };
      for (const bar of plan || []) {
        for (const [key, chain] of Object.entries(bar.inlineFx || {})) add(key, chain);
      }
      for (const [key, lane] of Object.entries(automation || {})) {
        for (const section of lane?.fx || []) add(key, section?.chain);
      }
      // A group's sections are kept whether or not the group is built yet: an empty group
      // has no nodes, and the first track routed into it builds the bus and prepares them.
      pendingGroupSections.clear();
      for (const [key, chains] of byLane) {
        if (key === MASTER_KEY) { masterSections?.prepare(chains, bpm); continue; }
        if (isGroupKey(key)) {
          const id = groupIdOf(key);
          if (!id) continue;
          pendingGroupSections.set(id, chains);
          groupBuses.get(id)?.sections.prepare(chains, bpm);
          continue;
        }
        // Never a strip for a key in the engine's own namespace: `__group:` above, and
        // anything else beginning `__` is not a lane and must not be built as one.
        if (key.startsWith('__')) continue;
        const strip = strips.get(key) || makeStrip(key);
        strip?.prepareBarEffects(chains, bpm);
      }
    },
    /** One lane's chain — or the master's, under `__master`, or a group's — from an audio time. */
    scheduleBarEffects(key, list, when, opts = {}) {
      if (key === MASTER_KEY) masterSections?.select(list, when, opts);
      else if (isGroupKey(key)) groupBuses.get(groupIdOf(key))?.sections.select(list, when, opts);
      else strips.get(key)?.scheduleBarEffects(list, when, opts);
    },
    /**
     * One lane's — or the master's — section chain retuned in place: the Spot FX editor's
     * live knobs. False when the engine has nothing to retune; the arrangement write that
     * follows builds what it needs.
     */
    retuneBarEffects(key, oldList, newList, bpm = 120) {
      if (key === MASTER_KEY) return masterSections?.retune(oldList, newList, bpm) ?? false;
      if (isGroupKey(key)) return groupBuses.get(groupIdOf(key))?.sections.retune(oldList, newList, bpm) ?? false;
      return strips.get(key)?.retuneBarEffects(oldList, newList, bpm) ?? false;
    },
    /**
     * A bar line: every strip to its bar's snapshot. `skip` is the lanes that have effect
     * SECTIONS — those are switched by the sequencer's automation pass, a sixteenth at a
     * time, and a bar line here would switch them back under it.
     */
    scheduleBarEffectsForBar(bar = {}, when = ctx.currentTime, skip = null) {
      for (const [key, strip] of strips) {
        if (skip?.has(key)) continue;
        strip.scheduleBarEffects(bar.inlineFx?.[key] || [], when);
      }
    },
    /** The song has stopped: every section lets go over the stop's fade. */
    releaseBarEffects(at = ctx.currentTime, seconds = 0) {
      for (const strip of strips.values()) strip.releaseBarEffects(at, seconds);
      for (const bus of groupBuses.values()) bus.sections.release(at, seconds);
      masterSections?.release(at, seconds);
    },
    get _masterSectionSlots() { return masterSections?.slots || []; },

    // ---- group buses -----------------------------------------------------------------
    //
    // See the note where `routes` is declared, and src/data/group-buses.js.

    /**
     * A whole mix's groups at once — what applyMix calls on every song. `groups` is the
     * mix's `groups` block, `laneRoutes` a Map of lane key → group id for every lane that
     * is routed (anything not in it goes straight to the mix). Instant, never faded: a song
     * that opens grouped must not fade its grouped tracks in at bar one, and a render must
     * be what playback is. Only what differs is touched, so re-applying a mix on the desk
     * does not churn the graph under the music.
     */
    applyGroups(groups = null, laneRoutes = new Map(), bpm = 120) {
      groupBpm = bpm;
      for (const id of GROUP_IDS) groupState.set(id, groupSettings(groups?.[id]));
      for (const key of strips.keys()) routeLane(key, laneRoutes.get(key) || null);
      for (const [id, bus] of groupBuses) {
        const st = groupState.get(id);
        bus.eq.set(st.eq);
        applyGroupLevel(bus);
      }
      syncGroups({ rebuild: true });
      broadcastGroupMute();
      applySoloAll();
    },
    /** Route one lane into a group (`id`), or back to the mix (null). `seconds` fades it. */
    setLaneRoute(key, id, opts = {}) {
      routeLane(key, id, opts);
      syncGroups();
    },
    laneRoute: (key) => routes.get(key) || null,
    /** The lanes routed into a group, in no particular order. */
    groupMembers: (id) => [...routes].filter(([, g]) => g === id).map(([k]) => k),
    groupState: (id) => groupState.get(id),
    /** A group's fader (dB), pan and EQ, now. Mute broadcasts into its members. */
    setGroup(id, { gain, pan, eq, mute } = {}) {
      const st = groupState.get(id);
      if (!st) return;
      if (gain != null) st.gain = gain;
      if (pan != null) st.pan = Math.max(-1, Math.min(1, pan));
      if (eq) Object.assign(st.eq, eq);
      if (mute != null) st.mute = !!mute;
      const bus = groupBuses.get(id);
      if (bus) {
        if (eq) bus.eq.set(eq);
        if (gain != null || pan != null) applyGroupLevel(bus);
      }
      if (mute != null) broadcastGroupMute();
    },
    /** A group's insert chain. Kept in its state whether or not the bus is built yet. */
    setGroupEffects(id, list = [], bpm = groupBpm) {
      const st = groupState.get(id);
      if (!st) return 0;
      st.effects = list;
      groupBpm = bpm;
      const bus = groupBuses.get(id);
      return bus?.active ? bus.slot.set(list, bpm) : 0;
    },
    groupEffects: (id) => groupBuses.get(id)?.slot.chain || [],
    setGroupEffectBypass(id, i, on) { groupBuses.get(id)?.slot.setBypass(i, on); },
    setGroupEffectMute(id, i, on) { groupBuses.get(id)?.slot.setMute(i, on); },
    /** Solo a group: its members heard as soloed channels are, with their sends. */
    setGroupSolo(id, on) {
      if (on) soloedGroups.add(id); else soloedGroups.delete(id);
      applySoloAll();
    },
    get soloedGroups() { return [...soloedGroups]; },
    /** A group's output level, 0..1 — its strip's meter. 0 while it has no members. */
    groupLevel: (id) => groupBuses.get(id)?.meter?.getValue?.() ?? 0,
    /** For tests: the built bus, or undefined. */
    _groupBus: (id) => groupBuses.get(id),

    /**
     * Unhook auxes nothing is sending to. A ConvolverNode is not free just because
     * its input is silent — but a node with no path to the destination is never
     * pulled at all, so an unused reverb costs exactly nothing. This game runs on
     * phones; two idle convolvers is not a rounding error there.
     *
     * Called after the sends are set, so it sees the finished picture. A send raised
     * on its own — a fader move on the desk, with no apply behind it — wakes its aux
     * from `setSend` instead; see wakeAux.
     */
    pruneAuxes() {
      for (const a of auxes.values()) {
        let used = false;
        for (const strip of strips.values()) {
          if ((strip.state.send[a.def.id] ?? 0) > 0) { used = true; break; }
        }
        if (used === a.active) continue;
        a.active = used;
        // The return leaves through `monitor` — level → panner → monitor → return —
        // so that is the node to unhook and re-hook. Reconnecting `level` instead
        // added a SECOND path into the return, unpanned and deaf to mute, and the
        // aux came back twice as loud as it went away. That was unreachable while
        // every melodic lane defaulted to send 1 (nothing was ever unused, so
        // nothing was ever reconnected); it turned up the moment sends started at
        // zero and a song without echo could be loaded before one with it.
        if (used) a.monitor.connect(auxReturn);
        else { try { a.monitor.disconnect(auxReturn); } catch { /* already detached */ } }
      }
    },
    limiter,
    setMasterTrim(db) { masterTrim.gain.value = dbToGain(db); },
    /** The whole bus, left or right. 0 is centre and is a pass-through. */
    setMasterPan(p) { masterPan.pan.value = Math.max(-1, Math.min(1, p || 0)); },
    get masterPan() { return masterPan.pan.value; },
    get limiterOn() { return limiterOn; },
    /** Costs 6ms of output latency whenever it is on — see the note where it is built. */
    setLimiter(on) { limiterOn = !!on; wireMaster(); },
    get ceilingOn() { return ceilingOn; },
    /** THE CEILING (see CEILING) in or out; also 6 ms of latency while it is in. */
    setCeiling(on) {
      if (!!on === ceilingOn) return;
      ceilingOn = !!on;
      wireMaster();
    },
    /**
     * What is going into the ceiling — [left, right], the peak over the last 46 ms, linear — and
     * how far its curve pulls that peak down (dB, 0 or less). Zeros while it is out. The
     * reduction is the curve's, not the node's own `reduction`, which is a slow meter: it reads
     * −15 dB on a node just made with nothing going in, and takes a second to come back to 0.
     */
    ceilingLevels() {
      if (!ceilingOn || !ceiling) return { peaks: [0, 0], reduction: 0 };
      const peaks = ceiling.taps.map((a) => {
        a.getFloatTimeDomainData(ceiling.buf);
        let p = 0;
        for (let i = 0; i < ceiling.buf.length; i++) { const v = Math.abs(ceiling.buf[i]); if (v > p) p = v; }
        return p;
      });
      const over = Math.max(0, gainToDb(Math.max(...peaks)) - CEILING.threshold);
      return { peaks, reduction: -over * (1 - 1 / CEILING.ratio) };
    },
    /**
     * The whole song's level after everything else on its bus — the inserts and the master
     * sections — and before the pan, the limiters and the meter: the Lab's MASTER fader, a gain
     * from `when`, gliding over `glide` s. A live control like a strip's setLiveLevel: it is the
     * caller's, so no song change or reset() moves it, and the caller puts it back to 1.
     */
    setMasterLevel(g, when = ctx.currentTime, glide = 0.012) {
      masterLevel = Math.max(0, g);
      aimMasterOut(when, glide);
    },
    /**
     * The listening screens' lift (Audio.setListening), on the same gain as the MASTER fader and
     * multiplied into it: after the song's own master chain, so it is a level and not more drive
     * into a bus compressor — every Lab song has a multiband one on its master, and 3 dB ahead
     * of it came out as about 1.8 — and ahead of THE CEILING, which catches what it pushes over.
     */
    setListenGain(g, when = ctx.currentTime, glide = 0.05) {
      listenGain = Math.max(0, g);
      aimMasterOut(when, glide);
    },
    clearSolo() { soloed.clear(); soloedGroups.clear(); applySoloAll(); },
    /**
     * Every channel back to the pan its MIX says, with no arrangement offset on it.
     *
     * Called when a song stops or is swapped, alongside the gain trims it is the pan
     * half of: a bar's offset belongs to the song that scheduled it, and a strip left
     * 40 to the left because the last track ended on a bar that put it there is a mix
     * that lies about itself the moment the next song starts.
     */
    clearPanOffsets() { for (const s of strips.values()) s.setPanOffset(0, ctx.currentTime, 0); },
    /**
     * Every channel's automation line back to unity — a song change. With `at`, walked
     * there at that time (the old song's fade-out is still running until then); without
     * it, at once. See `automate` on the strip.
     */
    clearAutomation(at = null) { for (const s of strips.values()) s.clearAutomation(at); },
    /**
     * Kept, and resolved. The reverb used to build its impulse response by rendering
     * noise through its own offline context, so an offline render had to await it or
     * the aux was silent for the whole track. Ours generates the buffer in a loop and
     * is ready when it is constructed — but every caller that awaited this is right to.
     * That day came: the engine worklets (the Noise Gate) register asynchronously, and a
     * render that sets its bank before this resolves builds its gates on the fallback.
     */
    ready: Promise.all(readyPromises),
    /** Reset every strip to unity — the state the songs were balanced against. */
    reset() {
      soloed.clear();
      soloedAux.clear();
      soloedGroups.clear();
      // The groups back to their defaults and their sections gone. ROUTES are left as
      // they are: applyMix sets them in the same task, from the mix it is applying, so a
      // grouped song re-applied on the desk never has its routing pulled out and put back.
      pendingGroupSections.clear();
      for (const id of GROUP_IDS) groupState.set(id, groupSettings(null));
      for (const bus of groupBuses.values()) {
        bus.sections.clear();
        bus.slot.set([]);
        bus.active = false;
        bus.eq.set(groupSettings(null).eq);
        applyGroupLevel(bus);
        bus.monitor.gain.value = 1;
      }
      for (const s of strips.values()) {
        s.clearBarEffects();
        s.setPanOffset(0, ctx.currentTime, 0);
        // Scheduled STATE goes with the scheduled params. Leaving it behind would let a
        // transition that has just been cancelled still commit its mute or its send a
        // beat later, onto a channel that is no longer in that arrangement at all.
        s._clearScheduledState();
        s.setGain(0); s.setPan(0); s.setMute(false); s.setWidth(1);
        s.setEQ({ low: 0, mid: 0, high: 0 });
        s.setEffects([]);
        s.setSend(defaultSends());
      }
      if (masterSlot) masterSlot.set([]);
      masterSections?.clear();
      for (const a of auxes.values()) {
        a.slot.set([]);
        a.state = JSON.parse(JSON.stringify(AUX_DEFAULTS[a.def.id]));
        a.eq.set(a.state.eq);
        a.level.gain.value = a.state.level;
        a.panner.pan.value = a.state.pan;
        a.monitor.gain.value = 1;
        if (a.reverb) { a.reverb.decay = a.state.decay; a.reverb.preDelay = a.state.preDelay; }
      }
      // The treatment leg goes back to being a wire. A cabinet screen's filter belongs to
      // that screen, and applyMix runs on every song change — without this, backing out
      // of one to the food court would take the high-pass along with it.
      treatDry.gain.cancelScheduledValues(ctx.currentTime);
      treatWet.gain.cancelScheduledValues(ctx.currentTime);
      treatDry.gain.value = 1;
      treatWet.gain.value = 0;
      if (treatSlot) treatSlot.set([]);
      for (const s of strips.values()) s._monitor(1);
      masterTrim.gain.value = 1;
      masterPan.pan.value = 0;
    },
  };
}
