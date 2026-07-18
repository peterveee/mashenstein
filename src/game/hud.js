// HUD: score, coins, battery cells, power-up timers, relay meter + team faces,
// mission progress, world progress bar, speech bubbles.
import { W, H } from '../engine/renderer.js';
import { drawText, drawTextCentered, textWidth, getSprite } from '../engine/sprites.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { POWER_DEFS } from './powerups.js';
import { Input } from '../engine/input.js';

export function drawHud(ctx, run) {
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

  // Score + coins.
  drawText(ctx, `${Math.floor(run.score)}`, 6, 12, '#fff', 2);
  const cs = getSprite('coin');
  if (cs) ctx.drawImage(cs, 6, 30);
  drawText(ctx, `${run.coins}`, 18, 30, '#f6d33c');

  // Battery cells (campaign) — sincere and always visible.
  if (!run.oneHit) {
    for (let i = 0; i < run.maxBattery(); i++) {
      ctx.fillStyle = i < run.battery ? '#48c848' : '#2a3a2a';
      ctx.fillRect(6 + i * 8, 44, 6, 8);
      ctx.strokeStyle = '#1a241a';
      ctx.strokeRect(6.5 + i * 8, 44.5, 6, 8);
    }
  } else {
    drawText(ctx, 'ONE HIT. GOOD LUCK.', 6, 44, '#e04848');
  }
  // Shields.
  for (let i = 0; i < run.powerups.shieldStack; i++) {
    const s = getSprite('capShield');
    if (s) ctx.drawImage(s, 6 + i * 10, 56);
  }

  // Power-up timers, top-right under buttons.
  let py = 20;
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

  // Relay: team faces + meter + exhaustion.
  const teamX = W / 2 - run.team.length * 12;
  run.team.forEach((id, i) => {
    const cur = id === run.relay.current;
    const ex = run.relay.exhaust[id] > 0;
    ctx.fillStyle = cur ? '#48e0c8' : ex ? '#3a3a48' : '#8a8a98';
    ctx.fillRect(teamX + i * 24, 11, 20, 14);
    const spr = getSprite(`hero_${id}_face`);
    if (spr) { ctx.globalAlpha = ex && !cur ? 0.4 : 1; ctx.drawImage(spr, teamX + i * 24 + 4, 12); ctx.globalAlpha = 1; }
    else drawText(ctx, HERO_BY_ID[id].short[0], teamX + i * 24 + 7, 15, cur ? '#0b0b14' : '#fff');
  });
  // Meter bar.
  ctx.fillStyle = '#20242c';
  ctx.fillRect(teamX, 27, run.team.length * 24 - 4, 4);
  ctx.fillStyle = run.relay.meter >= 1 ? '#f6d33c' : '#48e0c8';
  ctx.fillRect(teamX, 27, (run.team.length * 24 - 4) * Math.min(1, run.relay.meter), 4);
  if (run.relay.meter >= 1) drawTextCentered(ctx, Input.usingTouch ? 'TAG BTN: TEAM MOVE' : 'C: TEAM MOVE', W / 2, 34, '#f6d33c');
  if (run.relay.combo > 1) drawTextCentered(ctx, `COMBO x${run.relay.combo}`, W / 2, 43, '#c8e0ff');

  // Mission line + progress.
  if (!run.overtime && run.stage) {
    const m = run.mission;
    let prog = '';
    if (m.n) prog = ` ${m.count ?? 0}/${m.n}`;
    if (m.type === 'chase' && run.copter) prog = ` ${run.copter.caught}/${m.n}`;
    if (m.type === 'combo') prog = ` BEST ${run.relay.bestCombo}/${m.n}`;
    drawText(ctx, `${m.type.toUpperCase()}${prog}`, 6, H - 24, '#c8e0ff');
    if (run.challenge && !run.challenge.failed) {
      const c = run.challenge;
      const done = c.type === 'noDamage' ? run.damageTaken === 0 : c.count >= c.n;
      drawText(ctx, `${c.desc} ${done ? 'OK' : c.type === 'noDamage' ? '' : `${Math.min(c.count, c.n)}/${c.n}`}`, 6, H - 14, done ? '#48c848' : '#8a8a98');
    } else if (run.challenge) {
      drawText(ctx, `${run.challenge.desc} - NOT THIS TIME`, 6, H - 14, '#5a5a68');
    }
    if (run.applianceGot) drawText(ctx, 'TOASTER: YES', W - 78, H - 14, '#f6d33c');
  } else {
    drawText(ctx, 'OVERTIME', 6, H - 14, '#8858c8');
  }

  // Touch buttons.
  for (const b of Input.buttons) {
    if (b.id === 'pause' || b.id === 'mute') {
      drawText(ctx, b.label, b.x + 4, b.y + 3, '#8a8a98');
    } else {
      ctx.fillStyle = 'rgba(72,224,200,0.15)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(72,224,200,0.5)';
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
      drawTextCentered(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 - 3, '#48e0c8');
    }
  }
}

export function drawSpeech(ctx, speech) {
  const text = speech.text;
  const tw = Math.min(textWidth(text), W - 40);
  const x = W / 2 - tw / 2, y = 46;
  ctx.fillStyle = 'rgba(10,10,20,0.85)';
  ctx.fillRect(x - 6, y - 4, tw + 12, 15);
  ctx.strokeStyle = speech.who === 'eggshell' ? '#c83030' : '#48e0c8';
  ctx.strokeRect(x - 5.5, y - 3.5, tw + 11, 14);
  drawText(ctx, text, x, y, speech.who === 'eggshell' ? '#f0a0a0' : '#d0f0e8');
}
