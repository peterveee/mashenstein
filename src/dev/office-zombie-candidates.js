// CORPORATE KOMBAT — the crypt's zombies at work (lab). Peter, 15 Oct 2026, after the running-gag
// talk (something from an earlier cabinet turning up in a later one): "How to incorporate our
// zombie character/s from the crypt in the art style of the corporate level? Bake-off". SHIPPED
// the same day ("ok, ship them"): engine/stylePacks/officeLigne/zombies.js, whose painter this
// sheet uses, so the top tiles are the game.
//
// The rounds, all 15 Oct:
// - A redraw in the office's own hand was "not recognisable as being from the earlier level", so
//   every candidate since is the crypt's own drawing with the office's look laid on top: INK, LIGHT,
//   SOFT (AS IS, A, B, C below). C picked: "c is good".
// - "extremely chunky vs the office workers. can we play with the proportions" — P1–P3, then
//   "would they be shorter though? perhaps even have a slightly longer torso" — Q1–Q3, then "q2 at
//   51 (longer legs) ... the outstretched [arm] is a bit too thick" — R, shipped.
// - Three zombies: the usher in floor 23's lift near the start; the clerk's purple-suited variant
//   shuffling toward the two at lunch in the staff canteen; the clerk as EMPLOYEE OF THE MONTH on a
//   the wall over the middle of a cube farm, for the three months before this one, and the clerk
//   himself at the water cooler at the end of that farm ("I want the employee of the month in the
//   middle of a cube farm and for the water cooler at the end of that cube farm to have the zombie
//   next to it"). The copier went for room round the coolers. The
//   gardener is out: "i don't think the gardener makes sense in this context".
import { box } from '../engine/stylePacks/officeLigne/line.js';
import { setOfficeMidExtra } from '../engine/stylePacks/officeLigne/index.js';
import { drawOfficeZombie, zombieMeetings, ZOMBIE_TWEAKS, ZOMBIE_SHAPE, TEMP_OUTFIT } from '../engine/stylePacks/officeLigne/zombies.js';
import { MID_BASE, OFFICE_ZOOM } from '../engine/stylePacks/officeClimb.js';
import { OFFICE_CORRIDORS, officeLandmarks } from '../engine/stylePacks/officeLigne/progression.js';
import { drawOfficeProductionScene } from './office-production.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { totalDistFor, BASE_SPEED } from '../game/layout.js';

// The proportions tried on the way to R (head scale, leg and body length, width, height in the
// furniture row, where an office worker is 51).
export const ZOMBIE_SHAPES = {
  crypt: { head: 1, legs: 1, slim: 1, h: 51 },
  leaner: { head: 0.8, legs: 1.25, slim: 0.92, h: 54 },
  office: { head: 0.68, legs: 1.4, slim: 0.88, h: 56 },
  tall: { head: 0.6, legs: 1.55, slim: 0.82, h: 60 },
  short: { head: 0.68, legs: 1.4, slim: 0.88, h: 48 },
  body: { head: 0.68, legs: 1.2, torso: 1.15, slim: 0.88, h: 48 },
  longBody: { head: 0.68, legs: 1.08, torso: 1.25, slim: 0.88, h: 46 },
  r: ZOMBIE_SHAPE,
};

const nearest = (list, X) => list.reduce((a, b) => (Math.abs(b.x - X) < Math.abs(a.x - X) ? b : a));
const itemsOf = (f, kind) => f.mid.items.filter((it) => it.kind === kind);

// the earlier rounds: the clerk at floor 23's first cooler, in front of the copier
function atCooler(tweak, shape = ZOMBIE_SHAPES.crypt) {
  return (g, f, P, pass, t) => {
    if (pass !== 'front') return;
    const c = nearest(itemsOf(f, 'cooler'), 220);
    g.save(); g.translate(c.x + 34, MID_BASE);
    drawOfficeZombie(g, t, 'clerk', { tweak, shape, ink: P.inkM });
    g.restore();
  };
}
// several side by side along floor 23, in front of the desks and their workers: [shape, role, outfit]
const lineAlong = (cast) => (g, f, P, pass, t) => {
  if (pass !== 'front') return;
  cast.forEach(([k, role, outfit], i) => {
    g.save(); g.translate(150 + i * 82, MID_BASE);
    drawOfficeZombie(g, t + i * 0.9, role, { shape: ZOMBIE_SHAPES[k], outfit, ink: P.inkM });
    g.restore();
  });
};
const shapeRow = (keys) => lineAlong(keys.map((k) => [k, 'clerk']));

// the three side by side: as the crypt draws them in its lane (left, 28 units at the run's zoom 2
// = 56 px), and as they stand in the office (right)
function lineup(g, t) {
  box(g, 0, 0, 240, 270, '#2f2942'); box(g, 0, 214, 240, 56, '#463d5c');
  box(g, 240, 0, 240, 270, '#ece4f0'); box(g, 240, 214, 240, 56, '#b9b4cc');
  [['usher'], ['clerk', TEMP_OUTFIT], ['clerk']].forEach(([role, outfit], k) => {
    g.save(); g.translate(56 + k * 70, 214);
    drawOfficeZombie(g, t + k * 0.7, role, { shape: ZOMBIE_SHAPES.crypt, h: 56, tweak: ZOMBIE_TWEAKS.asis, outfit });
    g.restore();
    g.save(); g.translate(298 + k * 70, 214);
    drawOfficeZombie(g, t + k * 0.7, role, { outfit });
    g.restore();
  });
}

// The gallery tours floor 23 over this length (office-production.js); the game meets the cooler
// and the board at their fractions of whatever the stage's length is.
const TOUR = 26208;
// floor 23 as long as it really is (100 s at Corporate Kombat's speed: layout.js totalDistFor), at
// 100% and at 80% ASSIST SPEED
const OFFICE = CABINET_BY_ID.office, SPEED = BASE_SPEED * (1 + (OFFICE.speedBonus || 0));
const REAL = totalDistFor(SPEED, 100, OFFICE.mechanic), SHORT = totalDistFor(SPEED * 0.8, 100, OFFICE.mechanic);
const MEET = zombieMeetings('open', REAL), MEET_SHORT = zombieMeetings('open', SHORT);
const CANTEEN = officeLandmarks('open', 0, TOUR).filter((l) => l.kind === 'canteen').map((l) => l.worldX - 128 / l.rate)[0];

export const OFFICE_ZOMBIE_CANDIDATES = [
  // ---- SHIPPED: the game's own floor 23, where each is met
  { letter: 'SHIPPED 1', name: 'the usher in the lift near the start', floor: 'open', cam: 881, note: 'Floor 23’s first lift bank: the usher as lift attendant in whichever car is open, turned to the panel with its hand on the buttons, lantern lit. No poster behind it, as with the Martian.' },
  { letter: 'SHIPPED 2', name: 'the purple clerk in the staff canteen', floor: 'open', cam: (t) => CANTEEN - 900 + (t % 12) / 12 * 1800, note: 'The clerk’s colleague (raspberry suit, teal tie, auburn hair, a mug) to the left of the two at lunch, creeping toward them as the canteen goes by and stopping well short of their booth. The counter now stands at a counter’s height. (The camera runs past it here, over and over.)' },
  { letter: 'SHIPPED 3', name: 'EMPLOYEE OF THE MONTH over the start of a cube farm', floor: 'open', tour: REAL, cam: MEET.board, note: 'The clerk three months running — the three before this one by the real calendar — on the plain wall over the first desks of a cube farm (its print taken down), at least a picture wall clear of the canteen.' },
  { letter: 'SHIPPED 3a', name: '… and beyond the farm, the clerk himself at the cooler', floor: 'open', tour: REAL, cam: MEET.cooler, note: 'The water cooler past the end of the same farm, the clerk at it; the copier by that cooler and the radiators that pass behind him taken away.' },
  { letter: 'SHIPPED 3b', name: 'the same at 80% ASSIST SPEED', floor: 'open', tour: SHORT, cam: MEET_SHORT.board, note: 'A floor this short has no cube farm the rooms leave standing with plain wall over it, so one is given up: the board in a plain wall bay, the desks under it cleared, and a cooler of the clerk’s own with him at it.' },
  { letter: 'R', name: 'R, and the three in it', floor: 'open', u: 300, X: 260, note: 'Left to right: Q2 as it was (48); R, Q2 drawn the same size but stood 51 tall on longer legs, its reaching sleeve thinner (shipped); the clerk’s variant; the usher.', extra: lineAlong([['body', 'clerk'], ['r', 'clerk'], ['r', 'clerk', TEMP_OUTFIT], ['r', 'usher']]) },
  // ---- earlier rounds
  { letter: '—', name: 'the three, crypt and office', note: 'Left, the usher, the clerk’s variant and the clerk drawn as the crypt draws them, at its lane size. Right, as shipped.', paint: lineup },
  { letter: 'AS IS', name: 'the crypt’s drawing, unchanged', floor: 'open', u: 296, X: 220, note: 'The crypt clerk dropped in as drawn, at a worker’s height, by the cooler. For comparison.', extra: atCooler(ZOMBIE_TWEAKS.asis) },
  { letter: 'A', name: 'INK — the floor’s thin line', floor: 'open', u: 296, X: 220, note: 'The same drawing with its outline swapped for floor 23’s ink at the office’s line weight.', extra: atCooler(ZOMBIE_TWEAKS.ink) },
  { letter: 'B', name: 'INK + LIGHT — lit like the office’s people', floor: 'open', u: 296, X: 220, note: 'A, plus the office’s flat light: a lit rim down the window side and a shade band down the other, cut from its own silhouette.', extra: atCooler(ZOMBIE_TWEAKS.lit) },
  { letter: 'C', name: 'INK + LIGHT + SOFT · PICKED', floor: 'open', u: 296, X: 220, note: 'B with its colours eased toward floor 23’s 80s pastels: a little less saturated, a little lighter. Peter, 15 Oct: “c is good”.', extra: atCooler(ZOMBIE_TWEAKS.soft) },
  { letter: 'P', name: 'C’s proportions side by side: CRYPT, P1, P2, P3', floor: 'open', u: 300, X: 260, note: 'Left to right: the crypt’s own (51 tall), P1 leaner (head 0.8, legs ×1.25, 54), P2 office (head 0.68, legs ×1.4, 56), P3 tall (head 0.6, legs ×1.55, 60).', extra: shapeRow(['crypt', 'leaner', 'office', 'tall']) },
  { letter: 'Q', name: 'P2 shorter, side by side: P2, Q1, Q2, Q3', floor: 'open', u: 300, X: 260, note: 'Left to right: P2 (56), Q1 P2 at 48, Q2 48 with legs ×1.2 and the body ×1.15, Q3 46 with legs ×1.08 and the body ×1.25.', extra: shapeRow(['office', 'short', 'body', 'longBody']) },
];

// The camera that puts mid-row item `u` at screen x `X`.
const ROW_RATE = OFFICE_CORRIDORS.open.mid.factor * OFFICE_ZOOM;
export function drawOfficeZombieScene(ctx, t, cand) {
  if (cand.paint) { cand.paint(ctx, t); return; }
  const was = setOfficeMidExtra(cand.extra ? (g, f, P, pass) => cand.extra(g, f, P, pass, t) : null);
  try {
    const camX = typeof cand.cam === 'function' ? cand.cam(t) : cand.cam ?? (cand.u - cand.X) / ROW_RATE;
    drawOfficeProductionScene(ctx, t, { floor: cand.floor, hazards: [], tour: cand.tour }, false, camX);
  } finally { setOfficeMidExtra(was); }
}
