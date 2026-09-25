// Frost sky bake-off — a reindeer team crossing the Act II sky.
//
// THE SHIPPED ONE IS WHICHEVER ID `FROST_FLYPAST` POINTS AT; every other variant
// here stays drawable so the gallery section that decides it renders candidates
// through the exact code that would ship them. Same shape as FINISH_MARKER in
// game/finishMarker.js, and for the same reason — this file moved out of
// src/dev/ the day the run started drawing one of them.
//
// Each candidate is a painter that draws one flying thing at (x, y) in the
// PACK'S OWN local pixels — the same space the Frost backdrop is painted in, so
// portrait's background zoom and shift carry it for free — and the run flies it
// across the sky at the end of frost-3 while the hero takes the tape.
//
// The question the cards ask is the only one worth asking: does it read as a
// reindeer at the size the sky can afford, against a pale blue ground, at the
// speed it goes past?
//
// WHAT THIS HAS TO DO, which is what these are judged on:
//
//  - read as CUT PAPER. Frost is flat fills with no ink line anywhere; a
//    reindeer drawn with an outline would be the only outlined thing in the
//    cabinet. The silhouette is the whole drawing.
//  - take the sky's aerial perspective. Everything in this pack is mixed toward
//    what is behind it, and the sky is the furthest thing there is — so a hard
//    black team would be the highest-contrast object in the frame, which is the
//    mistake the peaks already made once (FROST_ATMOSPHERE).
//  - survive being SMALL. A sleigh that needs its runners counted has already
//    gone past. Every card here also shows the candidate at its real size.
//  - be a moment, not scenery. It crosses and it is gone; nothing may draw the
//    eye off the lane for longer than that.
//
// The one warm accent is the question candidate E asks: Act II's only warm
// colour is the fortress windows, and a lead reindeer with a lit nose either
// joins that family or spends it on a joke.

import { drawFrostDeer } from '../engine/stylePacks/frostLandmarks.js';

// HOW DARK THE THING IN THE SKY IS, as a ladder rather than a constant.
//
// It started as one slate most of the way to the Frost sky's own blue, which is
// the right instinct for a clear day and the wrong one at the tape: frost-3
// finishes under the heaviest snow in the cabinet, and the blizzard's veil is
// laid OVER the backdrop at 34% of a haze colour. Measured on the real ending, a
// #5c7794 team at that distance is gone — the only things that came through were
// the lead's nose and the hat's gold bobble.
//
// So the rungs go DOWN toward a shadow rather than out toward black. The whole
// pack is mixed toward what is behind it and a hard black team would be the
// highest-contrast object in the frame (FROST_ATMOSPHERE, the mistake the peaks
// already made once); a deep blue-slate is a thing seen THROUGH weather, which
// is what it is. The warm pair does not move down the ladder — it is Act II's
// one warm family and it is already the only part that survives.
export const FLYPAST_PALETTES = {
  // As the silhouettes were drawn, against a clear sky.
  sky:    { ink: '#5c7794', inkSoft: '#7b93ac', lit: '#7f9bb6', litSoft: '#98adc2', runner: '#4a6480' },
  dusk:   { ink: '#46607f', inkSoft: '#62799a', lit: '#6a86a4', litSoft: '#8099b3', runner: '#37506c' },
  shadow: { ink: '#33485f', inkSoft: '#4a6180', lit: '#55708e', litSoft: '#6b86a3', runner: '#263a4f' },
  night:  { ink: '#20303f', inkSoft: '#34485f', lit: '#405a75', litSoft: '#55708c', runner: '#16232f' },
  // The bottom of the ladder: a cut-out, and about as far as this can go before
  // the thing in the furthest layer of the frame is also the hardest object in
  // it. It is still blue — a true black would be the only black in the cabinet.
  pitch:  { ink: '#131c26', inkSoft: '#22303f', lit: '#2c3e51', litSoft: '#3d5368', runner: '#0c1219' },
};

// The live one. Every painter below resolves its ink through this rather than
// off a constant, so one call re-inks the whole object — same seam as setInk /
// setContour in sprites/toons.js, and for the same reason: the alternative is an
// options bag threaded through nine painters and eight candidates.
let PAL = FLYPAST_PALETTES.sky;
export function setFlypastPalette(name) {
  PAL = FLYPAST_PALETTES[name] || FLYPAST_PALETTES.sky;
}
const WARM = '#f2b84b';
const NOSE = '#e0604a';

// SANTA, IN THE FEWEST PIXELS IT CAN BE DONE IN.
//
// The driver already had a scarf in this red, and a scarf is a 0.4px stroke —
// at the size this ships that is a suggestion of a colour, not a colour. The
// coat is the opposite: a solid three-pixel patch, the only unbroken fill on the
// whole object that is not slate, and it is what turns a silhouette in a sleigh
// into Santa without drawing a single feature.
//
// Three colours and no more: coat, trim, and the boots left as ink. A red that
// is a shade down from the nose, so the lead animal keeps the brightest warm
// thing in the frame — he is the one that blinks, and two competing reds at this
// size is one red smear.
const SANTA_RED = '#c8463b';
const SANTA_TRIM = '#f0e4da';
// The nose lit. It is brighter than the nose is, because a beacon is not the
// colour of the thing it is on.
const NOSE_LIT = '#ff7a5c';

// RUDOLPH BLINKS, and blinking is not pulsing. A sine in and out is a lamp on a
// dimmer; this is dark for most of a second and then ON — a short rise, a hold,
// a shorter fall. At the size this ships the nose is barely more than a pixel,
// so the flash is what carries it, and the glow below is what makes one pixel
// legible at all.
const BLINK_PERIOD = 1.15;
const BLINK_ON = 0.42;        // seconds of the period the lamp is lit
export function flypastBlink(t) {
  const ph = ((Number(t) || 0) % BLINK_PERIOD + BLINK_PERIOD) % BLINK_PERIOD;
  if (ph > BLINK_ON) return 0;
  const f = ph / BLINK_ON;
  // Rise over the first fifth, hold, fall over the last third.
  if (f < 0.2) return f / 0.2;
  if (f > 0.68) return Math.max(0, (1 - f) / 0.32);
  return 1;
}

// One nose, at the lead's muzzle. `blink` is 0..1 from flypastBlink; the halo is
// drawn first and the bead over it, so the bead stays a hard shape however wide
// the light around it goes.
export function rudolphNose(ctx, cx, cy, r, blink = 1) {
  const b = Math.max(0, Math.min(1, blink));
  if (b > 0.02) {
    const glow = r * (3.4 + 1.6 * b);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow);
    g.addColorStop(0, `rgba(255,140,110,${0.55 * b})`);
    g.addColorStop(0.45, `rgba(255,120,90,${0.22 * b})`);
    g.addColorStop(1, 'rgba(255,120,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, glow, 0, Math.PI * 2);
    ctx.fill();
  }
  // The bead is never fully out: an unlit nose is still a red nose, and a lead
  // animal that loses his muzzle between flashes reads as a drawing error.
  ctx.fillStyle = b > 0.5 ? NOSE_LIT : NOSE;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (1 + 0.25 * b), 0, Math.PI * 2);
  ctx.fill();
}

// One reindeer, nose at (x, y), facing +x, `len` long. `phase` runs its gallop.
//
// The legs are the only part that moves. A flying reindeer with still legs is a
// cardboard cut-out on a stick, and one with a full gallop cycle is a horse —
// the truth is in between: fore legs reaching, hind legs trailing, both swinging
// a few degrees off the body line.
function reindeer(ctx, x, y, len, phase, opts = {}) {
  const u = len / 16;                 // everything below is authored at len 16
  const ink = opts.ink || PAL.ink;
  const swing = Math.sin(phase) * 0.9 * u;
  const lift = Math.cos(phase) * 0.35 * u;
  ctx.save();
  ctx.translate(x, y + lift);
  ctx.fillStyle = ink;
  // Body: a wedge, deepest at the chest and tapering to the rump, because that
  // is the shape that still says "deer" when it is nine pixels long.
  ctx.beginPath();
  ctx.moveTo(-1.5 * u, -1.2 * u);
  ctx.lineTo(-7 * u, -1.6 * u);
  ctx.lineTo(-11.5 * u, -0.7 * u);
  ctx.lineTo(-12 * u, 0.9 * u);
  ctx.lineTo(-6 * u, 1.5 * u);
  ctx.lineTo(-1.8 * u, 0.9 * u);
  ctx.closePath();
  ctx.fill();
  // Neck and head, reaching forward and slightly up — the line of a thing
  // pulling, not gliding.
  ctx.beginPath();
  ctx.moveTo(-2.4 * u, -1.4 * u);
  ctx.lineTo(1.4 * u, -3.4 * u);
  ctx.lineTo(3.6 * u, -3.1 * u);
  ctx.lineTo(3.4 * u, -1.9 * u);
  ctx.lineTo(0.2 * u, -0.6 * u);
  ctx.closePath();
  ctx.fill();
  // Antlers: two forks off the crown. At this size they are the one detail that
  // separates a reindeer from a dog, so they get the widest spread the
  // silhouette can carry.
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.5, 0.65 * u);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(1.6 * u, -3.2 * u);
  ctx.lineTo(0.9 * u, -5.6 * u);
  ctx.moveTo(0.9 * u, -5.6 * u);
  ctx.lineTo(-0.8 * u, -6.4 * u);
  ctx.moveTo(0.9 * u, -5.6 * u);
  ctx.lineTo(2.3 * u, -6.3 * u);
  ctx.moveTo(2.6 * u, -3.3 * u);
  ctx.lineTo(2.6 * u, -5.2 * u);
  ctx.moveTo(2.6 * u, -5.2 * u);
  ctx.lineTo(4.1 * u, -5.9 * u);
  ctx.stroke();
  // Legs, fore pair reaching and hind pair trailing.
  ctx.lineWidth = Math.max(0.45, 0.6 * u);
  ctx.beginPath();
  ctx.moveTo(-2.6 * u, 0.9 * u);
  ctx.lineTo(-0.6 * u + swing, 3.4 * u);
  ctx.moveTo(-3.6 * u, 1 * u);
  ctx.lineTo(-2.2 * u - swing, 3.6 * u);
  ctx.moveTo(-9.6 * u, 0.9 * u);
  ctx.lineTo(-11.6 * u - swing, 3.2 * u);
  ctx.moveTo(-10.4 * u, 0.8 * u);
  ctx.lineTo(-13 * u + swing, 3 * u);
  ctx.stroke();
  // Tail.
  ctx.beginPath();
  ctx.moveTo(-11.8 * u, -0.4 * u);
  ctx.lineTo(-13.4 * u, -1.6 * u);
  ctx.stroke();
  if (opts.nose) rudolphNose(ctx, 3.5 * u, -2.5 * u, Math.max(0.6, 0.85 * u), opts.blink);
  ctx.restore();
}

// The sleigh, its front at (x, y). A curl at the front, a seat back, a runner
// under it, and one passenger — all in silhouette.
function sleigh(ctx, x, y, len, phase, opts = {}) {
  const u = len / 14;
  const ink = opts.ink || PAL.ink;
  const lift = Math.cos(phase + 0.8) * 0.3 * u;
  ctx.save();
  ctx.translate(x, y + lift);
  ctx.fillStyle = ink;
  // Body: low at the front, rising into a seat back at the rear.
  ctx.beginPath();
  ctx.moveTo(0, -1.2 * u);
  ctx.lineTo(-6.5 * u, -1.6 * u);
  ctx.lineTo(-7.4 * u, -5.2 * u);
  ctx.lineTo(-9.6 * u, -5 * u);
  ctx.lineTo(-9.8 * u, 1.2 * u);
  ctx.lineTo(-0.6 * u, 1.4 * u);
  ctx.closePath();
  ctx.fill();
  // The front curl, which is the one line that says sleigh rather than crate.
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.5, 0.75 * u);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.4 * u, -1.4 * u);
  ctx.quadraticCurveTo(3.4 * u, -2.6 * u, 2.2 * u, -5.2 * u);
  ctx.stroke();
  // Runner, carried past both ends and turned up at the front.
  ctx.beginPath();
  ctx.moveTo(-10.4 * u, 1.8 * u);
  ctx.lineTo(0.6 * u, 2 * u);
  ctx.quadraticCurveTo(2.8 * u, 2 * u, 2.6 * u, 0.4 * u);
  ctx.strokeStyle = opts.runner || PAL.runner;
  ctx.stroke();
  if (opts.rider !== false) {
    // The passenger: shoulders, a head, and a hat with a point. Nothing else
    // survives at this size, and nothing else is needed — the shape of the hat
    // is the whole of the joke.
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(-3.4 * u, -1.6 * u);
    ctx.lineTo(-2.4 * u, -4.6 * u);
    ctx.lineTo(-5.4 * u, -4.8 * u);
    ctx.lineTo(-6 * u, -1.6 * u);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-3.9 * u, -5.6 * u, 1.25 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2.7 * u, -6.1 * u);
    ctx.lineTo(-5.4 * u, -6.5 * u);
    ctx.lineTo(-7.4 * u, -8.4 * u);
    ctx.closePath();
    ctx.fill();
    if (opts.hatTip) {
      ctx.fillStyle = opts.hatTip;
      ctx.beginPath();
      ctx.arc(-7.4 * u, -8.4 * u, 0.9 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// The traces: two thin lines from the rear of the team to the sleigh's nose.
function traces(ctx, fromX, fromY, toX, toY, ink = null, width = 0.5) {
  ctx.strokeStyle = ink || PAL.inkSoft;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY - 0.8);
  ctx.lineTo(toX, toY - 1.2);
  ctx.moveTo(fromX, fromY + 0.6);
  ctx.lineTo(toX, toY + 0.4);
  ctx.stroke();
}

// A thin dust of snow off the back of the team, for the candidate that wants the
// crossing to leave something behind it.
function sparkleTrail(ctx, x, y, t, len, count = 9) {
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < count; i++) {
    const k = i / count;
    const px = x - len * (0.4 + k * 2.6);
    const py = y + Math.sin(t * 2.4 + i * 1.7) * (1 + k * 3) - k * 1.5;
    const r = Math.max(0.35, (1 - k) * 0.9);
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// A team of `n`, nose of the lead at (x, y), running back from it. Pairs are
// staggered a little in y so the line reads as depth rather than as a queue.
function team(ctx, x, y, len, t, n, opts = {}) {
  const gap = len * 1.15;
  for (let i = 0; i < n; i++) {
    const back = i * gap;
    const off = (i % 2) ? len * 0.16 : -len * 0.1;
    reindeer(ctx, x - back, y + off, len, t * 9 + i * 1.3, {
      ink: opts.ink,
      nose: !!opts.nose && i === 0,
      blink: opts.blink,
    });
  }
  return x - (n - 1) * gap - len * 0.9;   // where the traces should start
}

// --- the detailed pass -------------------------------------------------------
//
// E and F were the two that read; this is the same two with more drawing in
// them. DETAIL HERE IS A SECOND TONE, NOT MORE GEOMETRY. Frost is flat cut
// paper, so the way this cabinet says "there is more of this thing" is one
// lighter plane where the light falls — a back, a haunch, a hat brim — and the
// way it says nothing at all is another six lines of outline that turn to grey
// mush the moment the team is at the size it ships at.
//
// What each animal gains: a lit back and rump, an ear, a knee in each leg, a
// hoof, a fuller three-tine rack, and a harness strap with one warm bell on it.
// What the sleigh gains: a lit side panel, a rolled seat back, a sack of
// presents, a scarf, a driver leaning into the reins, and reins that actually
// reach the team.
function reindeerDetail(ctx, x, y, len, phase, opts = {}) {
  const u = len / 16;
  const ink = opts.ink || PAL.ink;
  const lit = opts.lit || PAL.lit;
  const swing = Math.sin(phase) * 0.9 * u;
  const knee = Math.cos(phase) * 0.5 * u;
  const lift = Math.cos(phase) * 0.35 * u;
  ctx.save();
  ctx.translate(x, y + lift);
  // Body, then the lit plane along the back and over the rump. The two shapes
  // share the top edge, so the animal reads as one silhouette with light on it
  // rather than as two animals of different colours.
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-1.5 * u, -1.2 * u);
  ctx.lineTo(-7 * u, -1.8 * u);
  ctx.lineTo(-11.5 * u, -0.9 * u);
  ctx.lineTo(-12.2 * u, 0.9 * u);
  ctx.lineTo(-6 * u, 1.6 * u);
  ctx.lineTo(-1.8 * u, 0.9 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.moveTo(-2 * u, -1.1 * u);
  ctx.lineTo(-7 * u, -1.8 * u);
  ctx.lineTo(-11.5 * u, -0.9 * u);
  ctx.lineTo(-11.8 * u, 0.1 * u);
  ctx.lineTo(-7.4 * u, -0.5 * u);
  ctx.lineTo(-2.6 * u, -0.1 * u);
  ctx.closePath();
  ctx.fill();
  // Neck, head and ear.
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-2.4 * u, -1.4 * u);
  ctx.lineTo(1.4 * u, -3.5 * u);
  ctx.lineTo(3.8 * u, -3.1 * u);
  ctx.lineTo(3.5 * u, -1.8 * u);
  ctx.lineTo(0.2 * u, -0.6 * u);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.6 * u, -3.1 * u);
  ctx.lineTo(-0.9 * u, -4.4 * u);
  ctx.lineTo(0.4 * u, -4.3 * u);
  ctx.closePath();
  ctx.fill();
  // A three-tine rack on each side — the brow tine forward, two off the beam.
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.45, 0.6 * u);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(1.6 * u, -3.3 * u);
  ctx.lineTo(0.7 * u, -5.9 * u);
  ctx.lineTo(-1.2 * u, -6.9 * u);
  ctx.moveTo(0.7 * u, -5.9 * u);
  ctx.lineTo(2.4 * u, -6.7 * u);
  ctx.moveTo(1.2 * u, -4.6 * u);
  ctx.lineTo(3 * u, -4.9 * u);
  ctx.moveTo(2.7 * u, -3.4 * u);
  ctx.lineTo(2.9 * u, -5.5 * u);
  ctx.lineTo(4.6 * u, -6.2 * u);
  ctx.moveTo(2.9 * u, -5.5 * u);
  ctx.lineTo(1.7 * u, -6.3 * u);
  ctx.stroke();
  // Legs with a knee in them: thigh down, shin swinging off it, hoof at the
  // end. A straight line from body to point is a stick; the break is the
  // difference between a flying animal and a rocking horse.
  const leg = (hipX, hipY, kx, ky, fx, fy) => {
    ctx.beginPath();
    ctx.moveTo(hipX * u, hipY * u);
    ctx.lineTo(kx * u, ky * u);
    ctx.lineTo(fx * u, fy * u);
    ctx.stroke();
  };
  ctx.lineWidth = Math.max(0.4, 0.55 * u);
  leg(-2.6, 0.9, -1.8 + swing / u, 2.4 + knee / u, -0.4 + swing / u * 1.6, 3.6);
  leg(-3.8, 1, -3.4 - swing / u, 2.6 - knee / u, -2.2 - swing / u * 1.4, 3.8);
  leg(-9.6, 0.9, -10.8 - swing / u, 2.2 - knee / u, -12.4 - swing / u * 1.3, 3.4);
  leg(-10.6, 0.8, -11.8 + swing / u, 2.1 + knee / u, -13.6 + swing / u, 3.2);
  // Tail.
  ctx.beginPath();
  ctx.moveTo(-11.9 * u, -0.5 * u);
  ctx.lineTo(-13.6 * u, -1.8 * u);
  ctx.stroke();
  // Harness: a strap round the chest with one bell on it. The bell is the only
  // warm mark an ordinary animal in the team carries.
  ctx.strokeStyle = lit;
  ctx.lineWidth = Math.max(0.35, 0.45 * u);
  ctx.beginPath();
  ctx.moveTo(-1.4 * u, -1.6 * u);
  ctx.lineTo(-3 * u, 1 * u);
  ctx.stroke();
  if (opts.bell !== false) {
    ctx.fillStyle = WARM;
    ctx.beginPath();
    ctx.arc(-2.6 * u, 0.5 * u, Math.max(0.3, 0.42 * u), 0, Math.PI * 2);
    ctx.fill();
  }
  if (opts.nose) rudolphNose(ctx, 3.7 * u, -2.4 * u, Math.max(0.6, 0.85 * u), opts.blink);
  ctx.restore();
}

function sleighDetail(ctx, x, y, len, phase, opts = {}) {
  const u = len / 14;
  const ink = opts.ink || PAL.ink;
  const lit = opts.lit || PAL.lit;
  const lift = Math.cos(phase + 0.8) * 0.3 * u;
  ctx.save();
  ctx.translate(x, y + lift);
  // Hull, lit side panel, rolled seat back.
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(0, -1.2 * u);
  ctx.lineTo(-6.5 * u, -1.8 * u);
  ctx.lineTo(-7.6 * u, -5.6 * u);
  ctx.lineTo(-10 * u, -5.4 * u);
  ctx.lineTo(-10.2 * u, 1.2 * u);
  ctx.lineTo(-0.6 * u, 1.4 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.moveTo(-1 * u, -0.8 * u);
  ctx.lineTo(-6.4 * u, -1.3 * u);
  ctx.lineTo(-6.6 * u, 0.2 * u);
  ctx.lineTo(-1.2 * u, 0.4 * u);
  ctx.closePath();
  ctx.fill();
  // The front curl and the runner, the runner carried on two struts so the
  // sleigh is standing on something rather than sitting on a line.
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.5, 0.75 * u);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.4 * u, -1.4 * u);
  ctx.quadraticCurveTo(3.6 * u, -2.8 * u, 2.3 * u, -5.6 * u);
  ctx.stroke();
  ctx.strokeStyle = opts.runner || PAL.runner;
  ctx.lineWidth = Math.max(0.4, 0.55 * u);
  ctx.beginPath();
  ctx.moveTo(-8.6 * u, 1.4 * u); ctx.lineTo(-8.4 * u, 2.2 * u);
  ctx.moveTo(-2.6 * u, 1.4 * u); ctx.lineTo(-2.4 * u, 2.2 * u);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.5, 0.7 * u);
  ctx.beginPath();
  ctx.moveTo(-10.8 * u, 2.2 * u);
  ctx.lineTo(0.6 * u, 2.4 * u);
  ctx.quadraticCurveTo(3 * u, 2.4 * u, 2.8 * u, 0.6 * u);
  ctx.stroke();
  // The sack, sitting behind the seat and over the back of the hull.
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-7.4 * u, -1.6 * u);
  ctx.quadraticCurveTo(-11.4 * u, -3.4 * u, -10.4 * u, -6.6 * u);
  ctx.quadraticCurveTo(-8.4 * u, -8 * u, -7 * u, -6 * u);
  ctx.quadraticCurveTo(-6.4 * u, -3.4 * u, -7.4 * u, -1.6 * u);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lit;
  ctx.beginPath();
  ctx.moveTo(-8.8 * u, -2.2 * u);
  ctx.quadraticCurveTo(-10.6 * u, -3.8 * u, -9.9 * u, -6.2 * u);
  ctx.quadraticCurveTo(-8.6 * u, -7 * u, -8.2 * u, -5.4 * u);
  ctx.quadraticCurveTo(-8.2 * u, -3.4 * u, -8.8 * u, -2.2 * u);
  ctx.closePath();
  ctx.fill();
  if (opts.rider !== false) {
    // The driver, LEANING FORWARD into the reins — the one pose change that
    // turns a passenger into somebody driving. In the coat, if he is wearing
    // one: the torso, the hat and the trim are the only things on this drawing
    // painted out of the sky's palette, and they are the whole read.
    const coat = opts.santa ? SANTA_RED : ink;
    const trim = opts.santa ? SANTA_TRIM : lit;
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-2.6 * u, -1.6 * u);
    ctx.lineTo(-1.6 * u, -5 * u);
    ctx.lineTo(-4.8 * u, -5.4 * u);
    ctx.lineTo(-5.6 * u, -1.6 * u);
    ctx.closePath();
    ctx.fill();
    // Arm out to the reins.
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(0.45, 0.6 * u);
    ctx.beginPath();
    ctx.moveTo(-2.6 * u, -4.4 * u);
    ctx.lineTo(0.4 * u, -3.4 * u);
    ctx.stroke();
    // Head, beard, hat, bobble. The head stays ink under the hat: at this size a
    // face is two pixels of nothing, and the beard is what says which way he is
    // looking.
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(-3.1 * u, -6 * u, 1.3 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.moveTo(-2.1 * u, -5.9 * u);
    ctx.lineTo(-3.6 * u, -4.2 * u);
    ctx.lineTo(-4.3 * u, -5.6 * u);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = coat;
    ctx.beginPath();
    ctx.moveTo(-1.8 * u, -6.6 * u);
    ctx.lineTo(-4.6 * u, -7 * u);
    ctx.lineTo(-6.8 * u, -9 * u);
    ctx.closePath();
    ctx.fill();
    // The bobble goes white with the coat rather than gold: a red hat with a
    // gold tip is a jester, and the gold in this cabinet belongs to the fortress
    // windows.
    ctx.fillStyle = opts.hatTip || (opts.santa ? SANTA_TRIM : WARM);
    ctx.beginPath();
    ctx.arc(-6.8 * u, -9 * u, 0.95 * u, 0, Math.PI * 2);
    ctx.fill();
    // Scarf, trailing back over the sack. White against the coat — two reds
    // touching at three pixels is one red shape — and it reads as the beard
    // blowing back, which is the same joke either way.
    ctx.strokeStyle = opts.scarf || (opts.santa ? SANTA_TRIM : NOSE);
    ctx.lineWidth = Math.max(0.4, 0.55 * u);
    ctx.beginPath();
    ctx.moveTo(-3.4 * u, -5 * u);
    ctx.quadraticCurveTo(-6.2 * u, -4.4 * u, -8.8 * u, -5.6 * u);
    ctx.stroke();
  }
  ctx.restore();
}

// Reins: one curve from the driver's hand to the lead animal's harness, sagging
// between them. Two straight traces hold the sleigh; this one line is the thing
// the driver is holding, and it is what ties the two halves of the drawing into
// one object.
function reins(ctx, fromX, fromY, toX, toY, ink = null, width = 0.45) {
  ctx.strokeStyle = ink || PAL.lit;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo((fromX + toX) / 2, (fromY + toY) / 2 + 2.2, toX, toY);
  ctx.stroke();
}

function teamDetail(ctx, x, y, len, t, n, opts = {}) {
  const gap = len * 1.15;
  for (let i = 0; i < n; i++) {
    const back = i * gap;
    const off = (i % 2) ? len * 0.16 : -len * 0.1;
    reindeerDetail(ctx, x - back, y + off, len, t * 9 + i * 1.3, {
      ink: opts.ink,
      lit: opts.lit,
      nose: !!opts.nose && i === 0,
      blink: opts.blink,
    });
  }
  return x - (n - 1) * gap - len * 0.9;
}

// ------------------------------------------------------------------ round two: in colour
// Peter, 25 Sep 2026: "can we do a bake off with new and improved santa and reindeer flying
// across the sky?" The first round was drawn for a sleigh seen THROUGH the finish blizzard,
// which is why it is slate: at that depth only the warm accents came through. It flies in
// FRONT of the snow now (FROST_FLYPAST_DEPTH), so colour can read, and these are drawn the
// way the rest of Frost is: cut paper, flat pieces, no ink line. The reindeer are the
// herd's own paper deer (frostLandmarks.js drawFrostDeer — the tan antlers, pale mane,
// dark muzzle), in pairs, the far animal of each hazed back; the sleigh is red lacquer on
// gold runners with a sack of presents; Santa is in full red and white, a beard, one
// hand on the reins and the other waving.
const PAPER_SANTA = {
  red: '#c8463b', redDark: '#963127', trim: '#f3ece2', trimShade: '#d9cfc4', gold: '#e2b04a',
  goldDark: '#b9862f', skin: '#e9b692', cheek: '#e08e7a', black: '#2a2226', sack: '#8a6a4a',
  sackDark: '#6d523a', giftA: '#3f8f6a', giftB: '#4f78b8', strap: '#b33a30', rein: '#3a2a26',
};
const PAPER_SHADOW = 'rgba(40,50,80,0.28)';
function pfill(ctx, color, path) { ctx.beginPath(); path(ctx); ctx.fillStyle = color; ctx.fill(); }
function pstroke(ctx, color, w, path) {
  ctx.beginPath(); path(ctx);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
// A cut piece over its paper shadow.
function ppiece(ctx, color, path) {
  ctx.save(); ctx.translate(-0.3, 0.4); pfill(ctx, PAPER_SHADOW, path); ctx.restore();
  pfill(ctx, color, path);
}
// A paper reindeer in the air: the herd's deer, a red strap and a gold bell at its chest.
// (x, y) is its NOSE; the deer's own origin is its hooves, 14.5 back and 12.6 down.
function paperFlyer(ctx, x, y, s, phase, { nose = false, blink = 0, far = false } = {}) {
  const ox = x - 14.5 * s, oy = y + 12.6 * s;
  ctx.save();
  if (far) ctx.globalAlpha *= 0.78;
  drawFrostDeer(ctx, ox, oy, s, phase, 0, nose
    ? { nose: (c, nx, ny, r) => rudolphNose(c, nx, ny, r * 1.2, blink) } : {});
  // The harness: a strap round the chest, the bell on it.
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  pstroke(ctx, PAPER_SANTA.strap, 0.9, (c) => { c.moveTo(4.6, -11.2); c.lineTo(6.2, -6.6); });
  pfill(ctx, PAPER_SANTA.gold, (c) => { c.arc(5.7, -7.8, 0.75, 0, Math.PI * 2); });
  ctx.restore();
  ctx.restore();
}
// The sleigh and Santa, facing +x, the hitch at (x, y) (level with the team's chests).
// Units: 16 long at s = 1, runners 7 below the hitch.
function paperSleigh(ctx, x, y, s, t) {
  const P = PAPER_SANTA;
  const bob = Math.sin(t * 5.2) * 0.25;
  ctx.save();
  ctx.translate(x, y + bob * s);
  ctx.scale(s, s);
  // Runner, gold, curled at both ends, on two struts.
  pstroke(ctx, P.goldDark, 0.9, (c) => { c.moveTo(-14.6, 6.4); c.lineTo(-11.6, 3.8); c.moveTo(-3.6, 6.4); c.lineTo(-4.2, 3.8); });
  pstroke(ctx, P.gold, 0.9, (c) => {
    c.moveTo(-16, 5.2); c.quadraticCurveTo(-16.4, 6.8, -14.6, 6.8); c.lineTo(0.4, 6.8);
    c.quadraticCurveTo(3.6, 6.8, 3.4, 3.4); c.quadraticCurveTo(3.2, 1.6, 1.6, 2.2);
  });
  // The sack of presents, over the back.
  ppiece(ctx, P.sack, (c) => { c.moveTo(-15.4, -1); c.quadraticCurveTo(-18.2, -6, -15.6, -9.4); c.quadraticCurveTo(-12.4, -11.2, -10.6, -8.4); c.quadraticCurveTo(-10.2, -4, -11.4, -1); c.closePath(); });
  pfill(ctx, P.sackDark, (c) => { c.moveTo(-15.6, -9.4); c.quadraticCurveTo(-13.8, -10.8, -12.4, -9.8); c.lineTo(-13.4, -8.6); c.closePath(); });
  pfill(ctx, P.giftA, (c) => c.rect(-15, -12.2, 3, 3));
  pfill(ctx, P.giftB, (c) => c.rect(-12.6, -11.4, 2.4, 2.4));
  pstroke(ctx, P.gold, 0.45, (c) => { c.moveTo(-13.5, -12.2); c.lineTo(-13.5, -9.2); c.moveTo(-15, -10.7); c.lineTo(-12, -10.7); c.moveTo(-11.4, -11.4); c.lineTo(-11.4, -9); });
  // The body: red lacquer, high at the back, scooped, curled up at the front.
  ppiece(ctx, P.red, (c) => {
    c.moveTo(-15, 3.6); c.lineTo(-15.4, -3.4); c.quadraticCurveTo(-14.8, -5.6, -12.6, -5); c.lineTo(-10.6, -3.4);
    c.lineTo(-3.6, -2.2); c.quadraticCurveTo(0.4, -2.8, 1.2, -5.4); c.quadraticCurveTo(3, -6.2, 3.2, -4.2);
    c.quadraticCurveTo(2.8, 1.4, -0.6, 3.6); c.closePath();
  });
  pfill(ctx, P.redDark, (c) => { c.moveTo(-15, 3.6); c.lineTo(-0.6, 3.6); c.quadraticCurveTo(1.4, 2.6, 2, 1.2); c.lineTo(-15.2, 1.6); c.closePath(); });
  // Gold trim along the side and a scroll on the flank.
  pstroke(ctx, P.gold, 0.5, (c) => { c.moveTo(-14.6, -2.4); c.lineTo(-10.8, -1.8); c.lineTo(-3.4, -0.9); c.quadraticCurveTo(0.6, -1.4, 1.8, -3.8); });
  pstroke(ctx, P.gold, 0.4, (c) => { c.moveTo(-9, 1.8); c.quadraticCurveTo(-7, -0.4, -5.4, 1); c.quadraticCurveTo(-6.4, 2.2, -7.2, 1.2); });
  // SANTA. Coat and trim, belt and buckle, beard and face, hat and bobble.
  ppiece(ctx, P.red, (c) => { c.moveTo(-10.8, -2.6); c.quadraticCurveTo(-11.6, -9.6, -7.4, -11); c.quadraticCurveTo(-4.2, -11.2, -3.8, -7.6); c.lineTo(-4.4, -2.6); c.closePath(); });
  pfill(ctx, P.trim, (c) => { c.moveTo(-10.9, -3.6); c.lineTo(-4.3, -3.4); c.lineTo(-4.4, -2.4); c.lineTo(-10.8, -2.4); c.closePath(); });
  pfill(ctx, P.black, (c) => c.rect(-10.7, -6.4, 6.6, 1.1));
  pfill(ctx, P.gold, (c) => c.rect(-7.4, -6.6, 1.4, 1.5));
  // The reins arm, forward, mitten on the lines.
  pstroke(ctx, P.red, 1.3, (c) => { c.moveTo(-5, -8.6); c.lineTo(-1.6, -6.8); });
  pfill(ctx, P.trim, (c) => c.arc(-1.8, -6.9, 0.75, 0, Math.PI * 2));
  pfill(ctx, P.black, (c) => c.arc(-1, -6.6, 0.8, 0, Math.PI * 2));
  // Head: face, cheek, beard, moustache.
  pfill(ctx, P.skin, (c) => c.arc(-6.6, -12.8, 1.9, 0, Math.PI * 2));
  pfill(ctx, P.cheek, (c) => c.arc(-5.7, -12.4, 0.55, 0, Math.PI * 2));
  pfill(ctx, P.trim, (c) => { c.moveTo(-8.2, -12.2); c.quadraticCurveTo(-8.6, -9.4, -6.4, -8.6); c.quadraticCurveTo(-4.4, -9.4, -4.9, -12); c.quadraticCurveTo(-6.4, -11.2, -8.2, -12.2); c.closePath(); });
  pfill(ctx, P.trim, (c) => { c.moveTo(-6.4, -12.2); c.quadraticCurveTo(-5.2, -12.6, -4.6, -11.8); c.quadraticCurveTo(-5.4, -11.6, -6.4, -12.2); c.closePath(); });
  pfill(ctx, P.black, (c) => c.arc(-5.8, -13.3, 0.3, 0, Math.PI * 2));
  // Hat, flopping back, white band, bobble.
  const flop = Math.sin(t * 3.1) * 0.5;
  ppiece(ctx, P.red, (c) => { c.moveTo(-8.6, -13.6); c.quadraticCurveTo(-7, -17.2, -4.8, -14); c.quadraticCurveTo(-8, -15.6, -10.6 + flop, -14.6); c.closePath(); });
  pfill(ctx, P.trim, (c) => { c.moveTo(-8.8, -13.2); c.quadraticCurveTo(-6.8, -14.6, -4.6, -13.6); c.lineTo(-4.8, -12.8); c.quadraticCurveTo(-6.8, -13.8, -8.6, -12.4); c.closePath(); });
  pfill(ctx, P.trim, (c) => c.arc(-10.7 + flop, -14.5, 0.9, 0, Math.PI * 2));
  // The waving arm, from the far shoulder, back and forth.
  const wave = Math.sin(t * 7) * 0.45;
  ctx.save();
  ctx.translate(-8.4, -9.6);
  ctx.rotate(-2.1 + wave);
  pstroke(ctx, P.redDark, 1.3, (c) => { c.moveTo(0, 0); c.lineTo(4, 0); });
  pfill(ctx, P.trim, (c) => c.arc(4, 0, 0.75, 0, Math.PI * 2));
  pfill(ctx, P.black, (c) => c.arc(4.8, 0, 0.85, 0, Math.PI * 2));
  ctx.restore();
  ctx.restore();
  // Where the reins leave his hand, for the caller.
  return { handX: x + -1 * s, handY: y + (-6.6 + bob) * s };
}
// A paper team: `cols` columns of reindeer back from the nose at (x, y), each column a pair
// (the far one up and behind, hazed) unless `lone` says the lead flies alone; then the
// sleigh. Returns the sleigh's back end, for a trail.
function paperTeam(ctx, x, y, t, { s = 0.62, cols = 2, lone = false, blink = 0 } = {}) {
  // A deer is ~23 units nose to rump with its antlers; the columns stand a body apart.
  const gap = 19 * s;
  const chest = (cx) => ({ x: cx - 9.1 * s, y: y + 3.2 * s });
  const phase = (i) => ((t * 2.6 + i * 0.27) % 1 + 1) % 1;
  // Far animals first, so every near one is in front of its partner.
  for (let i = 0; i < cols; i++) {
    const cx = x - i * gap;
    if (!(lone && i === 0)) paperFlyer(ctx, cx - 2.6 * s, y - 2.8 * s, s * 0.94, phase(i + 0.5), { far: true });
  }
  // The gangline: one line from the hitch up the middle of the team.
  // The sleigh hitched a hand behind the last animal's rump (nose - 14.5 to its origin,
  // - 8 more to the rump), its front curl just short of it.
  const lastNose = x - (cols - 1) * gap;
  const hitchX = lastNose - 14.5 * s - 8 * s - 4.8 * s, hitchY = y + 4.8 * s;
  pstroke(ctx, PAPER_SANTA.rein, 0.5 * s, (c) => { c.moveTo(hitchX, hitchY); c.lineTo(chest(x).x, chest(x).y); });
  for (let i = cols - 1; i >= 0; i--) {
    paperFlyer(ctx, x - i * gap, y, s, phase(i), { nose: i === 0, blink });
  }
  const hand = paperSleigh(ctx, hitchX, hitchY, s, t);
  // The reins, from his mitten to the lead's harness, sagging.
  const lead = chest(x);
  pstroke(ctx, PAPER_SANTA.rein, 0.4 * s, (c) => {
    c.moveTo(hand.handX, hand.handY);
    c.quadraticCurveTo((hand.handX + lead.x) / 2, Math.max(hand.handY, lead.y) + 3 * s, lead.x, lead.y - 0.6 * s);
  });
  return hitchX - 17 * s;
}
// Stardust: a ribbon of gold curling off the back of the sleigh, twinkling as it goes.
function stardust(ctx, x, y, t, len = 46, s = 1) {
  for (let i = 0; i < 26; i++) {
    const k = i / 26;
    const drift = ((t * 0.9 + k) % 1);
    const px = x - k * len * s;
    const py = y + Math.sin(k * 7 - t * 3) * 3.2 * s * (0.4 + k) + k * 2 * s;
    const tw = 0.5 + 0.5 * Math.sin(t * 11 + i * 2.3);
    const a = (1 - k) * (0.45 + 0.55 * tw);
    const r = (0.35 + (1 - k) * 0.55 + tw * 0.25) * s;
    ctx.fillStyle = `rgba(255,${214 + (i % 3) * 12},${120 + (i % 4) * 25},${a})`;
    if (i % 4 === 0) {
      // A four-point star now and then.
      ctx.beginPath();
      ctx.moveTo(px, py - r * 2.6); ctx.lineTo(px + r * 0.6, py); ctx.lineTo(px, py + r * 2.6); ctx.lineTo(px - r * 0.6, py);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - r * 2.6, py); ctx.lineTo(px, py - r * 0.6); ctx.lineTo(px + r * 2.6, py); ctx.lineTo(px, py + r * 0.6);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
    void drift;
  }
}

export const FROST_SLEIGH_CANDIDATES = [
  {
    id: 'stag',
    span: 20,   // how far back from the nose it reaches, at scale 1
    name: 'A · lone stag',
    note: 'One animal, nothing behind it. The smallest thing that can be read, and the only '
      + 'candidate that is not a Christmas joke — a stag crossing the Act II sky is just weather with legs.',
    draw(ctx, x, y, t) {
      reindeer(ctx, x, y, 17, t * 9);
    },
  },
  {
    id: 'pair',
    span: 36,   // how far back from the nose it reaches, at scale 1
    name: 'B · pair, no sleigh',
    note: 'Two in line. The second animal is what turns one silhouette into a TEAM, which is most '
      + 'of the read the sleigh is there to provide — at none of its cost.',
    draw(ctx, x, y, t) {
      team(ctx, x, y, 16, t, 2);
    },
  },
  {
    id: 'stag-sleigh',
    span: 34,   // how far back from the nose it reaches, at scale 1
    name: 'C · stag and sleigh',
    note: 'One animal, traces, and the sleigh with somebody in it. The whole story in three shapes; '
      + 'watch whether the traces survive at true size or just fur the gap.',
    draw(ctx, x, y, t) {
      const tail = team(ctx, x, y, 16, t, 1);
      traces(ctx, tail, y, tail - 7, y + 1.5);
      sleigh(ctx, tail - 7, y + 1.5, 15, t * 9);
    },
  },
  {
    id: 'four-team',
    span: 86,   // how far back from the nose it reaches, at scale 1
    name: 'D · four and a sleigh',
    note: 'The full postcard. It is also the widest thing that has ever crossed this sky — the '
      + 'question is whether it stops being a moment and starts being a parade.',
    draw(ctx, x, y, t) {
      const tail = team(ctx, x, y, 15, t, 4);
      traces(ctx, tail, y, tail - 7, y + 2);
      sleigh(ctx, tail - 7, y + 2, 15, t * 9);
    },
  },
  {
    id: 'lit-nose',
    span: 86,   // how far back from the nose it reaches, at scale 1
    name: 'E · four, lit nose, gold tip',
    note: 'The same team spending Act II\'s ONE warm colour: the lead\'s nose and the hat\'s bobble, '
      + 'in the fortress-window gold and red. Either it joins the cabinet\'s only warm family or it is a sticker.',
    draw(ctx, x, y, t) {
      const tail = team(ctx, x, y, 15, t, 4, { nose: true, blink: flypastBlink(t) });
      traces(ctx, tail, y, tail - 7, y + 2);
      sleigh(ctx, tail - 7, y + 2, 15, t * 9, { hatTip: WARM });
    },
  },
  {
    id: 'far-trail',
    span: 78,   // how far back from the nose it reaches, at scale 1
    softInk: true,   // draws in the palette's soft pair — a rung lighter than the rung
    name: 'F · far, small, with a trail',
    note: 'Half the size, higher in the frame, softer ink, and a dust of snow off the back. '
      + 'A thing seen at a distance rather than a thing flying past — and the only card where the '
      + 'trail is doing the work the silhouette cannot.',
    draw(ctx, x, y, t) {
      const tail = team(ctx, x, y, 9, t, 4, { ink: PAL.inkSoft });
      traces(ctx, tail, y, tail - 4, y + 1, PAL.inkSoft, 0.4);
      sleigh(ctx, tail - 4, y + 1, 9, t * 9, { ink: PAL.inkSoft, runner: PAL.inkSoft });
      sparkleTrail(ctx, tail - 12, y + 1, t, 9);
    },
  },

  {
    id: 'lit-nose-detail',
    span: 90,   // how far back from the nose it reaches, at scale 1
    name: 'G · E, drawn out',
    note: 'E with the second tone doing the work: lit backs and rumps, ears, knees and hooves, three-tine '
      + 'racks, a harness bell each, and a sleigh with a sack, a scarf and a driver leaning into reins that '
      + 'reach the team. Same silhouette, same width, more building in it.',
    draw(ctx, x, y, t) {
      const tail = teamDetail(ctx, x, y, 15, t, 4, { nose: true, blink: flypastBlink(t) });
      traces(ctx, tail, y, tail - 8, y + 2);
      reins(ctx, tail - 8 + 0.4, y - 1.6, x - 2, y - 1.2);
      sleighDetail(ctx, tail - 8, y + 2, 15, t * 9, { santa: true });
    },
  },
  {
    id: 'far-trail-detail',
    span: 82,   // how far back from the nose it reaches, at scale 1
    softInk: true,   // draws in the palette's soft pair — a rung lighter than the rung
    name: 'H · F, drawn out',
    note: 'The same detailed pass at F\'s distance, now with the lit nose: smaller, softer ink, trail behind. '
      + 'This is the card that says whether the extra drawing survives being far away, or whether F was '
      + 'always going to be a silhouette and should be left as one.',
    draw(ctx, x, y, t) {
      const tail = teamDetail(ctx, x, y, 10, t, 4,
        { ink: PAL.inkSoft, lit: PAL.litSoft, nose: true, blink: flypastBlink(t) });
      traces(ctx, tail, y, tail - 5, y + 1, PAL.inkSoft, 0.4);
      reins(ctx, tail - 5 + 0.3, y - 1, x - 1.4, y - 0.8, PAL.litSoft, 0.35);
      sleighDetail(ctx, tail - 5, y + 1, 10, t * 9,
        { ink: PAL.inkSoft, lit: PAL.litSoft, runner: PAL.inkSoft, santa: true });
      sparkleTrail(ctx, tail - 13, y + 1, t, 10, 11);
    },
  },
  {
    id: 'paper-santa',
    span: 60,   // how far back from the nose it reaches, at scale 1
    name: 'I · paper Santa, in colour',
    note: 'Round two (25 Sep 2026): the herd\'s own paper reindeer in two pairs, the far one of each hazed back, '
      + 'red harness and gold bells, the lead with Rudolph\'s blinking nose; a red lacquered sleigh on gold runners with '
      + 'a sack of presents; Santa in red and white with a beard, one hand on the reins, the other waving.',
    draw(ctx, x, y, t) {
      paperTeam(ctx, x, y, t, { s: 0.72, cols: 2, blink: flypastBlink(t) });
    },
  },
  {
    id: 'paper-santa-dust',
    span: 96,   // how far back from the nose it reaches, at scale 1
    name: 'J · I, with a trail of stardust',
    note: 'I with a ribbon of gold stardust curling off the back of the sleigh and twinkling as it goes — four-point '
      + 'stars among the specks. The magic is the thing the eye follows across the sky.',
    draw(ctx, x, y, t) {
      const back = paperTeam(ctx, x, y, t, { s: 0.72, cols: 2, blink: flypastBlink(t) });
      stardust(ctx, back + 4, y + 4, t, 34, 1);
    },
  },
  {
    id: 'paper-santa-nine',
    span: 80,   // how far back from the nose it reaches, at scale 1
    name: 'K · the full team — Rudolph and eight',
    note: 'Rudolph leading alone, eight behind him in four pairs, the sleigh and Santa after — the whole song, a size '
      + 'down so it is a line of reindeer rather than a parade.',
    draw(ctx, x, y, t) {
      paperTeam(ctx, x, y, t, { s: 0.55, cols: 5, lone: true, blink: flypastBlink(t) });
    },
  },
];

export const FROST_SLEIGH_BY_ID = Object.fromEntries(
  FROST_SLEIGH_CANDIDATES.map((c) => [c.id, c]));

// ------------------------------------------------------------------ the flight
// WHICH ONE FLIES. Everything above stays drawable; this is the only line that
// decides what the game shows.
//
// H — the detailed pass at F's distance, with the dust of snow behind it. The
// two it beat were E (the same team drawn flat and bigger) and F (this one
// without the second tone), and what settled it is that H is the only candidate
// whose drawing is doing the work the SIZE used to have to do: lit backs and
// rumps, knees, three-tine racks, a driver leaning into reins that reach the
// team. Note that it asks for the soft inks by name — a rung down the palette
// ladder — so H at `night` is about where E sat at `shadow`.
export const FROST_FLYPAST = 'far-trail-detail';

// The team faces +x and it FLIES +x: it comes in over the left of the sky and
// leaves over the right, which is the way the finish itself is going.
//
// And it CLIMBS, over the mast and away. The path is a parabola with its VERTEX
// on the finish pole: in low over the left, crest just above the finial, and out
// over the right edge of the screen. So the flight needs the pole's position and
// not just the frame's, and it is re-aimed every frame rather than solved once,
// because the camera can still be carrying the marker in when this arms.
//
// It went through a version that exited through the TOP of the frame over the
// pole, which is a different picture and the wrong one: the team was gone while
// the pole was still ahead of it, and in portrait — three times as much sky — it
// climbed out of the composition entirely. It was
// flown the other way in the gallery for a while, nose pointing right and
// travelling left, which is a team being dragged backwards across the sky by
// its own sleigh — the legs and the lean say one direction and the motion says
// the other, and at this size the eye reads the motion first.
//
// Local px per second, not a crossing duration. A duration would make the same
// flight a different speed in each orientation: portrait shows 270 local px of
// sky where landscape shows 480 (the background zoom is exactly the factor that
// keeps a backdrop object the same physical size on the glass), so a fixed
// number of seconds would have it tearing across the phone. One speed means one
// speed, and the crossing is simply shorter in portrait — 2.9s against 3.8s.
//
// THE CEILING ON IT IS THE SHORTEST ENDING, not taste: a CLUNK holds the finish
// frame for 0.25 + 2.5 + 1 after a dash of about 0.8, and the whole crossing —
// span, sky, span — has to be over inside that with a beat left on the
// celebration. At the shipped scale that is 880 local px in landscape, which is
// what this number is solved for. It went up with FROST_FLYPAST_SCALE and came
// back down with it, for the same reason: a nearer thing crosses the frame
// faster at the same speed over the ground, and the small far team is the one
// that should look unhurried.
//
// This is the HORIZONTAL speed. The climb adds to it, so the object gains a
// little as it leaves, which is the read the arc exists for.
//
// It came down again when the flight started EARLY (see FROST_FLYPAST_LEAD).
// Sharing the sky with the hero for a couple of seconds before the tape is what
// buys this number: with seven seconds of runway instead of five, the sleigh no
// longer has to hurry to be gone before the scene cuts, and a team that is not
// hurrying is the difference between a flypast and a thing being thrown across
// the screen.
export const FROST_FLYPAST_SPEED = 150;

// How long before the finish arms that the sleigh does, in seconds of running.
// The run is still live and scrolling here — the flight is screen-space and
// cares about neither — so for this long the hero and the sleigh are both
// crossing, which is the picture: he is running towards the tape and it is
// going the same way over his head.
export const FROST_FLYPAST_LEAD = 2.4;

// HOW MUCH OF THE PATH'S ANGLE THE DRAWING TAKES, and it is none.
//
// The team flies LEVEL. Pointing it along the arc is the obviously correct thing
// and it looks wrong: the object is 98px of team, sleigh and trail, so a tangent
// that runs from about 30 degrees nose-up at the entrance to zero at the crest
// turns the whole flight into a visible rotation — the eye reads the animals
// pivoting, not the path they are on. Christmas art has always drawn the team
// level for the same reason.
//
// Kept as a number rather than deleted because the machinery either way is three
// lines, and the next thing that crosses this sky may be short enough to carry
// its own angle. The cap is what stops a short runway solving a nose-vertical
// exit if it is ever turned back up.
export const FROST_FLYPAST_TILT = 0;
export const FROST_FLYPAST_TILT_CAP = 0.55;

// WHAT HAPPENS AFTER THE CREST, and it is not a fall.
//
// A true parabola comes down as steeply as it went up, and at the mast the
// flight is only part way across — in portrait the pole sits little more than
// half way over, so the symmetric far side spent the whole rest of the picture
// visibly losing height, which reads as coming down rather than going away. So
// past the crest it keeps climbing, by this much, easing off: up, a little more
// up, and then level out of frame.
export const FROST_FLYPAST_OVER = 15;     // local px of extra rise after the crest
// How long that extra rise takes, in units of the run up to the mast. It is
// spent on a SMOOTHSTEP, which is the whole reason it is shaped this way: the
// first version eased the rise exponentially, and an exponential leaves the
// crest at full speed — slope zero on the way in, slope 36 on the way out, which
// is a visible corner in the sky. In portrait, where the mast sits barely half
// way across and the tail of the flight is long, that corner was the whole
// picture. A smoothstep is flat at both ends, so the curve leaves the crest the
// way it arrived and settles level without a second corner at the other end.
export const FROST_FLYPAST_LEVEL = 0.8;

// HOW THE CREST IS PLACED, handed to frostFlypastArc. The clearance over the
// finial is a fraction of the pole's own drawn height with a floor, so the same
// rule gives a landscape gap of about 28px and a noticeably wider one in
// portrait, where the mast is drawn three and a half times as tall and a
// landscape-sized gap reads as a near miss. `hudKeep` is the opposite end: the
// top right of a landscape frame is the GOAL panel, and a sleigh cresting into
// it is a sleigh flying behind the readout.
export const FROST_FLYPAST_CLEAR = Object.freeze({
  clear: 0.18,
  clearMin: 22,
  // Measured off the landscape frame: the GOAL/BONUS panel's lower edge is about
  // 24, and this is that plus a gap, plus room for the extra rise on the way out.
  hudKeep: 34,
  over: FROST_FLYPAST_OVER,
});

// HOW BIG IT FLIES, as a multiple of the size the candidates are drawn at.
//
// The candidates were authored against a clear sky, where the argument was all
// about restraint — "a sleigh that needs its runners counted has already gone
// past". The tape is not a clear sky. Under the finish blizzard the whole team
// at 1.0 is a smudge, so this is the second half of the answer to that: it is
// nearer, which is the honest way to make a thing in the sky bigger. Applied as
// a transform about the lead's nose, so the ink weights scale WITH it — the
// hairline antlers and traces come up off the sub-pixel floor rather than
// staying hairlines on a bigger animal.
//
// The ceiling is the sky it has to fit in. At 2.0 the four-and-a-sleigh is about
// 180 local px, well over half the width a phone shows (270), which is where a
// moment starts being a parade — and 1.2 puts H's 82px span at 98, a bit over a
// third of that. It came back down from 1.7 with the candidate: H is the far,
// small, detailed one, and the whole argument for it is that its DRAWING does
// the work the size was being asked to do.
export const FROST_FLYPAST_SCALE = 1.2;

// AND A LITTLE MORE OF IT ON A PHONE, IN EITHER ORIENTATION.
//
// The frame keeps this object the same PHYSICAL size everywhere — that is what
// the portrait backdrop zoom is for — and physical parity is the correct default
// and not the same thing as the right answer. A phone screen is four inches of
// glass held at arm's length: the same team that reads across a desk is a speck
// on it, and the one thing this flypast has to do is be noticed in the couple of
// seconds it owns. So the gain is keyed to the DEVICE, not to the orientation —
// a phone held sideways has the same problem the same phone held upright does.
//
// It is a difference from FROST_FLYPAST_SCALE rather than a second scale, so the
// bake-off's sheets and the desk still show the size that was chosen there.
export const FROST_FLYPAST_PHONE_GAIN = 1.3;
export const flypastScaleFor = (phone) =>
  FROST_FLYPAST_SCALE * (phone ? FROST_FLYPAST_PHONE_GAIN : 1);

// THE LIGHT IT CARRIES.
//
// A dark team on a pale sky is a hole, and a hole in falling snow is what the
// first passes looked like. A glow does two jobs at once: it seats the object in
// the weather (something lit is something IN the air, not a sticker on it), and
// it is the only reason the eye goes to that corner of the sky at all while a
// celebration is running in the other one.
//
// Warm, because Act II has exactly one warm family — the fortress windows, the
// lead's nose and the hat's bobble — and a cold halo at the tape would open a
// second one on the last screen of the cabinet. It is painted UNDER the
// silhouette, ellipse-shaped around the whole team rather than a circle at the
// nose, and sized off the candidate's own `span` so the short ones are not
// wearing the four-and-a-sleigh's halo.
export const FLYPAST_GLOWS = {
  none:   null,
  // A breath of light, for the version that wants to stay weather.
  soft:   { color: '242,184,75', alpha: 0.16, pad: 26, ry: 0.46 },
  // The shipped one.
  warm:   { color: '242,184,75', alpha: 0.30, pad: 34, ry: 0.50 },
  // Everything a flypast can spend.
  bright: { color: '250,206,120', alpha: 0.46, pad: 44, ry: 0.56 },
  // The cold alternative, kept drawable because it was asked and answered.
  moon:   { color: '208,226,248', alpha: 0.34, pad: 38, ry: 0.52 },
};
export const FROST_FLYPAST_GLOW = 'warm';

// WHICH SIDE OF THE SNOW IT FLIES ON.
//
// 'front' puts it on the overlay, above the weather and the cast and below the
// HUD; 'behind' leaves it in the backdrop where the pack painted it, with the
// blizzard between it and the player. Behind is the physically true one and it
// is the one that lost: at the tape there are three full snow layers and a 34%
// veil in the way, and the object only gets one pass across the sky. In front,
// the same team at the same size is simply THERE — the snow still crosses it,
// because the flakes are drawn over the whole frame either way, but it is no
// longer being read through a fog it cannot win against.
export const FROST_FLYPAST_DEPTH = 'front';

// And how dark. See FLYPAST_PALETTES.
//
// It went DOWN the ladder twice and then back UP two, and the way back is the
// part worth remembering: the bottom rung was picked while the team was still
// being read through the blizzard's veil, and moving the flypast in FRONT of the
// snow took that veil away. Everything below this rung is now paying for
// legibility the depth change already bought.
//
// WHAT THE SHIPPED CANDIDATE ACTUALLY WEARS IS NOT THIS INK. H asks for the soft
// pair by name, so at this rung the animals are #4a6180 and their lit planes
// #6b86a3 — a rung lighter again than the number on this line. That is a
// property of the candidate, not of the ladder: swap FROST_FLYPAST to a flat
// candidate and the same rung lands two steps darker. Re-check the sweep after
// any change of candidate; do not carry a judgement across one.
export const FROST_FLYPAST_PALETTE = 'shadow';

// How far past each edge the flight starts and ends. DERIVED, not chosen: it is
// the shipped object's own reach plus a margin, so changing the candidate or the
// scale cannot leave half a sleigh parked on the edge of the frame — which is
// what a hand-set number risked twice while this was being tuned. The flight has
// to be fully GONE, not fully arrived.
export const FROST_FLYPAST_SPAN = Math.ceil(
  (FROST_SLEIGH_BY_ID[FROST_FLYPAST]?.span || 90) * FROST_FLYPAST_SCALE + 30);

/**
 * WHERE THE FLIGHT IS AT TIME `t`, or null once it is gone.
 *
 * One solver, two callers: the run flies it at the tape and the gallery flies it
 * on its cards, and a bake-off whose sheets fly a different path from the game
 * is a bake-off answering a question nobody asked. Everything is in the
 * backdrop's own local space — `left` is the left edge of the visible window,
 * `poleX` the mast the arc is aimed at, `arc` the two heights from
 * frostFlypastArc.
 */
export function flypastAt(t, { left = 0, right = 480, poleX = 480, arc } = {}) {
  const x0 = left - FROST_FLYPAST_SPAN;
  // u is 1 AT THE MAST and the flight carries on past it — that is the half of
  // the parabola that takes it off the right edge.
  const run = Math.max(1, poleX - x0);
  const u = (FROST_FLYPAST_SPEED * Math.max(0, t)) / run;
  const x = x0 + run * u;
  // Gone: clear of the right edge by its own length.
  if (x > right + FROST_FLYPAST_SPAN) return null;
  const drop = arc.start - arc.apex;            // positive: the climb, in px
  if (u <= 1) {
    // The climb: a parabola with its vertex on the mast, so the drawing is
    // level exactly as it passes over the finial.
    const d = 1 - u;
    return {
      u, x,
      y: arc.apex + drop * d * d,
      tilt: clampTilt(Math.atan2(-2 * drop * d, run)),
    };
  }
  // Past the crest: still rising, settling level. `v` is 0 at the mast and 1
  // when the extra rise is spent; both ends of the smoothstep are flat, so this
  // leaves the crest at the same slope the climb arrived on and arrives at level
  // without a corner either.
  const v = Math.min(1, (u - 1) / FROST_FLYPAST_LEVEL);
  return {
    u, x,
    y: arc.apex - FROST_FLYPAST_OVER * v * v * (3 - 2 * v),
    // d/dx of that: 6v(1-v), zero at both ends.
    tilt: clampTilt(Math.atan2(
      -FROST_FLYPAST_OVER * 6 * v * (1 - v) / FROST_FLYPAST_LEVEL, run)),
  };
}

// The path's angle, scaled by how much of it the drawing is allowed to take.
const clampTilt = (a) => Math.max(-FROST_FLYPAST_TILT_CAP,
  Math.min(FROST_FLYPAST_TILT_CAP, a * FROST_FLYPAST_TILT));

/**
 * Draw the shipped flypast. `x` is the LEAD ANIMAL'S NOSE and the team runs back
 * from it, so the whole object is off the left edge at x = left - SPAN and off
 * the right at x = right + SPAN.
 *
 * The palette is set for the duration of the draw and put back afterwards: this
 * is the only caller that changes it, and a painter that leaves module state
 * behind is a painter that re-inks the next thing on the frame.
 */
export function drawFrostFlypast(ctx, x, y, t, {
  id = FROST_FLYPAST,
  scale = FROST_FLYPAST_SCALE,
  palette = FROST_FLYPAST_PALETTE,
  // The backdrop's own magnification, for the caller that draws this OUTSIDE
  // the background transform. Flying in front of the snow means flying on the
  // overlay, which is screen space — so the zoom that portrait applies to the
  // whole backdrop has to be carried here by hand or the team arrives at the
  // right place in the sky at the wrong size. Landscape passes 1.
  zoom = 1,
  glow = FROST_FLYPAST_GLOW,
  // Radians, nose up. The flight is an arc and a climbing team drawn level is a
  // team being winched: the drawing has to point where it is going. Pivoted
  // about the NOSE, because the nose is the point the arc was solved for — the
  // tail hanging below the curve is what a team pulling uphill looks like.
  tilt = 0,
} = {}) {
  const cand = FROST_SLEIGH_BY_ID[id] || FROST_SLEIGH_BY_ID[FROST_FLYPAST];
  if (!cand) return;
  const s = scale * (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
  setFlypastPalette(palette);
  ctx.save();
  ctx.translate(x, y);
  if (tilt) ctx.rotate(tilt);
  if (s !== 1) ctx.scale(s, s);
  try {
    flypastGlow(ctx, cand, FLYPAST_GLOWS[glow]);
    cand.draw(ctx, 0, 0, t);
  } finally {
    ctx.restore();
    setFlypastPalette('sky');
  }
}

// The halo, in the object's own space: the nose is at 0 and the team runs back
// to -span, so the light is centred on the MIDDLE of that rather than on the
// lead, or a four-animal team wears its glow on its face.
//
// A radial gradient is a circle; this one has to be an ellipse or as much sky
// above and below the team lights up as the team does. Scaling the context is
// how a canvas draws an elliptical gradient, which is why the arc below is a
// plain circle of the full radius. `alpha` is the centre stop and the edge runs
// to zero — the falloff does the work and nothing here has a rim.
function flypastGlow(ctx, cand, spec) {
  if (!spec) return;
  const span = Number(cand.span) || 86;
  const r = span / 2 + spec.pad;
  ctx.save();
  ctx.translate(-span / 2, -2);
  ctx.scale(1, spec.ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(${spec.color},${spec.alpha})`);
  g.addColorStop(0.42, `rgba(${spec.color},${spec.alpha * 0.55})`);
  g.addColorStop(1, `rgba(${spec.color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
