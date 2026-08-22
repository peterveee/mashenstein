/*
 * TNGR-2's controller: one node per lane per context, and the bridge that gets notes to it.
 *
 * §5 and §10. This owns lifecycle and scheduling and does no synthesis — the DSP is in
 * dsp.js, the worklet host in worklet.js, and this decides which node exists, what patch
 * and tables it holds, and at which integer frame each event lands.
 *
 * ---- what a lane is ------------------------------------------------------------
 *
 * One persistent AudioWorkletNode per {audioContext, laneKey}, per §5 — not one per note,
 * oscillator, frame or unison member, which is the mistake the native compatibility path
 * makes and the reason it exists to be replaced. A lane's node lives as long as the lane
 * does; notes are messages, not nodes.
 *
 * ---- the two delivery paths ----------------------------------------------------
 *
 * Both are here because the §3 proof gate proved they are not interchangeable:
 *
 *   - `render()` builds a node with the WHOLE schedule in `processorOptions`, for anything
 *     offline: a bounce, a stem, a range render, a freeze. Port messages are not ordered
 *     against `startRendering()` and silently lose the schedule.
 *   - `lane()` + `noteOn`/`noteOff`/`panic` post to the port, for live playback, where the
 *     audio thread runs continuously and messages are pumped between quanta.
 *
 * Anything scheduled ahead of time still converts to an integer frame HERE, at this
 * boundary, so a note time is never rounded twice.
 */
import { ensureTngr2Dsp, createTngr2Node, canHostTngr2 } from './worklet.js';
import { packTngr2Tables } from './tables.js';
import { migrateTngr2, tngr2CoreParams } from './schema.js';
import { compileTngr2Patch } from './dsp.js';

export { canHostTngr2 };

/**
 * Audio time to the integer frame the core counts in.
 *
 * At the controller boundary, once. A note time left as a float until it reached the DSP
 * would be rounded there instead, and the same event would land on different samples in
 * two renders of one song.
 */
export const frameAt = (seconds, sampleRate) => Math.max(0, Math.round(seconds * sampleRate));

// Per context: the lanes it holds, and the table payload it has already built.
const contexts = new WeakMap();
const MAX_TABLE_SETS = 8;

const stateFor = (ctx) => {
  let state = contexts.get(ctx);
  if (!state) {
    state = { lanes: new Map(), tableCache: new Map(), revision: 0 };
    contexts.set(ctx, state);
  }
  return state;
};

/**
 * The packed tables for each set of families, built once per context and reused.
 *
 * Keyed on the family list, so a song that reaches a new timbre rebuilds rather than
 * silently playing the wrong one — and a song that does not never pays again.
 */
function tablesFor(ctx, families) {
  const state = stateFor(ctx);
  const key = [...new Set(families)].sort().join(',');
  const cached = state.tableCache.get(key);
  if (cached) {
    // Refresh insertion order: the small map is an LRU, not a session-long history of
    // every pair somebody happened to audition in the editor.
    state.tableCache.delete(key);
    state.tableCache.set(key, cached);
    return cached;
  }
  const tables = packTngr2Tables(families);
  state.tableCache.set(key, tables);
  if (state.tableCache.size > MAX_TABLE_SETS) {
    state.tableCache.delete(state.tableCache.keys().next().value);
  }
  return tables;
}

/** Which families a patch needs — so a lane never carries the whole catalogue. */
export const familiesOf = (patch) => {
  const out = ['basic'];
  if (patch?.oscA?.table) out.push(patch.oscA.table);
  if (patch?.oscB?.on && patch?.oscB?.table) out.push(patch.oscB.table);
  return out;
};

/**
 * Prepare a patch for the core: migrated, validated, and turned into core parameters.
 *
 * Done once per patch rather than per note. `spb` is seconds per beat, which is how a
 * tempo-synced LFO learns the tempo without the core knowing what a beat is.
 */
export function prepareTngr2Patch(stored, { seed = 0, problems = [], vibrato = null, effects = null } = {}) {
  const patch = migrateTngr2(stored, { problems });
  return { patch, params: tngr2CoreParams(patch, { seed, vibrato, effects }) };
}

/**
 * The stored patch for a VOICE, not just its `tngr2` block.
 *
 * KEY MODE, GLIDE and VIBRATO are written on the voice itself — `v.mode`,
 * `v.portamento`, `v.vibrato` — because they are shared controls that every synth on the
 * desk offers, and the Note card edits them in one place for all of them. The `tngr2`
 * block knows nothing about them, so handing it to the core alone loses them: three
 * presets would quietly stop being monophonic and stop gliding.
 *
 * Vibrato is not part of the patch: it stays on the voice and is handed to the core
 * beside it, because it is a shared control rather than a TNGR-2 one. The core gives it
 * its own small oscillator onto pitch — one fixed job, no matrix.
 */
export function tngr2PatchForVoice(voice) {
  const stored = voice?.tngr2 || {};
  const out = { ...stored };
  if (voice?.mode && !stored.mode) out.mode = voice.mode;
  if (voice?.portamento > 0 && stored.glide === undefined) out.glide = voice.portamento;
  return out;
}

/**
 * The shared Effects card's drive, in the shape the core wants.
 *
 * Like vibrato, these live on the VOICE and not in the `tngr2` block — they are the same
 * keys the drum and MRDR-3 panels write. So they travel beside the patch: `validateTngr2`
 * builds its result from the schema's own key list, and anything handed to it that the
 * schema does not name is dropped, which is exactly what happened to these.
 *
 * CHORUS is not here. It is a lane effect built from native nodes after the lane's node
 * — see `_tngr2Output` — because there is nothing about it that needs to be inside a
 * voice, and the engine already has one chorus worth having.
 */
export const tngr2EffectsOf = (voice) => {
  const drive = Math.min(1, Math.max(0, Number(voice?.drive) || 0));
  if (!(drive > 0)) return null;
  return {
    drive,
    shape: voice.shape,
    drivePlace: voice.drivePlace,
    tone: voice.tone,
  };
};

/** The shared vibrato, in the shape the core wants: depth in semitones. */
export const tngr2VibratoOf = (voice) => {
  const vib = voice?.vibrato;
  const depth = Number(vib?.depth) || 0;
  if (!(depth > 0)) return null;
  return {
    depth: Math.min(24, depth),
    rate: Math.min(64, Math.max(0.01, Number(vib.rate) || 5)),
    delay: Math.max(0, Number(vib.delay) || 0),
  };
};

/**
 * A live lane: one persistent node, created on first use and kept.
 *
 * Returns null when the context cannot host a worklet — an insecure origin, most likely —
 * so a caller can fall back rather than throw in the middle of a scheduling pass.
 */
export async function tngr2Lane(ctx, laneKey, { stored, seed = 0, maxVoices = 16, vibrato = null, effects = null } = {}) {
  if (!canHostTngr2(ctx)) return null;
  const state = stateFor(ctx);
  const existing = state.lanes.get(laneKey);
  const { patch, params } = prepareTngr2Patch(stored, { seed, vibrato, effects });
  if (existing) {
    // A lane that is already playing takes a patch change as a message: continuous values
    // reach sounding notes, and structural ones bind to the notes that follow. Rebuilding
    // the node instead would cut every note that was still sounding.
    const signature = JSON.stringify(params);
    if (signature !== existing.signature) {
      existing.node.port.postMessage({
        type: 'installCompiledPatch', patch: compileTngr2Patch(params),
      });
      existing.params = params;
      existing.patch = patch;
      existing.signature = signature;
    }
    const tables = tablesFor(ctx, familiesOf(patch));
    if (tables !== existing.tables) {
      existing.node.port.postMessage({ type: 'installTables', tables });
      existing.tables = tables;
    }
    return existing;
  }
  await ensureTngr2Dsp(ctx);
  const tables = tablesFor(ctx, familiesOf(patch));
  const node = createTngr2Node(ctx, {
    tables, compiledPatch: compileTngr2Patch(params), maxVoices,
  });
  const lane = {
    key: laneKey, node, tables, patch, params, ctx, generation: 0,
    signature: JSON.stringify(params),
  };
  state.lanes.set(laneKey, lane);
  return lane;
}

/**
 * Put the lane on the patch the voice has NOW, if it has moved.
 *
 * The native path read the preset afresh on every note-on, so an edit was audible on the
 * next note without anything having to be told. A worklet lane holds a COMPILED patch
 * instead, installed when the node was built — which means that without this, turning a
 * knob changed the panel and the stored preset and nothing else, and switching the lane
 * to a different preset entirely went on sounding like the old one.
 *
 * Called at note-on. The compile is cheap and the comparison is a string, so the cost is
 * a few microseconds on a note rather than anything per sample; the message only goes
 * when something actually differs.
 */
export function syncTngr2Patch(lane, stored, { seed = 0, vibrato = null, effects = null } = {}) {
  if (!lane) return false;
  const { patch, params } = prepareTngr2Patch(stored, { seed, vibrato, effects });
  const signature = JSON.stringify(params);
  if (signature === lane.signature) return false;
  lane.node.port.postMessage({
    type: 'installCompiledPatch', patch: compileTngr2Patch(params),
  });
  lane.patch = patch;
  lane.params = params;
  lane.signature = signature;
  // A different family needs different tables, and a lane only carries the ones it uses.
  const tables = tablesFor(lane.ctx, familiesOf(patch));
  if (tables !== lane.tables) {
    lane.node.port.postMessage({ type: 'installTables', tables });
    lane.tables = tables;
  }
  return true;
}

/** An already-created lane, if there is one. No awaiting, for use inside a scheduler. */
export const tngr2LaneNow = (ctx, laneKey) => stateFor(ctx).lanes.get(laneKey) || null;

/**
 * Schedule a note on a live lane.
 *
 * `at` is audio time, converted to a frame here. `eventId` is the note's identity and is
 * what a note-off refers to — and what seeds its phase, so it must be stable between a
 * stem and the mix it belongs to.
 *
 * `regate` is for one caller and says one thing: this note-on is a note being HANDED
 * BACK, not a key going down. A key coming up while another is still held moves the
 * pitch and leaves the envelopes alone whatever the lane's mode is — see
 * `_releasePreview`. Left undefined, the lane's own mode decides, as it always has.
 */
export function tngr2NoteOn(lane, { at, hz, velocity = 1, eventId, regate }) {
  if (!lane) return;
  lane.node.port.postMessage({
    type: 'noteOn', frame: frameAt(at, lane.ctx.sampleRate), hz, velocity, eventId, regate,
  });
}

export function tngr2NoteOff(lane, { at, eventId }) {
  if (!lane) return;
  lane.node.port.postMessage({
    type: 'noteOff', frame: frameAt(at, lane.ctx.sampleRate), eventId,
  });
}

/*
 * §7.3's continuous controller used to be posted from here as {type:'param'}. It is gone
 * rather than kept warm: Tngr2Core.apply handles noteOn, noteOff and panic and nothing
 * else, so every param message was copied, insertion-sorted into the queue, carried
 * through the per-sample loop and dropped without ever being read. A mod wheel is a
 * feature to be built with a destination on the other end, not a transport to leave
 * running into the floor.
 */

/**
 * Stop everything on a lane, now.
 *
 * §5: a panic clears sounding voices AND the events queued behind them, and belongs to a
 * transport generation — an event from the old generation must not be honoured after a
 * stop. The generation is carried so a late message can be recognised as stale.
 */
export function tngr2Panic(lane, { at = 0, transportGeneration = 0 } = {}) {
  if (!lane) return;
  lane.generation = transportGeneration;
  lane.node.port.postMessage({
    type: 'panic', frame: frameAt(at, lane.ctx.sampleRate), transportGeneration,
  });
}

/**
 * Release one lane: stop its processor and disconnect its node.
 *
 * `stop` rather than only `disconnect`, because a disconnected processor keeps being
 * pulled by the context and keeps its voices — §5 requires teardown to release nodes and
 * repeating LFO state, not merely to unhook the output.
 */
export function releaseTngr2Lane(ctx, laneKey) {
  const state = stateFor(ctx);
  const lane = state.lanes.get(laneKey);
  if (!lane) return false;
  try { lane.node.port.postMessage({ type: 'stop' }); } catch { /* already gone */ }
  try { lane.node.disconnect(); } catch { /* context may already be closed */ }
  state.lanes.delete(laneKey);
  return true;
}

/** Release every lane on a context — a song switch, a context replacement, a teardown. */
export function releaseTngr2Context(ctx) {
  const state = contexts.get(ctx);
  if (!state) return 0;
  const keys = [...state.lanes.keys()];
  for (const key of keys) releaseTngr2Lane(ctx, key);
  state.tableCache.clear();
  contexts.delete(ctx);
  return keys.length;
}

/** What the controller is holding, for §11's diagnostics. */
export function tngr2ControllerHealth(ctx) {
  const state = contexts.get(ctx);
  if (!state) return { lanes: 0, families: 0, tableBytes: 0, tableSets: 0 };
  let bytes = 0;
  const families = new Set();
  const buffers = new Set();
  for (const tables of state.tableCache.values()) {
    for (const family of Object.keys(tables.index || {})) families.add(family);
    for (const levels of tables.families) {
      for (const level of levels) {
        const buffer = level.buffer || level;
        if (buffers.has(buffer)) continue;
        buffers.add(buffer);
        bytes += level.byteLength;
      }
    }
  }
  return {
    lanes: state.lanes.size,
    families: families.size,
    tableBytes: bytes,
    tableSets: state.tableCache.size,
  };
}

/**
 * Where a range render has to START so that it matches the full render.
 *
 * A range beginning at bar four cannot simply begin at bar four: a note struck at bar
 * three may still be sounding, and a note-on stamped before the range would otherwise be
 * applied at the range's first sample — re-striking, at the wrong moment, a note that
 * should already be halfway through its release.
 *
 * So the render begins early enough to catch every note that could still be audible, and
 * the caller throws away the frames before the range. That is the pre-roll, and this
 * computes it from the schedule rather than guessing a fixed amount: a note counts if its
 * gate plus the patch's release reaches into the range.
 *
 * Returns the frame to start rendering at and how many frames to trim off the front.
 * `frameOffset` for the render is the start frame, so events keep their absolute frames
 * and every free-running phase lands where the full render put it.
 */
export function tngr2RangePlan(patch, events, fromFrame, sampleRate) {
  const release = Math.max(0, patch?.amp?.release || 0) * sampleRate;
  let start = Math.max(0, Math.round(fromFrame));
  const offs = new Map();
  for (const event of events) {
    if (event.type === 'noteOff') offs.set(event.eventId, event.frame);
  }
  for (const event of events) {
    if (event.type !== 'noteOn' || event.frame >= fromFrame) continue;
    // An un-released note is held: it is certainly still sounding.
    const end = offs.has(event.eventId) ? offs.get(event.eventId) + release : Infinity;
    if (end >= fromFrame) start = Math.min(start, event.frame);
  }
  return { startFrame: start, trimFrames: Math.max(0, Math.round(fromFrame) - start) };
}

/**
 * Render a lane offline, with its whole schedule known up front.
 *
 * This is the path every export takes — bounce, stem, range render, freeze — and it is
 * deliberately NOT the live path: the events go in `processorOptions` because port
 * delivery is not ordered against `startRendering()`. See §3 finding (b).
 *
 * `startFrame` exists for a range render: the events keep their absolute frames, so a
 * range beginning after bar zero renders the same samples it does inside a full render,
 * including where a free-running LFO and a seeded phase had got to.
 */
export async function renderTngr2Lane(ctx, {
  stored, events, seed = 0, maxVoices = 16, destination = null, frameOffset = 0,
  vibrato = null, effects = null,
}) {
  const { patch, params } = prepareTngr2Patch(stored, { seed, vibrato, effects });
  await ensureTngr2Dsp(ctx);
  const tables = tablesFor(ctx, familiesOf(patch));
  const node = createTngr2Node(ctx, {
    tables, compiledPatch: compileTngr2Patch(params), maxVoices, events, frameOffset,
  });
  node.connect(destination || ctx.destination);
  return node;
}
