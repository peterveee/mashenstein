// THE CLUB'S VISUALISER (Peter, 10 Oct 2026: "could double clicking on the mirror ball bring up
// the visualiser?"). A double tap on the mirror ball puts one of the jukebox's visualisers over
// the whole screen, to the song the club is playing — the same presets, the same fade through
// black and the same full-screen cover crop the jukebox's screensaver uses (menus.js). The room
// carries on behind it unseen, so its lasers, strobes and moments are still in step with the
// song when it comes back. A swipe (or left / right) is the next one; a tap, or any other key,
// is back to the club.
import { W, H, screen, visualiserFrame, setVisualiserFullscreen, pushOverlayDraw } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { VISUALISER_NAMES, createVisualiser, isVisualiserExcluded, setVisualiserViewport, clamp, smooth } from '../../engine/visualisers.js';
import { drawTextForPresentation as drawText, textWidth } from '../../engine/sprites.js';

/**
 * The visualisers the club deals from, by name (null would be the whole pack); any switched off in
 * the settings stay off. The kid-friendly ones — pictures of things, bright and readable — and not
 * the abstract ones (Peter, 10 Oct 2026: "take away from the more abstract ones... try to be more
 * kid friendly"; and "we may want to limit the visualisers later to be the less intensive ones").
 * VJ MEGAMIX is left out because it deals from the whole pack.
 */
export const CLUB_VISUALISERS = Object.freeze([
  'DEEP BLUE DISCO',
  'ARCADE ART GALLERY',
  'TOASTER SKY PARADE',
  'CHROMA BUBBLESTORM',
  'PRISMATIC STORM',
  'ELECTRIC KALEIDOSCOPE',
  'HALF-PIPE HORIZON',
]);

// The jukebox's timings (menus.js VISUAL_*): the room fades to black, a beat-sized gap, then the
// visualiser fades up — and back the other way, quicker.
const ROOM_FADE = 0.30;
const GAP = 0.12;
const IN_TOTAL = 1.0;
const OUT_FADE = 0.20;
const OUT_GAP = 0.10;
const OUT_TOTAL = 0.45;
const SWITCH_S = 0.35;     // the cross-fade from one visualiser to the next
const SWIPE_PX = 26;       // a finger this far sideways (logical pixels) is a swipe, not a tap
const LABEL_HOLD_S = 5;    // the song's and the visualiser's names, then they fade over a second

/** The visualisers the club can show, as indices into VISUALISER_NAMES. */
export function clubVisualiserPack() {
  const pack = VISUALISER_NAMES.map((_, i) => i).filter((i) => !isVisualiserExcluded(i)
    && (!CLUB_VISUALISERS || CLUB_VISUALISERS.includes(VISUALISER_NAMES[i])));
  return pack.length ? pack : [0];
}

export class ClubVisualiser {
  constructor() {
    this.state = null;      // null (the room), 'in', 'active' or 'out'
    this.t = 0;             // seconds into 'in' or 'out'
    this.full = false;      // whether it has the canvas full-screen (the room's own layout handed back on the way out)
    this.preset = null;
    this.previous = null;   // the one being cross-faded out of, for SWITCH_S
    this.switchT = 0;
    this.index = -1;
    this.lastIndex = -1;    // never the same one twice running
    this.labelT = 0;
    this.shownLabel = null;
    this.swipe = null;      // a finger down on it: { x0, y0, moved }
    this.track = { bpm: 120 };
    this.title = '';
  }

  /** Up over the room: anything from the double tap until it has faded back out. */
  get open() { return this.state != null; }
  /** The room is not drawn at all: the visualiser, or black, is the whole picture. */
  get hidesRoom() { return this.roomAlpha() <= 0; }

  start({ bpm = 120, title = '' } = {}) {
    if (this.state) return;
    this.track = { bpm };
    this.title = title;
    // the presets are composed in the 480x270 field the full-screen crop cuts from (menus.js layout)
    setVisualiserViewport(270);
    const pack = clubVisualiserPack();
    let at = Math.floor(Math.random() * pack.length);
    if (pack.length > 1 && pack[at] === this.lastIndex) at = (at + 1) % pack.length;
    this.show(pack[at]);
    this.previous = null;
    this.switchT = 0;
    this.state = 'in';
    this.t = 0;
    this.swipe = null;
  }

  show(index) {
    this.index = this.lastIndex = index;
    const seed = ((Math.random() * 0xffffffff) ^ (index * 0x9e3779b9)) >>> 0;
    this.preset = createVisualiser(index, seed, this.track);
    this.labelT = 0;
  }

  /** The next (+1) or previous (-1) one in the pack, cross-faded. */
  step(delta) {
    if (!this.preset || this.state === 'out') return;
    const pack = clubVisualiserPack();
    const k = pack.indexOf(this.index);
    this.previous = this.preset;
    this.show(pack[((k < 0 ? 0 : k) + delta + pack.length) % pack.length]);
    this.switchT = SWITCH_S;
  }

  /** Back to the club: it fades out, and the room fades back up. */
  close() {
    if (!this.state || this.state === 'out') return;
    this.state = 'out';
    this.t = 0;
    this.swipe = null;
  }

  /** Gone at once — the club is being left. */
  drop() {
    if (this.full) setVisualiserFullscreen(false);
    this.full = false;
    this.state = null;
    this.preset = this.previous = null;
    this.swipe = null;
  }

  /**
   * Once a frame, before the club fits its screen: the fades, the switch to full screen once the
   * room is black, and back again before it fades up. False when it is not up.
   */
  tick(dt) {
    if (!this.state) return false;
    this.t += dt;
    if (this.preset) this.preset.update(dt, Audio.musicAnalysis?.() || {});
    if (this.previous) this.previous.update(dt, Audio.musicAnalysis?.() || {});
    if (this.switchT > 0) {
      this.switchT = Math.max(0, this.switchT - dt);
      if (this.switchT === 0) this.previous = null;
    }
    // the megamix changes record under its own name: the corner tag announces each one
    const label = this.preset ? (this.preset.label || this.preset.name) : null;
    if (label !== this.shownLabel) { this.shownLabel = label; this.labelT = 0; }
    if (this.state !== 'out') this.labelT += dt;
    if (this.state === 'in') {
      if (!this.full && this.t >= ROOM_FADE + GAP) { setVisualiserFullscreen(true); this.full = true; }
      if (this.t >= IN_TOTAL) { this.state = 'active'; this.t = IN_TOTAL; }
    } else if (this.state === 'out') {
      if (this.full && this.t >= OUT_FADE + OUT_GAP) { setVisualiserFullscreen(false); this.full = false; }
      if (this.t >= OUT_TOTAL) { this.state = null; this.preset = this.previous = null; }
    }
    return true;
  }

  /**
   * The keys and the glass while it is up — all of them; the club's floor is under it. A tap (or
   * any key but the arrows) closes it, a swipe or an arrow steps it. True when it took the frame.
   */
  input() {
    if (!this.state) return false;
    if (this.state === 'out') return true;
    if (Input.pressed('pointer')) this.swipe = { x0: Input.pointer.x, y0: Input.pointer.y, moved: false };
    const g = this.swipe;
    if (g && (Input.pointer.down || Input.held('pointer'))) {
      const dx = Input.pointer.x - g.x0, dy = Input.pointer.y - g.y0;
      if (!g.moved && Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.15) {
        g.moved = true;
        this.step(dx < 0 ? 1 : -1);
      }
    } else if (g) {
      this.swipe = null;
      if (!g.moved) this.close();
    }
    if (Input.pressed('right') || Input.pressed('down')) this.step(1);
    else if (Input.pressed('left') || Input.pressed('up')) this.step(-1);
    else if (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('jump') || Input.pressed('ability')) this.close();
    return true;
  }

  /** How much of the room shows: fading down on the way in, back up on the way out. */
  roomAlpha() {
    if (this.state === 'in') return this.t < ROOM_FADE ? 1 - smooth(clamp(this.t / ROOM_FADE)) : 0;
    if (this.state === 'out') {
      return this.t <= OUT_FADE + OUT_GAP ? 0
        : smooth(clamp((this.t - OUT_FADE - OUT_GAP) / (OUT_TOTAL - OUT_FADE - OUT_GAP)));
    }
    return this.state ? 0 : 1;
  }

  visualAlpha() {
    if (this.state === 'in') {
      return this.t <= ROOM_FADE + GAP ? 0 : smooth(clamp((this.t - ROOM_FADE - GAP) / (IN_TOTAL - ROOM_FADE - GAP)));
    }
    if (this.state === 'out') return this.t < OUT_FADE ? 1 - smooth(clamp(this.t / OUT_FADE)) : 0;
    return this.state ? 1 : 0;
  }

  /** The picture while it is up: the room (drawRoom) under its fade to black, then the visualiser. */
  draw(ctx, drawRoom) {
    const roomA = this.roomAlpha();
    if (roomA > 0) {
      drawRoom(ctx);
      ctx.save();
      ctx.globalAlpha = 1 - roomA;
      ctx.fillStyle = '#0b0b14';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0b0b14';
      ctx.fillRect(0, 0, W, H);
    }
    const visA = this.visualAlpha();
    if (visA <= 0 || !this.preset) return;
    // on the device-density overlay, as the jukebox draws it (menus.js draw)
    const surface = (s) => this.drawSurface(s, visA);
    if (!pushOverlayDraw(surface)) surface(ctx);
  }

  drawSurface(surface, visA) {
    surface.save();
    // `frameAlpha` tells a preset the weight it is painted at, for the parts of it that set
    // globalAlpha themselves (menus.js)
    const paint = (preset, alpha) => {
      surface.globalAlpha = alpha;
      preset.frameAlpha = alpha;
      preset.draw(surface);
      preset.frameAlpha = 1;
    };
    if (this.previous && this.switchT > 0) {
      const p = 1 - this.switchT / SWITCH_S;
      paint(this.previous, visA * (1 - p));
      paint(this.preset, visA * p);
    } else paint(this.preset, visA);
    surface.restore();
    // the song bottom left, the visualiser bottom right (stacked and centred on a tall screen),
    // clear of the corners and the notch, gone after LABEL_HOLD_S
    const fade = 1 - smooth(clamp((this.labelT - LABEL_HOLD_S) / 1));
    if (fade <= 0) return;
    const tall = visualiserFrame.bottom - visualiserFrame.top > (visualiserFrame.right - visualiserFrame.left) * 1.35;
    const scale = tall ? 1.05 : 0.82;
    const inset = tall ? 10 : 24;
    const song = this.title || 'NOW PLAYING';
    const vis = this.shownLabel || '';
    const left = visualiserFrame.left + inset + screen.safeLeft;
    const right = visualiserFrame.right - inset - screen.safeRight;
    const room = Math.max(32, right - left);
    const fit = (label) => {
      const w = textWidth(label, scale);
      if (w <= room) return label;
      return `${label.slice(0, Math.max(4, Math.floor(label.length * room / w) - 1))}…`;
    };
    const a = fit(song), b = fit(vis);
    const aw = textWidth(a, scale), bw = textWidth(b, scale);
    const ax = tall ? Math.max(left, (left + right - aw) / 2) : Math.max(inset, left);
    const bx = tall ? Math.max(left, (left + right - bw) / 2) : Math.min(W - inset - bw, right - bw);
    const y = (tall ? Math.min(H - 25, visualiserFrame.bottom - 28) : Math.min(H - 14, visualiserFrame.bottom - 14)) - screen.safeBottom;
    const by = tall ? y + 14 : y;
    surface.save();
    surface.globalAlpha = visA * fade * 0.92;
    drawText(surface, a, ax + 1, y + 1, '#02030a', scale);
    drawText(surface, b, bx + 1, by + 1, '#02030a', scale);
    drawText(surface, a, ax, y, '#f4f1fa', scale);
    drawText(surface, b, bx, by, '#48e0c8', scale);
    surface.restore();
  }
}
