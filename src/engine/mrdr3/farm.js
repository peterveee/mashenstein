/*
 * The MRDR-3 voice farm — Stage 4 of docs/WASM-audio-engine-plan.md.
 *
 * MRDR-3 lanes rendered OFF the audio thread. Each lane's Mrdr3Core — the same JS core,
 * the same source string the worklet runs — lives in a Web Worker and renders a little
 * ahead of the audio clock into a ring of shared memory. On the audio thread the lane is a
 * tiny processor that copies 128 frames out of its ring and does nothing else. So the
 * synthesis spreads across as many cores as there are workers, and the real-time thread
 * only pays for copying.
 *
 * ---- what the rest of the engine sees -------------------------------------------------
 *
 * Nothing new. A farm lane has a `node` (the ring reader, an AudioWorkletNode, connected
 * exactly as a worklet lane's node is) and a `port` (a MessagePort whose other end is in
 * the worker), and the controller talks to `lane.port` with the very messages it sends a
 * worklet — noteOn, noteOff, choke, panic, installPatch, installSyncTables, soloLayers,
 * report, stop. The worker answers `report` with the core's health plus the ring's.
 *
 * ---- the clock --------------------------------------------------------------------------
 *
 * Frames are the CONTEXT's frames, as everywhere else in MRDR-3. The ring is addressed by
 * absolute frame modulo its capacity. The reader publishes the frame it has consumed up to
 * (R); the worker renders until it is AHEAD frames past that (W), and never more than the
 * ring holds. A block the worker has not written yet is an UNDERRUN: the reader outputs
 * silence for it and counts it — a dropout is a dropout whether or not the audio thread had
 * time to spare, so this counter is the number Stage 4 is judged on.
 *
 * ---- what render-ahead costs -------------------------------------------------------------
 *
 * Notes come from the sequencer a quarter-second ahead, so they reach the worker before its
 * horizon and land on their frame. Anything posted for NOW — a held key, a panic, a pot
 * drag — lands up to AHEAD frames late, because those frames are already in the ring.
 * That is the price, and AHEAD is the knob (setMrdrFarmAhead).
 *
 * Needs cross-origin isolation (SharedArrayBuffer). Without it `canHostMrdr3Farm` is false
 * and the controller keeps the worklet path. Live contexts only: an offline render has no
 * wall clock for a worker to stay ahead of.
 */
import { MRDR3_DSP_SOURCE } from './dsp.js';
import { canHostMrdr3 } from './worklet.js';

export const MRDR3_RING_PROCESSOR = 'mrdr3-ring';

/** Frames per lane ring. A power of two, comfortably more than any horizon offered. */
const CAPACITY = 16384;

// The ring header: Int32 slots at the front of each lane's SharedArrayBuffer.
const H_WRITE = 0;     // frames rendered up to (exclusive)
const H_READ = 1;      // frames the reader has consumed up to (exclusive)
const H_UNDER = 2;     // blocks the reader found unwritten
const H_START = 3;     // the frame the lane began at — before it is silence, not an underrun
const H_AHEAD = 4;     // the horizon, frames
const H_WORST = 5;     // the smallest lead (W - R) the reader has seen, frames
const H_BEGUN = 6;     // 1 once the worker has taken the lane — before that, pre-roll
const H_FIRST_UNDER = 7;  // the frame of the first underrun, -1 for none
const H_LAST_UNDER = 8;   // the frame of the latest
const H_SLOW_US = 9;      // the slowest single block the worker rendered, µs
const H_SLOW_AT = 10;     // and the frame it was at
const H_GAP_US = 11;      // the longest the worker left this lane between fills, µs
const HEADER_INTS = 12;

let enabled = false;
// 4096 frames (93 ms at 44.1 kHz). It has to cover the audio callback, not just the
// quantum: a phone's context renders 2048 frames in one burst (latencyHint 0.05), so a
// 2048 horizon left the worker no margin at the start of a burst and Chromium measured
// underruns at it; at 4096 there were none over two full songs. The cost is that a note
// posted for NOW sounds up to this late.
let ahead = 4096;
let workerCount = 0;   // 0: choose from the hardware

/** Turn the farm on for lanes built from now on. Session only; never serialized. */
export function setMrdrFarm(on) { enabled = !!on; return enabled; }
export const mrdrFarmEnabled = () => enabled;

/** The render-ahead horizon in frames, for lanes built from now on. */
export function setMrdrFarmAhead(frames) {
  const n = Math.round(Number(frames));
  if (n >= 256 && n <= CAPACITY / 2) ahead = n;
  return ahead;
}
export const mrdrFarmAhead = () => ahead;

/** Pin the worker count (tests, A/Bs); 0 chooses from navigator.hardwareConcurrency. */
export function setMrdrFarmWorkers(n) { workerCount = Math.max(0, Math.round(Number(n) || 0)); return workerCount; }

const isOffline = (ctx) => typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;

/** Can this context's MRDR-3 lanes run on the farm? */
export const canHostMrdr3Farm = (ctx) => !!(ctx && !isOffline(ctx) && canHostMrdr3(ctx)
  && typeof SharedArrayBuffer === 'function' && typeof Worker === 'function'
  && globalThis.crossOriginIsolated);

/** The farm is used when it is turned on and the context can host it. */
export const useMrdr3Farm = (ctx) => enabled && canHostMrdr3Farm(ctx);

// ---- the reader, on the audio thread ----------------------------------------------------
const RING_SOURCE = `
class Mrdr3Ring extends AudioWorkletProcessor {
  constructor(options) {
    super();
    var o = options.processorOptions;
    this.h = new Int32Array(o.sab, 0, ${HEADER_INTS});
    this.L = new Float32Array(o.sab, ${HEADER_INTS * 4}, o.capacity);
    this.R = new Float32Array(o.sab, ${HEADER_INTS * 4} + o.capacity * 4, o.capacity);
    this.mask = o.capacity - 1;
    this.clock = new Int32Array(o.clock);
    this.done = false;
    this.port.onmessage = (e) => { if (e.data === 'stop') this.done = true; };
  }

  process(inputs, outputs) {
    if (this.done) return false;
    var out = outputs[0];
    var n = out[0].length;
    var h = this.h;
    var f = currentFrame;
    var w = Atomics.load(h, ${H_WRITE});
    var start = Atomics.load(h, ${H_START});
    if (f >= start && w >= f + n) {
      var i = f & this.mask;
      var L = this.L, R = this.R, oL = out[0], oR = out.length > 1 ? out[1] : null;
      if (i + n <= this.mask + 1) {
        oL.set(L.subarray(i, i + n));
        if (oR) oR.set(R.subarray(i, i + n));
      } else {
        for (var k = 0; k < n; k++) {
          var j = (i + k) & this.mask;
          oL[k] = L[j];
          if (oR) oR[k] = R[j];
        }
      }
      var lead = w - (f + n);
      if (lead < Atomics.load(h, ${H_WORST})) Atomics.store(h, ${H_WORST}, lead);
    } else if (f + n > start && Atomics.load(h, ${H_BEGUN})) {
      // Not written yet: silence, and counted. Before START, or before the worker has
      // picked the lane up at all, it is pre-roll — the lane is built on a lane's first
      // note, which the sequencer books a quarter-second ahead, so nothing is owed yet.
      Atomics.add(h, ${H_UNDER}, 1);
      Atomics.store(h, ${H_WORST}, -1);
      if (Atomics.load(h, ${H_FIRST_UNDER}) < 0) Atomics.store(h, ${H_FIRST_UNDER}, f);
      Atomics.store(h, ${H_LAST_UNDER}, f);
    }
    Atomics.store(h, ${H_READ}, f + n);
    // The context's clock, which is also what wakes the workers: every reader moves it
    // on and every worker sleeps on it, so any lane being played keeps the whole farm
    // awake — including a worker whose own lanes are not connected yet.
    Atomics.store(this.clock, 0, f + n);
    Atomics.notify(this.clock, 0);
    return true;
  }
}
registerProcessor(${JSON.stringify(MRDR3_RING_PROCESSOR)}, Mrdr3Ring);

// The farm's own clock: always pulled (through a silent gain), so the clock moves and the
// workers wake whether or not any lane is connected yet. Without it the FIRST lane's worker
// had nothing to follow until that lane's reader was pulled, and owed the whole gap at once.
class Mrdr3FarmClock extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.clock = new Int32Array(options.processorOptions.clock);
  }
  process() {
    Atomics.store(this.clock, 0, currentFrame + 128);
    Atomics.notify(this.clock, 0);
    return true;
  }
}
registerProcessor('mrdr3-farm-clock', Mrdr3FarmClock);
`;

// ---- the worker -------------------------------------------------------------------------
const WORKER_SOURCE = `${MRDR3_DSP_SOURCE}
var rate = 44100, tables = null, noise = null, stats = null, clock = null;
var lanes = [];

function FarmLane(msg) {
  this.id = msg.id;
  this.core = new Mrdr3Core({ rate: rate, maxGroups: msg.maxGroups, maxTones: msg.maxTones });
  // A shallow copy: installTables writes the lane's sync pyramids into the object it is
  // handed, and this worker's lanes share one table set.
  var t = {};
  for (var k in tables) t[k] = tables[k];
  t.syncs = {};
  this.core.installTables(t);
  if (noise) this.core.installNoise(noise);
  if (msg.syncs) this.core.installSyncTables(msg.syncs);
  if (msg.patch) this.core.installPatch(msg.patch);
  this.h = new Int32Array(msg.sab, 0, ${HEADER_INTS});
  this.capacity = msg.capacity;
  this.mask = msg.capacity - 1;
  this.L = new Float32Array(msg.sab, ${HEADER_INTS * 4}, msg.capacity);
  this.R = new Float32Array(msg.sab, ${HEADER_INTS * 4} + msg.capacity * 4, msg.capacity);
  this.block = [new Float32Array(128), new Float32Array(128)];
  this.faults = 0;
  this.done = false;
  var lane = this;
  this.port = msg.port;
  this.port.onmessage = function (e) { lane.onMessage(e.data); };
}

FarmLane.prototype.onMessage = function (m) {
  if (!m || typeof m !== 'object') return;
  var core = this.core;
  if (m.type === 'stop') { this.done = true; return; }
  if (m.type === 'report') {
    var hh = this.h;
    var r = core.health(Atomics.load(hh, ${H_WRITE}));
    r.faults = this.faults;
    r.farm = {
      underruns: Atomics.load(hh, ${H_UNDER}),
      lead: Atomics.load(hh, ${H_WRITE}) - Atomics.load(hh, ${H_READ}),
      worstLead: Atomics.load(hh, ${H_WORST}),
      ahead: Atomics.load(hh, ${H_AHEAD}),
    };
    this.port.postMessage(r);
    return;
  }
  if (m.type === 'installTables') { core.installTables(m.tables); return; }
  if (m.type === 'installSyncTables') { core.installSyncTables(m.syncs); return; }
  if (m.type === 'installNoise') { core.installNoise(m.noise); return; }
  if (m.type === 'installPatch') { core.installPatch(m.patch); return; }
  if (m.type === 'soloLayers') { core.setLayerSolo(m.layers, Atomics.load(this.h, ${H_WRITE})); return; }
  core.schedule(m);
};

/** Render until AHEAD frames past the reader, or the ring is full. Returns frames written. */
FarmLane.prototype.fill = function () {
  var h = this.h;
  // The lane's own reader, or the CONTEXT's clock if that is further on. A lane is built
  // on its first note and its reader is not pulled until it is connected, which can be
  // seconds later; following only its own reader, the worker would sit at the lane's
  // start and owe the whole gap the moment the reader woke — a burst of underruns on the
  // lane's first note. Following the clock, it is already there.
  var r = Atomics.load(h, ${H_READ});
  var c = Atomics.load(clock, 0);
  if (c > r) r = c;
  var w = Atomics.load(h, ${H_WRITE});
  // Fallen behind the reader (a stall longer than the horizon): what the reader has
  // already played as silence is gone, so start again from where it is now.
  if (w < r) w = r;
  var target = r + Atomics.load(h, ${H_AHEAD});
  var limit = r + this.capacity - 128;
  if (target > limit) target = limit;
  var wrote = 0;
  var bL = this.block[0], bR = this.block[1];
  // Diagnostics for an underrun: was the DSP slow, or was the worker not running?
  var now = performance.now();
  if (this.lastFill) {
    var gap = Math.round((now - this.lastFill) * 1000);
    if (gap > h[${H_GAP_US}]) h[${H_GAP_US}] = gap;
  }
  this.lastFill = now;
  while (w + 128 <= target) {
    var tb = performance.now();
    try {
      this.core.process(this.block, w, 128, 0);
    } catch (err) {
      this.faults++;
      if (this.faults === 1) {
        this.port.postMessage({ type: 'fault', frame: w, message: String((err && err.message) || err),
          stack: String((err && err.stack) || '') });
      }
      bL.fill(0); bR.fill(0);
    }
    var us = Math.round((performance.now() - tb) * 1000);
    if (us > h[${H_SLOW_US}]) { h[${H_SLOW_US}] = us; h[${H_SLOW_AT}] = w; }
    var i = w & this.mask;
    this.L.set(bL, i);
    this.R.set(bR, i);
    w += 128;
    // Published per block, so the reader can use a block the moment it exists.
    Atomics.store(h, ${H_WRITE}, w);
    wrote += 128;
  }
  return wrote;
};

// What this worker costs, measured by itself: [0] ms spent rendering, [1] frames rendered.
// Plain stores into shared memory — a stat, read now and then, not a handshake.
// A cold core runs interpreted, many times slower than it will once the JIT has seen it, and
// the first notes of a lane are exactly when that would land — underruns on a lane's first
// note. So each lane's patch plays a short throwaway chord on a throwaway core first, off
// the clock, before the lane is handed its ring.
function warm(m) {
  if (!m.patch) return;
  var core = new Mrdr3Core({ rate: rate, maxGroups: m.maxGroups, maxTones: m.maxTones });
  var t = {};
  for (var k in tables) t[k] = tables[k];
  t.syncs = {};
  core.installTables(t);
  if (noise) core.installNoise(noise);
  if (m.syncs) core.installSyncTables(m.syncs);
  core.installPatch(m.patch);
  core.schedule({ type: 'noteOn', frame: 0, eventId: 1, hz: [220, 277.18, 329.63], durFrames: Math.round(rate * 0.3), velocity: 1 });
  var out = [new Float32Array(128), new Float32Array(128)];
  try {
    for (var f = 0; f < rate * 0.5; f += 128) core.process(out, f, 128, 0);
  } catch (e) { /* the real lane will report it */ }
}

function pump() {
  var t0 = performance.now();
  var frames = 0;
  for (var i = lanes.length - 1; i >= 0; i--) {
    if (lanes[i].done) { lanes.splice(i, 1); continue; }
    frames += lanes[i].fill();
  }
  if (frames) { stats[0] += performance.now() - t0; stats[1] += frames; }
}

// Sleep until the clock moves, then fill again. waitAsync keeps this worker's event loop
// free for the lanes' messages; without it, a short blocking wait and a yield do the same
// job a little less efficiently. The timeout is a backstop well inside any horizon, for a
// clock nobody is moving — never the thing that wakes a playing lane.
var seen = 0;
function loop() {
  pump();
  seen = Atomics.load(clock, 0);
  if (typeof Atomics.waitAsync === 'function') {
    var r = Atomics.waitAsync(clock, 0, seen, 10);
    if (r.async) r.value.then(loop); else setTimeout(loop, 0);
  } else {
    Atomics.wait(clock, 0, seen, 3);
    setTimeout(loop, 0);
  }
}

onmessage = function (e) {
  var m = e.data;
  if (m.type === 'init') {
    rate = m.rate; tables = m.tables; noise = m.noise;
    stats = new Float64Array(m.stats);
    clock = new Int32Array(m.clock);
    loop();
    return;
  }
  if (m.type === 'addLane') {
    warm(m);
    var lane = new FarmLane(m);
    lanes.push(lane);
    lane.fill();
    // Begun only once there is something to read: a reader that gets to the lane before
    // its first fill is still in pre-roll, not behind.
    Atomics.store(lane.h, ${H_BEGUN}, 1);
  }
};
`;

// ---- the main-thread side ----------------------------------------------------------------
const farms = new WeakMap();
let laneIds = 0;

function workersFor() {
  if (workerCount > 0) return workerCount;
  const cores = Number(globalThis.navigator?.hardwareConcurrency) || 4;
  // Leave the main thread and the audio thread their cores.
  return Math.max(1, Math.min(4, cores - 2));
}

/**
 * The context's farm, built once: the workers, each holding the shared tables and noise,
 * and the reader processor registered. Resolves when lanes can be made.
 */
export function ensureMrdr3Farm(ctx, { tables, noise }) {
  let farm = farms.get(ctx);
  if (farm) return farm.ready;
  const workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'application/javascript' }));
  const workers = [];
  // The context's clock as the readers last saw it — shared by every worker and reader.
  const clock = new SharedArrayBuffer(4);
  new Int32Array(clock)[0] = Math.floor(ctx.currentTime * ctx.sampleRate / 128) * 128;
  for (let i = 0; i < workersFor(); i++) {
    const worker = new Worker(workerUrl);
    const stats = new SharedArrayBuffer(16);
    worker.onerror = (e) => console.error(`MRDR-3 farm: worker ${i} failed — ${e.message}`);
    worker.postMessage({ type: 'init', rate: ctx.sampleRate, tables, noise, stats, clock });
    workers.push({ worker, stats: new Float64Array(stats), lanes: 0 });
  }
  URL.revokeObjectURL(workerUrl);
  const ringUrl = URL.createObjectURL(new Blob([RING_SOURCE], { type: 'application/javascript' }));
  farm = {
    workers, clock,
    ready: ctx.audioWorklet.addModule(ringUrl).finally(() => URL.revokeObjectURL(ringUrl))
      .then(() => {
        const node = new AudioWorkletNode(ctx, 'mrdr3-farm-clock', {
          numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1],
          processorOptions: { clock },
        });
        const mute = ctx.createGain();
        mute.gain.value = 0;
        node.connect(mute).connect(ctx.destination);
        farm.clockNode = node;
      }),
  };
  farms.set(ctx, farm);
  return farm.ready;
}

/**
 * A lane on the farm: `{ node, port, farm: { sab, header, worker } }`. The caller has
 * awaited ensureMrdr3Farm. `syncs` are the patch's hard-sync pyramids, sent with it.
 */
export function createMrdr3FarmLane(ctx, { patch, syncs = null, maxGroups = 12, maxTones = 4 }) {
  const farm = farms.get(ctx);
  const slot = farm.workers.reduce((a, b) => (b.lanes < a.lanes ? b : a));
  slot.lanes++;
  const sab = new SharedArrayBuffer(HEADER_INTS * 4 + CAPACITY * 2 * 4);
  const header = new Int32Array(sab, 0, HEADER_INTS);
  // Begin at the frame the context is on now: the reader's first block is at or after it.
  // On a render-quantum boundary, as the reader's frames always are, so a 128-frame block
  // never straddles the end of the ring.
  const start = Math.max(0, Math.floor(ctx.currentTime * ctx.sampleRate / 128) * 128);
  header[H_WRITE] = start;
  header[H_READ] = start;
  header[H_START] = start;
  header[H_AHEAD] = ahead;
  header[H_WORST] = 0x7fffffff;
  header[H_FIRST_UNDER] = -1;
  header[H_LAST_UNDER] = -1;
  const channel = new MessageChannel();
  const id = ++laneIds;
  slot.worker.postMessage({
    type: 'addLane', id, sab, capacity: CAPACITY, patch, syncs, maxGroups, maxTones,
    port: channel.port1,
  }, [channel.port1]);
  const node = new AudioWorkletNode(ctx, MRDR3_RING_PROCESSOR, {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: { sab, capacity: CAPACITY, clock: farm.clock },
  });
  const port = channel.port2;
  port.addEventListener('message', (event) => {
    if (event.data?.type !== 'fault') return;
    console.error(`MRDR-3 farm: the DSP threw at frame ${event.data.frame} — ${event.data.message}.`,
      event.data.stack);
  });
  port.start();
  return {
    node, port,
    farm: {
      sab, header, slot,
      release() {
        try { port.postMessage({ type: 'stop' }); } catch { /* gone */ }
        try { node.port.postMessage('stop'); } catch { /* gone */ }
        slot.lanes = Math.max(0, slot.lanes - 1);
      },
    },
  };
}

/** Every farm lane's ring on a context, summed — for a stats readout or a bench. */
export function mrdr3FarmStats(lanes) {
  let underruns = 0;
  let worstLead = Infinity;
  let n = 0;
  const perLane = [];
  for (const lane of lanes) {
    const h = lane.farm?.header;
    if (!h) continue;
    n++;
    const u = Atomics.load(h, H_UNDER);
    underruns += u;
    if (u) {
      perLane.push({ key: lane.key, underruns: u, first: Atomics.load(h, H_FIRST_UNDER),
        last: Atomics.load(h, H_LAST_UNDER), start: Atomics.load(h, H_START),
        slowestBlockMs: h[H_SLOW_US] / 1000, slowestAt: h[H_SLOW_AT], longestGapMs: h[H_GAP_US] / 1000 });
    }
    const wl = Atomics.load(h, H_WORST);
    if (wl !== 0x7fffffff) worstLead = Math.min(worstLead, wl);
  }
  return { lanes: n, underruns, worstLead: Number.isFinite(worstLead) ? worstLead : null, perLane };
}

/**
 * What the farm's workers have cost on this context so far: ms of rendering per worker, and
 * the lanes each holds. Diff two readings over a stretch of audio for ms per audio second.
 */
export function mrdr3FarmCpu(ctx) {
  const farm = farms.get(ctx);
  if (!farm) return null;
  return farm.workers.map((w) => ({ busyMs: w.stats[0], frames: w.stats[1], lanes: w.lanes }));
}

/** Exported for tests. */
export const mrdr3FarmSources = () => ({ worker: WORKER_SOURCE, ring: RING_SOURCE });
