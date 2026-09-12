// Small, dependency-free platform decisions shared by the pre-game install
// gate and the in-game install guide. Keep this module free of DOM work: the
// gate bundles it before any renderer, canvas, font, sprite or audio code.

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|LinkedIn|Pinterest|GSA\//;
const ALT_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Brave/;

export function iosMajor(ua = '') {
  const m = /(?:iPhone )?OS (\d+)(?:_\d+)* like Mac OS X/.exec(ua);
  return m ? Number(m[1]) : 0;
}

const COMPACT_FROM = 26;
// Android tablets typically have a smallest-width of 600dp or more.
// Phones are narrower. This is the same heuristic Google's official
// device-class docs recommend for telling them apart.
const ANDROID_TABLET_MIN_DP = 600;

export function installFlavor(ua = '') {
  if (!/iPhone|iPod/.test(ua)) return null;
  if (ALT_BROWSER.test(ua)) return 'alt';
  if (IN_APP.test(ua) || !/Safari/.test(ua)) return 'inapp';
  return iosMajor(ua) >= COMPACT_FROM ? 'menu' : 'safari';
}

// Where the browser control named by the install instructions actually lives.
// iOS 26 Compact keeps its ••• capsule at the bottom in either orientation;
// older Safari moves its toolbar between the bottom and top.
export function installTarget(flavor, portrait) {
  if (flavor === 'menu') return { edge: 'bottom', side: 'right', glyph: '▼', where: 'at the bottom right' };
  if (portrait) return { edge: 'bottom', side: 'center', glyph: '▼', where: 'in the bar at the bottom' };
  return { edge: 'top', side: 'right', glyph: '▲', where: 'top-right of the bar above' };
}

export function detectPlatform({
  ua = '',
  maxTouchPoints = 0,
  standalone = false,
  screenW = 0,
  screenH = 0,
} = {}) {
  // Modern iPadOS commonly reports Macintosh. The touch-point half of this
  // test is deliberately paired with that UA: a touchscreen Windows laptop
  // must not become an iPad, and an iPad must never fall into the iPhone gate.
  const isIpad = /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  const isIphone = !isIpad && /iPhone|iPod/.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isAndroidPhone = isAndroid && Math.min(screenW, screenH) < ANDROID_TABLET_MIN_DP;
  const isAndroidTablet = isAndroid && !isAndroidPhone;
  return {
    ua,
    isIphone,
    isIpad,
    isAndroid,
    isAndroidPhone,
    isAndroidTablet,
    isDesktop: !isIphone && !isIpad && !isAndroid,
    standalone: !!standalone,
    allowed: !isIphone || !!standalone,
  };
}

export function readPlatform(win = window, nav = navigator) {
  const standalone = nav.standalone === true
    || !!(win.matchMedia && win.matchMedia('(display-mode: standalone)').matches);
  return detectPlatform({
    ua: nav.userAgent || '',
    maxTouchPoints: Number(nav.maxTouchPoints) || 0,
    standalone,
    screenW: win.screen ? win.screen.width : 0,
    screenH: win.screen ? win.screen.height : 0,
  });
}

// DISPLAY CORNER RADIUS, in CSS px.
//
// The web has no API for it, and it matters: anything laid flush to an edge
// loses its ends to the curve. Apple's radii are fixed per model and the
// portrait CSS size identifies the model closely enough — where two models
// share a size they also share a radius, bar the XS Max/11 Pro Max pair, which
// takes the larger of the two so the inset is generous rather than short.
//
// ANDROID AND EVERYTHING ELSE GET ZERO ON PURPOSE. Their radii vary by
// manufacturer with nothing to read them from, and a guessed inset on a square
// screen is a visible, permanent margin — worse than a curve we did not know
// about. Treat them as square; iPhone is the only device we actually know.
const IPHONE_CORNER_RADIUS = Object.freeze({
  '375x812': 39,     // X, XS, 11 Pro
  '414x896': 41.5,   // XR, 11 (XS Max / 11 Pro Max are 39; the larger is safe)
  '360x780': 44,     // 12 mini, 13 mini
  '390x844': 47.33,  // 12, 12 Pro, 13, 13 Pro, 14
  '428x926': 53.33,  // 12 Pro Max, 13 Pro Max, 14 Plus
  '393x852': 55,     // 14 Pro, 15, 15 Pro, 16
  '430x932': 55,     // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  '402x874': 62,     // 16 Pro, 17 Pro
  '440x956': 62,     // 16 Pro Max, 17 Pro Max
});
// An iPhone we do not have in the table. Every rounded model lands between
// 0.12 and 0.155 of its short side; the low end of that is the estimate, so an
// unknown phone is under-inset rather than over-inset.
const IPHONE_CORNER_RATIO = 0.12;

export function displayCornerRadiusCss({
  isIphone = false, width = 0, height = 0, safeTop = 0,
} = {}) {
  if (!isIphone) return 0;
  const short = Math.min(Number(width) || 0, Number(height) || 0);
  const long = Math.max(Number(width) || 0, Number(height) || 0);
  if (!(short > 0)) return 0;
  const known = IPHONE_CORNER_RADIUS[`${Math.round(short)}x${Math.round(long)}`];
  if (known) return known;
  // A home-button iPhone has square corners and no top inset to speak of; the
  // inset is the tell, since every rounded iPhone also has a notch or island.
  return Number(safeTop) > 20 ? short * IPHONE_CORNER_RATIO : 0;
}

/**
 * How far in from the side the screen edge has curved by, `height` CSS px up
 * from the bottom (or down from the top) of a display of radius `radius`.
 * Zero on a square screen, and zero once you are past the curve.
 */
export function cornerInsetAt(radius = 0, height = 0) {
  const r = Number(radius) || 0;
  const y = Number(height) || 0;
  if (!(r > 0) || y >= r) return 0;
  if (y <= 0) return r;
  return r - Math.sqrt(Math.max(0, r * r - (r - y) * (r - y)));
}
