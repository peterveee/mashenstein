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

export function textWidth(str, scale = 1) { return str.length * 6 * scale - scale; }

// Smooth vector lettering on the old font's fixed six-unit grid, so every
// existing menu layout still lines up. Each glyph is centred in its cell
// (the pixel font was fixed-width), and it rasterizes at device resolution.
const FONT_STACK = '"Trebuchet MS", "Avenir Next", "Segoe UI", system-ui, sans-serif';

// Glyphs are rasterized ONCE into supersampled canvases and then blitted —
// drawImage is a GPU texture copy, while per-frame fillText re-rasterizes
// vector outlines on the CPU. Menus are wall-to-wall text, so this matters.
const glyphCache = new Map();
const GLYPH_SS = 8;
function glyphSprite(ch, color, scale) {
  const key = ch + '|' + color + '|' + scale;
  let g = glyphCache.get(key);
  if (!g) {
    g = document.createElement('canvas');
    g.width = Math.ceil(8 * scale * GLYPH_SS);
    g.height = Math.ceil(12 * scale * GLYPH_SS);
    const x = g.getContext('2d');
    x.scale(GLYPH_SS, GLYPH_SS);
    x.fillStyle = color;
    x.font = `600 ${8.2 * scale}px ${FONT_STACK}`;
    x.textBaseline = 'top';
    x.textAlign = 'center';
    x.fillText(ch, 4 * scale, 1 * scale);
    glyphCache.set(key, g);
  }
  return g;
}

export function drawText(ctx, str, x, y, color = '#fff', scale = 1) {
  const s = String(str);
  let cx = x;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ' ') {
      const g = glyphSprite(ch, color, scale);
      ctx.drawImage(g, cx - 1.5 * scale, y - 1 * scale, 8 * scale, 12 * scale);
    }
    cx += 6 * scale;
  }
  ctx.imageSmoothingEnabled = prev;
  return cx;
}

export function drawTextCentered(ctx, str, cx, y, color = '#fff', scale = 1) {
  drawText(ctx, str, cx - textWidth(String(str), scale) / 2, y, color, scale);
}
