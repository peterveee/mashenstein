// Proposed THE SURGE bonus prop, kept in the dev/gallery bundle only.
// It is a compact cabinet power breaker: live power is hot pink and crackling;
// after the lever is thrown it settles to a steady mint lamp. This is a visual
// mockup, not a gameplay obstacle or registered prop.

const INK = '#100d1d';
const CASE = '#57566f';
const CASE_LIT = '#85839a';
const CASE_SHADE = '#343247';
const WELL = '#211f32';
const HOT = '#ff477e';
const MINT = '#62f1cf';
const AMBER = '#ffe08a';

function pen(ctx, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function rounded(ctx, x, y, w, h, r, fill, stroke = INK, width = 0.7) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && width > 0) {
    pen(ctx, stroke, width);
    ctx.stroke();
  }
}

function spark(ctx, x, y, size, phase, color) {
  const s = 0.72 + 0.28 * Math.sin(phase);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(-0.32, -0.28);
  ctx.lineTo(-0.92, 0.02);
  ctx.lineTo(-0.12, 0.18);
  ctx.lineTo(-0.38, size * 0.72);
  pen(ctx, color, 0.7);
  ctx.stroke();
  ctx.restore();
}

/** Draw a 19x25-ish breaker, anchored at its feet, in world units. */
export function drawSurgeBreaker(ctx, x, feetY, t, state = 'live') {
  const W = 19, H = 24;
  const y = feetY - H;
  const live = state === 'live';
  const flipping = state === 'flip';
  const on = state === 'on';
  const lamp = on ? MINT : HOT;
  const breathe = 0.68 + 0.32 * Math.sin(t * 8.4);

  // Short floor feet and a bolted wall-plate make the unit feel mounted rather
  // than like a loose collectible or a cord piece.
  rounded(ctx, x - 0.8, feetY - 1.1, W + 1.6, 1.8, 0.45, CASE_SHADE, INK, 0.65);
  ctx.fillStyle = CASE_LIT;
  ctx.fillRect(x + 1.1, feetY - 0.75, 1.6, 0.25);
  ctx.fillRect(x + W - 2.7, feetY - 0.75, 1.6, 0.25);

  // Folded steel shell, bevel, and inset panel.
  rounded(ctx, x, y, W, H - 0.6, 1.6, CASE, INK, 0.85);
  ctx.fillStyle = CASE_LIT;
  ctx.fillRect(x + 1.2, y + 1.5, W - 2.4, 0.55);
  ctx.fillStyle = CASE_SHADE;
  ctx.fillRect(x + W - 1.7, y + 2.5, 0.75, H - 5);
  rounded(ctx, x + 2.1, y + 3, W - 4.2, H - 6.2, 0.8, WELL, '#171426', 0.5);

  // Four bright fasteners keep the outline readable at gameplay size.
  for (const [sx, sy] of [[1.4, 2], [W - 1.4, 2], [1.4, H - 2.6], [W - 1.4, H - 2.6]]) {
    ctx.beginPath();
    ctx.arc(x + sx, y + sy, 0.48, 0, Math.PI * 2);
    ctx.fillStyle = CASE_LIT;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + sx - 0.23, y + sy);
    ctx.lineTo(x + sx + 0.23, y + sy);
    pen(ctx, INK, 0.25);
    ctx.stroke();
  }

  // State lamp and a small stepped charge meter.
  ctx.globalAlpha = live ? breathe : 1;
  ctx.beginPath();
  ctx.arc(x + 4.1, y + 5.3, 1.05, 0, Math.PI * 2);
  ctx.fillStyle = lamp;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 4.1, y + 5.3, 1.65, 0, Math.PI * 2);
  pen(ctx, lamp, 0.3);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    rounded(ctx, x + 7 + i * 2.4, y + 4.7, 1.55, 1.25, 0.28,
      on || i === 0 ? (on ? MINT : HOT) : '#514d66', null, 0);
  }

  // The large throw switch is the primary read: the lever moves from up to
  // down; the player does not need to read a tiny screen to understand it.
  rounded(ctx, x + 4.1, y + 8.4, W - 8.2, 8.5, 1.15, '#171526', '#0e0c18', 0.45);
  ctx.fillStyle = '#5d5970';
  ctx.fillRect(x + 5.1, y + 9.4, W - 10.2, 0.45);
  ctx.fillRect(x + 5.1, y + 15.2, W - 10.2, 0.45);
  const turn = flipping ? 0.5 + 0.46 * Math.sin(t * 5.6) : on ? 1 : 0;
  const angle = -0.82 + turn * 1.64;
  const pivotX = x + W / 2, pivotY = y + 12.7;
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(angle);
  rounded(ctx, -0.95, -1.05, 6.3, 2.1, 0.9, CASE_LIT, INK, 0.52);
  rounded(ctx, 4.35, -1.32, 2.5, 2.65, 0.9, on ? MINT : AMBER, INK, 0.55);
  ctx.fillStyle = '#fff9dc';
  ctx.fillRect(4.75, -0.72, 0.65, 0.42);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 1.1, 0, Math.PI * 2);
  ctx.fillStyle = CASE_LIT;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.45;
  ctx.stroke();

  // Circuit traces at the bottom of the face.
  ctx.fillStyle = on ? 'rgba(98,241,207,.7)' : 'rgba(255,71,126,.62)';
  ctx.fillRect(x + 4.4, y + 19.2, 4.4, 0.45);
  ctx.fillRect(x + 10.2, y + 19.2, 4.1, 0.45);
  ctx.fillStyle = CASE_LIT;
  ctx.fillRect(x + 8.4, y + 18.8, 1.9, 1.2);

  if (live) {
    const p = (t * 7) % 1;
    if (p < 0.7) {
      spark(ctx, x - 1.2, y + 8.4, 2.5, t * 11, HOT);
      spark(ctx, x + W + 1.1, y + 12 + Math.sin(t * 9) * 1.2, 2.2, t * 13 + 1, AMBER);
    }
  } else if (flipping) {
    const burst = Math.max(0, Math.sin(t * 5.6));
    if (burst > 0.3) {
      spark(ctx, x - 1.5, y + 11, 2.7 * burst, t * 14, AMBER);
      spark(ctx, x + W + 1.4, y + 12, 2.4 * burst, t * 12 + 2, MINT);
    }
  } else if (on) {
    // A short steady tube at the top is the quiet confirmation after the throw.
    ctx.globalAlpha = 0.52 + 0.12 * Math.sin(t * 2.5);
    ctx.fillStyle = MINT;
    ctx.fillRect(x + 4.2, y + 1.9, W - 8.4, 0.32);
    ctx.globalAlpha = 1;
  }
}
