// One source of truth for browser/app lifecycle. Visibility and orientation
// events never resume subsystems independently; they all recompute this policy.

export function lifecyclePolicy({
  allowed = true,
  visible = true,
  isIphone = false,
  standalone = false,
  devBrowserBypass = false,
  portrait = false,
} = {}) {
  // A dev-bypassed browser iPhone deliberately impersonates the installed
  // lifecycle so Chrome device emulation and real-phone LAN testing exercise
  // the rotate overlay, paused loop, input and audio. Production browser
  // iPhones never receive this flag and remain blocked before boot.
  const iphonePortrait = isIphone && (standalone || devBrowserBypass) && portrait;
  return {
    iphonePortrait,
    paused: !allowed || !visible || iphonePortrait,
    showPortraitOverlay: allowed && visible && iphonePortrait,
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
    this.restoreFocus = null;
    this.wasOverlayVisible = false;
    this.portraitQuery = win.matchMedia ? win.matchMedia('(orientation: portrait)') : null;

    this.onVisibility = () => this.apply();
    this.onPageHide = () => { this.pageHidden = true; this.apply(); };
    this.onPageShow = () => { this.pageHidden = false; this.apply(); };
    this.onViewport = () => this.apply();
    this.onFatalError = () => this.syncErrorReport();
    this.onCopyError = () => { this.copyErrorReport(); };

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
    this.syncErrorReport();
    this.apply();
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
  }
}
