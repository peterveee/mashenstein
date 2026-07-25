// One source of truth for browser/app lifecycle. Visibility and orientation
// events never resume subsystems independently; they all recompute this policy.
import { readDiag, writeDiag, clearDiag, forceWebglDensity } from './diag.js';

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
    this.shell = doc.getElementById('game-shell');
    this.errorTools = doc.getElementById('portrait-error-tools');
    this.errorMessage = doc.getElementById('portrait-error-message');
    this.copyErrorButton = doc.getElementById('copy-error');
    this.copyErrorStatus = doc.getElementById('copy-error-status');
    this.reloadButton = doc.getElementById('portrait-reload');
    this.restoreFocus = null;
    this.wasOverlayVisible = false;
    this.portraitQuery = win.matchMedia ? win.matchMedia('(orientation: portrait)') : null;

    this.onVisibility = () => this.apply();
    this.onPageHide = () => { this.pageHidden = true; this.apply(); };
    this.onPageShow = () => { this.pageHidden = false; this.apply(); };
    this.onViewport = () => this.apply();
    this.onFatalError = () => this.syncErrorReport();
    this.onCopyError = () => { this.copyErrorReport(); };
    this.onReload = () => this.confirmReload();

    doc.addEventListener('visibilitychange', this.onVisibility);
    win.addEventListener('pagehide', this.onPageHide);
    win.addEventListener('pageshow', this.onPageShow);
    win.addEventListener('orientationchange', this.onViewport);
    win.addEventListener('resize', this.onViewport);
    win.addEventListener('mashfatalerror', this.onFatalError);
    win.visualViewport && win.visualViewport.addEventListener('resize', this.onViewport);
    if (this.portraitQuery) {
      if (this.portraitQuery.addEventListener) this.portraitQuery.addEventListener('change', this.onViewport);
      else if (this.portraitQuery.addListener) this.portraitQuery.addListener(this.onViewport);
    }
    this.copyErrorButton && this.copyErrorButton.addEventListener('click', this.onCopyError);
    this.reloadButton && this.reloadButton.addEventListener('click', this.onReload);
    this.installDiagTools();
    this.syncErrorReport();
    this.apply();
  }

  // Hidden diagnostics, revealed by tapping the build stamp five times.
  //
  // This screen is the only surface an installed iPhone build reliably shows
  // that is NOT the game — and an installed PWA has no address bar, so ?fps and
  // ?bench cannot be typed there. Without this the one platform hardest to
  // measure is also the only one with no way to turn the instruments on.
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
    this.diagButtons = [
      ['diag-fps', () => {
        const next = !readDiag().fps;
        writeDiag({ fps: next });
        this.showDiagStatus(`FPS readout ${next ? 'ON' : 'OFF'} - rotate to see it`);
      }],
      ['diag-force-3x-gl', () => {
        forceWebglDensity(3);
        this.showDiagStatus('forcing WebGL at 3X - reloading...');
        this.win.setTimeout(() => this.win.location.reload(), 350);
      }],
      // The bench is one-shot: main.js clears the flag as it starts, so a
      // reload after the sweep returns to playing rather than re-benchmarking.
      ['diag-bench-2d', () => reloadInto({ bench: true, renderer: '2d', rendererLock: null, density: null }, 'reloading into 2D bench...')],
      ['diag-bench-gl', () => reloadInto({ bench: true, renderer: 'webgl', rendererLock: null, density: null }, 'reloading into WebGL bench...')],
      ['diag-clear', () => { clearDiag(); reloadInto({}, 'cleared - reloading...'); }],
    ].map(([id, fn]) => {
      const el = this.doc.getElementById(id);
      if (el) el.addEventListener('click', fn);
      return [el, fn];
    });
  }

  showDiagStatus(text) {
    if (this.diagStatus) this.diagStatus.textContent = text;
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
  // loads, which makes it the reliable place to offer an escape hatch from a
  // stale Home Screen snapshot.
  //
  // It used to guard the reload with window.confirm(). That does not work in an
  // installed iOS app: standalone mode suppresses native JS dialogs, so confirm()
  // never returned true and the button silently did nothing on the exact
  // platform the escape hatch exists for. The guard is now the button itself —
  // press once to arm, again to go — which needs no dialog, no game DOM and no
  // fonts, and reads more clearly than a modal anyway.
  confirmReload() {
    if (!this.reloadButton) return;
    if (!this.reloadArmed) {
      this.reloadArmed = true;
      // Captured once, not per arm: by the time a second arm happens the label
      // may already have been overwritten with a transient state, and restoring
      // THAT would leave the button reading "RELOADING..." forever.
      if (this.reloadLabel === undefined) this.reloadLabel = this.reloadButton.textContent;
      this.reloadButton.textContent = 'TAP AGAIN TO CONFIRM';
      // Disarm on its own, so a stray tap does not leave the button primed for
      // the rest of the session waiting to eat a run.
      this.reloadTimer = this.win.setTimeout(() => {
        this.reloadArmed = false;
        this.reloadButton.textContent = this.reloadLabel || 'FORCE RELOAD';
      }, 4000);
      return;
    }
    this.win.clearTimeout(this.reloadTimer);
    this.reloadArmed = false;
    this.reloadButton.textContent = 'RELOADING...';
    this.forceReload();
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
