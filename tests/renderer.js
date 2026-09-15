// Renderer contracts that the generic DOM smoke stub cannot exercise:
// WebGL selection, a claimed-canvas shader failure, GPU resize cleanup and a
// visible failure instead of a silent post-boot black screen.
import { installDom } from './dom-stub.js';
const {
  defaultFrame, fitPhonePortraitViewport, frameForViewport,
  DESKTOP_PORTRAIT_LANDSCAPE_FALLBACK_HEIGHT,
  PHONE_PORTRAIT_ASPECT_RATIO,
} = await import('../src/engine/frame.js');

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
    uniforms: [],
    // Ordered bind/draw log, so a test can ask what a specific pass was
    // sampling rather than only how many passes ran.
    events: [],
  };
  let unit = 0;
  const noop = () => {};
  const gl = new Proxy({
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6,
    TEXTURE_2D: 7, TEXTURE_WRAP_S: 8, TEXTURE_WRAP_T: 9,
    CLAMP_TO_EDGE: 10, TEXTURE_MIN_FILTER: 11, TEXTURE_MAG_FILTER: 12,
    LINEAR: 13, RGBA: 14, UNSIGNED_BYTE: 15,
    COLOR_ATTACHMENT0: 16, FRAMEBUFFER: 17, TEXTURE0: 33984,
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
    activeTexture: (u) => { unit = u - 33984; },
    getUniformLocation: (_program, name) => name,
    uniform1f: (location, value) => { calls.uniforms.push({ location, value }); },
    bindTexture: (target, tex) => { calls.events.push({ kind: 'bind', unit, tex }); },
    drawArrays: () => { calls.draws++; calls.events.push({ kind: 'draw' }); },
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
  assert(good.calls.deletedFramebuffers === 2 && good.calls.deletedTextures === 3,
    'a real resize deletes the superseded bloom framebuffer pair and glow mask');
  glfx.glow = 1;
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
  // The title sky target is lazy: ordinary WebGL screens do not pay its FBO
  // allocation, and the first title frame creates it at half resolution.
  glfx.sky = 1; glfx.skyValid = false; glfx.time = 0;
  const skyFbosBefore = good.calls.framebuffers;
  const drawsBeforeSky = good.calls.draws;
  const eventsBeforeSky = good.calls.events.length;
  glfx.render({ width: 1600, height: 900 }, { width: 1600, height: 900 }, 0, 0);
  assert(good.calls.framebuffers === skyFbosBefore + 1,
    'title sky allocates one lazy half-resolution target on first use');
  assert(good.calls.draws - drawsBeforeSky === 5,
    'title sky adds one half-resolution sky pass to bloom and final composite');
  // The final composite adds the sky target back as `sky * (1 - alpha)`, which
  // is only correct while that target holds the sky ALONE. Sampling the
  // backbuffer in the sky pass bakes the whole frame into it, and every pixel
  // the frame does not cover opaquely then gets a second copy of the screen
  // added underneath — invisible while the two agree, a doubled UI the moment
  // a density change puts them at different scales.
  const skyEvents = good.calls.events.slice(eventsBeforeSky);
  const skyPassEnd = skyEvents.findIndex((e) => e.kind === 'draw');
  let skySource = null;
  for (const e of skyEvents.slice(0, skyPassEnd)) if (e.kind === 'bind' && e.unit === 0) skySource = e.tex;
  assert(skySource === glfx.texOvBlank,
    'the sky pass samples the blank stand-in, never the backbuffer, so the sky target holds sky only');
  glfx.sky = 0; glfx.skyValid = false;
  glfx.glow = 0;
  const drawsBeforeNoGlow = good.calls.draws;
  glfx.render({ width: 1600, height: 900 }, { width: 1600, height: 900 }, 0, 0);
  assert(good.calls.draws - drawsBeforeNoGlow === 1,
    'disabled scene glow skips the bright and both blur passes');
  const noGlowFx = good.calls.uniforms.filter((u) => u.location === 'uFx').at(-1);
  const noGlowVignette = good.calls.uniforms.filter((u) => u.location === 'uApplyVignette').at(-1);
  assert(noGlowFx?.value === 0 && noGlowVignette?.value === 0,
    'disabled scene glow removes aberration and vignette from menu text');
  // Adaptive-density tier gate: at a low render density the bloom passes are
  // suppressed even with scene glow on.
  glfx.glow = 1; glfx.setTierFx(false);
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
  'input binds to the pointer surface (#chrome) after the 2D fallback has replaced #game');

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
forced2DRenderer.beginRenderFrame();
assert(forced2DRenderer.bctx.canvas === forced2DDom.canvas,
  '2D states paint directly into the visible game canvas');
forced2DRenderer.pushOverlayDraw(() => {});
forced2DRenderer.blit();
const displayCalls = forced2DDom.contextCalls.filter((call) => call.canvas === forced2DDom.canvas);
const worldBlit = displayCalls.findIndex((call) => call.method === 'drawImage');
assert(worldBlit >= 0 && !displayCalls.slice(worldBlit + 1).some((call) => call.method === 'clearRect'),
  '2D overlays do not clear the scrolling world after it is composited');
assert(displayCalls.filter((call) => call.method === 'drawImage').length === 1,
  'direct 2D composites only its isolated overlay canvas, not a copied world');
const displayBeforeMerge = forced2DDom.contextCalls.filter((call) => call.canvas === forced2DDom.canvas).length;
forced2DRenderer.setOverlayMerge(true);
forced2DRenderer.pushOverlayDraw(() => {});
forced2DRenderer.blit();
const mergeCalls = forced2DDom.contextCalls
  .filter((call) => call.canvas === forced2DDom.canvas)
  .slice(displayBeforeMerge);
assert(mergeCalls.filter((call) => call.method === 'drawImage').length === 0,
  'merged 2D overlays paint directly with no display blit');
forced2DRenderer.setOverlayMerge(false);

// The WebGL title path should upload one combined backbuffer when the merge
// switch is active, not the world plus a second full-size overlay texture.
const mergedGl = webglStub();
const mergedGlDom = installDom({ gameGetContext(type) { return type === 'webgl' ? mergedGl.gl : null; } });
const mergedGlRenderer = await import('../src/engine/renderer.js?merged-gl');
mergedGlRenderer.initRenderer({ isIphone: true });
mergedGlRenderer.setOverlayMerge(true);
const mergedUploadsBefore = mergedGl.calls.textureUpdates;
mergedGlRenderer.pushOverlayDraw(() => {});
mergedGlRenderer.blit();
assert(mergedGl.calls.textureUpdates - mergedUploadsBefore === 1,
  'merged WebGL title foreground uploads one combined frame');
mergedGlRenderer.setOverlayMerge(false);

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
assert(phoneDiag.adaptive && phoneDiag.rung === 2 && phoneDiag.density === 3,
  'high-density phones seed at the 3x rung, below both native and the 4x rung');
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
assert(phoneDiag.rung === 3 && phoneDiag.density === 2.5,
  'a sustained second below 52 FPS steps a phone down one rung to 2.5x');

// The dev menu is allowed to be dense because it is a review surface, not a
// gameplay frame. Its canvas backing must match the visible CSS box in both
// orientations; otherwise portrait pre-compresses the glyphs into the ordinary
// 480x270 surface and the browser magnifies those few rows across the phone.
const devPortraitDom = installDom({
  locationSearch: '?renderer=2d',
  innerWidth: 390,
  innerHeight: 844,
  devicePixelRatio: 3,
});
const devPortraitRenderer = await import('../src/engine/renderer.js?dev-overlay-portrait');
devPortraitRenderer.initRenderer({ isIphone: true });
devPortraitRenderer.setDevPortraitFill(true);
assert(devPortraitDom.canvas.width === 1170 && devPortraitDom.canvas.height === 2532,
  'portrait dev overlay uses a device-pixel backing for the full visible phone');
assert(devPortraitRenderer.screen.dpy > devPortraitRenderer.screen.dpx * 3,
  'portrait dev overlay keeps the tall Y backing explicit instead of hiding it in a CSS stretch');
devPortraitRenderer.setDevPortraitFill(false);
assert(devPortraitDom.canvas.width === 1170 && devPortraitDom.canvas.height === 658,
  'closing the portrait dev overlay restores the bounded gameplay backing');

const devLandscapeDom = installDom({
  locationSearch: '?renderer=2d',
  innerWidth: 852,
  innerHeight: 393,
  devicePixelRatio: 3,
});
const devLandscapeRenderer = await import('../src/engine/renderer.js?dev-overlay-landscape');
devLandscapeRenderer.initRenderer({ isIphone: true });
devLandscapeRenderer.setDevPortraitFill(true);
assert(devLandscapeDom.canvas.width === 2097 && devLandscapeDom.canvas.height === 1179,
  'landscape dev overlay uses the visible letterboxed box at device density too');
devLandscapeRenderer.setDevPortraitFill(false);
assert(devLandscapeDom.canvas.width === 1440 && devLandscapeDom.canvas.height === 810,
  'closing the landscape dev overlay restores the bounded gameplay backing');

// A portrait sound-test visualiser stays on the frame-based phone surface.
// It must not switch back to the old 16:9 cover crop when its fullscreen fade
// completes, and its backing must retain the frame's uniform aspect ratio.
const visualPortraitDom = installDom({
  locationSearch: '?renderer=2d',
  innerWidth: 390,
  innerHeight: 844,
  devicePixelRatio: 3,
});
const visualPortraitRenderer = await import('../src/engine/renderer.js?visualiser-portrait');
const visualPortraitFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
});
visualPortraitRenderer.setPresentationFrame(visualPortraitFrame);
visualPortraitRenderer.initRenderer({ isIphone: true });
visualPortraitRenderer.setVisualiserFullscreen(true);
assert(visualPortraitRenderer.screen.presentationMode === 'phone-portrait'
  && visualPortraitRenderer.screen.cssW === 390
  && visualPortraitRenderer.screen.cssH === 844
  && visualPortraitRenderer.screen.portraitFill === false
  && visualPortraitDom.canvas.style.objectFit === '',
  'portrait visualisers use the full frame without falling back to a cropped cover surface');
assert(Math.abs(visualPortraitRenderer.screen.dpx - visualPortraitRenderer.screen.dpy) < 1e-9
  && Math.abs(visualPortraitDom.canvas.height / visualPortraitDom.canvas.width
    - visualPortraitFrame.height / visualPortraitFrame.width) < 1e-9,
  'portrait visualiser backing keeps uniform native pixels across the full logical height');
visualPortraitRenderer.setVisualiserFullscreen(false);
visualPortraitRenderer.setPresentationFrame(defaultFrame());

// The same viewport on desktop renders at full native density from the first
// frame — no seed, no climb. A desktop has no thermal budget to protect, and
// starting it soft was a visible quality regression on Retina displays. The
// ladder stays armed below it for a machine that genuinely cannot hold 60 FPS.
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
  && desktopDiag.density === desktopDiag.native && desktopDom.canvas.width === 2097,
  'desktop renders at full native density and keeps adaptation armed');
let deskNow = 1;
desktopRenderer.noteRendererFrame(deskNow);
for (let i = 0; i < 55; i++) {
  deskNow += 25;
  desktopRenderer.noteRendererFrame(deskNow);
}
desktopDiag = desktopRenderer.rendererDiagnostics();
assert(desktopDiag.rung === 1 && desktopDiag.density === 4,
  'desktop still steps down off native under sustained slowness');

// Desktop portrait presentation is a contained phone surface rather than a
// new composition for every tall window. The fit helper leaves the full height
// available when necessary, and the renderer keeps the chrome inside that same
// phone-shaped rectangle.
const phoneFit = fitPhonePortraitViewport({ viewportWidth: 600, viewportHeight: 1000 });
assert(Math.abs(phoneFit.height / phoneFit.width - PHONE_PORTRAIT_ASPECT_RATIO) < 1e-12
  && phoneFit.width === 450 && phoneFit.height === 1000,
  'desktop portrait fit resolves the common 20:9 phone surface');
window.innerWidth = 600;
window.innerHeight = 1000;
const desktopPortraitFrame = desktopRenderer.setPresentationMode('portrait');
assert(Math.abs(desktopPortraitFrame.height / desktopPortraitFrame.width
  - PHONE_PORTRAIT_ASPECT_RATIO) < 1e-12
  && desktopDom.canvas.style.width === '450px'
  && desktopDom.canvas.style.height === '1000px'
  && desktopDom.canvas.style.left === '75px'
  && desktopDom.documentElement.style.backgroundColor === '#000'
  && desktopDom.body.style.backgroundColor === '#000',
  'desktop portrait canvas is contained and centred with black letterbox bars');
const portraitChromeXs = desktopRenderer.chrome.run
  .filter((b) => b.r != null).map((b) => b.x);
assert(portraitChromeXs.every((x) => x >= 75 && x <= 525),
  'desktop portrait touch chrome stays inside the contained canvas');
window.innerHeight = DESKTOP_PORTRAIT_LANDSCAPE_FALLBACK_HEIGHT - 1;
const shortDesktopFrame = desktopRenderer.setPresentationMode('portrait');
assert(shortDesktopFrame.mode === 'landscape'
  && desktopDom.canvas.style.width === '600px'
  && desktopDom.canvas.style.height === '338px'
  && desktopDom.canvas.style.top === '190px'
  && desktopDom.documentElement.style.backgroundColor === '#000',
  'short desktop portrait falls back to the authored 16:9 canvas with black bars');
window.innerHeight = 1000;
desktopRenderer.setPresentationMode('portrait');
window.innerWidth = 852;
window.innerHeight = 393;
desktopRenderer.setPresentationMode('landscape');

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
