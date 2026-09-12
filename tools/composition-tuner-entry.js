// THE COMPOSITION TUNER's page: drag the portrait scenery bands on a real
// level and read the percentages back.
//
// Two modes in one bundle, the portrait preview's idiom. The SHELL is the
// desk: stage picker, viewport picker, transport, the live readout and the
// save buttons. The EMBED is one iframe sized to the phone, running the real
// renderer and a real RunState, with the band handles drawn on the control
// canvas above the picture.
//
// The iframe is not decoration. initRenderer measures the window, so the only
// honest way to show a 390x844 phone inside a desk layout is to give it a
// window that size. Everything the shell knows about the composition arrives
// by postMessage from inside it.
//
// Bands are dragged as fractions of the SCENERY RECTANGLE (see
// resolveSceneryLayout), never as pixels: that is what makes a number typed
// here mean the same composition on a different phone.
import {
  beginRenderFrame, blit, bctx, initRenderer, presentCanvas, screen,
  setPresentationFrame, setPresentationMode,
} from '../src/engine/renderer.js';
import { frameForViewport, PHONE_PORTRAIT } from '../src/engine/frame.js';
import { portraitTouchLayout, PortraitInputSurface } from '../src/engine/portrait-input.js';
import { portraitHudLayout } from '../src/game/portrait-layout.js';
import { resolveSceneryLayout } from '../src/engine/scenery-layout.js';
import {
  COMPOSITION_BAND_NAMES, COMPOSITION_LIMITS, DEFAULT_COMPOSITION_PROFILE,
  isDefaultCompositionProfile, resolveCompositionProfile, setCompositionProfileOverride,
  validateCompositionProfile,
} from '../src/engine/composition-profile.js';
import { PORTRAIT_LAB_DEFAULTS } from '../src/dev/portrait-lab.js';
import {
  drawLayoutDiagnostic, layoutDiagnosticEnabled, layoutDiagnosticSnapshot, toggleLayoutDiagnostic,
} from '../src/game/layout-diagnostic.js';
import { STAGES } from '../src/data/stages.js';
import { CABINETS } from '../src/data/cabinets.js';

// The supported phones, iPhone 11-class and up. The floor is deliberate: a
// band that reads well at 375x812 reads well on everything above it, and
// anything shorter is not a device this game runs on.
const VIEWPORTS = [
  { id: '375x812', label: '375 × 812 · 11 Pro / X', width: 375, height: 812, safe: { top: 44, bottom: 34 } },
  { id: '390x844', label: '390 × 844 · 12 / 13 / 14', width: 390, height: 844, safe: { top: 47, bottom: 34 } },
  { id: '414x896', label: '414 × 896 · 11 / XR', width: 414, height: 896, safe: { top: 48, bottom: 34 } },
  { id: '430x932', label: '430 × 932 · 15 Pro Max', width: 430, height: 932, safe: { top: 59, bottom: 34 } },
];

// One colour per band, warm at the top of the sky and cool at the ground, so
// a glance at the picture says which handle is which without reading.
const BAND_COLORS = {
  celestial: '#ffd479',
  upperCloud: '#bfe6ff',
  middleCloud: '#8ecbff',
  lowerCloud: '#6fb0f0',
  birds: '#d4a1ff',
  farLandmark: '#9fd8c0',
  middle: '#76c98f',
  near: '#5fae6b',
};

const BAND_LABELS = {
  celestial: 'SUN / MOON',
  upperCloud: 'UPPER CLOUD',
  middleCloud: 'MIDDLE CLOUD',
  lowerCloud: 'LOWER CLOUD',
  birds: 'BIRDS',
  farLandmark: 'FAR LANDMARK',
  middle: 'MIDDLE SCENERY',
  near: 'NEAR SCENERY',
};

const SNAP = 0.01;
const NUDGE = 0.01;
const NUDGE_COARSE = 0.05;
// A handle thinner than a thumb is a handle nobody can grab; this is CSS px
// either side of the drawn line.
const HANDLE_GRAB = 9;

const params = () => new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round2 = (n) => Math.round(n * 100) / 100;
const pct = (n) => `${(n * 100).toFixed(0)}%`;

function viewportFor(id) {
  return VIEWPORTS.find((v) => v.id === id) || VIEWPORTS[1];
}

function stageOptions() {
  const byCabinet = new Map();
  for (const stage of STAGES) {
    if (!byCabinet.has(stage.cabinet)) byCabinet.set(stage.cabinet, []);
    byCabinet.get(stage.cabinet).push(stage);
  }
  return CABINETS
    .filter((cab) => byCabinet.has(cab.id))
    .map((cab) => ({ cabinet: cab, stages: byCabinet.get(cab.id) }));
}

// ---------------------------------------------------------------- embed ----

async function bootEmbed() {
  const p = params();
  // Same document as the desk, because the renderer binds #game when its
  // module is evaluated. Strip the desk and show the phone surface.
  document.body.classList.add('embed');
  for (const el of [...document.body.children]) {
    if (el.id !== 'embed-surface' && el.tagName !== 'SCRIPT') el.remove();
  }
  document.getElementById('embed-surface').hidden = false;
  const view = viewportFor(p.get('viewport'));
  const stageId = p.get('stage') || STAGES[0].id;
  const startAt = Number(p.get('startAt'));
  const safe = { top: view.safe.top, right: 0, bottom: view.safe.bottom, left: 0 };

  const cameraMod = await import('../src/engine/camera.js');
  const saveMod = await import('../src/engine/save.js');
  const inputMod = await import('../src/engine/input.js');
  const drawMod = await import('../src/game/draw.js');
  const runMod = await import('../src/game/run.js');
  const stages = await import('../src/data/stages.js');
  const cabinets = await import('../src/data/cabinets.js');

  const stage = stages.STAGE_BY_ID[stageId] || STAGES[0];
  const cabinet = cabinets.CABINET_BY_ID[stage.cabinet];
  const zoom = PORTRAIT_LAB_DEFAULTS.worldZoom;

  let frame = frameForViewport({
    mode: PHONE_PORTRAIT, viewportWidth: view.width, viewportHeight: view.height,
    safeInsets: safe, groundAnchorRatio: PORTRAIT_LAB_DEFAULTS.groundAnchorRatio, revision: 1,
  });
  setPresentationFrame(frame);
  cameraMod.setRestingZoom(zoom);

  const save = new saveMod.Save();
  save.data = { version: 2, settings: saveMod.defaultSettings(), slots: [saveMod.defaultSlot(), null, null] };
  save.slotIndex = 0;
  save.settings.muted = true;
  save.settings.volumes.master = 0;
  save.settings.fancyFx = false;

  initRenderer({ isDesktop: true }, { savedDensity: 1 });
  setPresentationMode(PHONE_PORTRAIT, { groundAnchorRatio: PORTRAIT_LAB_DEFAULTS.groundAnchorRatio });
  inputMod.Input.init();
  inputMod.Input.setContext('run');
  drawMod.buildAllSprites();

  let run = new runMod.RunState({
    stage, cabinet, seed: 0x434f4d50, save, demo: true, devInvuln: true,
    devStartPercent: Number.isFinite(startAt) ? startAt : 0.2, skipRunIn: true,
    announceBench: false, initialHeroId: 'lorenzo', portraitLabRun: true,
    portraitPreview: true, devPortraitLab: { ...PORTRAIT_LAB_DEFAULTS },
  });
  run.enter();
  run.update(1 / 60);
  inputMod.Input.endFrame();

  const controls = document.getElementById('controls');
  let layout = portraitTouchLayout({
    viewportWidth: view.width, viewportHeight: view.height, safeInsets: safe, revision: frame.revision,
  });
  const held = new Set();
  // The tuner is a composition surface, not a play surface: the touch layer
  // exists so the discs are drawn where they really are (they own the bottom
  // of the frame the bands have to live above) and so PAUSE still works.
  const surface = new PortraitInputSurface(controls, {
    layout,
    onPress(action) {
      const mapped = action === 'escape' && run.paused ? 'confirm' : action;
      held.add(action); inputMod.Input.press(mapped);
    },
    onRelease(action) {
      held.delete(action);
      inputMod.Input.release(action);
      inputMod.Input.release(action === 'escape' && run.paused ? 'confirm' : action);
    },
  });

  let profile = resolveCompositionProfile(cabinet.id, stage.id);
  let selected = { band: COMPOSITION_BAND_NAMES[0], edge: 'hi' };
  let drag = null;
  let paused = true;
  let lastSerial = '';

  const scenerySpan = () => {
    const hud = portraitHudLayout(frame);
    const scene = resolveSceneryLayout({ frame, hud, groundY: cameraMod.GROUND_Y, bands: profile.bands });
    return scene.screenRect;
  };

  // CSS y on the control canvas -> fraction of the scenery rectangle. The
  // control canvas and the picture share the same CSS box here, so the only
  // conversion needed is the frame's logical scale.
  const fractionForCssY = (cssY) => {
    const rect = scenerySpan();
    const logicalY = cssY / Math.max(0.001, frame.scale);
    const span = Math.max(1e-6, rect.height);
    return clamp((logicalY - rect.top) / span, 0, 1);
  };
  const cssYForFraction = (fraction) => {
    const rect = scenerySpan();
    return (rect.top + rect.height * fraction) * frame.scale;
  };

  const applyProfile = (next, { republish = false } = {}) => {
    profile = validateCompositionProfile(next, DEFAULT_COMPOSITION_PROFILE);
    setCompositionProfileOverride(`${cabinet.id}/${stage.id}`, profile);
    if (republish) {
      frame = frameForViewport({
        mode: PHONE_PORTRAIT, viewportWidth: view.width, viewportHeight: view.height,
        safeInsets: safe, groundAnchorRatio: profile.groundAnchorRatio, revision: frame.revision + 1,
      });
      setPresentationFrame(frame);
      setPresentationMode(PHONE_PORTRAIT, { groundAnchorRatio: profile.groundAnchorRatio });
      layout = surface.resize({
        viewportWidth: view.width, viewportHeight: view.height, safeInsets: safe,
      });
    }
    render();
  };

  const moveEdge = (bandName, edge, fraction) => {
    const band = profile.bands[bandName];
    if (!band) return;
    const value = round2(clamp(fraction, 0, 1));
    let [lo, hi] = band;
    if (edge === 'lo') lo = Math.min(value, hi - COMPOSITION_LIMITS.bandMinSpan);
    else if (edge === 'hi') hi = Math.max(value, lo + COMPOSITION_LIMITS.bandMinSpan);
    else {
      // Whole-band drag: carry the span, and stop at the rectangle's edges
      // rather than squashing it.
      const span = hi - lo;
      lo = clamp(value - span / 2, 0, 1 - span);
      hi = lo + span;
    }
    applyProfile({ ...profile, bands: { ...profile.bands, [bandName]: [round2(lo), round2(hi)] } });
  };

  const handles = () => {
    const out = [];
    for (const name of COMPOSITION_BAND_NAMES) {
      const band = profile.bands[name];
      if (!band) continue;
      out.push({ band: name, edge: 'lo', fraction: band[0], y: cssYForFraction(band[0]) });
      out.push({ band: name, edge: 'hi', fraction: band[1], y: cssYForFraction(band[1]) });
    }
    return out;
  };

  const hitHandle = (cssY) => {
    let best = null;
    for (const handle of handles()) {
      const distance = Math.abs(handle.y - cssY);
      if (distance <= HANDLE_GRAB && (!best || distance < best.distance)) best = { ...handle, distance };
    }
    return best;
  };

  controls.addEventListener('pointerdown', (event) => {
    const cssY = event.clientY;
    const hit = hitHandle(cssY);
    if (!hit) return;
    // Beat PortraitInputSurface to the event: a handle sitting over the JUMP
    // half must drag, not jump.
    event.stopImmediatePropagation();
    event.preventDefault();
    try { controls.setPointerCapture(event.pointerId); } catch (e) { /* optional */ }
    drag = { pointerId: event.pointerId, band: hit.band, edge: hit.edge };
    selected = { band: hit.band, edge: hit.edge };
    render();
  }, { capture: true });

  controls.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.stopImmediatePropagation();
    moveEdge(drag.band, drag.edge, fractionForCssY(event.clientY));
  }, { capture: true });

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    postReadout(true);
  };
  controls.addEventListener('pointerup', endDrag, { capture: true });
  controls.addEventListener('pointercancel', endDrag, { capture: true });

  window.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? NUDGE_COARSE : NUDGE;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const band = profile.bands[selected.band];
      if (!band) return;
      const current = selected.edge === 'lo' ? band[0] : band[1];
      moveEdge(selected.band, selected.edge, current + (event.key === 'ArrowDown' ? step : -step));
      postReadout(true);
      event.preventDefault();
    }
  });

  // The discs are not playable here, but they own the bottom of the frame the
  // bands have to live above: drawing them keeps the composition honest about
  // how much picture there really is.
  const drawDiscs = (ctx, dpr) => {
    ctx.save();
    ctx.scale(dpr, dpr);
    for (const control of Object.values(layout.controls || {})) {
      ctx.beginPath();
      ctx.arc(control.cx, control.cy, control.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(control.id).toUpperCase(), control.cx, control.cy);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  };

  const drawHandles = (ctx, dpr) => {
    const width = layout.viewport.width;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 1;
    ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    for (const name of COMPOSITION_BAND_NAMES) {
      const band = profile.bands[name];
      if (!band) continue;
      const color = BAND_COLORS[name] || '#ffffff';
      const top = cssYForFraction(band[0]);
      const bottom = cssYForFraction(band[1]);
      const active = selected.band === name;
      ctx.fillStyle = color;
      ctx.globalAlpha = active ? 0.16 : 0.07;
      ctx.fillRect(0, top, width, Math.max(1, bottom - top));
      ctx.globalAlpha = 1;
      for (const [edge, y] of [['lo', top], ['hi', bottom]]) {
        const on = active && selected.edge === edge;
        ctx.strokeStyle = color;
        ctx.globalAlpha = on ? 1 : 0.75;
        ctx.setLineDash(edge === 'lo' ? [] : [4, 3]);
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        // The grab target, drawn so it is obvious where the thumb goes.
        ctx.fillStyle = color;
        ctx.globalAlpha = on ? 0.95 : 0.55;
        ctx.fillRect(width - 46, y - 7, 42, 14);
        ctx.fillStyle = '#0d1119';
        ctx.globalAlpha = 1;
        ctx.fillText(`${edge.toUpperCase()} ${pct(edge === 'lo' ? band[0] : band[1])}`, width - 43, y);
      }
      ctx.fillStyle = color;
      ctx.globalAlpha = active ? 1 : 0.8;
      ctx.fillText(BAND_LABELS[name] || name, 6, top + 8);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  function snapshot() {
    const hud = portraitHudLayout(frame);
    const diag = layoutDiagnosticSnapshot(run, frame, { bands: profile.bands });
    return {
      cabinet: cabinet.id,
      stage: stage.id,
      viewport: view.id,
      isDefault: isDefaultCompositionProfile(profile),
      profile: { bands: profile.bands, groundAnchorRatio: profile.groundAnchorRatio },
      selected,
      // This is the largest y the ground may occupy in this viewport. The
      // profile can move the ground upward, but never below the chat-clearing
      // floor derived by portraitGeometry.
      groundFloorRatio: hud.groundFloorRatio,
      groundFloorScreenY: hud.groundFloorScreenY,
      largestChatHeightCss: hud.largestChatHeightCss,
      skyGapPercent: diag?.largestSkyGapPercent ?? null,
      lines: diag?.lines || [],
      ranges: diag?.ranges || [],
      sceneryRect: scenerySpan(),
    };
  }

  function postReadout(force = false) {
    const report = snapshot();
    const serial = JSON.stringify(report);
    if (!force && serial === lastSerial) return;
    lastSerial = serial;
    parent.postMessage({ kind: 'composition-readout', report }, '*');
  }

  // A capture has to happen inside the frame that drew it: the presented
  // canvas is a WebGL surface, and reading it after the compositor has had it
  // returns black. So a request sets this flag and the render pass below
  // composites right after blit().
  let captureRequest = false;

  const composite = () => {
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(layout.viewport.width));
    out.height = Math.max(1, Math.round(layout.viewport.height));
    const outCtx = out.getContext('2d');
    const presented = presentCanvas();
    if (presented) outCtx.drawImage(presented, screen.ox, screen.oy, screen.cssW, screen.cssH);
    return out;
  };

  function render() {
    run.camZoom = zoom;
    run.prevCamZoom = zoom;
    if (run.portraitFrameFit) run.portraitFrameFitState = run.portraitFrameFit();
    const fitPan = Number(run.portraitFrameFitState?.pan || 0);
    run.camPan = fitPan; run.prevCamPan = fitPan;
    run.camFloorY = cameraMod.GROUND_Y; run.prevCamFloorY = cameraMod.GROUND_Y;
    run.prevCamX = run.camX;
    beginRenderFrame();
    run.draw(bctx, 0);
    blit();
    const pictureLayer = captureRequest ? composite() : null;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    controls.width = Math.round(layout.viewport.width * dpr);
    controls.height = Math.round(layout.viewport.height * dpr);
    controls.style.width = `${layout.viewport.width}px`;
    controls.style.height = `${layout.viewport.height}px`;
    const ctx = controls.getContext('2d');
    ctx.clearRect(0, 0, controls.width, controls.height);
    if (layoutDiagnosticEnabled()) {
      drawLayoutDiagnostic(ctx, run, frame, {
        outputScale: dpr, cssWidth: layout.viewport.width, bands: profile.bands,
      });
    }
    drawDiscs(ctx, dpr);
    drawHandles(ctx, dpr);
    if (pictureLayer) {
      captureRequest = false;
      const outCtx = pictureLayer.getContext('2d');
      outCtx.drawImage(controls, 0, 0, pictureLayer.width, pictureLayer.height);
      parent.postMessage({ kind: 'composition-capture', png: pictureLayer.toDataURL('image/png') }, '*');
    }
    window.__compositionTuner = {
      frame, run, profile, report: snapshot(),
      requestCapture: () => { captureRequest = true; },
      setProfile: (next) => applyProfile(next, { republish: true }),
    };
    postReadout();
  }

  window.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.type !== 'composition-tuner') return;
    if (msg.action === 'play') paused = false;
    if (msg.action === 'pause') paused = true;
    if (msg.action === 'step') { paused = true; run.update(1 / 60); }
    if (msg.action === 'diagnostic') toggleLayoutDiagnostic();
    if (msg.action === 'select') selected = { band: msg.band, edge: msg.edge || 'hi' };
    if (msg.action === 'set-profile') applyProfile(msg.profile, { republish: true });
    if (msg.action === 'set-band' && msg.band) {
      applyProfile({ ...profile, bands: { ...profile.bands, [msg.band]: msg.value } });
    }
    // One edge, from the desk's sliders. moveEdge owns the lo<hi and minimum
    // span rules so a slider and a dragged handle cannot disagree.
    if (msg.action === 'set-edge' && msg.band) {
      selected = { band: msg.band, edge: msg.edge };
      moveEdge(msg.band, msg.edge, Number(msg.value));
    }
    if (msg.action === 'set-ground') {
      applyProfile({ ...profile, groundAnchorRatio: Number(msg.value) }, { republish: true });
    }
    if (msg.action === 'capture') captureRequest = true;
    render();
  });

  const tick = (now) => {
    if (!paused) {
      const dt = Math.min(0.1, Math.max(0, (now - (tick.last || now)) / 1000));
      tick.accum = (tick.accum || 0) + dt;
      while (tick.accum >= 1 / 60) { run.update(1 / 60); tick.accum -= 1 / 60; }
    }
    tick.last = now;
    render();
    requestAnimationFrame(tick);
  };
  // The band handles ARE the tuner and are always drawn. The full diagnostic
  // line set is dense enough to bury them, so it starts off and comes back on
  // the desk's OVERLAY button when a specific number needs checking.
  if (layoutDiagnosticEnabled()) toggleLayoutDiagnostic();
  requestAnimationFrame(tick);
  postReadout(true);
}

// ---------------------------------------------------------------- shell ----

function shell() {
  const p = params();
  const state = {
    viewport: p.get('viewport') || '390x844',
    stage: p.get('stage') || STAGES[0].id,
    startAt: Number(p.get('startAt')) || 0.2,
    report: null,
    holding: null,
  };

  const el = (id) => document.getElementById(id);
  const frameHost = el('frame-host');
  const readout = el('readout');
  const status = el('status');
  const stageList = el('stage-list');
  const viewportList = el('viewport-list');

  const say = (text, tone = '') => {
    status.textContent = text;
    status.dataset.tone = tone;
  };

  const send = (message) => {
    frameHost.querySelector('iframe')?.contentWindow?.postMessage(
      { type: 'composition-tuner', ...message }, '*');
  };

  function mountFrame() {
    const view = viewportFor(state.viewport);
    frameHost.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'phone';
    wrap.style.width = `${view.width}px`;
    wrap.style.height = `${view.height}px`;
    const iframe = document.createElement('iframe');
    const query = new URLSearchParams({
      embed: '1', viewport: state.viewport, stage: state.stage, startAt: String(state.startAt),
    });
    iframe.src = `?${query}`;
    iframe.width = String(view.width);
    iframe.height = String(view.height);
    wrap.appendChild(iframe);
    frameHost.appendChild(wrap);
  }

  function buildStageList() {
    stageList.innerHTML = '';
    for (const group of stageOptions()) {
      const heading = document.createElement('div');
      heading.className = 'group';
      heading.textContent = group.cabinet.title || group.cabinet.name || group.cabinet.id;
      stageList.appendChild(heading);
      for (const stage of group.stages) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'option';
        option.dataset.stage = stage.id;
        option.setAttribute('role', 'option');
        option.textContent = `${stage.id} · ${stage.mission?.desc || stage.mission?.type || ''}`
          .slice(0, 54).trim();
        option.setAttribute('aria-selected', String(stage.id === state.stage));
        option.addEventListener('click', () => {
          state.stage = stage.id;
          for (const other of stageList.querySelectorAll('.option')) {
            other.setAttribute('aria-selected', String(other.dataset.stage === stage.id));
          }
          mountFrame();
          say(`${stage.id} loaded`);
        });
        stageList.appendChild(option);
      }
    }
  }

  function buildViewportList() {
    viewportList.innerHTML = '';
    for (const view of VIEWPORTS) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'option';
      option.dataset.viewport = view.id;
      option.setAttribute('role', 'option');
      option.textContent = view.label;
      option.setAttribute('aria-selected', String(view.id === state.viewport));
      option.addEventListener('click', () => {
        state.viewport = view.id;
        for (const other of viewportList.querySelectorAll('.option')) {
          other.setAttribute('aria-selected', String(other.dataset.viewport === view.id));
        }
        mountFrame();
      });
      viewportList.appendChild(option);
    }
  }

  // While a slider is held, refresh only that row's numbers so the thumb the
  // pointer is holding is never replaced.
  function updateHeldRow() {
    const held = state.holding;
    const report = state.report;
    if (!held || !report) return;
    const band = report.profile.bands[held.band];
    const row = readout.querySelector(`tr[data-band="${held.band}"]:not(.sliders)`);
    if (!row || !band) return;
    const cells = row.querySelectorAll('td');
    if (cells[0]) cells[0].textContent = pct(band[0]);
    if (cells[1]) cells[1].textContent = pct(band[1]);
    if (cells[2]) cells[2].textContent = pct(band[1] - band[0]);
    const range = report.ranges.find((r) => r.name === held.band);
    if (cells[3] && range) {
      cells[3].textContent = `${Math.round(range.fromSafeTopCss[0])}–${Math.round(range.fromSafeTopCss[1])}`;
    }
    // The OTHER edge can be pushed by the minimum-span rule, so keep its
    // slider honest without touching the one under the pointer.
    const other = readout.querySelector(
      `input.edge[data-band="${held.band}"][data-edge="${held.edge === 'lo' ? 'hi' : 'lo'}"]`);
    if (other) other.value = String(held.edge === 'lo' ? band[1] : band[0]);
  }

  function renderReadout() {
    const report = state.report;
    const groundUp = el('ground-up');
    const groundDown = el('ground-down');
    if (!report) {
      groundUp.disabled = true;
      groundDown.disabled = true;
      readout.innerHTML = '<p class="muted">waiting for the frame…</p>';
      return;
    }
    const groundMin = COMPOSITION_LIMITS.groundAnchorRatio[0];
    const groundMax = Math.min(COMPOSITION_LIMITS.groundAnchorRatio[1],
      Number.isFinite(Number(report.groundFloorRatio))
        ? Number(report.groundFloorRatio) : COMPOSITION_LIMITS.groundAnchorRatio[1]);
    const currentGround = Number(report.profile.groundAnchorRatio);
    groundUp.disabled = !(currentGround > groundMin + 1e-9);
    groundDown.disabled = !(currentGround < groundMax - 1e-9);
    // Two sliders per band, right in the table. The picture has eight bands
    // and sixteen edges stacked in one column, so several handles can land on
    // top of each other; here every edge has a target of its own that cannot
    // be covered by another.
    const rows = COMPOSITION_BAND_NAMES.map((name) => {
      const band = report.profile.bands[name];
      const base = DEFAULT_COMPOSITION_PROFILE.bands[name];
      const moved = band[0] !== base[0] || band[1] !== base[1];
      const range = report.ranges.find((r) => r.name === name);
      const css = range ? `${Math.round(range.fromSafeTopCss[0])}–${Math.round(range.fromSafeTopCss[1])}` : '—';
      const on = report.selected?.band === name;
      const slider = (edge, value) => `<input class="edge" type="range" min="0" max="1" step="0.01"
        value="${value}" data-band="${name}" data-edge="${edge}"
        aria-label="${BAND_LABELS[name] || name} ${edge === 'lo' ? 'top' : 'bottom'}">`;
      return `<tr class="${on ? 'on' : ''}${moved ? ' moved' : ''}" data-band="${name}">
        <th><span class="swatch" style="background:${BAND_COLORS[name]}"></span>${BAND_LABELS[name] || name}</th>
        <td class="num">${pct(band[0])}</td><td class="num">${pct(band[1])}</td>
        <td class="num muted">${pct(band[1] - band[0])}</td>
        <td class="num muted">${css}</td></tr>
      <tr class="sliders ${on ? 'on' : ''}" data-band="${name}" style="--band:${BAND_COLORS[name]}">
        <td colspan="5"><div class="edges">
          <label>top${slider('lo', band[0])}</label>
          <label>bottom${slider('hi', band[1])}</label>
        </div></td></tr>`;
    }).join('');
    const gap = report.skyGapPercent;
    const gapClass = Number(gap) > 20 ? 'bad' : '';
    readout.innerHTML = `
      <table class="bands">
        <thead><tr><th>band</th><th class="num">top</th><th class="num">bottom</th><th class="num">span</th><th class="num">css</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <dl class="facts">
        <div><dt>cabinet</dt><dd>${report.cabinet}</dd></div>
        <div><dt>stage</dt><dd>${report.stage}</dd></div>
        <div><dt>ground anchor</dt><dd>${(report.profile.groundAnchorRatio * 100).toFixed(1)}% · lowest ${(groundMax * 100).toFixed(1)}%</dd></div>
        <div><dt>largest chat card</dt><dd>${Number(report.largestChatHeightCss || 0).toFixed(0)} CSS px</dd></div>
        <div><dt>largest sky gap</dt><dd class="${gapClass}">${gap == null ? '—' : `${gap.toFixed(0)}%`}</dd></div>
        <div><dt>authored</dt><dd>${report.isDefault ? 'default profile' : 'edited'}</dd></div>
      </dl>`;
    for (const row of readout.querySelectorAll('tr[data-band]:not(.sliders)')) {
      row.addEventListener('click', () => send({ action: 'select', band: row.dataset.band, edge: 'hi' }));
    }
    for (const input of readout.querySelectorAll('input.edge')) {
      const { band, edge } = input.dataset;
      // `input` rather than `change`: the point of a slider here is that the
      // level redraws while the thumb is moving.
      input.addEventListener('input', () => {
        const current = state.report?.profile.bands[band];
        if (!current) return;
        // The shell holds the edit while the thumb is down. Re-rendering the
        // table under a live pointer would tear the slider out of the user's
        // hand on the first frame.
        state.holding = { band, edge };
        send({ action: 'set-edge', band, edge, value: Number(input.value) });
      });
      const release = () => { state.holding = null; renderReadout(); };
      input.addEventListener('change', release);
      input.addEventListener('pointerup', release);
      input.addEventListener('keyup', release);
      input.addEventListener('focus', () => send({ action: 'select', band, edge }));
    }
  }

  window.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.kind === 'composition-readout') {
      state.report = msg.report;
      if (!state.holding) renderReadout();
      else updateHeldRow();
    }
    if (msg.kind === 'composition-capture' && msg.png) {
      fetch('/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          png: msg.png, stage: state.stage, viewport: state.viewport,
        }),
      }).then((r) => r.json()).then((body) => {
        say(body.ok ? `snapshot → ${body.path}` : `snapshot failed: ${body.errors?.[0]}`, body.ok ? 'ok' : 'bad');
      }).catch((err) => say(`snapshot failed: ${err.message}`, 'bad'));
    }
  });

  el('play').addEventListener('click', () => { send({ action: 'play' }); say('playing'); });
  el('pause').addEventListener('click', () => { send({ action: 'pause' }); say('paused'); });
  el('step').addEventListener('click', () => send({ action: 'step' }));
  el('diagnostic').addEventListener('click', () => send({ action: 'diagnostic' }));
  el('reset').addEventListener('click', () => {
    send({ action: 'set-profile', profile: DEFAULT_COMPOSITION_PROFILE });
    say('reset to the default profile');
  });
  el('ground-up').addEventListener('click', () => adjustGround(-0.005));
  el('ground-down').addEventListener('click', () => adjustGround(0.005));

  function adjustGround(delta) {
    const current = state.report?.profile.groundAnchorRatio ?? DEFAULT_COMPOSITION_PROFILE.groundAnchorRatio;
    const floor = Number(state.report?.groundFloorRatio);
    const max = Math.min(COMPOSITION_LIMITS.groundAnchorRatio[1],
      Number.isFinite(floor) ? floor : COMPOSITION_LIMITS.groundAnchorRatio[1]);
    if (delta > 0 && current >= max - 1e-9) {
      say('ground is already at the chat-clearing floor', 'ok');
      return;
    }
    send({ action: 'set-ground', value: clamp(current + delta,
      COMPOSITION_LIMITS.groundAnchorRatio[0], max) });
  }

  el('copy').addEventListener('click', async () => {
    if (!state.report) return;
    const text = JSON.stringify(state.report.profile, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      say('profile JSON copied');
    } catch (err) {
      say(`clipboard refused: ${err.message}`, 'bad');
    }
  });

  el('snapshot').addEventListener('click', () => send({ action: 'capture' }));

  const saveScope = () => (el('scope-stage').getAttribute('aria-pressed') === 'true' ? 'stage' : 'cabinet');
  el('scope-cabinet').addEventListener('click', () => {
    el('scope-cabinet').setAttribute('aria-pressed', 'true');
    el('scope-stage').setAttribute('aria-pressed', 'false');
  });
  el('scope-stage').addEventListener('click', () => {
    el('scope-stage').setAttribute('aria-pressed', 'true');
    el('scope-cabinet').setAttribute('aria-pressed', 'false');
  });

  el('save').addEventListener('click', async () => {
    if (!state.report) return;
    const payload = {
      cabinet: state.report.cabinet,
      stage: saveScope() === 'stage' ? state.report.stage : null,
      profile: state.report.profile,
    };
    try {
      const res = await fetch('/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!body.ok) { say(`save refused: ${body.errors?.join(', ')}`, 'bad'); return; }
      say(body.changed
        ? `saved ${payload.stage || payload.cabinet} → src/data/composition-profiles.js`
        : 'no change to write', 'ok');
    } catch (err) {
      // Served as a static file with no tuner server behind it: hand the
      // author the JSON rather than losing the work.
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `composition-${payload.stage || payload.cabinet}.json`;
      a.click();
      say('no tuner server — downloaded the JSON instead', 'bad');
    }
  });

  buildStageList();
  buildViewportList();
  mountFrame();
  renderReadout();
  say('drag a band edge on the phone, or click a row to select it');
}

if (typeof document !== 'undefined') {
  if (params().get('embed') === '1') bootEmbed();
  else shell();
}
