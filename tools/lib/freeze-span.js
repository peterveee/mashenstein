// Find the part of one arranged lane that an offline Freeze actually needs to walk.
// This is deliberately musical rather than a post-render silence trim: starting the
// OfflineAudioContext later is what saves the time. Note FX is run through the same
// processor as playback so a latched or one-shot arpeggiator can extend the span past
// the last authored rectangle.
import {
  barPlan, songBars, sequenceValue, effectiveStepLen,
} from '../../src/engine/lanes.js';
import { createNoteFxProcessor, resolveNoteFx } from '../../src/engine/note-fx.js';
import { resolutionOf } from '../../src/data/arrangements.js';

const audible = (value) => value === true
  || (Number.isFinite(value) && value > 0)
  || (Array.isArray(value) && value.some((item) => Number.isFinite(item) && item > 0));

const longest = (value) => Array.isArray(value)
  ? Math.max(0, ...value.filter((item) => Number.isFinite(item)))
  : Number.isFinite(value) ? Math.max(0, value) : 0;

/**
 * @returns {null|{startStep:number,endStep:number,steps:number,tailSeconds:number,
 *   firstEventStep:number,lastEventStep:number,formSteps:number}}
 */
export function freezeRenderSpan(bank, lane, trackNoteFx = null, {
  playStartStep = 0,
  playEndStep = null,
  prerollBars = 1,
  releaseSeconds = 2,
} = {}) {
  if (!bank || !lane) return null;
  const plan = barPlan(bank, 1);
  const bars = songBars(bank, 1);
  const formSteps = plan.length * 16;
  const from = Math.max(0, Math.min(formSteps, Number(playStartStep) || 0));
  const to = Math.max(from, Math.min(formSteps,
    Number.isFinite(playEndStep) ? playEndStep : formSteps));
  const resolution = resolutionOf(bank);
  const tick = 16 / resolution;
  const spb = (60 / (Number(bank.bpm) || 112)) / 4;
  const processor = createNoteFxProcessor();
  let firstEventStep = Infinity;
  let lastEventStep = -Infinity;
  let latestEndStep = -Infinity;

  for (let barIndex = Math.floor(from / 16); barIndex < Math.ceil(to / 16); barIndex++) {
    const songBar = bars[barIndex];
    const bar = plan[barIndex];
    if (!songBar || !bar) continue;
    const silenced = bar.off?.includes(lane) || bar.delete?.includes(lane);
    for (let slot = 0; slot < resolution; slot++) {
      const step = barIndex * 16 + slot * tick;
      if (step < from || step >= to) continue;
      const sourceIndex = bar.half * resolution + slot;
      const value = silenced ? null : sequenceValue(songBar.b, lane, sourceIndex, resolution);
      const len = effectiveStepLen(songBar.b, lane, sourceIndex, resolution);
      const config = resolveNoteFx(trackNoteFx, bar, lane);
      let events;
      if (config?.strum?.enabled || config?.arp?.enabled) {
        events = processor.process({ laneKey: lane, value, len, step, spb, config, barIndex });
      } else if (audible(value)) {
        events = [{ delay: 0, len: longest(len) }];
      } else events = [];

      for (const event of events) {
        const at = step + Math.max(0, Number(event.delay) || 0) / spb;
        const end = at + longest(event.len);
        firstEventStep = Math.min(firstEventStep, at);
        lastEventStep = Math.max(lastEventStep, at);
        latestEndStep = Math.max(latestEndStep, end);
      }
    }
  }

  if (!Number.isFinite(firstEventStep)) return null;
  const firstBar = Math.floor(firstEventStep / 16);
  const lastBarEnd = Math.min(to, (Math.floor(lastEventStep / 16) + 1) * 16);
  const startStep = Math.max(from, (firstBar - Math.max(0, prerollBars)) * 16);
  const endStep = Math.max(startStep + tick, lastBarEnd);
  // Keep the established two-second release room, plus any written/generated gate
  // that reaches beyond the final scheduled bar. The renderer stops creating notes at
  // endStep; OfflineAudioContext continues processing their releases through this tail.
  const overhangSeconds = Math.max(0, latestEndStep - endStep) * spb;
  const tailSeconds = Math.max(0, releaseSeconds) + overhangSeconds;
  return {
    startStep, endStep, steps: endStep - startStep, tailSeconds,
    firstEventStep, lastEventStep, formSteps,
  };
}
