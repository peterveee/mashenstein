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
import { createEffect, TEMPO_DIVISIONS, MAX_DELAY_SECONDS } from './effects.js';

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
  { id: 'delay', name: 'Delay', type: 'delay', legacy: true, defaultSend: 0 },
  { id: 'reverb', name: 'Reverb', type: 'reverb', defaultSend: 0 },
];

export const AUX_DEFAULTS = {
  delay: { division: 0.75, feedback: 0.35, tone: 2800, level: 1, pan: 0, mute: false, eq: { low: 0, mid: 0, high: 0 } },
  reverb: { decay: 2.2, preDelay: 0.012, level: 1, pan: 0, mute: false, eq: { low: 0, mid: 0, high: 0 } },
};

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
function makeChainSlot(ctx, from, to) {
  const inGain = ctx.createGain();
  const outGain = ctx.createGain();
  let chain = [];

  const rewire = () => {
    try { from.disconnect(to); } catch { /* not wired */ }
    try { from.disconnect(inGain); } catch { /* not wired */ }
    try { outGain.disconnect(to); } catch { /* not wired */ }
    for (const link of chain) {
      try { (link.node.output || link.node).disconnect(); } catch { /* fine */ }
    }
    // A bypassed effect is skipped in the wiring, not turned down: one with a tail
    // would keep ringing and you would be comparing against its leftovers.
    const live = chain.filter((l) => !l.bypassed);
    if (!live.length) { from.connect(to); return; }
    from.connect(inGain);
    let prev = inGain;
    for (const link of live) {
      Tone.connect(prev, link.node.input || link.node);
      prev = link.node.output || link.node;
    }
    Tone.connect(prev, outGain);
    outGain.connect(to);
  };
  rewire();

  return {
    rewire,
    get chain() { return chain; },
    set(list = [], bpm = 120) {
      for (const link of chain) { try { link.node.dispose(); } catch { /* fine */ } }
      chain = list.map((e) => {
        const link = createEffect(e.id, e.params, ctx, bpm);
        if (link) link.bypassed = !!e.bypass;
        return link;
      }).filter(Boolean);
      rewire();
      return chain.length;
    },
    setBypass(i, on) { if (chain[i]) { chain[i].bypassed = !!on; rewire(); } },
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
  };
}

// Reverb is Tone.Reverb — convolution with a generated impulse response.
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
// Note a decay change rebuilds the impulse response asynchronously; the desk awaits
// it rather than glitching mid-note.

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
      if (tone != null) this.state.tone = Math.max(200, Math.min(16000, tone));
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
 * @param {object} buses  { musicBus, echoBus, master } — all created by audio.js.
 *                        The strips feed musicBus/echoBus, so the existing echo
 *                        topology is untouched; `master` is re-routed through the
 *                        master trim and limiter on its way to the destination.
 * @returns {{ lane(key): Strip, setMasterTrim(db), lanes: string[], setAux(), limiter, ready: Promise }}
 */
// Delay time as a fraction of a beat — the same musical lengths every other synced
// effect offers. The engine has always run a dotted eighth (the YMCK-style bounce
// the songs were written against), so that stays the default.
export const DELAY_DIVISIONS = TEMPO_DIVISIONS;

export function createMixer(ctx, { musicBus, echoBus, master, songTrim, delayLp }) {
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
      reverb = new Tone.Reverb({ decay: d.decay, preDelay: d.preDelay, wet: 1 });
      input = ctx.createGain();
      Tone.connect(input, reverb);
      Tone.connect(reverb, eq.input);
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

  for (const { key } of LANES) {
    // Dry input: every voice in the lane connects here. Forced to explicit stereo
    // so the panner downstream always sees two channels — see the pan note above.
    const dry = ctx.createGain();
    dry.channelCount = 2;
    dry.channelCountMode = 'explicit';
    dry.channelInterpretation = 'speakers';
    // Wet input: only voices whose own echo flag is set, preserving the engine's
    // existing per-voice behaviour (bass80s' body echoes, its sub does not).
    const wet = ctx.createGain();

    const vol = ctx.createGain();
    vol.gain.value = 1;
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;

    const laneEq = makeEq(ctx);

    // Lanes the engine keeps dry (percussion, vocals, bass without bassEcho) have
    // no voice wired to `wet`, so their delay send had nothing to send and the
    // control sat there doing nothing. This routes the whole lane into the send
    // path instead, which makes the send live on every strip. It changes nothing
    // by default because those lanes' send defaults to 0 — see applyMix.
    const dryTap = ctx.createGain();
    dryTap.gain.value = 0;
    dry.connect(dryTap);
    dryTap.connect(wet);

    const widthNode = makeWidth(ctx);

    // Monitoring only, and last in the chain: soloing a send has to silence the dry
    // path AFTER the send taps below, or the bus you soloed goes quiet along with
    // everything feeding it. Never written to a mix.
    const monitor = ctx.createGain();
    monitor.gain.value = 1;

    // The channel path: fader, pan, EQ, then the effect chain (spliced in by
    // rewireChain below), then the stereo width stage into the music bus.
    dry.connect(vol);
    vol.connect(panner);
    panner.connect(laneEq.input);
    widthNode.output.connect(monitor);
    monitor.connect(musicBus);            // the strip's only route to the mix

    // One send per aux. The legacy delay taps `wet` — the per-voice echo routing
    // the songs were written against — so its gain has to carry the fader itself,
    // because `wet` is fed by the voices pre-fader. Every other aux taps `vol`,
    // which is already post-fader.
    const sends = new Map();
    for (const def of AUXES) {
      const g = ctx.createGain();
      g.gain.value = def.legacy ? def.defaultSend : 0;
      if (def.legacy) wet.connect(g);
      else vol.connect(g);
      g.connect(auxes.get(def.id).input);
      sends.set(def.id, g);
    }

    const slot = makeChainSlot(ctx, laneEq.output, widthNode.input);

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
    const applyMute = () => {
      const silenced = state.mute || (soloed.size > 0 && !soloed.has(key));
      const g = silenced ? 0 : dbToGain(state.gain);
      vol.gain.value = g;
      for (const def of AUXES) {
        const node = sends.get(def.id);
        // Pre-fader taps carry the fader here; post-fader taps already have it.
        node.gain.value = def.legacy ? g * (state.send[def.id] ?? 0)
          : (silenced ? 0 : (state.send[def.id] ?? 0));
      }
    };

    const strip = {
      key,
      dry,
      wet,
      get state() { return state; },
      setGain(db) { state.gain = db; applyMute(); },
      setPan(p) { state.pan = Math.max(-1, Math.min(1, p)); panner.pan.value = state.pan; },
      /** 1 = as recorded, 0 = mono, 2 = pushed wide. */
      setWidth(w) { state.width = w; widthNode.set(w); },
      setMute(m) { state.mute = !!m; applyMute(); },
      setSolo(on) {
        if (on) soloed.add(key); else soloed.delete(key);
        for (const s of strips.values()) s._applyMute();
      },
      setEQ(patch = {}) {
        Object.assign(state.eq, patch);
        laneEq.set(patch);
      },
      /** Accepts any subset of aux ids, e.g. { delay: 1, reverb2: 0.3 }. */
      setSend(patch = {}) {
        for (const [id, v] of Object.entries(patch)) {
          if (v != null && sends.has(id)) state.send[id] = v;
        }
        applyMute();
      },
      /**
       * Feed the whole lane into the delay send, for lanes whose voices never tap
       * it themselves. Set once per bank by applyMix; the send level still decides
       * how much actually goes.
       */
      setDryTap(on) { dryTap.gain.value = on ? 1 : 0; },

      /**
       * Replace this channel's effect chain. `list` is [{ id, params }] in order.
       * Rebuilt wholesale rather than diffed: chains are two or three links long and
       * a rebuild is microseconds, where a diff is a source of subtle wrongness.
       */
      setEffects(list = [], bpm = 120) { state.effects = list; return slot.set(list, bpm); },
      get effects() { return slot.chain; },
      /** Temporarily take one effect out of the chain, without losing its settings. */
      setEffectBypass(index, on) { slot.setBypass(index, on); },

      level: () => meter.getValue(),
      _applyMute: applyMute,
      _monitor: (g) => { monitor.gain.setTargetAtTime(g, ctx.currentTime, 0.01); },
    };
    strips.set(key, strip);
  }

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
      Tone.connect(limiter, ctx.destination);
    } else {
      limiter.disconnect();
      masterPan.connect(ctx.destination);
    }
  };
  let masterSlot = null;
  if (master) {
    master.disconnect();
    master.connect(masterTrim);
    // Master chain sits after the trim and before the limiter, so anything here is
    // the last thing to touch the mix — which is where a bus compressor or a final
    // EQ belongs.
    masterSlot = makeChainSlot(ctx, masterTrim, masterOut);
    wireMaster();
  }

  // Same muted-sink treatment as the lane meters: without a path to the
  // destination the analyser is not pulled and the master meter sits dead while
  // every channel meter moves.
  const masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.6 });
  Tone.connect(masterTrim, masterMeter);
  const masterMeterSink = ctx.createGain();
  masterMeterSink.gain.value = 0;
  Tone.connect(masterMeter, masterMeterSink);
  masterMeterSink.connect(ctx.destination);

  return {
    lanes: LANES.map((l) => l.key),
    lane: (key) => strips.get(key),
    masterLevel: () => masterMeter.getValue(),

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
    /** Retune every tempo-synced aux after a bank change. */
    retune(bpm) {
      for (const a of auxes.values()) if (a.engine) a.engine.set(bpm, a.state);
    },

    /**
     * Unhook auxes nothing is sending to. A ConvolverNode is not free just because
     * its input is silent — but a node with no path to the destination is never
     * pulled at all, so an unused reverb costs exactly nothing. This game runs on
     * phones; two idle convolvers is not a rounding error there.
     *
     * Called after the sends are set, so it sees the finished picture.
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
    clearSolo() { soloed.clear(); for (const s of strips.values()) s._applyMute(); },
    /** Every reverb builds its IR asynchronously; offline renders must await this. */
    ready: Promise.all(readyPromises),
    /** Reset every strip to unity — the state the songs were balanced against. */
    reset() {
      soloed.clear();
      soloedAux.clear();
      for (const s of strips.values()) {
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
      for (const s of strips.values()) s._monitor(1);
      masterTrim.gain.value = 1;
      masterPan.pan.value = 0;
    },
  };
}
