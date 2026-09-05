// TOUCH CHROME LAYOUT — where the on-screen controls go, decided in one place.
//
// Every touch control is a translucent disc drawn by #chrome (the full-viewport
// canvas that sits ON TOP of #game) at a fixed LOGICAL position on the 480x270
// picture, so the set is the same on every device. The picture is always
// letterboxed inside the safe area in landscape and sits mid-screen on a
// portrait tablet, so a disc on the picture can never meet a notch, the Dynamic
// Island, the home indicator or a rounded screen corner. The margin layout this
// replaced parked a stacked JUMP-over-SLIDE pill in a 76pt pillar beside a 59pt
// inset, and the island hid the JUMP disc on every Pro iPhone.
//
// THE HALVES CARRY THE FREQUENT ACTIONS. The left half of the whole viewport is
// JUMP and the right half is SLIDE (input.js, TOUCH_JUMP_FRAC); both need
// press-and-hold and both get it from the swipe arbitration there. The discs
// are the handles for those halves plus the two precise targets, USE and PAUSE.
// JUMP sits alone on the left, level with SLIDE, just clear of the hero (who
// stands at the far left, x 0-15, head at y~192) and of the CRASH / ability
// shelf (y >= 240). The right column of three is centred on the picture's
// midline (y 135), rare control high and frequent control low, PAUSE a size
// smaller because it is the one you reach for least. Every number here is a
// tunable Peter has already moved twice; retune on the phone before trusting it.
//
// Whatever margin a device has around the picture extends whichever control it
// sits beside, as tap ZONES that tile the margin with no gaps and stop exactly
// at the picture's edge: a pillar's top is PAUSE, its middle is USE, its bottom
// is SLIDE, the whole left pillar is JUMP; an iPad's bands split down the middle
// the way the picture does. Zones never reach into the picture — the halves own
// it, and a zone that did would pre-empt the swipe arbitration (zone hits fire
// on contact, like any button).
//
// Pure and DOM-free: renderer.js feeds it the fit on every resize, and
// tests/touch-layout.js feeds it real device geometries.

// The picture's logical size. Not imported from renderer.js, which imports this
// module — and a layout that only ever sees a fit has no other use for it.
const LOGICAL_W = 480;
const LOGICAL_H = 270;

// The run's four discs and the food court's two, in logical px of the picture.
// r is a radius; 22 makes a 44-logical disc, which lands at ~61 CSS px on the
// smallest phone and ~108 on an iPad — past the 44pt a thumb needs everywhere.
export const TOUCH_DISCS = [
  { id: 'jump',    action: 'jump',    cx: 40,  cy: 183, r: 22 },
  { id: 'duck',    action: 'duck',    cx: 450, cy: 183, r: 22 },
  { id: 'ability', action: 'ability', cx: 450, cy: 131, r: 22 },
  { id: 'pause',   action: 'escape',  cx: 450, cy: 83,  r: 18 },
];
export const HUB_DISCS = [
  { id: 'hubLeft',  action: 'left',  cx: 40,  cy: 183, r: 22 },
  { id: 'hubRight', action: 'right', cx: 450, cy: 183, r: 22 },
];
// CSS px a thumb may land outside a disc and still be on it (input.js).
export const DISC_SLOP = 6;
// A margin thinner than this is fit rounding, not a place for a zone: on a
// near-16:9 device the picture can leave a 1px sliver on one side.
export const MARGIN_MIN = 2;
// The food court's arrows prefer the margin when there is one wide enough to
// hold a disc clear of the reported inset — this much air past the inset and
// past the screen edge.
const HUB_PILLAR_PAD = 8;

// The fit renderer.js computes for a viewport, restated for callers that have
// no renderer (tests, tools): a uniform scale, the picture centred, offsets
// floored exactly as resize() floors them.
export function fitFor(vw, vh, safe = {}) {
  const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H);
  const cssW = Math.round(LOGICAL_W * scale), cssH = Math.round(LOGICAL_H * scale);
  return {
    vw, vh, scale, cssW, cssH,
    ox: Math.floor((vw - cssW) / 2), oy: Math.floor((vh - cssH) / 2),
    safe: { top: safe.top || 0, right: safe.right || 0, bottom: safe.bottom || 0, left: safe.left || 0 },
  };
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

function runList(fit, hasPower) {
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
      zones.push(zone('rightBottom', 'duck', x, useBottom, m.right, fit.vh - useBottom));
    } else {
      zones.push(zone('rightBottom', 'duck', x, pauseBottom, m.right, fit.vh - pauseBottom));
    }
  }
  zones.push(...bandZones(fit, m, 'jump', 'escape', 'jump', 'duck'));
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
  return {
    run: runList(fit, true),
    runNoPower: runList(fit, false),
    hub: hubList(fit),
    split: fit.vw / 2,
    scale: fit.scale,
  };
}
