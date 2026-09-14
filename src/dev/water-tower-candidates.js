// Gallery-only water-tower studies. The live Speed Zone painter remains the
// control; these alternatives are deliberately not registered as scenery.
// Keep the palette aligned with the production far-mesa tower so the chooser
// answers a silhouette question rather than a colour question.

const INK = '#526b72';
const DARK = '#40545c';
const LIGHT = '#9baba6';
const SHADOW = 'rgba(35,46,48,.24)';
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

function line(ctx, color, width, draw) {
  path(ctx, null, color, width, draw);
}

function shadow(ctx, s, width = 17) {
  path(ctx, SHADOW, null, 0, (c) => c.ellipse(0, 0.8 * s, width * s, 2.1 * s, 0, 0, TAU));
}

function footing(ctx, s, width = 28, height = 3) {
  path(ctx, DARK, null, 0, (c) => {
    c.moveTo(-width * 0.5 * s, 0);
    c.lineTo(width * 0.5 * s, 0);
    c.lineTo(width * 0.37 * s, -height * s);
    c.lineTo(-width * 0.37 * s, -height * s);
    c.closePath();
  });
  line(ctx, LIGHT, 0.85 * s, (c) => {
    c.moveTo(-width * 0.35 * s, -height * 0.55 * s);
    c.lineTo(width * 0.35 * s, -height * 0.55 * s);
  });
}

function tankEllipse(ctx, s, rx, cy, ry, band = false) {
  path(ctx, INK, DARK, 1.35 * s, (c) => c.ellipse(0, cy * s, rx * s, ry * s, 0, 0, TAU));
  path(ctx, LIGHT, null, 0, (c) => c.ellipse(0, (cy - ry * 0.46) * s, rx * 0.78 * s, ry * 0.25 * s, 0, 0, TAU));
  if (band) {
    line(ctx, DARK, 1.2 * s, (c) => {
      c.moveTo(-rx * 0.86 * s, (cy + ry * 0.2) * s);
      c.quadraticCurveTo(0, (cy + ry * 0.45) * s, rx * 0.86 * s, (cy + ry * 0.2) * s);
    });
  }
}

function tankDrum(ctx, s, { top = -48, bottom = -36, topW = 17, bottomW = 14, cap = false, band = false } = {}) {
  path(ctx, INK, DARK, 1.35 * s, (c) => {
    c.moveTo(-topW * s, top * s);
    c.quadraticCurveTo(-topW * 1.08 * s, (top + 2) * s, -bottomW * s, bottom * s);
    c.lineTo(bottomW * s, bottom * s);
    c.quadraticCurveTo(topW * 1.08 * s, (top + 2) * s, topW * s, top * s);
    c.quadraticCurveTo(0, (top - 3) * s, -topW * s, top * s);
    c.closePath();
  });
  path(ctx, LIGHT, null, 0, (c) => {
    c.moveTo(-topW * 0.7 * s, (top + 1.6) * s);
    c.quadraticCurveTo(0, (top - 0.7) * s, topW * 0.7 * s, (top + 1.6) * s);
    c.quadraticCurveTo(0, (top + 3.1) * s, -topW * 0.7 * s, (top + 1.6) * s);
    c.closePath();
  });
  if (band) {
    line(ctx, DARK, 1.25 * s, (c) => {
      c.moveTo(-bottomW * 0.98 * s, (top + 6) * s);
      c.quadraticCurveTo(0, (top + 7.7) * s, bottomW * 0.98 * s, (top + 6) * s);
    });
  }
  if (cap) {
    path(ctx, DARK, DARK, 0.8 * s, (c) => {
      c.moveTo(-topW * 0.98 * s, top * s);
      c.lineTo(0, (top - 5.2) * s);
      c.lineTo(topW * 0.98 * s, top * s);
      c.closePath();
    });
    line(ctx, LIGHT, 0.75 * s, (c) => {
      c.moveTo(0, (top - 5.2) * s);
      c.lineTo(0, (top - 8.2) * s);
    });
  }
}

function twoLegs(ctx, s, { top = -36, spread = 15, brace = true, feet = false } = {}) {
  line(ctx, DARK, 2.15 * s, (c) => {
    c.moveTo(-9 * s, top * s); c.lineTo(-spread * s, 0);
    c.moveTo(9 * s, top * s); c.lineTo(spread * s, 0);
  });
  line(ctx, LIGHT, 0.7 * s, (c) => {
    c.moveTo(-9 * s, top * s); c.lineTo(-spread * s, 0);
    c.moveTo(9 * s, top * s); c.lineTo(spread * s, 0);
  });
  if (brace) {
    line(ctx, DARK, 1.1 * s, (c) => {
      c.moveTo(-spread * 0.7 * s, -14 * s); c.lineTo(spread * 0.7 * s, -14 * s);
      c.moveTo(-spread * 0.42 * s, -25 * s); c.lineTo(spread * 0.42 * s, -25 * s);
    });
  }
  if (feet) footing(ctx, s, spread * 2.35, 3.2);
}

function fourLegFrame(ctx, s, { top = -36, spread = 15, deck = false, feet = false } = {}) {
  if (deck) {
    path(ctx, DARK, null, 0, (c) => {
      c.moveTo(-13 * s, (top + 1) * s); c.lineTo(13 * s, (top + 1) * s);
      c.lineTo(11 * s, (top + 4) * s); c.lineTo(-11 * s, (top + 4) * s); c.closePath();
    });
  }
  line(ctx, DARK, 1.8 * s, (c) => {
    c.moveTo(-9 * s, top * s); c.lineTo(-spread * s, 0);
    c.moveTo(9 * s, top * s); c.lineTo(spread * s, 0);
    c.moveTo(-3.7 * s, (top + 1) * s); c.lineTo(-4.8 * s, 0);
    c.moveTo(3.7 * s, (top + 1) * s); c.lineTo(4.8 * s, 0);
  });
  line(ctx, LIGHT, 0.6 * s, (c) => {
    c.moveTo(-9 * s, top * s); c.lineTo(-spread * s, 0);
    c.moveTo(9 * s, top * s); c.lineTo(spread * s, 0);
  });
  line(ctx, DARK, 0.9 * s, (c) => {
    c.moveTo(-spread * 0.78 * s, -13 * s); c.lineTo(spread * 0.78 * s, -25 * s);
    c.moveTo(spread * 0.78 * s, -13 * s); c.lineTo(-spread * 0.78 * s, -25 * s);
    c.moveTo(-spread * 0.65 * s, -13 * s); c.lineTo(spread * 0.65 * s, -13 * s);
  });
  if (feet) footing(ctx, s, spread * 2.35, 3.2);
}

function drawShallow(ctx, s) {
  shadow(ctx, s);
  twoLegs(ctx, s, { top: -31, spread: 15, brace: true });
  tankEllipse(ctx, s, 20, -42, 7, false);
}

function drawRound(ctx, s) {
  shadow(ctx, s);
  twoLegs(ctx, s, { top: -37, spread: 14, brace: true });
  tankEllipse(ctx, s, 16.5, -43, 11, false);
}

function drawConical(ctx, s) {
  shadow(ctx, s);
  fourLegFrame(ctx, s, { top: -35, spread: 15, feet: true });
  tankDrum(ctx, s, { top: -48, bottom: -35, topW: 16, bottomW: 13, cap: true });
}

function drawTapered(ctx, s) {
  shadow(ctx, s);
  twoLegs(ctx, s, { top: -34, spread: 16, brace: true, feet: true });
  tankDrum(ctx, s, { top: -48, bottom: -34, topW: 18, bottomW: 11.5, band: true });
}

function drawFourLeg(ctx, s) {
  shadow(ctx, s);
  fourLegFrame(ctx, s, { top: -35, spread: 15, feet: true });
  tankEllipse(ctx, s, 17, -43, 9.5, false);
}

function drawBroadFoot(ctx, s) {
  shadow(ctx, s, 23);
  twoLegs(ctx, s, { top: -35, spread: 19, brace: true, feet: true });
  tankEllipse(ctx, s, 17, -44, 9.5, false);
  footing(ctx, s, 42, 4.5);
}

function drawTall(ctx, s) {
  shadow(ctx, s);
  fourLegFrame(ctx, s, { top: -43, spread: 16, feet: true });
  tankDrum(ctx, s, { top: -57, bottom: -43, topW: 16, bottomW: 13, cap: false });
}

function drawBanded(ctx, s) {
  shadow(ctx, s);
  twoLegs(ctx, s, { top: -36, spread: 15, brace: true, feet: true });
  tankDrum(ctx, s, { top: -49, bottom: -36, topW: 17, bottomW: 14, band: true });
  line(ctx, LIGHT, 0.65 * s, (c) => {
    c.moveTo(-14 * s, -43 * s); c.lineTo(14 * s, -43 * s);
  });
}

function drawPlatform(ctx, s) {
  shadow(ctx, s, 21);
  fourLegFrame(ctx, s, { top: -34, spread: 15, deck: true, feet: true });
  tankEllipse(ctx, s, 17, -44, 9.5, false);
  path(ctx, LIGHT, DARK, 0.9 * s, (c) => {
    c.moveTo(-12 * s, -34 * s); c.lineTo(12 * s, -34 * s);
    c.lineTo(10 * s, -31.5 * s); c.lineTo(-10 * s, -31.5 * s); c.closePath();
  });
}

export const WATER_TOWER_CANDIDATES = [
  { id: 'control', letter: 'A', name: 'Current oval tank',
    note: 'CONTROL — the shipped Speed Zone painter, retained as the visual baseline.' },
  { id: 'shallow-drum', letter: 'B', name: 'Shallow drum',
    note: 'Wider, lower tank; the calmest skyline read with less vertical mass.' },
  { id: 'round-cistern', letter: 'C', name: 'Round cistern',
    note: 'Fuller tank volume; tests whether a stronger circular body reads faster.' },
  { id: 'conical-cap', letter: 'D', name: 'Conical cap',
    note: 'Classic finial and peaked roof; the tank, cap and legs separate cleanly.' },
  { id: 'tapered-drum', letter: 'E', name: 'Tapered drum',
    note: 'Shoulders narrow into the legs; one strong band adds a readable material cue.' },
  { id: 'four-leg-frame', letter: 'F', name: 'Four-leg frame',
    note: 'More explicit support structure with cross-bracing and planted feet.' },
  { id: 'broad-foot', letter: 'G', name: 'Broad footing',
    note: 'Same tank scale, but a wider stance and foundation make ground contact undeniable.' },
  { id: 'tall-tower', letter: 'H', name: 'Tall tower',
    note: 'Longer legs and a narrower drum; tests a more distant, landmark-like silhouette.' },
  { id: 'banded-tank', letter: 'I', name: 'Banded tank',
    note: 'Incumbent proportions with stronger circumferential hoops for surface rhythm.' },
  { id: 'platform-tank', letter: 'J', name: 'Platform tank',
    note: 'A visible deck under the drum; tests whether a rigid platform improves recognition.' },
];

const DRAW = {
  'shallow-drum': drawShallow,
  'round-cistern': drawRound,
  'conical-cap': drawConical,
  'tapered-drum': drawTapered,
  'four-leg-frame': drawFourLeg,
  'broad-foot': drawBroadFoot,
  'tall-tower': drawTall,
  'banded-tank': drawBanded,
  'platform-tank': drawPlatform,
};

export function drawWaterTowerCandidate(ctx, id, scale = 1) {
  const paint = DRAW[id];
  if (!paint) throw new Error(`unknown water-tower candidate: ${id}`);
  ctx.save();
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  paint(ctx, 1);
  ctx.restore();
}
