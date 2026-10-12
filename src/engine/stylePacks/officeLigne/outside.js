// Corporate Kombat: LIGNE ’89 outside painter. Shared with the preserved bake-off.
import { poly, line, box, hash, copies, lines, textW, letters, pen, textPath, neon, TAU, W, circ, ell, rbox, VPX } from './line.js';
import { crownPath } from './wall.js';
import { OFFICE_FONT } from './line.js';

function farBuilding(g, b, Pf, dusk) {
  const { u: x, w, top, base } = b;
  const face = Pf.tones[b.tone];
  const ln = Pf.line;
  const lw = Pf.lw;
  const cx = x + w / 2;
  if (b.roof === 'spire') poly(g, [cx - w * 0.14, top, cx, top - 18, cx + w * 0.14, top], face, ln, lw);
  if (b.roof === 'antenna') { line(g, cx, top, cx, top - 14, ln, lw); line(g, cx - 3, top - 8, cx + 3, top - 8, ln, lw); }
  if (b.roof === 'stepped') {
    box(g, x + w * 0.18, top - 9, w * 0.64, 9, face, ln, lw);
    box(g, x + w * 0.32, top - 16, w * 0.36, 7, face, ln, lw);
  }
  box(g, x, top, w, base - top, face, ln, lw);
  const cw = (w - 3) / b.cols;
  if (dusk) {
    for (let r = 0, y = top + 2; y < base - 2; r++, y += b.floorH * 0.7) {
      for (let c = 0; c < b.cols; c++) {
        const hv = hash(b.i * 53.1 + r * 7.7 + c * 3.1);
        const on = hv < b.lit;
        g.fillStyle = on ? (hv < b.lit * 0.2 ? Pf.litAlt[(r + c) % 2] : Pf.lit) : Pf.dark;
        g.fillRect(x + 1.5 + c * cw + cw * 0.25, y, Math.max(0.8, cw * 0.5), b.floorH * 0.32);
      }
    }
  } else {
    g.fillStyle = Pf.win;
    for (let y = top + 3; y < base - 3; y += b.floorH) {
      for (let c = 0; c < b.cols; c++) g.fillRect(x + 1.5 + c * cw + cw * 0.28, y, cw * 0.44, b.floorH * 0.42);
    }
    line(g, x + 0.5, top + 1.2, x + w - 0.5, top + 1.2, ln, lw * 0.8);
  }
}

function paintFar(g, F, P, u0, u1) {
  const per = 1400;
  const dusk = F.id === 'exec';
  for (const b of F.outside.far) {
    for (const u of copies(b.u, b.w, per, u0, u1)) farBuilding(g, { ...b, u }, P.far, dusk);
  }
  if (dusk) {
    // the haze the carpet of blocks sinks into, and the sea of roofs beyond it
    g.fillStyle = P.haze;
    g.fillRect(u0, 176, u1 - u0, 8);
    g.fillStyle = 'rgba(222,150,150,0.18)';
    g.fillRect(u0, 184, u1 - u0, 6);
  }
}

// Rooftop billboards: the parody brands from the lobby's own shop fronts (SHOPS 0-9).
const AD = [
  { bg: '#ff6fae', ink: '#ffffff', text: 'PIZZA HURT' },
  { bg: '#1f1d26', ink: '#3fe0d0', text: 'BLOCKBUSTED' },
  { bg: '#2fbcb0', ink: '#fff6a8', text: 'K-MARTYR' },
  { bg: '#f6df4a', ink: '#1f1d26', text: 'SEARS & TEARS' },
  { bg: '#3c3a5e', ink: '#ffd77a', text: 'TOYS R SUS' },
  { bg: '#ffffff', ink: '#c64a3e', text: 'RADIO WRECK' },
];
// The blimp's banner trails down to about y 110; a billboard only goes on a roof low enough to
// stay clear of it, the others get a water tank.
const BILLBOARD_MIN_ROOF = 132;

const SHOPS = [
  'BLOCKBUSTED', 'THE PANT RANCH', 'TOWER WRECKORDS', 'SHORT CIRCUIT CITY',
  'TOYS R SUS', 'BANANA REPUBLICAN', 'RADIO WRECK', 'SEARS & TEARS',
  'K-MARTYR', 'PIZZA HURT', "GARY'S PAWN", 'PAYDAY LOANS',
  'WAL-GREED', 'COMP-U-SIGH', 'SAM GOODY-GOODY', 'WOOLWORTHLESS',
  'GAP YEAR', 'RADIO SHACKED', 'GOODBYE GUYS', 'SUBWAY DELAY',
];

function waterTank(g, cx, roofY, Pn, wood, woodDk, s = 1) {
  const ln = Pn.line;
  const lw = Pn.lw;
  lines(g, [cx - 4.5 * s, roofY, cx - 4 * s, roofY - 6 * s, cx + 4.5 * s, roofY, cx + 4 * s, roofY - 6 * s,
    cx, roofY, cx, roofY - 6 * s, cx - 4.3 * s, roofY - 1.5 * s, cx + 4.3 * s, roofY - 4.5 * s], ln, lw);
  box(g, cx - 5.5 * s, roofY - 17 * s, 11 * s, 11 * s, wood, ln, lw);
  lines(g, [cx - 5.5 * s, roofY - 14 * s, cx + 5.5 * s, roofY - 14 * s, cx - 5.5 * s, roofY - 9 * s, cx + 5.5 * s, roofY - 9 * s], woodDk, lw);
  lines(g, [cx - 2 * s, roofY - 17 * s, cx - 2 * s, roofY - 6 * s, cx + 1.8 * s, roofY - 17 * s, cx + 1.8 * s, roofY - 6 * s], woodDk, lw * 0.7);
  poly(g, [cx - 6.5 * s, roofY - 17 * s, cx, roofY - 22.5 * s, cx + 6.5 * s, roofY - 17 * s], woodDk, ln, lw);
  line(g, cx, roofY - 22.5 * s, cx, roofY - 24.5 * s, ln, lw);
}

// The size at which `text` in bold office lettering fits `maxW` with room either side.
function bannerSize(ctx, text, maxW, size, track) {
  ctx.save();
  ctx.font = `700 ${size * 1.18}px ${OFFICE_FONT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${size * 0.06 + track * size / 6}px`;
  const w = ctx.measureText(text).width || textW(text, size, track);
  ctx.restore();
  return Math.min(size, size * maxW / w);
}

function billboard(g, x, roofY, w, i, Pn) {
  const ln = Pn.line;
  const lw = Pn.lw;
  const ad = AD[i % AD.length];
  const h = 15;
  const y = roofY - 4 - h;
  lines(g, [x + 4, roofY, x + 4, y + h, x + w - 4, roofY, x + w - 4, y + h, x + 4, roofY, x + w * 0.5, y + h, x + w - 4, roofY, x + w * 0.5, y + h], ln, lw);
  box(g, x, y, w, h, ad.bg, ln, lw);
  box(g, x + 1.2, y + 1.2, w - 2.4, h - 2.4, null, ad.ink, 0.35);
  const size = Math.min(8.5, (w - 8) / Math.max(1, textW(ad.text, 6) / 6));
  letters(g, ad.text, x + w / 2, y + h / 2 + size / 2, size, { ink: ad.ink, lw: size * 0.15, align: 'center' });
  // the lamps that light it at night, on their goosenecks
  for (const lx of [x + w * 0.25, x + w * 0.75]) {
    g.beginPath();
    g.moveTo(lx, y);
    g.quadraticCurveTo(lx, y - 3, lx + 2.5, y - 3);
    pen(g, ln, lw);
    g.stroke();
  }
}

function roofFurniture(g, b, Pn, P) {
  const x = b.u;
  const w = b.w;
  const t = b.top;
  const face = Pn.tones[b.tone];
  const ln = Pn.line;
  const lw = Pn.lw;
  const h = (n) => hash(b.i * 37.1 + n);
  const cx = x + w / 2;
  switch (b.roof) {
    case 'tank':
      waterTank(g, x + w * (0.2 + 0.35 * h(1)), t, Pn, P.tank || '#ad8155', P.tankDk || '#8b6440');
      if (w > 90) waterTank(g, x + w * 0.8, t, Pn, P.tank || '#ad8155', P.tankDk || '#8b6440', 0.8);
      break;
    case 'billboard':
      if (t >= BILLBOARD_MIN_ROOF) billboard(g, x + 7, t, Math.min(70, w - 14), b.i, Pn);
      else waterTank(g, x + w * (0.2 + 0.35 * h(1)), t, Pn, P.tank || '#ad8155', P.tankDk || '#8b6440');
      break;
    case 'spire':
      box(g, cx - w * 0.3, t - 9, w * 0.6, 9, face, ln, lw);
      box(g, cx - w * 0.17, t - 17, w * 0.34, 8, face, ln, lw);
      poly(g, [cx - 2.2, t - 17, cx, t - 44, cx + 2.2, t - 17], face, ln, lw);
      break;
    case 'stepped': {
      const fh = b.floorH;
      box(g, x + w * 0.12, t - fh * 2.5, w * 0.76, fh * 2.5, face, ln, lw);
      box(g, x + w * 0.27, t - fh * 4.5, w * 0.46, fh * 2, face, ln, lw);
      break;
    }
    case 'antenna':
      lines(g, [cx, t, cx, t - 30, cx - 4, t - 12, cx + 4, t - 12, cx - 2.5, t - 21, cx + 2.5, t - 21], ln, lw);
      break;
    case 'flat':
      if (h(4) < 0.6) {
        // a stair bulkhead and a vent
        box(g, x + w * (0.15 + 0.4 * h(5)), t - 6, 10, 6, Pn.shade ? Pn.shade[b.tone] : face, ln, lw);
        box(g, x + w * 0.7, t - 3, 5, 3, Pn.shade ? Pn.shade[b.tone] : face, ln, lw);
      }
      break;
    default:
      break;
  }
}

function dayFacade(g, b, Pn, P, opts) {
  const x = b.u;
  const w = b.w;
  const t = b.top;
  const base = b.base;
  const face = Pn.tones[b.tone];
  const dk = Pn.shade[b.tone];
  const ln = Pn.line;
  const lw = Pn.lw;
  roofFurniture(g, b, Pn, P);
  box(g, x, t, w, base - t, face, ln, lw);
  const shopH = opts.shops && b.shop != null ? 44 : 0;
  const bottom = base - (shopH || 4);
  const cw = (w - 6) / b.cols;
  const fh = b.floorH + 1;
  let r = -(b.rowShift || 0);
  for (let y = t + 6; y + fh * 0.7 < bottom; y += fh, r++) {
    if (b.tone === 2) {
      // a ribbon of glass, with its mullions
      g.fillStyle = Pn.win;
      g.fillRect(x + 2.5, y, w - 5, fh * 0.55);
      g.fillStyle = Pn.winHi;
      for (let c = 0; c < b.cols; c++) if (hash(b.i * 19 + r * 5 + c) < 0.18) g.fillRect(x + 3 + c * cw, y, cw - 1, fh * 0.55);
      g.beginPath();
      for (let c = 0; c <= b.cols; c++) { g.moveTo(x + 3 + c * cw - 0.5, y); g.lineTo(x + 3 + c * cw - 0.5, y + fh * 0.55); }
      g.rect(x + 2.5, y, w - 5, fh * 0.55);
      pen(g, ln, lw * 0.6);
      g.stroke();
      continue;
    }
    for (let c = 0; c < b.cols; c++) {
      const wx = x + 3 + c * cw + cw * 0.2;
      const ww = cw * 0.6;
      const wh = fh * 0.6;
      const hv = hash(b.i * 31.7 + r * 11.3 + c * 5.1);
      box(g, wx, y, ww, wh, hv < 0.16 ? Pn.winHi : Pn.win);
      if (hv > 0.82) box(g, wx, y, ww, wh * (hv > 0.92 ? 0.7 : 0.4), Pn.blind);
      if (b.tone === 1) {
        box(g, wx - 0.5, y - 1.3, ww + 1, 1.2, Pn.frame);
        g.beginPath();
        g.rect(wx, y, ww, wh);
        g.moveTo(wx, y + wh * 0.5);
        g.lineTo(wx + ww, y + wh * 0.5);
        pen(g, Pn.frame, 0.5);
        g.stroke();
      }
      g.beginPath();
      g.rect(wx, y, ww, wh);
      pen(g, ln, lw * 0.55);
      g.stroke();
      if (b.tone === 0) line(g, wx - 0.6, y + wh + 0.6, wx + ww + 0.6, y + wh + 0.6, dk, 0.7);
    }
    if (b.tone === 0 && ((r % 4) + 4) % 4 === 3) {
      box(g, x, y + fh - 1.6, w, 1.4, dk);
      line(g, x, y + fh - 1.6, x + w, y + fh - 1.6, ln, lw * 0.6);
    }
  }
  // the roofline
  if (b.roof === 'cornice') {
    box(g, x - 1.5, t - 1, w + 3, 3.2, Pn.shade[b.tone], ln, lw);
    box(g, x, t + 2.2, w, 1.4, dk);
    g.beginPath();
    for (let dx = 1.5; dx < w; dx += 2.4) { g.moveTo(x + dx, t + 2.2); g.lineTo(x + dx, t + 3.4); }
    pen(g, ln, lw * 0.5);
    g.stroke();
  } else {
    box(g, x - 0.5, t, w + 1, 2, Pn.frame, ln, lw);
  }
  if (shopH) shopFront(g, b, Pn, P, base);
  if (opts.shops) streetDressing(g, b, Pn, base);
}

const BLADES = ['HOTEL', 'VIDEO', 'DISCO', 'ARCADE', 'NEON'];

function streetDressing(g, b, Pn, base) {
  const ln = Pn.line;
  const kind = b.i % 4;
  // Keep one readable chain-name board per broad window; extra blade lettering
  // competed with it and made every city block feel like a strip mall.
  if (kind === 2 && b.roof === 'cornice' && b.top > 20) {
    const fx = b.u + b.w * 0.5;
    line(g, fx, b.top - 1, fx, b.top - 16, ln, 0.5);
    poly(g, [fx, b.top - 16, fx + 9, b.top - 14.6, fx + 8.4, b.top - 10.6, fx, b.top - 11.6], ['#ff6fae', '#2fbcb0', '#f4dc4c'][b.i % 3], ln, 0.4);
  }
}

function shopSign(g, b, Pn, base) {
  const x = b.u + 2;
  const w = b.w - 4;
  const ln = Pn.line;
  const lw = Pn.lw;
  const name = SHOPS[(b.shopNameIndex ?? b.i) % SHOPS.length];
  // A full signboard above the awning, with enough padding for the actual
  // font's capitals and descenders. Long names get two readable lines.
  const signY = base - 44;
  const size = 7.5;
  g.save();
  g.font = `600 ${size * 1.18}px ${OFFICE_FONT}`;
  if ('letterSpacing' in g) g.letterSpacing = `${size * 0.06}px`;
  const words = name.split(' ');
  let label = [name];
  if (g.measureText(name).width > w - 10 && words.length > 1) {
    // Pick the most balanced two-line break; three-word names must still fit
    // inside the existing sign rather than drawing a third line over the awning.
    label = Array.from({ length: words.length - 1 }, (_, i) =>
      [words.slice(0, i + 1).join(' '), words.slice(i + 1).join(' ')])
      .reduce((best, pair) => Math.max(...pair.map(part => g.measureText(part).width)) <
        Math.max(...best.map(part => g.measureText(part).width)) ? pair : best);
  }
  const widest = Math.max(...label.map(part => g.measureText(part).width));
  const fitted = Math.min(size, size * (w - 10) / Math.max(1, widest));
  g.restore();
  box(g, x, signY, w, 24, '#1f1d26', ln, lw);
  box(g, x + 1.5, signY + 1.5, w - 3, 21, null, '#68606f', 0.35);
  label.forEach((word, i) => letters(g, word, x + w / 2,
    signY + (label.length === 1 ? 15 : 9 + i * 10), fitted,
    { ink: b.i % 2 ? '#ff8fc5' : '#72f5e6', weight: 600, align: 'center', track: 0 }));
}

function shopFront(g, b, Pn, P, base) {
  const x = b.u + 2;
  const w = b.w - 4;
  const ln = Pn.line;
  const lw = Pn.lw;
  const awn = P.awn[b.shop];
  box(g, x + 1, base - 17, w - 2, 17, '#a9e0ec', ln, lw);
  const dx = x + (b.i % 2 ? w - 12 : 4);
  box(g, dx, base - 14, 8, 14, '#2a2833', ln, lw);
  box(g, dx + 1.5, base - 12.5, 5, 6, '#a9e0ec', ln, lw * 0.6);
  for (let k = 0, gx = x + 4; gx < x + w - 6; gx += 6, k++) {
    if (Math.abs(gx + 2 - (dx + 4)) < 7) continue;
    const c = ['#ff6fae', '#f6df4a', '#2fbcb0', '#b39ae6'][(b.i + k) % 4];
    box(g, gx, base - 6 - (k % 3), 3.6, 4 + (k % 3), c, ln, lw * 0.5);
  }
  // the awning: a flat wedge, striped, a hard 80s edge
  const ay = base - 17;
  poly(g, [x - 1, ay - 1, x + w + 1, ay - 1, x + w + 3, ay + 4, x - 3, ay + 4], awn, ln, lw);
  g.save();
  g.beginPath();
  g.moveTo(x - 1, ay - 1); g.lineTo(x + w + 1, ay - 1); g.lineTo(x + w + 3, ay + 4); g.lineTo(x - 3, ay + 4); g.closePath();
  g.clip();
  g.fillStyle = '#ffffff';
  for (let sx = x - 3; sx < x + w + 3; sx += 6) g.fillRect(sx, ay - 1, 2, 6);
  g.restore();
  line(g, x - 3, ay + 4, x + w + 3, ay + 4, '#1f1d26', 0.8);
}

function tree(g, x, y, s, T, seed) {
  const ln = T.line;
  // trunk and grate
  box(g, x - 1.1 * s, y - 16 * s, 2.2 * s, 16 * s, T.trunk, ln, 0.42);
  line(g, x - 4 * s, y + 0.3, x + 4 * s, y + 0.3, ln, 0.5);
  // crown: lobes, outlined as one silhouette (ink pass under, fill pass over)
  const lobes = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * TAU + hash(seed + k) * 0.6;
    const rr = (5.5 + hash(seed + k * 3) * 3) * s;
    lobes.push([x + Math.cos(a) * 7 * s, y - 27 * s + Math.sin(a) * 6.5 * s, rr]);
  }
  lobes.push([x, y - 28 * s, 8 * s]);
  g.beginPath();
  for (const [lx, ly, r] of lobes) { g.moveTo(lx + r, ly); g.arc(lx, ly, r, 0, TAU); }
  pen(g, ln, 1.0);
  g.stroke();
  g.fillStyle = T.leaf;
  g.fill();
  // the flat shadow under the crown
  g.save();
  g.clip();
  g.beginPath();
  for (const [lx, ly, r] of lobes) { g.moveTo(lx + 2 * s + r, ly + 3 * s); g.arc(lx + 2 * s, ly + 3 * s, r * 0.85, 0, TAU); }
  g.fillStyle = T.leafDk;
  g.globalCompositeOperation = 'source-atop';
  g.fillRect(x - 20 * s, y - 24 * s, 40 * s, 20 * s);
  g.restore();
}

function lampPost(g, x, y, P) {
  const c = P.lampPost;
  const ln = P.near.line;
  box(g, x - 1.6, y - 3, 3.2, 3, c, ln, 0.42);
  box(g, x - 0.7, y - 40, 1.4, 37, c, ln, 0.42);
  g.beginPath();
  g.moveTo(x, y - 40);
  g.quadraticCurveTo(x, y - 45, x + 5, y - 44);
  pen(g, c, 1);
  g.stroke();
  poly(g, [x + 3, y - 44, x + 8, y - 44, x + 7.2, y - 40, x + 3.8, y - 40], '#f6efd0', ln, 0.42);
  poly(g, [x + 2.5, y - 44, x + 5.5, y - 46.5, x + 8.5, y - 44], c, ln, 0.42);
}

function paintNear(g, F, P, u0, u1) {
  const O = F.outside;
  const per = O.nearPeriod ?? 1200;
  const Pn = P.near;
  if (F.id === 'exec') {
    for (const b of O.near) for (const u of copies(b.u, b.w, per, u0, u1)) duskTower(g, { ...b, u }, P);
    return;
  }
  for (const b of O.near) for (const u of copies(b.u - 30, b.w + 60, per, u0, u1)) dayFacade(g, { ...b, u: u + 30 }, Pn, P, { shops: !!O.street });
  if (!O.street) return;
  const S = O.street;
  const st = P.street;
  // far pavement over the buildings' feet, the kerb, the road, the near pavement
  box(g, u0, S.far - 4, u1 - u0, 4.5, st.pave);
  line(g, u0, S.far - 4, u1, S.far - 4, st.line, 0.4);
  box(g, u0, S.far + 0.5, u1 - u0, 1.4, st.kerb);
  line(g, u0, S.far + 0.5, u1, S.far + 0.5, st.line, 0.45);
  box(g, u0, S.far + 1.9, u1 - u0, S.near - S.far - 1.9, st.road);
  line(g, u0, S.near, u1, S.near, st.line, 0.45);
  box(g, u0, S.near, u1 - u0, 6, st.pave);
  // lane markings and a zebra (in this layer's own u, so they never slide)
  g.fillStyle = st.mark;
  for (let u = Math.floor(u0 / 25) * 25; u < u1; u += 25) g.fillRect(u, (S.far + S.near) / 2 + 0.5, 12, 1);
  for (const zu of [180, 780]) {
    for (const zc of copies(zu, 40, per, u0, u1)) {
      for (let k = 0; k < 6; k++) poly(g, [zc + k * 7, S.far + 2.5, zc + k * 7 + 4, S.far + 2.5, zc + k * 7 + 5.5, S.near - 0.6, zc + k * 7 + 1.5, S.near - 0.6], st.mark);
    }
  }
  // drains on the kerb
  for (let u = Math.floor(u0 / 150) * 150 + 60; u < u1; u += 150) box(g, u, S.near - 1.6, 5, 1.4, '#6f747c');
  for (const tr of O.trees) for (const u of copies(tr.u - 20, 40, per, u0, u1)) tree(g, u + 20, S.far, tr.s, P.tree, tr.u);
  for (const l of O.lamps) for (const u of copies(l.u - 10, 20, per, u0, u1)) lampPost(g, u + 10, S.far, P);
  // Trees and lamps stand along the pavement, but cannot obscure shop names.
  // Repaint only the boards, leaving trunks and foliage visible below them.
  for (const b of O.near) {
    if (b.shop == null) continue;
    for (const u of copies(b.u - 30, b.w + 60, per, u0, u1)) shopSign(g, { ...b, u: u + 30 }, Pn, b.base);
  }
}

function duskTower(g, b, P) {
  const Pn = P.near;
  const x = b.u;
  const w = b.w;
  const t = b.top;
  const base = b.base;
  const face = Pn.tones[b.tone];
  const ln = Pn.line;
  const lw = Pn.lw;
  const cx = x + w / 2;
  if (b.roof === 'spire') {
    box(g, cx - w * 0.32, t - 10, w * 0.64, 10, face, ln, lw);
    box(g, cx - w * 0.18, t - 18, w * 0.36, 8, face, ln, lw);
    poly(g, [cx - 2, t - 18, cx, t - 46, cx + 2, t - 18], face, ln, lw);
  } else if (b.roof === 'stepped') {
    box(g, x + w * 0.14, t - 12, w * 0.72, 12, face, ln, lw);
    box(g, x + w * 0.3, t - 22, w * 0.4, 10, face, ln, lw);
  } else if (b.roof === 'antenna') {
    lines(g, [cx, t, cx, t - 34, cx - 4, t - 14, cx + 4, t - 14, cx - 2.5, t - 24, cx + 2.5, t - 24], ln, lw);
  }
  box(g, x, t, w, base - t, face, ln, lw);
  const cw = (w - 4) / b.cols;
  for (let r = -(b.rowShift || 0), y = t + 4; y < base - 2; r++, y += b.floorH * 0.8) {
    for (let c = 0; c < b.cols; c++) {
      const on = hash(b.i * 71.3 + r * 13.1 + c * 2.9) < b.lit;
      g.fillStyle = on ? Pn.lit : Pn.dark;
      g.fillRect(x + 2 + c * cw + cw * 0.22, y, cw * 0.56, b.floorH * 0.42);
    }
  }
}

function sky(ctx, f, P) {
  const G = f.glass;
  const bands = P.sky;
  for (let i = 0; i < bands.length; i++) {
    const y0 = G.top - 2 + bands[i][0];
    const y1 = i + 1 < bands.length ? G.top - 2 + bands[i + 1][0] : G.bottom + 4;
    ctx.fillStyle = bands[i][1];
    ctx.fillRect(-4, y0, f.W + 8, y1 - y0);
  }
}

function sun(ctx, f, P) {
  const s = f.outside.sun;
  if (!s) return;
  if (f.floor === 'exec') {
    circ(ctx, s.x, s.y, s.r + 11, 'rgba(255,190,150,0.16)');
    circ(ctx, s.x, s.y, s.r + 5.5, 'rgba(255,214,160,0.24)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.clip();
    box(ctx, s.x - s.r, s.y - s.r, s.r * 2, s.r * 2, '#fff1a6');
    box(ctx, s.x - s.r, s.y - s.r * 0.3, s.r * 2, s.r * 2, '#ffbe6c');
    box(ctx, s.x - s.r, s.y + s.r * 0.3, s.r * 2, s.r * 2, '#ff7c98');
    for (let k = 0; k < 5; k++) {
      const by = s.y - s.r * 0.12 + k * s.r * 0.27;
      const bh = 0.7 + k * 0.6;
      box(ctx, s.x - s.r, by, s.r * 2, bh, skyAt(f, P, by));
    }
    ctx.restore();
    return;
  }
  circ(ctx, s.x, s.y, s.r + 7, 'rgba(255,250,214,0.3)');
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + 0.13;
    const r0 = s.r + 3;
    const r1 = s.r + (k % 2 ? 6 : 9);
    ctx.moveTo(s.x + Math.cos(a) * r0, s.y + Math.sin(a) * r0);
    ctx.lineTo(s.x + Math.cos(a) * r1, s.y + Math.sin(a) * r1);
  }
  pen(ctx, P.sunLine, 0.8);
  ctx.stroke();
  circ(ctx, s.x, s.y, s.r, P.sun, P.sunLine, 0.7);
}

function cloudShape(c, i, floor) {
  const n = Math.max(3, Math.round(c.w / (floor === 'exec' ? 18 : 20)));
  const lobes = [];
  const base = c.h * 0.5;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const env = Math.sin(Math.PI * t);
    const r = c.h * (0.38 + 0.42 * env) * (0.85 + 0.3 * hash(i * 17 + k + (floor === 'exec' ? 50 : 0)));
    lobes.push([c.w * t, base - r * 0.75, r]);
  }
  const p = new Path2D();
  for (const [x, y, r] of lobes) { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); }
  const x0 = lobes[0][0] - lobes[0][2] * 0.6;
  const x1 = lobes[n - 1][0] + lobes[n - 1][2] * 0.6;
  p.rect(x0, base - c.h * 0.42, x1 - x0, c.h * 0.42);
  return { p, x0, x1, base, h: c.h };
}

function clouds(ctx, f, P, shapes) {
  for (const c of f.outside.clouds) {
    const s = shapes[c.i];
    ctx.save();
    ctx.translate(Math.round(c.x * 2) / 2, c.y);
    pen(ctx, P.cloudLine, 1.2);
    ctx.stroke(s.p);
    ctx.fillStyle = P.cloud;
    ctx.fill(s.p);
    ctx.clip(s.p);
    ctx.fillStyle = P.cloudShade;
    ctx.fillRect(s.x0 - 10, s.base - s.h * (f.floor === 'exec' ? 0.34 : 0.26), s.x1 - s.x0 + 20, s.h);
    ctx.restore();
  }
}

function vehicle(ctx, c, P) {
  const ln = '#3e3a52';
  ctx.save();
  ctx.translate(c.x + (c.dir < 0 ? c.w : 0), c.y);
  ctx.scale(c.dir, 1);
  const wheel = (x) => { circ(ctx, x, -2.2, 2.3, '#24222c', ln, 0.4); circ(ctx, x, -2.2, 1.1, '#d6dae2'); };
  if (c.kind === 'bus') {
    // a teal bus with a pink speed stripe and smoked windows
    box(ctx, 0, -22, 64, 19, '#7fd6cc', ln, 0.45);
    box(ctx, 1, -18, 62, 7, '#2a2a3a', ln, 0.4);
    for (let k = 0; k < 8; k++) {
      if (k % 3 !== 1 && k > 0) circ(ctx, 5.8 + k * 7.2, -14.6, 1.4, k % 2 ? '#f0c4a6' : '#c98e64');
      line(ctx, 2.8 + k * 7.2, -18, 2.8 + k * 7.2, -11, '#4a4a5a', 0.4);
    }
    box(ctx, 1, -9.6, 62, 1.6, '#ff6fae');
    box(ctx, 1, -8, 62, 0.8, '#f6df4a');
    box(ctx, 44, -21.4, 13, 3, '#24222c');
    letters(ctx, '23', 50.5, -19, 2.2, { ink: '#ff8a5a', lw: 0.35, align: 'center' });
    wheel(12); wheel(50);
  } else if (c.kind === 'cab') {
    // a boxy eighties cab: all corners, a light bar
    poly(ctx, [1, -3, 1, -8, 8, -8.4, 11, -12.4, 22, -12.4, 25, -8.4, 29.5, -7.8, 29.5, -3], '#f6d24a', ln, 0.45);
    poly(ctx, [11.6, -8.6, 13.6, -11.6, 17, -11.6, 17, -8.6], '#3a3a4c', ln, 0.35);
    poly(ctx, [18, -8.6, 18, -11.6, 21.4, -11.6, 23.6, -8.6], '#3a3a4c', ln, 0.35);
    box(ctx, 14.5, -14.2, 5, 1.8, '#ff6fae', ln, 0.3);
    ctx.fillStyle = '#24222c';
    for (let k = 0; k < 7; k++) ctx.fillRect(4 + k * 3.2, -6.4 + (k % 2) * 0.9, 1.6, 0.9);
    line(ctx, 0.5, -3.4, 30, -3.4, '#24222c', 0.9);
    wheel(7); wheel(23.5);
  } else {
    // the red wedge: low, flat, pop-up lamps, a stripe down the flank
    poly(ctx, [0.5, -3, 0.5, -6.6, 9, -8, 13, -10.6, 19, -10.6, 22, -7.6, 27.8, -6.4, 27.8, -3], '#e0263c', ln, 0.45);
    poly(ctx, [13.6, -8.2, 14.4, -10, 18.4, -10, 20.6, -8.2], '#3a3a4c', ln, 0.35);
    line(ctx, 2, -5.2, 26.5, -5.2, '#ffffff', 0.5);
    box(ctx, 23, -8.6, 3.4, 1.2, '#24222c');
    line(ctx, 0.5, -3.4, 28, -3.4, '#24222c', 0.9);
    wheel(6.5); wheel(21.5);
  }
  ctx.restore();
}

function flyer(ctx, f, P) {
  const fl = f.outside.flyer;
  if (!fl) return;
  if (fl.kind === 'birds') {
    ctx.beginPath();
    const flock = [[0, 0], [9, 3], [17, -2], [25, 4], [7, 9]];
    flock.forEach(([dx, dy], k) => {
      const up = Math.sin((fl.phase + k * 0.23) * TAU) * 2.2;
      const x = fl.x + dx;
      const y = fl.y + dy;
      ctx.moveTo(x - 3.2, y - up);
      ctx.quadraticCurveTo(x - 1.4, y - 1.5 - up * 0.3, x, y);
      ctx.quadraticCurveTo(x + 1.4, y - 1.5 - up * 0.3, x + 3.2, y - up);
    });
    pen(ctx, '#4b5e74', 0.6);
    ctx.stroke();
    return;
  }
  if (fl.kind === 'blimp') {
    const d = fl.dir;
    const x = fl.x;
    const y = fl.y;
    const ln = '#5f6f85';
    // fins at the tail, the envelope, its flat shadow, the gondola, the name
    poly(ctx, [x - d * 24, y - 3, x - d * 33, y - 10, x - d * 34, y - 6, x - d * 28, y], '#c64a3e', ln, 0.45);
    poly(ctx, [x - d * 24, y + 3, x - d * 33, y + 10, x - d * 34, y + 6, x - d * 28, y], '#c64a3e', ln, 0.45);
    ell(ctx, x, y, 30, 10, '#dfe3e8', ln, 0.5);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 10, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#c4cbd4';
    ctx.fillRect(x - 31, y + 3.5, 62, 8);
    ctx.restore();
    ell(ctx, x, y, 30, 10, null, ln, 0.5);
    rbox(ctx, x - 5, y + 9.4, 10, 3.6, 1.2, '#8f9aa8', ln, 0.4);
    letters(ctx, fl.label || 'EGGCORP', x + d * 1, y + 2.4, 4.6, { ink: '#c64a3e', lw: 0.75, align: 'center' });
    if (fl.slogan) {
      // a big trailing banner, readable at game scale
      const bw = 132, bh = 15, by = y + 17;
      lines(ctx, [x - 5, y + 13, x - 30, by, x + 5, y + 13, x + 30, by], ln, 0.4);
      box(ctx, x - bw / 2, by, bw, bh, '#f6df4a', ln, 0.6);
      const size = bannerSize(ctx, fl.slogan, bw - 16, 6.4, 0.2);
      letters(ctx, fl.slogan, x, by + bh / 2 + size * 0.42, size, { ink: '#1f1d26', lw: size * 0.16, weight: 700, align: 'center', track: 0.2 });
    }
    return;
  }
  if (fl.kind === 'heli') {
    const x = fl.x;
    const y = fl.y;
    const d = fl.dir;
    const ln = '#2c2540';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(d, 1);
    poly(ctx, [-6, -1.5, -19, -2.2, -19, 0.2, -6, 1.5], '#3c3a5e', ln, 0.4);
    poly(ctx, [-19, -2.2, -21, -6, -18.4, -6, -17.4, -2.2], '#3c3a5e', ln, 0.4);
    ell(ctx, 0, 0, 7.5, 4.6, '#3c3a5e', ln, 0.45);
    poly(ctx, [1.5, -3.6, 6.8, -1.4, 6.8, 1, 1.5, 1], '#ffd77a', ln, 0.35);
    lines(ctx, [-4, 4.6, -5, 6.4, 4, 4.6, 5, 6.4, -7, 6.4, 7, 6.4], ln, 0.5);
    line(ctx, 0, -4.6, 0, -6, ln, 0.6);
    const sw = Math.cos(fl.phase * TAU);
    line(ctx, -13 * sw, -6.3, 13 * sw, -6.3, ln, 0.7);
    line(ctx, -13 * Math.sin(fl.phase * TAU), -6.3, 13 * Math.sin(fl.phase * TAU), -6.3, 'rgba(44,37,64,0.5)', 0.6);
    const tr = Math.sin(fl.phase * TAU * 2) * 3;
    line(ctx, -19.7, -4 - tr, -19.7, -4 + tr, ln, 0.5);
    if (fl.phase < 0.5) circ(ctx, -6, 4.2, 0.9, '#ff4a3a');
    if (fl.slogan) line(ctx, -19, 2, -30, 6, ln, 0.4);
    ctx.restore();
    if (fl.slogan) {
      // a big trailing banner, readable at game scale and never mirrored
      const bw = 118, bh = 14, bx = x - d * 30 - (d > 0 ? bw : 0), by = y + 3;
      box(ctx, bx, by, bw, bh, '#f6df4a', ln, 0.6);
      const size = bannerSize(ctx, fl.slogan, bw - 16, 6, 0.2);
      letters(ctx, fl.slogan, bx + bw / 2, by + bh / 2 + size * 0.42, size, { ink: '#2c2540', lw: size * 0.16, weight: 700, align: 'center', track: 0.2 });
    }
  }
}

function cradle(ctx, f, P) {
  const c = f.wall.cradle;
  if (!c) return;
  const ln = '#4b5566';
  const x = c.x;
  const y = c.y;
  const w = c.w;
  lines(ctx, [x + 4, f.glass.top - 4, x + 4, y - 8, x + w - 4, f.glass.top - 4, x + w - 4, y - 8], '#3f4756', 0.55);
  lines(ctx, [x + 4, y - 8, x + 1, y, x + 4, y - 8, x + 7, y, x + w - 4, y - 8, x + w - 7, y, x + w - 4, y - 8, x + w - 1, y], '#3f4756', 0.45);
  // the cleaner: cap, overalls, a squeegee on a pole swiping the pane
  const px = x + 20;
  const sx = x + 26 + (c.swipe - 0.5) * 18;
  const sy = y - 17 + Math.abs(c.swipe - 0.5) * 3;
  box(ctx, px - 4, y - 12, 8, 12, '#5a7fb8', ln, 0.45);
  letters(ctx, 'TEMP', px, y - 4, 2, { ink: '#ffffff', lw: 0.3, align: 'center', track: 0.2 });
  circ(ctx, px, y - 15, 3.2, '#f0c8a2', ln, 0.45);
  poly(ctx, [px - 3.5, y - 16.5, px - 3.2, y - 19, px + 3.2, y - 19, px + 4.5, y - 16.5], '#e8c43e', ln, 0.4);
  line(ctx, px + 3, y - 9, sx, sy + 2, '#f0c8a2', 1.4);
  line(ctx, px + 3, y - 9, sx, sy + 2, ln, 0.3);
  line(ctx, sx, sy - 4, sx, sy + 4, '#2f3440', 1.2);
  // soap streaks where the blade has been
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(Math.min(sx, x + 26) - 0.5, sy - 4, Math.abs(sx - (x + 26)) + 1, 8);
  // the platform and its rail; a bucket
  box(ctx, x, y - 8, w, 1.3, '#9aa3ae', ln, 0.4);
  lines(ctx, [x + 10, y - 8, x + 10, y, x + 32, y - 8, x + 32, y, x + 42, y - 8, x + 42, y], ln, 0.4);
  box(ctx, x, y, w, 7, '#d8dde3', ln, 0.5);
  box(ctx, x, y + 5, w, 2, '#a9b1bb', ln, 0.4);
  poly(ctx, [x + 36, y - 5, x + 41, y - 5, x + 40.3, y, x + 36.7, y], '#d9a441', ln, 0.4);
}

function cityLights(ctx, f, P) {
  const L = f.outside.cityLights;
  if (!L.length) return;
  const cols = P.cityLights;
  for (let lev = 2; lev >= 0; lev--) {
    ctx.beginPath();
    for (const p of L) {
      const l = p.a > 0.7 ? 0 : p.a > 0.38 ? 1 : 2;
      if (l !== lev) continue;
      const s = 0.6 + p.s * 0.7;
      ctx.rect(p.x, p.y, s, s);
    }
    ctx.fillStyle = cols[lev];
    ctx.fill();
  }
}

function stars(ctx, f, P) {
  const S = f.outside.stars;
  if (!S.length) return;
  ctx.fillStyle = P.stars;
  // The field is a band 46 tall; when the camera pulls out and the windows run higher, it repeats
  // up the sky, each copy slid sideways so it doesn't read as a repeat.
  const reach = Math.max(0, Math.ceil((34 - (f.glass?.top ?? 34) + 40) / 46));
  for (const s of S) {
    ctx.globalAlpha = 0.35 + 0.65 * s.twinkle;
    const r = 0.4 + s.s * 0.5;
    for (let n = 0; n <= reach; n++) {
      const x = s.x + n * 173, y = s.y - n * 46;
      ctx.fillRect(x - r, y - 0.25, r * 2, 0.5);
      ctx.fillRect(x - 0.25, y - r, 0.5, r * 2);
    }
  }
  ctx.globalAlpha = 1;
}

const TOWER_WINDOWS = new Map();

function towerWindows(b) {
  let list = TOWER_WINDOWS.get(b.i);
  if (list) return list;
  list = [];
  const cw = (b.w - 4) / b.cols;
  for (let r = 0, y = b.top + 4; y < b.base - 2; r++, y += b.floorH * 0.8) {
    for (let c = 0; c < b.cols; c++) {
      const h = hash(b.i * 71.3 + r * 13.1 + c * 2.9);
      if (h >= b.lit && h < b.lit + 0.32) list.push({ dx: 2 + c * cw + cw * 0.22, y, w: cw * 0.56, h: b.floorH * 0.42, ph: hash(b.i * 9.1 + r * 3.7 + c * 1.3), rate: 0.05 + hash(r + c * 7 + b.i) * 0.06 });
    }
  }
  TOWER_WINDOWS.set(b.i, list);
  return list;
}

function towerLights(ctx, f, P) {
  const Pn = P.near;
  const sx = f.outside.sun ? f.outside.sun.x : VPX;
  const t = f.t;
  for (const b of f.outside.near) {
    const sunward = b.x + b.w / 2 < sx ? b.x + b.w - 1.6 : b.x;
    ctx.fillStyle = 'rgba(255,150,140,0.85)';
    ctx.fillRect(sunward, b.top + 1, 1.6, b.base - b.top);
    ctx.fillStyle = 'rgba(255,190,150,0.9)';
    ctx.fillRect(b.x + 0.4, b.top + 0.3, b.w - 0.8, 1.4);
    ctx.fillStyle = Pn.lit;
    ctx.beginPath();
    for (const wv of towerWindows(b)) if (((t * wv.rate + wv.ph) % 1) < 0.55) ctx.rect(b.x + wv.dx, wv.y, wv.w, wv.h);
    ctx.fill();
    const on = ((t * 0.45 + b.i * 0.31) % 1) < 0.86 ? 1 : 0;
    neon(ctx, crownPath(b), Pn.neon[b.i % 3], 0.55, 2, on);
    if (b.roof === 'antenna' || b.roof === 'spire') {
      const blink = Math.sin(t * 3 + b.i) > 0;
      circ(ctx, b.x + b.w / 2, b.top - (b.roof === 'spire' ? 46 : 34), blink ? 1.6 : 1, blink ? '#ff5a7a' : '#7a3050');
    }
  }
}

function skyAt(f, P, y) {
  const G = f.glass;
  let c = P.sky[0][1];
  for (const [dy, col] of P.sky) if (y >= G.top - 2 + dy) c = col;
  return c;
}

export { farBuilding, paintFar, AD, SHOPS, waterTank, billboard, roofFurniture, dayFacade, BLADES, streetDressing, shopSign, shopFront, tree, lampPost, paintNear, duskTower, sky, sun, cloudShape, clouds, vehicle, flyer, cradle, cityLights, stars, TOWER_WINDOWS, towerWindows, towerLights, skyAt };
