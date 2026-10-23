// THE AUDIO BENCH: is this device fast enough for the full mix of a heavy song? (Peter, 20 Oct
// 2026: "if a device can't handle it shouldn't we just force it to light for tracks that have
// a light version".)
//
// Asked once, at the first launch, and kept. A web page cannot tell which chip it is on, and
// the live audio thread cannot be asked — pushing it to its limit is exactly what latches an
// iPad (dist/audio-stress.html LATCH TEST, 20 Oct 2026). So the question goes to an
// OfflineAudioContext instead: 300 of the chains the stress page uses (a saw through two
// biquads), 2 s of audio at 48 kHz, rendered as fast as the device can, off the real-time
// path. Best of three after a warm-up; about a second on the slowest device.
//
// Calibrated on 20 Oct 2026 (work/local/audio-stress.txt):
//   Peter's iPhone                          326 ms   full Gravity, clean
//   M3 Pro, WebKit and Chromium             ~400 ms  never tips
//   Peter's iPhone in Low Power Mode        527 ms   full Gravity, clean
//   Peter's iPad Pro (A12Z)                 ~720 ms  (estimated from its 1.8x live gap) tips
// LIGHT_BENCH_MS sits between, and is Peter's call: "assume 600 for now to be safe" — raised to
// 700 on 24 Oct 2026, after the audit's fixes (Peter). The trail since: the iPhone reads 609 ms
// (full mixes from now), the iPad 1298 ms (light).

const KEY = 'mash_audio_bench';
// Bumped when the bench itself changes, so a stored score from another bench is not trusted.
const VERSION = 1;
export const LIGHT_BENCH_MS = 700;

/** The stored score, or null before the first bench has finished. */
export function readAudioBench() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || 'null');
    return r && r.v === VERSION && Number.isFinite(r.ms) ? r : null;
  } catch {
    return null;
  }
}

/** Whether this device's score says the heavy songs should play their light versions. */
export const benchSaysLight = () => (readAudioBench()?.ms ?? 0) > LIGHT_BENCH_MS;

async function renderOnce(OAC, chains, seconds) {
  const sr = 48000;
  const oc = new OAC(2, sr * seconds, sr);
  const sink = oc.createGain();
  sink.gain.value = 0.001;
  sink.connect(oc.destination);
  for (let i = 0; i < chains; i++) {
    const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 110 + (i % 40) * 7;
    const a = oc.createBiquadFilter(); a.frequency.value = 900;
    const b = oc.createBiquadFilter(); b.frequency.value = 1400;
    o.connect(a); a.connect(b); b.connect(sink); o.start();
  }
  const t0 = performance.now();
  await oc.startRendering();
  return performance.now() - t0;
}

/**
 * Bench this device once and keep the score; a stored score is returned as it is. Resolves
 * null where there is nothing to bench with — and then nothing is decided by it.
 */
export async function runAudioBench({ force = false } = {}) {
  if (!force) { const kept = readAudioBench(); if (kept) return kept; }
  const OAC = typeof window !== 'undefined' ? (window.OfflineAudioContext || window.webkitOfflineAudioContext) : null;
  if (!OAC) return null;
  try {
    await renderOnce(OAC, 60, 0.5);   // warm-up: the JIT, the node code paths, the allocator
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await renderOnce(OAC, 300, 2));
    const result = { v: VERSION, ms: Math.round(Math.min(...runs)), runs: runs.map(Math.round), at: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(result)); } catch { /* used for this session only */ }
    return result;
  } catch {
    return null;
  }
}
