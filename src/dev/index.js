// Dev menu overlay — local builds only.
//
// Gated on window.__MASH_BUILD__, which build/build.js emits only under --watch
// (npm run dev). A published `npm run build` bundle never sets it, so install()
// is never called and no listener is ever registered.
//
// This is deliberately NOT a State. setState() runs a ~0.29s shutter and calls
// exit() on the outgoing state, so pushing a dev-menu state would tear down the
// very run you wanted to inspect. Instead the overlay wraps the loop callbacks
// in main.js: while it's open it consumes the frame, leaving the live state
// frozen and pokeable underneath.
//
// Input is read from a private keydown listener rather than through the Input
// action system, because Input.setContext() remaps keys per scene — the menu
// must behave identically wherever it was opened from.
import { Input } from '../engine/input.js';
import { H, pushOverlayDraw, saveScreenshot, clientToLogical, setDevPortraitFill } from '../engine/renderer.js';
import { currentState } from '../engine/states.js';
import { drawText, drawPanel } from '../engine/sprites.js';
import { propCacheStats } from '../sprites/props.js';
import { rootMenu, drawMenu, menuLayout } from './menus.js';
import { TuneStrip, drawTuneStrip, tuneHelp } from './tune-strip.js';
import { loadTuning, revertTuning, resyncRun } from './tune-store.js';
import { sourceLines, tuningAvailable } from './tunables.js';
import { TUNABLES } from '../../tools/lib/tunables.js';

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4];

// Keys allowed to auto-repeat while held. The menu's row cursor and the tuning
// strip's value nudge both want a held key to keep going; everything else is a
// one-shot action where a repeat would fire it dozens of times.
const REPEATABLE = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

// Keys the tuning strip takes away from the game while it is on.
//
// Every one of them is a live gameplay action during a run — ArrowUp is jump,
// ArrowDown is duck, ArrowLeft is the rewind, ArrowRight is the ability, and
// Shift is the ability again. Tuning with them while they still reached the
// player meant every nudge also fired a wrench or scrubbed the run backwards.
//
// They are safe to take precisely because each has an alternate binding that
// tune mode does NOT touch, so the hero stays drivable while you tune:
//
//   jump    Space, W        duck     S
//   rewind  A               ability  X, D
//
// That is the whole reason to claim these five rather than suspending Input
// outright: watching the hero move is the point of tuning without a pause.
const TUNE_CLAIMED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
]);

export const Dev = {
  enabled: false,
  open: false,
  ctx: null,          // { Flow, save }
  stack: [],          // breadcrumb of {title, items, idx}
  timeScale: 1,
  stepOnce: false,
  paused: false,
  seedLock: null,     // when set, every dev-launched run reuses this seed
  toast: null,
  toastT: 0,
  touchUnlock: { count: 0, t: 0 },
  reopenAfterState: null,
  lastRun: null,      // identity of the run we last pushed sync-hooked tunables into

  install(ctx) {
    if (!this.enabled || this.ctx) return;
    this.ctx = ctx;
    // Restore last session's tuning now rather than at module-eval: the
    // registry only finishes filling once every transformed module has been
    // evaluated, and link order is esbuild's business, not ours.
    const { applied, dropped } = loadTuning();
    if (applied.length) this.say(`TUNING RESTORED (${applied.length})`);
    if (dropped.length) console.warn('[tune] dropped:', dropped.join(', '));
    window.addEventListener('keydown', (e) => this.onKey(e), { capture: true });
    // The matching half of the claim. Without it a keyup for a swallowed
    // keydown still reaches Input, and an action Input never saw pressed gets
    // released — harmless today, but it is the kind of asymmetry that leaves an
    // ability stuck on the frame the strip is switched off.
    window.addEventListener('keyup', (e) => {
      if (!this.enabled || this.open || !TuneStrip.on) return;
      if (!TUNE_CLAIMED.has(e.code)) return;
      e.preventDefault();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, { capture: true });
    const game = document.getElementById('game');
    game && game.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'mouse') return;
      const p = clientToLogical(e.clientX, e.clientY);
      const now = performance.now();
      if (!this.open) {
        if (e.pointerType !== 'touch') return;
        // Touch-only dev builds have no Backquote key: five taps in the
        // upper-left corner open the intentionally obscure dev overlay.
        if (p.x <= 72 && p.y <= 32 && now - this.touchUnlock.t < 1600) this.touchUnlock.count++;
        else this.touchUnlock.count = 1;
        this.touchUnlock.t = now;
        if (this.touchUnlock.count >= 5) { this.openMenu(); this.touchUnlock.count = 0; e.preventDefault(); }
        return;
      }
      const top = this.top();
      if (!top) return;
      // The same layout the painter used this frame — portrait moves every row.
      const L = menuLayout();
      // The breadcrumb strip is the touch BACK. A phone has no Backspace and no
      // backquote, so without it a submenu reached by tapping is a room with no
      // door — and popping the last screen closes the overlay, which is the
      // touch CLOSE as well.
      if (p.y < L.listTop) { this.pop(); e.preventDefault(); return; }
      const first = Math.max(0, Math.min(top.items.length - L.maxRows, top.idx - Math.floor(L.maxRows / 2)));
      const row = Math.floor((p.y - L.listTop) / L.rowH);
      const idx = first + row;
      if (idx < 0 || idx >= top.items.length || row >= L.maxRows) return;
      top.idx = idx;
      const item = top.items[idx];
      if (item.submenu) this.push(item.submenu(this));
      else if (item.act) { item.act(); this.refresh(); }
      e.preventDefault();
    }, { capture: true });
    if (typeof window !== 'undefined') {
      window.__mash_dev = this;
      // Art-cache counters, for the diagnostics panel and for driving a
      // measurement from outside the page. Every entry in that cache is a
      // canvas that is never freed, so the resident total is worth being able
      // to read on a device rather than inferring from a crash.
      window.__mash_art = propCacheStats;
    }
  },

  // ---------------------------------------------------------------- helpers
  say(msg) { this.toast = msg; this.toastT = 2.5; },

  screenshot() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const name = `mashenstein-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
      + `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
    this.say(saveScreenshot(name) ? `SAVED ${name}` : 'SCREENSHOT UNAVAILABLE');
  },

  exportSave() {
    try {
      const json = JSON.stringify(this.ctx.save.exportData(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mashenstein-save.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.say('SAVE EXPORTED');
    } catch (e) { this.say('EXPORT UNAVAILABLE'); }
  },

  importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          this.ctx.save.importData(JSON.parse(reader.result));
          this.say('SAVE IMPORTED');
          this.refresh();
        } catch (e) { this.say(e.message === 'INVALID SAVE FILE' ? e.message : 'IMPORT FAILED'); }
      };
      reader.onerror = () => this.say('IMPORT FAILED');
      reader.readAsText(file);
    });
    input.click();
  },

  run() {
    // The live RunState, if one is on screen. BossState extends RunState, and
    // the autoplay shells expose their inner run as .run.
    const cur = typeof window !== 'undefined' ? window.__mash_cur : null;
    if (!cur) return null;
    if (cur.run && cur.run.player) return cur.run;
    return cur.player ? cur : null;
  },

  openMenu() {
    this.stack = [{ ...rootMenu(this), idx: 0 }];
    this.open = true;
    this.syncPortrait();
  },

  close() { this.open = false; this.stack = []; this.syncPortrait(); },

  // Two things follow the overlay's open state, and both only bite on a phone
  // held upright: the canvas takes the whole screen instead of the 16:9 band
  // (the renderer ignores the request in landscape), and the lifecycle stops
  // treating portrait as a reason to pause — main.js folds this.open into its
  // portrait predicate, and a phone held still fires no other event that would
  // make it ask again.
  //
  // The pause policy is deferred by a microtask because nearly every menu
  // action closes and then immediately setState()s: it must be read against the
  // screen the action is leaving behind, not the one it is still standing on.
  // The canvas is not deferred — the overlay is painted from the very next
  // frame, and that frame has to find the geometry it laid itself out for.
  syncPortrait() {
    setDevPortraitFill(this.open);
    const notify = this.ctx && this.ctx.onOpenChange;
    if (!notify) return;
    if (typeof queueMicrotask === 'function') queueMicrotask(notify);
    else notify();
  },

  // A dev screen launched as a temporary state can hand control back to the
  // exact state that was underneath the overlay. Wait until the shutter has
  // finished before reopening the overlay; opening it immediately would pause
  // the transition on its first frame.
  reopenMenuAfterState(state) { this.reopenAfterState = state || null; },

  push(menu) { this.stack.push({ ...menu, idx: 0 }); },

  pop() {
    this.stack.pop();
    if (!this.stack.length) this.close();
  },

  top() { return this.stack[this.stack.length - 1]; },

  // Rebuild the current screen in place, so toggles relabel immediately.
  refresh() {
    const top = this.top();
    if (top && top.rebuild) {
      const next = top.rebuild(this);
      top.items = next.items;
      top.title = next.title;
      if (top.idx >= top.items.length) top.idx = Math.max(0, top.items.length - 1);
    }
  },

  cycleSpeed(dir) {
    const i = SPEEDS.indexOf(this.timeScale);
    const next = SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, (i < 0 ? 3 : i) + dir))];
    this.timeScale = next;
    this.say(`SPEED x${next}`);
  },

  // Turn the tuning strip on or off, and everything that goes with it.
  //
  // Two things beyond the strip's own state. Input.clearAll() releases anything
  // already held, so an ability being pressed at the moment the strip comes up
  // does not stay held by a keyup this listener is about to swallow. And the
  // run goes invulnerable: tuning means deliberately entering values that get
  // the hero killed, and a run that ends on the first bad number takes the
  // thing you are studying off the screen.
  setTuneMode(on) {
    if (on === TuneStrip.on) return;
    // Refuse to take the arrow keys off the game when there is nothing to tune
    // with them. Without the bundle transform there are no registered
    // constants, so claiming jump/duck/rewind/ability would cost the run its
    // controls and buy nothing.
    if (on && !tuningAvailable()) {
      this.say('NO TUNABLES — needs a watch build (npm run dev)');
      return;
    }
    TuneStrip.toggle();
    Input.clearAll();
    this.applyTuneInvuln(this.run());
    this.say(on ? `TUNE ON — ${tuneHelp()}` : 'TUNE OFF');
  },

  // Invulnerability is the strip's to grant and the strip's to take back, but
  // only if it was the one that granted it — INVULNERABLE in the RUN menu is a
  // separate switch and turning the strip off must not silently undo it.
  applyTuneInvuln(run) {
    if (!run) return;
    if (TuneStrip.on) {
      if (!run.devInvuln) { run.devInvuln = true; run.__tuneGrantedInvuln = true; }
    } else if (run.__tuneGrantedInvuln) {
      run.devInvuln = false;
      run.__tuneGrantedInvuln = false;
    }
  },

  // Tune-mode keys. Returns true when the key was consumed, so the caller's
  // ordinary closed-menu shortcuts never see an arrow meant for a constant.
  handleTuneKey(e) {
    const run = this.run();
    switch (e.code) {
      case 'ArrowUp': TuneStrip.move(-1); break;
      case 'ArrowDown': TuneStrip.move(1); break;
      case 'ArrowLeft': case 'ArrowRight': {
        const said = TuneStrip.adjust(e.code === 'ArrowRight' ? 1 : -1, e.shiftKey, run);
        if (said) this.say(said);
        break;
      }
      // Zoom gets its own pair of keys rather than a row you have to navigate
      // to: it is the lever you want to sweep while watching how something else
      // reads, and both the numpad and main-row spellings are accepted because
      // which one a keyboard sends for "+" is not worth thinking about.
      case 'Equal': case 'NumpadAdd': case 'Minus': case 'NumpadSubtract': {
        const up = e.code === 'Equal' || e.code === 'NumpadAdd';
        const said = TuneStrip.adjustNamed('ZOOM_NORMAL', up ? 1 : -1, e.shiftKey, run);
        this.say(said || 'ZOOM_NORMAL not in this bundle — restart the watch build');
        break;
      }
      case 'KeyG': TuneStrip.cycleGroup(e.shiftKey ? -1 : 1); break;
      case 'KeyC': this.copyConstants(); break;
      case 'KeyR': {
        const n = revertTuning();
        this.say(n ? `REVERTED ${n} CONSTANT${n === 1 ? '' : 'S'}` : 'NOTHING TO REVERT');
        if (run) resyncRun(run);
        break;
      }
      default: return false;
    }
    e.preventDefault();
    return true;
  },

  // The bridge back to source. Only what moved, grouped by file, formatted the
  // way the file already writes it — so the paste is the two lines that changed
  // rather than twenty-four that did not.
  copyConstants() {
    const text = sourceLines(TUNABLES);
    if (!text) { this.say('NOTHING CHANGED'); return; }
    const n = text.split('\n').filter((l) => l.startsWith('  const')).length;
    const done = () => this.say(`COPIED ${n} CONSTANT${n === 1 ? '' : 'S'}`);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, () => { console.log(text); done(); });
        return;
      }
    } catch (err) { /* fall through to the console */ }
    console.log(text);
    done();
  },

  // ------------------------------------------------------------------ input
  onKey(e) {
    if (!this.enabled) return;
    // ArrowLeft/Right join the repeat allowance because holding one is how the
    // tuning strip is used at all: a constant you can only step by tapping is a
    // constant you never sweep, and sweeping is the point.
    if (e.repeat && !REPEATABLE.has(e.code)) return;

    if (e.code === 'Backquote') {
      this.open ? this.close() : this.openMenu();
      e.preventDefault();
      return;
    }

    // Cmd/Ctrl+Shift+P captures the currently visible game canvas.
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyP') {
      this.screenshot();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    if (!this.open) {
      // Closed-menu shortcuts: speed, pause, frame-step, bot takeover, skip.
      const cur = typeof window !== 'undefined' ? window.__mash_cur : null;

      // Tune mode owns the arrows while it is on, and must be asked first:
      // ArrowRight is the ability key during a run and the section-skip below,
      // so the claim has to be explicit and opt-in rather than ambient.
      if (e.code === 'KeyT' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        this.setTuneMode(!TuneStrip.on);
        e.preventDefault();
        return;
      }
      // Claimed keys are swallowed whether or not the strip does something with
      // them: stopImmediatePropagation is what actually keeps them out of the
      // game, since Input listens on window in the bubble phase and this
      // listener is a capture-phase one registered on the same target.
      // preventDefault alone would still have let the ability fire.
      if (TuneStrip.on && TUNE_CLAIMED.has(e.code)) {
        this.handleTuneKey(e);
        e.preventDefault();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        return;
      }
      if (TuneStrip.on && this.handleTuneKey(e)) return;

      if (e.code === 'BracketLeft') { this.cycleSpeed(-1); e.preventDefault(); }
      else if (e.code === 'BracketRight') { this.cycleSpeed(1); e.preventDefault(); }
      else if (e.code === 'Backslash') { this.paused = !this.paused; this.say(this.paused ? 'PAUSED' : 'RESUMED'); e.preventDefault(); }
      else if (e.code === 'Period' && this.paused) { this.stepOnce = true; e.preventDefault(); }
      else if (e.code === 'Tab' && cur && cur.takeOver) { cur.takeOver(); this.say('YOU HAVE THE CONTROLS'); e.preventDefault(); }
      // N and the forward arrow skip the section the current screen is sitting
      // on. Only training implements it — reviewing a ten-section module by
      // playing all ten of them, every time, is how the last section ends up
      // unreviewed.
      //
      // The screen decides, rather than this listener: ArrowRight is also the
      // ability key during a run, so a screen that is currently teaching the
      // ability has to be able to decline the skip and let the shot through. A
      // falsy return means "not mine" — nothing is said and nothing is
      // swallowed, so the key reaches the game as normal.
      else if ((e.code === 'KeyN' || e.code === 'ArrowRight') && cur && cur.devSkipSection) {
        const said = cur.devSkipSection(e.code);
        if (said) { this.say(said); e.preventDefault(); }
      }
      return;
    }

    const top = this.top();
    if (!top) return;
    const n = top.items.length;

    switch (e.code) {
      case 'ArrowUp': top.idx = (top.idx + n - 1) % n; break;
      case 'ArrowDown': top.idx = (top.idx + 1) % n; break;
      case 'ArrowLeft': case 'ArrowRight': {
        const item = top.items[top.idx];
        if (item && item.adjust) { item.adjust(e.code === 'ArrowRight' ? 1 : -1); this.refresh(); }
        break;
      }
      case 'Enter': case 'Space': {
        const item = top.items[top.idx];
        if (!item) break;
        if (item.submenu) this.push(item.submenu(this));
        else if (item.act) { item.act(); this.refresh(); }
        break;
      }
      case 'Backspace': case 'Escape': this.pop(); break;
      default: return;
    }
    e.preventDefault();
  },

  // ------------------------------------------------------------------ frame
  // Returns true when the dev overlay has consumed the frame.
  update(dt) {
    if (!this.enabled) return false;
    if (this.toastT > 0) this.toastT -= dt;
    // The camera readout reports the peak the run actually reached, so it has
    // to watch every frame rather than model a trajectory it cannot predict.
    if (TuneStrip.on) TuneStrip.observe(this.run());
    // A new run builds a new Spawner, which takes its own copy of REACT_FLOOR.
    // Push the tuned values into it once, on the frame it appears, or the
    // stream you are watching silently uses the shipped spacing.
    const r = this.run();
    if (r !== this.lastRun) {
      this.lastRun = r;
      if (r) { resyncRun(r); this.applyTuneInvuln(r); }
    }

    if (this.reopenAfterState && currentState() === this.reopenAfterState) {
      this.reopenAfterState = null;
      this.openMenu();
    }

    if (this.open) {
      // Nothing downstream will run, so clear the one-frame input sets here.
      // Every state normally does this at the tail of its own update.
      Input.endFrame();
      return true;
    }
    if (this.paused && !this.stepOnce) { Input.endFrame(); return true; }
    this.stepOnce = false;
    return false;
  },

  draw(ctx) {
    if (!this.enabled) return;
    // Queue above every hero/HUD/effect overlay, or the frozen run's own HUD
    // composites on top of the menu. Headless has no overlay target, so fall
    // back to drawing directly — same contract states.js uses for the shutter.
    const paint = (d) => {
      if (this.open) { drawMenu(d, this); return; }
      drawTuneStrip(d, this);
      this.drawStatusStrip(d);
    };
    if (!pushOverlayDraw(paint)) paint(ctx);
  },

  // A thin always-on strip while the menu is closed, so a dev build is never
  // ambiguous about being in a modified state.
  drawStatusStrip(ctx) {
    const bits = [];
    if (this.timeScale !== 1) bits.push(`x${this.timeScale}`);
    if (this.paused) bits.push('PAUSED');
    const r = this.run();
    if (r && r.devInvuln) bits.push(`CRASH ${r.devHits.length}`);
    if (this.toastT > 0 && this.toast) bits.push(this.toast);
    if (!bits.length) return;
    const label = bits.join('  ');
    // One row up from the bottom edge. The very bottom-left is the game's own
    // location label — the food court, the trophy room, MANDATORY TRAINING —
    // and a dev strip printed straight over the name of the room you are in
    // obscures production UI to report a development state, which is backwards.
    drawPanel(ctx, 2, H - 30, 8 + label.length * 4, 11, 2, 'rgba(11,11,20,0.82)');
    drawText(ctx, label, 6, H - 27, '#f6d33c', 0.75);
  },
};
