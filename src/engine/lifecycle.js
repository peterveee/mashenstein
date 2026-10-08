// One source of truth for browser/app lifecycle. Visibility and orientation
// events never resume subsystems independently; they all recompute this policy.
import { readDiag, writeDiag, clearDiag, forceRenderer, forceWebglDensity } from './diag.js';

// THE STAND-IN TEST (8 Oct 2026). A tap on the lock screen's NOW PLAYING card opens
// another of the phone's Home Screen web apps, never this one. Off, to learn whether
// the silent <audio> stand-in (primeAnchor) is what sends it there: the card then
// belongs to Web Audio, as before 7 Oct — play/pause go straight to the context
// (WebKit's own), and previous/next show but do nothing. A build-time switch, since
// an installed iPhone app has no address bar for a flag and no reachable diagnostics
// panel. true puts the stand-in back.
const LOCK_SCREEN_STAND_IN = false;

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
  devMode = false,
  portrait = false,
  allowPortrait = false,
  presentationRefreshing = false,
  presentationRhythm = false,
  backgroundAudio = false,
} = {}) {
  // Phone portrait is now a normal running presentation. Screens that have an
  // authored `portraitMode` still select their tailored frame; older surfaces
  // may fall back to their existing composition, but they must not freeze the
  // player behind a rotate card while the portrait rollout finishes.
  const phonePortrait = false;
  const lifecycleBlocked = !allowed || !visible || phonePortrait;
  // A song the player chose — the jukebox, the Lab's club — plays on with the
  // screen off or the app behind another, as a music app's does. Hiding is the
  // one blocker it is excused: the picture and input still stop with it.
  const hiddenWithMusic = allowed && !visible && backgroundAudio;
  return {
    iphonePortrait: phonePortrait,
    paused: lifecycleBlocked || presentationRefreshing,
    // Ordinary levels can keep their soundtrack running while the picture is
    // rebuilt. Beat-locked runs must hold audio with the simulation so their
    // lane cannot advance underneath a paused world.
    audioPaused: (lifecycleBlocked && !hiddenWithMusic) || (presentationRefreshing && presentationRhythm),
    backgroundAudio: hiddenWithMusic,
    // Keep the existing phone rotate card visible when it is the applicable
    // lifecycle surface. The renderer cover sits below it, so a rotation does
    // not flash from card -> black -> card as the backing store settles.
    showPortraitOverlay: allowed && visible && phonePortrait,
  };
}

export function portraitNow(win) {
  if (win.matchMedia) return win.matchMedia('(orientation: portrait)').matches;
  return win.innerHeight > win.innerWidth;
}

// A screen declares how it presents in portrait with a static `portraitMode`;
// anything without one keeps the landscape gate. This replaces an instanceof
// check against the jukebox, and is sturdier than one: a static property is
// still found across the module-identity mismatches that make `instanceof`
// quietly fail.
//
// 'stretch' is the shipped jukebox presentation and 'frame' is the shipped
// gameplay presentation. Keeping the allow-list here means a screen still has
// to opt in explicitly; unrelated menus remain behind the landscape gate.
const SHIPPED_PORTRAIT_MODES = new Set(['stretch', 'frame']);

export function portraitAllowedFor(state, diagPortrait = false) {
  const mode = state && state.constructor ? state.constructor.portraitMode : null;
  if (!mode) return false;
  return SHIPPED_PORTRAIT_MODES.has(mode) || !!diagPortrait;
}

// Two seconds of 8 kHz mono silence as a WAV: the lock screen's stand-in (primeAnchor).
// WebKit will not make a clip under 0.95 s the thing that is playing.
function silentWav(seconds = 2, rate = 8000) {
  const n = Math.round(seconds * rate);
  const v = new DataView(new ArrayBuffer(44 + n * 2));
  const tag = (at, s) => { for (let i = 0; i < 4; i++) v.setUint8(at + i, s.charCodeAt(i)); };
  tag(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); tag(8, 'WAVE');
  tag(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, n * 2, true);
  return v.buffer;
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
    devMode = false,
    allowPortrait = () => false,
    onPortraitJukebox = () => {},
    onDevMenu = null,
    nowPlaying = () => null,
    onBackground = () => {},
    onMediaPause = () => {},
    onMediaSkip = () => {},
    songArt = null,
    beatLocked = () => false,
    standIn = LOCK_SCREEN_STAND_IN,
  }) {
    this.platform = platform;
    this.loop = loop;
    this.input = input;
    this.audio = audio;
    this.doc = doc;
    this.win = win;
    this.devMode = devMode;
    this.allowPortrait = allowPortrait;
    this.onPortraitJukebox = onPortraitJukebox;
    // The song the screen up now is playing — { title, album, paused } — or null. A
    // song not paused plays on with the page hidden (apply); any song holds the music
    // session and the NOW PLAYING card (syncMusicSession, once a frame). onBackground
    // tells that screen it went: no frame of its runs until the page is back.
    // onMediaPause is the card's own play/pause, handed to the screen, and onMediaSkip
    // its previous/next (-1/1) for a song that says it `skips`.
    this.nowPlaying = nowPlaying;
    this.onBackground = onBackground;
    this.onMediaPause = onMediaPause;
    this.onMediaSkip = onMediaSkip;
    this.mediaSkips = false;
    // (song) => a canvas: the song's cover on the card (main.js: src/game/song-art.js)
    this.songArt = songArt;
    this.cover = null;
    this.coverKey = null;
    this.inBackground = false;
    this.sessionType = null;
    this.nowPlayingKey = null;
    this.playbackState = null;
    this.mediaHandlers = false;
    this.standIn = standIn;
    this.anchor = null;
    this.anchorReady = false;
    this.anchorPriming = false;
    this.anchorState = null;
    // Supplied by main.js only where a dev menu exists; returns false when it
    // does not, so a published build stays silent instead of promising one.
    this.onDevMenu = onDevMenu;
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
    this.portraitTitle = doc.getElementById('portrait-overlay-title');
    this.titleTapCount = 0;
    this.titleFirstTapAt = 0;
    this.titleIgnoreClickUntil = 0;
    this.portraitJukeboxOpening = false;
    this.restoreFocus = null;
    this.wasOverlayVisible = false;
    this.portraitQuery = win.matchMedia ? win.matchMedia('(orientation: portrait)') : null;
    this.presentationRefreshing = false;
    this.presentationRhythm = false;

    this.onVisibility = () => this.apply();
    this.onPageHide = () => { this.pageHidden = true; this.apply(); };
    this.onPageShow = () => { this.pageHidden = false; this.apply(); };
    // THE EXIT FADE. On a phone or tablet the sound fades as focus goes, for whenever focus
    // goes well ahead of the page being hidden (the app switcher held open, a banner). A plain
    // swipe home gives it 4 ms (the exit trace, 8 Oct 2026) — leaving itself is the instant
    // hold in Audio.setLifecyclePaused. Not while a song the player chose plays on (playsOn),
    // and not on a desktop, where focus goes every time you click into another window and the
    // game is still in plain sight.
    this.beatLocked = beatLocked;
    this.fadesOnBlur = !!(platform && (platform.isIphone || platform.isIpad || platform.isAndroidPhone || platform.isAndroidTablet));
    this.onBlur = () => {
      if (this.fadesOnBlur && !this.playsOn() && this.audio.fadeForExit) this.audio.fadeForExit();
    };
    this.onFocus = () => { if (this.audio.fadeBackIn) this.audio.fadeBackIn(); };
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
    // Five taps on TURN THE ARCADE SIDEWAYS open the dev menu. The in-game
    // unlock is five taps inside a 72x32 corner of a live canvas, which on a
    // phone means aiming at a moving game; this heading is the largest, most
    // stationary target the device offers, and rotating to reach it is a
    // gesture rather than a hunt. The overlay counts as a portrait surface
    // (main.js), so the fifth tap replaces this card with the menu in place —
    // no confirmation copy needed, and nothing to rotate back for.
    this.onTitleTap = () => {
      if (!this.onDevMenu) return;
      if (!this.overlay || this.overlay.hidden) return;
      const now = this.win.performance ? this.win.performance.now() : 0;
      if (now < this.titleIgnoreClickUntil) {
        this.titleIgnoreClickUntil = 0;
        return;
      }
      if (!this.titleTapCount || now - this.titleFirstTapAt > 3000) {
        this.titleTapCount = 0;
        this.titleFirstTapAt = now;
      }
      this.titleTapCount++;
      if (this.titleTapCount < 5) return;
      this.titleTapCount = 0;
      this.onDevMenu();
    };
    this.onTitlePointerUp = () => {
      const now = this.win.performance ? this.win.performance.now() : 0;
      this.onTitleTap();
      this.titleIgnoreClickUntil = now + 500;
    };

    doc.addEventListener('visibilitychange', this.onVisibility);
    win.addEventListener('pagehide', this.onPageHide);
    win.addEventListener('blur', this.onBlur);
    win.addEventListener('focus', this.onFocus);
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
    this.portraitTitle && this.portraitTitle.addEventListener('click', this.onTitleTap);
    this.portraitTitle && this.portraitTitle.addEventListener('pointerup', this.onTitlePointerUp);
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
      devMode: this.devMode,
      visible: !this.doc.hidden && !this.pageHidden,
      portrait: portraitNow(this.win),
      allowPortrait: stateAllowsPortrait || this.portraitJukeboxOpening,
      presentationRefreshing: this.presentationRefreshing,
      presentationRhythm: this.presentationRhythm,
      // Latched while hidden: once the music has gone into the background it stays
      // there until the page is back, so a pause from the lock screen holds the
      // song where it stopped rather than letting a later apply() suspend it.
      backgroundAudio: this.playsOn() || (this.inBackground && (this.doc.hidden || this.pageHidden)),
    });
  }

  isHidden() {
    return !!(this.doc.hidden || this.pageHidden);
  }

  playsOn() {
    const song = this.nowPlaying();
    return !!song && !song.paused;
  }

  /**
   * Once a frame while the page is up (main.js), and again after the NOW PLAYING
   * card's own play/pause.
   *
   * The audio session is 'playback', everywhere in the game (navigator.audioSession,
   * iOS 17; honoured in the background from 17.5). Without it iOS stops feeding a page's
   * audio the instant the app is left and only formally stops it half a second later, and
   * in between the phone loops its last buffer — the buzz on every exit outside the
   * jukebox (the exit trace, 8 Oct 2026: `ctx.suspend()` at the hide never landed). With
   * it the audio runs on through the way out, so the game can fade and hold it itself,
   * and a song the player chose can play on with the screen off. Set ahead of time rather
   * than from visibilitychange, which can arrive after iOS has already decided. The price,
   * which Peter took (8 Oct 2026: "I don't mind the trade offs"): the game's sound ignores
   * the silent switch, and starting it stops other apps' audio rather than mixing with it.
   *
   * The media session: with no metadata the lock screen's NOW PLAYING card names the
   * page by its host (mbp14.local, mashenstein.com). This gives it the song, where
   * it is playing and the game's icon, and routes the card's buttons to the screen —
   * by way of the anchor (primeAnchor), the only thing WebKit sends them to.
   */
  syncMusicSession() {
    const song = this.nowPlaying();
    const nav = this.win.navigator || {};
    const audioSession = nav.audioSession;
    const type = 'playback';
    if (audioSession && type !== this.sessionType) {
      this.sessionType = type;
      try { audioSession.type = type; } catch (e) { /* a WebKit without the type keeps its default */ }
    }
    const media = nav.mediaSession;
    if (!media) return;
    if (!this.mediaHandlers) {
      this.mediaHandlers = true;
      const press = (paused) => () => {
        this.onMediaPause(paused);
        // Played from the lock screen after a pause in the game: the song now plays
        // on, and apply() is what lets it out of the lifecycle's hold.
        this.apply();
        // PLAY also restarts what iOS stopped behind the game's back. An interruption (a
        // notification's chime, Peter, 8 Oct 2026) leaves the context interrupted and the
        // stand-in paused while the screen still thinks it is playing — so neither the
        // screen nor apply() has anything to change, and without this the press did nothing.
        if (!paused) {
          if (this.audio.resumeContext) this.audio.resumeContext();
          this.anchorState = null;   // syncAnchor below plays it again
        }
        this.syncMusicSession();
      };
      try {
        media.setActionHandler('play', press(false));
        media.setActionHandler('pause', press(true));
      } catch (e) { /* an action this browser does not offer */ }
    }
    // Previous/next only while the song can take them: offered, iOS shows them in place
    // of its skip-back/skip-ahead; withdrawn (null), the buttons go.
    const skips = !!(song && song.skips);
    if (skips !== this.mediaSkips) {
      this.mediaSkips = skips;
      // and the card retitled at once: a locked screen runs no frame to do it
      const skip = (dir) => () => { this.onMediaSkip(dir); this.syncMusicSession(); };
      try {
        media.setActionHandler('previoustrack', skips ? skip(-1) : null);
        media.setActionHandler('nexttrack', skips ? skip(1) : null);
      } catch (e) { /* an action this browser does not offer */ }
    }
    // (a song gone over to its 8-bit version, or back, is a new cover: song-art.js)
    const key = song ? `${song.title}\n${song.album}${song.eightBit ? '\n8-BIT' : ''}` : '';
    if (key !== this.nowPlayingKey) {
      this.nowPlayingKey = key;
      // The title at once, under the last cover (the icon before there is one), and the
      // song's own cover in its place once it is encoded: the card never goes blank.
      // Painted only with the page hidden — on the lock screen, where it is seen — as it
      // costs a few frames the jukebox would show as a stutter (apply() paints it then).
      this.writeMetadata(song, this.cover || this.artwork());
      if (song && this.isHidden()) this.paintCover(song, key);
    }
    const state = !song ? 'none' : song.paused ? 'paused' : 'playing';
    if (state !== this.playbackState) {
      this.playbackState = state;
      try { media.playbackState = state; } catch (e) { /* older WebKit: no playbackState */ }
    }
    this.syncPosition(media, song);
    this.syncAnchor(state);
  }

  /**
   * The lock screen's buttons go to a page's <audio> or <video>, never to Web Audio:
   * WebKit plays and pauses an AudioContext itself, behind the game's back, and drops
   * previous/next, though it shows them. So a silent looping <audio> stands in as the
   * thing that is playing — WebKit prefers any media element to Web Audio for NOW
   * PLAYING — and its buttons reach the mediaSession handlers above.
   *
   * Started inside a tap on a music screen (main.js's gesture hook), since iOS lets an
   * element play without one only after it has played with one; not before a music
   * screen, because a playing element stops other apps' audio. WebKit only: it is
   * WebKit's routing this works round.
   */
  primeAnchor() {
    if (!this.standIn || this.anchorReady || this.anchorPriming) return;
    const nav = this.win.navigator || {};
    if (!nav.audioSession || !nav.mediaSession || typeof this.doc.createElement !== 'function'
      || !this.win.Blob || !this.win.URL || !this.win.URL.createObjectURL) return;
    let el = this.anchor;
    if (!el) {
      el = this.doc.createElement('audio');
      el.loop = true;
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
      el.src = this.win.URL.createObjectURL(new this.win.Blob([silentWav()], { type: 'audio/wav' }));
      if (this.doc.body) this.doc.body.appendChild(el);
      this.anchor = el;
    }
    this.anchorPriming = true;
    el.muted = false;
    const settle = (ok) => {
      this.anchorPriming = false;
      this.anchorReady = ok;
      // whatever the screen wants now: it was playing, or failed to
      this.anchorState = ok ? 'playing' : null;
      if (ok) this.syncAnchor(this.playbackState);
    };
    let played = null;
    try { played = el.play(); } catch (e) { settle(false); return; }
    if (played && typeof played.then === 'function') played.then(() => settle(true), () => settle(false));
    else settle(true);
  }

  /**
   * The lock screen's progress bar: where the song is, out of how long (the engine's
   * songClock), kept true as it loops back and as the club skips. Without it the card
   * shows the anchor's own two seconds going round (Peter, 8 Oct 2026) — an unbounded
   * length, the first try, is refused by WebKit, and the anchor's clip is what it fell
   * back to. Set again only when what the card would be extrapolating has drifted from
   * the song, and once more, by a timer, as it loops: with the screen off no frame runs
   * to see it, and the playback session keeps the timer running.
   */
  syncPosition(media, song) {
    if (typeof media.setPositionState !== 'function') return;
    const clock = song && typeof this.audio.songClock === 'function' ? this.audio.songClock() : null;
    if (!clock) {
      if (this.positionSet) {
        this.positionSet = null;
        try { media.setPositionState(null); } catch (e) { /* nothing to clear */ }
      }
      return;
    }
    const now = (this.win.performance?.now?.() ?? Date.now()) / 1000;
    const rate = song.paused ? 0 : 1;
    const was = this.positionSet;
    if (was && was.rate === rate && Math.abs(was.duration - clock.duration) < 0.05
      && Math.abs(Math.min(was.duration, was.position + (now - was.at) * rate) - clock.position) < 0.3) return;
    try {
      media.setPositionState({ duration: clock.duration, position: Math.min(clock.position, clock.duration), playbackRate: 1 });
    } catch (e) { return; }
    this.positionSet = { ...clock, rate, at: now };
    if (this.positionTimer) this.win.clearTimeout(this.positionTimer);
    this.positionTimer = rate
      ? this.win.setTimeout(() => { this.positionTimer = null; this.syncMusicSession(); },
        Math.max(50, (clock.duration - clock.position) * 1000 + 60))
      : null;
  }

  /** The anchor follows the song: playing, paused — or muted when there is none, which takes it off the lock screen. */
  syncAnchor(state) {
    const el = this.anchor;
    if (!el || !this.anchorReady || state === this.anchorState) return;
    this.anchorState = state;
    el.muted = state === 'none';
    if (state !== 'playing') { el.pause(); return; }
    let played = null;
    try { played = el.play(); } catch (e) { /* settled below */ }
    // refused after all: the next tap on a music screen starts it again
    const refuse = () => { this.anchorReady = false; this.anchorState = null; };
    if (played && typeof played.catch === 'function') played.catch(refuse);
    else if (!played) refuse();
  }

  writeMetadata(song, artwork) {
    const media = this.win.navigator && this.win.navigator.mediaSession;
    if (!media || !this.win.MediaMetadata) return;
    // With a playback session the game's own sound is "playing" to iOS too, and Control
    // Center shows a card for it — named, rather than left as the web address.
    try {
      media.metadata = new this.win.MediaMetadata(song
        ? { title: song.title, artist: 'MASHENSTEIN', album: song.album, artwork }
        : { title: 'MASHENSTEIN', artwork: this.artwork() });
    } catch (e) { /* metadata is a nicety; the music plays without it */ }
  }

  /**
   * A new cover each time a song comes on (songArt), handed over as a data URL: the
   * card's artwork is fetched like any image, and a data URL is the one kind every
   * loader takes. Encoded off the frame (toBlob), and dropped if the song has moved on
   * by the time it is ready.
   */
  paintCover(song, key) {
    this.coverKey = key;
    // A cabinet's scenery can take a second or two to paint the first time on a phone
    // (its bakes), and nothing feeds the sequencer meanwhile: queue the music past it
    // first, as the desk does before a block it causes on purpose.
    if (typeof this.audio.prefill === 'function') this.audio.prefill(2);
    let canvas = null;
    try { canvas = typeof this.songArt === 'function' ? this.songArt(song) : null; } catch (e) { canvas = null; }
    if (!canvas || typeof canvas.toBlob !== 'function' || !this.win.FileReader) return;
    canvas.toBlob((blob) => {
      if (!blob || key !== this.nowPlayingKey) return;
      const reader = new this.win.FileReader();
      reader.onload = () => {
        if (key !== this.nowPlayingKey || typeof reader.result !== 'string') return;
        this.cover = [{ src: reader.result, sizes: `${canvas.width}x${canvas.height}`, type: blob.type || 'image/jpeg' }];
        this.writeMetadata(song, this.cover);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.9);
  }

  /**
   * The game's own icon — the dev build's magenta set under the dev server. Tapped, the
   * lock screen blows it up to most of its width, so it is the 512 the build ships beside
   * the 192 the page links (build.js ICONS, same name but the size), not the 180/192.
   */
  artwork() {
    const link = this.doc.querySelector && this.doc.querySelector('link[rel="icon"][sizes="192x192"]');
    if (!link || !link.href || !/-192\.png$/.test(link.href)) return [];
    return [{ src: link.href.replace(/-192\.png$/, '-512.png'), sizes: '512x512', type: 'image/png' }];
  }

  setPresentationRefreshing(active, rhythm = false) {
    this.presentationRefreshing = !!active;
    this.presentationRhythm = !!rhythm;
    return this.apply();
  }

  setOverlay(show) {
    if (!this.overlay) return;
    if (show === this.wasOverlayVisible) return;
    this.wasOverlayVisible = show;
    this.overlay.hidden = !show;
    if (show) {
      this.syncErrorReport();
      // A card shown again later starts its own count: the taps that opened the
      // menu last time are spent, and half a gesture must not carry over.
      this.titleTapCount = 0;
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
    // Left (hidden), it fades before it holds — the playback session keeps it running to —
    // unless a beat-locked run is up, whose lane must stop with its world, not a fade's
    // length after it. A presentation refresh holds at once.
    const fadeOut = this.isHidden() && !this.beatLocked();
    this.audio.setLifecyclePaused(policy.audioPaused, { fade: fadeOut });
    // Hidden with the music playing on: the screen puts down whatever only its own
    // frames would have ended. Back: a context iOS interrupted anyway — an older
    // iOS, a phone call — is asked to resume rather than waiting for a tap.
    if (policy.backgroundAudio !== this.inBackground) {
      this.inBackground = policy.backgroundAudio;
      if (this.inBackground) this.onBackground();
      else if (this.audio.resumeContext) this.audio.resumeContext();
    }
    // Gone to the lock screen with a song whose cover is not painted yet (syncMusicSession).
    if (this.isHidden() && this.nowPlayingKey && this.coverKey !== this.nowPlayingKey) {
      const song = this.nowPlaying();
      if (song) this.paintCover(song, this.nowPlayingKey);
    }
    if (policy.paused) this.loop.pause();
    else this.loop.resume();
    return policy;
  }

  destroy() {
    this.doc.removeEventListener('visibilitychange', this.onVisibility);
    this.win.removeEventListener('pagehide', this.onPageHide);
    this.win.removeEventListener('blur', this.onBlur);
    this.win.removeEventListener('focus', this.onFocus);
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
    this.portraitTitle && this.portraitTitle.removeEventListener('click', this.onTitleTap);
    this.portraitTitle && this.portraitTitle.removeEventListener('pointerup', this.onTitlePointerUp);
    this.win.clearTimeout(this.reloadTimer);
    if (this.positionTimer) this.win.clearTimeout(this.positionTimer);
    this.buildStamp && this.onStampTap && this.buildStamp.removeEventListener('click', this.onStampTap);
    (this.diagButtons || []).forEach(([el, fn]) => el && el.removeEventListener('click', fn));
  }
}
