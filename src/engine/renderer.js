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

export const screen = { scale: 1, ox: 0, oy: 0, cssW: W, cssH: H };

let dctx = null;

export function initRenderer() {
  dctx = canvas.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
}

function resize() {
  const winW = window.innerWidth, winH = window.innerHeight;
  let scale = Math.max(1, Math.floor(Math.min(winW / W, winH / H)));
  if (winW < W || winH < H) scale = Math.min(winW / W, winH / H); // tiny window: non-integer fit
  const cssW = Math.round(W * scale), cssH = Math.round(H * scale);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ox = Math.floor((winW - cssW) / 2), oy = Math.floor((winH - cssH) / 2);
  canvas.style.left = ox + 'px';
  canvas.style.top = oy + 'px';
  Object.assign(screen, { scale, ox, oy, cssW, cssH });
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

export function blit() {
  const dpr = window.devicePixelRatio || 1;
  dctx.setTransform(screen.scale * dpr, 0, 0, screen.scale * dpr, 0, 0);
  dctx.imageSmoothingEnabled = false;
  dctx.clearRect(0, 0, W, H);
  dctx.drawImage(back, Math.round(shakeX), Math.round(shakeY));
}

// Map a client (CSS pixel) coordinate to logical 480x270 space, for touch/mouse.
export function clientToLogical(cx, cy) {
  return { x: (cx - screen.ox) / screen.scale, y: (cy - screen.oy) / screen.scale };
}
