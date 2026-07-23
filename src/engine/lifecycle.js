// One source of truth for browser/app lifecycle. Visibility and orientation
// events never resume subsystems independently; they all recompute this policy.

export function lifecyclePolicy({
  allowed = true,
  visible = true,
  isIphone = false,
  standalone = false,
  portrait = false,
} = {}) {
  const iphonePortrait = isIphone && standalone && portrait;
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
    this.restoreFocus = null;
    this.wasOverlayVisible = false;
    this.portraitQuery = win.matchMedia ? win.matchMedia('(orientation: portrait)') : null;

    this.onVisibility = () => this.apply();
    this.onPageHide = () => { this.pageHidden = true; this.apply(); };
    this.onPageShow = () => { this.pageHidden = false; this.apply(); };
    this.onViewport = () => this.apply();
    this.onDialogKey = (e) => {
      if (e.key !== 'Tab' || !this.wasOverlayVisible) return;
      e.preventDefault();
      this.focusOverlay();
    };

    doc.addEventListener('visibilitychange', this.onVisibility);
    win.addEventListener('pagehide', this.onPageHide);
    win.addEventListener('pageshow', this.onPageShow);
    win.addEventListener('orientationchange', this.onViewport);
    win.addEventListener('resize', this.onViewport);
    win.visualViewport && win.visualViewport.addEventListener('resize', this.onViewport);
    if (this.portraitQuery) {
      if (this.portraitQuery.addEventListener) this.portraitQuery.addEventListener('change', this.onViewport);
      else if (this.portraitQuery.addListener) this.portraitQuery.addListener(this.onViewport);
    }
    this.overlay && this.overlay.addEventListener('keydown', this.onDialogKey);
    this.apply();
  }

  currentPolicy() {
    return lifecyclePolicy({
      ...this.platform,
      visible: !this.doc.hidden && !this.pageHidden,
      portrait: portraitNow(this.win),
    });
  }

  focusOverlay() {
    const heading = this.overlay && this.overlay.querySelector('[data-dialog-heading]');
    if (!heading) return;
    try { heading.focus({ preventScroll: true }); } catch (e) { heading.focus(); }
  }

  setOverlay(show) {
    if (!this.overlay) return;
    if (show === this.wasOverlayVisible) return;
    this.wasOverlayVisible = show;
    this.overlay.hidden = !show;
    if (show) {
      this.restoreFocus = this.doc.activeElement;
      requestAnimationFrame(() => this.focusOverlay());
    } else if (this.restoreFocus && this.restoreFocus.isConnected && this.restoreFocus.focus) {
      try { this.restoreFocus.focus({ preventScroll: true }); } catch (e) { this.restoreFocus.focus(); }
      this.restoreFocus = null;
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
    this.win.visualViewport && this.win.visualViewport.removeEventListener('resize', this.onViewport);
    if (this.portraitQuery) {
      if (this.portraitQuery.removeEventListener) this.portraitQuery.removeEventListener('change', this.onViewport);
      else if (this.portraitQuery.removeListener) this.portraitQuery.removeListener(this.onViewport);
    }
    this.overlay && this.overlay.removeEventListener('keydown', this.onDialogKey);
  }
}
