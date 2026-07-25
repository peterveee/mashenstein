// Density-aware renderer. Game code always draws in a fixed 480x270 logical
// coordinate space. Desktops and tablets start at native density; hand-held
// phones start from a bounded adaptive tier so Retina fill-rate cannot overwhelm
// the frame budget on a device that has to stay cool.
export const W = 480;
export const H = 270;

let canvas = typeof document !== 'undefined' ? document.getElementById('game') : null;

// Second canvas, full viewport, sitting BEHIND #game in the DOM (so #game
// paints on top wherever the two overlap and still owns every gameplay tap;
// #chrome only shows — and only receives pointer events — out in the black
// letterbox/pillarbox margin, where #game doesn't cover). Lets touch controls
// live outside the 480x270 play field as real canvas-drawn buttons instead of
// crowding the corners of the art.
const chromeCanvas = typeof document !== 'undefined' ? document.getElementById('chrome') : null;
export const chromeCtx = chromeCanvas ? chromeCanvas.getContext('2d') : null;

// env(safe-area-inset-*) isn't readable from JS directly — only a computed
// style reports it — so #safe-area (template.html) exists purely to have its
// padding measured. Real per-device notch/Dynamic Island/home-indicator
// clearance, not a guessed constant: on an iPhone in landscape those cutouts
// rotate to the LEFT/RIGHT edges (whichever side the island/indicator lands
// on), not top/bottom, so it's `left`/`right` that matter for 'side' mode's
// buttons, and `bottom` for 'topbottom' mode's (portrait's home indicator).
const safeAreaEl = typeof document !== 'undefined' ? document.getElementById('safe-area') : null;
function safeInsets() {
  if (!safeAreaEl || typeof getComputedStyle === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  const cs = getComputedStyle(safeAreaEl);
  return {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
}

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
// Side-margin controls can lift without clipping into the game rectangle. The
// higher placement keeps them in easy thumb reach while lowering their claim
// on the bottom of the screen.
const CHROME_PLAY_LIFT = 28;
// 'topbottom' mode anchors to the GAME's edge instead (see below) — a small
// gap is enough there, since the corner risk mostly isn't in play.
const CHROME_GAME_GAP = 10;
// A zone's game-facing edge sits exactly where #game begins — but a tap
// aiming for PWR near that boundary, not precisely past it, still lands ON
// #game (it's on top there), which has no in-canvas ability button to catch
// it in chrome mode and falls through to tap-to-jump. Extending the zone this
// far INTO the game side means input.js's #game fallback (which consults
// these same zones) catches it too, not just #chrome's own listener.
const CHROME_GAME_EDGE_BUF = 44;

export const back = (() => {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (c) { c.width = W; c.height = H; }
  return c;
})();

export const bctx = back ? back.getContext('2d') : null;
import { glfx } from './glfx.js';
import { readDiag } from './diag.js';

// Device-density 2D overlay layer (hero, demo banners). Under WebGL it becomes
// a texture; under the 2D fallback it is composited over the world as a second
// canvas image. Keeping additive hero effects isolated here avoids mobile 2D
// canvas drivers clipping or corrupting the already-painted world beneath.
const overlayLayer = (() => {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (c) { c.width = W; c.height = H; }
  return c;
})();
const octx = overlayLayer ? overlayLayer.getContext('2d') : null;

export function setFancyFx(on) { glfx.fx = on ? 1 : 0; }
// Scene bloom is a GAMEPLAY effect: menus and pause screens get none.
export function setSceneGlow(on) { glfx.glow = on ? 1 : 0; }

// Some screens already render every foreground layer at the selected device
// density. Merging those layers into the backbuffer avoids a second full-size
// canvas upload on WebGL. The title uses this path: its parade, menu and
// toasters are all crisp at the same density as the world, and letting them
// participate in the existing bright pass gives their authored halos a little
// extra life. Gameplay keeps the isolated overlay until it has bounded layers.
let mergeOverlays = false;
export function setOverlayMerge(on) { mergeOverlays = !!on; }

// Procedural GPU sky (title screen). Returns true when it is actually live,
// so the caller can leave the sky transparent instead of painting its own —
// on the 2D fallback it returns false and the caller draws the plain version.
// The bench holds this on so both backends render the SAME scene. Without it a
// WebGL sweep on the title screen carries a full-screen procedural sky shader
// that the 2D sweep never draws, and the two columns are not comparable — the
// gap reads as pipeline cost when some or all of it may be the sky.
let skySuppressed = false;
export function suppressSkyFx(on) { skySuppressed = !!on; }

export function setSkyFx(on, time) {
  const next = on && glfx.active && !skySuppressed ? 1 : 0;
  if (!next || glfx.sky === 0) glfx.skyValid = false;
  glfx.sky = next;
  glfx.time = time || 0;
  return glfx.sky === 1;
}

// px = device pixels per logical pixel (what everything is pre-scaled by).
export const screen = { scale: 1, ox: 0, oy: 0, cssW: W, cssH: H, px: 1 };

// Supersample factor for art baked into an offscreen canvas ahead of time —
// scenery tiles, the volcano stack, cached toon sprites. Those canvases are
// sized in multiples of the 480x270 logical space and then blitted into a world
// rendered at `screen.px` device pixels per logical pixel, so a bake below that
// density gets MAGNIFIED on the way in. Hardcoded factors are how an iPad Pro
// stayed blocky after its canvas was already 1:1 with the display: hill tiles
// baked at 3x against a 5.69x world is a 1.9x upscale, and 1.9 is the ugliest
// ratio there is — near enough to 2 that most of the image is cleanly pixel-
// doubled, with a seam every tenth pixel where it isn't.
//
// Rounded UP so the blit is always a slight minification, never a magnification.
// Capped at 6 because tile memory grows with the square of this and the
// sharpness past 6 is not worth it — a hill tile at 6x is already ~8MB.
const BAKE_SS_MAX = 6;
export function bakeSS() {
  return Math.max(1, Math.min(BAKE_SS_MAX, Math.ceil(screen.px)));
}

let dctx = null;
let backend = null;

// Adaptive density: every device measures its own frame timing and settles on
// the highest density it can sustain. The platform only seeds the first guess.
// Rungs below native, in preference order; the ladder is [native, ...those < native].
// The 4x and 5x rungs exist for tablets and hi-DPI desktops, whose native lands
// around 5-6x: without them the rung under native is 3x, so a device that has to
// step down off native falls to a 1.7-1.9x upscale in one go, and the climb back
// is a single 3x fill-rate leap that a marginal frame will fail — earning strikes
// that lock native out for the session. Intermediate rungs make both directions
// affordable one step at a time.
const STANDARD_RUNGS = [5, 4, 3, 2.5, 2, 1.5, 1];
const LADDER_EPS = 1e-6;
const PHONE_SEED_DENSITY = 3;         // initial rung on iPhone/Android handsets
// Desktops and tablets seed at rung 0 — native, the display's own resolution.
// Adaptation stays armed underneath: a machine that genuinely cannot hold 60 FPS
// at native still steps down, it just is not assumed to be that machine before
// it has rendered a single frame. See seedRung for why native specifically.
const SLOW_FRAME_MS = 1000 / 52;      // slower than this counts as a slow frame
const FAST_FRAME_MS = 1000 / 58;      // this fast or better counts as a fast frame
const EMERGENCY_FRAME_MS = 1000 / 30; // slower than this is an emergency
const MODERATE_DROP_MS = 1000;        // sustained slow before stepping down one rung
const EMERGENCY_DROP_MS = 500;        // sustained emergency before dropping two rungs
const RECOVER_MS = 8000;              // sustained fast before climbing one rung
const LOCKED_RECOVER_MS = 30000;      // sustained fast needed to re-probe a locked rung
const ADJUST_COOLDOWN_MS = 3000;      // minimum spacing between adjustments
const RESET_GUARD_MS = 250;           // a longer gap is a tab-switch, not a slow frame
const STRIKE_WINDOW_MS = 10000;       // dropping from a rung this soon after arriving = a strike
const STRIKES_TO_LOCK = 2;            // strikes before a rung is barred from recovery (session)
const GUARD_CHECK_MS = 2500;          // delay before judging whether a drop helped
const GUARD_IMPROVE = 0.88;           // post-drop avg must be <= pre * this (>=12% better)
const GUARD_SUSPEND_MS = 30000;       // after a "no help" verdict, stop dropping this long
const CAP_REVERTS_TO_FREEZE = 2;      // this many futile drops => stop adapting for the session
const SETTLE_MS = 25000;              // stable this long at a rung => persist it
const AVG_ALPHA = 0.1;                // EWMA weight for the frame-interval average

let phonePlatform = false;   // iPhone|Android phone — gates density seed and chrome dpr cap
let desktopPlatform = false; // no touch platform detected — seeds at native density
let ladder = [1];
let nativeDensity = 1;
let rung = -1;             // -1 until resize() seeds it
let pinnedDensity = null;  // ?density=N override: fixed density, adaptation off
let adaptationEnabled = false;
let savedSeedDensity = 0;  // persisted settled density, seeds the first guess
let savedNative = false;   // this backend previously proved the native rung
let onSettle = null;       // called with the settled density value to persist it
// controller counters
let lastPresentedAt = 0, lastFrameNow = 0;
let slowFor = 0, fastFor = 0, emergencyFor = 0;
let densityCooldown = 0;
let frameAvgMs = 0;        // EWMA of frame interval; 0 = unseeded
let arrivedAt = 0;         // clock when the current rung was reached
const strikes = new Map();       // rung VALUE -> strike count (survives ladder rebuilds)
const lockedRungs = new Set();   // rung VALUEs barred from upward recovery this session
let guard = null;                // pending "did the last drop help?" check
let throttleSuspendedUntil = 0;  // absolute clock: drops suspended until here
let capReverts = 0;              // futile drops reverted this session
let frozen = false;              // adaptation given up: dropping proved not to help
// persistence bookkeeping
let settledFor = 0, settleReported = false, lastSettleValue = null;
// chrome dirty-flag: repaint the touch overlay only when its signature changes
let chromeWant = null, chromePaintedSig = null;

// Read-only diagnostic for tests and support reports. Gameplay code should not
// branch on this: WebGL is an enhancement and both paths render the same game.
export function rendererBackend() { return backend; }
export function rendererDiagnostics() {
  const px = screen.px;
  return {
    backend,
    density: px,
    native: nativeDensity,
    ladder: ladder.slice(),
    rung,
    adaptive: adaptationEnabled,
    pinned: pinnedDensity,
    bloomSuppressed: isBloomSuppressed(px),
    throttled: throttleSuspendedUntil > lastFrameNow,
    frozen,
    lockedRungs: [...lockedRungs],
    strikes: Object.fromEntries(strikes),
    settled: lastSettleValue,
  };
}

function selectBackend(name) {
  backend = name;
  if (typeof window !== 'undefined') window.__mash_renderer = name;
}

// The query string wins, then the stored override from the portrait screen's
// hidden panel — which is the only route on an installed PWA, where there is no
// address bar to put a query string into.
function rendererRequested() {
  if (typeof window === 'undefined' || !window.location) return null;
  const q = new URLSearchParams(window.location.search).get('renderer');
  const d = readDiag();
  return q || (d.renderer && (d.bench || d.rendererLock) ? d.renderer : null);
}

// iPadOS stays on the 2D path for now, based on the measured M1 iPad result.
// This is not a fallback — it is the fast path on that device.
//
// The WebGL pipeline draws the world on a 2D canvas and re-uploads that whole
// canvas to the GPU every frame with texSubImage2D. Measured on an iPad Pro
// 12.9 (M1), that upload is bandwidth-capped at roughly 20-25 Mpx/s — flat
// across every density, which is the signature of a fixed transfer cost rather
// than a shading one:
//
//     density   resolution    WebGL    2D
//     1x        480x270          60    60
//     2x        960x540          33    60
//     3x        1440x810         17    60
//     4x        1920x1080        11    60
//     5.69x     2732x1537         6    60   <- native
//
// The adaptive controller was doing its job perfectly against those numbers:
// 1.5x is genuinely the only rung where WebGL clears 60 on that device, so it
// walked down to 1.5x and stayed. Choosing 2D here does not tune the controller,
// it removes the wall the controller kept running into — full native resolution
// at a locked 60 instead of a fourteenth of the pixels.
//
// What it costs is the post pipeline: bloom/glow and the procedural GPU sky.
// Those are enhancements, and the 2D path already renders the same game without
// them (it has always been the fallback, and is covered by tests). Trading a
// nebula for 14x the pixels is not a close call on a device whose whole problem
// was that it looked blocky.
//
// This result must not be generalized to iPhone. Recent iPhones have sustained
// the WebGL path at useful densities, and forcing them to 2D here prevents the
// renderer from even measuring their actual capability. ?renderer=webgl still
// forces the pipeline on for iPad comparison; ?renderer=2d forces 2D anywhere.
function prefer2D(platform) {
  return !!platform.isIpad;
}

// Pin the density from code, exactly as ?density=N does — same field, so
// adaptation switches off for as long as a pin is set. This is what lets the
// ?bench sweep walk the ladder inside one page load instead of asking a person
// to reload with a different query string eight times and read a number off a
// screen each time. Pass null to release the pin and hand control back to the
// adaptive controller.
export function setDensityPin(n) {
  pinnedDensity = Number.isFinite(n) && n > 0 ? n : null;
  resize();
  // resize() recomputes adaptationEnabled from the new pin; clear the measuring
  // state too, or samples taken at the previous density decide the next verdict.
  resetAdaptiveSamples();
  resetSettle();
  guard = null;
}

// ?density=N pins render density and disables adaptation — for pinning a tier
// during physical-device testing. Returns null when absent or malformed.
function densityRequested() {
  if (typeof window === 'undefined' || !window.location) return null;
  const q = new URLSearchParams(window.location.search).get('density');
  const d = readDiag();
  const raw = q != null ? q : (d.rendererLock ? d.density : null);
  if (raw == null) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// The ladder is native (the ceiling) followed by every standard rung strictly
// below it, so no device is ever asked to render above its own native density.
function buildLadder(native) {
  return [native, ...STANDARD_RUNGS.filter((v) => v < native - LADDER_EPS)];
}

// Nearest rung by value; ties break toward the lower density (higher index in
// the descending ladder) so a snap after a viewport change never over-sharpens.
function nearestIndex(arr, value) {
  let best = 0, bestD = Math.abs(arr[0] - value);
  for (let i = 1; i < arr.length; i++) {
    const d = Math.abs(arr[i] - value);
    if (d < bestD - LADDER_EPS || (d <= bestD + LADDER_EPS && arr[i] < arr[best])) {
      best = i; bestD = d;
    }
  }
  return best;
}

// Everything except a phone starts at native — rung 0, the display's own
// resolution, no resample at all.
//
// The reason is that ANY rung below native is a fractional upscale, and a
// fractional upscale of crisp art is what "blocky" actually looks like: at 4x on
// an iPad Pro's 5.69x display the ratio is 1.42, so source pixels land on one
// screen pixel in some columns and two in the next, and the eye reads that
// unevenness as chunky edges. A gentler rung does not fix it, it only makes the
// unevenness finer — 1:1 is the only ratio with no artifact. An M1 iPad runs the
// same silicon as an M1 laptop, so there is no reason to hand it a softer
// picture than the laptop gets.
//
// Phones keep the 3x seed: a hand-held GPU pushing 480x270 at native is a real
// thermal cost, and at that screen size the resample is genuinely hard to see.
//
// Either way measured frame timing still decides where the device ends up.
//
// ONLY PHONES carry a persisted seed forward. The persisted density starts one
// rung ABOVE where the device last landed, which is optimistic but still well
// below native — so on anything that seeds at native it does not soften the
// first launch, it overrides it entirely, and permanently: the density it
// restores is itself what gets re-persisted. A single bad session (a hot
// laptop, a background export, or — as happened here — a stretch where the
// renderer had a bug that made every device look slow) would cost the machine
// its native resolution on every launch from then on, with no way back except
// earning eight clean seconds per rung. A phone has a real thermal budget and
// genuinely benefits from remembering; a tablet or desktop should just re-probe.
function seedRung() {
  if (!phonePlatform) return 0;
  if (savedNative) return 0;
  const i = ladder.findIndex((v) => v <= PHONE_SEED_DENSITY + LADDER_EPS);
  const platformSeedIdx = i < 0 ? 0 : i;
  if (savedSeedDensity > 0) {
    const persistedIdx = nearestIndex(ladder, savedSeedDensity);
    return Math.max(platformSeedIdx, persistedIdx - 1);
  }
  return platformSeedIdx;
}

// Bloom is dropped at 1.5x and below, but only once adaptation (or a pin) put
// us there — a healthy small desktop window sitting at a low native density
// keeps its glow.
function isBloomSuppressed(px) {
  return px <= 1.5 + LADDER_EPS && (pinnedDensity != null || rung > 0);
}

function freshCanvasAfterWebglFailure() {
  const failed = canvas;
  const replacement = failed.cloneNode(false);
  failed.replaceWith(replacement);
  canvas = replacement;
}

export function initRenderer(platform = {}, persistence = {}) {
  // The density seed limits initial high-DPI fill-rate; measured frame timing
  // decides where every device ultimately settles. phonePlatform picks the
  // lowest seed and caps the touch-chrome dpr; desktopPlatform skips the seed
  // entirely and starts at native.
  phonePlatform = !!(platform.isIphone || platform.isAndroidPhone);
  desktopPlatform = !!platform.isDesktop;
  pinnedDensity = densityRequested();
  // Select history only after the backend is known below. Keep the input here
  // so a WebGL result can never seed the 2D path, or vice versa.
  const savedDensities = persistence.savedDensities || null;
  onSettle = typeof persistence.onSettle === 'function' ? persistence.onSettle : null;
  rung = -1;              // resize() seeds on its first pass (see seedRung)
  ladder = [1];
  nativeDensity = 1;
  adaptationEnabled = false;
  arrivedAt = 0;
  lastFrameNow = 0;
  lastSettleValue = null;
  throttleSuspendedUntil = 0;
  densityCooldown = 0;
  guard = null;
  capReverts = 0;
  frozen = false;
  strikes.clear();
  lockedRungs.clear();
  resetAdaptiveSamples();
  resetSettle();
  // WebGL post pipeline when available; otherwise the direct 2D blit. On iOS
  // 2D is the DEFAULT, not a fallback — see prefer2D for the measurements.
  const asked = rendererRequested();
  const use2D = asked === '2d' || (asked !== 'webgl' && prefer2D(platform));
  const webgl = use2D
    ? { ok: false, claimed: false, error: null }
    : glfx.init(canvas);
  if (webgl.ok) {
    selectBackend('webgl');
  } else {
    // getContext locks a canvas to the first context family it successfully
    // returns. If WebGL claimed it and shader/program setup then failed, asking
    // that same element for 2D returns null on real browsers. A clone retains
    // the #game identity and CSS but has a fresh backing store. Input.init()
    // runs after this function, so it binds to the replacement automatically.
    if (webgl.claimed) freshCanvasAfterWebglFailure();
    dctx = canvas.getContext('2d');
    if (!dctx) {
      const why = webgl.error ? ` WebGL failed first: ${webgl.error.message || webgl.error}` : '';
      throw new Error(`No usable WebGL or 2D canvas renderer.${why}`);
    }
    selectBackend('2d');
    if (webgl.error && typeof console !== 'undefined' && console.warn) {
      console.warn('WebGL effects disabled; using the 2D renderer.', webgl.error);
    }
  }
  const saved = savedDensities
    ? savedDensities[backend]
    : persistence.savedDensity; // scalar retained for focused tests/old callers
  savedNative = saved === 'native';
  savedSeedDensity = Number(saved) > 0 ? Number(saved) : 0;
  // iPad can emit orientationchange before its visual viewport has settled.
  // Coalesce the following resize notifications and read the final dimensions
  // on the next frame, so #chrome's backing store and button geometry belong
  // to the same orientation as #game.
  resize();
  const scheduleResize = () => {
    if (resize.pending) return;
    resize.pending = requestAnimationFrame(() => {
      resize.pending = 0;
      resize();
    });
  };
  window.addEventListener('resize', scheduleResize);
  window.addEventListener('orientationchange', scheduleResize);
  window.visualViewport && window.visualViewport.addEventListener('resize', scheduleResize);
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
  // Rebuild the density ladder for this viewport (native is the ceiling rung).
  // On a resize/rotation that moves native, preserve the current position by
  // VALUE — snap to the nearest new rung — rather than by index, which would
  // drift as the ladder's length changes.
  const prevLadder = ladder;
  nativeDensity = cssW * dpr / W;
  ladder = buildLadder(nativeDensity);
  adaptationEnabled = pinnedDensity == null && ladder.length > 1 && !frozen;
  if (rung < 0) {
    rung = seedRung();
  } else {
    const cur = pinnedDensity != null ? pinnedDensity : prevLadder[Math.min(rung, prevLadder.length - 1)];
    rung = nearestIndex(ladder, cur);
  }
  const px = pinnedDensity != null ? Math.min(nativeDensity, pinnedDensity) : ladder[rung];
  const pxW = Math.round(W * px), pxH = Math.round(H * px);
  canvas.width = pxW;
  canvas.height = pxH;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.style.imageRendering = 'auto';
  const ox = Math.floor((winW - cssW) / 2), oy = Math.floor((winH - cssH) / 2);
  canvas.style.left = ox + 'px';
  canvas.style.top = oy + 'px';
  // The world and overlay share one density: native on desktop, adaptive on
  // phones. Keeping both aligned avoids an extra resample in the final pass.
  const renderPx = pxW / W;
  const bw = pxW, bh = pxH;
  if (back.width !== bw || back.height !== bh) { back.width = bw; back.height = bh; }
  bctx.setTransform(renderPx, 0, 0, bh / H, 0, 0);
  bctx.imageSmoothingEnabled = true;
  // Overlay layer (heroes, banners) stays at the selected render density and
  // is composited directly in the final shader pass.
  if (overlayLayer && (overlayLayer.width !== pxW || overlayLayer.height !== pxH)) {
    overlayLayer.width = pxW;
    overlayLayer.height = pxH;
  }
  if (octx) {
    octx.setTransform(pxW / W, 0, 0, pxH / H, 0, 0);
    octx.imageSmoothingEnabled = true;
  }
  Object.assign(screen, { scale, ox, oy, cssW, cssH, px: renderPx, dpx: pxW / W });
  if (glfx.active) { glfx.resize(bw, bh); glfx.setTierFx(!isBloomSuppressed(renderPx)); }
  resizeChrome(winW, winH, ox, oy, phonePlatform ? Math.min(dpr, 2) : dpr);
  if (dctx) dctx.imageSmoothingEnabled = true; // resizing resets context state
}

function resetAdaptiveSamples() {
  lastPresentedAt = 0;
  slowFor = 0;
  fastFor = 0;
  emergencyFor = 0;
  frameAvgMs = 0;
}

function resetSettle() {
  settledFor = 0;
  settleReported = false;
}

// Persist the settled density once a rung has been held long enough. Native is
// an explicit token rather than 0/auto: a phone that proved it can sustain its
// display ceiling should not be forced to re-earn 4x and native every launch.
function updateSettle(elapsed) {
  if (pinnedDensity != null || settleReported) return;
  settledFor += elapsed;
  if (settledFor < SETTLE_MS) return;
  settleReported = true;
  const value = rung === 0 ? 'native' : ladder[rung];
  if (value !== lastSettleValue) {
    lastSettleValue = value;
    if (onSettle) onSettle(value, backend);
  }
}

// Step down n rungs (1 = moderate, 2 = emergency). Arms a throttle guard and,
// if the rung was abandoned quickly, records a strike — but only when no guard
// is already pending, so a cascade of drops during one cap episode neither
// re-arms the guard nor strikes every rung it falls through.
function dropRungs(n, now) {
  const fromValue = ladder[rung];
  if (!guard) {
    let struck = false;
    if (now - arrivedAt <= STRIKE_WINDOW_MS) {
      const c = (strikes.get(fromValue) || 0) + 1;
      strikes.set(fromValue, c);
      struck = true;
      if (c >= STRIKES_TO_LOCK) lockedRungs.add(fromValue);
    }
    guard = { fromValue, preAvg: frameAvgMs, checkAt: now + GUARD_CHECK_MS, struck };
  }
  rung = Math.min(rung + n, ladder.length - 1);
  arrivedAt = now;
  densityCooldown = ADJUST_COOLDOWN_MS;
  resetAdaptiveSamples();
  resetSettle();
  resize();
}

// Climb one rung toward native. Never arms a guard and never touches strikes —
// recovery is a reward, not a probe. (The invariant guard-check 2.5s <
// cooldown 3s < recovery 8s guarantees any pending guard resolves first.)
function climbRung(now) {
  rung -= 1;
  arrivedAt = now;
  densityCooldown = ADJUST_COOLDOWN_MS;
  resetAdaptiveSamples();
  resetSettle();
  resize();
}

// Judge whether the drop that armed this guard actually helped. If frame time
// improved, keep the lower rung. If not, the bottleneck is an OS rAF cap (e.g.
// Low Power Mode), not pixel throughput: revert to the pre-drop rung, revoke
// the strike the drop charged (the rung was not at fault), and stop dropping
// for a while so we don't chase a cap down to the quality floor.
function resolveGuard(now) {
  const improved = frameAvgMs <= guard.preAvg * GUARD_IMPROVE;
  if (improved) { guard = null; return; }
  if (guard.struck) {
    const c = (strikes.get(guard.fromValue) || 0) - 1;
    if (c > 0) strikes.set(guard.fromValue, c); else strikes.delete(guard.fromValue);
    if (c < STRIKES_TO_LOCK) lockedRungs.delete(guard.fromValue);
  }
  rung = nearestIndex(ladder, guard.fromValue);
  guard = null;
  arrivedAt = now;
  throttleSuspendedUntil = now + GUARD_SUSPEND_MS;
  densityCooldown = ADJUST_COOLDOWN_MS;
  capReverts++;
  // Twice now a deliberate drop didn't help: this device's frame rate isn't
  // fill-bound (an OS cap, or it's CPU/paint-bound). Stop adapting for the
  // session and hold this sharp rung rather than churning resizes that never
  // buy frames and only blur the image on the way down.
  if (capReverts >= CAP_REVERTS_TO_FREEZE) frozen = true;
  resetAdaptiveSamples();
  resetSettle();
  resize();
}

// Presentation-only quality controller. Simulation stays fixed at 60 Hz. A
// sustained miss steps down (fast for a hard miss); recovery is slow so
// borderline devices do not resize their canvases back and forth.
export function noteRendererFrame(now) {
  if (!adaptationEnabled || !Number.isFinite(now)) return;
  lastFrameNow = now;
  if (!lastPresentedAt) { lastPresentedAt = now; if (!arrivedAt) arrivedAt = now; return; }
  const elapsed = now - lastPresentedAt;
  lastPresentedAt = now;
  if (elapsed <= 0 || elapsed > RESET_GUARD_MS) {
    slowFor = 0; fastFor = 0; emergencyFor = 0;
    guard = null;            // a tab-switch gap poisons the measurement
    return;                  // keep settledFor and the suspension deadline
  }
  frameAvgMs = frameAvgMs ? frameAvgMs * (1 - AVG_ALPHA) + elapsed * AVG_ALPHA : elapsed;
  densityCooldown = Math.max(0, densityCooldown - elapsed);
  updateSettle(elapsed);
  emergencyFor = elapsed > EMERGENCY_FRAME_MS ? emergencyFor + elapsed : 0;
  if (elapsed > SLOW_FRAME_MS) { slowFor += elapsed; fastFor = 0; }
  else if (elapsed <= FAST_FRAME_MS) { fastFor += elapsed; slowFor = 0; }
  else { slowFor = 0; fastFor = 0; }
  // A pending probe gates every adjustment: hold until its verdict so a stall
  // steps one bounded probe at a time instead of plunging to the floor chasing
  // frames a density drop may not deliver.
  if (guard) { if (now >= guard.checkAt) resolveGuard(now); return; }
  const suspended = now < throttleSuspendedUntil;
  // Emergency drop is deliberately checked BEFORE the cooldown gate so a hard
  // stall bails out immediately rather than waiting out a prior adjustment.
  if (!suspended && emergencyFor >= EMERGENCY_DROP_MS && rung < ladder.length - 1) { dropRungs(2, now); return; }
  if (densityCooldown > 0) return;
  if (!suspended && slowFor >= MODERATE_DROP_MS && rung < ladder.length - 1) { dropRungs(1, now); return; }
  const nextRungLocked = rung > 0 && lockedRungs.has(ladder[rung - 1]);
  if (fastFor >= RECOVER_MS && rung > 0 && (!nextRungLocked || fastFor >= LOCKED_RECOVER_MS)) {
    climbRung(now);
    return;
  }
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
  // PAUSE shares a column/bar with ABILITY (JUMP still gets an entire one to
  // itself) — this used to be the whole margin layout, got pulled back to
  // in-canvas when a tap aimed at PWR near the shared boundary was landing on
  // #game's tap-to-jump fallback instead, and comes back out here now that
  // the actual cause is fixed: CHROME_GAME_EDGE_BUF below extends every
  // zone's game-facing edge INTO #game itself, so a near-boundary tap on
  // #game resolves through the same zone rather than falling through.
  const safe = safeInsets();
  const SAFE_BUF = 6; // a little air past the reported inset, not right on its edge
  if (chrome.mode === 'side') {
    const r = chromeR(ox);
    // Move up/in as far as either the rounded-corner default (CHROME_EDGE_PAD)
    // or the device's REAL reported inset demands, whichever is bigger — never
    // less safe than measured, but no more cramped than necessary on a device
    // that doesn't need it (older notch iPhones, most non-Apple touch devices,
    // where the probe reports 0 and this reduces to the plain default).
    const yBottomPad = Math.max(CHROME_EDGE_PAD, safe.bottom + SAFE_BUF);
    const yTopPad = Math.max(CHROME_EDGE_PAD, safe.top + SAFE_BUF);
    const yBottom = Math.max(yTopPad + r * 3, winH - r - yBottomPad - CHROME_PLAY_LIFT);
    const yTop = r + yTopPad;
    // Pushed toward the game far enough to clear the inset, but never so far
    // it starts sliding UNDER #game (behind it, which #chrome can't draw over —
    // see the module comment) — capped a couple px short of that boundary.
    const jumpX = Math.min(ox - r - 2, Math.max(ox / 2, safe.left + r + SAFE_BUF));
    const rightX = Math.max(winW - ox + r + 2, Math.min(winW - ox / 2, winW - safe.right - r - SAFE_BUF));
    // PAUSE only needs a quarter of the shared column — it's the control you
    // reach for least — so ABILITY keeps the remaining three quarters rather
    // than splitting it down the middle.
    const pauseZoneH = winH / 4;
    chrome.jump    = { x: jumpX, y: yBottom, r, zone: { x: 0,                              y: 0,          w: ox + CHROME_GAME_EDGE_BUF, h: winH } };
    chrome.ability = { x: rightX, y: yBottom, r, zone: { x: winW - ox - CHROME_GAME_EDGE_BUF, y: pauseZoneH, w: ox + CHROME_GAME_EDGE_BUF, h: winH - pauseZoneH } };
    chrome.pause   = { x: rightX, y: yTop,    r, zone: { x: winW - ox - CHROME_GAME_EDGE_BUF, y: 0,          w: ox + CHROME_GAME_EDGE_BUF, h: pauseZoneH } };
  } else if (chrome.mode === 'topbottom') {
    const r = chromeR(oy);
    // Anchored to the GAME's own top/bottom edge (CHROME_GAME_GAP away from
    // it), not the physical screen edge — on a portrait phone that margin can
    // be hundreds of px tall, and a button sitting at the far physical edge
    // reads as lost out in empty space instead of a control for the game
    // right above/below it.
    //
    // On a thin margin (iPad, whose oy runs 53-128 vs a portrait phone's
    // 300+), "hug the game edge" and "stay fully on screen" (now: fully clear
    // of the notch/home indicator, whichever needs more room) can conflict
    // once r is big enough — clamp toward the screen's own edge instead of
    // letting the disc run past it.
    const bottomPad = Math.max(CHROME_PAD, safe.bottom + SAFE_BUF);
    const topPad = Math.max(CHROME_PAD, safe.top + SAFE_BUF);
    const bottomY = Math.min((winH - oy) + r + CHROME_GAME_GAP, winH - r - bottomPad);
    const topY = Math.max(oy - r - CHROME_GAME_GAP, r + topPad);
    const xPad = Math.max(CHROME_EDGE_PAD, 0);
    const jumpX = Math.min(winW / 2 - r - 2, Math.max(r + xPad, safe.left + r + SAFE_BUF));
    const rightX = Math.max(winW / 2 + r + 2, Math.min(winW - r - xPad, winW - safe.right - r - SAFE_BUF));
    chrome.jump    = { x: jumpX,  y: bottomY, r, zone: { x: 0,        y: winH - oy - CHROME_GAME_EDGE_BUF, w: winW / 2, h: oy + CHROME_GAME_EDGE_BUF } };
    chrome.ability = { x: rightX, y: bottomY, r, zone: { x: winW / 2, y: winH - oy - CHROME_GAME_EDGE_BUF, w: winW / 2, h: oy + CHROME_GAME_EDGE_BUF } };
    chrome.pause   = { x: rightX, y: topY,    r, zone: { x: 0,        y: 0,                                w: winW,     h: oy + CHROME_GAME_EDGE_BUF } };
  }
  // The backing store was just reassigned (blank): force the next commit to
  // repaint even if the button signature is unchanged.
  chromePaintedSig = null;
}

// Chrome (touch-button) layer is committed centrally every frame, but only
// actually repainted when its content changes. A frame declares what it wants
// via paintChrome(sig, painter); commitChromeFrame reconciles against what was
// last painted. An unchanged signature => no clear, no paint, so the compositor
// can cache the layer instead of taking a full-viewport clear + re-upload every
// frame. An empty frame (menus, pause) clears once, then no-ops.
let chromeOverlay = null;
export function beginChromeFrame() { chromeWant = null; }
export function paintChrome(sig, painter) { chromeWant = { sig, painter }; }
export function setChromeOverlay(sig, painter) { chromeOverlay = sig ? { sig, painter } : null; }
export function commitChromeFrame() {
  if (!chromeCtx) return;
  const sig = `${chromeWant ? chromeWant.sig : ''}|${chromeOverlay ? chromeOverlay.sig : ''}`;
  if (sig === chromePaintedSig) return;
  chromeCtx.clearRect(0, 0, chrome.vw, chrome.vh);
  if (chromeWant && chromeWant.painter) chromeWant.painter(chromeCtx);
  if (chromeOverlay && chromeOverlay.painter) chromeOverlay.painter(chromeCtx);
  chromePaintedSig = sig;
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

// Read-only diagnostic used by rendering contract tests. Keeping this at the
// queue boundary lets tests verify that a state stayed on the native-density
// path without exposing or executing the callbacks out of compositing order.
export function pendingOverlayDrawCount() { return overlayDraws.length; }

export function blit() {
  const px = screen.px || 1;
  const hasOverlay = overlaySprites.length || overlayDraws.length;
  // Draw queued overlays (hero, banners) into the overlay layer in logical
  // coordinates at backbuffer density.
  const paintOverlays = (ctx2, clear = true, applyShake = true) => {
    if (clear) ctx2.clearRect(0, 0, W, H);
    for (const o of overlaySprites) {
      const sx = applyShake ? Math.round(shakeX) : 0;
      const sy = applyShake ? Math.round(shakeY) : 0;
      ctx2.drawImage(o.img, o.x + sx, o.y + sy, o.w, o.h);
    }
    for (const fn of overlayDraws) {
      ctx2.save();
      if (applyShake) ctx2.translate(Math.round(shakeX), Math.round(shakeY));
      fn(ctx2);
      ctx2.restore();
    }
    overlaySprites.length = 0;
    overlayDraws.length = 0;
  };

  if (glfx.active) {
    if (hasOverlay && mergeOverlays) {
      // The final shader applies shake to the complete backbuffer. Paint the
      // queued foreground without a second shake transform, then upload one
      // combined canvas. The title's world and foreground already share this
      // exact render density, so no sharpness is lost.
      paintOverlays(bctx, false, false);
      glfx.render(back, null, Math.round(shakeX * px), Math.round(shakeY * px));
    } else {
      // Gameplay still keeps the isolated overlay so world-only bloom and the
      // crisp foreground composite retain their existing semantics.
      if (hasOverlay) paintOverlays(octx);
      glfx.render(back, hasOverlay ? overlayLayer : null, Math.round(shakeX * px), Math.round(shakeY * px));
    }
    return;
  }

  // 2D fallback: the backbuffer already matches full device density.
  if (hasOverlay && mergeOverlays) {
    // Paint before the display blit; the backbuffer is already transformed to
    // the selected density and the display copy then applies shake once.
    paintOverlays(bctx, false, false);
  }
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  dctx.imageSmoothingEnabled = back.width !== canvas.width;
  dctx.clearRect(0, 0, canvas.width, canvas.height);
  dctx.drawImage(back, Math.round(shakeX * (screen.dpx || 1)), Math.round(shakeY * (screen.dpx || 1)), canvas.width, canvas.height);
  dctx.setTransform((screen.dpx || 1), 0, 0, (screen.dpx || 1), 0, 0);
  dctx.imageSmoothingEnabled = true;
  if (hasOverlay && !mergeOverlays) {
      paintOverlays(octx);
      dctx.setTransform(1, 0, 0, 1, 0, 0);
      dctx.drawImage(overlayLayer, 0, 0, canvas.width, canvas.height);
  }
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
