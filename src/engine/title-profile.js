// Title-screen profiler. The normal FPS readout is intentionally short and
// mixes rendering with display cadence. This run holds one density, removes
// one title cost at a time, and reports several seconds of presented frames so
// a physical phone can tell us which subsystem actually bought the frames.
import {
  W, H,
  setDensityPin, suppressSkyFx, setSceneGlow, setOverlayMerge,
  rendererDiagnostics, rendererBackend,
  resetRenderProfileStats, renderProfileStats, setRenderProfile,
} from './renderer.js';
import { drawText } from './sprites.js';

const SETTLE_MS = 800;
const MEASURE_MS = 3000;

// Stages are deliberately cumulative contrasts. The last row is the cheapest
// possible title composition, which gives a useful ceiling for the world and
// the display path even when all of the decorative work is removed.
const STAGES = [
  { label: 'FULL', sky: true, glow: true, parade: true, ui: true, merge: true },
  { label: 'NO SKY', sky: false, glow: true, parade: true, ui: true, merge: true },
  { label: 'NO BLOOM', sky: true, glow: false, parade: true, ui: true, merge: true },
  { label: 'NO PARADE', sky: true, glow: true, parade: false, ui: true, merge: true },
  { label: 'WORLD ONLY', sky: false, glow: false, parade: false, ui: false, merge: true },
];

let active = false;
let done = false;
let stageIndex = 0;
let phase = 'idle';
let phaseEndsAt = 0;
let measureStartedAt = 0;
let frames = 0;
let sumDrawMs = 0;
let sumBlitMs = 0;
let savedPin = null;
let profileDensity = 0;
const results = [];

function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function applyStage() {
  const stage = STAGES[stageIndex];
  suppressSkyFx(!stage.sky);
  setSceneGlow(stage.glow);
  setOverlayMerge(stage.merge);
  phase = 'settle';
  phaseEndsAt = nowMs() + SETTLE_MS;
  measureStartedAt = 0;
  frames = 0;
  sumDrawMs = 0;
  sumBlitMs = 0;
  resetRenderProfileStats();
}

function finish() {
  active = false;
  done = true;
  phase = 'done';
  suppressSkyFx(false);
  setSceneGlow(true);
  setOverlayMerge(true);
  setDensityPin(savedPin);
  setRenderProfile(false);
}

export function startTitleProfile() {
  const rd = rendererDiagnostics();
  savedPin = rd.pinned;
  profileDensity = rd.density;
  // Keep every contrast at the same exact pixel count. Without this pin the
  // adaptive controller would interpret a deliberately cheap stage as a
  // recovery signal and change density halfway through the report.
  setDensityPin(profileDensity);
  results.length = 0;
  stageIndex = 0;
  active = true;
  done = false;
  setRenderProfile(true);
  applyStage();
}

export function titleProfileActive() { return active; }
export function titleProfileReportVisible() { return done && results.length > 0; }

// TitleState reads this on every draw. Keeping the hook here means the profiler
// can remove the procedural parade and UI without changing input or menu state.
export function titleProfileOptions() {
  if (!active) return { parade: true, ui: true };
  const stage = STAGES[stageIndex];
  return { parade: stage.parade, ui: stage.ui };
}

function completeStage(now) {
  const elapsed = Math.max(1, now - measureStartedAt);
  const stats = renderProfileStats();
  results.push({
    label: STAGES[stageIndex].label,
    density: profileDensity,
    fps: Math.round(frames * 1000 / elapsed),
    draw: frames ? sumDrawMs / frames : 0,
    blit: frames ? sumBlitMs / frames : 0,
    paint: frames ? stats.paintMs / frames : 0,
    submit: frames ? stats.submitMs / frames : 0,
    display: frames ? stats.displayMs / frames : 0,
    uploads: stats.uploads || 0,
    uploadMpx: (stats.uploadPixels || 0) / 1000000,
    skyPasses: stats.skyPasses || 0,
    bloomPasses: stats.bloomPasses || 0,
  });
  stageIndex++;
  if (stageIndex >= STAGES.length) finish();
  else applyStage();
}

// Called after a presented frame, with timings captured around drawState/blit
// by main.js. Skipped rAF callbacks never enter this function, so FPS here is
// exactly the cadence the player actually saw.
export function titleProfileFrame(now, { drawMs = 0, blitMs = 0 } = {}) {
  if (!active) return;
  if (phase === 'settle') {
    if (now < phaseEndsAt) return;
    phase = 'measure';
    measureStartedAt = now;
    frames = 0;
    sumDrawMs = 0;
    sumBlitMs = 0;
    resetRenderProfileStats();
  }
  if (phase !== 'measure') return;
  frames++;
  sumDrawMs += drawMs;
  sumBlitMs += blitMs;
  if (now - measureStartedAt >= MEASURE_MS) completeStage(now);
}

export function drawTitleProfile(ctx) {
  const boxW = 420;
  const rowH = 22;
  const boxH = 40 + results.length * rowH;
  const x = (W - boxW) / 2;
  const y = Math.max(4, (H - boxH) / 2);
  ctx.fillStyle = 'rgba(5,6,14,0.97)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, boxW, boxH);
  drawText(ctx, `TITLE PROFILE  ${rendererBackend().toUpperCase()}  ${profileDensity}X`, x + 10, y + 8, '#8ef0c0', 0.75, 'bold');
  drawText(ctx, 'FPS   DRAW  BLIT  PAINT  SUBMIT  UPLOAD', x + 10, y + 24, '#9aa0b4', 0.55, 'ui');
  results.forEach((r, i) => {
    const rowY = y + 35 + i * rowH;
    const ink = r.fps >= 58 ? '#8ef0c0' : r.fps >= 45 ? '#f0d88e' : '#f08e9e';
    const fixed = (v) => v.toFixed(1);
    const upload = rendererBackend() === 'webgl'
      ? `${r.uploads}/${r.uploadMpx.toFixed(1)}M`
      : `${r.display.toFixed(1)}ms`;
    drawText(ctx, r.label, x + 10, rowY, ink, 0.62, 'bold');
    drawText(ctx, `${r.fps}`, x + 102, rowY, ink, 0.62, 'bold');
    drawText(ctx, fixed(r.draw), x + 137, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, fixed(r.blit), x + 178, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, fixed(r.paint), x + 219, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, fixed(r.submit), x + 263, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, upload, x + 315, rowY, '#b9c9e3', 0.58, 'ui');
  });
  const note = rendererBackend() === 'webgl'
    ? 'UPLOAD = texture updates / megapixels per stage'
    : 'UPLOAD = display copy time (WebGL not active)';
  drawText(ctx, note, x + 10, y + boxH - 10, '#7e879d', 0.5, 'ui');
}
