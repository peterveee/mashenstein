// The phone audio profile: who gets it, what it sets, and — the part a refactor can
// silently break — that it is applied before the AudioContext is built.
import { readFileSync } from 'node:fs';
import { detectPlatform } from '../src/engine/platform.js';
import {
  phoneAudioProfile, applyPhoneAudioProfile, PHONE_LATENCY_HINT, PHONE_LOOKAHEAD,
} from '../src/engine/phone-audio.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// The same UA strings tests/mobile-lifecycle.js gates on, so the two suites can never
// disagree about which device class a string belongs to.
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const IPAD_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36';

const iphone = phoneAudioProfile(detectPlatform({ ua: IPHONE, standalone: true }));
assert(iphone && iphone.latencyHint === PHONE_LATENCY_HINT && iphone.lookahead === PHONE_LOOKAHEAD,
  'an installed iPhone gets the bigger buffer and the wider scheduler window');
assert(phoneAudioProfile(detectPlatform({ ua: IPHONE })),
  'and so does a browser iPhone — the gate that blocks it is not this one');
assert(phoneAudioProfile(detectPlatform({ ua: ANDROID, screenW: 412, screenH: 915 })),
  'a narrow Android is a phone and gets the profile');

// Everything with room to be a small desktop keeps `interactive`: a jump sound
// arriving late is the cost, and only a phone's headroom justifies paying it.
assert(!phoneAudioProfile(detectPlatform({ ua: IPAD })), 'an iPad is left alone');
assert(!phoneAudioProfile(detectPlatform({ ua: IPAD_MAC, maxTouchPoints: 5 })),
  'a Mac-UA touch iPad is left alone');
assert(!phoneAudioProfile(detectPlatform({ ua: ANDROID, screenW: 800, screenH: 1280 })),
  'a wide Android is a tablet and is left alone');
assert(!phoneAudioProfile(detectPlatform({ ua: DESKTOP })), 'desktop is left alone');
assert(!phoneAudioProfile(), 'and no platform at all is not a phone');

// 0.5 has to survive setSequencerLookahead, which clamps anything outside its option
// list back to the 0.25 default rather than trusting the caller.
const audioSrc = readFileSync(new URL('../src/engine/audio.js', import.meta.url), 'utf8');
const options = /const SEQUENCER_LOOKAHEAD_OPTIONS = Object\.freeze\(\[([^\]]+)\]\)/.exec(audioSrc);
assert(options && options[1].split(',').map((s) => Number(s.trim())).includes(PHONE_LOOKAHEAD),
  'the phone lookahead is one the engine will actually accept');

const calls = [];
const stub = {
  setLatencyHint: (v) => calls.push(['latency', v]),
  setSequencerLookahead: (v) => calls.push(['lookahead', v]),
};
const applied = applyPhoneAudioProfile(stub, detectPlatform({ ua: IPHONE, standalone: true }));
assert(applied && calls.length === 2
  && calls[0][0] === 'latency' && calls[0][1] === 0.05
  && calls[1][0] === 'lookahead' && calls[1][1] === 0.5,
  'applying the profile sets a 50ms buffer request and a half-second window');
calls.length = 0;
assert(applyPhoneAudioProfile(stub, detectPlatform({ ua: DESKTOP })) === null && !calls.length,
  'and touches nothing at all off a phone');

// THE ORDERING, which is the whole point: latencyHint is an AudioContext constructor
// argument, so a call that lands after ensure() is a call that silently does nothing.
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const applyAt = main.indexOf('applyPhoneAudioProfile(Audio, platform)');
const ensureAt = main.indexOf('Audio.ensure()');
assert(applyAt > 0 && ensureAt > 0 && applyAt < ensureAt,
  'the game applies the phone profile before it builds the audio context');
assert(/import \{ applyPhoneAudioProfile \} from '\.\/engine\/phone-audio\.js'/.test(main),
  'and gets it from the module the tests above can reach without a DOM');

console.log(failed ? '\nFAILED' : '\nPASSED');
process.exit(failed ? 1 : 0);
