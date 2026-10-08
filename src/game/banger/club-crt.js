// THE CLUB ON A CRT — B-33P's 8-BIT, seen. 5 Oct 2026.
//
// Peter: "i love the 8 bit effect sound wise... visually could we use like the crt pixel
// effect on everything except the ui elements". So while the band plays on the 8-Bit Sound
// Set (club-voices.js) the ROOM — the heroes, the floor, the lights, the signs, everything but
// the buttons, the captions and the mixer — goes the way Field Service's arcade intro does
// (src/engine/arcadeIntro.js): the picture cut to cells, every cell snapped to one of a set of
// flat inks, an aperture grille over it, the picture screened back up for brightness, a
// little bloom and a vignette. The club paints its room, clubCrt() turns that part of the
// canvas into the tube, and the club paints its UI over it, crisp.
//
// The cells are sized off the heroes — a hero is HERO_ROWS cells tall in either orientation,
// so they read as 8-bit sprites rather than as blur — and the inks are the club's own, in
// three sets: k-means over the room at the 4px level of club frames (its purples and navies)
// with a farthest-point pass so the small things that stand out keep a colour of their own
// (the neons, the gold); k-means over the band the heroes stand in, so their clothes, skin
// and hair are not dragged into the room's purples; and the dance floor's five tints, as
// they sit on its dark tiles, which no k-means kept. (The arcade intro's inks are the
// plumber's world — greens and sky — and turned the club to mud.) The LED board gets a tube
// of its own (Peter, 6 Oct 2026: "in 8 bit mode, the sign should also have the 8 bit
// filter"): the room's cells are bigger than its dots and would mush what it says, so it is
// painted again over the room and put through clubCrt with `box` — a cell to a dot, in a few
// reds of its own (LED_INKS), so every dot is a block and the words still read (club.js).
//
// COST. One downscale of the room to the cell grid, one readback of it (about 90 x 160 cells),
// a nearest-ink pass on the CPU, and five full-room fills. The lighter room (a slow device)
// leaves out the bloom.
import { cellTile, grilleSoftTile } from '../../engine/arcadeIntro.js';

/** How many cells tall a hero is drawn while the room is on the tube. */
export const HERO_ROWS = 22;

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
/** THE CLUB'S INKS (work/local/club-inks.py, club-hero-inks.py; 5 Oct 2026). */
export const CLUB_INKS = Object.freeze([
  // the room: eighteen by k-means, eight farthest-point
  '#38304d', '#1a3e52', '#dcd5ce', '#191531', '#d7b979', '#261c22', '#2a2441', '#954a39', '#3e3235',
  '#4f4b48', '#493e5d', '#0c0914', '#505e71', '#131024', '#211b39', '#d06578', '#6d94a7', '#7e8653',
  '#69fcfe', '#ba7eff', '#7cff6b', '#7849cb', '#3db2f7', '#d79224', '#fefb65', '#f586bc',
  // the heroes: twelve by k-means over the band they stand in, four farthest-point
  '#f0ede7', '#526cc6', '#bf8f60', '#d5d0cc', '#aca8ac', '#38a5a1', '#515979', '#8f523d', '#70994a',
  '#e8c289', '#252649', '#827e8e', '#87effd', '#2b651d', '#f6d33c', '#e6603b',
  // the dance floor's tints (club.js DISCO) a quarter over its dark tile
  '#53244d', '#534434', '#233e64', '#33503e', '#402c64',
].map(hexRgb));

/**
 * THE LED BOARD'S INKS: the unlit board in three dark reds (club.js drawLed paints its unlit
 * dots solid in them, scattered, so the board is grubby rather than a clean dark), a lit dot,
 * and a hot one where the glows pile up. The board is painted solid for the tube, every lit
 * dot a full square, so a lit dot can never be averaged away. (The unlit dots once flickered
 * between two darks as the cells cut the round dots unevenly; painted solid, each cell is a
 * fixed mix, so the scatter holds still.) No ink for the glow a lit dot throws on its
 * neighbours: it filled the gaps and the insides of the letters with dark red blocks, which
 * made them harder to read (Peter, 6 Oct 2026), so a cell is either lit or the board. (The
 * frame's edge had an ink once too, and took those cells over when the glow's went.)
 */
export const LED_INKS = Object.freeze(['#1c0a0a', '#2c100d', '#0e0607', '#d0402a', '#ff6a40'].map(hexRgb));

/**
 * THE CLUB SIGN'S INKS, for its words set in cells (club.js neonPixels): its board and the
 * board's edge, the glow beside a lit cell, a lit cell dimmed by the neon's flicker, and a lit
 * cell. On the room's inks the glow and the tube came out the same pinks, so the letters
 * drowned in a pink slab.
 */
export const SIGN_INKS = Object.freeze(['#130f1f', '#2e2640', '#4a1a3e', '#8c2a63', '#ff4fa3'].map(hexRgb));

// A cache from colour to ink: a club frame has a few thousand distinct cell colours, and
// most of them recur frame to frame. Keyed on 5 bits a channel, which no eye can tell apart.
// Weak, as each lock-screen cover brings inks of its own (song-art.js) and is done with them.
const memos = new WeakMap();
function inkOf(r, g, b, inks) {
  let memo = memos.get(inks);
  if (!memo) memos.set(inks, memo = new Map());
  const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  let ink = memo.get(key);
  if (!ink) {
    let bd = Infinity;
    for (const p of inks) {
      const dr = r - p[0], dg = g - p[1], db = b - p[2];
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;   // the arcade intro's weighting
      if (d < bd) { bd = d; ink = p; }
    }
    memo.set(key, ink);
  }
  return ink;
}

const sheets = {};
function sheet(id, w, h) {
  let s = sheets[id];
  if (!s) {
    const c = document.createElement('canvas');
    s = sheets[id] = { c, g: c.getContext('2d', { willReadFrequently: id.endsWith('cells') }) };
  }
  if (s.c.width !== w || s.c.height !== h) { s.c.width = w; s.c.height = h; }
  return s;
}

/**
 * The room on the tube. `top` and `bottom` are the room's edges in the canvas's logical units
 * (its current transform's), `toonH` a hero's height in them; `lite` leaves out the bloom.
 * With `box` ({ x, y, w, h, cell } in the same units) only that box goes on the tube, cut to
 * cells of its own size from its own corner, in `inks`, and without the tube's vignette — the
 * LED board, a cell to a dot. Each box on the tube names itself with `id`, so each keeps its
 * own scratch canvases rather than resizing a shared one every frame.
 */
export function clubCrt(ctx, { top, bottom, toonH, lite = false, box = null, inks = CLUB_INKS, id = 'box' }) {
  if (typeof document === 'undefined' || typeof ctx.getTransform !== 'function' || !ctx.canvas) return false;
  let m;
  try { m = ctx.getTransform(); } catch { return false; }
  if (!m || !Number.isFinite(m.a) || !Number.isFinite(m.d)) return false;
  const k = Math.hypot(m.a, m.b) || 1;
  let R, cell, cw, ch;
  if (box) {
    // a fractional cell, so the cells stay on the box's own grid (the board's dots) end to end
    R = { x: m.a * box.x + m.e, y: m.d * box.y + m.f, w: m.a * box.w, h: m.d * box.h };
    cell = box.cell * k;
    if (!(cell >= 1)) return false;
    cw = Math.max(1, Math.round(R.w / cell)); ch = Math.max(1, Math.round(R.h / cell));
  } else {
    const y0 = Math.max(0, Math.round(m.d * top + m.f));
    const y1 = Math.min(ctx.canvas.height, Math.round(m.d * bottom + m.f));
    R = { x: 0, y: y0, w: ctx.canvas.width, h: y1 - y0 };
    cell = Math.max(2, Math.round((toonH * k) / HERO_ROWS));
    cw = Math.ceil(R.w / cell); ch = Math.ceil(R.h / cell);
  }
  if (R.w < 8 || R.h < 8) return false;
  // the cells: the room averaged down, then every cell snapped to its ink
  const cells = sheet(box ? `${id}-cells` : 'cells', cw, ch);
  if (!cells.g) return false;
  cells.g.setTransform(1, 0, 0, 1, 0, 0);
  cells.g.imageSmoothingEnabled = true;
  cells.g.imageSmoothingQuality = 'high';
  cells.g.clearRect(0, 0, cw, ch);
  cells.g.drawImage(ctx.canvas, R.x, R.y, cw * cell, ch * cell, 0, 0, cw, ch);
  let img;
  try { img = cells.g.getImageData(0, 0, cw, ch); } catch { return false; }
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const p = inkOf(d[i], d[i + 1], d[i + 2], inks);
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  cells.g.putImageData(img, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
  // the picture, nearest-neighbour: every cell a block
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(cells.c, 0, 0, cw, ch, R.x, R.y, cw * cell, ch * cell);
  // the phosphor stripes and the scanline, multiplied
  const tile = cellTile('grilleSoft', 3, 3, k, grilleSoftTile);
  const grille = ctx.createPattern?.(tile, 'repeat');
  if (grille) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = grille;
    ctx.fillRect(R.x, R.y, R.w, R.h);
  }
  // the picture screened back over it, for the brightness the grille took
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.4;
  ctx.drawImage(cells.c, 0, 0, cw, ch, R.x, R.y, cw * cell, ch * cell);
  // a little bloom off a coarser copy
  if (!lite) {
    const bw = Math.max(1, Math.ceil(cw / 4)), bh = Math.max(1, Math.ceil(ch / 4));
    const bloom = sheet(box ? `${id}-bloom` : 'bloom', bw, bh);
    bloom.g.setTransform(1, 0, 0, 1, 0, 0);
    bloom.g.imageSmoothingEnabled = true;
    bloom.g.clearRect(0, 0, bw, bh);
    bloom.g.drawImage(cells.c, 0, 0, cw, ch, 0, 0, bw, bh);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bloom.c, 0, 0, bw, bh, R.x, R.y, bw * cell * 4, bh * cell * 4);
  }
  // the tube's own falloff to its corners
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (box) { ctx.restore(); return true; }
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2, hd = Math.hypot(R.w / 2, R.h / 2);
  const v = ctx.createRadialGradient(cx, cy, hd * 0.44, cx, cy, hd * 1.09);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.restore();
  return true;
}
