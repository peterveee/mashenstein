// THE OUTLINE WEIGHT — one dial for the ink on every obstacle drawn in the bold
// 15 Oct 2026 hand (Peter, 15 Oct: "i would like a single variable that can be
// used to fine tune the outline.. i think it is a TOUCH thick right now … potentially
// we thicken it for phone maybe").
//
// It multiplies EVERY line those painters draw — outline, interior and fine lines
// alike, and Speed Zone's printed ink shadow — so the proportions between them hold.
// 1 is the weight they were drawn at (a 0.55 world-unit outline, about 1.1 screen px
// at the desktop zoom). Fills and shapes do not change, only the strokes.
//
// Covered: the cabinet picks (sprites/cabinetProps.js), Corporate Kombat
// (officeProps.js), Gravity Grid (gravityProps.js), the crate and barrel
// (crateBarrel.js), the ten redraws (redrawProps.js), and since 16 Oct the older goose,
// rattlesnake, snowmen, bear trap, power block, razor hurdle, fire barrel and cactus
// (inkOutlined below; props.js INK_BASE). The rest of props.js keeps its own fine ink.
//
// Read once at load, per device: props are rasterised into a cache, so a weight that
// changed mid-run would leave half the lane at the old one. To try a value without
// editing this file, add ?outline=0.8 to the game or gallery URL.
export const OUTLINE_WEIGHT = Object.freeze({
  desktop: 0.7,
  phone: 0.9,
});

function deviceIsPhone() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const shortSide = window.screen ? Math.min(window.screen.width, window.screen.height) : 1000;
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && Number(navigator.maxTouchPoints) > 1);
  return !ipad && (/iPhone|iPod/.test(ua) || (/Android/i.test(ua) && shortSide < 600));
}

function readWeight() {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('outline') : null;
    const n = q == null ? NaN : Number(q);
    if (Number.isFinite(n) && n > 0) return n;
  } catch { /* no location: Node, a worker */ }
  return deviceIsPhone() ? OUTLINE_WEIGHT.phone : OUTLINE_WEIGHT.desktop;
}

export const OUTLINE_SCALE = readWeight();

// The painter gets a context whose lineWidth is scaled on the way in and unscaled on
// the way out, so a painter that reads its own width back still does its sums in the
// weights it was written in.
export function scaledContext(ctx, k) {
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'lineWidth') return target.lineWidth / k;
      const v = target[prop];
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      target[prop] = prop === 'lineWidth' ? value * k : value;
      return true;
    },
  });
}

// Wrap a painter (ctx, ...rest) so its strokes take the dial.
export function outlined(paint) {
  if (OUTLINE_SCALE === 1) return paint;
  return (ctx, ...rest) => paint(scaledContext(ctx, OUTLINE_SCALE), ...rest);
}

// THE OLDER PAINTERS on the same dial (Peter, 16 Oct 2026: "fix the goose and rattlesnake,
// the snowmen, bear trap, power block, razor hurdle, fire barrel and cactus"). They were
// not drawn in the bold hand, and they use strokes as GEOMETRY as well as ink — the
// snake's coil is a fat tan stroke, the goose's legs orange ones — so scaling every
// lineWidth would thin the bodies too. This scales only DARK strokes, the ink, at the
// moment they are stroked; `base` first brings each painter's own outline to the bold
// hand's 0.55, so the dial means the same weight on them as on everything else.
const INK_LUMA = 0.32;
function isInk(style) {
  if (typeof style !== 'string') return false;
  let r, g, b;
  const hex = style.match(/^#([0-9a-f]{3}|[0-9a-f]{6})/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  } else {
    const m = style.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    [r, g, b] = m[1].split(',').map(Number);
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < INK_LUMA;
}
function inkScaledContext(ctx, k) {
  const stroke = (...args) => {
    if (!isInk(ctx.strokeStyle)) return ctx.stroke(...args);
    const w = ctx.lineWidth;
    ctx.lineWidth = w * k;
    ctx.stroke(...args);
    ctx.lineWidth = w;
    return undefined;
  };
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'stroke') return stroke;
      const v = target[prop];
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}
export function inkOutlined(paint, base = 1) {
  const k = base * OUTLINE_SCALE;
  if (k === 1) return paint;
  return (ctx, ...rest) => paint(inkScaledContext(ctx, k), ...rest);
}
