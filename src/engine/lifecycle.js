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
} = {}) {
  // A dev-bypassed browser iPhone deliberately impersonates the installed
  // lifecycle so Chrome device emulation and real-phone LAN testing exercise
  // the rotate overlay, paused loop, input and audio. Production browser
  // iPhones never receive this flag and remain blocked before boot.
  //
  // Android phones get the same treatment: portrait is useless for a
  // landscape-only arcade game and the rotate overlay is the clearest
  // signal. Tablets are wide enough to be usable in either orientation.
  const phonePortrait = (isIphone || isAndroidPhone) && (standalone || devBrowserBypass) && portrait;
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

export class LifecycleController {
  constructor({
    platform,
    loop,
    input,
    audio,
    doc = document,
    win = window,
  }) {
    this.platform = platform;
    this.loop = loop;
    this.input = input;
    this.audio = audio;
    this.doc = doc;
    this.win = win;
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
      ['title-profile', () => reloadInto({
        titleProfile: true,
        titleProfileRenderer: true,
        renderer: 'webgl',
        rendererLock: true,
        density: 3,
      }, 'reloading into WebGL 3X title profile...')],
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
    return lifecyclePolicy({
      ...this.platform,
      visible: !this.doc.hidden && !this.pageHidden,
      portrait: portraitNow(this.win),
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
          timeoutId = this.win.setTimeout(() => resolve(null), 1500);
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
      }, 4000);
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
    const nav = this.win.navigator;
    if (!nav?.serviceWorker?.getRegistrations) return null;
    const registrations = await nav.serviceWorker.getRegistrations();
    if (!registrations?.length) return false;
    const inspect = async (registration) => {
      let found = !!(registration.waiting || registration.installing);
      let failed = false;
      const onUpdateFound = () => { found = true; };
      if (registration.addEventListener) registration.addEventListener('updatefound', onUpdateFound);
      try {
        if (registration.update) await registration.update();
      } catch (e) {
        // An individual registration can fail while another one still reports
        // a usable update. Keep checking the rest rather than rejecting all.
        failed = true;
      } finally {
        if (registration.removeEventListener) registration.removeEventListener('updatefound', onUpdateFound);
      }
      return { found: found || !!(registration.waiting || registration.installing), failed };
    };
    const results = await Promise.all(registrations.map(inspect));
    if (results.some((result) => result.found)) return true;
    return results.some((result) => result.failed) ? null : false;
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
        jobs.push(this.win.caches.keys().then((keys) => Promise.all(keys.map((k) => this.win.caches.delete(k)))));
      }
      if (nav && nav.serviceWorker && nav.serviceWorker.getRegistrations) {
        jobs.push(nav.serviceWorker.getRegistrations().then((regs) => Promise.all(regs.map((r) => r.update().catch(() => {})))));
      }
    } catch (e) { /* storage unavailable: fall through to the plain reload */ }
    if (!jobs.length) { go(); return; }
    // Never let a hanging cache API strand the player on this screen.
    const timeout = new Promise((resolve) => this.win.setTimeout(resolve, 1500));
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
    this.win.clearTimeout(this.reloadTimer);
    this.buildStamp && this.onStampTap && this.buildStamp.removeEventListener('click', this.onStampTap);
    (this.diagButtons || []).forEach(([el, fn]) => el && el.removeEventListener('click', fn));
  }
}
