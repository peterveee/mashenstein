// THE PHONE AUDIO PROFILE: the two engine levers a phone needs set before the
// AudioContext exists, kept in one testable place.
//
// Everywhere else the game takes the browser's own answer — `interactive`, the
// smallest output buffer the device will give, because a jump sound arriving late
// is a jump sound that feels wrong (see the long note in audio.js ensure()). A
// phone playing the rhythm cabinet is the one place that trade goes the other way:
// ~35 channel strips, a multiband master, three arps and a 2.2s convolution reverb
// have to be finished inside every render quantum, and at a three-millisecond
// buffer a single late callback is heard as a crackle rather than absorbed.
//
// Two levers, and they protect against DIFFERENT failures — the distinction the
// whole phone-audio effort turns on:
//
//   latencyHint  — the OUTPUT buffer. Armour for the AUDIO thread: how much
//                  finished audio is banked ahead of the speaker, so a DSP
//                  callback that overruns its quantum is covered instead of
//                  underrunning. Fixes crackle.
//   lookahead    — the SEQUENCER window. Armour for the MAIN thread: how far
//                  ahead of the clock notes are queued, so a long frame does not
//                  starve the transport and land notes in the past. Fixes holes.
//
// A number rather than 'playback' for the buffer: Chrome maps the string to a very
// large buffer (often 80-100ms+) and Safari treats the hints coarsely, so the same
// word means two different things on the two phones this ships to. A number is the
// same ask on both, and the engine already accepts one.
//
// Both are REQUESTS. `ensure()` logs what was actually granted; nothing downstream
// may assume the hint won, and nothing needs to: the beat judge reads the context's
// real latency every frame (heardLatencySec), so a larger buffer moves the lane and
// the press window together and a saved CALIBRATE offset stays valid.
export const PHONE_LATENCY_HINT = 0.05;
// One of SEQUENCER_LOOKAHEAD_OPTIONS — the engine clamps anything else back to the
// 0.25 default rather than trusting the caller, so keep this list-legal.
export const PHONE_LOOKAHEAD = 0.5;

/**
 * The profile for a device, or null when there is nothing to change.
 *
 * PHONES ONLY, and the same predicate the renderer uses for its own phone rung
 * (renderer.js phonePlatform): a tablet has the thermal headroom and the screen
 * to be treated as a small desktop, and a desktop keeps `interactive` because a
 * desk is the only thing on it that ever wanted otherwise.
 */
export function phoneAudioProfile(platform = {}) {
  const phone = !!(platform.isIphone || platform.isAndroidPhone);
  return phone ? { latencyHint: PHONE_LATENCY_HINT, lookahead: PHONE_LOOKAHEAD } : null;
}

/**
 * Apply it. MUST run before `Audio.ensure()` — `latencyHint` is a construction
 * argument and a context cannot be talked into a new one afterwards, so a call made
 * later is a call that silently does nothing. main.js keeps it next to
 * setCaptureEnabled for exactly that reason, and a source test pins the order.
 *
 * Returns the profile applied, or null on the platforms it leaves alone.
 */
export function applyPhoneAudioProfile(audio, platform = {}) {
  const p = phoneAudioProfile(platform);
  if (!p) return null;
  audio.setLatencyHint(p.latencyHint);
  audio.setSequencerLookahead(p.lookahead);
  return p;
}
