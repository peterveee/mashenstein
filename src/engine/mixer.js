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
import { EFFECT_PRESETS } from '../data/effect-presets.js';

export const dbToGain = (db) => 10 ** (db / 20);
export const gainToDb = (g) => 20 * Math.log10(Math.max(1e-6, g));

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
 * At w = 1 that reduces to L' = L and R' = R with no rounding beyond a pair of
 * multiply-adds, which is what keeps the null test intact. Only gains and a
 * splitter/merger, so it costs essentially nothing.
 */
function makeWidth(ctx) {
  const input = ctx.createGain();
  input.channelCount = 2; input.channelCountMode = 'explicit'; input.channelInterpretation = 'speakers';
  const split = ctx.createChannelSplitter(2);
  const merge = ctx.createChannelMerger(2);
  input.connect(split);

  const mid = ctx.createGain(); mid.gain.value = 1;
  const side = ctx.createGain(); side.gain.value = 1;
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

  return {
    input,
    output: merge,
    set(w) { side.gain.setTargetAtTime(Math.max(0, Math.min(2, w)), ctx.currentTime, 0.03); },
    /** The same move at an audio time — see rampParam. */
    ramp(w, when, seconds) { rampParam(ctx, side.gain, Math.max(0, Math.min(2, w)), when, seconds); },
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

  const rewire = () => {
    try { from.disconnect(to); } catch { /* not wired */ }
    try { from.disconnect(inGain); } catch { /* not wired */ }
    try { outGain.disconnect(to); } catch { /* not wired */ }
    try { sleeper?.disconnect(to); } catch { /* not wired */ }
    for (const link of chain) {
      try { (link.node.output || link.node).disconnect(); } catch { /* fine */ }
    }
    // A bypassed effect is skipped in the wiring, not turned down: one with a tail
    // would keep ringing and you would be comparing against its leftovers.
    const live = liveLinks();
    if (!live.length) { from.connect(to); return; }
    from.connect(inGain);
    let prev = inGain;
    for (const link of live) {
      Tone.connect(prev, link.node.input || link.node);
      prev = link.node.output || link.node;
    }
    Tone.connect(prev, outGain);
    if (!sleeper) outGain.connect(to);
    else if (awake) sleeper.connect(to);
  };
  rewire();

  return {
    rewire,
    get chain() { return chain; },
    set(list = [], bpm = 120) {
      clearSleepTimer();
      for (const link of chain) { try { link.node.dispose(); } catch { /* fine */ } }
      sourceList = list;
      sourceBpm = bpm;
      chain = list.map((e) => {
        const link = createEffect(e.id, e.params, ctx, bpm);
        if (link) link.bypassed = !!e.bypass;
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
      for (const link of chain) { try { link.node.dispose(); } catch { /* fine */ } }
      chain = [];
      try { from.disconnect(inGain); } catch { /* not wired */ }
      try { from.disconnect(to); } catch { /* not wired */ }
      try { outGain.disconnect(); } catch { /* not wired */ }
      try { sleeper?.disconnect(); } catch { /* not wired */ }
    },
    get awake() { return !sleeper || awake; },
  };
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
  musicBus, echoBus, master, destination = ctx.destination, songTrim, delayLp,
}) {
  Tone.setContext(ctx);

  // Every aux returns to songTrim, not musicBus, so a return is scaled by the
  // song's own musicTrim exactly as the original echo always was. Returning some
  // effects pre-trim and some post would make a song's trim change its wet/dry
  // balance, which is the sort of thing you chase for an hour.
  const auxReturn = songTrim || musicBus;
  const auxes = new Map();
  const readyPromises = [];

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
    const meter = new Tone.Meter({ normalRange: true, smoothing: 0.6 });
    Tone.connect(input, meter);
    const meterSink = ctx.createGain();
    meterSink.gain.value = 0;
    Tone.connect(meter, meterSink);
    meterSink.connect(ctx.destination);

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

  const applyMonitoring = () => {
    const busSolo = soloedAux.size > 0;
    for (const s of strips.values()) s._monitor(busSolo ? 0 : 1);
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

    // The channel path: fader, pan, EQ, then the effect chain (spliced in by
    // rewireChain below), then the stereo width stage into the music bus.
    // Bar-scoped inserts switch their INPUTS, never their outputs. The direct input
    // and every distinct effect snapshot are built in parallel before the live strip;
    // at a bar edge only one receives new audio. Turning a branch off therefore stops
    // later notes entering it while delay/reverb already inside keeps its natural tail.
    const barDirect = ctx.createGain();
    barDirect.gain.value = 1;
    dry.connect(barDirect);
    barDirect.connect(vol);
    const barFxBranches = new Map();
    // The initial graph is already direct. Do not schedule a no-op ramp at bar one:
    // OfflineAudioContext receives the whole song's automation before rendering and
    // Chromium can otherwise resolve a later cancel-and-hold through that redundant
    // first event, attenuating the opening direct bar. This also avoids touching the
    // graph between adjacent bars that use the same snapshot.
    let selectedBarFx = '';
    // Frozen PCM has already passed through its bar-effect snapshots, but nothing on
    // the live channel. It enters after those branches and before fader/pan/EQ/inserts.
    const frozen = ctx.createGain();
    frozen.connect(vol);
    vol.connect(pres);
    pres.connect(panner);
    panner.connect(laneEq.input);
    widthNode.output.connect(monitor);
    monitor.connect(musicBus);            // the strip's only route to the mix

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
    const sends = new Map();
    for (const def of AUXES) {
      const g = ctx.createGain();
      g.gain.value = def.defaultSend;
      pres.connect(g);
      g.connect(auxes.get(def.id).input);
      sends.set(def.id, g);
    }

    // A channel insert is pulled only while this lane is producing audio or an actual
    // tail. `wakeEffects` below is called by the sequencer before notes and frozen PCM.
    const slot = makeChainSlot(ctx, laneEq.output, widthNode.input, { sleepWhenSilent: true });

    // The meter taps post-pan. It also runs into a muted sink that reaches the
    // destination: a terminal analyser is not guaranteed to be pulled by the graph,
    // and a meter that only sometimes moves is worse than none.

    const meter = new Tone.Meter({ normalRange: true, smoothing: 0.6 });
    Tone.connect(widthNode.output, meter);
    const meterSink = ctx.createGain();
    meterSink.gain.value = 0;
    Tone.connect(meter, meterSink);
    meterSink.connect(ctx.destination);

    const state = {
      ...DEFAULTS,
      eq: { ...DEFAULTS.eq },
      width: 1,
      effects: [],
      send: { ...defaultSends() },
    };

    // Solo is a monitoring state, so it is resolved here rather than by Tone's
    // global solo bus: the wet path has to follow it too, and it must never be
    // written into a saved mix.
    //
    // It reaches ONLY the gate, and the gate is upstream of both the fader and the send
    // taps — so silencing a channel silences its sends without this writing them, and
    // without stepping on a ramp a transition has scheduled there.
    const applySolo = () => {
      vol.gain.value = (soloed.size > 0 && !soloed.has(key)) ? 0 : 1;
    };

    // The fader, with the mute folded in — one param, so a mix and a transition move a
    // lane's level through the same door whichever of the two things they are changing.
    const applyLevel = () => {
      pres.gain.cancelScheduledValues(ctx.currentTime);
      pres.gain.value = state.mute ? 0 : dbToGain(state.gain);
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

    const strip = {
      key,
      dry,
      wet,
      frozen,
      get state() { return state; },
      // Both write the fader, and both cancel whatever was scheduled on it: you have
      // just taken manual control of this lane, and a transition's ramp arriving on top
      // of the number you dialled is the wrong answer to that.
      setGain(db) { state.gain = db; applyLevel(); },
      setMute(m) { state.mute = !!m; applyLevel(); },
      // Dragging the pot cancels whatever the arrangement had scheduled and lands on the
      // sum, so the knob still reads as the channel's position while a bar is holding it
      // somewhere else. The sequencer writes its offset again at every bar line, so a
      // cancel here is undone by the next bar rather than being permanent.
      setPan(p) {
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
      /** 1 = as recorded, 0 = mono, 2 = pushed wide. */
      setWidth(w) { state.width = w; widthNode.set(w); },
      setSolo(on) {
        if (on) soloed.add(key); else soloed.delete(key);
        for (const s of strips.values()) s._applySolo();
      },
      setEQ(patch = {}) {
        Object.assign(state.eq, patch);
        laneEq.set(patch);
      },
      /** Accepts any subset of aux ids, e.g. { delay: 1, reverb2: 0.3 }. */
      setSend(patch = {}) {
        for (const [id, v] of Object.entries(patch)) {
          if (v == null || !sends.has(id)) continue;
          state.send[id] = v;
          const g = sends.get(id).gain;
          g.cancelScheduledValues(ctx.currentTime);
          g.value = v;
          // A send raised off zero has to have somewhere to arrive — see wakeAux.
          // Only ever upwards here: dropping the last send to zero leaves the return
          // wired and silent until the next applyMix prunes it, which costs a little
          // CPU and never costs a sound.
          if (v > 0) wakeAux(id);
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

      /** Pre-create every bar-effect route before the scheduler needs to select it. */
      prepareBarEffects(chains = [], bpm = 120) {
        for (const list of chains) {
          if (!Array.isArray(list) || !list.length) continue;
          const signature = JSON.stringify(list);
          if (barFxBranches.has(signature)) continue;
          const input = ctx.createGain(); input.gain.value = 0;
          dry.connect(input);
          const fxSlot = makeChainSlot(ctx, input, vol, { sleepWhenSilent: true });
          fxSlot.set(list, bpm);
          barFxBranches.set(signature, { input, slot: fxSlot, list });
        }
      },
      /** Select a prepared route at an audio time; deselected routes keep ringing out. */
      scheduleBarEffects(list = [], when = ctx.currentTime) {
        const signature = Array.isArray(list) && list.length ? JSON.stringify(list) : '';
        if (signature && !barFxBranches.has(signature)) this.prepareBarEffects([list]);
        if (signature === selectedBarFx) return;
        const previous = selectedBarFx;
        selectedBarFx = signature;
        if (signature) barFxBranches.get(signature)?.slot.wake(Infinity);
        // We know both sides of this switch. Anchor them explicitly instead of using
        // cancelAndHoldAtTime: an offline render queues later bars before processing
        // bar one, and Chromium's future hold can leak backwards through that queue.
        // Four milliseconds is the same click-safe edge rampParam uses for a snap.
        const at = Math.max(Number.isFinite(when) ? when : 0, ctx.currentTime);
        const switchGain = (param, from, to) => {
          param.cancelScheduledValues(at);
          param.setValueAtTime(from, at);
          param.linearRampToValueAtTime(to, at + 0.004);
        };
        switchGain(barDirect.gain, previous ? 0 : 1, signature ? 0 : 1);
        for (const [id, branch] of barFxBranches) {
          switchGain(branch.input.gain, id === previous ? 1 : 0, id === signature ? 1 : 0);
        }
        if (previous) barFxBranches.get(previous)?.slot.release(at + 0.004);
      },
      get _barFxSlots() { return [...barFxBranches.values()].map((branch) => branch.slot); },
      /** A new song owns a new set of snapshots; do not accumulate the last song's graphs. */
      clearBarEffects() {
        selectedBarFx = '';
        barDirect.gain.cancelScheduledValues(ctx.currentTime);
        barDirect.gain.value = 1;
        for (const branch of barFxBranches.values()) {
          branch.slot.dispose();
          try { dry.disconnect(branch.input); } catch { /* already gone */ }
          try { branch.input.disconnect(); } catch { /* already gone */ }
        }
        barFxBranches.clear();
      },

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
       * `state` is deliberately NOT written. It describes the mix AS AUTHORED, which is
       * what the desk draws and what pruneAuxes counts. A target that has not arrived is
       * not that yet, and recording it here would make the faders jump a quarter of a
       * second before the sound did.
       */
      rampTo({ gain, mute, pan, width, eq, send } = {}, when, seconds = 0) {
        if (gain != null || mute != null) {
          rampParam(ctx, pres.gain, mute ? 0 : dbToGain(gain ?? state.gain), when, seconds);
        }
        // The offset rides on top of a variant's pan exactly as it rides on the pot's:
        // a treatment that moves the lead is moving where the lead LIVES, and the bar
        // that pushes it across the room is still that bar's edit.
        if (pan != null) {
          panWritten = Math.max(-1, Math.min(1, pan + panOffset));
          rampParam(ctx, panner.pan, panWritten, when, seconds);
        }
        if (width != null) widthNode.ramp(width, when, seconds);
        if (eq) laneEq.ramp(eq, when, seconds);
        for (const [id, v] of Object.entries(send || {})) {
          if (v == null || !sends.has(id)) continue;
          if (v > 0) wakeAux(id);
          rampParam(ctx, sends.get(id).gain, v, when, seconds);
        }
      },

      level: () => meter.getValue(),
      _slot: slot,
      // The gate and the fader, reachable so a test can prove which of them monitoring
      // writes to. That split is the whole reason a transition survives you hitting
      // solo, and it is invisible from outside without these.
      _vol: vol,
      _pres: pres,
      _sends: sends,
      _applySolo: applySolo,
      _monitor: (g) => { monitor.gain.setTargetAtTime(g, ctx.currentTime, 0.01); },
    };
    strips.set(key, strip);
    // A strip built while a send is soloed has to arrive already silenced on its dry
    // path, or the layer you just made is the only channel you can hear.
    if (soloedAux.size) strip._monitor(0);
    return strip;
  };

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
  // masterTrim's own connections. Rewiring used to call masterTrim.disconnect(),
  // which tore off EVERY downstream node — including the master meter, which
  // applyMix() then silently killed on every song load by calling setLimiter().
  const masterOut = ctx.createGain();
  masterOut.gain.value = 1;

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

  const wireMaster = () => {
    if (!master) return;
    masterOut.disconnect();
    masterPan.disconnect();
    masterOut.connect(masterPan);
    if (limiterOn) {
      Tone.connect(masterPan, limiter);
      Tone.connect(limiter, destination);
    } else {
      limiter.disconnect();
      masterPan.connect(destination);
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
  if (master) {
    master.disconnect();
    master.connect(treatDry);
    treatDry.connect(masterTrim);
    treatWet.connect(masterTrim);
    treatSlot = makeChainSlot(ctx, master, treatWet);
    // Master chain sits after the trim and before the limiter, so anything here is
    // the last thing to touch the mix — which is where a bus compressor or a final
    // EQ belongs.
    masterSlot = makeChainSlot(ctx, masterTrim, masterOut);
    wireMaster();
  }

  // Same muted-sink treatment as the lane meters: without a path to the
  // destination the analyser is not pulled and the master meter sits dead while
  // every channel meter moves.
  // Two channels on the master alone, so the desk can show a stereo pair where every
  // other strip shows one bar: the master is the one place a lopsided mix is worth
  // seeing, and everywhere else the pan pot already tells you where the signal is.
  // Tapped at the trim, which is BEFORE masterPan — the only node on the bus whose
  // connections wireMaster() never tears down (see the masterOut note above). So the
  // pair shows the imbalance the channels are making, not the master balance you have
  // dialled on top of it.
  const masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.6, channelCount: 2 });
  Tone.connect(masterTrim, masterMeter);
  const masterMeterSink = ctx.createGain();
  masterMeterSink.gain.value = 0;
  Tone.connect(masterMeter, masterMeterSink);
  masterMeterSink.connect(ctx.destination);

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
      return !!s.state.mute || (soloed.size > 0 && !soloed.has(key));
    },
    /**
     * The master level as one number — the louder side, which is what a clip light and
     * a peak readout are asking about. Callers that want the pair use masterLevels().
     */
    masterLevel: () => {
      const v = masterMeter.getValue();
      return Array.isArray(v) ? Math.max(v[0] || 0, v[1] || 0) : v;
    },
    /** [left, right], 0..1. */
    masterLevels: () => {
      const v = masterMeter.getValue();
      return Array.isArray(v) ? [v[0] || 0, v[1] || 0] : [v || 0, v || 0];
    },

    /** Effects on the master bus, after the trim and before the limiter. */
    setMasterEffects(list = [], bpm = 120) { return masterSlot ? masterSlot.set(list, bpm) : 0; },
    get masterEffects() { return masterSlot ? masterSlot.chain : []; },
    setMasterEffectBypass(i, on) { masterSlot?.setBypass(i, on); },

    /** Effects on one send's return. */
    setAuxEffects(id, list = [], bpm = 120) {
      const a = auxes.get(id);
      return a ? a.slot.set(list, bpm) : 0;
    },
    auxEffects: (id) => auxes.get(id)?.slot.chain || [],
    /** How much is being sent into one aux, 0..1 — the send strip's meter. */
    auxLevel: (id) => auxes.get(id)?.meter.getValue() ?? 0,
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
      const slots = [
        ...[...strips.values()].map((s) => s._slot),
        ...[...strips.values()].flatMap((s) => s._barFxSlots || []),
        ...[...auxes.values()].map((a) => a.slot),
        masterSlot, treatSlot,
      ].filter(Boolean);
      for (const slot of slots) {
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
      const slot = target === '__master' ? masterSlot
        : target.startsWith('__aux:') ? auxes.get(target.slice(6))?.slot
          : strips.get(target)?._slot;
      const link = slot?.chain?.[index];
      if (!link) throw new Error(`mixer: no effect at ${target}[${index}] to ramp`);
      link.setAt(params, when, seconds, bpm);
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
      const slots = [
        ...[...strips.values()].map((s) => s._slot),
        ...[...strips.values()].flatMap((s) => s._barFxSlots || []),
        ...[...auxes.values()].map((a) => a.slot),
        masterSlot, treatSlot,
      ].filter(Boolean);
      for (const slot of slots) {
        for (const link of slot.chain || []) {
          if (typeof link.scheduleRhythm === 'function') {
            link.scheduleRhythm(step, when, sixteenth, bpm, swing);
          }
        }
      }
    },

    /** Build all arrangement-owned effect branches while no bar is switching them. */
    prepareBarEffects(plan = [], bpm = 120) {
      const byLane = new Map();
      for (const bar of plan || []) {
        for (const [key, chain] of Object.entries(bar.inlineFx || {})) {
          if (!byLane.has(key)) byLane.set(key, []);
          byLane.get(key).push(chain);
        }
      }
      for (const [key, chains] of byLane) {
        const strip = strips.get(key) || makeStrip(key);
        strip?.prepareBarEffects(chains, bpm);
      }
    },
    scheduleBarEffects(key, list, when) { strips.get(key)?.scheduleBarEffects(list, when); },
    scheduleBarEffectsForBar(bar = {}, when = ctx.currentTime) {
      for (const [key, strip] of strips) strip.scheduleBarEffects(bar.inlineFx?.[key] || [], when);
    },

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
    clearSolo() { soloed.clear(); for (const s of strips.values()) s._applySolo(); },
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
     * Kept, and resolved. The reverb used to build its impulse response by rendering
     * noise through its own offline context, so an offline render had to await it or
     * the aux was silent for the whole track. Ours generates the buffer in a loop and
     * is ready when it is constructed — but every caller that awaited this is right to,
     * and will be again the day something here is asynchronous.
     */
    ready: Promise.all(readyPromises),
    /** Reset every strip to unity — the state the songs were balanced against. */
    reset() {
      soloed.clear();
      soloedAux.clear();
      for (const s of strips.values()) {
        s.clearBarEffects();
        s.setPanOffset(0, ctx.currentTime, 0);
        s.setGain(0); s.setPan(0); s.setMute(false); s.setWidth(1);
        s.setEQ({ low: 0, mid: 0, high: 0 });
        s.setEffects([]);
        s.setSend(defaultSends());
      }
      if (masterSlot) masterSlot.set([]);
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
