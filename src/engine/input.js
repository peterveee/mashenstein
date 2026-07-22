// Unified input: keyboard + touch gestures + virtual buttons + gamepad.
// Actions: jump, duck, ability, left, right, confirm, back, escape, pause, mute.
import { clientToLogical } from './renderer.js';

const DEFAULT_KEYS = {
  jump: ['Space', 'ArrowUp', 'KeyW'],
  duck: ['ArrowDown', 'KeyS'],
  ability: ['KeyX', 'ShiftLeft', 'ShiftRight'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space'],
  back: ['Backspace'],
  pause: ['KeyP'],
  mute: ['KeyM'],
  debug: ['F2'],   // Backquote now opens the dev menu (dev builds only)
};

const GAMEPAD_MAP = { 0: 'jump', 1: 'duck', 2: 'ability', 3: 'ability', 9: 'pause', 12: 'jump', 13: 'duck', 14: 'left', 15: 'right' };

class InputSys {
  constructor() {
    this.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
    this.down = new Set();      // currently held actions
    this.activity = 0;          // raw HUMAN input counter (bots never bump it)
    this.hit = new Set();       // pressed this frame
    this.up = new Set();        // released this frame
    this.pointer = { x: 0, y: 0, down: false };
    this.buttons = [];          // virtual on-screen buttons: {id, x, y, w, h, action}
    this.textHandler = null;    // for TURDLE typing
    this.touches = new Map();   // pointerId -> {x0, y0, t0, action}
    this.padPrev = new Set();
    this.onAnyGesture = null;   // audio unlock hook
    this.usingTouch = false;
    this.context = 'default';
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // Reserved for the dev screenshot shortcut. Keep it out of the game's
      // activity counter so attract/cast scenes do not treat the combo as an
      // exit press before the dev listener handles it.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault();
        return;
      }
      this.activity++;
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
      this.activity++;
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
        // Tap-to-jump is a RUN-gameplay convenience only. Every other context
        // has its own tap handling (menu list-select, the hub's walk/interact
        // logic, ...), and a bare 'jump' press leaking in there is a real bug,
        // not just redundant: some of those screens read 'jump' as a
        // controller's action button (e.g. the hub's "confirm the station
        // you're standing at"), and since this fired from ANY tap anywhere on
        // screen, merely being near a station — not tapping it — was enough
        // to confirm it.
        if (this.usingTouch && this.context === 'run') this.press('jump');
      }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      const p = clientToLogical(e.clientX, e.clientY);
      this.pointer.x = p.x; this.pointer.y = p.y;
      const t = this.touches.get(e.pointerId);
      if (t && !t.isButton && !t.action) {
        const dx = p.x - t.x0, dy = p.y - t.y0;
        // Both gestures start as a tap, which in a run has already fired a
        // jump — releasing it here ends the hold rather than undoing the hop,
        // the same trade swipe-down has always made. The alternative is
        // deferring jump to pointerup, which costs hold-for-height on every
        // jump to save a hop on the occasional swipe.
        const swipe = (action) => { this.release('jump'); t.action = action; this.press(action); };
        // Dominant axis wins, so a swipe that drifts diagonally still resolves
        // to the one the thumb meant rather than to whichever test ran first.
        if (performance.now() - t.t0 < 300) {
          // Swipe down = duck (held).
          if (dy > 24 && dy >= Math.abs(dx)) swipe('duck');
          // Swipe right = power, so the whole game is playable one-handed:
          // JUMP and PWR are opposite bottom corners, which is a two-thumb
          // layout, and a phone held in one hand can only reach one of them.
          // Rightward because the hero runs right and the powers throw, dash
          // and smash that way — the gesture is a shove in the direction the
          // ability already goes. Run only: elsewhere a horizontal drag is
          // scrolling a list or dragging the hub, not firing anything.
          else if (this.context === 'run' && dx > 24 && dx > Math.abs(dy)) swipe('ability');
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
    if (code === 'Escape') return this.context === 'run' ? 'escape' : 'back';
    if (this.context === 'run' && (code === 'ArrowRight' || code === 'KeyD')) return 'ability';
    if (this.context === 'menu') {
      if (code === 'ArrowUp' || code === 'KeyW') return 'up';
      if (code === 'ArrowDown' || code === 'KeyS') return 'down';
      if (code === 'Space' || code === 'Enter') return 'confirm';
    }
    for (const [act, codes] of Object.entries(this.keys)) if (codes.includes(code)) return act;
    return null;
  }

  // True on touch-first devices (or once a touch has actually happened).
  // Used to bypass keyboard-finicky content like the breaker-box minigames.
  isTouchDevice() {
    if (this.usingTouch) return true;
    return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  // x/y/w/h is every button's bounding box, round or not, so layout and this
  // test read the same numbers. Round buttons hit-test as discs — the corners
  // of a circular button's box are visibly outside it, and a tap landing there
  // firing the button is the kind of thing that reads as a mis-registered
  // screen. SLOP buys back what the disc costs a thumb, which lands short of
  // where its owner thinks it did more often than it lands wide.
  buttonAt(x, y) {
    const SLOP = 4;
    for (const b of this.buttons) {
      if (b.round) {
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        const r = Math.min(b.w, b.h) / 2 + SLOP;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) return b;
      } else if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  setButtons(list) { this.buttons = list || []; }

  setContext(context) {
    this.context = context || 'default';
    this.clearAll();
  }

  // Menu states call this before the first touch so ESC is immediately ready.
  // No ENTER button: every menu screen already confirms straight off the
  // content — tapping a row selects it and tapping that same row again (or,
  // on a couple of screens, tapping anywhere) confirms it — so a separate
  // button duplicated a gesture that already worked. ESC has no such
  // equivalent (there is no "tap blank space to back out" convention most of
  // these screens use), so it stays: top-right, out of the way of list content
  // and title text that both live top-centre. A level's top-right corner holds
  // the round PAUSE disc instead (run.js setButtons) — a menu backs out and a
  // level suspends, which are different enough acts to be different controls.
  // showBack is false only for the title screen, which has nothing to back out
  // of at its root (erase-mode cancel is a tappable list row instead).
  setMenuButtons(showBack = true) {
    this.setContext('menu');
    const buttons = [];
    if (showBack) buttons.push({ id: 'menuBack', x: 412, y: 8, w: 56, h: 18, action: 'back', label: 'ESC', global: true });
    this.setButtons(buttons);
  }

  press(a) { if (!this.down.has(a)) { this.down.add(a); this.hit.add(a); } }

  // Drop every held/pending input (attract mode consumes the exit press so it
  // can never navigate a menu).
  clearAll() {
    this.down.clear();
    this.hit.clear();
    if (this.up) this.up.clear();
    this.touches.clear();
    this.padPrev = new Set();
  }
  release(a) { if (this.down.has(a)) { this.down.delete(a); this.up.add(a); } }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => {
        if (!b.pressed || !GAMEPAD_MAP[i]) return;
        const action = this.context === 'menu' && i === 12 ? 'up'
          : this.context === 'menu' && i === 13 ? 'down'
          : this.context === 'menu' && i === 0 ? 'confirm'
          : this.context === 'menu' && (i === 1 || i === 9) ? 'back'
          : this.context === 'run' && i === 15 ? 'ability' : GAMEPAD_MAP[i];
        now.add(action);
      });
      pad.buttons.forEach((b, i) => {
        if (!b.pressed || !GAMEPAD_MAP[i]) return;
        const action = this.context === 'menu' && i === 12 ? 'up'
          : this.context === 'menu' && i === 13 ? 'down'
          : this.context === 'menu' && i === 0 ? 'confirm'
          : this.context === 'menu' && (i === 1 || i === 9) ? 'back'
          : this.context === 'run' && i === 15 ? 'ability' : GAMEPAD_MAP[i];
        if (!this.padPrev.has(action)) this.activity++;
      });
      if (pad.axes[0] < -0.5) now.add('left');
      if (pad.axes[0] > 0.5) now.add(this.context === 'run' ? 'ability' : 'right');
      if (pad.axes[1] < -0.5) now.add(this.context === 'menu' ? 'up' : 'jump');
      if (pad.axes[1] > 0.5) now.add(this.context === 'menu' ? 'down' : 'duck');
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
