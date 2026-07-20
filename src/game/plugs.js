// Shared rendering for a stage's three plugs, used by the in-run HUD and the
// stage select list. Icons rather than letters: M/C/T needed a legend to be
// readable at all, and a toaster only reads as a toaster when it looks like one.
import { drawProp } from '../sprites/props.js';

// mission = flip the breaker, challenge = the optional extra, toaster = the appliance
export const PLUG_ICONS = ['switch', 'goldTrophy', 'appliance'];
export const PLUG_NAMES = ['MISSION', 'CHALLENGE', 'TOASTER'];

const BANKED = '#f6d33c';   // earned in an earlier run — yours for good
const LIVE = '#48c848';     // on track this run, not banked until the run ends
const EMPTY = '#3a3a48';

// Icon brightness, not just frame colour, carries banked/live/empty. The frame
// is a third-of-a-pixel hairline, so when a live icon also drew at full alpha
// the row read as "you have this" — a no-damage challenge is on track from the
// first frame, and its pip looked identical to one already banked.
export const ALPHA_BANKED = 1;
export const ALPHA_LIVE = 0.5;
export const ALPHA_EMPTY = 0.22;

export const PLUG_ROW_W = (size = 11) => size * 3 + 4;

// Frame hairline weight. Exported so tests can pick the three frame strokes out
// of the draw stream by width without hardcoding a number that gets art-tuned.
export const PLUG_FRAME_LW = 0.35;

// Built by hand rather than via ctx.roundRect, which the headless test stub
// and older canvas implementations don't provide.
function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// banked/live are [mission, challenge, toaster] boolean triples. Unearned plugs
// keep their icon at low alpha so the row always reads as three fixed slots.
export function drawPlugRow(ctx, x, y, banked, live = [false, false, false], size = 11) {
  for (let i = 0; i < 3; i++) {
    const bx = x + i * (size + 2);
    const has = !!(banked && banked[i]);
    const now = !has && !!(live && live[i]);
    // Rounded frame at a third of a game pixel: the canvas is 480x270 upscaled
    // ~5x, so even a 1px ring read as a heavy border that fought the icon
    // inside it. Radius stays a soft nick off the corners — at a third of the
    // box the slots read as squircles rather than pills. save/restore keeps the
    // hairline from leaking — a stale lineWidth once made this row render at a
    // different weight on each screen.
    ctx.save();
    ctx.lineWidth = PLUG_FRAME_LW;
    ctx.strokeStyle = has ? BANKED : now ? LIVE : EMPTY;
    ctx.fillStyle = '#181820';
    roundRectPath(ctx, bx + 0.2, y + 0.2, size - 0.4, size - 0.4, size * 0.22);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = has ? ALPHA_BANKED : now ? ALPHA_LIVE : ALPHA_EMPTY;
    drawProp(ctx, PLUG_ICONS[i], bx + 1.5, y + 1.5, size - 3, size - 3);
    ctx.globalAlpha = prevAlpha;
  }
}
