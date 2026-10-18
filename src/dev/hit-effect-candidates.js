// Gallery-only: HIT PICTURES — BY WHAT HIT YOU, a bake-off (16 Oct 2026).
//
// Every hit used to look the same: the hero blinks through 1.4s of i-frames, a red knock
// burst, a shake, 0.08s of hitstop. Two obstacles now change his own picture for a moment
// — the live wire's jolt (sprites/zap.js) and the dynamite's flip (sprites/blast.js) — and
// this sheet asked the same of the rest, one family at a time: FIRE, SPIKES, ROLLERS, ICE
// and everything else (GENERIC).
//
// SHIPPED 16 Oct 2026 (sprites/hitPictures.js): FIRE A and B at random, SPIKES A, ROLLERS
// A, ICE A, and GENERIC C (stars and birdies together). The sheet paints the shipped
// painters from there, as blast-candidates.js does with drawBlastHero; the candidates that
// did not ship are drawn here with the same kit.
//
// The zap's rule holds for every candidate: ONLY THE PICTURE CHANGES. Same shake, hitstop,
// i-frames and sound; the hero keeps his speed, his spot and his hitbox. Each painter is
// `paint(ctx, heroId, cx, feetY, w, t, live)` — w seconds since the hit, t a running clock,
// `live` the run pose to hand back to — drawn instead of the running toon for `T` (HIT_T
// unless it says otherwise) while the blink waits; `after` carries on over the blink.
import { drawToon } from '../sprites/toons.js';
import { HIT_T, HIT_LONG_T, HIT_KIT, GEN_FLASH, iceFitOf } from '../sprites/hitPictures.js';
import { layer, tint, blit } from '../sprites/zap.js';
import { drawCabinetLane } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity } from '../game/draw.js';
import { GROUND_Y } from '../engine/camera.js';

export { HIT_T };
const {
  U, SCROLL, hash, clamp01, lerp, easeOut, runPose, standPose, boardPose, bigBox,
  iceTint, flashWhite, puff, star, prickle, lines, hopY, squashed, ringAround, bird, faceOf,
} = HIT_KIT;
const ICE_INK = '#2f6688';
const blinkOff = (t) => Math.floor(t * 14) % 2 === 0;
const K = HIT_KIT;

// ======================================================================== SPIKES
// B — PINCUSHION. Straight up off the spikes as stiff as a board, arms up, prickles all
// over his backside and legs; he lands and they drop out of him.
const SPIKE_B_HOPS = [[0.0, 0.36, 12]];
const BODY_PRICKLES = [[-0.22, -0.38, Math.PI + 0.2], [-0.24, -0.3, Math.PI - 0.1], [-0.2, -0.45, Math.PI + 0.5],
  [-0.12, -0.12, Math.PI - 0.5], [0.13, -0.1, -0.3], [0.12, -0.22, 0.2], [-0.12, -0.24, Math.PI + 0.1], [0.15, -0.03, 0.6]];
function paintPincushion(c, heroId, cx, fy, w, t) {
  const h = hopY(w, SPIKE_B_HOPS), y = fy - h;
  const up = w < 0.36;
  const L = layer(20, c, bigBox(cx, fy), (o) => drawToon(o, heroId, up ? boardPose(t) : runPose(t), cx, y, U));
  if (w < 0.03) { flashWhite(c, L); return; }
  blit(c, L);
  pincushionPrickles(c, heroId, cx, fy, w, t);
  if (w < 0.2) lines(c, cx, fy + 1, 3, 7, [-Math.PI * 0.85, -Math.PI * 0.6, -Math.PI * 0.4, -Math.PI * 0.15], 1 - w / 0.2);
}
function pincushionPrickles(c, heroId, cx, fy, w) {
  const y = fy - hopY(w, SPIKE_B_HOPS);
  const drop = clamp01((w - 0.38) / 0.3);
  if (drop >= 1) return;
  BODY_PRICKLES.forEach(([px, py, ang], i) => {
    const d = clamp01(drop * 1.6 - hash(i * 3.7) * 0.6);
    const x = cx + px * U - SCROLL * 0.9 * Math.max(0, w - 0.38) * (d > 0 ? 1 : 0);
    const yy = Math.min(fy - 0.5, y + py * U + 90 * d * d * 0.5);
    c.save(); c.globalAlpha *= 1 - clamp01((d - 0.7) / 0.3);
    prickle(c, x, yy, ang + d * 2.2);
    c.restore();
  });
}


// ======================================================================== ROLLERS
// B — PUMPED BACK UP. Flattened with the barrel's tread rolled across him, then he inflates
// in three jerks, a little puff of air with each, and runs on.
function pumpScale(w) {
  if (w < 0.04) { const q = easeOut(w / 0.04); return [lerp(1, 1.5, q), lerp(1, 0.24, q)]; }
  const steps = [[0.2, 0.5], [0.29, 0.75], [0.38, 1]];
  let sy = 0.24, at = -1;
  for (const [ws, to] of steps) if (w >= ws) { sy = to; at = ws; }
  // each jerk overshoots a touch and settles
  if (at > 0) { const q = (w - at) / 0.09; sy *= 1 + 0.12 * Math.exp(-q * 3) * Math.cos(q * 7); }
  const sx = lerp(1.5, 1, clamp01((sy - 0.24) / 0.76));
  return [sx, sy];
}
function paintPumped(c, heroId, cx, fy, w, t, live) {
  const [sx, sy] = pumpScale(w);
  const flat = w < 0.38;
  const L = squashed(c, heroId, cx, fy, t, sx, sy, flat ? standPose(0) : runPose(t, live), (o) => {
    if (w >= 0.29) return;
    // tread: the staves' bands rolled across him
    o.save(); o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(40,30,30,0.42)';
    // below the chin only: bands across his clothes, never his face
    for (let i = 0; i < 3; i++) o.fillRect(cx - 0.7 * U, fy - (0.1 + i * 0.2) * U, 1.4 * U, 0.08 * U);
    o.restore();
  });
  if (w < 0.03) { flashWhite(c, L); return; }
  blit(c, L);
  for (const ws of [0.2, 0.29, 0.38]) {
    const q = clamp01((w - ws) / 0.12);
    if (q > 0 && q < 1) puff(c, cx - 0.35 * U - 3 * q, fy - 0.2 * U - 2 * q, 0.9 + 1.4 * q, 1 - q);
  }
}

// ROUND 2 (19 Oct 2026). Peter on A, the shipped one: "timing feels wrong",
// "the pop-back is off", "silhouette doesn't read as pancake". All three come
// off the same root cause — A (and B) squash his ORDINARY RUNNING STRIDE flat,
// so the silhouette is a flattened runner, not a pancake, and A holds that
// shape for 0.8 of its 1.0s (PANCAKE_POP), most of the picture. These three
// hold a genuinely splayed pose instead (arms and legs spread to the sides,
// like he hit the ground spread-eagled) and hold it for far less of the 1s.
//
// SPLAT_POSE: flat on his face, arms thrown wide, legs sprawled rather than
// stepping — the shape a flattening actually makes, not a stride frozen
// mid-step. Peter (round 2, on the first cut): "i don't like that the front
// leg is po[s]ed out in front. they all seem to be like this" — that cut used
// feet `out` values of 0.8-0.85, four times pitFall.js's own sprawled-grip
// range (-0.2 to 0.22; see hangPose/gripPose there), which read as a deliberate
// kick rather than a flop. The front leg now tucks in near-neutral; only the
// back one trails, so the sprawl is asymmetric, not a mirrored kick.
const SPLAT_POSE = Object.freeze({
  kind: 'jump', time: 0, vy: 0, grounded: true, facing: 1, faceSurprised: true, browRaise: true,
  dance: { hands: [[0.55, 0.12], [0.5, -0.1]], feet: [[0.08, -0.05], [-0.22, 0.08]], ankles: [0.15, -0.15] },
});

// C — SPLAT. Quick squash into SPLAT_POSE, a short flat hold (0.4s, half A's),
// one clean snap back into his stride.
const SPLAT_FLAT = 0.4, SPLAT_POP_T = 0.22;
function splatScale(w) {
  if (w < 0.035) { const q = easeOut(w / 0.035); return [lerp(1, 1.7, q), lerp(1, 0.22, q)]; }
  if (w < SPLAT_FLAT) {
    const k = 0.025 * Math.sin((w - 0.035) * 30) * Math.max(0, 1 - (w - 0.035) / (SPLAT_FLAT - 0.035));
    return [1.7 + k, 0.22 - k * 0.3];
  }
  if (w < SPLAT_FLAT + SPLAT_POP_T) {
    const q = easeOut((w - SPLAT_FLAT) / SPLAT_POP_T);
    return [lerp(1.7, 1, q), lerp(0.22, 1, q)];
  }
  const q = clamp01((w - SPLAT_FLAT - SPLAT_POP_T) / 0.1), d = Math.exp(-q * 5) * Math.cos(q * Math.PI * 2.4);
  return [1 - d * 0.1, 1 + d * 0.16];
}
function paintSplat(c, heroId, cx, fy, w, t, live) {
  const [sx, sy] = splatScale(w);
  const flat = w < SPLAT_FLAT + SPLAT_POP_T * 0.3;
  const L = squashed(c, heroId, cx, fy, t, sx, sy, flat ? SPLAT_POSE : runPose(t, live));
  if (w < 0.03) { flashWhite(c, L); return; }
  blit(c, L);
  if (w < 0.22) {
    const q = clamp01((w - 0.035) / 0.185);
    puff(c, cx - 0.6 * U - 4 * q, fy - 1.5 - 2 * q, 1.2 + 1.5 * q, 1 - q);
    puff(c, cx + 0.6 * U + 4 * q, fy - 1.5 - 2 * q, 1.2 + 1.5 * q, 1 - q);
  }
  if (w > SPLAT_FLAT && w < SPLAT_FLAT + 0.14) {
    lines(c, cx, fy - 0.6 * U, 0.55 * U, 0.75 * U,
      [-Math.PI * 0.85, -Math.PI * 0.65, -Math.PI * 0.35, -Math.PI * 0.15], 1 - (w - SPLAT_FLAT) / 0.14);
  }
}

// D — STEAMROLLED. SPLAT_POSE's silhouette, B's own fix for "the pop-back is
// off" (the tread bands making it legible that something rolled OVER him, and
// the three-jerk reinflation rather than a generic elastic bounce), but B's
// own timing tightened to match: the steps start sooner and run faster.
function steamScale(w) {
  if (w < 0.035) { const q = easeOut(w / 0.035); return [lerp(1, 1.6, q), lerp(1, 0.22, q)]; }
  const steps = [[0.12, 0.5], [0.19, 0.75], [0.26, 1]];
  let sy = 0.22, at = -1;
  for (const [ws, to] of steps) if (w >= ws) { sy = to; at = ws; }
  if (at > 0) { const q = (w - at) / 0.08; sy *= 1 + 0.12 * Math.exp(-q * 3.2) * Math.cos(q * 7); }
  const sx = lerp(1.6, 1, clamp01((sy - 0.22) / 0.78));
  return [sx, sy];
}
function paintSteamrolled(c, heroId, cx, fy, w, t, live) {
  const [sx, sy] = steamScale(w);
  const flat = w < 0.26;
  const L = squashed(c, heroId, cx, fy, t, sx, sy, flat ? SPLAT_POSE : runPose(t, live), (o) => {
    if (w >= 0.19) return;
    o.save(); o.globalCompositeOperation = 'source-atop'; o.fillStyle = 'rgba(40,30,30,0.42)';
    for (let i = 0; i < 3; i++) o.fillRect(cx - 0.75 * U, fy - (0.1 + i * 0.2) * U, 1.5 * U, 0.08 * U);
    o.restore();
  });
  if (w < 0.03) { flashWhite(c, L); return; }
  blit(c, L);
  for (const ws of [0.12, 0.19, 0.26]) {
    const q = clamp01((w - ws) / 0.1);
    if (q > 0 && q < 1) puff(c, cx - 0.4 * U - 3 * q, fy - 0.2 * U - 2 * q, 0.9 + 1.4 * q, 1 - q);
  }
}

// E — QUICK SPLAT. The snappy extreme: SPLAT_POSE's silhouette, barely any
// hold at all (0.16s), for comparison against C and D's more cartoon "beat".
const QUICK_FLAT = 0.16, QUICK_POP_T = 0.16;
function quickScale(w) {
  if (w < 0.03) { const q = easeOut(w / 0.03); return [lerp(1, 1.75, q), lerp(1, 0.2, q)]; }
  if (w < QUICK_FLAT) return [1.75, 0.2];
  if (w < QUICK_FLAT + QUICK_POP_T) {
    const q = easeOut((w - QUICK_FLAT) / QUICK_POP_T);
    return [lerp(1.75, 1, q), lerp(0.2, 1, q)];
  }
  const q = clamp01((w - QUICK_FLAT - QUICK_POP_T) / 0.09), d = Math.exp(-q * 5) * Math.cos(q * Math.PI * 2.6);
  return [1 - d * 0.12, 1 + d * 0.18];
}
function paintQuickSplat(c, heroId, cx, fy, w, t, live) {
  const [sx, sy] = quickScale(w);
  const flat = w < QUICK_FLAT + QUICK_POP_T * 0.3;
  const L = squashed(c, heroId, cx, fy, t, sx, sy, flat ? SPLAT_POSE : runPose(t, live));
  if (w < 0.025) { flashWhite(c, L); return; }
  blit(c, L);
  if (w < QUICK_FLAT + 0.05) {
    const q = clamp01(w / (QUICK_FLAT + 0.05));
    puff(c, cx - 0.6 * U - 4 * q, fy - 1.5 - 2 * q, 1.2 + 1.2 * q, 1 - q);
    puff(c, cx + 0.6 * U + 4 * q, fy - 1.5 - 2 * q, 1.2 + 1.2 * q, 1 - q);
  }
  if (w > QUICK_FLAT && w < QUICK_FLAT + 0.12) {
    lines(c, cx, fy - 0.6 * U, 0.5 * U, 0.7 * U,
      [-Math.PI * 0.85, -Math.PI * 0.65, -Math.PI * 0.35, -Math.PI * 0.15], 1 - (w - QUICK_FLAT) / 0.12);
  }
}


// ======================================================================== ICE
// B — FROSTBITTEN. No block: he goes ice-blue, snow on his head and icicles off his chin,
// shivering on the spot, a frosty breath — then the frost shakes off him in flakes.
function paintFrostbite(c, heroId, cx, fy, w, t) {
  const face = faceOf(heroId);
  const thaw = clamp01((w - 0.36) / 0.12);
  const shiver = w < 0.38 ? (hash(Math.floor(t * 40)) - 0.5) * 1.3 : 0;
  const x = cx + shiver;
  const L = layer(20, c, bigBox(cx, fy), (o) => drawToon(o, heroId, w < 0.38 ? standPose(0) : runPose(t), x, fy, U));
  if (w < 0.03) { tint(L, '#eafaff'); blit(c, L, { glow: '#bfeaff', blur: 6 }); return; }
  iceTint(L, 0.8 * (1 - thaw));
  blit(c, L);
  if (thaw >= 1) return;
  const hx = x + face.ex * U, top = fy + face.top * U;
  c.save(); c.globalAlpha *= 1 - thaw;
  // a cap of snow on his head
  c.fillStyle = '#ffffff'; c.strokeStyle = ICE_INK; c.lineWidth = 0.4;
  c.beginPath();
  c.moveTo(hx - 0.24 * U, top + 1.6);
  c.quadraticCurveTo(hx - 0.2 * U, top - 2.2, hx - 0.05 * U, top - 1.4);
  c.quadraticCurveTo(hx + 0.08 * U, top - 2.8, hx + 0.2 * U, top - 0.6);
  c.quadraticCurveTo(hx + 0.27 * U, top + 0.8, hx + 0.22 * U, top + 1.6);
  c.closePath(); c.fill(); c.stroke();
  // icicles under his chin and hands
  const chin = fy + (face.ey + 0.2) * U;
  for (const [dx, len] of [[0.02, 3.2], [0.1, 2.2], [0.17, 2.8]]) {
    const ix = hx + dx * U;
    c.beginPath(); c.moveTo(ix - 0.8, chin); c.lineTo(ix + 0.8, chin); c.lineTo(ix, chin + len); c.closePath();
    c.fillStyle = '#e4f6ff'; c.fill(); c.stroke();
  }
  c.restore();
  // a frosty breath out in front
  const bq = ((w - 0.1) % 0.25) / 0.25;
  if (w > 0.1 && w < 0.36) puff(c, hx + 0.3 * U + 4 * bq, fy + (face.ey + 0.1) * U - 1.5 * bq, 0.8 + 1.4 * bq, 0.8 * (1 - bq), false, true);
  frostFlakes(c, heroId, cx, fy, w, t);
}
function frostFlakes(c, heroId, cx, fy, w) {
  const e = w - 0.36;
  if (e < 0 || e > 0.5) return;
  c.save();
  for (let i = 0; i < 12; i++) {
    const ox = cx + (hash(i * 2.1) - 0.5) * 0.6 * U, oy = fy - (0.15 + 0.85 * hash(i * 4.4)) * U;
    const x = ox + (hash(i * 6.2) - 0.5) * 30 * e - SCROLL * 0.8 * e, y = Math.min(fy - 0.5, oy - 12 * e + 70 * e * e);
    c.globalAlpha = 1 - clamp01((e - 0.3) / 0.2);
    c.fillStyle = '#ffffff'; c.strokeStyle = ICE_INK; c.lineWidth = 0.3;
    c.beginPath(); c.arc(x, y, 0.8, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  c.restore();
}


// ======================================================================== GENERIC
// The flash is the picture (GEN_FLASH, the blink waits for it); the ring is the `after`,
// going round his head over the ordinary blink.
// A — RING OF STARS: four mustard stars.
function starRing(c, heroId, cx, fy, w, t) {
  if (w > 1.05) return;
  ringAround(c, heroId, cx, fy, w, t, 4, (c2, x, y, front, i) => star(c2, x, y, front ? 2.3 : 1.8, t * 6 + i));
}
// B — BIRDIES: three little yellow birds instead.
function birdRing(c, heroId, cx, fy, w, t) {
  if (w > 1.05) return;
  ringAround(c, heroId, cx, fy, w, t, 3, bird);
}

// ---------------------------------------------------------------- the candidates
export const HIT_FAMILIES = [
  { family: 'fire', title: 'FIRE', cabinet: 'speed', obstacle: 'campfire',
    members: 'fireBarrel, campfire, smudgePot, brazier, binFire, ashUrnFire, confidentialBin, eternalFlame', shown: 'Speed Zone, the campfire' },
  { family: 'spikes', title: 'SPIKES', cabinet: 'plumber', obstacle: 'thistle',
    members: 'popSpikes, cactus, cactusBig, thistle, thistleBig, crampons, caltrops, drawingPins, graveRoses, pricklyPear, barrelCactus (floorSaw and bearTrap get A without the prickles)', shown: 'Plumber, the thistle' },
  { family: 'rollers', title: 'ROLLERS', cabinet: 'plumber', obstacle: 'barrel', obstacleOver: true,
    members: 'barrel, giantSnowball, mailCart, drinksTrolley, mopBucket, chair', shown: 'Plumber, the barrel (drawn over him here, so it is seen to roll across)' },
  { family: 'ice', title: 'ICE', cabinet: 'frost', obstacle: 'iceCrystals',
    members: 'iceCrystals, snowman, snowmanBig, iceBlocks, icicle', shown: 'Frost, the ice crystals' },
  { family: 'generic', title: 'GENERIC', cabinet: 'plumber', obstacle: 'crate',
    members: 'everything else that reaches the ordinary hit — crates, hurdles, boxes, graveHands…', shown: 'Plumber, the crate' },
];
const FAM = Object.fromEntries(HIT_FAMILIES.map((f) => [f.family, f]));
const at = (family) => ({ family, cabinet: FAM[family].cabinet, obstacle: FAM[family].obstacle });

export const HIT_EFFECTS = [
  { ...at('fire'), letter: 'A', id: 'fire-hotfoot', name: 'HOT-FOOT HOP',
    note: 'SHIPPED (at random with B, never the same twice running). Two quick hops clutching his backside: a little flame on the seat of his trousers that puffs out at the top of the second hop, the seat left sooted, smoke trailing off it behind him.',
    T: HIT_LONG_T, paint: K.paintHotFoot, after: K.fireATrail, shipped: true },
  { ...at('fire'), letter: 'B', id: 'fire-rocket', name: 'ROCKET SEAT',
    note: 'SHIPPED (at random with A). One big leap off a jet of flame out of the seat of his trousers, both hands on his backside, pedalling the air; a column of smoke left behind and the seat sooted when he lands.',
    T: HIT_LONG_T, paint: K.paintRocket, after: K.fireBTrail, shipped: true },
  { ...at('spikes'), letter: 'A', id: 'spikes-ouch', name: 'OUCH HOP',
    note: 'SHIPPED — and, without the prickles, for the floor saw and the bear trap. Hops on one foot clutching the other, wobbling, a handful of prickles left sticking out of the sole and the shin; ouch-lines off the foot on the first hop.',
    T: HIT_LONG_T, paint: K.paintOuchHop, shipped: true },
  { ...at('spikes'), letter: 'B', id: 'spikes-pincushion', name: 'PINCUSHION',
    note: 'Straight up off the spikes, stiff as a board, arms up — prickles stuck all over his backside and legs — and as he lands they drop out of him onto the road.',
    paint: paintPincushion, after: pincushionPrickles },
  { ...at('rollers'), letter: 'A', id: 'rollers-pancake', name: 'PANCAKE',
    note: 'SHIPPED. Rolled flat as a pancake mid-stride, side-on (his own figure squashed to a quarter of his height, a puff out of each side), held a beat, then he pops back up with a stretch and a wobble.',
    T: HIT_LONG_T, paint: K.paintPancake, shipped: true },
  { ...at('rollers'), letter: 'B', id: 'rollers-pumped', name: 'PUMPED BACK UP',
    note: 'Flattened with the tread rolled across him in bands, then he reinflates in three jerks — a puff of air with each — and runs on.',
    paint: paintPumped },
  { ...at('rollers'), letter: 'C', id: 'rollers-splat', name: 'SPLAT',
    note: 'ROUND 2. Arms and legs thrown out to the sides as he flattens — an actual splayed silhouette, not his running stride squashed — held half as long as A (0.4s against 0.8s), one clean snap back to his stride.',
    T: HIT_LONG_T, paint: paintSplat },
  { ...at('rollers'), letter: 'D', id: 'rollers-steamrolled', name: 'STEAMROLLED',
    note: 'ROUND 2. SPLAT\'s splayed silhouette plus B\'s own fix for the pop — the tread bands and the three-jerk reinflation — both retimed to start and finish sooner.',
    T: HIT_LONG_T, paint: paintSteamrolled },
  { ...at('rollers'), letter: 'E', id: 'rollers-quicksplat', name: 'QUICK SPLAT',
    note: 'ROUND 2. The snappy extreme: SPLAT\'s silhouette with barely any hold at all (0.16s) — how little beat the hit can get away with.',
    T: HIT_LONG_T, paint: paintQuickSplat },
  { ...at('ice'), letter: 'A', id: 'ice-block', name: 'ICE BLOCK',
    note: 'SHIPPED. Frozen mid-leap, side-on and startled, inside a flat block of ice, blue all over; a crack runs down it, it shatters off him in shards left behind by the scroll, and the blue drains out of him as he runs on.',
    T: HIT_LONG_T, paint: K.paintIceBlock, after: K.iceShards, shipped: true },
  { ...at('ice'), letter: 'B', id: 'ice-frostbite', name: 'FROSTBITTEN',
    note: 'No block: he goes ice-blue on the spot, snow on his head, icicles off his chin, shivering, a frosty breath — then the frost shakes off him in flakes.',
    paint: paintFrostbite, after: frostFlakes },
  { ...at('generic'), letter: 'A', id: 'generic-stars', name: 'RING OF STARS',
    note: 'Peter’s: a white flash on the hit, then the usual blink with a little ring of four cartoon stars running round his head through it (they stay up a second, past the picture, and fade).',
    T: GEN_FLASH, paint: K.paintFlash, after: starRing },
  { ...at('generic'), letter: 'B', id: 'generic-birdies', name: 'BIRDIES',
    note: 'The same flash and blink with three little yellow birds going round his head instead of the stars.',
    T: GEN_FLASH, paint: K.paintFlash, after: birdRing },
  { ...at('generic'), letter: 'C', id: 'generic-stars-birdies', name: 'STARS AND BIRDIES',
    note: 'Peter: “can we combine birds and stars? i think that is a cartoon staple”. The same flash, then three stars and two little birds alternating round one ring over his head through the usual blink, fading about a second after the hit. SHIPPED for every hit with no family of its own.',
    T: GEN_FLASH, paint: K.paintFlash, after: K.starsAndBirdies, shipped: true },
];

// ---------------------------------------------------------------- the tile
// One cabinet at in-run size (the obstacle kit's lane, zoom 2), two strips, two heroes
// each, every hero running into his own copy of the real obstacle at the same moment, on
// a loop. The hit around him is the one the run plays for every hit: the red knock burst,
// the 5px shake, the 0.08s hitstop and the 1.4s blink — identical on every tile. NOW is

export const HIT_NOW = { letter: 'NOW', id: 'now', name: 'the generic hit',
  note: 'What this hit does today: the red knock burst, the shake, the 0.08s hitstop and the 1.4s blink. He runs on through it.' };
const P = 2.6;                // one loop: run in, hit, the picture, the blink, run clear
const T_HIT = 0.7;
const IFRAMES = 1.4, HITSTOP = 0.08;
const HERO_XS = [60, 172];

// The knock every hit throws (takeHit's red burst), left behind by the scroll.
function knock(c, x, y, e) {
  for (let i = 0; i < 16; i++) {
    const life = 0.6 * (0.6 + 0.6 * hash(i * 4.1 + 9));
    if (e > life) continue;
    const a = hash(i * 1.3 + 9) * Math.PI * 2, s = 90 * (0.4 + 0.6 * hash(i * 2.9 + 9));
    const px = x + Math.cos(a) * s * e - SCROLL * e, py = y + (Math.sin(a) * s - 27) * e + 70 * e * e;
    c.fillStyle = `rgba(224,72,72,${1 - e / life})`; c.fillRect(px - 1, py - 1, 2, 2);
  }
}

const OBS = new Map();
function obstacleOf(type) {
  if (!OBS.has(type)) OBS.set(type, makeObstacle(type, 0));
  return OBS.get(type);
}

// family: a HIT_FAMILIES id; candId: a HIT_EFFECTS id, or 'now'.
export function drawHitTile(ctx, t, family, candId, strips, heroes) {
  const fam = FAM[family];
  const cand = HIT_EFFECTS.find((x) => x.id === candId) || null;
  const base = obstacleOf(fam.obstacle);
  const speed = SCROLL - (base.vx || 0);        // a roller comes at him faster than the road
  const tl = ((t % P) + P) % P, loop = Math.floor(t / P);
  const frozen = Math.min(Math.max(tl - T_HIT, 0), HITSTOP);
  const g = tl - frozen;                         // the game's clock this loop
  const w = tl - T_HIT;                          // wall time since contact
  const e = Math.max(0, g - T_HIT);              // game time since contact
  // The run's shake(5, 0.3).
  let sx = 0, sy = 0;
  if (w >= 0 && w < 0.3) {
    const p = 5 * Math.min(1, (0.3 - w) * 4), n = Math.floor(t * 60);
    sx = (hash(n) * 2 - 1) * p; sy = (hash(n + 0.5) * 2 - 1) * p;
  }
  ctx.save();
  ctx.translate(sx, sy);
  let lane = 0;
  drawCabinetLane(ctx, loop * (P - HITSTOP) + g, fam.cabinet, strips, (c, tt) => {
    const pair = heroes.slice(lane * 2, lane * 2 + 2);
    lane++;
    pair.forEach((heroId, i) => {
      const hx = HERO_XS[i];
      const ob = { ...base, x: hx + 4 + speed * (T_HIT - g) };
      const showOb = ob.x > -40;
      if (showOb && !fam.obstacleOver) drawWorldEntity(c, ob, 0, tt, null, {});
      if (w >= 0) knock(c, hx + 6, GROUND_Y - 8, e);
      // As draw.js: the picture replaces him for its T and the blink waits for it; after
      // that the ordinary blink, with the picture's `after` over it.
      const T = cand ? cand.T ?? HIT_T : 0;
      const blink = w >= 0 && e < IFRAMES && blinkOff(t);
      if (cand && w >= 0 && w < T) cand.paint(c, heroId, hx, GROUND_Y, w, t, runPose(g));
      else if (!(blink && (!cand || w >= T))) drawToon(c, heroId, runPose(g), hx, GROUND_Y, U);
      if (cand?.after && w >= T) cand.after(c, heroId, hx, GROUND_Y, w, t);
      if (showOb && fam.obstacleOver) drawWorldEntity(c, ob, 0, tt, null, {});
    });
  }, { hero: null });
  ctx.restore();
}

// ICE A on the whole cast, held frozen: the chunk is sized to each hero's own frozen
// silhouette (sprites/hitPictures.js iceFitOf), so the big ones and the tall hats fit.
export function drawIceCastTile(ctx, t, strips, heroes) {
  let lane = 0;
  drawCabinetLane(ctx, t, 'frost', strips, (c) => {
    const row = heroes.slice(lane * 4, lane * 4 + 4);
    lane++;
    row.forEach((heroId, i) => {
      const w = 0.3 + 0.25 * ((t * 0.5) % 1);       // inside the frozen hold
      K.paintIceBlock(c, heroId, 40 + i * 55, GROUND_Y, w, t);
    });
  }, { hero: null });
}
export { iceFitOf };
