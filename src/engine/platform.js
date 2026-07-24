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
