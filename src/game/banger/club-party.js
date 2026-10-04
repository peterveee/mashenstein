// Occasional club theatre, driven by the heard beat. No audio or input effects.
import { drawToon } from '../../sprites/toons.js';
import { drawProp } from '../../sprites/props.js';
import { HERO_DANCE_LAB_CANDIDATES, heroDancePose } from '../../dev/hero-dance-candidates.js';

export const PARTY_BEATS = Object.freeze({ spotlight: 8, bubbles: 16, cleaner: 16, vacuum: 16, 'drop-jump': 5 });
/** The two who come for the confetti on the floor: Dolores with her broom, or the game's vacuum cleaner. */
export const CLEANERS = Object.freeze(['cleaner', 'vacuum']);
/**
 * The line the cleaners walk, and the confetti pools along: well in front of the heroes' feet
 * so they block the cast less (Peter, 3 Oct 2026), kept clear of the bottom edge.
 */
export const cleanerFloor = (floorRef, toonH, stageBot, u) => Math.min(stageBot - 7 * u, floorRef + toonH * 0.58);
/** Where a scrap of confetti lies, as a share of the hero's height below their feet. */
export const scrapY = (floorRef, toonH, stageBot, u, dy) => Math.min(stageBot - 3 * u, floorRef + toonH * (0.22 + dy * 0.7));
export const partyAge = (m, beat) => beat - m.beat0;
export const partyAlive = (m, beat) => partyAge(m, beat) >= 0 && partyAge(m, beat) < m.beats;
const clamp = v => Math.max(0, Math.min(1, v));
export function dropMotion(age, jumpAt = 4) {
  if (age < 0 || age >= jumpAt + 1) return { crouch: 0, jump: 0 };
  if (age < jumpAt) return { crouch: clamp(age / Math.max(0.01, jumpAt)), jump: 0 };
  return { crouch: 0, jump: Math.sin((age - jumpAt) * Math.PI) };
}
export function partyHero(m, beat, hero, i, pose) {
  const age = partyAge(m, beat);
  if (!partyAlive(m, beat)) return { pose, lift: 0 };
  if (m.kind === 'drop-jump') {
    const { crouch, jump } = dropMotion(age, m.jumpAt);
    if (jump > 0) return { pose: { ...pose, kind: 'jump', grounded: false, vy: 200 * Math.cos((age - m.jumpAt) * Math.PI),
      dance: { hands: [[0.65, -0.7], [0.65, -0.7]], feet: null }, shift: 0, tilt: 0, bounce: 0 }, lift: jump * 0.4 };
    // A compact crouch with feet fixed: lower the body, bend knees, tuck arms.
    const dip = crouch * 0.1;
    return { pose: { ...pose, kind: 'stand', grounded: true, time: 0,
      dance: { hands: [[0.65, 0.65], [0.65, 0.65]], feet: [[0.12, dip], [-0.12, dip]], ankles: [0, 0], legFlex: 0.5 },
      shift: 0, tilt: 0, bounce: -dip }, lift: 0 };
  }
  if (m.kind === 'spotlight' && m.hero === i) {
    // In the spotlight a hero does their CELEBRATION, not a dance (Peter, 3 Oct 2026): the
    // painter's own victory routine for them, run on the beat.
    return { pose: { kind: 'celebrate', grounded: true, menu: true, time: age * 0.5, phase: (age / 2) % 1,
      shift: 0, bounce: 0, tilt: 0 }, lift: 0 };
  }
  if (m.kind === 'bubbles' && hero === 'b33p') return { pose: { ...pose, headTurn: 22 * Math.sin(age * 0.7) }, lift: 0 };
  if (m.kind === 'bubbles' && hero === 'rusty' && age > 4 && age < 6) return {
    pose: { ...pose, headTurn: -15, dance: { ...pose.dance, hands: [[0.7, -0.65], [0.7, 0.65]] } }, lift: 0 };
  return { pose, lift: 0 };
}

export function drawPartyFront(ctx, m, beat, { width, floorRef, toonH, stageTop, stageBot, u, scraps = null }) {
  const age = partyAge(m, beat), progress = age / m.beats;
  if (!partyAlive(m, beat)) return;
  ctx.save();
  if (m.kind === 'bubbles') {
    const fade = Math.min(clamp(age), clamp((m.beats - age) / 2));
    for (let i = 0; i < 24; i++) {
      const life = (age - i * 0.25) / 10;
      if (life < 0 || life > 1) continue;
      const x = width * ((i * 0.381966 + life * 0.12) % 1) + Math.sin(age * 0.6 + i) * 5 * u;
      const y = floorRef + toonH * 0.15 - life * (floorRef - stageTop + toonH * 0.5);
      const r = (2 + i % 4) * u;
      ctx.globalAlpha = fade * Math.min(1, life * 8, (1 - life) * 6) * 0.65;
      ctx.strokeStyle = ['#a8f4ff', '#ffc2ef', '#e8dfaa'][i % 3];ctx.lineWidth = 0.6 * u;
      ctx.beginPath();ctx.arc(x, y, r, 0, Math.PI * 2);ctx.stroke();
      ctx.strokeStyle = '#ffffff';ctx.lineWidth = 0.8 * u;
      ctx.beginPath();ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.7, 3.5, 4.7);ctx.stroke();
    }
  }
  if (m.kind === 'vacuum') {
    // THE VACUUM CLEANER (the food court's dust devil, Peter 3 Oct 2026) comes for the confetti
    // instead of Dolores, now and then: it crosses the floor scrubbing back and forth, drawing
    // the scraps ahead of it in and leaving the floor clean behind it.
    const h = toonH * 0.78, w = h * 0.9, dir = m.dir;
    const lead = dir > 0 ? -w + progress * (width + w * 2) : width + w - progress * (width + w * 2);
    const x = lead + Math.sin(progress * Math.PI * 9) * w * 0.5;
    const floor = cleanerFloor(floorRef, toonH, stageBot, u);
    const nozzle = lead + dir * w * 0.2;
    const pull = h * 1.4;
    for (const sc of scraps || []) {
      const ahead = (sc.x - nozzle) * dir;
      if (ahead < 0) continue;                      // behind the cleaner: gone
      const k = ahead < pull ? 1 - ahead / pull : 0;
      const sx = sc.x - dir * ahead * k * 0.9;      // drawn in toward the nozzle
      ctx.fillStyle = sc.colour;
      ctx.fillRect(sx, scrapY(floorRef, toonH, stageBot, u, sc.dy) - k * toonH * 0.1, 2 * u * (1 - k * 0.5), u);
    }
    ctx.save();
    ctx.translate(x + w / 2, floor - h / 2 + 1.5);
    ctx.scale(dir > 0 ? -1 : 1, 1);
    ctx.translate(-w / 2, -h / 2);
    drawProp(ctx, 'dustdevil', 0, 0, w, h);
    ctx.restore();
  }
  if (m.kind === 'cleaner') {
    const h = toonH * 0.95, dir = m.dir;   // a little smaller, down the floor
    const x = dir > 0 ? -h + progress * (width + h * 2) : width + h - progress * (width + h * 2);
    const floor = cleanerFloor(floorRef, toonH, stageBot, u);
    // The confetti left on the floor by the last drops (the club's `floorConfetti`, handed
    // in as `scraps`) disappears behind the broom as she crosses.
    for (const sc of scraps || []) {
      if (dir > 0 ? sc.x < x + h * 0.4 : sc.x > x - h * 0.4) continue;
      ctx.fillStyle = sc.colour;
      ctx.fillRect(sc.x, scrapY(floorRef, toonH, stageBot, u, sc.dy), 2 * u, u);
    }
    ctx.translate(x, floor);ctx.scale(dir, 1);
    // Dolores faces us as she sweeps, so the broom runs across her front: the top hand high
    // by her chest, the other low on the far side, the shaft drawn THROUGH both — worked out
    // from where the painter puts a hand for a given [out, lift] (measured, 3 Oct 2026) — and
    // broken under each so the gloves close round it (Peter: "hands don't touch her broom").
    const H0 = [0.0, -0.4], H1 = [0.3, 1.0];
    drawToon(ctx, 'dolores', { kind: 'run', grounded: true, time: age * 0.35, phase: age * 0.45 % 1,
      dance: { hands: [H0, H1] } }, 0, 0, h);
    const p0 = [-(0.08 + 0.23 * H0[0]), -(0.47 - 0.24 * H0[1])];
    const p1 = [0.13 + 0.23 * H1[0], -(0.49 - 0.24 * H1[1])];
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), ux = (p1[0] - p0[0]) / L, uy = (p1[1] - p0[1]) / L;
    const top = [p0[0] - ux * 0.16, p0[1] - uy * 0.16];
    const foot = [p0[0] + ux * (-p0[1] / uy), 0];
    const total = Math.hypot(foot[0] - top[0], foot[1] - top[1]), s0 = 0.16, s1 = s0 + L;
    const along = (d) => [(top[0] + ux * d) * h, (top[1] + uy * d) * h];
    ctx.lineCap = 'round'; ctx.strokeStyle = '#a88f69'; ctx.lineWidth = h * 0.016;
    for (const [a0, b0] of [[0, s0 - 0.03], [s0 + 0.03, s1 - 0.03], [s1 + 0.03, total]]) {
      const [ax, ay] = along(a0), [bx, by] = along(b0);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.strokeStyle = '#abd0c6'; ctx.lineWidth = h * 0.032;
    for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(h * (foot[0] - 0.045 + j * 0.022), -h * 0.03); ctx.lineTo(h * (foot[0] - 0.06 + j * 0.03), h * 0.005); ctx.stroke(); }
  }
  ctx.restore();
}
