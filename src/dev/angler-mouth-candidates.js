// ANGLER MOUTH BAKE-OFF — what the anglerfish's open mouth looks like. 6 Oct 2026.
//
// Peter, of the club's ANGLER (club-fish.js): "whats the maroon bit for this fish, it's mouth?
// looks odd can you bake off some fixes". It is the inside of its open mouth, and it reads
// oddly for four reasons: it is laid ON the face as one more cut-out, so in paper it casts a
// shadow like a sticker rather than sitting in the face like a hole; maroon on dark purple is
// muddy and reads as meat; its front edge is a straight line that runs down the silhouette, so
// the face looks sliced off; and nothing says which part is jaw.
//
// Each candidate is a `jaws` for the ANGLER — paint(ctx, L, { t, beat, gape, drop, pulse }) —
// which draws its body, its mouth and its teeth; the painter puts the tail on first and the
// stalk, lamp, eye, brow and fin on after, so those are the same in every one. Facing right,
// centred on the origin, `L` nose to tail. They are drawn in cut paper like everything else in
// the flood: every fill a cut-out with its own shadow, a dark line on its own a thin strip.
//
// Landmarks, in L: the snout's tip is (0.42, -0.05), the corner of the mouth (0.0, 0.06), the
// jaw's tip (0.52, 0.13); the eye sits at (0.14, -0.14), 0.055 across. The jaw chomps — shut on
// the beat, dropping open between — hinged at the corner: `drop(x)` is how far it has dropped
// at x, `gape` how far at its tip (up to 0.08). Every candidate keeps the chomp.
//
// SETTLED 6 Oct 2026 on C, the tongue ("C"), then taken further on 7 Oct: no mouth to see into,
// side on — a hinged jaw, teeth and only the tongue between the lips (club-fish.js anglerJaws).
// C as it shipped (tongueInThroat) and the rest stay here for the bake-off's record, with the
// maroon mouth before them all (anglerMaroon).



const TAU = Math.PI * 2;
const ink = (ctx, L, w = 0.035) => {
  ctx.lineWidth = Math.max(0.8, L * w);
  ctx.strokeStyle = '#1b1428';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
};
const fillStroke = (ctx, fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };

const BODY = '#3a2f5a';
const TOOTH = '#fffbe8';

/** The body round to the snout, from the root of the tail over the top of the head. */
function crownTo(ctx, L) {
  ctx.moveTo(-L * 0.32, 0);
  ctx.quadraticCurveTo(-L * 0.25, -L * 0.3, L * 0.12, -L * 0.3);
  ctx.quadraticCurveTo(L * 0.4, -L * 0.28, L * 0.42, -L * 0.04);
}

/** The whole body, a closed silhouette, as the club has it. */
function bodyWhole(ctx, L, drop) {
  ctx.beginPath();
  crownTo(ctx, L);
  ctx.lineTo(L * 0.5, L * 0.12 + drop(0.5));
  ctx.quadraticCurveTo(L * 0.2, L * 0.34 + drop(0.2), -L * 0.1, L * 0.24);
  ctx.quadraticCurveTo(-L * 0.3, L * 0.16, -L * 0.32, 0);
  ctx.closePath();
}

/**
 * The body with its mouth cut out of it: round the snout, back along the upper lip to the
 * corner, out along the jaw to its tip, and under the chin home. Whatever is drawn before it
 * shows through the mouth, under its shadow — a hole in the paper, not a piece on it.
 */
function bodyCut(ctx, L, drop) {
  ctx.beginPath();
  crownTo(ctx, L);
  ctx.lineTo(L * 0.42, -L * 0.05);
  ctx.quadraticCurveTo(L * 0.2, L * 0.06, L * 0.0, L * 0.06);
  ctx.quadraticCurveTo(L * 0.22, L * 0.24 + drop(0.22), L * 0.52, L * 0.13 + drop(0.52));
  ctx.quadraticCurveTo(L * 0.2, L * 0.34 + drop(0.2), -L * 0.1, L * 0.24);
  ctx.quadraticCurveTo(-L * 0.3, L * 0.16, -L * 0.32, 0);
  ctx.closePath();
}

/** The mouth as the club draws it: upper lip, jaw, and the straight front between their tips. */
function mouthShape(ctx, L, drop) {
  ctx.beginPath();
  ctx.moveTo(L * 0.42, -L * 0.05);
  ctx.quadraticCurveTo(L * 0.2, L * 0.06, L * 0.0, L * 0.06);
  ctx.quadraticCurveTo(L * 0.22, L * 0.24 + drop(0.22), L * 0.52, L * 0.13 + drop(0.52));
  ctx.closePath();
}

/**
 * The inside of the mouth, to go under bodyCut: the mouth's own front edge between the lip tips,
 * and past the lips everywhere else, so its edges hide under the body.
 */
function throatShape(ctx, L, drop) {
  ctx.beginPath();
  ctx.moveTo(L * 0.42, -L * 0.05);
  ctx.quadraticCurveTo(L * 0.18, -L * 0.02, -L * 0.04, L * 0.06);
  ctx.quadraticCurveTo(L * 0.22, L * 0.31 + drop(0.22), L * 0.52, L * 0.13 + drop(0.52));
  ctx.closePath();
}

/** The club's snaggle teeth: down from the upper lip, up from the jaw, every one a different length. */
function snaggle(ctx, L, drop, fill = TOOTH) {
  ctx.fillStyle = fill;
  ctx.lineWidth = Math.max(0.5, L * 0.012);
  const lip = (u) => [L * 0.42 * u, L * (0.06 - 0.11 * u * u)];
  const jaw = (u) => [L * 0.52 * u, L * (0.06 + 0.14 * Math.sin(u * Math.PI * 0.8)) + drop(0.52 * u)];
  for (const [u, h] of [[0.25, 0.07], [0.45, 0.1], [0.62, 0.06], [0.8, 0.09], [0.94, 0.05]]) {
    const [bx, by] = lip(u);
    ctx.beginPath(); ctx.moveTo(bx - L * 0.026, by); ctx.lineTo(bx + L * 0.004, by + L * h); ctx.lineTo(bx + L * 0.026, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const [u, h] of [[0.3, 0.06], [0.5, 0.11], [0.68, 0.07], [0.86, 0.1], [0.97, 0.06]]) {
    const [bx, by] = jaw(u);
    ctx.beginPath(); ctx.moveTo(bx - L * 0.028, by); ctx.lineTo(bx - L * 0.004, by - L * h); ctx.lineTo(bx + L * 0.028, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

/** The y of a quadratic curve (p0, c, p2), in L, where it crosses x: a curve running one way in x. */
function quadY([x0, y0], [cx, cy], [x2, y2], x) {
  let a = 0, b = 1;
  for (let i = 0; i < 20; i++) {
    const s = (a + b) / 2, xs = (1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * cx + s * s * x2;
    if ((xs < x) === (x2 > x0)) a = s; else b = s;
  }
  const s = (a + b) / 2;
  return (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * cy + s * s * y2;
}

/** A fang `h` long from (x, y), `w` across its root, pointing `dir` (1 down, -1 up), its tip leant `lean` forward. */
function fang(ctx, L, x, y, w, h, dir, lean = 0) {
  ctx.beginPath();
  ctx.moveTo(L * (x - w / 2), L * y);
  ctx.quadraticCurveTo(L * (x - w * 0.2 + lean * 0.5), L * (y + dir * h * 0.6), L * (x + lean), L * (y + dir * h));
  ctx.quadraticCurveTo(L * (x + w * 0.25 + lean * 0.5), L * (y + dir * h * 0.5), L * (x + w / 2), L * y);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

// A — the club's mouth to the letter, its inside the colour of a hole: near-black plum.
function inkThroat(ctx, L, { drop }) {
  bodyWhole(ctx, L, drop); fillStroke(ctx, BODY);
  ctx.fillStyle = '#150b1f';
  mouthShape(ctx, L, drop); ctx.fill(); ctx.stroke();
  snaggle(ctx, L, drop);
}

// B — the mouth inside the face, lipped all round: a rounder snout comes down in front of it,
// so the gape no longer runs out to the silhouette and the face is not sliced off at the front.
function lips(ctx, L, { drop }) {
  ctx.beginPath();
  crownTo(ctx, L);
  ctx.quadraticCurveTo(L * 0.5, 0, L * 0.5, L * 0.1 + drop(0.5));
  ctx.quadraticCurveTo(L * 0.2, L * 0.34 + drop(0.2), -L * 0.1, L * 0.24);
  ctx.quadraticCurveTo(-L * 0.3, L * 0.16, -L * 0.32, 0);
  ctx.closePath(); fillStroke(ctx, BODY);
  // the lips, a paler rim, and the dark of the mouth inside them
  const gape = (grow, col) => {
    ctx.beginPath();
    ctx.moveTo(L * (0.42 + grow), L * (0.03 - grow));
    ctx.quadraticCurveTo(L * 0.24, L * (0.04 - grow * 1.5), L * (0.03 - grow * 1.5), L * 0.07);
    ctx.quadraticCurveTo(L * 0.24, L * (0.22 + grow * 1.5) + drop(0.24), L * (0.43 + grow), L * (0.06 + grow) + drop(0.43));
    ctx.quadraticCurveTo(L * (0.43 + grow * 1.8), L * 0.045 + drop(0.43) / 2, L * (0.42 + grow), L * (0.03 - grow));
    ctx.closePath(); fillStroke(ctx, col);
  };
  gape(0.022, '#5c4a8c');
  gape(0, '#140a1c');
  ctx.fillStyle = TOOTH; ctx.lineWidth = Math.max(0.5, L * 0.012);
  const up = (x) => quadY([0.42, 0.03], [0.24, 0.04], [0.03, 0.07], x);
  const lo = (x) => quadY([0.03, 0.07], [0.24, 0.22 + drop(0.24) / L], [0.43, 0.06 + drop(0.43) / L], x);
  for (const [x, h] of [[0.12, 0.05], [0.22, 0.075], [0.31, 0.055], [0.38, 0.065]]) fang(ctx, L, x, up(x) - 0.006, 0.042, h, 1, 0.004);
  for (const [x, h] of [[0.08, 0.045], [0.17, 0.07], [0.27, 0.09], [0.35, 0.065], [0.41, 0.05]]) fang(ctx, L, x, lo(x) + 0.006, 0.042, h, -1, -0.004);
}

// C — A, cut through (the throat behind the face), with a tongue lying in the jaw: the cartoon's
// way of saying "mouth", and the one bit of red left is plainly a tongue. The winner: the club's
// own anglerJaws.

/** The mouth the club had until 6 Oct 2026, which this bake-off replaced: a maroon wedge laid over the face. */
export function anglerMaroon(ctx, L, { drop }) {
  bodyWhole(ctx, L, drop); fillStroke(ctx, BODY);
  ctx.fillStyle = '#4a0d24';
  mouthShape(ctx, L, drop); ctx.fill(); ctx.stroke();
  snaggle(ctx, L, drop);
}

// D — the underbite: a lower jaw of its own, a shade paler, jutting out past the snout and
// swinging on its hinge, its long fangs standing up in front of the upper lip.
function underbite(ctx, L, { gape }) {
  // the throat, then the head down to the corner of the mouth, with no lower jaw of its own
  ctx.beginPath();
  ctx.moveTo(L * 0.42, -L * 0.05);
  ctx.quadraticCurveTo(L * 0.18, -L * 0.02, -L * 0.04, L * 0.06);
  ctx.lineTo(L * 0.08, L * 0.15); ctx.lineTo(L * 0.46, L * 0.11);
  ctx.closePath(); fillStroke(ctx, '#140a1c');
  ctx.beginPath();
  crownTo(ctx, L);
  ctx.lineTo(L * 0.42, -L * 0.05);
  ctx.quadraticCurveTo(L * 0.2, L * 0.06, L * 0.0, L * 0.06);
  ctx.lineTo(L * 0.04, L * 0.21);
  ctx.quadraticCurveTo(-L * 0.03, L * 0.25, -L * 0.1, L * 0.24);
  ctx.quadraticCurveTo(-L * 0.3, L * 0.16, -L * 0.32, 0);
  ctx.closePath(); fillStroke(ctx, BODY);
  // the upper teeth, short, hanging into the gap
  ctx.fillStyle = TOOTH; ctx.lineWidth = Math.max(0.5, L * 0.012);
  for (const [x, h] of [[0.17, 0.05], [0.29, 0.065], [0.38, 0.055]]) {
    fang(ctx, L, x, quadY([0.42, -0.05], [0.2, 0.06], [0, 0.06], x) - 0.005, 0.04, h, 1, 0.005);
  }
  // the jaw, swung down about its hinge as far as the chomp says
  ctx.save();
  ctx.translate(0, L * 0.07); ctx.rotate(Math.atan2(gape, L * 0.52)); ctx.translate(0, -L * 0.07);
  ink(ctx, L);
  ctx.beginPath();
  ctx.moveTo(0, L * 0.06);
  ctx.quadraticCurveTo(L * 0.28, L * 0.1, L * 0.57, 0);
  ctx.quadraticCurveTo(L * 0.58, L * 0.17, L * 0.38, L * 0.25);
  ctx.quadraticCurveTo(L * 0.15, L * 0.3, L * 0.03, L * 0.2);
  ctx.quadraticCurveTo(-L * 0.03, L * 0.13, 0, L * 0.06);
  ctx.closePath(); fillStroke(ctx, '#4a3c72');
  // its fangs, longest at the front, the front ones up past the upper lip
  ctx.fillStyle = TOOTH; ctx.lineWidth = Math.max(0.5, L * 0.012);
  const top = (x) => quadY([0, 0.06], [0.28, 0.1], [0.57, 0], x);
  for (const [x, h, lean] of [[0.11, 0.05, 0], [0.23, 0.07, -0.005], [0.34, 0.1, -0.01], [0.45, 0.13, -0.015], [0.53, 0.1, -0.01]]) {
    fang(ctx, L, x, top(x) + 0.008, 0.045, h, -1, lean);
  }
  ctx.restore();
}

// E — the mouth shut on a grin: a dark slit, cracking open on the chomp, with long fangs
// interlocking across it, outside the lips, so there is no inside to see.
function snaggleGrin(ctx, L, { gape, drop }) {
  bodyWhole(ctx, L, drop); fillStroke(ctx, BODY);
  const open = gape / L;   // 0..0.08
  ctx.beginPath();
  ctx.moveTo(L * 0.46, L * 0.035);
  ctx.quadraticCurveTo(L * 0.22, L * 0.1, L * 0.02, L * 0.04);
  ctx.quadraticCurveTo(L * 0.22, L * (0.115 + open * 0.9), L * 0.48, L * 0.05 + drop(0.48));
  ctx.closePath(); fillStroke(ctx, '#140a1c');
  ctx.fillStyle = TOOTH; ctx.lineWidth = Math.max(0.5, L * 0.012);
  // where the slit's edges run at x: the upper one, and the lower one as the jaw drops
  const up = (x) => quadY([0.46, 0.035], [0.22, 0.1], [0.02, 0.04], x);
  const lo = (x) => quadY([0.02, 0.04], [0.22, 0.115 + open * 0.9], [0.48, 0.05 + drop(0.48) / L], x);
  for (const [x, h] of [[0.13, 0.08], [0.27, 0.1], [0.39, 0.08]]) fang(ctx, L, x, up(x) - 0.012, 0.045, h + open * 0.5, 1, 0.006);
  for (const [x, h] of [[0.07, 0.07], [0.2, 0.1], [0.33, 0.11], [0.45, 0.09]]) fang(ctx, L, x, lo(x) + 0.012, 0.045, h + open * 0.5, -1, -0.006);
}

// F — A, cut through, the inside lit by its own lamp: a deep sea-green glow at the opening, brightening with
// the lamp on the beat, falling to black at the back; the teeth catch the lamp's colour.
function lampLit(ctx, L, { drop, pulse = 0 }) {
  const g = ctx.createRadialGradient(L * 0.44, -L * 0.02, 0, L * 0.44, -L * 0.02, L * 0.48);
  const k = 0.55 + 0.45 * pulse;
  g.addColorStop(0, `rgb(${Math.round(40 + 40 * k)},${Math.round(70 + 70 * k)},${Math.round(50 + 30 * k)})`);
  g.addColorStop(0.45, '#1c2230');
  g.addColorStop(1, '#0d0814');
  throatShape(ctx, L, drop); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
  bodyCut(ctx, L, drop); fillStroke(ctx, BODY);
  snaggle(ctx, L, drop, '#f4ffcc');
}

/**
 * C as it shipped on 6 Oct 2026, until Peter asked for no mouth to see into (7 Oct: "not have a
 * mouth area and just show teeth and tongue side on"): the mouth cut out of the face, the dark of
 * the throat behind it and a tongue lying in the jaw. club-fish.js anglerJaws is the side-on jaw now.
 */
function tongueInThroat(ctx, L, { drop }) {
  // the inside of the mouth, under the body: its front edge runs between the lip tips, and
  // everywhere else it reaches past the lips, so its edges hide under the face
  const throat = () => {
    ctx.beginPath();
    ctx.moveTo(L * 0.42, -L * 0.05);
    ctx.quadraticCurveTo(L * 0.18, -L * 0.02, -L * 0.04, L * 0.06);
    ctx.quadraticCurveTo(L * 0.22, L * 0.31 + drop(0.22), L * 0.52, L * 0.13 + drop(0.52));
    ctx.closePath();
  };
  throat(); fillStroke(ctx, '#160b1e');
  // the tongue, lying in the jaw and dropping with it, a crease down the middle
  ctx.save();
  throat(); ctx.clip();
  ctx.beginPath();
  ctx.moveTo(L * 0.02, L * 0.13 + drop(0.02));
  ctx.bezierCurveTo(L * 0.1, L * 0.085 + drop(0.1), L * 0.27, L * 0.085 + drop(0.27), L * 0.37, L * 0.15 + drop(0.37));
  ctx.lineTo(L * 0.37, L * 0.3 + drop(0.37));
  ctx.lineTo(L * 0.02, L * 0.3);
  ctx.closePath(); fillStroke(ctx, '#c9527a');
  ctx.strokeStyle = '#8e2f52'; ctx.lineWidth = Math.max(0.6, L * 0.014);
  ctx.beginPath(); ctx.moveTo(L * 0.09, L * 0.125 + drop(0.09)); ctx.quadraticCurveTo(L * 0.18, L * 0.11 + drop(0.18), L * 0.27, L * 0.125 + drop(0.27)); ctx.stroke();
  ctx.restore();
  ink(ctx, L);
  // the body, the head most of it, with the mouth cut out: round the snout, back along the upper
  // lip to the corner, out along the jaw to its tip, which juts past the snout, and home under the chin
  ctx.beginPath();
  ctx.moveTo(-L * 0.32, 0);
  ctx.quadraticCurveTo(-L * 0.25, -L * 0.3, L * 0.12, -L * 0.3);
  ctx.quadraticCurveTo(L * 0.4, -L * 0.28, L * 0.42, -L * 0.04);
  ctx.lineTo(L * 0.42, -L * 0.05);
  ctx.quadraticCurveTo(L * 0.2, L * 0.06, L * 0.0, L * 0.06);
  ctx.quadraticCurveTo(L * 0.22, L * 0.24 + drop(0.22), L * 0.52, L * 0.13 + drop(0.52));
  ctx.quadraticCurveTo(L * 0.2, L * 0.34 + drop(0.2), -L * 0.1, L * 0.24);
  ctx.quadraticCurveTo(-L * 0.3, L * 0.16, -L * 0.32, 0);
  ctx.closePath(); fillStroke(ctx, '#3a2f5a');
  // its snaggle teeth: down from the lip above, up from the jaw below, every one a different length
  ctx.fillStyle = '#fffbe8';
  ctx.lineWidth = Math.max(0.5, L * 0.012);
  const lip = (u) => [L * 0.42 * u, L * (0.06 - 0.11 * u * u)];
  const jaw = (u) => [L * 0.52 * u, L * (0.06 + 0.14 * Math.sin(u * Math.PI * 0.8)) + drop(0.52 * u)];
  for (const [u, h] of [[0.25, 0.07], [0.45, 0.1], [0.62, 0.06], [0.8, 0.09], [0.94, 0.05]]) {
    const [bx, by] = lip(u);
    ctx.beginPath(); ctx.moveTo(bx - L * 0.026, by); ctx.lineTo(bx + L * 0.004, by + L * h); ctx.lineTo(bx + L * 0.026, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const [u, h] of [[0.3, 0.06], [0.5, 0.11], [0.68, 0.07], [0.86, 0.1], [0.97, 0.06]]) {
    const [bx, by] = jaw(u);
    ctx.beginPath(); ctx.moveTo(bx - L * 0.028, by); ctx.lineTo(bx - L * 0.004, by - L * h); ctx.lineTo(bx + L * 0.028, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

export const ANGLER_MOUTHS = Object.freeze([
  { letter: 'A', name: 'INK THROAT', paint: inkThroat,
    description: 'The smallest fix: the same mouth, its inside near-black plum instead of maroon, so it reads as a hole and the teeth stand out against it.' },
  { letter: 'B', name: 'LIPS', paint: lips,
    description: 'The mouth inside the face, a paler lip all round it, dark within: a rounder snout comes down in front, so the mouth no longer runs out to the silhouette and the face isn’t sliced off.' },
  { letter: 'C', name: 'TONGUE', paint: tongueInThroat,
    description: 'A, with a pink tongue lying in the jaw and a crease down it: the cartoon’s way of saying “mouth”. The only red left is plainly a tongue.' },
  { letter: 'D', name: 'UNDERBITE', paint: underbite,
    description: 'A lower jaw of its own, a shade paler, jutting out past the snout and swinging on its hinge as it chomps; its long fangs stand up in front of the upper lip.' },
  { letter: 'E', name: 'SNAGGLE GRIN', paint: snaggleGrin,
    description: 'The mouth shut on a grin: a dark slit that cracks open on the chomp, long fangs interlocking across it outside the lips. No inside to see.' },
  { letter: 'F', name: 'LAMP LIT', paint: lampLit,
    description: 'A, the inside lit by its own lamp: a deep sea-green glow at the opening, brightening with the lamp on the beat and falling to black at the back; the teeth catch the light.' },
]);
