// Normalised scenery composition and camera-depth rules.  Packs may retain
// their own art vocabulary, but they all receive these same bands and depth
// coefficients so a tall frame is composed deliberately rather than patched
// with cabinet-specific pixel nudges.

export const SCENERY_BANDS = Object.freeze({
  // Portrait profile: the sky begins immediately below the permanent status HUD.
  // Celestial art owns the top, upper clouds overlap it just below, and the
  // landmark/near layers are lifted so a tall phone is populated instead of
  // exposing a featureless lower sky. These are normalized to the scenery
  // rectangle, not the whole safe frame.
  celestial: [0.00, 0.14],
  upperCloud: [0.10, 0.27],
  middleCloud: [0.32, 0.48],
  lowerCloud: [0.50, 0.62],
  birds: [0.25, 0.50],
  farLandmark: [0.24, 0.44],
  middle: [0.48, 0.68],
  near: [0.60, 0.82],
});

// Horizontal rates already present in the cabinets are the starting depth
// values.  The same number is used vertically by backgroundParallaxOffset so
// an object cannot drift at two incompatible speeds in x and y.
export const BACKGROUND_DEPTHS = Object.freeze({
  celestial: 0,
  stars: 0.05,
  landmark: 0.09,
  far: 0.15,
  clouds: 0.20,
  middle: 0.30,
  near: 0.35,
  attachedNear: 0.35,
  screen: 1,
});

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function band(rect, range) {
  const a = rect.top + rect.height * range[0];
  const b = rect.top + rect.height * range[1];
  return Object.freeze({ top: a, bottom: b, height: b - a, center: (a + b) / 2 });
}

// ONE SLOT, AND EVERY OUTPUT IS ALREADY FROZEN.
//
// The run calls this once per frame in portrait (and not at all in landscape),
// and it builds about twenty fresh frozen objects each time — two
// Object.fromEntries passes over the band table plus the rects. None of its
// inputs move between frames: the presentation frame is one retained object
// replaced only by a resize, portraitHudLayout is memoised on its own revision
// key, and the zoom and band table belong to the cabinet. So the whole thing is
// recomputed sixty times a second to produce the same answer, and the garbage is
// the kind that shows up as an occasional deep frame rather than a slow one.
//
// Identity comparison is the right test precisely because every result here is
// Object.freeze'd: nothing can mutate a band table behind the cache and have the
// stale layout survive. A caller that passes a fresh bands object each time
// simply misses, which is the honest outcome — the shipped path does not.
// Same shape as portraitHudLayout's cache, deliberately.
let cachedInput = null;
let cachedLayout = null;

/**
 * Resolve both screen-space and pack-local scenery coordinates.  `groundY` is
 * the authored local groundline (232 in the shipped packs); the frame's
 * groundScreenY can be much lower on portrait phones.
 */
export function resolveSceneryLayout({
  frame = null,
  hud = null,
  groundY = 232,
  // When the background pass is enlarged to preserve landscape physical
  // scale, its local coordinates are compressed before the canvas transform.
  // That keeps the authored portrait bands on screen while the art inside
  // them grows; otherwise a ground-centred scale would throw the celestial
  // band off the top of a tall phone.
  backgroundZoom = 1,
  // The authored band table for this cabinet/stage. Defaults to the shipped
  // profile, so every caller that does not compose deliberately still gets
  // exactly the shipped composition.
  bands: authored = SCENERY_BANDS,
} = {}) {
  if (cachedLayout && cachedInput
    && cachedInput.frame === frame && cachedInput.hud === hud
    && cachedInput.groundY === groundY
    && cachedInput.backgroundZoom === backgroundZoom
    && cachedInput.authored === authored) return cachedLayout;
  const bands = authored || SCENERY_BANDS;
  const f = frame || {};
  const safe = f.safeRect || { top: 0, bottom: f.height || 270 };
  const top = Math.max(Number(safe.top) || 0,
    Number(hud?.sceneryTop) || Number(safe.top) || 0);
  const bottom = Math.max(top, Number(f.groundScreenY) || groundY);
  const screenRect = Object.freeze({ top, bottom, height: bottom - top });
  const shift = bottom - groundY;
  const zoom = Number.isFinite(Number(backgroundZoom)) && Number(backgroundZoom) > 0
    ? Number(backgroundZoom) : 1;
  const localHeight = screenRect.height / zoom;
  const localRect = Object.freeze({
    top: groundY - localHeight,
    bottom: groundY,
    height: Math.max(0, localHeight),
  });
  const screenBands = Object.fromEntries(Object.entries(bands)
    .map(([name, range]) => [name, band(screenRect, range)]));
  const localBands = Object.fromEntries(Object.entries(bands)
    .map(([name, range]) => [name, band(localRect, range)]));
  cachedLayout = Object.freeze({
    profileBands: bands,
    screenRect,
    localRect,
    screenBands: Object.freeze(screenBands),
    bands: Object.freeze(localBands),
    cameraReferenceY: shift,
  });
  cachedInput = { frame, hud, groundY, backgroundZoom, authored };
  return cachedLayout;
}

export function backgroundDepth(layer) {
  return Number.isFinite(Number(BACKGROUND_DEPTHS[layer]))
    ? BACKGROUND_DEPTHS[layer] : BACKGROUND_DEPTHS.screen;
}

/**
 * The background painter is called under a full `cameraShiftY` translate.
 * Return the local compensation needed for a layer whose final motion should
 * be `depth` of that translate.  At depth 0 (celestial) this is `-shift`; at
 * depth 1 (screen-fixed art) it is zero.
 */
export function backgroundParallaxOffset(cameraShiftY, layerOrDepth) {
  const shift = Number.isFinite(Number(cameraShiftY)) ? Number(cameraShiftY) : 0;
  const depth = typeof layerOrDepth === 'string'
    ? backgroundDepth(layerOrDepth) : clamp(Number(layerOrDepth), 0, 1);
  return (depth - 1) * shift;
}
