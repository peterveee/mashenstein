// Halloween costumes for Gary, Lorenzo, Clara, Kiko and Fernwick — social stills
// only (26 Oct 2026).
// Review-only: rendered by tools/render-halloween.js, never imported by the game.
// Each costume is a spec/pal override on the shipped painter (drawToon's
// candidate seam) plus hand-drawn layers behind and in front of the figure.
//
// Layers draw in figure units: origin at the feet, y up is negative, 1 = the
// figure's draw height. Landmarks read off a calibration render of the idle
// pose: head centre (0, -0.76) radius 0.21, shoulders -0.52, hands at
// (±0.235, -0.305) on Gary and (±0.268, -0.30) on Lorenzo, belt -0.30.
import { drawToon, drawToonFace, setInk, TOON_SPECS, captureToonLandmarks, toonWalkStep } from '../sprites/toons.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINET_BY_ID } from '../data/cabinets.js';

const TAU = Math.PI * 2;
// Where the figure stands on the 400x500 page: feet centre and draw height.
// The stills use STILL; the Gary portraits stand him bigger (see PORTRAIT).
const STILL = { cx: 200, feet: 452, u: 300 };
let F = STILL;
const INK = '#1d1a2b';
const LW = 0.005;

// ---------------------------------------------------------------- drawing kit

function shape(g, fill, build, lw = LW, ink = INK) {
  g.beginPath();
  build(g);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.strokeStyle = ink; g.lineWidth = lw; g.stroke(); }
}
const oval = (x, y, rx, ry, rot = 0) => (g) => g.ellipse(x, y, rx, ry, rot, 0, TAU);
const poly = (pts) => (g) => { pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
function line(g, pts, colour, lw) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.strokeStyle = colour; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
  g.stroke();
}
function glow(g, x, y, r, rgb, a = 0.5) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
function label(g, text, x, y, size, colour, rot = 0) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.scale(size / 100, size / 100);
  g.font = "100px 'Lilita One'";
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = colour;
  g.fillText(text, 0, 0);
  g.restore();
}

// A cape from the shoulders to just off the floor, red lining showing at the
// front edges, with a standing collar that frames the head from behind.
function cape(g, { outer = '#17141f', lining = '#9a1c2c', collar = true, hem = -0.04, flare = 0.4 }) {
  shape(g, outer, poly([
    [-0.17, -0.55], [-flare, hem + 0.02], [-flare * 0.5, hem - 0.02], [0, hem + 0.02],
    [flare * 0.5, hem - 0.02], [flare, hem + 0.02], [0.17, -0.55],
  ]));
  shape(g, lining, poly([[-0.17, -0.55], [-flare + 0.06, hem + 0.03], [-flare * 0.55, hem + 0.01], [-0.2, -0.45]]), 0);
  shape(g, lining, poly([[0.17, -0.55], [flare - 0.06, hem + 0.03], [flare * 0.55, hem + 0.01], [0.2, -0.45]]), 0);
  if (collar) capeCollar(g, { outer, lining });
}

function capeCollar(g, { outer = '#17141f', lining = '#9a1c2c' } = {}) {
  shape(g, outer, poly([[-0.14, -0.56], [-0.36, -0.86], [-0.24, -0.84], [-0.2, -0.92], [0, -0.6], [0.2, -0.92], [0.24, -0.84], [0.36, -0.86], [0.14, -0.56]]));
  shape(g, lining, poly([[-0.15, -0.58], [-0.31, -0.83], [-0.22, -0.81], [-0.19, -0.87], [-0.06, -0.62]]), 0);
  shape(g, lining, poly([[0.15, -0.58], [0.31, -0.83], [0.22, -0.81], [0.19, -0.87], [0.06, -0.62]]), 0);
}

function fangs(g, y, x = 0.028, len = 0.03) {
  const half = 0.012 + Math.max(0, len - 0.03) * 0.15;
  for (const s of [-1, 1]) {
    shape(g, '#fffdf4', poly([[s * x - half, y], [s * x + half, y], [s * x, y + len]]), len > 0.04 ? 0.004 : 0.003);
  }
}

function neckBolts(g, y = -0.6, x = 0.205) {
  for (const s of [-1, 1]) {
    shape(g, '#8d93a3', (c) => c.rect(s > 0 ? x - 0.01 : -x - 0.035, y - 0.018, 0.045, 0.036));
    shape(g, '#b9bfcc', (c) => c.rect(s > 0 ? x + 0.03 : -x - 0.05, y - 0.03, 0.02, 0.06));
  }
}

function stitches(g, pts, ticks = 5) {
  line(g, pts, INK, 0.006);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  for (let i = 1; i <= ticks; i++) {
    const t = i / (ticks + 1);
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    line(g, [[x - 0.006, y - 0.016], [x + 0.006, y + 0.016]], INK, 0.005);
  }
}

// A jack-o'-lantern: ribbed orange body, a carved face lit from inside.
function pumpkin(g, x, y, rx, ry, { face = 'grin', stem = true } = {}) {
  if (stem) shape(g, '#4f6b2a', poly([[x - 0.02, y - ry * 0.9], [x - 0.012, y - ry - 0.07], [x + 0.03, y - ry - 0.09], [x + 0.02, y - ry * 0.88]]));
  shape(g, '#e2741f', oval(x, y, rx, ry));
  g.save();
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.clip();
  for (const k of [-0.62, -0.25, 0.25, 0.62]) {
    shape(g, null, oval(x + k * rx, y, rx * 0.38, ry * 0.98), 0.004, 'rgba(120,40,10,0.55)');
  }
  const sh = g.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 0, x, y, rx * 1.2);
  sh.addColorStop(0, 'rgba(255,200,120,0.35)'); sh.addColorStop(1, 'rgba(90,20,0,0.25)');
  g.fillStyle = sh; g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  g.restore();
  shape(g, null, oval(x, y, rx, ry));
  const lit = '#ffd84a';
  // eyes
  shape(g, lit, poly([[x - rx * 0.55, y - ry * 0.05], [x - rx * 0.32, y - ry * 0.48], [x - rx * 0.1, y - ry * 0.05]]), 0.004);
  shape(g, lit, poly([[x + rx * 0.1, y - ry * 0.05], [x + rx * 0.32, y - ry * 0.48], [x + rx * 0.55, y - ry * 0.05]]), 0.004);
  shape(g, lit, poly([[x - rx * 0.06, y + ry * 0.12], [x, y], [x + rx * 0.06, y + ry * 0.12]]), 0.004);
  if (face === 'flat') {
    // Gary's own mouth: a straight slot. He does not grin for anybody.
    shape(g, lit, (c) => c.rect(x - rx * 0.42, y + ry * 0.36, rx * 0.84, ry * 0.12), 0.004);
  } else {
    shape(g, lit, poly([
      [x - rx * 0.62, y + ry * 0.25], [x - rx * 0.4, y + ry * 0.4], [x - rx * 0.3, y + ry * 0.3], [x - rx * 0.15, y + ry * 0.48],
      [x, y + ry * 0.36], [x + rx * 0.15, y + ry * 0.48], [x + rx * 0.3, y + ry * 0.3], [x + rx * 0.4, y + ry * 0.4],
      [x + rx * 0.62, y + ry * 0.25], [x + rx * 0.3, y + ry * 0.66], [x, y + ry * 0.6], [x - rx * 0.3, y + ry * 0.66],
    ]), 0.004);
  }
}

// Gary's paper hat, redrawn so it can sit on things that are not his head.
function paperHat(g, x, y, w = 0.42) {
  shape(g, '#e8e8f0', poly([[x - w / 2, y], [x - w / 2 + 0.01, y - 0.09], [x, y - 0.11], [x + w / 2 - 0.01, y - 0.08], [x + w / 2, y]]));
  shape(g, '#c8c8da', poly([[x - w / 2 + 0.02, y - 0.002], [x - w / 2 + 0.025, y - 0.05], [x, y - 0.062], [x + w / 2 - 0.02, y - 0.046], [x + w / 2 - 0.02, y]]), 0.003);
}

// Bandage wraps: pale strips laid across a region at a slight angle, clipped
// to it, with dark gaps letting the figure show through.
function wraps(g, clip, { y0, y1, step = 0.04, tilt = 0.08, colour = '#ece4cc', shadow = '#b9ae92', seed = 1 }) {
  g.save();
  g.beginPath(); clip(g); g.clip();
  let i = 0;
  for (let y = y0; y < y1; y += step) {
    const t = (i++ * 0.37 + seed) % 1;
    const a = tilt * (i % 2 ? 1 : -1);
    shape(g, colour, poly([[-0.6, y + a * 0.6], [0.6, y - a * 0.6], [0.6, y - a * 0.6 + step * 0.82], [-0.6, y + a * 0.6 + step * 0.82]]), 0.003, shadow);
    if (t > 0.6) line(g, [[-0.1 + t * 0.2, y + step * 0.2], [0.02 + t * 0.2, y + step * 0.5]], shadow, 0.003);
  }
  g.restore();
}

// ---------------------------------------------------------------- head pieces
// Everything that rides on a head, drawn where the standing pose puts it. The
// stills draw these in place; the walk re-anchors them on the moving head.

function monsterHead(g) {
  shape(g, '#1c221c', poly([
    [-0.215, -0.79], [-0.22, -0.99], [0.22, -0.99], [0.215, -0.79],
    [0.17, -0.86], [0.12, -0.83], [0.07, -0.87], [0.02, -0.84], [-0.04, -0.875], [-0.09, -0.835], [-0.14, -0.87], [-0.18, -0.83],
  ]));
  stitches(g, [[0.08, -0.7], [0.17, -0.655]], 3);
}

// Behind the head: the skull covers their inner ends, so they come out of his neck.
function monsterBolts(g) { neckBolts(g, -0.6, 0.135); }

function countHead(g) {
  // The shipped painter sets his nose 0.02 right of the head's centre (the
  // cap brim normally balances it), so the hairline peak follows the nose.
  // The mustache's lobes are uneven: measured off the render its full width
  // centres at +0.008, and that is the line the mouth hangs from.
  const fx = 0.017, mx = 0.008;
  shape(g, '#3a2210', (c) => {
    c.moveTo(-0.212, -0.72);
    c.quadraticCurveTo(-0.235, -0.97, 0, -0.98);
    c.quadraticCurveTo(0.235, -0.97, 0.212, -0.72);
    c.quadraticCurveTo(0.17, -0.85, fx + 0.06, -0.87);
    c.lineTo(fx, -0.81);
    c.lineTo(fx - 0.06, -0.87);
    c.quadraticCurveTo(-0.17, -0.85, -0.212, -0.72);
    c.closePath();
  });
  // No mouth of his own under the mustache at rest, so the fangs get one to
  // hang from: an open grin tucked up against its lower edge. The walk keeps
  // this mouth even in --smile (Peter: it reads better than fangs on the
  // painter's big grin, whose white teeth swallow them).
  const mouth = (c) => {
    c.moveTo(mx - 0.06, -0.643);
    c.quadraticCurveTo(mx, -0.575, mx + 0.06, -0.643);
    c.quadraticCurveTo(mx, -0.632, mx - 0.06, -0.643);
    c.closePath();
  };
  shape(g, '#3a1018', mouth, 0);
  g.save(); g.beginPath(); mouth(g); g.clip();
  shape(g, '#c0505e', oval(mx, -0.606, 0.03, 0.012), 0);
  g.restore();
  shape(g, null, mouth, 0.004);
  g.save(); g.translate(mx, 0);
  fangs(g, -0.641, 0.03, 0.028);
  g.restore();
}

// A big hat, pulled down: the brim runs across the middle of both buns and the
// crown's base spans most of them, so only their outer tops show — her own
// buns, wraps and ribbons as she always wears them.
function kikoHat(g) {
  const v = KIKO_HATS[KIKO_HAT];
  if (v.floppy) floppyHat(g, v);
  else if (v.flat) witchHat(g, 0, v.y, { w: v.w, h: v.h, band: '#7bc043' });
  else if (!v.allBehind) seatedHat(g, 'front', v);
}
function kikoHatBehind(g) {
  const v = KIKO_HATS[KIKO_HAT];
  if (v.floppy) return;
  if (v.allBehind) { seatedHat(g, 'behind', v); seatedHat(g, 'front', v); } else if (!v.flat) seatedHat(g, 'behind', v);
}

// KIKO'S HAT — bake-off (26 Oct 2026). A is the flat hat the stills had: one
// ellipse for a brim laid ACROSS the head, which is why it never looked worn.
// The rest are SEATED: the brim's back half goes behind the head (and behind
// her buns), its front half in front of her hair, and the crown's base is about
// as wide as her skull — so the head is inside the hat rather than under a
// plate balanced on it. `tilt` is radians, + leans the tip toward her front.
export const KIKO_HATS = {
  A: { label: 'A  flat (now)', flat: true, y: -0.86, w: 0.36, h: 0.5 },
  B: { label: 'B  seated', y: -0.87, w: 0.33, crown: 0.165, h: 0.48, tilt: 0 },
  C: { label: 'C  seated, tipped back', y: -0.87, w: 0.33, crown: 0.165, h: 0.48, tilt: -0.16 },
  // Peter's pick, 26 Oct, after many rounds: the hat SITS ON HER BUNS. The brim
  // stays level, its underside resting on the tops of both buns and the crown
  // of her head (buns centred at y -0.86, radius 0.085, so their tops are at
  // -0.945), and only the cone tips back. A tilted brim can only rest on one
  // bun, which is what kept reading as not on her head. Straight cone, the
  // tip just bent over, a little smaller than the first D.
  D: { label: 'D  small, tipped back', y: -0.91, scale: 0.88, w: 0.34, brimDepth: 0.26, crown: 0.13, h: 0.46, tilt: -0.22, crownTilt: -0.08, shadow: true, point: true, brimFront: true },
  E: { label: 'E  pulled down low', y: -0.82, w: 0.37, crown: 0.19, h: 0.52, tilt: 0 },
  F: { label: 'F  on the back of her head', y: -0.89, w: 0.31, crown: 0.16, h: 0.46, tilt: -0.1, allBehind: true },
  // Round two (26 Oct): FLOPPY. The tip folds over and hangs back, the brim is
  // cloth rather than a disc (its front edge dips over her forehead, the ends
  // droop or curl), and a soft shadow under the brim seats it on her head.
  G: { label: 'G  floppy tip, drooping brim', floppy: true, y: -0.86, w: 0.34, crown: 0.15, h: 0.46, tilt: -0.06, droop: 0.025, flop: 1 },
  H: { label: 'H  floppy tip, curled brim', floppy: true, y: -0.86, w: 0.34, crown: 0.15, h: 0.46, tilt: -0.06, droop: -0.03, flop: 1.25 },
  I: { label: 'I  taller, big flop, deep droop', floppy: true, y: -0.85, w: 0.35, crown: 0.16, h: 0.54, tilt: -0.04, droop: 0.04, flop: 1.5 },
};
let KIKO_HAT = 'D';

// Her colours against the crypt's blue-violet night (26 Oct): the purple she
// started in sits too close to the sky to read. `pal` goes on the qipao.
export const KIKO_LOOKS = {
  purple: { label: '1  purple (now)', hat: '#2a1f3d', band: '#7bc043', pal: { b: '#3b2457', sash: '#7bc043', a: '#7bc043' } },
  flip: { label: '2  flipped: green dress, purple trim', hat: '#3b2457', band: '#7bc043', pal: { b: '#4f9a35', sash: '#3b2457', a: '#3b2457' } },
  black: { label: '3  black, green trim', hat: '#16141c', band: '#7bc043', pal: { b: '#1f1c26', sash: '#7bc043', a: '#7bc043' } },
  orange: { label: '4  black hat, orange dress', hat: '#16141c', band: '#e2741f', pal: { b: '#e2741f', sash: '#16141c', a: '#16141c' } },
  greenBlack: { label: '5  green dress, black hat', hat: '#16141c', band: '#e2741f', pal: { b: '#4f9a35', sash: '#16141c', a: '#e2741f' } },
};
let KIKO_LOOK = 'orange';   // Peter's pick, 26 Oct (after trying 5)
export function setKikoLook(id) {
  if (!KIKO_LOOKS[id]) return;
  KIKO_LOOK = id;
  COSTUMES.kiko.find((c) => c.id === 'witch').pal = { ...KIKO_LOOKS[id].pal };
}
export function setKikoHat(id) { if (KIKO_HATS[id]) KIKO_HAT = id; }

// Everything in front of her head: the shadow the brim casts on her hair and
// brow, the crown with its tip folded over, the band, and the brim on top.
function floppyHat(g, { y, w, crown, h, tilt = 0, droop = 0, flop = 1 }) {
  const ry = w * 0.24, colour = KIKO_LOOKS[KIKO_LOOK].hat, band = KIKO_LOOKS[KIKO_LOOK].band;
  // the shadow, clipped to her head (centre (0, -0.72), radius 0.185)
  g.save();
  g.beginPath(); g.ellipse(0, -0.72, 0.19, 0.19, 0, 0, TAU); g.clip();
  const sh = g.createLinearGradient(0, y + ry * 0.6, 0, y + ry * 0.6 + 0.07);
  sh.addColorStop(0, 'rgba(20,12,30,0.45)'); sh.addColorStop(1, 'rgba(20,12,30,0)');
  g.fillStyle = sh; g.fillRect(-0.3, y, 0.6, ry + 0.09);
  g.restore();
  g.save();
  g.translate(0, y); g.rotate(tilt); g.translate(0, -y);
  // the crown, its top folded over and hanging back (toward -x)
  const bx = -0.035, by = y - h * 0.8;               // where it bends
  const tipX = bx - 0.1 * flop, tipY = by + 0.035 * flop;
  shape(g, colour, (c) => {
    c.moveTo(-crown, y);
    c.bezierCurveTo(-crown * 0.85, y - h * 0.38, -0.06, y - h * 0.66, bx, by);
    c.bezierCurveTo(bx + 0.01, y - h * 0.97, tipX + 0.05, y - h * 1.0, tipX - 0.008, tipY - 0.006);
    c.quadraticCurveTo(tipX - 0.006, tipY + 0.012, tipX + 0.01, tipY + 0.008);
    c.quadraticCurveTo(bx - 0.02, by - 0.012, bx + 0.04, y - h * 0.7);
    c.bezierCurveTo(0.06, y - h * 0.5, crown * 0.8, y - h * 0.22, crown, y);
    c.closePath();
  });
  line(g, [[bx + 0.004, by + 0.006], [bx + 0.035, y - h * 0.71]], 'rgba(255,255,255,0.12)', 0.006);
  shape(g, band, (c) => {
    c.moveTo(-crown, y); c.quadraticCurveTo(0, y + 0.012, crown, y);
    c.lineTo(crown * 0.92, y - h * 0.13); c.quadraticCurveTo(0, y - h * 0.13 + 0.01, -crown * 0.92, y - h * 0.13);
    c.closePath();
  }, 0.003);
  shape(g, null, (c) => c.rect(-0.022, y - h * 0.12, 0.044, h * 0.1), 0.006, '#e0b24a');
  // the brim: its back edge a shallow arch behind the crown, its front edge
  // dipping over her forehead, and the two ends drooping (or curling up)
  shape(g, colour, (c) => {
    c.moveTo(-w, y + droop);
    c.quadraticCurveTo(-w * 0.6, y - ry * 0.95, 0, y - ry * 0.9);
    c.quadraticCurveTo(w * 0.6, y - ry * 0.95, w, y + droop);
    c.quadraticCurveTo(w * 0.55, y + ry * 1.45, 0, y + ry * 1.25);
    c.quadraticCurveTo(-w * 0.55, y + ry * 1.45, -w, y + droop);
    c.closePath();
  });
  g.restore();
}

// `pivot`: tip the hat about this height (her head's centre) instead of about
// the brim, so it rolls back ROUND her skull and stays on it, rather than
// lifting one side of the brim off her hair. `shadow`: the brim's shade on her
// hair and brow, clipped to the head — the cue that it is sitting on it.
function seatedHat(g, part, { y, w, crown, h, tilt = 0, point = false, brimFront = false, brimDepth = 0.2, scale = 1, pivot = null, shadow = false, crownTilt = 0 }) {
  const ry = w * brimDepth, colour = KIKO_LOOKS[KIKO_LOOK].hat, band = KIKO_LOOKS[KIKO_LOOK].band;
  const py = pivot ?? y;
  if (shadow && part === 'front') {
    g.save();
    g.beginPath(); g.ellipse(0, -0.72, 0.19, 0.19, 0, 0, TAU);
    for (const sx of [-1, 1]) { g.moveTo(sx * 0.205 + 0.09, -0.86); g.ellipse(sx * 0.205, -0.86, 0.09, 0.09, 0, 0, TAU); }
    g.clip();
    g.translate(0, py); g.rotate(tilt); g.translate(0, -py);
    const top = y + w * brimDepth * scale * 0.5;
    const sh = g.createLinearGradient(0, top, 0, top + 0.07);
    sh.addColorStop(0, 'rgba(20,12,30,0.5)'); sh.addColorStop(1, 'rgba(20,12,30,0)');
    g.fillStyle = sh; g.fillRect(-0.3, top - 0.02, 0.6, 0.1);
    g.restore();
  }
  g.save();
  g.translate(0, py); g.rotate(tilt); g.translate(0, -py);
  g.translate(0, y); g.scale(scale, scale); g.translate(0, -y);
  if (part === 'behind') {
    if (!brimFront) shape(g, colour, oval(0, y, w, ry));
  } else {
    if (brimFront) shape(g, colour, oval(0, y, w, ry));
    // the cone leans on its own, about the middle of its base on the brim
    g.save();
    g.translate(0, y); g.rotate(crownTilt); g.translate(0, -y);
    if (point) {
      // a straight cone, only its last eighth bent over toward her back, so
      // it reads as a little floppy without losing the witch-hat point
      shape(g, colour, (c) => {
        c.moveTo(-crown, y);
        c.quadraticCurveTo(-crown * 0.5, y - h * 0.5, -0.012, y - h * 0.86);
        c.quadraticCurveTo(-0.02, y - h * 0.97, -0.065, y - h * 0.95);
        c.quadraticCurveTo(-0.07, y - h * 0.935, -0.06, y - h * 0.925);
        c.quadraticCurveTo(-0.02, y - h * 0.92, 0.014, y - h * 0.85);
        c.quadraticCurveTo(crown * 0.55, y - h * 0.5, crown, y);
        c.closePath();
      });
    } else
    // crown: wide at the base, narrowing, the tip bent over toward her back
    shape(g, colour, (c) => {
      c.moveTo(-crown, y);
      c.quadraticCurveTo(-crown * 0.55, y - h * 0.5, -0.02, y - h * 0.86);
      c.quadraticCurveTo(-0.07, y - h * 1.02, -0.15, y - h * 0.93);
      c.quadraticCurveTo(-0.07, y - h * 0.86, crown * 0.3, y - h * 0.5);
      c.quadraticCurveTo(crown * 0.8, y - h * 0.2, crown, y);
      c.closePath();
    });
    // the band wraps the cone, so both its edges bow down toward us
    const sag = 0.022, bh = h * 0.12;
    shape(g, band, (c) => {
      c.moveTo(-crown, y); c.quadraticCurveTo(0, y + sag * 2, crown, y);
      c.lineTo(crown * 0.9, y - bh); c.quadraticCurveTo(0, y - bh + sag * 1.8, -crown * 0.9, y - bh);
      c.closePath();
    }, 0.003);
    shape(g, null, (c) => c.rect(-0.022, y - bh + sag * 0.95, 0.044, bh * 0.85), 0.006, '#e0b24a');
    g.restore();
    // the brim's front half, over her hair and the base of the crown
    if (!brimFront) shape(g, colour, (c) => {
      c.moveTo(-w, y);
      c.ellipse(0, y, w, ry, 0, Math.PI, 0, true);
      c.quadraticCurveTo(0, y + ry * 0.3, -w, y);
      c.closePath();
    });
  }
  g.restore();
}

function fernHorns(g) { devilHorns(g, 0, -0.89, 0.12); }

// The ears go BEHIND the head, rooted in the hair, so there is no straight
// base sitting on top of it.
// Her hair's crown is a curve of about 0.23 about the head centre (0.009, -0.765).
function catEarPair(g) { catEars(g, { cx: 0.009, cy: -0.765, r: 0.2, tilt: 0.6, size: 0.145 }); }

function catFace(g) {
  // Her face sits a hair right of the figure's centre line (0.009), so the
  // painted-on features take their x from the face, not from zero.
  const fx = 0.009;
  whiskers(g, fx, -0.685);
  shape(g, '#1d1b24', (c) => {
    c.moveTo(fx - 0.02, -0.7); c.quadraticCurveTo(fx, -0.706, fx + 0.02, -0.7);
    c.quadraticCurveTo(fx + 0.006, -0.68, fx, -0.678); c.quadraticCurveTo(fx - 0.006, -0.68, fx - 0.02, -0.7);
    c.closePath();
  }, 0);
}

// Gary's vampire, in pieces the portrait reuses.
function garyVampHair(g) {
  // widow's peak, slicked flat
  shape(g, '#1b2a1b', (c) => {
    c.moveTo(-0.205, -0.73);
    c.quadraticCurveTo(-0.23, -0.96, 0, -0.975);
    c.quadraticCurveTo(0.23, -0.96, 0.205, -0.73);
    c.quadraticCurveTo(0.17, -0.86, 0.06, -0.87);
    c.lineTo(0, -0.81);
    c.lineTo(-0.06, -0.87);
    c.quadraticCurveTo(-0.17, -0.86, -0.205, -0.73);
    c.closePath();
  });
}
function garyVampShirt(g) {
  shape(g, '#f1eee6', poly([[-0.06, -0.55], [0.06, -0.55], [0, -0.38]]), 0.003);
  shape(g, '#a51d2d', poly([[0, -0.52], [-0.05, -0.545], [-0.05, -0.495]]), 0.003);
  shape(g, '#a51d2d', poly([[0, -0.52], [0.05, -0.545], [0.05, -0.495]]), 0.003);
  shape(g, '#a51d2d', oval(0, -0.52, 0.012, 0.012), 0.003);
}
// On his smile (faceJoy): the open mouth's straight top edge is at -0.666 (the
// fangs start a touch below it, inside the lip, so their bases do not sit on it),
// centred 0.01 right of the head, half a mouth 0.085 wide. Measured off the
// render, not guessed — the fangs hang from that edge either side of centre.
function garyFangs(g) {
  g.save(); g.translate(0.01, 0);
  fangs(g, -0.6648, 0.032, 0.036);
  g.restore();
}

// B-33P under a sheet: the antenna comes through the top still broadcasting
// (the rings are his victory pose's, same colour, same staggered three), his
// LED eyes glow in the eye holes, and only his feet show below the hem. `t`
// drives the rings, the lamp's blink and the hem's sway.
const B33P = { stalk: '#4d5972', ring: '#7ef0ff', lamp: '#f6d33c', lampOff: '#e8f8ff', led: '#e8f8ff' };
const B33P_HIDE_ABOVE = -0.13;      // legs are drawn only below this; the hem hangs lower
function b33pGhost(g, t = 0.35) {
  const hem = -0.09, wide = 0.35, sway = Math.sin(t * 5) * 0.012;
  // antenna first, so the sheet's top edge is what it pokes out of
  const bx = 0.012, by = -0.97, tx = 0.036, ty = -1.13;   // stalk ~half as long again (Peter)
  line(g, [[bx, by], [tx, ty]], INK, 0.034);
  line(g, [[bx, by], [tx, ty]], B33P.stalk, 0.024);
  shape(g, '#f4f2ec', (c) => {
    c.moveTo(-0.23, -0.86);
    c.quadraticCurveTo(-0.22, -1.0, 0, -1.0);
    c.quadraticCurveTo(0.22, -1.0, 0.23, -0.86);
    c.quadraticCurveTo(0.26, -0.6, 0.32, -0.42);
    c.quadraticCurveTo(wide + sway, -0.25, wide + sway, hem);
    const xs = [wide, wide * 0.6, wide * 0.2, -wide * 0.2, -wide * 0.6, -wide];
    for (let i = 1; i < xs.length; i++) c.quadraticCurveTo((xs[i - 1] + xs[i]) / 2 + sway, hem + 0.045, xs[i] + sway, hem);
    c.quadraticCurveTo(-wide + sway, -0.25, -0.32, -0.42);
    c.quadraticCurveTo(-0.26, -0.6, -0.23, -0.86);
    c.closePath();
  });
  // a ring of cloth gathered where the antenna comes through
  shape(g, '#e2dfd6', oval(0.012, -0.995, 0.03, 0.01), 0.003);
  line(g, [[-0.13, -0.6], [-0.2 + sway, hem - 0.04]], 'rgba(150,145,170,0.5)', 0.006);
  line(g, [[0.14, -0.55], [0.21 + sway, hem - 0.04]], 'rgba(150,145,170,0.5)', 0.006);
  // eye holes with his LEDs glowing in them
  for (const sd of [-1, 1]) {
    shape(g, '#0d0b12', oval(sd * 0.075, -0.79, 0.045, 0.055));
    glow(g, sd * 0.075, -0.79, 0.05, '126,240,255', 0.55);
    shape(g, B33P.led, (c) => c.roundRect(sd * 0.075 - 0.02, -0.815, 0.04, 0.05, 0.012), 0);
  }
  // the broadcast: three rings staggered through one life, thinning as they spread
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.8 + i / 3) % 1;
    g.save();
    g.globalAlpha = (1 - q) * 0.9;
    g.beginPath(); g.arc(tx, ty, 0.21 * (0.2 + q * 0.95), 0, TAU);
    g.strokeStyle = B33P.ring; g.lineWidth = 0.013 * (1 - q * 0.55); g.stroke();
    g.restore();
  }
  shape(g, Math.sin(t * 6) > 0 ? B33P.lamp : B33P.lampOff, oval(tx, ty, 0.027, 0.027), 0.004);
}

// ---------------------------------------------------------------- the costumes

const GARY_HAND = [0.235, -0.305];
const LORENZO_HAND = [0.268, -0.30];

export const COSTUMES = {
  gary: [
    {
      id: 'vampire', letter: 'A', label: 'VAMPIRE',
      // Slicked back, cape and collar, black suit, and a big smile to show the fangs.
      spec: { head: 'none', nameTag: false },
      pal: { b: '#221d2c', p: '#16141c', f: '#16141c' },
      pose: { faceJoy: true },
      behind: (g) => cape(g, {}),
      front: (g) => { garyVampHair(g); garyVampShirt(g); garyFangs(g); },
    },
    {
      id: 'sheet', letter: 'B', label: 'GHOST (SHEET)',
      // The cheapest costume there is: hat over the sheet, name tag pinned on the OUTSIDE.
      spec: { head: 'none' },
      front: (g) => {
        shape(g, '#f4f2ec', (c) => {
          c.moveTo(-0.24, -0.86);
          c.quadraticCurveTo(-0.22, -1.02, 0, -1.03);
          c.quadraticCurveTo(0.22, -1.02, 0.24, -0.86);
          c.quadraticCurveTo(0.26, -0.6, 0.3, -0.5);
          c.quadraticCurveTo(0.33, -0.3, 0.34, -0.1);
          c.quadraticCurveTo(0.29, -0.06, 0.24, -0.1);
          c.quadraticCurveTo(0.18, -0.05, 0.11, -0.09);
          c.quadraticCurveTo(0.04, -0.04, -0.03, -0.09);
          c.quadraticCurveTo(-0.1, -0.05, -0.17, -0.09);
          c.quadraticCurveTo(-0.25, -0.05, -0.34, -0.1);
          c.quadraticCurveTo(-0.33, -0.3, -0.3, -0.5);
          c.quadraticCurveTo(-0.26, -0.6, -0.24, -0.86);
          c.closePath();
        });
        // folds
        line(g, [[-0.12, -0.6], [-0.18, -0.12]], 'rgba(150,145,170,0.5)', 0.006);
        line(g, [[0.14, -0.55], [0.2, -0.13]], 'rgba(150,145,170,0.5)', 0.006);
        line(g, [[0.02, -0.42], [0.04, -0.1]], 'rgba(150,145,170,0.35)', 0.005);
        // eye holes, his red eyes inside
        for (const s of [-1, 1]) {
          shape(g, '#0d0b12', oval(s * 0.075, -0.79, 0.045, 0.055));
          shape(g, '#d83030', oval(s * 0.075, -0.785, 0.016, 0.016), 0);
        }
        // name tag on the outside
        shape(g, '#fff', (c) => c.roundRect(0.03, -0.53, 0.1, 0.06, 0.008), 0.003);
        label(g, 'GARY', 0.08, -0.5, 0.032, '#c85028');
        shape(g, '#b0b4c0', oval(0.08, -0.535, 0.006, 0.006), 0.002);
        paperHat(g, 0, -0.965, 0.38);
      },
    },
    {
      id: 'alive', letter: 'C', label: 'A LIVING PERSON',
      // A human mask. He did the face. He did not do the hands.
      pal: { s: '#f1c9a3', hair: '#6b4a2b' },   // his own red eyes show through the mask
      front: (g) => {
        for (const s of [-1, 1]) {
          shape(g, '#9ec89e', oval(s * GARY_HAND[0], GARY_HAND[1], 0.04, 0.04));
          shape(g, 'rgba(230,110,110,0.35)', oval(s * 0.12, -0.69, 0.032, 0.02), 0);
        }
        // the mask's elastic
        line(g, [[-0.2, -0.78], [-0.24, -0.78]], '#2a2238', 0.004);
        line(g, [[0.2, -0.78], [0.24, -0.78]], '#2a2238', 0.004);
        // green showing at the neck, under the mask's edge
        shape(g, '#9ec89e', oval(0, -0.565, 0.07, 0.016), 0.003);
        // the sticker
        g.save();
        g.translate(-0.07, -0.42); g.rotate(-0.08);
        shape(g, '#fff', (c) => c.roundRect(-0.075, -0.045, 0.15, 0.09, 0.01), 0.003);
        shape(g, '#d8333a', (c) => c.roundRect(-0.075, -0.045, 0.15, 0.03, [0.01, 0.01, 0, 0]), 0);
        label(g, 'HELLO I AM', 0, -0.03, 0.017, '#fff');
        label(g, 'ALIVE', 0, 0.012, 0.042, '#2a2238');
        g.restore();
      },
    },
    {
      id: 'monster', letter: 'D', label: 'THE MONSTER',
      // He was already green. Flat top, two bolts, a row of stitches. Done.
      spec: { head: 'none' },
      behind: monsterBolts,
      headBehind: monsterBolts,
      head: monsterHead,
      front: (g) => {
        monsterHead(g);
        stitches(g, [[-0.215, -0.42], [-0.29, -0.4]], 2);
      },
    },
    {
      id: 'headless', letter: 'E', label: 'HEADLESS',
      // The one costume only Gary can do: he carries the head, in both hands,
      // tucked under his arm like a box of files. The figure is drawn whole and
      // clipped at the collar (the painter's own headless pose throws the arms
      // up); the head goes in behind the hip so the arm and hand land over it.
      clip: (g) => g.rect(-1, -0.555, 2, 1),
      shift: -0.2,
      behind: (g, ctx) => {
        g.save();
        g.scale(1 / F.u, 1 / F.u);
        drawToonFace(ctx, 'gary', 0.1 * F.u, -0.63 * F.u, 0.6 * F.u, 0.6 * F.u, { light: false });
        g.restore();
      },
      front: (g) => shape(g, '#9ec89e', oval(0, -0.556, 0.07, 0.03), 0.004),
    },
    {
      id: 'pumpkin', letter: 'F', label: 'PUMPKIN HEAD',
      // A jack-o'-lantern over the head, carved with his own flat mouth, hat on top.
      spec: { head: 'none' },
      front: (g) => {
        glow(g, 0, -0.76, 0.42, '255,170,60', 0.18);
        pumpkin(g, 0, -0.775, 0.255, 0.225, { face: 'flat', stem: false });
        paperHat(g, 0, -0.95, 0.34);
      },
    },
  ],

  lorenzo: [
    {
      id: 'sheet', letter: 'A', label: 'GHOST (SHEET)',
      // The cap goes on over the sheet, the mustache does not fit under it.
      spec: { head: 'none' },
      front: (g) => {
        shape(g, '#f4f2ec', (c) => {
          c.moveTo(-0.25, -0.84);
          c.quadraticCurveTo(-0.23, -1.02, 0, -1.02);
          c.quadraticCurveTo(0.23, -1.02, 0.25, -0.84);
          c.quadraticCurveTo(0.29, -0.6, 0.33, -0.48);
          c.quadraticCurveTo(0.37, -0.28, 0.37, -0.1);
          c.quadraticCurveTo(0.31, -0.06, 0.25, -0.1);
          c.quadraticCurveTo(0.18, -0.05, 0.11, -0.09);
          c.quadraticCurveTo(0.04, -0.04, -0.03, -0.09);
          c.quadraticCurveTo(-0.1, -0.05, -0.18, -0.09);
          c.quadraticCurveTo(-0.27, -0.05, -0.37, -0.1);
          c.quadraticCurveTo(-0.37, -0.28, -0.33, -0.48);
          c.quadraticCurveTo(-0.29, -0.6, -0.25, -0.84);
          c.closePath();
        });
        line(g, [[-0.14, -0.58], [-0.2, -0.12]], 'rgba(150,145,170,0.5)', 0.006);
        line(g, [[0.15, -0.52], [0.22, -0.13]], 'rgba(150,145,170,0.5)', 0.006);
        for (const s of [-1, 1]) shape(g, '#0d0b12', oval(s * 0.075, -0.79, 0.045, 0.055));
        // mustache out through a slit
        shape(g, '#5a3212', (c) => {
          c.moveTo(0, -0.68);
          c.quadraticCurveTo(-0.07, -0.72, -0.14, -0.645);
          c.quadraticCurveTo(-0.06, -0.63, 0, -0.66);
          c.quadraticCurveTo(0.06, -0.63, 0.14, -0.645);
          c.quadraticCurveTo(0.07, -0.72, 0, -0.68);
          c.closePath();
        });
        // cap on top
        shape(g, '#7b4bd0', (c) => {
          c.moveTo(-0.2, -0.9);
          c.quadraticCurveTo(-0.2, -1.08, 0.02, -1.08);
          c.quadraticCurveTo(0.2, -1.07, 0.2, -0.92);
          c.closePath();
        });
        shape(g, '#7b4bd0', oval(0.17, -0.915, 0.13, 0.03, -0.08));
        // wrench through the sheet's hem
        g.save(); g.translate(-0.33, -0.22); g.rotate(0.25);
        shape(g, '#c8333a', (c) => c.roundRect(-0.015, 0, 0.03, 0.16, 0.01));
        shape(g, '#bfc3cd', poly([[-0.03, 0], [-0.03, -0.05], [0.04, -0.05], [0.04, -0.03], [0.0, -0.03], [0.0, -0.01], [0.04, -0.01], [0.04, 0.01]]));
        g.restore();
      },
    },
    {
      id: 'skeleton', letter: 'B', label: 'SKELETON',
      // Black bodysuit with the bones printed on. Cap stays.
      pal: { b: '#1d1b24', p: '#1d1b24', f: '#1d1b24', s: '#ebe6d8', n: '#2a2633' },
      front: (g) => {
        const bone = '#efeadb';
        line(g, [[0, -0.54], [0, -0.32]], bone, 0.018);
        for (let i = 0; i < 4; i++) {
          const y = -0.5 + i * 0.045, w = 0.15 - i * 0.012;
          g.beginPath();
          g.moveTo(-w, y + 0.02); g.quadraticCurveTo(0, y - 0.03, w, y + 0.02);
          g.strokeStyle = bone; g.lineWidth = 0.016; g.lineCap = 'round'; g.stroke();
        }
        // pelvis
        shape(g, bone, (c) => {
          c.moveTo(-0.13, -0.27); c.quadraticCurveTo(0, -0.31, 0.13, -0.27);
          c.quadraticCurveTo(0.12, -0.19, 0.04, -0.18); c.lineTo(0, -0.21); c.lineTo(-0.04, -0.18);
          c.quadraticCurveTo(-0.12, -0.19, -0.13, -0.27); c.closePath();
        }, 0);
        // legs
        for (const s of [-1, 1]) {
          line(g, [[s * 0.08, -0.17], [s * 0.1, -0.1]], bone, 0.014);
          shape(g, bone, oval(s * 0.1, -0.095, 0.017, 0.014), 0);
          line(g, [[s * 0.1, -0.09], [s * 0.11, -0.04]], bone, 0.014);
          // arms
          line(g, [[s * 0.23, -0.48], [s * 0.25, -0.4]], bone, 0.013);
          line(g, [[s * 0.25, -0.39], [s * 0.265, -0.34]], bone, 0.012);
        }
        // skull face paint: the stitched grin under the mustache
        for (let i = -3; i <= 3; i++) line(g, [[i * 0.022, -0.625], [i * 0.022, -0.6]], '#1d1b24', 0.004);
        line(g, [[-0.075, -0.612], [0.075, -0.612]], '#1d1b24', 0.004);
      },
    },
    {
      id: 'pumpkin', letter: 'C', label: 'PUMPKIN SUIT',
      // A round foam pumpkin on the middle of him; arms, legs and cap stick out.
      front: (g) => {
        pumpkin(g, 0, -0.34, 0.33, 0.25, { stem: false });
        shape(g, '#4f6b2a', poly([[-0.05, -0.57], [-0.02, -0.6], [0.02, -0.6], [0.05, -0.57], [0, -0.555]]));
      },
    },
    {
      id: 'mummy', letter: 'D', label: 'MUMMY (LOO ROLL)',
      // A plumber's mummy: wrapped in toilet roll, the roll still in his hand.
      front: (g) => {
        const roll = '#f6f4ee', shade = '#c9c4b6';
        // torso and hips
        wraps(g, (c) => c.ellipse(0, -0.36, 0.205, 0.215, 0, 0, TAU), { y0: -0.58, y1: -0.14, step: 0.045, colour: roll, shadow: shade, seed: 0.2 });
        // legs
        for (const s of [-1, 1]) {
          wraps(g, (c) => c.rect(s * 0.1 - 0.05, -0.17, 0.1, 0.13), { y0: -0.17, y1: -0.04, step: 0.035, tilt: 0.05, colour: roll, shadow: shade, seed: s > 0 ? 0.5 : 0.8 });
          wraps(g, (c) => c.rect(s * 0.235 - 0.045, -0.5, 0.09, 0.17), { y0: -0.5, y1: -0.34, step: 0.035, tilt: 0.04, colour: roll, shadow: shade, seed: s > 0 ? 0.1 : 0.6 });
        }
        // head: wrapped below the cap, with a gap for the eyes; the mustache gets out
        g.save();
        g.beginPath(); g.ellipse(0, -0.76, 0.212, 0.212, 0, 0, TAU); g.clip();
        for (const [y, t] of [[-0.88, 0.03], [-0.72, -0.04], [-0.66, 0.03], [-0.6, -0.02]]) {
          shape(g, roll, poly([[-0.3, y + t], [0.3, y - t], [0.3, y - t + 0.05], [-0.3, y + t + 0.05]]), 0.003, shade);
        }
        g.restore();
        shape(g, '#5a3212', (c) => {
          c.moveTo(0, -0.665);
          c.quadraticCurveTo(-0.08, -0.7, -0.15, -0.63);
          c.quadraticCurveTo(-0.06, -0.615, 0, -0.645);
          c.quadraticCurveTo(0.06, -0.615, 0.15, -0.63);
          c.quadraticCurveTo(0.08, -0.7, 0, -0.665);
          c.closePath();
        });
        // the roll in his left hand and the trailing sheet
        const [hx, hy] = [-LORENZO_HAND[0], LORENZO_HAND[1]];
        shape(g, roll, (c) => {
          c.moveTo(hx - 0.04, hy + 0.01);
          c.bezierCurveTo(hx - 0.09, hy + 0.12, hx - 0.02, hy + 0.2, hx - 0.07, hy + 0.3);
          c.quadraticCurveTo(hx - 0.12, hy + 0.315, hx - 0.17, hy + 0.3);
          c.lineTo(hx - 0.16, hy + 0.285);
          c.quadraticCurveTo(hx - 0.11, hy + 0.29, hx - 0.06, hy + 0.27);
          c.bezierCurveTo(hx - 0.005, hy + 0.18, hx - 0.06, hy + 0.11, hx + 0.0, hy + 0.01);
          c.closePath();
        }, 0.003, shade);
        shape(g, roll, (c) => c.roundRect(hx - 0.05, hy - 0.06, 0.1, 0.075, 0.015));
        shape(g, '#b7ad98', oval(hx, hy - 0.06, 0.05, 0.014));
        shape(g, '#8c7f68', oval(hx, hy - 0.06, 0.018, 0.007), 0);
      },
    },
    {
      id: 'werewolf', letter: 'E', label: 'WEREWOLF',
      // Fur, a black nose, ears through the cap, and the mustache was a head start.
      pal: { s: '#a8784a', n: '#2a1d16', m: '#4a2a12' },
      behind: (g) => {
        for (const s of [-1, 1]) {
          shape(g, '#7d5434', poly([[s * 0.12, -0.92], [s * 0.21, -1.08], [s * 0.22, -0.88]]));
          shape(g, '#d9a6a0', poly([[s * 0.15, -0.92], [s * 0.2, -1.02], [s * 0.205, -0.9]]), 0);
        }
      },
      front: (g) => {
        // cheek tufts
        for (const s of [-1, 1]) {
          shape(g, '#a8784a', poly([[s * 0.19, -0.84], [s * 0.26, -0.79], [s * 0.22, -0.76], [s * 0.28, -0.71], [s * 0.21, -0.69], [s * 0.25, -0.63], [s * 0.15, -0.62]]));
        }
        fangs(g, -0.635, 0.035, 0.028);
        // torn shirt edges and chest fur
        shape(g, '#8d6038', poly([[-0.07, -0.56], [0.07, -0.56], [0.04, -0.5], [0.02, -0.53], [0, -0.48], [-0.02, -0.53], [-0.04, -0.5]]));
        for (const s of [-1, 1]) {
          shape(g, '#2e8c86', poly([[s * 0.2, -0.36], [s * 0.21, -0.33], [s * 0.17, -0.335], [s * 0.18, -0.3], [s * 0.21, -0.31]]), 0);
          // claws past the gloves
          for (const k of [-1, 0, 1]) {
            const x = s * LORENZO_HAND[0] + k * 0.02;
            shape(g, '#efeadb', poly([[x - 0.006, -0.262], [x + 0.006, -0.262], [x + s * 0.004, -0.24]]), 0.002);
          }
        }
      },
    },
    {
      id: 'vampire', letter: 'F', label: 'COUNT LORENZO',
      // Cape, collar, slicked hair under no cap at all — he took it off for this.
      spec: { head: 'none' },
      pal: { b: '#221d2c', p: '#16141c', a: '#c9a23a' },
      behind: (g) => cape(g, { flare: 0.44 }),
      head: countHead,
      front: (g) => {
        countHead(g);
        shape(g, '#a51d2d', oval(0, -0.48, 0.03, 0.03));
        shape(g, '#c9a23a', poly([[-0.03, -0.5], [0.03, -0.5], [0, -0.455]]), 0.003);
      },
    },
  ],
};

// ---------------------------------------------------------------- the heroines
//
// Clara, Kiko and Fernwick (added 26 Oct 2026). Landmarks off the same
// calibration render (`--plain`):
//   Clara     head (0, -0.765) R 0.21, eyes ±0.075 at -0.78, hands (±0.19, -0.29),
//             torso -0.56..-0.27 at ±0.13, legs ±0.07 below -0.22, braid down her left
//   Kiko      head (0, -0.72) R 0.185, buns (±0.21, -0.86) r 0.07, hands (±0.205, -0.21),
//             bodice -0.53..-0.37, sash -0.37..-0.305, skirt to -0.14 at ±0.2
//   Fernwick  head (0, -0.73) R 0.21, eyes ±0.075 at -0.70, ear tips (±0.26, -0.79),
//             pigtails (±0.3, -0.6), hands (±0.168, -0.235), skirt -0.33..-0.13

// A pointed hat: brim, a cone that bends over at the tip, and a band.
function witchHat(g, x, y, { w = 0.3, h = 0.42, colour = '#2a1f3d', band = '#7b4bd0', buckle = '#e0b24a', bend = 0.12 } = {}) {
  shape(g, colour, oval(x, y, w, w * 0.2));
  const bw = w * 0.5;
  shape(g, colour, (c) => {
    c.moveTo(x - bw, y);
    c.quadraticCurveTo(x - bw * 0.4, y - h * 0.55, x + bend * 0.3, y - h * 0.9);
    c.quadraticCurveTo(x + bend, y - h, x + bend * 1.6, y - h * 0.86);
    c.quadraticCurveTo(x + bend * 0.6, y - h * 0.82, x + bw * 0.45, y - h * 0.5);
    c.quadraticCurveTo(x + bw * 0.8, y - h * 0.2, x + bw, y);
    c.quadraticCurveTo(x, y + w * 0.06, x - bw, y);
    c.closePath();
  });
  shape(g, band, (c) => {
    c.moveTo(x - bw, y); c.quadraticCurveTo(x, y + w * 0.06, x + bw, y);
    c.lineTo(x + bw * 0.93, y - h * 0.11); c.quadraticCurveTo(x, y - h * 0.07, x - bw * 0.93, y - h * 0.11);
    c.closePath();
  }, 0.003);
  shape(g, null, (c) => c.rect(x - 0.025, y - h * 0.105, 0.05, h * 0.09), 0.006, buckle);
}

// The sheet ghost every one of them does: a dome over the head, a scalloped hem.
function ghostSheet(g, { top, crown = 0.24, base = 0.35, hem = -0.09, eyes = [0.075, -0.78], eyeR = [0.045, 0.055] }) {
  shape(g, '#f4f2ec', (c) => {
    c.moveTo(-crown, top + 0.17);
    c.quadraticCurveTo(-crown + 0.02, top, 0, top);
    c.quadraticCurveTo(crown - 0.02, top, crown, top + 0.17);
    c.quadraticCurveTo(crown + 0.04, top + 0.42, base - 0.04, hem - 0.4);
    c.quadraticCurveTo(base, hem - 0.2, base, hem);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x0 = base - (2 * base) * (i / n), x1 = base - (2 * base) * ((i + 1) / n);
      c.quadraticCurveTo((x0 + x1) / 2, hem + 0.05, x1, hem);
    }
    c.quadraticCurveTo(-base, hem - 0.2, -base + 0.04, hem - 0.4);
    c.quadraticCurveTo(-crown - 0.04, top + 0.42, -crown, top + 0.17);
    c.closePath();
  });
  line(g, [[-crown * 0.55, top + 0.42], [-base * 0.55, hem - 0.03]], 'rgba(150,145,170,0.5)', 0.006);
  line(g, [[crown * 0.6, top + 0.47], [base * 0.6, hem - 0.04]], 'rgba(150,145,170,0.5)', 0.006);
  for (const s of [-1, 1]) shape(g, '#0d0b12', oval(s * eyes[0], eyes[1], eyeR[0], eyeR[1]));
}

// Skeleton print on a dark bodysuit: spine, ribs, pelvis, limb bones.
function bones(g, { chest, ribW, ribs = 4, pelvisY, pelvisW, legs, arms }) {
  const bone = '#efeadb';
  line(g, [[0, chest - 0.01], [0, pelvisY - 0.02]], bone, 0.015);
  for (let i = 0; i < ribs; i++) {
    const y = chest + 0.012 + i * 0.038, w = ribW - i * 0.012;
    g.beginPath();
    g.moveTo(-w, y + 0.018); g.quadraticCurveTo(0, y - 0.026, w, y + 0.018);
    g.strokeStyle = bone; g.lineWidth = 0.013; g.lineCap = 'round'; g.stroke();
  }
  shape(g, bone, (c) => {
    c.moveTo(-pelvisW, pelvisY); c.quadraticCurveTo(0, pelvisY - 0.035, pelvisW, pelvisY);
    c.quadraticCurveTo(pelvisW * 0.9, pelvisY + 0.07, pelvisW * 0.3, pelvisY + 0.08); c.lineTo(0, pelvisY + 0.055);
    c.lineTo(-pelvisW * 0.3, pelvisY + 0.08); c.quadraticCurveTo(-pelvisW * 0.9, pelvisY + 0.07, -pelvisW, pelvisY);
    c.closePath();
  }, 0);
  for (const s of [-1, 1]) {
    if (legs) {
      const [x, y0, y1] = legs;
      const mid = (y0 + y1) / 2;
      line(g, [[s * x, y0], [s * x, mid - 0.008]], bone, 0.012);
      shape(g, bone, oval(s * x, mid, 0.014, 0.012), 0);
      line(g, [[s * x, mid + 0.008], [s * x, y1]], bone, 0.012);
    }
    if (arms) {
      const [[x0, y0], [x1, y1]] = arms;
      line(g, [[s * x0, y0], [s * x1, y1]], bone, 0.011);
    }
  }
}

// Face paint for the skeletons: a stitched grin across the mouth.
function stitchedGrin(g, y, w = 0.075) {
  for (let i = -3; i <= 3; i++) line(g, [[i * w / 3.4, y - 0.013], [i * w / 3.4, y + 0.012]], '#1d1b24', 0.004);
  line(g, [[-w, y], [w, y]], '#1d1b24', 0.004);
}

// Ears that grow out of the head: each one stands on the skull's curve and
// leans out along it (`tilt` from vertical), its base sunk inside the hair so
// the hair's edge is what it comes out of. The pink fills almost all of it,
// leaving only a thin rim of fur, and the edge is a hairline.
function catEars(g, { cx, cy, r, tilt = 0.6, size = 0.12, fur = '#1d1b24', inner = '#d98aa0' }) {
  for (const s of [-1, 1]) {
    const a = s * tilt;
    g.save();
    g.translate(cx + Math.sin(a) * r, cy - Math.cos(a) * r);
    g.rotate(a);
    const w = size * 0.42;
    shape(g, fur, (c) => {
      c.moveTo(-w, 0.02);
      c.quadraticCurveTo(-w * 0.55, -size * 0.6, s * w * 0.12, -size);
      c.quadraticCurveTo(w * 0.7, -size * 0.55, w, 0.02);
      c.closePath();
    }, 0.0014, '#3a3446');
    shape(g, inner, (c) => {
      c.moveTo(-w * 0.72, 0.015);
      c.quadraticCurveTo(-w * 0.42, -size * 0.52, s * w * 0.1, -size * 0.84);
      c.quadraticCurveTo(w * 0.5, -size * 0.48, w * 0.72, 0.015);
      c.closePath();
    }, 0);
    g.restore();
  }
}

function whiskers(g, x, y, colour = '#1d1b24') {
  for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
    line(g, [[x + s * 0.05, y + k * 0.013], [x + s * 0.175, y + k * 0.034]], colour, 0.0055);
  }
}

// Gary's name tag, for anyone dressing up as Gary.
function nameTag(g, x, y, text = 'GARY') {
  shape(g, '#fff', (c) => c.roundRect(x - 0.05, y - 0.03, 0.1, 0.06, 0.008), 0.003);
  label(g, text, x, y, 0.032, '#c85028');
}

// Wings behind the figure, from the shoulder blades out.
function batWings(g, y, colour = '#2a2238') {
  for (const s of [-1, 1]) {
    shape(g, colour, poly([
      [s * 0.08, y], [s * 0.3, y - 0.17], [s * 0.48, y - 0.1], [s * 0.5, y + 0.06],
      [s * 0.42, y + 0.02], [s * 0.36, y + 0.1], [s * 0.28, y + 0.05], [s * 0.2, y + 0.13], [s * 0.1, y + 0.1],
    ]));
    line(g, [[s * 0.1, y + 0.02], [s * 0.3, y - 0.17]], 'rgba(255,255,255,0.12)', 0.004);
    line(g, [[s * 0.12, y + 0.04], [s * 0.42, y + 0.02]], 'rgba(255,255,255,0.12)', 0.004);
  }
}

function fairyWings(g, y) {
  for (const s of [-1, 1]) {
    shape(g, 'rgba(190,236,255,0.55)', oval(s * 0.24, y - 0.09, 0.17, 0.1, s * -0.5), 0.004, 'rgba(120,190,230,0.9)');
    shape(g, 'rgba(255,200,240,0.5)', oval(s * 0.2, y + 0.07, 0.11, 0.07, s * 0.5), 0.004, 'rgba(220,140,200,0.9)');
  }
}

// Slim and curved, drawn BEHIND the head so the root is lost in the hair and
// only the horn comes out of it.
function devilHorns(g, x, y, spread) {
  for (const s of [-1, 1]) {
    shape(g, '#c42a2a', (c) => {
      c.moveTo(x + s * (spread - 0.022), y);
      c.quadraticCurveTo(x + s * (spread - 0.005), y - 0.08, x + s * (spread + 0.04), y - 0.13);
      c.quadraticCurveTo(x + s * (spread + 0.025), y - 0.06, x + s * (spread + 0.022), y + 0.005);
      c.closePath();
    }, 0.004);
  }
}

function devilTail(g, x0, y0) {
  g.beginPath();
  g.moveTo(x0, y0);
  g.bezierCurveTo(x0 + 0.18, y0 + 0.08, x0 + 0.3, y0 - 0.02, x0 + 0.26, y0 - 0.16);
  g.strokeStyle = INK; g.lineWidth = 0.022; g.lineCap = 'round'; g.stroke();
  g.strokeStyle = '#c42a2a'; g.lineWidth = 0.013; g.stroke();
  shape(g, '#c42a2a', poly([[x0 + 0.26, y0 - 0.2], [x0 + 0.3, y0 - 0.14], [x0 + 0.26, y0 - 0.15], [x0 + 0.22, y0 - 0.13]]));
}

// A long held prop (broom, trident, wand): a shaft through the hand.
function shaft(g, [hx, hy], { up = 0.3, down = 0.25, lean = 0.06, colour = '#7a4f2c' }) {
  line(g, [[hx - lean * (down / (up + down)), hy + down], [hx + lean * (up / (up + down)), hy - up]], INK, 0.022);
  line(g, [[hx - lean * (down / (up + down)), hy + down], [hx + lean * (up / (up + down)), hy - up]], colour, 0.013);
}

function star(g, x, y, r, fill = '#ffd84a') {
  shape(g, fill, (c) => {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }, 0.004);
}

const CLARA_HAND = [0.19, -0.29];
const KIKO_HAND = [0.205, -0.21];
const FERN_HAND = [0.168, -0.235];

Object.assign(COSTUMES, {
  b33p: [
    {
      id: 'sheet', letter: 'A', label: 'GHOST (SHEET)',
      // For the walk's line-up: the one ghost, and it has to read as B-33P.
      clip: (g) => g.rect(-1, B33P_HIDE_ABOVE, 2, 1),
      head: (g, t) => b33pGhost(g, t),
      front: (g) => b33pGhost(g, 0.35),
    },
  ],
  clara: [
    {
      id: 'pharaoh', letter: 'A', label: 'THE PHARAOH',
      // The raider dressed as the tomb's owner: striped nemes, broad gold collar,
      // white linen. The braid gets out the back anyway.
      pal: { b: '#efe8d4', p: '#efe8d4' },
      front: (g) => {
        const gold = '#e0b24a', blue = '#2c4f9e';
        // the headcloth, stripes clipped to it
        const cloth = (c) => {
          c.moveTo(-0.2, -0.86);
          c.quadraticCurveTo(-0.22, -1.01, 0, -1.02);
          c.quadraticCurveTo(0.22, -1.01, 0.2, -0.86);
          c.lineTo(0.27, -0.6); c.lineTo(0.2, -0.5); c.lineTo(0.15, -0.62); c.lineTo(0.17, -0.82);
          c.quadraticCurveTo(0, -0.875, -0.17, -0.82);
          c.lineTo(-0.15, -0.62); c.lineTo(-0.2, -0.5); c.lineTo(-0.27, -0.6);
          c.closePath();
        };
        shape(g, gold, cloth);
        g.save(); g.beginPath(); cloth(g); g.clip();
        for (let y = -1.04; y < -0.48; y += 0.04) shape(g, blue, (c) => c.rect(-0.4, y, 0.8, 0.018), 0);
        g.restore();
        shape(g, null, cloth);
        shape(g, gold, (c) => c.rect(-0.18, -0.865, 0.36, 0.025), 0.003);
        // the cobra on the brow
        shape(g, gold, (c) => { c.moveTo(0, -0.89); c.quadraticCurveTo(0.03, -0.93, 0, -0.96); c.quadraticCurveTo(-0.03, -0.93, 0, -0.89); c.closePath(); }, 0.003);
        // broad collar
        for (const [r, col] of [[0.16, gold], [0.13, blue], [0.1, gold], [0.07, '#c0392b']]) {
          shape(g, col, (c) => { c.ellipse(0, -0.56, r, r * 0.6, 0, 0, Math.PI); c.closePath(); }, 0.003);
        }
        for (const s of [-1, 1]) shape(g, gold, (c) => c.roundRect(s * 0.19 - 0.035, -0.4, 0.07, 0.035, 0.008), 0.003);
      },
    },
    {
      id: 'mummy', letter: 'B', label: 'MUMMY',
      // She has dug up enough of them to know how it is done.
      front: (g) => {
        const linen = '#ece4cc', shade = '#b9ae92';
        wraps(g, (c) => c.ellipse(0, -0.4, 0.15, 0.17, 0, 0, TAU), { y0: -0.58, y1: -0.22, step: 0.04, colour: linen, shadow: shade, seed: 0.3 });
        for (const s of [-1, 1]) {
          wraps(g, (c) => c.rect(s * 0.075 - 0.05, -0.22, 0.1, 0.2), { y0: -0.22, y1: -0.02, step: 0.034, tilt: 0.05, colour: linen, shadow: shade, seed: s > 0 ? 0.5 : 0.8 });
          // the arm runs shoulder to wrist on a slant, so the clip does too
          wraps(g, poly([[s * 0.125, -0.53], [s * 0.175, -0.53], [s * 0.215, -0.33], [s * 0.165, -0.33]]), { y0: -0.54, y1: -0.33, step: 0.034, tilt: 0.04, colour: linen, shadow: shade, seed: s > 0 ? 0.1 : 0.6 });
        }
        g.save();
        g.beginPath(); g.ellipse(0, -0.765, 0.215, 0.215, 0, 0, TAU); g.clip();
        for (const [y, t] of [[-0.98, 0.02], [-0.93, -0.03], [-0.88, 0.03], [-0.72, -0.04], [-0.66, 0.03], [-0.6, -0.02]]) {
          shape(g, linen, poly([[-0.3, y + t], [0.3, y - t], [0.3, y - t + 0.05], [-0.3, y + t + 0.05]]), 0.003, shade);
        }
        g.restore();
        // one loose end
        shape(g, linen, poly([[0.13, -0.27], [0.17, -0.27], [0.2, -0.12], [0.17, -0.1]]), 0.003, shade);
      },
    },
    {
      id: 'witch', letter: 'C', label: 'WITCH',
      pal: { b: '#2a1f3d', p: '#3b2457', w: '#2a1f3d' },
      front: (g) => {
        witchHat(g, 0.01, -0.9, { w: 0.3, h: 0.44 });
        shaft(g, [-CLARA_HAND[0], CLARA_HAND[1]], { up: 0.32, down: 0.24, lean: -0.05 });
        // the broom's bristles at the foot of the handle
        const bx = -CLARA_HAND[0] + 0.02, by = CLARA_HAND[1] + 0.24;
        shape(g, '#c99a4a', poly([[bx - 0.02, by - 0.05], [bx + 0.02, by - 0.05], [bx + 0.08, by + 0.06], [bx - 0.07, by + 0.06]]));
        shape(g, '#7b4bd0', (c) => c.rect(bx - 0.025, by - 0.055, 0.05, 0.02), 0.003);
      },
    },
    {
      id: 'cat', letter: 'D', label: 'BLACK CAT',
      // Ears on a headband, whiskers drawn on, a tail pinned to the belt, and
      // black from top to boots.
      pal: { b: '#1d1b24', p: '#1d1b24', w: '#2c2834', f: '#1d1b24' },
      behind: (g) => {
        g.beginPath();
        g.moveTo(0.08, -0.25);
        g.bezierCurveTo(0.3, -0.2, 0.36, -0.36, 0.28, -0.5);
        g.strokeStyle = INK; g.lineWidth = 0.03; g.lineCap = 'round'; g.stroke();
        g.strokeStyle = '#1d1b24'; g.lineWidth = 0.022; g.stroke();
        catEarPair(g);
      },
      headBehind: catEarPair,
      head: catFace,
      front: catFace,
    },
    {
      id: 'sheet', letter: 'E', label: 'GHOST (SHEET)',
      // The braid has to go somewhere, and it goes out through the side.
      front: (g) => {
        ghostSheet(g, { top: -1.02, crown: 0.24, base: 0.3, eyes: [0.075, -0.79] });
        // braid out of a slit on her left
        for (let i = 0; i < 4; i++) shape(g, '#8f4a22', oval(-0.235 - i * 0.008, -0.58 + i * 0.05, 0.028, 0.03));
        shape(g, '#e0b24a', (c) => c.rect(-0.27, -0.395, 0.04, 0.016), 0.003);
        shape(g, '#8f4a22', poly([[-0.265, -0.38], [-0.235, -0.38], [-0.25, -0.33]]));
      },
    },
    {
      id: 'gary', letter: 'F', label: 'GARY',
      // She came as Gary: green face paint, the orange shirt, a paper hat, a
      // name tag. Nobody in the arcade has dared tell him.
      pal: { s: '#9ec89e', b: '#c85028', p: '#3a3a48', f: '#3a3a48', e: '#d83030' },
      front: (g) => {
        paperHat(g, 0, -0.93, 0.38);
        nameTag(g, 0.065, -0.47);
      },
    },
  ],

  kiko: [
    {
      id: 'jiangshi', letter: 'A', label: 'HOPPING VAMPIRE',
      // The jiangshi: Qing official's robe and cap, and the paper talisman
      // pinned over the face that is meant to keep it still.
      pal: { b: '#2b2f4a', sash: '#a8323e', a: '#e0b24a', s: '#d6dcc6', hand: '#d6dcc6', ribbon: '#2b2f4a' },
      front: (g) => {
        // cap: dark dome with a turned-up brim and a red finial
        shape(g, '#1c1c28', (c) => { c.moveTo(-0.15, -0.87); c.quadraticCurveTo(-0.15, -1.0, 0, -1.0); c.quadraticCurveTo(0.15, -1.0, 0.15, -0.87); c.closePath(); });
        shape(g, '#3a2c22', (c) => c.roundRect(-0.17, -0.885, 0.34, 0.04, 0.015));
        shape(g, '#c0392b', oval(0, -1.015, 0.02, 0.02));
        // talisman
        g.save(); g.translate(0.005, -0.78); g.rotate(0.04);
        shape(g, '#f2d34a', (c) => c.rect(-0.03, -0.09, 0.06, 0.2), 0.003);
        line(g, [[0, -0.07], [0, 0.08]], '#c0392b', 0.006);
        for (const y of [-0.05, -0.01, 0.03]) line(g, [[-0.015, y], [0.015, y + 0.01]], '#c0392b', 0.004);
        g.restore();
        // robe trim: a square badge on the chest
        shape(g, '#e0b24a', (c) => c.rect(-0.05, -0.5, 0.1, 0.09), 0.003);
        shape(g, '#a8323e', oval(0, -0.455, 0.022, 0.022), 0);
      },
    },
    {
      id: 'sheet', letter: 'B', label: 'GHOST (SHEET)',
      // Two buns under one sheet: it comes out with ears.
      front: (g) => {
        for (const s of [-1, 1]) shape(g, '#f4f2ec', oval(s * 0.2, -0.88, 0.085, 0.085));
        ghostSheet(g, { top: -0.96, crown: 0.22, base: 0.3, eyes: [0.07, -0.73], eyeR: [0.04, 0.05] });
      },
    },
    {
      id: 'pumpkin', letter: 'C', label: 'PUMPKIN',
      // Orange qipao, green sash, the buns done up as two little pumpkins and a
      // jack-o'-lantern face across the skirt.
      pal: { b: '#e2741f', sash: '#4f6b2a', a: '#4f6b2a', ribbon: '#e2741f', f: '#4f6b2a' },
      front: (g) => {
        for (const s of [-1, 1]) {
          shape(g, '#4f6b2a', poly([[s * 0.21 - 0.01, -0.93], [s * 0.21 - 0.004, -0.965], [s * 0.21 + 0.022, -0.975], [s * 0.21 + 0.012, -0.928]]));
        }
        const lit = '#ffd84a';
        shape(g, lit, poly([[-0.1, -0.24], [-0.065, -0.28], [-0.03, -0.24]]), 0.004);
        shape(g, lit, poly([[0.03, -0.24], [0.065, -0.28], [0.1, -0.24]]), 0.004);
        shape(g, lit, poly([[-0.12, -0.2], [-0.06, -0.185], [-0.03, -0.2], [0, -0.18], [0.03, -0.2], [0.06, -0.185], [0.12, -0.2], [0.06, -0.16], [0, -0.165], [-0.06, -0.16]]), 0.004);
      },
    },
    {
      id: 'skeleton', letter: 'D', label: 'SKELETON',
      pal: { b: '#1d1b24', p: '#1d1b24', f: '#1d1b24', sash: '#1d1b24', a: '#efeadb', ribbon: '#efeadb', s: '#ebe6d8', hand: '#ebe6d8' },
      front: (g) => {
        bones(g, { chest: -0.52, ribW: 0.1, ribs: 4, pelvisY: -0.3, pelvisW: 0.11, legs: [0.07, -0.13, -0.04], arms: [[0.19, -0.42], [0.2, -0.28]] });
        stitchedGrin(g, -0.625, 0.06);
      },
    },
    {
      id: 'witch', letter: 'E', label: 'WITCH',
      pal: { b: '#e2741f', sash: '#16141c', a: '#16141c' },   // KIKO_LOOKS.orange
      // Her own buns under the hat — wraps, cut ends and long tails, all white,
      // because they are what make her read as Kiko (Peter, after trying bare).
      headBehind: kikoHatBehind,
      behind: kikoHatBehind,
      head: kikoHat,
      front: kikoHat,
    },
    {
      id: 'cop', letter: 'F', label: 'A REAL COP',
      // Her costume is a police officer with actual jurisdiction. It is the
      // scariest thing she can think of.
      pal: { b: '#24345a', sash: '#16161e', a: '#e0b24a', ribbon: '#24345a', f: '#16161e' },
      front: (g) => {
        // peaked cap between the buns
        shape(g, '#24345a', (c) => { c.moveTo(-0.16, -0.86); c.quadraticCurveTo(-0.19, -0.99, 0.02, -1.0); c.quadraticCurveTo(0.2, -0.99, 0.16, -0.86); c.closePath(); });
        shape(g, '#16161e', (c) => c.rect(-0.16, -0.885, 0.32, 0.03), 0.003);
        shape(g, '#0d0d14', (c) => { c.moveTo(-0.15, -0.86); c.quadraticCurveTo(0, -0.8, 0.15, -0.86); c.quadraticCurveTo(0, -0.84, -0.15, -0.86); c.closePath(); });
        star(g, 0, -0.935, 0.03, '#e0b24a');
        // badge
        star(g, -0.07, -0.47, 0.03, '#e0b24a');
      },
    },
  ],

  fernwick: [
    {
      id: 'witch', letter: 'A', label: 'THE WICKED ONE',
      // Green skin, black hat, purple dress — the circlet stays on under the hat.
      pal: { s: '#8fc46a', b: '#3b2457', bodice: '#3b2457', skirt: '#2a1f3d', h: '#3b2457', p: '#1d1b24' },
      front: (g) => {
        witchHat(g, 0, -0.86, { w: 0.32, h: 0.46, band: '#65b83f' });
        shaft(g, [FERN_HAND[0], FERN_HAND[1]], { up: 0.34, down: 0.2, lean: 0.06 });
        const bx = FERN_HAND[0] - 0.015, by = FERN_HAND[1] + 0.2;
        shape(g, '#c99a4a', poly([[bx - 0.02, by - 0.05], [bx + 0.02, by - 0.05], [bx + 0.07, by + 0.07], [bx - 0.08, by + 0.07]]));
      },
    },
    {
      id: 'sheet', letter: 'B', label: 'GHOST (SHEET)',
      // The ears come out through two holes cut for them.
      front: (g) => {
        ghostSheet(g, { top: -0.98, crown: 0.23, base: 0.3, eyes: [0.075, -0.71] });
        for (const s of [-1, 1]) {
          shape(g, '#f7dcbe', poly([[s * 0.2, -0.79], [s * 0.3, -0.85], [s * 0.21, -0.74]]));
        }
      },
    },
    {
      id: 'vampire', letter: 'C', label: 'THE COUNTESS',
      // She already had the ears.
      pal: { b: '#221d2c', bodice: '#221d2c', skirt: '#1a1622', h: '#221d2c', p: '#16141c', s: '#efe0d8' },
      behind: (g) => cape(g, { flare: 0.36 }),
      front: (g) => {
        fangs(g, -0.6, 0.022, 0.026);
        shape(g, '#a51d2d', oval(0, -0.48, 0.025, 0.025));
      },
    },
    {
      id: 'scarecrow', letter: 'D', label: 'SCARECROW',
      // Straw hat, patched dress, straw at the cuffs and the collar, painted cheeks.
      pal: { b: '#8a6a3a', bodice: '#8a6a3a', skirt: '#6d7a3a', h: '#8a6a3a' },
      front: (g) => {
        const straw = '#e8c25a';
        // straw tufts at the wrists and the neck
        for (const s of [-1, 1]) {
          for (const k of [-1, 0, 1]) line(g, [[s * FERN_HAND[0], FERN_HAND[1] - 0.04], [s * (FERN_HAND[0] + 0.02 + k * 0.012), FERN_HAND[1] - 0.075]], straw, 0.006);
          shape(g, 'rgba(230,110,110,0.55)', oval(s * 0.12, -0.63, 0.03, 0.03), 0);
        }
        for (const k of [-2, -1, 0, 1, 2]) line(g, [[k * 0.02, -0.53], [k * 0.032, -0.49]], straw, 0.006);
        // patches
        shape(g, '#c84a3a', (c) => c.rect(0.03, -0.45, 0.05, 0.045), 0.003);
        shape(g, '#3a6ea8', (c) => c.rect(-0.1, -0.24, 0.055, 0.05), 0.003);
        line(g, [[0.03, -0.45], [0.08, -0.405]], INK, 0.003);
        // straw hat
        shape(g, '#c9a04a', oval(0, -0.89, 0.3, 0.055));
        shape(g, '#c9a04a', (c) => { c.moveTo(-0.15, -0.89); c.quadraticCurveTo(-0.15, -1.04, 0, -1.04); c.quadraticCurveTo(0.15, -1.04, 0.15, -0.89); c.closePath(); });
        shape(g, '#8a3a2a', (c) => c.rect(-0.148, -0.935, 0.296, 0.03), 0.003);
        for (const k of [-1, 1]) line(g, [[k * 0.26, -0.88], [k * 0.31, -0.86]], straw, 0.006);
      },
    },
    {
      id: 'devil', letter: 'E', label: 'LITTLE DEVIL',
      pal: { b: '#b8262e', bodice: '#b8262e', skirt: '#8e1c24', h: '#b8262e', p: '#5a161c' },   // tights a shade under the skirt
      behind: (g) => { devilTail(g, 0.06, -0.3); fernHorns(g); },
      headBehind: fernHorns,
      front: (g) => {
        shaft(g, [FERN_HAND[0], FERN_HAND[1]], { up: 0.36, down: 0.2, lean: 0.05, colour: '#3a3a48' });
        const tx = FERN_HAND[0] + 0.05 * (0.36 / 0.56), ty = FERN_HAND[1] - 0.36;
        shape(g, '#3a3a48', (c) => {
          c.moveTo(tx - 0.06, ty - 0.06); c.lineTo(tx - 0.05, ty + 0.01); c.lineTo(tx + 0.05, ty + 0.01); c.lineTo(tx + 0.06, ty - 0.06);
          c.lineTo(tx + 0.04, ty - 0.02); c.lineTo(tx + 0.012, ty - 0.02); c.lineTo(tx, ty - 0.09); c.lineTo(tx - 0.012, ty - 0.02);
          c.lineTo(tx - 0.04, ty - 0.02); c.closePath();
        });
      },
    },
    {
      id: 'fairy', letter: 'F', label: 'FAIRY',
      pal: { b: '#e98ac4', bodice: '#e98ac4', skirt: '#f2b6dc', h: '#e98ac4' },
      behind: (g) => fairyWings(g, -0.45),
      front: (g) => {
        shaft(g, [FERN_HAND[0], FERN_HAND[1]], { up: 0.2, down: 0.02, lean: 0.03, colour: '#f4f1e6' });
        star(g, FERN_HAND[0] + 0.03, FERN_HAND[1] - 0.22, 0.045);
        glow(g, FERN_HAND[0] + 0.03, FERN_HAND[1] - 0.22, 0.12, '255,230,120', 0.35);
        for (const [x, y, r] of [[0.3, -0.62, 0.012], [0.24, -0.72, 0.008], [0.34, -0.5, 0.009]]) star(g, x, y, r, '#fff6c2');
      },
    },
  ],
});

// Heroes whose idle blinks at the shared clock get their own moment instead.
const POSE_TIME = { clara: 0.6 };

// ---------------------------------------------------------------- frames

let shiftX = 0;   // per-costume nudge, in figure units, to centre a wide group
function frame(ctx, fn) {
  ctx.save();
  ctx.translate(F.cx + shiftX * F.u, F.feet);
  ctx.scale(F.u, F.u);
  fn(ctx);
  ctx.restore();
}

function drawCalib(ctx) {
  frame(ctx, (g) => {
    g.strokeStyle = '#0f0';
    g.lineWidth = 0.004;
    for (let y = 0; y <= 1.2; y += 0.1) {
      g.beginPath(); g.moveTo(-0.5, -y); g.lineTo(0.5, -y); g.stroke();
    }
    g.strokeStyle = '#f0f';
    g.beginPath(); g.arc(0, -0.76, 0.21, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -1.2); g.stroke();
  });
}

export function paintCostume(ctx, w, h, { hero, id, calib }) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  paintFigure(ctx, hero, (COSTUMES[hero] || []).find((v) => v.id === id) || {});
  if (calib) drawCalib(ctx);
}

// One costumed figure at F. Layers get (g, ctx, marks): marks are where this
// pose put the head, hip and hands, in figure units, hands sorted left to right.
function paintFigure(ctx, hero, c) {
  setInk({ body: 0.38, face: F.faceInk ?? 0.42, alpha: 5, brow: 1, browA: 1, browL: 0.15 });
  const spec = { ...TOON_SPECS[hero], ...(c.spec || {}) };
  const pal = { ...HERO_SPRITES[hero].pal, ...(c.pal || {}) };
  const pose = { kind: 'idle', time: POSE_TIME[hero] ?? 1.4, facing: 1, grounded: true, menu: true, ...(c.pose || {}) };
  const marks = figureMarks(hero, pose, spec, pal);
  shiftX = c.shift || 0;
  if (c.behind) frame(ctx, (g) => c.behind(g, ctx, marks));
  ctx.save();
  if (c.clip) {
    frame(ctx, (g) => { g.beginPath(); c.clip(g); });
    ctx.clip();
  }
  drawToon(ctx, hero, pose, F.cx + shiftX * F.u, F.feet, F.u, { spec, pal, light: c.light !== false });
  ctx.restore();
  if (c.front) frame(ctx, (g) => c.front(g, ctx, marks));
  shiftX = 0;
}

function figureMarks(hero, pose, spec, pal) {
  const c = document.createElement('canvas').getContext('2d');
  const sink = {};
  captureToonLandmarks(sink);
  try { drawToon(c, hero, { ...pose }, 0, 0, 100, { spec, pal }); } finally { captureToonLandmarks(null); }
  const f = (m) => m && { x: m.x / 100, y: m.y / 100 };
  return { head: f(sink.head?.[0]), hip: f(sink.hip?.[0]), hands: (sink.hand || []).map(f).sort((a, b) => a.x - b.x) };
}

export function paintSheet(ctx, w, h, { hero, cols }) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  COSTUMES[hero].forEach((c, i) => {
    const x = (i % cols) * 400, y = Math.floor(i / cols) * 500;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath(); ctx.rect(0, 0, 400, 500); ctx.clip();
    paintCostume(ctx, 400, 500, { hero, id: c.id });
    ctx.restore();
    ctx.fillStyle = '#f0e5c9';
    ctx.font = "26px 'Lilita One'";
    ctx.textBaseline = 'top';
    ctx.fillText(`${c.letter}  ${c.label}`, x + 18, y + 16);
  });
}

// ---------------------------------------------------------------- trick or treat
//
// Five of the costumes walking right through the Crypt Shift night with their
// pumpkin pails (26 Oct 2026). The figures walk on the shipped painter's own
// walk; everything a costume adds is hung on where the painter actually put
// the head, hip and hands that frame (captureToonLandmarks), so nothing slides
// off a moving body. Head pieces are the very functions the stills use, moved
// from the standing head to the walking one.

// Leader first: the line walks right, so the first entry is the rightmost.
export const PARADE = [
  { hero: 'gary', id: 'monster', pail: 'front' },
  { hero: 'lorenzo', id: 'vampire', pail: 'front', cape: true, noSmile: true },
  { hero: 'fernwick', id: 'devil', pail: 'back', tail: 'devil', fork: true },
  { hero: 'kiko', id: 'witch', pail: 'front' },
  { hero: 'clara', id: 'cat', pail: 'front', tail: 'cat' },
  { hero: 'b33p', id: 'sheet', noSmile: true },          // the ghost brings up the rear
];

// How far the camera has moved by `t` when it holds still until the line has
// walked in, then eases up to walking pace over `ramp` seconds ending at
// `settle` (a smoothstep on its speed, integrated: r(x^3 - x^4/2)).
function camTravel(t, speed, settle, ramp) {
  const a = settle - ramp;
  if (t <= a) return 0;
  const x = (Math.min(t, settle) - a) / ramp;
  return speed * ramp * (x ** 3 - x ** 4 / 2) + (t > settle ? speed * (t - settle) : 0);
}

const WALK_H = 24;            // HERO_DRAW_H: the size a run draws a hero at
const WALK_GROUND = 232;      // GROUND_Y
const STAGE_W = 480, STAGE_H = 270;

let scratch = null;
function landmarksOf(ctx, draw) {
  if (!scratch) scratch = document.createElement('canvas').getContext('2d');
  scratch.canvas.width = scratch.canvas.height = 1;
  scratch.setTransform(ctx.getTransform());
  const sink = {};
  captureToonLandmarks(sink);
  try { draw(scratch); } finally { captureToonLandmarks(null); }
  return sink;
}

// Where the standing pose puts the head, in figure units: the frame the head
// pieces were drawn in, so the walk can carry them from there to the moving head.
const restHead = new Map();
function restHeadOf(hero, spec, pal) {
  if (!restHead.has(hero)) {
    const c = document.createElement('canvas').getContext('2d');
    const sink = {};
    captureToonLandmarks(sink);
    try {
      drawToon(c, hero, { kind: 'idle', time: POSE_TIME[hero] ?? 1.4, facing: 1, grounded: true, menu: true }, 0, 0, 100, { spec, pal });
    } finally { captureToonLandmarks(null); }
    restHead.set(hero, { x: sink.head[0].x / 100, y: sink.head[0].y / 100 });
  }
  return restHead.get(hero);
}

// Run `fn` in figure units about a landmark: origin on the mark, its rotation,
// one unit = the figure's height.
function at(ctx, m, h, fn, { offset = null, rotate = true } = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(m.x, m.y);
  if (rotate) ctx.rotate(m.a);
  ctx.scale(m.sx * h, m.sy * h);
  if (offset) ctx.translate(-offset.x, -offset.y);
  fn(ctx);
  ctx.restore();
}

// A jack-o'-lantern pail hanging straight down from the hand, sweets at the rim.
function pail(g) {
  line(g, [[-0.05, 0.075], [-0.045, 0.02], [0, -0.004], [0.045, 0.02], [0.05, 0.075]], INK, 0.011);
  line(g, [[-0.05, 0.075], [-0.045, 0.02], [0, -0.004], [0.045, 0.02], [0.05, 0.075]], '#3a3a48', 0.006);
  for (const [x, col] of [[-0.03, '#e3657c'], [0, '#7bc043'], [0.028, '#ffd84a']]) shape(g, col, oval(x, 0.07, 0.016, 0.014), 0.003);
  pumpkin(g, 0, 0.115, 0.062, 0.05, { stem: false });
}

function catTail(g, t) {
  const wag = Math.sin(t * 5.2) * 0.035;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(-0.17, 0.03, -0.3, -0.05, -0.28 + wag, -0.2);
  g.strokeStyle = INK; g.lineWidth = 0.03; g.lineCap = 'round'; g.stroke();
  g.strokeStyle = '#1d1b24'; g.lineWidth = 0.022; g.stroke();
}

// Carried upright in the front hand, long enough that the prongs clear her
// head, and tipped back so the shaft does not cross her face.
function pitchfork(g) {
  shaft(g, [0, 0], { up: 0.62, down: 0.16, lean: -0.08, colour: '#3a3a48' });
  const tx = -0.08 * (0.62 / 0.78), ty = -0.62;
  shape(g, '#3a3a48', (c) => {
    c.moveTo(tx - 0.06, ty - 0.06); c.lineTo(tx - 0.05, ty + 0.01); c.lineTo(tx + 0.05, ty + 0.01); c.lineTo(tx + 0.06, ty - 0.06);
    c.lineTo(tx + 0.04, ty - 0.02); c.lineTo(tx + 0.012, ty - 0.02); c.lineTo(tx, ty - 0.09); c.lineTo(tx - 0.012, ty - 0.02);
    c.lineTo(tx - 0.04, ty - 0.02); c.closePath();
  });
}

// The cape seen from the side: hung off the shoulders, streaming back, the hem
// lifting and settling with the step.
// It streams well clear of his back with the red lining turned out along its
// trailing edge: black on a night sky needs the red to be seen at all.
function profileCape(g, t) {
  const f = Math.sin(t * 6.3) * 0.03, f2 = Math.sin(t * 6.3 + 1.2) * 0.025;
  const back = (c) => {
    c.moveTo(0.04, -0.575);
    c.quadraticCurveTo(-0.26, -0.52 + f2, -0.5 + f, -0.13);
  };
  shape(g, '#9a1c2c', (c) => {
    back(c);
    c.quadraticCurveTo(-0.44 + f, -0.1 + f2, -0.38 + f, -0.11);
    c.quadraticCurveTo(-0.3, -0.36, 0.0, -0.55);
    c.closePath();
  });
  shape(g, '#17141f', (c) => {
    c.moveTo(0.04, -0.575);
    c.quadraticCurveTo(-0.22, -0.46 + f2, -0.38 + f, -0.11);
    c.quadraticCurveTo(-0.3 + f, -0.06 + f2, -0.22 + f, -0.08);
    c.quadraticCurveTo(-0.14, -0.04, -0.07, -0.07);
    c.quadraticCurveTo(-0.01, -0.04, 0.05, -0.06);
    c.lineTo(0.06, -0.3);
    c.closePath();
  });
}

const stage = { canvas: null };
// `enterAt` (seconds): the line starts off the left edge and walks in from
// then, the camera holding still until the leader reaches its place and then
// picking up their pace. Without it they are already walking, framed.
export function paintWalkFrame(ctx, w, h, { t, crop, smile = false, speedCycles = 1.15, spacing = 0.164, lead = 0.91, camStart = 900, enterAt = null, ramp = 1.6, only = null, boost = 0.6, bgDrop = 0 }) {
  const m = ctx.getTransform();
  const k = m.a;                       // device pixels per stage unit
  const [cx, cy, cw, ch] = crop;
  // The pack paints the whole stage, as a run does — its bakes measure the
  // canvas they are on — and the frame is cut out of it after.
  if (!stage.canvas) stage.canvas = document.createElement('canvas');
  const sc = stage.canvas;
  const sw = Math.round(STAGE_W * k), sh = Math.round(STAGE_H * k);
  if (sc.width !== sw || sc.height !== sh) { sc.width = sw; sc.height = sh; }
  const g = sc.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.clearRect(0, 0, STAGE_W, STAGE_H);

  // One ground speed for the whole line, set by Gary's walk; everyone else's
  // cadence comes off their own step so no foot skates.
  const stepOf = (hero) => toonWalkStep(hero) * WALK_H;
  const speed = 2 * stepOf('gary') * speedCycles;     // stage units a second
  // The walk in: every walker covers `speed` from enterAt; the camera lags by
  // `arrive` once it has caught up, which is exactly the distance from just
  // off the left edge to the leader's place.
  const margin = 16;
  // They walk IN at (1 + boost) times their pace, easing back to it over the
  // same `ramp` the camera eases up over, so the gap closes in step: walkers
  // at speed(1+B)(1-e) faster than the camera, e the camera's smoothstep.
  // Their feet stay planted because the stride phase rides `walked`.
  const arrive = enterAt == null ? 0 : lead * cw + margin;
  const settle = enterAt == null ? 0 : enterAt + arrive / (speed * (1 + boost)) + ramp / 2;
  const camMoved = enterAt == null ? speed * t : camTravel(t, speed, settle, ramp);
  const walked = enterAt == null ? speed * t
    : speed * (1 + boost) * Math.max(0, t - enterAt) - boost * camMoved;
  const camX = camStart + camMoved;
  const cab = CABINET_BY_ID.crypt;
  const pack = getStylePack(cab.style, {});
  const total = 3000;
  const bc = { stageIndex: 1, progress: (camX % total) / total };
  // `bgDrop` lowers the distance and leaves the near ground where it stands,
  // the way the game's own vertical parallax does (cameraShiftY): every layer
  // moves by (1 - depth) of the shift, so with the whole pass then lifted by
  // the near bank's share (0.65), the lamps and graves stay put, the ghosts'
  // hill drops a little, and the church and sky drop most. One pass, so every
  // layer is drawn once and drawn whole. `bgDrop` is the church's drop.
  const FAR = 0.15, NEAR = 0.35;
  const shift = -bgDrop / (NEAR - FAR);
  g.save();
  g.translate(0, (1 - NEAR) * shift);
  // The witch flies on the cloud bands, drawn on the CELESTIAL layer (depth 0),
  // so the shift moves her further than the church: (1 - NEAR) * -shift less
  // than the full -shift. Her bands are handed in raised by the difference, so
  // she drops exactly as far as the church does.
  const witchExtra = -shift * NEAR - bgDrop;
  const band = (y) => ({ center: y - witchExtra });
  const bcs = {
    ...bc, cameraShiftY: shift,
    sceneryLayout: { bands: { upperCloud: band(34), lowerCloud: band(104), middleCloud: band(84) } },
  };
  pack.bg(g, 4 + t, camX, cab, total, bcs, 0, bcs);
  g.restore();
  if (pack.ground) pack.ground(g, camX, cab, []);

  setInk();
  (only ? PARADE.filter((p) => p.hero === only) : PARADE).forEach((p, i) => {
    const c = COSTUMES[p.hero].find((v) => v.id === p.id);
    const spec = { ...TOON_SPECS[p.hero], ...(c.spec || {}) };
    const pal = { ...HERO_SPRITES[p.hero].pal, ...(c.pal || {}) };
    const x = cx + cw * (lead - i * spacing) - arrive + walked - camMoved;
    if (x < cx - margin || x > cx + cw + margin) return;   // off the frame
    const phase = ((walked / (2 * stepOf(p.hero))) + i * 0.37) % 1;
    const pose = { kind: 'run', walk: true, menu: true, grounded: true, facing: 1, time: t + i * 1.7, phase, faceJoy: smile && !p.noSmile };
    const draw = (cc) => drawToon(cc, p.hero, { ...pose }, x, WALK_GROUND, WALK_H, { spec, pal });
    const L = landmarksOf(g, draw);
    const head = L.head && L.head[0], hip = L.hip && L.hip[0];
    const hands = L.hand || [];
    const back = hands[0], front = hands[hands.length - 1];
    const rest = restHeadOf(p.hero, spec, pal);

    // behind the figure
    if (p.cape && head) at(g, head, WALK_H, (q) => profileCape(q, t), { offset: rest });
    if (p.cape && head) at(g, head, WALK_H, capeCollar, { offset: rest });
    if (p.tail && hip) at(g, hip, WALK_H, (q) => (p.tail === 'cat' ? catTail(q, t) : (q.scale(-1, 1), devilTail(q, 0.02, 0))));
    if (p.pail === 'back' && back) at(g, back, WALK_H, pail, { rotate: false });
    if (c.headBehind && head) at(g, head, WALK_H, c.headBehind, { offset: rest });

    g.save();
    if (c.clip) {
      // the costume hides all but the feet: draw only what is below the line
      g.beginPath(); g.rect(0, WALK_GROUND + B33P_HIDE_ABOVE * WALK_H, STAGE_W, STAGE_H); g.clip();
    }
    draw(g);
    g.restore();

    // in front
    if (c.head && head) at(g, head, WALK_H, (q) => c.head(q, t), { offset: rest });
    if (p.fork && front) at(g, front, WALK_H, pitchfork, { rotate: false });
    if (p.pail === 'front' && front) at(g, front, WALK_H, pail, { rotate: false });
  });
  if (pack.post) pack.post(g, 4 + t);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(sc, Math.round(cx * k), Math.round(cy * k), Math.round(cw * k), Math.round(ch * k),
    m.e, m.f, Math.round(cw * k), Math.round(ch * k));
  ctx.restore();
}

// ---------------------------------------------------------------- Gary portraits
//
// Four posed Gary stills for Instagram (26 Oct 2026; the reaper replaced headless): bigger on the page than
// the bake-off stills, each on its own flat colour instead of black. No crypt —
// that is the walk's reveal. The backdrop is a soft radial light behind him
// falling off to a darker edge, plus at most one graphic shape (the vampire's
// moon): one subject, nothing to read but him.

// faceInk: the face's line weight; the portraits are big enough that the
// stills' 0.42 reads heavy round the eyes (Peter: thin them).
const PORTRAIT = { cx: 200, feet: 470, u: 345, faceInk: 0.28 };

function backdrop(ctx, w, h, { inner, outer, moon = null, sun = null }) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.48, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (sun) {
    // the sun as light, not a drawing: a wide warm bloom with a soft bright
    // core, no outline and no rays
    const [sx, sy, sr] = sun;
    const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 8);
    bloom.addColorStop(0, 'rgba(255,253,235,1)');
    bloom.addColorStop(0.1, 'rgba(255,248,205,1)');
    bloom.addColorStop(0.22, 'rgba(255,236,170,0.8)');
    bloom.addColorStop(0.45, 'rgba(255,214,130,0.4)');
    bloom.addColorStop(0.75, 'rgba(255,200,120,0.12)');
    bloom.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = bloom; ctx.fillRect(0, 0, w, h);
  }
  if (moon) {
    const [mx, my, mr] = moon;
    const halo = ctx.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 1.9);
    halo.addColorStop(0, 'rgba(255,240,210,0.28)'); halo.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4e7c6';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(200,180,150,0.35)';
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.13], [-0.05, 0.38, 0.1]]) {
      ctx.beginPath(); ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU); ctx.fill();
    }
  }
}

// The cape held open: from the collar out to each hand and down to the floor,
// so what faces us is the red lining with the black outside showing at the rim.
function openCape(g, { hands: [L, R] }) {
  const hem = -0.02;
  const path = (c) => {
    c.moveTo(-0.13, -0.56);
    c.quadraticCurveTo(L.x * 0.55, -0.62, L.x - 0.015, L.y - 0.03);
    c.quadraticCurveTo(L.x - 0.08, (L.y + hem) / 2, L.x - 0.03, hem);
    const xs = [L.x - 0.03, L.x * 0.5, 0, R.x * 0.5, R.x + 0.03];
    for (let i = 1; i < xs.length; i++) c.quadraticCurveTo((xs[i - 1] + xs[i]) / 2, hem - 0.07, xs[i], hem);
    c.quadraticCurveTo(R.x + 0.08, (R.y + hem) / 2, R.x + 0.015, R.y - 0.03);
    c.quadraticCurveTo(R.x * 0.55, -0.62, 0.13, -0.56);
    c.closePath();
  };
  g.beginPath(); path(g);
  g.strokeStyle = INK; g.lineWidth = 0.034; g.lineJoin = 'round'; g.stroke();
  g.strokeStyle = '#17141f'; g.lineWidth = 0.024; g.stroke();
  g.fillStyle = '#9a1c2c'; g.fill();
  // folds running down from each hand
  for (const H of [L, R]) for (const k of [0.3, 0.6]) {
    line(g, [[H.x * (1 - k * 0.5), H.y + 0.02], [H.x * (1 - k * 0.7), hem - 0.05]], 'rgba(60,8,18,0.45)', 0.008);
  }
  capeCollar(g);
}

// BOO: the sheet over arms thrown up. A dome for the head, a valley either
// side of it, a rounded bump over each raised hand, and long drapes falling
// from the hands to a scalloped hem — the shoes are all of Gary that shows.
// The hands it shapes over are placed higher than his real ones (the headless
// pose only lifts them to -0.68): under a sheet nobody can tell, and BOO wants
// the arms right up.
function boo(g) {
  const L = { x: -0.37, y: -0.97 }, R = { x: 0.37, y: -0.97 };
  const hem = -0.075, wide = 0.37;
  shape(g, '#f4f2ec', (c) => {
    // crown, down the right side over the raised hand to the hem
    c.moveTo(0, -1.035);
    c.quadraticCurveTo(0.21, -1.0, 0.235, -0.88);
    c.quadraticCurveTo(0.25, -0.8, R.x - 0.05, R.y - 0.06);
    c.quadraticCurveTo(R.x + 0.02, R.y - 0.1, R.x + 0.06, R.y - 0.01);
    c.quadraticCurveTo(R.x + 0.08, R.y + 0.18, wide - 0.02, -0.3);
    c.quadraticCurveTo(wide + 0.01, -0.18, wide, hem);
    // the hem, scalloped, right to left
    const xs = [wide, wide * 0.6, wide * 0.2, -wide * 0.2, -wide * 0.6, -wide];
    for (let i = 1; i < xs.length; i++) c.quadraticCurveTo((xs[i - 1] + xs[i]) / 2, hem + 0.05, xs[i], hem);
    // and back up the left side, mirrored
    c.quadraticCurveTo(-wide - 0.01, -0.18, -wide + 0.02, -0.3);
    c.quadraticCurveTo(L.x - 0.08, L.y + 0.18, L.x - 0.06, L.y - 0.01);
    c.quadraticCurveTo(L.x - 0.02, L.y - 0.1, L.x + 0.05, L.y - 0.06);
    c.quadraticCurveTo(-0.25, -0.8, -0.235, -0.88);
    c.quadraticCurveTo(-0.21, -1.0, 0, -1.035);
    c.closePath();
  });
  for (const H of [L, R]) line(g, [[H.x * 0.85, H.y + 0.1], [H.x * 0.72, hem - 0.04]], 'rgba(150,145,170,0.5)', 0.006);
  line(g, [[0.03, -0.5], [0.05, hem - 0.04]], 'rgba(150,145,170,0.35)', 0.005);
  for (const s of [-1, 1]) {
    shape(g, '#0d0b12', oval(s * 0.075, -0.79, 0.045, 0.055));
    shape(g, '#d83030', oval(s * 0.075, -0.785, 0.016, 0.016), 0);
  }
  shape(g, '#fff', (c) => c.roundRect(0.03, -0.5, 0.1, 0.06, 0.008), 0.003);
  label(g, 'GARY', 0.08, -0.47, 0.032, '#c85028');
  shape(g, '#b0b4c0', oval(0.08, -0.505, 0.006, 0.006), 0.002);
  paperHat(g, 0, -0.965, 0.38);
}

// Torso and leg regions for clipping prints and tears to his clothes, read
// off the portrait render (figure units).
// The shirt's shoulder curve, fitted to the render (y -0.551 at x 0.10, -0.528 at 0.135)
const TORSO = (c) => c.roundRect(-0.168, -0.565, 0.336, 0.35, [0.12, 0.12, 0.09, 0.09]);
function inTorso(g, fn) { g.save(); g.beginPath(); TORSO(g); g.clip(); fn(); g.restore(); }

// A Hawaiian print: big pale hibiscus and leaf shapes over the shirt.
function printMotifs(g) {
  const flower = (x, y, r, col) => {
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5 - Math.PI / 2;
      shape(g, col, oval(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.38, a), 0);
    }
    shape(g, '#ffd84a', oval(x, y, r * 0.22, r * 0.22), 0);
  };
  const leaf = (x, y, r, a) => shape(g, '#1f8a6e', oval(x, y, r, r * 0.38, a), 0);
  for (const [x, y, a] of [[-0.1, -0.47, 0.6], [0.06, -0.33, -0.5], [0.12, -0.46, 1.2], [-0.07, -0.27, -1], [0.0, -0.44, 2.2]]) leaf(x, y, 0.045, a);
  for (const [x, y, r, col] of [[-0.09, -0.46, 0.04, '#ff7aa8'], [0.1, -0.42, 0.036, '#fff3e0'], [-0.02, -0.33, 0.034, '#ff7aa8'],
    [0.12, -0.27, 0.03, '#fff3e0'], [-0.13, -0.3, 0.03, '#fff3e0'], [0.07, -0.35, 0.026, '#ff7aa8']]) flower(x, y, r, col);
}
function hawaiianPrint(g) {
  inTorso(g, () => printMotifs(g));
  nameTagBlank(g);
}
// The open neck and the button-down collar, drawn after the camera strap so
// the strap runs under the collar, and kept off the head (centre (-0.002,
// -0.771), radius 0.217 to the ink's outside, measured off the portrait) so
// the chin sits on top of the collar.
function shirtCollar(g) {
  g.save();
  g.beginPath(); g.rect(-1, -1.5, 2, 2); g.ellipse(-0.002, -0.771, 0.219, 0.219, 0, 0, TAU); g.clip('evenodd');
  // the deep V of neck
  // more neck by WIDTH, not depth (Peter: the deep V ruined it): the V opens
  // wider at the throat and comes to the same point as before
  shape(g, '#9ec89e', poly([[-0.07, -0.6], [0.07, -0.6], [0, -0.5]]), 0);
  line(g, [[-0.07, -0.6], [0, -0.5], [0.07, -0.6]], INK, 0.0022);
  // the collar lies ON the shoulders: clipped to the shirt's own outline so
  // its outer edge follows the shoulder curve instead of standing up off it
  g.beginPath(); TORSO(g); g.clip();
  for (const sd of [-1, 1]) {
    shape(g, '#2fb8a6', poly([[sd * 0.068, -0.62], [sd * 0.135, -0.62], [sd * 0.05, -0.485], [sd * 0.006, -0.505]]), 0.0022);
  }
  g.restore();
  // the collar's outer edge along the shoulder, re-inked where the clip cut it
  g.save();
  g.beginPath(); g.rect(-1, -1.5, 2, 2); g.ellipse(-0.002, -0.771, 0.219, 0.219, 0, 0, TAU); g.clip('evenodd');
  g.beginPath(); TORSO(g);
  g.save(); g.beginPath();
  for (const sd of [-1, 1]) poly([[sd * 0.068, -0.62], [sd * 0.135, -0.62], [sd * 0.05, -0.485], [sd * 0.006, -0.505]])(g);
  g.clip();
  g.beginPath(); TORSO(g);
  g.strokeStyle = INK; g.lineWidth = 0.0022; g.stroke();
  g.restore();
  g.restore();
}
// The shirt worn untucked: its tail hangs over the shorts' waistband, cut
// short and straight so the shorts still show below it. Drawn after the
// shorts, with the same print continuing on it.
// It starts where the painter's shirt sides stop being straight (its bottom
// corners round off below -0.31) and carries those sides straight on down,
// on the same line and at the same weight, so there is no join to see.
// The painter's sides start curving in at about -0.32 (a notch where they
// met the old tail at -0.312), so the tail now begins higher, at -0.345, on
// the still-straight sides, and fades in over its first 0.015 so it has no
// top edge of its own to show.
const TAIL_TOP = -0.345, TAIL_HEM = -0.258, SIDE = 0.1672, TAIL_FADE = 0.015;   // SIDE: on the painter's side line
const SHIRT_TAIL = (c) => {
  c.moveTo(-SIDE, TAIL_TOP - 0.004); c.lineTo(SIDE, TAIL_TOP - 0.004);
  c.lineTo(SIDE + 0.004, TAIL_HEM); c.quadraticCurveTo(0, TAIL_HEM + 0.008, -SIDE - 0.004, TAIL_HEM); c.closePath();
};
// The button placket down the front, from the V to the hem — drawn after the
// tail so it runs the whole length of the shirt.
function shirtButtons(g) {
  line(g, [[0.006, -0.5], [0.006, TAIL_HEM + 0.004]], 'rgba(20,60,55,0.5)', 0.0025);
  // two above the camera, two below it
  for (const y of [-0.482, -0.437, -0.318, -0.276]) shape(g, '#fff3e0', oval(0.0, y, 0.007, 0.007), 0.002);
}
function shirtTail(g) {
  const fill = g.createLinearGradient(0, TAIL_TOP, 0, TAIL_TOP + TAIL_FADE);
  fill.addColorStop(0, 'rgba(47,184,166,0)'); fill.addColorStop(1, 'rgba(47,184,166,1)');
  g.beginPath(); SHIRT_TAIL(g); g.fillStyle = fill; g.fill();
  // the same print at the same places as the body's, so it continues unbroken
  g.save(); g.beginPath(); SHIRT_TAIL(g); g.clip(); printMotifs(g); g.restore();
  // The sides pick up from the painter's own line where it is still straight
  // (measured: centre 0.168 at -0.355, the figure 0.0003 left of centre, line
  // 0.0016 wide) — not traced over it, which doubled its weight — and carry
  // on down to the hem.
  const o = -0.0003;
  g.beginPath();
  g.moveTo(o - 0.168, -0.356); g.lineTo(o - SIDE - 0.004, TAIL_HEM);
  g.quadraticCurveTo(o, TAIL_HEM + 0.008, o + SIDE + 0.004, TAIL_HEM);
  g.lineTo(o + 0.168, -0.356);
  g.strokeStyle = INK; g.lineWidth = 0.0016; g.lineJoin = 'round'; g.lineCap = 'butt'; g.stroke();   // measured: the painter's side line is 0.0016 here
}
// His name tag again, over a print or a tear, where the painter put it.
function nameTagBlank(g) { shape(g, '#fff', (c) => c.roundRect(0.025, -0.513, 0.089, 0.058, 0.008), 0.0025); }

// Swim shorts over bare green legs: two short legs of bright stripes, from
// under the shirt hem to above the knee (legs span 0.058–0.145 out).
function swimShorts(g) {
  // Worn high, on his waist, over the bottom of the shirt (Peter's call):
  // the waistband sits across the torso, legs to just below the shirt hem.
  // The waistband is exactly the shirt's width there (its sides run at
  // ±0.165 at that height), so the outline carries straight on down into the shorts.
  const top = -0.31, hem = -0.15, crotch = -0.205;
  const path = (c) => {
    c.moveTo(-0.165, top);
    c.lineTo(0.165, top);
    c.lineTo(0.176, hem);
    c.lineTo(0.045, hem + 0.004);
    c.lineTo(0.0, crotch);
    c.lineTo(-0.045, hem + 0.004);
    c.lineTo(-0.176, hem);
    c.closePath();
  };
  shape(g, '#ff8a1e', path, 0);
  g.save(); g.beginPath(); path(g); g.clip();
  for (let x = -0.2; x < 0.2; x += 0.05) shape(g, '#ffd84a', (c) => c.rect(x, top - 0.01, 0.018, hem - top + 0.03), 0);
  g.restore();
  shape(g, null, path, 0.0022);
}

// Slides. The painter's slipper, in his skin colour, is the bare foot;
// over its sole band goes an orange flip-flop sole, and over the foot a
// thong strap in a V to the toe post. Measured off the portrait render:
// feet span x ±0.056–0.202 (centre ±0.129), foot top -0.039, sole band
// y 0.016–0.027.
function flipFlops(g) {
  // SLIDES (Peter, over flip-flops): an orange sole, and one wide blue band
  // across the foot, cut to the foot's own dome so it wraps over it.
  for (const sd of [-1, 1]) {
    const cx = sd * 0.129;
    shape(g, '#ff8a1e', (c) => c.roundRect(cx - 0.079, 0.012, 0.158, 0.018, 0.009), 0.0022);
    const dome = (c) => c.ellipse(cx, 0.014, 0.073, 0.054, 0, Math.PI, TAU);
    g.save();
    g.beginPath(); dome(g); g.closePath(); g.clip();
    // the band, lowered so more green foot shows above it; toes below it
    shape(g, '#2f6fd0', (c) => c.rect(cx - 0.09, -0.026, 0.18, 0.022), 0);
    shape(g, 'rgba(255,255,255,0.85)', (c) => c.rect(cx - 0.09, -0.018, 0.18, 0.005), 0);
    g.beginPath();
    g.moveTo(cx - 0.09, -0.026); g.lineTo(cx + 0.09, -0.026);
    g.moveTo(cx - 0.09, -0.004); g.lineTo(cx + 0.09, -0.004);
    g.strokeStyle = INK; g.lineWidth = 0.003; g.stroke();
    // toe lines
    for (const k of [-0.03, -0.01, 0.01, 0.03]) line(g, [[cx + k, 0.0], [cx + k, 0.01]], 'rgba(40,60,40,0.55)', 0.0022);
    g.restore();
    g.beginPath(); dome(g); g.strokeStyle = INK; g.lineWidth = 0.0022; g.stroke();
  }
}

// A holiday cocktail in his hand: a tall curved glass of sunset orange, a
// cocktail umbrella, a straw and a slice of lime. The glass stands IN FRONT
// of his round hand, and his fingers wrap over its lower half — three green
// knuckle bars across the glass and a thumb over its far edge — so he grips
// it rather than balancing it on a ball.
// (Peter: no fingers — the round hand stays, BEHIND the base of the glass.)
function cocktail(g, H) {
  // A COCONUT DRINK (Peter, over the glass): a round coconut sitting in his
  // round palm — the shapes agree — its top cut off to show the white flesh,
  // with a curly straw, a paper umbrella, a pink hibiscus and a pineapple wedge.
  const x = H.x - 0.002, y = H.y - 0.05, r = 0.07;   // nut centre, sitting down in the palm
  // his hand under it — the painter's own is hidden by the arm pass, so the
  // palm is put back where the coconut rests on it
  shape(g, '#9ec89e', oval(H.x, H.y, 0.0464, 0.0464), 0.0016);
  // the nut: brown, a little lighter where the light lands, hairy streaks
  shape(g, '#7a4a2a', oval(x, y, r, r * 0.92), 0.0022);
  g.save(); g.beginPath(); g.ellipse(x, y, r, r * 0.92, 0, 0, TAU); g.clip();
  const sh = g.createRadialGradient(x - r * 0.4, y - r * 0.2, 0, x, y, r * 1.2);
  sh.addColorStop(0, 'rgba(190,130,80,0.6)'); sh.addColorStop(1, 'rgba(40,20,10,0.25)');
  g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
  for (let k = 0; k < 9; k++) {
    const a = -0.4 + k * 0.35, x0 = x + Math.cos(a) * r * 0.3, y0 = y + Math.sin(a) * r * 0.3 + 0.01;
    line(g, [[x0, y0], [x0 + Math.cos(a) * 0.025, y0 + Math.sin(a) * 0.025]], 'rgba(60,32,16,0.5)', 0.0025);
  }
  g.restore();
  // a lime wheel SLOTTED onto the rim, as a bar would serve it: drawn after
  // the shell and before the white rim, so the rim covers the part of it that
  // is inside the nut and the rest hangs down the outside of the shell
  {
    const lx = x + r * 0.7, ly = y - r * 0.5, lr = 0.03;
    shape(g, '#5aa832', oval(lx, ly, lr, lr), 0.0022);
    shape(g, '#d9f0a8', oval(lx, ly, lr * 0.8, lr * 0.8), 0);
    for (let k = 0; k < 8; k++) {
      const a2 = k * Math.PI / 4;
      line(g, [[lx, ly], [lx + Math.cos(a2) * lr * 0.75, ly + Math.sin(a2) * lr * 0.75]], 'rgba(150,200,80,0.9)', 0.0022);
    }
    shape(g, '#f4fbe4', oval(lx, ly, lr * 0.12, lr * 0.12), 0);
  }
  // the cut top: white flesh ring round a pale drink
  shape(g, '#fdf6e6', oval(x, y - r * 0.62, r * 0.78, r * 0.26), 0.0022);
  shape(g, '#f7e2a8', oval(x, y - r * 0.6, r * 0.6, r * 0.17), 0);
  // the bendy straw, standing in the drink (drawn after the flesh), cut off
  // flat at the drink's surface so it goes in rather than resting on it
  g.save(); g.beginPath(); g.rect(-1, -2, 2, 2 + y - r * 0.6); g.clip();
  // a bendy straw: up, a kink, and over
  g.beginPath(); g.moveTo(x + 0.013, y - r * 0.45); g.lineTo(x + 0.03, y - r - 0.05);
  g.quadraticCurveTo(x + 0.035, y - r - 0.075, x + 0.06, y - r - 0.08);
  g.strokeStyle = INK; g.lineWidth = 0.011; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  g.strokeStyle = '#fff3e0'; g.lineWidth = 0.007; g.stroke();
  for (let k = 0; k < 4; k++) {
    const t = (k + 0.5) / 4, sx = x + 0.015 + (0.015) * t, sy = y - r * 0.6 + (-r - 0.05 + r * 0.5) * t;
    line(g, [[sx - 0.003, sy + 0.004], [sx + 0.004, sy - 0.004]], '#ff5b8a', 0.004);
  }
  g.restore();
  // the paper umbrella, its stick planted in the drink and leaning out over
  // the rim, the canopy tipped with it
  {
    const bx = x - r * 0.12, by = y - r * 0.6, len = 0.06, a = -0.3;
    const tx = bx + Math.sin(a) * len, ty = by - Math.cos(a) * len;
    // the stick first, up to the canopy's peak, so the canopy covers its top
    g.save(); g.beginPath(); g.rect(-1, -2, 2, 2 + y - r * 0.6); g.clip();
    line(g, [[bx - Math.sin(a) * 0.02, by + 0.02], [bx + Math.sin(a) * (len + 0.016), by - Math.cos(a) * (len + 0.016)]], INK, 0.004);
    g.restore();
    g.save(); g.translate(tx, ty); g.rotate(a);
    shape(g, '#ff5b8a', (c) => {
      c.moveTo(-0.05, 0.012); c.quadraticCurveTo(0, -0.045, 0.05, 0.012);
      for (let k = 0; k < 4; k++) c.quadraticCurveTo(0.05 - 0.025 * (k + 0.5), 0, 0.05 - 0.025 * (k + 1), 0.012);
      c.closePath();
    }, 0.0025);
    for (const k of [-0.5, 0, 0.5]) line(g, [[0, -0.015], [k * 0.075, 0.008]], 'rgba(255,255,255,0.5)', 0.0025);
    g.restore();
  }
  for (let k = 0; k < 5; k++) {
    const a = k * TAU / 5 - Math.PI / 2;
    shape(g, '#ff5b8a', oval(x - r * 0.72 + Math.cos(a) * 0.014, y - r * 0.15 + Math.sin(a) * 0.014, 0.014, 0.01, a), 0.0016);
  }
  shape(g, '#ffd84a', oval(x - r * 0.72, y - r * 0.15, 0.006, 0.006), 0);
}

// The tourist's camera on its strap, hanging on his chest.
// The strap comes out from under the collar's outer corner to the camera's
// two top corners (drawn before the collar).
function cameraStrap(g) {
  line(g, [[-0.058, -0.53], [-0.052, -0.44 + CAM_DROP]], '#3a2a1f', 0.008);
  line(g, [[0.058, -0.53], [0.052, -0.44 + CAM_DROP]], '#3a2a1f', 0.008);
}
const CAM_DROP = 0.03;   // camera hangs a little lower so the strap goes behind the collar
function touristCamera(g) {
  g.save(); g.translate(0, CAM_DROP); touristCameraBody(g); g.restore();
}
function touristCameraBody(g) {
  shape(g, '#2b2b34', (c) => c.roundRect(-0.06, -0.445, 0.12, 0.075, 0.012), 0.004);
  shape(g, '#55556a', (c) => c.roundRect(-0.045, -0.462, 0.04, 0.02, 0.005), 0.003);
  shape(g, '#16141c', oval(0.008, -0.407, 0.026, 0.026), 0.004);
  shape(g, '#5e7fa8', oval(0.008, -0.407, 0.015, 0.015), 0);
  // the glint: a thin curved sliver across the top-left of the glass, so it
  // reads as reflection, not as a dot (a dot read as a button — Peter)
  g.beginPath(); g.arc(0.008, -0.407, 0.0105, Math.PI * 1.08, Math.PI * 1.45);
  g.strokeStyle = 'rgba(232,244,255,0.85)'; g.lineWidth = 0.003; g.lineCap = 'round'; g.stroke();
  shape(g, '#d8333a', oval(0.045, -0.43, 0.006, 0.006), 0);
}

// Sunglasses pushed up onto the paper hat, and a sunburn: pink on his green.
function touristFace(g) {
  // sunburn on the cheeks, below the eyes
  for (const sx of [-1, 1]) shape(g, 'rgba(255,110,110,0.45)', oval(0.01 + sx * 0.115, -0.685, 0.045, 0.028), 0);
  for (const ex of [-0.065, 0.085]) shape(g, '#16141c', (c) => c.roundRect(ex - 0.05, -0.965, 0.1, 0.05, 0.02), 0.004);
  line(g, [[-0.015, -0.945], [0.035, -0.945]], '#16141c', 0.006);
  // the glint: a soft sheen down each lens and two bright diagonal streaks
  // across its top corner, like light skating off dark glass
  for (const ex of [-0.065, 0.085]) {
    g.save();
    g.beginPath(); g.roundRect(ex - 0.05, -0.965, 0.1, 0.05, 0.02); g.clip();
    const sh = g.createLinearGradient(ex - 0.05, -0.965, ex + 0.03, -0.925);
    sh.addColorStop(0, 'rgba(140,170,220,0.45)'); sh.addColorStop(1, 'rgba(140,170,220,0)');
    g.fillStyle = sh; g.fillRect(ex - 0.05, -0.965, 0.1, 0.05);
    line(g, [[ex - 0.03, -0.968], [ex - 0.05, -0.93]], 'rgba(255,255,255,0.9)', 0.007);
    line(g, [[ex - 0.012, -0.968], [ex - 0.03, -0.93]], 'rgba(255,255,255,0.6)', 0.0035);
    g.restore();
  }
}

// The ordinary zombie: his own clothes, ripped and bloodied. Rips show his
// green through; the shirt hem and trouser cuffs are torn ragged; fake blood
// runs from the mouth corner and spatters the shirt.
function zombieRags(g) {
  const green = '#9ec89e';
  inTorso(g, () => {
    for (const [x, y, w, h, a] of [[-0.08, -0.4, 0.05, 0.03, 0.3], [0.1, -0.31, 0.04, 0.026, -0.4], [0.03, -0.48, 0.03, 0.018, 0.1]]) {
      shape(g, green, (c) => {
        c.moveTo(x - w, y); c.lineTo(x - w * 0.4, y - h); c.lineTo(x, y - h * 0.4); c.lineTo(x + w * 0.5, y - h);
        c.lineTo(x + w, y + h * 0.2); c.lineTo(x + w * 0.2, y + h); c.lineTo(x - w * 0.5, y + h * 0.6); c.closePath();
      }, 0.003);
    }
    // the ragged hem: zig-zag bites out of the bottom of the shirt
    shape(g, '#2b3a6a', (c) => {
      c.moveTo(-0.2, -0.2);
      const n = 9;
      for (let i = 0; i <= n; i++) c.lineTo(-0.168 + (0.336 * i) / n, -0.235 + (i % 2 ? -0.03 : 0.005));
      c.lineTo(0.2, -0.2); c.closePath();
    }, 0);
    // fake blood: splashes that run down in drips
    const splash = (x, y, r, drips) => {
      shape(g, '#a3161f', (c) => {
        c.moveTo(x - r, y);
        c.quadraticCurveTo(x - r, y - r * 0.9, x, y - r * 0.85);
        c.quadraticCurveTo(x + r * 1.1, y - r * 0.8, x + r, y);
        for (const [dx, len] of drips) {
          c.lineTo(x + dx + r * 0.18, y + r * 0.3);
          c.lineTo(x + dx + r * 0.16, y + len);
          c.quadraticCurveTo(x + dx, y + len + r * 0.35, x + dx - r * 0.16, y + len);
          c.lineTo(x + dx - r * 0.18, y + r * 0.35);
        }
        c.quadraticCurveTo(x - r * 0.5, y + r * 0.6, x - r, y);
        c.closePath();
      }, 0);
    };
    splash(-0.1, -0.44, 0.024, [[0.004, 0.055]]);
    splash(0.07, -0.35, 0.028, [[-0.008, 0.07], [0.014, 0.04]]);
    splash(0.13, -0.47, 0.014, [[0, 0.03]]);
  });
  nameTagBlank(g);
  // fake blood from the mouth corner
  shape(g, '#a3161f', (c) => {
    c.moveTo(0.05, -0.64); c.quadraticCurveTo(0.058, -0.62, 0.056, -0.6);
    c.quadraticCurveTo(0.05, -0.59, 0.046, -0.6); c.quadraticCurveTo(0.045, -0.62, 0.05, -0.64); c.closePath();
  }, 0);
}

export const GARY_PORTRAITS = [
  {
    id: 'vampire', costume: 'vampire',
    // Arms flung wide (the painter's flex, at the spread end) to hold the cape open.
    pose: { menuAction: 'flex', time: 0.1, faceJoy: true },
    behind: (g, ctx, M) => openCape(g, M),
    // Deep red into black with a full moon behind his head: the black cape and
    // suit need a light, warm ground to read as shapes at all.
    bg: { inner: '#7a1f2e', outer: '#16070d', moon: [322, 86, 52] },   // top-right corner (Peter)
  },
  {
    id: 'ghost', costume: 'sheet',
    // Arms up under the sheet. The painter's headless pose is the one that
    // raises both arms, and the sheet hides that there is no head under it.
    pose: { headless: true },
    front: (g) => boo(g),
    bg: { inner: '#2c3a7a', outer: '#090b1c' },
  },
  {
    id: 'alive', costume: 'alive',
    // Standing, grinning, the sticker on: a human face and green hands. The
    // hands are his own skin through the palette (`hand`), not discs laid
    // over them, and the mask's elastic and green neck ring are gone — the
    // hands are the whole joke and the face should just read as a face.
    pose: { faceJoy: true },
    pal: { m: '#7a3434', hand: '#9ec89e' },
    front: (g) => {
      // His own green shows at the very edge of the mask's eye holes: the
      // eyes' ink outline is painted over in his green. Eyes at (-0.064 /
      // 0.084, -0.778), measured off the portrait render.
      // drawEyes: whites 0.055 x 0.065 u, 0.075 either side of the face's
      // centre line (0.010 here), the ink outline ~0.0046 wide centred on that
      // edge. Finer than the ink: its inner half is painted back to white and
      // a thinner green line sits on the outer half.
      for (const ex of [0.010 - 0.075, 0.010 + 0.075]) {
        g.beginPath(); g.ellipse(ex, -0.778, 0.0533, 0.0633, 0, 0, TAU);
        g.strokeStyle = '#fff'; g.lineWidth = 0.003; g.stroke();
        g.beginPath(); g.ellipse(ex, -0.778, 0.0563, 0.0663, 0, 0, TAU);
        g.strokeStyle = '#7fb27f'; g.lineWidth = 0.0036; g.stroke();
      }
      for (const s of [-1, 1]) shape(g, 'rgba(230,110,110,0.35)', oval(s * 0.12, -0.69, 0.032, 0.02), 0);
      g.save();
      g.translate(-0.07, -0.42); g.rotate(-0.08);
      shape(g, '#fff', (c) => c.roundRect(-0.075, -0.045, 0.15, 0.09, 0.01), 0.003);
      shape(g, '#d8333a', (c) => c.roundRect(-0.075, -0.045, 0.15, 0.03, [0.01, 0.01, 0, 0]), 0);
      label(g, 'HELLO I AM', 0, -0.03, 0.017, '#fff');
      label(g, 'ALIVE', 0, 0.012, 0.042, '#2a2238');
      g.restore();
    },
    // Daylight: the one costume that wants to be seen in broad day.
    bg: { inner: '#bfe3f5', outer: '#4f93c4' },
  },
  {
    id: 'tourist', costume: null,
    // A TOURIST: Hawaiian shirt, khaki trousers, camera, sunglasses up on the
    // paper hat, and a sunburn — pink on top of green. The deceased on holiday.
    // Elbow bent, the drink held in front of his body beside the camera.
    pose: { faceJoy: true, handAtB: [0.14, -0.35], elbowB: 1, farArmFront: true },
    // legs and feet bare (his green): the slipper-shaped shoe in his skin is
    // the foot, and flipFlops() puts a sole under it and a strap over it
    // The shirt tail here is the costume's own (shirtTail, over the swim
    // shorts), so the painter's shirt-over-trousers hem is switched off: two
    // hems on one shirt drew two side lines.
    spec: { shoeShape: 'slipper', pants: false, tee: 0 },
    pal: { b: '#2fb8a6', p: '#9ec89e', f: '#9ec89e' },
    front: (g, ctx, M) => { hawaiianPrint(g); swimShorts(g); shirtTail(g); shirtButtons(g); cameraStrap(g); shirtCollar(g); touristCamera(g); touristFace(g); flipFlops(g); cocktail(g, M.hands[1]); },
    // A beach afternoon: warm sand gold into sunset orange.
    bg: { inner: '#ffe08a', outer: '#f08a3c', sun: [330, 72, 32] },
  },
  {
    id: 'zombie', costume: null,
    // AN ORDINARY ZOMBIE. He is one. He dressed as a worse one: ripped shirt,
    // ragged hems, fake blood, and the moan (the surprised O mouth).
    pose: { faceSurprised: true },
    pal: { b: '#2b3a6a' },
    front: (g) => zombieRags(g),
    // Graveyard fog: sickly green into deep purple.
    bg: { inner: '#7da36b', outer: '#241838' },
  },
  {
    id: 'reaper',
    // THE GRIM REAPER — a new costume for the portraits. Deceased, so he went
    // as the department head. Hooded robe, scythe, and the name tag pinned to
    // the robe, because he is still on shift.
    costume: null,
    // A side-eye away from his scythe and a plain closed smile — the painter's
    // own `smile` mouth (the one Kiko and Clara wear), not the joy grin.
    spec: { head: 'none', mouth: 'smile' },
    pose: { gazeAmt: 1, gazeX: -0.05, gazeY: 0 },
    pal: { b: '#1f1c29', p: '#1f1c29', f: '#1f1c29' },
    behind: (g, ctx, M) => { reaperRobe(g); reaperHoodBack(g); },
    front: (g, ctx, M) => {
      reaperHoodFront(g); scythe(g, M.hands[1]);
      // the painter's smile is a hairline at this size; inked over at the eyes' weight
      g.beginPath(); g.moveTo(-0.032, -0.631); g.quadraticCurveTo(0.01, -0.598, 0.052, -0.631);
      g.strokeStyle = INK; g.lineWidth = 0.0035; g.lineCap = 'round'; g.stroke();
    },
    // Graveyard-mist green into black: the black robe needs a lit ground, and
    // green ties it to his skin without competing with it.
    bg: { inner: '#3f7a66', outer: '#06120e' },
  },
];

// The robe falls from the shoulders to the floor, BEHIND him: his torso and
// legs take the robe's colour, so they melt into it and only the arms, hands
// and the name tag read on top.
function reaperRobe(g) {
  const hem = -0.01;
  shape(g, '#1f1c29', (c) => {
    c.moveTo(-0.2, -0.58);
    c.quadraticCurveTo(-0.27, -0.3, -0.33, hem);
    const xs = [-0.33, -0.16, 0, 0.16, 0.33];
    for (let i = 1; i < xs.length; i++) c.quadraticCurveTo((xs[i - 1] + xs[i]) / 2, hem - 0.035, xs[i], hem);
    c.quadraticCurveTo(0.27, -0.3, 0.2, -0.58);
    c.closePath();
  });
  for (const x of [-0.17, 0.02, 0.18]) line(g, [[x * 0.6, -0.3], [x, hem - 0.03]], 'rgba(120,110,150,0.35)', 0.006);
}

// The hood is two layers: its back, a dome behind the head, and its front, a
// rim round the face with the face showing through the opening and a shadow
// cast down across the brow.
const HOOD_OUT = (c) => {
  c.moveTo(-0.27, -0.58);
  c.quadraticCurveTo(-0.32, -0.88, -0.17, -1.03);
  c.quadraticCurveTo(0, -1.13, 0.17, -1.03);
  c.quadraticCurveTo(0.32, -0.88, 0.27, -0.58);
  c.quadraticCurveTo(0, -0.5, -0.27, -0.58);
  c.closePath();
};
function reaperHoodBack(g) { shape(g, '#17151f', HOOD_OUT); }
function reaperHoodFront(g) {
  g.save();
  g.beginPath(); g.ellipse(0, -0.75, 0.205, 0.215, 0, 0, TAU); g.clip();
  const sh = g.createLinearGradient(0, -0.98, 0, -0.7);
  sh.addColorStop(0, 'rgba(10,8,16,0.85)'); sh.addColorStop(1, 'rgba(10,8,16,0)');
  g.fillStyle = sh; g.fillRect(-0.3, -1.0, 0.6, 0.32);
  g.restore();
  g.beginPath();
  HOOD_OUT(g);
  g.moveTo(0.205, -0.75);          // a fresh subpath, or the arc is joined to the hood by a line
  g.ellipse(0, -0.75, 0.205, 0.215, 0, 0, TAU);
  g.fillStyle = '#1f1c29'; g.fill('evenodd');
  g.strokeStyle = INK; g.lineWidth = LW; g.stroke();
}

// Held upright in his hand, the blade sweeping out and down away from him.
function scythe(g, H) {
  const top = -1.18, foot = -0.02;
  line(g, [[H.x + 0.012, foot], [H.x - 0.012, top]], INK, 0.026);
  line(g, [[H.x + 0.012, foot], [H.x - 0.012, top]], '#6b4a2b', 0.016);
  const bx = H.x - 0.012, by = top + 0.02;
  shape(g, '#c9ced8', (c) => {
    c.moveTo(bx - 0.01, by - 0.02);
    c.quadraticCurveTo(bx + 0.2, by - 0.1, bx + 0.33, by + 0.12);
    c.quadraticCurveTo(bx + 0.2, by + 0.0, bx + 0.0, by + 0.04);
    c.closePath();
  });
  line(g, [[bx + 0.04, by - 0.01], [bx + 0.26, by + 0.06]], 'rgba(255,255,255,0.6)', 0.005);
  shape(g, '#3a3a48', (c) => c.rect(bx - 0.025, by - 0.03, 0.05, 0.06), 0.004);
}

// Faces for the living-person portrait (26 Oct): Peter wants him nervous, not
// beaming. Each is the painter's own pose switches plus at most a mouth and a
// bead of sweat inked on. Mouth sits at about (0.01, -0.63) in the portrait;
// brows are tinted his (mask) hair colour, or they come out in his red eye ink.
const MOUTH_Y = -0.65, MOUTH_X = 0.01;   // on the painter's own faint mouth line, so it is covered
function sweat(g, x = 0.175, y = -0.84) {
  shape(g, '#cfeeff', (c) => {
    c.moveTo(x, y - 0.03);
    c.quadraticCurveTo(x + 0.022, y + 0.002, x, y + 0.012);
    c.quadraticCurveTo(x - 0.022, y + 0.002, x, y - 0.03);
    c.closePath();
  }, 0.004);
}
function inkLine(g, build, w = 0.005) {
  g.beginPath(); build(g); g.strokeStyle = INK; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
}
function wobblyMouth(g) {
  inkLine(g, (c) => {
    const x0 = MOUTH_X - 0.06, n = 6;
    c.moveTo(x0, MOUTH_Y);
    for (let i = 1; i <= n; i++) c.lineTo(x0 + (0.12 * i) / n, MOUTH_Y + (i % 2 ? -0.009 : 0.004));
  });
}
function gritTeeth(g) {
  const w = 0.075, h = 0.032, x = MOUTH_X, y = MOUTH_Y - 0.005;
  shape(g, '#fffdf4', (c) => c.roundRect(x - w, y - h / 2, w * 2, h, 0.012), 0.005);
  inkLine(g, (c) => { c.moveTo(x - w, y); c.lineTo(x + w, y); }, 0.003);
  for (let i = -2; i <= 2; i++) inkLine(g, (c) => { c.moveTo(x + i * w / 3, y - h / 2); c.lineTo(x + i * w / 3, y + h / 2); }, 0.003);
}
function smallSmile(g, lift = 0.02) {
  inkLine(g, (c) => { c.moveTo(MOUTH_X - 0.04, MOUTH_Y); c.quadraticCurveTo(MOUTH_X, MOUTH_Y + lift, MOUTH_X + 0.04, MOUTH_Y); });
}
function flatMouth(g) { inkLine(g, (c) => { c.moveTo(MOUTH_X - 0.045, MOUTH_Y); c.lineTo(MOUTH_X + 0.045, MOUTH_Y); }); }
const BROW = { browCol: '#6b4a2b' };
export const ALIVE_FACES = [
  { id: 'A', label: 'A  big grin (now)', pose: { faceJoy: true } },
  // no browRaise: raised brows land across his fringe (Peter)
  { id: 'B', label: 'B  gritted-teeth grin, sweat', spec: { mouth: 'line' }, pose: {}, pal: BROW, draw: (g) => { gritTeeth(g); sweat(g); } },
  { id: 'C', label: 'C  wobbly smile, eyes darting', spec: { mouth: 'line' }, pose: { browRaise: true, gazeAmt: 1, gazeX: -0.045 }, pal: BROW, draw: (g) => { wobblyMouth(g); sweat(g); } },
  { id: 'D', label: 'D  tight smile, side-eye', spec: { mouth: 'line' }, pose: { gazeAmt: 1, gazeX: 0.045 }, pal: BROW, draw: (g) => smallSmile(g, 0.014) },
  { id: 'E', label: 'E  frozen, flat mouth, sweat', spec: { mouth: 'line' }, pose: { browRaise: true }, pal: BROW, draw: (g) => { flatMouth(g); sweat(g); sweat(g, -0.18, -0.8); } },
  { id: 'F', label: 'F  caught: surprised', pose: { faceSurprised: true, browRaise: true }, pal: BROW },
];

const ALIVE_FACE = 'B';   // Peter's pick, 26 Oct: the gritted-teeth grin
export function paintPortrait(ctx, w, h, { id, face = null }) {
  const P0 = GARY_PORTRAITS.find((v) => v.id === id);
  const fx = (face || (id === 'alive' ? ALIVE_FACE : null)) && ALIVE_FACES.find((f) => f.id === (face || ALIVE_FACE));
  const P = fx ? {
    ...P0,
    // the face's pose REPLACES the portrait's expression switches
    pose: { ...fx.pose },
    spec: { ...(P0.spec || {}), ...(fx.spec || {}) },
    pal: { ...(P0.pal || {}), ...(fx.pal || {}) },
    front: (g, c2, M) => { P0.front && P0.front(g, c2, M); fx.draw && fx.draw(g); },
  } : P0;
  const base = (P.costume && COSTUMES.gary.find((v) => v.id === P.costume)) || {};
  backdrop(ctx, w, h, P.bg);
  F = PORTRAIT;
  try {
    paintFigure(ctx, 'gary', {
      ...base,
      pose: fx ? { ...(P.pose || {}) } : { ...(base.pose || {}), ...(P.pose || {}) },
      spec: { ...(base.spec || {}), ...(P.spec || {}) },
      pal: { ...(base.pal || {}), ...(P.pal || {}) },
      behind: P.behind || base.behind,
      front: P.front || base.front,
    });
  } finally { F = STILL; }
}

// The hat bake-off sheet: Kiko alone walking through the crypt, one cell per
// hat, at the walk's own scale; each row a different moment of her stride.
export function paintKikoHatSheet(ctx, w, h, { cell, times, ids = Object.keys(KIKO_HATS) }) {
  const [cw, ch] = cell;
  const k = ctx.getTransform().a;
  ids.forEach((id, col) => times.forEach((t, row) => {
    setKikoHat(id);
    ctx.save();
    ctx.translate(col * cw, row * ch);
    ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.clip();
    paintWalkFrame(ctx, cw, ch, { t, crop: [240 - cw / 2, 248 - ch, cw, ch], smile: true, only: 'kiko', lead: 0.5 });
    ctx.restore();
    if (row === 0) {
      ctx.fillStyle = '#f0e5c9';
      ctx.font = "4px 'Lilita One'";
      ctx.textBaseline = 'top';
      ctx.fillText(KIKO_HATS[id].label, col * cw + 2, 2);
    }
  }));
  setKikoHat('D');
}

// Colour test: Kiko alone in the crypt in each look, at the walk's scale.
export function paintKikoLookSheet(ctx, w, h, { cell, t }) {
  const [cw, ch] = cell;
  const ids = Object.keys(KIKO_LOOKS);
  const was = KIKO_LOOK;
  ids.forEach((id, col) => {
    setKikoLook(id);
    ctx.save();
    ctx.translate(col * cw, 0);
    ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.clip();
    paintWalkFrame(ctx, cw, ch, { t, crop: [240 - cw / 2, 248 - ch, cw, ch], smile: true, only: 'kiko', lead: 0.5 });
    ctx.restore();
    ctx.fillStyle = '#f0e5c9';
    ctx.font = "4px 'Lilita One'";
    ctx.textBaseline = 'top';
    ctx.fillText(KIKO_LOOKS[id].label, col * cw + 2, 2);
  });
  setKikoLook(was);
}

// Contact sheet of the living-person faces: each cell the portrait's top half.
export function paintAliveFaceSheet(ctx, w, h) {
  ALIVE_FACES.forEach((f, i) => {
    const cx = (i % 3) * 400, cy = Math.floor(i / 3) * 300;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath(); ctx.rect(0, 0, 400, 300); ctx.clip();
    ctx.translate(-200, -320);
    ctx.scale(2, 2);
    paintPortrait(ctx, 400, 500, { id: 'alive', face: f.id });
    ctx.restore();
    ctx.font = "20px 'Lilita One'";
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(22,20,28,0.8)';
    ctx.fillRect(cx, cy, ctx.measureText(f.label).width + 24, 36);
    ctx.fillStyle = '#f0e5c9';
    ctx.fillText(f.label, cx + 12, cy + 8);
  });
}
