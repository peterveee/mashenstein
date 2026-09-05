import { setEfficiencyProfile, efficiencyProfileStats } from './render-efficiency.js';
import { Audio } from './audio.js';
// Backend-neutral gameplay profiler. It waits at the title until a playable
// state begins, then records three consecutive windows without changing the
// scene. This catches the characteristic "starts at 60, drops as actors enter"
// pattern while reporting the same Canvas2D and WebGL timing columns.
import {
  W, H,
  setDensityPin, rendererDiagnostics, rendererBackend,
  resetRenderProfileStats, renderProfileStats, setRenderProfile,
} from './renderer.js';
import {
  resetUpdateProfileStats, updateProfileStats, setUpdateProfile,
} from './update-profile.js';
import { setPropCacheProfile, propCacheStats } from '../sprites/props.js';
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
const drawTimes = [];

function resetWindow(now) {
  phaseStartedAt = now;
  frames = 0;
  drawTimes.length = 0;
  sumDrawMs = 0;
  sumBlitMs = 0;
  resetRenderProfileStats();
  resetUpdateProfileStats();
  setPropCacheProfile(true);
  setEfficiencyProfile(true);
}

function finish() {
  active = false;
  done = true;
  phase = 'done';
  setDensityPin(savedPin);
  setRenderProfile(false);
  setUpdateProfile(false);
  setPropCacheProfile(false);
  setEfficiencyProfile(false);
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
  setUpdateProfile(true);
  phase = 'settle';
  resetWindow(now);
}

function completeWindow(now) {
  const elapsed = Math.max(1, now - phaseStartedAt);
  const stats = renderProfileStats();
  // The update half counts its OWN frames: on a fast panel the loop skips
  // presentation on callbacks that ran no simulation step, so dividing update
  // time by the presented-frame count would report a per-frame cost for frames
  // that never did the work.
  const upd = updateProfileStats();
  const art = propCacheStats();
  drawTimes.sort((a, b) => a - b);
  results.push({
    ...efficiencyProfileStats(),
    mixerMetering: Audio.mixer?.metered ?? null,
    artCreated: art.windowCreations,
    artVisibleMisses: art.visibleMisses,
    artResidentMB: art.residentBytes / 1048576,
    artEntries: art.entries,
    label: `WINDOW ${windowIndex + 1}`,
    fps: Math.round(frames * 1000 / elapsed),
    drawMedian: drawTimes[Math.floor(drawTimes.length / 2)] || 0,
    drawP95: drawTimes[Math.floor(drawTimes.length * 0.95)] || 0,
    drawWorst: drawTimes[drawTimes.length - 1] || 0,
    draw: frames ? sumDrawMs / frames : 0,
    blit: frames ? sumBlitMs / frames : 0,
    paint: frames ? stats.paintMs / frames : 0,
    submit: frames ? stats.submitMs / frames : 0,
    display: frames ? stats.displayMs / frames : 0,
    uploads: stats.uploads || 0,
    uploadMpx: (stats.uploadPixels || 0) / 1000000,
    update: upd.frames ? upd.updateMs / upd.frames : 0,
    updateP95: upd.p95Ms,
    updateWorst: upd.worstMs,
    rewind: upd.frames ? upd.rewindMs / upd.frames : 0,
    spawn: upd.frames ? upd.spawnMs / upd.frames : 0,
  });
  console.info('[gameplay-profile]', results[results.length - 1]);
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
  drawTimes.push(drawMs);
  sumBlitMs += blitMs;
  if (now - phaseStartedAt >= WINDOW_MS) completeWindow(now);
}

// Column x offsets shared by the header and the values, so the two cannot drift
// apart the way a hand-spaced header string does every time a column is added.
const COLS = {
  fps: 96, update: 128, updateP95: 168,
  draw: 208, blit: 246, paint: 284, submit: 326, upload: 370,
};

function drawBox(ctx, title, rows, note) {
  const boxW = 470;
  const rowH = 22;
  // Two note lines: the upload column needs a legend, and the update split
  // needs somewhere to live that does not cost the table another column.
  const boxH = 84 + rows.length * rowH;
  const x = (W - boxW) / 2;
  const y = Math.max(4, (H - boxH) / 2);
  ctx.fillStyle = 'rgba(5,6,14,0.97)';
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, boxW, boxH);
  drawText(ctx, title, x + 10, y + 8, '#8ef0c0', 0.75, 'bold');
  const head = (label, key) => drawText(ctx, label, x + COLS[key], y + 24, '#9aa0b4', 0.55, 'ui');
  head('FPS', 'fps');
  head('UPD', 'update');
  head('U95', 'updateP95');
  head('DRAW', 'draw');
  head('BLIT', 'blit');
  head('PAINT', 'paint');
  head('SUBM', 'submit');
  head('UPLOAD', 'upload');
  rows.forEach((r, i) => {
    const rowY = y + 37 + i * rowH;
    const ink = r.fps >= 58 ? '#8ef0c0' : r.fps >= 45 ? '#f0d88e' : '#f08e9e';
    const upload = rendererBackend() === 'webgl'
      ? `${r.uploads}/${r.uploadMpx.toFixed(1)}M`
      : `${r.display.toFixed(1)}ms`;
    const cell = (text, key, colour = '#d8dce6') =>
      drawText(ctx, text, x + COLS[key], rowY, colour, 0.58, 'ui');
    drawText(ctx, r.label, x + 10, rowY, ink, 0.62, 'bold');
    drawText(ctx, `${r.fps}`, x + COLS.fps, rowY, ink, 0.62, 'bold');
    // The update columns are tinted apart from the render ones: the single
    // question this report exists to answer is which half of the frame the time
    // went to, and that reads faster as two colours than as eight numbers.
    cell(r.update.toFixed(1), 'update', '#e8c9f0');
    cell(r.updateP95.toFixed(1), 'updateP95', '#e8c9f0');
    cell(r.draw.toFixed(1), 'draw');
    cell(r.blit.toFixed(1), 'blit');
    cell(r.paint.toFixed(1), 'paint');
    cell(r.submit.toFixed(1), 'submit');
    cell(upload, 'upload', '#b9c9e3');
  });
  drawText(ctx, note, x + 10, y + boxH - 43, '#7e879d', 0.5, 'ui');
  const last = rows[rows.length - 1];
  const split = last
    ? `UPD = simulation half, avg/95th. WORST ${last.updateWorst.toFixed(1)}ms`
      + `  REWIND ${last.rewind.toFixed(2)}ms  SPAWN ${last.spawn.toFixed(2)}ms`
    : 'UPD = simulation half of the frame, average and 95th percentile';
  drawText(ctx, split, x + 10, y + boxH - 32, '#7e879d', 0.5, 'ui');
  // Art built DURING a visible frame is the hitch this phase exists to remove,
  // so it gets its own colour: green once a stage can be played without
  // rasterizing anything, red for however many are left.
  if (last) {
    const miss = last.artVisibleMisses;
    drawText(ctx, `ART built-in-frame ${miss}  (of ${last.artCreated} built)`,
      x + 10, y + boxH - 21, miss ? '#f08e9e' : '#8ef0c0', 0.5, 'ui');
    drawText(ctx, `CACHE ${last.artEntries} canvases, ${last.artResidentMB.toFixed(0)}MB resident`,
      x + 250, y + boxH - 21, last.artResidentMB > 250 ? '#f08e9e' : '#b9c9e3', 0.5, 'ui');
    drawText(ctx, `CULL ${last.entitiesCulled}/${last.entitiesConsidered}  LCD ${last.lcdHits}H/${last.lcdMisses}M`
      + ` ${(last.lcdBytes / 1048576).toFixed(1)}MB  METERS ${last.mixerMetering ? 'ON' : 'OFF'}`,
      x + 10, y + boxH - 9, '#b9c9e3', 0.5, 'ui');
  }
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
