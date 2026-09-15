// Small, soft contact shadows for grounded gameplay objects. Airborne hazards
// deliberately do not call this painter: a detached landing mark can be seen
// without its caster and is too easy to confuse with a damaging hitbox. These
// are radial gradients rather than canvas shadowBlur so the edge stays soft
// after the low-resolution world is magnified.
const TAU = Math.PI * 2;
const DEFAULT_INK = '8,6,12';

function alphaColor(ink, alpha) {
  return `rgba(${ink},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

/**
 * Paint a shallow, soft-edged contact shadow without introducing a rectangular
 * silhouette. `rx`/`ry` are the outer radii in the caller's current coordinate
 * space; `alpha` is the peak strength before the gradient falloff.
 */
export function drawSoftContactShadow(ctx, cx, cy, rx, ry, options = {}) {
  const width = Number(rx), height = Number(ry);
  const alpha = Number(options.alpha ?? 0.34);
  if (!ctx || !(width > 0) || !(height > 0) || !(alpha > 0)) return;
  const ink = options.ink || DEFAULT_INK;
  const coreStop = Math.max(0.05, Math.min(0.8, Number(options.coreStop ?? 0.32)));
  const midStop = Math.max(coreStop + 0.05, Math.min(0.96, Number(options.midStop ?? 0.72)));
  const coreAlpha = Number(options.coreAlpha ?? 0.78);
  const midAlpha = Number(options.midAlpha ?? 0.28);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(width, height);
  const gradient = typeof ctx.createRadialGradient === 'function'
    ? ctx.createRadialGradient(0, 0, 0, 0, 0, 1) : null;
  if (gradient && typeof gradient.addColorStop === 'function') {
    gradient.addColorStop(0, alphaColor(ink, alpha * coreAlpha));
    gradient.addColorStop(coreStop, alphaColor(ink, alpha * coreAlpha * 0.82));
    gradient.addColorStop(midStop, alphaColor(ink, alpha * midAlpha));
    gradient.addColorStop(1, alphaColor(ink, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fill();
  } else {
    // Headless/recording contexts may not expose gradients. Keep the same
    // rounded language there rather than falling back to a hard rectangle.
    ctx.fillStyle = alphaColor(ink, alpha * 0.20);
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = alphaColor(ink, alpha * 0.46);
    ctx.beginPath();
    ctx.arc(0, 0, 0.62, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
