// AUDIO SYNC calibration: a tap test that measures the whole chain at once.
//
// WHY A TAP TEST AND NOT A NUMBER FROM THE BROWSER. Every rhythm stage places
// its lane, judges its presses and schedules its beat cues off one clock, and
// that clock leans on ctx.outputLatency to know how far the ear is behind the
// renderer. On a wired output that figure is honest. On Bluetooth it is a
// guess and usually a bad one: macOS and PipeWire report the whole route,
// Android Chrome and Windows report the mixer buffer and say nothing about the
// codec, the radio and the sink, which between them are worth a fifth of a
// second. The on-beat window is ±0.18 of a beat — 87ms at the rhythm bank's
// tempo — so an unreported fifth of a second is not a scoring nuisance, it is
// every jump landing in the bar it was supposed to clear.
//
// Nothing in the browser will tell us the true number, and nothing will even
// tell us whether the output is Bluetooth. What CAN be measured is a person
// hearing a click and tapping: that measurement includes the codec, the radio,
// the sink, the touchscreen and the operating system's own delays, because it
// is taken at the two ends of the whole chain. Hence sixteen clicks and a
// median.
//
// THE MEASUREMENT IS TAKEN WITH THE PLAYER'S EXISTING OFFSET EXCLUDED — the
// residuals are against Audio.reportedLatencySec(), never heardLatencySec() —
// so a second calibration is a fresh reading rather than a correction stacked
// on a correction. APPLY therefore replaces the setting, and re-calibrating
// with a bad number already in place gives the same answer as calibrating with
// none.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { clampAudioSyncMs } from '../engine/save.js';
import { drawText, drawTextCentered, textWidth, drawMenuRow, textYForMid } from '../engine/sprites.js';

// 120 BPM: half a second a click. Fast enough that sixteen of them is eight
// seconds of the player's time, slow enough that nobody is rushed into
// anticipating, which is the failure mode that biases the whole reading.
export const CAL_BPM = 120;
export const CAL_COUNT = 16;
// The first four are the count-in every musician expects, and they are thrown
// away: the earliest taps are the least settled and would drag the median.
export const CAL_COUNT_IN = 4;
export const CAL_LEAD_SEC = 1.0;
// How far from a click a tap may land and still be counted as that click's.
// Half the gap between clicks, so a tap can never be ambiguous between two.
export const CAL_WINDOW_SEC = 0.25;
export const CAL_MIN_TAPS = 8;
export const CAL_IQR_WARN_MS = 80;
// Above this, on a desktop, the honest advice is a cable rather than a number.
export const CAL_LARGE_MS = 100;
export const CAL_SETTLE_SEC = 0.6;

const SCORED = CAL_COUNT - CAL_COUNT_IN;

/**
 * A shared origin for the two clocks, which the engine otherwise never relates.
 *
 * Taps arrive on performance.now(); clicks are scheduled on ctx.currentTime.
 * Neither can be converted to the other without a moment where both were read.
 * Three samples, keeping the one whose two performance reads are closest
 * together: currentTime advances in render quanta and a sample taken across a
 * long gap could be stale by the whole quantum.
 */
export function correlateClocks(ctx) {
  let best = null;
  for (let i = 0; i < 3; i++) {
    const a = performance.now();
    const ctx0 = ctx.currentTime;
    const b = performance.now();
    if (!best || b - a < best.spread) best = { spread: b - a, perf0: (a + b) / 2, ctx0 };
  }
  return { perf0: best.perf0, ctx0: best.ctx0 };
}

/** A performance.now() stamp, on the audio clock. */
export function tapCtxTime(corr, perfMs) {
  return corr.ctx0 + (perfMs - corr.perf0) / 1000;
}

/**
 * Match taps to clicks and return how late each one was, in seconds.
 *
 * `reportedSec` is what the browser claims, so a residual is what the browser
 * FAILED to account for — exactly the quantity AUDIO SYNC holds. One tap per
 * click and the first one wins: a double-tap is a person correcting themselves,
 * and the correction is not the reaction being measured. Count-in clicks are
 * matched (so a tap on one cannot be stolen by the first scored click) and then
 * dropped.
 */
export function assignTaps(tapCtxTimes, clickTimes, reportedSec = 0) {
  const byClick = new Array(clickTimes.length).fill(undefined);
  for (const tap of tapCtxTimes) {
    let best = -1;
    let bestGap = Infinity;
    for (let i = 0; i < clickTimes.length; i++) {
      const gap = Math.abs(tap - (clickTimes[i] + reportedSec));
      if (gap < bestGap) { bestGap = gap; best = i; }
    }
    if (best < 0 || bestGap > CAL_WINDOW_SEC) continue;
    if (byClick[best] !== undefined) continue;
    byClick[best] = tap - (clickTimes[best] + reportedSec);
  }
  return byClick.slice(CAL_COUNT_IN).filter((r) => r !== undefined);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[rank];
}

function median(sorted) {
  if (!sorted.length) return 0;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The reading. MEDIAN, not mean: one tap missed and recovered late is worth
 * a hundred milliseconds on a mean of twelve, and the median does not care.
 * The interquartile range is the honesty check — a wide spread means the player
 * was not really following the clicks, and a median of noise is still noise.
 */
export function calibrationResult(residualsSec) {
  const sorted = [...residualsSec].sort((a, b) => a - b);
  const medianMs = median(sorted) * 1000;
  const iqrMs = (percentile(sorted, 0.75) - percentile(sorted, 0.25)) * 1000;
  return {
    count: sorted.length,
    medianMs,
    iqrMs,
    suggestedMs: clampAudioSyncMs(medianMs),
    enough: sorted.length >= CAL_MIN_TAPS,
    unsteady: iqrMs > CAL_IQR_WARN_MS,
  };
}

const ROW_H = 20;
// Below the deepest the reading can push: the two optional warning lines are
// drawn at 126 and 142/156, so the rows clear them without the list jumping
// position between a steady result and an unsteady one.
const RESULT_ROWS_Y = 176;

function signed(ms) { return `${ms > 0 ? '+' : ''}${Math.round(ms)}`; }

export class CalibrateState {
  constructor({ save, onDone }) {
    this.save = save;
    this.onDone = onDone;
  }

  enter() {
    this.phase = 'ready';
    this.t = 0;
    this.notice = null;
    this.handle = null;
    this.clicks = [];
    this.taps = [];
    this.result = null;
    this.idx = 0;
    this.stalled = 0;
    this.lastCtxTime = -1;
    // The clicks have to be the only thing in the room. Remember the bank
    // rather than the fact that there was one: returning to a menu that starts
    // its own music is common, but returning to the hub mid-tune is too, and
    // that one has to come back with the mix and arrangement it went away with.
    this.remembered = {
      bank: Audio.sourceBank,
      mix: Audio.mixEntry,
      arrangement: Audio.arrangement,
    };
    Audio.setBank(null);
    Input.setMenuButtons();
  }

  exit() {
    this.handle?.cancel();
    this.handle = null;
    if (this.remembered?.bank) {
      Audio.setBank(this.remembered.bank, this.remembered.mix, this.remembered.arrangement);
    }
  }

  /** The clicks go out on the SFX bus, so a muted desk would measure silence. */
  audible() {
    const sfx = this.save?.settings?.volumes?.sfx;
    return !Audio.silent && !(Number.isFinite(sfx) && sfx <= 0);
  }

  start() {
    Audio.ensure();
    if (!Audio.ctx) { this.notice = 'NO AUDIO YET. TAP AGAIN.'; return; }
    if (!this.audible()) { this.notice = 'UNMUTE AND RAISE SFX VOLUME TO CALIBRATE.'; return; }
    this.notice = null;
    // Read WITHOUT the player's offset: this measurement is against what the
    // browser claims, so applying it can replace rather than accumulate.
    this.reportedSec = Audio.reportedLatencySec();
    this.corr = correlateClocks(Audio.ctx);
    const handle = Audio.metronome(CAL_COUNT, Audio.ctx.currentTime + CAL_LEAD_SEC, CAL_BPM);
    if (!handle.times.length) { this.notice = 'NO AUDIO YET. TAP AGAIN.'; return; }
    this.handle = handle;
    this.clicks = handle.times;
    this.taps = [];
    this.result = null;
    this.phase = 'tapping';
    this.lastCtxTime = Audio.ctx.currentTime;
    this.stalled = 0;
  }

  cancelRun() {
    this.handle?.cancel();
    this.handle = null;
    this.clicks = [];
    this.taps = [];
  }

  /** The earliest of this frame's tap-shaped presses, on the audio clock. */
  tapThisFrame() {
    let earliest = Infinity;
    for (const action of ['confirm', 'jump', 'pointer']) {
      const at = Input.pressTime(action);
      if (Number.isFinite(at) && at < earliest) earliest = at;
    }
    return earliest === Infinity ? null : tapCtxTime(this.corr, earliest);
  }

  update(dt) {
    this.t += dt;
    if (Input.pressed('back')) {
      this.cancelRun();
      Audio.sfx('ui');
      this.onDone(false);
      Input.endFrame();
      return;
    }
    if (this.phase === 'ready') this.updateReady();
    else if (this.phase === 'tapping') this.updateTapping(dt);
    else this.updateResult();
    Input.endFrame();
  }

  updateReady() {
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) this.start();
  }

  updateTapping(dt) {
    const now = Audio.ctx?.currentTime ?? 0;
    // A context that stops advancing (backgrounded tab, a phone locking) takes
    // the clicks with it. Without this the screen would sit forever waiting for
    // a last click that has already been thrown away.
    if (now <= this.lastCtxTime) {
      this.stalled += dt;
      if (this.stalled > 0.5) {
        this.cancelRun();
        this.phase = 'ready';
        this.notice = 'AUDIO PAUSED. TRY AGAIN.';
      }
    } else {
      this.stalled = 0;
      this.lastCtxTime = now;
    }
    const tap = this.tapThisFrame();
    if (tap != null) this.taps.push(tap);
    const last = this.clicks[this.clicks.length - 1];
    if (Number.isFinite(last) && now >= last + CAL_SETTLE_SEC) {
      this.result = calibrationResult(assignTaps(this.taps, this.clicks, this.reportedSec));
      this.handle = null;
      this.phase = 'result';
      this.idx = 0;
    }
  }

  resultRows() {
    return this.result?.enough ? ['APPLY', 'RETRY', 'CANCEL'] : ['RETRY', 'CANCEL'];
  }

  updateResult() {
    const rows = this.resultRows();
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % rows.length; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + rows.length - 1) % rows.length; Audio.sfx('ui'); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - RESULT_ROWS_Y) / ROW_H);
      if (i >= 0 && i < rows.length) {
        if (this.idx === i) { this.choose(rows[i]); return; }
        this.idx = i;
        Audio.sfx('ui');
      }
    }
    if (Input.pressed('confirm') || Input.pressed('jump')) this.choose(rows[this.idx]);
  }

  choose(row) {
    if (row === 'APPLY') {
      const s = this.save.settings;
      s.audioSyncMs = this.result.suggestedMs;
      s.audioSyncReportedMs = Math.round(this.reportedSec * 1000);
      s.audioSyncAsked = true;
      Audio.setSyncOffset(s.audioSyncMs);
      this.save.persist();
      Audio.sfx('uiConfirm');
      this.onDone(true);
      return;
    }
    if (row === 'RETRY') { Audio.sfx('ui'); this.start(); return; }
    Audio.sfx('ui');
    this.onDone(false);
  }

  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'AUDIO SYNC', W / 2, 22, '#fff', 2, 'title');
    if (this.phase === 'ready') this.drawReady(ctx);
    else if (this.phase === 'tapping') this.drawTapping(ctx);
    else this.drawResult(ctx);
  }

  drawReady(ctx) {
    const lines = [
      ['TAP ON EVERY CLICK.', '#f6d33c'],
      [`${CAL_COUNT} CLICKS. THE FIRST ${CAL_COUNT_IN} ARE A COUNT-IN AND DO NOT COUNT.`, '#c8c8d8'],
      ['USE THE HEADPHONES OR SPEAKERS YOU WILL PLAY WITH.', '#c8c8d8'],
      ['', '#c8c8d8'],
      ['WIRELESS HEADPHONES DELIVER SOUND LATE AND DO NOT ALWAYS', '#8a8a98'],
      ['ADMIT HOW LATE. THIS MEASURES IT SO THE RHYTHM STAGES CAN', '#8a8a98'],
      ['PUT THE MUSIC WHERE YOUR EARS THINK IT IS.', '#8a8a98'],
    ];
    let y = 66;
    for (const [text, color] of lines) {
      if (text) drawTextCentered(ctx, text, W / 2, y, color);
      y += 15;
    }
    const reported = Math.round(Audio.reportedLatencySec() * 1000);
    drawTextCentered(ctx, `THIS DEVICE REPORTS ~${reported} MS`, W / 2, y + 8, '#5a5a68');
    const ms = clampAudioSyncMs(this.save.settings.audioSyncMs);
    drawTextCentered(ctx, `CURRENT AUDIO SYNC: ${signed(ms)} MS`, W / 2, y + 23, ms ? '#48e0c8' : '#5a5a68');
    if (this.notice) drawTextCentered(ctx, this.notice, W / 2, H - 34, '#d84828');
    drawTextCentered(ctx, `${Input.confirmVerb()}: START   BACK: CANCEL`, W / 2, textYForMid(H - 16), '#8a8a98');
  }

  /**
   * A lane the clicks travel down, because the sound itself is the thing that
   * is late. On the output this screen exists to correct, a click heard is
   * already a fifth of a second stale; the tick crossing the marker is the only
   * feedback that is honest about WHEN, and after a tap the mark showing how
   * far off it landed is the only feedback that is honest about how far.
   */
  drawTapping(ctx) {
    const now = Audio.ctx?.currentTime ?? 0;
    const x0 = 40;
    const x1 = W - 40;
    const midX = W / 2;
    const laneY = 150;
    const pxPerSec = (x1 - x0) / 8;

    drawTextCentered(ctx, 'TAP ON EVERY CLICK', W / 2, 52, '#f6d33c');

    ctx.fillStyle = '#1c1c2a';
    ctx.fillRect(x0, laneY - 1, x1 - x0, 2);

    // Ticks approach from the right and cross the marker when their click
    // should be AUDIBLE — the scheduled time plus what the browser admits to.
    for (let i = 0; i < this.clicks.length; i++) {
      const due = this.clicks[i] + this.reportedSec;
      const x = midX + (due - now) * pxPerSec;
      if (x < x0 - 4 || x > x1 + 4) continue;
      const countIn = i < CAL_COUNT_IN;
      ctx.fillStyle = countIn ? '#3a3a4a' : '#8a8a98';
      ctx.fillRect(Math.round(x), laneY - 7, 1, 14);
    }

    // The marker, and a flash on it as each click passes.
    const sinceClick = this.clicks.reduce((acc, c) => {
      const d = now - (c + this.reportedSec);
      return d >= 0 && d < acc ? d : acc;
    }, Infinity);
    const flash = sinceClick < 0.12;
    ctx.fillStyle = flash ? '#f6d33c' : '#48e0c8';
    ctx.fillRect(midX - 1, laneY - 14, 2, 28);

    // Where each tap landed: left of the marker is early, right is late.
    for (const tap of this.taps) {
      let bestGap = Infinity;
      for (const c of this.clicks) {
        const gap = tap - (c + this.reportedSec);
        if (Math.abs(gap) < Math.abs(bestGap)) bestGap = gap;
      }
      if (!Number.isFinite(bestGap) || Math.abs(bestGap) > CAL_WINDOW_SEC) continue;
      const age = now - tap;
      if (age < 0 || age > 1.4) continue;
      const ms = Math.abs(bestGap) * 1000;
      ctx.fillStyle = ms <= 30 ? '#48c848' : ms <= 80 ? '#f6d33c' : '#d84828';
      ctx.fillRect(Math.round(midX + bestGap * pxPerSec) - 1, laneY + 12, 3, 3);
    }

    const scored = this.taps.length
      ? assignTaps(this.taps, this.clicks, this.reportedSec).length : 0;
    drawTextCentered(ctx, `${scored} / ${SCORED}`, W / 2, laneY + 30, '#c8c8d8');
    const upcoming = this.clicks.filter((c) => c + this.reportedSec > now).length;
    const counting = this.clicks.length - upcoming <= CAL_COUNT_IN;
    drawTextCentered(ctx, counting ? 'COUNT-IN' : 'KEEP TAPPING', W / 2, laneY + 48, '#5a5a68');
    drawTextCentered(ctx, 'BACK: CANCEL', W / 2, textYForMid(H - 16), '#5a5a68');
  }

  drawResult(ctx) {
    const r = this.result;
    const reported = Math.round(this.reportedSec * 1000);
    let y = 64;
    if (!r.enough) {
      drawTextCentered(ctx, 'NOT ENOUGH TAPS.', W / 2, y, '#d84828');
      drawTextCentered(ctx, `${r.count} OF ${SCORED} CLICKS ANSWERED. TAP ON EVERY ONE.`, W / 2, y + 16, '#c8c8d8');
    } else {
      drawTextCentered(ctx, `DEVICE REPORTS ~${reported} MS`, W / 2, y, '#8a8a98');
      drawTextCentered(ctx, `MEASURED EXTRA ${signed(r.medianMs)} MS`, W / 2, y + 18, '#c8c8d8');
      drawTextCentered(ctx, `NEW AUDIO SYNC: ${signed(r.suggestedMs)} MS`, W / 2, y + 40, '#48e0c8', 2, 'title');
      y += 62;
      if (r.unsteady) {
        drawTextCentered(ctx, 'UNSTEADY. THE TAPS WERE SCATTERED — CONSIDER A RETRY.', W / 2, y, '#f6d33c');
        y += 16;
      }
      // A cable is the real fix on a desktop, where one is plausible. On a
      // phone it is not advice, it is a shrug, so it is not offered there.
      if (!Input.isTouchDevice() && r.suggestedMs > CAL_LARGE_MS) {
        drawTextCentered(ctx, 'LARGE OFFSET. WIRED HEADPHONES OR SPEAKERS', W / 2, y, '#8a8a98');
        drawTextCentered(ctx, 'WILL ALWAYS FEEL TIGHTER THAN A CORRECTION.', W / 2, y + 14, '#8a8a98');
      }
    }
    const rows = this.resultRows();
    rows.forEach((label, i) => {
      const rowY = RESULT_ROWS_Y + i * ROW_H;
      const w = Math.max(96, textWidth(label) + 28);
      if (i === this.idx) drawMenuRow(ctx, W / 2 - w / 2, rowY, w, ROW_H - 2);
      const color = i === this.idx ? '#fff' : '#8a8a98';
      drawText(ctx, `${i === this.idx ? '> ' : '  '}${label}`,
        W / 2 - w / 2 + 14, textYForMid(rowY + (ROW_H - 2) / 2), color);
    });
  }
}
