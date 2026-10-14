// SPACE CABINET — refined Martians (lab only). Peter, 14 Oct 2026: "can you
// also give me some refined martians - in particular the standing one? don't
// they wear robes? Also does the one in the spaceship wear a helmet inside the
// spaceship? Perhaps remove for a clearer view since we draw the dome … see if
// you can do the martian lady from the movie too".
//
// In Mars Attacks! the troopers wear fitted suits with big stand-up collars,
// and the ones in charge go about in flowing robes and capes; everyone wears
// the bubble helmet outdoors. The Martian Girl is the disguise: a towering
// beehive, a pale face, big lined eyes, red lips, a skin-tight dress printed
// with black-and-white spirals, a stiff gliding walk — and gum.
//
// Every figure here stands about 26 tall at sc 1 with its feet at (x, y), like
// martianStanding, so any of them drops into loneMartian unchanged.

import { martianHead } from './mars-attacks-candidates.js';

const TAU = Math.PI * 2;
function poly(c, pts, fill) {
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath(); c.fillStyle = fill; c.fill();
}
function glow(c, x, y, r, rgb, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
const SILVER = ['#f6f8fb', '#d6dbe3', '#a9b1bd', '#7c8592', '#4f5763'];
const SUIT = ['#7ee0c8', '#3fb5a0', '#227866', '#134a40'];
const ROBE = ['#c46ad8', '#9840b4', '#6a2486', '#42125a'];      // royal magenta
const CAPE = ['#ff5a4a', '#d8302a', '#9a1a1a', '#5a0e10'];
const GOLD = ['#fff0b0', '#f0c050', '#b88a2a'];
const WHITE = ['#ffffff', '#e4e8f2', '#b8bfd0', '#848ca2'];

// The ray gun on a raised arm (shoulder at the origin), as martianStanding's.
function gunArm(c, sleeve, aim, firing, p, bell = false) {
  c.save(); c.rotate(aim);
  if (bell) poly(c, [[0, -1], [3.2, -1.6], [3.6, 1.6], [0, 1]], sleeve);
  else {
    // a round-ended sleeve, so the shoulder end is a joint rather than a cut
    c.beginPath(); c.moveTo(0, 0.05); c.lineTo(4.2, 0.05);
    c.lineCap = 'round'; c.strokeStyle = sleeve; c.lineWidth = 1.3; c.stroke();
  }
  c.fillStyle = SILVER[1]; c.fillRect(3.8, -1.2, 3.8, 1.6);
  c.fillStyle = SILVER[3]; c.fillRect(3.8, 0.1, 3.8, 0.4);
  for (const rx of [4.6, 5.6, 6.6]) { c.fillStyle = '#d4553e'; c.fillRect(rx, -1.5, 0.35, 2.2); }
  c.beginPath(); c.arc(8, -0.4, 0.8, 0, TAU); c.fillStyle = firing ? '#eaffd8' : '#7fe07f'; c.fill();
  if (firing) {
    glow(c, 8.6, -0.4, 4 + p * 4, '150,255,120', 0.8 * (1 - p));
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.ellipse(9 + p * 26 + i * 4, -0.4, 0.8, 2 - i * 0.4, 0, 0, TAU);
      c.strokeStyle = `rgba(170,255,140,${0.9 * (1 - p)})`; c.lineWidth = 0.5; c.stroke();
    }
  }
  c.restore();
}
const shotOf = (t, fire, shooting) => {
  const shot = shooting != null ? shooting * 0.5 : fire ? ((t % 3.4) + 3.4) % 3.4 : 9;
  return { firing: shot < 0.5, p: shot / 0.5 };
};
// The stand-up collar: a fan of stiff blades rising from the shoulders behind
// the helmet, out past its glass so it reads as a silhouette. `r` is in the
// figure's units; the helmet is about 7 across at headSc 0.82.
function collarFan(c, y, ink, n = 7, r = 11) {
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (1.04 + i * 0.92 / (n - 1)), w = 0.2;
    const base = (ang) => [Math.cos(ang) * 3.2, y + Math.sin(ang) * 1.2];
    poly(c, [base(a - w), [Math.cos(a - w * 0.35) * r, y + Math.sin(a - w * 0.35) * r], [Math.cos(a + w * 0.35) * r, y + Math.sin(a + w * 0.35) * r], base(a + w)],
      ink[i % 2 ? 1 : 0]);
  }
}

// B — the robed Martian: a floor-length magenta robe flaring to a gold-banded
// hem, a gold stripe down the front, a wide bell sleeve on the gun arm, and a
// tall silver collar fanning up behind the helmet.
export function martianRobed(c, x, y, sc, t, { fire = true, face = 1, aim: aimAt = null, shooting = null, headSc = 0.82 } = {}) {
  c.save(); c.translate(x, y); c.scale(sc * face, sc);
  const { firing, p } = shotOf(t, fire, shooting);
  const sway = Math.sin(t * 1.4) * 0.35;
  collarFan(c, -15.4, [SILVER[1], SILVER[3]], 7, 11.5);
  // The robe: shoulders to a flared hem, lit from the left, a fold down the middle.
  poly(c, [[-3.6, -15.6], [3.6, -15.6], [5.6 + sway, -0.4], [-5.6 + sway, -0.4]], ROBE[1]);
  poly(c, [[-3.6, -15.6], [-0.6, -15.6], [-1.4 + sway, -0.4], [-5.6 + sway, -0.4]], ROBE[0]);
  poly(c, [[1.6, -15], [3.6, -15.6], [5.6 + sway, -0.4], [3 + sway, -0.4]], ROBE[2]);
  poly(c, [[-0.5, -15.6], [0.5, -15.6], [0.9 + sway, -0.4], [-0.9 + sway, -0.4]], GOLD[1]);
  poly(c, [[-5.6 + sway, -1.6], [5.6 + sway, -1.6], [5.7 + sway, -0.4], [-5.7 + sway, -0.4]], GOLD[2]);
  c.fillStyle = GOLD[0]; c.fillRect(-5.6 + sway, -1.7, 11.2, 0.3);
  // Toes of the silver boots under the hem.
  poly(c, [[-2.6, -0.5], [-0.6, -0.5], [-0.4, 0], [-3, 0]], SILVER[3]);
  poly(c, [[0.8, -0.5], [2.8, -0.5], [3.2, 0], [0.8, 0]], SILVER[4]);
  // The far arm in its bell sleeve, a skinny green hand.
  poly(c, [[-3.6, -15], [-2.6, -15.2], [-3, -10.6], [-5, -10]], ROBE[2]);
  c.fillStyle = '#a9d68a'; c.fillRect(-4.6, -10.2, 0.8, 1.2);
  // A gold sash across.
  poly(c, [[-3.4, -13.6], [-2.8, -14.6], [3.4, -9.6], [2.8, -8.6]], GOLD[2]);
  const aim = aimAt != null ? aimAt : firing ? -0.15 : -0.05 + Math.sin(t * 1.3) * 0.08;
  c.save(); c.translate(2.8, -14.2); gunArm(c, ROBE[1], aim, firing, p, true); c.restore();
  martianHead(c, 0, -15.4, headSc, t, { talk: Math.max(0, Math.sin(t * 7)) * (firing ? 1 : 0.4), look: Math.sin(t * 0.8) });
  c.restore();
}

// C — the caped commander: the trooper's fitted suit (slimmer, longer legs),
// a scarlet cape from the shoulders to the ankles that lifts and settles in
// the wind, and the scarlet collar fan.
export function martianCaped(c, x, y, sc, t, { fire = true, face = 1, aim: aimAt = null, shooting = null } = {}) {
  c.save(); c.translate(x, y); c.scale(sc * face, sc);
  const { firing, p } = shotOf(t, fire, shooting);
  const lift = Math.sin(t * 1.8) * 0.9 + Math.sin(t * 3.1) * 0.4;
  // Cape behind: hangs from both shoulders, its back edge billowing.
  poly(c, [[-3.4, -15.8], [3, -15.8], [2.6, -1.2], [-6.6 - lift, -0.6], [-7.2 - lift * 1.4, -6], [-5 - lift, -12]], CAPE[2]);
  poly(c, [[-3.4, -15.8], [-1.4, -15.8], [-4.2 - lift * 0.6, -0.8], [-6.6 - lift, -0.6], [-7.2 - lift * 1.4, -6], [-5 - lift, -12]], CAPE[1]);
  poly(c, [[-6.6 - lift, -0.6], [-4.2 - lift * 0.6, -0.8], [-5.2 - lift * 0.8, -2.4]], CAPE[3]);
  collarFan(c, -15.4, [CAPE[1], CAPE[2]], 7, 11);
  // Legs and boots.
  poly(c, [[-2, -8], [-0.5, -8], [-0.7, -1.2], [-2, -1.2]], SUIT[2]);
  poly(c, [[0.5, -8], [2, -8], [2, -1.2], [0.7, -1.2]], SUIT[3]);
  poly(c, [[-2.4, -1.4], [-0.4, -1.4], [-0.2, 0], [-2.6, 0]], SILVER[3]);
  poly(c, [[0.6, -1.4], [2.6, -1.4], [3, 0], [0.6, 0]], SILVER[4]);
  // Body: suit, chest V, belt with a buckle, silver shoulder discs.
  poly(c, [[-3, -15.6], [3, -15.6], [2.4, -8], [-2.4, -8]], SUIT[1]);
  poly(c, [[-3, -15.6], [0, -15.6], [0, -8], [-2.4, -8]], SUIT[0]);
  poly(c, [[-1.6, -15.6], [0, -12.4], [1.6, -15.6]], SUIT[3]);
  c.fillStyle = SILVER[3]; c.fillRect(-2.5, -9, 5, 1);
  c.fillStyle = '#f0b23c'; c.fillRect(-0.6, -9.1, 1.2, 1.2);
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 3, -15.2, 1.3, 0.8, 0, 0, TAU); c.fillStyle = SILVER[sx < 0 ? 1 : 2]; c.fill(); }
  poly(c, [[-3.4, -15], [-2.5, -15.2], [-2.7, -10.4], [-3.6, -10.6]], SUIT[2]);
  const aim = aimAt != null ? aimAt : firing ? -0.15 : -0.05 + Math.sin(t * 1.3) * 0.08;
  c.save(); c.translate(2.6, -14.2); gunArm(c, SUIT[1], aim, firing, p); c.restore();
  martianHead(c, 0, -15.4, 0.86, t, { talk: Math.max(0, Math.sin(t * 7)) * (firing ? 1 : 0.4), look: Math.sin(t * 0.8) });
  c.restore();
}

// D — the high priest: an ivory robe with gold bands, the collar a tall silver
// fan, a bigger brain (headSc 0.95) on a narrower body — the film's
// proportions, where the head is most of the Martian.
export function martianPriest(c, x, y, sc, t, opts = {}) {
  c.save(); c.translate(x, y); c.scale(sc * (opts.face ?? 1), sc);
  const { firing, p } = shotOf(t, opts.fire ?? true, opts.shooting ?? null);
  const sway = Math.sin(t * 1.2) * 0.3;
  collarFan(c, -14.6, [SILVER[0], SILVER[2]], 9, 13);
  poly(c, [[-3, -14.8], [3, -14.8], [4.8 + sway, -0.4], [-4.8 + sway, -0.4]], WHITE[1]);
  poly(c, [[-3, -14.8], [-0.4, -14.8], [-1 + sway, -0.4], [-4.8 + sway, -0.4]], WHITE[0]);
  poly(c, [[1.4, -14.4], [3, -14.8], [4.8 + sway, -0.4], [2.6 + sway, -0.4]], WHITE[2]);
  for (const by of [-1.4, -4]) {
    poly(c, [[-4.8 + sway * 0.9, by - 0.7], [4.8 + sway * 0.9, by - 0.7], [4.85 + sway, by + 0.1], [-4.85 + sway, by + 0.1]], GOLD[1]);
  }
  poly(c, [[-0.4, -14.8], [0.4, -14.8], [0.6 + sway, -4.6], [-0.6 + sway, -4.6]], GOLD[2]);
  poly(c, [[-2.6, -0.5], [-0.6, -0.5], [-0.4, 0], [-3, 0]], SILVER[3]);
  poly(c, [[0.8, -0.5], [2.8, -0.5], [3.2, 0], [0.8, 0]], SILVER[4]);
  poly(c, [[-3, -14.2], [-2.2, -14.4], [-2.6, -10], [-4.4, -9.6]], WHITE[2]);
  c.fillStyle = '#a9d68a'; c.fillRect(-4, -9.8, 0.7, 1.1);
  const aim = opts.aim ?? (firing ? -0.15 : -0.05 + Math.sin(t * 1.3) * 0.08);
  c.save(); c.translate(2.4, -13.4); gunArm(c, WHITE[1], aim, firing, p, true); c.restore();
  martianHead(c, 0, -14.6, 0.95, t, { talk: Math.max(0, Math.sin(t * 7)) * (firing ? 1 : 0.4), look: Math.sin(t * 0.8) });
  c.restore();
}

// ------------------------------------------------------------ the Martian Girl
// About 32 tall to the top of the hair. `walk` 0..1 sets how much she glides
// (a stiff hip sway, head steady); every few seconds a pink gum bubble swells
// and pops.
const SKIN_PALE = ['#fbf4f8', '#ecdde8', '#cdb8cc', '#9e86a0'];
const DRESS = ['#ff4a5a', '#d82638', '#981424', '#5a0a14'];
export function martianLady(c, x, y, sc, t, { walk = 1, face = 1, gum = true } = {}) {
  c.save(); c.translate(x, y); c.scale(sc * face, sc);
  const hip = Math.sin(t * 2.6) * 0.6 * walk, bob = Math.abs(Math.cos(t * 2.6)) * 0.25 * walk;
  c.translate(0, -bob);
  // Heels.
  poly(c, [[-1.3, -0.9], [-0.2, -0.9], [-0.1, 0], [-1.5, 0]], '#1a0a10');
  poly(c, [[0.3, -0.9], [1.4, -0.9], [1.6, 0], [0.3, 0]], '#2a1018');
  // The dress: tight from bust to ankles, a fishtail flick at the hem.
  const dress = [[-2.2, -17.4], [2.2, -17.4], [2.9, -15.4], [2.1, -13], [3.1 + hip, -10], [2.2 + hip * 0.6, -4], [1.4 + hip * 0.3, -1.4],
    [2.4, -0.8], [-2.4, -0.8], [-1.4 + hip * 0.3, -1.4], [-2.2 + hip * 0.6, -4], [-3.1 + hip, -10], [-2.1, -13], [-2.9, -15.4]];
  poly(c, dress, DRESS[1]);
  c.save(); c.beginPath(); c.moveTo(dress[0][0], dress[0][1]); for (const q of dress.slice(1)) c.lineTo(q[0], q[1]); c.closePath(); c.clip();
  poly(c, [[-3.4, -17.4], [-0.3, -17.4], [-0.6, -0.8], [-3.4, -0.8]], DRESS[0]);
  poly(c, [[1.4, -17.4], [3.4, -17.4], [3.4, -0.8], [0.9, -0.8]], DRESS[2]);
  // The black-and-white spirals: one on the hip, one on the bust, one low —
  // a white disc with a black line wound into it, slowly turning.
  for (const [sx, sy, r, turn] of [[-0.6 + hip * 0.8, -10, 2.7, 1], [0.8, -15.4, 1.9, -1], [0.4 + hip * 0.4, -4.4, 2, 1]]) {
    c.beginPath(); c.arc(sx, sy, r, 0, TAU); c.fillStyle = '#f4f2f6'; c.fill();
    c.beginPath();
    for (let k = 0; k <= 48; k++) { const u = k / 48, a = turn * (u * TAU * 2.6 + t * 0.8); c.lineTo(sx + Math.cos(a) * r * u, sy + Math.sin(a) * r * u); }
    c.strokeStyle = '#0c0a10'; c.lineWidth = r * 0.24; c.lineCap = 'round'; c.stroke();
  }
  c.restore();
  // Long thin arms, hanging, the near one swinging with the hip.
  poly(c, [[-2.6, -16.8], [-2, -16.6], [-2.8 - hip * 0.4, -9.4], [-3.4 - hip * 0.4, -9.6]], SKIN_PALE[2]);
  poly(c, [[2.2, -16.6], [2.8, -16.8], [3.6 + hip * 0.5, -9.6], [3 + hip * 0.5, -9.4]], SKIN_PALE[1]);
  // Shoulders, long neck.
  poly(c, [[-2.4, -17.6], [2.4, -17.6], [2.2, -17], [-2.2, -17]], SKIN_PALE[1]);
  poly(c, [[-0.55, -19.4], [0.55, -19.4], [0.6, -17.4], [-0.6, -17.4]], SKIN_PALE[1]);
  // Face: a small pale oval, the near cheek in light.
  c.beginPath(); c.ellipse(0, -21.2, 1.75, 2.15, 0, 0, TAU); c.fillStyle = SKIN_PALE[1]; c.fill();
  c.beginPath(); c.ellipse(-0.45, -21.5, 1.1, 1.6, 0, 0, TAU); c.fillStyle = SKIN_PALE[0]; c.fill();
  // Big lined eyes with lashes flicking out, high thin brows.
  for (const sx of [-1, 1]) {
    c.beginPath(); c.ellipse(sx * 0.78, -21.7, 0.62, 0.42, sx * 0.18, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
    c.strokeStyle = '#0c0a10'; c.lineWidth = 0.22; c.stroke();
    c.beginPath(); c.arc(sx * 0.78 + Math.sin(t * 0.7) * 0.12, -21.7, 0.24, 0, TAU); c.fillStyle = '#121018'; c.fill();
    c.beginPath(); c.moveTo(sx * 1.3, -21.85); c.lineTo(sx * 1.75, -22.3); c.strokeStyle = '#0c0a10'; c.lineWidth = 0.2; c.stroke();
    c.beginPath(); c.moveTo(sx * 0.3, -22.6); c.quadraticCurveTo(sx * 0.9, -23.3, sx * 1.4, -22.7); c.lineWidth = 0.14; c.stroke();
  }
  // Red lips, a little pursed.
  c.beginPath(); c.ellipse(0, -20.05, 0.6, 0.28, 0, 0, TAU); c.fillStyle = '#d8203a'; c.fill();
  c.fillStyle = '#8a1024'; c.fillRect(-0.5, -20.08, 1, 0.08);
  // Gum: swells over two seconds of every seven, then pops.
  if (gum) {
    const g = ((t % 7) + 7) % 7;
    if (g > 4.6 && g < 6.6) {
      const r = (g - 4.6) / 2 * 1.9;
      c.beginPath(); c.arc(0.1, -20.05 + 0.1, r, 0, TAU); c.fillStyle = 'rgba(255,140,200,0.85)'; c.fill();
      c.beginPath(); c.arc(-r * 0.3, -20.05 - r * 0.35, r * 0.25, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
    }
  }
  // The beehive: a tall black tower of hair with a white swirl wound up it.
  const hive = [[-1.9, -22], [-2.1, -24.2], [-1.9, -28.4], [-1.2, -31.2], [0, -32.2], [1.2, -31.2], [1.9, -28.4], [2.1, -24.2], [1.9, -22], [1.2, -23.2], [-1.2, -23.2]];
  poly(c, hive, '#16121c');
  // A cool rim of light so black hair reads against a dark sky.
  c.beginPath(); c.moveTo(hive[0][0], hive[0][1]); for (const q of hive.slice(1, 9)) c.lineTo(q[0], q[1]);
  c.strokeStyle = 'rgba(190,200,235,0.75)'; c.lineWidth = 0.35; c.stroke();
  c.save();
  c.beginPath(); c.moveTo(-1.9, -22); c.lineTo(-2.1, -24.2); c.lineTo(-1.9, -28.4); c.lineTo(-1.2, -31.2); c.lineTo(0, -32.2); c.lineTo(1.2, -31.2); c.lineTo(1.9, -28.4); c.lineTo(2.1, -24.2); c.lineTo(1.9, -22); c.closePath(); c.clip();
  c.strokeStyle = '#f4f6fb'; c.lineWidth = 0.75;
  c.beginPath();
  for (let k = 0; k <= 60; k++) { const u = k / 60, yy = -22.6 - u * 9.6, w = 2.2 * (1 - u * 0.55); c.lineTo(Math.sin(u * TAU * 2.2) * w, yy); }
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(-1.6, -31, 0.6, 8);
  c.restore();
  c.restore();
}

// ------------------------------------------------------- the suited trooper
// Peter, 14 Oct: "improve the regular suited Martian. The suit is not great.
// Also is the colour ideal since our background is already green? Give some
// variants." The teal suit sank into the jade sky. A better-cut suit — a
// tapered torso with shoulder pads and a lit chest plate, a chunky belt with
// the round buckle, gloves and flared boots, knee pads, and a plain head in a
// plain helmet (no collar points, no fan) — in colours that sit off the jade: the film's warm reds, chrome,
// violet, tangerine. `pal` = { suit: [lit, mid, shade, deep], trim: [hi, mid, lo],
// glove, boot: [lit, shade] }.
export const SUIT_PALETTES = {
  crimson: { name: 'Crimson and gold', suit: ['#ff6a5c', '#d8343a', '#9a1c28', '#5e0e18'], trim: ['#fff0b0', '#f0c050', '#a87a22'], glove: '#e8eef4', boot: ['#d6dbe3', '#7c8592'] },
  chrome: { name: 'Chrome and red', suit: ['#ffffff', '#d4dae4', '#9aa4b4', '#5e6878'], trim: ['#ff8a7a', '#e03a36', '#9a1c22'], glove: '#e03a36', boot: ['#e03a36', '#8a1c22'] },
  violet: { name: 'Violet and gold', suit: ['#c48cff', '#8a4ae0', '#5a26a6', '#36126a'], trim: ['#fff0b0', '#f0c050', '#a87a22'], glove: '#f0c050', boot: ['#d6dbe3', '#7c8592'] },
  tangerine: { name: 'Tangerine and white', suit: ['#ffb070', '#ff7a26', '#c4501a', '#7a2c0e'], trim: ['#ffffff', '#e4e8f2', '#9aa2b4'], glove: '#ffffff', boot: ['#ffffff', '#9aa2b4'] },
  black: { name: 'Black and silver', suit: ['#5a5f70', '#33374a', '#1c1f2c', '#0c0e16'], trim: ['#ffffff', '#c8d0dc', '#7c8592'], glove: '#c8d0dc', boot: ['#c8d0dc', '#5e6672'] },
};
// `wave`: the far arm up and waving (level 3's lone Martian, after he has shot the
// craft down — Peter, 14 Oct: "wave after shooting with the arm not holding the weapon").
export function martianSuited(c, x, y, sc, t, { pal = SUIT_PALETTES.crimson, fire = true, face = 1, aim: aimAt = null, shooting = null, wave = false } = {}) {
  const S = pal.suit, T = pal.trim;
  c.save(); c.translate(x, y); c.scale(sc * face, sc);
  const { firing, p } = shotOf(t, fire, shooting);
  const step = Math.sin(t * 2.2) * 0.25;
  // Legs: thin, the far one a shade darker; knee pads; flared boots.
  poly(c, [[-2.1, -8.2], [-0.5, -8.2], [-0.7 + step, -2], [-2 + step, -2]], S[2]);
  poly(c, [[0.5, -8.2], [2.1, -8.2], [2 - step, -2], [0.7 - step, -2]], S[1]);
  poly(c, [[-0.6, -8.2], [0.6, -8.2], [0.5, -6.6], [-0.5, -6.6]], S[3]);
  c.fillStyle = T[2]; c.fillRect(-2 + step * 0.6, -5.2, 1.4, 0.9);
  c.fillStyle = T[1]; c.fillRect(0.7 - step * 0.6, -5.2, 1.4, 0.9);
  poly(c, [[-2.4 + step, -2.2], [-0.4 + step, -2.2], [-0.1 + step, 0], [-3 + step, 0]], pal.boot[1]);
  poly(c, [[0.4 - step, -2.2], [2.4 - step, -2.2], [3.1 - step, 0], [0.4 - step, 0]], pal.boot[0]);
  // Torso: tapers from the shoulder pads to the waist; lit left, shaded right.
  poly(c, [[-3.8, -15.4], [3.8, -15.4], [3.2, -13.4], [2.2, -8.4], [-2.2, -8.4], [-3.2, -13.4]], S[1]);
  poly(c, [[-3.8, -15.4], [0, -15.4], [0, -8.4], [-2.2, -8.4], [-3.2, -13.4]], S[0]);
  poly(c, [[2, -14.6], [3.8, -15.4], [3.2, -13.4], [2.2, -8.4], [1.4, -8.4]], S[2]);
  // Chest plate: a trim-coloured yoke with a lit facet, and a seam to the belt.
  poly(c, [[-2.8, -15.4], [2.8, -15.4], [1.6, -12.8], [0, -12.2], [-1.6, -12.8]], T[1]);
  poly(c, [[-2.8, -15.4], [0, -15.4], [0, -12.2], [-1.6, -12.8]], T[0]);
  c.fillStyle = S[3]; c.fillRect(-0.15, -12.2, 0.3, 3.4);
  // Belt with the round buckle.
  c.fillStyle = S[3]; c.fillRect(-2.4, -9.4, 4.8, 1.2);
  c.beginPath(); c.arc(0, -8.8, 0.95, 0, TAU); c.fillStyle = T[1]; c.fill();
  c.beginPath(); c.arc(-0.2, -9, 0.4, 0, TAU); c.fillStyle = T[0]; c.fill();
  if (wave) {
    // The far arm up: upper arm out and up from the shoulder, the forearm swinging
    // side to side over the elbow, the glove open.
    const ex = -8.2, ey = -16.2, a = -Math.PI / 2 - 0.25 + Math.sin(t * 9) * 0.5;   // clear of the helmet
    const hx = ex + Math.cos(a) * 3.6, hy = ey + Math.sin(a) * 3.6;
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = S[2]; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-3.4, -14.9); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
    c.beginPath(); c.arc(hx, hy, 0.8, 0, TAU); c.fillStyle = pal.glove; c.fill();
  } else {
    // The far arm, bent, with its glove: one round-jointed stroke from inside the
    // shoulder pad, so shoulder, elbow and wrist are joints (Peter, 14 Oct: "they
    // dont join well on his shoulder").
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = S[2]; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(-3.5, -14.8); c.lineTo(-4.5, -11.8); c.lineTo(-3.9, -9.6); c.stroke();
    c.beginPath(); c.arc(-3.9, -9.3, 0.6, 0, TAU); c.fillStyle = pal.glove; c.fill();
  }
  // The gun arm, with a glove at the grip.
  const aim = aimAt != null ? aimAt : firing ? -0.15 : -0.05 + Math.sin(t * 1.3) * 0.08;
  c.save(); c.translate(2.9, -14.2); gunArm(c, S[1], aim, firing, p);
  c.save(); c.rotate(aim); c.beginPath(); c.arc(4.1, 0.1, 0.65, 0, TAU); c.fillStyle = pal.glove; c.fill(); c.restore();
  c.restore();
  // Shoulder pads, over both arms' roots: the cap that joins arm to body.
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 3.4, -14.9, 1.45, 1.05, sx * 0.3, 0, TAU); c.fillStyle = sx < 0 ? T[0] : T[1]; c.fill(); }
  martianHead(c, 0, -15.4, 0.84, t, { talk: Math.max(0, Math.sin(t * 7)) * (firing ? 1 : 0.4), look: Math.sin(t * 0.8), collar: null });
  c.restore();
}
