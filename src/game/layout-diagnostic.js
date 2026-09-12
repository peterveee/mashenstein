import { W, H, presentationFrame, screen } from '../engine/renderer.js';
import { portraitHudLayout } from './portrait-layout.js';
import { portraitTouchLayout } from '../engine/portrait-input.js';
import { PORTRAIT_GROUND_ANCHOR_RATIO } from '../engine/portrait-geometry.js';
import { resolveSceneryLayout } from '../engine/scenery-layout.js';
import { screenYFor } from '../engine/camera.js';

const COLORS = Object.freeze({
  world: '#ff8376',
  scenery: '#d4a1ff',
  sky: '#72d7ff',
  screen: '#75f2b1',
  hud: '#ffe28a',
  warning: '#ff4f68',
});

let enabled = false;

export function layoutDiagnosticEnabled() { return enabled; }
export function toggleLayoutDiagnostic() {
  enabled = !enabled;
  return enabled;
}

function number(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function portraitControls(frame) {
  if (frame?.mode !== 'phone-portrait') return [];
  const scale = number(frame.scale, 1) || 1;
  const touch = portraitTouchLayout({
    viewportWidth: number(frame.width, W) * scale,
    viewportHeight: number(frame.height, H) * scale,
    safe: frame.safeRect || {},
  });
  return Object.values(touch.controls || {}).map((control) => ({
    name: `${control.id} top`,
    y: control.cy / scale - control.r / scale,
    space: 'screen',
  }));
}

function unionGapPercent(rect, intervals) {
  const top = number(rect?.top);
  const bottom = number(rect?.bottom, top);
  const height = Math.max(1e-9, bottom - top);
  const sorted = intervals
    .map(([a, b]) => [Math.max(top, number(a)), Math.min(bottom, number(b))])
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let cursor = top;
  let largest = 0;
  for (const [a, b] of sorted) {
    largest = Math.max(largest, a - cursor);
    cursor = Math.max(cursor, b);
  }
  largest = Math.max(largest, bottom - cursor);
  return Math.max(0, Math.min(100, largest / height * 100));
}

/**
 * Resolver-backed values for tests and the on-device overlay. Everything is
 * logical until drawLayoutDiagnostic converts it to CSS pixels, which keeps
 * the capture readout exact at every device scale.
 */
export function layoutDiagnosticSnapshot(run, frame = presentationFrame(), options = {}) {
  const f = frame || {};
  const scale = number(f.scale, 1) || 1;
  const safe = f.safeRect || { left: 0, top: 0, right: W, bottom: H };
  const safeHeight = Math.max(1, number(safe.bottom) - number(safe.top));
  const portrait = f.mode === 'phone-portrait';
  const hud = portrait ? portraitHudLayout(f) : null;
  // The bands the run is actually painting with, so the overlay and the art
  // can never disagree: an authored or tuner-dragged profile moves both.
  const bands = options.bands || run?.compositionProfile?.().bands || undefined;
  const scenery = portrait ? resolveSceneryLayout({
    frame: f, hud, groundY: 232, bands,
  }) : null;
  const sceneryRect = scenery?.screenRect || { top: 0, bottom: H, height: H };
  const screenRect = { top: number(safe.top), bottom: number(safe.bottom), height: safeHeight };
  const lines = [];
  const ranges = [];
  const basisFor = (space, rect) => rect || (space === 'scenery' || space === 'sky'
    ? sceneryRect : screenRect);
  const addLine = (name, y, space = 'screen', rect = null) => {
    if (!Number.isFinite(Number(y))) return;
    const basis = basisFor(space, rect);
    const base = number(basis.top, number(safe.top));
    const span = Math.max(1e-9, number(basis.height, number(basis.bottom) - base));
    lines.push({ name, y: Number(y), space, fromSafeTopCss: (Number(y) - number(safe.top)) * scale,
      percent: (Number(y) - base) / span * 100 });
  };
  const addRange = (name, top, bottom, space = 'scenery', rect = null) => {
    if (!Number.isFinite(Number(top)) || !Number.isFinite(Number(bottom))) return;
    const basis = basisFor(space, rect);
    const base = number(basis.top, number(safe.top));
    const span = Math.max(1e-9, number(basis.height, number(basis.bottom) - base));
    ranges.push({ name, top: Number(top), bottom: Number(bottom), space,
      fromSafeTopCss: [(Number(top) - number(safe.top)) * scale, (Number(bottom) - number(safe.top)) * scale],
      percent: [(Number(top) - base) / span * 100, (Number(bottom) - base) / span * 100], });
  };

  addRange('safe rectangle', safe.top, safe.bottom, 'screen', { top: safe.top, bottom: safe.bottom, height: safeHeight });
  if (portrait) {
    addLine('top clearance', safe.top + 28 / scale, 'screen', { top: safe.top, height: safeHeight });
    // The rail is on the GLASS, below the safe rectangle, so it is measured
    // against the whole frame — a percentage of the safe rect would read past
    // 100 and say nothing useful about a bar that ends where the screen does.
    addRange('progress rail', hud.railY, hud.railY + hud.railH, 'screen',
      { top: 0, height: number(frame.height, H) });
    addRange('status row', hud.statusY, hud.statusY + hud.statusH, 'screen');
    addRange('goal row', hud.goalY, hud.goalY + hud.goalH, 'screen');
    addRange('bonus row', hud.bonusRenderY, hud.bonusRenderY + hud.bonusH, 'screen');
    addRange('rhythm row', hud.rhythmY, hud.rhythmY + hud.rhythmH, 'screen');
    addLine('HUD group bottom', hud.hudGroupBottom, 'screen');
    addLine('scenery top', hud.sceneryTop, 'scenery');
    for (const name of Object.keys(scenery.profileBands)) {
      const band = scenery.screenBands[name];
      addRange(name, band.top, band.bottom, name === 'celestial' || name.includes('Cloud') || name === 'birds' ? 'sky' : 'scenery');
    }
    addLine('resting ground', f.groundScreenY, 'world');
    addLine('chat-clearing floor', hud.groundFloorScreenY, 'screen');
    addLine('largest chat top', hud.largestChatTop, 'screen');
    const groundRatio = Number.isFinite(Number(run?.portraitGroundAnchorRatio?.()))
      ? Number(run.portraitGroundAnchorRatio()) : PORTRAIT_GROUND_ANCHOR_RATIO;
    const groundAnchorPercent = Math.round(groundRatio * 100);
    addLine(`${groundAnchorPercent}% line`,
      safe.top + safeHeight * groundRatio,
      'screen', { top: safe.top, height: safeHeight });
    addLine('gameplay top', hud.gameplayTop, 'screen');
    addLine('gameplay bottom', hud.gameplayBottom, 'screen');
    addRange('message shelf', hud.messageShelfTop, hud.messageShelfBottom, 'screen');
    for (const control of portraitControls(f)) addLine(control.name, control.y, control.space);
  } else {
    addLine('progress rail', 0, 'screen', { top: 0, height: H });
    addRange('status/goal/bonus group', 6, 58, 'screen', { top: 0, height: H });
    addLine('resting ground', 232, 'world', { top: 0, height: H });
    addLine('68% line', H * 0.68, 'screen', { top: 0, height: H });
    addLine('gameplay top', 0, 'screen', { top: 0, height: H });
    addLine('gameplay bottom', H, 'screen', { top: 0, height: H });
    addLine('control tops', H - 64, 'screen', { top: 0, height: H });
  }

  const state = run?.portraitFrameFitState || {};
  if (portrait && run) {
    const highFloor = run.portraitHighPathFloor?.();
    if (highFloor != null) {
      const highPan = run.portraitHighPathPan?.(highFloor, {
        top: hud.gameplayTop, bottom: hud.gameplayBottom,
      });
      addLine('high-path target feet', hud.gameplayTop
        + (hud.gameplayBottom - hud.gameplayTop) * 0.56, 'world');
      const base = number(run.groundYAt?.(run.playerWorldX?.()), 232);
      addLine('48px rise threshold', screenYFor(base - 48, run.camZoom, run.camPan, run.camFloorY), 'world');
      if (Number.isFinite(Number(highPan))) addLine('high-path current feet',
        screenYFor(highFloor, run.camZoom, run.camPan, run.camFloorY), 'world');
    }
    addLine('edge-pan top', state.playableTop, 'screen');
    addLine('edge-pan bottom', state.playableBottom, 'screen');
    const hero = run.heroScreenRect?.(run.camZoom, run.camPan, run.camFloorY);
    if (hero) {
      addRange('hero visible body', hero.y0, hero.y1, 'world', { top: safe.top, height: safeHeight });
      addRange('hero +8px clearance', hero.y0 - 8 / scale, hero.y1 + 8 / scale, 'world', { top: safe.top, height: safeHeight });
    }
  }
  const intervals = ranges
    .filter((range) => range.space === 'sky' || range.space === 'scenery')
    .map((range) => [range.top, range.bottom]);
  // LCD's portrait extension is an authored skyline between the far landmark
  // and the normal 232px panel floor. Count that vocabulary in the diagnostic
  // so the city is judged as rendered, not as the old landscape-only bake.
  if (run?.style?.name === 'lcd' && scenery) {
    intervals.push([scenery.screenRect.top + scenery.screenRect.height * 0.09, scenery.screenRect.bottom]);
  }
  const largestSkyGapPercent = unionGapPercent(sceneryRect, intervals);
  return Object.freeze({ frame: f, hud, scenery, lines, ranges, largestSkyGapPercent,
    highPath: state.highPath === true, pan: number(run?.camPan), zoom: number(run?.camZoom),
    cameraFloor: number(run?.camFloorY), scale });
}

export function drawLayoutDiagnostic(ctx, run, frame = presentationFrame(), options = {}) {
  const snapshot = layoutDiagnosticSnapshot(run, frame, { bands: options.bands });
  const s = snapshot.scale || 1;
  const outputScale = number(options.outputScale, 1) || 1;
  const logicalScale = number(options.logicalScale, screen.scale) || screen.scale;
  const originX = number(options.originX, screen.ox);
  const originY = number(options.originY, screen.oy);
  const cssWidth = number(options.cssWidth, screen.cssW);
  const lineHeight = 12;
  ctx.save();
  // The production chrome canvas and the preview controls canvas may both be
  // device-pixel backed. Coordinates remain CSS pixels; only the output
  // transform changes, so the same resolver values can be painted in either
  // surface without changing the readout.
  ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 1;
  const logicalX = (x) => originX + x * logicalScale;
  const logicalY = (y) => originY + y * logicalScale;
  const x0 = logicalX(0);
  const x1 = logicalX(number(frame.width, W));
  const labels = [];
  const drawLine = (entry, color) => {
    const y = logicalY(entry.y);
    ctx.strokeStyle = color;
    ctx.setLineDash(entry.name.includes('clearance') ? [3, 3] : []);
    ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke();
    labels.push({ text: `${entry.name} ${entry.fromSafeTopCss.toFixed(0)}px ${entry.percent.toFixed(0)}%`,
      y: y - 6, color });
  };
  for (const entry of snapshot.ranges) {
    const top = logicalY(entry.top), bottom = logicalY(entry.bottom);
    const color = COLORS[entry.space] || COLORS.screen;
    ctx.fillStyle = `${color}22`;
    ctx.fillRect(x0, top, x1 - x0, Math.max(1, bottom - top));
    ctx.strokeStyle = color;
    ctx.strokeRect(x0 + 0.5, top + 0.5, x1 - x0 - 1, Math.max(1, bottom - top - 1));
    labels.push({ text: `${entry.name} ${entry.fromSafeTopCss[0].toFixed(0)}-${entry.fromSafeTopCss[1].toFixed(0)}px ${entry.percent[0].toFixed(0)}-${entry.percent[1].toFixed(0)}%`,
      y: top - 6, color });
  }
  for (const entry of snapshot.lines) drawLine(entry, COLORS[entry.space] || COLORS.screen);
  // Put labels in the upper/right corner, sorted by their measured y. Each is
  // nudged only for legibility; the line itself remains at the resolver pixel.
  const labelX = Math.max(4, x1 - 220);
  let lastY = -Infinity;
  for (const label of labels.sort((a, b) => a.y - b.y)) {
    const y = Math.max(2, label.y < lastY + lineHeight ? lastY + lineHeight : label.y);
    lastY = y;
    const width = Math.min(214, ctx.measureText(label.text).width + 8);
    ctx.fillStyle = 'rgba(8,10,20,0.86)';
    ctx.fillRect(labelX, y, width, lineHeight);
    ctx.fillStyle = label.color;
    ctx.fillText(label.text, labelX + 4, y + 1);
  }
  const readout = [
    `LAYOUT ${Math.round(number(frame.width))}x${Math.round(number(frame.height))}`,
    `scale ${s.toFixed(3)} zoom ${snapshot.zoom.toFixed(2)} pan ${snapshot.pan.toFixed(1)}`,
    `floor ${snapshot.cameraFloor.toFixed(1)} high-path ${snapshot.highPath ? 'ON' : 'off'}`,
    `largest sky gap ${snapshot.largestSkyGapPercent.toFixed(1)}%`,
    // Every box the browser has an opinion about, in CSS px. When the art
    // stops short of the glass, THIS line says which box is short: the page's
    // own layout box (client), the window (inner), the visual viewport (vv) or
    // the display (screen). They agree everywhere except on the phone that
    // matters, which is why they are printed rather than assumed.
    ...(typeof window === 'undefined' ? [] : [
      `client ${window.document?.documentElement?.clientHeight ?? '?'}`
      + ` inner ${window.innerHeight ?? '?'}`
      + ` vv ${window.visualViewport ? Math.round(window.visualViewport.height) : '?'}`
      + ` screen ${window.screen?.height ?? '?'}`,
    ]),
  ];
  const rw = 224, rh = readout.length * 12 + 6;
  const rx = Math.max(4, cssWidth - rw - 6);
  const ry = 4;
  ctx.fillStyle = 'rgba(8,10,20,0.9)';
  ctx.fillRect(rx, ry, rw, rh);
  ctx.strokeStyle = snapshot.largestSkyGapPercent > 20 ? COLORS.warning : COLORS.screen;
  ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
  ctx.fillStyle = '#fff';
  readout.forEach((line, i) => ctx.fillText(line, rx + 5, ry + 4 + i * 12));
  ctx.restore();
}
