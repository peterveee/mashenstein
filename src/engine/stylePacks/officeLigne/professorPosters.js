// Nineteen additional Founder posters: original vanity portraits plus five
// exact office-gallery portraits whose art style, frame and crop are reused.
import { box, line, poly, circ, ell, fs, pen, rbox } from './line.js';
import { PROF, professorHead } from './wall.js';
import { paintFounderGalleryPortrait as paintDecoPortrait } from '../../../dev/office-styles/deco.js';
import { paintFounderGalleryPortrait as paintGouachePortrait } from '../../../dev/office-styles/gouache.js';
import { paintFounderGalleryPortrait as paintMcmPortrait } from '../../../dev/office-styles/mcm.js';
import { paintFounderGalleryPortrait as paintCutawayPortrait } from '../../../dev/office-styles/cutaway.js';
import { paintFounderGalleryPortrait as paintCrayonPortrait } from '../../../dev/office-styles/crayon.js';

const INK = '#24232b';
const fullPortrait = (painter) => (g, w, h) => painter(g, 0, 0, w, h);
function bg(g, color, accent, style = 'plain') {
  box(g, 0, 0, 60, 80, color);
  if (style === 'rays') {
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      poly(g, [30, 40, 30 + Math.cos(a) * 78, 40 + Math.sin(a) * 78,
        30 + Math.cos(a + Math.PI / 15) * 78, 40 + Math.sin(a + Math.PI / 15) * 78], accent);
    }
  }
}
function head(g, x, y, s = 0.82, o = {}) { professorHead(g, x, y, s, INK, PROF, o); }
function cape(g, x, y, w, h, c = '#23232e', inner = '#b8202a', ink = INK) {
  poly(g, [x - w * .28, y, x + w * .28, y, x + w * .52, y + h, x - w * .5, y + h], c, ink, .5);
  poly(g, [x - w * .2, y + 2, x + w * .2, y + 2, x + w * .39, y + h - 1, x - w * .37, y + h - 1], inner);
}
function torso(g, x, y, w, h, fill = '#eceef4', ink = INK) {
  // A shaped shirt: broad sloping shoulders, a narrower waist, and a curved hem.
  g.beginPath(); g.moveTo(x - w * .25, y);
  g.bezierCurveTo(x - w * .43, y + 1, x - w * .5, y + h * .18, x - w * .42, y + h * .32);
  g.lineTo(x - w * .34, y + h * .78); g.quadraticCurveTo(x, y + h * 1.04, x + w * .34, y + h * .78);
  g.lineTo(x + w * .42, y + h * .32);
  g.bezierCurveTo(x + w * .5, y + h * .18, x + w * .43, y + 1, x + w * .25, y);
  g.quadraticCurveTo(x, y - 2, x - w * .25, y); g.closePath(); fs(g, fill, ink, .48);
}
function limb(g, pts, width = 4.5, fill = PROF.skin, ink = INK) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = width + .75; g.stroke();
  g.strokeStyle = fill; g.lineWidth = width; g.stroke();
}
// Trace a tapered limb around its joints rather than drawing a single-width stick.
function contour(g, pts, widths, fill, ink = INK, lw = .38) {
  const left = [], right = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0], dy = next[1] - prev[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, half = widths[i] / 2;
    left.push([pts[i][0] + nx * half, pts[i][1] + ny * half]);
    right.push([pts[i][0] - nx * half, pts[i][1] - ny * half]);
  }
  g.beginPath(); g.moveTo(...left[0]);
  for (let i = 1; i < left.length; i++) g.quadraticCurveTo(...left[i - 1], (left[i - 1][0] + left[i][0]) / 2, (left[i - 1][1] + left[i][1]) / 2);
  g.lineTo(...left[left.length - 1]); g.lineTo(...right[right.length - 1]);
  for (let i = right.length - 2; i >= 0; i--) g.quadraticCurveTo(...right[i + 1], (right[i + 1][0] + right[i][0]) / 2, (right[i + 1][1] + right[i][1]) / 2);
  g.closePath(); fs(g, fill, ink, lw);
}
function shoe(g, x, y, s = 1, color = '#26233b', angle = 0) {
  g.save(); g.translate(x, y); g.rotate(angle); g.scale(s, s);
  g.beginPath(); g.moveTo(-3.1, -.4); g.quadraticCurveTo(-2.2, -1.9, -.3, -1.8);
  g.lineTo(1.1, -.9); g.quadraticCurveTo(2.4, -.5, 4.1, .2); g.quadraticCurveTo(4.8, 1, 3.9, 1.4);
  g.lineTo(-2.4, 1.3); g.quadraticCurveTo(-3.6, 1.2, -3.1, -.4); g.closePath(); fs(g, color, INK, .38);
  line(g, -2.6, .8, 3.8, .8, '#d2c8af', .24);
  g.restore();
}
// An open hand has four unequal fingers, a separate thumb and readable palm creases.
function hand(g, x, y, angle = 0, open = false, skin = PROF.skin) {
  g.save(); g.translate(x, y); g.rotate(angle); g.scale(.8, .8);
  g.beginPath();
  g.moveTo(-2.2, -1.8); g.quadraticCurveTo(-2.1, -3.5, -1.2, -3.5);
  if (open) {
    g.lineTo(-.9, -5.9); g.quadraticCurveTo(-.3, -6.5, .3, -5.8); g.lineTo(.4, -2.3);
    g.lineTo(1, -6.7); g.quadraticCurveTo(1.8, -7.2, 2.3, -6.5); g.lineTo(2.1, -2);
    g.lineTo(3.3, -5.7); g.quadraticCurveTo(4.2, -6.1, 4.5, -5.2); g.lineTo(3.8, -1.5);
    g.lineTo(4.8, -4.1); g.quadraticCurveTo(5.7, -4.3, 5.9, -3.3); g.lineTo(4.6, .6);
    g.quadraticCurveTo(4, 3.8, 1.5, 4.4); g.lineTo(-1.9, 3.8);
  } else {
    g.quadraticCurveTo(3.8, -3, 4.5, -1.1); g.lineTo(4.3, 1.4);
    g.quadraticCurveTo(3.9, 4, 1.5, 4.2); g.lineTo(-1.8, 3.6);
  }
  g.quadraticCurveTo(-2.1, 4, -2.8, 2); g.lineTo(-4.7, -.1);
  g.quadraticCurveTo(-5.3, -1.1, -4.4, -1.7); g.quadraticCurveTo(-3.3, -1.7, -1.8, .1);
  g.lineTo(-2.6, -1.2); g.quadraticCurveTo(-2.8, -2, -2.2, -1.8);
  g.closePath(); fs(g, skin, INK, .42);
  if (open) {
    line(g, -1.5, 1.1, 1.6, 1.8, '#b88767', .26);
    line(g, .6, 2.1, 2.5, .3, '#b88767', .22);
    line(g, -.2, -5.4, .2, -2.8, '#f4cfaa', .24);
    line(g, 1.7, -5.9, 1.9, -2.8, '#f4cfaa', .24);
    line(g, 3.6, -4.9, 3.2, -2.5, '#f4cfaa', .24);
  } else {
    line(g, -.8, .2, 2.7, .7, '#b88767', .28);
    for (const k of [0, 1, 2]) line(g, -.8 + k * 1.25, -2.4, -.45 + k * 1.25, -1.5, '#f4cfaa', .2);
  }
  g.restore();
}
// A late-80s/early-90s terminal: deep beige case, convex green phosphor tube,
// chunky stand and a wired keyboard.
function crt(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  poly(g, [0, 1, 2, 0, 13, 0, 15, 1.5, 15, 10, 13, 11, 0, 10], '#c9c0aa', INK, .5);
  poly(g, [12.5, .5, 15, 1.8, 15, 9.7, 12.5, 10.4], '#aaa28e', INK, .3);
  g.beginPath(); g.moveTo(1.7, 1.8); g.quadraticCurveTo(7, .9, 12, 1.8); g.lineTo(12, 8.1); g.quadraticCurveTo(7, 9, 1.7, 8.1); g.closePath(); fs(g, '#17352b', '#696551', .35);
  // The tube is tuned to his portrait, not an anonymous data screen.
  poly(g, [4, 4.2, 4.1, 2.9, 5.1, 2.1, 6.4, 2.5, 7.5, 2, 9, 2.8, 9.3, 4.2, 9.1, 6.8, 7, 7.6, 5.2, 7.2], '#87e79a', '#8feaa4', .28);
  line(g, 4, 4.25, 9.2, 4.25, '#17352b', .4);
  line(g, 4.9, 4.2, 5.5, 4.1, '#a6ffb6', .36); line(g, 7.3, 4.1, 8, 4.2, '#a6ffb6', .36);
  line(g, 5.3, 6.6, 7.9, 6.6, '#276746', .4);
  for (let k = 0; k < 4; k++) line(g, 3, 2.1 + k * 1.1, 2.5, 2.6 + k * 1.1, '#a6ffb6', .22);
  circ(g, 13.5, 9, .38, '#74966c');
  poly(g, [6, 10, 9.3, 10, 9.8, 12, 5.6, 12], '#b6ad98', INK, .28);
  rbox(g, 3.4, 12, 9, 1.3, .35, '#a9a18e', INK, .28);
  for (let k = 0; k < 6; k++) line(g, 4.1 + k * 1.25, 12.35, 4.1 + k * 1.25, 12.8, '#524e46', .18);
  g.restore();
}
function frame(g, d, draw) {
  const s = Math.min(d.iw / 60, d.ih / 80), ox = (d.iw - 60 * s) / 2, oy = (d.ih - 80 * s) / 2;
  g.save(); g.translate(ox, oy); g.scale(s, s); draw(g); g.restore();
}
function squareFrame(g, d, draw) {
  const s = Math.min(d.iw / 60, d.ih / 60), ox = (d.iw - 60 * s) / 2, oy = (d.ih - 60 * s) / 2;
  g.save(); g.translate(ox, oy); g.scale(s, s); draw(g); g.restore();
}

// One joined skeleton for the new full-body poses. Hips overlap the trouser
// legs, shoulders overlap the arms, sleeves sit over the upper arms, and hands
// are placed at the wrist ends. Each image supplies a real pose by its joints.
function person(g, o = {}) {
  const x = o.x ?? 30, hY = o.headY ?? 30, hS = o.headScale ?? .76;
  const sy = o.shoulderY ?? 40, waistY = o.waistY ?? 54;
  const pants = o.pants ?? '#2a2940', shirt = o.shirt ?? '#f0eee7';
  const L = o.legs ?? [
    { hip: [x - 3.8, waistY - .5], knee: [x - 4.8, 62], ankle: [x - 5.2, 68], foot: [x - 6, 70] },
    { hip: [x + 3.8, waistY - .5], knee: [x + 4.8, 62], ankle: [x + 5.2, 68], foot: [x + 6, 70] },
  ];
  const A = o.arms ?? [
    { elbow: [x - 11, 47], wrist: [x - 10, 54], angle: .3 },
    { elbow: [x + 11, 47], wrist: [x + 10, 54], angle: -.3 },
  ];
  g.save();
  if (o.scale && o.scale !== 1) { g.translate(x, 43); g.scale(o.scale, o.scale); g.translate(-x, -43); }
  if (o.rotation) { g.translate(x, 43); g.rotate(o.rotation); g.translate(-x, -43); }
  if (o.cape !== false) cape(g, x, sy - 1, o.capeW ?? 24, o.capeH ?? 24, o.capeColor ?? '#23232e', o.capeLining ?? '#b8202a');
  // Shaped trouser legs meet beneath one pelvis panel; knee and ankle widths
  // taper naturally and the cloth seams stay inside the silhouette.
  for (const leg of L) {
    const [hx, hy] = leg.hip, [kx, ky] = leg.knee, [ax, ay] = leg.ankle;
    contour(g, [[hx, hy], [kx, ky], [ax, ay]], [7.2, 5.7, 3.6], pants, INK, .38);
    line(g, hx + (ax - hx) * .56, hy + (ay - hy) * .56, ax + (hx - ax) * .13, ay + (hy - ay) * .13, '#48465c', .28);
    line(g, kx - 2.4, ky + .7, kx + 2.2, ky + 1.5, '#171722', .34);
    const foot = leg.foot ?? [ax, ay + 1.4], footAngle = Math.atan2(foot[1] - ay, foot[0] - ax);
    shoe(g, foot[0], foot[1], leg.shoeScale ?? .9, o.shoe ?? '#252431', footAngle);
  }
  const crotchY = Math.max(...L.map(leg => leg.hip[1])) + 5;
  g.beginPath(); g.moveTo(x - 8.7, waistY - 2); g.quadraticCurveTo(x - 8.9, waistY + 3, x - 5.3, waistY + 4);
  g.lineTo(x - 1.1, crotchY + 1.3); g.quadraticCurveTo(x, crotchY + 2.2, x + 1.1, crotchY + 1.3);
  g.lineTo(x + 5.3, waistY + 4); g.quadraticCurveTo(x + 8.9, waistY + 3, x + 8.7, waistY - 2);
  g.closePath(); fs(g, pants, INK, .42);
  line(g, x, waistY + 2, x, crotchY + .5, '#151521', .38);
  // Continuous skin arms with tapered shoulders, elbows and wrists.
  const shoulders = [[x - 7, sy], [x + 7, sy]];
  A.forEach((arm, i) => {
    const sh = shoulders[i], elb = arm.elbow, wr = arm.wrist;
    contour(g, [sh, elb, wr], [6.2, 4.9, 3.5], o.skin ?? PROF.skin, INK, .36);
    line(g, elb[0] + (wr[0] - elb[0]) * .2, elb[1] + (wr[1] - elb[1]) * .2,
      wr[0] - (wr[0] - elb[0]) * .2, wr[1] - (wr[1] - elb[1]) * .2, '#c38b68', .28);
  });
  torso(g, x, sy - 1, o.torsoW ?? 20, waistY - sy + 1, shirt);
  // Belt and fly sit on the shared pelvis, so the legs visibly grow out of one waist.
  rbox(g, x - 8.4, waistY - 1.5, 16.8, 4.1, .8, o.beltColor ?? '#252431', INK, .42);
  rbox(g, x - 1.6, waistY - 1, 3.2, 2.8, .3, o.buckle ?? '#d8b83f', INK, .3);
  for (const sd of [-1, 1]) {
    line(g, x + sd * 4.2, waistY + 5, x + sd * 4.5, crotchY - .3, '#151521', .28);
    line(g, x + sd * 4.6, waistY + 8, x + sd * 6.1, waistY + 8.7, '#6a687b', .24);
  }
  // Simple shirt folds and a restrained chest seam give the upper body volume.
  line(g, x, sy + 4, x, waistY - 2, '#cbc8c4', .3);
  line(g, x - 6.5, sy + 8, x - 3.4, sy + 10, '#fffdf5', .52);
  line(g, x + 6.5, sy + 8, x + 3.4, sy + 10, '#fffdf5', .52);
  line(g, x - 5.2, waistY - 4, x - 2.6, waistY - 2.7, '#d2cfca', .3);
  line(g, x + 5.2, waistY - 4, x + 2.6, waistY - 2.7, '#d2cfca', .3);
  for (const [i, arm] of A.entries()) {
    const sh = shoulders[i], ex = arm.elbow;
    const sleeveEnd = [sh[0] + (ex[0] - sh[0]) * .48, sh[1] + (ex[1] - sh[1]) * .48];
    contour(g, [sh, sleeveEnd], [6.6, 5.4], o.sleeve ?? shirt, INK, .27);
    line(g, sleeveEnd[0] - .8, sleeveEnd[1] - 2.1, sleeveEnd[0] + .8, sleeveEnd[1] + 2.1, '#b6b3b2', .32);
  }
  // Neck tucks under both jaw and collar; its side shadows make the head sit on the torso.
  rbox(g, x - 3.1, hY + 6.7 * hS, 6.2, 5.8, .9, o.skin ?? PROF.skin, INK, .32);
  line(g, x - 2.1, hY + 9.5 * hS, x - 1.4, hY + 11.6 * hS, '#b97d5c', .26);
  if (o.collar !== false) {
    poly(g, [x - 5, sy - 1, x - 1, sy - 1, x, sy + 4, x - 4, sy + 2], '#fffdf5', INK, .25);
    poly(g, [x + 5, sy - 1, x + 1, sy - 1, x, sy + 4, x + 4, sy + 2], '#fffdf5', INK, .25);
    line(g, x, sy + 4, x, sy + 6, '#cbc8c4', .25);
  }
  head(g, x, hY, hS, o.face ?? {});
  A.forEach(arm => hand(g, arm.wrist[0], arm.wrist[1], arm.angle ?? 0, !!arm.open, o.skin ?? PROF.skin));
  g.restore();
}

function styledHead(g, x, y, s, o = {}) {
  const hair = o.hair ?? '#dfe2ea', shade = o.hairShade ?? '#a0a8bb';
  const pal = { ...PROF,
    skin: o.skin ?? PROF.skin, skinDk: o.skinDk ?? PROF.skinDk,
    stubble: o.stubble ?? o.skinDk ?? PROF.stubble, chin: o.chin ?? PROF.chin,
    tones: [[hair, shade], [hair, shade], [hair, shade]],
    stache: o.stache ?? hair, rim: o.rim ?? '#3d3d48', lens: o.lens ?? '#c8e0f8' };
  professorHead(g, x, y, s, o.ink ?? INK, pal, o.face ?? {});
}
function portraitBust(g, o = {}) {
  const x = o.x ?? 30, y = o.y ?? 28, scale = o.scale ?? 1;
  const ink = o.ink ?? INK;
  g.save(); g.translate(x, y); g.scale(scale, scale); g.translate(-x, -y);
  cape(g, x, y + 15, o.capeW ?? 41, o.capeH ?? 45, o.capeColor ?? '#252330', o.capeLining ?? '#a82f3b', ink);
  torso(g, x, y + 17, o.torsoW ?? 35, 42, o.shirt ?? '#eceef4', ink);
  rbox(g, x - 3.5, y + 8, 7, 14, 1, o.skin ?? PROF.skin, ink, .35);
  poly(g, [x - 6, y + 16, x - 1, y + 16, x, y + 22, x - 5, y + 20], o.collar ?? '#fffdf5', ink, .28);
  poly(g, [x + 6, y + 16, x + 1, y + 16, x, y + 22, x + 5, y + 20], o.collar ?? '#fffdf5', ink, .28);
  styledHead(g, x, y, o.headScale ?? 1.02, { ...o, face: o.face ?? { mouth: 'smirk' } });
  g.restore();
}
function medallion(g, x, y, r, color, ink = INK) {
  circ(g, x, y, r, color, ink, .45);
  circ(g, x, y, r * .82, null, ink, .28);
}
function travel(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Baroque court portrait: velvet, gilt molding, and one very pleased sitter.
  bg(g, '#38232a'); box(g, 2, 2, 56, 76, null, '#d6b45f', 1.2); box(g, 5, 5, 50, 70, null, '#8a6434', .45);
  poly(g, [3, 4, 12, 5, 9, 41, 5, 76, 1, 75], '#5e202b'); poly(g, [57, 4, 48, 5, 51, 41, 55, 76, 59, 75], '#5e202b');
  for (let y = 9; y < 71; y += 8) { circ(g, 4, y, .65, '#f2d98a'); circ(g, 56, y, .65, '#f2d98a'); }
  ell(g, 30, 31, 17, 22, '#7d5635', '#d7b65f', .7);
  portraitBust(g, { y: 29, headScale: 1.07, shirt: '#e2d6bd', capeColor: '#25212a', capeLining: '#9e2834', collar: '#d1af60', face: { mouth: 'smirk' } });
  poly(g, [24, 13, 26, 8, 29, 12, 31, 7, 34, 12, 37, 9, 38, 14], '#d8b45d', '#f3df9b', .45);
}); }
function nouveau(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Limited-colour 1940s screenprint portrait, posed with a proud flex.
  bg(g, '#efcf58'); box(g, 3, 3, 54, 74, null, '#2d5592', .75); box(g, 6, 6, 48, 68, '#dba83e');
  person(g, { headY: 30, headScale: .88, shoulderY: 40, waistY: 59, cape: false, shirt: '#386aaa', sleeve: '#386aaa', pants: '#263c5e',
    arms: [{ elbow: [16, 43], wrist: [22, 49], angle: -.8 }, { elbow: [43, 33], wrist: [37, 27], angle: .7 }] });
  poly(g, [20, 20, 30, 18, 38, 23, 30, 26, 21, 24], '#c93e46', INK, .4);
  for (const [x, y] of [[23, 22], [27, 21], [32, 22], [36, 23]]) circ(g, x, y, .36, '#f6e8c7');
  for (const y of [48, 53, 58, 63, 68]) for (let x = 6 + (y % 2) * 2; x < 54; x += 6) circ(g, x, y, .24, '#9e7840');
}); }
function woodblock(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Ukiyo-e portrait: a curling indigo wave mirrors his own silver mane.
  const paper = '#eee1bd', indigo = '#273c69'; bg(g, paper); ell(g, 49, 26, 7, 7, '#b64a43');
  g.beginPath(); g.moveTo(0, 77); g.bezierCurveTo(9, 70, 8, 42, 18, 40); g.bezierCurveTo(28, 37, 30, 20, 40, 18); g.bezierCurveTo(53, 14, 59, 27, 60, 41); g.lineTo(60, 80); g.lineTo(0, 80); g.closePath(); fs(g, indigo, '#1b2b4d', .75);
  g.beginPath(); g.moveTo(35, 28); g.bezierCurveTo(39, 12, 54, 13, 58, 24); g.bezierCurveTo(50, 20, 48, 29, 44, 32); g.bezierCurveTo(54, 28, 57, 35, 58, 40); g.bezierCurveTo(48, 35, 42, 39, 38, 43); g.closePath(); fs(g, paper, indigo, .65);
  for (let i = 0; i < 9; i++) line(g, 1 + i * 2, 65 - i * 1.1, 28 + i * 1.15, 48 - i * 1.3, '#a7bfd0', .3);
  for (let i = 0; i < 7; i++) { const x = 44 + i * 1.6, y = 23 + (i % 3) * 1.5; line(g, x, y, x + 1.2, y - 1.5, indigo, .36); }
  portraitBust(g, { y: 35, headScale: 1.0, shirt: '#d9cba8', capeColor: '#273c69', capeLining: '#bb4c3d', collar: paper, torsoW: 31 });
}); }
function cubist(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Picasso-inspired portrait that keeps the canonical Founder face intact and legible.
  bg(g, '#d6b17b');
  // Collaged colour planes frame the face; the real silver mane and specs remain visible.
  poly(g, [0, 0, 25, 0, 20, 14, 9, 21, 0, 18], '#c94739');
  poly(g, [35, 0, 60, 0, 60, 21, 48, 17, 42, 9], '#247d82');
  poly(g, [0, 45, 12, 42, 18, 55, 14, 80, 0, 80], '#e0c85a');
  poly(g, [60, 39, 48, 45, 43, 59, 48, 80, 60, 80], '#4d5b8f');
  poly(g, [6, 58, 15, 49, 27, 52, 34, 47, 51, 55, 58, 80, 2, 80], '#25364f', INK, .55);
  poly(g, [23, 43, 37, 43, 39, 53, 21, 53], '#c59163', INK, .4);
  poly(g, [21, 48, 29, 51, 24, 57, 17, 54], '#e7dfc8', INK, .35);
  poly(g, [39, 48, 32, 52, 38, 58, 45, 54], '#d3b24d', INK, .35);
  // Faceted cheek and brow shadows create a two-view Cubist feel without replacing his face.
  const skinFx = (ctx, cx, hy, R, RY) => {
    poly(ctx, [cx - R * .98, hy - RY * .12, cx - R * .12, hy - RY * .63,
      cx + R * .08, hy - RY * .02, cx - R * .28, hy + RY * .52,
      cx - R * .88, hy + RY * .28], '#c68162');
    poly(ctx, [cx + R * .12, hy - RY * .5, cx + R * .86, hy - RY * .22,
      cx + R * .98, hy + RY * .3, cx + R * .34, hy + RY * .54,
      cx + R * .12, hy + RY * .12], '#d8c18f');
    poly(ctx, [cx - R * .16, hy - RY * .02, cx + R * .18, hy - RY * .17,
      cx + R * .38, hy + RY * .18, cx + R * .05, hy + RY * .42], '#b96550');
  };
  styledHead(g, 30, 29, 1.34, { skin: '#e4b987', skinDk: '#a95c46', stubble: '#bc795a', chin: '#edd1a9',
    hair: '#e4e6df', hairShade: '#9ba5b3', stache: '#dce0e6', rim: '#22212a', lens: '#a9d4db',
    face: { mouth: 'smirk', skinFx } });
}); }
function warhol(g, iw, ih) { squareFrame(g, { iw, ih }, g => {
  // Warhol-style square silkscreen: four tight, repeatable crops of the Founder’s face.
  const panels = [
    { x: 0, y: 0, bg: '#f04a77', skin: '#f4d45a', shadow: '#ed8c2d', hair: '#22c0b3', shade: '#167b91', rim: '#9b1749', lens: '#ffe75a' },
    { x: 30, y: 0, bg: '#20a9c1', skin: '#f28c45', shadow: '#b84840', hair: '#f2d33d', shade: '#d99528', rim: '#27213d', lens: '#fae7d1' },
    { x: 0, y: 30, bg: '#e7d63c', skin: '#f18db2', shadow: '#bf3e6d', hair: '#d8d7ce', shade: '#767f9a', rim: '#30223e', lens: '#41d3db' },
    { x: 30, y: 30, bg: '#614f9f', skin: '#ecaa56', shadow: '#a95735', hair: '#ecedf0', shade: '#8c91a3', rim: '#211b34', lens: '#6fe0d4' },
  ];
  for (const p of panels) {
    box(g, p.x, p.y, 30, 30, p.bg);
    styledHead(g, p.x + 15, p.y + 18, 1.0, { skin: p.skin, skinDk: p.shadow, stubble: p.shadow, chin: p.skin,
      hair: p.hair, hairShade: p.shade, stache: p.hair, rim: p.rim, lens: p.lens, ink: '#27213d', face: { mouth: 'smirk' } });
  }
  // Fine ink gutters keep the print square and make the four colour passes read as a grid.
  line(g, 30, 0, 30, 60, '#1f1d2a', .8); line(g, 0, 30, 60, 30, '#1f1d2a', .8);
}); }
function bauhaus(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Bauhaus portrait: a face built from primary-colour blocks, circles and diagonals.
  bg(g, '#f0ead9');
  box(g, 0, 0, 60, 16, '#c93b35'); box(g, 0, 63, 60, 17, '#315eaa');
  circ(g, 14, 37, 13, '#e3bc38'); box(g, 31, 18, 27, 35, '#c93b35');
  poly(g, [12, 31, 20, 19, 31, 22, 42, 17, 50, 30, 47, 49, 38, 57, 20, 51], '#e8c398', '#20232b', .55);
  poly(g, [10, 25, 19, 13, 28, 20, 34, 12, 39, 21, 49, 16, 52, 31, 43, 27, 34, 30, 24, 24, 18, 35], '#d5d8df', '#20232b', .55);
  box(g, 18, 31, 10, 6, '#9fd7df', '#20232b', .45); poly(g, [33, 31, 44, 29, 42, 36, 33, 37], '#e9e5d7', '#20232b', .45); line(g, 28, 34, 33, 33, '#20232b', .7);
  poly(g, [30, 34, 27, 44, 36, 42, 33, 38], '#be694e', '#20232b', .45);
  ell(g, 31, 48, 10, 3.4, '#e8e5dc', '#20232b', .45);
  poly(g, [9, 61, 18, 53, 30, 59, 43, 53, 54, 62, 58, 80, 3, 80], '#20232b', '#20232b', .5);
  line(g, 8, 58, 53, 58, '#20232b', .6); circ(g, 47, 70, 4, '#e3bc38');
}); }
function noir(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Chiaroscuro portrait: a hard blade of light cuts through a near-black field.
  bg(g, '#12151b');
  for (let y = 12; y < 72; y += 8) line(g, 0, y, 17, y + 3, '#3a3b42', .55);
  poly(g, [13, 0, 42, 0, 28, 48, 8, 72, 0, 72, 0, 30], '#ddd6c6');
  portraitBust(g, { y: 29, headScale: 1.12, shirt: '#e5e0d6', capeColor: '#08090d', capeLining: '#501f27', collar: '#f4eee0', torsoW: 33 });
  poly(g, [31, 10, 60, 7, 60, 66, 42, 76, 29, 56, 35, 39], 'rgba(14,16,21,0.82)');
  line(g, 0, 74, 60, 67, '#a88752', .55);
}); }
function diner(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Art Nouveau lithograph: the portrait sits inside an ornamental floral halo.
  bg(g, '#f4e7c9'); box(g, 2, 2, 56, 76, null, '#ad783f', .65);
  ell(g, 30, 36, 23, 27, '#ead8a9', '#b8874c', .8);
  for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; line(g, 30 + Math.cos(t) * 20, 36 + Math.sin(t) * 23, 30 + Math.cos(t) * 23, 36 + Math.sin(t) * 26, '#8a9363', .55); }
  for (const x of [8, 52]) {
    g.beginPath(); g.moveTo(x, 73); g.bezierCurveTo(x < 30 ? 2 : 58, 54, x < 30 ? 18 : 42, 51, x, 33); pen(g, '#73804f', .8); g.stroke();
    for (let k = 0; k < 4; k++) ell(g, x + (x < 30 ? 1 : -1) * k * 1.2, 65 - k * 7, 2.1, 1.1, k % 2 ? '#b8a45e' : '#71804e', null, 0, -.55);
  }
  portraitBust(g, { y: 30, headScale: 1.08, shirt: '#e5d7b7', capeColor: '#344c3e', capeLining: '#8c3432', collar: '#d8bd7a', torsoW: 32 });
  for (const [x, y] of [[10, 20], [50, 20], [8, 52], [52, 52]]) circ(g, x, y, 1.8, '#b75b46', '#ead7a4', .3);
}); }
function psychedelic(g, iw, ih) { frame(g, { iw, ih }, g => {
  // 1980s airbrush science-fiction portrait: neon halo, planet and chrome colour.
  bg(g, '#201638');
  for (let r = 25; r > 12; r -= 3) ell(g, 30, 39, r, r * .82, r % 2 ? '#432760' : '#65325f');
  ell(g, 49, 20, 9, 9, '#e87849', '#ffd36a', .5); ell(g, 49, 18, 6, 6, '#f6ad4c');
  g.beginPath(); g.ellipse(30, 37, 24, 11, -.12, Math.PI * 1.05, Math.PI * 1.95); pen(g, '#ef7bc1', 1.1); g.stroke();
  portraitBust(g, { y: 31, headScale: 1.17, shirt: '#6654a5', capeColor: '#182d60', capeLining: '#db3c84', collar: '#54d5dc', skin: '#efa675', skinDk: '#ba615f', hair: '#e4e8f6', hairShade: '#7d86c3', stache: '#9fa5d4', lens: '#6de4eb', rim: '#392448', torsoW: 32 });
  for (let i = 0; i < 26; i++) { const x = (i * 17) % 60, y = (i * 23) % 80; circ(g, x, y, i % 5 === 0 ? .75 : .28, i % 2 ? '#f5d271' : '#dbe7e9'); }
}); }
function disco(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Surrealist portrait: the face repeats in melting mirrors over a silent plain.
  bg(g, '#ddc79d'); box(g, 0, 57, 60, 23, '#d4b880'); line(g, 0, 58, 60, 54, '#9d8559', .4);
  ell(g, 9, 40, 5, 15, '#b5a075', '#554c41', .6, -.16); ell(g, 51, 40, 5, 15, '#b5a075', '#554c41', .6, .16);
  styledHead(g, 9, 38, .42, { mouth: 'smirk', ink: '#3d342d' }); styledHead(g, 51, 38, .42, { mouth: 'smirk', ink: '#3d342d' });
  portraitBust(g, { y: 29, headScale: 1.14, shirt: '#eee1c2', capeColor: '#2e2a2a', capeLining: '#7e342f', collar: '#d0b67b', torsoW: 34, face: { mouth: 'smirk' } });
  ell(g, 5, 61, 4, 1.4, '#e9d9b5'); ell(g, 55, 59, 3.8, 1.2, '#e9d9b5');
}); }
function fitness(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Van Gogh-inspired portrait: swirling cobalt strokes orbit the silver mane.
  bg(g, '#1d4778');
  for (let i = 0; i < 18; i++) {
    const x = 5 + (i * 13) % 52, y = 8 + (i * 19) % 67, r = 3 + (i % 4) * 1.1;
    g.beginPath(); g.ellipse(x, y, r, r * .55, i * .37, .25, Math.PI * 1.48); pen(g, i % 3 ? '#e9c657' : '#78b9c0', .7); g.stroke();
  }
  portraitBust(g, { y: 30, headScale: 1.1, shirt: '#e4bd4e', capeColor: '#194568', capeLining: '#e1ac47', collar: '#f3dc85', skin: '#f0c69d', skinDk: '#c27d58', hair: '#dce3ec', hairShade: '#94a9c4', stache: '#d3dce9', torsoW: 34 });
  for (let i = 0; i < 10; i++) line(g, 3 + i * 6, 74, 7 + i * 6, 70 - i % 3, '#f1cf67', .35);
}); }
function medieval(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Byzantine icon: gold ground, stamped halo and jewel-like portrait blocks.
  bg(g, '#b88d30'); box(g, 2, 2, 56, 76, null, '#f2d47b', 1.1);
  for (let y = 5; y < 76; y += 4) for (let x = 5 + (y % 2) * 2; x < 56; x += 5) circ(g, x, y, .34, (x + y) % 2 ? '#d6b755' : '#f4dc8b');
  medallion(g, 30, 31, 22, '#e4bf4b', '#8c642a');
  for (let i = 0; i < 16; i++) { const t = i * Math.PI / 8; circ(g, 30 + Math.cos(t) * 19, 31 + Math.sin(t) * 19, 1, '#f2de94'); }
  portraitBust(g, { y: 29, headScale: 1.05, shirt: '#be9b42', capeColor: '#2d3154', capeLining: '#8e343b', collar: '#f1d46e', skin: '#e9bd8f', skinDk: '#b97f5f', hair: '#dfe4ea', hairShade: '#aaaeb8', stache: '#e4e2dd', torsoW: 34 });
}); }
function cutout(g, iw, ih) { frame(g, { iw, ih }, g => {
  // German Expressionist woodcut: angular ivory face, black cuts and a red shadow.
  bg(g, '#efe2c0'); box(g, 2, 2, 56, 76, null, '#22212a', .8);
  poly(g, [3, 5, 18, 8, 10, 41, 19, 75, 3, 76], '#ae3034');
  poly(g, [43, 6, 57, 3, 57, 76, 40, 72, 49, 42], '#24232b');
  portraitBust(g, { y: 30, headScale: 1.12, shirt: '#24232b', capeColor: '#17171b', capeLining: '#a72e37', collar: '#e8dcbf', skin: '#e8d9b7', skinDk: '#c4aa82', stubble: '#c4aa82', chin: '#e8d9b7', hair: '#f1e7ce', hairShade: '#b9ab8d', stache: '#e9e0cb', rim: '#1b1a20', lens: '#e1d6b6', ink: '#1b1a20', torsoW: 36 });
  for (let i = 0; i < 11; i++) line(g, 4 + i * 5, 8, 13 + i * 4, 2, '#1f1e23', .5);
  for (let i = 0; i < 9; i++) line(g, 4 + i * 6, 76, 13 + i * 5, 62, '#1f1e23', .45);
}); }
function safety(g, iw, ih) { frame(g, { iw, ih }, g => {
  // Sumi-e portrait: spare ink, rice paper and a broken enso brush circle.
  bg(g, '#eee8d8');
  g.beginPath(); g.ellipse(30, 39, 25, 30, -.16, -.1, Math.PI * 1.72); pen(g, '#25242a', 1.5); g.stroke();
  g.beginPath(); g.ellipse(30, 39, 23.5, 28.5, -.16, Math.PI * 1.08, Math.PI * 1.93); pen(g, '#77736c', .55); g.stroke();
  portraitBust(g, { y: 30, headScale: 1.06, shirt: '#dedbd3', capeColor: '#26252a', capeLining: '#8b3536', collar: '#f0ece2', skin: '#ded0bc', skinDk: '#aaa092', stubble: '#aaa092', chin: '#eee8dc', hair: '#eeece5', hairShade: '#878782', stache: '#d5d3ca', rim: '#29282d', lens: '#dce1e2', ink: '#26252a', torsoW: 32 });
  line(g, 7, 70, 14, 73, '#26252a', .45); line(g, 47, 72, 54, 68, '#26252a', .4);
}); }

export const ADDITIONAL_PROFESSOR_PIECES = Object.freeze({
  founderTravel: { name: 'BAROQUE COURT PORTRAIT', style: 'Baroque oil painting parody', pose: 'self-important bust in velvet, gilt molding, and a tiny crown', w: 76, h: 96, paint: travel, frame: '#d6b45f', mat: '#38232a', suggestedFloors: ['lobby'] },
  founderNouveau: { name: '1940S SCREENPRINT', style: 'limited-colour Rosie-inspired screenprint', pose: 'portrait bust with a proud flex and red scarf', w: 68, h: 96, paint: nouveau, frame: '#657347', mat: '#efcf58', suggestedFloors: ['lobby'] },
  founderDeco: { name: 'ART DECO MONUMENT', style: 'geometric Art Deco portrait', pose: 'monumental bust framed by a gold fan and stepped skyline', w: 66, h: 66, paint: fullPortrait(paintDecoPortrait), galleryPainter: true, plainFrame: '#292b32', frame: '#191c27', mat: '#d8b45d', suggestedFloors: ['lobby'] },
  founderWoodblock: { name: 'UKIYO-E WAVE PORTRAIT', style: 'Japanese ukiyo-e woodblock parody', pose: 'silver mane echoed by a curling indigo wave', w: 84, h: 68, paint: woodblock, frame: '#273c69', mat: '#eee1bd', suggestedFloors: ['open'] },
  founderCubist: { name: 'PICASSO CUBIST PORTRAIT', style: 'Picasso-inspired synthetic cubism', pose: 'a large recognizable Founder face with fractured Cubist planes', w: 76, h: 82, paint: cubist, frame: '#34343d', mat: '#d3b88d', suggestedFloors: ['exec'] },
  founderSurreal: { name: 'WARHOL FOUR-PANEL FACE PRINT', style: 'Warhol-inspired square four-panel silkscreen', pose: 'four tightly cropped repeats of his smirking face in fluorescent palettes', w: 88, h: 88, paint: warhol, frame: '#46354f', mat: '#dfc297', suggestedFloors: ['lobby', 'open'] },
  founderBauhaus: { name: 'BAUHAUS GEOMETRIC', style: 'Bauhaus portrait study', pose: 'face assembled from primary-colour blocks, circles, and diagonals', w: 76, h: 84, paint: bauhaus, frame: '#24262a', mat: '#f0ead9', suggestedFloors: ['open'] },
  founderNoir: { name: 'NOIR CHIAROSCURO', style: 'film-noir chiaroscuro portrait', pose: 'face cut by a hard diagonal blade of light', w: 70, h: 92, paint: noir, frame: '#20202b', mat: '#777584', suggestedFloors: ['exec'] },
  founderDiner: { name: 'ART NOUVEAU LITHOGRAPH', style: 'ornamental Art Nouveau lithograph', pose: 'portrait inside a floral halo and curling vines', w: 80, h: 86, paint: diner, frame: '#bd3f44', mat: '#fff0cd', suggestedFloors: ['lobby'] },
  founderPsychedelic: { name: '80S AIRBRUSH SCI-FI', style: '1980s airbrush science-fiction art', pose: 'chrome-coloured bust inside a neon orbital halo', w: 76, h: 96, paint: psychedelic, frame: '#52295e', mat: '#e7803f', suggestedFloors: ['open'] },
  founderDisco: { name: 'SURREALIST MIRROR PORTRAIT', style: 'Dalí-inspired surrealist painting', pose: 'one portrait reflected in two melting mirrors', w: 80, h: 92, paint: disco, frame: '#27213d', mat: '#eee6d3', suggestedFloors: ['lobby'] },
  founderFitness: { name: 'SWIRLING POST-IMPRESSIONIST', style: 'Van Gogh-inspired brushwork parody', pose: 'still portrait surrounded by bright cobalt swirls', w: 74, h: 94, paint: fitness, frame: '#303052', mat: '#ba5b42', suggestedFloors: ['open'] },
  founderMedieval: { name: 'BYZANTINE GOLD ICON', style: 'Byzantine mosaic icon', pose: 'front-facing portrait inside a jewel-stamped gold halo', w: 72, h: 94, paint: medieval, frame: '#514232', mat: '#17171c', suggestedFloors: ['exec'] },
  founderCutout: { name: 'EXPRESSIONIST WOODCUT', style: 'German Expressionist linocut', pose: 'angular ivory face carved from black and red shadows', w: 82, h: 76, paint: cutout, frame: '#327e7f', mat: '#16171b', suggestedFloors: ['lobby'] },
  founderSafety: { name: 'SUMI-E INK PORTRAIT', style: 'Japanese sumi-e ink painting', pose: 'quiet bust inside a broken enso brush circle', w: 76, h: 90, paint: safety, frame: '#376e72', mat: '#101116', suggestedFloors: ['open'] },
  founderGouache: { name: 'GOUACHE PORTRAIT', style: 'opaque gouache power portrait with dry-brush light', pose: 'close, nearly life-size stern bust in a dark cape and red-lined collar', w: 58, h: 70, paint: fullPortrait(paintGouachePortrait), galleryPainter: true, plainFrame: '#51493e', frame: '#3c4a43', mat: '#d5c4a0', suggestedFloors: ['lobby'] },
  founderMidcentury: { name: 'MID-CENTURY MODERN PORTRAIT', style: 'mid-century sunburst screenprint in cut-paper shapes', pose: 'formal centered bust against a teal-and-gold burst, red cape lining', w: 84, h: 84, paint: fullPortrait(paintMcmPortrait), galleryPainter: true, frame: '#594733', mat: '#e9dfc6', suggestedFloors: ['open'] },
  founderCutaway: { name: 'BUSYTOWN CUTAWAY PORTRAIT', style: 'Busytown storybook ink and watercolor portrait', pose: 'smaller framed bust on a muted green canvas with hand-drawn timber edges', w: 86, h: 96, paint: fullPortrait(paintCutawayPortrait), galleryPainter: true, frame: '#76523b', mat: '#eee0bf', suggestedFloors: ['exec'] },
  founderCrayon: { name: 'WAX CRAYON SELF-PORTRAIT', style: 'wax crayon and oil pastel on kraft paper', pose: 'close stern bust with broad dark shoulders and cream wax highlights', w: 76, h: 92, paint: fullPortrait(paintCrayonPortrait), galleryPainter: true, frame: '#71563d', mat: '#d7c39b', suggestedFloors: ['lobby'] },
});
