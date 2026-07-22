// State machine with a CRT-shutter transition between states.
import { W, H, pushOverlayDraw, clearChrome } from './renderer.js';
import { Input } from './input.js';
import { drawToon } from '../sprites/toons.js';

let current = null;
let pending = null;
let fade = 0;          // 0 = clear, 1 = fully covered
let fading = 0;        // -1 fading out (revealing), +1 fading in (covering)
const TRANSITION_SPEED = 3.5; // ~0.29s closed + ~0.29s reveal: a gentle beat, not a wait
const TRANSITION_HEROES = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'raymn', 'grumpos'];
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

// Debug handles the browser harness drives the game through. Published from
// wherever `current` is assigned — including the boot state below, which skips
// the transition and so used to leave __mash_cur unset until the first screen
// change.
function publish() {
  if (typeof window === 'undefined') return;
  window.__mash_state = current.constructor.name;
  window.__mash_cur = current;
}

export function setState(next, ...args) {
  cameo = true;
  pending = { next, args };
  fading = 1;
  if (!current) { // first state: no cover animation
    current = next;
    fade = 1; fading = -1;
    next.enter && next.enter(...args);
    pending = null;
    publish();
  }
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
  Input.pollGamepad();
  if (fading !== 0) {
    fade += fading * dt * TRANSITION_SPEED;
    if (fade >= 1 && pending) {
      fade = 1;
      Input.clearAll();
      current && current.exit && current.exit();
      current = pending.next;
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
  // A tiny anticipation squash makes the bubble feel hand-animated rather
  // than geometrically perfect. Radius 320 safely covers every corner.
  const pop = Math.sin(a * Math.PI) * 0.035;
  const rx = Math.max(0.01, 320 * eased * (1 + pop));
  const ry = Math.max(0.01, 300 * eased * (1 - pop));
  if (a <= 0.002) return;

  ctx.save();
  // Pastel scallops sit behind the main plum sticker body.
  const scallops = 18;
  for (let i = 0; i < scallops; i++) {
    const th = i * Math.PI * 2 / scallops;
    const px = cx + Math.cos(th) * rx * 0.94;
    const py = cy + Math.sin(th) * ry * 0.94;
    const pr = Math.max(2, 18 * eased);
    ctx.fillStyle = i % 2 ? '#d8a4ef' : '#f2a6c8';
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#2a173b';
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.95, ry * 0.95, 0, 0, Math.PI * 2); ctx.fill();

  // Once the sticker is large enough, introduce a rotating cast cameo. Each
  // hero gets a tiny personality pose, turning loading time into a roll call.
  if (cameo && transitionHero && a > 0.52) {
    const show = Math.min(1, (a - 0.52) / 0.2);
    const bounce = Math.sin(show * Math.PI) * 5;
    const sy = 0.78 + show * 0.22;
    const pose = { kind: 'idle', grounded: true, time: a * 2.5, menu: true };
    if (transitionHero === 'lorenzo' || transitionHero === 'fernwick') pose.menuAction = 'wave';
    if (transitionHero === 'gnash') { pose.kind = 'jump'; pose.grounded = false; }
    if (transitionHero === 'b33p') pose.menuAction = 'aim';
    if (transitionHero === 'mochi') pose.float = true;
    if (transitionHero === 'chompo') pose.menuAction = 'chomp';
    if (transitionHero === 'grumpos') pose.menuAction = 'flex';
    drawToon(ctx, transitionHero, pose, cx, cy + 37 - bounce, 68 * sy, { alpha: show });
    // Uneven sticker stars keep the cameo playful, not ceremonial.
    ctx.globalAlpha = show;
    ctx.fillStyle = '#f6d33c';
    for (const [sx, sy2, s] of [[-42, -27, 4], [43, -17, 3], [-38, 28, 3], [38, 30, 4]]) {
      ctx.fillRect(cx + sx - s, cy + sy2 - 1, s * 2, 2); ctx.fillRect(cx + sx - 1, cy + sy2 - s, 2, s * 2);
    }
  }
  ctx.restore();
}

export function drawState(ctx) {
  // Cleared centrally, every frame, regardless of which state is current —
  // not left to whichever state last drew into it to clean up after itself
  // on its way out. RunState redraws its buttons right after, same frame, so
  // active gameplay sees no flicker; anything else just stays empty.
  clearChrome();
  current && current.draw && current.draw(ctx);
  if (fade > 0) {
    // Queue after every hero/effect overlay so the sticker truly covers the
    // outgoing frame. Headless tests have no overlay target, so draw directly.
    if (!pushOverlayDraw((overlayCtx) => drawTransition(overlayCtx, fade))) drawTransition(ctx, fade);
  }
}

export function isTransitioning() { return fading !== 0 || !!pending; }
