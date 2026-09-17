// State machine with a CRT-shutter transition between states.
import { W, H, pushOverlayDraw, beginChromeFrame, commitChromeFrame, setPresentationMode } from './renderer.js';
import { Input } from './input.js';
import { drawToon, transitionCameoAction } from '../sprites/toons.js';

let current = null;
let pending = null;
let fade = 0;          // 0 = clear, 1 = fully covered
let fading = 0;        // -1 fading out (revealing), +1 fading in (covering)
let transitionStyle = 'shutter';
const TRANSITION_SPEED = 3.5; // ~0.29s closed + ~0.29s reveal: a gentle beat, not a wait
const TRANSITION_HEROES = ['lorenzo', 'rusty', 'fernwick', 'b33p', 'clara', 'kiko', 'ramon', 'grumpos'];
// Null until the game knows who you are. The shutter used to open on a hero
// from the very first transition — title, difficulty, the intro panels — which
// spoiled a cast the intro is in the middle of introducing, and presented one of
// them as "yours" before you had any. No hero, no cameo; the sticker just closes
// and opens.
let transitionHero = null;

// The cameo used to be a random hero every transition, which was fine when the
// hub avatar was also arbitrary. Now that you carry one specific hero between
// the concourse and the stage, a random face on the shutter contradicts the one
// you are actually playing — so the transition shows whoever that is.
export function setTransitionHero(id) {
  if (TRANSITION_HEROES.includes(id)) transitionHero = id;
}

let cameo = true;

// Presentation is selected while the shutter fully covers the old screen and
// before the destination measures any height-dependent layout. This keeps a
// portrait briefing/results screen from entering with the landscape constants
// and then jumping a frame later when lifecycle publishes it.
function preparePresentation(next) {
  const mode = next?.constructor?.portraitMode;
  if (mode === 'frame') setPresentationMode('portrait');
  else if (mode !== 'stretch') setPresentationMode('landscape');
}

// Debug handles the browser harness drives the game through. Published from
// wherever `current` is assigned — including the boot state below, which skips
// the transition and so used to leave __mash_cur unset until the first screen
// change.
function publish() {
  if (typeof window === 'undefined') return;
  window.__mash_state = current.constructor.name;
  window.__mash_cur = current;
  // Orientation policy depends on the active screen. Recompute immediately
  // after a state transition so the jukebox can enter portrait without
  // waiting for another resize/orientation event, and the lock returns when
  // leaving it.
  window.__mash_lifecycle?.apply?.();
}

// THE CAMEO'S OWN CLOCK, and the reason it needs one.
//
// The hero on the sticker used to take his `time` from the transition AMOUNT, which
// is not a clock: it runs 0 -> 1 as the shutter closes and 1 -> 0 as it opens. So the
// pose ran forwards for the cover and then BACKWARDS for the reveal — a hero who
// waved, then un-waved — and sat still at the turnaround, which is the moment he is
// biggest and most looked at.
//
// Seconds, accumulated, reset at the top of each transition so every cameo starts
// from the same pose rather than from wherever the last one happened to stop.
let cameoClock = 0;

export function setState(next, ...args) {
  cameo = true;
  transitionStyle = 'shutter';
  pending = { next, args };
  fading = 1;
  cameoClock = 0;
  if (!current) { firstState(next, args); }
}

// A quiet full-frame fade for hand-offs that should not borrow the arcade
// shutter's character. The Lorenzo portrait shortcut uses this to dissolve
// directly into the Jukebox.
export function setStateFade(next, ...args) {
  cameo = false;
  transitionStyle = 'fade';
  pending = { next, args };
  fading = 1;
  if (!current) { firstState(next, args); }
}

// Boot installs its screen outright — no cover and no reveal. This used to open
// on the shutter (fade 1, fading -1), which read as the game irising onto a
// title it had not earned yet; every later trip to the title still gets the
// full shutter. It also settles an orientation bug: a running transition holds
// the rotate overlay off on dev builds (allowPortraitNow in main.js), so the
// boot reveal was long enough to show a portrait phone the letterboxed title
// before the lock arrived. With nothing animating at boot there is no window.
function firstState(next, args) {
  current = next;
  fade = 0; fading = 0;
  preparePresentation(next);
  next.enter && next.enter(...args);
  pending = null;
  publish();
}

// Same shutter, no cast cameo. For the run-to-results hand-off: the results
// screen opens on the whole team celebrating, so a single hero waving one beat
// earlier steps on that reveal.
export function setStateNoCameo(next, ...args) {
  setState(next, ...args);
  cameo = false;
}

export function currentState() { return current; }

export function updateState(dt) {
  // Poll before any state consumes pressed actions. Polling at the tail of a
  // state update cleared one-frame gamepad presses before they could be read.
  // Held touches commit here for the same reason: a tap whose gesture has just
  // resolved presses now, so this frame's update reads it. (Doing it from
  // endFrame put the press between the state's own call and the backstop below,
  // which cleared it again.)
  Input.pollGamepad();
  Input.resolveTouches();
  if (fading !== 0) {
    cameoClock += dt;
    fade += fading * dt * TRANSITION_SPEED;
    if (fade >= 1 && pending) {
      fade = 1;
      Input.clearAll();
      current && current.exit && current.exit();
      current = pending.next;
      preparePresentation(current);
      current.enter && current.enter(...pending.args);
      publish();
      pending = null;
      fading = -1;
    } else if (fade <= 0) {
      fade = 0; fading = 0;
    }
  }
  // Once a destination is queued, freeze the outgoing screen. This prevents
  // a held confirm/pointer press from scheduling another state while the
  // shutter is closing. The incoming state updates during its reveal.
  //
  // The finally is a backstop, not decoration. Every state ends its own update
  // with Input.endFrame(), so a throw partway through one skips it — and an
  // uncleared press-set means the same key reads as pressed on the next frame,
  // which re-throws, which skips endFrame again. That turns any one-frame error
  // into a permanently unresponsive screen instead of a single dropped frame
  // (it did exactly that to the food court once already). endFrame just clears
  // two Sets, so calling it twice in a normal frame costs nothing.
  if (!pending && current && current.update) {
    try {
      current.update(dt);
    } finally {
      Input.endFrame();
    }
  }
}

function drawTransition(ctx, amount) {
  const a = Math.max(0, Math.min(1, amount));
  const eased = a * a * (3 - 2 * a);
  const cx = W / 2, cy = H / 2;
  // SIZED TO THE FRAME, not to a remembered one.
  //
  // These were 320 and 300, which do "safely cover every corner" of a 480x270
  // picture and nothing else. H is a live binding: in phone portrait the renderer
  // publishes a frame around 1200 units tall, so the sticker went on being a
  // landscape-shaped 640x600 blob in the middle of it — it covered the width,
  // stopped well short of the top and bottom, and the room stayed visible around a
  // transition whose entire job is to cover the room.
  //
  // Expressed against the frame's own half-diagonal instead, which is the smallest
  // radius that can reach a corner. The two ratios are the old numbers divided by
  // the landscape half-diagonal (275.363), so at 480x270 this is the same sticker
  // it has always been, to three decimal places — and at any other shape it is the
  // sticker that shape needs.
  const unit = Math.hypot(W, H) / 2;
  const pop = Math.sin(a * Math.PI) * 0.035;
  const rx = Math.max(0.01, unit * 1.16210 * eased * (1 + pop));
  const ry = Math.max(0.01, unit * 1.08947 * eased * (1 - pop));
  if (a <= 0.002) return;

  ctx.save();
  // Pastel scallops sit behind the main plum sticker body.
  const scallops = 18;
  for (let i = 0; i < scallops; i++) {
    const th = i * Math.PI * 2 / scallops;
    const px = cx + Math.cos(th) * rx * 0.94;
    const py = cy + Math.sin(th) * ry * 0.94;
    // Scalloped to the same proportion, or a taller frame gets a bigger sticker
    // with the same little bumps on it and the edge reads as plain.
    const pr = Math.max(2, unit * 0.06537 * eased);
    ctx.fillStyle = i % 2 ? '#d8a4ef' : '#f2a6c8';
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#2a173b';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2); ctx.fill();

  // Once the sticker is large enough, introduce a rotating cast cameo. Each
  // hero gets a tiny personality pose, turning loading time into a roll call.
  if (cameo && transitionHero && a > 0.52) {
    const show = Math.min(1, (a - 0.52) / 0.2);
    const bounce = Math.sin(show * Math.PI) * unit * 0.01816;
    const sy = 0.78 + show * 0.22;
    // Real seconds, so the idle cycle runs at its authored rate and only ever
    // forwards. `menu: true` is the flourish mode every non-gameplay caller uses.
    const pose = { kind: 'idle', grounded: true, time: cameoClock, menu: true };
    // A little life of its own on top of whatever the hero's own beat is doing: a
    // slow breath, and a touch of weight shifting. Small on purpose — this is a
    // loading screen, not a performance, and the pop-in bounce below is still the
    // gesture that introduces him.
    const breathe = Math.sin(cameoClock * 2.4) * unit * 0.0045;
    const sway = Math.sin(cameoClock * 1.3) * 0.012;
    pose.lean = sway;
    Object.assign(pose, transitionCameoAction(transitionHero));
    // The cameo belongs to the sticker, so it is measured in the same unit. Left at
    // a flat 68 it was a correctly-sized hero on a landscape sticker and a doll lost
    // in the middle of a portrait one.
    drawToon(ctx, transitionHero, pose, cx, cy + unit * 0.13437 - bounce - breathe,
      unit * 0.24695 * sy, { alpha: show });
    // Uneven sticker stars keep the cameo playful, not ceremonial.
    ctx.globalAlpha = show;
    ctx.fillStyle = '#f6d33c';
    // Stars too: their offsets are where they sit ON the sticker, not where they sit
    // in a 480x270 picture.
    const u = unit / 275.363;
    for (const [sx, sy2, s] of [[-42, -27, 4], [43, -17, 3], [-38, 28, 3], [38, 30, 4]]) {
      const [ox, oy, r] = [sx * u, sy2 * u, Math.max(2, s * u)];
      ctx.fillRect(cx + ox - r, cy + oy - 1, r * 2, 2);
      ctx.fillRect(cx + ox - 1, cy + oy - r, 2, r * 2);
    }
  }
  ctx.restore();
}

export function drawState(ctx, renderAlpha = 0) {
  // Chrome (touch buttons) is committed centrally, every frame, regardless of
  // which state is current. A state that wants buttons declares them via
  // paintChrome during its draw; commitChromeFrame then repaints only if their
  // signature changed since last frame (an empty frame clears once, then
  // no-ops), so active gameplay sees no flicker and idle screens no churn.
  beginChromeFrame();
  current && current.draw && current.draw(ctx, renderAlpha);
  commitChromeFrame();
  if (fade > 0) {
    if (transitionStyle === 'fade') {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      return;
    }
    // Queue after every hero/effect overlay so the sticker truly covers the
    // outgoing frame. Headless tests have no overlay target, so draw directly.
    if (!pushOverlayDraw((overlayCtx) => drawTransition(overlayCtx, fade))) drawTransition(ctx, fade);
  }
}

export function isTransitioning() { return fading !== 0 || !!pending; }
