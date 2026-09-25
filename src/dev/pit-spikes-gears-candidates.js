// Gallery-only HARD PIT FILLS, round two: better SPIKES and better GEARS.
//
// SETTLED 24 Sep 2026: spikes B/C/D and gears B/C SHIP, mixed per bay, from
// game/pitFillHard.js (SPEED ZONE is all C). The A cards now draw the shipped
// mix through drawPitFill; gears D is the one loser.
//
// Peter, 24 Sep 2026: "Better spikes/gears". The two hard fills in
// game/pitFill.js are the only pit materials that are OBJECTS rather than a
// liquid surface, so everything they say they say with silhouette — at lane
// size, from the road, with only the top ~12 world px of the break on screen at
// rest. Every candidate here keeps the shipped contract so a winner ports
// straight into pitFill.js:
//
//   - painters draw into the fill's local box: x 0..w, y 0 at the flat
//     groundline down to y = d, never across the open top of the break
//     (the sky and parallax read straight through it);
//   - a spike bed's TALLEST tips stand at SPIKE_TIPS of the apron and a gear
//     train's highest tooth at GEAR_TOPS — that is where game/run.js stops a
//     falling hero, so the art has to reach exactly there;
//   - portrait closes a dry bay with hardFillCutoff()'s line rather than
//     running the shaft to the bottom of the phone.
//
// WHERE THEY SHOW, because it is not where you would guess:
//   spikes — every stepping-stone CROSSING that does not name a fill:
//            speed-3 (faux3d), surge-2 (surge, which cycles packs) and rhythm-2
//            — but the LCD pack sets `ownPitFills` and cuts its own ink cogs
//            (lcdGear) into every break, so RHYTHM BANKRUPTCY's
//            `pitFill: 'spikes'` is never actually drawn on its own cabinet.
//   gears  — plumber-2's crossing only (`fill: 'gears'`, stage-layouts.js).
//   The lane's standalone spike hazard (popSpikes in sprites/props.js) is a
//   separate prop; the shipped pit tooth copies its proportions on purpose.
//
// Nothing here is wired to the game. `paint(ctx, w, d, t, lift, env)` is the
// pitFill.js signature plus `env` = { pack, bpm } so a candidate can take the
// cabinet's paper finish or step on its tempo.
import { GROUND_Y, ZOOM, applyWorld } from '../engine/camera.js';
import { W, H } from '../engine/renderer.js';
import {
  drawPitFill, SPIKE_TIPS, GEAR_TOPS, hardFillCutoff, liquidSurfaceDepth,
  HARD_FILL_LANDSCAPE_DEPTH,
} from '../game/pitFill.js';
import { makeObstacle } from '../game/entities.js';
import {
  setGroundRises, groundRises, riseHeight, terrainGroundY, drawTerrain, drawRoutes,
} from '../game/terrain.js';
import { crossingLayout, buildRoutes, routeRise } from '../game/routes.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';

const TAU = Math.PI * 2;
const INK = '#232a34';

// ------------------------------------------------------------------ helpers
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function ease(k) { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); }

// The dry bay, exactly as pitFill.js's (unexported) basePlate paints it:
// landscape gets a banded plate from `y` down, portrait gets only the closing
// line at hardFillCutoff and leaves the background showing below.
function plate(ctx, w, d, y, bottom, top = '#232a34', body = '#171522') {
  const end = Math.max(y + 2, Math.min(d, bottom));
  if (d > HARD_FILL_LANDSCAPE_DEPTH) {
    ctx.fillStyle = '#59636f'; ctx.fillRect(0, end, w, 1);
    ctx.fillStyle = '#232a34'; ctx.fillRect(0, end + 1, w, 1);
    return;
  }
  const detailD = liquidSurfaceDepth(d);
  const band = Math.max(2, detailD * 0.06);
  ctx.fillStyle = top; ctx.fillRect(0, y, w, band);
  ctx.fillStyle = body; ctx.fillRect(0, y + band, w, Math.max(0, end - (y + band)));
}

// A four-point star: the one mark that says "sharp steel caught the light"
// without a gradient. Additive, so it can only ever brighten what it lands on.
function sparkle(ctx, x, y, r, a, color = '#ffffff') {
  if (a <= 0.01 || r <= 0.05) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = color;
  ctx.beginPath();
  const k = r * 0.18;
  ctx.moveTo(x, y - r); ctx.lineTo(x + k, y - k); ctx.lineTo(x + r, y); ctx.lineTo(x + k, y + k);
  ctx.lineTo(x, y + r); ctx.lineTo(x - k, y + k); ctx.lineTo(x - r, y); ctx.lineTo(x - k, y - k);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Run a path builder through the cabinet's paper finish when it has one (the
// plumber pack does): a close contact shadow under the silhouette and the
// cardstock grain over it — the same two passes drawRoutes gives a slab.
function paperContact(ctx, env, pathFn) {
  const ps = env?.pack?.paperSlab;
  if (ps?.contact) ps.contact(ctx, () => pathFn(ctx), { subtle: true });
}
function paperFinish(ctx, env, pathFn) {
  const ps = env?.pack?.paperSlab;
  if (ps?.finish) ps.finish(ctx, () => pathFn(ctx));
}

// ===================================================================== SPIKES
// Every spike candidate: tallest tip at SPIKE_TIPS, base on the plate at half
// the apron (where the shipped bed stands), fixed pitch so a 60px pit and a
// 600px crossing read the same.

// B — STAGGERED STEEL. The tooth as a faceted blade, not a flat triangle: a lit
// face and a shadow face split down the ridge is what makes a 3px triangle read
// as a three-dimensional point from across the frame. Heights run in a
// tall-short-mid-short figure so the row has a rhythm rather than a comb, and
// the teeth stand in a bolted rail. The glint is a star that walks the row,
// popping on one TIP at a time — light caught on a point, not a smear.
function spikesSteel(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const base = detailD * 0.5;
  plate(ctx, w, d, base, hardFillCutoff('spikes', w, d));
  const tip = detailD * SPIKE_TIPS;
  const pitch = 7;
  const n = Math.max(3, Math.round(w / pitch));
  const step = w / n;
  const FIG = [1, 0.62, 0.82, 0.55];
  const tall = base - tip;
  const tips = [];
  for (let i = 0; i < n; i++) {
    const cx = step * (i + 0.5);
    const h = tall * FIG[i % 4];
    const half = step * (FIG[i % 4] > 0.9 ? 0.36 : 0.3);
    const ty = base - h;
    // shadow face (right) then lit face (left) then one ink outline.
    ctx.fillStyle = '#6f7b8b';
    ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + half, base); ctx.lineTo(cx, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eef3f8';
    ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx, base); ctx.lineTo(cx - half, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.moveTo(cx - half, base); ctx.lineTo(cx, ty); ctx.lineTo(cx + half, base); ctx.stroke();
    tips.push([cx, ty]);
  }
  // The rail: a dark bar with a lit top edge and a bolt head between teeth.
  const rh = 2.4;
  ctx.fillStyle = '#39414d'; ctx.fillRect(0, base - 0.6, w, rh);
  ctx.fillStyle = '#9aa6b5'; ctx.fillRect(0, base - 0.6, w, 0.45);
  ctx.fillStyle = INK; ctx.fillRect(0, base - 0.6 + rh, w, 0.4);
  for (let i = 0; i < n; i += 2) {
    const bx = step * (i + 1);
    if (bx >= w - 0.5) continue;
    ctx.fillStyle = '#c3ccd7';
    ctx.beginPath(); ctx.arc(bx, base + 0.6, 0.55, 0, TAU); ctx.fill();
  }
  // The walking glint: one tall tip at a time, a quick flare and fade.
  const talls = tips.filter((_, i) => i % 4 === 0);
  if (talls.length) {
    const rate = 2.6;
    const k = t * rate;
    const at = Math.floor(k) % (talls.length + 2);
    const f = k - Math.floor(k);
    if (at < talls.length) {
      const [gx, gy] = talls[at];
      const a = f < 0.25 ? f / 0.25 : 1 - (f - 0.25) / 0.75;
      sparkle(ctx, gx, gy + 0.3, 2.2 * a + 0.4, a * 0.95);
    }
  }
}

// C — RUSTED STAKES. The trap somebody set a long time ago. Iron stakes, each
// leaning its own few degrees so the row is a hand-planted thing, rust-dark
// with a filed bright point — the metal is only clean where it is sharp, which
// puts the one light value exactly where the danger is. Barbed wire strung
// between them, and a skull and a thigh bone at their feet: the fastest "this
// kills you" in the whole vocabulary. The wire's sway is the motion.
function spikesStakes(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const base = detailD * 0.5;
  plate(ctx, w, d, base, hardFillCutoff('spikes', w, d), '#3a2a22', '#1c1512');
  const tip = detailD * SPIKE_TIPS;
  const pitch = 8;
  const n = Math.max(3, Math.round(w / pitch));
  const step = w / n;
  const boneEvery = Math.max(3, Math.round(40 / step));
  const stakes = [];
  for (let i = 0; i < n; i++) {
    const seed = i * 7.31 + 3.7;
    const cx = step * (i + 0.5) + (hash(seed) - 0.5) * step * 0.3;
    const lean = (hash(seed + 1) - 0.5) * 0.36;
    // Every other stake reaches the full height; the rest fall short, so the
    // tips form a ragged line whose TOP is SPIKE_TIPS.
    const h = (base - tip) * (i % 2 === 0 ? 1 : 0.7 + hash(seed + 2) * 0.2) / Math.cos(lean);
    const sx = Math.sin(lean), sy = -Math.cos(lean); // unit vector up the stake
    const nx = -sy, ny = sx;                          // across it
    const half = 1.35;
    const tx = cx + sx * h, ty = base + sy * h;
    stakes.push({ cx, tx, ty, sx, sy, h });
    // One long tapered spike, not a shaft with a cone on it: a shaft and a
    // cone is a pencil. Dark rust on the shadow side, a lit rust edge, and the
    // top third filed back to bright steel — clean only where it is sharp.
    const L = [cx - nx * half, base - ny * half], R = [cx + nx * half, base + ny * half];
    ctx.fillStyle = '#4a2416';
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(tx, ty); ctx.lineTo(R[0], R[1]); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a2552c';
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(tx, ty); ctx.lineTo(cx, base); ctx.closePath(); ctx.fill();
    // filed point: bright steel over the top 38%
    const k = 0.62;
    const fx = cx + sx * h * k, fy = base + sy * h * k;
    const fh = half * (1 - k);
    ctx.fillStyle = '#b9c0c8';
    ctx.beginPath(); ctx.moveTo(fx - nx * fh, fy - ny * fh); ctx.lineTo(tx, ty); ctx.lineTo(fx + nx * fh, fy + ny * fh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath(); ctx.moveTo(fx - nx * fh, fy - ny * fh); ctx.lineTo(tx, ty); ctx.lineTo(fx, fy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1210'; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.moveTo(L[0], L[1]); ctx.lineTo(tx, ty); ctx.lineTo(R[0], R[1]); ctx.stroke();
  }
  // BARBED WIRE strung stake to stake a third of the way up, sagging between
  // them and swaying a hair. It crosses the top band of the break where the
  // camera can see it from the road, and wire between stakes is what turns a
  // row of points into a TRAP somebody built.
  const wireAt = 0.55;
  ctx.strokeStyle = '#c9ccd0'; ctx.lineWidth = 0.38;
  for (let i = 0; i + 1 < stakes.length; i++) {
    const a = stakes[i], b = stakes[i + 1];
    const ha = Math.min(a.h, b.h) * wireAt;
    const ax = a.cx + a.sx * ha, ay = base + a.sy * ha;
    const bx = b.cx + b.sx * ha, by = base + b.sy * ha;
    const sag = 1.4 + Math.sin(t * 2.3 + i * 1.7) * 0.35;
    const mx = (ax + bx) / 2, my = (ay + by) / 2 + sag;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my + sag * 0.3, bx, by); ctx.stroke();
    // two barbs per span, each a little X
    for (const u of [0.33, 0.67]) {
      const px = (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * mx + u * u * bx;
      const py = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * (my + sag * 0.3) + u * u * by;
      ctx.beginPath();
      ctx.moveTo(px - 0.7, py - 0.7); ctx.lineTo(px + 0.7, py + 0.7);
      ctx.moveTo(px + 0.7, py - 0.7); ctx.lineTo(px - 0.7, py + 0.7);
      ctx.stroke();
    }
  }
  // Bones at the foot of the row: a skull, then a thigh bone, alternating.
  for (let i = 1; i < n - 1; i += boneEvery) {
    const bx = step * (i + 1);
    if (((i / boneEvery) | 0) % 2 === 0) drawSkull(ctx, bx, base, hash(i + 5) > 0.5 ? 1 : -1);
    else drawBone(ctx, bx, base - 0.9, (hash(i + 6) - 0.5) * 0.5);
  }
}

function drawSkull(ctx, x, base, face) {
  const r = 2.1;
  const cy = base - r * 0.95;
  ctx.fillStyle = '#efe6cf';
  ctx.strokeStyle = INK; ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.ellipse(x, cy, r * 1.05, r, 0, 0, TAU); ctx.fill(); ctx.stroke();
  // jaw
  ctx.beginPath(); ctx.rect(x - r * 0.55 + face * 0.3, cy + r * 0.55, r * 1.1, r * 0.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.arc(x - r * 0.38 + face * 0.35, cy + 0.05, r * 0.3, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.38 + face * 0.35, cy + 0.05, r * 0.3, 0, TAU); ctx.fill();
  ctx.fillRect(x + face * 0.35 - 0.2, cy + r * 0.45, 0.4, 0.5);
}

function drawBone(ctx, x, y, a) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = '#efe6cf'; ctx.strokeStyle = INK; ctx.lineWidth = 0.32;
  const L = 3.2;
  ctx.beginPath();
  ctx.rect(-L, -0.45, L * 2, 0.9);
  for (const sx of [-L, L]) {
    ctx.moveTo(sx + 0.75, -0.75); ctx.arc(sx, -0.6, 0.75, 0, TAU);
    ctx.moveTo(sx + 0.75, 0.6); ctx.arc(sx, 0.6, 0.75, 0, TAU);
  }
  ctx.fill(); ctx.stroke();
  ctx.fillRect(-L + 0.3, -0.4, L * 2 - 0.6, 0.8);
  ctx.restore();
}

// D — PISTON BED. The spikes as a machine that FIRES: the bed is cut into
// blocks of three teeth, each on a ram, and on every beat one block slams to
// full height and eases back while the next one along loads. Never lower than
// four fifths — always lethal, the motion is a threat not a window — but the
// snap is the thing the eye catches from the lane, and it lands on the music.
// Yellow-and-ink chevrons on the ram faces are the hazard stripe the lane's
// own spike plate already wears.
function spikesPiston(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const base = detailD * 0.5;
  plate(ctx, w, d, base, hardFillCutoff('spikes', w, d));
  const tip = detailD * SPIKE_TIPS;
  const bpm = env?.bpm || 120;
  const beat = t * bpm / 60;
  const TEETH = 3;
  const pitch = 7;
  const nb = Math.max(1, Math.round(w / (pitch * TEETH)));
  const bw = w / nb;
  const ramH = 4;
  const full = base - tip - ramH * 0.35; // tooth height at full extension
  for (let b = 0; b < nb; b++) {
    // Which block fires: a wave that walks the bed, one block per beat,
    // four blocks apart so a long crossing has several going at once.
    const since = ((beat - b) % 4 + 4) % 4; // beats since this block last fired
    const kick = since < 1 ? Math.pow(1 - since, 3) : 0; // snap out, ease home
    const ext = 0.8 + 0.2 * kick;
    const x0 = b * bw + 0.5, x1 = (b + 1) * bw - 0.5;
    const rise = (1 - ext) * full; // how far the block sits below full
    const ry = base - ramH + rise;
    // the ram head, with a hazard stripe
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, ry, x1 - x0, base - ry + 0.2); ctx.clip();
    ctx.fillStyle = '#e8c23a'; ctx.fillRect(x0, ry, x1 - x0, base - ry + 0.2);
    ctx.fillStyle = INK;
    for (let s = x0 - 6; s < x1 + 2; s += 3) {
      ctx.beginPath(); ctx.moveTo(s, base + 0.2); ctx.lineTo(s + 1.4, base + 0.2);
      ctx.lineTo(s + 1.4 + ramH, ry); ctx.lineTo(s + ramH, ry); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
    ctx.strokeRect(x0, ry, x1 - x0, base - ry);
    // the teeth
    const tstep = (x1 - x0) / TEETH;
    for (let k = 0; k < TEETH; k++) {
      const cx = x0 + tstep * (k + 0.5);
      const h = full * (k === 1 ? 1 : 0.84);
      const half = tstep * 0.36;
      const ty = ry - h + (base - ry) * 0 ;
      ctx.fillStyle = '#707c8c';
      ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx + half, ry); ctx.lineTo(cx, ry); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eef3f8';
      ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx, ry); ctx.lineTo(cx - half, ry); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 0.42;
      ctx.beginPath(); ctx.moveTo(cx - half, ry); ctx.lineTo(cx, ty); ctx.lineTo(cx + half, ry); ctx.stroke();
      if (kick > 0.35 && k === 1) sparkle(ctx, cx, ty + 0.2, 2.6 * kick, kick);
    }
  }
}

// ===================================================================== GEARS
// Every gear candidate: highest tooth at GEAR_TOPS, bay plate from there down.

// One spur gear: `n` teeth on pitch radius r, tooth depth `dep`, rotated `a`.
function gearPath(ctx, cx, cy, r, n, a, dep) {
  const ro = r + dep * 0.5, ri = r - dep * 0.5;
  const tw = TAU / n;
  for (let k = 0; k < n; k++) {
    const c = a + k * tw;
    // trapezoid tooth: root half-width 0.3 pitch, tip half-width 0.17 pitch
    const pts = [[c - tw * 0.5, ri], [c - tw * 0.29, ri], [c - tw * 0.16, ro], [c + tw * 0.16, ro], [c + tw * 0.29, ri]];
    for (const [ang, rad] of pts) {
      const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
      if (k === 0 && ang === pts[0][0]) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

// A wheel with spoke windows cut through (evenodd), so the bay shows through
// the gear and the eye reads a real part, not a disc with a sticker on it.
function spokedWheel(ctx, cx, cy, r, n, a, dep, spokes, env, pal) {
  const build = (c) => {
    gearPath(c, cx, cy, r, n, a, dep);
    // spoke windows: annular sectors between the hub and the rim
    const rin = r * 0.34, rout = r - dep * 0.5 - Math.max(0.9, r * 0.14);
    if (spokes && rout > rin + 0.8) {
      for (let s = 0; s < spokes; s++) {
        const s0 = a * 1 + (s / spokes) * TAU + 0.28 * (TAU / spokes) * 0.5;
        const s1 = s0 + (TAU / spokes) * 0.62;
        c.moveTo(cx + Math.cos(s0) * rout, cy + Math.sin(s0) * rout);
        c.arc(cx, cy, rout, s0, s1);
        c.arc(cx, cy, rin, s1, s0, true);
        c.closePath();
      }
    }
  };
  paperContact(ctx, env, (c) => { c.beginPath(); build(c); });
  ctx.beginPath(); build(ctx);
  ctx.fillStyle = pal.body; ctx.fill('evenodd');
  // top light: a lit rim band on the upper half only (clip to the wheel).
  ctx.save();
  ctx.beginPath(); build(ctx); ctx.clip('evenodd');
  ctx.fillStyle = pal.lit;
  ctx.beginPath(); ctx.ellipse(cx - r * 0.12, cy - r * 0.55, r * 1.05, r * 0.75, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.body;
  ctx.beginPath(); ctx.ellipse(cx + r * 0.05, cy - r * 0.2, r * 0.98, r * 0.8, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.beginPath(); build(ctx);
  ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(0.35, r * 0.045); ctx.stroke();
  paperFinish(ctx, env, (c) => { c.beginPath(); build(c); });
  // hub
  ctx.fillStyle = pal.hub;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.26, 0, TAU); ctx.fill();
  ctx.strokeStyle = pal.ink; ctx.lineWidth = Math.max(0.3, r * 0.04); ctx.stroke();
  ctx.fillStyle = pal.ink;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.1, 0, TAU); ctx.fill();
  // one bright bolt on the hub: turning is visible even where spokes are not
  ctx.fillStyle = pal.hubLit;
  ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.17, cy + Math.sin(a) * r * 0.17, r * 0.055 + 0.2, 0, TAU); ctx.fill();
}

// Lay a meshing train along the top line: tops aligned at `top`, neighbour
// centres exactly r1 + r2 apart (so pitch circles touch), each angle derived
// from its neighbour's so teeth fall into gaps. Returns the wheels.
function meshTrain(w, top, dep, specs, t, speed) {
  // specs: tooth counts to cycle; module m sets pitch radius r = n*m/2.
  const m = 1.55;
  const wheels = [];
  let x = null;
  let i = 0;
  // Centre the train: first lay it from 0, then shift.
  while (true) {
    const n = specs[i % specs.length];
    const r = n * m / 2;
    const cy = top + dep * 0.5 + r;
    if (x === null) x = r + 1;
    else {
      const p = wheels[wheels.length - 1];
      const dy = cy - p.cy;
      x = p.cx + Math.sqrt(Math.max(0, (p.r + r) ** 2 - dy * dy));
    }
    if (x + r > w + r * 0.6 && wheels.length >= 2) break;
    wheels.push({ cx: x, cy, r, n });
    i++;
    if (i > 200) break;
  }
  const span = wheels[wheels.length - 1].cx - wheels[0].cx;
  const shift = (w - span) / 2 - wheels[0].cx;
  for (const g of wheels) g.cx += shift;
  // Angles: wheel 0 turns at `speed` rad/s; each next derived by the mesh rule
  // θj = φ + π − π/Nj + (Ni/Nj)(φ − θi), φ = direction from i to j.
  wheels[0].a = t * speed;
  for (let k = 1; k < wheels.length; k++) {
    const gi = wheels[k - 1], gj = wheels[k];
    const phi = Math.atan2(gj.cy - gi.cy, gj.cx - gi.cx);
    gj.a = phi + Math.PI - Math.PI / gj.n + (gi.n / gj.n) * (phi - gi.a);
    gj.contact = [gi.cx + Math.cos(phi) * gi.r, gi.cy + Math.sin(phi) * gi.r];
  }
  return wheels;
}

const IRON = { body: '#5d6672', lit: '#aeb8c4', hub: '#d9a441', hubLit: '#fff1b8', ink: '#1b2028' };

// B — THE MESHED TRAIN. The shipped idea done properly. Tooth counts from the
// radius (one module across the train), pitch circles exactly touching, and
// every wheel's angle DERIVED from its neighbour's, so the teeth really fall
// into each other's gaps and the ratio is right — the small wheel spins
// faster, visibly, because it has to. Spoke windows cut through the steel let
// the bay show through, which is what makes a disc read as a wheel; the brass
// hub stays the one warm moving thing.
function gearsMeshed(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const top = detailD * GEAR_TOPS;
  const dep = 1.7;
  plate(ctx, w, d, top + 1.5, hardFillCutoff('gears', w, d));
  const wheels = meshTrain(w, top, dep, [13, 8, 11, 8], t, 0.9);
  for (const g of wheels) {
    spokedWheel(ctx, g.cx, g.cy, g.r, g.n, g.a, dep, g.n >= 10 ? 5 : 4, env, IRON);
  }
}

// C — THE GRINDER. One long toothed drum laid across the whole break, seen
// side-on: rows of hooked teeth come up over its crest toward you and roll
// down the front. It is the only candidate whose motion reads with NO
// rotation to track — the crest of teeth is a moving saw edge, which is what
// the eye sees from the road — and the whole width is one machine rather than
// a row of parts. Drum body banded dark-light-dark for the curve; teeth are
// drawn only where they stand proud of the silhouette at the crest.
function gearsGrinder(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const top = detailD * GEAR_TOPS;
  const toothH = 4.2;
  const R = 9; // drum radius (side-on, so a band 2R tall)
  const crest = top + toothH; // top of the drum body
  const cy = crest + R;
  plate(ctx, w, d, crest + 2, hardFillCutoff('gears', w, d));
  const x0 = 3, x1 = w - 3;
  const drumPath = (c) => { c.beginPath(); c.rect(x0, crest, x1 - x0, R * 2); };
  paperContact(ctx, env, drumPath);
  // Dark steel, one bright band just under the crest for the curve. The
  // teeth are the bright thing; a light drum under light teeth was a tube.
  const bands = [['#2b3139', 0], ['#6f7985', 0.06], ['#9aa4b0', 0.13], ['#56606c', 0.24], ['#3a414c', 0.4], ['#262b33', 0.7]];
  for (let b = 0; b < bands.length; b++) {
    const y0 = crest + bands[b][1] * R * 2;
    const y1 = b + 1 < bands.length ? crest + bands[b + 1][1] * R * 2 : crest + R * 2;
    ctx.fillStyle = bands[b][0];
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // Rows of teeth at angle θ round the drum (0 = crest, positive = toward the
  // viewer and down). Only the front half is drawn. At the crest a tooth is a
  // silhouette standing proud of the drum; on the face it is seen end-on.
  const ROWS = 10;
  const spin = t * 2.2;
  const pitchX = 7;
  const rows = [];
  for (let rI = 0; rI < ROWS; rI++) {
    const th = ((rI / ROWS) * TAU + spin) % TAU;
    const ang = th > Math.PI ? th - TAU : th;
    if (Math.abs(ang) > Math.PI / 2) continue;
    rows.push({ ang, off: (rI % 2) * pitchX * 0.5 });
  }
  rows.sort((a, b) => Math.abs(b.ang) - Math.abs(a.ang));
  for (const { ang, off } of rows) {
    const y = cy - R * Math.cos(ang);
    const sq = Math.cos(ang);
    for (let x = x0 + 2 + off; x < x1 - 1.5; x += pitchX) {
      if (Math.abs(ang) < 0.62) {
        // standing tooth: a hooked point raked toward the viewer's side
        const h = toothH * Math.cos(ang * 2.4);
        if (h <= 0.25) continue;
        const by = crest + 0.6 + (y - (cy - R)) * 0.8;
        // a carbide pick: steel shank, bright hooked tip
        ctx.fillStyle = '#9aa4b0';
        ctx.beginPath();
        ctx.moveTo(x - 2, by); ctx.lineTo(x + 0.7, by - h); ctx.lineTo(x + 2, by - h + 1.2); ctx.lineTo(x + 1.8, by);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4f7fa';
        ctx.beginPath();
        ctx.moveTo(x - 0.6, by - h * 0.55); ctx.lineTo(x + 0.7, by - h); ctx.lineTo(x + 2, by - h + 1.2); ctx.lineTo(x + 0.9, by - h * 0.5);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(x - 2, by); ctx.lineTo(x + 0.7, by - h); ctx.lineTo(x + 2, by - h + 1.2); ctx.lineTo(x + 1.8, by);
        ctx.stroke();
      } else {
        // a tooth on the face, end-on: a bright wedge squashed by the curve,
        // shadowed on the underside of the drum
        const lit = ang < 0;
        ctx.fillStyle = lit ? '#dfe5ec' : '#8a94a1';
        ctx.beginPath();
        ctx.moveTo(x - 1.8, y); ctx.lineTo(x, y - 2.2 * sq); ctx.lineTo(x + 1.8, y); ctx.lineTo(x, y + 0.7 * sq);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 0.45;
  ctx.strokeRect(x0, crest, x1 - x0, R * 2);
  paperFinish(ctx, env, drumPath);
  // bearing blocks at each end, with a turning bolt so the spin has a clock
  for (const ex of [0, w - 3]) {
    ctx.fillStyle = '#39414d'; ctx.fillRect(ex, crest - 0.5, 3, R * 2 + 1);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.strokeRect(ex, crest - 0.5, 3, R * 2 + 1);
    ctx.fillStyle = '#d9a441';
    ctx.beginPath(); ctx.arc(ex + 1.5, cy - R * 0.45, 1.1, 0, TAU); ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(ex + 1.5 + Math.cos(spin) * 0.6, cy - R * 0.45 + Math.sin(spin) * 0.6, 0.3, 0, TAU); ctx.fill();
  }
  // Chips thrown off the crest, up and toward the near side, falling back.
  const nChip = Math.max(2, Math.ceil(w / 22));
  for (let i = 0; i < nChip; i++) {
    const p = (t * 1.5 + hash(i * 3.1)) % 1;
    const x = (i + 0.5) * (w / nChip) + (hash(i) - 0.5) * 8 + p * 3;
    const y = crest - 0.5 - Math.sin(p * Math.PI) * 6;
    ctx.globalAlpha = 1 - p * 0.6;
    ctx.fillStyle = i % 2 ? '#e9dcb6' : '#8e6a3e';
    ctx.fillRect(x, y, 0.9, 0.9);
    ctx.globalAlpha = 1;
  }
}

// D — CHAIN DRIVE. A cutter chain running the length of the break over a line
// of sprockets, its top run carrying hooked teeth at GEAR_TOPS. Horizontal
// travel is the one motion a scrolling screen cannot hide — everything else in
// the lane is going left, and this is going RIGHT — and where each link meets a
// sprocket the steel throws a spark. The sprockets are meshed to the chain's
// own pitch, so the teeth ride in the rollers rather than sliding past them.
function gearsChain(ctx, w, d, t, lift, env) {
  const detailD = liquidSurfaceDepth(d);
  const top = detailD * GEAR_TOPS;
  const cutter = 2.4;
  const runY = top + cutter + 0.8; // centre line of the upper run
  const pitch = 3; // link pitch
  const nTeeth = 10;
  const r = nTeeth * pitch / TAU; // sprocket pitch radius, so the chain meshes
  const cy = runY + r;
  const lowY = cy + r;
  plate(ctx, w, d, runY - 0.5, hardFillCutoff('gears', w, d));
  const v = 14; // chain speed, world px/s, rightward on top
  const shift = (t * v) % pitch;
  const spanN = Math.max(2, Math.round(w / 34));
  const sp = w / spanN;
  // sprockets
  for (let s = 0; s < spanN; s++) {
    const cx = sp * (s + 0.5);
    const a = (t * v) / r; // clockwise: top moves right
    ctx.beginPath(); gearPath(ctx, cx, cy, r, nTeeth, a, 1.4);
    ctx.fillStyle = '#4d5560'; ctx.fill();
    ctx.strokeStyle = '#1b2028'; ctx.lineWidth = 0.35; ctx.stroke();
    ctx.fillStyle = '#d9a441';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.36, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#1b2028'; ctx.stroke();
    ctx.strokeStyle = '#fff1b8'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r * 0.34, cy + Math.sin(a) * r * 0.34); ctx.stroke();
  }
  // the chain: top run and bottom run as rails of links
  const run = (y, dir) => {
    ctx.fillStyle = '#2a3039'; ctx.fillRect(0, y - 1, w, 2);
    ctx.fillStyle = '#9aa6b5'; ctx.fillRect(0, y - 1, w, 0.45);
    ctx.fillStyle = '#c3ccd7';
    const off = dir > 0 ? shift : pitch - shift;
    for (let x = -pitch + off; x < w + pitch; x += pitch) {
      ctx.beginPath(); ctx.arc(x, y, 0.45, 0, TAU); ctx.fill();
    }
  };
  run(lowY, -1);
  run(runY, 1);
  // cutters on the top run, every other link, raked forward (rightward)
  for (let x = -pitch * 2 + shift; x < w + pitch; x += pitch * 2) {
    ctx.fillStyle = '#eef3f8';
    ctx.beginPath();
    ctx.moveTo(x - 1.3, runY - 0.9); ctx.lineTo(x + 0.2, runY - 0.9 - cutter);
    ctx.lineTo(x + 1.3, runY - 0.9 - cutter + 0.5); ctx.lineTo(x + 0.9, runY - 0.9); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.32; ctx.stroke();
  }
  // sparks: where the top run leaves each sprocket crest, a short burst
  for (let s = 0; s < spanN; s++) {
    const cx = sp * (s + 0.5);
    for (let k = 0; k < 3; k++) {
      const p = (t * 2.2 + hash(s * 5 + k) ) % 1;
      const ang = -0.35 - hash(s * 9 + k) * 1.0; // up and right
      const dist = p * 8;
      const sx = cx + r * 0.3 + Math.cos(ang) * dist;
      const sy = runY - 1 + Math.sin(ang) * dist + p * p * 3;
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.95;
      ctx.strokeStyle = p < 0.35 ? '#fff3b0' : '#ff9a1f';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - Math.cos(ang) * 2, sy - Math.sin(ang) * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

// ================================================================ the roster
export const PIT_SPIKES_GEARS_CANDIDATES = [
  { id: 'spikes-now', family: 'spikes', letter: 'A', name: 'SHIPPED — the mix (was: iron teeth)', shipped: 'spikes',
    note: 'The shipped bed, drawn by the real drawPitFill(\'spikes\'): alternating pale and grey triangles at a 9px pitch, a slow ripple and one glint crossing the row.' },
  { id: 'spikes-steel', family: 'spikes', letter: 'B', name: 'STAGGERED STEEL — SHIPS', paint: spikesSteel,
    note: 'Faceted blades — a lit face and a shadow face split on the ridge — in a tall-short-mid-short figure, standing in a bolted rail. The glint is a star that pops on one tall tip at a time, so the light lands exactly where the danger is.' },
  { id: 'spikes-stakes', family: 'spikes', letter: 'C', name: 'RUSTED STAKES — SHIPS (all of SPEED ZONE)', paint: spikesStakes,
    note: 'Hand-planted iron stakes, rust-dark with bright filed points, each leaning its own way, strung together with sagging barbed wire, a skull and a bone at their feet. A trap somebody BUILT, and the bones say "this kills you" faster than any shape can.' },
  { id: 'spikes-piston', family: 'spikes', letter: 'D', name: 'PISTON BED — SHIPS', paint: spikesPiston,
    note: 'The bed in blocks of three on hazard-striped rams; one block slams to full height ON THE BEAT and eases back, the wave walking the row. Never below four fifths, so it is always lethal — the snap is a threat, not a timing window.' },
  { id: 'gears-now', family: 'gears', letter: 'A', name: 'SHIPPED — the mix (was: the works)', shipped: 'gears',
    note: 'The shipped train, drawn by the real drawPitFill(\'gears\'): alternating big/small iron discs with one brass spoke each. The teeth do not actually mesh — each wheel spins at its own rate from its own phase.' },
  { id: 'gears-meshed', family: 'gears', letter: 'B', name: 'MESHED TRAIN — SHIPS', paint: gearsMeshed,
    note: 'Real spur gears: one module across the train, pitch circles touching, every angle derived from its neighbour so teeth fall into gaps and the small wheels spin faster by the true ratio. Spoke windows show the bay through the steel.' },
  { id: 'gears-grinder', family: 'gears', letter: 'C', name: 'THE GRINDER — SHIPS', paint: gearsGrinder,
    note: 'One long toothed drum across the whole break, seen side-on: rows of hooked teeth roll up over the crest toward you, throwing grit. The crest is a moving saw edge you read without tracking any rotation.' },
  { id: 'gears-chain', family: 'gears', letter: 'D', name: 'CHAIN DRIVE', paint: gearsChain,
    note: 'A cutter chain along the top of the break over meshed sprockets, teeth raked forward, running RIGHT while the whole lane runs left, with sparks where it leaves each sprocket. The counter-motion is the read.' },
];
const BY_ID = Object.fromEntries(PIT_SPIKES_GEARS_CANDIDATES.map((c) => [c.id, c]));

/**
 * Paint one candidate into a break, with drawPitFill's contract: x/y0 is the
 * break's top-left on the groundline, d the apron below it, clipped to the
 * break (opened upward by `lift`). The NOW cards call the shipped painter.
 */
export function drawPitSpikesGearsCandidate(ctx, id, x, y0, w, d, t = 0, phase = 0, lift = 0, env = {}) {
  const c = BY_ID[id];
  if (!c) return;
  if (c.shipped) { drawPitFill(ctx, c.shipped, x, y0, w, d, t, phase, lift, env.groundFill || null); return; }
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y0 - lift, w, d + lift); ctx.clip();
  ctx.translate(x, y0);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  c.paint(ctx, w, d, t + phase, lift, env);
  ctx.restore();
}

// ================================================================ the scene
// Where each family is actually seen: a stepping-stone crossing on the stage
// that ships it. Built from the run's own helpers — crossingLayout for the
// stones, buildRoutes to turn them into slabs, the crossing's road rise via
// setGroundRises (restored after, it is module state) — so the tile is the
// picture the run draws, with the hero on the near lip.
export const PIT_SCENES = {
  speed: { cab: 'speed', jumps: 5, speed: 190, stage: 3 },
  surge: { cab: 'surge', jumps: 5, speed: 200, stage: 2 },
  plumber: { cab: 'plumber', jumps: 4, speed: 165, stage: 2 },
  rhythm: { cab: 'rhythm', jumps: 5, speed: 208, stage: 2 },
};

const CROSS_X = 2400;
const HOP_ZOOM = 1.6;       // ZOOM_NORMAL, game/run.js — the dolly's pull-back tier
const CROSSING_ROAD_RISE = 7;   // game/run.js, not exported
const CROSSING_RISE_RAMP = 0.9; // ditto, seconds of lane

function heroPose(t, air = false) {
  return {
    kind: air ? 'jump' : 'run', phase: (t * 1.6) % 1, time: t, vy: air ? -60 : 0, grounded: !air, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

// `hop` frames the crossing mid-jump instead of the approach: the hero in the
// air over the first gap and the camera at the 1.6 pull-back tier the dolly
// opens to (ZOOM_NORMAL in game/run.js), anchored on the groundline as the run
// anchors it — so more of the bay is on screen, which is the most of these
// fills anybody sees without dying in one.
export function drawPitSpikesGearsScene(ctx, t, cab, pack, id, { sceneKey = 'speed', lead = 44, hop = false } = {}) {
  const sc = PIT_SCENES[sceneKey];
  const c = crossingLayout(CROSS_X, sc.jumps, sc.speed);
  const camX = CROSS_X - PLAYER_X - (hop ? -18 : lead);
  const prevRises = groundRises();
  setGroundRises([{ x: c.x, w: c.w, h: CROSSING_ROAD_RISE, ramp: CROSSING_RISE_RAMP * sc.speed }]);
  try {
    const bpm = cab.music?.bpm || 120;
    const scene = cab.id === 'rhythm' ? { stageIndex: sc.stage - 1, beat: t * bpm / 60 } : null;
    if (pack) pack._t = t;
    pack.bg(ctx, t, camX, cab, Infinity, scene);
    ctx.save();
    const z = hop ? HOP_ZOOM : ZOOM;
    const viewW = W / z;
    applyWorld(ctx, z, 0, GROUND_Y);
    const hole = makeObstacle('gap', c.x, {});
    hole.w = c.w;
    // Named, so the pack's own cabinet pass leaves it alone and this draws it
    // the way RunState.draw's own-fill pass does.
    hole.fill = id;
    const obs = [hole];
    pack.ground(ctx, camX, cab, obs, [], t, viewW);
    if (!pack.ownPitFills) {
      drawPitSpikesGearsCandidate(ctx, id, c.x - camX, GROUND_Y, c.w, H - GROUND_Y, t, c.x * 0.013,
        riseHeight(c.x + c.w / 2), { pack, bpm, groundFill: cab.groundDark });
    }
    drawTerrain(ctx, camX, cab, obs, GROUND_Y, viewW, [], pack.ownSurface === true, pack.paperSlab);
    const groundAt = (wx) => terrainGroundY(cab, wx);
    const routes = buildRoutes({ id: cab.id, slabLook: cab.slabLook }, {
      totalDist: 20000, speed: sc.speed, groundYAt: groundAt, crossings: [c],
    }).filter((r) => r.crossing);
    const topAt = (wx, r) => (r.kind === 'island' ? r.topY : groundAt(wx) - routeRise(wx, r));
    drawRoutes(ctx, camX, cab, routes, topAt, viewW, { groundAt, bottomY: H + 40, paperSlab: pack.paperSlab });
    const hx = camX + PLAYER_X;
    drawToon(ctx, 'lorenzo', heroPose(t, hop), PLAYER_X, terrainGroundY(cab, hx) - (hop ? 26 : 0), HERO_DRAW_H);
    ctx.restore();
    if (pack.post) pack.post(ctx, t);
  } finally {
    setGroundRises(prevRises);
  }
}

// A close-up: one short break at `z` times, with the cabinet's own ground
// either side and its sky behind, so material and silhouette can be read.
export function drawPitSpikesGearsCloseUp(ctx, t, cab, id, w, h, { z = 4, pw = 48, pack = null } = {}) {
  const bpm = cab.music?.bpm || 120;
  const sky = cab.sky || ['#202838', '#303848'];
  ctx.fillStyle = sky[1]; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = cab.far || '#404050';
  ctx.beginPath(); ctx.moveTo(0, h * 0.5);
  ctx.quadraticCurveTo(w * 0.3, h * 0.28, w * 0.55, h * 0.48);
  ctx.quadraticCurveTo(w * 0.8, h * 0.3, w, h * 0.44);
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  const d = 38;
  const gy = h / z - d * 0.62; // show the top ~24u of the apron: a hair past rest
  const wx = (w / z - pw) / 2;
  ctx.save();
  ctx.scale(z, z);
  for (const [a, b] of [[-2, wx], [wx + pw, w / z + 2]]) {
    ctx.fillStyle = cab.groundDark || '#282d3b'; ctx.fillRect(a, gy, b - a, d);
    ctx.fillStyle = cab.ground || '#485064'; ctx.fillRect(a, gy, b - a, 1.5);
  }
  drawPitSpikesGearsCandidate(ctx, id, wx, gy, pw, d, t, 0, 0, { pack, bpm, groundFill: cab.groundDark });
  // REST: the camera's reach below the groundline standing still.
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 0.18; ctx.setLineDash([0.8, 0.8]);
  const rest = gy + (H - GROUND_Y) / ZOOM;
  ctx.beginPath(); ctx.moveTo(wx - 4, rest); ctx.lineTo(wx + pw + 4, rest); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export { W as PIT_SG_W, H as PIT_SG_H };
