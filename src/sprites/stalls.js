// THE FOOD STALLS. The cabinet bank is three groups of three machines, and in
// each of the two gaps stands one of the food court's own units: the way a real
// food court fitted a few machines in between its counters, rather than an
// arcade with a snack bar at the end. One is still trading (SMOOTHIE OPERATOR:
// lit, stocked, menu up) and one gave up (WOK THIS WAY: shutter down, sign dead) —
// a food court that is still just about functioning.
//
// Picked 11 Oct 2026 from the lab's interleave bake-off (I1 + I2, one of each).
// Wall dressing: drawn after the wall and before the machines, lit by the
// room's fixtures (`lit`, a number or a function of x, as shadeWall takes). The
// open stall carries its own light, so it never goes fully dark.
import { rr, shape, plain, stroke } from './props.js';
import { drawText, drawTextCentered, textWidth, TITLE_FONT, GLYPH_PX } from '../engine/sprites.js';
import { shadeWall } from './backwall.js';

export const STALL_W = 112;
// The fascia band, exported so the hub can hit-test a unit's sign.
export const UNIT_FASCIA_TOP = 66, UNIT_FASCIA_H = 19;
const FASCIA_TOP = UNIT_FASCIA_TOP, FASCIA_H = UNIT_FASCIA_H;
const OPEN_SELF_LIT = 0.6;
const INK = '#100c18';

function rgb(c) {
  const s = String(c).replace('#', '');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
function glow(ctx, cx, cy, rx, ry, col, a) {
  if (a <= 0) return;
  const [r, g, b] = rgb(col);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gr;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}
// The sign stutters now and then, like every other tube in here.
function flick(t, seed) {
  const period = 3.1 + (seed % 5) * 0.7;
  const ph = (t + seed * 1.37) % period;
  if (ph < 0.14) return ph < 0.06 ? 0.15 : 0.6;
  return 1;
}
// A smoothie: domed lid, straw, a band of fruit colour.
function cupIcon(ctx, cx, cy, s, col, band = '#f590c8') {
  shape(ctx, col, 10, (c) => { c.moveTo(cx - 3 * s, cy - 3 * s); c.lineTo(cx + 3 * s, cy - 3 * s); c.lineTo(cx + 2.2 * s, cy + 4 * s); c.lineTo(cx - 2.2 * s, cy + 4 * s); c.closePath(); });
  plain(ctx, band, (c) => c.rect(cx - 2.7 * s, cy - 0.5 * s, 5.4 * s, 2 * s));
  plain(ctx, col, (c) => c.ellipse(cx, cy - 3 * s, 3.2 * s, 1.6 * s, 0, Math.PI, 0));
  stroke(ctx, '#48c0e0', 0.8 * s, (c) => { c.moveTo(cx + 0.5 * s, cy - 4 * s); c.lineTo(cx + 1.8 * s, cy - 7.5 * s); });
}
export const STALLS = [
  { name: 'SMOOTHIE OPERATOR', box: '#f590c8', ink: '#3a0c2a', open: true, tagline: 'WE BLEND. WE DO NOT JUDGE.' },
  { name: 'WOK THIS WAY', box: '#c83a2e', ink: '#ffffff', open: false, shut: 0.75, menu: 'wok' },
];

// A countertop blender, about six units wide and twenty tall: a chrome motor
// base with a dial and two buttons, a glass jar with a handle and measuring
// ticks, the contents with a froth line, and a black lid with its cap. `fill`
// null is an empty jar.
function drawBlender(ctx, bx, shelfY, fill, seed, t) {
  const by = shelfY;
  // Contact shadow on the shelf top.
  ctx.save(); ctx.globalAlpha = 0.45;
  plain(ctx, '#140e18', (c) => c.ellipse(bx + 0.6, by - 0.3, 5.2, 0.9, 0, 0, Math.PI * 2));
  ctx.restore();
  // Motor base: a tapered chrome block, lit from the upper left.
  const g = ctx.createLinearGradient(bx - 4, 0, bx + 4, 0);
  g.addColorStop(0, '#d8dce8'); g.addColorStop(0.35, '#9aa0b4'); g.addColorStop(1, '#4a4e60');
  ctx.beginPath();
  ctx.moveTo(bx - 4.2, by); ctx.lineTo(bx + 4.2, by); ctx.lineTo(bx + 3.4, by - 6); ctx.lineTo(bx - 3.4, by - 6); ctx.closePath();
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(26,16,40,0.45)'; ctx.lineWidth = 0.3; ctx.stroke();
  plain(ctx, '#2a2a36', (c) => c.rect(bx - 4.4, by - 0.8, 8.8, 0.8));
  plain(ctx, '#1e1e28', (c) => c.ellipse(bx - 1.2, by - 3, 1.1, 1.1, 0, 0, Math.PI * 2));
  plain(ctx, '#c8c8d8', (c) => c.rect(bx - 1.3, by - 3.9, 0.3, 0.9));
  plain(ctx, seed % 2 ? '#e04848' : '#48e0c8', (c) => c.rect(bx + 1, by - 3.6, 1.2, 0.7));
  plain(ctx, '#3a3a48', (c) => c.rect(bx + 1, by - 2.4, 1.2, 0.7));
  // The jar: tapered glass, a coupling collar under it.
  plain(ctx, '#2a2a36', (c) => c.rect(bx - 3, by - 7, 6, 1));
  const jt = by - 20, jb = by - 7;
  const jar = (c) => { c.moveTo(bx - 3.6, jt); c.lineTo(bx + 3.6, jt); c.lineTo(bx + 2.6, jb); c.lineTo(bx - 2.6, jb); c.closePath(); };
  ctx.save(); ctx.globalAlpha = 0.28; plain(ctx, '#cfe4f0', jar); ctx.restore();
  if (fill) {
    const lvl = jt + 4 + (seed % 3);
    const inset = (yy) => 3.6 - (yy - jt) / (jb - jt);
    const fg = ctx.createLinearGradient(0, lvl, 0, jb);
    fg.addColorStop(0, mix(fill, '#ffffff', 0.25)); fg.addColorStop(1, mix(fill, INK, 0.25));
    ctx.beginPath();
    ctx.moveTo(bx - inset(lvl) + 0.3, lvl); ctx.lineTo(bx + inset(lvl) - 0.3, lvl);
    ctx.lineTo(bx + 2.3, jb - 0.2); ctx.lineTo(bx - 2.3, jb - 0.2); ctx.closePath();
    ctx.fillStyle = fg; ctx.fill();
    // Froth along the top; the second one is still going and bubbles.
    plain(ctx, mix(fill, '#ffffff', 0.6), (c) => c.rect(bx - inset(lvl) + 0.4, lvl, (inset(lvl) - 0.4) * 2, 0.9));
    if (seed === 1) {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.9 + k * 0.33) % 1;
        plain(ctx, 'rgba(255,255,255,0.7)', (c) => c.ellipse(bx - 1.2 + k * 1.2, jb - 1 - ph * (jb - lvl - 2), 0.35, 0.35, 0, 0, Math.PI * 2));
      }
    }
  }
  // Measuring ticks up the left side, and the blade hub at the bottom.
  for (let k = 0; k < 4; k++) plain(ctx, 'rgba(255,255,255,0.55)', (c) => c.rect(bx - 2.6 + k * 0.25, jb - 2 - k * 2.6, 1.2, 0.25));
  plain(ctx, '#8a8a98', (c) => c.rect(bx - 1.2, jb - 0.8, 2.4, 0.5));
  // Glass edges and a long highlight down the lit side.
  stroke(ctx, 'rgba(220,238,248,0.7)', 0.3, jar);
  stroke(ctx, 'rgba(255,255,255,0.75)', 0.45, (c) => { c.moveTo(bx - 2.8, jt + 1.5); c.lineTo(bx - 2.1, jb - 1.5); });
  // Handle on the right.
  stroke(ctx, 'rgba(200,220,236,0.75)', 0.7, (c) => { c.moveTo(bx + 3.4, jt + 2.5); c.lineTo(bx + 5, jt + 3.5); c.lineTo(bx + 4.4, jb - 2.5); c.lineTo(bx + 2.8, jb - 2); });
  // Lid and cap.
  shape(ctx, '#1e1e28', 10, (c) => rr(c, bx - 4, jt - 1.6, 8, 1.8, 0.6));
  plain(ctx, '#3a3a48', (c) => c.rect(bx - 1, jt - 2.6, 2, 1.1));
}

// The price board behind a counter: a dark panel, a title in the house
// yellow, five rows of item and price, and a line of small print.
function drawPriceBoard(ctx, x, y, w, b) {
  const h = 42;
  plain(ctx, '#161022', (c) => c.rect(x, y, w, h));
  ctx.save(); ctx.globalAlpha = 0.16;
  plain(ctx, '#f6d33c', (c) => c.rect(x + 1, y + 1, w - 2, h - 2));
  ctx.restore();
  const ts = Math.min(0.62, (w - 10) / Math.max(1, textWidth(b.title, 1, 'title')));
  drawTextCentered(ctx, b.title, x + w / 2, y + 1.6, '#f6d33c', ts, 'title');
  const ms = 0.36;
  b.rows.forEach(([item, price], r) => {
    const ry = y + 9 + r * 5.6;
    const pw = textWidth(price, ms, 'bold');
    const is = Math.min(ms, (w - 12 - pw) / Math.max(1, textWidth(item, 1, 'bold')));
    drawText(ctx, item, x + 4, ry + (ms - is) * 4.6, '#e8e8f0', is, 'bold');
    drawText(ctx, price, x + w - 4 - pw, ry, '#f6d33c', ms, 'bold');
  });
  drawTextCentered(ctx, b.foot, x + w / 2, y + h - 4.4, '#a8a8c0', Math.min(0.26, (w - 8) / Math.max(1, textWidth(b.foot, 1, 'bold'))), 'bold');
}

// THE NEON. A dark backing box on two brackets, a tube run round its edge,
// and the name bent in glass: each letter drawn as a soft bloom, the coloured
// tube, and a pale hot core. A dead sign keeps its glass, dim and unlit, so
// you can still read what it used to say; a live one stutters now and then and
// lets one letter lag behind the rest.
function neonFascia(ctx, x0, top, w, h, stall, on, t) {
  const col = stall.neon || stall.box;
  plain(ctx, '#3a3248', (c) => c.rect(x0 + 10, top - 6, 1.2, 6));
  plain(ctx, '#3a3248', (c) => c.rect(x0 + w - 11.2, top - 6, 1.2, 6));
  shape(ctx, '#120c1a', 10, (c) => rr(c, x0 + 3, top, w - 6, h, 2.2));
  const s = Math.min(0.92, (w - 22) / Math.max(1, textWidth(stall.name, 1, 'title')));
  const tw = textWidth(stall.name, s, 'title');
  const ty = top + h / 2 - s * 4.6;
  const frame = (c) => rr(c, x0 + 5.5, top + 2.5, w - 11, h - 5, 1.6);
  // The letters are OUTLINES — hollow tube bent round each glyph's edge, the
  // way real neon lettering is made — stroked with the title face.
  const midY = top + h / 2 + 0.3;
  const tube = (ch, gx, colr, lw) => {
    ctx.font = `400 ${GLYPH_PX * s}px ${TITLE_FONT}`;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colr; ctx.lineWidth = lw;
    ctx.strokeText(ch, gx, midY);
  };
  if (on <= 0) {
    stroke(ctx, mix(col, '#241c30', 0.7), 0.6, frame);
    ctx.save();
    let dx = x0 + w / 2 - tw / 2;
    for (const ch of stall.name) { tube(ch, dx, mix(col, '#241c30', 0.6), 0.5); dx += textWidth(ch, s, 'title'); }
    ctx.restore();
    return;
  }
  const lag = Math.floor(stall.name.length * 0.37);
  const lagOn = ((t * 1.7) % 4.3) < 0.18 ? 0.25 : 1;
  const hot = mix(col, '#ffffff', 0.62);
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = 4 * on;
  stroke(ctx, col, 0.75, frame);
  ctx.shadowBlur = 0;
  stroke(ctx, hot, 0.25, frame);
  let gx = x0 + w / 2 - tw / 2;
  for (let k = 0; k < stall.name.length; k++) {
    const ch = stall.name[k];
    const lv = on * (k === lag ? lagOn : 1);
    ctx.globalAlpha = 0.35 + 0.65 * lv;
    ctx.shadowBlur = 6 * lv;
    tube(ch, gx, col, 0.85);
    ctx.shadowBlur = 0;
    tube(ch, gx, lv > 0.5 ? hot : mix(col, '#241c30', 0.5), 0.3);
    gx += textWidth(ch, s, 'title');
  }
  ctx.restore();
  glow(ctx, x0 + w / 2, top + h / 2, w * 0.62, h * 1.3, col, 0.14 * on);
}

export const MENU_BOARD_H = 45.5;
// Also drawn blown-up when the board is tapped (hub), hence its own function.
export function drawSmoothieMenuBoard(ctx, x, y, w, menu = null) {
  // The menu board: wide, five puns deep, every price in plugs, one of them
  // corrected in marker like Dolores's board was, and the small print under it.
  const mb = { x, y, w, h: MENU_BOARD_H };
  plain(ctx, '#161022', (c) => c.rect(mb.x, mb.y, mb.w, mb.h));
  ctx.save(); ctx.globalAlpha = 0.16;
  plain(ctx, '#f6d33c', (c) => c.rect(mb.x + 1, mb.y + 1, mb.w - 2, mb.h - 2));
  ctx.restore();
  const MENU = menu || SMOOTHIE_MENU_DEFAULT;
  const ms = 0.38, pitch = 5.5;
  MENU.forEach(([item, price], r) => {
    const ry = mb.y + 2 + r * pitch;
    // Long titles shrink to clear the price column rather than run into it.
    const room = mb.w - 12 - textWidth(price, ms, 'bold');
    const is = Math.min(ms, room / Math.max(1, textWidth(item, 1, 'bold')));
    drawText(ctx, item, mb.x + 4, ry + (ms - is) * 4.6, '#e8e8f0', is, 'bold');
    drawText(ctx, price, mb.x + mb.w - 4 - textWidth(price, ms, 'bold'), ry, '#f6d33c', ms, 'bold');
  });
  // The bottom line has not sold since 1987: struck through and given away.
  const last = MENU.length - 1;
  const ky = mb.y + 2 + last * pitch + ms * 5.1;
  const kw = textWidth(MENU[last][1], ms, 'bold');
  stroke(ctx, '#e04848', 0.55, (c) => { c.moveTo(mb.x + mb.w - 5 - kw, ky); c.lineTo(mb.x + mb.w - 3, ky); });
  drawText(ctx, 'FREE!!', mb.x + mb.w - 26 - kw, ky - 3.4, '#48e0c8', 0.4, 'marker');
  drawTextCentered(ctx, 'ADD WHEATGRASS: +1 PLUG. ASK US WHY. WE DO NOT KNOW.', mb.x + mb.w / 2, mb.y + mb.h - 4.6, '#a8a8c0', 0.26, 'bold');
}

export const WOK_BOARD_H = 35;
const WOK_MENU = [
  { item: 'PEKING DUCK, TABLESIDE', price: '3 PLUGS' },
  { item: 'CENTURY EGG', price: '2 PLUGS', note: 'AGED IN-HOUSE. AN ACTUAL CENTURY.' },
  { item: 'MANCHU IMPERIAL FEAST', price: '5 PLUGS', note: '108 COURSES. ONE TRAY.' },
  { item: 'WHOLE LOBSTER', price: 'MARKET PRICE' },
];
export const WOK_MENU_STYLES = ['A', 'B', 'C'];
export const WOK_MENU_STYLE = 'B'; // shipped until Peter picks
// WOK THIS WAY's menu hangs on the wall above the opening, so it is still up
// when the roller is down. Three candidates (bake-off): A photo board, B taped
// handwritten sheet, C neon. B fills the w x WOK_BOARD_H box; A and C were
// drawn 30 tall and sit centred in it.
export function drawWokMenuBoard(ctx, x, y, w, style = 'B') {
  const H = style === 'B' ? WOK_BOARD_H : 30;
  if (style !== 'B') y += (WOK_BOARD_H - H) / 2;
  const fit = (str, sc, room) => Math.min(sc, room / Math.max(1, textWidth(str, 1, 'bold')));
  if (style === 'A') {
    // Backlit photo board gone to seed: six numbered tiles, five stickered SOLD OUT.
    plain(ctx, '#1a1218', (c) => c.rect(x, y, w, H));
    plain(ctx, '#c83a2e', (c) => c.rect(x, y, w, 3));
    const tw = (w - 8) / 3, th = 11.5;
    const food = ['#c8843c', '#8a5a2c', '#d8a040', '#a06030', '#b8742c', '#9a6a3a'];
    for (let i = 0; i < 6; i++) {
      const tx = x + 2 + (i % 3) * (tw + 2), ty = y + 5 + Math.floor(i / 3) * (th + 2.4);
      plain(ctx, '#f0e4c4', (c) => c.rect(tx, ty, tw, th));
      plain(ctx, food[i], (c) => { c.moveTo(tx + tw * 0.5 + th * 0.3, ty + th * 0.55); c.arc(tx + tw * 0.5, ty + th * 0.55, th * 0.3, 0, Math.PI); });
      plain(ctx, '#f6d33c', (c) => c.rect(tx + tw * 0.3, ty + th * 0.3, tw * 0.4, 0.8));
      drawText(ctx, String(i + 1), tx + 1, ty + 0.6, '#c83a2e', 0.32, 'bold');
      if (i === 2) {
        plain(ctx, '#161022', (c) => c.rect(tx + tw - 11.5, ty + th - 3.8, 11.5, 3.8));
        drawText(ctx, '3 PLUGS', tx + tw - 11, ty + th - 3.3, '#f6d33c', 0.22, 'bold');
      } else {
        ctx.save(); ctx.translate(tx + tw / 2, ty + th / 2); ctx.rotate(-0.2);
        plain(ctx, '#e04848', (c) => c.rect(-tw * 0.42, -2, tw * 0.84, 4));
        drawTextCentered(ctx, 'SOLD OUT', 0, -1.4, '#ffffff', 0.26, 'bold');
        ctx.restore();
      }
    }
    return;
  }
  if (style === 'C') {
    // A neon "menu" of one dish.
    plain(ctx, '#0c0812', (c) => c.rect(x, y, w, H));
    const col = '#ff5aa8';
    glow(ctx, x + w / 2, y + H / 2, w * 0.55, H * 0.8, col, 0.18);
    stroke(ctx, col, 0.7, (c) => rr(c, x + 1.5, y + 1.5, w - 3, H - 3, 2));
    drawTextCentered(ctx, 'TODAY: THE WOK', x + w / 2, y + 4, '#48e0c8', fit('TODAY: THE WOK', 0.46, w - 12), 'bold');
    drawTextCentered(ctx, 'PRICE: ASK THE WOK', x + w / 2, y + 12, '#f6d33c', fit('PRICE: ASK THE WOK', 0.4, w - 12), 'bold');
    drawTextCentered(ctx, 'THE WOK IS ASLEEP', x + w / 2, y + 20, mix(col, INK, 0.35), fit('THE WOK IS ASLEEP', 0.34, w - 12), 'bold');
    drawText(ctx, 'z', x + w - 9, y + 5, '#48e0c8', 0.3, 'bold');
    drawText(ctx, 'z', x + w - 6, y + 2.6, '#48e0c8', 0.22, 'bold');
    return;
  }
  // B: a sheet of paper taped up: a banquet menu, at a food-court wok, at
  // food-court prices.
  plain(ctx, '#e8e0c8', (c) => c.rect(x, y, w, H));
  plain(ctx, '#c8bea0', (c) => c.rect(x, y + H - 1, w, 1));
  const tp = (tx) => { ctx.save(); ctx.globalAlpha = 0.7; plain(ctx, '#d8d0a8', (c) => c.rect(tx, y - 1.4, 7, 3)); ctx.restore(); };
  tp(x + 3); tp(x + w - 10);
  const INKB = '#2a2a38', GREY = '#6a6470', RED = '#c83a2e', ms = 0.32, ns = 0.27;
  // A row with a line of small print under it takes the extra height; one without does not.
  let ry = y + 3;
  WOK_MENU.forEach(({ item, price, note, marker, right }) => {
    const pw = textWidth(price, ms, 'bold');
    const is = Math.min(ms, (w - 12 - pw) / Math.max(1, textWidth(item, 1, 'bold')));
    drawText(ctx, item, x + 4, ry + (ms - is) * 4.6, INKB, is, 'bold');
    drawText(ctx, price, x + w - 4 - pw, ry, INKB, ms, 'bold');
    if (note) {
      const font = marker ? 'marker' : 'bold';
      const nx = right ? x + w - 4 - textWidth(note, ns, font) : x + 4;
      drawText(ctx, note, nx, ry + 3.6, marker ? RED : GREY, ns, font);
    }
    ry += note ? 7.4 : 5;
  });
  plain(ctx, '#b8ae94', (c) => c.rect(x + 4, ry + 0.6, w - 8, 0.4));
  drawTextCentered(ctx, 'RESERVATIONS ESSENTIAL', x + w / 2, ry + 1.8, INKB, 0.3, 'bold');
}

// Dolores's NOW SERVING readout: she calls NEXT; nobody has taken a number in years.
export function drawNowServing(ctx, x, y, w = 24, h = 22) {
  plain(ctx, '#1e1a2c', (c) => c.rect(x, y, w, h));
  plain(ctx, '#3a3450', (c) => c.rect(x, y, w, 0.8));
  drawTextCentered(ctx, 'NOW', x + w / 2, y + 2.2, 'rgba(200,200,216,0.7)', 0.3, 'bold');
  drawTextCentered(ctx, 'SERVING', x + w / 2, y + 5.6, 'rgba(200,200,216,0.7)', Math.min(0.3, (w - 4) / Math.max(1, textWidth('SERVING', 1, 'bold'))), 'bold');
  drawTextCentered(ctx, '0', x + w / 2, y + 10.6, '#f6d33c', 0.78, 'bold');
}

// `lift`: how much taller the unit stands (phone portrait raises the wall posters; the unit rises
// with them so the two share a top edge).
export function drawFoodStall(ctx, cx, floorY, stall, { t = 0, lit = 1, width = STALL_W, menu = null, lift = 0 } = {}) {
  const STALL_W = width;
  const x0 = cx - STALL_W / 2, top = FASCIA_TOP - lift;
  // The unit's two side pilasters, full height.
  for (const px of [x0, x0 + STALL_W]) {
    plain(ctx, '#2e2840', (c) => c.rect(px - 3, top - 8, 6, floorY - top + 8));
    plain(ctx, '#3a3450', (c) => c.rect(px - 3, top - 8, 1.5, floorY - top + 8));
  }
  const on = stall.open ? flick(t, 4) : 0;
  // The fascia is a neon sign, painted LAST in each branch below: it makes its
  // own light, so the room's shade must not fall over it.
  const fascia = () => neonFascia(ctx, x0, top, STALL_W, FASCIA_H, stall, on, t);

  const iy = top + FASCIA_H + 3, ix = x0 + 4, iw = STALL_W - 8;
  if (stall.shell) {
    // A tenant whose own counter is drawn by the hub (Dolores's repairs, Gary's
    // pawn shop): the same unit — pilasters, fascia — over a dark interior,
    // and the counter stands in it. Lit like an open stall: they are trading.
    plain(ctx, '#1e1824', (c) => c.rect(ix, iy, iw, floorY - iy));
    plain(ctx, '#2a2232', (c) => c.rect(ix, iy, iw, 2));
    const signW = stall.sign === 'serving' ? 26 : 0;
    if (stall.board) drawPriceBoard(ctx, ix + 8, iy + 5, iw - 16 - signW, stall.board);
    if (signW) drawNowServing(ctx, ix + iw - 8 - 24, iy + 5);
    const own = typeof lit === 'function' ? (x) => Math.max(OPEN_SELF_LIT, lit(x)) : Math.max(OPEN_SELF_LIT, lit);
    shadeWall(ctx, x0 - 3, top - 8, STALL_W + 6, floorY - top + 8, own);
    glow(ctx, cx, top + FASCIA_H + 4, STALL_W * 0.6, 18, stall.box, 0.18 * on);
    fascia();
    return;
  }
  if (!stall.open) {
    // Closed for the night: the roller stopped part-way (`shut`, default all the
    // way), a heat lamp still on behind it, a pale sill across the opening.
    // The wok's menu is fixed to the wall above the opening, so it stays up when the roller moves.
    const wok = stall.menu === 'wok';
    const ty = wok ? iy + WOK_BOARD_H + 6 : iy;
    if (wok) {
      plain(ctx, '#2a2634', (c) => c.rect(ix, iy, iw, ty - iy));
      drawWokMenuBoard(ctx, ix + 6, iy + 3, iw - 12, stall.menuStyle || WOK_MENU_STYLE);
    }
    const gh = floorY - ty, rh = gh * (stall.shut ?? 1);
    plain(ctx, '#0a0810', (c) => c.rect(ix, ty, iw, gh));
    if (rh < gh) {
      const pool = ctx.createLinearGradient(0, floorY, 0, ty);
      pool.addColorStop(0, 'rgba(246,168,60,0.50)');
      pool.addColorStop(0.28, 'rgba(246,168,60,0.26)');
      pool.addColorStop(0.72, 'rgba(246,168,60,0.04)');
      pool.addColorStop(1, 'rgba(246,168,60,0)');
      ctx.save(); ctx.fillStyle = pool; ctx.fillRect(ix, ty, iw, gh); ctx.restore();
      const fw = iw * 0.64;
      ctx.save(); ctx.fillStyle = 'rgba(255,214,140,0.85)';
      ctx.fillRect(cx - fw / 2, ty + rh + gh * 0.03, fw, Math.max(0.6, gh * 0.03));
      ctx.restore();
      const cy = floorY - 26;
      plain(ctx, '#8a7a64', (c) => c.rect(ix - 1, cy - 2, iw + 2, 3));
    }
    plain(ctx, '#4a4c5a', (c) => c.rect(ix, ty, iw, rh));
    for (let sy = ty + 3.2; sy < ty + rh - 3; sy += 3.2) plain(ctx, '#3a3c48', (c) => c.rect(ix, sy, iw, 0.7));
    plain(ctx, '#2e2e3a', (c) => c.rect(ix, ty + rh - 3, iw, 3));
    plain(ctx, '#3a3648', (c) => c.rect(ix - 1, iy - 3, iw + 2, 3));
    shadeWall(ctx, x0 - 3, top - 8, STALL_W + 6, floorY - top + 8, lit);
    fascia();
    return;
  }
  // Open and trading: a warm interior, the menu board, the counter.
  plain(ctx, '#2a1e24', (c) => c.rect(ix, iy, iw, floorY - iy));
  const mb = { x: ix + 4, y: iy + 4, w: iw - 8, h: MENU_BOARD_H };
  drawSmoothieMenuBoard(ctx, mb.x, mb.y, mb.w, menu);
  if (stall.tagline) {
    // A strapline under the name, in the gap between fascia and board.
    drawTextCentered(ctx, stall.tagline, cx, iy + 0.6, mix(stall.box, '#ffffff', 0.4), 0.3, 'bold');
  }
  const cy = floorY - 26;
  plain(ctx, '#5a4c3e', (c) => c.rect(ix, cy, iw, 26));
  plain(ctx, '#8a7a64', (c) => c.rect(ix - 1, cy - 2, iw + 2, 3));
  plain(ctx, mix(stall.box, INK, 0.2), (c) => c.rect(ix, cy + 7, iw, 4));
  // The chiller: a glass-fronted cabinet sat on the counter, cups lined up on
  // its shelf so they read as stock behind glass, not loose cups. Kept narrow
  // so the fruit basket beside it stays clear.
  const chL = ix + 8, chW = 30, chT = cy - 17;
  plain(ctx, '#1c2630', (c) => c.rect(chL, chT, chW, 15));
  plain(ctx, '#2e4050', (c) => c.rect(chL + 1, chT + 1, chW - 2, 3));
  plain(ctx, '#8a9aa8', (c) => c.rect(chL + 1, cy - 3.6, chW - 2, 1.2));
  ['#f590c8', '#f6d33c', '#9fd86a', '#f08a3c'].forEach((band, k) => cupIcon(ctx, chL + 6 + k * 7, cy - 6.6, 0.7, '#e8e0d0', band));
  ctx.save(); ctx.globalAlpha = 0.22;
  plain(ctx, '#cfe4f0', (c) => c.rect(chL + 1, chT + 1, chW - 2, 13));
  ctx.globalAlpha = 0.35;
  stroke(ctx, '#ffffff', 0.5, (c) => { c.moveTo(chL + 4, chT + 12); c.lineTo(chL + 9, chT + 2); });
  ctx.restore();
  // Frame, a lit cap, and a cold-light LED.
  plain(ctx, '#b8c4cc', (c) => c.rect(chL - 1, chT - 1.6, chW + 2, 1.8));
  plain(ctx, '#ecf4f8', (c) => c.rect(chL - 1, chT - 1.6, chW + 2, 0.4));
  plain(ctx, '#6a7884', (c) => { c.rect(chL - 1, chT, 1.4, 15); c.rect(chL + chW - 0.4, chT, 1.4, 15); });
  plain(ctx, '#48e0c8', (c) => c.rect(chL + chW - 4, chT - 1.1, 2.4, 0.7));
  // The fruit display: what goes in the cups, out on the counter to sell it.
  drawFruitDisplay(ctx, ix + 56, cy - 0.5);
  // Five blenders lined up on the back shelf, under the menu board, mid-shift:
  // four full in the fruit colours (one still frothing), one rinsed and empty.
  // The shelf they stand on: a lit top surface, a thick front edge, no
  // brackets: it floats.
  // Kept to the left half of the unit: the till end on the right is where an
  // operator would stand, so nothing on the shelf may sit behind them.
  const shY = cy - 22, shL = ix + 6, shR = ix + 6 + 5 * 11 + 6;
  plain(ctx, '#b8a890', (c) => c.rect(shL, shY - 1.4, shR - shL, 1.4));
  plain(ctx, '#8a7864', (c) => c.rect(shL, shY, shR - shL, 2.6));
  plain(ctx, '#d8c8b0', (c) => c.rect(shL, shY, shR - shL, 0.4));
  plain(ctx, '#1a1418', (c) => c.rect(shL, shY + 2.6, shR - shL, 1.2));
  [['#f590c8', 0], ['#9fd86a', 1], ['#f08a3c', 2], ['#b07ad8', 3], [null, 4]].forEach(([fill, k]) => {
    drawBlender(ctx, shL + 8 + k * 11, cy - 22, fill, k, t);
  });

  shape(ctx, '#2a3542', 10, (c) => rr(c, ix + iw - 22, cy - 9, 13, 9, 1));
  plain(ctx, '#48e0c8', (c) => c.rect(ix + iw - 20, cy - 7, 9, 2.4));
  // Nobody is serving. A card hung behind the counter says so, big enough
  // to read from across the concourse, and has said so for some time.
  {
    // Propped on top of the till, where whoever comes back will see it first.
    const w5 = 24, h5 = 12, x5 = ix + iw - 15.5 - w5 / 2, y5 = cy - 9 - h5;
    shape(ctx, '#f2ead2', 10, (c) => rr(c, x5, y5, w5, h5, 1.2));
    const t5 = 'BACK IN 5';
    const sc = Math.min(0.75, (w5 - 3) / Math.max(1, textWidth(t5, 1, 'title')));
    drawTextCentered(ctx, t5, x5 + w5 / 2, y5 + 4.6 - sc * 4.6, '#c8202e', sc, 'title');
    // "IN 5" struck through in marker, with the honest version underneath.
    const full = textWidth(t5, sc, 'title'), back = textWidth('BACK ', sc, 'title');
    const sx0 = x5 + w5 / 2 - full / 2 + back - 0.4, sx1 = x5 + w5 / 2 + full / 2 + 0.4;
    stroke(ctx, '#0d5f57', 0.5, (c) => { c.moveTo(sx0, y5 + 4.4); c.lineTo(sx1, y5 + 3.8); });
    drawTextCentered(ctx, 'EVENTUALLY', x5 + w5 / 2 + 1, y5 + 6.6, '#0d5f57', 0.3, 'marker');
  }
  // The room's light over all of it, floored at the stall's own.
  const own = typeof lit === 'function' ? (x) => Math.max(OPEN_SELF_LIT, lit(x)) : Math.max(OPEN_SELF_LIT, lit);
  shadeWall(ctx, x0 - 3, top - 8, STALL_W + 6, floorY - top + 8, own);
  fascia();
  // Its glow spills past the shade: the one warm thing on this stretch of wall.
  glow(ctx, cx, top + FASCIA_H + 4, STALL_W * 0.6, 20, stall.box, 0.2 * on);
  glow(ctx, cx, floorY - 4, STALL_W * 0.55, 8, '#ffd8a0', 0.12);
}

// ------------------------------------------------------------- the fruit
// Every piece is drawn the same way the cast is: a flat body colour, a darker
// shadow side away from the key light (upper left), a hot highlight toward
// it, and the soft outline. At hub scale a fruit is three or four world units
// across, so each one is built from a handful of shapes that survive that
// size rather than from fine texture that would turn to noise.
const FOL = 'rgba(26,16,40,0.45)';
function ol(ctx, w = 0.35) { ctx.strokeStyle = FOL; ctx.lineWidth = w; ctx.stroke(); }
function ellipse(ctx, x, y, rx, ry, rot, fill, outline = true) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill(); if (outline) ol(ctx);
}
// A round fruit with a radial body, shadow crescent and highlight.
function roundFruit(ctx, x, y, r, light, mid, dark) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ol(ctx);
  ellipse(ctx, x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.17, -0.6, 'rgba(255,255,255,0.55)', false);
}
function orange(ctx, x, y, r = 2.3, leaf = false) {
  roundFruit(ctx, x, y, r, '#ffc070', '#f08a2c', '#b8561a');
  // Peel pores, a few dots on the lit side.
  for (const [dx, dy] of [[0.2, -0.5], [-0.5, 0.1], [0.4, 0.3], [-0.1, 0.6]]) {
    ctx.fillStyle = 'rgba(160,70,10,0.35)'; ctx.fillRect(x + dx * r, y + dy * r, 0.3, 0.3);
  }
  ellipse(ctx, x + r * 0.15, y - r * 0.85, 0.35, 0.25, 0, '#6a7a2a', false);
  if (leaf) {
    ctx.beginPath(); ctx.moveTo(x + r * 0.1, y - r * 0.9);
    ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.8, x + r * 1.5, y - r * 1.1);
    ctx.quadraticCurveTo(x + r * 0.8, y - r * 0.8, x + r * 0.1, y - r * 0.9);
    ctx.fillStyle = '#3e9a4a'; ctx.fill(); ol(ctx, 0.25);
  }
}
function lime(ctx, x, y) {
  roundFruit(ctx, x, y, 1.7, '#c8f07a', '#6ab83a', '#3a7a24');
  ellipse(ctx, x + 1.5, y, 0.35, 0.3, 0, '#4a8a2a', false);
}
function lemon(ctx, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25);
  const g = ctx.createRadialGradient(-0.8, -0.8, 0.2, 0, 0, 2.6);
  g.addColorStop(0, '#fff6a8'); g.addColorStop(0.6, '#f6d33c'); g.addColorStop(1, '#c09a1a');
  ctx.beginPath();
  ctx.moveTo(-2.9, 0); ctx.quadraticCurveTo(-2.4, -1.9, 0, -1.9); ctx.quadraticCurveTo(2.4, -1.9, 2.9, 0);
  ctx.quadraticCurveTo(2.4, 1.9, 0, 1.9); ctx.quadraticCurveTo(-2.4, 1.9, -2.9, 0);
  ctx.fillStyle = g; ctx.fill(); ol(ctx);
  ellipse(ctx, -0.8, -0.9, 0.8, 0.35, -0.2, 'rgba(255,255,255,0.55)', false);
  ctx.restore();
}
function strawberry(ctx, x, y, s = 1, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const g = ctx.createLinearGradient(-1.6, -1.5, 1.4, 2.4);
  g.addColorStop(0, '#ff6a6a'); g.addColorStop(0.5, '#e0303a'); g.addColorStop(1, '#a01828');
  ctx.beginPath();
  ctx.moveTo(-1.8, -1); ctx.quadraticCurveTo(-1.9, 0.8, 0, 2.6); ctx.quadraticCurveTo(1.9, 0.8, 1.8, -1);
  ctx.quadraticCurveTo(0, -1.9, -1.8, -1);
  ctx.fillStyle = g; ctx.fill(); ol(ctx, 0.3);
  // Seeds in staggered rows.
  ctx.fillStyle = '#ffe08a';
  for (const [sx, sy] of [[-0.9, -0.2], [0, -0.4], [0.9, -0.2], [-0.5, 0.7], [0.5, 0.7], [0, 1.5], [-1.1, 0.6], [1.1, 0.6]]) {
    ctx.beginPath(); ctx.ellipse(sx, sy, 0.16, 0.24, 0, 0, Math.PI * 2); ctx.fill();
  }
  ellipse(ctx, -0.8, -0.6, 0.45, 0.22, -0.4, 'rgba(255,255,255,0.45)', false);
  // The green calyx, five pointed leaves.
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = Math.PI + (k / 4) * Math.PI;
    ctx.moveTo(0, -1.2); ctx.lineTo(Math.cos(a - 0.25) * 0.7, -1.2 + Math.sin(a - 0.25) * 0.5);
    ctx.lineTo(Math.cos(a) * 1.6, -1.2 + Math.sin(a) * 0.9); ctx.lineTo(Math.cos(a + 0.25) * 0.7, -1.2 + Math.sin(a + 0.25) * 0.5);
  }
  ctx.fillStyle = '#3e9a4a'; ctx.fill(); ol(ctx, 0.2);
  ctx.restore();
}
function banana(ctx, x, y, rot, shade) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-5, -1.2);
  ctx.quadraticCurveTo(0, 2.4, 5, -1.6);
  ctx.quadraticCurveTo(5.4, -1.2, 5.1, -0.5);
  ctx.quadraticCurveTo(0, 4.2, -5.2, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -1, 0, 3);
  g.addColorStop(0, shade ? '#f0c83a' : '#ffe36a'); g.addColorStop(1, shade ? '#b8901a' : '#d8a82a');
  ctx.fillStyle = g; ctx.fill(); ol(ctx, 0.3);
  // The ridge along the top and the dark tip at each end.
  ctx.beginPath(); ctx.moveTo(-4.2, -0.4); ctx.quadraticCurveTo(0, 2.6, 4.4, -1);
  ctx.strokeStyle = 'rgba(255,250,200,0.6)'; ctx.lineWidth = 0.35; ctx.stroke();
  ellipse(ctx, 5.15, -1.05, 0.45, 0.4, 0, '#4a3418', false);
  ellipse(ctx, -5.1, -0.55, 0.5, 0.45, 0, '#6a5a24', false);
  ctx.restore();
}
function pineapple(ctx, x, y) {
  // Crown first, so the body overlaps its base: three layers of spiky leaves.
  const leaves = [[-0.9, 4.4, '#2e7a3a'], [0.9, 4.4, '#2e7a3a'], [-0.45, 5.6, '#3e9a4a'], [0.45, 5.6, '#3e9a4a'], [0, 6.6, '#5ab85a']];
  for (const [lean, len, col] of leaves) {
    ctx.beginPath();
    ctx.moveTo(x - 0.8, y - 4.6);
    ctx.quadraticCurveTo(x + lean * 2, y - 4.6 - len * 0.6, x + lean * 2.6, y - 4.6 - len);
    ctx.quadraticCurveTo(x + lean * 1.2 + 0.4, y - 4.6 - len * 0.5, x + 0.8, y - 4.6);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ol(ctx, 0.25);
  }
  // Body: an upright oval with a gold-to-amber turn.
  const g = ctx.createLinearGradient(x - 3, y - 4, x + 3, y + 4);
  g.addColorStop(0, '#ffd870'); g.addColorStop(0.5, '#e8a83a'); g.addColorStop(1, '#a8661e');
  ctx.beginPath(); ctx.ellipse(x, y, 3.1, 4.8, 0, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ol(ctx);
  // The diamond crosshatch, clipped to the body, with an eye in each cell.
  ctx.save();
  ctx.beginPath(); ctx.ellipse(x, y, 3.1, 4.8, 0, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(110,60,20,0.65)'; ctx.lineWidth = 0.28;
  ctx.beginPath();
  for (let k = -6; k <= 6; k++) {
    ctx.moveTo(x - 4 + k * 1.5, y - 6); ctx.lineTo(x + 4 + k * 1.5, y + 6);
    ctx.moveTo(x + 4 + k * 1.5, y - 6); ctx.lineTo(x - 4 + k * 1.5, y + 6);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(90,50,10,0.55)';
  for (let r = -3; r <= 3; r++) for (let k = -2; k <= 2; k++) {
    ctx.fillRect(x + k * 1.5 + (r % 2 ? 0.75 : 0) - 0.15, y + r * 1.15 - 0.15, 0.3, 0.3);
  }
  ctx.restore();
  ellipse(ctx, x - 1.3, y - 2, 0.6, 1.4, 0.2, 'rgba(255,240,200,0.35)', false);
}
function watermelonSlice(ctx, x, y) {
  // A wedge stood on its rind: green rind, pale band, red flesh, black seeds.
  ctx.beginPath(); ctx.moveTo(x - 4.2, y); ctx.lineTo(x + 4.2, y); ctx.lineTo(x, y - 5.6); ctx.closePath();
  ctx.fillStyle = '#e8384a'; ctx.fill(); ol(ctx);
  ctx.fillStyle = '#ff6a78';
  ctx.beginPath(); ctx.moveTo(x - 2.6, y - 1.4); ctx.lineTo(x, y - 5); ctx.lineTo(x - 1, y - 1.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2f0c8'; ctx.fillRect(x - 4.2, y - 0.9, 8.4, 0.6);
  ctx.fillStyle = '#3a8a3a'; ctx.fillRect(x - 4.4, y - 0.4, 8.8, 0.9);
  ctx.fillStyle = '#1a1414';
  for (const [sx, sy] of [[-1.6, 1.8], [0.2, 2.4], [1.6, 1.8], [-0.6, 3.6], [0.8, 3.4]]) {
    ctx.beginPath(); ctx.ellipse(x + sx, y - sy, 0.22, 0.38, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// The display, its base at (x, y) on the counter top: a woven basket of
// oranges and lemons, the pineapple standing behind it, a bunch of bananas
// draped over the front, strawberries in a punnet, a watermelon wedge and a
// lime at the end. About 34 x 16 world units.
export function drawFruitDisplay(ctx, x, y) {
  ctx.save();
  // Pineapple, back left, standing proud of everything.
  pineapple(ctx, x - 8, y - 6.2);
  // The basket: a shallow trapezoid, woven bands, a rim.
  const bx = x - 4;
  ctx.beginPath(); ctx.moveTo(bx - 9, y - 4.6); ctx.lineTo(bx + 9, y - 4.6); ctx.lineTo(bx + 7.4, y); ctx.lineTo(bx - 7.4, y); ctx.closePath();
  ctx.fillStyle = '#a8743a'; ctx.fill(); ol(ctx);
  ctx.strokeStyle = '#7a4e24'; ctx.lineWidth = 0.35;
  ctx.beginPath();
  for (let k = 1; k < 3; k++) { ctx.moveTo(bx - 9 + k * 0.55, y - 4.6 + k * 1.5); ctx.lineTo(bx + 9 - k * 0.55, y - 4.6 + k * 1.5); }
  for (let k = -8; k <= 8; k += 2) { ctx.moveTo(bx + k, y - 4.6); ctx.lineTo(bx + k * 0.82, y); }
  ctx.stroke();
  // Fruit heaped in it, back row first.
  orange(ctx, bx - 5.6, y - 6.2); lemon(ctx, bx - 1, y - 6.6); orange(ctx, bx + 4, y - 6.4, 2.3, true);
  orange(ctx, bx - 2.8, y - 4.9, 2.4); orange(ctx, bx + 1.6, y - 4.9, 2.4); lemon(ctx, bx + 6.4, y - 5);
  ctx.beginPath(); ctx.moveTo(bx - 9.4, y - 4.8); ctx.lineTo(bx + 9.4, y - 4.8); ctx.lineTo(bx + 9.4, y - 3.9); ctx.lineTo(bx - 9.4, y - 3.9); ctx.closePath();
  ctx.fillStyle = '#c8945a'; ctx.fill(); ol(ctx, 0.3);
  // Bananas, draped over the basket's front edge.
  banana(ctx, bx - 1.5, y - 2.8, -0.12, true);
  banana(ctx, bx - 1, y - 2.0, -0.05, false);
  banana(ctx, bx - 0.6, y - 1.2, 0.04, false);
  ellipse(ctx, bx - 6.6, y - 2.4, 0.9, 1.2, 0, '#6a5a24');
  // The punnet of strawberries.
  const px = x + 10.5;
  ctx.beginPath(); ctx.moveTo(px - 3.6, y - 3); ctx.lineTo(px + 3.6, y - 3); ctx.lineTo(px + 3, y); ctx.lineTo(px - 3, y); ctx.closePath();
  ctx.fillStyle = '#5a8ad8'; ctx.fill(); ol(ctx);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px - 3.2, y - 2.6, 6.4, 0.5);
  strawberry(ctx, px - 1.9, y - 3.6, 0.85, -0.3); strawberry(ctx, px + 1.9, y - 3.5, 0.85, 0.3); strawberry(ctx, px, y - 4.6, 0.9, 0);
  // Watermelon wedge and a lime at the end.
  watermelonSlice(ctx, x + 18.5, y);
  lime(ctx, x + 23.6, y - 1.7);
  ctx.restore();
}

// Dolores's and Gary's units, signed the same way as the stalls.
export const COUNTER_UNITS = {
  bench: { name: "DOLORES' REPAIRS", box: '#e8b04a', ink: '#2a1c06', open: true, shell: true, sign: 'serving', board: {
    title: 'REPAIRS WHILE U WAIT', foot: 'ESTIMATES ARE ESTIMATES. WAITING IS EXTRA.',
    rows: [['HINGE REALIGNMENT', '2 PLUGS'], ['JOYSTICK DE-STICKING', '3 PLUGS'], ['FUSE, NEW (OLD)', '1 PLUG'],
      ['HAVE YOU TRIED UNPLUGGING IT', 'FREE'], ['FIXING WHAT GARY SOLD YOU', '5 PLUGS']],
  } },
  shop: { name: "GARY'S PAWN SHOP", box: '#f890b8', ink: '#3a0c2a', open: true, shell: true, board: {
    title: 'WE BUY', foot: 'ALL SALES FINAL. SOME SALES HAUNTED.',
    rows: [['GENTLY HAUNTED ITEMS', 'ASK'], ['TROPHIES (NOT YOURS)', 'NO QUESTIONS'], ['SOCKS, SINGLE', '1 COIN'],
      ['SOULS', 'ASK GARY'], ['ANYTHING DOLORES FIXED', 'HALF PRICE']],
  } },
};
export const COUNTER_UNIT_W = 130;

// ------------------------------------------------------------- the menu
// THE SMOOTHIES. Seven go up on the board each time you come into the food
// court, drawn fresh from this list (pickSmoothieMenu), so the board is never
// quite the same twice. The last line is always the one nobody orders: the
// board strikes its price through and gives it away.
export const SMOOTHIES = [
  ['BERRY MANILOW', 2], ['LIME AFTER TIME', 2], ['THE PEACH BOYS', 3],
  ['PAPAYA DON\'T PREACH', 3], ['PLUM AND GET IT', 2], ['BERRY WHITE', 3], ['ORANGE YOU GLAD', 2], // The 80s set: the food court's own decade, on the radio when it opened.
  ['TAKE ON MELON', 2], ['TAINTED LIME', 2], ['SWEET DREAMS ARE MADE OF CREAM', 3], ['PEAR-PLE RAIN', 3],
  ['HUNGRY LIKE THE WOLFBERRY', 3], 
  ['I WANNA DANCE WITH SOMEBERRY', 3], ['NEVER GONNA GIVE YOU PULP', 2], 
  ['RELAX, DON\'T JUICE IT', 2], ['LIVIN\' ON A PEAR', 3], ['WHAT\'S LOVE GOT TO DO WITH FRUIT', 3], ['MANIC MANGO MONDAY', 2], ['ISLANDS IN THE CREAM', 3],
  ['WE BUILT THIS CITY ON ROCK MELON', 4], ['GIRLS JUST WANNA HAVE PLUMS', 3], ['LIKE A VIRGIN COLADA', 3],
  ['WAKE ME UP BEFORE YOU GUAVA', 3], ['SWEET CHILD O\' LIME', 2], 
  ['SOY GEORGE', 2], ['DURIAN DURIAN', 3], ['BLUEBERRY MONDAY', 2], ['FRUITLOOSE', 2], ['99 RED BERRIES', 3],
];
// The ones nobody wants. One of these is always the bottom line.
export const SMOOTHIE_DUDS = [
  ['KALE-ING ME SOFTLY', 1], ['AVOCADON\'T', 1], ['WHEY TOO MUCH', 1],
  ['SPROUT AND ABOUT', 1],
  ['CELERY BRATION', 1], ['THE GREEN MILE', 1], ['DON\'T STOP BELEAFIN\'', 1], ['SPINACH ME ROUND', 1],
];
const plugs = (n) => `${n} PLUG${n === 1 ? '' : 'S'}`;
export const SMOOTHIE_MENU_DEFAULT = [
  ['BERRY MANILOW', '2 PLUGS'], ['MANGO TANGO', '2 PLUGS'], ['LIME AFTER TIME', '2 PLUGS'],
  ['THE PEACH BOYS', '3 PLUGS'], ['KALE-ING ME SOFTLY', '1 PLUG'],
];
// `rand` is any () => [0, 1) source; the hub passes Math.random.
// Rows on the board: six picks and the dud.
export const SMOOTHIE_ROWS = 7;
function smoothieMenuWords(name) {
  return new Set(name.toUpperCase().replace(/[’']/g, '').match(/[A-Z0-9]+/g).map((word) => {
    // Treat berry varieties as one fruit family, and plural plums as PLUM.
    if (word === 'BERRIES' || word.endsWith('BERRY')) return 'BERRY';
    if (word === 'PLUMS') return 'PLUM';
    return word;
  }));
}
export function pickSmoothieMenu(rand = Math.random) {
  const pool = SMOOTHIES.slice();
  const out = [];
  const usedWords = new Set();
  while (out.length < SMOOTHIE_ROWS - 1 && pool.length) {
    const item = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const words = smoothieMenuWords(item[0]);
    if ([...words].some((word) => usedWords.has(word))) continue;
    out.push(item);
    for (const word of words) usedWords.add(word);
  }

  // Keep the dud's joke distinct from the six regular offerings as well.
  const compatibleDuds = SMOOTHIE_DUDS.filter(([name]) =>
    [...smoothieMenuWords(name)].every((word) => !usedWords.has(word)));
  const dudPool = compatibleDuds.length ? compatibleDuds : SMOOTHIE_DUDS;
  out.push(dudPool[Math.floor(rand() * dudPool.length)]);
  return out.map(([name, n]) => [name, plugs(n)]);
}
