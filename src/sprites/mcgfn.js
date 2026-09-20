// MCGFN-1 — THE MASTER TERMINAL, one drawing.
//
// The plate the whole campaign walks towards: one white Type B receptacle for
// the final cord, and a 4x4 bank of coral squares counting the plugs collected
// so far. It is the study the socket bake-off settled on (option E, "Type B /
// coral plugs" in src/dev/mcgfn-candidates.js).
//
// WHY IT IS ITS OWN MODULE. The film had its own hand-typed copy of this
// drawing and the gallery had the study, and the two drifted: the copy carried
// a drop shadow the study never had, a paler outline on every lit cell, and a
// label that sat low enough to collide with the receptacle once the plate was
// scaled down to the villain's size. Peter, 20 Sep: "the socket looks wrong,
// not like what's in the gallery." A drawing that appears in two places is one
// drawing or it is two, and two is how this happened.
//
// EVERY NUMBER IS A FRACTION OF THE PLATE, so the same painter serves the
// 49x32 the film draws and the larger panel the gallery shows.

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
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
}

export const MCGFN_PLATE = '#d5b52f';
const PLATE_EDGE = '#71777a';
const INK = '#171a1e';
const CORAL = '#e2574c', EMPTY = '#24262a';

// The receptacle: a three-contact Type B face, white on a grey collar. The two
// blade slots and the round earth below them are the whole read — it is the
// only white thing in the shot and it has to stay legible at a sixth of this.
export function drawMcgfnReceptacle(ctx, cx, cy, r) {
  ctx.beginPath(); ctx.arc(cx, cy, r + r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#c8c9c3'; ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f1f0e9'; ctx.fill();
  rr(ctx, cx - r * 0.38, cy - r * 0.42, r * 0.2, r * 0.52, r * 0.08, '#090b0e');
  rr(ctx, cx + r * 0.18, cy - r * 0.42, r * 0.2, r * 0.52, r * 0.08, '#090b0e');
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.18, cy + r * 0.42);
  ctx.lineTo(cx + r * 0.18, cy + r * 0.42);
  ctx.arc(cx, cy + r * 0.42, r * 0.18, 0, Math.PI, true);
  ctx.closePath();
  ctx.fillStyle = '#090b0e'; ctx.fill();
}

// The bank: sixteen squares, filled from the first. A lit cell is ONE colour —
// the film's copy outlined each one in a paler coral, which at plate size read
// as a soft pink dot rather than a square of hardware.
export function drawMcgfnBank(ctx, x, y, size, progress, active = CORAL) {
  const n = 4;
  const gapX = Math.max(0.6, size * 0.03), gapY = Math.max(0.5, size * 0.05);
  const cellW = (size - gapX * (n - 1)) / n, cellH = (size - gapY * (n - 1)) / n;
  const square = Math.min(cellW * 0.76, cellH * 0.78);
  const filled = Math.round(Math.max(0, Math.min(1, progress)) * n * n);
  for (let i = 0; i < n * n; i++) {
    const col = i % n, row = Math.floor(i / n);
    const sx = x + col * (cellW + gapX) + (cellW - square) / 2;
    const sy = y + row * (cellH + gapY) + (cellH - square) / 2;
    const on = i < filled;
    rr(ctx, sx, sy, square, square, 0.8, on ? active : EMPTY, on ? active : EMPTY, 0.4);
  }
}

// The whole plate, its top-left corner at (x, y). `progress` is 0..1 of the
// campaign's plugs; the film runs it backwards from 1 to 0 as the arcade dies.
export function drawMcgfnPlate(ctx, x, y, w, h, progress = 1, active = CORAL) {
  rr(ctx, x, y, w, h, Math.min(5, h * 0.16), MCGFN_PLATE, PLATE_EDGE, 1);
  // The type. Its own row above the receptacle — at the plate's smallest the
  // collar reaches to within a unit of the baseline, so this must not drop.
  ctx.fillStyle = INK;
  ctx.font = `${(h * 0.15).toFixed(2)}px ui-monospace, monospace`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('MCGFN-1', x + w * 0.08, y + h * 0.145);
  const cy = y + h * 0.58, r = h * 0.235;
  drawMcgfnReceptacle(ctx, x + w * 0.26, cy, r);
  drawMcgfnBank(ctx, x + w * 0.53, cy - r * 1.1, r * 2.2, progress, active);
}
