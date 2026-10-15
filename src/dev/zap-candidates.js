// Gallery-only: ZAPPED, a bake-off (15 Oct 2026). Peter, of the gravity levels' live
// wires: "it would be nice if we had a shocked animation if the hero makes contact
// rather than our generic (a zap sound effect would be nifty too) ... mock up 1
// character being zapped in the gallery, perhaps give me a few options".
//
// Each tile is level 1's corridor at in-run size with Lorenzo running along the floor
// rail into the production live wire (tesla studs, railPulse), on a loop. NOW is the
// hit every hazard gets today — the red burst, the 5px shake, the 0.08s hitstop and the
// 1.4s i-frame blink — and every candidate keeps the shake and the mercy window, only
// changing what the hero does inside them. Nothing here is wired into the run.
//
// The effects work on the drawn hero as a whole (an offscreen copy tinted, inverted,
// glowed), so A, D and E would carry to every rig in the cast unchanged; B, C and F pose
// him through drawToon's `dance` seam, and C's skeleton is laid out for Lorenzo's frame.
import { SPACE_LOOKS, drawSpaceRoom } from './space-look-candidates.js';
import { drawGravityHazard } from '../sprites/gravity-encounters.js';
import { GROUND_Y, applyWorld, screenYFor } from '../engine/camera.js';
import { HERO_DRAW_H, HERO_CENTER_OFF } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { layer, tint, invert, blit, heroBox, bolt, bodyArcs, frizz, drawZapHero, zapHash } from '../sprites/zap.js';
import { PLAYER_X } from '../game/player.js';

export const ZAP_CANDIDATES = [
  { id: 'now', letter: 'NOW', name: 'the generic hit',
    note: 'What any hazard does today: red burst, 5px shake, 0.08s hitstop, then the 1.4s blink. He runs on along the wire.' },
  { id: 'buzz', letter: 'A', name: 'BUZZ',
    note: 'He keeps running but buzzes: a fast jitter, a cyan glow, the body flashing blue-white and little arcs crawling over him for 0.45s. Then the usual blink. The smallest change; works on any hero as drawn.' },
  { id: 'jolt', letter: 'B', name: 'JOLT',
    note: 'He goes rigid: arms flung up, legs braced, a few px off the rail, hair standing up out of his cap, arcs climbing from the wire into his boots — 0.5s, then he drops back into the run and blinks. The world keeps scrolling, so he skates the wire stiff as a board.' },
  { id: 'xray', letter: 'C', name: 'X-RAY',
    note: 'B, with the classic cartoon gag: strobing between him and his own X-ray — navy body, glowing skeleton — 12 times a second. The skeleton is laid out for Lorenzo; each rig would need its own.' },
  { id: 'xray-b33p', letter: 'C · B33P', name: 'X-RAY, B33P', hero: 'b33p',
    note: 'C on the robot. No bones in a robot, so his X-ray shows the works: a CPU chip in the dome, a turning gear and a battery in the chest, rods and servo joints for limbs. (Added 15 Oct.)' },
  { id: 'xray-ramon', letter: 'C · RAMON', name: 'X-RAY, RAMON', hero: 'ramon',
    note: 'C on the limbless hero: a skull in the head, ribs in the torso, finger bones in each glove and foot bones in each shoe — and nothing at all in between. (Added 15 Oct.)' },
  { id: 'mix', letter: 'B / C', name: 'B OR C, AT RANDOM',
    note: 'Each hit rolls B or C (half and half here). Same length, same arcs, same sound slot — only the gag changes, so it never reads as a different event. (Added 15 Oct: "is it bad to mix up the effects and pick one at random each time?")' },
  { id: 'negative', letter: 'D', name: 'PHOTO NEGATIVE',
    note: 'He keeps running and strobes between himself and a colour-inverted copy with a cyan rim, arcs on the body, for 0.4s. Then the blink. Works on any hero as drawn.' },
  { id: 'fried', letter: 'E', name: 'FRIED',
    note: 'One white flash and he runs on charred: soot-black with white eyes, frizz poking out of his cap, smoke curling off him and soot flaking away. The soot fades over the 1.4s mercy window and replaces the blink — it is the "can\'t be hurt" signal.' },
  { id: 'works', letter: 'F', name: 'THE WORKS (held)',
    note: 'The full cartoon: the world holds 0.32s (not 0.08) while he jolts with the X-ray strobe, then he runs on fried as in E. Longest and funniest; the only one that changes how long the hit stops play.' },
];

const LOOK = SPACE_LOOKS['plateau-occasional'];
const Z = 1.6, LEN = 84 * 120;
const V = 120;               // the gravity grid's speed, world px/s
const P = 3.2;               // one loop: run in, hit, mercy window, run clear
const T_HIT = 0.7;           // when his boot meets the wire
const WIRE_W = 130;          // under the 150 cap, so one wire = one hit (1.08s < 1.4s)
const IFRAMES = 1.4, HITSTOP = 0.08;
const HERO_X = PLAYER_X + HERO_CENTER_OFF;
const HIT_X = HERO_X + 4;    // the wire's leading end at contact
const U = HERO_DRAW_H;

const hash = zapHash;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- poses
const runPose = (g) => ({ kind: 'run', phase: (g * 1.7) % 1, time: g, grounded: true, facing: 1 });
// The flare where the boot met the wire: a hot bloom for a beat.
function contactFlare(c, x, w) {
  if (w < 0 || w > 0.18) return;
  const q = 1 - w / 0.18;
  c.save();
  const g = c.createRadialGradient(x, GROUND_Y, 0, x, GROUND_Y, 9 * q + 3);
  g.addColorStop(0, `rgba(240,252,255,${0.95 * q})`);
  g.addColorStop(0.35, `rgba(80,190,255,${0.6 * q})`);
  g.addColorStop(1, 'rgba(31,168,255,0)');
  c.fillStyle = g; c.fillRect(x - 14, GROUND_Y - 14, 28, 28);
  c.restore();
}
// Sparks spat out of the contact: bright dots on short ballistic arcs, left behind by the
// scroll like any particle in the lane.
function sparks(c, x0, e, scrolled, n = 10, seed = 1) {
  for (let i = 0; i < n; i++) {
    const life = 0.18 + 0.2 * hash(seed + i * 3.1);
    if (e > life) continue;
    const a = -Math.PI * (0.1 + 0.8 * hash(seed + i * 1.7)), sp = 60 + 70 * hash(seed + i * 2.3);
    const x = x0 + Math.cos(a) * sp * e - scrolled, y = GROUND_Y + Math.sin(a) * sp * e + 260 * e * e;
    const q = 1 - e / life;
    c.fillStyle = i % 3 ? `rgba(160,225,255,${q})` : `rgba(255,255,255,${q})`;
    c.fillRect(x - 0.5, y - 0.5, 1.1, 1.1);
  }
}

// ---------------------------------------------------------------- dressing
// Smoke off the top of him, puffs born on a fixed clock and left behind by the scroll.
function smoke(c, cx, fy, e, scrolledAt, until) {
  for (let k = 0; k < 16; k++) {
    const born = 0.1 + k * 0.09;
    if (born > until || e < born) continue;
    const age = e - born, life = 0.9;
    if (age > life) continue;
    const q = age / life;
    const x = cx + (hash(k) - 0.5) * 0.3 * U - (scrolledAt(e) - scrolledAt(born)) * 0.85 - 6 * q;
    const y = fy - 0.95 * U - 14 * q;
    const r = 1.8 + 4.2 * q, a = 0.8 * (1 - q) ** 1.3, v = Math.round(140 + 60 * q);
    const grad = c.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${v},${v + 4},${v + 12},${a})`);
    grad.addColorStop(0.6, `rgba(${v},${v + 4},${v + 12},${a * 0.7})`);
    grad.addColorStop(1, `rgba(${v},${v + 4},${v + 12},0)`);
    c.fillStyle = grad;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
}
// Soot flaking off: dark specks dropping from his body, left on the floor behind him.
function flakes(c, cx, fy, e, scrolledAt, until) {
  for (let k = 0; k < 18; k++) {
    const born = 0.12 + k * 0.07;
    if (born > until || e < born) continue;
    const age = e - born;
    if (age > 0.6) continue;
    const x0 = cx + (hash(k * 2.7) - 0.5) * 0.5 * U, y0 = fy - (0.2 + 0.6 * hash(k * 5.1)) * U;
    const x = x0 - (scrolledAt(e) - scrolledAt(born)), y = Math.min(GROUND_Y - 0.5, y0 + 30 * age + 90 * age * age);
    c.fillStyle = `rgba(30,26,28,${1 - age / 0.6})`;
    c.fillRect(x - 0.5, y - 0.5, 1, 1);
  }
}
// White eyes in the soot: the one thing the char does not cover, blinking once.
function sootEyes(c, cx, fy, a, e) {
  const blink = e > 0.55 && e < 0.62;
  for (const ex of [-0.03, 0.105]) {
    const x = cx + ex * U, y = fy - 0.775 * U;
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.beginPath(); c.ellipse(x, y, 0.05 * U, (blink ? 0.008 : 0.055) * U, 0, 0, Math.PI * 2); c.fill();
    if (!blink) { c.fillStyle = `rgba(16,10,24,${a})`; c.beginPath(); c.arc(x + 0.012 * U, y, 0.024 * U, 0, Math.PI * 2); c.fill(); }
  }
}
// ---------------------------------------------------------------- the hero, per candidate
// k: t wall clock, w wall since contact, e game since contact, cx/fy where he stands,
// scrolledAt(e) how far the world has moved since contact.
function blinkHidden(k) { return k.e < IFRAMES && Math.floor(k.t * 14) % 2 === 0; }

function drawRunning(c, k, hidden = false) {
  if (!hidden) drawToon(c, k.hero, runPose(k.g), k.cx, k.fy, U);
}
// B and C: the jolt itself — the shipped painter (sprites/zap.js). `dur` stretches it
// for F's longer hold.
function drawJolt(c, k, dur, { xray = false } = {}) {
  drawZapHero(c, k.hero, k.cx, k.fy, k.w * 0.5 / dur, k.t, { xray });
}
// E and F: the charred run, `from` seconds after contact until the mercy window closes.
function drawFried(c, k, from) {
  const a = 0.9 * (1 - clamp01((k.e - from - 0.25) / (IFRAMES - from - 0.25)) ** 1.6);
  const fz = 1 - clamp01((k.e - 0.8) / 0.5);
  const L = layer(0, c, heroBox(k.cx, k.fy), (o) => {
    frizz(o, k.cx, k.fy, fz * 0.85, 0);
    drawToon(o, 'lorenzo', runPose(k.g), k.cx, k.fy, U);
  });
  if (k.e < IFRAMES) tint(L, `rgba(34,28,30,${a})`);
  blit(c, L);
  if (k.e < IFRAMES) sootEyes(c, k.cx, k.fy, Math.min(1, a * 1.3), k.e);
  smoke(c, k.cx, k.fy, k.e, k.scrolledAt, 1.2);
  flakes(c, k.cx, k.fy, k.e, k.scrolledAt, 1.1);
}

const HERO = {
  now(c, k) {
    if (k.w < 0) return drawRunning(c, k);
    // burst(playerWorldX + 6, GROUND_Y - y - 8, 16, 90, 0.6, '#e04848', 2, 140)
    for (let i = 0; i < 16; i++) {
      const life = 0.6 * (0.6 + 0.6 * hash(i * 4.1)), age = k.e;
      if (age > life) continue;
      const a = hash(i * 1.3) * Math.PI * 2, s = 90 * (0.4 + 0.6 * hash(i * 2.9));
      const x = PLAYER_X + 6 + Math.cos(a) * s * age - k.scrolledAt(k.e);
      const y = GROUND_Y - 8 + (Math.sin(a) * s - 27) * age + 70 * age * age;
      c.fillStyle = `rgba(224,72,72,${1 - age / life})`; c.fillRect(x - 1, y - 1, 2, 2);
    }
    drawRunning(c, k, blinkHidden(k));
  },
  buzz(c, k) {
    if (k.w < 0 || k.w > 0.45) return drawRunning(c, k, k.w >= 0 && blinkHidden(k));
    const jx = (hash(Math.floor(k.t * 40)) - 0.5) * 1.6, jy = (hash(Math.floor(k.t * 40) + 3) - 0.5) * 1;
    const L = layer(0, c, heroBox(k.cx + jx, k.fy + jy), (o) => drawToon(o, 'lorenzo', runPose(k.g), k.cx + jx, k.fy + jy, U));
    if (Math.floor(k.t * 20) % 2) tint(L, 'rgba(190,240,255,0.5)');
    blit(c, L, { glow: '#41c8ff', blur: 4 });
    bodyArcs(c, k.cx + jx, k.fy + jy, k.t, 3);
    sparks(c, HIT_X, k.w, k.scrolledAt(k.e), 8, 3);
  },
  jolt(c, k) {
    if (k.w < 0 || k.w > 0.5) return drawRunning(c, k, k.w >= 0 && blinkHidden(k));
    drawJolt(c, k, 0.5);
    sparks(c, HIT_X, k.w, k.scrolledAt(k.e), 10, 5);
  },
  'xray-b33p'(c, k) { HERO.xray(c, k); },
  'xray-ramon'(c, k) { HERO.xray(c, k); },
  mix(c, k) { (hash(k.loop * 3.7 + 1) < 0.5 ? HERO.jolt : HERO.xray)(c, k); },
  xray(c, k) {
    if (k.w < 0 || k.w > 0.5) return drawRunning(c, k, k.w >= 0 && blinkHidden(k));
    drawJolt(c, k, 0.5, { xray: true });
    sparks(c, HIT_X, k.w, k.scrolledAt(k.e), 10, 5);
  },
  negative(c, k) {
    if (k.w < 0 || k.w > 0.4) return drawRunning(c, k, k.w >= 0 && blinkHidden(k));
    const jx = (hash(Math.floor(k.t * 30)) - 0.5) * 1.2;
    const paint = (o) => drawToon(o, 'lorenzo', runPose(k.g), k.cx + jx, k.fy, U);
    const L = layer(0, c, heroBox(k.cx + jx, k.fy), paint);
    if (Math.floor(k.w * 15) % 2 === 0) {
      const M = layer(1, c, heroBox(k.cx + jx, k.fy), paint);
      invert(L, M);
    }
    blit(c, L, { glow: '#41c8ff', blur: 3.5 });
    bodyArcs(c, k.cx + jx, k.fy, k.t, 2);
    sparks(c, HIT_X, k.w, k.scrolledAt(k.e), 8, 7);
  },
  fried(c, k) {
    if (k.w < 0) return drawRunning(c, k);
    if (k.w < 0.07) {
      const L = layer(0, c, heroBox(k.cx, k.fy), (o) => drawToon(o, 'lorenzo', runPose(k.g), k.cx, k.fy, U));
      tint(L, '#f4fcff');
      blit(c, L, { glow: '#9fe6ff', blur: 6 });
      bodyArcs(c, k.cx, k.fy, k.t, 3);
      return;
    }
    drawFried(c, k, 0.07);
    sparks(c, HIT_X, k.w, k.scrolledAt(k.e), 8, 9);
  },
  works(c, k) {
    if (k.w < 0) return drawRunning(c, k);
    if (k.w < 0.36) {
      drawJolt(c, k, 0.36, { xray: true });
      sparks(c, HIT_X, k.w, 0, 12, 11);
      return;
    }
    drawFried(c, k, 0.04);
  },
};

export function drawZapTile(ctx, t, id) {
  const cand = ZAP_CANDIDATES.find((x) => x.id === id) || ZAP_CANDIDATES[0];
  const hold = cand.id === 'works' ? 0.32 : HITSTOP;
  const tl = ((t % P) + P) % P, loop = Math.floor(t / P);
  const frozen = Math.min(Math.max(tl - T_HIT, 0), hold);
  const g = tl - frozen;                                   // the game's clock this loop
  const w = tl - T_HIT;                                    // wall time since contact
  const e = Math.max(0, g - T_HIT);                        // game time since contact
  const scrolledAt = (ee) => V * ee;                       // world moved, ee game-seconds after contact
  const scroll = V * g;
  const loopLen = V * (P - hold);
  const cam = 1800 + (((loop % 8) + 8) % 8) * loopLen + scroll;
  const view = 480 / Z, floor = screenYFor(GROUND_Y, Z);
  // The run's shake(5, 0.3): power held, then eased out over the last quarter second.
  let sx = 0, sy = 0;
  if (w >= 0 && w < 0.3) {
    const p = 5 * Math.min(1, (0.3 - w) * 4), n = Math.floor(t * 60);
    sx = (hash(n) * 2 - 1) * p; sy = (hash(n + 0.5) * 2 - 1) * p;
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 480, 270); ctx.clip();
  ctx.fillStyle = LOOK.bg; ctx.fillRect(0, 0, 480, 270);
  ctx.translate(sx, sy);
  applyWorld(ctx, Z, 0);
  ctx.save(); ctx.translate(0, GROUND_Y);
  drawSpaceRoom(ctx, LOOK, { cam, view: view + 60, top: -floor / Z - 20, bottom: (270 - floor) / Z + 20, time: t,
    gates: [], length: LEN, stage: 1 });
  ctx.restore();
  for (let i = -1; i <= 1; i++) {
    const x = HIT_X + V * T_HIT - scroll + i * loopLen;
    drawGravityHazard(ctx, { type: 'railPulse', x: cam + x, w: WIRE_W, h: 7, alt: 0, def: {} }, x, GROUND_Y, t);
  }
  const k = { t, w, e, g, loop, cx: HERO_X, fy: GROUND_Y, scrolledAt, hero: cand.hero || 'lorenzo' };
  HERO[cand.id](ctx, k);
  if (cand.id !== 'now') contactFlare(ctx, HIT_X - (w >= 0 ? scrolledAt(e) : 0), w);
  ctx.restore();
}
