// Platform gate, lifecycle race, loop pause, input suspension and audio policy.
import { detectPlatform } from '../src/engine/platform.js';
import { lifecyclePolicy, LifecycleController, portraitAllowedFor } from '../src/engine/lifecycle.js';
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
assert(detectPlatform({ ua: ANDROID, screenW: 412, screenH: 915 }).isAndroidPhone,
  'narrow Android detects as phone');
assert(detectPlatform({ ua: ANDROID, screenW: 800, screenH: 1280 }).isAndroidTablet,
  'wide Android detects as tablet');
assert(detectPlatform({ ua: ANDROID }).allowed, 'Android browser is allowed');
assert(detectPlatform({ ua: DESKTOP }).allowed, 'desktop browser is allowed');

assert(lifecyclePolicy({ isIphone: true, standalone: true, portrait: true }).paused,
  'installed iPhone portrait pauses');
assert(!lifecyclePolicy({ isIphone: true, standalone: true, portrait: true, allowPortrait: true }).paused,
  'approved portrait surface keeps an installed iPhone running');
const devPortrait = lifecyclePolicy({
  isIphone: true, standalone: false, devBrowserBypass: true, portrait: true,
});
assert(devPortrait.paused && devPortrait.showPortraitOverlay,
  'dev-bypassed browser iPhone follows installed portrait policy');
assert(!lifecyclePolicy({
  isIphone: true, standalone: false, devBrowserBypass: true, portrait: false,
}).paused, 'dev-bypassed browser iPhone runs in landscape');
assert(!lifecyclePolicy({ isIpad: true, standalone: true, portrait: true }).paused,
  'iPad portrait keeps running');
assert(lifecyclePolicy({ isAndroidPhone: true, standalone: true, portrait: true }).paused,
  'installed Android phone portrait pauses');
assert(!lifecyclePolicy({ isAndroidPhone: true, standalone: true, portrait: true, allowPortrait: true }).paused,
  'approved portrait surface keeps an installed Android phone running');
assert(!lifecyclePolicy({ isAndroidTablet: true, standalone: true, portrait: true }).paused,
  'Android tablet portrait keeps running (like iPad)');
assert(lifecyclePolicy({ visible: false }).paused, 'every hidden platform pauses');

// Portrait capability. Screens opt in with a static portraitMode; the shipped
// jukebox presentation is always honoured, while the frame-based modes of the
// portrait rollout stay dark until the diag switch is set on a device, so
// marking a screen cannot change what a tester sees on its own.
class NoPortrait {}
class ShippedPortrait { static portraitMode = 'stretch'; }
class RolloutPortrait { static portraitMode = 'frame'; }
assert(!portraitAllowedFor(null), 'no state installed yet keeps the landscape gate');
assert(!portraitAllowedFor(new NoPortrait()), 'a screen without portraitMode keeps the landscape gate');
assert(portraitAllowedFor(new ShippedPortrait()), 'the shipped stretch surface is allowed in portrait');
assert(portraitAllowedFor(new ShippedPortrait(), true), 'the shipped surface stays allowed with the diag switch on');
assert(!portraitAllowedFor(new RolloutPortrait()), 'rollout portrait modes stay dark without the diag switch');
assert(portraitAllowedFor(new RolloutPortrait(), true), 'the diag switch opens rollout portrait modes');

class Events {
  constructor() { this.listeners = {}; }
  addEventListener(type, fn) { (this.listeners[type] ||= new Set()).add(fn); }
  removeEventListener(type, fn) { this.listeners[type]?.delete(fn); }
  fire(type, event = {}) { for (const fn of this.listeners[type] || []) fn(event); }
}
const heading = { focused: 0, focus() { this.focused++; } };
const errorTools = { hidden: true };
const errorMessage = { textContent: '' };
const copyStatus = { textContent: '' };
const copyButton = new Events();
const lorenzoIcon = new Events();
const portraitTitle = new Events();
const reloadButton = Object.assign(new Events(), { textContent: 'CHECK FOR UPDATE', disabled: false });
const reloadStatus = { textContent: '' };
const priorFocus = {
  isConnected: true,
  blurred: 0,
  focused: 0,
  blur() { this.blurred++; },
  focus() { this.focused++; },
};
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
    if (id === 'portrait-error-tools') return errorTools;
    if (id === 'portrait-error-message') return errorMessage;
    if (id === 'copy-error') return copyButton;
    if (id === 'portrait-lorenzo-icon') return lorenzoIcon;
    if (id === 'portrait-overlay-title') return portraitTitle;
    if (id === 'copy-error-status') return copyStatus;
    if (id === 'portrait-reload') return reloadButton;
    if (id === 'portrait-reload-status') return reloadStatus;
    return null;
  },
});
const portraitQuery = Object.assign(new Events(), { matches: false });
const win = Object.assign(new Events(), {
  innerWidth: 844,
  innerHeight: 390,
  matchMedia: () => portraitQuery,
  visualViewport: null,
  navigator: { clipboard: { writeText: async (text) => { win.copied = text; } } },
  // Deliberately NO confirm(): an installed iOS PWA suppresses native dialogs,
  // and the reload path must not depend on one. If it ever reaches for confirm
  // again this stub throws rather than quietly passing.
  location: { reloaded: 0, reload() { this.reloaded++; } },
  timers: [],
  setTimeout(fn, ms) { this.timers.push({ fn, ms }); return this.timers.length; },
  clearTimeout(id) { if (id) this.timers[id - 1] = null; },
});
const calls = [];
let jukeboxOpens = 0;
let jukeboxActive = false;
let devMenuOpens = 0;
const loop = { pause: () => calls.push('loop:pause'), resume: () => calls.push('loop:resume') };
const input = { setSuspended: (v) => calls.push(`input:${v}`) };
const audio = { setLifecyclePaused: (v) => calls.push(`audio:${v}`) };
globalThis.requestAnimationFrame = (fn) => { fn(); return 1; };

const lifecycle = new LifecycleController({
  platform: detectPlatform({ ua: IPHONE, standalone: true }),
  loop, input, audio, doc, win,
  allowPortrait: () => jukeboxActive,
  onPortraitJukebox: () => { jukeboxOpens++; jukeboxActive = true; },
  onDevMenu: () => { devMenuOpens++; },
});
assert(calls.at(-1) === 'loop:resume', 'initial landscape lifecycle resumes');
assert(overlay.hidden, 'portrait overlay starts hidden in landscape');
for (let i = 0; i < 5; i++) portraitTitle.fire('click');
assert(devMenuOpens === 0, 'the rotate heading is inert while the portrait card is not up');
portraitQuery.matches = true;
win.innerWidth = 390;
win.innerHeight = 844;
lifecycle.apply();

// Five taps on TURN THE ARCADE SIDEWAYS open the dev menu, which then holds the
// screen in portrait in place of this card (see main.js allowPortraitNow).
for (let i = 0; i < 4; i++) portraitTitle.fire('click');
assert(devMenuOpens === 0, 'the rotate heading does not open the dev menu before five taps');
portraitTitle.fire('click');
assert(devMenuOpens === 1, 'five heading taps open the dev menu');
// A part-finished gesture does not carry across a rotation and back.
lifecycle.setOverlay(false);
lifecycle.setOverlay(true);
for (let i = 0; i < 4; i++) portraitTitle.fire('click');
assert(devMenuOpens === 1, 'a freshly shown card starts the five-tap count over');
portraitTitle.fire('click');
assert(devMenuOpens === 2, 'the count completes on the new card');

for (let i = 0; i < 4; i++) lorenzoIcon.fire('click');
assert(jukeboxOpens === 0, 'portrait Lorenzo icon does not open jukebox before five taps');
lorenzoIcon.fire('click');
assert(jukeboxOpens === 1, 'five portrait Lorenzo-icon clicks open the jukebox transition');
assert(overlay.hidden && calls.at(-1) === 'loop:resume',
  'portrait jukebox hand-off hides the lock screen and resumes the transition loop');
jukeboxActive = false;
portraitQuery.matches = false;
win.innerWidth = 844;
win.innerHeight = 390;
lifecycle.apply();
win.__mash_fatal_error = 'ReferenceError: toaster lane missing';
lifecycle.syncErrorReport();
assert(!errorTools.hidden && errorMessage.textContent.includes('toaster lane'),
  'portrait overlay exposes the captured crash report');
await lifecycle.copyErrorReport();
assert(win.copied.includes('toaster lane') && copyStatus.textContent === 'ERROR COPIED.',
  'portrait crash report can be copied');

// The first press checks the service worker and never reloads an up-to-date
// app. The stub deliberately has no confirm(): an installed iOS PWA suppresses
// native dialogs, so the reload path must not depend on one.
let updateAvailable = false;
const registration = {
  scope: 'https://example.test/mashenstein/',
  waiting: null,
  installing: null,
  updateCalls: 0,
  addEventListener() {},
  removeEventListener() {},
  update() {
    this.updateCalls++;
    if (updateAvailable) this.waiting = {};
    return Promise.resolve();
  },
};
const unrelatedRegistration = {
  scope: 'https://example.test/other-app/',
  updateCalls: 0,
  update() { this.updateCalls++; return Promise.resolve(); },
};
win.location.href = 'https://example.test/mashenstein/';
win.__MASH_BUILT_AT__ = '2026-07-26T00:00:00.000Z';
let servedBuild = win.__MASH_BUILT_AT__;
let servedPageComplete = true;
win.fetch = async () => ({
  ok: true,
  text: async () => `<!-- Built: ${servedBuild} -->${servedPageComplete
    ? '<!-- MASHENSTEIN_BUILD_COMPLETE -->'
    : '<main>TRUNCATED DEPLOY'}`,
});
win.navigator.serviceWorker = {
  getRegistration: async () => registration,
  getRegistrations: async () => [unrelatedRegistration, registration],
};
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
reloadButton.fire('click');
await settle();
assert(win.location.reloaded === 0, 'an up-to-date app is not reloaded');
assert(reloadButton.textContent === 'CHECK FOR UPDATE' && reloadStatus.textContent === 'NO UPDATE FOUND.',
  'the first press reports that there is no update');
assert(registration.updateCalls === 1 && unrelatedRegistration.updateCalls === 0,
  'the update check only pokes the worker controlling this game');

// When the worker finds a new version, the same button becomes the explicit
// confirmation step, then forceReload refreshes the caches before navigating.
updateAvailable = true;
registration.waiting = null;
reloadButton.fire('click');
await settle();
assert(reloadButton.textContent === 'TAP AGAIN TO RELOAD'
  && reloadStatus.textContent === 'UPDATE AVAILABLE. TAP AGAIN TO RELOAD.',
  'an available update asks for confirmation');
reloadButton.fire('click');
await settle();
assert(win.location.reloaded === 1, 'the confirmed update reloads');
assert(unrelatedRegistration.updateCalls === 0,
  'the confirmed reload still leaves unrelated origin workers alone');

// A fresh tap after the confirmation reload checks again instead of reloading.
reloadButton.fire('click');
await settle();
assert(win.location.reloaded === 1, 'a fresh tap checks again instead of reloading');
const disarm = win.timers.filter(Boolean).at(-1);
if (disarm?.fn) disarm.fn();
assert(reloadButton.textContent === 'CHECK FOR UPDATE', 'the check button restores its label');

// The foreground updater may already have activated the newest worker while
// this page is still executing the old bundle. Worker state alone says "none";
// the fresh shell stamp must still offer the reload.
updateAvailable = false;
registration.waiting = null;
servedBuild = '2026-07-26T01:00:00.000Z';
assert(await lifecycle.checkForUpdate() === true,
  'a newer live shell is detected after its worker has already activated');

servedPageComplete = false;
assert(await lifecycle.checkForUpdate() === null,
  'a newer timestamp without the final marker is not reported as an update');
servedPageComplete = true;
servedBuild = win.__MASH_BUILT_AT__;

// A tap can arrive before initUpdates() finishes its asynchronous registration.
// The button joins that registration instead of reporting a false "no update".
let registeredByButton = 0;
win.navigator.serviceWorker.getRegistration = async () => null;
win.navigator.serviceWorker.register = async () => {
  registeredByButton++;
  return registration;
};
updateAvailable = false;
registration.waiting = null;
await lifecycle.checkForUpdate();
assert(registeredByButton === 1 && registration.updateCalls >= 3,
  'an early update check ensures the game service worker is registered');

doc.hidden = true;
doc.fire('visibilitychange');
assert(calls.at(-1) === 'loop:pause' && overlay.hidden, 'hidden landscape pauses without overlay');

portraitQuery.matches = true;
portraitQuery.fire('change');
assert(calls.at(-1) === 'loop:pause' && overlay.hidden, 'rotation while hidden cannot resume or show dialog');

doc.activeElement = priorFocus;
doc.hidden = false;
doc.fire('visibilitychange');
assert(calls.at(-1) === 'loop:pause' && !overlay.hidden && shell.inert,
  'foregrounding in portrait stays paused and shows dialog');
assert(priorFocus.blurred === 1 && heading.focused === 0,
  'portrait overlay clears focus without focusing its heading');

portraitQuery.matches = false;
portraitQuery.fire('change');
assert(calls.at(-1) === 'loop:resume' && overlay.hidden && !shell.inert,
  'landscape transition resumes and removes dialog');
assert(priorFocus.focused === 1, 'landscape restores the prior focus target');
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

// Presentation cap on a high-refresh display. The simulation is fixed at 60 Hz
// and nothing interpolates between steps, so on a 120 Hz ProMotion panel every
// other callback has no new state to show. Presenting it anyway costs a full
// re-render plus a full-resolution texture upload for a pixel-identical frame —
// exactly the budget the density controller would otherwise spend on resolution.
updates = 0; draws = 0;
const proMotion = startLoop({ update: () => updates++, draw: () => draws++ });
for (let i = 0; i < 120; i++) runFrame(1000 / 120);
assert(updates >= 59 && updates <= 61, '120 Hz drives the fixed simulation at 60 Hz');
assert(draws >= 59 && draws <= 61,
  'a 120 Hz display presents ~60 frames, not 120 pixel-identical ones');
proMotion.stop();

// A 60 Hz display carries an update on every frame, so the cap never engages.
updates = 0; draws = 0;
const sixtyHz = startLoop({ update: () => updates++, draw: () => draws++ });
for (let i = 0; i < 60; i++) runFrame(1000 / 60);
assert(draws === 60, 'a 60 Hz display still presents every single frame');
sixtyHz.stop();

// Input is a separate import after the loop globals are installed.
const { installDom } = await import('./dom-stub.js');
const dom = installDom();
const { consumeBenchDiag, readDiag, releaseBenchRenderer, forceRenderer, forceWebglDensity } = await import('../src/engine/diag.js');
dom.store.mash_diag = JSON.stringify({ bench: true, renderer: '2d', fps: true });
const benchDiag = consumeBenchDiag();
assert(benchDiag.bench && benchDiag.renderer === '2d' && readDiag().bench === false,
  'a stored benchmark is consumed once while its backend remains available for this boot');
releaseBenchRenderer(benchDiag);
assert(!readDiag().renderer && readDiag().fps === true,
  'the benchmark backend clears after renderer initialization without clearing FPS');
dom.store.mash_diag = JSON.stringify({ bench: false, renderer: '2d', fps: true });
const staleDiag = consumeBenchDiag();
assert(!staleDiag.renderer && !readDiag().renderer,
  'a backend stranded by an older completed benchmark is cleared on boot');
dom.store.mash_diag = JSON.stringify({ titleProfile: true, fps: true });
const titleProfileDiag = consumeBenchDiag();
assert(titleProfileDiag.titleProfile && readDiag().titleProfile === false,
  'a stored title profile is consumed once without clearing the FPS switch');
dom.store.mash_diag = JSON.stringify({ titleProfile: true, titleProfileRenderer: true, renderer: 'webgl', rendererLock: true, density: 3 });
const pinnedProfileDiag = consumeBenchDiag();
releaseBenchRenderer(pinnedProfileDiag);
assert(!readDiag().renderer && readDiag().titleProfileRenderer === false,
  'the title profile releases only its temporary WebGL 3x pin');
dom.store.mash_diag = JSON.stringify({ gameplayProfile: true, gameplayProfileRenderer: true, renderer: '2d', rendererLock: true, density: 3 });
const gameplayProfileDiag = consumeBenchDiag();
assert(gameplayProfileDiag.gameplayProfile && readDiag().gameplayProfile === false,
  'a gameplay profile is consumed once while waiting for a playable state');
releaseBenchRenderer(gameplayProfileDiag);
assert(!readDiag().renderer && readDiag().gameplayProfileRenderer === false,
  'the gameplay profile releases only its temporary backend and density pin');
forceRenderer('2d');
assert(readDiag().renderer === '2d' && readDiag().rendererLock && readDiag().density === null,
  'the 2D diagnostic pins only the backend and leaves density adaptive');
forceRenderer('webgl');
assert(readDiag().renderer === 'webgl' && readDiag().rendererLock && readDiag().density === null,
  'the WebGL diagnostic pins only the backend and leaves density adaptive');
forceWebglDensity(3);
const forcedDiag = consumeBenchDiag();
assert(forcedDiag.renderer === 'webgl' && forcedDiag.rendererLock && forcedDiag.density === 3,
  'the persistent 3x WebGL diagnostic survives the next boot');
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
