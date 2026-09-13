// Shared paper tiles are deterministic, low contrast and cached. Keep this
// browserless so a material regression is caught before visual review.
let made = 0;
globalThis.document = {
  getElementById() { return null; },
  createElement() {
    const canvas = { width: 0, height: 0, data: null };
    canvas.getContext = () => ({
      save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    });
    made++;
    return canvas;
  },
};
globalThis.window = { location: { search: '' } };

const {
  PAPER_MATERIALS,
  PAPER_TEXTURE_BLEND,
  PAPER_TEXTURE_SPEED_DEFAULT,
  PAPER_EFFECT_STRENGTH,
  PAPER_SKY_STRENGTH,
  PAPER_SCENERY_STRENGTH,
  PAPER_GROUND_STRENGTH,
  PAPER_TILE_SIZE,
  paperTextureSource,
  paperPatternFor,
  paperTextureSpeedOf,
  paperTextureCameraX,
  paperStrengthOf,
  paperStrengthsOf,
} =
  await import('../src/engine/paper-material.js');
let failed = false;
function assert(condition, message) {
  if (!condition) { console.error('FAIL:', message); failed = true; }
  else console.log('ok:', message);
}

assert(PAPER_TEXTURE_BLEND === 'source-over', 'fibre pairs compose on pale and dark palettes');
assert(PAPER_TEXTURE_SPEED_DEFAULT === 0.5 && paperTextureSpeedOf() === 0.5
  && paperTextureSpeedOf(0.5) === 0.5 && paperTextureSpeedOf(-1) === 0
  && paperTextureSpeedOf(9) === 1.25 && paperTextureCameraX(80, 0.5) === 40,
  'paper motion bakeoff speed is clamped and scales only the texture camera');
const quietSurfaces = paperStrengthsOf({ paperSkyStrength: 0.6, paperGroundStrength: 0.65 });
assert(PAPER_EFFECT_STRENGTH === 1 && PAPER_SKY_STRENGTH === 1
  && PAPER_SCENERY_STRENGTH === 1 && PAPER_GROUND_STRENGTH === 1
  && paperStrengthOf(-1) === 0 && paperStrengthOf(9) === 1.25
  && quietSurfaces.sky === 0.6 && quietSurfaces.scenery === 1
  && quietSurfaces.ground === 0.65,
  'paper surface strengths are independent, clamped, and neutral by default');
const skyA = paperTextureSource('skySmooth');
const skyB = paperTextureSource('skySmooth');
const soft = paperTextureSource('cardstockSoft');
const quiet = paperTextureSource('cardstockQuiet');
const clear = paperTextureSource('cardstockClear');
assert(skyA === skyB && skyA === soft && quiet !== soft,
  'identical approved recipes share one cached source; quiet stays separate');
assert(clear !== soft && PAPER_MATERIALS.cardstockClear.darkStrength === 0.82
  && PAPER_MATERIALS.cardstockClear.lightStrength === 1,
  'clear candidate keeps the fibre recipe but lifts its dark impression subtly');
assert(skyA.width === PAPER_TILE_SIZE && skyA.height === PAPER_TILE_SIZE,
  'material backing covers its full declared tile');
const patternCtx = { createPattern(source, mode) { return { source, mode }; } };
assert(paperPatternFor(patternCtx, 'skySmooth') === paperPatternFor(patternCtx, 'skySmooth'),
  'patterns are cached per rendering context and material');
assert(made >= 2, 'material sources are lazily baked on first use');
const styleModule = await import('../src/engine/stylePacks/index.js');
const frostPreview = styleModule.getStylePack('pixel', {
  paperCabinet: 'frost', paperPreset: 'cardstockQuiet', paperCutout: true,
});
assert(frostPreview.paperSlab?.paper && frostPreview.paperSlab.material.id === 'cardstockQuiet',
  'non-Plumber paper previews inject the shared route material without enabling it in stage data');
assert(typeof frostPreview.paperSlab.contact === 'function',
  'paper slabs expose a restrained contact shadow pass');
const shadowTranslations = [];
const shadowCtx = {
  save() {}, restore() {}, fill() {},
  translate(...args) { shadowTranslations.push(args); },
};
frostPreview.paperSlab.shadow(shadowCtx, () => {}, { subtle: true });
frostPreview.paperSlab.contact(shadowCtx, () => {}, { subtle: true });
assert(shadowTranslations.some(([x, y]) => x === 1 && y === 2)
  && shadowTranslations.some(([x, y]) => x === 0.35 && y === 0.75),
  'cloud and island shadows use the close, subtle offset pair');
const frostWatercolor = styleModule.getStylePack('watercolor', {
  paperPreset: 'cardstockSoft', paperCutout: true,
});
const speedClear = styleModule.getStylePack('faux3d', {
  paperPreset: 'cardstockClear', paperCutout: true,
});
const plumberClear = styleModule.getStylePack('pixel', {
  paperCabinet: 'plumber', paperPreset: 'cardstockClear', paperCutout: true,
});
const plumberDefault = styleModule.getStylePack('pixel', {
  paperCabinet: 'plumber', paperCutout: true,
});
const plumberQuietSurfaces = styleModule.getStylePack('pixel', {
  paperCabinet: 'plumber', paperPreset: 'cardstockClear', paperCutout: true,
  paperSkyStrength: 0.6, paperGroundStrength: 0.65,
});
const plumberSlow = styleModule.getStylePack('pixel', {
  paperCabinet: 'plumber', paperPreset: 'cardstockClear', paperCutout: true,
  paperTextureSpeed: 0.75,
});
const speedSlow = styleModule.getStylePack('faux3d', {
  paperCabinet: 'speed', paperPreset: 'cardstockClear', paperCutout: true,
  paperTextureSpeed: 0.35,
});
const speedDefault = styleModule.getStylePack('faux3d', {
  paperCabinet: 'speed', paperPreset: 'cardstockClear', paperCutout: true,
});
const speedQuietSurfaces = styleModule.getStylePack('faux3d', {
  paperCabinet: 'speed', paperPreset: 'cardstockClear', paperCutout: true,
  paperSkyStrength: 0.6, paperGroundStrength: 0.65,
});
const cardboardPreview = styleModule.getStylePack('cardboard', {
  paperPreset: 'cardstockQuiet', paperCutout: true,
});
assert(frostWatercolor.paperSlab?.material?.id === 'cardstockSoft'
  && speedClear.paperSlab?.material?.id === 'cardstockClear'
  && plumberClear.paperSlab?.material?.id === 'cardstockClear'
  && plumberDefault.paperSlab?.material?.id === 'cardstockClear'
  && plumberDefault.paperSlab?.textureSpeed === 0.5
  && plumberQuietSurfaces.paperSlab?.groundStrength === 0.65
  && plumberSlow.paperSlab?.textureSpeed === 0.75
  && speedSlow.paperSlab?.textureSpeed === 0.35
  && speedDefault.paperSlab?.textureSpeed === 0.5
  && speedQuietSurfaces.paperSlab?.groundStrength === 0.65
  && cardboardPreview.paperSlab?.material?.id === 'cardstockQuiet',
  'clear material is active by default and paper motion speed routes through both packs');
const explicitlyOff = styleModule.getStylePack('pixel', {
  paperCabinet: 'frost', paperPreset: 'cardstockQuiet', paperCutout: false,
});
assert(explicitlyOff.paperSlab == null, 'explicit paper-off overrides a preview preset');
const { anchorPaperPattern } = await import('../src/engine/paper-material.js');
globalThis.DOMMatrix = class {
  translate(x, y) { this.e = x; this.f = y; return this; }
  scale(s) { this.a = s; this.d = s; return this; }
};
let origin;
const anchored = { setTransform(matrix) { origin = matrix; } };
const phases = [0, 0.25, 13.75].map(camera => {
  anchorPaperPattern(anchored, camera, 0);
  return ((100 - camera) - origin.e)/origin.a;
});
assert(phases.every(phase => phase === 200),
  'a fixed world point samples the same texture during fractional camera travel');
console.log(failed ? 'PAPER MATERIAL: FAILED' : 'PAPER MATERIAL: PASSED');
process.exit(failed ? 1 : 0);
