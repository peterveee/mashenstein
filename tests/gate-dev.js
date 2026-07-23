// A browser-only iPhone may load the game from `npm run dev`. Production never
// receives this shell flag; build-shell.js verifies that separately.
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.hidden = false;
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener() {}
  querySelector() { return null; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
}

const body = new El('body');
const head = new El('head');
globalThis.document = {
  readyState: 'complete',
  baseURI: 'http://192.168.1.20:8000/',
  body,
  head,
  createElement: (tag) => new El(tag),
  getElementById: () => null,
};
globalThis.window = {
  __MASH_DEV__: true,
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1',
    maxTouchPoints: 5,
    standalone: false,
  },
});
globalThis.requestAnimationFrame = (fn) => { fn(); return 1; };

await import('../src/gate.js');

assert(window.__mash_platform.allowed === true
  && window.__mash_platform.devBrowserBypass === true,
  'dev shell permits a browser-only iPhone');
assert(body.children.some((el) => el.innerHTML.includes('<canvas id="game">')),
  'dev iPhone creates the game canvases');
assert(body.children.some((el) => el.tagName === 'SCRIPT'),
  'dev iPhone requests the game bundle');
assert(!body.children.some((el) => el.className === 'mash-install-blocker'),
  'dev iPhone does not show the installation blocker');

console.log(failed ? 'DEV MOBILE GATE: FAILED' : 'DEV MOBILE GATE: OK');
process.exit(failed ? 1 : 0);
