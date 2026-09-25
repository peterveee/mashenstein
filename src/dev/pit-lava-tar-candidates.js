// Gallery-only LAVA and TAR pit fills — round two of the pit bake-off.
//
// Peter, 24 Sep 2026: "Lava in the pits, tar, and ice in pits." This file is
// the lava and the tar (ice is a sibling sheet). Both materials already ship —
// game/pitFill.js paints `lava` on SPEED ZONE and `tar` on every cabinet that
// names no fill (plumber, crypt, office, surge) — and both are the round-one
// sketches ported more or less as drawn. This round asks for better.
//
// THE RULES ARE pitFill.js's, and every candidate keeps them:
//   - the break is OPEN. The sky and the hills show straight through the top of
//     it; nothing here paints a backdrop across the part above the material.
//   - the surface lies at PIT_FLOOR (0.32 of the 38u apron, 12u down), which is
//     also where a falling hero stops. No candidate floats its surface up.
//   - only the top 19u of the apron are on screen at rest (the REST line), so a
//     standing player sees about seven units of material at most. The read has
//     to come from the LIP (the cut faces either side), SPILL (light thrown onto
//     the road) or a BREACH (something crossing the floor line) — and each card
//     says which in `read`.
//
// WHAT A PORT COSTS, stated per card. The shipped drawPitFill clips every fill
// to the break itself, so lip light and anything thrown above the road cannot
// survive it as it stands. `reach` is how far outside the break a candidate
// paints — `side` world px beyond each lip, `up` world px above the groundline —
// and this sheet clips every candidate to exactly that box, so what is on the
// card is what a port would ship once drawPitFill's clip is opened by as much.
//
// Painters draw into the pitFill.js local box: x 0..w across the break, y 0 at
// the groundline down to y = d. `d` is the whole presentation apron (portrait is
// taller); the surface and its detail are measured off min(d, 38), exactly as
// liquidSurfaceDepth does, and the body runs on to d.
//
// Nothing here is wired to a cabinet or registered anywhere. Port a winner by
// moving its painter into game/pitFill.js; delete this file when settled.
import { drawPitFill, PIT_FLOOR, PIT_APRON_DEPTH } from '../game/pitFill.js';
import { GROUND_Y, ZOOM, VIEW_W, applyWorld } from '../engine/camera.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { makeObstacle } from '../game/entities.js';

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
const fract = (v) => v - Math.floor(v);

function ell(c, x, y, rx, ry, fill, alpha = 1, rot = 0) {
  if (alpha <= 0) return;
  c.save();
  c.globalAlpha *= alpha;
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.05, rx), Math.max(0.05, ry), rot, 0, TAU);
  c.fill();
  c.restore();
}

function shape(c, fill, fn, stroke = null, lw = 0.3) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}

function depthOf(d) { return Math.min(d, PIT_APRON_DEPTH); }

// Fill from a sampled surface y(x) down to d, in one path.
function bodyUnder(c, w, d, yAt, fill, step = 1) {
  c.beginPath();
  c.moveTo(0, d);
  for (let x = 0; x <= w + 0.001; x += step) c.lineTo(x, yAt(Math.min(x, w)));
  c.lineTo(w, yAt(w));
  c.lineTo(w, d);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

// A band that follows the surface: from yAt(x)+a down to yAt(x)+b.
function bandUnder(c, w, yAt, a, b, fill, alpha = 1, step = 1) {
  c.save();
  c.globalAlpha *= alpha;
  c.beginPath();
  c.moveTo(0, yAt(0) + a);
  for (let x = step; x <= w + 0.001; x += step) c.lineTo(x, yAt(x) + a);
  for (let x = w; x >= -0.001; x -= step) c.lineTo(x, yAt(x) + b);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.restore();
}

// ------------------------------------------------------------ light helpers
// Light climbing off the melt, and only a third of the way up the break — the
// round-one finding: a glow without a top is a wash, and a wash reads as more
// sky rather than as a hole.
function glowUp(c, w, surf, span, color, alpha) {
  const top = surf - span;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha *= alpha;
  const g = c.createLinearGradient(0, surf, 0, top);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, top, w, span);
  c.restore();
}

// LIGHT ON THE LIP FACES. The two cut faces of the road are the only surfaces
// the melt can light that a standing player is looking at, and they are in the
// visible band all the way down. A radial pool centred just below the melt on
// each face, painted onto the ground slab outside the break, strongest at the
// face and near the surface, gone a few units into the road.
function lipLight(c, w, d, surf, color, reach, alpha) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha *= alpha;
  for (const [fx, dir] of [[0, -1], [w, 1]]) {
    const g = c.createRadialGradient(fx, surf + 1, 0, fx, surf + 1, reach * 2.6);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color.replace(/[\d.]+\)$/, '0.45)'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    const x0 = dir < 0 ? fx - reach : fx;
    c.fillRect(x0, -1, reach, d + 1);
  }
  c.restore();
}

// Light thrown onto the ROAD at each lip — the round-one SPILL, cut down to
// the two corners. The first pass here was a dome over the whole mouth, and
// it read exactly as round one found: a pale slab lying across the hole. Light
// only lands on things, so it goes where there is something to land on — the
// last few units of road surface either side, and a small halo at each
// corner — and the air over the mouth is left alone.
function roadSpill(c, w, color, reach, alpha) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha *= alpha;
  for (const [fx, dir] of [[0, -1], [w, 1]]) {
    const g = c.createLinearGradient(fx, 0, fx + dir * reach, 0);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(dir < 0 ? fx - reach : fx, -0.2, reach, 1.8);
    const h = c.createRadialGradient(fx, 0.4, 0, fx, 0.4, reach * 0.55);
    h.addColorStop(0, color);
    h.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = h;
    c.beginPath(); c.arc(fx, 0.4, reach * 0.55, Math.PI, TAU); c.fill();
  }
  c.restore();
}

// ======================================================================
// LAVA — shared melt
// ======================================================================
// SPEED ZONE's melt, hotter than the one that ships. The shipped lava is
// #f2621d against an orange sky and tan dunes, which is one family of warm
// mid-values; this one keeps a near-white meniscus and a dark crust so the
// material has the lightest AND the darkest value in the frame between them.
const MELT = {
  white: '#fff4c2',
  yellow: '#ffc93c',
  orange: '#ff7a1f',
  red: '#d8401a',
  deep: '#8a1f10',
  crust: '#3b1a14',
  crustLit: '#7a3020',
};

function meltWave(surf, t, amp = 0.35) {
  return (x) => surf + Math.sin(t * 1.3 + x * 0.21) * amp + Math.sin(t * 0.7 - x * 0.13) * amp * 0.8;
}

// Value steps rather than one gradient: at lane size a gradient collapses into
// one flat band, and it is the STEP between bands that says liquid.
function melt(c, w, d, yAt, { hot = 1 } = {}) {
  bodyUnder(c, w, d, yAt, MELT.orange);
  bandUnder(c, w, yAt, 3.2, 7.5, MELT.red);
  bandUnder(c, w, yAt, 7.5, 60, MELT.deep);
  bandUnder(c, w, yAt, 0, 1.4, MELT.yellow, hot);
  bandUnder(c, w, yAt, -0.25, 0.45, MELT.white, hot);
}

function embersUp(c, w, surf, t, n, top, seed = 0, color = '#ffd466') {
  for (let i = 0; i < n; i++) {
    const p = fract(t * 0.45 + i / n + seed);
    const x = w * (0.1 + fract(i * 0.618 + seed) * 0.8) + Math.sin(p * 5 + i) * 1.4;
    const y = surf - p * (surf - top);
    const r = 0.55 * (1 - p * 0.6);
    ell(c, x, y, r, r, color, (1 - p) * 0.95);
  }
}

// ------------------------------------------------------------ A. NOW lava
function nowLava(c, w, d, t) { drawPitFill(c, 'lava', 0, 0, w, d, t, 0); }

// ------------------------------------------------------------ B. SLAG RAFTS
// A crusted surface: dark basalt plates drifting on the melt, the melt showing
// white-hot in the seams between them, and every plate flexing open along a
// crack that flares and heals. Dark plates on a white seam is the strongest
// value contrast the frame can hold, and it sits in the seven units a standing
// player can see.
function slagRafts(c, w, d, t) {
  const D = depthOf(d);
  const surf = D * PIT_FLOOR;
  const yAt = meltWave(surf, t, 0.22);
  c.save();
  c.beginPath(); c.rect(0, surf - 3, w, d); c.clip();
  melt(c, w, d, yAt);
  // The plates ride a conveyor longer than the break so one is always entering.
  // THIN slabs lying in the melt, seen edge-on: the first pass stood them two
  // and a half units tall and they read as a row of bricks.
  const sc = w / 56;
  const span = w + 26;
  const plates = [13, 9, 16, 11, 14, 10];
  let off = 0;
  const v = 1.7;
  for (let i = 0; i < plates.length; i++) {
    const pw = plates[i] * sc;
    const x = fract((off + t * v) / span) * span - 16;
    off += pw + 2.3;
    const cx = x + pw / 2;
    const tilt = Math.sin(t * 0.9 + i * 1.7) * 0.03;
    // The crack: opens, flares, heals. Its own clock per plate.
    const k = Math.max(0, Math.sin(t * 0.8 + i * 2.3));
    const open = smooth((k - 0.5) / 0.5) * 1.3;
    const cxk = cx + Math.sin(i * 3.1) * pw * 0.2;
    const top = (xx) => yAt(xx) - 0.75 + (xx - cx) * tilt;
    const bot = (xx) => yAt(xx) + 1.05;
    const halves = [[x, cxk - open / 2], [cxk + open / 2, x + pw]];
    for (const [a, b] of halves) {
      if (b - a < 0.5) continue;
      shape(c, MELT.crust, (p) => {
        p.moveTo(a, bot(a) - 0.4);
        p.lineTo(a + 0.5, top(a) + 0.15);
        const n = Math.max(2, Math.round((b - a) / 1.6));
        for (let j = 1; j < n; j++) {
          const xx = a + (b - a) * (j / n);
          p.lineTo(xx, top(xx) - (((i * 7 + j * 3) % 4) * 0.13));
        }
        p.lineTo(b - 0.5, top(b) + 0.15);
        p.lineTo(b, bot(b) - 0.4);
        p.lineTo(b - 0.4, bot(b));
        p.lineTo(a + 0.4, bot(a));
        p.closePath();
      });
      // The top of the crust catches the melt's light: one step up.
      c.strokeStyle = MELT.crustLit; c.lineWidth = 0.35;
      c.beginPath();
      c.moveTo(a + 0.6, top(a) + 0.35); c.lineTo(b - 0.6, top(b) + 0.35);
      c.stroke();
    }
    if (open > 0.02) {
      // The seam flares: white core in a yellow halo, taller than the slab.
      // A slit, not a blob: the first pass drew an oval here and it read as an
      // egg sitting on the crust.
      const y0 = yAt(cxk);
      shape(c, MELT.yellow, (p) => {
        p.moveTo(cxk - open * 0.5 - 0.2, y0 + 1.0); p.lineTo(cxk - open * 0.3, y0 - 0.9);
        p.lineTo(cxk, y0 - 1.3 - open * 0.4); p.lineTo(cxk + open * 0.3, y0 - 0.9);
        p.lineTo(cxk + open * 0.5 + 0.2, y0 + 1.0); p.closePath();
      });
      c.strokeStyle = MELT.white; c.lineWidth = 0.3 + open * 0.3;
      c.beginPath(); c.moveTo(cxk - 0.15, y0 + 0.9); c.lineTo(cxk + 0.2, y0 + 0.1); c.lineTo(cxk - 0.1, y0 - 0.8); c.stroke();
      for (let s2 = 0; s2 < 3; s2++) {
        const q = fract(t * 1.1 + s2 * 0.33 + i * 0.1);
        ell(c, cxk + (s2 - 1) * q * 2.4, yAt(cxk) - 1 - q * 9, 0.4, 0.4, '#ffe08a', (1 - q) * Math.min(1, open));
      }
    }
  }
  c.restore();
  glowUp(c, w, surf, surf * 0.5, 'rgba(255,110,30,1)', 0.24);
  lipLight(c, w, d, surf, 'rgba(255,120,40,0.9)', 4, 0.7);
  roadSpill(c, w, 'rgba(255,170,70,0.9)', 5, 0.45);
}

// ------------------------------------------------------------ C. SPITTER
// The melt bursts. Two bubble sites swell into domes, split, and throw globs of
// rock on real ballistic arcs HIGH enough to clear the lip — the one breach a
// pit can honestly earn, since the material is throwing part of itself into
// the lane. A glob is white-hot while it climbs and cools only once it turns
// over (yellow, orange, red, a black skin), so what shows above the road is
// the hottest thing in the frame. Every arc falls back inside the break.
function spitter(c, w, d, t) {
  const D = depthOf(d);
  const surf = D * PIT_FLOOR;
  const sx = w / 56;
  const yBase = meltWave(surf, t, 0.3);
  const sites = [
    { x: w * 0.36, period: 2.8, off: 0.0, r: 4.4 * sx, n: 5 },
    { x: w * 0.67, period: 3.4, off: 1.6, r: 3.4 * sx, n: 4 },
  ];
  const G = 95;
  const SWELL = 0.4;
  const state = sites.map((s) => {
    const p = fract((t + s.off) / s.period);
    return { ...s, p, grow: p < SWELL ? smooth(p / SWELL) : 0,
      burstT: p >= SWELL ? (p - SWELL) * s.period : -1 };
  });
  // Dome heights feed the surface itself, so the bubble IS the melt bulging.
  const yAt = (x) => {
    let y = yBase(x);
    for (const s of state) {
      if (s.grow <= 0) continue;
      const rr = s.r * (0.55 + s.grow * 0.45);
      const dx = (x - s.x) / rr;
      if (Math.abs(dx) < 1) y -= Math.sqrt(1 - dx * dx) * rr * 0.8 * s.grow;
    }
    return y;
  };
  c.save();
  c.beginPath(); c.rect(0, surf - 8, w, d); c.clip();
  melt(c, w, d, yAt);
  // The dome's skin: darker and cooler than the melt, tearing as it stretches.
  for (const s of state) {
    if (s.grow <= 0.1) continue;
    const rr = s.r * (0.55 + s.grow * 0.45);
    c.save();
    c.beginPath();
    for (let x = s.x - rr; x <= s.x + rr + 0.01; x += 0.4) c.lineTo(x, yAt(x) + 0.05);
    for (let x = s.x + rr; x >= s.x - rr - 0.01; x -= 0.4) c.lineTo(x, Math.min(yAt(x) + 1.4, yBase(x) - 0.1));
    c.closePath();
    c.fillStyle = MELT.red; c.fill();
    c.restore();
    c.strokeStyle = MELT.crust; c.lineWidth = 0.4; c.globalAlpha = s.grow;
    c.beginPath();
    c.moveTo(s.x - rr * 0.55, yAt(s.x - rr * 0.55) + 0.5);
    c.lineTo(s.x - rr * 0.12, yAt(s.x - rr * 0.12) + 0.35);
    c.lineTo(s.x + rr * 0.1, yAt(s.x + rr * 0.1) + 0.9);
    c.lineTo(s.x + rr * 0.5, yAt(s.x + rr * 0.5) + 0.5);
    c.stroke();
    c.globalAlpha = 1;
    // A hot glint on the dome's shoulder: it is wet, and it is about to go.
    ell(c, s.x - rr * 0.4, yAt(s.x - rr * 0.4) + 0.45, rr * 0.2, 0.3, MELT.white, 0.9 * s.grow, -0.4);
  }
  c.restore();
  // The burst: a crater of white, then the globs.
  let flash = 0;
  for (const s of state) {
    if (s.burstT < 0) continue;
    const bt = s.burstT;
    flash = Math.max(flash, 1 - clamp01(bt / 0.45));
    const ringK = clamp01(bt / 0.4);
    if (ringK < 1) {
      ell(c, s.x, surf - 0.2, s.r * (0.5 + ringK * 0.5), 1.4 * (1 - ringK) + 0.3, MELT.white, 1 - ringK);
    }
    for (let g = 0; g < s.n; g++) {
      const vy = -(58 + ((g * 5 + Math.round(s.off * 10)) % 4) * 4) * Math.sqrt(sx);
      const spread = (g / (s.n - 1)) * 2 - 1;
      const vx = spread * 11 * sx;
      const x = s.x + vx * bt;
      const y = surf - 1 + vy * bt + 0.5 * G * bt * bt;
      if (y > surf + 0.5) continue;
      const vyNow = vy + G * bt;
      // Hot while it climbs; cools from the moment it turns over. A red rim
      // round every glob: cream on the speed cabinet's tan dunes is the same
      // value, and the first pass read as steam rather than as rock.
      const fall = clamp01(vyNow / 55);
      const col = vyNow < -12 ? MELT.yellow : fall < 0.3 ? '#ffab2e' : fall < 0.65 ? MELT.orange : MELT.red;
      const r = (g % 2 ? 1.35 : 1.75) * Math.sqrt(sx);
      c.save();
      c.strokeStyle = col; c.globalAlpha = 0.55; c.lineWidth = r * 1.2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - vx * 0.05, y - vyNow * 0.05); c.stroke();
      c.restore();
      ell(c, x, y, r + 0.35, r + 0.35, fall > 0.65 ? MELT.crust : '#b8321a');
      ell(c, x, y, r, r, col);
      if (vyNow < 5) ell(c, x - r * 0.25, y - r * 0.25, r * 0.45, r * 0.45, MELT.white, 0.95);
      if (fall > 0.45) ell(c, x + r * 0.25, y + r * 0.2, r * 0.7, r * 0.6, MELT.crust, (fall - 0.45) * 1.5);
    }
  }
  glowUp(c, w, surf, surf * 0.55, 'rgba(255,120,30,1)', 0.2 + flash * 0.3);
  lipLight(c, w, d, surf, 'rgba(255,130,40,0.9)', 3.5, 0.4 + flash * 0.4);
  roadSpill(c, w, 'rgba(255,170,70,0.9)', 3.5, 0.2 + flash * 0.4);
}

// ------------------------------------------------------------ D. HEAT WELL
// The air over the pit bends. The break and the band just above the mouth are
// re-sampled off the frame in one-unit strips, each slid sideways on its own
// sine, so the dunes seen through the hole and the road's own corners at the
// lip WAVER — the one heat cue that adds no mark of its own, because it is
// the background doing it. Underneath, the melt is at its hottest: a
// convection skin of yellow cells in dark veins.
//
// Reads the frame back, so it must be drawn after the background and ground
// and before the hero (the order the run already uses). A context whose canvas
// cannot be read (none in this game) simply gets no shimmer.
let heatScratch = null;
function shimmer(c, x0, y0, x1, y1, t, amp, rows = 1) {
  const cv = c.canvas;
  if (!cv || typeof c.getTransform !== 'function') return;
  const m = c.getTransform();
  if (Math.abs(m.b) > 1e-6 || Math.abs(m.c) > 1e-6) return;
  const X0 = Math.floor(m.a * x0 + m.e), X1 = Math.ceil(m.a * x1 + m.e);
  const Y0 = Math.floor(m.d * y0 + m.f), Y1 = Math.ceil(m.d * y1 + m.f);
  const ax = Math.max(0, X0), ay = Math.max(0, Y0);
  const bw = Math.min(cv.width, X1) - ax, bh = Math.min(cv.height, Y1) - ay;
  if (bw <= 2 || bh <= 2) return;
  if (!heatScratch) heatScratch = document.createElement('canvas');
  if (heatScratch.width < bw || heatScratch.height < bh) {
    heatScratch.width = Math.max(heatScratch.width, bw);
    heatScratch.height = Math.max(heatScratch.height, bh);
  }
  const s = heatScratch.getContext('2d');
  s.clearRect(0, 0, bw, bh);
  s.drawImage(cv, ax, ay, bw, bh, 0, 0, bw, bh);
  const strip = Math.max(1, Math.round(m.d * rows));
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  for (let sy = 0; sy < bh; sy += strip) {
    const wy = (ay + sy - m.f) / m.d;            // world y of this strip
    const k = clamp01((wy - y0) / (y1 - y0));    // 0 at the top, 1 at the melt
    const a = amp * (0.35 + 0.65 * k) * m.a;
    const dx = Math.sin(t * 7.5 + wy * 1.15) * a + Math.sin(t * 4.1 - wy * 0.6) * a * 0.5;
    c.drawImage(heatScratch, 0, sy, bw, Math.min(strip, bh - sy), ax + dx, ay + sy, bw, Math.min(strip, bh - sy));
  }
  c.restore();
}

function heatWell(c, w, d, t) {
  const D = depthOf(d);
  const surf = D * PIT_FLOOR;
  const yAt = meltWave(surf, t, 0.28);
  // Shimmer first, over what is already in the frame: the break above the
  // melt and a band of air over the mouth, a unit past each lip.
  shimmer(c, -1.5, -13, w + 1.5, surf - 0.5, t, 0.45, 0.5);
  c.save();
  c.beginPath(); c.rect(0, surf - 3, w, d); c.clip();
  melt(c, w, d, yAt, { hot: 1 });
  // Convection cells: yellow rafts of hotter melt drifting under a vein net.
  for (let i = 0; i < 6; i++) {
    const x = fract(i * 0.19 + t * 0.03 * (i % 2 ? 1 : -0.7)) * (w + 8) - 4;
    const y = yAt(x) + 2.1 + (i % 3) * 0.9;
    const k = 0.5 + 0.5 * Math.sin(t * 1.1 + i * 2);
    ell(c, x, y, 3.2 + k * 1.2, 0.8 + k * 0.3, k > 0.55 ? MELT.white : MELT.yellow, 0.85);
  }
  // The skin between the cells: two long dark veins weaving along the melt,
  // drifting slowly, so the surface is a cooling film and not a lamp. (The
  // first pass drew short forked marks and they read as bird tracks.)
  c.strokeStyle = MELT.crust; c.lineWidth = 0.45; c.globalAlpha = 0.8;
  for (let v = 0; v < 2; v++) {
    c.beginPath();
    const drift = t * (v ? -0.6 : 0.45);
    for (let x = -2; x <= w + 2; x += 1.5) {
      const y = yAt(x) + 1.4 + v * 1.9 + Math.sin((x + drift) * 0.45 + v * 2) * 0.7
        + Math.sin((x - drift) * 1.3) * 0.25;
      if (x === -2) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.globalAlpha = 1;
  c.restore();
  // A tall, faint heat column instead of a glow band: it has a top.
  glowUp(c, w, surf, surf * 0.8, 'rgba(255,150,60,1)', 0.22);
  lipLight(c, w, d, surf, 'rgba(255,140,50,0.9)', 3, 0.35);
  embersUp(c, w, surf, t, 3, -6, 0.5, '#fff0a0');
}

// ------------------------------------------------------------ E. SPILLWAY
// The walls are hot. Rock pours out of a seam in the far face just under the
// road and falls into the pool (a thinner dribble off the near face), and the
// cut faces glow red where the melt has cooked them. This puts bright, moving
// material in the part of the break a standing player CAN see — the top 12
// units, which every other liquid leaves to the background — without laying
// anything across the middle of the hole.
function spillway(c, w, d, t) {
  const D = depthOf(d);
  const surf = D * PIT_FLOOR;
  const yAt = meltWave(surf, t, 0.25);
  const sx = w / 56;
  // Cooked rock either side: a red heat in the slab at each face, painted over
  // the road's own ground, strongest low down by the melt.
  c.save();
  for (const [fx, dir] of [[0, -1], [w, 1]]) {
    // An upright ellipse of heat, squashed from a circle so it fades to
    // nothing inside its own box — a plain radial ran out of room and left a
    // hard vertical edge three units into the road.
    c.save();
    c.beginPath(); c.rect(dir < 0 ? fx - 4 : fx, 0.9, 4, d); c.clip();
    c.translate(fx, surf + 1);
    c.scale(1, 3.4);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 4);
    g.addColorStop(0, 'rgba(255,110,30,0.95)');
    g.addColorStop(0.3, 'rgba(214,58,24,0.8)');
    g.addColorStop(0.7, 'rgba(120,30,20,0.3)');
    g.addColorStop(1, 'rgba(60,20,20,0)');
    c.fillStyle = g;
    c.fillRect(-4, -4, 8, 8);
    c.restore();
    // The face itself, one unit of hot edge.
    c.fillStyle = 'rgba(255,170,60,0.9)';
    c.fillRect(dir < 0 ? fx - 0.7 : fx, surf - 5.5, 0.7, 6);
    c.fillStyle = 'rgba(255,120,40,0.5)';
    c.fillRect(dir < 0 ? fx - 0.7 : fx, 2.5, 0.7, surf - 8);
  }
  c.restore();
  c.save();
  c.beginPath(); c.rect(0, 0, w, d); c.clip();
  melt(c, w, d, yAt);
  // A few crust flakes on the pool.
  for (let i = 0; i < 3; i++) {
    const x = fract(i * 0.33 + t * 0.035) * (w + 10) - 5;
    shape(c, MELT.crust, (p) => {
      p.moveTo(x, yAt(x) - 0.4); p.lineTo(x + 4.5 * sx, yAt(x + 4.5 * sx) - 0.6);
      p.lineTo(x + 5 * sx, yAt(x) + 1.1); p.lineTo(x + 0.4, yAt(x) + 1.2); p.closePath();
    });
  }
  // The falls. Each is a ribbon hugging its face from a seam to the pool.
  const falls = [
    { face: w, dir: -1, seam: 3.2, wd: 2.4 * sx, speed: 1 },
    { face: 0, dir: 1, seam: 5.5, wd: 1.2 * sx, speed: 0.8 },
  ];
  for (const f of falls) {
    const bottom = yAt(f.face + f.dir * f.wd) + 0.2;
    const xs = (y, side) => {
      // The stream leaves the seam with a little outward lip, then hugs the wall.
      const out = Math.max(0, 1 - (y - f.seam) / 3) * 0.9;
      const wob = Math.sin(t * 6 + y * 0.9) * 0.18;
      return f.face + f.dir * (side * f.wd + out + wob);
    };
    shape(c, MELT.red, (p) => {
      p.moveTo(xs(f.seam, 0), f.seam - 0.4);
      for (let y = f.seam; y <= bottom; y += 0.8) p.lineTo(xs(y, 1), y);
      p.lineTo(xs(bottom, 1.3), bottom);
      p.lineTo(xs(bottom, 0), bottom);
      p.closePath();
    });
    // Hot core, and bright slugs moving down it: flow, not a stripe.
    c.strokeStyle = MELT.yellow; c.lineWidth = f.wd * 0.45;
    c.beginPath();
    for (let y = f.seam; y <= bottom; y += 0.8) {
      const x = xs(y, 0.5);
      if (y === f.seam) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    // Flow: white streaks running down the core on a moving dash, so the fall
    // is visibly travelling. (The first pass used separate white slugs and it
    // read as a candy-striped pole.)
    c.save();
    c.strokeStyle = MELT.white; c.lineWidth = f.wd * 0.28;
    c.setLineDash([1.4, 2.6]);
    c.lineDashOffset = -t * 14 * f.speed;
    c.beginPath();
    for (let y = f.seam; y <= bottom; y += 0.8) {
      const x = xs(y, 0.42);
      if (y === f.seam) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    c.restore();
    // The seam: a glowing mouth in the face.
    ell(c, f.face + f.dir * 0.3, f.seam - 0.2, 0.8, 0.9, MELT.white);
    // Splash where it lands.
    const sxp = f.face + f.dir * (f.wd * 1.2);
    for (let k = 0; k < 3; k++) {
      const q = fract(t * 2.2 + k / 3 + f.seam);
      const px = sxp + f.dir * q * 3.2 * (k + 1) * 0.5;
      const py = bottom - Math.sin(q * Math.PI) * 2.2;
      ell(c, px, py, 0.42, 0.42, q < 0.5 ? MELT.white : MELT.yellow, 1 - q * 0.6);
    }
    ell(c, sxp, bottom + 0.1, f.wd * 0.9, 0.35, MELT.white, 0.6);
  }
  c.restore();
  glowUp(c, w, surf, surf * 0.5, 'rgba(255,110,30,1)', 0.2);
  roadSpill(c, w, 'rgba(255,160,60,0.9)', 4, 0.4);
}

// ======================================================================
// TAR — shared pitch
// ======================================================================
// PLUMBER PANIC's pits. Tar ships there already (it is the default fill and
// plumber names none), and plumber-3 is the stage that teaches pits — so this
// is the tar most players ever see. A bright blue sky and green hills behind
// the break are the best case a black material can ask for: the pool reads
// as a black shape by value alone, and what the candidates add is GLOSS — the
// sky reflected in the surface, which is what says wet and not hole.
const TAR = {
  body: '#15121c',
  skin: '#221d2b',
  edge: '#08060c',
  sky: '#9ed6f2',       // plumber's own sky, reflected
  spec: '#f4fbff',
};

// Slow, heavy bulges: three humps that rise, hold, and sag back, drifting.
// Broad and tall enough to change the pool's outline — the first pass kept
// them under a unit and the surface read as a ruled line.
function tarSurface(surf, t, w, amp = 1) {
  const sc = w / 56;
  const humps = [0, 1, 2].map((i) => {
    const h = (0.5 + 0.5 * Math.sin(t * 0.55 + i * 2.1)) * 2.8 * amp + 0.25;
    const cx = fract(i * 0.34 + t * 0.012 * (i === 1 ? -1 : 1)) * (w + 16) - 8;
    return { cx, h, s: 6.5 * sc };
  });
  const yAt = (x) => {
    let y = surf + Math.sin(t * 0.8 + x * 0.3) * 0.12;
    for (const hp of humps) {
      const u = (x - hp.cx) / hp.s;
      y -= hp.h * Math.exp(-u * u);
    }
    return y;
  };
  return { yAt, humps };
}

// THE SHEEN rides the bulges. Each hump carries a highlight on its upper-left
// shoulder — the side that faces the sky — as a stroke laid ALONG the surface,
// strongest as the hump peaks, so the light rolls and swells with the tar
// rather than sitting on a fixed spot. (The first pass lit every column by
// its slope and got a continuous ruled line, which read as a steel plate.)
function strokeAlong(c, yAt, x0, x1, off, color, width, alpha) {
  if (alpha <= 0.02 || x1 - x0 < 0.3) return;
  c.save();
  c.globalAlpha *= alpha;
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round';
  c.beginPath();
  for (let x = x0; x <= x1 + 0.001; x += 0.4) {
    if (x === x0) c.moveTo(x, yAt(x) + off); else c.lineTo(x, yAt(x) + off);
  }
  c.stroke();
  c.restore();
}

function tarSheen(c, w, yAt, t, strength = 1, humps = []) {
  for (const hp of humps) {
    const k = clamp01(hp.h / 2.4) * strength;
    if (k <= 0.05) continue;
    const a = Math.max(0.4, hp.cx - hp.s * 1.35), b = Math.min(w - 0.4, hp.cx - hp.s * 0.1);
    strokeAlong(c, yAt, a, b, 0.6, TAR.sky, 0.75, 0.55 * k);
    const a2 = Math.max(0.4, hp.cx - hp.s * 0.95), b2 = Math.min(w - 0.4, hp.cx - hp.s * 0.4);
    strokeAlong(c, yAt, a2, b2, 0.55, TAR.spec, 0.5, 0.95 * k);
  }
  // And a slow glint crossing the flat, so a pool with no bulge up is still wet.
  const gx = fract(t * 0.06) * (w + 20) - 10;
  strokeAlong(c, yAt, Math.max(0.4, gx), Math.min(w - 0.4, gx + 5), 0.6, TAR.sky, 0.35, 0.4 * strength);
}

function tarPool(c, w, d, yAt) {
  bodyUnder(c, w, d, yAt, TAR.body, 0.5);
  // The skin a tone up, so the top of the pool has an edge against a dark bay.
  bandUnder(c, w, yAt, 0, 0.5, TAR.skin);
}

// A bubble that stretches: a dome, then a tall neck, then a pop that leaves two
// flecks, a ring and — briefly — a strand back to the surface.
function tarBubble(c, x, yAt, p, rMax, t) {
  const y0 = yAt(x);
  if (p < 0.78) {
    const g = smooth(p / 0.55);
    const stretch = 1 + smooth((p - 0.5) / 0.28) * 0.5;
    const r = rMax * (0.35 + 0.65 * g);
    const ry = r * stretch;
    const neck = r * (1 - 0.35 * smooth((p - 0.55) / 0.23));
    shape(c, TAR.body, (q) => {
      q.moveTo(x - neck - 0.6, y0 + 0.3);
      q.quadraticCurveTo(x - neck, y0 - ry * 0.35, x - r, y0 - ry * 0.95);
      q.ellipse(x, y0 - ry * 0.95, r, ry * 0.85, 0, Math.PI, TAU);
      q.quadraticCurveTo(x + neck, y0 - ry * 0.35, x + neck + 0.6, y0 + 0.3);
      q.closePath();
    }, TAR.edge, 0.3);
    // Sky in the dome and a spec dot: it is shiny, not a hole in the tar.
    ell(c, x - r * 0.35, y0 - ry * 1.35, r * 0.4, ry * 0.2, TAR.sky, 0.55, -0.5);
    ell(c, x - r * 0.45, y0 - ry * 1.45, r * 0.16, r * 0.16, TAR.spec, 0.95);
  } else {
    const q = (p - 0.78) / 0.22;
    // The ring.
    c.save();
    c.globalAlpha = 0.7 * (1 - q);
    c.strokeStyle = TAR.sky; c.lineWidth = 0.35;
    c.beginPath(); c.ellipse(x, y0 + 0.2, rMax * (0.6 + q * 1.3), 0.5 + q * 0.4, 0, Math.PI, TAU); c.stroke();
    c.restore();
    // Two flecks thrown up, one trailing a strand.
    const hgt = Math.sin(Math.min(1, q * 1.3) * Math.PI) * rMax * 2.2;
    const fx1 = x - q * rMax * 1.3, fx2 = x + q * rMax * 1.0;
    ell(c, fx1, y0 - hgt, 0.45, 0.5, TAR.body);
    ell(c, fx2, y0 - hgt * 0.7, 0.35, 0.4, TAR.body);
    if (q < 0.55) {
      c.strokeStyle = TAR.body; c.lineWidth = 0.22 * (1 - q);
      c.beginPath(); c.moveTo(x, y0); c.quadraticCurveTo(fx1 + 0.4, y0 - hgt * 0.4, fx1, y0 - hgt); c.stroke();
    }
    ell(c, fx1 - 0.12, y0 - hgt - 0.12, 0.15, 0.15, TAR.spec, 0.8);
  }
}

// ------------------------------------------------------------ F. NOW tar
function nowTar(c, w, d, t) { drawPitFill(c, 'tar', 0, 0, w, d, t, 0); }

// ------------------------------------------------------------ G. PITCH MIRROR
// Glossy black, heavy, slow: bulges rise and sag, a reflection of plumber's own
// sky rides the shoulder of every one, and one bubble at a time stretches up on
// a neck and pops with a strand. The whole read is the gloss — black on its own
// is a shadow; black with the sky in it is a liquid.
function pitchMirror(c, w, d, t) {
  const D = depthOf(d);
  const surf = D * PIT_FLOOR;
  const { yAt, humps } = tarSurface(surf, t, w, 1);
  c.save();
  c.beginPath(); c.rect(0, surf - 9, w, d); c.clip();
  tarPool(c, w, d, yAt);
  // An oil film: faint violet, teal and amber streaks drifting in the top of
  // the pool, stretched along the surface. It is what separates pitch from
  // paint at a glance, and it keeps a dark pool legible on a dark cabinet.
  const FILM = ['#7a4fb0', '#2f8f8a', '#b8873a', '#7a4fb0'];
  for (let i = 0; i < 4; i++) {
    const x = fract(i * 0.27 + t * 0.02 * (i % 2 ? 1 : -1)) * (w + 14) - 7;
    const y = yAt(x) + 1.5 + (i % 2) * 0.9;
    const slope = Math.atan((yAt(x + 1) - yAt(x - 1)) / 2);
    ell(c, x, y, 5.5 * (w / 56), 0.45, FILM[i], 0.4, slope);
  }
  tarSheen(c, w, yAt, t, 1, humps);
  const sites = [0.22, 0.58, 0.83];
  const period = 2.6;
  const i = Math.floor(t / period) % sites.length;
  const p = fract(t / period);
  tarBubble(c, w * sites[(i + 3) % 3], yAt, p, 2.3 * (w / 56), t);
  // A second, smaller one out of step, on its own clock.
  const i2 = Math.floor(t / 1.9 + 0.4) % sites.length;
  tarBubble(c, w * sites[(i2 + 1) % 3] + 3, yAt, fract(t / 1.9 + 0.4), 1.2 * (w / 56), t);
  c.restore();
}

// ------------------------------------------------------------ H. STICKY LIP
// Tar has been over the top of this hole and is still coming off it. A lip of
// pitch has set along the road at each edge and curls over into the break,
// the cut faces are coated black below it, and strands hang off the overhang,
// lengthen, neck, let go and plop into the pool. It outlines the break in black
// on both sides — the one LIP a dark material can draw — and the strands move
// in the band a standing player sees.
function drip(c, x, y0, len, r, neck) {
  shape(c, TAR.body, (q) => {
    q.moveTo(x - 0.75, y0);
    q.quadraticCurveTo(x - neck * 1.4, y0 + len * 0.35, x - neck, y0 + len - r * 0.8);
    q.lineTo(x + neck, y0 + len - r * 0.8);
    q.quadraticCurveTo(x + neck * 1.4, y0 + len * 0.35, x + 0.75, y0);
    q.closePath();
  });
  ell(c, x, y0 + len, r * 0.92, r, TAR.body);
  ell(c, x - r * 0.35, y0 + len - r * 0.3, r * 0.2, r * 0.32, TAR.sky, 0.75);
}

function stickyLip(c, w, d, t) {
  const D = depthOf(d);
  const surf = D * PIT_FLOOR;
  const { yAt, humps } = tarSurface(surf, t, w, 0.6);
  const sx = w / 56;
  const COAT = 1.3 * sx;
  // The set lip: a flat bead of pitch on the road, rounded at its outer end,
  // curling over the edge and a unit out over the mouth.
  for (const [fx, dir] of [[0, -1], [w, 1]]) {
    const inX = fx - dir * 1.1;    // the overhang, into the break
    const outX = fx + dir * 4.6;   // the bead's end, on the road
    shape(c, TAR.body, (p) => {
      p.moveTo(outX, 0.2);
      p.quadraticCurveTo(outX + dir * 0.1, -0.35, outX - dir * 1.2, -0.45);
      p.quadraticCurveTo(fx + dir * 1.2, -0.7, fx - dir * 0.2, -0.7);
      p.quadraticCurveTo(inX, -0.65, inX, 0.4);
      p.quadraticCurveTo(inX, 1.4, fx - dir * COAT, 1.8);
      p.lineTo(fx, 1.8);
      p.lineTo(fx, 0.6);
      p.lineTo(outX, 0.6);
      p.closePath();
    });
    strokeAlong(c, () => -0.42, Math.min(outX, fx) + 1.0, Math.max(outX, fx) - 1.0, 0, TAR.sky, 0.25, 0.8);
    ell(c, fx + dir * 1.3, -0.45, 0.35, 0.13, TAR.spec, 0.95);
  }
  c.save();
  c.beginPath(); c.rect(-1, -2, w + 2, d + 2); c.clip();
  // The wall coat below the overhang, ragged on its inner edge, thickening
  // where it meets the pool.
  for (const [fx, dir] of [[0, 1], [w, -1]]) {
    shape(c, TAR.body, (p) => {
      p.moveTo(fx, 0.5);
      for (let y = 0.5; y <= surf + 1; y += 0.5) {
        const th = COAT * (0.85 + 0.15 * Math.sin(y * 0.9 + fx)) + (y > surf - 3 ? (y - surf + 3) * 0.5 : 0);
        p.lineTo(fx + dir * th, y);
      }
      p.lineTo(fx, surf + 2);
      p.closePath();
    });
    c.fillStyle = TAR.sky; c.globalAlpha = 0.4;
    c.fillRect(fx + dir * COAT * 0.35 - (dir < 0 ? 0.28 : 0), 2, 0.28, surf - 5);
    c.globalAlpha = 1;
  }
  tarPool(c, w, d, yAt);
  tarSheen(c, w, yAt, t, 0.9, humps);
  // The strands, off the overhang, clear of the wall. Viscous: they lengthen
  // slowly, neck, and let go all at once, trailing a thread.
  const drips = [
    { fx: 0, dir: 1, off: 2.2, per: 3.4, ph: 0.0 },
    { fx: 0, dir: 1, off: 3.6, per: 4.6, ph: 0.55 },
    { fx: w, dir: -1, off: 2.1, per: 3.9, ph: 0.3 },
    { fx: w, dir: -1, off: 3.4, per: 2.9, ph: 0.8 },
  ];
  for (const dr of drips) {
    const p = fract(t / dr.per + dr.ph);
    const x = dr.fx + dr.dir * dr.off * sx;
    const top = 1.0;
    const room = yAt(x) - top;
    const grow = p < 0.78 ? 1 - Math.pow(1 - p / 0.78, 2.2) : 1;
    const len = 0.8 + grow * room * 0.62;
    const r = 0.5 + grow * 0.45;
    if (p < 0.78) {
      drip(c, x, top, len, r, Math.max(0.14, 0.5 - grow * 0.36));
    } else {
      const q = (p - 0.78) / 0.22;
      // The bulb drops; a thread stretches after it and snaps back up.
      const fallK = Math.min(1, q * 3.2);
      const by = top + len + fallK * (yAt(x) - top - len);
      const stub = 0.9 + (1 - smooth(q * 2.2)) * len * 0.8;
      if (fallK < 1) {
        c.strokeStyle = TAR.body; c.lineWidth = 0.18;
        c.beginPath(); c.moveTo(x, top + stub); c.lineTo(x, by); c.stroke();
        ell(c, x, by, 0.72, 0.9, TAR.body);
      }
      drip(c, x, top, stub, 0.35, 0.2);
      if (fallK >= 1) {
        const k = clamp01((q - 0.31) / 0.69);
        c.save(); c.globalAlpha = 0.75 * (1 - k);
        c.strokeStyle = TAR.sky; c.lineWidth = 0.3;
        c.beginPath(); c.ellipse(x, yAt(x) + 0.1, 0.6 + k * 2.6, 0.3 + k * 0.4, 0, Math.PI, TAU); c.stroke();
        c.restore();
        // The plop's crown: a stub of pitch standing up and settling back.
        ell(c, x, yAt(x) - (1 - k) * 1.1, 0.5 * (1 - k) + 0.15, (1 - k) * 1.2 + 0.1, TAR.body);
      }
    }
  }
  tarBubble(c, w * 0.5, yAt, fract(t / 3.3 + 0.2), 1.8 * sx, t);
  c.restore();
}

// ------------------------------------------------------------ I. LA BREA
// Something already found out. A skull bobs half-sunk, a thigh bone leans out
// of the pitch, and a NO SWIMMING sign on a post has gone in up to its board —
// the joke the arcade is built on, told in the pit. Everything sticks up into
// the band a standing player sees, and bone-white on black is the loudest
// value pair a dark fill can make without throwing any light.
function drawSkull(c, x, y, s, rot) {
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const bone = '#efe6cf', ink = '#2a2230';
  shape(c, bone, (p) => {
    p.moveTo(-2.6, 0.2);
    p.bezierCurveTo(-2.9, -2.6, -1.4, -3.9, 0.2, -3.9);
    p.bezierCurveTo(2.0, -3.9, 3.0, -2.4, 2.7, 0.0);
    p.lineTo(2.2, 0.9); p.lineTo(1.6, 1.9); p.lineTo(-1.4, 1.9); p.lineTo(-2.0, 0.9);
    p.closePath();
  }, ink, 0.32);
  ell(c, -1.05, -0.7, 0.75, 0.85, ink);
  ell(c, 1.15, -0.7, 0.75, 0.85, ink);
  shape(c, ink, (p) => { p.moveTo(0.05, 0.1); p.lineTo(-0.35, 0.9); p.lineTo(0.45, 0.9); p.closePath(); });
  c.strokeStyle = ink; c.lineWidth = 0.22;
  c.beginPath();
  for (const tx of [-0.8, -0.1, 0.6]) { c.moveTo(tx, 1.3); c.lineTo(tx, 1.9); }
  c.stroke();
  // A runnel of tar over the crown, so it has been IN it.
  shape(c, TAR.body, (p) => {
    p.moveTo(-0.6, -3.9); p.quadraticCurveTo(0.6, -4.1, 1.2, -3.7);
    p.quadraticCurveTo(0.7, -3.3, 0.5, -2.5); p.quadraticCurveTo(0.3, -2.0, 0.1, -2.6);
    p.quadraticCurveTo(-0.1, -3.2, -0.6, -3.9); p.closePath();
  });
  ell(c, -1.6, -2.7, 0.45, 0.25, '#ffffff', 0.7, -0.6);
  c.restore();
}

function drawBone(c, x0, y0, x1, y1, r) {
  const bone = '#e8dec4', ink = '#2a2230';
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = ink; c.lineWidth = r * 2 + 0.6;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  c.strokeStyle = bone; c.lineWidth = r * 2;
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
  for (const s of [-1, 1]) {
    ell(c, x1 + Math.cos(a) * r * 0.9 * s, y1 + Math.sin(a) * r * 0.9 * s, r * 1.15, r * 1.15, bone);
    c.strokeStyle = ink; c.lineWidth = 0.28;
    c.beginPath(); c.arc(x1 + Math.cos(a) * r * 0.9 * s, y1 + Math.sin(a) * r * 0.9 * s, r * 1.15, 0, TAU); c.stroke();
  }
  c.restore();
}

function drawNoSwimSign(c, x, y, rot, sx) {
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(sx, sx);
  const ink = '#2a2230';
  // Post.
  c.fillStyle = '#7a5230'; c.fillRect(-0.55, -2, 1.1, 14);
  c.strokeStyle = ink; c.lineWidth = 0.3; c.strokeRect(-0.55, -2, 1.1, 14);
  // Board.
  shape(c, '#f2ead2', (p) => { p.rect(-5.2, -8.6, 10.4, 7.4); }, ink, 0.4);
  // The roundel: red ring, a swimmer, a red bar.
  const cx = 0, cy = -4.9;
  c.strokeStyle = '#d63a2a'; c.lineWidth = 0.9;
  c.beginPath(); c.arc(cx, cy, 2.75, 0, TAU); c.stroke();
  // Waves and a head with a stroking arm.
  c.strokeStyle = '#2a4a7a'; c.lineWidth = 0.45;
  c.beginPath(); c.moveTo(cx - 2.0, cy + 1.0);
  c.quadraticCurveTo(cx - 1.3, cy + 0.4, cx - 0.6, cy + 1.0);
  c.quadraticCurveTo(cx + 0.1, cy + 1.6, cx + 0.8, cy + 1.0);
  c.quadraticCurveTo(cx + 1.4, cy + 0.4, cx + 2.0, cy + 1.0); c.stroke();
  ell(c, cx - 0.7, cy - 0.3, 0.55, 0.55, '#2a4a7a');
  c.beginPath(); c.moveTo(cx - 0.3, cy + 0.3); c.quadraticCurveTo(cx + 0.6, cy - 1.5, cx + 1.3, cy - 0.2); c.stroke();
  c.strokeStyle = '#d63a2a'; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(cx - 1.95, cy - 1.95); c.lineTo(cx + 1.95, cy + 1.95); c.stroke();
  // Tar splashed up the board's lower edge.
  shape(c, TAR.body, (p) => {
    p.moveTo(-5.2, -1.2); p.lineTo(-5.2, -2.3); p.quadraticCurveTo(-4.2, -2.0, -3.6, -2.6);
    p.quadraticCurveTo(-3.3, -1.9, -2.2, -2.1); p.lineTo(-1.8, -1.2); p.closePath();
  });
  c.restore();
}

function laBrea(c, w, d, t) {
  const D = depthOf(d);
  const surf = D * PIT_FLOOR;
  const { yAt, humps } = tarSurface(surf, t, w, 0.45);
  const sx = w / 56;
  c.save();
  c.beginPath(); c.rect(0, -1, w, d + 1); c.clip();
  // Things in the tar are drawn first, then the pool over their lower halves.
  // The sign, sunk to its board, a little off true.
  drawNoSwimSign(c, w * 0.26, surf + 1.7 + Math.sin(t * 0.4) * 0.15, -0.14 + Math.sin(t * 0.35) * 0.02, sx * 0.95);
  // The thigh bone, leaning out.
  drawBone(c, w * 0.5, surf + 3, w * 0.5 + 2.6 * sx, surf - 6.2 * sx, 0.62 * sx);
  // The skull, bobbing and turning very slightly.
  const bob = Math.sin(t * 0.7) * 0.45;
  drawSkull(c, w * 0.74, surf - 1.2 + bob, sx * 1.3, -0.12 + Math.sin(t * 0.5) * 0.08);
  tarPool(c, w, d, yAt);
  tarSheen(c, w, yAt, t, 0.8, humps);
  // Pitch clinging where each thing meets the surface.
  for (const x of [w * 0.26, w * 0.5 + 0.4, w * 0.74]) {
    ell(c, x, yAt(x) - 0.15, 2.2 * sx, 0.55, TAR.body);
    ell(c, x - 0.9, yAt(x) - 0.35, 0.6, 0.14, TAR.sky, 0.6);
  }
  // A bubble breaks by the skull now and then.
  tarBubble(c, w * 0.9, yAt, fract(t / 2.3), 1.3 * sx, t);
  tarBubble(c, w * 0.1, yAt, fract(t / 3.4 + 0.5), 1.0 * sx, t);
  c.restore();
}

// ======================================================================

const DRAW = {
  nowLava, slagRafts, spitter, heatWell, spillway,
  nowTar, pitchMirror, stickyLip, laBrea,
};

// `reach`: world px each candidate paints outside the break — `side` past each
// lip, `up` above the groundline. The sheet clips to exactly that.
export const PIT_LAVA_TAR_CANDIDATES = [
  { id: 'nowLava', letter: 'A', name: 'NOW — molten channel (ships on SPEED ZONE)', material: 'lava', cabinet: 'speed',
    read: 'glow up the break; nothing past the lip', reach: { side: 0, up: 0 }, cost: 'ships',
    note: 'The shipped lava, drawn by the real drawPitFill: one orange, cream ellipses, three crust plates sliding across. In the seven units a standing player sees it is a warm band against warm dunes.' },
  { id: 'slagRafts', letter: 'B', name: 'SLAG RAFTS', material: 'lava', cabinet: 'speed',
    read: 'LIP — the cut faces lit orange; dark plates on white-hot seams', reach: { side: 4, up: 6 }, cost: '6 plates, 2 gradients',
    note: 'A crusted surface: basalt plates drift on the melt, white-hot seams between them, and each plate cracks open, flares and heals. Darkest and lightest values in the frame side by side in the visible band, with the melt lighting both cut faces.' },
  { id: 'spitter', letter: 'C', name: 'SPITTER', material: 'lava', cabinet: 'speed',
    read: 'BREACH — globs thrown on arcs above the road, cooling as they fall', reach: { side: 3.5, up: 15 }, cost: '2 bubbles, 9 globs',
    note: 'Bubbles swell into domes and burst, throwing globs of rock high enough to be seen over the lip before the hole is. The globs cool white to red to black and fall back in; each burst flashes the cut faces.' },
  { id: 'heatWell', letter: 'D', name: 'HEAT WELL', material: 'lava', cabinet: 'speed',
    read: 'BREACH — the air over the mouth shimmers; the dunes and the lip corners waver', reach: { side: 3, up: 13 }, cost: 'reads the frame back: 1 copy + ~60 strip blits per pit',
    note: 'Heat shimmer done as real refraction: the frame behind the break and above the mouth is re-sampled in wavering strips, so the background itself bends. Underneath, the melt is a convection skin of yellow cells in dark veins.' },
  { id: 'spillway', letter: 'E', name: 'SPILLWAY', material: 'lava', cabinet: 'speed',
    read: 'LIP — rock pours out of the far face; both faces glow red', reach: { side: 4, up: 5 }, cost: '2 falls, 2 gradients',
    note: 'Molten rock pours out of a seam just under the road and falls into the pool, and the cut faces are cooked red. It puts bright, moving material in the top of the break, where a standing player is looking, without crossing the middle of the hole.' },
  { id: 'nowTar', letter: 'F', name: 'NOW — boiling tar (ships by default; drawn on PLUMBER PANIC)', material: 'tar', cabinet: 'plumber',
    read: 'a black band; no light, nothing past the lip', reach: { side: 0, up: 0 }, cost: 'ships',
    note: 'The shipped tar, drawn by the real drawPitFill, on plumber, where it already ships as the default and where plumber-3 teaches pits. Two flat purple ellipses of sheen and four round bubbles.' },
  { id: 'pitchMirror', letter: 'G', name: 'PITCH MIRROR', material: 'tar', cabinet: 'plumber',
    read: 'the sky caught in black — a highlight rolling on every bulge; nothing past the lip', reach: { side: 0, up: 0 }, cost: '3 humps, 7 sheen strokes, 2 bubbles — fits the shipped clip',
    note: 'Glossy and heavy: slow bulges rise and sag and change the outline of the pool, the sky rides the shoulder of each one as a rolling highlight, an oil film drifts in the top of it, and bubbles stretch up on a neck and pop with a strand. Black with the sky in it reads as wet; black alone reads as shadow.' },
  { id: 'stickyLip', letter: 'H', name: 'STICKY LIP', material: 'tar', cabinet: 'plumber',
    read: 'LIP — the break outlined in pitch; strands growing off both edges', reach: { side: 5, up: 1 }, cost: '4 strands, 2 wall coats, 2 beads',
    note: 'Tar has come over the top and is still coming off it: a bead of pitch set on the road at each edge, the cut faces coated black, and strands that lengthen, neck and plop into the pool. It outlines the hole in black from the road down.' },
  { id: 'laBrea', letter: 'I', name: 'LA BREA', material: 'tar', cabinet: 'plumber',
    read: 'bone-white things sticking up out of the pitch, into the visible band', reach: { side: 0, up: 1 }, cost: 'sign + skull + bone, 2 bubbles',
    note: 'Something already found out: a skull bobs half-sunk, a thigh bone leans out, and a NO SWIMMING sign has gone in up to its board. Bone-white on black is the loudest pair a dark fill can make without light, and the joke is the arcade\'s.' },
];

const BY_ID = Object.fromEntries(PIT_LAVA_TAR_CANDIDATES.map((c) => [c.id, c]));

/**
 * One candidate into the pitFill.js local box (x 0..w at the groundline, down to
 * d), clipped to the break plus the candidate's declared `reach` — so what shows
 * is what a port would ship once drawPitFill's clip is opened by as much.
 */
export function drawPitLavaTarCandidate(ctx, id, w, d, t = 0) {
  const draw = DRAW[id];
  const cand = BY_ID[id];
  if (!draw || !cand) return;
  const { side, up } = cand.reach;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-side, -up, w + side * 2, d + up);
  ctx.clip();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, w, d, t);
  ctx.restore();
}

// ------------------------------------------------------------------ scenes
// Where the break sits: a runner's-length ahead of the hero, the standard 56u.
export const PIT_LAVA_TAR_GAP_W = 56;
const GAP_AHEAD = 64;

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

/** Screen x of the break's left lip in the 480x270 frame. */
export function pitLavaTarGapScreenX() { return (PLAYER_X + GAP_AHEAD) * ZOOM; }

/**
 * The real cabinet scene at game scale (480x270, the ZOOM camera): the pack's
 * backdrop, its ground carved by a real `gap` obstacle (the cabinet's own fill
 * switched off), the candidate in the break, Lorenzo running up to it, and the
 * pack's post pass. `extraApron` extends the frame downward for a deep study.
 */
export function drawPitLavaTarScene(ctx, t, cab, pack, id, { hero = true } = {}) {
  const camX = t * 60;
  const bare = { ...cab, pitFill: 'none' };
  pack.bg(ctx, t, camX, bare, Infinity, null);
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  const gapX = camX + PLAYER_X + GAP_AHEAD;
  const ob = makeObstacle('gap', gapX);
  ob.w = PIT_LAVA_TAR_GAP_W;
  pack.ground(ctx, camX, bare, [ob], [], t, VIEW_W);
  ctx.save();
  ctx.translate(gapX - camX, GROUND_Y);
  drawPitLavaTarCandidate(ctx, id, ob.w, PIT_APRON_DEPTH, t);
  ctx.restore();
  if (hero) drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
}

/**
 * A magnified window onto that same scene. `(sx, sy)` is the top-left of the
 * window in frame pixels, `k` the magnification, `w`/`h` the tile size. Below
 * the frame's bottom edge (y 270) the backdrop does not exist, so it is filled
 * with the cabinet's near-hill colour; the dashed line is the REST line — the
 * bottom of what a standing player sees.
 */
export function drawPitLavaTarWindow(ctx, t, cab, pack, id, w, h, sx, sy, k, { rest = true } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.fillStyle = cab.hills || '#444';
  ctx.fillRect(0, 0, w, h);
  ctx.scale(k, k);
  ctx.translate(-sx, -sy);
  drawPitLavaTarScene(ctx, t, cab, pack, id);
  if (rest) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1 / k;
    ctx.setLineDash([3 / k, 3 / k]);
    ctx.beginPath(); ctx.moveTo(sx, 270); ctx.lineTo(sx + w / k, 270); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${9 / k}px ui-monospace, monospace`;
    ctx.fillText('REST', sx + 3 / k, 270 - 3 / k);
  }
  ctx.restore();
}
