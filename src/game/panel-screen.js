// A settings screen that explains itself: a title, a fitted stack of centred
// copy, a readout above a row of plated buttons, and one cursor that keys, a pad
// and a finger all share.
//
// AUDIO SYNC was the first screen of this shape and IMPORT / EXPORT the second
// (8 Oct 2026). The machinery was lifted out of calibrate.js at that point so
// the two screens cannot drift apart: a subclass supplies buttonRows(),
// panelLines(), statusLines() and choose(), and everything here lays them out.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawTextCentered, textWidth, drawMenuRow, textYForMid, wrapText, BACK_BUTTON_PLATE } from '../engine/sprites.js';
import {
  portraitMenuActive, portraitMenuFit, portraitMenuSafeBottom, portraitMenuSafeTop,
  portraitMenuScale, portraitMenuTextCentered, portraitMenuTextY, portraitMenuWrap,
} from '../engine/portrait-menu.js';

// ---- the button row --------------------------------------------------------
//
// buttonBoxes() is the ONE geometry: the painter, the keyboard cursor and the
// pointer hit-test all read it, so none of the three can believe in a button
// the other two do not have. Laid out across rather than down in both
// orientations — three short words fit a 480-wide frame either way up, and a
// row of buttons at the foot of the screen is what a phone expects.
export const BUTTON = {
  landscape: { h: 26, gap: 12, scale: 1.25, pad: 22, minW: 84, margin: 40, bottom: 20 },
  portrait: { h: 62, gap: 14, scale: 1.8, pad: 26, minW: 118, margin: 26, bottom: 34 },
};
// ---- the copy block --------------------------------------------------------
//
// Type sizes and spacing, per orientation. Only these differ: the strings, the
// order and the colours are shared, and drawPanel solves the spacing against
// the room the frame actually has rather than trusting these to fit.
//
// `top` is measured down from the title, `clear` is the air kept above the
// button row, `line` is the natural line pitch and `tight` the floor it may be
// squeezed to. `gap` is the extra lead before a new idea starts.
export const PANEL = {
  landscape: {
    top: 24, clear: 14, margin: 56, line: 17, tight: 13, gap: 10,
    head: 1.5, step: 1.22, why: 1.12, status: 1.2, big: 2.2, notice: 1.12,
  },
  portrait: {
    top: 64, clear: 30, margin: 44, line: 44, tight: 34, gap: 28,
    head: 2.3, step: 1.9, why: 1.65, status: 1.7, big: 3.0, notice: 1.6,
  },
};

export class PanelScreen {
  static portraitMode = 'frame';

  /**
   * Where each button sits, in logical pixels. The single source of that: a
   * cursor, a finger and a painter that each worked it out for themselves is
   * how a tap lands one row off the thing it looks like it hit.
   */
  buttonBoxes() {
    const rows = this.buttonRows();
    const portrait = portraitMenuActive();
    const m = portrait ? BUTTON.portrait : BUTTON.landscape;
    const label = (text) => (portrait
      ? textWidth(text, portraitMenuScale(m.scale))
      : textWidth(text, m.scale));
    let widths = rows.map((text) => Math.max(m.minW, Math.round(label(text) + m.pad * 2)));
    const span = () => widths.reduce((a, b) => a + b, 0) + m.gap * (rows.length - 1);
    const maxSpan = W - m.margin;
    // Narrow every button by the same factor rather than truncating one of
    // them: three buttons that no longer line up read as three different
    // controls, and the words here are all short enough to survive the squeeze.
    if (span() > maxSpan) {
      const k = (maxSpan - m.gap * (rows.length - 1)) / widths.reduce((a, b) => a + b, 0);
      widths = widths.map((w) => Math.floor(w * k));
    }
    const y = Math.round((portrait ? portraitMenuSafeBottom(m.bottom) : H - m.bottom) - m.h);
    let x = Math.round((W - span()) / 2);
    return rows.map((text, i) => {
      const box = { label: text, x, y, w: widths[i], h: m.h, scale: m.scale };
      x += widths[i] + m.gap;
      return box;
    });
  }

  layout() {
    this.boxes = this.buttonBoxes();
    if (this.idx >= this.boxes.length) this.idx = this.boxes.length - 1;
  }

  /** The button under a logical point, or -1. */
  hitButton(x, y) {
    const boxes = this.boxes || this.buttonBoxes();
    return boxes.findIndex((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  }

  /**
   * One cursor for every phase of the screen. Left/right walks the row it is
   * drawn as; up/down is kept alive because a d-pad player will reach for it.
   *
   * choose() is told how the button was committed — 'pointer' for a finger or a
   * mouse, 'press' for a key or a pad — for the one screen that has to act
   * inside the browser event rather than here (save-file.js).
   */
  updateButtons() {
    const boxes = this.boxes || this.buttonBoxes();
    const n = boxes.length;
    if (Input.pressed('right') || Input.pressed('down')) { this.idx = (this.idx + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('left') || Input.pressed('up')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer')) {
      const { x, y } = Input.pointer;
      const hit = this.hitButton(x, y);
      // A first tap moves the cursor, a second one commits: the same two-step
      // the result rows have always used, kept so a fat-fingered tap on the
      // wrong button is recoverable rather than immediately acted on.
      if (hit >= 0) {
        if (this.idx === hit) { this.choose(boxes[hit].label, 'pointer'); return; }
        this.idx = hit;
        Audio.sfx('ui');
      }
    }
    if (Input.pressed('confirm') || Input.pressed('jump')) this.choose(boxes[this.idx].label, 'press');
  }

  /** The screen's background and its title. Returns the title's mid line. */
  drawFrame(ctx, title) {
    const portrait = portraitMenuActive();
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const titleMid = portrait ? portraitMenuSafeTop() + 34 : 26;
    const titleS = portrait
      ? portraitMenuFit(title, 4.2, W - 24, 'title')
      : Math.min(2.8, (W - 32) / Math.max(1, textWidth(title, 1, 'title')));
    this.centred(ctx, title, W / 2, titleMid, '#fff', titleS, 'title');
    return titleMid;
  }

  /**
   * One line centred on `midX`, in whichever type system this orientation uses.
   * The x is a parameter and not W / 2: the button row centres each label on
   * its own plate, and a shared helper that assumed the screen's middle drew
   * all three of them on top of each other.
   */
  centred(ctx, text, midX, midY, color, size, style = 'ui') {
    if (portraitMenuActive()) {
      portraitMenuTextCentered(ctx, text, midX,
        portraitMenuTextY(midY, size, style), color, size, style);
    } else {
      drawTextCentered(ctx, text, midX, textYForMid(midY, size, style), color, size, style);
    }
  }

  /** The widest this orientation lets a string be, at `size`. */
  fit(text, size, maxWidth, style = 'ui') {
    return portraitMenuActive()
      ? portraitMenuFit(text, size, maxWidth, style)
      : Math.min(size, maxWidth / Math.max(1, textWidth(text, 1, style)));
  }

  /**
   * A paragraph wrapped at the width the frame actually has, as stack rows.
   *
   * A generous cap, not a tight one: wrapText ELLIPSISES whatever will not fit
   * in the lines it is given, so a cap set to what landscape happens to need
   * silently truncates the same sentence in portrait, where the column is half
   * as wide. drawPanel tightens the pitch to fit; nothing is cut.
   */
  paragraph(text, color, size, lead, portrait) {
    const width = W - (portrait ? PANEL.portrait : PANEL.landscape).margin;
    const wrapped = portrait
      ? portraitMenuWrap(text, width, size, 12)
      : wrapText(text, width, size, 12);
    return wrapped.map((l, i) => ({ text: l, color, size, style: 'ui', lead: i === 0 ? lead : 0 }));
  }

  /** Draw a measured stack of centred lines downward from `y`. Returns the end. */
  drawStack(ctx, rows, y, line, margin, k = 1) {
    for (const r of rows) {
      y += r.lead * k;
      const size = this.fit(r.text, r.size, W - margin, r.style);
      this.centred(ctx, r.text, W / 2, y + line * k / 2, r.color, size, r.style);
      y += line * k;
    }
    return y;
  }

  drawPanel(ctx, portrait, titleMid) {
    const S = portrait ? PANEL.portrait : PANEL.landscape;
    const rows = this.panelLines(portrait);
    const status = this.statusLines(portrait);
    const buttonTop = this.boxes?.[0]?.y ?? H;
    const statusH = status.reduce((h, r) => h + S.line + r.lead, 0);
    const top = titleMid + S.top;
    const bottom = buttonTop - S.clear * 2 - statusH;
    // THE STACK IS FITTED, NOT ASSUMED. How many lines there are depends on the
    // phase, on whether there is a notice and on how wide the frame wrapped the
    // paragraphs — so the spacing is solved for the room that is actually left
    // rather than hard-coded and hoped for. Nothing is ever dropped: it tightens
    // to the floor and, if even that will not fit, overruns knowingly rather
    // than hiding a line.
    const natural = rows.reduce((h, r) => h + S.line + r.lead, 0);
    const room = Math.max(1, bottom - top);
    const k = natural > room ? Math.max(S.tight / S.line, room / natural) : 1;
    // TOP-ALIGNED, NOT CENTRED. Centring splits the leftover room evenly, and
    // on a tall phone that is half a screen of nothing between the title and
    // the first line — which reads as a page that failed to load rather than as
    // breathing space. The slack belongs at the bottom, above the buttons,
    // where it is just the end of the text.
    this.drawStack(ctx, rows, top, S.line, S.margin, k);
    this.drawStack(ctx, status, buttonTop - S.clear - statusH, S.line, S.margin);
    this.drawButtons(ctx);
  }

  /**
   * Every button gets a plate, not just the selected one: three words floating
   * on the background read as a caption, and a caption is not a thing anybody
   * taps.
   */
  drawButtons(ctx) {
    const boxes = this.boxes || this.buttonBoxes();
    boxes.forEach((b, i) => {
      const on = i === this.idx;
      drawMenuRow(ctx, b.x, b.y, b.w, b.h, 3, on ? undefined : BACK_BUTTON_PLATE);
      const size = this.fit(b.label, b.scale, b.w - 16);
      this.centred(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2, on ? '#fff' : '#8a8a98', size);
    });
  }
}
