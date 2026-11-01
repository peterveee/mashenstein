// The MANAGEMENT ARCHIVE relics, baked off (1 Nov 2026). Peter, of the three
// that shipped with the act-ending flights: "very basic, bake off to get
// better versions of these please".
//
// Every candidate draws into the SAME case the Trophy Room gives a relic — the
// 40x76 box with the relic's origin at (x, y), its stand at y+30 —
// so a winner drops straight into TrophyRoomState.drawBossRelic. Candidates
// are the shipped three subjects redrawn, then four presentation treatments
// on top of that redraw, so the answer can be "A's drawing, C's case".
//
//   A  INKED     the subject redrawn: Eggshell's ink line, cel light, bigger,
//                each one carrying more of where it came from (the tub's dead
//                headlamp on the panel, the mast flange on the rotor, the
//                machine's red-edged cradle under the core)
//   B  BRACKET   A on a brass museum bracket instead of the flat purple stand
//   C  BELL JAR  A under a glass dome on a turned wooden base
//   D  WRECKED   A with the damage turned up — torn, snapped, split open
//   E  SPOTLIT   A under a spotlight from the case top, with a cast shadow
//
// SHIPPED 1 Nov 2026: D, as src/sprites/archive-relics.js, with the brown
// plinth under each relic removed from the case.
import { EG_LINE, egP, egLine, egDot, rr } from '../sprites/props.js';

const INK = "#1a1028";
const EG_RED = "#c83030"; // props.js EG_RED, not exported
const DARK = '#3a3a48', STEEL = '#9a9aa8', STEEL_LIT = '#c9c9d6';
const STAND = '#6b526f';
const BRASS = '#b98a3a', BRASS_LIT = '#e8c46a', BRASS_DARK = '#6b4e1c';
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ stands

// The flat purple bar that shipped.
function stand(c, x, y) {
  c.fillStyle = STAND; c.fillRect(x - 17, y + 30, 34, 4);
}

// B. A brass bracket: a disc foot on the stand, a short post, and two curled
// fingers that hold the piece from behind.
function bracket(c, x, y, { spread = 9, footY = 30, holdY = 22 } = {}) {
  stand(c, x, y);
  egP(c, BRASS_DARK, (k) => k.ellipse(x, y + footY, 9, 2.2, 0, 0, TAU));
  egP(c, BRASS, (k) => k.ellipse(x, y + footY - 0.8, 9, 2.2, 0, 0, TAU), INK, 0.5);
  egLine(c, BRASS_DARK, 2.6, (k) => { k.moveTo(x, y + footY - 1); k.lineTo(x, y + holdY + 3); });
  egLine(c, BRASS, 1.6, (k) => { k.moveTo(x, y + footY - 1); k.lineTo(x, y + holdY + 3); });
  for (const s of [-1, 1]) {
    egLine(c, BRASS_DARK, 2.2, (k) => { k.moveTo(x, y + holdY + 3); k.quadraticCurveTo(x + s * spread * 0.6, y + holdY + 3, x + s * spread, y + holdY - 2); });
    egLine(c, BRASS_LIT, 1.1, (k) => { k.moveTo(x, y + holdY + 3); k.quadraticCurveTo(x + s * spread * 0.6, y + holdY + 3, x + s * spread, y + holdY - 2); });
    egDot(c, BRASS_LIT, x + s * spread, y + holdY - 2.2, 1.2, INK, 0.4);
  }
}

// C. A turned wooden base where the purple bar was; the dome goes on after
// the relic so the glass sits in front of it.
function jarBase(c, x, y) {
  egP(c, '#3a2518', (k) => rr(k, x - 18, y + 31, 36, 5, 1.5));
  egP(c, '#5a3a24', (k) => rr(k, x - 17, y + 28.5, 34, 3.5, 1.5), INK, 0.5);
  egP(c, 'rgba(255,220,160,0.18)', (k) => k.rect(x - 15, y + 29, 30, 1));
}
function jarDome(c, x, y) {
  const path = (k) => rr(k, x - 15.5, y + 0.5, 31, 29, 15);
  const g = c.createLinearGradient(x - 15, 0, x + 15, 0);
  g.addColorStop(0, 'rgba(210,228,255,0.16)'); g.addColorStop(0.5, 'rgba(210,228,255,0.04)'); g.addColorStop(1, 'rgba(210,228,255,0.12)');
  egP(c, g, path, 'rgba(236,244,255,0.55)', 0.8);
  // the window light down the left, and a point of it on the crown
  egLine(c, 'rgba(255,255,255,0.5)', 1.3, (k) => { k.moveTo(x - 12, y + 23); k.lineTo(x - 12, y + 11); k.quadraticCurveTo(x - 12, y + 4.5, x - 6, y + 3); });
  egDot(c, 'rgba(255,255,255,0.6)', x + 7, y + 3.6, 0.9);
}

// E. A cone of light from the case top and the pool it makes on the stand,
// then the relic's contact shadow.
function spotlight(c, x, y) {
  const g = c.createLinearGradient(0, y - 2, 0, y + 32);
  g.addColorStop(0, 'rgba(255,236,170,0.16)'); g.addColorStop(1, 'rgba(255,236,170,0.01)');
  egP(c, g, (k) => { k.moveTo(x - 2.5, y - 3); k.lineTo(x + 2.5, y - 3); k.lineTo(x + 17, y + 31); k.lineTo(x - 17, y + 31); k.closePath(); });
  stand(c, x, y);
  egP(c, 'rgba(255,236,170,0.28)', (k) => k.ellipse(x, y + 31, 15, 1.6, 0, 0, TAU));
}
function contactShadow(c, x, y, rx = 11) {
  egP(c, 'rgba(0,0,0,0.38)', (k) => k.ellipse(x + 1, y + 30.5, rx, 1.8, 0, 0, TAU));
}

// ------------------------------------------------------------------ side panel

// The tub's near side panel. The tub is cream with red stripes under a grey
// rim band, and carries two headlamps; the panel that came off brought one
// lamp with it, dead, and tore its bolts out — two empty holes along the rim.
function tornPanelPath(k) {
  k.moveTo(-12, -13); k.lineTo(8, -13); k.lineTo(12, -8.5); k.lineTo(8.5, -3.5); k.lineTo(14.5, 1); k.lineTo(10, 5.5); k.lineTo(13.5, 11);
  k.lineTo(-12, 11); k.arcTo(-16, 11, -16, 7, 4); k.lineTo(-16, -9); k.arcTo(-16, -13, -12, -13, 4); k.closePath();
}
function panelBody(c, { torn = false } = {}) {
  const path = (k) => (torn ? tornPanelPath(k) : rr(k, -16, -13, 32, 24, 4));
  const g = c.createLinearGradient(-16, -13, 8, 11);
  g.addColorStop(0, '#fbfbff'); g.addColorStop(1, '#d6d3e0');
  egP(c, g, path);
  c.save(); c.beginPath(); path(c); c.clip();
  for (const sx of [-3, 7]) {
    c.fillStyle = EG_RED; c.fillRect(sx, -13, 6, 24);
    c.fillStyle = 'rgba(26,16,40,0.18)'; c.fillRect(sx + 4.2, -13, 1.8, 24);
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(sx + 0.6, -13, 1.2, 24);
  }
  // the rim band along the top, with a seam under it
  c.fillStyle = '#cfcdda'; c.fillRect(-16, -13, 32, 3.4);
  c.fillStyle = 'rgba(26,16,40,0.3)'; c.fillRect(-16, -9.6, 32, 0.8);
  // the dent, a hollow with a lit lip on its far side
  const d = c.createRadialGradient(9.5, -3.5, 0.5, 9.5, -3.5, 6);
  d.addColorStop(0, 'rgba(26,16,40,0.36)'); d.addColorStop(0.7, 'rgba(26,16,40,0.12)'); d.addColorStop(1, 'rgba(26,16,40,0)');
  egP(c, d, (k) => k.ellipse(9.5, -3.5, 6.2, 3.8, 0.5, 0, TAU));
  egLine(c, 'rgba(255,255,255,0.6)', 0.8, (k) => k.ellipse(9.5, -3.5, 5.2, 3, 0.5, Math.PI * 0.95, Math.PI * 1.75));
  // scuffs down the lower left
  egLine(c, 'rgba(26,16,40,0.28)', 0.6, (k) => { k.moveTo(-14, 7.5); k.lineTo(-8, 10); k.moveTo(-13, 9.5); k.lineTo(-10.5, 10.7); });
  if (torn) {
    // scorch back from the tear
    const s = c.createLinearGradient(15, 0, 3, 0);
    s.addColorStop(0, 'rgba(20,12,16,0.75)'); s.addColorStop(1, 'rgba(20,12,16,0)');
    c.fillStyle = s; c.fillRect(3, -13, 13, 24);
  }
  c.restore();
  egLine(c, EG_LINE, 1, path);
  // the empty bolt holes along the rim
  for (const bx of [-12.5, 12]) {
    egDot(c, '#2a2030', bx, -11.3, 1.5);
    egLine(c, 'rgba(255,255,255,0.55)', 0.5, (k) => k.arc(bx, -11.3, 1.9, Math.PI * 1.1, Math.PI * 1.9));
  }
  // the dead headlamp — small and low in the corner, where it was on the
  // tub's hull; a big central one read as a camera lens
  egDot(c, '#5a4c58', -10.5, 6.5, 2.5, EG_LINE, 0.6);
  egDot(c, '#2e2632', -10.5, 6.5, 1.6);
  egDot(c, 'rgba(255,255,255,0.4)', -11.2, 5.7, 0.6);
}
// The wire that still hangs off it, with its connector.
function panelWire(c, x0, y0, long = false) {
  const path = (k) => { k.moveTo(x0, y0); k.quadraticCurveTo(x0 - 6, y0 + 5, x0 - 3.5, y0 + (long ? 13 : 9)); };
  egLine(c, INK, 2, path);
  egLine(c, '#3c8be0', 1.1, path);
  egP(c, '#c9c9d6', (k) => rr(k, x0 - 4.9, y0 + (long ? 12.5 : 8.5), 2.8, 3, 0.6), INK, 0.5);
}
// Drawn at 0.92 so the tilted corner clears the case's gold border; `s`
// shrinks it further for the bell jar, whose glass is narrower than the case.
function panelAt(c, x, y, tilt, o, s = 0.92) {
  c.save(); c.translate(x + 1, y + 17.5); c.rotate(tilt); c.scale(s, s);
  panelBody(c, o);
  c.restore();
}
const PANEL = {
  inked(c, x, y) { stand(c, x, y); panelAt(c, x, y, -0.16); panelWire(c, x - 13.5, y + 22); },
  bracket(c, x, y) { bracket(c, x, y, { spread: 11, holdY: 24 }); panelAt(c, x, y - 1, -0.05); panelWire(c, x - 13.5, y + 20); },
  jar(c, x, y) { jarBase(c, x, y); panelAt(c, x, y - 1.5, -0.12, {}, 0.8); panelWire(c, x - 11.5, y + 19); jarDome(c, x, y); },
  wrecked(c, x, y) {
    stand(c, x, y);
    panelAt(c, x, y, -0.22, { torn: true });
    panelWire(c, x - 14, y + 21, true);
    // the sheared bolts, lying where they fell
    for (const [bx, by] of [[x + 9, y + 28.8], [x + 13.5, y + 29.2]]) egDot(c, '#8a8a98', bx, by, 1.2, INK, 0.5);
  },
  spotlit(c, x, y) { spotlight(c, x, y); contactShadow(c, x, y, 14); panelAt(c, x, y, -0.16); panelWire(c, x - 13.5, y + 22); },
};

// ------------------------------------------------------------------ rotor

// The copter's two blades and the mast, bent. Blades are tapered slabs with a
// lit top face, not lines; the mast ends in the flange that bolted it to the
// tub, so it reads as a part off a machine rather than a line drawing.
function bladeSlab(c, pts, w = 3.6) {
  const path = (k) => { k.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) k.lineTo(p[0], p[1]); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  egLine(c, INK, w + 1.4, path);
  egLine(c, DARK, w, path);
  egLine(c, STEEL, w * 0.32, path);
}
function mastFlange(c, x, y, top, bottom) {
  egLine(c, INK, 3.6, (k) => { k.moveTo(x, top); k.lineTo(x, bottom); });
  egLine(c, DARK, 2.4, (k) => { k.moveTo(x, top); k.lineTo(x, bottom); });
  egLine(c, STEEL, 0.7, (k) => { k.moveTo(x - 0.5, top + 1); k.lineTo(x - 0.5, bottom - 1); });
  egP(c, DARK, (k) => rr(k, x - 7, bottom - 2.5, 14, 3, 1), INK, 0.7);
  for (const bx of [-4.5, 4.5]) egDot(c, STEEL_LIT, x + bx, bottom - 1, 0.9);
}
function rotorHub(c, x, y) {
  egDot(c, DARK, x, y, 3.4, INK, 0.7);
  egDot(c, STEEL, x, y, 2.2);
  egDot(c, STEEL_LIT, x - 0.7, y - 0.7, 0.8);
}
function rotorAt(c, x, y, { wrecked = false } = {}) {
  const hy = y + 14;
  mastFlange(c, x, y, hy, y + 30);
  if (!wrecked) {
    bladeSlab(c, [[x - 18, hy - 2.4], [x, hy]]);
    bladeSlab(c, [[x, hy], [x + 10.5, hy + 1], [x + 16, hy + 7.5]]);
    // the crease at the bend
    egLine(c, STEEL_LIT, 0.7, (k) => { k.moveTo(x + 9.5, hy - 1.2); k.lineTo(x + 12, hy + 3); });
  } else {
    // far blade snapped short with a ragged end; near blade folded straight
    // down to the stand; the snapped length lying beside it
    bladeSlab(c, [[x - 9, hy - 1.4], [x, hy]]);
    egLine(c, STEEL_LIT, 0.8, (k) => { k.moveTo(x - 9.5, hy - 3.6); k.lineTo(x - 8, hy - 0.5); k.lineTo(x - 10.5, hy + 0.8); });
    bladeSlab(c, [[x, hy], [x + 8, hy + 1.5], [x + 11, hy + 9], [x + 11.5, hy + 15.5]]);
    bladeSlab(c, [[x - 17, y + 29.2], [x - 6.5, y + 28.6]], 3);
    // soot on the hub
    egP(c, 'rgba(20,12,16,0.5)', (k) => k.ellipse(x + 1, hy + 1, 5.5, 3.5, 0.3, 0, TAU));
  }
  rotorHub(c, x, hy);
}
const ROTOR = {
  inked(c, x, y) { stand(c, x, y); rotorAt(c, x, y); },
  bracket(c, x, y) { bracket(c, x, y, { spread: 6, holdY: 23 }); rotorAt(c, x, y - 1); },
  jar(c, x, y) { jarBase(c, x, y); c.save(); c.translate(x, y + 30); c.scale(0.84, 0.84); rotorAt(c, 0, -30 - 1.5); c.restore(); jarDome(c, x, y); },
  wrecked(c, x, y) { stand(c, x, y); rotorAt(c, x, y, { wrecked: true }); },
  spotlit(c, x, y) { spotlight(c, x, y); contactShadow(c, x, y, 9); rotorAt(c, x, y); },
};

// ------------------------------------------------------------------ spent core

// BACKUP POWER's core, cold. The machine's cradle under it keeps the
// cabinets' red edge and bolts; the sphere is ash and clinker with the last
// of the ember showing in the crack; the smoke is the only thing still moving.
function cradle(c, x, y, { bent = false } = {}) {
  const cy = y + 17;
  egP(c, '#2b2433', (k) => rr(k, x - 14, cy + 2, 28, 11, 2), INK, 0.7);
  c.fillStyle = '#1d1824'; c.fillRect(x - 10, cy + 5, 20, 1.4); c.fillRect(x - 10, cy + 8.5, 20, 1.4);
  for (const s of [-1, 1]) {
    const px = x + s * 12;
    egP(c, '#c8332c', (k) => rr(k, px - 1.3, cy - 1 + (bent && s > 0 ? 3 : 0), 2.6, 12, 0.6), INK, 0.5);
    egDot(c, '#6b6275', px, cy + 11, 1.1);
  }
  // the cup the sphere sits in
  egP(c, '#1a1420', (k) => k.ellipse(x, cy + 3, 10.5, 2.6, 0, 0, Math.PI));
}
function coreSphere(c, x, cy, r, { split = false } = {}) {
  const sphere = (k, dx = 0) => k.arc(x + dx, cy, r, 0, TAU);
  const paint = (dx) => {
    const g = c.createRadialGradient(x + dx - r * 0.35, cy - r * 0.4, r * 0.1, x + dx, cy, r);
    g.addColorStop(0, '#a88a72'); g.addColorStop(0.5, '#6a4632'); g.addColorStop(1, '#2a1a16');
    egP(c, g, (k) => sphere(k, dx), INK, 0.8);
    // clinker: a few dark pits
    for (const [px, py, pr] of [[-0.3, 0.45, 0.16], [0.45, 0.1, 0.12], [0.1, -0.55, 0.1], [-0.55, -0.1, 0.09]]) {
      egDot(c, 'rgba(20,12,16,0.5)', x + dx + px * r, cy + py * r, pr * r);
    }
  };
  if (!split) {
    paint(0);
    // the crack, ember in it
    // irregular, with side branches, and only a dull ember showing in it — a
    // clean zigzag in bright orange read as a lightning-bolt logo
    const crack = (k) => {
      k.moveTo(x - 3, cy - r + 1); k.lineTo(x - 0.5, cy - 5); k.lineTo(x + 2.5, cy - 3); k.lineTo(x + 0.5, cy + 1); k.lineTo(x + 3.5, cy + 4.5); k.lineTo(x + 2, cy + r - 1.5);
      k.moveTo(x + 2.5, cy - 3); k.lineTo(x + 6, cy - 5.5);
      k.moveTo(x + 0.5, cy + 1); k.lineTo(x - 4, cy + 3);
    };
    egLine(c, 'rgba(255,140,50,0.42)', 1.7, crack);
    egLine(c, '#1a1210', 0.9, crack);
    return;
  }
  // split open: two halves parted, the hollow between them with the ember dying in it
  c.save(); c.beginPath(); c.rect(x - r - 2, cy - r - 2, r + 1, r * 2 + 4); c.clip(); paint(-1.6); c.restore();
  c.save(); c.beginPath(); c.rect(x + 1, cy - r - 2, r + 2, r * 2 + 4); c.clip(); paint(1.6); c.restore();
  const hollow = c.createLinearGradient(0, cy - r, 0, cy + r);
  hollow.addColorStop(0, '#1a1210'); hollow.addColorStop(0.6, '#5a2a12'); hollow.addColorStop(1, '#2a1410');
  egP(c, hollow, (k) => { k.moveTo(x - 1.4, cy - r + 1); k.lineTo(x + 2.4, cy - r + 1); k.lineTo(x + 1, cy - 3); k.lineTo(x + 3, cy + 2); k.lineTo(x + 2.5, cy + r - 1); k.lineTo(x - 1.6, cy + r - 1); k.lineTo(x - 0.5, cy + 1); k.lineTo(x - 2.5, cy - 4); k.closePath(); });
  egDot(c, 'rgba(255,160,60,0.7)', x + 0.6, cy + 1, 1.3);
  egDot(c, 'rgba(255,220,150,0.8)', x + 0.6, cy + 1, 0.6);
}
function smoke(c, x, top, t, n = 2, a = 0.42) {
  for (let i = 0; i < n; i++) {
    const ph = t * 0.9 + i * 2.1, dx = Math.sin(ph) * 1.5, lift = (t * 2.5 + i * 3) % 6;
    egLine(c, `rgba(200,196,210,${a * (1 - lift / 7)})`, 1.2 + i * 0.3, (k) => {
      k.moveTo(x + 3 + i * 2, top - lift * 0.4);
      k.bezierCurveTo(x + 7 + dx, top - 4 - lift, x - 1 + dx, top - 7 - lift, x + 4 + dx * 1.4, top - 11 - lift);
    });
  }
}
function coreAt(c, x, y, t, { split = false, bent = false } = {}) {
  cradle(c, x, y, { bent });
  const cy = y + 16, r = 10.5;
  coreSphere(c, x, cy, r, { split });
  smoke(c, x, cy - r, t, split ? 3 : 2, split ? 0.5 : 0.42);
}
const CORE = {
  inked(c, x, y, t) { stand(c, x, y); coreAt(c, x, y, t); },
  bracket(c, x, y, t) { bracket(c, x, y, { spread: 13, holdY: 25 }); coreAt(c, x, y - 1, t); },
  jar(c, x, y, t) { jarBase(c, x, y); c.save(); c.translate(x, y + 30); c.scale(0.84, 0.84); coreAt(c, 0, -30 - 1.5, t); c.restore(); jarDome(c, x, y); },
  wrecked(c, x, y, t) {
    stand(c, x, y);
    coreAt(c, x, y, t, { split: true, bent: true });
    // a chunk of shell on the stand
    egP(c, '#5a3a2a', (k) => { k.moveTo(x - 17, y + 30); k.lineTo(x - 14, y + 26.5); k.lineTo(x - 10.5, y + 30); k.closePath(); }, INK, 0.6);
  },
  spotlit(c, x, y, t) { spotlight(c, x, y); contactShadow(c, x, y, 12); coreAt(c, x, y, t); },
};

export const RELIC_CANDIDATES = [
  { letter: 'A', key: 'inked', name: 'INKED', note: 'the three subjects redrawn: Eggshell\'s ink line, cel light, bigger — the tub\'s dead headlamp and rim band on the panel, the mast flange on the rotor, the machine\'s red-edged cradle under the core' },
  { letter: 'B', key: 'bracket', name: 'BRACKET', note: 'A on a brass museum bracket, held from behind by two curled fingers, instead of the flat purple stand' },
  { letter: 'C', key: 'jar', name: 'BELL JAR', note: 'A under a glass dome on a turned wooden base — the archive keeps its evidence under glass' },
  { letter: 'D', key: 'wrecked', name: 'WRECKED', note: 'the damage turned up: the panel torn and scorched with its bolts on the stand, one blade snapped and the other folded, the core split open with the ember dying inside' },
  { letter: 'E', key: 'spotlit', name: 'SPOTLIT', note: 'A under a spotlight from the case top, with the pool of light on the stand and a cast shadow under the piece' },
];

// drawRelicCandidate(ctx, key, relic, x, y, t) — same origin contract as
// TrophyRoomState.drawBossRelic. `t` only moves the core's smoke.
export function drawRelicCandidate(c, key, relic, x, y, t = 0) {
  const set = relic === 'sidepanel' ? PANEL : relic === 'rotor' ? ROTOR : relic === 'core' ? CORE : null;
  if (!set || !set[key]) return false;
  c.save();
  set[key](c, x, y, t);
  c.restore();
  return true;
}
