// MAKING THE FOOD COURT READ AS A FOOD COURT — a bake-off, 11 Oct 2026.
//
// The concourse is nine cabinets, a stretch of empty floor, Dolores's counter
// and Gary's. The only food in the room is the menu board over the serving
// line, so at a glance it reads as an arcade with a snack bar at the far end.
// Two questions, each its own lab section:
//
//   FRONTS  — the wall behind the cabinet bank. Today it carries one poster per
//             machine. Each candidate replaces the posters with the food units
//             the cabinets were pushed in front of.
//   SEATING — the plaza between the last cabinet and the serving line, which
//             today is bare tile. Each candidate furnishes it.
//
// Nothing here is wired into HubState. Every card is a hub-scale mock built from
// the room's real painters (floor, ceiling fixtures, cabinets, the counter, the
// cast) with only the candidate itself painted here, so what you judge is the
// candidate in the actual room at the actual size.
import { W, H } from '../engine/renderer.js';
import { drawText, drawTextCentered, textWidth } from '../engine/sprites.js';
import { rr, shape, plain, stroke } from '../sprites/props.js';
import {
  cabinetPalette, drawCabinetShell, drawCabinetScreen, drawScreenSweep, drawCounter,
  COUNTER_W, COUNTER_H, COUNTER_STAFF_X, drawFoodCourtTable,
} from '../sprites/arcade.js';
import { drawToon } from '../sprites/toons.js';
import { drawWallBay, hubWallBays, shadeWall, BAY_W } from '../sprites/backwall.js';
import { drawFoodCourtMural } from '../sprites/mural.js';
import { CABINETS } from '../data/cabinets.js';
import {
  HUB_ZOOM, HUB_ROOM, drawFoodCourtFloor, drawCeilingLight, lightFlicker, LIGHT_W,
} from '../game/hub/index.js';

// The room's own numbers. HUB_CAM_Y is not exported, but it is defined as the
// camera that pins the floor line where the hub pins it, so it is re-derived
// from the same two values rather than retyped.
const FLOOR = HUB_ROOM.floorY;
const CAM_Y = FLOOR - FLOOR / HUB_ZOOM;
const VIEW_W = W / HUB_ZOOM;
const CAB_W = HUB_ROOM.cabW, CAB_H = HUB_ROOM.cabH, CAB_Y = HUB_ROOM.cabY;
const PITCH = HUB_ROOM.bayPitch;
const WALL = '#241c30';
const INK = '#100c18';
const NPC_H = 46, DOLORES_H = 48;

// ------------------------------------------------------------- colour maths
function rgb(c) {
  if (String(c).startsWith('rgb')) return String(c).match(/[\d.]+/g).slice(0, 3).map(Number);
  const s = String(c).replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((k) => k + k).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
const toHex = (c) => {
  if (c.startsWith('#')) return c;
  const m = c.match(/\d+/g).map(Number);
  return '#' + m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
};
// Everything on the back wall sits in a dark room. `dim` pulls a colour toward
// the wall the way the hub's lighting does, so a candidate cannot win by being
// the only fully-lit thing on screen.
const dim = (c, k) => toHex(mix(c, WALL, k));
const ROOM_DIM = 0.38;
const d = (c) => dim(c, ROOM_DIM);
const rgba = (c, a) => { const [r, g, b] = rgb(toHex(c)); return `rgba(${r},${g},${b},${a})`; };

// Text set to a measure, centred on a point. Glyph ink centres about 4.6 scale
// units below the draw y (see paintMenuBoard in backwall.js).
function sign(ctx, str, cx, midY, col, maxW, cap, style = 'title') {
  const s = Math.min(cap, maxW / Math.max(1, textWidth(str, 1, style)));
  drawTextCentered(ctx, str, cx, midY - s * 4.6, col, s, style);
  return s;
}
// A flickering neon/lightbox level, per seed: mostly on, with the odd stutter.
function flick(t, seed) {
  const period = 3.1 + (seed % 5) * 0.7;
  const ph = (t + seed * 1.37) % period;
  if (ph < 0.14) return ph < 0.06 ? 0.15 : 0.6;
  return 1;
}

// Light thrown onto the wall by a sign: a radial falloff, never a hard oval.
function glow(ctx, cx, cy, rx, ry, col, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

const idle = (t, seed = 0, facing = 1) => ({
  kind: 'idle', phase: (t * 0.5 + seed * 0.21) % 1, time: t + seed * 0.4,
  grounded: true, vy: 0, facing,
});

// ------------------------------------------------------------- the room
function roomShell(ctx, camX, t) {
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(HUB_ZOOM, HUB_ZOOM);
  ctx.translate(0, -CAM_Y);
  ctx.fillStyle = WALL;
  ctx.fillRect(0, HUB_ROOM.wallY0, VIEW_W, HUB_ROOM.wallY1 - HUB_ROOM.wallY0);
  drawFoodCourtFloor(ctx, FLOOR, VIEW_W, camX);
}
function ceiling(ctx, camX, t, from = 96 - PITCH / 2) {
  let i = 0;
  for (let gx = from; gx < camX + VIEW_W + PITCH; gx += PITCH, i++) {
    const lx = Math.round(gx - camX - LIGHT_W / 2);
    if (lx < -LIGHT_W - 60 || lx > VIEW_W + 60) continue;
    drawCeilingLight(ctx, lx, CAM_Y, 0.85 * lightFlicker(t, i), lx, VIEW_W);
  }
}
function cabinet(ctx, cab, sx, t) {
  const pal = cabinetPalette(cab, true);
  // The pool it throws on the tiles, as the hub lays it.
  const g = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 34);
  g.addColorStop(0, cab.sky[0]);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.moveTo(sx - CAB_W * 0.6, FLOOR); ctx.lineTo(sx + CAB_W * 0.6, FLOOR);
  ctx.lineTo(sx + CAB_W * 0.95, FLOOR + 34); ctx.lineTo(sx - CAB_W * 0.95, FLOOR + 34);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  drawCabinetShell(ctx, sx - CAB_W / 2, CAB_Y, CAB_W, CAB_H, pal);
  const scr = drawCabinetScreen(ctx, sx - CAB_W / 2, CAB_Y, CAB_W, CAB_H, pal);
  if (scr) drawScreenSweep(ctx, scr, t, pal.seed);
}

// ===================================================================
// FRONTS — what hangs behind the cabinet bank.
// ===================================================================
// One unit per cabinet, centred on it: the hub's own placement rule for the
// posters these replace, and the reason the cabinets read as having been
// parked in front of something rather than standing on bare wall.
const UNIT_W = PITCH - 6;
const FASCIA_Y = 58, FASCIA_H = 17;
const OPEN_Y = FASCIA_Y + FASCIA_H + 3;

// Five units, named in the room's voice. Each knows its sign colours and the
// thing it sold, so the open-unit card can dress the inside.
const UNITS = [
  { name: 'PRETZEL PALACE', ink: '#3a1c08', box: '#f2b84b', neon: '#ffb347', goods: 'pretzel', lit: true },
  { name: 'WOK THIS WAY', ink: '#ffffff', box: '#c83a2e', neon: '#ff5a4a', goods: 'wok', lit: false },
  { name: 'SLICE OF LIFE', ink: '#1c3a12', box: '#9fd86a', neon: '#7dff6a', goods: 'pizza', lit: false },
  { name: 'SMOOTHIE OPERATOR', ink: '#3a0c2a', box: '#f590c8', neon: '#ff7ad2', goods: 'cup', lit: true },
  { name: 'SPUD STOP', ink: '#2a1c06', box: '#e8d27a', neon: '#ffe36a', goods: 'spud', lit: false },
];

function pilaster(ctx, x, col = '#3a3248') {
  plain(ctx, d(col), (c) => c.rect(x - 3, FASCIA_Y - 6, 6, FLOOR - (FASCIA_Y - 6)));
  plain(ctx, d(mix(col, '#ffffff', 0.12)), (c) => c.rect(x - 3, FASCIA_Y - 6, 1.5, FLOOR - (FASCIA_Y - 6)));
}

function shutter(ctx, x, y, w, h, col = '#5e6070', upTo = 0) {
  // A roller shutter: the housing box, then slats. `upTo` lifts it partway,
  // showing a slice of dark unit underneath.
  const sh = h * (1 - upTo);
  plain(ctx, '#0d0a14', (c) => c.rect(x, y, w, h));
  plain(ctx, d(col), (c) => c.rect(x, y, w, sh));
  const slat = 3.2;
  for (let sy = y + slat; sy < y + sh; sy += slat) {
    plain(ctx, d(mix(col, INK, 0.35)), (c) => c.rect(x, sy, w, 0.7));
  }
  plain(ctx, d(mix(col, INK, 0.5)), (c) => c.rect(x, y + sh - 2, w, 2));
  plain(ctx, d('#4a4658'), (c) => c.rect(x - 1, y - 4, w + 2, 4));
}

// A: SHUTTERS DOWN. Every unit has a lightbox fascia and a roller shutter.
// Two lightboxes still run; the rest are dead plastic you can just about read.
function frontsShutters(ctx, sx, unit, t, i) {
  const x0 = sx - UNIT_W / 2;
  const on = unit.lit ? flick(t, i * 7 + 3) : 0;
  shutter(ctx, x0 + 3, OPEN_Y + 4, UNIT_W - 6, FLOOR - OPEN_Y - 6);
  // The fascia lightbox.
  shape(ctx, d('#2a2438'), 12, (c) => rr(c, x0 + 1, FASCIA_Y, UNIT_W - 2, FASCIA_H, 1.5));
  const face = on ? mix(d(unit.box), unit.box, on) : dim(unit.box, 0.72);
  plain(ctx, face, (c) => c.rect(x0 + 3, FASCIA_Y + 2, UNIT_W - 6, FASCIA_H - 4));
  glow(ctx, sx, FASCIA_Y + FASCIA_H, UNIT_W * 0.6, 22, unit.box, 0.22 * on);
  sign(ctx, unit.name, sx, FASCIA_Y + FASCIA_H / 2, on ? unit.ink : dim(unit.ink, 0.5), UNIT_W - 12, 0.62);
  // A sheet taped to one shutter, at the height a person tapes things.
  if (i === 1) {
    const px = sx + 12, py = OPEN_Y + 20;
    plain(ctx, d('#ded8c8'), (c) => c.rect(px - 9, py, 18, 12));
    drawTextCentered(ctx, 'CLOSED', px, py + 1.4, d('#0d5f57'), 0.36, 'marker');
    drawTextCentered(ctx, 'UNTIL', px, py + 5.0, d('#0d5f57'), 0.3, 'marker');
    drawTextCentered(ctx, 'FURTHER NOTICE', px, py + 8.0, d('#0d5f57'), 0.22, 'marker');
  }
}

// B: NEON ON BARE WALL. No unit carcasses at all — the names are tube signs
// fixed straight to the wall, a letter or two dead, with a small menu lightbox
// under each. The lightest-touch option: the wall stays the wall.
function neonText(ctx, str, cx, midY, col, maxW, cap, on, deadIdx = -1) {
  const s = Math.min(cap, maxW / Math.max(1, textWidth(str, 1, 'title')));
  const total = textWidth(str, s, 'title');
  let x = cx - total / 2;
  const y = midY - s * 4.6;
  for (let k = 0; k < str.length; k++) {
    const ch = str[k];
    const cw = textWidth(ch, s, 'title');
    const dead = k === deadIdx;
    const lvl = dead ? 0 : on;
    // The unlit tube, always there.
    drawText(ctx, ch, x, y, dim(col, 0.78), s, 'title');
    if (lvl > 0) {
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 6 * lvl;
      ctx.globalAlpha = lvl;
      drawText(ctx, ch, x, y, mix(col, '#ffffff', 0.35), s, 'title');
      ctx.restore();
    }
    x += cw;
  }
  return s;
}
function frontsNeon(ctx, sx, unit, t, i) {
  const on = (i === 2 ? 0 : 1) * flick(t, i * 5 + 1);
  glow(ctx, sx, FASCIA_Y + 10, UNIT_W * 0.6, 26, unit.neon, 0.16 * on);
  // Split long names over two lines so the tubes stay a readable size.
  const words = unit.name.split(' ');
  const lines = words.length >= 3 ? [words.slice(0, -1).join(' '), words[words.length - 1]]
    : words.length === 2 ? words : [unit.name];
  lines.forEach((ln, k) => neonText(ctx, ln, sx, FASCIA_Y + 4 + k * 13, unit.neon, UNIT_W - 10, 1.0, on,
    i === 0 && k === 0 ? 3 : i === 3 && k === 1 ? 2 : -1));
  // The little menu lightbox below, half a cabinet wide.
  const bw = 34, bh = 22, bx = sx - bw / 2, by = FASCIA_Y + 30;
  shape(ctx, d('#2a2438'), 12, (c) => rr(c, bx, by, bw, bh, 1.2));
  plain(ctx, '#161022', (c) => c.rect(bx + 1.5, by + 1.5, bw - 3, bh - 3));
  ctx.save();
  ctx.globalAlpha = 0.14 + 0.1 * on;
  plain(ctx, '#f6d33c', (c) => c.rect(bx + 1.5, by + 1.5, bw - 3, bh - 3));
  ctx.restore();
  for (let r = 0; r < 3; r++) {
    plain(ctx, dim('#c8c8d8', 0.45), (c) => c.rect(bx + 4, by + 5 + r * 5, 15, 1.2));
    plain(ctx, dim('#f6d33c', 0.4), (c) => c.rect(bx + bw - 10, by + 5 + r * 5, 6, 1.2));
  }
}

// C: OPEN, BUT NOBODY HOME. The units are open to the concourse: a dark
// interior, a back counter with the chairs stacked on it, the menu board still
// up, and in one of them a drinks fridge that never lost power.
function goodsIcon(ctx, kind, cx, cy, s, col) {
  const u = 10;
  if (kind === 'pretzel') {
    stroke(ctx, col, 1.6 * s, (c) => {
      c.ellipse(cx - 2.6 * s, cy, 3 * s, 2.6 * s, 0, 0, Math.PI * 2);
      c.moveTo(cx + 5.6 * s, cy); c.ellipse(cx + 2.6 * s, cy, 3 * s, 2.6 * s, 0, 0, Math.PI * 2);
    });
  } else if (kind === 'wok') {
    shape(ctx, col, u, (c) => { c.moveTo(cx - 5 * s, cy - 1 * s); c.quadraticCurveTo(cx, cy + 5 * s, cx + 5 * s, cy - 1 * s); c.closePath(); });
    stroke(ctx, col, 1 * s, (c) => { c.moveTo(cx + 5 * s, cy - 1 * s); c.lineTo(cx + 9 * s, cy - 3 * s); });
  } else if (kind === 'pizza') {
    shape(ctx, col, u, (c) => { c.moveTo(cx - 5 * s, cy - 3 * s); c.lineTo(cx + 5 * s, cy - 3 * s); c.lineTo(cx, cy + 5 * s); c.closePath(); });
  } else if (kind === 'cup') {
    shape(ctx, col, u, (c) => { c.moveTo(cx - 3.5 * s, cy - 4 * s); c.lineTo(cx + 3.5 * s, cy - 4 * s); c.lineTo(cx + 2.5 * s, cy + 4 * s); c.lineTo(cx - 2.5 * s, cy + 4 * s); c.closePath(); });
    stroke(ctx, col, 0.9 * s, (c) => { c.moveTo(cx + 1 * s, cy - 4 * s); c.lineTo(cx + 2.5 * s, cy - 8 * s); });
  } else {
    shape(ctx, col, u, (c) => c.ellipse(cx, cy, 5 * s, 3.4 * s, -0.2, 0, Math.PI * 2));
  }
}
function frontsOpen(ctx, sx, unit, t, i) {
  const x0 = sx - UNIT_W / 2;
  const ix = x0 + 3, iw = UNIT_W - 6, iy = OPEN_Y, ih = FLOOR - OPEN_Y;
  // The dark box of the unit.
  plain(ctx, '#0f0b16', (c) => c.rect(ix, iy, iw, ih));
  // Back-wall tiling, barely there.
  for (let ty = iy + 6; ty < FLOOR - 30; ty += 6) {
    plain(ctx, '#17121f', (c) => c.rect(ix, ty, iw, 0.6));
  }
  // The menu board on the back wall, its lightbox almost gone.
  const mb = { x: ix + 8, y: iy + 6, w: iw - 16, h: 18 };
  plain(ctx, '#1c1626', (c) => c.rect(mb.x, mb.y, mb.w, mb.h));
  for (let r = 0; r < 3; r++) {
    plain(ctx, '#2e2638', (c) => c.rect(mb.x + 3, mb.y + 4 + r * 4.6, mb.w * 0.5, 1.2));
    plain(ctx, '#3a3020', (c) => c.rect(mb.x + mb.w - 10, mb.y + 4 + r * 4.6, 7, 1.2));
  }
  goodsIcon(ctx, unit.goods, mb.x + mb.w * 0.78, mb.y - 0.5 + mb.h * 0.5, 0.9, '#3a3040');
  // A drinks fridge in unit 3, still humming: the one bright thing inside.
  if (i === 3) {
    const fx = ix + iw - 18, fy = iy + 28, fw = 14, fh = FLOOR - fy - 24;
    shape(ctx, '#2a3440', 12, (c) => rr(c, fx, fy, fw, fh, 1));
    const fl = flick(t, 9);
    plain(ctx, mix('#18303a', '#7fe8ff', 0.55 * fl), (c) => c.rect(fx + 1.5, fy + 2, fw - 3, fh - 4));
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 3; k++) {
        plain(ctx, ['#e04848', '#f6d33c', '#48c0e0'][(r + k) % 3], (c) => c.rect(fx + 2.5 + k * 3.4, fy + 4 + r * ((fh - 8) / 4), 2, 4));
      }
    }
    glow(ctx, fx + fw / 2, FLOOR - 4, 24, 6, '#7fe8ff', 0.2 * fl);
  }
  // The service counter across the front, waist high — the cabinet stands
  // against it.
  const cy = FLOOR - 26;
  plain(ctx, d('#4a4458'), (c) => c.rect(ix, cy, iw, 26));
  plain(ctx, d('#6a6478'), (c) => c.rect(ix - 1, cy - 2, iw + 2, 3));
  plain(ctx, d(mix(unit.box, INK, 0.25)), (c) => c.rect(ix, cy + 6, iw, 4));
  // Chairs stacked upside down on the counter: closed for the night, for good.
  for (const fx of [0.08, 0.72]) {
    const cx0 = ix + iw * fx;
    plain(ctx, d('#c86a3c'), (c) => c.rect(cx0, cy - 9, 12, 2));
    plain(ctx, d('#c86a3c'), (c) => c.rect(cx0 + 10, cy - 17, 2, 10));
    stroke(ctx, d('#8a8a98'), 0.9, (c) => {
      c.moveTo(cx0 + 1, cy - 9); c.lineTo(cx0 + 1, cy - 19);
      c.moveTo(cx0 + 9, cy - 9); c.lineTo(cx0 + 9, cy - 19);
    });
  }
  // Fascia sign: painted lettering on a band, no lightbox.
  plain(ctx, d('#3a3248'), (c) => c.rect(x0, FASCIA_Y, UNIT_W, FASCIA_H));
  plain(ctx, d(unit.box), (c) => c.rect(x0 + 2, FASCIA_Y + 2, UNIT_W - 4, FASCIA_H - 4));
  sign(ctx, unit.name, sx, FASCIA_Y + FASCIA_H / 2, d(unit.ink), UNIT_W - 12, 0.62);
}

// D: THE MALL DID IT. One continuous fascia across every unit in mall beige,
// identical box letters, a few shutters half up, and a big FOOD COURT sign
// hung from the ceiling over the middle. The corporate version of the room.
function frontsMall(ctx, sx, unit, t, i) {
  const x0 = sx - UNIT_W / 2;
  const up = [0, 0.35, 0, 0.6, 0][i % 5];
  shutter(ctx, x0 + 3, OPEN_Y + 4, UNIT_W - 6, FLOOR - OPEN_Y - 6, '#8a8678', up);
  if (up > 0) {
    // The slice of unit under a half-raised shutter: a stool, a box.
    const by = FLOOR - 4;
    plain(ctx, '#2a2234', (c) => c.rect(x0 + 12, by - 8, 10, 8));
    plain(ctx, '#2a2234', (c) => c.rect(x0 + UNIT_W - 22, by - 12, 3, 12));
    plain(ctx, '#2a2234', (c) => c.rect(x0 + UNIT_W - 26, by - 13, 11, 2));
  }
  const on = unit.lit ? flick(t, i * 3 + 2) : 0.25;
  const col = on > 0.3 ? mix('#6a5a3a', '#3a2408', on) : '#8a7e64';
  sign(ctx, unit.name, sx, FASCIA_Y + FASCIA_H / 2, col, UNIT_W - 14, 0.62, 'title');
}
function mallBand(ctx, x0, x1) {
  plain(ctx, dim('#cfc4a4', 0.22), (c) => c.rect(x0, FASCIA_Y - 3, x1 - x0, FASCIA_H + 6));
  plain(ctx, d('#8e8670'), (c) => c.rect(x0, FASCIA_Y + FASCIA_H + 1, x1 - x0, 2));
  plain(ctx, d('#d6ccb0'), (c) => c.rect(x0, FASCIA_Y - 3, x1 - x0, 1.5));
  // The sign bays on the band, one per unit, slightly darker.
}
function hangingSign(ctx, cx, t) {
  // Hung on long drops so it clears the fascia band and floats over the
  // shutters, the way a mall hangs its wayfinding below the shop signs.
  const y = FASCIA_Y + FASCIA_H + 8;
  stroke(ctx, '#4a4658', 0.8, (c) => { c.moveTo(cx - 30, CAM_Y); c.lineTo(cx - 30, y + 6); c.moveTo(cx + 30, CAM_Y); c.lineTo(cx + 30, y + 6); });
  shape(ctx, '#2a5a6a', 12, (c) => rr(c, cx - 40, y + 6, 80, 14, 2));
  plain(ctx, '#3a7a8a', (c) => c.rect(cx - 38, y + 8, 76, 1.5));
  // Fork and knife.
  stroke(ctx, '#f2ead2', 1, (c) => {
    c.moveTo(cx - 32, y + 9); c.lineTo(cx - 32, y + 17);
    c.moveTo(cx - 34, y + 9); c.lineTo(cx - 34, y + 12); c.moveTo(cx - 30, y + 9); c.lineTo(cx - 30, y + 12);
    c.moveTo(cx - 34, y + 12); c.lineTo(cx - 30, y + 12);
    c.moveTo(cx + 32, y + 9); c.lineTo(cx + 32, y + 17);
  });
  plain(ctx, '#f2ead2', (c) => c.ellipse(cx + 32.6, y + 11, 1.2, 2.4, 0, 0, Math.PI * 2));
  sign(ctx, 'FOOD COURT', cx, y + 13, '#f2ead2', 56, 0.8);
}

export const FRONTS_CANDIDATES = [
  { key: 'A', name: 'SHUTTERS DOWN', paint: frontsShutters,
    note: 'Every cabinet backed onto a closed unit: lightbox fascia, roller shutter. Two signs still run '
      + '(PRETZEL PALACE, SMOOTHIE OPERATOR) and flicker; the rest are dead plastic. A notice taped to one shutter.' },
  { key: 'B', name: 'NEON ON THE WALL', paint: frontsNeon,
    note: 'No shop carcasses — the wall stays the wall. Tube signs with a letter out, one dead outright, and a '
      + 'small menu lightbox under each. The lightest touch; closest to today\'s posters.' },
  { key: 'C', name: 'OPEN, NOBODY HOME', paint: frontsOpen,
    note: 'Open units: dark interior, menu board, chairs stacked upside down on the counter, and one drinks fridge '
      + 'that never lost power. The cabinets stand against the service counters, as if wheeled in.' },
  { key: 'D', name: 'THE MALL DID IT', paint: frontsMall, band: true,
    note: 'One continuous beige mall fascia with identical box letters (two lit), shutters part raised on two units, '
      + 'and a FOOD COURT sign hung from the ceiling. The corporate version.' },
];

// The card. Four cabinets (2–5) and the units behind them, the camera parked
// where the hub's would be with the player at the third machine. `null` is
// today's wall, for reference.
export function drawFrontsMock(ctx, t, cand) {
  const camX = 140;
  roomShell(ctx, camX, t);
  const xs = [1, 2, 3, 4, 5].map((k) => 96 + k * PITCH - camX);
  if (cand) {
    if (cand.band) mallBand(ctx, xs[0] - PITCH / 2, xs[xs.length - 1] + PITCH / 2);
    xs.forEach((sx, i) => pilaster(ctx, sx - PITCH / 2));
    xs.forEach((sx, i) => cand.paint(ctx, sx, UNITS[i], t, i));
  } else {
    xs.forEach((sx, i) => {
      // Today: one blank poster per machine, at the hub's poster line.
      plain(ctx, '#1a1424', (c) => c.rect(sx - HUB_ROOM.posterW / 2, HUB_ROOM.posterTopY, HUB_ROOM.posterW, HUB_ROOM.posterH));
      plain(ctx, '#2a2234', (c) => c.rect(sx - HUB_ROOM.posterW / 2 + 3, HUB_ROOM.posterTopY + 3, HUB_ROOM.posterW - 6, HUB_ROOM.posterH - 14));
    });
  }
  ceiling(ctx, camX, t);
  if (cand && cand.band) hangingSign(ctx, xs[2], t);
  xs.forEach((sx, i) => cabinet(ctx, CABINETS[1 + i], sx, t));
  drawToon(ctx, 'lorenzo', idle(t, 0, 1), xs[2] - 42, FLOOR, NPC_H, { lit: 0.85 });
  ctx.restore();
}

// ===================================================================
// SEATING — the plaza between the last machine and the serving line.
// ===================================================================
// The plaza is 96 units today. Every card here shows it one cabinet pitch
// wider (184), which is what a table-and-chairs set plus somewhere to walk
// needs; that widening is part of the proposal, not a free lunch.
const PLAZA = 184;

// Tray, cup, fries: the still life that says somebody ate here.
function tableTop(ctx, cx, topY, s = 1) {
  // Tray.
  plain(ctx, d('#8a6a56'), (c) => c.rect(cx - 7 * s, topY - 1.4, 14 * s, 1.4));
  // Cup with lid and straw.
  shape(ctx, d('#e8e0d0'), 10, (c) => { c.moveTo(cx + 1, topY - 1.4); c.lineTo(cx + 5, topY - 1.4); c.lineTo(cx + 5.6, topY - 9); c.lineTo(cx + 0.4, topY - 9); c.closePath(); });
  plain(ctx, d('#e04848'), (c) => c.rect(cx + 0.6, topY - 6.5, 4.8, 2));
  plain(ctx, d('#c8c8d8'), (c) => c.rect(cx + 0.2, topY - 9.8, 5.6, 1));
  stroke(ctx, d('#f6d33c'), 0.7, (c) => { c.moveTo(cx + 3.6, topY - 9.8); c.lineTo(cx + 5, topY - 14); });
  // Fries carton.
  plain(ctx, d('#f6d33c'), (c) => { c.moveTo(cx - 5.5, topY - 7); c.lineTo(cx - 5, topY - 3.5); c.lineTo(cx - 5.5, topY - 1.4); c.lineTo(cx - 1, topY - 1.4); c.lineTo(cx - 1.5, topY - 3.5); c.lineTo(cx - 1, topY - 7); });
  plain(ctx, d('#c83a2e'), (c) => c.rect(cx - 5.4, topY - 4.6, 4.3, 3.2));
}

// S1: BOLTED PLASTIC. The real food-court set: a table on one pedestal with
// two swivel seats on arms off the same base — you cannot move any of it, which
// is the point. Orange seats, laminate top.
function seatBolted(ctx, cx, t, k) {
  const top = FLOOR - 21, seat = FLOOR - 13;
  const base = d('#6a6a78');
  // The shared foot and the two arms out to the seats.
  plain(ctx, base, (c) => c.rect(cx - 14, FLOOR - 2, 28, 2));
  plain(ctx, base, (c) => c.rect(cx - 1, top, 2, FLOOR - top));
  stroke(ctx, base, 1.6, (c) => {
    c.moveTo(cx, FLOOR - 4); c.lineTo(cx - 14, FLOOR - 4); c.lineTo(cx - 14, seat);
    c.moveTo(cx, FLOOR - 4); c.lineTo(cx + 14, FLOOR - 4); c.lineTo(cx + 14, seat);
  });
  for (const s of [-1, 1]) {
    shape(ctx, d(['#f08a3c', '#48b0b8'][k % 2]), 10, (c) => rr(c, cx + s * 14 - 5, seat - 2.5, 10, 3, 1.3));
  }
  shape(ctx, d('#e8e0d0'), 10, (c) => rr(c, cx - 11, top - 2, 22, 2.4, 0.8));
  plain(ctx, d('#b8b0a0'), (c) => c.rect(cx - 11, top + 0.2, 22, 0.6));
  if (k !== 1) tableTop(ctx, cx + (k ? 2 : -2), top - 2);
}

// S2: BOOTHS. High-backed vinyl benches facing each other across a table: the
// side view a booth was made for. Red vinyl, chrome edging, a napkin dispenser.
function seatBooth(ctx, cx, t, k) {
  const top = FLOOR - 20, seat = FLOOR - 12, back = FLOOR - 30;
  const vinyl = d(k % 2 ? '#b83a3a' : '#2e7a7a');
  for (const s of [-1, 1]) {
    const bx = cx + s * 17;
    // Back, then the seat, then the plinth.
    shape(ctx, vinyl, 10, (c) => rr(c, bx - 3, back, 6, seat - back + 1, 2.5));
    shape(ctx, vinyl, 10, (c) => rr(c, s < 0 ? bx - 3 : bx - 8, seat - 2, 11, 4, 1.5));
    plain(ctx, d('#3a3248'), (c) => c.rect(s < 0 ? bx - 3 : bx - 8, seat + 2, 11, FLOOR - seat - 2));
    plain(ctx, d('#c8c8d8'), (c) => c.rect(bx - 3, back + 1, 6, 0.8));
  }
  plain(ctx, d('#6a6a78'), (c) => c.rect(cx - 1, top, 2, FLOOR - top));
  plain(ctx, d('#6a6a78'), (c) => c.rect(cx - 5, FLOOR - 1.5, 10, 1.5));
  shape(ctx, d('#e8e0d0'), 10, (c) => rr(c, cx - 9, top - 2, 18, 2.4, 0.6));
  plain(ctx, d('#c8c8d8'), (c) => c.rect(cx - 9, top + 0.3, 18, 0.7));
  // Napkin dispenser and a ketchup bottle.
  shape(ctx, d('#9aa8b4'), 10, (c) => rr(c, cx - 6, top - 7, 5, 5, 0.6));
  plain(ctx, d('#f2f2f2'), (c) => c.rect(cx - 5.5, top - 8, 4, 1.2));
  shape(ctx, d('#d83a2e'), 10, (c) => rr(c, cx + 2, top - 8, 2.6, 6, 1));
  if (k === 0) tableTop(ctx, cx + 6, top - 2, 0.7);
}

// S3: CLOSING TIME. A long communal table with moulded chairs, most of them
// upside down on top of it, and the mop bucket left out beside a wet-floor sign.
function seatClosing(ctx, cx, t, k) {
  const top = FLOOR - 21;
  const tw = 46;
  plain(ctx, d('#6a6a78'), (c) => c.rect(cx - tw / 2 + 3, top, 2, FLOOR - top));
  plain(ctx, d('#6a6a78'), (c) => c.rect(cx + tw / 2 - 5, top, 2, FLOOR - top));
  shape(ctx, d('#c8b89a'), 10, (c) => rr(c, cx - tw / 2, top - 2, tw, 2.4, 0.6));
  const chairCol = d(['#48b0b8', '#f08a3c', '#9fd86a'][k % 3]);
  // Upturned on the table.
  for (const fx of [-15, 1]) {
    const x0 = cx + fx;
    plain(ctx, chairCol, (c) => c.rect(x0, top - 6, 13, 2));
    plain(ctx, chairCol, (c) => c.rect(x0 + 11, top - 14, 2.2, 9));
    stroke(ctx, d('#8a8a98'), 0.9, (c) => {
      c.moveTo(x0 + 1.5, top - 6); c.lineTo(x0 + 1.5, top - 16);
      c.moveTo(x0 + 10, top - 6); c.lineTo(x0 + 10, top - 16);
    });
  }
  // One left standing, as if somebody is coming back for it.
  const sx = cx + tw / 2 + 6;
  plain(ctx, chairCol, (c) => c.rect(sx - 6, FLOOR - 13, 12, 2));
  plain(ctx, chairCol, (c) => c.rect(sx + 4, FLOOR - 25, 2.2, 12));
  stroke(ctx, d('#8a8a98'), 0.9, (c) => {
    c.moveTo(sx - 5, FLOOR - 11); c.lineTo(sx - 5, FLOOR);
    c.moveTo(sx + 5, FLOOR - 11); c.lineTo(sx + 5, FLOOR);
  });
}
function wetFloorSign(ctx, x) {
  shape(ctx, '#f6d33c', 10, (c) => { c.moveTo(x - 5, FLOOR); c.lineTo(x - 1, FLOOR - 16); c.lineTo(x + 1, FLOOR - 16); c.lineTo(x + 5, FLOOR); c.closePath(); });
  plain(ctx, '#2a1c06', (c) => { c.moveTo(x - 2, FLOOR - 7); c.lineTo(x, FLOOR - 11); c.lineTo(x + 2, FLOOR - 7); c.closePath(); });
}
function mopBucket(ctx, x) {
  shape(ctx, d('#e8c83c'), 10, (c) => rr(c, x - 6, FLOOR - 9, 12, 8, 1));
  plain(ctx, d('#3a3248'), (c) => c.ellipse(x - 4, FLOOR - 0.8, 1.4, 1.2, 0, 0, Math.PI * 2));
  plain(ctx, d('#3a3248'), (c) => c.ellipse(x + 4, FLOOR - 0.8, 1.4, 1.2, 0, 0, Math.PI * 2));
  stroke(ctx, d('#a08a6a'), 1.1, (c) => { c.moveTo(x + 2, FLOOR - 8); c.lineTo(x + 7, FLOOR - 34); });
}

// S4: ATRIUM CAFÉ. Round tables under striped umbrellas, wire bistro chairs,
// and a plastic palm in a planter: the mall trying for the seaside.
function seatAtrium(ctx, cx, t, k) {
  const top = FLOOR - 21;
  const stripe = k % 2 ? ['#e04848', '#f2ead2'] : ['#2e8a9a', '#f2ead2'];
  // Umbrella pole and canopy.
  plain(ctx, d('#c8c8d8'), (c) => c.rect(cx - 0.6, FLOOR - 52, 1.2, 52));
  const cy = FLOOR - 52, rw = 22;
  for (let s = 0; s < 6; s++) {
    plain(ctx, d(stripe[s % 2]), (c) => {
      const a0 = -rw + (s * 2 * rw) / 6, a1 = -rw + ((s + 1) * 2 * rw) / 6;
      c.moveTo(cx, cy - 7); c.lineTo(cx + a0, cy + 2); c.lineTo(cx + a1, cy + 2); c.closePath();
    });
  }
  stroke(ctx, 'rgba(26,16,40,0.34)', 0.6, (c) => { c.moveTo(cx - rw, cy + 2); c.lineTo(cx, cy - 7); c.lineTo(cx + rw, cy + 2); c.closePath(); });
  for (let s = 0; s < 6; s++) {
    plain(ctx, d(stripe[s % 2]), (c) => c.ellipse(cx - rw + (s + 0.5) * (2 * rw / 6), cy + 2, rw / 6, 1.6, 0, 0, Math.PI));
  }
  // Round table, side on.
  plain(ctx, d('#8a8a98'), (c) => c.rect(cx - 5, FLOOR - 1.5, 10, 1.5));
  shape(ctx, d('#e8e0d0'), 10, (c) => c.ellipse(cx, top - 1, 11, 1.8, 0, 0, Math.PI * 2));
  // Two wire chairs.
  for (const s of [-1, 1]) {
    const x = cx + s * 16;
    stroke(ctx, d('#c8c8d8'), 0.9, (c) => {
      c.moveTo(x - 4, FLOOR); c.lineTo(x - 3, FLOOR - 12); c.lineTo(x + 3, FLOOR - 12); c.lineTo(x + 4, FLOOR);
      const bx = x + s * 3.5;
      c.moveTo(bx, FLOOR - 12); c.lineTo(bx + s * 1, FLOOR - 24);
    });
    stroke(ctx, d('#c8c8d8'), 0.7, (c) => { c.ellipse(x + s * 4.4, FLOOR - 21, 2.2, 3, 0, 0, Math.PI * 2); });
    plain(ctx, d('#c8c8d8'), (c) => c.rect(x - 4, FLOOR - 13, 8, 1.4));
  }
  if (k === 0) tableTop(ctx, cx, top - 2, 0.8);
}
function planterPalm(ctx, x, t) {
  shape(ctx, d('#8a6a56'), 10, (c) => rr(c, x - 8, FLOOR - 14, 16, 14, 1.5));
  plain(ctx, d('#6a4e40'), (c) => c.rect(x - 8, FLOOR - 14, 16, 2));
  plain(ctx, d('#7a6248'), (c) => c.rect(x - 1.2, FLOOR - 50, 2.4, 36));
  const sway = Math.sin(t * 0.6) * 0.04;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.55 + sway;
    shape(ctx, d(i % 2 ? '#3a8a4a' : '#4aa05a'), 10, (c) => {
      const tx = x + Math.cos(a) * 20, ty = FLOOR - 50 + Math.sin(a) * 9 + 8;
      c.moveTo(x, FLOOR - 50);
      c.quadraticCurveTo((x + tx) / 2, FLOOR - 58, tx, ty);
      c.quadraticCurveTo((x + tx) / 2, FLOOR - 52, x, FLOOR - 48);
      c.closePath();
    });
  }
}

export const SEATING_CANDIDATES = [
  { key: '1', name: 'BOLTED PLASTIC — SHIPS', sets: 3, paint: seatBolted,
    note: 'The real food-court set: one pedestal, two swivel seats on arms off the same base, a laminate top. '
      + 'Orange and teal seats; trays with a cup and fries left on two of them.' },
  { key: '2', name: 'BOOTHS', sets: 2, paint: seatBooth,
    note: 'High-backed vinyl booths facing across a table — the side view a booth is built for. Red and teal vinyl, '
      + 'chrome trim, napkin dispenser and ketchup. Taller, so it fills the plaza with fewer pieces.' },
  { key: '3', name: 'CLOSING TIME', sets: 2, paint: seatClosing, extras: (ctx, x0, x1, t) => {
    mopBucket(ctx, x1 - 18); wetFloorSign(ctx, x1 - 6);
  },
    note: 'Long communal tables, the chairs upturned on top except one left out. A mop bucket and a wet-floor sign '
      + '(the Dust Devil\'s, presumably). The most derelict; ties to the vacuum gag.' },
  { key: '4', name: 'ATRIUM CAFÉ', sets: 2, paint: seatAtrium, extras: (ctx, x0, x1, t) => {
    planterPalm(ctx, x0 + 10, t);
  },
    note: 'Round tables under striped umbrellas, wire bistro chairs, a plastic palm in a planter: the mall trying '
      + 'for the seaside. The brightest and the tallest — the umbrellas reach the poster line.' },
];

// The card: the last machine on the left, the plaza, and Dolores's counter
// coming in on the right. `null` is today's plaza (at today's 96).
export function drawSeatingMock(ctx, t, cand) {
  const plaza = cand ? PLAZA : 96;
  const lastCab = 96 + 8 * PITCH;
  const camX = lastCab - 34;
  const counterX = lastCab + PITCH + plaza;
  roomShell(ctx, camX, t);
  ceiling(ctx, camX, t);
  const cabSx = lastCab - camX;
  // Neighbour machine half off the left edge, and the last one.
  cabinet(ctx, CABINETS[7], cabSx - PITCH, t);
  cabinet(ctx, CABINETS[8], cabSx, t);
  const cSx = counterX - camX;
  drawCounter(ctx, cSx - COUNTER_W / 2, FLOOR - COUNTER_H, COUNTER_W, COUNTER_H, {
    t, variant: 'serving',
    server: (c) => drawToon(c, 'dolores', idle(t, 2, -1), cSx - COUNTER_W / 2 + COUNTER_W * COUNTER_STAFF_X, FLOOR, DOLORES_H, { lit: 0.9 }),
  });
  if (cand) {
    // Lay the sets out evenly across the free floor between the machine and
    // the counter, keeping a walking gap at each end.
    const x0 = cabSx + CAB_W / 2 + 14, x1 = cSx - COUNTER_W / 2 - 10;
    if (cand.extras) cand.extras(ctx, x0, x1, t);
    const n = cand.sets;
    const span = (x1 - x0) - (cand.extras ? 18 : 0);
    const start = x0 + (cand.extras && cand.key === '4' ? 22 : 0);
    const at = (k) => start + span * ((k + 0.5) / n);
    for (let k = 0; k < n; k++) {
      // Contact shadow, so the set stands on the tiles rather than in front of them.
      ctx.save();
      ctx.globalAlpha = 0.35;
      plain(ctx, '#0e0a16', (c) => c.ellipse(at(k), FLOOR + 1, 24, 2.6, 0, 0, Math.PI * 2));
      ctx.restore();
      cand.paint(ctx, at(k), t, k);
    }
    // A hero in the aisle between the first two sets, for scale.
    drawToon(ctx, 'clara', idle(t, 1, 1), (at(0) + at(1)) / 2, FLOOR, NPC_H, { lit: 0.85 });
  } else {
    drawToon(ctx, 'clara', idle(t, 1, 1), cabSx + CAB_W / 2 + 30, FLOOR, NPC_H, { lit: 0.85 });
  }
  ctx.restore();
}

// ===================================================================
// THE PLAZA WALL — what hangs behind the new tables. Asked 11 Oct 2026, the
// same day the bolted tables went in: the wall over the plaza is the one
// stretch between the last cabinet's poster and Dolores's menu board with
// nothing on it. Every card is the shipped room — the real tables at their
// real x, the real menu board — plus one candidate on that wall.
// ===================================================================
const LAST_CAB = 96 + 8 * PITCH;
const PLAZA_COUNTER = LAST_CAB + PITCH + 96 + 88;   // the shipped PLAZA_W
const PLAZA_TABLE_XS = [865.5, 920.5, 975.5];
// The wall's own light over the plaza: the service end runs between
// SERVICE_LIT_FLOOR and full with progress, so a mid-campaign value.
const PLAZA_WALL_LIT = 0.55;
const POSTER_TOP = HUB_ROOM.posterTopY;

// Shade a rectangle of wall dressing the way drawWallBay does, but only over
// the dressing itself, so the bare wall round it keeps the room's own value.
function shadeRect(ctx, x, y, w, h) { shadeWall(ctx, x, y, w, h, PLAZA_WALL_LIT); }
function tape(ctx, x, y) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  plain(ctx, '#ece6d6', (c) => c.rect(x - 3, y - 1.5, 6, 3));
  ctx.restore();
}

// P1: TRY THE PRETZEL. A promo one-sheet, glossy and over-lit, for the stand
// the LED slogan has been pushing all along. Hung on the poster line.
function wallPretzel(ctx, cx, t) {
  const w = 46, h = 60, x = cx - w / 2, y = POSTER_TOP - 2;
  shape(ctx, '#f4e2b8', 10, (c) => rr(c, x, y, w, h, 0.8));
  plain(ctx, '#d8402e', (c) => c.rect(x + 2, y + 2, w - 4, 12));
  sign(ctx, 'TRY THE', cx, y + 8, '#fff4d8', w - 10, 0.62);
  // The pretzel, big and brown, salt flecks on it.
  // A pretzel is a heart with its two ends knotted across the middle: the
  // outline loops up over two lobes and down to a point, and the ends cross.
  const py = y + 30;
  const knot = (c) => {
    c.moveTo(cx - 4, py + 9);
    c.bezierCurveTo(cx - 24, py - 2, cx - 14, py - 16, cx, py - 6);
    c.bezierCurveTo(cx + 14, py - 16, cx + 24, py - 2, cx + 4, py + 9);
    c.moveTo(cx - 9, py + 9); c.quadraticCurveTo(cx, py - 2, cx + 6, py - 4);
    c.moveTo(cx + 9, py + 9); c.quadraticCurveTo(cx, py - 2, cx - 6, py - 4);
  };
  stroke(ctx, '#7a4418', 5.4, knot);
  stroke(ctx, '#a8642a', 3.8, knot);
  stroke(ctx, '#d0904a', 1.1, (c) => {
    c.moveTo(cx - 15, py - 4); c.bezierCurveTo(cx - 13, py - 11, cx - 6, py - 11, cx - 2, py - 7);
    c.moveTo(cx + 15, py - 4); c.bezierCurveTo(cx + 13, py - 11, cx + 6, py - 11, cx + 2, py - 7);
  });
  for (const [sx, sy] of [[-12, 23], [-6, 21], [6, 21], [12, 23], [-15, 29], [15, 29], [-5, 34], [5, 34]]) {
    plain(ctx, '#ffffff', (c) => c.rect(cx + sx, y + sy, 1, 1));
  }
  sign(ctx, 'PRETZEL', cx, y + 46, '#d8402e', w - 8, 0.8);
  drawTextCentered(ctx, 'NOW 40% MORE PRETZEL', cx, y + 52, '#6a4a2a', 0.27, 'bold');
  shadeRect(ctx, x, y, w, h);
  tape(ctx, x + 4, y + 1); tape(ctx, x + w - 4, y + 1);
}

// P2: HOUSE RULES. An enamel sign screwed to the wall, the kind every food
// court has and nobody has read. Three rules, the third one correctable.
function wallRules(ctx, cx, t) {
  const w = 58, h = 44, x = cx - w / 2, y = POSTER_TOP + 4;
  shape(ctx, '#f2efe6', 10, (c) => rr(c, x, y, w, h, 2.5));
  plain(ctx, '#2a5a8a', (c) => rr(c, x + 2, y + 2, w - 4, 10, 1.5));
  sign(ctx, 'FOOD COURT RULES', cx, y + 7, '#f2efe6', w - 10, 0.5);
  const rules = ['NO OUTSIDE FOOD.', 'NO INSIDE FOOD EITHER.', 'RETURN ALL TRAYS.'];
  rules.forEach((r, i) => {
    const ry = y + 17 + i * 8;
    plain(ctx, '#2a5a8a', (c) => c.ellipse(x + 6, ry, 1.1, 1.1, 0, 0, Math.PI * 2));
    const sc = Math.min(0.36, (w - 16) / Math.max(1, textWidth(r, 1, 'bold')));
    drawText(ctx, r, x + 9, ry - sc * 4.6, '#2a2a3a', sc, 'bold');
  });
  // Somebody's correction, in the menu board's marker.
  stroke(ctx, '#0d5f57', 0.6, (c) => { c.moveTo(x + 9, y + 33); c.lineTo(x + w - 8, y + 33); });
  drawTextCentered(ctx, 'TO THE YEAR ISSUED', cx + 3, y + 36.4, '#0d5f57', 0.3, 'marker');
  for (const [sx, sy] of [[3.5, 3.5], [w - 3.5, 3.5], [3.5, h - 3.5], [w - 3.5, h - 3.5]]) {
    plain(ctx, '#8a8a98', (c) => c.ellipse(x + sx, y + sy, 0.9, 0.9, 0, 0, Math.PI * 2));
  }
  shadeRect(ctx, x, y, w, h);
}

// P3: THE MURAL. A long faded 1980s mural over the whole plaza: sunset, palm
// trees, a family at a table, MEET ME AT THE FOOD COURT in script, and paint
// coming off in patches so the wall shows through.
function wallMural(ctx, cx, t) {
  const w = 170, h = 64, x = cx - w / 2, y = POSTER_TOP;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#5a4a9a'); g.addColorStop(0.45, '#d86a8a'); g.addColorStop(0.75, '#f2a860'); g.addColorStop(1, '#f2c880');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  // The sun, with the 80s stripes cut through it.
  plain(ctx, '#ffd870', (c) => c.ellipse(cx + 30, y + 40, 18, 18, 0, 0, Math.PI * 2));
  for (let k = 0; k < 4; k++) plain(ctx, '#f2a860', (c) => c.rect(cx + 10, y + 42 + k * 4, 40, 1.2 + k * 0.5));
  // Palms on either side.
  for (const px of [x + 18, x + w - 22]) {
    plain(ctx, '#3a2a5a', (c) => c.rect(px - 1, y + 22, 2.2, h - 22));
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.6;
      plain(ctx, '#3a2a5a', (c) => {
        c.moveTo(px, y + 22);
        c.quadraticCurveTo(px + Math.cos(a) * 8, y + 14, px + Math.cos(a) * 15, y + 22 + Math.sin(a) * 4 + 6);
        c.quadraticCurveTo(px + Math.cos(a) * 8, y + 19, px, y + 24);
      });
    }
  }
  // The happy diners: a table and three silhouettes.
  plain(ctx, '#3a2a5a', (c) => c.rect(cx - 40, y + h - 14, 30, 2));
  plain(ctx, '#3a2a5a', (c) => c.rect(cx - 26, y + h - 12, 2, 12));
  for (const [fx, hh] of [[-44, 20], [-14, 18], [-29, 14]]) {
    plain(ctx, '#3a2a5a', (c) => c.ellipse(cx + fx, y + h - hh - 3, 3.2, 3.2, 0, 0, Math.PI * 2));
    plain(ctx, '#3a2a5a', (c) => rr(c, cx + fx - 3.5, y + h - hh, 7, hh, 2.5));
  }
  // The line, in the title face, on a pale band so it reads.
  plain(ctx, 'rgba(255,244,216,0.82)', (c) => c.rect(x, y + 3, w, 13));
  sign(ctx, 'MEET ME AT THE FOOD COURT', cx, y + 9.5, '#c83a6a', w - 16, 0.8);
  // Peeling: patches of bare wall where the paint has come away.
  // Bare plaster under the paint is a shade lighter than the wall it sits on,
  // with the torn edge catching a pale rim, so a patch reads as paint gone
  // rather than as a hole.
  for (const [px, py, pw, ph] of [[x + 40, y + 30, 14, 9], [x + w - 30, y + 20, 14, 7], [cx + 4, y + h - 10, 10, 10], [x + 4, y + h - 18, 8, 14]]) {
    const patch = (c) => {
      c.moveTo(px, py); c.lineTo(px + pw, py + 1); c.lineTo(px + pw - 2, py + ph * 0.6);
      c.lineTo(px + pw * 0.6, py + ph); c.lineTo(px + 1, py + ph - 1); c.closePath();
    };
    plain(ctx, '#4a4258', patch);
    stroke(ctx, 'rgba(255,244,216,0.5)', 0.5, patch);
  }
  ctx.restore();
  // Faded, and then lit by the room: the mural is old paint, not a lightbox.
  ctx.save();
  ctx.globalAlpha = 0.28;
  plain(ctx, WALL, (c) => c.rect(x, y, w, h));
  ctx.restore();
  shadeRect(ctx, x, y, w, h);
}

// P4: SPECIALS BOARD. A framed chalkboard on the wall with today's special,
// corrected by hand the way the menu board is: it has always been soup.
function wallSpecials(ctx, cx, t) {
  const w = 44, h = 52, x = cx - w / 2, y = POSTER_TOP;
  shape(ctx, '#7a5236', 10, (c) => rr(c, x, y, w, h, 1.5));
  plain(ctx, '#23302a', (c) => c.rect(x + 3, y + 3, w - 6, h - 6));
  // Chalk dust where it has been wiped and rewritten.
  ctx.save(); ctx.globalAlpha = 0.12;
  plain(ctx, '#e8efe8', (c) => c.ellipse(cx + 4, y + 30, 14, 6, 0.2, 0, Math.PI * 2));
  ctx.restore();
  sign(ctx, "TODAY'S", cx, y + 10, '#f6d33c', w - 12, 0.5, 'marker');
  sign(ctx, 'SPECIAL', cx, y + 17, '#f6d33c', w - 12, 0.5, 'marker');
  sign(ctx, 'SOUP', cx, y + 27, '#e8efe8', w - 16, 0.62, 'marker');
  stroke(ctx, '#e8efe8', 0.7, (c) => { c.moveTo(cx - 9, y + 27); c.lineTo(cx + 9, y + 27); });
  sign(ctx, 'ALSO SOUP', cx, y + 36, '#e8efe8', w - 12, 0.5, 'marker');
  sign(ctx, '2 PLUGS', cx, y + 43.5, '#f890b8', w - 16, 0.42, 'marker');
  shadeRect(ctx, x, y, w, h);
}

// ------------------------------------------------------------- more murals
// Round two of P3, asked the same day: keep the sunset palette, make the
// picture richer, and try vaporwave. Every mural shares one frame — clip, old
// paint fade, peeled patches, room light — so the cards differ only in what is
// painted, not in how it has aged.
const MW = 170, MH = 64;
function muralFrame(ctx, cx, paint, { fade = 0.24, peel = true } = {}) {
  const x = cx - MW / 2, y = POSTER_TOP;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, MW, MH); ctx.clip();
  paint(ctx, x, y, MW, MH);
  if (peel) {
    for (const [px, py, pw, ph] of [[x + 9, y + MH - 16, 9, 12], [x + MW - 34, y + 24, 12, 7], [x + 62, y + 40, 8, 6]]) {
      const patch = (c) => {
        c.moveTo(px, py); c.lineTo(px + pw, py + 1); c.lineTo(px + pw - 2, py + ph * 0.6);
        c.lineTo(px + pw * 0.6, py + ph); c.lineTo(px + 1, py + ph - 1); c.closePath();
      };
      // Where paint has flaked off it shows the pale primer coat under it, not a
      // hole: a dark patch read as broken plaster.
      plain(ctx, '#d8d0c4', patch);
      stroke(ctx, 'rgba(90,70,90,0.45)', 0.5, patch);
    }
  }
  ctx.restore();
  if (fade > 0) {
    ctx.save(); ctx.globalAlpha = fade;
    plain(ctx, WALL, (c) => c.rect(x, y, MW, MH));
    ctx.restore();
  }
  shadeRect(ctx, x, y, MW, MH);
}
function sunsetSky(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([at, col]) => g.addColorStop(at, col));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}
// The 80s sun: a disc with slices cut out of its lower half, wider apart as
// they go down.
function stripedSun(ctx, cx, cy, r, col, gapCol) {
  plain(ctx, col, (c) => c.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2));
  for (let k = 0; k < 5; k++) {
    const yy = cy + r * (0.12 + k * 0.19);
    plain(ctx, gapCol, (c) => c.rect(cx - r - 1, yy, r * 2 + 2, 0.7 + k * 0.45));
  }
}
function palm(ctx, px, base, top, col, lean = 0) {
  stroke(ctx, col, 2.2, (c) => { c.moveTo(px, base); c.quadraticCurveTo(px + lean * 0.4, (base + top) / 2, px + lean, top); });
  const tx = px + lean;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5;
    const len = 13 + (i % 2) * 3;
    plain(ctx, col, (c) => {
      c.moveTo(tx, top);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, top - 7 + Math.abs(i - 3), tx + Math.cos(a) * len, top + Math.sin(a) * 3 + 6);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, top - 3, tx, top + 2);
    });
  }
}
// Lettering on a band, the mural's title.
function muralTitle(ctx, str, cx, midY, w, col, band = 'rgba(255,244,216,0.82)', cap = 0.8) {
  if (band) plain(ctx, band, (c) => c.rect(cx - w / 2, midY - 6.5, w, 13));
  sign(ctx, str, cx, midY, col, w - 16, cap);
}

// M1: FOOD CITY. The sunset over a skyline built out of the menu: fries for
// towers, a soda cup with its straw as the radio mast, a burger dome, a pretzel
// arch, and the sea under all of it carrying the sun's stripes.
function muralFoodCity(ctx, cx) {
  muralFrame(ctx, cx, (ctx, x, y, w, h) => {
    sunsetSky(ctx, x, y, w, h, [[0, '#3a2a7a'], [0.35, '#b04a8a'], [0.62, '#f0806a'], [0.8, '#f8b860']]);
    // Stars, still up at the top of the sky.
    for (let i = 0; i < 14; i++) plain(ctx, 'rgba(255,240,220,0.7)', (c) => c.rect(x + ((i * 37) % w), y + 2 + ((i * 13) % 14), 0.8, 0.8));
    stripedSun(ctx, cx + 38, y + 38, 15, '#ffd870', '#f0806a');
    const sea = y + h - 13;
    // The skyline.
    const ink = '#4a2a6a', lit = '#ffd870';
    // Fries towers.
    for (const [fx, fh] of [[-70, 30], [-64, 36], [-58, 27]]) {
      plain(ctx, ink, (c) => c.rect(cx + fx, sea - fh, 5, fh));
      for (let wy = sea - fh + 4; wy < sea - 3; wy += 5) plain(ctx, lit, (c) => c.rect(cx + fx + 2, wy, 1, 1.4));
    }
    plain(ctx, '#c83a4a', (c) => { c.moveTo(cx - 72, sea - 17); c.lineTo(cx - 52, sea - 17); c.lineTo(cx - 54, sea); c.lineTo(cx - 70, sea); c.closePath(); });
    // Soda cup tower with a straw mast and a blinking light.
    plain(ctx, ink, (c) => { c.moveTo(cx - 44, sea - 40); c.lineTo(cx - 30, sea - 40); c.lineTo(cx - 32, sea); c.lineTo(cx - 42, sea); c.closePath(); });
    plain(ctx, ink, (c) => c.rect(cx - 45, sea - 43, 16, 3));
    stroke(ctx, ink, 1.4, (c) => { c.moveTo(cx - 36, sea - 43); c.lineTo(cx - 33, sea - 54); });
    plain(ctx, '#ff5a6a', (c) => c.ellipse(cx - 33, sea - 55, 1.2, 1.2, 0, 0, Math.PI * 2));
    for (let wy = sea - 35; wy < sea - 3; wy += 5) for (const wx of [-41, -37, -34]) plain(ctx, lit, (c) => c.rect(cx + wx, wy, 1.2, 1.4));
    // Burger dome.
    plain(ctx, ink, (c) => { c.moveTo(cx - 24, sea - 8); c.quadraticCurveTo(cx - 12, sea - 34, cx, sea - 8); c.closePath(); });
    plain(ctx, '#3a8a4a', (c) => c.rect(cx - 25, sea - 9, 26, 1.6));
    plain(ctx, ink, (c) => c.rect(cx - 24, sea - 7.4, 24, 7.4));
    for (const sx of [-18, -13, -7]) plain(ctx, lit, (c) => c.rect(cx + sx, sea - 20, 1.2, 1.2));
    // Pretzel arch, spanning the gap to the sun.
    stroke(ctx, ink, 2.6, (c) => {
      c.moveTo(cx + 2, sea); c.bezierCurveTo(cx - 2, sea - 28, cx + 18, sea - 28, cx + 12, sea - 14);
      c.moveTo(cx + 22, sea); c.bezierCurveTo(cx + 26, sea - 28, cx + 6, sea - 28, cx + 12, sea - 14);
    });
    // A hot dog blimp.
    plain(ctx, '#c86a3c', (c) => c.ellipse(cx + 66, y + 24, 9, 3.2, 0, 0, Math.PI * 2));
    plain(ctx, '#f6d33c', (c) => c.rect(cx + 60, y + 23.5, 12, 0.9));
    // The sea, with the sun laid across it in stripes.
    sunsetSky(ctx, x, sea, w, h - (sea - y), [[0, '#6a3a8a'], [1, '#2a1a4a']]);
    for (let k = 0; k < 6; k++) {
      const rw = 14 - k * 1.8;
      plain(ctx, 'rgba(255,216,112,0.75)', (c) => c.rect(cx + 38 - rw, sea + 1.5 + k * 2, rw * 2, 0.9));
    }
    palm(ctx, x + MW - 14, y + h, y + 20, '#2a1440', -4);
    muralTitle(ctx, 'MEET ME AT THE FOOD COURT', cx, y + 8, w, '#c83a6a');
  });
}

// FOOD CITY, REFINED — and its variations. Asked 11 Oct 2026 after round two:
// P3a was the pick to develop. The city is now two layers (a hazed far skyline
// and a dark near one) so it has depth, every building is a recognisable piece
// of the menu, the windows are lit, and the pretzel is a proper pretzel.
// One painter, many moods: each variation is a palette plus a few switches.
const FOOD_CITY_MOODS = {
  dusk: {
    sky: [[0, '#2e2470'], [0.32, '#a04490'], [0.58, '#f07a6a'], [0.78, '#f8b860']],
    sun: '#ffd870', sunCut: '#f07a6a', far: '#a0588e', near: '#43245e', lit: '#ffd870',
    sea: ['#6a3a8a', '#24163e'], glint: 'rgba(255,216,112,0.8)', stars: 0.6,
    title: 'band', titleCol: '#c83a6a',
  },
  night: {
    sky: [[0, '#0a0a2a'], [0.5, '#1e1a5a'], [0.85, '#4a2a7a']],
    moon: '#f2ead2', far: '#2e2a6a', near: '#120e2e', lit: '#ffe08a',
    sea: ['#1e1a4a', '#0a0818'], glint: 'rgba(242,234,210,0.6)', stars: 1, neon: true,
    title: 'neon', titleCol: '#ff7ad2',
  },
  noon: {
    sky: [[0, '#6ac8e8'], [0.6, '#bfe6f0'], [1, '#f2ead2']],
    sun: '#fff4b0', far: '#9ab0d0', near: '#4a5a8a', lit: '#f2ead2',
    sea: ['#3a9ac0', '#1e5a8a'], glint: 'rgba(255,255,255,0.7)', stars: 0,
    title: 'sky', titleCol: '#d8402e', fade: 0.34, peelMore: true,
  },
  postcard: {
    sky: [[0, '#2e2470'], [0.32, '#a04490'], [0.58, '#f07a6a'], [0.78, '#f8b860']],
    sun: '#ffd870', sunCut: '#f07a6a', far: '#a0588e', near: '#43245e', lit: '#ffd870',
    sea: ['#6a3a8a', '#24163e'], glint: 'rgba(255,216,112,0.8)', stars: 0.6,
    title: 'postcard', titleCol: '#f8d050',
  },
  vapor: {
    sky: [[0, '#14062a'], [0.4, '#5a1a8a'], [0.68, '#ff5ab8']],
    sun: '#ffb050', sunCut: '#7a1a8a', far: '#7a2a9a', near: '#1a0838', lit: '#3af0ff',
    grid: '#ff3ad8', stars: 0.8, neon: true,
    title: 'neon', titleCol: '#8af8ff',
  },
};

function foodCity(ctx, cx, m) {
  muralFrame(ctx, cx, (ctx, x, y, w, h) => {
    sunsetSky(ctx, x, y, w, h, m.sky);
    for (let i = 0; i < Math.round(18 * m.stars); i++) {
      plain(ctx, 'rgba(255,240,220,0.75)', (c) => c.rect(x + ((i * 37 + 11) % w), y + 3 + ((i * 13) % 18), 0.8, 0.8));
    }
    const ground = y + h - 12;
    // The sun (or moon), low and to the right, where the pretzel frames it.
    const sunX = cx + 24, sunY = ground - 8;
    if (m.moon) {
      plain(ctx, m.moon, (c) => c.ellipse(cx + 50, y + 20, 7, 7, 0, 0, Math.PI * 2));
      plain(ctx, m.sky[1][1], (c) => c.ellipse(cx + 53, y + 18, 6, 6, 0, 0, Math.PI * 2));
    } else if (m.sunCut) stripedSun(ctx, sunX, sunY, 17, m.sun, m.sunCut);
    else plain(ctx, m.sun, (c) => c.ellipse(cx + 46, y + 22, 9, 9, 0, 0, Math.PI * 2));

    // ---- far layer: hazed, simpler, food at a distance.
    const F = m.far;
    // Ice cream cone tower.
    plain(ctx, F, (c) => { c.moveTo(cx - 56, ground); c.lineTo(cx - 49, ground - 30); c.lineTo(cx - 42, ground); c.closePath(); });
    plain(ctx, F, (c) => c.ellipse(cx - 49, ground - 33, 6, 5, 0, 0, Math.PI * 2));
    plain(ctx, F, (c) => c.ellipse(cx - 49, ground - 38, 4, 3.6, 0, 0, Math.PI * 2));
    // Milkshake glass with a cherry.
    plain(ctx, F, (c) => { c.moveTo(cx - 12, ground - 34); c.lineTo(cx - 2, ground - 34); c.lineTo(cx - 5, ground - 14); c.lineTo(cx - 9, ground - 14); c.closePath(); });
    plain(ctx, F, (c) => c.rect(cx - 8, ground - 14, 2, 14));
    plain(ctx, F, (c) => c.ellipse(cx - 7, ground - 35, 5.5, 2.5, 0, 0, Math.PI * 2));
    plain(ctx, F, (c) => c.ellipse(cx - 7, ground - 39, 1.6, 1.6, 0, 0, Math.PI * 2));
    // The donut Ferris wheel, far right.
    stroke(ctx, F, 3.2, (c) => c.ellipse(cx + 58, ground - 16, 11, 11, 0, 0, Math.PI * 2));
    stroke(ctx, F, 0.5, (c) => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.moveTo(cx + 58, ground - 16); c.lineTo(cx + 58 + Math.cos(a) * 11, ground - 16 + Math.sin(a) * 11); } });
    plain(ctx, F, (c) => { c.moveTo(cx + 52, ground); c.lineTo(cx + 58, ground - 16); c.lineTo(cx + 64, ground); c.closePath(); });

    // ---- near layer: dark, detailed, windows lit.
    const N = m.near, L = m.lit;
    const windows = (x0, y0, cols, rows, dx = 3, dy = 4) => {
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        if ((r * 7 + k * 3) % 5 === 0) continue;   // a few dark ones
        plain(ctx, L, (c) => c.rect(x0 + k * dx, y0 + r * dy, 1.1, 1.5));
      }
    };
    // Fries: a carton with five towers standing in it.
    for (const [fx, fh] of [[-79, 22], [-75, 30], [-71, 26], [-67, 33], [-63, 24]]) {
      plain(ctx, N, (c) => c.rect(cx + fx, ground - fh, 3.4, fh));
      windows(cx + fx + 1.2, ground - fh + 3, 1, Math.floor((fh - 14) / 4));
    }
    plain(ctx, m.neon ? '#ff3a6a' : '#c83a4a', (c) => { c.moveTo(cx - 81, ground - 13); c.lineTo(cx - 58, ground - 13); c.lineTo(cx - 60, ground); c.lineTo(cx - 79, ground); c.closePath(); });
    plain(ctx, '#f8d050', (c) => c.ellipse(cx - 69.5, ground - 7, 3, 3.4, 0, 0, Math.PI * 2));
    // Soda cup skyscraper with its straw as the radio mast.
    // Everything tops out under the title band (MH - 12 - 36 = 16 units down).
    plain(ctx, N, (c) => { c.moveTo(cx - 54, ground - 30); c.lineTo(cx - 38, ground - 30); c.lineTo(cx - 40, ground); c.lineTo(cx - 52, ground); c.closePath(); });
    plain(ctx, N, (c) => rr(c, cx - 55.5, ground - 33, 19, 3.4, 1.2));
    stroke(ctx, N, 1.5, (c) => { c.moveTo(cx - 44, ground - 33); c.lineTo(cx - 41.5, ground - 37); });
    plain(ctx, '#ff5a6a', (c) => c.ellipse(cx - 41.5, ground - 38, 1.3, 1.3, 0, 0, Math.PI * 2));
    windows(cx - 51, ground - 27, 4, 6);
    // Pizza-slice tower: a tall triangle, crust on top, pepperoni windows.
    plain(ctx, N, (c) => { c.moveTo(cx - 34, ground); c.lineTo(cx - 27, ground - 36); c.lineTo(cx - 20, ground); c.closePath(); });
    plain(ctx, m.neon ? '#ffb050' : '#c88440', (c) => rr(c, cx - 29, ground - 38, 4, 3, 1.4));
    for (const [px, py] of [[-27, -28], [-28.5, -21], [-25.5, -18], [-27, -12], [-29, -6], [-25, -5]]) {
      plain(ctx, '#e04848', (c) => c.ellipse(cx + px, ground + py, 1.1, 1.1, 0, 0, Math.PI * 2));
    }
    // Burger dome: sesame bun, lettuce frill, patty, bottom bun as the plinth.
    plain(ctx, N, (c) => { c.moveTo(cx - 18, ground - 11); c.quadraticCurveTo(cx - 4, ground - 38, cx + 10, ground - 11); c.closePath(); });
    for (const [sx, sy] of [[-11, -22], [-6, -26], [0, -24], [4, -19], [-14, -15]]) {
      plain(ctx, L, (c) => c.ellipse(cx + sx, ground + sy, 0.9, 0.55, 0.3, 0, Math.PI * 2));
    }
    stroke(ctx, '#4aa05a', 1.2, (c) => { c.moveTo(cx - 19, ground - 10.5); for (let k = 0; k <= 10; k++) c.lineTo(cx - 19 + k * 3, ground - 10.5 + (k % 2 ? 1.2 : 0)); });
    plain(ctx, N, (c) => rr(c, cx - 18, ground - 9, 28, 4.6, 1.5));
    plain(ctx, N, (c) => c.rect(cx - 17, ground - 4.2, 26, 4.2));
    windows(cx - 14, ground - 8, 8, 1, 3, 4);
    // The pretzel arch, framing the sun. A real pretzel is one rope: the outer
    // loop rises from two feet over both lobes, and the two ends come back
    // across the middle and twist over each other low down. Drawn as the outer
    // loop plus those two crossing arms, it reads as a pretzel; drawn as a
    // heart with an X in it, it read as a road sign.
    const px = cx + 24, py = ground - 4;
    const pretzel = (c) => {
      c.moveTo(px - 13, py);
      c.bezierCurveTo(px - 30, py - 16, px - 16, py - 36, px, py - 22);
      c.bezierCurveTo(px + 16, py - 36, px + 30, py - 16, px + 13, py);
      c.moveTo(px - 13, py); c.bezierCurveTo(px - 4, py - 2, px + 2, py - 10, px + 9, py - 19);
      c.moveTo(px + 13, py); c.bezierCurveTo(px + 4, py - 2, px - 2, py - 10, px - 9, py - 19);
    };
    stroke(ctx, N, 3.2, pretzel);
    if (m.neon) {
      ctx.save(); ctx.shadowColor = L; ctx.shadowBlur = 3;
      stroke(ctx, L, 0.6, pretzel);
      ctx.restore();
    } else {
      for (const [sx, sy] of [[-17, -16], [-11, -27], [11, -27], [17, -16], [-4, -6], [4, -6]]) {
        plain(ctx, L, (c) => c.rect(px + sx, py + sy, 0.9, 0.9));
      }
    }
    // The hot dog blimp, towing a banner.
    const bx = cx - 4, by = y + 21;
    plain(ctx, '#d88a50', (c) => c.ellipse(bx, by, 10, 3.8, 0, 0, Math.PI * 2));
    plain(ctx, '#b84a3a', (c) => c.ellipse(bx, by, 8.4, 2.2, 0, 0, Math.PI * 2));
    stroke(ctx, '#f6d33c', 0.7, (c) => { c.moveTo(bx - 7, by); for (let k = 1; k <= 7; k++) c.lineTo(bx - 7 + k * 2, by + (k % 2 ? -0.8 : 0.8)); });
    stroke(ctx, N, 0.4, (c) => { c.moveTo(bx - 10, by); c.lineTo(bx - 14, by + 1); });
    plain(ctx, '#f2ead2', (c) => c.rect(bx - 30, by - 1.2, 16, 4.4));
    drawTextCentered(ctx, 'EAT HERE', bx - 22, by - 0.6, '#c83a4a', 0.27, 'bold');

    // ---- the ground: sea with the light laid across it, or the grid.
    if (m.grid) {
      plain(ctx, '#14062a', (c) => c.rect(x, ground, w, h - (ground - y)));
      ctx.save();
      ctx.strokeStyle = m.grid; ctx.lineWidth = 0.5; ctx.shadowColor = m.grid; ctx.shadowBlur = 3;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) { const gy = ground + Math.pow(k / 4, 1.7) * (h - (ground - y)); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
      for (let k = -14; k <= 14; k++) { ctx.moveTo(cx + k * 4, ground); ctx.lineTo(cx + k * 16, y + h + 2); }
      ctx.stroke();
      ctx.restore();
    } else {
      sunsetSky(ctx, x, ground, w, h - (ground - y), [[0, m.sea[0]], [1, m.sea[1]]]);
      const gx = m.moon ? cx + 50 : m.sunCut ? sunX : cx + 46;
      for (let k = 0; k < 6; k++) {
        const rw = 12 - k * 1.6;
        plain(ctx, m.glint, (c) => c.rect(gx - rw, ground + 1.5 + k * 1.8, rw * 2, 0.8));
      }
      // The city's own lights in the water, broken up.
      for (let k = 0; k < 14; k++) {
        plain(ctx, m.glint, (c) => c.rect(cx - 78 + ((k * 23) % 100), ground + 2 + (k % 4) * 2, 2, 0.5));
      }
    }
    palm(ctx, x + MW - 8, y + h, y + 22, m.near, -5);

    // ---- the title.
    if (m.title === 'band') muralTitle(ctx, 'MEET ME AT THE FOOD COURT', cx, y + 8, w, m.titleCol);
    else if (m.title === 'sky') {
      sign(ctx, 'MEET ME AT THE FOOD COURT', cx + 0.6, y + 8.6, 'rgba(255,255,255,0.8)', w - 20, 0.85);
      sign(ctx, 'MEET ME AT THE FOOD COURT', cx, y + 8, m.titleCol, w - 20, 0.85);
    } else if (m.title === 'neon') {
      ctx.save(); ctx.shadowColor = m.titleCol; ctx.shadowBlur = 4;
      sign(ctx, 'MEET ME AT THE FOOD COURT', cx, y + 8, m.titleCol, w - 20, 0.85);
      ctx.restore();
    } else if (m.title === 'postcard') {
      // The vintage postcard: script GREETINGS FROM, then the name in big block
      // letters with a drop shadow, as on every seaside card ever printed.
      drawTextCentered(ctx, 'GREETINGS FROM THE', cx - 30, y + 3, '#f2ead2', 0.42, 'marker');
      sign(ctx, 'FOOD COURT', cx + 1.2, y + 15.4, '#24163e', 120, 1.6);
      sign(ctx, 'FOOD COURT', cx, y + 14, m.titleCol, 120, 1.6);
    }
  }, { fade: m.fade ?? 0.22 });
  // The postcard's white deckled border goes on after the room light so it
  // stays card-white; the mural behind it is already shaded.
  if (m.title === 'postcard') {
    const x = cx - MW / 2, y = POSTER_TOP;
    ctx.save();
    ctx.globalAlpha = 0.62;
    stroke(ctx, '#e8e0d0', 3, (c) => c.rect(x + 1.5, y + 1.5, MW - 3, MH - 3));
    ctx.restore();
  }
}

// M2: THE BOARDWALK. P3's own idea, done properly: the food court as a beach
// promenade at sunset. Sea, a pier on legs, striped umbrellas, a table of
// diners with trays, a roller skater carrying a tray of sodas, gulls.
function muralBoardwalk(ctx, cx) {
  muralFrame(ctx, cx, (ctx, x, y, w, h) => {
    sunsetSky(ctx, x, y, w, h, [[0, '#4a3a9a'], [0.4, '#d86a8a'], [0.7, '#f2a860'], [1, '#f2c880']]);
    stripedSun(ctx, cx - 20, y + 36, 16, '#ffe080', '#f2a860');
    const sea = y + 40;
    sunsetSky(ctx, x, sea, w, 12, [[0, '#7a5aa8'], [1, '#4a3a7a']]);
    for (let k = 0; k < 5; k++) plain(ctx, 'rgba(255,224,128,0.7)', (c) => c.rect(cx - 20 - (12 - k * 2), sea + 1.5 + k * 2.2, (12 - k * 2) * 2, 0.8));
    // The pier, far out on the right.
    plain(ctx, '#3a2a5a', (c) => c.rect(cx + 34, sea - 4, 52, 2));
    for (let px = cx + 36; px < cx + 86; px += 7) plain(ctx, '#3a2a5a', (c) => c.rect(px, sea - 2, 1, 7));
    // The promenade: boards, then the people on it.
    const deck = y + 52;
    plain(ctx, '#c8885a', (c) => c.rect(x, deck, w, h - (deck - y)));
    for (let bx = x; bx < x + w; bx += 6) plain(ctx, '#a86a42', (c) => c.rect(bx, deck, 0.6, h));
    plain(ctx, '#e8a87a', (c) => c.rect(x, deck, w, 1));
    // Umbrella and table, left.
    for (const [ux, col] of [[cx - 62, '#2e8a9a'], [cx + 8, '#e04848']]) {
      plain(ctx, '#3a2a5a', (c) => c.rect(ux - 0.5, deck - 22, 1, 22));
      for (let sgm = 0; sgm < 4; sgm++) plain(ctx, sgm % 2 ? '#f2ead2' : col, (c) => {
        const a0 = -12 + sgm * 6, a1 = a0 + 6;
        c.moveTo(ux, deck - 27); c.lineTo(ux + a0, deck - 21); c.lineTo(ux + a1, deck - 21); c.closePath();
      });
      plain(ctx, '#3a2a5a', (c) => c.rect(ux - 7, deck - 8, 14, 1.4));
      plain(ctx, '#3a2a5a', (c) => c.rect(ux - 0.6, deck - 8, 1.2, 8));
    }
    // Diners: rounded silhouettes, a raised cup, a hand waving.
    const diner = (dx, hh, col) => {
      plain(ctx, col, (c) => c.ellipse(dx, deck - hh - 2.6, 2.6, 2.6, 0, 0, Math.PI * 2));
      plain(ctx, col, (c) => rr(c, dx - 3, deck - hh, 6, hh, 2.2));
    };
    diner(cx - 70, 10, '#3a2a5a'); diner(cx - 54, 11, '#5a3a7a');
    plain(ctx, '#f2ead2', (c) => c.rect(cx - 52, deck - 15, 2, 3));
    diner(cx + 1, 10, '#5a3a7a'); diner(cx + 16, 9, '#3a2a5a');
    // The roller skater with a tray of sodas, mid-glide.
    const sx = cx + 46;
    plain(ctx, '#3a2a5a', (c) => c.ellipse(sx, deck - 17, 2.6, 2.6, 0, 0, Math.PI * 2));
    plain(ctx, '#3a2a5a', (c) => { c.moveTo(sx - 3, deck - 14); c.lineTo(sx + 3, deck - 14); c.lineTo(sx + 5, deck - 3); c.lineTo(sx - 4, deck - 3); c.closePath(); });
    stroke(ctx, '#3a2a5a', 1.2, (c) => { c.moveTo(sx + 2, deck - 12); c.lineTo(sx + 8, deck - 16); });
    plain(ctx, '#f2ead2', (c) => c.rect(sx + 5, deck - 17.2, 7, 1));
    for (const k of [0, 1, 2]) plain(ctx, ['#e04848', '#f6d33c', '#48c0e0'][k], (c) => c.rect(sx + 5.5 + k * 2.2, deck - 20, 1.6, 2.8));
    for (const k of [-1, 1]) plain(ctx, '#f6d33c', (c) => c.ellipse(sx + k * 2, deck - 1.4, 1.4, 1.4, 0, 0, Math.PI * 2));
    // Gulls.
    for (const [gx, gy] of [[cx - 40, y + 22], [cx - 34, y + 19], [cx + 52, y + 26]]) {
      stroke(ctx, '#3a2a5a', 0.6, (c) => { c.moveTo(gx - 2.5, gy); c.quadraticCurveTo(gx - 1.2, gy - 1.6, gx, gy); c.quadraticCurveTo(gx + 1.2, gy - 1.6, gx + 2.5, gy); });
    }
    palm(ctx, x + 10, deck, y + 20, '#3a2a5a', 3);
    palm(ctx, x + MW - 10, deck, y + 18, '#3a2a5a', -4);
    muralTitle(ctx, 'MEET ME AT THE FOOD COURT', cx, y + 8, w, '#c83a6a');
  });
}

// M3: VAPORWAVE GRID. Magenta-to-cyan sky, the striped sun sitting on a neon
// grid floor that runs to the horizon, palms in silhouette, a marble bust
// in shades holding a pretzel, and the title spaced wide.
function muralVaporGrid(ctx, cx) {
  muralFrame(ctx, cx, (ctx, x, y, w, h) => {
    sunsetSky(ctx, x, y, w, h, [[0, '#1a0a3a'], [0.4, '#6a1a8a'], [0.62, '#ff5ab8']]);
    const hz = y + 40;
    stripedSun(ctx, cx, hz - 12, 19, '#ffb050', '#7a1a8a');
    // Overlay a pink-to-yellow gradient on the sun's disc.
    // The grid floor: horizontals bunch toward the horizon, verticals fan out.
    plain(ctx, '#14062a', (c) => c.rect(x, hz, w, h - (hz - y)));
    ctx.save();
    ctx.strokeStyle = '#ff3ad8'; ctx.lineWidth = 0.6; ctx.shadowColor = '#ff3ad8'; ctx.shadowBlur = 3;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) { const gy = hz + Math.pow(k / 6, 1.8) * (h - (hz - y)); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
    for (let k = -12; k <= 12; k++) { ctx.moveTo(cx + k * 3, hz); ctx.lineTo(cx + k * 22, y + h + 4); }
    ctx.stroke();
    ctx.restore();
    // Mountains in wireframe on the horizon.
    stroke(ctx, '#3af0ff', 0.7, (c) => {
      c.moveTo(x, hz); c.lineTo(x + 18, hz - 9); c.lineTo(x + 30, hz - 3); c.lineTo(x + 44, hz - 12); c.lineTo(x + 58, hz);
      c.moveTo(x + w - 60, hz); c.lineTo(x + w - 44, hz - 10); c.lineTo(x + w - 32, hz - 4); c.lineTo(x + w - 16, hz - 13); c.lineTo(x + w, hz - 2);
    });
    palm(ctx, x + 22, hz + 2, y + 18, '#0a0418', 2);
    palm(ctx, x + MW - 20, hz + 2, y + 16, '#0a0418', -3);
    // The bust: marble head and shoulders on a plinth, in sunglasses, holding a
    // pretzel up to the light.
    const bx = cx - 50, by = hz + 14;
    plain(ctx, '#d8d0e8', (c) => c.rect(bx - 7, by - 2, 14, 10));
    plain(ctx, '#e8e0f0', (c) => { c.moveTo(bx - 9, by - 2); c.quadraticCurveTo(bx, by - 10, bx + 9, by - 2); c.closePath(); });
    plain(ctx, '#e8e0f0', (c) => c.rect(bx - 2, by - 12, 4, 4));
    plain(ctx, '#f0e8f8', (c) => c.ellipse(bx, by - 17, 5, 6, 0, 0, Math.PI * 2));
    plain(ctx, '#c8c0d8', (c) => c.ellipse(bx + 1.5, by - 13.5, 2.4, 1.4, 0, 0, Math.PI * 2));
    plain(ctx, '#14062a', (c) => c.rect(bx - 4.5, by - 19, 9, 2));
    plain(ctx, '#3af0ff', (c) => c.rect(bx - 4, by - 18.6, 3, 0.6));
    stroke(ctx, '#c88440', 1.3, (c) => {
      const px = bx + 11, py = by - 14;
      c.moveTo(px - 1, py + 3); c.bezierCurveTo(px - 6, py, px - 3, py - 5, px, py - 2);
      c.bezierCurveTo(px + 3, py - 5, px + 6, py, px + 1, py + 3);
    });
    ctx.save(); ctx.shadowColor = '#3af0ff'; ctx.shadowBlur = 4;
    sign(ctx, 'F O O D   C O U R T', cx, y + 9, '#8af8ff', w - 30, 0.85);
    ctx.restore();
  }, { fade: 0.18 });
}

// M4: VAPORWAVE MALL. The pastel side of it: a pink and mint checker floor in
// perspective, two classical columns, a soda cup and a pretzel floating like
// relics, a dolphin leaping through a ring, and the title in a chrome band.
function muralVaporMall(ctx, cx) {
  muralFrame(ctx, cx, (ctx, x, y, w, h) => {
    sunsetSky(ctx, x, y, w, h, [[0, '#7ad8e8'], [0.5, '#c8a8f0'], [0.8, '#f8b8d8']]);
    // Clouds.
    for (const [kx, ky, kr] of [[x + 30, y + 26, 8], [x + 40, y + 24, 6], [x + w - 40, y + 20, 7], [x + w - 30, y + 22, 9]]) {
      plain(ctx, 'rgba(255,255,255,0.7)', (c) => c.ellipse(kx, ky, kr, kr * 0.45, 0, 0, Math.PI * 2));
    }
    const hz = y + 42;
    // Checker floor in perspective: rows get deeper toward the viewer.
    for (let r = 0; r < 5; r++) {
      const t0 = Math.pow(r / 5, 1.6), t1 = Math.pow((r + 1) / 5, 1.6);
      const y0 = hz + t0 * (h - (hz - y)), y1 = hz + t1 * (h - (hz - y));
      for (let k = -10; k < 10; k++) {
        const col = (k + r) % 2 === 0 ? '#ff9ad2' : '#8af0d0';
        plain(ctx, col, (c) => {
          c.moveTo(cx + k * (6 + t0 * 22), y0); c.lineTo(cx + (k + 1) * (6 + t0 * 22), y0);
          c.lineTo(cx + (k + 1) * (6 + t1 * 22), y1); c.lineTo(cx + k * (6 + t1 * 22), y1); c.closePath();
        });
      }
    }
    // Two columns, fluted, with a lintel fragment.
    for (const colX of [x + 22, x + w - 30]) {
      plain(ctx, '#f0e8f8', (c) => c.rect(colX, y + 18, 8, hz - (y + 18) + 6));
      for (let f = 1; f < 4; f++) plain(ctx, '#c8c0d8', (c) => c.rect(colX + f * 2, y + 20, 0.5, hz - (y + 20) + 2));
      plain(ctx, '#e8e0f0', (c) => c.rect(colX - 2, y + 16, 12, 3));
      plain(ctx, '#e8e0f0', (c) => c.rect(colX - 2, hz + 4, 12, 3));
    }
    // Floating relics: the soda cup, tilted, and a pretzel, both with a glow.
    glow(ctx, cx + 28, y + 30, 16, 12, '#ffffff', 0.35);
    ctx.save(); ctx.translate(cx + 28, y + 30); ctx.rotate(0.25);
    shape(ctx, '#f2f2f8', 10, (c) => { c.moveTo(-4, -7); c.lineTo(4, -7); c.lineTo(3, 7); c.lineTo(-3, 7); c.closePath(); });
    plain(ctx, '#ff5ab8', (c) => c.rect(-3.6, -2, 7.2, 3));
    plain(ctx, '#3af0ff', (c) => c.rect(-4.4, -8.2, 8.8, 1.4));
    stroke(ctx, '#ff5ab8', 0.9, (c) => { c.moveTo(1, -8); c.lineTo(3, -13); });
    ctx.restore();
    glow(ctx, cx - 28, y + 26, 14, 10, '#ffffff', 0.3);
    stroke(ctx, '#c88440', 1.8, (c) => {
      const px = cx - 28, py = y + 27;
      c.moveTo(px - 1.5, py + 4); c.bezierCurveTo(px - 9, py, px - 5, py - 7, px, py - 3);
      c.bezierCurveTo(px + 5, py - 7, px + 9, py, px + 1.5, py + 4);
    });
    // A dolphin leaping through a ring.
    stroke(ctx, '#ff5ab8', 1, (c) => c.ellipse(cx - 2, y + 40, 6, 7, 0, 0, Math.PI * 2));
    plain(ctx, '#5a8ad8', (c) => {
      c.moveTo(cx - 12, y + 46); c.quadraticCurveTo(cx - 2, y + 30, cx + 9, y + 40);
      c.lineTo(cx + 12, y + 38); c.lineTo(cx + 11, y + 43); c.quadraticCurveTo(cx - 2, y + 36, cx - 10, y + 47); c.closePath();
    });
    // The chrome title band.
    const tg = ctx.createLinearGradient(0, y + 3, 0, y + 15);
    tg.addColorStop(0, '#f8f8ff'); tg.addColorStop(0.5, '#a8a8c8'); tg.addColorStop(0.55, '#5a5a8a'); tg.addColorStop(1, '#d8d8f0');
    ctx.fillStyle = tg; ctx.fillRect(x + 20, y + 3, w - 40, 12);
    sign(ctx, 'F O O D   C O U R T', cx + 0.6, y + 9.6, '#ff5ab8', w - 50, 0.8);
    sign(ctx, 'F O O D   C O U R T', cx, y + 9, '#2a1a5a', w - 50, 0.8);
  }, { fade: 0.2 });
}

export const PLAZA_WALL_CANDIDATES = [
  { key: 'P1', name: 'TRY THE PRETZEL', paint: wallPretzel,
    note: 'A promo one-sheet on the poster line, for the stand the LED slogan has been pushing all along. '
      + '"NOW 40% MORE PRETZEL" under it.' },
  { key: 'P2', name: 'HOUSE RULES', paint: wallRules,
    note: 'An enamel FOOD COURT RULES sign: NO OUTSIDE FOOD. NO INSIDE FOOD EITHER. RETURN ALL TRAYS — corrected in '
      + 'the menu board\'s marker to TO THE YEAR ISSUED.' },
  { key: 'P3', name: 'THE MURAL', paint: wallMural,
    note: 'A long faded 1980s mural over the whole plaza: sunset, palms, a family at a table, MEET ME AT THE FOOD '
      + 'COURT, paint peeling off in patches. The biggest thing on the wall.' },
  { key: 'P3a', name: 'MURAL: FOOD CITY', paint: muralFoodCity,
    note: 'P3\'s sunset, richer: a skyline built from the menu — fries towers, a soda-cup tower with a straw mast, a '
      + 'burger dome, a pretzel arch — over a sea carrying the sun\'s stripes, a hot dog blimp, stars still up.' },
  { key: 'P3a·1', name: 'FOOD CITY: DUSK (REFINED)', paint: (ctx, cx) => foodCity(ctx, cx, FOOD_CITY_MOODS.dusk),
    note: 'P3a refined: two layers for depth (a hazed far skyline — ice-cream cone, milkshake, a donut Ferris wheel — '
      + 'and a dark near one), lit windows, fries in their carton, a soda-cup skyscraper with a straw mast, a pizza-slice '
      + 'tower, a sesame burger dome, a proper pretzel framing the sun, a hot dog blimp towing EAT HERE.' },
  { key: 'P3a·2', name: 'FOOD CITY: NIGHT', paint: (ctx, cx) => foodCity(ctx, cx, FOOD_CITY_MOODS.night),
    note: 'The same city after dark: a moon instead of the sun, every window lit, the pretzel outlined in neon, the '
      + 'title in pink neon. Sits darkest in the dim room.' },
  { key: 'P3a·3', name: 'FOOD CITY: POSTCARD — SHIPS (as drawn by sprites/mural.js)',
    paint: (ctx, cx) => drawFoodCourtMural(ctx, cx, POSTER_TOP, { lit: PLAZA_WALL_LIT }),
    note: 'Picked 11 Oct 2026 and thinned to five buildings — fries, the drink, a layered burger, the pretzel arch, '
      + 'a pizza slice — no blimp, no far skyline. This card is the shipped painter.' },
  { key: 'P3a·4', name: 'FOOD CITY: SUN-BLEACHED NOON', paint: (ctx, cx) => foodCity(ctx, cx, FOOD_CITY_MOODS.noon),
    note: 'Midday blue, faded harder as if it has had forty summers through a skylight; the title painted straight '
      + 'onto the sky.' },
  { key: 'P3a·5', name: 'FOOD CITY: VAPORWAVE', paint: (ctx, cx) => foodCity(ctx, cx, FOOD_CITY_MOODS.vapor),
    note: 'The food city on the vaporwave grid: striped sun, magenta sky, cyan windows, neon pretzel and title. '
      + 'The two directions you liked, in one.' },
  { key: 'P3b', name: 'MURAL: THE BOARDWALK', paint: muralBoardwalk,
    note: 'P3\'s idea done properly: a beach promenade at sunset — boards, pier, striped umbrellas, diners, a roller '
      + 'skater carrying a tray of sodas, gulls.' },
  { key: 'P3c', name: 'MURAL: VAPORWAVE GRID', paint: muralVaporGrid,
    note: 'Vaporwave, night side: striped sun on a neon grid running to the horizon, wireframe mountains, palms, a marble '
      + 'bust in shades holding up a pretzel. F O O D  C O U R T in neon.' },
  { key: 'P3d', name: 'MURAL: VAPORWAVE MALL', paint: muralVaporMall,
    note: 'Vaporwave, pastel side: pink and mint checker floor, classical columns, a floating soda cup and pretzel, a '
      + 'dolphin through a ring, chrome title band.' },
  { key: 'P4', name: 'SPECIALS BOARD', paint: wallSpecials,
    note: 'A framed chalkboard: TODAY\'S SPECIAL — SOUP, struck through, ALSO SOUP. 2 PLUGS. The menu board\'s '
      + 'running joke, by hand.' },
];

// The card: the shipped plaza (last cabinet, three tables, Dolores, the menu
// board) with the candidate centred on the bare wall between the cabinet's
// poster line and the menu board's panel.
export function drawPlazaWallMock(ctx, t, cand) {
  const camX = LAST_CAB - 40;
  roomShell(ctx, camX, t);
  const counterSx = PLAZA_COUNTER - camX;
  // The menu board, from the real wall-bay painter at the real bay.
  for (const bay of hubWallBays([{ type: 'bench', x: PLAZA_COUNTER }])) {
    drawWallBay(ctx, bay.x - camX, HUB_ROOM.wallY0, BAY_W, HUB_ROOM.wallY1 - HUB_ROOM.wallY0, bay.id,
      { t, seed: bay.x, lit: PLAZA_WALL_LIT, base: false });
  }
  const cabSx = LAST_CAB - camX;
  // Free wall runs from the cabinet's poster edge to the menu panel's edge.
  const wallFrom = cabSx + HUB_ROOM.posterW / 2 + 4;
  const wallTo = PLAZA_COUNTER - BAY_W * 0.39 - camX + BAY_W * 0.06 - 4;
  if (cand) cand.paint(ctx, (wallFrom + wallTo) / 2, t);
  ceiling(ctx, camX, t);
  cabinet(ctx, CABINETS[8], cabSx, t);
  PLAZA_TABLE_XS.forEach((tx, k) => drawFoodCourtTable(ctx, tx - camX, FLOOR, { lit: 0.7, seat: k, tray: k !== 1 }));
  drawCounter(ctx, counterSx - COUNTER_W / 2, FLOOR - COUNTER_H, COUNTER_W, COUNTER_H, {
    t, variant: 'serving',
    server: (c) => drawToon(c, 'dolores', idle(t, 2, -1), counterSx - COUNTER_W / 2 + COUNTER_W * COUNTER_STAFF_X, FLOOR, DOLORES_H, { lit: 0.9 }),
  });
  drawToon(ctx, 'clara', idle(t, 1, 1), (PLAZA_TABLE_XS[0] + PLAZA_TABLE_XS[1]) / 2 - camX, FLOOR, NPC_H, { lit: 0.85 });
  ctx.restore();
}

// ===================================================================
// CABINETS BETWEEN THE FOOD UNITS — asked 11 Oct 2026: instead of food units
// behind every machine, the bank breaks into three groups of three with a food
// stall standing in each gap, the way a food court actually fitted a few
// machines in between its counters. Costs two stall widths of walking.
// ===================================================================
const STALL_W = 112;
function foodStall(ctx, cx, unit, t, open) {
  const x0 = cx - STALL_W / 2, top = FASCIA_Y + 8;
  // Side pilasters and the fascia.
  for (const px of [x0, x0 + STALL_W]) pilaster(ctx, px);
  plain(ctx, d('#2a2438'), (c) => c.rect(x0 + 3, top, STALL_W - 6, FASCIA_H + 2));
  const on = open ? flick(t, 4) : 0;
  const face = open ? mix(d(unit.box), unit.box, on) : dim(unit.box, 0.7);
  plain(ctx, face, (c) => c.rect(x0 + 5, top + 2, STALL_W - 10, FASCIA_H - 2));
  glow(ctx, cx, top + FASCIA_H + 4, STALL_W * 0.6, 20, unit.box, 0.2 * on);
  sign(ctx, unit.name, cx, top + FASCIA_H / 2 + 1, open ? unit.ink : dim(unit.ink, 0.5), STALL_W - 20, 0.8);
  const iy = top + FASCIA_H + 4, ix = x0 + 4, iw = STALL_W - 8;
  if (!open) { shutter(ctx, ix, iy, iw, FLOOR - iy); return; }
  // Open: lit interior, menu board, a counter with a till and the goods on it.
  plain(ctx, '#2a1e24', (c) => c.rect(ix, iy, iw, FLOOR - iy));
  glow(ctx, cx, iy + 20, iw * 0.6, 30, '#ffd8a0', 0.18);
  const mb = { x: ix + 12, y: iy + 6, w: iw - 24, h: 22 };
  plain(ctx, '#161022', (c) => c.rect(mb.x, mb.y, mb.w, mb.h));
  for (let r = 0; r < 3; r++) {
    plain(ctx, '#c8c8d8', (c) => c.rect(mb.x + 4, mb.y + 5 + r * 5.5, mb.w * 0.45, 1.3));
    plain(ctx, '#f6d33c', (c) => c.rect(mb.x + mb.w - 16, mb.y + 5 + r * 5.5, 11, 1.3));
  }
  goodsIcon(ctx, unit.goods, mb.x + mb.w * 0.66, mb.y + mb.h * 0.5, 1.2, '#f2b84b');
  // Warming case of pretzels on the counter.
  const cy = FLOOR - 26;
  plain(ctx, d('#6a5a48'), (c) => c.rect(ix, cy, iw, 26));
  plain(ctx, '#8a7a64', (c) => c.rect(ix - 1, cy - 2, iw + 2, 3));
  plain(ctx, mix(unit.box, INK, 0.2), (c) => c.rect(ix, cy + 7, iw, 4));
  ctx.save(); ctx.globalAlpha = 0.25;
  plain(ctx, '#cfe4f0', (c) => c.rect(ix + 10, cy - 14, 40, 12));
  ctx.restore();
  for (let k = 0; k < 4; k++) goodsIcon(ctx, unit.goods, ix + 16 + k * 9, cy - 6, 0.5, '#c88440');
  plain(ctx, '#2a3542', (c) => rr(c, ix + iw - 22, cy - 9, 13, 9, 1));
  plain(ctx, '#48e0c8', (c) => c.rect(ix + iw - 20, cy - 7, 9, 2.4));
}
export const INTERLEAVE_CANDIDATES = [
  { key: 'I1', name: 'GROUPS OF THREE — STALL OPEN', open: true,
    note: 'Cabinets 2–3 end one group, PRETZEL PALACE stands in the gap still lit and stocked, cabinets 4–5 start the next. '
      + 'One poster per machine as now.' },
  { key: 'I2', name: 'GROUPS OF THREE — STALL SHUTTERED', open: false,
    note: 'The same gap with WOK THIS WAY shuttered and its sign dead — the derelict version.' },
];
export function drawInterleaveMock(ctx, t, cand) {
  const camX = 0;
  roomShell(ctx, camX, t);
  // Two machines, the stall, two machines.
  const xs = [30, 118, 118 + PITCH / 2 + STALL_W / 2 + 4, 0, 0];
  xs[3] = xs[2] + STALL_W / 2 + PITCH / 2 + 4; xs[4] = xs[3] + PITCH;
  const unit = cand.open ? UNITS[0] : UNITS[1];
  foodStall(ctx, xs[2], unit, t, cand.open);
  for (const i of [0, 1, 3, 4]) {
    const sx = xs[i];
    plain(ctx, '#1a1424', (c) => c.rect(sx - HUB_ROOM.posterW / 2, HUB_ROOM.posterTopY, HUB_ROOM.posterW, HUB_ROOM.posterH));
    plain(ctx, '#2a2234', (c) => c.rect(sx - HUB_ROOM.posterW / 2 + 3, HUB_ROOM.posterTopY + 3, HUB_ROOM.posterW - 6, HUB_ROOM.posterH - 14));
  }
  ceiling(ctx, camX, t, -14);
  [1, 2, 3, 4].forEach((ci, k) => cabinet(ctx, CABINETS[ci], xs[[0, 1, 3, 4][k]], t));
  drawToon(ctx, 'lorenzo', idle(t, 0, 1), xs[2] - 20, FLOOR, NPC_H, { lit: 0.85 });
  ctx.restore();
}
