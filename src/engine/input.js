// Unified input: keyboard + touch gestures + virtual buttons + gamepad.
// Actions: jump, duck, ability, left, right, confirm, back, escape, pause, mute.
import { clientToLogical, W } from './renderer.js';

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
    this.chromeButtons = [];    // buttons OUTSIDE the game rect: {id, x, y, r, action} in viewport CSS px
    this.textHandler = null;    // for TURDLE typing
    this.touches = new Map();   // pointerId -> {x0, y0, t0, action}
    this.padPrev = new Set();
    this.onAnyGesture = null;   // audio unlock hook
    this.usingTouch = false;
    this.context = 'default';
    this.menuKeys = false;      // menu key meanings without a full context switch
    this.suspended = false;     // lifecycle gate: hidden/locked/iPhone portrait
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if (this.suspended) return;
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
      if (this.suspended) return;
      const act = this.actionForKey(e.code);
      if (act) this.release(act);
    });
    const el = document.getElementById('game');
    el.addEventListener('pointerdown', (e) => {
      if (this.suspended) { e.preventDefault(); return; }
      this.activity++;
      this.usingTouch = e.pointerType === 'touch';
      this.onAnyGesture && this.onAnyGesture();
      const p = clientToLogical(e.clientX, e.clientY);
      this.pointer = { x: p.x, y: p.y, down: true };
      this.press('pointer');
      const btn = this.buttonAt(p.x, p.y);
      // A chrome button is allowed to sit close enough to the game rect that
      // its outer sliver overlaps it (run.js) — a tap landing on that sliver
      // is dispatched to #game (it's on top there), not #chrome, so without
      // this check it would fall through to the tap-to-jump convenience
      // below and fire a stray jump instead of PWR/JUMP/PAUSE.
      const chromeBtn = !btn && this.chromeButtonAt(e.clientX, e.clientY);
      if (btn || chromeBtn) {
        const action = btn ? btn.action : chromeBtn.action;
        this.touches.set(e.pointerId, { x0: p.x, y0: p.y, t0: performance.now(), action, isButton: true });
        this.press(action);
      } else {
        let action = null;
        // Tap-to-jump is a RUN-gameplay convenience only. Every other context
        // has its own tap handling (menu list-select, the hub's walk/interact
        // logic, ...), and a bare 'jump' press leaking in there is a real bug,
        // not just redundant: some of those screens read 'jump' as a
        // controller's action button (e.g. the hub's "confirm the station
        // you're standing at"), and since this fired from ANY tap anywhere on
        // screen, merely being near a station — not tapping it — was enough
        // to confirm it.
        // The playable canvas is a broad two-button surface: its left 70% is
        // jump and its right 30% is the special. That works the same for a
        // thumb and a primary mouse click, so neither device needs a second
        // gesture merely to fire a special. Right mouse remains an explicit
        // attack shortcut. All mappings stay off menus and paused runs.
        const liveRun = this.context === 'run' && !this.menuKeys;
        const liveWorkshop = this.context === 'workshop';
        const primaryCanvas = this.usingTouch || (e.pointerType === 'mouse' && e.button === 0);
        if (liveRun && primaryCanvas) action = p.x < W * 0.7 ? 'jump' : 'ability';
        else if ((liveRun || liveWorkshop) && e.pointerType === 'mouse' && e.button === 2) action = 'ability';
        this.touches.set(e.pointerId, {
          x0: p.x, y0: p.y, t0: performance.now(), action,
          // A jump started in the left zone can still become the established
          // down/right swipe. The right-zone special is already decisive.
          allowSwipe: liveRun && this.usingTouch && action === 'jump',
        });
        if (action) this.press(action);
      }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (this.suspended) return;
      const p = clientToLogical(e.clientX, e.clientY);
      this.pointer.x = p.x; this.pointer.y = p.y;
      const t = this.touches.get(e.pointerId);
      if (t && !t.isButton && t.allowSwipe) {
        const dx = p.x - t.x0, dy = p.y - t.y0;
        // Both gestures start as a tap, which in a run has already fired a
        // jump — releasing it here ends the hold rather than undoing the hop,
        // the same trade swipe-down has always made. The alternative is
        // deferring jump to pointerup, which costs hold-for-height on every
        // jump to save a hop on the occasional swipe.
        const swipe = (action) => {
          this.release(t.action);
          t.action = action;
          t.allowSwipe = false;
          this.press(action);
        };
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
      if (this.suspended) return;
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
    // #chrome sits behind #game and only shows through in the letterbox/
    // pillarbox margin (run.js), so a tap only ever reaches it there. No
    // swipe gestures or tap-to-jump fallback here — just hit a button or not.
    const chromeEl = document.getElementById('chrome');
    if (chromeEl) {
      chromeEl.addEventListener('pointerdown', (e) => {
        if (this.suspended) { e.preventDefault(); return; }
        this.activity++;
        this.usingTouch = e.pointerType === 'touch';
        this.onAnyGesture && this.onAnyGesture();
        const btn = this.chromeButtonAt(e.clientX, e.clientY);
        if (btn) {
          this.touches.set(e.pointerId, { x0: e.clientX, y0: e.clientY, t0: performance.now(), action: btn.action, isButton: true });
          this.press(btn.action);
        }
        e.preventDefault();
      });
      chromeEl.addEventListener('pointerup', endPointer);
      chromeEl.addEventListener('pointercancel', endPointer);
    }
    window.addEventListener('blur', () => this.clearAll());
  }

  actionForKey(code) {
    if (code === 'Escape') return this.context === 'run' ? 'escape' : 'back';
    if (this.context === 'run' && !this.menuKeys && (code === 'ArrowRight' || code === 'KeyD')) return 'ability';
    // The food court is both a walkable room and a small chooser. Keep its
    // vertical navigation separate from the physical jump so Space can lift
    // the avatar while Up/Down continue to move the TALK/SWAP selection.
    if (this.context === 'hub') {
      if (code === 'ArrowUp' || code === 'KeyW') return 'up';
      if (code === 'ArrowDown' || code === 'KeyS') return 'down';
      if (code === 'Space') return 'jump';
      if (code === 'Enter') return 'confirm';
    }
    if (this.menuNav()) {
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

  // What the player actually does to confirm, named for the device in their
  // hands. 'TAP/ENTER' told a phone about a key it does not have and a desktop
  // about a screen it cannot touch — on the one line of a screen that has to be
  // acted on rather than read, half the width went to the other device's input.
  //
  // Player-facing copy living in the input layer looks odd until you notice it
  // is a statement about the device, not about the screen asking. It started in
  // menus.js; the in-run ACT card needed the same word and the alternative was
  // a second copy of it that could disagree.
  confirmVerb() { return this.isTouchDevice() ? 'TAP' : 'ENTER'; }

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

  // Chrome buttons live in raw viewport CSS px (renderer.js's `chrome`
  // geometry), not the logical 480x270 space `buttonAt` tests — hence the
  // separate list. Hit-tests the button's `zone` (the whole stretch of margin
  // around its disc), not the disc itself: #chrome only ever shows in the
  // margin and only ever holds these three buttons, so the entire visible
  // canvas can safely count as "near enough" rather than requiring a precise
  // tap on the drawn circle.
  chromeButtonAt(cx, cy) {
    for (const b of this.chromeButtons) {
      const z = b.zone;
      if (z && cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) return b;
    }
    return null;
  }

  setChromeButtons(list) { this.chromeButtons = list || []; }

  setContext(context) {
    this.context = context || 'default';
    // A borrowed mapping never outlives the screen that borrowed it — leaving a
    // run mid-pause (quit, death, a state swap) lands in the new context clean.
    this.menuKeys = false;
    this.clearAll();
  }

  // Menu states call this on enter to switch key mapping into menu context and
  // drop whatever buttons the previous screen owned. No floating chrome comes
  // with it: every menu screen already both confirms and backs out straight off
  // its own content — tapping a row selects it and tapping it again confirms,
  // and each list ends in its own BACK/DONE row — so ENTER and ESC boxes only
  // ever duplicated gestures that already worked.
  setMenuButtons() {
    this.setContext('menu');
    this.setButtons([]);
  }

  // Whether the arrows/action button drive a list of choices rather than the
  // hero. True in a menu state, and true for the one screen that is a menu
  // without being a menu state: the paused run, which still needs 'run' context
  // for Escape (quit, not back) while it is up.
  menuNav() { return this.context === 'menu' || this.context === 'hub' || this.menuKeys; }

  // Borrow the menu key meanings mid-context. Held actions are dropped on every
  // flip, because a key that changes meaning between its keydown and its keyup
  // never gets released: ArrowUp held into a pause presses 'jump' and releases
  // 'up', leaving the hero jumping the moment the run resumes.
  setMenuKeys(on) {
    if (!!on === this.menuKeys) return;
    this.menuKeys = !!on;
    this.down.clear();
    this.padPrev = new Set();
  }

  press(a) {
    if (this.suspended) return;
    if (!this.down.has(a)) { this.down.add(a); this.hit.add(a); }
  }

  // Drop every held/pending input (attract mode consumes the exit press so it
  // can never navigate a menu).
  clearAll() {
    this.down.clear();
    this.hit.clear();
    if (this.up) this.up.clear();
    this.touches.clear();
    this.padPrev = new Set();
    this.pointer.down = false;
  }
  setSuspended(on) {
    on = !!on;
    if (on === this.suspended) return;
    this.suspended = on;
    this.clearAll();
  }
  release(a) { if (this.down.has(a)) { this.down.delete(a); this.up.add(a); } }

  // What a pad button means in the context that is up. One lookup for both
  // passes below (fire the action, count the activity) — they were the same
  // chain written twice, which is one edit away from disagreeing.
  padAction(i) {
    if (this.menuNav()) {
      if (i === 12) return 'up';
      if (i === 13) return 'down';
      if (i === 0) return 'confirm';
      if (i === 1) return 'back';
      // Start backs out of a menu state — but on a paused run it is the button
      // that opened the pause, so it stays the button that closes it.
      if (i === 9 && !this.menuKeys) return 'back';
    }
    if (this.context === 'run' && !this.menuKeys && i === 15) return 'ability';
    return GAMEPAD_MAP[i];
  }

  pollGamepad() {
    if (this.suspended) { this.clearAll(); return; }
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set();
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => {
        if (!b.pressed || !GAMEPAD_MAP[i]) return;
        now.add(this.padAction(i));
      });
      pad.buttons.forEach((b, i) => {
        if (!b.pressed || !GAMEPAD_MAP[i]) return;
        if (!this.padPrev.has(this.padAction(i))) this.activity++;
      });
      if (pad.axes[0] < -0.5) now.add('left');
      if (pad.axes[0] > 0.5) now.add(this.context === 'run' && !this.menuKeys ? 'ability' : 'right');
      if (pad.axes[1] < -0.5) now.add(this.menuNav() ? 'up' : 'jump');
      if (pad.axes[1] > 0.5) now.add(this.menuNav() ? 'down' : 'duck');
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
