// Gallery-only MCGFN-1 terminal studies. These are not hub art and are not
// registered anywhere; the gallery supplies the current socket as the control.

const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

function rr(ctx, x, y, w, h, r, fill, stroke = null, line = 1) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}

function label(ctx, text, x, y, size, color = '#d9d5c8', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${size}px ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function header(ctx, x, y, w, text = 'MCGFN-1') {
  rr(ctx, x, y, w, 10, 2, '#252a31', '#515862', 0.7);
  label(ctx, text, x + w / 2, y + 5.2, 5, '#e0b75a', 'center');
}

function centralSocket(ctx, cx, cy, r, lit = 0) {
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#6d7377';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#080b10';
  ctx.fill();
  ctx.fillStyle = '#151b21';
  ctx.fillRect(cx - r * 0.38, cy - r * 0.48, r * 0.2, r * 0.58);
  ctx.fillRect(cx + r * 0.18, cy - r * 0.48, r * 0.2, r * 0.58);
  if (lit > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + lit * 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#e0a84a';
    ctx.fill();
    ctx.restore();
  }
}

function roundTypeBSocket(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#c8c9c3';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f1f0e9';
  ctx.fill();
  ctx.fillStyle = '#090b0e';
  rr(ctx, cx - r * 0.38, cy - r * 0.42, r * 0.2, r * 0.52, r * 0.08, '#090b0e');
  rr(ctx, cx + r * 0.18, cy - r * 0.42, r * 0.2, r * 0.52, r * 0.08, '#090b0e');
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.18, cy + r * 0.42);
  ctx.lineTo(cx + r * 0.18, cy + r * 0.42);
  ctx.arc(cx, cy + r * 0.42, r * 0.18, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
}

function progressCells(ctx, x, y, w, h, progress, columns, rows, active = '#d99b3f') {
  const count = columns * rows;
  const filled = Math.round(clamp(progress) * count);
  const gap = Math.max(1, w * 0.025);
  const cw = (w - gap * (columns - 1)) / columns;
  const ch = (h - gap * (rows - 1)) / rows;
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const on = i < filled;
    rr(ctx, x + col * (cw + gap), y + row * (ch + gap), cw, ch, Math.min(1.5, ch / 3),
      on ? active : '#20262c', on ? '#f1c56a' : '#3e464d', 0.45);
  }
}

function physicalPlugBank(ctx, x, y, w, h, progress, color = '#e3d39a', rows = 1, columnCount = null) {
  const columns = columnCount || (rows > 1 ? 3 : 6);
  const count = columns * rows;
  const filled = Math.round(clamp(progress) * count);
  const gapX = Math.max(0.8, w * 0.03);
  const gapY = Math.max(0.6, h * 0.05);
  const bw = (w - gapX * (columns - 1)) / columns;
  const cellH = (h - gapY * (rows - 1)) / rows;
  const square = Math.min(bw * 0.76, cellH * 0.78);
  for (let i = 0; i < count; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const bx = x + col * (bw + gapX);
    const by = y + row * (cellH + gapY);
    const squareX = bx + (bw - square) / 2;
    const squareY = by + (cellH - square) / 2;
    const active = i < filled;
    rr(ctx, squareX, squareY, square, square, 0.8,
      active ? color : '#24262a', active ? color : '#24262a', 0.4);
  }
}

function counter(ctx, x, y, w, count) {
  rr(ctx, x, y, w, 12, 2, '#080b0f', '#657078', 0.8);
  label(ctx, String(count).padStart(2, '0') + ' / 81', x + w / 2, y + 6, 6, '#f0c96f', 'center');
}

function terminal(ctx, x, y, w, h, progress, t) {
  const p = clamp(progress);
  rr(ctx, x + w * 0.08, y + h * 0.03, w * 0.84, h * 0.94, 5, '#242a30', '#747a7e', 1);
  rr(ctx, x + w * 0.15, y + h * 0.12, w * 0.7, h * 0.76, 3, '#11161b', '#3b444a', 0.7);
  header(ctx, x + w * 0.2, y + h * 0.16, w * 0.6);
  centralSocket(ctx, x + w / 2, y + h * 0.42, Math.min(w, h) * 0.13, p);
  const pulse = 0.65 + 0.35 * Math.sin(t * 4.2);
  physicalPlugBank(ctx, x + w * 0.24, y + h * 0.59, w * 0.52, h * 0.15, p,
    `#${Math.round(165 + pulse * 35).toString(16)}a34b`);
  counter(ctx, x + w * 0.24, y + h * 0.79, w * 0.52, Math.round(p * 81));
}

function manifold(ctx, x, y, w, h, progress, t) {
  const p = clamp(progress);
  rr(ctx, x + w * 0.04, y + h * 0.2, w * 0.92, h * 0.63, 4, '#252b31', '#777b7d', 1);
  header(ctx, x + w * 0.16, y + h * 0.24, w * 0.68);
  centralSocket(ctx, x + w * 0.27, y + h * 0.55, Math.min(w, h) * 0.13, p);
  ctx.fillStyle = '#515960';
  ctx.fillRect(x + w * 0.44, y + h * 0.4, w * 0.04, h * 0.3);
  physicalPlugBank(ctx, x + w * 0.49, y + h * 0.42, w * 0.35, h * 0.17, p,
    '#a9bd74');
  counter(ctx, x + w * 0.22, y + h * 0.7, w * 0.56, Math.round(p * 81));
  label(ctx, 'PLUG BANK', x + w / 2, y + h * 0.91, 4.5, '#9da6a8', 'center');
  if (p > 0) {
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 3);
    ctx.fillStyle = '#dce99a';
    ctx.fillRect(x + w * 0.51, y + h * 0.4, w * 0.31 * p, h * 0.3);
    ctx.restore();
  }
}

function consoleUnit(ctx, x, y, w, h, progress, t) {
  const p = clamp(progress);
  rr(ctx, x + w * 0.06, y + h * 0.08, w * 0.88, h * 0.82, 5, '#303238', '#9a8c70', 1);
  rr(ctx, x + w * 0.14, y + h * 0.16, w * 0.72, h * 0.55, 3, '#171a20', '#565a60', 0.8);
  header(ctx, x + w * 0.2, y + h * 0.2, w * 0.6);
  centralSocket(ctx, x + w * 0.5, y + h * 0.47, Math.min(w, h) * 0.14, p);
  physicalPlugBank(ctx, x + w * 0.22, y + h * 0.64, w * 0.56, h * 0.12, p, '#cf9b42');
  counter(ctx, x + w * 0.23, y + h * 0.75, w * 0.54, Math.round(p * 81));
  label(ctx, p >= 1 ? 'READY' : 'RECOVERING', x + w / 2, y + h * 0.86, 4.5,
    p >= 1 ? '#b7d67d' : '#b6a47d', 'center');
  if (p > 0 && Math.sin(t * 5.1) > 0.45) {
    ctx.fillStyle = '#e6c568';
    ctx.fillRect(x + w * 0.78, y + h * 0.28, 2, 2);
  }
}

function yellowCore(ctx, x, y, w, h, progress, activeColor) {
  const p = clamp(progress);
  const bodyY = y + h * 0.07;
  const bodyH = h * 0.9;
  rr(ctx, x, bodyY, w, bodyH, 5, '#d5b52f', '#71777a', 1);
  label(ctx, 'MCGFN-1', x + w * 0.08, bodyY + h * 0.13, 4.8, '#171a1e', 'left');
  const socketX = x + w * 0.26, socketY = bodyY + h * 0.52, socketR = h * 0.24;
  roundTypeBSocket(ctx, socketX, socketY, socketR);
  const gridSize = socketR * 2;
  physicalPlugBank(ctx, x + w * 0.53, socketY - socketR, gridSize, gridSize, p, activeColor, 4, 4);
}

function yellowCoreVertical(ctx, x, y, w, h, progress, activeColor) {
  const p = clamp(progress);
  const bodyY = y + h * 0.07;
  const bodyH = h * 0.9;
  rr(ctx, x, bodyY, w, bodyH, 5, '#d5b52f', '#71777a', 1);
  label(ctx, 'MCGFN-1', x + w / 2, bodyY + h * 0.13, 4.8, '#171a1e', 'center');
  const socketX = x + w / 2, socketY = bodyY + h * 0.32, socketR = h * 0.18;
  roundTypeBSocket(ctx, socketX, socketY, socketR);
  const gridSize = socketR * 2;
  physicalPlugBank(ctx, x + (w - gridSize) / 2, bodyY + h * 0.51,
    gridSize, gridSize, p, activeColor, 4, 4);
}

export const MCGFN_CANDIDATES = [
  { id: 'terminal', name: 'B - Master terminal', note: 'vertical control plate with central receptacle and 16 progress cells' },
  { id: 'manifold', name: 'C - Plug manifold', note: 'one socket feeding a compact bank of collected plug indicators' },
  { id: 'console', name: 'D - Counting console', note: 'central socket, analog progress bar and recovery state' },
  { id: 'yellowCoreCoral', name: 'E - Type B / coral plugs', note: 'white three-contact socket with dark empties and coral filled squares' },
  { id: 'yellowCoreVertical', name: 'F - Type B / vertical coral', note: 'large socket above a tight 4x4 coral plug grid' },
];

export function drawMcgfnCandidate(ctx, id, x, y, w, h, progress, t = 0) {
  if (id === 'terminal') return terminal(ctx, x, y, w, h, progress, t);
  if (id === 'manifold') return manifold(ctx, x, y, w, h, progress, t);
  if (id === 'console') return consoleUnit(ctx, x, y, w, h, progress, t);
  if (id === 'yellowCoreCoral') return yellowCore(ctx, x, y, w, h, progress, '#e2574c');
  if (id === 'yellowCoreVertical') return yellowCoreVertical(ctx, x, y, w, h, progress, '#e2574c');
  return terminal(ctx, x, y, w, h, progress, t);
}