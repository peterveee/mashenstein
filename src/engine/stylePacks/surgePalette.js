// THE SURGE's palette glitches: the borrowed looks switching colour scheme on the beat
// so they read as not-quite the levels you already played (13 Oct 2026). From the lab
// sheet `surge-treatment-bakeoff` (src/dev/surge-tint-candidates.js), Peter: "i like a
// lot of these … no point doing green on the plumber level since its already quite
// green … combined with the other glitches … ramp up/switch more as we progress but I
// do want them to be kicking in immediately … start normal for a second, change
// pallette and then maybe change back or do a different pallet … dont want it to be
// TOO insane though".
//
// So each look (four bars) opens on its own colours for at least two beats, then runs
// a few palette SEGMENTS laid on the beat: a wash in an ink chosen to be far from the
// look's own colours, a duotone, drained, after-hours, and from surge-2 the loud ones
// (negative, posterise, thermal). Between segments it either drops back to normal or
// cuts straight to another scheme. surge-1 is gentle and sparse; surge-2 more and
// shorter; surge-3 most, and climbs with progress. Never across a move between looks.
//
// One pass over the frame after the look's backdrop and ground and before the cast
// (run.js style.afterGround), so hero, hazards and pickups keep their colours. The LCD
// look converts its whole frame in post() and holds its cast past it, so on that look
// the pass runs after post() instead (the pack's choice, surgePack).

const BEATS = 16;       // a look, SURGE_SLOT_BEATS
const OPEN = 2;         // beats of the look's own colours first
const CLOSE = 14;       // clear of the longest move's lead into the next look

function rng(seed) {
  let a = Math.floor(seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Inks far from each look's own colours (no green on Field Service's green hills, no
// violet on Crypt's indigo night).
export const SURGE_LOOK_INKS = Object.freeze({
  pixel: ['#ff3fb4', '#ff8a2a', '#9a5cff'],       // green hills, blue sky
  mcm: ['#9a5cff', '#ff3fb4', '#3f6bff'],         // sand and teal
  neon: ['#ff8a2a', '#3fcf5a', '#ffd23f'],        // violet night
  watercolor: ['#ff8a2a', '#ff3fb4', '#3fcf5a'],  // pale blue snow
  gouache: ['#3fcf5a', '#ff8a2a', '#ff4a4a'],     // indigo night
  lcd: ['#9a5cff', '#ff3fb4', '#3f6bff'],         // yellow-green screen
  gravity: ['#ff8a2a', '#ff3fb4', '#9a5cff'],     // jade
  office: ['#3fcf5a', '#22e0ff', '#3f6bff'],      // pink and white
});
const DUOTONES = [['#2a1458', '#ffc070'], ['#0c3a3a', '#ff9ac0'], ['#3a0c1c', '#9fe8ff']];
// Thermal reads as a heat camera only where the look has light in it.
const DARK_LOOKS = new Set(['neon', 'gouache']);
// The night looks turn to bright paper in negative, which is the read (Peter, 13 Oct:
// "the dark levels look effective when negative so incorporate more of that earlier on
// for those (terminal velocity, crypt, space perhaps)"): negative from surge-1, twice
// as likely. Held for one beat like everyone's on surge-1 and surge-2 ("make the
// negatives in the early stages just 1 beat also"); up to four on surge-3.
const NEGATIVE_LOOKS = new Set(['neon', 'gouache', 'gravity']);

export const SURGE_PALETTE_LEVELS = Object.freeze({
  1: { per: [1, 1, 2, 2], lens: [3, 4, 4, 6], swap: 0.25, stutter: false,
    kinds: ['wash', 'wash', 'duotone', 'drained', 'night'] },
  2: { per: [1, 2, 2, 3], lens: [2, 3, 4, 4, 6], swap: 0.35, stutter: true,
    kinds: ['wash', 'wash', 'duotone', 'drained', 'night', 'posterise', 'negative'] },
  3: { per: [2, 2, 3, 3], lens: [1, 2, 2, 3, 4], swap: 0.45, stutter: true,
    kinds: ['wash', 'wash', 'duotone', 'drained', 'night', 'posterise', 'negative', 'thermal', 'thermal'] },
});
// The loud ones stay short.
const MAX_LEN = { negative: 1, thermal: 3, posterise: 3 };

// One look's palette segments, in beats from its downbeat: [{ start, len, kind, ink, pair }].
// surge-3 adds up to two more a look by the finish.
export function surgePalettes(slot, level, seed, lookName = null, progress = 0) {
  const lv = Math.max(1, Math.min(3, Math.round(level) || 1));
  const L = SURGE_PALETTE_LEVELS[lv];
  const r = rng(seed * 131 + slot * 17 + 0.375);
  let n = L.per[Math.floor(r() * L.per.length)];
  if (lv >= 3) n += Math.round(2 * Math.pow(Math.max(0, Math.min(1, progress)), 1.4));
  const inks = SURGE_LOOK_INKS[lookName] || SURGE_LOOK_INKS.pixel;
  const out = [];
  let at = OPEN + Math.floor(r() * 2) * 0.5;      // the look's own colours first
  let last = null;
  for (let i = 0; i < n && at < CLOSE - 1; i++) {
    const pool = NEGATIVE_LOOKS.has(lookName) ? [...L.kinds, 'negative', 'negative'] : L.kinds;
    const kinds = pool.filter((k) => k !== last && !(k === 'thermal' && DARK_LOOKS.has(lookName)));
    const kind = kinds[Math.floor(r() * kinds.length)];
    let len = L.lens[Math.floor(r() * L.lens.length)];
    const cap = kind === 'negative' && lv >= 3 && NEGATIVE_LOOKS.has(lookName) ? 4 : MAX_LEN[kind];
    len = Math.min(len, cap ?? len, CLOSE - at);
    out.push({ start: at, len, kind, ink: inks[Math.floor(r() * inks.length)],
      pair: DUOTONES[Math.floor(r() * DUOTONES.length)], stutter: L.stutter && r() < 0.5 });
    last = kind;
    // Straight into another scheme, or back to normal for a beat or two.
    at += len + (r() < L.swap ? 0 : 1 + Math.floor(r() * 3));
  }
  return out;
}

// The segment on at `since` beats into the look, or null. A stuttered segment finds
// its channel on a flicker of sixteenths, as the Frost snow intrusion does.
export function surgePaletteAt(segments, since) {
  for (const s of segments) {
    const b = since - s.start;
    if (b < 0 || b >= s.len) continue;
    if (s.stutter && b < 0.5 && Math.floor(b * 4) % 2 === 1) return null;
    return s;
  }
  return null;
}

// ---------------------------------------------------------------- the passes
function whole(ctx, fn) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  fn(ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}
function blend(ctx, op, color, alpha = 1) {
  whole(ctx, (w, h) => {
    ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  });
}
const gray = (ctx, alpha = 1) => blend(ctx, 'saturation', '#808080', alpha);

// The per-pixel two run on a copy about 320px wide and come back up unsmoothed — a
// cheap camera's chunky read, which is a glitch's look anyway, and a fixed cost.
let low = null;
function lowRes(ctx, fn) {
  if (typeof document === 'undefined' || !ctx.canvas) return;
  whole(ctx, (w, h) => {
    const k = Math.max(1, Math.round(w / 320));
    const lw = Math.max(1, Math.round(w / k)), lh = Math.max(1, Math.round(h / k));
    if (!low) low = document.createElement('canvas');
    if (low.width !== lw || low.height !== lh) { low.width = lw; low.height = lh; }
    const g = low.getContext('2d', { willReadFrequently: true });
    if (!g || typeof g.getImageData !== 'function') return;
    g.imageSmoothingEnabled = true;
    g.drawImage(ctx.canvas, 0, 0, lw, lh);
    const img = g.getImageData(0, 0, lw, lh);
    if (!img?.data) return;
    fn(img.data);
    g.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, w, h);
  });
}
const THERMAL = [[0, [8, 6, 40]], [0.25, [70, 20, 140]], [0.5, [210, 30, 80]], [0.72, [255, 120, 20]], [0.9, [255, 220, 60]], [1, [255, 255, 220]]];
const THERMAL_LUT = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let v = 0; v < 256; v++) {
    const x = v / 255;
    let k = 0; while (k < THERMAL.length - 2 && x > THERMAL[k + 1][0]) k++;
    const [a, ca] = THERMAL[k], [b, cb] = THERMAL[k + 1], u = (x - a) / (b - a);
    for (let j = 0; j < 3; j++) lut[v * 3 + j] = ca[j] + (cb[j] - ca[j]) * u;
  }
  return lut;
})();

export function applySurgePalette(ctx, seg) {
  if (!seg || !ctx?.canvas) return;
  switch (seg.kind) {
    case 'wash': blend(ctx, 'color', seg.ink, 0.8); break;
    case 'duotone': gray(ctx); blend(ctx, 'multiply', seg.pair[1]); blend(ctx, 'screen', seg.pair[0]); break;
    case 'drained': gray(ctx, 0.75); break;
    case 'night': gray(ctx, 0.45); blend(ctx, 'multiply', '#4a5a9a', 0.75); break;
    case 'negative': blend(ctx, 'difference', '#ffffff'); break;
    case 'posterise': lowRes(ctx, (d) => { for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) d[i + j] = Math.round(d[i + j] / 85) * 85; }); break;
    case 'thermal': lowRes(ctx, (d) => {
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * 3;
        d[i] = THERMAL_LUT[v]; d[i + 1] = THERMAL_LUT[v + 1]; d[i + 2] = THERMAL_LUT[v + 2];
      }
    }); break;
    default: break;
  }
}
