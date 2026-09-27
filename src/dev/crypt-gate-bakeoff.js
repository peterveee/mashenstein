// CRYPT SHIFT — the graveyard gates, animated (lab bake-off, 27 Sep 2026). Peter: "there
// are a lot of gates in the crypt levels.. maybe it would be nice if they were animated
// swinging or if some were about to fall off... do a bakeoff with some animate4d options".
//
// The near bank's two gates keep their posts in the bake; their leaves are painted live
// by stylePacks/cryptGouache.js (gateLeaves), which takes a lab painter through the
// backdrop config's `cryptGate`. Every candidate here is one such painter: it redraws the
// shipped leaf stroke for stroke, written closed, and moves it by three motions —
//   swing  th   about the hinge post, into the graveyard (the leaf squeezes toward its
//               hinge and its free edge shortens: the rings go elliptical for free)
//   tip    tip  about its foot, toward the camera (the top comes down and forward)
//   sag    rot  in the picture plane about a hinge that still holds (free end drops)
// A and F shipped (27 Sep) and live in stylePacks/cryptGates.js with the leaf itself;
// nothing in the run uses this file.
import { GROUND_Y, VIEW_W, ZOOM, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { GOUACHE_KIT as K, GATE_HALF, gateStill } from '../engine/stylePacks/cryptGouache.js';
import { CABINETS } from '../data/cabinets.js';
import { drawToon } from '../sprites/toons.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { PLAYER_X } from '../game/player.js';
import { cryptIdeaCamX } from './crypt-ideas/scene.js';
import { leaf, puff, wind, clamp01, easeOut, wrap, HW, gateCreak, gateSlam, slamOpen, drawSlam } from '../engine/stylePacks/cryptGates.js';

const IRON = K.css(K.C.iron);

// ---------------------------------------------------------------- the candidates
// Each is make(held) -> painter(ctx, f). `held` is the close-up card, where the camera
// never moves; a candidate that waits for the hero to come up plays on a clock there.
const GUST_T = 5.5;
function gustLeaf(u, delay, open) {
  const v = u - delay;
  if (v < 0) return 0;
  if (v < 0.7) return open * easeOut(v / 0.7);
  if (v < 2.6) return open + 0.08 * Math.sin(9 * v) + 0.06 * Math.sin(5.3 * v + 1);
  const shut = open + 0.08 * Math.sin(9 * 2.6) + 0.06 * Math.sin(5.3 * 2.6 + 1);
  if (v < 3.2) { const q = (v - 2.6) / 0.6; return shut * (1 - q * q); }
  const w = v - 3.2;
  return 0.24 * Math.abs(Math.sin(w * 9)) * Math.exp(-w * 4);
}
function gust() {
  return (ctx, f) => {
    const { x, b, t, i } = f;
    const u = wrap(t + i * 2.3, GUST_T);
    leaf(ctx, { th: gustLeaf(u, 0.18, 1.0) }, -1, x, b);
    leaf(ctx, { th: gustLeaf(u, 0, 1.3) }, 1, x, b);
    // The slam kicks a little dirt off the foot where they meet.
    puff(ctx, x, b, (u - 3.2) / 0.7, 8);
  };
}

function sag() {
  return (ctx, f) => {
    const { x, b, t, i } = f;
    const w = wind(t, i);
    leaf(ctx, {}, -1, x, b);
    // The top hinge has rusted through: the leaf hangs off the bottom one, top corner
    // clear of its post, free corner dug into the bank. The wind rocks it on that pin.
    const rot = 0.19 + 0.05 * (w - 0.5) + 0.018 * Math.sin(6.5 * t + i);
    leaf(ctx, { rot, pivot: [0.6, -4], th: 0.12 + 0.18 * w, dy: -1.4 }, 1, x, b);
  };
}

// Leaning out over the path on one hinge, rocking, and now and then lurching forward
// as if this is it — then catching. `nerve` 0..1 makes the lurches bigger and closer.
function wobbleTip(t, i, nerve = 0) {
  const T = 4.2 - 1.6 * nerve;
  const u = wrap(t + i * 1.7, T);
  const rock = 0.3 + 0.08 * Math.sin(2.3 * t + i) + 0.03 * Math.sin(7.9 * t);
  const lurch = u < 0.25 ? easeOut(u / 0.25) : Math.exp(-(u - 0.25) * 3.2) * Math.cos((u - 0.25) * 11);
  return rock + (0.42 + 0.2 * nerve) * Math.max(-0.4, lurch);
}
function wobble() {
  return (ctx, f) => {
    const { x, b, t, i } = f;
    leaf(ctx, { th: 0.05 }, -1, x, b);
    leaf(ctx, { tip: wobbleTip(t, i), rot: 0.05, pivot: [0.6, -4] }, 1, x, b);
  };
}

// It goes as the hero comes up to it: rocks harder the nearer the runner gets, the
// last hinge pops when the gate is a stride ahead of him, and the leaf slams down flat
// on the bank in a puff of dirt and lies there. The camera held (close-up) plays it on
// an eight-second clock, fading back in to start again.
const FALL_AT = PLAYER_X * ZOOM + 90;
const FALL_T = 0.55;
function fallTip(age) {
  if (age < FALL_T) {
    const q = age / FALL_T;
    return 0.6 + (Math.PI / 2 - 0.6) * q * q;
  }
  const w = age - FALL_T;
  return Math.PI / 2 - 0.2 * Math.abs(Math.sin(w * 11)) * Math.exp(-w * 5);
}
function falls(held) {
  const armed = new Map();
  return (ctx, f) => {
    const { x, b, t, i } = f;
    leaf(ctx, { th: 0.05 }, -1, x, b);
    let age, nerve, alpha = 1;
    if (held) {
      const u = wrap(t, 8);
      age = u - 4.6;
      nerve = clamp01(u / 4.6);
      if (u > 7.6) alpha = 1 - (u - 7.6) / 0.4;
      else if (u < 0.4) alpha = u / 0.4;
    } else {
      const key = i;
      if (x > FALL_AT) armed.delete(key);
      // First seen already past the mark (a card opened mid-loop): it is already down.
      else if (!armed.has(key)) armed.set(key, x < FALL_AT - 30 ? t - 10 : t);
      age = armed.has(key) ? t - armed.get(key) : -1;
      nerve = clamp01(1 - (x - FALL_AT) / 260);
    }
    if (age < 0) {
      leaf(ctx, { tip: wobbleTip(t, i, nerve), rot: 0.05, pivot: [0.6, -4] }, 1, x, b, alpha);
      return;
    }
    leaf(ctx, { tip: fallTip(age), rot: 0.05 * (1 - clamp01(age / FALL_T)), pivot: [0.6, -4] }, 1, x, b, alpha);
    puff(ctx, x + HW * 0.5, b + 4, (age - FALL_T) / 0.9, 18);
  };
}

// F shipped (cryptGates.js gateSlam). Its close-up plays it on an eight-second clock and
// lets the wind ease the leaves open again; the running card is the shipped painter.
function slam(held) {
  if (!held) return gateSlam;
  return (ctx, f) => {
    const { x, b, t, i } = f;
    const u = wrap(t, 8);
    const base = t - u;
    if (u > 6.5) {
      const k = easeOut((u - 6.5) / 1.5);
      leaf(ctx, { th: slamOpen(t, i, -1) * k }, -1, x, b);
      leaf(ctx, { th: slamOpen(t, i, 1) * k }, 1, x, b);
      return;
    }
    drawSlam(ctx, x, b, t, i, base + 4.4 + 0.28);
  };
}

export const CRYPT_GATE_CANDIDATES = [
  { id: '0', name: 'BEFORE — shut and still', note: 'The gate as it was before 27 Sep.', make: () => gateStill },
  { id: 'A', name: 'CREAKING AJAR — SHIPS', note: 'The right leaf stands open into the graveyard and swings with the wind; the left stays shut.', make: () => gateCreak },
  { id: 'B', name: 'BLOWN OPEN, SLAMMED SHUT', note: 'A gust throws both leaves wide (the right first), holds them fluttering, then drops them: they slam, bounce and kick up a little dirt. Every 5.5 s.', make: gust },
  { id: 'C', name: 'SAGGING ON ONE HINGE', note: 'The right leaf\'s top hinge has gone: it hangs off the bottom one, clear of its post at the top, the free corner dug into the bank, rocking in the wind.', make: sag },
  { id: 'D', name: 'ABOUT TO GO', note: 'The right leaf leans out over the path on its last hinge, rocking, and every few seconds lurches forward as if this is it — then catches.', make: wobble },
  { id: 'E', name: 'FALLS AS YOU PASS', note: 'D, rocking harder as the runner comes up, until the hinge pops a stride ahead of him and the leaf slams down flat on the bank in a puff of dirt. Close-up: on an 8 s clock.', make: falls },
  { id: 'F', name: 'SLAMS IN YOUR FACE — SHIPS, ONE GATE IN FOUR', note: 'B\'s gust holding both leaves wide and fluttering as the gate comes up — then they bang shut a stride before the runner reaches it, bounce, kick up dirt and stay shut, rattling, till he\'s by. Close-up: on an 8 s clock.', make: slam, at: PLAYER_X * ZOOM + 40 },
];

// ---------------------------------------------------------------- the cards
const GATE_U = 322;   // the first gate on the near bank
const LOOP = 8;
const SCROLL = 40;
let pack = null;
let crypt = null;
function ready() {
  if (!pack) {
    pack = getStylePack('gouache', {});
    crypt = CABINETS.find((cab) => cab.id === 'crypt');
  }
}
const painters = new Map();
function painterFor(c, held) {
  const key = `${c.id}:${held}`;
  if (!painters.has(key)) painters.set(key, c.make(held));
  return painters.get(key);
}
function heroPose(t) {
  return {
    kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0,
    roll: false, float: false, stomp: false, headless: false, facing: 1,
  };
}

// The camera running at lane speed: the first gate enters right and leaves left over
// the loop, the hero in the lane in front of it.
export function drawCryptGateScene(ctx, t, c) {
  ready();
  const L = K.SCENE.fg;
  const lt = wrap(t, LOOP);
  const travel = SCROLL * LOOP * L.factor * ZOOM;
  // A candidate that plays off the runner (`at`) centres the gate's travel on him instead.
  const camX = cryptIdeaCamX({ layer: 'fg', u: GATE_U }, (c.at ?? 240) + travel / 2) + lt * SCROLL;
  ctx.save();
  pack.bg(ctx, t, camX, crypt, 1000, null, 0, { stageIndex: 1, cryptLife: false, cryptGate: painterFor(c, false) });
  ctx.restore();
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground(ctx, camX, crypt, [], [], t * 60, VIEW_W);
  drawToon(ctx, 'lorenzo', heroPose(t), PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
}

// The camera held on the gate, magnified `zoom` about its middle.
export function drawCryptGateCloseUp(ctx, t, c, w = 480, h = 270, zoom = 3.2) {
  ready();
  const L = K.SCENE.fg;
  const at = 240;
  const camX = cryptIdeaCamX({ layer: 'fg', u: GATE_U }, at);
  const shift = camX * L.factor * ZOOM;
  const crest = L.profile(at + shift, L.period);
  ctx.save();
  ctx.translate(w / 2, h * 0.6);
  ctx.scale(zoom, zoom);
  ctx.translate(-at, -(crest - 14));
  pack.bg(ctx, t, camX, crypt, 1000, null, 0, { stageIndex: 1, cryptLife: false, cryptGate: painterFor(c, true) });
  ctx.restore();
}

// A swing strip: the right leaf from shut to square-on to the camera in steps, so the
// rotation can be judged without the clock skipping the middle of it.
export function drawCryptGateSwingStrip(ctx, w = 480, h = 270) {
  ctx.fillStyle = K.css([27, 30, 62]);
  ctx.fillRect(0, 0, w, h);
  const steps = [0, 0.3, 0.6, 0.9, 1.2, 1.45];
  const z = 1.8;
  ctx.save();
  ctx.scale(z, z);
  const cw = w / z / steps.length;
  const b = h / z * 0.72;
  ctx.font = '5px monospace';
  steps.forEach((th, k) => {
    const gx = cw * (k + 0.5) - 4;
    ctx.fillStyle = IRON;
    ctx.fillRect(gx + HW - 1.5, b - 32, 3, 33.5);
    ctx.fillRect(gx - HW - 1.5, b - 32, 3, 33.5);
    ctx.fillStyle = K.css([44, 40, 70]);
    ctx.fillRect(gx - HW - 6, b + 1, 2 * HW + 12, 4);
    leaf(ctx, {}, -1, gx, b);
    leaf(ctx, { th }, 1, gx, b);
    ctx.fillStyle = K.css([190, 196, 220]);
    ctx.fillText(`${Math.round(th * 180 / Math.PI)}°`, gx - 5, b + 12);
  });
  ctx.restore();
}
