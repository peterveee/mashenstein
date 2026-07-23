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
// action system, because Input.setContext() remaps keys per scene and
// Input.textHandler swallows every letter during TURDLE — the menu must behave
// identically wherever it was opened from.
import { Input } from '../engine/input.js';
import { H, pushOverlayDraw, saveScreenshot } from '../engine/renderer.js';
import { drawText, drawPanel } from '../engine/sprites.js';
import { rootMenu, drawMenu } from './menus.js';

const SPEEDS = [0.1, 0.25, 0.5, 1, 2, 4];

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

  install(ctx) {
    if (!this.enabled || this.ctx) return;
    this.ctx = ctx;
    window.addEventListener('keydown', (e) => this.onKey(e), { capture: true });
    if (typeof window !== 'undefined') window.__mash_dev = this;
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
  },

  close() { this.open = false; this.stack = []; },

  push(menu) { this.stack.push({ ...menu, idx: 0 }); },

  pop() {
    this.stack.pop();
    if (!this.stack.length) this.open = false;
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

  // ------------------------------------------------------------------ input
  onKey(e) {
    if (!this.enabled) return;
    if (e.repeat && e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;

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
      // Closed-menu shortcuts: speed, pause, frame-step, bot takeover.
      const cur = typeof window !== 'undefined' ? window.__mash_cur : null;
      if (e.code === 'BracketLeft') { this.cycleSpeed(-1); e.preventDefault(); }
      else if (e.code === 'BracketRight') { this.cycleSpeed(1); e.preventDefault(); }
      else if (e.code === 'Backslash') { this.paused = !this.paused; this.say(this.paused ? 'PAUSED' : 'RESUMED'); e.preventDefault(); }
      else if (e.code === 'Period' && this.paused) { this.stepOnce = true; e.preventDefault(); }
      else if (e.code === 'Tab' && cur && cur.takeOver) { cur.takeOver(); this.say('YOU HAVE THE CONTROLS'); e.preventDefault(); }
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
    const paint = (d) => { if (this.open) drawMenu(d, this); else this.drawStatusStrip(d); };
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
    drawPanel(ctx, 2, H - 13, 8 + label.length * 4, 11, 2, 'rgba(11,11,20,0.82)');
    drawText(ctx, label, 6, H - 10, '#f6d33c', 0.75);
  },
};
