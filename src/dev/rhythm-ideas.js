// RHYTHM BANKRUPTCY — more of the beat city (BAKE-OFF IDEAS, not wired into the
// game). Peter, 24 Sep 2026: "Create more ideas for the first 3 cabinets as well…
// background items, lane items, more animated background items would be nice. For
// the rhythm cabinet, lane items might be music related perhaps… for the background
// we have the lcd stuff so fitting in more may be difficult but stay in theme and
// create bakeoff items…"
//
// Same contract as src/dev/idea-scene.js: each idea is a painter and a PLACE.
//
// BACKGROUND ideas are furniture for the OLED handheld panel, drawn in its own
// grammar — one graphite ink at 1px, the coral as the only lit colour, 2px cells for
// pictures and 1px print for type, no washes or eased motion. Everything steps on
// the heard beat (`info.beat`, never wall time) and every position a figure can take
// is printed faintly as a ghost segment, with the live one in solid ink. Each is
// authored against rhythm-1's layout (LCD_CITY_SCENES[1], restated below) and names
// the roof it is for. Where an idea proposes REPLACING a board or a crown, the
// preview paints the sky back over the shipped one first (see `skyPatch`) — that is
// a preview device, not how it would ship: shipped, it is a line of scene data.
//
// LANE and AIR ideas are ordinary cartoon props standing on the LCD road beside the
// hero, in the shipped hazards' flat-fill-and-soft-contour language
// (sprites/props.js), and they move on the beat the way beatBar pumps with it:
// continuous inside a beat but locked to it, so they read as quantised.
import { GROUND_Y } from '../engine/camera.js';
import { pixelGlyph } from '../engine/sprites.js';
import { OUTLINE, plain, rr } from '../sprites/props.js';

const TAU = Math.PI * 2;
const mod = (n, d) => ((n % d) + d) % d;

// ---- the panel's inks (stylePacks/index.js, lcdPack) ----------------------
const INK = '#3c3f45';                          // LCD_INK
const PRINT = 'rgba(60,63,69,0.72)';            // LCD_PRINT
const PRINT_SOFT = 'rgba(80,85,92,0.48)';       // LCD_PRINT_SOFT
const WASH = 'rgba(60,63,69,0.07)';             // LCD_FACADE_WASH
const GHOST = 'rgba(80,85,92,0.12)';            // LCD_MOTION_GHOST — a segment that is off
const OFF = 'rgba(80,85,92,0.24)';              // LCD_WINDOW_OFF
const CORAL = '#d35b43';                        // LCD_WINDOW_LIT
const CORAL_ON = 'rgba(211,91,67,0.82)';        // LCD_WINDOW_ON
const LIT = '#dce49a';                          // LCD_PANEL_LIT
const RIM = 'rgba(220,228,154,0.45)';           // a board's lit inner rim
const GLOW = [[3, 'rgba(211,91,67,0.07)'], [2, 'rgba(211,91,67,0.16)'], [1, 'rgba(211,91,67,0.38)']];
// The billboards' own lit inks (LCD_BILLBOARD_ART), and an unlit cell on a dark board.
const S_GREEN = '#b9cf79', S_CREAM = '#e1d68c', S_TAN = '#d4a35e', S_BROWN = '#8a5a35', GOLD = '#f6d33c';
const S_GHOST = 'rgba(220,228,154,0.16)';
// The little people on the panel wear the runner's and the washer's spot colours.
const SKIN = '#f2c9a0', OVERALLS = '#22608c', SHIRT = '#2ea8a0';

// ---- rhythm-1, as authored (LCD_CITY_SCENES[1]) ---------------------------
// [x, w, h, style]; a roof is GROUND_Y - h. 0 clock tower, 1 combo board, 2 the
// transmitter, 3 invader board, 4 the smokestacks, 5 burger board, 6 cassette board.
// The gorilla's girder tower stands between 3 and 4. Walls sit on lattice rules; every
// gap is 12.
const CITY = [
  [17, 36, 149, 'clockworks'], [65, 51, 101, 'storefront'], [128, 36, 125, 'deco'],
  [176, 36, 95, 'fire-escape'], [323, 51, 113, 'office'], [386, 36, 74, 'storefront'],
  [434, 36, 89, 'workshop'],
];
const roofOf = (i) => GROUND_Y - CITY[i][2];
const midOf = (i) => Math.round(CITY[i][0] + CITY[i][1] / 2);
// The plane's lane over this end of the skyline (lcdPlaneAt): it climbs from y 56 at
// the left edge to cruise at 44, twelve tall. Nothing here may stand in it.

// ---- beat helpers ---------------------------------------------------------
function beatOf(info) {
  const b = Number.isFinite(info?.beat) ? info.beat : 0;
  const n = Math.floor(b);
  return { b, n, frac: b - n, beat4: mod(n, 4), bar: Math.floor(n / 4), sub: (k) => Math.floor(b * k) };
}
// A kick: 1 on the beat, falling away through it. Lane props ride this so they read
// as struck on the beat rather than as bobbing.
const kickOf = (frac, k = 6) => Math.exp(-k * frac);

// ---- panel painting helpers ----------------------------------------------
// The sky, restored over a shipped board or crown the idea replaces. Rhythm-1's
// phase-0 pair, over the same 0..GROUND_Y span skyGrad paints.
let skyGradient = null;
function skyPatch(ctx, x, y, w, h) {
  if (!skyGradient) {
    skyGradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    skyGradient.addColorStop(0, '#e7e7a3');
    skyGradient.addColorStop(1, '#a8cf8a');
  }
  ctx.fillStyle = skyGradient;
  ctx.fillRect(x, y, w, h);
}
// The shipped board on building i (11x8 or 13x8 art at 2px, 8px of legs), erased.
function clearBoard(ctx, i, cols = 11, rows = 8) {
  const cx = midOf(i), roof = roofOf(i);
  const pw = cols * 2 + 8, ph = rows * 2 + 8;
  skyPatch(ctx, cx - Math.round(pw / 2), roof - 8 - ph - 1, pw + 1, ph + 9);
}
// A billboard exactly as the panel stands one (lcdBoardFrame): 1px legs, a brace
// leg to leg, the dark panel and its lit inner rim.
function boardFrame(ctx, i, pw, ph) {
  const cx = midOf(i), roof = roofOf(i);
  const left = cx - Math.round(pw / 2), top = roof - 8 - ph;
  ctx.fillStyle = PRINT;
  ctx.fillRect(cx - 8, roof - 8, 1, 8);
  ctx.fillRect(cx + 7, roof - 8, 1, 8);
  ctx.fillRect(cx - 8, roof - 4, 16, 1);
  ctx.fillRect(left, top, pw, ph);
  ctx.strokeStyle = RIM;
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 1.5, top + 1.5, pw - 3, ph - 3);
  return { cx, left, top, roof };
}
// A string grid of cells, one ink per character ('.' and unknown keys are skipped).
function cells(ctx, rows, x, y, inks, cell = 2) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ink = inks[row[c]];
      if (!ink) continue;
      ctx.fillStyle = ink;
      ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
    }
  }
}
// A lit coral cell with the OLED's three rings of falloff (LCD_GLOW), as a window.
function litCell(ctx, x, y, w, h, ink = CORAL) {
  for (const [pad, colour] of GLOW) {
    ctx.fillStyle = colour;
    ctx.fillRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
  }
  ctx.fillStyle = ink;
  ctx.fillRect(x, y, w, h);
}
// A 1px pixel line, stepped — the panel's one way of drawing a diagonal.
function pxLine(ctx, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  let lx = null, ly = null;
  for (let i = 0; i <= n; i++) {
    const px = Math.round(x0 + (x1 - x0) * i / n), py = Math.round(y0 + (y1 - y0) * i / n);
    if (px === lx && py === ly) continue;
    ctx.fillRect(px, py, 1, 1);
    lx = px; ly = py;
  }
}
// The 5x7 font at `scale` px a cell, left edge x, top y. The font has no `$`; this does.
const EXTRA_GLYPHS = {
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
};
function glyphRows(ch) { return EXTRA_GLYPHS[ch] || pixelGlyph(ch); }
function printText(ctx, text, x, y, scale = 1, track = 1) {
  let cx = x;
  for (const ch of text) {
    const rows = ch === ' ' ? null : glyphRows(ch);
    if (rows) {
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < 5; c++) if (rows[r][c] === '1') ctx.fillRect(cx + c * scale, y + r * scale, scale, scale);
      }
    }
    cx += (5 + track) * scale;
  }
}
const textW = (text, scale = 1, track = 1) => text.length * (5 + track) * scale - track * scale;

// ======================================================================= bg

// ---- the rooftop DJ, on the clock tower --------------------------------------
// Arm poses as rect lists, relative to the figure's centre column. The DJ stands
// between his decks behind the booth, so only what is above the booth top shows.
// [dx, dy, w, h] off his centre column and the roof line; hands are [dx, dy].
const DJ_ARMS = {
  decks: [[-5, -11, 2, 1], [-6, -10, 1, 1], [3, -11, 2, 1], [5, -10, 1, 1]],
  up: [[-4, -18, 1, 6], [3, -18, 1, 6]],
  one: [[-5, -11, 2, 1], [-6, -10, 1, 1], [3, -18, 1, 6]],
  ear: [[-4, -15, 1, 3], [3, -11, 2, 1], [5, -10, 1, 1]],
};
const DJ_HANDS = {
  decks: [[-7, -9], [5, -9]],
  up: [[-4, -20], [3, -20]],
  one: [[-7, -9], [3, -20]],
  ear: [[-4, -16], [5, -9]],
};
const DJ_BARS = [
  ['up', 'decks', 'one', 'decks'],
  ['up', 'decks', 'one', 'decks'],
  ['up', 'decks', 'up', 'decks'],
  ['ear', 'decks', 'ear', 'up'],
];
const NOTE_8 = ['..X..', '..XX.', '..X.X', '..X..', 'XXX..', 'XXX..'];
function djRoof(ctx, t, camX, info) {
  const { beat4, bar } = beatOf(info);
  const x0 = CITY[0][0], roof = roofOf(0), cx = midOf(0);
  ctx.save();
  // The clockworks crown (two nubs) gives way: the roof carries one thing.
  skyPatch(ctx, x0 + 1, roof - 4, CITY[0][1] - 1, 4);
  // The booth: a one-pixel box on the roof in the wall's own wash, like the plant's
  // boiler house.
  const bx = cx - 11, bw = 23, by = roof - 6;
  ctx.fillStyle = WASH;
  ctx.fillRect(bx, by, bw, 6);
  ctx.fillStyle = PRINT;
  ctx.fillRect(bx, by, bw, 1);
  ctx.fillRect(bx, by, 1, 6);
  ctx.fillRect(bx + bw - 1, by, 1, 6);
  // The figure, behind it: every arm pose printed as a ghost, the live one in colour.
  const pose = DJ_BARS[mod(bar, 4)][beat4];
  ctx.fillStyle = GHOST;
  for (const k of Object.keys(DJ_ARMS)) {
    for (const [dx, dy, w, h] of DJ_ARMS[k]) ctx.fillRect(cx + dx, roof + dy, w, h);
    for (const [dx, dy] of DJ_HANDS[k]) ctx.fillRect(cx + dx, roof + dy, 2, 1);
  }
  ctx.fillStyle = SHIRT;
  ctx.fillRect(cx - 3, roof - 12, 6, 6);
  for (const [dx, dy, w, h] of DJ_ARMS[pose]) ctx.fillRect(cx + dx, roof + dy, w, h);
  ctx.fillStyle = SKIN;
  for (const [dx, dy] of DJ_HANDS[pose]) ctx.fillRect(cx + dx, roof + dy, 2, 1);
  ctx.fillRect(cx - 2, roof - 16, 4, 4);
  // Shades and the cans: a band over the crown and a cup either side.
  ctx.fillStyle = PRINT;
  ctx.fillRect(cx - 2, roof - 15, 4, 1);
  ctx.fillRect(cx - 2, roof - 17, 4, 1);
  ctx.fillRect(cx - 3, roof - 16, 1, 2);
  ctx.fillRect(cx + 2, roof - 16, 1, 2);
  // Two decks on the booth top: flat platters, the one he is working lit on the beat.
  for (const [dx, lit] of [[-9, beat4 % 2 === 1], [3, beat4 % 2 === 0]]) {
    ctx.fillStyle = PRINT_SOFT;
    ctx.fillRect(cx + dx + 1, by - 2, 5, 1);
    ctx.fillRect(cx + dx, by - 1, 7, 1);
    ctx.fillStyle = lit ? CORAL_ON : OFF;
    ctx.fillRect(cx + dx + 3, by - 2, 1, 1);
  }
  // The booth's face is a four-step sequencer: a cell a beat, the live one lit.
  for (let k = 0; k < 4; k++) {
    const sx = bx + 3 + k * 5, sy = by + 2;
    if (k === beat4) litCell(ctx, sx, sy, 3, 2);
    else { ctx.fillStyle = OFF; ctx.fillRect(sx, sy, 3, 2); }
  }
  // A note leaves the right-hand deck and walks out over the gap to the combo roof,
  // one position a beat, its three positions printed.
  const notes = [[cx + 12, roof - 14], [cx + 18, roof - 17], [cx + 24, roof - 14]];
  notes.forEach(([nx, ny], i) => cells(ctx, NOTE_8, nx, ny, { X: i === beat4 - 1 ? PRINT : GHOST }, 1));
  ctx.restore();
}

// ---- a metronome on the burger roof ---------------------------------------
// A pyramid case stepped in a pixel at a time (the transmitter's legs are drawn the
// same way — the panel owns no diagonals but its pixel ones), and a pendulum whose
// five positions are all printed. It steps on the sixteenth and reaches each end on
// the beat, which is exactly where a metronome ticks.
const MET_ANGLES = [-0.42, -0.21, 0, 0.21, 0.42];
const MET_SWING = [0, 1, 2, 3, 4, 3, 2, 1];
function metronomeRoof(ctx, t, camX, info) {
  const { sub, beat4 } = beatOf(info);
  const cx = midOf(5), roof = roofOf(5);
  ctx.save();
  clearBoard(ctx, 5);
  // The plinth, full roof width bar a pixel of parapet either side.
  const plinthTop = roof - 4;
  ctx.fillStyle = WASH;
  ctx.fillRect(cx - 15, plinthTop, 30, 4);
  ctx.fillStyle = PRINT;
  ctx.fillRect(cx - 15, plinthTop, 30, 1);
  ctx.fillRect(cx - 15, plinthTop, 1, 4);
  ctx.fillRect(cx + 14, plinthTop, 1, 4);
  // The case: the wall's wash inside, the print on the stepped edge.
  const top = roof - 46, bot = plinthTop - 1;
  const hw = (y) => 4 + Math.round(9 * (y - top) / (bot - top));
  for (let y = top; y <= bot; y++) {
    const h = hw(y);
    ctx.fillStyle = WASH;
    ctx.fillRect(cx - h, y, h * 2, 1);
    ctx.fillStyle = PRINT;
    ctx.fillRect(cx - h, y, 1, 1);
    ctx.fillRect(cx + h - 1, y, 1, 1);
    if (y > top && hw(y - 1) !== h) {
      ctx.fillRect(cx - h, y, h - hw(y - 1) + 1, 1);
      ctx.fillRect(cx + hw(y - 1) - 1, y, h - hw(y - 1) + 1, 1);
    }
  }
  // Cap and finial.
  ctx.fillRect(cx - 5, top - 1, 10, 1);
  ctx.fillRect(cx - 1, top - 3, 2, 2);
  // The scale plate the rod swings in front of: a narrower stepped slot, ticked on
  // the lattice.
  const sTop = top + 5, sBot = bot - 8;
  const sw = (y) => 1 + Math.round(3 * (y - sTop) / (sBot - sTop));
  ctx.fillStyle = PRINT_SOFT;
  for (let y = sTop; y <= sBot; y++) {
    ctx.fillRect(cx - sw(y) - 1, y, 1, 1);
    ctx.fillRect(cx + sw(y), y, 1, 1);
  }
  ctx.fillRect(cx - sw(sTop) - 1, sTop, sw(sTop) * 2 + 2, 1);
  for (let y = sTop + 3; y < sBot - 1; y += 3) ctx.fillRect(cx - sw(y), y, 2, 1);
  // The winding key, out of the right-hand face.
  const ky = bot - 12;
  ctx.fillStyle = PRINT;
  ctx.fillRect(cx + hw(ky), ky, 2, 1);
  ctx.fillRect(cx + hw(ky) + 2, ky - 2, 1, 5);
  // The pendulum, all five positions printed, the live one inked with its weight lit.
  const px = cx - 0.5, py = bot - 5, L = 47, W_AT = 31;
  const live = MET_SWING[mod(sub(4), 8)];
  MET_ANGLES.forEach((a, i) => {
    if (i === live) return;
    const tx = px + Math.sin(a) * L, ty = py - Math.cos(a) * L;
    ctx.fillStyle = GHOST;
    pxLine(ctx, Math.round(px), py, Math.round(tx), Math.round(ty));
    const wx = Math.round(px + Math.sin(a) * W_AT), wy = Math.round(py - Math.cos(a) * W_AT);
    ctx.fillRect(wx - 2, wy - 1, 4, 3);
  });
  {
    const a = MET_ANGLES[live];
    ctx.fillStyle = INK;
    pxLine(ctx, Math.round(px), py, Math.round(px + Math.sin(a) * L), Math.round(py - Math.cos(a) * L));
    const wx = Math.round(px + Math.sin(a) * W_AT), wy = Math.round(py - Math.cos(a) * W_AT);
    ctx.fillStyle = CORAL;
    ctx.fillRect(wx - 2, wy - 1, 4, 3);
  }
  ctx.fillStyle = PRINT;
  ctx.fillRect(Math.round(px) - 1, py - 1, 3, 3);
  // The bell: the bar's one, lit in the plinth.
  if (beat4 === 0 && live === 0) litCell(ctx, cx - 2, plinthTop + 1, 4, 2);
  else { ctx.fillStyle = OFF; ctx.fillRect(cx - 2, plinthTop + 1, 4, 2); }
  ctx.restore();
}

// ---- a graphic equaliser on the burger board --------------------------------
// Seven bands of five segments on a 3px pitch, every segment printed; the level
// steps on the beat off an authored table and the PEAK holds a beat, then falls a
// segment a beat, in coral — the one thing a real EQ does that a bar chart does not.
const EQ_TABLE = [
  [5, 2, 4, 2, 5, 3, 4, 2, 5, 2, 4, 3, 5, 3, 5, 2],
  [4, 3, 3, 2, 4, 2, 3, 3, 4, 3, 3, 2, 5, 2, 4, 2],
  [2, 4, 3, 4, 2, 3, 4, 2, 3, 4, 2, 4, 3, 2, 4, 3],
  [3, 2, 4, 3, 1, 4, 2, 3, 3, 1, 4, 2, 3, 4, 2, 3],
  [1, 3, 2, 4, 2, 1, 3, 2, 1, 3, 2, 4, 2, 3, 1, 2],
  [2, 1, 3, 1, 3, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1],
  [1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1],
];
function eqLevel(band, n) { return EQ_TABLE[band][mod(n, 16)]; }
function eqPeak(band, n) {
  let p = 0;
  for (let j = 0; j <= 5; j++) p = Math.max(p, eqLevel(band, n - j) - Math.max(0, j - 1));
  return p;
}
function eqBoard(ctx, t, camX, info) {
  const { n } = beatOf(info);
  ctx.save();
  clearBoard(ctx, 5);
  const { left, top } = boardFrame(ctx, 5, 35, 22);
  for (let band = 0; band < 7; band++) {
    const level = eqLevel(band, n), peak = eqPeak(band, n);
    const x = left + 4 + band * 4;
    for (let s = 0; s < 5; s++) {
      const y = top + 4 + (4 - s) * 3;
      let ink = S_GHOST;
      if (s < level) ink = s === level - 1 ? S_CREAM : S_GREEN;
      else if (s === peak - 1) ink = CORAL;
      ctx.fillStyle = ink;
      ctx.fillRect(x, y, 3, 2);
    }
  }
  ctx.restore();
}

// ---- a VU meter on the burger board ------------------------------------------
// The needle's five positions are printed on the face and the live one is lit, so
// the meter is an LCD segment set rather than an animation: it swings up on
// the beat and drops back on the off-beat, and kicks into the red on the one.
const VU_ANGLES = [-0.95, -0.5, -0.05, 0.4, 0.85];
const VU_SEQ = [4, 1, 2, 0, 3, 1, 2, 1, 4, 1, 3, 0, 3, 2, 4, 1];
function vuBoard(ctx, t, camX, info) {
  const { sub } = beatOf(info);
  ctx.save();
  clearBoard(ctx, 5);
  const { cx, left, top } = boardFrame(ctx, 5, 34, 24);
  const px = cx, py = top + 21, R = 15;
  // The scale: dots round the arc, heavier at the marks, the top end in coral.
  for (let k = 0; k <= 12; k++) {
    const a = -1.05 + (2.1 * k) / 12;
    const x = Math.round(px + Math.sin(a) * R), y = Math.round(py - Math.cos(a) * R);
    ctx.fillStyle = a > 0.55 ? CORAL : S_CREAM;
    ctx.fillRect(x, y, 1, k % 3 === 0 ? 2 : 1);
  }
  // The needles: all printed, one lit.
  const live = VU_SEQ[mod(sub(2), 16)];
  VU_ANGLES.forEach((a, i) => {
    ctx.fillStyle = i === live ? (i === 4 ? CORAL : LIT) : S_GHOST;
    pxLine(ctx, px, py - 2, Math.round(px + Math.sin(a) * (R - 3)), Math.round(py - Math.cos(a) * (R - 3)));
  });
  // The pivot boss, and the PEAK lamp, lit while the needle is in the red.
  ctx.fillStyle = S_TAN;
  ctx.fillRect(px - 2, py - 2, 4, 2);
  ctx.fillStyle = live === 4 ? CORAL : S_GHOST;
  ctx.fillRect(left + 27, top + 4, 3, 2);
  ctx.restore();
}

// ---- a turntable on the burger roof --------------------------------------
// The record from above on a squarer board. Concentric grooves cannot show a turn,
// so the LABEL carries it: its eight rim cells are the eight positions and one is
// lit, stepping on the eighth note — thirty-one turns a minute at this tempo, a
// hair under the real thirty-three. The sheen does NOT turn: it is a reflection.
const REC_N = 11;
const REC_RING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const REC_ARM = [[12, 2], [12, 3], [11, 4], [11, 5], [10, 6]];
function recordBoard(ctx, t, camX, info) {
  const { sub } = beatOf(info);
  ctx.save();
  clearBoard(ctx, 5);
  const { left, top } = boardFrame(ctx, 5, 34, 30);
  const ox = left + 4, oy = top + 4, C = 5;
  for (let r = 0; r < REC_N; r++) {
    for (let c = 0; c < REC_N; c++) {
      const d = Math.hypot(c - C, r - C);
      if (d > 5.45) continue;
      let ink = S_GREEN;
      if ((d > 2.3 && d < 2.95) || (d > 3.75 && d < 4.35)) ink = 'rgba(185,207,121,0.42)';
      const ang = Math.atan2(r - C, c - C);
      if (d > 2 && d < 5 && Math.abs(Math.sin(ang + Math.PI / 4)) < 0.28) ink = S_CREAM;
      if (d < 1.5) ink = CORAL;
      if (d < 0.5) ink = null;
      if (!ink) continue;
      ctx.fillStyle = ink;
      ctx.fillRect(ox + c * 2, oy + r * 2, 2, 2);
    }
  }
  const [mx, my] = REC_RING[mod(sub(2), 8)];
  ctx.fillStyle = LIT;
  ctx.fillRect(ox + (C + mx) * 2, oy + (C + my) * 2, 2, 2);
  // The tonearm from its pivot in the corner, head down in the run-in groove.
  ctx.fillStyle = S_TAN;
  ctx.fillRect(ox + 11 * 2, oy, 4, 4);
  ctx.fillStyle = S_CREAM;
  for (const [c, r] of REC_ARM) ctx.fillRect(ox + c * 2, oy + r * 2, 2, 2);
  ctx.fillStyle = LIT;
  ctx.fillRect(ox + 9 * 2, oy + 7 * 2, 4, 2);
  ctx.restore();
}

// ---- the royalty board -----------------------------------------------------
// "YOU OWE ME ROYALTIES PER JUMP." A dollar and a stack that takes a coin on every
// beat — all four coin positions printed — and on the bar line the stack is swept
// into his pocket and the dollar rings coral.
// A coin seen edge-on: its lit milled rim over the shaded underside, so a column of
// them reads as a stack rather than as one gold bar.
const COIN = ['GGGGG', '.TTT.'];
function royaltyBoard(ctx, t, camX, info) {
  const { beat4, frac } = beatOf(info);
  ctx.save();
  clearBoard(ctx, 5);
  const { left, top } = boardFrame(ctx, 5, 30, 24);
  const ox = left + 4, oy = top + 4;
  // The dollar, 2px cells, cream — and coral on the one, when the stack goes.
  ctx.fillStyle = beat4 === 0 ? CORAL : S_CREAM;
  printText(ctx, '$', ox, oy + 1, 2);
  // The stack: four coins, every one printed as a ghost, filled to the beat — and the
  // coin that has just landed flashes the panel's lit cream for the first half-beat.
  for (let k = 0; k < 4; k++) {
    const y = oy + 12 - k * 4;
    const on = k <= beat4;
    const fresh = on && k === beat4 && frac < 0.5;
    const ink = !on ? { G: S_GHOST, T: S_GHOST } : fresh ? { G: LIT, T: S_TAN } : { G: GOLD, T: S_TAN };
    cells(ctx, COIN, ox + 12, y, ink, 2);
  }
  ctx.restore();
}

// ---- a blimp that asks for the money ---------------------------------------
// An outlined airship holding station over the low end of the skyline, carrying a
// board on its flank that flips a WORD a beat — the villain's taunt in the plane
// banner's 1px letters. Two bars to a sentence; a pixel of bob on the bar, like the
// clouds; the propeller's two blur poses swap on the beat, like the plane's tail.
const BLIMP_WORDS = ['YOU', 'OWE', 'ME', 'ROYAL', '-TIES', 'PER', 'JUMP', '$$$'];
const BLIMP_BODY = [[0, 8], [3, 4], [9, 1], [15, 0], [39, 0], [45, 1], [51, 4], [54, 8],
  [51, 12], [45, 15], [39, 16], [15, 16], [9, 15], [3, 12]];
function blimp(ctx, t, camX, info) {
  const { n, beat4, bar } = beatOf(info);
  const x = 402 + [0, -1, -2, -1][mod(Math.floor(bar / 2), 4)];
  const y = 66 + [0, 1, 0, -1][mod(bar, 4)];
  ctx.save();
  ctx.lineWidth = 1;
  // Tail fins first, so the envelope's outline runs over their roots.
  ctx.strokeStyle = PRINT;
  ctx.fillStyle = WASH;
  for (const fin of [[[49, 3], [55, -2], [59, -2], [57, 6]], [[49, 13], [55, 18], [59, 18], [57, 10]]]) {
    ctx.beginPath();
    fin.forEach(([px, py], i) => (i ? ctx.lineTo(x + px + 0.5, y + py + 0.5) : ctx.moveTo(x + px + 0.5, y + py + 0.5)));
    ctx.fill(); ctx.stroke();
  }
  // The envelope: the wall's wash, the print.
  ctx.beginPath();
  BLIMP_BODY.forEach(([px, py], i) => (i ? ctx.lineTo(x + px + 0.5, y + py + 0.5) : ctx.moveTo(x + px + 0.5, y + py + 0.5)));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The gondola, slung under the middle on two struts, windows as ghost cells.
  ctx.fillStyle = PRINT;
  ctx.fillRect(x + 22, y + 17, 1, 2);
  ctx.fillRect(x + 31, y + 17, 1, 2);
  ctx.strokeStyle = PRINT;
  ctx.strokeRect(x + 20.5, y + 19.5, 13, 4);
  ctx.fillStyle = OFF;
  for (let k = 0; k < 3; k++) ctx.fillRect(x + 22 + k * 4, y + 21, 2, 2);
  // The propeller at the tail: a long blur and a short one, swapped on the beat.
  ctx.fillStyle = PRINT_SOFT;
  if (beat4 % 2 === 0) ctx.fillRect(x + 61, y + 4, 1, 9);
  else ctx.fillRect(x + 61, y + 6, 1, 5);
  ctx.fillStyle = PRINT;
  ctx.fillRect(x + 58, y + 8, 3, 1);
  // The flank board: dark panel, lit rim, one word a beat, centred.
  const bx = x + 12, by = y + 3, bw = 33, bh = 11;
  ctx.fillStyle = PRINT;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = RIM;
  ctx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
  const word = BLIMP_WORDS[mod(n, BLIMP_WORDS.length)];
  ctx.fillStyle = word === '$$$' ? CORAL : LIT;
  printText(ctx, word, bx + Math.round((bw - textW(word)) / 2), by + 2);
  // A nose lamp, lit on the one, like the plane's.
  ctx.fillStyle = beat4 === 0 ? CORAL_ON : OFF;
  ctx.fillRect(x + 1, y + 7, 2, 2);
  ctx.restore();
}

// ---- fireworks on the bar line ----------------------------------------------
// A shell per bar, alternating between two launches behind the low roofs. The trail
// climbs on three and four, the shell BREAKS ON THE ONE, spreads on two and falls
// on three — and every cell a burst can light is printed in the sky as a ghost, the
// way an LCD handheld prints its whole playfield.
const FW_SITES = [[402, 88, 122], [452, 72, 106]];   // [x, burst y, trail foot]
const FW_DIRS = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos(k * Math.PI / 4), Math.sin(k * Math.PI / 4)]);
// A spoke segment from r0 to r1 along direction d, as pixel runs.
function fwSpoke(ctx, x, y, [dx, dy], r0, r1, droop = 0) {
  pxLine(ctx, Math.round(x + dx * r0), Math.round(y + dy * r0), Math.round(x + dx * r1), Math.round(y + dy * r1 + droop));
}
function fireworks(ctx, t, camX, info) {
  const { beat4, bar } = beatOf(info);
  ctx.save();
  FW_SITES.forEach(([x, by, foot], site) => {
    const trail = [];
    for (let y = foot - 4; y > by + 8; y -= 5) trail.push(y);
    // The whole playfield, faint: the trail's dashes, both rings of spokes, the sparks.
    ctx.fillStyle = GHOST;
    for (const y of trail) ctx.fillRect(x, y, 1, 3);
    for (const d of FW_DIRS) {
      fwSpoke(ctx, x, by, d, 3, 6);
      fwSpoke(ctx, x, by, d, 9, 13);
      ctx.fillRect(Math.round(x + d[0] * 15), Math.round(by + d[1] * 15 + 4), 1, 2);
    }
    // Even bars break here, odd bars at the other site; each climbs the bar before.
    const mine = mod(bar, 2) === site;
    const next = mod(bar + 1, 2) === site;
    if (next && beat4 >= 2) {
      const half = Math.ceil(trail.length / 2);
      ctx.fillStyle = PRINT;
      for (const y of (beat4 === 2 ? trail.slice(0, half) : trail.slice(half))) ctx.fillRect(x, y, 1, 3);
    }
    if (!mine) return;
    if (beat4 === 0) {
      // THE BREAK, on the one: a lit heart and the inner spokes, glowing.
      litCell(ctx, x - 1, by - 1, 3, 3);
      ctx.fillStyle = CORAL;
      for (const d of FW_DIRS) fwSpoke(ctx, x, by, d, 3, 6);
    } else if (beat4 === 1) {
      ctx.fillStyle = CORAL_ON;
      for (const d of FW_DIRS) fwSpoke(ctx, x, by, d, 9, 13);
    } else if (beat4 === 2) {
      ctx.fillStyle = PRINT_SOFT;
      for (const d of FW_DIRS) ctx.fillRect(Math.round(x + d[0] * 15), Math.round(by + d[1] * 15 + 4), 1, 2);
    }
  });
  ctx.restore();
}

// ---- birds on the wires ---------------------------------------------------
// A telegraph pole on the burger roof, wired back to the office next door with five
// lines on lattice rules six apart — a stave. The birds sitting on it are the notes:
// one hops a beat, left to right, so the stave plays its tune. Each bird's hop is
// printed above it as a ghost.
const STAFF_Y = [125, 131, 137, 143, 149];
const BIRDS = [[381, 3], [388, 2], [395, 1], [402, 2], [409, 0]];
const BIRD_SIT = ['.XX....', 'XXXXX..', '.XXXXXX', '..X.X..'];
const BIRD_HOP = ['...X.X.', '.XX.X..', 'XXXXX..', '.XXXXXX'];
function staffBirds(ctx, t, camX, info) {
  const { n } = beatOf(info);
  const poleX = midOf(5) + 11, roof = roofOf(5), wall = CITY[4][0] + CITY[4][1];
  ctx.save();
  clearBoard(ctx, 5);
  // The pole: a 2px timber on the roof, five crossarms, an insulator a wire.
  ctx.fillStyle = PRINT;
  ctx.fillRect(poleX, STAFF_Y[0] - 4, 2, roof - STAFF_Y[0] + 4);
  for (const y of STAFF_Y) {
    ctx.fillRect(poleX - 3, y + 1, 8, 1);
    ctx.fillRect(poleX - 3, y, 1, 1);
  }
  ctx.fillRect(poleX - 1, roof - 1, 4, 1);
  // The wires, taut, and a bracket for each on the office wall.
  ctx.fillStyle = PRINT_SOFT;
  for (const y of STAFF_Y) {
    ctx.fillRect(wall + 1, y, poleX - 3 - wall - 1, 1);
    ctx.fillRect(wall + 1, y - 1, 1, 3);
  }
  // The birds. One hops per beat, walking the stave left to right.
  const live = mod(n, BIRDS.length);
  BIRDS.forEach(([bx, line], i) => {
    const wy = STAFF_Y[line];
    cells(ctx, BIRD_HOP, bx - 3, wy - 7, { X: GHOST }, 1);
    if (i === live) cells(ctx, BIRD_HOP, bx - 3, wy - 7, { X: INK }, 1);
    else cells(ctx, BIRD_SIT, bx - 3, wy - 3, { X: PRINT }, 1);
  });
  ctx.restore();
}

// ---- the smokestack plays ----------------------------------------------------
// The plant's plume, redrawn as notes: the same four authored cells rising and
// leaning downwind, the same fringe-and-core smoke inks and the same beat-stepped
// drift, but the puffs come apart into a crotchet, a quaver and a beamed pair as
// they climb. The idle stub puffs a small note of its own.
const NOTE_PUFFS = [
  ['.XX.', 'XOOX', 'XOOX', '.XX.'],
  ['..O', '..O', '..O', 'OOO', 'OOX'],
  ['..OO.', '..O.O', '..O..', '..O..', 'OOO..', 'OOX..'],
  ['..OOOOO', '..O...O', '..O...O', 'OOO.OOO', 'OOX.OOX'],
];
const NOTE_WISP = [['X', 'X', 'OX'], ['.X', 'OX']];
function puffGrid(ctx, grid, x, y, alpha) {
  for (const [mark, weight] of [['X', 1], ['O', 1.55]]) {
    ctx.fillStyle = `rgba(80,85,92,${Math.min(0.75, alpha * weight).toFixed(2)})`;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) if (grid[r][c] === mark) ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
    }
  }
}
function noteSmoke(ctx, t, camX, info) {
  const { beat4 } = beatOf(info);
  const [x, bw, h] = CITY[4];
  const roof = GROUND_Y - h;
  ctx.save();
  // The shipped plume and wisps, painted out.
  skyPatch(ctx, x - 10, roof - 60, bw + 15, 40);
  skyPatch(ctx, x + 2, roof - 20, 16, 6);
  // lcdSmokestack's own layout: the working stack is the middle of three.
  const shedL = x + 2, shedR = x + bw - 2, SW = 6;
  const gap = Math.round((shedR - shedL - SW * 3) / 4);
  const sx = shedL + gap + (SW + gap), stubX = shedL + gap;
  const at = [[0, -29], [-4, -39], [-12, -49], [-24, -58]];
  for (let i = 0; i < 4; i++) {
    if (i > 0 && (beat4 * 3 + i * 5) % 8 < i) continue;
    const [px, py] = at[i];
    const wob = (((beat4 + i) % 3) - 1) * 2;
    puffGrid(ctx, NOTE_PUFFS[i], sx + px + wob, roof + py, 0.4 - i * 0.06);
  }
  for (let k = 0; k < NOTE_WISP.length; k++) {
    if ((beat4 * 5 + k * 3) % 4 === 1) continue;
    puffGrid(ctx, NOTE_WISP[k], stubX + (k === 0 ? 0 : -4) + (beat4 % 2) * 2, roof - 15 + (k === 0 ? -6 : -14), 0.3 - k * 0.08);
  }
  ctx.restore();
}

// ---- a juggler on the burger roof --------------------------------------------
// The LCD handheld's juggler, on the lowest roof with the most sky over it: three balls
// in a shower — up the right, over the top, down the left and passed back low. Eight
// places, every one printed as a ghost; a step on the eighth note is one lap a bar.
// Each arm has two printed positions — out to throw, in to catch.
const JUG_PATH = [[8, -14], [11, -23], [8, -31], [0, -34], [-8, -31], [-11, -23], [-8, -14], [0, -13]];
const JUG_SHIRT = S_TAN, JUG_HAIR = S_BROWN;
function juggler(ctx, t, camX, info) {
  const { sub } = beatOf(info);
  const cx = midOf(5), roof = roofOf(5);
  ctx.save();
  clearBoard(ctx, 5);
  const s = mod(sub(2), 8);
  const balls = [0, 3, 5].map((o) => JUG_PATH[mod(s + o, 8)]);
  // The playfield: every ball position, faint.
  ctx.fillStyle = GHOST;
  for (const [dx, dy] of JUG_PATH) ctx.fillRect(cx + dx - 1, roof + dy - 1, 3, 3);
  const has = (i) => balls.some(([dx, dy]) => dx === JUG_PATH[i][0] && dy === JUG_PATH[i][1]);
  // The figure: legs apart, trousers, shirt, head and hair.
  ctx.fillStyle = OVERALLS;
  ctx.fillRect(cx - 4, roof - 6, 2, 6);
  ctx.fillRect(cx + 2, roof - 6, 2, 6);
  ctx.fillRect(cx - 4, roof - 8, 8, 2);
  ctx.fillStyle = JUG_SHIRT;
  ctx.fillRect(cx - 4, roof - 13, 8, 5);
  ctx.fillStyle = SKIN;
  ctx.fillRect(cx - 2, roof - 18, 5, 5);
  ctx.fillStyle = JUG_HAIR;
  ctx.fillRect(cx - 2, roof - 19, 5, 2);
  ctx.fillRect(cx - 2, roof - 17, 1, 1);
  // Each arm has two printed positions: out and up to throw, in and low to catch.
  const arms = [
    { up: [[cx + 4, roof - 13, 3, 1], [cx + 7, roof - 15, 1, 2]], low: [[cx + 4, roof - 11, 3, 1], [cx + 7, roof - 12, 1, 1]], hand: [cx + 7, roof - 16, cx + 7, roof - 13], out: has(0) },
    { up: [[cx - 7, roof - 13, 3, 1], [cx - 8, roof - 15, 1, 2]], low: [[cx - 7, roof - 11, 3, 1], [cx - 8, roof - 12, 1, 1]], hand: [cx - 8, roof - 16, cx - 8, roof - 13], out: !has(6) },
  ];
  for (const arm of arms) {
    ctx.fillStyle = GHOST;
    for (const r of [...arm.up, ...arm.low]) ctx.fillRect(...r);
    ctx.fillStyle = JUG_SHIRT;
    for (const r of (arm.out ? arm.up : arm.low)) ctx.fillRect(...r);
    ctx.fillStyle = SKIN;
    const [ux, uy, lx, ly] = arm.hand;
    ctx.fillRect(arm.out ? ux : lx, arm.out ? uy : ly, 1, 1);
  }
  ctx.fillStyle = CORAL;
  for (const [dx, dy] of balls) ctx.fillRect(cx + dx - 1, roof + dy - 1, 3, 3);
  ctx.restore();
}

// ---- a trumpeter on the fire escape ---------------------------------------------
// Building 3 is the fire-escape building, and a fire escape on a summer night has a
// horn player on it. He stands on the second landing facing the gap to the gorilla's
// tower, horn level through the bar and RAISED on the one — both poses printed —
// and a note steps up the gap a beat at a time, its three places printed too.
const HORN_NOTES = [[215, 157], [218, 150], [215, 143]];
function trumpeter(ctx, t, camX, info) {
  const { beat4 } = beatOf(info);
  const [x0, w, h] = CITY[3];
  const top = GROUND_Y - h;
  const landing = top + 27;          // lcdLeanDetail's second row gutter: the rail's landing
  const fx = x0 + w - 11;            // his centre column, on the landing
  const fy = landing - 1;            // feet
  ctx.save();
  const raised = beat4 === 0;
  // The two horn poses, ghosted, then the live one: a brass line from the lips and a
  // two-pixel bell.
  const horn = (up, ink) => {
    ctx.fillStyle = ink;
    if (up) {
      ctx.fillRect(fx + 2, fy - 10, 1, 1); ctx.fillRect(fx + 3, fy - 11, 1, 1);
      ctx.fillRect(fx + 4, fy - 12, 1, 1); ctx.fillRect(fx + 5, fy - 13, 1, 1);
      ctx.fillRect(fx + 6, fy - 15, 2, 3);
    } else {
      ctx.fillRect(fx + 2, fy - 9, 4, 1);
      ctx.fillRect(fx + 6, fy - 10, 2, 3);
    }
  };
  horn(true, GHOST);
  horn(false, GHOST);
  // Him: dark trousers, a blue jacket, his hand at the valves, a hat.
  ctx.fillStyle = PRINT;
  ctx.fillRect(fx - 2, fy - 4, 1, 4);
  ctx.fillRect(fx, fy - 4, 1, 4);
  ctx.fillStyle = OVERALLS;
  ctx.fillRect(fx - 2, fy - 8, 4, 4);
  ctx.fillStyle = SKIN;
  ctx.fillRect(fx - 1, fy - 11, 3, 3);
  ctx.fillRect(fx + 2, fy - 7 - (raised ? 1 : 0), 1, 1);
  ctx.fillStyle = INK;
  ctx.fillRect(fx - 2, fy - 12, 5, 1);
  ctx.fillRect(fx - 1, fy - 13, 3, 1);
  horn(raised, GOLD);
  // The note up the gap.
  HORN_NOTES.forEach(([nx, ny], i) => cells(ctx, NOTE_8, nx, ny, { X: i === beat4 - 1 ? PRINT : GHOST }, 1));
  ctx.restore();
}

// ---- a parachutist onto the burger roof --------------------------------------
// The LCD handheld's parachute drop: one jumper swinging down a printed column of ghost
// positions, a step a beat, landing on the roof ON the bar line with the canopy
// collapsed beside him, then gone. Three bars a jump: seven beats in the air, two on
// the roof, three of empty sky.
const CHUTE_PATH = [[0, 62], [6, 74], [5, 86], [-1, 98], [-6, 110], [-4, 122], [1, 134]];
const CANOPY = ['..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', 'X.X.X.X.X'];
const JUMPER = ['.S.', 'CCC', 'COC', '.O.', 'O.O'];
function drawChutist(ctx, x, y, inks) {
  cells(ctx, CANOPY, x - 4, y - 12, { X: inks.canopy }, 1);
  ctx.fillStyle = inks.line;
  ctx.fillRect(x - 4, y - 8, 1, 2); ctx.fillRect(x - 3, y - 6, 1, 1);
  ctx.fillRect(x + 4, y - 8, 1, 2); ctx.fillRect(x + 3, y - 6, 1, 1);
  cells(ctx, JUMPER, x - 1, y - 5, { S: inks.skin, C: inks.shirt, O: inks.legs }, 1);
}
function parachute(ctx, t, camX, info) {
  const { n } = beatOf(info);
  const cx = midOf(5), roof = roofOf(5);
  ctx.save();
  clearBoard(ctx, 5);
  const step = mod(n, 12);
  const ghost = { canopy: GHOST, line: GHOST, skin: GHOST, shirt: GHOST, legs: GHOST };
  for (const [dx, y] of CHUTE_PATH) drawChutist(ctx, cx + dx, y + 5, ghost);
  // Landed: the jumper on the roof, the canopy down beside him.
  const landX = cx + 1;
  const landed = (inks) => {
    cells(ctx, ['XXXX', 'XXXXXX'], landX + 3, roof - 2, { X: inks.canopy }, 1);
    cells(ctx, JUMPER, landX - 1, roof - 5, { S: inks.skin, C: inks.shirt, O: inks.legs }, 1);
  };
  landed(ghost);
  const live = { canopy: CORAL_ON, line: PRINT, skin: SKIN, shirt: SHIRT, legs: OVERALLS };
  // Steps 1-7 in the air, so step 8 — always a downbeat in a twelve-beat cycle — is
  // the landing.
  if (step >= 1 && step <= CHUTE_PATH.length) {
    const [dx, y] = CHUTE_PATH[step - 1];
    drawChutist(ctx, cx + dx, y + 5, live);
  } else if (step === 8 || step === 9) {
    landed(live);
  }
  ctx.restore();
}

// ===================================================================== lane
//
// World space, ZOOM applied: `x` is the prop's centre, `g` the road it stands on,
// up is negative. The hero is 24 tall; a jump hazard is 12-17; a flyer's box sits
// about 13 over the road. Flat fills and the shared soft contour (props.js OUTLINE),
// with a finer one inside.
const oval = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, TAU);
const box = (x, y, w, h, r = 0) => (c) => rr(c, x, y, w, h, r);
function sh(ctx, fill, path, lw = 0.6, ink = OUTLINE) {
  ctx.beginPath();
  path(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}
// Paint at a fraction of whatever alpha the caller is already at.
function faded(ctx, a, paint) {
  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, a));
  paint();
  ctx.restore();
}
function line(ctx, ink, lw, path) {
  ctx.beginPath();
  path(ctx);
  ctx.lineWidth = lw; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke();
}
// A four-point glint, the prop set's sparkle.
function glint(ctx, x, y, r, ink = '#ffffff') {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fillStyle = ink; ctx.fill();
}
// A little flying note (the boombox's and the tuba's), head at (x, y).
function noteGlyph(ctx, x, y, s, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  sh(ctx, fill, oval(x, y, 1.5 * s, 1.1 * s, -0.4), 0.35 * s);
  plain(ctx, fill, box(x + 1.05 * s, y - 5 * s, 0.55 * s, 5 * s, 0.2 * s));
  plain(ctx, fill, (c) => {
    c.moveTo(x + 1.6 * s, y - 5 * s);
    c.quadraticCurveTo(x + 3.6 * s, y - 3.6 * s, x + 3 * s, y - 1.6 * s);
    c.quadraticCurveTo(x + 2.8 * s, y - 3 * s, x + 1.6 * s, y - 3.4 * s);
    c.closePath();
  });
  ctx.restore();
}

// ---- the metronome hurdle ------------------------------------------------------
const WOOD = '#9a5a2e', WOOD_DARK = '#6e3c1c', WOOD_LIGHT = '#c58450', PLATE = '#f3e4b8';
const BRASS = '#e8b030', BRASS_DARK = '#b07c18', BRASS_LIGHT = '#fff0a8', STEEL = '#8b939e';
function metronomeLane(ctx, t, x, g, info) {
  const { b, frac, beat4 } = beatOf(info);
  ctx.save();
  // A pendulum that reaches each end ON the beat: cosine, so it is quick through the
  // middle and hangs at the ends, which is where the tick is.
  const a = 0.52 * Math.cos(Math.PI * b);
  // Plinth, then the case: a truncated pyramid, the right face a shade darker.
  sh(ctx, WOOD_DARK, box(x - 7.5, g - 2.6, 15, 2.6, 0.8));
  sh(ctx, WOOD, (c) => { c.moveTo(x - 6.2, g - 2.4); c.lineTo(x - 2.3, g - 17); c.lineTo(x + 2.3, g - 17); c.lineTo(x + 6.2, g - 2.4); c.closePath(); });
  plain(ctx, WOOD_DARK, (c) => { c.moveTo(x + 3.4, g - 2.4); c.lineTo(x + 1.3, g - 16.6); c.lineTo(x + 2.2, g - 16.6); c.lineTo(x + 6.1, g - 2.4); c.closePath(); });
  plain(ctx, WOOD_LIGHT, (c) => { c.moveTo(x - 5.4, g - 2.6); c.lineTo(x - 2, g - 16.4); c.lineTo(x - 1.3, g - 16.4); c.lineTo(x - 4.2, g - 2.6); c.closePath(); });
  // Cap and the scale plate with its ticks.
  sh(ctx, WOOD_DARK, box(x - 2.9, g - 18.2, 5.8, 1.6, 0.6), 0.45);
  sh(ctx, PLATE, (c) => { c.moveTo(x - 1.6, g - 15); c.lineTo(x + 1.6, g - 15); c.lineTo(x + 2.4, g - 5.2); c.lineTo(x - 2.4, g - 5.2); c.closePath(); }, 0.35);
  for (let k = 0; k < 6; k++) {
    const yy = g - 14 + k * 1.6;
    plain(ctx, 'rgba(110,60,28,0.55)', box(x - 0.9 - k * 0.12, yy, 1.8 + k * 0.24, 0.35));
  }
  // The pendulum: rod from the pivot, the brass weight two-thirds up.
  const px = x, py = g - 5.6;
  const tip = [px + Math.sin(a) * 19, py - Math.cos(a) * 19];
  line(ctx, 'rgba(26,16,40,0.35)', 1.25, (c) => { c.moveTo(px, py); c.lineTo(tip[0], tip[1]); });
  line(ctx, STEEL, 0.75, (c) => { c.moveTo(px, py); c.lineTo(tip[0], tip[1]); });
  const wx = px + Math.sin(a) * 12.5, wy = py - Math.cos(a) * 12.5;
  ctx.save();
  ctx.translate(wx, wy); ctx.rotate(a);
  sh(ctx, BRASS, (c) => { c.moveTo(-2.1, -1.6); c.lineTo(2.1, -1.6); c.lineTo(1.4, 1.6); c.lineTo(-1.4, 1.6); c.closePath(); }, 0.45);
  plain(ctx, BRASS_LIGHT, box(-1.5, -1.2, 1.2, 1.8, 0.4));
  ctx.restore();
  sh(ctx, BRASS_DARK, oval(px, py, 1.1, 1.1), 0.35);
  // The tick: a flash off the rod's end on every beat, bigger on the one.
  if (frac < 0.22) {
    const k = 1 - frac / 0.22;
    glint(ctx, tip[0], tip[1] - 0.6, (beat4 === 0 ? 3.2 : 2.2) * k, beat4 === 0 ? '#ffe070' : '#ffffff');
  }
  // The winding key.
  sh(ctx, BRASS, box(x + 5.1, g - 8.6, 2.4, 1.2, 0.4), 0.35);
  sh(ctx, BRASS, oval(x + 7.9, g - 8, 1, 1.5), 0.35);
  ctx.restore();
}

// ---- the same metronome, in the panel's own ink ---------------------------------
// An LCD segment set standing in the lane: the stepped case in graphite, the
// five rod positions printed faint, one inked a sixteenth at a time. One world pixel
// is two panel pixels, so its lines are the panel's print at twice the weight.
function metronomeInk(ctx, t, x, g, info) {
  const { sub, beat4 } = beatOf(info);
  ctx.save();
  const P = 0.5;   // one panel pixel, in world units
  const snap = (v) => Math.round(v / P) * P;
  const cx = snap(x);
  const top = g - 17, bot = g - 3;
  // The plinth: a one-pixel box the width of the case's foot, in the wall's wash.
  ctx.fillStyle = 'rgba(60,63,69,0.12)';
  ctx.fillRect(cx - 8, bot, 16, 3);
  ctx.fillStyle = INK;
  ctx.fillRect(cx - 8, bot, 16, 1);
  ctx.fillRect(cx - 8, bot, 1, 3);
  ctx.fillRect(cx + 7, bot, 1, 3);
  // The case, stepped in half a world pixel at a time — one panel pixel — like the
  // transmitter's legs: wash inside, graphite edge, a one-pixel cap.
  const hw = (y) => 3 + Math.round((y - top) / (bot - top) * 8) * 0.5;
  for (let y = top; y < bot; y += P) {
    const h = hw(y);
    ctx.fillStyle = 'rgba(60,63,69,0.12)';
    ctx.fillRect(cx - h, y, h * 2, P);
    ctx.fillStyle = INK;
    ctx.fillRect(cx - h, y, 1, P);
    ctx.fillRect(cx + h - 1, y, 1, P);
  }
  ctx.fillRect(cx - 4, top - 1, 8, 1);
  ctx.fillRect(cx - 1, top - 2.5, 2, 1.5);
  // The scale: a tick every other panel row up the middle.
  ctx.fillStyle = 'rgba(60,63,69,0.45)';
  for (let y = top + 3; y < bot - 4; y += 1.5) ctx.fillRect(cx - 1, y, 2, P);
  // The pendulum's five positions, printed; one inked a sixteenth at a time.
  const live = MET_SWING[mod(sub(4), 8)];
  const L = 19.5, pvx = cx, pvy = g - 5.5, WAT = 12.5;
  const rod = (a, ink, weightInk) => {
    ctx.fillStyle = ink;
    for (let i = 0; i <= 40; i++) {
      const r = (i / 40) * L;
      ctx.fillRect(snap(pvx + Math.sin(a) * r) - 0.5, snap(pvy - Math.cos(a) * r) - 0.5, 1, 1);
    }
    ctx.fillStyle = weightInk;
    ctx.fillRect(snap(pvx + Math.sin(a) * WAT) - 2, snap(pvy - Math.cos(a) * WAT) - 1.5, 4, 3);
  };
  const ghost = 'rgba(80,85,92,0.16)';
  MET_ANGLES.forEach((a, i) => { if (i !== live) rod(a * 1.2, ghost, ghost); });
  rod(MET_ANGLES[live] * 1.2, INK, CORAL);
  ctx.fillStyle = INK;
  ctx.fillRect(pvx - 1.5, pvy - 1.5, 3, 3);
  // The bell in the plinth, lit on the one.
  ctx.fillStyle = beat4 === 0 && live === 0 ? CORAL : 'rgba(80,85,92,0.24)';
  ctx.fillRect(cx - 1.5, bot + 1, 3, 1);
  ctx.restore();
}

// ---- the PA speaker ---------------------------------------------------------
const CAB = '#2e3038', CAB_EDGE = '#454955', CONE = '#1c1d22', SURROUND = '#5a5f6b', PINK = '#f890c8', PINK_DEEP = '#e04898';
function speakerLane(ctx, t, x, g, info) {
  const { frac, beat4 } = beatOf(info);
  const k = kickOf(frac, 7);
  ctx.save();
  // Squash on the kick: a pixel lower, a hair wider — the box takes the hit.
  const h = 17 - 0.9 * k, w = 14 + 0.5 * k;
  const top = g - h;
  // Sound leaving the front, toward the hero: two arcs travelling out over the beat.
  for (let i = 0; i < 2; i++) {
    const u = frac + i * 0.5;
    if (u > 1) continue;
    const r = 5 + u * 13;
    faded(ctx, (1 - u) * 0.9, () => line(ctx, PINK, 0.8, (c) => c.arc(x - 2, g - 7.5, r, Math.PI * 0.72, Math.PI * 1.28)));
  }
  // Feet, then the cabinet with its metal corners.
  plain(ctx, '#15161a', box(x - w / 2 + 1, g - 1, 2.6, 1, 0.3));
  plain(ctx, '#15161a', box(x + w / 2 - 3.6, g - 1, 2.6, 1, 0.3));
  sh(ctx, CAB, box(x - w / 2, top, w, h - 0.8, 1.4), 0.65);
  plain(ctx, CAB_EDGE, box(x - w / 2 + 0.7, top + 0.6, w - 1.4, 0.8, 0.4));
  for (const [cxs, cys] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const ox = x + cxs * (w / 2 - 1.1), oy = (cys < 0 ? top + 1.1 : g - 1.9);
    plain(ctx, '#a9b0bb', oval(ox, oy, 0.8, 0.8));
  }
  // The horn, up top, with a lit power pip.
  sh(ctx, '#1c1d22', box(x - 4, top + 2, 8, 3, 1.2), 0.4, 'rgba(255,255,255,0.14)');
  plain(ctx, '#3a3d46', box(x - 2.4, top + 2.9, 4.8, 1.2, 0.6));
  plain(ctx, beat4 === 0 && frac < 0.5 ? '#ff6a5a' : '#a13c34', oval(x + 5.2, top + 3.3, 0.55, 0.55));
  // The woofer: surround, cone, dust cap — the cone pushes out on the kick.
  const cy = g - 7.6, R = 5.1;
  sh(ctx, SURROUND, oval(x, cy, R, R), 0.4, 'rgba(0,0,0,0.4)');
  const s = 1 + 0.16 * k;
  sh(ctx, CONE, oval(x, cy, 4 * s, 4 * s), 0.35, 'rgba(255,255,255,0.12)');
  line(ctx, 'rgba(255,255,255,0.10)', 0.35, (c) => c.arc(x, cy, 2.8 * s, 0, TAU));
  sh(ctx, k > 0.5 ? '#8f96a3' : '#666c78', oval(x, cy, 1.7 * s, 1.7 * s), 0.3, 'rgba(0,0,0,0.3)');
  plain(ctx, 'rgba(255,255,255,0.55)', oval(x - 0.6 * s, cy - 0.6 * s, 0.6, 0.45));
  ctx.restore();
}

// ---- the rolling kick drum ------------------------------------------------------
const HOOP = '#2e2c35', SHELL = '#c8323c', HEAD = '#f3eee0', LUG = '#c9ced6';
function kickDrum(ctx, t, x, g, info) {
  const { b, frac } = beatOf(info);
  ctx.save();
  // It rolls at the hero on its rims, and HOPS on every beat — the boom lifts it off
  // the road for the first half of the beat.
  const hop = frac < 0.5 ? 2.6 * Math.sin(Math.PI * frac * 2) : 0;
  const R = 7.6, D = 2.8;
  const spin = -b * (60 / 124) * 5.2;
  ctx.translate(x - D / 2, g - R - hop);
  // A cylinder seen a little from the side: the far hoop, then the red shell band
  // between the two rims, its tension rods turning with it.
  sh(ctx, HOOP, oval(D, 0, R, R), 0.7);
  sh(ctx, SHELL, (c) => {
    c.moveTo(0, -R + 0.6); c.lineTo(D, -R + 0.6);
    c.arc(D, 0, R - 0.6, -Math.PI / 2, Math.PI / 2);
    c.lineTo(0, R - 0.6);
    c.arc(0, 0, R - 0.6, Math.PI / 2, -Math.PI / 2, true);
    c.closePath();
  }, 0);
  for (let i = 0; i < 8; i++) {
    const a = spin + (i * TAU) / 8;
    if (Math.cos(a) < 0.2) continue;
    plain(ctx, LUG, box(Math.cos(a) * (R - 0.6), Math.sin(a) * (R - 0.6) - 0.45, D, 0.9, 0.3));
  }
  plain(ctx, 'rgba(255,255,255,0.35)', (c) => { c.arc(D, 0, R - 1.4, -1.2, -0.6); c.arc(D - 0.8, 0, R - 1.4, -0.6, -1.2, true); c.closePath(); });
  // The near hoop and its claws, then the head.
  sh(ctx, HOOP, oval(0, 0, R, R), 0.7);
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate(spin + (i * TAU) / 8);
    sh(ctx, LUG, box(R - 1.8, -0.7, 2.3, 1.4, 0.4), 0.3);
    ctx.restore();
  }
  const kk = kickOf(frac, 9);
  const hr = R - 1.5 + 0.25 * kk;
  sh(ctx, HEAD, oval(0, 0, hr, hr), 0.45);
  // The badge and the port turn with the drum: a red disc with a note on it.
  ctx.rotate(spin);
  sh(ctx, SHELL, oval(0, 0, 3.1, 3.1), 0.35);
  noteGlyph(ctx, -0.6, 1.2, 0.5, HEAD);
  sh(ctx, '#1d1c22', oval(3.6, 2.4, 1.25, 1.25), 0.3);
  ctx.rotate(-spin);
  // The strike: a ripple across the head on the beat.
  if (frac < 0.3) {
    faded(ctx, 1 - frac / 0.3, () => line(ctx, 'rgba(26,16,40,0.25)', 0.35, (c) => c.arc(0, 0, 3.8 + frac * 6, 0, TAU)));
  }
  plain(ctx, 'rgba(255,255,255,0.55)', (c) => { c.arc(0, 0, hr - 0.4, 1.12 * Math.PI, 1.42 * Math.PI); c.arc(0, 0, hr - 1.1, 1.42 * Math.PI, 1.12 * Math.PI, true); c.closePath(); });
  ctx.restore();
}

// ---- the hi-hat -----------------------------------------------------------------
const CYM = '#e3b441', CYM_DARK = '#a8781c', CYM_LIGHT = '#fff2b0', STAND = '#6f7682';
function hiHat(ctx, t, x, g, info) {
  const { frac, beat4 } = beatOf(info);
  ctx.save();
  // Open on one and three, CHICK shut on two and four: the pedal is the backbeat.
  const open = beat4 % 2 === 0 ? Math.min(1, frac * 5) : Math.max(0, 1 - frac * 10);
  const lift = 3.2 * open;
  const chick = beat4 % 2 === 1 && frac < 0.3 ? 1 - frac / 0.3 : 0;
  const pedal = beat4 % 2 === 1 ? 0 : 0.7 * open;
  // Tripod: two splayed legs off a collar on the column.
  line(ctx, 'rgba(26,16,40,0.32)', 1.9, (c) => {
    c.moveTo(x, g - 6.5); c.lineTo(x - 6.2, g - 0.4);
    c.moveTo(x, g - 6.5); c.lineTo(x + 6.2, g - 0.4);
  });
  line(ctx, STAND, 1.1, (c) => {
    c.moveTo(x, g - 6.5); c.lineTo(x - 6.2, g - 0.4);
    c.moveTo(x, g - 6.5); c.lineTo(x + 6.2, g - 0.4);
  });
  // The footboard, down on the chick.
  sh(ctx, '#4b515b', (c) => { c.moveTo(x - 0.5, g - 0.5); c.lineTo(x + 5.5, g - 1.9 - pedal); c.lineTo(x + 5.8, g - 1.1 - pedal); c.lineTo(x - 0.3, g + 0.1); c.closePath(); }, 0.35);
  // The column and the pull rod through it.
  line(ctx, 'rgba(26,16,40,0.32)', 2.2, (c) => { c.moveTo(x, g - 1); c.lineTo(x, g - 14.8); });
  line(ctx, STAND, 1.4, (c) => { c.moveTo(x, g - 1); c.lineTo(x, g - 14.8); });
  line(ctx, '#aeb5bf', 0.6, (c) => { c.moveTo(x, g - 14.8); c.lineTo(x, g - 18 - lift); });
  sh(ctx, '#565c67', box(x - 1.3, g - 8.4, 2.6, 1.6, 0.4), 0.3);
  const cymbal = (y, tilt) => {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    sh(ctx, CYM, (c) => { c.moveTo(-7.8, 0.5); c.quadraticCurveTo(0, -2.6, 7.8, 0.5); c.quadraticCurveTo(0, 1.2, -7.8, 0.5); c.closePath(); }, 0.5);
    plain(ctx, CYM_DARK, (c) => { c.moveTo(-7.3, 0.55); c.quadraticCurveTo(0, 1.25, 7.3, 0.55); c.quadraticCurveTo(0, 0.55, -7.3, 0.55); c.closePath(); });
    sh(ctx, CYM, oval(0, -1.25, 2, 1.05), 0.35);
    plain(ctx, CYM_LIGHT, oval(-3, -0.55, 2, 0.4, -0.12));
    plain(ctx, CYM_LIGHT, oval(-0.5, -1.6, 0.8, 0.3));
    ctx.restore();
  };
  cymbal(g - 14.4, 0);
  cymbal(g - 16 - lift, 0.07 * Math.sin(frac * 18) * open);
  plain(ctx, '#3d424b', box(x - 1.1, g - 19.2 - lift, 2.2, 1.6, 0.4));
  if (chick > 0) {
    glint(ctx, x - 8.6, g - 15, 2.8 * chick, '#fff6c8');
    glint(ctx, x + 8.6, g - 15, 2.8 * chick, '#fff6c8');
  }
  ctx.restore();
}

// ---- the beamed eighth notes -----------------------------------------------------
const NOTE_INK = '#27222f', NOTE_SHEEN = '#6a5f84';
function noteHurdle(ctx, t, x, g, info) {
  const { frac } = beatOf(info);
  ctx.save();
  // Ta-ta: the left note lands on the beat, the right one on the and — the pair
  // rocks on its beam like a see-saw.
  const hopL = frac < 0.5 ? 3 * Math.sin(Math.PI * frac * 2) : 0;
  const hopR = frac >= 0.5 ? 3 * Math.sin(Math.PI * (frac - 0.5) * 2) : 0;
  const hL = [x - 5, g - 2.4 - hopL], hR = [x + 5.4, g - 2.4 - hopR];
  const stemTop = (hy) => hy - 13.6;
  const sL = [hL[0] + 2.4, stemTop(hL[1])], sR = [hR[0] + 2.4, stemTop(hR[1])];
  // Stems, then the beam across their tops, then the heads over the stems' feet.
  sh(ctx, NOTE_INK, (c) => { c.rect(sL[0] - 0.85, sL[1], 1.1, hL[1] - sL[1] - 0.2); }, 0.4);
  sh(ctx, NOTE_INK, (c) => { c.rect(sR[0] - 0.85, sR[1], 1.1, hR[1] - sR[1] - 0.2); }, 0.4);
  sh(ctx, NOTE_INK, (c) => {
    c.moveTo(sL[0] - 0.85, sL[1] - 0.2); c.lineTo(sR[0] + 0.25, sR[1] - 0.2);
    c.lineTo(sR[0] + 0.25, sR[1] + 2.8); c.lineTo(sL[0] - 0.85, sL[1] + 2.8); c.closePath();
  }, 0.5);
  plain(ctx, NOTE_SHEEN, (c) => {
    c.moveTo(sL[0] + 0.4, sL[1] + 0.5); c.lineTo(sR[0] - 1, sR[1] + 0.5);
    c.lineTo(sR[0] - 1, sR[1] + 1.1); c.lineTo(sL[0] + 0.4, sL[1] + 1.1); c.closePath();
  });
  for (const [hx, hy] of [hL, hR]) {
    sh(ctx, NOTE_INK, oval(hx, hy, 3.1, 2.3, -0.38), 0.55);
    plain(ctx, NOTE_SHEEN, oval(hx - 1, hy - 0.9, 1.2, 0.55, -0.38));
    plain(ctx, PINK, oval(hx + 1.5, hy + 0.9, 0.7, 0.35, -0.38));
  }
  ctx.restore();
}

// ---- the boombox (breakable) ----------------------------------------------------
const BOX_BODY = '#c7ccd5', BOX_BAND = '#9ea5b1', BOX_DARK = '#2b2d34', BOX_TRIM = '#e6e9ee';
function boombox(ctx, t, x, g, info) {
  const { n, frac, beat4 } = beatOf(info);
  const k = kickOf(frac, 7);
  ctx.save();
  const bounce = 0.8 * k;
  const w = 19, h = 11, left = x - w / 2, top = g - h - bounce;
  // Notes out of the speakers: one per beat, alternating sides, rising and fading.
  for (let i = 0; i < 2; i++) {
    const age = frac + i;
    const side = mod(n - i, 2) === 0 ? -1 : 1;
    noteGlyph(ctx, x + side * 7 + side * age * 2.2, top - 1 - age * 5.5, 0.55, PINK_DEEP, Math.max(0, 1 - age / 1.6));
  }
  // Antenna and handle behind the body.
  line(ctx, '#8d95a2', 0.55, (c) => { c.moveTo(left + w - 3, top + 1); c.lineTo(left + w + 2.5, top - 7); });
  plain(ctx, '#8d95a2', oval(left + w + 2.6, top - 7.2, 0.6, 0.6));
  sh(ctx, '#3d4049', (c) => {
    c.moveTo(left + 4, top + 0.5); c.lineTo(left + 5, top - 2.6); c.lineTo(left + w - 5, top - 2.6); c.lineTo(left + w - 4, top + 0.5);
    c.lineTo(left + w - 5.2, top + 0.5); c.lineTo(left + w - 6, top - 1.4); c.lineTo(left + 6, top - 1.4); c.lineTo(left + 5.2, top + 0.5); c.closePath();
  }, 0.4);
  // Body, the darker lower band, the trim line.
  sh(ctx, BOX_BODY, box(left, top, w, h, 1.6), 0.65);
  plain(ctx, BOX_BAND, box(left + 0.5, top + h * 0.62, w - 1, h * 0.38 - 0.5, 1.2));
  plain(ctx, BOX_TRIM, box(left + 1.2, top + 0.7, w - 2.4, 0.7, 0.35));
  // Speakers, pumping on the beat.
  for (const side of [-1, 1]) {
    const sx = x + side * 5.6, sy = top + h * 0.56, s = 1 + 0.14 * k;
    sh(ctx, BOX_DARK, oval(sx, sy, 3.6, 3.6), 0.45);
    line(ctx, 'rgba(255,255,255,0.13)', 0.3, (c) => c.arc(sx, sy, 2.7 * s, 0, TAU));
    sh(ctx, '#565b66', oval(sx, sy, 1.3 * s, 1.3 * s), 0.25, 'rgba(0,0,0,0.3)');
    plain(ctx, 'rgba(255,255,255,0.45)', oval(sx - 0.45, sy - 0.5, 0.45, 0.35));
  }
  // The deck: a door with its tape window, and the PLAY lamp lit on the beat.
  const dy = top + h * 0.44;
  sh(ctx, '#aab1bc', box(x - 2.6, dy, 5.2, 3.6, 0.5), 0.3);
  plain(ctx, BOX_DARK, box(x - 1.9, dy + 0.9, 3.8, 1, 0.3));
  plain(ctx, frac < 0.5 ? '#ff6a5a' : '#8a3a33', (c) => { c.moveTo(x - 0.5, dy + 2.3); c.lineTo(x + 0.6, dy + 2.85); c.lineTo(x - 0.5, dy + 3.4); c.closePath(); });
  const levels = [[3, 1, 2, 1], [2, 3, 1, 2], [1, 2, 3, 2], [2, 1, 2, 3], [3, 2, 1, 1]];
  for (let i = 0; i < 5; i++) {
    const lv = levels[i][beat4];
    for (let j = 0; j < 3; j++) {
      const on = j < lv;
      plain(ctx, on ? (j === 2 ? '#ff6a5a' : j === 1 ? '#ffc94a' : '#8ce07a') : 'rgba(43,45,52,0.35)',
        box(x - 2.4 + i * 1.05, top + 3.6 - j * 1, 0.75, 0.7, 0.15));
    }
  }
  // Buttons along the top.
  for (let i = 0; i < 4; i++) plain(ctx, i === beat4 ? '#ff6a5a' : '#6f7682', box(left + 3 + i * 1.6, top - 0.6, 1.1, 0.7, 0.2));
  ctx.restore();
}

// ---- the royalty meter (breakable) -------------------------------------------------
const METER = '#7a4bc0', METER_DARK = '#54308a', METER_LIGHT = '#a47ee0', POST = '#8b929c', GLASS = '#e8f4f0';
function royaltyMeter(ctx, t, x, g, info) {
  const { frac, beat4 } = beatOf(info);
  ctx.save();
  // Post and its foot.
  sh(ctx, '#5f6670', box(x - 2.6, g - 1.2, 5.2, 1.2, 0.4), 0.4);
  sh(ctx, POST, box(x - 1.3, g - 10.5, 2.6, 9.6, 0.5), 0.5);
  plain(ctx, 'rgba(255,255,255,0.35)', box(x - 0.9, g - 10, 0.6, 8.8, 0.3));
  // The head: a domed case in the villain's purple, glass up top, slot below.
  const hy = g - 19.5;
  sh(ctx, METER, (c) => {
    c.moveTo(x - 4.4, hy + 9.2); c.lineTo(x - 4.4, hy + 3.6);
    c.quadraticCurveTo(x - 4.4, hy - 0.4, x, hy - 0.4);
    c.quadraticCurveTo(x + 4.4, hy - 0.4, x + 4.4, hy + 3.6);
    c.lineTo(x + 4.4, hy + 9.2); c.closePath();
  }, 0.65);
  plain(ctx, METER_DARK, box(x + 2.6, hy + 3, 1.5, 6, 0.6));
  plain(ctx, METER_LIGHT, box(x - 3.8, hy + 3, 0.9, 5.5, 0.45));
  // The window: a dial whose needle steps a notch toward "owed" every beat.
  sh(ctx, GLASS, (c) => {
    c.moveTo(x - 3, hy + 5); c.lineTo(x - 3, hy + 3); c.quadraticCurveTo(x - 3, hy + 0.7, x, hy + 0.7);
    c.quadraticCurveTo(x + 3, hy + 0.7, x + 3, hy + 3); c.lineTo(x + 3, hy + 5); c.closePath();
  }, 0.35);
  plain(ctx, '#e85a4a', (c) => { c.moveTo(x + 1.2, hy + 4.4); c.arc(x, hy + 4.4, 2.3, -0.55, -0.02); c.closePath(); });
  const a = -1.2 + beat4 * 0.42 + Math.min(1, frac * 6) * 0.42 - 0.42;
  line(ctx, '#27222f', 0.4, (c) => { c.moveTo(x, hy + 4.4); c.lineTo(x + Math.sin(a) * 2.4, hy + 4.4 - Math.cos(a) * 2.4); });
  // The coin slot takes a coin on every beat — your royalty for the jump.
  plain(ctx, METER_DARK, box(x - 1.6, hy + 6.4, 3.2, 0.7, 0.3));
  if (frac < 0.45) {
    const drop = frac / 0.45;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 3, hy - 6, 6, 12.8); ctx.clip();
    sh(ctx, GOLD, oval(x, hy + 3.4 + drop * 3.3, 1.35, 1.35), 0.35);
    plain(ctx, '#fff6c0', oval(x - 0.4, hy + 3 + drop * 3.3, 0.45, 0.45));
    ctx.restore();
  }
  // The red flag: up in the window on the one — PAY — and down for the rest of the bar.
  const up = beat4 === 0 ? Math.min(1, frac * 8) : beat4 === 1 ? Math.max(0, 1 - frac * 8) : 0;
  if (up > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 3, hy + 5); ctx.lineTo(x - 3, hy + 3); ctx.quadraticCurveTo(x - 3, hy + 0.7, x, hy + 0.7);
    ctx.quadraticCurveTo(x + 3, hy + 0.7, x + 3, hy + 3); ctx.lineTo(x + 3, hy + 5); ctx.closePath();
    ctx.clip();
    const fy = hy + 5 - 4.4 * up;
    sh(ctx, '#e8483c', box(x - 2.6, fy, 5.2, 4.4, 0.4), 0.3);
    plain(ctx, '#ffffff', box(x - 1.7, fy + 1.3, 3.4, 0.6, 0.2));
    ctx.restore();
  }
  // The plate on the post: a dollar, in the panel's own pixel font.
  sh(ctx, '#f3e4b8', box(x - 1.9, g - 8.9, 3.8, 4.4, 0.5), 0.3);
  ctx.fillStyle = METER_DARK;
  printText(ctx, '$', x - 1.25, g - 8.5, 0.5);
  ctx.restore();
}

// ---- the tuba --------------------------------------------------------------------
const TUBA = '#e2a832', TUBA_DARK = '#a8721c', TUBA_LIGHT = '#fff0a0', BELL_IN = '#6b3f12';
function tubaLane(ctx, t, x, g, info) {
  const { frac, beat4, n } = beatOf(info);
  ctx.save();
  // The blast is on the one: the bell flares and a wall of sound rolls out of it
  // toward the hero across the bar's first two beats.
  const blasting = beat4 <= 1;
  const u = blasting ? (beat4 + frac) / 2 : 0;
  const flare = beat4 === 0 ? kickOf(frac, 5) : 0;
  const bx = x - 4, by = g - 14;
  if (blasting) {
    for (let i = 0; i < 3; i++) {
      const uu = u - i * 0.12;
      if (uu < 0) continue;
      const r = 6 + uu * 30;
      faded(ctx, (1 - uu) * 0.95, () => line(ctx, i === 0 ? PINK_DEEP : PINK, 1.1 - i * 0.25, (c) => c.arc(bx + 4, by, r, Math.PI * 0.78, Math.PI * 1.22)));
    }
  }
  // Two notes puffed out on the blast.
  if (beat4 === 0) noteGlyph(ctx, bx - 4 - frac * 5, by - 3 - frac * 4, 0.55, PINK_DEEP, 1 - frac);
  // The body: a fat coil of tubing standing on the road.
  sh(ctx, TUBA, oval(x + 1.5, g - 7.2, 7.2, 7), 1.0);
  sh(ctx, '#dce49a', oval(x + 1.5, g - 7.2, 3.8, 3.6), 0.5);
  line(ctx, TUBA_LIGHT, 0.7, (c) => c.arc(x + 1.5, g - 7.2, 5.6, 1.05 * Math.PI, 1.5 * Math.PI));
  line(ctx, TUBA_DARK, 0.7, (c) => c.arc(x + 1.5, g - 7.2, 5.6, 0.05 * Math.PI, 0.55 * Math.PI));
  // Three valves on top of the coil; the one being played steps with the beat.
  for (let i = 0; i < 3; i++) {
    const vx = x + 2.4 + i * 1.9, down = i === mod(n, 3) ? 0.9 : 0;
    sh(ctx, TUBA, box(vx - 0.85, g - 16.6, 1.7, 3.2, 0.4), 0.35);
    line(ctx, '#aeb5bf', 0.5, (c) => { c.moveTo(vx, g - 16.6); c.lineTo(vx, g - 18 + down); });
    sh(ctx, '#e6e9ee', oval(vx, g - 18.3 + down, 0.9, 0.5), 0.3);
  }
  // The leadpipe up to the bell, and the bell itself facing the hero.
  line(ctx, 'rgba(26,16,40,0.3)', 2.6, (c) => { c.moveTo(x + 1.5, g - 14); c.quadraticCurveTo(x + 1, g - 16.5, bx + 3, by); });
  line(ctx, TUBA, 1.9, (c) => { c.moveTo(x + 1.5, g - 14); c.quadraticCurveTo(x + 1, g - 16.5, bx + 3, by); });
  const f = 1 + 0.15 * flare;
  sh(ctx, TUBA, (c) => {
    c.moveTo(bx + 4, by - 1.4);
    c.quadraticCurveTo(bx, by - 1.8, bx - 3.2 * f, by - 5.4 * f);
    c.lineTo(bx - 3.2 * f, by + 5.4 * f);
    c.quadraticCurveTo(bx, by + 1.8, bx + 4, by + 1.4);
    c.closePath();
  }, 0.7);
  sh(ctx, BELL_IN, oval(bx - 3.2 * f, by, 1.5, 5.3 * f), 0.5);
  plain(ctx, TUBA_LIGHT, (c) => { c.moveTo(bx + 2, by - 1.4); c.quadraticCurveTo(bx - 0.5, by - 2.2, bx - 2.3 * f, by - 4.6 * f); c.lineTo(bx - 1.7 * f, by - 4.7 * f); c.quadraticCurveTo(bx, by - 2.4, bx + 2, by - 1.9); c.closePath(); });
  // The mouthpipe out of the valve block, and the silver mouthpiece on its end.
  line(ctx, 'rgba(26,16,40,0.3)', 1.6, (c) => { c.moveTo(x + 7, g - 14.6); c.quadraticCurveTo(x + 9.4, g - 14.6, x + 9.6, g - 17.2); });
  line(ctx, TUBA, 1, (c) => { c.moveTo(x + 7, g - 14.6); c.quadraticCurveTo(x + 9.4, g - 14.6, x + 9.6, g - 17.2); });
  sh(ctx, '#c9ced6', (c) => { c.moveTo(x + 9.1, g - 17); c.lineTo(x + 8.7, g - 19.2); c.lineTo(x + 10.5, g - 19.2); c.lineTo(x + 10.1, g - 17); c.closePath(); }, 0.3);
  ctx.restore();
}

// ---- the falling piano ------------------------------------------------------------
// The cartoon gag, on the grid: a coral mark blinks on the road on three and four,
// the piano drops into frame through four, and it LANDS ON THE ONE — squash, dust,
// a couple of keys thrown out — then sits wrecked for a beat and is cleared. Don't be
// under it on the one; if you are past it, jump the wreck.
const PIANO = '#2c2530', PIANO_EDGE = '#4a3f52', PIANO_SHEEN = '#6d6280', IVORY = '#f5f0e2';
function drawUpright(ctx, x, g, squash = 0, tilt = 0) {
  ctx.save();
  ctx.translate(x, g);
  ctx.rotate(tilt);
  ctx.scale(1 + squash * 0.18, 1 - squash * 0.22);
  // Casters, body, the lid's lip, the keyboard shelf and the fall board.
  plain(ctx, '#15121a', oval(-6.2, -0.6, 0.9, 0.6));
  plain(ctx, '#15121a', oval(6.2, -0.6, 0.9, 0.6));
  sh(ctx, PIANO, box(-8, -16, 16, 15, 0.8), 0.7);
  plain(ctx, PIANO_EDGE, box(-8.4, -16.8, 16.8, 1.6, 0.5));
  plain(ctx, PIANO_SHEEN, box(-6.6, -14.6, 1, 5.4, 0.4));
  plain(ctx, 'rgba(255,255,255,0.18)', box(-3.5, -14.6, 9.5, 0.5, 0.2));
  // Keys: an ivory band with its black keys in twos and threes.
  sh(ctx, IVORY, box(-7.4, -8.4, 14.8, 2.6, 0.3), 0.35);
  ctx.fillStyle = 'rgba(26,16,40,0.35)';
  for (let k = 1; k < 10; k++) ctx.fillRect(-7.4 + k * 1.48, -8.4, 0.2, 2.6);
  ctx.fillStyle = '#15121a';
  for (const k of [1, 2, 4, 5, 6, 8, 9]) ctx.fillRect(-7.4 + k * 1.48 - 0.42, -8.4, 0.84, 1.5);
  plain(ctx, PIANO_EDGE, box(-8, -9.4, 16, 1.1, 0.3));
  // Legs under the keyboard and the pedals.
  plain(ctx, PIANO_EDGE, box(-7.2, -5.6, 1.4, 4.6, 0.3));
  plain(ctx, PIANO_EDGE, box(5.8, -5.6, 1.4, 4.6, 0.3));
  plain(ctx, '#d8b060', box(-1.6, -2, 1.1, 0.6, 0.2));
  plain(ctx, '#d8b060', box(0.5, -2, 1.1, 0.6, 0.2));
  ctx.restore();
}
function pianoDrop(ctx, t, x, g, info) {
  const { beat4, frac, bar } = beatOf(info);
  ctx.save();
  // The mark on the road where it will land: two coral brackets, blinking on the beat
  // through three and four.
  if (beat4 >= 2 && frac < 0.75) {
    ctx.fillStyle = CORAL;
    for (const sx of [-1, 1]) {
      ctx.fillRect(x + sx * 9 - (sx > 0 ? 1 : 0), g - 1.2, 1, 1.2);
      ctx.fillRect(x + sx * 9 - (sx > 0 ? 3 : 0), g - 1.2, 3, 0.6);
    }
    ctx.fillRect(x - 0.6, g - 1.2, 1.2, 1.2);
  }
  if (beat4 === 3) {
    // Falling through four, accelerating, the snapped rope trailing above it.
    const drop = -120 * (1 - frac * frac);
    const tilt = 0.12 * (1 - frac);
    line(ctx, '#8a6a40', 0.6, (c) => { c.moveTo(x + 1, g - 17 + drop); c.quadraticCurveTo(x + 3, g - 23 + drop, x + 1.5, g - 29 + drop); });
    line(ctx, 'rgba(60,63,69,0.35)', 0.5, (c) => { c.moveTo(x - 10, g - 19 + drop); c.lineTo(x - 10, g - 27 + drop); c.moveTo(x + 11, g - 17 + drop); c.lineTo(x + 11, g - 25 + drop); });
    drawUpright(ctx, x, g + drop, 0, tilt);
  } else if (beat4 <= 1) {
    // Landed on the one: a squash that settles, and the wreck sits for a beat.
    const u = beat4 + frac;
    const squash = beat4 === 0 ? kickOf(frac, 7) : 0;
    drawUpright(ctx, x, g, squash, beat4 === 0 && frac < 0.1 ? 0 : -0.035);
    if (u < 1.2) {
      // Dust out both sides, and two keys thrown out of the keyboard.
      const k = Math.min(1, u / 1.2);
      ctx.fillStyle = `rgba(60,63,69,${(0.55 * (1 - k)).toFixed(2)})`;
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const px = x + sx * (9 + k * (5 + i * 3)), py = g - 1 - i * 1.4 - k * 2;
          ctx.fillRect(px - 1, py - 1, 2 - k * 0.8, 2 - k * 0.8);
        }
      }
      for (const [sx, ink, spin] of [[-1, IVORY, 1], [1, '#15121a', -1]]) {
        ctx.save();
        ctx.translate(x + sx * (4 + k * 10), g - 10 - 9 * Math.sin(Math.PI * k));
        ctx.rotate(spin * k * 6);
        sh(ctx, ink, box(-0.6, -1.6, 1.2, 3.2, 0.2), 0.3);
        ctx.restore();
      }
      if (beat4 === 0) noteGlyph(ctx, x + 3 + frac * 3, g - 19 - frac * 6, 0.7, PINK_DEEP, 1 - frac);
    }
  }
  ctx.restore();
}

// ====================================================================== air

// ---- flying notes -------------------------------------------------------------
function noteFlyer(ctx, t, x, y, info) {
  const { frac } = beatOf(info);
  ctx.save();
  // The beam is the wings: it snaps down on the beat and lifts through it.
  const flap = kickOf(frac, 5);
  const bob = 1.2 * flap;
  const cy = y + bob;
  const wing = -3 + 5 * flap;           // how far the beam's ends drop, in px
  const hL = [x - 3.6, cy + 3.6], hR = [x + 4, cy + 3.2];
  const sL = [hL[0] + 2.2, cy - 5], sR = [hR[0] + 2.2, cy - 5.4];
  // The beam as a pair of wings bent at the middle.
  sh(ctx, NOTE_INK, (c) => {
    const mx = (sL[0] + sR[0]) / 2, my = (sL[1] + sR[1]) / 2 - 0.6;
    c.moveTo(sL[0] - 3.4, sL[1] + wing); c.lineTo(mx, my); c.lineTo(sR[0] + 3, sR[1] + wing);
    c.lineTo(sR[0] + 3, sR[1] + wing + 2.3); c.lineTo(mx, my + 2.3); c.lineTo(sL[0] - 3.4, sL[1] + wing + 2.3); c.closePath();
  }, 0.5);
  sh(ctx, NOTE_INK, (c) => { c.rect(sL[0] - 0.7, sL[1] + 1, 1, hL[1] - sL[1] - 1); }, 0.35);
  sh(ctx, NOTE_INK, (c) => { c.rect(sR[0] - 0.7, sR[1] + 1, 1, hR[1] - sR[1] - 1); }, 0.35);
  for (const [hx, hy] of [hL, hR]) {
    sh(ctx, NOTE_INK, oval(hx, hy, 2.7, 2, -0.38), 0.5);
    plain(ctx, NOTE_SHEEN, oval(hx - 0.8, hy - 0.8, 1, 0.45, -0.38));
  }
  // An eye on the leading note: it is flying at you.
  plain(ctx, '#ffffff', oval(hL[0] - 1.2, hL[1] - 0.4, 0.8, 0.8));
  plain(ctx, '#27222f', oval(hL[0] - 1.5, hL[1] - 0.3, 0.4, 0.45));
  plain(ctx, PINK, oval(hR[0] + 1.3, hR[1] + 0.8, 0.6, 0.3, -0.38));
  ctx.restore();
}

// ---- the mirror ball -------------------------------------------------------------
function mirrorBall(ctx, t, x, y, info) {
  const { n, frac } = beatOf(info);
  ctx.save();
  const R = 6.2;
  // The cable runs up out of the frame: it hangs from something, not from nothing.
  line(ctx, '#5a5f6b', 0.5, (c) => { c.moveTo(x, y - R - 2); c.lineTo(x, y - 140); });
  sh(ctx, '#7c8594', box(x - 1.3, y - R - 2.2, 2.6, 1.8, 0.4), 0.35);
  // The ball: a disc of facets, the columns stepping round a half-facet each beat.
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.clip();
  ctx.fillStyle = '#9aa3b0';
  ctx.fillRect(x - R, y - R, R * 2, R * 2);
  const F = 1.55;
  const shift = (n % 2) * F / 2;
  for (let r = -4; r <= 4; r++) {
    for (let c = -5; c <= 5; c++) {
      const fx = x + c * F + shift, fy = y + r * F;
      const lat = (fy - y) / R, lon = (fx - x) / R;
      const h = (c * 7 + r * 13 + n * 3) % 5;
      const light = 0.5 - lat * 0.35 - lon * 0.25;
      const base = light > 0.55 ? '#eef2f7' : light > 0.35 ? '#c9d0da' : light > 0.15 ? '#a3acba' : '#7c8594';
      ctx.fillStyle = h === 0 ? '#f7faff' : base;
      ctx.fillRect(fx - F / 2 + 0.12, fy - F / 2 + 0.12, F - 0.24, F - 0.24);
    }
  }
  ctx.restore();
  line(ctx, OUTLINE, 0.6, (c) => c.arc(x, y, R, 0, TAU));
  // The flash: on every beat two facets catch the light and throw a glint.
  const k = kickOf(frac, 4);
  const spots = [[-2.8, -2.6], [2.2, -3.4], [3.4, 0.8], [-1, 2.4], [-3.6, 0.4]];
  const [ax, ay] = spots[mod(n, spots.length)], [bx2, by2] = spots[mod(n + 2, spots.length)];
  glint(ctx, x + ax, y + ay, 3.4 * k + 0.6, '#ffffff');
  glint(ctx, x + bx2, y + by2, 2.4 * k, '#ffd0ec');
  // Specks it throws, flying out on the beat.
  ctx.fillStyle = `rgba(248,144,200,${(0.9 * k).toFixed(2)})`;
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6 + n * 0.5;
    const r = R + 2 + frac * 9;
    ctx.fillRect(x + Math.cos(a) * r - 0.4, y + Math.sin(a) * r - 0.4, 0.8, 0.8);
  }
  ctx.restore();
}

// ---- the flying record ------------------------------------------------------------
function recordFrisbee(ctx, t, x, y, info) {
  const { b, n, frac } = beatOf(info);
  ctx.save();
  // It skims toward the hero, tipping a little each beat as it skips.
  const tilt = -0.18 + 0.1 * Math.sin(Math.PI * frac) * (n % 2 ? 1 : -1);
  const dip = 1.2 * Math.sin(Math.PI * frac);
  const cy = y + dip;
  // Speed lines behind it (it flies left), a beat-stepped stutter.
  for (let i = 0; i < 3; i++) {
    const len = 4 + ((n + i) % 3) * 1.5;
    line(ctx, 'rgba(60,63,69,0.35)', 0.5, (c) => { c.moveTo(x + 8.5 + i * 0.6, cy - 1.6 + i * 1.6); c.lineTo(x + 8.5 + len + i * 0.6, cy - 1.6 + i * 1.6); });
  }
  ctx.translate(x, cy);
  ctx.rotate(tilt);
  // The disc on edge-ish: an ellipse with its thickness under it.
  sh(ctx, '#1b1a20', oval(0, 0.7, 8.2, 3.1), 0.6);
  sh(ctx, '#26252d', oval(0, 0, 8.2, 3.1), 0.5);
  line(ctx, 'rgba(255,255,255,0.12)', 0.3, (c) => c.ellipse(0, 0, 6.2, 2.35, 0, 0, TAU));
  line(ctx, 'rgba(255,255,255,0.12)', 0.3, (c) => c.ellipse(0, 0, 4.6, 1.75, 0, 0, TAU));
  // The sheen stays put while the label turns under it.
  plain(ctx, 'rgba(255,255,255,0.28)', (c) => { c.ellipse(-3.4, -1.3, 2.6, 0.5, -0.16, 0, TAU); });
  sh(ctx, CORAL, oval(0, 0, 2.5, 0.95), 0.3);
  const spin = b * 5.5;
  plain(ctx, '#fff0d0', oval(Math.cos(spin) * 1.5, Math.sin(spin) * 0.55, 0.55, 0.3));
  plain(ctx, '#1b1a20', oval(0, 0, 0.45, 0.2));
  ctx.restore();
}

// ======================================================================= list

// The bake-off, background first (strongest first), then the lane, then the air. The
// burger roof (building 5) is the one roof on rhythm-1 with sky to spare, so several
// background ideas are rival proposals for it — the preview paints the burger board
// out first. They are alternatives, not a set.
export const RHYTHM_IDEAS = [
  // ------------------------------------------------------------------- bg
  { id: 'metronome-roof', place: 'bg', name: 'Metronome on the burger roof', paint: metronomeRoof,
    note: 'Building 5 swaps its burger board for a stepped pyramid metronome on a plinth, the tallest thing at that end of the skyline. All five pendulum positions are printed; the live one steps on the sixteenth and reaches each end ON the beat, where a real metronome ticks, and the bell lamp in the plinth lights on the one. The clock tower opens the scene and this closes it: the city keeps its own time at both ends.' },
  { id: 'staff-birds', place: 'bg', name: 'Birds on the wires', paint: staffBirds,
    note: 'A telegraph pole on building 5 (in place of the burger board) wired back to the office wall with five taut lines on lattice rules six apart — a stave — with five pigeons perched on it as its notes. One bird hops per beat, left to right, so the stave plays its tune; each hop is printed above its bird as a ghost. Reads as birds on a wire to everyone, and as a melody to anyone who has seen the famous photo.' },
  { id: 'note-smoke', place: 'bg', name: 'The smokestack plays notes', paint: noteSmoke,
    note: 'Building 4\'s plume with the same four authored cells, lean, beat-stepped drift and fringe-and-core smoke inks — but the puffs come apart into a crotchet, a quaver and a beamed pair as they climb, and the idle stub puffs a small note. The cheapest idea here (a swap of LCD_PUFFS and LCD_WISPS) and the one that says "this city runs on music" hardest.' },
  { id: 'parachute', place: 'bg', name: 'Parachutist onto the burger roof', paint: parachute,
    note: 'The LCD handheld\'s parachute drop over building 5: a jumper swinging down a printed column of seven ghost positions, a step a beat, landing on the roof ON the bar line with the canopy collapsed beside him, then gone — three bars a jump. Shipped, the plane could drop him as it crosses, the one moment on this skyline where two pieces of furniture meet.' },
  { id: 'dj', place: 'bg', name: 'Rooftop DJ on the clock tower', paint: djRoof,
    note: 'A DJ behind a booth on the clock tower (building 0), the clockworks crown giving way; he fits under the plane\'s lane with two pixels to spare. His four arm poses are printed as ghosts and one is inked per beat — hands up on the one, back on the decks, a fist on three, a headphone cue every fourth bar — the deck he is working lights, the booth\'s face is a four-step sequencer walking the bar, and a note steps out over the gap to the combo roof.' },
  { id: 'blimp', place: 'bg', name: 'Blimp: PAY YOUR ROYALTIES', paint: blimp,
    note: 'An outlined airship holding station over the low end of the skyline (clear of the plane\'s lane, the plume and the boards), with a board on its flank flipping ONE WORD PER BEAT: YOU / OWE / ME / ROYAL / -TIES / PER / JUMP / $$$ — the villain\'s taunt in the plane banner\'s 1px letters, two bars a sentence. The propeller swaps its two blur poses on the beat, the nose lamp lights on the one and it bobs a pixel a bar like the clouds.' },
  { id: 'fireworks', place: 'bg', name: 'Fireworks on the bar line', paint: fireworks,
    note: 'A shell a bar, alternating between two launches behind buildings 5 and 6: the trail climbs on beats three and four, the shell BREAKS ON THE ONE with a lit heart and glowing spokes, the outer spokes spread on two and the sparks fall on three. Every cell a burst can light is printed in the sky as a faint ghost, the way an LCD handheld prints its whole playfield, so between bursts the sky shows where the next one will be.' },
  { id: 'trumpeter', place: 'bg', name: 'Trumpeter on the fire escape', paint: trumpeter,
    note: 'Building 3 is the fire-escape building, so it gets what a fire escape has on a summer night: a horn player on the second landing, facing the gap to the gorilla\'s tower. The horn is level through the bar and RAISED on the one (both poses printed as ghosts), and a note climbs the gap a beat at a time over its three printed places. It uses a facade rather than a roof, so it can stand alongside any of the burger-roof ideas.' },
  { id: 'vu-board', place: 'bg', name: 'VU meter board', paint: vuBoard,
    note: 'A new picture for building 5\'s board: a VU meter whose scale arc runs into coral, with the needle\'s five positions printed so the live one steps between them like an LCD segment set — up on the beat, back on the off-beat, pinned in the red on the one, where the PEAK lamp lights. A data-only swap (one LCD_BILLBOARD_ART entry and its painter).' },
  { id: 'record-board', place: 'bg', name: 'Turntable board', paint: recordBoard,
    note: 'A squarer board on building 5 showing a record from above with the tonearm down. Grooves cannot show a turn, so the label carries it: one of its eight rim cells is lit and steps on the eighth note (31 rpm at 124 bpm, a hair under the real 33). The sheen stays put — it is a reflection — which is the detail that makes the rest read as spinning.' },
  { id: 'eq-board', place: 'bg', name: 'Graphic EQ board', paint: eqBoard,
    note: 'Building 5\'s board as a graphic equaliser: seven bands of five segments, every segment printed. Levels step on the beat off an authored table (live, it could take the analyser the windows already hear); the peak caps hold a beat in coral and then fall a segment per beat, which is what makes it an EQ rather than a bar chart — and what separates it from stage 2\'s rooftop banks.' },
  { id: 'royalty-board', place: 'bg', name: 'Royalty board', paint: royaltyBoard,
    note: 'The villain\'s joke as a billboard on building 5: a dollar and a stack of coins whose four positions are printed, taking a coin on every beat (the new one flashes cream); on the bar line the stack is swept into his pocket and the dollar rings coral. "You owe me royalties per jump", counted in the tempo you are jumping to.' },
  { id: 'juggler', place: 'bg', name: 'Juggler on the burger roof', paint: juggler,
    note: 'The LCD handheld\'s juggler on building 5: three coral balls in a shower — up the right, over the top, down the left — stepping on the eighth note, one lap a bar, every ball position printed as a ghost and each arm in one of two printed positions, out to throw or in to catch. The panel\'s oldest idea, a small figure keeping time, told once more.' },
  // ----------------------------------------------------------------- lane
  { id: 'notes', place: 'lane', name: 'Beamed eighth notes (jump)', paint: noteHurdle,
    note: 'Two eighth notes on a beam standing on their heads in the road — the most recognisable object in music as a 17-tall hurdle. They play ta-ta: the left note hops on the beat and the right one on the and, so the pair see-saws on its beam. A jump; glossy black with a pink catchlight so it belongs beside the beat bar.' },
  { id: 'kick-drum', place: 'lane', name: 'Rolling kick drum (moving, jump)', paint: kickDrum,
    note: 'A bass drum loose on its rims, rolling at the hero like the barrel: black hoops and turning claws, a red shell with its tension rods, a head with a note badge and a port that turn as it rolls. It HOPS on every beat — the boom lifts it off the road for half a beat, the head rippling — so the moment to clear it is readable: jump as it lands. The rhythm cabinet\'s own barrel.' },
  { id: 'speaker', place: 'lane', name: 'PA speaker (jump)', paint: speakerLane,
    note: 'A road-case PA cabinet with metal corners, a horn and a woofer, 17 tall. On every beat the cone punches out, the cabinet squashes a pixel and two pink pressure rings travel out of it toward the hero across the beat. A jump; the rings are the beat bar\'s own pink, so it reads as the beat prop\'s family.' },
  { id: 'piano-drop', place: 'lane', name: 'Falling piano (timed dodge)', paint: pianoDrop,
    note: 'The cartoon gag on the grid: coral brackets blink on the road where it will land through beats three and four, the upright drops into frame through four trailing its snapped rope, and it LANDS ON THE ONE — squash, dust, a white key and a black key thrown out — then sits wrecked for a beat. Do not be under it on the one; after that it is a jump. The icicle\'s falling-hazard contract, quantised, so the warning is a count-in.' },
  { id: 'metronome', place: 'lane', name: 'Metronome hurdle (jump)', paint: metronomeLane,
    note: 'A walnut metronome standing in the road, 18 tall to its cap — a jump. The pendulum swings on a cosine so it hangs at each end ON the beat, and its tip throws a tick glint there (gold on the one). The cabinet\'s mechanic as an object: the thing keeping the beat is the thing in your way, and its swing tells you where the beat is without looking at the ribbon.' },
  { id: 'boombox', place: 'lane', name: 'Boombox (breakable)', paint: boombox,
    note: 'A silver boombox with handle and antenna: the speakers pump on the beat, the deck\'s PLAY lamp blinks, a little EQ steps and the button for the current beat lights, and notes float out of alternate speakers each beat. Breakable — the attack smashes it for coins (a noise complaint) — and jumpable at 11 tall, so it is the lane\'s low, friendly one.' },
  { id: 'royalty-meter', place: 'lane', name: 'Royalty meter (breakable)', paint: royaltyMeter,
    note: 'The villain\'s joke as a purple-headed parking meter: every beat a coin drops into the slot and the dial ticks toward OWED, and on the one a red flag snaps up in the window. Jumping it charges you a coin (royalties per jump); smashing it with the attack spills your royalties back out. 19 tall and thin — a jump, or a target.' },
  { id: 'tuba', place: 'lane', name: 'Tuba blast (timed)', paint: tubaLane,
    note: 'A tuba standing in the road with its bell at the hero. On the ONE the bell flares and a pink wall of sound rolls out toward you over two beats, puffing a note; the valves step with the beat. The blast pushes you back if it catches you, so it is a timing hazard — go on three and four, between blasts — and the tuba itself is a jump.' },
  { id: 'hi-hat', place: 'lane', name: 'Hi-hat (jump)', paint: hiHat,
    note: 'A hi-hat on its tripod, 19 tall at the clutch. The top cymbal lifts open on one and three and CHICKS shut on two and four — the backbeat — with the footboard going down and a spark off both rims. A low, spiky jump that plays the offbeat the beat bar does not.' },
  { id: 'metronome-ink', place: 'lane', name: 'Metronome hurdle in panel ink (comparison)', paint: metronomeInk,
    note: 'The metronome hurdle again, drawn in the panel\'s own language for comparison: a stepped graphite case on a plinth, the five rod positions printed as ghosts with one inked per sixteenth, a coral weight and a bell lit on the one. It sits IN the LCD rather than on it — which is either the point or the problem, since every shipped lane hazard is a cartoon prop in production colour.' },
  // ------------------------------------------------------------------ air
  { id: 'mirror-ball', place: 'air', name: 'Mirror ball (slide)', paint: mirrorBall, alt: 20,
    note: 'A disco ball hanging on its cable over the lane at head height: slide under it. The facet columns step round half a facet per beat, two facets catch the light on every beat and throw a glint, and pink specks fly off it through the beat. It hangs from something off the top of the frame, like everything on this cabinet has to.' },
  { id: 'note-flyer', place: 'air', name: 'Flying notes (slide)', paint: noteFlyer, alt: 19,
    note: 'A beamed pair of eighth notes flying like a bird at the drone\'s height: the beam is the wings, snapping down on the beat and lifting through it, with an eye on the leading note. Slide under it — the drone re-cast as music, and the lane notes\' airborne cousin.' },
  { id: 'record-frisbee', place: 'air', name: 'Flying record (slide)', paint: recordFrisbee, alt: 17,
    note: 'A vinyl record skimming at the hero like a frisbee — the villain throwing his back catalogue. The sheen holds still while the label turns under it, it dips and tips on every beat as if skipping, and the speed lines stutter a step a beat. A moving flyer at head height: slide.' },
];
