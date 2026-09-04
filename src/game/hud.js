// HUD: status pill (cells + coins), power-up timers, relay meter + team faces,
// mission progress, world progress bar, speech bubbles, goal toasts.
//
// Everything the HUD puts on screen sits on a panel from drawPanel — same fill,
// same hairline, same corner. The overlay used to be three languages at once
// (a coin on a soft text plate, a row of pickup sprites, a tray of framed plug
// squares) stacked down the left, and the corner read as clutter rather than as
// one instrument. One chrome, and the eye can learn it once.
import { W, H, chrome as chromeGeo } from '../engine/renderer.js';
import {
  drawText as rawDrawText, drawTextCentered as rawDrawTextCentered,
  textWidth, wrapText, drawPanel, drawRoundButton, drawActionPill, textYForMid, UI_PANEL_BORDER,
  keyLegendWidth, drawKeyLegend, platePath, UI_PANEL, UI_PLATE,
} from '../engine/sprites.js';
import { toonFaceSprite } from '../sprites/toons.js';
import { drawProp, drawHudBattery, hudBatteryW } from '../sprites/props.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { POWER_DEFS } from './powerups.js';
import { specialMoveColor, HERO_CENTER_OFF } from './draw.js';
import { Input, TOUCH_JUMP_FRAC } from '../engine/input.js';
import { ACTION_INK, GLYPH_OUTLINE } from './beatground.js';
import { PLAYER_X } from './player.js';
import { formatCoins } from './progress.js';
import { Audio } from '../engine/audio.js';

// The one chrome. Passed to every drawPanel call in the HUD.
const PANEL = { border: UI_PANEL_BORDER, shadow: true };

// ---------------------------------------------------------------- layout
// The frame's anchors. Everything else in this file is measured off these,
// including the beat ribbon below, so they come first.
// THE FRAME MARGIN. ONE NUMBER FOR EVERY EDGE — nothing on the HUD paints
// closer than this to the side of the screen, on any side. It used to be three
// numbers that had each drifted for their own local reason (8 at the sides, 7 at
// the top once the hero disc arrived, 4 at the bottom), which is invisible one
// corner at a time and unmistakable once you look at the frame as a whole.
//
// It is a FLOOR, not a rule that every panel touches: a short panel centred on
// its row's midline sits deeper than this, and should.
const EDGE = 6;
// THE BOTTOM EDGE TAKES HALF. The other three margins hold panels off a screen
// edge the eye reads as the end of the picture; the bottom one holds them off
// the ground the hero is running on, and every pixel it takes is play field
// rather than frame. So the readouts down there sit tighter — a deliberate
// asymmetry, stated once, not three numbers that drifted apart again.
const EDGE_BOTTOM = EDGE / 2;
// The one thing it does NOT govern is the touch buttons below, which are
// placed by what a thumb can reach, nor the world progress line, which is
// deliberately flush with the top edge because it is a bar and not a panel.

// The free-standing portrait disc, and the tallest thing in the top row — so it
// is the disc, not the pill, that the row's inset is measured on. It lives up
// here with the pill rather than down with the chip cuts because PILL_Y is
// derived from it. Its own ceiling is what stops it growing: the world progress
// line owns the top 3px of the frame, and at EDGE this already leaves 3.
const DISC_R = 11;
// The portrait disc is its own lit face plate, not another copy of the status
// pill's low-contrast backing. It has to survive a small crop over bright or
// dark stage art while still leaving the hero's face as the focal point.
export const HERO_DISC_PLATE = 'rgba(144,170,190,0.98)';
// NO HUD-ONLY INK. The plates draw the lines the run draws — the portrait is
// the same hero, and a corner that inks him differently reads as a different
// drawing of him. The thinning that used to live here was aimed at a face that
// looked like a dark sticker, and that face was a half-pixel resample (see
// drawChipFace) under a light field anchored off the head (see paintFace);
// with both fixed there is nothing left for it to correct.
export const HERO_DISC_RIM_W = 0.75;
// EVERYTHING IN THE TOP ROW IS PLACED OFF PILL_CY (the objective panels take
// HERO_CY, which is this), so this is the one line that moves the strip. The
// pill is 4px shorter than the disc beside it and shares its midline, so its own
// top inset comes out at EDGE + 2 — which is the floor doing its job, not a
// second margin.
const PILL_X = EDGE, PILL_H = 18;
const PILL_Y = EDGE + Math.max(0, DISC_R * 2 - PILL_H) / 2;
const PILL_CY = PILL_Y + PILL_H / 2, PILL_R = 6.5;

// THE OBJECTIVE ROWS, top-right. Module-level because the fold-up bake-off in
// the gallery places panels on these same two lines, and a row a tile measures
// for itself is a row that can disagree with the run's.
//
// The first is centred on PILL_CY so every top-row panel sits level instead of
// GOAL riding high; the second hangs below it with a real gap, because the two
// panels are a hierarchy and not one block.
export const OBJ_RIGHT = W - EDGE;
export const OBJ_ROW_Y = PILL_CY - PILL_H / 2;
export const OBJ_ROW2_Y = OBJ_ROW_Y + PILL_H + 4;
// The air between two chips sharing the mission's row — the same 5 the tag
// inside a panel is padded by, so the pair reads as one group with the panel's
// own rhythm rather than as two things that happen to be near each other.
const CHIP_GAP = 5;
// Where the fold-up cut stops sliding and starts rising: two thirds of the
// clock buys the slide along row 2, the last third the climb onto row 1.
const FOLDUP_SLIDE = 0.65;

// THE BEAT RIBBON'S BAND, and it is exported because it is not only the
// ribbon's business: the strip shares the band a speech card is anchored in,
// so anything that prints there has to be told to stand clear. The ribbon used
// to be drawn straight through Lorenzo's lines on a rhythm stage.
//
// It rides IN LINE with the objective panels' BONUS row now rather than on a
// full-width bar below them: a frame-wide strip was mostly empty plastic, and
// giving that band back is what let the land rise. It FADES OUT at both ends
// instead of stopping — a marker materialises out of the right-hand fade as
// its beat approaches.
//
// THE PLAYHEAD STANDS OVER THE HERO, not at the centre of the frame. Centred,
// it was 184px to his right: the player has to watch the hero, so reading the
// beat cost a glance up AND across, and the two things that must be timed
// together sat at opposite ends of one look. Anchored to PLAYER_X the strip is
// a ceiling directly above him and the future runs off to the right — the same
// direction the world arrives from, so the strip and the ground now agree.
//
// EVERY DIMENSION ON THE STRIP IS RIBBON_SCALE TIMES A UNIT, and the unit is
// the size the strip was drawn at when it lived centre-frame. That is not
// tidiness for its own sake: the glyphs are the whole readout, and at 1x a coin
// tick is a 3px square. The screen fits its 480-wide backbuffer to a phone by
// height, so a landscape iPhone renders about 1.4 CSS px per logical px — that
// square lands at 4 CSS px, under a thumb, on the one device where the player
// is closest to the panel and least able to squint at it. Scale is the only
// honest fix; nudging one glyph up leaves the rest of the strip behind it.
//
// Scaling the BEAT SPACING with the glyphs and not just the glyphs is what
// keeps a coin fill legible: fills subdivide to COIN_DIV per beat, so the gap
// between two sixteenths is beatPx/4 and the tick has to stay small against it.
// Grow one without the other and a fill closes into a bar.
const RIBBON_SCALE = 2;
// THINNER THAN THE HUD, but not so thin that it feels like a hairline: fifteen
// pixels against the pill's eighteen. The midline every glyph hangs off (see
// `mid` in drawBeatRibbon) stays put while the plate gets a little more room
// around it. The plate was never doing any work with that ink.
//
// The strip then moved UP as a whole, midline and all — and then all the way up
// ONTO THE TOP ROW, so it shares one midline with the status pill on its left
// and the GOAL panel on its right instead of hanging in a band of its own under
// them. Set from PILL_CY rather than typed, because the row's height is the
// pill's business and this is a passenger on it.
//
// WHAT THIS COSTS, stated here because it is not visible from this line: the
// strip's own left edge is no longer free. Its back end has to clear the status
// corner, and the playhead stands over the hero — who on a rhythm stage (camZoom
// 1.6) lands at x~99, about three pixels right of where the pill ends. See
// RIBBON_MARGIN for what gives.
//
// The glyphs still use the same peak-safe 6u envelope: an arrow is ARROW_H = 2u
// either side of the midline, the beat swells it by RIBBON_PULSE to 2.5u, and
// GLYPH_EDGE adds half a unit of border. The extra height is breathing room for
// the lane itself, not a second scale jump for the action shapes.
const RIBBON_H = Math.round(7.5 * RIBBON_SCALE);
const RIBBON_Y = PILL_CY - RIBBON_H / 2;
// The bottom edge of the rhythm ribbon, in frame px. Exported because the
// world has to keep out from under it: the chase copter flies below this line.
export const RIBBON_BOTTOM = RIBBON_Y + RIBBON_H;
export const RIBBON_BEAT_PX = Math.round(26 * RIBBON_SCALE);
// Where the playhead stands, in the OVERLAY's unscaled 480x270 space — which is
// not PLAYER_X, because the world is drawn through the camera's zoom and the
// overlay is not. The hero's own draw does `heroScreenX() * z` (see
// run.heroScreenRect), so on a stage sitting at 2.08x he lands at 129 and a
// playhead pinned to 56 would miss him by half the strip. Same arithmetic here,
// off the centre of his 12px slot rather than its left edge.
//
// PLAYER_X and not run.heroScreenX(): that one moves for the intro run, the
// finish and a pit death, and a playhead that slides out from under the hero as
// he crosses the line is worse than one that never claimed to follow him.
//
// A mirrored run reverses the whole frame, so it reverses this too: the future
// has to run off toward the side the world is arriving from, or the strip and
// the ground disagree about which way time points.
function ribbonAnchor(run) {
  const cx = (PLAYER_X + HERO_CENTER_OFF) * (run.camZoom || 1);
  return run.mirror ? W - cx : cx;
}
// The plate's live geometry in screen px, measured along its own axis: how much
// of it lies behind the playhead and how much ahead. `near` is the playhead's
// distance from the edge the past runs off toward, and it is the same number
// mirrored or not — ribbonAnchor has already flipped the frame — so everything
// below is written once and works both ways round.
function ribbonSpan(run) {
  const anchor = ribbonAnchor(run);
  const near = run.mirror ? W - anchor : anchor;
  const minBack = RIBBON_MIN_BACK_BEATS * RIBBON_BEAT_PX;
  const margin = Math.min(RIBBON_MARGIN, Math.max(0, near - minBack));
  // THE FAR END IS THE GOAL PANEL, not a mirror of the near one. Now that the
  // strip rides on the HUD row it is the lane BETWEEN two panels, and the thing
  // it should stop at is the panel — not a distance that happens to match it on
  // one stage and slides under it on the next. The near end keeps the margin,
  // because the thing IT has to answer to is the playhead's trail, not the pill.
  //
  // run.hudGoalLeft is last frame's measurement: drawHud paints the strip before
  // the objective panels so they cover its end rather than the other way round,
  // so the width can only be known one frame late. It changes when the mission's
  // count gains a digit and at no other time, which is a pixel, once, on a frame
  // where a number was already changing. Falling back to the margin keeps the
  // first frame of a stage honest.
  const far = Number.isFinite(run.hudGoalLeft) ? run.hudGoalLeft : W - margin;
  const ahead = run.mirror ? W - far : far;
  return { anchor, backW: near - margin, aheadW: Math.max(minBack, ahead - near) };
}
// THE PLATE IS LAID OUT FROM THE FRAME, NOT FROM THE BEAT COUNT. It ends the
// same distance from the right edge of the screen as it begins from the left —
// exactly the same, on every stage — and the window in beats is whatever fits
// between. It used to be the other way round: a fixed 1 beat behind and 4.5
// ahead, hung off a playhead whose x is `62 * camZoom`, so the air at the two
// ends came out however the stage's zoom happened to leave it (71px and 123px
// on a 2.0x stage) and moved whenever the zoom did. A strip that is not square
// with its own frame reads as one that has slipped, and no pair of beat figures
// fixes that for every zoom at once.
//
// So RIBBON_MARGIN is the air, and it is the only figure here with an opinion.
// 88 brings the near end in from the 71 it was sitting at, and takes the far
// end out to 392 — clear of the folded BONUS panel, whose left edge lands
// around 417. The panel only reaches further left while it is still holding its
// full sentence, and that shrinks away on its own (see BONUS_FOLD).
const RIBBON_MARGIN = 125;
// The playhead still stands over the hero, so what the margin costs is the BACK
// end: the plate begins at the margin now rather than a fixed beat behind him,
// which on a 2.0x stage leaves about two thirds of a beat. That end is not
// slack — it is the missed marker's trail (see beatRibbonMarkerOffset), without
// which a marker annihilates against a wall instead of travelling THROUGH the
// line — so it gets a floor rather than being allowed to close up entirely. A
// hero far enough left to hit that floor takes it out of the margin at BOTH
// ends, because equal air is the thing being kept.
const RIBBON_MIN_BACK_BEATS = 0.5;
// The lookahead the exported marker helper culls at when nobody hands it the
// live one. It is the figure the plate used to be built from, and still about
// what a normal stage works out to (~5 beats, ~2.4s of warning at 124bpm,
// against the ~1.6s of runway the ground itself shows once the speed ramp is at
// its cap). A marker crosses in at zero ink at the far edge of its own
// lookahead; see RIBBON_FADE_BACK for why it does not leave the same way.
const RIBBON_AHEAD_BEATS = 4.5;
// The fades are NOT the same width, because the two ends are not the same
// length. A one-beat fade on a back end shorter than a beat is a plate whose
// left half never reaches full ink at all: it ramps from nothing to solid
// exactly at the playhead, so the eye never finds the left edge and reads the
// strip as starting somewhere around the hero — while the right end carries
// most of 300px of solid ink before its own fade begins. A short fade back and
// a long one forward puts the visible mass where the plate actually is. Each is
// clamped to the end it fades, so a squeezed back end dims rather than dividing
// by a length it does not have.
const RIBBON_FADE_BACK = Math.round(0.35 * RIBBON_BEAT_PX);
const RIBBON_FADE_AHEAD = RIBBON_BEAT_PX;
// THE PLATE AND THE GLYPHS FADE OVER DIFFERENT DISTANCES, and they always
// should have. A marker has to materialise gradually or it pops into the lane,
// which is why the glyph fade ahead is a whole beat. The PLATE's job is the
// opposite: it IS the lane, running from one HUD panel to the other, and one
// that has dissolved fifty pixels before the panel it runs up to reads as a
// strip that stopped short rather than as a strip that reaches. So the plate
// closes over the same short distance at both ends and the markers keep their
// long fade INSIDE it — which also means a marker now fades in against lane
// rather than against sky, and reads as arriving instead of appearing.
const RIBBON_PLATE_FADE = RIBBON_FADE_BACK;
const RIBBON_PLATE = 'rgba(16,20,28,0.55)';
// How far an action glyph swells on the downbeat, as a fraction of its size.
// A quarter is the most it can take before the arrows start clipping their own
// lane at the top of the swell; it is also about the least that still reads as
// a pulse rather than as a jitter at the size these are drawn.
const RIBBON_PULSE = 0.25;
// How far the playhead stands proud of the plate at each end. FLAT PIXELS, not
// units: this one number is not a glyph and does not scale with them. At three
// units it was 6px of overhang at each end plus its casing — a red post as tall
// again as the strip, and the biggest thing on the panel by a distance.
//
// One, not two. With its casing that is still 2px clear of a 12px plate at each
// end — the tab reads as a tab, and the eye finds the line by its colour rather
// than by its height. At two the column ran half as tall again as the band it
// marks, which on a pale LCD sky was the first thing you saw and the last thing
// you needed to see.
const RIBBON_TAB = 1;
export const BEAT_RIBBON_BOTTOM = RIBBON_Y + RIBBON_H + RIBBON_TAB;
// The row a speech card's first line sits on when nothing is pushing it down.
//
// IT IS THE BEAT STAGE'S ROW NOW, on every stage. This used to be a flat 46 —
// a row clear of BOTH the HUD's shoulders, because the card is as wide as its
// longest line and at full width it crosses them — with a separate, higher
// figure for beat stages that only had to clear the ribbon. The ribbon has
// since moved to the top of the screen and taken the sky with it, and the old
// arrangement had the card sitting fifteen pixels lower than anything above it
// required, in the middle of a panel that had just been given room.
//
// drawSpeech hangs its plate four units above the row it is handed, so
// clearing the strip means clearing it by four more than it looks — plus three
// of air, or the card and the ribbon read as one stacked instrument.
//
// What pays for the lift is WIDTH, not luck: up here the card has to fit
// between the two shoulders instead of sitting under them, so a run narrows it
// to the gap they leave. See speechChannel. A caller with no HUD around it —
// the hub, the gallery — keeps the full width and simply talks higher.
const SPEECH_Y = BEAT_RIBBON_BOTTOM + 4 + 3;

// Keep the ribbon in musical coordinates all the way to the canvas. Returning
// a fractional logical pixel is intentional: the overlay canvas has enough
// backing resolution to render that smoothly, while Math.round here becomes a
// conspicuous multi-screen-pixel hop after the game is scaled up.
export function beatRibbonOffset(actionBeat, currentBeat, beatPx = RIBBON_BEAT_PX) {
  if (!Number.isFinite(actionBeat) || !Number.isFinite(currentBeat)) return null;
  return (actionBeat - currentBeat) * beatPx;
}

// A MARKER RETIRES BY GEOMETRY, NOT BY ITS OBJECT'S FATE. It comes in at the far
// edge of the lookahead, travels THROUGH the line, and leaves off the back end —
// and that is the whole rule. Nothing about the thing it stands for shortens it:
// not a coin already collected, not an arrow already judged, not a hole already
// crossed. The strip is the chart being played, not a list of what is left.
//
// It used to retire on the object instead — coins at the line the moment their
// tick was due, mandatory arrows the moment the judge consumed them — and the
// on-beat window is what made that unwatchable: the window opens BEFORE the
// beat, so a player who is playing it right has the arrow judged and dropped
// while it is still short of the playhead. Every clean hit put out its own
// marker a few pixels early, which reads as the strip dropping frames rather
// than as a run going well, and the one place the eye is is the line.
//
// `backPx` is the trail: a beat's worth by default, or on the strip itself the
// plate's own back end, so the marker's last few pixels of ink are spent
// crossing rather than sitting on the tabs.
export function beatRibbonMarkerOffset(actionBeat, currentBeat, beatPx = RIBBON_BEAT_PX,
  aheadPx = RIBBON_AHEAD_BEATS * beatPx, backPx = beatPx) {
  const dx = beatRibbonOffset(actionBeat, currentBeat, beatPx);
  if (dx == null || dx > aheadPx || dx < -backPx) return null;
  return dx;
}

// The plate's gradient, cached on the four numbers that define it. Building a
// gradient per frame is surprisingly costly at device resolution — the same
// finding that put gradCache in the style packs and cached the HUD's gold tick —
// and this one's inputs do not move: the strip's anchor and its two half-widths
// are fixed, so every frame of a run rebuilt an identical object. A mirrored run
// swaps tail and head, which is a different key and therefore a second entry
// rather than a wrong gradient.
const ribbonGradCache = new Map();
function ribbonPlateGrad(ctx, tail, head, fadeStop, fadeStopAhead) {
  const key = `${tail}|${head}|${fadeStop}|${fadeStopAhead}`;
  let g = ribbonGradCache.get(key);
  if (!g) {
    g = ctx.createLinearGradient(tail, 0, head, 0);
    // Translucent, not a black bar — see the note at the fill below.
    g.addColorStop(0, 'rgba(16,20,28,0)');
    g.addColorStop(fadeStop, RIBBON_PLATE);
    g.addColorStop(1 - fadeStopAhead, RIBBON_PLATE);
    g.addColorStop(1, 'rgba(16,20,28,0)');
    ribbonGradCache.set(key, g);
  }
  return g;
}

export function drawBeatRibbon(ctx, run) {
  if (!run.beatLock || run.paused || run.dead || run.finishing || run.introRunning
    || run.introFreeze > 0 || run.zoneCard || run.rhythmSyncPending) return;
  const beat = run.rhythmBeatNow?.();
  if (!Number.isFinite(beat)) return;
  // BeatSpawner owns the unwrap epoch used by every actionBeat it emits. Add
  // that same epoch to the heard clock so markers remain exact across the song
  // loop instead of falling back to world-space reconstruction.
  const currentBeat = beat + (run.spawner?.beatEpoch || 0);
  const beatPhase = ((currentBeat % 1) + 1) % 1;
  const y = RIBBON_Y, h = RIBBON_H, beatPx = RIBBON_BEAT_PX;
  const { anchor, backW, aheadW } = ribbonSpan(run);
  const dir = run.mirror ? -1 : 1, u = RIBBON_SCALE;
  // The band's midline and the arrows' half-height, named once: every glyph
  // hangs off these two rather than off the plate's top edge.
  // THE ARROW HAS TO FIT ITS PLATE AT FULL SWELL, NOT AT REST. The old 2.5u
  // half-height came to 5u of arrow — which the 1.25x beat swell pushed to
  // 6.25u, and the border then pushed past the plate. So at rest it looked
  // right and on every beat it grew out through the top and bottom edges.
  // Sized off the peak now: 2u swells to 2.5u, plus half a unit of border, is
  // 3u either side of the midline — which is exactly the 6u plate. See
  // RIBBON_H: the two numbers are one decision and have to move together.
  const mid = y + h / 2, ARROW_H = 2 * u, ARROW_W = 2.5 * u;
  // The ring is a diameter where the arrows are a half-height, so it needs its
  // own number to clear the same edges.
  const RING_R = 2 * u;
  // Finer than the fill it defines. At this size a heavier line stops reading
  // as an edge and starts reading as a second, darker shape.
  const GLYPH_EDGE = Math.max(1, u * 0.5);
  // Every action glyph breathes on the pulse. The swell comes off beatPhase —
  // the same unwrapped chart clock the markers TRAVEL on — and not off the
  // analyser's beatPulse like the playhead below: the analyser answers "is the
  // music loud right now", which is a hair late and drifts with the mix, and a
  // strip whose markers swell out of step with the marks they are sliding
  // toward reads as broken rather than as musical. Cubed so the beat lands as
  // an accent and decays away rather than pumping the whole bar, and applied
  // as a SIZE, not an alpha: the arrows already fade at the ends of the plate
  // (edgeFade), and two things fighting over one channel muddies both.
  const glyphSwell = 1 + RIBBON_PULSE * (1 - beatPhase) ** 3;
  // How much ink an element at `dx` from the playhead gets: full inside the
  // body of the strip, ramping to nothing across the last RIBBON_FADE px of
  // whichever end it is approaching. Every tick and marker takes it, so nothing
  // ever pops against a strip that fades.
  const fadeBack = Math.max(1, Math.min(RIBBON_FADE_BACK, backW));
  const fadeAhead = Math.max(1, Math.min(RIBBON_FADE_AHEAD, aheadW));
  const edgeFade = (dx) => Math.max(0, Math.min(1, dx >= 0
    ? (aheadW - dx) / fadeAhead
    : (backW + dx) / fadeBack));
  ctx.save();
  // Built along the strip's own axis — back end to front end — so a mirrored
  // run gets the gradient reversed for free rather than a second copy of it.
  const tail = anchor - dir * backW, head = anchor + dir * aheadW;
  const span = backW + aheadW;
  const plateBack = Math.max(1, Math.min(RIBBON_PLATE_FADE, backW));
  const plateAhead = Math.max(1, Math.min(RIBBON_PLATE_FADE, aheadW));
  const back = ribbonPlateGrad(ctx, tail, head, plateBack / span, plateAhead / span);
  // Translucent, not a black bar. At full strength a strip this long stopped
  // being chrome and became a hole in the sky — the widest, heaviest object in
  // the frame, sitting over the prettiest part of the stage. It only has to
  // hold the markers legible, and the markers are green, cyan, pink and near
  // white against it, so it can give most of the scene back and still do that.
  ctx.fillStyle = back;
  ctx.fillRect(Math.min(tail, head), y, span, h);
  // FILLED, NOT STROKED, and centred on the beat. A 2px stroke laid on `x + 0.5`
  // covers x-0.5 to x+1.5 — the half-pixel convention for ODD line widths, and
  // half a pixel of drift for this one — so every tick sat that much right of
  // the glyph standing on the same beat. At RIBBON_SCALE and a canvas scaled up
  // again for the screen that is a visible sliver of teal poking out from behind
  // an arrow. A rect centred on x cannot drift: the mark and the thing it marks
  // share one number.
  //
  // FULL HEIGHT OF THE PLATE, edge to edge. Inset two units top and bottom, the
  // beats read as a row of floating dashes — a texture inside the strip rather
  // than the strip's own ruling — and every glyph standing on one was taller
  // than the mark it stood on. A line that touches both edges is the bar the
  // plate is divided by, and the arrows sit ON it rather than beside it.
  ctx.fillStyle = 'rgba(72,224,200,0.26)';
  const tickW = Math.max(1, Math.round(RIBBON_SCALE));
  for (let i = -Math.ceil(backW / beatPx); i <= Math.ceil(aheadW / beatPx); i++) {
    const dx = i * beatPx - beatPhase * beatPx;
    const a = edgeFade(dx);
    if (a <= 0) continue;
    const x = anchor + dir * dx;
    ctx.globalAlpha = 0.92 * a;
    ctx.fillRect(x - tickW / 2, y, tickW, h);
  }
  ctx.globalAlpha = 0.92;
  const pulse = Audio.musicAnalysis?.()?.beatPulse || 0;
  // WHAT REACHED THE STRIP STAYS ON IT UNTIL IT HAS CROSSED. The lists below
  // only ever ADD: once a beat has a marker, that marker's life is the geometry
  // in beatRibbonMarkerOffset and nothing else. Read straight off the live
  // entities each frame — the way it was — a marker died with its object, which
  // on a stage the player is reading correctly means dying EARLY: judged inside
  // the on-beat window, collected a frame before the tick, burst, passed. The
  // strip emptied just short of the one column the eye is on.
  //
  // Keyed by action and beat to the millisecond, which is the same key the old
  // per-frame dedupe used: one marker per authored event, whichever of the three
  // lists below happens to see it first.
  // Tied to the spawner that authored the beats in it, because a retry builds a
  // new one and restarts the chart clock: without that check the previous
  // attempt's markers would be sitting on the strip at beats the new run has not
  // reached yet.
  let trail = run.ribbonTrail;
  if (!trail || trail.spawner !== run.spawner) {
    trail = new Map();
    trail.spawner = run.spawner;
    run.ribbonTrail = trail;
  }
  const addMarker = (action, actionBeat, prop = null) => {
    if (!Number.isFinite(actionBeat)) return;
    const key = `${action}:${Math.round(actionBeat * 1000)}`;
    if (!trail.has(key)) trail.set(key, { action, actionBeat, prop });
  };
  const entities = [...(run.obstacles || []), ...(run.pickups || [])];
  for (const e of entities) {
    if (!e.live || !e.chartAction) continue;
    addMarker(e.chartAction, e.actionBeat, e.type);
  }
  for (const e of run.spawner?.eventInstances || []) {
    if (!e.live || (e.chartAction !== 'ability' && e.chartAction !== 'coin')) continue;
    addMarker(e.chartAction, e.actionBeat);
  }
  // Crossing actions are chart-owned even though their physical landing is a
  // route stone rather than a normal obstacle entity.
  for (const e of run.rhythmSetEvents || []) addMarker(e.action, e.beat);
  for (const [key, marker] of trail) {
    const dx = beatRibbonMarkerOffset(marker.actionBeat, currentBeat, beatPx, aheadW, backW);
    // Off the back end for good, or stranded in the far future by a clock that
    // jumped (a retry, a rewind, the song looping): drop it. Anything still
    // being played is put back by the lists above on the very next frame.
    if (dx == null) {
      if (!Number.isFinite(marker.actionBeat) || marker.actionBeat - currentBeat < 0
        || marker.actionBeat - currentBeat > 16) trail.delete(key);
      continue;
    }
    const a = edgeFade(dx);
    if (a <= 0) continue;
    ctx.globalAlpha = 0.92 * a;
    const x = anchor + dir * dx;
    // SHAPE IS THE INPUT. COLOUR IS THE OBJECT.
    //
    // The arrows' law is that they say what the CONTROLS say — a hole and a bar
    // are one up-arrow because they are one button, and drawing them differently
    // would teach a distinction the pad does not have. That law is about SHAPE,
    // and it is untouched here: a barrel beat is a down-arrow like every other
    // duck beat, because it is the same button.
    //
    // What it does not settle is which THING is arriving, and on the finale
    // that stopped being cosmetic: a drone hangs still overhead and a barrel
    // comes at you along the floor, and they want opposite halves of the same
    // second even though they take the same press. So the barrel's arrow wears
    // the barrel's own wood rather than the drone's cyan — the colour the
    // player has been looking at coming down the gorilla's chute. The player
    // reads the direction off the shape as always, and now reads WHICH ONE off
    // a colour they were already taught by the object itself.
    // Off the shared table (beatground.js), not off four literals of its own:
    // the strip and the road draw the same events, and the moment each keeps
    // its own copy of the barrel's wood they are one edit from disagreeing.
    ctx.fillStyle = ACTION_INK[marker.prop === 'barrel' ? 'barrel' : marker.action] || '#ffffff';
    // EVERY GLYPH CENTRES ON THE BAND'S MIDLINE. The jump and duck arrows used
    // to sit two units high and two units low of it, so the pair were not
    // merely reflections about one line and the strip said DOWN twice. That
    // reading cost more than it bought once the arrows were drawn at scale: two
    // big triangles at different heights read as a strip that cannot keep its
    // own baseline, and the direction they point is already unmissable. Which
    // way it points is what the player reads at a glance; the colour (the
    // duck's cyan against the jump's green) is what confirms it.
    // AND EVERY ARROW IS BORDERED, on the same terms as the ones painted on the
    // road: a dark edge with rounded joins, stroked before the fill so it reads
    // as a rim the colour sits inside rather than a line eating half the shape.
    // On this dark plate the border is quiet — it is not here to raise contrast,
    // it is here so a strip arrow and a road arrow are visibly the same object
    // seen in two places. lineWidth is set on every branch because it persists
    // across calls and the ring below used to be the only thing that set it.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = GLYPH_OUTLINE;
    if (marker.action === 'jump') {
      const aw = ARROW_W * glyphSwell, ah = ARROW_H * glyphSwell;
      ctx.lineWidth = GLYPH_EDGE;
      ctx.beginPath(); ctx.moveTo(x, mid - ah); ctx.lineTo(x - aw, mid + ah); ctx.lineTo(x + aw, mid + ah); ctx.closePath(); ctx.stroke(); ctx.fill();
    } else if (marker.action === 'duck') {
      const aw = ARROW_W * glyphSwell, ah = ARROW_H * glyphSwell;
      ctx.lineWidth = GLYPH_EDGE;
      ctx.beginPath(); ctx.moveTo(x, mid + ah); ctx.lineTo(x - aw, mid - ah); ctx.lineTo(x + aw, mid - ah); ctx.closePath(); ctx.stroke(); ctx.fill();
    } else if (marker.action === 'ability') {
      // The ring is a stroke already, so its border goes UNDER it as a slightly
      // heavier line of the same circle rather than around a fill.
      ctx.beginPath(); ctx.arc(x, mid, RING_R * glyphSwell, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1, Math.round(u)) + GLYPH_EDGE; ctx.stroke();
      ctx.strokeStyle = ACTION_INK.ability; ctx.lineWidth = Math.max(1, Math.round(u)); ctx.stroke();
    } else {
      // Coins are clock ticks, not calls to act — smaller than the arrows they
      // sit between, centred on x (the old 3u box hung half a unit right of the
      // marker it was reporting), and deliberately NOT swelling: the pulse is
      // how the strip says "do something here", and a coin asks for nothing.
      //
      // A DOT, NOT A BOX. A square at this size read as a chip of the same
      // family as the arrows — a small solid with corners, one more piece of
      // signage. A white dot reads as the coin itself, and it is the one glyph
      // on the strip that is not a direction, so it should not share their
      // straight edges. Radius holds the square's visual weight (a 2u box is
      // 4u² of ink; r = 1.15u is the disc that matches it).
      ctx.beginPath(); ctx.arc(x, mid, 1.15 * u, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawRibbonPlayhead(ctx, anchor, y, h, pulse);
  ctx.restore();
}

// THE PLAYHEAD IS ONE COLUMN, DRAWN LAST. It used to be two gold tabs, one
// above the plate and one below, deliberately leaving the band itself clear so
// a marker being judged was never half hidden. On a dark stage that read as one
// line; on the LCD packs' pale yellow sky it did not read at all — gold on
// light yellow is no contrast, and the plate cutting the column in two made the
// pair look like a mark that had slipped BEHIND the strip rather than the one
// thing on it that says HERE, NOW.
//
// So: one continuous column, in front of every glyph, in a colour that is not
// competing with anything else on the strip (the markers are green, cyan, pink
// and white) and cannot vanish into any sky a stage paints — vermilion inside a
// dark casing, so it holds against pale yellow the way it holds against night.
//
// The old note's concern is still honoured, by alpha rather than by a gap: over
// the band the column drops to a wash, so the marker under the line stays
// readable through it, and only the two tabs are solid.
const PLAYHEAD_INK = '255,82,48';
// Flat pixels again, for the same reason as RIBBON_TAB: 3 units of core inside
// 2 units of casing drew a 10px slab over the hero. A 3px core in a 1px casing
// is a line — still the boldest single mark on the strip, because nothing else
// runs the full height of it.
const PLAYHEAD_W = 3, PLAYHEAD_EDGE = 1;
function drawRibbonPlayhead(ctx, anchor, y, h, pulse) {
  const w = PLAYHEAD_W, x = Math.round(anchor - w / 2);
  const top = y - RIBBON_TAB, bot = y + h + RIBBON_TAB;
  ctx.globalAlpha = 1;
  // The casing is what makes it legible on a light stage; on the plate it is
  // the plate's own colour and simply disappears.
  ctx.fillStyle = 'rgba(16,20,28,0.6)';
  ctx.fillRect(x - PLAYHEAD_EDGE, top - PLAYHEAD_EDGE,
    w + PLAYHEAD_EDGE * 2, (bot - top) + PLAYHEAD_EDGE * 2);
  ctx.fillStyle = `rgba(${PLAYHEAD_INK},${0.72 + pulse * 0.28})`;
  ctx.fillRect(x, top, w, RIBBON_TAB);
  ctx.fillRect(x, y + h, w, RIBBON_TAB);
  ctx.fillStyle = `rgba(${PLAYHEAD_INK},${0.3 + pulse * 0.2})`;
  ctx.fillRect(x, y, w, h);
}


// The touch power-up shelf's midline (see drawHud below) — exported so run.js
// can line the chrome ability-name label up against it exactly, not just land
// close by.
// THE BOTTOM ROW'S MIDLINE. The tallest panel down there is 14 (the ability
// nameplate), so its midline sits EDGE + half of that up from the bottom edge,
// and every other bottom-edge readout centres on it — which is what keeps the
// nameplate and the keyboard hints level across the screen instead of each
// hanging at its own height.
const BOTTOM_ROW_H = 14;
const BOTTOM_CY = H - EDGE_BOTTOM - BOTTOM_ROW_H / 2;
export const TOUCH_SHELF_CY = BOTTOM_CY - 4;

// ---------------------------------------------------------------- bake-off
// WHERE THE SECONDARY OBJECTIVE LIVES. The BONUS readout is the one row of the
// HUD whose home is still open, so it is a named cut rather than a coordinate:
//
//   'row'    — shipped: its own line under GOAL, top-right. Two rows up there.
//   'foldup' — 'row' for as long as it is SAYING something, then it folds to a
//              count and climbs onto GOAL's line. The second row becomes
//              teaching that leaves, like the keyboard legend, instead of
//              furniture — and nothing is lost to get there.
//   'chip'   — the SAME line as GOAL, a second chip to its left, from the first
//              frame. Count only: the sentence never appears in the corner.
//   'shelf'  — a donut on the bottom-left shelf, at the end of the power-up
//              row it already reads exactly like — a thing filling up. The one
//              cut that is not a panel, so it is placed by the shelf and not by
//              bonusPlacement below.
//
// A fifth, 'bottom' — its own chip in the bottom-right corner — was tried and
// ruled out on 4 Sep 2026: the mission and the challenge at opposite ends of
// the screen do not read as one objective, and on touch that corner already
// belongs to the ability nameplate.
//
// Anything but 'row' empties the second top-right line, which is the whole
// point of the exercise.
export const BONUS_SLOTS = ['row', 'foldup', 'chip', 'shelf'];
const BONUS_SLOT = pickCut('bonus', BONUS_SLOTS, 'row');

// WHICH END OF THE BOTTOM ROW THE ABILITY NAMEPLATE SITS AT — touch only; the
// keyboard's has always been bottom-left with the gauges.
//
// 'right' is shipped, and its reason is that on touch the nameplate is a LABEL
// FOR THE USE BUTTON: it sits beside the disc out in the right margin, and
// run.js registers the words themselves as a second hit box for the same
// action. 'left' gives that corner up — the plate becomes a readout like the
// keyboard's, stacked under the power-up shelf, which is the arrangement the
// keyboard has always had — and hands the bottom-right slot back to the play
// field. Kept as a cut because it is a standing question about the touch
// layout, not because anything currently needs the corner.
export const ABILITY_SIDES = ['right', 'left'];
export const ABILITY_SIDE = pickCut('ability', ABILITY_SIDES, 'right');

// A bake-off's live selector. The shipped answer is the constant's default; a
// dev build can ask for one of the other cuts with ?<name>=<cut> so the
// variants can be shot against each other without a rebuild between each.
function pickCut(param, options, fallback) {
  if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') return fallback;
  const q = new URLSearchParams(window.location.search).get(param);
  return options.includes(q) ? q : fallback;
}

/**
 * Where the ability nameplate is drawn this frame, which decides whether the
 * bottom-left shelf has a plate under it to clear.
 *
 * Both painters ask, because there are two of them: hud.js draws the left-hand
 * plate on the game canvas and run.js draws the right-hand one beside USE, and
 * a slot two files disagree about is a slot that gets drawn twice.
 */
export function abilityNameSlot(run) {
  if (!Input.usingTouch) return 'left';
  // In-canvas fallback: the USE disc is on the glass with its own word on it,
  // and there is no margin to hang a plate in either way.
  if (chromeGeo.mode !== 'side') return 'none';
  return ABILITY_SIDE;
}

// Touch control geometry. 44 logical px across: the screen fits its 480-wide
// backbuffer to a phone by height, so a landscape iPhone renders roughly 1.4
// CSS px per logical px and this lands near 60 CSS px — comfortably past the
// ~44 CSS px minimum a thumb needs, without three dinner plates on a 270-tall
// play field.
const TOUCH_D = 44;
// The play pair sits above the bottom edge instead of occupying it. That gives
// the action room to breathe above the phone's home-indicator territory and
// leaves the lower scenery readable behind translucent controls.
const TOUCH_PLAY_Y = H - 84;
// PAUSE hangs below the objective panels rather than beside them: GOAL sits at
// y 7 and BONUS below it ends at y 37, so this clears the pair with air to
// spare. Fixed, not measured off whichever panels happen to be showing — a
// control that moves when the mission changes is a control you have to look
// for, and OVERTIME (no BONUS line) would shift it every run.
const PAUSE_BTN_Y = 43;

// The in-canvas play controls: three discs, one style, one painter
// (drawRoundButton). JUMP and USE sit above the lower corners so they remain
// present but visually recess into the play field; PAUSE stays anchored beneath
// the objective panels.
//
// A function rather than a frozen list because Input.setButtons takes ownership
// of what it is handed, and two screens now ask for these — a run and the
// tutorial. Both are playable surfaces with the same three controls, so they
// share the geometry rather than each keeping a copy that drifts.
// The stacked play pill's box: the same left inset and the same BOTTOM edge the
// lone JUMP disc had, twice as tall, so the home-indicator clearance
// TOUCH_PLAY_Y bought is untouched and all the growth goes upward into sky.
//
// Jump's own centre does move up by half a disc, and that is the real price
// here: a thumb with muscle memory for the old corner now lands on the slide
// half. It is paid on purpose, because the only other way to fit a down arrow
// under an up arrow is to put the down arrow on top — a control that lies about
// which way it sends you. The pill is a visible change, not a silent one, and
// the tap-to-jump glass absorbs the rest.
export const PLAY_PILL = { x: 12, y: TOUCH_PLAY_Y - TOUCH_D, w: TOUCH_D, h: TOUCH_D * 2 };

export function playButtons() {
  return [
    // The pill's halves hit-test as RECTANGLES, not discs. They have to abut:
    // two circles inscribed in these boxes would leave the corners between them
    // dead, and dead pixels in the middle of this control are the one thing it
    // exists to remove.
    //
    // `guard` is the halo input.js refuses to fire its tap-to-jump fallback
    // inside. Only the down half carries one, and the asymmetry is the whole
    // fix: a tap that misses high and jumps is what the player wanted anyway,
    // while a tap that misses low and jumps is the failure the swipe
    // arbitration was already written to prevent.
    { id: 'jump', x: PLAY_PILL.x, y: PLAY_PILL.y, w: TOUCH_D, h: TOUCH_D, action: 'jump', pill: 'up' },
    { id: 'duck', x: PLAY_PILL.x, y: PLAY_PILL.y + TOUCH_D, w: TOUCH_D, h: TOUCH_D, action: 'duck', pill: 'down', guard: 14 },
    { id: 'ability', x: W - 56, y: TOUCH_PLAY_Y, w: TOUCH_D, h: TOUCH_D, action: 'ability', label: 'USE', round: true },
    { id: 'pause', x: W - 56, y: PAUSE_BTN_Y, w: TOUCH_D, h: TOUCH_D, action: 'escape', icon: 'pause', round: true },
  ];
}

// How long the keyboard legend stays up at the start of a teaching stage, and
// how much of that is the fade out. Five seconds is about two obstacles' worth
// of running: long enough to have looked once, short enough that it is gone
// before the stage gets interesting.
export const HINT_TIME = 5;
const HINT_FADE = 1;

// How long the BONUS panel holds its full sentence before folding down to just
// the live count, and how long the fold itself takes.
//
// It folds rather than leaves, which is the difference between it and the
// legend above. The legend is a teaching aid and teaching aids are done when
// you have read them; the BONUS panel is a running counter that turns green at
// the moment it completes, and hiding it would take the count and that moment
// along with the sentence. The sentence is the read-once half — ten seconds is
// long enough to have looked — so the sentence is the only half that goes.
//
// BONUS_HOLD re-opens it when the state changes under the player: completing or
// missing a challenge is news, and news arrives in words before it settles back
// to a number.
export const BONUS_TIME = 10;
export const BONUS_HOLD = 3;
// Beat stages may cover the ribbon at the opening long enough to name the
// challenge once. After this clock expires they stay folded: later challenge
// updates already announce themselves through goal toasts and must not hide
// incoming rhythm prompts again.
export const RHYTHM_BONUS_TIME = 3;
const BONUS_FOLD = 0.55;

// GOAL-panel display labels. The counted missions (targets/cords/chase/rescue/
// combo) fall through to the raw type name because the count printed beside it
// carries the meaning. The four survive-to-the-end types have no count, so a
// bare "REACH"/"FUSE"/"BLACKOUT"/"ESCAPE" reads as an incomplete instruction —
// spell out what "done" is instead.
const GOAL_LABELS = {
  // Not CHASE, and no longer HIT: the mission is a BONK, the hero's own head
  // into the underside of the tub, and this panel is where that is taught. A
  // barrel put through him counts as one too, but the bonk is the thing the
  // player is being asked to do and the word the stage descriptions use.
  chase: 'BONK',
  reach: 'REACH END',
  fuse: 'CARRY FUSE',
  blackout: 'SURVIVE',
  escape: 'ESCAPE',
};
// The goal toast's own edge: gold, because it is the only panel that appears
// to announce something rather than to report state.
const PANEL_GOLD = { border: 'rgba(246,201,69,0.3)', shadow: true };

// Every string this module draws now sits on a panel, so none of them carry a
// plate: the panel is the backing, and a plate inside it prints a second,
// darker box around the words. (The floaties in run.js ride the same panel
// chrome now; UI_PLATE survives only for text stamped into the scene itself —
// boss signage and the finish-line callouts.)
//
// Glyphs occupy y-1*scale .. y+11*scale but the ink sits well inside that box,
// so centring on a panel means offsetting from the midline by the ink's own
// half-height rather than by half the box. Every panel in this file places its
// text through it, and so does every menu — see textYForMid in sprites.js.
const textY = textYForMid;

// Blend two '#rrggbb' literals. Only the progress bar needs this — it is the
// one piece of HUD chrome that changes colour continuously rather than
// switching between authored states.
function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// Ease in and out of both ends. Chrome that starts and stops at full speed reads
// as a jump cut even when the travel between is the right length.
const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function bonusPanelFold(run) {
  const bonusClock = run?.beatLock ? run.rhythmBonusT : run?.bonusT;
  return 1 - smoothstep(Math.min(1, Math.max(0, bonusClock ?? 0) / BONUS_FOLD));
}

/**
 * ONE OBJECTIVE PANEL — the painter behind every GOAL and BONUS plate.
 *
 * Module-level and exported rather than a closure inside drawHud because the
 * gallery's fold-up bake-off puts these panels on a tile: a section that draws
 * "the same" plate with its own code is a section that can show Peter a layout
 * the run does not have. Returns the LEFT edge it landed on, which is how a
 * second chip on the same row knows where the first one ended.
 */
export function drawObjectivePanel(ctx, tag, tagColor, text, ink, y, scale, fold = 0, OBJ_R = OBJ_RIGHT) {
  const TP = 5, GAP = 5;
  // The full-scale row is the pill's twin at the other end of the strip, so it
  // takes the pill's height: two equal bookends with the beat lane between
  // them, rather than a tall panel on the left and a short one on the right
  // that merely agree about their midline. The reduced BONUS row underneath
  // keeps its own smaller height — it is the hierarchy, not the bookend.
  const h = scale < 1 ? 12 : PILL_H;
  const cy = y + h / 2;
  const tw = textWidth(tag, 0.8, 'bold');
  const lead = TP * 2 + tw + GAP;      // panel's left edge -> first glyph
  const [head, tail, widest = tail] = Array.isArray(text) ? text : [text, ''];
  const full = head + tail;
  // The head is measured as the difference between the joined string and the
  // tail, not as textWidth(head): textWidth drops the trailing tracking on
  // whatever it is handed, so measuring the head alone lands it a pixel off
  // from where the same words sit when the two are drawn as one string.
  const headW = textWidth(full, scale) - textWidth(tail, scale);
  const slotW = Math.max(textWidth(tail, scale), textWidth(widest, scale));
  const wFull = lead + headW + slotW;
  const wTail = lead + slotW;
  const w = Math.round(wFull + (wTail - wFull) * fold);
  const x = OBJ_R - w;
  drawPanel(ctx, x, y, w, h, 4, undefined, PANEL);
  rawDrawText(ctx, tag, x + TP, textY(cy, 0.8), tagColor, 0.8, 'bold');
  const tailX = OBJ_R - TP - textWidth(tail, scale);
  if (head && fold < 1) {
    const headX = OBJ_R - TP - slotW - headW;
    if (fold > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + lead - GAP, y, OBJ_R - (x + lead - GAP), h);
      ctx.clip();
      // The wipe does the work; alpha only joins for the back half, so the
      // last few glyphs thin out instead of being sheared off mid-stroke.
      ctx.globalAlpha = Math.min(1, 2 * (1 - fold));
    }
    rawDrawText(ctx, head, headX, textY(cy, scale), ink, scale);
    if (fold > 0) ctx.restore();
  }
  if (tail) rawDrawText(ctx, tail, tailX, textY(cy, scale), ink, scale);
  // THE RIGHT SHOULDER, remembered by the thing that owns it. A speech card
  // talking up on this row has to clear whichever objective panel reaches
  // furthest in, and both of them are as wide as their own words — so the edge
  // is measured here, where it is already known, rather than guessed at by the
  // card. Reset each frame by drawHud; see speechChannel.
  objLeft = Math.min(objLeft, x);
  return x;
}

// The leftmost edge any objective panel reached this frame, and the frame's own
// reset. OBJ_RIGHT is "nothing drawn yet", which leaves the channel open.
let objLeft = OBJ_RIGHT;

/**
 * WHERE A SPEECH CARD MAY TALK FROM, and how wide it may be to talk there.
 *
 * The card is centred on the panel and grows symmetrically off its longest
 * line, so what limits it is whichever SHOULDER of the HUD reaches nearer the
 * middle — the status pill and hero icon on the left, the GOAL and BONUS panels
 * on the right. Neither is a fixed width: the pill grows with the coin count
 * and the panels grow with the mission's words, so both are measured.
 *
 * Symmetric growth is why this returns ONE width rather than two edges: the
 * card cannot be shoved sideways to use a wider half, so the tighter shoulder
 * sets it. The 40 is the card's own furniture at scale 1 — portrait, gap and
 * two pads — which is what stands between the wrap width asked for here and the
 * plate that ends up on screen.
 *
 * Given to drawSpeech as plain `y`/`maxWidth` opts, the two it already takes.
 */
export function speechChannel(run) {
  const left = PILL_X + statusCornerW(run);
  const half = Math.min(W / 2 - left, objLeft - W / 2);
  return { y: SPEECH_Y, maxWidth: Math.max(0, Math.round(half * 2) - 40) };
}

/**
 * WHERE THE BONUS PANEL SITS AT A GIVEN POINT IN ITS FOLD — the whole of what
 * BONUS_SLOT decides, in one place both the run and the gallery ask.
 *
 * `goalLeft` is the mission panel's left edge (drawObjectivePanel's return), so
 * the cuts that dock beside it track the mission's own width. Returns the three
 * numbers a panel needs: its top, how folded its text is, and the edge it hangs
 * off. A null return means this cut does not draw a panel at all — the donut
 * cut, which the shelf paints instead.
 */
export function bonusPlacement(fold, goalLeft, slot = BONUS_SLOT) {
  if (slot === 'row') return { y: OBJ_ROW2_Y, fold, right: OBJ_RIGHT };
  // OBJ_ROW_Y + 1, not OBJ_ROW_Y: the chip is 12 tall against the mission's
  // PILL_H, so the two share a MIDLINE rather than a top edge. Top-aligned, the
  // smaller chip rides a pixel high and the row reads as slightly broken.
  const chipY = OBJ_ROW_Y + (PILL_H - 12) / 2;
  if (slot === 'chip') return { y: chipY, fold: 1, right: goalLeft - CHIP_GAP };
  if (slot === 'foldup') {
    // TWO BEATS OFF ONE CLOCK. While the panel is saying the challenge in words
    // it IS the shipped second row; then it wipes shut travelling left along
    // that row, and only once it is a chip does it rise into the slot beside
    // GOAL. The player sees a line leaving, not two panels swapping places.
    //
    // The beats are sequential and not simultaneous because the destination is
    // BEHIND the mission panel: a chip that rises while it is still sliding
    // arrives on GOAL's line early and crosses straight through it. Closing on
    // row 2 keeps every frame of the move in empty sky.
    //
    // BONUS_HOLD plays it backwards for free: when the state changes under the
    // player the chip drops back down and says it in words again.
    const slide = Math.min(1, fold / FOLDUP_SLIDE);
    const rise = Math.max(0, (fold - FOLDUP_SLIDE) / (1 - FOLDUP_SLIDE));
    return {
      y: OBJ_ROW2_Y + (chipY - OBJ_ROW2_Y) * rise,
      fold: slide,
      right: OBJ_RIGHT + (goalLeft - CHIP_GAP - OBJ_RIGHT) * slide,
    };
  }
  return null;
}

// The status pill: cells on the left, coins on the right, one panel.
//
// Coins are the only value here that changes length as it climbs (0 -> 10 ->
// 100), so they sit on the right edge and the pill grows rightward. Put them
// left and every gain would shove the cells sideways — the one readout you
// check by shape, in motion, at a glance, would never be in the same place
// twice.

// Where the left column of readouts under the status pill starts — the one-hit
// warning, the goal toasts, the finish plate, in that stacking order. It is a
// function and not a constant because the beat ribbon now rides in that band:
// with the playhead over the hero the strip reaches from x 30 to x 186, which
// is exactly where those panels were printing. Keyed on beatLock rather than on
// whether the ribbon is currently drawn, so the column has ONE height for the
// whole stage instead of hopping 15px every time a zone card or a pause hides
// the strip out from under it.
// THE COLUMN DOES NOT RESERVE A ROW FOR THE HAND-OFF NAME. It used to: the
// 'under' plate prints in this column's first row, so the column started below
// it for the whole stage rather than hopping down and back twice a hand-off.
// That bought a plate that is up for two seconds a hand-off a permanent 16px of
// sky, and it showed — the goal toast and the ONE HIT warning hung well clear of
// the corner they belong to, reading as free-floating panels rather than as
// things under the pill.
//
// So the priority is inverted instead: the column sits directly under the corner
// and the NAME yields to it (see drawHeroReveal). Same rule as the beat ribbon
// above — one height per stage, never a moving one — just measured off the
// permanent furniture rather than off the temporary plate.
function leftColumnTop(run) {
  const base = run?.beatLock ? BEAT_RIBBON_BOTTOM + 3 : PILL_Y + PILL_H + 3;
  return Math.max(base, heroIconBottom() + 3);
}

// Whether the column's first row is spoken for this frame — the one thing the
// 'under' name plate has to check before it prints, now that the column no
// longer stands off to make room for it. The ONE HIT warning is a standing
// readout for the whole run, so on those runs the name simply never shows; the
// toast and the finish plate are passing, so it shows on the hand-offs that do
// not collide with one.
function leftColumnBusy(run) {
  return !!(run?.oneHit
    || (run?.goalToasts && run.goalToasts[0])
    || (run?.flipCoins && run.flipCoins.left > 0));
}

// The bottom of the hero's icon — the lowest thing the corner always has.
function heroIconBottom(style = HERO_CHIP) {
  return style === 'disc' || style === 'disclift' || style === 'medallion'
    ? PILL_CY + DISC_R : PILL_Y + PILL_H;
}

// The hand-off name plate's row: directly under the icon, except on a beat
// stage, where the ribbon owns that band and the name waits below it. Read by
// the plate AND by the column beneath it, so the two cannot disagree — and
// stated in this order (name from the icon, column from the name) rather than
// the reverse, which would be circular.
function heroNameTop(run, style = HERO_CHIP) {
  return Math.max(heroIconBottom(style) + 2, run?.beatLock ? BEAT_RIBBON_BOTTOM + 3 : 0);
}
// The meter is drawn at the coin's height so the two readouts in the pill sit
// on one line rather than reading as a big thing beside a small one.
const COIN_D = 12, METER_H = COIN_D, PILL_PAD = 6, PILL_SPLIT = 3;
// The meter is the one thing in the pill with a rounded outline of its own, so
// it does not take the pill's PILL_PAD: it takes the SAME gap on the left that
// centring already gives it above and below, and its shell corner is the pill's
// corner less that gap. Those two together are what makes the two curves
// concentric — at PILL_PAD the left gap was twice the top gap and the shell's
// corner sat inside the panel's looking like a near-miss rather than a nest.
const METER_INSET = (PILL_H - METER_H) / 2;
const METER_R = PILL_R - METER_INSET;

// Exported because the tutorial shows a coin count too, and a second hand-built
// coin readout would be a second thing to keep in sync with this one. A caller
// with no cells to show (oneHit false, maxBattery() 0) gets exactly the coin
// half of the pill.
// The pill's own width, as a function rather than a local, because the finish
// plate below it is sized to match: two stacked panels of different widths read
// as two unrelated readouts that happen to be near each other, and the whole
// point of that plate is that it belongs to this one.
function statusPillW(run, style = HERO_CHIP) {
  const cells = run.oneHit ? 0 : run.maxBattery();
  const cellsW = hudBatteryW(cells, METER_H);
  // A floor of two digits: a lone '0' left the coin sitting in a pocket of
  // dead panel, and the pill twitched wider the moment it hit 10.
  const countW = Math.max(coinCountW(formatCoins(run.coins)), coinCountW('00'));
  const splitW = cells ? PILL_SPLIT * 2 + 0.5 : 0;
  // A chip that lives INSIDE the pill replaces the meter's inset with its own
  // lead — it already ends in the gap the cells would have been inset by.
  const lead = heroChipGeom(style, run).lead || meterInset(cells);
  return lead + cellsW + splitW + COIN_D + 3 + countW + PILL_PAD;
}

// THE WHOLE CORNER'S WIDTH — the hero icon's column plus the pill beside it,
// PILL_X to the pill's right edge. The panels stacked under it are sized off
// this rather than off the pill alone: with the icon standing clear, the pill no
// longer starts at the column's left edge, and a plate matched to the pill would
// hang off to one side of the block it belongs to.
function statusCornerW(run) {
  return heroChipGeom(HERO_BY_ID[run.relay?.current] ? HERO_CHIP : null, run).x + statusPillW(run);
}

// The pill's left inset. Only the meter earns the tighter one; a pill showing
// the coin alone (one-hit runs, the tutorial) keeps PILL_PAD on both ends.
function meterInset(cells) { return cells ? METER_INSET : PILL_PAD; }

// The width the count RESERVES, as opposed to the width it inks. Fredoka's
// digits are proportional — a 1 is a good deal narrower than an 8 — so sizing
// the pill off the actual string had it breathing in and out by a pixel or two
// as the last digit ticked over, once there were three of them. Every digit
// is charged at the widest digit's advance, so the slot only changes size when
// the count gains a digit (or a comma), which is the one growth the pill is
// meant to show.
function coinCountW(count) {
  let w = 0;
  for (const ch of count) w += /\d/.test(ch) ? widestDigitW() : textWidth(ch, 1, 'bold');
  return w;
}
// Not memoised here: the webfont lands after first paint and sprites.js clears
// its own advance cache when it does, so a width held on this side would be the
// fallback face's for the life of the page. textWidth is a map lookup per glyph.
function widestDigitW() {
  return textWidth(widestDigit('bold'), 1, 'bold');
}
// The fattest digit itself, for anything that reserves a slot by building the
// widest STRING a counter can print and measuring that at its own scale — the
// objective panels' `88/30`. Same non-memoisation, for the same reason.
function widestDigit(style = 'ui') {
  let best = '0', bw = -1;
  for (let d = 0; d <= 9; d++) {
    const w = textWidth(String(d), 1, style);
    if (w > bw) { bw = w; best = String(d); }
  }
  return best;
}

// ---------------------------------------------------------------- hero chip
// WHO YOU ARE, IN THE CORNER INSTEAD OF THE SKY. The relay's current hero named
// itself on a badge centred at the top of the frame — a whole second panel,
// parked in the middle of the play field, carrying one word the left-hand
// readout could have carried in a fraction of the space. These are the cuts for
// folding the face into the status pill instead.
//
// HERO_CHIP is the live pick and null keeps the centre badge, so the question is
// decided by changing one line. Every cut goes through drawHeroChip and declares
// its geometry in ONE place (heroChipGeom), because the pill's width, the finish
// plate that matches that width, and the chip's own paint all have to agree — a
// cut that measured itself twice would be a cut that fits in one of them.
export const HERO_CHIP_CUTS = ['chip', 'porthole', 'medallion', 'disc', 'disclift', 'card',
  'relay', 'named'];
// PICKED 4 Sep 2026: the hero is a circle standing clear of the pill, and his
// name slides in under it on the hand-off. The losing cuts stay until the
// gallery section comes out with them.
const HERO_CHIP = 'disc';

// THE NAME IS A SEPARATE QUESTION FROM THE FACE. Every chip above can carry the
// hand-off name gesture or not, so it is a second dial rather than a cut of its
// own — otherwise every shape would need a with-name twin. null is no gesture.
export const HERO_REVEAL_CUTS = ['under', 'slide', 'drawer'];
const HERO_REVEAL = 'under';

// The face box inside the pill: the meter's height, so the chip, the cells and
// the coin are three things on one line rather than three sizes in a row.
const CHIP_D = METER_H;
// How far the face oversizes a square window before the clip takes the edges
// off. 1 is drawToonFace's own fit, which centres a whole head with padding and
// reads as a sticker; this crops in to the head the way the badge's wide box did.
const CHIP_CROP = 1.3;
// The chip closes with the same hairline-and-two-gaps the cells close with.
const CHIP_DIV = PILL_SPLIT * 2 + 0.5;
// The gap between a clear disc and the pill. The lifted cut takes more of it,
// because separation is half of what makes it read as its own object.
const DISC_GAP = 2, DISC_LIFT_GAP = 7;
// The name reveal's shape, in seconds: in, hold, out. "A beat or two" at the
// game's tempos is about this hold.
const REVEAL_IN = 0.22, REVEAL_HOLD = 1.7, REVEAL_OUT = 0.3;
const REVEAL_END = REVEAL_IN + REVEAL_HOLD + REVEAL_OUT;
// The name plate's height. One row, matched to the panels it shares the corner
// with rather than to the pill above it — it is a caption on the icon, not a
// second status readout.
const REVEAL_H = 14;

// THE HAND-OFF COIN FLIP. The disc turns about its vertical axis and lands on
// the incoming hero: the outgoing face is the coin's front, the new one its
// back, so the LAST HALF-TURN IS THE REVEAL rather than a cut hidden inside the
// spin. Half-turns must be ODD for that — an even count lands back on the face
// it started from — and the count being odd is also why nothing has to be
// mirrored at rest: the back face is drawn from |cos| rather than cos.
// Two and a half spins, and the length is set by the SLOWEST readable half-turn
// rather than by feel: at 0.62s the ease put the first half-turn inside four
// frames, which strobes instead of turning. At 0.85 the opening half-turn takes
// about seven frames and the landing one seventeen.
const FLIP_HALF_TURNS = 5;
const FLIP_T = 0.85;
// The ease. 2.2 bunched most of the spin into the first tenth of a second;
// 1.5 keeps the early turns readable and still lands soft.
const FLIP_EASE = 1.5;
// The name waits for the coin. Announcing a hero while his face is still a blur
// is two reveals of the same fact fighting each other, so the plate starts as
// the coin lands and the corner tells it once.
const REVEAL_DELAY = FLIP_T;
// THE HERO IS PLEASED TO BE HERE. He lands out of the flip smiling and settles
// back to his own resting face a beat later — the only expression change the
// corner ever makes, so it reads as a greeting rather than as a face that
// animates. Held, then faded rather than cut: at 22px a mouth swapping between
// two shapes on one frame pops, and the fade is two draws of an already-cached
// crop, so it costs nothing.
const SMILE_HOLD = 1.2, SMILE_FADE = 0.35;
// A cut is either INSIDE the pill (`lead`: the width it takes at the pill's left
// end, divider included, replacing the meter's inset) or BESIDE it (`x`: how far
// the pill's own left edge steps right to make room). Never both.
function heroChipGeom(style, run) {
  switch (style) {
    case 'chip':     return { x: 0, lead: METER_INSET + CHIP_D + CHIP_DIV };
    case 'relay':    return { x: 0, lead: METER_INSET + CHIP_D + 10 + CHIP_DIV };
    case 'porthole': return { x: 0, lead: 16 + CHIP_DIV };
    case 'named':    return {
      x: 0,
      lead: METER_INSET + CHIP_D + 4
        + textWidth(HERO_BY_ID[run.relay?.current]?.short || '', 0.75, 'bold') + CHIP_DIV,
    };
    case 'medallion': return { x: 18, lead: 0 };
    case 'card':      return { x: 22, lead: 0 };
    // Clear of the pill: nothing is drawn over anything, so the hero reads as a
    // separate object beside the readout rather than a bite out of its corner.
    case 'disc':      return { x: DISC_R * 2 + DISC_GAP, lead: 0 };
    case 'disclift':  return { x: DISC_R * 2 + DISC_LIFT_GAP, lead: 0 };
    default:          return { x: 0, lead: 0 };
  }
}

// The face, smoothed. toonFaceSprite caches on the exact box, so the box is
// whole pixels — a chip measured to a half would mint a new raster per frame.
// `over` is how much bigger than its window the face is drawn. drawToonFace
// fits a whole head inside the box it is given, padding included — which in a
// square 12px well leaves the head a sticker in the middle of a hole. The chip
// wants a CROP, not a portrait: oversize the face and let the window's clip take
// the edges off, the way the badge's 12x9 box already did by being wide.
// EVERY CALLER MUST BE INSIDE A CLIP — the face is a cached raster, so the
// overhang really does spill without one.
// The baked size for a face drawn `over` times bigger than its window: the
// overhang rounded to an EVEN number of pixels, so half of it is a whole one.
export const faceCropBox = (w, over) => w + 2 * Math.round(w * (over - 1) / 2);
function drawChipFace(ctx, id, x, y, w, h, over = 1, joy = false) {
  // THE OVERSIZE IS ROUNDED TO AN EVEN NUMBER OF PIXELS, and the sprite is
  // blitted at exactly the size it was baked.
  //
  // It used to be neither. `over` 1.15 on the 22px hero disc asked for a
  // 25.3px face, baked the raster at 25 and then drew those 25 pixels into a
  // 25.3px box at x - 1.65 — a bilinear resample of the whole portrait, off
  // grid on both axes, every frame. That is what made the face plates read
  // soft and dim: the eye whites averaged into their pupils, the brows and the
  // mouth went to grey, and no amount of ink or light was going to survive it.
  // An even overhang keeps (fw - w) / 2 whole, so a face centred on a whole
  // pixel lands on one.
  const fw = faceCropBox(w, over), fh = faceCropBox(h, over);
  const face = toonFaceSprite(id, fw, fh,
    joy ? { key: 'joy', pose: { faceJoy: true } } : null);
  if (!face) return;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(face, x - (fw - w) / 2, y - (fh - h) / 2, fw, fh);
  ctx.imageSmoothingEnabled = prev;
}

// A recessed well behind a face: the chip is a WINDOW cut into the panel, not a
// sticker laid on it, and against a bright sky the panel alone is not dark
// enough to hold a pale muzzle.
function chipWell(ctx, path) {
  ctx.save();
  path();
  ctx.fillStyle = UI_PLATE;
  ctx.fill();
  ctx.clip();
}

// How much of the landing smile is showing, 0 at rest. Starts when the coin
// lands, so the two never run at once — a face turning edge-on cannot be seen
// to smile, and spending the expression during the spin would waste it.
function heroSmile(run) {
  const t = run.relay?.tagT - FLIP_T;
  if (!Number.isFinite(t) || t < 0 || t >= SMILE_HOLD) return 0;
  return Math.max(0, Math.min(1, (SMILE_HOLD - t) / SMILE_FADE));
}

// Where the coin is in its turn, or null when it is at rest. `sx` is the disc's
// horizontal squash (1 face-on, 0 edge-on) and `face` says which of the two
// heroes is pointing at the player.
function heroFlip(run) {
  const age = run.relay?.tagT;
  if (!Number.isFinite(age) || age < 0 || age >= FLIP_T) return null;
  // Eases out: a coin spun by hand slows into its landing rather than stopping.
  const k = 1 - Math.pow(1 - age / FLIP_T, FLIP_EASE);
  const c = Math.cos(k * FLIP_HALF_TURNS * Math.PI);
  return { sx: Math.abs(c), face: c >= 0 ? 'prev' : 'current' };
}

// One portrait disc, drawn once and reused by every circular cut. `rim` is the
// hairline: the panel's own by default, brighter for the LIFTED cut, where the
// point is that the hero is NOT a third compartment of the readout.
//
// NO GAUGE ON THIS RIM. The special's charge is read beside the hero, in
// peripheral vision, while you are watching a hazard — a copy of it up here
// would be a second place to look for a number you already have, and would only
// earn its keep if it REPLACED the orb, which it should not.
function drawHeroDisc(ctx, id, cx, cy, R, rim = UI_PANEL_BORDER, sx = 1, smile = 0) {
  // A floor rather than zero: at exactly edge-on there is no ellipse to fill or
  // clip to, and a degenerate path takes the face with it.
  const w = Math.max(0.35, R * sx);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w, R, 0, 0, Math.PI * 2);
  ctx.fillStyle = HERO_DISC_PLATE;
  ctx.fill();
  ctx.clip();
  // The face is squashed by the SAME factor the disc is, about the same centre,
  // so the portrait turns with the coin instead of sitting still inside a
  // narrowing window.
  ctx.translate(cx, cy);
  ctx.scale(Math.max(0.001, sx), 1);
  ctx.translate(-cx, -cy);
  // A 22px window is nearly twice the chip's, so it needs proportionally less
  // crop to hold a head — at CHIP_CROP the disc comes out all muzzle.
  drawChipFace(ctx, id, cx - R, cy - R, R * 2, R * 2, 1.15);
  if (smile > 0) {
    // Over the resting face rather than instead of it, so the fade is a
    // dissolve between the two crops and not a mouth appearing out of nothing.
    ctx.globalAlpha = smile;
    drawChipFace(ctx, id, cx - R, cy - R, R * 2, R * 2, 1.15, true);
  }
  ctx.restore();
  // The rim is stroked OUTSIDE that transform: scaled with it, the top and
  // bottom of the hairline would stay 1px while its sides thinned to nothing,
  // and the coin would lose its outline exactly when it is hardest to read.
  ctx.strokeStyle = rim;
  ctx.lineWidth = HERO_DISC_RIM_W;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.35, w - 0.5), R - 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Edge-on, the coin is a sliver of panel with no face in it, which reads as a
  // glitch rather than as a turn. A light catch down the edge is what says the
  // thing is thin, not gone.
  if (sx < 0.16) {
    ctx.save();
    ctx.globalAlpha = (1 - sx / 0.16) * 0.5;
    ctx.fillStyle = '#d0f0e8';
    ctx.fillRect(cx - 0.5, cy - R + 1.5, 1, R * 2 - 3);
    ctx.restore();
  }
}

// Draws the chip and returns nothing: the pill has already been sized off
// heroChipGeom, so nothing here may move anything. `px` is the pill's left edge
// and `pillW` its width — the beside-the-pill cuts overlap that silhouette on
// purpose, so they need both.
function drawHeroChip(ctx, run, style, px, pillW) {
  const id = run.relay?.current;
  if (!id || !HERO_BY_ID[id]) return;
  const divider = (dx) => {
    ctx.fillStyle = UI_PANEL_BORDER;
    ctx.fillRect(dx, PILL_Y + 3.5, 0.5, PILL_H - 7);
  };

  if (style === 'disc' || style === 'disclift') {
    // The hero as his own object, clear of the readout. Nothing overlaps and
    // nothing is clipped by anything else, so the corner reads as a portrait
    // BESIDE a gauge rather than a longer gauge with a face in one end.
    const flip = heroFlip(run);
    const shown = flip && flip.face === 'prev' && HERO_BY_ID[run.relay.prev]
      ? run.relay.prev : id;
    drawHeroDisc(ctx, shown, PILL_X + DISC_R, PILL_CY, DISC_R,
      style === 'disclift' ? 'rgba(255,255,255,0.30)' : UI_PANEL_BORDER,
      flip ? flip.sx : 1, heroSmile(run));
    return;
  }

  if (style === 'chip' || style === 'named' || style === 'relay') {
    // Inside the pill, nested in the meter's corner: same inset, same radius
    // rule, so the chip's curve and the battery shell's curve are siblings.
    const bx = px + METER_INSET, by = PILL_CY - CHIP_D / 2;
    chipWell(ctx, () => platePath(ctx, bx, by, CHIP_D, CHIP_D, METER_R));
    drawChipFace(ctx, id, bx, by, CHIP_D, CHIP_D, CHIP_CROP);
    ctx.restore();
    let end = bx + CHIP_D;
    if (style === 'named') {
      // The name survives, at a third of the badge's footprint and on the side
      // of the screen you already look at. It is the pill's only variable-width
      // element, so the pill breathes a pixel or two as the baton changes hands.
      const label = HERO_BY_ID[id].short;
      rawDrawText(ctx, label, end + 4, textY(PILL_CY, 0.75), '#d0f0e8', 0.75, 'bold');
      end += 4 + textWidth(label, 0.75, 'bold');
    }
    if (style === 'relay') {
      // WHO IS COMING. The portal already previews relay.next; this says it
      // between portals, dimmed, so the upcoming face is never a surprise.
      const R = 8, ry = PILL_CY - R / 2;
      ctx.save();
      ctx.globalAlpha = 0.55;
      chipWell(ctx, () => platePath(ctx, end + 2, ry, R, R, 2));
      drawChipFace(ctx, run.relay.next || id, end + 2, ry, R, R, CHIP_CROP);
      ctx.restore();
      ctx.restore();
      end += 2 + R;
    }
    divider(end + PILL_SPLIT);
    return;
  }

  if (style === 'porthole') {
    // No inset at all: the face fills the pill's left cap edge to edge and the
    // panel's own corner is the crop. The most graphic cut — the hero is part
    // of the chrome rather than a passenger in it.
    const w = 16;
    ctx.save();
    platePath(ctx, px, PILL_Y, pillW, PILL_H, PILL_R);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(px, PILL_Y, w, PILL_H);
    ctx.clip();
    ctx.fillStyle = UI_PLATE;
    ctx.fillRect(px, PILL_Y, w, PILL_H);
    drawChipFace(ctx, id, px, PILL_Y, w, PILL_H, 1.12);
    ctx.restore();
    divider(px + w + PILL_SPLIT);
    return;
  }

  if (style === 'medallion') {
    // The same disc, but OVERLAPPING the pill's left cap: it breaks the top and
    // bottom lines, so the corner reads as one object with a face on the end.
    // The contrast case for DISC — touching versus clear is the whole question.
    const flip = heroFlip(run);
    const shown = flip && flip.face === 'prev' && HERO_BY_ID[run.relay.prev]
      ? run.relay.prev : id;
    drawHeroDisc(ctx, shown, PILL_X + DISC_R, PILL_CY, DISC_R, UI_PANEL_BORDER,
      flip ? flip.sx : 1, heroSmile(run));
    return;
  }

  if (style === 'card') {
    // Two panels, one row: a portrait plate and a readout beside it. The most
    // conservative cut — nothing overlaps, nothing is clipped by anything.
    const w = 18, inset = 1.5;
    drawPanel(ctx, PILL_X, PILL_Y, w, PILL_H, PILL_R, undefined, PANEL);
    chipWell(ctx, () => platePath(ctx, PILL_X + inset, PILL_Y + inset,
      w - inset * 2, PILL_H - inset * 2, PILL_R - inset));
    drawChipFace(ctx, id, PILL_X + inset, PILL_Y + inset, w - inset * 2, PILL_H - inset * 2, CHIP_CROP);
    ctx.restore();
    return;
  }

}

// THE CENTRE BADGE — the thing the chip above is here to replace. A rounded
// badge: face on the left, name inside beside it. Same panel and light text as
// the speech bubble below it, so the two read as one family. Sized to the name
// and centred on screen, so it grows symmetrically instead of drifting as hero
// names change width. Face and text are both placed off `cy`, unrounded, so
// they share one midline with the status pill across the row.
//
// Exported so the bake-off can stand it next to the cuts; if a chip wins, this
// goes with the gallery section.
export function drawHeroBadge(ctx, run, cy = PILL_CY) {
  const BADGE_H = 14;
  const BADGE_R = 3; // matches the corner radius drawText uses for its plates
  const FACE_W = 12, FACE_H = 9;
  const PAD_L = 4, GAP = 4, PAD_R = 7;
  const name = HERO_BY_ID[run.relay.current].short;
  const badgeW = PAD_L + FACE_W + GAP + textWidth(name) + PAD_R;
  const badgeX = Math.round(W / 2 - badgeW / 2);
  drawPanel(ctx, badgeX, cy - BADGE_H / 2, badgeW, BADGE_H, BADGE_R, undefined, PANEL);
  const face = toonFaceSprite(run.relay.current, FACE_W, FACE_H);
  if (face) {
    ctx.imageSmoothingEnabled = true;
    // Whole pixels: FACE_H is odd and cy is a midline, so the unrounded y put
    // the badge portrait on a half pixel and resampled it. See drawChipFace.
    ctx.drawImage(face, badgeX + PAD_L, Math.round(cy - FACE_H / 2), FACE_W, FACE_H);
    ctx.imageSmoothingEnabled = false;
  }
  // Raw text: the badge is already the backing, so it must not carry a plate
  // of its own.
  rawDrawText(ctx, name, badgeX + PAD_L + FACE_W + GAP, textY(cy), '#d0f0e8');
}

// THE NAME, WITHOUT MOVING ANYTHING. Peter's worry about a pill that grows to
// spell the hero out and shrinks again is the right one: the cells and the coin
// are the two things you steer by, and a readout that slides them sideways twice
// per hand-off is a readout you have to re-find mid-hazard.
//
// So nothing about the pill changes. The name rides on a SECOND plate that slides
// out from BEHIND the pill's right edge, holds, and retracts — drawn before the
// pill, so the pill's own panel is the door it comes out of. The pill's contents
// never move by a pixel; only empty sky is used.
//
// `run.relay.tagT` is seconds since this hero took the baton. Wiring it is one
// line in Relay.switchHero() if this cut wins; absent, nothing is drawn.
function drawHeroReveal(ctx, run, style, px, pillW, mode) {
  const age = run.relay?.tagT - REVEAL_DELAY;
  if (!Number.isFinite(age) || age < 0 || age >= REVEAL_END) return;
  // In, hold, out — as one 0..1 extension, so the plate has one position and its
  // alpha is read off the same number rather than kept in step with it.
  const k = age < REVEAL_IN ? age / REVEAL_IN
    : age < REVEAL_IN + REVEAL_HOLD ? 1
      : 1 - (age - REVEAL_IN - REVEAL_HOLD) / REVEAL_OUT;
  const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1;   // ease out, so it lands rather than stops
  const name = HERO_BY_ID[run.relay.current].short;
  const PAD = 7, H = REVEAL_H;
  const w = PAD * 2 + textWidth(name, 1, 'bold');

  if (mode === 'under') {
    // UNDER THE ICON. The name and the face it belongs to are then one object in
    // one corner, which is the tidiest reading of the three — and it is the only
    // one that cannot reach the middle of the screen however long a name gets.
    // It is the borrower on this row, not the owner: the column below — goal
    // toasts, the ONE HIT warning, the finish plate — is permanent furniture and
    // sits tight under the corner, so the plate stands down whenever one of them
    // is up rather than the column standing off all stage for a two-second
    // gesture. A hand-off that lands on a toast just does not print its name.
    if (leftColumnBusy(run)) return;
    const top = heroNameTop(run, style);
    // Left-aligned under the icon rather than centred on it: a plate that
    // centres moves its own left edge as the name changes width, and this column
    // has a hard left edge that everything else in it already respects.
    const x = PILL_X;
    ctx.save();
    // Clipped to everything BELOW the icon, so the plate slides out from behind
    // it rather than fading in on top of the sky.
    ctx.beginPath();
    ctx.rect(x - 2, top, w + 4, H + 6);
    ctx.clip();
    ctx.globalAlpha = e;
    drawPanel(ctx, x, top - H * (1 - e), w, H, 4, undefined, PANEL);
    rawDrawText(ctx, name, x + PAD, textY(top - H * (1 - e) + H / 2), '#d0f0e8', 1, 'bold');
    ctx.restore();
    return;
  }

  if (mode === 'slide') {
    // A separate plate that ARRIVES: it travels in from the right and docks in
    // its own gap beside the pill, well clear of the coin count, then leaves the
    // same way. The whole name is legible the entire time because it never
    // emerges edge-first.
    const GAP = 6, TRAVEL = 16;
    const x = px + pillW + GAP + TRAVEL * (1 - e);
    ctx.save();
    ctx.globalAlpha = e;
    drawPanel(ctx, x, PILL_CY - H / 2, w, H, 4, undefined, PANEL);
    rawDrawText(ctx, name, x + PAD, textY(PILL_CY), '#d0f0e8', 1, 'bold');
    ctx.restore();
    return;
  }

  // DRAWER — the plate EXTENDS and the glyphs do not move. It is drawn at the
  // width it has reached, with its own rounded end cap so the leading edge is a
  // drawer front and not a cut, and the name is clipped to it: revealed left to
  // right as the front passes over it. Tucked behind the pill's rounded end, so
  // the pill is the door it comes out of.
  const x = px + pillW - PILL_R;
  const outW = w * e;
  if (outW < 1) return;
  drawPanel(ctx, x, PILL_CY - H / 2, outW, H, Math.min(PILL_R, outW / 2), undefined, PANEL);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, PILL_Y, Math.max(0, outW - 2), H);
  ctx.clip();
  rawDrawText(ctx, name, x + PILL_R + PAD - 2, textY(PILL_CY), '#d0f0e8', 1, 'bold');
  ctx.restore();
}

export function drawStatusPill(ctx, run, style = HERO_CHIP, reveal = HERO_REVEAL) {
  // NO HERO, NO CHIP. The tutorial draws the coin half of this pill with no
  // relay at all; without this the pill would step aside for an icon that never
  // arrives and sit 26px in from a corner with nothing in it.
  if (!HERO_BY_ID[run.relay?.current]) { style = null; reveal = null; }
  const cells = run.oneHit ? 0 : run.maxBattery();
  const cellsW = hudBatteryW(cells, METER_H);
  const count = formatCoins(run.coins);
  const splitW = cells ? PILL_SPLIT * 2 + 0.5 : 0;
  const pillW = statusPillW(run, style);
  const geom = heroChipGeom(style, run);
  const px = PILL_X + geom.x;
  // Before the pill and the icon, so both are the door the name comes out from
  // behind. The SLIDE cut never overlaps either, so the order is free for it.
  if (reveal) drawHeroReveal(ctx, run, style, px, pillW, reveal);
  drawPanel(ctx, px, PILL_Y, pillW, PILL_H, PILL_R, undefined, PANEL);
  if (style) drawHeroChip(ctx, run, style, px, pillW);

  let x = px + (geom.lead || meterInset(cells));
  if (cells) {
    drawHudBattery(ctx, x, PILL_CY - METER_H / 2, cellsW, METER_H,
      cells, Math.max(0, Math.min(cells, run.battery)), METER_R);
    x += cellsW;
    ctx.fillStyle = UI_PANEL_BORDER;
    ctx.fillRect(x + PILL_SPLIT, PILL_Y + 3.5, 0.5, PILL_H - 7);
    x += splitW;
  }
  drawProp(ctx, 'hudCoin', x, PILL_CY - COIN_D / 2, COIN_D, COIN_D);
  drawCoinGlitter(ctx, x, PILL_CY - COIN_D / 2, COIN_D, run);
  // The count goes gold while the finish bonus is walking into it, so the number
  // that is CHANGING is the one that catches the eye — the plate below is the
  // source, this is the destination, and for a second they are the same colour.
  const paying = run.flipCoins && run.flipCoins.left > 0;
  rawDrawText(ctx, count, x + COIN_D + 3, textY(PILL_CY), paying ? '#f6d33c' : '#ffffff', 1, 'bold');
  // One-hit runs have no cells to show, so the pill states the terms instead —
  // on its own panel under it, red-edged, where the row of cells would have
  // been. A panel rather than a bare plated line: it is a standing readout of
  // the run's rules, not a popup, and it outlives every floatie on screen.
  if (run.oneHit) {
    const WARN = 'ONE HIT. GOOD LUCK.';
    const wp = 5, wh = 13, wy = leftColumnTop(run);
    drawPanel(ctx, PILL_X, wy, wp * 2 + textWidth(WARN, 0.85, 'bold'), wh, 4, undefined,
      { border: 'rgba(224,72,72,0.4)', shadow: true });
    rawDrawText(ctx, WARN, PILL_X + wp, textY(wy + wh / 2, 0.85), '#e04848', 0.85, 'bold');
  }
}

// The finish plate: the ONE card the flip prints. One line — the word BONUS,
// the coin, and the number still owed — hung off the left edge of the status
// pill and drained coin by coin into the count above.
//
// One card, one corner. The grade used to print as a floatie over the hero —
// which at the end of a stage means over the flagpole, top right — while the
// coins it was describing arrived top left. Same event, opposite corners, and
// the eye had to be in two places to read one reward. Here the word, the number
// and the destination are all within a few pixels of each other, and the count
// above going gold at the same moment ties the last knot.
//
// Two lines, and they are two different statements. The top one is the VERDICT
// — what you did and what it scored — and it is the only place the grade is
// named, so it stays. The bottom one is the PAYOUT arriving, labelled BONUS and
// carrying the coin so it cannot be mistaken for points, metres or seconds.
//
// The number shown is what is still OWED, so the plate empties as the pill
// fills. Two numbers moving in opposite directions is the whole animation.
function drawCoinBonus(ctx, run) {
  const b = run.flipCoins;
  if (!b || !(b.alpha > 0)) return;
  const D = 10, GAP = 3, PAD = 5, ROW = 13;
  const head = `${b.label}  +${b.points}`;
  const LABEL = 'BONUS';
  const labelW = textWidth(LABEL, 0.85, 'bold');
  // Sized off the widest reading each line will ever show, so the plate does not
  // shrink under its own count as the coins leave it.
  const coinRow = labelW + GAP * 2 + D + GAP + textWidth(`${b.total}`, 1, 'bold');
  // Flush with the corner above, never narrower — the plate and the readout
  // share a left AND a right edge, so they read as one block of run state rather
  // than as a card that happened to land under the HUD. That edge is the ICON's
  // now, not the pill's (see statusCornerW). Content still sets the floor: a
  // grade wider than the corner grows the plate instead of being clipped by it.
  const w = Math.max(statusCornerW(run), PAD * 2 + Math.max(textWidth(head, 0.85, 'bold'), coinRow));
  const h = ROW * 2 + 5;
  const x = PILL_X;
  // Under the one-hit warning when that row is present; otherwise the first
  // thing below the pill.
  const y = leftColumnTop(run) + (run.oneHit ? 16 : 0);
  ctx.save();
  ctx.globalAlpha = b.alpha;
  // Rides a couple of pixels up into place rather than blinking on.
  ctx.translate(0, (1 - b.alpha) * 3);
  drawPanel(ctx, x, y, w, h, 5, undefined, PANEL_GOLD);
  rawDrawText(ctx, head, x + PAD, textY(y + 3 + ROW / 2, 0.85), '#ffffff', 0.85, 'bold');
  // The word sits quieter than the number beside it: it is a label that never
  // changes, and the thing worth looking at is the count coming down.
  const cy = y + 3 + ROW + ROW / 2;
  rawDrawText(ctx, LABEL, x + PAD, textY(cy, 0.85), 'rgba(255,255,255,0.7)', 0.85, 'bold');
  const coinX = x + PAD + labelW + GAP * 2;
  drawProp(ctx, 'hudCoin', coinX, cy - D / 2, D, D);
  rawDrawText(ctx, `${b.left}`, coinX + D + GAP, textY(cy), '#f6d33c', 1, 'bold');
  ctx.restore();
}

// Goal toasts: a plug landing is the one mid-run event worth interrupting for,
// and it used to arrive as a floatie in the same stack as PEW and PICKED UP A
// POTATO. This says it once, in its own gold-edged panel, with a tick.
//
// It hangs off the bottom-left of the status pill rather than centre screen:
// centred, it landed in the same band as the dialog bubbles and the two
// overlapped. Under the pill it joins the left column of readouts, which is
// where the run's state already lives, and nothing else wants that space.
function drawGoalToast(ctx, run) {
  const g = run.goalToasts && run.goalToasts[0];
  if (!g) return;
  // Fade in over the first quarter second and back out over the last, riding a
  // few units of travel so it arrives rather than blinks on — leftward now, so
  // it slides out from under the pill instead of dropping onto it.
  const age = g.t0 - g.t;
  const k = Math.max(0, Math.min(1, Math.min(age, g.t) / 0.25));
  const e = k * k * (3 - 2 * k);
  const TICK = 9, PAD = 6, GAP = 4, TH = 15;
  const w = PAD * 2 + TICK + GAP + textWidth(g.text, 1, 'bold');
  // Clears the one-hit warning when that row is present — the two stack rather
  // than land on each other.
  const top = leftColumnTop(run) + (run.oneHit ? 16 : 0);
  const x = Math.round(PILL_X - (1 - e) * 4), y = top;
  ctx.save();
  ctx.globalAlpha = e;
  drawPanel(ctx, x, y, w, TH, 6, undefined, PANEL_GOLD);
  drawGoldTick(ctx, x + PAD + TICK / 2, y + TH / 2, TICK / 2);
  rawDrawText(ctx, g.text, x + PAD + TICK + GAP, textY(y + TH / 2), '#ffffff', 1, 'bold');
  ctx.restore();
}

// The ramp only ever differs by where its centre sits, so it is built in local
// space and positioned by the transform instead of being rebuilt — colour-stop
// table and all — on every frame the toast is up. Keyed on the context as well
// as the radius because the backbuffer is replaced on a backend change.
let tickGrad = null, tickGradR = 0, tickGradCtx = null;
function goldTickGradient(ctx, r) {
  if (tickGrad && tickGradR === r && tickGradCtx === ctx) return tickGrad;
  tickGrad = ctx.createLinearGradient(-r, -r, r, r);
  tickGrad.addColorStop(0, '#ffe07a');
  tickGrad.addColorStop(1, '#f0b419');
  tickGradR = r;
  tickGradCtx = ctx;
  return tickGrad;
}

// The banked-plug mark: a gold disc with a dark check cut through it. Same gold
// as the coin, because both mean "you have this now".
function drawGoldTick(ctx, cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = goldTickGradient(ctx, r);
  ctx.fill();
  ctx.strokeStyle = '#7a5200';
  ctx.lineWidth = r * 0.36;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, 0);
  ctx.lineTo(-r * 0.12, r * 0.36);
  ctx.lineTo(r * 0.48, -r * 0.38);
  ctx.stroke();
  ctx.restore();
}

// The coin catches the light twice in a normal level. It is a small flourish,
// not an alert competing with the live count beside it.
function drawCoinGlitter(ctx, x, y, size, run) {
  const progress = Number.isFinite(run.totalDist) && run.totalDist > 0
    ? Math.max(0, Math.min(1, run.distance / run.totalDist))
    : ((run.tRun || 0) % 45) / 45;
  const glints = [[0.3, 0.72, 0.24], [0.72, 0.26, 0.7]];
  ctx.save();
  ctx.fillStyle = '#fffce0';
  for (const [at, fx, fy] of glints) {
    const p = Math.abs(progress - at) / 0.012;
    if (p >= 1) continue;
    const k = Math.sin((1 - p) * Math.PI);
    // The star overhangs the coin rim at full swell — a sparkle contained
    // inside the disc just reads as a chipped highlight.
    const r = size * 0.55 * k;
    const cx = x + size * fx, cy = y + size * fy;
    ctx.globalAlpha = k;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// A donut gauge: `frac` of the ring stroked clockwise from twelve o'clock over
// a dark trough. The ability ring fills as it recharges, power-up rings drain
// as they expire — one shape, read in opposite directions.
function drawRingGauge(ctx, cx, cy, rOuter, rInner, frac, color) {
  const r = (rOuter + rInner) / 2;
  ctx.save();
  ctx.lineWidth = rOuter - rInner;
  ctx.strokeStyle = '#10141c';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  if (frac > 0) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHud(ctx, run) {
  // Forget last frame's right shoulder before anything redraws it. A speech
  // card asking mid-frame gets the objective panels as they were an instant
  // ago, which is what a card that lives for seconds wants; what it must not
  // get is an edge from a mission that has since been completed and shrunk.
  objLeft = OBJ_RIGHT;
  // The top row's shared midline: the status pill and the hero badge centre on
  // it, so the strip sits level instead of each piece hanging at its own
  // height. (The ability ring used to share it; it lives in the bottom band
  // now — see the gauge row below.) Taken from the pill rather than restated,
  // so moving the row's inset moves all of it.
  const HERO_CY = PILL_CY;
  // Slim world progress line across the top: cornflower fills toward the right edge,
  // the yellow tick is you. Reaching the end is the goal, so the end needs no
  // icon of its own — the finish line is drawn in-world as you approach it.
  //
  // The bar also calls the approach now. A blinking FINISH AHEAD used to sit
  // centre-screen for about two seconds, in the same band as the dialog
  // bubbles, announcing a finish pole that scrolls on and labels itself
  // moments later. Instead the fill warms cornflower -> gold over that last stretch
  // and finishes turning exactly as the pole appears: the same warning, in
  // peripheral vision, over nobody's words.
  if (!run.overtime && run.stage) {
    const frac = Math.min(1, run.distance / run.totalDist);
    // FINISH_WARM out to FINISH_HOT, where FINISH_HOT is the distance at which
    // run.js starts drawing the pole — the two signals meet rather than
    // overlap.
    const FINISH_WARM = 900, FINISH_HOT = 560;
    const remaining = run.totalDist - run.distance;
    const k = Number.isFinite(run.totalDist)
      ? Math.max(0, Math.min(1, (FINISH_WARM - remaining) / (FINISH_WARM - FINISH_HOT)))
      : 0;
    ctx.fillStyle = '#10141c';
    ctx.fillRect(0, 0, W, 3);
    ctx.fillStyle = mix('#6495ed', '#f6d33c', k);
    ctx.fillRect(0, 0, W * frac, 3);
    // Keep every banked checkpoint visible, not just the latest death snapshot.
    // These are deliberately only one quiet pixel wide and live entirely
    // inside the bar: a history of reference notches, not a second row of HUD.
    if (Number.isFinite(run.totalDist)) {
      ctx.fillStyle = 'rgba(16,20,28,0.55)';
      for (const marker of run.checkpointMarkers || []) {
        if (!Number.isFinite(marker)) continue;
        const checkpointFrac = Math.max(0, Math.min(1, marker / run.totalDist));
        ctx.fillRect(Math.round(W * checkpointFrac), 0, 1, 3);
      }
    }
    // Once the fill is gold the gold tick would vanish into it, so the tick
    // rides the other way, to white — it stays the brightest thing on the line.
    ctx.fillStyle = mix('#f6d33c', '#ffffff', k);
    ctx.fillRect(Math.min(W - 3, W * frac) - 1, 0, 3, 3);
  }

  drawBeatRibbon(ctx, run);

  // Cells and coins, one pill, top-left. No shield row: the glass orb around
  // the hero already shows both that a shield is held and how many, one ring
  // per stack. No plug tally either — three framed squares of "what you might
  // still win" is stage-select business, and mid-run it competed with the two
  // readouts you actually steer by. Landing a plug now announces itself.
  drawStatusPill(ctx, run);
  drawGoalToast(ctx, run);
  drawCoinBonus(ctx, run);

  // The live gauges, bottom-left: the ability nameplate and any running
  // power-up timers stacked above it. The hero-following orb owns the special
  // move's live cooldown state, so the HUD does not repeat that readout.
  //
  // The nameplate is a control reminder. The eye can read readiness beside the
  // hero now, while cells, coins and goals remain between-hazard glances.
  //
  // The stack grows UP from the ability rather than down: the ability sits in
  // the band below the ground line and there is no screen left underneath it.
  // Power-ups are the transient half of this group, so they are the half that
  // moves.
  // Shared geometry for the group: the inset before a label's text, the gap
  // from a donut's edge to its panel, and the power-up donut's radius. Named
  // because the nameplate below is placed off the same numbers rather than
  // restating the arithmetic.
  const LABEL_PAD = 5, RING_GAP = 5, SHELF_R = 5;
  // The whole group hangs off the status pill's left edge, so the top-left
  // banner and the bottom-left readouts start on one line down the screen
  // instead of two edges a few pixels apart. GAUGE_X is a donut *centre*, so it
  // sits one radius in from that line.
  const GAUGE_X = PILL_X + SHELF_R;
  // BOTTOM_CY: the midline the keyboard hints share, so the two bottom-edge
  // readouts sit level across the screen instead of each hanging at its own
  // height — and it puts the ability panel directly opposite the hint that names
  // the same button.
  const GAUGE_CY = BOTTOM_CY;
  // Each timer entry: a donut, a name panel hung off its right at the same
  // midline. Returns the panel's right edge, so a row of them can be laid end
  // to end. `show` false measures without drawing, which is how a blinking
  // entry holds its slot instead of collapsing the row.
  const gauge =(cx, cy, r, thick, frac, color, label, ink, scale, halo, show = true) => {
    const LP = LABEL_PAD, LH = scale < 1 ? 12 : 14;
    const lx = cx + r + RING_GAP;
    const lw = LP * 2 + textWidth(label, scale, 'bold');
    if (show) {
      drawRingGauge(ctx, cx, cy, r, thick, frac, color);
      if (halo) {
        ctx.save();
        ctx.globalAlpha = halo.alpha;
        ctx.strokeStyle = halo.color;
        ctx.lineWidth = halo.width;
        ctx.beginPath();
        ctx.arc(cx, cy, halo.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawPanel(ctx, lx, cy - LH / 2, lw, LH, 4, undefined, PANEL);
      rawDrawText(ctx, label, lx + LP, textY(cy, scale), ink, scale, 'bold');
    }
    return lx + lw;
  };

  // The nameplate. Touch play normally names the special on its USE button out
  // in the margin (run.js drawAbilityName) and this slot stays empty; the
  // keyboard, and the 'left' ability cut, keep a quiet plate here instead. Its
  // cooldown lives beside the hero in world space either way.
  const nameplateHere = abilityNameSlot(run) === 'left';
  if (nameplateHere) {
    const hero = HERO_BY_ID[run.relay.current];
    const label = hero.ability.label;
    const LP = LABEL_PAD, LH = 14;
    const lw = LP * 2 + textWidth(label, 1, 'bold');
    // Not GAUGE_X, which is a donut centre and this entry has no donut: the
    // plate goes on the same line the donuts and the status pill start on, so
    // the left column reads as one edge top to bottom. The power-up names above
    // step in past their donuts; the nameplate is the flush one.
    const ax = PILL_X;
    drawPanel(ctx, ax, GAUGE_CY - LH / 2, lw, LH, 4, undefined, PANEL);
    rawDrawText(ctx, label, ax + LP, textY(GAUGE_CY, 1), '#48e0c8', 1, 'bold');
  }

  // Power-up timers sit in a single row on the shelf above the ability, each in
  // its own colour, draining as it expires. A size down from the ability ring
  // and its label, because they are the same kind of thing one rank lower. The
  // last second and a half blinks, the same warning the old bars gave.
  //
  // A row rather than a column, because there is width to spare and no height:
  // the band below the ground line is 38px and the ability already spends most
  // of it, so a second stacked entry had to climb into the play field and land
  // on the player. Laid end to end instead, three entries reach x~270 — clear
  // of the keyboard hints on the right — and nothing ever leaves the band.
  //
  // Width is affordable because the row is short in practice: simulating the
  // drip spawner against the real durations, one timer runs about half the
  // time, two is a few percent, and three never came up in 400 stage-length
  // runs. Capsules arrive every 12-18s against 8-20s effects, a quarter of the
  // table is SHIELD (which is orb rings, not an entry),
  // and grabbing a duplicate refreshes its timer rather than adding one. A
  // brief third is possible off a breaker bonus or a !-crate; past that the row
  // would reach the hints, which the sim says does not happen.
  // With no nameplate under it (touch, ability named on its USE button) the
  // shelf only needs clearance from a plate that is not there, and sits closer
  // to the bottom edge instead of leaving that band empty.
  const SHELF_CY = nameplateHere ? GAUGE_CY - 15 : TOUCH_SHELF_CY;
  // Only the in-canvas fallback JUMP button (run.js setButtons, chrome.mode
  // 'none') actually reaches into this corner at x 56 — chrome mode moves
  // JUMP out into the margin, so the row no longer needs to duck it there.
  let px = GAUGE_X + (Input.usingTouch && !run.useChrome ? 52 : 0);
  for (const [id, a] of Object.entries(run.powerups.active)) {
    // Beat-locked stages never expose timing-changing pickups.  Keep the HUD
    // defensive as well: a stale developer/test state must not advertise a
    // rewind, speed, or low-gravity effect that collection would discard.
    if (run.beatLock && (id === 'capSpeed' || id === 'capLowGrav' || id === 'capRewind'
      || id === 'speed' || id === 'lowGrav' || id === 'rewind')) continue;
    const def = POWER_DEFS[id];
    if (!def) continue;
    const persistent = !!a.persistent;
    const blink = !persistent && a.t < 1.5 && Math.floor(a.t * 6) % 2 === 0;
    const over = a.level > run.powerups.levelOf(id);
    // Blinking measures but does not draw, so the entry keeps its slot and the
    // rest of the row does not shuffle sideways twice a second.
    const right = gauge(px, SHELF_CY, SHELF_R, 2.7, persistent ? 1 : a.t / a.t0, def.color,
      `${def.name}${over ? '+' : ''}`, def.color, 0.8,
      over && { alpha: 0.5, color: def.color, width: 1, r: 7.5 }, !blink);
    px = right + 11;   // panel edge, a gap, then the next donut's radius
  }

  // Relay: current hero. The ability ring is the only readiness readout, so
  // there are no pips here. Skipped entirely once a hero chip is picked — the
  // status pill is then saying the same thing in the corner, and two of them
  // would be the clutter the chip exists to remove.
  if (!HERO_CHIP) drawHeroBadge(ctx, run, HERO_CY);

  // What you are here to do, top-right. Two panels, deliberately unequal: the
  // mission is the run's win condition and the challenge is an optional extra,
  // and as two identical grey lines they read as a list of two equal chores. So
  // the mission gets a GOAL tab and a full-size panel in white, and the
  // challenge sits under it smaller, dimmer, tagged BONUS — the hierarchy is in
  // the chrome, not in wording the player has to stop and parse.
  //
  // Up here rather than bottom-left because this is the read-once half of the
  // HUD: the briefing states the mission before the stage starts, and mid-run
  // you are checking a count, not re-reading a sentence. The corner nearest the
  // player went to the gauges, which are read continuously.
  //
  // Right-anchored, so the panels grow leftward into empty sky as the text gets
  // longer instead of pushing off the screen edge. The full corner is theirs on
  // touch too: the PAUSE button used to share this line and the anchor pulled
  // in 66px to clear it, costing every mission title a third of its width on
  // the screens with the least of it. PAUSE hangs below these panels now.
  const objRight = OBJ_RIGHT;
  // `text` is either a plain string or a [head, tail, widest] triple, where the
  // tail is the live part that survives a fold and the head is the sentence
  // that does not. `fold` runs 0 (full) to 1 (tail only).
  //
  // `widest` is the tail's RESERVATION: the widest string that tail will ever
  // print, and the slot is sized to it rather than to what is printed now. A
  // counter walks through every width from `1/30` to `29/30` on a proportional
  // face, and without the reserve the panel's left edge twitched on every
  // pickup — the one thing a readout you glance at mid-jump must not do. The
  // count sits right-aligned in its slot, so the `/30` never moves either.
  //
  // Both halves are laid out from the right edge, which is what makes the fold
  // cheap to read: the tail's glyphs are already where they will end up, so the
  // count does not slide across the screen while you are trying to watch it. All
  // that moves is the panel's left edge, and it moves *through* the head — the
  // clip below is set at the tag's trailing edge, so the shrinking panel wipes
  // the sentence with the same motion that closes it. One gesture, not two.
  // `alpha` is the whole-panel fade. Only the BONUS line ever uses it — see
  // bonusAlpha below — and it wraps rather than being threaded through the
  // layout so the fold, the clip and the two-part text keep working untouched.
  //
  // `right` is the edge the panel hangs off, and both wrappers RETURN the left
  // edge they landed on: a second chip on the same row (BONUS_SLOT 'chip') has
  // to start where the first one ended, and measuring the mission string twice
  // in two places is how the two would drift apart.
  const objective = (tag, tagColor, text, ink, y, scale, fold = 0, alpha = 1, right = objRight) => {
    if (alpha <= 0) return right;
    if (alpha < 1) { ctx.save(); ctx.globalAlpha *= alpha; }
    const x = drawObjective(tag, tagColor, text, ink, y, scale, fold, right);
    if (alpha < 1) ctx.restore();
    return x;
  };
  const drawObjective = (tag, tagColor, text, ink, y, scale, fold = 0, right = objRight) =>
    drawObjectivePanel(ctx, tag, tagColor, text, ink, y, scale, fold, right);
  const OBJ_Y = OBJ_ROW_Y, OBJ_Y2 = OBJ_ROW2_Y;
  // The widest string a `count/n` readout can print, for reserving its slot.
  // The count never exceeds n, so it has at most n's digits, and the face is
  // proportional, so "widest" means the fattest digit in every position — not
  // simply n over n, which on this face is narrower than, say, 88/30.
  const countSlot = (n, prefix = '') => `${prefix}${widestDigit().repeat(String(n).length)}/${n}`;
  // Long challenge descriptions have to fit beside the badge, not through it.
  // `reserve` is width already spoken for by a tail the truncation must not eat
  // into — the count is the one part of that line worth keeping whole.
  const fitRight = (text, reserve = 0) => {
    const max = W / 2 - 44 - reserve;
    let out = text;
    while (out.length > 3 && textWidth(out) > max) out = out.slice(0, -1);
    return out === text ? out : out.slice(0, -2) + '..';
  };
  // The BONUS panel's fold clock. Held open while bonusT is running, eased shut
  // over its last half-second.
  //
  // ON A BEAT STAGE IT OPENS ONCE, BRIEFLY. The full sentence and the beat
  // ribbon share one band, but an unexplained `BONUS 0/10` is not a useful
  // trade for keeping every opening marker visible. Objectives draw after the
  // ribbon, so the sentence deliberately covers it for RHYTHM_BONUS_TIME, then
  // folds to the live count before the lane is established. A constructor-held
  // clock makes this read once per run; BONUS_HOLD updates later in the stage
  // still use their goal toast and cannot reopen it over incoming prompts.
  const fold = bonusPanelFold(run);
  // The BONUS line — and only that one — leaves before the marker arrives. It is
  // a statement of what is still being ASKED, and by the time the flagpole is on
  // screen there is nothing left to ask: the challenge is already whatever it
  // is, and the results card is seconds away with the verdict on it. Staying up,
  // it spends the entire finale sitting in the same band as the flag.
  //
  // GOAL stays. It is one short line, it is the run's own title bar, and the
  // second row was the one actually landing next to the pole.
  //
  // Driven by DISTANCE, not by the finish run arming: the pole is drawn from 560
  // out and the dash arms later than that, so a fade keyed to the dash was still
  // printing over the marker for the whole approach — which is the shot it
  // ruins. Gone by 360 out, about half a second of fade at running speed, so it
  // reads as one demand lifting rather than as the HUD blinking.
  const remain = Number.isFinite(run.totalDist) ? run.totalDist - run.distance : Infinity;
  const bonusAlpha = run.finishing ? 0 : 1 - smoothstep(Math.min(1, Math.max(0, (560 - remain) / 200)));
  if (!run.overtime && run.stage) {
    const m = run.mission;
    const label = GOAL_LABELS[m.type] ?? m.type.toUpperCase();
    let prog = '', slot = '';
    if (m.n) { prog = `${m.count ?? 0}/${m.n}`; slot = countSlot(m.n); }
    // Through the run's own counter, not a field beside it: the win check
    // reads missionCount(), and a HUD that reads anything else can disagree
    // with it. It did — the chase tally lived on the copter, which is removed
    // when he leaves, so the goal fell back to 0/3 and stayed there.
    if (m.type === 'chase') prog = `${run.missionCount()}/${m.n}`;
    if (m.type === 'combo') { prog = `BEST ${run.relay.bestCombo}/${m.n}`; slot = countSlot(m.n, 'BEST '); }
    // The count rides in a reserved slot (see drawObjective) so the panel holds
    // its width from 0/n to n/n; the label is truncated against that reserve,
    // not against whatever the count happens to measure this frame.
    const goalText = prog ? [`${fitRight(label, textWidth(` ${slot}`))} `, prog, slot] : fitRight(label);
    const goalLeft = objective('GOAL', '#74c947', goalText, '#ffffff', OBJ_Y, 1);
    run.hudGoalLeft = goalLeft;

    // WHAT THE BONUS SAYS, settled before WHERE it goes. The two used to be one
    // expression, which is why the readout could only ever live in the one slot
    // the call site named — BONUS_SLOT answers the second question only.
    //
    // `frac` and `color` are the donut cut's half of it and mean nothing to the
    // others; a challenge with no count (noDamage) has no progress to draw, so
    // it reads as full for as long as it is still alive.
    let bonus = null;
    if (run.challenge && !run.challenge.failed) {
      const c = run.challenge;
      const done = c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n;
      const tail = done ? 'OK' : c.type === 'noDamage' ? ''
        : c.type === 'combo' ? `BEST ${Math.min(c.count, c.n)}/${c.n}`
        : `${Math.min(c.count, c.n)}/${c.n}`;
      // The slot the count is reserved in. OK is its own width on purpose:
      // completing is a one-time event with a colour change, and the panel
      // settling to a shorter word is part of that event, not the twitch the
      // reserve exists to stop.
      const widest = done || c.type === 'noDamage' ? tail
        : c.type === 'combo' ? countSlot(c.n, 'BEST ') : countSlot(c.n);
      bonus = {
        tagColor: done ? '#74c947' : 'rgba(255,255,255,0.5)',
        ink: done ? '#74c947' : 'rgba(255,255,255,0.72)',
        head: `${fitRight(c.desc, textWidth(` ${widest}`, 0.85))} `,
        tail,
        widest,
        frac: c.n ? Math.min(1, (c.count || 0) / c.n) : 1,
        color: done ? '#74c947' : '#f6c945',
      };
    } else if (run.challenge && !run.beatLock) {
      // Folded, this one keeps the verdict rather than the description: a missed
      // challenge is a tombstone, and the words that matter are the last three.
      //
      // AND ON A BEAT STAGE IT DOES NOT GET A STONE AT ALL. Folded is not small
      // here — NOT THIS TIME is a hundred pixels of tail, further left than the
      // ribbon's far end — so the panel that has nothing left to say would spend
      // the rest of the run standing on the markers that still do. It is already
      // lost, the results card says so, and the toast said so when it happened.
      bonus = {
        tagColor: 'rgba(255,255,255,0.3)',
        ink: 'rgba(255,255,255,0.35)',
        head: `${fitRight(run.challenge.desc, textWidth(' - NOT THIS TIME', 0.85))} - `,
        tail: 'NOT THIS TIME',
        widest: 'NOT THIS TIME',
        frac: 0,
        color: 'rgba(255,255,255,0.3)',
      };
    }
    if (bonus) {
      const words = [bonus.head, bonus.tail, bonus.widest];
      // Every panel cut asks bonusPlacement where it goes; only the donut, which
      // is not a panel, is placed here. The gallery's bake-off asks the same
      // function, which is what keeps its tiles honest about the real layout.
      const at = bonusPlacement(fold, goalLeft);
      if (at) {
        objective('BONUS', bonus.tagColor, words, bonus.ink, at.y, 0.85, at.fold, bonusAlpha, at.right);
      } else if (BONUS_SLOT === 'shelf' && bonusAlpha > 0) {
        // At the END of the power-up row, in the row's own language: a donut
        // that fills. It is last because the power-ups are transient and this
        // is not — a timer expiring must not shuffle the standing readout.
        ctx.save();
        ctx.globalAlpha *= bonusAlpha;
        gauge(px, SHELF_CY, SHELF_R, 2.7, bonus.frac, bonus.color,
          bonus.tail ? `BONUS ${bonus.tail}` : 'BONUS', bonus.ink, 0.8);
        ctx.restore();
      }
    }
  } else {
    run.hudGoalLeft = objective('GOAL', '#b888f0', 'OVERTIME', '#ffffff', OBJ_Y, 1);
  }

  // Keyboard controls hint; the power status lives in the top-right gauge.
  //
  // It teaches, then it leaves. Four keys is a thing you learn in the first
  // stage and then never look at again, and a strip that sits in the corner for
  // all twenty-seven of them is just permanent furniture — so run.js only arms
  // the timer on the opening stage, and the pause screen carries the same
  // legend for anyone who does forget. The last second is a fade rather than a
  // cut: chrome that vanishes between frames reads as a glitch.
  if (!Input.usingTouch && run.hintT > 0 && !run.beatLock) {
    const hero = HERO_BY_ID[run.relay.current];
    const hints = [['SPC', 'JUMP'], ['DN', 'SLIDE'], ['RT/D', hero.ability.label], ['LT/A', 'REWIND'], ['P', 'PAUSE']];
    const S = 0.85, HP = 6, HH = 12;
    const inner = keyLegendWidth(hints, S);
    const hx = W - EDGE - (inner + HP * 2), hy = BOTTOM_CY - HH / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, run.hintT / HINT_FADE);
    drawPanel(ctx, hx, hy, inner + HP * 2, HH, 4, undefined, PANEL);
    drawKeyLegend(ctx, hints, hx + HP, textY(hy + HH / 2, S), { scale: S });
    ctx.restore();
  }

  // The touch controls: JUMP, USE, PAUSE. One painter for all three
  // (drawRoundButton) — the whole point of the set is that they are the same
  // object in three places, and three call sites drawing "the same" disc is how
  // that stops being true. Only USE carries state, and only it deviates: a
  // recharge level.
  //
  // Non-round buttons here are the paused screen's menu plates, which the pause
  // overlay draws itself (run.js drawPaused) — over the dim, not under it.
  drawPlayPill(ctx);
  for (const b of Input.buttons) {
    if (!b.round) continue;
    drawRoundButton(ctx, b, roundButtonOpts(run, b));
  }
}

/**
 * The in-canvas play pill, painted from whichever halves are registered.
 *
 * Exported and called by every playable surface rather than inlined into one,
 * for the same reason drawRoundButton is: a run and the tutorial both put this
 * control on screen, and two call sites drawing "the same" pill is how they
 * stop being the same pill. The tutorial's own button loop shipped without it
 * for exactly one build, and the result was a slide control the training level
 * did not have.
 *
 * Once, not per button — it is ONE control, and a painter called twice is how a
 * seam becomes a gap. The box is the union of the live halves, so a caller that
 * offers only one gets a single-height plate with one centred glyph rather than
 * a double-height plate with a hole in it.
 */
export function drawPlayPill(ctx) {
  const up = Input.buttons.find((b) => b.pill === 'up');
  const down = Input.buttons.find((b) => b.pill === 'down');
  if (!up && !down) return;
  const box = up && down ? PLAY_PILL : (up || down);
  drawActionPill(ctx, { x: box.x, y: box.y, w: box.w, h: box.h }, {
    up: !!up,
    down: !!down,
    // Straight off the ribbon's table. The strip teaches the glyph and the
    // button wears it, which only stays true while there is one table.
    upInk: ACTION_INK.jump,
    downInk: ACTION_INK.duck,
    outline: GLYPH_OUTLINE,
  });
}

// Shared between the in-canvas button loop above and run.js's chrome-canvas
// buttons (same discs, drawn to a different context when there's room to put
// them outside the game rect instead).
export function roundButtonOpts(run, b) {
  if (b.id !== 'ability') return { frac: null, fill: 'rgba(11,11,20,0.1)', ink: 'rgba(72,224,200,0.48)' };
  const cd = run.player.abilityCd;
  const maxCd = HERO_BY_ID[run.relay.current].ability.cooldown;
  const frac = cd > 0 ? Math.max(0, Math.min(1, 1 - cd / maxCd)) : 1;
  const energy = specialMoveColor(frac, cd <= 0);
  return {
    // Full reads as "ready" — not empty. It drains to 0 the instant you fire
    // it, then rises back to full as the cooldown counts down, and STAYS full
    // once ready (drawRoundButton no longer treats frac===1 as "nothing to
    // draw"). The old empty-when-ready/full-right-before-ready-again cycle
    // had the meter and the mental model running backwards from each other.
    frac,
    // The USE control shares the hero-side orb's exact readiness palette, so
    // both reads agree at a glance as the cooldown rises.
    fill: 'rgba(11,11,20,0.1)',
    ink: energy,
    levelFill: energy,
    waterline: '#d7fff6',
  };
}

// Cast who talk but are not playable, so are absent from HERO_BY_ID. They still
// have a toon rig, so the portrait path works — only the name needs supplying.
//
// Missing an entry here is not a crash, which is what makes it easy to miss: an
// unknown `who` falls through to the anonymous branch below and the speaker gets
// the plain centred plate the GAME uses to talk to you. So a named character
// left out of this table does not look broken, it looks like narration — which
// is exactly how Dolores shipped her first afternoon.
const EXTRA_SPEAKERS = { gary: { short: 'GARY' }, dolores: { short: 'DOLORES' } };

/**
 * How far the whole popup stack has to move to get out of the hero's way.
 *
 * The cards ride the hero's own COLUMN — that is what makes them his and not
 * the game's — in a row chosen to clear his head while he is standing on the
 * lane. A road that climbs takes him up through it: on an island or a low fork
 * the camera cranes and holds, so he now LIVES with his crown above the row and
 * the stack printing across his chest for as long as he stays up there.
 *
 * So the row goes UNDER him. One displacement for the whole stack rather than
 * a clamp per card, because the cards are slotted 19px apart on purpose and a
 * per-card clamp would pile simultaneous popups on the same line. Zero the rest
 * of the time, which is nearly always.
 *
 * `hero` is the hero's STANDING box — the caller drops his jump height before
 * asking, so an ordinary hop never moves a card. Both it and the return are in
 * the overlay's own unscaled screen space.
 */
export function floatieShift(floaties, hero) {
  if (!floaties.length || !hero) return 0;
  let top = Infinity, bottom = -Infinity;
  for (const f of floaties) {
    top = Math.min(top, f.y);
    bottom = Math.max(bottom, f.y + FLOAT_CARD_H);
  }
  top = Math.max(38, Math.round(top));
  if (bottom <= hero.y0 || top >= hero.y1) return 0;   // already clear of him
  return Math.max(0, Math.round(hero.y1 + FLOAT_DUCK_GAP - top));
}

// The highest row a drifting card may reach: clear of the beat ribbon by the
// same three the speech card takes.
const FLOAT_CEILING = BEAT_RIBBON_BOTTOM + 3;
// One slotted card's height — the pitch floatText stacks them at. Only ever
// used to ask whether the stack and the hero are in the same band.
const FLOAT_CARD_H = 19;
// Air between the hero's feet and the stack once it has ducked under him.
const FLOAT_DUCK_GAP = 6;
// What a card fades to on the frames it is unavoidably over the hero. Low
// enough that he reads through it, high enough that the card is still there —
// blinking a popup out mid-word is its own kind of distracting.
const FLOAT_CROSS_FADE = 0.3;

// Speech plates lay out on a taller row than the popup cards do — the bubble is
// read standing still, the barks are read in motion.
const SPEECH_ROW = 11;
// The highest row the popup stack may START from — see floatBaseY, which clamps
// to it. It lives here, beside the speech card's own row pitch, because the
// thing it has to stay under IS the speech card: a plate at its tallest (a
// portrait beside three wrapped lines) bottoms out this far down, and the stack
// begins a clear gap below that. Both halves were a bare 108 in run.js, which
// stopped being true the moment the card moved.
export const FLOAT_BASE_CEILING = SPEECH_Y - 4
  + Math.max(15 + 6, 4 * SPEECH_ROW + 8) + 16;
// Air left between the hero and a card that has ducked under him. Enough that
// the two read as separate things rather than as a card he is wearing.
const SPEECH_DUCK_GAP = 6;

/**
 * Where the card actually lands, given something on screen it must not cover.
 *
 * The default anchor is high in the frame and that is right nearly always: the
 * card belongs to a character standing at the BOTTOM of it. The exception is
 * the hero himself LIVING up there — an island or a climbing fork puts his
 * crown near the top edge and leaves it there, and the card prints across him
 * for the whole stretch.
 *
 * So it ducks UNDER him rather than moving him or fading out: the line is still
 * readable, it is still in the same place relative to the speaker, and nothing
 * changes at all for the running that is most of a stage. `avoid` is a screen
 * rect in the overlay's own unscaled space; without one this is a no-op, which
 * is what every caller outside a run gets.
 *
 * If there is no room below — the hero filling the frame, or the touch shelf
 * taking the bottom of it — the card stays where it was. Shuffling it a few
 * pixels buys nothing, and a card half off the bottom edge is worse than a card
 * over a hero.
 */
function placeSpeechCard(baseY, cardX, cardW, cardH, avoid) {
  if (!avoid) return baseY;
  const top = baseY - 4;                       // the PLATE's top; baseY is its first row
  if (cardX + cardW <= avoid.x0 || cardX >= avoid.x1) return baseY;
  if (top + cardH <= avoid.y0 || top >= avoid.y1) return baseY;
  // The lowest the plate's top may sit. On touch the power-up shelf owns the
  // bottom of the frame and the card may not reach into it.
  const topLimit = (Input.usingTouch ? TOUCH_SHELF_CY - 6 : H - EDGE_BOTTOM - 5) - cardH;
  const ducked = avoid.y1 + SPEECH_DUCK_GAP;
  return ducked <= topLimit ? ducked + 4 : baseY;
}

// `opts.light` swaps the card to a pale, opaque plate with dark ink.
//
// `opts.y` moves the whole card off its default anchor. Training uses it to
// park Gary well above the lane: his card is up for most of the module rather
// than for a line or two, so at the default y it spent nine sections sitting in
// the band a held jump actually travels through.
//
// `opts.avoid` is a screen rect the card must keep off — the run passes the
// hero's own STANDING box, so a card fired while he is up on a platform ducks
// under him instead of printing across him, and a jump — which is over in half
// a second — never moves it at all. See placeSpeechCard.
//
// `opts.maxWidth` narrows the wrap, and with it the measured panel. The card is
// centred on W/2 and grows symmetrically off its longest line, so a screen with
// something parked in a top corner — the tutorial's PAUSE disc — pulls both
// edges in rather than trying to shove the card sideways.
//
// `opts.scale` grows the whole card, not just the lettering — portrait, padding
// and row pitch all come up together, because type that grows inside fixed
// furniture just outgrows the box it is printed in. Training uses it on touch:
// a phone is a quarter the physical width of a desk monitor and is held at
// arm's length with a thumb over part of it, so a card sized for a keyboard
// player is a card a phone player squints at.
//
// The default is built for a run: a translucent slate over a bright, moving
// stage, where a solid card would punch a hole in the art. The food court is the
// opposite problem — the concourse wall is #241c30, which is within a few
// percent of the panel's own fill, so the card lost its edges and pale teal ink
// sat on near-black at almost no contrast. A light plate reads instantly there,
// and the difference is worth having anyway: a hero chatting in the hub is a
// different register from one shouting over gameplay.
export function drawSpeech(ctx, speech, opts = {}) {
  const light = !!opts.light;
  // Eggshell talks in pink-red ink, allies in the same pale teal as the badge.
  const isEgg = speech.who === 'eggshell';
  const hero = !isEgg && speech.who
    ? (HERO_BY_ID[speech.who] || EXTRA_SPEAKERS[speech.who] || null)
    : null;
  const ink = light ? (isEgg ? '#8e1f36' : '#332b45') : (isEgg ? '#f0a0a0' : '#d0f0e8');
  const nameInk = light ? '#1a1028' : '#fff';
  // `opts.plate` overrides the light card's fill — the one use for it is taking
  // a few percent of alpha out so the lane shows through, which a screen whose
  // card is up almost continuously wants and the food court's occasional line
  // does not. Passing it does NOT change the ink or the border: those are what
  // make the light plate readable, and they are sized for a plate that is
  // nearly opaque.
  const plate = light ? (opts.plate ?? '#ece9f6') : undefined;
  const plateOpts = light ? { border: 'rgba(26,16,40,0.4)', shadow: true } : null;
  const panel = (px, py, pw, ph) => (plate
    ? drawPanel(ctx, px, py, pw, ph, 4, plate, plateOpts)
    : drawPanel(ctx, px, py, pw, ph, 3));
  const baseY = opts.y ?? SPEECH_Y;
  const s = opts.scale ?? 1;
  // A null who is the game itself talking (tutorials, station notes): a plain
  // centered plate, no portrait.
  //
  // The bubble sits high on purpose — it belongs to a character standing at the
  // bottom of the frame — so this y is an anchor, not a centring failure. What
  // is centred here is the ink inside the plate.
  if (!isEgg && !hero) {
    // Three lines, not two: Eggshell's longest grievances need the room.
    const lines = wrapText(speech.text, Math.min(opts.maxWidth ?? W, W - 56 * s), s, 3);
    const tw = Math.max(...lines.map((line) => textWidth(line, s)));
    // Measured before it is placed: the card can only get out of the hero's way
    // once it knows how tall it is.
    const cardX = W / 2 - tw / 2 - 6 * s;
    const cardW = tw + 12 * s;
    const cardH = 8 * s + lines.length * SPEECH_ROW * s;
    const y = placeSpeechCard(baseY, cardX, cardW, cardH, opts.avoid);
    panel(cardX, y - 4, cardW, cardH);
    // Through textY, like every other panel in this file. The plate's 4 units
    // of top padding put the first ROW at y; the ink then has to be centred on
    // that row rather than having its 12-unit glyph box hung off the top of it,
    // which sat every tutorial line high on its own plate.
    lines.forEach((line, i) =>
      rawDrawTextCentered(ctx, line, W / 2,
        textY(y + (i * SPEECH_ROW + SPEECH_ROW / 2) * s, s), ink, s));
    return;
  }
  // Named speakers: one block — portrait on the left, name as a header over
  // the words. Face, name, and text read as a single card per speaker. A
  // caller may hide the repeated name while retaining the portrait; the
  // omitted header row is removed from the card's measured height as well.
  const showName = speech.showName !== false;
  const name = isEgg ? 'EGGSHELL' : hero.short;
  const FACE_W = 20 * s, FACE_H = 15 * s, PAD = 7 * s, GAP = 6 * s;
  const ROW = SPEECH_ROW * s;
  const lines = wrapText(speech.text, Math.min(opts.maxWidth ?? W, W - 100 * s), s, 3);
  const tw = Math.max(showName ? textWidth(name, s) : 0, ...lines.map((line) => textWidth(line, s)));
  const textH = (lines.length + (showName ? 1 : 0)) * ROW;
  const h = Math.max(FACE_H + 6 * s, textH + 8 * s);
  const w = PAD + FACE_W + GAP + tw + PAD;
  const x = Math.round(W / 2 - w / 2);
  const y = placeSpeechCard(baseY, x, w, h, opts.avoid);
  panel(x, y - 4, w, h);
  const faceY = Math.round(y - 4 + (h - FACE_H) / 2);
  // Eggshell has no toon rig — his prop painter plays the portrait.
  if (isEgg) {
    // His FACE, not his machine: the card is him talking, and the tub would
    // take two thirds of the slot (see eggshellFace).
    drawProp(ctx, 'eggshellFace', x + PAD, faceY, FACE_W, FACE_H);
  } else {
    const face = toonFaceSprite(speech.who, FACE_W, FACE_H);
    if (face) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(face, x + PAD, faceY, FACE_W, FACE_H);
      ctx.imageSmoothingEnabled = false;
    }
  }
  const tx = x + PAD + FACE_W + GAP;
  const ty = y - 4 + Math.round((h - textH) / 2) + 3 * s;
  if (showName) rawDrawText(ctx, name, tx, ty, nameInk, s);
  lines.forEach((line, i) => rawDrawText(ctx, line, tx, ty + (showName ? ROW : 0) + i * ROW, ink, s));
}

// ACT announcement: full-screen corporate-glitch card over the frozen world.
// The text is an authored stage.intro, split at the first sentence so the act
// number slams as a title and the subtitle sits under it.
//
// It sits next to drawSpeech because it is the same job — the game addressing
// you over the top of a run — and because it is a painter, not a run: the only
// state it reads is passed in. That is what lets the dev prose browser preview
// an act card cold, with no RunState behind it, and still be looking at the
// exact card the stage puts up.
const HEAD_S = 2; // the act number's type scale; the block height is measured off it
// The skip hint's own line, low on the card and clear of the centred block.
const SKIP_Y = 210;
export function drawActBanner(ctx, text, { t = 0, alpha = 1, still = false, skip = false } = {}) {
  const dot = text.indexOf('. ');
  const head = dot > 0 ? text.slice(0, dot) : text;
  const tail = dot > 0 ? text.slice(dot + 2) : '';
  const jx = (i) => (still ? 0 : Math.round(Math.sin(t * 47 + i * 13) * 1.5));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, 0, W, H);
  // Centred on the canvas, measured rather than nailed to a y.
  //
  // Head and tail used to sit at a hard 92 and 128, which centred the block on
  // the band ABOVE the groundline (0..GROUND_Y, middle 116) rather than on the
  // screen — so a card with one subtitle line rode about 20px high, and one
  // with three rode high by a different amount again, because only the top of
  // the block was pinned. Both are laid out from the midline now, so every card
  // is centred and a longer subtitle grows in both directions.
  //
  // The internal spacing is the authored one, kept exactly: the head's glyph
  // box is 12*scale tall, then a 13px gap, then 12px per tail line.
  const tailLines = wrapText(tail, W - 48, 1, 3);
  const HEAD_H = 12 * HEAD_S, GAP = 13, TAIL_H = 12;
  const blockH = HEAD_H + (tailLines.length ? GAP + TAIL_H * tailLines.length : 0);
  const top = Math.round((H - blockH) / 2);
  // rawDrawTextCentered takes the glyph-box top, which sits 1*scale above the ink.
  const headY = top + HEAD_S;
  const tailY = top + HEAD_H + GAP + 1;
  // Chromatic ghosts under a white core: a memo shot through a bad signal.
  rawDrawTextCentered(ctx, head, W / 2 - 1 + jx(1), headY, '#c83030', HEAD_S, 'title');
  rawDrawTextCentered(ctx, head, W / 2 + 1 - jx(2), headY, '#48e0c8', HEAD_S, 'title');
  rawDrawTextCentered(ctx, head, W / 2, headY, '#fff', HEAD_S, 'title');
  tailLines.forEach((line, i) =>
    rawDrawTextCentered(ctx, line, W / 2, tailY + i * TAIL_H, '#c8c8d8'));
  if (!still) {
    // Tracking slices: thin bars drifting like a mistracked tape.
    ctx.fillStyle = 'rgba(200,48,48,0.3)';
    for (let i = 0; i < 4; i++) {
      const y = (i * 67 + Math.floor(t * 140)) % H;
      ctx.fillRect(jx(i) * 2, y, W, 1);
    }
  }
  // Only drawn when the card can actually be skipped, which is the whole point:
  // an always-present hint would be a lie on the one playthrough where the card
  // is not skippable, and that is the playthrough where it is read.
  if (skip) {
    rawDrawTextCentered(ctx, `${Input.confirmVerb()} TO SKIP`, W / 2, SKIP_Y, '#8a8a98');
  }
  ctx.restore();
}

// The two-button surface, drawn on itself. The left TOUCH_JUMP_FRAC of the
// canvas is JUMP and the rest is the power, and nothing else on a touch screen
// says so — the discs in the corners look like the only controls there are, so
// a thumb that stayed on the left plays whole stages without knowing the
// right-hand strip exists.
//
// Both zones are washed rather than just the jump side: shading one half reads
// as "this half is disabled", which is the opposite of the point. The jump side
// carries the heavier wash because it is the bigger claim on the screen and
// that is the fact being taught.
//
// It lives here rather than in the tutorial that first drew it because the
// campaign's opening stage now shows the same card to players who skipped
// training (run.js). One painter, so the two can never drift into teaching the
// same screen two different layouts.
export function drawTouchZoneCard(ctx, { alpha = 1, scrim = 0, hint = null } = {}) {
  const split = Math.round(W * TOUCH_JUMP_FRAC);
  ctx.save();
  ctx.globalAlpha = alpha;
  // Optional, and off for the caller that draws this over a moving world: a
  // tutorial that dims its own lane is hiding the thing the card is pointing
  // at. Where the card is modal (run.js holds the world for it), the dim earns
  // its place twice — the two zone washes are barely a fifth of an alpha, and
  // over a bright pack they carry pale ink on a pale sky at close to 2:1; and a
  // screen that has stopped ought to look stopped.
  if (scrim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${scrim})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = 'rgba(72,224,200,0.22)';
  ctx.fillRect(0, 0, split, H);
  ctx.fillStyle = 'rgba(246,211,60,0.22)';
  ctx.fillRect(split, 0, W - split, H);
  // The seam, dashed, so it reads as a boundary you could put a thumb either
  // side of rather than as a wall.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let y = 4; y < H; y += 12) ctx.fillRect(split - 0.5, y, 1, 6);
  // Three rows a side, each centred on its own zone, then two full-width lines
  // under them — the gesture that works in either zone, and the way out.
  //
  // Every line is far bigger than a HUD line, because this is not a HUD: it is
  // the one screen in the game whose entire job is to be read once, by someone
  // who does not yet know how to play, at arm's length, on a phone. It used to
  // run five rows a side at 0.75–0.9 scale — the size the HUD uses for numbers
  // you glance at. Fewer facts, and the type doubled to suit.
  //
  // Nothing in the right column may extend below y 184: the USE disc occupies
  // x 424–468 from there down, and the tutorial draws this card over live
  // controls with no scrim to quiet them.
  const pct = Math.round(TOUCH_JUMP_FRAC * 100);
  const lx = split / 2, rx = split + (W - split) / 2;
  const TEAL = '#d7fff6', GOLD = '#ffe9a0';
  // The header clears a THREE-line speech panel, not a two-line one: this card
  // only ever appears on touch, where the wrap is narrowest and the tutorial's
  // brief for this section runs to three rows. That panel bottoms out at 74.
  // Every line on this card is centred on a ZONE, never on the canvas. The
  // canvas midline falls at 240 and the seam at 336, so a screen-centred
  // headline lands three-quarters of the way across the teal half and reads as
  // crooked — it is centred on a middle the card does not have. The two
  // full-width lines take the jump column's axis instead, which is the one the
  // eye is already using.
  rawDrawTextCentered(ctx, 'THE WHOLE SCREEN IS TWO BUTTONS', lx, 76, 'rgba(255,255,255,0.92)', 1.35, 'bold');
  // POWER runs smaller than JUMP for the room it has, not for its importance:
  // the right zone is 30% of the canvas and a word a letter longer at the left
  // column's scale would touch both its edges.
  rawDrawTextCentered(ctx, 'JUMP', lx, 100, TEAL, 3.6, 'title');
  rawDrawTextCentered(ctx, 'POWER', rx, 106, GOLD, 2.7, 'title');
  rawDrawTextCentered(ctx, 'TAP & HOLD ANYWHERE', lx, 150, TEAL, 1.4, 'bold');
  rawDrawTextCentered(ctx, 'TAP ANYWHERE', rx, 150, GOLD, 1.4, 'bold');
  // The footnote of the card, not its point — and the last row that fits above
  // the USE disc.
  rawDrawTextCentered(ctx, `LEFT ${pct}%`, lx, 172, 'rgba(215,255,246,0.72)', 1.2, 'bold');
  rawDrawTextCentered(ctx, `RIGHT ${100 - pct}%`, rx, 172, 'rgba(255,233,160,0.72)', 1.2, 'bold');
  // One line rather than one per column, because the swipe is still read from
  // whichever zone the thumb is already in. The BUTTON is named first now that
  // there is one: the down arrow is the reliable path and the swipe is the
  // one-handed fallback, and this row sits close enough to the pill to be read
  // as pointing at it. Kept short on purpose — the pill's right edge is at 56
  // and this line is centred on the jump column's axis at 168, so a string much
  // past this length runs into the control it is describing.
  rawDrawTextCentered(ctx, 'SLIDE: DOWN ARROW OR SWIPE', lx, 196, 'rgba(255,255,255,0.85)', 1.35, 'bold');
  // Below the discs' midline, where nothing else on this card sits — a call to
  // action wants its own air, and at this size it no longer fits on the ACT
  // card's skip line.
  if (hint) rawDrawTextCentered(ctx, hint, lx, 220, '#fff', 1.5, 'bold');
  ctx.restore();
}

// The row height every carded popup lays its lines out on. Named because the
// card's height and the ink's midline are both derived from it — they were two
// separate literal 10s, which is how the text ended up centred on the glyph BOX
// instead of on the ink (see TEXT_INK_TOP in sprites.js).
const LINE_H = 10;

// Floatie chrome: one step lighter than the standard HUD panel, so in-world
// barks read as their own species without leaving the design system.
const FLOAT_PANEL = 'rgba(58,64,88,0.72)';
const FLOAT_BORDER = 'rgba(255,255,255,0.22)';

// The hazard card. Every other floatie tints the translucent panel above, which
// over a light pack (the doodle sheet is #eceadf) composites to a mid grey near
// rgb(108,112,126) — and the hazard red is the one ink in the set dark enough
// that it cannot survive that: it lands at 1.2:1 there and 3.2:1 even over the
// darkest pack. The rest of the palette was lifted to clear the floor, but red
// cannot be lifted without becoming salmon and ceasing to mean danger. So the
// ink keeps its saturation and the CARD does the work instead: opaque, so the
// pack behind it stops mattering, which puts red at 4.5:1 everywhere. It reads
// as a different species of message, which a hazard is.
const HAZARD_PANEL = '#1a1220';
const HAZARD_BORDER = { border: 'rgba(224,72,72,0.55)', shadow: true };

// The death banner: the dim, and the fail message on a card.
//
// Same job as drawActBanner — the game addressing you over the top of a run —
// and now the same rule as every other string this module draws: it sits on a
// panel. It was the one exception, bare red text over a 35% dim, which put the
// message straight onto whatever the stage happened to look like at the moment
// you died. Over a bright pack that is red on mid-tone at barely 2:1.
//
// It takes the HAZARD card rather than the standard translucent one for the
// same reason the hazard floatie does: this is the failure ink, it is the
// darkest in the set, and it cannot survive a panel you can see the stage
// through. Opaque card, and the pack behind it stops mattering.
//
// The dim is deeper than the 0.35 it replaces but lighter than the pause
// screen's 0.6 — the hero's death pop launches them up through this frame and
// is worth still being able to watch.
export function drawFailBanner(ctx, text) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  // Same card geometry as a floatie (4px above and below the ink), with more
  // air at the sides: this one is centred on the screen rather than hung off
  // the hero's column, so it reads as a plate rather than as a bark.
  //
  // Centred on the canvas from the card's own height, so a message that wraps
  // to two lines grows in both directions instead of hanging off a fixed top.
  const PADX = 10;
  const lines = wrapText(text, W - 72, 1, 2);
  const tw = Math.max(...lines.map((line) => textWidth(line)));
  const bw = tw + PADX * 2, bh = lines.length * 10 + 8;
  const by = Math.round((H - bh) / 2);
  drawPanel(ctx, Math.round(W / 2 - bw / 2), by, bw, bh, 5, HAZARD_PANEL, HAZARD_BORDER);
  // Through textY, like every other panel in this file: the glyph box is 12
  // units tall but the ink only occupies the middle 6 of it, so centring the
  // box leaves the lettering sitting visibly high on its own card.
  lines.forEach((line, i) =>
    rawDrawTextCentered(ctx, line, W / 2, textY(by + 4 + i * LINE_H + LINE_H / 2), '#e04848'));
  ctx.restore();
}

// One feedback popup — the card and the words on it. Lifted out of run.js's
// draw loop for the same reason drawActBanner was: it is a painter, and the
// only state it reads is passed in. That is what lets the gallery lay every
// floatie the game can produce side by side, drawn by this exact function,
// and judge them for legibility without a RunState behind any of them.
//
// `heroX` is the hero's column in SCREEN space, already through the zoom —
// this layer is unscaled, so a world offset here would leave every card
// trailing behind the hero.
// One card of the popup stack. Its whole life is 19px of slot and a slow drift
// upward, and both of those are measured from FLOAT_BASE — a row chosen to
// clear a STANDING hero's head. `shiftY` is what happens when the hero is not
// standing: see floatieShift.
export function drawFloatie(ctx, f, { heroX, mirror = false, alpha = 1, keepLeftOf = null, shiftY = 0, avoid = null } = {}) {
  // Impact words (PEW, BOY.) center over the hero's head; anything longer
  // shares one left edge at the hero column and rags rightward into the
  // direction of travel — centering long lines on a hero this near the screen
  // edge just shoved each one to its own x. In mirror mode the shared edge is
  // on the right and text rags leftward.
  let floatX = mirror ? W - heroX - 6 : heroX + 6;
  let edgeX = mirror ? W - heroX : heroX;
  const short = f.text.length <= 5;
  const lines = wrapText(f.text, short ? W - 32 : W - heroX - 8, 1, 2);
  // HOW HIGH A CARD MAY DRIFT. It was a flat 38, which was three of air under
  // a beat ribbon that ended at 40; the strip has moved to the top of the
  // screen and the number stayed, so the cards were stopping fourteen pixels
  // short of anything. Off the strip's own export now, so the two cannot drift
  // apart again. Nothing else is up there in the hero's column — the HUD's
  // shoulders are out at the edges and a floatie rises from where he stands.
  const topY = Math.max(FLOAT_CEILING, Math.min(H - 48 - lines.length * LINE_H, Math.round(f.y) + shiftY));
  // Each floatie rides its own HUD panel — the bare text plate washed out over
  // light packs.
  const tw = Math.max(...lines.map((line) => textWidth(line)));
  const PADX = 5;
  let bx = short ? floatX - tw / 2 - PADX : (mirror ? edgeX - tw - PADX : edgeX - PADX);
  // Clear of the finish marker. Floaties rise from the hero's column, and at
  // the end of a stage the hero's column IS the flagpole — so the card that
  // says what you just scored prints across the flag it is describing, over the
  // one three seconds of the level built to be looked at. Given a limit, the
  // whole card slides left until its right edge is off the pole; it is moved
  // bodily, panel and text together, so the ragged left edge the long lines
  // share stays a straight edge.
  if (keepLeftOf != null) {
    const dx = Math.min(0, keepLeftOf - (bx + tw + PADX * 2));
    bx += dx; floatX += dx; edgeX += dx;
  }
  // The crossing. A hero passing through the row has to share it with the cards
  // for a few frames however fast the duck moves — there is no continuous path
  // from one side of him to the other — so for those frames the card goes
  // translucent and he reads through it. It is the same idea as the duck, at
  // the one scale the duck cannot fix.
  const cardH = lines.length * LINE_H + 8;
  const onHero = avoid
    && bx + tw + PADX * 2 > avoid.x0 && bx < avoid.x1
    && topY - 4 + cardH > avoid.y0 && topY - 4 < avoid.y1;
  ctx.save();
  ctx.globalAlpha = alpha * (onHero ? FLOAT_CROSS_FADE : 1);
  drawPanel(ctx, Math.round(bx), topY - 4, tw + PADX * 2, cardH, 4,
    f.solid ? HAZARD_PANEL : FLOAT_PANEL,
    f.solid ? HAZARD_BORDER : { border: FLOAT_BORDER, shadow: true });
  // Through textY, like every other panel in this file. The glyph box is 12
  // units tall and the ink occupies only the middle 6, so placing the box top
  // at the row top — which is what this did — left every bark riding high on
  // its own card, by most of the 3 units of padding the card actually has.
  lines.forEach((line, i) => {
    const y = textY(topY + i * LINE_H + LINE_H / 2);
    if (short) rawDrawTextCentered(ctx, line, floatX, y, f.color);
    else rawDrawText(ctx, line, mirror ? edgeX - textWidth(line) : edgeX, y, f.color);
  });
  ctx.restore();
}
