// Gallery-only: BEES THAT FOLLOW HIM, a bake-off (16 Oct 2026).
//
// Peter: "when the hero hits bees, could some bees follow him for a while?" — and, of the
// halo, "would it replace the stars and birds?". Today a bee swarm is a GENERIC hit: a
// white flash, then stars and birdies round his head (sprites/hitPictures.js). These
// candidates are the swarm's own picture: the same flash, then a few of the swarm's own
// bees stay with him ~3s (about twice the i-frames) and peel off one by one.
//
// The zap's rule holds: ONLY THE PICTURE CHANGES. Same shake, hitstop, i-frames, sound;
// nothing here is a hitbox. Painters are `paint(ctx, heroId, cx, feetY, w, t)` — w seconds
// since the hit, t a running clock — and are the `after` that runs over the ordinary
// blink. Nothing is wired into the run.
import { drawToon } from '../sprites/toons.js';
import { GEN_FLASH, HIT_KIT } from '../sprites/hitPictures.js';
import { bee } from '../sprites/plumberProps.js';
import { drawCabinetLane } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity } from '../game/draw.js';
import { GROUND_Y } from '../engine/camera.js';

const { U, SCROLL, hash, clamp01, runPose, faceOf, star, paintFlash, starsAndBirdies } = HIT_KIT;
export const BEE_LIFE = 3.3;      // how long the last bee stays
const BEE_S = 0.85;               // the swarm's own bee in world px (hitPictures BEE_SIZE)
const INK_TRAIL = 'rgba(42,26,22,0.5)';

// One bee at (x, y) flying along vx: faces the way it is going, wings flickering.
function beeAt(c, x, y, vx, i, t, alpha = 1, s = BEE_S) {
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha;
  bee(c, x, y, vx >= 0 ? -1 : 1, s, Math.floor(t * 34 + i * 3) % 2 === 0);
  c.restore();
}
// A bee's turn to go: from `at` it flies up and off behind him (left behind by the scroll)
// and fades over 0.45s. Returns [dx, dy, alpha].
function peel(w, at) {
  const q = clamp01((w - at) / 0.45);
  return [-SCROLL * 0.7 * q * q - 30 * q, -34 * q - 10 * q * q, 1 - q];
}
const fadeIn = (w) => clamp01((w - GEN_FLASH) / 0.12);
const headOf = (heroId, cx, fy) => { const f = faceOf(heroId); return [cx + f.ex * U, fy + (f.top - 0.02) * U]; };

// ---------------------------------------------------------------- A — HALO
// Four bees go round his head on the flat ring where the stars were, far side first and
// the near side over him, each wandering a little behind. They leave one at a time.
function halo(c, heroId, cx, fy, w, t, n, leaveAt, skip = () => false) {
  const [hx, hy] = headOf(heroId, cx, fy);
  for (const front of [false, true]) {
    for (let i = 0; i < n; i++) {
      if (skip(i)) continue;
      const ang = t * 7 + i * Math.PI * 2 / n;
      if ((Math.sin(ang) > 0) !== front) continue;
      const [dx, dy, a] = peel(w, leaveAt(i));
      const lag = 0.12 * U + 0.06 * U * Math.sin(t * 3 + i * 2);
      beeAt(c, hx + Math.cos(ang) * 0.36 * U - lag + dx, hy + Math.sin(ang) * 0.1 * U + dy,
        -Math.sin(ang) * (w < leaveAt(i) ? 1 : -1), i, t, a * fadeIn(w), front ? BEE_S : BEE_S * 0.8);
    }
  }
}
export function beeHalo(c, heroId, cx, fy, w, t) {
  if (w > BEE_LIFE) return;
  halo(c, heroId, cx, fy, w, t, 4, (i) => 1.3 + i * 0.55);
}

// B — CLOUD shipped: sprites/hitPictures.js beeCloud (at the swarm's own bee size).
const beeCloud = (c, heroId, cx, fy, w, t) => { starsAndBirdies(c, heroId, cx, fy, w, t); HIT_KIT.beeCloud(c, heroId, cx, fy, w, t); };

// ---------------------------------------------------------------- C — ONE ANGRY BEE
// Most of the swarm is shaken off at once; one bee, a bit bigger, will not be. It darts at
// his face and loops back over his head on a jittery zig-zag with a buzz line behind it,
// right the way through, and flicks off at the end. Two hangers-on leave early.
export function beeStraggler(c, heroId, cx, fy, w, t) {
  if (w > BEE_LIFE) return;
  const [hx, hy] = headOf(heroId, cx, fy);
  halo(c, heroId, cx, fy, w, t, 2, (i) => 0.7 + i * 0.5);
  const ph = t * 4.2;
  const dart = Math.max(0, Math.sin(ph * 1.7));            // 0..1: in at his face, out again
  const x = hx - 0.12 * U + Math.cos(ph) * 0.55 * U + dart * 0.5 * U + Math.sin(t * 38) * 0.04 * U;
  const y = hy + 0.05 * U + Math.sin(ph * 1.3) * 0.28 * U - dart * 0.04 * U + Math.cos(t * 31) * 0.04 * U;
  const [dx, dy, a] = peel(w, BEE_LIFE - 0.45);
  const vx = -Math.sin(ph) * 0.55 + dart * 0.3;
  const al = a * fadeIn(w);
  // The buzz line: where it was a moment ago, pulled back by the scroll.
  c.save(); c.globalAlpha *= 0.7 * al;
  c.beginPath();
  for (let k = 0; k < 7; k++) {
    const tt = t - k * 0.028, p2 = tt * 4.2, d2 = Math.max(0, Math.sin(p2 * 1.7));
    const px = hx - 0.12 * U + Math.cos(p2) * 0.55 * U + d2 * 0.5 * U - SCROLL * k * 0.028 + dx;
    const py = hy + 0.05 * U + Math.sin(p2 * 1.3) * 0.28 * U + dy;
    if (k) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.strokeStyle = INK_TRAIL; c.lineWidth = 0.45; c.setLineDash([1.6, 1.2]); c.stroke();
  c.restore();
  beeAt(c, x + dx, y + dy, vx, 7, t, al, BEE_S * 1.3);
}

// ---------------------------------------------------------------- D — STARS, THEN BEES
// Keeps the stars (the cartoon staple) for the first second and lets the bees take the
// ring over: five slots on one ring, three stars that fade at ~1s, two bees that stay,
// one leaving at 2.2s and one at 3s.
export function starsThenBees(c, heroId, cx, fy, w, t) {
  if (w > BEE_LIFE) return;
  const [hx, hy] = headOf(heroId, cx, fy);
  const n = 5, starA = fadeIn(w) * (1 - clamp01((w - 0.9) / 0.15));
  for (const front of [false, true]) {
    for (let i = 0; i < n; i++) {
      const ang = t * 8 + i * Math.PI * 2 / n;
      if ((Math.sin(ang) > 0) !== front) continue;
      const x = hx + Math.cos(ang) * 0.34 * U, y = hy + Math.sin(ang) * 0.09 * U;
      if (i % 2 === 0) {
        if (starA <= 0) continue;
        c.save(); c.globalAlpha *= starA; star(c, x, y, front ? 2.3 : 1.8, t * 6 + i); c.restore();
      } else {
        const at = i === 1 ? 2.2 : BEE_LIFE - 0.45;
        const [dx, dy, a] = peel(w, at);
        beeAt(c, x - 0.1 * U + dx, y + dy, -Math.sin(ang), i, t, a * fadeIn(w), front ? BEE_S : BEE_S * 0.8);
      }
    }
  }
}

// What the swarm gets today: the generic stars and birdies.
export const BEE_NOW = { letter: 'NOW', id: 'now', name: 'stars and birdies',
  note: 'What a bee swarm does today: it is a generic hit — a white flash, then stars and little birds going round his head for about a second, fading with the blink.' };
export const BEE_CANDIDATES = [
  { letter: 'A', id: 'bees-halo', name: 'HALO', paint: beeHalo,
    note: 'The stars-and-birds ring replaced by four of the swarm’s bees going round his head on the same flat ring, wandering a little behind him. They stay about three seconds, leaving one at a time up and off behind him.' },
  { letter: 'B', id: 'bees-cloud', name: 'CLOUD', paint: beeCloud, shipped: true,
    note: 'SHIPPED, at the swarm’s own bee size, with the stars and birds running their normal length under it. Sixteen bees, each on its own wider loop round his whole body and dragging behind him, a faint buzz trail on each. They peel off backwards, one after another, the last gone at about 3.7 seconds.' },
  { letter: 'C', id: 'bees-angry', name: 'ONE ANGRY BEE', paint: beeStraggler,
    note: 'Two bees give up inside a second; one, a bit bigger, will not. It darts at his face and loops back over his head on a jittery zig-zag with a dashed buzz line, right through to the end, and flicks off.' },
  { letter: 'D', id: 'bees-stars', name: 'STARS, THEN BEES', paint: starsThenBees,
    note: 'Keeps the cartoon stars: five slots on one ring, three stars that fade at about a second and two bees that stay — one leaves at 2.2s, the last at 3s. The halo\'s answer to “would it replace the stars?” — it only takes over.' },
];

// ---------------------------------------------------------------- the tile
// As the hit-effects sheet: one cabinet lane at in-run size, two heroes a strip, every one
// running into his own copy of the real swarm at the same moment, on a loop. The hit is
// the ordinary one — red knock burst, 5px shake, 0.08s hitstop, 1.4s blink. The swarm
// itself is gone the moment it connects, as if it had come off the road and onto him.
const P = 4.9;
const T_HIT = 0.7;
const IFRAMES = 1.4, HITSTOP = 0.08;
const HERO_XS = [60, 172];
const blinkOff = (t) => Math.floor(t * 14) % 2 === 0;

function knock(c, x, y, e) {
  for (let i = 0; i < 16; i++) {
    const life = 0.6 * (0.6 + 0.6 * hash(i * 4.1 + 9));
    if (e > life) continue;
    const a = hash(i * 1.3 + 9) * Math.PI * 2, s = 90 * (0.4 + 0.6 * hash(i * 2.9 + 9));
    const px = x + Math.cos(a) * s * e - SCROLL * e, py = y + (Math.sin(a) * s - 27) * e + 70 * e * e;
    c.fillStyle = `rgba(224,72,72,${1 - e / life})`; c.fillRect(px - 1, py - 1, 2, 2);
  }
}

let SWARM = null;
export function drawBeeTile(ctx, t, cabinet, strips, cand, heroes = ['lorenzo', 'clara', 'kiko', 'b33p']) {
  SWARM = SWARM || makeObstacle('beeSwarm', 0);
  const tl = ((t % P) + P) % P, loop = Math.floor(t / P);
  const frozen = Math.min(Math.max(tl - T_HIT, 0), HITSTOP);
  const g = tl - frozen;
  const w = tl - T_HIT;
  const e = Math.max(0, g - T_HIT);
  let sx = 0, sy = 0;
  if (w >= 0 && w < 0.3) {
    const p = 5 * Math.min(1, (0.3 - w) * 4), n = Math.floor(t * 60);
    sx = (hash(n) * 2 - 1) * p; sy = (hash(n + 0.5) * 2 - 1) * p;
  }
  ctx.save();
  ctx.translate(sx, sy);
  let lane = 0;
  drawCabinetLane(ctx, loop * (P - HITSTOP) + g, cabinet, strips, (c, tt) => {
    const pair = heroes.slice(lane * 2, lane * 2 + 2);
    lane++;
    pair.forEach((heroId, i) => {
      const hx = HERO_XS[i];
      const ob = { ...SWARM, x: hx + 4 + SCROLL * (T_HIT - g) };
      if (w < 0 && ob.x > -40) drawWorldEntity(c, ob, 0, tt, null, {});
      if (w >= 0) knock(c, hx + 6, GROUND_Y - 8, e);
      // The flash is the picture and the blink waits for it; then the ordinary blink, with
      // the bees (or, for NOW, the stars and birds) going round over it.
      const blink = w >= 0 && e < IFRAMES && blinkOff(t);
      if (w >= 0 && w < GEN_FLASH) paintFlash(c, heroId, hx, GROUND_Y, w, t, runPose(g));
      else if (!blink) drawToon(c, heroId, runPose(g), hx, GROUND_Y, U);
      if (w >= GEN_FLASH) (cand ? cand.paint : starsAndBirdies)(c, heroId, hx, GROUND_Y, w, t);
    });
  }, { hero: null });
  ctx.restore();
}
