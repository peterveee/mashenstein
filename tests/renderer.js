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
  const calls = { deletedFramebuffers: 0, deletedTextures: 0, framebuffers: 0, viewports: [] };
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
  glfx.resize(1920, 1080);
  assert(good.calls.framebuffers === made, 'same-size viewport events reuse bloom framebuffers');
  glfx.resize(1600, 900);
  assert(good.calls.deletedFramebuffers === 2 && good.calls.deletedTextures === 2,
    'a real resize deletes both superseded bloom framebuffer pairs');
  glfx.render({ width: 2573, height: 1446 }, { width: 2573, height: 1446 }, 0, 0);
  const finalViewport = good.calls.viewports[good.calls.viewports.length - 1];
  assert(finalViewport[2] === 1470 && finalViewport[3] === 827,
    'final pass uses ANGLE actual drawing-buffer size when canvas backing size is clamped');
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

// A failure inside the first scheduled frame happens after main marks boot
// complete. It still needs to stop the loop and show a useful error.
const { startLoop } = await import('../src/engine/loop.js');
const error = console.error;
console.error = () => {};
startLoop({ update() {}, draw() { throw new Error('forced first-frame failure'); } });
forced2DDom.frame();
console.error = error;
assert(forced2DDom.bootErrorEl.style.display === 'block'
  && forced2DDom.bootErrorEl.textContent.includes('forced first-frame failure'),
'a first-frame failure displays the fatal-error panel');

console.log(failed ? 'RENDERER: FAILED' : 'RENDERER: PASSED');
process.exit(failed ? 1 : 0);
