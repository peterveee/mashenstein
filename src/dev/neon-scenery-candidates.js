// TERMINAL VELOCITY — deep-background studies. GALLERY ONLY.
//
// What ships today is three layers and change: a 40-dot starfield at 0.05, one
// row of eight wireframe blocks at 0.25, and six flat horizon rules. Nothing
// behind the lane has any depth in it, because there is only ever one thing
// back there moving at one rate — and a single parallax layer is not parallax,
// it is a sliding backdrop.
//
// Each candidate below is a complete backdrop: its own sky, then an ORDERED
// STACK OF LAYERS, back to front, each with its own scroll factor. The stack is
// data so the gallery can also draw a candidate at 2, 4, 6 or all of its layers
// and ask the second question separately — how much depth is enough, as opposed
// to what is in it.
//
// THE FLYER BAND IS THE CONSTRAINT. Neon is the shmup cabinet: drones sit at
// world alt 13 and targets at 40, and the camera magnifies world units by ZOOM
// on the way to the frame. So everything the player must read lives between
// screen y 130 (a target's crown) and the groundline at 232 — roughly the lower
// two fifths of the picture. Every painter here keeps its BRIGHT ink above that
// band and allows itself only silhouette or thin, dim line inside it. The
// gallery draws a real drone and a real target over every card so the rule is
// checked rather than asserted.
//
// Nothing here is registered with the neon pack. The winner gets ported into
// neonPack.bg() in src/engine/stylePacks/index.js and this file goes.
import { ZOOM, GROUND_Y } from '../engine/camera.js';
import { H } from '../engine/renderer.js';
// The wrap rule and the visible-band window, from the module that owns them.
// A backdrop object has to wrap into what is ON SCREEN rather than into the
// authored 480px frame, or it pops out of existence in full view on a phone —
// see the long note on wrapIntoView. Reached through __testing rather than a
// new export because a bake-off should add nothing to the shipping surface.
import { __testing as bg } from '../engine/stylePacks/index.js';

const { wrapIntoView, backgroundPaintCoverage } = bg;

// The cabinet's inks. Two tubes and a lamp: everything back here is cyan,
// magenta or the coin amber, because a fourth hue in the backdrop is a hue the
// player has to learn is not a pickup.
const CYAN = '#38d8f8';
const MAGENTA = '#e838f8';
const VIOLET = '#8858c8';
const AMBER = '#f6d33c';
const LAMP = '#ff5a7a';
// The near silhouette colour. Darker than the darkest sky stop on purpose: the
// nearest layer is not lit by the city, it is between you and it.
const NEAR_INK = '#05040f';

// The top of the band the player reads hazards in — a target's crown, in screen
// px. Bright ink below this line competes with the thing that is about to hit
// you.
export const NEON_FLYER_BAND_TOP = GROUND_Y - 51 * 2;

// Deterministic per-index noise. Every layer is generated rather than authored,
// so a card has to come back the same on every reload or the bake-off is
// comparing two different cities.
function hash(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function skyFill(ctx, c0, c1) {
  const cov = backgroundPaintCoverage(ctx);
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(cov.left - 60, -80, cov.width + 120, H + 160);
}

// A NEON LINE IS TWO STROKES: a wide, faint one for the light the tube throws,
// and a thin bright one for the glass. Cheaper than a shadowBlur and it is the
// same trick the prop bloom uses — light around the art, not a halo on a box.
function tube(ctx, color, width, glow, draw) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  if (glow > 0) {
    ctx.globalAlpha = glow;
    ctx.lineWidth = width * 4;
    ctx.beginPath(); draw(ctx); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  ctx.beginPath(); draw(ctx); ctx.stroke();
}

function rectPath(x, y, w, h) {
  return (c) => c.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
}

// ---------------------------------------------------------------- layer parts

// The one layer every candidate keeps from the shipping pack, because a neon
// sky with no stars in it is a black rectangle. Denser than the live 40 and
// twinkling on two clocks, so the slowest layer in the stack still reads as
// something rather than as paper.
function starLayer(ctx, shift, t, { count = 64, top = 4, bottom = 150, tint = '#8888c8' } = {}) {
  const span = bottom - top;
  for (let i = 0; i < count; i++) {
    const x = wrapIntoView(ctx, i * 97 - shift, 6);
    const y = top + hash(i) * span;
    const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + hash(i + 31) * 1.7) + i);
    ctx.globalAlpha = 0.35 + tw * 0.5;
    ctx.fillStyle = i % 9 === 0 ? CYAN : i % 7 === 0 ? MAGENTA : tint;
    const s = i % 13 === 0 ? 2 : 1;
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  ctx.globalAlpha = 1;
}

// The glow the city throws up into its own smog. Anchored, not scrolled: haze
// has no parallax, and giving it some is what makes a backdrop feel painted on
// a moving wall.
function horizonHaze(ctx, { color = MAGENTA, height = 70, alpha = 0.16 } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const g = ctx.createLinearGradient(0, GROUND_Y - height, 0, GROUND_Y);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(cov.left, GROUND_Y - height, cov.width, height);
  ctx.globalAlpha = 1;
}

// Filled blocks, no linework: the back of the city is a mass, and the eye reads
// mass before it reads edges. One lit rule along each roof is all the neon it
// gets — that far away the tubes have merged.
function silhouetteSkyline(ctx, shift, {
  seed = 0, span = 46, count = 16, minH = 52, maxH = 104, wMin = 16, wMax = 34,
  fill = '#1a1440', crown = CYAN, crownAlpha = 0.5,
} = {}) {
  for (let i = 0; i < count; i++) {
    const r = hash(seed + i);
    const x = wrapIntoView(ctx, i * span - shift, 70);
    const w = wMin + hash(seed + i + 41) * (wMax - wMin);
    const h = minH + r * (maxH - minH);
    const top = GROUND_Y - h;
    ctx.fillStyle = fill;
    ctx.fillRect(Math.round(x), Math.round(top), Math.round(w), h);
    ctx.globalAlpha = crownAlpha;
    ctx.fillStyle = crown;
    ctx.fillRect(Math.round(x), Math.round(top), Math.round(w), 1);
    ctx.globalAlpha = 1;
  }
}

// The live pack's one idea, taken seriously: a wireframe block with a window
// lattice and, on the tall ones, a mast with a lamp on it. The lattice is the
// point — it is what turns eight rectangles into a city.
function wireSkyline(ctx, shift, t, {
  seed = 7, span = 78, count = 10, minH = 60, maxH = 132, w = 34,
  stroke = 1, glow = 0.14, alpha = 1, windows = true, masts = true,
} = {}) {
  for (let i = 0; i < count; i++) {
    const r = hash(seed + i);
    const x = Math.round(wrapIntoView(ctx, i * span - shift, 90));
    const bw = Math.round(w * (0.7 + hash(seed + i + 17) * 0.6));
    const h = minH + r * (maxH - minH);
    const top = Math.round(GROUND_Y - h);
    const ink = i % 2 ? CYAN : MAGENTA;
    ctx.globalAlpha = alpha;
    tube(ctx, ink, stroke, glow, rectPath(x, top, bw, h));
    // Floor plates. Spaced by the building rather than by a constant so a row
    // of towers does not band together into one horizontal stripe.
    const step = 7 + Math.round(hash(seed + i + 5) * 5);
    ctx.globalAlpha = alpha * 0.28;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = top + step; y < GROUND_Y - 2; y += step) {
      ctx.moveTo(x + 0.5, y + 0.5);
      ctx.lineTo(x + bw + 0.5, y + 0.5);
    }
    ctx.stroke();
    if (windows) {
      // Lit cells, on their own slow clock. A window that never changes is a
      // texture; one that changes every frame is a fault.
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = AMBER;
      for (let k = 0; k < 7; k++) {
        const wr = hash(seed * 3 + i * 13 + k);
        if (wr > 0.55) continue;
        const on = Math.sin(t * 0.55 + wr * 90 + i) > -0.2;
        if (!on) continue;
        const wy = top + step + Math.floor(wr * 9) * step;
        if (wy > GROUND_Y - 6) continue;
        ctx.fillRect(x + 3 + Math.floor(hash(i * 7 + k) * (bw - 7)), wy + 2, 2, 2);
      }
    }
    if (masts && h > maxH * 0.78) {
      ctx.globalAlpha = alpha;
      tube(ctx, ink, stroke, glow * 0.6, (c) => {
        c.moveTo(x + bw / 2 + 0.5, top + 0.5);
        c.lineTo(x + bw / 2 + 0.5, top - 12.5);
      });
      const blink = Math.sin(t * 2.2 + i) > 0;
      ctx.globalAlpha = alpha * (blink ? 1 : 0.2);
      ctx.fillStyle = LAMP;
      ctx.fillRect(x + bw / 2 - 1, top - 15, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}

// The floor the whole cabinet is standing on. The live pack draws six flat
// rules and stops; a grid needs its VERTICALS to read as a plane, and they have
// to converge on a vanishing point or it is a net, not a floor.
function perspectiveGrid(ctx, shift, {
  depth = 28, lines = 7, spacing = 40, color = CYAN, alpha = 0.34, vanishX = null,
} = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const vx = vanishX === null ? cov.left + cov.width / 2 : vanishX;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  // Horizontals, tightening toward the horizon: equal steps on screen read as
  // a staircase, squared steps read as distance.
  for (let i = 0; i < lines; i++) {
    const f = (i + 1) / lines;
    const y = GROUND_Y - depth * (1 - f * f);
    ctx.globalAlpha = alpha * (0.35 + f * 0.65);
    ctx.beginPath();
    ctx.moveTo(cov.left, Math.round(y) + 0.5);
    ctx.lineTo(cov.right, Math.round(y) + 0.5);
    ctx.stroke();
  }
  // Verticals, scrolling. These are the only part of the floor that moves, and
  // they are what makes the plane rush.
  ctx.globalAlpha = alpha * 0.8;
  ctx.beginPath();
  for (let i = -2; i < Math.ceil(cov.width / spacing) + 4; i++) {
    const x = cov.left + (((i * spacing - shift) % (cov.width + spacing * 4)
      + cov.width + spacing * 4) % (cov.width + spacing * 4)) - spacing * 2;
    ctx.moveTo(Math.round(x) + 0.5, GROUND_Y + 0.5);
    ctx.lineTo(Math.round(vx + (x - vx) * 0.12) + 0.5, GROUND_Y - depth + 0.5);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// A NEAR SILHOUETTE NEEDS A RIM, because the top of this sky is #0a0a2a and
// near-black on near-black is nothing at all. One dim tube line down the lit
// edge is what the city would actually put there, and it is what makes the
// shape read where the sky is darkest — the fill still does all the occluding.
function nearFill(ctx, x, y, w, h, { rim = CYAN, rimAlpha = 0.3 } = {}) {
  ctx.fillStyle = NEAR_INK;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (!rim) return;
  ctx.globalAlpha *= 1;
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * rimAlpha;
  ctx.fillStyle = rim;
  ctx.fillRect(Math.round(x), Math.round(y), 1, Math.round(h));
  ctx.globalAlpha = a;
}

// The nearest layer: pylons, cross arms and slack cable. It is allowed inside
// the flyer band precisely because it carries no light — a silhouette
// subtracts, and the drone the player is reading is lit.
function nearRigging(ctx, shift, t, {
  span = 190, count = 4, alpha = 1, cables = true, seed = 3,
} = {}) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    const x = Math.round(wrapIntoView(ctx, i * span - shift, 120));
    const h = 118 + hash(seed + i) * 70;
    const top = GROUND_Y - h;
    nearFill(ctx, x, top, 4, h);
    // Cross arms: three, narrowing UPWARD, with an insulator at each end. A
    // pylon that widens toward its top reads as a letter, not a structure.
    for (let k = 0; k < 3; k++) {
      const ay = top + 12 + k * (h * 0.22);
      const aw = 20 - k * 5;
      nearFill(ctx, x - aw, ay, aw * 2 + 4, 2, { rim: null });
      nearFill(ctx, x - aw, ay - 3, 2, 3, { rim: null });
      nearFill(ctx, x + aw + 2, ay - 3, 2, 3, { rim: null });
    }
    // A lamp at the top, on the aviation blink every mast in the city shares.
    ctx.globalAlpha = alpha * (Math.sin(t * 2.1 + i * 1.7) > 0 ? 0.9 : 0.15);
    ctx.fillStyle = LAMP;
    ctx.fillRect(x, top - 3, 2, 2);
    ctx.globalAlpha = alpha;
    if (cables) {
      // Slack between this mast and the next, hanging from the top arm so it
      // crosses the sky rather than the lane.
      ctx.strokeStyle = NEAR_INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 2, top + 14);
      ctx.quadraticCurveTo(x + span / 2, top + 14 + 30 + Math.sin(t * 0.6 + i) * 2,
        x + span + 2, top + 12);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// THE SMOG THAT PROTECTS THE HAZARD BAND. Every one of these cities wants to
// put its brightest linework exactly where the drones fly, because that is
// where a skyline's base is. So the base goes into the air: one gradient of the
// sky's own lower stop, transparent at the crown of the band and solid at the
// groundline, painted in FRONT of the city and BEHIND the floor and the
// rigging.
//
// It is not a scrim over the picture. It buys two things at once — the city
// keeps its bright tops, and the lane keeps a quiet, low-contrast field for a
// lit drone to be read against.
function bandVeil(ctx, cab, { alpha = 0.72, top = NEON_FLYER_BAND_TOP - 24, color = null } = {}) {
  const cov = backgroundPaintCoverage(ctx);
  const tint = color || (cab && cab.sky ? cab.sky[1] : '#1a1048');
  const g = ctx.createLinearGradient(0, top, 0, GROUND_Y);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, tint);
  g.addColorStop(1, tint);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(cov.left, top, cov.width, GROUND_Y - top + 1);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- candidates

// B — GRID CITY. The live idea, given a proper stack: mass at the back, two
// wireframe rows at different rates, a floor that converges, rigging in front.
// Nothing new is invented; the depth is the whole proposal.
const gridCity = {
  id: 'gridcity',
  letter: 'B',
  name: 'GRID CITY',
  note: 'The cabinet it already is, in depth — silhouette mass, two wireframe rows at different rates, '
    + 'smog over their feet, a converging floor, rigging in front. No new subject matter; the stack IS the change.',
  sky: null,
  layers: [
    { name: 'stars', f: 0.03, draw: (c, s) => starLayer(c, s.shift, s.t, { count: 70 }) },
    { name: 'haze', f: 0.02, draw: (c) => horizonHaze(c, { color: MAGENTA, height: 84, alpha: 0.18 }) },
    {
      name: 'far mass',
      f: 0.07,
      draw: (c, s) => silhouetteSkyline(c, s.shift, {
        seed: 2, span: 38, count: 20, minH: 46, maxH: 92, wMin: 14, wMax: 30,
        fill: '#221862', crown: CYAN, crownAlpha: 0.4,
      }),
    },
    {
      name: 'mid wire',
      f: 0.15,
      draw: (c, s) => wireSkyline(c, s.shift, s.t, {
        seed: 7, span: 74, count: 9, minH: 58, maxH: 112, w: 26,
        stroke: 1, glow: 0.1, alpha: 0.46,
      }),
    },
    {
      name: 'near wire',
      f: 0.3,
      draw: (c, s) => wireSkyline(c, s.shift, s.t, {
        seed: 23, span: 132, count: 7, minH: 84, maxH: 158, w: 42,
        stroke: 1.2, glow: 0.18, alpha: 1,
      }),
    },
    { name: 'smog', f: 0, draw: (c, s) => bandVeil(c, s.cab) },
    { name: 'floor grid', f: 0.55, draw: (c, s) => perspectiveGrid(c, s.shift, { depth: 30, lines: 8 }) },
    { name: 'rigging', f: 0.85, draw: (c, s) => nearRigging(c, s.shift, s.t, { span: 205, count: 4 }) },
  ],
};

// C — SUNSET STRIP. One enormous anchored object and ranges in front of it.
// The risk is stated rather than hidden: the disc sits IN the flyer band, which
// is where the card earns or loses the argument.
const sunsetStrip = {
  id: 'sunset',
  letter: 'C',
  name: 'SUNSET STRIP',
  note: 'A banded sun on the horizon with two ranges and a tower row in front of it. The one card with a '
    + 'focal point — and the one whose brightest object sits inside the flyer band, which is the thing to '
    + 'judge it on.',
  sky: ['#12062e', '#3a1152'],
  layers: [
    { name: 'stars', f: 0.02, draw: (c, s) => starLayer(c, s.shift, s.t, { count: 42, bottom: 96 }) },
    {
      name: 'sun',
      f: 0.02,
      draw: (c, s) => {
        const cov = backgroundPaintCoverage(c);
        const cx = cov.left + cov.width * 0.58;
        const cy = GROUND_Y - 34;
        const r = 62;
        const g = c.createLinearGradient(0, cy - r, 0, cy + r);
        g.addColorStop(0, AMBER);
        g.addColorStop(0.45, '#f8608c');
        g.addColorStop(1, MAGENTA);
        c.save();
        c.beginPath();
        c.arc(cx, cy, r, 0, Math.PI * 2);
        c.clip();
        c.fillStyle = g;
        c.fillRect(cx - r, cy - r, r * 2, r * 2);
        // The bands. Widening downward, which is what makes a flat disc read as
        // a sun going down rather than a sticker.
        c.fillStyle = 'rgba(18,6,46,0.92)';
        let y = cy - 4;
        let gap = 3;
        while (y < cy + r) {
          c.fillRect(cx - r, y, r * 2, gap);
          y += gap + 5;
          gap += 1.4;
        }
        c.restore();
        // Its own light on the smog around it.
        c.globalAlpha = 0.22;
        const halo = c.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2);
        halo.addColorStop(0, '#f8608c');
        halo.addColorStop(1, 'rgba(248,96,140,0)');
        c.fillStyle = halo;
        c.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
        c.globalAlpha = 1;
        void s;
      },
    },
    {
      name: 'far range',
      f: 0.06,
      draw: (c, s) => {
        ridge(c, s.shift, { seed: 11, amp: 30, base: GROUND_Y - 44, wl: 150, fill: '#2a0f4e', line: MAGENTA, alpha: 0.5 });
      },
    },
    {
      name: 'near range',
      f: 0.13,
      draw: (c, s) => {
        ridge(c, s.shift, { seed: 5, amp: 22, base: GROUND_Y - 18, wl: 98, fill: '#190833', line: CYAN, alpha: 0.42 });
      },
    },
    {
      name: 'tower row',
      f: 0.26,
      draw: (c, s) => wireSkyline(c, s.shift, s.t, {
        seed: 31, span: 118, count: 8, minH: 70, maxH: 140, w: 24,
        stroke: 1, glow: 0.12, alpha: 0.8, windows: false,
      }),
    },
    { name: 'smog', f: 0, draw: (c, s) => bandVeil(c, s.cab, { alpha: 0.66, color: '#2a0d4a' }) },
    { name: 'floor grid', f: 0.55, draw: (c, s) => perspectiveGrid(c, s.shift, { depth: 30, lines: 8, color: MAGENTA, alpha: 0.4 }) },
    { name: 'rigging', f: 0.9, draw: (c, s) => nearRigging(c, s.shift, s.t, { span: 260, count: 3, cables: false }) },
  ],
};

// A ridge line, for the candidate that wants ranges rather than blocks. Kept
// local to this file: the production parallaxHills is a watercolour wash and
// this needs a hard contour with a lit edge.
function ridge(ctx, shift, { seed = 0, amp = 26, base = GROUND_Y - 30, wl = 120, fill = '#2a0f4e', line = MAGENTA, alpha = 0.5 }) {
  const cov = backgroundPaintCoverage(ctx);
  const step = 8;
  const yAt = (x) => base
    - Math.sin((x + seed * 90) / wl * Math.PI * 2) * amp * 0.6
    - Math.sin((x + seed * 40) / (wl * 0.37) * Math.PI * 2) * amp * 0.3;
  ctx.beginPath();
  ctx.moveTo(cov.left, GROUND_Y + 4);
  for (let x = cov.left; x <= cov.right + step; x += step) ctx.lineTo(x, yAt(x + shift));
  ctx.lineTo(cov.right, GROUND_Y + 4);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = cov.left; x <= cov.right + step; x += step) {
    const y = yAt(x + shift);
    if (x === cov.left) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// D — SIGN CANYON. The city as advertising, and the only candidate that is not
// a skyline: the player is running BETWEEN two blocks rather than past one.
//
// The walls hang from the top of the frame and stop above the hazard band,
// their feet lost in the smog, which is what keeps a wall out of the hero's
// column and off the drones. Depth comes from three planes a side receding
// toward the middle of the picture — each band accelerates outward as it
// approaches the edge, because that is what passing a wall looks like, and a
// row of slabs sliding at one rate is a fence.
const signCanyon = {
  id: 'canyon',
  letter: 'D',
  name: 'SIGN CANYON',
  note: 'Not a skyline: two blocks the player runs BETWEEN. Three receding planes a side, hanging from the '
    + 'top of the frame with their feet in the smog, signs on the inner faces. The strongest sense of place '
    + 'and the busiest picture — judge it on the top corners, which is where it costs the most.',
  sky: ['#080622', '#241040'],
  layers: [
    { name: 'stars', f: 0.03, draw: (c, s) => starLayer(c, s.shift, s.t, { count: 40, bottom: 130 }) },
    { name: 'haze', f: 0.02, draw: (c) => horizonHaze(c, { color: CYAN, height: 64, alpha: 0.14 }) },
    {
      name: 'far wall',
      f: 0.1,
      draw: (c, s) => canyonWall(c, s.shift, s.t, {
        depth: 0, reach: 190, bottom: 186, maxW: 40, fill: '#241a5e', signs: false,
      }),
    },
    {
      name: 'mid wall',
      f: 0.26,
      draw: (c, s) => canyonWall(c, s.shift, s.t, {
        depth: 1, reach: 168, bottom: 198, maxW: 62, fill: '#160d3e', signs: true,
      }),
    },
    {
      name: 'cable strings',
      f: 0.4,
      draw: (c, s) => lanternCable(c, s.shift, s.t),
    },
    { name: 'smog', f: 0, draw: (c, s) => bandVeil(c, s.cab, { alpha: 0.74, top: NEON_FLYER_BAND_TOP - 46 }) },
    { name: 'street', f: 0.55, draw: (c, s) => perspectiveGrid(c, s.shift, { depth: 26, lines: 7, alpha: 0.28 }) },
    {
      name: 'near wall',
      f: 0.72,
      draw: (c, s) => canyonWall(c, s.shift, s.t, {
        depth: 2, reach: 140, bottom: 214, maxW: 96, fill: NEAR_INK, signs: true, count: 4,
      }),
    },
  ],
};

// One depth of the canyon, both sides. A band's position is a parameter u that
// runs 0 (at the vanishing point, in the middle of the picture) to 1 (at the
// frame edge), and everything else — width, height, brightness — is a function
// of it. u advances with the scroll, and screen x is u raised to a power, which
// is what makes a band crawl out of the distance and then rush past.
function canyonWall(ctx, shift, t, {
  depth = 0, reach = 150, bottom = 140, maxW = 50, fill = '#1d1450', signs = false, count = 5,
}) {
  const cov = backgroundPaintCoverage(ctx);
  const cycle = 260 + depth * 90;
  for (const side of [-1, 1]) {
    const edge = side < 0 ? cov.left : cov.right;
    const inner = edge + side * -1 * 0;
    void inner;
    for (let i = 0; i < count; i++) {
      // Per-band phase, scrolling. The +side term puts the two walls out of
      // step so the picture never becomes symmetrical, which would read as a
      // pattern rather than as a street.
      const raw = (i / count) + (shift / cycle) + (side < 0 ? 0 : 0.37) + hash(depth * 7 + i) * 0.11;
      const u = ((raw % 1) + 1) % 1;
      const e = Math.pow(u, 1.7);
      const w = Math.max(4, maxW * (0.25 + u * 0.75));
      // Outer face x, measured in from this frame edge.
      const x = side < 0 ? cov.left + reach * (1 - e) - w : cov.right - reach * (1 - e);
      const top = -30 - u * 40;
      const foot = bottom - (1 - u) * 26;
      ctx.globalAlpha = Math.min(1, 0.5 + u * 1.6);
      ctx.fillStyle = fill;
      ctx.fillRect(Math.round(x), top, Math.round(w), Math.round(foot - top));
      // The lit inner edge. One tube line down the face that is turned toward
      // the street, which is the only part of a building this close that would
      // catch the city's own light.
      const innerX = side < 0 ? x + w - 1 : x;
      ctx.globalAlpha *= 0.42;
      ctx.fillStyle = (i + depth) % 2 ? CYAN : MAGENTA;
      ctx.fillRect(Math.round(innerX), top, 1, Math.round(foot - top));
      ctx.globalAlpha = Math.min(1, 0.5 + u * 1.6);
      // Windows: a coarse lattice, dimmer with distance, a handful lit.
      ctx.fillStyle = AMBER;
      const cols = Math.max(1, Math.floor(w / 9));
      for (let cx = 0; cx < cols; cx++) {
        const firstRow = Math.max(top + 16, 12);
        for (let ry = 0; ry < 14; ry++) {
          const wy = firstRow + ry * 14;
          if (wy > foot - 8) break;
          const r = hash(depth * 53 + i * 17 + cx * 5 + ry);
          if (r > 0.34) continue;
          const on = Math.sin(t * 0.5 + r * 120) > -0.35;
          ctx.globalAlpha = Math.min(1, 0.5 + u * 1.6) * (on ? 0.8 : 0.18);
          ctx.fillRect(Math.round(x + 4 + cx * 9), Math.round(wy), 3, 4);
        }
      }
      ctx.globalAlpha = Math.min(1, 0.5 + u * 1.6);
      if (signs && u > 0.3) {
        // A board cantilevered off the inner face, into the street. Tube glyph
        // rather than a word: a legible sign back here is something to read
        // instead of the lane.
        const sw = 10 + u * 20;
        const sh = 14 + u * 26;
        // Anchored to the FRAME, not to the slab's top: a near slab starts
        // well above the picture, and a sign hung off that top is a sign
        // nobody sees.
        const sy = 26 + hash(i * 3 + depth) * 76;
        const sx = side < 0 ? x + w : x - sw;
        const ink = (i * 3 + depth) % 2 ? MAGENTA : CYAN;
        const on = Math.sin(t * (0.9 + hash(i + depth * 5)) + i) > -0.5;
        // The arm it hangs off.
        ctx.fillStyle = fill;
        ctx.fillRect(Math.round(side < 0 ? x + w - 2 : x - 2), Math.round(sy + sh / 2), 4, 2);
        ctx.globalAlpha = Math.min(1, 0.5 + u * 1.6) * (on ? 1 : 0.24);
        tube(ctx, ink, 1.1, on ? 0.2 : 0.04, (c) => {
          c.rect(Math.round(sx) + 0.5, Math.round(sy) + 0.5, Math.round(sw), Math.round(sh));
          c.moveTo(Math.round(sx) + 3.5, Math.round(sy + sh * 0.32) + 0.5);
          c.lineTo(Math.round(sx + sw) - 3.5, Math.round(sy + sh * 0.32) + 0.5);
          c.moveTo(Math.round(sx) + 3.5, Math.round(sy + sh * 0.6) + 0.5);
          c.lineTo(Math.round(sx + sw) - 3.5, Math.round(sy + sh * 0.85) + 0.5);
        });
      }
      ctx.globalAlpha = 1;
    }
  }
}

// Lantern cable strung across the canyon. Evaluated as a real quadratic so the
// lamps sit ON the wire — the first cut spaced them along a straight line and
// the wire sagged away underneath them.
function lanternCable(ctx, shift, t) {
  const cov = backgroundPaintCoverage(ctx);
  for (let k = 0; k < 3; k++) {
    const y0 = 30 + k * 26;
    const sag = 22 + k * 8;
    const drift = ((-shift + k * 130) % 300 + 300) % 300 - 150;
    const x0 = cov.left - 30;
    const x1 = cov.right + 30;
    const cxp = cov.left + cov.width / 2 + drift;
    const cyp = y0 + sag * 2;
    const at = (u) => ({
      x: (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cxp + u * u * x1,
      y: (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cyp + u * u * (y0 + 6),
    });
    ctx.strokeStyle = 'rgba(136,88,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cxp, cyp, x1, y0 + 6);
    ctx.stroke();
    for (let i = 1; i < 12; i++) {
      const pnt = at(i / 12);
      const on = Math.sin(t * 1.6 + i * 1.3 + k) > -0.3;
      ctx.globalAlpha = on ? 0.95 : 0.28;
      ctx.fillStyle = i % 3 === 0 ? AMBER : i % 3 === 1 ? CYAN : MAGENTA;
      ctx.fillRect(Math.round(pnt.x), Math.round(pnt.y) + 2, 2, 3);
      ctx.globalAlpha = 1;
    }
  }
}

// E — SKY TRANSIT. The backdrop the train handoff implies: an elevated line
// carrying a lit train across the distance, traffic lanes above it, gantries
// crossing overhead. The depth here is MOVING — three layers that travel on
// their own clocks as well as with the camera, which reads as depth even when
// the player is standing still.
const skyTransit = {
  id: 'transit',
  letter: 'E',
  name: 'SKY TRANSIT',
  note: 'The backdrop the train handoff implies: an elevated line with a lit train crossing it, two air '
    + 'traffic lanes above, gantries overhead. The only option whose layers move on their OWN clocks, so '
    + 'the depth still reads while the player is parked.',
  sky: ['#0a0a2a', '#1b1250'],
  layers: [
    { name: 'stars', f: 0.03, draw: (c, s) => starLayer(c, s.shift, s.t, { count: 60 }) },
    { name: 'haze', f: 0.02, draw: (c) => horizonHaze(c, { color: '#3a2a8a', height: 90, alpha: 0.3 }) },
    {
      name: 'far mass',
      f: 0.07,
      draw: (c, s) => silhouetteSkyline(c, s.shift, {
        seed: 4, span: 40, count: 18, minH: 40, maxH: 96, wMin: 15, wMax: 32,
        fill: '#181346', crown: CYAN, crownAlpha: 0.35,
      }),
    },
    {
      name: 'traffic lanes',
      f: 0.12,
      draw: (c, s) => {
        // Light streaks with their own velocity. Two lanes, opposite ways, well
        // above the flyer band.
        const cov = backgroundPaintCoverage(c);
        for (let lane = 0; lane < 2; lane++) {
          const y = 46 + lane * 26;
          const dir = lane ? -1 : 1;
          const speed = lane ? 52 : 34;
          for (let i = 0; i < 7; i++) {
            const span = cov.width + 160;
            const raw = i * (span / 7) + dir * s.t * speed - s.shift;
            const x = cov.left - 80 + ((raw % span) + span) % span;
            const len = 10 + hash(lane * 9 + i) * 22;
            c.globalAlpha = 0.75;
            c.fillStyle = lane ? MAGENTA : CYAN;
            c.fillRect(Math.round(x), y + (i % 2), Math.round(len), lane ? 1 : 2);
            c.globalAlpha = 1;
          }
        }
      },
    },
    {
      name: 'elevated line',
      f: 0.18,
      draw: (c, s) => elevatedLine(c, s.shift, s.t),
    },
    {
      name: 'mid wire',
      f: 0.3,
      draw: (c, s) => wireSkyline(c, s.shift, s.t, {
        seed: 13, span: 112, count: 8, minH: 64, maxH: 120, w: 30,
        stroke: 1, glow: 0.12, alpha: 0.7,
      }),
    },
    { name: 'smog', f: 0, draw: (c, s) => bandVeil(c, s.cab) },
    { name: 'floor grid', f: 0.55, draw: (c, s) => perspectiveGrid(c, s.shift, { depth: 28, lines: 7 }) },
    {
      name: 'gantries',
      f: 0.9,
      draw: (c, s) => {
        // Signal gantries: a leg at each side and a truss across the top of the
        // frame. Silhouette only, and they clear the whole hazard band.
        const span = 300;
        for (let i = 0; i < 3; i++) {
          const x = Math.round(wrapIntoView(c, i * span - s.shift, 200));
          nearFill(c, x, -10, 6, 82, { rimAlpha: 0.35 });
          nearFill(c, x + 150, -10, 6, 70, { rimAlpha: 0.35 });
          nearFill(c, x, 60, 156, 5, { rim: null });
          // The truss's lit underside. Without it the whole structure is
          // #05040f on a #0a0a2a sky and simply is not there.
          c.globalAlpha = 0.28;
          c.fillStyle = CYAN;
          c.fillRect(x, 65, 156, 1);
          c.globalAlpha = 1;
          for (let k = 0; k < 6; k++) {
            c.fillStyle = NEAR_INK;
            c.fillRect(x + 8 + k * 26, 36, 3, 26);
          }
          // Two lamps on the truss, out of phase.
          c.fillStyle = Math.sin(s.t * 1.7 + i) > 0 ? LAMP : 'rgba(255,90,122,0.25)';
          c.fillRect(x + 40, 66, 3, 3);
          c.fillStyle = Math.sin(s.t * 1.7 + i + 2) > 0 ? '#5ce07d' : 'rgba(92,224,125,0.25)';
          c.fillRect(x + 110, 66, 3, 3);
        }
      },
    },
  ],
};

// The elevated line itself: deck, piers, truss, and a train that crosses on its
// own clock rather than with the camera — the handoff's rival consist, seen
// from the roof of the player's own.
function elevatedLine(ctx, shift, t) {
  const cov = backgroundPaintCoverage(ctx);
  const deckY = GROUND_Y - 96;
  // Piers. Anchored to the scroll so the structure has parallax even though the
  // deck is a continuous line.
  ctx.fillStyle = '#140e38';
  const pierSpan = 96;
  for (let i = -1; i < cov.width / pierSpan + 3; i++) {
    const x = cov.left + (((i * pierSpan - shift) % (cov.width + pierSpan * 3)
      + cov.width + pierSpan * 3) % (cov.width + pierSpan * 3)) - pierSpan;
    ctx.fillRect(Math.round(x), deckY + 6, 7, GROUND_Y - deckY - 6);
    // Bracing to the deck.
    ctx.strokeStyle = '#140e38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 3, deckY + 24);
    ctx.lineTo(x - 16, deckY + 6);
    ctx.moveTo(x + 3, deckY + 24);
    ctx.lineTo(x + 22, deckY + 6);
    ctx.stroke();
  }
  // Deck, its truss and its lit edge. A single horizontal rule across the
  // whole frame reads as a scratch on the glass; the zig-zag is what says
  // bridge.
  ctx.strokeStyle = '#1c1550';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = cov.left; x < cov.right + 16; x += 16) {
    ctx.moveTo(x, deckY + 7);
    ctx.lineTo(x + 8, deckY + 15);
    ctx.lineTo(x + 16, deckY + 7);
  }
  ctx.stroke();
  ctx.fillStyle = '#231a60';
  ctx.fillRect(cov.left, deckY, cov.width, 7);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = CYAN;
  ctx.fillRect(cov.left, deckY - 1, cov.width, 1);
  ctx.globalAlpha = 1;
  // The consist. One pass every ~11s, left to right, at a speed that is
  // obviously not the camera's.
  const period = 11;
  const phase = (t % period) / period;
  const trainW = 4 * 36 + 3 * 6;
  const travel = cov.width + trainW * 2;
  const tx = cov.left - trainW + phase * travel;
  // FOUR CARS WITH DAYLIGHT BETWEEN THEM, not one lit bar. The first cut drew
  // the consist as a single 168px box and it read as a strip of tape: a train
  // is legible because you can count its carriages.
  const CAR_W = 36;
  const CAR_GAP = 6;
  for (let car = 0; car < 4; car++) {
    const cx = Math.round(tx) + car * (CAR_W + CAR_GAP);
    ctx.fillStyle = '#3b2b96';
    ctx.fillRect(cx, deckY - 15, CAR_W, 15);
    // The coupler, and the skirt light that runs the length of the car.
    ctx.fillRect(cx + CAR_W, deckY - 8, CAR_GAP, 3);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = CYAN;
    ctx.fillRect(cx, deckY - 16, CAR_W, 1);
    ctx.globalAlpha = 1;
    if (car === 3) {
      // The nose, on the leading car only.
      ctx.fillStyle = '#3b2b96';
      ctx.beginPath();
      ctx.moveTo(cx + CAR_W, deckY - 15);
      ctx.lineTo(cx + CAR_W + 12, deckY - 6);
      ctx.lineTo(cx + CAR_W, deckY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = AMBER;
      ctx.fillRect(cx + CAR_W + 6, deckY - 8, 4, 2);
    }
    ctx.fillStyle = AMBER;
    for (let k = 0; k < 4; k++) {
      ctx.globalAlpha = 0.55 + 0.45 * hash(car * 11 + k);
      ctx.fillRect(cx + 5 + k * 8, deckY - 11, 4, 5);
    }
    ctx.globalAlpha = 1;
  }
  // Its reflection on the deck, which is what sells it as lit rather than
  // drawn.
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = AMBER;
  ctx.fillRect(Math.round(tx) + 4, deckY + 7, trainW - 8, 2);
  ctx.globalAlpha = 1;
}

export const NEON_BG_CANDIDATES = [gridCity, sunsetStrip, signCanyon, skyTransit];

// Draw one candidate's backdrop into the frame, back to front.
//
// `layers` truncates the stack, which is the depth ladder: the same city at two
// layers is what the cabinet has today, and at seven is the proposal. Every
// layer's scroll is `camX * f * ZOOM`, the same expression the shipping packs
// use — the camera magnifies the foreground, so a parallax factor that is not
// scaled by the same amount leaves the backdrop effectively frozen.
export function drawNeonCandidate(ctx, candidate, { camX = 0, t = 0, cab, layers = Infinity } = {}) {
  const stops = candidate.sky || (cab && cab.sky) || ['#0a0a2a', '#1a1048'];
  skyFill(ctx, stops[0], stops[1]);
  const n = Math.min(candidate.layers.length, layers);
  for (let i = 0; i < n; i++) {
    const layer = candidate.layers[i];
    ctx.save();
    layer.draw(ctx, { shift: camX * layer.f * ZOOM, t, cab });
    ctx.restore();
  }
}

// What the live pack has, expressed as a stack, so the ladder's bottom rung is
// the real thing rather than a description of it.
export const NEON_LIVE_LAYER_COUNT = 3;
