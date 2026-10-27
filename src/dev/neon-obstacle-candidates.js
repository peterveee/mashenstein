// Gallery-only TERMINAL VELOCITY OBSTACLE concepts — ten things that stand, roll,
// hover or rise in the neon lane, drawn in the city's own hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets (except cardboard) and recommend new items or
// replacements that fit in more with their style".
//
// WHAT NEON DEALS. The cabinet already swaps the worst of the shared bank
// (data/cabinets.js, `swaps`): no cactus ever reaches this road — it comes down as
// the road-works panda, frog or monkey, a crate, a spike plate or a cone — and no
// songbird reaches this sky; it is a drone or a target. What is left:
//
//   * the wooden X CRATE — the commonest ground read here (four BASE patterns plus
//     the cactus fallbacks), out of a western warehouse;
//   * the wooden BARREL (tier 2) and the rusty oil-drum FIRE BARREL — a hobo fire
//     on a viaduct of glass and light;
//   * the grey SPIKE PLATE, FLOOR SAW and RAZOR HURDLE — Plumber's and Speed's
//     factory floor, steel-grey on a violet night;
//   * the red-and-white archery BULLSEYE in the air — the very thing neon-1's
//     DESTROY 5 TARGETS mission is about, and a fairground prop;
//   * the purple capsule DRONE and its armed twin — half of every neon level's
//     hazards, generic, and purple on purple.
//
// What fits stays: the traffic cone and the three road-works animals (Peter's picks,
// 24 Sep, src/dev/neon-street-candidates.js) are a Tokyo street, and the animals
// have their own sheet. Not re-proposed: the vending machine and the red lantern
// (turned down in that round), and the Tokyo ideas sheet's daruma, lucky cat,
// crossing arm, tanuki, paper crane and lantern ghost (neon-japan-ideas.js).
//
// THE HAND. Everything behind the lane is neon tube — wireframe towers, the moon,
// Tokyo Tower — and the one foreground object the cabinet drew for itself, the
// train (sprites/train.js), is a dark hull with a tube contour and a white-hot
// core. So: flat bodies in one ink at one weight with one lit sliver and one shade
// band — the street barriers' hand — and the LIGHT on each thing is tube: a faint
// wide stroke, the colour, a white-hot core. The light that says danger is RED:
// the backdrop owns cyan, magenta and the coin amber (the scenery sheet's rule: "a
// fourth hue in the backdrop is a hue the player has to learn is not a pickup"),
// and the guide teaches RED = AVOID. Cyan appears only as a small detail (a fan
// ring, a card reader) and never carries the read.
//
// TWO SKIES. neon-1 opens in cut-paper GOLDEN HOUR — peach, bright, the tube glow
// switched off — and turns to night on the strike; obstacles are rasters and do
// not change with it. So every body is dark-inked to stand off the peach, and
// every one carries enough lit red to stand off the night. The three strips are
// that day (the city still arriving: Fuji and the far mass), the night it turns
// into, and neon-3's night under Tokyo Tower.
//
// THE COORDINATES. See obstacle-bakeoff-kit.js: each painter fills its PAINTED
// ENVELOPE in world units with the ground at y = h, `t` quantised to its own frame
// ring. Porting is a 3/4 scale into sprites/props.js. No glow here composites with
// 'lighter': a prop is rastered onto a transparent canvas, where an additive pass
// comes out as plain alpha, so the sheet paints what the run would. The run also
// lays the pack's magenta bloom round every prop (neonPack.decorate); the sheet
// leaves it off, as the control does. All self-outlined: a port joins
// SELF_OUTLINED_PROPS and skips the shared hazard rim.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';
import { NEON_GOLDEN_MOOD, neonNightMood } from '../engine/stylePacks/index.js';

import {
  TAU, INK, LW, LWI, LWF, RED, RED_DK, RED_HOT, CYAN, LAMP, WHITE, CAB, CAB_LT, CAB_DK, HULL, HULL_LT, HULL_DK, STEEL, STEEL_LT, STEEL_DK, SLATE, SLATE_LT, SLATE_DK, TYRE, TYRE_LT, CREAM, CREAM_LT, CREAM_DK, ARC, pen, fillStroke, box, rbox, circ, ell, poly, line, rr, disc, body, whiteHot, tube, hash, sparks,
  runawayWheel, jacobsLadder, risingBollards, laserFan,
} from '../sprites/neonProps.js';

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — SPEAKER STACK (stack 16x15). Black PA cabinets with a red LED ring round the
// woofer: the cone kicks on every beat (two to the ring, 150 bpm, the neon song's
// tempo) and the ring flares with it. Stacks two high like a sound system.
const KICK = [1, 0.5, 0.18, 0, 1, 0.5, 0.18, 0];
function speakerStack(c, w, h, t) {
  const f = frameOf(t, 8, 10);
  const kick = KICK[f];
  const g = h - 0.2;
  const X0 = 1.0, X1 = 15.0, Y0 = 0.6;
  body(c, rr(X0, Y0, X1 - X0, g - Y0, 0.9), CAB, (p) => {
    box(p, X1 - 1.7, 0, 2, h, CAB_DK);
    box(p, X0, Y0, X1 - X0, 0.9, CAB_LT);
    box(p, X0 + 0.5, Y0 + 1.2, 0.7, g - Y0 - 2.4, CAB_LT);
  });
  // Steel corner guards, the road-case kind.
  for (const [x, y, sx, sy] of [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, g, 1, -1], [X1, g, -1, -1]]) {
    poly(c, [x, y, x + 2.3 * sx, y, x + 2.3 * sx, y + 0.8 * sy, x + 0.8 * sx, y + 0.8 * sy,
      x + 0.8 * sx, y + 2.3 * sy, x, y + 2.3 * sy], STEEL, INK, LWF);
  }
  // The horn tweeter, and the power lamp.
  rbox(c, 4.2, 2.0, 7.6, 2.8, 1.3, '#2c2848', INK, LWI);
  line(c, 5.6, 3.4, 10.4, 3.4, INK, 0.5);
  circ(c, 13.0, 2.6, 0.55, kick > 0.4 ? LAMP : RED_DK, INK, LWF);
  // The woofer: surround, the LED ring outside it, the cone and the dust cap.
  const cx = 8, cy = 9.6;
  circ(c, cx, cy, 4.5, '#0a0916', INK, LWI);
  tube(c, RED, 0.85, (p) => p.arc(cx, cy, 4.75, 0, TAU), 0.45 + 0.55 * kick, 0.3);
  const rc = 3.5 * (1 + 0.08 * kick);
  body(c, disc(cx, cy, rc), '#3b3760', (p) => {
    circ(p, cx - rc * 0.35, cy - rc * 0.35, rc * 0.8, '#57527f');
    circ(p, cx + rc * 0.1, cy + rc * 0.1, rc * 0.78, '#3b3760');
  }, INK, LWI);
  circ(c, cx, cy, 1.35 * (1 + 0.12 * kick), '#1b1930', INK, LWF);
  circ(c, cx - 0.45, cy - 0.45, 0.35, 'rgba(255,255,255,0.55)');
}

// F — LASER TRIPWIRE (hurdle 21x12). Two chrome emitter posts and two red beams
// strung between them — the security fence of a city that can afford lasers. A
// pulse runs down each beam from the emitter to the catcher, and the cap lamps blink.
// Armoured, as the razor hurdle is: you clear it, you do not shoot it.
function laserTripwire(c, w, h, t) {
  const f = frameOf(t, 8, 12);
  const g = h - 0.2;
  const PX = [2.6, 18.4];
  const BEAMS = [3.6, 7.2];
  const x0 = PX[0] + 1.2, x1 = PX[1] - 1.2;
  for (const px of PX) {
    rbox(c, px - 2.3, g - 1.1, 4.6, 1.1, 0.4, CAB, INK, LWI);
    body(c, rr(px - 1.2, 1.0, 2.4, g - 1.0 - 1.0, 0.6), STEEL, (p) => {
      box(p, px + 0.3, 0, 1.2, h, STEEL_DK);
      box(p, px - 0.9, 1.6, 0.5, g - 3.2, STEEL_LT);
    });
    rbox(c, px - 1.5, 0.4, 3.0, 1.4, 0.5, CAB, INK, LWI);
    circ(c, px, 1.1, 0.42, (f + (px > 10 ? 4 : 0)) % 8 < 2 ? LAMP : RED_DK);
  }
  // The beams, then the pulse riding each one.
  for (const [i, y] of BEAMS.entries()) {
    tube(c, RED, 0.6, (p) => { p.moveTo(x0, y); p.lineTo(x1, y); }, 1, 0.34);
    const u = ((f + i * 4) % 8) / 8;
    const px = x0 + (x1 - x0) * u;
    line(c, Math.max(x0, px - 1.6), y, Math.min(x1, px + 0.6), y, RED_HOT, 0.75);
  }
  // The lens housings, facing in.
  for (const [px, s] of [[PX[0], 1], [PX[1], -1]]) {
    for (const y of BEAMS) {
      rbox(c, px + s * 0.6 - (s < 0 ? 1.1 : 0), y - 0.85, 1.1, 1.7, 0.3, CAB, INK, LWF);
      circ(c, px + s * 1.2, y, 0.5, RED, INK, 0.15);
    }
  }
}

// G — TICKET GATE (hurdle 21x12, a solid cabinet — no split feet). The station
// barrier every Tokyo commuter has walked into: seen three-quarter, the near
// cabinet, the far one behind it, a blue card reader on top. The entry lamp flips
// from a cyan arrow to a red X and the red flaps SLAM shut across the passage, hold,
// and drop. This is TERMINAL VELOCITY: the hero does not have a ticket.
const GATE_SLOT = Object.freeze({ box: [16, 9], tall: 1, name: 'SHORT HURDLE (solid)', was: 'boomBarrier — 16x9, jump, armoured' });
function ticketGate(c, w, h, t) {
  const f = frameOf(t, 12, 8);
  const shut = [0, 0, 0, 0.6, 1, 1, 1, 1, 1, 0.55, 0.15, 0][f];
  const g = h - 0.2;
  const DX = 2.6, DY = -2.8;           // the passage: the far cabinet's offset into depth
  const X0 = 0.4, X1 = 17.6, TOP = 5.4;
  // The far cabinet: only its wall over the passage and its roof show above the near one.
  poly(c, [X0 + DX, TOP + DY, X1 + DX, TOP + DY, X1 + DX, g + DY, X0 + DX, g + DY], CREAM_DK, INK, LWI);
  box(c, X0 + DX, TOP + DY, X1 - X0, 1.2, CREAM, INK, LWF);
  // The flaps: a wing out of each cabinet's wall, rising out of the passage and
  // leaning in until they meet over it — the far one darker, set back. Seen side-on
  // a real flap is edge-on and invisible, so these are turned to face the camera.
  if (shut > 0) {
    const lift = 2.7 * shut;
    for (const [x, y, lean, fill] of [[14.6, TOP - 1.3, -0.14, RED_DK], [11.0, TOP + 0.3, 0.14, RED]]) {
      c.save();
      c.translate(x, y);
      c.rotate(lean);
      rbox(c, -2.0, -lift, 4.0, lift + 2.2, [1.4, 1.4, 0, 0], fill, INK, LWI);
      line(c, -1.3, -lift + 0.6, 1.3, -lift + 0.6, WHITE, 0.45);
      c.restore();
    }
  }
  // The near cabinet.
  body(c, rr(X0, TOP, X1 - X0, g - TOP, 0.6), CREAM, (p) => {
    box(p, X0, g - 1.6, X1 - X0, 1.6, CREAM_DK);
    box(p, X0 + 0.6, TOP + 1.2, X1 - X0 - 1.2, 0.6, CREAM_LT);
    box(p, X1 - 1.2, 0, 2, h, CREAM_DK);
  });
  // The blue panel down its side.
  rbox(c, 6.0, TOP + 2.2, 8.4, 2.0, 0.4, '#2f4fb8', INK, LWF);
  line(c, 7.0, TOP + 3.2, 13.4, TOP + 3.2, '#7d95f2', 0.3);
  // The card reader on the roof at the entry end, lit.
  poly(c, [1.4, TOP, 2.2, TOP - 1.6, 6.4, TOP - 1.6, 6.0, TOP], '#20203c', INK, LWI);
  tube(c, CYAN, 0.45, (p) => { p.moveTo(2.6, TOP - 0.9); p.lineTo(5.6, TOP - 0.9); }, 0.7, 0.3);
  // The entry lamp, on the end facing the hero: arrow while open, red X when shut.
  rbox(c, 1.2, TOP + 1.0, 3.6, 3.0, 0.4, INK, INK, LWF);
  if (shut > 0.5) {
    tube(c, RED, 0.5, (p) => {
      p.moveTo(2.2, TOP + 1.7); p.lineTo(3.8, TOP + 3.3);
      p.moveTo(3.8, TOP + 1.7); p.lineTo(2.2, TOP + 3.3);
    }, 1, 0.35);
  } else {
    tube(c, CYAN, 0.45, (p) => {
      p.moveTo(2.0, TOP + 2.5); p.lineTo(4.0, TOP + 2.5);
      p.moveTo(3.2, TOP + 1.8); p.lineTo(4.0, TOP + 2.5); p.lineTo(3.2, TOP + 3.2);
    }, 0.8, 0.3);
  }
}

// H — HOLO TARGET (skyTarget 16x15 at alt 40). The bullseye as this city would
// float one: a dark disc of glass with red and white tube rings, a reticle whose
// four ticks turn, scanlines falling through it, and the little projector puck under
// it throwing the cone of light that holds it up. One frame in eight it glitches.
function holoTarget(c, w, h, t) {
  const f = frameOf(t, 8, 10);
  const cx = w / 2, cy = 5.9, R = 5.2;
  const glitch = f === 5 ? 0.7 : 0;
  // The projector's cone, from the puck's lens up into the disc.
  const lens = h - 2.3;
  poly(c, [cx - 0.7, lens, cx + 0.7, lens, cx + 3.6, cy + 2.4, cx - 3.6, cy + 2.4], 'rgba(255,90,122,0.3)');
  for (const s of [-1, 1]) line(c, cx + s * 0.7, lens, cx + s * 3.6, cy + 2.4, 'rgba(255,160,180,0.55)', 0.22);
  // The puck.
  ell(c, cx, h - 1.3, 2.7, 0.95, CAB, INK, LWI);
  box(c, cx - 2.1, h - 1.3, 4.2, 0.45, CAB_DK);
  circ(c, cx, lens, 0.5, LAMP, INK, LWF);
  c.save();
  c.translate(glitch, 0);
  // The disc of glass, so the rings stand off a peach sky as well as a night one.
  circ(c, cx, cy, R, 'rgba(26,12,44,0.82)', INK, LWI);
  c.save();
  c.beginPath();
  c.arc(cx, cy, R, 0, TAU);
  c.clip();
  for (let y = cy - R + ((f * 0.5) % 1.5); y < cy + R; y += 1.5) line(c, cx - R, y, cx + R, y, 'rgba(255,208,216,0.12)', 0.35);
  c.restore();
  tube(c, RED, 0.85, (p) => p.arc(cx, cy, R - 0.9, 0, TAU), glitch ? 0.6 : 1, 0.3);
  tube(c, '#ffe8ec', 0.6, (p) => p.arc(cx, cy, R - 2.5, 0, TAU), glitch ? 0.5 : 0.9, 0.25);
  tube(c, RED, 0.75, (p) => p.arc(cx, cy, R - 3.9, 0, TAU), 1, 0.3);
  circ(c, cx, cy, 0.75, WHITE);
  // The reticle's four ticks, a sixteenth of a turn to the ring.
  const spin = (f / 8) * (TAU / 4);
  for (let k = 0; k < 4; k++) {
    const a = spin + (k / 4) * TAU;
    tube(c, RED, 0.5, (p) => {
      p.moveTo(cx + Math.cos(a) * (R - 0.2), cy + Math.sin(a) * (R - 0.2));
      p.lineTo(cx + Math.cos(a) * (R + 0.6), cy + Math.sin(a) * (R + 0.6));
    }, 1, 0.3);
  }
  c.restore();
}

// I — SCANNER DRONE (low 22x13). The workhorse redrawn in the train's hull: a flat
// black-violet body, two ducted fans with cyan blur, a red underglow, and across its
// face the red scanner bar — a light that runs left and right and leaves a tail. The
// machine LOOKS for you. Slide under it.
function droneHull(c, f) {
  // Fans: a duct seen edge-on at each shoulder, its blur turning.
  for (const x of [5.0, 17.0]) {
    ell(c, x, 3.4, 3.6, 1.05, CAB, INK, LWI);
    const k = (f % 4) / 4;
    line(c, x - 2.8 + k * 1.4, 3.2, x + 0.4 + k * 1.4, 3.2, 'rgba(56,216,248,0.9)', 0.45);
    tube(c, CYAN, 0.35, (p) => p.ellipse(x, 3.4, 3.6, 1.05, 0, 0, TAU), 0.55, 0.2);
    box(c, x - 0.45, 4.2, 0.9, 1.4, CAB_DK, INK, LWF);
  }
  // The body.
  body(c, (p) => {
    p.moveTo(2.4, 6.8);
    p.lineTo(4.4, 5.2);
    p.lineTo(17.6, 5.2);
    p.lineTo(19.6, 6.8);
    p.lineTo(18.2, 10.6);
    p.lineTo(3.8, 10.6);
    p.closePath();
  }, HULL, (p) => {
    box(p, 0, 5.2, 22, 1.2, HULL_LT);
    box(p, 0, 9.4, 22, 1.4, HULL_DK);
  });
  // The underglow: a red tube along the belly and the light it throws down, which
  // is what lifts a dark hull off a dark city — and says it is hovering.
  ell(c, 11, 11.9, 6.6, 1.0, 'rgba(255,46,77,0.2)');
  tube(c, RED, 0.5, (p) => { p.moveTo(4.6, 10.75); p.lineTo(17.4, 10.75); }, 0.9, 0.35);
}
function scannerBar(c, f, n) {
  // A ping-pong across the bar, with a two-step tail.
  const pos = (k) => {
    const m = ((k % (2 * n - 2)) + (2 * n - 2)) % (2 * n - 2);
    return m < n ? m : 2 * n - 2 - m;
  };
  const X0 = 5.0, X1 = 17.0, Y = 7.9;
  rbox(c, X0 - 0.6, Y - 1.0, X1 - X0 + 1.2, 2.0, 0.9, '#0c0618', INK, LWF);
  const cell = (X1 - X0) / (n - 1);
  for (let k = 0; k < n; k++) box(c, X0 + k * cell - 0.5, Y - 0.35, 1.0, 0.7, RED_DK);
  for (const [lag, a] of [[2, 0.3], [1, 0.6], [0, 1]]) {
    const x = X0 + pos(f - lag) * cell;
    tube(c, RED, 0.95, (p) => { p.moveTo(x - 0.5, Y); p.lineTo(x + 0.5, Y); }, a, 0.35);
  }
}
function scannerDrone(c, w, h, t) {
  const f = frameOf(t, 12, 14);
  droneHull(c, f);
  scannerBar(c, f, 7);
}

// J — SCANNER GUNSHIP (shooter 22x13 at alt 44). I armed, by construction, the way
// the shipped shooter is the workhorse with a muzzle: the same hull and scanner, a
// red patrol beacon turning on its back and a ball turret slung under it, its
// barrel tracking down toward the lane.
const GUNSHIP_RISE = 1.6;
function scannerGunship(c, w, h, t) {
  const f = frameOf(t, 12, 14);
  c.save();
  c.translate(0, -GUNSHIP_RISE);
  // The turret, slung under the hull, its barrel tracking down to the left.
  const a = Math.PI * 0.64 + Math.sin((f / 12) * TAU) * 0.16;
  const TX = 11, TY = 10.9, BL = 3.4;
  const mx = TX + Math.cos(a) * BL, my = TY + Math.sin(a) * BL;
  line(c, TX, TY, mx, my, INK, 1.35);
  line(c, TX, TY, mx, my, STEEL, 0.6);
  droneHull(c, f);
  body(c, disc(TX, TY, 1.8), CAB, (p) => circ(p, TX - 0.6, TY - 0.6, 1.1, CAB_LT), INK, LWI);
  circ(c, TX - 0.5, TY + 0.2, 0.45, RED, INK, 0.15);
  circ(c, mx, my, 0.5, f % 6 === 0 ? RED_HOT : RED, INK, 0.15);
  scannerBar(c, f, 7);
  // The beacon on its back, between the fans: a red dome, its beam swinging round.
  const sw = Math.cos((f / 12) * TAU);
  if (Math.abs(sw) > 0.3) {
    poly(c, [11 + sw * 0.6, 3.9, 11 + sw * 5.2, 2.2, 11 + sw * 5.2, 5.0], 'rgba(255,46,77,0.38)');
  }
  rbox(c, 9.7, 3.0, 2.6, 2.2, [1.3, 1.3, 0, 0], RED, INK, LWI);
  circ(c, 11 + sw * 0.6, 3.9, 0.5, RED_HOT);
  c.restore();
}

// ============================================================== the sheet
export const BAKEOFF = {
  cabinet: 'neon',
  title: 'TERMINAL VELOCITY — obstacles for the neon city (bake-off)',
  note: 'Neon already swaps out the cactus and the songbird; what is left is the shared factory bank — a wooden X crate (the commonest thing on this road), a wooden barrel, an oil-drum fire, the grey spike plate, saw and razor hurdle — plus a fairground bullseye for the cabinet\'s own target mission and a generic purple drone on a purple night. '
    + 'The cone and the road-works animals fit and stay. '
    + 'Ten replacements in the city\'s hand — inked flat bodies, red tube light, white-hot cores — so each stands off neon-1\'s golden paper sky and the night it turns into. Pick letters.',
  // One strip of the real frame per entry. neon-1 opens in the golden hour (the city
  // still arriving behind Fuji) and turns to night on the strike; neon-3 is the
  // aurora night (the curtains hang above the lane crop) with Tokyo Tower centre
  // stage. Progress is pinned so the scroll does not walk a strip through the
  // arrival or past the tower.
  strips: [
    { label: 'TERMINAL VELOCITY 1 · GOLDEN HOUR', stageIndex: 1, camX: 300, bc: { neonMood: NEON_GOLDEN_MOOD, progress: 0.09 } },
    { label: 'TERMINAL VELOCITY 1 · NIGHT', stageIndex: 1, camX: 1800, bc: { progress: 0.3 } },
    { label: 'TERMINAL VELOCITY 3 · TOWER', stageIndex: 3, camX: 2950, bc: { neonMood: neonNightMood(1), progress: 0.5 } },
  ],
  // The detail row's panels: golden hour's lane sky, the night, and the road.
  swatches: [
    { sky: '#ffd49a', ground: '#fff0c8', under: '#2a1e3a', ink: 'rgba(20,16,30,.55)' },
    { sky: '#1a1048', ground: '#38d8f8', under: '#0c0c20' },
    { sky: '#0a0a2a', ground: '#38d8f8', under: '#0c0c20' },
  ],
  // What the cabinet actually deals today (after its swaps), through the real run
  // painter: [type, x]. The hero runs at x 50..72.
  control: [['crate', 2], ['popSpikes', 18], ['trafficCone', 36], ['barrel', 78], ['boomBarrier', 96],
    ['floorSaw', 118], ['fireBarrel', 138], ['pandaBarrier', 158], ['crate', 178],
    ['drone', 120], ['target', 150], ['shooterDrone', 196]],
  candidates: [
    { letter: 'A', id: 'speakerStack', name: 'SPEAKER STACK', slot: 'stack', paint: speakerStack,
      note: 'Black PA cabinets in road-case corners, a red LED ring round each woofer. The cone kicks twice a ring — 150 bpm, the song\'s tempo — and the ring flares with it. Replaces the wooden crate; stacks two high.' },
    { letter: 'B', id: 'runawayWheel', name: 'RUNAWAY WHEEL', slot: 'barrel', paint: runawayWheel,
      note: 'A wheel off a light-bike: black tyre, a red light ring in the rim, white-hot hub, sparks off the contact patch. Round, so the barrel\'s roll spin is exactly right for it. Replaces the wooden barrel.' },
    { letter: 'C', id: 'jacobsLadder', name: 'JACOB\'S LADDER', slot: 'fire', paint: jacobsLadder,
      note: 'The warm one, made live: a roadside power cabinet with a HIGH VOLTAGE plate and glowing vents, and an arc climbing the V of rods on its roof, snapping at the top. Shootable. Replaces the oil-drum fire.' },
    { letter: 'D', id: 'risingBollards', name: 'RISING BOLLARDS', slot: 'floor', paint: risingBollards,
      note: 'Three security bollards pumping up out of the road a beat apart, red LED crowns, reflective bands — never below the box. Replaces the spike plate (and could take the saw\'s turns too).' },
    { letter: 'E', id: 'laserFan', name: 'LASER FAN', slot: 'saw', paint: laserFan,
      note: 'The saw\'s half-disc made of light: an emitter dome in the road throwing a fan of red beams that sweeps a ray a ring. The boss\'s lasers, finally on the floor. Replaces the floor saw.' },
    { letter: 'F', id: 'laserTripwire', name: 'LASER TRIPWIRE', slot: 'hurdle', paint: laserTripwire,
      note: 'Two chrome emitter posts and two red beams between them, a pulse running down each, cap lamps blinking. Armoured, as the razor hurdle is. Replaces the razor hurdle.' },
    { letter: 'G', id: 'ticketGate', name: 'TICKET GATE', slot: GATE_SLOT, paint: ticketGate,
      note: 'The station barrier, three-quarter on: cream cabinets, a blue card reader, and the entry lamp flips to a red X as the red flaps slam shut, hold and drop. The hero has no ticket. Replaces the razor hurdle; solid, so no split feet.' },
    { letter: 'H', id: 'holoTarget', name: 'HOLO TARGET', slot: 'skyTarget', paint: holoTarget,
      note: 'The bullseye as this city floats one: a dark glass disc with red and white tube rings, a turning reticle, falling scanlines, and the projector puck underneath holding it up. Glitches one frame in eight. Replaces the archery target.' },
    { letter: 'I', id: 'scannerDrone', name: 'SCANNER DRONE', slot: 'low', paint: scannerDrone,
      note: 'The workhorse in the train\'s hull: flat black-violet body, two ducted fans, a red underglow, and a red scanner light running across its face with a tail. Slide under. Replaces the purple drone.' },
    { letter: 'J', id: 'scannerGunship', name: 'SCANNER GUNSHIP', slot: 'shooter', paint: scannerGunship,
      note: 'I, armed — as the shipped shooter is the workhorse with a muzzle: a red patrol beacon turning on its back and a ball turret whose barrel tracks down at the lane. Replaces the shooter drone.' },
  ],
};

export { frameOf };
