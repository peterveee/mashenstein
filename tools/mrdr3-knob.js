// Standalone-compatible copy of the shared editor knob contract. The mixer supplies its
// richer desk implementation; this keeps the same geometry, nonlinear response, type-in,
// reset, shift-drag and `{ wrap, label, set }` surface without importing mixer state.

export function createKnob({
  min, max, step, value, fmt, onInput, reset, scale = 1, origin = null,
  taper = null, floor = 0, onStart, onEnd,
}) {
  const NS = 'http://www.w3.org/2000/svg';
  const wrap = document.createElement('div'); wrap.className = 'row potrow';
  const label = document.createElement('span'); label.className = 'k';
  const holder = document.createElement('div'); holder.className = 'panholder';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'panpot vepot');
  const track = document.createElementNS(NS, 'path'); track.setAttribute('class', 'pottrack');
  const arc = document.createElementNS(NS, 'path'); arc.setAttribute('class', 'potarc');
  const face = document.createElementNS(NS, 'circle'); face.setAttribute('cx', 22); face.setAttribute('cy', 22);
  face.setAttribute('r', 13); face.setAttribute('class', 'potface');
  const text = document.createElementNS(NS, 'text'); text.setAttribute('x', 22); text.setAttribute('y', 22);
  text.setAttribute('text-anchor', 'middle'); text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('class', 'pottext');
  svg.append(track, arc, face, text); holder.append(svg); wrap.append(label, holder);

  const clamp = (x) => Math.max(min, Math.min(max, x));
  const clampPos = (x) => Math.max(0, Math.min(1, x));
  const curve = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const bipolar = Number.isFinite(origin) && curve !== 1;
  // The desk's log taper for time, kept identical here — see `knob` in mixer-entry.js.
  const logTaper = taper === 'log' && max > 0;
  const logLo = logTaper ? Math.max(min, floor > 0 ? floor : step, 1e-6) : 0;
  const logSpan = logTaper ? Math.log(max / logLo) : 0;
  const originFrac = (max - min) ? clampPos((origin - min) / (max - min)) : 0;
  const valueAt = (position) => {
    const pos = clampPos(position);
    if (logTaper) return pos <= 0 ? min : logLo * Math.exp(logSpan * pos);
    if (!bipolar) return min + (max - min) * Math.pow(pos, curve);
    if (pos >= originFrac) {
      const f = originFrac >= 1 ? 0 : (pos - originFrac) / (1 - originFrac);
      return origin + (max - origin) * Math.pow(f, curve);
    }
    const f = originFrac <= 0 ? 0 : (originFrac - pos) / originFrac;
    return origin - (origin - min) * Math.pow(f, curve);
  };
  const positionAt = (x) => {
    if (logTaper) {
      const t = clamp(x);
      return t <= logLo ? 0 : clampPos(Math.log(t / logLo) / logSpan);
    }
    if (!bipolar) {
      const frac = (max - min) ? clampPos((x - min) / (max - min)) : 0;
      return Math.pow(frac, 1 / curve);
    }
    const v = clamp(x);
    if (v >= origin) {
      const span = max - origin;
      return originFrac + (1 - originFrac) * Math.pow(span > 0 ? (v - origin) / span : 0, 1 / curve);
    }
    const span = origin - min;
    return originFrac - originFrac * Math.pow(span > 0 ? (origin - v) / span : 0, 1 / curve);
  };
  const SWEEP = 145;
  const point = (deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [22 + Math.cos(a) * 18, 22 + Math.sin(a) * 18];
  };
  const arcPath = (from, to) => {
    const [x1, y1] = point(from); const [x2, y2] = point(to);
    const big = Math.abs(to - from) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A 18 18 0 ${big} ${to > from ? 1 : 0} ${x2} ${y2}`;
  };
  track.setAttribute('d', arcPath(-SWEEP, SWEEP));
  const originPos = Number.isFinite(origin) ? positionAt(clamp(origin)) : 0;
  const originDeg = -SWEEP + originPos * SWEEP * 2;
  let current = clamp(Number(value));
  let position = positionAt(current);
  let dragging = false;
  let fromText = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let dragPosition = 0;

  const draw = () => {
    const deg = -SWEEP + position * SWEEP * 2;
    arc.setAttribute('d', Math.abs(position - originPos) < 0.004 ? '' : arcPath(originDeg, deg));
    text.textContent = fmt(current);
  };
  const write = (next) => {
    onStart?.();
    const stepped = Math.round(Number(next) / step) * step;
    current = clamp(Number(stepped.toFixed(6)));
    position = positionAt(current);
    draw(); onInput(current);
    if (!dragging) onEnd?.();
  };
  const setPosition = (next) => write(valueAt(next));
  svg.addEventListener('pointerdown', (event) => {
    if (holder.querySelector('.typein')) return;
    dragging = true; moved = 0; fromText = event.target === text;
    dragPosition = position;
    lastX = event.clientX; lastY = event.clientY; onStart?.();
    try { svg.setPointerCapture(event.pointerId); } catch { /* no capture in a test DOM */ }
    event.preventDefault();
  });
  svg.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = lastY - event.clientY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    lastX = event.clientX; lastY = event.clientY;
    const px = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    const amount = (px / 150) * (event.shiftKey ? 0.2 : 1);
    dragPosition = clampPos(dragPosition + amount);
    setPosition(dragPosition);
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false; onEnd?.();
    if (fromText && moved < 3) openEditor();
  };
  svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
  svg.addEventListener('dblclick', () => write(reset));
  const openEditor = () => {
    if (holder.querySelector('.typein')) return;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'typein panin'; input.value = String(current);
    holder.append(input); input.focus(); input.select();
    let closed = false;
    const done = (commit) => {
      if (closed) return;
      closed = true;
      const n = parseFloat(input.value);
      input.remove();
      if (commit && Number.isFinite(n)) write(n);
    };
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') done(true); else if (event.key === 'Escape') done(false);
    });
    input.addEventListener('blur', () => done(true));
  };
  label.classList.add('resettable'); label.title = `Reset to ${fmt(reset)}`;
  label.onclick = () => write(reset);
  draw();
  return {
    wrap, label,
    set(x) { current = clamp(Number(x)); position = positionAt(current); draw(); },
  };
}
