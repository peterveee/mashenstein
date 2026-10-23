/*
 * FRPP-6's controller: one node per lane per context, and the bridge that gets notes to
 * it. The shape is TNGR-2's (tngr2/controller.js), and the rack drives both through the
 * same methods — see `WORKLET_LANES` in voices.js. Messages on the port are TNGR-2's too
 * (noteOn / noteOff / choke / panic, each stamped with an integer frame), plus a `level`
 * on a note-on, because here a note's loudness and its strength are two different things.
 *
 * What differs is the patch: a compiled FRPP-6 patch carries its exciter tables and its
 * level curve, built on the main thread (tables.js), and travels to the processor whole.
 */
import { ensureFrpp6Dsp, createFrpp6Node, canHostFrpp6 } from './worklet.js';
import { compileFrpp6 } from './tables.js';

export { canHostFrpp6 };

export const frameAt = (seconds, sampleRate) => Math.max(0, Math.round(seconds * sampleRate));

const contexts = new WeakMap();
const stateFor = (ctx) => {
  let state = contexts.get(ctx);
  if (!state) {
    state = { lanes: new Map() };
    contexts.set(ctx, state);
  }
  return state;
};

/**
 * What the core installs for a voice: its `frpp6` block plus the shared voice controls
 * (KEY MODE, GLIDE, vibrato), compiled at this context's rate. Memoised in tables.js, so
 * the same preset on many notes compiles once. The `key` is what tells a lane that the
 * preset has moved.
 */
function compiledFor(ctx, voice) {
  // The Effects card's keys too — DRIVE, SHAPE, PLACE, TONE, and the PEAK its knee sits at.
  // They were left out here at first, so the drive was built into the engine and tested
  // there, and turning DRIVE on the desk changed nothing (Peter, 23 Oct 2026).
  return compileFrpp6({
    frpp6: voice?.frpp6 || {}, mode: voice?.mode, portamento: voice?.portamento,
    vibrato: voice?.vibrato, drive: voice?.drive, shape: voice?.shape,
    drivePlace: voice?.drivePlace, tone: voice?.tone, peak: voice?.peak,
  }, ctx.sampleRate);
}

/** A live lane: one persistent node, created on first use and kept. Null if it cannot exist. */
export async function frpp6Lane(ctx, laneKey, { voice } = {}) {
  if (!canHostFrpp6(ctx)) return null;
  const state = stateFor(ctx);
  const existing = state.lanes.get(laneKey);
  if (existing) {
    syncFrpp6Patch(existing, voice);
    return existing;
  }
  await ensureFrpp6Dsp(ctx);
  // Released while the DSP loaded (a song change), or another build won the race: the same
  // two answers tngr2Lane gives, for the same reasons (tests/worklet-lane-races.js).
  if (contexts.get(ctx) !== state) return null;
  if (state.lanes.has(laneKey)) return frpp6Lane(ctx, laneKey, { voice });
  const patch = compiledFor(ctx, voice);
  const node = createFrpp6Node(ctx, { patch });
  const lane = { key: laneKey, node, ctx, patch, generation: 0 };
  state.lanes.set(laneKey, lane);
  return lane;
}

/**
 * Put the lane on the patch the voice has NOW. Compiles are memoised, so an unchanged
 * preset returns the same object and nothing is posted; a turned knob posts the new patch,
 * and the next pluck plays it.
 */
export function syncFrpp6Patch(lane, voice) {
  if (!lane) return false;
  const patch = compiledFor(lane.ctx, voice);
  if (patch === lane.patch) return false;
  lane.node.port.postMessage({ type: 'installPatch', patch });
  lane.patch = patch;
  return true;
}

export const frpp6LaneNow = (ctx, laneKey) => stateFor(ctx).lanes.get(laneKey) || null;

export function frpp6NoteOn(lane, { at, hz, velocity = 1, level = 1, eventId }) {
  if (!lane) return;
  lane.node.port.postMessage({
    type: 'noteOn', frame: frameAt(at, lane.ctx.sampleRate), hz, velocity, level, eventId,
  });
}

export function frpp6NoteOff(lane, { at, eventId }) {
  if (!lane) return;
  lane.node.port.postMessage({ type: 'noteOff', frame: frameAt(at, lane.ctx.sampleRate), eventId });
}

export function frpp6Choke(lane, { at }) {
  if (!lane) return;
  lane.node.port.postMessage({ type: 'choke', frame: frameAt(at, lane.ctx.sampleRate) });
}

export function frpp6Panic(lane, { at = 0 } = {}) {
  if (!lane) return;
  lane.node.port.postMessage({ type: 'panic', frame: frameAt(at, lane.ctx.sampleRate) });
}

export function releaseFrpp6Lane(ctx, laneKey) {
  const state = stateFor(ctx);
  const lane = state.lanes.get(laneKey);
  if (!lane) return false;
  try { lane.node.port.postMessage({ type: 'stop' }); } catch { /* already gone */ }
  try { lane.node.disconnect(); } catch { /* context may already be closed */ }
  state.lanes.delete(laneKey);
  return true;
}

export function frpp6LanesOf(ctx) {
  const state = contexts.get(ctx);
  return state ? [...state.lanes.values()] : [];
}

export function releaseFrpp6Context(ctx) {
  const state = contexts.get(ctx);
  if (!state) return 0;
  const keys = [...state.lanes.keys()];
  for (const key of keys) releaseFrpp6Lane(ctx, key);
  contexts.delete(ctx);
  return keys.length;
}

export function frpp6ControllerHealth(ctx) {
  const state = contexts.get(ctx);
  return { lanes: state ? state.lanes.size : 0 };
}

/**
 * Render a lane offline, its schedule known up front (or posted a stretch at a time with
 * `postTngr2Events`, which works on any processor that answers 'events' with an 'ack').
 */
export async function renderFrpp6Lane(ctx, { voice, events, destination = null, frameOffset = 0 }) {
  await ensureFrpp6Dsp(ctx);
  const node = createFrpp6Node(ctx, { patch: compiledFor(ctx, voice), events, frameOffset });
  node.connect(destination || ctx.destination);
  return node;
}
