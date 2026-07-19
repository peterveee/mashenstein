// Title attract: a roll call of the cast, one hero at a time, each announced
// by name with their tagline and what they actually do. Replaces the playable
// demo as the idle screen. Any HUMAN input exits immediately and is consumed
// so it can never fall through into a menu selection.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { drawText, drawTextCentered, textWidth, wrapText } from '../engine/sprites.js';
import { drawToon } from '../sprites/toons.js';
import { HEROES } from '../data/heroes.js';

const SLOT_T = 5.2;        // seconds per hero
const FADE_T = 0.45;       // slide/fade in at the start of each slot
// Every hero but the last is covered by the next one fading in over them. The
// last has nothing following it, so without a tail the roll call cuts to the
// title mid-pose and reads as a glitch. Hold, then bow out.
const TAIL_T = 1.2;
const FADE_OUT_T = 0.55;
// The beat runs from settle to just before the next hero slides in, so the
// longer slot reads as a held performance rather than a pose and a long wait.
const ACT_IN = 0.9;
const ACT_LEN = SLOT_T - ACT_IN - 0.7;
const FLOOR_Y = 214;

// Each hero's signature beat, matching the title parade so the poses are
// known-good for their rig.
const BEATS = {
  lorenzo: 'wave', gnash: 'jump', fernwick: 'roll', b33p: 'aim',
  mochi: 'float', chompo: 'chomp', raymn: 'assemble', grumpos: 'flex',
};

export class CastState {
  // opts: { realSettings, onExit(autoAdvance) }
  constructor(opts) { this.o = opts || {}; }

  enter() {
    this.t = 0;
    this.i = 0;
    this.slotT = 0;
    this.actTok = Input.activity;
    Input.clearAll();
    this.reduced = !!(this.o.realSettings && this.o.realSettings.reducedMotion);
  }

  exit() { Input.clearAll(); }

  isLast() { return this.i === HEROES.length - 1; }
  slotLen() { return SLOT_T + (this.isLast() ? TAIL_T : 0); }

  update(dt) {
    // Human input: consume it and bail to the title (no interlude).
    if (Input.activity !== this.actTok) {
      Input.clearAll();
      this.o.onExit(false);
      return;
    }
    this.t += dt;
    this.slotT += dt;
    if (this.slotT >= this.slotLen()) {
      this.slotT = 0;
      this.i++;
      if (this.i >= HEROES.length) { this.o.onExit(true); return; } // whole cast seen
    }
    Input.endFrame();
  }

  // The hero acts for a beat once they've settled in.
  poseFor(hero, intro) {
    const t = this.t;
    const beat = this.slotT;
    const acting = !this.reduced && !intro && beat > ACT_IN && beat < ACT_IN + ACT_LEN;
    const lift = acting ? Math.sin(((beat - ACT_IN) / ACT_LEN) * Math.PI) : 0;
    const pose = {
      kind: 'run', grounded: true, time: t, menu: true,
      phase: (t * 1.5) % 1,
    };
    let feetOff = 0;
    const act = BEATS[hero.id];
    if (acting) {
      if (act === 'wave' || act === 'flex') pose.menuAction = act;
      else if (act === 'jump') { pose.kind = 'jump'; pose.grounded = false; feetOff = lift * 22; }
      else if (act === 'roll') { pose.kind = 'duck'; pose.roll = true; }
      else if (act === 'aim') { pose.menuAction = 'aim'; pose.squash = lift * 0.3; }
      else if (act === 'float') { pose.float = true; feetOff = lift * 18; }
      else if (act === 'chomp') pose.menuAction = 'chomp';
      else if (act === 'assemble') { pose.headless = lift > 0.45; pose.menuAction = 'wave'; }
    }
    return { pose, feetOff };
  }

  draw(ctx) {
    const hero = HEROES[Math.min(this.i, HEROES.length - 1)];
    const t = this.t;
    // Slide/fade the panel in at the top of each slot.
    const intro = this.slotT < FADE_T;
    const k = this.reduced ? 1 : Math.min(1, this.slotT / FADE_T);
    let ease = 1 - (1 - k) * (1 - k);
    // The last hero fades out over the tail rather than being cut off.
    const left = this.slotLen() - this.slotT;
    if (!this.reduced && this.isLast() && left < FADE_OUT_T) {
      ease *= Math.max(0, left / FADE_OUT_T);
    }

    // --- backdrop: the dark arcade, one machine still lit ------------------
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 22; i++) {
      const sx = (i * 91 + 17) % W;
      const sy = (i * 47 + 9) % 90;
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * (1 + (i % 4) * 0.3) + i));
      ctx.fillStyle = '#6a6a9a';
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;

    // spotlight cone onto the floor
    const hx = 108;
    const cone = ctx.createLinearGradient(hx, 40, hx, FLOOR_Y);
    cone.addColorStop(0, 'rgba(246,211,60,0.16)');
    cone.addColorStop(1, 'rgba(246,211,60,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(hx - 14, 40);
    ctx.lineTo(hx + 14, 40);
    ctx.lineTo(hx + 62, FLOOR_Y);
    ctx.lineTo(hx - 62, FLOOR_Y);
    ctx.closePath();
    ctx.fill();

    // floor + pooled light
    ctx.fillStyle = '#171222';
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    ctx.fillStyle = 'rgba(246,211,60,0.09)';
    ctx.beginPath();
    ctx.ellipse(hx, FLOOR_Y + 2, 58, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(8,6,12,0.4)';
    ctx.beginPath();
    ctx.ellipse(hx, FLOOR_Y, 26, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    drawTextCentered(ctx, 'MEET THE CAST', W / 2, 14, '#48e0c8');

    // --- the hero ----------------------------------------------------------
    const { pose, feetOff } = this.poseFor(hero, intro);
    ctx.save();
    ctx.globalAlpha = ease;
    drawToon(ctx, hero.id, pose, hx + (1 - ease) * -26, FLOOR_Y - feetOff, 104);
    ctx.restore();

    // --- the card ----------------------------------------------------------
    const tx = 196 + (1 - ease) * 18;
    ctx.save();
    ctx.globalAlpha = ease;
    let y = 62;
    drawText(ctx, hero.short, tx, y, '#ffd94a', 2);
    y += 26;
    // Full name only when it says something the short name doesn't.
    if (hero.name !== hero.short) {
      drawText(ctx, hero.name, tx, y, '#8a8a98');
      y += 14;
    }
    drawText(ctx, `"${hero.tagline}"`, tx, y, '#48e0c8');
    y += 20;

    ctx.fillStyle = 'rgba(246,211,60,0.5)';
    ctx.fillRect(tx, y - 2, 44, 1);
    y += 8;
    drawText(ctx, hero.ability.label, tx, y, '#f6d33c');
    y += 14;
    for (const line of wrapText(hero.abilityDesc, W - tx - 16, 1, 3)) {
      drawText(ctx, line, tx, y, '#c8c8d8');
      y += 11;
    }
    // The dossier footnote nobody asked for, filling the card's lower half.
    y += 10;
    for (const line of wrapText(hero.joke, W - tx - 16, 1, 3)) {
      drawText(ctx, line, tx, y, '#5a5a68');
      y += 11;
    }
    ctx.restore();

    // --- roll-call progress + exit hint ------------------------------------
    const dotW = 8;
    const x0 = W / 2 - (HEROES.length * dotW) / 2;
    for (let i = 0; i < HEROES.length; i++) {
      ctx.fillStyle = i === this.i ? '#f6d33c' : i < this.i ? '#5a5a68' : '#2a2a3a';
      ctx.fillRect(x0 + i * dotW, H - 30, 5, 3);
    }
    if (this.reduced || Math.floor(t * 1.6) % 2 === 0) {
      drawTextCentered(ctx, 'PRESS ANY KEY / TAP TO RETURN', W / 2, H - 18, '#8a8a98');
    }
  }
}
