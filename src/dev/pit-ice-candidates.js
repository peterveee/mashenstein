// Gallery-only ICE for the bottom of a hole. Bake-off, 24 Sep 2026 — Peter:
// "Lava in the pits, tar, and ice in pits". This sheet is the ice; lava/tar and
// spikes/gears are separate sheets.
//
// The control is what FROST FORTRESS ships today: BLACK SLUSH (game/pitFill.js,
// `slush`), drawn by calling the real drawPitFill. Everything else here follows
// that file's rules and none of them is up for negotiation on this sheet:
//
//   - THE SHAFT IS OPEN. The frost backdrop shows straight through the break;
//     nothing is painted across the open part of it above the material.
//   - The material's surface is PIT_FLOOR (0.32) of the 38u apron — 12u down.
//   - The camera at rest shows only the top 19u of the apron. So on the road,
//     standing still, a player sees at most SEVEN units of whatever is at the
//     bottom. Slush spends all of its art there. The candidates below are each an
//     answer to "what can ice put in the other twelve" — the LIP (y 0..12 at the
//     two cut edges, in view from the road), or a BREACH (above y = 0).
//
// Painter contract, the same as pitFill.js: a local box x 0..w, y 0 at the
// floor line down to y = d. A candidate that sets `breach` also paints above
// y = 0 (and just past the lips) and would need drawPitFill's clip opened to
// port; every other one ports as-is.
//
// Palette is the frost cabinet's own ice (the iceCrystals prop in
// sprites/props.js and FROST_SCENERY_PALETTE): a lit face, a cold face, a ridge
// line and a thin blue contour — facets are what make ice read as ice rather
// than as blue glass.
import { drawPitFill, PIT_FLOOR, SPIKE_TIPS, liquidSurfaceDepth } from '../game/pitFill.js';
import { GROUND_Y, ZOOM, VIEW_W, applyWorld } from '../engine/camera.js';
import { W, H } from '../engine/renderer.js';
import { makeObstacle } from '../game/entities.js';
import { PLAYER_X } from '../game/player.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';

const TAU = Math.PI * 2;

// The frost ice vocabulary.
const LIT = '#e4f6ff';
const COLD = '#a6d6f2';
const COLD_BACK = '#8cc0e2';
const EDGE = 'rgba(38,78,118,0.62)';
const RIDGE = 'rgba(70,120,160,0.55)';
const SNOW = '#f4faff';
const SNOW_SHADE = '#b9d6ea';
const WATER = '#0d2334';
const WATER_DEEP = '#081826';

// ------------------------------------------------------------------ helpers
function poly(c, fill, stroke, width, fn) {
  c.beginPath();
  fn(c);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function oval(c, x, y, rx, ry, fill, alpha = 1) {
  c.save();
  c.globalAlpha *= alpha;
  c.fillStyle = fill;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.15, rx), Math.max(0.1, ry), 0, 0, TAU);
  c.fill();
  c.restore();
}
// Deterministic hash, so a painter's jag is the same every frame.
function hash(i, s = 0) {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
// A four-point star glint, the iceCrystals prop's own.
function starGlint(c, x, y, k, alpha = 1) {
  if (k <= 0.05 || alpha <= 0) return;
  c.save();
  c.globalAlpha *= alpha;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(x, y - k); c.lineTo(x + k * 0.22, y - k * 0.22); c.lineTo(x + k, y);
  c.lineTo(x + k * 0.22, y + k * 0.22); c.lineTo(x, y + k); c.lineTo(x - k * 0.22, y + k * 0.22);
  c.lineTo(x - k, y); c.lineTo(x - k * 0.22, y - k * 0.22); c.closePath(); c.fill();
  c.restore();
}

// A soft puff: a radial wash squashed to an ellipse, no edge. Watercolor fog
// has no outline, and hard-edged ovals stacked up read as cotton wool.
function puff(c, x, y, rx, ry, color, alpha) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha *= alpha;
  c.translate(x, y);
  c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, rx, 0, TAU); c.fill();
  c.restore();
}

// The slush body — black water with a gentle swell — shared by the candidates
// that keep the shipped water and change what stands around it.
function water(c, w, d, t, top = WATER, amp = 0.01) {
  const dd = liquidSurfaceDepth(d);
  const surf = dd * PIT_FLOOR;
  poly(c, top, null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 8; i++) p.lineTo(w * (i / 8), surf + Math.sin(t * 1.1 + i * 1.2) * dd * amp);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  return surf;
}

// A small floe on the waterline: dark underside, pale top — the shipped
// slush floe, at a fixed size in world units rather than a fraction of w.
function smallFloe(c, x, surf, len, bob = 0) {
  const y = surf + bob;
  poly(c, '#2b5b74', null, 0, (p) => {
    p.moveTo(x, y + 0.6); p.lineTo(x + len, y + 0.2);
    p.lineTo(x + len * 0.88, y + 2.4); p.lineTo(x + len * 0.12, y + 2.6); p.closePath();
  });
  poly(c, '#cfe9f5', '#7ba8c0', 0.25, (p) => {
    p.moveTo(x, y + 0.6); p.lineTo(x + len * 0.94, y - 0.2);
    p.lineTo(x + len, y + 0.2); p.lineTo(x + 0.2, y + 1.1); p.closePath();
  });
}

// ONE icicle: a long narrow facet with the lit half on the left (the frost
// sun is low on the left, as on the crystal prop), a ridge down the middle
// and a thin contour. `len` world px from `y0` down to the tip.
function icicle(c, x, y0, half, len, lean = 0) {
  const tipX = x + lean, tipY = y0 + len;
  poly(c, '#7fb4d6', null, 0, (p) => {
    p.moveTo(x - half, y0); p.lineTo(tipX, tipY); p.lineTo(x + half, y0); p.closePath();
  });
  poly(c, LIT, null, 0, (p) => {
    p.moveTo(x - half, y0); p.lineTo(tipX, tipY); p.lineTo(x + lean * 0.2, y0); p.closePath();
  });
  poly(c, null, RIDGE, 0.2, (p) => { p.moveTo(x + lean * 0.2, y0); p.lineTo(tipX, tipY); });
  poly(c, null, EDGE, Math.max(0.28, half * 0.24), (p) => {
    p.moveTo(x - half, y0); p.lineTo(tipX, tipY); p.lineTo(x + half, y0);
  });
}

// ============================================================ A. NOW — SLUSH
function drawNow(c, w, d, t) {
  // THE SHIPPED PAINTER, not a copy. drawPitFill clips to the break and
  // translates to its own origin, so it is handed a 0,0 origin here.
  drawPitFill(c, 'slush', 0, 0, w, d, t);
}

// ======================================================== B. ICICLE FRINGE
// The LIP answer. Snow cornices curl over both cut edges and a fringe of
// icicles hangs from each — longest at the lip, shortening toward the middle,
// so the break reads as a MOUTH with teeth in it from the moment it is on
// screen. All of it lives in the top twelve units at the two edges, which is
// exactly the band slush leaves empty and exactly the band the road can see.
// The middle of the break stays open. A drip gathers on the longest icicle
// each side and falls into the slush.
function drawIcicles(c, w, d, t) {
  const surf = water(c, w, d, t);
  smallFloe(c, w * 0.4, surf, 10, Math.sin(t * 1.3) * 0.3);
  // The icicles' own light on the black water under each lip.
  oval(c, w * 0.1, surf + 1.8, 6, 0.8, '#9fd0ec', 0.4);
  oval(c, w * 0.9, surf + 1.8, 6, 0.8, '#9fd0ec', 0.4);
  // [distance from the lip, half-width at the root, length] — CHUNKY, because
  // a unit is two screen pixels at rest and anything under a unit and a half
  // wide reads as grass. Longest at the lip, shortening toward the middle.
  // The longest stops a unit short of the water (tip ~11.3 against a surface
  // at 12.2): an icicle dipping into the slush reads as a stake, not a drip.
  const FRINGE = [[2.2, 1.9, 9.4], [6.0, 1.5, 6.2], [9.4, 1.3, 7.8], [12.4, 1.05, 4.4], [14.8, 0.8, 2.8]];
  for (const side of [0, 1]) {
    const dir = side ? -1 : 1;
    const edge = side ? w : 0;
    // A glaze down the cut face: the ice the drips have built on the wall.
    poly(c, 'rgba(166,214,242,0.85)', EDGE, 0.25, (p) => {
      p.moveTo(edge, 1); p.lineTo(edge + dir * 1.6, 2);
      p.quadraticCurveTo(edge + dir * 0.8, surf * 0.6, edge + dir * 1.8, surf + 0.4);
      p.lineTo(edge, surf + 0.4);
    });
    FRINGE.forEach(([dx, half, len], i) => {
      const L = len + (hash(i, side) - 0.5) * 1.6;
      icicle(c, edge + dir * dx, 1.9, half, L, dir * -0.25);
    });
    // The drip on the second icicle (it has the drop to fall): gathers, swells, lets go, and rings the
    // water. Out of step side to side.
    const tipX = edge + dir * FRINGE[1][0] - dir * 0.25;
    const tipY = 1.9 + FRINGE[1][2] + (hash(1, side) - 0.5) * 1.6;
    const p = (t * 0.55 + side * 0.47) % 1;
    if (p < 0.6) {
      const r = 0.35 + 0.45 * (p / 0.6);
      oval(c, tipX, tipY + r * 0.5, r * 0.8, r, LIT, 1);
    } else if (p < 0.78) {
      const k = (p - 0.6) / 0.18;
      oval(c, tipX, tipY + (surf - tipY) * k * k, 0.55, 0.9, LIT, 1);
    } else {
      const k = (p - 0.78) / 0.22;
      c.save(); c.globalAlpha *= 0.85 * (1 - k);
      poly(c, null, '#cfe9f5', 0.4, (q) => q.ellipse(tipX, surf + 0.3, 0.8 + k * 4, 0.3 + k * 0.7, 0, 0, TAU));
      c.restore();
    }
    // The cornice: snow curling over the lip into the break, lit on top and
    // shaded under the curl. Drawn last so the icicles hang from it.
    poly(c, SNOW_SHADE, null, 0, (p) => {
      p.moveTo(edge, -0.3);
      p.quadraticCurveTo(edge + dir * 10.5, -0.9, edge + dir * 9.8, 1.8);
      p.quadraticCurveTo(edge + dir * 6, 3.8, edge, 3.4); p.closePath();
    });
    poly(c, SNOW, null, 0, (p) => {
      p.moveTo(edge, -0.3);
      p.quadraticCurveTo(edge + dir * 10.3, -1.0, edge + dir * 9.4, 1.2);
      p.quadraticCurveTo(edge + dir * 5.2, 1.7, edge, 1.8); p.closePath();
    });
    poly(c, null, 'rgba(60,92,124,0.5)', 0.3, (p) => {
      p.moveTo(edge, -0.3);
      p.quadraticCurveTo(edge + dir * 10.5, -0.9, edge + dir * 9.8, 1.8);
      p.quadraticCurveTo(edge + dir * 6, 3.8, edge, 3.4);
    });
  }
  // One glint running down the longest icicle, left lip then right.
  const g = (t * 0.4) % 2;
  if (g < 1) {
    const side = g < 0.5 ? 0 : 1;
    const k = (g % 0.5) / 0.5;
    const x = side ? w - FRINGE[0][0] + 0.4 : FRINGE[0][0] - 0.4;
    starGlint(c, x, 3 + k * 7, 1.8, Math.sin(k * Math.PI));
  }
}

// =========================================================== C. THIN ICE
// A frozen pool, seen edge-on: a glassy slab at the surface, black water under
// it, and the slab is FAILING. A crack races out along it on a slow clock
// with a white flash, the plates either side hinge down into a V at the break,
// black water wells up through it, and it heals over to crack again somewhere
// else. Four units of glass in three value steps with a white rim along the
// top, so the bottom of the frame is lit rather than black. The risk is plain:
// it says "this will not hold you" rather than "this will eat you", and a
// floor you can see can read as a floor.
function drawThinIce(c, w, d, t) {
  const dd = liquidSurfaceDepth(d);
  const surf = dd * PIT_FLOOR;
  const slab = 4;
  // Black water under the ice.
  poly(c, WATER_DEEP, null, 0, (p) => p.rect(0, surf + 1, w, d - surf - 1));
  // The crack cycle, 3.1 s: 0..0.12 the crack runs, ..0.65 open and sagging,
  // ..1 refreezing. Where it opens moves each cycle.
  const T = t * 0.32;
  const cyc = T % 1;
  const cx = w * (0.36 + 0.28 * hash(Math.floor(T), 3));
  const open = cyc < 0.12 ? cyc / 0.12 : cyc < 0.65 ? 1 : 1 - (cyc - 0.65) / 0.35;
  const gap = 2.4 * open;
  const sag = 2.2 * open;
  // Each plate is hinged at its wall and dips toward the crack.
  const plate = (x0, x1, hinge) => {
    const far = Math.abs(hinge - (hinge === 0 ? x1 : x0));
    const yAt = (x) => surf + sag * (Math.abs(x - hinge) / Math.max(1, far));
    const ya = yAt(x0), yb = yAt(x1);
    const quad = (k0, k1) => (p) => {
      p.moveTo(x0, ya + slab * k0); p.lineTo(x1, yb + slab * k0);
      p.lineTo(x1, yb + slab * k1); p.lineTo(x0, ya + slab * k1); p.closePath();
    };
    poly(c, '#5f97bb', null, 0, quad(0, 1));
    poly(c, '#8fc3e3', null, 0, quad(0, 0.55));
    poly(c, '#d4eefb', null, 0, quad(0, 0.2));
    // Trapped bubbles, strung in the glass.
    for (let i = 0; i < 6; i++) {
      const k = hash(i, x0 + 7);
      const bx = x0 + (x1 - x0) * k;
      const by = ya + (yb - ya) * k + slab * (0.4 + 0.45 * hash(i, 9));
      oval(c, bx, by, 0.45, 0.35, '#f4fbff', 0.8);
    }
    // Old healed cracks through the thickness.
    for (let i = 0; i < 2; i++) {
      const k = 0.25 + 0.5 * hash(i, x0 + 3);
      const x = x0 + (x1 - x0) * k;
      const y = ya + (yb - ya) * k;
      poly(c, null, 'rgba(255,255,255,0.75)', 0.3, (p) => {
        p.moveTo(x, y); p.lineTo(x + 0.9, y + slab * 0.35); p.lineTo(x - 0.4, y + slab * 0.7); p.lineTo(x + 0.4, y + slab);
      });
    }
    // The rim light along the top and a contour round the whole slab.
    poly(c, null, '#ffffff', 0.7, (p) => { p.moveTo(x0, ya - 0.1); p.lineTo(x1, yb - 0.1); });
    poly(c, null, EDGE, 0.3, quad(0, 1));
  };
  plate(0, cx - gap / 2, 0);
  plate(cx + gap / 2, w, w);
  // Black water welling up through the crack and over the plates' lips.
  if (gap > 0.2) {
    poly(c, WATER, null, 0, (p) => {
      p.moveTo(cx - gap / 2 - 1.5 * open, surf + sag - 0.1);
      p.quadraticCurveTo(cx, surf + sag - 0.9 * open, cx + gap / 2 + 1.5 * open, surf + sag - 0.1);
      p.lineTo(cx + gap / 2, surf + sag + slab); p.lineTo(cx - gap / 2, surf + sag + slab); p.closePath();
    });
  }
  // The crack itself, while it runs: a white fracture racing out along the
  // top of the slab both ways from the break, with a flash where it started.
  if (cyc < 0.28) {
    const k = Math.min(1, cyc / 0.12);
    c.save();
    c.globalAlpha *= cyc < 0.12 ? 1 : 1 - (cyc - 0.12) / 0.16;
    for (const dir of [-1, 1]) {
      poly(c, null, '#ffffff', 0.55, (p) => {
        p.moveTo(cx, surf + sag + 0.4);
        const reach = (dir < 0 ? cx : w - cx) * k;
        for (let i = 1; i <= 5; i++) {
          p.lineTo(cx + dir * reach * (i / 5), surf + sag * (1 - i / 5) + 0.4 + (i % 2 ? 1.6 : 0.4));
        }
      });
    }
    starGlint(c, cx, surf + sag, 3.2 * (1 - k * 0.5), 1);
    c.restore();
  }
}

// =========================================================== D. ICE FANGS
// The HARD answer: clusters of faceted crystal stood up from the floor of the
// break — the iceCrystals prop grown to pit scale, so the lane's ice hazard and
// the pit's are one vocabulary. The crowns reach to SPIKE_TIPS, the height the
// spike bed stops a hero at, so this would be a hard fill; most of every
// shard is in the band the road can see. A few tips are snapped, a snow drift
// buries the roots below the fold, and one star glint hops crown to crown.
// The background shows between the clusters.
function drawFangs(c, w, d, t) {
  const dd = liquidSurfaceDepth(d);
  const tipTall = dd * SPIKE_TIPS;
  const foot = dd * 0.8;
  // CLUSTERS, not a row. A row of evenly spaced shards is a picket fence (the
  // first cut read exactly so); ice grows as druses — a fan of crystals out of
  // one root, the tallest in the middle leaning least, the outer ones leaning
  // away. Fixed pitch in world px, so a crossing gets more clusters rather
  // than wider ones.
  const pitch = 19;
  const n = Math.max(2, Math.round(w / pitch));
  const step = w / n;
  const shards = [];
  for (let ci = 0; ci < n; ci++) {
    const rootX = step * (ci + 0.5) + (hash(ci, 11) - 0.5) * 2;
    const tallest = tipTall + hash(ci, 12) * 2.5;
    // [offset of the root, lean of the tip, extra depth of the tip, half-width]
    const fan = [
      [-4.2, -5.5, 7.5 + hash(ci, 13) * 2, 1.5],
      [4.0, 5.0, 6 + hash(ci, 14) * 2.5, 1.6],
      [-1.6, -1.6, 2.2, 1.9],
      [1.4, 1.2, 0, 2.3],
    ];
    fan.forEach(([dx, lean, drop, half], k) => {
      shards.push({ x: rootX + dx, tipY: tallest + drop, half, lean, back: k < 2, broken: hash(ci * 4 + k, 15) < 0.22 && k < 3 });
    });
  }
  const draw = (s) => {
    const { x, half, lean, back } = s;
    const tipX = x + lean;
    const tipY = s.tipY;
    const shoulderY = tipY + half * 1.6;
    const sx = lean * 0.75;
    const outline = (p) => {
      p.moveTo(x - half, foot);
      p.lineTo(x - half * 0.85 + sx, shoulderY);
      if (s.broken) {
        // A snapped tip: a flat-ish jagged break instead of a point.
        p.lineTo(tipX - half * 0.3, tipY + half * 0.9);
        p.lineTo(tipX + half * 0.1, tipY + half * 1.3);
        p.lineTo(tipX + half * 0.45, tipY + half * 0.7);
      } else {
        p.lineTo(tipX, tipY);
      }
      p.lineTo(x + half * 0.85 + sx, shoulderY);
      p.lineTo(x + half, foot);
      p.closePath();
    };
    poly(c, back ? COLD_BACK : COLD, null, 0, outline);
    poly(c, back ? '#c4e4f6' : LIT, null, 0, (p) => {
      p.moveTo(x - half, foot);
      p.lineTo(x - half * 0.85 + sx, shoulderY);
      p.lineTo(s.broken ? tipX - half * 0.3 : tipX, s.broken ? tipY + half * 0.9 : tipY);
      p.lineTo(x + sx * 0.5, foot);
      p.closePath();
    });
    poly(c, 'rgba(255,255,255,0.85)', null, 0, (p) => {
      p.moveTo(x - half * 0.55 + sx * 0.6, foot - 2);
      p.lineTo(x - half * 0.5 + sx * 0.9, shoulderY + 1);
      p.lineTo(x - half * 0.25 + sx * 0.9, shoulderY + 1.4);
      p.lineTo(x - half * 0.25 + sx * 0.6, foot - 2);
      p.closePath();
    });
    if (!s.broken) poly(c, null, RIDGE, 0.25, (p) => { p.moveTo(tipX, tipY); p.lineTo(x + sx * 0.5, foot); });
    poly(c, null, EDGE, 0.35, outline);
  };
  shards.filter((s) => s.back).forEach(draw);
  shards.filter((s) => !s.back).forEach(draw);
  // The drift the clusters grow from — below the fold at rest; seen on a jump.
  poly(c, SNOW, 'rgba(70,98,126,0.4)', 0.3, (p) => {
    p.moveTo(0, d);
    p.lineTo(0, foot - 1);
    for (let i = 0; i <= 6; i++) p.quadraticCurveTo(w * ((i - 0.5) / 6), foot - 4, w * (i / 6), foot - 1 - (i % 2) * 1.2);
    p.lineTo(w, d); p.closePath();
  });
  // One star glint hops from crown to crown.
  const crowns = shards.filter((s) => !s.back && !s.broken);
  const g = t * 1.1;
  const i = Math.floor(g) % (crowns.length + 2);
  if (i < crowns.length) {
    const k = g % 1;
    starGlint(c, crowns[i].x + crowns[i].lean, crowns[i].tipY + 0.5, 2.2 * Math.sin(k * Math.PI), 1);
  }
}

// ======================================================== E. FREEZING FOG
// The BREACH answer. The slush stays, and the cold comes off it as a low fog
// that fills the bottom of the break and spills over both lips onto the road,
// curling back on itself — the one ice idea that shows above the floor line,
// so the hole is announced before the mouth is under the hero's feet. Blue-grey
// cores under white tops, so it holds against a pale frost sky; slow, because
// the cabinet's idiom is slow and fast vapour reads as steam.
function drawFog(c, w, d, t) {
  const dd = liquidSurfaceDepth(d);
  const surf = water(c, w, d, t);
  smallFloe(c, ((t * 1.6) % (w + 12)) - 10, surf, 11, Math.sin(t * 1.4) * 0.25);
  smallFloe(c, ((t * 1.6 + w * 0.55) % (w + 12)) - 10, surf, 8, Math.sin(t * 1.4 + 2) * 0.25);
  // The pooled bank over the water.
  for (let i = 0; i < 7; i++) {
    const x = ((i / 6) * w + t * 2.2 * (i % 2 ? 1 : -0.6)) % (w + 10) - 5;
    const y = surf - 2 - (i % 3) * 1.4;
    const r = 5 + (i % 3) * 1.6;
    puff(c, x, y + 1.3, r * 1.2, r * 0.45, 'rgba(110,146,178,1)', 0.35);
    puff(c, x, y, r * 1.3, r * 0.5, 'rgba(255,255,255,1)', 0.62);
  }
  // Two curls climbing out over the lips. Each is a chain of puffs along a
  // hook: up the cut face, over the lip, and back down onto the road,
  // growing and fading as it goes. Offset in phase side to side.
  for (const side of [0, 1]) {
    const dir = side ? 1 : -1;       // outward, onto the road
    const edge = side ? w : 0;
    for (let j = 0; j < 5; j++) {
      const p = (t * 0.18 + j / 5 + side * 0.37) % 1;
      // Hook path: from inside the break at the water, up the wall, over
      // the lip (peak ~5 above), and out onto the road.
      const a = p * Math.PI * 1.05;
      const x = edge - dir * 3 + dir * (1 - Math.cos(a)) * 5.5;
      const y = surf - 2 - Math.sin(a) * (surf + 3) + p * p * 6;
      const r = 1.8 + p * 3.2;
      const alpha = Math.sin(p * Math.PI) * 0.55;
      puff(c, x, y + r * 0.4, r * 1.2, r * 0.6, 'rgba(110,146,178,1)', alpha * 0.55);
      puff(c, x, y, r * 1.3, r * 0.7, 'rgba(255,255,255,1)', alpha * 1.2);
    }
  }
  // A skim of frost on the lip where the fog settles.
  for (const side of [0, 1]) {
    const edge = side ? w : 0;
    puff(c, edge, 0.2, 4.5, 1.0, 'rgba(255,255,255,1)', 0.7);
  }
}

// ========================================================= F. MOON FLOES
// The material itself, made worth the seven units the road can see. Two big
// floes ride the black water, bobbing and rocking out of step, and — the new
// thing — the ice below the waterline is DRAWN: nine tenths of a floe is under
// the surface as a pale teal ghost, so the dark band at the bottom of the
// frame is full of shapes instead of being one value. A broken column of
// moonlight shimmers on the water between them, the one luminous mark in the
// hole.
function drawFloes(c, w, d, t) {
  const dd = liquidSurfaceDepth(d);
  const surf = dd * PIT_FLOOR;
  // Water: two value steps, deeper below.
  poly(c, WATER, null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 8; i++) p.lineTo(w * (i / 8), surf + Math.sin(t * 1.2 + i * 1.3) * 0.25);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  poly(c, WATER_DEEP, null, 0, (p) => p.rect(0, surf + dd * 0.22, w, d - surf - dd * 0.22));
  // Moon column: horizontal dashes that shimmer, widest at the surface.
  const mx = w * 0.5;
  c.save();
  const base = c.globalAlpha;
  // Broken glints rather than bars: two or three short dashes per row, each
  // winking on its own clock, the row narrowing with depth. A stack of whole
  // bars read as a symbol (an equals sign), not as light on moving water.
  for (let i = 0; i < 6; i++) {
    const y = surf + 0.7 + i * 1.2;
    const spread = 3.6 - i * 0.45;
    for (let j = 0; j < 3; j++) {
      const k = 0.5 + 0.5 * Math.sin(t * 3.4 + i * 1.9 + j * 2.3);
      if (k < 0.35) continue;
      const x = mx + (j - 1) * spread * 0.8 + Math.sin(t * 1.7 + i + j) * 0.7;
      c.globalAlpha = base * (0.9 - i * 0.12) * k;
      c.fillStyle = i < 2 ? '#fffbe8' : '#d8ecf8';
      c.fillRect(x - spread * 0.28, y, spread * 0.56, 0.5);
    }
  }
  c.restore();
  // The floes.
  const floe = (cx, len, phase) => {
    const bob = Math.sin(t * 1.3 + phase) * 0.55;
    const tilt = Math.sin(t * 0.9 + phase * 1.7) * 0.09;
    c.save();
    c.translate(cx, surf + bob);
    c.rotate(tilt);
    // The ghost under the water: a big faceted keel, translucent teal.
    poly(c, 'rgba(111,167,200,0.42)', 'rgba(166,214,242,0.35)', 0.25, (p) => {
      p.moveTo(-len * 0.5, 0.2);
      p.lineTo(-len * 0.58, 3.5); p.lineTo(-len * 0.3, 8.5); p.lineTo(len * 0.1, 10.5);
      p.lineTo(len * 0.45, 7.5); p.lineTo(len * 0.55, 2.5); p.lineTo(len * 0.5, 0.2); p.closePath();
    });
    // A facet line inside the keel.
    poly(c, null, 'rgba(200,236,255,0.35)', 0.22, (p) => {
      p.moveTo(-len * 0.3, 0.3); p.lineTo(-len * 0.05, 6); p.lineTo(len * 0.45, 7.5);
    });
    // Above the water: cold face, lit top, snow cap.
    poly(c, COLD, null, 0, (p) => {
      p.moveTo(-len * 0.5, 0.25); p.lineTo(-len * 0.44, -1.8); p.lineTo(len * 0.38, -2.2);
      p.lineTo(len * 0.5, 0.25); p.closePath();
    });
    poly(c, LIT, null, 0, (p) => {
      p.moveTo(-len * 0.5, 0.25); p.lineTo(-len * 0.44, -1.8); p.lineTo(-len * 0.05, -2.0);
      p.lineTo(-len * 0.12, 0.25); p.closePath();
    });
    poly(c, SNOW, null, 0, (p) => {
      p.moveTo(-len * 0.46, -1.6); p.quadraticCurveTo(-len * 0.1, -3.2, len * 0.36, -2.1);
      p.lineTo(len * 0.36, -1.7); p.lineTo(-len * 0.44, -1.3); p.closePath();
    });
    poly(c, null, EDGE, 0.25, (p) => {
      p.moveTo(-len * 0.5, 0.25); p.lineTo(-len * 0.44, -1.8);
      p.quadraticCurveTo(-len * 0.1, -3.2, len * 0.38, -2.2); p.lineTo(len * 0.5, 0.25);
    });
    // Dark waterline under it.
    poly(c, null, '#061420', 0.45, (p) => { p.moveTo(-len * 0.5, 0.35); p.lineTo(len * 0.5, 0.35); });
    c.restore();
  };
  floe(w * 0.2, 17, 0);
  floe(w * 0.8, 14, 2.3);
  // A lap of white where the water meets each floe.
  for (const [x, ph] of [[w * 0.2 + 9, 0], [w * 0.8 - 8, 2.3]]) {
    const k = 0.5 + 0.5 * Math.sin(t * 2.6 + ph);
    oval(c, x, surf + 0.4, 1.2 + k, 0.35, '#cfe9f5', 0.6);
  }
}

// ======================================================== G. FROZEN FALLS
// The combination the others argue for: the icicle LIP of B, and under it the
// cut faces sheathed in thick blue ice that runs all the way down into the
// water as a frozen cascade, with the slush at the bottom caught in a ring of
// ice where the falls meet it. The two walls of the break become two pale
// pillars of ice — a strong, still shape at the edges that frames the open
// middle rather than filling it — and the drips keep it alive.
function drawFalls(c, w, d, t) {
  const surf = water(c, w, d, t);
  for (const side of [0, 1]) {
    const dir = side ? -1 : 1;
    const edge = side ? w : 0;
    const X = (u) => edge + dir * u;
    // The sheet's front edge, from the lip to the water: it bellies out in
    // two lobes and splays into a foot where it meets the slush.
    const front = (p) => {
      p.lineTo(X(5.2), 0.8);
      p.bezierCurveTo(X(6.6), 3, X(4.6), 5.5, X(5.4), 7.5);
      p.bezierCurveTo(X(6.4), 9.5, X(5.6), surf - 1.2, X(8.2), surf + 0.6);
    };
    const sheet = (p) => { p.moveTo(edge, 0); front(p); p.lineTo(edge, surf + 0.6); p.closePath(); };
    // Cold body, then the lit left half of it (the light is from the left, so
    // the right-hand wall's sheet is lit on its OUTER face and reads darker).
    poly(c, side ? '#7fb4d6' : COLD, null, 0, sheet);
    poly(c, side ? COLD : LIT, null, 0, (p) => {
      p.moveTo(edge, 0); p.lineTo(X(2.8), 0.8);
      p.bezierCurveTo(X(3.6), 4, X(2.4), 8, X(3.6), surf + 0.6);
      p.lineTo(edge, surf + 0.6); p.closePath();
    });
    // Vertical runs down the front — frozen streams.
    for (let k = 0; k < 3; k++) {
      const x = 1.2 + k * 1.5;
      poly(c, null, k === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)', 0.45, (p) => {
        p.moveTo(X(x), 1.4 + k * 0.8);
        p.quadraticCurveTo(X(x + 0.8), surf * 0.5, X(x + 0.3 + k * 0.4), surf - 0.6);
      });
    }
    poly(c, null, EDGE, 0.35, (p) => { p.moveTo(edge, 0); front(p); });
    // The collar where the falls meet the slush: a shelf of ice on the water.
    poly(c, LIT, EDGE, 0.3, (p) => {
      p.moveTo(edge, surf - 0.2);
      p.lineTo(X(11), surf + 0.2);
      p.lineTo(X(10.2), surf + 1.8);
      p.lineTo(edge, surf + 2.1); p.closePath();
    });
    // Icicles off the front of the sheet, shorter than B's.
    const FRINGE = [[7.2, 1.1, 6.5], [9.6, 0.9, 3.8], [11.4, 0.7, 2.4]];
    FRINGE.forEach(([dx, half, len], i) => {
      icicle(c, X(dx), 0.8, half, len + (hash(i, side + 5) - 0.5), dir * -0.2);
    });
    // Snow cap along the lip.
    poly(c, SNOW, 'rgba(60,92,124,0.5)', 0.3, (p) => {
      p.moveTo(edge, -0.3);
      p.quadraticCurveTo(X(7), -0.9, X(12.6), 0.5);
      p.quadraticCurveTo(X(6), 2.2, edge, 1.8); p.closePath();
    });
    // Drip from the longest icicle.
    const tipX = X(7.2) - dir * 0.2;
    const tipY = 0.8 + 6.5 + (hash(0, side + 5) - 0.5);
    const p = (t * 0.6 + side * 0.5) % 1;
    if (p < 0.55) {
      const r = 0.35 + 0.4 * (p / 0.55);
      oval(c, tipX, tipY + r * 0.5, r * 0.8, r, LIT, 1);
    } else if (p < 0.72) {
      const k = (p - 0.55) / 0.17;
      oval(c, tipX, tipY + (surf - tipY) * k * k, 0.5, 0.85, LIT, 1);
    } else {
      const k = (p - 0.72) / 0.28;
      c.save(); c.globalAlpha *= 0.85 * (1 - k);
      poly(c, null, '#cfe9f5', 0.4, (q) => q.ellipse(tipX, surf + 0.3, 0.8 + k * 3.5, 0.3 + k * 0.6, 0, 0, TAU));
      c.restore();
    }
  }
  // The glint slides down one sheet, then the other.
  const g = (t * 0.3) % 2;
  if (g < 1) {
    const side = g < 0.5 ? 0 : 1;
    const k = (g % 0.5) / 0.5;
    starGlint(c, side ? w - 2.6 : 2.6, 1.5 + k * (surf - 3), 1.8, Math.sin(k * Math.PI));
  }
}

const DRAW = {
  now: drawNow, icicles: drawIcicles, thinIce: drawThinIce, fangs: drawFangs,
  fog: drawFog, floes: drawFloes, falls: drawFalls,
};

// `breach` is how far above y = 0 (and past the lips) a painter reaches; zero
// ports into drawPitFill's clip unchanged. `read` is what the road sees.
export const PIT_ICE_CANDIDATES = [
  { id: 'now', letter: 'A', name: 'NOW — BLACK SLUSH', breach: 0,
    read: 'the bottom 7u only — black water and pale floes',
    note: 'What FROST FORTRESS ships, drawn by the real drawPitFill(\'slush\'). Everything it has is below 12u, so from the road it is a dark stripe at the very bottom of the frame and the top of the break is pale sky.' },
  { id: 'icicles', letter: 'B', name: 'ICICLE FRINGE', breach: 0,
    read: 'LIP — snow cornices and a fringe of icicles at both cut edges',
    note: 'Snow curls over both lips and icicles hang from them, longest at the edge, with a drip falling into the slush. It spends the top twelve units slush leaves empty, at the two edges only, so the break reads as a mouth with teeth the moment it is on screen and the middle stays open.' },
  { id: 'thinIce', letter: 'C', name: 'THIN ICE', breach: 0,
    read: 'a lit glassy slab at 12u, cracking open on a slow clock',
    note: 'A frozen pool seen edge-on — a glassy slab with trapped bubbles and a bright rim — that keeps cracking, sagging into the black water and healing. Adds a cold glow a third of the way up the break; the risk is that a floor you can see reads as a floor.' },
  { id: 'fangs', letter: 'D', name: 'ICE FANGS', breach: 0,
    read: 'SILHOUETTE — faceted shards reach to 5u under the lip',
    note: 'The hard fill: the iceCrystals prop\'s facets as a bed of shards standing up from a snow drift, tips at SPIKE_TIPS so a hero would stop on them. Most of every shard is in the band the road can see; it is the spike bed\'s idea in the cabinet\'s own material.' },
  { id: 'fog', letter: 'E', name: 'FREEZING FOG', breach: 9,
    read: 'BREACH — fog pools on the slush and curls out over both lips',
    note: 'Slush, with a slow cold fog banked on it that climbs the cut faces and spills over onto the road. The only ice idea that shows above the floor line, so it warns before the mouth arrives — but needs drawPitFill\'s clip opened by 9u to port.' },
  { id: 'floes', letter: 'F', name: 'MOON FLOES', breach: 0,
    read: 'the bottom 7u, made busy — big rocking floes, keels under water, a moon column',
    note: 'Keeps slush\'s place and makes it worth looking at: two big floes bob and rock out of step, their underwater keels drawn as pale teal ghosts, and a shimmering column of moonlight sits between them. Still below 12u, so it is the fairest test of whether the material alone can carry the pit.' },
  { id: 'falls', letter: 'G', name: 'FROZEN FALLS', breach: 0,
    read: 'LIP — both cut faces sheathed in ice down to the water, icicles off the front',
    note: 'The icicle lip grown into two frozen cascades that run from the road down into the slush, collared where they meet it. Two pale pillars frame the open middle, so the break is shaped from lip to water in the band the road can see, and the drips keep it moving.' },
];

/**
 * One ice candidate into the pit box: x 0..w at y = 0 (the floor line), down to
 * y = d. Clipped the way drawPitFill clips, opened upward and outward by the
 * candidate's `breach` so a fog that crosses the floor line is not eaten.
 */
export function drawPitIceCandidate(ctx, id, w, d, t = 0) {
  const draw = DRAW[id];
  const cand = PIT_ICE_CANDIDATES.find((c) => c.id === id);
  if (!draw || w <= 0 || d <= 0) return;
  ctx.save();
  if (id !== 'now') {
    const b = cand?.breach || 0;
    ctx.beginPath();
    ctx.rect(0, 0, w, d);
    if (b > 0) ctx.rect(-b, -b, w + b * 2, b);
    ctx.clip();
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, w, d, t);
  ctx.restore();
}

// ------------------------------------------------------------ the scenes
// Shared by the gallery section and the work/local harness so review sees one
// picture. The shipped watercolor FROST scene at real game scale: pack.bg,
// the world camera, pack.ground with a real 56u `gap` obstacle in it, Lorenzo
// at his 24u. For the control the gap carries no fill of its own, so the
// cabinet's slush is painted by the pack exactly as in a run; for a candidate
// the gap is marked `fill: 'none'` (drawPitFills skips it) and the candidate
// painter goes into the same box.
const GAP_AHEAD = 44;            // world px from the hero to the near lip

function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

/**
 * The whole 480x270 frame. `stage` is the frost stage (1 day, 2 low sun,
 * 3 dusk); `close` > 1 magnifies the frame about the pit for the close-up.
 */
export function drawPitIceScene(ctx, t, id, cab, pack, { stage = 2, close = 1, fw = W, fh = H } = {}) {
  const camX = 1200;
  const scene = { stageIndex: stage };
  ctx.save();
  if (close > 1) {
    // The pit's mouth centred across the tile, and the frame's bottom edge on
    // the tile's bottom edge — the whole visible apron, and the road above it.
    const cx = (PLAYER_X + GAP_AHEAD + 28) * ZOOM;
    ctx.translate(fw / 2 - cx * close, fh - H * close);
    ctx.scale(close, close);
  }
  pack.bg(ctx, t, camX, cab, 1000, scene, 0, scene);
  const gap = makeObstacle('gap', camX + PLAYER_X + GAP_AHEAD);
  if (id !== 'now') gap.fill = 'none';
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, cab, [gap], [], t, VIEW_W);
  if (id !== 'now') {
    ctx.save();
    // At the pack's own ground alpha: watercolor lays its road down at 0.85
    // and drawPitFills runs inside that, so the shipped slush is painted at
    // 0.85 too. A candidate at full strength would win on opacity alone.
    ctx.globalAlpha = pack.name === 'watercolor' ? 0.85 : 1;
    ctx.translate(gap.x - camX, GROUND_Y);
    drawPitIceCandidate(ctx, id, gap.w, H - GROUND_Y, t + gap.x * 0.013);
    ctx.restore();
  }
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  if (pack.post) pack.post(ctx, t);
  if (pack.weather) pack.weather(ctx, t);
  ctx.restore();
}

/**
 * The previous round's study tile, in WORLD units (252 x 94; the caller scales
 * by the camera zoom): the LANE read on the left with the dashed REST line —
 * the 19u of apron the camera shows at rest — and the DEEP study on the right,
 * the whole 38u shaft at 1.4x, in frost colours.
 */
export const PIT_ICE_STUDY = { w: 252, h: 94 };
export function drawPitIceStudy(ctx, t, id, cab) {
  const TW = 252, TH = 94, GY = 56, APRON = 38, REST = 19, PW = 56, PX = 66, DX = 158, DS = 1.4;
  const sky0 = cab.sky[0], sky1 = cab.sky[1];
  ctx.fillStyle = sky0; ctx.fillRect(0, 0, TW, TH);
  ctx.fillStyle = sky1; ctx.fillRect(0, GY * 0.5, TW, TH - GY * 0.5);
  ctx.fillStyle = cab.far;
  ctx.beginPath(); ctx.moveTo(0, GY * 0.7);
  ctx.quadraticCurveTo(TW * 0.14, GY * 0.46, TW * 0.3, GY * 0.72);
  ctx.quadraticCurveTo(TW * 0.5, GY * 0.5, TW * 0.68, GY * 0.71);
  ctx.quadraticCurveTo(TW * 0.86, GY * 0.54, TW, GY * 0.66);
  ctx.lineTo(TW, TH); ctx.lineTo(0, TH); ctx.closePath(); ctx.fill();
  for (const [a, b] of [[0, PX], [PX + PW, 150]]) {
    ctx.fillStyle = cab.groundDark; ctx.fillRect(a, GY, b - a, APRON);
    ctx.fillStyle = cab.ground; ctx.fillRect(a, GY, b - a, 2);
  }
  ctx.save(); ctx.translate(PX, GY);
  ctx.beginPath(); ctx.rect(-PX, -GY, 150, GY + APRON); ctx.clip();
  drawPitIceCandidate(ctx, id, PW, APRON, t);
  ctx.restore();
  drawToon(ctx, 'lorenzo', heroPose(t), 22, GY, 24);
  ctx.save();
  ctx.strokeStyle = 'rgba(20,40,70,.55)'; ctx.lineWidth = 0.4;
  ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.moveTo(PX - 6, GY + REST); ctx.lineTo(PX + PW + 6, GY + REST); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#0e0f16'; ctx.fillRect(150, 0, 5, TH);
  const dw = PW * DS, dd = APRON * DS;
  const dy = TH - 8 - dd;
  ctx.save(); ctx.translate(DX, dy);
  ctx.beginPath(); ctx.rect(-10, -12, dw + 24, dd + 12); ctx.clip();
  ctx.fillStyle = cab.far; ctx.fillRect(-10, -12, dw + 24, dd + 12);
  ctx.fillStyle = cab.groundDark;
  ctx.fillRect(-10, 0, 10, dd); ctx.fillRect(dw, 0, 14, dd);
  ctx.fillStyle = cab.ground;
  ctx.fillRect(-10, 0, 10, 2.4); ctx.fillRect(dw, 0, 14, 2.4);
  // The candidate at 1.4x, so its world-unit details scale with the box.
  ctx.save(); ctx.scale(DS, DS);
  drawPitIceCandidate(ctx, id, PW, APRON, t);
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = 'rgba(20,30,50,.7)';
  ctx.font = '4px ui-monospace, monospace'; ctx.textAlign = 'left';
  ctx.fillText(`LANE  ${PW}x${APRON}u`, 4, 7);
  ctx.fillText('REST', PX + PW + 8, GY + REST + 1.5);
  ctx.fillText(`DEEP ${DS}x`, DX, dy - 4);
}
