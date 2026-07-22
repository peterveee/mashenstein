// The wall behind the cabinets. THE LAST FUNCTIONING FOOD COURT used to be a
// flat #241c30 rectangle from the ceiling to the floor line, which read as
// "dark" rather than as "derelict" — nothing in it said anyone had ever worked
// here. These are candidate dressings for that band: five ways to fill it,
// drawn in the same flat-cartoon vector language as props.js and arcade.js
// (whose helpers this borrows rather than forking).
//
// Every painter is laid out against a BAY — one ceiling-light span of wall,
// 130 wide by the wall's own 150 tall — and takes its placement as fractions of
// that box, so a bay can be drawn at any size and the dressing moves with it.
// Painters are deliberately side-effect free and deterministic: they are called
// every frame, so a Math.random() anywhere here would make the wall crawl.
import { rr, shape, plain, stroke } from './props.js';

// The wall band, mirroring hub/index.js: ceiling at 40, floor line at 190.
// A bay is one ceiling-light span wide (the lights sit every 130px).
export const WALL_Y0 = 40, WALL_Y1 = 190, WALL_H = WALL_Y1 - WALL_Y0;
export const BAY_W = 130;

// The hub's own wall colours, so a dressed bay sits on exactly the surface the
// concourse already paints rather than a lookalike.
export const WALL_BASE = '#241c30';
export const WALL_TRIM = '#38304a';
const INK = '#100c18';

// Outline unit: props.js scales its black line as 0.055 * max(w,h), tuned for
// 13px obstacles. A 130px bay would come out with a 7px border, so — as
// arcade.js does — these pass their own unit to keep the line at about 0.7px.
const olU = (w) => Math.max(10, w * 0.5);

// A small stable number per (seed, index). Bays need to differ from each other
// without differing between frames, so every wobble in here is a lookup rather
// than a roll.
function rnd(seed, i) {
  const n = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// ---------------------------------------------------------------- lighting
// The reveal: how lit the wall is at a given x, given which ceiling lights are
// working. Falls off with distance from the nearest LIT fixture, so walking
// from a powered bay into a dead one dims the wall — and everything painted on
// it — instead of flipping a switch. Returns 0..1.
//
// This is the piece that makes the dressings worth drawing: detail is painted
// once and the light decides how much of it you get to see.
export function wallLitAt(x, litCount, spacing = BAY_W, reach = spacing * 1.15) {
  if (litCount <= 0) return 0;
  let best = Infinity;
  for (let i = 0; i < litCount; i++) best = Math.min(best, Math.abs(x - (i * spacing + spacing / 2)));
  // Smoothstep the falloff — a linear ramp reads as a hard cone edge.
  const k = Math.max(0, Math.min(1, 1 - best / reach));
  return k * k * (3 - 2 * k);
}

// Darken a region to `amount` of full brightness (1 = fully lit). Drawn OVER
// the art rather than baked into its colours, which is what lets one painter
// serve both a powered bay and a dead one — and what lets the same pass darken
// the cabinets and cast standing in front of the wall, so the whole concourse
// dims together instead of the wall dimming behind lit furniture.
//
// `amount` may be a number (flat) or a function of x (a falloff). Sampling the
// function into a gradient keeps the ramp smooth across a bay boundary: shading
// each bay by its own centre value banded visibly at the seams.
export function shadeWall(ctx, x, y, w, h, amount) {
  const alphaAt = (amt) => Math.max(0, Math.min(1, 1 - amt)) * 0.88;
  ctx.save();
  if (typeof amount === 'function') {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    const STOPS = 24;
    for (let i = 0; i <= STOPS; i++) {
      const s = i / STOPS;
      g.addColorStop(s, `rgba(11,8,18,${alphaAt(amount(x + w * s)).toFixed(3)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  } else {
    const a = alphaAt(amount);
    if (a > 0.001) {
      ctx.globalAlpha = a;
      ctx.fillStyle = '#0b0812';
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
}

// The undressed wall: flat panel, a scuffed skirting band along the floor line.
// Every dressing paints on top of this.
export function drawWallBase(ctx, x, y, w, h) {
  plain(ctx, WALL_BASE, (c) => c.rect(x, y, w, h));
  // Faint vertical seams — plasterboard joins. Enough to stop a big flat fill
  // from reading as a void, not enough to become a pattern.
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 1; i < 3; i++) {
    stroke(ctx, '#2b2338', Math.max(0.5, w * 0.006), (c) => {
      const sx = Math.round(x + (w * i) / 3);
      c.moveTo(sx, y); c.lineTo(sx, y + h);
    });
  }
  ctx.restore();
  plain(ctx, WALL_TRIM, (c) => c.rect(x, y + h - h * 0.045, w, h * 0.045));
}

// ============================================================== 1. conduit
// Exposed wiring and a breaker box: the in-fiction reason the lights flicker.
// The cord feeding the room is stapled to the wall in plain sight, half of it
// hanging loose, and the box it lands in has its door open and one breaker
// already thrown.
function paintConduit(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;
  const u = olU(w);
  const boxX = X(0.60), boxY = Y(0.20), boxW = w * 0.24, boxH = h * 0.20;

  // Main conduit run, stapled across the wall under the ceiling.
  shape(ctx, '#3a3446', u, (c) => rr(c, X(0.02), Y(0.075), w * 0.96, h * 0.035, h * 0.017));
  plain(ctx, '#4c455e', (c) => c.rect(X(0.02), Y(0.082), w * 0.96, h * 0.010));
  for (const f of [0.12, 0.38, 0.86]) {
    plain(ctx, '#2a2438', (c) => c.rect(X(f), Y(0.066), w * 0.028, h * 0.055));
  }

  // Drop into the breaker box.
  shape(ctx, '#3a3446', u, (c) => rr(c, boxX + boxW * 0.42, Y(0.10), w * 0.035, boxY - Y(0.10) + 2, w * 0.016));

  // The box: body, open door hinged to the left, dark interior.
  shape(ctx, '#4a4358', u, (c) => rr(c, boxX, boxY, boxW, boxH, w * 0.012));
  plain(ctx, '#15111f', (c) => c.rect(boxX + boxW * 0.10, boxY + boxH * 0.12, boxW * 0.80, boxH * 0.76));
  // Breaker switches — one thrown, and it is the red one.
  for (let i = 0; i < 3; i++) {
    const by = boxY + boxH * (0.22 + i * 0.24);
    const thrown = i === 1;
    plain(ctx, thrown ? '#e04848' : '#c8c8d8',
      (c) => c.rect(boxX + boxW * (thrown ? 0.46 : 0.20), by, boxW * 0.30, boxH * 0.15));
  }
  // Door, swung open to the left and catching a little light on its inside face.
  ctx.save();
  ctx.globalAlpha = 0.95;
  shape(ctx, '#565070', u, (c) => {
    c.moveTo(boxX, boxY);
    c.lineTo(boxX - boxW * 0.42, boxY + boxH * 0.16);
    c.lineTo(boxX - boxW * 0.42, boxY + boxH * 0.90);
    c.lineTo(boxX, boxY + boxH);
    c.closePath();
  });
  ctx.restore();

  // Loose wires drooping out of the box and away along the wall. Catenaries,
  // because a straight line reads as installed and a sagging one reads as loose.
  const wires = [['#c8503c', 0.30], ['#f6d33c', 0.40], ['#48c0e0', 0.34]];
  wires.forEach(([col, sag], i) => {
    const x0 = boxX + boxW * 0.12, y0 = boxY + boxH * 0.92;
    const x1 = X(0.06 + i * 0.05), y1 = Y(0.42 + i * 0.10);
    stroke(ctx, col, Math.max(0.6, w * 0.012), (c) => {
      c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2, y0 + h * sag, x1, y1);
    });
    // Stripped copper end.
    plain(ctx, '#e8b45a', (c) => c.arc(x1, y1, Math.max(0.7, w * 0.014), 0, Math.PI * 2));
  });

  // A wire nut still capping one lead, left dangling.
  plain(ctx, '#e8863c', (c) => rr(c, X(0.30), Y(0.50), w * 0.035, h * 0.030, w * 0.012));
}

// ============================================================ 2. water damage
// Nobody has fixed the roof. Stains bloom out of the ceiling line, the
// plasterboard has cracked under them, and one patch has given up and peeled,
// showing the dark cavity behind. A bucket sits under the worst of it.
function paintDecay(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;
  const u = olU(w);

  // Stains: concentric irregular blooms, darkest at the centre. The edge is a
  // sum of two out-of-phase sinusoids rather than per-vertex noise — noise at
  // this vertex count came out as a visible polygon, where harmonics give the
  // continuous tide-mark wobble a spreading damp patch actually has.
  const blot = (cx, cy, r, seed) => {
    const p1 = rnd(seed, 1) * Math.PI * 2, p2 = rnd(seed, 2) * Math.PI * 2;
    const k1 = 3 + Math.floor(rnd(seed, 3) * 2), k2 = 5 + Math.floor(rnd(seed, 4) * 3);
    for (let ring = 0; ring < 3; ring++) {
      const rr2 = r * (1 - ring * 0.26);
      ctx.beginPath();
      const steps = 44;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const wob = 1 + 0.16 * Math.sin(a * k1 + p1) + 0.09 * Math.sin(a * k2 + p2);
        const px = cx + Math.cos(a) * rr2 * wob;
        const py = cy + Math.sin(a) * rr2 * wob * 0.72;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = ['rgba(128,96,58,0.16)', 'rgba(120,88,52,0.18)', 'rgba(96,70,42,0.20)'][ring];
      ctx.fill();
    }
  };
  blot(X(0.30), Y(0.10), w * 0.30, o.seed + 1);
  blot(X(0.78), Y(0.06), w * 0.20, o.seed + 7);

  // Cracks spidering down out of the wet patch.
  const crack = (x0, y0, len, dir, seed) => {
    stroke(ctx, '#181322', Math.max(0.5, w * 0.008), (c) => {
      c.moveTo(x0, y0);
      let cx = x0, cy = y0;
      for (let i = 0; i < 5; i++) {
        cx += (rnd(seed, i) - 0.5) * w * 0.09 + dir * w * 0.012;
        cy += len / 5;
        c.lineTo(cx, cy);
      }
    });
  };
  crack(X(0.26), Y(0.16), h * 0.30, 1, o.seed + 3);
  crack(X(0.38), Y(0.13), h * 0.20, -1, o.seed + 11);
  crack(X(0.80), Y(0.12), h * 0.16, 1, o.seed + 5);

  // A sheet of plasterboard that has let go: dark cavity, with the peeled
  // corner curling off it, paler on its back face. The cavity is torn rather
  // than rectangular — a clean rect read as a doorway, not as damage.
  const px0 = X(0.52), py0 = Y(0.22), pw = w * 0.18, ph = h * 0.17;
  plain(ctx, '#0e0a16', (c) => {
    c.moveTo(px0 + pw * 0.06, py0 + ph * 0.10);
    c.lineTo(px0 + pw * 0.55, py0);
    c.lineTo(px0 + pw, py0 + ph * 0.16);
    c.lineTo(px0 + pw * 0.88, py0 + ph * 0.66);
    c.lineTo(px0 + pw * 0.96, py0 + ph);
    c.lineTo(px0 + pw * 0.34, py0 + ph * 0.92);
    c.lineTo(px0, py0 + ph * 0.52);
    c.closePath();
  });
  // A batten showing through the hole — the only thing back there.
  plain(ctx, '#241a2c', (c) => c.rect(px0 + pw * 0.40, py0 + ph * 0.04, pw * 0.13, ph * 0.90));
  plain(ctx, '#2e2740', (c) => {
    c.moveTo(px0 + pw, py0);
    c.lineTo(px0 + pw * 1.42, py0 + ph * 0.30);
    c.lineTo(px0 + pw * 1.10, py0 + ph * 0.86);
    c.lineTo(px0 + pw, py0 + ph * 0.52);
    c.closePath();
  });

  // The drip, and what someone put under it. The droplet rides the hub's own
  // clock so the bucket is clearly still being earned.
  const dripT = (o.t * 0.55) % 1;
  plain(ctx, '#7fd8e8', (c) => {
    const dy = Y(0.20) + dripT * h * 0.52;
    c.ellipse(X(0.305), dy, w * 0.012, h * 0.016, 0, 0, Math.PI * 2);
  });
  const bkX = X(0.24), bkY = Y(0.80), bkW = w * 0.13, bkH = h * 0.10;
  shape(ctx, '#3f4a58', u, (c) => {
    c.moveTo(bkX, bkY);
    c.lineTo(bkX + bkW, bkY);
    c.lineTo(bkX + bkW * 0.84, bkY + bkH);
    c.lineTo(bkX + bkW * 0.16, bkY + bkH);
    c.closePath();
  });
  plain(ctx, '#2a4a52', (c) => c.rect(bkX + bkW * 0.08, bkY + bkH * 0.18, bkW * 0.84, bkH * 0.22));
}

// ============================================================== 3. posters
// Faded promo art for the machine standing in front of it. Takes the cabinet's
// own palette, so each bay of the concourse gets its own colour without a
// second art pass — and every poster is sun-bleached, taped up crooked, and
// missing a corner.
function paintPosters(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;
  const u = olU(w);
  const pal = o.pal || {};
  const paper = pal.body || '#5a4a7a';
  const ink = pal.screen || '#f6d33c';

  const poster = (fx, fy, fw, fh, tilt, torn, seed) => {
    const pw = w * fw, ph = h * fh;
    ctx.save();
    ctx.translate(X(fx) + pw / 2, Y(fy) + ph / 2);
    ctx.rotate(tilt);
    ctx.translate(-pw / 2, -ph / 2);
    // Sheet, with the torn corner cut out of the silhouette itself.
    shape(ctx, paper, u, (c) => {
      c.moveTo(0, 0);
      c.lineTo(pw, 0);
      if (torn) {
        c.lineTo(pw, ph * 0.62);
        c.lineTo(pw * 0.72, ph * 0.78);
        c.lineTo(pw * 0.80, ph);
      } else c.lineTo(pw, ph);
      c.lineTo(0, ph);
      c.closePath();
    });
    // Title bar and a motif blocked in — a poster reads as a poster from its
    // layout, not from legible text at 30px wide.
    plain(ctx, ink, (c) => c.rect(pw * 0.10, ph * 0.10, pw * 0.80, ph * 0.13));
    plain(ctx, 'rgba(255,255,255,0.22)', (c) => {
      c.arc(pw * 0.50, ph * 0.48, Math.min(pw, ph) * 0.20, 0, Math.PI * 2);
    });
    for (let i = 0; i < 3; i++) {
      plain(ctx, 'rgba(0,0,0,0.28)',
        (c) => c.rect(pw * 0.16, ph * (0.70 + i * 0.09), pw * (0.66 - i * 0.16), ph * 0.045));
    }
    // Bleached by whatever light still reaches it.
    plain(ctx, 'rgba(232,228,240,0.14)', (c) => c.rect(0, 0, pw, ph));
    // Tape, over the top of the sheet so it reads as holding it up.
    for (const tx of [0.06, 0.78]) {
      plain(ctx, 'rgba(236,236,246,0.30)', (c) => c.rect(pw * tx, -ph * 0.05, pw * 0.16, ph * 0.10));
    }
    ctx.restore();
  };

  poster(0.10, 0.10, 0.30, 0.42, -0.045, true, o.seed);
  poster(0.52, 0.14, 0.26, 0.34, 0.055, false, o.seed + 4);
  // A flyer that lost its tape and is hanging by one corner.
  ctx.save();
  ctx.translate(X(0.86), Y(0.12));
  ctx.rotate(0.42);
  plain(ctx, 'rgba(232,228,240,0.45)', (c) => c.rect(0, 0, w * 0.10, h * 0.16));
  ctx.restore();
}

// ============================================================ 4. menu board
// The food court's actual menu, still bolted up over a room that has not served
// food in years. Half the items are struck through; what replaced them is
// written in a different hand.
function paintMenuBoard(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;
  const u = olU(w);
  const bx = X(0.08), by = Y(0.08), bw = w * 0.68, bh = h * 0.42;

  // Housing, with the light box behind the panel still faintly on.
  shape(ctx, '#2a2438', u, (c) => rr(c, bx, by, bw, bh, w * 0.012));
  plain(ctx, '#161022', (c) => c.rect(bx + bw * 0.03, by + bh * 0.06, bw * 0.94, bh * 0.88));
  ctx.save();
  ctx.globalAlpha = 0.18;
  plain(ctx, '#f6d33c', (c) => c.rect(bx + bw * 0.03, by + bh * 0.06, bw * 0.94, bh * 0.88));
  ctx.restore();

  // Header strip.
  plain(ctx, '#e04848', (c) => c.rect(bx + bw * 0.06, by + bh * 0.12, bw * 0.88, bh * 0.14));

  // Rows: an item block on the left, a price block on the right. Struck-through
  // rows get a rule across them and a replacement scrawl above the strike.
  const rows = [
    { wLeft: 0.52, struck: false, replaced: false },
    { wLeft: 0.44, struck: true, replaced: true },
    { wLeft: 0.58, struck: true, replaced: false },
    { wLeft: 0.38, struck: false, replaced: true },
  ];
  rows.forEach((r, i) => {
    const ry = by + bh * (0.34 + i * 0.15);
    const rh = bh * 0.075;
    plain(ctx, r.struck ? 'rgba(200,200,216,0.35)' : '#c8c8d8',
      (c) => c.rect(bx + bw * 0.08, ry, bw * r.wLeft, rh));
    plain(ctx, r.struck ? 'rgba(246,211,60,0.35)' : '#f6d33c',
      (c) => c.rect(bx + bw * 0.80, ry, bw * 0.12, rh));
    if (r.struck) {
      stroke(ctx, '#e04848', Math.max(0.5, w * 0.008), (c) => {
        c.moveTo(bx + bw * 0.06, ry + rh * 0.5);
        c.lineTo(bx + bw * 0.94, ry + rh * 0.5);
      });
    }
    if (r.replaced) {
      // The new item, in marker, sitting slightly off the baseline.
      plain(ctx, '#48e0c8', (c) => c.rect(bx + bw * 0.10, ry - rh * 0.85, bw * 0.34, rh * 0.6));
    }
  });

  // A letter board strip that has lost most of its letters.
  const sx = X(0.80), sy = Y(0.14);
  shape(ctx, '#1e1a2c', u, (c) => rr(c, sx, sy, w * 0.14, h * 0.30, w * 0.010));
  for (let i = 0; i < 5; i++) {
    if (rnd(o.seed, i) < 0.45) continue;
    plain(ctx, '#c8c8d8', (c) => c.rect(sx + w * 0.025, sy + h * (0.04 + i * 0.055), w * 0.09, h * 0.025));
  }
}

// ========================================================== 5. party decor
// Left over from a promotion nobody remembers. The bunting has come off its
// pin at one end and hangs down the wall; the string lights above it are mostly
// dead bulbs, and the few that work are on the same failing circuit as
// everything else in here.
function paintPartyDecor(ctx, x, y, w, h, o) {
  const X = (f) => x + w * f, Y = (f) => y + h * f;

  // String lights: a catenary of bulbs, most burnt out. The live ones pulse on
  // the room's clock so they read as sharing the ceiling's bad power.
  const lx0 = X(-0.02), lx1 = X(1.02), ly = Y(0.10), sag = h * 0.13;
  stroke(ctx, '#1c1728', Math.max(0.5, w * 0.008), (c) => {
    c.moveTo(lx0, ly);
    c.quadraticCurveTo((lx0 + lx1) / 2, ly + sag * 2, lx1, ly);
  });
  const BULBS = 9;
  for (let i = 0; i <= BULBS; i++) {
    const s = i / BULBS;
    // Point on the quadratic, so the bulbs hang off the wire rather than a line.
    const bx = (1 - s) * (1 - s) * lx0 + 2 * (1 - s) * s * ((lx0 + lx1) / 2) + s * s * lx1;
    const byy = (1 - s) * (1 - s) * ly + 2 * (1 - s) * s * (ly + sag * 2) + s * s * ly;
    const live = rnd(o.seed + 40, i) > 0.62;
    const pulse = live ? 0.55 + 0.45 * Math.sin(o.t * 3 + i * 1.7) : 0;
    if (live) {
      ctx.save();
      ctx.globalAlpha = 0.22 * pulse;
      plain(ctx, '#f6d33c', (c) => c.arc(bx, byy + h * 0.02, w * 0.045, 0, Math.PI * 2));
      ctx.restore();
    }
    plain(ctx, live ? '#f6d33c' : '#3a3446',
      (c) => c.ellipse(bx, byy + h * 0.022, w * 0.014, h * 0.020, 0, 0, Math.PI * 2));
  }

  // Bunting: a swag of triangular flags pinned at the left, and the same swag
  // giving up at the right — the loose end hangs straight down the wall.
  const ax = X(0.04), ay = Y(0.30), mx = X(0.52), my = Y(0.44), cxE = X(0.86), cyE = Y(0.26);
  const flagCols = ['#e04848', '#f6d33c', '#48c0e0', '#48c848', '#f890b8'];
  const swag = (x0, y0, xm, ym, x1, y1, n, startIdx) => {
    stroke(ctx, '#c8c8d8', Math.max(0.4, w * 0.006), (c) => {
      c.moveTo(x0, y0); c.quadraticCurveTo(xm, ym, x1, y1);
    });
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) / n;
      const fx = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * xm + s * s * x1;
      const fy = (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * ym + s * s * y1;
      const fw = w * 0.045, fh = h * 0.075;
      plain(ctx, flagCols[(startIdx + i) % flagCols.length], (c) => {
        c.moveTo(fx - fw / 2, fy);
        c.lineTo(fx + fw / 2, fy);
        c.lineTo(fx, fy + fh);
        c.closePath();
      });
    }
  };
  swag(ax, ay, mx, my, cxE, cyE, 6, 0);
  // The detached end, hanging plumb.
  swag(cxE, cyE, cxE + w * 0.02, cyE + h * 0.16, cxE - w * 0.01, cyE + h * 0.34, 3, 2);
  // The pin it tore off, still in the wall.
  plain(ctx, '#8a8a98', (c) => c.arc(X(0.90), Y(0.22), w * 0.010, 0, Math.PI * 2));

  // A balloon that did not survive the decade.
  ctx.save();
  ctx.translate(X(0.30), Y(0.66));
  ctx.rotate(0.5);
  plain(ctx, '#7a3450', (c) => c.ellipse(0, 0, w * 0.035, h * 0.030, 0, 0, Math.PI * 2));
  stroke(ctx, '#4a4358', Math.max(0.4, w * 0.005), (c) => {
    c.moveTo(0, h * 0.028); c.quadraticCurveTo(w * 0.03, h * 0.07, w * 0.01, h * 0.11);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- registry
// Ordered as they were pitched. `note` is the one-line case for each, which the
// gallery prints under the tile so the mockups argue for themselves.
export const WALL_DRESSINGS = {
  conduit: {
    name: 'Exposed wiring + breaker box',
    note: 'Says out loud why the lights flicker. One breaker already thrown.',
    paint: paintConduit,
  },
  decay: {
    name: 'Water damage + peeled board',
    note: 'Stains, cracks, a live drip and the bucket under it. Cheap to draw, scales with how dark the bay is.',
    paint: paintDecay,
  },
  posters: {
    name: 'Faded cabinet posters',
    note: 'Takes each cabinet\'s own palette, so nine bays differ for free. Sun-bleached, taped crooked, one torn corner.',
    paint: paintPosters,
  },
  menuboard: {
    name: 'Food court menu board',
    note: 'The literal food court, still advertising. Items struck through and rewritten in marker — a joke slot.',
    paint: paintMenuBoard,
  },
  partydecor: {
    name: 'Leftover party decor',
    note: 'Bunting off its pin, string lights mostly dead. The live bulbs pulse on the same bad power as the ceiling.',
    paint: paintPartyDecor,
  },
};

// Paint one dressed bay: wall, dressing, then the light falloff over the top.
// `lit` is 0..1 (see wallLitAt); `pal` is a cabinet palette for the dressings
// that colour themselves from the machine in front of them.
export function drawWallBay(ctx, x, y, w, h, id, { t = 0, seed = 0, lit = 1, pal = null, base = true } = {}) {
  const d = WALL_DRESSINGS[id];
  if (base) drawWallBase(ctx, x, y, w, h);
  if (d) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    d.paint(ctx, x, y, w, h, { t, seed, pal });
    ctx.restore();
  }
  shadeWall(ctx, x, y, w, h, lit);
}
