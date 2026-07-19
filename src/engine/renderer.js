// Device-resolution renderer. Game code always draws in a fixed 480x270
// logical coordinate space, but the backbuffer is ALLOCATED at full device
// resolution and pre-scaled, so vector art (heroes, props, text, UI) is
// rasterized natively with true antialiasing. Nothing is magnified after
// the fact, which is what used to make menus look blurry.
export const W = 480;
export const H = 270;

const canvas = typeof document !== 'undefined' ? document.getElementById('game') : null;

export const back = (() => {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (c) { c.width = W; c.height = H; }
  return c;
})();

export const bctx = back ? back.getContext('2d') : null;
import { glfx } from './glfx.js';

// Device-density 2D overlay layer (hero, demo banners). Under WebGL it is a
// texture; under the 2D fallback it draws straight onto the display canvas.
const overlayLayer = (() => {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (c) { c.width = W; c.height = H; }
  return c;
})();
const octx = overlayLayer ? overlayLayer.getContext('2d') : null;

export function setFancyFx(on) { glfx.fx = on ? 1 : 0; }
// Scene bloom is a GAMEPLAY effect: menus and pause screens get none.
export function setSceneGlow(on) { glfx.glow = on ? 1 : 0; }

// px = device pixels per logical pixel (what everything is pre-scaled by).
export const screen = { scale: 1, ox: 0, oy: 0, cssW: W, cssH: H, px: 1 };

let dctx = null;

export function initRenderer() {
  // WebGL post pipeline when available; otherwise the classic 2D blit.
  if (!glfx.init(canvas)) dctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.visualViewport && window.visualViewport.addEventListener('resize', resize);
}

function resize() {
  const viewport = window.visualViewport;
  const winW = viewport ? viewport.width : window.innerWidth;
  const winH = viewport ? viewport.height : window.innerHeight;
  // Art is resolution-independent now, so fill the viewport at any fractional
  // scale — no integer-snapping needed, on desktop or phone.
  const scale = Math.min(winW / W, winH / H);
  const cssW = Math.round(W * scale), cssH = Math.round(H * scale);
  const dpr = window.devicePixelRatio || 1;
  const pxW = Math.round(cssW * dpr), pxH = Math.round(cssH * dpr);
  canvas.width = pxW;
  canvas.height = pxH;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.style.imageRendering = 'auto';
  const ox = Math.floor((winW - cssW) / 2), oy = Math.floor((winH - cssH) / 2);
  canvas.style.left = ox + 'px';
  canvas.style.top = oy + 'px';
  // Backbuffer density is capped: 3 device pixels per logical pixel keeps
  // vector art smooth while quartering fill cost on Retina displays (the
  // hero overlay still rasterizes at FULL device resolution in blit).
  const px = Math.min(pxW / W, 4);
  const bw = Math.round(W * px), bh = Math.round(H * px);
  if (back.width !== bw || back.height !== bh) { back.width = bw; back.height = bh; }
  bctx.setTransform(px, 0, 0, bh / H, 0, 0);
  bctx.imageSmoothingEnabled = true;
  // Overlay layer (heroes, banners) stays at FULL device resolution — it is
  // composited pin-sharp in the final shader pass, never resampled.
  if (overlayLayer && (overlayLayer.width !== pxW || overlayLayer.height !== pxH)) {
    overlayLayer.width = pxW;
    overlayLayer.height = pxH;
  }
  if (octx) {
    octx.setTransform(pxW / W, 0, 0, pxH / H, 0, 0);
    octx.imageSmoothingEnabled = true;
  }
  Object.assign(screen, { scale, ox, oy, cssW, cssH, px, dpx: pxW / W });
  if (glfx.active) glfx.resize(bw, bh);
  if (dctx) dctx.imageSmoothingEnabled = true; // resizing resets context state
}

let shakeX = 0, shakeY = 0, shakePower = 0, shakeTime = 0;
let shakeScale = 1; // accessibility: screen-shake slider 0..1

export function setShakeScale(s) { shakeScale = s; }
export function shake(power, duration) {
  shakePower = Math.max(shakePower, power);
  shakeTime = Math.max(shakeTime, duration);
}

export function updateShake(dt, rand) {
  if (shakeTime > 0) {
    shakeTime -= dt;
    const p = shakePower * Math.min(1, shakeTime * 4) * shakeScale;
    shakeX = (rand() * 2 - 1) * p;
    shakeY = (rand() * 2 - 1) * p;
    if (shakeTime <= 0) { shakePower = 0; shakeX = 0; shakeY = 0; }
  }
}

// Sprites queued here draw above the backbuffer at device resolution with
// bilinear smoothing — used for the hero so it reads clean, not chunky.
// The queue is consumed (and cleared) every blit; no-op when headless.
const overlaySprites = [];
export function pushOverlaySprite(img, x, y, w, h) {
  if (!dctx && !glfx.active) return;
  overlaySprites.push({ img, x, y, w, h });
}

// Callback variant: fn(dctx) runs inside blit with the logical-coordinate
// transform already set, so vector paths rasterize at device resolution.
// Used for the toon heroes. Consumed (and cleared) every blit.
const overlayDraws = [];
export function pushOverlayDraw(fn) {
  if (!dctx && !glfx.active) return false;
  overlayDraws.push(fn);
  return true;
}

export function blit() {
  const px = screen.px || 1;
  // Draw queued overlays (hero, banners) into the overlay layer in logical
  // coordinates at backbuffer density.
  const paintOverlays = (ctx2) => {
    ctx2.clearRect(0, 0, W, H);
    for (const o of overlaySprites) {
      ctx2.drawImage(o.img, o.x + Math.round(shakeX), o.y + Math.round(shakeY), o.w, o.h);
    }
    for (const fn of overlayDraws) {
      ctx2.save();
      ctx2.translate(Math.round(shakeX), Math.round(shakeY));
      fn(ctx2);
      ctx2.restore();
    }
    overlaySprites.length = 0;
    overlayDraws.length = 0;
  };

  if (glfx.active) {
    paintOverlays(octx);
    glfx.render(back, overlayLayer, Math.round(shakeX * px), Math.round(shakeY * px), canvas.width, canvas.height);
    return;
  }

  // 2D fallback: stretch the density-capped backbuffer to the display.
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  dctx.imageSmoothingEnabled = back.width !== canvas.width;
  dctx.clearRect(0, 0, canvas.width, canvas.height);
  dctx.drawImage(back, Math.round(shakeX * (screen.dpx || 1)), Math.round(shakeY * (screen.dpx || 1)), canvas.width, canvas.height);
  dctx.setTransform((screen.dpx || 1), 0, 0, (screen.dpx || 1), 0, 0);
  dctx.imageSmoothingEnabled = true;
  if (overlaySprites.length || overlayDraws.length) paintOverlays(dctx);
}

// Map a client (CSS pixel) coordinate to logical 480x270 space, for touch/mouse.
export function clientToLogical(cx, cy) {
  return { x: (cx - screen.ox) / screen.scale, y: (cy - screen.oy) / screen.scale };
}
