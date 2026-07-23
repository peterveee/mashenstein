// Execute the tiny pre-game gate in a browser-only iPhone environment. The
// full game must remain absent: no canvases, font links or game script.
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
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener() {}
  querySelector(selector) {
    if (selector !== '[data-dialog-heading]') return null;
    return { focus() {} };
  }
  appendChild(child) { this.children.push(child); return child; }
}

const body = new El('body');
const head = new El('head');
const ids = {};
globalThis.document = {
  readyState: 'complete',
  baseURI: 'https://example.test/game/',
  body,
  head,
  createElement: (tag) => new El(tag),
  getElementById: (id) => ids[id] || null,
};
globalThis.window = {
  matchMedia: (query) => ({ matches: query.includes('standalone') ? false : true }),
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

assert(body.children.length === 1, 'blocked iPhone creates only the install blocker');
const blocker = body.children[0];
assert(blocker.id === 'info-screen' || blocker.className === 'mash-install-blocker',
  'blocked shell is the install screen');
assert(blocker.attrs.role === 'dialog' && blocker.attrs['aria-modal'] === 'true',
  'install blocker exposes modal dialog semantics');
assert(blocker.innerHTML.includes('•••') && blocker.innerHTML.includes('Add to Home Screen'),
  'iOS 26 blocker uses the current menu installation path');
assert(blocker.innerHTML.includes('mash-install-icon')
  && blocker.innerHTML.includes('mash-install-share')
  && blocker.innerHTML.includes('mash-install-arrow')
  && blocker.dataset.edge === 'bottom'
  && blocker.dataset.side === 'right',
  'blocker shows the app icon, Share glyph and pointer at the iOS 26 menu');
assert(blocker.innerHTML.includes('PLAY IT FULLSCREEN')
  && blocker.innerHTML.includes('True fullscreen')
  && blocker.innerHTML.includes('Plays offline')
  && blocker.innerHTML.includes('Its own icon'),
  'required blocker preserves the original fullscreen pitch and benefits');
assert(!blocker.innerHTML.includes('<button'),
  'required iPhone installation blocker cannot be dismissed');
assert(!body.children.some((el) => el.tagName === 'SCRIPT'), 'blocked iPhone does not append game script');
assert(!body.children.some((el) => el.innerHTML.includes('<canvas')), 'blocked iPhone creates no canvases');
assert(head.children.length === 0, 'blocked iPhone requests no game fonts');
assert(window.__mash_platform.allowed === false, 'gate records blocked platform policy');

console.log(failed ? 'INSTALL GATE: FAILED' : 'INSTALL GATE: OK');
process.exit(failed ? 1 : 0);
