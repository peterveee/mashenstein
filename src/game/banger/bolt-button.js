// THE BOLT's button — the Lab club's reroll (a new take on a new seed): its silver disc, its rim
// and its lightning bolt (club.js drawControls).
//
// `drawBoltButton(ctx, o)` draws it. `o`: x, y (centre), r (radius), u (the line unit), alpha (the
// disc's fade), rim and ink (colours), and `k` — how far through its attract moment it is, 0–1, or
// -1 when there is none.
//
// THE ATTRACT (Peter, 7 Oct 2026: "a little attraction effect on the lightning icon ... fade in if
// dimmed and a glisten or do something so user notice it"; the bake-off's A, the glint, picked
// the same day: src/dev/bolt-attract-candidates.js). Once a visit, near the start "once things
// settle": the first bar line BOLT_SETTLE_S after the room came up — the welcome card has gone by
// then — and only if the bolt has not been touched. For a bar the button fades up however faint
// the row has gone, a shine sweeps across the disc and a star twinkles on the bolt's tip.

/** Seconds after the room comes up (the welcome card is 4.5 s and its fade) before the bolt shows itself. */
export const BOLT_SETTLE_S = 7;
/** The moment's length, in beats: a bar. */
export const BOLT_ATTRACT_BEATS = 4;

/** How far through the moment that starts on beat `from` the song is at `beat`, 0–1; -1 outside it. */
export function boltAttractK(beat, from) {
  if (!Number.isFinite(beat) || !Number.isFinite(from)) return -1;
  const d = (beat - from) / BOLT_ATTRACT_BEATS;
  return d >= 0 && d < 1 ? d : -1;
}

/** The button's alpha through the moment: up fast at its start, held, eased back at its end. */
export function boltAttractAlpha(k) {
  if (!(k >= 0)) return 0;
  return Math.min(1, k / 0.08, (1 - k) / 0.2);
}

/** RECHARGE's lightning bolt, as a path: a zig-zag from top right to its point bottom left. */
export function boltPath(ctx, x, y, b) {
  ctx.beginPath();
  ctx.moveTo(x + b * 0.18, y - b * 0.62);
  ctx.lineTo(x - b * 0.36, y + b * 0.08);
  ctx.lineTo(x - b * 0.02, y + b * 0.08);
  ctx.lineTo(x - b * 0.2, y + b * 0.64);
  ctx.lineTo(x + b * 0.38, y - b * 0.12);
  ctx.lineTo(x + b * 0.04, y - b * 0.12);
  ctx.closePath();
}

/** The disc and its rim, at the button's alpha (left set: the icon draws at it too). */
export function boltDisc(ctx, { x, y, r, u, alpha, rim }) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(11,11,20,0.78)';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rim; ctx.lineWidth = 0.8 * u;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
}

/** The button at rest, as the club had it before the glint (the bake-off draws its looks over it). */
export function drawBoltPlain(ctx, o) {
  boltDisc(ctx, o);
  ctx.fillStyle = o.ink;
  boltPath(ctx, o.x, o.y, o.r); ctx.fill();
  ctx.globalAlpha = 1;
}

/** A four-pointed twinkle. */
function star(ctx, x, y, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, d = i % 2 ? s * 0.22 : s;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath(); ctx.fill();
}
const ease = (v) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, v)));

/** The button, and in its moment the glint: the shine across the disc, then the star on the tip. */
export function drawBoltButton(ctx, o) {
  drawBoltPlain(ctx, o);
  const { x, y, r, k, alpha } = o;
  if (!(k >= 0.1 && k < 0.75)) return;
  // the shine: a pale band across the disc, sweeping top left to bottom right through the bolt
  const s = ease((k - 0.1) / 0.45);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.translate(x, y); ctx.rotate(-Math.PI / 4);
  const pos = (-1.5 + 3 * s) * r, w = r * 0.55;
  const g = ctx.createLinearGradient(0, pos - w, 0, pos + w);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-r * 1.5, pos - w, r * 3, w * 2);
  ctx.restore();
  // ...and a star on the bolt's top tip as it passes
  const tw = k > 0.35 ? Math.max(0, Math.sin(Math.PI * (k - 0.35) / 0.4)) : 0;
  if (tw > 0) {
    ctx.save(); ctx.globalAlpha = alpha * tw; ctx.fillStyle = '#ffffff';
    star(ctx, x + r * 0.2, y - r * 0.6, r * 0.42 * tw);
    ctx.restore();
  }
}
