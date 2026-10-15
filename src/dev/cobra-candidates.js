// Gallery-only: A BETTER COBRA for SPEED ZONE, a bake-off (16 Oct 2026).
//
// Peter, mid-way through the neon cat sheet: "can you draw a better cobra while you're at
// it?" — "the cobra" being his name for Speed Zone's coiled striker, which ships as a
// RATTLESNAKE (sprites/animals.js). So the sheet answers both readings: three real cobras,
// hood up, and the rattler itself rebuilt on the same construction. NOW is the shipped
// snake through the real run painter.
//
// THE MECHANIC IS UNCHANGED: the snake's own strike curve and lead (neon-cat-candidates.js
// swipeOf = SNAKE_STRIKE_T / SNAKE_STRIKE_LEAD) and its 18x10 box — the answer is the jump.
// A cobra stands taller than a coil, so the art is stood 1.6 over the box (24x21 painted)
// where the rattler's is 1.25; the box, and so the jump, is the snake's.
//
// THE CONSTRUCTION. A snake is a TUBE: every length of it — ground rings, neck, tail — is
// one path stroked four times (ink halo, the scale colour, a shade band under it, a lit
// band over it), and its pattern is the same path stroked once more with a dash, so bands
// and diamonds run round the body instead of being stamped on top. Bold solid ink, the
// weight the shipped snake was given on 15 Oct.
//
// Nothing here is registered in any gameplay registry.
import { drawCabinetLane, placeCandidate, slotEnvelope } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X, PLAYER_W } from '../game/player.js';
import { GROUND_Y } from '../engine/camera.js';
import { swipeOf, SWIPE_LEAD } from './neon-cat-candidates.js';
import { ANIMAL_PAINTERS, SNAKE_IDLE_FRAMES, SNAKE_STRIKE_FRAMES, SNAKE_STRIKE_T } from '../sprites/animals.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const INK = '#2a1d1e';
const HALO = 1.1;
const WHITE = '#fffaf0';

export const COBRA_SLOT = Object.freeze({
  box: [18, 10], tall: 1.6, name: 'STRIKES AS YOU ARRIVE',
  was: 'rattlesnake — 18x10, jump, strikes as you arrive',
});
export const RATTLER_SLOT = Object.freeze({ ...COBRA_SLOT, tall: 1.45 });

function pen(c, col, lw, cap = 'round') {
  c.strokeStyle = col; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = cap;
}
function strokeP(c, col, lw, path, cap = 'round', dash = null, off = 0) {
  c.save();
  c.beginPath(); path(c); pen(c, col, lw, cap);
  if (dash) { c.setLineDash(dash); c.lineDashOffset = off; }
  c.stroke();
  c.restore();
}
function fillP(c, col, path) { c.beginPath(); path(c); c.fillStyle = col; c.fill(); }
function inked(c, col, path, lw = 0.5) {
  c.beginPath(); path(c); c.fillStyle = col; c.fill(); pen(c, INK, lw); c.stroke();
}
const oval = (x, y, rx, ry, rot = 0) => (p) => p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
const circle = (x, y, r) => (p) => p.arc(x, y, Math.max(0.01, r), 0, TAU);
const polyP = (pts) => (p) => { p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); };

// A length of snake. `pattern` is [colour, dash, width share] strokes laid on top.
function tubeBody(c, path, th, P, { lit = true, under = null, over = null, pattern = [] } = {}) {
  strokeP(c, INK, th + HALO, path);
  strokeP(c, P.body, th, path);
  for (const [col, dash, k, off] of pattern) strokeP(c, col, th * k, path, 'butt', dash, off || 0);
  if (under) strokeP(c, P.dark, th * 0.3, under, 'butt');
  if (lit && over) strokeP(c, P.lit, th * 0.28, over, 'butt');
}

// A flat ground ring: the near half shaded under and lit on top, as the shipped coil is.
function ring(c, cx, cy, rx, ry, th, P, pattern) {
  const full = oval(cx, cy, rx, ry);
  tubeBody(c, full, th, P, {
    pattern,
    under: (p) => p.ellipse(cx, cy + th * 0.3, rx, ry, 0, 0.08 * Math.PI, 0.92 * Math.PI),
    over: (p) => p.ellipse(cx, cy - th * 0.26, rx, ry, 0, 0.1 * Math.PI, 0.9 * Math.PI),
  });
}

// The pose: strike `s` 0..1 and wind-up `w`, the neck's four control points blended from
// rest through the wind to the strike. All three cobras share it; the rattler has its own.
function cobraPose(t, u, g) {
  const { s, w } = swipeOf(u);
  const sway = Math.sin(t * TAU * 0.55) * 0.7 * (1 - s);
  const rest = [[13.4, g - 4.2], [11.4, g - 8.4], [16.4, g - 11.6], [14.2 + sway, 6.6]];
  const wind = [[13.6, g - 4.2], [11.8, g - 8.0], [17.8, g - 11.0], [16.4, 5.6]];
  const hit = [[12.6, g - 4.0], [10.4, g - 6.4], [9.8, 10.8], [7.4, 11.6]];
  const pts = rest.map((p, i) => {
    const q = [lerp(p[0], wind[i][0], w), lerp(p[1], wind[i][1], w)];
    return [lerp(q[0], hit[i][0], s), lerp(q[1], hit[i][1], s)];
  });
  const flick = s > 0 ? 0 : Math.max(0, Math.sin(t * TAU * 1.6)) * ((t * 1.3) % 1 < 0.4 ? 1 : 0);
  return { s, w, pts, flick, lean: -0.55 * s + 0.15 * w, gape: Math.max(w * 0.6, s) };
}
const bez = (pts) => (p) => { p.moveTo(pts[0][0], pts[0][1]); p.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); };

// The hood, seen from behind and to one side as the head turns to the hero: a broad leaf
// round the top of the neck, its back carrying the species' mark. Drawn in hood space:
// the neck top at the origin, up is -y.
function hood(c, P, mark, open = 1) {
  const W = 3.6 * open, T = -1.2, B = 6.4;
  const leaf = (p) => {
    p.moveTo(0, T);
    p.bezierCurveTo(W * 1.05, T + 0.6, W * 1.1, B * 0.55, 0.9, B);
    p.lineTo(-0.9, B);
    p.bezierCurveTo(-W * 1.1, B * 0.55, -W * 1.05, T + 0.6, 0, T);
    p.closePath();
  };
  c.save();
  c.beginPath(); leaf(c); pen(c, INK, HALO); c.stroke();
  fillP(c, P.hood, leaf);
  c.save();
  c.beginPath(); leaf(c); c.clip();
  fillP(c, P.dark, (p) => p.rect(W * 0.35, T, W, B - T));
  fillP(c, P.lit, oval(-W * 0.45, B * 0.25, W * 0.35, B * 0.35));
  mark(c, W, T, B);
  c.restore();
  c.restore();
}

// The head in profile, facing left, at the neck's end: a cobra's head is a rounded
// oblong, not the pit viper's arrowhead; the jaw drops for the strike.
function head(c, x, y, R, P, { tilt = 0, scale = 1, brow = true } = {}) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.08 + tilt + R.s * 0.15);
  c.scale(scale, scale);
  const gape = R.gape * 0.7;
  // Jaw first, hinged at the back.
  c.save();
  c.translate(1.4, 0.4);
  c.rotate(-gape);
  inked(c, P.belly, polyP([0.3, -0.3, -4.6, -0.1, -4.4, 0.6, 0.2, 0.9]), 0.35);
  c.restore();
  if (gape > 0.06) {
    fillP(c, '#d9606c', polyP([1.6, 0.2, -3.6, 0.25, -3.4 + gape * 1.3, 0.3 + gape * 4.2]));
    fillP(c, WHITE, polyP([-3.1, 0.15, -2.7, 0.15, -2.95, 1.6]));
  }
  inked(c, P.head, (p) => {
    p.moveTo(2.2, 0.9);
    p.quadraticCurveTo(2.6, -1.4, 0.6, -2.0);
    p.quadraticCurveTo(-2.6, -2.2, -4.0, -1.0);
    p.quadraticCurveTo(-4.6, 0.0, -3.8, 0.5);
    p.lineTo(1.4, 1.1);
    p.closePath();
  }, 0.45);
  fillP(c, P.lit, (p) => { p.moveTo(1.6, -1.6); p.quadraticCurveTo(-1.0, -2.1, -3.4, -0.9); p.quadraticCurveTo(-1.0, -1.3, 1.8, -0.9); p.closePath(); });
  strokeP(c, P.belly, 0.3, (p) => { p.moveTo(-3.6, 0.3); p.quadraticCurveTo(-1, 0.6, 1.6, 0.9); });
  // The eye: round, dark, a glint — a cobra's is round-pupilled; the brow scale over it.
  fillP(c, '#120a08', circle(-1.9, -0.9, 0.62));
  fillP(c, P.eye, circle(-1.9, -0.9, 0.4));
  fillP(c, '#120a08', circle(-1.95, -0.9, 0.22));
  fillP(c, '#ffffff', circle(-2.1, -1.08, 0.12));
  if (brow) fillP(c, P.dark, polyP([-3.0, -1.5, -0.9, -1.95, -1.2, -1.3]));
  fillP(c, '#120a08', circle(-3.6, -0.3, 0.16));
  if (R.flick > 0.1) {
    strokeP(c, '#d8323a', 0.3, (p) => {
      p.moveTo(-3.9, 0.3); p.lineTo(-3.9 - R.flick * 2.1, 0.4);
      p.lineTo(-4.6 - R.flick * 2.3, -0.2); p.moveTo(-3.9 - R.flick * 2.1, 0.4); p.lineTo(-4.6 - R.flick * 2.3, 0.9);
    });
  }
  c.restore();
}

// Strike streaks behind a lunging head.
function streaks(c, R, x, y) {
  if (R.s < 0.2 || R.s > 0.999) return;
  strokeP(c, `rgba(255,244,216,${(0.6 * R.s).toFixed(3)})`, 0.35, (p) => {
    p.moveTo(x + 4, y - 2.6); p.lineTo(x + 8.5, y - 3.2);
    p.moveTo(x + 4.4, y + 1.6); p.lineTo(x + 8, y + 1.8);
  });
}

function cobra(c, w, h, t, u, P, { pattern, neckPattern, mark, throat = null }) {
  const g = h - 0.2;
  const R = cobraPose(t, u, g);
  // The tail, out of the bottom ring and curling off to the right.
  tubeBody(c, (p) => { p.moveTo(19.6, g - 1.4); p.quadraticCurveTo(22.6, g - 1.2, 23.2, g - 2.8); }, 1.2, P, { pattern });
  ring(c, 15.6, g - 1.9, 6.4, 1.7, 2.8, P, pattern);
  ring(c, 15.0, g - 3.9, 4.2, 1.3, 2.5, P, pattern);
  // The neck, up out of the top ring — with its bands, and the pale belly scutes on the
  // side facing the hero.
  const neck = bez(R.pts);
  tubeBody(c, neck, 2.5, P, { pattern: neckPattern || pattern });
  strokeP(c, P.belly, 0.9, (p) => {
    const q = R.pts;
    p.moveTo(q[0][0] - 0.6, q[0][1]);
    p.bezierCurveTo(q[1][0] - 0.9, q[1][1] + 0.3, q[2][0] - 0.9, q[2][1] + 0.6, q[3][0] - 0.6, q[3][1] + 1.6);
  });
  const [hx, hy] = R.pts[3];
  // The hood rides the top of the neck and leans with the strike; the head sits on it.
  c.save();
  c.translate(hx, hy);
  c.rotate(R.lean);
  hood(c, P, mark, 1 - R.s * 0.15);
  if (throat) throat(c);
  c.restore();
  // The head juts forward off the top of the hood, its snout well clear of the hood's edge.
  const hp = [hx - 1.4 - R.s * 0.4, hy - 1.4 + R.s * 0.8];
  head(c, hp[0], hp[1], R, P, { scale: 1.12 });
  streaks(c, R, hp[0], hp[1]);
}

// A — SPECTACLED COBRA. The snake charmer's cobra: wheat-brown, faint dark bands, and on
// the back of the hood the spectacles — two cream rings joined by a bar, inked dark.
const SPECS = { body: '#b98a4e', lit: '#e6c07e', dark: '#7a5226', belly: '#f0dcae', hood: '#c89a5c',
  head: '#a87a40', eye: '#e2a83a', band: '#7c5428' };
function spectacled(c, w, h, t, u) {
  cobra(c, w, h, t, u, SPECS, {
    pattern: [[SPECS.band, [0.7, 2.4], 0.95]],
    mark: (q, W, T, B) => {
      // Small and low on the hood, dark-rimmed cream loops joined by a bar — a mark, not
      // a second face: no pupils, and well under where the eyes are.
      const y = B * 0.56, r = W * 0.2;
      for (const sx of [-1, 1]) {
        q.save();
        q.beginPath(); q.ellipse(sx * W * 0.34, y, r, r * 1.15, sx * 0.3, 0, TAU);
        pen(q, '#3a2414', 0.55); q.stroke();
        q.restore();
      }
      strokeP(q, '#3a2414', 0.45, (p) => { p.moveTo(-W * 0.34, y + r * 1.1); p.quadraticCurveTo(0, y + r * 2.4, W * 0.34, y + r * 1.1); });
    },
  });
}

// B — KING COBRA. Olive-black with pale chevron bands that brighten toward the head, a
// narrower, longer hood, gold eye. The biggest and the darkest — it stands off the desert
// by being the one dark thing in it.
const KING = { body: '#3f3d26', lit: '#6f6c42', dark: '#24231a', belly: '#e9dfac', hood: '#4a4730',
  head: '#555233', eye: '#f2c14a', band: '#e2d698' };
function king(c, w, h, t, u) {
  cobra(c, w, h, t, u, KING, {
    pattern: [[KING.band, [0.5, 2.0], 0.95]],
    neckPattern: [[KING.band, [0.6, 1.5], 0.95]],
    mark: (q, W, T, B) => {
      for (let i = 0; i < 3; i++) {
        const y = B * (0.2 + i * 0.24);
        strokeP(q, KING.band, 0.55, (p) => { p.moveTo(-W * 0.8, y + 0.9); p.lineTo(0, y); p.lineTo(W * 0.8, y + 0.9); });
      }
    },
  });
}

// C — EGYPTIAN COBRA. The desert's own: sand-coloured to sit in Speed Zone, plain-backed,
// and across the throat under the hood one broad black band — the warning is the band.
const EGYPT = { body: '#c9a467', lit: '#ecd39a', dark: '#8e6c3a', belly: '#f3e4bc', hood: '#d2ae70',
  head: '#b8935a', eye: '#d6862a', band: '#8a6834' };
function egyptian(c, w, h, t, u) {
  cobra(c, w, h, t, u, EGYPT, {
    pattern: [[EGYPT.band, [0.35, 3.0], 0.8, 1.2]],
    mark: (q, W, T, B) => {
      // Faint mottling only; the throat band below does the work.
      for (let i = 0; i < 5; i++) fillP(q, 'rgba(120,88,44,0.45)', oval((i % 2 ? 1 : -1) * W * 0.3 * (i / 4), B * (0.15 + i * 0.15), 0.6, 0.35));
    },
    throat: (q) => {
      q.save();
      q.beginPath();
      q.moveTo(-3.4, 4.0); q.quadraticCurveTo(0, 5.4, 3.3, 4.0);
      q.lineTo(2.4, 5.6); q.quadraticCurveTo(0, 6.6, -2.4, 5.6); q.closePath();
      q.fillStyle = '#2e1e12'; q.fill();
      q.restore();
    },
  });
}

// D — THE RATTLER, REDRAWN. SHIPPED 16 Oct 2026 ("d for the rattlesnake is fantastic -
// ship it", then "can we attach his neck better?"): the art now lives in
// sprites/animals.js as the rattlesnake itself, so this tile draws the shipped painter,
// stepped on its own frame ring exactly as draw.js steps it.
function rattler(c, w, h, t, u) {
  const strike = u != null && u >= 0 && u < SNAKE_STRIKE_T;
  const f = strike
    ? SNAKE_IDLE_FRAMES + Math.min(SNAKE_STRIKE_FRAMES - 1, Math.floor((u / SNAKE_STRIKE_T) * SNAKE_STRIKE_FRAMES))
    : Math.floor(t * 12) % SNAKE_IDLE_FRAMES;
  ANIMAL_PAINTERS.rattlesnake(c, w, h, f);
}

// ============================================================== the sheet
export const COBRA_CANDIDATES = [
  { letter: 'A', id: 'spectacled', name: 'SPECTACLED COBRA', slot: COBRA_SLOT, paint: spectacled,
    note: 'The snake charmer\'s cobra, reared up out of two ground rings: wheat-brown with faint bands, hood spread, the spectacles on its back. Sways, flicks its tongue, rocks back and lunges hood-first.' },
  { letter: 'B', id: 'king', name: 'KING COBRA', slot: COBRA_SLOT, paint: king,
    note: 'Olive-black with pale chevron bands, chevrons on the hood, gold eye. The one dark thing on the desert road, so it reads from furthest away.' },
  { letter: 'C', id: 'egyptian', name: 'EGYPTIAN COBRA', slot: COBRA_SLOT, paint: egyptian,
    note: 'The desert\'s own cobra: sand-coloured to belong in Speed Zone, plain-backed, and one broad black band across the throat under the hood.' },
  { letter: 'D', id: 'rattler', name: 'THE RATTLER, REDRAWN (SHIPPED)', slot: RATTLER_SLOT, paint: rattler,
    note: 'SHIPPED 16 Oct as the rattlesnake, neck re-attached to the top coil. In case "the cobra" means the snake already in the road: the rattlesnake rebuilt — three rings with the diamonds running round them, a taller S of neck, a bigger rattle straight up and buzzing. Same box and stature as the shipped one.' },
];
export const COBRA_NOW = { letter: 'NOW', id: 'rattlesnake', name: 'THE RATTLESNAKE (shipped)',
  note: 'What Speed Zone deals today, through the real run painter, strike clock driven as run.js drives it.' };

const slotted = (cand, u) => ({ slot: cand.slot, paint: (c, w, h, tt) => cand.paint(c, w, h, tt, u) });
const snakes = new Map();
function drawNow(c, x, t, u) {
  if (!snakes.has(x)) snakes.set(x, makeObstacle('rattlesnake', 0));
  const e = snakes.get(x);
  e.x = x;
  e.strikeT = u == null || u < 0 ? null : u;
  drawWorldEntity(c, e, 0, t, null, {});
}

// The approach and the line-up, as on the neon cat sheet: the snake rides in with the
// road, strikes SWIPE_LEAD ahead of the hero, and Lorenzo hops it.
const SPEED = 110, START = 268, LOOP = 3.2, HOP_V = 250, HOP_G = 900;
const HERO_C = PLAYER_X + PLAYER_W / 2;
export function drawCobraApproach(ctx, t, cabId, strips, cand) {
  const ph = ((t % LOOP) + LOOP) % LOOP;
  const x = START - SPEED * ph;
  const u = ph - (START - HERO_C - SPEED * SWIPE_LEAD) / SPEED;
  const hop = ph - (START - HERO_C - 18) / SPEED;
  const air = hop > 0 && hop < (2 * HOP_V) / HOP_G;
  const y = air ? HOP_V * hop - 0.5 * HOP_G * hop * hop : 0;
  drawCabinetLane(ctx, t, cabId, strips, (c, tt) => {
    if (cand.id === 'rattlesnake') drawNow(c, x, tt, u);
    else placeCandidate(c, slotted(cand, u), x, tt, 1);
    const pose = air
      ? { kind: 'jump', time: tt, vy: HOP_V - HOP_G * hop, grounded: false, facing: 1 }
      : { kind: 'run', phase: tt * 1.6 % 1, time: tt, grounded: true, facing: 1 };
    drawToon(c, 'lorenzo', pose, PLAYER_X, GROUND_Y - y, HERO_DRAW_H);
  }, { hero: null });
}

const LINEUP_LOOP = 2.2;
export function drawCobraLineup(ctx, t, cabId, strips) {
  const all = [COBRA_NOW, ...COBRA_CANDIDATES];
  const step = 200 / all.length;
  const u = (((t % LINEUP_LOOP) + LINEUP_LOOP) % LINEUP_LOOP) - 1.0;
  const xs = all.map((_, i) => 26 + step * (i + 0.5));
  drawCabinetLane(ctx, t, cabId, strips, (c, tt) => {
    all.forEach((cand, i) => {
      const bx = xs[i] - COBRA_SLOT.box[0] / 2;
      if (cand.id === 'rattlesnake') drawNow(c, bx, tt, u);
      else placeCandidate(c, slotted(cand, u), bx, tt, 1);
    });
  }, { hero: null, labels: all.map((cand, i) => [cand.letter === 'NOW' ? '·' : cand.letter, xs[i]]) });
}

export const COBRA_ENVELOPE = slotEnvelope({ slot: COBRA_SLOT });
