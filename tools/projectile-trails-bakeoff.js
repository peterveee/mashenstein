import { drawRangedProjectile, drawRocketFist, drawThrownAxe, drawToon, TOON_SPECS } from '../src/sprites/toons.js';
import { HERO_SPRITES } from '../src/sprites/heroes.js';
import { drawPellet } from '../src/engine/sprites.js';

// Preview-only motion language bake-off. This file is deliberately not imported
// by gameplay: the question here is what the eye reads, not whether a trail is
// approved for the shipped renderer.
const PHONE_ZOOM = 2.2;
const WORLD_W = 160;
const WORLD_H = 150;

const CANDIDATES = [
  {
    id: 'current',
    title: 'CURRENT',
    note: 'No trail · the projectile must carry the read alone',
    style: 'current',
  },
  {
    id: 'echoes',
    title: 'SILHOUETTE ECHOES',
    note: 'Two faint material-tinted copies behind the moving object',
    style: 'echoes',
  },
  {
    id: 'streaks',
    title: 'SEGMENTED STREAK',
    note: 'Three short marks · directional, but not a continuous beam',
    style: 'streaks',
  },
  {
    id: 'hybrid',
    title: 'HYBRID · 1 SHADOW',
    note: 'One restrained ghost plus a short directional material mark',
    style: 'hybrid',
  },
  {
    id: 'hybrid-two',
    title: 'HYBRID · 2 SHADOWS',
    note: 'Two fading ghosts plus the same short directional material mark',
    style: 'hybrid-two',
  },
  {
    id: 'bowwave',
    title: 'FRONT BOW-WAVE',
    note: 'A small pressure crescent immediately ahead of the nose',
    style: 'bowwave',
  },
  {
    id: 'hybrid-bowwave',
    title: 'HYBRID + BOW-WAVE',
    note: 'The restrained rear cue plus the leading pressure crescent',
    style: 'hybrid-bowwave',
  },
];

const PROJECTILES = [
  { id: 'arrow', label: 'ARROW · ARC OUTBOUND', hero: 'fernwick', kind: 'arrow', row: 0 },
  { id: 'bamboo', label: 'BAMBOO · TUMBLE OUTBOUND', hero: 'rusty', kind: 'bamboo', row: 1 },
  { id: 'wrench', label: 'WRENCH · OUTBOUND / RETURN', hero: 'lorenzo', kind: 'wrench', row: 2 },
];

const ROSTER_PROJECTILES = [
  { id: 'arrow', label: 'ARROW', hero: 'fernwick', kind: 'arrow', selected: 'hybrid-two' },
  { id: 'bamboo', label: 'BAMBOO', hero: 'rusty', kind: 'bamboo', selected: 'hybrid-two' },
  { id: 'wrench', label: 'WRENCH', hero: 'lorenzo', kind: 'wrench', selected: 'hybrid-two' },
  { id: 'axe', label: 'AXE', hero: 'grumpos', kind: 'axe', selected: 'hybrid-two' },
  { id: 'b33p', label: 'B-33P LEMON', hero: 'b33p', kind: 'b33p', selected: 'echoes' },
  { id: 'fist', label: 'RAMON FIST', hero: 'ramon', kind: 'fist', selected: 'echoes' },
  { id: 'kiko', label: 'KIKO', hero: 'kiko', kind: 'kiko', selected: 'orb-shadows' },
  { id: 'clara', label: 'CLARA ×2', hero: 'clara', kind: 'clara', selected: 'orb-shadows' },
];

const CLARA_BULLET_COLORS = [
  { id: 'current', label: 'CURRENT BRASS', note: 'Warm, but too close to B-33P yellow', color: '#ffd27a', hi: '#fff0a0' },
  { id: 'coral', label: 'CORAL RED', note: 'Warm firearm read · strongest separation', color: '#f2767f', hi: '#ffc0bb' },
  { id: 'rose', label: 'DUSTY ROSE', note: 'Softer, closer to Clara’s existing accent', color: '#d86c91', hi: '#f6b7c7' },
  { id: 'lilac', label: 'LILAC', note: 'Clear contrast · slightly more stylized', color: '#b9a2f3', hi: '#e4d8ff' },
  { id: 'STEEL', label: 'PALE STEEL', note: 'Gunmetal family · clean but less characterful', color: '#c9d6df', hi: '#f2f7fa' },
];

const ROWS = [
  { ground: 40, top: 3 },
  { ground: 88, top: 51 },
  { ground: 136, top: 99 },
];

function lerp(a, b, q) { return a + (b - a) * q; }
function clamp01(n) { return Math.max(0, Math.min(1, n)); }

// Each sampler returns the same visual state the trail would need in the real
// game: position, angle, and the current velocity direction. Trail samples are
// taken from this history rather than from a fixed leftward offset so the
// wrench remains correct when it turns around and comes home.
function arrowAt(t) {
  const v = 240, a = 52.5, b = 150;
  const alt = 9 + a * t - b * t * t;
  const slope = a - 2 * b * t;
  return { x: 16 + v * t, alt, rot: -Math.atan2(slope, v), vx: v, vy: -slope, live: t >= 0 && alt > 0 };
}

function bambooAt(t) {
  return {
    x: 16 + 230 * t,
    alt: 9 + Math.sin(t * 10) * 1.8,
    rot: t * 14,
    vx: 230,
    vy: -18 * Math.cos(t * 10),
    live: t >= 0 && t <= 0.62,
  };
}

function wrenchAt(t) {
  // Out, a short hover, then a slower visible return. The real game uses the
  // same phases; this compressed loop just keeps all three treatments on one
  // readable card.
  const out = 0.44, hover = 0.18, back = 0.76;
  if (t < out) return { x: 16 + t / out * 104, alt: 9 + Math.sin(t / out * Math.PI) * 5, rot: t * 12, vx: 104 / out, vy: -Math.cos(t / out * Math.PI) * 5 * Math.PI / out, live: true, phase: 'OUTBOUND' };
  if (t < out + hover) return { x: 120, alt: 14 + (t - out) / hover * 8, rot: t * 12, vx: 0, vy: -8 / hover, live: true, phase: 'HOVER' };
  const q = clamp01((t - out - hover) / back);
  return { x: 120 - q * 104, alt: 22 - q * 13, rot: t * 12, vx: -104 / back, vy: 13 / back, live: q < 1, phase: 'RETURN' };
}

function sampleAt(projectile, t) {
  if (t < 0) return null;
  if (projectile.kind === 'arrow') return arrowAt(t);
  if (projectile.kind === 'bamboo') return bambooAt(t);
  return wrenchAt(t);
}

function cycleState(projectile, clock) {
  if (projectile.kind === 'arrow') {
    const t = 0.08 + (clock % 0.76) * 0.72;
    return { t, state: arrowAt(t), phase: 'ARC OUTBOUND' };
  }
  if (projectile.kind === 'bamboo') {
    const t = 0.04 + (clock % 0.72) * 0.78;
    return { t, state: bambooAt(t), phase: 'TUMBLE OUTBOUND' };
  }
  const t = (clock % 1.54);
  const state = wrenchAt(t);
  return { t, state, phase: state.phase || 'OUTBOUND / RETURN' };
}

function trailColour(kind) {
  if (kind === 'arrow') return '#e3c36f';
  if (kind === 'bamboo') return '#b7dc8e';
  return '#d2dce6';
}

function direction(state) {
  const length = Math.hypot(state.vx || 0, state.vy || 0) || 1;
  return { x: (state.vx || 0) / length, y: (state.vy || 0) / length };
}

function drawGhost(ctx, projectile, state, alpha, scale = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  drawRangedProjectile(ctx, projectile.kind, state.x, -state.alt, {
    hero: projectile.hero,
    flying: true,
    rot: state.rot,
    scale,
  });
  ctx.restore();
}

function drawSegmentedStreak(ctx, projectile, state) {
  const d = direction(state);
  const colour = trailColour(projectile.kind);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineCap = 'round';
  // The gaps are intentional: a few material marks read as motion, while a
  // single continuous line would turn bamboo or steel into an energy beam.
  const marks = [
    { from: 5, to: 10, alpha: 0.38, width: 1.15 },
    { from: 13, to: 18, alpha: 0.22, width: 0.9 },
    { from: 21, to: 25, alpha: 0.1, width: 0.7 },
  ];
  for (const mark of marks) {
    ctx.globalAlpha = mark.alpha;
    ctx.lineWidth = mark.width;
    ctx.beginPath();
    ctx.moveTo(state.x - d.x * mark.from, -state.alt - d.y * mark.from);
    ctx.lineTo(state.x - d.x * mark.to, -state.alt - d.y * mark.to);
    ctx.stroke();
  }
  // A tiny cross-glint on the steel treatment keeps the wrench from becoming
  // a generic grey line, without outlining the whole trail.
  if (projectile.kind === 'wrench') {
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 0.65;
    const px = -d.y, py = d.x;
    ctx.beginPath();
    ctx.moveTo(state.x - d.x * 12 - px * 1.8, -state.alt - d.y * 12 - py * 1.8);
    ctx.lineTo(state.x - d.x * 12 + px * 1.8, -state.alt - d.y * 12 + py * 1.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBowWave(ctx, projectile, state) {
  const d = direction(state);
  const n = { x: -d.y, y: d.x };
  const colour = trailColour(projectile.kind);
  const front = projectile.kind === 'arrow' ? 15 : projectile.kind === 'bamboo' ? 9 : 12;
  const span = projectile.kind === 'arrow' ? 3.4 : 3;
  const depth = projectile.kind === 'arrow' ? 3.5 : 3;
  const point = { x: state.x + d.x * front, y: -state.alt + d.y * front };
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 0.85;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(point.x - n.x * span, point.y - n.y * span);
  ctx.quadraticCurveTo(
    point.x + d.x * depth, point.y + d.y * depth,
    point.x + n.x * span, point.y + n.y * span,
  );
  ctx.stroke();
  // A shorter, weaker inner curve stops the arrow's broadhead from swallowing
  // the cue at phone scale, while remaining too faint to read as a second rim.
  if (projectile.kind === 'arrow') {
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(point.x - n.x * span * 0.58, point.y - n.y * span * 0.58);
    ctx.quadraticCurveTo(
      point.x + d.x * depth * 0.72, point.y + d.y * depth * 0.72,
      point.x + n.x * span * 0.58, point.y + n.y * span * 0.58,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function fistAt(t) {
  const out = 0.42, back = 0.78;
  if (t < out) {
    const q = t / out;
    return { x: 16 + q * 96, alt: 10 + Math.sin(q * Math.PI) * 3, rot: 0, vx: 96 / out, vy: -Math.cos(q * Math.PI) * 3 * Math.PI / out, returning: false, live: true, phase: 'OUTBOUND' };
  }
  const q = clamp01((t - out) / back);
  return { x: 112 - q * 96, alt: 13 - q * 5, rot: 0, vx: -96 / back, vy: 5 / back, returning: true, live: q < 1, phase: 'RETURN' };
}

function roundAt(t, speed, alt = 11) {
  return { x: 16 + speed * t, alt, rot: 0, vx: speed, vy: 0, live: t >= 0 && t <= 0.56, phase: 'FLIGHT' };
}

function rosterAt(projectile, t) {
  if (projectile.kind === 'arrow') return arrowAt(t);
  if (projectile.kind === 'bamboo') return bambooAt(t);
  if (projectile.kind === 'wrench' || projectile.kind === 'axe') return wrenchAt(t);
  if (projectile.kind === 'fist') return fistAt(t);
  if (projectile.kind === 'b33p') return roundAt(t, 260, 11);
  if (projectile.kind === 'kiko') return roundAt(t, 170, 11);
  return roundAt(t, 340, 11);
}

function rosterCycle(projectile, clock) {
  const duration = projectile.kind === 'wrench' || projectile.kind === 'axe' ? 1.54
    : projectile.kind === 'fist' ? 1.25 : projectile.kind === 'kiko' ? 0.7 : 0.62;
  const t = 0.05 + (clock % duration) * (projectile.kind === 'wrench' || projectile.kind === 'axe' || projectile.kind === 'fist' ? 1 : 0.75);
  return { t, state: rosterAt(projectile, t) };
}

function drawRosterShape(ctx, projectile, state, clock = 0, alpha = 1) {
  if (!state?.live) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (projectile.kind === 'axe') {
    drawThrownAxe(ctx, state.x, -state.alt, state.rot);
  } else if (projectile.kind === 'fist') {
    drawRocketFist(ctx, state.x, -state.alt, clock, !!state.returning);
  } else if (projectile.kind === 'b33p') {
    drawPellet(ctx, state.x, -state.alt, { fill: '#f6d33c', size: 1 });
  } else if (projectile.kind === 'kiko') {
    const pal = HERO_SPRITES.kiko?.pal || {};
    drawPellet(ctx, state.x, -state.alt, { fill: pal.ki, spark: pal.a, orb: true, size: 1.5 });
  } else if (projectile.kind === 'clara') {
    const bullet = HERO_SPRITES.clara?.pal?.ki || '#f2767f';
    drawPellet(ctx, state.x, -state.alt, { fill: bullet, hi: '#ffc0bb', size: 0.85 });
    drawPellet(ctx, state.x - 16, -state.alt, { fill: bullet, hi: '#ffc0bb', size: 0.85 });
  } else {
    drawRangedProjectile(ctx, projectile.kind, state.x, -state.alt, {
      hero: projectile.hero, flying: true, rot: state.rot,
      scale: 1, t: clock,
    });
  }
  ctx.restore();
}

function drawOrbShadow(ctx, projectile, state) {
  if (!state?.live) return;
  const isKiko = projectile.kind === 'kiko';
  const color = isKiko ? (HERO_SPRITES.kiko?.pal?.ki || '#7ad6c6')
    : (HERO_SPRITES.clara?.pal?.ki || '#f2767f');
  const offsets = projectile.kind === 'clara' ? [0, -16] : [0];
  const dx = isKiko ? 18 : 15;
  const radius = isKiko ? 2.5 : 1.5;
  ctx.save();
  ctx.fillStyle = color;
  for (const offset of offsets) {
    // A true trailing shadow: separated from the live projectile, flattened so
    // it cannot read as another round, and with no bright core or detail.
    ctx.globalAlpha = isKiko ? 0.2 : 0.18;
    ctx.beginPath();
    ctx.ellipse(state.x + offset - dx, -state.alt + 0.75, radius, isKiko ? 1.25 : 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRosterTrail(ctx, projectile, t, state, style, clock) {
  if (style === 'current' || style === 'orb-shadows' || !state.live || state.phase === 'HOVER'
    || (!state.vx && !state.vy)) return;
  if (style === 'hybrid-two' || style === 'echoes') {
    const old = rosterAt(projectile, t - 0.075);
    const older = rosterAt(projectile, t - 0.15);
    if (old?.live) drawRosterShape(ctx, projectile, old, clock - 0.075, 0.16);
    if (older?.live) drawRosterShape(ctx, projectile, older, clock - 0.15, 0.08);
  }
  if (style === 'hybrid-two' && ['arrow', 'bamboo', 'wrench', 'axe'].includes(projectile.kind)) {
    drawSegmentedStreak(ctx, projectile, state);
  }
}

function rosterPose(projectile, clock) {
  const pose = {
    kind: 'run', phase: 0.2, time: clock, grounded: true, facing: 1,
    menuAction: 'aim', actionTime: 0.2,
  };
  if (projectile.kind === 'bamboo' || projectile.kind === 'axe') pose.axeThrown = true;
  if (projectile.kind === 'wrench') pose.wrenchThrown = true;
  if (projectile.kind === 'fist') pose.headless = false;
  return pose;
}

const ROSTER_LANE_W = 124, ROSTER_ROW_H = 42;
function drawRosterLane(ctx, projectile, mode, clock, x0, rowTop) {
  const ground = rowTop + 34;
  const { t, state } = rosterCycle(projectile, clock);
  ctx.save();
  ctx.translate(x0, ground);
  drawToon(ctx, projectile.hero, rosterPose(projectile, clock), 16, 0, 24, { spec: TOON_SPECS[projectile.hero] });
  drawRosterTrail(ctx, projectile, t, state, mode === 'current' ? 'current' : projectile.selected, clock);
  if (mode !== 'current' && projectile.selected === 'orb-shadows') drawOrbShadow(ctx, projectile, state);
  drawRosterShape(ctx, projectile, state, clock, 1);
  ctx.restore();
  ctx.fillStyle = '#afc4c5'; ctx.font = '5px ui-monospace, monospace';
  ctx.fillText(projectile.label, x0 + 2, rowTop + 6);
  ctx.fillStyle = '#81999d'; ctx.font = '4.6px ui-monospace, monospace';
  const treatmentLabel = mode === 'current' ? 'CURRENT'
    : projectile.selected === 'orb-shadows' ? 'ORB SHADOWS'
      : projectile.selected === 'current' ? 'UNCHANGED' : 'PROPOSED';
  ctx.fillText(treatmentLabel, x0 + 70, rowTop + 6);
}

function renderRoster(canvas, zoom, clock, animated) {
  const w = ROSTER_LANE_W * 2 * zoom, h = ROSTER_ROW_H * ROSTER_PROJECTILES.length * zoom;
  canvas.width = Math.round(w); canvas.height = Math.round(h);
  canvas.style.width = `${Math.round(w)}px`; canvas.style.height = `${Math.round(h)}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#18252d'; ctx.fillRect(0, 0, ROSTER_LANE_W * 2, ROSTER_ROW_H * ROSTER_PROJECTILES.length);
  ctx.strokeStyle = '#31444a'; ctx.lineWidth = 0.6;
  for (let row = 0; row <= ROSTER_PROJECTILES.length; row++) {
    ctx.beginPath(); ctx.moveTo(0, row * ROSTER_ROW_H); ctx.lineTo(ROSTER_LANE_W * 2, row * ROSTER_ROW_H); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(ROSTER_LANE_W, 0); ctx.lineTo(ROSTER_LANE_W, ROSTER_ROW_H * ROSTER_PROJECTILES.length); ctx.stroke();
  for (let i = 0; i < ROSTER_PROJECTILES.length; i++) {
    const projectile = ROSTER_PROJECTILES[i];
    drawRosterLane(ctx, projectile, 'current', clock, 0, i * ROSTER_ROW_H);
    drawRosterLane(ctx, projectile, 'selected', clock, ROSTER_LANE_W, i * ROSTER_ROW_H);
  }
  if (animated) requestAnimationFrame((ms) => renderRoster(canvas, zoom, ms / 1000, true));
}

function drawClaraColorPair(ctx, color, x, y) {
  drawPellet(ctx, x, y, { fill: color.color, hi: color.hi, size: 0.85 });
  drawPellet(ctx, x - 16, y, { fill: color.color, hi: color.hi, size: 0.85 });
}

function renderClaraColor(canvas, color, zoom, clock, animated) {
  const w = 160 * zoom, h = 38 * zoom;
  canvas.width = Math.round(w); canvas.height = Math.round(h);
  canvas.style.width = `${Math.round(w)}px`; canvas.style.height = `${Math.round(h)}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#18252d'; ctx.fillRect(0, 0, 160, 38);
  ctx.strokeStyle = '#31444a'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(0, 33); ctx.lineTo(160, 33); ctx.stroke();
  drawToon(ctx, 'clara', rosterPose({ kind: 'clara' }, clock), 18, 0, 24, { spec: TOON_SPECS.clara });
  const x = 62 + (clock % 0.68) / 0.68 * 70;
  drawClaraColorPair(ctx, color, x, -12);
  ctx.fillStyle = '#81999d'; ctx.font = '4.5px ui-monospace, monospace';
  ctx.fillText('B-33P REF', 128, 5);
  drawPellet(ctx, 145, -12, { fill: '#f6d33c', size: 1 });
  if (animated) requestAnimationFrame((ms) => renderClaraColor(canvas, color, zoom, ms / 1000, true));
}

function drawTrail(ctx, projectile, t, state, style) {
  if (style === 'current' || !state.live || state.phase === 'HOVER'
    || (!state.vx && !state.vy)) return;
  if (style === 'echoes' || style === 'hybrid' || style === 'hybrid-two' || style === 'hybrid-bowwave') {
    const old = sampleAt(projectile, t - 0.075);
    if (old?.live) drawGhost(ctx, projectile, old,
      style === 'hybrid' || style === 'hybrid-two' || style === 'hybrid-bowwave' ? 0.16 : 0.2,
      style === 'hybrid' || style === 'hybrid-two' || style === 'hybrid-bowwave' ? 0.86 : 0.82);
    if (style === 'echoes' || style === 'hybrid-two') {
      const older = sampleAt(projectile, t - 0.15);
      if (older?.live) drawGhost(ctx, projectile, older, 0.08, 0.7);
    }
  }
  if (style === 'streaks' || style === 'hybrid' || style === 'hybrid-two' || style === 'hybrid-bowwave') drawSegmentedStreak(ctx, projectile, state);
  if (style === 'bowwave' || style === 'hybrid-bowwave') drawBowWave(ctx, projectile, state);
}

function grid(ctx, w, h) {
  ctx.fillStyle = '#111a22'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#18252d'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2a3a42'; ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y <= h; y += 8) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  ctx.strokeStyle = '#587078'; ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (const row of ROWS) { ctx.moveTo(0, row.ground); ctx.lineTo(w, row.ground); }
  ctx.stroke();
}

function poseFor(projectile, clock) {
  const pose = {
    kind: 'run', phase: 0.2, time: clock, grounded: true, facing: 1,
    menuAction: 'aim', actionTime: 0.2,
  };
  if (projectile.kind === 'arrow') return pose;
  pose.actionTime = 0.3;
  if (projectile.kind === 'bamboo') pose.axeThrown = true;
  if (projectile.kind === 'wrench') pose.wrenchThrown = true;
  return pose;
}

function drawProjectileRow(ctx, projectile, candidate, clock) {
  const row = ROWS[projectile.row];
  const { t, state, phase } = cycleState(projectile, clock);
  ctx.save();
  ctx.translate(0, row.ground);
  // The hero is 24u tall, matching the in-run draw height. He is kept small on
  // purpose: the question is whether the projectile survives beside the thing
  // that launches it, not whether it reads as an isolated icon.
  drawToon(ctx, projectile.hero, poseFor(projectile, clock), 18, 0, 24, { spec: TOON_SPECS[projectile.hero] });
  ctx.save();
  ctx.translate(0, 0);
  drawTrail(ctx, projectile, t, state, candidate.style);
  drawRangedProjectile(ctx, projectile.kind, state.x, -state.alt, {
    hero: projectile.hero, flying: true, rot: state.rot, scale: 1, t: clock,
  });
  ctx.restore();
  ctx.fillStyle = '#aac0c2'; ctx.font = '4.8px ui-monospace, monospace';
  ctx.fillText(projectile.label, 2, -row.ground + row.top + 5);
  ctx.fillStyle = '#81999d'; ctx.font = '4.6px ui-monospace, monospace';
  ctx.fillText(phase, 108, -row.ground + row.top + 5);
  ctx.restore();
}

function render(canvas, candidate, zoom, clock, animated) {
  const w = WORLD_W * zoom, h = WORLD_H * zoom;
  canvas.width = Math.round(w); canvas.height = Math.round(h);
  canvas.style.width = `${Math.round(w)}px`; canvas.style.height = `${Math.round(h)}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
  ctx.imageSmoothingEnabled = false;
  grid(ctx, WORLD_W, WORLD_H);
  for (const projectile of PROJECTILES) drawProjectileRow(ctx, projectile, candidate, clock);
  if (animated) requestAnimationFrame((ms) => render(canvas, candidate, zoom, ms / 1000, true));
}

for (const candidate of CANDIDATES) {
  const article = document.createElement('article');
  article.className = `candidate candidate-${candidate.id}`;
  article.innerHTML = `<h2>${candidate.title}</h2><p>${candidate.note}</p><div class="label">PHONE / GAMEPLAY SCALE</div>`;
  const phone = document.createElement('canvas');
  const label = document.createElement('div');
  label.className = 'label'; label.textContent = '4× INSPECTION';
  const study = document.createElement('canvas');
  article.append(phone, label, study);
  document.querySelector('main').append(article);
  render(phone, candidate, PHONE_ZOOM, 0, true);
  render(study, candidate, 4, 0.38, false);
}

const rosterSection = document.createElement('section');
rosterSection.className = 'roster-section';
rosterSection.id = 'roster-preview';
rosterSection.innerHTML = '<h2>FULL ROSTER · CURRENT VS PROPOSED</h2><p>Left: current read. Right: the proposed treatment for each projectile. Kiko and Clara get separated orb shadows only — no bright-core duplicates or rear trails.</p>';
const rosterLabel = document.createElement('div');
rosterLabel.className = 'roster-labels';
rosterLabel.innerHTML = '<span>CURRENT / UNCHANGED</span><span>PROPOSED TREATMENT</span>';
rosterSection.append(rosterLabel);
const rosterPhone = document.createElement('canvas');
const rosterStudyLabel = document.createElement('div');
rosterStudyLabel.className = 'label'; rosterStudyLabel.textContent = '4× INSPECTION';
const rosterStudy = document.createElement('canvas');
rosterSection.append(rosterPhone, rosterStudyLabel, rosterStudy);
document.body.append(rosterSection);
renderRoster(rosterPhone, PHONE_ZOOM, 0, true);
renderRoster(rosterStudy, 4, 0.38, false);

const claraColorSection = document.createElement('section');
claraColorSection.className = 'color-section';
claraColorSection.id = 'clara-color-preview';
claraColorSection.innerHTML = '<h2>CLARA BULLET COLOR · B-33P YELLOW REFERENCE</h2><p>Each option keeps Clara’s existing twin-shot silhouette. The small yellow mark at right is B-33P’s protected laser color.</p>';
const claraColorGrid = document.createElement('div');
claraColorGrid.className = 'color-grid';
for (const color of CLARA_BULLET_COLORS) {
  const article = document.createElement('article');
  article.className = `color-candidate color-${color.id.toLowerCase()}`;
  article.innerHTML = `<h3>${color.label}</h3><p>${color.note}</p><div class="label">PHONE / GAMEPLAY SCALE</div>`;
  const phone = document.createElement('canvas');
  const label = document.createElement('div');
  label.className = 'label'; label.textContent = '4× INSPECTION';
  const study = document.createElement('canvas');
  article.append(phone, label, study);
  claraColorGrid.append(article);
  renderClaraColor(phone, color, PHONE_ZOOM, 0, true);
  renderClaraColor(study, color, 4, 0.38, false);
}
claraColorSection.append(claraColorGrid);
document.body.append(claraColorSection);

window.projectileTrailsBakeoff = { candidates: CANDIDATES, projectiles: PROJECTILES };
