// THE FOOD COURT MURAL: a vintage seaside postcard painted on the wall over the
// plaza tables. "GREETINGS FROM THE FOOD COURT", the city at dusk built out of
// the menu — fries, a drink, a burger, a pretzel, a slice of pizza — with the
// sun going down behind the pretzel and its light laid across the sea.
//
// Picked 11 Oct 2026 from the lab's plaza-wall bake-off (FOOD CITY: POSTCARD,
// P3a·3), then thinned to those five buildings so each one has room to read.
// Before it went up, the wall over the plaza was the one bare stretch between
// the last cabinet's poster and Dolores's menu board.
//
// It is old paint, not a lightbox: faded toward the wall, flaked back to the
// primer in patches, and lit only by whatever the room's fixtures are giving
// that stretch of wall (`lit`, a number or a function of x, the same contract
// as shadeWall).
import { rr, shape, plain, stroke } from './props.js';
import { drawText, drawTextCentered, textWidth } from '../engine/sprites.js';
import { shadeWall, WALL_BASE } from './backwall.js';

export const MURAL_W = 170, MURAL_H = 64;

function rgb(c) {
  const s = String(c).replace('#', '');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// Tint toward the dusk: every building is painted in its own colour pulled
// part way to the sky's purple, so the five read as one picture in one light
// rather than five stickers on a sunset.
const DUSK = '#43245e';
function tint(c, k = 0.38) {
  const A = rgb(c), B = rgb(DUSK);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`;
}
function grad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}
function centred(ctx, str, cx, midY, col, maxW, cap, style = 'title') {
  const s = Math.min(cap, maxW / Math.max(1, textWidth(str, 1, style)));
  drawTextCentered(ctx, str, cx, midY - s * 4.6, col, s, style);
}
// Lit windows on a building: a grid with a few dark ones, picked off the
// position so the pattern holds still.
function windows(ctx, x0, y0, cols, rows, col, dx = 3, dy = 4) {
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    if ((r * 7 + k * 3) % 5 === 0) continue;
    plain(ctx, col, (c) => c.rect(x0 + k * dx, y0 + r * dy, 1.1, 1.5));
  }
}

const LIT = '#ffd870';
const INK = '#2e1844';

function paintCity(ctx, x, y) {
  const cx = x + MURAL_W / 2, w = MURAL_W, h = MURAL_H;
  const ground = y + h - 12;
  grad(ctx, x, y, w, h, [[0, '#2e2470'], [0.32, '#a04490'], [0.58, '#f07a6a'], [0.78, '#f8b860']]);
  for (let i = 0; i < 11; i++) {
    plain(ctx, 'rgba(255,240,220,0.75)', (c) => c.rect(x + ((i * 37 + 11) % w), y + 3 + ((i * 13) % 18), 0.8, 0.8));
  }
  // The sun, striped the 80s way, set low behind the pretzel.
  const sunX = cx + 28, sunY = ground - 9;
  plain(ctx, '#ffd870', (c) => c.ellipse(sunX, sunY, 17, 17, 0, 0, Math.PI * 2));
  for (let k = 0; k < 5; k++) {
    const yy = sunY + 17 * (0.12 + k * 0.19);
    plain(ctx, '#f07a6a', (c) => c.rect(sunX - 18, yy, 36, 0.7 + k * 0.45));
  }

  // FRIES: five towers standing in the carton, windows up each one.
  for (const [fx, fh] of [[-76, 22], [-72, 30], [-68, 26], [-64, 33], [-60, 24]]) {
    plain(ctx, tint('#f6c84a'), (c) => c.rect(cx + fx, ground - fh, 3.4, fh));
    plain(ctx, tint('#ffe48a'), (c) => c.rect(cx + fx, ground - fh, 1, fh));
    windows(ctx, cx + fx + 1.4, ground - fh + 3, 1, Math.floor((fh - 14) / 4), LIT);
  }
  shape(ctx, tint('#d8402e', 0.25), 10, (c) => {
    c.moveTo(cx - 79, ground - 13); c.lineTo(cx - 55, ground - 13); c.lineTo(cx - 57, ground); c.lineTo(cx - 77, ground); c.closePath();
  });
  plain(ctx, '#f8d050', (c) => c.ellipse(cx - 67, ground - 6.6, 3, 3.4, 0, 0, Math.PI * 2));

  // THE DRINK: a cup skyscraper with its lid and straw. Kept a few units shorter
  // than the rest so the straw clears the lettering above it.
  const dx = cx - 38;
  shape(ctx, tint('#e8e0d0'), 10, (c) => {
    c.moveTo(dx - 9, ground - 26); c.lineTo(dx + 9, ground - 26); c.lineTo(dx + 7, ground); c.lineTo(dx - 7, ground); c.closePath();
  });
  plain(ctx, tint('#e04848', 0.3), (c) => c.rect(dx - 8.2, ground - 17, 16.2, 5));
  plain(ctx, tint('#48c0e0', 0.3), (c) => rr(c, dx - 10.5, ground - 29, 21, 3.4, 1.2));
  stroke(ctx, tint('#f6d33c', 0.2), 1.5, (c) => { c.moveTo(dx + 2, ground - 29); c.lineTo(dx + 4, ground - 33); });
  windows(ctx, dx - 5, ground - 23, 4, 2, INK);
  windows(ctx, dx - 5, ground - 9, 4, 2, INK);

  // THE BURGER, in its layers, the way a kid draws one: sesame bun dome,
  // tomato, cheese melting over the edge, lettuce frill, the patty, and the
  // bottom bun for a plinth. Windows in the patty, because it is a building.
  const bx = cx - 6, bw = 34;
  const L = bx - bw / 2;
  shape(ctx, tint('#d89a50', 0.3), 10, (c) => rr(c, L + 1, ground - 5, bw - 2, 5, 2));
  shape(ctx, tint('#6a3a24', 0.25), 10, (c) => rr(c, L - 0.5, ground - 11, bw + 1, 6.4, 2.4));
  windows(ctx, L + 3, ground - 9.2, 10, 1, LIT, 3, 4);
  // Lettuce: a wavy frill hanging just over the patty.
  plain(ctx, tint('#5ab84a', 0.25), (c) => {
    c.moveTo(L - 1.5, ground - 11.5);
    for (let k = 0; k <= 12; k++) c.lineTo(L - 1.5 + k * ((bw + 3) / 12), ground - 11.5 + (k % 2 ? 2.4 : 0.6));
    c.lineTo(L + bw + 1.5, ground - 13); c.lineTo(L - 1.5, ground - 13); c.closePath();
  });
  // Cheese: a slab with two drips over the front.
  plain(ctx, tint('#f8c83a', 0.2), (c) => {
    c.moveTo(L, ground - 15); c.lineTo(L + bw, ground - 15); c.lineTo(L + bw, ground - 13);
    c.lineTo(L + bw * 0.78, ground - 13); c.lineTo(L + bw * 0.74, ground - 9.5); c.lineTo(L + bw * 0.70, ground - 13);
    c.lineTo(L + bw * 0.32, ground - 13); c.lineTo(L + bw * 0.28, ground - 10.5); c.lineTo(L + bw * 0.24, ground - 13);
    c.lineTo(L, ground - 13); c.closePath();
  });
  plain(ctx, tint('#e04848', 0.3), (c) => rr(c, L + 1, ground - 17.2, bw - 2, 2.4, 1));
  // The top bun: a high dome, highlit on its shoulder, seeds scattered on it.
  shape(ctx, tint('#e0a058', 0.28), 10, (c) => {
    c.moveTo(L - 1, ground - 17);
    c.bezierCurveTo(L - 1, ground - 36, L + bw + 1, ground - 36, L + bw + 1, ground - 17);
    c.closePath();
  });
  plain(ctx, tint('#f2c27a', 0.28), (c) => c.ellipse(L + bw * 0.34, ground - 28, 6, 2.2, -0.3, 0, Math.PI * 2));
  for (const [sx, sy] of [[0.2, 22], [0.36, 30], [0.5, 25], [0.64, 31], [0.78, 23], [0.44, 20], [0.86, 19]]) {
    plain(ctx, '#f8ecd0', (c) => c.ellipse(L + bw * sx, ground - sy, 0.9, 0.5, 0.4, 0, Math.PI * 2));
  }

  // THE PRETZEL, as an arch framing the sun. One rope: the outer loop rises
  // from two feet over both lobes, and the ends come back across the middle
  // and twist over each other low down.
  const px = sunX, py = ground - 2;
  const pretzel = (c) => {
    c.moveTo(px - 13, py);
    c.bezierCurveTo(px - 30, py - 16, px - 16, py - 36, px, py - 22);
    c.bezierCurveTo(px + 16, py - 36, px + 30, py - 16, px + 13, py);
    c.moveTo(px - 13, py); c.bezierCurveTo(px - 4, py - 2, px + 2, py - 10, px + 9, py - 19);
    c.moveTo(px + 13, py); c.bezierCurveTo(px + 4, py - 2, px - 2, py - 10, px - 9, py - 19);
  };
  stroke(ctx, tint('#5a3014', 0.2), 4.6, pretzel);
  stroke(ctx, tint('#b06a2c', 0.22), 3.2, pretzel);
  for (const [sx, sy] of [[-17, -16], [-11, -27], [11, -27], [17, -16], [-4, -6], [4, -6], [-21, -9], [21, -9]]) {
    plain(ctx, '#fff4e0', (c) => c.rect(px + sx, py + sy, 0.9, 0.9));
  }

  // THE PIZZA: a slice stood on its crust, a pyramid of cheese with the
  // pepperoni for windows.
  const zx = cx + 66;
  shape(ctx, tint('#f8c83a', 0.25), 10, (c) => {
    c.moveTo(zx - 13, ground - 3); c.lineTo(zx, ground - 38); c.lineTo(zx + 13, ground - 3); c.closePath();
  });
  plain(ctx, tint('#ffe48a', 0.25), (c) => { c.moveTo(zx - 1, ground - 35); c.lineTo(zx - 9, ground - 6); c.lineTo(zx - 6, ground - 6); c.closePath(); });
  shape(ctx, tint('#c87a3a', 0.25), 10, (c) => rr(c, zx - 15, ground - 5, 30, 5, 2.4));
  for (const [ox, oy] of [[0, 27], [-3.5, 18], [3.5, 15], [-6, 9], [0.5, 9], [6.5, 8]]) {
    plain(ctx, tint('#d83a2e', 0.2), (c) => c.ellipse(zx + ox, ground - oy, 1.9, 1.9, 0, 0, Math.PI * 2));
    plain(ctx, LIT, (c) => c.rect(zx + ox - 0.5, ground - oy - 0.6, 1, 1.2));
  }

  // The sea, with the sun laid across it in stripes and the city's lights
  // broken up in the swell.
  grad(ctx, x, ground, w, h - (ground - y), [[0, '#6a3a8a'], [1, '#24163e']]);
  for (let k = 0; k < 6; k++) {
    const rw = 12 - k * 1.6;
    plain(ctx, 'rgba(255,216,112,0.8)', (c) => c.rect(sunX - rw, ground + 1.5 + k * 1.8, rw * 2, 0.8));
  }
  for (let k = 0; k < 12; k++) {
    plain(ctx, 'rgba(255,216,112,0.6)', (c) => c.rect(cx - 78 + ((k * 23) % 96), ground + 2 + (k % 4) * 2, 2, 0.5));
  }

  // The postcard lettering: GREETINGS FROM THE in script, then the name in
  // big block capitals with a drop shadow, as on every seaside card printed.
  drawText(ctx, 'GREETINGS FROM THE', cx - 54, y + 3, '#f2ead2', 0.42, 'marker');
  centred(ctx, 'FOOD COURT', cx + 1.2, y + 15.4, INK, 120, 1.6);
  centred(ctx, 'FOOD COURT', cx, y + 14, '#f8d050', 120, 1.6);
}

// The patches where the paint has flaked back to the primer. Pale, not dark:
// a dark patch read as a hole in the wall rather than as paint coming away.
const PEELS = [[9, 52, 9, 12], [136, 24, 12, 7], [62, 40, 8, 6]];

export function drawFoodCourtMural(ctx, cx, topY, { lit = 1 } = {}) {
  const x = cx - MURAL_W / 2, y = topY;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, MURAL_W, MURAL_H); ctx.clip();
  paintCity(ctx, x, y);
  // The card's white border, part of the painting.
  ctx.save();
  ctx.globalAlpha = 0.62;
  stroke(ctx, '#e8e0d0', 3, (c) => c.rect(x + 1.5, y + 1.5, MURAL_W - 3, MURAL_H - 3));
  ctx.restore();
  for (const [ox, oy, pw, ph] of PEELS) {
    const px = x + ox, py = y + oy;
    const patch = (c) => {
      c.moveTo(px, py); c.lineTo(px + pw, py + 1); c.lineTo(px + pw - 2, py + ph * 0.6);
      c.lineTo(px + pw * 0.6, py + ph); c.lineTo(px + 1, py + ph - 1); c.closePath();
    };
    plain(ctx, '#d8d0c4', patch);
    stroke(ctx, 'rgba(90,70,90,0.45)', 0.5, patch);
  }
  ctx.restore();
  // Forty years of fluorescent light, then whatever light there is now.
  ctx.save();
  ctx.globalAlpha = 0.22;
  plain(ctx, WALL_BASE, (c) => c.rect(x, y, MURAL_W, MURAL_H));
  ctx.restore();
  shadeWall(ctx, x, y, MURAL_W, MURAL_H, lit);
}
