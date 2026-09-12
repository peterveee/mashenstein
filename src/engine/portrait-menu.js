// Shared typography helpers for portrait utility menus.
//
// These screens keep the game's 480 logical pixels wide so their text and
// vector art stay uniformly scaled on a phone. Portrait gets more vertical
// room, but it also needs a deliberately larger type scale: a menu that merely
// fills the taller frame is still hard to read at arm's length.
import { H, screen } from './renderer.js';
import {
  drawText, textWidth, textYForMid, wrapText,
} from './sprites.js';

export const PORTRAIT_MENU_TEXT_SCALE = 1.55;

export function portraitMenuActive() {
  return screen.presentationMode === 'phone-portrait';
}

export function portraitMenuScale(size = 1) {
  return size * (portraitMenuActive() ? PORTRAIT_MENU_TEXT_SCALE : 1);
}

function snapToBacking(value, density) {
  const d = Number.isFinite(density) && density > 0 ? density : 1;
  return Math.round(value * d) / d;
}

export function portraitMenuText(ctx, text, x, y, color, size = 1, style = 'ui') {
  drawText(ctx, text, snapToBacking(x, screen.dpx), snapToBacking(y, screen.dpy),
    color, portraitMenuScale(size), style);
}

export function portraitMenuTextCentered(ctx, text, x, y, color, size = 1, style = 'ui') {
  const scale = portraitMenuScale(size);
  const startX = x - textWidth(String(text), scale, style) / 2;
  drawText(ctx, text, snapToBacking(startX, screen.dpx), snapToBacking(y, screen.dpy),
    color, scale, style);
}

export function portraitMenuTextY(midY, size = 1, style = 'ui') {
  return textYForMid(midY, portraitMenuScale(size), style);
}

// Return a local (pre-multiplier) size that fits the available logical width.
// Keeping the result local means callers can pass it back to portraitMenuText
// without accidentally applying the portrait multiplier twice.
export function portraitMenuFit(text, size, maxWidth, style = 'ui') {
  const rendered = textWidth(text, portraitMenuScale(size), style);
  return rendered > maxWidth ? size * maxWidth / rendered : size;
}

export function portraitMenuWrap(text, maxWidth, size = 1, maxLines = 2, style = 'ui') {
  return wrapText(text, maxWidth, portraitMenuScale(size), maxLines, style);
}

export function portraitMenuSafeTop(pad = 0) {
  return screen.safeTop + pad;
}

export function portraitMenuSafeBottom(pad = 0) {
  return H - screen.safeBottom - pad;
}
