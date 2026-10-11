// More of the founder on the walls: Don K. Eggshell Ph.D., the silver professor, in the
// hands people hang in offices. Each piece is its own style AND its own pose, and keeps his
// look (wild silver mane, fine specs, thick brows, silver moustache, black cape lined red).
//
// A piece paints into `iw` x `ih` logical px from the top-left, uniformly (never stretched, a
// face stretched is a different man), then the frame goes round it. artwork.js bakes each one
// once per floor and scale and blits it, so none of this runs per frame.
//
//   pop        comic panel: halftone, SYNERGY!, raised fist          shouting, fist up
//   stamp      engraved postage stamp                                  profile
//   hero       80s action-movie one-sheet                              full length, hands on hips
//   wants      recruitment poster                                      pointing at the viewer
//   blueprint  technical drawing                                       the thinker, chin on fist
//   constructivist  red/cream/black propaganda                         profile, arm raised
//   banknote   share certificate, engraved oval                        bust
//   pixel      8-bit sprite on a hi-score screen                       standing
//   oil        gilt-framed portrait                                    hand in his cape
//   dusk       silhouette on a roof against the city                   profile, cape on the wind
import { box, line, poly, circ, ell, letters, textW, fs, pen, hash, rbox } from './line.js';
import { PROF, professorBody, professorHead } from './wall.js';
import { ADDITIONAL_PROFESSOR_PIECES } from './professorPosters.js';

const rad = Math.PI / 180;
const INK = '#141218';

function fit(g, str, x, y, w, max, o = {}) {
  const size = Math.min(max, (w * 6) / Math.max(1, textW(str, 6, o.track ?? 1.1)));
  letters(g, str, x, y, size, { align: 'center', lw: Math.max(0.35, size * 0.12), ...o });
  return size;
}

// A palette for professorHead/Body: the real one with a few things swapped.
const pal = (over) => ({ ...PROF, ...over });

// professorBody ends in the round of the cape's shoulders; a bust that runs off the frame must
// carry on, so the body goes past the bottom edge instead of stopping in a visible curve.
function bodyDown(g, cx, hy, s, ink, p, bottom) {
  const y0 = hy + 21.5 * s, hw = 16.5 * s;
  box(g, cx - hw, y0 - 0.2, hw * 2, bottom - y0 + 6, p.cape);
  line(g, cx - hw, y0, cx - hw, bottom + 6, ink, 0.42);
  line(g, cx + hw, y0, cx + hw, bottom + 6, ink, 0.42);
  line(g, cx - 11 * s, hy + 26 * s, cx - 10 * s, bottom + 6, '#3a3a4a', 0.5);
  line(g, cx + 11 * s, hy + 26 * s, cx + 10 * s, bottom + 6, '#3a3a4a', 0.5);
}

// ---------------------------------------------------------------- hands
// A hand is his skin in a ring of cuff, never a glove.
function cuff(g, x, y, r, ang, c) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  box(g, -r * 0.95, -r * 0.35, r * 1.9, r * 0.7, c.cuff, c.ink, 0.35);
  g.restore();
}
function fist(g, x, y, r, c) {
  rbox(g, x - r, y - r * 0.85, r * 2, r * 1.7, r * 0.45, c.skin, c.ink, 0.45);
  for (let k = 1; k < 4; k++) line(g, x - r + (k * r * 2) / 4, y - r * 0.8, x - r + (k * r * 2) / 4, y - r * 0.15, c.ink, 0.3);
  ell(g, x + r * 0.15, y + r * 0.62, r * 0.7, r * 0.3, c.skin, c.ink, 0.35);
}
// Hand braced on the iliac crest: the thumb goes behind the waist and the
// fingers drape diagonally over the front of the trousers. Local +x is outward.
function hipHand(g, x, y, c, sd) {
  g.save();
  g.translate(x, y);
  g.scale(sd, 1);
  // One silhouette from the narrow wrist through the metacarpals to unequal
  // fingertips. The open edge at the top blends into the forearm.
  const contour = () => {
    g.moveTo(1.8, -1.65);
    g.bezierCurveTo(0.8, -2.25, -0.2, -2.3, -0.95, -1.7);
    // Thumb hooks up and behind the belt, separate from the finger fan.
    g.quadraticCurveTo(-1.35, -2.2, -1.25, -3.15);
    g.quadraticCurveTo(-1.55, -3.75, -2.05, -3.2);
    g.quadraticCurveTo(-2.85, -1.5, -2.25, 0.2);
    // Index, middle, ring and little finger form a compact sloping edge.
    g.lineTo(-3.2, 2.65);
    g.quadraticCurveTo(-3.45, 3.45, -2.7, 3.5);
    g.lineTo(-2.1, 2.55);
    g.lineTo(-2.55, 4.05);
    g.quadraticCurveTo(-2.6, 4.75, -1.85, 4.6);
    g.lineTo(-1.05, 3.05);
    g.lineTo(-1.4, 4.55);
    g.quadraticCurveTo(-1.25, 5.15, -0.6, 4.75);
    g.lineTo(0.2, 3.3);
    g.lineTo(0.05, 4.35);
    g.quadraticCurveTo(0.3, 4.95, 0.85, 4.35);
    g.bezierCurveTo(1.8, 2.8, 2.1, 1.15, 2.25, 0.2);
    g.quadraticCurveTo(2.5, -0.35, 3.05, -0.65);
  };
  g.beginPath(); contour(); g.closePath();
  fs(g, c.skin, null, 0);
  g.beginPath(); contour(); pen(g, c.ink, 0.36); g.stroke();
  // Thenar fold and two restrained tendons describe the back of the hand.
  g.beginPath();
  g.moveTo(-2.25, 0.2);
  g.quadraticCurveTo(-1.45, -0.45, -1.15, -1.35);
  pen(g, c.ink, 0.26); g.stroke();
  for (const [xx, yy] of [[-1.25, 1.8], [0.1, 2.1]]) {
    g.beginPath(); g.moveTo(xx, yy);
    g.quadraticCurveTo(xx + 0.6, 0.7, xx + 1, 0.05);
    pen(g, '#c99a72', 0.22); g.stroke();
  }
  g.restore();
}

// a limb as one stroke: ink behind, cloth over
function limb(g, pts, w, cloth, ink) {
  for (const [col, ww] of [[ink, w + 0.9], [cloth, w]]) {
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.strokeStyle = col;
    g.lineWidth = ww;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
}

// ---------------------------------------------------------------- 1. pop
function burst(g, cx, cy, r0, r1, n, fill, ink, lw) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r0 : r1;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath();
  fs(g, fill, ink, lw);
}

function pop(g, iw, ih) {
  box(g, 0, 0, iw, ih, '#f6d447');
  for (let y = 1.6, row = 0; y < ih; y += 3.1, row++) {
    for (let x = (row % 2) * 1.55; x < iw; x += 3.1) {
      const k = Math.max(0, Math.min(1, 1.2 - (x / iw) * 0.55 - (1 - y / ih) * 0.8));
      if (k > 0.1) circ(g, x, y, 0.25 + k * 1.3, '#e8402c');
    }
  }
  const s = 1.1;
  const cx = iw * 0.36;
  const hy = ih * 0.56;
  burst(g, cx, hy - 1, 16, 29, 13, '#ffffff', INK, 0.8);
  const c = { skin: '#ffc4aa', ink: INK, cuff: '#ffffff' };
  // the raised fist: upper arm out, forearm up (the elbow goes out and down, as it does)
  const sh = [cx + 13 * s, hy + 19.5 * s], el = [cx + 24 * s, hy + 22 * s], wr = [cx + 24.5 * s, hy + 11 * s];
  limb(g, [...sh, ...el, ...wr], 5.2, '#1b1a24', INK);
  cuff(g, wr[0], wr[1], 3, Math.PI / 2 + 0.05, c);
  fist(g, wr[0], wr[1] - 3.4, 3.4, c);
  const popPal = pal({ skin: '#ffc4aa', skinDk: '#f0a088', stubble: '#e4e4f0', chin: '#ffffff', lens: '#9fe4f8', rim: INK, capeIn: '#e8242c', cape: '#1b1a24' });
  professorBody(g, cx, hy, s, INK, popPal);
  bodyDown(g, cx, hy, s, INK, popPal, ih);
  professorHead(g, cx, hy, s, INK, popPal, {
    mouth: 'shout',
    skinFx(gg, x, y, R, RY) {
      for (let yy = y - RY; yy < y + RY * 1.1; yy += 1.7) {
        for (let xx = x - R; xx < x + R; xx += 1.7) {
          const k = Math.max(0, (yy - y + RY * 0.2) / (RY * 1.1)) * 0.7 + Math.max(0, (x - xx) / R) * 0.25;
          if (k > 0.12) circ(gg, xx + ((Math.round((yy - y) / 1.7)) % 2) * 0.85, yy, 0.18 + k * 0.5, '#ff7a66');
        }
      }
    },
  });
  // SYNERGY!
  const bx = iw * 0.5, by = 10.5;
  ell(g, bx, by, iw * 0.43, 8.3, '#ffffff', INK, 0.8);
  poly(g, [cx + 1, by + 6.4, cx + 7, by + 6.8, cx + 3, hy - 9 * s - 1], '#ffffff', INK, 0.8);
  ell(g, bx, by - 0.5, iw * 0.43 - 0.9, 7.4, '#ffffff');
  fit(g, 'SYNERGY!', bx, by + 3, iw * 0.7, 6.4, { ink: INK });
}

// ---------------------------------------------------------------- 2. stamp
function stamp(g, iw, ih, ctx) {
  const navy = '#1f2e57';
  box(g, 0, 0, iw, ih, '#f3ead0');
  box(g, 3.2, 3.2, iw - 6.4, ih - 6.4, null, navy, 0.5);
  fit(g, 'EGGCORP', iw / 2, 9.6, iw - 14, 3.8, { ink: navy });
  const cx = iw / 2, cy = 30, rx = 15, ry = 17.5;
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.clip();
  box(g, 0, 0, iw, ih, '#e1d3ac');
  // the engraver's ground: a fan of fine rays behind the head
  g.beginPath();
  for (let a = 0; a < 360; a += 8) {
    g.moveTo(cx, cy - 4);
    g.lineTo(cx + Math.cos(a * rad) * 30, cy - 4 + Math.sin(a * rad) * 30);
  }
  pen(g, 'rgba(31,46,87,0.22)', 0.25);
  g.stroke();
  const st = pal({ skin: '#f6eed6', skinDk: '#e1d3ac', stubble: '#d8cba4', chin: '#fbf6e6', rim: navy, lens: '#e6efe9', stache: '#fbf6e6',
    tones: [['#fbf6e6', '#e8dfc4'], ['#f1ead2', '#ddd2b2'], ['#e6dcc0', '#cfc2a0']], cape: navy, capeIn: '#8e3b44', shirt: '#fbf6e6' });
  const s = 0.98, hy = cy - 4;
  professorBody(g, cx, hy, s, navy, st);
  bodyDown(g, cx, hy, s, navy, st, ih);
  professorHead(g, cx, hy, s, navy, st, {
    mouth: 'frown',
    skinFx(gg, x, y, R, RY) {
      // the engraver's hatching, slanting across the jaw and the cheeks
      gg.beginPath();
      for (let k = -8; k < 14; k++) { gg.moveTo(x - R, y - RY * 0.1 + k * 1.1); gg.lineTo(x + R, y - RY * 0.1 + k * 1.1 - 3.4); }
      pen(gg, 'rgba(31,46,87,0.4)', 0.22);
      gg.stroke();
    },
  });
  g.restore();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  pen(g, navy, 0.7);
  g.stroke();
  g.beginPath();
  g.ellipse(cx, cy, rx + 1.4, ry + 1.4, 0, 0, Math.PI * 2);
  pen(g, navy, 0.25);
  g.stroke();
  letters(g, '1', 8.4, ih - 5.4, 5.4, { ink: navy, lw: 0.85, align: 'center' });
  fit(g, 'FOUNDER', iw / 2 + 5, ih - 5.6, iw - 24, 3, { ink: navy });
  // perforations: the holes show the wall
  const hole = ctx.mat || '#f4eddf';
  for (let x = 0; x <= iw + 0.1; x += 3.6) { circ(g, x, 0, 1.15, hole); circ(g, x, ih, 1.15, hole); }
  for (let y = 0; y <= ih + 0.1; y += 3.6) { circ(g, 0, y, 1.15, hole); circ(g, iw, y, 1.15, hole); }
}

// ---------------------------------------------------------------- 3. hero
// A limb as a tapering shape, a centreline and a width at every point along it, so an arm can
// swell at the bicep and narrow to the wrist instead of being one fat sausage.
function taper(g, p0, p1, wf, t0, t1, fill, ink, lw, capStart = true, capEnd = true) {
  const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  const nx = -Math.sin(a), ny = Math.cos(a), N = 14;
  const at = (t) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = t0 + ((t1 - t0) * i) / N, [x, y] = at(t), hw = wf(t) / 2;
    L.push([x + nx * hw, y + ny * hw]);
    R.push([x - nx * hw, y - ny * hw]);
  }
  g.beginPath();
  g.moveTo(...L[0]);
  for (const q of L) g.lineTo(...q);
  if (capEnd) {
    const [x, y] = at(t1), r = wf(t1) / 2;
    for (let k = 1; k < 6; k++) g.lineTo(x + Math.cos(a + Math.PI / 2 - (k * Math.PI) / 6) * r, y + Math.sin(a + Math.PI / 2 - (k * Math.PI) / 6) * r);
  }
  for (let i = R.length - 1; i >= 0; i--) g.lineTo(...R[i]);
  if (capStart) {
    const [x, y] = at(t0), r = wf(t0) / 2;
    for (let k = 1; k < 6; k++) g.lineTo(x + Math.cos(a - Math.PI / 2 - (k * Math.PI) / 6) * r, y + Math.sin(a - Math.PI / 2 - (k * Math.PI) / 6) * r);
  }
  g.closePath();
  fs(g, fill, ink, lw);
}

// A lat-spread, hands on hips: the bodybuilder's pose, shoulders twice the width of the waist.
function hero(g, iw, ih) {
  // the one-sheet: sunburst rays out of the chest, a black title band at the foot
  box(g, 0, 0, iw, ih, '#ff7ab4');
  const cx = iw / 2, cyr = ih * 0.46;
  for (let i = 0; i < 18; i++) {
    const a0 = (i / 18) * Math.PI * 2, a1 = ((i + 1) / 18) * Math.PI * 2;
    if (i % 2) poly(g, [cx, cyr, cx + Math.cos(a0) * 90, cyr + Math.sin(a0) * 90, cx + Math.cos(a1) * 90, cyr + Math.sin(a1) * 90], '#b39ae6');
  }
  circ(g, cx, cyr + 3, 15, '#ffd0e6');
  // a floor, in violet
  const fy = ih - 17;
  box(g, 0, fy, iw, 17, '#3a2d5c');
  for (let k = 0; k < 8; k++) line(g, cx + (k - 3.5) * 3, fy, cx + (k - 3.5) * 11, ih - 11, '#6a58a0', 0.4);
  const skin = PROF.skin, mid = '#dfb08a', shirt = '#f6f4fb', fold = '#c9c5dc', lo = '#c99a72';
  // the head is a big one, a whole third of the shoulders' width, and the body hangs below it
  const s = 0.98, hy = 20.4, dy = 10, F = fy - dy;
  g.save();
  g.translate(0, dy);
  // THE CAPE. It hangs from the shoulders and falls behind him to the floor, belling out at the
  // hem in a soft wave; black outside, the red lining showing where it swings clear of him.
  const hem = (x) => F + 2 + Math.sin(x * 0.5) * 1.1;
  g.beginPath();
  g.moveTo(cx - 5, 21);
  g.bezierCurveTo(cx - 14, 21, cx - 21, 24, cx - 26, 31);
  g.bezierCurveTo(cx - 31, 38, cx - 33, 47, cx - 34, hem(cx - 34));
  for (let x = cx - 34; x <= cx + 34; x += 2) g.lineTo(x, hem(x));
  g.bezierCurveTo(cx + 33, 47, cx + 31, 38, cx + 26, 31);
  g.bezierCurveTo(cx + 21, 24, cx + 14, 21, cx + 5, 21);
  g.closePath();
  fs(g, INK, INK, 0.5);
  // the red lining reaches right across behind him, so the white shirt and the waist stand out
  // against it instead of against black
  g.beginPath();
  g.moveTo(cx - 6, 24.4);
  g.bezierCurveTo(cx - 20, 27, cx - 28, 40, cx - 31, 49);
  g.lineTo(cx - 32.4, hem(cx - 32.4) - 1);
  for (let x = cx - 32; x <= cx + 32; x += 2) g.lineTo(x, hem(x) - 1);
  g.lineTo(cx + 31, 49);
  g.bezierCurveTo(cx + 28, 40, cx + 20, 27, cx + 6, 24.4);
  g.closePath();
  fs(g, '#c8222c', null, 0);
  for (const sd of [-1, 1]) line(g, cx + sd * 22, 34, cx + sd * 26.4, 48, '#8e1a24', 0.5);
  // the cape's collar, cut like the other pictures' (professorBody) but standing in close: a pointed
  // flare either side of the face, black outside, red within
  {
    const hl = hy - dy;
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(cx + sd * 5 * s, hl + 12.5 * s);
      g.quadraticCurveTo(cx + sd * 10.4 * s, hl + 9 * s, cx + sd * 12.2 * s, hl - 3.5 * s);
      g.quadraticCurveTo(cx + sd * 15 * s, hl + 5 * s, cx + sd * 14 * s, hl + 16 * s);
      g.closePath();
      fs(g, INK, INK, 0.42);
      g.beginPath();
      g.moveTo(cx + sd * 6 * s, hl + 12.6 * s);
      g.quadraticCurveTo(cx + sd * 10.2 * s, hl + 9.4 * s, cx + sd * 11.6 * s, hl - 0.8 * s);
      g.quadraticCurveTo(cx + sd * 13 * s, hl + 6 * s, cx + sd * 12 * s, hl + 14.6 * s);
      g.closePath();
      fs(g, '#c8222c', null, 0);
    }
  }
  // trousers, not tights: straight, a little loose, a crease down each leg, a pocket at each hip, a
  // fold or two at the knee; the hips run on below the belt, the crotch well under it
  const yb = F + 5, crotch = 57.4;
  g.beginPath();
  g.moveTo(cx - 7.4, 45);
  g.lineTo(cx + 7.4, 45);
  g.quadraticCurveTo(cx + 9.4, 46.4, cx + 9.9, 53);
  g.lineTo(cx + 9.3, yb);
  g.lineTo(cx + 3.8, yb);
  g.lineTo(cx + 1, crotch + 2);
  g.quadraticCurveTo(cx, crotch, cx, crotch - 0.8);
  g.quadraticCurveTo(cx, crotch, cx - 1, crotch + 2);
  g.lineTo(cx - 3.8, yb);
  g.lineTo(cx - 9.3, yb);
  g.lineTo(cx - 9.9, 53);
  g.quadraticCurveTo(cx - 9.4, 46.4, cx - 7.4, 45);
  g.closePath();
  fs(g, '#2e2748', '#15102a', 0.5);
  line(g, cx, 48, cx, crotch - 0.8, '#15102a', 0.5);
  for (const sd of [-1, 1]) {
    // the pocket's slash from the belt out to the side seam
    g.beginPath();
    g.moveTo(cx + sd * 7.2, 46.2);
    g.quadraticCurveTo(cx + sd * 9, 47.6, cx + sd * 9.4, 51.4);
    pen(g, '#15102a', 0.5);
    g.stroke();
    // the pressed crease down the front of the leg, and a couple of folds at the knee
    line(g, cx + sd * 6, 50.6, cx + sd * 6.4, yb, '#463d6a', 0.55);
    line(g, cx + sd * 4.4, 57.8, cx + sd * 8.2, 58.8, '#15102a', 0.4);
    line(g, cx + sd * 4.8, 59.8, cx + sd * 8.6, 60.4, '#15102a', 0.35);
    ell(g, cx + sd * 6.4, yb + 1, 4.6, 1.7, INK);
  }
  // the torso, a V: shoulders twice the width of the waist, in his white shirt, stretched tight.
  // The shoulder is one slope from the neck to the arm, not a ball.
  g.beginPath();
  g.moveTo(cx - 4.4, 20.8);
  g.bezierCurveTo(cx - 8.6, 21.4, cx - 12, 23, cx - 14.4, 26.2);
  g.lineTo(cx - 12.6, 33);
  g.lineTo(cx - 9.6, 40);
  g.lineTo(cx - 6.6, 46.4);
  g.lineTo(cx + 6.6, 46.4);
  g.lineTo(cx + 9.6, 40);
  g.lineTo(cx + 12.6, 33);
  g.lineTo(cx + 14.4, 26.2);
  g.bezierCurveTo(cx + 12, 23, cx + 8.6, 21.4, cx + 4.4, 20.8);
  g.closePath();
  fs(g, shirt, '#6a6488', 0.5);
  // the neck, thick as the head is wide, and a T-shirt's round neckline, ribbed, no collar
  box(g, cx - 4.2, 17.6, 8.4, 6.2, mid, INK, 0.4);
  g.beginPath();
  g.moveTo(cx - 5.6, 22.6);
  g.quadraticCurveTo(cx, 29, cx + 5.6, 22.6);
  g.quadraticCurveTo(cx, 25.4, cx - 5.6, 22.6);
  g.closePath();
  fs(g, shirt, INK, 0.4);
  g.beginPath();
  g.moveTo(cx - 4.4, 23.6);
  g.quadraticCurveTo(cx, 27.4, cx + 4.4, 23.6);
  g.quadraticCurveTo(cx, 25.4, cx - 4.4, 23.6);
  g.closePath();
  fs(g, mid, null, 0);
  g.beginPath();
  g.moveTo(cx - 5, 24);
  g.quadraticCurveTo(cx, 28.2, cx + 5, 24);
  pen(g, fold, 0.45);
  g.stroke();
  // pecs under the cloth: the shirt pulled across two slabs, the cleft and the underside in fold lines
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + sd * 1.2, 36.6);
    g.bezierCurveTo(cx + sd * 5, 38.4, cx + sd * 10, 37, cx + sd * 12, 32.6);
    pen(g, fold, 0.9);
    g.stroke();
    g.beginPath();
    g.moveTo(cx + sd * 4, 30.4);
    g.quadraticCurveTo(cx + sd * 8, 29, cx + sd * 11, 31);
    pen(g, '#ffffff', 0.7);
    g.stroke();
    line(g, cx + sd * 10.4, 28.4, cx + sd * 7.4, 30.8, fold, 0.35);
  }
  line(g, cx, 29.6, cx, 36.4, fold, 0.5);
  // the abs showing through, and the ribs
  line(g, cx, 37, cx, 46, fold, 0.45);
  for (let k = 0; k < 3; k++) {
    const y = 38.4 + k * 2.9;
    line(g, cx - 4.2 + k * 0.4, y, cx + 4.2 - k * 0.4, y, fold, 0.45);
  }
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) line(g, cx + sd * 8.8, 34.4 + k * 2.2, cx + sd * 10.4 - k * 0.4, 35.2 + k * 2.2, fold, 0.35);
  // belt and trunks
  poly(g, [cx - 7, 45, cx + 7, 45, cx + 7.6, 48.2, cx - 7.6, 48.2], '#2a2340', INK, 0.45);
  box(g, cx - 2.2, 45.2, 4.4, 2.8, '#f6d447', INK, 0.35);
  for (const x of [-5.2, -3.4, 3.4, 5.2]) line(g, cx + x, 45, cx + x, 48.2, '#15102a', 0.45);
  // arms: shoulder, elbow out wide, the palm planted on the hip. Each swells where the muscle is and
  // narrows toward the joint: a short sleeve over the bicep, a bare forearm to the wrist. The
  // upper arm and forearm are drawn as one limb (an outline pass under a fill pass, so there is no
  // seam at the elbow), and the outlines are a soft brown and a soft lilac, not black.
  const armInk = '#a8744e', sleeveInk = '#a6a2c6';
  for (const sd of [-1, 1]) {
    const sh = [cx + sd * 13, 28.8], el = [cx + sd * 21.4, 40.4], hp = [cx + sd * 8.7, 46.8];
    const upper = (t) => 7.7 + 2 * Math.sin(Math.PI * Math.min(1, t * 1.15)) - 2.2 * t;
    const fore = (t) => 6.3 - 1.5 * t + 0.9 * Math.sin(Math.PI * Math.min(1, t * 1.1));
    taper(g, el, hp, (t) => fore(t) + 0.9, 0, 1, armInk, null, 0, true, true);
    taper(g, sh, el, (t) => upper(t) + 0.9, 0, 1, armInk, null, 0, true, true);
    taper(g, el, hp, fore, 0, 1, skin, null, 0, true, true);
    taper(g, sh, el, upper, 0, 1, skin, null, 0, true, true);
    line(g, el[0] - sd * 0.6, el[1] + 1.2, hp[0] + sd * 1.2, hp[1] - 1.6, lo, 0.4);
    // the hand on the hip: the wrist meets the forearm, fingers follow the trouser's outer seam
    hipHand(g, hp[0], hp[1], { skin, ink: armInk }, sd);
    // the sleeve is the shirt: same cloth, no outline where it joins the body, a soft line on the
    // far edge and the hem only
    taper(g, sh, el, (t) => upper(t) + 0.9, 0, 0.4, shirt, null, 0, true, false);
    const a2 = Math.atan2(el[1] - sh[1], el[0] - sh[0]), nx = -Math.sin(a2), ny = Math.cos(a2);
    const at = (t) => [sh[0] + (el[0] - sh[0]) * t, sh[1] + (el[1] - sh[1]) * t];
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let i = 0; i <= 8; i++) {
        const t = 0.1 + (0.4 - 0.1) * (i / 8), [x, y] = at(t), hw = (upper(t) + 0.9) / 2;
        g[i ? 'lineTo' : 'moveTo'](x + nx * hw * side, y + ny * hw * side);
      }
      pen(g, sleeveInk, 0.5);
      g.stroke();
    }
    const [hx, hy2] = at(0.4), hw = (upper(0.4) + 0.9) / 2;
    line(g, hx + nx * hw, hy2 + ny * hw, hx - nx * hw, hy2 - ny * hw, sleeveInk, 0.55);
    // the cloth drawn over the bicep: a soft light and two creases pulling to the elbow
    const m = at(0.2);
    g.beginPath();
    g.ellipse(m[0] + sd * 0.8, m[1], 1.5, 3.2, sd * 0.5, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fill();
    line(g, el[0] - sd * 3.2, el[1] - 3.6, el[0] - sd * 0.6, el[1] - 2.2, fold, 0.35);
    line(g, el[0] - sd * 2.8, el[1] - 5.2, el[0] - sd * 0.4, el[1] - 4, fold, 0.35);
  }
  g.restore();
  professorHead(g, cx, hy, s, INK, PROF, { mouth: 'smirk' });
  // title
  box(g, 0, ih - 17, iw, 17, INK);
  fit(g, 'THE FOUNDER', cx, ih - 9.2, iw - 6, 6.6, { ink: '#f6d447', slant: 0.12, shadow: '#c8222c', sdx: 0.5, sdy: 0.5 });
  fit(g, 'HE HATCHED THE FUTURE', cx, ih - 3.4, iw - 6, 4.2, { ink: '#f4f2f8', lw: 0.55 });
}

// ---------------------------------------------------------------- 4. wants you
// The hand is the plain pointing hand everyone knows: back of the hand, the index out straight,
// three fingers curled, the thumb along them, a white cuff. It is on the end of an arm that
// comes from his own shoulder, so there is no doubt whose it is.
function pointHand(g, x, y, u) {
  const skin = PROF.skin;
  const shade = '#c99a72';
  const w = 0.5 / u;
  g.save();
  g.translate(x, y);
  g.scale(u, u);
  // one smooth shape and nothing fussy: a short block of a hand with the index straight out of the
  // top, the curled fingers just one soft bulge down the front. No taller than the cuff.
  g.beginPath();
  g.moveTo(1.4, -3.8);
  g.lineTo(14.6, -3.8);
  g.quadraticCurveTo(17.6, -3.8, 17.6, -2.4);
  g.quadraticCurveTo(17.6, -1, 14.6, -1);
  g.lineTo(9.4, -1);
  g.quadraticCurveTo(11.5, 0, 11.2, 1.4);
  g.quadraticCurveTo(10.9, 3, 8.8, 3.4);
  g.lineTo(4.2, 3.4);
  g.quadraticCurveTo(1.4, 3.3, 1.4, 1.8);
  g.closePath();
  fs(g, skin, INK, w);
  // one soft line for the thumb folded against the fingers
  g.beginPath();
  g.moveTo(9.2, -1);
  g.quadraticCurveTo(7.2, 0.2, 7.6, 2.4);
  pen(g, shade, w * 1.1);
  g.stroke();
  // the cuff, snug over the wrist and the end of the sleeve
  box(g, -1, -4.2, 3.4, 8.2, '#f6f2f8', INK, w);
  g.restore();
}

function wants(g, iw, ih) {
  const navy = '#233a63', cream = '#f2e6c8', red = '#c8312b';
  box(g, 0, 0, iw, ih, cream);
  box(g, 2, 2, iw - 4, ih - 4, null, navy, 0.7);
  box(g, 3.6, 3.6, iw - 7.2, ih - 7.2, navy);
  g.save();
  g.beginPath();
  g.rect(3.6, 3.6, iw - 7.2, ih - 7.2);
  g.clip();
  // a glow behind him, in concentric stripes
  for (let r = 30; r > 5; r -= 6) circ(g, 16, 30, r, (r / 6 | 0) % 2 ? '#2f4c7e' : '#355a92');
  const s = 0.88, cx = 16, hy = 22;
  const wp = pal({ cape: INK, capeIn: red });
  // the arm: out of his shoulder, a little up, to the hand
  const sx = cx + 12 * s, sy = hy + 19 * s;
  g.save();
  g.translate(sx, sy);
  g.rotate(-0.12);
  limb(g, [0, 0, 11, 0], 7.3, '#1b1a24', INK);
  pointHand(g, 10.8, -0.35, 0.87);
  g.restore();
  professorBody(g, cx, hy, s, INK, wp);
  bodyDown(g, cx, hy, s, INK, wp, ih);
  professorHead(g, cx, hy, s, INK, wp, { mouth: 'frown', look: 0 });
  g.restore();
  // type: the name up top, the banner laid over the foot of the picture
  fit(g, 'EGGCORP', iw - 6, 11, 30, 5.6, { ink: cream, slant: 0.1, align: 'right' });
  box(g, 5, ih - 27, iw - 10, 12.4, red, INK, 0.5);
  fit(g, 'WANTS YOU', iw / 2, ih - 17.4, iw - 16, 7.6, { ink: cream, lw: 1.1 });
  // OVERTIME is the point of the poster, so it is set big enough to read going past, under the banner
  fit(g, 'FOR OVERTIME', iw / 2, ih - 7, iw - 16, 5.4, { ink: '#ffe9a8', lw: 0.8 });
}

// ---------------------------------------------------------------- 5. blueprint
function blueprint(g, iw, ih) {
  const paper = '#1f4e8f', white = '#eaf4ff';
  box(g, 0, 0, iw, ih, paper);
  g.beginPath();
  for (let x = 4; x < iw; x += 4) { g.moveTo(x, 0); g.lineTo(x, ih); }
  for (let y = 4; y < ih; y += 4) { g.moveTo(0, y); g.lineTo(iw, y); }
  pen(g, 'rgba(234,244,255,0.1)', 0.25);
  g.stroke();
  const bp = pal({ skin: '#2f66b3', skinDk: '#2a5ea6', stubble: '#3a72c2', chin: '#3a72c2',
    tones: [['#5a92e2', '#4a82d2'], ['#4a82d2', '#3a72c2'], ['#3a72c2', '#2f66b3']], stache: '#6aa2f2',
    rim: white, lens: '#74aaf6', cape: '#183f78', capeIn: '#2a5ea6', shirt: '#3a72c2' });
  const s = 1.05, cx = iw * 0.4, hy = ih * 0.4;
  // the desk edge his elbow rests on
  line(g, 0, ih - 9, iw, ih - 9, white, 0.7);
  // the thinker: upper arm down to the desk, forearm up, the fist under the chin
  const sh = [cx + 12 * s, hy + 19.5 * s], el = [cx + 15 * s, hy + 29 * s], wr = [cx + 4.4 * s, hy + 14.6 * s];
  professorBody(g, cx, hy, s, white, bp);
  bodyDown(g, cx, hy, s, white, bp, ih);
  limb(g, [...sh, ...el, ...wr], 4.2, '#183f78', white);
  rbox(g, wr[0] - 3.2, wr[1] - 3, 6.4, 5.4, 2, '#3a72c2', white, 0.45);
  for (let k = 1; k < 3; k++) line(g, wr[0] - 3.2 + k * 2.1, wr[1] - 2.8, wr[0] - 3.2 + k * 2.1, wr[1] - 0.6, white, 0.25);
  professorHead(g, cx, hy, s, white, bp, { mouth: 'frown', look: -0.4 });
  // dimensions and callouts
  const R = 7.4 * s, RY = 9.4 * s;
  line(g, cx - R, hy - RY - 3, cx + R, hy - RY - 3, white, 0.4);
  for (const x of [cx - R, cx + R]) { line(g, x, hy - RY - 5, x, hy - RY - 1, white, 0.4); }
  letters(g, '14.8', cx, hy - RY - 4.6, 2.6, { ink: white, lw: 0.3, align: 'center' });
  g.save();
  g.setLineDash([1.6, 1.2]);
  line(g, cx, hy - RY - 2, cx, hy + RY + 2, white, 0.3);
  g.restore();
  line(g, cx + R * 0.5, hy - 1.4, iw - 21, 9.5, white, 0.3);
  line(g, iw - 21, 9.5, iw - 5, 9.5, white, 0.3);
  circ(g, cx + R * 0.5, hy - 1.4, 0.8, null, white, 0.3);
  letters(g, 'SPECS 2X', iw - 5, 8.4, 2.5, { ink: white, lw: 0.3, align: 'right' });
  line(g, cx + 5 * s, hy - RY - 0.6, iw - 21, 19.5, white, 0.3);
  line(g, iw - 21, 19.5, iw - 5, 19.5, white, 0.3);
  letters(g, 'MANE TBC', iw - 5, 18.4, 2.5, { ink: white, lw: 0.3, align: 'right' });
  // the title block
  box(g, iw - 32, ih - 8, 31, 7, null, white, 0.4);
  letters(g, 'FIG 2', iw - 30.4, ih - 3.3, 2.8, { ink: white, lw: 0.35 });
  letters(g, 'PENSIVE', iw - 17.6, ih - 3.3, 2.8, { ink: white, lw: 0.35 });
  letters(g, 'DKE 01', 3, ih - 3.3, 2.6, { ink: white, lw: 0.3 });
}

// ---------------------------------------------------------------- 6. constructivist
function constructivist(g, iw, ih) {
  const cream = '#efe3c6', red = '#d23a2e';
  box(g, 0, 0, iw, ih, cream);
  // the red wedge, and the disc he stands against
  poly(g, [0, ih * 0.5, iw, ih * 0.1, iw, ih * 0.36, 0, ih * 0.78], red);
  const cx = iw * 0.4, hy = 21, s = 0.96;
  circ(g, cx, hy + 2, 19, red);
  circ(g, cx, hy + 2, 19, null, INK, 0.8);
  // him, front on, in three colours: black, cream and the red of his lenses
  const cp = pal({ skin: '#efe3c6', skinDk: '#d9c9a0', stubble: '#d9c9a0', chin: '#f8f0dc', lens: red, rim: INK, stache: '#f8f0dc',
    tones: [['#f8f0dc', '#e2d6b8'], ['#e2d6b8', '#c8baa0'], ['#c8baa0', '#a89c84']], cape: INK, capeIn: red, shirt: cream });
  // the raised arm: the upper arm out from the shoulder, the elbow bent and low, the forearm
  // straight up, a cuff, and the fist
  const sh = [cx + 12.6 * s, hy + 19.5 * s], el = [cx + 20, hy + 23.6], wr = [cx + 20.8, hy + 9.6];
  taper(g, sh, el, (t) => 5.8 - 1.2 * t, 0, 1, INK, INK, 0.5, true, true);
  taper(g, el, wr, (t) => 5 - 0.8 * t, 0, 1, INK, INK, 0.5, true, true);
  box(g, wr[0] - 2.6, wr[1] - 3, 5.2, 2.6, cream, INK, 0.4);
  fist(g, wr[0], wr[1] - 6.2, 3.3, { skin: cream, ink: INK, cuff: cream });
  professorBody(g, cx, hy, s, INK, cp);
  bodyDown(g, cx, hy, s, INK, cp, ih);
  professorHead(g, cx, hy, s, INK, cp, { mouth: 'frown' });
  // bars and type, a step each
  for (const [i, w, t] of [[0, 0.6, 'LEARN'], [1, 0.74, 'OBEY'], [2, 0.88, 'HATCH']]) {
    const y = ih - 26 + i * 8.4;
    box(g, 0, y, iw * w, 7.6, red, INK, 0.5);
    letters(g, t, 3, y + 6.1, 5.6, { ink: cream, lw: 1 });
  }
  poly(g, [iw - 9, ih - 1, iw - 1, ih - 1, iw - 1, ih - 10], INK);
}

// ---------------------------------------------------------------- 7. banknote
function banknote(g, iw, ih) {
  const green = '#2f5a3c', paper = '#dfe8c8', pale = '#eef2da';
  box(g, 0, 0, iw, ih, paper);
  // the guilloche: waves in two passes, either side of the portrait
  for (const pass of [0, 1]) {
    g.beginPath();
    for (let x = 0; x <= iw; x += 1) {
      const y = ih * 0.5 + Math.sin(x * 0.28 + pass * 1.6) * (ih * 0.42) * Math.sin(x * 0.07 + pass);
      g[x ? 'lineTo' : 'moveTo'](x, y);
    }
    pen(g, 'rgba(47,90,60,0.28)', 0.3);
    g.stroke();
  }
  box(g, 2, 2, iw - 4, ih - 4, null, green, 0.7);
  box(g, 3.6, 3.6, iw - 7.2, ih - 7.2, null, green, 0.25);
  // the oval, with a rosette of beads round it
  const cx = iw / 2, cy = ih / 2 + 2.2, rx = 10, ry = 12.2;
  for (let a = 0; a < 360; a += 14) circ(g, cx + Math.cos(a * rad) * (rx + 2), cy + Math.sin(a * rad) * (ry + 2), 0.75, null, green, 0.3);
  ell(g, cx, cy, rx, ry, pale, green, 0.7);
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx - 0.3, ry - 0.3, 0, 0, Math.PI * 2);
  g.clip();
  // engraved ground: horizontal lines
  g.beginPath();
  for (let y = cy - ry; y < cy + ry; y += 1.2) { g.moveTo(cx - rx, y); g.lineTo(cx + rx, y); }
  pen(g, 'rgba(47,90,60,0.28)', 0.2);
  g.stroke();
  const bn = pal({ skin: '#eef2da', skinDk: '#c8d4ae', stubble: '#c8d4ae', chin: '#f6f8ea', rim: green,
    tones: [['#f6f8ea', '#dbe4c0'], ['#dbe4c0', '#c8d4ae'], ['#c8d4ae', '#b4c498']], stache: '#e4ebcc', lens: '#e8f0dc', cape: green, capeIn: '#8e5a3c' });
  const s = 0.78, hy = cy - 3;
  professorBody(g, cx, hy, s, green, bn);
  professorHead(g, cx, hy, s, green, bn, {
    mouth: 'frown',
    skinFx(gg, x, y, R, RY) {
      // engraving across the jaw side and under the brow
      gg.beginPath();
      for (let k = -8; k < 12; k++) { gg.moveTo(x - R, y - RY * 0.2 + k * 1.15); gg.lineTo(x + R, y - RY * 0.2 + k * 1.15 - 3); }
      pen(gg, 'rgba(47,90,60,0.32)', 0.2);
      gg.stroke();
    },
  });
  g.restore();
  // figures and words
  letters(g, '100', 9.8, cy + 1, 6, { ink: green, lw: 0.9, align: 'center' });
  letters(g, '100', iw - 9.8, cy + 1, 6, { ink: green, lw: 0.9, align: 'center' });
  fit(g, 'EGGCORP HOLDINGS', cx, 8.4, iw - 16, 3, { ink: green, lw: 0.42 });
  fit(g, 'ONE SHARE', 9.8, cy + 7, 15, 2.4, { ink: green, lw: 0.3 });
  letters(g, 'A 0001 EGG', iw - 2.4, cy + 7, 1.7, { ink: '#b3262e', lw: 0.22, align: 'right' });
}

// ---------------------------------------------------------------- 8. pixel
// 22 x 32, one letter a pixel, drawn by hand: a big head, the mane in three greys with the dark
// one as its edge, specs with a glint, the drooping moustache, a cape lined red, a white shirt.
// K outline, W/L/D mane, S/T skin, B brow, R rim, E lens, G glint, M/m moustache, C/c cape,
// r/q lining, H/h shirt, P trousers, F belt and shoes, Y buckle, f toe-cap
export const SPRITE = [
  '......D...D..D..D.....',
  '....D.DL.DLD.DLD.DL...',
  '...DLDLWLDLWDLWLDLWD..',
  '..DLWLWWWLWWWLWWWLWLD.',
  '..DWWLWWWWWWWWWWWLWWD.',
  '.DLWWWWWWWWWWWWWWWWLD.',
  '.DWWLSSSSSSSSSSSSLWWD.',
  '.DWWLBBBSSSSSSBBBLWWD.',
  '.DLWLSSBBBSSBBBSSLWLD.',
  '.DLWLSRRRRSSRRRRSLWLD.',
  '.DLWLSRGEESSRGEESLWLD.',
  '..DWLSREEESSREEESLWD..',
  '..DWLSSRRRSSSRRRSLWD..',
  '..DLWSSSSSTTSSSSSWLD..',
  '...DLKSMMMMMMMMSKLD...',
  '....DKSmMMMMMMmSKD....',
  '.....KSSSSKKSSSSK.....',
  '......KSSTLLTSSK......',
  '.......KTSTTSTK.......',
  '........KTSSTK........',
  '...KCCCKHHHHHHKCCCK...',
  '..KCCrrKHHHHHHKrrCCK..',
  '..KCCrrKHhHHhHKrrCCK..',
  '.KCCCrqKHHHHHHKqrCCCK.',
  '.KCCCrqKHHHHHHKqrCCCK.',
  '.KCCCCqKFFYYFFKqCCCCK.',
  'KCCCCCqKPPPPPPKqCCCCCK',
  'KCCCCqqKPPPPPPKqqCCCCK',
  'KKKCCCKKPPPPPPKKCCCKKK',
  '.......KPPKKPPK.......',
  '.......KPPKKPPK.......',
  '......KffFKKFffK......',
];
const SPRITE_COL = { K: '#12101a', W: '#f6f6ff', L: '#c9cde0', D: '#8f96b8', S: '#f3cfae', T: '#d3a07c', E: '#8fe3f7', G: '#ffffff', R: '#2a2840', M: '#e4e7f2', m: '#aab0c8', B: '#9aa0bc', C: '#2a2838', c: '#4a4868', r: '#d3222c', q: '#8e1a24', H: '#fbfbff', h: '#cfd3e6', P: '#40336a', F: '#12101a', f: '#6a6890', Y: '#f6d447' };

// CRT pixels: blocky, but each one a little rounded block of lit phosphor with a hair of dark
// between it and the next, a lighter top and a scanline across its foot, and a faint bloom round
// the bright ones, instead of a flat square.
function pixels(g, rows, ox, oy, px, col) {
  const gap = px * 0.07, r = px * 0.2, inner = px - gap;
  g.save();
  g.globalAlpha = 0.1;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch !== '.' && col[ch] && ch !== 'K') rbox(g, ox + x * px - px * 0.3, oy + y * px - px * 0.3, px * 1.6, px * 1.6, r * 2.2, col[ch]);
    }
  }
  g.restore();
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !col[ch]) continue;
      const cx0 = ox + x * px + gap / 2, cy0 = oy + y * px + gap / 2;
      rbox(g, cx0, cy0, inner, inner, r, col[ch]);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(cx0 + r * 0.4, cy0 + 0.1, inner - r * 0.8, inner * 0.28);
      g.fillStyle = 'rgba(0,0,0,0.13)';
      g.fillRect(cx0 + r * 0.3, cy0 + inner * 0.7, inner - r * 0.6, inner * 0.3);
    }
  }
}

// the scenery, in the same big pixels: a cloud, a hill, an egg block, a coin
const CLOUD = ['..KKK....', '.KWWWKKK.', 'KWWWWWWWK', 'KWWWWWWWK', '.KKKKKKK.'];
const HILL = ['......KKKK......', '....KKgggnKK....', '...KgggggggnK...', '..KgggKgggggnK..', '.KgggggggKgggnK.', 'KgggKgggggggggnK'];
const EGGBLOCK = ['KKKKKKKK', 'KYYYYYYK', 'KYYWWYYK', 'KYWWWWYK', 'KYWWWWYK', 'KYYWWYYK', 'KYYYYYYK', 'KKKKKKKK'];
const COIN = ['.KK.', 'KYYK', 'KYOK', 'KYOK', 'KYYK', '.KK.'];
function pixel(g, iw, ih) {
  const px = 1.5;
  const sky = '#5c94fc';
  box(g, 0, 0, iw, ih, sky);
  const col = { ...SPRITE_COL, g: '#38b838', n: '#1e7a24', O: '#c88a10' };
  const gy = ih - 8;
  pixels(g, HILL, iw - 16 * px - 1, gy - HILL.length * px, px, col);
  pixels(g, CLOUD, 3, 13, px, col);
  pixels(g, EGGBLOCK, 1, 25, px, col);
  pixels(g, COIN, iw - 4 * px - 4, 31, px, col);
  pixels(g, COIN, iw - 4 * px - 4, 42, px, col);
  // the arcade HUD
  letters(g, '1UP', 3, 5.6, 3.2, { ink: '#ffffff', lw: 0.55 });
  letters(g, '009900', 3, 9.8, 3.2, { ink: '#ffffff', lw: 0.55 });
  letters(g, 'EGGS', iw - 3, 5.6, 3.2, { ink: '#ffffff', lw: 0.55, align: 'right' });
  letters(g, 'X 12', iw - 3, 9.8, 3.2, { ink: '#ffffff', lw: 0.55, align: 'right' });
  // him, standing on the bricks
  const w = SPRITE[0].length * px;
  pixels(g, SPRITE, Math.round(((iw - w) / 2) * 2) / 2, gy - SPRITE.length * px, px, col);
  box(g, 0, gy, iw, 8, '#c84c0c');
  for (let x = 0; x < iw; x += 6) {
    box(g, x, gy, 6, 4, '#e8742a', '#12101a', 0.3);
    box(g, x - 3, gy + 4, 6, 4, '#e8742a', '#12101a', 0.3);
  }
  // the tube: scanlines over everything, and the corners falling off into the glass
  g.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0.75; y < ih; y += 1.5) g.fillRect(0, y, iw, 0.6);
  const v = g.createRadialGradient(iw / 2, ih / 2, Math.min(iw, ih) * 0.45, iw / 2, ih / 2, Math.hypot(iw, ih) / 2);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,6,24,0.38)');
  g.fillStyle = v;
  g.fillRect(0, 0, iw, ih);
}

// ---------------------------------------------------------------- 9. oil
function oil(g, iw, ih) {
  // a dark room: flat bands of umber, a red curtain, the glow on him
  box(g, 0, 0, iw, ih, '#2a1b16');
  box(g, 0, ih * 0.55, iw, ih * 0.45, '#33231b');
  poly(g, [0, 0, 11, 0, 7, ih, 0, ih], '#6e1f2a');
  for (let k = 1; k < 3; k++) line(g, k * 3.4, 0, k * 2.4, ih, '#4a1420', 0.6);
  circ(g, iw * 0.55, ih * 0.38, 25, 'rgba(255,214,150,0.07)');
  circ(g, iw * 0.55, ih * 0.38, 16, 'rgba(255,214,150,0.09)');
  const s = 1.32, cx = iw * 0.55, hy = ih * 0.34;
  const op = pal({ skin: '#eec9a8', skinDk: '#cf9c76', cape: '#15121a', capeIn: '#8e1a24', shirt: '#e8e2d6', lens: '#c8e0f8' });
  professorBody(g, cx, hy, s, INK, op);
  bodyDown(g, cx, hy, s, INK, op, ih);
  // his hand tucked in at the chest: the forearm comes across from the elbow, which goes out and low
  const el = [cx - 17 * s, hy + 26 * s], hd = [cx - 1.5 * s, hy + 21.4 * s];
  limb(g, [cx - 12 * s, hy + 19 * s, ...el, ...hd], 4.6, '#15121a', INK);
  ell(g, hd[0] + 0.4, hd[1], 2.4 * s, 1.7 * s, op.skin, INK, 0.45, -0.3);
  for (let k = 0; k < 3; k++) line(g, hd[0] - 1.6 * s + k * 1.4, hd[1] - 1, hd[0] - 1.2 * s + k * 1.4, hd[1] + 1.2, INK, 0.25);
  professorHead(g, cx, hy, s, INK, op, {
    mouth: 'frown',
    skinFx(gg, x, y, R, RY) {
      // the lamp is to the right: the far cheek in shadow, a flat highlight on the near brow
      gg.beginPath();
      gg.ellipse(x - R * 0.62, y + RY * 0.1, R * 0.52, RY * 0.95, 0, 0, Math.PI * 2);
      gg.fillStyle = 'rgba(150,90,60,0.28)';
      gg.fill();
      gg.beginPath();
      gg.ellipse(x + R * 0.38, y - RY * 0.55, R * 0.3, RY * 0.1, 0.3, 0, Math.PI * 2);
      gg.fillStyle = 'rgba(255,240,214,0.35)';
      gg.fill();
    },
  });
  // the globe, lower right, half in the dark
  circ(g, iw - 8, ih - 9, 6, '#6a8a9a', '#0e0c10', 0.4);
  g.save();
  g.beginPath();
  g.arc(iw - 8, ih - 9, 6, 0, Math.PI * 2);
  g.clip();
  poly(g, [iw - 12, ih - 13, iw - 8, ih - 14, iw - 7, ih - 9, iw - 11, ih - 7], '#8aa86a');
  poly(g, [iw - 7, ih - 6, iw - 3, ih - 10, iw - 3, ih - 3], 'rgba(10,8,12,0.45)');
  g.restore();
  box(g, iw - 9, ih - 3.4, 2, 3.4, '#8a6a2a');
}

// ---------------------------------------------------------------- 10. dusk
// Front on and against the light: the sun is behind him, so he is a dark shape rimmed in pink, with
// the glint of his specs the one bright thing in his face.
function dusk(g, iw, ih) {
  const bands = ['#ff8fa0', '#f27aa8', '#d868b0', '#b058b4', '#8a4cb2', '#5e3d9a', '#3c2f7c'];
  const bh = (ih * 0.8) / bands.length;
  bands.forEach((c, i) => box(g, 0, i * bh, iw, bh + 0.5, c));
  // the sun, banded, right behind his head
  const cx = iw / 2, base = ih * 0.84;
  circ(g, cx, ih * 0.3 + 2, 16, '#ffd8a0');
  for (let k = 0; k < 6; k++) box(g, cx - 17, ih * 0.3 + 4 + k * 2.6, 34, 0.5 + k * 0.28, bands[Math.min(5, 2 + k)]);
  // skyline
  const towers = [[0, 14, 22], [8, 9, 34], [15, 12, 26], [27, 8, 36], [33, 12, 30], [43, 10, 24]];
  for (const [x, w, h] of towers) {
    if (x >= iw) continue;
    box(g, x, base - h, w, h + 8, '#1c1638');
    for (let yy = base - h + 3; yy < base - 2; yy += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3.4) if (hash(xx * 7 + yy) > 0.55) box(g, xx, yy, 1.2, 1.6, '#f6d478');
  }
  // the roof he stands on
  box(g, 0, base, iw, ih - base, '#0f0c1c');
  box(g, 0, base, iw, 1.2, '#2a2150');
  // him: dark fills, pink rim light for the outline
  const rim = '#ff9bc0', night = '#140f28', night2 = '#241a3c';
  const dp = pal({ skin: '#2e2248', skinDk: '#241a3c', stubble: '#2e2248', chin: '#3c2f5c', lens: '#dff2ff', rim: '#ffd0e0', stache: '#5a4e80', brow: '#4a3f6a',
    tones: [['#5a4e80', '#3c2f5c'], ['#4a3f6a', '#2e2448'], ['#3c2f5c', '#241a3c']], cape: night, capeIn: '#4a1e4c', shirt: night2 });
  const s = 0.76, hy = ih * 0.3;
  const top = hy + 13 * s;
  // the cape blown out wide on both sides of him
  g.beginPath();
  g.moveTo(cx - 5, top);
  g.bezierCurveTo(cx - 12, top - 1, cx - 19, top + 3, cx - 22, top + 11);
  g.lineTo(cx - 19, top + 14);
  g.lineTo(cx - 22, top + 17);
  g.lineTo(cx - 17, base - 2);
  g.lineTo(cx + 17, base - 2);
  g.lineTo(cx + 22, top + 17);
  g.lineTo(cx + 19, top + 14);
  g.lineTo(cx + 22, top + 11);
  g.bezierCurveTo(cx + 19, top + 3, cx + 12, top - 1, cx + 5, top);
  g.closePath();
  fs(g, night, rim, 0.35);
  // one dark shape: legs a little apart, the torso, the arms on the hips, no joints showing
  for (const sd of [-1, 1]) poly(g, [cx + sd * 0.4, top + 14, cx + sd * 6.2, top + 14, cx + sd * 5.8, base, cx + sd * 1.4, base], night2);
  poly(g, [cx - 8.4, top + 0.6, cx + 8.4, top + 0.6, cx + 5.6, top + 16, cx - 5.6, top + 16], night2);
  for (const sd of [-1, 1]) {
    const sh = [cx + sd * 8, top + 2.4], el = [cx + sd * 12, top + 9.2], hp = [cx + sd * 6, top + 14.4];
    taper(g, sh, el, (t) => 5 - 1.2 * t, 0, 1, night2, null, 0, true, true);
    taper(g, el, hp, (t) => 4 - 0.9 * t, 0, 1, night2, null, 0, true, true);
    // the sun catching the outer edge of the arm
    line(g, sh[0] + sd * 2.4, sh[1] - 0.2, el[0] + sd * 2.2, el[1] + 0.4, rim, 0.35);
  }
  professorHead(g, cx, hy, s, rim, dp, { mouth: 'frown' });
  letters(g, 'EGGCORP', iw - 3, ih - 2.4, 2.2, { ink: '#6a58a0', lw: 0.3, align: 'right' });
}

export const PROFESSOR_PIECES = Object.freeze({
  pop: { name: 'SYNERGY!', style: 'comic panel, halftone', pose: 'shouting, fist raised', w: 66, h: 76, paint: pop, frame: '#141218', mat: '#fbf3dc' },
  stamp: { name: 'FOUNDER, 1 EGG', style: 'engraved postage stamp', pose: 'bust, front on', w: 54, h: 72, paint: stamp, frame: '#e8e0d0', mat: '#f4eddf' },
  hero: { name: 'THE FOUNDER', style: '80s action-movie one-sheet', pose: 'full length, hands on hips', w: 72, h: 100, paint: hero, frame: '#141218', mat: '#141218' },
  wants: { name: 'EGGCORP WANTS YOU', style: 'recruitment poster', pose: 'pointing at you', w: 84, h: 88, paint: wants, frame: '#eee4d8', mat: '#f2e6c8' },
  blueprint: { name: 'FIG 2, PENSIVE', style: 'blueprint', pose: 'the thinker, chin on fist', w: 76, h: 62, paint: blueprint, frame: '#353746', mat: '#e8eef6' },
  constructivist: { name: 'LEARN OBEY HATCH', style: 'constructivist propaganda', pose: 'front on, fist raised', w: 58, h: 74, paint: constructivist, frame: '#141218', mat: '#efe3c6' },
  banknote: { name: 'ONE SHARE, 100 EGGS', style: 'banknote engraving', pose: 'bust in an oval', w: 76, h: 58, paint: banknote, frame: '#2f5a3c', mat: '#eef2da' },
  pixel: { name: '1UP', style: '8-bit platformer screen', pose: 'standing', w: 66, h: 84, paint: pixel, frame: '#353746', mat: '#16122b' },
  oil: { name: 'THE FOUNDER, OIL', style: 'gilt-framed oil portrait', pose: 'hand tucked in his cape', w: 66, h: 80, paint: oil, frame: '#d1b371', mat: '#8a6a2a', gilt: true },
  dusk: { name: 'DUSK', style: 'silhouette against the skyline', pose: 'standing, backlit, hands on hips', w: 58, h: 76, paint: dusk, frame: '#141218', mat: '#141218' },
  ...ADDITIONAL_PROFESSOR_PIECES,
});

// Where each hangs: every APPROVED piece ONCE in the whole building, spread evenly along its
// floor (artwork.js keeps them clear of the wall sections). Approved: the ten originals, Art
// Deco, Gouache and the Warhol; every other addition is a Lab-gallery candidate, never in game.
// The lobby gets the gallery pieces, floor 23 the corporate propaganda, 88 the old masters.
const PROFESSOR_FLOORS = {
  // the last of each list is the one in view at the finish line (officeFounderPlan)
  lobby: ['stamp', 'founderSurreal', 'pixel', 'founderDeco'],
  open: ['pop', 'blueprint', 'constructivist', 'wants'],
  exec: ['oil', 'banknote', 'founderGouache', 'hero'],
};
const evenly = (ids) => ids.map((id, i) => [id, +(0.05 + (0.9 * i) / (ids.length - 1)).toFixed(4)]);
export const PROFESSOR_PLAN = Object.freeze(Object.fromEntries(
  Object.entries(PROFESSOR_FLOORS).map(([floor, ids]) => [floor, evenly(ids)])));
export const PROFESSOR_BY_FLOOR = Object.freeze(Object.fromEntries(
  Object.entries(PROFESSOR_PLAN).map(([floor, list]) => [floor, list.map(([id]) => id)])));

// The piece in its frame, top-left at (x, y): the same dress as the other hung art.
export function paintFramedProfessor(g, id, x, y, P) {
  const d = PROFESSOR_PIECES[id];
  const { w, h } = d;
  if (d.galleryPainter) {
    g.save();
    g.translate(x, y);
    const frame = d.plainFrame ? 3 : 0;
    if (frame) { g.fillStyle = d.plainFrame; g.fillRect(0, 0, w, h); }
    g.translate(frame, frame);
    d.paint(g, w - frame * 2, h - frame * 2, { mat: d.mat, P });
    g.restore();
    return;
  }
  box(g, x + 2, y + 3, w, h, 'rgba(25,20,35,.17)');
  box(g, x, y, w, h, d.frame, P.ink, 0.75);
  if (d.gilt) {
    box(g, x + 1.4, y + 1.4, w - 2.8, h - 2.8, null, '#f3dc9a', 0.6);
    box(g, x + 4.6, y + 4.6, w - 9.2, h - 9.2, null, '#8a6a2a', 0.5);
  }
  box(g, x + 3, y + 3, w - 6, h - 6, d.mat, P.ink, 0.35);
  g.save();
  g.beginPath();
  g.rect(x + 7, y + 7, w - 14, h - 14);
  g.clip();
  g.translate(x + 7, y + 7);
  d.paint(g, w - 14, h - 14, { mat: d.mat, P });
  g.restore();
  line(g, x + 1, y + 1, x + w - 1, y + 1, 'rgba(255,255,255,.55)', 0.7);
}
