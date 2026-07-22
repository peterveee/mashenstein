// Device-resolution renderer. Game code always draws in a fixed 480x270
// logical coordinate space, but the backbuffer is ALLOCATED at full device
// resolution and pre-scaled, so vector art (heroes, props, text, UI) is
// rasterized natively with true antialiasing. Nothing is magnified after
// the fact, which is what used to make menus look blurry.
export const W = 480;
export const H = 270;

const canvas = typeof document !== 'undefined' ? document.getElementById('game') : null;

// Second canvas, full viewport, sitting BEHIND #game in the DOM (so #game
// paints on top wherever the two overlap and still owns every gameplay tap;
// #chrome only shows — and only receives pointer events — out in the black
// letterbox/pillarbox margin, where #game doesn't cover). Lets touch controls
// live outside the 480x270 play field as real canvas-drawn buttons instead of
// crowding the corners of the art.
const chromeCanvas = typeof document !== 'undefined' ? document.getElementById('chrome') : null;
export const chromeCtx = chromeCanvas ? chromeCanvas.getContext('2d') : null;

// Chrome button geometry, recomputed every resize(). 'side': margin left+right
// (phones in landscape — the fit is height-limited, same math run.js's touch
// comment already spells out). 'topbottom': margin above+below (iPad in
// landscape, whose 4:3-ish screen makes the fit WIDTH-limited instead — and
// portrait phones, which hit that same width-limited case with a much bigger
// margin). 'none': neither margin clears the minimum — an exact-16:9 device,
// where callers fall back to the old in-canvas buttons.
export const chrome = { mode: 'none', vw: 0, vh: 0 };
// Radius scales with however much margin a device actually has — bigger on a
// generous margin (iPad, portrait phones), never smaller than what a thumb
// needs even on the tightest notch iPhone.
const CHROME_R_MIN = 32;
const CHROME_R_MAX = 46;
const CHROME_PAD = 8;
const CHROME_MIN_MARGIN = CHROME_R_MIN * 2 + CHROME_PAD;
const chromeR = (margin) => Math.max(CHROME_R_MIN, Math.min(CHROME_R_MAX, margin / 2 - CHROME_PAD));
// A phone's screen is a squircle, not a rectangle — a disc parked hard against
// TWO edges at once (a true corner) gets its own corner clipped by that curve.
// 'side' mode's buttons sit at a screen corner (bottom-left/right, top-right),
// so their edge-facing axis needs real clearance, not just CHROME_PAD's sliver.
const CHROME_EDGE_PAD = 26;
// 'topbottom' mode anchors to the GAME's edge instead (see below) — a small
// gap is enough there, since the corner risk mostly isn't in play.
const CHROME_GAME_GAP = 10;

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

// Procedural GPU sky (title screen). Returns true when it is actually live,
// so the caller can leave the sky transparent instead of painting its own —
// on the 2D fallback it returns false and the caller draws the plain version.
export function setSkyFx(on, time) {
  glfx.sky = on && glfx.active ? 1 : 0;
  glfx.time = time || 0;
  return glfx.sky === 1;
}

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
  resizeChrome(winW, winH, ox, oy, dpr);
  if (dctx) dctx.imageSmoothingEnabled = true; // resizing resets context state
}

function resizeChrome(winW, winH, ox, oy, dpr) {
  if (chromeCanvas) {
    chromeCanvas.width = Math.round(winW * dpr);
    chromeCanvas.height = Math.round(winH * dpr);
    chromeCanvas.style.width = winW + 'px';
    chromeCanvas.style.height = winH + 'px';
    chromeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  chrome.vw = winW;
  chrome.vh = winH;
  chrome.mode = ox >= CHROME_MIN_MARGIN ? 'side' : oy >= CHROME_MIN_MARGIN ? 'topbottom' : 'none';
  // Every button carries a `zone` — the whole reachable chunk of margin around
  // it, not just its drawn disc — so a tap anywhere in that stretch of the
  // (otherwise dead) margin counts, the same generosity a thumb gets from a
  // button that fills its own corner of a phone. Zones tile the full margin
  // between the three controls with no gaps, since #chrome never shows
  // anywhere else.
  if (chrome.mode === 'side') {
    const r = chromeR(ox);
    // JUMP has the whole left column to itself; PAUSE/PWR split the right
    // column top/bottom, since both live over there. CHROME_EDGE_PAD (not the
    // plain CHROME_PAD) keeps every one of these off the screen's rounded
    // corners — each sits at a true corner (bottom-left, bottom-right,
    // top-right), so it needs real clearance on its edge-facing axis.
    chrome.jump    = { x: ox / 2,        y: winH - r - CHROME_EDGE_PAD, r, zone: { x: 0,           y: 0,          w: ox, h: winH } };
    chrome.ability = { x: winW - ox / 2, y: winH - r - CHROME_EDGE_PAD, r, zone: { x: winW - ox,    y: winH / 2,   w: ox, h: winH / 2 } };
    chrome.pause   = { x: winW - ox / 2, y: r + CHROME_EDGE_PAD,        r, zone: { x: winW - ox,    y: 0,          w: ox, h: winH / 2 } };
  } else if (chrome.mode === 'topbottom') {
    const r = chromeR(oy);
    // PAUSE has the whole top bar to itself; JUMP/PWR split the bottom bar
    // left/right. Anchored to the GAME's own top/bottom edge (CHROME_GAME_GAP
    // away from it), not the physical screen edge — on a portrait phone that
    // margin can be hundreds of px tall, and a button sitting at the far
    // physical edge reads as lost out in empty space instead of a control for
    // the game right above/below it. CHROME_EDGE_PAD still guards the x-axis,
    // since JUMP/PWR still sit at the screen's left/right extent.
    //
    // On a thin margin (iPad, whose oy runs 53-128 vs a portrait phone's
    // 300+), "hug the game edge" and "stay fully on screen" can conflict once
    // r is big enough — clamp each toward the screen's own edge instead of
    // letting the disc run past it.
    const bottomY = Math.min((winH - oy) + r + CHROME_GAME_GAP, winH - r - CHROME_PAD);
    const topY = Math.max(oy - r - CHROME_GAME_GAP, r + CHROME_PAD);
    chrome.jump    = { x: r + CHROME_EDGE_PAD,        y: bottomY, r, zone: { x: 0,        y: winH - oy, w: winW / 2, h: oy } };
    chrome.ability = { x: winW - r - CHROME_EDGE_PAD, y: bottomY, r, zone: { x: winW / 2, y: winH - oy, w: winW / 2, h: oy } };
    chrome.pause   = { x: winW - r - CHROME_EDGE_PAD, y: topY,    r, zone: { x: 0,        y: 0,        w: winW,     h: oy } };
  }
}

// Wipes the chrome canvas — called every frame regardless of mode, so a
// device that flips between 'none' and an outside mode (pause toggling,
// rotation) never leaves a stale button drawn behind.
export function clearChrome() {
  if (chromeCtx) chromeCtx.clearRect(0, 0, chrome.vw, chrome.vh);
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

// Dev/build tooling hook: capture exactly what the player sees, including the
// final WebGL/2D composite and any queued overlays already rendered to screen.
// The browser handles the actual file save through a temporary download link.
export function saveScreenshot(filename = 'mashenstein.png') {
  if (!canvas || typeof canvas.toDataURL !== 'function' || typeof document === 'undefined') return false;
  const link = document.createElement('a');
  if (!link || typeof link.click !== 'function') return false;
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return true;
}

// Map a client (CSS pixel) coordinate to logical 480x270 space, for touch/mouse.
export function clientToLogical(cx, cy) {
  return { x: (cx - screen.ox) / screen.scale, y: (cy - screen.oy) / screen.scale };
}
