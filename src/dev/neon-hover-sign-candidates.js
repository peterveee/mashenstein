// TERMINAL VELOCITY — the station sign, flying (bake-off). Gallery only.
//
// Peter, 24 Sep 2026: "instead of the stationary signs showing the destinations in
// the terminal velocity levels, how about if they were floating in air powered by
// jets (we are talking about flying bullet trains, so...) ... With little flame jet
// packs (although done in a neon style) ... I would like to not have the poles if
// possible and don't want them suspended from the ceiling".
//
// Every candidate is the shipped sign — the same scrolling LED strip, the same span
// past the nose, its bottom the same NEON_SIGN_LIFT over the lane — with the poles
// gone and something else holding it up. What varies is where the thrust comes from
// and how the flame is drawn.
//
// THREE THINGS EVERY CANDIDATE SHARES, because they are what makes a thing FLOAT
// rather than just stop being attached:
//   - it bobs, slowly, a pixel and a bit;
//   - the thrust answers the bob — the flames lengthen as the sign sinks and has to
//     be caught, and shorten at the top of the stroke (thrust = gravity + the bob's
//     acceleration), so the fire is visibly doing the holding up;
//   - it lights the platform under it, a pool that brightens as it sinks. Nothing
//     says "there is air under this" like light landing on the floor below it.
//
// Pure functions of (ctx, x, w, railY, t): x and w are the sign's span, railY the
// lane it floats over. Nothing here is wired into the run.

import { drawTronLedStrip, TRON_PALETTE } from '../sprites/train.js';

const MAGENTA = '#e838f8';
const PINK = '#ff5a7a';
const AMBER = '#f6d33c';
const CYAN = TRON_PALETTE.neon.line;
const HULL = TRON_PALETTE.neon.hull;

export const HOVER_SIGN_LIFT = 36;       // the shipped sign's bottom over the lane
const SIGN_H = 9;
const BOB = 3;                           // px, either way (1.3 was invisible at play scale)
const BOB_RATE = 2.2;                    // rad/s — a slow float, not a shake

// The shipped tube: three additive halo stops and a white-hot core (train.js glowStroke).
const HALO = [[9, 0.045], [4.4, 0.085], [2, 0.16]];
const whiteCache = new Map();
function whiteHot(hex, amt = 0.55) {
  const key = hex + amt;
  if (whiteCache.has(key)) return whiteCache.get(key);
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const out = `rgb(${v.map((c) => Math.round(c + (255 - c) * amt)).join(',')})`;
  whiteCache.set(key, out);
  return out;
}
function tube(ctx, color, width, draw) {
  const a = ctx.globalAlpha;
  const op = ctx.globalCompositeOperation;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.globalCompositeOperation = 'lighter';
  for (const [m, al] of HALO) {
    ctx.globalAlpha = a * al;
    ctx.lineWidth = width * m;
    ctx.beginPath(); draw(ctx); ctx.stroke();
  }
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = a;
  ctx.strokeStyle = whiteHot(color);
  ctx.lineWidth = Math.max(0.5, width * 0.64);
  ctx.beginPath(); draw(ctx); ctx.stroke();
}

// The float: how far the sign sits below its rest height, and the thrust that implies.
function hover(t, phase = 0) {
  const s = Math.sin(t * BOB_RATE + phase);
  return { bob: s * BOB, thrust: 1 + 0.2 * s };
}

function flicker(t, seed) {
  return 1 + 0.16 * Math.sin(t * 31 + seed) + 0.09 * Math.sin(t * 47 + seed * 2.3);
}

function tonguePath(p, w, L) {
  p.moveTo(-w / 2, 0);
  p.quadraticCurveTo(-w * 0.55, L * 0.55, 0, L);
  p.quadraticCurveTo(w * 0.55, L * 0.55, w / 2, 0);
  p.closePath();
}

// A FILLED neon flame: the throne's three nested tongues, but as LIGHT — composited
// additively, magenta at the skirt through amber to a white-hot core, with a halo
// stroked round the outside so it bleeds onto the dark. Aims along +y; `rot` turns it.
const FIRE_NEON = [MAGENTA, PINK, AMBER];
const FIRE_WARM = ['#ff4a1c', '#ff8a2c', AMBER];
function fireFlame(ctx, x, y, w, len, t, seed = 0, rot = 0, inks = FIRE_NEON) {
  const L = len * flicker(t, seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const op = ctx.globalCompositeOperation;
  const a = ctx.globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = inks[0];
  ctx.lineJoin = 'round';
  for (const [lw, al] of [[3, 0.08], [1.4, 0.14]]) {
    ctx.globalAlpha = a * al;
    ctx.lineWidth = lw;
    ctx.beginPath(); tonguePath(ctx, w, L); ctx.stroke();
  }
  for (const [wf, lf, col, al] of [[1, 1, inks[0], 0.7], [0.66, 0.74, inks[1], 0.75], [0.4, 0.5, inks[2], 0.85],
    [0.2, 0.3, '#fff6e0', 1]]) {
    ctx.globalAlpha = a * al;
    ctx.fillStyle = col;
    ctx.beginPath(); tonguePath(ctx, w * wf, L * lf); ctx.fill();
  }
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = a;
  ctx.restore();
}

// A TUBE flame: the flame drawn the way the city draws a sign — an outline of glass
// tubing, one tongue inside another, bent into the shape of fire. It flickers by
// length, as a flame, but it is unmistakably a neon sign OF a flame.
function tubeFlame(ctx, x, y, w, len, t, seed = 0, rot = 0) {
  const L = len * flicker(t, seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  tube(ctx, MAGENTA, 0.9, (p) => {
    p.moveTo(-w / 2, 0);
    p.quadraticCurveTo(-w * 0.55, L * 0.55, 0, L);
    p.quadraticCurveTo(w * 0.55, L * 0.55, w / 2, 0);
  });
  const Li = L * 0.55 * flicker(t + 0.13, seed + 1);
  tube(ctx, AMBER, 0.8, (p) => {
    p.moveTo(-w * 0.22, 0);
    p.quadraticCurveTo(-w * 0.25, Li * 0.55, 0, Li);
    p.quadraticCurveTo(w * 0.25, Li * 0.55, w * 0.22, 0);
  });
  ctx.restore();
}

// CHEVRONS: no fire at all — thrust as Tron draws it, a stack of V's pouring out of
// the nozzle and fading as they fall, like the speed streaks' rhythm turned downward.
function chevronThrust(ctx, x, y, w, len, t, seed = 0) {
  const a = ctx.globalAlpha;
  for (let i = 0; i < 4; i++) {
    const q = ((t * 2.6 + i / 4 + seed * 0.1) % 1 + 1) % 1;
    const cy = y + 1 + q * len;
    const hw = w * (0.5 - q * 0.15);
    ctx.globalAlpha = a * (1 - q) * (1 - q);
    tube(ctx, CYAN, 0.8, (p) => {
      p.moveTo(x - hw, cy);
      p.lineTo(x, cy + hw * 0.7);
      p.lineTo(x + hw, cy);
    });
  }
  ctx.globalAlpha = a;
}

// The light the thrust throws on the platform: a flat additive ellipse on the lane.
function floorPool(ctx, cx, railY, rx, color, k) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(cx, railY);
  ctx.scale(1, 0.22);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, 0.32 * k));
  g.addColorStop(0.5, rgba(color, 0.12 * k));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function rgba(hex, a) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${v.join(',')},${Math.max(0, a).toFixed(3)})`;
}

// The sign's housing: the LED strip in a dark case edged in the train's cyan tube, so
// once it has no poles it still reads as a made object and not a floating decal.
function housing(ctx, x, y, w) {
  ctx.fillStyle = HULL;
  ctx.beginPath();
  ctx.roundRect(x - 2, y - 2, w + 4, SIGN_H + 4, 2);
  ctx.fill();
  tube(ctx, CYAN, 0.7, (p) => p.roundRect(x - 2, y - 2, w + 4, SIGN_H + 4, 2));
}

// A thruster nacelle: a small dark pod edged in cyan, its bell at the bottom.
function pod(ctx, cx, top, w, h) {
  ctx.fillStyle = HULL;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, top, w, h, Math.min(w, h) / 2.5);
  ctx.fill();
  tube(ctx, CYAN, 0.5, (p) => p.roundRect(cx - w / 2, top, w, h, Math.min(w, h) / 2.5));
  // The bell: a flared lip under the pod.
  ctx.fillStyle = '#2a2f48';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.3, top + h);
  ctx.lineTo(cx + w * 0.3, top + h);
  ctx.lineTo(cx + w * 0.42, top + h + 1.4);
  ctx.lineTo(cx - w * 0.42, top + h + 1.4);
  ctx.closePath();
  ctx.fill();
}

function signTop(railY, bob) { return railY - HOVER_SIGN_LIFT - SIGN_H + bob; }

export const HOVER_SIGN_CANDIDATES = Object.freeze([
  {
    id: 'twin', letter: 'A', name: 'TWIN THRUSTERS',
    note: 'The throne\'s answer: a pod under each end, one flame each, straight down. Filled flames '
      + 'composited as light — magenta skirt, amber, white-hot core. The simplest read of "jet-powered".',
    draw(ctx, x, w, railY, t) {
      const { bob, thrust } = hover(t);
      const y = signTop(railY, bob);
      const pods = [x + 11, x + w - 11];
      for (const px of pods) floorPool(ctx, px, railY, 14, MAGENTA, thrust);
      for (const [i, px] of pods.entries()) {
        pod(ctx, px, y + SIGN_H + 1, 6, 4);
        fireFlame(ctx, px, y + SIGN_H + 6.2, 5, 11 * thrust, t, i * 3.1);
      }
      housing(ctx, x, y, w);
      drawTronLedStrip(ctx, { x, y, w, h: SIGN_H }, t);
    },
  },
  {
    id: 'splayed', letter: 'B', name: 'SPLAYED PODS',
    note: 'The pods move OUT to the sign\'s ends and the flames splay away from the lane, so a hero '
      + 'running under it never has fire on his head. The widest silhouette — Eggshell\'s TWIN JETS.',
    draw(ctx, x, w, railY, t) {
      const { bob, thrust } = hover(t);
      const y = signTop(railY, bob);
      for (const [i, dir] of [-1, 1].entries()) {
        const px = dir < 0 ? x - 6 : x + w + 6;
        floorPool(ctx, px + dir * 8, railY, 14, MAGENTA, thrust);
        fireFlame(ctx, px, y + SIGN_H + 3.4, 5, 12 * thrust, t, i * 2.7, -dir * 0.55);
        pod(ctx, px, y - 0.5, 6, SIGN_H + 2.5);
      }
      housing(ctx, x, y, w);
      drawTronLedStrip(ctx, { x, y, w, h: SIGN_H }, t);
    },
  },
  {
    id: 'tube', letter: 'C', name: 'TUBE FLAMES',
    note: 'A\'s pods, but the flames are bent glass: an outline of tubing in the shape of fire, one tongue '
      + 'inside another. The literal "done in a neon style" — the jets are themselves a neon sign.',
    draw(ctx, x, w, railY, t) {
      const { bob, thrust } = hover(t);
      const y = signTop(railY, bob);
      const pods = [x + 11, x + w - 11];
      for (const px of pods) floorPool(ctx, px, railY, 14, MAGENTA, thrust);
      for (const [i, px] of pods.entries()) {
        pod(ctx, px, y + SIGN_H + 1, 6, 4);
        tubeFlame(ctx, px, y + SIGN_H + 6.2, 5.4, 12 * thrust, t, i * 3.1);
      }
      housing(ctx, x, y, w);
      drawTronLedStrip(ctx, { x, y, w, h: SIGN_H }, t);
    },
  },
  {
    id: 'rail', letter: 'D', name: 'FOUR-JET RAIL',
    note: 'A thruster rail along the whole underside with four short flames flickering out of step — a '
      + 'hoverboard under the sign. Shorter fire, so it covers least of the hero, and it reads as lift, not rockets.',
    draw(ctx, x, w, railY, t) {
      const { bob, thrust } = hover(t);
      const y = signTop(railY, bob);
      const jets = [0.12, 0.37, 0.63, 0.88].map((f) => x + w * f);
      floorPool(ctx, x + w / 2, railY, w * 0.6, MAGENTA, thrust * 0.9);
      ctx.fillStyle = HULL;
      ctx.beginPath();
      ctx.roundRect(x + 3, y + SIGN_H + 1.5, w - 6, 2.5, 1.2);
      ctx.fill();
      tube(ctx, CYAN, 0.55, (p) => { p.moveTo(x + 4, y + SIGN_H + 4.2); p.lineTo(x + w - 4, y + SIGN_H + 4.2); });
      for (const [i, jx] of jets.entries()) fireFlame(ctx, jx, y + SIGN_H + 4.4, 3.4, 7 * thrust, t, i * 1.9);
      housing(ctx, x, y, w);
      drawTronLedStrip(ctx, { x, y, w, h: SIGN_H }, t);
    },
  },
  {
    id: 'capsule', letter: 'E', name: 'BULLET CAPSULE',
    note: 'The sign becomes a little flying train: a capsule with the Yamanote nose, a rear exhaust trailing '
      + 'behind and two small lift jets under it. It holds station with a slow drift fore and aft, the exhaust '
      + 'flaring as it pushes back. Family with the trains it announces.',
    draw(ctx, x, w, railY, t) {
      const { bob, thrust } = hover(t);
      const drift = Math.sin(t * 0.9) * 2;
      const push = 1 + 0.35 * Math.cos(t * 0.9);        // leaning into the drift back
      x += drift;
      const y = signTop(railY, bob);
      floorPool(ctx, x + w / 2, railY, w * 0.45, MAGENTA, thrust * 0.8);
      // Rear exhaust, out of the tail.
      fireFlame(ctx, x - 5, y + SIGN_H / 2, 5, 11 * push, t, 4.2, Math.PI / 2);
      for (const [i, jx] of [x + 16, x + w - 20].entries()) {
        fireFlame(ctx, jx, y + SIGN_H + 3, 3.4, 6.5 * thrust, t, i * 2.2);
      }
      // The capsule: a blunt tail on the left, the nose tapering on the right.
      const body = (p) => {
        p.moveTo(x - 4, y - 3);
        p.lineTo(x + w + 1, y - 3);
        p.quadraticCurveTo(x + w + 14, y + SIGN_H * 0.4, x + w + 15, y + SIGN_H + 3);
        p.lineTo(x - 4, y + SIGN_H + 3);
        p.quadraticCurveTo(x - 7, y + SIGN_H / 2, x - 4, y - 3);
        p.closePath();
      };
      ctx.fillStyle = HULL;
      ctx.beginPath(); body(ctx); ctx.fill();
      tube(ctx, CYAN, 0.7, body);
      // The nose's windscreen, as the train's.
      tube(ctx, CYAN, 0.6, (p) => { p.moveTo(x + w + 3, y - 0.5); p.quadraticCurveTo(x + w + 9, y + 1, x + w + 10, y + 3.5); });
      drawTronLedStrip(ctx, { x, y, w, h: SIGN_H }, t);
    },
  },
  {
    id: 'chevrons', letter: 'F', name: 'CHEVRON THRUST',
    note: 'No fire: under each end a nozzle pours cyan chevrons that fade as they fall — thrust the way Tron '
      + 'draws it, in the train\'s own ink. The least literal, the most of a piece with the hull.',
    draw(ctx, x, w, railY, t) {
      const { bob, thrust } = hover(t);
      const y = signTop(railY, bob);
      const pods = [x + 11, x + w - 11];
      for (const px of pods) floorPool(ctx, px, railY, 13, CYAN, thrust);
      for (const [i, px] of pods.entries()) {
        pod(ctx, px, y + SIGN_H + 1, 6, 4);
        chevronThrust(ctx, px, y + SIGN_H + 6.2, 6.5, 13 * thrust, t, i * 5);
      }
      housing(ctx, x, y, w);
      drawTronLedStrip(ctx, { x, y, w, h: SIGN_H }, t);
    },
  },
  {
    id: 'warm', letter: 'G', name: 'WARM FIRE',
    note: 'A exactly, with the fire the colour of fire — red skirt, orange, amber, white core — as the throne '
      + 'burns. Still composited as light, so it glows; it just does not match the city\'s pink.',
    draw(ctx, x, w, railY, t) {
      const { bob, thrust } = hover(t);
      const y = signTop(railY, bob);
      const pods = [x + 11, x + w - 11];
      for (const px of pods) floorPool(ctx, px, railY, 14, '#ff6a3c', thrust);
      for (const [i, px] of pods.entries()) {
        pod(ctx, px, y + SIGN_H + 1, 6, 4);
        fireFlame(ctx, px, y + SIGN_H + 6.2, 5, 11 * thrust, t, i * 3.1, 0, FIRE_WARM);
      }
      housing(ctx, x, y, w);
      drawTronLedStrip(ctx, { x, y, w, h: SIGN_H }, t);
    },
  },
]);
