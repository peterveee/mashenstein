// The coach that shows an iPhone player how to put MASHENSTEIN on the Home
// Screen, and why it is worth the four taps.
//
// This is DOM rather than a canvas menu state on purpose. The whole point is to
// point AT Safari's own toolbar, which lives outside the game's letterboxed
// 480x270 rect and cannot be gestured at from inside it — and the instructions
// have to stay legible on a phone at sizes the game's own font never draws. It
// is the one screen in this game that is about the browser rather than the
// arcade, so it is allowed to look like a browser thing.
//
// It appears once on first load, and lives permanently under EXTRAS on the
// title screen for anyone who waved it away and thought better of it.
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

// iOS 26 redesigned Safari's toolbar. In the Compact layout — the default —
// there is no Share button on screen at all: the bar is a floating capsule of
// [back] [address] [•••], and Share hides inside that ••• menu. Instructions
// written for the old five-icon toolbar send the player hunting for a glyph
// their phone does not draw, so the OS version picks which steps they get.
export function iosMajor(ua = '') {
  const m = /(?:iPhone )?OS (\d+)(?:_\d+)* like Mac OS X/.exec(ua);
  return m ? Number(m[1]) : 0;
}
const COMPACT_FROM = 26;

function readRecord() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
}

function writeRecord(rec) {
  try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* private mode */ }
}

function env() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  return {
    ua: nav.userAgent || '',
    // navigator.standalone is the iOS-only flag for "launched from the Home
    // Screen"; the media query is what every other browser answers to.
    standalone: nav.standalone === true || !!(typeof window !== 'undefined'
      && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches),
  };
}

// Which card this browser needs, ignoring how many times it has been shown.
// Null means there is nothing useful to say here.
export function installFlavor(ua = '') {
  if (!/iPhone|iPod/.test(ua)) return null;
  if (ALT_BROWSER.test(ua)) return 'alt';
  if (IN_APP.test(ua) || !/Safari/.test(ua)) return 'inapp';
  return iosMajor(ua) >= COMPACT_FROM ? 'menu' : 'safari';
}

// Pure, so the whole matrix is testable without a DOM: which card (if any) this
// visitor should be shown UNASKED. Null is the answer for every desktop, every
// Android, every iPad, anyone already launched from the Home Screen, and anyone
// who has been told enough times.
export function installAdvice({ ua = '', standalone = false, seen = null, now = 0 } = {}) {
  if (standalone) return null;                       // already installed
  const shows = (seen && seen.n) || 0;
  if (shows >= MAX_SHOWS) return null;
  if (shows > 0 && now - ((seen && seen.t) || 0) < REST_MS) return null;
  return installFlavor(ua);
}

// Is the manual "ADD TO HOME SCREEN" row on the title screen worth drawing?
// Same device test, but deliberately blind to the showing count: asking for it
// is not the same as being nagged, and the answer has to stay yes forever.
export function canInstall() {
  const e = env();
  return !e.standalone && !!installFlavor(e.ua);
}

const SHARE_SVG = `<svg class="mash-a2hs-share" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M8.2 10.5H6.4v9.1a1.4 1.4 0 0 0 1.4 1.4h8.4a1.4 1.4 0 0 0 1.4-1.4v-9.1h-1.8"/>
  <path d="M12 15.2V3.2"/><path d="M8.4 6.6 12 3l3.6 3.6"/>
</svg>`;
// The things the player has to tap, drawn as the chips they are on the phone.
const ui = (label) => `<span class="mash-a2hs-ui">${label}</span>`;
const DOTS = `<span class="mash-a2hs-ui mash-a2hs-dots">•••</span>`;
const SHARE = `<span class="mash-a2hs-ui">${SHARE_SVG}Share</span>`;

const CSS = `
.mash-a2hs {
  position: fixed; inset: 0; z-index: 40; display: flex;
  align-items: center; justify-content: center;
  padding: calc(10px + env(safe-area-inset-top)) calc(10px + env(safe-area-inset-right))
           calc(10px + env(safe-area-inset-bottom)) calc(10px + env(safe-area-inset-left));
  background: rgba(4, 5, 10, 0.9);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  font-family: 'Fredoka', system-ui, -apple-system, sans-serif;
  color: #eceef5; opacity: 0; transition: opacity 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}
/* Keep the end the arrow points from clear of the card. Without this the sheet
   grows to the full height it is allowed and parks its own button on top of
   the arrow, which is the one pixel of this screen that has a job. */
.mash-a2hs[data-edge="bottom"] { padding-bottom: calc(46px + env(safe-area-inset-bottom)); }
.mash-a2hs[data-edge="top"] { padding-top: calc(44px + env(safe-area-inset-top)); }
.mash-a2hs.is-in { opacity: 1; }
.mash-a2hs.is-out { opacity: 0; }

.mash-a2hs-card {
  position: relative; width: 100%; max-width: 27rem;
  max-height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;
  box-sizing: border-box; padding: 22px 20px 18px;
  /* Ink and slate rather than the game's plum: this sheet sits between the
     player and their phone's own UI, and it reads as a thing to act on when it
     is quiet. The colour lives in the accents. */
  background: linear-gradient(180deg, #191a24 0%, #101119 100%);
  border: 1px solid rgba(255, 255, 255, 0.13); border-radius: 22px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.07);
}

.mash-a2hs-head { display: flex; align-items: center; gap: 13px; margin-bottom: 14px; }
/* The actual tile they are about to end up with. Removes itself when the file
   is not beside the page (a loose index.html, a file:// copy). */
.mash-a2hs-icon {
  flex: 0 0 auto; width: 54px; height: 54px; border-radius: 13px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
}
.mash-a2hs-eyebrow {
  font-size: 0.66rem; letter-spacing: 0.19em; color: #48e0c8;
  font-weight: 600; text-transform: uppercase;
}
.mash-a2hs h1 {
  margin: 3px 0 0; font-family: 'Lilita One', system-ui, sans-serif; font-weight: 400;
  font-size: 1.6rem; line-height: 1.06; color: #ffcf33; letter-spacing: 0.01em;
  text-shadow: 0 2px 12px rgba(255, 190, 40, 0.18);
}
.mash-a2hs p { margin: 0 0 14px; font-size: 1rem; line-height: 1.5; color: #c3c8d6; }
.mash-a2hs b { color: #fff; font-weight: 600; }

.mash-a2hs-why { display: flex; flex-wrap: wrap; gap: 7px; margin: 0 0 16px; padding: 0; list-style: none; }
.mash-a2hs-why li {
  padding: 5px 12px; border-radius: 999px; font-size: 0.82rem; color: #a6ecdf;
  background: rgba(72, 224, 200, 0.09); border: 1px solid rgba(72, 224, 200, 0.22);
}

.mash-a2hs-steps { margin: 0 0 15px; padding: 0; list-style: none; counter-reset: step; }
.mash-a2hs-steps li {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.045); border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.97rem; line-height: 1.5;
}
.mash-a2hs-steps li + li { margin-top: 8px; }
.mash-a2hs-steps li::before {
  counter-increment: step; content: counter(step);
  flex: 0 0 auto; width: 1.45rem; height: 1.45rem; margin-top: 0.1rem; border-radius: 50%;
  background: #48e0c8; color: #06231e; font-weight: 600; font-size: 0.8rem;
  text-align: center; line-height: 1.45rem;
}
/* Every inline child of a flex container becomes its own flex item, which put
   a gap around each chip and broke a step into four of them. One span, one
   item, ordinary text flow inside it. */
.mash-a2hs-steps li > span { flex: 1 1 auto; min-width: 0; }

.mash-a2hs-ui {
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
  padding: 1px 8px; margin: 0 1px; border-radius: 8px;
  background: rgba(255, 255, 255, 0.11); border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff; font-weight: 600; font-size: 0.93em;
}
.mash-a2hs-dots { letter-spacing: 0.09em; padding: 1px 9px; }
.mash-a2hs-share {
  width: 0.95em; height: 0.95em; margin-top: -0.1em;
  fill: none; stroke: #6fb4ff; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round;
}
.mash-a2hs p.mash-a2hs-note {
  /* Typed as p.class, not .class: the bare paragraph rule above is the more
     specific selector and would otherwise win, and a footnote set at body size
     is not a footnote. */
  margin: 0 0 14px; font-size: 0.83rem; line-height: 1.45; color: #8a90a3;
}

.mash-a2hs-buttons { display: flex; align-items: center; gap: 16px; }
.mash-a2hs button { font-family: inherit; cursor: pointer; -webkit-appearance: none; }
.mash-a2hs-ok {
  flex: 1 1 auto; max-width: 20rem; padding: 14px 16px; border: 0; border-radius: 13px;
  background: linear-gradient(180deg, #ffd94f, #f3b323);
  color: #241a05; font-weight: 600; font-size: 1rem;
  letter-spacing: 0.06em; text-transform: uppercase;
  box-shadow: 0 3px 0 #b8801a, 0 6px 18px rgba(243, 179, 35, 0.22);
}
.mash-a2hs-ok:active { transform: translateY(2px); box-shadow: 0 1px 0 #b8801a; }
.mash-a2hs-later {
  flex: 0 0 auto; padding: 10px 4px; border: 0; background: none;
  color: #8a90a3; font-size: 0.88rem; text-decoration: underline;
}

/* The pointer at Safari's own toolbar. Where that is depends on the phone:
   iOS 26's Compact bar is a floating capsule at the bottom whose ••• sits at
   the right-hand end; older Safari puts a five-icon toolbar along the bottom in
   portrait and collapses it to a single bar at the top in landscape. The arrow
   moves with all of that rather than confidently pointing at nothing. */
.mash-a2hs-arrow {
  position: absolute; font-size: 26px; line-height: 1; color: #48e0c8;
  text-shadow: 0 0 12px rgba(72, 224, 200, 0.65); pointer-events: none;
}
.mash-a2hs[data-side="center"] .mash-a2hs-arrow { left: 50%; margin-left: -13px; }
.mash-a2hs[data-side="right"] .mash-a2hs-arrow { right: 46px; }
.mash-a2hs[data-edge="bottom"] .mash-a2hs-arrow {
  bottom: calc(6px + env(safe-area-inset-bottom)); animation: mash-a2hs-bob-down 1.4s ease-in-out infinite;
}
.mash-a2hs[data-edge="top"] .mash-a2hs-arrow {
  top: calc(4px + env(safe-area-inset-top)); animation: mash-a2hs-bob-up 1.4s ease-in-out infinite;
}
@keyframes mash-a2hs-bob-down { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } }
@keyframes mash-a2hs-bob-up { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@media (prefers-reduced-motion: reduce) { .mash-a2hs-arrow { animation: none; } }

/* A phone in landscape is ~330px tall with the toolbar in it, so the card
   becomes a real two-column grid: pitch and footnotes down the left, the steps
   and the button down the right. Stacked, the same content is half a screen too
   tall; side by side its height is the taller column rather than the sum.
   The wrapper going display:contents is what lets the two halves it holds in
   portrait become grid cells here without a second copy of the markup. */
@media (orientation: landscape) and (max-height: 560px) {
  .mash-a2hs-card {
    max-width: 44rem; padding: 12px 16px;
    display: grid; grid-template-columns: 1fr 1.15fr;
    column-gap: 20px; align-items: start;
  }
  .mash-a2hs-head { grid-column: 1 / -1; margin-bottom: 8px; gap: 11px; }
  .mash-a2hs-cols { display: contents; }
  .mash-a2hs-notes { grid-column: 1; }
  .mash-a2hs-buttons { grid-column: 2; }
  .mash-a2hs-icon { width: 42px; height: 42px; border-radius: 11px; }
  .mash-a2hs h1 { font-size: 1.24rem; }
  .mash-a2hs-eyebrow { font-size: 0.62rem; }
  .mash-a2hs p { font-size: 0.86rem; line-height: 1.42; margin-bottom: 9px; }
  .mash-a2hs-why { margin-bottom: 0; gap: 6px; }
  .mash-a2hs-why li { font-size: 0.76rem; padding: 4px 10px; }
  .mash-a2hs-steps { margin-bottom: 10px; }
  .mash-a2hs-steps li { padding: 8px 11px; font-size: 0.86rem; line-height: 1.4; }
  .mash-a2hs-steps li + li { margin-top: 6px; }
  .mash-a2hs-steps li::before { width: 1.3rem; height: 1.3rem; line-height: 1.3rem; font-size: 0.74rem; }
  .mash-a2hs p.mash-a2hs-note { font-size: 0.76rem; margin-bottom: 6px; }
  .mash-a2hs-ok { padding: 11px 16px; font-size: 0.94rem; }
}
`;

// Where the thing they have to tap actually is, which decides both the arrow
// and the wording. iOS 26 Compact keeps its capsule at the bottom in either
// orientation; everything older follows the old toolbar.
function target(flavor, portrait) {
  if (flavor === 'menu') return { edge: 'bottom', side: 'right', glyph: '▼', where: 'at the bottom right' };
  if (portrait) return { edge: 'bottom', side: 'center', glyph: '▼', where: 'in the bar at the bottom' };
  return { edge: 'top', side: 'right', glyph: '▲', where: 'top-right of the bar above' };
}

function cardHtml(flavor, portrait, hasSave, manual) {
  const dismiss = manual
    ? `<div class="mash-a2hs-buttons"><button class="mash-a2hs-ok" type="button">Got it</button></div>`
    : `<div class="mash-a2hs-buttons">
         <button class="mash-a2hs-ok" type="button">Got it</button>
         <button class="mash-a2hs-later" type="button">not now</button>
       </div>`;

  if (flavor === 'inapp') {
    return `
      <div class="mash-a2hs-head">
        <img class="mash-a2hs-icon" src="icon-180.png" alt="">
        <div>
          <div class="mash-a2hs-eyebrow">This is not really a browser</div>
          <h1>OPEN IN SAFARI FIRST</h1>
        </div>
      </div>
      <p>You are inside another app's built-in browser, and it can't keep the game
         anywhere. Opened in Safari, MASHENSTEIN can live on your Home Screen and
         run with no address bar in the way.</p>
      <ol class="mash-a2hs-steps">
        <li><span>Tap this app's ${DOTS} or ${SHARE_SVG} menu</span></li>
        <li><span>Choose ${ui('Open in Safari')}</span></li>
        <li><span>The rest of the tip will meet you over there</span></li>
      </ol>
      ${dismiss}`;
  }

  const t = target(flavor, portrait);
  // iOS 26 hid Share inside the ••• menu; older Safari has it in the toolbar;
  // other browsers keep their own arrangement, so they get told the goal
  // rather than a route.
  const steps = flavor === 'menu' ? [
    `Tap ${DOTS} ${t.where} of Safari`,
    `Tap ${SHARE} in the menu that opens`,
    `Scroll to ${ui('Add to Home Screen')}, then tap <b>Add</b>`,
  ] : flavor === 'alt' ? [
    `Open your browser's ${SHARE} or ${DOTS} menu`,
    `Scroll down to ${ui('Add to Home Screen')}`,
    `Tap <b>Add</b>, then open MASHENSTEIN from your Home Screen`,
  ] : [
    `Tap ${SHARE} — ${t.where}`,
    `Scroll down to ${ui('Add to Home Screen')}`,
    `Tap <b>Add</b>, then open MASHENSTEIN from your Home Screen`,
  ];

  const notes = [];
  if (flavor === 'menu') {
    // The one switch that decides whether any of this was worth doing.
    notes.push(`Leave <b>Open as Web App</b> on — that switch is the fullscreen.`);
  }
  if (flavor === 'alt') {
    notes.push(`Safari handles this most reliably, if the menu here doesn't offer it.`);
  }
  if (portrait) {
    notes.push(`Then turn the phone sideways — this one is a landscape game.`);
  }
  if (hasSave) {
    notes.push(`Heads up: iOS may give the Home Screen copy its own save file, so the
                sooner you add it, the less there is to leave behind.`);
  }

  return `
    <div class="mash-a2hs-head">
      <img class="mash-a2hs-icon" src="icon-180.png" alt="">
      <div>
        <div class="mash-a2hs-eyebrow">Four taps, once</div>
        <h1>PLAY IT FULLSCREEN</h1>
      </div>
    </div>
    <div class="mash-a2hs-cols">
      <div>
        <p>Safari's bars eat a third of the screen. On your Home Screen,
           MASHENSTEIN opens like a real app — no address bar, no toolbar,
           the whole display.</p>
        <ul class="mash-a2hs-why">
          <li>True fullscreen</li>
          <li>Plays offline</li>
          <li>Its own icon</li>
        </ul>
      </div>
      <div>
        <ol class="mash-a2hs-steps">${steps.map((s) => `<li><span>${s}</span></li>`).join('')}</ol>
      </div>
    </div>
    <div class="mash-a2hs-notes">${notes.map((n) => `<p class="mash-a2hs-note">${n}</p>`).join('')}</div>
    ${dismiss}`;
}

let open = null;   // only ever one card, however it was asked for

// Builds and shows the card. `manual` marks the EXTRAS route: no "not now"
// (they came looking for it) and no delay.
function mountCard(flavor, { hasSave = false, onDismiss = null, manual = false } = {}) {
  if (open) return open;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.className = 'mash-a2hs';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Add MASHENSTEIN to your Home Screen');
  open = root;

  const paint = () => {
    const portrait = window.innerHeight > window.innerWidth;
    const t = target(flavor, portrait);
    root.dataset.edge = t.edge;
    root.dataset.side = t.side;
    root.dataset.portrait = portrait ? '1' : '0';
    root.innerHTML = `<div class="mash-a2hs-card">${cardHtml(flavor, portrait, hasSave, manual)}</div>`
      + (flavor === 'inapp' ? '' : `<div class="mash-a2hs-arrow" aria-hidden="true">${t.glyph}</div>`);
    // No icon file beside the page (file://, or a loose index.html) — drop the
    // tile rather than leave a broken image in the header.
    const icon = root.querySelector('.mash-a2hs-icon');
    if (icon) icon.addEventListener('error', () => icon.remove());
    root.querySelectorAll('.mash-a2hs-ok').forEach((b) => b.addEventListener('click', () => close(true)));
    root.querySelectorAll('.mash-a2hs-later').forEach((b) => b.addEventListener('click', () => close(false)));
  };

  // A rotation mid-read moves the toolbar to the other end of the screen, and
  // an arrow left pointing at the wrong edge is worse than no arrow. Cheap
  // enough to just rebuild the card in the new orientation.
  const onResize = () => {
    const portrait = window.innerHeight > window.innerWidth;
    if (portrait === (root.dataset.portrait === '1')) return;
    paint();
  };

  // "Got it" is taken at its word and retires the tip. "not now" only restamps
  // the clock — the showing itself was already counted by initInstallPrompt, so
  // a card swiped away rather than answered costs exactly the same one.
  function close(done) {
    const rec = readRecord() || { n: 0, t: 0 };
    writeRecord({ n: done ? MAX_SHOWS : rec.n, t: Date.now() });
    root.classList.remove('is-in');
    root.classList.add('is-out');
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    setTimeout(() => { root.remove(); style.remove(); }, 340);
    open = null;
    onDismiss && onDismiss();
  }

  paint();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  return root;
}

function show(root, delay) {
  setTimeout(() => {
    document.body.appendChild(root);
    // Force a frame before the class lands, or the transition never runs.
    requestAnimationFrame(() => root.classList.add('is-in'));
  }, delay);
}

// First-load coach. `hasSave` softens the copy for a returning player;
// `onDismiss` is called inside the button's own click, so the caller can spend
// that gesture on unlocking audio.
export function initInstallPrompt({ hasSave = false, onDismiss = null } = {}) {
  if (typeof document === 'undefined' || !document.body) return null;
  const e = env();
  const flavor = installAdvice({ ua: e.ua, standalone: e.standalone, seen: readRecord(), now: Date.now() });
  if (!flavor) return null;

  // The count is spent on APPEARING, not on being dismissed: a player who
  // swipes away to the Home Screen mid-card has still been shown it once.
  const rec = readRecord() || { n: 0, t: 0 };
  writeRecord({ n: rec.n + 1, t: Date.now() });

  const root = mountCard(flavor, { hasSave, onDismiss });
  // A beat of the title screen first, so the card interrupts something the
  // player can already see is worth putting on their phone.
  if (root) show(root, APPEAR_MS);
  return root;
}

// The EXTRAS route: same card, asked for rather than sprung, and immediate.
export function showInstallGuide({ hasSave = false, onDismiss = null } = {}) {
  if (typeof document === 'undefined' || !document.body) return null;
  const e = env();
  const flavor = installFlavor(e.ua) || 'safari';
  const root = mountCard(flavor, { hasSave, onDismiss, manual: true });
  if (root) show(root, 0);
  return root;
}
