// Approved Fine pressed quarter-step. Source coordinates are 2x logical size.
const TILE_SIZE = 1024;
export const PAPER_PATTERN_SCALE = 0.5;
export const PAPER_TEXTURE_BLEND = 'source-over';
// Surface-strength controls are application alphas, separate from the paper
// recipe itself. The approved shipped balance keeps scenery tactile while
// quieting the sky and foreground without rebaking the fibre source.
export const PAPER_EFFECT_STRENGTH = 1;
export const PAPER_SKY_STRENGTH = 0.8;
export const PAPER_SCENERY_STRENGTH = 1;
export const PAPER_GROUND_STRENGTH = 0.2;
export function paperStrengthOf(value, fallback = 1) {
  const strength = Number(value);
  const base = Number.isFinite(Number(fallback)) ? Number(fallback) : 1;
  return Number.isFinite(strength) ? Math.max(0, Math.min(1.25, strength))
    : Math.max(0, Math.min(1.25, base));
}
export function paperStrengthsOf(settings = {}) {
  const master = paperStrengthOf(settings.paperEffectStrength, PAPER_EFFECT_STRENGTH);
  const multiply = (value, fallback) => paperStrengthOf(
    master * paperStrengthOf(value, fallback), 0);
  return Object.freeze({
    sky: multiply(settings.paperSkyStrength, PAPER_SKY_STRENGTH),
    scenery: multiply(settings.paperSceneryStrength, PAPER_SCENERY_STRENGTH),
    ground: multiply(settings.paperGroundStrength, PAPER_GROUND_STRENGTH),
  });
}
// Global paper-motion tuning seam. This changes only how quickly the texture
// pattern travels across world surfaces; camera, terrain, and gameplay speed
// remain independent. The dev-only `paperSpeed` query can still audition other
// values without editing this default.
export const PAPER_TEXTURE_SPEED_DEFAULT = 0.5;
export function paperTextureSpeedOf(value) {
  const speed = Number(value);
  return Number.isFinite(speed) ? Math.max(0, Math.min(1.25, speed))
    : PAPER_TEXTURE_SPEED_DEFAULT;
}
export function paperTextureCameraX(camX, speed = PAPER_TEXTURE_SPEED_DEFAULT) {
  const x = Number(camX);
  return (Number.isFinite(x) ? x : 0) * paperTextureSpeedOf(speed);
}
const REVISION = 'paper-quarter-step-v2';
const profile = (id, strength = 1, darkStrength = 1, lightStrength = 1, kind = 'paper') => Object.freeze({
  id, revision: REVISION, pressed: 0.25, strength, darkStrength, lightStrength, kind,
});
export const PAPER_MATERIALS = Object.freeze({
  skySmooth: profile('skySmooth'),
  cardstockSoft: profile('cardstockSoft'),
  cardstockQuiet: profile('cardstockQuiet', 0.75),
  // Review candidate: retain the selected fibre density and scale, but lift
  // the dark impression slightly so warm/pale game colours do not turn grey.
  cardstockClear: profile('cardstockClear', 1, 0.82, 1),
  // Review-only material candidate. Felt keeps the same cut-out depth and
  // palette, but swaps the long pressed-sheet fibres for a denser, softer
  // wool field with shorter cross-grain strokes.
  felt: profile('felt', 1.05, 0.72, 0.35, 'felt'),
});
const sourceCache = new Map();
let patternCache = new WeakMap();
function materialOf(material) {
  if (typeof material === 'string') return PAPER_MATERIALS[material] || PAPER_MATERIALS.cardstockClear;
  return material || PAPER_MATERIALS.cardstockClear;
}

// Exact seeded stroke recipe from fibre-study/quarter-step.html. Baking the
// black/white pairs on transparency lets the same sheet work on every palette.
// Source-over is associative; no neutral-grey overlay or cloudy noise is needed.
function paintFeltFibres(ctx, m) {
  let seed = 49631;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  // Felt needs a nap, not a scratched overlay. Keep the fibres short and
  // rounded, and use mostly one-way low-contrast marks instead of the paired
  // black/white pressed-paper strokes.
  for (let i = 0; i < 50000; i++) {
    const x = rand() * TILE_SIZE, y = rand() * TILE_SIZE;
    const angle = rand() * Math.PI;
    const length = 0.45 + rand() * 1.9;
    const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
    const width = 0.55 + rand() * 0.9;
    const a = (0.012 + rand() * 0.028) * m.strength;
    for (const ox of [-TILE_SIZE, 0, TILE_SIZE]) for (const oy of [-TILE_SIZE, 0, TILE_SIZE]) {
      if (x + ox < -8 || x + ox > TILE_SIZE + 8 || y + oy < -8 || y + oy > TILE_SIZE + 8) continue;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(0,0,0,${a * m.darkStrength})`;
      ctx.beginPath(); ctx.moveTo(x + ox, y + oy); ctx.lineTo(x + ox + dx, y + oy + dy); ctx.stroke();
    }
  }
  // Rounded nubs break up the directional marks into a soft, matte pile. They
  // are deliberately sparse enough to leave the cabinet colours clean.
  for (let i = 0; i < 12000; i++) {
    const x = rand() * TILE_SIZE, y = rand() * TILE_SIZE;
    const radius = 0.55 + rand() * 1.55;
    const a = (0.012 + rand() * 0.028) * m.strength;
    for (const ox of [-TILE_SIZE, 0, TILE_SIZE]) for (const oy of [-TILE_SIZE, 0, TILE_SIZE]) {
      if (x + ox < -12 || x + ox > TILE_SIZE + 12 || y + oy < -12 || y + oy > TILE_SIZE + 12) continue;
      ctx.fillStyle = `rgba(0,0,0,${a * m.darkStrength})`;
      ctx.beginPath(); ctx.arc(x + ox, y + oy, radius, 0, Math.PI * 2); ctx.fill();
      if (rand() < 0.28) {
        ctx.fillStyle = `rgba(255,255,255,${a * m.lightStrength})`;
        ctx.beginPath(); ctx.arc(x + ox - 0.35, y + oy - 0.35, radius * 0.55, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

export function paintPaperFibres(ctx, material = 'cardstockClear') {
  const m = materialOf(material);
  if (m.kind === 'felt') {
    paintFeltFibres(ctx, m);
    return;
  }
  let seed = 23571;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  for (let i = 0; i < 100000; i++) {
    const x = rand()*TILE_SIZE, y = rand()*TILE_SIZE, angle = rand()*Math.PI*2;
    const length = .5 + .5*m.pressed + rand()*(1.5 + 3.5*m.pressed);
    const dx = Math.cos(angle)*length, dy = Math.sin(angle)*length;
    ctx.lineWidth = .5 + rand()*.8; ctx.lineCap = 'round';
    const a = (.035 + rand()*.055)*m.strength;
    for (const ox of [-TILE_SIZE, 0, TILE_SIZE]) for (const oy of [-TILE_SIZE, 0, TILE_SIZE]) {
      if (x+ox < -8 || x+ox > TILE_SIZE+8 || y+oy < -8 || y+oy > TILE_SIZE+8) continue;
      ctx.strokeStyle = `rgba(0,0,0,${a * m.darkStrength})`;
      ctx.beginPath(); ctx.moveTo(x+ox,y+oy); ctx.lineTo(x+ox+dx,y+oy+dy); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${a*1.3*m.lightStrength})`;
      ctx.beginPath(); ctx.moveTo(x+ox,y+oy-.7); ctx.lineTo(x+ox+dx,y+oy+dy-.7); ctx.stroke();
    }
  }
  ctx.restore();
}
export function paperTextureSource(material = 'cardstockClear') {
  const m = materialOf(material);
  const key = `${m.revision}:${m.pressed}:${m.strength}:${m.darkStrength}:${m.lightStrength}`;
  if (sourceCache.has(key)) return sourceCache.get(key);
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof ctx.stroke !== 'function') return null;
  paintPaperFibres(ctx, m);
  sourceCache.set(key, canvas);
  return canvas;
}

export function paperPatternFor(ctx, material = 'cardstockClear') {
  if (!ctx || typeof ctx.createPattern !== 'function') return null;
  const m = materialOf(material);
  let byMaterial = patternCache.get(ctx);
  if (!byMaterial) { byMaterial = new Map(); patternCache.set(ctx, byMaterial); }
  const key = `${m.id}:${m.revision}`;
  if (byMaterial.has(key)) return byMaterial.get(key);
  const source = paperTextureSource(m);
  const pattern = source ? anchorPaperPattern(ctx.createPattern(source, 'repeat')) : null;
  byMaterial.set(key, pattern);
  return pattern;
}

export function paperShadowPass(ctx, source, offset, color = 'rgba(15,23,36,0.10)') {
  ctx.save(); ctx.translate(offset.x, offset.y); ctx.fillStyle = color;
  if (typeof source === 'function') { source(); ctx.fill(); } else ctx.fill(source);
  ctx.restore();
}

export function paperFinishPass(ctx, source, pattern = null, options = {}) {
  ctx.save();
  if (pattern) {
    // The transparent fibre sheet composes over the flat colour exactly as
    // the approved study does, including on pale clouds.
    ctx.globalCompositeOperation = options.compositeOperation || PAPER_TEXTURE_BLEND;
    ctx.globalAlpha = options.alpha ?? 1;
    ctx.fillStyle = pattern;
    if (typeof source === 'function') { source(); ctx.fill(); } else ctx.fill(source);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (options.rim !== false) {
    ctx.strokeStyle = options.strokeStyle || 'rgba(255,255,255,0.24)';
    ctx.lineWidth = options.lineWidth || 1.15;
    if (typeof source === 'function') { source(); ctx.stroke(); } else ctx.stroke(source);
  }
  ctx.restore();
}

export function anchorPaperPattern(pattern, x = 0, y = 0) {
  if (!pattern || typeof pattern.setTransform !== 'function') return pattern;
  // Callers supply camera displacement. A world point is painted at worldX
  // minus cameraX, so the material origin must move left by that same amount.
  if (typeof DOMMatrix === 'function') pattern.setTransform(new DOMMatrix().translate(-x, -y).scale(PAPER_PATTERN_SCALE));
  return pattern;
}

export function clearPaperMaterialCaches() {
  sourceCache.clear(); patternCache = new WeakMap();
}

export const PAPER_TILE_SIZE = TILE_SIZE;
