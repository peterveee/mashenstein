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

assert(!lifecyclePolicy({ isIphone: true, standalone: true, portrait: true }).paused,
  'installed iPhone portrait keeps running');
assert(!lifecyclePolicy({ isIphone: true, standalone: true, portrait: true, allowPortrait: true }).paused,
  'approved portrait surface keeps an installed iPhone running');
const devPortrait = lifecyclePolicy({
  isIphone: true, standalone: false, devBrowserBypass: true, portrait: true,
});
assert(!devPortrait.paused && !devPortrait.showPortraitOverlay,
  'dev-bypassed browser iPhone keeps portrait running');
assert(!lifecyclePolicy({
  isIphone: true, standalone: false, devBrowserBypass: true, portrait: false,
}).paused, 'dev-bypassed browser iPhone runs in landscape');
const devPhonePortrait = lifecyclePolicy({
  isIphone: true, standalone: true, devMode: true, portrait: true,
});
assert(!devPhonePortrait.paused && !devPhonePortrait.showPortraitOverlay,
  'dev iPhone keeps every portrait screen running without the rotate overlay');
assert(!lifecyclePolicy({
  isAndroidPhone: true, standalone: true, devMode: true, portrait: true,
}).paused, 'dev Android phone keeps portrait screens running');
assert(!lifecyclePolicy({ isIpad: true, standalone: true, portrait: true }).paused,
  'iPad portrait keeps running');
assert(!lifecyclePolicy({ isAndroidPhone: true, standalone: true, portrait: true }).paused,
  'installed Android phone portrait keeps running');
assert(!lifecyclePolicy({ isAndroidPhone: true, standalone: true, portrait: true, allowPortrait: true }).paused,
  'approved portrait surface keeps an installed Android phone running');
assert(!lifecyclePolicy({ isAndroidTablet: true, standalone: true, portrait: true }).paused,
  'Android tablet portrait keeps running (like iPad)');
assert(lifecyclePolicy({ visible: false }).paused, 'every hidden platform pauses');
const presentationMusic = lifecyclePolicy({
  presentationRefreshing: true,
  presentationRhythm: false,
});
assert(presentationMusic.paused && !presentationMusic.audioPaused,
  'presentation refresh holds ordinary gameplay while its music continues');
const presentationRhythm = lifecyclePolicy({
  presentationRefreshing: true,
  presentationRhythm: true,
});
assert(presentationRhythm.paused && presentationRhythm.audioPaused,
  'presentation refresh holds beat-locked gameplay and music together');
assert(lifecyclePolicy({
  presentationRefreshing: true,
  presentationRhythm: false,
  visible: false,
}).audioPaused, 'hidden lifecycle pause still wins over continued presentation music');

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
assert(portraitAllowedFor(new RolloutPortrait()), 'the frame-based portrait run is shipped');
assert(portraitAllowedFor(new RolloutPortrait(), true), 'the shipped frame surface stays allowed with the diag switch on');

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
lifecycle.setPresentationRefreshing(true, false);
assert(calls.includes('loop:pause') && calls.includes('audio:false'),
  'ordinary presentation refresh pauses the loop without pausing audio');
lifecycle.setPresentationRefreshing(true, true);
assert(calls.includes('audio:true'), 'beat-locked refresh pauses audio with the loop');
lifecycle.setPresentationRefreshing(false, false);
assert(calls.at(-1) === 'loop:resume', 'presentation refresh releases its pause cleanly');
for (let i = 0; i < 5; i++) portraitTitle.fire('click');
assert(devMenuOpens === 0, 'the rotate heading is inert while the portrait card is not up');
portraitQuery.matches = true;
win.innerWidth = 390;
win.innerHeight = 844;
lifecycle.apply();

// Portrait is now a live phone presentation, so the old rotate-card heading is
// never an active dev-menu gesture.
for (let i = 0; i < 4; i++) portraitTitle.fire('click');
assert(devMenuOpens === 0, 'the hidden rotate heading does not open the dev menu');
portraitTitle.fire('click');
assert(devMenuOpens === 0, 'portrait heading taps remain inert without the rotate card');

for (let i = 0; i < 4; i++) lorenzoIcon.fire('click');
assert(jukeboxOpens === 0, 'portrait Lorenzo icon does not open jukebox before five taps');
lorenzoIcon.fire('click');
assert(jukeboxOpens === 0, 'portrait Lorenzo icon stays inert without the rotate card');
assert(overlay.hidden && calls.at(-1) === 'loop:resume',
  'portrait remains live without a rotate-card hand-off');
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
assert(calls.at(-1) === 'loop:resume' && overlay.hidden && !shell.inert,
  'foregrounding in portrait resumes without showing a dialog');
assert(priorFocus.blurred === 0 && heading.focused === 0,
  'portrait foregrounding leaves focus untouched without an overlay');

portraitQuery.matches = false;
portraitQuery.fire('change');
assert(calls.at(-1) === 'loop:resume' && overlay.hidden && !shell.inert,
  'landscape transition keeps the live shell running');
assert(priorFocus.focused === 0, 'landscape transition does not restore overlay focus');
win.fire('pagehide');
assert(calls.at(-1) === 'loop:pause', 'pagehide pauses even before visibility catches up');
win.fire('pageshow');
assert(calls.at(-1) === 'loop:resume', 'pageshow recomputes and resumes visible landscape');
lifecycle.destroy();

// Background music: a screen playing a song the player chose (the jukebox, the Lab's
// club) keeps it playing with the page hidden; the picture and input still stop.
const hiddenMusic = lifecyclePolicy({ visible: false, backgroundAudio: true });
assert(hiddenMusic.paused && !hiddenMusic.audioPaused && hiddenMusic.backgroundAudio,
  'a hidden screen playing music pauses its picture but not its audio');
assert(lifecyclePolicy({ visible: false, backgroundAudio: false }).audioPaused,
  'a hidden screen with no music to keep pauses its audio');
assert(!lifecyclePolicy({ visible: true, backgroundAudio: true }).backgroundAudio,
  'a visible screen is not in the background');
assert(lifecyclePolicy({ allowed: false, visible: false, backgroundAudio: true }).audioPaused,
  'the platform gate still stops background music');
{
  let song = { title: 'NEON ORBIT', album: 'JUKEBOX', paused: false };
  let backgrounded = 0;
  let resumed = 0;
  const pauses = [];
  const skips = [];
  let covers = 0;   // off until the cover test below: the card keeps the icon
  const bgCalls = [];
  const session = { writes: [], set type(v) { this.writes.push(v); }, get type() { return this.writes.at(-1); } };
  const media = { handlers: {}, metadata: undefined, playbackState: undefined, setActionHandler(k, fn) { this.handlers[k] = fn; } };
  win.navigator.audioSession = session;
  win.navigator.mediaSession = media;
  win.MediaMetadata = class { constructor(init) { Object.assign(this, init); } };
  media.positions = [];
  media.setPositionState = (state) => { media.position = state; media.positions.push(state); };
  let clock = { duration: 32, position: 4 };
  // The lock screen's stand-in: a silent <audio>, the only thing WebKit sends the card's buttons to.
  const anchor = {
    muted: null, playing: false, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    play() { this.playing = true; return Promise.resolve(); },
    pause() { this.playing = false; },
  };
  doc.createElement = (tag) => (tag === 'audio' ? anchor : null);
  doc.querySelector = (sel) => (sel === 'link[rel="icon"][sizes="192x192"]' ? { href: 'https://example.test/icon-dev-192.png' } : null);
  doc.body = { appendChild: (el) => { doc.body.child = el; } };
  win.Blob = class { constructor(parts, opts) { this.parts = parts; this.type = opts.type; } };
  win.URL = { createObjectURL: (blob) => `blob:${blob.type}:${blob.parts[0].byteLength}` };
  doc.hidden = false;
  const bg = new LifecycleController({
    platform: detectPlatform({ ua: IPHONE, standalone: true }),
    loop: { pause: () => bgCalls.push('loop:pause'), resume: () => bgCalls.push('loop:resume') },
    input: { setSuspended: (v) => bgCalls.push(`input:${v}`) },
    audio: {
      setLifecyclePaused: (v) => bgCalls.push(`audio:${v}`),
      resumeContext: () => { resumed++; },
      songClock: () => clock,
    },
    doc, win,
    nowPlaying: () => song,
    onBackground: () => { backgrounded++; },
    onMediaPause: (paused) => { pauses.push(paused); if (song) song = { ...song, paused }; },
    onMediaSkip: (dir) => { skips.push(dir); song = { ...song, title: `TRACK ${dir}` }; },
    songArt: () => (covers ? { width: 512, height: 512, toBlob: (cb) => cb({ type: 'image/jpeg', n: ++covers }) } : null),
  });
  bg.syncMusicSession();
  bg.syncMusicSession();
  assert(session.writes.join() === 'playback',
    'a screen with a song holds a playback audio session, written once');
  assert(media.metadata?.title === 'NEON ORBIT' && media.metadata.artist === 'MASHENSTEIN'
    && media.metadata.album === 'JUKEBOX' && media.playbackState === 'playing',
    'the NOW PLAYING card names the song rather than the host');
  assert(media.metadata.artwork.length === 1 && media.metadata.artwork[0].src === 'https://example.test/icon-dev-512.png',
    'the card\'s artwork is the 512 icon beside the linked 192, sharp when the lock screen blows it up');
  assert(media.position?.duration === 32 && media.position.position === 4 && media.position.playbackRate === 1
    && media.positions.length === 1,
    'the card\'s progress bar is the song — its length and where it is — not the stand-in\'s two seconds');
  clock = { duration: 32, position: 4.01 };
  bg.syncMusicSession();
  assert(media.positions.length === 1, 'and is not set again while it runs true');
  clock = { duration: 32, position: 16 };
  bg.syncMusicSession();
  assert(media.positions.length === 2 && media.position.position === 16, 'a loop back or a skip sets it again');
  bg.primeAnchor();
  await Promise.resolve(); await Promise.resolve();
  assert(doc.body.child === anchor && anchor.loop && anchor.src === 'blob:audio/wav:32044'
    && anchor.playing && anchor.muted === false && bg.anchorReady,
    'a tap on a music screen starts two seconds of looping silence as the card\'s stand-in');
  assert(!media.handlers.nexttrack && !media.handlers.previoustrack,
    'a song that cannot skip offers no previous/next');
  song = { ...song, skips: true };
  bg.syncMusicSession();
  media.handlers.nexttrack();
  assert(media.metadata.title === 'TRACK 1', 'the card is retitled at once after next, with no frame to do it');
  media.handlers.previoustrack();
  assert(skips.join() === '1,-1', 'the card\'s next and previous reach the screen');
  song = { ...song, skips: false };
  bg.syncMusicSession();
  assert(media.handlers.nexttrack === null && media.handlers.previoustrack === null,
    'previous/next are withdrawn when the song can no longer take them');
  doc.hidden = true;
  doc.fire('visibilitychange');
  assert(bgCalls.at(-1) === 'loop:pause' && !bgCalls.includes('audio:true'),
    'hiding with music pauses the loop and leaves the audio running');
  assert(backgrounded === 1, 'the screen is told once that it went into the background');
  win.fire('resize');
  assert(backgrounded === 1, 'a hidden re-apply does not tell the screen again');
  media.handlers.pause();
  assert(pauses.join() === 'true' && media.playbackState === 'paused',
    'the card\'s pause reaches the screen and the card says paused');
  assert(!anchor.playing && anchor.muted === false, 'the stand-in pauses with the song, still on the card');
  win.fire('resize');
  assert(!bgCalls.includes('audio:true'),
    'a song paused from the lock screen is held, not suspended by a later apply');
  media.handlers.play();
  assert(pauses.join() === 'true,false' && media.playbackState === 'playing',
    'the card\'s play reaches the screen');
  assert(anchor.playing, 'and the stand-in plays again');
  doc.hidden = false;
  doc.fire('visibilitychange');
  assert(bgCalls.at(-1) === 'loop:resume' && resumed === 1,
    'coming back resumes the loop and asks an interrupted context to resume');
  song = { ...song, paused: true };
  doc.hidden = true;
  doc.fire('visibilitychange');
  assert(bgCalls.at(-1) === 'loop:pause' && bgCalls.includes('audio:true') && backgrounded === 1,
    'a song paused in the game is suspended with the page');
  bgCalls.length = 0;
  media.handlers.play();
  assert(bgCalls.includes('audio:false') && backgrounded === 2,
    'played from the lock screen, a song paused in the game plays on in the background');
  doc.hidden = false;
  doc.fire('visibilitychange');
  // Covers on: each song its own, handed over as a data URL once encoded.
  win.FileReader = class { readAsDataURL(blob) { this.result = `data:${blob.type};base64,COVER${blob.n}`; this.onload(); } };
  covers = 1;
  song = { ...song, title: 'COVERED' };
  bg.syncMusicSession();
  assert(media.metadata.title === 'COVERED' && covers === 1 && !media.metadata.artwork[0]?.src?.startsWith('data:'),
    'with the game on screen a new song is retitled at once, its cover left unpainted: it would cost the jukebox frames');
  doc.hidden = true;
  doc.fire('visibilitychange');
  assert(media.metadata.title === 'COVERED' && media.metadata.artwork[0].src === 'data:image/jpeg;base64,COVER2'
    && media.metadata.artwork[0].sizes === '512x512', 'gone to the lock screen, the song gets its own cover');
  doc.fire('visibilitychange');
  assert(covers === 2, 'and only the once');
  covers = 0;
  song = { ...song, title: 'NO COVER' };
  doc.hidden = false;
  doc.fire('visibilitychange');
  bg.syncMusicSession();
  assert(media.metadata.title === 'NO COVER' && media.metadata.artwork[0].src === 'data:image/jpeg;base64,COVER2',
    'a song with no cover of its own keeps the last one rather than going blank');
  song = null;
  bg.syncMusicSession();
  assert(session.type === 'playback' && session.writes.length === 1 && media.metadata?.title === 'MASHENSTEIN'
    && media.playbackState === 'none',
    'with no song the session stays playback — the game\'s own exit needs it — and the card just says MASHENSTEIN');
  assert(!anchor.playing && anchor.muted === true, 'with no song the stand-in is muted, which takes it off the lock screen');
  bgCalls.length = 0;
  const wentBefore = backgrounded;
  doc.hidden = true;
  doc.fire('visibilitychange');
  assert(bgCalls.at(-1) === 'loop:pause' && bgCalls.includes('audio:true') && backgrounded === wentBefore,
    'hiding with no music pauses the audio as before');
  doc.hidden = false;
  doc.fire('visibilitychange');
  bg.destroy();
  delete win.navigator.audioSession;
  delete win.navigator.mediaSession;
  delete win.MediaMetadata;
  delete doc.createElement;
  delete doc.querySelector;
  delete win.FileReader;
  delete doc.body;
  delete win.Blob;
  delete win.URL;
}

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

// Presentation cap on a high-refresh display. The simulation is fixed at 60 Hz,
// so on a 120 Hz ProMotion panel every other callback has no new simulation
// state to show. Presenting it anyway costs a full re-render plus a
// full-resolution texture upload for a frame the display cannot improve —
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

// Presented frames expose the fractional remainder between fixed simulation
// ticks so moving states can render a continuous lane position.
const alphaSamples = [];
const alphaLoop = startLoop({ update() {}, draw: (alpha) => alphaSamples.push(alpha) });
runFrame(17);
assert(alphaSamples.length === 1 && alphaSamples[0] >= 0 && alphaSamples[0] <= 1,
  'presented frames receive a bounded fixed-step interpolation fraction');
alphaLoop.stop();

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

// THE EXIT: held at once behind a dip too short to hear, and faded back in on return.
{
  const ramps = [];
  const param = {
    value: 1,
    cancelScheduledValues() {}, setValueAtTime(v) { this.value = v; },
    linearRampToValueAtTime(v, t) { ramps.push([v, t]); this.value = v; },
  };
  Audio.ctx.currentTime = 5;
  Audio.exitGain = { gain: param };
  suspended = 0; resumed = 0;
  Audio.setLifecyclePaused(true, { fade: true });
  assert(suspended === 0 && ramps.at(-1)?.[0] === 0 && Math.abs(ramps.at(-1)[1] - 5.06) < 1e-9,
    'leaving fades to silence first rather than stopping the sound mid-note');
  await new Promise((r) => setTimeout(r, 400));
  assert(suspended === 1, 'and holds once the fade and a quarter-second of silence are done');
  Audio.setLifecyclePaused(false);
  assert(resumed === 1 && ramps.at(-1)?.[0] === 1 && Math.abs(ramps.at(-1)[1] - 5.06) < 1e-9, 'back, it resumes and fades in');
  Audio.setLifecyclePaused(true, { fade: true });
  Audio.setLifecyclePaused(false);
  await new Promise((r) => setTimeout(r, 400));
  assert(suspended === 1, 'a return inside the fade calls off the hold');
  Audio.setLifecyclePaused(true);
  assert(suspended === 2 && Math.abs(ramps.at(-1)[1] - 5.005) < 1e-9,
    'without the fade (a beat-locked run, a refresh) the hold is at once, behind a 5 ms dip');
  Audio.setLifecyclePaused(false);
  Audio.fadeForExit();
  assert(ramps.at(-1)?.[0] === 0 && Audio._leaving, 'losing focus ahead of leaving fades it');
  Audio.fadeBackIn();
  assert(ramps.at(-1)?.[0] === 1 && !Audio._leaving, 'and focus coming back brings it up again');
  Audio.exitGain = null;
}
assert(Audio.muted && Audio.levels.music === 0.2 && Audio.levels.sfx === 0.8,
  'audio lifecycle preserves mute and volume settings');

// THE EXIT FADE, from the lifecycle's side: a phone fades as focus goes, a desktop does not.
{
  const make = (ua, { plays = false, locked = false } = {}) => {
    const log = [];
    const lc = new LifecycleController({
      platform: detectPlatform({ ua, standalone: true, screenW: 412, screenH: 915 }),
      loop: { pause() {}, resume() {} },
      input: { setSuspended() {} },
      audio: {
        setLifecyclePaused: (v, o) => log.push(`paused:${v}${v && o?.fade ? ':fade' : ''}`),
        fadeForExit: () => log.push('fadeOut'),
        fadeBackIn: () => log.push('fadeIn'),
      },
      doc, win,
      nowPlaying: () => (plays ? { title: 'X', album: 'JUKEBOX', paused: false } : null),
      beatLocked: () => locked,
    });
    return { lc, log };
  };
  doc.hidden = false;
  let { lc, log } = make(IPHONE);
  win.fire('blur');
  win.fire('focus');
  assert(log.includes('fadeOut') && log.at(-1) === 'fadeIn', 'on a phone the sound fades as focus goes, and back as it returns');
  doc.hidden = true; doc.fire('visibilitychange');
  assert(log.at(-1) === 'paused:true:fade', 'left, it fades and then holds');
  doc.hidden = false; doc.fire('visibilitychange');
  lc.destroy();
  ({ lc, log } = make(DESKTOP));
  win.fire('blur');
  assert(!log.includes('fadeOut'), 'a desktop does not fade every time another window is clicked');
  lc.destroy();
  ({ lc, log } = make(IPHONE, { plays: true }));
  win.fire('blur');
  assert(!log.includes('fadeOut'), 'a song the player chose plays on through Control Center');
  lc.destroy();
  ({ lc, log } = make(IPHONE, { locked: true }));
  doc.hidden = true; doc.fire('visibilitychange');
  assert(log.at(-1) === 'paused:true', 'a beat-locked run holds its sound with its world, no fade after it');
  doc.hidden = false; doc.fire('visibilitychange');
  lc.destroy();
}

// Safari's summing-junction crash (webkit-junction-guard.js): nothing a connection has just
// touched may be collected while the audio thread may still be updating it.
{
  const { installJunctionGuard, junctionGuardHolding, isWebKitEngine } = await import('../src/engine/webkit-junction-guard.js');
  assert(isWebKitEngine({ userAgent: IPHONE }) && isWebKitEngine({ userAgent: IPAD_MAC })
    && !isWebKitEngine({ userAgent: DESKTOP }) && !isWebKitEngine({ userAgent: ANDROID }),
  'the guard is for Safari\'s engine — every iPhone browser, Safari on a Mac — not Chrome');
  const log = [];
  class FakeNode {
    constructor(name) { this.name = name; }
    connect(dest) { log.push(`${this.name}>${dest.name}`); return dest; }
    disconnect(dest) { log.push(`${this.name}x${dest?.name ?? '*'}`); }
  }
  assert(!installJunctionGuard({ win: { AudioNode: FakeNode, navigator: { userAgent: DESKTOP } } }),
    'Chrome is left alone');
  assert(!installJunctionGuard({ win: { AudioNode: FakeNode, navigator: { userAgent: IPHONE }, __mashNoJunctionGuard: true } }),
    'and so is a page that opts out for a measurement');
  assert(installJunctionGuard({ win: { AudioNode: FakeNode, navigator: { userAgent: IPHONE } } }), 'Safari gets the guard');
  let note = new FakeNode('note');
  let gain = new FakeNode('gain');
  const lane = new FakeNode('lane');
  const param = { name: 'param' };
  assert(note.connect(gain) === gain && gain.connect(lane) === lane && note.connect(param) === param,
    'connect still connects, and still hands back its destination');
  note.disconnect();
  gain.disconnect(lane);
  assert(log.join() === 'note>gain,gain>lane,note>param,notex*,gainxlane', 'disconnect still disconnects');
  // Drop the game's own references: the guard is now all that keeps them.
  const weak = [new WeakRef(note), new WeakRef(gain), new WeakRef(param)];
  note = null; gain = null;
  assert(junctionGuardHolding() >= 4, 'everything a connection just touched is held: the note, its gain, the lane, the param');
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
    assert(weak.every((w) => w.deref()), 'and survives a collection while held');
  }
}

console.log(failed ? 'MOBILE LIFECYCLE: FAILED' : 'MOBILE LIFECYCLE: OK');
process.exit(failed ? 1 : 0);
