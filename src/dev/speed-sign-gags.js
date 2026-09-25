// SPEED ZONE — the roadside SIGN GAG bake-off (not wired into the game). Peter, 24 Sep
// 2026: "Need more options for the sign though, ship as is and create a bake off with
// alternative gags."
//
// Every entry is the same moment — the roadside billboard, a speed camera, the law —
// standing on the same graded lot on the near dunes' second summit that the shipped
// speed trap uses, placed through the gallery's own helpers (SPEED_IDEA_PLACEMENT), so
// each card is judged exactly where the winner would stand. One villain voice
// throughout: he invented speed, in 1987, and nobody thanked him.
//
// Same contract as src/dev/idea-scene.js (place 'bg', screen space, after the shipped
// backdrop). Deterministic in `t`, fractional positions, one sealed save/restore each.
import { GROUND_Y, ZOOM } from '../engine/camera.js';
import { PLAYER_X } from '../game/player.js';
import { plain, rr, drawProp } from '../sprites/props.js';
import { drawTextVectorCentered, textYForMid } from '../engine/sprites.js';
import { drawDesertSpeedTrap, drawDesertSpeedTrapBoast } from '../engine/stylePacks/desertLandmarks.js';
import { SPEED_IDEA_PLACEMENT } from './speed-ideas.js';

const { seatFor, hillSlot, clipSigns } = SPEED_IDEA_PLACEMENT;
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ kit
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (e0, e1, v) => { const k = clamp01((v - e0) / (e1 - e0)); return k * k * (3 - 2 * k); };
const fract = (v) => v - Math.floor(v);
const hash = (i) => fract(Math.sin(i * 127.1 + 311.7) * 43758.5453);
function rgbOf(hex) { const n = Number.parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, k) {
  const A = rgbOf(a), B = rgbOf(b);
  const c = (i) => Math.round(lerp(A[i], B[i], k)).toString(16).padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}
function rgba(hex, a) { const [r, g, b] = rgbOf(hex); return `rgba(${r},${g},${b},${clamp01(a).toFixed(3)})`; }
const skyAt = (y) => mix('#f08048', '#f8c060', clamp01(y / GROUND_Y));
function haze(pal, y, k) {
  const sky = skyAt(y); const out = {};
  for (const [key, v] of Object.entries(pal)) out[key] = mix(v, sky, k);
  return out;
}
const fillPath = plain;
function strokePath(ctx, color, width, path, cap = 'round') {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round';
  ctx.stroke();
}
const circle = (x, y, r) => (c) => c.arc(x, y, Math.max(0.01, r), 0, TAU);
const oval = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
const box = (x, y, w, h, r = 0) => (c) => (r > 0 ? rr(c, x, y, w, h, r) : c.rect(x, y, w, h));
function poly(pts) {
  return (c) => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); };
}
function glow(ctx, x, y, r, hex, a) {
  if (a <= 0.003 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a)); g.addColorStop(0.45, rgba(hex, a * 0.42)); g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
function puff(ctx, x, y, r, a, pal) {
  if (a <= 0.01) return;
  fillPath(ctx, rgba(pal.shadow, a * 0.9), circle(x - r * 0.18, y + r * 0.16, r));
  fillPath(ctx, rgba(pal.base, a), circle(x, y, r * 0.92));
  fillPath(ctx, rgba(pal.lit, a * 0.95), circle(x + r * 0.26, y - r * 0.28, r * 0.58));
}
function text(ctx, str, x, midY, scale, color) {
  drawTextVectorCentered(ctx, str, x, textYForMid(midY, scale, 'bold'), color, scale, 'bold');
}
// Clip to what can be seen of something standing on a crest.
function clipCrest(ctx, x0, x1, crest) {
  ctx.beginPath(); ctx.moveTo(x0, -60); ctx.lineTo(x1, -60);
  for (let x = x1; x >= x0 - 2; x -= 2) ctx.lineTo(x, crest(x));
  ctx.closePath(); ctx.clip();
}

// The palette the shipped speed trap uses, plus the lot's gravel.
const PAL = {
  post: '#4d4540', postLit: '#8f7f70', board: '#f0e2bf', boardEdge: '#b53a2c', frame: '#3a3431',
  lamp: '#2e2b2a', ink: '#3a2a26', red: '#c8402e',
  carBlack: '#23242a', carWhite: '#eceef0', carLit: '#ffffff', chrome: '#c9ced2', tyre: '#1b1a1c',
  glass: '#7fb7d6', glassLit: '#d8f0ff', skin: '#e0a47a', hat: '#1f2a44', badge: '#f0c24a',
  gun: '#2a2d33', steel: '#8b949b', steelLit: '#d9dfe3', steelDark: '#4a5157',
  gravel: '#b7906c', gravelLit: '#dcb88c', gravelDark: '#94705a',
};
const SMOKE = { base: '#e6ddd0', lit: '#fff8ea', shadow: '#b9ada0' };

// Every gag stands on the shipped speed trap's lot: the near dunes' second summit, a
// graded pad, the lot centre at the local origin (y = 0 is the pad top).
function onTheLot(ctx, t, camX, paint) {
  ctx.save();
  const seat = seatFor(camX);
  const pal = haze(PAL, 165, 0.05);
  for (const x0 of hillSlot(camX)) {
    ctx.save();
    clipSigns(ctx, camX, x0 - 130, x0 + 130);
    const y0 = seat.near(x0) - 0.3;
    clipCrest(ctx, x0 - 130, x0 + 130, (x) => seat.near(x) + 1.2);
    ctx.translate(x0, y0);
    lot(ctx, pal, 52);
    paint(pal, x0);
    ctx.restore();
  }
  ctx.restore();
}
function lot(ctx, pal, halfW) {
  fillPath(ctx, pal.gravel, poly([-halfW, 0, halfW, 0, halfW + 22, 30, -halfW - 22, 30]));
  fillPath(ctx, pal.gravelDark, poly([-halfW, 0, -halfW + 5, 0, -halfW - 12, 30, -halfW - 22, 30]));
  fillPath(ctx, pal.gravelLit, box(-halfW, -0.3, halfW * 2, 0.9));
  for (let i = 0; i < 26; i++) {
    const gx = -halfW - 10 + hash(i + 11) * (halfW * 2 + 20), gy = 1.2 + hash(i + 57) * 12;
    fillPath(ctx, i % 3 ? pal.gravelDark : pal.gravelLit, box(gx, gy, 1.2, 0.6));
  }
}
// A billboard: posts, frame, face, trim line.
function billboard(ctx, pal, bx0, by0, bx1, by1, face = pal.board, edge = pal.boardEdge, posts = null) {
  for (const px of posts || [bx0 + 8, (bx0 + bx1) / 2, bx1 - 8]) {
    fillPath(ctx, pal.post, box(px - 1.2, by1 - 1, 2.4, -by1 + 2));
    fillPath(ctx, pal.postLit, box(px + 0.4, by1 - 1, 0.6, -by1 + 2));
  }
  fillPath(ctx, pal.frame, box(bx0 - 1.2, by0 - 1.2, bx1 - bx0 + 2.4, by1 - by0 + 2.4, 0.8));
  fillPath(ctx, face, box(bx0, by0, bx1 - bx0, by1 - by0));
  if (edge) strokePath(ctx, edge, 0.9, box(bx0 + 1, by0 + 1, bx1 - bx0 - 2, by1 - by0 - 2));
}
function clipFace(ctx, bx0, by0, bx1, by1) { ctx.beginPath(); ctx.rect(bx0, by0, bx1 - bx0, by1 - by0); ctx.clip(); }
function floodlights(ctx, pal, bx0, by0, bx1, by1, xs, warm = '#ffe7b0') {
  for (const lx of xs) {
    strokePath(ctx, pal.lamp, 0.6, (c) => { c.moveTo(lx, by0 - 1.2); c.lineTo(lx, by0 - 4); c.lineTo(lx + 3, by0 - 4.6); });
    fillPath(ctx, pal.lamp, poly([lx + 2, by0 - 5.6, lx + 5, by0 - 4.8, lx + 4.4, by0 - 3.2, lx + 1.6, by0 - 3.8]));
    fillPath(ctx, '#fff4c8', box(lx + 2.4, by0 - 3.9, 2, 0.6));
    ctx.save(); clipFace(ctx, bx0, by0, bx1, by1); glow(ctx, lx + 3.4, by0 + 1, 12, warm, 0.3); ctx.restore();
  }
}
// The patrol car in its own frame (origin on the ground under the rear, facing right) —
// the shipped drawing, with the officer and the light bar as options.
function cruiser(ctx, t, pal, { lights = 'flash', officer = 'radar' } = {}) {
  fillPath(ctx, pal.carBlack, (c) => {
    c.moveTo(-10, -2.2); c.lineTo(-10, -6.2); c.lineTo(3.2, -6.6);
    c.lineTo(6.2, -10.4); c.lineTo(11.6, -10.4); c.lineTo(14.6, -6.8);
    c.lineTo(21.6, -6.2); c.quadraticCurveTo(23.2, -5.6, 23, -2.6); c.lineTo(-10, -2.2); c.closePath();
  });
  fillPath(ctx, pal.carWhite, poly([4.4, -6.5, 14.2, -6.7, 14, -2.6, 4.4, -2.5]));
  fillPath(ctx, pal.carWhite, poly([-9.6, -6.1, 3.4, -6.5, 3.4, -2.5, -9.6, -2.4]));
  fillPath(ctx, pal.carLit, box(14.8, -6.8, 6.8, 0.6));
  fillPath(ctx, pal.carLit, box(-9.6, -6.4, 12.6, 0.5));
  fillPath(ctx, pal.glass, poly([6.8, -9.8, 11.2, -9.8, 13.6, -6.9, 6.8, -6.9]));
  fillPath(ctx, pal.glassLit, poly([11.2, -9.8, 13.6, -6.9, 12.4, -6.9, 10.4, -9.8]));
  fillPath(ctx, pal.glass, poly([3.6, -6.8, 6.2, -9.8, 6.4, -9.8, 6.4, -6.9]));
  fillPath(ctx, pal.badge, circle(9.4, -4.6, 1.05));
  fillPath(ctx, '#ff5a3c', box(-10, -5.6, 0.8, 1.4, 0.3));
  fillPath(ctx, pal.chrome, box(21.4, -4.4, 1.8, 1.8, 0.4));
  strokePath(ctx, pal.chrome, 0.5, (c) => { c.moveTo(23.4, -5.2); c.lineTo(24.4, -5.2); c.lineTo(24.4, -2.2); c.lineTo(22.8, -2.2); });
  for (const wx of [-4, 17.4]) { fillPath(ctx, pal.tyre, circle(wx, -2.2, 2.3)); fillPath(ctx, pal.chrome, circle(wx, -2.2, 0.95)); }
  if (officer === 'radar') {
    fillPath(ctx, pal.skin, circle(8.9, -8.2, 1.25));
    fillPath(ctx, pal.hat, box(7.3, -10.1, 3.4, 1.2, 0.4));
    fillPath(ctx, pal.hat, box(8.3, -9.1, 2.8, 0.45));
    fillPath(ctx, '#101114', box(8.6, -8.7, 1.7, 0.6, 0.2));
    strokePath(ctx, pal.skin, 0.8, (c) => { c.moveTo(10, -7); c.lineTo(12.6, -8.6); });
    fillPath(ctx, pal.gun, poly([12, -9.8, 15.6, -9.2, 15.6, -7.8, 12.4, -8.2]));
    fillPath(ctx, pal.gun, box(12.6, -8.3, 1.1, 2));
    fillPath(ctx, fract(t * 1.1) < 0.5 ? '#ff4040' : '#5a1a1a', box(12.5, -9.6, 1.4, 0.8));
  }
  const beat = Math.floor(t * 7);
  const redOn = lights === 'flash' && beat % 4 < 2;
  const blueOn = lights === 'flash' && !redOn;
  fillPath(ctx, pal.carBlack, box(6, -11.2, 5.8, 0.6));
  fillPath(ctx, redOn ? '#ff3b3b' : '#6a1f1f', box(6.4, -11.8, 2.4, 1.3, 0.4));
  fillPath(ctx, blueOn ? '#3b7bff' : '#1f2e6a', box(9.0, -11.8, 2.4, 1.3, 0.4));
}
// The light bar's wash, in the lot's frame, for a car at carX drawn at scale s.
function lightWash(ctx, t, carX, s, faceRect = null) {
  const redNow = Math.floor(t * 7) % 4 < 2;
  const lit = redNow ? '#ff3b3b' : '#3b7bff';
  const bx = carX + (redNow ? 7.6 : 10.2) * s, by = -11.2 * s;
  glow(ctx, bx, by, 20, lit, 0.5);
  if (faceRect) {
    ctx.save(); clipFace(ctx, ...faceRect); glow(ctx, faceRect[2] + 2, by - 2, 30, lit, 0.35); ctx.restore();
  }
}
// A roadside speed camera on a pole, aimed at the road; `flash` 0..1 fires its strobe.
function speedCamera(ctx, pal, x, top, flash, aim = 0) {
  fillPath(ctx, pal.steelDark, box(x - 0.8, top, 1.6, -top + 1));
  fillPath(ctx, pal.steelLit, box(x + 0.1, top, 0.4, -top + 1));
  ctx.save();
  ctx.translate(x, top);
  ctx.rotate(aim);
  fillPath(ctx, pal.steelDark, box(-1.6, -1.2, 3.2, 2.4, 0.5));
  fillPath(ctx, pal.steel, box(-5.6, -5.2, 10, 5.2, 0.8));
  fillPath(ctx, pal.steelLit, box(-5.6, -5.2, 10, 1, 0.5));
  fillPath(ctx, pal.steelDark, poly([-6.6, -5.8, 4.6, -5.8, 4.6, -5.2, -5.6, -5.2]));
  fillPath(ctx, '#15171a', circle(-4.2, -2.6, 1.6));
  fillPath(ctx, '#5ab0e0', circle(-4.5, -2.9, 0.6));
  fillPath(ctx, flash > 0.05 ? '#ffffff' : '#c9d6dc', box(0.4, -4.2, 3, 1.4, 0.3));
  if (flash > 0.02) {
    glow(ctx, 1.9, -3.5, 26 * flash + 4, '#ffffff', 0.9 * flash);
    strokePath(ctx, rgba('#ffffff', flash), 0.5, (c) => {
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + 0.3; c.moveTo(1.9 + Math.cos(a) * 3, -3.5 + Math.sin(a) * 3); c.lineTo(1.9 + Math.cos(a) * (6 + 9 * flash), -3.5 + Math.sin(a) * (6 + 9 * flash)); }
    });
  }
  ctx.restore();
}
const BOARD = [-44, -37, 33, -6];          // the shipped billboard's face rect

// ================================================================== the gags

// ---------------------------------------------------------------- SHIPS / was
// Both come from the production module, standing where the pack would put them.
function onTheHill(paint) {
  return (ctx, t, camX) => {
    const seat = seatFor(camX);
    for (const x0 of hillSlot(camX)) {
      ctx.save();
      clipSigns(ctx, camX, x0 - 130, x0 + 130);
      paint(ctx, t, x0, seat);
      ctx.restore();
    }
  };
}
const shipped = onTheHill(drawDesertSpeedTrap);
const wasBoast = onTheHill(drawDesertSpeedTrapBoast);

// ---------------------------------------------------------------- the eyes
// A giant pair of the professor's own spectacles on the board, and the eyes behind them
// FOLLOW YOU as you pass, blinking now and then. SPEED™, patent pending, royalties due.
function watchingEyes(ctx, t, camX) {
  onTheLot(ctx, t, camX, (pal, x0) => {
    const [bx0, by0, bx1, by1] = BOARD;
    billboard(ctx, pal, bx0, by0, bx1, by1, '#f3ead2', pal.boardEdge, [-36, -5, 25]);
    ctx.save();
    clipFace(ctx, bx0, by0, bx1, by1);
    // The hero in this lot's frame (landscape: PLAYER_X * ZOOM on screen).
    const heroX = PLAYER_X * ZOOM - x0;
    const blink = fract(t / 3.7);
    const lid = blink < 0.05 ? Math.sin((blink / 0.05) * Math.PI) : 0;
    for (const ex of [-31, -10]) {
      const ey = by0 + 16;
      for (let k = 0; k < 4; k++) fillPath(ctx, k % 2 ? '#e4e0da' : '#f8f6f2', circle(ex - 5 + k * 3.3, ey - 10.4 - (k % 2) * 0.8, 2.6));
      fillPath(ctx, '#ffffff', oval(ex, ey, 7.2, 5.4));
      const d = clamp01((heroX - ex + 80) / 160) * 2 - 1;
      const ix = ex + d * 3.4, iy = ey + 1.3;
      fillPath(ctx, '#3a7fc2', circle(ix, iy, 3.1));
      fillPath(ctx, '#1b2330', circle(ix, iy, 1.6));
      fillPath(ctx, '#ffffff', circle(ix - 0.9, iy - 1, 0.7));
      if (lid > 0) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, 7.2, 5.4, 0, 0, TAU); ctx.clip();
        fillPath(ctx, '#e8c4a0', box(ex - 8, ey - 6, 16, 11 * lid));
        ctx.restore();
      }
      strokePath(ctx, '#2c2a2e', 1.7, circle(ex, ey, 9.2));
      strokePath(ctx, rgba('#ffffff', 0.5), 0.5, (c) => c.arc(ex, ey, 8.3, -2.4, -1.4));
    }
    strokePath(ctx, '#2c2a2e', 1.4, (c) => { c.moveTo(-21.8, by0 + 15); c.quadraticCurveTo(-20.5, by0 + 12.2, -19.2, by0 + 15); });
    text(ctx, 'SPEED™', 17.5, by0 + 8.5, 0.78, pal.red);
    text(ctx, 'PATENT', 17.5, by0 + 15, 0.4, pal.ink);
    text(ctx, 'PENDING', 17.5, by0 + 19.5, 0.4, pal.ink);
    text(ctx, 'ROYALTIES DUE', 17.5, by0 + 24.4, 0.3, pal.red);
    text(ctx, '— THE INVENTOR, 1987', -5.5, by1 - 2.2, 0.24, pal.ink);
    ctx.restore();
    floodlights(ctx, pal, bx0, by0, bx1, by1, [-32, -6, 20]);
    const d = clamp01((heroX - 30 + 80) / 160) * 2 - 1;
    const ph = fract(t / 2.3);
    speedCamera(ctx, pal, 30, by0 - 3, ph < 0.08 ? 1 - ph / 0.08 : 0, 0.3 - d * 0.25);
  });
}

// ---------------------------------------------------------------- toll booth
// A toll booth for the road he invented: $1 per mph, an odometer drum spinning up what
// you owe, the barrier arm lifting, the patrol car waiting behind the price board.
function tollBooth(ctx, t, camX) {
  onTheLot(ctx, t, camX, (pal) => {
    const CAR_X = 26, S = 1.2;
    ctx.save(); ctx.translate(CAR_X, 0); ctx.scale(S, S); cruiser(ctx, t, pal); ctx.restore();
    const [px0, py0, px1, py1] = [1, -41, 37, -11];
    billboard(ctx, pal, px0, py0, px1, py1, '#2f5f4a', '#ead9a5', [8, 30]);
    text(ctx, 'SPEED TOLL', 19, py0 + 4.4, 0.5, '#fff1bd');
    text(ctx, '$1 PER MPH', 19, py0 + 9.6, 0.36, '#fff1bd');
    text(ctx, 'YOU OWE', 19, py0 + 14.4, 0.28, '#ead9a5');
    const v = 1987 + t * 47;
    const cells = 5, cw = 5, ch = 7.4, cx0 = 19 - (cells * cw) / 2, cy0 = py0 + 16.6;
    fillPath(ctx, '#111214', box(cx0 - 1.2, cy0 - 0.8, cells * cw + 2.4, ch + 1.6, 0.6));
    for (let i = 0; i < cells; i++) {
      const place = cells - 1 - i;
      const pow = 10 ** place;
      const digit = Math.floor(v / pow) % 10;
      const roll = place === 0 ? fract(v) : clamp01((v % pow) - (pow - 1));
      const x = cx0 + i * cw;
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 0.3, cy0, cw - 0.6, ch); ctx.clip();
      fillPath(ctx, '#f4efe2', box(x + 0.3, cy0, cw - 0.6, ch));
      text(ctx, String(digit), x + cw / 2, cy0 + ch / 2 - roll * ch, 0.72, '#1d1d22');
      text(ctx, String((digit + 1) % 10), x + cw / 2, cy0 + ch / 2 + (1 - roll) * ch, 0.72, '#1d1d22');
      fillPath(ctx, rgba('#000000', 0.25), box(x + 0.3, cy0, cw - 0.6, 1.4));
      fillPath(ctx, rgba('#000000', 0.25), box(x + 0.3, cy0 + ch - 1.4, cw - 0.6, 1.4));
      ctx.restore();
    }
    text(ctx, 'PAY THE INVENTOR · EST. 1987', 19, py1 - 2.2, 0.22, '#ead9a5');
    // The booth.
    fillPath(ctx, '#e9dcc0', box(-32, -19, 20, 19));
    fillPath(ctx, '#c9b894', box(-32, -19, 3, 19));
    fillPath(ctx, '#fff4d8', box(-15, -19, 1.2, 19));
    fillPath(ctx, '#ffd98a', box(-27.5, -15.5, 11, 7.5, 0.5));
    glow(ctx, -22, -11, 14, '#ffc870', 0.3);
    fillPath(ctx, '#5a3f34', circle(-22.5, -12.4, 1.8));
    fillPath(ctx, '#3a4a6a', box(-25, -10.6, 5, 2.6, 1));
    const reach = smooth(0, 0.3, fract(t / 2.2)) * (1 - smooth(0.7, 1, fract(t / 2.2)));
    strokePath(ctx, '#e0a47a', 0.9, (c) => { c.moveTo(-20, -9.6); c.lineTo(-16 + reach * 3, -9.4 - reach * 0.6); });
    fillPath(ctx, '#e0a47a', oval(-15.4 + reach * 3, -9.6 - reach * 0.6, 1.1, 0.5));
    fillPath(ctx, pal.red, poly([-35, -19, -9, -19, -11, -23.4, -33, -23.4]));
    fillPath(ctx, mix(pal.red, '#ffffff', 0.3), poly([-33, -23.4, -11, -23.4, -11.4, -22.6, -32.6, -22.6]));
    fillPath(ctx, '#1d1d22', box(-31.5, -30, 19, 6.4, 0.6));
    text(ctx, 'TOLL', -22, -26.8, 0.5, '#ffb02e');
    // Barrier arm, dipping and lifting.
    const lift = smooth(0.2, 0.45, fract(t / 2.8)) * (1 - smooth(0.7, 0.9, fract(t / 2.8)));
    ctx.save();
    ctx.translate(-10.6, -7.5);
    ctx.rotate(-lift * 1.25);
    fillPath(ctx, '#f4f1ea', box(0, -0.8, 21, 1.6, 0.6));
    for (let k = 0; k < 5; k++) fillPath(ctx, pal.red, box(1 + k * 4.2, -0.8, 2.1, 1.6));
    ctx.restore();
    fillPath(ctx, pal.steelDark, box(-12, -9.5, 3, 9.5, 0.5));
    lightWash(ctx, t, CAR_X, S, [px0, py0, px1, py1]);
  });
}

// ---------------------------------------------------------------- asleep at the radar
// The patrol car parked in full view, the officer asleep behind the wheel with his hat
// over his eyes and Zs drifting off him, the radar gun on the sill still reading 999.
function asleepAtRadar(ctx, t, camX) {
  onTheLot(ctx, t, camX, (pal) => {
    const [bx0, by0, bx1, by1] = [-52, -38, 14, -8];
    billboard(ctx, pal, bx0, by0, bx1, by1, pal.board, pal.boardEdge, [-44, -19, 6]);
    ctx.save();
    clipFace(ctx, bx0, by0, bx1, by1);
    drawProp(ctx, 'eggshell', bx0 + 1.8, by0 + 4, 28.8, 24);
    text(ctx, 'RADAR', 0, by0 + 8, 0.78, pal.red);
    text(ctx, 'ENFORCED', 0, by0 + 14.4, 0.44, pal.ink);
    text(ctx, 'RADAR: ALSO', 0, by0 + 20.2, 0.3, pal.ink);
    text(ctx, 'MINE. 1987.', 0, by0 + 24, 0.3, pal.ink);
    ctx.restore();
    floodlights(ctx, pal, bx0, by0, bx1, by1, [-44, -18, 4]);
    const CAR_X = 24, S = 1.28;
    ctx.save();
    ctx.translate(CAR_X, 0); ctx.scale(S, S);
    cruiser(ctx, t, pal, { lights: 'off', officer: 'none' });
    const breathe = Math.sin(t * 1.6) * 0.15;
    fillPath(ctx, pal.skin, circle(8.6, -8.1 + breathe, 1.3));
    ctx.save(); ctx.translate(8.4, -9.2 + breathe); ctx.rotate(0.45);
    fillPath(ctx, pal.hat, box(-1.9, -1.2, 3.8, 1.5, 0.4)); fillPath(ctx, pal.hat, box(-1, -0.1, 3.6, 0.5));
    ctx.restore();
    fillPath(ctx, '#5a2a24', oval(9.4, -7.4 + breathe, 0.35, 0.45 + breathe));
    fillPath(ctx, pal.gun, poly([11.6, -7.6, 15.8, -7.2, 15.8, -6.2, 11.8, -6.4]));
    fillPath(ctx, '#0c0c0e', box(11.8, -9.4, 3.4, 1.8, 0.3));
    if (fract(t * 1.4) < 0.7) {
      text(ctx, '999', 13.5, -8.5, 0.2, '#ff4a3a');
      glow(ctx, 13.5, -8.5, 3.4, '#ff4a3a', 0.5);
    }
    ctx.restore();
    for (let k = 0; k < 3; k++) {
      const ph = fract(t * 0.55 + k / 3);
      const zx = CAR_X + 9 * S + ph * 12 + Math.sin(ph * 6 + k) * 1.4, zy = -12 * S - ph * 18;
      const s = 1.2 + ph * 2.2;
      strokePath(ctx, rgba('#fff8e8', 0.95 * Math.sin(ph * Math.PI)), 0.55, (c) => {
        c.moveTo(zx - s, zy - s); c.lineTo(zx + s, zy - s); c.lineTo(zx - s, zy + s); c.lineTo(zx + s, zy + s);
      });
    }
  });
}

// ---------------------------------------------------------------- donut break
// A donut-shop board with a big frosted donut turning on its roof mast — the hole was
// invented in 1987, guess by whom — and the officer at his parked car, donut in one
// hand, SLOW DOWN paddle in the other, flipping it up as you blow past.
function donutBreak(ctx, t, camX) {
  onTheLot(ctx, t, camX, (pal) => {
    const [bx0, by0, bx1, by1] = [-50, -37, 16, -8];
    const CAR_X = 18, S = 1.2;
    ctx.save(); ctx.translate(CAR_X, 0); ctx.scale(S, S); cruiser(ctx, t, pal, { lights: 'off', officer: 'none' }); ctx.restore();
    billboard(ctx, pal, bx0, by0, bx1, by1, '#f7d3dc', '#7a4430', [-42, -17, 8]);
    ctx.save();
    clipFace(ctx, bx0, by0, bx1, by1);
    fillPath(ctx, '#d9a060', circle(-36, by0 + 15, 9));
    fillPath(ctx, '#f06fa4', (c) => { c.arc(-36, by0 + 15, 8, 0, TAU); c.arc(-36, by0 + 15, 3.6, 0, TAU, true); });
    fillPath(ctx, '#f7d3dc', circle(-36, by0 + 15, 3));
    for (let k = 0; k < 9; k++) { const a = k * 0.7 + 0.3; fillPath(ctx, ['#fff4c8', '#5ab0e0', '#ffe04a'][k % 3], box(-36 + Math.cos(a) * 6 - 0.6, by0 + 15 + Math.sin(a) * 5.6, 1.3, 0.5)); }
    text(ctx, 'DONUTS', -8, by0 + 8, 0.72, '#7a4430');
    text(ctx, 'THE HOLE:', -8, by0 + 14.6, 0.34, '#7a4430');
    text(ctx, 'INVENTED 1987', -8, by0 + 19, 0.34, '#7a4430');
    text(ctx, 'GUESS WHO', -8, by0 + 24.4, 0.28, '#c8402e');
    ctx.restore();
    floodlights(ctx, pal, bx0, by0, bx1, by1, [-44, -20, 4], '#ffd6e2');
    // The big donut turning on its mast; its hole shows the sky through it.
    const mx = -17, my = by0 - 16;
    fillPath(ctx, pal.steelDark, box(mx - 0.8, my + 10, 1.6, by0 - my - 10));
    const c = Math.cos(t * 1.7), ac = Math.abs(c);
    const R = 10.5, rt = 3.8;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(mx, my, Math.max(rt, R * ac), R, 0, 0, TAU);
    if (ac > 0.18) ctx.ellipse(mx, my, (R - 2 * rt) * ac, R - 2 * rt, 0, 0, TAU, true);
    ctx.clip();
    fillPath(ctx, '#b87a3e', box(mx - R - 1, my - R - 1, 2 * R + 2, 2 * R + 2));
    if (ac > 0.18) {
      fillPath(ctx, '#f06fa4', (p) => { p.ellipse(mx, my, Math.max(rt, (R - 0.6) * ac), R - 0.6, 0, 0, TAU); p.ellipse(mx, my, (R - 2 * rt + 1.4) * ac, R - 2 * rt + 1.4, 0, 0, TAU, true); });
      for (let k = 0; k < 12; k++) {
        const a = k * (TAU / 12) + 0.2;
        fillPath(ctx, ['#fff4c8', '#5ab0e0', '#ffe04a', '#8ad26a'][k % 4], box(mx + Math.cos(a) * (R - rt) * c - 0.5, my + Math.sin(a) * (R - rt) - 0.3, 1.1, 0.6));
      }
      fillPath(ctx, rgba('#fff4e0', 0.5), oval(mx + 2 * c, my - 5, 2.6 * ac + 0.4, 1.4, -0.4));
    } else {
      fillPath(ctx, '#f06fa4', box(mx - rt + 0.4, my - R + 0.6, 1.6, 2 * R - 1.2, 0.8));
    }
    fillPath(ctx, rgba('#6a3a1a', 0.35), box(mx - R - 1, my + R * 0.45, 2 * R + 2, R));
    ctx.restore();
    // The officer, by his car: donut up to his mouth, SLOW DOWN paddle up as you pass.
    const ox = 42;
    const bite = fract(t / 2.2);
    const toMouth = smooth(0.1, 0.3, bite) * (1 - smooth(0.5, 0.7, bite));
    const paddle = smooth(0.25, 0.4, fract(t / 3)) * (1 - smooth(0.75, 0.9, fract(t / 3)));
    fillPath(ctx, '#1f2a44', box(ox - 2.2, -7, 1.8, 7, 0.4)); fillPath(ctx, '#1f2a44', box(ox + 0.4, -7, 1.8, 7, 0.4));
    fillPath(ctx, '#101114', box(ox - 2.6, -1, 2.4, 1, 0.4)); fillPath(ctx, '#101114', box(ox + 0.2, -1, 2.4, 1, 0.4));
    fillPath(ctx, '#2f4f7a', box(ox - 3, -14.6, 6, 8.2, 1.6));
    fillPath(ctx, '#101114', box(ox - 3, -7.8, 6, 1));
    fillPath(ctx, pal.badge, circle(ox - 1.3, -12.2, 0.7));
    fillPath(ctx, pal.skin, circle(ox, -17.2, 2.3));
    fillPath(ctx, pal.hat, box(ox - 2.6, -20.4, 5.2, 2, 0.6)); fillPath(ctx, pal.hat, box(ox - 3.6, -18.8, 4.6, 0.7));
    fillPath(ctx, '#101114', box(ox - 2.2, -17.8, 2, 0.6));
    const hx = lerp(ox - 4.6, ox - 2.8, toMouth), hy = lerp(-9.5, -16, toMouth);
    strokePath(ctx, '#2f4f7a', 1.4, (p) => { p.moveTo(ox - 2.4, -13.6); p.lineTo(hx, hy); });
    fillPath(ctx, '#d9a060', circle(hx - 0.6, hy - 0.6, 1.6));
    fillPath(ctx, '#f06fa4', circle(hx - 0.6, hy - 0.8, 1.2));
    fillPath(ctx, '#2f4f7a', circle(hx - 0.6, hy - 0.6, 0.45));
    if (toMouth > 0.9) for (let k = 0; k < 3; k++) { const ph = fract(t * 2 + k / 3); fillPath(ctx, '#d9a060', box(ox - 2.4 + k * 0.6, -15 + ph * 14, 0.5, 0.5)); }
    const ax = ox + 3.4, ay = lerp(-10, -21, paddle);
    strokePath(ctx, '#2f4f7a', 1.4, (p) => { p.moveTo(ox + 2.4, -13.6); p.lineTo(ax, ay + 2); });
    strokePath(ctx, pal.steelDark, 0.5, (p) => { p.moveTo(ax, ay + 2); p.lineTo(ax, ay - 3); });
    fillPath(ctx, '#d8392e', circle(ax, ay - 6.4, 3.8));
    strokePath(ctx, '#ffffff', 0.4, circle(ax, ay - 6.4, 3.3));
    text(ctx, 'SLOW', ax, ay - 7.3, 0.26, '#ffffff');
    text(ctx, 'DOWN', ax, ay - 5.4, 0.26, '#ffffff');
  });
}

// ---------------------------------------------------------------- high score
// The board is an arcade high-score table in amber LEDs. The camera flashes and YOUR
// speed counts up the table... and stops at 1986, one short of the inventor's 1987.
function highScore(ctx, t, camX) {
  onTheLot(ctx, t, camX, (pal) => {
    const P = 3.6;
    const u = fract(t / P) * P;
    const CAR_X = 21, S = 1.28;
    ctx.save(); ctx.translate(CAR_X, 0); ctx.scale(S, S); cruiser(ctx, t, pal); ctx.restore();
    const [bx0, by0, bx1, by1] = BOARD;
    billboard(ctx, pal, bx0, by0, bx1, by1, '#121316', '#3a3431', [-36, -5, 25]);
    ctx.save();
    clipFace(ctx, bx0, by0, bx1, by1);
    const amber = '#ffb02e', red = '#ff4a3a';
    const led = (str, x, y, s, col, a = 1) => {
      ctx.save(); ctx.globalAlpha *= a;
      glow(ctx, x, y, 10, col, 0.12);
      text(ctx, str, x, y, s, col);
      ctx.restore();
    };
    led('HI-SCORES', -5.5, by0 + 4.6, 0.5, red);
    led('1  INVENTOR  1987', -5.5, by0 + 11.4, 0.4, amber);
    const count = Math.floor(1986 * (1 - (1 - clamp01((u - 0.2) / 2)) ** 3));
    const done = u > 2.2;
    led(`2  YOU  ${String(count).padStart(4, '0')}`, -5.5, by0 + 17.8, 0.4, '#fff1bd', done || fract(t * 5) < 0.6 ? 1 : 0.35);
    if (done) {
      const on = fract(t * 3) < 0.55;
      led(on ? 'NEW RECORD?' : 'NOPE.', -5.5, by0 + 25, 0.46, on ? amber : red);
    } else {
      led('3  NOBODY  0000', -5.5, by0 + 25, 0.4, amber, 0.7);
    }
    for (let y = by0; y < by1; y += 1.1) fillPath(ctx, rgba('#000000', 0.32), box(bx0, y, bx1 - bx0, 0.45));
    ctx.restore();
    lightWash(ctx, t, CAR_X, S, BOARD);
    speedCamera(ctx, pal, -52, -30, u < 0.35 ? 1 - u / 0.35 : 0, 0.12);
  });
}

// ---------------------------------------------------------------- last gas
// A tall, plain highway sign: LAST GAS 1987 MILES, the villain's year for a distance,
// with his name scratched onto the little plate below — and a speed camera on the same
// post that flashes every car that reads it. A lone pump beside it, the price rolling.
function lastGas(ctx, t, camX) {
  onTheLot(ctx, t, camX, (pal) => {
    // Patrol car idling behind the pump island.
    const CAR_X = 22, S = 1.2;
    ctx.save(); ctx.translate(CAR_X, 0); ctx.scale(S, S); cruiser(ctx, t, pal); ctx.restore();
    // The sign: highway green, cream border and letters, two tall posts.
    const [bx0, by0, bx1, by1] = [-46, -44, 6, -18];
    billboard(ctx, pal, bx0, by0, bx1, by1, '#2f5f4a', '#ead9a5', [-38, -2]);
    text(ctx, 'LAST GAS', -20, by0 + 6.4, 0.72, '#fff1bd');
    text(ctx, '1987', -20, by0 + 15.2, 1.05, '#fff1bd');
    text(ctx, 'MILES', -20, by0 + 22.2, 0.46, '#fff1bd');
    fillPath(ctx, '#ead9a5', box(-34, by1 + 2, 28, 5.4, 0.6));
    text(ctx, 'BY ORDER OF ITS INVENTOR', -20, by1 + 4.7, 0.24, '#2f5f4a');
    const ph = fract(t / 2.6);
    speedCamera(ctx, pal, -2, by0 - 2, ph < 0.1 ? 1 - ph / 0.1 : 0, -0.1);
    // A lone vintage pump, price digits rolling ever upward.
    const px = 18;
    fillPath(ctx, '#c8402e', box(px - 4, -16, 8, 16, 1.4));
    fillPath(ctx, mix('#c8402e', '#ffffff', 0.3), box(px - 4, -16, 8, 1.2, 0.6));
    fillPath(ctx, '#f4efe2', circle(px, -20, 3.6));
    strokePath(ctx, '#c8402e', 0.6, circle(px, -20, 3.6));
    text(ctx, 'GAS', px, -20, 0.26, '#c8402e');
    fillPath(ctx, '#111214', box(px - 3, -13, 6, 3.6, 0.4));
    const price = (19.87 + t * 1.3).toFixed(2);
    text(ctx, '$' + price, px, -11.2, 0.22, '#ffb02e');
    strokePath(ctx, '#1d1d22', 0.7, (c) => { c.moveTo(px + 4, -9); c.quadraticCurveTo(px + 8, -6, px + 6.4, -1.4); });
    fillPath(ctx, '#1d1d22', box(px + 3.6, -9.8, 1.6, 2.4, 0.4));
    lightWash(ctx, t, CAR_X, S);
  });
}

// ---------------------------------------------------------------- flash bulb
// An old press camera on a tripod does the speed checking: the bulb glows, POPS, the
// board flares white, glass tinkles off, a puff of smoke drifts away — and a fresh bulb
// is screwed in for the next one. The villain grins: PHOTO FINISH™, 1987.
function flashBulb(ctx, t, camX) {
  onTheLot(ctx, t, camX, (pal) => {
    const P = 2.8;
    const u = fract(t / P) * P;
    const POP = 1.8;
    const age = u - POP;
    const [bx0, by0, bx1, by1] = [-52, -38, 14, -8];
    billboard(ctx, pal, bx0, by0, bx1, by1, pal.board, pal.boardEdge, [-44, -19, 6]);
    ctx.save();
    clipFace(ctx, bx0, by0, bx1, by1);
    drawProp(ctx, 'eggshell', bx0 + 1.8, by0 + 4, 28.8, 24);
    text(ctx, 'SAY', 0, by0 + 6.4, 0.5, pal.ink);
    text(ctx, 'CHEESE!', 0, by0 + 13.2, 0.72, pal.red);
    text(ctx, 'PHOTO FINISH™', 0, by0 + 20, 0.3, pal.ink);
    text(ctx, 'EST. 1987', 0, by0 + 24.2, 0.3, pal.ink);
    if (age >= 0 && age < 0.3) { ctx.fillStyle = rgba('#ffffff', 0.6 * (1 - age / 0.3)); ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0); }
    ctx.restore();
    floodlights(ctx, pal, bx0, by0, bx1, by1, [-44, -18, 4]);
    const cx = 32, cy = -17;
    strokePath(ctx, '#5a4838', 0.7, (c) => { c.moveTo(cx, cy + 3); c.lineTo(cx - 7, 0); c.moveTo(cx, cy + 3); c.lineTo(cx + 7, 0); c.moveTo(cx, cy + 3); c.lineTo(cx + 1, 0); });
    fillPath(ctx, '#1d1c20', box(cx - 1, cy - 6, 9, 9, 0.8));
    fillPath(ctx, '#4a4650', box(cx - 1, cy - 6, 9, 1));
    for (let k = 0; k < 4; k++) fillPath(ctx, k % 2 ? '#2c2a30' : '#3c3a42', poly([cx - 1 - k * 1.6, cy - 5.4 + k * 0.5, cx - 2.6 - k * 1.6, cy - 5 + k * 0.6, cx - 2.6 - k * 1.6, cy + 2 - k * 0.6, cx - 1 - k * 1.6, cy + 2.4 - k * 0.5]));
    fillPath(ctx, '#2a2830', box(cx - 9.4, cy - 3.6, 2, 5, 0.4));
    fillPath(ctx, '#111114', circle(cx - 9.6, cy - 1.1, 1.6));
    fillPath(ctx, '#5ab0e0', circle(cx - 9.9, cy - 1.4, 0.6));
    const fx = cx + 6, fy = cy - 13;
    strokePath(ctx, pal.steelDark, 0.6, (c) => { c.moveTo(cx + 5, cy - 6); c.lineTo(fx, fy + 3); });
    fillPath(ctx, pal.steelLit, (c) => { c.moveTo(fx - 1, fy - 5); c.quadraticCurveTo(fx - 6, fy, fx - 1, fy + 5); c.lineTo(fx + 0.6, fy + 5); c.quadraticCurveTo(fx - 3.4, fy, fx + 0.6, fy - 5); c.closePath(); });
    fillPath(ctx, pal.steel, (c) => { c.moveTo(fx - 1, fy - 5); c.quadraticCurveTo(fx - 6, fy, fx - 1, fy + 5); c.quadraticCurveTo(fx - 4.2, fy, fx - 1, fy - 5); c.closePath(); });
    const fresh = u < POP ? 1 : u > 2.5 ? smooth(2.5, 2.62, u) : 0;
    if (fresh > 0) {
      const charge = u < POP ? smooth(1.2, POP, u) : 0;
      fillPath(ctx, rgba('#e8f4ff', 0.9), circle(fx - 2.6, fy, 1.6 * fresh));
      fillPath(ctx, '#ffffff', circle(fx - 3, fy - 0.5, 0.5 * fresh));
      if (charge > 0) glow(ctx, fx - 2.6, fy, 6, '#fff4c8', 0.6 * charge);
    }
    if (age >= 0 && age < 0.9) {
      const k = 1 - clamp01(age / 0.35);
      if (k > 0) {
        glow(ctx, fx - 2.6, fy, 40 * k + 6, '#ffffff', 0.95 * k);
        strokePath(ctx, rgba('#ffffff', k), 0.6, (c) => { for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.moveTo(fx - 2.6 + Math.cos(a) * 3, fy + Math.sin(a) * 3); c.lineTo(fx - 2.6 + Math.cos(a) * (8 + 14 * k), fy + Math.sin(a) * (8 + 14 * k)); } });
      }
      for (let i = 0; i < 5; i++) {
        const a = -1.2 + i * 0.6;
        const sx = fx - 2.6 + Math.cos(a) * age * 26, sy = fy + Math.sin(a) * age * 16 + age * age * 40;
        fillPath(ctx, rgba('#e8f4ff', 1 - age / 0.9), poly([sx, sy - 0.6, sx + 0.6, sy, sx, sy + 0.5, sx - 0.5, sy]));
      }
    }
    if (age >= 0) {
      for (let i = 0; i < 4; i++) {
        const a2 = age - i * 0.06;
        if (a2 < 0) continue;
        puff(ctx, fx - 2 + a2 * 7 + i, fy - 2 - a2 * 9 - i * 1.4, 1.4 + a2 * 3.2, 0.7 * (1 - a2), SMOKE);
      }
    }
  });
}

export const SPEED_SIGN_GAGS = [
  { id: 'ships', place: 'bg', name: 'SHIPS · SMILE! speed camera', paint: shipped,
    note: 'SHIPS (Peter, 24 Sep 2026). The board says SMILE! YOU\'RE ON SPEED CAMERA; the camera on its pole fires, the face flares white, and the board becomes a lineup mugshot of whoever just went through — smeared across the photo by their own speed — with GOTCHA! and a $1986 fine slammed on. The patrol car behind the board lights up the moment the shutter fires. Drawn by the production painter (drawDesertSpeedTrap).' },
  { id: 'was', place: 'bg', name: 'was · I invented speed', paint: wasBoast,
    note: 'The first shipped version: the villain\'s portrait and his boast on a floodlit billboard, a patrol car hiding behind it with only its nose, the officer\'s shades and a radar gun showing, and a YOUR SPEED sign that always reads over (drawDesertSpeedTrapBoast).' },
  { id: 'eyes', place: 'bg', name: 'The eyes follow you — SPEED™', paint: watchingEyes,
    note: 'A giant pair of the professor\'s spectacles under his bushy white brows, and the eyes behind them track the hero as the board goes by, blinking now and then; a speed camera on the corner swivels with them. SPEED™ — PATENT PENDING — ROYALTIES DUE, signed the inventor, 1987. Quietly unsettling, and it reads at a glance because the pupils move.' },
  { id: 'toll', place: 'bg', name: 'Speed toll — $1 per mph', paint: tollBooth,
    note: 'A toll booth for the road he invented: SPEED TOLL, $1 PER MPH, an odometer drum rolling up YOU OWE, the attendant\'s hand coming out palm-up and the striped barrier arm lifting and dropping. The patrol car waits behind the price board with its lights going. Pay the inventor, est. 1987.' },
  { id: 'asleep', place: 'bg', name: 'Asleep at the radar — 999', paint: asleepAtRadar,
    note: 'The patrol car parked in full view in front of a RADAR ENFORCED board ("radar: also mine, 1987"), the officer asleep with his hat tipped over his eyes, Zs floating off him, lights dark — and the radar gun propped on the sill still blinking 999. The law is out here; it is just not awake.' },
  { id: 'donut', place: 'bg', name: 'Donut break — SLOW DOWN paddle', paint: donutBreak,
    note: 'A pink donut-shop board — THE HOLE: INVENTED 1987, GUESS WHO — with a big frosted donut turning on its roof mast, sprinkles and all, sky showing through the hole. The officer stands by his parked car taking bites (crumbs falling) and flips up a SLOW DOWN paddle as you blow past. The softest, funniest version of the police moment.' },
  { id: 'highscore', place: 'bg', name: 'Hi-score table — one short of 1987', paint: highScore,
    note: 'The billboard is an arcade high-score table in scanlined amber LEDs. The speed camera flashes and YOUR speed counts up the table — and stops at 1986, one short of the INVENTOR\'s 1987, flashing NEW RECORD? / NOPE. Speed-as-score is the cabinet\'s whole game; this sign keeps score against the villain.' },
  { id: 'lastgas', place: 'bg', name: 'LAST GAS 1987 MILES', paint: lastGas,
    note: 'A plain green highway sign — LAST GAS / 1987 / MILES, "by order of its inventor" — with a speed camera on its post flashing every runner who reads it, a lone red pump beside it whose price keeps rolling up, and the patrol car idling behind. The driest joke in the set: his year, posing as a distance.' },
  { id: 'flashbulb', place: 'bg', name: 'Flash bulb — PHOTO FINISH™', paint: flashBulb,
    note: 'The speed camera is a vintage press camera on a tripod, bellows and all: its bulb glows, POPS in a burst of light that flares the board, glass tinkles off, a puff of smoke drifts away and a fresh bulb appears for the next one. The villain grins over SAY CHEESE! — PHOTO FINISH™, est. 1987. Old-tech comedy beside the modern radar gag.' },
];
