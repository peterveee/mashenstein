// CORPORATE KOMBAT — freestanding fire points for the floor-23 alarms (lab, 15 Oct 2026).
// Peter: "the fire alarms are suspended in mid air, what can we do about that?"
//
// office-2's mission is PULL 3 FIRE ALARMS. The alarm is the lane obstacle `fireAlarm`
// (game/entities.js: box 10x11 at alt 36 — a hop's height), drawn by officeProps.js. Each
// candidate stands the SAME alarm, at the SAME height, on something that reaches the floor,
// so the run does not change at all: hop into it or shoot it. The stand is scenery: it is
// drawn behind the hero, thin where the hero's body passes, and never solid at his height,
// so it does not read as a thing to jump over.
//
// Drawn in world units in the Ligne '89 hand of officeProps.js: one ink, flat fills, one lit
// sliver and one shade band per body. The alarm itself is the production entity drawn by
// drawWorldEntity (pulled = its `fireAlarmPulled` skin). Nothing here is wired into the run.
import { getActiveFrame, defaultFrame } from '../engine/frame.js';
import { setPresentationFrame } from '../engine/renderer.js';
import { GROUND_Y, applyWorld, worldYForScreenY } from '../engine/camera.js';
import { officePack } from '../engine/stylePacks/officeLigne.js';
import { box, poly, line, circ, ell, rbox, rrPath, pen, letters } from '../engine/stylePacks/officeLigne/line.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H, HERO_CENTER_OFF } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

export const FIRE_STAND_CANDIDATES = [
  { id: 'now', letter: 'NOW', name: 'hanging in the air',
    note: 'As shipped: the call point at a hop’s height with nothing under it.' },
  { id: 'pole', letter: 'A', name: 'red fire post',
    note: 'A slim red pole on a weighted charcoal foot, the call point bolted to its top. The thinnest thing that reaches the floor.' },
  { id: 'board', letter: 'B', name: 'FIRE POINT board + extinguisher',
    note: 'A charcoal post carrying a white FIRE POINT board behind the call point, with a small extinguisher clipped to the post at knee height. Most “fire point”; busiest.' },
  { id: 'chrome', letter: 'C', name: 'chrome stanchion',
    note: 'A queue-barrier post — chrome pole, domed chrome foot — with the call point on a bracket at the top. Office furniture rather than fire kit.' },
  { id: 'sign', letter: 'D', name: 'FIRE POINT signpost',
    note: 'A slim charcoal signpost with a red FIRE POINT plate across its top and the call point on the post under it. The plate says what it is from a distance.' },
  { id: 'cart', letter: 'E', name: 'fire cart',
    note: 'A red sack-truck with two little wheels and an extinguisher strapped on, its handle mast running up to the call point. Most character; its foot is the widest thing at the hero’s shins.' },
  { id: 'pillar', letter: 'F', name: 'on a pillar',
    note: 'A floor-to-ceiling column in floor 23’s lilac, standing on the floor line, the call point on its face. Reads as the building; the hero runs in front of it.' },
];

// ------------------------------------------------------------------ palette (officeProps.js)
const INK = '#1f1d26';
const LW = 0.55, LWI = 0.32, LWF = 0.2;
const RED = '#e0203a', RED_DK = '#a3162c', RED_LT = '#ff6a7c';
const STEEL = '#c9ced8', STEEL_DK = '#8e95a4', STEEL_LT = '#f2f4f8';
const CHAR = '#3a3846', CHAR_DK = '#2a2833', CHAR_LT = '#55536a';
const PAPER = '#ffffff', PAPER_DK = '#e2dee8';
const LEMON = '#f6df4a';
const COLUMN = '#cfc6de', COLUMN_DK = '#bdb2cf', COLUMN_LT = '#e4ddef';

const G = GROUND_Y;
const ALARM_ALT = 36;            // entities.js fireAlarm alt
const ALARM_TOP = ALARM_ALT + 11; // box top
const V = 210;                   // floor 23's lane speed, world px/s (BASE_SPEED x speedBonus)
const SPACING = 132;             // stands in the scrolling tile
const T_HIT = 0.15;              // takeoff to contact: his chest meets the call point on the rise
const JV = 320, GRAV = 900;      // player.js BASE_JUMP_V, GRAVITY
const AIR = 2 * JV / GRAV;
const CAM0 = 7000;               // a stretch of floor 23 with desks and rooms behind

// A flat body: fill, the lit sliver and shade band clipped inside, then the ink outline.
function body(c, path, fill, inner = null, ink = INK, lw = LW) {
  c.save(); c.beginPath(); path(c); c.fillStyle = fill; c.fill();
  if (inner) { c.clip(); inner(c); }
  c.restore();
  c.beginPath(); path(c); pen(c, ink, lw); c.stroke();
}
const rr = (x, y, w, h, r) => (p) => rrPath(p, x, y, w, h, r);
const rect = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const Y = (alt) => G - alt;

// A pole from the floor (or `from`) up to `to`, lit down its left, shaded down its right.
function pole(c, cx, w, from, to, fill, lit, shade) {
  body(c, rect(cx - w / 2, Y(to), w, to - from), fill, (p) => {
    box(p, cx - w / 2, Y(to), w * 0.3, to - from, lit);
    box(p, cx + w / 2 - w * 0.32, Y(to), w * 0.32, to - from, shade);
  }, INK, LWI);
}
// The soft contact every standing thing gets — kept small and flat.
function contact(c, cx, rx) { ell(c, cx, G - 0.2, rx, 0.9, 'rgba(31,29,38,0.18)'); }

// A small extinguisher, its base at alt `a0`, `h` tall, centred on cx.
function extinguisher(c, cx, a0, h = 9, w = 3.6) {
  const top = a0 + h;
  body(c, rr(cx - w / 2, Y(top), w, h, w * 0.45), RED, (p) => {
    box(p, cx + w / 2 - 1.1, Y(top), 1.1, h, RED_DK);
    box(p, cx - w / 2 + 0.4, Y(top) + 1, 0.6, h - 2, RED_LT);
  }, INK, LWI);
  box(c, cx - w / 2, Y(top) + h * 0.38, w, h * 0.22, PAPER, INK, LWF);
  box(c, cx - 0.5, Y(top) - 1.0, 1.0, 1.1, CHAR, INK, LWF);
  line(c, cx - 0.3, Y(top) - 1.1, cx + 1.7, Y(top) - 1.6, CHAR_DK, 0.45);
  // The hose down its side.
  c.beginPath(); c.moveTo(cx + 0.4, Y(top) - 0.6);
  c.quadraticCurveTo(cx + w / 2 + 1.4, Y(top - 1), cx + w / 2 + 0.6, Y(a0 + h * 0.35));
  pen(c, INK, 0.5); c.stroke();
}

// The stand, drawn behind the hero; the alarm entity goes over it. `sx` is the alarm box's
// left edge in screen-world x (already minus camX).
function drawStand(c, id, sx, t) {
  const cx = sx + 5;
  if (id === 'now') return;
  if (id === 'pole') {
    contact(c, cx, 4.6);
    body(c, (p) => { p.moveTo(cx - 4, G); p.lineTo(cx - 3.2, G - 1.5); p.lineTo(cx + 3.2, G - 1.5); p.lineTo(cx + 4, G); p.closePath(); },
      CHAR, (p) => box(p, cx + 1.2, G - 2, 3, 2, CHAR_DK), INK, LWI);
    pole(c, cx, 1.8, 1.5, ALARM_ALT + 1, RED, RED_LT, RED_DK);
    box(c, cx - 1.8, Y(ALARM_ALT + 1.2), 3.6, 1.2, STEEL, INK, LWF);
    return;
  }
  if (id === 'board') {
    contact(c, cx, 6);
    // Inverted-T foot: a flat bar, ankle-high at most.
    body(c, rr(cx - 6, G - 1.3, 12, 1.3, 0.4), CHAR, (p) => box(p, cx - 6, G - 0.5, 12, 0.5, CHAR_DK), INK, LWI);
    pole(c, cx, 1.6, 1.3, 34, CHAR, CHAR_LT, CHAR_DK);
    // The board: white, red border, the FIRE POINT header above the call point.
    const bw = 15, b0 = 33.5, b1 = 58;
    body(c, rect(cx - bw / 2, Y(b1), bw, b1 - b0), PAPER, (p) => {
      box(p, cx + bw / 2 - 1.6, Y(b1), 1.6, b1 - b0, PAPER_DK);
    }, INK, LWI);
    box(c, cx - bw / 2 + 0.8, Y(b1) + 0.8, bw - 1.6, 7.2, RED, INK, LWF);
    letters(c, 'FIRE', cx, Y(b1) + 4.0, 2.6, { ink: PAPER, weight: 700, align: 'center', track: 0.2 });
    letters(c, 'POINT', cx, Y(b1) + 7.1, 2.6, { ink: PAPER, weight: 700, align: 'center', track: 0.2 });
    // Clip bracket and the extinguisher on the post at knee height.
    box(c, cx - 0.4, Y(14), 2.4, 1.0, STEEL, INK, LWF);
    extinguisher(c, cx + 3.3, 4.5, 10, 3.6);
    return;
  }
  if (id === 'chrome') {
    contact(c, cx, 5.4);
    body(c, (p) => { p.moveTo(cx - 5, G); p.quadraticCurveTo(cx - 4.6, G - 2.8, cx, G - 2.9); p.quadraticCurveTo(cx + 4.6, G - 2.8, cx + 5, G); p.closePath(); },
      STEEL, (p) => { box(p, cx + 1.6, G - 3, 4, 3, STEEL_DK); box(p, cx - 3.4, G - 2.4, 1.6, 0.6, STEEL_LT); }, INK, LWI);
    pole(c, cx, 1.9, 2.6, ALARM_ALT + 1, STEEL, STEEL_LT, STEEL_DK);
    // Ferrule halfway, the bracket plate under the alarm.
    box(c, cx - 1.3, Y(18.5), 2.6, 1.1, STEEL_DK, INK, LWF);
    body(c, rr(cx - 3.6, Y(ALARM_ALT + 1.6), 7.2, 1.6, 0.5), STEEL, (p) => box(p, cx - 3.6, Y(ALARM_ALT + 0.8), 7.2, 0.8, STEEL_DK), INK, LWF);
    // A glint on the chrome.
    const gx = cx - 0.35, gy = Y(27);
    poly(c, [gx, gy - 1.2, gx + 0.3, gy - 0.3, gx + 1.0, gy, gx + 0.3, gy + 0.3, gx, gy + 1.2, gx - 0.3, gy + 0.3, gx - 1.0, gy, gx - 0.3, gy - 0.3], '#ffffff');
    return;
  }
  if (id === 'sign') {
    contact(c, cx, 3.6);
    box(c, cx - 2.6, G - 1.1, 5.2, 1.1, CHAR_DK, INK, LWF);
    pole(c, cx, 1.5, 1.0, 59, CHAR, CHAR_LT, CHAR_DK);
    box(c, cx - 0.75, Y(59.6), 1.5, 0.6, CHAR_DK, INK, LWF);
    // The plate across the top, on two clamps.
    const pw = 25, p1 = 58, p0 = 51;
    box(c, cx - 1.4, Y(p1 - 1), 2.8, 1, STEEL, INK, LWF);
    box(c, cx - 1.4, Y(p0 + 1.8), 2.8, 1, STEEL, INK, LWF);
    body(c, rr(cx - pw / 2, Y(p1), pw, p1 - p0, 0.6), RED, (p) => box(p, cx - pw / 2, Y(p0 + 1.2), pw, 1.2, RED_DK), INK, LWI);
    rbox(c, cx - pw / 2 + 0.8, Y(p1) + 0.8, pw - 1.6, p1 - p0 - 1.6, 0.4, null, PAPER, 0.3);
    letters(c, 'FIRE POINT', cx, Y(p0) - 2.2, 2.5, { ink: PAPER, weight: 700, align: 'center', track: 0.2 });
    return;
  }
  if (id === 'cart') {
    // A sack truck stood upright: nose plate on the floor, wheels behind, the mast up.
    contact(c, cx, 6);
    const mx = cx + 2.6; // the mast, a little behind the call point's centre
    // Mast and the frame's two rails as one red bar, handle loop at the top under the alarm.
    pole(c, mx, 1.6, 1.4, ALARM_ALT + 0.5, RED, RED_LT, RED_DK);
    box(c, cx - 2.2, Y(ALARM_ALT + 1.2), 4.8, 1.2, STEEL, INK, LWF);
    // Nose plate.
    body(c, rect(cx - 5.4, G - 1.2, 9.6, 1.2), STEEL, (p) => box(p, cx - 5.4, G - 0.5, 9.6, 0.5, STEEL_DK), INK, LWI);
    // The extinguisher strapped to the frame, in front of the mast.
    extinguisher(c, cx - 1.0, 1.4, 12, 4.4);
    box(c, cx - 3.4, Y(9.6), 6.4, 0.8, CHAR_DK, INK, LWF);
    // Wheels behind.
    const wr = 2.3;
    circ(c, mx + 2.2, G - wr, wr, INK);
    circ(c, mx + 2.2, G - wr, wr * 0.42, STEEL_DK);
    const a = 0.6; // stood still
    circ(c, mx + 2.2 + Math.cos(a) * wr * 0.66, G - wr + Math.sin(a) * wr * 0.66, wr * 0.2, STEEL_LT);
    line(c, mx, Y(wr), mx + 2.2, Y(wr), INK, 0.5);
    return;
  }
  if (id === 'pillar') {
    // Floor to ceiling, beyond the top of the frame; drawn on the floor line, behind the lane.
    const pw = 15, top = 260;
    body(c, rect(cx - pw / 2, Y(top), pw, top), COLUMN, (p) => {
      box(p, cx - pw / 2, Y(top), 1.6, top, COLUMN_LT);
      box(p, cx + pw / 2 - 3.2, Y(top), 3.2, top, COLUMN_DK);
    }, INK, LWI);
    // Skirting, as the wall's.
    box(c, cx - pw / 2, G - 2.4, pw, 2.4, CHAR_DK, INK, LWF);
    // A backing plate behind the call point, and a little sign above it.
    rbox(c, cx - 5.6, Y(ALARM_ALT + 13.5), 11.2, 14.2, 0.6, PAPER_DK, INK, LWF);
    box(c, cx - 6.4, Y(ALARM_ALT + 18.4), 12.8, 3.6, RED, INK, LWF);
    letters(c, 'FIRE ALARM', cx, Y(ALARM_ALT + 15.7), 1.45, { ink: PAPER, weight: 700, align: 'center', track: 0.1 });
    return;
  }
}

// One stand + its alarm, at world x `wx` (alarm box left edge).
const alarms = new Map();
function alarmEntity(wx) {
  if (!alarms.has(wx)) alarms.set(wx, makeObstacle('fireAlarm', wx));
  return alarms.get(wx);
}
function drawPoint(c, id, wx, camX, t, pack, pulled) {
  const e = alarmEntity(wx);
  drawStand(c, id, Math.round(wx - camX), t);
  e.skin = pulled ? 'fireAlarmPulled' : undefined;
  e.pulled = pulled;
  drawWorldEntity(c, e, camX, t, pack, {});
}

const jumpAlt = (s) => (s > 0 && s < AIR) ? JV * s - GRAV / 2 * s * s : 0;

const packs = new Map();
function floor23() {
  if (!packs.has(2)) packs.set(2, officePack({ stageIndex: 2, gallery: true }));
  return packs.get(2);
}

// The production floor-23 scene (drawOfficeProductionScene's set-up), with the hero's pose in
// our hands so he can hop into the call point.
function scene(ctx, t, camX, world, hero) {
  const previous = getActiveFrame();
  const frame = defaultFrame();
  setPresentationFrame(frame);
  try {
    const pack = floor23(), cab = CABINET_BY_ID.office;
    const tourDistance = 26208, zoom = 2, xOffset = 0;
    const frameShift = frame.groundScreenY - GROUND_Y;
    ctx.save();
    ctx.translate(0, frameShift);
    pack.bg(ctx, t, camX, cab, tourDistance, null, 0, { portrait: false, stageIndex: 2, frameShiftY: frameShift,
      worldZoom: zoom, worldPan: 0, worldFloorY: GROUND_Y, worldXOffset: xOffset,
      backgroundXOffset: xOffset, backgroundZoom: 1 });
    ctx.restore();
    ctx.save();
    applyWorld(ctx, zoom, 0, GROUND_Y, xOffset);
    pack.ground(ctx, camX, cab, [], [], t, 480 / zoom, null, null,
      worldYForScreenY(frame.height, zoom, 0, GROUND_Y) + 8);
    world(ctx, pack);
    const alt = hero.alt || 0;
    const pose = alt > 0
      ? { kind: 'jump', grounded: false, vy: hero.vy, time: t, facing: 1 }
      : { kind: 'run', phase: t * 1.6 % 1, time: t, grounded: true, facing: 1 };
    drawToon(ctx, 'lorenzo', pose, PLAYER_X, GROUND_Y - alt, HERO_DRAW_H);
    ctx.restore();
    pack.post(ctx);
  } finally { setPresentationFrame(previous); }
}

// IN THE LANE: the floor scrolls at run speed, a fire point every SPACING; Lorenzo hops
// into each one (it pulls as his chest meets it) and runs on past the pulled one.
export function drawFireStandRun(ctx, t, id) {
  const camX = CAM0 + (t % 60) * V;
  const heroCx = camX + PLAYER_X + HERO_CENTER_OFF;
  const first = Math.floor((camX - 40) / SPACING) * SPACING;
  // The nearest stand decides the hop: contact when the call point's centre reaches him.
  let alt = 0, vy = 0;
  for (let wx = first; wx < camX + 280; wx += SPACING) {
    const u = (wx + 5 - heroCx) / V;          // seconds until contact
    const s = T_HIT - u;                      // seconds since takeoff
    if (s > 0 && s < AIR) { alt = jumpAlt(s); vy = -(JV - GRAV * s); }
  }
  scene(ctx, t, camX, (c, pack) => {
    for (let wx = first; wx < camX + 280; wx += SPACING) drawPoint(c, id, wx, camX, t, pack, wx + 5 < heroCx);
  }, { alt, vy });
}

// STILL: the camera held; Lorenzo running on the spot beside a waiting fire point, and a
// pulled one further on (handle down, strobe going).
export function drawFireStandStill(ctx, t, id) {
  const camX = CAM0 + 900;
  scene(ctx, t, camX, (c, pack) => {
    drawPoint(c, id, camX + PLAYER_X + 34, camX, t, pack, false);
    drawPoint(c, id, camX + PLAYER_X + 112, camX, t, pack, true);
  }, { alt: 0 });
}
