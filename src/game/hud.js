// HUD: status pill (cells + coins), power-up timers, relay meter + team faces,
// mission progress, world progress bar, speech bubbles, goal toasts.
//
// Everything the HUD puts on screen sits on a panel from drawPanel — same fill,
// same hairline, same corner. The overlay used to be three languages at once
// (a coin on a soft text plate, a row of pickup sprites, a tray of framed plug
// squares) stacked down the left, and the corner read as clutter rather than as
// one instrument. One chrome, and the eye can learn it once.
import { W, H } from '../engine/renderer.js';
import {
  drawText as rawDrawText, drawTextCentered as rawDrawTextCentered,
  textWidth, wrapText, drawPanel, drawRoundButton, textYForMid, UI_PANEL_BORDER,
  keyLegendWidth, drawKeyLegend,
} from '../engine/sprites.js';
import { toonFaceSprite } from '../sprites/toons.js';
import { drawProp } from '../sprites/props.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { POWER_DEFS } from './powerups.js';
import { specialMoveColor, HERO_CENTER_OFF } from './draw.js';
import { Input, TOUCH_JUMP_FRAC } from '../engine/input.js';
import { PLAYER_X } from './player.js';
import { formatCoins } from './progress.js';
import { Audio } from '../engine/audio.js';

// The one chrome. Passed to every drawPanel call in the HUD.
const PANEL = { border: UI_PANEL_BORDER, shadow: true };

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
// Thinner than it was — seven units, not nine — and its top edge drops by the
// two it lost off the bottom, so the MIDLINE every glyph hangs off (see `mid`
// in drawBeatRibbon) stays exactly where it was. The plate was never doing any
// work with that ink: the arrows reach 2.5 units either side of the midline at
// the top of their swell, so the extra unit at each end was plastic sitting
// over the sky.
const RIBBON_Y = 29, RIBBON_H = Math.round(7 * RIBBON_SCALE);
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
  return { anchor, backW: near - margin, aheadW: W - margin - near };
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
const RIBBON_MARGIN = 88;
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
const RIBBON_PLATE = 'rgba(16,20,28,0.55)';
// How far an action glyph swells on the downbeat, as a fraction of its size.
// A quarter is the most it can take before the arrows start clipping their own
// lane at the top of the swell; it is also about the least that still reads as
// a pulse rather than as a jitter at the size these are drawn.
const RIBBON_PULSE = 0.25;
// The playhead's tabs stand off the plate at each end rather than crossing it
// (see the gold bar below), so the band is taller than the plate it brackets.
const RIBBON_TAB = 3 * RIBBON_SCALE;
export const BEAT_RIBBON_BOTTOM = RIBBON_Y + RIBBON_H + RIBBON_TAB;
// Where a speech card's first ROW goes when the beat lane is up. drawSpeech
// hangs its plate four units above the row it is handed, so clearing the ribbon
// means clearing it by four more than it looks — plus three of air, or the card
// and the strip read as one stacked instrument.
export const BEAT_SPEECH_Y = BEAT_RIBBON_BOTTOM + 4 + 3;

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
  const mid = y + h / 2, ARROW_H = 2.5 * u;
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
  const back = ctx.createLinearGradient(tail, 0, head, 0);
  const fadeStop = fadeBack / span, fadeStopAhead = fadeAhead / span;
  // Translucent, not a black bar. At full strength a strip this long stopped
  // being chrome and became a hole in the sky — the widest, heaviest object in
  // the frame, sitting over the prettiest part of the stage. It only has to
  // hold the markers legible, and the markers are gold, cyan, pink and near
  // white against it, so it can give most of the scene back and still do that.
  back.addColorStop(0, 'rgba(16,20,28,0)');
  back.addColorStop(fadeStop, RIBBON_PLATE);
  back.addColorStop(1 - fadeStopAhead, RIBBON_PLATE);
  back.addColorStop(1, 'rgba(16,20,28,0)');
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
  // Brighter at rest than the crossing bar was. That one could afford to sit at
  // a third of its ink because it was 22px of gold against a dark plate; two
  // 6px tabs standing on the sky have to hold the eye on their own.
  ctx.fillStyle = `rgba(246,211,60,${0.55 + pulse * 0.45})`;
  // THE PLAYHEAD BRACKETS THE PLATE, it does not run through it. As one bar
  // across the full height it stood over every marker that reached the line —
  // the one moment a marker is being judged was the one moment it was half
  // hidden behind gold — and the two brightest things on the strip were fighting
  // for the same pixels. Two tabs, one clear above and one clear below, say the
  // same column just as plainly, and the gap between them is the marker's.
  ctx.fillRect(anchor - 1.5 * u, y - RIBBON_TAB, 3 * u, RIBBON_TAB);
  ctx.fillRect(anchor - 1.5 * u, y + h, 3 * u, RIBBON_TAB);
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
    ctx.fillStyle = marker.action === 'jump' ? '#f6d33c'
      : marker.action === 'duck' ? (marker.prop === 'barrel' ? '#d4a35e' : '#72d8f0')
        : marker.action === 'ability' ? '#f890b8' : '#ffffff';
    // EVERY GLYPH CENTRES ON THE BAND'S MIDLINE. The jump and duck arrows used
    // to sit two units high and two units low of it, so the pair were not
    // merely reflections about one line and the strip said DOWN twice. That
    // reading cost more than it bought once the arrows were drawn at scale: two
    // big triangles at different heights read as a strip that cannot keep its
    // own baseline, and the direction they point is already unmissable. Which
    // way it points is what the player reads at a glance; the colour (cyan
    // against the jump's gold) is what confirms it.
    if (marker.action === 'jump') {
      const aw = 3 * u * glyphSwell, ah = ARROW_H * glyphSwell;
      ctx.beginPath(); ctx.moveTo(x, mid - ah); ctx.lineTo(x - aw, mid + ah); ctx.lineTo(x + aw, mid + ah); ctx.closePath(); ctx.fill();
    } else if (marker.action === 'duck') {
      const aw = 3 * u * glyphSwell, ah = ARROW_H * glyphSwell;
      ctx.beginPath(); ctx.moveTo(x, mid + ah); ctx.lineTo(x - aw, mid - ah); ctx.lineTo(x + aw, mid - ah); ctx.closePath(); ctx.fill();
    } else if (marker.action === 'ability') {
      ctx.beginPath(); ctx.arc(x, mid, 3 * u * glyphSwell, 0, Math.PI * 2);
      ctx.strokeStyle = '#f890b8'; ctx.lineWidth = Math.max(1, Math.round(u)); ctx.stroke();
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
  ctx.restore();
}

// The touch power-up shelf's midline (see drawHud below) — exported so run.js
// can line the chrome ability-name label up against it exactly, not just land
// close by.
export const TOUCH_SHELF_CY = H - 11 - 4;

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
export function playButtons() {
  return [
    { id: 'jump', x: 12, y: TOUCH_PLAY_Y, w: TOUCH_D, h: TOUCH_D, action: 'jump', label: 'JUMP', round: true },
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
const BONUS_FOLD = 0.55;

// GOAL-panel display labels. The counted missions (targets/cords/chase/rescue/
// combo) fall through to the raw type name because the count printed beside it
// carries the meaning. The four survive-to-the-end types have no count, so a
// bare "REACH"/"FUSE"/"BLACKOUT"/"ESCAPE" reads as an incomplete instruction —
// spell out what "done" is instead.
const GOAL_LABELS = {
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

// The status pill: cells on the left, coins on the right, one panel.
//
// Coins are the only value here that changes length as it climbs (0 -> 10 ->
// 100), so they sit on the right edge and the pill grows rightward. Put them
// left and every gain would shove the cells sideways — the one readout you
// check by shape, in motion, at a glance, would never be in the same place
// twice.
// The pill is the tallest panel in the top row, so its inset is the one the
// whole strip is judged by: at y=3 it read as flush against the screen edge
// while its shorter neighbours looked correctly inset. 5 gives the row air
// without shrinking the pill around its 12px coin.
const PILL_X = 8, PILL_Y = 5, PILL_H = 18, PILL_CY = PILL_Y + PILL_H / 2;

// Where the left column of readouts under the status pill starts — the one-hit
// warning, the goal toasts, the finish plate, in that stacking order. It is a
// function and not a constant because the beat ribbon now rides in that band:
// with the playhead over the hero the strip reaches from x 30 to x 186, which
// is exactly where those panels were printing. Keyed on beatLock rather than on
// whether the ribbon is currently drawn, so the column has ONE height for the
// whole stage instead of hopping 15px every time a zone card or a pause hides
// the strip out from under it.
function leftColumnTop(run) {
  return run?.beatLock ? BEAT_RIBBON_BOTTOM + 3 : PILL_Y + PILL_H + 3;
}
const CELL_W = 10, CELL_H = 6.8, CELL_GAP = 2;
const COIN_D = 12, PILL_PAD = 6, PILL_SPLIT = 5;

// Exported because the tutorial shows a coin count too, and a second hand-built
// coin readout would be a second thing to keep in sync with this one. A caller
// with no cells to show (oneHit false, maxBattery() 0) gets exactly the coin
// half of the pill.
// The pill's own width, as a function rather than a local, because the finish
// plate below it is sized to match: two stacked panels of different widths read
// as two unrelated readouts that happen to be near each other, and the whole
// point of that plate is that it belongs to this one.
function statusPillW(run) {
  const cells = run.oneHit ? 0 : run.maxBattery();
  const cellsW = cells ? cells * CELL_W + (cells - 1) * CELL_GAP : 0;
  // A floor of two digits: a lone '0' left the coin sitting in a pocket of
  // dead panel, and the pill twitched wider the moment it hit 10.
  const countW = Math.max(textWidth(formatCoins(run.coins), 1, 'bold'), textWidth('00', 1, 'bold'));
  const splitW = cells ? PILL_SPLIT * 2 + 0.5 : 0;
  return PILL_PAD * 2 + cellsW + splitW + COIN_D + 3 + countW;
}

export function drawStatusPill(ctx, run) {
  const cells = run.oneHit ? 0 : run.maxBattery();
  const cellsW = cells ? cells * CELL_W + (cells - 1) * CELL_GAP : 0;
  const count = formatCoins(run.coins);
  const splitW = cells ? PILL_SPLIT * 2 + 0.5 : 0;
  const pillW = statusPillW(run);
  drawPanel(ctx, PILL_X, PILL_Y, pillW, PILL_H, 6.5, undefined, PANEL);

  let x = PILL_X + PILL_PAD;
  for (let i = 0; i < cells; i++) {
    drawProp(ctx, i < run.battery ? 'cellFull' : 'cellEmpty', x, PILL_CY - CELL_H / 2, CELL_W, CELL_H);
    x += CELL_W + CELL_GAP;
  }
  if (cells) {
    x -= CELL_GAP;
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
  // Flush with the pill above, never narrower — the two panels share a left AND
  // a right edge, so they read as one block of run state rather than as a card
  // that happened to land under the HUD. Content still sets the floor: a grade
  // wider than the pill grows the plate instead of being clipped by it.
  const w = Math.max(statusPillW(run), PAD * 2 + Math.max(textWidth(head, 0.85, 'bold'), coinRow));
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
  // The top row's shared midline: the status pill and the hero badge centre on
  // it, so the strip sits level instead of each piece hanging at its own
  // height. (The ability ring used to share it; it lives in the bottom band
  // now — see the gauge row below.) Taken from the pill rather than restated,
  // so moving the row's inset moves all of it.
  const HERO_CY = PILL_CY;
  // Slim world progress line across the top: teal fills toward the right edge,
  // the yellow tick is you. Reaching the end is the goal, so the end needs no
  // icon of its own — the finish line is drawn in-world as you approach it.
  //
  // The bar also calls the approach now. A blinking FINISH AHEAD used to sit
  // centre-screen for about two seconds, in the same band as the dialog
  // bubbles, announcing a breaker pole that scrolls on and labels itself
  // moments later. Instead the fill warms teal -> gold over that last stretch
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
    ctx.fillStyle = mix('#48e0c8', '#f6d33c', k);
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
  // Shares the keyboard hint line's midline (hy = H - 17, 12 tall) so the two
  // bottom-edge readouts sit level across the screen instead of each hanging at
  // its own height — and it puts the ability panel directly opposite the hint
  // that names the same button.
  const GAUGE_CY = H - 11;
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

  if (!Input.usingTouch) {
    // Touch play names the special directly on its USE button. Desktop keeps a
    // quiet nameplate here; its cooldown lives beside the hero in world space.
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
  // runs. Capsules arrive every 12-18s against 8-20s effects, ~8% of the table
  // is the relay charge and ~17% is SHIELD (which is orb rings, not an entry),
  // and grabbing a duplicate refreshes its timer rather than adding one. A
  // brief third is possible off a breaker bonus or a !-crate; past that the row
  // would reach the hints, which the sim says does not happen.
  // On touch the ability ring below is skipped entirely (see !Input.usingTouch
  // below) — so the shelf only needs clearance from a ring that's not there,
  // and can sit closer to the bottom edge instead of leaving that band empty.
  const SHELF_CY = Input.usingTouch ? TOUCH_SHELF_CY : GAUGE_CY - 15;
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

  // Relay: current hero. The ability ring is the only charge readout — it goes
  // gold when a charge is banked — so there are no pips here.
  // A rounded badge: face on the left, name inside beside it. Same panel and
  // light text as the speech bubble below it, so the two read as one family.
  // Sized to the name and centred on screen, so it grows symmetrically instead
  // of drifting as hero names change width. Face and text are both placed off
  // HERO_CY, unrounded, so they share one midline.
  // Centred on the ability ring and the status pill beside it, so the whole top
  // row shares one midline instead of the badge hanging below it.
  const BADGE_H = 14;
  const BADGE_R = 3; // matches the corner radius drawText uses for its plates
  const FACE_W = 12, FACE_H = 9;
  const PAD_L = 4, GAP = 4, PAD_R = 7;
  const name = HERO_BY_ID[run.relay.current].short;
  const badgeW = PAD_L + FACE_W + GAP + textWidth(name) + PAD_R;
  const badgeX = Math.round(W / 2 - badgeW / 2);
  const badgeY = HERO_CY - BADGE_H / 2;
  drawPanel(ctx, badgeX, badgeY, badgeW, BADGE_H, BADGE_R, undefined, PANEL);
  const face = toonFaceSprite(run.relay.current, FACE_W, FACE_H);
  if (face) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(face, badgeX + PAD_L, HERO_CY - FACE_H / 2, FACE_W, FACE_H);
    ctx.imageSmoothingEnabled = false;
  }
  // Raw text: the badge is already the backing, so it must not carry a plate
  // of its own.
  rawDrawText(ctx, name, badgeX + PAD_L + FACE_W + GAP, textY(HERO_CY), '#d0f0e8');

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
  const OBJ_R = W - 8;
  // `text` is either a plain string or a [head, tail] pair, where the tail is
  // the live part that survives a fold and the head is the sentence that does
  // not. `fold` runs 0 (full) to 1 (tail only).
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
  const objective = (tag, tagColor, text, ink, y, scale, fold = 0, alpha = 1) => {
    if (alpha <= 0) return;
    if (alpha < 1) { ctx.save(); ctx.globalAlpha *= alpha; }
    drawObjective(tag, tagColor, text, ink, y, scale, fold);
    if (alpha < 1) ctx.restore();
  };
  const drawObjective = (tag, tagColor, text, ink, y, scale, fold = 0) => {
    const TP = 5, GAP = 5;
    const h = scale < 1 ? 12 : 14;
    const cy = y + h / 2;
    const tw = textWidth(tag, 0.8, 'bold');
    const lead = TP * 2 + tw + GAP;      // panel's left edge -> first glyph
    const [head, tail] = Array.isArray(text) ? text : [text, ''];
    const full = head + tail;
    const wFull = lead + textWidth(full, scale);
    const wTail = lead + textWidth(tail, scale);
    const w = Math.round(wFull + (wTail - wFull) * fold);
    const x = OBJ_R - w;
    drawPanel(ctx, x, y, w, h, 4, undefined, PANEL);
    rawDrawText(ctx, tag, x + TP, textY(cy, 0.8), tagColor, 0.8, 'bold');
    const tailX = OBJ_R - TP - textWidth(tail, scale);
    if (head && fold < 1) {
      // Measured as the difference between the joined string and the tail, not
      // as textWidth(head): textWidth drops the trailing tracking on whatever it
      // is handed, so measuring the head alone lands it a pixel off from where
      // the same words sit when the two are drawn as one string.
      const headX = tailX - (textWidth(full, scale) - textWidth(tail, scale));
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
  };
  // Centred on HERO_CY, the midline the status pill and the hero badge already
  // share, so all three top-row panels sit level instead of GOAL riding high.
  const OBJ_Y = HERO_CY - 7;   // 14-tall panel
  // The BONUS line hangs below with a real gap, not flush: the two panels are a
  // hierarchy, not one block, and 4px of sky says so.
  const OBJ_Y2 = OBJ_Y + 18;
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
  // ON A BEAT STAGE IT NEVER OPENS AT ALL. The panel and the beat ribbon share
  // one band, and the ribbon is now laid out from the frame (see RIBBON_MARGIN)
  // — it reaches to x 407, while the panel holding its full sentence comes back
  // past 250. For the first ten seconds of every rhythm stage the far third of
  // the strip was printing UNDER the challenge line: the markers with the most
  // warning in them, hidden behind a sentence the briefing screen already said.
  // Between a sentence you get one read of and the readout you play the stage
  // off, the readout wins. The count still stands in the corner, and completing
  // the challenge still says itself in words — that is a goalToast, not this.
  const fold = run.beatLock ? 1
    : 1 - smoothstep(Math.min(1, Math.max(0, run.bonusT ?? 0) / BONUS_FOLD));
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
    let prog = '';
    if (m.n) prog = ` ${m.count ?? 0}/${m.n}`;
    if (m.type === 'chase' && run.copter) prog = ` ${run.copter.caught}/${m.n}`;
    if (m.type === 'combo') prog = ` BEST ${run.relay.bestCombo}/${m.n}`;
    objective('GOAL', '#74c947', fitRight(`${GOAL_LABELS[m.type] ?? m.type.toUpperCase()}${prog}`), '#ffffff', OBJ_Y, 1);
    if (run.challenge && !run.challenge.failed) {
      const c = run.challenge;
      const done = c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n;
      const tail = done ? 'OK' : c.type === 'noDamage' ? '' : `${Math.min(c.count, c.n)}/${c.n}`;
      objective('BONUS', done ? '#74c947' : 'rgba(255,255,255,0.5)',
        [`${fitRight(c.desc, textWidth(` ${tail}`, 0.85))} `, tail],
        done ? '#74c947' : 'rgba(255,255,255,0.72)', OBJ_Y2, 0.85, fold, bonusAlpha);
    } else if (run.challenge && !run.beatLock) {
      // Folded, this one keeps the verdict rather than the description: a missed
      // challenge is a tombstone, and the words that matter are the last three.
      //
      // AND ON A BEAT STAGE IT DOES NOT GET A STONE AT ALL. Folded is not small
      // here — NOT THIS TIME is a hundred pixels of tail, further left than the
      // ribbon's far end — so the panel that has nothing left to say would spend
      // the rest of the run standing on the markers that still do. It is already
      // lost, the results card says so, and the toast said so when it happened.
      objective('BONUS', 'rgba(255,255,255,0.3)',
        [`${fitRight(run.challenge.desc, textWidth(' - NOT THIS TIME', 0.85))} - `, 'NOT THIS TIME'],
        'rgba(255,255,255,0.35)', OBJ_Y2, 0.85, fold, bonusAlpha);
    }
  } else {
    objective('GOAL', '#b888f0', 'OVERTIME', '#ffffff', OBJ_Y, 1);
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
    const hx = W - 8 - (inner + HP * 2), hy = H - 17;
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
  // recharge level, and gold when a relay charge is banked.
  //
  // Non-round buttons here are the paused screen's menu plates, which the pause
  // overlay draws itself (run.js drawPaused) — over the dim, not under it.
  for (const b of Input.buttons) {
    if (!b.round) continue;
    drawRoundButton(ctx, b, roundButtonOpts(run, b));
  }
}

// Shared between the in-canvas button loop above and run.js's chrome-canvas
// buttons (same discs, drawn to a different context when there's room to put
// them outside the game rect instead). A banked charge overrides the
// cooldown: the button reads gold and full, because it is usable right now.
export function roundButtonOpts(run, b) {
  if (b.id !== 'ability') return { frac: null, fill: 'rgba(11,11,20,0.1)', ink: 'rgba(72,224,200,0.48)' };
  const charged = run.player.relayCharge;
  const cd = charged ? 0 : run.player.abilityCd;
  const maxCd = HERO_BY_ID[run.relay.current].ability.cooldown;
  const frac = cd > 0 ? Math.max(0, Math.min(1, 1 - cd / maxCd)) : 1;
  const energy = specialMoveColor(frac, charged || cd <= 0);
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
  const topLimit = (Input.usingTouch ? TOUCH_SHELF_CY - 6 : H - 8) - cardH;
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
  const baseY = opts.y ?? 46;
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
    drawProp(ctx, 'eggshell', x + PAD, faceY, FACE_W, FACE_H);
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
  // One line rather than one per column, because that is the fact — the duck
  // swipe is read from whichever zone the thumb is already in, which is what
  // ANYWHERE is doing in the sentence. On the jump column's axis with the rest
  // of the full-width copy, and low enough to sit in the clear lane between the
  // two discs.
  rawDrawTextCentered(ctx, 'SWIPE DOWN ANYWHERE TO SLIDE', lx, 196, 'rgba(255,255,255,0.85)', 1.35, 'bold');
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
  const topY = Math.max(38, Math.min(H - 48 - lines.length * LINE_H, Math.round(f.y) + shiftY));
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
