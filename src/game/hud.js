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
import { Input } from '../engine/input.js';
import { formatCoins } from './progress.js';

// The one chrome. Passed to every drawPanel call in the HUD.
const PANEL = { border: UI_PANEL_BORDER, shadow: true };

// The touch power-up shelf's midline (see drawHud below) — exported so run.js
// can line the chrome ability-name label up against it exactly, not just land
// close by.
export const TOUCH_SHELF_CY = H - 11 - 4;

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
const CELL_W = 10, CELL_H = 6.8, CELL_GAP = 2;
const COIN_D = 12, PILL_PAD = 6, PILL_SPLIT = 5;

function drawStatusPill(ctx, run) {
  const cells = run.oneHit ? 0 : run.maxBattery();
  const cellsW = cells ? cells * CELL_W + (cells - 1) * CELL_GAP : 0;
  const count = formatCoins(run.coins);
  // A floor of two digits: a lone '0' left the coin sitting in a pocket of
  // dead panel, and the pill twitched wider the moment it hit 10.
  const countW = Math.max(textWidth(count, 1, 'bold'), textWidth('00', 1, 'bold'));
  const splitW = cells ? PILL_SPLIT * 2 + 0.5 : 0;
  const pillW = PILL_PAD * 2 + cellsW + splitW + COIN_D + 3 + countW;
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
  rawDrawText(ctx, count, x + COIN_D + 3, textY(PILL_CY), '#ffffff', 1, 'bold');
  // One-hit runs have no cells to show, so the pill states the terms instead —
  // on its own panel under it, red-edged, where the row of cells would have
  // been. A panel rather than a bare plated line: it is a standing readout of
  // the run's rules, not a popup, and it outlives every floatie on screen.
  if (run.oneHit) {
    const WARN = 'ONE HIT. GOOD LUCK.';
    const wp = 5, wh = 13, wy = PILL_Y + PILL_H + 3;
    drawPanel(ctx, PILL_X, wy, wp * 2 + textWidth(WARN, 0.85, 'bold'), wh, 4, undefined,
      { border: 'rgba(224,72,72,0.4)', shadow: true });
    rawDrawText(ctx, WARN, PILL_X + wp, textY(wy + wh / 2, 0.85), '#e04848', 0.85, 'bold');
  }
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
  const top = PILL_Y + PILL_H + 3 + (run.oneHit ? 16 : 0);
  const x = Math.round(PILL_X - (1 - e) * 4), y = top;
  ctx.save();
  ctx.globalAlpha = e;
  drawPanel(ctx, x, y, w, TH, 6, undefined, PANEL_GOLD);
  drawGoldTick(ctx, x + PAD + TICK / 2, y + TH / 2, TICK / 2);
  rawDrawText(ctx, g.text, x + PAD + TICK + GAP, textY(y + TH / 2), '#ffffff', 1, 'bold');
  ctx.restore();
}

// The banked-plug mark: a gold disc with a dark check cut through it. Same gold
// as the coin, because both mean "you have this now".
function drawGoldTick(ctx, cx, cy, r) {
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, '#ffe07a');
  grad.addColorStop(1, '#f0b419');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = '#7a5200';
  ctx.lineWidth = r * 0.36;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, cy);
  ctx.lineTo(cx - r * 0.12, cy + r * 0.36);
  ctx.lineTo(cx + r * 0.48, cy - r * 0.38);
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
    // Once the fill is gold the gold tick would vanish into it, so the tick
    // rides the other way, to white — it stays the brightest thing on the line.
    ctx.fillStyle = mix('#f6d33c', '#ffffff', k);
    ctx.fillRect(Math.min(W - 3, W * frac) - 1, 0, 3, 3);
  }

  // Cells and coins, one pill, top-left. No shield row: the glass orb around
  // the hero already shows both that a shield is held and how many, one ring
  // per stack. No plug tally either — three framed squares of "what you might
  // still win" is stage-select business, and mid-run it competed with the two
  // readouts you actually steer by. Landing a plug now announces itself.
  drawStatusPill(ctx, run);
  drawGoalToast(ctx, run);

  // The live gauges, bottom-left: the ability ring with its name beside it,
  // and any running power-up timers stacked above with theirs.
  //
  // They are down here because the cooldown is the only readout in the game
  // with sub-second value: "can I fire yet" is asked mid-dodge, continuously,
  // while cells, coins and goals are between-hazard glances. The eye lives at
  // the player (x=64, on the ground), so the most-consulted gauge belongs in
  // the nearest corner, not the furthest one. The goals, which are read once,
  // took the trip to the far corner instead.
  //
  // The stack grows UP from the ability rather than down: the ability sits in
  // the band below the ground line and there is no screen left underneath it.
  // Power-ups are the transient half of this group, so they are the half that
  // moves.
  const GAUGE_X = 14;
  // Shares the keyboard hint line's midline (hy = H - 17, 12 tall) so the two
  // bottom-edge readouts sit level across the screen instead of each hanging at
  // its own height — and it puts the ability panel directly opposite the hint
  // that names the same button.
  const GAUGE_CY = H - 11;
  // Each entry: a donut, a name panel hung off its right at the same midline —
  // the ring is the gauge, the panel is its label, the pairing the top-right
  // corner used before this moved. Returns the panel's right edge, so a row of
  // them can be laid end to end. `show` false measures without drawing, which
  // is how a blinking entry holds its slot instead of collapsing the row.
  const gauge = (cx, cy, r, thick, frac, color, label, ink, scale, halo, show = true) => {
    const LP = 5, LH = scale < 1 ? 12 : 14;
    const lx = cx + r + 5;
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
    // Touch play skips the ability ring — the PWR button shows its own recharge
    // and would be reporting the same thing twice.
    const hero = HERO_BY_ID[run.relay.current];
    const cd = run.player.abilityCd;
    const charged = !!run.player.relayCharge;
    // A banked relay charge fires through the cooldown, so it reads as ready.
    const ready = cd <= 0 || charged;
    const frac = charged || cd <= 0 ? 1 : Math.max(0, Math.min(1, 1 - cd / hero.ability.cooldown));
    // Recharging is grey, not red. Red is MAGNET's colour (#e04848), and with
    // the power-up timers sitting directly above this ring, red-above-red read
    // as one pair of related things rather than "my power is down" above
    // "magnet is running". Grey says the right thing anyway: not a warning,
    // just not yet.
    gauge(
      GAUGE_X, GAUGE_CY, 6, 3.2, frac,
      charged ? '#f6d33c' : ready ? '#48c848' : '#7a7a88',
      hero.ability.label,
      charged ? '#f6d33c' : ready ? '#48e0c8' : '#8a8a98', 1,
      // a soft pulse marks the moment it comes back up; charged pulses gold,
      // faster and wider, because it is worth interrupting the player for
      ready && {
        alpha: charged ? 0.45 + 0.4 * Math.sin(run.tRun * 8) : 0.3 + 0.3 * Math.sin(run.tRun * 4),
        color: charged ? '#f6d33c' : '#a8f0a8',
        width: charged ? 1.6 : 1,
        r: charged ? 9 : 7.5,
      },
    );
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
    const def = POWER_DEFS[id];
    const blink = a.t < 1.5 && Math.floor(a.t * 6) % 2 === 0;
    const over = a.level > run.powerups.levelOf(id);
    // Blinking measures but does not draw, so the entry keeps its slot and the
    // rest of the row does not shuffle sideways twice a second.
    const right = gauge(px, SHELF_CY, 5, 2.7, a.t / a.t0, def.color,
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
  const objective = (tag, tagColor, text, ink, y, scale, fold = 0) => {
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
  const fold = 1 - smoothstep(Math.min(1, Math.max(0, run.bonusT ?? 0) / BONUS_FOLD));
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
        done ? '#74c947' : 'rgba(255,255,255,0.72)', OBJ_Y2, 0.85, fold);
    } else if (run.challenge) {
      // Folded, this one keeps the verdict rather than the description: a missed
      // challenge is a tombstone, and the words that matter are the last three.
      objective('BONUS', 'rgba(255,255,255,0.3)',
        [`${fitRight(run.challenge.desc, textWidth(' - NOT THIS TIME', 0.85))} - `, 'NOT THIS TIME'],
        'rgba(255,255,255,0.35)', OBJ_Y2, 0.85, fold);
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
  if (!Input.usingTouch && run.hintT > 0) {
    const hero = HERO_BY_ID[run.relay.current];
    const hints = [['SPC', 'JUMP'], ['DN', 'DUCK'], ['RT/D', hero.ability.label], ['P', 'PAUSE']];
    const S = 0.85, HP = 6, HH = 12;
    const inner = keyLegendWidth(hints, S);
    const hx = W - 8 - (inner + HP * 2), hy = H - 17;
    ctx.save();
    ctx.globalAlpha = Math.min(1, run.hintT / HINT_FADE);
    drawPanel(ctx, hx, hy, inner + HP * 2, HH, 4, undefined, PANEL);
    drawKeyLegend(ctx, hints, hx + HP, textY(hy + HH / 2, S), { scale: S });
    ctx.restore();
  }

  // The touch controls: JUMP, PWR, PAUSE. One painter for all three
  // (drawRoundButton) — the whole point of the set is that they are the same
  // object in three places, and three call sites drawing "the same" disc is how
  // that stops being true. Only PWR carries state, and only it deviates: a
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
  if (b.id !== 'ability') return { frac: null, fill: 'rgba(11,11,20,0.22)', ink: '#48e0c8' };
  const charged = run.player.relayCharge;
  const cd = charged ? 0 : run.player.abilityCd;
  const maxCd = HERO_BY_ID[run.relay.current].ability.cooldown;
  return {
    // Full reads as "ready" — not empty. It drains to 0 the instant you fire
    // it, then rises back to full as the cooldown counts down, and STAYS full
    // once ready (drawRoundButton no longer treats frac===1 as "nothing to
    // draw"). The old empty-when-ready/full-right-before-ready-again cycle
    // had the meter and the mental model running backwards from each other.
    frac: cd > 0 ? Math.max(0, Math.min(1, 1 - cd / maxCd)) : 1,
    // Charged is the one state allowed to raise its voice, and with the
    // outline gone the fill is the only place left to say it: a gold wash
    // under gold ink, against the same near-invisible slate the others wear.
    fill: charged ? 'rgba(246,211,60,0.2)' : 'rgba(11,11,20,0.22)',
    ink: charged ? '#f6d33c' : '#48e0c8',
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

// Speech plates lay out on a taller row than the popup cards do — the bubble is
// read standing still, the barks are read in motion.
const SPEECH_ROW = 11;

// `opts.light` swaps the card to a pale, opaque plate with dark ink.
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
  const plate = light ? '#ece9f6' : undefined;
  const plateOpts = light ? { border: 'rgba(26,16,40,0.4)', shadow: true } : null;
  const panel = (px, py, pw, ph) => (plate
    ? drawPanel(ctx, px, py, pw, ph, 4, plate, plateOpts)
    : drawPanel(ctx, px, py, pw, ph, 3));
  const y = 46;
  // A null who is the game itself talking (tutorials, station notes): a plain
  // centered plate, no portrait.
  //
  // The bubble sits high on purpose — it belongs to a character standing at the
  // bottom of the frame — so this y is an anchor, not a centring failure. What
  // is centred here is the ink inside the plate.
  if (!isEgg && !hero) {
    // Three lines, not two: Eggshell's longest grievances need the room.
    const lines = wrapText(speech.text, W - 56, 1, 3);
    const tw = Math.max(...lines.map((line) => textWidth(line)));
    panel(W / 2 - tw / 2 - 6, y - 4, tw + 12, 8 + lines.length * SPEECH_ROW);
    // Through textY, like every other panel in this file. The plate's 4 units
    // of top padding put the first ROW at y; the ink then has to be centred on
    // that row rather than having its 12-unit glyph box hung off the top of it,
    // which sat every tutorial line high on its own plate.
    lines.forEach((line, i) =>
      rawDrawTextCentered(ctx, line, W / 2, textY(y + i * SPEECH_ROW + SPEECH_ROW / 2), ink));
    return;
  }
  // Named speakers: one block — portrait on the left, name as a header over
  // the words. Face, name, and text read as a single card per speaker.
  const name = isEgg ? 'EGGSHELL' : hero.short;
  const FACE_W = 20, FACE_H = 15, PAD = 7, GAP = 6;
  const lines = wrapText(speech.text, W - 100, 1, 3);
  const tw = Math.max(textWidth(name), ...lines.map((line) => textWidth(line)));
  const textH = (lines.length + 1) * 11; // name row + body rows
  const h = Math.max(FACE_H + 6, textH + 8);
  const w = PAD + FACE_W + GAP + tw + PAD;
  const x = Math.round(W / 2 - w / 2);
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
  const ty = y - 4 + Math.round((h - textH) / 2) + 3;
  rawDrawText(ctx, name, tx, ty, nameInk);
  lines.forEach((line, i) => rawDrawText(ctx, line, tx, ty + 11 + i * 11, ink));
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
export function drawFloatie(ctx, f, { heroX, mirror = false, alpha = 1 } = {}) {
  // Impact words (PEW, BOY.) center over the hero's head; anything longer
  // shares one left edge at the hero column and rags rightward into the
  // direction of travel — centering long lines on a hero this near the screen
  // edge just shoved each one to its own x. In mirror mode the shared edge is
  // on the right and text rags leftward.
  const floatX = mirror ? W - heroX - 6 : heroX + 6;
  const edgeX = mirror ? W - heroX : heroX;
  const short = f.text.length <= 5;
  const lines = wrapText(f.text, short ? W - 32 : W - heroX - 8, 1, 2);
  const topY = Math.max(38, Math.min(H - 48 - lines.length * LINE_H, Math.round(f.y)));
  // Each floatie rides its own HUD panel — the bare text plate washed out over
  // light packs.
  const tw = Math.max(...lines.map((line) => textWidth(line)));
  const PADX = 5;
  const bx = short ? floatX - tw / 2 - PADX : (mirror ? edgeX - tw - PADX : edgeX - PADX);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawPanel(ctx, Math.round(bx), topY - 4, tw + PADX * 2, lines.length * LINE_H + 8, 4,
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
