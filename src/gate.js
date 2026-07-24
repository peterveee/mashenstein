// The only code a browser-only iPhone executes. It decides whether the full
// game is allowed before creating canvases, loading game fonts or requesting
// game.js. Every other platform proceeds directly to the ordinary game boot.
import { installFlavor, installTarget, readPlatform } from './engine/platform.js';

const GAME_FONT_URL = 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@400..600&family=Permanent+Marker&display=swap';
const GAME_FONT_FACES = [
  "400 32px 'Lilita One'",
  "500 12px 'Fredoka'",
  "600 12px 'Fredoka'",
  "400 12px 'Permanent Marker'",
];
const GAME_FONT_WAIT_MS = 4000;
const SHARE_SVG = `<svg class="mash-install-share" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M8.2 10.5H6.4v9.1a1.4 1.4 0 0 0 1.4 1.4h8.4a1.4 1.4 0 0 0 1.4-1.4v-9.1h-1.8"/>
  <path d="M12 15.2V3.2"/><path d="M8.4 6.6 12 3l3.6 3.6"/>
</svg>`;
const SHARE = `<span class="mash-install-ui">${SHARE_SVG}Share</span>`;
const DOTS = `<span class="mash-install-ui mash-install-dots">•••</span>`;

function focusHeading(dialog) {
  const heading = dialog && dialog.querySelector('[data-dialog-heading]');
  if (!heading) return;
  try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }
}

function trapStaticDialog(dialog) {
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    focusHeading(dialog);
  });
  requestAnimationFrame(() => focusHeading(dialog));
}

function installSteps(flavor, target) {
  if (flavor === 'menu') {
    return [
      `Tap ${DOTS} ${target.where} of Safari.`,
      `Tap ${SHARE} in the menu that opens.`,
      'Scroll to <span class="mash-install-ui">Add to Home Screen</span>, then tap <b>Add</b>.',
    ];
  }
  if (flavor === 'safari') {
    return [
      `Tap ${SHARE} — ${target.where}.`,
      'Scroll to <span class="mash-install-ui">Add to Home Screen</span>.',
      'Tap <b>Add</b>, then open MASHENSTEIN from your Home Screen.',
    ];
  }
  if (flavor === 'alt') {
    return [
      `Open this browser’s ${SHARE} or ${DOTS} menu.`,
      'Scroll to <span class="mash-install-ui">Add to Home Screen</span>.',
      'Tap <b>Add</b>, then open MASHENSTEIN from your Home Screen.',
    ];
  }
  return [
    `Tap this app’s ${DOTS} or ${SHARE} menu.`,
    'Choose <span class="mash-install-ui">Open in Safari</span>.',
    'Safari will show the Home Screen installation steps.',
  ];
}

function showInstallBlocker(platform) {
  const flavor = installFlavor(platform.ua) || 'safari';
  const root = document.createElement('div');
  root.id = 'info-screen';
  root.className = 'mash-install-blocker';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'install-blocker-title');
  const paint = () => {
    const portrait = window.innerHeight > window.innerWidth;
    const target = installTarget(flavor, portrait);
    root.dataset.edge = target.edge;
    root.dataset.side = target.side;
    const inApp = flavor === 'inapp';
    root.innerHTML = `
      <main class="mash-install-card">
        <div class="mash-install-head">
          <img class="mash-install-icon" src="icon-180.png" alt="">
          <div>
            <div class="mash-install-eyebrow">${inApp ? 'THIS IS NOT REALLY A BROWSER' : 'FOUR TAPS, ONCE'}</div>
            <h1 id="install-blocker-title" data-dialog-heading tabindex="-1">${inApp ? 'OPEN IN SAFARI FIRST' : 'PLAY IT FULLSCREEN'}</h1>
          </div>
        </div>
        <div class="mash-install-cols">
          <div>
            <p>${inApp
              ? 'You are inside another app’s built-in browser. Open MASHENSTEIN in Safari so it can be installed.'
              : 'Safari’s bars eat a third of the screen. On your Home Screen, MASHENSTEIN opens like a real app — no address bar, no toolbar.'}</p>
            ${inApp ? '' : `<ul class="mash-install-why">
              <li>True fullscreen</li><li>Plays offline</li><li>Its own icon</li>
            </ul>`}
          </div>
          <ol class="mash-install-steps">${installSteps(flavor, target).map((step) => `<li><span>${step}</span></li>`).join('')}</ol>
        </div>
        <div class="mash-install-notes">
          ${flavor === 'menu' ? '<p class="mash-install-note">Leave <b>Open as Web App</b> on — that switch is the fullscreen.</p>' : ''}
          ${flavor === 'alt' ? '<p class="mash-install-note">Safari handles this most reliably if this browser does not offer that option.</p>' : ''}
          ${inApp ? '' : '<p class="mash-install-note">Installation is required on iPhone. After adding it, close this page and open the MASHENSTEIN icon.</p>'}
        </div>
      </main>
      ${inApp ? '' : `<div class="mash-install-arrow" aria-hidden="true">${target.glyph}</div>`}`;
  };
  paint();
  document.body.appendChild(root);
  trapStaticDialog(root);
  const repaint = () => { paint(); requestAnimationFrame(() => focusHeading(root)); };
  window.addEventListener('resize', repaint);
  window.addEventListener('orientationchange', repaint);
}

let gameFontsReady = null;
function addGameFonts() {
  if (gameFontsReady) return gameFontsReady;
  const existing = document.getElementById('mash-game-fonts');
  if (existing) return Promise.resolve();
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://fonts.gstatic.com';
  preconnect.crossOrigin = '';
  const fonts = document.createElement('link');
  fonts.id = 'mash-game-fonts';
  fonts.rel = 'stylesheet';
  fonts.href = GAME_FONT_URL;

  // The game draws and measures one cached canvas sprite per glyph. Starting
  // game.js before this stylesheet has registered its @font-face rules lets a
  // fast cached bundle win the race (especially in an installed iPhone app):
  // the first title frame then permanently caches fallback shapes AND fallback
  // advances. Wait for the CSS, then the actual face files, before any canvas
  // text can be measured. A bounded fallback preserves offline boot.
  if (document.fonts?.load) {
    gameFontsReady = Promise.race([
      new Promise((resolve) => {
        fonts.onload = () => {
          Promise.all(GAME_FONT_FACES.map((face) => document.fonts.load(face)))
            .then(resolve, resolve);
        };
        fonts.onerror = resolve;
      }),
      new Promise((resolve) => setTimeout(resolve, GAME_FONT_WAIT_MS)),
    ]);
  } else {
    gameFontsReady = Promise.resolve();
  }
  document.head.append(preconnect, fonts);
  return gameFontsReady;
}

function buildTimeLabel(value = window.__MASH_BUILT_AT__) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'BUILD TIME UNAVAILABLE';
  try {
    return `BUILD: ${new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(date)}`;
  } catch (e) {
    return `BUILD: ${date.toISOString()}`;
  }
}

function createGameDom() {
  const shell = document.createElement('div');
  shell.id = 'game-shell';
  shell.innerHTML = `
    <canvas id="chrome"></canvas>
    <canvas id="game"></canvas>
    <div id="safe-area" aria-hidden="true"></div>
    <div id="font-loading" role="status" aria-live="polite">REPLACING BURNT-OUT LETTERS…</div>
    <div id="boot-error" role="alert"></div>`;
  document.body.appendChild(shell);

  const overlay = document.createElement('div');
  overlay.id = 'portrait-overlay';
  overlay.className = 'mash-portrait-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'portrait-overlay-title');
  overlay.setAttribute('aria-describedby', 'portrait-overlay-copy');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="mash-portrait-card">
      <div class="mash-portrait-brand">
        <div class="mash-portrait-wordmark" aria-hidden="true">MASHENSTEIN</div>
        <img class="mash-portrait-icon" src="icon-180.png" alt="">
      </div>
      <div class="mash-portrait-message">
        <div class="mash-phone-turn" aria-hidden="true">↻</div>
        <h1 id="portrait-overlay-title">TURN THE ARCADE SIDEWAYS</h1>
        <p id="portrait-overlay-copy" class="mash-sr-only">Rotate your device to landscape to continue.</p>
        <p class="mash-portrait-gag">The arcade was not budgeted for this many vertical pixels.</p>
      </div>
      <div id="portrait-error-tools" class="mash-portrait-error" hidden>
        <p><b>The arcade stopped running.</b> Copy this report before reloading.</p>
        <pre id="portrait-error-message"></pre>
        <button id="copy-error" type="button">COPY ERROR</button>
        <p id="copy-error-status" class="mash-copy-status" aria-live="polite"></p>
      </div>
      <div class="mash-portrait-reload">
        <button id="portrait-reload" type="button">FORCE RELOAD</button>
      </div>
      <p class="mash-build-time">${buildTimeLabel()}</p>
    </div>`;
  document.body.appendChild(overlay);
}

function exposeError(detail) {
  window.__mash_fatal_error = String(detail || 'Unknown error');
  if (window.dispatchEvent && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mashfatalerror', {
      detail: window.__mash_fatal_error,
    }));
  }
}

async function loadGame() {
  const fontsReady = addGameFonts();
  createGameDom();

  window.addEventListener('error', (e) => {
    const el = document.getElementById('boot-error');
    if (el && !window.__mash_booted) {
      el.style.display = 'block';
      const detail = e.error?.stack || e.message || e.error;
      exposeError(detail);
      el.textContent = 'MASHENSTEIN failed to boot (the arcade remains unplugged):\n\n' + detail;
    }
  });

  await fontsReady;
  const loading = document.getElementById('font-loading');
  if (loading?.remove) loading.remove();

  const script = document.createElement('script');
  const embedded = document.getElementById('mash-embedded-game');
  if (embedded) script.textContent = embedded.textContent;
  else script.src = new URL('./game.js', document.baseURI).href;
  script.onerror = () => {
    const el = document.getElementById('boot-error');
    if (el) {
      el.style.display = 'block';
      el.textContent = 'MASHENSTEIN failed to load (the arcade remains unplugged).';
      exposeError('The game script failed to load.');
    }
  };
  document.body.appendChild(script);
}

function start() {
  const detected = readPlatform();
  // `npm run dev` marks the lightweight shell before this gate executes.
  // That lets a real iPhone browser exercise the game over the LAN without
  // weakening the installation requirement in any production artifact.
  const devBrowserBypass = window.__MASH_DEV__ === true && !detected.allowed;
  const platform = devBrowserBypass
    ? { ...detected, allowed: true, devBrowserBypass: true }
    : detected;
  window.__mash_platform = platform;
  if (!platform.allowed) showInstallBlocker(platform);
  else loadGame();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
