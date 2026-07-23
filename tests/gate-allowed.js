// Allowed platforms receive the canvases, deferred game script and game fonts.
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
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
}

const body = new El('body');
const head = new El('head');
globalThis.document = {
  readyState: 'complete',
  baseURI: 'https://example.test/mashenstein/',
  body,
  head,
  createElement: (tag) => new El(tag),
  getElementById: () => null,
};
globalThis.window = {
  __MASH_BUILT_AT__: '2026-07-23T04:05:06.000Z',
  matchMedia: () => ({ matches: false }),
  addEventListener() {},
};
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130 Safari/537.36',
    maxTouchPoints: 0,
    standalone: false,
  },
});

await import('../src/gate.js');

assert(body.children.length === 3, 'allowed platform creates shell, portrait overlay and script');
assert(body.children[0].id === 'game-shell' && body.children[0].innerHTML.includes('<canvas id="game">'),
  'allowed platform creates game canvases');
assert(body.children[1].id === 'portrait-overlay'
  && body.children[1].attrs.role === 'dialog'
  && body.children[1].attrs['aria-modal'] === 'true',
  'allowed platform creates accessible portrait dialog');
assert(body.children[1].innerHTML.includes('BUILD:') && body.children[1].innerHTML.includes('2026'),
  'portrait dialog shows the localized production build date and time');
const script = body.children[2];
assert(script.tagName === 'SCRIPT' && script.src === 'https://example.test/mashenstein/game.js',
  'allowed platform requests the path-relative deferred game bundle');
assert(head.children.some((el) => el.id === 'mash-game-fonts'), 'allowed platform loads game fonts');
assert(window.__mash_platform.allowed === true, 'gate records allowed platform policy');

console.log(failed ? 'ALLOWED GATE: FAILED' : 'ALLOWED GATE: OK');
process.exit(failed ? 1 : 0);
