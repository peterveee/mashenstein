// THE BOLT's arcs: how each one the mirror ball throws out to the room looks (club.js drawStrike).
// A TESLA COIL (Peter, 6 Oct 2026: G of the bake-off — "aren't the tendrils more like what a tesla
// coil does?"; the tendrils were the plasma globe's): branching violet-white streamers re-forming
// every frame, so it crackles rather than writhes; now and then a frame missing, and short
// streamers off the ball into thin air beside the one that found its mark. The others it beat —
// IT'S ALIVE!'s bolt, a held fork, the globe's tendrils, a welding arc, a cartoon zigzag, the
// club sign's neon — are in git history.

const PLASMA = '#b77bff';
const CORE = '#f4ecff';

/** A jagged lightning path from (x0,y0) to (x1,y1): `n` + 1 points kinked across it, most mid-way. */
function jagged(rand, x0, y0, x1, y1, n, amp) {
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const o = i === 0 || i === n ? 0 : (rand() - 0.5) * amp * (0.4 + Math.sin(Math.PI * k)) * d;
    pts.push([x0 + dx * k + nx * o, y0 + dy * k + ny * o]);
  }
  return pts;
}

/** A polyline narrowing from `w0` to `w1` along its length, a segment at a time. */
function taper(ctx, pts, w0, w1, colour, alpha) {
  ctx.globalAlpha = alpha; ctx.strokeStyle = colour;
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = w0 + (w1 - w0) * (i / (pts.length - 1));
    ctx.beginPath(); ctx.moveTo(...pts[i - 1]); ctx.lineTo(...pts[i]); ctx.stroke();
  }
}

/** A forked streamer: a tapering trunk on a violet glow, `twigs` branches off it forking once more. */
function forked(ctx, x0, y0, x1, y1, w, alpha, depth = 0, twigs = 2) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const pts = jagged(Math.random, x0, y0, x1, y1, depth ? 7 : 12, depth ? 0.3 : 0.22);
  taper(ctx, pts, w * 3.4, w * 1.2, PLASMA, alpha * 0.3);
  taper(ctx, pts, w, w * 0.35, CORE, alpha);
  if (depth > 1) return;
  const dir = Math.atan2(y1 - y0, x1 - x0);
  for (let b = 0; b < (depth ? 1 : twigs); b++) {
    const [bx, by] = pts[2 + Math.floor(Math.random() * (pts.length - 4))];
    const a = dir + (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.5), len = d * (0.18 + Math.random() * 0.22);
    forked(ctx, bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len, w * 0.55, alpha * 0.85, depth + 1);
  }
}

/** One arc from (x0,y0), the ball's edge, to (x1,y1), where it lands, at `alpha`; `u` the room's stroke unit. */
export function drawTeslaBolt(ctx, x0, y0, x1, y1, { u, alpha }) {
  if (Math.random() < 0.1) return;
  const a = alpha * (0.6 + Math.random() * 0.4);
  forked(ctx, x0, y0, x1, y1, 1.8 * u, a, 0, 3 + Math.floor(Math.random() * 3));
  const d = Math.hypot(x1 - x0, y1 - y0), dir = Math.atan2(y1 - y0, x1 - x0);
  const air = 1 + Math.floor(Math.random() * 2);
  for (let k = 0; k < air; k++) {
    const ang = dir + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9), len = Math.min(60 * u, d * (0.15 + Math.random() * 0.2));
    forked(ctx, x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len, 1.1 * u, a * 0.7, 1);
  }
}
