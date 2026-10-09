// MAKE A BANGER — the FX: everything the notes cannot do on their own, written as the
// desk's own automation (src/data/automation.js) so every move is there to see and edit
// on the desk afterwards. Master sections, lane sections, cuts and fades, through the
// same functions the desk's editors use.
//
// Nothing here is a look-ahead effect: every chain is section-safe (SECTION_EFFECTS in
// src/engine/effects.js — the tests check). Browser-safe.
import { posOf, replaceFxRange, addLaneCut, setLaneFade, laneFx, MASTER_KEY } from '../../../src/data/automation.js';

export const STUTTER = (slice, fade = 0) => ({ id: 'stutter', params: { slice, retrigger: 0, fade } });
export const CRUSH = (bits = 6, downsample = 4) => ({ id: 'bitcrusher', params: { bits, downsample, wet: 1 } });
export const HIGHPASS = (frequency, Q = 0.9) => ({ id: 'filter', params: { type: 'highpass', frequency, Q } });
export const SWEEP = (f0, f1, type = 'lowpass', Q = 0.9) => ({ id: 'filter', params: { type, frequency: f0, Q, sweep: 1, sweepTo: f1 } });
// The desk's Tape Stop preset (src/data/effect-presets.js): the mix winding down over two bars.
export const TAPE_STOP = { id: 'stutter', params: { slice: 0, retrigger: 0, fade: 0, stop: 8 } };
/**
 * A short tape stop on a transition (Spot FX → Tape Stop, 3 Oct 2026): the mix winding
 * down over the last `beats` of a bar and standing still on the bar line, so the next
 * section starts from nothing. One beat; two from 160 BPM, where one is over before the
 * ear hears a tape slowing.
 */
export const tapeStopBeats = (bpm) => (bpm >= 160 ? 2 : 1);
export const TRANSITION_TAPE_STOP = (beats) => ({ id: 'stutter', params: { slice: 0, retrigger: 0, fade: 0, stop: beats } });
export const DELAY_THROW = { id: 'delay', params: { sync: 1, division: 0.75, feedback: 0.6, wet: 0.5 } };
// A gentle eighth-note ping-pong: the space a scripted section opens up (Kraftwerk's Isolation).
export const PING_PONG = { id: 'pingpong', params: { sync: 1, division: 0.5, feedback: 0.35, wet: 0.3 } };
export const LOWPASS = (frequency, Q = 0.9) => ({ id: 'filter', params: { type: 'lowpass', frequency, Q } });
/**
 * The Machine-Gun Sweep (Peter's, 6 Oct 2026): the last half bar before a drop held in
 * thirty-seconds while a low-pass closes from 18 kHz to 200 Hz, so the drop lands out of a
 * choke. The desk's own Machine Gun and Sweep Down presets (src/data/effect-presets.js).
 * One of the run-ups below; a style with `machineGunSweep` has it in its draw.
 */
export const MACHINE_GUN_SWEEP = [STUTTER(0.125, 0), SWEEP(18000, 200, 'lowpass', 1.2)];
/**
 * Stutter Before Drop's run-ups (Peter, 6 Oct 2026): every build into a drop gets one, but
 * not the same one — each draws from these by weight, never the one the build before it
 * had, so the classic stutter stays the commonest without being every time. The ids are
 * Spot FX → Into a Drop's own, so any one of them can also be asked for by name. Without
 * a random stream (a direct call) the classic stutter, as before.
 */
export const INTO_DROP_RUNUPS = Object.freeze([
  { id: 'stutter', weight: 3 },
  { id: 'ramp', weight: 2 },
  { id: 'repeat', weight: 2 },
  { id: 'sweep', weight: 2 },
  { id: 'wash', weight: 1 },
  { id: 'tapeStop', weight: 1 },
  { id: 'machineGun', weight: 1, style: 'machineGunSweep' },
]);
/** A build's snare swell where the style names none: twelve under, even. */
export const ROLL_SWELL = Object.freeze({ from: -12, shape: 'even' });

export const REVERB_WASH = { id: 'reverb', params: { decay: 4.5, preDelay: 0.02, low: 0, mid: 0, high: -3, width: 1, wet: 0.55 } };
export const BAND_PASS = { id: 'filter', params: { type: 'bandpass', frequency: 1400, Q: 1.3 } };
export const ECHO_OUT = { id: 'delay', params: { sync: 1, division: 0.75, feedback: 0.65, wet: 0.55 } };

/**
 * The chords' rhythm gate, by name (Chord Gate). Division in beats: 1 a quarter (the
 * pump), 0.5 an eighth, 0.25 a sixteenth (the trance gate), 0.75 a dotted eighth.
 */
export const GATES = Object.freeze({
  pump: { id: 'rhythmgate', params: { division: 1, gateLength: 1, attack: 0.16, decay: 0.02, depth: 0.65 } },
  eighths: { id: 'rhythmgate', params: { division: 0.5, gateLength: 0.6, attack: 0.004, decay: 0.06, depth: 0.85 } },
  sixteenths: { id: 'rhythmgate', params: { division: 0.25, gateLength: 0.55, attack: 0.002, decay: 0.04, depth: 0.9 } },
  dotted: { id: 'rhythmgate', params: { division: 0.75, gateLength: 0.6, attack: 0.004, decay: 0.05, depth: 0.85 } },
});
/** The gate a section of `energy` gets under Chord Gate = By Energy. */
export const gateForEnergy = (energy) => (energy >= 0.85 ? 'sixteenths' : energy >= 0.6 ? 'eighths' : 'pump');
/**
 * The gate on the chords' strip, or null: the style's own (Style), a named one, none (Off,
 * or the Sidechain Pump switch off) — or none on the strip under By Energy, whose gates
 * are written section by section instead (buildFx).
 */
export function stripGate(options, style) {
  if (!options.fx.pump) return null;
  const g = options.fx.gate || 'style';
  if (g === 'style') return style.pump || null;
  return GATES[g] || null;
}

/**
 * FILTER MOVES (9 Oct 2026, docs/LAB_STYLES_PLAN.md): one part's slow filter movement over bars
 * `from`..`to` (1-based, inclusive), as automation sections for its lane. A recipe asks for them by
 * role, `filterMoves: { bass: { shape, lo, hi, Q, over } }`:
 *   · `open` — a low-pass opening from `lo` to `hi` across the span; `close`, the other way;
 *   · `riseFall` — open to `hi` across the first half, closed back to `lo` across the second;
 *   · `stepped` — held cutoffs climbing from `lo` to `hi` two bars at a time.
 * `Q` is the resonance (an acid line's movement wants some); `over` is 'section' (the default) or
 * 'phrase', every eight bars of it. The movement belongs to its part: in a fusion it comes from
 * whichever style owns that part (fusion.js, a split key).
 */
export const FILTER_MOVE_SHAPES = Object.freeze(['open', 'close', 'riseFall', 'stepped']);
export function filterMoveSections({ shape = 'open', lo = 400, hi = 8000, Q = 0.9 } = {}, from, to) {
  const n = to - from + 1;
  if (n < 1) return [];
  if (shape === 'close') return [section(posOf(from, 0), posOf(to + 1, 0), SWEEP(hi, lo, 'lowpass', Q))];
  if (shape === 'riseFall' && n >= 2) {
    const mid = from + Math.floor(n / 2);
    return [section(posOf(from, 0), posOf(mid, 0), SWEEP(lo, hi, 'lowpass', Q)),
      section(posOf(mid, 0), posOf(to + 1, 0), SWEEP(hi, lo, 'lowpass', Q))];
  }
  if (shape === 'stepped') {
    const steps = Math.max(1, Math.ceil(n / 2));
    return Array.from({ length: steps }, (_, k) => {
      const hz = Math.round(lo * (hi / lo) ** (steps > 1 ? k / (steps - 1) : 1));
      return section(posOf(from + 2 * k, 0), posOf(Math.min(to + 1, from + 2 * k + 2), 0), LOWPASS(hz, Q));
    });
  }
  return [section(posOf(from, 0), posOf(to + 1, 0), SWEEP(lo, hi, 'lowpass', Q))];
}

/** Sections added to a lane, alongside whatever it already has. */
function addSections(auto, key, sections) {
  let out = auto;
  for (const s of sections) out = replaceFxRange(out, key, s.from, s.to, [s]);
  return out;
}
const section = (from, to, chain) => ({ from, to, chain: Array.isArray(chain) ? chain : [chain] });

/**
 * The automation for a song: `events` from the section builders, `laneOf` mapping
 * roles to lanes, `total` bars. Returns the automation object, or null.
 */
export function buildFx({ options, events, laneOf, total, lanesSounding, form = [], bpm = 120, style = {}, rng = null }) {
  let auto = null;
  const lane = (role) => laneOf.get(role) || null;
  const fx = options.fx;
  const spot = options.spot || {};
  const own = (k) => (spot[k] || 'style') === 'style';
  const bar = (b, step = 0) => posOf(b, step);
  const master = (from, to, chain) => { auto = addSections(auto, MASTER_KEY, [section(from, to, chain)]); };
  // The last beat (or two) of bar `b`, winding down into the bar line.
  const tapeStopInto = (b) => {
    const beats = tapeStopBeats(bpm);
    master(bar(b, 16 - 4 * beats), bar(b + 1), TRANSITION_TAPE_STOP(beats));
  };

  // A run-up into a drop over the end of bar `b`, by its Spot FX id.
  const intoDrop = (id, b) => {
    if (id === 'stutter') {
      master(bar(b, 12), bar(b, 14), [STUTTER(0.25, -1), HIGHPASS(500)]);
      master(bar(b, 14), bar(b + 1), [STUTTER(0.125, -1), HIGHPASS(1200)]);
    } else if (id === 'ramp') {
      // The stutter starting a beat early and speeding up: eighths, sixteenths, thirty-seconds.
      master(bar(b, 8), bar(b, 12), [STUTTER(0.5, -1), HIGHPASS(250)]);
      master(bar(b, 12), bar(b, 14), [STUTTER(0.25, -1), HIGHPASS(600)]);
      master(bar(b, 14), bar(b + 1), [STUTTER(0.125, -1), HIGHPASS(1500)]);
    } else if (id === 'repeat') {
      master(bar(b, 8), bar(b, 12), [STUTTER(0.5, 0)]);
      master(bar(b, 12), bar(b + 1), [STUTTER(0.25, -1)]);
    } else if (id === 'sweep') master(bar(b), bar(b + 1), SWEEP(150, 6000, 'highpass', 1.2));
    else if (id === 'wash') master(bar(b, 8), bar(b + 1), REVERB_WASH);
    else if (id === 'tapeStop') tapeStopInto(b);
    else if (id === 'machineGun') master(bar(b, 8), bar(b + 1), MACHINE_GUN_SWEEP);
  };
  // The style's run-up for one build: drawn by weight, never the last build's.
  let lastRunup = null;
  const drawRunup = () => {
    if (!rng) return 'stutter';
    const pool = INTO_DROP_RUNUPS.filter((r) => (!r.style || style[r.style]) && r.id !== lastRunup);
    let pick = rng.next() * pool.reduce((t, r) => t + r.weight, 0);
    lastRunup = (pool.find((r) => (pick -= r.weight) < 0) || pool[pool.length - 1]).id;
    return lastRunup;
  };

  // ---- Spot FX by purpose (More Options → Spot FX). `Style` is the switches' own moves.
  // Into a drop or a chorus: the last bar before every section that carries the hook.
  if (!own('intoDrop') && spot.intoDrop !== 'none') {
    form.forEach((s, i) => {
      const prev = form[i - 1];
      if (!prev || !(s.hook || ['drop', 'drop2', 'drop3', 'reprise'].includes(s.role)) || prev.role === s.role) return;
      intoDrop(spot.intoDrop, prev.to);
    });
  }
  // Out of a big section into a quieter one: the last bar before it.
  if (!own('outOf') && spot.outOf !== 'none') {
    form.forEach((s, i) => {
      const next = form[i + 1];
      if (!next || !((next.energy ?? 0.5) < (s.energy ?? 0.5) - 0.1 || ['breakdown', 'false', 'middle8'].includes(next.role))) return;
      const b = s.to;
      if (spot.outOf === 'throw' && lane('hook')) auto = addSections(auto, lane('hook'), [section(bar(b, 8), Math.min(bar(total + 1), bar(b + 1, 4)), DELAY_THROW)]);
      else if (spot.outOf === 'wash') master(bar(b, 8), bar(b + 1), REVERB_WASH);
      else if (spot.outOf === 'lowpass') master(bar(b), bar(b + 1), SWEEP(16000, 400));
      else if (spot.outOf === 'tapeStop') tapeStopInto(b);
    });
  }
  // The quiet sections themselves: breakdowns and middle 8s.
  if (spot.quiet && spot.quiet !== 'none') {
    for (const s of form.filter((x) => x.role === 'breakdown' || x.role === 'middle8')) {
      const a = bar(s.from); const z = bar(s.to + 1);
      if (spot.quiet === 'underwater') master(a, z, SWEEP(700, 16000));
      else if (spot.quiet === 'echo') { for (const role of ['hook', 'piano']) if (lane(role)) auto = addSections(auto, lane(role), [section(a, z, PING_PONG)]); }
      else if (spot.quiet === 'reverb') { for (const role of ['hook', 'piano', 'pad', 'choir']) if (lane(role)) auto = addSections(auto, lane(role), [section(a, z, REVERB_WASH)]); }
    }
  }
  // The intro, its own way.
  if (!own('intro') && events.intro && spot.intro !== 'none') {
    const chain = { lowpass: SWEEP(500, 16000), bitcrush: CRUSH(6, 4), radio: BAND_PASS }[spot.intro];
    if (chain) master(bar(events.intro.from), bar(events.intro.to + 1), chain);
  }
  // The ending, its own way (Tape Stop also stops the song looping — index.js).
  if (!own('ending') && spot.ending !== 'none' && total >= 4) {
    if (spot.ending === 'tapeStop') master(bar(total - 1), bar(total + 1), TAPE_STOP);
    else if (spot.ending === 'echo') master(bar(total - 1), bar(total + 1), ECHO_OUT);
    else if (spot.ending === 'fade') for (const key of new Set(laneOf.values())) auto = setLaneFade(auto, key, bar(total - 3), bar(total + 1), 0, -40, 'even');
  }

  // The intro, through a wall and/or crushed — one master section over it.
  if (own('intro') && events.intro && (fx.lowpassIntro || fx.bitcrushIntro)) {
    const chain = [];
    if (fx.bitcrushIntro) chain.push(CRUSH(6, 4));
    if (fx.lowpassIntro) chain.push(SWEEP(500, 16000));
    auto = addSections(auto, MASTER_KEY, [section(posOf(events.intro.from, 0), posOf(events.intro.to + 1, 0), chain)]);
  }

  for (const build of events.builds) {
    const a = posOf(build.from, 0);
    const b = posOf(build.to + 1, 0);
    // The music opening through a low-pass across the build — the tune's lanes only, so
    // the roll keeps its crack and the riser its air.
    if (fx.filterBuild && !build.short) {
      for (const role of ['saws', 'piano', 'pad', 'bass', 'sub', 'arp', 'square']) {
        const key = lane(role);
        if (key) auto = addSections(auto, key, [section(a, b, SWEEP(350, 14000, 'lowpass', 1.1))]);
      }
    }
    // The snare roll swelling up to the fader — from the style's own depth on its own curve
    // (`drums.rollSwell`, twelve under and even if it has none), and in a style with a
    // `drums.rollSweep` a filter opening under it, the roll climbing like a pitch.
    if (options.drums.rolls && lane('snare') && !build.short) {
      const swell = style.drums?.rollSwell || ROLL_SWELL;
      auto = setLaneFade(auto, lane('snare'), a, b, swell.from, 0, swell.shape);
      const sweep = style.drums?.rollSweep;
      if (sweep) auto = addSections(auto, lane('snare'), [section(a, b, SWEEP(sweep.from, sweep.to, sweep.type, sweep.Q))]);
    }
    // The run-up into the drop (INTO_DROP_RUNUPS): the classic stutter — the whole mix
    // repeating in sixteenths, then thirty-seconds, a high-pass climbing under it — or one
    // of its variations, a different one from the build before.
    if (own('intoDrop') && fx.stutter && build.intoDrop) intoDrop(drawRunup(), build.to);
  }

  // Hard stops: everything that could be ringing cut dead — except the riser, which is
  // the run-up into the drop.
  // A false ending's stop is on its downbeat, where the crash, the impact and the held
  // chord are struck — those ring on into the silence, which is the point of it.
  for (const stop of events.stops) {
    const at = posOf(stop.bar, stop.step);
    const spare = new Set([lane('riser'), ...(stop.false ? [lane('crash'), lane('impact'), lane('pad')] : [])]);
    for (const key of lanesSounding(stop.bar)) {
      if (spare.has(key)) continue;
      auto = addLaneCut(auto, key, at);
    }
  }

  // The hook in octaves is hotter: down a flat 2.5 dB across those bars.
  if (events.octaveBars.length && lane('hook')) {
    const runs = [];
    for (const bar of [...events.octaveBars].sort((x, y) => x - y)) {
      const last = runs[runs.length - 1];
      if (last && bar === last[1] + 1) last[1] = bar;
      else runs.push([bar, bar]);
    }
    for (const [x, y] of runs) auto = setLaneFade(auto, lane('hook'), posOf(x, 0), posOf(y + 1, 0), -2.5, -2.5, 'even');
  }

  // Throws: an echo off the hook's last note before a breakdown or a stop.
  if (own('outOf') && fx.delayThrows && lane('hook')) {
    for (const t of events.throws) {
      const a = posOf(t.bar, t.step);
      const b = Math.min(posOf(total + 1, 0), a + 4);
      if (b > a) auto = addSections(auto, lane('hook'), [section(a, b, DELAY_THROW)]);
    }
  }

  // A scripted form's own moves (sections.js, Style's Own Form): an echo over a block, a
  // low-pass closing a step a bar from 5 kHz to 250 Hz, a fade to silence.
  for (const e of events.echoes || []) {
    for (const role of e.roles) {
      const key = lane(role);
      if (key) auto = addSections(auto, key, [section(posOf(e.from, 0), posOf(e.to + 1, 0), PING_PONG)]);
    }
  }
  for (const f of events.filterDowns || []) {
    const n = f.to - f.from + 1;
    for (const role of f.roles) {
      const key = lane(role);
      if (!key) continue;
      const steps = [];
      for (let i = 0; i < n; i++) {
        const hz = Math.round(5000 * (250 / 5000) ** (n > 1 ? i / (n - 1) : 1));
        steps.push(section(posOf(f.from + i, 0), posOf(f.from + i + 1, 0), LOWPASS(hz)));
      }
      auto = addSections(auto, key, steps);
    }
  }
  for (const f of events.fadeOuts || []) {
    for (const role of f.roles) {
      const key = lane(role);
      if (key) auto = setLaneFade(auto, key, posOf(f.from, 0), posOf(f.to + 1, 0), 0, -40, 'even');
    }
  }

  // A section sung under the chorus (a verse, a pre-chorus, a middle 8 on the hook's own
  // lane) a little under it — the chorus is the loudest the tune gets.
  for (const t of events.trims || []) {
    const key = lane(t.role);
    if (key) auto = setLaneFade(auto, key, posOf(t.from, 0), posOf(t.to + 1, 0), t.db, t.db, 'even');
  }
  // A chorus quoted in the intro, heard through a wall that opens across it — unless Spot
  // FX names the intro's effect itself: a choice made there owns the intro (3 Oct 2026; it
  // used to land under this sweep and never be heard).
  const introOwned = !own('intro') && events.intro;
  for (const sw of events.sweeps || []) {
    if (introOwned && sw.from <= events.intro.to && sw.to >= events.intro.from) continue;
    auto = addSections(auto, MASTER_KEY, [section(posOf(sw.from, 0), posOf(sw.to + 1, 0), SWEEP(400, 16000))]);
  }

  // FILTER MOVES: a part's own slow filter movement across each section it plays in (or each
  // eight-bar phrase of it) — `style.filterMoves`, by role. See `filterMoveSections`. Never over
  // a build, which has the Filter Build's sweep; written before the gate, which joins it.
  for (const [role, move] of Object.entries(style.filterMoves || {})) {
    const key = lane(role);
    if (!key || !move) continue;
    const inBuild = (s) => events.builds.some((bd) => s.from <= bd.to && s.to >= bd.from);
    for (const s of form) {
      if (inBuild(s)) continue;
      const spans = move.over === 'phrase'
        ? Array.from({ length: Math.ceil((s.to - s.from + 1) / 8) }, (_, k) => [s.from + 8 * k, Math.min(s.to, s.from + 8 * k + 7)])
        : [[s.from, s.to]];
      for (const [from, to] of spans) auto = addSections(auto, key, filterMoveSections(move, from, to));
    }
  }

  // Chord Gate = By Energy: the chords gated section by section, slower where the song is
  // quiet and faster where it hits — a pump in a verse, eighths in a build, sixteenths in a
  // drop. Last, so a gate joins whatever a section already has (a build's sweep) rather
  // than being replaced by it.
  if (fx.pump && fx.gate === 'energy') {
    for (const role of [...(options.parts.chords === 'stabs' ? [] : ['saws']), ...(options.parts.chords === 'pad' ? ['pad'] : []),
      ...(fx.gateChoir ? ['choir'] : [])]) {
      const key = lane(role);
      if (!key) continue;
      for (const s of form) {
        const a = bar(s.from); const z = bar(s.to + 1);
        const there = laneFx(auto, key).find((x) => x.from === a && x.to === z);
        auto = addSections(auto, key, [section(a, z, [...(there?.chain || []), GATES[gateForEnergy(s.energy ?? 0.6)]])]);
      }
    }
  }

  // The tape stop: the last two bars winding down, the whole mix.
  if (own('ending') && fx.tapeStop && total >= 2) {
    auto = addSections(auto, MASTER_KEY, [section(posOf(total - 1, 0), posOf(total + 1, 0), TAPE_STOP)]);
  }
  return auto;
}

/** Every effect section's chain ids, for the tests. */
export function sectionIds(automation) {
  const out = [];
  for (const key of Object.keys(automation || {})) {
    for (const s of laneFx(automation, key)) for (const e of s.chain) out.push(e.id);
  }
  return out;
}
