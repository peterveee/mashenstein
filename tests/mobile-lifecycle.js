// Platform gate, lifecycle race, loop pause, input suspension and audio policy.
import { detectPlatform } from '../src/engine/platform.js';
import { lifecyclePolicy, LifecycleController } from '../src/engine/lifecycle.js';
import { startLoop } from '../src/engine/loop.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const IPOD = 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const IPAD_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36';

assert(!detectPlatform({ ua: IPHONE }).allowed, 'browser iPhone is blocked');
assert(detectPlatform({ ua: IPHONE, standalone: true }).allowed, 'standalone iPhone is allowed');
assert(!detectPlatform({ ua: IPOD }).allowed, 'browser iPod follows iPhone policy');
assert(detectPlatform({ ua: IPAD }).allowed, 'ordinary iPad browser is allowed');
const ipadMac = detectPlatform({ ua: IPAD_MAC, maxTouchPoints: 5 });
assert(ipadMac.isIpad && !ipadMac.isIphone && ipadMac.allowed, 'Mac-UA touch iPad is allowed as iPad');
assert(detectPlatform({ ua: IPAD_MAC, maxTouchPoints: 0 }).isDesktop, 'ordinary Mac stays desktop');
assert(detectPlatform({ ua: ANDROID }).allowed, 'Android browser is allowed');
assert(detectPlatform({ ua: DESKTOP }).allowed, 'desktop browser is allowed');

assert(lifecyclePolicy({ isIphone: true, standalone: true, portrait: true }).paused,
  'installed iPhone portrait pauses');
assert(!lifecyclePolicy({ isIpad: true, standalone: true, portrait: true }).paused,
  'iPad portrait keeps running');
assert(lifecyclePolicy({ visible: false }).paused, 'every hidden platform pauses');

class Events {
  constructor() { this.listeners = {}; }
  addEventListener(type, fn) { (this.listeners[type] ||= new Set()).add(fn); }
  removeEventListener(type, fn) { this.listeners[type]?.delete(fn); }
  fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); }
}
const heading = { focused: 0, focus() { this.focused++; } };
const overlay = Object.assign(new Events(), {
  hidden: true,
  querySelector: () => heading,
});
const shell = {
  inert: false,
  attrs: new Set(),
  setAttribute(k) { this.attrs.add(k); },
  removeAttribute(k) { this.attrs.delete(k); },
};
const doc = Object.assign(new Events(), {
  hidden: false,
  activeElement: null,
  getElementById(id) {
    if (id === 'portrait-overlay') return overlay;
    if (id === 'game-shell') return shell;
    return null;
  },
});
const portraitQuery = Object.assign(new Events(), { matches: false });
const win = Object.assign(new Events(), {
  innerWidth: 844,
  innerHeight: 390,
  matchMedia: () => portraitQuery,
  visualViewport: null,
});
const calls = [];
const loop = { pause: () => calls.push('loop:pause'), resume: () => calls.push('loop:resume') };
const input = { setSuspended: (v) => calls.push(`input:${v}`) };
const audio = { setLifecyclePaused: (v) => calls.push(`audio:${v}`) };
globalThis.requestAnimationFrame = (fn) => { fn(); return 1; };

const lifecycle = new LifecycleController({
  platform: detectPlatform({ ua: IPHONE, standalone: true }),
  loop, input, audio, doc, win,
});
assert(calls.at(-1) === 'loop:resume', 'initial landscape lifecycle resumes');
assert(overlay.hidden, 'portrait overlay starts hidden in landscape');

doc.hidden = true;
doc.fire('visibilitychange');
assert(calls.at(-1) === 'loop:pause' && overlay.hidden, 'hidden landscape pauses without overlay');

portraitQuery.matches = true;
portraitQuery.fire('change');
assert(calls.at(-1) === 'loop:pause' && overlay.hidden, 'rotation while hidden cannot resume or show dialog');

doc.hidden = false;
doc.fire('visibilitychange');
assert(calls.at(-1) === 'loop:pause' && !overlay.hidden && shell.inert,
  'foregrounding in portrait stays paused and shows dialog');

portraitQuery.matches = false;
portraitQuery.fire('change');
assert(calls.at(-1) === 'loop:resume' && overlay.hidden && !shell.inert,
  'landscape transition resumes and removes dialog');
win.fire('pagehide');
assert(calls.at(-1) === 'loop:pause', 'pagehide pauses even before visibility catches up');
win.fire('pageshow');
assert(calls.at(-1) === 'loop:resume', 'pageshow recomputes and resumes visible landscape');
lifecycle.destroy();

// Fixed-step loop: paused frames do no work and hidden wall time is discarded.
let now = 0;
let raf = [];
globalThis.performance = { now: () => now };
globalThis.requestAnimationFrame = (fn) => { raf.push(fn); return raf.length; };
const runFrame = (advance) => {
  now += advance;
  const q = raf.splice(0);
  q.forEach((fn) => fn(now));
};
let updates = 0, draws = 0;
const loopCtl = startLoop({ update: () => updates++, draw: () => draws++ });
runFrame(17);
const beforePause = { updates, draws };
loopCtl.pause();
runFrame(10000);
assert(updates === beforePause.updates && draws === beforePause.draws, 'paused loop performs no update or draw');
loopCtl.resume();
runFrame(17);
assert(updates - beforePause.updates <= 1 && draws === beforePause.draws + 1,
  'resume starts fresh without catch-up ticks');
loopCtl.stop();

// Input is a separate import after the loop globals are installed.
const { installDom } = await import('./dom-stub.js');
const dom = installDom();
const { Input } = await import('../src/engine/input.js');
Input.init();
dom.keyDown('Space');
assert(Input.pressed('jump'), 'input works before lifecycle suspension');
Input.setSuspended(true);
assert(!Input.pressed('jump') && !Input.held('jump'), 'suspension clears queued and held input');
dom.keyDown('Space');
assert(!Input.pressed('jump'), 'suspended keyboard cannot queue an action');
Input.setSuspended(false);
dom.keyDown('Space');
assert(Input.pressed('jump'), 'input works again after lifecycle resume');

// Exercise audio lifecycle without constructing the full Web Audio graph.
const { Audio } = await import('../src/engine/audio.js');
let suspended = 0, resumed = 0;
Audio.ctx = {
  state: 'running',
  suspend() { suspended++; this.state = 'suspended'; return Promise.resolve(); },
  resume() { resumed++; this.state = 'running'; return Promise.resolve(); },
};
Audio.lifecyclePaused = false;
Audio.muted = true;
Audio.levels = { master: 0.4, music: 0.2, sfx: 0.8 };
Audio.setLifecyclePaused(true);
Audio.ensure();
Audio.setLifecyclePaused(false);
assert(suspended === 1 && resumed === 1, 'audio context suspends and resumes exactly once');
assert(Audio.muted && Audio.levels.music === 0.2 && Audio.levels.sfx === 0.8,
  'audio lifecycle preserves mute and volume settings');

console.log(failed ? 'MOBILE LIFECYCLE: FAILED' : 'MOBILE LIFECYCLE: OK');
process.exit(failed ? 1 : 0);
