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
export const DELAY_THROW = { id: 'delay', params: { sync: 1, division: 0.75, feedback: 0.6, wet: 0.5 } };
// A gentle eighth-note ping-pong: the space a scripted section opens up (Kraftwerk's Isolation).
export const PING_PONG = { id: 'pingpong', params: { sync: 1, division: 0.5, feedback: 0.35, wet: 0.3 } };
export const LOWPASS = (frequency, Q = 0.9) => ({ id: 'filter', params: { type: 'lowpass', frequency, Q } });

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
export function buildFx({ options, events, laneOf, total, lanesSounding }) {
  let auto = null;
  const lane = (role) => laneOf.get(role) || null;
  const fx = options.fx;

  // The intro, through a wall and/or crushed — one master section over it.
  if (events.intro && (fx.lowpassIntro || fx.bitcrushIntro)) {
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
    // The snare roll swelling from twelve under up to the fader.
    if (options.drums.rolls && lane('snare') && !build.short) {
      auto = setLaneFade(auto, lane('snare'), a, b, -12, 0, 'even');
    }
    // The last beat: the whole mix repeating in sixteenths, then thirty-seconds, a
    // high-pass climbing under it.
    if (fx.stutter && build.intoDrop) {
      const s = posOf(build.to, 12);
      auto = addSections(auto, MASTER_KEY, [
        section(s, s + 2, [STUTTER(0.25, -1), HIGHPASS(500)]),
        section(s + 2, s + 4, [STUTTER(0.125, -1), HIGHPASS(1200)]),
      ]);
    }
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
  if (fx.delayThrows && lane('hook')) {
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

  // The tape stop: the last two bars winding down, the whole mix.
  if (fx.tapeStop && total >= 2) {
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
