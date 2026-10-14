// SPACE CABINET — look bake-off (lab only). Asked 12 Oct 2026: the GRAVITY GRID
// playtest becomes the act-3 space cabinet in Cardboard Kingdom's slot, and it
// needs a look no other cabinet has. Peter's three picks:
//
//   A  POLYGON     — flat-shaded early-90s 3D (Star Fox, Elite, Another World)
//   B  AIRBRUSH    — 70s–80s paperback / NASA concept painting, chrome and glow
//   C  SCREENPRINT — mission-patch poster: three inks on paper, halftone shading
//
// Every look paints the SAME corridor as src/dev/gravity/scene.js — the same
// window slots, rails, gate masts, arrow line and chevrons — so only the paint
// is being judged, never the level. drawGravityRoom stays untouched as the
// control. `?goto=gravity&spacelook=polygon|airbrush|screenprint` plays one.
import { GRAVITY_LEVEL as L, GATES, HAZARDS } from './gravity/model.js';
import { drawGravityRoom } from './gravity/scene.js';
import { lifePass, ALL_LIFE, DIRECTED_LIFE, titleStarfield, traceAt } from './space-life.js';
import { PLATEAU_VARIANTS, invasionSky } from './space-plateaus.js';
import { PLANET_CANDIDATES } from './space-planet-candidates.js';
import { GROUND_Y, applyWorld, screenYFor } from '../engine/camera.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

const TAU = Math.PI * 2;
const CEIL = -L.corridor;            // ceiling running surface
const RAIL = 12;                     // rail depth, both surfaces
const VISTA_GROUND = -6;
// The tall-glass room's rails are a slimmer pipe (Peter, 14 Oct: "its a thick
// pipe... can it be thinner"): half the depth, same chrome, more window.
// Thinner again, with a strip of wall between the pipe and the window frame
// ("i want to see a small gap between the bottom of the window frame and the
// floor").
export const railDepth = (look) => (look?.tallGlass ? 4 : RAIL);
const GLASS_GAP = 3;             // where the plateaus' and buttes' feet stand outside
const PANE = { step: 102, off: 4, w: 94, top: -127, h: 117 };
// The airbrushed room's taller glass (Peter, 13 Oct: "make windows lower and
// higher to see more scenery"): top near the ceiling rail, bottom down at the
// hero's waist. B and everything built on it (D–M).
const PANE_B = { top: -134, h: 128 };
// Frame weight (13 Oct bake-off: "thinner frames … more visibility"): `frameK`
// on a look scales the chrome rim, the wall between windows and the margins
// above and below the glass. 1 is the shipped weight.
const frameOf = (look) => look?.frameK ?? 1;
// Tall glass (Peter, 13 Oct: "why can't we have taller windows"): the panes run
// the frame's whole height, the rails crossing them as beams; `curRoom` is the
// room being drawn, whose extents the panes take.
let curRoom = null;
const paneB = (look) => {
  if (look?.tallGlass && curRoom?.glassTop != null) return { top: curRoom.glassTop, h: curRoom.glassBottom - curRoom.glassTop };
  const k = frameOf(look); return { top: -137 + 3 * k, h: 137 - 3 * k - 6 * k };
};
const SECTORS = [1420, 2980];
const hash = n => ((Math.sin(n * 78.233 + 12.9) * 43758.5453) % 1 + 1) % 1;
const clamp01 = v => Math.max(0, Math.min(1, v));
const wrap = (v, m) => ((v % m) + m) % m;
function poly(c, pts, fill) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function rect(c, x, y, w, h, fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
function line(c, x, y, xx, yy, ink, width = 1) {
  c.strokeStyle = ink; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke();
}
function text(c, s, x, y, size, ink, font = 'monospace', weight = 'bold') {
  c.fillStyle = ink; c.font = `${weight} ${size}px ${font}`; c.fillText(s, x, y);
}
// Chevron as a filled six-point arrowhead: dir 1 points down, -1 up.
function chevron(x, y, dir, w = 5, h = 5, t = 1.8) {
  const wing = y - dir * h * 0.6, tip = y + dir * h * 0.4, back = dir * t;
  return [[x - w, wing], [x, tip], [x + w, wing], [x + w, wing - back], [x, tip - back], [x - w, wing - back]];
}
// Strength of a chevron at height y on the gate (1 on the side it sends you to).
function chevronStrength(g, y) {
  const height = clamp01((-y - 4) / 129);
  return g.lane ? height : 1 - height;
}
function chevronYs(g, t) {
  const dir = g.lane ? -1 : 1, out = [];
  for (let i = 0; i < 8; i++) out.push(-8 - wrap(i * 16 + t * dir * -23, 126));
  return out;
}

// The mountains outside, as first painted and picked (12 Oct 2026): A's
// two-face polygon ridges, B's soft dunes, C's printed hills. D onwards use
// A's ridges in the room's scheme. Keyed by scheme name.
const RIDGE_SCHEMES = {
  DUSK: { ridges: [['#5e2f5c', '#2c1638'], ['#8c4560', '#3e1d44'], ['#c96e5e', '#5a2a48']],
    dunes: [['#7b3a5e', '#2c1638'], ['#9a4a5c', '#3a1b3e'], ['#c06a62', '#4a2440']], rim: 'rgba(255,190,150,0.28)' },
  'AMBER & TEAL': { ridges: [['#2c5a58', '#0e2a2e'], ['#7a6a44', '#1f3a38'], ['#d0904a', '#4a3a28']], rim: 'rgba(255,210,140,0.28)' },
  'COLD DAWN': { ridges: [['#3a4e78', '#141c36'], ['#6a86ae', '#22304e'], ['#b6cce0', '#3a4c6e']], rim: 'rgba(255,225,210,0.3)' },
  JADE: { ridges: [['#2a5a48', '#0c2620'], ['#5e8a5c', '#1a3a2c'], ['#b8c27a', '#3a4a2c']], rim: 'rgba(240,250,180,0.28)' },
};
for (const r of Object.values(RIDGE_SCHEMES)) r.dunes ||= r.ridges;
function polyRidge(c, s, f, base, amp, sp, lit, dark, seed) {
  const shift = s.cam * f;
  const k0 = Math.floor((shift - 60) / sp), k1 = Math.ceil((shift + s.view + 60) / sp);
  const valley = k => [k * sp - shift, base - amp * 0.18 * hash(k * 7 + seed)];
  rect(c, -60, base - 1, s.view + 120, 8 - base, dark);
  for (let k = k0; k <= k1; k++) {
    const v0 = valley(k), v1 = valley(k + 1);
    const px = k * sp - shift + sp * (0.4 + hash(k * 13 + seed) * 0.25);
    const top = [px, base - amp * (0.45 + 0.55 * hash(k * 31 + seed))];
    poly(c, [v0, top, [px, base + 2]], lit);
    poly(c, [top, v1, [px, base + 2]], dark);
  }
}
function schemeRidges(c, s, look) {
  const r = (RIDGE_SCHEMES[look.pal?.name] ?? RIDGE_SCHEMES.DUSK).ridges;
  // Exactly the bake-off's rows (Peter, 13 Oct: match the bake-off).
  polyRidge(c, s, 0.03, -26, 30, 34, r[0][0], r[0][1], 1);
  polyRidge(c, s, 0.065, -16, 22, 26, r[1][0], r[1][1], 2);
  polyRidge(c, s, 0.12, -6, 16, 19, r[2][0], r[2][1], 3);
  // Everything on the ground stands in front of all three rows, on the
  // ground line at the foot of the glass, so no peak cuts through it.
  lifePass(c, s, look, 'ground');
  lifePass(c, s, look, 'front');
}

// ======================================================================
// A — POLYGON. Flat facets from a short ramp, lit from the upper left. No
// gradients, no alpha: shading is which facet you are, never a blend.
// ======================================================================
const A = {
  hull: ['#141a2c', '#1d263f', '#283556', '#374a75', '#4d669b', '#7290c4'],
  space: '#04050c',
  orange: ['#7a2c0c', '#c4561a', '#ff8a2a', '#ffc070'],
  green: ['#164a2a', '#2a8a46', '#4fd46e', '#a8ffb0'],
  cyan: '#7fe8ff',
};
const LIGHT2 = (() => { const l = Math.hypot(-0.62, -0.55); return [-0.62 / l, -0.55 / l]; })();
// A facet's ramp index from its outward 2D normal.
function facet(nx, ny, base, ramp) {
  const d = nx * LIGHT2[0] + ny * LIGHT2[1];
  return ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(base + d * 2)))];
}
// A box with four bevel facets around a flat face.
function bevelBox(c, x, y, w, h, b, base, ramp = A.hull) {
  poly(c, [[x, y], [x + w, y], [x + w - b, y + b], [x + b, y + b]], facet(0, -1, base, ramp));
  poly(c, [[x + w, y], [x + w, y + h], [x + w - b, y + h - b], [x + w - b, y + b]], facet(1, 0, base, ramp));
  poly(c, [[x + w, y + h], [x, y + h], [x + b, y + h - b], [x + w - b, y + h - b]], facet(0, 1, base, ramp));
  poly(c, [[x, y + h], [x, y], [x + b, y + b], [x + b, y + h - b]], facet(-1, 0, base, ramp));
  rect(c, x + b, y + b, w - 2 * b, h - 2 * b, ramp[base]);
}
function octagon(x, y, w, h, k) {
  return [[x + k, y], [x + w - k, y], [x + w, y + k], [x + w, y + h - k],
    [x + w - k, y + h], [x + k, y + h], [x, y + h - k], [x, y + k]];
}
// Low-poly globe: a lat/long mesh, back faces culled, each quad one flat
// shade from its centre normal. Alternate latitude bands pick a second ramp
// so the gas giant has stripes without a single gradient.
const PLANET_RAMPS = [['#2a1d24', '#5a3a34', '#93623f', '#c99a5c', '#f0d08e'],
  ['#231a26', '#4a3040', '#7d4a4c', '#b07560', '#dcae84']];
const RING_RAMP = ['#3b3a40', '#6a6870', '#a19d98', '#d7d0bf'];
const L3 = (() => { const v = [-0.55, -0.5, 0.67], l = Math.hypot(...v); return v.map(x => x / l); })();
function polyPlanet(c, cx, cy, R, spin, nLat = 7, nLon = 14,
  { ramps = PLANET_RAMPS, rings = true, ringRamp = RING_RAMP, tilt = 0.38, roll = -0.3, craters = 0, seed = 0 } = {}) {
  const ct = Math.cos(tilt), st = Math.sin(tilt), cr = Math.cos(roll), sr = Math.sin(roll);
  const tf = ([x, y, z]) => { const y1 = y * ct - z * st, z1 = y * st + z * ct; return [x * cr - y1 * sr, x * sr + y1 * cr, z1]; };
  const sph = (lat, lon) => tf([Math.cos(lat) * Math.sin(lon + spin), Math.sin(lat), Math.cos(lat) * Math.cos(lon + spin)]);
  const shade = (n, ramp) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor((n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2] + 0.25) / 1.25 * ramp.length)))];
  const nRing = Math.max(28, nLon * 2);
  const ring = (front) => {
    for (const [r0, r1, off] of [[1.4, 1.62, 0], [1.68, 1.95, 1]]) {
      for (let k = 0; k < nRing; k++) {
        const a0 = k / nRing * TAU, a1 = (k + 1) / nRing * TAU, am = (a0 + a1) / 2;
        const mid = tf([Math.cos(am), 0, Math.sin(am)]);
        if ((mid[2] > 0) !== front) continue;
        const p = [[r0, a0], [r1, a0], [r1, a1], [r0, a1]].map(([r, a]) => tf([Math.cos(a) * r, 0, Math.sin(a) * r]));
        poly(c, p.map(q => [cx + q[0] * R, cy + q[1] * R]), ringRamp[(k + off) % 2 + (front ? 2 : 0)]);
      }
    }
  };
  if (rings) ring(false);
  for (let i = 0; i < nLat; i++) {
    const la0 = -Math.PI / 2 + i * Math.PI / nLat, la1 = la0 + Math.PI / nLat;
    for (let j = 0; j < nLon; j++) {
      const lo0 = j * TAU / nLon, lo1 = lo0 + TAU / nLon;
      const n = sph((la0 + la1) / 2, (lo0 + lo1) / 2);
      if (n[2] <= 0.01) continue;
      const pts = [sph(la0, lo0), sph(la0, lo1), sph(la1, lo1), sph(la1, lo0)].map(q => [cx + q[0] * R, cy + q[1] * R]);
      // Craters: a few facets a step darker, fixed to the surface as it turns.
      const ramp = ramps[i % ramps.length];
      let ink = shade(n, ramp);
      if (craters && hash(seed + i * 31 + j * 7) < craters) ink = ramp[Math.max(0, ramp.indexOf(ink) - 1)];
      poly(c, pts, ink);
    }
  }
  if (rings) ring(true);
}
// One tumbling rock: a fan of triangles around an off-centre apex, each lit
// by its edge direction — the classic "it's 3D, honest" asteroid.
function polyRock(c, x, y, size, spin, seed) {
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) {
    const a = spin + i * TAU / n, r = size * (0.7 + hash(seed + i) * 0.4);
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  const apex = [x - size * 0.25, y - size * 0.25];
  const ramp = ['#2c2d38', '#4b4d5c', '#727585', '#a6a9b4'];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2 - x, my = (p[1] + q[1]) / 2 - y, l = Math.hypot(mx, my) || 1;
    poly(c, [apex, p, q], facet(mx / l, my / l, 1.5, ramp));
  }
}
const polygon = {
  id: 'polygon', letter: 'A', name: 'FLAT-SHADED POLYGON',
  note: 'Star Fox / Elite / Another World. Every surface is a facet from a six-step ramp, lit from the upper left; '
    + 'no gradients, no glow. Octagonal ports, a low-poly ringed giant, angular outside mountains, asteroids and solid arrowheads.',
  bg: A.hull[0], lightBg: false, label: A.green[3], hint: A.green[2],
  hull(c, s) {
    rect(c, 0, s.top, s.view, s.bottom - s.top, A.hull[1]);
    // Roof truss: a sawtooth of lit and shaded triangles.
    for (let i = Math.floor(s.cam / 48) - 1; i * 48 < s.cam + s.view + 48; i++) {
      const x = i * 48 - s.cam, mid = Math.max(s.top, -190);
      poly(c, [[x, -149], [x + 24, mid], [x + 48, -149]], A.hull[2]);
      poly(c, [[x + 24, mid], [x + 48, -149], [x + 72, mid]], A.hull[1]);
      poly(c, [[x + 22, -149], [x + 24, mid], [x + 26, -149]], A.hull[4]);
    }
    // Deck below the floor: chunky bevelled plates.
    for (let i = Math.floor(s.cam / 48) - 1; i * 48 < s.cam + s.view + 48; i++) {
      const x = i * 48 - s.cam;
      for (let y = 16, row = 0; y < s.bottom; y += 22, row++) {
        bevelBox(c, x + 2, y, 44, 18, 3, Math.max(1, 2 - row));
        rect(c, x + 38, y + 12, 3, 2, A.green[row % 2 ? 1 : 2]);
      }
    }
    // Wall behind the ports and the prism pilasters between them.
    bevelBox(c, -10, CEIL, s.view + 20, -CEIL, 4, 2);
    for (let k = Math.floor(s.cam / PANE.step); k * PANE.step < s.cam + s.view + PANE.step; k++) {
      const x = k * PANE.step - s.cam;
      rect(c, x - 5, CEIL + 4, 3, -CEIL - 8, A.hull[4]);
      rect(c, x - 2, CEIL + 4, 4, -CEIL - 8, A.hull[3]);
      rect(c, x + 2, CEIL + 4, 3, -CEIL - 8, A.hull[1]);
    }
  },
  paneClip(c, x) {
    const p = octagon(x + 3, PANE.top + 3, PANE.w - 6, PANE.h - 6, 10);
    c.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) c.lineTo(q[0], q[1]); c.closePath();
  },
  vista(c, s) {
    rect(c, 0, CEIL, s.view, -CEIL, A.space);
    rect(c, 0, -46, s.view, 46, '#0a0b1e');
    rect(c, 0, -30, s.view, 30, '#141537');
    for (let i = 0; i < 70; i++) {
      const x = wrap(hash(i) * 560 - s.cam * 0.015, 560), y = -133 + hash(i + 300) * 92;
      rect(c, Math.round(x), Math.round(y), 1, 1, hash(i + 90) > 0.6 ? '#ffffff' : '#7d88b8');
    }
    const w = Math.max(60, s.view - 60);
    polyPlanet(c, w * (0.82 - 0.5 * s.progress), -98 + s.progress * 3, 15, s.t * 0.12);
    // A rock fly-by every 8.5 s, deterministic through pause and rewind.
    const ev = Math.floor(s.t / 8.5), age = s.t - ev * 8.5 - (1.1 + hash(ev + 601) * 2);
    if (age >= 0 && age < 1.4) {
      const u = age / 1.4, x = w + 28 - u * (w + 56), y = -106 + hash(ev + 631) * 40 + u * 23;
      poly(c, [[x + 2, y - 1.5], [x + 22, y - 7], [x + 2, y + 1.5]], '#1e2240');
      polyRock(c, x, y, 2.4 + hash(ev + 647) * 1.6, age * 3.6, ev * 9);
    }
    polyRidge(c, s, 0.03, -26, 30, 34, '#2d3150', '#1f2240', 1);
    polyRidge(c, s, 0.065, -16, 22, 26, '#4a4a6e', '#2d2d4e', 2);
  },
  pane(c, x) {
    const out = octagon(x, PANE.top, PANE.w, PANE.h, 12), inn = octagon(x + 3, PANE.top + 3, PANE.w - 6, PANE.h - 6, 10);
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8, mx = (out[i][0] + out[j][0]) / 2 - (x + PANE.w / 2), my = (out[i][1] + out[j][1]) / 2 - (PANE.top + PANE.h / 2);
      const l = Math.hypot(mx / PANE.w, my / PANE.h) || 1;
      // Inner bevel: faces point inward, so they light opposite to their side.
      poly(c, [out[i], out[j], inn[j], inn[i]], facet(-mx / PANE.w / l, -my / PANE.h / l, 3, A.hull));
    }
    // One hard glint facet per port.
    poly(c, [[x + 22, PANE.top + 3], [x + 30, PANE.top + 3], [x + 6, PANE.top + 40], [x + 3, PANE.top + 32]], '#ffffff12');
  },
  rails(c, s) {
    for (const [y0, edge] of [[-149, CEIL], [0, 0]]) {
      for (let i = Math.floor(s.cam / 18) - 1; i * 18 < s.cam + s.view + 18; i++) {
        const x = i * 18 - s.cam;
        bevelBox(c, x, y0, 18, RAIL, 2, 3);
        if (i % 4 === 0) poly(c, [[x + 7, y0 + 4], [x + 11, y0 + 4], [x + 9, y0 + 8]], A.orange[2]);
      }
      rect(c, 0, edge === 0 ? 0 : edge - 1, s.view, 1, A.cyan);
    }
  },
  gate(c, g, s, hint) {
    const x = g.x - s.cam;
    for (const [a, b] of [[s.top, -149], [RAIL, s.bottom]]) {
      rect(c, x - 8, a, 5, b - a, A.hull[4]);
      rect(c, x - 3, a, 6, b - a, A.hull[3]);
      rect(c, x + 3, a, 5, b - a, A.hull[2]);
      for (let y = a + 6; y < b; y += 14) rect(c, x - 8, y, 16, 2, A.hull[1]);
      rect(c, x - 10, a, 2, b - a, A.orange[2]); rect(c, x + 8, a, 2, b - a, A.orange[1]);
    }
    // Emitter: an octahedron seen edge-on.
    const ey = -170;
    poly(c, [[x, ey - 9], [x - 7, ey], [x, ey]], A.orange[3]);
    poly(c, [[x, ey - 9], [x + 7, ey], [x, ey]], A.orange[2]);
    poly(c, [[x - 7, ey], [x, ey + 9], [x, ey]], A.orange[1]);
    poly(c, [[x + 7, ey], [x, ey + 9], [x, ey]], A.orange[0]);
    if (Math.sin(s.t * 4) > 0) rect(c, x - 1.5, ey - 1.5, 3, 3, '#fff3c0');
    // The arrow: jump after this line.
    const ax = x - L.arrowLeftOffset;
    rect(c, ax - 1.5, -135, 1.5, 133, A.orange[3]); rect(c, ax, -135, 1.5, 133, A.orange[1]);
    bevelBox(c, ax - 3.5, -138, 7, 4, 1, 2, A.orange); bevelBox(c, ax - 3.5, -4, 7, 4, 1, 2, A.orange);
    // Field: flat scan bars, then solid arrowheads stepped by strength.
    for (let y = -130; y < -6; y += 6) rect(c, x - 7, y, 14, 1, '#16302a');
    const dir = g.lane ? -1 : 1;
    c.save(); c.beginPath(); c.rect(x - 8, -133, 16, 129); c.clip();
    for (const y of chevronYs(g, s.t)) {
      const k = chevronStrength(g, y);
      if (k < 0.12) continue;
      poly(c, chevron(x, y, dir), A.green[k > 0.7 ? 3 : k > 0.4 ? 2 : 1]);
    }
    c.restore();
    text(c, g.lane ? 'UP' : 'DOWN', x - 5, -143, 4, A.green[3]);
    if (hint) {
      const y = g.lane ? -30 : -105;
      bevelBox(c, x + 8, y - 10, 30, 14, 2, 1);
      text(c, 'JUMP', x + 11, y, 7, A.green[3]);
    }
  },
  sector(c, label, x) { text(c, label, x, -142, 3.5, A.green[2]); },
};

// ======================================================================
// B — AIRBRUSH. Soft gradients, chrome that reflects a horizon, glows
// instead of outlines: the 70s paperback cover and the NASA painting.
// ======================================================================
// Gate signal colours for the airbrushed room: `glow` is the soft underlay and
// column, `core` the chevron line, `label` UP/DOWN and the JUMP hint. Green
// was the playtest's; jade swallows it, hence the others (Peter, 12 Oct).
export const SPACE_CHEVRONS = {
  green: { name: 'GREEN', glow: '90,255,170', core: '220,255,230', label: '#d7fff0' },
  pink: { name: 'PINK', glow: '255,70,190', core: '255,175,230', label: '#ffd2f0' },
  lilac: { name: 'LILAC', glow: '180,130,255', core: '225,205,255', label: '#ebe0ff' },
  white: { name: 'WHITE', glow: '255,90,200', core: '255,255,255', label: '#ffffff' },
  // Plain white on a cool white haze: for the strip, which sits on wall between
  // the windows rather than over the green sky (Peter, 12 Oct).
  clear: { name: 'WHITE', glow: '215,235,255', core: '255,255,255', label: '#ffffff' },
};
// Colour schemes for the airbrushed room (Peter, 12 Oct: "lets set the
// different colour schemes"). DUSK is B as first painted; the others move it
// off Terminal Velocity's magenta. Gameplay inks — the orange arrow, green
// chevrons, the cyan walking edge — never change with the scheme.
const chromeH = (dark, mid, mid2, dark2) => [[0, dark], [0.22, mid], [0.36, '#f6fbff'], [0.52, mid2], [0.8, dark2], [1, dark]];
export const SPACE_SCHEMES = {
  dusk: { name: 'DUSK', bg: '#120b26',
    hull: [[0, '#0b0820'], [0.25, '#26173f'], [0.62, '#3b2450'], [0.8, '#1d1233'], [1, '#09061a']],
    rib: '255,220,255', lamp: 'rgba(255,140,80,0.22)', lampCore: 'rgba(255,215,170,0.85)',
    cove: [[0, '#2d1d4a'], [0.5, '#4a2f60'], [1, '#2a1a40']],
    sky: [[0, '#04021a'], [0.45, '#1e0d3e'], [0.72, '#6a2460'], [0.88, '#d3684e'], [1, '#ffc488']],
    nebula: ['rgba(210,60,170,0.22)', 'rgba(60,170,210,0.18)', 'rgba(255,130,80,0.16)'],
    chromeV: [[0, '#f4f6ff'], [0.3, '#9fb3d9'], [0.48, '#2b2440'], [0.55, '#6b3f4a'], [0.78, '#e6a87c'], [1, '#4a2d3c']],
    chromeH: chromeH('#160f22', '#7c8ab4', '#6c6f92', '#3a2d4a'),
    planetGlow: 'rgba(120,200,235,0.22)' },
  amber: { name: 'AMBER & TEAL', bg: '#06161c',
    hull: [[0, '#04121a'], [0.25, '#0e2c34'], [0.62, '#18424a'], [0.8, '#0c252c'], [1, '#030e13']],
    rib: '200,255,245', lamp: 'rgba(255,170,80,0.24)', lampCore: 'rgba(255,225,170,0.9)',
    cove: [[0, '#113640'], [0.5, '#1d4f58'], [1, '#0f3038']],
    sky: [[0, '#020b12'], [0.45, '#0a3340'], [0.72, '#2d6864'], [0.88, '#d8903e'], [1, '#ffd27a']],
    nebula: ['rgba(60,200,190,0.2)', 'rgba(255,170,70,0.16)', 'rgba(120,220,200,0.14)'],
    chromeV: [[0, '#f2fbff'], [0.3, '#9cc7cf'], [0.48, '#12313a'], [0.55, '#5a4630'], [0.78, '#f0b46a'], [1, '#3a2a1a']],
    chromeH: chromeH('#06171c', '#78a9b2', '#5e8088', '#2a3c3c'),
    planetGlow: 'rgba(255,200,120,0.22)' },
  dawn: { name: 'COLD DAWN', bg: '#070b1a',
    hull: [[0, '#060a18'], [0.25, '#151f3a'], [0.62, '#22325a'], [0.8, '#111a33'], [1, '#050814']],
    rib: '210,230,255', lamp: 'rgba(140,190,255,0.22)', lampCore: 'rgba(220,235,255,0.9)',
    cove: [[0, '#1a2846'], [0.5, '#2a3e66'], [1, '#18243f']],
    sky: [[0, '#02040e'], [0.45, '#0e1c3e'], [0.72, '#36588a'], [0.88, '#9fc0d8'], [1, '#ffe0c8']],
    nebula: ['rgba(120,160,255,0.18)', 'rgba(200,220,255,0.14)', 'rgba(255,200,180,0.12)'],
    chromeV: [[0, '#ffffff'], [0.3, '#b8cbe6'], [0.48, '#1c2640'], [0.55, '#4a5670'], [0.78, '#d8dde6'], [1, '#2a3044']],
    chromeH: chromeH('#0a1020', '#8a9cc0', '#6a7a98', '#2a3450'),
    planetGlow: 'rgba(170,210,255,0.26)' },
  jade: { name: 'JADE', bg: '#05140e',
    hull: [[0, '#04120c'], [0.25, '#0e2a20'], [0.62, '#183e30'], [0.8, '#0b2219'], [1, '#030d08']],
    rib: '210,255,225', lamp: 'rgba(230,255,140,0.2)', lampCore: 'rgba(240,255,200,0.9)',
    cove: [[0, '#103326'], [0.5, '#1c4a38'], [1, '#0e2e22']],
    sky: [[0, '#020a08'], [0.45, '#0a2a24'], [0.72, '#2a6a52'], [0.88, '#a8c870'], [1, '#f2f0b0']],
    nebula: ['rgba(140,240,180,0.18)', 'rgba(200,160,255,0.16)', 'rgba(240,250,150,0.12)'],
    chromeV: [[0, '#f6fff8'], [0.3, '#a6d4bc'], [0.48, '#0f2a20'], [0.55, '#4a5a30'], [0.78, '#d8e090'], [1, '#26301a']],
    chromeH: chromeH('#06140e', '#7aa894', '#5a7c6c', '#22382c'),
    planetGlow: 'rgba(200,255,200,0.22)' },
};
function grad(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
function glow(c, x, y, r, inner, outer = inner.replace(/[\d.]+\)$/, '0)')) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function brushPlanet(c, cx, cy, R, t) {
  // Atmosphere first, so the limb sits in its own haze.
  const atm = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25);
  atm.addColorStop(0, 'rgba(120,220,235,0.55)'); atm.addColorStop(0.35, 'rgba(90,170,220,0.18)'); atm.addColorStop(1, 'rgba(60,90,200,0)');
  c.fillStyle = atm; c.beginPath(); c.arc(cx, cy, R * 1.25, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
  c.fillStyle = grad(c, cx - R, cy - R, cx + R * 0.6, cy + R, [[0, '#ffe7b8'], [0.4, '#e3955c'], [0.75, '#8a3e4c'], [1, '#3a1730']]);
  c.fillRect(cx - R, cy - R, R * 2, R * 2);
  // Soft bands drift slowly across the disc.
  for (let i = 0; i < 9; i++) {
    const y = cy - R + (i + 0.5) * R * 2 / 9 + Math.sin(i * 1.7) * 2;
    c.strokeStyle = i % 2 ? 'rgba(255,240,210,0.16)' : 'rgba(110,40,60,0.2)';
    c.lineWidth = R * (0.08 + hash(i) * 0.1);
    c.beginPath(); c.moveTo(cx - R, y); c.bezierCurveTo(cx - R / 3, y + 3, cx + R / 3, y - 3, cx + R, y + 1); c.stroke();
  }
  glow(c, cx + R * 0.25 + Math.sin(t * 0.05) * 2, cy + R * 0.2, R * 0.16, 'rgba(160,50,50,0.55)');
  // Terminator: a soft night side lower right.
  const night = c.createRadialGradient(cx - R * 0.45, cy - R * 0.45, R * 0.4, cx - R * 0.2, cy - R * 0.2, R * 1.6);
  night.addColorStop(0, 'rgba(10,5,30,0)'); night.addColorStop(0.55, 'rgba(10,5,30,0.25)'); night.addColorStop(1, 'rgba(8,4,24,0.92)');
  c.fillStyle = night; c.fillRect(cx - R, cy - R, R * 2, R * 2);
  c.restore();
  // Lit rim, upper left.
  c.strokeStyle = 'rgba(255,250,230,0.5)'; c.lineWidth = 0.8;
  c.beginPath(); c.arc(cx, cy, R - 0.4, Math.PI * 0.95, Math.PI * 1.6); c.stroke();
}
function dune(c, s, f, base, amp, top, bottom, seed, rim = 'rgba(255,190,150,0.28)') {
  const horizon = -20;
  const shift = s.cam * f;
  c.beginPath(); c.moveTo(-60, horizon);
  for (let x = -60; x <= s.view + 60; x += 4) {
    const wx = x + shift;
    c.lineTo(x, base - amp * (0.5 + 0.3 * Math.sin(wx / 47 + seed) + 0.2 * Math.sin(wx / 19 + seed * 2)));
  }
  c.lineTo(s.view + 60, horizon); c.closePath();
  c.fillStyle = grad(c, 0, base - amp, 0, base + 6, [[0, top], [1, bottom]]); c.fill();
  c.save(); c.clip();
  c.strokeStyle = rim; c.lineWidth = 1.4; c.stroke();
  c.restore();
}
function sparkle(c, x, y, r, a) {
  c.strokeStyle = `rgba(255,248,235,${a})`; c.lineWidth = 0.35;
  c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke();
  glow(c, x, y, r * 0.45, `rgba(255,248,235,${a})`);
}
const airbrush = {
  id: 'airbrush', letter: 'B', name: 'AIRBRUSHED SPACE ART',
  note: 'The 70s–80s paperback cover and NASA concept painting. Chrome that reflects a horizon on every rail and mast, '
    + 'a huge banded giant in its own haze, drifting nebulae and comets, and faceted mountains beyond the glass.',
  bg: SPACE_SCHEMES.dusk.bg, pal: SPACE_SCHEMES.dusk, chev: SPACE_CHEVRONS.green, lightBg: false, label: '#bfffe0', hint: '#7dffc0',
  hull(c, s) {
    const P = this.pal;
    c.fillStyle = grad(c, 0, s.top, 0, s.bottom, P.hull);
    c.fillRect(0, s.top, s.view, s.bottom - s.top);
    // Moulded ribs: a soft highlight down each, no line work.
    for (let i = Math.floor(s.cam / 48) - 1; i * 48 < s.cam + s.view + 48; i++) {
      const x = i * 48 - s.cam;
      c.fillStyle = grad(c, x, 0, x + 48, 0, [[0, `rgba(${P.rib},0)`], [0.12, `rgba(${P.rib},0.09)`], [0.3, `rgba(${P.rib},0)`]]);
      const r = railDepth(this);
      c.fillRect(x, s.top, 48, CEIL - r - s.top);
      c.fillRect(x, r, 48, s.bottom - r);
      // Deck lamps: warm pools under the floor.
      glow(c, x + 24, 30, 14, P.lamp);
      c.fillStyle = P.lampCore; c.beginPath(); c.ellipse(x + 24, 30, 3, 1, 0, 0, TAU); c.fill();
    }
    // Wall behind the ports: a soft cove.
    c.fillStyle = grad(c, 0, CEIL, 0, 0, P.cove);
    c.fillRect(0, CEIL, s.view, -CEIL);
  },
  paneClip(c, x, w = PANE.w) { const k = frameOf(this), B = paneB(this); c.roundRect(x + 2 * k, B.top + 2 * k, w - 4 * k, B.h - 4 * k, 14); },
  vista(c, s) {
    const P = this.pal;
    c.fillStyle = grad(c, 0, CEIL, 0, 0, P.sky);
    if (this.tallGlass) c.fillRect(0, s.top, s.view, s.bottom - s.top); else c.fillRect(0, CEIL, s.view, -CEIL);
    // Nebula: big soft clouds drifting at a crawl.
    const nx = -s.cam * 0.01;
    glow(c, wrap(nx + 70, s.view + 120) - 60, -112, 46, P.nebula[0]);
    glow(c, wrap(nx + 210, s.view + 120) - 60, -95, 52, P.nebula[1]);
    glow(c, wrap(nx + 330, s.view + 120) - 60, -118, 38, P.nebula[2]);
    if (this.titleStars) titleStarfield(c, s);
    else {
      for (let i = 0; i < 80; i++) {
        const x = wrap(hash(i) * 560 - s.cam * 0.015, 560), y = -133 + hash(i + 300) * 80;
        c.fillStyle = `rgba(255,245,235,${0.25 + hash(i + 90) * 0.6})`; c.fillRect(x, y, 0.5, 0.5);
      }
      for (let i = 0; i < 6; i++) {
        const x = wrap(hash(i + 900) * 560 - s.cam * 0.015, 560), y = -128 + hash(i + 940) * 60;
        sparkle(c, x, y, 2.4 + hash(i + 980) * 2, 0.55 + 0.35 * Math.sin(s.t * 1.3 + i * 2));
      }
    }
    const w = Math.max(60, s.view - 60);
    this.planet(c, s, w);
    // Comet: a soft head and a long fading tail. Not in the directed looks:
    // there the director alone decides what passes.
    const ev = Math.floor(s.t / 8.5), age = s.t - ev * 8.5 - (1.1 + hash(ev + 601) * 2);
    if (!this.director && age >= 0 && age < 1.4) {
      const u = age / 1.4, x = w + 28 - u * (w + 56), y = -110 + hash(ev + 631) * 30 + u * 23;
      c.strokeStyle = grad(c, x, y, x + 40, y - 10, [[0, 'rgba(200,240,255,0.7)'], [1, 'rgba(200,240,255,0)']]);
      c.lineWidth = 1.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 40, y - 10); c.stroke();
      glow(c, x, y, 5, 'rgba(230,250,255,0.9)');
    }
    lifePass(c, s, this, 'sky');
    this.land(c, s);
    if (this.tallGlass) {
      // The ground carries on down below the floor rail: the near ridges' shade,
      // with a few strata of faceted rock.
      const r = (RIDGE_SCHEMES[this.pal?.name] ?? RIDGE_SCHEMES.DUSK).ridges[2];
      c.fillStyle = r[1]; c.fillRect(-60, 6, s.view + 120, Math.max(0, s.bottom - 6));
      const shift = s.cam * 0.14;
      for (let k = Math.floor((shift - 60) / 23); k * 23 < shift + s.view + 60; k++) {
        const x = k * 23 - shift, y = 10 + hash(k + 600) * Math.max(4, s.bottom - 16), w = 4 + hash(k + 610) * 8;
        poly(c, [[x - w, y + 2], [x, y - w * 0.45], [x + w * 0.6, y + 2]], r[0] + '55');
      }
    }
    lifePass(c, s, this, 'near');
  },
  planet(c, s, w) { brushPlanet(c, w * (0.86 - 0.5 * s.progress), -70 + s.progress * 4, 44, s.t); },
  land(c, s) {
    const r = RIDGE_SCHEMES[this.pal.name] ?? RIDGE_SCHEMES.DUSK, d = r.dunes;
    dune(c, s, 0.03, -20, 22, d[0][0], d[0][1], 1, r.rim);
    dune(c, s, 0.065, -12, 17, d[1][0], d[1][1], 2, r.rim);
  },
  pane(c, x, s, w = PANE.w) {
    const fk = frameOf(this), PB = paneB(this);
    c.strokeStyle = grad(c, 0, PB.top, 0, PB.top + PB.h, this.pal.chromeV); c.lineWidth = 3.8 * fk;
    c.beginPath(); c.roundRect(x, PB.top, w, PB.h, 15); c.stroke();
    c.strokeStyle = 'rgba(10,6,24,0.8)'; c.lineWidth = 0.9 * Math.max(0.45, fk);
    c.beginPath(); c.roundRect(x + 2.3 * fk, PB.top + 2.3 * fk, w - 4.6 * fk, PB.h - 4.6 * fk, 13); c.stroke();
    // Glass (Peter, 13 Oct: "the windows aren't reading as glass at all"): a
    // faint cool tint, a bright rim of light just inside the top and left
    // edges, a darker bottom where the frame shades it, and two crisp diagonal
    // reflection bands that slide slowly across as the station scrolls.
    const top = PB.top, h = PB.h;
    c.save(); c.beginPath(); c.roundRect(x + 2, top + 2, w - 4, h - 4, 14); c.clip();
    c.fillStyle = 'rgba(170,225,235,0.06)'; c.fillRect(x, top, w, h);
    c.fillStyle = grad(c, 0, top, 0, top + h, [[0, 'rgba(255,255,255,0.10)'], [0.18, 'rgba(255,255,255,0)'], [0.82, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.22)']]);
    c.fillRect(x, top, w, h);
    const slide = ((s?.cam ?? 0) * 0.08 + x * 0.35) % (w + 80) - 40;
    for (const [off, bw, a] of [[0, 16, 0.22], [24, 6, 0.17]]) {
      const bx = x + slide + off;
      c.fillStyle = grad(c, bx, 0, bx + bw, 0, [[0, 'rgba(255,255,255,0)'], [0.5, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']]);
      c.beginPath(); c.moveTo(bx, top); c.lineTo(bx + bw, top); c.lineTo(bx + bw - h * 0.45, top + h); c.lineTo(bx - h * 0.45, top + h); c.closePath(); c.fill();
    }
    c.restore();
    // Inner rim: the whole inner edge, barely there, brightest at the top-left
    // corner and fading to nothing along both sides (Peter, 13 Oct: the hard
    // L-shaped rim was too much — "really subtle").
    c.strokeStyle = grad(c, x, top, x + w * 0.6, top + h * 0.6, [[0, 'rgba(235,255,250,0.16)'], [0.45, 'rgba(235,255,250,0.05)'], [1, 'rgba(235,255,250,0)']]);
    c.lineWidth = 0.5;
    c.beginPath(); c.roundRect(x + 3.2, top + 3.2, w - 6.4, h - 6.4, 12.5); c.stroke();
  },
  rails(c, s) {
    const R = railDepth(this), q = R / RAIL;
    // The slim rail is a round pipe, lit from above (Peter, 14 Oct: "reads more
    // like a pipe"): a rim of shade, the body, one highlight high on the curve,
    // shading round to a dark underside — not the flat chrome's banded horizon.
    const V = this.pal.chromeV, at = (o) => V.find(([p]) => p >= o)[1];
    const pipe = [[0, at(0.55)], [0.14, at(0.78)], [0.3, V[0][1]], [0.44, at(0.78)], [0.76, at(0.55)], [1, V[V.length - 1][1]]];
    for (const [y0, edge] of [[CEIL - R, CEIL], [0, 0]]) {
      c.fillStyle = grad(c, 0, y0, 0, y0 + R, this.tallGlass ? pipe : y0 ? V.map(([o, col]) => [1 - o, col]).reverse() : V);
      c.fillRect(0, y0, s.view, R);
      for (let i = Math.floor(s.cam / 36) - 1; i * 36 < s.cam + s.view + 36; i++) {
        const x = i * 36 - s.cam;
        c.fillStyle = 'rgba(20,10,30,0.35)'; c.fillRect(x, y0, 0.6, R);
        if (i % 2 === 0) {
          glow(c, x + 18, y0 + R / 2, 5 * q, 'rgba(255,140,60,0.45)');
          c.fillStyle = '#ffd2a0'; c.beginPath(); c.arc(x + 18, y0 + R / 2, 0.9 * Math.sqrt(q), 0, TAU); c.fill();
        }
      }
      if (this.tallGlass) continue;   // a pipe has no glowing edge strip
      c.fillStyle = grad(c, 0, edge - 2 * q, 0, edge + 2 * q, [[0, 'rgba(160,255,240,0)'], [0.5, 'rgba(200,255,250,0.75)'], [1, 'rgba(160,255,240,0)']]);
      c.fillRect(0, edge - 2 * q, s.view, 4 * q);
    }
  },
  gate(c, g, s, hint) {
    const x = g.x - s.cam;
    for (const [a, b] of [[s.top, CEIL - railDepth(this)], [railDepth(this), s.bottom]]) {
      c.fillStyle = grad(c, x - 8, 0, x + 8, 0, this.pal.chromeH); c.fillRect(x - 8, a, 16, b - a);
      for (let y = a + 6; y < b; y += 14) { c.fillStyle = 'rgba(10,5,20,0.4)'; c.fillRect(x - 8, y, 16, 1.2); }
    }
    // Emitter: a hot orb in a wide halo.
    glow(c, x, -168, 16, `rgba(255,150,70,${0.35 + 0.2 * Math.sin(s.t * 4)})`);
    c.fillStyle = grad(c, x - 5, -173, x + 5, -163, [[0, '#fff6e0'], [0.5, '#ffb070'], [1, '#c04a2a']]);
    c.beginPath(); c.arc(x, -168, 4.5, 0, TAU); c.fill();
    // The arrow: a glowing orange bar.
    const ax = x - L.arrowLeftOffset;
    c.fillStyle = grad(c, ax - 6, 0, ax + 6, 0, [[0, 'rgba(255,120,40,0)'], [0.5, 'rgba(255,140,60,0.4)'], [1, 'rgba(255,120,40,0)']]);
    c.fillRect(ax - 6, -135, 12, 133);
    c.fillStyle = '#ffe2b8'; c.fillRect(ax - 0.7, -135, 1.4, 133);
    // Field: a soft green column, chevrons with a wide glow underlay.
    const C = this.chev;
    c.fillStyle = grad(c, x - 12, 0, x + 12, 0, [[0, `rgba(${C.glow},0)`], [0.5, `rgba(${C.glow},0.12)`], [1, `rgba(${C.glow},0)`]]);
    c.fillRect(x - 12, -133, 24, 129);
    const dir = g.lane ? -1 : 1;
    c.save(); c.beginPath(); c.rect(x - 10, -133, 20, 129); c.clip();
    c.lineJoin = 'round'; c.lineCap = 'round';
    for (const y of chevronYs(g, s.t)) {
      const k = chevronStrength(g, y);
      if (k < 0.05) continue;
      c.beginPath(); c.moveTo(x - 5, y - dir * 3); c.lineTo(x, y + dir * 2); c.lineTo(x + 5, y - dir * 3);
      c.strokeStyle = `rgba(${C.glow},${0.25 * k})`; c.lineWidth = 5; c.stroke();
      c.strokeStyle = `rgba(${C.core},${0.1 + 0.9 * k})`; c.lineWidth = 1.5; c.stroke();
    }
    c.restore();
    text(c, g.lane ? 'UP' : 'DOWN', x - 5, -143, 4.4, C.label, 'sans-serif', 'italic bold');
    if (hint) {
      const y = g.lane ? -30 : -105;
      glow(c, x + 23, y - 3, 20, `rgba(${C.glow},0.35)`);
      text(c, 'JUMP', x + 11, y, 7.5, C.label, 'sans-serif', 'italic bold');
    }
  },
  sector(c, label, x) { text(c, label, x, -142, 3.8, '#9ff7e0', 'sans-serif', 'italic bold'); },
};

// ======================================================================
// C — SCREENPRINT. Three inks on cream stock — navy, signal red, mustard —
// tone only as halftone dots, the red pass a hair off register.
// ======================================================================
const P = { paper: '#efe3c6', navy: '#1f2b4d', red: '#e04a32', mustard: '#efb23c' };
const REG = [0.5, 0.35]; // red/mustard pass misregistration, world units
// Dots on a world-fixed 45° screen. f(x, y) -> 0..1 coverage.
function halftone(c, x0, y0, x1, y1, step, ox, f, ink) {
  c.fillStyle = ink; c.beginPath();
  let row = Math.floor(y0 / step);
  for (let y = row * step; y < y1 + step; y += step, row++) {
    const sh = (row & 1) * step / 2;
    for (let wx = Math.floor((x0 + ox - sh) / step) * step + sh; wx - ox < x1 + step; wx += step) {
      const x = wx - ox, v = f(x, y);
      if (v <= 0.03) continue;
      const r = step * 0.7 * Math.sqrt(Math.min(1, v));
      c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
    }
  }
  c.fill();
}
function star4(c, x, y, r, ink) {
  poly(c, [[x, y - r], [x + r * 0.25, y - r * 0.25], [x + r, y], [x + r * 0.25, y + r * 0.25],
    [x, y + r], [x - r * 0.25, y + r * 0.25], [x - r, y], [x - r * 0.25, y - r * 0.25]], ink);
}
function printHills(c, s, f, base, amp, ink, seed, outline) {
  const horizon = -20;
  const shift = s.cam * f;
  c.beginPath(); c.moveTo(-60, horizon);
  for (let x = -60; x <= s.view + 60; x += 6) {
    const wx = x + shift;
    c.lineTo(x, base - amp * (0.5 + 0.32 * Math.sin(wx / 41 + seed) + 0.18 * Math.sin(wx / 15 + seed)));
  }
  c.lineTo(s.view + 60, horizon); c.closePath(); c.fillStyle = ink; c.fill();
  if (outline) { c.strokeStyle = P.navy; c.lineWidth = 1; c.stroke(); }
}
function printPlanet(c, cx, cy, R) {
  // Ring behind, in paper with a navy keyline.
  c.save(); c.translate(cx, cy); c.rotate(-0.3);
  const ring = (front) => {
    c.beginPath(); c.ellipse(0, 0, R * 1.85, R * 0.55, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
    c.ellipse(0, 0, R * 1.4, R * 0.4, 0, front ? Math.PI : TAU, front ? 0 : Math.PI, true); c.closePath();
    c.fillStyle = P.paper; c.fill(); c.strokeStyle = P.navy; c.lineWidth = 0.9; c.stroke();
  };
  ring(false);
  c.save(); c.translate(REG[0], REG[1]);
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fillStyle = P.mustard; c.fill();
  c.save(); c.clip();
  for (const [y, h] of [[-R * 0.55, R * 0.16], [-R * 0.1, R * 0.24], [R * 0.4, R * 0.14]]) rect(c, -R, y, R * 2, h, P.red);
  c.restore(); c.restore();
  // Night side as navy dots, heavier toward the lower right.
  c.save(); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
  halftone(c, -R, -R, R, R, 1.8, 0, (x, y) => clamp01(((x + y) / (R * 1.4)) * 1.1 + 0.1), P.navy);
  c.restore();
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.strokeStyle = P.navy; c.lineWidth = 1.1; c.stroke();
  ring(true);
  c.restore();
}
const screenprint = {
  id: 'screenprint', letter: 'C', name: 'MISSION-PATCH SCREENPRINT',
  note: 'Three inks on cream stock — navy, signal red, mustard — like a NASA mission poster. No blends: tone is halftone '
    + 'dots on a fixed screen, the red pass a hair off register, angular mountains outside, keylines and hazard stencils.',
  bg: P.navy, lightBg: true, label: P.navy, hint: P.red,
  hull(c, s) {
    rect(c, 0, s.top, s.view, -149 - s.top, P.navy);
    rect(c, 0, RAIL, s.view, s.bottom - RAIL, P.navy);
    for (let i = Math.floor(s.cam / 48) - 1; i * 48 < s.cam + s.view + 48; i++) {
      const x = i * 48 - s.cam;
      c.strokeStyle = P.paper; c.lineWidth = 1.2; c.beginPath();
      c.moveTo(x, -152); c.lineTo(x + 24, Math.max(s.top, -186)); c.lineTo(x + 48, -152); c.stroke();
      for (let y = 18; y < s.bottom; y += 22) {
        c.strokeStyle = P.paper; c.lineWidth = 0.9; c.strokeRect(x + 5, y, 34, 13);
        for (let k = 0; k < 4; k++) line(c, x + 9 + k * 8, y + 3, x + 9 + k * 8, y + 10, P.paper, 1.6);
        rect(c, x + 41 + REG[0], y + 5 + REG[1], 3, 3, P.mustard);
      }
    }
    // Paper wall; halftone darkening into each rail and down each pilaster.
    rect(c, 0, CEIL, s.view, -CEIL, P.paper);
    halftone(c, 0, CEIL, s.view, 0, 2.6, s.cam, (x, y) => {
      const k = wrap(x + s.cam, PANE.step), side = Math.min(k, PANE.step - k);
      return Math.max(clamp01(1 - (y - CEIL) / 16) * 0.6, clamp01(1 + y / 14) * 0.45, clamp01(1 - side / 9) * 0.5);
    }, P.navy);
    for (let k = Math.floor(s.cam / PANE.step); k * PANE.step < s.cam + s.view + PANE.step; k++) {
      const x = k * PANE.step - s.cam;
      rect(c, x - 2, CEIL, 4, -CEIL, P.navy);
      text(c, `GG-${String(wrap(k, 100)).padStart(2, '0')}`, x + 8, -3.2, 3.6, P.navy, 'Futura, "Avenir Next", "Trebuchet MS", sans-serif');
    }
  },
  paneClip(c, x) { c.roundRect(x + 2, PANE.top + 2, PANE.w - 4, PANE.h - 4, 18); },
  vista(c, s) {
    rect(c, 0, CEIL, s.view, -CEIL, P.navy);
    for (let i = 0; i < 46; i++) {
      const x = wrap(hash(i) * 560 - s.cam * 0.015, 560), y = -133 + hash(i + 300) * 88;
      if (hash(i + 90) > 0.8) star4(c, x, y, 2 + hash(i + 50) * 1.5, P.paper);
      else rect(c, x, y, 0.8, 0.8, P.paper);
    }
    const w = Math.max(60, s.view - 60);
    printPlanet(c, w * (0.82 - 0.5 * s.progress), -98 + s.progress * 3, 14);
    const ev = Math.floor(s.t / 8.5), age = s.t - ev * 8.5 - (1.1 + hash(ev + 601) * 2);
    if (age >= 0 && age < 1.4) {
      const u = age / 1.4, x = w + 28 - u * (w + 56), y = -106 + hash(ev + 631) * 40 + u * 23;
      poly(c, [[x, y - 1.6], [x + 26, y - 7], [x, y + 1.6]], P.paper);
      c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fillStyle = P.mustard; c.fill();
    }
    printHills(c, s, 0.03, -22, 26, P.red, 1, false);
    halftone(c, 0, -48, s.view, 6, 2.2, s.cam * 0.03, (x, y) => clamp01((y + 30) / 30) * 0.7, P.navy);
    printHills(c, s, 0.065, -13, 18, P.mustard, 2, true);
  },
  pane(c, x) {
    c.strokeStyle = P.navy; c.lineWidth = 4;
    c.beginPath(); c.roundRect(x, PANE.top, PANE.w, PANE.h, 20); c.stroke();
    c.strokeStyle = P.red; c.lineWidth = 0.9;
    c.beginPath(); c.roundRect(x + 2.6 + REG[0], PANE.top + 2.6 + REG[1], PANE.w - 5.2, PANE.h - 5.2, 17); c.stroke();
    // Bolts at the four quarters.
    for (const [bx, by] of [[x + PANE.w / 2, PANE.top - 0.2], [x + PANE.w / 2, PANE.top + PANE.h + 0.2], [x - 0.2, PANE.top + PANE.h / 2], [x + PANE.w + 0.2, PANE.top + PANE.h / 2]]) {
      c.beginPath(); c.arc(bx, by, 1.1, 0, TAU); c.fillStyle = P.paper; c.fill();
    }
  },
  rails(c, s) {
    for (const [y0, edge] of [[-149, CEIL], [0, 0]]) {
      rect(c, REG[0], y0 + REG[1], s.view, RAIL, P.red);
      c.save(); c.beginPath(); c.rect(0, y0 + 3, s.view, RAIL - 6); c.clip();
      c.fillStyle = P.navy; c.beginPath();
      for (let i = Math.floor(s.cam / 10) - 2; i * 10 < s.cam + s.view + 20; i++) {
        const x = i * 10 - s.cam;
        c.moveTo(x, y0 + RAIL); c.lineTo(x + 4, y0 + RAIL); c.lineTo(x + 4 + RAIL, y0); c.lineTo(x + RAIL, y0); c.closePath();
      }
      c.fill(); c.restore();
      line(c, 0, edge, s.view, edge, P.paper, 1.4);
      c.strokeStyle = P.navy; c.lineWidth = 0.9; c.strokeRect(-1, y0, s.view + 2, RAIL);
    }
  },
  gate(c, g, s, hint) {
    const x = g.x - s.cam;
    for (const [a, b] of [[s.top, -149], [RAIL, s.bottom]]) {
      rect(c, x - 8, a, 16, b - a, P.navy);
      for (let y = a + 4; y < b; y += 14) rect(c, x - 8, y, 16, 3, P.paper);
      rect(c, x - 10 + REG[0], a, 1.6, b - a, P.red); rect(c, x + 8.4 + REG[0], a, 1.6, b - a, P.red);
    }
    // A roundel with a lamp in the middle.
    c.beginPath(); c.arc(x, -168, 9, 0, TAU); c.fillStyle = P.navy; c.fill();
    c.beginPath(); c.arc(x, -168, 6.6, 0, TAU); c.strokeStyle = P.paper; c.lineWidth = 1.3; c.stroke();
    c.beginPath(); c.arc(x + REG[0], -168 + REG[1], 3.2, 0, TAU);
    c.fillStyle = Math.sin(s.t * 4) > 0 ? P.red : P.mustard; c.fill();
    // The arrow: a red bar with navy keylines and end tabs.
    const ax = x - L.arrowLeftOffset;
    rect(c, ax - 1.2 + REG[0], -135 + REG[1], 2.4, 133, P.red);
    c.strokeStyle = P.navy; c.lineWidth = 0.6; c.strokeRect(ax - 1.2, -135, 2.4, 133);
    rect(c, ax - 3.5, -138, 7, 4, P.navy); rect(c, ax - 3.5, -4, 7, 4, P.navy);
    // Field: chevrons in mustard, solid when strong, keyline only when faint.
    const dir = g.lane ? -1 : 1;
    c.save(); c.beginPath(); c.rect(x - 8, -133, 16, 129); c.clip();
    for (const y of chevronYs(g, s.t)) {
      const k = chevronStrength(g, y);
      if (k < 0.2) continue;
      const pts = chevron(x, y, dir, 5.5, 5.5, 2.2);
      if (k > 0.45) poly(c, pts.map(([px, py]) => [px + REG[0], py + REG[1]]), P.mustard);
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.closePath();
      c.strokeStyle = P.navy; c.lineWidth = 0.8; c.stroke();
    }
    c.restore();
    const font = 'Futura, "Avenir Next", "Trebuchet MS", sans-serif';
    rect(c, x - 7, -147.5, 14, 5.6, P.paper);
    text(c, g.lane ? 'UP' : 'DOWN', x - (g.lane ? 2.8 : 6), -143, 4.4, P.navy, font);
    if (hint) {
      const y = g.lane ? -30 : -105;
      c.beginPath(); c.roundRect(x + 8, y - 10, 31, 14, 7); c.fillStyle = P.red; c.fill();
      c.strokeStyle = P.navy; c.lineWidth = 1; c.stroke();
      text(c, 'JUMP', x + 11.5, y, 7, P.paper, font);
    }
  },
  sector(c, label, x) {
    rect(c, x - 2, -147.5, 34, 5.6, P.paper);
    text(c, label, x, -143, 3.8, P.navy, 'Futura, "Avenir Next", "Trebuchet MS", sans-serif');
  },
};

// D/E — B's interior with A's planet and mountains (Peter, 12 Oct 2026).
const hybrid = {
  ...airbrush, id: 'hybrid', letter: 'D', name: 'AIRBRUSH ROOM, POLYGON WORLD',
  note: 'B’s chrome interior and nebula with A’s low-poly ringed planet and faceted mountain ridges outside.',
  planet(c, s, w) {
    const x = w * (0.82 - 0.5 * s.progress), y = -98 + s.progress * 3;
    glow(c, x, y, 30, this.pal.planetGlow);
    polyPlanet(c, x, y, 15, s.t * 0.12);
  },
  land(c, s) { schemeRidges(c, s, this); },
};
const hybridGiant = {
  ...hybrid, id: 'hybridgiant', letter: 'E', name: 'AIRBRUSH ROOM, POLYGON GIANT',
  note: 'As D, but the faceted planet is B’s giant — a finer mesh with a soft atmosphere behind it; the ridges remain.',
  planet(c, s, w) {
    const x = w * (0.86 - 0.5 * s.progress), y = -70 + s.progress * 4;
    glow(c, x, y, 58, 'rgba(110,200,235,0.3)');
    polyPlanet(c, x, y, 34, s.t * 0.05, 9, 18);
  },
};

// F — D's room with a parade of planets (Peter, 12 Oct: "id like to see 3 or 4
// planets passing through the stage"). Each body crosses the windows over its
// own stretch of the run, centred on `at` (stage progress) and taking `span`
// of it to pass; sizes sit between D's and E's. All flat facets, so a parade
// costs about what one planet did — the room is what costs.
//
// Fourteen bodies now, split across the three levels so no planet repeats
// (Peter, 14 Oct: "add all 10 planets into the mix"): `stage` says whose sky it
// crosses. Five each: level 1 the calm ones (one ringed planet, and the twin
// moons made to even it up), level 2 five, level 3's invasion five — the red planet first, then the magma world, the sideways
// rings, the machine world and the moon that isn't one. The new ten paint themselves (space-planet-candidates.js);
// `reach` is how far above its centre a body draws, in radii (the tipped-over
// rings stand up nearly two radii).
const NEW_PLANET = Object.fromEntries(PLANET_CANDIDATES.map(p => [p.id, p]));
const fresh = (id, stage, at, y, extra = {}) => ({ name: NEW_PLANET[id].name.toLowerCase(), stage, at, span: 0.26, y,
  R: NEW_PLANET[id].R, draw: NEW_PLANET[id].draw, reach: 1.05, ...extra });
const PARADE = [
  { name: 'ringed giant', stage: 1, at: 0.1, span: 0.26, R: 24, y: -88, glow: 'rgba(120,200,235,0.24)', spin: 0.08,
    opts: { nLat: 8, nLon: 16 } },
  fresh('ocean', 1, 0.3, -92),
  fresh('pluto', 1, 0.5, -96),
  fresh('twins', 1, 0.7, -94, { reach: 1.4, halfK: 3.2 }),
  fresh('dune', 1, 0.9, -90),
  { name: 'cratered moon', stage: 2, at: 0.1, span: 0.26, R: 13, y: -100, glow: 'rgba(220,220,240,0.16)', spin: 0.03,
    opts: { nLat: 6, nLon: 12, rings: false, craters: 0.3, seed: 40, tilt: 0.2,
      ramps: [['#2a2a34', '#4c4c58', '#7a7a86', '#a9a9b2', '#d8d8dc']] } },
  fresh('storm', 2, 0.3, -84),
  fresh('geode', 2, 0.5, -98),
  fresh('eyeball', 2, 0.7, -92),
  { name: 'ice world', stage: 2, at: 0.9, span: 0.26, R: 20, y: -92, glow: 'rgba(150,220,255,0.3)', spin: 0.06,
    opts: { nLat: 8, nLon: 16, rings: false, craters: 0.12, seed: 70,
      ramps: [['#14263e', '#2c5478', '#5c95c0', '#a6d4ef', '#eefaff'], ['#1a2e46', '#386588', '#78acd0', '#c4e6f6', '#ffffff']] } },
  { name: 'red planet and its moon', stage: 3, at: 0.1, span: 0.28, R: 17, y: -94, glow: 'rgba(255,140,90,0.24)', spin: 0.07,
    opts: { nLat: 7, nLon: 14, rings: false, craters: 0.2, seed: 90, tilt: 0.25,
      ramps: [['#2e1416', '#5e2420', '#9a3e2a', '#d06a3e', '#f4a66a'], ['#2a1214', '#54201e', '#8a3626', '#c25e38', '#ea9660']] },
    moon: { dx: 30, dy: -16, R: 6, ramps: [['#2a2626', '#4e4644', '#7e726a', '#b2a496']] } },
  // Mars first: level 3 is the invasion (Peter, 14 Oct: "red planet first").
  fresh('magma', 3, 0.28, -96),
  // Moved from level 1 so it has only the one ringed planet (Peter, 14 Oct).
  fresh('sideways', 3, 0.47, -80, { R: 13, reach: 1.95 }),
  fresh('machine', 3, 0.66, -90),
  fresh('battlemoon', 3, 0.84, -98),
];
function planetParade(c, s, w) {
  const stage = s.stage ?? 1;
  for (const p of PARADE) {
    if (p.stage !== stage) continue;
    const u = (s.progress - p.at) / p.span;           // -0.5 .. 0.5 while it is in view
    if (u < -0.6 || u > 0.6) continue;
    // Never cut by the top of the glass: tall glass draws the view 1.3× about
    // the floor, which lifted the high planets past the ceiling (Peter, 14 Oct).
    const reach = (p.draw ? p.R * p.reach : Math.max(p.R * (p.opts.rings === false ? 1.05 : 1.3), p.moon ? p.moon.R - p.moon.dy : 0)) + 5;
    // Wide enough for the dune world's moons and the glows to clear the edge.
    const half = p.R * (p.halfK ?? (p.draw ? 2.4 : 2));
    const x = w / 2 - u * (w + 2 * half + 60), y = Math.max(p.y + u * 6, (s.glassTop ?? -Infinity) + reach);
    traceAt(`planet:${p.name}`, x, half);
    if (p.draw) { p.draw(c, x, y, p.R, s.t); continue; }
    glow(c, x, y, p.R * 1.9, p.glow);
    polyPlanet(c, x, y, p.R, s.t * p.spin, p.opts.nLat, p.opts.nLon, p.opts);
    if (p.moon) polyPlanet(c, x + p.moon.dx, y + p.moon.dy, p.moon.R, s.t * 0.1, 5, 10,
      { rings: false, ramps: p.moon.ramps, craters: 0.25, seed: 5 });
  }
}
const parade = {
  ...hybrid, id: 'parade', letter: 'F', name: 'D, WITH A PLANET PARADE',
  note: 'D’s room and ridges; four faceted bodies pass the windows in turn — a ringed giant, a '
    + 'cratered moon, an ice world, a red planet with its moon — each between D’s and E’s size.',
  planet: planetParade,
};

// G–I — F in the other schemes. Same room, ridges and parade; only the
// scheme changes, so the rows compare colour and nothing else.
const schemed = (letter, key) => ({
  ...parade, id: `parade-${key}`, letter, name: `F IN ${SPACE_SCHEMES[key].name}`,
  note: `F’s room, ridges and planet parade in the ${SPACE_SCHEMES[key].name} scheme. Gate and arrow colours unchanged.`,
  pal: SPACE_SCHEMES[key], bg: SPACE_SCHEMES[key].bg,
});
const paradeAmber = schemed('G', 'amber'), paradeDawn = schemed('H', 'dawn'), paradeJade = schemed('I', 'jade');

// I with each candidate chevron colour (pink is the recommendation).
const jadeChevron = key => ({ ...paradeJade, id: `parade-jade-${key}`, letter: `I·${SPACE_CHEVRONS[key].name}`,
  name: `JADE, ${SPACE_CHEVRONS[key].name} CHEVRONS`, chev: SPACE_CHEVRONS[key] });
export const SPACE_JADE_CHEVRONS = ['pink', 'lilac', 'white'].map(jadeChevron);

// THE STRIP (Peter, 12 Oct: "what if we didn't have the gold line and just had
// thick chunky chevrons marking the point … a metallic strip with arrows
// moving in the direction of the gravity … the gold line is messy"). One
// recessed chrome strip replaces the orange line, the glass column and the
// thin chevrons. Its LEADING EDGE is the jump point (g.x - arrowLeftOffset,
// what player.js tests), so the strip's own edge is the place — no line; it
// runs from there to the mast's far side, and the masts and emitter re-centre
// on it. Chevrons are fat filled arrowheads in the channel, travelling the
// way gravity will pull.
function gateStrip(c, g, s, hint) {
  const C = this.chev, P = this.pal;
  const x0 = g.x - s.cam - L.arrowLeftOffset, x1 = g.x - s.cam + 8, cx = (x0 + x1) / 2, w = x1 - x0;
  for (const [a, b] of [[s.top, CEIL - railDepth(this)], [railDepth(this), s.bottom]]) {
    c.fillStyle = grad(c, cx - 8, 0, cx + 8, 0, P.chromeH); c.fillRect(cx - 8, a, 16, b - a);
    for (let y = a + 6; y < b; y += 14) { c.fillStyle = 'rgba(10,5,20,0.4)'; c.fillRect(cx - 8, y, 16, 1.2); }
  }
  glow(c, cx, -168, 16, `rgba(${C.glow},${0.3 + 0.15 * Math.sin(s.t * 4)})`);
  c.fillStyle = grad(c, cx - 5, -173, cx + 5, -163, [[0, '#ffffff'], [0.5, `rgb(${C.core})`], [1, `rgb(${C.glow})`]]);
  c.beginPath(); c.arc(cx, -168, 4.5, 0, TAU); c.fill();
  // The strip: chrome frame, dark recessed channel, a glow down the channel —
  // all of it translucent, so the window shows through and the strip reads
  // as part of the wall behind the hero (Peter, 12 Oct).
  const top = -137, bot = 0;
  c.save(); c.globalAlpha = 0.3;
  c.fillStyle = grad(c, x0, 0, x1, 0, P.chromeH); c.fillRect(x0, top, 3, bot - top); c.fillRect(x1 - 3, top, 3, bot - top);
  c.restore();
  c.fillStyle = 'rgba(4,6,10,0.2)'; c.fillRect(x0 + 3, top, w - 6, bot - top);
  c.fillStyle = grad(c, x0 + 3, 0, x1 - 3, 0, [[0, `rgba(${C.glow},0.05)`], [0.5, `rgba(${C.glow},0.2)`], [1, `rgba(${C.glow},0.05)`]]);
  c.fillRect(x0 + 3, top, w - 6, bot - top);
  const dir = g.lane ? -1 : 1;
  c.save(); c.beginPath(); c.rect(x0 + 3, top, w - 6, bot - top); c.clip();
  // Fat arrowheads nearly touching: 7 thick on a 9 step leaves a 2-unit gap.
  // One even stream rail to rail — no fade in or out at the ends; they slide
  // under the rails. 16 x 9 = a 144-unit loop covering the 137 of corridor
  // plus a head, so the stream wraps unseen.
  c.globalAlpha = 0.38;
  for (let i = 0; i < 16; i++) {
    const y = 8 - wrap(i * 9 + s.t * dir * -23, 144);
    const pts = chevron(cx, y, dir, 7, 8, 7);
    poly(c, pts.map(([px, py]) => [px, py + dir * 1.2]), `rgba(${C.glow},0.7)`);
    poly(c, pts, `rgb(${C.core})`);
  }
  c.globalAlpha = 1;
  c.restore();
  text(c, g.lane ? 'UP' : 'DOWN', cx - (g.lane ? 2.6 : 5.4), -142.5, 4.4, C.label, 'sans-serif', 'italic bold');
  if (hint) {
    const y = g.lane ? -30 : -105;
    glow(c, x1 + 17, y - 3, 20, `rgba(${C.glow},0.35)`);
    text(c, 'JUMP', x1 + 5, y, 7.5, C.label, 'sans-serif', 'italic bold');
  }
}
const stripJade = { ...paradeJade, id: 'strip-jade', letter: 'J', name: 'JADE, THE STRIP',
  note: 'Jade with white chevrons, the orange line gone: one translucent chrome strip whose leading edge is the jump point, '
    + 'set in its own gap between windows, fat arrowheads running with gravity.',
  chev: SPACE_CHEVRONS.clear, gate: gateStrip, gatePanes: true };
const stripAmber = { ...paradeAmber, id: 'strip-amber', letter: 'K', name: 'AMBER & TEAL, THE STRIP',
  note: 'The same strip on G, also with white chevrons.', chev: SPACE_CHEVRONS.clear, gate: gateStrip, gatePanes: true };
export const SPACE_STRIPS = [stripJade, stripAmber];
// L/M — the strips with everything alive outside (src/dev/space-life.js).
// Minimal since 13 Oct ("way overboard … only have things appear now and then
// and never everything at once"): the director in space-life.js brings on one
// thing at a time; the borealis and the mothership are the two big moments;
// the ground keeps a few sparse buildings. ALL_LIFE is still on the sheet.
const lifeJade = { ...stripJade, id: 'life-jade', letter: 'L', name: 'JADE, ALIVE OUTSIDE (MINIMAL)', life: DIRECTED_LIFE, director: true, titleStars: true,
  note: 'J, and now and then one thing outside — a shuttle, a hauler, skiffs, a tug, meteors, a dogfight, a satellite, cargo, the astronaut — never two at once, with empty stretches; little Asteroids-style fighters popping in here and there; the borealis (8–30%) is the big moment. No mothership; vehicles only on plateaus.' };
const lifeAmber = { ...stripAmber, id: 'life-amber', letter: 'M', name: 'AMBER & TEAL, ALIVE OUTSIDE (MINIMAL)', life: DIRECTED_LIFE, director: true, titleStars: true,
  note: 'K with the same director.' };
export const SPACE_LIFE_LOOKS = [lifeJade, lifeAmber];
// P1–P4 — L with plateaus (src/dev/space-plateaus.js). The base and mining kit
// moves off the ground line onto the flat tops, so the generic outposts layer
// is off; everything else outside is as L.
export const SPACE_PLATEAU_LOOKS = PLATEAU_VARIANTS.map(v => ({
  ...lifeJade,
  // The shipped level look (P5) takes full-height glass and the slim frame C
  // (Peter, 13 Oct); the other plateau candidates keep the old windows.
  ...(v.id === 'occasional' ? { tallGlass: true, frameK: 0.65 } : {}), id: `plateau-${v.id}`, letter: v.letter, name: `JADE, ${v.name}`, note: v.note,
  life: DIRECTED_LIFE.filter(id => id !== 'sparseOutposts'), director: true,
  land(c, s) {
    v.land(c, s, this, (RIDGE_SCHEMES[this.pal?.name] ?? RIDGE_SCHEMES.DUSK).ridges);
    invasionSky(c, s);   // the Martians fly in front of the mountains (Peter, 13 Oct)
    lifePass(c, s, this, 'ground');
    lifePass(c, s, this, 'front');
  },
}));

export const SPACE_LOOKS = { ...Object.fromEntries(SPACE_JADE_CHEVRONS.map(l => [l.id, l])), 'strip-jade': stripJade, 'strip-amber': stripAmber, 'life-jade': lifeJade, 'life-amber': lifeAmber, ...Object.fromEntries(SPACE_PLATEAU_LOOKS.map(l => [l.id, l])), polygon, airbrush, screenprint, hybrid, hybridgiant: hybridGiant, parade,
  'parade-amber': paradeAmber, 'parade-dawn': paradeDawn, 'parade-jade': paradeJade };
export const SPACE_LOOK_LIST = [polygon, airbrush, screenprint, hybrid, hybridGiant, parade, paradeAmber, paradeDawn, paradeJade];
export const SPACE_PARADE = PARADE;

// Windows laid out around the gates (Peter, 12 Oct: "perhaps the chevrons
// should be positioned between panes of glass for a tidier look"). Each run
// of wall between two strips is divided into the nearest whole number of
// ~102-unit bays, so every strip sits in its own gap with a 4-unit margin
// of wall either side; before the first gate and after the last the bays
// are the usual 102. Returns [screen x, width] per visible pane.
function gatePanes(gates, cam, view, fk = 1) {
  const strips = gates.map(g => [g.x - L.arrowLeftOffset, g.x + 8]).sort((a, b) => a[0] - b[0]);
  const out = [];
  const run = (a, b) => {
    const n = Math.max(1, Math.round((b - a) / PANE.step)), step = (b - a) / n;
    for (let i = 0; i < n; i++) {
      const x = a + i * step + 4 * fk;
      if (x + step > cam - 10 && x < cam + view + 10) out.push([x - cam, step - 8 * fk]);
    }
  };
  if (!strips.length) { run(Math.floor(cam / PANE.step) * PANE.step - PANE.step, Math.ceil((cam + view) / PANE.step) * PANE.step + PANE.step); return out; }
  const first = strips[0][0], last = strips.at(-1)[1];
  run(first - PANE.step * Math.max(1, Math.ceil((first - cam + PANE.step) / PANE.step)), first);
  for (let i = 0; i + 1 < strips.length; i++) run(strips[i][1], strips[i + 1][0]);
  run(last, last + PANE.step * Math.max(1, Math.ceil((cam + view + PANE.step - last) / PANE.step)));
  return out;
}

// Same call shape as drawGravityRoom, so the run swaps one for the other.
export function drawSpaceRoom(c, look, { cam, view, top, bottom, time, gates = GATES, hintGates = new Set(), progress = null, length = L.length, stage = 1, finishCam = null, noGates = false, holdT = 0, speed = 120, finishLine = null, portrait = false }) {
  // `length` is the stage's world length, so stage-timed things (the borealis,
  // shelves and buttes, the finish astronaut) land where the stage really is.
  // holdT: seconds since the finish began (the camera is parked), for things
  // that keep arriving after it has stopped.
  const s = { cam, view, top, bottom, t: time, length, stage, holdT, speed, portrait, finishLine, progress: progress ?? clamp01(cam / length) };
  // Where the camera stops at the finish, and the window centre nearest the
  // middle of the frame there: level 3's lone Martian comes to rest in it,
  // whole, for the finish hold (Peter, 13 Oct).
  const fc = finishCam ?? length * 0.97;
  s.finishProgress = fc / length;
  // He rests a screen before the finish (Peter, 13 Oct), so the hold shows
  // only the saucer: centred in a window at that earlier camera.
  const loneCam = fc - view / 0.6;
  s.loneProgress = loneCam / length;
  if (look.gatePanes) {
    const vis = view - 60, ps = gatePanes(gates, loneCam, view, frameOf(look)).filter(([x, w]) => x > 6 && x + w < vis - 6);
    const best = ps.reduce((b, p) => (!b || Math.abs(p[0] + p[1] / 2 - vis * 0.55) < Math.abs(b[0] + b[1] / 2 - vis * 0.55) ? p : b), null);
    s.loneRestX = best ? best[0] + best[1] / 2 : vis * 0.55;
    // The window just left of the finish line, where the camera parks: level 3's
    // Martian saucer comes to hover in it.
    const line = finishLine ?? vis * 0.73;
    const atFinish = gatePanes(gates, fc, view, frameOf(look)).filter(([x, w]) => x + w < line - 4);
    const left = atFinish.reduce((b, p) => (!b || p[0] > b[0] ? p : b), null);
    s.finishPaneX = left ? left[0] + left[1] / 2 : line - 60;
  }
  curRoom = s;
  if (look.tallGlass) {
    // Rail to rail, no wall margin — glass stops at the ceiling and the floor
    // (Peter, 13 Oct: no glass below your feet upside down)…
    s.glassTop = CEIL + GLASS_GAP; s.glassBottom = -GLASS_GAP;
    // …and the view outside scaled up to fill it ("so it's not a bunch of empty
    // sky"): planets near the top of the glass, ridges and plateaus bigger.
    s.sceneS = 1.3;
  }
  look.hull(c, s);
  const panes = look.gatePanes ? gatePanes(gates, cam, view, frameOf(look)) : [];
  if (!look.gatePanes) for (let i = Math.floor(cam / PANE.step) - 1; i * PANE.step < cam + view + PANE.step; i++) panes.push([i * PANE.step - cam + PANE.off, PANE.w]);
  s.panes = panes;   // screen [x, w] of each window, for things that must sit inside one
  c.save(); c.beginPath(); for (const [x, w] of panes) look.paneClip(c, x, w); c.clip();
  if (s.sceneS > 1) {
    // Everything outside drawn S times bigger about its own ground line (y −6,
    // where the plateaus and buttes stand), pinned to the bottom of the glass —
    // scaled about the floor, their feet rose clear of it and they floated
    // (Peter, 14 Oct). Every screen-space quantity divided through so
    // pane-anchored things still sit in their windows.
    const S = s.sceneS, G = VISTA_GROUND, B = s.glassBottom ?? 0, d = (v) => (v == null ? v : v / S), dy = (v) => (v == null ? v : (v - B) / S + G);
    // length too: stage-timed things travel (progress × length) in vista units,
    // and must cross the screen at the room's own speed.
    const sv = { ...s, length: s.length / S, view: s.view / S, cam: s.cam / S, top: dy(s.top), bottom: dy(s.bottom), finishLine: d(s.finishLine),
      loneRestX: d(s.loneRestX), finishPaneX: d(s.finishPaneX), panes: s.panes.map(([x, w]) => [x / S, w / S]), glassTop: dy(s.glassTop), glassBottom: dy(s.glassBottom) };
    c.translate(0, B); c.scale(S, S); c.translate(0, -G); look.vista(c, sv);
  } else look.vista(c, s);
  c.restore();
  for (const [x, w] of panes) look.pane(c, x, s, w);
  look.rails(c, s);
  // `noGates`: scenery only (the background video) — no gate strips or labels.
  if (noGates) return;
  SECTORS.forEach((wx, i) => { if (wx > cam - 30 && wx < cam + view + 30) look.sector(c, `SECTOR 0${i + 2}`, wx - cam - 15); });
  for (const g of gates) if (Math.abs(g.x - cam - view / 2) < view / 2 + 30) look.gate(c, g, s, hintGates.has(g.index));
}

// ---------------------------------------------------------------- lab sheet
// Three moments from the authored corridor, hero placed where the level puts
// him. Cameras are static; the scenery animates (chevrons, lamps, fly-bys).
export const SPACE_SHOTS = [
  { id: 'floor', name: 'On the floor, an UP arrow ahead', heroX: GATES[0].x - 120, lane: 0,
    note: 'The wrong rail (ceiling) is guarded by pop-spikes and saws; the first gate is coming.' },
  { id: 'ceiling', name: 'On the ceiling, after the flip', heroX: GATES[0].x + 80, lane: 1,
    note: 'Gate 1 behind; the floor is now the wrong rail. A mag-cargo crate waits ahead on the ceiling.' },
  { id: 'hazard', name: 'Back down, a drone ahead', heroX: GATES[1].x + 40, lane: 0,
    note: 'Just past a DOWN gate, with the drone that follows it and the ceiling rail armed.' },
];
let entities = null;
function corridorEntities() {
  if (entities) return entities;
  const list = HAZARDS.map(h => ({ ...h }));
  const spans = [{ start: 0, end: GATES[0].x - 38, lane: 1 },
    ...GATES.map((g, i) => ({ start: g.x + 52, end: (GATES[i + 1]?.x ?? L.length) - 38, lane: 1 - g.lane }))];
  for (const span of spans) for (let x = span.start; x + 15 < span.end; x += 24) {
    list.push({ x, lane: span.lane, type: Math.round(x / 24) % 3 ? 'popSpikes' : 'floorSaw' });
  }
  entities = list.map(h => {
    const ob = makeObstacle(h.type, h.x);
    if (h.lane) { ob.alt = L.corridor - ob.alt - ob.h; ob.gravityCeiling = L.corridor; }
    return ob;
  });
  return entities;
}
const SHOT_ZOOM = 1.6; // the playtest's landscape framing (ZOOM_NORMAL)
// `look` null paints today's playtest room. `w`/`h` are frame pixels; a tall
// tile is the portrait read, the corridor centred with the extra frame above
// and below — the roof and deck that landscape barely shows.
// `scenery` leaves out the hero and the lane's hazards: the hub's CRT screen and
// the song covers want the place, not a run (Peter, 13 Oct).
export function drawSpaceShot(ctx, t, look, shot, w = 480, h = 270, progress = null, { scenery = false, stage = 1, zoom = SHOT_ZOOM } = {}) {
  const z = zoom, pan = (h - 270) / 2, view = w / z;
  const cam = shot.heroX - PLAYER_X;
  const floor = screenYFor(GROUND_Y, z) + pan;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.fillStyle = look ? look.bg : '#0b1723'; ctx.fillRect(0, 0, w, h);
  applyWorld(ctx, z, pan);
  ctx.save(); ctx.translate(0, GROUND_Y);
  const opts = { cam, view: view + 60, top: -floor / z - 20, bottom: (h - floor) / z + 20, time: t, progress, stage };
  if (look) drawSpaceRoom(ctx, look, opts); else drawGravityRoom(ctx, opts);
  ctx.restore();
  if (scenery) { ctx.restore(); return; }
  for (const e of corridorEntities()) if (e.x + e.w > cam - 20 && e.x < cam + view + 20) drawWorldEntity(ctx, e, cam, t, null);
  const pose = { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 };
  ctx.save();
  if (shot.lane) { ctx.translate(0, 2 * GROUND_Y - L.corridor); ctx.scale(1, -1); }
  drawToon(ctx, 'lorenzo', pose, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  ctx.restore();
}
