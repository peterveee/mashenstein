// Minimal DOM/browser stubs so the bundle can boot headlessly in Node.
export function installDom({ gameGetContext = null, locationSearch = '' } = {}) {
  const listeners = {};
  const contextCalls = [];
  const noop = () => {};
  const gradient = { addColorStop: noop };

  function makeCtx() {
    return new Proxy({
      canvas: null,
      fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, font: '',
      imageSmoothingEnabled: false, globalCompositeOperation: 'source-over',
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      measureText: () => ({ width: 0 }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      clearRect(...args) { contextCalls.push({ method: 'clearRect', canvas: this.canvas, args }); },
      drawImage(...args) { contextCalls.push({ method: 'drawImage', canvas: this.canvas, args }); },
    }, {
      get(t, k) {
        if (k in t) return t[k];
        return noop; // every unknown method is a no-op
      },
      set(t, k, v) { t[k] = v; return true; },
    });
  }

  let gameCanvas = null;

  function makeCanvas(customGetContext = null) {
    const c = {
      id: '',
      width: 480, height: 270,
      style: {},
      getContext: (type, opts) => {
        if (customGetContext) return customGetContext(type, opts, c);
        if (type !== '2d') return null;
        const x = makeCtx(); x.canvas = c; return x;
      },
      addEventListener: (ev, fn) => { (listeners['canvas:' + ev] ||= []).push(fn); },
      removeEventListener: noop,
      cloneNode: () => {
        const clone = makeCanvas();
        clone.id = c.id;
        clone.width = c.width;
        clone.height = c.height;
        clone.style = { ...c.style };
        return clone;
      },
      replaceWith: (replacement) => {
        if (gameCanvas === c) gameCanvas = replacement;
      },
    };
    return c;
  }

  const canvas = makeCanvas(gameGetContext);
  canvas.id = 'game';
  gameCanvas = canvas;
  // The second canvas renderer.js looks up, for touch chrome out in the
  // letterbox margin. It has to be a real stub canvas: everything else here
  // falls through to bootErrorEl, which has no getContext, so #chrome resolving
  // to that threw at module scope and took all sixteen suites down with it
  // before a single test ran.
  const chromeCanvas = makeCanvas();
  const bootErrorEl = { style: {}, textContent: '' };

  globalThis.document = {
    readyState: 'complete',
    hidden: false,
    activeElement: null,
    getElementById: (id) => {
      if (id === 'game') return gameCanvas;
      if (id === 'chrome') return chromeCanvas;
      if (id === 'boot-error') return bootErrorEl;
      return null;
    },
    createElement: () => makeCanvas(),
    addEventListener: (ev, fn) => { (listeners['doc:' + ev] ||= []).push(fn); },
  };

  const rafQueue = [];
  globalThis.window = {
    innerWidth: 960, innerHeight: 540,
    devicePixelRatio: 1,
    location: { search: locationSearch },
    addEventListener: (ev, fn) => { (listeners['win:' + ev] ||= []).push(fn); },
    removeEventListener: noop,
    AudioContext: undefined, // audio engine no-ops without it
  };
  // Path2D only ever gets built and handed straight back to ctx.fill/clip/stroke,
  // which are themselves no-ops here, so an object that swallows every method is
  // enough. The style packs cache these at module level to avoid rebuilding
  // paths per frame, so the constructor has to exist for the bundle to boot.
  globalThis.Path2D = function Path2D() {
    return new Proxy({}, { get: () => noop, set: () => true });
  };
  globalThis.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
  let now = 0;
  globalThis.performance = { now: () => now };
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [] }, configurable: true });
  globalThis.setInterval = globalThis.setInterval || ((fn, ms) => 0);

  return {
    listeners,
    contextCalls,
    get canvas() { return gameCanvas; },
    originalCanvas: canvas,
    bootErrorEl,
    store,
    fire(key, ev) { for (const fn of listeners[key] || []) fn(ev); },
    key(code) {
      this.fire('win:keydown', { code, repeat: false, preventDefault: noop });
      this.fire('win:keyup', { code, preventDefault: noop });
    },
    keyDown(code) { this.fire('win:keydown', { code, repeat: false, preventDefault: noop }); },
    keyUp(code) { this.fire('win:keyup', { code, preventDefault: noop }); },
    frame(dtMs = 16.7) {
      now += dtMs;
      const q = rafQueue.splice(0, rafQueue.length);
      for (const fn of q) fn(now);
    },
    now: () => now,
  };
}
