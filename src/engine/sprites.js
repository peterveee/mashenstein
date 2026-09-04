// Procedural pixel sprites: string grids + palette maps compiled once into
// offscreen canvases. '.' and ' ' are transparent; any other char indexes the palette.
import { screen } from './renderer.js';

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

/**
 * One glyph of the 5x7 font as its raw rows, for painters that lay their own
 * cells rather than blitting a canvas.
 *
 * The LCD panel is the customer: every mark on it is a rectangle on a fixed
 * grid, and a blitted glyph would be the one piece of type on that screen that
 * was drawn some other way. Returns null for anything the font does not carry.
 */
export function pixelGlyph(ch) {
  const def = GLYPHS[ch] || GLYPHS[String(ch).toUpperCase()];
  return def ? def.split(' ') : null;
}

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
// Exported for anything that rasterizes its own text off the game's faces
// rather than through drawText — see onGameFontsChanged below.
export const TITLE_FONT = `${TITLE_FAMILY}, ${FALLBACK}`;
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
// Glyphs rasterize well above the render density so the blit is always a
// minification — text is the highest-contrast art in the game, so it is where a
// magnified raster shows first, as stair-steps on every curve.
//
// 8 was a constant, which held until a display rendered above 8x: a 6K Pro
// Display XDR renders at 12.53x and would magnify every glyph by 1.57x. So it
// follows the density, with 8 as a floor (nothing gets softer than it was) and
// 16 as a ceiling.
const GLYPH_SS_MIN = 8, GLYPH_SS_MAX = 16;
let glyphCacheSS = 0;
function glyphSS() {
  return Math.max(GLYPH_SS_MIN, Math.min(GLYPH_SS_MAX, Math.ceil(screen.px)));
}
function glyphSprite(ch, color, scale, style) {
  const GLYPH_SS = glyphSS();
  if (GLYPH_SS !== glyphCacheSS) { glyphCache.clear(); glyphCacheSS = GLYPH_SS; }
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

// Other modules that bake these faces into rasters of their own — the code
// rain's glyph atlas — subscribe here rather than re-deriving the loading dance
// below, which is subtle enough to be worth having in exactly one place.
const fontListeners = new Set();
export function onGameFontsChanged(fn) {
  fontListeners.add(fn);
  return () => fontListeners.delete(fn);
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
  const drop = () => {
    glyphCache.clear();
    advCache.clear();
    for (const fn of fontListeners) fn();
  };
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
  // The boot gate normally settles every face before game.js starts. Its
  // offline safeguard is deliberately bounded, though, so a very slow font
  // response can still finish after the first fallback glyphs were cached.
  // FontFaceSet's completion event repairs that late path as well.
  if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', drop);
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

// What sits under a shadowed panel. A flat offset silhouette rather than a
// blurred drop shadow: `shadowBlur` is specified in DEVICE pixels and ignores
// the transform, so the blurred version measured only 12% darker than the scene
// at its darkest and was gone within 1.25 logical px — a hairline that cost
// about 85% of the panel's draw time, most of it on the iPad, where the blur is
// dearest and its falloff narrowest. Much weaker than the 0.3 the blur carried:
// an unblurred edge reads harder at the same alpha, and the blur's own measured
// weight was only ever 12% against the scene — a hairline, not a drop shadow.
export const UI_PANEL_LIFT = 'rgba(0,0,0,0.10)';

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
    // Drawn before the plate rather than as a shadow on it, so the lift is one
    // ordinary fill. See UI_PANEL_LIFT for why the blur went.
    platePath(ctx, x, y + 1, w, h, r);
    ctx.fillStyle = UI_PANEL_LIFT;
    ctx.fill();
  }
  platePath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
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
export const MENU_ROW_HILITE = 'rgba(201,160,255,0.15)';
export function drawMenuRow(ctx, x, y, w, h, r = 3, fill = MENU_ROW_HILITE) {
  ctx.fillStyle = fill;
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

// A control legend: a KEY, then what it does, repeated. Keys carry the green
// the HUD's cells already use for "this is live" and the actions stay quiet, so
// the row scans as a lookup table instead of reading as a sentence — you come
// to it hunting one key, never to read it through.
//
// One painter for both places it appears (the opening seconds of a run, and the
// pause screen you check later), because the whole point of the legend is that
// those two ARE the same legend: same word, same colour, same order. Two call
// sites drawing "the same" row is how that quietly stops being true.
export const KEY_INK = '#74c947';
export const ACTION_INK = 'rgba(255,255,255,0.6)';
const LEGEND_KEY_GAP = 3;    // key -> the action it performs
const LEGEND_PAIR_GAP = 10;  // pair -> pair; wide enough that the halves group

const legendPairWidth = ([key, action], scale) =>
  textWidth(key, scale, 'bold') + LEGEND_KEY_GAP * scale + textWidth(action, scale);

export function keyLegendWidth(pairs, scale = 1) {
  return pairs.reduce((n, p) => n + legendPairWidth(p, scale), 0)
    + LEGEND_PAIR_GAP * scale * (pairs.length - 1);
}

// pairs: [key, action, actionInk?][] — the per-pair ink is for the one line
// that reports state (your power, and whether it is charged) rather than a
// control, which wants its own colour without leaving the legend's shape.
export function drawKeyLegend(ctx, pairs, x, y, { scale = 1, keyInk = KEY_INK, actionInk = ACTION_INK } = {}) {
  let tx = x;
  for (const [key, action, ink] of pairs) {
    drawText(ctx, key, tx, y, keyInk, scale, 'bold');
    tx += textWidth(key, scale, 'bold') + LEGEND_KEY_GAP * scale;
    drawText(ctx, action, tx, y, ink || actionInk, scale);
    tx += textWidth(action, scale) + LEGEND_PAIR_GAP * scale;
  }
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
  if (opts.frac != null) {
    ctx.clip();
    const fh = Math.round(r * 2 * Math.max(0, Math.min(1, opts.frac)));
    ctx.fillStyle = opts.levelFill || 'rgba(72,224,200,0.28)';
    ctx.fillRect(cx - r, cy + r - fh, r * 2, fh);
    // The meniscus line marks the waterline while it's rising; at a full disc
    // it would sit pinned to the rim, reading as a stray ring rather than a
    // "still filling" cue — so it only draws while there's headroom above it.
    if (opts.frac < 1) {
      ctx.fillStyle = opts.waterline || 'rgba(184,248,232,0.8)';
      ctx.fillRect(cx - r, cy + r - fh, r * 2, 1.5);
    }
  }
  ctx.restore();
  // A defining ring — the in-canvas buttons deliberately go without one (see
  // above: over scrolling gameplay it read as a third thing to track), but
  // that concern doesn't exist against the chrome canvas's static margin, and
  // there a ring is what keeps the disc from disappearing into a background
  // that's nearly its own fill color.
  if (opts.ring) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = opts.ring;
    ctx.lineWidth = opts.ringWidth || 1.5;
    ctx.stroke();
  }
  if (b.icon === 'up' || b.icon === 'down') {
    // The ribbon's arrow at disc scale: the same 2.5:2 proportion and the same
    // stroke-then-fill rim drawActionPill uses, so the control out in the
    // margin and the in-canvas pill read as one object seen in two places
    // rather than two families that happen to both point somewhere.
    const dir = b.icon === 'up' ? 1 : -1;
    const aw = r * 0.5, ah = r * 0.4;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.strokeStyle = opts.outline || 'rgba(18,24,46,0.9)';
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(cx, cy - dir * ah);
    ctx.lineTo(cx - aw, cy + dir * ah);
    ctx.lineTo(cx + aw, cy + dir * ah);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  } else if (b.icon === 'pause') {
    // The one control with a symbol every player already knows. A glyph also
    // survives a translation and a smaller button; the word PAUSE does neither.
    const bw = Math.max(2, r * 0.19), bh = r * 0.82, gap = r * 0.22;
    ctx.fillStyle = ink;
    ctx.fillRect(cx - gap - bw, cy - bh / 2, bw, bh);
    ctx.fillRect(cx + gap, cy - bh / 2, bw, bh);
  } else if (b.label) {
    // Same ink-centred midline every HUD panel uses, so a label in a disc sits
    // at the same height as a label in a plate. labelScale/labelStyle default
    // to the in-canvas look; the chrome canvas passes a bigger, bolder pair —
    // a disc with room to spare should carry text you can read at a glance,
    // not the same small ui-weight label that fits a 44px corner button.
    const s = opts.labelScale || BUTTON_LABEL_S;
    drawTextCentered(ctx, b.label, cx, textYForMid(cy, s), ink, s, opts.labelStyle || 'ui');
  }
}

// The play pair as ONE control: an up triangle over a down triangle in a single
// pill. Over-or-under is one decision on one axis, so it gets one target. Two
// separated discs would leave a gap between the halves, and a gap in a control
// this size is a miss — which on the down half means asking to go under and
// going over instead, into the thing you were ducking.
//
// SHAPE IS THE INPUT, and here the POSITION agrees with it: up is the top half,
// down is the bottom half. That is why the pill is stacked and never
// side-by-side. A left/right pair asks the player to translate a vertical
// choice into a horizontal one, which is a translation to learn for no gain.
//
// The glyphs are the RIBBON'S glyphs. The beat strip already teaches an up
// arrow for jump and a down arrow for duck, so the button that answers it wears
// the same shape in the same ink, built the same way — round joins, the dark
// edge stroked BEFORE the fill so it reads as a rim the colour sits inside
// rather than a line eating half the shape. The inks arrive as opts and are
// never literals here: they live in game/beatground.js (which the engine must
// not import), and a second copy of those hexes is the precise drift that
// file's own comment warns about.
//
// `box` is the union of the LIVE halves, so a pill with one half taught (the
// tutorial before it has shown the slide) is one half tall and centres its
// single glyph, rather than a double-height plate with a hole in it.
export function drawActionPill(ctx, box, opts = {}) {
  const { x, y, w, h } = box;
  const up = opts.up !== false, down = opts.down !== false;
  ctx.save();
  platePath(ctx, x, y, w, h, Math.min(w / 2, 10));
  ctx.fillStyle = opts.fill || 'rgba(11,11,20,0.1)';
  ctx.fill();
  ctx.restore();
  // The seam only draws when both halves are live: it is the line that says
  // "two presses here", and under a single-half pill it would be an edge
  // between something and nothing.
  //
  // Heavier than the plate it sits on, because at one pixel over scrolling
  // scenery anything lighter is not a quiet line, it is an absent one — the
  // first pass at 0.22 vanished completely against grass.
  if (up && down) {
    ctx.fillStyle = opts.seam || 'rgba(11,11,20,0.4)';
    ctx.fillRect(x + 5, Math.round(y + h / 2) - 0.5, w - 10, 1);
  }
  // The ribbon's own 2.5:2 arrow, at this button's scale.
  const aw = opts.arrowW || w * 0.25, ah = opts.arrowH || w * 0.2;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = opts.edge || Math.max(1, w * 0.05);
  ctx.strokeStyle = opts.outline || 'rgba(18,24,46,0.9)';
  const cx = x + w / 2;
  // dir +1 puts the apex up, -1 puts it down. One path for both so the pair are
  // exact reflections about their own midlines and the strip cannot say DOWN
  // twice, the same mistake hud.js's ribbon comment records.
  const tri = (my, dir, ink) => {
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(cx, my - dir * ah);
    ctx.lineTo(cx - aw, my + dir * ah);
    ctx.lineTo(cx + aw, my + dir * ah);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  };
  if (up) tri(down ? y + h / 4 : y + h / 2, 1, opts.upInk || '#3fbf5a');
  if (down) tri(up ? y + h * 0.75 : y + h / 2, -1, opts.downInk || '#72d8f0');
  ctx.restore();
}

// B33P's projectile is shared by the in-game and title-screen renderers.
// Keep its tiny pixel silhouette in one place so the title tap attack reads
// like the weapon players see during a run.
// The shot BOTH shooters fire. B-33P's lemon is the default and is unchanged —
// the title screen fires one and that pose is fixed — while Kiko's warning shot
// comes through the same painter bigger and in her own colour, so the two are
// told apart in flight rather than only by who threw them.
//
// Colour is passed IN rather than kept in a table here: hers is the `ki` token
// on her palette (sprites/heroes.js), and a second copy of that hex living in
// the renderer is exactly the kind of drift this codebase keeps out.
//
// This is deliberately the only place the shot's LOOK is decided, so restyling
// it is one function and not a hunt.
export function drawPellet(ctx, cx, cy, opts = {}) {
  const x = Math.round(cx), y = Math.round(cy);
  const r = Math.max(1, Math.round(3 * (opts.size || 1)));
  const fill = opts.fill || '#f6d33c';
  if (!opts.orb) {
    // B-33P's lemon, untouched: a small hard disc with a highlight.
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = opts.hi || '#fff0a0';
    ctx.fillRect(x - 1, y - r + 1, 2, 1);
    return;
  }
  // Kiko's warning shot, built from the reference. Four things carry it, and
  // they are the four that survive being nine pixels wide:
  //   - a SHELL rather than a disc. The rim is the brightest part and the middle
  //     is thinner, which is what makes it read as a sphere with something
  //     moving inside instead of a coloured dot.
  //   - a tail of streaks converging back toward the palm it left.
  //   - a white-hot core.
  //   - one WARM fleck in that core. The reference keeps gold in the middle of
  //     all that blue, and it is the single detail that stops the orb reading as
  //     a generic energy ball — so it is her own piping gold, off her palette.
  const core = opts.hi || '#eafcff';
  ctx.save();
  // Tail first, so the head sits on top of it. It streams BACK: the shot always
  // travels +x, and a tail on the leading edge would read as a comet arriving.
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = fill;
  ctx.lineWidth = 1;
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(x - r + 1, y + k * r * 0.45);
    ctx.lineTo(x - r - r * 2.1, y + k * r * 0.85);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);   // outer glow
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);       // thin body
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r - 0.5), 0, Math.PI * 2);  // the bright rim
  ctx.stroke();
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, r - 2), 0, Math.PI * 2);    // white-hot core
  ctx.fill();
  ctx.fillStyle = opts.spark || '#f2c14e';
  ctx.fillRect(x, y - 1, 1, 2);
  ctx.restore();
}

// Kept so the title screen's B-33P shot keeps reading as itself at the call
// site. Same painter, his defaults.
export function drawB33pPellet(ctx, cx, cy) { drawPellet(ctx, cx, cy); }

// Rusty's bamboo shoot — the speedster's ranged answer, and a pun that lands on
// the code: his ability type IS 'shoot'.
//
// A projectile at this scale is about six pixels, so it gets exactly three
// ideas and no more, chosen because they survive that:
//   - a CAPSULE, not a disc. Every other shot on the roster is round (B-33P's
//     lemon, Kiko's orb), so the one long shape reads as his across the lane
//     even before the colour does.
//   - a NODE band across the middle. One dark line is the whole difference
//     between "green capsule" and "bamboo", and it is the last thing to survive
//     as the shot gets smaller — so it is drawn at a minimum width rather than
//     scaled away.
//   - TUMBLE. Thrown bamboo spins end over end; a shot that holds one angle
//     reads as fired from a barrel, which is B-33P's story rather than his.
export function drawBambooShoot(ctx, cx, cy, opts = {}) {
  const s = opts.size || 1;
  const len = 4.6 * s, wid = 1.9 * s;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(opts.spin || 0);
  // Body: a capsule, drawn as a wide round-capped stroke so the ends are
  // hemispheres without a path for them.
  ctx.lineCap = 'round';
  ctx.strokeStyle = opts.fill || '#9cc44e';
  ctx.lineWidth = wid * 2;
  ctx.beginPath();
  ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
  ctx.stroke();
  // The lit edge along the top, inset so it stays inside the body.
  ctx.strokeStyle = opts.hi || '#d6ec9a';
  ctx.lineWidth = Math.max(0.7, wid * 0.55);
  ctx.beginPath();
  ctx.moveTo(-len * 0.6, -wid * 0.55); ctx.lineTo(len * 0.62, -wid * 0.55);
  ctx.stroke();
  // The node. Floored at 1px: scaled with the shot it vanishes first, and it is
  // the only mark that says bamboo.
  ctx.strokeStyle = opts.node || '#5d8028';
  ctx.lineWidth = Math.max(1, 0.9 * s);
  ctx.beginPath();
  ctx.moveTo(0, -wid); ctx.lineTo(0, wid);
  ctx.stroke();
  ctx.restore();
}

// Rusty's PINE CONE. Same three-ideas budget as the bamboo above, spent
// differently because the silhouette is doing more of the work here:
//   - an OVOID that tapers to a point, fat end trailing. Against a lane of
//     round shots and one capsule, a teardrop is its own read.
//   - SCALE NOTCHES. Two dark chevrons, floored at a pixel like the bamboo's
//     node — they are the only mark that says cone rather than nut, and the
//     first to vanish if they are allowed to scale away.
//   - TUMBLE, end over end, which a cone does and a disc does not.
export function drawPineCone(ctx, cx, cy, opts = {}) {
  const s = opts.size || 1;
  const len = 4.4 * s, wid = 2.4 * s;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(opts.spin || 0);
  const body = opts.fill || '#7a5128';
  const lit = opts.hi || '#caa269';
  // A SOLID MASS FIRST, then scallops on its edge. Two earlier cuts failed the
  // opposite ways round: a smooth ovoid with veins painted on read as a leaf,
  // and free-standing scale crescents read as a comb, because the lane showed
  // between them. A cone is a solid lump with a bumpy edge, so it is built in
  // that order — body, then bumps, then two light rows on top.
  const bodyPath = (c) => {
    c.moveTo(len, 0);                                            // tip
    c.quadraticCurveTo(0, -wid, -len * 0.72, -wid * 0.7);
    c.quadraticCurveTo(-len * 1.04, 0, -len * 0.72, wid * 0.7);  // round base
    c.quadraticCurveTo(0, wid, len, 0);
    c.closePath();
  };
  ctx.beginPath(); bodyPath(ctx);
  ctx.fillStyle = body; ctx.fill();
  // Scale bumps riding both flanks, in the SAME fill so they read as the
  // silhouette going lumpy rather than as spots stuck on it. Four per side,
  // shrinking toward the tip with the taper.
  const ROWS = 4;
  for (let r = 0; r < ROWS; r++) {
    const f = r / (ROWS - 1);
    const x = -len * 0.62 + f * len * 1.24;
    const h = wid * (1 - f * f * 0.72);
    const rad = wid * 0.36 * (1 - f * 0.45);
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x, sy * h * 0.72, rad, 0, Math.PI * 2);
      ctx.fillStyle = body; ctx.fill();
    }
  }
  // Two light rows, chevroned back toward the base — the mark that says the
  // lump is PLATED. Clipped to the body so they cannot stripe the background,
  // which is what the comb cut did.
  ctx.save();
  ctx.beginPath(); bodyPath(ctx); ctx.clip();
  ctx.strokeStyle = lit;
  ctx.lineWidth = Math.max(0.9, wid * 0.3);
  ctx.lineCap = 'round';
  for (const f of [0.16, -0.34]) {
    const x = len * f, h = wid * (1 - Math.abs(f) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x - wid * 0.34, -h);
    ctx.lineTo(x + wid * 0.3, 0);
    ctx.lineTo(x - wid * 0.34, h);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// Rusty's SEED POD — a samara, the winged seed that helicopters down off a
// maple. The one projectile on the roster whose real-world behaviour IS
// spinning, so the tumble stops being a stylisation and becomes the point.
//   - a dark SEED nub at one end, which is the weight and the thing that hits.
//   - one long WING off it, tapered and slightly swept, so the pair is plainly
//     lopsided — that asymmetry is what reads as rotation frame to frame,
//     where a symmetric shape spinning looks like a shape sitting still.
//   - the wing takes the LIT edge; the seed stays dark, so the two never merge
//     into one blob at six pixels.
export function drawSeedPod(ctx, cx, cy, opts = {}) {
  const s = opts.size || 1;
  const wing = 5.6 * s, wid = 1.9 * s, seed = 1.5 * s;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(opts.spin || 0);
  // Wing: rooted at the seed, swept and tapering to a rounded tip.
  ctx.beginPath();
  ctx.moveTo(-seed * 0.4, -wid * 0.5);
  ctx.quadraticCurveTo(wing * 0.55, -wid * 1.15, wing, -wid * 0.1);
  ctx.quadraticCurveTo(wing * 0.5, wid * 0.5, -seed * 0.4, wid * 0.55);
  ctx.closePath();
  // Same contrast rule as the cone: the wing is pushed pale and warm so it
  // separates from both the rust hero and the blue lane, and the seed stays
  // dark so the pair never merges into one blob at six pixels.
  ctx.fillStyle = opts.fill || '#e2cf86';
  ctx.fill();
  ctx.strokeStyle = opts.hi || '#f6ecc0';
  ctx.lineWidth = Math.max(0.7, wid * 0.4);
  ctx.beginPath();
  ctx.moveTo(seed * 0.2, -wid * 0.5);
  ctx.quadraticCurveTo(wing * 0.55, -wid * 0.72, wing * 0.86, -wid * 0.16);
  ctx.stroke();
  // The seed, drawn last so it sits on top of the wing root.
  ctx.beginPath();
  ctx.ellipse(-seed * 0.5, 0, seed, seed * 0.82, 0, 0, Math.PI * 2);
  ctx.fillStyle = opts.seed || '#4a3416';
  ctx.fill();
  ctx.restore();
}

// Rusty's ACORN. The cone's lesson, applied: at six pixels a projectile is
// identified by SILHOUETTE and ONE colour break, never by surface texture.
// Three cone attempts died proving that, so this has no texture at all — a
// pale nut, a dark cap, and the hard line between them.
//   - the NUT: a plain ovoid in the palest value on the roster, which is what
//     separates it from a rust hero on a dark lane.
//   - the CAP: a dark dome over one end, the whole identity in one shape. It
//     is also what makes rotation legible, being lopsided.
//   - a STEM nub, one pixel, dropped below the lod threshold rather than
//     scaled away.
export function drawAcorn(ctx, cx, cy, opts = {}) {
  const s = opts.size || 1;
  const len = 3.4 * s, wid = 2.5 * s;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(opts.spin || 0);
  // Nut: rounded at the cap end, tapering to a blunt point.
  ctx.beginPath();
  ctx.moveTo(len * 1.15, 0);
  ctx.quadraticCurveTo(len * 0.2, -wid, -len * 0.3, -wid * 0.86);
  ctx.lineTo(-len * 0.3, wid * 0.86);
  ctx.quadraticCurveTo(len * 0.2, wid, len * 1.15, 0);
  ctx.closePath();
  ctx.fillStyle = opts.fill || '#e0b073';
  ctx.fill();
  // Cap: a dome over the blunt end, plus the rim line that reads as its edge.
  ctx.beginPath();
  ctx.moveTo(-len * 0.24, -wid * 0.94);
  ctx.quadraticCurveTo(-len * 1.15, 0, -len * 0.24, wid * 0.94);
  ctx.closePath();
  ctx.fillStyle = opts.cap || '#5b3a1c';
  ctx.fill();
  if (s > 1.2) {
    ctx.strokeStyle = opts.cap || '#5b3a1c';
    ctx.lineWidth = Math.max(1, 0.7 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-len * 0.95, 0);
    ctx.lineTo(-len * 1.5, 0);
    ctx.stroke();
  }
  ctx.restore();
}
