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
const PHONE = { locationSearch: '?renderer=2d', innerWidth: 852, innerHeight: 393, devicePixelRatio: 3 };
// Phone native = 852-fit cssW 699 * dpr 3 / 480 = 4.36875 → ladder below:
const LADDER = [4.36875, 3, 2.5, 2, 1.5, 1];

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

// --- iPad (masquerading as macOS) is adaptive now, seeded at the 3x rung ------
{
  installDom({ innerWidth: 1194, innerHeight: 834, devicePixelRatio: 2 });
  const r = await import('../src/engine/renderer.js?d-ipad');
  const platform = detectPlatform({ ua: MAC_UA, maxTouchPoints: 5 });
  assert(platform.isIpad && !platform.isIphone, 'modern iPad UA + touch points detects as iPad');
  r.initRenderer(platform);
  const d = r.rendererDiagnostics();
  assert(d.adaptive && d.rung === 1 && d.density === 3,
    'iPad is adaptive and seeds at the 3x rung below native');
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
  assert(d.density === 2 && d.rung === 3, 'a half-second of >33ms frames drops two rungs to 2x');
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
  assert(r.rendererDiagnostics().rung === 3, 'a hard stall drops two rungs in one probe (to 2x)');
  feed(r, clk, 30, 40);                 // still stalling, but the probe is unresolved
  assert(r.rendererDiagnostics().rung === 3,
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
  assert(d.density === 3 && d.rung === 1, 'an unhelpful drop is reverted to the pre-drop rung');
  assert(d.throttled === true, 'the revert marks the renderer as throttled');
  assert(d.lockedRungs.length === 0 && !d.strikes['3'],
    'the reverted drop revokes the strike it charged and locks nothing');
  feed(r, clk, 200, 35);               // still inside the 30s suspension
  assert(r.rendererDiagnostics().rung === 1, 'drops stay suspended for the cap window');
  // Past the 30s suspension the stall drops again — but a persistent cap is
  // re-detected and reverted, so the drop is transient. Detect that it occurs
  // at all rather than sampling a fixed endpoint.
  let droppedAgain = false;
  for (let i = 0; i < 1200; i++) { clk.t += 35; r.noteRendererFrame(clk.t); if (r.rendererDiagnostics().rung > 1) droppedAgain = true; }
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
  feedUntil(r, clk, 25, () => rung() === 2);
  assert(rung() === 2, 'first moderate drop lands at 2.5x');
  feedUntil(r, clk, 16, () => rung() === 1);
  assert(rung() === 1, 'a clean stretch climbs back to 3x');
  // Drop from rung 1 a second time (strike 2 → lock 3). Keep the slow phase
  // short so switching to fast frames next lets the guard keep this drop
  // instead of reverting it as a cap.
  feedUntil(r, clk, 25, () => rung() === 2);
  assert(rung() === 2, 'second moderate drop lands at 2.5x again');
  feed(r, clk, 700, 16);             // a clean stretch that would normally climb
  const d = r.rendererDiagnostics();
  assert(d.rung === 2 && d.density === 2.5, 'recovery is blocked at the locked rung');
  assert(d.lockedRungs.includes(3) && d.strikes['3'] === 2, 'the twice-abandoned 3x rung is locked with two strikes');
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
{
  installDom(PHONE);
  const r = await import('../src/engine/renderer.js?d-persist-clamp');
  r.initRenderer({ isIphone: true }, { savedDensity: 3 });
  assert(r.rendererDiagnostics().density === 3, 'a settled 3x on a phone stays clamped at the 3x seed, not native');
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
  installDom({ ...PHONE, locationSearch: '?density=1.5', gameGetContext: (type) => (type === 'webgl' ? webgl.gl : null) });
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

console.log(failed ? 'DENSITY: FAILED' : 'DENSITY: PASSED');
process.exit(failed ? 1 : 0);
