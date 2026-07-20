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
  textWidth, wrapText, drawPanel, platePath, UI_PANEL_BORDER,
} from '../engine/sprites.js';
import { toonFaceSprite } from '../sprites/toons.js';
import { drawProp } from '../sprites/props.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { POWER_DEFS } from './powerups.js';
import { Input } from '../engine/input.js';
import { formatCoins } from './progress.js';

// The one chrome. Passed to every drawPanel call in the HUD.
const PANEL = { border: UI_PANEL_BORDER, shadow: true };
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
// so centring on a panel means offsetting from the midline by this rather than
// by half the box. Every panel in this file places its text through it.
function textY(cy, scale = 1) { return cy - 4.5 * scale; }

// Blend two '#rrggbb' literals. Only the progress bar needs this — it is the
// one piece of HUD chrome that changes colour continuously rather than
// switching between authored states.
function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh) => Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

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
  drawCoinGlitter(ctx, x, PILL_CY - COIN_D / 2, COIN_D, run.tRun);
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

// A twinkle riding the HUD coin. Two four-point stars a half-cycle apart, each
// lit for only part of its swing, so the icon catches the light now and then
// instead of strobing — a constant sparkle next to a live score reads as an
// alert.
function drawCoinGlitter(ctx, x, y, size, t) {
  const spots = [[0.72, 0.24, 0], [0.26, 0.7, 0.55]];
  ctx.save();
  ctx.fillStyle = '#fffce0';
  for (const [fx, fy, phase] of spots) {
    const p = (((t || 0) / 1.9 + phase) % 1 + 1) % 1;
    if (p > 0.4) continue;
    const k = Math.sin((p / 0.4) * Math.PI);
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
  // brief third is possible off a breaker bonus or a ?-crate; past that the row
  // would reach the hints, which the sim says does not happen.
  const SHELF_CY = GAUGE_CY - 15;
  let px = GAUGE_X;
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
  rawDrawText(ctx, name, badgeX + PAD_L + FACE_W + GAP, HERO_CY - 4.5, '#d0f0e8');

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
  // longer instead of pushing off the screen edge.
  const OBJ_R = W - 8;
  const objective = (tag, tagColor, text, ink, y, scale) => {
    const TP = 5, GAP = 5;
    const h = scale < 1 ? 12 : 14;
    const cy = y + h / 2;
    const tw = textWidth(tag, 0.8, 'bold');
    const w = TP * 2 + tw + GAP + textWidth(text, scale);
    const x = OBJ_R - w;
    drawPanel(ctx, x, y, w, h, 4, undefined, PANEL);
    rawDrawText(ctx, tag, x + TP, textY(cy, 0.8), tagColor, 0.8, 'bold');
    rawDrawText(ctx, text, x + TP + tw + GAP, textY(cy, scale), ink, scale);
  };
  // Centred on HERO_CY, the midline the status pill and the hero badge already
  // share, so all three top-row panels sit level instead of GOAL riding high.
  const OBJ_Y = HERO_CY - 7;   // 14-tall panel
  // The BONUS line hangs below with a real gap, not flush: the two panels are a
  // hierarchy, not one block, and 4px of sky says so.
  const OBJ_Y2 = OBJ_Y + 18;
  // Long challenge descriptions have to fit beside the badge, not through it.
  const fitRight = (text) => {
    const max = W / 2 - 44;
    let out = text;
    while (out.length > 3 && textWidth(out) > max) out = out.slice(0, -1);
    return out === text ? out : out.slice(0, -2) + '..';
  };
  if (!run.overtime && run.stage) {
    const m = run.mission;
    let prog = '';
    if (m.n) prog = ` ${m.count ?? 0}/${m.n}`;
    if (m.type === 'chase' && run.copter) prog = ` ${run.copter.caught}/${m.n}`;
    if (m.type === 'combo') prog = ` BEST ${run.relay.bestCombo}/${m.n}`;
    objective('GOAL', '#74c947', fitRight(`${m.type.toUpperCase()}${prog}`), '#ffffff', OBJ_Y, 1);
    if (run.challenge && !run.challenge.failed) {
      const c = run.challenge;
      const done = c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n;
      const tail = done ? 'OK' : c.type === 'noDamage' ? '' : `${Math.min(c.count, c.n)}/${c.n}`;
      objective('BONUS', done ? '#74c947' : 'rgba(255,255,255,0.5)', fitRight(`${c.desc} ${tail}`),
        done ? '#74c947' : 'rgba(255,255,255,0.72)', OBJ_Y2, 0.85);
    } else if (run.challenge) {
      objective('BONUS', 'rgba(255,255,255,0.3)', fitRight(`${run.challenge.desc} - NOT THIS TIME`),
        'rgba(255,255,255,0.35)', OBJ_Y2, 0.85);
    }
  } else {
    objective('GOAL', '#b888f0', 'OVERTIME', '#ffffff', OBJ_Y, 1);
  }

  // Keyboard controls hint; the power status lives in the top-right gauge.
  // Keys are called out in the same green the cells use and the actions stay
  // quiet, so the line reads as a legend rather than as a sentence — it is
  // scanned for one key, never read through.
  if (!Input.usingTouch) {
    const hero = HERO_BY_ID[run.relay.current];
    const hints = [['SPC', 'JUMP'], ['DN', 'DUCK'], ['RT/D', hero.ability.label], ['P', 'PAUSE']];
    const S = 0.85, KEY_GAP = 2.5, PAIR_GAP = 7, HP = 6, HH = 12;
    const parts = hints.map(([k, a]) => ({
      k, a, w: textWidth(k, S, 'bold') + KEY_GAP + textWidth(a, S),
    }));
    const inner = parts.reduce((n, p) => n + p.w, 0) + PAIR_GAP * (parts.length - 1);
    const hx = W - 8 - (inner + HP * 2), hy = H - 17;
    drawPanel(ctx, hx, hy, inner + HP * 2, HH, 4, undefined, PANEL);
    let tx = hx + HP;
    for (const p of parts) {
      rawDrawText(ctx, p.k, tx, textY(hy + HH / 2, S), '#74c947', S, 'bold');
      tx += textWidth(p.k, S, 'bold') + KEY_GAP;
      rawDrawText(ctx, p.a, tx, textY(hy + HH / 2, S), 'rgba(255,255,255,0.6)', S);
      tx += textWidth(p.a, S) + PAIR_GAP;
    }
  }

  // Touch buttons. Rounded and edged like every other panel — square-cornered
  // rects were the last thing on screen still drawn in the old language.
  for (const b of Input.buttons) {
    if (b.id === 'pause' || b.id === 'mute') {
      rawDrawText(ctx, b.label, b.x + 4, b.y + 3, '#8a8a98');
    } else {
      // A banked charge overrides the cooldown fill: the button reads gold and
      // full, because it is usable right now.
      const charged = b.id === 'ability' && run.player.relayCharge;
      const cd = b.id === 'ability' && !charged ? run.player.abilityCd : 0;
      const R = 5;
      ctx.save();
      platePath(ctx, b.x, b.y, b.w, b.h, R);
      ctx.fillStyle = charged ? 'rgba(246,211,60,0.28)' : cd > 0 ? 'rgba(90,90,104,0.2)' : 'rgba(72,224,200,0.15)';
      ctx.fill();
      if (cd > 0) {
        // recharge rises from the bottom of the button — no ticking number
        const maxCd = HERO_BY_ID[run.relay.current].ability.cooldown;
        const fh = Math.round(b.h * Math.max(0, Math.min(1, 1 - cd / maxCd)));
        ctx.clip();
        ctx.fillStyle = 'rgba(72,224,200,0.28)';
        ctx.fillRect(b.x, b.y + b.h - fh, b.w, fh);
      }
      ctx.restore();
      ctx.save();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = charged ? 'rgba(246,211,60,0.9)' : 'rgba(72,224,200,0.5)';
      platePath(ctx, b.x + 0.4, b.y + 0.4, b.w - 0.8, b.h - 0.8, R);
      ctx.stroke();
      ctx.restore();
      rawDrawTextCentered(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 - 3, charged ? '#f6d33c' : '#48e0c8');
    }
  }
}

// Cast who talk but are not playable, so are absent from HERO_BY_ID. They still
// have a toon rig, so the portrait path works — only the name needs supplying.
const EXTRA_SPEAKERS = { gary: { short: 'GARY' } };

export function drawSpeech(ctx, speech) {
  // Eggshell talks in pink-red ink, allies in the same pale teal as the badge.
  const isEgg = speech.who === 'eggshell';
  const hero = !isEgg && speech.who
    ? (HERO_BY_ID[speech.who] || EXTRA_SPEAKERS[speech.who] || null)
    : null;
  const ink = isEgg ? '#f0a0a0' : '#d0f0e8';
  const y = 46;
  // A null who is the game itself talking (tutorials, station notes): a plain
  // centered plate, no portrait.
  if (!isEgg && !hero) {
    // Three lines, not two: Eggshell's longest grievances need the room.
    const lines = wrapText(speech.text, W - 56, 1, 3);
    const tw = Math.max(...lines.map((line) => textWidth(line)));
    drawPanel(ctx, W / 2 - tw / 2 - 6, y - 4, tw + 12, 8 + lines.length * 11, 3);
    lines.forEach((line, i) => rawDrawTextCentered(ctx, line, W / 2, y + i * 11, ink));
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
  drawPanel(ctx, x, y - 4, w, h, 3);
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
  rawDrawText(ctx, name, tx, ty, '#fff');
  lines.forEach((line, i) => rawDrawText(ctx, line, tx, ty + 11 + i * 11, ink));
}
