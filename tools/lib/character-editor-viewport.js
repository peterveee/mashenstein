// Geometry for the character editor canvases. The renderer receives one
// logical height and the browser receives one CSS size; neither axis is ever
// scaled independently, so a character cannot be stretched by the layout.
export const VIEWPORT_DEFAULTS = Object.freeze({
  densityMax: 3,
  padding: 18,
  envelopeW: 1.25,
  envelopeH: 1.1,
});

const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback) => Math.max(1, finite(value, fallback));

export function measureViewport({
  width = 1,
  height = 1,
  dpr = 1,
  zoom = 1,
  padding = VIEWPORT_DEFAULTS.padding,
  envelopeW = VIEWPORT_DEFAULTS.envelopeW,
  envelopeH = VIEWPORT_DEFAULTS.envelopeH,
  densityMax = VIEWPORT_DEFAULTS.densityMax,
} = {}) {
  const cssW = positive(width, 1);
  const cssH = positive(height, 1);
  const pad = Math.max(0, finite(padding, VIEWPORT_DEFAULTS.padding));
  const envW = positive(envelopeW, VIEWPORT_DEFAULTS.envelopeW);
  const envH = positive(envelopeH, VIEWPORT_DEFAULTS.envelopeH);
  const density = Math.max(1, Math.min(Math.max(1, finite(densityMax, 3)), finite(dpr, 1)));
  const requestedZoom = Math.max(.25, Math.min(4, finite(zoom, 1)));
  const fitW = Math.max(1, (cssW - pad * 2) / envW);
  const fitH = Math.max(1, (cssH - pad * 2) / envH);
  const drawH = Math.max(1, Math.floor(Math.min(fitW, fitH) * requestedZoom));
  return {
    cssW, cssH, density, drawH, zoom: requestedZoom,
    backingW: Math.max(1, Math.round(cssW * density)),
    backingH: Math.max(1, Math.round(cssH * density)),
  };
}

export function aspectRatio(viewport) {
  return viewport?.cssH ? viewport.cssW / viewport.cssH : 1;
}
