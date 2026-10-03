// IT'S ALIVE! — the moment a new song is born, between the riff grid and the club. 3 Oct 2026.
//
// Peter's brief: BRING TO LIFE runs a little Frankenstein sequence while the song comes
// together — two Tesla coils arcing, a power meter filling, the steps ticking through
// (stitching the riff, wiring the bass, charging the drums, throwing the switch) — then a
// lightning flash and IT'S ALIVE!, and the club opens with the song playing. A tap skips
// ahead: to the flash, and then on.
//
// The song itself is made in the riff grid (maker.js) on the frame before this opens, so
// what this shows is the birth, not a wait: on a phone it covers the generation's few
// hundred milliseconds, and on a Mac it is simply the ceremony.
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { TITLE_FONT } from '../../engine/sprites.js';
import { portraitMenuActive, portraitMenuSafeTop } from '../../engine/portrait-menu.js';
import { bangerTitle } from './store.js';

const BODY_FONT = "'Fredoka', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
export const BIRTH_STEPS = Object.freeze(['STITCHING THE RIFF', 'WIRING UP THE BASS', 'CHARGING THE DRUMS', 'THROWING THE SWITCH']);
const STEP_S = 0.55;
/** When the lightning strikes, and when the club opens. */
export const FLASH_AT = BIRTH_STEPS.length * STEP_S;
export const BIRTH_S = FLASH_AT + 1.5;
const ALIVE = '#7cff6b';
const ARC = '#a8e6ff';

export class BangerBirthState {
  static portraitMode = 'frame';

  /** `rec` is the song just made; `onDone` opens it. */
  constructor({ rec, onDone, random = Math.random }) {
    this.rec = rec;
    this.onDone = onDone;
    this.random = random;
  }

  enter() {
    this.t = 0;
    this.step = -1;
    this.flashed = false;
    this.done = false;
    Audio.setBank(null);
    Audio.sfx('power');
    Input.setMenuButtons();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.onDone?.();
  }

  update(dt) {
    this.t += dt;
    const step = Math.min(BIRTH_STEPS.length - 1, Math.floor(this.t / STEP_S));
    if (step !== this.step && this.t < FLASH_AT) { this.step = step; Audio.sfx('ui'); }
    if (!this.flashed && this.t >= FLASH_AT) { this.flashed = true; Audio.sfx('thunder'); }
    if (Input.pressed('pointer') || Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('back')) {
      if (this.t < FLASH_AT) this.t = FLASH_AT;
      else this.finish();
    }
    if (this.t >= BIRTH_S) this.finish();
    Input.endFrame();
  }

  /** A jagged bolt from (x0,y0) to (x1,y1), new every frame. */
  bolt(ctx, x0, y0, x1, y1, spread, width, colour, depth = 0) {
    const n = 9;
    const pts = [[x0, y0]];
    for (let i = 1; i < n; i++) {
      const k = i / n;
      pts.push([x0 + (x1 - x0) * k + (this.random() - 0.5) * spread * 0.4, y0 + (y1 - y0) * k + (this.random() - 0.5) * spread]);
    }
    pts.push([x1, y1]);
    ctx.strokeStyle = colour;
    for (const [w, a] of [[width * 3.2, 0.18], [width, 0.95]]) {
      ctx.globalAlpha = a; ctx.lineWidth = w;
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (depth < 1 && this.random() < 0.6) {
      const [bx, by] = pts[2 + Math.floor(this.random() * (n - 4))];
      this.bolt(ctx, bx, by, bx + (this.random() - 0.5) * spread * 1.4, by + spread * (0.4 + this.random() * 0.6), spread * 0.5, width * 0.6, colour, depth + 1);
    }
  }

  draw(ctx) {
    const portrait = portraitMenuActive();
    const P = portrait ? W / 390 : 1;
    const u = portrait ? 1.9 * P : 1;
    const t = this.t;
    const charge = Math.min(1, t / FLASH_AT);
    const alive = t >= FLASH_AT;
    const since = t - FLASH_AT;
    const shake = alive ? Math.max(0, 1 - since / 0.5) * 4 * u : 0;
    ctx.save();
    ctx.translate((this.random() - 0.5) * shake, (this.random() - 0.5) * shake);
    // the lab, dark, lit from the coils
    ctx.fillStyle = '#07060e';
    ctx.fillRect(-10, -10, W + 20, H + 20);
    const cy = H * (portrait ? 0.42 : 0.5);
    const glow = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, Math.max(W, H) * 0.6);
    glow.addColorStop(0, `rgba(120,200,255,${0.06 + 0.16 * charge})`); glow.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // the coils
    const base = cy + (portrait ? 150 : 70) * P;
    const coilH = (portrait ? 190 : 92) * P;
    const xs = [W * (portrait ? 0.16 : 0.2), W * (portrait ? 0.84 : 0.8)];
    const tops = xs.map((x) => [x, base - coilH - 9 * u]);
    for (const x of xs) {
      ctx.fillStyle = '#1b1828';
      ctx.fillRect(x - 12 * u, base - 6 * u, 24 * u, 6 * u);
      ctx.fillStyle = '#2a2540';
      ctx.fillRect(x - 4 * u, base - coilH, 8 * u, coilH - 6 * u);
      ctx.strokeStyle = '#b07a3a'; ctx.lineWidth = 1.2 * u;
      for (let y = base - coilH + 6 * u; y < base - 10 * u; y += 3.2 * u) {
        ctx.beginPath(); ctx.moveTo(x - 6 * u, y); ctx.lineTo(x + 6 * u, y + 1.2 * u); ctx.stroke();
      }
      const sg = ctx.createRadialGradient(x - 3 * u, base - coilH - 12 * u, u, x, base - coilH - 9 * u, 10 * u);
      sg.addColorStop(0, '#e8f6ff'); sg.addColorStop(1, '#4a5a78');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(x, base - coilH - 9 * u, 9 * u, 0, Math.PI * 2); ctx.fill();
    }

    // the song being born: a note in the middle, glowing as the charge builds
    const nr = (portrait ? 34 : 18) * P * (1 + 0.08 * Math.sin(t * 9) * charge);
    const ng = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, nr * 3);
    ng.addColorStop(0, alive ? ALIVE + 'aa' : `rgba(168,230,255,${0.2 + 0.5 * charge})`); ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.arc(W / 2, cy, nr * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = alive ? ALIVE : `rgba(220,240,255,${0.35 + 0.65 * charge})`;
    ctx.beginPath(); ctx.ellipse(W / 2 - nr * 0.3, cy + nr * 0.45, nr * 0.42, nr * 0.32, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = nr * 0.16; ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath(); ctx.moveTo(W / 2 + nr * 0.06, cy + nr * 0.42); ctx.lineTo(W / 2 + nr * 0.06, cy - nr * 0.85);
    ctx.quadraticCurveTo(W / 2 + nr * 0.65, cy - nr * 0.6, W / 2 + nr * 0.75, cy - nr * 0.15); ctx.stroke();

    // arcs: from the coils into the note, more of them as the charge builds
    const arcs = alive ? 0 : 1 + Math.floor(charge * 3);
    for (let i = 0; i < arcs; i++) {
      for (const [tx, ty] of tops) {
        if (this.random() < 0.35 + charge * 0.5) this.bolt(ctx, tx, ty, W / 2, cy, 26 * u, 1.1 * u, ARC);
      }
    }
    if (!alive && charge > 0.5 && this.random() < charge * 0.6) this.bolt(ctx, tops[0][0], tops[0][1], tops[1][0], tops[1][1], 30 * u, 1.3 * u, ARC);

    // the step, and the meter filling
    const top = portrait ? portraitMenuSafeTop() + 60 * P : 22;
    ctx.textAlign = 'center';
    ctx.font = `500 ${portrait ? 13 * P : 8}px ${BODY_FONT}`;
    ctx.fillStyle = '#8f8b9e';
    ctx.fillText(alive ? 'BORN JUST NOW' : 'BRINGING TO LIFE', W / 2, top);
    ctx.font = `${portrait ? 17 * P : 11}px ${TITLE_FONT}`;
    ctx.fillStyle = '#48e0c8';
    ctx.fillText(bangerTitle(this.rec), W / 2, top + (portrait ? 26 * P : 15), W - 20);
    if (!alive) {
      const my = base + (portrait ? 70 : 34) * P;
      const segs = 12, sw = (portrait ? 18 : 12) * P, gap = (portrait ? 5 : 3) * P;
      const mx = W / 2 - (segs * (sw + gap) - gap) / 2;
      for (let i = 0; i < segs; i++) {
        const on = (i + 1) / segs <= charge + 0.001;
        ctx.fillStyle = on ? (i >= segs - 2 ? ALIVE : ARC) : '#1d1a2c';
        ctx.globalAlpha = on ? 0.9 : 1;
        ctx.fillRect(mx + i * (sw + gap), my, sw, (portrait ? 10 : 6) * P);
      }
      ctx.globalAlpha = 1;
      const dots = '.'.repeat(1 + (Math.floor(t * 6) % 3));
      ctx.font = `600 ${portrait ? 15 * P : 9}px ${BODY_FONT}`;
      ctx.fillStyle = '#c8c8d8';
      ctx.fillText(`${BIRTH_STEPS[Math.max(0, this.step)]}${dots}`, W / 2, my - (portrait ? 14 : 8) * P);
    }

    // IT'S ALIVE!
    if (alive) {
      const pop = 1 + 0.35 * Math.exp(-since * 7);
      const size = (portrait ? 58 : 38) * P;
      ctx.save();
      ctx.translate(W / 2, cy - (portrait ? 150 : 62) * P);
      ctx.scale(pop, pop);
      ctx.font = `${size}px ${TITLE_FONT}`;
      ctx.shadowColor = ALIVE; ctx.shadowBlur = size * 0.5;
      ctx.lineWidth = size * 0.14; ctx.strokeStyle = '#06210a';
      ctx.strokeText("IT'S ALIVE!", 0, 0);
      ctx.fillStyle = ALIVE;
      ctx.fillText("IT'S ALIVE!", 0, 0);
      ctx.restore();
      // the bolt that did it, fading
      if (since < 0.6) {
        ctx.globalAlpha = 1 - since / 0.6;
        this.bolt(ctx, W / 2 + (this.random() - 0.5) * 40 * u, 0, W / 2, cy, 40 * u, 2.4 * u, '#ffffff');
        ctx.globalAlpha = 1;
      }
    }
    ctx.textAlign = 'left';
    ctx.restore();
    // the flash
    if (alive && since < 0.35) {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - since / 0.35)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
