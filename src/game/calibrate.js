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
import { drawTextCentered, textWidth } from '../engine/sprites.js';
import {
  portraitMenuActive, portraitMenuFit, portraitMenuSafeBottom, portraitMenuSafeTop,
  portraitMenuTextCentered, portraitMenuTextY,
} from '../engine/portrait-menu.js';
import { PanelScreen, PANEL } from './panel-screen.js';

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

function signed(ms) { return `${ms > 0 ? '+' : ''}${Math.round(ms)}`; }

// ---- the copy, written once ------------------------------------------------
//
// It used to be written twice: seven hand-broken lines for landscape and six
// shorter ones for portrait, each with its own wording and its own break
// points. Two copies is two places to edit and two places to drift, and a
// paragraph broken by hand for a 480px frame breaks in the wrong place at
// every other width. One source now, wrapped at draw time to whatever width
// the orientation actually has.
//
// Short sentences, front-loaded: this screen is read once, on a phone, by
// somebody who has just discovered their headphones are lying to them.
const READY_HEADLINE = 'TAP ALONG WITH THE CLICKS';
// How long it takes, and what to have on your head. The count-in is NOT
// explained here: the run screen counts it off in place (COUNT-IN, then
// n / 12), which teaches it better than a line of small print read beforehand
// and keeps this screen to two facts.
const READY_STEPS = [
  `${CAL_COUNT} CLICKS, ABOUT ${Math.round(CAL_COUNT * 60 / CAL_BPM)} SECONDS.`,
  'WEAR YOUR USUAL HEADPHONES.',
];
const READY_WHY = 'WIRELESS HEADPHONES PLAY SOUND LATE. THIS FINDS OUT HOW LATE,'
  + ' SO THE RHYTHM STAGES STAY IN TIME.';
const SHORT_WHY = 'TAP ON EVERY CLICK, EVEN THE EASY ONES.';
const UNSTEADY_WHY = 'THE TAPS WERE SCATTERED. A RETRY WILL BE MORE ACCURATE.';
const CABLE_WHY = 'THAT IS A BIG DELAY. A CABLE WILL ALWAYS FEEL TIGHTER.';

// ---- the button row --------------------------------------------------------
//
// SET / RESET / BACK while the screen is waiting, APPLY / RETRY / BACK once it
// has a reading. RESET used to be a second row on the settings list, one line
// under this feature's other half; it belongs beside SET, where the screen's
// own copy is there to say what each of them does to the figure. The row, the
// cursor and the copy block are laid out by PanelScreen (panel-screen.js).

export class CalibrateState extends PanelScreen {
  static portraitMode = 'frame';

  constructor({ save, onDone }) {
    super();
    this.save = save;
    this.onDone = onDone;
  }

  enter() {
    this.phase = 'ready';
    this.t = 0;
    this.notice = null;
    // A notice is normally something that went wrong, so it is drawn in the
    // warning colour. RESET's confirmation is the one that is not.
    this.noticeOk = false;
    this.handle = null;
    this.clicks = [];
    this.taps = [];
    this.result = null;
    this.idx = 0;
    this.stalled = 0;
    this.lastCtxTime = -1;
    this.layout();
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

  /**
   * The buttons this phase offers, in the order they are drawn.
   *
   * `resultRows` is kept as the result phase's own list because that is what
   * the reading's shape decides: a run too short to trust has nothing to APPLY.
   */
  resultRows() {
    return this.result?.enough ? ['APPLY', 'RETRY', 'BACK'] : ['RETRY', 'BACK'];
  }

  buttonRows() {
    if (this.phase === 'ready') return ['SET', 'RESET', 'BACK'];
    // A run in progress gets a BACK of its own. It used to have only the words
    // BACK TO STOP along the bottom, which is a key on a desk and nothing at
    // all on a phone — and a phone is the device this whole screen exists for.
    // Eight seconds is a long time to be stuck in a test you have decided
    // against.
    if (this.phase === 'tapping') return ['BACK'];
    return this.resultRows();
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
    this.noticeOk = false;
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
    this.layout();
    if (Input.pressed('back')) {
      this.cancelRun();
      Audio.sfx('ui');
      this.onDone(false);
      Input.endFrame();
      return;
    }
    if (this.phase === 'tapping') this.updateTapping(dt);
    else this.updateButtons();
    Input.endFrame();
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
        this.idx = 0;
        this.noticeOk = false;
        this.notice = 'AUDIO PAUSED. TRY AGAIN.';
      }
    } else {
      this.stalled = 0;
      this.lastCtxTime = now;
    }
    // The BACK button, before anything else this frame does with the press.
    // One tap commits rather than the cursor's usual two: during a run every
    // tap is also a measurement, so a "select it first" step would ask the
    // player to poke the thing twice while the clicks carry on without them.
    // It sits under the lane, clear of where the tapping thumb lives.
    if (Input.pressed('pointer')) {
      const { x, y } = Input.pointer;
      const back = (this.boxes || this.buttonBoxes())[0];
      if (back && x >= back.x && x < back.x + back.w && y >= back.y && y < back.y + back.h) {
        this.cancelRun();
        Audio.sfx('ui');
        this.onDone(false);
        return;
      }
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

  choose(row) {
    if (row === 'SET') { this.idx = 0; this.start(); return; }
    // RESET hands the clock back to the browser's own figure. AUDIO SYNC is an
    // offset ON TOP of what the device reports (audio.js, heardLatencySec), so
    // zero is not "no correction at all" — it is "trust the system's number",
    // which is the right answer on a wired output and the answer a player wants
    // back the moment they unplug the headphones they measured for. It refuses
    // when it is already in force rather than pretending to act, and it stays
    // on this screen: the status block above the buttons is the confirmation.
    if (row === 'RESET') {
      const s = this.save.settings;
      if (clampAudioSyncMs(s.audioSyncMs) === 0) { Audio.sfx('uiBad'); return; }
      s.audioSyncMs = 0;
      Audio.setSyncOffset(0);
      this.save.persist();
      Audio.sfx('uiConfirm');
      this.noticeOk = true;
      this.notice = 'AUDIO SYNC RESET. THE SYSTEM FIGURE STANDS ALONE.';
      return;
    }
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
    const portrait = portraitMenuActive();
    const safeTop = portrait ? portraitMenuSafeTop() : 0;
    const safeBottom = portrait ? portraitMenuSafeBottom() : H;
    const titleMid = this.drawFrame(ctx, 'AUDIO SYNC');
    if (this.phase === 'tapping') {
      if (portrait) this.drawTappingPortrait(ctx, safeTop, safeBottom);
      else this.drawTapping(ctx);
      return;
    }
    this.drawPanel(ctx, portrait, titleMid);
  }

  /**
   * THE READY AND RESULT SCREENS ARE ONE SCREEN with two things to say, so one
   * method says both. It builds a stack of centred lines — headline, the two
   * steps, the paragraph that explains why anyone should care, the two status
   * figures — and hands it to a flow that fits it between the title and the
   * button row.
   *
   * Every paragraph is wrapped HERE, at the width the frame actually has,
   * rather than broken by hand at authoring time. The old screen carried two
   * sets of hand-broken lines, one per orientation, and a hand break is only
   * ever right at the one width it was measured on.
   */
  panelLines(portrait) {
    const S = portrait ? PANEL.portrait : PANEL.landscape;
    const out = [];
    const push = (text, color, size, lead = 0, style = 'ui') =>
      out.push({ text, color, size, style, lead });
    const para = (text, color, size, lead) => out.push(...this.paragraph(text, color, size, lead, portrait));

    if (this.phase === 'ready') {
      push(READY_HEADLINE, '#f6d33c', S.head);
      for (const step of READY_STEPS) para(step, '#c8c8d8', S.step, S.gap);
      para(READY_WHY, '#8a8a98', S.why, S.gap);
    } else if (!this.result.enough) {
      push('NOT ENOUGH TAPS', '#d84828', S.head);
      push(`${this.result.count} OF ${SCORED} CLICKS ANSWERED`, '#c8c8d8', S.step, S.gap);
      para(SHORT_WHY, '#8a8a98', S.why, S.gap);
    } else {
      const r = this.result;
      // The device's own figure is NOT repeated here: the readout above the
      // buttons already states it, and two lines both opening "DEVICE SAYS"
      // read as two different devices rather than as one fact stated once.
      push(`YOUR TAPS WERE ${signed(r.medianMs)} MS LATE`, '#c8c8d8', S.step);
      push(`NEW AUDIO SYNC: ${signed(r.suggestedMs)} MS`, '#48e0c8', S.big, S.gap, 'title');
      if (r.unsteady) para(UNSTEADY_WHY, '#f6d33c', S.why, S.gap);
      // A cable is the real fix on a desktop, where one is plausible. On a
      // phone it is not advice, it is a shrug, so it is not offered there.
      if (!Input.isTouchDevice() && r.suggestedMs > CAL_LARGE_MS) {
        para(CABLE_WHY, '#8a8a98', S.why, S.gap);
      }
    }

    return out;
  }

  /**
   * THE READOUT: what is in force right now. It sits directly above the button
   * row rather than at the end of the prose, because it is the thing SET and
   * RESET each act on — putting it next to them is what makes pressing one of
   * them feel like moving a number rather than triggering an event. It also
   * gives the bottom of a tall phone something to hold, instead of a screen of
   * text and then a long fall to the buttons.
   *
   * Two lines and not one: the stored figure is an offset ON TOP of whatever
   * the device already admits to, and a single number reads as the whole
   * correction. Naming the device's figure beside it is what stops RESET
   * looking like it is about to set 32.
   */
  statusLines(portrait) {
    const S = portrait ? PANEL.portrait : PANEL.landscape;
    const reported = Math.round(Audio.reportedLatencySec() * 1000);
    const ms = clampAudioSyncMs(this.save.settings.audioSyncMs);
    const out = [
      { text: `DEVICE SAYS ~${reported} MS`, color: '#5a5a68', size: S.status, style: 'ui', lead: 0 },
      {
        text: ms ? `AUDIO SYNC ADDS ${signed(ms)} MS` : 'AUDIO SYNC ADDS NOTHING',
        color: ms ? '#48e0c8' : '#5a5a68', size: S.status, style: 'ui', lead: 0,
      },
    ];
    if (this.notice) out.push(...this.paragraph(this.notice, this.noticeOk ? '#48c848' : '#d84828', S.notice, S.gap, portrait));
    return out;
  }

  drawTappingPortrait(ctx, safeTop, safeBottom) {
    const now = Audio.ctx?.currentTime ?? 0;
    const x0 = 36;
    const x1 = W - 36;
    const midX = W / 2;
    const laneY = Math.round(safeTop + (safeBottom - safeTop) * 0.52);
    const pxPerSec = (x1 - x0) / 8;
    const title = 'TAP ON EVERY CLICK';
    const titleS = portraitMenuFit(title, 2.25, W - 24);
    portraitMenuTextCentered(ctx, title, W / 2,
      portraitMenuTextY(laneY - 96, titleS), '#f6d33c', titleS);

    ctx.fillStyle = '#1c1c2a';
    ctx.fillRect(x0, laneY - 2, x1 - x0, 4);
    for (let i = 0; i < this.clicks.length; i++) {
      const due = this.clicks[i] + this.reportedSec;
      const x = midX + (due - now) * pxPerSec;
      if (x < x0 - 4 || x > x1 + 4) continue;
      const countIn = i < CAL_COUNT_IN;
      ctx.fillStyle = countIn ? '#3a3a4a' : '#8a8a98';
      ctx.fillRect(Math.round(x), laneY - 14, 2, 28);
    }

    const sinceClick = this.clicks.reduce((acc, c) => {
      const d = now - (c + this.reportedSec);
      return d >= 0 && d < acc ? d : acc;
    }, Infinity);
    const flash = sinceClick < 0.12;
    ctx.fillStyle = flash ? '#f6d33c' : '#48e0c8';
    ctx.fillRect(midX - 2, laneY - 28, 4, 56);

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
      ctx.fillRect(Math.round(midX + bestGap * pxPerSec) - 3, laneY + 24, 6, 6);
    }

    const scored = this.taps.length
      ? assignTaps(this.taps, this.clicks, this.reportedSec).length : 0;
    portraitMenuTextCentered(ctx, `${scored} / ${SCORED}`, W / 2,
      portraitMenuTextY(laneY + 72, 1.9), '#c8c8d8', 1.9);
    const upcoming = this.clicks.filter((c) => c + this.reportedSec > now).length;
    const counting = this.clicks.length - upcoming <= CAL_COUNT_IN;
    portraitMenuTextCentered(ctx, counting ? 'COUNT-IN' : 'KEEP TAPPING', W / 2,
      portraitMenuTextY(laneY + 104, 1.65), '#5a5a68', 1.65);
    this.drawButtons(ctx);
  }

  drawTapping(ctx) {
    const now = Audio.ctx?.currentTime ?? 0;
    const x0 = 40;
    const x1 = W - 40;
    const midX = W / 2;
    const laneY = 150;
    const pxPerSec = (x1 - x0) / 8;

    const title = 'TAP ON EVERY CLICK';
    const titleS = Math.min(1.5, (W - 28) / Math.max(1, textWidth(title, 1)));
    drawTextCentered(ctx, title, W / 2, 52, '#f6d33c', titleS);

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
    drawTextCentered(ctx, `${scored} / ${SCORED}`, W / 2, laneY + 30, '#c8c8d8', 1.3);
    const upcoming = this.clicks.filter((c) => c + this.reportedSec > now).length;
    const counting = this.clicks.length - upcoming <= CAL_COUNT_IN;
    drawTextCentered(ctx, counting ? 'COUNT-IN' : 'KEEP TAPPING', W / 2, laneY + 48, '#5a5a68', 1.1);
    this.drawButtons(ctx);
  }

}
