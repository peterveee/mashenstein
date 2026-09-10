// Development-only portrait framing review page. The embedded view boots the
// actual renderer and RunState; the outer view only arranges independent
// engine canvases for the current, A and A*1.0625 choices.
import {
  beginRenderFrame, bctx, blit, presentCanvas, screen,
  setPresentationFrame,
} from '../src/engine/renderer.js';
import { frameForViewport, cameraForFrame } from '../src/engine/frame.js';
import { PortraitInputSurface, portraitTouchLayout } from '../src/engine/portrait-input.js';

const REFERENCE = typeof window !== 'undefined' ? window.__PORTRAIT_REFERENCE__ : '';
const FRAME_MODE = 'phone-portrait';
const CURRENT_ZOOM = 2;
const CALIBRATION_ZOOM = 2.2;
const TARGET_FACTOR = 1.0625;

const SCENES = {
  flat: {
    label: 'FLAT OBSTACLE', stage: 'plumber-1', startAt: 0.08, seed: 0x504f5254,
    note: 'Plumber Panic · seeded ordinary obstacle approach',
  },
  gap: {
    label: 'GAP / SLIDE', stage: 'plumber-2', startAt: 0.36, seed: 0x504f5255,
    note: 'Plumber Panic · four-step gear crossing',
  },
  underground: {
    label: 'PLUMBER 1 · THE WORKS', stage: 'plumber-1', startAt: 0.20, seed: 0x504f5258,
    note: 'Plumber Panic · underground works, upper lane and lower machinery',
  },
  raised: {
    label: 'RAISED ROAD', stage: 'speed-1', startAt: 0.55, seed: 0x504f5256,
    note: 'Speed Zone · spring fork and raised road',
  },
  rhythm: {
    label: 'LEVEL 3-1 · RHYTHM BANKRUPTCY', stage: 'rhythm-1', startAt: 0.08, seed: 0x504f5257,
    note: 'Rhythm Bankruptcy · beat lane, city backdrop and rhythm HUD',
  },
};

const CHOICES = {
  current: { label: 'CURRENT LANDSCAPE', short: 'CURRENT', mode: 'landscape', zoom: CURRENT_ZOOM },
  baseline: { label: 'A CALIBRATION', short: 'A', mode: FRAME_MODE, zoom: CALIBRATION_ZOOM },
  target: { label: 'A × 1.0625', short: 'A × 1.0625', mode: FRAME_MODE },
};

function params() {
  return new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
}

function numberParam(p, key, fallback) {
  const n = Number.parseFloat(p.get(key));
  return Number.isFinite(n) ? n : fallback;
}

function parseViewport(p) {
  const raw = p.get('viewport') || '390x844';
  const match = raw.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : { width: 390, height: 844 };
}

function parseSafe(p) {
  const raw = p.get('safe');
  if (!raw) return { top: 0, right: 0, bottom: 0, left: 0 };
  const [top, right, bottom, left] = raw.split(',').map((v) => Math.max(0, Number.parseFloat(v) || 0));
  return { top: top || 0, right: right || 0, bottom: bottom || 0, left: left || 0 };
}

function activeViewport() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  return { width: vv?.width || window.innerWidth || 390, height: vv?.height || window.innerHeight || 844 };
}

function safeForPreview(p) {
  // The shell supplies a reproducible safe-area preset. A standalone embed
  // still honours the same URL, while its actual iframe viewport remains the
  // requested 390x844 reference size.
  return parseSafe(p);
}

function choiceConfig(p) {
  const id = p.get('choice') || 'baseline';
  const choice = CHOICES[id] || CHOICES.baseline;
  const a = numberParam(p, 'a', CALIBRATION_ZOOM);
  const zoom = id === 'target' ? a * TARGET_FACTOR : id === 'baseline' ? a : (choice.zoom || CURRENT_ZOOM);
  return { id, choice, a, zoom };
}

function sceneConfig(p) {
  return SCENES[p.get('scene')] || SCENES.flat;
}

function setCanvasPixels(canvas, width, height) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const pw = Math.max(1, Math.round(width * dpr));
  const ph = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== pw) canvas.width = pw;
  if (canvas.height !== ph) canvas.height = ph;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, dpr };
}

function drawArrow(ctx, x, y, direction, color) {
  ctx.save();
  ctx.translate(x, y);
  if (direction < 0) ctx.rotate(Math.PI);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -13); ctx.lineTo(10, -1); ctx.lineTo(4, -1);
  ctx.lineTo(4, 13); ctx.lineTo(-4, 13); ctx.lineTo(-4, -1); ctx.lineTo(-10, -1);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawPreviewControls(canvas, layout, held = new Set()) {
  const { ctx } = setCanvasPixels(canvas, layout.viewport.width, layout.viewport.height);
  ctx.clearRect(0, 0, layout.viewport.width, layout.viewport.height);
  const paint = (id, color, label, arrow = 0) => {
    const c = layout.controls[id];
    const active = held.has(c.action);
    ctx.save();
    ctx.globalAlpha = active ? 0.38 : 0.16;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = active ? 0.88 : 0.42;
    ctx.strokeStyle = color; ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();
    ctx.restore();
    if (arrow) drawArrow(ctx, c.cx, c.cy - 3, arrow, 'rgba(255,255,255,0.82)');
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(label, c.cx, c.cy + c.r * 0.3);
    ctx.restore();
  };
  paint('jump', '#3a9cf4', 'JUMP', 1);
  paint('slide', '#b27af3', 'SLIDE', -1);
  paint('use', '#6de1cc', 'USE');
  const pause = layout.controls.pause;
  ctx.save();
  ctx.globalAlpha = held.has(pause.action) ? 0.42 : 0.2;
  ctx.fillStyle = '#dbe9ff'; ctx.beginPath(); ctx.arc(pause.cx, pause.cy, pause.r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.52; ctx.strokeStyle = '#dbe9ff'; ctx.lineWidth = 1; ctx.stroke();
  ctx.globalAlpha = 0.8; ctx.fillStyle = '#152338';
  ctx.fillRect(pause.cx - 5, pause.cy - 7, 3, 14); ctx.fillRect(pause.cx + 2, pause.cy - 7, 3, 14);
  ctx.restore();
}

function spriteBounds(drawToon, pose, heroId) {
  const probe = document.createElement('canvas');
  probe.width = 128; probe.height = 128;
  const ctx = probe.getContext('2d');
  const cx = 64, feet = 96, h = 24;
  ctx.clearRect(0, 0, probe.width, probe.height);
  drawToon(ctx, heroId, pose, cx, feet, h, {});
  const data = ctx.getImageData(0, 0, probe.width, probe.height).data;
  let left = probe.width, top = probe.height, right = -1, bottom = -1;
  for (let y = 0; y < probe.height; y++) for (let x = 0; x < probe.width; x++) {
    if (data[(y * probe.width + x) * 4 + 3] < 8) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  if (right < left) return null;
  return { left: left - cx, top: top - feet, right: right - cx + 1, bottom: bottom - feet + 1 };
}

function readouts(run, camera, frame, drawToon, pose, heroId) {
  const bounds = spriteBounds(drawToon, pose, heroId);
  const heroWorldX = run.playerWorldX();
  const groundY = run.playerGroundY();
  const logicalBounds = bounds ? (() => {
    const topPoint = { x: heroWorldX + bounds.left, y: groundY - run.player.y + bounds.top };
    const bottomPoint = { x: heroWorldX + bounds.right, y: groundY - run.player.y + bounds.bottom };
    const top = { x: topPoint.x * camera.scale + camera.tx, y: topPoint.y * camera.scale + camera.ty };
    const bottom = { x: bottomPoint.x * camera.scale + camera.tx, y: bottomPoint.y * camera.scale + camera.ty };
    return { left: top.x, right: bottom.x, top: top.y, bottom: bottom.y };
  })() : null;
  const cssBounds = logicalBounds ? {
    left: logicalBounds.left * frame.scale + screen.ox,
    right: logicalBounds.right * frame.scale + screen.ox,
    top: logicalBounds.top * frame.scale + screen.oy,
    bottom: logicalBounds.bottom * frame.scale + screen.oy,
    width: (logicalBounds.right - logicalBounds.left) * frame.scale,
    height: (logicalBounds.bottom - logicalBounds.top) * frame.scale,
  } : null;
  const box = run.playerBox();
  const hitRightLogical = box.x + box.w - run.camX;
  const hitRightCss = hitRightLogical * camera.scale * frame.scale + screen.ox;
  const worldWidth = frame.width / camera.scale;
  const actionObstacles = (run.obstacles || []).filter((ob) => ob.live && ob.def?.action !== 'none' && ob.x >= heroWorldX);
  const react = Number.isFinite(run.spawner?.react) ? run.spawner.react : null;
  const heroRightRel = box.x + box.w - run.camX;
  const responseWindows = react == null ? [] : actionObstacles.map((ob) => {
    // The obstacle enters at the camera's right edge. The last viable point
    // is its left edge reaching the hero hitbox's right edge, with the
    // authored reaction floor still reserved. Account for a closing obstacle
    // (barrels/animals) using its actual current velocity.
    const closingRate = Math.max(1, run.speed - (Number.isFinite(ob.vx) ? ob.vx : 0));
    const visibleDistance = worldWidth - heroRightRel;
    const responseDistance = Math.max(0, visibleDistance - react * closingRate);
    return responseDistance / closingRate;
  }).filter((v) => Number.isFinite(v));
  return {
    frame: { mode: frame.mode, width: frame.width, height: frame.height, scale: frame.scale,
      groundScreenY: frame.groundScreenY, revision: frame.revision },
    spriteCssBounds: cssBounds,
    worldWidth,
    heroHitboxToRightEdge: Math.max(0, frame.width * frame.scale - hitRightCss),
    speed: run.speed,
    minHazardWindow: responseWindows.length ? Math.min(...responseWindows) : null,
    responseMethod: responseWindows.length ? 'visible right edge → collision box plus authored reaction floor' : 'unavailable',
    heroId, stage: run.stage?.id || null, sceneTime: run.tRun, seed: run.seed,
    camera: { zoom: camera.scale, pan: run.camPan, camX: run.camX, bounds: camera.bounds },
  };
}

async function bootEmbed() {
  window.__MASH_BUILD__ = 'portrait-preview';
  document.getElementById('portrait-shell')?.setAttribute('hidden', '');
  document.getElementById('embed-surface')?.removeAttribute('hidden');
  document.getElementById('error')?.setAttribute('hidden', '');
  const p = params();
  // Review-only background scale. The RunState applies this to its single
  // background pass around the authored ground line; world actors and UI stay
  // outside that transform. Production boot never sets this preview global.
  window.__MASH_PORTRAIT_BG_ZOOM__ = numberParam(p, 'bgZoom', 1);
  const viewportParam = parseViewport(p);
  const actual = activeViewport();
  const requested = p.has('viewport') ? viewportParam : actual;
  const scene = sceneConfig(p);
  const chosen = choiceConfig(p);
  const safe = safeForPreview(p);
  let frame = frameForViewport({
    mode: chosen.choice.mode, viewportWidth: requested.width, viewportHeight: requested.height,
    safeInsets: safe, revision: 1,
  });
  setPresentationFrame(frame);

  // Set the calibration before RunState/style modules evaluate. HUD/style
  // caches that derive from H/ZOOM then start in the actual review frame.
  const cameraMod = await import('../src/engine/camera.js');
  cameraMod.setRestingZoom(chosen.zoom);
  const renderer = await import('../src/engine/renderer.js');
  const input = await import('../src/engine/input.js');
  const saveMod = await import('../src/engine/save.js');
  const drawMod = await import('../src/game/draw.js');
  const toonMod = await import('../src/sprites/toons.js');
  const runMod = await import('../src/game/run.js');
  const stages = await import('../src/data/stages.js');
  const cabinets = await import('../src/data/cabinets.js');

  const save = new saveMod.Save();
  save.data = { version: 2, settings: saveMod.defaultSettings(), slots: [saveMod.defaultSlot(), null, null] };
  save.slotIndex = 0;
  save.settings.muted = true;
  save.settings.volumes.master = 0;
  save.settings.fancyFx = false;
  const stage = stages.STAGE_BY_ID[scene.stage];
  const cabinet = cabinets.CABINET_BY_ID[stage.cabinet];

  renderer.initRenderer({ isDesktop: true }, { savedDensity: 1 });
  input.Input.init();
  input.Input.setContext('run');
  drawMod.buildAllSprites();
  let run = new runMod.RunState({
    stage, cabinet, seed: scene.seed, save, demo: true, devInvuln: true,
    devStartPercent: scene.startAt, skipRunIn: true, announceBench: false,
    initialHeroId: 'lorenzo',
  });
  run.enter();
  // The one warm tick lets authored scripted pieces and the ordinary spawner
  // settle without changing the measured scene time meaningfully.
  run.update(1 / 60);
  input.Input.endFrame();

  const game = document.getElementById('game');
  const controls = document.getElementById('controls');
  let layout = portraitTouchLayout({ viewportWidth: requested.width, viewportHeight: requested.height, safeInsets: safe, revision: frame.revision });
  const held = new Set();
  const paintControls = () => drawPreviewControls(controls, layout, held);
  const surface = new PortraitInputSurface(controls, {
    layout,
    onPress(action) {
      const mapped = action === 'escape' && run.paused ? 'confirm' : action;
      held.add(action); input.Input.press(mapped); paintControls();
    },
    onRelease(action) {
      held.delete(action);
      input.Input.release(action); input.Input.release(action === 'escape' && run.paused ? 'confirm' : action); paintControls();
    },
  });
  let paused = true;
  let last = performance.now();
  let accum = 0;
  let lastReport = '';

  const render = () => {
    run.camZoom = chosen.zoom;
    run.prevCamZoom = chosen.zoom;
    run.camPan = 0; run.prevCamPan = 0;
    run.camFloorY = cameraMod.GROUND_Y; run.prevCamFloorY = cameraMod.GROUND_Y;
    run.prevCamX = run.camX;
    beginRenderFrame();
    run.draw(bctx, 0);
    blit();
    paintControls();
    const pose = toonMod.poseFromPlayer(run.player, run.tRun);
    const cam = cameraForFrame({ frame, camX: run.camX, zoom: chosen.zoom, pan: 0, floorY: cameraMod.GROUND_Y });
    const report = readouts(run, cam, frame, toonMod.drawToon, pose, run.relay.current);
    window.__portraitPreview = {
      frame, choice: chosen, scene, run, report,
      capture: () => presentCanvas()?.toDataURL('image/png') || null,
      controlsCapture: () => controls.toDataURL('image/png'),
      captureComposite: () => {
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(layout.viewport.width));
        out.height = Math.max(1, Math.round(layout.viewport.height));
        const outCtx = out.getContext('2d');
        const presented = presentCanvas();
        if (presented) outCtx.drawImage(presented, screen.ox, screen.oy, screen.cssW, screen.cssH);
        outCtx.drawImage(controls, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
      },
      surface,
    };
    const serial = JSON.stringify(report);
    if (serial !== lastReport) {
      lastReport = serial;
      parent.postMessage({ kind: 'portrait-readout', choice: chosen.id, scene: p.get('scene') || 'flat', report }, '*');
    }
  };

  const tick = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (!paused) {
      accum += dt;
      while (accum >= 1 / 60) { run.update(1 / 60); accum -= 1 / 60; }
    }
    render();
    requestAnimationFrame(tick);
  };
  window.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.type !== 'portrait-preview') return;
    if (msg.action === 'play') paused = false;
    if (msg.action === 'pause') paused = true;
    if (msg.action === 'step') { paused = true; run.update(1 / 60); }
    if (msg.action === 'background-zoom') {
      const next = Number(msg.value);
      if (Number.isFinite(next)) window.__MASH_PORTRAIT_BG_ZOOM__ = Math.max(1, Math.min(1.3, next));
    }
    render();
  });
  window.addEventListener('resize', () => {
    const nextViewport = activeViewport();
    const next = frameForViewport({ mode: chosen.choice.mode, viewportWidth: nextViewport.width, viewportHeight: nextViewport.height, safeInsets: safe, revision: frame.revision + 1 });
    frame = next;
    setPresentationFrame(next);
    layout = surface.resize({ viewportWidth: nextViewport.width, viewportHeight: nextViewport.height, safeInsets: safe });
    render();
  });
  render();
  requestAnimationFrame(tick);
}

function shell() {
  const root = document.getElementById('portrait-shell');
  if (!root) return;
  const refs = document.querySelectorAll('[data-reference]');
  for (const el of refs) el.src = REFERENCE;
  const sceneSelect = document.getElementById('scene-select');
  const viewportSelect = document.getElementById('viewport-select');
  const safeSelect = document.getElementById('safe-select');
  const aInput = document.getElementById('a-zoom');
  const aValue = document.getElementById('a-zoom-value');
  const backgroundInput = document.getElementById('background-zoom');
  const backgroundValue = document.getElementById('background-zoom-value');
  const frames = [...document.querySelectorAll('iframe[data-choice]')];
  const outerParams = params();
  const initialScene = outerParams.get('scene');
  if (SCENES[initialScene]) sceneSelect.value = initialScene;
  const initialBackgroundZoom = numberParam(outerParams, 'bgZoom', Number(backgroundInput.value));
  if (Number.isFinite(initialBackgroundZoom)) backgroundInput.value = String(Math.max(1, Math.min(1.3, initialBackgroundZoom)));
  const queryFor = (choice) => {
    const q = new URLSearchParams({ embed: '1', choice, scene: sceneSelect.value, viewport: viewportSelect.value, safe: safeSelect.value, renderer: '2d', density: '1', a: aInput.value, bgZoom: backgroundInput.value });
    return `portrait-preview.html?${q}`;
  };
  const reload = () => {
    aValue.textContent = Number(aInput.value).toFixed(3);
    backgroundValue.textContent = `${Math.round(Number(backgroundInput.value) * 100)}%`;
    for (const frame of frames) frame.src = queryFor(frame.dataset.choice);
  };
  for (const input of [sceneSelect, viewportSelect, safeSelect, aInput]) input.addEventListener('change', reload);
  aInput.addEventListener('input', () => { aValue.textContent = Number(aInput.value).toFixed(3); });
  const send = (action, value) => frames.forEach((frame) => frame.contentWindow?.postMessage({ type: 'portrait-preview', action, value }, '*'));
  backgroundValue.textContent = `${Math.round(Number(backgroundInput.value) * 100)}%`;
  backgroundInput.addEventListener('input', () => {
    backgroundValue.textContent = `${Math.round(Number(backgroundInput.value) * 100)}%`;
    send('background-zoom', Number(backgroundInput.value));
  });
  document.getElementById('play-button')?.addEventListener('click', () => send('play'));
  document.getElementById('pause-button')?.addEventListener('click', () => send('pause'));
  document.getElementById('step-button')?.addEventListener('click', () => send('step'));
  reload();
  window.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.kind !== 'portrait-readout') return;
    const card = document.querySelector(`[data-readout="${msg.choice}"]`);
    if (!card) return;
    const report = msg.report;
    const b = report.spriteCssBounds;
    const bounds = b ? `${b.width.toFixed(1)} × ${b.height.toFixed(1)} CSS px` : 'unavailable';
    const hazard = report.minHazardWindow == null ? 'unavailable' : `${report.minHazardWindow.toFixed(3)} s`;
    card.innerHTML = `sprite ${bounds}<br>world width ${report.worldWidth.toFixed(2)} wu · hitbox → edge ${report.heroHitboxToRightEdge.toFixed(1)} CSS px<br>speed ${report.speed.toFixed(2)} wu/s · min hazard window ${hazard}`;
  });
}

if (typeof window !== 'undefined') {
  if (params().get('embed') === '1') bootEmbed().catch((error) => {
    document.body.dataset.error = '1';
    const out = document.getElementById('error');
    if (out) { out.textContent = `${error?.stack || error}`; out.removeAttribute('hidden'); }
    console.error(error);
  });
  else shell();
}
