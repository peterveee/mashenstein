// Gallery-only: THE M-A-S-H LETTERS, a look bake-off (15 Oct 2026). Peter, once the
// letters were in Field Service 3 and Speed Zone 3: "id like to build the letters
// better... can we do a few options?" — "bakeoff".
//
// Every candidate paints into the same seam the shipped letters use
// (ctx, w, h, frame, letter, banked), at the same 12x14 box drawn 4/3 large, so
// the winner ports by copying one function into sprites/props.js. Each also
// draws its BANKED look: the letter an earlier attempt already took, still worth
// grabbing for the gold MASH, never to be mistaken for one you still need.
// Eight frames each, like the shipped glint. Nothing here is wired into the run.
import { MASH_LETTER_PATHS, rr, star } from '../sprites/props.js';

// COLOUR is the second question (Peter: "i don't like that it is gold ... could a
// different colour entirely work?"). Gold is the coins' and the toaster's colour,
// so a gold letter reads as more of the same. Every design is shown in each of
// these; a banked letter is the same neutral grey in all of them — no hue at all,
// so it never reads as one you still need.
export const MASH_LETTER_PALETTES = [
  { id: 'red', name: 'RED', face: '#e8403a', lite: '#ffa092', deep: '#a01e24', rim: '#3a0a10' },
  { id: 'teal', name: 'TEAL', face: '#22c4b2', lite: '#a2f4e6', deep: '#12857b', rim: '#06302c' },
  { id: 'violet', name: 'VIOLET', face: '#9a5cf0', lite: '#d6baff', deep: '#6030b4', rim: '#1e0c3a' },
  { id: 'gold', name: 'GOLD (now)', face: '#f6c945', lite: '#ffe68c', deep: '#d48a1c', rim: '#3a2108' },
];
const GREY = { face: '#d6dce6', lite: '#f4f6fa', deep: '#9aa4b4', rim: 'rgba(36,40,56,0.55)' };

export const MASH_LETTER_CANDIDATES = [
  { id: 'now', letter: 'WAS', name: 'stroke letter',
    note: 'What shipped until F replaced it: a bare letter in thick round strokes, two-tone, dark rim, a glint travelling along the top. Banked = grey outline, body punched out.' },
  { id: 'token', letter: 'A', name: 'COIN TOKEN',
    note: 'The letter embossed on a big token, so it reads as a prize at a glance. Glint sweeps the rim. Banked = a grey coin.' },
  { id: 'marquee', letter: 'B', name: 'MARQUEE BULBS',
    note: 'The letters have fallen off the arcade\'s marquee — so they look like it: a dark sign plate with the letter traced in bulbs that chase. Banked = the bulbs are out.' },
  { id: 'neon', letter: 'C', name: 'NEON TUBE',
    note: 'An arcade-sign neon letter: a coloured tube, white core, soft glow, one flicker per loop. No plate, so it is the lightest on screen. Banked = an unlit glass tube.' },
  { id: 'block', letter: 'D', name: 'LOGO BLOCK',
    note: 'A chunky title-screen letter: square-cut face, deep extrusion down and right, hard dark outline. The most "MASHENSTEIN logo". Banked = the face goes hollow.' },
  { id: 'cart', letter: 'E', name: 'CARTRIDGE',
    note: 'A tiny game cartridge with the letter on its label — four carts, one word. Most in keeping with "a game made of other games"; the busiest at 12px. Banked = a grey cart.' },
  { id: 'snes', letter: 'F', name: 'SNES CART (SHIPPED)',
    note: 'Peter: "i would like it to look like a game cartridge though.. an SNES or genesis style one would be ideal". The 16-bit grey cart: wider than tall, big rounded top corners, grip grooves down both sides, a full-colour label with the letter on it and the dark connector lip along the bottom. Banked = blank grey label.' },
  { id: 'genesis', letter: 'G', name: 'GENESIS CART',
    note: 'The black cart: taller than wide, shoulders cut in at the top, ribbed grip across the top band, the label below it with the console\'s red-on-black strip across its head and the letter on the colour panel. Banked = blank grey label.' },
  { id: 'nes', letter: 'H', name: 'NES CART',
    note: 'For comparison, the 8-bit one: a tall grey box, label on the upper half, the ridged grip across the bottom. Banked = blank grey label.' },
];

// The letter's strokes as a path in a box, from the shipped definitions.
function letterPath(c, L, x0, y0, bw, bh) {
  const X = (x) => x0 + x * bw, Y = (y) => y0 + y * bh;
  MASH_LETTER_PATHS[L]({
    m: (x, y) => c.moveTo(X(x), Y(y)),
    l: (x, y) => c.lineTo(X(x), Y(y)),
    c: (ax, ay, bx, by, x, y) => c.bezierCurveTo(X(ax), Y(ay), X(bx), Y(by), X(x), Y(y)),
  });
}
function strokeLetter(ctx, L, box, col, lw, cap = 'round') {
  ctx.beginPath(); letterPath(ctx, L, ...box);
  ctx.lineCap = cap; ctx.lineJoin = cap === 'round' ? 'round' : 'miter';
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
}
// Evenly spaced points along a letter's strokes, for the bulbs.
function letterPoints(L, box, step) {
  const pts = [], segs = [];
  let cur = null;
  const [x0, y0, bw, bh] = box;
  const P = (x, y) => [x0 + x * bw, y0 + y * bh];
  MASH_LETTER_PATHS[L]({
    m: (x, y) => { cur = P(x, y); },
    l: (x, y) => { const n = P(x, y); segs.push([cur, n]); cur = n; },
    c: (ax, ay, bx, by, x, y) => {
      const a = P(ax, ay), b = P(bx, by), e = P(x, y), s = cur;
      let prev = s;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12, u = 1 - t;
        const q = [u * u * u * s[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t * t * t * e[0],
          u * u * u * s[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * e[1]];
        segs.push([prev, q]); prev = q;
      }
      cur = e;
    },
  });
  let carry = 0;
  for (const [a, b] of segs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let d = carry;
    while (d <= len) { const t = d / len; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); d += step; }
    carry = d - len;
  }
  return pts;
}
function glint(ctx, x, y, u, frame) {
  const k = 0.35 + 0.65 * Math.sin((frame % 8 + 0.5) / 8 * Math.PI);
  ctx.save(); ctx.globalAlpha = k;
  ctx.beginPath(); star(ctx, x, y, u * (0.06 + 0.12 * k), u * 0.025, 4);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.restore();
}

const PAINT = {
  now(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h), lw = u * 0.19;
    const box = [w * 0.2, h * 0.14, w * 0.6, h * 0.72];
    if (banked) {
      strokeLetter(ctx, L, box, GREY.rim, lw + u * 0.16);
      strokeLetter(ctx, L, box, GREY.lite, lw + u * 0.1);
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      strokeLetter(ctx, L, box, '#000', lw);
      ctx.restore();
      return;
    }
    strokeLetter(ctx, L, box, P.rim, lw + u * 0.12);
    strokeLetter(ctx, L, box, P.deep, lw);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, box[1] + box[3] * 0.52); ctx.clip();
    strokeLetter(ctx, L, box, P.face, lw);
    ctx.restore();
    strokeLetter(ctx, L, [box[0] - lw * 0.12, box[1] - lw * 0.18, box[2], box[3]], 'rgba(255,255,255,0.6)', lw * 0.28);
    glint(ctx, box[0] + box[2] * ((frame % 8) + 0.5) / 8, box[1] + box[3] * 0.2, u, frame);
  },
  token(ctx, w, h, frame, L, banked, P) {
    const C = banked ? GREY : P;
    const u = Math.min(w, h), cx = w / 2, cy = h / 2, r = u * 0.47;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = banked ? '#6e7788' : C.rim; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2); ctx.fillStyle = C.face; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2); ctx.strokeStyle = C.lite; ctx.lineWidth = u * 0.04; ctx.stroke();
    const box = [cx - r * 0.42, cy - r * 0.46, r * 0.84, r * 0.92];
    strokeLetter(ctx, L, [box[0] + u * 0.02, box[1] + u * 0.03, box[2], box[3]], C.lite, u * 0.12);
    strokeLetter(ctx, L, box, banked ? '#7c8696' : C.rim, u * 0.12);
    if (!banked) {
      const a = ((frame % 8) + 0.5) / 8 * Math.PI * 2 - Math.PI / 2;
      glint(ctx, cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86, u, 4);
    }
  },
  marquee(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h);
    ctx.beginPath(); rr(ctx, w * 0.06, h * 0.04, w * 0.88, h * 0.92, u * 0.12);
    ctx.fillStyle = '#2a1830'; ctx.fill();
    ctx.strokeStyle = banked ? '#7a7484' : P.face; ctx.lineWidth = u * 0.06; ctx.stroke();
    const box = [w * 0.24, h * 0.17, w * 0.52, h * 0.66];
    strokeLetter(ctx, L, box, banked ? '#3e3346' : P.rim, u * 0.2);
    letterPoints(L, box, u * 0.15).forEach(([x, y], i) => {
      const lit = !banked && (i + frame) % 3 !== 0;
      if (lit) {
        ctx.save(); ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(x, y, u * 0.1, 0, Math.PI * 2); ctx.fillStyle = P.face; ctx.fill();
        ctx.restore();
      }
      ctx.beginPath(); ctx.arc(x, y, u * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = banked ? '#8e8496' : lit ? P.lite : P.deep; ctx.fill();
    });
  },
  neon(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h);
    const box = [w * 0.2, h * 0.14, w * 0.6, h * 0.72];
    if (banked) {
      strokeLetter(ctx, L, box, 'rgba(40,44,60,0.5)', u * 0.2);
      strokeLetter(ctx, L, box, 'rgba(220,226,236,0.8)', u * 0.12);
      strokeLetter(ctx, L, box, 'rgba(255,255,255,0.5)', u * 0.04);
      return;
    }
    ctx.save(); ctx.globalAlpha = frame % 8 !== 5 ? 1 : 0.55;
    ctx.save(); ctx.globalAlpha *= 0.3; strokeLetter(ctx, L, box, P.face, u * 0.34); ctx.restore();
    strokeLetter(ctx, L, box, P.rim, u * 0.17);
    strokeLetter(ctx, L, box, P.face, u * 0.12);
    strokeLetter(ctx, L, box, P.lite, u * 0.045);
    ctx.restore();
  },
  block(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h);
    const box = [w * 0.18, h * 0.12, w * 0.56, h * 0.66];
    const d = u * 0.1, lw = u * 0.2;
    const at = (i) => [box[0] + d * i / 4, box[1] + d * i / 4, box[2], box[3]];
    if (!banked) {
      for (let i = 1; i <= 4; i++) strokeLetter(ctx, L, at(i), P.rim, lw + u * 0.08, 'square');
      for (let i = 1; i <= 4; i++) strokeLetter(ctx, L, at(i), P.deep, lw, 'square');
    }
    strokeLetter(ctx, L, box, banked ? GREY.rim : P.rim, lw + u * 0.08, 'square');
    strokeLetter(ctx, L, box, banked ? GREY.lite : P.face, lw, 'square');
    if (banked) {
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      strokeLetter(ctx, L, box, '#000', lw - u * 0.08, 'square');
      ctx.restore();
    } else {
      strokeLetter(ctx, L, [box[0] - lw * 0.15, box[1] - lw * 0.2, box[2], box[3]], P.lite, lw * 0.22, 'square');
      glint(ctx, box[0] + box[2] * ((frame % 8) + 0.5) / 8, box[1] + box[3] * 0.15, u, frame);
    }
  },
  cart(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h);
    const x = w * 0.1, y = h * 0.06, cw = w * 0.8, ch = h * 0.88;
    ctx.beginPath();
    ctx.moveTo(x, y + ch); ctx.lineTo(x, y + ch * 0.12); ctx.lineTo(x + cw * 0.12, y);
    ctx.lineTo(x + cw, y); ctx.lineTo(x + cw, y + ch); ctx.closePath();
    ctx.fillStyle = banked ? '#9aa2ae' : '#6b6f7c'; ctx.fill();
    ctx.strokeStyle = '#25262e'; ctx.lineWidth = u * 0.05; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + cw * (0.2 + i * 0.18), y + ch * 0.86, cw * 0.1, ch * 0.08);
    ctx.beginPath(); rr(ctx, x + cw * 0.12, y + ch * 0.14, cw * 0.76, ch * 0.62, u * 0.05);
    ctx.fillStyle = banked ? GREY.face : P.face; ctx.fill();
    strokeLetter(ctx, L, [x + cw * 0.28, y + ch * 0.22, cw * 0.44, ch * 0.46], banked ? '#7c8696' : P.rim, u * 0.11);
    if (!banked) glint(ctx, x + cw * (0.15 + 0.7 * ((frame % 8) + 0.5) / 8), y + ch * 0.18, u, frame);
  },
  snes(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h);
    const bw = w * 0.96, bh = h * 0.7, x = (w - bw) / 2, y = h * 0.16;
    // Shell: big round top corners, tight bottom ones.
    ctx.beginPath();
    const R = bh * 0.32, r = bh * 0.08;
    ctx.moveTo(x, y + bh - r); ctx.lineTo(x, y + R); ctx.quadraticCurveTo(x, y, x + R, y);
    ctx.lineTo(x + bw - R, y); ctx.quadraticCurveTo(x + bw, y, x + bw, y + R);
    ctx.lineTo(x + bw, y + bh - r); ctx.quadraticCurveTo(x + bw, y + bh, x + bw - r, y + bh);
    ctx.lineTo(x + r, y + bh); ctx.quadraticCurveTo(x, y + bh, x, y + bh - r); ctx.closePath();
    ctx.fillStyle = banked ? '#b4b8c2' : '#a3a5b2'; ctx.fill();
    ctx.strokeStyle = '#3c3e4a'; ctx.lineWidth = u * 0.06; ctx.stroke();
    // Top face highlight and the connector lip.
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + R * 0.7, y + u * 0.04, bw - R * 1.4, u * 0.05);
    ctx.fillStyle = '#5a5c68'; ctx.fillRect(x + bw * 0.12, y + bh - u * 0.1, bw * 0.76, u * 0.07);
    // Grip grooves down both sides.
    ctx.fillStyle = 'rgba(40,42,52,0.45)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + bw * 0.045, y + bh * (0.3 + i * 0.16), bw * 0.07, u * 0.035);
      ctx.fillRect(x + bw * 0.885, y + bh * (0.3 + i * 0.16), bw * 0.07, u * 0.035);
    }
    // The label.
    const lx = x + bw * 0.18, ly = y + bh * 0.16, lw = bw * 0.64, lh = bh * 0.62;
    ctx.beginPath(); rr(ctx, lx, ly, lw, lh, u * 0.04);
    ctx.fillStyle = banked ? '#d2d6de' : P.face; ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,40,0.5)'; ctx.lineWidth = u * 0.03; ctx.stroke();
    if (!banked) {
      const box = [lx + lw * 0.27, ly + lh * 0.14, lw * 0.46, lh * 0.72];
      strokeLetter(ctx, L, box, P.rim, u * 0.16);
      strokeLetter(ctx, L, box, '#ffffff', u * 0.09);
      glint(ctx, lx + lw * ((frame % 8) + 0.5) / 8, ly + lh * 0.12, u, frame);
    }
  },
  genesis(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h);
    const bw = w * 0.74, bh = h * 0.9, x = (w - bw) / 2, y = h * 0.05;
    const sh = bw * 0.1;
    ctx.beginPath();
    ctx.moveTo(x + sh, y); ctx.lineTo(x + bw - sh, y); ctx.lineTo(x + bw, y + bh * 0.1);
    ctx.lineTo(x + bw, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + bh * 0.1); ctx.closePath();
    ctx.fillStyle = banked ? '#7c808c' : '#22232a'; ctx.fill();
    ctx.strokeStyle = banked ? '#4a4e5a' : '#0c0c10'; ctx.lineWidth = u * 0.06; ctx.stroke();
    // Ribbed grip across the top band.
    ctx.fillStyle = banked ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.16)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + bw * 0.14, y + bh * (0.06 + i * 0.07), bw * 0.72, u * 0.035);
    // The label: a red-on-black strip across its head, then the colour panel.
    const lx = x + bw * 0.1, ly = y + bh * 0.3, lw = bw * 0.8, lh = bh * 0.62;
    ctx.fillStyle = banked ? '#c8ccd4' : '#111114'; ctx.fillRect(lx, ly, lw, lh * 0.2);
    if (!banked) { ctx.fillStyle = '#e03a30'; ctx.fillRect(lx, ly + lh * 0.07, lw, lh * 0.06); }
    ctx.fillStyle = banked ? '#d2d6de' : P.face; ctx.fillRect(lx, ly + lh * 0.2, lw, lh * 0.8);
    if (!banked) {
      const box = [lx + lw * 0.22, ly + lh * 0.3, lw * 0.56, lh * 0.6];
      strokeLetter(ctx, L, box, P.rim, u * 0.16);
      strokeLetter(ctx, L, box, '#ffffff', u * 0.09);
      glint(ctx, lx + lw * ((frame % 8) + 0.5) / 8, ly + lh * 0.3, u, frame);
    }
  },
  nes(ctx, w, h, frame, L, banked, P) {
    const u = Math.min(w, h);
    const bw = w * 0.8, bh = h * 0.92, x = (w - bw) / 2, y = h * 0.04;
    ctx.beginPath(); rr(ctx, x, y, bw, bh, u * 0.03);
    ctx.fillStyle = banked ? '#b4b8c2' : '#9a9ca8'; ctx.fill();
    ctx.strokeStyle = '#3c3e4a'; ctx.lineWidth = u * 0.06; ctx.stroke();
    ctx.fillStyle = 'rgba(40,42,52,0.4)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + bw * 0.12, y + bh * (0.72 + i * 0.06), bw * 0.76, u * 0.03);
    const lx = x + bw * 0.12, ly = y + bh * 0.08, lw = bw * 0.76, lh = bh * 0.56;
    ctx.fillStyle = banked ? '#d2d6de' : P.face; ctx.fillRect(lx, ly, lw, lh);
    if (!banked) {
      const box = [lx + lw * 0.22, ly + lh * 0.16, lw * 0.56, lh * 0.68];
      strokeLetter(ctx, L, box, P.rim, u * 0.16);
      strokeLetter(ctx, L, box, '#ffffff', u * 0.09);
      glint(ctx, lx + lw * ((frame % 8) + 0.5) / 8, ly + lh * 0.12, u, frame);
    }
  },
};

export function drawMashLetterCandidate(ctx, id, w, h, frame, letter, banked = false, palette = 'gold') {
  const P = MASH_LETTER_PALETTES.find((q) => q.id === palette) || MASH_LETTER_PALETTES[3];
  ctx.save();
  (PAINT[id] || PAINT.now)(ctx, w, h, frame, letter, banked, P);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ROUND TWO: VARIATIONS ON THE SNES CART (15 Oct 2026). Peter picked F with the
// labels in the Super Famicom's four button colours, then: "can we bake off a few
// variations on the SNES cartridge...". Same seam, same 12x14 box drawn 4/3.
export const SFC = { M: '#e0342c', A: '#f6c21c', S: '#1fa34a', H: '#2a6fd0' };
export const SNES_VARIANTS = [
  { id: 'ship', letter: 'NOW', name: 'what ships',
    note: 'Grey 16-bit cart, rounded top corners, grips, connector lip; the label in the letter\'s Super Famicom colour with a white letter.' },
  { id: 'strip', letter: 'A', name: 'LABEL WITH A TITLE STRIP',
    note: 'A real Super Famicom label has a white band across its top with the logo\'s four coloured dots. Here: the strip and its dots, the coloured panel below with the letter. Most like the real thing; busiest.' },
  { id: 'invert', letter: 'B', name: 'GREY LABEL, COLOUR LETTER',
    note: 'The label goes pale and the letter carries the colour. Calmer cart, the letter reads first; the colour is a smaller patch so it shouts less at 12px.' },
  { id: 'shell', letter: 'C', name: 'COLOURED SHELL',
    note: 'The whole shell in the letter\'s colour — like the special-edition carts — with a white label and a dark letter. The loudest; four carts, four colours at a glance.' },
  { id: 'us', letter: 'D', name: 'US SNES SHAPE',
    note: 'The North American cart instead: square top with the two notches in its shoulders and ribs across the top face. Reads more "box", less "Japanese cartridge".' },
  { id: 'glow', letter: 'E', name: 'NOW + A GLOW',
    note: 'What ships, sitting in a soft halo of its own colour, so it lifts off busy backgrounds (Frost\'s snow, Speed\'s dusk) the way the power capsules do.' },
  // Peter: "i like E (with glow) but I would like to try it with a smaller
  // rectangular label so it is more proportional to a japanese SNES cart".
  { id: 'glow-jp1', letter: 'E1', name: 'GLOW, JP LABEL (SHIPPED)',
    note: 'E with a Super Famicom-proportioned label: a square-cornered landscape rectangle about three fifths of the cart\'s width and two fifths of its height, set high on the face, with more grey shell around it.' },
  { id: 'glow-jp2', letter: 'E2', name: 'GLOW, SMALLER JP LABEL',
    note: 'E1 a step smaller still — the label is a patch on the shell rather than the face of it. The letter is at its smallest here; the colour still carries.' },
  { id: 'glow-jp3', letter: 'E3', name: 'GLOW, JP LABEL + LOGO BAND',
    note: 'E1\'s label with a slim grey band moulded above it, where the real cart carries its embossed logo — the most Super Famicom of the three.' },
];

function snesShellPath(ctx, x, y, bw, bh) {
  const R = bh * 0.32, r = bh * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y + bh - r); ctx.lineTo(x, y + R); ctx.quadraticCurveTo(x, y, x + R, y);
  ctx.lineTo(x + bw - R, y); ctx.quadraticCurveTo(x + bw, y, x + bw, y + R);
  ctx.lineTo(x + bw, y + bh - r); ctx.quadraticCurveTo(x + bw, y + bh, x + bw - r, y + bh);
  ctx.lineTo(x + r, y + bh); ctx.quadraticCurveTo(x, y + bh, x, y + bh - r); ctx.closePath();
}
function snesDetails(ctx, x, y, bw, bh, u, R) {
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + R * 0.7, y + u * 0.04, bw - R * 1.4, u * 0.05);
  ctx.fillStyle = '#5a5c68'; ctx.fillRect(x + bw * 0.12, y + bh - u * 0.1, bw * 0.76, u * 0.07);
  ctx.fillStyle = 'rgba(40,42,52,0.45)';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + bw * 0.045, y + bh * (0.3 + i * 0.16), bw * 0.07, u * 0.035);
    ctx.fillRect(x + bw * 0.885, y + bh * (0.3 + i * 0.16), bw * 0.07, u * 0.035);
  }
}
function labelLetter(ctx, L, lx, ly, lw, lh, u, body, rim) {
  // The letter's height follows the label's; its width follows its height, so a
  // short landscape label gets a smaller letter rather than a squashed one.
  const bh = lh * 0.72, bw = Math.min(lw * 0.6, bh * 0.85);
  const box = [lx + (lw - bw) / 2, ly + lh * 0.14, bw, bh];
  const k = Math.min(1, bh / (u * 0.5));
  strokeLetter(ctx, L, box, rim, u * 0.16 * Math.max(0.7, k));
  strokeLetter(ctx, L, box, body, u * 0.09 * Math.max(0.7, k));
}
function cartGlint(ctx, lx, ly, lw, lh, u, frame) {
  glint(ctx, lx + lw * ((frame % 8) + 0.5) / 8, ly + lh * 0.12, u, frame);
}

const SNES_PAINT = {
  ship(ctx, w, h, frame, L, banked, opts = {}) {
    const u = Math.min(w, h);
    const bw = w * 0.96, bh = h * 0.7, x = (w - bw) / 2, y = h * 0.16, R = bh * 0.32;
    snesShellPath(ctx, x, y, bw, bh);
    ctx.fillStyle = opts.shell || (banked ? '#b4b8c2' : '#a3a5b2'); ctx.fill();
    ctx.strokeStyle = '#3c3e4a'; ctx.lineWidth = u * 0.06; ctx.stroke();
    snesDetails(ctx, x, y, bw, bh, u, R);
    // `lab` = [width, height, top] of the label as fractions of the shell; JP
    // proportions are a landscape rectangle with square corners.
    const [fw, fh, ft] = opts.lab || [0.64, 0.62, 0.16];
    const lw = bw * fw, lh = bh * fh, lx = x + (bw - lw) / 2, ly = y + bh * ft;
    if (opts.band) {
      ctx.fillStyle = 'rgba(60,62,74,0.35)';
      ctx.fillRect(lx + lw * 0.1, y + bh * 0.1, lw * 0.8, bh * 0.06);
    }
    ctx.beginPath(); rr(ctx, lx, ly, lw, lh, opts.lab ? u * 0.01 : u * 0.04);
    ctx.fillStyle = banked ? '#d2d6de' : (opts.label || SFC[L]); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,40,0.5)'; ctx.lineWidth = u * 0.03; ctx.stroke();
    if (banked) { strokeLetter(ctx, L, [lx + lw * 0.27, ly + lh * 0.14, lw * 0.46, lh * 0.72], 'rgba(120,128,144,0.55)', u * 0.08); return; }
    labelLetter(ctx, L, lx, ly, lw, lh, u, opts.letter || '#ffffff', opts.rim || '#2a1a20');
    cartGlint(ctx, lx, ly, lw, lh, u, frame);
  },
  strip(ctx, w, h, frame, L, banked) {
    const u = Math.min(w, h);
    const bw = w * 0.96, bh = h * 0.7, x = (w - bw) / 2, y = h * 0.16, R = bh * 0.32;
    snesShellPath(ctx, x, y, bw, bh);
    ctx.fillStyle = banked ? '#b4b8c2' : '#a3a5b2'; ctx.fill();
    ctx.strokeStyle = '#3c3e4a'; ctx.lineWidth = u * 0.06; ctx.stroke();
    snesDetails(ctx, x, y, bw, bh, u, R);
    const lx = x + bw * 0.16, ly = y + bh * 0.12, lw = bw * 0.68, lh = bh * 0.68;
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(lx, ly, lw, lh * 0.22);
    if (!banked) ['M', 'A', 'S', 'H'].forEach((k, i) => {
      ctx.beginPath(); ctx.arc(lx + lw * (0.2 + i * 0.2), ly + lh * 0.11, u * 0.035, 0, Math.PI * 2);
      ctx.fillStyle = SFC[k]; ctx.fill();
    });
    ctx.fillStyle = banked ? '#d2d6de' : SFC[L]; ctx.fillRect(lx, ly + lh * 0.22, lw, lh * 0.78);
    ctx.strokeStyle = 'rgba(30,30,40,0.5)'; ctx.lineWidth = u * 0.03; ctx.strokeRect(lx, ly, lw, lh);
    const box = [lx + lw * 0.3, ly + lh * 0.3, lw * 0.4, lh * 0.6];
    if (banked) { strokeLetter(ctx, L, box, 'rgba(120,128,144,0.55)', u * 0.08); return; }
    strokeLetter(ctx, L, box, '#2a1a20', u * 0.15);
    strokeLetter(ctx, L, box, '#ffffff', u * 0.085);
    cartGlint(ctx, lx, ly + lh * 0.2, lw, lh, u, frame);
  },
  invert(ctx, w, h, frame, L, banked) {
    SNES_PAINT.ship(ctx, w, h, frame, L, banked, { label: '#eef0f4', letter: SFC[L], rim: '#24202a' });
  },
  shell(ctx, w, h, frame, L, banked) {
    SNES_PAINT.ship(ctx, w, h, frame, L, banked, banked ? {} : { shell: SFC[L], label: '#f6f6f2', letter: SFC[L], rim: '#24202a' });
  },
  us(ctx, w, h, frame, L, banked) {
    const u = Math.min(w, h);
    const bw = w * 0.9, bh = h * 0.74, x = (w - bw) / 2, y = h * 0.14;
    const n = bw * 0.12;
    ctx.beginPath();
    ctx.moveTo(x, y + bh); ctx.lineTo(x, y + bh * 0.16); ctx.lineTo(x + n * 0.5, y + bh * 0.16);
    ctx.lineTo(x + n, y); ctx.lineTo(x + bw - n, y); ctx.lineTo(x + bw - n * 0.5, y + bh * 0.16);
    ctx.lineTo(x + bw, y + bh * 0.16); ctx.lineTo(x + bw, y + bh); ctx.closePath();
    ctx.fillStyle = banked ? '#b4b8c2' : '#8e8a9c'; ctx.fill();
    ctx.strokeStyle = '#34323e'; ctx.lineWidth = u * 0.06; ctx.stroke();
    ctx.fillStyle = 'rgba(30,30,40,0.35)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x + n * 1.2, y + bh * (0.05 + i * 0.05), bw - n * 2.4, u * 0.025);
    const lx = x + bw * 0.14, ly = y + bh * 0.26, lw = bw * 0.72, lh = bh * 0.6;
    ctx.fillStyle = banked ? '#d2d6de' : SFC[L]; ctx.fillRect(lx, ly, lw, lh);
    ctx.strokeStyle = 'rgba(30,30,40,0.5)'; ctx.lineWidth = u * 0.03; ctx.strokeRect(lx, ly, lw, lh);
    if (banked) { strokeLetter(ctx, L, [lx + lw * 0.27, ly + lh * 0.14, lw * 0.46, lh * 0.72], 'rgba(120,128,144,0.55)', u * 0.08); return; }
    labelLetter(ctx, L, lx, ly, lw, lh, u, '#ffffff', '#2a1a20');
    cartGlint(ctx, lx, ly, lw, lh, u, frame);
  },
  glow(ctx, w, h, frame, L, banked, opts = {}) {
    if (!banked) {
      const u = Math.min(w, h), cx = w / 2, cy = h * 0.5;
      const g = ctx.createRadialGradient(cx, cy, u * 0.1, cx, cy, u * 0.75);
      g.addColorStop(0, SFC[L] + 'aa'); g.addColorStop(1, SFC[L] + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    SNES_PAINT.ship(ctx, w, h, frame, L, banked, opts);
  },
  // Widened 0.54 -> 0.62 (Peter: "E1 is fine... could we make the label a touch wider?").
  'glow-jp1': (ctx, w, h, frame, L, banked) => SNES_PAINT.glow(ctx, w, h, frame, L, banked, { lab: [0.62, 0.42, 0.24] }),
  'glow-jp2': (ctx, w, h, frame, L, banked) => SNES_PAINT.glow(ctx, w, h, frame, L, banked, { lab: [0.46, 0.36, 0.26] }),
  'glow-jp3': (ctx, w, h, frame, L, banked) => SNES_PAINT.glow(ctx, w, h, frame, L, banked, { lab: [0.54, 0.42, 0.3], band: true }),
};

export function drawSnesVariant(ctx, id, w, h, frame, letter, banked = false) {
  ctx.save();
  (SNES_PAINT[id] || SNES_PAINT.ship)(ctx, w, h, frame, letter, banked);
  ctx.restore();
}
