// Unified input: keyboard + touch gestures + virtual buttons + gamepad.
// Actions: jump, duck, ability, tag, left, right, confirm, back, pause, mute.
import { clientToLogical } from './renderer.js';

const DEFAULT_KEYS = {
  jump: ['Space', 'ArrowUp', 'KeyW'],
  duck: ['ArrowDown', 'KeyS'],
  ability: ['KeyX', 'ShiftLeft', 'ShiftRight'],
  tag: ['KeyC', 'KeyE'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space'],
  back: ['Escape', 'Backspace'],
  pause: ['KeyP', 'Escape'],
  mute: ['KeyM'],
  debug: ['Backquote'],
};

const GAMEPAD_MAP = { 0: 'jump', 1: 'duck', 2: 'ability', 3: 'tag', 9: 'pause', 12: 'jump', 13: 'duck', 14: 'left', 15: 'right' };

class InputSys {
  constructor() {
    this.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
    this.down = new Set();      // currently held actions
    this.hit = new Set();       // pressed this frame
    this.up = new Set();        // released this frame
    this.pointer = { x: 0, y: 0, down: false };
    this.buttons = [];          // virtual on-screen buttons: {id, x, y, w, h, action}
    this.textHandler = null;    // for TURDLE typing
    this.touches = new Map();   // pointerId -> {x0, y0, t0, action}
    this.padPrev = new Set();
    this.onAnyGesture = null;   // audio unlock hook
    this.usingTouch = false;
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.textHandler && /^Key[A-Z]$|^Enter$|^Backspace$/.test(e.code)) {
        this.textHandler(e.code);
        e.preventDefault();
        return; // consumed by typing — don't also fire the mapped action
      }
      const act = this.actionForKey(e.code);
      if (act) { this.press(act); e.preventDefault(); }
      this.onAnyGesture && this.onAnyGesture();
    });
    window.addEventListener('keyup', (e) => {
      const act = this.actionForKey(e.code);
      if (act) this.release(act);
    });
    const el = document.getElementById('game');
    el.addEventListener('pointerdown', (e) => {
      this.usingTouch = e.pointerType === 'touch';
      this.onAnyGesture && this.onAnyGesture();
      const p = clientToLogical(e.clientX, e.clientY);
      this.pointer = { x: p.x, y: p.y, down: true };
      this.press('pointer');
      const btn = this.buttonAt(p.x, p.y);
      if (btn) {
        this.touches.set(e.pointerId, { x0: p.x, y0: p.y, t0: performance.now(), action: btn.action, isButton: true });
        this.press(btn.action);
      } else {
        this.touches.set(e.pointerId, { x0: p.x, y0: p.y, t0: performance.now(), action: null });
        if (this.usingTouch) this.press('jump'); // tap = jump (gesture may refine to duck)
      }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      const p = clientToLogical(e.clientX, e.clientY);
      this.pointer.x = p.x; this.pointer.y = p.y;
      const t = this.touches.get(e.pointerId);
      if (t && !t.isButton && !t.action) {
        const dy = p.y - t.y0;
        if (dy > 24 && performance.now() - t.t0 < 300) { // swipe down = duck (held)
          this.release('jump');
          t.action = 'duck';
          this.press('duck');
        }
      }
    });
    const endPointer = (e) => {
      const t = this.touches.get(e.pointerId);
      if (t) {
        if (t.action) this.release(t.action);
        else if (this.usingTouch) this.release('jump');
        this.touches.delete(e.pointerId);
      }
      if (this.touches.size === 0) { this.pointer.down = false; this.release('pointer'); }
    };
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => { this.down.clear(); });
  }

  actionForKey(code) {
    for (const [act, codes] of Object.entries(this.keys)) if (codes.includes(code)) return act;
    return null;
  }

  buttonAt(x, y) {
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  setButtons(list) { this.buttons = list || []; }

  // Menu states call this before the first touch so ENTER is immediately ready.
  setMenuButtons() {
    this.setButtons([{ id: 'menuConfirm', x: 396, y: 232, w: 72, h: 28, action: 'confirm', label: 'ENTER', global: true }]);
  }

  press(a) { if (!this.down.has(a)) { this.down.add(a); this.hit.add(a); } }
  release(a) { if (this.down.has(a)) { this.down.delete(a); this.up.add(a); } }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => { if (b.pressed && GAMEPAD_MAP[i]) now.add(GAMEPAD_MAP[i]); });
      if (pad.axes[0] < -0.5) now.add('left');
      if (pad.axes[0] > 0.5) now.add('right');
      if (pad.axes[1] > 0.5) now.add('duck');
    }
    for (const a of now) if (!this.padPrev.has(a)) this.press(a);
    for (const a of this.padPrev) if (!now.has(a)) this.release(a);
    if (now.size) this.onAnyGesture && this.onAnyGesture();
    this.padPrev = now;
  }

  // Per-frame API
  pressed(a) { return this.hit.has(a); }
  held(a) { return this.down.has(a); }
  released(a) { return this.up.has(a); }
  endFrame() { this.hit.clear(); this.up.clear(); }
}

export const Input = new InputSys();
