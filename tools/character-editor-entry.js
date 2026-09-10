import { TOON_SPECS, drawToon, setInkDensity } from '../src/sprites/toons.js';
import { RUSTY_W3B, PANDA_PAL } from '../src/dev/hero-candidates.js';
import { HERO_BY_ID } from '../src/data/heroes.js';
import {
  BODY_GROUPS, BODY_SHAPES, CAST, HERO_DIALS, EDITOR_HELP,
  bodyShapeOf, clampDial, dialApplicability, dialByKey, operationFor,
} from './lib/hero-dials.js';
import { actionFor, actionOptions, actionPose } from './lib/character-editor-actions.js';
import { measureViewport } from './lib/character-editor-viewport.js';

const TOKEN = typeof __CHARACTER_EDITOR_TOKEN__ === 'string' ? __CHARACTER_EDITOR_TOKEN__ : 'dev';
const ids = [...CAST];
const labels = {
  lorenzo: 'Lorenzo', gnash: 'Gnash', fernwick: 'Fernwick', b33p: 'B-33P',
  kiko: 'Kiko', clara: 'Clara', gary: 'Gary', dolores: 'Dolores',
  grumpos: 'Grumpos', rusty: 'Rusty',
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const baseSpec = (id) => clone(id === 'rusty' ? RUSTY_W3B : TOON_SPECS[id]);
const BASE_POSES = ['run', 'walk', 'jump', 'slide', 'stand'];
const state = {
  hero: ids[0], mode: 'run', actionKey: null, phase: .18, facing: 1,
  playing: true, speed: 1, zoom: 1, panX: 0, panY: 0,
  shipped: Object.fromEntries(ids.map((id) => [id, baseSpec(id)])), drafts: {},
  revisions: {}, history: Object.fromEntries(ids.map((id) => [id, { undo: [], redo: [] }])),
  variants: {}, shapeMemory: {}, ghost: false, hideSkirt: false,
  landmarks: true, bounds: false, status: '', statusKind: '', frame: 0,
};
let clockStarted = false;
let lastClock = 0;
let activeCancel = null;
let tooltipTimer = null;

const draftOps = (id) => state.drafts[id] || (state.drafts[id] = {});
const dirty = (id = state.hero) => Object.keys(state.drafts[id] || {}).length > 0;
const effective = (id) => {
  const spec = clone(state.shipped[id]);
  for (const [key, op] of Object.entries(state.drafts[id] || {})) {
    if (op.op === 'set') spec[key] = op.value;
    else if (op.op === 'inherit' || op.op === 'unset') delete spec[key];
  }
  return spec;
};
const original = (id) => state.shipped[id];
const options = (id, which) => ({
  spec: which === 'now' ? original(id) : effective(id),
  ...(id === 'rusty' ? { pal: PANDA_PAL } : {}),
});

function currentAction(id = state.hero, which = 'edit') {
  return actionFor(id, which === 'now' ? original(id) : effective(id), state.actionKey);
}

function pose(kind, phase, facing = state.facing, spec = effective(state.hero)) {
  const t = phase / 1.6;
  const extra = kind === 'jump'
    ? { vy: phase < .34 ? -160 : phase > .66 ? 160 : 0, grounded: false }
    : {};
  if (kind === 'walk') kind = 'run';
  if (kind === 'stand') kind = 'idle';
  if (kind === 'attack') {
    const base = pose('run', phase, facing, spec);
    return actionPose(base, currentAction(state.hero, spec === original(state.hero) ? 'now' : 'edit'), phase);
  }
  let slideStyle;
  if (kind === 'slide') {
    const playable = state.hero === 'rusty' || !!HERO_BY_ID[state.hero];
    if (playable && ['humanoid', 'ray'].includes(spec.rig)) slideStyle = 'kick';
  }
  return {
    kind, phase, time: t, vy: extra.vy ?? 0,
    grounded: extra.grounded ?? kind !== 'jump', squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing,
    hideSkirt: state.hideSkirt && kind === 'slide',
    ...(slideStyle ? { slideStyle } : {}), ...extra,
  };
}

function saveDrafts() {
  try {
    localStorage.setItem('mash-character-editor', JSON.stringify({
      v: 2, drafts: state.drafts, revisions: state.revisions, variants: state.variants,
    }));
  } catch { setStatus('local draft storage unavailable', 'err'); }
}

function loadDrafts() {
  try {
    const raw = JSON.parse(localStorage.getItem('mash-character-editor') || 'null');
    if (!raw || raw.v !== 2) return;
    for (const id of ids) {
      const incoming = raw.drafts?.[id] || {};
      for (const [key, op] of Object.entries(incoming)) if (dialByKey(key)) {
        try { state.drafts[id] ||= {}; state.drafts[id][key] = operationFor(key, op); } catch { /* stale local draft */ }
      }
      state.revisions[id] = raw.revisions?.[id] || null;
      state.variants[id] = raw.variants?.[id] || {};
    }
  } catch { setStatus('could not restore local drafts', 'err'); }
}

function setStatus(text, kind = '') {
  state.status = text;
  state.statusKind = kind;
  const el = document.querySelector('.status');
  if (el) { el.textContent = text; el.className = `status ${kind}`; }
}

function pushHistory(id, before, after) {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  const history = state.history[id];
  history.undo.push(clone(before));
  history.redo.length = 0;
  if (history.undo.length > 80) history.undo.shift();
}

function setOperation(key, raw, { commit = true } = {}) {
  const row = dialByKey(key);
  if (!row) return;
  const before = clone(draftOps(state.hero));
  try { draftOps(state.hero)[key] = operationFor(key, raw); }
  catch (error) { setStatus(error.message, 'err'); return; }
  if (commit) pushHistory(state.hero, before, draftOps(state.hero));
  saveDrafts(); render();
}

function resetOperation(key) {
  const before = clone(draftOps(state.hero));
  delete draftOps(state.hero)[key];
  pushHistory(state.hero, before, draftOps(state.hero));
  saveDrafts(); render();
}

function undo() {
  const history = state.history[state.hero];
  if (!history.undo.length) return;
  history.redo.push(clone(draftOps(state.hero)));
  state.drafts[state.hero] = history.undo.pop();
  saveDrafts(); render();
}

function redo() {
  const history = state.history[state.hero];
  if (!history.redo.length) return;
  history.undo.push(clone(draftOps(state.hero)));
  state.drafts[state.hero] = history.redo.pop();
  saveDrafts(); render();
}

function setHero(id) {
  if (!ids.includes(id)) return;
  state.hero = id;
  const actions = actionOptions(id, effective(id));
  state.actionKey = actions[0]?.key || null;
  if (state.mode === 'attack' && !actions.length) state.mode = 'run';
  state.panX = 0; state.panY = 0;
  fetchShipped(id); render();
}

async function fetchShipped(id) {
  try {
    const response = await fetch(`/shipped?hero=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!data.ok) throw new Error(data.errors?.[0] || 'could not read source');
    state.shipped[id] = data.spec;
    state.revisions[id] = data.revision;
    if (!state.actionKey) state.actionKey = actionOptions(id, data.spec)[0]?.key || null;
    render();
  } catch (error) { setStatus(error.message, 'err'); }
}

function setBodyShape(shape) {
  if (!BODY_SHAPES.some((item) => item.value === shape)) return;
  const id = state.hero;
  const current = effective(id);
  if (bodyShapeOf(current) === shape) return;
  const before = clone(draftOps(id));
  if (shape === 'tapered') {
    const remembered = state.shapeMemory[id];
    const value = remembered == null ? 1 : clampDial(dialByKey('taper'), remembered);
    state.drafts[id] ||= {};
    state.drafts[id].taper = { op: 'set', value };
    state.shapeMemory[id] = value;
  } else {
    if (current.taper != null) state.shapeMemory[id] = current.taper;
    state.drafts[id] ||= {};
    state.drafts[id].taper = operationFor('taper', { op: 'unset' });
  }
  pushHistory(id, before, draftOps(id));
  saveDrafts(); render();
}

async function applyToSource() {
  const id = state.hero;
  if (!dirty(id)) { setStatus('no draft changes to apply'); return; }
  const submit = clone(draftOps(id));
  setStatus('applying to source…');
  document.querySelectorAll('[data-save]').forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Character-Editor-Token': TOKEN },
      body: JSON.stringify({ hero: id, baseRevision: state.revisions[id], operations: submit }),
    });
    const data = await response.json();
    if (!data.ok) throw Object.assign(new Error(data.errors?.[0] || 'save refused'), { conflict: data.conflict });
    state.shipped[id] = data.authoritative.spec;
    state.revisions[id] = data.revision;
    delete state.drafts[id];
    state.history[id] = { undo: [], redo: [] };
    saveDrafts();
    setStatus(`applied ${data.changed.length} dial${data.changed.length === 1 ? '' : 's'} to ${data.file}`, 'good');
    render();
  } catch (error) {
    setStatus(error.conflict ? `${error.message}; review or discard this draft` : error.message, 'err');
    render();
  }
}

function variantSave() {
  const name = window.prompt('Variant name');
  if (!name) return;
  state.variants[state.hero] ||= {};
  state.variants[state.hero][name] = { ops: clone(draftOps(state.hero)), revision: state.revisions[state.hero] };
  saveDrafts(); setStatus(`saved local variant “${name}”`, 'good'); render();
}

function variantLoad(name) {
  const variant = state.variants[state.hero]?.[name];
  if (!variant) return;
  const before = clone(draftOps(state.hero));
  state.drafts[state.hero] = clone(variant.ops);
  pushHistory(state.hero, before, state.drafts[state.hero]);
  saveDrafts(); render();
}

function canvasSize(canvas, focused) {
  const rect = canvas.getBoundingClientRect();
  return {
    width: Math.max(1, rect.width || canvas.clientWidth || (focused ? 760 : 320)),
    height: Math.max(1, rect.height || canvas.clientHeight || (focused ? 560 : 230)),
  };
}

function drawCanvas(canvas, id, which, kind, phase, focused = false) {
  const size = canvasSize(canvas, focused);
  const viewport = measureViewport({ width: size.width, height: size.height, dpr: window.devicePixelRatio || 1, zoom: focused ? state.zoom : Math.min(state.zoom, 1.35) });
  canvas.dataset.drawH = String(viewport.drawH);
  canvas.dataset.viewportW = String(viewport.cssW);
  canvas.dataset.viewportH = String(viewport.cssH);
  canvas.dataset.density = String(viewport.density);
  if (canvas.width !== viewport.backingW) canvas.width = viewport.backingW;
  if (canvas.height !== viewport.backingH) canvas.height = viewport.backingH;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(viewport.backingW / viewport.cssW, 0, 0, viewport.backingH / viewport.cssH, 0, 0);
  ctx.clearRect(0, 0, viewport.cssW, viewport.cssH);
  ctx.imageSmoothingEnabled = false;
  setInkDensity(viewport.density);
  const x = viewport.cssW * .5 + (focused ? state.panX : 0);
  const feet = viewport.cssH - (focused ? 24 : 14) + (focused ? state.panY : 0);
  const previewKind = kind === 'stand' ? 'idle' : kind;
  const spec = which === 'now' ? original(id) : effective(id);
  const poseData = pose(previewKind, phase, state.facing, spec);
  try {
    if (focused && state.ghost) {
      ctx.save(); ctx.globalAlpha = .28;
      drawToon(ctx, id, pose(previewKind, phase, state.facing, original(id)), x, feet, viewport.drawH, options(id, 'now'));
      ctx.restore();
    }
    drawToon(ctx, id, poseData, x, feet, viewport.drawH, options(id, which));
  } finally { setInkDensity(); }
  if (focused && state.landmarks) drawGuides(ctx, viewport.cssW, viewport.cssH, spec, viewport.drawH, x, feet);
  if (focused && state.ghost) {
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#f6d33c';
    ctx.strokeRect(x - viewport.drawH * .55, 18, viewport.drawH * 1.1, viewport.cssH - 42); ctx.restore();
  }
}

function drawGuides(ctx, width, height, spec, drawH, x = width * .5, feet = height - 24) {
  ctx.save(); ctx.strokeStyle = 'rgba(246,211,60,.45)'; ctx.fillStyle = '#f6d33c'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(8, feet); ctx.lineTo(width - 8, feet); ctx.stroke();
  const torsoW = 42 * drawH / 112 * (spec.torsoWidth || 1);
  const shoulderY = feet - drawH * .58 - (spec.armLift || 0) * drawH;
  const points = [
    ['shoulder', x + torsoW + (spec.armOut || 0) * drawH, shoulderY],
    ['torso top', x, shoulderY - drawH * .22],
    ['body bottom', x, shoulderY + drawH * .25 + (spec.torsoDrop || 0) * drawH],
    ['near hip', x + drawH * .21 + (spec.legShiftRoot || 0) * drawH, feet - drawH * .4],
  ];
  for (const [name, px, py] of points) { ctx.fillRect(px - 3, py - 3, 6, 6); ctx.fillText(name, px + 6, py - 4); }
  if (state.bounds) { ctx.strokeStyle = '#e66767'; ctx.strokeRect(x - drawH * .55, 18, drawH * 1.1, height - 42); }
  ctx.restore();
}

function handlePoints(canvas) {
  const rect = canvas.getBoundingClientRect(); const spec = effective(state.hero);
  const drawH = Number(canvas.dataset.drawH) || Math.min(rect.width, rect.height);
  const x = rect.width * .5 + state.panX; const feet = rect.height - 24 + state.panY;
  const shoulderY = feet - drawH * .58 - (spec.armLift || 0) * drawH;
  return [
    { key: 'torsoWidth', x: x + 42 * drawH / 112 * (spec.torsoWidth || 1), y: shoulderY },
    { key: 'torsoLong', x, y: shoulderY - drawH * .22 },
    { key: 'torsoDrop', x, y: shoulderY + drawH * .25 + (spec.torsoDrop || 0) * drawH },
    { key: 'legShiftRoot', x: x + drawH * .21 + (spec.legShiftRoot || 0) * drawH, y: feet - drawH * .4 },
  ];
}

function handleDrag(canvas, event, handle) {
  const rect = canvas.getBoundingClientRect(); const sx = event.clientX - rect.left; const sy = event.clientY - rect.top;
  const start = currentValue(handle.key); const before = clone(draftOps(state.hero));
  const onMove = (moveEvent) => {
    const pxX = moveEvent.clientX - rect.left - sx; const pxY = moveEvent.clientY - rect.top - sy; const unit = Number(canvas.dataset.drawH) || 112;
    const scale = handle.key === 'torsoWidth' ? pxX / (unit * .45) : handle.key === 'legShiftRoot' ? pxX / unit : handle.key === 'torsoLong' ? -pxY / unit : pxY / unit;
    try { draftOps(state.hero)[handle.key] = { op: 'set', value: clampDial(dialByKey(handle.key), start + scale) }; saveDrafts(); renderPreviewOnly(); }
    catch (error) { setStatus(error.message, 'err'); }
  };
  const finish = (cancelled) => {
    canvas.releasePointerCapture?.(event.pointerId); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); activeCancel = null;
    if (cancelled) state.drafts[state.hero] = before; else pushHistory(state.hero, before, draftOps(state.hero)); saveDrafts(); render();
  };
  const onUp = () => finish(false); activeCancel = () => finish(true); canvas.setPointerCapture?.(event.pointerId);
  document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}

function currentValue(key) { const op = draftOps(state.hero)[key]; return op?.op === 'set' ? op.value : (effective(state.hero)[key] ?? dialByKey(key).default ?? 0); }

function showTooltip(text, target = null) {
  const layer = document.querySelector('#tooltip-layer'); if (!layer) return;
  window.clearTimeout(tooltipTimer); layer.textContent = text; layer.classList.add('show');
  if (target) { const rect = target.getBoundingClientRect(); layer.style.left = `${Math.max(8, Math.min(window.innerWidth - 300, rect.left))}px`; layer.style.top = `${Math.min(window.innerHeight - 72, rect.bottom + 7)}px`; }
}
function hideTooltip() { document.querySelector('#tooltip-layer')?.classList.remove('show'); }
function helpButton(text, label = 'Explain this control') {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'help'; button.textContent = '?'; button.setAttribute('aria-label', label); button.title = text;
  button.onmouseenter = () => showTooltip(text, button); button.onmouseleave = () => { tooltipTimer = window.setTimeout(hideTooltip, 120); }; button.onfocus = () => showTooltip(text, button); button.onblur = hideTooltip; button.onclick = (event) => { event.stopPropagation(); showTooltip(text, button); };
  return button;
}
function controlLabel(text, helpText, htmlFor = '') { const label = document.createElement('label'); label.className = 'control-label'; label.textContent = text; if (htmlFor) label.htmlFor = htmlFor; label.append(helpButton(helpText, `${text}: explain`)); return label; }

function renderControls() {
  const wrap = document.createElement('div'); wrap.className = 'card dial-card'; const spec = effective(state.hero);
  const shapeSection = document.createElement('section'); shapeSection.className = 'group shape-group'; const shapeHeading = document.createElement('h2'); shapeHeading.textContent = 'BODY SHAPE'; shapeSection.append(shapeHeading);
  const shapeRow = document.createElement('div'); shapeRow.className = 'row shape-row'; shapeRow.append(controlLabel('profile', 'Choose Round when the torso should stay full at the waist. Choose Tapered to unlock waist and shoulder-corner controls.'));
  const shape = document.createElement('select'); shape.id = 'body-shape'; shape.dataset.control = 'body-shape';
  for (const item of BODY_SHAPES) { const option = document.createElement('option'); option.value = item.value; option.textContent = item.label; option.selected = item.value === bodyShapeOf(spec); shape.append(option); }
  shape.onchange = () => setBodyShape(shape.value); shapeRow.append(shape); shapeSection.append(shapeRow); wrap.append(shapeSection);
  for (const group of BODY_GROUPS) {
    const section = document.createElement('section'); section.className = `group group-${group.key}`; const heading = document.createElement('h2'); heading.textContent = group.label; section.append(heading);
    for (const row of HERO_DIALS.filter((item) => item.group === group.key)) {
      const op = draftOps(state.hero)[row.key]; const value = effective(state.hero)[row.key] ?? row.default; const applicability = dialApplicability(row, spec, { mode: state.mode }); const active = applicability.active;
      const rowElement = document.createElement('div'); rowElement.className = `row dial-row ${active ? '' : 'off'}`; rowElement.dataset.dial = row.key; const id = `dial-${row.key}`;
      rowElement.append(controlLabel(row.label, `${row.help}${active ? '' : ` ${applicability.reason}.`}`, id));
      if (row.kind === 'enum') {
        const select = document.createElement('select'); select.id = id; select.dataset.dialInput = row.key; select.disabled = !active;
        for (const item of row.values) { const option = document.createElement('option'); option.value = String(item); option.textContent = item === 1 ? 'outer' : item === -1 ? 'inner' : item === 0 ? 'none' : item; option.selected = Object.is(item, value); select.append(option); }
        select.onchange = () => setOperation(row.key, typeof row.values[0] === 'number' ? Number(select.value) : select.value); rowElement.append(select);
      } else {
        const range = document.createElement('input'); range.id = id; range.type = 'range'; range.min = row.min; range.max = row.max; range.step = row.step; range.value = value == null ? row.min : value; range.disabled = !active; range.dataset.dialInput = row.key;
        const number = document.createElement('input'); number.type = 'number'; number.min = row.min; number.max = row.max; number.step = row.step; number.value = value == null ? '' : value; number.disabled = !active; number.dataset.dialNumber = row.key;
        let start;
        const begin = () => { if (!start) start = clone(draftOps(state.hero)); }; const end = () => { if (start) pushHistory(state.hero, start, draftOps(state.hero)); start = null; saveDrafts(); };
        const change = (raw) => { try { const next = clampDial(row, Number(raw)); range.value = next; number.value = next; draftOps(state.hero)[row.key] = { op: 'set', value: next }; saveDrafts(); renderPreviewOnly(); } catch (error) { setStatus(error.message, 'err'); } };
        range.onpointerdown = begin; range.onpointerup = end; range.onfocus = begin; range.onblur = end; range.oninput = () => change(range.value); number.onfocus = begin; number.onchange = () => { change(number.value); end(); };
        const inputs = document.createElement('div'); inputs.className = 'dial-inputs'; inputs.append(range, number); rowElement.append(inputs);
      }
      const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'reset'; reset.textContent = op ? '×' : ''; reset.setAttribute('aria-label', `Reset ${row.label}`); reset.title = 'Reset to saved value'; reset.onclick = () => resetOperation(row.key);
      const inherited = document.createElement('button'); inherited.type = 'button'; inherited.className = 'reset'; inherited.textContent = '↗'; inherited.setAttribute('aria-label', `Use renderer default for ${row.label}`); inherited.title = 'Use inherited value or renderer fallback'; inherited.onclick = () => setOperation(row.key, { op: row.key === 'taper' || row.key === 'shoulderSoft' ? 'unset' : 'inherit' }); rowElement.append(reset, inherited);
      const note = document.createElement('small'); note.textContent = `${row.note || ''}${active ? '' : ` · ${applicability.reason}`}`; rowElement.append(note); section.append(rowElement);
    }
    wrap.append(section);
  }
  return wrap;
}

function renderPreviewOnly() {
  document.querySelectorAll('canvas[data-draw]').forEach((canvas) => { canvas.dataset.phase = state.phase; drawCanvas(canvas, state.hero, canvas.dataset.which, canvas.dataset.kind, state.phase, canvas.dataset.focused === '1'); });
  const phase = document.querySelector('.phase-range'); if (phase) phase.value = state.phase; const zoom = document.querySelector('.zoom-range'); if (zoom) zoom.value = state.zoom;
  const actionTime = document.querySelector('.action-time'); const action = currentAction(); if (actionTime && action) actionTime.textContent = `${(state.phase * action.duration).toFixed(2)}s / ${action.duration.toFixed(2)}s`;
  updateHeader();
}
function startClock() {
  if (clockStarted || typeof requestAnimationFrame !== 'function') return; clockStarted = true; lastClock = performance.now();
  const tick = (now) => { const delta = Math.min(.1, Math.max(0, (now - lastClock) / 1000)); lastClock = now; if (state.playing) { state.phase = (state.phase + delta * .65 * state.speed) % 1; renderPreviewOnly(); } requestAnimationFrame(tick); }; requestAnimationFrame(tick);
}
function updateHeader() { const badge = document.querySelector('.dirty-badge'); if (badge) { badge.textContent = dirty() ? 'DRAFT' : 'SAVED'; badge.className = `badge dirty-badge ${dirty() ? 'dirty' : ''}`; } const status = document.querySelector('.status'); if (status) { status.textContent = state.status; status.className = `status ${state.statusKind}`; } }
function addLabeledControl(parent, text, helpText, control) { const label = document.createElement('span'); label.className = 'toolbar-label'; label.textContent = text; label.append(helpButton(helpText, `${text}: explain`)); parent.append(label, control); }
function makeCanvas(kind, which, focused = false) { const canvas = document.createElement('canvas'); canvas.dataset.draw = '1'; canvas.dataset.which = which; canvas.dataset.kind = kind; canvas.dataset.phase = state.phase; if (focused) { canvas.dataset.focused = '1'; canvas.className = 'focus'; canvas.setAttribute('aria-label', 'Edited character preview. Drag yellow handles to adjust body controls.'); } return canvas; }
function installFocusDrag(canvas) { canvas.onpointerdown = (event) => { const rect = canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; const hit = handlePoints(canvas).map((point) => ({ ...point, distance: Math.hypot(point.x - x, point.y - y) })).sort((a, b) => a.distance - b.distance)[0]; if (!hit || hit.distance > 24) return; handleDrag(canvas, event, hit); }; }

function render() {
  const app = document.querySelector('#app'); app.innerHTML = '';
  const header = document.createElement('header'); const title = document.createElement('h1'); title.textContent = 'CHARACTER BODY EDITOR'; header.append(title); const badge = document.createElement('span'); badge.className = 'badge dirty-badge'; header.append(badge); const grow = document.createElement('span'); grow.className = 'grow'; header.append(grow);
  for (const [text, action] of [['UNDO', undo], ['REDO', redo], ['SAVE VARIANT', variantSave]]) { const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.textContent = text; button.onclick = action; header.append(button); }
  const apply = document.createElement('button'); apply.type = 'button'; apply.dataset.save = '1'; apply.className = 'btn primary'; apply.textContent = 'APPLY TO SOURCE'; apply.disabled = !dirty(); apply.onclick = applyToSource; header.append(apply); app.append(header);
  const main = document.createElement('main'); const left = document.createElement('aside'); left.className = 'rail left';
  for (const id of ids) { const button = document.createElement('button'); button.type = 'button'; button.className = `hero ${id === state.hero ? 'sel' : ''}`; const name = document.createElement('span'); name.textContent = labels[id]; const mark = document.createElement('small'); mark.textContent = dirty(id) ? '●' : ''; button.append(name, mark); button.onclick = () => setHero(id); left.append(button); } main.append(left);
  const middle = document.createElement('section'); middle.className = 'middle'; const info = document.createElement('div'); info.className = 'card'; const infoHeading = document.createElement('h2'); infoHeading.textContent = `${labels[state.hero].toUpperCase()} · BODY DIALS`; info.append(infoHeading); middle.append(info, renderControls());
  const actions = document.createElement('div'); actions.className = 'card toolbar'; const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn'; reset.textContent = 'RESET DRAFT'; reset.onclick = () => { const before = clone(draftOps(state.hero)); delete state.drafts[state.hero]; pushHistory(state.hero, before, {}); saveDrafts(); render(); }; actions.append(reset);
  const variantSelect = document.createElement('select'); variantSelect.dataset.control = 'variant'; const first = document.createElement('option'); first.value = ''; first.textContent = 'LOAD VARIANT…'; variantSelect.append(first); for (const name of Object.keys(state.variants[state.hero] || {})) { const option = document.createElement('option'); option.value = name; option.textContent = name; variantSelect.append(option); } variantSelect.onchange = () => variantLoad(variantSelect.value); actions.append(variantSelect); middle.append(actions);
  const status = document.createElement('div'); status.className = `status ${state.statusKind}`; status.textContent = state.status; middle.append(status); main.append(middle);
  const preview = document.createElement('section'); preview.className = 'preview'; const controls = document.createElement('div'); controls.className = 'controls'; const poseSelect = document.createElement('select'); poseSelect.dataset.control = 'pose'; const poseKinds = [...BASE_POSES, 'attack']; const supportedActions = actionOptions(state.hero, effective(state.hero)); for (const kind of poseKinds) { const option = document.createElement('option'); option.value = kind; option.textContent = kind === 'attack' ? 'shoot / attack' : kind; option.selected = kind === state.mode; if (kind === 'attack' && !supportedActions.length) { option.disabled = true; option.title = 'No attack animation for this character'; } poseSelect.append(option); } addLabeledControl(controls, 'POSE', state.mode === 'attack' ? EDITOR_HELP.attack : EDITOR_HELP.pose, poseSelect); poseSelect.onchange = () => { state.mode = poseSelect.value; state.playing = state.mode !== 'attack'; render(); };
  if (state.mode === 'attack' && supportedActions.length) { const actionSelect = document.createElement('select'); actionSelect.dataset.control = 'action'; for (const item of supportedActions) { const option = document.createElement('option'); option.value = item.key; option.textContent = item.label; option.selected = item.key === state.actionKey; actionSelect.append(option); } addLabeledControl(controls, 'ACTION', EDITOR_HELP.action, actionSelect); actionSelect.onchange = () => { state.actionKey = actionSelect.value; renderPreviewOnly(); }; const actionTime = document.createElement('span'); actionTime.className = 'action-time'; controls.append(actionTime); }
  const play = document.createElement('button'); play.type = 'button'; play.className = 'btn'; play.textContent = state.playing ? 'PAUSE' : 'PLAY'; play.title = EDITOR_HELP.play; play.onclick = () => { state.playing = !state.playing; render(); }; controls.append(play);
  const speed = document.createElement('select'); for (const value of [.5, 1, 2]) { const option = document.createElement('option'); option.value = value; option.textContent = `${value}×`; option.selected = value === state.speed; speed.append(option); } addLabeledControl(controls, 'SPEED', EDITOR_HELP.speed, speed); speed.onchange = () => { state.speed = Number(speed.value); };
  const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'btn'; previous.textContent = '‹'; previous.title = 'Previous frame'; previous.onclick = () => { state.playing = false; state.phase = (state.phase - .05 + 1) % 1; renderPreviewOnly(); }; const next = document.createElement('button'); next.type = 'button'; next.className = 'btn'; next.textContent = '›'; next.title = 'Next frame'; next.onclick = () => { state.playing = false; state.phase = (state.phase + .05) % 1; renderPreviewOnly(); }; controls.append(previous, next);
  const phase = document.createElement('input'); phase.className = 'phase-range'; phase.type = 'range'; phase.min = 0; phase.max = 1; phase.step = .01; phase.value = state.phase; phase.setAttribute('aria-label', EDITOR_HELP.timeline); phase.oninput = () => { state.playing = false; state.phase = Number(phase.value); renderPreviewOnly(); }; addLabeledControl(controls, 'TIMELINE', EDITOR_HELP.timeline, phase);
  const facing = document.createElement('button'); facing.type = 'button'; facing.className = 'btn'; facing.textContent = state.facing === 1 ? 'FACING →' : 'FACING ←'; facing.title = EDITOR_HELP.facing; facing.onclick = () => { state.facing *= -1; renderPreviewOnly(); }; controls.append(facing);
  const zoom = document.createElement('input'); zoom.className = 'zoom-range'; zoom.type = 'range'; zoom.min = .75; zoom.max = 2.5; zoom.step = .05; zoom.value = state.zoom; zoom.setAttribute('aria-label', EDITOR_HELP.zoom); zoom.oninput = () => { state.zoom = Number(zoom.value); renderPreviewOnly(); }; addLabeledControl(controls, 'ZOOM', EDITOR_HELP.zoom, zoom);
  const fit = document.createElement('button'); fit.type = 'button'; fit.className = 'btn'; fit.textContent = 'FIT'; fit.title = EDITOR_HELP.fit; fit.onclick = () => { state.zoom = 1; state.panX = 0; state.panY = 0; renderPreviewOnly(); }; controls.append(fit); preview.append(controls);
  const toggles = document.createElement('div'); toggles.className = 'card toggles'; for (const [key, label, help] of [['ghost', 'original ghost', EDITOR_HELP.ghost], ['hideSkirt', 'hide skirts on slide · preview only', EDITOR_HELP.hideSkirt], ['landmarks', 'body handles', EDITOR_HELP.landmarks], ['bounds', 'preview frame', EDITOR_HELP.bounds]]) { const labelElement = document.createElement('label'); labelElement.className = 'check'; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = state[key]; checkbox.dataset.toggle = key; checkbox.onchange = () => { state[key] = checkbox.checked; renderPreviewOnly(); }; labelElement.append(checkbox, document.createTextNode(label), helpButton(help, `${label}: explain`)); toggles.append(labelElement); } preview.append(toggles);
  const focusFrame = document.createElement('div'); focusFrame.className = 'canvas-frame focus-frame'; const focus = makeCanvas(state.mode, 'edit', true); focus.title = 'Drag a yellow handle when it is visible'; installFocusDrag(focus); focusFrame.append(focus); preview.append(focusFrame);
  const sheet = document.createElement('div'); sheet.className = 'sheet'; const sheetKinds = [...BASE_POSES]; if (supportedActions.length) sheetKinds.push('attack'); for (const kind of sheetKinds) { const card = document.createElement('div'); card.className = 'posecard'; card.dataset.pose = kind; const heading = document.createElement('h3'); heading.textContent = kind === 'attack' ? 'SHOOT / ATTACK' : kind.toUpperCase(); card.append(heading); const pair = document.createElement('div'); pair.className = 'pair'; for (const which of ['now', 'edit']) { const frame = document.createElement('div'); frame.className = 'canvas-frame pair-frame'; frame.append(makeCanvas(kind, which)); pair.append(frame); } card.append(pair); const caption = document.createElement('div'); caption.className = 'caption'; caption.innerHTML = '<span>NOW</span><span>EDIT</span>'; card.append(caption); sheet.append(card); } preview.append(sheet);
  const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Yellow handles are quick visual controls; the grouped sliders and numbers remain exact. Round/Tapered changes which body controls are applicable. Hide skirts affects the slide preview only and is never included in drafts, variants, or source saves. Attack uses the character’s existing painter action. Apply to source is the only write to a hero spec.'; preview.append(hint); main.append(preview); app.append(main);
  const tooltip = document.createElement('div'); tooltip.id = 'tooltip-layer'; tooltip.setAttribute('role', 'tooltip'); tooltip.onmouseenter = () => window.clearTimeout(tooltipTimer); tooltip.onmouseleave = hideTooltip; app.append(tooltip); updateHeader(); renderPreviewOnly();
}

function installViewportObserver() { if (typeof ResizeObserver !== 'function') return; const observer = new ResizeObserver(() => renderPreviewOnly()); observer.observe(document.querySelector('#app') || document.body); }
window.addEventListener('keydown', (event) => { if (event.key === 'Escape') { hideTooltip(); if (activeCancel) { event.preventDefault(); activeCancel(); } } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); applyToSource(); } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); } else if (event.key === 'ArrowLeft') { state.phase = Math.max(0, state.phase - .05); renderPreviewOnly(); } else if (event.key === 'ArrowRight') { state.phase = Math.min(1, state.phase + .05); renderPreviewOnly(); } });
window.addEventListener('resize', () => renderPreviewOnly());
window.addEventListener('click', (event) => { if (!event.target.closest('.help') && !event.target.closest('#tooltip-layer')) hideTooltip(); });
window.addEventListener('beforeunload', (event) => { if (ids.some(dirty)) { event.preventDefault(); event.returnValue = ''; } });
loadDrafts();
window.characterEditor = {
  hero: setHero, setDial: (key, value) => setOperation(key, value),
  setMode: (mode) => { if (BASE_POSES.includes(mode) || (mode === 'attack' && actionOptions(state.hero, effective(state.hero)).length)) { state.mode = mode; render(); } },
  setAction: (key) => { state.actionKey = key; renderPreviewOnly(); }, setBodyShape,
  freeze: (time = .18) => { state.playing = false; state.phase = time; renderPreviewOnly(); },
  viewport: () => ({ zoom: state.zoom, width: document.querySelector('.focus')?.dataset.viewportW, height: document.querySelector('.focus')?.dataset.viewportH, drawH: document.querySelector('.focus')?.dataset.drawH }),
  pixels: (poseName, which) => { const canvas = [...document.querySelectorAll('canvas[data-draw]')].find((item) => item.dataset.kind === poseName && item.dataset.which === which) || document.querySelector('canvas.focus'); return canvas?.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data || new Uint8ClampedArray(); },
};
render(); installViewportObserver(); startClock(); if (location.protocol === 'http:' || location.protocol === 'https:') fetchShipped(state.hero);
