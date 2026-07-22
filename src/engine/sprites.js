// Procedural pixel sprites: string grids + palette maps compiled once into
// offscreen canvases. '.' and ' ' are transparent; any other char indexes the palette.

const cache = new Map();

export function buildSprite(key, grid, pal) {
  if (cache.has(key)) return cache.get(key);
  const h = grid.length, w = grid[0].length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  for (let r = 0; r < h; r++) {
    const row = grid[r];
    for (let col = 0; col < row.length; col++) {
      const k = row[col];
      if (k === '.' || k === ' ') continue;
      x.fillStyle = pal[k] || '#f0f';
      x.fillRect(col, r, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

export function getSprite(key) { return cache.get(key); }

export function flipped(key) {
  const fk = key + '|flip';
  if (cache.has(fk)) return cache.get(fk);
  const src = cache.get(key);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  cache.set(fk, c);
  return c;
}

// Scale2x (EPX): doubles pixel-art resolution while smoothing diagonals —
// bigger and less blocky without any blur. Falls back to plain 2x if pixel
// data is unavailable (headless stubs).
function epxUpscale(src) {
  const w = src.width, h = src.height;
  const out = document.createElement('canvas');
  out.width = w * 2; out.height = h * 2;
  const octx = out.getContext('2d');
  try {
    const data = src.getContext('2d').getImageData(0, 0, w, h).data;
    if (data.length !== w * h * 4) throw new Error('stub');
    const px = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      const i = (y * w + x) * 4;
      return data[i] << 24 | data[i + 1] << 16 | data[i + 2] << 8 | data[i + 3];
    };
    const o = octx.createImageData(w * 2, h * 2);
    const put = (x, y, v) => {
      const i = (y * w * 2 + x) * 4;
      o.data[i] = (v >>> 24) & 255; o.data[i + 1] = (v >>> 16) & 255;
      o.data[i + 2] = (v >>> 8) & 255; o.data[i + 3] = v & 255;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const P = px(x, y);
        const A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), D = px(x, y + 1);
        let e1 = P, e2 = P, e3 = P, e4 = P;
        if (C === A && C !== D && A !== B) e1 = A;
        if (A === B && A !== C && B !== D) e2 = B;
        if (D === C && D !== B && C !== A) e3 = C;
        if (B === D && B !== A && D !== C) e4 = D;
        put(x * 2, y * 2, e1); put(x * 2 + 1, y * 2, e2);
        put(x * 2, y * 2 + 1, e3); put(x * 2 + 1, y * 2 + 1, e4);
      }
    }
    octx.putImageData(o, 0, 0);
  } catch (e) {
    octx.imageSmoothingEnabled = false;
    octx.drawImage(src, 0, 0, w * 2, h * 2);
  }
  return out;
}

export function scaled2x(key) {
  const sk = key + '|2x';
  if (cache.has(sk)) return cache.get(sk);
  const src = cache.get(key);
  if (!src) return null;
  const out = epxUpscale(src);
  cache.set(sk, out);
  return out;
}


// Tint: recolor every opaque pixel (for style packs / silhouettes).
export function tinted(key, color) {
  const tk = key + '|tint|' + color;
  if (cache.has(tk)) return cache.get(tk);
  const src = cache.get(key);
  if (!src) return null;
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  cache.set(tk, c);
  return c;
}

// ---------------------------------------------------------------------------
// 5x7 pixel font (A-Z 0-9 punctuation). One string per glyph, rows of 5.
const GLYPHS = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 11110 10001 10001 10001 11110',
  C: '01111 10000 10000 10000 10000 10000 01111', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 11110 10000 10000 10000 11111', F: '11111 10000 11110 10000 10000 10000 10000',
  G: '01111 10000 10000 10111 10001 10001 01110', H: '10001 10001 11111 10001 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 11100 10010 10001 10001 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10010 10001 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001', X: '10001 01010 00100 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00110 01000 10000 11111', 3: '11110 00001 00001 01110 00001 00001 11110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '01110 10000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00001 01110',
  '.': '00000 00000 00000 00000 00000 00100 00100', ',': '00000 00000 00000 00000 00100 00100 01000',
  ':': '00000 00100 00100 00000 00100 00100 00000', '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00110 00100 00000 00100', '-': '00000 00000 00000 01110 00000 00000 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000', '/': '00001 00010 00010 00100 01000 01000 10000',
  "'": '00100 00100 01000 00000 00000 00000 00000', '"': '01010 01010 00000 00000 00000 00000 00000',
  '(': '00010 00100 01000 01000 01000 00100 00010', ')': '01000 00100 00010 00010 00010 00100 01000',
  '%': '11001 11010 00010 00100 01000 01011 10011', '*': '00000 10101 01110 11111 01110 10101 00000',
  '>': '01000 00100 00010 00001 00010 00100 01000', '<': '00010 00100 01000 10000 01000 00100 00010',
  '=': '00000 00000 11111 00000 11111 00000 00000', '#': '01010 11111 01010 01010 01010 11111 01010',
  '3IQ': '00000', // placeholder never used
  '×': '00000 10001 01010 00100 01010 10001 00000', // ×
  '♥': '00000 01010 11111 11111 01110 00100 00000', // ♥ battery cells
  '⚡': '00010 00100 01000 11110 00100 01000 10000', // ⚡
};

const fontCache = new Map();

function glyphCanvas(ch, color) {
  const key = ch + '|' + color;
  if (fontCache.has(key)) return fontCache.get(key);
  const def = GLYPHS[ch] || GLYPHS[ch.toUpperCase()];
  if (!def) return null;
  const rows = def.split(' ');
  const c = document.createElement('canvas');
  c.width = 5; c.height = 7;
  const x = c.getContext('2d');
  x.fillStyle = color;
  for (let r = 0; r < rows.length; r++)
    for (let col = 0; col < 5; col++)
      if (rows[r][col] === '1') x.fillRect(col, r, 1, 1);
  fontCache.set(key, c);
  return c;
}

export function textWidth(str, scale = 1, style = 'ui') {
  const s = String(str);
  let w = 0;
  for (let i = 0; i < s.length; i++) w += advance(s[i], scale, style);
  return w > 0 ? w - trackingFor(style, scale) : 0; // no trailing tracking on the last glyph
}

export function wrapText(str, maxWidth, scale = 1, maxLines = 2, style = 'ui') {
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, scale, style) > maxWidth) { lines.push(line); line = word; }
    else line = next;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) {
    const consumed = lines.join(' ').split(/\s+/).filter(Boolean).length;
    const rest = words.slice(consumed).join(' ');
    let last = rest;
    while (last.length > 1 && textWidth(last, scale, style) > maxWidth) last = `${last.slice(0, -2).trim()}…`;
    lines.push(last);
  }
  return lines;
}

// Smooth vector lettering, proportionally spaced: each glyph advances by its
// own measured width. The old fixed six-unit cell monospaced what is really a
// proportional face, which left rivers around narrow letters like I and L.
const BODY_FAMILY = "'Fredoka'";
const TITLE_FAMILY = "'Lilita One'";
// Anything the fiction says was written BY HAND, on top of something printed —
// the corrections on the food court's menu board, and whatever else ends up
// scrawled on this place. A marker face rather than a script one on purpose:
// the wall dressings set it at about two logical pixels of cap height, and a
// fine-stroked handwriting face turns to mush at that size where a fat nib
// survives. The fallback is deliberately the same stack as everything else —
// if the face never lands, the line still reads, just in the wrong hand.
const MARKER_FAMILY = "'Permanent Marker'";
const FALLBACK = "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
const BODY_FONT = `${BODY_FAMILY}, ${FALLBACK}`;
const TITLE_FONT = `${TITLE_FAMILY}, ${FALLBACK}`;
const MARKER_FONT = `${MARKER_FAMILY}, ${FALLBACK}`;

// Text styles the game draws in. 'ui' is the default everywhere; 'bold' is the
// highlighted menu row; 'title' is the marquee and every screen header.
// 'marquee' and 'subtitle' are the title screen's own cuts: fixed letter-spacing
// and, for the marquee, a dark outline baked into each glyph.
const TEXT_STYLES = {
  ui: { font: BODY_FONT, weight: 500 },
  bold: { font: BODY_FONT, weight: 600 },
  title: { font: TITLE_FONT, weight: 400 },
  marquee: { font: TITLE_FONT, weight: 400, tracking: 0.5, stroke: { width: 1, color: '#2a1e05' } },
  subtitle: { font: BODY_FONT, weight: 600, tracking: 3 },
  marker: { font: MARKER_FONT, weight: 400 },
};
const GLYPH_PX = 8.2;   // em size, unchanged — only the spacing moved
const TRACKING = 0.5;   // a hair of letter-spacing; pure metric fit reads tight here

function fontString(style, scale) {
  const st = TEXT_STYLES[style] || TEXT_STYLES.ui;
  return `${st.weight} ${GLYPH_PX * scale}px ${st.font}`;
}

// Default tracking rides the scale so big text keeps its proportions; a style
// that names its own tracking means it literally, in canvas units, because the
// title screen's spacing was chosen against the finished size on screen.
function trackingFor(style, scale) {
  const st = TEXT_STYLES[style] || TEXT_STYLES.ui;
  return st.tracking !== undefined ? st.tracking : TRACKING * scale;
}

let measureCtx = null;
const advCache = new Map();
function advance(ch, scale, style) {
  const key = ch + '|' + scale + '|' + style;
  let w = advCache.get(key);
  if (w === undefined) {
    if (!measureCtx && typeof document !== 'undefined') {
      measureCtx = document.createElement('canvas').getContext('2d');
    }
    if (measureCtx) {
      measureCtx.font = fontString(style, scale);
      w = measureCtx.measureText(ch).width + trackingFor(style, scale);
    }
    // Headless (no canvas, or a stub that measures 0) falls back to the old
    // fixed grid so layout maths stays sane outside a browser.
    if (!w || !isFinite(w)) w = 6 * scale;
    advCache.set(key, w);
  }
  return w;
}

// Glyphs are rasterized ONCE into supersampled canvases and then blitted —
// drawImage is a GPU texture copy, while per-frame fillText re-rasterizes
// vector outlines on the CPU. Menus are wall-to-wall text, so this matters.
const glyphCache = new Map();
const GLYPH_SS = 8;
function glyphSprite(ch, color, scale, style) {
  const key = ch + '|' + color + '|' + scale + '|' + style;
  let g = glyphCache.get(key);
  if (!g) {
    // Pad the cell so round/italic overhang isn't clipped at the advance edge.
    const pad = 2 * scale;
    const boxW = advance(ch, scale, style) + pad * 2;
    g = document.createElement('canvas');
    g.width = Math.ceil(boxW * GLYPH_SS);
    g.height = Math.ceil(12 * scale * GLYPH_SS);
    const x = g.getContext('2d');
    x.scale(GLYPH_SS, GLYPH_SS);
    x.fillStyle = color;
    x.font = fontString(style, scale);
    x.textBaseline = 'top';
    x.textAlign = 'left';
    // Outline first, fill over it: a centred stroke would otherwise eat into the
    // letterform. Only the outer half shows, so the width is doubled to match.
    const st = TEXT_STYLES[style] || TEXT_STYLES.ui;
    if (st.stroke) {
      x.strokeStyle = st.stroke.color;
      x.lineWidth = st.stroke.width * 2;
      x.lineJoin = 'round';
      x.strokeText(ch, pad, 1 * scale);
    }
    x.fillText(ch, pad, 1 * scale);
    g.pad = pad;
    g.boxW = boxW;
    glyphCache.set(key, g);
  }
  return g;
}

// The webfonts arrive after first paint, so anything measured or rasterized
// against the fallback stack has to be thrown away once they land.
//
// document.fonts.ready alone is NOT enough. A @font-face is only fetched once
// something renders with it, and this game renders only to canvas, which does
// not reliably trigger that fetch. With no load pending, the font set reports
// status='loaded' and ready resolves on the next microtask — measurably before
// the faces exist (status=loaded while check() is false for both). This module
// evaluates before the first frame, so it captures ready at exactly that
// moment, clears an empty cache, and never fires again; whatever the first
// frame then rasterizes in Trebuchet is cached for the life of the page.
//
// So ask for the faces by name. That both starts the download and gives a
// promise that resolves when they are genuinely usable.
if (typeof document !== 'undefined' && document.fonts) {
  const drop = () => { glyphCache.clear(); advCache.clear(); };
  if (document.fonts.load) {
    const faces = [
      `400 32px ${TITLE_FAMILY}`,
      `500 12px ${BODY_FAMILY}`,
      `600 12px ${BODY_FAMILY}`,
      `400 12px ${MARKER_FAMILY}`,
    ];
    Promise.all(faces.map((f) => document.fonts.load(f).catch(() => {}))).then(drop);
  }
  if (document.fonts.ready) document.fonts.ready.then(drop);
}

function paintGlyphs(ctx, s, x, y, color, scale, style) {
  let cx = x;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ' ') {
      const g = glyphSprite(ch, color, scale, style);
      ctx.drawImage(g, cx - g.pad, y - 1 * scale, g.boxW, 12 * scale);
    }
    cx += advance(ch, scale, style);
  }
  return cx;
}

// Shared plate for any text drawn straight onto the scene — HUD, floaties,
// boss labels. A soft translucent backing separates text from whatever is
// scrolling past without touching the glyphs themselves, which is what a
// shadow or an outline would do. Deliberately weak: it should register as the
// text sitting slightly forward, not as a labelled box.
export const UI_PLATE = 'rgba(12,10,22,0.22)';

// The backing for UI that owns its own box — the status pill, the hero name
// badge, the objective panels, the speech bubble. A cool translucent slate
// rather than true black: at full strength a pure black rect punches a hole in
// the scene, where this still reads as a panel laid over it.
export const UI_PANEL = 'rgba(28,32,48,0.72)';

// The hairline every HUD panel is edged with. Weak enough to read as the lit
// edge of a piece of glass rather than as a drawn outline.
export const UI_PANEL_BORDER = 'rgba(255,255,255,0.14)';

// A UI box that owns its own backing. Every panel in the HUD comes through
// here, which is what makes the whole overlay read as one set of objects
// rather than a pile of unrelated widgets.
//
// `opts.border` strokes a hairline edge and `opts.shadow` lifts the box off
// the scene. Without a border the box instead gets a catch-light along the top
// inside edge — an unbordered dark rect reads as a hole punched in the art, and
// it needs *something* to say "laid over" instead. The two are alternatives,
// not a pair: run both and the top edge doubles into a visible bright seam.
// Clipped to the rounded path so the highlight stops short of the corners
// instead of squaring them off.
export function drawPanel(ctx, x, y, w, h, r = 3, fill = UI_PANEL, opts = null) {
  ctx.save();
  if (opts && opts.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
  }
  platePath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (opts && opts.border) {
    // Inset by half the stroke so the hairline sits inside the fill instead of
    // straddling its edge, where it would fringe against the scene.
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = opts.border;
    platePath(ctx, x + 0.25, y + 0.25, w - 0.5, h - 0.5, r);
    ctx.stroke();
  } else {
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x, y, w, 1);
  }
  ctx.restore();
}

// Where the ink of a line actually lands, relative to the y handed to drawText,
// per unit of scale. Glyphs occupy y-1*scale .. y+11*scale, but this game writes
// in capitals, and capitals reach neither the top of that box nor anywhere near
// its floor: measured in Chromium, Fredoka's caps run y+0.85 .. y+6.78 at
// scale 1, and the Trebuchet fallback lands within a quarter unit of both edges.
// The remaining half of the box is ascender slack and descender room nothing
// ever occupies, so centring the BOX on a midline puts the lettering visibly
// high in it — by two units, which is most of a row's apparent padding.
export const TEXT_INK_TOP = 0.85;
export const TEXT_INK_H = 5.95;

// The y to hand drawText so its lettering sits optically centred on `midY`.
// Anything that centres text in a box it also draws — menu row highlights, HUD
// panels, button discs — measures from here, so the box and the words inside it
// are always derived from the same number.
export function textYForMid(midY, scale = 1) {
  return midY - (TEXT_INK_TOP + TEXT_INK_H / 2) * scale;
}

// The cursor behind the selected row of any list the player can arrow through.
// One painter rather than a colour each screen re-picks: a highlight that shows
// up on some lists and not others reads as those lists not being navigable.
export const MENU_ROW_HILITE = 'rgba(255,207,51,0.12)';
export function drawMenuRow(ctx, x, y, w, h, r = 3) {
  ctx.fillStyle = MENU_ROW_HILITE;
  platePath(ctx, x, y, w, h, r);
  ctx.fill();
}

// `plate` (a css colour) fills a soft rounded rect behind the string, sized
// from the same metrics the glyphs use, hugging the ink band rather than the
// full glyph box — the full box reads as a tall bar with the text floating in
// it, and floating high at that.
export function platePath(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export function drawText(ctx, str, x, y, color = '#fff', scale = 1, style = 'ui', plate = null) {
  const s = String(str);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  if (plate && s.trim()) {
    const w = textWidth(s, scale, style);
    const padX = 2.2 * scale, padY = 1.2 * scale, band = 9 * scale;
    // Centred on the ink rather than on the glyph box: measured from the box,
    // the plate hung three units below the lettering and only two above it.
    const inkMid = y + (TEXT_INK_TOP + TEXT_INK_H / 2) * scale;
    ctx.fillStyle = plate;
    platePath(ctx, x - padX, inkMid - band / 2 - padY, w + padX * 2, band + padY * 2, 3 * scale);
    ctx.fill();
  }
  const cx = paintGlyphs(ctx, s, x, y, color, scale, style);
  ctx.imageSmoothingEnabled = prev;
  return cx;
}

export function drawTextCentered(ctx, str, cx, y, color = '#fff', scale = 1, style = 'ui', plate = null) {
  drawText(ctx, str, cx - textWidth(String(str), scale, style) / 2, y, color, scale, style, plate);
}

// Labels ride a size down inside a disc: at full scale a four-letter word
// reaches the edge and the button reads as a word someone drew a circle around,
// rather than as a button.
const BUTTON_LABEL_S = 0.85;

// The on-screen touch controls — jump, power, pause — are one instrument in
// three places, so they are one painter rather than three call sites that
// happen to agree today. Discs, not plates: the round ones are the controls you
// hold, and keeping them shaped differently from every rectangular readout in
// the HUD means a thumb never has to read anything to find them.
//
// A soft shadow of a disc and nothing else — no outline, and barely there. The
// rest of the HUD is bordered panels because it is information you read; these
// are furniture you press without looking, and they sit ON the play field
// rather than beside it. A teal ring made three hard targets the eye kept
// catching on while the level scrolled past underneath them. What survives is
// the ink: the label carries the button, and the disc only has to lift it off
// whatever colour happens to be behind it that second.
//
// `opts.frac` (0..1) floods the disc from the bottom for the power button's
// recharge: a level, not a ticking number. It has to read against any pack's
// background, so the waterline carries a bright meniscus rather than leaning on
// the flood colour alone — and with no outline to mark the disc's extent, that
// line is also the only thing drawing its edge.
export function drawRoundButton(ctx, b, opts = {}) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = Math.min(b.w, b.h) / 2;
  const ink = opts.ink || '#48e0c8';
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = opts.fill || 'rgba(11,11,20,0.22)';
  ctx.fill();
  if (opts.frac != null && opts.frac < 1) {
    ctx.clip();
    const fh = Math.round(r * 2 * Math.max(0, opts.frac));
    ctx.fillStyle = 'rgba(72,224,200,0.28)';
    ctx.fillRect(cx - r, cy + r - fh, r * 2, fh);
    ctx.fillStyle = 'rgba(184,248,232,0.8)';
    ctx.fillRect(cx - r, cy + r - fh, r * 2, 1.5);
  }
  ctx.restore();
  if (b.icon === 'pause') {
    // The one control with a symbol every player already knows. A glyph also
    // survives a translation and a smaller button; the word PAUSE does neither.
    const bw = Math.max(2, r * 0.19), bh = r * 0.82, gap = r * 0.22;
    ctx.fillStyle = ink;
    ctx.fillRect(cx - gap - bw, cy - bh / 2, bw, bh);
    ctx.fillRect(cx + gap, cy - bh / 2, bw, bh);
  } else if (b.label) {
    // Same ink-centred midline every HUD panel uses, so a label in a disc sits
    // at the same height as a label in a plate.
    drawTextCentered(ctx, b.label, cx, textYForMid(cy, BUTTON_LABEL_S), ink, BUTTON_LABEL_S);
  }
}
