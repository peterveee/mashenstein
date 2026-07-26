// One source of truth for browser/app lifecycle. Visibility and orientation
// events never resume subsystems independently; they all recompute this policy.
import { readDiag, writeDiag, clearDiag, forceRenderer, forceWebglDensity } from './diag.js';

// One line summarising which overrides are live, so the panel opens saying what
// state the device is already in rather than looking like a fresh slate.
function describeDiag(d) {
  const on = [];
  if (d.fps) on.push('FPS');
  if (d.rendererLock) on.push(`${d.renderer.toUpperCase()} ${d.density || ''}X PIN`.trim());
  else if (d.renderer) on.push(d.renderer.toUpperCase());
  return on.length ? `active: ${on.join(' + ')}` : 'no overrides active';
}

export function lifecyclePolicy({
  allowed = true,
  visible = true,
  isIphone = false,
  isAndroidPhone = false,
  standalone = false,
  devBrowserBypass = false,
  portrait = false,
  allowPortrait = false,
} = {}) {
  // A dev-bypassed browser iPhone deliberately impersonates the installed
  // lifecycle so Chrome device emulation and real-phone LAN testing exercise
  // the rotate overlay, paused loop, input and audio. Production browser
  // iPhones never receive this flag and remain blocked before boot.
  //
  // Android phones get the same treatment outside the jukebox: portrait is
  // useless for a landscape-only arcade game and the rotate overlay is the
  // clearest signal. The listening/visualizer surface can explicitly opt out;
  // tablets are wide enough to be usable in either orientation.
  const phonePortrait = (isIphone || isAndroidPhone)
    && (standalone || devBrowserBypass) && portrait && !allowPortrait;
  return {
    iphonePortrait: phonePortrait,
    paused: !allowed || !visible || phonePortrait,
    showPortraitOverlay: allowed && visible && phonePortrait,
  };
}

function portraitNow(win) {
  if (win.matchMedia) return win.matchMedia('(orientation: portrait)').matches;
  return win.innerHeight > win.innerWidth;
}

const UPDATE_CHECK_TIMEOUT_MS = 10000;
const UPDATE_CONFIRM_TIMEOUT_MS = 10000;
const UPDATE_RELOAD_TIMEOUT_MS = 5000;
const BUILD_END_MARKER = '<!-- MASHENSTEIN_BUILD_COMPLETE -->';

export class LifecycleController {
  constructor({
    platform,
    loop,
    input,
    audio,
    doc = document,
    win = window,
    allowPortrait = () => false,
    onPortraitJukebox = () => {},
  }) {
    this.platform = platform;
    this.loop = loop;
    this.input = input;
    this.audio = audio;
    this.doc = doc;
    this.win = win;
    this.allowPortrait = allowPortrait;
    this.onPortraitJukebox = onPortraitJukebox;
    this.pageHidden = false;
    this.overlay = doc.getElementById('portrait-overlay');
    this.landscapeDiag = doc.getElementById('landscape-diag');
    this.landscapeDiagStatus = doc.getElementById('landscape-diag-status');
    this.landscapeDiagClose = doc.getElementById('landscape-diag-close');
    this.shell = doc.getElementById('game-shell');
    this.errorTools = doc.getElementById('portrait-error-tools');
    this.errorMessage = doc.getElementById('portrait-error-message');
    this.copyErrorButton = doc.getElementById('copy-error');
    this.copyErrorStatus = doc.getElementById('copy-error-status');
    this.reloadButton = doc.getElementById('portrait-reload');
    this.reloadStatus = doc.getElementById('portrait-reload-status');
    this.lorenzoIcon = doc.getElementById('portrait-lorenzo-icon');
    this.lorenzoTapCount = 0;
    this.lorenzoFirstTapAt = 0;
    this.lorenzoIgnoreClickUntil = 0;
    this.portraitJukeboxOpening = false;
    this.restoreFocus = null;
    this.wasOverlayVisible = false;
    this.portraitQuery = win.matchMedia ? win.matchMedia('(orientation: portrait)') : null;

    this.onVisibility = () => this.apply();
    this.onPageHide = () => { this.pageHidden = true; this.apply(); };
    this.onPageShow = () => { this.pageHidden = false; this.apply(); };
    this.onViewport = () => this.apply();
    this.onFatalError = () => this.syncErrorReport();
    this.onCopyError = () => { this.copyErrorReport(); };
    this.onReload = () => { this.confirmReload(); };
    this.onDiagOpen = () => this.openLandscapeDiag();
    this.onDiagClose = () => this.closeLandscapeDiag();
    this.onLorenzoTap = () => {
      if (!this.overlay || this.overlay.hidden) return;
      const now = this.win.performance ? this.win.performance.now() : 0;
      if (now < this.lorenzoIgnoreClickUntil) {
        this.lorenzoIgnoreClickUntil = 0;
        return;
      }
      if (!this.lorenzoTapCount || now - this.lorenzoFirstTapAt > 3000) {
        this.lorenzoTapCount = 0;
        this.lorenzoFirstTapAt = now;
      }
      this.lorenzoTapCount++;
      if (this.lorenzoTapCount < 5) return;
      this.lorenzoTapCount = 0;
      // setState() transitions on the game loop, which is normally paused
      // behind this overlay. Admit portrait for the hand-off so that first
      // plain fade can actually run; SoundTestState then owns the allowance.
      this.portraitJukeboxOpening = true;
      this.onPortraitJukebox();
      this.apply();
    };
    this.onLorenzoPointerUp = () => {
      const now = this.win.performance ? this.win.performance.now() : 0;
      this.onLorenzoTap();
      this.lorenzoIgnoreClickUntil = now + 500;
    };

    doc.addEventListener('visibilitychange', this.onVisibility);
    win.addEventListener('pagehide', this.onPageHide);
    win.addEventListener('pageshow', this.onPageShow);
    win.addEventListener('orientationchange', this.onViewport);
    win.addEventListener('resize', this.onViewport);
    win.addEventListener('mashfatalerror', this.onFatalError);
    win.visualViewport && win.visualViewport.addEventListener('resize', this.onViewport);
    win.addEventListener('mashdiagopen', this.onDiagOpen);
    if (this.portraitQuery) {
      if (this.portraitQuery.addEventListener) this.portraitQuery.addEventListener('change', this.onViewport);
      else if (this.portraitQuery.addListener) this.portraitQuery.addListener(this.onViewport);
    }
    this.copyErrorButton && this.copyErrorButton.addEventListener('click', this.onCopyError);
    this.reloadButton && this.reloadButton.addEventListener('click', this.onReload);
    this.landscapeDiagClose && this.landscapeDiagClose.addEventListener('click', this.onDiagClose);
    this.lorenzoIcon && this.lorenzoIcon.addEventListener('click', this.onLorenzoTap);
    this.lorenzoIcon && this.lorenzoIcon.addEventListener('pointerup', this.onLorenzoPointerUp);
    this.installDiagTools();
    this.syncErrorReport();
    this.apply();
  }

  // Hidden diagnostics, revealed by tapping the build stamp five times on the
  // portrait shell, or by tapping the title marquee five times on touch iPad.
  //
  // These are the surfaces an installed PWA reliably shows that are NOT the
  // game. There is no address bar, so ?fps and ?bench cannot be typed there.
  // Without this the platforms hardest to measure are also the ones with no
  // way to turn the instruments on.
  //
  // Five taps rather than a double-tap: this panel offers a "reload into a
  // 30-second benchmark" button, and a player idly poking the screen they were
  // just told to rotate should not land on it. Five is deliberate, matches the
  // convention people already know from Android's build number, and still takes
  // under two seconds. The 3s window means stray taps minutes apart never add up.
  installDiagTools() {
    this.buildStamp = this.doc.getElementById('build-stamp');
    this.diagTools = this.doc.getElementById('diag-tools');
    this.diagStatus = this.doc.getElementById('diag-status');
    if (!this.buildStamp || !this.diagTools) return;
    let taps = 0, firstTapAt = 0;
    this.onStampTap = () => {
      const now = this.win.performance ? this.win.performance.now() : 0;
      if (!taps || now - firstTapAt > 3000) { taps = 0; firstTapAt = now; }
      taps++;
      if (taps < 5) return;
      taps = 0;
      this.diagTools.hidden = false;
      this.showDiagStatus(describeDiag(readDiag()));
    };
    this.buildStamp.addEventListener('click', this.onStampTap);

    const reloadInto = (patch, note) => {
      writeDiag(patch);
      this.showDiagStatus(note);
      // Reload rather than navigate: changing location.search would be a
      // navigation, and an installed iOS app has been known to hand those to
      // Safari, which would drop the tester out of the app being measured.
      this.win.setTimeout(() => this.win.location.reload(), 350);
    };
    const diagButtons = [
      ['fps', () => {
        const next = !readDiag().fps;
        writeDiag({ fps: next });
        this.showDiagStatus(`FPS readout ${next ? 'ON' : 'OFF'} - rotate to see it`);
      }],
      ['force-2d', () => {
        forceRenderer('2d');
        this.showDiagStatus('2D renderer pinned - reloading...');
        this.win.setTimeout(() => this.win.location.reload(), 350);
      }],
      ['force-webgl', () => {
        forceRenderer('webgl');
        this.showDiagStatus('WebGL renderer pinned - reloading...');
        this.win.setTimeout(() => this.win.location.reload(), 350);
      }],
      ['force-3x-gl', () => {
        forceWebglDensity(3);
        this.showDiagStatus('forcing WebGL at 3X - reloading...');
        this.win.setTimeout(() => this.win.location.reload(), 350);
      }],
      // The bench is one-shot: main.js clears the flag as it starts, so a
      // reload after the sweep returns to playing rather than re-benchmarking.
      ['bench-2d', () => reloadInto({ bench: true, renderer: '2d', rendererLock: null, density: null }, 'reloading into 2D bench...')],
      ['bench-gl', () => reloadInto({ bench: true, renderer: 'webgl', rendererLock: null, density: null }, 'reloading into WebGL bench...')],
      ['title-profile-2d', () => reloadInto({
        titleProfile: true,
        titleProfileRenderer: true,
        renderer: '2d',
        rendererLock: true,
        density: 3,
      }, 'reloading into 2D 3X title profile...')],
      ['title-profile-gl', () => reloadInto({
        titleProfile: true,
        titleProfileRenderer: true,
        renderer: 'webgl',
        rendererLock: true,
        density: 3,
      }, 'reloading into WebGL 3X title profile...')],
      ['game-profile-2d', () => reloadInto({
        gameplayProfile: true,
        gameplayProfileRenderer: true,
        renderer: '2d',
        rendererLock: true,
        density: 3,
      }, 'reloading into 2D 3X gameplay profile...')],
      ['game-profile-gl', () => reloadInto({
        gameplayProfile: true,
        gameplayProfileRenderer: true,
        renderer: 'webgl',
        rendererLock: true,
        density: 3,
      }, 'reloading into WebGL 3X gameplay profile...')],
      ['clear', () => { clearDiag(); reloadInto({}, 'cleared - reloading...'); }],
    ];
    this.diagButtons = [];
    for (const [key, fn] of diagButtons) {
      const targets = [
        this.doc.getElementById(`diag-${key}`),
        this.doc.getElementById(`landscape-diag-${key}`),
      ];
      for (const el of targets) {
        if (!el) continue;
        el.addEventListener('click', fn);
        this.diagButtons.push([el, fn]);
      }
    }
  }

  showDiagStatus(text) {
    if (this.diagStatus) this.diagStatus.textContent = text;
    if (this.landscapeDiagStatus) this.landscapeDiagStatus.textContent = text;
  }

  openLandscapeDiag() {
    if (!this.landscapeDiag) return;
    this.landscapeDiag.hidden = false;
    this.showDiagStatus(describeDiag(readDiag()));
  }

  closeLandscapeDiag() {
    if (this.landscapeDiag) this.landscapeDiag.hidden = true;
  }

  currentPolicy() {
    const stateAllowsPortrait = typeof this.allowPortrait === 'function'
      ? this.allowPortrait()
      : !!this.allowPortrait;
    if (stateAllowsPortrait) this.portraitJukeboxOpening = false;
    return lifecyclePolicy({
      ...this.platform,
      visible: !this.doc.hidden && !this.pageHidden,
      portrait: portraitNow(this.win),
      allowPortrait: stateAllowsPortrait || this.portraitJukeboxOpening,
    });
  }

  setOverlay(show) {
    if (!this.overlay) return;
    if (show === this.wasOverlayVisible) return;
    this.wasOverlayVisible = show;
    this.overlay.hidden = !show;
    if (show) {
      this.syncErrorReport();
      this.restoreFocus = this.doc.activeElement;
      // Rotation is the only normal action. Clear whatever the game left
      // focused so the full-screen pause composition has no glowing heading,
      // canvas or control in its middle. Fatal-error controls remain available
      // if the player deliberately tabs to them.
      if (this.restoreFocus && this.restoreFocus.blur) this.restoreFocus.blur();
    } else if (this.restoreFocus && this.restoreFocus.isConnected && this.restoreFocus.focus) {
      try { this.restoreFocus.focus({ preventScroll: true }); } catch (e) { this.restoreFocus.focus(); }
      this.restoreFocus = null;
    }
  }

  syncErrorReport() {
    const detail = this.win.__mash_fatal_error || '';
    if (this.errorTools) this.errorTools.hidden = !detail;
    if (this.errorMessage) this.errorMessage.textContent = detail;
    if (this.copyErrorStatus && !detail) this.copyErrorStatus.textContent = '';
  }

  async copyErrorReport() {
    const detail = this.win.__mash_fatal_error || '';
    if (!detail) return;
    try {
      if (!this.win.navigator?.clipboard?.writeText) throw new Error('clipboard unavailable');
      await this.win.navigator.clipboard.writeText(detail);
      if (this.copyErrorStatus) this.copyErrorStatus.textContent = 'ERROR COPIED.';
    } catch (e) {
      if (this.copyErrorStatus) {
        this.copyErrorStatus.textContent = 'PRESS AND HOLD THE ERROR TEXT TO COPY.';
      }
    }
  }

  // Portrait is the one screen every installed player sees before anything else
  // loads, which makes it the reliable place to check whether a Home Screen
  // snapshot is stale. A check never reloads an up-to-date app. When the
  // service worker reports a new version, the button becomes the confirmation
  // step; this stays usable on iOS, where native confirm() is suppressed.
  async confirmReload() {
    if (!this.reloadButton || this.reloadChecking) return;
    if (!this.reloadArmed) {
      // Captured once, not per check: by the time a later check happens the
      // label may already have been overwritten with a transient state.
      if (this.reloadLabel === undefined) this.reloadLabel = this.reloadButton.textContent;
      this.reloadChecking = true;
      this.reloadButton.disabled = true;
      this.reloadButton.textContent = 'CHECKING FOR UPDATE...';
      this.showReloadStatus('CHECKING FOR UPDATE...');
      let available = null;
      let timeoutId = null;
      try {
        const result = this.checkForUpdate();
        const timeout = new Promise((resolve) => {
          timeoutId = this.win.setTimeout(() => resolve(null), UPDATE_CHECK_TIMEOUT_MS);
        });
        available = await Promise.race([result, timeout]);
      } catch (e) {
        available = null;
      } finally {
        if (timeoutId != null) this.win.clearTimeout(timeoutId);
        this.reloadChecking = false;
        this.reloadButton.disabled = false;
      }
      if (available !== true) {
        this.reloadButton.textContent = this.reloadLabel || 'CHECK FOR UPDATE';
        this.showReloadStatus(available === false
          ? 'NO UPDATE FOUND.'
          : 'UPDATE CHECK UNAVAILABLE.');
        return;
      }
      this.reloadArmed = true;
      this.reloadButton.textContent = 'TAP AGAIN TO RELOAD';
      this.showReloadStatus('UPDATE AVAILABLE. TAP AGAIN TO RELOAD.');
      // Disarm on its own, so a stray tap does not leave the button primed for
      // the rest of the session waiting to eat a run.
      this.reloadTimer = this.win.setTimeout(() => {
        this.reloadArmed = false;
        this.reloadButton.textContent = this.reloadLabel || 'CHECK FOR UPDATE';
        this.showReloadStatus('UPDATE CHECK EXPIRED.');
      }, UPDATE_CONFIRM_TIMEOUT_MS);
      return;
    }
    this.win.clearTimeout(this.reloadTimer);
    this.reloadArmed = false;
    this.reloadButton.disabled = true;
    this.reloadButton.textContent = 'RELOADING...';
    this.showReloadStatus('RELOADING WITH THE UPDATE...');
    this.forceReload();
  }

  showReloadStatus(text) {
    if (this.reloadStatus) this.reloadStatus.textContent = text;
  }

  async checkForUpdate() {
    // The newest worker may already have activated and claimed this client
    // while the old page remains in memory. In that state registration.update()
    // correctly reports no newer worker, but the player still needs a reload.
    // Compare the loaded shell's immutable build stamp with a network-fresh
    // copy before consulting worker state.
    let pageIsCurrent = false;
    const loadedBuild = this.win.__MASH_BUILT_AT__;
    if (loadedBuild && this.win.fetch && this.win.location?.href) {
      try {
        const response = await this.win.fetch(this.win.location.href, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (response?.ok) {
          const html = await response.text();
          const match = html.match(/<!--\s*Built:\s*([^>]+?)\s*-->/i);
          if (match) {
            const liveBuild = match[1].trim();
            const pageComplete = html.trimEnd().endsWith(BUILD_END_MARKER);
            if (liveBuild !== loadedBuild) {
              // A timestamp appears near the start of the document. Do not
              // offer a reload until the explicit final bytes prove the new
              // shell finished deploying instead of arriving truncated.
              return pageComplete ? true : null;
            }
            pageIsCurrent = pageComplete;
          }
        }
      } catch (e) { /* worker update below distinguishes offline from current */ }
    }

    const nav = this.win.navigator;
    const serviceWorker = nav?.serviceWorker;
    if (!serviceWorker) return pageIsCurrent ? false : null;

    // getRegistration() returns the most specific registration controlling
    // this document. getRegistrations() can include workers for sibling
    // GitHub Pages projects on the same origin, so treating any of those as a
    // MASHENSTEIN update produces both false positives and needless requests.
    let registration = null;
    if (serviceWorker.getRegistration) {
      registration = await serviceWorker.getRegistration();
    } else if (serviceWorker.getRegistrations) {
      const registrations = await serviceWorker.getRegistrations();
      const href = this.win.location?.href;
      registration = href
        ? registrations
          .filter((candidate) => candidate.scope && href.startsWith(candidate.scope))
          .sort((a, b) => b.scope.length - a.scope.length)[0]
        : registrations?.[0];
    }

    // initUpdates() registers asynchronously during boot. A quick tap on the
    // portrait screen used to beat that promise and incorrectly report that no
    // update existed. Registering the same URL is idempotent and joins the
    // in-flight registration instead.
    if (!registration && serviceWorker.register) {
      registration = await serviceWorker.register('./sw.js', { scope: './' });
    }
    if (!registration) return pageIsCurrent ? false : null;

    const inspect = async (registration) => {
      let found = !!(registration.waiting || registration.installing);
      let failed = false;
      const onUpdateFound = () => { found = true; };
      if (registration.addEventListener) registration.addEventListener('updatefound', onUpdateFound);
      try {
        if (registration.update) await registration.update();
      } catch (e) {
        // A network or browser-level update failure is different from a
        // completed check that found the current worker.
        failed = true;
      } finally {
        if (registration.removeEventListener) registration.removeEventListener('updatefound', onUpdateFound);
      }
      return { found: found || !!(registration.waiting || registration.installing), failed };
    };
    const result = await inspect(registration);
    if (result.found) return true;
    return result.failed && !pageIsCurrent ? null : false;
  }

  // "Force" has to mean more than location.reload() here. An installed PWA is
  // served by the service worker, so a plain reload can hand back the very
  // bundle the player is trying to escape. Drop the caches and let the worker
  // update first; whether those succeed or not, the reload always happens.
  forceReload() {
    const go = () => this.win.location.reload();
    const nav = this.win.navigator;
    const jobs = [];
    try {
      if (this.win.caches && this.win.caches.keys) {
        jobs.push(this.win.caches.keys().then((keys) => Promise.all(keys
          .filter((key) => key.startsWith('mashenstein-'))
          .map((key) => this.win.caches.delete(key)))));
      }
      if (nav?.serviceWorker?.getRegistration) {
        jobs.push(nav.serviceWorker.getRegistration()
          .then((registration) => registration?.update?.().catch(() => {})));
      } else if (nav?.serviceWorker?.getRegistrations) {
        const href = this.win.location?.href;
        jobs.push(nav.serviceWorker.getRegistrations().then((registrations) => {
          const registration = href
            ? registrations
              .filter((candidate) => candidate.scope && href.startsWith(candidate.scope))
              .sort((a, b) => b.scope.length - a.scope.length)[0]
            : registrations?.[0];
          return registration?.update?.().catch(() => {});
        }));
      }
    } catch (e) { /* storage unavailable: fall through to the plain reload */ }
    if (!jobs.length) { go(); return; }
    // Never let a hanging cache API strand the player on this screen.
    const timeout = new Promise((resolve) => this.win.setTimeout(resolve, UPDATE_RELOAD_TIMEOUT_MS));
    Promise.race([Promise.all(jobs).catch(() => {}), timeout]).then(go, go);
  }

  apply() {
    const policy = this.currentPolicy();
    this.setOverlay(policy.showPortraitOverlay);
    if (this.shell) {
      this.shell.inert = policy.paused;
      if (policy.showPortraitOverlay) this.shell.setAttribute('aria-hidden', 'true');
      else this.shell.removeAttribute('aria-hidden');
    }
    this.input.setSuspended(policy.paused);
    this.audio.setLifecyclePaused(policy.paused);
    if (policy.paused) this.loop.pause();
    else this.loop.resume();
    return policy;
  }

  destroy() {
    this.doc.removeEventListener('visibilitychange', this.onVisibility);
    this.win.removeEventListener('pagehide', this.onPageHide);
    this.win.removeEventListener('pageshow', this.onPageShow);
    this.win.removeEventListener('orientationchange', this.onViewport);
    this.win.removeEventListener('resize', this.onViewport);
    this.win.removeEventListener('mashfatalerror', this.onFatalError);
    this.win.visualViewport && this.win.visualViewport.removeEventListener('resize', this.onViewport);
    if (this.portraitQuery) {
      if (this.portraitQuery.removeEventListener) this.portraitQuery.removeEventListener('change', this.onViewport);
      else if (this.portraitQuery.removeListener) this.portraitQuery.removeListener(this.onViewport);
    }
    this.copyErrorButton && this.copyErrorButton.removeEventListener('click', this.onCopyError);
    this.reloadButton && this.reloadButton.removeEventListener('click', this.onReload);
    this.lorenzoIcon && this.lorenzoIcon.removeEventListener('click', this.onLorenzoTap);
    this.lorenzoIcon && this.lorenzoIcon.removeEventListener('pointerup', this.onLorenzoPointerUp);
    this.win.clearTimeout(this.reloadTimer);
    this.buildStamp && this.onStampTap && this.buildStamp.removeEventListener('click', this.onStampTap);
    (this.diagButtons || []).forEach(([el, fn]) => el && el.removeEventListener('click', fn));
  }
}
