// SET PROSE: the briefing, the intro film, the finale.
//
// Three screens read a paragraph to the player over black, and all three want
// the same two things: type sized to the band it has rather than to a constant,
// and a reveal that is delivery rather than a wait. They lived in menus.js
// because the briefing got there first; the intro film moved out to its own
// module and would otherwise have imported six thousand lines for five helpers.
//
// Depends on nothing but the renderer's W and the text engine.
import { W } from './renderer.js';
import {
  drawTextCenteredForPresentation as drawTextCentered,
  wrapText,
} from './sprites.js';

// Type scale is chosen, not fixed: a line that fits a laptop at scale 1 is
// caption-sized in a hand — and the screens that read this way spend most of
// their height on black. So: pick the largest step whose wrapped block fits the
// band, and centre it there.
export const TYPE_STEPS = [2, 1.75, 1.5, 1.25, 1];
export const TYPE_LINE_H = 11; // per unit of scale

// Wrapped lines carrying the character offset each starts at, so a typewriter
// reveals into a layout that never reflows underneath itself. Wrapping the
// PARTIAL string every frame — what these screens used to do — walked every
// line below down the screen as the one above filled in.
export function typeLines(text, maxW, scale, from = 0, maxLines = 12) {
  return wrapText(text, maxW, scale, maxLines).map((t) => {
    const line = { text: t, from };
    from += t.length + 1; // the wrap ate exactly one space
    return line;
  });
}

// `maxLines` is for the lines that turn on their last word. Fitting by height
// alone, the finale's closer took the biggest step that merely FIT the band and
// wrapped to "...THE POWER STRIP DOES / NOT." — a greedy break that strands the
// punchline on a line of its own and reads as a bug rather than as timing.
// Capping the line count makes it step down until the sentence holds together.
export function fitProse(text, maxW, band, steps = TYPE_STEPS, maxLines = Infinity) {
  let block = null;
  for (const scale of steps) {
    const lines = typeLines(text, maxW, scale);
    block = { lines, scale, height: lines.length * TYPE_LINE_H * scale };
    if (block.height <= band && lines.length <= maxLines) break;
  }
  return block;
}

// `budget` characters of a fitProse block, centred in [top, top + band].
// budget null shows the whole thing. For a block of prose, prefer the cascade
// below — a per-character crawl only reads as delivery when the unit is one
// sentence, which on these screens means the finale and nothing else.
export function drawProse(ctx, block, top, band, color, budget = null) {
  const y0 = top + Math.max(0, (band - block.height) / 2);
  block.lines.forEach((line, i) => {
    const shown = budget == null ? line.text : line.text.slice(0, Math.max(0, budget - line.from));
    if (shown) drawTextCentered(ctx, shown, W / 2, y0 + i * TYPE_LINE_H * block.scale, color, block.scale);
  });
}

// A PARAGRAPH ARRIVES A LINE AT A TIME, NOT A LETTER AT A TIME.
//
// Nobody reads a block while it assembles — the eye wants the whole shape — so
// a character crawl across eight lines is not delivery, it is a wait, on
// screens that are read before every stage and again on every retry. And a
// centred line drawn half-finished walks sideways as it fills, which at these
// sizes was the loudest movement on the screen.
//
// So each line fades and drops the last of its rise into place a beat behind
// the one above: the whole memo is standing in well under a second, every line
// is readable the instant it appears, and the fiction is right — a memo comes
// out of a machine a line at a time.
export const CASCADE_STAGGER = 0.07;
export const CASCADE_FADE = 0.14;
export const CASCADE_RISE = 2.5; // units of the block's own scale
export function cascadeAt(t, i) {
  const k = Math.max(0, Math.min(1, (t - i * CASCADE_STAGGER) / CASCADE_FADE));
  return { alpha: k, dy: (1 - k) * (1 - k) * CASCADE_RISE };
}
export function cascadeDone(t, n) { return t >= Math.max(0, n - 1) * CASCADE_STAGGER + CASCADE_FADE; }
// Long enough to have landed every line of anything this game sets.
export const CASCADE_ALL = 99;

// How long a full cascade actually takes, in seconds, for a block of `n` lines.
// The intro used to reach for CASCADE_ALL and scale into it, which meant the
// stagger it was paying for never played: `beatT / 0.42 * 99` puts the reveal
// clock past the last line's landing within one frame of the beat starting.
// A caller that wants the cascade to READ hands cascadeAt a clock in SECONDS
// and uses this to know when it has finished.
export function cascadeSeconds(n) {
  return Math.max(0, n - 1) * CASCADE_STAGGER + CASCADE_FADE;
}

export function drawCascade(ctx, block, top, band, color, t, opacity = 1) {
  const y0 = top + Math.max(0, (band - block.height) / 2);
  ctx.save();
  block.lines.forEach((line, i) => {
    const { alpha, dy } = cascadeAt(t, i);
    if (alpha <= 0) return;
    ctx.globalAlpha = opacity * alpha;
    drawTextCentered(ctx, line.text, W / 2, y0 + (i * TYPE_LINE_H + dy) * block.scale, color, block.scale);
  });
  ctx.restore();
}
