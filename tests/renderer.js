// Renderer contracts that the generic DOM smoke stub cannot exercise:
// WebGL selection, a claimed-canvas shader failure, GPU resize cleanup and a
// visible failure instead of a silent post-boot black screen.
import { installDom } from './dom-stub.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

function webglStub({ compile = true, drawingBuffer = [1470, 827] } = {}) {
  let id = 0;
  const calls = {
    deletedFramebuffers: 0, deletedTextures: 0, framebuffers: 0,
    viewports: [], textureAllocations: 0, textureUpdates: 0, draws: 0,
  };
  const noop = () => {};
  const gl = new Proxy({
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6,
    TEXTURE_2D: 7, TEXTURE_WRAP_S: 8, TEXTURE_WRAP_T: 9,
    CLAMP_TO_EDGE: 10, TEXTURE_MIN_FILTER: 11, TEXTURE_MAG_FILTER: 12,
    LINEAR: 13, RGBA: 14, UNSIGNED_BYTE: 15,
    COLOR_ATTACHMENT0: 16, FRAMEBUFFER: 17,
    drawingBufferWidth: drawingBuffer[0],
    drawingBufferHeight: drawingBuffer[1],
    createShader: () => ({ id: ++id }),
    getShaderParameter: () => compile,
    getShaderInfoLog: () => 'forced shader compile failure',
    createProgram: () => ({ id: ++id }),
    getProgramParameter: () => true,
    createBuffer: () => ({ id: ++id }),
    createTexture: () => ({ id: ++id }),
    createFramebuffer: () => { calls.framebuffers++; return { id: ++id }; },
    deleteFramebuffer: () => { calls.deletedFramebuffers++; },
    deleteTexture: () => { calls.deletedTextures++; },
    viewport: (...args) => { calls.viewports.push(args); },
    texImage2D: () => { calls.textureAllocations++; },
    texSubImage2D: () => { calls.textureUpdates++; },
    drawArrays: () => { calls.draws++; },
  }, {
    get(target, key) { return key in target ? target[key] : noop; },
  });
  return { gl, calls };
}

// glfx itself reports the difference between "WebGL absent" and "WebGL
// claimed this canvas, then failed", prefers WebGL 1, and retires old FBOs.
{
  const { glfx } = await import('../src/engine/glfx.js?renderer-unit');
  const requested = [];
  const noContext = glfx.init({ getContext(type) { requested.push(type); return null; } });
  assert(!noContext.ok && !noContext.claimed && !noContext.error,
    'unavailable WebGL is reported without claiming the canvas');
  assert(requested[0] === 'webgl' && !requested.includes('webgl2'),
    'effects request WebGL 1 rather than WebGL 2');

  const good = webglStub();
  const ready = glfx.init({ getContext: () => good.gl });
  assert(ready.ok && ready.claimed && glfx.active,
    'successful WebGL setup reports an active claimed canvas');
  glfx.resize(1920, 1080);
  const made = good.calls.framebuffers;
  const allocated = good.calls.textureAllocations;
  glfx.resize(1920, 1080);
  assert(good.calls.framebuffers === made, 'same-size viewport events reuse bloom framebuffers');
  assert(good.calls.textureAllocations === allocated,
    'same-size viewport events reuse allocated upload textures');
  glfx.resize(1600, 900);
  assert(good.calls.deletedFramebuffers === 2 && good.calls.deletedTextures === 2,
    'a real resize deletes both superseded bloom framebuffer pairs');
  glfx.fx = 1; glfx.glow = 1;
  const allocationsBeforeRender = good.calls.textureAllocations;
  const drawsBeforeBloom = good.calls.draws;
  glfx.render({ width: 1600, height: 900 }, { width: 1600, height: 900 }, 0, 0);
  assert(good.calls.textureUpdates === 2 && good.calls.textureAllocations === allocationsBeforeRender,
    'each frame updates two preallocated textures without redefining them');
  assert(good.calls.draws - drawsBeforeBloom === 4,
    'enabled scene glow runs three bloom passes and the final composite');
  const finalViewport = good.calls.viewports[good.calls.viewports.length - 1];
  assert(finalViewport[2] === 1470 && finalViewport[3] === 827,
    'final pass uses ANGLE actual drawing-buffer size when canvas backing size is clamped');
  glfx.glow = 0;
  const drawsBeforeNoGlow = good.calls.draws;
  glfx.render({ width: 1600, height: 900 }, { width: 1600, height: 900 }, 0, 0);
  assert(good.calls.draws - drawsBeforeNoGlow === 1,
    'disabled scene glow skips the bright and both blur passes');
  glfx.glow = 1; glfx.fx = 0;
  const drawsBeforeFxOff = good.calls.draws;
  glfx.render({ width: 1600, height: 900 }, { width: 1600, height: 900 }, 0, 0);
  assert(good.calls.draws - drawsBeforeFxOff === 1,
    'Glow Effects off skips the bright and both blur passes');
  // Adaptive-density tier gate: at a low render density the bloom passes are
  // suppressed even with Glow Effects and scene glow both on.
  glfx.fx = 1; glfx.glow = 1; glfx.setTierFx(false);
  const drawsBeforeTierOff = good.calls.draws;
  glfx.render({ width: 1600, height: 900 }, { width: 1600, height: 900 }, 0, 0);
  assert(good.calls.draws - drawsBeforeTierOff === 1,
    'a low render-density tier suppresses the bright and both blur passes');
  glfx.setTierFx(true);
  const drawsBeforeTierOn = good.calls.draws;
  glfx.render({ width: 1600, height: 900 }, { width: 1600, height: 900 }, 0, 0);
  assert(good.calls.draws - drawsBeforeTierOn === 4,
    'restoring the tier runs the three bloom passes again');
  // A null overlay (a frame that queued no overlay draws) skips its upload and
  // binds the 1x1 stand-in: one texture update, not two, and no throw.
  const updatesBeforeNull = good.calls.textureUpdates;
  glfx.render({ width: 1600, height: 900 }, null, 0, 0);
  assert(good.calls.textureUpdates - updatesBeforeNull === 1,
    'a null overlay uploads only the world texture');
}

// Force the Android-shaped failure: WebGL returns a context, then its shader
// compiler rejects the program. The renderer must replace the claimed canvas
// before obtaining 2D, and Input must subsequently bind to that replacement.
const broken = webglStub({ compile: false });
const requested = [];
const dom = installDom({
  gameGetContext(type) {
    requested.push(type);
    if (type === 'webgl') return broken.gl;
    return null; // a claimed real canvas cannot later return 2D
  },
});
const original = dom.originalCanvas;
const renderer = await import('../src/engine/renderer.js');
const warn = console.warn;
console.warn = () => {};
renderer.initRenderer();
console.warn = warn;
assert(renderer.rendererBackend() === '2d', 'shader failure selects the 2D renderer');
assert(dom.canvas !== original && dom.canvas.id === 'game',
  'shader failure replaces the claimed canvas while preserving #game');
assert(requested[0] === 'webgl' && !requested.includes('webgl2'),
  'display renderer also prefers WebGL 1');
try {
  renderer.blit();
  assert(true, 'the first 2D fallback frame draws without throwing');
} catch (error) {
  assert(false, `the first 2D fallback frame threw: ${error.message}`);
}

const { Input } = await import('../src/engine/input.js');
Input.init();
assert((dom.listeners['canvas:pointerdown'] || []).length > 0,
  'input binds after fallback to the replacement #game canvas');

// If neither backend exists, initialization must stop immediately instead of
// arming a frame that will dereference a null drawing context.
const noBackendDom = installDom({ gameGetContext: () => null });
const noBackendRenderer = await import('../src/engine/renderer.js?no-backend');
let noBackendError = null;
try {
  noBackendRenderer.initRenderer();
} catch (error) {
  noBackendError = error;
}
assert(noBackendError && noBackendError.message.includes('No usable WebGL or 2D'),
  'missing WebGL and 2D backends fail explicitly during initialization');

// A URL escape hatch makes device diagnosis independent of whether a virtual
// GPU claims to support WebGL. It must select 2D before WebGL claims #game.
const forced2DDom = installDom({ locationSearch: '?renderer=2d' });
const forced2DRenderer = await import('../src/engine/renderer.js?forced-2d');
forced2DRenderer.initRenderer();
assert(forced2DRenderer.rendererBackend() === '2d' && window.__mash_renderer === '2d',
  '?renderer=2d bypasses WebGL and exposes the selected backend');
forced2DRenderer.pushOverlayDraw(() => {});
forced2DRenderer.blit();
const displayCalls = forced2DDom.contextCalls.filter((call) => call.canvas === forced2DDom.canvas);
const worldBlit = displayCalls.findIndex((call) => call.method === 'drawImage');
assert(worldBlit >= 0 && !displayCalls.slice(worldBlit + 1).some((call) => call.method === 'clearRect'),
  '2D overlays do not clear the scrolling world after it is composited');
assert(displayCalls.filter((call) => call.method === 'drawImage').length === 2,
  '2D fallback composites its isolated overlay canvas over the scrolling world');

// High-density phones seed at the 3x rung below native, adapt down after a
// sustained miss, and keep the full CSS viewport fit while the separate touch
// chrome is capped at 2x. (Deep controller behaviour lives in tests/density.js;
// this suite just proves the seed, geometry, and one drop.)
const phoneDom = installDom({
  locationSearch: '?renderer=2d',
  innerWidth: 852,
  innerHeight: 393,
  devicePixelRatio: 3,
});
const phoneRenderer = await import('../src/engine/renderer.js?phone-density');
phoneRenderer.initRenderer({ isIphone: true });
let phoneDiag = phoneRenderer.rendererDiagnostics();
assert(phoneDiag.adaptive && phoneDiag.rung === 1 && phoneDiag.density === 3,
  'high-density phones seed at the 3x rung below native');
assert(phoneDom.canvas.width === 1440 && phoneDom.canvas.style.width === '699px',
  'phone render density changes backing pixels without changing CSS fit');
assert(phoneDom.chromeCanvas.width === 1704,
  'phone touch chrome backing density is capped at 2x');

let phoneNow = 1;
phoneRenderer.noteRendererFrame(phoneNow);
for (let i = 0; i < 55; i++) {
  phoneNow += 25;
  phoneRenderer.noteRendererFrame(phoneNow);
}
phoneDiag = phoneRenderer.rendererDiagnostics();
assert(phoneDiag.rung === 2 && phoneDiag.density === 2.5,
  'a sustained second below 52 FPS steps a phone down one rung to 2.5x');

// The same viewport on desktop is adaptive too now, but its ceiling is native
// density (the top rung) rather than a fixed platform cap.
const desktopDom = installDom({
  locationSearch: '?renderer=2d',
  innerWidth: 852,
  innerHeight: 393,
  devicePixelRatio: 3,
});
const desktopRenderer = await import('../src/engine/renderer.js?desktop-density');
desktopRenderer.initRenderer({ isDesktop: true });
let desktopDiag = desktopRenderer.rendererDiagnostics();
assert(desktopDiag.adaptive && desktopDiag.rung === 0
  && desktopDom.canvas.width === Math.round(699 * 3),
  'desktop seeds at native density (the ceiling rung) and is adaptive');
let deskNow = 1;
desktopRenderer.noteRendererFrame(deskNow);
for (let i = 0; i < 55; i++) {
  deskNow += 25;
  desktopRenderer.noteRendererFrame(deskNow);
}
desktopDiag = desktopRenderer.rendererDiagnostics();
assert(desktopDiag.rung === 1 && desktopDiag.density === 3,
  'desktop drops from native to the 3x rung under sustained slowness');

// A failure inside the first scheduled frame happens after main marks boot
// complete. It still needs to stop the loop and show a useful error.
const { startLoop } = await import('../src/engine/loop.js');
const error = console.error;
console.error = () => {};
startLoop({ update() {}, draw() { throw new Error('forced first-frame failure'); } });
desktopDom.frame();
console.error = error;
assert(desktopDom.bootErrorEl.style.display === 'block'
  && desktopDom.bootErrorEl.textContent.includes('forced first-frame failure'),
'a first-frame failure displays the fatal-error panel');

console.log(failed ? 'RENDERER: FAILED' : 'RENDERER: PASSED');
process.exit(failed ? 1 : 0);
