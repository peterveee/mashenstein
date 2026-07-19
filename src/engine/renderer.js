// 480x270 logical backbuffer, blitted at integer scale with letterboxing.
export const W = 480;
export const H = 270;

const canvas = typeof document !== 'undefined' ? document.getElementById('game') : null;

export const back = (() => {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (c) { c.width = W; c.height = H; }
  return c;
})();

export const bctx = back ? back.getContext('2d') : null;

export const screen = { scale: 1, ox: 0, oy: 0, cssW: W, cssH: H, smooth: false };

let dctx = null;

export function initRenderer() {
  dctx = canvas.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  window.visualViewport && window.visualViewport.addEventListener('resize', resize);
}

function resize() {
  const viewport = window.visualViewport;
  const winW = viewport ? viewport.width : window.innerWidth;
  const winH = viewport ? viewport.height : window.innerHeight;
  const fitScale = Math.min(winW / W, winH / H);
  const touchScreen = (navigator.maxTouchPoints || 0) > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  // Whole-number scaling keeps desktop pixels razor sharp. On phones it can
  // waste almost half the display (a 1.8x fit used to become 1x), so use every
  // available CSS pixel there and let image-rendering preserve the pixel look.
  let scale = touchScreen ? fitScale : Math.max(1, Math.floor(fitScale));
  if (winW < W || winH < H) scale = Math.min(winW / W, winH / H); // tiny window: non-integer fit
  const cssW = Math.round(W * scale), cssH = Math.round(H * scale);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const smooth = touchScreen && Math.abs(scale - Math.round(scale)) > 0.01;
  canvas.style.imageRendering = smooth ? 'auto' : 'pixelated';
  const ox = Math.floor((winW - cssW) / 2), oy = Math.floor((winH - cssH) / 2);
  canvas.style.left = ox + 'px';
  canvas.style.top = oy + 'px';
  Object.assign(screen, { scale, ox, oy, cssW, cssH, smooth });
  dctx.imageSmoothingEnabled = false; // resizing resets context state
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
  if (!dctx) return;
  overlaySprites.push({ img, x, y, w, h });
}

// Callback variant: fn(dctx) runs inside blit with the logical-coordinate
// transform already set, so vector paths rasterize at device resolution.
// Used for the toon heroes. Consumed (and cleared) every blit.
const overlayDraws = [];
export function pushOverlayDraw(fn) {
  if (!dctx) return;
  overlayDraws.push(fn);
}

export function blit() {
  const dpr = window.devicePixelRatio || 1;
  dctx.setTransform(screen.scale * dpr, 0, 0, screen.scale * dpr, 0, 0);
  dctx.imageSmoothingEnabled = screen.smooth;
  dctx.clearRect(0, 0, W, H);
  dctx.drawImage(back, Math.round(shakeX), Math.round(shakeY));
  if (overlaySprites.length) {
    dctx.imageSmoothingEnabled = true;
    for (const o of overlaySprites) {
      dctx.drawImage(o.img, o.x + Math.round(shakeX), o.y + Math.round(shakeY), o.w, o.h);
    }
    dctx.imageSmoothingEnabled = screen.smooth;
    overlaySprites.length = 0;
  }
  if (overlayDraws.length) {
    for (const fn of overlayDraws) {
      dctx.save();
      dctx.translate(Math.round(shakeX), Math.round(shakeY));
      fn(dctx);
      dctx.restore();
    }
    overlayDraws.length = 0;
  }
}

// Map a client (CSS pixel) coordinate to logical 480x270 space, for touch/mouse.
export function clientToLogical(cx, cy) {
  return { x: (cx - screen.ox) / screen.scale, y: (cy - screen.oy) / screen.scale };
}
