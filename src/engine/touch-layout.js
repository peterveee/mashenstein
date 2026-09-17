// TOUCH CHROME LAYOUT — where the on-screen controls go, decided in one place.
//
// Landscape touch has one broad default: a tap or hold in the playfield is a
// JUMP. SLIDE and POWER are explicit rail controls, or the established
// down/right swipes. That keeps a thumb in the action instead of making an
// invisible left/right seam decide which move happened.
//
// The rail follows the display cutout. If the notch/Dynamic Island is on the
// left, PAUSE is the only visible control on the upper-left rail and
// JUMP/POWER/SLIDE are spread down the right rail. A rotated device reverses
// those rails. Each control is centered in its side margin when the margin can
// hold it; otherwise it uses the safe/physical edge and can sit over the level.
// The action rail's compressed vertical band stays clear of rounded corners.
// Each nearby touch zone follows the same boundary so the visible control and
// its hit area remain one thing.
//
// Pure and DOM-free: renderer.js feeds this module the fit and orientation on
// every settled resize, and tests/touch-layout.js feeds it real geometries.
//

// The picture's logical size. Not imported from renderer.js, which imports this
// module — and a layout that only ever sees a fit has no other use for it.
const LOGICAL_W = 480;
const LOGICAL_H = 270;

// The run's four discs and the food court's two. The cx/cy values remain the
// legacy logical fallback; landscape resolves positions from the viewport.
// r is a radius; 22 makes a 44-logical disc, which lands at ~61 CSS px on the
// smallest phone and ~108 on an iPad — past the 44pt a thumb needs everywhere.
// Landscape action controls get a little more breathing room than the legacy
// portrait fallback: they are the three primary run actions and share a rail.
export const TOUCH_DISCS = [
  // Radii are shared by the responsive landscape rail and the legacy portrait
  // fallback below. Landscape positions are resolved from the viewport.
  { id: 'jump',    action: 'jump',    cx: 40,  cy: 207, r: 22 },
  { id: 'slide',    action: 'slide',    cx: 450, cy: 207, r: 22 },
  { id: 'ability', action: 'ability', cx: 450, cy: 133, r: 22 },
  // The smaller pause disc sits on the top HUD row, with its 32px diameter
  // just touching the top edge of the picture.
  { id: 'pause',   action: 'escape',  cx: 450, cy: 19,  r: 16 },
];
// The food court's arrows sit in the FOOTER BAND, below the floor line at
// logical y 212 (HUB_FLOOR_PIN_Y) — not on the floor itself, where they stood
// over the cast and the cabinet fronts. 240 clears the skirting by 6 and leaves
// 8 under the disc; the trophy room reads the same list, so both rooms put the
// arrows in exactly the same place.
export const HUB_DISCS = [
  { id: 'hubLeft',  action: 'left',  cx: 40,  cy: 240, r: 22 },
  { id: 'hubRight', action: 'right', cx: 450, cy: 240, r: 22 },
];
// CSS px a thumb may land outside a disc and still be on it (input.js).
export const DISC_SLOP = 6;
// A margin thinner than this is fit rounding, not a place for a zone: on a
// near-16:9 device the picture can leave a 1px sliver on one side.
export const MARGIN_MIN = 2;
// Leave a small breathing edge around the safe-side pause disc. The six pixels
// keep it from living on a notch or rounded corner's last usable pixel; the
// action rail has its own central-band corner clearance and reaches the edge.
const RAIL_PAD = 6;
// The action rail is deliberately allowed to touch the viewport edge. Its
// compressed vertical band stays away from the rounded corners, so the only
// horizontal obstruction we need to honour there is the canvas boundary.
const EDGE_PAD = 0;
// Keep the action rail out of the top/bottom HUD shoulders. At 15% of the
// usable vertical range the three controls remain comfortably separated by
// their hit zones, but no longer span from the top HUD to the bottom HUD.
const RAIL_SPREAD_INSET = 0.15;
const LANDSCAPE_ACTION_R = 24;
// The rectangular hit zone is deliberately larger than the visible disc. It
// is clipped to the safe area for PAUSE and to the viewport for the edge rail,
// then allowed to overlap the picture around its own control.
const ZONE_PAD = 12;
// The food court's arrows prefer the margin when there is one wide enough to
// hold a disc clear of the reported inset — this much air past the inset and
// past the screen edge.
const HUB_PILLAR_PAD = 8;

// The fit renderer.js computes for a viewport, restated for callers that have
// no renderer (tests, tools): a uniform scale, the picture centred, offsets
// floored exactly as resize() floors them.
export function fitFor(vw, vh, safe = {}, orientation = {}) {
  const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
  const cssW = Math.round(LOGICAL_W * scale), cssH = Math.round(LOGICAL_H * scale);
  const orientationAngle = orientation?.orientationAngle ?? orientation?.angle ?? null;
  const orientationType = orientation?.orientationType ?? orientation?.type ?? null;
  return {
    vw, vh, scale, cssW, cssH,
    ox: Math.floor((vw - cssW) / 2), oy: Math.floor((vh - cssH) / 2),
    safe: { top: safe.top || 0, right: safe.right || 0, bottom: safe.bottom || 0, left: safe.left || 0 },
    orientationAngle, orientationType,
  };
}

function positive(n) { return Math.max(0, Number(n) || 0); }

function normalAngle(value) {
  const angle = Number(value);
  if (!Number.isFinite(angle)) return null;
  return ((angle % 360) + 360) % 360;
}

/**
 * Resolve the side occupied by a landscape cutout.
 *
 * Asymmetric safe insets are the strongest signal. Some iOS landscape builds
 * report the Dynamic Island's depth on both horizontal sides, so use the
 * physical orientation angle next. On WebKit, +90 means the device was turned
 * left and its portrait top/notch edge is now on the left; -90/270 puts it on
 * the right. The primary/secondary type is only a fallback, and a browser
 * without either signal uses the screenshot's notch-left starting posture.
 */
export function landscapeControlSide({ safe = {}, orientationAngle = null, orientationType = null } = {}) {
  const left = positive(safe.left), right = positive(safe.right);
  if (left > right + 1) return 'left';
  if (right > left + 1) return 'right';

  // The angle describes the physical rotation. The platform is allowed to
  // choose which physical rotation it calls "primary", so prefer it whenever
  // it is available and use the type only as a fallback.
  const angle = normalAngle(orientationAngle);
  if (angle === 90) return 'left';
  if (angle === 270) return 'right';

  const type = String(orientationType || '').toLowerCase();
  if (type.includes('landscape-primary')) return 'left';
  if (type.includes('landscape-secondary')) return 'right';
  return 'left';
}

// The four margins around the picture, with rounding slivers zeroed.
function margins(fit) {
  const keep = (n) => (n >= MARGIN_MIN ? n : 0);
  return {
    left: keep(fit.ox),
    right: keep(fit.vw - fit.ox - fit.cssW),
    top: keep(fit.oy),
    bottom: keep(fit.vh - fit.oy - fit.cssH),
  };
}

const disc = (d, fit) => ({
  id: d.id, action: d.action,
  x: fit.ox + d.cx * fit.scale, y: fit.oy + d.cy * fit.scale, r: d.r * fit.scale,
});
const zone = (id, action, x, y, w, h) => ({ id: `zone:${id}`, action, zone: { x, y, w, h } });

function clamp(value, min, max) {
  if (max < min) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function xRange(fit, r, respectSafe) {
  const safe = fit.safe || {};
  const left = respectSafe ? positive(safe.left) : 0;
  const right = respectSafe ? positive(safe.right) : 0;
  const pad = respectSafe ? RAIL_PAD : EDGE_PAD;
  return {
    min: Math.max(r + pad, left + r + pad),
    max: Math.min(fit.vw - r - pad, fit.vw - right - r - pad),
  };
}

function railPlacement(fit, side, r, respectSafe = true) {
  const frameEdge = side === 'left' ? fit.ox : fit.ox + fit.cssW;
  const margin = side === 'left' ? fit.ox : fit.vw - frameEdge;
  // The letterbox is real touch territory, not dead layout: if the control
  // fits there, centering it keeps the glass off the level and clear of HUD
  // shoulders. Only the fallback needs the safe-area/edge clamp.
  if (margin >= r * 2 + EDGE_PAD * 2) {
    return {
      x: side === 'left' ? margin / 2 : frameEdge + margin / 2,
      inMargin: true,
    };
  }
  const target = respectSafe
    ? (side === 'left' ? frameEdge - r - RAIL_PAD : frameEdge + r + RAIL_PAD)
    : (side === 'left' ? r + EDGE_PAD : fit.vw - r - EDGE_PAD);
  const range = xRange(fit, r, respectSafe);
  return { x: clamp(target, range.min, range.max), inMargin: false };
}

function safeYRange(fit, r) {
  const safe = fit.safe || {};
  return {
    min: Math.max(r + RAIL_PAD, positive(safe.top) + r + RAIL_PAD),
    max: Math.min(fit.vh - r - RAIL_PAD, fit.vh - positive(safe.bottom) - r - RAIL_PAD),
  };
}

function spread(min, max, count) {
  if (count <= 1) return [(min + max) / 2];
  return Array.from({ length: count }, (_, i) => min + (max - min) * i / (count - 1));
}

function insetRange(range, fraction) {
  const inset = Math.max(0, range.max - range.min) * fraction;
  return { min: range.min + inset, max: range.max - inset };
}

function clippedControlZone(id, action, b, fit, respectSafe) {
  const safe = fit.safe || {};
  const leftBound = respectSafe ? positive(safe.left) : 0;
  const rightBound = respectSafe ? fit.vw - positive(safe.right) : fit.vw;
  const left = Math.max(leftBound, b.x - b.r - ZONE_PAD);
  const right = Math.min(rightBound, b.x + b.r + ZONE_PAD);
  const top = Math.max(positive(safe.top), b.y - b.r - ZONE_PAD);
  const bottom = Math.min(fit.vh - positive(safe.bottom), b.y + b.r + ZONE_PAD);
  return zone(id, action, left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

function landscapeRunList(fit, hasPower) {
  const notchSide = landscapeControlSide(fit);
  const actionSide = notchSide === 'left' ? 'right' : 'left';
  const pauseR = TOUCH_DISCS.find((d) => d.id === 'pause').r * fit.scale;
  const actionR = LANDSCAPE_ACTION_R * fit.scale;
  const pauseY = safeYRange(fit, pauseR).min;
  const actionRange = insetRange(safeYRange(fit, actionR), RAIL_SPREAD_INSET);
  const actions = hasPower
    ? [['jump', 'jump'], ['ability', 'ability'], ['slide', 'slide']]
    : [['jump', 'jump'], ['slide', 'slide']];
  const actionY = spread(actionRange.min, actionRange.max, actions.length);
  const pausePlacement = railPlacement(fit, notchSide, pauseR);
  const actionPlacement = railPlacement(fit, actionSide, actionR, false);
  const discs = [{
    id: 'pause', action: 'escape',
    x: pausePlacement.x, y: pauseY, r: pauseR, railInMargin: pausePlacement.inMargin,
  }];
  actions.forEach(([id, action], i) => discs.push({
    id, action, x: actionPlacement.x, y: actionY[i], r: actionR,
    railInMargin: actionPlacement.inMargin,
  }));
  return [...discs, ...discs.map((b) => clippedControlZone(
    b.id, b.action, b, fit, b.id === 'pause' && !b.railInMargin))];
}

// The bands above and below the picture, split down the middle like the
// picture itself. Confined to the picture's columns so that on the (unusual)
// viewport with margins on both axes the corners are not claimed twice.
function bandZones(fit, m, topLeft, topRight, bottomLeft, bottomRight) {
  const out = [];
  const x0 = m.left, x1 = fit.vw - m.right, mid = fit.vw / 2;
  if (m.top) {
    out.push(zone('topLeft', topLeft, x0, 0, mid - x0, m.top));
    out.push(zone('topRight', topRight, mid, 0, x1 - mid, m.top));
  }
  if (m.bottom) {
    const y = fit.vh - m.bottom;
    out.push(zone('bottomLeft', bottomLeft, x0, y, mid - x0, m.bottom));
    out.push(zone('bottomRight', bottomRight, mid, y, x1 - mid, m.bottom));
  }
  return out;
}

function legacyRunList(fit, hasPower) {
  const discs = TOUCH_DISCS.filter((d) => hasPower || d.id !== 'ability').map((d) => disc(d, fit));
  const by = Object.fromEntries(discs.map((d) => [d.id, d]));
  const m = margins(fit);
  const zones = [];
  if (m.left) zones.push(zone('left', 'jump', 0, 0, m.left, fit.vh));
  if (m.right) {
    // The right pillar reads top to bottom the way the column beside it does:
    // PAUSE down to the pause disc's bottom edge, USE down to the use disc's,
    // SLIDE for the rest. With no power to use (the tutorial before B-33P)
    // the middle band is SLIDE too, so the pillar still tiles.
    const x = fit.vw - m.right;
    const pauseBottom = by.pause.y + by.pause.r;
    zones.push(zone('rightTop', 'escape', x, 0, m.right, pauseBottom));
    if (hasPower) {
      const useBottom = by.ability.y + by.ability.r;
      zones.push(zone('rightMid', 'ability', x, pauseBottom, m.right, useBottom - pauseBottom));
      zones.push(zone('rightBottom', 'slide', x, useBottom, m.right, fit.vh - useBottom));
    } else {
      zones.push(zone('rightBottom', 'slide', x, pauseBottom, m.right, fit.vh - pauseBottom));
    }
  }
  zones.push(...bandZones(fit, m, 'jump', 'escape', 'jump', 'slide'));
  return [...discs, ...zones];
}

function hubList(fit) {
  const m = margins(fit);
  const discs = HUB_DISCS.map((d) => disc(d, fit));
  const r = discs[0].r;
  // A pillar wide enough to hold the arrow clear of its inset takes it (a wide
  // desktop window, an Android tablet); otherwise the arrow stays on the
  // picture where the run's discs are. On a Pro iPhone the pillar is 76pt and
  // the inset 59, so it never qualifies — which is the whole point.
  const fits = (w, inset) => w >= inset + r * 2 + HUB_PILLAR_PAD;
  const y = fit.vh - fit.safe.bottom - HUB_PILLAR_PAD - r;
  // AN UPRIGHT VIEWPORT IS NOT A LANDSCAPE PICTURE, and cy is a landscape
  // coordinate: 240 of the authored 270. Scaled into a landscape picture that
  // is letterboxed inside a portrait phone, that y lands more than half way UP
  // the screen — which is where the food court's walk arrows were found
  // floating in mid-air after turning the phone upright. It happens whenever a
  // rotation settles before the screen has asked for its portrait frame, and
  // nothing re-fits afterwards because the presentation mode only changes on a
  // state transition, so the arrows stay there until you change screen.
  //
  // Upright, hang them off the BOTTOM OF THE VIEWPORT instead — the same line
  // the pillar branch below already uses, and for the same reason: the margin
  // under a letterboxed picture is a legitimate home for a control, and the
  // bottom of the phone is where a thumb goes looking for one either way.
  if (fit.vh > fit.vw) {
    discs[0] = { ...discs[0], y };
    discs[1] = { ...discs[1], y };
  }
  if (m.left && fits(m.left, fit.safe.left)) {
    discs[0] = { ...discs[0], x: Math.max(m.left / 2, fit.safe.left + HUB_PILLAR_PAD + r), y };
  }
  if (m.right && fits(m.right, fit.safe.right)) {
    discs[1] = { ...discs[1], x: fit.vw - Math.max(m.right / 2, fit.safe.right + HUB_PILLAR_PAD + r), y };
  }
  const zones = [];
  if (m.left) zones.push(zone('left', 'left', 0, 0, m.left, fit.vh));
  if (m.right) zones.push(zone('right', 'right', fit.vw - m.right, 0, m.right, fit.vh));
  zones.push(...bandZones(fit, m, 'left', 'right', 'left', 'right'));
  return [...discs, ...zones];
}

// fit: { vw, vh, ox, oy, cssW, cssH, scale, safe:{top,right,bottom,left} } in
// CSS px — what renderer.js publishes as `screen` plus the viewport and insets.
// Returns flat button lists in the shape Input.setChromeButtons takes: discs
// as {id, action, x, y, r}, zones as {id, action, zone:{x, y, w, h}}.
export function layoutTouchChrome(fit) {
  const landscape = fit.vw >= fit.vh;
  const landscapeSide = landscape ? landscapeControlSide(fit) : null;
  return {
    run: landscape ? landscapeRunList(fit, true) : legacyRunList(fit, true),
    runNoPower: landscape ? landscapeRunList(fit, false) : legacyRunList(fit, false),
    hub: hubList(fit),
    split: fit.vw / 2,
    scale: fit.scale,
    landscapeSide,
  };
}
