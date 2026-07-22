// First-load coach for iPhone: how to put MASHENSTEIN on the Home Screen, and
// why it is worth the four taps.
//
// This is DOM rather than a canvas menu state on purpose. The whole point is to
// point AT Safari's own toolbar, which lives outside the game's letterboxed
// 480x270 rect and cannot be gestured at from inside it — and the instructions
// have to stay legible on a 4-inch screen at sizes the game's own font never
// draws. It is the one screen in this game that is about the browser rather
// than the arcade, so it is allowed to look like a browser thing.
//
// iPhone only. iPad already grants the Fullscreen API (main.js asks on the
// first touch and gets it), so the pitch there would be "lose the toolbar you
// already lost" — the tip is only true where the tip is needed.

const KEY = 'mashenstein.a2hs';
const MAX_SHOWS = 3;                       // then it stops asking, forever
const REST_MS = 3 * 24 * 60 * 60 * 1000;   // ...and waits this long in between
const APPEAR_MS = 900;                     // let the title screen land first

// In-app browsers (the webview inside Instagram, Facebook, Slack, ...) cannot
// add anything to the Home Screen at all, so they get sent to Safari instead of
// a set of steps they have no menu for. They give themselves away by NOT
// claiming to be Safari; the named ones are here because a couple of them do.
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|LinkedIn|Pinterest|GSA\//;
// Real browsers that are not Safari. They can install, but from their own menu.
const ALT_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|Brave/;

function readRecord() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}

function writeRecord(rec) {
  try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* private mode */ }
}

// Pure, so the whole matrix is testable without a DOM: which card (if any) this
// visitor should see. Returns null for "say nothing", which is the answer for
// every desktop, every Android, every iPad, anyone already launched from the
// Home Screen, and anyone who has been told enough times.
export function installAdvice({ ua = '', standalone = false, seen = null, now = 0 } = {}) {
  if (!/iPhone|iPod/.test(ua)) return null;
  if (standalone) return null;                       // already installed
  const shows = (seen && seen.n) || 0;
  if (shows >= MAX_SHOWS) return null;
  if (shows > 0 && now - ((seen && seen.t) || 0) < REST_MS) return null;
  if (ALT_BROWSER.test(ua)) return 'alt';
  if (IN_APP.test(ua) || !/Safari/.test(ua)) return 'inapp';
  return 'safari';
}

const SHARE_SVG = `<svg class="mash-a2hs-share" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M8.2 10.5H6.4v9.1a1.4 1.4 0 0 0 1.4 1.4h8.4a1.4 1.4 0 0 0 1.4-1.4v-9.1h-1.8"/>
  <path d="M12 15.2V3.2"/><path d="M8.4 6.6 12 3l3.6 3.6"/>
</svg>`;

const CSS = `
.mash-a2hs {
  position: fixed; inset: 0; z-index: 40; display: flex;
  align-items: center; justify-content: center;
  padding: calc(8px + env(safe-area-inset-top)) calc(8px + env(safe-area-inset-right))
           calc(8px + env(safe-area-inset-bottom)) calc(8px + env(safe-area-inset-left));
  background: rgba(7, 5, 14, 0.86);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  font-family: 'Fredoka', system-ui, -apple-system, sans-serif;
  color: #efe7ff; opacity: 0; transition: opacity 0.28s ease;
  -webkit-tap-highlight-color: transparent;
}
.mash-a2hs.is-in { opacity: 1; }
.mash-a2hs.is-out { opacity: 0; }

.mash-a2hs-card {
  position: relative; width: 100%; max-width: 30rem;
  max-height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;
  box-sizing: border-box; padding: 14px 16px 12px;
  background: #2a173b; border: 2px solid #48e0c8; border-radius: 14px;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.55);
}
/* The sticker scallop the state-machine shutter uses, borrowed as a top edge
   so the card reads as part of the game and not as a Safari alert. */
.mash-a2hs-card::before {
  content: ''; position: absolute; left: 10px; right: 10px; top: -7px; height: 8px;
  background: radial-gradient(circle at 6px 4px, #f2a6c8 4px, transparent 4.5px) 0 0/12px 8px repeat-x;
}

.mash-a2hs-eyebrow {
  font-size: 0.62rem; letter-spacing: 0.18em; color: #48e0c8;
  font-weight: 600; text-transform: uppercase;
}
.mash-a2hs h1 {
  margin: 2px 0 6px; font-family: 'Lilita One', system-ui, sans-serif; font-weight: 400;
  font-size: 1.5rem; line-height: 1.05; color: #ffcf33;
  text-shadow: 0 2px 0 #a8791f; letter-spacing: 0.01em;
}
.mash-a2hs p { margin: 0 0 8px; font-size: 0.86rem; line-height: 1.32; color: #d9cfe8; }
.mash-a2hs b { color: #fff; font-weight: 600; }

.mash-a2hs-why { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0 0 10px; padding: 0; list-style: none; }
.mash-a2hs-why li { font-size: 0.78rem; color: #cfc3e2; }
.mash-a2hs-why li::before { content: '\\2726'; color: #f6d33c; margin-right: 5px; }

.mash-a2hs-steps { margin: 0 0 10px; padding: 0; list-style: none; counter-reset: step; }
.mash-a2hs-steps li {
  display: flex; align-items: baseline; gap: 8px;
  padding: 5px 0; font-size: 0.86rem; line-height: 1.3;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}
.mash-a2hs-steps li::before {
  counter-increment: step; content: counter(step);
  flex: 0 0 1.25rem; height: 1.25rem; border-radius: 50%;
  background: #48e0c8; color: #10202c; font-weight: 600; font-size: 0.72rem;
  text-align: center; line-height: 1.25rem;
}
.mash-a2hs-share {
  width: 0.95em; height: 0.95em; vertical-align: -0.13em; margin: 0 1px;
  fill: none; stroke: #4da3ff; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
}
.mash-a2hs-note {
  margin: 0 0 10px; font-size: 0.72rem; line-height: 1.3; color: #9d90b4;
}

.mash-a2hs-buttons { display: flex; align-items: center; gap: 14px; }
.mash-a2hs button { font-family: inherit; cursor: pointer; -webkit-appearance: none; }
.mash-a2hs-ok {
  flex: 1 1 auto; padding: 11px 14px; border: 0; border-radius: 9px;
  background: #f6d33c; color: #2a173b; font-weight: 600; font-size: 0.95rem;
  letter-spacing: 0.06em; text-transform: uppercase;
  box-shadow: 0 3px 0 #a8791f;
}
.mash-a2hs-ok:active { transform: translateY(2px); box-shadow: 0 1px 0 #a8791f; }
.mash-a2hs-later {
  flex: 0 0 auto; padding: 8px 2px; border: 0; background: none;
  color: #9d90b4; font-size: 0.8rem; text-decoration: underline;
}

/* The pointer at Safari's own toolbar. Portrait puts that toolbar at the
   bottom; landscape collapses it into a single bar at the top — so the arrow
   swaps ends with the phone rather than confidently pointing at nothing. */
.mash-a2hs-arrow {
  position: absolute; left: 50%; margin-left: -13px;
  font-size: 26px; line-height: 1; color: #48e0c8; text-shadow: 0 0 10px rgba(72, 224, 200, 0.6);
  pointer-events: none;
}
.mash-a2hs[data-edge="bottom"] .mash-a2hs-arrow {
  bottom: calc(6px + env(safe-area-inset-bottom)); animation: mash-a2hs-bob-down 1.4s ease-in-out infinite;
}
.mash-a2hs[data-edge="top"] .mash-a2hs-arrow {
  top: calc(4px + env(safe-area-inset-top)); left: auto; right: 12px; margin-left: 0;
  animation: mash-a2hs-bob-up 1.4s ease-in-out infinite;
}
@keyframes mash-a2hs-bob-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
@keyframes mash-a2hs-bob-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@media (prefers-reduced-motion: reduce) { .mash-a2hs-arrow { animation: none; } }

/* Landscape on a phone is ~320px tall with the toolbar in it: two columns, and
   everything one notch smaller, or the buttons fall off the bottom. */
@media (orientation: landscape) and (max-height: 460px) {
  .mash-a2hs-card { max-width: 40rem; padding: 10px 14px; }
  .mash-a2hs h1 { font-size: 1.25rem; }
  .mash-a2hs-cols { display: flex; gap: 16px; }
  .mash-a2hs-cols > * { flex: 1 1 0; min-width: 0; }
  .mash-a2hs p { font-size: 0.78rem; }
  .mash-a2hs-steps li { font-size: 0.78rem; padding: 4px 0; }
  .mash-a2hs-arrow { font-size: 22px; }
}
`;

function cardHtml(flavor, portrait, hasSave) {
  if (flavor === 'inapp') {
    return `
      <div class="mash-a2hs-eyebrow">This is not really a browser</div>
      <h1>OPEN IN SAFARI FIRST</h1>
      <p>You are inside another app's built-in browser, which can't keep the game
         anywhere. Sent to Safari, MASHENSTEIN can live on your Home Screen and
         run with no address bar in the way.</p>
      <ol class="mash-a2hs-steps">
        <li>Tap this app's <b>&#8943;</b> or ${SHARE_SVG} menu</li>
        <li>Choose <b>Open in Safari</b> (or <b>Open in browser</b>)</li>
        <li>The tip for the Home Screen will meet you over there</li>
      </ol>
      <div class="mash-a2hs-buttons">
        <button class="mash-a2hs-ok" type="button">Play here for now</button>
      </div>`;
  }
  const share = flavor === 'alt'
    ? `Tap your browser's ${SHARE_SVG} <b>Share</b> button`
    : `Tap ${SHARE_SVG} <b>Share</b> — ${portrait ? 'in the bar at the bottom' : 'top-right of the bar above'}`;
  const altNote = flavor === 'alt'
    ? `<p class="mash-a2hs-note">Safari handles this most reliably, if the menu here doesn't offer it.</p>`
    : '';
  const rotate = portrait
    ? `<p class="mash-a2hs-note">Then turn the phone sideways. MASHENSTEIN is a landscape game and will
       happily letterbox itself into a stamp if you make it.</p>`
    : '';
  const saveNote = hasSave
    ? `<p class="mash-a2hs-note">Heads up: iOS may hand the Home Screen copy its own save file, so the
       sooner you add it, the less there is to leave behind.</p>`
    : '';
  return `
    <div class="mash-a2hs-eyebrow">Four taps, once</div>
    <h1>PUT THE ARCADE ON YOUR HOME SCREEN</h1>
    <div class="mash-a2hs-cols">
      <div>
        <p>Safari's bars eat about a third of a phone screen. Added to your Home
           Screen, MASHENSTEIN opens like a real app: no address bar, no toolbar,
           the whole display.</p>
        <ul class="mash-a2hs-why">
          <li>True fullscreen</li>
          <li>Plays offline</li>
          <li>Its own icon</li>
          <li>Starts faster</li>
        </ul>
      </div>
      <div>
        <ol class="mash-a2hs-steps">
          <li>${share}</li>
          <li>Scroll down to <b>Add to Home Screen</b></li>
          <li>Tap <b>Add</b>, then open MASHENSTEIN from your Home Screen</li>
        </ol>
      </div>
    </div>
    ${altNote}${rotate}${saveNote}
    <div class="mash-a2hs-buttons">
      <button class="mash-a2hs-ok" type="button">Got it</button>
      <button class="mash-a2hs-later" type="button">not now</button>
    </div>`;
}

// Shows the card if this visitor should see one. `hasSave` softens the copy for
// a returning player; `onDismiss` is called inside the button's own click, so
// the caller can spend that gesture on unlocking audio.
export function initInstallPrompt({ hasSave = false, onDismiss = null } = {}) {
  if (typeof document === 'undefined' || !document.body) return null;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const flavor = installAdvice({
    ua: nav.userAgent || '',
    // navigator.standalone is the iOS-only flag for "launched from the Home
    // Screen"; the media query is what every other browser answers to.
    standalone: nav.standalone === true
      || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches),
    seen: readRecord(),
    now: Date.now(),
  });
  if (!flavor) return null;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'mash-a2hs';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Add MASHENSTEIN to your Home Screen');
  const portrait = window.innerHeight > window.innerWidth;
  root.innerHTML = `<div class="mash-a2hs-card">${cardHtml(flavor, portrait, hasSave)}</div>`
    + (flavor === 'inapp' ? '' : `<div class="mash-a2hs-arrow" aria-hidden="true">${portrait ? '▼' : '▲'}</div>`);
  root.dataset.edge = portrait ? 'bottom' : 'top';

  // A rotation mid-read moves Safari's toolbar to the other end of the screen,
  // and an arrow left pointing at the wrong edge is worse than no arrow. Cheap
  // enough to just rebuild the card in the new orientation.
  const onResize = () => {
    const p = window.innerHeight > window.innerWidth;
    if (p === (root.dataset.edge === 'bottom')) return;
    root.dataset.edge = p ? 'bottom' : 'top';
    root.querySelector('.mash-a2hs-card').innerHTML = cardHtml(flavor, p, hasSave);
    const arrow = root.querySelector('.mash-a2hs-arrow');
    if (arrow) arrow.textContent = p ? '▼' : '▲';
    wire();
  };

  // "Got it" is taken at its word and retires the tip. "not now" only restamps
  // the clock — the showing itself was already counted below, so a card that
  // was swiped away rather than answered costs exactly the same one.
  function close(done) {
    const rec = readRecord() || { n: 0, t: 0 };
    writeRecord({ n: done ? MAX_SHOWS : rec.n, t: Date.now() });
    root.classList.remove('is-in');
    root.classList.add('is-out');
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    setTimeout(() => { root.remove(); style.remove(); }, 320);
    onDismiss && onDismiss();
  }

  function wire() {
    const ok = root.querySelector('.mash-a2hs-ok');
    const later = root.querySelector('.mash-a2hs-later');
    ok && ok.addEventListener('click', () => close(true));
    later && later.addEventListener('click', () => close(false));
  }
  wire();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // The count is spent on APPEARING, not on being dismissed: a player who
  // swipes away to the Home Screen mid-card has still been shown it once.
  const rec = readRecord() || { n: 0, t: 0 };
  writeRecord({ n: rec.n + 1, t: Date.now() });

  // A beat of the title screen first, so the card interrupts something the
  // player can already see is worth putting on their phone.
  setTimeout(() => {
    document.body.appendChild(root);
    // Force a frame before the class lands, or the transition never runs.
    requestAnimationFrame(() => root.classList.add('is-in'));
  }, APPEAR_MS);
  return root;
}
