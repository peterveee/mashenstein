/*
 * MRDR-3's controller: one node per lane per context, and the bridge that gets notes to it.
 *
 * docs/MRDR-3-worklet-spec.md §6. This owns lifecycle and scheduling and does no
 * synthesis — the DSP is in dsp.js, the worklet host in worklet.js, and this decides which
 * node exists, what patch, tables and noise it holds, and at which integer frame each
 * event lands.
 *
 * ---- what a lane is ---------------------------------------------------------------
 *
 * One persistent AudioWorkletNode per {audioContext, laneKey} — not one per note, chord,
 * preset or unison member, which is the mistake the native path makes and the whole reason
 * this project exists. A lane's node lives as long as the lane does; notes are messages.
 *
 * ---- the two delivery paths --------------------------------------------------------
 *
 * Both are here because TNGR-2's proof gate established they are not interchangeable:
 *
 *   - `renderMrdr3Lane()` builds a node with the WHOLE schedule in `processorOptions`, for
 *     anything offline. Port delivery is not ordered against `startRendering()` and
 *     silently loses the schedule.
 *   - `mrdr3Lane()` + `mrdr3NoteOn`/`Off`/`panic` post to the port, for live playback,
 *     where the audio thread runs continuously and messages are pumped between quanta.
 *
 * Anything scheduled ahead of time still converts to an integer frame HERE, at this
 * boundary, so a note time is never rounded twice.
 */
import { ensureMrdr3Dsp, createMrdr3Node, canHostMrdr3 } from './worklet.js';
import { compileMrdr3, mrdr3Duties, mrdr3Colours } from './compile.js';
import { mrdr3Tables } from './tables.js';
import { mrdr3NoiseSet } from './noise.js';
import { frameAt } from './dsp.js';

export { canHostMrdr3, frameAt };

// Per context: the lanes it holds.
const contexts = new WeakMap();

const stateFor = (ctx) => {
  let state = contexts.get(ctx);
  if (!state) {
    state = { lanes: new Map() };
    contexts.set(ctx, state);
  }
  return state;
};

// ---- THE TABLES AND THE NOISE ARE NOT PER CONTEXT ---------------------------------
//
// MEASURED: building the pyramid is 407 ms, and structured-cloning it into a node is
// 0.1 ms. So the thing to avoid at all costs is BUILDING it twice, and the thing that
// does not matter is how many nodes carry a copy.
//
// It used to be cached per context, which reads as harmless until you count the contexts.
// The note cache renders every eligible note on its own OfflineAudioContext, and an
// offline render that reaches an MRDR-3 voice while the desk's AW override is on asks for
// a lane on a context that will never see another — so the pyramid was rebuilt, on the
// MAIN THREAD, once per cached note. A 250 ms task there does not touch the audio clock;
// it starves the note scheduler, the queue runs dry, and it comes out as a crack while
// the transport plays. `dropoutsDelta 1` with `clockMin 1.00` is that fault's signature.
//
// Nothing about either asset is contextual. The tables are built from the WHOLE library
// so a song can reach a new duty at any bar without discovering it mid-playback, and the
// noise depends on the RATE alone — so they are cached where their inputs are: once, and
// by rate.
let sharedTables = null;
const sharedNoise = new Map();

/**
 * Build the pyramid before anything is waiting for it.
 *
 * The 407 ms is unavoidable but its TIMING is not. Paid on the first note of a lane it is
 * a main-thread stall with the transport already running, which starves the note scheduler
 * and cracks; paid on an idle callback when the desk chooses the worklet backend, it is
 * nothing at all. Needs no context — the tables are rate-independent, and the noise, which
 * is not, is 2.7 ms.
 */
export function warmMrdr3Tables(voices) {
  if (!sharedTables) sharedTables = mrdr3Tables(mrdr3Duties(voices));
  return !!sharedTables;
}

/** The tables and noise every lane shares, built once per process (per rate, for noise). */
function assetsFor(ctx, voices) {
  if (!sharedTables) sharedTables = mrdr3Tables(mrdr3Duties(voices));
  const rate = ctx.sampleRate;
  // The noise a lane plays must be the noise the rest of the render is using, or a stem
  // stops matching its mix — so it is built at the CONTEXT's rate, once per rate.
  if (!sharedNoise.has(rate)) sharedNoise.set(rate, mrdr3NoiseSet(rate, mrdr3Colours(voices)));
  return { tables: sharedTables, noise: sharedNoise.get(rate) };
}

/** Everything about a voice that changes what the core renders. */
const signatureOf = (patch) => JSON.stringify(patch);

/**
 * The lane for a key, built if it does not exist.
 *
 * Returns null when the context cannot host a worklet — an insecure origin, most likely —
 * so a caller can say so rather than throw in the middle of a scheduling pass.
 */
export async function mrdr3Lane(ctx, laneKey, { voice, voices, maxGroups = 12, maxTones = 4 } = {}) {
  if (!canHostMrdr3(ctx)) return null;
  const state = stateFor(ctx);
  const existing = state.lanes.get(laneKey);
  const { patch, problems } = compileMrdr3(voice);
  if (!patch) return null;
  if (existing) {
    syncMrdr3Patch(existing, voice);
    return existing;
  }
  await ensureMrdr3Dsp(ctx);
  const assets = assetsFor(ctx, voices);
  const node = createMrdr3Node(ctx, {
    tables: assets.tables, noise: assets.noise, patch, maxGroups, maxTones,
  });
  const lane = {
    key: laneKey, node, ctx, patch, problems,
    signature: signatureOf(patch), connected: false, out: null, chorusKey: null,
    // When this lane last had a note. Read by `releaseIdleMrdr3Lanes` — a lane just built
    // has not played yet and must not read as one nothing has wanted for a minute.
    lastNoteAt: ctx.currentTime,
  };
  state.lanes.set(laneKey, lane);
  return lane;
}

/**
 * Put the lane on the patch the voice has NOW, if it has moved.
 *
 * The native path read the preset afresh on every note-on, so an edit was audible on the
 * next note without anything having to be told. A worklet lane holds a COMPILED patch
 * instead, installed when the node was built — so without this, turning a knob would
 * change the panel and the stored preset and nothing else.
 *
 * Called at note-on. The compile is cheap and the comparison is a string, so the cost is
 * microseconds on a note rather than anything per sample, and the message only goes when
 * something actually differs.
 */
export function syncMrdr3Patch(lane, voice) {
  if (!lane) return false;
  const { patch, problems } = compileMrdr3(voice);
  if (!patch) return false;
  const signature = signatureOf(patch);
  if (signature === lane.signature) return false;
  lane.node.port.postMessage({ type: 'installPatch', patch });
  lane.patch = patch;
  lane.problems = problems;
  lane.signature = signature;
  return true;
}

/** An already-created lane, if there is one. No awaiting, for use inside a scheduler. */
export const mrdr3LaneNow = (ctx, laneKey) => stateFor(ctx).lanes.get(laneKey) || null;

/**
 * Schedule a note on a live lane.
 *
 * A CHORD IS ONE MESSAGE and one event id — §6. Its tones share a note group, which is how
 * they reach the same drive shaper; sending one message per tone and reconstructing
 * simultaneity in the processor would be a different instrument.
 */
export function mrdr3NoteOn(lane, { at, hz, durSeconds, velocity = 1, eventId }) {
  if (!lane) return false;
  const rate = lane.ctx.sampleRate;
  const hzs = Array.isArray(hz) ? hz.filter((n) => n > 0) : (hz > 0 ? [hz] : []);
  if (!hzs.length) return false;
  const durs = Array.isArray(durSeconds)
    ? hzs.map((_, i) => frameAt(durSeconds[i] ?? durSeconds[0], rate))
    : frameAt(durSeconds, rate);
  lane.node.port.postMessage({
    type: 'noteOn', frame: frameAt(at, rate), eventId, hz: hzs, durFrames: durs, velocity,
  });
  lane.lastNoteAt = at;
  return true;
}

/** End a held note. Sequenced notes carry their own length and need none of this. */
export function mrdr3NoteOff(lane, { at, eventId }) {
  if (!lane) return false;
  lane.node.port.postMessage({
    type: 'noteOff', frame: frameAt(at, lane.ctx.sampleRate), eventId,
  });
  return true;
}

/**
 * Panic every lane on a context — the transport stopped, seeked or paused.
 *
 * NOT OPTIONAL, and the reason is specific to a worklet. A native voice is a graph of
 * nodes: suspend the context and it freezes with everything else. A worklet lane holds a
 * QUEUE of events stamped with absolute frames, and that queue outlives a pause. Anything
 * still in it fires when the transport comes back — at a musical moment that has been and
 * gone — and a scheduler that then posts notes for an EARLIER frame splices them in behind
 * the queue's own cursor, which is where a lane stops making sense at all.
 *
 * So a stop clears the queue, and the lanes come back empty rather than owing the past.
 */
export function mrdr3PanicAll(ctx, { at = 0 } = {}) {
  const state = contexts.get(ctx);
  if (!state) return 0;
  let n = 0;
  for (const lane of state.lanes.values()) { mrdr3Panic(lane, { at }); n++; }
  return n;
}

/** What every lane's processor says about itself — the instrument for a silent lane. */
export async function mrdr3LaneReport(ctx) {
  const state = contexts.get(ctx);
  if (!state) return [];
  const out = [];
  for (const [key, lane] of state.lanes) {
    // eslint-disable-next-line no-await-in-loop
    const h = await mrdr3Health(lane, 400);
    out.push({
      lane: key,
      connected: lane.connected,
      problems: lane.problems,
      ...(h || { unresponsive: true }),
    });
  }
  return out;
}

/** Clear everything sounding AND everything queued behind it. */
export function mrdr3Panic(lane, { at = 0 } = {}) {
  if (!lane) return false;
  lane.node.port.postMessage({
    type: 'panic', frame: frameAt(at, lane.ctx.sampleRate),
  });
  return true;
}

/** Ask a live lane what it is doing. Resolves with the processor's own counters. */
export function mrdr3Health(lane, timeout = 500) {
  if (!lane) return Promise.resolve(null);
  return new Promise((resolve) => {
    // A ONE-SHOT LISTENER, NOT `port.onmessage`.
    //
    // Assigning `onmessage` here replaced the handler `createMrdr3Node` installed — the
    // one that turns a `fault` message into a console error — and never put it back. So
    // the first time anything asked a lane how it was doing, that lane permanently lost
    // its ability to say that its DSP had thrown. The processor would go on filling
    // silence, exactly as designed, and the one line that explains why would never
    // appear again.
    //
    // That is the worst possible bug in a diagnostic: it does not break the sound, it
    // breaks the account of the sound, and it is triggered BY looking. `addEventListener`
    // stacks instead of replacing, and the listener removes itself either way.
    const port = lane.node.port;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      port.removeEventListener('message', onMessage);
      clearTimeout(timer);
      resolve(value);
    };
    const onMessage = (e) => { if (e.data?.type === 'health') finish(e.data); };
    const timer = setTimeout(() => finish(null), timeout);
    port.addEventListener('message', onMessage);
    port.postMessage({ type: 'report' });
  });
}

/** Release one lane: its node, its port and its place in the context's book. */
export function releaseMrdr3Lane(ctx, laneKey) {
  const state = stateFor(ctx);
  const lane = state.lanes.get(laneKey);
  if (!lane) return false;
  try { lane.node.port.postMessage({ type: 'stop' }); } catch { /* already gone */ }
  try { lane.node.disconnect(); } catch { /* never connected */ }
  try { lane.out?.disconnect(); } catch { /* ditto */ }
  lane.node.port.onmessage = null;
  state.lanes.delete(laneKey);
  return true;
}

/**
 * Release the lanes nothing has played for a while, and KEEP the rest.
 *
 * ---- why a song change must not simply drop every lane -----------------------------
 *
 * The desk re-banks constantly: a stop is `setBank(null)`, a voice change comes back
 * through `setBank`, and every one of those disposes the rack. The lanes are keyed on the
 * CONTEXT and the context outlives the rack, so the node the last bar played is the node
 * the next bar wants. What it needs is its queue cleared and its output re-pointed at the
 * new gate — two messages — where a teardown is a node built again from nothing.
 *
 * That rebuild is not catastrophic (the pyramid is shared, so it is not the 407 ms one)
 * but it is not free either: `processorOptions` carries about a megabyte of tables and
 * noise, and the copy is DESERIALISED ON THE AUDIO THREAD. Ten lanes rebuilt at once is
 * ten megabytes allocated under a thread with 2.9 ms to fill a block, for no gain.
 *
 * What must not accumulate is a lane no song is using any more, and that is what this
 * reaps. A lane still in the music is younger than `idleSeconds` by definition — the desk
 * cannot re-bank faster than the song plays.
 */
export function releaseIdleMrdr3Lanes(ctx, { idleSeconds = 30 } = {}) {
  const state = contexts.get(ctx);
  if (!state) return 0;
  const now = Number.isFinite(ctx.currentTime) ? ctx.currentTime : 0;
  let n = 0;
  for (const [key, lane] of [...state.lanes]) {
    if (now - (lane.lastNoteAt ?? 0) < idleSeconds) continue;
    releaseMrdr3Lane(ctx, key);
    n++;
  }
  return n;
}

/**
 * And every lane on a context — a teardown or a context replacement.
 *
 * NOT a song change: see `releaseIdleMrdr3Lanes` for why that one keeps its nodes. The
 * tables and the noise are not touched here at all — they belong to no context now, and
 * a 407 ms build is not something to throw away because a song ended.
 */
export function releaseMrdr3Context(ctx) {
  const state = contexts.get(ctx);
  if (!state) return 0;
  const n = state.lanes.size;
  for (const key of [...state.lanes.keys()]) releaseMrdr3Lane(ctx, key);
  state.lanes.clear();
  return n;
}

/** What the desk can show about a context's lanes. */
export function mrdr3ControllerHealth(ctx) {
  const state = contexts.get(ctx);
  if (!state) return { lanes: 0, tables: !!sharedTables, noise: sharedNoise.size > 0 };
  return {
    lanes: state.lanes.size,
    // Shared by every context now, so this says whether the pyramid has been paid for at
    // all — which is the only question worth asking about a 407 ms build.
    tables: !!sharedTables,
    noise: sharedNoise.size > 0,
    keys: [...state.lanes.keys()],
  };
}

/**
 * One offline lane, with its whole schedule handed over at construction.
 *
 * For a bounce, a stem, a range render or a freeze. The schedule CANNOT go over the port
 * here: it is not ordered against `startRendering()` and the render can finish with the
 * notes still queued, which comes back as silence with no error to say so.
 */
export async function renderMrdr3Lane(ctx, {
  voice, voices, events, destination, maxGroups = 12, maxTones = 4,
}) {
  const { patch } = compileMrdr3(voice);
  if (!patch) return null;
  await ensureMrdr3Dsp(ctx);
  const assets = assetsFor(ctx, voices);
  const node = createMrdr3Node(ctx, {
    tables: assets.tables, noise: assets.noise, patch, events, maxGroups, maxTones,
  });
  if (destination) node.connect(destination);
  return node;
}
