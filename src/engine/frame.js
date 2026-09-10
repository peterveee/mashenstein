// Presentation frame geometry shared by the renderer, camera and development
// previews.  The simulation still owns the authored 480px world; this module
// only describes the logical surface that the world is presented through.

export const FRAME_WIDTH = 480;
export const LANDSCAPE_HEIGHT = 270;
export const PHONE_PORTRAIT = 'phone-portrait';
export const LANDSCAPE = 'landscape';

const DEFAULT_FRAME = Object.freeze({
  mode: LANDSCAPE,
  width: FRAME_WIDTH,
  height: LANDSCAPE_HEIGHT,
  scale: 1,
  safeRect: Object.freeze({ left: 0, top: 0, right: FRAME_WIDTH, bottom: LANDSCAPE_HEIGHT,
    width: FRAME_WIDTH, height: LANDSCAPE_HEIGHT }),
  groundScreenY: 232,
  revision: 0,
});

let activeFrame = DEFAULT_FRAME;

function finitePositive(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function insetsOf(raw) {
  const insets = raw || {};
  return {
    top: Math.max(0, Number(insets.top) || 0),
    right: Math.max(0, Number(insets.right) || 0),
    bottom: Math.max(0, Number(insets.bottom) || 0),
    left: Math.max(0, Number(insets.left) || 0),
  };
}

/**
 * Resolve a logical presentation frame from a CSS viewport.
 *
 * `scale` is CSS pixels per logical pixel.  Phone portrait keeps the shipped
 * 480px world width and derives its logical height from the viewport aspect,
 * so circles and world objects retain one uniform XY scale.
 */
export function frameForViewport({
  mode = LANDSCAPE,
  viewportWidth = FRAME_WIDTH,
  viewportHeight = LANDSCAPE_HEIGHT,
  safeInsets = {},
  safe = null,
  groundAnchorRatio = 0.62,
  revision = 0,
} = {}) {
  const vw = finitePositive(Number(viewportWidth), FRAME_WIDTH);
  const vh = finitePositive(Number(viewportHeight), LANDSCAPE_HEIGHT);
  const phone = mode === PHONE_PORTRAIT || mode === 'portrait';
  const width = FRAME_WIDTH;
  const height = phone ? vh * width / vw : LANDSCAPE_HEIGHT;
  const scale = Math.min(vw / width, vh / height);
  const cssInsets = insetsOf(safe || safeInsets);
  const left = Math.max(0, cssInsets.left / scale);
  const top = Math.max(0, cssInsets.top / scale);
  const right = Math.min(width, width - Math.max(0, cssInsets.right / scale));
  const bottom = Math.min(height, height - Math.max(0, cssInsets.bottom / scale));
  return {
    mode: phone ? PHONE_PORTRAIT : LANDSCAPE,
    width,
    height,
    scale,
    safeRect: {
      left, top, right, bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      css: cssInsets,
    },
    // The legacy landscape anchor is preserved exactly. Portrait places the
    // authored groundline inside the usable safe rectangle. The ratio is a
    // camera/presentation choice only; terrain and physics remain unchanged.
    groundScreenY: phone
      ? top + Math.max(0.55, Math.min(0.75, Number.isFinite(Number(groundAnchorRatio)) ? Number(groundAnchorRatio) : 0.62)) * Math.max(0, bottom - top)
      : 232,
    revision: Number.isFinite(revision) ? revision : 0,
  };
}

export function defaultFrame() { return DEFAULT_FRAME; }
export function getActiveFrame() { return activeFrame; }

export function setActiveFrame(frame) {
  if (!frame || frame.width !== FRAME_WIDTH || !Number.isFinite(frame.height)
    || frame.height <= 0 || !Number.isFinite(frame.scale) || frame.scale <= 0
    || !Number.isFinite(frame.groundScreenY)) {
    throw new TypeError('invalid presentation frame');
  }
  activeFrame = frame;
  return activeFrame;
}

// CSS/UI conversion is deliberately separate from world camera conversion.
// UI coordinates are CSS pixels and never inherit a camera zoom.
export function cssToLogical(frame, cssX, cssY, { left = 0, top = 0 } = {}) {
  const f = frame || activeFrame;
  return { x: (cssX - left) / f.scale, y: (cssY - top) / f.scale };
}

export function logicalToCss(frame, x, y, { left = 0, top = 0 } = {}) {
  const f = frame || activeFrame;
  return { x: left + x * f.scale, y: top + y * f.scale };
}

/**
 * Build a world camera in the same form used by the renderer transform.
 * `bounds` are world units, `scale` is world-to-logical uniform scale, and
 * `tx`/`ty` are logical-unit translations.
 */
export function cameraForFrame({
  frame = activeFrame,
  camX = 0,
  zoom = 1,
  pan = 0,
  floorY = 232,
} = {}) {
  const f = frame || activeFrame;
  const z = finitePositive(Number(zoom), 1);
  const left = Number.isFinite(camX) ? camX : 0;
  const anchorTop = (Number.isFinite(floorY) ? floorY : 232) - f.groundScreenY / z;
  const verticalPan = Number.isFinite(pan) ? pan : 0;
  const bounds = {
    left,
    // Bounds are the world rectangle actually visible after the same
    // translation returned below. Positive pan moves the viewport down by
    // `pan / z` world units, so the reported top/bottom must move with it.
    top: anchorTop - verticalPan / z,
    right: left + f.width / z,
    bottom: anchorTop + (f.height - verticalPan) / z,
    width: f.width / z,
    height: f.height / z,
  };
  return {
    bounds,
    scale: z,
    tx: -left * z,
    ty: -anchorTop * z + verticalPan,
    frameRevision: f.revision,
  };
}

export function worldToLogical(camera, x, y) {
  return {
    x: x * camera.scale + camera.tx,
    y: y * camera.scale + camera.ty,
  };
}

export function logicalToWorld(camera, x, y) {
  return {
    x: (x - camera.tx) / camera.scale,
    y: (y - camera.ty) / camera.scale,
  };
}

export function frameGroundY(frame = activeFrame) {
  return frame.groundScreenY;
}
