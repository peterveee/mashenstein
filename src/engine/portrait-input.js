// Development portrait controls.  The geometry is expressed in CSS pixels,
// independently of the world camera, and the same returned rectangles/circles
// drive both the subtle control drawing and hit testing.

export const PORTRAIT_CONTROL_DIAMETERS = Object.freeze({
  // Action controls share the large touch target; pause is intentionally
  // smaller and quieter as a secondary control.
  jump: 88,
  slide: 88,
  use: 88,
  pause: 48,
  // The standalone portrait preview exposes the desktop rewind tape as a held
  // touch control. Production portrait gameplay never registers it; keeping
  // the geometry here lets the preview use the same hit-test path as the
  // other controls without teaching ordinary phone runs a new verb.
  rewind: 88,
});

// Keep the rewind target below the authored top breathing band. The safe inset
// protects the physical cutout; this margin protects the readable control from
// sitting against it.
export const PORTRAIT_CONTROL_TOP_CLEARANCE = 28;

// The pause disc's centre aligns with the portrait status HUD. Its smaller
// diameter means the top of the disc sits 14px into the authored breathing
// band, rather than merely lining up with the HUD panel's top edge.
export const PORTRAIT_PAUSE_TOP_OFFSET_CSS = 14;

// The discs are measured from the PHYSICAL bottom edge, not from the safe
// rectangle. The home-indicator inset is a place iOS asks you not to put
// anything it would be sad to lose a tap on — a thumb resting on a jump disc is
// not that, and holding the discs above the inset spent 34px of glass on a bar
// the player is already reaching past. Keep only a 2px authored gutter beyond
// the largest phone inset, so the action shelf hands the rest of that height
// back to the world.
// Clears the progress rail on the bottom edge AND the hero's power name, which
// hangs under the middle disc (see portraitHudLayout's powerLabelY). Measured
// from the physical bottom, like the rail.
export const PORTRAIT_CONTROL_BOTTOM_MARGIN = 36;

const radius = (id) => PORTRAIT_CONTROL_DIAMETERS[id] / 2;

function safeCss({ safe = {}, safeInsets = {} } = {}) {
  const src = safe?.css || safeInsets || safe || {};
  return {
    top: Math.max(0, Number(src.top) || 0),
    right: Math.max(0, Number(src.right) || 0),
    bottom: Math.max(0, Number(src.bottom) || 0),
    left: Math.max(0, Number(src.left) || 0),
  };
}

function circle(id, action, cx, cy) {
  return { id, action, cx, cy, r: radius(id), diameter: radius(id) * 2 };
}

function rect(id, action, x, y, width, height) {
  return { id, action, x, y, width, height };
}

/**
 * Resolve portrait controls for a CSS viewport. The frequent actions own broad
 * lower-half zones; explicit controls are tested first. `includeRewind` is a
 * preview-only opt-in so the standalone preview keeps its four controls.
 */
export function portraitTouchLayout({
  viewportWidth = 390,
  viewportHeight = 844,
  safe = {},
  safeInsets = {},
  revision = 0,
  includeRewind = false,
} = {}) {
  const vw = Math.max(1, Number(viewportWidth) || 390);
  const vh = Math.max(1, Number(viewportHeight) || 844);
  const inset = safeCss({ safe, safeInsets });
  const left = inset.left + radius('jump') + 10;
  const right = vw - inset.right - radius('slide') - 10;
  const controlY = vh - radius('jump') - PORTRAIT_CONTROL_BOTTOM_MARGIN;
  const pauseX = vw - inset.right - radius('pause') - 8;
  const pauseY = inset.top + radius('pause') + PORTRAIT_PAUSE_TOP_OFFSET_CSS;
  const rewindX = inset.left + radius('rewind') + 10;
  const rewindY = inset.top + radius('rewind') + PORTRAIT_CONTROL_TOP_CLEARANCE;
  const half = vw / 2;
  const zoneTop = Math.min(vh - 1, Math.max(inset.top + 96, vh * 0.56));
  // The gesture zones follow the discs down to the glass: a thumb that lands
  // below the safe line is still a thumb on the playfield.
  const zoneBottom = Math.max(zoneTop, vh);
  const controls = {
    jump: circle('jump', 'jump', left, controlY),
    slide: circle('slide', 'slide', right, controlY),
    use: circle('use', 'ability', vw / 2, controlY),
    pause: circle('pause', 'escape', pauseX, pauseY),
  };
  if (includeRewind) controls.rewind = circle('rewind', 'left', rewindX, rewindY);
  const zones = [
    rect('jump-zone', 'jump', 0, zoneTop, half, zoneBottom - zoneTop),
    rect('slide-zone', 'slide', half, zoneTop, vw - half, zoneBottom - zoneTop),
  ];
  return {
    viewport: { width: vw, height: vh },
    safe: inset,
    controls,
    zones,
    revision: Number.isFinite(revision) ? revision : 0,
  };
}

function insideCircle(c, x, y, slop = 0) {
  const r = c.r + Math.max(0, slop);
  return (x - c.cx) ** 2 + (y - c.cy) ** 2 <= r ** 2;
}

function insideRect(r, x, y) {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

export function portraitHitTest(layout, x, y, slop = 6) {
  if (!layout) return null;
  // Explicit controls always win when a broad thumb zone overlaps them.
  for (const id of ['pause', 'rewind', 'use', 'jump', 'slide']) {
    const c = layout.controls?.[id];
    if (c && insideCircle(c, x, y, slop)) return c;
  }
  for (const z of layout.zones || []) if (insideRect(z, x, y)) return z;
  return null;
}

export function clearPortraitInput(active = new Map()) {
  const released = [...active.values()];
  active.clear();
  return released;
}

/**
 * Small DOM adapter used only by portrait-preview.html. It intentionally does
 * not import the gameplay Input singleton: callers decide how an action press
 * maps into their active state, while this adapter owns pointer cancellation
 * and resize invalidation.
 */
export class PortraitInputSurface {
  constructor(target, options = {}) {
    this.target = target;
    this.layout = options.layout || portraitTouchLayout(options);
    this.onPress = typeof options.onPress === 'function' ? options.onPress : () => {};
    this.onRelease = typeof options.onRelease === 'function' ? options.onRelease : () => {};
    this.active = new Map();
    this.bound = [];
    if (target?.addEventListener) this.bind();
  }

  bind() {
    const down = (event) => {
      const point = this.point(event);
      const hit = portraitHitTest(this.layout, point.x, point.y);
      if (!hit || this.active.has(event.pointerId)) return;
      this.active.set(event.pointerId, hit.action);
      try { this.target.setPointerCapture?.(event.pointerId); } catch (e) { /* optional */ }
      this.onPress(hit.action, event, hit);
      event.preventDefault?.();
    };
    const up = (event) => {
      if (!this.active.has(event.pointerId)) return;
      const action = this.active.get(event.pointerId);
      this.active.delete(event.pointerId);
      this.onRelease(action, event);
      event.preventDefault?.();
    };
    const cancel = (event) => {
      if (!this.active.has(event.pointerId)) return;
      const action = this.active.get(event.pointerId);
      this.active.delete(event.pointerId);
      this.onRelease(action, event);
    };
    this.target.addEventListener('pointerdown', down, { passive: false });
    this.target.addEventListener('pointerup', up, { passive: false });
    this.target.addEventListener('pointercancel', cancel, { passive: false });
    this.target.addEventListener('lostpointercapture', cancel, { passive: false });
    this.bound = [['pointerdown', down], ['pointerup', up], ['pointercancel', cancel], ['lostpointercapture', cancel]];
  }

  point(event) {
    const rect = this.target.getBoundingClientRect?.() || { left: 0, top: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  resize(options = {}) {
    for (const action of clearPortraitInput(this.active)) this.onRelease(action, { type: 'resize' });
    this.layout = portraitTouchLayout({ ...options, revision: (this.layout.revision || 0) + 1 });
    return this.layout;
  }

  destroy() {
    for (const [type, handler] of this.bound) this.target?.removeEventListener?.(type, handler);
    for (const action of clearPortraitInput(this.active)) this.onRelease(action, { type: 'destroy' });
    this.bound = [];
  }
}
