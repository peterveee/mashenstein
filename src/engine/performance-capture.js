// Opt-in, bounded in-memory timing. No timers, storage, logging or networking.
const KEYS = ['update', 'bot', 'audio', 'draw', 'blit', 'dev', 'diagnostics'];
const CAP = 12000;
let capture = null;
export const performanceCaptureActive = () => !!capture;
export const performanceMark = () => capture ? performance.now() : 0;
export function performanceAdd(key, start) {
  if (capture && start) capture.pending[key] += performance.now() - start;
}
export function beginPerformanceCapture() {
  capture = { n: 0, last: null, pending: Object.fromEntries(KEYS.map(k => [k, 0])),
    samples: Object.fromEntries(['gap', ...KEYS].map(k => [k, new Float32Array(CAP)])),
    elapsed: 0, location: {}, over25: 0, over50: 0, worst: [], truncated: false };
}
export function performanceLocation(tRun, distance, heroAnimation) {
  if (!capture) return;
  capture.location.tRun=tRun;capture.location.distance=distance;capture.location.heroAnimation=heroAnimation;
}
export function performanceFrame(now) {
  if (!capture) return;
  const c = capture, gap = c.last == null ? 0 : now - c.last;
  c.last = now;
  if (gap > 0 && c.n < CAP) {
    c.elapsed += gap;
    c.samples.gap[c.n] = gap;
    for (const k of KEYS) c.samples[k][c.n] = c.pending[k];
    if (gap > 25) c.over25++;
    if (gap > 50) c.over50++;
    if (gap > 25 || Math.max(...Object.values(c.pending)) > 16.67) {
      c.worst.push({ frame: c.n, elapsedMs:c.elapsed, ...c.location, gap, ...c.pending });
      c.worst.sort((a,b) => b.gap - a.gap);
      if (c.worst.length > 30) c.worst.length = 30;
    }
    c.n++;
  } else if(c.n >= CAP) c.truncated = true;
  for (const k of KEYS) c.pending[k] = 0;
}
export function endPerformanceCapture() {
  if (!capture) return null;
  const c = capture; capture = null;
  const timings = {};
  for (const k of ['gap', ...KEYS]) {
    const s = c.samples[k].slice(0, c.n).sort();
    const sum = s.reduce((a,b)=>a+b,0);
    timings[k] = { mean: c.n ? sum/c.n : 0, p95: s[Math.max(0,Math.ceil(c.n*.95)-1)] || 0,
      p99: s[Math.max(0,Math.ceil(c.n*.99)-1)] || 0, max: s[c.n-1] || 0, total: sum };
  }
  return { frames:c.n, fps:timings.gap.total ? c.n*1000/timings.gap.total : 0,
    over25:c.over25, over50:c.over50, timings, worst:c.worst, truncated:c.truncated };
}
