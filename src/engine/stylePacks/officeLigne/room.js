import { studyHead, workerHead } from './peopleHeads.js';
// Corporate Kombat: LIGNE ’89 room painter. Shared with the preserved bake-off.
import { box, W, line, LW, YH, VPX, xOf, pen, rbox, LWF, circ, poly, ell, DWALL, fOfD, yOfF, hash, M89, neon, fs, TAU, LWM, lines, grid, letters, squiggle, topRound, eggPath, confetti, copies, PAL } from './line.js';
import { MID_BASE, WALL_BASE, LANE_TOP, FACTORS } from '../officeClimb.js';

function ceiling(ctx, f, P) {
  const cy = f.ceilingY;
  const top = f.roomTop ?? -2;
  const left = f.coverage?.left ?? 0;
  if (f.floor === 'lobby') {
    box(ctx, left - 2, top, f.W - left + 4, cy - top, P.ceil);
    line(ctx, -2, cy - 0.3, f.W + 2, cy - 0.3, P.ink, LW);
    return;
  }
  if (f.floor === 'exec') {
    box(ctx, left - 2, top, f.W - left + 4, cy - top, P.ceil);
    box(ctx, -2, cy - 4, f.W + 4, 4, P.ceilDk, P.ink, LW);
    // the ceiling plane above it, ruled toward the vanishing point like floor 23's grid, so the
    // downlights have something to be set into
    {
      const S = f.floorPlane.shiftBottom, hc = (YH - cy) / FACTORS.wall;
      const fy = (y) => (YH - y) / hc, f0 = fy(cy - 4), f1 = fy(top), T = 96;
      const uA = S + VPX + (left - 20 - VPX) / f0, uB = S + VPX + (f.W + 20 - VPX) / f0;
      ctx.beginPath();
      for (let U = Math.floor(uA / T) * T; U < uB; U += T) { ctx.moveTo(xOf(U, S, f0), cy - 4); ctx.lineTo(xOf(U, S, f1), top); }
      pen(ctx, 'rgba(255,190,226,0.1)', 0.5);
      ctx.stroke();
    }
    return;
  }
  // floor 23: the suspended grid, ruled toward the vanishing point
  box(ctx, left - 2, top, f.W - left + 4, cy - top, P.ceil);
  const S = f.floorPlane.shiftBottom;
  const hc = (YH - cy) / FACTORS.wall;
  const fy = (y) => (YH - y) / hc;
  const f0 = fy(cy);
  const gridTop = f.roomTop ?? 0;
  const f1 = fy(gridTop);
  ctx.beginPath();
  const T = 80;
  const uA = S + VPX + (-20 - VPX) / f0;
  const uB = S + VPX + (f.W + 20 - VPX) / f0;
  for (let U = Math.floor(uA / T) * T; U < uB; U += T) {
    ctx.moveTo(xOf(U, S, f0), cy);
    ctx.lineTo(xOf(U, S, f1), gridTop);
  }
  for (const y of [cy - 9, cy - 21]) { ctx.moveTo(-2, y); ctx.lineTo(f.W + 2, y); }
  pen(ctx, P.ceilLine, 0.6);
  ctx.stroke();
  // The strip lights are ceiling tiles themselves: every third tile of the second row is a
  // lit diffuser panel, so the lights scroll and converge with the grid.
  const quad = (u0, u1, y0, y1) => [xOf(u0, S, fy(y0)), y0, xOf(u1, S, fy(y0)), y0, xOf(u1, S, fy(y1)), y1, xOf(u0, S, fy(y1)), y1];
  for (let U = Math.floor(uA / T) * T - T; U < uB + T; U += T) {
    const n = Math.round(U / T);
    if (((n % 3) + 3) % 3) continue;
    const mid = xOf(U + T / 2, S, fy(cy - 15));
    if ((f.noLights || []).some(([a, b]) => mid > a && mid < b)) continue;
    const on = ((n % 7) + 7) % 7 === 3 ? flickerOn(f.t) : 1;
    if (on > 0.5) poly(ctx, quad(U - 8, U + T + 8, cy - 7, cy - 23), 'rgba(255,252,236,0.18)');
    poly(ctx, quad(U, U + T, cy - 9, cy - 21), on > 0.5 ? '#fffbe6' : '#c9c8bc', P.ink, LWF);
    poly(ctx, quad(U + 6, U + T - 6, cy - 10.6, cy - 19.4), null, on > 0.5 ? '#e9e2c4' : '#aeada0', 0.4);
  }
  line(ctx, -2, cy - 0.3, f.W + 2, cy - 0.3, P.ink, LW);
}

function flickerOn(t) {
  // Mostly on, with a stutter of drop-outs every few seconds.
  const c = (t % 4.2 + 4.2) % 4.2;
  if (c > 3.2 && c < 3.75) return hash(Math.floor(t * 20)) > 0.45 ? 1 : 0.15;
  return 1;
}

// `part`: 'all', or for floor 88's pendants 'glow' (the wedge and pool of lamplight, which the
// furniture and workers stand in) and 'lamp' (the shades, which hang in front of everything).
// Recessed downlights and the hanging pendants, all fixed to the ceiling plane. The plane above the
// wall's top edge recedes in the same perspective as floor 23's grid, so a fixture mounted at a depth
// on it sits up in the dark area. They are laid out in the WALL's own coordinates, down the middle
// of the glass bays, so they scroll with the wall and never fall across a solid bay or a lift; two
// downlights in three, every third a pendant. Flat fills only.
// how far below the ceiling the pendant shades hang: low, over the furniture, as they first did
const PENDANT_DROP = 84;
const ROOMS_LIT_BY_DOWNLIGHTS = new Set(['meeting', 'boardroom']);
function ceilingFixtures(f) {
  if (!f.downs) return [];
  const cy = f.ceilingY;
  const hc = (YH - cy) / FACTORS.wall;
  const yd = Math.max(f.roomTop ?? 0, cy - 11) + 0.5;
  const k = (YH - yd) / hc / FACTORS.wall;
  const P0 = f.downs.period, left = f.coverage?.left ?? 0, out = [];
  // Only the wall's own lifts are avoided here: they scroll with the fixtures, so the choice never
  // changes on screen. Lift lobbies and the CEO's suite stand nearer and move at their own rate;
  // they are painted OVER the corridor downlights (ceilingLights) rather than culling them, which
  // would make a light vanish mid-screen.
  const blocked = (x) => f.wall.hangs.some((h) => h.kind === 'lift' && x > h.x - 20 && x < h.x + h.w + 20);
  // The meeting rooms are lit by downlights ONLY: their stretch of ceiling gets a row of them and
  // no pendant hangs there, whatever the corridor plan says.
  const rooms = (f.landmarks || []).filter((l) => ROOMS_LIT_BY_DOWNLIGHTS.has(l.kind)).map((l) => [l.x, l.x + l.w]);
  const inRoom = (x) => rooms.some(([a, b]) => x > a - 12 && x < b + 12);
  for (const [a, b] of rooms) {
    if (b < left - 60 || a > f.W + 60) continue;
    const n = Math.max(3, Math.round((b - a) / 70));
    for (let i = 0; i < n; i++) out.push({ x: a + ((i + 0.5) * (b - a)) / n, kind: 'd', yd, k, room: true });
  }
  for (const [u, kind] of f.downs.us) {
    for (let n = Math.floor((f.wallShift + left - 60 - u) / P0); n <= Math.ceil((f.wallShift + f.W + 60 - u) / P0); n++) {
      const x = u + n * P0 - f.wallShift;
      if (x < left - 60 || x > f.W + 60 || blocked(x) || inRoom(x)) continue;
      out.push({ x, kind, yd, k });
    }
  }
  return out;
}

function downlights(ctx, f, fixtures) {
  const cone = ['rgba(255,196,228,0.125)', 'rgba(255,220,240,0.14)'];
  const pool = ['rgba(255,200,232,0.2)', 'rgba(255,230,244,0.3)'];
  const y1 = MID_BASE;
  for (const d of fixtures) {
    if (d.kind !== 'd') continue;
    const { x, yd, k } = d;
    poly(ctx, [x - 3.4, yd, x + 3.4, yd, x + 26, y1, x - 26, y1], cone[0]);
    poly(ctx, [x - 2.4, yd, x + 2.4, yd, x + 13, y1, x - 13, y1], cone[1]);
    ell(ctx, x, y1 + 1.5, 28, 3.6, pool[0]);
    ell(ctx, x, y1 + 1.5, 14, 1.9, pool[1]);
    ell(ctx, x, yd, 6.6 * k, 1.9 * k, '#3a2a46', '#1b1625', 0.35);
    ell(ctx, x, yd + 0.2, 5 * k, 1.3 * k, '#150f1e');
    ell(ctx, x, yd + 0.3, 4 * k, 1 * k, '#fffbe8');
  }
}

// The corridor's downlights, painted before the rooms and lift lobbies so those stand in front.
function ceilingLights(ctx, f) {
  downlights(ctx, f, ceilingFixtures(f).filter((d) => !d.room));
}

function lights(ctx, f, P, part = 'all') {
  // cords run off the top of the room, which rises above y 0 when the camera pulls out
  const cordTop = Math.min(0, f.roomTop ?? 0) - 2;
  // the meeting rooms' own downlights light the room, so they go over its glass
  if (part !== 'lamp') downlights(ctx, f, ceilingFixtures(f).filter((d) => d.room));
  for (const l of f.lights) {
    // the pendants hang in the foreground, nearer than any lift lobby, so nothing culls them
    if (l.variant !== 'pendant' && (f.noLights || []).some(([a, b]) => l.x > a && l.x < b)) continue;
    // floor 23's strip lights are lit ceiling tiles, painted with the grid in ceiling()
    if (l.variant === 'tube') continue;
    if (l.variant === 'globe') {
      line(ctx, l.x, cordTop, l.x, l.y - 6.5, '#5a4a3a', 0.5);
      circ(ctx, l.x, l.y + 0.6, 12, 'rgba(255,250,232,0.12)');
      circ(ctx, l.x, l.y + 0.6, 8.6, 'rgba(255,250,232,0.18)');
      poly(ctx, [l.x - 2, l.y - 6.6, l.x + 2, l.y - 6.6, l.x + 2.6, l.y - 4.6, l.x - 2.6, l.y - 4.6], P.brass, P.ink, LWF);
      circ(ctx, l.x, l.y + 0.6, 6, '#fffaf0', P.ink, LWF);
      circ(ctx, l.x - 1.2, l.y + 0.6, 3.6, '#fff1c4');
      globeGlint(ctx, l.x, l.y + 0.6, 6);
      continue;
    }
    // exec pendant: a pink cone, its bulb in two flat halo rings, a wedge of lamplight to the
    // floor in two flat steps, and its pool on the carpet in two more
    const y = l.y;
    const fb = f.midBase ?? MID_BASE;
    if (part !== 'lamp') {
      poly(ctx, [l.x - 7, y + 1, l.x + 7, y + 1, l.x + 40, fb + 1, l.x - 40, fb + 1], 'rgba(255,190,226,0.11)');
      poly(ctx, [l.x - 5, y + 1, l.x + 5, y + 1, l.x + 22, fb + 1, l.x - 22, fb + 1], 'rgba(255,214,236,0.12)');
      ell(ctx, l.x, fb + 2, 44, 4.2, 'rgba(255,200,232,0.16)');
      ell(ctx, l.x, fb + 2, 24, 2.4, 'rgba(255,224,242,0.22)');
    }
    if (part === 'glow') continue;
    // the cord comes down from a canopy fixed to the ceiling: a flat ellipse of brass on the soffit
    // and a short collar, then the cord to the shade
    // the cord runs all the way up out of the top of the screen, no canopy: these hang in the
    // foreground, nearer than the ceiling plane the downlights are set into
    line(ctx, l.x, Math.min(-40, cordTop), l.x, y - 7, '#2a1a14', 0.5);
    ell(ctx, l.x, y + 1.2, 13, 4.6, 'rgba(255,214,236,0.18)');
    poly(ctx, [l.x - 2.4, y - 7, l.x + 2.4, y - 7, l.x + 8, y + 1, l.x - 8, y + 1], '#ff8fc0', P.ink, LWF);
    poly(ctx, [l.x - 2.4, y - 7, l.x - 1, y - 7, l.x - 4.4, y + 1, l.x - 8, y + 1], '#ffc2dc');
    poly(ctx, [l.x - 2.4, y - 7, l.x + 2.4, y - 7, l.x + 8, y + 1, l.x - 8, y + 1], null, P.ink, LWF);
    ell(ctx, l.x, y + 1.2, 7.6, 1.6, '#fff6e0', P.ink, LWF);
    box(ctx, l.x - 1.6, y - 9, 3.2, 2, P.brass, P.ink, 0.3);
  }
}

function globeGlint(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r - 1.4, Math.PI * 1.1, Math.PI * 1.45);
  pen(ctx, 'rgba(255,255,255,0.9)', 0.8);
  ctx.stroke();
}

function floorPlane(ctx, f, P, wd) {
  const top = WALL_BASE;
  const bot = LANE_TOP;
  const S = f.floorPlane.shiftBottom;
  const id = f.floor;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-2, top, f.W + 4, bot - top + 0.5);
  ctx.clip();
  const T = id === 'lobby' ? 48 : 40;
  const A = id === 'lobby' ? P.floorA : P.carpetA;
  const B = id === 'lobby' ? P.floorB : P.carpetB;
  box(ctx, -2, top, f.W + 4, bot - top + 1, A);
  const rows = [];
  for (let D = 0; D < DWALL; D += T) rows.push(D);
  rows.push(DWALL);
  ctx.beginPath();
  for (let r = 0; r < rows.length - 1; r++) {
    const fa = fOfD(rows[r]);
    const fb = fOfD(rows[r + 1]);
    const ya = yOfF(fa);
    const yb = yOfF(fb);
    const uA = S + VPX + (-10 - VPX) / fb;
    const uB = S + VPX + (f.W + 10 - VPX) / fb;
    for (let m = Math.floor(uA / T); m * T < uB; m++) {
      if ((m + r) % 2) continue;
      ctx.moveTo(xOf(m * T, S, fa), ya);
      ctx.lineTo(xOf(m * T + T, S, fa), ya);
      ctx.lineTo(xOf(m * T + T, S, fb), yb);
      ctx.lineTo(xOf(m * T, S, fb), yb);
      // fill() closes each tile implicitly. Explicitly closing thousands of
      // subpaths every frame was expensive in Surge's Office appearance.
    }
  }
  ctx.fillStyle = B;
  ctx.fill();
  if (id === 'lobby') chips(ctx, S, P.chips, 1);
  else if (id === 'open') chips(ctx, S, P.chips, 0.8);
  else memphisRug(ctx, f, P, S);
  if (id === 'lobby') {
    ctx.fillStyle = P.floorRefl;
    for (const c of f.wall.columns) { ctx.fillRect(c.x + wd, top, c.w, 16); ctx.fillRect(c.x + wd + 2, top + 16, c.w - 4, 6); }
  }
  if (id === 'lobby' || id === 'exec') sunPatches(ctx, f, P, wd);
  ctx.beginPath();
  for (let r = 1; r < rows.length; r++) {
    const y = yOfF(fOfD(rows[r]));
    ctx.moveTo(-2, y);
    ctx.lineTo(f.W + 2, y);
  }
  const uA = S + VPX + (-10 - VPX) / FACTORS.wall;
  const uB = S + VPX + (f.W + 10 - VPX) / FACTORS.wall;
  for (let m = Math.floor(uA / T); m * T < uB; m++) {
    ctx.moveTo(xOf(m * T, S, 1), bot);
    ctx.lineTo(xOf(m * T, S, FACTORS.wall), top);
  }
  pen(ctx, id === 'lobby' ? P.floorLine : P.carpetLine, 0.45);
  ctx.stroke();
  ctx.restore();
  line(ctx, -2, top + 0.2, f.W + 2, top + 0.2, P.ink, LW);
}

function sunPatches(ctx, f, P, wd) {
  const sx = f.outside.sun ? f.outside.sun.x : VPX;
  const reach = f.floor === 'exec' ? 0.62 : 0.5;
  const yEnd = WALL_BASE + (LANE_TOP - WALL_BASE) * reach;
  const G = f.glass;
  ctx.fillStyle = P.sunPatch;
  ctx.beginPath();
  // The true rays fan out from the sun's foot on the horizon so fast that the patches leave
  // the frame; drawn as a cartoonist would, they lean away from the sun a little and keep
  // their panes.
  const at = (x) => x + (x - sx) * 0.3;
  for (const b of f.wall.bays) {
    if (b.type !== 'glass') continue;
    const x0 = b.x0 + wd;
    const x1 = b.x1 + wd;
    const n = Math.max(1, Math.round((b.x1 - b.x0) / G.mullion));
    const pitch = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * pitch + 1.6;
      const c = x0 + (i + 1) * pitch - 1.6;
      ctx.moveTo(a, WALL_BASE);
      ctx.lineTo(c, WALL_BASE);
      ctx.lineTo(at(c), yEnd);
      ctx.lineTo(at(a), yEnd);
      ctx.closePath();
    }
  }
  ctx.fill();
}

function slab(ctx, f, P) {
  const S = f.slab.shift;
  const top = LANE_TOP;
  const id = f.floor;
  box(ctx, -2, top, f.W + 4, 40, P.slab);
  if (id === 'lobby') {
    // chrome nosing, pink granite, a black plinth with a pink pinstripe
    box(ctx, -2, top, f.W + 4, 2.6, P.chrome);
    box(ctx, -2, top + 2.6, f.W + 4, 1.4, P.slabDk);
    ctx.fillStyle = P.fleck[0];
    for (let u = Math.floor(S / 7) * 7; u < S + f.W + 7; u += 7) {
      const h = hash(u * 0.37);
      ctx.fillRect(u - S + h * 5, top + 6 + hash(u * 0.71) * 18, 0.8, 0.8);
    }
    box(ctx, -2, top + 26, f.W + 4, 14, P.marble);
    line(ctx, -2, top + 28, f.W + 2, top + 28, M89.pink, 0.6);
    ctx.beginPath();
    for (let u = Math.floor(S / 96) * 96; u < S + f.W + 96; u += 96) {
      const x = u - S;
      ctx.moveTo(x, top + 4);
      ctx.lineTo(x, top + 26);
    }
    ctx.moveTo(-2, top + 26);
    ctx.lineTo(f.W + 2, top + 26);
  } else if (id === 'open') {
    box(ctx, -2, top, f.W + 4, 3, P.slabTop);
    box(ctx, -2, top + 3, f.W + 4, 1.4, P.slabDk);
    box(ctx, -2, top + 9, f.W + 4, 6, '#625f74');
    line(ctx, -2, top + 18, f.W + 2, top + 18, M89.teal, 0.6);
    ctx.beginPath();
    for (let u = Math.floor(S / 120) * 120; u < S + f.W + 120; u += 120) {
      const x = u - S;
      ctx.moveTo(x, top + 4.4);
      ctx.lineTo(x, top + 40);
      ctx.rect(x + 56, top + 10.4, 8, 3.2);
    }
    ctx.moveTo(-2, top + 9);
    ctx.lineTo(f.W + 2, top + 9);
    ctx.moveTo(-2, top + 15);
    ctx.lineTo(f.W + 2, top + 15);
  } else {
    // black lacquer under a chrome nosing, a pink neon pinstripe
    box(ctx, -2, top, f.W + 4, 2.6, P.slabTop);
    box(ctx, -2, top + 2.6, f.W + 4, 1.4, P.slabDk);
    const tube = new Path2D();
    tube.moveTo(-2, top + 7);
    tube.lineTo(f.W + 2, top + 7);
    neon(ctx, tube, P.neonA, 0.55);
    ctx.beginPath();
    for (let u = Math.floor(S / 64) * 64; u < S + f.W + 64; u += 64) {
      const x = u - S;
      ctx.moveTo(x, top + 10);
      ctx.lineTo(x, top + 40);
      ctx.rect(x + 6, top + 13, 52, 16);
    }
  }
  pen(ctx, P.slabLine, 0.5);
  ctx.stroke();
  line(ctx, -2, top + 0.2, f.W + 2, top + 0.2, P.ink, 0.7);
}

const CHIP_P = 480;

const CHIPS = Array.from({ length: 64 }, (_, i) => ({
  U: hash(i * 3.71 + 9) * CHIP_P, D: 6 + hash(i * 5.13 + 2) * (DWALL - 120), a: hash(i * 7.9) * Math.PI, k: i % 5, kind: i % 3,
}));

function chips(ctx, S, cols, scale) {
  const paths = cols.map(() => new Path2D());
  for (const c of CHIPS) {
    const f = fOfD(c.D);
    const y = yOfF(f);
    const uA = S + VPX + (-10 - VPX) / f;
    const uB = S + VPX + (W + 10 - VPX) / f;
    const r = 2.2 * f * scale;
    const p = paths[c.k % cols.length];
    for (let U = c.U + Math.floor((uA - c.U) / CHIP_P) * CHIP_P; U < uB; U += CHIP_P) {
      const x = xOf(U, S, f);
      const dx = Math.cos(c.a) * r;
      const dy = Math.sin(c.a) * r * 0.35;
      if (c.kind === 0) { p.moveTo(x - dx, y - dy); p.lineTo(x + dx, y + dy); p.lineTo(x + dx * 0.6, y + dy + 0.5); p.closePath(); }
      else if (c.kind === 1) { p.moveTo(x, y - r * 0.4); p.lineTo(x + r * 0.7, y + r * 0.25); p.lineTo(x - r * 0.7, y + r * 0.25); p.closePath(); }
      else p.rect(x - r * 0.4, y - r * 0.18, r * 0.8, r * 0.36);
    }
  }
  paths.forEach((p, k) => { ctx.fillStyle = cols[k]; ctx.fill(p); });
}

function memphisRug(ctx, f, P, S) {
  const RP = 1600;
  const quad = (u0, u1, d0, d1) => {
    const fa = fOfD(d0);
    const fb = fOfD(d1);
    return [xOf(u0, S, fa), yOfF(fa), xOf(u1, S, fa), yOfF(fa), xOf(u1, S, fb), yOfF(fb), xOf(u0, S, fb), yOfF(fb)];
  };
  const pt = (u, d) => { const fv = fOfD(d); return [xOf(u, S, fv), yOfF(fv)]; };
  const base0 = Math.floor((S - 400) / RP) * RP + 260;
  for (const U0 of [base0, base0 + RP]) {
    const w = 300;
    const D0 = 90;
    const D1 = 330;
    const outer = quad(U0, U0 + w, D0, D1);
    if (Math.max(outer[0], outer[2], outer[4], outer[6]) < -10 || Math.min(outer[0], outer[2], outer[4], outer[6]) > f.W + 10) continue;
    poly(ctx, outer, P.rug, P.rugLine, 0.6);
    poly(ctx, quad(U0 + 12, U0 + w - 12, D0 + 14, D1 - 30), P.rugIn);
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const [x, y] = pt(U0 + 16 + k * ((w - 32) / 12), k % 2 ? D0 + 40 : D0 + 80);
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    pen(ctx, '#5fbdb4', 0.8);
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const u = U0 + 30 + k * 56;
      poly(ctx, [...pt(u, D0 + 110), ...pt(u + 22, D0 + 110), ...pt(u + 11, D0 + 170)], k % 2 ? '#e48ab8' : '#efe08a');
    }
  }
}

function padded(g, cx, y, w, h, fill, ink, lw) {
  g.beginPath();
  g.moveTo(cx - w / 2, y + h);
  g.lineTo(cx - w / 2, y + 2.2);
  g.lineTo(cx - w / 2 + 1.6, y);
  g.lineTo(cx + w / 2 - 1.6, y);
  g.lineTo(cx + w / 2, y + 2.2);
  g.lineTo(cx + w / 2, y + h);
  g.closePath();
  fs(g, fill, ink, lw);
}

// A seated person from behind, from the collar to the seat (Peter, 14 Oct 2026: "are their
// bodies meant to be that blocky?" — they were the shoulder-pad box stretched to the seat).
// Rounded shoulders tapering to the waist with a little flare over the seat, a shade band down
// the far side, the centre seam and its vent; then the arms as their own shapes either side,
// hanging to an elbow with a gap at the waist, or (`elbows`) out to the table top. The white
// of the shirt collar shows above the jacket's.
// Both backs are drawn a tenth narrower than they were made (Peter, 15 Oct 2026: "perhaps make them
// all a little slimmer too overall - just a bit"), squeezed toward their middle.
const BACK_SLIM = 0.9;
const slimmed = (ctx, cx, draw) => {
  ctx.save(); ctx.translate(cx, 0); ctx.scale(BACK_SLIM, 1); ctx.translate(-cx, 0);
  draw();
  ctx.restore();
};
function seatedBack(ctx, cx, suit, ink, elbows = false) {
  slimmed(ctx, cx, () => seatedBackFull(ctx, cx, suit, ink, elbows));
}
function seatedBackFull(ctx, cx, suit, ink, elbows = false) {
  const b = MID_BASE, top = b - 34.4, seat = b - 15.8;
  const torso = (p) => {
    p.moveTo(cx - 3, top);
    p.quadraticCurveTo(cx - 8.6, top + 0.2, cx - 9.4, top + 3.4);
    p.quadraticCurveTo(cx - 8.4, b - 25.5, cx - 6.4, b - 22);
    p.quadraticCurveTo(cx - 7.4, b - 18.6, cx - 7.2, seat);
    p.lineTo(cx + 7.2, seat);
    p.quadraticCurveTo(cx + 7.4, b - 18.6, cx + 6.4, b - 22);
    p.quadraticCurveTo(cx + 8.4, b - 25.5, cx + 9.4, top + 3.4);
    p.quadraticCurveTo(cx + 8.6, top + 0.2, cx + 3, top);
    p.closePath();
  };
  const arm = (side) => {
    ctx.beginPath();
    if (elbows) {
      // upper arm out and forward, the elbow on the table top
      ctx.moveTo(cx + side * 7.6, top + 1.8);
      ctx.quadraticCurveTo(cx + side * 10.6, top + 2.4, cx + side * 11.6, b - 29.4);
      ctx.quadraticCurveTo(cx + side * 12.4, b - 27.2, cx + side * 10.6, b - 27.3);
      ctx.quadraticCurveTo(cx + side * 9.2, b - 27.8, cx + side * 7.8, b - 28.8);
    } else {
      // hanging, bent forward at the elbow out of sight: shoulder to a rounded elbow
      ctx.moveTo(cx + side * 7.4, top + 1.6);
      ctx.quadraticCurveTo(cx + side * 10.8, top + 2, cx + side * 10.6, b - 27);
      ctx.lineTo(cx + side * 10.4, b - 23.6);
      ctx.quadraticCurveTo(cx + side * 9.2, b - 22.2, cx + side * 7.8, b - 23.6);
      ctx.lineTo(cx + side * 7.6, b - 28);
    }
    ctx.closePath();
    fs(ctx, suit, ink, 0.4);
    if (side > 0) {
      ctx.save(); ctx.clip();
      box(ctx, cx + side * 9.6 - 1, top, 4, 20, 'rgba(20,16,30,0.26)');
      ctx.restore();
    }
  };
  ctx.beginPath(); torso(ctx); fs(ctx, suit, ink, LWM);
  ctx.save(); ctx.beginPath(); torso(ctx); ctx.clip();
  box(ctx, cx + 2.6, top, 8, 20, 'rgba(20,16,30,0.24)');
  box(ctx, cx - 8.4, top + 1.4, 1.6, 8, 'rgba(255,255,255,0.12)');
  ctx.restore();
  line(ctx, cx, top + 1, cx, seat, 'rgba(20,16,30,0.55)', 0.35);
  line(ctx, cx - 0.5, b - 19.4, cx, seat, 'rgba(20,16,30,0.55)', 0.35);
  // the jacket collar, and the shirt's white collar above it
  poly(ctx, [cx - 3.2, top, cx + 3.2, top, cx + 2.4, top + 1.6, cx - 2.4, top + 1.6], 'rgba(20,16,30,0.3)');
  poly(ctx, [cx - 2.4, top - 0.9, cx + 2.4, top - 0.9, cx + 2.6, top + 0.2, cx - 2.6, top + 0.2], '#f4f2f6', ink, 0.3);
  arm(-1);
  arm(1);
}

// A cubicle worker from behind, from the collar (`top`) down: seatedBack's tapered torso at any
// height, in shirt-sleeves, so a worker who stands up to look over the partition is not a box
// (Peter, 15 Oct 2026: "should the workers popping up have the same tapered waist as the meeting
// room workers? they're very blocky"). The partition hides it below its top rail. With `hands`
// the sleeves reach down to the hands on the rail; otherwise they hang.
function cubicleBack(ctx, cx, top, shirt, ink, hands = false) {
  slimmed(ctx, cx, () => cubicleBackFull(ctx, cx, top, shirt, ink, hands));
}
function cubicleBackFull(ctx, cx, top, shirt, ink, hands = false) {
  const b = MID_BASE, waist = top + 12.4, seat = top + 18.6;
  const torso = (p) => {
    p.moveTo(cx - 3, top);
    p.quadraticCurveTo(cx - 8.6, top + 0.2, cx - 9.4, top + 3.4);
    p.quadraticCurveTo(cx - 8.4, top + 8.9, cx - 6.4, waist);
    p.quadraticCurveTo(cx - 7.4, top + 15.8, cx - 7.2, seat);
    p.lineTo(cx + 7.2, seat);
    p.quadraticCurveTo(cx + 7.4, top + 15.8, cx + 6.4, waist);
    p.quadraticCurveTo(cx + 8.4, top + 8.9, cx + 9.4, top + 3.4);
    p.quadraticCurveTo(cx + 8.6, top + 0.2, cx + 3, top);
    p.closePath();
  };
  const arm = (side) => {
    ctx.beginPath();
    if (hands) {
      // from the shoulder down and out to the hand on the partition rail
      const hx = cx + side * 9.5, hy = b - 35.6;
      ctx.moveTo(cx + side * 7.4, top + 1.6);
      ctx.quadraticCurveTo(cx + side * 10.8, top + 2.2, hx + side * 1.4, hy - 1);
      ctx.lineTo(hx - side * 1.4, hy - 1);
      ctx.quadraticCurveTo(cx + side * 8.6, top + 6, cx + side * 7.6, top + 7);
    } else {
      // hanging, bent forward at the elbow out of sight
      ctx.moveTo(cx + side * 7.4, top + 1.6);
      ctx.quadraticCurveTo(cx + side * 10.8, top + 2, cx + side * 10.6, top + 7.4);
      ctx.lineTo(cx + side * 10.4, top + 10.8);
      ctx.quadraticCurveTo(cx + side * 9.2, top + 12.2, cx + side * 7.8, top + 10.8);
      ctx.lineTo(cx + side * 7.6, top + 6.4);
    }
    ctx.closePath();
    fs(ctx, shirt, ink, 0.4);
    if (side > 0) {
      ctx.save(); ctx.clip();
      box(ctx, cx + side * 9.6 - 1, top, 4, 20, 'rgba(20,16,30,0.18)');
      ctx.restore();
    }
  };
  ctx.beginPath(); torso(ctx); fs(ctx, shirt, ink, LWM);
  ctx.save(); ctx.beginPath(); torso(ctx); ctx.clip();
  box(ctx, cx + 2.6, top, 8, 20, 'rgba(20,16,30,0.16)');
  box(ctx, cx - 8.4, top + 1.4, 1.6, 8, 'rgba(255,255,255,0.18)');
  ctx.restore();
  // the shirt's yoke across the shoulders and its collar
  line(ctx, cx - 7.6, top + 3.6, cx + 7.6, top + 3.6, 'rgba(20,16,30,0.3)', 0.35);
  poly(ctx, [cx - 2.6, top - 0.9, cx + 2.6, top - 0.9, cx + 2.8, top + 0.4, cx - 2.8, top + 0.4], shirt, ink, 0.3);
  arm(-1);
  arm(1);
}

const BAKING = { floor: null };

function lampSheen(ctx, f) {
  const pend = f.lights.filter((l) => l.variant === 'pendant');
  if (!pend.length) return;
  for (const m of f.mid.items) {
    let x0;
    let x1;
    let y;
    if (m.kind === 'boardroom') { x0 = m.x0; x1 = m.x1; y = MID_BASE - 26.6; } else if (m.kind === 'desk') { x0 = m.x - 2; x1 = m.x + m.w + 2; y = MID_BASE - 31; } else continue;
    for (const l of pend) {
      const a = Math.max(x0 + 1, l.x - 22);
      const b = Math.min(x1 - 1, l.x + 22);
      if (b <= a) continue;
      box(ctx, a, y, b - a, 1.2, 'rgba(255,170,215,0.75)');
      box(ctx, Math.max(x0 + 1, l.x - 9), y - 0.2, Math.min(x1 - 1, l.x + 9) - Math.max(x0 + 1, l.x - 9), 0.8, 'rgba(255,240,248,0.9)');
    }
  }
}

const SKINS = ['#f3cfae', '#e7b78e', '#c98e64', '#f6d9bf', '#93603f'];

const HAIRS = ['#3a2a20', '#6b4529', '#e2b45a', '#2a2a30', '#c9a07a', '#b8502a'];

const STYLES = ['short', 'perm', 'bald', 'perm', 'quiff', 'short', 'bob'];

const SHIRTS = ['#f6c2d6', '#bfe8e2', '#f4ecb0', '#d6c8f0', '#ffffff', '#a9c4f0'];

function personFor(seed) {
  const h = (n) => hash(seed * 13.7 + n);
  let style = STYLES[Math.floor(h(3) * STYLES.length)];
  // Bald is about one head in twenty-five, not one in seven (Peter, 12 Oct 2026: "less bald men").
  // Most of those who drew it keep their hair, cut short, so nobody else's look changes.
  if (style === 'bald' && h(7) > 0.3) style = 'short';
  return {
    skin: SKINS[Math.floor(h(1) * SKINS.length)],
    hair: style === 'quiff' ? '#d9903e' : HAIRS[Math.floor(h(2) * HAIRS.length)],
    style,
    shirt: SHIRTS[Math.floor(h(4) * SHIRTS.length)],
    glasses: h(5) < 0.3,
    tie: ['#c8433a', '#3b5f93', '#3c7a5a', '#8c6a2a'][Math.floor(h(6) * 4)],
  };
}

function head(g, x, y, r, p, face, ink, lw, closed = false) {
  if (p.style === 'perm') {
    const lobes = [[-0.9, -0.4, 0.62], [0.9, -0.4, 0.62], [-0.55, -0.95, 0.6], [0.55, -0.95, 0.6], [0, -1.15, 0.6], [-1.05, 0.3, 0.5], [1.05, 0.3, 0.5]];
    g.beginPath();
    for (const [dx, dy, rr] of lobes) { g.moveTo(x + dx * r + rr * r, y + dy * r); g.arc(x + dx * r, y + dy * r, rr * r, 0, TAU); }
    pen(g, ink, lw * 2);
    g.stroke();
    g.fillStyle = p.hair;
    g.fill();
  }
  const sideEar = face === 'left' ? 1 : face === 'right' ? -1 : 0;
  if (p.style !== 'perm') {
    if (sideEar) circ(g, x + sideEar * r * 0.25, y + r * 0.15, r * 0.3, p.skin, ink, lw);
    else { circ(g, x - r * 0.95, y + r * 0.15, r * 0.28, p.skin, ink, lw); circ(g, x + r * 0.95, y + r * 0.15, r * 0.28, p.skin, ink, lw); }
  }
  if (p.style === 'bun') circ(g, x - (sideEar || 0) * r * 0.7, y - r * (sideEar ? 0.6 : 0.95), r * 0.45, p.hair, ink, lw);
  circ(g, x, y, r, p.skin, ink, lw);
  if (face === 'left' || face === 'right') {
    const d = face === 'left' ? -1 : 1;
    circ(g, x + d * r * 0.98, y + r * 0.2, r * 0.24, p.skin, ink, lw * 0.9);
    circ(g, x + d * r * 0.5, y - r * 0.05, r * 0.11, ink);
  }
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.clip();
  g.fillStyle = p.hair;
  if (p.style === 'bald') {
    if (face === 'back') g.fillRect(x - r, y + r * 0.3, r * 2, r * 0.7); // the fringe round the back, low on the head
    else { g.fillRect(x - r, y - r * 0.15, r * 0.45, r * 0.6); g.fillRect(x + r * 0.55, y - r * 0.15, r * 0.45, r * 0.6); }
  } else if (face === 'back') {
    g.fillRect(x - r, y - r, r * 2, r * (p.style === 'bob' || p.style === 'bun' || p.style === 'perm' ? 1.75 : 1.45));
  } else if (face === 'front') {
    g.beginPath();
    g.ellipse(x, y - r * 0.55, r * 1.1, r * 0.62, 0, 0, TAU);
    g.fill();
    if (p.style === 'bob' || p.style === 'perm') { g.fillRect(x - r, y - r * 0.4, r * 0.32, r * 1.2); g.fillRect(x + r * 0.68, y - r * 0.4, r * 0.32, r * 1.2); }
  } else {
    const d = face === 'left' ? -1 : 1;
    g.beginPath();
    g.ellipse(x - d * r * 0.25, y - r * 0.45, r * 1.05, r * 0.68, 0, 0, TAU);
    g.fill();
    if (p.style === 'bob' || p.style === 'bun' || p.style === 'perm') g.fillRect(d > 0 ? x - r : x + r * 0.1, y - r * 0.4, r * 0.9, r * 1.1);
  }
  g.restore();
  circ(g, x, y, r, null, ink, lw);
  if (p.style === 'quiff') {
    const d = face === 'left' ? -1 : face === 'right' ? 1 : 0.4;
    g.beginPath();
    g.moveTo(x + d * r * 0.1 - r * 0.25, y - r * 0.92);
    g.quadraticCurveTo(x + d * r * 0.5, y - r * 1.75, x + d * r * 0.9, y - r * 1.25);
    g.quadraticCurveTo(x + d * r * 0.55, y - r * 1.2, x + d * r * 0.35 + r * 0.2, y - r * 0.9);
    g.closePath();
    fs(g, p.hair, ink, lw);
  }
  if (face === 'front') {
    if (closed) {
      g.beginPath();
      g.moveTo(x - r * 0.55, y + r * 0.05); g.quadraticCurveTo(x - r * 0.35, y + r * 0.22, x - r * 0.15, y + r * 0.05);
      g.moveTo(x + r * 0.15, y + r * 0.05); g.quadraticCurveTo(x + r * 0.35, y + r * 0.22, x + r * 0.55, y + r * 0.05);
      pen(g, ink, lw * 0.9);
      g.stroke();
    } else {
      circ(g, x - r * 0.35, y, r * 0.12, ink);
      circ(g, x + r * 0.35, y, r * 0.12, ink);
    }
    g.beginPath();
    g.moveTo(x - r * 0.3, y + r * 0.55); g.quadraticCurveTo(x, y + r * (closed ? 0.62 : 0.72), x + r * 0.3, y + r * 0.55);
    pen(g, ink, lw * 0.8);
    g.stroke();
    if (p.glasses) { box(g, x - r * 0.68, y - r * 0.22, r * 0.58, r * 0.44, null, ink, lw * 0.8); box(g, x + r * 0.1, y - r * 0.22, r * 0.58, r * 0.44, null, ink, lw * 0.8); }
  } else if (p.glasses && face !== 'back') {
    const d = face === 'left' ? -1 : 1;
    circ(g, x + d * r * 0.55, y - r * 0.02, r * 0.24, null, ink, lw * 0.8);
  }
}

function shadowFoot(g, x, w, b) {
  if (BAKING.floor === 'lobby') {
    g.fillStyle = 'rgba(70,40,80,0.13)';
    g.beginPath();
    g.moveTo(x - 1, b - 0.6); g.lineTo(x + w + 1, b - 0.6); g.lineTo(x + w + 17, b + 5.5); g.lineTo(x + 15, b + 5.5);
    g.closePath();
    g.fill();
    return;
  }
  g.fillStyle = 'rgba(30,20,10,0.12)';
  g.beginPath();
  g.ellipse(x + w / 2, b, w / 2 + 2, 1.8, 0, 0, TAU);
  g.fill();
}

function pot(g, cx, b, w, h, c, cDk, ink) {
  poly(g, [cx - w / 2, b - h, cx + w / 2, b - h, cx + w * 0.38, b, cx - w * 0.38, b], c, ink, LWM);
  box(g, cx - w / 2 - 1, b - h - 2.2, w + 2, 2.6, cDk, ink, LWM);
}

function leaf(g, x, y, len, wdt, ang, fill, ink, lw) {
  g.beginPath();
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  g.moveTo(x, y);
  g.quadraticCurveTo(x + ca * len * 0.5 - sa * wdt, y + sa * len * 0.5 + ca * wdt, x + ca * len, y + sa * len);
  g.quadraticCurveTo(x + ca * len * 0.5 + sa * wdt, y + sa * len * 0.5 - ca * wdt, x, y);
  fs(g, fill, ink, lw);
}

function plant(g, x, b, variant, P, seed) {
  const ink = P.inkM;
  const lf = '#5f9f5a';
  const lfDk = '#3f7f47';
  const lfLine = '#2f5a35';
  const potC = P.pot || '#c4744a';
  const potDk = P.potDk || '#9a5636';
  if (variant === 'ficus') {
    const cx = x + 15;
    line(g, cx, b - 12, cx - 1, b - 36, '#7a5a3a', 1.4);
    line(g, cx - 0.5, b - 26, cx + 6, b - 40, '#7a5a3a', 0.9);
    line(g, cx - 0.8, b - 30, cx - 6, b - 42, '#7a5a3a', 0.8);
    // the crown's mass first, dark and outlined as one, then the leaves catching light
    const lobes = [[0, -44, 11], [-7, -40, 7.5], [7, -40, 8], [-4, -51, 7], [5, -50, 7.5], [0, -33, 7]];
    g.beginPath();
    for (const [dx, dy, r] of lobes) { g.moveTo(cx + dx + r, b + dy); g.arc(cx + dx, b + dy, r, 0, TAU); }
    pen(g, lfLine, 1.0);
    g.stroke();
    g.fillStyle = lfDk;
    g.fill();
    for (let k = 0; k < 64; k++) {
      const a = hash(seed * 3 + k) * TAU;
      const rr = Math.sqrt(hash(seed * 5 + k * 1.3));
      const lx = cx + Math.cos(a) * 12 * rr;
      const ly = b - 44 + Math.sin(a) * 13 * rr;
      if (Math.sin(a) > 0.6 && rr > 0.7) continue;
      leaf(g, lx, ly, 5, 1.9, a + 0.6 + hash(k) * 0.8, k % 4 ? lf : '#78b46c', lfLine, 0.38);
    }
    pot(g, cx, b, 14, 11, potC, potDk, ink);
    return;
  }
  if (variant === 'palm') {
    const cx = x + 20;
    line(g, cx, b - 12, cx, b - 34, '#8a6a42', 1.6);
    for (let k = 0; k < 9; k++) {
      const side = k % 2 ? 1 : -1;
      const ang = -Math.PI / 2 + side * (0.25 + (k / 9) * 1.3);
      const L = 22 + hash(seed + k) * 8;
      const sx = cx;
      const sy = b - 34;
      const ex = sx + Math.cos(ang) * L;
      const ey = sy + Math.sin(ang) * L * 0.75 + L * 0.3;
      const mx = sx + Math.cos(ang) * L * 0.55;
      const my = sy + Math.sin(ang) * L * 0.75 - 4;
      for (let q = 2; q <= 10; q++) {
        const t = q / 10;
        const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
        const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
        const ll = 7 * Math.sin(Math.PI * t) + 1.5;
        leaf(g, px, py, ll, 1.1, ang + side * 0.9 + 0.5, lf, lfLine, 0.35);
        leaf(g, px, py, ll, 1.1, ang - side * 0.4 + 1.6, lfDk, lfLine, 0.35);
      }
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(mx, my, ex, ey);
      pen(g, lfLine, 0.6);
      g.stroke();
    }
    pot(g, cx, b, 18, 13, P.potAlt || potC, P.potAltDk || potDk, ink);
    return;
  }
  if (variant === 'snake') {
    const cx = x + 8;
    for (let k = 0; k < 7; k++) {
      const bx = cx - 5 + k * 1.7;
      const hgt = 18 + hash(seed + k) * 12;
      const tip = bx + (k - 3) * 1.2;
      poly(g, [bx - 1.5, b - 9, bx + 1.5, b - 9, tip + 0.4, b - 9 - hgt, tip - 0.6, b - 9 - hgt + 1], k % 2 ? '#4f8a4c' : '#5f9a52', lfLine, 0.4);
      line(g, bx - 1.2, b - 10, tip - 0.4, b - 9 - hgt + 3, '#d8c860', 0.4);
    }
    pot(g, cx, b, 11, 9, potC, potDk, ink);
    return;
  }
  // bonsai on a little stand
  const cx = x + 9;
  box(g, cx - 9, b - 20, 18, 2.4, P.wood || '#6a3a22', ink, LWM);
  lines(g, [cx - 7, b - 18, cx - 7, b, cx + 7, b - 18, cx + 7, b], P.woodDk || '#4a2a18', 1.1);
  box(g, cx - 6, b - 24, 12, 4, '#3d5c78', ink, LWM);
  g.beginPath();
  g.moveTo(cx - 1, b - 24);
  g.quadraticCurveTo(cx - 4, b - 30, cx + 1, b - 33);
  g.quadraticCurveTo(cx + 4, b - 36, cx + 2, b - 38);
  pen(g, '#6a4a2a', 1.2);
  g.stroke();
  for (const [dx, dy, r] of [[-4, -33, 3.6], [3, -38, 3.2], [5, -32, 2.8]]) ell(g, cx + dx, b + dy, r * 1.3, r * 0.75, '#4f8a4c', lfLine, 0.4);
}

function reception(g, it, P, layer) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  if (layer !== 'front') return;
  shadowFoot(g, x, w, b);
  const top = b - 34;
  // on the desk: the terminal's beige back, a Rolodex, a phone, a vase of tulips
  box(g, x + w * 0.6, top - 11, 15, 10, '#d8d0bc', ink, LWM);
  box(g, x + w * 0.6 + 4, top - 1.5, 7, 1.5, '#bdb39c', ink, LWM);
  circ(g, x + w * 0.22, top - 3.4, 3.2, '#2a2833', ink, 0.4);
  box(g, x + w * 0.22 - 2.6, top - 6, 5.2, 2.2, '#ffffff', ink, 0.3);
  box(g, x + w * 0.22 - 3, top - 1, 6, 1, '#2a2833');
  box(g, x + w * 0.38, top - 3, 7, 3, '#e6dccb', ink, 0.35);
  line(g, x + w * 0.38 + 0.6, top - 3.6, x + w * 0.38 + 6.4, top - 3.6, '#e6dccb', 1.1);
  poly(g, [x + w * 0.86 - 2.5, top, x + w * 0.86 + 2.5, top, x + w * 0.86 + 1.8, top - 6, x + w * 0.86 - 1.8, top - 6], '#1f1d26', ink, 0.35);
  for (const [dx, dy, c] of [[-2, -10, M89.pink], [1.6, -11, M89.lemon], [0, -8, M89.pink], [2.6, -8.6, M89.lilac]]) circ(g, x + w * 0.86 + dx, top + dy, 1.5, c, ink, 0.3);
  lines(g, [x + w * 0.86, top - 6, x + w * 0.86 - 1.5, top - 9, x + w * 0.86, top - 6, x + w * 0.86 + 1.5, top - 9.5], '#4f8a4c', 0.5);
  // the desk: pink laminate bulging toward us, a teal top, a lemon drum at one end,
  // a grey grid panel at the other, a squiggle along the kick
  g.beginPath();
  g.moveTo(x, b);
  g.lineTo(x, top + 3);
  g.quadraticCurveTo(x + w / 2, top - 2.5, x + w, top + 3);
  g.lineTo(x + w, b);
  g.closePath();
  fs(g, '#f4b9cf', ink, LWM);
  g.beginPath();
  g.moveTo(x - 1.5, top + 4);
  g.lineTo(x - 1.5, top + 1);
  g.quadraticCurveTo(x + w / 2, top - 4.5, x + w + 1.5, top + 1);
  g.lineTo(x + w + 1.5, top + 4);
  g.quadraticCurveTo(x + w / 2, top - 1.5, x - 1.5, top + 4);
  fs(g, '#8fd3ca', ink, LWM);
  grid(g, x + 2, top + 6, 16, b - top - 10, 3.2, '#f4f2f6', '#b8b4c4', 0.35);
  rbox(g, x + w - 14, top + 4, 12, b - top - 4, 5, '#f2e28a', ink, LWM);
  if (it.label !== false) {
    box(g, x + w / 2 - 31, top + 9, 62, 11, '#1f1d26', ink, LWM);
    letters(g, 'RECEPTION', x + w / 2, top + 17.2, 5.2, { ink: '#ffffff', lw: 0.7, align: 'center', slant: 0.18 });
  }
  squiggle(g, x + 20, x + w - 16, b - 6, 1, 6, '#c96a96', 0.6);
  box(g, x, b - 3, w, 3, '#1f1d26', ink, LWM);
}

function turnstiles(g, it, P) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  const n = 4;
  const pitch = w / (n - 1);
  for (let k = 0; k < n - 1; k++) {
    const a = x + k * pitch + 3;
    const c = x + (k + 1) * pitch - 3;
    const m = (a + c) / 2;
    for (const [p0, p1] of [[a, m - 1], [m + 1, c]]) rbox(g, p0, b - 22, p1 - p0, 11, 2, 'rgba(160,215,225,0.22)', 'rgba(90,120,150,0.55)', 0.4);
  }
  for (let k = 0; k < n; k++) {
    const px = x + k * pitch;
    topRound(g, px - 3, b - 26, 6, 26, 2.6, '#9a9fae', ink, LWM);
    box(g, px - 3, b - 15, 6, 2, '#7fcfc6');
    box(g, px - 2.2, b - 25, 4.4, 2, '#1f1d26', ink, 0.3);
    circ(g, px + 1, b - 24, 0.55, M89.pink);
  }
}

function sofa(g, it, P, exec) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  if (exec) {
    // 80s boardroom lounge, the Grand Confort kind: oxblood leather cushions held in a polished
    // chrome tube cage. Corporate, heavy, expensive; nothing candy coloured up here.
    const [hide, hideDk, hideLt] = ['#6e2232', '#4c1522', '#a0475a'];
    const chrome = P.chrome, chromeDk = '#7d8494';
    // `seat: 'single'` is the armchair: one back cushion, one seat, the same cage
    const n = it.seat === 'single' ? 1 : Math.max(2, Math.round((w - 16) / 26));
    const cw = (w - 16) / n;
    // back cushions, standing in a row
    for (let i = 0; i < n; i++) {
      const cx0 = x + 8 + i * cw;
      rbox(g, cx0 + 0.4, b - 27, cw - 0.8, 15, 2.2, hide, ink, LWM);
      line(g, cx0 + 2, b - 25.4, cx0 + cw - 2, b - 25.4, hideLt, 0.6);
    }
    // seat cushions
    for (let i = 0; i < n; i++) {
      const cx0 = x + 8 + i * cw;
      rbox(g, cx0 + 0.4, b - 13, cw - 0.8, 7, 1.8, hide, ink, LWM);
      line(g, cx0 + 2, b - 11.6, cx0 + cw - 2, b - 11.6, hideLt, 0.5);
    }
    // the arm cushions: square blocks of leather inside the cage
    for (const ax of [x + 1, x + w - 8]) {
      rbox(g, ax, b - 22, 7, 16, 1.6, hideDk, ink, LWM);
      line(g, ax + 1.6, b - 20.6, ax + 1.6, b - 8, hide, 0.6);
    }
    // the chrome cage: a rail round the arms' tops and along the seat's foot, posts at the corners
    lines(g, [
      x, b - 22.6, x + 8.4, b - 22.6, x + w - 8.4, b - 22.6, x + w, b - 22.6,
      x, b - 5.4, x + w, b - 5.4,
      x + 0.3, b - 22.6, x + 0.3, b - 1, x + w - 0.3, b - 22.6, x + w - 0.3, b - 1,
      x + 8.4, b - 22.6, x + 8.4, b - 5.4, x + w - 8.4, b - 22.6, x + w - 8.4, b - 5.4,
    ], chromeDk, 1.4);
    lines(g, [
      x, b - 22.9, x + 8.4, b - 22.9, x + w - 8.4, b - 22.9, x + w, b - 22.9,
      x, b - 5.7, x + w, b - 5.7,
      x + 0.1, b - 22.6, x + 0.1, b - 1, x + w - 0.5, b - 22.6, x + w - 0.5, b - 1,
    ], chrome, 0.6);
    // little feet
    for (const fx of [x - 0.6, x + w - 1.6]) box(g, fx, b - 1.2, 2.2, 1.2, '#1b1a22');
    return;
  }
  // Memphis seating: a slab back, a seat, drum arms, in one of three
  // colourways; `seat: 'single'` is a club chair with a rounded back.
  const [back, seat, arm] = SOFA_TONES[(it.tone ?? 0) % SOFA_TONES.length];
  if (it.seat === 'single') {
    rbox(g, x + 2, b - 30, w - 4, 17, 6, back, ink, LWM);
    box(g, x + 1, b - 14, w - 2, 7, seat, ink, LWM);
    for (const ax of [x - 3, x + w - 5]) rbox(g, ax, b - 20, 8, 13, 3.6, arm, ink, LWM);
    line(g, x + w / 2, b - 7, x + w / 2, b - 1, '#1f1d26', 1.2);
    line(g, x + w / 2 - 6, b - 0.6, x + w / 2 + 6, b - 0.6, '#1f1d26', 1.2);
    return;
  }
  box(g, x + 4, b - 26, w - 8, 12, back, ink, LWM);
  box(g, x + 2, b - 14, w - 4, 7, seat, ink, LWM);
  for (const ax of [x - 2, x + w - 6]) rbox(g, ax, b - 20, 8, 13, 3.6, arm, ink, LWM);
  poly(g, [x + 6, b - 7, x + 9, b - 7, x + 4, b], '#1f1d26', ink, 0.3);
  poly(g, [x + w - 6, b - 7, x + w - 9, b - 7, x + w - 4, b], '#1f1d26', ink, 0.3);
}
// An 80s side table: a disc of smoked glass on a chrome pedestal, a heavy ashtray and a magazine.
function sideTable(g, it, P) {
  const { x, w } = it;
  const b = MID_BASE;
  const c = x + w / 2;
  line(g, c, b - 14, c, b - 1.5, P.chrome, 1.4);
  ell(g, c, b - 1, w * 0.4, 1, '#7d8494', P.inkM, 0.3);
  ell(g, c, b - 15, w / 2 + 1, 1.8, 'rgba(60,52,78,0.85)', P.inkM, 0.4);
  line(g, c - w / 2 + 2, b - 15.6, c, b - 15.6, 'rgba(255,255,255,0.45)', 0.5);
  ell(g, c - 3, b - 16.6, 2.6, 0.9, '#c9ced8', P.inkM, 0.3);
  box(g, c + 0.5, b - 17.4, 6, 1.4, '#f2e7d3', P.inkM, 0.3);
}
const SOFA_TONES = [
  ['#86d2c8', '#f2a9c6', '#f2e28a'], // teal back, pink seat, lemon arms
  ['#c9b6ec', '#86d2c8', '#f2a9c6'], // lilac, teal, pink
  ['#f2a9c6', '#f4ecd2', '#86d2c8'], // pink, cream, teal
];

function sculpture(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x + 6, 28, b);
  grid(g, x + 8, b - 22, 24, 22, 4, '#f4f2f6', '#8f8aa0', 0.4);
  box(g, x + 6.5, b - 24, 27, 3, '#1f1d26', ink, LWM);
  box(g, x + 14, b - 12, 12, 4.4, P.chrome, ink, 0.35);
  letters(g, 'OVUM', x + 20, b - 8.6, 2.4, { ink: '#1f1d26', lw: 0.35, align: 'center' });
  g.beginPath();
  g.ellipse(x + 20, b - 25, 6, 1.6, 0, 0, TAU);
  fs(g, '#7fcfc6', ink, LWM);
  // a pink egg, decorated in the Memphis manner
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  fs(g, '#f6a9c9', ink, LWM);
  g.save();
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  g.clip();
  squiggle(g, x + 8, x + 32, b - 44, 1.6, 6, '#1f1d26', 0.7);
  squiggle(g, x + 8, x + 32, b - 34, 1.6, 6, '#1f1d26', 0.7);
  confetti(g, x + 10, b - 52, 20, 26, 9, 51, [M89.lemon, M89.teal, '#1f1d26'], 1.3, 0.6);
  g.restore();
  g.beginPath();
  eggPath(g, x + 20, b - 39, 10.5, 14);
  pen(g, ink, LWM);
  g.stroke();
}

function cubiclesBack(g, it, P, desks) {
  const b = MID_BASE;
  const ink = P.inkM;
  for (const d of desks) {
    const h = (n) => hash(d.seed * 7.31 + n);
    const x = d.x;
    // the terminal: a beige box, its green screen toward us, glowing with text
    const mx = x + 14 + h(1) * 10;
    box(g, mx - 7, b - 46, 14, 13, '#d9d1bc', ink, LWM);
    // About one terminal in six has crashed to the blue screen (Peter, 14 Oct 2026: "can some of
    // the monitors be blue in level 2, like the blue screen of death"): the early-90s one, a grey
    // tab with the name in blue, then white text and a blinking prompt. Cubicles are floor 23's.
    // Only at an empty desk ("make sure blue screens are on monitors with no one in front of
    // them"): 0.45 of the empty ones, which is 3 of the floor's 19 desks.
    if (!d.occupied && h(11) < 0.45) {
      box(g, mx - 5.4, b - 44.4, 10.8, 9, '#0000aa', ink, 0.35);
      box(g, mx - 2.6, b - 43.6, 5.2, 1.6, '#aaaaaa');
      letters(g, 'WINDOWS', mx, b - 42.25, 0.95, { ink: '#0000aa', lw: 0.22, align: 'center', track: 0.08 });
      g.beginPath();
      for (let k = 0; k < 3; k++) { g.moveTo(mx - 4.4, b - 40.6 + k * 1.3); g.lineTo(mx - 4.4 + 5 + h(k + 12) * 3.8, b - 40.6 + k * 1.3); }
      pen(g, '#ffffff', 0.4);
      g.stroke();
      box(g, mx - 0.6, b - 36.6, 1.2, 0.5, '#ffffff');
    } else {
      box(g, mx - 5.4, b - 44.4, 10.8, 9, '#1d3a2a', ink, 0.35);
      box(g, mx - 4.4, b - 43.4, 8.8, 7, null, 'rgba(120,255,170,0.3)', 1.4);
      g.beginPath();
      for (let k = 0; k < 3; k++) { g.moveTo(mx - 4.2, b - 42.6 + k * 1.8); g.lineTo(mx - 4.2 + 3 + h(k + 3) * 5, b - 42.6 + k * 1.8); }
      pen(g, d.occupied ? '#5fd88a' : '#8affaa', 0.5);
      g.stroke();
      letters(g, d.occupied ? 'ASAP' : 'UNREAD', mx, b - 36, 1.5, { ink: '#8affaa', lw: 0.25, align: 'center', track: 0.2 });
    }
    const kind = Math.floor(h(9) * 4);
    const ox = mx > x + 20 ? x + 6 : x + 30;
    if (kind === 0) {
      // a Rolodex
      circ(g, ox, b - 37.5, 3, '#2a2833', ink, 0.35);
      box(g, ox - 2.4, b - 40.4, 4.8, 2.4, '#ffffff', ink, 0.3);
    } else if (kind === 1) {
      for (let q = 0; q < 6; q++) leaf(g, ox, b - 36, 5, 1.6, -Math.PI / 2 + (q - 2.5) * 0.45, q % 2 ? '#5f9f5a' : '#3f7f47', '#2f5a35', 0.35);
    } else if (kind === 2) {
      const cols = [M89.pink, M89.teal, M89.lemon, M89.lilac, '#3f5fd8'];
      for (let q = 0; q < 5; q++) box(g, ox - 5 + q * 2.4, b - 41 + (q % 2), 2.2, 8, cols[(q + d.seed) % 5], ink, 0.3);
    } else {
      // a desk fan
      circ(g, ox, b - 40, 3.2, '#e8e4ec', ink, 0.35);
      line(g, ox - 2.4, b - 40, ox + 2.4, b - 40, '#9a96a8', 0.4);
      line(g, ox, b - 42.4, ox, b - 37.6, '#9a96a8', 0.4);
      line(g, ox, b - 36.8, ox, b - 34.5, ink, 0.6);
    }
  }
}

function cubiclesFront(g, it, P, desks) {
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, it.x0, it.x1 - it.x0, b);
  for (const d of desks) {
    const x = d.x;
    const h = (n) => hash(d.seed * 3.17 + n);
    box(g, x, b - 34, 40, 34, P.partition, ink, LWM);
    box(g, x, b - 8, 40, 8, P.partitionDk);
    line(g, x, b - 8, x + 40, b - 8, P.trim, 0.45);
    // pinned up: Post-its, a 1989 calendar, a snapshot, a name card
    const pin = Math.floor(h(1) * 4);
    const px = x + 6 + h(2) * 22;
    if (pin === 0) { box(g, px, b - 28, 5.4, 5.4, '#f6ec8a', ink, 0.3); box(g, px + 3, b - 25, 5.4, 5.4, '#f7b6d0', ink, 0.3); }
    else if (pin === 1) { box(g, px, b - 29, 8, 10, '#f6f2f8', ink, 0.3); box(g, px, b - 29, 8, 2.4, M89.pink); letters(g, '89', px + 4, b - 20.6, 2.6, { ink: '#1f1d26', lw: 0.35, align: 'center' }); }
    else if (pin === 2) { box(g, px, b - 27, 6, 5, '#a9d4e8', ink, 0.3); box(g, px + 1, b - 25, 4, 2, '#7fcfc6'); }
    else box(g, px, b - 26, 9, 3.4, '#4a4658', ink, 0.3);
    const top = Math.floor(h(5) * 5);
    const tx = x + 6 + h(6) * 26;
    if (top === 0 || !d.occupied) { box(g, tx, b - 38.4, 3.4, 3.4, ['#ffffff', M89.pink, M89.teal][Math.floor(h(7) * 3)], ink, 0.35); g.beginPath(); g.arc(tx + 3.6, b - 36.6, 1, -Math.PI / 2, Math.PI / 2); pen(g, ink, 0.35); g.stroke(); }
    else if (top === 1) { box(g, tx, b - 37.4, 3.4, 2.4, '#ffffff', ink, 0.3); rbox(g, tx + 0.6, b - 41.4, 2.2, 4.2, 1, '#5f9a52', ink, 0.3); }
    else if (top === 2) { box(g, tx, b - 38.8, 8, 3.8, '#24222c', ink, 0.3); circ(g, tx + 1.8, b - 36.9, 1.2, '#9a96a8'); circ(g, tx + 6.2, b - 36.9, 1.2, '#9a96a8'); line(g, tx + 7, b - 38.8, tx + 9, b - 43, ink, 0.35); }
  }
  for (let k = 0; k <= desks.length; k++) {
    const x = it.x0 + k * 40;
    box(g, x - 1.1, b - 35.4, 2.2, 35.4, P.trim, ink, 0.4);
  }
  box(g, it.x0 - 1.1, b - 35.4, it.x1 - it.x0 + 2.2, 1.8, P.trimLt, ink, 0.4);
}

function deskList(it, i) {
  const n = Math.round((it.u1 - it.u) / 40);
  const out = [];
  for (let d = 0; d < n; d++) out.push({ x: it.u + d * 40, w: 40, occupied: it.heads.includes(d) || d === it.pop, seed: i * 31 + d });
  return out;
}

function cooler(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 14, b);
  box(g, x, b - 30, 14, 30, '#c7c1d9', ink, LWM);
  box(g, x + 2, b - 13, 10, 2, '#9d97b0', ink, 0.35);
  circ(g, x + 4.6, b - 22, 1.2, M89.pink, ink, 0.3);
  circ(g, x + 9.4, b - 22, 1.2, M89.teal, ink, 0.3);
  box(g, x + 14, b - 29, 3, 11, '#f0ecf4', ink, 0.35);
  box(g, x + 1.5, b - 11.5, 11, 4.5, '#f4ecd2', ink, 0.3);
  letters(g, 'NO GOSSIP', x + 7, b - 8.2, 1.35, { ink: '#292631', lw: 0.2, align: 'center', track: 0.15 });
  box(g, x + 5, b - 32, 4, 2.4, '#8fbcd6', ink, 0.35);
  g.beginPath();
  g.moveTo(x + 2, b - 32);
  g.lineTo(x + 2, b - 42);
  g.quadraticCurveTo(x + 2, b - 45, x + 7, b - 45);
  g.quadraticCurveTo(x + 12, b - 45, x + 12, b - 42);
  g.lineTo(x + 12, b - 32);
  g.closePath();
  fs(g, '#b4dbef', ink, LWM);
  box(g, x + 2.4, b - 38, 9.2, 5.6, '#9ccbe6');
  line(g, x + 3.6, b - 43, x + 3.6, b - 34, 'rgba(255,255,255,0.8)', 0.7);
}

function copier(g, it, P) {
  const { x } = it;
  const w = it.w || 40;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  box(g, x, b - 28, w, 28, '#a89f8a', ink, LWM);
  box(g, x - 1, b - 31, w - 10, 3.4, '#4a4658', ink, LWM);
  box(g, x + w - 11, b - 31, 11, 3.4, '#8a826f', ink, LWM);
  circ(g, x + w - 8, b - 29.4, 0.6, '#6cd06a');
  circ(g, x + w - 5.6, b - 29.4, 0.6, M89.pink);
  box(g, x + w - 4, b - 30.2, 2.6, 1.4, '#8affaa');
  for (let k = 0; k < 3; k++) {
    box(g, x + 2, b - 22 + k * 6.4, w - 4, 5.4, '#b3aa95', ink, 0.35);
    box(g, x + w / 2 - 4, b - 20.6 + k * 6.4, 8, 1.2, '#6f6857');
  }
  line(g, x + 2, b - 23.5, x + w - 2, b - 23.5, M89.teal, 0.6);
  poly(g, [x, b - 24, x - 7, b - 26, x - 7, b - 23, x, b - 21], '#8a826f', ink, 0.35);
  poly(g, [x - 1, b - 25, x - 6, b - 26.4, x - 6, b - 25.4, x - 1, b - 24], '#e6e0cf', ink, 0.3);
  box(g, x + w - 13, b - 21, 10, 5, '#f4ecd2', ink, 0.3);
  letters(g, 'JAM', x + w - 8, b - 17.3, 1.8, { ink: '#9b2f36', lw: 0.25, align: 'center', track: 0.15 });
}

function cabinet(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 20, b);
  box(g, x, b - 44, 20, 44, '#7fb3ad', ink, LWM);
  const labels = ['NOW', 'LATER', 'LATER', 'NEVER'];
  for (let k = 0; k < 4; k++) {
    const y = b - 43 + k * 10.6;
    box(g, x + 1.6, y, 16.8, 9.6, '#8cc0b9', ink, 0.35);
    box(g, x + 2.4, y + 1, 15.2, 3.6, '#f4f0e6', ink, 0.25);
    letters(g, labels[k], x + 10, y + 3.9, 1.8, { ink: '#292631', lw: 0.25, align: 'center', track: 0.2 });
    box(g, x + 6.4, y + 5.4, 7.2, 1.2, '#1f1d26');
  }
  const top = Math.floor(hash(it.i * 5.1) * 3);
  if (top === 0) {
    // the fax machine, a curl of paper coming out of it
    box(g, x + 1.5, b - 49, 17, 5, '#d6cdb8', ink, 0.35);
    box(g, x + 3, b - 50.4, 7, 1.4, '#3a3846', ink, 0.25);
    circ(g, x + 14, b - 47.4, 0.7, '#6cd06a');
    g.beginPath();
    g.moveTo(x + 5, b - 50.4);
    g.quadraticCurveTo(x + 4, b - 56, x + 9, b - 55);
    pen(g, '#f4f0e6', 1.4);
    g.stroke();
  } else if (top === 1) {
    circ(g, x + 10, b - 50, 4.4, '#e8e4ec', ink, 0.35);
    line(g, x + 10, b - 46, x + 10, b - 44, ink, 0.6);
    box(g, x + 7, b - 45, 6, 1.4, M89.pink, ink, 0.3);
  } else {
    pot(g, x + 10, b - 44, 7, 5, '#f2eff6', '#1f1d26', ink);
    for (let q = 0; q < 5; q++) leaf(g, x + 10, b - 50, 6, 1.6, -Math.PI / 2 + (q - 2) * 0.5, '#5f9f5a', '#2f5a35', 0.35);
  }
}

// The meeting-room chair seen from behind, and how much of its sitter shows round it (Peter,
// 14 Oct 2026: "dont love these chairs - they look like they are part of the peoples bodies").
// The old one was a dark back as wide as the shoulders, in the suits' own slate, covering the
// jacket from the shoulders down: it read as the body. The lab's office-chair bake-off
// (src/dev/office-chair-candidates.js) tries the others through this seam.
//   now        the old high back, charcoal
//   low        a low typist's back at the waist, charcoal, the jacket whole above it
//   lowFabric  the same in the floor's upholstery — teal on 23, oxblood leather on 88
//   elbows     lowFabric with the sitter's elbows out on the table either side
//   high       a high back kept, but narrower than the shoulders and in the upholstery
//   mix        lowFabric for everyone, about half of them leaning in on their elbows (B and C
//              mixed, Peter 15 Oct 2026); who leans is fixed per seat (`leansIn`)
export const OFFICE_CHAIR_STYLES = ['now', 'low', 'lowFabric', 'elbows', 'high', 'mix'];
// Who leans in on the table under `mix`: a fixed, uneven pattern by seat, so a room is never a
// strict lean / sit / lean / sit (training CBCC, meetings BCCB, interview BC, boardroom BCBCCB).
const leansIn = (seed) => (seed + Math.floor(seed / 3)) % 2 === 0;
// SHIPPED 15 Oct 2026: D, the upholstered high back, narrower than the shoulders, seat in the
// back's fabric and a chrome base (Peter: B first — "i don't like the elbows" — then "the high
// back chairs are better for both levels... different to a typist chair"). The others stay for
// the lab sheet.
let CHAIR_STYLE = 'high';
export function setOfficeChairStyle(style) {
  const was = CHAIR_STYLE;
  CHAIR_STYLE = OFFICE_CHAIR_STYLES.includes(style) ? style : 'high';
  return was;
}
const chairFabric = (P) => (CHAIR_STYLE === 'low' || CHAIR_STYLE === 'now'
  ? ['#2a2832', '#3a3844']
  : P === PAL.exec ? ['#5e1c28', '#7c2c38'] : ['#2a8079', '#3c9c94']);
// A swivel chair seen from behind: its back in front of the sitter's back.
function chairFromBehind(g, c, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  if (CHAIR_STYLE !== 'now') {
    const [fab, fabLt] = chairFabric(P);
    const high = CHAIR_STYLE === 'high';
    const seatY = high ? b - 14.6 : b - 16.4, seatB = seatY + 2.4;
    // Chrome only below the seat (Peter, 15 Oct 2026: "can the chrome only extend to the bottom of
    // the seat not to the seat back. can the wheels be chrome too?"): the gas stem from under the
    // seat to the hub, drawn first so the seat sits on it; the five-star base outlined, with a
    // hub; the castors chrome as well.
    line(g, c.x, seatB, c.x, b - 3, ink, 2.2);
    line(g, c.x, seatB, c.x, b - 3, P.chrome, 1.4);
    for (const wx of [c.x - 7, c.x, c.x + 7]) {
      circ(g, wx, wx === c.x ? b - 1.1 : b - 1.3, wx === c.x ? 1.1 : 1.4, P.chrome, ink, 0.3);
      circ(g, wx, wx === c.x ? b - 1.1 : b - 1.3, 0.4, '#5a5866');
    }
    line(g, c.x - 7, b - 2.6, c.x + 7, b - 2.6, ink, 2.1);
    line(g, c.x - 7, b - 2.6, c.x + 7, b - 2.6, P.chrome, 1.3);
    line(g, c.x - 6, b - 2.9, c.x + 6, b - 2.9, '#f2f4f8', 0.4);
    box(g, c.x - 1.4, b - 3.8, 2.8, 2.2, P.chrome, ink, 0.3);
    // the seat, in the back's fabric so seat and back are one chair
    box(g, c.x - 8.5, seatY, 17, 2.4, fab, ink, 0.35);
    line(g, c.x - 7.6, seatY + 0.6, c.x + 7.6, seatY + 0.6, fabLt, 0.5);
    if (high) {
      // the high back, its foot down on the seat: attached, not floating above it
      topRound(g, c.x - 6.5, b - 31, 13, 18.4, 5, fab, ink, LWM);
      topRound(g, c.x - 4.8, b - 29.4, 9.6, 13.4, 3.6, fabLt, null, 0);
    } else {
      // the low back on a dark upright that runs down into the seat
      box(g, c.x - 1.1, b - 18.4, 2.2, 2.6, '#24222c', ink, 0.3);
      topRound(g, c.x - 6, b - 26.5, 12, 8.5, 3.4, fab, ink, LWM);
      topRound(g, c.x - 4.4, b - 25.2, 8.8, 5.6, 2.4, fabLt, null, 0);
    }
    return;
  }
  topRound(g, c.x - 8.5, b - 32, 17, 20, 5, '#2a2832', ink, LWM);
  topRound(g, c.x - 6.5, b - 30, 13, 15, 4, '#3a3844', null, 0);
  line(g, c.x, b - 12, c.x, b - 3, P.chrome, 1.5);
  line(g, c.x - 7, b - 2, c.x + 7, b - 2, '#24222c', 1.5);
  circ(g, c.x - 7, b - 1.5, 1.4, '#24222c');
  circ(g, c.x + 7, b - 1.5, 1.4, '#24222c');
}
function boardroomBack(g, it, P, chairs) {
  const b = MID_BASE;
  const ink = P.inkM;
  for (const c of chairs) {
    topRound(g, c.x - 8, b - 46, 16, 28, 5, '#2a2832', ink, LWM);
    topRound(g, c.x - 6, b - 44, 12, 22, 4, '#3a3844', null, 0);
    lines(g, [c.x - 6, b - 37, c.x + 6, b - 37, c.x - 6, b - 30, c.x + 6, b - 30], '#24222c', 0.5);
    line(g, c.x, b - 18, c.x, b - 3, P.chrome, 1.5);
    line(g, c.x - 7, b - 2, c.x + 7, b - 2, '#24222c', 1.5);
    circ(g, c.x - 7, b - 1.5, 1.4, '#24222c');
    circ(g, c.x + 7, b - 1.5, 1.4, '#24222c');
  }
}

function boardroomFront(g, it, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  const { x0, x1 } = it;
  shadowFoot(g, x0, x1 - x0, b);
  for (let x = x0 + 18; x < x1 - 10; x += 35) {
    const k = Math.round((x - x0) / 35);
    if (k % 3 === 0) { poly(g, [x - 2, b - 27, x + 2, b - 27, x + 1.6, b - 33, x + 1, b - 34, x - 1, b - 34, x - 1.6, b - 33], '#cfe3ec', ink, 0.35); box(g, x - 1.8, b - 30, 3.6, 3, '#a9cfe2'); }
    else if (k % 3 === 1) { box(g, x - 5, b - 28.4, 9, 1.4, '#ffffff', ink, 0.3); circ(g, x + 7, b - 29, 1.8, '#2a2833', ink, 0.3); }
    else { box(g, x - 5, b - 34, 10, 7, '#d9d1bc', ink, 0.35); box(g, x - 3.6, b - 32.6, 7.2, 4.4, '#1d3a2a'); }
  }
  // black lacquer, a chrome edge, chrome drum legs
  box(g, x0, b - 27, x1 - x0, 4, '#25232e', ink, LWM);
  line(g, x0, b - 25.6, x1, b - 25.6, P.chrome, 0.6);
  box(g, x0 + 4, b - 23, x1 - x0 - 8, 3.2, '#1b1a22', ink, LWM);
  // `legsAt`: the pedestals' places as fractions along the table, where a room seats people at
  // it — floor 88's boardroom puts them between the chairs, since with the glass clear below the
  // table a chrome drum straight behind a sitter's legs read as a white bag hanging off the seat
  const legs = it.legsAt ? it.legsAt.map((u) => x0 + (x1 - x0) * u) : [x0 + 18, (x0 + x1) / 2, x1 - 18];
  for (const px of legs) {
    box(g, px - 3.4, b - 20, 6.8, 17, P.chrome, ink, LWM);
    line(g, px - 1.4, b - 19, px - 1.4, b - 4, '#f2f4f8', 0.6);
    box(g, px - 7, b - 3, 14, 3, '#1b1a22', ink, LWM);
  }
}

function easel(g, x, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  lines(g, [x + 3, b, x + 9, b - 52, x + 21, b, x + 15, b - 52, x + 12, b - 20, x + 12, b - 52], '#6a4a2e', 1);
  box(g, x, b - 50, 24, 30, '#e3dccb', ink, LWM);
  box(g, x - 1, b - 51.4, 26, 2.4, '#3d3f48', ink, 0.35);
  // the chart sits below a title big enough to read in passing
  const cy = (dy) => b - 25.5 + (dy + 24) * 0.66;
  lines(g, [x + 3, b - 40, x + 3, b - 25.5, x + 3, b - 25.5, x + 21, b - 25.5], '#3a5aa8', 0.5);
  g.beginPath();
  g.moveTo(x + 4, cy(-44));
  [[7, -36], [10, -38], [12, -29], [15, -27], [17, -33], [21, -42]].forEach(([dx, dy]) => g.lineTo(x + dx, cy(dy)));
  pen(g, '#c8433a', 0.8);
  g.stroke();
  letters(g, 'VIBES', x + 12, b - 42.6, 5.2, { ink: '#2c4a96', lw: 0.7, align: 'center', track: 0.3 });
  letters(g, 'Q1 Q2 Q3 Q4', x + 12, b - 21.6, 2.3, { ink: '#2c4a96', lw: 0.4, align: 'center' });
}

function execDesk(g, it, P) {
  const { x, w } = it;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, w, b);
  const cx = x + w / 2;
  topRound(g, cx - 11, b - 54, 22, 26, 7, '#2a2832', ink, LWM);
  lines(g, [cx - 9, b - 46, cx + 9, b - 46, cx - 9, b - 38, cx + 9, b - 38], '#24222c', 0.5);
  // the Tizio lamp: black arms, a counterweight, a little head throwing a pool of light
  const lx = x + w * 0.2;
  box(g, lx - 3, b - 33, 6, 1.6, '#1b1a22', ink, 0.35);
  lines(g, [lx, b - 33, lx + 2, b - 44, lx + 2, b - 44, lx + 12, b - 46, lx + 2, b - 44, lx - 4, b - 41], '#1b1a22', 0.7);
  circ(g, lx - 4, b - 41, 1.1, '#1b1a22');
  circ(g, lx + 2, b - 44, 0.6, M89.red);
  poly(g, [lx + 10.4, b - 46.4, lx + 14, b - 47.4, lx + 14, b - 44.6], '#1b1a22', ink, 0.3);
  poly(g, [lx + 11.4, b - 45.6, lx + 14, b - 45, lx + 18, b - 31, lx + 6, b - 31], 'rgba(255,240,220,0.3)');
  // a Rolodex, Newton's cradle, the cordless with its aerial
  circ(g, x + w * 0.62, b - 34.6, 2.8, '#1b1a22', ink, 0.35);
  box(g, x + w * 0.62 - 2.2, b - 37.2, 4.4, 2, '#ffffff', ink, 0.25);
  lines(g, [x + w * 0.74, b - 32, x + w * 0.74, b - 38, x + w * 0.74, b - 38, x + w * 0.74 + 10, b - 38, x + w * 0.74 + 10, b - 38, x + w * 0.74 + 10, b - 32], P.chrome, 0.6);
  for (let k = 0; k < 4; k++) {
    const bx = x + w * 0.74 + 2.6 + k * 1.6;
    line(g, bx, b - 38, bx, b - 34, '#8e95a4', 0.25);
    circ(g, bx, b - 33.6, 0.8, P.chrome, ink, 0.2);
  }
  box(g, x + w * 0.9, b - 34, 3.4, 2.6, '#e6dccb', ink, 0.3);
  line(g, x + w * 0.9 + 2.6, b - 34, x + w * 0.9 + 2.6, b - 39, ink, 0.4);
  // the desk itself: black lacquer slab, chrome edges, a pink pinstripe
  box(g, x - 2, b - 31.4, w + 4, 3.4, '#1b1a22', ink, LWM);
  line(g, x - 2, b - 30.2, x + w + 2, b - 30.2, P.chrome, 0.7);
  box(g, x, b - 28, w, 28, '#25232e', ink, LWM);
  box(g, x + 30, b - 26, w - 60, 20, '#16141c', ink, 0.4);
  letters(g, 'ASK MY ASSISTANT', x + w / 2, b - 14, 2.35, { ink: P.chrome, lw: 0.3, align: 'center', track: 0.3 });
  for (const px of [x + 2, x + w - 28]) {
    for (let k = 0; k < 3; k++) {
      box(g, px, b - 26 + k * 8.4, 26, 7.4, '#2e2b38', ink, 0.4);
      box(g, px + 9, b - 23.4 + k * 8.4, 8, 1.2, P.chrome, ink, 0.25);
    }
  }
  line(g, x, b - 5, x + w, b - 5, M89.pink, 0.6);
  box(g, x - 1, b - 3, w + 2, 3, '#16141c', ink, LWM);
}

function libGlobe(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 18, b);
  lines(g, [x + 9, b - 14, x + 9, b - 2, x + 3, b - 1, x + 15, b - 1], P.chrome, 1.2);
  box(g, x + 1, b - 16, 16, 2, '#1b1a22', ink, 0.4);
  circ(g, x + 9, b - 25, 8, '#9fd6e8', ink, LWM);
  g.save();
  g.beginPath();
  g.arc(x + 9, b - 25, 8, 0, TAU);
  g.clip();
  for (const [dx, dy, rx, ry] of [[-3, -3, 3.5, 2.6], [3, 1, 2.6, 4], [-2, 4, 2, 1.6]]) ell(g, x + 9 + dx, b - 25 + dy, rx, ry, '#f6a9c9', '#c96a96', 0.3);
  g.restore();
  g.beginPath();
  g.arc(x + 9, b - 25, 10, Math.PI * 0.62, Math.PI * 2.38);
  pen(g, P.chrome, 1);
  g.stroke();
}

function tallClock(g, it, P) {
  const x = it.x;
  const b = MID_BASE;
  const ink = P.inkM;
  shadowFoot(g, x, 20, b);
  box(g, x, b - 16, 20, 16, '#25232e', ink, LWM);
  box(g, x + 3, b - 13, 14, 10, '#3a3846', ink, 0.4);
  box(g, x + 3, b - 50, 14, 34, '#25232e', ink, LWM);
  box(g, x + 6, b - 47, 8, 27, '#141218', ink, 0.4);
  box(g, x + 1, b - 70, 18, 20, '#25232e', ink, LWM);
  poly(g, [x - 1, b - 70, x + 10, b - 80, x + 21, b - 70], '#f6a9c9', ink, LWM);
  circ(g, x + 10, b - 73.5, 1.6, '#7fcfc6', ink, 0.3);
  circ(g, x + 10, b - 60, 7, P.chrome, ink, 0.4);
  circ(g, x + 10, b - 60, 5.8, '#ffffff', ink, 0.35);
  g.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU;
    g.moveTo(x + 10 + Math.sin(a) * 4.2, b - 60 - Math.cos(a) * 4.2);
    g.lineTo(x + 10 + Math.sin(a) * 5.4, b - 60 - Math.cos(a) * 5.4);
  }
  pen(g, ink, 0.45);
  g.stroke();
}

function paintMid(g, F, P, u0, u1, layer, selection = 'all') {
  BAKING.floor = F.id;
  const per = F.mid.period;
  // palms in white pots, every one of them, with a black lacquer rim
  const PP = { ...P, pot: '#edeaf2', potDk: '#1f1d26' };
  F.mid.items.forEach((it, i) => {
    if (selection === 'cubicles' && it.kind !== 'cubicles') return;
    if (selection === 'other' && it.kind === 'cubicles') return;
    if (it.kind === 'cubicles' || it.kind === 'boardroom') {
      for (const x0 of copies(it.u - 40, it.u1 - it.u + 80, per, u0, u1)) {
        const off = x0 + 40 - it.u;
        const span = { ...it, x0: it.u + off, x1: it.u1 + off };
        if (it.kind === 'cubicles') {
          const desks = deskList(it, i).map((d) => ({ ...d, x: d.x + off }));
          if (layer === 'back') cubiclesBack(g, span, PP, desks);
          else cubiclesFront(g, span, PP, desks);
        } else {
          const pitch = (it.u1 - it.u) / it.seats;
          const chairs = [];
          for (let s = 0; s < it.seats; s++) chairs.push({ x: span.x0 + pitch * (s + 0.5) });
          if (layer === 'back') boardroomBack(g, span, PP, chairs);
          else { boardroomFront(g, span, PP); if (it.easel) easel(g, span.x1 + 6, PP); }
        }
      }
      return;
    }
    if (layer === 'back') return;
    const w = it.w ?? 0;
    for (const x0 of copies(it.u - 30, w + 90, per, u0, u1)) {
      const x = x0 + 30;
      const m = { ...it, x, w, i };
      switch (it.kind) {
        case 'plant': plant(g, x, MID_BASE, it.variant, PP, i * 7 + (F.id === 'open' ? 3 : 0)); break;
        case 'reception': reception(g, m, PP, 'front'); break;
        case 'turnstiles': turnstiles(g, m, PP); break;
        case 'sofa': sofa(g, m, PP, F.id === 'exec'); break;
        case 'sidetable': sideTable(g, m, PP); break;
        case 'sculpture': sculpture(g, m, PP); break;
        case 'cooler': cooler(g, m, PP); break;
        case 'copier': copier(g, m, PP); break;
        case 'cabinet': cabinet(g, m, PP); break;
        case 'desk': execDesk(g, m, PP); break;
        case 'globe': libGlobe(g, m, PP); break;
        case 'tallclock': tallClock(g, m, PP); break;
        default: break;
      }
    }
  });
}

// THE FLOOR EVACUATING (office-2's fire alarm, Peter, 15 Oct): seconds since the
// third alarm went, or null. Set once per frame by STYLE.paint. Each seated worker
// gets up at their own moment, walks off to the right towards the fire exit, and
// their seat stays empty after.
// THE ROOM CLEARS IN VIEW: a worker gets up when they are on screen with the alarm
// going (or at the alarm, if already in view), so the room you are running past is
// the one you see empty — not one that emptied while it was a screen away.
let EVAC = null, EVAC_NOW = 0, EVAC_EXIT = null;
const EVAC_START = new Map();
export function setOfficeEvacuation(t, now = 0) {
  EVAC = Number.isFinite(t) ? t : null;
  EVAC_NOW = now;
  if (EVAC == null) EVAC_START.clear();
}
// A room's way out, in screen x (rooms.js sets it around the interview room's people): a
// worker who reaches it has gone through the door. Elsewhere they walk on until off screen.
export function setOfficeEvacExit(x) { EVAC_EXIT = Number.isFinite(x) ? x : null; }
const EVAC_SPEED = 26, EVAC_IN_VIEW = 400, EVAC_ROOM_AT = 300;
// How long a worker has been walking out, or null while still seated, or 'gone'.
function evacuee(key, x) {
  if (EVAC == null) return null;
  let start = EVAC_START.get(key);
  if (start == null) {
    // In view as the alarm goes: they get up one by one. Met later on: they are already
    // up and walking — the floor has been leaving for a while (Peter, 15 Oct: "id like to
    // see the cubicle workers moving out not empty desks").
    if (EVAC_EXIT != null) {
      // A meeting room's people get up as the hero runs past them, one after another, and are
      // still shuffling to the door when the room leaves the picture (Peter, 15 Oct: "they stand
      // up as we move across them")
      if (x > EVAC_ROOM_AT) return null;
      start = EVAC_NOW + hash(key * 3.17 + 9) * 0.5;
    } else if (EVAC < 2.5) {
      if (x > EVAC_IN_VIEW) return null;
      start = EVAC_NOW + 0.3 + hash(key * 3.17 + 9) * 2.2;
    } else start = EVAC_NOW - hash(key * 3.17 + 9) * 1.6;
    EVAC_START.set(key, start);
  }
  const s = EVAC_NOW - start;
  if (s < 0) return null;
  return x + s * evacSpeed() < -80 ? 'gone' : s;
}
// In a room with its door, people shuffle towards it slowly — the room has scrolled away
// before they reach it — and anyone who does get there waits at it rather than vanishing
// (Peter, 15 Oct).
const evacSpeed = () => (EVAC_EXIT != null ? 7 : EVAC_SPEED);
// A cubicle worker standing up at their desk when the alarm goes and looking about — up
// over the partition, hands on the rail, head turning (the pop's own pose): 0..1 how far up,
// or null while the alarm is not going. Nobody walks off; the floor just stands and stares
// (Peter, 15 Oct: "perhaps they all stand up from their cubes and look around").
function standUp(key, x) {
  if (EVAC == null) return null;
  let start = EVAC_START.get(key);
  if (start == null) {
    start = EVAC < 2.5 && x <= EVAC_IN_VIEW ? EVAC_NOW + 0.15 + hash(key * 3.17 + 9) * 1.2 : EVAC_NOW - 2;
    EVAC_START.set(key, start);
  }
  const u = Math.max(0, Math.min(1, (EVAC_NOW - start) / 0.45));
  return u * u * (3 - 2 * u);
}

// A worker on their feet and walking, side on, feet at (x, b): the office's own
// person (personFor), trousers and shoes, the shirt torso, one arm swinging.
export function walkerSide(ctx, x, b, p, seed, s, ink) {
  const ph = s * 9 + seed, stride = Math.sin(ph) * 4.2;
  const trousers = ['#2b2936', '#3a3548', '#262a36', '#4a4458'][seed % 4];
  const hipY = b - 25, top = b - 44;
  for (const leg of [-1, 1]) {
    const fx = x + stride * leg;
    poly(ctx, [x - 2.4, hipY, x + 2.4, hipY, fx + 1.8, b - 2, fx - 1.8, b - 2], trousers, ink, 0.4);
    rbox(ctx, fx - 1.6, b - 2.6, 5, 2.6, 1, '#1b1922', ink, 0.35);
  }
  ctx.beginPath();
  ctx.moveTo(x - 4.6, top + 2);
  ctx.quadraticCurveTo(x - 5.4, top + 10, x - 3.8, hipY + 1);
  ctx.lineTo(x + 4.2, hipY + 1);
  ctx.quadraticCurveTo(x + 5.6, top + 10, x + 4.4, top + 2);
  ctx.quadraticCurveTo(x, top - 0.6, x - 4.6, top + 2);
  ctx.closePath();
  fs(ctx, p.shirt, ink, 0.45);
  if (p.zombie) {
    // a zombie in the queue, side on like everyone else (Peter, 15 Oct): the tie, and the
    // arm held straight out in front at shoulder height, hand drooping, bobbing a little
    line(ctx, x + 3.4, top + 2.4, x + 3.8, top + 11, p.tie || '#c8433a', 1.3);
    const bob = Math.sin(ph * 0.5) * 0.8;
    poly(ctx, [x - 1, top + 2.4, x + 1.6, top + 2.2, x + 13, top + 5 + bob, x + 13, top + 7.6 + bob], p.shirt, ink, 0.4);
    circ(ctx, x + 14, top + 7 + bob, 1.6, p.skin, ink, 0.3);
    if (p.carry) rbox(ctx, x - 6.5, top + 12, 5, 4, 0.6, '#9a5a32', ink, 0.3);
  } else {
    const sw = -Math.sin(ph) * 4.4;
    poly(ctx, [x - 1.2, top + 3, x + 1.4, top + 3, x + sw + 1.2, top + 15, x + sw - 1.2, top + 15], p.shirt, ink, 0.4);
    circ(ctx, x + sw, top + 15.6, 1.5, p.skin, ink, 0.3);
  }
  workerHead(ctx, x + 0.6, top - 5.6, 5, p, seed, 'right');
}
function walkOut(ctx, x0, b, p, seed, s, ink) {
  let x = x0 + s * evacSpeed(), step = s * evacSpeed() / EVAC_SPEED;
  if (EVAC_EXIT != null && x > EVAC_EXIT - (seed % 3) * 12) { x = EVAC_EXIT - (seed % 3) * 12; step = 0.35 + (seed % 2); }
  walkerSide(ctx, x, b, p, seed, step, ink);
}

function midActors(ctx, f, P) {
  const b = MID_BASE;
  const ink = P.inkM;
  for (const m of f.mid.items) {
    if (m.kind === 'cubicles') {
      for (let d of m.desks) {
        if (!d.occupied) continue;
        const p = personFor(d.seed);
        const up = standUp(d.evacKey ?? d.seed, d.x + 18);
        if (up != null) {
          const key = d.evacKey ?? d.seed;
          d = { ...d, pop: Math.max(d.pop, up), look: Math.sin(EVAC_NOW * 1.7 + key * 1.3) > 0 ? 1 : -1 };
        }
        const cx = d.x + 20 + (hash(d.seed * 7.31 + 1) - 0.5) * 4 - 3;
        const y = b - 42 + d.dy - d.pop * 12;
        // shoulder pads, whoever you are
        // A peeking worker straightens behind the partition. Keep the shirt
        // connected below its top even at the highest point of the animation.
        const shouldersY = y + 4.4;
        cubicleBack(ctx, cx, shouldersY, p.shirt, ink, d.pop > 0.5);
        if (d.pop > 0.5) {
          circ(ctx, cx - 9.5 * BACK_SLIM, b - 35.6, 1.7, p.skin, ink, 0.35);
          circ(ctx, cx + 9.5 * BACK_SLIM, b - 35.6, 1.7, p.skin, ink, 0.35);
        }
        workerHead(ctx, cx, y, 5, p, d.seed, d.pop > 0.15 ? (d.look > 0 ? 'right' : 'left') : 'back');
      }
    } else if (m.kind === 'boardroom') {
      for (const c of m.chairs) {
        if (!c.sitter) continue;
        const p = personFor(c.seed + 400);
        const out = evacuee(c.seed + 400, c.x);
        if (out === 'gone') continue;
        if (out != null) { walkOut(ctx, c.x, b, p, c.seed + 400, out, ink); continue; }
        const suit = ['#3d3a4e', '#5a5470', '#2f3346', '#6a6480'][c.seed % 4];
        const y = b - 40 + c.nod * 3.4;
        if (c.away) {
          // Facing the far wall and its whiteboard: the back of the jacket and the head, with
          // the chair back drawn over them by the caller.
          const trousers = ['#2b2936', '#3a3548', '#262a36', '#4a4458'][c.seed % 4];
          if (CHAIR_STYLE !== 'now') {
            // Below the seat the lower legs go down to the floor, a little apart, the shoes'
            // heels flat on it just beyond the chair's base (which the caller draws in front):
            // feet on the floor, not dangling (Peter, 14 Oct 2026: "is that chair legs or the
            // humans legs?"). Every other sitter taps one heel.
            for (const side of [-1, 1]) {
              const tap = side > 0 && c.seed % 2 ? Math.max(0, Math.sin(c.nod * 40 + c.seed)) * 1.2 : 0;
              const kx = c.x + side * 4.2, fx = c.x + side * 5.2, fy = b - 4.4 - tap;
              poly(ctx, [kx - 2, b - 15, kx + 2, b - 15, fx + 1.7, fy, fx - 1.7, fy], trousers, ink, 0.4);
              rbox(ctx, fx - 2.2, fy - 0.4, 4.4, 2.6, 1, '#1b1922', ink, 0.35);
            }
          } else for (const side of [-1, 1]) {
            const kx = c.x + side * 4, sw = Math.sin(c.nod * 9 + side * 1.7 + c.seed) * 0.9;
            const fx = kx + side * 0.6 + sw, fy = b - 8;
            poly(ctx, [kx - 2.1, b - 15, kx + 2.1, b - 15, fx + 1.8, fy, fx - 1.8, fy], trousers, ink, 0.4);
            rbox(ctx, fx - 2.6, fy - 0.8, 5.2, 3.6, 1.2, '#1b1922', ink, 0.35);
          }
          if (CHAIR_STYLE === 'now') padded(ctx, c.x, b - 33.5, 18, 10.5, suit, ink, LWM);
          else seatedBack(ctx, c.x, suit, ink, CHAIR_STYLE === 'elbows' || (CHAIR_STYLE === 'mix' && leansIn(c.seed)));
          const pp = { ...p, style: p.style === 'bun' || p.style === 'quiff' ? 'short' : p.style, hair: c.seed % 3 === 0 ? '#c9c4ba' : p.hair };
          ctx.save();
          ctx.translate(c.x, y + 4);
          ctx.rotate(c.nod * 0.18 * (c.seed % 2 ? 1 : -1));
          workerHead(ctx, 0, -4, 5, pp, c.seed + 400, 'back');
          ctx.restore();
          continue;
        }
        // Seated legs remain visible beneath the open conference table.
        for(const side of [-1,1]){
          const hip=c.x+side*3.5;
          poly(ctx,[hip-2.3,b-24,hip+2.3,b-24,hip+side*2+2,b-5,hip+side*2-2,b-5],suit,ink,0.4);
          rbox(ctx,hip+side*2-2.5,b-5,7,4,1.2,'#1b1922',ink,0.35);
        }
        padded(ctx, c.x, b - 33.5, 18, 10.5, suit, ink, LWM);
        poly(ctx, [c.x - 2.2, b - 33.5, c.x + 2.2, b - 33.5, c.x, b - 28], '#ffffff', ink, 0.3);
        line(ctx, c.x, b - 32, c.x, b - 27, [M89.pink, M89.teal, M89.lemon, M89.lilac][c.seed % 4], 1.4);
        const pp = { ...p, style: p.style === 'bun' || p.style === 'quiff' ? 'short' : p.style, hair: c.seed % 3 === 0 ? '#c9c4ba' : p.hair };
        ctx.save();
        ctx.translate(c.x, y + 4);
        ctx.rotate(c.nod * 0.18 * (c.seed % 2 ? 1 : -1));
        head(ctx, 0, -4, 5, pp, 'front', ink, LWM, c.nod > 0.25);
        ctx.restore();
        if (c.nod > 0.55 && c.seed % 3 !== 1) {
          const k = (c.nod - 0.55) / 0.3;
          letters(ctx, 'Z', c.x + 6 + k * 2, y - 6 - k * 4, 2.6, { ink: '#b39ae6', lw: 0.45 });
          if (k > 0.5) letters(ctx, 'Z', c.x + 9 + k * 2, y - 10 - k * 4, 2, { ink: '#b39ae6', lw: 0.4 });
        }
      }
    } else if (m.kind === 'reception') {
      // Compact styled hair keeps the face, earrings and headset readable.
      const p = { skin: '#f2cfae', hair: m.hairColor || '#c9703a', style: 'perm', glasses: false };
      const cx = m.x + m.w * 0.42;
      const y = b - 44 + m.dy;
      padded(ctx, cx, y + 4.6, 20, 12, '#d8408a', ink, LWM);
      poly(ctx, [cx - 2.4, y + 4.6, cx + 2.4, y + 4.6, cx, y + 9], '#ffffff', ink, 0.3);
      studyHead(ctx, cx, y, 5, m.hairStyle || 'eighties', false, p.skin, p.hair);
      circ(ctx, cx - 5, y + 2.6, 1.2, null, '#e8c840', 0.6);
      circ(ctx, cx + 5, y + 2.6, 1.2, null, '#e8c840', 0.6);
      headset(ctx, cx, y);
    }
  }
}

function headset(ctx, cx, y) {
  ctx.beginPath();
  ctx.arc(cx, y - 0.5, 5.6, Math.PI * 1.05, Math.PI * 1.95);
  pen(ctx, '#2e2c2a', 0.6);
  ctx.stroke();
  line(ctx, cx + 5.2, y + 0.6, cx + 2.4, y + 3.8, '#2e2c2a', 0.45);
}

function midDevices(ctx, f, P) {
  const b = MID_BASE;
  for (const m of f.mid.items) {
    if (m.kind === 'cooler' && m.bubble >= 0) {
      const r = 0.9 + m.bubble * 1.1;
      circ(ctx, m.x + 7 + Math.sin(m.bubble * 9) * 1.2, b - 33.5 - m.bubble * 9.5, r, '#e8f6ff', '#5f8fae', 0.35);
    } else if (m.kind === 'copier' && m.scan >= 0) {
      const w = m.w || 40;
      const sx = m.x + 1 + m.scan * (w - 14);
      box(ctx, sx, b - 28.6, 3, 1.2, '#c8ffe8');
      box(ctx, sx - 2, b - 27.4, 7, 2.6, 'rgba(200,255,232,0.4)');
    } else if (m.kind === 'tallclock') {
      const x = m.x + 10;
      const bx = x + m.swing * 3;
      line(ctx, x, b - 46, bx, b - 26, P.brassDk, 0.6);
      circ(ctx, bx, b - 25, 2.4, P.brass, P.inkM, 0.35);
      const cy = b - 60;
      line(ctx, x, cy, x + Math.sin(f.clock.hourA) * 3, cy - Math.cos(f.clock.hourA) * 3, P.ink, 0.7);
      line(ctx, x, cy, x + Math.sin(f.clock.minuteA) * 4.6, cy - Math.cos(f.clock.minuteA) * 4.6, P.ink, 0.5);
    }
  }
}

export { HAIRS as OFFICE_HAIRS, SHIRTS as OFFICE_SHIRTS, SKINS as OFFICE_SKINS, chairFromBehind, ceiling, ceilingLights, lights, globeGlint, floorPlane, sunPatches, slab, CHIP_P, CHIPS, chips, memphisRug, padded, BAKING, lampSheen, SKINS, HAIRS, STYLES, SHIRTS, personFor, head, shadowFoot, pot, leaf, plant, reception, turnstiles, sofa, sculpture, cubiclesBack, cubiclesFront, deskList, cooler, copier, cabinet, boardroomBack, boardroomFront, easel, execDesk, libGlobe, tallClock, paintMid, midActors, headset, midDevices };
