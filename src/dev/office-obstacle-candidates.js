// Gallery-only CORPORATE KOMBAT OBSTACLE concepts — twenty things that stand,
// roll, hang or lie in the lane of THE CLIMB, drawn in the LIGNE ’89 hand.
//
// THE COMPLAINT (12 Oct 2026). Peter: "we need significantly better obstacles
// for the corporate cabinets. almost none of the ones we have work anymore".
// The office now ships as the lit Ligne ’89 climb (stylePacks/officeLigne), and
// what stands in front of it was drawn for the old graph-paper doodle:
//
//   * most of the bank is BASE_PATTERNS (data/cabinets.js) — a desert cactus,
//     a wooden crate, a rotor drone and a songbird, on floor 88 of a tower;
//   * the office's own four (chair, printer, paperwork, fireBarrel) are small,
//     grey and soft-edged in front of a room drawn in clean ink and flat colour,
//     and the printer is pale grey on a pale grey floor;
//   * the chair is `roll: true`, so the run spins the whole sprite like a
//     barrel (draw.js, the roll branch) — an office chair cartwheeling.
//
// THE BRIEF. Twenty office objects of 1986-89, each assigned to a slot the
// lane already deals, so a winner is a swap rather than a new mechanic. Every
// slot keeps its box, tier and answer — the cactus slot is still a 13x12 jump,
// the crate slot still stacks, the drone slot is still a slide. Only the
// drawing is on trial. Two slots are new to the office (the kickable sign and
// the floor plate); both already exist elsewhere in the game.
//
// THE HAND. Ligne claire, as the room behind: one ink (#1f1d26) at one weight
// for outlines, flat fills, one flat lit sliver and one flat shade band per
// body, no gradients, no blur. Hazards are SATURATED where the room is pastel —
// M89 red, cobalt, lemon, teal, black — because the three floors run from
// near-white marble (8-1) through lilac carpet (8-2) to violet lacquer (8-3),
// and a hazard has to stand off all three in one skin. Self-outlined, so a port
// joins SELF_OUTLINED_PROPS and skips the shared hazard rim.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units —
// box x 4/3, height x PROP_TALL, the size drawWorldEntity draws a prop at —
// with the ground line at y = h. `slotEnvelope()` derives it. Porting means
// copying a body into sprites/props.js under ctx.scale(w / W, h / H), since
// props.js painters receive the box-x-tall size and the run stretches by 4/3.
// `t` is quantised to each candidate's own frame ring at its own fps, as the
// shipped prop ring would, so nothing flatters itself with 60fps smoothness.
//
// ROLLERS RIDE UPRIGHT. All four roll on casters; none of them should
// cartwheel. A port adds an upright glide path beside the barrel's rotation.
//
// Nothing here is registered in any gameplay registry.
import { GROUND_Y } from '../engine/camera.js';
import { drawSoftContactShadow } from '../engine/shadows.js';
import { box, poly, line, lines, circ, ell, rbox, rrPath, pen, fs } from '../engine/stylePacks/officeLigne/line.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity } from '../game/draw.js';
import { drawOfficeProductionScene } from './office-production.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
const INK = '#1f1d26';
const LW = 0.55; // outline
const LWI = 0.32; // interior line
const LWF = 0.2; // fine line
const RED = '#e0203a', RED_DK = '#a3162c', RED_LT = '#ff6a76';
const COBALT = '#3f5fd8', COBALT_DK = '#2b3f9c', COBALT_LT = '#7d95f2';
const LEMON = '#f6df4a', LEMON_DK = '#d1ae1c', LEMON_LT = '#fff4a6';
const PINK = '#ff6fae', PINK_DK = '#d8458a';
const TEAL = '#2fbcb0', TEAL_DK = '#1f8a82', TEAL_LT = '#86e3d9';
const LILAC = '#b39ae6';
const ORANGE = '#ff8a3d';
const BEIGE = '#ece2c8', BEIGE_DK = '#cbbd98', BEIGE_LT = '#fbf6e8';
const STEEL = '#c9ced8', STEEL_DK = '#8e95a4', STEEL_LT = '#f2f4f8';
const CHAR = '#3a3846', CHAR_DK = '#2a2833';
const PAPER = '#ffffff', PAPER_DK = '#e2dee8';
const CARD = '#d99a5c', CARD_DK = '#b07440', CARD_LT = '#efbd85';
const LEAF = '#2f8a52', LEAF_DK = '#1d6038', LEAF_LT = '#66bf7c';
const BRASS = '#d9ae45', BRASS_DK = '#a37a22', BRASS_LT = '#f7e08a';
const MARBLE = '#f5f1eb', MARBLE_DK = '#d5cdc3';
const PHOSPHOR = '#5dff8f';

// ------------------------------------------------------------------ helpers
const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

// A flat body: fill the path, draw its light and shade bands clipped inside it,
// then ink the outline over both — the one move every object on this sheet makes.
function body(c, path, fill, inner = null, ink = INK, lw = LW) {
  c.save();
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (inner) { c.clip(); inner(c); }
  c.restore();
  c.beginPath();
  path(c);
  pen(c, ink, lw);
  c.stroke();
}

const rr = (x, y, w, h, r) => (p) => rrPath(p, x, y, w, h, r);
const rect = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const shape = (pts) => (p) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
};

function topRoundPath(p, x, y, w, h, r) {
  p.moveTo(x, y + h);
  p.lineTo(x, y + r);
  p.arcTo(x, y, x + r, y, r);
  p.lineTo(x + w - r, y);
  p.arcTo(x + w, y, x + w, y + r, r);
  p.lineTo(x + w, y + h);
  p.closePath();
}

// A caster seen side-on: tyre, hub, and a spoke mark that turns with the ring.
function caster(c, x, y, r, f, n = 8) {
  circ(c, x, y, r, INK);
  circ(c, x, y, r * 0.42, STEEL_DK);
  const a = (f / n) * TAU;
  circ(c, x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66, r * 0.2, STEEL_LT);
}

// The flat four-point glint the Ligne pack puts on glass and chrome.
function glint(c, x, y, s, col = '#ffffff') {
  if (s <= 0) return;
  poly(c, [x, y - s, x + s * 0.28, y - s * 0.28, x + s, y, x + s * 0.28, y + s * 0.28,
    x, y + s, x - s * 0.28, y + s * 0.28, x - s, y, x - s * 0.28, y - s * 0.28], col);
}

// A lens-shaped leaf with its lit half flat-filled lighter and a midrib.
function bladeLeaf(c, x, y, len, wid, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const tx = x + ca * len, ty = y + sa * len;
  const mx = x + ca * len * 0.5, my = y + sa * len * 0.5;
  let nx = -sa * wid * 1.3, ny = ca * wid * 1.3;
  if (ny > 0) { nx = -nx; ny = -ny; } // +n is the upper (lit) side
  const path = (p) => {
    p.moveTo(x, y);
    p.quadraticCurveTo(mx + nx, my + ny, tx, ty);
    p.quadraticCurveTo(mx - nx, my - ny, x, y);
  };
  body(c, path, LEAF, (p) => {
    p.beginPath();
    p.moveTo(x, y);
    p.quadraticCurveTo(mx + nx, my + ny, tx, ty);
    p.closePath();
    p.fillStyle = LEAF_LT;
    p.fill();
  }, INK, LWI);
  line(c, x, y, x + ca * len * 0.86, y + sa * len * 0.86, LEAF_DK, 0.24);
}

// Flat-shape flames: outlined red tongues, then orange and lemon cores with no ink.
function flames(c, cx, base, f, n = 8, scale = 1) {
  const p = (f / n) * TAU;
  const tongue = (x, w, hgt, ph, fill, ink) => {
    const tip = cx + (x + Math.sin(p * 2 + ph) * 1.1) * scale;
    const hh = hgt * scale * (0.84 + 0.16 * Math.sin(p * 3 + ph * 1.7));
    const x0 = cx + (x - w) * scale, x1 = cx + (x + w) * scale;
    c.beginPath();
    c.moveTo(x0, base);
    c.quadraticCurveTo(x0 + w * 0.15 * scale, base - hh * 0.62, tip, base - hh);
    c.quadraticCurveTo(x1 - w * 0.15 * scale, base - hh * 0.62, x1, base);
    c.closePath();
    fs(c, fill, ink, ink ? LWI : 0);
  };
  tongue(-3.4, 2.4, 7.6, 0.0, RED, INK);
  tongue(3.1, 2.5, 8.6, 1.3, RED, INK);
  tongue(0, 3.4, 12.4, 2.4, RED, INK);
  tongue(-2.1, 1.7, 5.2, 0.8, ORANGE);
  tongue(1.9, 1.8, 6.4, 2.0, ORANGE);
  tongue(-0.1, 2.2, 8.8, 3.1, ORANGE);
  tongue(0.1, 1.3, 4.8, 1.7, LEMON);
}

// --------------------------------------------------------------- the slots
// Each slot is a box and an answer the office bank already deals (or, for the
// two marked NEW, one another cabinet deals). `tall` and `visual` are the
// shipped PROP_TALL / PROP_VISUAL_SCALE for the prop the slot is named after.
export const OFFICE_OBSTACLE_SLOTS = Object.freeze({
  stand: { box: [13, 12], tall: 1.55, name: 'STANDING', was: 'cactus — 13x12, jump, breakable' },
  big: { box: [17, 14], tall: 1.4, name: 'BIG STANDING', was: 'cactusBig — 17x14, jump, breakable' },
  fire: { box: [13, 13], tall: 1.7, name: 'THE WARM ONE', was: 'fireBarrel — 13x13, jump, shootable' },
  cone: { box: [10, 13], tall: 1, name: 'KICKABLE', was: 'NEW to office — the traffic cone’s 10x13 jump, punt: true' },
  stack: { box: [12, 11], tall: 1, name: 'STACKS', was: 'crate — 12x11, jump, stacks two high', stack: true },
  roll: { box: [12, 10], tall: 1, name: 'ROLLS AT YOU', was: 'chair — 12x10, jump, vx −34, punt' },
  hurdle: { box: [16, 9], tall: 1, name: 'SHORT HURDLE', was: 'boomBarrier — 16x9, jump, armoured', splitFeet: true },
  floor: { box: [15, 7], tall: 1.75, name: 'IN THE FLOOR', was: 'NEW to office — popSpikes’ 15x7 bedded plate', bedded: true },
  target: { box: [12, 7], tall: 1, name: 'SHOOTS BACK', was: 'printer — 12x7, shoots, the DESTROY 5 PRINTERS target', target: true },
  high: { box: [12, 7], alt: 34, visual: 1.35, name: 'HIGH FLYER', was: 'buzzbird — 12x7 at alt 34, punishes the jump' },
  low: { box: [12, 7], alt: 13, artLift: 6, visual: 1.35, name: 'SLIDE UNDER', was: 'drone / paperwork — 12x7 at alt 13, slide' },
});

// The painted envelope for a candidate: drawWorldEntity's box x 4/3, x PROP_TALL
// (bottom-anchored), x PROP_VISUAL_SCALE. A candidate may propose its own `tall`.
export function slotEnvelope(cand) {
  const s = OFFICE_OBSTACLE_SLOTS[cand.slot];
  const [bw, bh] = s.box;
  const tall = cand.tall ?? s.tall ?? 1;
  const vis = s.visual ?? 1;
  return { bw, bh, tall, w: Math.round(bw * 4 / 3 * vis), h: Math.round(bh * 4 / 3 * tall * vis) };
}

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — FIRE EXTINGUISHER (stand 17x25)
function extinguisher(c, w, h, t) {
  const f = frameOf(t, 8, 10), g = h - 0.3;
  // The hose, behind nothing: out of the valve, down the left flank to the horn.
  c.beginPath();
  c.moveTo(7.8, 4.6);
  c.bezierCurveTo(3.4, 4.4, 2.5, 8.6, 2.9, 12.6);
  c.lineTo(3.1, 17.6);
  pen(c, INK, 1.2);
  c.stroke();
  poly(c, [2.0, 17.4, 4.2, 17.4, 4.7, 20.4, 1.5, 20.4], CHAR_DK, INK, LWI);
  body(c, (p) => topRoundPath(p, 5, 6.6, 7.8, g - 6.6, 3.7), RED, (p) => {
    box(p, 10.5, 0, 3, h, RED_DK);
    box(p, 5.9, 8.8, 1.1, 13, RED_LT);
    box(p, 5, 12.4, 7.8, 5.6, '#fff4ea');
    box(p, 5, g - 1.7, 7.8, 1.7, INK);
  });
  lines(c, [5, 12.4, 12.8, 12.4, 5, 18, 12.8, 18], INK, LWF);
  // The label's pictogram: a flame in a red box, the one mark that says "fire kit".
  rbox(c, 6.9, 13.3, 4, 3.8, 0.4, RED, INK, LWF);
  c.beginPath();
  c.moveTo(8.0, 16.5);
  c.quadraticCurveTo(7.6, 15.0, 9.2, 13.9);
  c.quadraticCurveTo(9.0, 15.0, 10.0, 15.4);
  c.quadraticCurveTo(10.2, 16.4, 9.6, 16.5);
  c.closePath();
  fs(c, PAPER);
  // Hose clip on the body.
  box(c, 4.4, 10.6, 1.4, 1.2, CHAR_DK, INK, LWF);
  // Valve, lever and carry handle, the gauge on the shoulder.
  box(c, 7.2, 4.4, 3.4, 2.6, CHAR_DK, INK, LWI);
  poly(c, [6.2, 3.3, 13.6, 2.0, 13.8, 3.1, 6.4, 4.6], STEEL, INK, LWI);
  poly(c, [6.8, 4.8, 12.8, 4.8, 12.6, 5.8, 7.0, 5.8], STEEL_DK, INK, LWF);
  circ(c, 11.1, 3.9, 0.75, null, LEMON, 0.38);
  circ(c, 11.6, 6.6, 1.3, PAPER, INK, LWI);
  box(c, 10.5, 6.4, 1.1, 0.5, '#9be27a');
  const a = -2.3 + 0.35 * Math.sin((f / 8) * TAU);
  line(c, 11.6, 6.6, 11.6 + Math.cos(a) * 1.0, 6.6 + Math.sin(a) * 1.0, RED_DK, 0.28);
  // It is not quite shut: a hiss of foam from the horn on the back of the ring.
  if (f >= 5) {
    for (let i = 0; i <= f - 5; i++) circ(c, 2.9 - i * 0.9, 21.4 + i * 0.5, 0.55 + i * 0.32, PAPER, INK, LWF);
  }
}

// B — WATER COOLER (stand 17x25)
function waterCooler(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.3;
  body(c, rr(3.4, 10.6, 10.4, g - 10.6, 1.2), '#ece8f2', (p) => {
    box(p, 11.6, 0, 3, h, '#cdc6db');
    box(p, 4.2, 11.6, 0.9, 12, PAPER);
    box(p, 3.4, g - 1.5, 10.4, 1.5, '#cdc6db');
  });
  // The dispensing bay, two taps, the drip grille.
  rbox(c, 4.6, 12.4, 7.6, 4.8, 0.8, CHAR, INK, LWI);
  box(c, 5.5, 12.6, 1.8, 1.9, RED, INK, LWF);
  box(c, 9.5, 12.6, 1.8, 1.9, COBALT, INK, LWF);
  line(c, 5.2, 16.4, 11.6, 16.4, STEEL, 0.55);
  // Cone cups in a tube on the side.
  rbox(c, 13.7, 11.4, 2.0, 7.0, 0.6, PAPER, INK, LWI);
  lines(c, [13.7, 13.6, 15.7, 13.6, 13.7, 15.8, 15.7, 15.8], PAPER_DK, 0.25);
  box(c, 4.4, 9.4, 8.4, 1.5, '#cdc6db', INK, LWI);
  // The jug, upside down: water from the neck up, an air pocket at the top,
  // and a glug rising through it on the ring.
  body(c, rr(3.0, 0.6, 11.2, 8.6, 3.4), '#74c4ec', (p) => {
    box(p, 3, 0, 11.2, 2.6, '#c6ecfb');
    line(p, 3, 2.6, 14.2, 2.6, '#3f8fc0', 0.3);
    box(p, 11.4, 0, 3, 10, '#4fa3d4');
    lines(p, [3, 4.8, 14.2, 4.8, 3, 7.0, 14.2, 7.0], 'rgba(30,90,150,0.55)', 0.3);
    circ(p, 7.6 + Math.sin(f * 1.3) * 0.4, 8.8 - f * 0.8, 0.55 + f * 0.05, '#e6f7ff', '#3f8fc0', 0.18);
    if (f > 2) circ(p, 9.4, 8.8 - (f - 2) * 0.95, 0.4, '#e6f7ff', '#3f8fc0', 0.18);
    box(p, 4.3, 1.6, 0.9, 6.6, 'rgba(255,255,255,0.85)');
  });
  box(c, 6.6, 9.0, 4, 0.9, '#5aaedc', INK, LWI);
}

// C — RUBBER PLANT in a Memphis pot (stand 17x25)
function rubberPlant(c, w, h, t) {
  const f = frameOf(t, 8, 6), g = h - 0.3;
  const sway = Math.sin((f / 8) * TAU) * 0.06;
  c.save();
  c.translate(8.5, 15.4);
  c.transform(1, 0, -sway, 1, 0, 0);
  c.translate(-8.5, -15.4);
  lines(c, [8.5, 15.4, 8.3, 3.2, 8.4, 11.2, 4.2, 7.8, 8.6, 9.4, 12.8, 6.0], '#5a3a2a', 0.55);
  const LEAVES = [
    [8.4, 12.8, 5.6, 1.9, Math.PI + 0.42], [8.6, 12.6, 5.4, 1.9, -0.36],
    [8.4, 9.6, 6.4, 2.2, Math.PI + 0.12], [8.6, 9.2, 6.2, 2.2, -0.16],
    [8.3, 6.6, 6.0, 2.1, Math.PI + 0.62], [8.4, 6.2, 5.8, 2.1, -0.62],
    [8.3, 4.6, 4.6, 1.8, -1.62],
  ];
  for (const [x, y, len, wid, ang] of LEAVES) bladeLeaf(c, x, y, len, wid, ang);
  c.restore();
  // The pot: gloss black, Memphis confetti, a white rim.
  body(c, shape([3.6, 15.4, 13.4, 15.4, 12.3, g, 4.7, g]), INK, (p) => {
    box(p, 4.4, 15, 0.9, 10, '#4a4858');
    poly(p, [6.0, 17.6, 7.4, 17.0, 7.0, 18.6], PINK);
    poly(p, [10.6, 20.2, 12.0, 21.0, 10.4, 21.6], LEMON);
    circ(p, 9.0, 19.0, 0.55, TEAL);
    circ(p, 6.2, 22.0, 0.5, LILAC);
    line(p, 8.6, 22.6, 10.0, 21.8, PINK, 0.5);
    line(p, 10.4, 17.2, 11.6, 18.0, TEAL, 0.5);
  });
  rbox(c, 3.0, 14.3, 11, 2.0, 0.5, '#f4f0f6', INK, LWI);
}

// D — DESK FAN, on the floor, the size of a hazard (stand 17x25)
function deskFan(c, w, h, t) {
  const f = frameOf(t, 8, 20), g = h - 0.3;
  ell(c, 8.5, g - 0.8, 5.6, 1.1, CHAR_DK, INK, LWI);
  rbox(c, 4.4, g - 3.0, 8.2, 2.4, 0.9, LEMON, INK, LWI);
  box(c, 4.6, g - 1.6, 7.8, 0.9, LEMON_DK);
  circ(c, 6.6, g - 1.9, 0.55, PINK, INK, LWF);
  circ(c, 8.5, g - 1.9, 0.55, TEAL, INK, LWF);
  circ(c, 10.4, g - 1.9, 0.55, PAPER, INK, LWF);
  box(c, 7.8, 15.2, 1.8, g - 3.0 - 15.2, STEEL, INK, LWI);
  // The motor behind the cage, turned a little to the right.
  ell(c, 11.4, 8.6, 2.5, 3.0, LEMON_DK, INK, LWI);
  const cx = 8.5, cy = 8.4, R = 7.6;
  circ(c, cx, cy, R, 'rgba(255,255,255,0.22)');
  circ(c, cx, cy, R - 1.0, 'rgba(255,111,174,0.2)');
  // Three blades, a third of a turn over the ring, so the loop is seamless.
  for (let k = 0; k < 3; k++) {
    const a = (f / 8) * (TAU / 3) + k * (TAU / 3);
    c.save();
    c.translate(cx, cy);
    c.rotate(a);
    body(c, (p) => {
      p.moveTo(0.8, -0.9);
      p.quadraticCurveTo(4.0, -3.6, 6.3, -1.4);
      p.quadraticCurveTo(6.6, 1.0, 1.0, 0.9);
      p.closePath();
    }, PINK, (p) => box(p, 0, 0, 8, 2, PINK_DK), INK, LWI);
    c.restore();
  }
  circ(c, cx, cy, 1.8, LEMON, INK, LWI);
  circ(c, cx, cy, 0.6, INK);
  // The cage: spokes and a ring, then the rim in full ink.
  c.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    c.moveTo(cx + Math.cos(a) * 2.0, cy + Math.sin(a) * 2.0);
    c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  pen(c, 'rgba(31,29,38,0.55)', 0.18);
  c.stroke();
  circ(c, cx, cy, R * 0.6, null, 'rgba(31,29,38,0.55)', 0.18);
  circ(c, cx, cy, R, null, INK, LW);
  // The wind: three strokes leaving the cage toward the hero, chasing outward.
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 3) % 8) / 8;
    const yy = 4.8 + i * 3.6;
    line(c, 1.2 - k * 1.0, yy, 2.6 - k * 1.0, yy, INK, 0.3);
  }
}

// E — FOUNDER BUST on a plinth: the silver professor in marble (stand 17x25)
function founderBust(c, w, h, t) {
  const f = frameOf(t, 16, 8), g = h - 0.3;
  box(c, 3.4, g - 1.7, 10.2, 1.7, CHAR_DK, INK, LWI);
  body(c, rect(4.6, 14.8, 7.8, g - 1.7 - 14.8), CHAR_DK, (p) => {
    box(p, 10.8, 0, 2, h, '#18161e');
    box(p, 5.2, 14, 0.7, 12, '#4a4858');
  }, INK, LWI);
  box(c, 3.8, 13.6, 9.4, 1.4, CHAR, INK, LWI);
  rbox(c, 6.1, 18.0, 4.8, 1.9, 0.3, BRASS, INK, LWF);
  line(c, 6.9, 19.0, 10.1, 19.0, BRASS_DK, 0.3);
  // Shoulders, then the hair behind the head, then the head.
  body(c, (p) => {
    p.moveTo(3.4, 13.6);
    p.quadraticCurveTo(3.6, 10.6, 6.6, 10.0);
    p.lineTo(10.4, 10.0);
    p.quadraticCurveTo(13.4, 10.6, 13.6, 13.6);
    p.closePath();
  }, MARBLE, (p) => box(p, 10.4, 0, 4, 14, MARBLE_DK), INK, LWI);
  box(c, 7.4, 8.2, 2.2, 2.0, MARBLE_DK, INK, LWF);
  // The hair: the professor's own, out to both sides and up.
  const HAIR = [3.0, 7.0, 3.6, 5.6, 2.2, 4.4, 4.2, 4.0, 3.4, 2.4, 5.4, 2.6, 5.6, 0.8, 7.2, 1.8,
    8.6, 0.4, 9.8, 1.8, 11.6, 0.8, 11.6, 2.6, 13.6, 2.4, 12.8, 4.0, 14.8, 4.4, 13.4, 5.6, 14.0, 7.0, 12.0, 6.6,
    11.6, 5.0, 5.4, 5.0, 5.0, 6.6];
  body(c, shape(HAIR), MARBLE, (p) => box(p, 10.8, 0, 6, 12, MARBLE_DK), INK, LWI);
  ell(c, 8.5, 5.8, 2.5, 3.0, MARBLE, INK, LWI);
  box(c, 9.6, 3.2, 1.6, 5.4, MARBLE_DK);
  ell(c, 8.5, 5.8, 2.5, 3.0, null, INK, LWI);
  // Carved spectacles and the moustache — enough to be him at 25 units.
  circ(c, 7.5, 5.4, 0.85, null, INK, 0.26);
  circ(c, 9.6, 5.4, 0.85, null, INK, 0.26);
  line(c, 8.35, 5.3, 8.75, 5.3, INK, 0.22);
  c.beginPath();
  c.moveTo(6.9, 7.6);
  c.quadraticCurveTo(7.8, 6.6, 8.55, 7.1);
  c.quadraticCurveTo(9.3, 6.6, 10.2, 7.6);
  c.quadraticCurveTo(8.55, 7.5, 6.9, 7.6);
  fs(c, MARBLE_DK, INK, LWF);
  // The polish catches the lamps, now and then.
  if (f < 4) glint(c, 5.6, 3.6, [0.7, 1.4, 1.0, 0.4][f]);
}

// F — WET FLOOR SIGN, the office's traffic cone (cone 13x17)
function wetFloorSign(c, w, h, t) {
  const f = frameOf(t, 8, 6), g = h - 0.3;
  ell(c, 4.6, g - 0.2, 4.4, 0.75, '#bfe6fa', '#4c97c8', 0.22);
  line(c, 2.0 + f * 0.6, g - 0.35, 3.2 + f * 0.6, g - 0.35, PAPER, 0.35);
  poly(c, [7.6, 0.8, 9.2, 0.8, 12.6, g, 10.9, g], LEMON_DK, INK, LWI);
  body(c, shape([4.0, 0.8, 8.6, 0.8, 11.0, g, 1.6, g]), LEMON, (p) => {
    poly(p, [4.0, 0.8, 4.9, 0.8, 2.6, g, 1.6, g], LEMON_LT);
    box(p, 0, g - 1.4, 13, 1.4, LEMON_DK);
  });
  rbox(c, 5.2, 1.7, 2.4, 1.0, 0.5, INK);
  // The warning triangle and the man going over backwards.
  poly(c, [6.3, 3.6, 8.9, 8.2, 3.7, 8.2], PAPER, INK, LWI);
  line(c, 6.3, 5.2, 6.3, 6.8, INK, 0.45);
  circ(c, 6.3, 7.5, 0.25, INK);
  circ(c, 4.3, 10.0, 0.7, INK);
  lines(c, [4.8, 10.6, 6.9, 12.0, 6.9, 12.0, 8.6, 10.6, 6.9, 12.0, 8.4, 13.2,
    5.5, 11.0, 4.0, 12.4, 5.5, 11.0, 6.3, 9.4], INK, 0.42);
  line(c, 3.0, 14.4, 9.8, 14.4, INK, 0.36);
}

// G — BIN FIRE, the wastepaper basket alight (fire 17x29)
function binFire(c, w, h, t) {
  const f = frameOf(t, 8, 14), g = h - 0.3;
  const top = 13.4;
  ell(c, 8.5, top, 6.4, 1.3, '#14121a', INK, LWI);
  circ(c, 6.0, top - 0.6, 1.5, PAPER, INK, LWF);
  circ(c, 10.0, top - 0.9, 1.7, PAPER_DK, INK, LWF);
  flames(c, 8.5, top, f);
  // A memo going up: a scrap of paper lifted out of the fire on the ring.
  const k = f / 8;
  c.save();
  c.translate(12.6 + k * 2.0, 6.0 - k * 5.0);
  c.rotate(k * 3.0);
  poly(c, [-0.9, -0.6, 0.9, -0.6, 0.9, 0.6, -0.9, 0.6], PAPER, INK, LWF);
  box(c, 0.4, -0.6, 0.5, 1.2, ORANGE);
  c.restore();
  // The basket: Memphis cobalt wire mesh, tapered, black rims.
  body(c, shape([2.1, top, 14.9, top, 13.2, g, 3.8, g]), COBALT, (p) => {
    p.beginPath();
    for (let x = -16; x < 18; x += 1.7) {
      p.moveTo(x, top);
      p.lineTo(x + 16, g);
      p.moveTo(x + 16, top);
      p.lineTo(x, g);
    }
    pen(p, COBALT_LT, 0.28);
    p.stroke();
    box(p, 11.8, 0, 6, h, 'rgba(20,24,70,0.3)');
  });
  rbox(c, 1.6, top - 0.7, 13.8, 1.5, 0.6, INK);
  line(c, 2.6, top - 0.2, 7.0, top - 0.2, STEEL_DK, 0.3);
  box(c, 3.6, g - 1.0, 9.8, 1.0, INK);
}

// H — PHOTOCOPIER, the big beige one (big 23x26)
function photocopier(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.3;
  // The stand: paper drawers on casters.
  body(c, rect(3, 17.2, 18, g - 1.3 - 17.2), CHAR, (p) => {
    box(p, 18.6, 0, 3, h, CHAR_DK);
    lines(p, [3, 20.0, 21, 20.0], INK, LWI);
  });
  box(c, 10.0, 18.4, 4.0, 0.7, STEEL);
  box(c, 10.0, 21.2, 4.0, 0.7, STEEL);
  for (const x of [4.6, 19.4]) caster(c, x, g - 0.7, 0.7, 0);
  // The machine.
  body(c, rr(2, 8.4, 20, 9.0, 0.8), BEIGE, (p) => {
    box(p, 18.4, 0, 4, h, BEIGE_DK);
    box(p, 2, 15.4, 20, 2.2, BEIGE_DK);
    box(p, 2.8, 9.4, 0.8, 5.6, BEIGE_LT);
  });
  line(c, 2, 15.4, 22, 15.4, INK, LWF);
  rbox(c, 5.0, 11.0, 6.4, 3.2, 0.4, BEIGE_LT, INK, LWF);
  box(c, 7.4, 12.2, 1.6, 0.6, INK);
  // The output tray off the left side, and the sheet that comes out onto it.
  poly(c, [2.2, 11.4, 0.2, 10.2, 0.2, 11.2, 2.2, 12.6], STEEL, INK, LWI);
  if (f >= 5) {
    const k = (f - 4) / 4;
    poly(c, [2.4 - k * 2.0, 10.6 - k * 1.0, 3.4 - k * 1.6, 10.2 - k * 1.0, 3.4 - k * 1.6, 10.9 - k * 0.6, 2.4 - k * 2.0, 11.3 - k * 0.6], PAPER, INK, LWF);
  }
  // Lid, control deck, the green JAM-free light and the red one that isn't.
  rbox(c, 2.4, 6.6, 15.4, 2.1, 0.5, CHAR, INK, LWI);
  line(c, 3.2, 7.2, 16.8, 7.2, '#55536a', 0.3);
  rbox(c, 16.4, 6.8, 5.4, 1.9, 0.4, CHAR_DK, INK, LWI);
  box(c, 17.0, 7.3, 2.0, 0.9, PHOSPHOR);
  circ(c, 20.0, 7.7, 0.45, f % 2 ? RED : RED_DK);
  circ(c, 21.0, 7.7, 0.35, TEAL);
  // The scan: a bar of light leaking out under the lid, sweeping across.
  if (f < 6) {
    const sx = 3.2 + f * 2.5;
    box(c, sx - 1.2, 8.1, 4.6, 1.0, 'rgba(214,255,176,0.35)');
    box(c, sx, 8.25, 2.2, 0.7, '#e8ffd4');
  }
}

// I — FILING CABINET, three-quarter on, whose top drawer shoots out at you (big 23x26)
function filingCabinet(c, w, h, t) {
  const f = frameOf(t, 12, 10), g = h - 0.3;
  const out = [0, 0, 0, 3.0, 5.2, 5.8, 5.8, 5.8, 5.6, 3.0, 0.6, 0][f];
  const FX0 = 6.6, FX1 = 15.6, DX = 4.4, DY = -1.5, TOP = 4.0;
  const DH = (g - TOP) / 3;
  // Side and top faces, receding up to the right.
  poly(c, [FX1, TOP, FX1 + DX, TOP + DY, FX1 + DX, g + DY, FX1, g], COBALT_DK, INK, LW);
  poly(c, [FX0, TOP, FX1, TOP, FX1 + DX, TOP + DY, FX0 + DX, TOP + DY], COBALT_LT, INK, LW);
  // The mug on top, which does not care.
  rbox(c, 12.2, 0.4, 2.6, 3.0, 0.5, PINK, INK, LWI);
  c.beginPath();
  c.arc(15.0, 1.9, 0.8, -Math.PI / 2, Math.PI / 2);
  pen(c, INK, 0.45);
  c.stroke();
  body(c, rect(FX0, TOP, FX1 - FX0, g - TOP), COBALT, (p) => box(p, FX0 + 0.6, TOP + 1, 0.7, g - TOP - 2, COBALT_LT));
  const drawerFront = (x, y) => {
    rbox(c, x + 0.6, y + 0.5, FX1 - FX0 - 1.2, DH - 1.0, 0.4, '#4a6ae0', INK, LWI);
    rbox(c, x + 2.6, y + 1.3, 4.8, 1.8, 0.2, PAPER, INK, LWF);
    line(c, x + 3.3, y + 2.2, x + 6.4, y + 2.2, INK, 0.22);
    rbox(c, x + 3.0, y + 3.9, 4.0, 1.1, 0.4, STEEL, INK, LWF);
  };
  for (let k = 1; k < 3; k++) drawerFront(FX0, TOP + k * DH);
  // The top drawer, coming out at you down the depth axis, full of files.
  const y0 = TOP + 0.3, y1 = TOP + DH - 0.3;
  if (out > 0) {
    const ox = -out, oy = -out * DY / DX;
    box(c, FX0 + 0.4, y0, FX1 - FX0 - 0.8, y1 - y0, '#16182e');
    poly(c, [FX0 + ox, y0 + oy, FX1 + ox, y0 + oy, FX1, y0, FX0, y0], '#22357e', INK, LWI);
    const TABS = [[PINK, 0.25, 2.2], [LEMON, 0.45, 2.8], [TEAL, 0.65, 2.0], [PAPER, 0.85, 2.5]];
    for (const [col, k, up] of TABS) {
      const tx = FX0 + 1.4 + ox * k, ty = y0 + oy * k;
      box(c, tx, ty - up, FX1 - FX0 - 3.0, up + 0.3, col, INK, LWF);
    }
    poly(c, [FX1 + ox, y0 + oy, FX1, y0, FX1, y1, FX1 + ox, y1 + oy], COBALT_DK, INK, LWI);
    rbox(c, FX0 + ox, y0 + oy - 0.3, FX1 - FX0, y1 - y0 + 0.6, 0.4, COBALT, INK, LWI);
    drawerFront(FX0 + ox, TOP + oy);
  } else {
    drawerFront(FX0, TOP);
  }
}

// J — ARCHIVE BOX, the bankers box that stacks (stack 16x15)
function archiveBox(c, w, h, t) {
  const g = h - 0.2;
  body(c, rect(0.8, 3.6, 12.8, g - 3.6), CARD, (p) => {
    box(p, 0.8, g - 1.2, 12.8, 1.2, CARD_DK);
    box(p, 1.4, 4.6, 0.7, 8, CARD_LT);
  });
  poly(c, [13.6, 3.6, 15.4, 2.6, 15.4, g - 1.0, 13.6, g], CARD_DK, INK, LWI);
  // The lid, a fraction proud of the box, and a sheet escaping from under it.
  poly(c, [1.8, 2.8, 4.4, 1.4, 5.6, 2.8], PAPER, INK, LWF);
  poly(c, [0.3, 0.6 + 1.0, 2.1, 0.6, 15.8, 0.6, 14.0, 1.6], '#f6cc98', INK, LWI);
  body(c, rect(0.3, 1.6, 13.7, 2.8), CARD_LT, (p) => box(p, 0.3, 3.6, 13.7, 0.8, CARD), INK, LWI);
  poly(c, [14.0, 1.6, 15.8, 0.6, 15.8, 3.4, 14.0, 4.4], CARD, INK, LWI);
  rbox(c, 5.3, 5.2, 4.4, 1.3, 0.6, '#3b2414', INK, LWF);
  // The label: printed grid, the year in red.
  rbox(c, 3.2, 7.6, 8.0, 4.8, 0.3, PAPER, INK, LWF);
  box(c, 3.6, 8.1, 4.2, 1.4, RED);
  lines(c, [3.6, 10.4, 10.8, 10.4, 3.6, 11.5, 9.0, 11.5], INK, 0.22);
}

// K — CRT MONITOR, beige, green phosphor, stacks into the IT pile (stack 16x15)
function crtMonitor(c, w, h, t) {
  const f = frameOf(t, 8, 4), g = h - 0.2;
  poly(c, [4.2, g, 11.2, g, 10.4, g - 1.9, 5.0, g - 1.9], BEIGE_DK, INK, LWI);
  poly(c, [12.6, 1.6, 15.6, 3.2, 15.6, 10.8, 12.6, 12.4], BEIGE_DK, INK, LWI);
  lines(c, [13.4, 4.4, 14.8, 5.0, 13.4, 5.8, 14.8, 6.4, 13.4, 7.2, 14.8, 7.8], '#a89a76', 0.3);
  body(c, rr(0.6, 0.8, 12.4, 12.2, 1.2), BEIGE, (p) => {
    box(p, 1.2, 1.6, 0.7, 10, BEIGE_LT);
    box(p, 0.6, 11.3, 12.4, 1.8, BEIGE_DK);
  });
  body(c, rr(2.0, 2.0, 9.2, 7.8, 1.4), '#123a22', (p) => {
    const rows = [5.2, 3.4, 6.0, 2.6];
    rows.forEach((len, i) => box(p, 3.0, 3.2 + i * 1.35, len, 0.6, PHOSPHOR));
    if (f % 2 === 0) box(p, 3.0, 3.2 + 4 * 1.35, 0.9, 0.7, PHOSPHOR);
    box(p, 2, 2 + (f / 8) * 9.6 - 1, 9.2, 1.2, 'rgba(120,255,170,0.14)');
    poly(p, [2.6, 2.4, 4.6, 2.4, 2.6, 5.4], 'rgba(255,255,255,0.22)');
  }, INK, LWI);
  box(c, 2.4, 10.8, 3.0, 0.7, STEEL_DK);
  circ(c, 10.6, 11.1, 0.45, PHOSPHOR, INK, 0.15);
}

// L — OFFICE CHAIR, an ’80s task chair rolling upright on its casters (roll 16x19)
function officeChair(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h - 0.2;
  const sw = Math.sin((f / 8) * TAU); // the swivel, a little either way
  const hub = 15.6;
  for (const x of [1.6, 5.0, 11.0, 14.4]) {
    line(c, 8, hub, x, g - 1.4, INK, 0.95);
    caster(c, x, g - 0.9, 0.95, f);
  }
  box(c, 7.3, 10.8, 1.4, 4.8, STEEL, INK, LWI);
  box(c, 6.9, 13.4, 2.2, 2.4, CHAR, INK, LWI);
  // The back, swivelling: its post comes out from under the seat on the right.
  const bx = 12.8 + sw * 0.7;
  const bw = 3.4 - Math.abs(sw) * 0.6;
  c.beginPath();
  c.moveTo(9.0, 10.4);
  c.quadraticCurveTo(bx + 0.6, 10.6, bx + 0.4, 6.0);
  pen(c, INK, 0.9);
  c.stroke();
  body(c, rr(bx - bw / 2, 0.6, bw + 0.8, 7.4, 1.8), COBALT, (p) => {
    box(p, bx + bw / 2 - 0.4, 0, 3, 9, COBALT_DK);
    box(p, bx - bw / 2 + 0.5, 1.6, 0.6, 5, COBALT_LT);
  });
  // Seat and armrest.
  c.beginPath();
  c.moveTo(4.0, 9.0);
  c.lineTo(4.0, 5.8);
  c.lineTo(9.6, 5.8);
  c.lineTo(9.6, 9.0);
  pen(c, INK, 0.7);
  c.stroke();
  body(c, rr(2.0, 8.4, 12.2, 2.8, 1.3), COBALT, (p) => {
    box(p, 2, 10.1, 12.2, 1.2, COBALT_DK);
    box(p, 3.0, 8.8, 7, 0.6, COBALT_LT);
  });
}

// M — MAIL CART, canvas bin full of internal mail (roll 16x18)
function mailCart(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h - 0.2;
  const bob = (i) => (Math.sin((f / 8) * TAU * 2 + i * 1.7) > 0.6 ? -0.4 : 0);
  // Push handle on the right.
  lines(c, [13.4, 7.0, 15.2, 2.8], INK, 0.75);
  rbox(c, 14.4, 1.4, 1.4, 2.6, 0.5, CHAR, INK, LWI);
  // What's in it: envelopes and a parcel, nudging on the bumps.
  c.save();
  c.translate(0, bob(0));
  poly(c, [2.4, 7.2, 3.6, 2.6, 7.2, 3.4, 6.0, 8.0], PAPER, INK, LWI);
  lines(c, [3.4, 3.4, 6.8, 4.2], RED, 0.5);
  c.restore();
  c.save();
  c.translate(0, bob(1));
  body(c, rect(6.6, 2.6, 4.8, 4.6), CARD, (p) => box(p, 10.2, 0, 2, 9, CARD_DK), INK, LWI);
  lines(c, [9.0, 2.6, 9.0, 7.2, 6.6, 4.9, 11.4, 4.9], '#7a4a24', 0.3);
  c.restore();
  c.save();
  c.translate(0, bob(2));
  poly(c, [10.6, 7.0, 11.4, 3.2, 14.0, 3.6, 13.2, 7.4], '#e6f0ff', INK, LWI);
  lines(c, [11.0, 4.6, 13.6, 5.0], COBALT, 0.45);
  c.restore();
  // The canvas bin, sagging, white band and red stripe.
  body(c, (p) => {
    p.moveTo(1.0, 6.6);
    p.lineTo(14.2, 6.6);
    p.lineTo(13.4, g - 3.0);
    p.quadraticCurveTo(7.7, g - 1.8, 1.8, g - 3.0);
    p.closePath();
  }, TEAL, (p) => {
    box(p, 11.8, 0, 4, h, TEAL_DK);
    box(p, 0, 9.0, 16, 1.8, PAPER);
    box(p, 0, 10.8, 16, 0.7, RED);
    box(p, 1.8, 11.8, 0.7, 2.6, TEAL_LT);
  });
  box(c, 0.6, 6.0, 14.2, 1.1, STEEL, INK, LWI);
  box(c, 1.2, g - 3.0, 13.0, 0.9, STEEL, INK, LWI);
  caster(c, 2.6, g - 1.1, 1.0, f);
  caster(c, 12.6, g - 1.1, 1.0, f);
}

// N — MOP BUCKET with wringer, on casters (roll 16x19)
function mopBucket(c, w, h, t) {
  const f = frameOf(t, 8, 10), g = h - 0.2;
  const p8 = (f / 8) * TAU;
  // The mop handle, leaning out of the bucket.
  line(c, 6.4, 9.0, 2.2, 0.4, INK, 1.25);
  line(c, 6.4, 9.0, 2.2, 0.4, STEEL, 0.55);
  // Water and suds slopping at the top.
  ell(c, 6.1, 8.0, 5.2, 1.0, '#8fb9ca', INK, LWI);
  for (let i = 0; i < 4; i++) circ(c, 3.0 + i * 2.0, 7.8 + Math.sin(p8 + i) * 0.25, 0.6 + (i % 2) * 0.2, PAPER, INK, LWF);
  // The bucket.
  body(c, shape([0.8, 8.0, 11.4, 8.0, 10.6, g - 2.2, 1.6, g - 2.2]), LEMON, (p) => {
    box(p, 9.0, 0, 4, h, LEMON_DK);
    box(p, 1.8, 9.2, 0.8, 5.6, LEMON_LT);
    lines(p, [0, 11.0, 16, 11.0, 0, 13.8, 16, 13.8], LEMON_DK, 0.35);
  });
  // The wringer on the back rim, and its lever.
  line(c, 13.2, 6.2, 15.4, 1.0, INK, 0.9);
  rbox(c, 14.6, 0.4, 1.2, 1.8, 0.5, RED, INK, LWF);
  body(c, rr(9.8, 4.8, 5.2, 4.0, 0.6), CHAR, (p) => box(p, 13.6, 0, 2, 9, CHAR_DK), INK, LWI);
  lines(c, [10.6, 6.0, 14.2, 6.0, 10.6, 7.2, 14.2, 7.2], '#55536a', 0.35);
  // A slop over the front edge, on the bump.
  if (f >= 3 && f <= 5) {
    const k = f - 3;
    circ(c, 0.9 - k * 0.2, 7.6 + k * 1.6, 0.5, '#8fb9ca', INK, LWF);
  }
  // Dolly and four casters.
  box(c, 0.6, g - 2.3, 13.8, 1.0, CHAR, INK, LWI);
  for (const x of [1.8, 5.6, 9.4, 13.2]) caster(c, x, g - 0.75, 0.75, f);
}

// O — AV TROLLEY with an overhead projector, lamp on (roll 16x24)
function avTrolley(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h - 0.2;
  const S1 = 12.2, S2 = 18.6;
  // The beam, out of the head toward the hero, buzzing.
  const a = [0.5, 0.5, 0.42, 0.5, 0.5, 0.32, 0.5, 0.46][f];
  poly(c, [5.2, 1.0, 0.2, 0.0, 0.2, 5.6, 5.2, 2.8], `rgba(255,246,190,${a})`);
  // The cart.
  for (const x of [1.4, 13.6]) box(c, x, S1, 1.0, g - 1.6 - S1, CHAR_DK, INK, LWF);
  box(c, 0.8, S1, 14.6, 1.3, CHAR, INK, LWI);
  box(c, 0.8, S2, 14.6, 1.3, CHAR, INK, LWI);
  // Binders on the bottom shelf.
  [[PINK, 3.0], [LEMON, 4.6], [TEAL, 6.2], [LILAC, 7.8]].forEach(([col, x]) => box(c, x, S2 - 3.4, 1.5, 3.4, col, INK, LWF));
  // The projector body, its fan grille, the platen with a transparency on it.
  body(c, rr(2.0, 8.0, 10.6, 4.2, 0.6), BEIGE, (p) => {
    box(p, 10.6, 0, 3, h, BEIGE_DK);
    box(p, 2.6, 8.8, 0.6, 3, BEIGE_LT);
  });
  lines(c, [4.0, 9.8, 4.0, 11.4, 5.0, 9.8, 5.0, 11.4, 6.0, 9.8, 6.0, 11.4], '#a89a76', 0.35);
  box(c, 2.6, 7.2, 9.4, 0.9, '#cfeefa', INK, LWF);
  box(c, 3.4, 6.7, 6.4, 0.5, LILAC, INK, 0.15);
  // The arm and the head, lens facing the hero.
  box(c, 10.6, 2.6, 1.1, 4.8, STEEL_DK, INK, LWF);
  body(c, rr(5.2, 0.4, 6.8, 2.6, 0.6), CHAR, (p) => box(p, 10.4, 0, 2, 4, CHAR_DK), INK, LWI);
  circ(c, 5.4, 1.7, 0.9, '#fff6c8', INK, LWF);
  // The flex, trailing behind.
  c.beginPath();
  c.moveTo(12.6, 10.4);
  c.bezierCurveTo(15.6, 11.0, 14.0, 15.6, 15.8, 17.4);
  pen(c, INK, 0.4);
  c.stroke();
  for (const x of [2.0, 14.0]) caster(c, x, g - 0.9, 0.9, f);
}

// P — VELVET ROPE, two brass stanchions in the lobby (hurdle 21x12)
function velvetRope(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  const sag = 2.8 + 0.5 * Math.sin((f / 8) * TAU);
  for (const px of [3.0, 18.0]) {
    c.beginPath();
    c.moveTo(px - 2.6, g);
    c.quadraticCurveTo(px - 2.4, g - 2.2, px, g - 2.3);
    c.quadraticCurveTo(px + 2.4, g - 2.2, px + 2.6, g);
    c.closePath();
    fs(c, BRASS, INK, LWI);
    body(c, rect(px - 0.6, 2.8, 1.2, g - 2.8 - 2.0), BRASS, (p) => box(p, px + 0.15, 0, 0.6, h, BRASS_DK), INK, LWI);
    circ(c, px, 2.0, 1.3, BRASS, INK, LWI);
    circ(c, px - 0.4, 1.6, 0.4, BRASS_LT);
  }
  c.beginPath();
  c.moveTo(3.8, 3.8);
  c.quadraticCurveTo(10.5, 3.8 + sag * 2, 17.2, 3.8);
  pen(c, INK, 2.3);
  c.stroke();
  pen(c, '#c4153a', 1.4);
  c.stroke();
  c.beginPath();
  c.moveTo(5.0, 3.7);
  c.quadraticCurveTo(10.5, 3.2 + sag * 2, 16.0, 3.7);
  pen(c, '#ff5a7a', 0.35);
  c.stroke();
  for (const px of [3.8, 17.2]) circ(c, px, 3.8, 0.55, BRASS, INK, LWF);
}

// Q — DRAWING PINS, a spilled box of them, points up (floor 20x16, bedded)
function drawingPins(c, w, h, t) {
  // Bedded: the run sinks the art BED_SINK (2u) and the road cuts it there, so
  // everything that has to show sits above h - 2.
  const f = frameOf(t, 10, 9), g = h - 2.0;
  // The box they came out of, on its side at the far end, open toward the hero.
  poly(c, [15.4, g, 19.6, g, 19.6, g - 3.4, 15.4, g - 3.4], RED, INK, LWI);
  box(c, 16.4, g - 2.6, 2.4, 1.6, PAPER, INK, LWF);
  poly(c, [15.4, g - 3.4, 14.0, g - 4.6, 14.0, g - 0.8, 15.4, g], RED_DK, INK, LWI);
  const PINS = [[2.4, 6.6, RED], [5.6, 9.0, LEMON], [8.8, 7.2, TEAL], [11.8, 9.6, PINK], [14.4, 6.0, COBALT]];
  PINS.forEach(([x, ht, col], i) => {
    // The point, lit on its left, then the head lying flat on the floor.
    poly(c, [x - 0.65, g - 1.0, x + 0.65, g - 1.0, x, g - 1.0 - ht], STEEL, INK, 0.24);
    poly(c, [x - 0.5, g - 1.1, x - 0.05, g - 1.1, x - 0.05, g - 0.9 - ht], STEEL_LT);
    ell(c, x, g - 0.85, 2.1, 0.85, col, INK, LWI);
    box(c, x - 1.6, g - 1.25, 1.0, 0.35, 'rgba(255,255,255,0.6)');
    if (f === i * 2) glint(c, x, g - 1.0 - ht, 1.3);
  });
}

// R — DOT-MATRIX PRINTER, green-bar printout feeding up and over (target 16x16)
function dotMatrix(c, w, h, t) {
  const f = frameOf(t, 8, 12), g = h - 0.2;
  // The body: a beige wedge with a smoked cover over the carriage.
  body(c, shape([1.0, g, 1.0, 11.2, 3.4, 9.4, 15.4, 9.4, 15.4, g]), BEIGE, (p) => {
    box(p, 13.4, 0, 3, h, BEIGE_DK);
    box(p, 1.0, g - 1.4, 14.4, 1.4, BEIGE_DK);
    box(p, 1.8, 11.6, 0.6, 2.4, BEIGE_LT);
  });
  poly(c, [3.2, 9.4, 4.2, 8.0, 12.8, 8.0, 13.6, 9.4], 'rgba(150,120,200,0.55)', INK, LWI);
  // The head, chattering back and forth under the cover.
  const tri = f < 4 ? f / 4 : (8 - f) / 4;
  box(c, 4.4 + tri * 7.0, 8.4, 1.1, 1.0, INK);
  // The printout, feeding up out of the carriage and curling back over the top:
  // pale green bars that scroll as the head prints, sprocket holes up both edges.
  const X = 8.4;
  const ribbon = (p) => {
    p.moveTo(X, 9.0);
    p.lineTo(X, 4.0);
    p.quadraticCurveTo(X, 1.2, X + 2.4, 1.4);
    p.quadraticCurveTo(X + 4.4, 1.7, X + 4.0, 4.0);
  };
  c.save();
  c.lineCap = 'butt';
  c.lineJoin = 'round';
  c.beginPath(); ribbon(c); c.strokeStyle = INK; c.lineWidth = 3.6; c.stroke();
  c.beginPath(); ribbon(c); c.strokeStyle = PAPER; c.lineWidth = 3.0; c.stroke();
  c.setLineDash([0.7, 1.1]);
  c.lineDashOffset = f * 0.225;
  c.beginPath(); ribbon(c); c.strokeStyle = '#cdeedb'; c.lineWidth = 1.6; c.stroke();
  c.restore();
  for (let y = 4.4 + ((f * 0.225) % 0.9); y < 8.2; y += 0.9) {
    circ(c, X - 1.15, y, 0.16, '#9d98aa');
    circ(c, X + 1.15, y, 0.16, '#9d98aa');
  }
  poly(c, [X + 2.5, 3.7, X + 3.0, 4.4, X + 3.5, 3.9, X + 4.0, 4.5, X + 4.5, 3.9, X + 5.5, 4.0], null, INK, LWF, false);
  // Front panel lights: ON LINE green, PAPER red; the feed knob on the side.
  circ(c, 3.4, 12.4, 0.45, PHOSPHOR, INK, 0.15);
  circ(c, 4.8, 12.4, 0.45, f % 4 < 2 ? RED : RED_DK, INK, 0.15);
  circ(c, 14.0, 11.8, 1.1, CHAR, INK, LWI);
  line(c, 14.0, 11.1, 14.0, 12.5, '#55536a', 0.3);
}

// S — PAPER PLANE, a folded memo gliding in at head height (high 22x13)
function paperPlane(c, w, h, t) {
  const f = frameOf(t, 8, 10);
  const pitch = Math.sin((f / 8) * TAU) * 0.07;
  // Speed lines behind it.
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 3) % 8) / 8;
    const yy = 4.6 + i * 1.9;
    line(c, 17.4 + k * 2.0, yy, 19.6 + k * 2.0, yy, 'rgba(31,29,38,0.5)', 0.3);
  }
  c.save();
  c.translate(9, 6.5);
  c.rotate(pitch);
  c.translate(-9, -6.5);
  // Far wing, keel, near wing — nose to the left, toward the hero.
  poly(c, [1.0, 6.6, 15.4, 2.2, 13.6, 6.4], PAPER_DK, INK, LWI);
  poly(c, [1.0, 6.6, 14.4, 6.6, 12.6, 10.6], '#cfc9d8', INK, LWI);
  body(c, shape([1.0, 6.6, 17.6, 4.4, 14.6, 7.8]), PAPER, (p) => {
    // The memo it was: blue rules and a red margin, running with the fold.
    p.beginPath();
    for (let k = 0; k < 4; k++) {
      p.moveTo(4 + k * 3, 6.2 - k * 0.38);
      p.lineTo(5.6 + k * 3, 7.2 - k * 0.28);
    }
    pen(p, '#8fb2e8', 0.3);
    p.stroke();
    line(p, 11.6, 5.4, 12.6, 7.8, RED, 0.3);
  });
  // The red URGENT stamp.
  poly(c, [7.0, 5.6, 9.6, 5.2, 9.9, 6.4, 7.3, 6.8], null, RED, 0.35);
  c.restore();
}

// T — STRIP LIGHT, a fluorescent fitting down on its chains, flickering (low 22x50)
function stripLight(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h;
  const sw = Math.sin((f / 8) * TAU);
  const dx = sw * 1.0;
  const fy = g - 5.0;
  // Chains: from the ceiling, out of shot above, to the fitting's ends.
  c.save();
  c.setLineDash([0.9, 0.5]);
  for (const ax of [4.6, 17.4]) line(c, ax, 0, ax + dx, fy - 1.8, STEEL_DK, 0.55);
  c.restore();
  const on = f !== 2 && f !== 5;
  c.save();
  c.translate(11 + dx, fy);
  c.rotate(sw * 0.04);
  if (on) {
    ell(c, 0, 1.6, 12.4, 3.4, 'rgba(225,250,255,0.22)');
    ell(c, 0, 1.4, 11.0, 2.0, 'rgba(225,250,255,0.4)');
  }
  rbox(c, -9.6, 0.4, 19.2, 1.5, 0.7, on ? '#f2feff' : '#a9b0bd', INK, LWF);
  body(c, rr(-10.4, -2.2, 20.8, 2.8, 0.6), '#f2f0f6', (p) => {
    box(p, -10.4, -0.1, 20.8, 0.8, STEEL);
    box(p, 7.6, -3, 3, 4, '#d9d6e0');
  }, INK, LWI);
  lines(c, [-6, -2.2, -6, 0.6, -2, -2.2, -2, 0.6, 2, -2.2, 2, 0.6, 6, -2.2, 6, 0.6], STEEL_DK, 0.22);
  // A failing starter spits at the end it is dying from.
  if (!on) {
    lines(c, [9.8, 1.0, 11.0, 0.2, 11.0, 0.2, 10.6, 1.4, 10.6, 1.4, 11.8, 1.0], LEMON, 0.4);
  }
  c.restore();
}

// ============================================================== candidates
export const OFFICE_OBSTACLE_CANDIDATES = [
  { letter: 'A', id: 'extinguisher', name: 'FIRE EXTINGUISHER', slot: 'stand', paint: extinguisher,
    note: 'Red canister, black hose, a gauge that twitches and a hiss of foam from the horn. The one office object that already means DANGER.' },
  { letter: 'B', id: 'waterCooler', name: 'WATER COOLER', slot: 'stand', paint: waterCooler,
    note: 'Upside-down blue jug, a glug rising through it, red and blue taps, the cone-cup tube. The floor 23 background owns a quieter one.' },
  { letter: 'C', id: 'rubberPlant', name: 'RUBBER PLANT', slot: 'stand', paint: rubberPlant,
    note: 'The office’s own pot plant in place of the desert one: gloss black Memphis pot, confetti, broad dark leaves that sway.' },
  { letter: 'D', id: 'deskFan', name: 'DESK FAN', slot: 'stand', paint: deskFan,
    note: 'Lemon base, chrome cage, pink blades a third of a turn per ring, three strokes of wind blowing at you. Spinning blades read as a hazard on their own.' },
  { letter: 'E', id: 'founderBust', name: 'FOUNDER BUST', slot: 'stand', paint: founderBust,
    note: 'The silver professor in white marble on a black plinth with a brass plate — the hair, spectacles and moustache, carved. Shatters when broken.' },
  { letter: 'F', id: 'wetFloorSign', name: 'WET FLOOR SIGN', slot: 'cone', paint: wetFloorSign,
    note: 'Yellow A-frame, warning triangle, a man going over backwards, and the puddle. The office’s traffic cone: kickable, a new slot here.' },
  { letter: 'G', id: 'binFire', name: 'BIN FIRE', slot: 'fire', paint: binFire,
    note: 'The bin fire joke in the room’s hand: cobalt wire-mesh wastebasket, crumpled memos, flat red-orange-lemon flames and a burning page lifting off.' },
  { letter: 'H', id: 'photocopier', name: 'PHOTOCOPIER', slot: 'big', paint: photocopier,
    note: 'The beige monster on its drawer stand: the scan bar sweeps out under the lid and a copy slides into the side tray toward you.' },
  { letter: 'I', id: 'filingCabinet', name: 'FILING CABINET', slot: 'big', paint: filingCabinet,
    note: 'Cobalt, three-quarter on, a mug on top. The top drawer shoots out at the hero full of files, holds, and slams back.' },
  { letter: 'J', id: 'archiveBox', name: 'ARCHIVE BOXES', slot: 'stack', paint: archiveBox,
    note: 'Bankers boxes with a lid, a hand hole and a red-year label. The crate, as an office would stack it — shown single and two high.' },
  { letter: 'K', id: 'crtMonitor', name: 'CRT MONITORS', slot: 'stack', paint: crtMonitor,
    note: 'Beige monitors with green phosphor and a blinking cursor, piled two high like the IT corridor. Glass when it breaks.' },
  { letter: 'L', id: 'officeChair', name: 'OFFICE CHAIR', slot: 'roll', tall: 1.4, paint: officeChair,
    note: 'Cobalt task chair on a five-star base, casters turning and the back swivelling as it comes. It rolls UPRIGHT — today’s chair cartwheels like a barrel.' },
  { letter: 'M', id: 'mailCart', name: 'MAIL CART', slot: 'roll', tall: 1.35, paint: mailCart,
    note: 'Teal canvas trolley of internal mail — envelopes, an airmail, a parcel — bumping on its casters. Push handle trailing.' },
  { letter: 'N', id: 'mopBucket', name: 'MOP BUCKET', slot: 'roll', tall: 1.4, paint: mopBucket,
    note: 'Janitor’s yellow bucket on a dolly, wringer and mop, suds slopping over the front on the bumps.' },
  { letter: 'O', id: 'avTrolley', name: 'AV TROLLEY', slot: 'roll', tall: 1.8, paint: avTrolley,
    note: 'Overhead projector on a black AV cart with binders underneath, lamp on and throwing a buzzing beam at the hero.' },
  { letter: 'P', id: 'velvetRope', name: 'VELVET ROPE', slot: 'hurdle', paint: velvetRope,
    note: 'Two brass stanchions and a red rope, sagging and swaying — the lobby keeps its own queue. Same jump as the razor hurdle.' },
  { letter: 'Q', id: 'drawingPins', name: 'DRAWING PINS', slot: 'floor', paint: drawingPins,
    note: 'A spilled box of thumbtacks, points up, in Memphis colours: the office’s spike plate. A floor hazard the office has never had.' },
  { letter: 'R', id: 'dotMatrix', name: 'DOT-MATRIX PRINTER', slot: 'target', tall: 1.7, paint: dotMatrix,
    note: 'The printer you DESTROY 5 of, redrawn: a green-bar printout feeding up and curling over, the head chattering under its smoked cover. Beige, red and green lights.' },
  { letter: 'S', id: 'paperPlane', name: 'PAPER PLANE', slot: 'high', paint: paperPlane,
    note: 'A folded memo — blue rules, red margin, URGENT stamp — gliding in nose-first at head height. Replaces the songbird.' },
  { letter: 'T', id: 'stripLight', name: 'STRIP LIGHT', slot: 'low', tall: 4, detailCrop: 20, paint: stripLight,
    note: 'A fluorescent fitting hanging low on its chains, swinging and flickering, sparking at one end. Slide under. Replaces the drone. The chains are art above the box.' },
];

// ============================================================== the scenes
const CAND_X = 122; // box left in world units from the frame's left edge; the hero runs at PLAYER_X 59
const STACK_X = 170;

// One candidate at its world position: contact shadow and red tick as the run
// draws them for a ground hazard (none for bedded), then the art in its
// envelope, clipped to the envelope as the prop raster would be.
function placeCandidate(ctx, cand, boxX, t, n = 1) {
  const slot = OFFICE_OBSTACLE_SLOTS[cand.slot];
  const env = slotEnvelope(cand);
  const alt = slot.alt || 0;
  const ground = !alt;
  if (ground && !slot.bedded) {
    if (slot.splitFeet) {
      for (const px of [boxX + 2, boxX + env.bw - 2]) drawSoftContactShadow(ctx, px, GROUND_Y - 1, 3.5, 2.4, { alpha: 0.34 });
      ctx.fillStyle = 'rgba(224,72,72,0.32)';
      ctx.fillRect(boxX, GROUND_Y - 1, 4, 1);
      ctx.fillRect(boxX + env.bw - 4, GROUND_Y - 1, 4, 1);
    } else {
      drawSoftContactShadow(ctx, boxX + env.bw / 2, GROUND_Y - 1, Math.max(5, env.bw * 0.68), 2.4, { alpha: 0.34 });
      ctx.fillStyle = 'rgba(224,72,72,0.32)';
      ctx.fillRect(boxX, GROUND_Y - 1, env.bw, 1);
    }
  }
  const bob = alt ? Math.round(Math.sin(t * 3 + 1.3) * 2) : 0;
  const bottom = GROUND_Y - alt - (slot.artLift || 0) + bob + (slot.bedded ? 2 : 0);
  const step = Math.round(env.bh * 4 / 3) - 2;
  for (let i = 0; i < n; i++) {
    ctx.save();
    if (slot.bedded) {
      // Flush: the road's top edge swallows the foot of the plate.
      ctx.beginPath();
      ctx.rect(boxX - 20, GROUND_Y - 200, env.bw + 40, 200);
      ctx.clip();
    }
    const ox = boxX - Math.floor((env.w - env.bw) / 2);
    const oy = bottom - env.h - i * step;
    ctx.translate(ox, oy);
    ctx.beginPath();
    ctx.rect(0, 0, env.w, env.h);
    ctx.clip();
    cand.paint(ctx, env.w, env.h, t);
    ctx.restore();
  }
}

export const OFFICE_OBSTACLE_FLOORS = Object.freeze([
  { floor: 'lobby', label: '8-1 LOBBY', camX: 900 },
  { floor: 'open', label: '8-2 FLOOR 23', camX: 2400 },
  { floor: 'exec', label: '8-3 FLOOR 88', camX: 1600 },
]);
export const OFFICE_OBSTACLE_CROP = Object.freeze({ top: 118, h: 130, gap: 2 });
const SCROLL = 110; // world px/s — the room passes behind while hero and hazard hold still

// Three strips of the real production frame, one per floor, cropped to the lane.
function threeFloors(ctx, t, world) {
  const { top, h, gap } = OFFICE_OBSTACLE_CROP;
  OFFICE_OBSTACLE_FLOORS.forEach((fl, i) => {
    ctx.save();
    const y0 = i * (h + gap);
    ctx.beginPath();
    ctx.rect(0, y0, 480, h);
    ctx.clip();
    ctx.translate(0, y0 - top);
    const camX = fl.camX + ((t * SCROLL) % 4000);
    drawOfficeProductionScene(ctx, t, { floor: fl.floor, hazards: [], world }, false, camX);
    ctx.restore();
    ctx.save();
    ctx.font = '600 7px ui-monospace, Menlo, monospace';
    ctx.fillStyle = 'rgba(16,14,22,0.72)';
    ctx.fillRect(4, y0 + 4, ctx.measureText(fl.label).width + 6, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fl.label, 7, y0 + 11.5);
    ctx.restore();
  });
}
export const OFFICE_OBSTACLE_LANE_H = 3 * OFFICE_OBSTACLE_CROP.h + 2 * OFFICE_OBSTACLE_CROP.gap;

export function drawOfficeObstacleLane(ctx, t, cand) {
  const stacks = OFFICE_OBSTACLE_SLOTS[cand.slot].stack;
  threeFloors(ctx, t, (c, tt) => {
    placeCandidate(c, cand, CAND_X, tt, 1);
    if (stacks) placeCandidate(c, cand, STACK_X, tt, 2);
  });
}

// The control: what the office deals today, through the real run painter.
const CONTROL = [
  ['cactus', 6], ['crate', 28], ['chair', 80], ['printer', 100], ['fireBarrel', 120], ['boomBarrier', 142],
  ['bananaPeel', 166], ['paperwork', 186], ['drone', 200], ['buzzbird', 222],
];
let controlEntities = null;
export function drawOfficeObstacleControl(ctx, t) {
  if (!controlEntities) controlEntities = CONTROL.map(([type, x]) => makeObstacle(type, x));
  threeFloors(ctx, t, (c, tt) => {
    for (const e of controlEntities) drawWorldEntity(c, e, 0, tt, null, {});
  });
}
