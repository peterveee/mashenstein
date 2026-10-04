// A LANE AS IT WILL BE HEARD — one lane's notes, in order, with the arrangement already
// applied, as the event view Auto Portamento plans from.
//
// The scheduler reads a lane one step at a time and has no use for what comes next. A
// slide needs exactly that: the gate of the note that is ABOUT to be scheduled has to
// reach the one after it, and by the time that one is scheduled the first has already
// been told when to end. So the song is read ahead of the transport, here, through the
// same seams the scheduler reads it through — the bar plan, the section each bar plays,
// the mute mask, the bar's transposition, the lane's drawn lengths — and handed to
// `planAutoPortamento` as plain events. There is one interpretation of the arrangement
// (`songBars`, which the arrangement suite already holds equal to `scheduleStep`), and this
// file adds nothing to it but the walk.
//
// What it does NOT do is call the Note FX processor. That is stateful per lane: asking it
// about a step that has not been played yet and then asking again when it is would be two
// different arpeggios. A bar whose Note FX generate their own events is a barrier here —
// the passage is not melody this file can read — and the arpeggiator is left to itself.
//
// Browser-safe, and free of the audio engine: the generator reads the same view to decide
// whether a take has anything worth sliding, and the desk to say so.

import {
  songBars, barPlan, sequenceValue, stepLen, effectiveToneLength, perNoteLengthLane,
} from './lanes.js';
import { resolutionOf } from '../data/arrangements.js';
import { voiceOf, baseLane, CHORD_LANES } from '../data/voices.js';
import { resolveNoteFx } from './note-fx.js';
import {
  autoPortamentoSupport, planAutoPortamento, readAutoPortamento,
} from './auto-portamento.js';

/**
 * Can this lane be slid at all, whatever sits on it? A pitched lane that holds one note
 * at a step and has per-note lengths: bass, lead, harmony, twinkle and the layers of
 * them. Chord lanes hold chords and the gesture lanes hold shapes, so neither is melody.
 */
export const autoPortamentoLane = (laneKey) => perNoteLengthLane(laneKey)
  && !CHORD_LANES.includes(baseLane(laneKey));

const sixteenth = (step, resolution) => Math.round(step * resolution / 16);

/** A note's identity: its lane and the transport tick it starts on. Stable across passes. */
export const laneEventId = (laneKey, step, resolution) => `${laneKey}@${sixteenth(step, resolution)}`;

const barValue = (map, key) => (typeof map === 'number' ? map
  : (Number.isFinite(map?.[key]) ? map[key] : 0));

/**
 * Build a view over a bank.
 *
 *   bank        the bank as the engine plays it — sections, order and voices already merged
 *   mix         the mix entry, for the lane's Note FX (a bar that arpeggiates is a barrier)
 *   resolution  the transport's grid, slots to the bar
 *   formSteps   the length of one pass, in sixteenth steps
 *   position    Rearrange only: (outputStep) => { sourceStep, slice, mute, semitones,
 *               harmonise } | null — where the output clock is reading the source
 *   voiceFor    (barBank, laneKey) => voice, for a caller whose voices are not on the bank
 *               yet — the generator's output keeps them on the mix until the engine merges
 *               them. Defaults to the engine's own `voiceOf`.
 *
 * Returns `{ resolve, events, plan }`.
 */
export function createLaneView({
  bank, mix = null, resolution, formSteps, position = null, voiceFor = voiceOf,
}) {
  const bars = songBars(bank);
  const tick = 16 / resolution;
  const ticks = Math.max(0, Math.round(formSteps / tick));
  const supportCache = new Map();
  const supportOf = (voice) => {
    if (!voice) return autoPortamentoSupport(null);
    let hit = supportCache.get(voice);
    if (!hit) { hit = autoPortamentoSupport(voice); supportCache.set(voice, hit); }
    return hit;
  };

  /**
   * What lane `key` sounds at one output step, said the way the scheduler hears it:
   *
   *   { kind: 'rest' }
   *   { kind: 'note', hz, len, explicit, voice, offset, slice }
   *   { kind: 'chord' }
   *   { kind: 'barrier', reason }
   */
  function resolve(key, step) {
    let pos = null;
    if (position) {
      pos = position(step);
      if (!pos) return { kind: 'barrier', reason: 'discontinuity' };
    }
    const sourceStep = pos ? pos.sourceStep : step;
    if (!bars.length || !Number.isFinite(sourceStep)) return { kind: 'rest' };
    const barIndex = Math.floor(sourceStep / 16) % bars.length;
    const entry = bars[barIndex];
    const slice = pos ? pos.slice : 'form';
    if (pos?.mute || entry.off?.includes(key) || entry.delete?.includes(key)) {
      return { kind: 'rest', slice };
    }
    const s = Math.round((sourceStep % 16) * resolution / 16) + entry.half * resolution;
    const value = sequenceValue(entry.b, key, s, resolution);
    const tones = Array.isArray(value) ? value.filter((hz) => hz > 0) : (value > 0 ? [value] : []);
    if (!tones.length) return { kind: 'rest', slice };
    if (tones.length > 1) return { kind: 'chord', slice };
    // Note FX that generate events own this bar's notes; what they play is theirs to say.
    const fx = resolveNoteFx(mix?.lanes?.[key]?.noteFx, entry.bar, key);
    if (fx?.arp?.enabled || fx?.strum?.enabled) return { kind: 'barrier', reason: 'fx', slice };
    const voice = voiceFor(entry.b, key);
    if (!supportOf(voice).supported) return { kind: 'barrier', reason: 'unsupported', slice };
    // The bar's transposition, the way the scheduler applies it: whole-number maps reach
    // every pitched lane, a per-lane map only the lanes it names; Rearrange adds its own.
    const semitones = barValue(entry.bar.transpose, key) + (pos?.semitones || 0);
    let hz = tones[0];
    if (pos?.harmonise) hz = pos.harmonise(hz);
    if (semitones) hz *= 2 ** (semitones / 12);
    const drawn = stepLen(entry.b, key, s, resolution);
    return {
      kind: 'note', hz,
      // Steps, in the engine's sixteenth unit — what `playVoice` multiplies by `spb`.
      len: effectiveToneLength(entry.b, key, s, 0, resolution),
      // A drawn length, or the lane's default. The planner reads the second more kindly.
      explicit: Array.isArray(drawn) ? drawn[0] > 0 : drawn != null,
      voice: voice.id || null,
      // The bar's timing nudge, in the half-sixteenths the arrangement states it in.
      offset: barValue(entry.bar.offset, key),
      slice,
    };
  }

  /**
   * The lane's whole pass as an ordered event view: notes, and a barrier wherever a slide
   * must not go — a chord, a bar of generated Note FX, a different instrument, an
   * unsupported one, a place the transport jumps.
   */
  function events(key) {
    const out = [];
    const pushBarrier = (reason) => {
      if (out.length && !out[out.length - 1].barrier) out.push({ barrier: reason });
    };
    let lastSlice;
    let lastVoice = null;
    for (let i = 0; i < ticks; i++) {
      const step = i * tick;
      const at = resolve(key, step);
      if (at.slice !== undefined) {
        if (lastSlice !== undefined && at.slice !== lastSlice) pushBarrier('discontinuity');
        lastSlice = at.slice;
      }
      if (at.kind === 'rest') continue;
      if (at.kind === 'chord') { pushBarrier('chord'); lastVoice = null; continue; }
      if (at.kind === 'barrier') { pushBarrier(at.reason); lastVoice = null; continue; }
      if (lastVoice && at.voice !== lastVoice) pushBarrier('voice');
      lastVoice = at.voice;
      out.push({
        id: laneEventId(key, step, resolution), step, tick: i,
        start: step / 4, gate: at.len / 4, len: at.len, hz: at.hz,
        length: at.explicit ? 'explicit' : 'inherited',
        offset: at.offset, voice: at.voice,
      });
    }
    return out;
  }

  /**
   * Plan one lane: the event view, the planner's verdict on it, and the answer indexed by
   * tick — which is what the scheduler asks for as it reaches each note.
   *
   * `byTick.get(tick)` is `{ id, step, hz, len, offset, into, out }`: `into` when the note is the
   * destination of a chosen slide (the source's id and the glide, in seconds), `out` when
   * it is the source of one (where the next note is, and how far this gate must reach).
   */
  function plan(key, config, { secondsPerBeat }) {
    const view = events(key);
    const { transitions, diagnostics, candidates, qualifying } = planAutoPortamento(view, config, {
      secondsPerBeat,
    });
    const byId = new Map();
    const byTick = new Map();
    for (const item of view) {
      if (item.barrier) continue;
      const entry = { ...item, into: null, out: null };
      byId.set(item.id, entry);
      byTick.set(item.tick, entry);
    }
    for (const t of transitions) {
      const from = byId.get(t.sourceId);
      const to = byId.get(t.destinationId);
      if (!from || !to) continue;
      // What the destination was when this was planned, so the scheduler can tell an edit
      // that has moved it from a bridge that is still good.
      from.out = {
        to: to.id, toStep: to.step, toTick: to.tick, toOffset: to.offset,
        toHz: to.hz, toLen: to.len,
        gateEndBeat: t.sourceGateEndBeat, glideSeconds: t.glideSeconds, reason: t.reason,
      };
      to.into = { from: from.id, glideSeconds: t.glideSeconds, reason: t.reason };
    }
    return { key, events: view, transitions, diagnostics, candidates, qualifying, byId, byTick };
  }

  return { resolve, events, plan, ticks, tick };
}

/**
 * What Auto Portamento could do to one lane of a song, for the desk's card: whether the lane
 * can take it, how many connections qualify at the lane's own Amount, and how many its
 * settings use. Null when there is no song to ask about.
 *
 * Pure: it asks nothing of the audio engine, so the desk can answer it for a song that is
 * parked as well as one that is playing — `bank` is the bank as the engine would play it
 * (layers materialised, voices merged), which is what `applyMix` hands back. The engine's own
 * `autoPortamentoReport` is this, over the bank it is playing and the view it already holds.
 */
export function autoPortamentoReportOf({ bank, mix, key, secondsPerBeat, view = null }) {
  if (!bank || !key || !(secondsPerBeat > 0)) return null;
  if (!autoPortamentoLane(key)) return { supported: false, reason: 'lane', eligible: 0, chosen: 0 };
  const support = autoPortamentoSupport(voiceOf(bank, key));
  if (!support.supported) return { ...support, eligible: 0, chosen: 0 };
  const lanes = view || createLaneView({
    bank, mix, resolution: resolutionOf(bank), formSteps: barPlan(bank).length * 16,
  });
  const { config } = readAutoPortamento(mix?.lanes?.[key]?.noteFx?.portamento);
  // At the Amount the lane runs at — or the default one, for a lane that has not been
  // switched on — so "nothing suitable" means nothing that Amount could ever use.
  const asked = { ...config, enabled: true, amount: config.amount > 0 ? config.amount : 35 };
  return {
    supported: true, reason: null,
    eligible: lanes.plan(key, asked, { secondsPerBeat }).qualifying,
    chosen: lanes.plan(key, config, { secondsPerBeat }).transitions.length,
  };
}
