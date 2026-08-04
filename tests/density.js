// Adaptive render-density controller: seeding across platforms, the emergency
// two-rung drop, the throttle guard (OS rAF-cap detection), session failure
// memory, persistence seeding/settle, the ?density= pin, and the WebGL bloom
// tier gate + overlay-upload skip. The controller is driven directly with a
// hand-stepped clock; each case imports a fresh renderer module so its
// module-level state starts clean.
import { installDom } from './dom-stub.js';
import { detectPlatform } from '../src/engine/platform.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// Feed n frames spaced dt ms apart. The first call after a reset only primes
// the clock (no measured interval), so feed a couple extra when a count matters.
function feed(r, clk, n, dt) {
  for (let i = 0; i < n; i++) { clk.t += dt; r.noteRendererFrame(clk.t); }
}

// Feed dt-spaced frames until pred() holds (returns true) or max frames pass.
function feedUntil(r, clk, dt, pred, max = 5000) {
  for (let i = 0; i < max; i++) { clk.t += dt; r.noteRendererFrame(clk.t); if (pred()) return true; }
  return false;
}

const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const PHONE = { locationSearch: '?renderer=2d', innerWidth: 852, innerHeight: 393, devicePixelRatio: 3 };
// Phone native = 852-fit cssW 699 * dpr 3 / 480 = 4.36875 → ladder below. Phones
// seed at 3x (index 2), leaving the 4x rung above them to climb into.
const LADDER = [4.36875, 4, 3, 2.5, 2, 1.5, 1];

function webglStub() {
  let id = 0;
  const calls = { draws: 0, textureUpdates: 0 };
  const noop = () => {};
  const gl = new Proxy({
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, TEXTURE_2D: 7, TEXTURE_WRAP_S: 8, TEXTURE_WRAP_T: 9,
    CLAMP_TO_EDGE: 10, TEXTURE_MIN_FILTER: 11, TEXTURE_MAG_FILTER: 12, LINEAR: 13,
    RGBA: 14, UNSIGNED_BYTE: 15, COLOR_ATTACHMENT0: 16, FRAMEBUFFER: 17,
    drawingBufferWidth: 1440, drawingBufferHeight: 810,
    createShader: () => ({ id: ++id }), getShaderParameter: () => true,
    createProgram: () => ({ id: ++id }), getProgramParameter: () => true,
    createBuffer: () => ({ id: ++id }), createTexture: () => ({ id: ++id }),
    createFramebuffer: () => ({ id: ++id }),
    texSubImage2D: () => { calls.textureUpdates++; },
    drawArrays: () => { calls.draws++; },
  }, { get(t, k) { return k in t ? t[k] : noop; } });
  return { gl, calls };
}

// --- iPad (masquerading as macOS) renders at native, with the ladder armed ----
// Any rung below native is a fractional upscale, and a fractional upscale is
// what reads as blocky. An M1 iPad runs M1 silicon; it gets the same 1:1 picture
// a laptop does, and the ladder is there if it turns out it cannot hold it.
{
  installDom({ innerWidth: 1194, innerHeight: 834, devicePixelRatio: 2 });
  const r = await import('../src/engine/renderer.js?d-ipad');
  const platform = detectPlatform({ ua: MAC_UA, maxTouchPoints: 5 });
  assert(platform.isIpad && !platform.isIphone, 'modern iPad UA + touch points detects as iPad');
  // savedDensity mimics a real device that has played before. A tablet must not
  // inherit a soft density from an earlier session; that is what kept an iPad
  // Pro blocky on every screen, menus included, long after the seed was fixed.
  r.initRenderer(platform, { savedDensity: 2.5 });
  const d = r.rendererDiagnostics();
  assert(d.adaptive && d.rung === 0 && d.density === d.native,
    'iPad seeds at native density — no resample, nothing to look blocky');
  // Without the exemption a persisted 2.5 seeds one rung above it, at 3x.
  assert(d.density > 4, 'a persisted 2.5x from an earlier session does not seed an iPad soft');
  assert(d.ladder[1] === 4 && d.ladder[2] === 3,
    'the iPad ladder keeps 4x and 3x below native as graduated fallbacks');
}

// --- A phone keeps the lower 3x seed, with the 4x rung left above it ---------
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-phone-seed');
  r.initRenderer({ isIphone: true });
  const d = r.rendererDiagnostics();
  assert(d.rung === 2 && d.density === 3, 'a phone seeds at 3x, not at native like a tablet');
  assert(d.ladder[1] === 4, 'the 4x rung sits above the phone seed as a climb target');
}

// --- Android phones and tablets use their actual detected device class -------
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-android-phone');
  const platform = detectPlatform({
    ua: ANDROID_UA,
    screenW: 412,
    screenH: 915,
  });
  r.initRenderer(platform);
  const d = r.rendererDiagnostics();
  assert(platform.isAndroidPhone && d.density === 3,
    'an Android phone keeps the bounded 3x seed');
}
{
  const dom = installDom({
    locationSearch: '?renderer=2d',
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 3,
  });
  const r = await import('../src/engine/renderer.js?d-android-tablet');
  const platform = detectPlatform({
    ua: ANDROID_UA,
    screenW: 800,
    screenH: 1280,
  });
  r.initRenderer(platform, { savedDensities: { webgl: 1.5, '2d': 1.5 } });
  const d = r.rendererDiagnostics();
  // Seeds at the TOP of its ladder, which on a panel this dense is the 1440p
  // cap rather than native (8x here) — the point of the case is that a tablet
  // starts at the ceiling and ignores phone-style persisted history, not which
  // number the ceiling happens to be.
  assert(platform.isAndroidTablet && d.rung === 0 && d.density === Math.min(d.native, 1440 / 270),
    'an Android tablet seeds at its ladder ceiling and ignores old phone-style density history');
  assert(dom.chromeCanvas.width === 3840,
    'an Android tablet does not receive the phone-only 2x touch-chrome cap');
}

// --- iPhone uses WebGL; the measured M1 result stays within the iPad class ----
{
  const webgl = webglStub();
  installDom({
    ...PHONE,
    locationSearch: '',
    gameGetContext: (type) => (type === 'webgl' ? webgl.gl : undefined),
  });
  const r = await import('../src/engine/renderer.js?d-iphone-webgl-default');
  r.initRenderer({ isIphone: true });
  assert(r.rendererBackend() === 'webgl',
    'an available WebGL renderer remains the iPhone default');
}

// --- Emergency two-rung drop from the seed, in a single adjustment -----------
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-emerg');
  r.initRenderer({ isIphone: true });
  const clk = { t: 1 };
  const seen = new Set();
  r.noteRendererFrame(clk.t);          // prime
  // 15 frames is one emergency drop's worth; more would trigger a second drop.
  for (let i = 0; i < 15; i++) { clk.t += 40; r.noteRendererFrame(clk.t); seen.add(r.rendererDiagnostics().density); }
  const d = r.rendererDiagnostics();
  assert(d.density === 2 && d.rung === 4, 'a half-second of >33ms frames drops two rungs to 2x');
  assert(!seen.has(2.5), 'the emergency drop skips the intermediate 2.5x rung (single adjustment)');
}

// --- A drop is a bounded probe: no further drop until its verdict ------------
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-gate');
  r.initRenderer({ isIphone: true });
  const clk = { t: 1 };
  r.noteRendererFrame(clk.t);
  feed(r, clk, 20, 40);                 // one emergency probe: two rungs, then held
  assert(r.rendererDiagnostics().rung === 4, 'a hard stall drops two rungs in one probe (to 2x)');
  feed(r, clk, 30, 40);                 // still stalling, but the probe is unresolved
  assert(r.rendererDiagnostics().rung === 4,
    'no further drop fires while the probe awaits its verdict (no plunge to the floor)');
}

// --- Throttle guard: an OS rAF cap is reverted, not chased to the floor ------
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-guard');
  r.initRenderer({ isIphone: true });
  const clk = { t: 1 };
  r.noteRendererFrame(clk.t);
  // Constant 35ms frames: emergency-slow, but dropping never speeds them up.
  feed(r, clk, 120, 35);               // past the guard's 2.5s verdict window
  let d = r.rendererDiagnostics();
  assert(d.density === 3 && d.rung === 2, 'an unhelpful drop is reverted to the pre-drop rung');
  assert(d.throttled === true, 'the revert marks the renderer as throttled');
  assert(d.lockedRungs.length === 0 && !d.strikes['3'],
    'the reverted drop revokes the strike it charged and locks nothing');
  feed(r, clk, 200, 35);               // still inside the 30s suspension
  assert(r.rendererDiagnostics().rung === 2, 'drops stay suspended for the cap window');
  // Past the 30s suspension the stall drops again — but a persistent cap is
  // re-detected and reverted, so the drop is transient. Detect that it occurs
  // at all rather than sampling a fixed endpoint.
  let droppedAgain = false;
  for (let i = 0; i < 1200; i++) { clk.t += 35; r.noteRendererFrame(clk.t); if (r.rendererDiagnostics().rung > 2) droppedAgain = true; }
  assert(droppedAgain, 'once the suspension lapses a real stall drops again');
  assert(r.rendererDiagnostics().frozen === true,
    'a second futile drop freezes adaptation so a CPU-bound device stops churning');
}

// --- Session failure memory: a twice-abandoned rung is locked out of recovery -
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-lock');
  r.initRenderer({ isIphone: true });
  const clk = { t: 1 };
  const rung = () => r.rendererDiagnostics().rung;
  r.noteRendererFrame(clk.t);
  // Slow until it drops (strike 1 on rung value 3), then a clean stretch that
  // both satisfies the guard (16ms << the 25ms pre-drop avg) and climbs back.
  feedUntil(r, clk, 25, () => rung() === 3);
  assert(rung() === 3, 'first moderate drop lands at 2.5x');
  feedUntil(r, clk, 16, () => rung() === 2);
  assert(rung() === 2, 'a clean stretch climbs back to 3x');
  // Drop from rung 1 a second time (strike 2 → lock 3). Keep the slow phase
  // short so switching to fast frames next lets the guard keep this drop
  // instead of reverting it as a cap.
  feedUntil(r, clk, 25, () => rung() === 3);
  assert(rung() === 3, 'second moderate drop lands at 2.5x again');
  feed(r, clk, 700, 16);             // a clean stretch that would normally climb
  let d = r.rendererDiagnostics();
  assert(d.rung === 3 && d.density === 2.5, 'recovery is blocked at the locked rung');
  assert(d.lockedRungs.includes(3) && d.strikes['3'] === 2, 'the twice-abandoned 3x rung is locked with two strikes');
  feed(r, clk, 1200, 16);            // 30s of headroom earns one locked re-probe
  d = r.rendererDiagnostics();
  assert(d.rung === 2 && d.density === 3,
    'a locked rung re-probes after a long, sustained 60 FPS recovery');
}

// --- Persistence: seed one rung above the settled value, then settle ---------
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-persist');
  const settles = [];
  r.initRenderer({ isIphone: true }, { savedDensity: 2, onSettle: (v) => settles.push(v) });
  assert(r.rendererDiagnostics().density === 2.5, 'a settled 2x re-seeds one rung above at 2.5x');
  const clk = { t: 1 };
  r.noteRendererFrame(clk.t);
  feed(r, clk, 1600, 18);            // neutral frames (no drop, no climb) past the 25s settle
  assert(settles.length === 1 && settles[0] === 2.5, 'a held rung persists its density exactly once');
  feed(r, clk, 400, 18);
  assert(settles.length === 1, 'a rung already persisted is not written again');
}
// A normal 60 Hz stream with occasional iOS rAF jitter should still recover
// from 2.5x to the measured 3x ceiling. The old controller reset all recovery
// credit on each middle-band interval and never completed this climb.
{
  installDom({ ...PHONE, locationSearch: '?renderer=2d' });
  const r = await import('../src/engine/renderer.js?d-jitter-recovery');
  r.initRenderer({ isIphone: true }, { savedDensity: 2.5 });
  const clk = { t: 1 };
  r.noteRendererFrame(clk.t);
  const pattern = [16.7, 16.7, 17.9, 16.7, 16.7, 18.2];
  for (let i = 0; i < 2200 && r.rendererDiagnostics().density < 3; i++) {
    clk.t += pattern[i % pattern.length];
    r.noteRendererFrame(clk.t);
  }
  assert(r.rendererDiagnostics().density === 3,
    '2D recovery tolerates ordinary 60 Hz rAF jitter and regains 3x');
}
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-persist-clamp');
  r.initRenderer({ isIphone: true }, { savedDensity: 3 });
  assert(r.rendererDiagnostics().density === 3, 'a settled 3x on a phone stays clamped at the 3x seed, not native');
}
{
  const webgl = webglStub();
  installDom({
    ...PHONE,
    locationSearch: '',
    gameGetContext: (type) => (type === 'webgl' ? webgl.gl : undefined),
  });
  const r = await import('../src/engine/renderer.js?d-backend-persist');
  r.initRenderer({ isIphone: true }, {
    savedDensities: { webgl: 'native', '2d': 1.5 },
  });
  const d = r.rendererDiagnostics();
  assert(r.rendererBackend() === 'webgl' && d.rung === 0 && d.density === d.native,
    'WebGL uses only its own persisted density and remembers a proven native rung');
}
{
  installDom({ ...PHONE, locationSearch: '?renderer=2d' });
  const r = await import('../src/engine/renderer.js?d-backend-persist-2d');
  r.initRenderer({ isIphone: true }, {
    savedDensities: { webgl: 1.5, '2d': 3 },
  });
  assert(r.rendererDiagnostics().density === 3,
    'a low WebGL result cannot seed the 2D renderer');
}
{
  installDom({ ...PHONE, locationSearch: '?renderer=2d' });
  const r = await import('../src/engine/renderer.js?d-native-persist');
  const settles = [];
  r.initRenderer({ isIphone: true }, {
    savedDensities: { webgl: 0, '2d': 'native' },
    onSettle: (value, backend) => settles.push({ value, backend }),
  });
  const clk = { t: 1 };
  r.noteRendererFrame(clk.t);
  feed(r, clk, 1600, 18);
  assert(settles.length === 1 && settles[0].value === 'native' && settles[0].backend === '2d',
    'native capability persists explicitly for the backend that proved it');
}

// --- The measured M1 iPad defaults to 2D and can be forced for comparison ----
// Measured on an iPad Pro 12.9 (M1): the WebGL path's per-frame canvas upload is
// bandwidth-capped near 20-25 Mpx/s, so it manages 6 FPS at native where 2D
// holds 60. The post pipeline is not worth a fourteenth of the resolution.
{
  // The WebGL stub is deliberately AVAILABLE here: picking 2D anyway is the
  // whole point, and without it this would pass for the wrong reason (falling
  // back because WebGL was missing rather than choosing 2D on purpose).
  const gl = webglStub().gl;
  installDom({
    innerWidth: 1194, innerHeight: 834, devicePixelRatio: 2,
    gameGetContext: (type) => (type === 'webgl' ? gl : undefined),
  });
  const r = await import('../src/engine/renderer.js?d-ios2d');
  r.initRenderer(detectPlatform({ ua: MAC_UA, maxTouchPoints: 5 }));
  assert(r.rendererBackend() === '2d', 'iPad picks 2D even when WebGL is available');
}
{
  const gl = webglStub().gl;
  installDom({
    innerWidth: 1194, innerHeight: 834, devicePixelRatio: 2, locationSearch: '?renderer=webgl',
    gameGetContext: (type) => (type === 'webgl' ? gl : undefined),
  });
  const r = await import('../src/engine/renderer.js?d-ios-webgl');
  r.initRenderer(detectPlatform({ ua: MAC_UA, maxTouchPoints: 5 }));
  assert(r.rendererBackend() === 'webgl', '?renderer=webgl forces the pipeline back on for comparison');
}
{
  const gl = webglStub().gl;
  installDom({
    innerWidth: 1512, innerHeight: 916, devicePixelRatio: 2,
    gameGetContext: (type) => (type === 'webgl' ? gl : undefined),
  });
  const r = await import('../src/engine/renderer.js?d-desktop-webgl');
  r.initRenderer({ isDesktop: true });
  assert(r.rendererBackend() === 'webgl', 'desktop keeps WebGL — its upload path is not the bottleneck');
}

// --- Desktop renders at native, and a bad past session does not park it soft --
// The adaptive ladder exists for devices with a thermal budget. A desktop starts
// at rung 0 and, unlike phones and tablets, ignores the persisted seed: one slow
// session must not cost it native density on every launch afterwards.
{
  installDom(PHONE);                 // same 4.36875x native, desktop platform flags
  const r = await import('../src/engine/renderer.js?d-desktop');
  r.initRenderer({ isDesktop: true }, { savedDensity: 2 });
  const d = r.rendererDiagnostics();
  assert(d.rung === 0 && d.density === d.native,
    'desktop seeds at native density, not a bounded tier');
  assert(d.density > 4, 'a persisted 2x does not drag a desktop below native');
  assert(d.adaptive === true, 'desktop keeps adaptation armed as a safety net');
}

// --- ?density= pin fixes the density and disables adaptation -----------------
{
  installDom({ ...PHONE, locationSearch: '?density=2' });
  const r = await import('../src/engine/renderer.js?d-pin');
  r.initRenderer({ isIphone: true });
  let d = r.rendererDiagnostics();
  assert(d.density === 2 && d.pinned === 2 && d.adaptive === false, 'a ?density pin fixes density and disables adaptation');
  const clk = { t: 1 };
  r.noteRendererFrame(clk.t);
  feed(r, clk, 200, 40);             // sustained emergency stall is ignored while pinned
  assert(r.rendererDiagnostics().density === 2, 'a pinned density never adapts');
}

// --- WebGL bloom tier gate + overlay-upload skip -----------------------------
{
  const webgl = webglStub();
  // Keep the backend explicit: this test is about the bloom tier, not platform
  // policy, and should remain stable if backend defaults change.
  installDom({ ...PHONE, locationSearch: '?density=1.5&renderer=webgl', gameGetContext: (type) => (type === 'webgl' ? webgl.gl : null) });
  const r = await import('../src/engine/renderer.js?d-bloom');
  r.initRenderer({ isIphone: true });
  assert(r.rendererBackend() === 'webgl', 'the bloom test runs on the WebGL backend');
  assert(r.rendererDiagnostics().bloomSuppressed === true, 'a pinned 1.5x density suppresses bloom');
  r.setFancyFx(true);
  r.setSceneGlow(true);
  let draws = webgl.calls.draws;
  r.blit();
  assert(webgl.calls.draws - draws === 1, 'bloom stays suppressed at 1.5x even with glow effects on');
  // Overlay-upload skip: an empty overlay frame uploads only the world texture.
  let updates = webgl.calls.textureUpdates;
  r.blit();
  assert(webgl.calls.textureUpdates - updates === 1, 'an empty overlay frame uploads only the world texture');
  updates = webgl.calls.textureUpdates;
  r.pushOverlaySprite({}, 0, 0, 1, 1);
  r.blit();
  assert(webgl.calls.textureUpdates - updates === 2, 'a queued overlay adds its own upload');
}

// --- Chrome dirty-flag: repaint only when the button signature changes -------
{
  const dom = installDom({});
  const r = await import('../src/engine/renderer.js?d-chrome');
  r.initRenderer({});
  const clears = () => dom.contextCalls.filter((c) => c.canvas === dom.chromeCanvas && c.method === 'clearRect').length;
  let base = clears(); let painted = 0;
  r.beginChromeFrame(); r.paintChrome('a', () => { painted++; }); r.commitChromeFrame();
  assert(clears() - base === 1 && painted === 1, 'the first paint clears once and runs the painter');
  base = clears(); painted = 0;
  r.beginChromeFrame(); r.paintChrome('a', () => { painted++; }); r.commitChromeFrame();
  assert(clears() - base === 0 && painted === 0, 'an unchanged signature neither clears nor repaints');
  base = clears();
  r.beginChromeFrame(); r.paintChrome('b', () => {}); r.commitChromeFrame();
  assert(clears() - base === 1, 'a changed signature repaints');
  base = clears();
  r.beginChromeFrame(); r.commitChromeFrame();
  assert(clears() - base === 1, 'an empty frame after content clears once');
  base = clears();
  r.beginChromeFrame(); r.commitChromeFrame();
  assert(clears() - base === 0, 'a second empty frame does not clear again');
}

// --- the 1440p ceiling -------------------------------------------------------
// A 5K desktop panel: native lands above 10x, which on the WebGL path would
// mean re-uploading a 4920x2768 world canvas every frame to present art drawn
// at 480x270. The ladder caps at 1440p instead. A pin is deliberately exempt,
// so native stays reachable for side-by-side comparison.
{
  installDom({ locationSearch: '', innerWidth: 2460, innerHeight: 1384, devicePixelRatio: 2 });
  const r = await import('../src/engine/renderer.js?d-cap-5k');
  r.initRenderer(detectPlatform({ ua: MAC_UA, screenW: 2460, screenH: 1384 }));
  const d = r.rendererDiagnostics();
  assert(d.native > 10, `a 5K panel reports its true native density (${d.native})`);
  assert(Math.abs(d.density - 1440 / 270) < 1e-6,
    `and renders at the 1440p ceiling instead (${d.density})`);
  assert(Math.round(480 * d.density) === 2560 && Math.round(270 * d.density) === 1440,
    'which is exactly a 2560x1440 backing store');
  assert(d.ladder.every((v) => v <= 1440 / 270 + 1e-6),
    'no rung on the ladder sits above the cap');
  r.setDensityPin(d.native);
  assert(Math.abs(r.rendererDiagnostics().density - d.native) < 1e-6,
    'an explicit ?density pin still reaches native');
  r.setDensityPin(null);
}

// A display below the cap is untouched by it — the ceiling is still native, and
// a laptop that never asked for this keeps the 1:1 rendering it always had.
{
  installDom({ locationSearch: '', innerWidth: 1440, innerHeight: 900, devicePixelRatio: 1 });
  const r = await import('../src/engine/renderer.js?d-cap-small');
  r.initRenderer(detectPlatform({ ua: MAC_UA, screenW: 1440, screenH: 900 }));
  const d = r.rendererDiagnostics();
  assert(d.native < 1440 / 270, `native sits below the cap (${d.native})`);
  assert(d.density === d.native, 'so the ladder ceiling is still native, unchanged');
}

console.log(failed ? 'DENSITY: FAILED' : 'DENSITY: PASSED');
process.exit(failed ? 1 : 0);
