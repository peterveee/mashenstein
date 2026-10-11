// Gallery-only RHYTHM BANKRUPTCY OBSTACLE concepts — ten things that stand, fly
// or lie in the beat lane, drawn as segments of the LCD panel they run across.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets (except cardboard) and recommend new items or
// replacements that fit in more with their style". The rhythm cabinet is the
// OLED Game & Watch (stylePacks/index.js, lcdPack): a pea-green panel, one
// graphite ink, faint ghost cells for every segment that is off, the coral as
// the only lit colour, a city of girders and a barrel-throwing gorilla behind
// a road drawn as an ink line over the lit panel. What stands in that road:
//
//   * IN THE CAMPAIGN (rhythm-1..3, the beat lane — BeatSpawner, songs/rhythm.js
//     beatCharts) the chart deals four things and holes: the beatBar (jump),
//     the card box (shoot), the gorilla's barrel (rhythm-2/3), and the drone
//     as a COLUMN of four at DRONE_COLUMN_ALTS 13/29/45/61 (rhythm-2/3). The
//     column is the largest foreign object on the panel: four purple rotor
//     drones with yellow lamps, stacked into a wall in front of the skyline.
//   * IN OVERTIME AND BOSS RUNS the ordinary Spawner deals the pattern bank
//     (data/cabinets.js): BASE_PATTERNS — a red desert cactus, a wooden crate,
//     the big cactus, a songbird, the drone, the barrel — plus this cabinet's
//     own floorSaw, boomBarrier, popSpikes and beatBar. A saguaro and a songbird
//     in a city that has neither, in soft full-colour vector on a segment screen.
//
// THE DIAGNOSIS. The pack chose this on purpose — `actorsAbovePost: "the cast
// draws on top in its production colours, as the things the player is meant to
// track"` — and two of the shared props earn it: the BARREL is the gorilla's
// own (props.js barrel and the tower barrel are "one object in the world and may
// not be two drawings"), and the beatBar's pink chevrons are the beat lane's
// colour, shared with the ribbon. The rest came from other cabinets. What fits
// is not "any colour" but the panel's grammar: SOLID ink segments with hairline
// gaps (the lane's own hazard, the pit gear train, is a solid ink wheel with a
// lit hub), every position a moving part can take printed as a ghost, coral
// where a segment is lit. Solid fill at world scale is the darkest, heaviest
// mark on this screen — the city is 1px line and a 7% wash — so a hazard built
// of it separates from the scenery rather than joining it.
//
// THE VOCABULARY. A building site in a city still going up, generic only: no
// borrowed character or level. NOT GIRDERS: the tower is girders and ladders,
// and a crossing's stepping stones on this cabinet are girders (slabLook
// 'girder', terrain.js drawGirderRun) — a girder in the lane would read as a
// place to land. NOT SPRINGS (the springPad is a pickup), barrels, speakers,
// smokestacks, ladders, gears-as-scenery or clocks, all of which the skyline
// owns. The gear in J is the PIT's material, not the skyline's: the one
// machinery this cabinet already says kills you.
//
// THE HAND. LCD_INK #3c3f45 for every solid segment; segments separated by a
// half-unit gap (one frame px at the run's zoom); off positions in the panel's
// own ghost (LCD_WINDOW_GHOST); lit segments CORAL with the pack's three glow
// rings (LCD_GLOW, halved into world units); pale cuts in LCD_PANEL_LIT, the
// screen showing through. The beat lane keeps its pink. Everything steps on the
// beat at the bank's 124 BPM — nothing on this screen eases.
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units with
// the ground at y = h (obstacle-bakeoff-kit.js, slotEnvelope). Porting means
// copying a body into sprites/props.js under ctx.scale(w / W, h / H), since
// props.js painters receive the box-x-tall size and the run stretches by 4/3 —
// except the beatBar, which draw.js paints at its pumping box with no stretch,
// so B is drawn at that box here. A port reads the heard beat (as the pack's
// lcdSceneFrame does) where these read `t`.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ the panel
// The pack's own inks (stylePacks/index.js), restated rather than imported:
// the pack keeps them module-private.
const INK = '#3c3f45';                          // LCD_INK — every solid segment
const GHOST = 'rgba(60,63,69,0.14)';            // LCD_WINDOW_GHOST — a segment that is off
const LIT = '#dce49a';                          // LCD_PANEL_LIT — the screen through a cut
const CORAL = '#d35b43';                        // LCD_WINDOW_LIT — the one lit colour
// LCD_GLOW's rings are frame px proud of the cell; the lane is drawn at ZOOM 2,
// so the same rings in world units are half as wide.
const CORAL_GLOW = [[1.5, 'rgba(211,91,67,0.07)'], [1, 'rgba(211,91,67,0.16)'], [0.5, 'rgba(211,91,67,0.38)']];
// The beat lane's pink (props.js beatBar, cardBox): the ribbon's colour, kept.
const PINK = '#e04898', PINK_LT = '#f890c8';
const PINK_GLOW = [[1.5, 'rgba(224,72,152,0.07)'], [1, 'rgba(224,72,152,0.16)'], [0.5, 'rgba(224,72,152,0.36)']];
// The gap between two segments: one frame px at the run's zoom.
const SEG = 0.5;

// ------------------------------------------------------------------ the clock
// RHYTHM BANKRUPTCY's bank tempo (songs/rhythm.js). The panel steps on the
// heard beat; a sheet has no song, so it counts the same beats off `t`.
const BPM = 124;
const BEAT_HZ = BPM / 60;
const beatOf = (t) => t * BEAT_HZ;
// Steps per second for a ring that moves `k` times a beat.
const perBeat = (k) => BEAT_HZ * k;
// A lit segment holds three quarters of its beat and goes out for the last
// quarter, as the pack's verb signs flash (LCD_SIGN_DUTY).
const DUTY = 0.75;
const onBeat = (t) => beatOf(t) - Math.floor(beatOf(t)) < DUTY;

// ------------------------------------------------------------------ helpers
function box(c, x, y, w, h, col) {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}

function poly(c, pts, col) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
  c.fillStyle = col;
  c.fill();
}

function disc(c, x, y, r, col) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = col;
  c.fill();
}

// A lit segment: the glow rings proud of it, then the segment. `path` draws the
// segment's outline; the rings are that outline stroked at twice each pad.
function lit(c, path, col = CORAL, rings = CORAL_GLOW) {
  c.save();
  c.lineJoin = 'round';
  for (const [pad, ring] of rings) {
    c.beginPath();
    path(c);
    c.strokeStyle = ring;
    c.lineWidth = pad * 2;
    c.stroke();
  }
  c.beginPath();
  path(c);
  c.fillStyle = col;
  c.fill();
  c.restore();
}

const rectPath = (x, y, w, h) => (p) => p.rect(x, y, w, h);
const polyPath = (pts) => (p) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
  p.closePath();
};
const discPath = (x, y, r) => (p) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); };

// One segment of a set whose positions are all printed: GHOST when it is off,
// `on` (INK, or a lit painter) when it is the live one.
function cell(c, path, isOn, on = INK) {
  if (isOn && typeof on === 'function') { on(c, path); return; }
  c.beginPath();
  path(c);
  c.fillStyle = isOn ? on : GHOST;
  c.fill();
}
const litCell = (col = CORAL, rings = CORAL_GLOW) => (c, path) => lit(c, path, col, rings);

// ================================================================ painters
// All in world units inside the envelope, ground at y = h.

// A — SEGMENT DRONE, as the column the chart deals (low; one rung 22x13)
//
// One rung is the drone redrawn in the panel's hand: a solid ink hull with a
// lit visor, a coral eye that steps across three printed positions one a beat
// (the droneEye's scan, quantised), the rotor's wide and short poses both
// printed with one inked per sixteenth, two skids. The candidate paints the
// rung four times at DRONE_COLUMN_ALTS' sixteen-unit pitch because that is the
// shape rhythm-2 and rhythm-3 deal it in; a port is the single rung.
const RUNG_H = 13;
const COLUMN_PITCH = 16;
const COLUMN_RUNGS = 4;
function droneRung(c, y0, t) {
  const rotor = frameOf(t, 2, perBeat(4));
  const eye = frameOf(t, 4, perBeat(1));
  // Rotor: two blades either side of the hub, wide and short poses printed.
  cell(c, rectPath(0.8, y0 + 0.6, 9.4, 1.3), rotor === 0);
  cell(c, rectPath(11.8, y0 + 0.6, 9.4, 1.3), rotor === 0);
  cell(c, rectPath(5.6, y0 + 0.6, 4.6, 1.3), rotor === 1);
  cell(c, rectPath(11.8, y0 + 0.6, 4.6, 1.3), rotor === 1);
  box(c, 10.2, y0 + 0.2, 1.6, 2.6, INK);
  box(c, 10.5, y0 + 2.8, 1, 1.4, INK);
  // The hull, its chin chamfered, with the visor cut through to the panel.
  poly(c, [4.4, y0 + 4.2, 17.6, y0 + 4.2, 18.6, y0 + 6.2, 17.4, y0 + 9.6, 4.6, y0 + 9.6, 3.4, y0 + 6.2], INK);
  box(c, 5.6, y0 + 5.4, 10.8, 2.6, LIT);
  // The eye: three printed stops across the visor, a fourth beat back home.
  const stop = [0, 1, 2, 1][eye];
  for (let i = 0; i < 3; i++) cell(c, rectPath(6.3 + i * 3.4, y0 + 5.9, 2.6, 1.6), i === stop, litCell());
  // Skids.
  box(c, 6.2, y0 + 9.6 + SEG, 1, 1.6, INK);
  box(c, 14.8, y0 + 9.6 + SEG, 1, 1.6, INK);
  box(c, 4.4, y0 + 11.7, 4.6, 1.1, INK);
  box(c, 13, y0 + 11.7, 4.6, 1.1, INK);
}
function droneColumn(c, w, h, t) {
  for (let k = 0; k < COLUMN_RUNGS; k++) droneRung(c, h - RUNG_H - k * COLUMN_PITCH, t);
}

// B — SEGMENT CHEVRONS (the beatBar on the panel; drawn at its own box)
//
// The shipped bar is three pink chevrons spread across a box that pumps from
// 16 tall on the beat to 24 on the off-beat (run.js, beatSync). On the panel
// that is a level meter: five chevron cells printed in ghost to the bar's full
// reach, and the ones inside the box's current height lit pink — three on the
// beat, five at the top of the pump — the highest one bright. The hitbox is
// the lit stack, and the ghosts above it say how tall it is about to get.
const BAR_W = 10;
const BAR_REST = 16;
const BAR_PUMP = 8;
const CHEV_RISE = 4.6;
const CHEV_BAND = 3;
const CHEV_PITCH = 4;
const CHEV_CELLS = 5;
function segmentChevrons(c, w, h, t) {
  const x0 = (w - BAR_W) / 2, x1 = x0 + BAR_W, xm = x0 + BAR_W / 2;
  const tall = BAR_REST + Math.round(BAR_PUMP * Math.abs(Math.sin(beatOf(t) * Math.PI)));
  const litN = Math.floor((tall - (CHEV_RISE + CHEV_BAND)) / CHEV_PITCH) + 1;
  // Footing: a short ink plinth the column stands in, so it is a thing on the
  // road rather than marks painted on the sky.
  box(c, x0 - 1, h - 1.2, BAR_W + 2, 1.2, INK);
  const base = h - 1.2 - SEG;
  for (let k = 0; k < CHEV_CELLS; k++) {
    const tip = base - (CHEV_RISE + CHEV_BAND) - k * CHEV_PITCH;
    const pts = [x0, tip + CHEV_RISE, xm, tip, x1, tip + CHEV_RISE,
      x1, tip + CHEV_RISE + CHEV_BAND, xm, tip + CHEV_BAND, x0, tip + CHEV_RISE + CHEV_BAND];
    const on = k < litN;
    cell(c, polyPath(pts), on, litCell(k === litN - 1 ? PINK_LT : PINK, PINK_GLOW));
  }
}

// C — COUNTDOWN CARTON (the card box on the panel)
//
// The box keeps its job and its pink target; it is drawn as the panel draws an
// object — an ink carton with the screen showing through its face — and the
// four compass ticks round the ring become the FUSE. Idle, the ring is lit and
// its centre pip flashes with the beat. Shot, the ticks light coral one per
// half beat, so the box counts its own two beats down to the burst
// (BOX_BURST_BEATS) — the quantised destruction, on the box itself. The sheet
// shows idle for six beats of every eight and the count for two.
const CARTON_CYCLE = 8;
const CARTON_FUSE_FROM = 6;
function countdownCarton(c, w, h, t) {
  const beat = beatOf(t);
  const inCycle = ((beat % CARTON_CYCLE) + CARTON_CYCLE) % CARTON_CYCLE;
  const fuse = inCycle >= CARTON_FUSE_FROM ? Math.floor((inCycle - CARTON_FUSE_FROM) * 2) + 1 : 0;
  // Flaps, a little open, then the carton: ink wall, lit face.
  poly(c, [2, 4.6, 7.6, 4.6, 6.4, 2.2, 1.0, 3.0], INK);
  poly(c, [8.4, 4.6, 14, 4.6, 15.0, 3.0, 9.6, 2.2], INK);
  box(c, 2, 4.6 + SEG, 12, h - 5.1, INK);
  box(c, 3, 6.1, 10, h - 7.1, LIT);
  // The ring as four arcs, one behind each tick, split on the diagonals.
  const cx = 8, cy = 10.5, r = 2.6, gap = 0.36;
  for (let q = 0; q < 4; q++) {
    const a0 = q * (TAU / 4) - TAU / 8 + gap, a1 = a0 + TAU / 4 - gap * 2;
    const arc = (p) => { p.arc(cx, cy, r + 0.65, a0, a1); p.arc(cx, cy, r - 0.65, a1, a0, true); p.closePath(); };
    const flash = fuse > 0 && fuse % 2 === 0;
    lit(c, arc, flash ? PINK_LT : PINK, PINK_GLOW);
  }
  // The pip: on with the beat while it waits.
  if (!fuse) cell(c, discPath(cx, cy, 0.85), onBeat(t), litCell(PINK, PINK_GLOW));
  // The fuse: N, E, S, W, lit in that order.
  const TICKS = [[cx - 0.5, cy - r - 2.1, 1, 1.3], [cx + r + 0.8, cy - 0.5, 1.3, 1],
    [cx - 0.5, cy + r + 0.8, 1, 1.3], [cx - r - 2.1, cy - 0.5, 1.3, 1]];
  TICKS.forEach(([x, y, tw, th], i) => cell(c, rectPath(x, y, tw, th), i < fuse, litCell()));
}

// D — JACKHAMMER (stand 17x25, in place of the cactus)
//
// A pneumatic breaker standing in the road, driving itself: T-handle, a ribbed
// ink housing, the bit in a crack. It hammers on the eighths — down on the beat
// and the and, lifted between — and on the strike its vents light coral and the
// chips it throws are inked; lifted, the vents go back to the panel and the
// chips to their printed ghosts. The hose trails off behind it, as hoses do.
function jackhammer(c, w, h, t) {
  const strike = frameOf(t, 2, perBeat(2)) === 0;
  const lift = strike ? 0 : 1.4;
  // Chips, printed where they fly to, inked on the strike.
  const CHIPS = [[2.6, h - 3.4], [1.2, h - 6.2], [13.6, h - 3.0], [15.0, h - 5.8]];
  for (const [x, y] of CHIPS) cell(c, rectPath(x, y, 1.1, 1.1), strike);
  // The crack the bit is in.
  poly(c, [6.6, h, 8.5, h - 1.4, 10.4, h], INK);
  c.save();
  c.translate(0, -lift);
  // Hose: off the housing's back, down and away along the road.
  c.beginPath();
  c.moveTo(12.6, 12.2);
  c.bezierCurveTo(15.6, 13.2, 16.2, 17.6, 15.6, 20.6);
  c.lineTo(15.4, h + lift);
  c.strokeStyle = INK;
  c.lineWidth = 1;
  c.stroke();
  // T-handle and grips.
  box(c, 3.2, 2.4, 10.6, 1.6, INK);
  box(c, 1.6, 1.4, 2.6, 3.6, INK);
  box(c, 12.8, 1.4, 2.6, 3.6, INK);
  box(c, 7.6, 4.0 + SEG, 1.8, 2.0, INK);
  // Housing, its vents cut through to the panel: coral on the strike. An off
  // segment inside ink is the panel, not ghost — ghost on ink is no mark at
  // all, and the lifted frame went to a featureless black block.
  poly(c, [5.0, 6.5, 12.0, 6.5, 12.6, 8.0, 12.6, 14.2, 4.4, 14.2, 4.4, 8.0], INK);
  for (let i = 0; i < 3; i++) cell(c, rectPath(6.0, 8.2 + i * 1.9, 5.0, 0.9), true, strike ? litCell() : LIT);
  box(c, 5.6, 14.2 + SEG, 5.8, 1.6, INK);
  // Bit: a shaft and its chisel point, into the crack.
  box(c, 7.8, 16.3 + SEG, 1.4, 5.6, INK);
  poly(c, [7.6, 22.4, 9.4, 22.4, 8.5, h - 0.4], INK);
  c.restore();
  // The strike: one coral spark where the point meets the road.
  if (strike) lit(c, polyPath([8.5, h - 3.6, 9.4, h - 2.2, 8.5, h - 1.6, 7.6, h - 2.2]));
}

// E — CEMENT MIXER (big 23x26, in place of the big cactus)
//
// The site mixer on its stand and one wheel, drum tilted up to its mouth. The
// drum is drawn the way the girders on this cabinet are — ink rim, panel
// showing through — and its mixing fin is one of four printed positions,
// stepping round a quarter turn a beat so it churns in time. The motor lamp is
// coral and the slop in the mouth is the one grey on the sheet: wet cement.
const CEMENT = '#9a9f8f';
function cementMixer(c, w, h, t) {
  const turn = frameOf(t, 4, perBeat(1));
  // Tow bar to the left, the stand leg on the right, the wheel.
  box(c, 0.6, h - 8.4, 5.4, 1.2, INK);
  poly(c, [15.6, 17.0, 17.4, 17.0, 18.6, h - 1.2, 16.8, h - 1.2], INK);
  box(c, 15.4, h - 1.2, 4.6, 1.2, INK);
  disc(c, 7.4, h - 3.6, 3.6, INK);
  disc(c, 7.4, h - 3.6, 1.5, LIT);
  disc(c, 7.4, h - 3.6, 0.5, INK);
  // The A-frame from axle to drum, and the motor box on it.
  poly(c, [5.6, h - 4.4, 9.0, 15.6, 10.6, 15.6, 9.0, h - 3.2], INK);
  box(c, 10.6, 15.0, 6.6, 4.4, INK);
  lit(c, rectPath(14.4, 16.2, 1.6, 1.6));
  // The drum, tilted: belly toward the stand, mouth up to the right.
  c.save();
  c.translate(11.2, 9.6);
  c.rotate(-0.46);
  const drum = (p) => {
    p.moveTo(-7.2, -3.6);
    p.quadraticCurveTo(-8.8, 0, -7.2, 3.6);
    p.lineTo(2.6, 5.6);
    p.lineTo(7.4, 3.0);
    p.lineTo(7.4, -3.0);
    p.lineTo(2.6, -5.6);
    p.closePath();
  };
  c.beginPath();
  drum(c);
  c.fillStyle = INK;
  c.fill();
  c.save();
  c.beginPath();
  drum(c);
  c.clip();
  // The panel through the drum, inside a one-unit rim.
  c.beginPath();
  c.moveTo(-6.4, -2.7);
  c.quadraticCurveTo(-7.8, 0, -6.4, 2.7);
  c.lineTo(2.4, 4.5);
  c.lineTo(6.4, 2.3);
  c.lineTo(6.4, -2.3);
  c.lineTo(2.4, -4.5);
  c.closePath();
  c.fillStyle = LIT;
  c.fill();
  // Fins: four printed positions across the belly, one inked a beat.
  for (let i = 0; i < 4; i++) {
    const x = -5.6 + i * 2.6;
    cell(c, polyPath([x, -6, x + 1.2, -6, x + 3.0, 6, x + 1.8, 6]), i === turn);
  }
  c.restore();
  // The mouth: an ink ring end-on, cement slopping in it.
  c.beginPath();
  c.ellipse(7.4, 0, 1.4, 3.0, 0, 0, TAU);
  c.fillStyle = INK;
  c.fill();
  c.beginPath();
  c.ellipse(7.5, 0.4, 0.7, 2.0, 0, 0, TAU);
  c.fillStyle = CEMENT;
  c.fill();
  c.restore();
}

// F — PALLET OF BRICKS (stack 16x15, in place of the crate)
//
// Three courses of stretcher bond on a pallet, strapped. Each brick is its own
// segment in an ink bed, so the stack is literally built of LCD cells — and the
// bricks are coral, the colour bricks are and the one this screen reserves for
// lit. Printed, not glowing: a brick is not a lamp.
// Shown single and two high, a pallet on a pallet, the way a site stacks them.
function brickPallet(c, w, h) {
  // Pallet: deck board over three blocks.
  box(c, 1.4, h - 2.8, 13.2, 1.1, INK);
  for (const x of [1.6, 7.0, 12.4]) box(c, x, h - 1.7 + SEG * 0.4, 2.0, 1.5, INK);
  // Bricks: 3.8 x 2.3, offset a half-brick a course. The mortar is INK, laid
  // as one block behind them: a stack is solid, and see-through joints let the
  // tower's climber show through the bricks. The block's edge is the outline.
  const BW = 3.8, BH = 2.3, M = SEG;
  const left = 2, right = 14;
  const top = h - 2.8 - 3 * BH - 3 * M;
  box(c, left - M, top - M, right - left + 2 * M, h - 2.8 - top + M, INK);
  for (let row = 0; row < 3; row++) {
    const y = h - 2.8 - (row + 1) * (BH + M);
    const off = row % 2 ? -(BW + M) / 2 : 0;
    for (let x = left + off; x < right; x += BW + M) {
      const x0 = Math.max(left, x), x1 = Math.min(right, x + BW);
      if (x1 - x0 > 0.4) box(c, x0, y, x1 - x0, BH, CORAL);
    }
  }
  // Two steel straps round the stack, over the top course.
  box(c, 4.6, top - M, 0.8, h - 2.8 - top + M, INK);
  box(c, 10.6, top - M, 0.8, h - 2.8 - top + M, INK);
}

// G — HOT RIVET (high flyer 22x13, in place of the songbird)
//
// A red-hot rivet tossed across the site at head height, the way the heater
// threw them up to the gang on the steel. It tumbles end over end through four
// printed poses, a step every eighth — the other three in ghost round it, a
// segment set at one cell — coral in an INK rim, with a pale white-hot core,
// and sheds sparks behind it. The rim is not optional: a coral shape on its
// own is a lit window on this panel, and the first draft of this rivet read as
// one more of them, floating.
const RIVET_POSES = 4;
const RIVET_RIM = 0.9;
function hotRivet(c, w, h, t) {
  const pose = frameOf(t, RIVET_POSES, perBeat(2));
  const cx = 10.0, cy = 7.0;
  const rivet = (a) => (p) => {
    // Head and shank as one outline: a dome on a stub, along angle `a`.
    const ca = Math.cos(a), sa = Math.sin(a);
    const P = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
    const pts = [[-5.4, -1.3], [-1.6, -1.3], [-1.6, -3.6], [0.4, -3.6], [2.2, -2.7], [3.0, 0],
      [2.2, 2.7], [0.4, 3.6], [-1.6, 3.6], [-1.6, 1.3], [-5.4, 1.3]].map(([u, v]) => P(u, v));
    p.moveTo(...pts[0]);
    for (const q of pts.slice(1)) p.lineTo(...q);
    p.closePath();
  };
  for (let i = 0; i < RIVET_POSES; i++) {
    if (i !== pose) cell(c, rivet((i / RIVET_POSES) * TAU), false);
  }
  const live = rivet((pose / RIVET_POSES) * TAU);
  lit(c, live);
  c.beginPath();
  live(c);
  c.strokeStyle = INK;
  c.lineWidth = RIVET_RIM;
  c.lineJoin = 'round';
  c.stroke();
  disc(c, cx, cy, 1.1, LIT);
  // Sparks shed behind it: two printed trails, alternating each eighth.
  const SPARKS = [[[15.6, 4.2], [18.4, 8.6], [20.4, 5.4]], [[16.8, 9.0], [19.2, 3.8], [20.8, 9.4]]];
  SPARKS.forEach((set, k) => {
    for (const [x, y] of set) cell(c, rectPath(x, y, 1.2, 1.2), k === pose % 2, litCell());
  });
}

// H — ROAD BARRICADE (hurdle 21x12, in place of the razor hurdle)
//
// The roadworks board on two A-frames: coral-and-panel chevron stripes in an
// ink frame, and a flasher on the end that lights on the beat and goes out for
// the last quarter of it, printed in ghost when it is off. Same low jump as the
// boomBarrier; the feet are the two contacts, the board the hitbox.
function roadBarricade(c, w, h, t) {
  // Legs: an A-frame under each end.
  for (const x of [4.0, 17.0]) {
    poly(c, [x - 0.5, 6.8, x + 0.5, 6.8, x - 1.6, h, x - 2.8, h], INK);
    poly(c, [x - 0.5, 6.8, x + 0.5, 6.8, x + 2.8, h, x + 1.6, h], INK);
  }
  // Board: an ink frame, stripes inside it.
  box(c, 1, 2.8, 19, 4.4, INK);
  c.save();
  c.beginPath();
  c.rect(1.8, 3.6, 17.4, 2.8);
  c.clip();
  box(c, 1.8, 3.6, 17.4, 2.8, LIT);
  for (let x = -1; x < 22; x += 4.4) poly(c, [x, 6.4, x + 2.2, 6.4, x + 4.6, 3.6, x + 2.4, 3.6], CORAL);
  c.restore();
  // The flasher on the left post: housing, then the lens.
  box(c, 2.2, 0.4, 3.4, 2.4 - SEG, INK);
  cell(c, rectPath(2.8, 0.9, 2.2, 1.2), onBeat(t), litCell());
}

// I — REBAR (in the floor 20x16, in place of the spike plate)
//
// A broken slab in the road with its reinforcing bars standing up out of it,
// cut on the slant, the last one bent over: the building site's own spikes, and
// the hazard every site tapes off. The bent one carries a strip of coral warning tape that snaps between
// two printed positions on the beat. Bedded like the plate; the road cuts it.
//
// Rods: [foot x, tip x, tip y, cut slant]. Leaning a little, never parallel.
// Each is ROD_W thick — twice the tower's ladder rails at the run's zoom, so
// the rods are bars in the road and not more of the ladder behind them. Plain
// ink: ribs cut through in panel turned them into barber's poles.
const REBAR_RODS = [[3.6, 3.0, 4.4, 1], [8.0, 8.4, 2.0, -1], [12.2, 11.8, 3.2, 1]];
const ROD_W = 1.9;
function rebar(c, w, h, t) {
  const flap = frameOf(t, 2, perBeat(1));
  const road = h - 2;
  const half = ROD_W / 2;
  for (const [fx, tx, ty, s] of REBAR_RODS) {
    poly(c, [fx - half, road + 2, fx + half, road + 2,
      tx + half, ty + (s > 0 ? 1.8 : 0), tx - half, ty + (s > 0 ? 0 : 1.8)], INK);
  }
  // The last bar is bent over at the top, as starter bars are left — the one
  // shape that says reinforcing steel rather than a row of spikes.
  c.beginPath();
  c.moveTo(16.4, road + 2);
  c.lineTo(16.6, 4.2);
  c.quadraticCurveTo(16.8, 1.6, 19.0, 1.8);
  c.strokeStyle = INK;
  c.lineWidth = ROD_W;
  c.stroke();
  // The tie wire binding them, a hand above the slab.
  box(c, 2.4, road - 4.4, 15.6, 0.7, INK);
  // The tape tied under the hook: two printed tails, one live a beat.
  const TAPE = [[17.4, 5.4, 20, 4.6, 20, 6.0, 17.4, 6.8], [17.4, 5.4, 19.8, 7.8, 18.8, 8.8, 17.4, 6.8]];
  TAPE.forEach((pts, k) => cell(c, polyPath(pts), k === flap, litCell()));
  // The broken slab edge either side, a jag of ink on the road line.
  poly(c, [0.2, road, 1.4, road - 2.0, 2.6, road - 1.0, 4.4, road - 2.2, 6.0, road], INK);
  poly(c, [13.6, road, 15.2, road - 1.8, 17.0, road - 0.8, 18.4, road - 2.2, 19.8, road], INK);
}

// J — COG IN THE ROAD (in the floor, blade 20x15, in place of the floor saw)
//
// The works under this road, coming up through a slot in it: a toothed wheel in
// the gear pit's exact drawing (lcdGear — solid ink disc, square teeth, a lit
// hub with an ink pin), ratcheting half a tooth every eighth, top running at the
// hero. Where it bites the road, coral sparks fly off alternate sides a beat.
const COG_R = 7.4;
const COG_TEETH = 10;
function cogInRoad(c, w, h, t) {
  const step = frameOf(t, COG_TEETH * 2, perBeat(2));
  const side = frameOf(t, 2, perBeat(1));
  const road = h - 2;
  const cx = w / 2, cy = road + 1.6;
  c.save();
  c.translate(cx, cy);
  c.rotate(-(step / (COG_TEETH * 2)) * TAU);
  c.fillStyle = INK;
  c.beginPath();
  c.arc(0, 0, COG_R - 2.2, 0, TAU);
  c.fill();
  for (let i = 0; i < COG_TEETH; i++) {
    c.rotate(TAU / COG_TEETH);
    c.fillRect(-1.5, -COG_R, 3, 2.6);
  }
  c.restore();
  disc(c, cx, cy, 2.2, LIT);
  box(c, cx - 0.5, cy - 0.5, 1, 1, INK);
  // Sparks off the bite, printed both sides, lit on alternate beats.
  const SPARKS = [[[cx - 7.8, road - 1.6], [cx - 9.4, road - 3.2], [cx - 8.2, road - 4.6]],
    [[cx + 6.8, road - 1.6], [cx + 8.4, road - 3.2], [cx + 7.2, road - 4.6]]];
  SPARKS.forEach((set, k) => {
    for (const [x, y] of set) cell(c, rectPath(x, y, 1, 1), k === side, litCell());
  });
}

// ============================================================== the bake-off
export const BAKEOFF = {
  cabinet: 'rhythm',
  title: 'RHYTHM BANKRUPTCY — obstacles for the LCD (bake-off)',
  note: 'On the beat lane the chart deals four props — the pink beat bar, the card box, the gorilla’s barrel and '
    + 'a column of four rotor drones — and overtime adds the shared bank: a desert cactus, a wooden crate, a songbird, '
    + 'a purple drone, a saw, spikes and a razor hurdle, in full-colour vector on a segment screen. The barrel is the '
    + 'gorilla’s own and stays; everything else is redrawn here as LCD segments — solid graphite with hairline gaps, '
    + 'every moving part’s positions printed in ghost, coral where it is lit, stepping on the beat — from a building '
    + 'site still going up, and never girders, which this cabinet already uses as stepping stones. Pick letters.',
  // One strip of the real frame. The LCD city is fixed to the glass and reads its
  // stage from bg()'s `scene` argument, which the kit does not pass, so every
  // strip would show rhythm-1's skyline: one strip, honest about it. The
  // candidate stands in front of the girder tower, the busiest stretch of it.
  strips: [
    { label: 'RHYTHM BANKRUPTCY 1', stageIndex: 1, camX: 600 },
  ],
  // The detail row's panels: rhythm-1's sky at the road and at the top of its
  // gradient, rhythm-3's late-afternoon sky at the road; the road's ink line
  // and the lit panel under it.
  swatches: [
    { sky: '#a8cf8a', ground: '#3c3f45', under: '#dce49a', ink: 'rgba(214,40,120,0.85)' },
    { sky: '#e7e7a3', ground: '#3c3f45', under: '#dce49a', ink: 'rgba(214,40,120,0.85)' },
    { sky: '#759a84', ground: '#3c3f45', under: '#dce49a', ink: 'rgba(214,40,120,0.85)' },
  ],
  // What the cabinet deals today, through the real run painter: [type, x]. The
  // campaign's four (beatBar, cardBox, barrel, drone) and overtime's bank.
  control: [['beatBar', 6], ['cactus', 24], ['cardBox', 78], ['crate', 96], ['cactusBig', 116], ['boomBarrier', 138],
    ['barrel', 160], ['floorSaw', 180], ['popSpikes', 202], ['drone', 94], ['buzzbird', 196]],
  candidates: [
    { letter: 'A', id: 'segmentDrone', name: 'SEGMENT DRONE', slot: 'low', tall: 4.84, detailCrop: RUNG_H, paint: droneColumn,
      note: 'The drone in the panel’s hand: ink hull, lit visor, a coral eye stepping across three printed stops a beat, the rotor’s two poses printed and one inked per sixteenth. Shown as the column of four rhythm-2 and rhythm-3 deal (16-unit pitch); a port is one 22x13 rung.' },
    { letter: 'B', id: 'segmentChevrons', name: 'SEGMENT CHEVRONS',
      slot: { box: [10, 16], tall: 1.5, name: 'ON THE BEAT', was: 'beatBar — 10x16 pumping to 24 off the beat, jump' },
      paint: segmentChevrons,
      note: 'The beat bar as a level meter: five chevron cells printed to its full reach, the ones inside the pumping box lit pink — three on the beat, five on the off-beat — the top one bright. Drawn at the bar’s own box, as draw.js paints it; the pink stays, it is the ribbon’s.' },
    { letter: 'C', id: 'countdownCarton', name: 'COUNTDOWN CARTON',
      slot: { box: [12, 11], tall: 1, name: 'SHOOT ON THE BEAT', was: 'cardBox — 12x11, shoot it, bursts on the beat' },
      paint: countdownCarton,
      note: 'The card box as an ink carton with the panel through its face; the pink ring stays, its pip flashes with the beat. Shot, the four ticks are the fuse — lit coral one per half beat, the two-beat count to the burst on the box itself. Shown idle six beats in eight.' },
    { letter: 'D', id: 'jackhammer', name: 'JACKHAMMER', slot: 'stand', paint: jackhammer,
      note: 'A breaker driving itself into the road on the eighths: on the strike its vents light coral, the chips it throws ink in and a spark jumps at the point; lifted, they go out. Replaces the desert cactus.' },
    { letter: 'E', id: 'cementMixer', name: 'CEMENT MIXER', slot: 'big', paint: cementMixer,
      note: 'Site mixer on a wheel and a stand, drum tilted to its mouth. The drum is ink rim and panel like the lane’s girders; its fins step a quarter turn a beat through four printed positions. Coral motor lamp. Replaces the big cactus.' },
    { letter: 'F', id: 'brickPallet', name: 'PALLET OF BRICKS', slot: 'stack', paint: brickPallet,
      note: 'Three courses of coral brick on an ink pallet, strapped, every brick its own segment in an ink bed. Stacks as a pallet on a pallet. Replaces the wooden crate.' },
    { letter: 'G', id: 'hotRivet', name: 'HOT RIVET', slot: 'high', paint: hotRivet,
      note: 'A red-hot rivet in an ink rim, thrown across the site at head height, tumbling through four printed poses an eighth apart, white-hot core, shedding coral sparks. Replaces the songbird.' },
    { letter: 'H', id: 'roadBarricade', name: 'ROAD BARRICADE', slot: 'hurdle', paint: roadBarricade,
      note: 'Roadworks board on two A-frames, coral chevrons in an ink frame, a flasher on the end lit for three quarters of every beat. Same low jump. Replaces the razor hurdle.' },
    { letter: 'I', id: 'rebar', name: 'REBAR', slot: 'floor', paint: rebar,
      note: 'Reinforcing bars cut on the slant, one bent over, standing out of a broken slab in the road, a coral warning tape snapping between two printed positions on the beat. The site’s own spikes. Replaces the spike plate.' },
    { letter: 'J', id: 'cogInRoad', name: 'COG IN THE ROAD', slot: 'saw', paint: cogInRoad,
      note: 'The gear pit’s own wheel coming up through a slot — solid ink, square teeth, lit hub — ratcheting half a tooth an eighth, coral sparks off alternate sides a beat. Replaces the floor saw with the machinery this cabinet already kills you with.' },
  ],
};

export { frameOf };
