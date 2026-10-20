// CRASH REPORT: ABOUT > CRASH REPORT.
//
// The breadcrumb trail (engine/diag.js) used to be reachable only by five taps on
// a build stamp that a phone in portrait never shows. It is an About-screen action now:
// this screen says whether the game was last killed mid-play and what it was
// doing, shows which build is running, and SEND hands the whole trail to the
// share sheet (Messages, Mail, Save to Files) so it can be passed on as text.
//
// SEND acts inside the tap, not on the next frame: iOS only opens the share sheet
// from inside a user gesture. Same plumbing, and the same reason, as EXPORT on the
// IMPORT / EXPORT screen (save-file.js).
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { W, clientToLogical } from '../engine/renderer.js';
import { portraitMenuActive } from '../engine/portrait-menu.js';
import { formatBuildTime } from '../engine/build-time.js';
import { crumbReport, lastCrash } from '../engine/diag.js';
import { glitchReport } from '../engine/glitch-log.js';
import { PanelScreen, PANEL } from './panel-screen.js';
import { exportedLabel } from './save-file.js';

const TITLE = 'CRASH LOG';
// What a crash's trail shows: its last few steps, newest last. The full trail goes out with SEND.
const SHOWN_STEPS = 4;
const NOTICE_COLOR = { ok: '#48c848', bad: '#d84828', info: '#8a8a98' };

/**
 * Hand the trail to the player. A phone gets the share sheet; anything else gets
 * the clipboard, and failing that a .txt download. Resolves 'shared', 'copied' or
 * 'downloaded'; rejects with an AbortError when the share sheet is closed.
 */
export function sendTrail(text) {
  const title = 'MASHENSTEIN crash log';
  if (Input.isTouchDevice() && navigator.share) return navigator.share({ title, text }).then(() => 'shared');
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => 'copied');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mashenstein-crash-log.txt';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return Promise.resolve('downloaded');
}

export class CrashLogState extends PanelScreen {
  static portraitMode = 'frame';

  constructor({ onDone, send = sendTrail }) {
    super();
    this.onDone = onDone;
    this.send = send;
  }

  enter() {
    this.idx = 0;
    this.notice = null;
    this.busy = false;
    this.armed = false;
    this.keyed = false;
    this.crash = lastCrash();
    this.layout();
    Input.setMenuButtons();
    this.attach();
  }

  exit() { this.detach(); }

  buttonRows() { return ['SEND', 'BACK']; }

  // ---- the browser events (SEND only) -------------------------------------------

  attach() {
    const surface = document.getElementById('chrome') || document.getElementById('game');
    this.live = true;
    const down = (e) => { if (this.live) this.pointerDown(e); };
    const up = (e) => { if (this.live) this.pointerUp(e); };
    const cancel = () => { this.armed = false; };
    const key = (e) => { if (this.live) this.keyDown(e); };
    this.listeners = [
      [surface, 'pointerdown', down], [surface, 'pointerup', up],
      [surface, 'pointercancel', cancel], [window, 'keydown', key],
    ];
    for (const [target, type, fn] of this.listeners) target?.addEventListener(type, fn);
  }

  detach() {
    this.live = false;
    for (const [target, type, fn] of this.listeners || []) target?.removeEventListener?.(type, fn);
    this.listeners = [];
    this.armed = false;
  }

  /** A finger down on SEND while SEND is selected arms it; the lift is the tap. */
  pointerDown(e) {
    this.armed = false;
    if (Input.suspended) return;
    const p = clientToLogical(e.clientX, e.clientY);
    const hit = this.hitButton(p.x, p.y);
    if (hit >= 0 && hit === this.idx && this.boxes?.[hit]?.label === 'SEND') this.armed = true;
  }

  pointerUp(e) {
    const armed = this.armed;
    this.armed = false;
    if (!armed || Input.suspended) return;
    const p = clientToLogical(e.clientX, e.clientY);
    if (this.boxes?.[this.hitButton(p.x, p.y)]?.label === 'SEND') this.sendNow();
  }

  keyDown(e) {
    if (Input.suspended || e.repeat) return;
    const action = Input.actionForKey(e.code);
    if (action !== 'confirm' && action !== 'jump') return;
    if (this.boxes?.[this.idx]?.label !== 'SEND') return;
    this.keyed = true;
    this.sendNow();
  }

  sendNow() {
    if (this.busy) return;
    let sent;
    try {
      sent = this.send(`${crumbReport()}\n\n${glitchReport()}`);
    } catch (e) {
      this.say('bad', 'THIS DEVICE WOULD NOT SEND THE LOG.');
      Audio.sfx('uiBad');
      return;
    }
    this.busy = true;
    Promise.resolve(sent).then((how) => {
      this.busy = false;
      this.say('ok', how === 'copied' ? 'COPIED. PASTE IT WHEREVER IT NEEDS TO GO.'
        : how === 'downloaded' ? 'DOWNLOADED MASHENSTEIN-CRASH-LOG.TXT' : 'SENT.');
      Audio.sfx('uiConfirm');
    }, (e) => {
      this.busy = false;
      if (e?.name === 'AbortError') this.say('info', 'NOT SENT.');
      else { this.say('bad', 'THIS DEVICE WOULD NOT SEND THE LOG.'); Audio.sfx('uiBad'); }
    });
  }

  say(tone, text) { this.notice = { tone, text }; }

  // ---- the frame loop -------------------------------------------------------------

  update() {
    this.layout();
    if (Input.pressed('back')) {
      Audio.sfx('ui');
      this.onDone();
      Input.endFrame();
      return;
    }
    this.updateButtons();
    this.keyed = false;
    Input.endFrame();
  }

  /** SEND by finger or key already went inside the event; a pad has no event, so it lands here. */
  choose(row, how) {
    if (row === 'SEND') {
      if (how === 'pointer' || this.keyed) return;
      this.sendNow();
      return;
    }
    Audio.sfx('ui');
    this.onDone();
  }

  // ---- drawing --------------------------------------------------------------------

  panelLines(portrait) {
    const S = portrait ? PANEL.portrait : PANEL.landscape;
    const out = [];
    const push = (text, color, size, lead = 0) => out.push({ text, color, size, style: 'ui', lead });
    const para = (text, color, size, lead) => out.push(...this.paragraph(text, color, size, lead, portrait));
    if (!this.crash) {
      push('NO CRASHES RECORDED', '#48c848', S.head);
      para('THE GAME KEEPS A SHORT TRAIL OF WHAT IT WAS DOING. IF IT EVER QUITS ON ITS OWN, '
        + 'COME BACK HERE AND SEND THE LOG.', '#8a8a98', S.why, S.gap);
      return out;
    }
    push(`LAST CRASH: ${exportedLabel(this.crash.at)}`, '#f6d33c', S.head);
    push('ITS LAST STEPS:', '#8a8a98', S.why, S.gap);
    // Each step as its time, its name and the first word of its detail (the stage, as
    // a rule). One shared size, the one the longest line needs, so the steps read as
    // a list rather than four lines each shrunk by its own amount.
    const steps = this.crash.lines.slice(-SHOWN_STEPS).map((l) => (
      `${l.t}S  ${l.tag} ${String(l.detail || '').split(' ')[0]}`.trim().toUpperCase()));
    const margin = (portrait ? PANEL.portrait : PANEL.landscape).margin;
    const size = Math.min(...steps.map((text) => this.fit(text, S.step, W - margin)));
    for (const text of steps) push(text, '#c8c8d8', size);
    para('SEND SHARES THE WHOLE LOG AS TEXT.', '#8a8a98', S.why, S.gap);
    return out;
  }

  /** The readout above the buttons: which build this is — the stamp that used to be the way in. */
  statusLines(portrait) {
    const S = portrait ? PANEL.portrait : PANEL.landscape;
    const built = formatBuildTime(window.__MASH_BUILT_AT__) || window.__MASH_BUILD__ || 'UNKNOWN';
    const out = [{ text: `BUILT ${String(built).toUpperCase()}`, color: '#5a5a68', size: S.status, style: 'ui', lead: 0 }];
    if (this.notice) out.push(...this.paragraph(this.notice.text, NOTICE_COLOR[this.notice.tone], S.notice, S.gap, portrait));
    return out;
  }

  draw(ctx) {
    const portrait = portraitMenuActive();
    const titleMid = this.drawFrame(ctx, TITLE);
    this.drawPanel(ctx, portrait, titleMid);
  }
}
