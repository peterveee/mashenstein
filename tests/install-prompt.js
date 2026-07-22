// Who gets told about the Home Screen, and who is left alone. The card is DOM
// and cannot be exercised headlessly, but the decision in front of it is pure —
// and it is the part with the ways to be wrong: nagging a desktop, nagging a
// player who already installed it, or nagging anyone forever.
import { installDom } from './dom-stub.js';
installDom();
const { installAdvice } = await import('../src/engine/install-prompt.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1';
const IPHONE_INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';

const DAY = 24 * 60 * 60 * 1000;

// Who is asked at all.
assert(installAdvice({ ua: IPHONE_SAFARI }) === 'safari', 'iPhone Safari gets the walkthrough');
assert(installAdvice({ ua: IPHONE_CHROME }) === 'alt', 'iPhone Chrome gets the share-menu wording');
assert(installAdvice({ ua: IPHONE_INSTAGRAM }) === 'inapp', "an app's webview is sent to Safari");
assert(installAdvice({ ua: IPAD }) === null, 'iPad is left alone — it already gets real fullscreen');
assert(installAdvice({ ua: MAC }) === null, 'desktop is left alone');
assert(installAdvice({ ua: ANDROID }) === null, 'Android is left alone — the browser prompts for itself');

// Already installed: navigator.standalone, or the display-mode query the
// caller resolves for every other platform.
assert(installAdvice({ ua: IPHONE_SAFARI, standalone: true }) === null,
  'a Home Screen launch is never asked to add itself to the Home Screen');

// Asked at most three times, and never twice in the same few days.
const shown = (n, t) => ({ ua: IPHONE_SAFARI, seen: { n, t }, now: t + 4 * DAY });
assert(installAdvice(shown(1, 0)) === 'safari', 'comes back after a few days');
assert(installAdvice(shown(2, 0)) === 'safari', 'and once more after that');
assert(installAdvice(shown(3, 0)) === null, 'three showings is the end of it');
assert(installAdvice({ ua: IPHONE_SAFARI, seen: { n: 1, t: 0 }, now: DAY }) === null,
  'does not reappear the next day');
// "Got it" writes the cap straight in, which is the same door as above but is
// the one the button actually uses.
assert(installAdvice({ ua: IPHONE_SAFARI, seen: { n: 3, t: 0 }, now: 400 * DAY }) === null,
  'dismissing it for good means for good');

// Nothing here should mind being handed junk: localStorage can be blocked, and
// a UA string is whatever the browser feels like saying.
assert(installAdvice({}) === null, 'no arguments, no card');
assert(installAdvice() === null, 'no environment at all, no card');
assert(installAdvice({ ua: IPHONE_SAFARI, seen: {} }) === 'safari', 'an empty record reads as never shown');

console.log(failed ? 'INSTALL PROMPT: FAILED' : 'INSTALL PROMPT: OK');
process.exit(failed ? 1 : 0);
