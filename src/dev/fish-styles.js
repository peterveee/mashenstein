// LORENZO'S FISH, IN OTHER DRAWING STYLES — round two of the fish bake-off. 5 Oct 2026.
//
// Peter: "I like all the fish, id like to see them in a few different drawing styles". Each
// style draws any candidate (fish-candidates.js) its own way without touching its painter:
// the painter draws into a stand-in for the canvas that turns its fills and strokes into the
// style's (a Proxy over the real context), or — the pixel style — into a little canvas that
// is then blown up. The looks are the game's own: the cast's CEL (as the candidates are drawn),
// the Plumber world's CUT PAPER, the club's NEON, B-33P's 8-BIT, the Frost sky's CRAYON and the
// Speed Zone's MID-CENTURY print.
//
// Each style is paint(ctx, candidate, L, opts) — the candidate's own contract (facing right,
// on the origin, `L` from nose to tail), the style around it.

import { drawPaperFish } from '../game/banger/club-fish.js';

const TAU = Math.PI * 2;

/** A fill or stroke style as [r, g, b, a], or null for a gradient or a pattern. */
function rgbOf(c) {
  if (typeof c !== 'string') return null;
  if (c[0] === '#') {
    const h = c.length === 4 ? c.slice(1).split('').map((d) => d + d).join('') : c.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}
const css = ([r, g, b, a = 1]) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const mix = (c, d, k) => [c[0] + (d[0] - c[0]) * k, c[1] + (d[1] - c[1]) * k, c[2] + (d[2] - c[2]) * k, c[3] ?? 1];
/** The scale from the context's units to device pixels. */
const deviceScale = (t) => { try { const m = t.getTransform(); return Math.hypot(m.a, m.b) || 1; } catch { return 1; } };

/**
 * The canvas, with its fills and strokes turned into a style's. `fill(t, path)` and
 * `stroke(t, { afterFill })` get the real context with the painter's path still on it;
 * `afterFill` says this path was just filled (most outlines are), so a style that outlines its
 * own fills can leave the painter's outline off. fillRect goes to `fill` as a rectangle.
 */
function styled(ctx, { fill, stroke }) {
  let filled = false;
  return new Proxy(ctx, {
    get(t, k) {
      if (k === 'beginPath') return () => { filled = false; t.beginPath(); };
      if (k === 'fill' && fill) return (...a) => { fill(t, ...a); filled = true; };
      if (k === 'stroke' && stroke) return (...a) => stroke(t, { afterFill: filled }, ...a);
      // a rectangle filled with a gradient is a light — the angler's lamp — not a shape: as it is
      if (k === 'fillRect' && fill) return (x, y, w, h) => {
        if (typeof t.fillStyle !== 'string') { t.fillRect(x, y, w, h); return; }
        t.beginPath(); t.rect(x, y, w, h); fill(t); filled = true;
      };
      const v = t[k];
      return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

// ---------------------------------------------------------------- textures, made once
const textures = {};
function texture(id, size, paint) {
  if (typeof document === 'undefined') return null;
  if (!textures[id]) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    paint(g, size);
    textures[id] = c;
  }
  return textures[id];
}
/** Crayon: waxy diagonal strokes, light and dark, for an overlay. */
const waxy = () => texture('waxy', 48, (g, n) => {
  let seed = 11;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, n, n);
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = rnd() * n * 2 - n / 2, y = rnd() * n, len = 6 + rnd() * 10, v = rnd() < 0.5 ? 70 + rnd() * 40 : 190 + rnd() * 50;
    g.strokeStyle = `rgba(${v},${v},${v},0.8)`; g.lineWidth = 0.8 + rnd() * 1.2;
    for (const dx of [-n, 0, n]) { g.beginPath(); g.moveTo(x + dx, y); g.lineTo(x + dx + len * 0.7, y - len * 0.7); g.stroke(); }
  }
  // the paper's tooth showing through
  for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(rnd() * n, rnd() * n, 1, 1); }
});

// ---------------------------------------------------------------- the mid-century palette
const MCM = [[242, 230, 201], [232, 176, 74], [217, 100, 58], [201, 79, 79], [58, 143, 138], [47, 95, 122],
  [143, 176, 122], [42, 37, 34], [247, 243, 234], [231, 154, 176], [120, 96, 160]];
const nearest = (c, list) => {
  let best = list[0], bd = Infinity;
  for (const p of list) { const d = 2 * (c[0] - p[0]) ** 2 + 4 * (c[1] - p[1]) ** 2 + 3 * (c[2] - p[2]) ** 2; if (d < bd) { bd = d; best = p; } }
  return best;
};

// ---------------------------------------------------------------- the pixel look's palette
// a sixteen-colour console's, the sort the 8-bit set's heroes would be drawn in
const PIXEL_INKS = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa'].map((h) => rgbOf(h));
let pixelSheet = null;

export const FISH_STYLES = Object.freeze([
  {
    id: 'cel', name: 'CEL',
    description: 'As the candidates are drawn: the cast’s look, flat colour inside the cast’s contour ink.',
    paint(ctx, c, L, o) { c.paint(ctx, L, o); },
  },
  {
    id: 'paper', name: 'CUT PAPER',
    description: 'The Plumber world’s paper: no ink, every piece a cut-out laid on the last, with its shadow and the paper’s grain.',
    paint(ctx, c, L, o) { drawPaperFish(ctx, c, L, o); },   // the club's own (club-fish.js)
  },
  {
    id: 'neon', name: 'NEON',
    description: 'The club’s signs: each fish a dark shape traced in glowing tube, in its own colours.',
    paint(ctx, c, L, o) {
      const p = styled(ctx, {
        fill(t) {
          const col = rgbOf(t.fillStyle) || [255, 79, 163, 1];
          const k = deviceScale(t);
          if (luma(col) < 45) { t.save(); t.fillStyle = '#05040a'; t.fill(); t.restore(); return; }
          const light = luma(col) > 225;
          const tube = light ? [255, 250, 240, 1] : mix(col, [255, 255, 255], 0.25);
          t.save();
          t.fillStyle = css([col[0] * 0.14, col[1] * 0.14, col[2] * 0.14, 0.92]);
          t.fill();
          t.globalCompositeOperation = 'lighter';
          t.strokeStyle = css(tube);
          t.lineWidth = L * (light ? 0.016 : 0.022);
          t.shadowColor = css(mix(col, [255, 255, 255], 0.1));
          t.shadowBlur = k * L * 0.08;
          t.stroke();
          t.shadowBlur = 0; t.lineWidth *= 0.45; t.strokeStyle = 'rgba(255,255,255,0.7)';
          t.stroke();
          t.restore();
        },
        stroke(t, { afterFill }) {
          if (afterFill) return;
          const col = rgbOf(t.strokeStyle);
          const k = deviceScale(t);
          const tube = !col || luma(col) < 60 ? [235, 225, 255, 1] : mix(col, [255, 255, 255], 0.25);
          t.save();
          t.globalCompositeOperation = 'lighter';
          t.strokeStyle = css(tube);
          t.lineWidth = Math.min(t.lineWidth, L * 0.022);
          t.shadowColor = css(tube); t.shadowBlur = k * L * 0.06;
          t.stroke();
          t.restore();
        },
      });
      c.paint(p, L, o);
    },
  },
  {
    id: 'pixel', name: '8-BIT',
    description: 'B-33P’s 8-bit: each fish a sprite about twenty pixels long, in a sixteen-colour console palette with a one-pixel outline, blown up square.',
    paint(ctx, c, L, o) {
      if (typeof document === 'undefined') { c.paint(ctx, L, o); return; }
      const px = L / 20;                     // one sprite pixel, in the context's units
      const W = Math.ceil((L * 1.5) / px), H = Math.ceil((L * 1.3) / px);
      if (!pixelSheet) pixelSheet = document.createElement('canvas');
      if (pixelSheet.width !== W || pixelSheet.height !== H) { pixelSheet.width = W; pixelSheet.height = H; }
      const g = pixelSheet.getContext('2d', { willReadFrequently: true });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.setTransform(1 / px, 0, 0, 1 / px, W / 2, H / 2);
      c.paint(g, L, o);
      const img = g.getImageData(0, 0, W, H), d = img.data;
      const solid = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        if (d[i * 4 + 3] < 110) { d[i * 4 + 3] = 0; continue; }
        const ink = nearest([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], PIXEL_INKS);
        d[i * 4] = ink[0]; d[i * 4 + 1] = ink[1]; d[i * 4 + 2] = ink[2]; d[i * 4 + 3] = 255;
        solid[i] = 1;
      }
      // the sprite's outline: every empty pixel beside a solid one
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (solid[i]) continue;
        if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
          d[i * 4] = 0; d[i * 4 + 1] = 0; d[i * 4 + 2] = 0; d[i * 4 + 3] = 255;
        }
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.putImageData(img, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pixelSheet, -W * px / 2, -H * px / 2, W * px, H * px);
      ctx.restore();
    },
  },
  {
    id: 'crayon', name: 'CRAYON',
    description: 'The Frost sky’s crayon: waxy strokes with the paper showing through, and a soft, wobbly line in place of the ink.',
    paint(ctx, c, L, o) {
      const w = waxy();
      const pattern = w && ctx.createPattern?.(w, 'repeat');
      const p = styled(ctx, {
        fill(t) {
          const col = rgbOf(t.fillStyle);
          t.save();
          if (col) t.fillStyle = css(mix(col, [245, 240, 230], 0.08));
          t.globalAlpha *= 0.92;
          t.fill();
          if (pattern) {
            t.clip();
            t.globalCompositeOperation = 'overlay'; t.globalAlpha = 0.85; t.fillStyle = pattern;
            const m = t.getTransform?.();
            t.save(); t.scale(L / 70, L / 70);
            t.fillRect(-140, -140, 280, 280);
            t.restore();
            void m;
          }
          t.restore();
        },
        stroke(t) {
          const col = rgbOf(t.strokeStyle);
          t.save();
          t.strokeStyle = !col || luma(col) < 60 ? 'rgba(45,36,64,0.75)' : css([...col.slice(0, 3), 0.8]);
          t.lineWidth *= 0.65;
          t.stroke();
          t.translate(L * 0.006, -L * 0.005);
          t.globalAlpha *= 0.55;
          t.stroke();
          t.restore();
        },
      });
      c.paint(p, L, o);
    },
  },
  {
    id: 'mcm', name: 'MID-CENTURY',
    description: 'The Speed Zone’s mid-century print: flat shapes in a short, warm palette, no ink, and a thin line printed a touch off register.',
    paint(ctx, c, L, o) {
      const p = styled(ctx, {
        fill(t) {
          const col = rgbOf(t.fillStyle);
          t.save();
          t.fillStyle = col ? css(nearest(col, MCM)) : css(MCM[1]);
          t.fill();
          // the off-register line
          t.translate(L * 0.022, L * 0.016);
          t.strokeStyle = 'rgba(42,37,34,0.85)';
          t.lineWidth = L * 0.012;
          t.stroke();
          t.restore();
        },
        stroke(t, { afterFill }) {
          if (afterFill) return;
          const col = rgbOf(t.strokeStyle);
          t.save();
          t.strokeStyle = !col || luma(col) < 60 ? '#2a2522' : css(nearest(col, MCM));
          t.lineWidth *= 0.7;
          t.stroke();
          t.restore();
        },
      });
      c.paint(p, L, o);
    },
  },
]);
