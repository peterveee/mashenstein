// HUD: score, coins, battery cells, power-up timers, relay meter + team faces,
// mission progress, world progress bar, speech bubbles.
import { W, H } from '../engine/renderer.js';
import { drawText, drawTextCentered, textWidth, wrapText, getSprite } from '../engine/sprites.js';
import { toonFaceSprite } from '../sprites/toons.js';
import { drawProp } from '../sprites/props.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { POWER_DEFS } from './powerups.js';
import { Input } from '../engine/input.js';
import { drawPlugRow } from './plugs.js';

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

export function drawHud(ctx, run) {
  const bottomRow1 = H - 25;
  const bottomRow2 = H - 13;
  const leftColumnMax = 248;
  const fitLeft = (text) => {
    let out = text;
    while (out.length > 3 && textWidth(out) > leftColumnMax) out = out.slice(0, -1);
    return out === text ? out : out.slice(0, -2) + '..';
  };
  // Chunky world progress bar across the top: you are the yellow tick, the
  // socket at the right end is the goal.
  if (!run.overtime && run.stage) {
    const frac = Math.min(1, run.distance / run.totalDist);
    ctx.fillStyle = '#10141c';
    ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = '#1e4a44';
    ctx.fillRect(0, 0, W * frac, 8);
    ctx.fillStyle = '#48e0c8';
    ctx.fillRect(0, 0, W * frac, 3);
    // the runner tick
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(Math.min(W - 4, W * frac) - 1, 0, 4, 8);
    // the socket goal at the right end
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(W - 10, 1, 9, 7);
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(W - 8, 3, 2, 3);
    ctx.fillRect(W - 5, 3, 2, 3);
    ctx.strokeStyle = '#20242c';
    ctx.strokeRect(0.5, 0.5, W - 1, 8);
  }

  // Left status column: score, coins, cells, shields, plugs. A cursor rather
  // than fixed rows — a shieldless run used to leave an empty band between the
  // cells and the plugs, which read as a missing HUD element.
  const COL_X = 6;
  const ROW_GAP = 5;
  let ly = 12;
  drawText(ctx, `${Math.floor(run.score)}`, COL_X, ly, '#fff', 2);
  ly += 16 + ROW_GAP;

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

  // Shields, only when you have any.
  if (run.powerups.shieldStack > 0) {
    for (let i = 0; i < run.powerups.shieldStack; i++) drawProp(ctx, 'capShield', COL_X + i * 10, ly, 8, 8);
    ly += 8 + ROW_GAP;
  }

  drawPlugTally(ctx, run, ly);

  // Ability recharge gauge, top-right. The bar refilling IS the countdown —
  // no ticking number. Same visual idiom as the world progress bar: dark
  // trough, deep fill, bright cap strip; the whole bar lights up when ready.
  // Touch play skips it: that corner holds pause/mute, and the PWR button
  // shows its own recharge.
  if (!Input.usingTouch) {
    const hero = HERO_BY_ID[run.relay.current];
    const cd = run.player.abilityCd;
    const ready = cd <= 0;
    const frac = ready ? 1 : Math.max(0, Math.min(1, 1 - cd / hero.ability.cooldown));
    const gx = W - 66, gw = 60;
    const label = hero.ability.label;
    drawText(ctx, label, W - 6 - textWidth(label), 12, ready ? '#48e0c8' : '#8a8a98');
    const by = 22, bh = 7;
    ctx.fillStyle = '#10141c';
    ctx.fillRect(gx, by, gw, bh);
    const fw = Math.round(gw * frac);
    if (ready) {
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(gx, by, gw, bh);
      // a highlight tick sweeps the full bar so READY reads at a glance
      ctx.fillStyle = '#eafff8';
      ctx.fillRect(gx + ((run.tRun * 45) % gw), by, 2, bh);
    } else if (fw > 0) {
      ctx.fillStyle = '#1e4a44';
      ctx.fillRect(gx, by, fw, bh);
      ctx.fillStyle = '#48e0c8';
      ctx.fillRect(gx, by, fw, 2);
    }
    ctx.strokeStyle = '#20242c';
    ctx.strokeRect(gx + 0.5, by + 0.5, gw - 1, bh - 1);
  }

  // Power-up timers, top-right under the ability gauge.
  let py = 36;
  for (const [id, a] of Object.entries(run.powerups.active)) {
    const def = POWER_DEFS[id];
    const blink = a.t < 1.5 && Math.floor(a.t * 6) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = def.color;
      ctx.fillRect(W - 60, py, Math.max(2, 40 * Math.min(1, a.t / 10)), 5);
      drawText(ctx, `${def.name}${a.level > run.powerups.levelOf(id) ? '+' : ''}`, W - 60, py + 7, def.color);
    }
    py += 18;
  }

  // Relay: current hero + Relay Blast pips (the 3rd switch blasts, automatically).
  const cx0 = W / 2 - 30;
  ctx.fillStyle = '#48e0c8';
  ctx.fillRect(cx0, 11, 20, 14);
  const face = toonFaceSprite(run.relay.current, 12, 9);
  if (face) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(face, cx0 + 4, 13, 12, 9);
    ctx.imageSmoothingEnabled = false;
  }
  drawText(ctx, HERO_BY_ID[run.relay.current].short, cx0 + 24, 13, '#c8e0ff');
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx0 + 27 + i * 9, 26, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = i < run.relay.pips ? '#f6d33c' : '#20242c';
    ctx.fill();
    ctx.strokeStyle = '#5a5a68';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.lineWidth = 1; // the pips' hairline must not leak into later strokes

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
      drawText(ctx, b.label, b.x + 4, b.y + 3, '#8a8a98');
    } else {
      const cd = b.id === 'ability' ? run.player.abilityCd : 0;
      ctx.fillStyle = cd > 0 ? 'rgba(90,90,104,0.2)' : 'rgba(72,224,200,0.15)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (cd > 0) {
        // recharge rises from the bottom of the button — no ticking number
        const maxCd = HERO_BY_ID[run.relay.current].ability.cooldown;
        const fh = Math.round(b.h * Math.max(0, Math.min(1, 1 - cd / maxCd)));
        ctx.fillStyle = 'rgba(72,224,200,0.28)';
        ctx.fillRect(b.x, b.y + b.h - fh, b.w, fh);
      }
      ctx.strokeStyle = 'rgba(72,224,200,0.5)';
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
      drawTextCentered(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 - 3, '#48e0c8');
    }
  }
}

export function drawSpeech(ctx, speech) {
  const lines = wrapText(speech.text, W - 56, 1, 2);
  const tw = Math.max(...lines.map((line) => textWidth(line)));
  const x = W / 2 - tw / 2, y = 46;
  const h = 8 + lines.length * 11;
  ctx.fillStyle = 'rgba(10,10,20,0.85)';
  ctx.fillRect(x - 6, y - 4, tw + 12, h);
  ctx.strokeStyle = speech.who === 'eggshell' ? '#c83030' : '#48e0c8';
  ctx.strokeRect(x - 5.5, y - 3.5, tw + 11, h - 1);
  lines.forEach((line, i) => drawTextCentered(ctx, line, W / 2, y + i * 11, speech.who === 'eggshell' ? '#f0a0a0' : '#d0f0e8'));
}
