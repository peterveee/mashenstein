// CORPORATE KOMBAT's obstacles, floor by floor — drawn in the LIGNE ’89 hand
// of the room behind them (stylePacks/officeLigne): one ink at one weight,
// flat fills, one flat lit sliver and one flat shade band per body, saturated
// where the room is pastel.
//
// Picked 12 Oct 2026 from the office obstacle bake-off. Peter: "i want to avoid
// items that are in the background in level 2", then "i like your recos — yes
// destroy shredders". So each floor of the climb deals its own furniture and
// none of it is something already standing in that floor's backdrop:
//
//   slot (what it stands in for)   8-1 LOBBY        8-2 FLOOR 23      8-3 FLOOR 88
//   standing   (cactus)            wetFloorSign     coatStand         founderBust
//   big        (cactusBig)         waterDolly       snackMachine*     officeSafe
//   stacks     (crate)             newsBundle       archiveBox        briefcase
//   rolls      (chair, barrel)     mopBucket        mailCart          drinksTrolley
//   fire       (fireBarrel)        ashUrnFire       binFire           confidentialBin
//   hurdle     (boomBarrier)       velvetRope       drawingPins       velvetRopeGold
//   slide      (drone, paperwork)  artMobile        birthdayBunting   chandelier
//   high       (buzzbird)          paperPlane       partyBalloon      champagneCork
//   target     (printer)           —                fireAlarm         —
//
// * twice a crate's height and a crate's width since 15 Oct 2026: two units to clear.
//
// Floor 23's target was the shredder until 15 Oct; it is the fire alarm now
// (PULL 3 FIRE ALARMS), and the shredder painter is kept but dealt nowhere.
//
// The swap itself is data (OFFICE_FLOORS in data/cabinets.js); boxes and flags
// are in game/entities.js and copy the hazard each one stands in for, so the
// lane's spacing, tiers and answers are exactly what they were.
//
// Each painter is authored in its PAINTED ENVELOPE in world units — box x 4/3
// x PROP_TALL x PROP_VISUAL_SCALE, the size drawWorldEntity puts on screen —
// with the ground line at y = H. The registry wrapper scales that onto the
// raster props.js hands it. Like animals.js, nothing here imports props.js:
// it registers through the spreads at the top of that file.
import { outlined } from './outline.js';
import { box, poly, line, lines, circ, ell, rbox, rrPath, pen, fs, letters } from '../engine/stylePacks/officeLigne/line.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ palette
const INK = '#1f1d26';
const LW = 0.55; // outline
const LWI = 0.32; // interior line
const LWF = 0.2; // fine line
const RED = '#e0203a', RED_DK = '#a3162c';
const COBALT = '#3f5fd8', COBALT_DK = '#2b3f9c', COBALT_LT = '#7d95f2';
const LEMON = '#f6df4a', LEMON_DK = '#d1ae1c', LEMON_LT = '#fff4a6';
const PINK = '#ff6fae', PINK_DK = '#d8458a';
const TEAL = '#2fbcb0', TEAL_DK = '#1f8a82', TEAL_LT = '#86e3d9';
const LILAC = '#b39ae6';
const ORANGE = '#ff8a3d';
const STEEL = '#c9ced8', STEEL_DK = '#8e95a4', STEEL_LT = '#f2f4f8';
const CHAR = '#3a3846', CHAR_DK = '#2a2833';
const PAPER = '#ffffff', PAPER_DK = '#e2dee8';
const CARD = '#d99a5c', CARD_DK = '#b07440', CARD_LT = '#efbd85';
const BRASS = '#d9ae45', BRASS_DK = '#a37a22', BRASS_LT = '#f7e08a';
const MARBLE = '#f5f1eb', MARBLE_DK = '#d5cdc3';
const WATER = '#74c4ec', WATER_DK = '#4fa3d4', WATER_LT = '#c6ecfb';
const OXBLOOD = '#7a1f2b', OXBLOOD_DK = '#561320';
const PINKPAPER = '#f6bfae', PINKPAPER_DK = '#dd9d8a';

// ------------------------------------------------------------------ helpers
// A flat body: fill the path, draw its light and shade bands clipped inside it,
// then ink the outline over both — the one move every object here makes.
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

// Flat-shape flames: outlined red tongues, then orange and lemon cores with no
// ink. `f` of `n` drives the flicker, so every frame of the ring is its own.
function flames(c, cx, base, f, n = 8) {
  const p = (f / n) * TAU;
  const tongue = (x, w, hgt, ph, fill, ink) => {
    const tip = cx + x + Math.sin(p * 2 + ph) * 1.1;
    const hh = hgt * (0.84 + 0.16 * Math.sin(p * 3 + ph * 1.7));
    const x0 = cx + x - w, x1 = cx + x + w;
    c.beginPath();
    c.moveTo(x0, base);
    c.quadraticCurveTo(x0 + w * 0.15, base - hh * 0.62, tip, base - hh);
    c.quadraticCurveTo(x1 - w * 0.15, base - hh * 0.62, x1, base);
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

// A scrap of paper lifting off a fire on the ring, turning as it goes.
function rising(c, x, y, f, n, fill, mark) {
  const k = f / n;
  c.save();
  c.translate(x + k * 2.0, y - k * 5.0);
  c.rotate(k * 3.0);
  poly(c, [-0.9, -0.6, 0.9, -0.6, 0.9, 0.6, -0.9, 0.6], fill, INK, LWF);
  box(c, 0.4, -0.6, 0.5, 1.2, mark);
  c.restore();
}

// Cables from out of shot above to a hanging fitting. The slide-under props
// are tall envelopes that are mostly this: overdraw above the box, never solid.
function cable(c, x0, x1, y1, dashed = false) {
  c.save();
  if (dashed) c.setLineDash([0.9, 0.5]);
  line(c, x0, 0, x1, y1, dashed ? STEEL_DK : INK, dashed ? 0.55 : 0.35);
  c.restore();
}

// ============================================================ 8-1 THE LOBBY
// Morning: the cleaner's round and the deliveries.

// The wet floor sign, scaled into the cactus slot's envelope (17x25): an
// A-frame, a warning triangle, a man going over backwards, and the puddle.
function wetFloorSign(c, W, H, f) {
  const k = 1.25;
  c.save();
  c.translate((W - 13 * k) / 2, H - 17 * k);
  c.scale(k, k);
  const g = 17 - 0.3;
  ell(c, 4.6, g - 0.2, 4.4, 0.75, '#bfe6fa', '#4c97c8', 0.22);
  line(c, 1.6 + f * 0.5, g - 0.35, 2.8 + f * 0.5, g - 0.35, PAPER, 0.35);
  poly(c, [7.6, 0.8, 9.2, 0.8, 12.6, g, 10.9, g], LEMON_DK, INK, LWI);
  body(c, shape([4.0, 0.8, 8.6, 0.8, 11.0, g, 1.6, g]), LEMON, (p) => {
    poly(p, [4.0, 0.8, 4.9, 0.8, 2.6, g, 1.6, g], LEMON_LT);
    box(p, 0, g - 1.4, 13, 1.4, LEMON_DK);
  }, INK, LW / k);
  rbox(c, 5.2, 1.7, 2.4, 1.0, 0.5, INK);
  poly(c, [6.3, 3.6, 8.9, 8.2, 3.7, 8.2], PAPER, INK, LWI);
  line(c, 6.3, 5.2, 6.3, 6.8, INK, 0.45);
  circ(c, 6.3, 7.5, 0.25, INK);
  circ(c, 4.3, 10.0, 0.7, INK);
  lines(c, [4.8, 10.6, 6.9, 12.0, 6.9, 12.0, 8.6, 10.6, 6.9, 12.0, 8.4, 13.2,
    5.5, 11.0, 4.0, 12.4, 5.5, 11.0, 6.3, 9.4], INK, 0.42);
  line(c, 3.0, 14.4, 9.8, 14.4, INK, 0.36);
  c.restore();
}

// The water man's hand truck, three blue jugs on it, sloshing (big 23x26).
function waterDolly(c, W, H, f) {
  const g = H - 0.3;
  const p8 = (f / 8) * TAU;
  // The truck: twin uprights up to a looped handle, a toe plate, two big wheels.
  lines(c, [17.6, g - 2.0, 17.6, 1.4], INK, 1.2);
  lines(c, [17.6, g - 2.0, 17.6, 1.4], STEEL, 0.5);
  c.beginPath();
  c.moveTo(17.6, 1.6);
  c.quadraticCurveTo(17.6, 0.3, 19.4, 0.5);
  c.lineTo(20.2, 2.4);
  pen(c, INK, 1.0);
  c.stroke();
  box(c, 4.2, g - 2.1, 14.2, 1.3, STEEL_DK, INK, LWI);
  for (let k = 0; k < 3; k++) {
    // Each jug: upright, ridged, capped, its water level wobbling on its own beat.
    const y = 1.8 + k * 6.9;
    body(c, rr(5.4, y + 1.0, 11.4, 5.8, 1.6), WATER, (p) => {
      const lvl = y + 2.3 + Math.sin(p8 + k * 2.1) * 0.35;
      box(p, 5.4, y, 11.4, lvl - y, WATER_LT);
      line(p, 5.4, lvl, 16.8, lvl, '#3f8fc0', 0.3);
      box(p, 14.6, y, 3, 8, WATER_DK);
      box(p, 6.2, y + 2.0, 0.8, 3.6, 'rgba(255,255,255,0.85)');
      lines(p, [5.4, y + 4.4, 16.8, y + 4.4], 'rgba(30,90,150,0.55)', 0.3);
    });
    box(c, 9.3, y + 0.1, 3.6, 1.1, COBALT, INK, LWI);
  }
  // The strap across them, and the wheels.
  box(c, 4.8, 9.6, 13.0, 1.0, RED, INK, LWF);
  circ(c, 16.0, g - 2.4, 2.4, INK);
  circ(c, 16.0, g - 2.4, 1.1, STEEL_DK);
  line(c, 16.0, g - 2.4, 16.0 + Math.cos(p8) * 1.6, g - 2.4 + Math.sin(p8) * 1.6, STEEL_LT, 0.35);
}

// A bundle of the pink business papers, tied with twine (stack 16x15).
function newsBundle(c, W, H) {
  const g = H - 0.2;
  // Folded edges stepping in and out, the way a stack of newspapers never lines up.
  const EDGES = [[0.8, 15.0], [1.4, 15.4], [0.6, 14.8], [1.2, 15.6], [0.9, 15.1]];
  const top = 4.2;
  const step = (g - top) / EDGES.length;
  EDGES.forEach(([x0, x1], i) => {
    const y = top + i * step;
    body(c, rr(x0, y, x1 - x0, step + 0.2, 0.5), PINKPAPER, (p) => {
      box(p, x1 - 1.6, y, 2, step + 1, PINKPAPER_DK);
    }, INK, LWI);
    line(c, x0 + 0.8, y + step * 0.55, x1 - 2.4, y + step * 0.55, 'rgba(31,29,38,0.35)', 0.22);
  });
  // The top copy: masthead, headline, a photo.
  body(c, shape([1.2, top, 15.2, top, 14.4, 1.0, 2.0, 1.0]), PINKPAPER, null, INK, LWI);
  box(c, 3.0, 1.5, 6.4, 0.9, INK);
  box(c, 3.0, 2.8, 4.4, 0.5, 'rgba(31,29,38,0.55)');
  box(c, 10.2, 1.6, 3.0, 2.0, '#b88d84', INK, LWF);
  // The twine, crossed and knotted at the front.
  lines(c, [5.6, 0.9, 5.2, g, 10.8, 0.9, 11.2, g], '#7a5032', 0.45);
  line(c, 0.7, 9.6, 15.4, 9.6, '#7a5032', 0.45);
  circ(c, 8.2, 9.6, 0.55, '#7a5032');
}

// The cleaner's mop bucket on its dolly, wringer up, suds slopping (roll 16x19).
function mopBucket(c, W, H, f) {
  const g = H - 0.2;
  const p8 = (f / 8) * TAU;
  line(c, 6.4, 9.0, 2.2, 0.4, INK, 1.25);
  line(c, 6.4, 9.0, 2.2, 0.4, STEEL, 0.55);
  ell(c, 6.1, 8.0, 5.2, 1.0, '#8fb9ca', INK, LWI);
  for (let i = 0; i < 4; i++) circ(c, 3.0 + i * 2.0, 7.8 + Math.sin(p8 + i) * 0.25, 0.6 + (i % 2) * 0.2, PAPER, INK, LWF);
  body(c, shape([0.8, 8.0, 11.4, 8.0, 10.6, g - 2.2, 1.6, g - 2.2]), LEMON, (p) => {
    box(p, 9.0, 0, 4, H, LEMON_DK);
    box(p, 1.8, 9.2, 0.8, 5.6, LEMON_LT);
    lines(p, [0, 11.0, 16, 11.0, 0, 13.8, 16, 13.8], LEMON_DK, 0.35);
  });
  line(c, 13.2, 6.2, 15.4, 1.0, INK, 0.9);
  rbox(c, 14.6, 0.4, 1.2, 1.8, 0.5, RED, INK, LWF);
  body(c, rr(9.8, 4.8, 5.2, 4.0, 0.6), CHAR, (p) => box(p, 13.6, 0, 2, 9, CHAR_DK), INK, LWI);
  lines(c, [10.6, 6.0, 14.2, 6.0, 10.6, 7.2, 14.2, 7.2], '#55536a', 0.35);
  if (f >= 3 && f <= 5) circ(c, 0.9 - (f - 3) * 0.2, 7.6 + (f - 3) * 1.6, 0.5, '#8fb9ca', INK, LWF);
  box(c, 0.6, g - 2.3, 13.8, 1.0, CHAR, INK, LWI);
  for (const x of [1.8, 5.6, 9.4, 13.2]) caster(c, x, g - 0.75, 0.75, f);
}

// The lobby's sand-top ash urn, chrome, and somebody's cigarette has caught
// the litter in it (fire 17x29).
function ashUrnFire(c, W, H, f) {
  const g = H - 0.3;
  const top = 14.2;
  flames(c, 8.5, top, f);
  rising(c, 12.4, 6.4, f, 8, PAPER, '#8a7a6a');
  // The sand tray, then the drum and its foot.
  ell(c, 8.5, top, 5.6, 1.2, '#e8d8b0', INK, LWI);
  lines(c, [6.4, top - 0.2, 7.6, top + 0.3, 9.8, top - 0.3, 10.8, top + 0.2], PAPER, 0.5);
  body(c, shape([3.4, top, 13.6, top, 13.0, g - 2.0, 4.0, g - 2.0]), STEEL, (p) => {
    box(p, 10.8, 0, 4, H, STEEL_DK);
    box(p, 4.4, top + 1, 1.1, 12, STEEL_LT);
    box(p, 0, top + 4.6, 17, 1.6, BRASS);
    box(p, 0, top + 6.2, 17, 0.4, BRASS_DK);
  });
  body(c, shape([2.4, g - 2.0, 14.6, g - 2.0, 15.0, g, 2.0, g]), CHAR, null, INK, LWI);
}

// The velvet rope: two brass stanchions and a red rope (hurdle 21x12). The
// rope swings and breathes, a different curve on every frame of the ring.
function velvetRope(c, W, H, f, gold = false) {
  const g = H - 0.2;
  const a = (f / 8) * TAU;
  const sag = 2.8 + 0.5 * Math.cos(a);
  const sway = 0.7 * Math.sin(a);
  const post = gold ? STEEL : BRASS, postDk = gold ? STEEL_DK : BRASS_DK, postLt = gold ? STEEL_LT : BRASS_LT;
  for (const px of [3.0, 18.0]) {
    c.beginPath();
    c.moveTo(px - 2.6, g);
    c.quadraticCurveTo(px - 2.4, g - 2.2, px, g - 2.3);
    c.quadraticCurveTo(px + 2.4, g - 2.2, px + 2.6, g);
    c.closePath();
    fs(c, post, INK, LWI);
    body(c, rect(px - 0.6, 2.8, 1.2, g - 4.8), post, (p) => box(p, px + 0.15, 0, 0.6, H, postDk), INK, LWI);
    circ(c, px, 2.0, 1.3, gold ? BRASS : post, INK, LWI);
    circ(c, px - 0.4, 1.6, 0.4, gold ? BRASS_LT : postLt);
  }
  const rope = (p, y0, dy) => {
    p.beginPath();
    p.moveTo(3.8, y0);
    p.quadraticCurveTo(10.5 + sway, y0 + dy, 17.2, y0);
  };
  rope(c, 3.8, sag * 2);
  pen(c, INK, 2.3);
  c.stroke();
  pen(c, gold ? BRASS : '#c4153a', 1.4);
  c.stroke();
  if (gold) {
    // A twisted cord: the twist marks ride the same curve.
    c.save();
    c.setLineDash([0.5, 0.7]);
    rope(c, 3.8, sag * 2);
    pen(c, BRASS_DK, 1.0);
    c.stroke();
    c.restore();
  }
  rope(c, 3.7, sag * 2 - 0.6);
  pen(c, gold ? BRASS_LT : '#ff5a7a', 0.35);
  c.stroke();
  for (const px of [3.8, 17.2]) circ(c, px, 3.8, 0.55, gold ? BRASS : BRASS, INK, LWF);
}

// The lobby's art installation: a Memphis mobile hanging low on one cable,
// turning — its arm foreshortens as it comes round, so every frame of the
// ring is its own (low 22x101). The lobby already hangs a RECEPTION board, so
// this is the one thing up there that is in your way.
function artMobile(c, W, H, f) {
  const a = (f / 8) * TAU;
  const turn = Math.cos(a);
  const cx = W / 2;
  const armY = H - 12.4;
  cable(c, cx, cx, armY);
  // The balance arm, foreshortening as the mobile turns.
  const L = 9.6 * turn;
  line(c, cx - L, armY + 0.4 * Math.sin(a), cx + L, armY - 0.4 * Math.sin(a), INK, 0.5);
  circ(c, cx, armY, 0.6, INK);
  const end = (u) => [cx + L * u, armY - 0.4 * Math.sin(a) * u];
  // Each shape on its own wire, at its own length; the lowest is what you hit.
  const [lx, ly] = end(-1);
  line(c, lx, ly, lx, H - 7.2, INK, 0.25);
  body(c, (p) => p.arc(lx, H - 4.2, 3.0, 0, TAU), PINK, (p) => box(p, lx + 0.6, H - 8, 3, 8, PINK_DK), INK, LWI);
  const [rx, ry] = end(1);
  line(c, rx, ry, rx, H - 8.6, INK, 0.25);
  body(c, shape([rx - 3.0, H - 8.6, rx + 3.0, H - 8.6, rx, H - 3.0]), LEMON, (p) => box(p, rx, H - 9, 3.2, 6, LEMON_DK), INK, LWI);
  const [mx, my] = end(0.35);
  line(c, mx, my, mx, H - 9.4, INK, 0.25);
  c.beginPath();
  c.moveTo(mx - 3.2, H - 7.0);
  c.quadraticCurveTo(mx - 1.6, H - 9.6, mx, H - 7.0);
  c.quadraticCurveTo(mx + 1.6, H - 4.4, mx + 3.2, H - 7.0);
  pen(c, INK, 1.5);
  c.stroke();
  pen(c, TEAL, 0.8);
  c.stroke();
  const [qx, qy] = end(-0.45);
  line(c, qx, qy, qx, H - 9.0, INK, 0.25);
  body(c, rect(qx - 1.4, H - 9.0, 2.8, 2.8), COBALT, null, INK, LWI);
}

// A paper aeroplane thrown off the mezzanine, gliding down the lobby at head
// height (high 22x13). No animals in the office (Peter, 14 Oct 2026): this took
// the pigeon's slot, box and pace.
function paperPlane(c, W, H, f) {
  // A slow pitch and a little lift, phased off zero so the six frames differ.
  const a = (f / 6) * TAU + 0.4;
  const pitch = Math.sin(a) * 0.07;
  const lift = Math.cos(a) * 0.5;
  c.save();
  c.translate(11, 7 + lift);
  c.rotate(pitch);
  c.translate(-11, -7);
  // Far wing, behind the keel, in the paper's shade.
  body(c, shape([2.0, 7.0, 21.2, 4.2, 17.6, 6.6]), PAPER_DK, null, INK, LWI);
  // The keel: the folded spine hanging under the wings.
  body(c, shape([2.0, 7.0, 17.6, 6.6, 18.6, 10.6]), PAPER_DK, (p) => {
    poly(p, [2.0, 7.0, 18.6, 10.6, 18.8, 12, 2, 12], '#c9c3d1');
  }, INK, LWI);
  // Near wing, the big flat face, with a ruled line or two — it was a memo.
  body(c, shape([2.0, 7.0, 19.2, 1.4, 17.6, 6.6]), PAPER, (p) => {
    lines(p, [9, 5.0, 18.0, 2.4, 11, 5.4, 18.2, 3.8], COBALT_LT, 0.25);
  });
  // The centre fold.
  line(c, 2.0, 7.0, 17.6, 6.6, INK, LWF);
  c.restore();
}

// ========================================================== 8-2 FLOOR 23
// The work floor: admin, filing, and somebody's birthday.

// The coat stand by the lifts: a trench coat, a scarf, a hat (stand 17x25).
function coatStand(c, W, H, f) {
  const g = H - 0.3;
  // Sine plus a little cosine, so no two frames of the six are the same lean.
  const a = (f / 6) * TAU;
  const sway = Math.sin(a) * 0.06 + Math.cos(a) * 0.02;
  // Tripod feet and the pole.
  lines(c, [8.5, g - 3.6, 3.4, g, 8.5, g - 3.6, 13.6, g, 8.5, g - 3.6, 8.5, g], INK, 0.9);
  box(c, 7.9, 1.6, 1.2, g - 4.0, '#6a3a22', INK, LWF);
  // Hooks.
  lines(c, [8.5, 2.6, 5.6, 1.2, 8.5, 2.6, 11.4, 1.2], INK, 0.6);
  // The coat and scarf swing from the hook as one, sheared about it.
  c.save();
  c.translate(8.5, 2.6);
  c.transform(1, 0, -sway, 1, 0, 0);
  c.translate(-8.5, -2.6);
  body(c, (p) => {
    p.moveTo(6.4, 2.8);
    p.lineTo(10.6, 2.8);
    p.lineTo(12.6, 17.0);
    p.quadraticCurveTo(8.5, 18.2, 4.4, 17.0);
    p.closePath();
  }, '#d9b67a', (p) => {
    box(p, 10.4, 0, 4, 20, '#b8925a');
    box(p, 5.6, 5.6, 0.8, 9.4, '#ecd3a0');
    lines(p, [8.5, 3.4, 8.5, 17.6], '#a07a46', 0.35);
    box(p, 4.0, 9.6, 9.0, 1.2, '#a07a46');
  });
  circ(c, 7.6, 7.0, 0.35, INK);
  circ(c, 7.6, 12.2, 0.35, INK);
  // The scarf, Memphis-striped.
  body(c, shape([7.6, 2.6, 9.6, 2.6, 10.0, 11.0, 8.6, 11.4]), PINK, (p) => {
    lines(p, [7, 5.0, 11, 4.6, 7, 7.6, 11, 7.2, 7, 10.2, 11, 9.8], TEAL, 0.6);
  }, INK, LWI);
  c.restore();
  // The hat on top of the pole.
  ell(c, 8.5, 1.9, 3.6, 0.7, CHAR, INK, LWI);
  body(c, rr(6.4, -0.2, 4.2, 2.2, 0.8), CHAR, (p) => box(p, 6.4, 1.0, 4.2, 0.6, RED), INK, LWI);
}

// The snack machine, with a bag stuck on its coil, swinging (16x29). Tall and
// thin since 15 Oct 2026 (Peter: "taller and thinner — should be two units
// height to clear"): a 12x22 box, two crates high.
function snackMachine(c, W, H, f) {
  const g = H - 0.3;
  const a = (f / 8) * TAU;
  body(c, rr(1.0, 0.6, 14.0, g - 0.6, 0.8), RED, (p) => {
    box(p, 13.2, 0, 4, H, RED_DK);
    box(p, 1.8, 1.6, 0.7, g - 3, '#ff5a6c');
  });
  // The glass and the rows of snacks behind it.
  body(c, rr(2.2, 2.0, 8.4, 18.6, 0.6), '#2a2833', (p) => {
    const PACKS = [PINK, LEMON, TEAL, ORANGE, LILAC, PAPER];
    for (let r = 0; r < 5; r++) {
      const y = 2.7 + r * 3.6;
      for (let k = 0; k < 3; k++) {
        if (r === 1 && k === 1) continue; // the one that didn't drop
        rbox(p, 2.9 + k * 2.6, y, 1.9, 2.5, 0.4, PACKS[(r * 2 + k) % PACKS.length], INK, 0.15);
      }
      line(p, 2.2, y + 2.9, 10.6, y + 2.9, STEEL_DK, 0.3);
    }
    // The stuck bag, hanging off the end of its coil.
    p.save();
    p.translate(6.45, 6.4);
    p.rotate(Math.sin(a) * 0.18 + Math.cos(a) * 0.05);
    rbox(p, -0.95, 0, 1.9, 2.9, 0.4, LEMON, INK, 0.2);
    p.restore();
    poly(p, [2.8, 2.4, 5.4, 2.4, 2.8, 9.0], 'rgba(255,255,255,0.16)');
  }, INK, LWI);
  // Keypad, coin slot, the price display blinking, and the flap.
  rbox(c, 11.2, 2.0, 3.2, 18.6, 0.5, CHAR, INK, LWI);
  box(c, 11.6, 2.8, 2.4, 1.4, f % 2 ? '#5dff8f' : '#2f9a55', INK, LWF);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) box(c, 11.75 + k * 1.2, 5.2 + r * 1.4, 0.8, 0.9, STEEL, INK, 0.12);
  box(c, 12.2, 10.0, 1.2, 2.2, INK);
  rbox(c, 2.6, 22.0, 7.6, 3.2, 0.4, '#16141c', INK, LWI);
  box(c, 3.1, 22.4, 6.6, 1.0, '#2a2833');
  box(c, 1.0, g - 1.2, 14.0, 1.2, INK);
}

// The archive box, a bankers box with a red-year label (stack 16x15). FLAT and
// front-on (Peter, 15 Oct 2026: "fix perspective on archive boxes too"): the box and
// its lid square-on, no top or side going back.
function archiveBox(c, W, H) {
  const g = H - 0.2;
  body(c, rect(0.8, 3.6, 14.4, g - 3.6), CARD, (p) => {
    box(p, 0.8, g - 1.2, 14.4, 1.2, CARD_DK);
    box(p, 1.4, 4.6, 0.7, 8, CARD_LT);
    box(p, 13.4, 3.6, 1.8, g - 3.6, CARD_DK);
  });
  // The lid, proud of the box both sides.
  body(c, rect(0.3, 1.0, 15.4, 3.2), CARD_LT, (p) => {
    box(p, 0.3, 1.0, 15.4, 0.6, '#f6cc98');
    box(p, 0.3, 3.4, 15.4, 0.8, CARD);
    box(p, 13.9, 1.0, 1.8, 3.2, CARD);
  }, INK, LWI);
  // The hand hole in the lid's front, the white label with the red year.
  rbox(c, 5.8, 1.9, 4.4, 1.3, 0.6, '#3b2414', INK, LWF);
  rbox(c, 3.8, 7.0, 8.4, 5.0, 0.3, PAPER, INK, LWF);
  box(c, 4.2, 7.5, 4.4, 1.4, RED);
  lines(c, [4.2, 9.8, 11.6, 9.8, 4.2, 10.9, 9.6, 10.9], INK, 0.22);
}

// The internal mail cart, envelopes nudging on the bumps (roll 16x18).
function mailCart(c, W, H, f) {
  const g = H - 0.2;
  const bob = (i) => (Math.sin((f / 8) * TAU * 2 + i * 1.7) > 0.6 ? -0.4 : 0);
  lines(c, [13.4, 7.0, 15.2, 2.8], INK, 0.75);
  rbox(c, 14.4, 1.4, 1.4, 2.6, 0.5, CHAR, INK, LWI);
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
  body(c, (p) => {
    p.moveTo(1.0, 6.6);
    p.lineTo(14.2, 6.6);
    p.lineTo(13.4, g - 3.0);
    p.quadraticCurveTo(7.7, g - 1.8, 1.8, g - 3.0);
    p.closePath();
  }, TEAL, (p) => {
    box(p, 11.8, 0, 4, H, TEAL_DK);
    box(p, 0, 9.0, 16, 1.8, PAPER);
    box(p, 0, 10.8, 16, 0.7, RED);
    box(p, 1.8, 11.8, 0.7, 2.6, TEAL_LT);
  });
  box(c, 0.6, 6.0, 14.2, 1.1, STEEL, INK, LWI);
  box(c, 1.2, g - 3.0, 13.0, 0.9, STEEL, INK, LWI);
  caster(c, 2.6, g - 1.1, 1.0, f);
  caster(c, 12.6, g - 1.1, 1.0, f);
}

// The bin fire: a cobalt wire-mesh wastebasket of crumpled memos, alight
// (fire 17x29). `brass` dresses it for floor 88: a fluted brass basket of
// papers stamped CONFIDENTIAL — the shredding did not go fast enough.
function binFire(c, W, H, f, brass = false) {
  const g = H - 0.3;
  const top = 13.4;
  ell(c, 8.5, top, 6.4, 1.3, '#14121a', INK, LWI);
  circ(c, 6.0, top - 0.6, 1.5, PAPER, INK, LWF);
  circ(c, 10.0, top - 0.9, 1.7, PAPER_DK, INK, LWF);
  if (brass) {
    // A stamped folder edge poking out of the fire.
    poly(c, [9.6, top - 0.4, 12.6, top - 3.0, 13.4, top - 2.2, 10.6, top + 0.2], '#f2e6c4', INK, LWF);
    line(c, 10.8, top - 1.2, 12.4, top - 2.6, RED, 0.45);
  }
  flames(c, 8.5, top, f);
  rising(c, 12.6, 6.0, f, 8, PAPER, brass ? RED : ORANGE);
  body(c, shape([2.1, top, 14.9, top, 13.2, g, 3.8, g]), brass ? BRASS : COBALT, (p) => {
    p.beginPath();
    if (brass) {
      for (let x = 3.4; x < 14; x += 1.6) { p.moveTo(x, top); p.lineTo(x + (8.5 - x) * 0.12, g); }
      pen(p, BRASS_DK, 0.35);
    } else {
      for (let x = -16; x < 18; x += 1.7) {
        p.moveTo(x, top);
        p.lineTo(x + 16, g);
        p.moveTo(x + 16, top);
        p.lineTo(x, g);
      }
      pen(p, COBALT_LT, 0.28);
    }
    p.stroke();
    box(p, 11.8, 0, 6, H, 'rgba(20,24,70,0.3)');
    if (brass) box(p, 3.6, top + 1, 1.0, 12, BRASS_LT);
  });
  rbox(c, 1.6, top - 0.7, 13.8, 1.5, 0.6, brass ? BRASS_DK : INK, INK, LWF);
  line(c, 2.6, top - 0.2, 7.0, top - 0.2, brass ? BRASS_LT : STEEL_DK, 0.3);
  box(c, 3.6, g - 1.0, 9.8, 1.0, INK);
}

// A spilled box of drawing pins, points up, Memphis heads (pins 20x16,
// bedded: the run sinks it 2u and the floor cuts it, so all of it sits above
// H - 2). Ten frames: a glint walks the five points, big then small.
function drawingPins(c, W, H, f) {
  const g = H - 2.0;
  poly(c, [15.4, g, 19.6, g, 19.6, g - 3.4, 15.4, g - 3.4], RED, INK, LWI);
  box(c, 16.4, g - 2.6, 2.4, 1.6, PAPER, INK, LWF);
  poly(c, [15.4, g - 3.4, 14.0, g - 4.6, 14.0, g - 0.8, 15.4, g], RED_DK, INK, LWI);
  const PINS = [[2.4, 6.6, RED], [5.6, 9.0, LEMON], [8.8, 7.2, TEAL], [11.8, 9.6, PINK], [14.4, 6.0, COBALT]];
  PINS.forEach(([x, ht, col], i) => {
    poly(c, [x - 0.65, g - 1.0, x + 0.65, g - 1.0, x, g - 1.0 - ht], STEEL, INK, 0.24);
    poly(c, [x - 0.5, g - 1.1, x - 0.05, g - 1.1, x - 0.05, g - 0.9 - ht], STEEL_LT);
    ell(c, x, g - 0.85, 2.1, 0.85, col, INK, LWI);
    box(c, x - 1.6, g - 1.25, 1.0, 0.35, 'rgba(255,255,255,0.6)');
    if (Math.floor(f / 2) === i) glint(c, x, g - 1.0 - ht, f % 2 ? 0.8 : 1.4);
  });
}

// Birthday bunting strung low across the aisle (low 22x101): the string comes
// down from both top corners, dips to head height, and the flags flutter.
function birthdayBunting(c, W, H, f) {
  const a = (f / 8) * TAU;
  const low = H - 6.2 + Math.sin(a) * 0.4;
  const FLAGS = [PINK, LEMON, TEAL, LILAC, ORANGE, PINK, TEAL];
  // Quadratic from (-2, H - 30) through a dip at the box to (24, H - 30).
  const P0 = [-2, H - 30], P2 = [24, H - 30];
  const C = [11, 2 * low - (P0[1] + P2[1]) / 2];
  const at = (u) => [
    (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * C[0] + u * u * P2[0],
    (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * C[1] + u * u * P2[1],
  ];
  for (const x of [-2, 24]) cable(c, x < 0 ? 0.4 : W - 0.4, x < 0 ? 0.4 : W - 0.4, H - 30);
  c.beginPath();
  c.moveTo(P0[0], P0[1]);
  c.quadraticCurveTo(C[0], C[1], P2[0], P2[1]);
  pen(c, INK, 0.4);
  c.stroke();
  FLAGS.forEach((col, i) => {
    const u = 0.2 + i * 0.1;
    const [x, y] = at(u);
    const flap = Math.sin(a + i * 0.9) * 0.6;
    poly(c, [x - 1.3, y, x + 1.3, y, x + flap, y + 3.4], col, INK, LWF);
  });
  // A balloon tied at the dip.
  const [bx, by] = at(0.5);
  line(c, bx, by, bx + 1.4, by - 4.0, INK, 0.25);
  ell(c, bx + 1.6, by - 6.0, 1.7, 2.1, RED, INK, LWI);
  ell(c, bx + 1.1, by - 6.7, 0.4, 0.6, '#ff8a96');
}

// A runaway foil birthday balloon, ribbon trailing (high 22x18).
function partyBalloon(c, W, H, f) {
  const a = (f / 8) * TAU;
  const g = H - 0.2;
  // Ribbon curling back behind it as it drifts toward the hero.
  c.beginPath();
  c.moveTo(9.6, g - 2.0);
  for (let k = 1; k <= 6; k++) {
    const x = 9.6 + k * 1.9;
    const y = g - 2.0 - k * 0.9 + Math.sin(a + k * 1.1) * 0.8;
    c.lineTo(x, y);
  }
  pen(c, LEMON_DK, 0.55);
  c.stroke();
  // The balloon: a round foil one, squashing a touch as it bobs.
  const sq = 1 + Math.sin(a) * 0.04;
  c.save();
  c.translate(8.6, g - 8.2);
  c.scale(1 / sq, sq);
  body(c, (p) => p.arc(0, 0, 6.0, 0, TAU), PINK, (p) => {
    box(p, 1.8, -7, 6, 14, PINK_DK);
    ell(p, -2.2, -2.4, 1.4, 2.4, '#ffd0e4', null, 0, -0.5);
  });
  c.restore();
  poly(c, [8.0, g - 2.0, 9.2, g - 2.0, 8.6, g - 3.0], PINK_DK, INK, LWF);
  // The star on the foil — it is somebody's birthday.
  poly(c, [8.6, g - 10.8, 9.3, g - 9.1, 11.0, g - 9.0, 9.7, g - 7.9, 10.1, g - 6.2,
    8.6, g - 7.2, 7.1, g - 6.2, 7.5, g - 7.9, 6.2, g - 9.0, 7.9, g - 9.1], LEMON, INK, LWF);
}

// The shredder, which has been fed the audit and spits confetti back (target
// 16x21) — the mission's target on floor 23: DESTROY 5 HOSTILE SHREDDERS.
function shredder(c, W, H, f) {
  const g = H - 0.2;
  const k = f / 8;
  // The sheet going in, sliding down into the slot over the ring.
  const sy = 1.0 + k * 4.4;
  c.save();
  c.beginPath();
  c.rect(0, 0, W, 7.6);
  c.clip();
  body(c, rect(5.0, sy, 6.0, 7.6), PAPER, (p) => {
    lines(p, [5.8, sy + 1.4, 10.0, sy + 1.4, 5.8, sy + 2.6, 9.0, sy + 2.6, 5.8, sy + 3.8, 9.6, sy + 3.8], '#8fb2e8', 0.3);
    box(p, 8.6, sy + 0.6, 1.8, 0.6, RED);
  }, INK, LWI);
  c.restore();
  // The bin, its window full of strips.
  body(c, rr(2.0, 9.0, 12.0, g - 9.0, 0.6), CHAR, (p) => {
    box(p, 11.6, 0, 3, H, CHAR_DK);
    box(p, 2.6, 10, 0.7, 9, '#55536a');
  });
  body(c, rr(4.0, 11.4, 6.8, 6.6, 0.4), '#16141c', (p) => {
    for (let i = 0; i < 9; i++) line(p, 4.6 + i * 0.7, 11.6 + (i % 3) * 0.5, 4.2 + i * 0.75, 17.8, i % 4 ? PAPER : PINK, 0.3);
  }, INK, LWF);
  // The head: steel, the slot, the red ON light.
  body(c, rr(0.8, 6.6, 14.4, 3.2, 0.8), STEEL, (p) => {
    box(p, 0.8, 8.6, 14.4, 1.2, STEEL_DK);
    box(p, 1.6, 7.0, 6, 0.5, STEEL_LT);
  });
  box(c, 4.4, 7.2, 7.2, 0.7, INK);
  circ(c, 13.2, 7.8, 0.5, f % 2 ? RED : RED_DK, INK, 0.15);
  // Confetti spat out of the front at the hero.
  const BITS = [PINK, LEMON, TEAL, PAPER, LILAC];
  for (let i = 0; i < 5; i++) {
    const u = (k + i / 5) % 1;
    const x = 2.0 - u * 1.8;
    const y = 8.4 - u * 6.0 + i * 0.4;
    box(c, x, y, 0.9, 0.5, BITS[i], INK, 0.1);
  }
}

// The fire alarm pull station, on the wall at a hop's height (box 10x11) — the
// mission's target on floor 23: PULL 3 FIRE ALARMS. `pulled` drops the handle
// and sets the strobe over it going, white on alternate frames.
function fireAlarm(c, W, H, f = 0, pulled = false) {
  // The strobe on its own little plinth above the box.
  const lit = pulled && f % 2 === 0;
  if (lit) {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45;
      line(c, W / 2 + Math.cos(a) * 2.4, 2.4 + Math.sin(a) * 2.4,
        W / 2 + Math.cos(a) * 4.4, 2.4 + Math.sin(a) * 4.4, LEMON_LT, 0.45);
    }
  }
  box(c, W / 2 - 2.6, 3.0, 5.2, 1.4, STEEL, INK, LWF);
  body(c, rr(W / 2 - 1.9, 0.9, 3.8, 2.4, 0.9), lit ? PAPER : pulled ? RED_DK : '#f6c0c6',
    (p) => box(p, W / 2 - 1.9, 0.9, 1.2, 2.4, lit ? LEMON_LT : '#ffffff'), INK, LWF);
  // The box: red, the white FIRE band, the lit sliver down its left.
  body(c, rr(1.2, 4.6, W - 2.4, H - 5.0, 0.8), RED, (p) => {
    box(p, W - 3.4, 0, 3, H, RED_DK);
    box(p, 1.6, 5.0, 0.9, H - 6, '#ff6a7c');
  });
  box(c, 2.4, 5.8, W - 4.8, 1.8, PAPER, INK, LWF);
  lines(c, [3.4, 6.7, 4.6, 6.7, 5.4, 6.7, 6.2, 6.7, 7.0, 6.7, 8.6, 6.7], RED_DK, 0.35);
  // The handle: a white T, up and waiting, or down and spent.
  const hy = pulled ? H - 3.4 : 9.6;
  box(c, W / 2 - 0.7, pulled ? 9.0 : 8.6, 1.4, hy - (pulled ? 9.0 : 8.6), CHAR_DK);
  body(c, rr(2.8, hy, W - 5.6, 1.8, 0.6), PAPER, (p) => box(p, 2.8, hy + 1.0, W - 5.6, 1, PAPER_DK), INK, LWI);
}

// ========================================================== 8-3 FLOOR 88
// The executive floor: money.

// The founder in white marble on a black plinth: the silver professor's hair,
// spectacles and moustache, carved (stand 17x25). Still — marble does not move.
function founderBust(c, W, H) {
  const g = H - 0.3;
  box(c, 3.4, g - 1.7, 10.2, 1.7, CHAR_DK, INK, LWI);
  body(c, rect(4.6, 14.8, 7.8, g - 1.7 - 14.8), CHAR_DK, (p) => {
    box(p, 10.8, 0, 2, H, '#18161e');
    box(p, 5.2, 14, 0.7, 12, '#4a4858');
  }, INK, LWI);
  box(c, 3.8, 13.6, 9.4, 1.4, CHAR, INK, LWI);
  rbox(c, 6.1, 18.0, 4.8, 1.9, 0.3, BRASS, INK, LWF);
  line(c, 6.9, 19.0, 10.1, 19.0, BRASS_DK, 0.3);
  body(c, (p) => {
    p.moveTo(3.4, 13.6);
    p.quadraticCurveTo(3.6, 10.6, 6.6, 10.0);
    p.lineTo(10.4, 10.0);
    p.quadraticCurveTo(13.4, 10.6, 13.6, 13.6);
    p.closePath();
  }, MARBLE, (p) => box(p, 10.4, 0, 4, 14, MARBLE_DK), INK, LWI);
  box(c, 7.4, 8.2, 2.2, 2.0, MARBLE_DK, INK, LWF);
  const HAIR = [3.0, 7.0, 3.6, 5.6, 2.2, 4.4, 4.2, 4.0, 3.4, 2.4, 5.4, 2.6, 5.6, 0.8, 7.2, 1.8,
    8.6, 0.4, 9.8, 1.8, 11.6, 0.8, 11.6, 2.6, 13.6, 2.4, 12.8, 4.0, 14.8, 4.4, 13.4, 5.6, 14.0, 7.0, 12.0, 6.6,
    11.6, 5.0, 5.4, 5.0, 5.0, 6.6];
  body(c, shape(HAIR), MARBLE, (p) => box(p, 10.8, 0, 6, 12, MARBLE_DK), INK, LWI);
  ell(c, 8.5, 5.8, 2.5, 3.0, MARBLE, INK, LWI);
  box(c, 9.6, 3.2, 1.6, 5.4, MARBLE_DK);
  ell(c, 8.5, 5.8, 2.5, 3.0, null, INK, LWI);
  circ(c, 7.5, 5.4, 0.85, null, INK, 0.26);
  circ(c, 9.6, 5.4, 0.85, null, INK, 0.26);
  line(c, 8.35, 5.3, 8.75, 5.3, INK, 0.22);
  c.beginPath();
  c.moveTo(6.9, 7.6);
  c.quadraticCurveTo(7.8, 6.6, 8.55, 7.1);
  c.quadraticCurveTo(9.3, 6.6, 10.2, 7.6);
  c.quadraticCurveTo(8.55, 7.5, 6.9, 7.6);
  fs(c, MARBLE_DK, INK, LWF);
  glint(c, 5.6, 3.6, 0.9);
}

// The company safe: gunmetal, gold pinstripe, the dial turning, banded cash
// on top (big 23x26).
function officeSafe(c, W, H, f) {
  const g = H - 0.3;
  const a = (f / 8) * TAU;
  // The cash on top.
  for (let k = 0; k < 3; k++) {
    body(c, rect(6.2 + k * 0.4, 1.6 + k * 1.3, 9.6, 1.4), '#8fcf8a', (p) => box(p, 10.2 + k * 0.4, 0, 1.4, 6, PAPER), INK, LWF);
  }
  body(c, rr(2.6, 5.6, 17.8, g - 7.0, 1.2), '#34323f', (p) => {
    box(p, 17.6, 0, 4, H, '#24222c');
    box(p, 3.4, 6.6, 0.9, g - 9, '#55536a');
  });
  // The door, its gold pinstripe, the hinge.
  rbox(c, 4.4, 7.4, 13.4, g - 10.6, 0.8, '#3c3a48', INK, LWI);
  rbox(c, 5.2, 8.2, 11.8, g - 12.2, 0.6, null, BRASS, 0.3);
  box(c, 17.6, 9.4, 1.0, 2.4, STEEL_DK, INK, LWF);
  box(c, 17.6, g - 6.4, 1.0, 2.4, STEEL_DK, INK, LWF);
  // The dial, ticking round, and the handle wheel.
  circ(c, 9.0, 13.2, 3.2, STEEL, INK, LWI);
  circ(c, 9.0, 13.2, 2.2, STEEL_LT, INK, LWF);
  for (let k = 0; k < 12; k++) {
    const t = a + (k / 12) * TAU;
    line(c, 9.0 + Math.cos(t) * 2.4, 13.2 + Math.sin(t) * 2.4, 9.0 + Math.cos(t) * 3.0, 13.2 + Math.sin(t) * 3.0, INK, 0.18);
  }
  line(c, 9.0, 13.2, 9.0 + Math.cos(a) * 1.8, 13.2 + Math.sin(a) * 1.8, RED, 0.4);
  circ(c, 14.4, 13.2, 1.6, null, BRASS, 0.5);
  lines(c, [12.8, 13.2, 16.0, 13.2, 14.4, 11.6, 14.4, 14.8], BRASS, 0.5);
  // Feet.
  box(c, 3.4, g - 1.4, 2.4, 1.4, INK);
  box(c, 17.2, g - 1.4, 2.4, 1.4, INK);
}

// Attaché cases, two to a stack unit: oxblood and black, brass latches
// (stack 16x15).
function briefcase(c, W, H) {
  const g = H - 0.2;
  const CASES = [[OXBLOOD, OXBLOOD_DK, 0.8, g - 6.6], [INK, CHAR, 1.6, g - 13.4]];
  for (const [fill, dk, x, y] of CASES) {
    body(c, rr(x, y, 13.6, 6.4, 0.9), fill, (p) => {
      box(p, x, y + 4.6, 13.6, 1.8, dk);
      box(p, x, y + 3.0, 13.6, 0.35, 'rgba(255,255,255,0.18)');
      box(p, x + 0.8, y + 1.0, 0.7, 2.0, 'rgba(255,255,255,0.22)');
    });
    for (const lx of [x + 2.0, x + 10.0]) box(c, lx, y + 2.4, 1.6, 1.2, BRASS, INK, LWF);
    // The handle on the near edge.
    c.beginPath();
    c.moveTo(x + 5.0, y);
    c.quadraticCurveTo(x + 6.8, y - 1.8, x + 8.6, y);
    pen(c, INK, 0.7);
    c.stroke();
    box(c, x + 13.6, y + 1.0, 0.8, 4.4, BRASS_DK, INK, LWF);
  }
}

// The drinks trolley: brass, two glass shelves, decanters, a bucket of
// champagne (roll 16x19).
function drinksTrolley(c, W, H, f) {
  const g = H - 0.2;
  const p8 = (f / 8) * TAU;
  const S1 = 9.0, S2 = 14.6;
  // Frame: brass uprights, a curved push handle on the right.
  for (const x of [1.4, 13.4]) box(c, x, 4.0, 0.9, g - 5.4, BRASS, INK, LWF);
  c.beginPath();
  c.moveTo(14.3, 4.2);
  c.quadraticCurveTo(15.8, 4.0, 15.6, 2.0);
  pen(c, INK, 0.8);
  c.stroke();
  // Top shelf: a decanter, glasses, the ice bucket with a bottle in it.
  body(c, (p) => {
    p.moveTo(3.0, S1);
    p.lineTo(3.0, 6.0);
    p.quadraticCurveTo(3.0, 4.4, 4.2, 4.2);
    p.lineTo(4.2, 2.8);
    p.lineTo(5.2, 2.8);
    p.lineTo(5.2, 4.2);
    p.quadraticCurveTo(6.4, 4.4, 6.4, 6.0);
    p.lineTo(6.4, S1);
    p.closePath();
  }, '#e6f3fa', (p) => {
    const lvl = 6.0 + Math.sin(p8) * 0.3;
    box(p, 3, lvl, 4, 4, '#d88a2a');
    line(p, 3, lvl, 6.4, lvl, '#a8641a', 0.3);
  }, INK, LWI);
  circ(c, 4.7, 2.5, 0.6, '#e6f3fa', INK, LWF);
  poly(c, [7.2, S1, 7.2, 6.8, 8.6, 6.8, 8.6, S1], 'rgba(230,243,250,0.9)', INK, LWF);
  body(c, shape([9.4, 5.8, 12.8, 5.8, 12.4, S1, 9.8, S1]), BRASS, (p) => box(p, 11.6, 0, 2, 12, BRASS_DK), INK, LWI);
  box(c, 10.4, 1.6, 1.4, 4.4, '#1f5a3a', INK, LWF);
  box(c, 10.2, 1.0, 1.8, 1.0, BRASS_LT, INK, LWF);
  // The shelves, glass on brass.
  box(c, 0.8, S1, 14.0, 1.0, '#cfeefa', INK, LWI);
  box(c, 0.8, S2, 14.0, 1.0, '#cfeefa', INK, LWI);
  // Bottom shelf: a row of bottles that clink.
  [[2.6, '#1f5a3a'], [4.8, '#7a1f2b'], [7.0, '#d88a2a'], [9.2, '#1f5a3a']].forEach(([x, col], i) => {
    const lean = Math.sin(p8 + i * 1.3) * 0.15;
    c.save();
    c.translate(x, S2);
    c.rotate(lean);
    rbox(c, -0.8, -3.6, 1.6, 3.6, 0.5, col, INK, LWF);
    box(c, -0.35, -4.6, 0.7, 1.1, col, INK, 0.12);
    c.restore();
  });
  // Wheels.
  caster(c, 2.0, g - 1.2, 1.2, f);
  caster(c, 13.6, g - 1.2, 1.2, f);
}

// A crystal chandelier, hanging low on its chain and swinging, the drops
// catching the lamps in turn (low 22x101).
function chandelier(c, W, H, f) {
  const a = (f / 8) * TAU;
  const dx = Math.sin(a) * 0.8;
  const y = H - 9.6;
  cable(c, W / 2, W / 2 + dx, y, true);
  c.save();
  c.translate(W / 2 + dx, y);
  c.rotate(Math.sin(a) * 0.03);
  // The brass frame: a hub and five arms, candle bulbs on the ends.
  ell(c, 0, 0.6, 1.6, 1.4, BRASS, INK, LWI);
  for (let k = 0; k < 5; k++) {
    const ax = -8 + k * 4;
    c.beginPath();
    c.moveTo(0, 1.2);
    c.quadraticCurveTo(ax * 0.6, 4.6, ax, 3.0);
    pen(c, INK, 0.7);
    c.stroke();
    pen(c, BRASS, 0.35);
    c.stroke();
    box(c, ax - 0.5, 1.0, 1.0, 2.0, PAPER, INK, LWF);
    ell(c, ax, 0.4, 0.55, 0.8, '#ffe9a0', INK, 0.12);
  }
  // The drops, one twinkling per frame.
  for (let k = 0; k < 8; k++) {
    const dxk = -7 + k * 2;
    const dy = 5.0 + (k % 2) * 1.2;
    poly(c, [dxk, dy - 1.0, dxk + 0.55, dy, dxk, dy + 1.0, dxk - 0.55, dy], k === f ? PAPER : '#dcd2f0', INK, 0.12);
    if (k === f) glint(c, dxk, dy, 1.1);
  }
  ell(c, 0, 6.8, 1.0, 1.4, '#dcd2f0', INK, LWF);
  c.restore();
}

// A champagne cork, popped in the boardroom, wire cage still on, spinning in
// with a spray of foam behind it (high 22x13).
function champagneCork(c, W, H, f) {
  const a = (f / 8) * TAU;
  // The spray: droplets trailing back toward where it came from.
  for (let i = 0; i < 6; i++) {
    const u = ((f / 8) + i / 6) % 1;
    circ(c, 11.0 + u * 10.0, 6.5 + Math.sin(i * 2.1) * (1.0 + u * 2.4), 0.45 + (1 - u) * 0.6, PAPER, INK, 0.15);
  }
  lines(c, [13.0, 4.4, 18.6, 3.2, 13.2, 8.6, 18.8, 9.8], 'rgba(31,29,38,0.5)', 0.35);
  c.save();
  c.translate(7.0, 6.5);
  c.rotate(a);
  // Half as big again as a real one: at lane size a true-scale cork is a speck.
  c.scale(1.5, 1.5);
  // The cork's mushroom: crown, waist, foil cap, the wire cage over it.
  body(c, (p) => {
    p.moveTo(-3.4, -1.6);
    p.quadraticCurveTo(-3.6, 0, -3.4, 1.6);
    p.lineTo(0.4, 1.4);
    p.lineTo(0.4, 2.0);
    p.lineTo(3.4, 2.0);
    p.lineTo(3.4, -2.0);
    p.lineTo(0.4, -2.0);
    p.lineTo(0.4, -1.4);
    p.closePath();
  }, '#d8b07a', (p) => {
    box(p, -4, 0.6, 8, 2, '#b88e58');
    box(p, -3.6, -1.6, 2.6, 3.2, BRASS);
  });
  lines(c, [-3.4, 0, 0.4, -1.4, -3.4, 0, 0.4, 1.4], STEEL_DK, 0.3);
  c.restore();
}

// THE VAULT SAFE: office-3's target, CRACK 3 SAFES (Peter, 15 Oct: candidate E of
// the safe bake-off, src/dev/office-safe-candidates.js). Twice a crate's height
// (box 16x24), gold body, black door, white dial; one shot blows the door open and
// the money comes out (Run.crackSafe). `open` is the door swung back on its hinge
// with the cash shelf and gold bars showing.
const CASH = '#8fcf8a', CASH_LT = '#b9e6ae', CASH_PALE = '#e5f2cc', CASH_DK = '#5fa45e', VAULT = '#16131d';
function glint4(c, x, y, s, col = '#ffffff') {
  if (s <= 0) return;
  poly(c, [x, y - s, x + s * 0.28, y - s * 0.28, x + s, y, x + s * 0.28, y + s * 0.28,
    x, y + s, x - s * 0.28, y + s * 0.28, x - s, y, x - s * 0.28, y - s * 0.28], col);
}
function vaultSafe(c, W, H, f, open = false) {
  const g = H - 0.3;
  const bx = 1.2, bw = W - 2.4, top = 1.4, bh = g - 1.6 - top;
  const dx = bx + 1.6, dy = top + 1.6, dw = bw - 3.8, dh = bh - 3.2;
  box(c, bx + 0.8, g - 1.8, 3.0, 1.8, INK);
  box(c, bx + bw - 3.8, g - 1.8, 3.0, 1.8, INK);
  body(c, rr(bx, top, bw, bh, 1.0), BRASS, (p) => {
    box(p, bx + bw - bw * 0.16, top, bw, bh, BRASS_DK);
    box(p, bx + 0.7, top + 0.8, 0.9, bh - 1.6, BRASS_LT);
  });
  if (open) {
    // The strongbox: banded cash on the shelf, gold bars on the floor of it.
    rbox(c, dx, dy, dw, dh, 0.5, VAULT, INK, LWI);
    const shelf = dy + dh * 0.5;
    line(c, dx + 0.3, shelf, dx + dw - 0.3, shelf, STEEL_DK, 0.5);
    const nw = Math.min(4.2, (dw - 1.2) / 2);
    for (let k = 0; k < 2; k++) {
      for (let j = 0; j < 2; j++) {
        const nx = dx + 0.6 + k * (nw + 0.2), ny = shelf - 1.5 - j * 1.5;
        box(c, nx, ny, nw, 1.4, CASH, INK, LWF);
        box(c, nx + nw / 2 - 0.4, ny, 0.8, 1.4, PAPER);
      }
    }
    const n = Math.max(2, Math.floor((dw - 1) / 3)), by = dy + dh - 0.4;
    for (let k = 0; k < n; k++) {
      const gx = dx + 0.6 + k * ((dw - 1.2) / n);
      poly(c, [gx, by, gx + 2.6, by, gx + 2.1, by - 1.5, gx + 0.5, by - 1.5], BRASS, INK, LWF);
    }
    for (let k = 0; k < n - 1; k++) {
      const gx = dx + 1.9 + k * ((dw - 1.2) / n);
      poly(c, [gx, by - 1.5, gx + 2.6, by - 1.5, gx + 2.1, by - 3.0, gx + 0.5, by - 3.0], BRASS_LT, INK, LWF);
    }
    glint4(c, dx + dw * 0.6, by - 2.8, 1.0, '#fffbe0');
    // The door, swung back past its hinge: the plain inside face and its bolts.
    const hx = dx + dw, ak = 0.37;
    c.save();
    c.translate(hx, dy);
    c.scale(ak, 1);
    body(c, rr(0, 0, dw, dh, 0.6), STEEL, (p) => box(p, 0, 0, dw * 0.22, dh, STEEL_DK));
    rbox(c, dw * 0.25, dh * 0.15, dw * 0.6, dh * 0.7, 0.4, null, INK, LWF);
    c.restore();
    const ex = hx + dw * ak;
    box(c, ex, dy + 0.4, 1.3, dh - 0.8, STEEL_DK, INK, LWI);
    for (const fy of [0.2, 0.5, 0.8]) box(c, ex + 1.3, dy + dh * fy - 0.5, 1.6, 1.0, STEEL, INK, LWF);
  } else {
    // The door: black, a gold pinstripe, the white dial turning and the brass wheel.
    body(c, rr(dx, dy, dw, dh, 0.7), CHAR, (q) => box(q, dx + dw - dw * 0.12, dy, dw, dh, CHAR_DK));
    rbox(c, dx + 0.8, dy + 0.8, dw - 1.6, dh - 1.6, 0.5, null, BRASS, 0.3);
    const lx = dx + dw * 0.42, ly = dy + dh * 0.36, r = 2.9, a = (f / 8) * TAU;
    circ(c, lx, ly, r, BRASS_LT, INK, LWI);
    circ(c, lx, ly, r * 0.7, PAPER, INK, LWF);
    for (let k = 0; k < 12; k++) {
      const q = a + (k / 12) * TAU;
      line(c, lx + Math.cos(q) * r * 0.74, ly + Math.sin(q) * r * 0.74, lx + Math.cos(q) * r * 0.94, ly + Math.sin(q) * r * 0.94, INK, 0.16);
    }
    line(c, lx, ly, lx + Math.cos(a) * r * 0.55, ly + Math.sin(a) * r * 0.55, RED, 0.38);
    circ(c, lx, ly, r * 0.16, INK);
    const wx = dx + dw * 0.5, wy = dy + dh * 0.7, wr = 2.6;
    for (let k = 0; k < 4; k++) {
      const q = 0.4 + (k / 4) * TAU;
      line(c, wx, wy, wx + Math.cos(q) * wr, wy + Math.sin(q) * wr, INK, 0.9);
      line(c, wx, wy, wx + Math.cos(q) * wr, wy + Math.sin(q) * wr, BRASS_LT, 0.45);
      circ(c, wx + Math.cos(q) * wr, wy + Math.sin(q) * wr, 0.6, BRASS_LT, INK, LWF);
    }
    circ(c, wx, wy, wr * 0.32, BRASS_LT, INK, LWF);
  }
  box(c, dx + dw + 0.1, dy + 2, 1.0, 2.6, STEEL_DK, INK, LWF);
  box(c, dx + dw + 0.1, dy + dh - 4.6, 1.0, 2.6, STEEL_DK, INK, LWF);
  glint4(c, bx + 2.2, top + 2.4, 1.3 + 0.4 * Math.sin((f / 8) * TAU));
}

// The banknote a cracked safe throws out (pickup 10x6): green, inked, a pale
// border and a white oval with the $, flipping on its ring as it hangs.
function banknote(c, W, H, f) {
  const flip = Math.cos((f / 8) * TAU);
  const w = (W - 1) * (0.35 + 0.65 * Math.abs(flip)), hh = H - 1;
  c.save();
  c.translate(W / 2, H / 2);
  c.rotate(Math.sin((f / 8) * TAU) * 0.12);
  rbox(c, -w / 2, -hh / 2, w, hh, 0.5, CASH, INK, 0.45);
  if (w > 4) {
    rbox(c, -w / 2 + 0.8, -hh / 2 + 0.8, w - 1.6, hh - 1.6, 0.3, null, CASH_DK, 0.3);
    ell(c, 0, 0, Math.min(2.4, w * 0.24), hh * 0.3, flip > 0 ? PAPER : '#e8f6e6', INK, 0.2);
    if (flip > 0 && w > 7) line(c, 0, -hh * 0.2, 0, hh * 0.2, CASH_DK, 0.45);
  }
  c.restore();
}

// THE PAYOFF ON FLOOR 88 (Peter, 15 Oct): crack the safes and a giant pile of
// money waits by the exit. Stacks of strapped notes form the mound, with loose
// bills and coins spilling over both sides.
function moneyPile(c, W, H, f) {
  const g = H - 0.3, cx = W / 2;
  const h01 = (n) => { const v = Math.sin(n * 91.7 + 13.1) * 43758.5453; return v - Math.floor(v); };
  ell(c, cx, g + 0.4, W * 0.46, 2.2, 'rgba(31,29,38,0.22)');
  poly(c, [1, g, cx - W * 0.22, g - H * 0.62, cx, g - H * 0.86, cx + W * 0.24, g - H * 0.6, W - 1, g], CASH_DK, INK, LW);
  const rows = [4, 3, 2, 1], bw = 10.8, bh = 5, gap = 1.2;
  let bundle = 0;
  for (let r = 0; r < rows.length; r++) {
    const count = rows[r], rowW = count * bw + (count - 1) * gap;
    const y = g - 2.2 - bh - r * 5.7;
    const x0 = cx - rowW / 2 + (r % 2 ? 0.6 : -0.3);
    for (let col = 0; col < count; col++, bundle++) {
      const x = x0 + col * (bw + gap) + (h01(bundle + 3) - 0.5) * 0.7;
      const tone = [CASH, CASH_LT, '#a5dba0'][bundle % 3];
      const band = [PAPER_DK, BRASS_LT, PINKPAPER][(bundle + r) % 3];
      c.save();
      c.translate(x + bw / 2, y + bh / 2);
      c.rotate((h01(bundle + 19) - 0.5) * 0.09);
      rbox(c, -bw / 2 + 0.2, -bh / 2 + 1, bw - 0.4, bh - 0.7, 0.55, CASH_DK, INK, LWF);
      line(c, -bw / 2 + 1, bh / 2 - 1, bw / 2 - 1, bh / 2 - 1, PAPER_DK, 0.35);
      line(c, -bw / 2 + 1, bh / 2 - 0.45, bw / 2 - 1, bh / 2 - 0.45, CASH_LT, 0.3);
      rbox(c, -bw / 2, -bh / 2, bw, bh - 1.1, 0.65, tone, INK, 0.35);
      rbox(c, -bw / 2 + 0.75, -bh / 2 + 0.55, bw - 1.5, bh - 2.15, 0.4, null, CASH_DK, 0.28);
      box(c, -0.8, -bh / 2 + 0.35, 1.6, bh - 1.8, band, INK, 0.16);
      ell(c, 0, 0.1, 1.45, 0.82, CASH_PALE, CASH_DK, 0.24);
      line(c, 0, -0.35, 0, 0.5, CASH_DK, 0.28);
      line(c, -0.45, -0.12, 0.45, -0.12, CASH_DK, 0.24);
      line(c, -0.4, 0.25, 0.4, 0.25, CASH_DK, 0.24);
      c.restore();
    }
  }
  // Flat coin faces and their raised edges keep the spill from reading as dots.
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, t = h01(i + 7);
    const x = cx + side * (W * 0.3 + t * W * 0.16), y = g - 1.2 - (1 - t) * H * 0.25;
    const rx = 1.45 + t * 0.5, ry = 1 + t * 0.3;
    ell(c, x, y + 0.55, rx, ry, LEMON_DK, INK, LWF);
    ell(c, x, y, rx, ry, LEMON, INK, LWF);
    ell(c, x - rx * 0.24, y - 0.25, rx * 0.34, ry * 0.3, LEMON_LT);
    line(c, x - rx * 0.42, y + 0.1, x + rx * 0.42, y + 0.1, BRASS_DK, 0.22);
  }
  const looseNote = (x, y, w, h, angle, tone) => {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    rbox(c, -w / 2 + 0.5, -h / 2 + 0.8, w, h, 0.65, CASH_DK, INK, 0.28);
    rbox(c, -w / 2, -h / 2, w, h - 0.7, 0.65, tone, INK, 0.3);
    rbox(c, -w / 2 + 0.9, -h / 2 + 0.55, w - 1.8, h - 1.8, 0.4, null, CASH_DK, 0.24);
    ell(c, 0, 0, 1.5, 1, PAPER, INK, 0.18);
    line(c, 0, -0.55, 0, 0.55, CASH_DK, 0.25);
    c.restore();
  };
  looseNote(cx - 6.5, g - H * 0.84, 11, 5.2, -0.2, CASH_LT);
  looseNote(cx + 5.5, g - H * 0.88 + 1.2, 10, 5, 0.18, CASH);
  looseNote(cx + 11.5, g - H * 0.75 + 0.8, 9, 4.6, 0.32, '#a5dba0');
  const gx = cx + ((f / 8) * 2 - 1) * W * 0.25;
  poly(c, [gx, g - H * 0.7 - 2.2, gx + 0.6, g - H * 0.7 - 0.6, gx + 2.2, g - H * 0.7, gx + 0.6, g - H * 0.7 + 0.6,
    gx, g - H * 0.7 + 2.2, gx - 0.6, g - H * 0.7 + 0.6, gx - 2.2, g - H * 0.7, gx - 0.6, g - H * 0.7 - 0.6], '#fffbe0');
}

// THE FIRE ALARM'S PILLAR (office-2; Peter, 15 Oct: "i kinda love the pillar, it makes total sense
// and works since we have a ceiling" — fire alarm stand bake-off F): a column standing on the floor
// line, behind the lane, running up out of the picture, with a backing plate and a FIRE ALARM sign
// behind the call point. Drawn by draw.js behind each fireAlarm, in world units, the alarm box's
// centre at cx and the floor at g. Scenery: nothing collides with it.
const COLUMN = '#cfc6de', COLUMN_DK = '#bdb2cf', COLUMN_LT = '#e4ddef', ALARM_ALT = 36, CHAR_LT = '#55536a';
export function paintAlarmPillar(c, cx, g, top = 420) {
  const pw = 15, Y = (alt) => g - alt;
  body(c, rect(cx - pw / 2, Y(top), pw, top), COLUMN, (p) => {
    box(p, cx - pw / 2, Y(top), 1.6, top, COLUMN_LT);
    box(p, cx + pw / 2 - 3.2, Y(top), 3.2, top, COLUMN_DK);
  }, INK, LWI);
  // STANDING IN THE LANE, not on the wall's floor line (Peter, 15 Oct: "does this read as just a
  // little back from the game lane?"): a plinth wider than the column on the lane's own floor, its
  // top lit and its side in shade, and a contact shadow spreading onto the floor in front of it
  ell(c, cx + 1, g + 0.2, pw * 0.85, 2.2, 'rgba(31,29,38,0.22)');
  body(c, rect(cx - pw / 2 - 2.2, g - 5, pw + 4.4, 5), CHAR, (p) => {
    box(p, cx - pw / 2 - 2.2, g - 5, pw + 4.4, 1.2, CHAR_LT);
    box(p, cx + pw / 2 - 1.2, g - 5, 3.4, 5, CHAR_DK);
  }, INK, LWI);
  rbox(c, cx - 5.6, Y(ALARM_ALT + 13.5), 11.2, 14.2, 0.6, PAPER_DK, INK, LWF);
  box(c, cx - 6.4, Y(ALARM_ALT + 18.4), 12.8, 3.6, RED, INK, LWF);
  letters(c, 'FIRE ALARM', cx, Y(ALARM_ALT + 15.7), 1.45, { ink: PAPER, weight: 700, align: 'center', track: 0.1 });
}

// =================================================================== registry
// box [w, h] is the def's (game/entities.js); tall is PROP_TALL; visual is
// PROP_VISUAL_SCALE for the fliers, as drone and buzzbird carry. frames/fps
// are the prop ring; a still prop has one frame.
const SPECS = {
  wetFloorSign: { box: [13, 12], tall: 1.55, frames: 8, fps: 6, paint: wetFloorSign },
  waterDolly: { box: [17, 14], tall: 1.4, frames: 8, fps: 8, paint: waterDolly },
  newsBundle: { box: [12, 11], paint: newsBundle },
  mopBucket: { box: [12, 10], tall: 1.4, frames: 8, fps: 10, paint: mopBucket },
  ashUrnFire: { box: [13, 13], tall: 1.7, frames: 8, fps: 14, paint: ashUrnFire },
  velvetRope: { box: [16, 9], frames: 8, fps: 8, paint: velvetRope },
  artMobile: { box: [12, 7], tall: 8, visual: 1.35, frames: 8, fps: 6, paint: artMobile },
  paperPlane: { box: [12, 7], visual: 1.35, frames: 6, fps: 8, paint: paperPlane },
  coatStand: { box: [13, 12], tall: 1.55, frames: 6, fps: 6, paint: coatStand },
  snackMachine: { box: [12, 22], frames: 8, fps: 6, paint: snackMachine },
  archiveBox: { box: [12, 11], paint: archiveBox },
  mailCart: { box: [12, 10], tall: 1.35, frames: 8, fps: 12, paint: mailCart },
  binFire: { box: [13, 13], tall: 1.7, frames: 8, fps: 14, paint: binFire },
  drawingPins: { box: [15, 7], tall: 1.75, frames: 10, fps: 9, paint: drawingPins },
  birthdayBunting: { box: [12, 7], tall: 8, visual: 1.35, frames: 8, fps: 8, paint: birthdayBunting },
  partyBalloon: { box: [12, 7], tall: 1.4, visual: 1.35, frames: 8, fps: 8, paint: partyBalloon },
  shredder: { box: [12, 7], tall: 2.2, frames: 8, fps: 12, paint: shredder },
  fireAlarm: { box: [10, 11], paint: fireAlarm },
  fireAlarmPulled: { box: [10, 11], frames: 2, fps: 6, paint: (c, W, H, f) => fireAlarm(c, W, H, f, true) },
  founderBust: { box: [13, 12], tall: 1.55, paint: founderBust },
  officeSafe: { box: [17, 14], tall: 1.4, frames: 8, fps: 6, paint: officeSafe },
  vaultSafe: { box: [16, 24], frames: 8, fps: 6, paint: vaultSafe },
  vaultSafeOpen: { box: [16, 24], paint: (c, W, H) => vaultSafe(c, W, H, 0, true) },
  banknote: { box: [10, 6], frames: 8, fps: 8, paint: banknote },
  moneyPile: { box: [48, 26], frames: 8, fps: 4, paint: moneyPile },
  briefcase: { box: [12, 11], paint: briefcase },
  drinksTrolley: { box: [12, 10], tall: 1.4, frames: 8, fps: 12, paint: drinksTrolley },
  confidentialBin: { box: [13, 13], tall: 1.7, frames: 8, fps: 14, paint: (c, W, H, f) => binFire(c, W, H, f, true) },
  velvetRopeGold: { box: [16, 9], frames: 8, fps: 8, paint: (c, W, H, f) => velvetRope(c, W, H, f, true) },
  chandelier: { box: [12, 7], tall: 8, visual: 1.35, frames: 8, fps: 8, paint: chandelier },
  champagneCork: { box: [12, 7], visual: 1.35, frames: 8, fps: 16, paint: champagneCork },
};

// The painted envelope a painter is authored in, in world units.
export function officePropEnvelope(name) {
  const s = SPECS[name];
  const vis = s.visual || 1;
  return { w: Math.round(s.box[0] * 4 / 3 * vis), h: Math.round(s.box[1] * 4 / 3 * (s.tall || 1) * vis) };
}

export const OFFICE_PROP_NAMES = Object.keys(SPECS);
export const OFFICE_PROP_PAINTERS = {};
export const OFFICE_PROP_FRAMES = {};
export const OFFICE_PROP_FPS = {};
export const OFFICE_PROP_TALL = {};
export const OFFICE_PROP_VISUAL = {};
// Detail 2, as every standing hazard and flier: the pins' points, the dial's
// ticks and the cage on the cork are sub-pixel marks at single detail.
export const OFFICE_PROP_DETAIL = {};
for (const [name, s] of Object.entries(SPECS)) {
  const env = officePropEnvelope(name);
  const n = s.frames || 1;
  OFFICE_PROP_PAINTERS[name] = outlined((ctx, w, h, frame = 0) => {
    ctx.save();
    ctx.scale(w / env.w, h / env.h);
    s.paint(ctx, env.w, env.h, ((Math.floor(frame) % n) + n) % n);
    ctx.restore();
  });
  if (n > 1) {
    OFFICE_PROP_FRAMES[name] = n;
    OFFICE_PROP_FPS[name] = s.fps;
  }
  if (s.tall && s.tall !== 1) OFFICE_PROP_TALL[name] = s.tall;
  if (s.visual) OFFICE_PROP_VISUAL[name] = s.visual;
  OFFICE_PROP_DETAIL[name] = 2;
}
