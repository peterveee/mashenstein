// SAFARI'S SUMMING-JUNCTION CRASH, held off (Peter's iPhone, 8 Oct 2026: RHYTHM crashing a few
// bars in, at a different bar every time, in the jukebox and on the stage).
//
// The crash is WebKit's, not the game's. Every input of a node, and every AudioParam, is a
// "summing junction". Connecting to one or disconnecting from one marks it dirty, and the
// audio thread brings each dirty junction up to date after the quantum it renders
// (BaseAudioContext::handleDirtyAudioSummingJunctions). A junction that is DESTROYED while it
// is still in that set — its node deleted on the main thread because nothing references it
// any more — takes itself out of the set only in the base class's destructor, after the
// derived half has already gone. If the audio thread reaches it in between, it calls a pure
// virtual (canUpdateState) on half an object, and the whole page aborts: `__cxa_pure_virtual`
// in `AudioSummingJunction::updateRenderingState()`, on the "RemoteAudioDestinationProxy
// render thread" on the phone, on "WebCore: AudioWorklet" in headless WebKit since 2 Oct.
// The odds go with how many connections change per second, which is why a song that switches
// a lane through an effect section on the bar (rhythm's clap) found it in seconds.
//
// So nothing a disconnect has just touched is allowed to die young. Every disconnect keeps
// the node and what it was disconnected from referenced from here for half a second to a
// second — a couple of hundred render quanta, ample for the audio thread to have updated them
// and let go — after which they are released to the collector as before. `disconnect()` with
// no destination dirties every node it was wired to, so the destinations each node is
// connected to are remembered (as long as the connection stands, which is no longer than
// WebKit itself keeps them) and held with it.
//
// Disconnects only. A connect dirties its destination too, but what has just been connected
// is in use and referenced anyway; holding on connects as well — a few references for every
// note played — cost rhythm three or four points of audio-thread load in WebKit (23% → 27%
// median, worst 4 s 33–44% → 47–49%, three pairs, 8 Oct), and holding on disconnects alone
// costs nothing measurable (22/34 vs 22/34, 22/31 vs 23/33).
//
// WebKit only: the destructor is WebKit's, and no Chromium run has ever crashed this way. `window.__mashNoJunctionGuard = true` before the first sound
// leaves it out, for an A/B measurement.

const HOLD_MS = 500;

let installed = false;
let holding = [];   // everything touched in this window
let held = [];      // ...and the one before it, still referenced until the next rotation
let since = 0;
const clock = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());

/** True for Safari's engine — every iOS browser, and Safari on a Mac. */
export function isWebKitEngine(nav = globalThis.navigator) {
  const ua = nav?.userAgent || '';
  return /AppleWebKit/.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua);
}

/**
 * Patch AudioNode's connect/disconnect, once, before the first node is made (audio.js ensure).
 * Returns whether the guard is on. `force` installs it whatever the engine (tests).
 */
export function installJunctionGuard({ win = globalThis, force = false } = {}) {
  if (installed) return true;
  const proto = win.AudioNode?.prototype;
  if (!proto || win.__mashNoJunctionGuard || (!force && !isWebKitEngine(win.navigator))) return false;
  installed = true;
  since = clock();
  const { connect, disconnect } = proto;
  // node -> the nodes and params it is connected to, while it is
  const wired = new WeakMap();
  // Rotated on use rather than on a timer: a background page's timers are throttled, and with
  // nothing changing there is nothing new to hold.
  const hold = (x) => {
    const t = clock();
    if (t - since >= HOLD_MS) {
      held = holding;
      holding = [];
      since = t;
    }
    holding.push(x);
  };
  proto.connect = function connectHeld(dest, ...rest) {
    const out = connect.call(this, dest, ...rest);
    if (dest && typeof dest === 'object') {
      let to = wired.get(this);
      if (!to) wired.set(this, (to = new Set()));
      to.add(dest);
    }
    return out;
  };
  proto.disconnect = function disconnectHeld(...args) {
    hold(this);
    const to = wired.get(this);
    const dest = args[0];
    if (dest && typeof dest === 'object') {
      hold(dest);
      to?.delete(dest);
    } else if (to) {
      for (const d of to) hold(d);
      to.clear();
    }
    return disconnect.apply(this, args);
  };
  return true;
}

/** How many distinct nodes and params are being held right now (tests and probes). */
export function junctionGuardHolding() {
  return new Set([...held, ...holding]).size;
}

/** The same, by kind — `{ GainNode: 120, AudioWorkletNode: 4, … }` — for a probe asking what it costs. */
export function junctionGuardHeldKinds() {
  const kinds = {};
  for (const x of new Set([...held, ...holding])) {
    const k = x?.constructor?.name || typeof x;
    kinds[k] = (kinds[k] || 0) + 1;
  }
  return kinds;
}
