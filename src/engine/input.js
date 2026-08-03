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

// Where the playable canvas splits into its two broad thumb zones during a run:
// everything left of this fraction is JUMP, everything right of it is the
// special. Exported because a screen that TEACHES the split has to draw the
// same line the handler tests against — training's touch zone card measured its
// own 70% for one build, which is the version of this that goes wrong quietly.
export const TOUCH_JUMP_FRAC = 0.7;

// Telling a tap apart from the start of a swipe. Both are one finger landing on
// the glass, so the playable canvas holds the tap's action for a moment instead
// of firing it on contact — see resolveTouches.
//
// The old behaviour was to fire on contact and convert afterwards, which meant
// every swipe down ALSO jumped (or, from the power side, spent the special) on
// its way to the duck. You cannot un-hop a hop.
//
// The wait is short and usually invisible: a still finger commits after
// TAP_HOLD_MS, and a finger lifted sooner than that commits on the lift, which
// is what nearly every real tap does. Only a finger that lands and then slides
// is made to wait, and it waits only while it is still travelling — TAP_STILL_MS
// after it settles, whatever it is over becomes a tap. TAP_MAX_MS is the
// backstop for a finger that never stops crawling, and sits inside the 300ms
// window the swipe tests themselves use.
const TAP_HOLD_MS = 50;
const TAP_SLIP = 5;        // logical px of drift that still reads as a tap
const TAP_STILL_MS = 60;
const TAP_MAX_MS = 260;
// A very quick lift still needs enough held frames to read as an intentional
// short jump. Swipe arbitration delays the press until pointerup; replaying a
// 5-20ms contact literally then lets variable-jump cut it almost immediately.
// This floor applies only to lifted jump taps. A finger that remains down still
// commits and releases in real time, and ability/duck gestures are unchanged.
const TAP_MIN_JUMP_HOLD_MS = 100;
// The longest a lifted tap's hold is replayed for. A finger that sat there for
// a second and then lifted has already had its jump committed by the timer
// above, so this only ever caps the odd slow tap that resolved late.
const TAP_MAX_HOLD_MS = 250;

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
    this.holds = [];            // [{action, at}] releases owed to lifted taps
    this.padPrev = new Set();
    this.onAnyGesture = null;   // audio unlock hook
    this.usingTouch = false;
    this.swipeLeft = false;     // menu back gesture, consumed by the current state
    this.context = 'default';
    this.menuKeys = false;      // menu key meanings without a full context switch
    this.suspended = false;     // lifecycle gate: hidden/locked/iPhone portrait
    // A screen that reads up/down as something other than "move the cursor one
    // row" opts out: a wheel tick synthesises a press with no matching release,
    // which a list consumes in a frame and a continuous control does not.
    this.wheelNav = true;
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
      this.swipeLeft = false;
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
        if (liveRun && primaryCanvas) action = p.x < W * TOUCH_JUMP_FRAC ? 'jump' : 'ability';
        else if ((liveRun || liveWorkshop) && e.pointerType === 'mouse' && e.button === 2) action = 'ability';
        // A tap started anywhere on the playable canvas can become the
        // established down/right swipe — both zones, not just the jump side.
        // The right zone used to be excluded on the grounds that its special is
        // "already decisive", but that made DUCK a thing you could only do with
        // the left 70% of the glass: a thumb resting over the power side, which
        // is exactly where a one-handed player's thumb lives, could not duck at
        // all. Ducking is a defensive move and has to be available under
        // whichever thumb is already down.
        const gesture = liveRun && this.usingTouch && !!action;
        this.touches.set(e.pointerId, {
          x0: p.x, y0: p.y, t0: performance.now(), action,
          x: p.x, y: p.y,
          // Held rather than fired (see resolveTouches). A finger landing is
          // the same event for a tap and for the start of a swipe, so on the
          // playable canvas the action waits until the gesture has said which
          // it is. Everywhere else — mouse, menus — nothing is ambiguous and
          // the press goes out on contact as it always has.
          pending: gesture,
          allowSwipe: gesture,
          downT: 0,   // last moment this finger was measurably travelling down
        });
        if (action && !gesture) this.press(action);
      }
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (this.suspended) return;
      const p = clientToLogical(e.clientX, e.clientY);
      this.pointer.x = p.x; this.pointer.y = p.y;
      const t = this.touches.get(e.pointerId);
      if (t && !t.isButton) { t.x = p.x; t.y = p.y; }
      // Menus use a leftward touch swipe as their Back gesture. Keep it out of
      // gameplay and the hub (where a horizontal drag steers the player), and
      // let the jukebox visualizer consume the same back press as a preset
      // browse gesture before it can wake the screen.
      if (t && !t.isButton && this.usingTouch && (this.context === 'menu' || this.menuKeys)
        && !t.menuSwipeBack) {
        const dx = p.x - t.x0, dy = p.y - t.y0;
        if (dx <= -24 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          t.menuSwipeBack = true;
          this.swipeLeft = true;
          this.press('back');
        }
      }
      if (t && !t.isButton && t.allowSwipe) {
        const dx = p.x - t.x0, dy = p.y - t.y0;
        // A finger measurably on its way down is a finger that has not finished
        // saying what it wants, so resolveTouches keeps holding its tap action
        // while this keeps being stamped.
        if (t.pending && dy > TAP_SLIP) t.downT = performance.now();
        // A swipe that resolves takes the touch outright. On a pending touch
        // the tap action was never fired, so there is nothing to release and
        // nothing to undo — which is the entire point of holding it: a swipe
        // down used to hop first and duck second, and a swipe out of the power
        // zone used to spend the special on the way past.
        const swipe = (action) => {
          if (action === t.action && !t.pending) return; // already firing it
          if (!t.pending) this.release(t.action);
          t.action = action;
          t.pending = false;
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
      const now = performance.now();
      const t = this.touches.get(e.pointerId);
      if (t) {
        // A finger that lifts before its gesture resolved was a tap after all.
        // It fires here — and its release is pushed out by the time the finger
        // was actually down, so the hold the player performed is preserved,
        // merely shifted later. A jump has a small floor: otherwise the swipe
        // arbitration turns an ultra-quick tap into a barely visible hop.
        //
        // Without that, press and release land in the same frame and the jump
        // is cut on the frame it starts: hold-for-height reads "not held" on
        // its first update and a tap produces a 1.5px hop. Longer taps still
        // preserve the player's chosen hold duration.
        if (t.pending && t.action) {
          t.pending = false;
          this.press(t.action);
          const heldMs = Math.min(now - t.t0, TAP_MAX_HOLD_MS);
          this.holdUntil(t.action, t.action === 'jump'
            ? Math.max(TAP_MIN_JUMP_HOLD_MS, heldMs)
            : heldMs);
          this.touches.delete(e.pointerId);
          if (this.touches.size === 0) { this.pointer.down = false; this.release('pointer'); }
          return;
        }
        if (t.action) this.release(t.action);
        else if (this.usingTouch) this.release('jump');
        if (t.menuSwipeBack) this.release('back');
        this.touches.delete(e.pointerId);
      }
      if (this.touches.size === 0) { this.pointer.down = false; this.release('pointer'); }
    };
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    // Nothing the finger does on the glass may be read as "acting on content":
    // no right-click / long-press callout menu, no drag of the canvas as an
    // image, no selection (which on iOS is what raises the magnifier loupe over
    // the art). The CSS in template.html says the same thing declaratively;
    // these are the belt to its braces, since a long press that begins on the
    // canvas but drifts is arbitrated by the events, not the style.
    const noNativeCanvasGestures = (target) => {
      // Pointer Events drive the game, but iOS still runs its native Touch and
      // Gesture recognisers in parallel. CSS alone does not reliably stop the
      // text/image loupe after a long stationary press, so cancel those native
      // recognisers synchronously on the touched canvas as well. These must be
      // explicitly non-passive or Safari is allowed to ignore preventDefault.
      // Restate the critical styles inline too: these canvases are created by
      // the install gate at runtime, and this keeps the opt-out attached to the
      // actual element even if shell selectors are reorganised later.
      target.style.touchAction = 'none';
      target.style.webkitTouchCallout = 'none';
      target.style.webkitUserSelect = 'none';
      target.style.userSelect = 'none';
      target.draggable = false;
      const prevent = (e) => e.preventDefault();
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
        target.addEventListener(type, prevent, { passive: false });
      }
      for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
        target.addEventListener(type, prevent, { passive: false });
      }
      target.addEventListener('dblclick', prevent);
      target.addEventListener('contextmenu', (e) => e.preventDefault());
      target.addEventListener('selectstart', (e) => e.preventDefault());
      target.addEventListener('dragstart', (e) => e.preventDefault());
    };
    noNativeCanvasGestures(el);
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
      noNativeCanvasGestures(chromeEl);
    }
    // Scroll wheel navigates lists in menu / hub / paused contexts.
    window.addEventListener('wheel', (e) => {
      if (this.suspended) return;
      if (!this.wheelNav) return;
      if (!this.menuNav()) return;
      const ticks = Math.min(5, Math.ceil(Math.abs(e.deltaY) / 40));
      const action = e.deltaY > 0 ? 'down' : 'up';
      for (let i = 0; i < ticks; i++) { this.release(action); this.press(action); }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('blur', () => this.clearAll());
  }

  actionForKey(code) {
    if (code === 'Escape') return this.context === 'run' ? 'escape' : 'back';
    if (this.context === 'run' && !this.menuKeys && (code === 'ArrowRight' || code === 'KeyD')) return 'ability';
    // The food court is both a walkable room and a small chooser. Keep its
    // vertical navigation separate from the physical jump so Space can lift
    // the avatar while Up/Down stay reserved for its chip selection.
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
  // and each list ends in its own BACK row — so ENTER and ESC boxes only
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
    // A fresh press of an action owns it outright: any release still owed to a
    // tap that has already lifted is dropped, not applied over the top.
    if (this.holds.length) this.holds = this.holds.filter((h) => h.action !== a);
    if (!this.down.has(a)) { this.down.add(a); this.hit.add(a); }
  }

  // Drop every held/pending input (attract mode consumes the exit press so it
  // can never navigate a menu).
  clearAll() {
    this.down.clear();
    this.hit.clear();
    if (this.up) this.up.clear();
    this.touches.clear();
    this.holds = [];
    this.padPrev = new Set();
    this.pointer.down = false;
    this.swipeLeft = false;
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
  // Commit any held tap whose gesture has now declared itself. A finger still
  // sliding downward is left pending — it may yet cross the swipe threshold and
  // become a duck, and firing its tap action in the meantime is the double
  // input this whole mechanism exists to remove.
  //
  // Called at the TOP of the frame (states.updateState, beside the gamepad
  // poll), for the same reason the gamepad is polled there: a press has to be
  // made before the frame's states read it. Doing this from endFrame instead
  // looks equivalent and is not — states.js calls endFrame a second time as a
  // backstop after every state update, so a press made in the first call was
  // cleared by the second and no update ever saw it. A held finger simply
  // never jumped.
  // Keep an action held for `ms` after the finger that fired it has already
  // lifted (see endPointer). A later press of the same action supersedes the
  // schedule rather than stacking with it — otherwise a stale release would
  // land in the middle of the next jump and cut that one short instead.
  holdUntil(action, ms) {
    this.holds = this.holds.filter((h) => h.action !== action);
    if (ms > 0) this.holds.push({ action, at: performance.now() + ms });
    else this.release(action);
  }

  resolveTouches() {
    if (this.holds.length) {
      const t = performance.now();
      const due = this.holds.filter((h) => h.at <= t);
      this.holds = this.holds.filter((h) => h.at > t);
      for (const h of due) this.release(h.action);
    }
    if (this.touches.size === 0) return;
    const now = performance.now();
    for (const t of this.touches.values()) {
      if (!t.pending) continue;
      const age = now - t.t0;
      if (age < TAP_HOLD_MS) continue;
      if (t.downT && now - t.downT < TAP_STILL_MS && age < TAP_MAX_MS) continue;
      t.pending = false;
      if (t.action) this.press(t.action);
    }
  }

  endFrame() { this.hit.clear(); this.up.clear(); this.swipeLeft = false; }
}

export const Input = new InputSys();
