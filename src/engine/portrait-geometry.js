// Portrait presentation geometry shared by the frame, HUD and camera.  This
// file intentionally contains no renderer or game imports: the same answer
// must be available before a frame is published and while the HUD is painted.

import { portraitTouchLayout } from './portrait-input.js';

export const PORTRAIT_MESSAGE_SHELF_CSS = 64;
export const PORTRAIT_MESSAGE_GAP_CSS = 12;
// The compact portrait chat card is allowed two CSS px of breathing room in
// the 64px shelf. The ground sits just above that largest possible card, not
// an arbitrary distance above the shelf.
export const PORTRAIT_CHAT_CARD_BUFFER_CSS = 2;
export const PORTRAIT_CHAT_CARD_MAX_CSS = PORTRAIT_MESSAGE_SHELF_CSS - PORTRAIT_CHAT_CARD_BUFFER_CSS;
export const PORTRAIT_GROUND_GAP_CSS = 4;
// The power names are a strip ABOVE the discs now that the discs themselves sit
// on the glass: there is no longer a band between a disc and the bottom edge to
// hang them in. The shelf gives that strip its height so a line of dialogue and
// a power name never occupy the same pixels.
export const PORTRAIT_ACTION_LABEL_CSS = 24;
export const PORTRAIT_GROUND_ANCHOR_MIN_RATIO = 0.55;
export const PORTRAIT_GROUND_ANCHOR_MAX_RATIO = 0.80;
// The default request is intentionally below the shelf-derived floor. The
// geometry cap below then puts the ground at the same chat-clearing level on
// every phone; a profile may request a higher ground with a smaller ratio.
export const PORTRAIT_GROUND_ANCHOR_RATIO = PORTRAIT_GROUND_ANCHOR_MAX_RATIO;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function finite(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

/**
 * Resolve the physical portrait shelves from a presentation frame-shaped
 * object.  Coordinates returned here are logical canvas coordinates; the CSS
 * values are used only to keep touch targets and readable shelves stable as
 * the short side changes.
 */
export function portraitGeometry({
  width = 480,
  height = 720,
  scale = 1,
  safeRect = null,
  groundAnchorRatio = PORTRAIT_GROUND_ANCHOR_RATIO,
} = {}) {
  const s = finite(scale, 1) > 0 ? finite(scale, 1) : 1;
  const safe = safeRect || { left: 0, top: 0, right: width, bottom: height };
  const safeWidth = Math.max(0, finite(safe.right, width) - finite(safe.left, 0));
  const safeHeight = Math.max(0, finite(safe.bottom, height) - finite(safe.top, 0));
  const cssWidth = Math.max(1, finite(width, 480) * s);
  const cssHeight = Math.max(1, finite(height, 720) * s);
  const touch = portraitTouchLayout({
    viewportWidth: cssWidth,
    viewportHeight: cssHeight,
    safe: safe.css || {},
  });
  const actionDiscs = ['jump', 'slide', 'use']
    .map((id) => touch.controls?.[id])
    .filter(Boolean);
  const actionTop = Math.min(...actionDiscs.map((control) => (control.cy - control.r) / s));
  // The discs' lower edge, which the hero's power name hangs under.
  const actionBottom = Math.max(...actionDiscs.map((control) => (control.cy + control.r) / s));
  const safeHeightCss = safeHeight * s;
  const shelfHeightCss = PORTRAIT_MESSAGE_SHELF_CSS;
  const shelfBottom = actionTop
    - (PORTRAIT_MESSAGE_GAP_CSS + PORTRAIT_ACTION_LABEL_CSS) / s;
  const shelfTop = Math.max(finite(safe.top, 0), shelfBottom - shelfHeightCss / s);
  const desiredGround = finite(safe.top, 0)
    + clamp(finite(groundAnchorRatio, PORTRAIT_GROUND_ANCHOR_RATIO),
      PORTRAIT_GROUND_ANCHOR_MIN_RATIO, PORTRAIT_GROUND_ANCHOR_MAX_RATIO) * safeHeight;
  // A resting hero must clear the largest possible chat card. On a short
  // phone this moves the authored groundline up; the camera may still make a
  // bounded per-jump correction, but it never starts with controls hiding the
  // hero's feet.
  const largestChatTop = shelfTop
    + (shelfHeightCss - PORTRAIT_CHAT_CARD_MAX_CSS) / s;
  const groundFloorScreenY = Math.max(finite(safe.top, 0),
    largestChatTop - PORTRAIT_GROUND_GAP_CSS / s);
  const groundFloorRatio = safeHeight > 0
    ? (groundFloorScreenY - finite(safe.top, 0)) / safeHeight : 0.55;
  const groundScreenY = Math.min(desiredGround, groundFloorScreenY);
  const gameplayTop = finite(safe.top, 0);
  // The shelf is the hard lower edge of gameplay.  The groundline may sit
  // higher than this on a short phone, but it must never make the camera's
  // edge-pan contract less strict than the message shelf itself.
  // This is the actual lower edge of the playable composition. It follows the
  // selected ground when a profile raises it, but the default ground is capped
  // by the largest chat card above, so the camera never puts a route under the
  // chat shelf.
  const gameplayBottom = groundScreenY;
  return Object.freeze({
    scale: s,
    safeWidth,
    safeHeight,
    safeHeightCss,
    shelfHeightCss,
    shelfTop,
    shelfBottom,
    actionTop,
    actionBottom,
    gameplayTop,
    gameplayBottom,
    desiredGround,
    largestChatTop,
    groundFloorScreenY,
    groundFloorRatio,
    groundScreenY,
    touch,
  });
}
