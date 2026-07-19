// State machine with a pixel-dissolve transition between states.
import { W, H } from './renderer.js';
import { Input } from './input.js';
import { drawTextCentered } from './sprites.js';

let current = null;
let pending = null;
let fade = 0;          // 0 = clear, 1 = fully covered
let fading = 0;        // -1 fading out (revealing), +1 fading in (covering)

export function setState(next, ...args) {
  pending = { next, args };
  fading = 1;
  if (!current) { // first state: no cover animation
    current = next;
    fade = 1; fading = -1;
    next.enter && next.enter(...args);
    pending = null;
  }
}

export function currentState() { return current; }

export function updateState(dt) {
  if (fading !== 0) {
    fade += fading * dt * 4;
    if (fade >= 1 && pending) {
      fade = 1;
      Input.clearAll();
      current && current.exit && current.exit();
      current = pending.next;
      current.enter && current.enter(...pending.args);
      if (typeof window !== 'undefined') window.__mash_state = current.constructor.name;
      pending = null;
      fading = -1;
    } else if (fade <= 0) {
      fade = 0; fading = 0;
    }
  }
  current && current.update && current.update(dt);
}

export function drawState(ctx) {
  current && current.draw && current.draw(ctx);
  // Shared touch-only menu control, identical on every menu screen.
  if (Input.usingTouch) {
    for (const b of Input.buttons.filter((button) => button.global)) {
      ctx.fillStyle = 'rgba(11,11,20,0.9)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#48e0c8';
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      drawTextCentered(ctx, b.label, b.x + b.w / 2, b.y + 10, '#48e0c8');
    }
  }
  if (fade > 0) {
    // chunky 8px dissolve columns
    ctx.fillStyle = '#000';
    const cell = 10;
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        const thresh = ((cx * 7 + cy * 13) % 16) / 16;
        if (fade > thresh) ctx.fillRect(cx * cell, cy * cell, cell, cell);
      }
    }
  }
}

export function isTransitioning() { return fading !== 0 || !!pending; }
