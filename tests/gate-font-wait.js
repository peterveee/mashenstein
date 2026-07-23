// A fast cached game bundle must not outrun a cold webfont stylesheet. The
// title caches per-glyph shapes and advances on its first frame, so game.js can
// only start after all declared faces settle.
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
const fontResolvers = [];
const loadedFaces = [];
globalThis.document = {
  readyState: 'complete',
  baseURI: 'https://example.test/mashenstein/',
  body,
  head,
  fonts: {
    load(face) {
      loadedFaces.push(face);
      return new Promise((resolve) => fontResolvers.push(resolve));
    },
  },
  createElement: (tag) => new El(tag),
  getElementById: () => null,
};
globalThis.window = {
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

const fontLink = head.children.find((el) => el.id === 'mash-game-fonts');
assert(fontLink && !body.children.some((el) => el.tagName === 'SCRIPT'),
  'game bundle waits for the font stylesheet');

fontLink.onload();
await Promise.resolve();
assert(loadedFaces.length === 4 && !body.children.some((el) => el.tagName === 'SCRIPT'),
  'game bundle waits for every required font face');

fontResolvers.forEach((resolve) => resolve([]));
await new Promise((resolve) => setTimeout(resolve, 0));
assert(body.children.some((el) => el.tagName === 'SCRIPT'),
  'game bundle starts after all font faces settle');

console.log(failed ? 'FONT GATE: FAILED' : 'FONT GATE: OK');
process.exit(failed ? 1 : 0);
