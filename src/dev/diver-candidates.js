// DIVER BAKE-OFF — the diver standing on the sand in the jukebox's DEEP BLUE DISCO. 7 Oct 2026.
//
// Peter: "plesae do a backof f of the diver". The tank's diver (visualisers.js TANK_DIVER) is the
// classic tank ornament: a hard-hat diver standing front on, waving. These are the alternatives.
//
// Each is a diver for FishTank — { letter, name, description, valve, paint(ctx, paper, o) } — drawn
// facing right with its feet on the sand at the origin (the tank flips it to face either way), about
// 60 logical px tall. `paper` is the tank's own paper (visualisers.js tankPaper): `piece(col, path,
// lift, edge)` fills what `path` builds as a cut-out with its shadow, `strip(col, width, path, lift)`
// strokes it as a strip of paper, so every candidate is cut from the same stuff as the fish. `o` is
// { t, flow, beat, phase }: seconds, the tank's motion clock, the song's beat, a seeded phase.
// `valve` is where its bubbles come out, in the same frame.

import { TANK_DIVER } from '../engine/visualisers.js';

const TAU = Math.PI * 2;
const BRASS = '#d9a441', BRASS_DARK = '#b7832e', RIM = '#f0c96a', GLASS = '#2d4b5c';
const SUIT = '#c9b28a', BOOT = '#4a4048';

/** A window in a helmet: a brass rim, the dark glass, a glint. */
function window_(ctx, paper, x, y, r) {
  paper.piece(RIM, () => ctx.arc(x, y, r, 0, TAU), 0.4);
  ctx.fillStyle = GLASS;
  ctx.beginPath(); ctx.arc(x, y, r * 0.74, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.32, r * 0.26, r * 0.15, -0.6, 0, TAU); ctx.fill();
}

/** A hard hat, front on: the dome, its big front window and a small one each side, a valve on top. */
function helmetFront(ctx, paper, x, y, r) {
  paper.piece(BRASS_DARK, () => ctx.rect(x - r * 0.2, y - r * 1.25, r * 0.4, r * 0.35), 0.4);
  paper.piece(BRASS, () => ctx.arc(x, y, r, 0, TAU), 0.8, true);
  window_(ctx, paper, x, y + r * 0.05, r * 0.56);
  for (const s of [-1, 1]) window_(ctx, paper, x + s * r * 0.78, y - r * 0.12, r * 0.2);
}

/** A hard hat side on, facing right: the dome, its front window out on the face, a little one on top, the hose's nozzle at the back. */
function helmetSide(ctx, paper, x, y, r) {
  paper.piece(BRASS_DARK, () => ctx.rect(x - r * 1.15, y - r * 0.4, r * 0.4, r * 0.32), 0.4);
  paper.piece(BRASS_DARK, () => ctx.rect(x - r * 0.15, y - r * 1.22, r * 0.36, r * 0.3), 0.4);
  paper.piece(BRASS, () => ctx.arc(x, y, r, 0, TAU), 0.8, true);
  window_(ctx, paper, x + r * 0.42, y + r * 0.05, r * 0.5);
  window_(ctx, paper, x - r * 0.1, y - r * 0.62, r * 0.2);
}

/** The corselet the helmet sits on: a brass collar across the shoulders, bolted. */
function collar(ctx, paper, x, y, w) {
  paper.piece(BRASS_DARK, () => ctx.rect(x - w / 2, y, w, 5));
  ctx.fillStyle = '#8a5a1e';
  ctx.beginPath();
  for (let i = 0; i < 4; i++) { const bx = x - w / 2 + 3 + i * (w - 6) / 3; ctx.moveTo(bx + 0.9, y + 2.5); ctx.arc(bx, y + 2.5, 0.9, 0, TAU); }
  ctx.fill();
}

/** 1 for the first beat of a bar, easing in and out: for a lid that lifts on the bar line. */
function onTheBar(beat) {
  const b = ((beat % 4) + 4) % 4;
  return b < 0.15 ? b / 0.15 : b < 1.1 ? 1 : Math.max(0, 1 - (b - 1.1) / 0.6);
}

/** A small treasure chest, front on, `w` wide, its lid lifted by `lift` 0–1, gold showing when it is. */
function chest(ctx, paper, x, y, w, lift) {
  const h = w * 0.5;
  if (lift > 0.02) {
    paper.piece('#3a1f16', () => ctx.rect(x - w / 2 + 2, y - h - 7 * lift, w - 4, 7 * lift + 2), 0.3);
    paper.piece('#ffd75e', () => { for (let i = 0; i < 3; i++) { ctx.moveTo(x - w * 0.25 + i * w * 0.25 + 3, y - h - 1); ctx.ellipse(x - w * 0.25 + i * w * 0.25, y - h - 1, 3, 1.8, 0, 0, TAU); } }, 0.3);
  }
  paper.piece('#9a5b34', () => ctx.rect(x - w / 2, y - h, w, h));
  paper.piece('#e2b24a', () => ctx.rect(x - w / 2 + 3, y - h, 3, h), 0.3);
  paper.piece('#e2b24a', () => ctx.rect(x + w / 2 - 6, y - h, 3, h), 0.3);
  ctx.save();
  ctx.translate(x, y - h - 8 * lift);
  ctx.scale(1, 1 - 0.45 * lift);
  paper.piece('#ad6a3e', () => { ctx.moveTo(-w / 2 - 1, 0); ctx.lineTo(-w / 2 - 1, -4); ctx.quadraticCurveTo(0, -12, w / 2 + 1, -4); ctx.lineTo(w / 2 + 1, 0); ctx.closePath(); });
  ctx.restore();
  paper.piece('#f2d36b', () => ctx.ellipse(x, y - h + 2.5 - 8 * lift, 2.5, 2.8, 0, 0, TAU), 0.4);
}

// A — on one knee at a little chest of its own, lifting the lid on the bar line to look at the gold.
function treasureHunter(ctx, paper, { beat }) {
  const lift = onTheBar(beat);
  // the far leg kneeling, the near one bent with its foot flat
  paper.strip(SUIT, 6, () => { ctx.moveTo(-6, -16); ctx.lineTo(-12, -4); ctx.lineTo(-20, -3); }, 0.6);
  paper.piece(BOOT, () => ctx.rect(-25, -6, 8, 6), 0.5);
  paper.strip(SUIT, 6, () => { ctx.moveTo(-2, -16); ctx.lineTo(6, -12); ctx.lineTo(6, -3); }, 0.6);
  paper.piece(BOOT, () => ctx.rect(3, -5, 9, 5), 0.5);
  chest(ctx, paper, 22, 0, 20, lift);
  // the body leaning in, the arms out to the lid
  paper.piece(SUIT, () => { ctx.moveTo(-9, -15); ctx.lineTo(-7, -36); ctx.lineTo(6, -36); ctx.lineTo(4, -15); ctx.closePath(); }, 0.8, true);
  paper.piece('#7a5a3a', () => ctx.rect(-8.5, -19, 13, 3), 0.4);
  const hand = [17 + 3 * lift, -14 - 7 * lift];
  paper.strip(SUIT, 5, () => { ctx.moveTo(2, -31); ctx.lineTo(10, -24); ctx.lineTo(...hand); }, 0.6);
  paper.piece(BOOT, () => ctx.arc(hand[0], hand[1], 2.6, 0, TAU), 0.4);
  collar(ctx, paper, -1, -40, 20);
  helmetSide(ctx, paper, 1, -49, 10);
}

// B — side on, walking on the spot in its lead boots, the air hose up out of its helmet swaying away to the surface.
function hoseWalker(ctx, paper, { flow, phase }) {
  const step = Math.sin(flow * 2.4 + phase);
  // the hose, up out of the back of the helmet and away over the top of the frame
  const sway = Math.sin(flow * 0.7 + phase) * 8;
  paper.strip('#5b5560', 3.2, () => { ctx.moveTo(-11, -53); ctx.bezierCurveTo(-26, -70, -10 + sway, -110, -30 + sway * 1.5, -160); }, 0.6);
  for (const [s, k] of [[-1, step], [1, -step]]) {
    const lift = Math.max(0, k) * 3;
    paper.strip(SUIT, 6.5, () => { ctx.moveTo(s * 2, -18); ctx.lineTo(s * 2 + 2, -8 - lift); ctx.lineTo(s * 2 + 1, -4 - lift); }, 0.6);
    paper.piece(BOOT, () => ctx.rect(s * 2 - 4, -6 - lift, 11, 6), 0.5);
  }
  paper.strip(SUIT, 5, () => { ctx.moveTo(-3, -32); ctx.lineTo(-6 - step * 3, -22); ctx.lineTo(-4 - step * 4, -16); }, 0.6);
  paper.piece(SUIT, () => { ctx.moveTo(-8, -18); ctx.lineTo(-7, -37); ctx.lineTo(7, -37); ctx.lineTo(8, -18); ctx.closePath(); }, 0.8, true);
  paper.piece('#8a8f99', () => ctx.rect(2, -34, 7, 9), 0.4);
  paper.piece('#7a5a3a', () => ctx.rect(-8, -22, 16, 3), 0.4);
  paper.strip(SUIT, 5, () => { ctx.moveTo(3, -32); ctx.lineTo(7 + step * 3, -23); ctx.lineTo(9 + step * 4, -17); }, 0.6);
  paper.piece(BOOT, () => ctx.arc(9 + step * 4, -16, 2.6, 0, TAU), 0.4);
  collar(ctx, paper, 0, -41, 18);
  helmetSide(ctx, paper, 1, -50, 10);
}

// C — a little one: a helmet twice the size, a stub of a body, both arms waving by turns.
function chibi(ctx, paper, { flow, phase }) {
  for (const x of [-7, 1]) paper.piece(BOOT, () => ctx.rect(x, -5, 7, 5), 0.5);
  paper.piece(SUIT, () => ctx.rect(-8, -20, 16, 16), 0.8, true);
  for (const s of [-1, 1]) {
    const a = -Math.PI / 2 + s * (0.7 + 0.35 * Math.sin(flow * 2 + phase + (s > 0 ? Math.PI : 0)));
    const hx = s * 9 + Math.cos(a) * 9, hy = -17 + Math.sin(a) * 9;
    paper.strip(SUIT, 4.5, () => { ctx.moveTo(s * 7, -17); ctx.lineTo(hx, hy); }, 0.6);
    paper.piece(BOOT, () => ctx.arc(hx, hy, 2.6, 0, TAU), 0.4);
  }
  collar(ctx, paper, 0, -24, 18);
  helmetFront(ctx, paper, 0, -40, 17);
}

/**
 * The hard hat standing front on and waving that the tank had first (until Peter, 7 Oct 2026:
 * "replace diver with photographer"): X in the bake-off.
 */
export const STANDING_DIVER = Object.freeze({
  letter: 'X', name: 'STANDING, WAVING (the old one)', valve: [0, -62],
  description: 'What the tank had first: the classic tank ornament, a hard hat standing front on, its window to one side, waving from the elbow.',
  paint(ctx, paper, { flow, phase }) {
    const suit = '#c9b28a', boot = '#4a4048';
    for (const x of [-9, 1]) paper.piece(boot, () => ctx.rect(x, -5, 8, 5), 0.5);
    for (const x of [-8, 1]) paper.piece(suit, () => ctx.rect(x, -19, 7, 15));
    // both arms go in under the suit at the shoulder (Peter, 7 Oct 2026: "his arms are not
    // connected great to their shoulder"): one hanging, one up and waving from the elbow
    const wave = -1.5 + Math.sin(flow * 1.4 + phase) * 0.4;
    const ex = 15, ey = -37, hx = ex + Math.cos(wave) * 9, hy = ey + Math.sin(wave) * 9;
    paper.strip(suit, 5, () => {
      ctx.moveTo(-7, -32); ctx.lineTo(-11.5, -26); ctx.lineTo(-11, -20.5);
      ctx.moveTo(7, -32); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy);
    });
    paper.piece(boot, () => ctx.arc(-11, -19, 2.8, 0, TAU), 0.4);
    paper.piece(boot, () => ctx.arc(hx, hy, 2.8, 0, TAU), 0.5);
    paper.piece(suit, () => ctx.rect(-10, -36, 20, 18), 0.8, true);
    paper.piece('#7a5a3a', () => ctx.rect(-10, -22, 20, 3), 0.4);
    paper.piece('#8a8f99', () => ctx.rect(-6, -33, 12, 7), 0.4);
    // the shoulders, rounded over where the arms go in
    for (const sx of [-9, 9]) paper.piece(suit, () => ctx.arc(sx, -33, 3.8, 0, TAU), 0.4);
    // the helmet
    paper.piece('#b7832e', () => ctx.rect(-11, -40, 22, 5));
    paper.piece('#b7832e', () => ctx.rect(-2, -62, 4, 4), 0.4);
    paper.piece('#d9a441', () => ctx.arc(0, -49, 10.5, 0, TAU), 0.8, true);
    paper.piece('#f0c96a', () => ctx.arc(3, -49, 6.2, 0, TAU), 0.4);
    paper.piece('#f0c96a', () => ctx.arc(-6, -51, 2.6, 0, TAU), 0.3);
    ctx.fillStyle = '#2d4b5c';
    ctx.beginPath();
    ctx.arc(3, -49, 4.6, 0, TAU);
    ctx.moveTo(-4.6, -51); ctx.arc(-6, -51, 1.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(1.4, -51, 1.6, 0.9, -0.6, 0, TAU); ctx.fill();
  },
});


// E — sat on the treasure chest, legs swinging, waving.
function onTheChest(ctx, paper, { flow, phase }) {
  chest(ctx, paper, 0, 0, 30, 0);
  for (const [s, k] of [[-1, 0], [1, Math.PI]]) {
    const swing = Math.sin(flow * 2.2 + phase + k) * 0.35;
    const kx = s * 4 + 7, ky = -15, fx = kx + Math.sin(swing) * 10, fy = ky + Math.cos(swing) * 10;
    paper.strip(SUIT, 6, () => { ctx.moveTo(s * 4, -20); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); }, 0.6);
    paper.piece(BOOT, () => ctx.rect(fx - 2, fy - 2, 8, 5), 0.5);
  }
  paper.piece(SUIT, () => ctx.rect(-9, -38, 18, 20), 0.8, true);
  paper.piece('#7a5a3a', () => ctx.rect(-9, -24, 18, 3), 0.4);
  paper.strip(SUIT, 5, () => { ctx.moveTo(-7, -34); ctx.lineTo(-11, -26); ctx.lineTo(-10, -20); }, 0.6);
  paper.piece(BOOT, () => ctx.arc(-10, -19, 2.6, 0, TAU), 0.4);
  const wave = -1.5 + Math.sin(flow * 1.6 + phase) * 0.45;
  const hx = 13 + Math.cos(wave) * 9, hy = -39 + Math.sin(wave) * 9;
  paper.strip(SUIT, 5, () => { ctx.moveTo(6, -34); ctx.lineTo(13, -39); ctx.lineTo(hx, hy); }, 0.6);
  paper.piece(BOOT, () => ctx.arc(hx, hy, 2.6, 0, TAU), 0.4);
  for (const sx of [-8, 8]) paper.piece(SUIT, () => ctx.arc(sx, -35, 3.6, 0, TAU), 0.4);
  collar(ctx, paper, 0, -42, 20);
  helmetFront(ctx, paper, 0, -51, 10);
}

// F — fishing: sat on a rock with a rod out over the sand, the line bobbing (in a fish tank).
function fisherman(ctx, paper, { flow, phase, beat }) {
  paper.piece('#857a70', () => ctx.ellipse(-2, -6, 14, 8, 0, 0, TAU), 0.8);
  paper.strip(SUIT, 6, () => { ctx.moveTo(-2, -14); ctx.lineTo(8, -13); ctx.lineTo(9, -3); }, 0.6);
  paper.piece(BOOT, () => ctx.rect(6, -5, 9, 5), 0.5);
  paper.piece(SUIT, () => ctx.rect(-9, -33, 16, 20), 0.8, true);
  paper.piece('#7a5a3a', () => ctx.rect(-9, -19, 16, 3), 0.4);
  // the rod, bending when something nibbles on the bar line, and its line
  const nib = Math.max(0, Math.sin(((((beat % 4) + 4) % 4) / 4) * Math.PI * 8)) * (((beat % 8) + 8) % 8 < 4 ? 1 : 0);
  const tip = [34, -50 + nib * 3 + Math.sin(flow * 1.5 + phase) * 1.5];
  paper.strip('#7a5236', 1.8, () => { ctx.moveTo(4, -22); ctx.quadraticCurveTo(20, -44, ...tip); }, 0.5);
  ctx.strokeStyle = 'rgba(240,240,240,0.8)';
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(...tip); ctx.lineTo(tip[0] + 2, -8 + nib * 2); ctx.stroke();
  paper.piece('#e8473c', () => ctx.arc(tip[0] + 2, -10 + nib * 2, 2.4, Math.PI, TAU), 0.4);
  paper.piece('#fbf6ee', () => { ctx.arc(tip[0] + 2, -10 + nib * 2, 2.4, 0, Math.PI); }, 0.4);
  paper.strip(SUIT, 5, () => { ctx.moveTo(4, -29); ctx.lineTo(8, -22); ctx.lineTo(4, -22); }, 0.6);
  paper.piece(BOOT, () => ctx.arc(4, -22, 2.6, 0, TAU), 0.4);
  collar(ctx, paper, -1, -37, 18);
  helmetSide(ctx, paper, 0, -46, 10);
}

export const DIVERS = Object.freeze([
  { letter: 'A', name: 'TREASURE HUNTER', paint: treasureHunter, valve: [1, -61],
    description: 'Side on, on one knee at a little chest of its own, lifting the lid on the bar line to look at the gold.' },
  { letter: 'B', name: 'HOSE WALKER', paint: hoseWalker, valve: [-11, -56],
    description: 'Side on, stomping on the spot in its lead boots, the air hose up out of its helmet and away over the top to the surface, swaying in the current.' },
  { letter: 'C', name: 'LITTLE ONE', paint: chibi, valve: [0, -61],
    description: 'A helmet twice the size on a stub of a body, front on, both arms waving by turns.' },
  TANK_DIVER,
  { letter: 'E', name: 'ON THE CHEST', paint: onTheChest, valve: [0, -64],
    description: 'Front on, sat on the treasure chest, legs swinging, one hand waving.' },
  { letter: 'F', name: 'GONE FISHING', paint: fisherman, valve: [0, -59],
    description: 'Side on, sat on a rock with a rod out over the sand, the float bobbing when something nibbles — fishing, in a fish tank.' },
]);
