// Backend-neutral gameplay profiler. It waits at the title until a playable
// state begins, then records three consecutive windows without changing the
// scene. This catches the characteristic "starts at 60, drops as actors enter"
// pattern while reporting the same Canvas2D and WebGL timing columns.
import {
  W, H,
  setDensityPin, rendererDiagnostics, rendererBackend,
  resetRenderProfileStats, renderProfileStats, setRenderProfile,
} from './renderer.js';
import { drawText } from './sprites.js';

const SETTLE_MS = 800;
const WINDOW_MS = 3000;
const WINDOW_COUNT = 3;

let active = false;
let done = false;
let phase = 'idle';
let phaseStartedAt = 0;
let windowIndex = 0;
let frames = 0;
let sumDrawMs = 0;
let sumBlitMs = 0;
let savedPin = null;
let restorePinOverride;
let profileDensity = 0;
const results = [];

function resetWindow(now) {
  phaseStartedAt = now;
  frames = 0;
  sumDrawMs = 0;
  sumBlitMs = 0;
  resetRenderProfileStats();
}

function finish() {
  active = false;
  done = true;
  phase = 'done';
  setDensityPin(savedPin);
  setRenderProfile(false);
}

export function startGameplayProfile({ restorePin } = {}) {
  restorePinOverride = restorePin;
  results.length = 0;
  active = true;
  done = false;
  phase = 'waiting';
  phaseStartedAt = 0;
  windowIndex = 0;
}

export function gameplayProfileActive() {
  return active && (phase === 'settle' || phase === 'measure');
}

export function gameplayProfileWaiting() { return active && phase === 'waiting'; }
export function gameplayProfileReportVisible() { return done && results.length > 0; }

function begin(now) {
  const rd = rendererDiagnostics();
  savedPin = restorePinOverride === undefined ? rd.pinned : restorePinOverride;
  setDensityPin(rd.density);
  profileDensity = rendererDiagnostics().density;
  setRenderProfile(true);
  phase = 'settle';
  resetWindow(now);
}

function completeWindow(now) {
  const elapsed = Math.max(1, now - phaseStartedAt);
  const stats = renderProfileStats();
  results.push({
    label: `WINDOW ${windowIndex + 1}`,
    fps: Math.round(frames * 1000 / elapsed),
    draw: frames ? sumDrawMs / frames : 0,
    blit: frames ? sumBlitMs / frames : 0,
    paint: frames ? stats.paintMs / frames : 0,
    submit: frames ? stats.submitMs / frames : 0,
    display: frames ? stats.displayMs / frames : 0,
    uploads: stats.uploads || 0,
    uploadMpx: (stats.uploadPixels || 0) / 1000000,
  });
  windowIndex++;
  if (windowIndex >= WINDOW_COUNT) finish();
  else resetWindow(now);
}

// `inGameplay` comes from the state machine rather than a renderer heuristic:
// menus can be every bit as animated as play, but they are not the workload
// this report is intended to measure.
export function gameplayProfileFrame(now, { drawMs = 0, blitMs = 0 } = {}, inGameplay = false) {
  if (!active) return;
  if (phase === 'waiting') {
    if (inGameplay) begin(now);
    return;
  }
  if (!inGameplay) return;
  if (phase === 'settle') {
    if (now - phaseStartedAt < SETTLE_MS) return;
    phase = 'measure';
    resetWindow(now);
    return;
  }
  if (phase !== 'measure') return;
  frames++;
  sumDrawMs += drawMs;
  sumBlitMs += blitMs;
  if (now - phaseStartedAt >= WINDOW_MS) completeWindow(now);
}

function drawBox(ctx, title, rows, note) {
  const boxW = 420;
  const rowH = 22;
  const boxH = 50 + rows.length * rowH;
  const x = (W - boxW) / 2;
  const y = Math.max(4, (H - boxH) / 2);
  ctx.fillStyle = 'rgba(5,6,14,0.97)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, boxW, boxH);
  drawText(ctx, title, x + 10, y + 8, '#8ef0c0', 0.75, 'bold');
  drawText(ctx, 'FPS   DRAW  BLIT  PAINT  SUBMIT  UPLOAD', x + 10, y + 24, '#9aa0b4', 0.55, 'ui');
  rows.forEach((r, i) => {
    const rowY = y + 37 + i * rowH;
    const ink = r.fps >= 58 ? '#8ef0c0' : r.fps >= 45 ? '#f0d88e' : '#f08e9e';
    const upload = rendererBackend() === 'webgl'
      ? `${r.uploads}/${r.uploadMpx.toFixed(1)}M`
      : `${r.display.toFixed(1)}ms`;
    drawText(ctx, r.label, x + 10, rowY, ink, 0.62, 'bold');
    drawText(ctx, `${r.fps}`, x + 102, rowY, ink, 0.62, 'bold');
    drawText(ctx, r.draw.toFixed(1), x + 137, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, r.blit.toFixed(1), x + 178, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, r.paint.toFixed(1), x + 219, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, r.submit.toFixed(1), x + 263, rowY, '#d8dce6', 0.58, 'ui');
    drawText(ctx, upload, x + 315, rowY, '#b9c9e3', 0.58, 'ui');
  });
  drawText(ctx, note, x + 10, y + boxH - 9, '#7e879d', 0.5, 'ui');
}

export function drawGameplayProfile(ctx) {
  const note = rendererBackend() === 'webgl'
    ? 'UPLOAD = texture updates / megapixels per 3-second window'
    : 'UPLOAD = direct-display setup/composite time';
  drawBox(ctx,
    `GAME PROFILE  ${rendererBackend().toUpperCase()}  ${profileDensity}X`,
    results, note);
}

export function drawGameplayProfileWaiting(ctx) {
  drawBox(ctx,
    `GAME PROFILE  ${rendererBackend().toUpperCase()}`,
    [], 'ENTER A LEVEL - CAPTURE STARTS AUTOMATICALLY');
}
