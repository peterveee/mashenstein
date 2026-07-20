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
import { RELAY_MODE } from '../data/flags.js';
import { POWER_DEFS } from './powerups.js';
import { Input } from '../engine/input.js';

// The one chrome. Passed to every drawPanel call in the HUD.
const PANEL = { border: UI_PANEL_BORDER, shadow: true };
// The goal toast's own edge: gold, because it is the only panel that appears
// to announce something rather than to report state.
const PANEL_GOLD = { border: 'rgba(246,201,69,0.3)', shadow: true };

// Every string this module draws now sits on a panel, so none of them carry a
// plate: the panel is the backing, and a plate inside it prints a second,
// darker box around the words. (The plate itself still earns its keep for text
// drawn straight onto the scene — the floaties in run.js — where contrast
// depends on whatever is scrolling past and pale ink washes out over the light
// packs. That is why UI_PLATE exists; it just no longer belongs here.)
//
// Glyphs occupy y-1*scale .. y+11*scale but the ink sits well inside that box,
// so centring on a panel means offsetting from the midline by this rather than
// by half the box. Every panel in this file places its text through it.
function textY(cy, scale = 1) { return cy - 4.5 * scale; }

// The status pill: cells on the left, coins on the right, one panel.
//
// Coins are the only value here that changes length as it climbs (0 -> 10 ->
// 100), so they sit on the right edge and the pill grows rightward. Put them
// left and every gain would shove the cells sideways — the one readout you
// check by shape, in motion, at a glance, would never be in the same place
// twice.
const PILL_X = 8, PILL_Y = 3, PILL_H = 18, PILL_CY = PILL_Y + PILL_H / 2;
const CELL_W = 10, CELL_H = 6.8, CELL_GAP = 2;
const COIN_D = 12, PILL_PAD = 6, PILL_SPLIT = 5;

function drawStatusPill(ctx, run) {
  const cells = run.oneHit ? 0 : run.maxBattery();
  const cellsW = cells ? cells * CELL_W + (cells - 1) * CELL_GAP : 0;
  const count = `${run.coins}`;
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
function drawGoalToast(ctx, run) {
  const g = run.goalToasts && run.goalToasts[0];
  if (!g) return;
  // Fade in over the first quarter second and back out over the last, riding a
  // few units of vertical travel so it arrives rather than blinks on.
  const age = g.t0 - g.t;
  const k = Math.max(0, Math.min(1, Math.min(age, g.t) / 0.25));
  const e = k * k * (3 - 2 * k);
  const TICK = 9, PAD = 6, GAP = 4, TH = 15;
  const w = PAD * 2 + TICK + GAP + textWidth(g.text, 1, 'bold');
  const x = Math.round(W / 2 - w / 2), y = 24 + (1 - e) * 4;
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
  // The top row's shared midline: the status pill, the hero badge, the ability
  // ring and its label all centre on it, so the whole strip sits level instead
  // of each piece hanging at its own height.
  const HERO_CY = 12;
  const leftColumnMax = 248;
  const fitLeft = (text) => {
    let out = text;
    while (out.length > 3 && textWidth(out) > leftColumnMax) out = out.slice(0, -1);
    return out === text ? out : out.slice(0, -2) + '..';
  };
  // Slim world progress line across the top: teal fills toward the right edge,
  // the yellow tick is you. Reaching the end is the goal, so the end needs no
  // icon of its own — the finish line is drawn in-world as you approach it.
  if (!run.overtime && run.stage) {
    const frac = Math.min(1, run.distance / run.totalDist);
    ctx.fillStyle = '#10141c';
    ctx.fillRect(0, 0, W, 3);
    ctx.fillStyle = '#48e0c8';
    ctx.fillRect(0, 0, W * frac, 3);
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(Math.min(W - 3, W * frac) - 1, 0, 3, 3);
  }

  // Cells and coins, one pill, top-left. No shield row: the glass orb around
  // the hero already shows both that a shield is held and how many, one ring
  // per stack. No plug tally either — three framed squares of "what you might
  // still win" is stage-select business, and mid-run it competed with the two
  // readouts you actually steer by. Landing a plug now announces itself.
  drawStatusPill(ctx, run);
  drawGoalToast(ctx, run);

  // Ability recharge ring, top-right beside the skill name. A donut sweeping
  // shut from red to green: one glanceable token instead of a bar that ate the
  // whole corner. Touch play skips it — that corner holds pause/mute, and the
  // PWR button shows its own recharge.
  const RING_X = W - 12;
  if (!Input.usingTouch) {
    const hero = HERO_BY_ID[run.relay.current];
    const cd = run.player.abilityCd;
    const charged = !!run.player.relayCharge;
    // A banked relay charge fires through the cooldown, so it reads as ready.
    const ready = cd <= 0 || charged;
    const frac = charged || cd <= 0 ? 1 : Math.max(0, Math.min(1, 1 - cd / hero.ability.cooldown));
    drawRingGauge(ctx, RING_X, 12, 6, 3.2, frac, charged ? '#f6d33c' : ready ? '#48c848' : '#e04848');
    // a soft pulse marks the moment it comes back up; charged pulses gold,
    // faster and wider, because it is worth interrupting the player for
    if (ready) {
      ctx.save();
      ctx.globalAlpha = charged
        ? 0.45 + 0.4 * Math.sin(run.tRun * 8)
        : 0.3 + 0.3 * Math.sin(run.tRun * 4);
      ctx.strokeStyle = charged ? '#f6d33c' : '#a8f0a8';
      ctx.lineWidth = charged ? 1.6 : 1;
      ctx.beginPath();
      ctx.arc(RING_X, 12, charged ? 9 : 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // The ability name rides its own panel, hung off the ring and sharing the
    // badge's midline — the ring is the gauge, this is its label, and the two
    // read as one instrument rather than a donut with a caption floating near
    // it. Right-anchored, so a long ability name grows leftward into empty sky
    // instead of pushing the ring off the corner.
    const label = hero.ability.label;
    const LP = 5, LH = 14;
    const lw = LP * 2 + textWidth(label, 1, 'bold');
    const lx = RING_X - 11 - lw;
    drawPanel(ctx, lx, HERO_CY - LH / 2, lw, LH, 4, undefined, PANEL);
    rawDrawText(ctx, label, lx + LP, textY(HERO_CY), charged ? '#f6d33c' : ready ? '#48e0c8' : '#8a8a98', 1, 'bold');
  }

  // Power-up timers stack under the ability ring as smaller donuts in each
  // power's own colour, draining as they expire. The last second and a half
  // blinks, the same warning the old bars gave.
  let py = 26;
  for (const [id, a] of Object.entries(run.powerups.active)) {
    const def = POWER_DEFS[id];
    const blink = a.t < 1.5 && Math.floor(a.t * 6) % 2 === 0;
    if (!blink) {
      drawRingGauge(ctx, RING_X, py, 5, 2.7, a.t / a.t0, def.color);
      // Same panel-and-ring pairing as the ability label above, a size down —
      // these are the same kind of thing, so they are the same shape.
      const label = `${def.name}${a.level > run.powerups.levelOf(id) ? '+' : ''}`;
      const PP = 4, PH = 12;
      const pw = PP * 2 + textWidth(label, 0.85, 'bold');
      const pxL = RING_X - 9 - pw;
      drawPanel(ctx, pxL, py - PH / 2, pw, PH, 4, undefined, PANEL);
      rawDrawText(ctx, label, pxL + PP, textY(py, 0.85), def.color, 0.85, 'bold');
    }
    py += 14;
  }

  // Relay: current hero. In 'charge' mode the ability ring is the only charge
  // readout — it goes gold when a charge is banked — so there are no pips here.
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
  // The legacy 'blast' mode has no other readout for its automatic screen
  // clear, so it keeps the pips it was designed around, now under the name.
  if (RELAY_MODE === 'blast') {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - 9 + i * 9, HERO_CY + 14, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = i < run.relay.pips ? '#f6d33c' : '#20242c';
      ctx.fill();
      ctx.strokeStyle = '#5a5a68';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  // What you are here to do, bottom-left. Two panels, deliberately unequal:
  // the mission is the run's win condition and the challenge is an optional
  // extra, and as two identical grey lines they read as a list of two equal
  // chores. So the mission gets a GOAL tab and a full-size panel in white, and
  // the challenge sits under it smaller, dimmer, tagged BONUS — the hierarchy
  // is in the chrome, not in wording the player has to stop and parse.
  const OBJ_X = 8;
  const objective = (tag, tagColor, text, ink, y, scale) => {
    const TP = 5, GAP = 5;
    const h = scale < 1 ? 12 : 14;
    const cy = y + h / 2;
    const tw = textWidth(tag, 0.8, 'bold');
    const bodyW = textWidth(text, scale);
    drawPanel(ctx, OBJ_X, y, TP * 2 + tw + GAP + bodyW, h, 4, undefined, PANEL);
    rawDrawText(ctx, tag, OBJ_X + TP, textY(cy, 0.8), tagColor, 0.8, 'bold');
    rawDrawText(ctx, text, OBJ_X + TP + tw + GAP, textY(cy, scale), ink, scale);
  };
  if (!run.overtime && run.stage) {
    const m = run.mission;
    let prog = '';
    if (m.n) prog = ` ${m.count ?? 0}/${m.n}`;
    if (m.type === 'chase' && run.copter) prog = ` ${run.copter.caught}/${m.n}`;
    if (m.type === 'combo') prog = ` BEST ${run.relay.bestCombo}/${m.n}`;
    objective('GOAL', '#74c947', fitLeft(`${m.type.toUpperCase()}${prog}`), '#ffffff', H - 33, 1);
    if (run.challenge && !run.challenge.failed) {
      const c = run.challenge;
      const done = c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n;
      const tail = done ? 'OK' : c.type === 'noDamage' ? '' : `${Math.min(c.count, c.n)}/${c.n}`;
      objective('BONUS', done ? '#74c947' : 'rgba(255,255,255,0.5)', fitLeft(`${c.desc} ${tail}`),
        done ? '#74c947' : 'rgba(255,255,255,0.72)', H - 17, 0.85);
    } else if (run.challenge) {
      objective('BONUS', 'rgba(255,255,255,0.3)', fitLeft(`${run.challenge.desc} - NOT THIS TIME`),
        'rgba(255,255,255,0.35)', H - 17, 0.85);
    }
  } else {
    objective('GOAL', '#b888f0', 'OVERTIME', '#ffffff', H - 33, 1);
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

export function drawSpeech(ctx, speech) {
  const lines = wrapText(speech.text, W - 56, 1, 2);
  const tw = Math.max(...lines.map((line) => textWidth(line)));
  const x = W / 2 - tw / 2, y = 46;
  const h = 8 + lines.length * 11;
  // Rounded like the name badge above it (same radius drawText plates use), so
  // every box the HUD puts on screen shares one silhouette. Eggshell talks in
  // pink-red ink, allies in the same pale teal as the badge.
  const isEgg = speech.who === 'eggshell';
  const hero = !isEgg && speech.who ? HERO_BY_ID[speech.who] : null;
  const ink = isEgg ? '#f0a0a0' : '#d0f0e8';
  drawPanel(ctx, x - 6, y - 4, tw + 12, h, 3);
  // Named speakers get a face-and-name tag hung off the bubble's top-left —
  // the badge idiom again, so "who is talking" reads the same way everywhere.
  // A null who is the game itself talking (tutorials, station notes): no tag.
  if (isEgg || hero) {
    const TAG_H = 14, FACE_W = 12, FACE_H = 9, PAD_L = 4, GAP = 4, PAD_R = 7;
    const name = isEgg ? 'EGGSHELL' : hero.short;
    const tagW = PAD_L + FACE_W + GAP + textWidth(name) + PAD_R;
    const tagX = x - 6, tagCy = y - 4 - TAG_H / 2 - 1;
    drawPanel(ctx, tagX, tagCy - TAG_H / 2, tagW, TAG_H, 3);
    // Eggshell has no toon rig — his prop painter plays the portrait.
    if (isEgg) {
      drawProp(ctx, 'eggshell', tagX + PAD_L, tagCy - FACE_H / 2, FACE_W, FACE_H);
    } else {
      const face = toonFaceSprite(speech.who, FACE_W, FACE_H);
      if (face) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(face, tagX + PAD_L, tagCy - FACE_H / 2, FACE_W, FACE_H);
        ctx.imageSmoothingEnabled = false;
      }
    }
    rawDrawText(ctx, name, tagX + PAD_L + FACE_W + GAP, tagCy - 4.5, ink);
  }
  lines.forEach((line, i) => rawDrawTextCentered(ctx, line, W / 2, y + i * 11, ink));
}
