// Telemetry: records device, resolution, and build info from production visitors
// so the game's reach across device classes is visible. Posts via sendBeacon
// (non-blocking, fires even if the tab closes) to a configurable endpoint.
//
// The endpoint is set at build time via __MASH_TELEMETRY_URL__. When absent
// (local/dev builds, or not yet configured), the module silently does nothing.
//
// Collected fields:
//   build     — build timestamp (ISO, from __MASH_BUILT_AT__)
//   ua        — raw navigator.userAgent
//   platform  — detected platform class (iphone/ipad/android-phone/android-tablet/desktop)
//   installed — whether running as a standalone PWA
//   screenW   — screen.width  (CSS px)
//   screenH   — screen.height (CSS px)
//   viewW     — window.innerWidth  (CSS px)
//   viewH     — window.innerHeight (CSS px)
//   dpr       — window.devicePixelRatio
//   density   — settled render scale (null if not yet known)
//   backend   — 'webgl' or '2d'
//   referrer  — document.referrer (first 256 chars)
//   sent      — ISO timestamp of when the beacon was fired

import { readPlatform } from './platform.js';

// Replaced at build time or set via the template. Every path returns '' when
// unset so callers only need one truthy check.
function endpointUrl() {
  if (typeof window !== 'undefined' && window.__MASH_TELEMETRY_URL__) {
    return window.__MASH_TELEMETRY_URL__;
  }
  return '';
}

function safeStr(s, max) {
  return String(s || '').slice(0, max);
}

export function sendTelemetry(extra = {}) {
  const url = endpointUrl();
  if (!url) return;

  const platform = readPlatform();
  const payload = {
    build: safeStr(window.__MASH_BUILT_AT__ || '', 64),
    ua: safeStr(navigator.userAgent, 512),
    platform: platform.isIphone ? 'iphone'
      : platform.isIpad ? 'ipad'
      : platform.isAndroidPhone ? 'android-phone'
      : platform.isAndroidTablet ? 'android-tablet'
      : 'desktop',
    installed: platform.standalone,
    screenW: window.screen ? window.screen.width : 0,
    screenH: window.screen ? window.screen.height : 0,
    viewW: window.innerWidth || 0,
    viewH: window.innerHeight || 0,
    dpr: window.devicePixelRatio || 1,
    density: extra.density != null ? extra.density : null,
    backend: extra.backend || null,
    referrer: safeStr(document.referrer, 256),
    sent: new Date().toISOString(),
    ...extra,
  };

  try {
    navigator.sendBeacon(url, JSON.stringify(payload));
  } catch (_) {
    // sendBeacon can throw if the URL is invalid or the body is too large.
    // Silently ignore — telemetry must never break the game.
  }
}
