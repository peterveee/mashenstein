// Gallery-only spring-pad studies. None of these names is registered as a
// gameplay prop: the run still draws `springPad` from sprites/props.js. The
// gallery gives every proposal the same 16x6 gameplay box and bottom-anchors
// its art exactly as drawWorldEntity does, so choosing a look cannot quietly
// change where the player lands or when the spring fires.

const TAU = Math.PI * 2;

function path(ctx, fill, stroke, width, draw) {
  ctx.beginPath();
  draw(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function rr(c, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  c.moveTo(x + q, y);
  c.arcTo(x + w, y, x + w, y + h, q);
  c.arcTo(x + w, y + h, x, y + h, q);
  c.arcTo(x, y + h, x, y, q);
  c.arcTo(x, y, x + w, y, q);
  c.closePath();
}

function plate(ctx, w, y, h, color, inset = 0.05) {
  path(ctx, color, 'rgba(8,10,18,.72)', Math.max(0.25, w * 0.025),
    (c) => rr(c, w * inset, y, w * (1 - inset * 2), h, h * 0.24));
  path(ctx, 'rgba(255,255,255,.34)', null, 0,
    (c) => rr(c, w * (inset + 0.04), y + h * 0.12, w * (0.92 - inset * 2), h * 0.18, h * 0.08));
}

function base(ctx, w, h, color = '#202637') {
  path(ctx, 'rgba(5,7,12,.2)', null, 0, (c) => c.ellipse(w / 2, h * 0.96, w * 0.47, h * 0.035, 0, 0, TAU));
  plate(ctx, w, h * 0.82, h * 0.16, color, 0.015);
  for (const x of [0.12, 0.88]) {
    path(ctx, '#d8e1e8', '#29303d', Math.max(0.2, w * 0.012),
      (c) => c.arc(w * x, h * 0.9, Math.max(0.45, w * 0.035), 0, TAU));
  }
}

// Eight stepped poses at the same 16fps as the incumbent. Most of the cycle
// winds down; the final three poses release and settle. Gallery animation is
// deliberately frame-stepped because smooth interpolation can hide a weak
// silhouette that the cached production frames would expose.
function motion(t) {
  const frame = Math.floor(t * 16) % 8;
  const p = frame / 8;
  const wind = Math.min(1, p / 0.625);
  const release = p > 0.625 ? (p - 0.625) / 0.375 : 0;
  const squash = p <= 0.625
    ? 1 - 0.36 * wind * wind
    : 0.64 + 0.36 * release + 0.18 * Math.sin(release * Math.PI);
  return { frame, wind, release, squash };
}

// A — the former production painter, retained as the settled bake-off's
// baseline now that C ships. It must live here rather than delegate to
// `springPad`, or promoting the winner would silently turn A into a duplicate.
function drawStackedBars(ctx, w, h, t) {
  const { wind, release, squash } = motion(t);
  path(ctx, '#171c2b', 'rgba(6,6,14,.65)', Math.max(0.25, w * 0.018),
    (c) => rr(c, 0, h * 0.82, w, h * 0.18, h * 0.03));
  path(ctx, 'rgba(120,132,164,.35)', null, 0,
    (c) => rr(c, w * 0.02, h * 0.82, w * 0.96, h * 0.04, h * 0.02));
  const coilTop = h * (0.82 - 0.5 * squash);
  const coilH = h * 0.82 - coilTop;
  for (let i = 0; i < 3; i++) {
    const y = coilTop + (coilH * (i + 0.15)) / 3;
    path(ctx, i % 2 ? '#8a6a12' : '#f6d33c', null, 0,
      (c) => rr(c, w * 0.28, y, w * 0.44, coilH * 0.2, coilH * 0.08));
  }
  path(ctx, '#171c2b', 'rgba(6,6,14,.65)', Math.max(0.25, w * 0.018),
    (c) => rr(c, w * 0.06, coilTop - h * 0.13, w * 0.88, h * 0.15, h * 0.04));
  path(ctx, '#f6d33c', null, 0,
    (c) => rr(c, w * 0.1, coilTop - h * 0.115, w * 0.8, h * 0.05, h * 0.02));
  const cw = w * 0.3, ct = h * 0.09;
  for (let i = 0; i < 2; i++) {
    const cy = coilTop - h * (0.2 + i * 0.16) - release * h * 0.1;
    path(ctx, release > 0 ? '#fff6d0' : `rgba(246,211,60,${(0.5 + 0.4 * wind - i * 0.3).toFixed(3)})`, null, 0, (c) => {
      c.moveTo(w / 2 - cw, cy); c.lineTo(w / 2, cy - cw); c.lineTo(w / 2 + cw, cy);
      c.lineTo(w / 2 + cw - ct, cy); c.lineTo(w / 2, cy - cw + ct);
      c.lineTo(w / 2 - cw + ct, cy); c.closePath();
    });
  }
}

// B — two unmistakable helical coils. Using two columns keeps the wire broad
// enough to survive the lane raster while retaining the classic spring shape.
function drawTwinCoil(ctx, w, h, t) {
  const { squash, release } = motion(t);
  base(ctx, w, h, '#28323d');
  const topY = h * (0.78 - 0.49 * squash);
  for (const [cx, phase] of [[w * 0.35, 0], [w * 0.65, Math.PI]]) {
    const turns = 3;
    path(ctx, null, '#17202b', Math.max(0.75, w * 0.075), (c) => {
      for (let i = 0; i <= 18; i++) {
        const q = i / 18;
        const x = cx + Math.sin(q * turns * TAU + phase) * w * 0.105;
        const y = topY + h * 0.09 + q * (h * 0.78 - topY - h * 0.12);
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
    });
    path(ctx, null, '#c9f3f1', Math.max(0.35, w * 0.035), (c) => {
      for (let i = 0; i <= 18; i++) {
        const q = i / 18;
        const x = cx + Math.sin(q * turns * TAU + phase) * w * 0.105;
        const y = topY + h * 0.09 + q * (h * 0.78 - topY - h * 0.12);
        if (i) c.lineTo(x, y); else c.moveTo(x, y);
      }
    });
  }
  plate(ctx, w, topY, h * 0.13, release ? '#fff5c7' : '#44d8bf', 0.04);
  path(ctx, '#18232f', null, 0, (c) => {
    c.moveTo(w * 0.38, topY + h * 0.09); c.lineTo(w * 0.5, topY + h * 0.025);
    c.lineTo(w * 0.62, topY + h * 0.09); c.closePath();
  });
}

// C — an arcade-button plunger. This has the clearest single moving part and
// the warmest colour identity, at the cost of looking pressable rather than
// mechanically springy when seen completely still.
function drawPlunger(ctx, w, h, t) {
  const { squash, release } = motion(t);
  base(ctx, w, h, '#f2d8a7');
  const crownY = h * (0.72 - 0.43 * squash);
  path(ctx, '#aeb9c8', '#343b49', Math.max(0.3, w * 0.025),
    (c) => rr(c, w * 0.43, crownY + h * 0.1, w * 0.14, h * 0.69 - crownY, w * 0.035));
  path(ctx, '#5d6877', null, 0,
    (c) => rr(c, w * 0.47, crownY + h * 0.12, w * 0.035, h * 0.64 - crownY, w * 0.015));
  path(ctx, release ? '#ffefb5' : '#ee554d', '#49212c', Math.max(0.35, w * 0.03), (c) => {
    c.moveTo(w * 0.14, crownY + h * 0.14);
    c.quadraticCurveTo(w * 0.17, crownY, w * 0.31, crownY - h * 0.035);
    c.quadraticCurveTo(w * 0.5, crownY - h * 0.1, w * 0.69, crownY - h * 0.035);
    c.quadraticCurveTo(w * 0.83, crownY, w * 0.86, crownY + h * 0.14);
    c.closePath();
  });
  path(ctx, 'rgba(255,255,255,.5)', null, 0,
    (c) => c.ellipse(w * 0.43, crownY + h * 0.015, w * 0.2, h * 0.035, -0.08, 0, TAU));
}

// D — concertina bellows. The wide alternating folds remain readable as a
// compressed machine even when the internal lines collapse to single pixels.
function drawBellows(ctx, w, h, t) {
  const { squash, release } = motion(t);
  base(ctx, w, h, '#252736');
  const topY = h * (0.78 - 0.42 * squash);
  const bottomY = h * 0.81;
  const folds = 5;
  path(ctx, '#f4c94a', '#342738', Math.max(0.35, w * 0.03), (c) => {
    c.moveTo(w * 0.23, bottomY);
    for (let i = 0; i <= folds; i++) {
      const q = i / folds;
      const y = bottomY + (topY - bottomY) * q;
      const x = i % 2 ? w * 0.12 : w * 0.23;
      c.lineTo(x, y);
    }
    for (let i = folds; i >= 0; i--) {
      const q = i / folds;
      const y = bottomY + (topY - bottomY) * q;
      const x = i % 2 ? w * 0.88 : w * 0.77;
      c.lineTo(x, y);
    }
    c.closePath();
  });
  for (let i = 1; i < folds; i++) {
    const q = i / folds;
    const y = bottomY + (topY - bottomY) * q;
    path(ctx, null, i % 2 ? '#fff0a2' : '#8f5d1c', Math.max(0.25, h * 0.018),
      (c) => { c.moveTo(w * 0.17, y); c.lineTo(w * 0.83, y); });
  }
  plate(ctx, w, topY - h * 0.02, h * 0.14, release ? '#fff5ce' : '#e66f45', 0.035);
}

// E — stacked leaf springs. The lowest, calmest silhouette in the set: it is
// less decorative than the incumbent and reads as a physical ramped mechanism
// without claiming hero-height headroom.
function drawLeaf(ctx, w, h, t) {
  const { squash, release } = motion(t);
  base(ctx, w, h, '#354052');
  const lift = h * (0.11 + 0.16 * squash);
  const cy = h * 0.73 - lift;
  for (let i = 0; i < 3; i++) {
    const y = cy + i * h * 0.075;
    path(ctx, null, i === 1 ? '#e8f1f2' : '#65c9cc', Math.max(0.55, h * 0.055), (c) => {
      c.moveTo(w * (0.12 + i * 0.035), y + h * 0.05);
      c.quadraticCurveTo(w * 0.5, y - lift * (0.75 - i * 0.12), w * (0.88 - i * 0.035), y + h * 0.05);
    });
  }
  path(ctx, '#f2d34e', '#493d20', Math.max(0.25, w * 0.02),
    (c) => rr(c, w * 0.45, cy - lift * 0.58, w * 0.1, h * 0.16, w * 0.025));
  plate(ctx, w, cy - lift * 0.78 - h * 0.07, h * 0.14, release ? '#fff6c4' : '#48d2ba', 0.055);
}

// F — twin pneumatic pistons. It is the most industrial option: strong broad
// uprights, visible collars, and a deck whose rise can be read without relying
// on fine coil lines.
function drawPiston(ctx, w, h, t) {
  const { squash, release } = motion(t);
  base(ctx, w, h, '#252b3a');
  const topY = h * (0.77 - 0.47 * squash);
  for (const x of [0.29, 0.61]) {
    path(ctx, '#667486', '#252c39', Math.max(0.3, w * 0.025),
      (c) => rr(c, w * x, h * 0.52, w * 0.1, h * 0.31, w * 0.025));
    path(ctx, '#e2edf0', '#45515f', Math.max(0.25, w * 0.018),
      (c) => rr(c, w * (x + 0.023), topY + h * 0.08, w * 0.054, h * 0.5 - topY, w * 0.018));
    path(ctx, '#f4bd3f', '#4b3922', Math.max(0.2, w * 0.016),
      (c) => rr(c, w * (x - 0.025), h * 0.55, w * 0.15, h * 0.075, w * 0.02));
  }
  plate(ctx, w, topY, h * 0.14, release ? '#fff3b7' : '#4fc7e8', 0.03);
  path(ctx, '#172431', null, 0, (c) => {
    c.moveTo(w * 0.36, topY + h * 0.095); c.lineTo(w * 0.5, topY + h * 0.02);
    c.lineTo(w * 0.64, topY + h * 0.095); c.closePath();
  });
}

export const SPRING_PAD_CANDIDATES = [
  { id: 'stacked-bars', letter: 'A', name: 'Former stacked bars', art: [21, 26],
    note: 'FORMER — black-and-gold bars, top plate and two floating chevrons.' },
  { id: 'twin-coil', letter: 'B', name: 'Twin coils', art: [21, 22],
    note: 'Two broad steel helices and a mint landing deck; the most literal spring.' },
  { id: 'plunger', letter: 'C', name: 'Arcade plunger · SHIPS', art: [21, 20],
    note: 'PICKED — a red cabinet-button crown on one polished shaft; boldest single moving part.' },
  { id: 'bellows', letter: 'D', name: 'Gold bellows', art: [21, 18],
    note: 'Wide concertina folds; compact, chunky and readable without floating arrows.' },
  { id: 'leaf', letter: 'E', name: 'Leaf launcher', art: [23, 14],
    note: 'Low stacked bow springs; the quietest silhouette and the least visual overdraw.' },
  { id: 'piston', letter: 'F', name: 'Twin pistons', art: [21, 23],
    note: 'Industrial twin rams with bright collars and a cyan deck.' },
];

const DRAW = {
  'stacked-bars': drawStackedBars,
  'twin-coil': drawTwinCoil,
  plunger: drawPlunger,
  bellows: drawBellows,
  leaf: drawLeaf,
  piston: drawPiston,
};

export function drawSpringPadCandidate(ctx, id, w, h, t = 0) {
  DRAW[id]?.(ctx, w, h, t);
}
