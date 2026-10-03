// THE "YOU ARE HERE" MARKER — the gold wedge over the hero you are on. Shared by the food
// court (hub/index.js) and the Lab's club (banger/club.js), so it is one marker everywhere.

// The "you are here" chevron. A downward wedge rather than an arrow or a ring:
// a wedge points at exactly one pair of feet with no ambiguity about which
// character it belongs to, and it stays legible at 9px across with the ceiling
// lights guttering behind it.
//
// Rounded by stroking the path with round joins before filling it, rather than
// by drawing arcs — three arcTo corners on a 9px triangle collapse into mush,
// where a fat round-joined stroke gives clean radii at any size. The dark pass
// goes down first and wider, so the outline sits outside the gold instead of
// eating into it.
export const MARKER_R = 3.2;
// Center of the wedge to the top of the head. The wedge's own tip hangs about
// r * 1.02 below that center once the outline is counted, so this leaves ~7
// units of air — close enough to point, far enough not to graze a hat.
export const MARKER_GAP = 10;
export function drawPlayerMarker(ctx, cx, cy, r) {
  const path = (c) => {
    c.beginPath();
    c.moveTo(cx - r * 0.78, cy - r * 0.5);
    c.lineTo(cx + r * 0.78, cy - r * 0.5);
    c.lineTo(cx, cy + r * 0.62);
    c.closePath();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path(ctx);
  ctx.strokeStyle = 'rgba(26,16,40,0.5)';
  ctx.lineWidth = r * 0.8;
  ctx.stroke();
  path(ctx);
  ctx.strokeStyle = '#f6d33c';
  ctx.lineWidth = r * 0.5;
  ctx.stroke();
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.restore();
}

