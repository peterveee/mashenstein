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

const sessionStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
let sessionEnded = false;

// Persistent anonymous device ID. Stored in localStorage so the same device
// gets the same ID across sessions — lets us count returning players without
// cookies, accounts, or IP addresses.
const DEVICE_ID_KEY = 'mash_did';
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch (_) { return null; }
}

// Deterministic code name from the device ID. Same ID = same name forever.
// Two-word combos drawn from the game's own vocabulary.
const ADJ = ['SHINY','ANGRY','GOLDEN','SPARE','BURNT','LOOSE','FROZEN','SPARKY',
  'RUSTY','NOBLE','GIDDY','STERN','WILY','ZAPPY','DAMP','COZY'];
const NOUN = ['TOASTER','CACTUS','PLUG','FUSE','CORD','CRATE','DRONE','PIPE',
  'CAPSULE','RELAY','PORTAL','BATTERY','WRENCH','AXE','SHIELD','PIXEL'];
function deviceName(did) {
  if (!did) return null;
  let h = 0;
  for (let i = 0; i < did.length; i++) h = ((h << 5) - h + did.charCodeAt(i)) | 0;
  const a = Math.abs(h) % ADJ.length;
  const n = Math.abs(h >> 4) % NOUN.length;
  return ADJ[a] + ' ' + NOUN[n];
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
    did: deviceId(),
    name: deviceName(deviceId()),
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

// Fire a lightweight ping on page unload with session duration. sendBeacon
// is designed for exactly this: it guarantees delivery even if the tab closes
// before the request completes.
export function sendSessionEnd(extra = {}) {
  if (sessionEnded) return;
  sessionEnded = true;
  const url = endpointUrl();
  if (!url) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const elapsed = Math.round((now - sessionStart) / 1000);

  try {
    navigator.sendBeacon(url, JSON.stringify({
      kind: 'end',
      did: deviceId(),
      name: deviceName(deviceId()),
      sessionSec: elapsed,
      sent: new Date().toISOString(),
      ...extra,
    }));
  } catch (_) { /* never break the page */ }
}
