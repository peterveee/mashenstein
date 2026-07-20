// HUD: score, coins, battery cells, power-up timers, relay meter + team faces,
// mission progress, world progress bar, speech bubbles.
import { W, H } from '../engine/renderer.js';
import {
  drawText as rawDrawText, drawTextCentered as rawDrawTextCentered,
  textWidth, wrapText, getSprite, platePath, UI_PLATE, UI_PANEL,
} from '../engine/sprites.js';
import { toonFaceSprite } from '../sprites/toons.js';
import { drawProp } from '../sprites/props.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { RELAY_MODE } from '../data/flags.js';
import { POWER_DEFS } from './powerups.js';
import { Input } from '../engine/input.js';
import { drawPlugRow } from './plugs.js';

// Every string in the HUD is drawn straight onto the scene with no plate behind
// it, so its contrast depends on whatever happens to be scrolling past. Over the
// light packs (watercolor, cardboard, doodle — the ones that opt out of bloom)
// the paler colours here, the teal ability labels and the dimmed control hints
// especially, wash out to nearly nothing.
//
// So HUD text carries its own plate rather than each caller opting in: these
// wrappers plate the whole module, and the call sites below stay unchanged.
// Anything drawn over gameplay should go through them. Text that already sits
// on its own backing — the speech bubble, the touch buttons — calls the raw
// functions instead, or it gets a second plate inside the first.
function drawText(ctx, str, x, y, color, scale, style) {
  return rawDrawText(ctx, str, x, y, color, scale, style, UI_PLATE);
}
function drawTextCentered(ctx, str, cx, y, color, scale, style) {
  return rawDrawTextCentered(ctx, str, cx, y, color, scale, style, UI_PLATE);
}

// Plug tally for the stage you are in: which of its three plugs are already
// banked from earlier attempts, and which are on track this run. Same icons as
// the stage select list, so the row means one thing across both screens.
// The mission plug is never "live" — it only lands when you reach the socket.
function drawPlugTally(ctx, run, y) {
  if (run.overtime || !run.stage) return;
  const banked = run.save.slot.campaign.plugs[run.stage.id] || [false, false, false];
  const c = run.challenge;
  const live = [
    false,
    !!(c && !c.failed && (c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n)),
    run.applianceGot,
  ];
  drawPlugRow(ctx, 6, y, banked, live);
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
  const bottomRow1 = H - 25;
  const bottomRow2 = H - 13;
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

  // Left status column: coins, cells, plugs — kept on a cursor rather than
  // fixed rows so a row that stops drawing never leaves a gap behind it. The
  // live score used to head this column; the top progress line covers "how far
  // along am I" during play, and the score still lands on the run summary.
  const COL_X = 6;
  const ROW_GAP = 5;
  let ly = 7;
  drawProp(ctx, 'coin', COL_X, ly, 8, 8);
  drawCoinGlitter(ctx, COL_X, ly, 8, run.tRun);
  drawText(ctx, `${run.coins}`, COL_X + 12, ly, '#f6d33c');
  ly += 8 + ROW_GAP;

  // Battery cells (campaign) — drawn as the pickup itself, so a cell and the
  // thing that refills it are visibly the same object. Spent cells hold their
  // slot at low alpha, the same idiom the unearned plugs use.
  if (!run.oneHit) {
    const prevAlpha = ctx.globalAlpha;
    for (let i = 0; i < run.maxBattery(); i++) {
      ctx.globalAlpha = i < run.battery ? 1 : 0.22;
      drawProp(ctx, 'battery', COL_X + i * 10, ly, 8, 8);
    }
    ctx.globalAlpha = prevAlpha;
  } else {
    drawText(ctx, 'ONE HIT. GOOD LUCK.', COL_X, ly, '#e04848');
  }
  ly += 8 + ROW_GAP;

  // No shield row: the glass orb around the hero already shows both that a
  // shield is held and how many, one ring per stack.

  drawPlugTally(ctx, run, ly);

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
    const label = hero.ability.label;
    drawText(ctx, label, RING_X - 10 - textWidth(label), 9, charged ? '#f6d33c' : ready ? '#48e0c8' : '#8a8a98');
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
      const label = `${def.name}${a.level > run.powerups.levelOf(id) ? '+' : ''}`;
      drawText(ctx, label, RING_X - 9 - textWidth(label), py - 3, def.color);
    }
    py += 14;
  }

  // Relay: current hero. In 'charge' mode the ability ring is the only charge
  // readout — it goes gold when a charge is banked — so there are no pips here.
  // A rounded badge: face on the left, name inside beside it. Same dark fill,
  // teal border and light text as the speech bubble below it, so the two read
  // as one family. Sized to the name and centred on screen, so it grows
  // symmetrically instead of drifting as hero names change width. Face and
  // text are both placed off HERO_CY, unrounded, so they share one midline.
  // Centred on the ability ring (cy 12) and the coin icon beside it, so the
  // whole top row shares one midline instead of the badge hanging below it.
  const HERO_CY = 12;
  const BADGE_H = 14;
  const BADGE_R = 3; // matches the corner radius drawText uses for its plates
  const FACE_W = 12, FACE_H = 9;
  const PAD_L = 4, GAP = 4, PAD_R = 7;
  const name = HERO_BY_ID[run.relay.current].short;
  const badgeW = PAD_L + FACE_W + GAP + textWidth(name) + PAD_R;
  const badgeX = Math.round(W / 2 - badgeW / 2);
  const badgeY = HERO_CY - BADGE_H / 2;
  ctx.save();
  platePath(ctx, badgeX, badgeY, badgeW, BADGE_H, BADGE_R);
  ctx.fillStyle = UI_PANEL;
  ctx.fill();
  // stroke inset by half a pixel so the 1px border lands on the pixel grid
  platePath(ctx, badgeX + 0.5, badgeY + 0.5, badgeW - 1, BADGE_H - 1, BADGE_R);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#48e0c8';
  ctx.stroke();
  ctx.restore();
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

  // Mission line + progress.
  if (!run.overtime && run.stage) {
    const m = run.mission;
    let prog = '';
    if (m.n) prog = ` ${m.count ?? 0}/${m.n}`;
    if (m.type === 'chase' && run.copter) prog = ` ${run.copter.caught}/${m.n}`;
    if (m.type === 'combo') prog = ` BEST ${run.relay.bestCombo}/${m.n}`;
    drawText(ctx, fitLeft(`${m.type.toUpperCase()}${prog}`), 6, bottomRow1, '#c8e0ff');
    if (run.challenge && !run.challenge.failed) {
      const c = run.challenge;
      const done = c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n;
      drawText(ctx, fitLeft(`${c.desc} ${done ? 'OK' : c.type === 'noDamage' ? '' : `${Math.min(c.count, c.n)}/${c.n}`}`), 6, bottomRow2, done ? '#48c848' : '#8a8a98');
    } else if (run.challenge) {
      drawText(ctx, fitLeft(`${run.challenge.desc} - NOT THIS TIME`), 6, bottomRow2, '#5a5a68');
    }
  } else {
    drawText(ctx, 'OVERTIME', 6, bottomRow2, '#8858c8');
  }

  // Keyboard controls hint; the power status lives in the top-right gauge.
  if (!Input.usingTouch) {
    const hero = HERO_BY_ID[run.relay.current];
    const line = `SPC JUMP  DN DUCK  RT/D ${hero.ability.label}  P PAUSE`;
    drawText(ctx, line, W - textWidth(line) - 6, bottomRow2, 'rgba(200,200,216,0.4)');
  }

  // Touch buttons.
  for (const b of Input.buttons) {
    if (b.id === 'pause' || b.id === 'mute') {
      rawDrawText(ctx, b.label, b.x + 4, b.y + 3, '#8a8a98');
    } else {
      // A banked charge overrides the cooldown fill: the button reads gold and
      // full, because it is usable right now.
      const charged = b.id === 'ability' && run.player.relayCharge;
      const cd = b.id === 'ability' && !charged ? run.player.abilityCd : 0;
      ctx.fillStyle = charged ? 'rgba(246,211,60,0.28)' : cd > 0 ? 'rgba(90,90,104,0.2)' : 'rgba(72,224,200,0.15)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (cd > 0) {
        // recharge rises from the bottom of the button — no ticking number
        const maxCd = HERO_BY_ID[run.relay.current].ability.cooldown;
        const fh = Math.round(b.h * Math.max(0, Math.min(1, 1 - cd / maxCd)));
        ctx.fillStyle = 'rgba(72,224,200,0.28)';
        ctx.fillRect(b.x, b.y + b.h - fh, b.w, fh);
      }
      ctx.strokeStyle = charged ? 'rgba(246,211,60,0.9)' : 'rgba(72,224,200,0.5)';
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
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
  // every box the HUD puts on screen shares one silhouette.
  const R = 3;
  ctx.fillStyle = UI_PANEL;
  platePath(ctx, x - 6, y - 4, tw + 12, h, R);
  ctx.fill();
  ctx.strokeStyle = speech.who === 'eggshell' ? '#c83030' : '#48e0c8';
  ctx.lineWidth = 1;
  platePath(ctx, x - 5.5, y - 3.5, tw + 11, h - 1, R);
  ctx.stroke();
  lines.forEach((line, i) => rawDrawTextCentered(ctx, line, W / 2, y + i * 11, speech.who === 'eggshell' ? '#f0a0a0' : '#d0f0e8'));
}
