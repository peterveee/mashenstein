// IT'S ALIVE! — the moment a new song is born, between the riff grid and the club. 3 Oct 2026.
//
// Peter's brief: BRING TO LIFE runs a little Frankenstein sequence while the song comes
// together — two Tesla coils arcing, a power meter filling, the steps ticking through
// (stitching the riff, wiring the bass, charging the drums, throwing the switch) — then a
// lightning flash and IT'S ALIVE!, and the club opens with the song playing. A tap skips
// ahead: to the flash, and then on.
//
// GARY throws the switch (Peter, 3 Oct 2026). Still on the clock, still responsible for the
// physical switches: he stands by a big knife switch on the coils' circuit and hauls it down
// FIRST — that is what starts it all: the coils wake, the steps tick through, the meter
// fills. He looks shocked at what he has started, and smiles when it's alive.
//
// WHAT COMES ALIVE is a GIANT CASSETTE (Peter, 3 Oct 2026, from the bake-off — the other
// candidates are in src/dev/birth-subjects.js): standing on the lab's slab, clamped to the
// coils, the new song's name on its label. Dormant it is grey and still; alive its reels
// turn, the eyes in them open, and it grins.
//
// The song itself is made in the riff grid (maker.js) on the frame before this opens, so
// what this shows is the birth, not a wait: on a phone it covers the generation's few
// hundred milliseconds, and on a Mac it is simply the ceremony.
//
// BIRTH, NOT REVISION (Peter, 4 Oct 2026): this plays for a NEW BANGER — the maker the
// player opened by that name — and only for that. A song remade with the pencil goes
// straight back to the club; the jukebox decides (menus.js, openPendingClub).
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { TITLE_FONT } from '../../engine/sprites.js';
import { portraitMenuActive, portraitMenuSafeTop } from '../../engine/portrait-menu.js';
import { bangerTitle } from './store.js';
import { drawToon } from '../../sprites/toons.js';

const BODY_FONT = "'Fredoka', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
export const BIRTH_STEPS = Object.freeze(['STITCHING THE RIFF', 'WIRING UP THE BASS', 'CHARGING THE DRUMS', 'CRANKING THE VOLTAGE']);
const STEP_S = 0.55;
/** Gary's reach for the switch, the brace, the haul down, and the moment it lands. */
const REACH_AT = 0.1, BRACE_AT = 0.4, PULL_AT = 0.53;
export const SWITCH_AT = 0.75;
/** When the lightning strikes, and when the club opens. */
export const FLASH_AT = SWITCH_AT + BIRTH_STEPS.length * STEP_S;
export const BIRTH_S = FLASH_AT + 1.8;
const ALIVE = '#7cff6b';
/** He holds it down a moment, then lets go. */
const LET_GO_AT = SWITCH_AT + 0.5, LET_GO_S = 0.3;
/** His face: shocked from the moment the switch lands, smiling once it's alive. */
const SMILE_AT = FLASH_AT;
const SWITCH_UP = -1.05, SWITCH_DOWN = 1.05;   // the lever's angle, off and thrown (radians)
const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
};
const smooth = (v) => { const n = Math.max(0, Math.min(1, v)); return n * n * (3 - 2 * n); };
const ARC = '#a8e6ff';

export class BangerBirthState {
  static portraitMode = 'frame';

  /**
   * `rec` is the song just made; `onDone` opens it. `subject` paints what is brought to life
   * (the bake-off's candidates, src/dev/birth-subjects.js); the music note by default.
   */
  constructor({ rec, onDone, random = Math.random, subject = null }) {
    this.rec = rec;
    this.onDone = onDone;
    this.random = random;
    this.subject = subject;
  }

  enter() {
    this.t = 0;
    this.step = -1;
    this.flashed = false;
    this.done = false;
    this.thrown = false;
    Audio.setBank(null);
    Input.setMenuButtons();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    this.onDone?.();
  }

  update(dt) {
    this.t += dt;
    if (!this.thrown && this.t >= SWITCH_AT) { this.thrown = true; Audio.sfx('power'); }
    const step = this.t < SWITCH_AT ? -1 : Math.min(BIRTH_STEPS.length - 1, Math.floor((this.t - SWITCH_AT) / STEP_S));
    if (step !== this.step && step >= 0 && this.t < FLASH_AT) { this.step = step; Audio.sfx('ui'); }
    if (!this.flashed && this.t >= FLASH_AT) { this.flashed = true; Audio.sfx('thunder'); }
    if (Input.pressed('pointer') || Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('back')) {
      if (this.t < FLASH_AT) this.t = FLASH_AT;
      else this.finish();
    }
    if (this.t >= BIRTH_S) this.finish();
    Input.endFrame();
  }

  /** A jagged bolt from (x0,y0) to (x1,y1), new every frame. */
  bolt(ctx, x0, y0, x1, y1, spread, width, colour) {
    drawBolt(ctx, this.random, x0, y0, x1, y1, { spread, width, colour });
  }

  /** Where the switch's lever is: off (up) until the haul, thrown (down) from SWITCH_AT. */
  switchAngle() {
    const t = this.t;
    if (t >= SWITCH_AT) return SWITCH_DOWN;
    if (t < PULL_AT) return SWITCH_UP;
    const k = (t - PULL_AT) / (SWITCH_AT - PULL_AT);
    return SWITCH_UP + (SWITCH_DOWN - SWITCH_UP) * k * k;   // heavy: it gathers speed
  }

  /**
   * Gary and his switch. He stands front-on and reaches across to his right (the screen's
   * left) — the arm targets are the painter's dance hands, [out, lift] — so the switch is
   * on that side, its lever's handle where his hand can meet it.
   */
  /**
   * The giant cassette on its slab: the table, the clamps wired back to the coils, and the
   * tape itself — `y` is its middle, `r` its size (it is 2.5r wide, 1.6r tall).
   */
  drawCassette(ctx, x, y, r, { alive, since, t, base, coilXs, u }) {
    const w = r * 2.5, h = r * 1.6;
    // the slab: a riveted steel top on a pedestal
    const topY = y + h / 2, tw = w * 1.3, th = r * 0.16;
    ctx.fillStyle = '#1b1828';
    ctx.fillRect(x - r * 0.25, topY + th, r * 0.5, base - topY - th);
    ctx.fillRect(x - r * 0.7, base - r * 0.1, r * 1.4, r * 0.1);
    ctx.fillStyle = '#4a4660'; ctx.fillRect(x - tw / 2, topY, tw, th);
    ctx.fillStyle = '#6a6680'; ctx.fillRect(x - tw / 2, topY, tw, th * 0.3);
    ctx.fillStyle = '#2a2540';
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(x + i * tw * 0.22, topY + th * 0.6, th * 0.15, 0, Math.PI * 2); ctx.fill(); }
    // the cables from each coil's base to a clamp on the tape's side
    ctx.strokeStyle = '#3a3448'; ctx.lineWidth = 1.6 * u;
    for (const [cx, side] of [[coilXs[0], -1], [coilXs[1], 1]]) {
      const ex = x + side * (w / 2 + r * 0.08), ey = y + h * 0.1;
      ctx.beginPath(); ctx.moveTo(cx, base - 3 * u);
      ctx.bezierCurveTo(cx, base + r * 0.3, ex + side * r * 0.6, ey + r * 0.9, ex, ey); ctx.stroke();
      ctx.fillStyle = '#b07a3a';
      ctx.fillRect(ex - (side > 0 ? 0 : r * 0.18), ey - r * 0.12, r * 0.18, r * 0.24);
    }
    ctx.save();
    ctx.translate(x, y);
    // alive, it rocks to the beat
    if (alive) ctx.rotate(Math.sin(t * Math.PI * 2) * 0.04);
    const col = (live, dead) => (alive ? live : dead);
    // the shell
    ctx.fillStyle = col('#2a2540', '#3a3e48');
    rr(ctx, -w / 2, -h / 2, w, h, r * 0.1); ctx.fill();
    ctx.fillStyle = col('#3a3456', '#474b56');
    ctx.beginPath(); ctx.moveTo(-w * 0.3, h / 2); ctx.lineTo(-w * 0.24, h * 0.3); ctx.lineTo(w * 0.24, h * 0.3); ctx.lineTo(w * 0.3, h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1b1828';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(sx * w * 0.44, sy * h * 0.4, r * 0.04, 0, Math.PI * 2); ctx.fill(); }
    // the label, the song's name on it
    ctx.fillStyle = col('#ffd23f', '#6a6e78'); rr(ctx, -w * 0.42, -h * 0.42, w * 0.84, h * 0.56, r * 0.06); ctx.fill();
    ctx.fillStyle = col('#ff4fa3', '#5a5e68'); ctx.fillRect(-w * 0.42, -h * 0.42 + h * 0.06, w * 0.84, h * 0.05);
    ctx.fillStyle = '#1b1828';
    ctx.font = `${Math.max(4, r * 0.17)}px ${TITLE_FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.rec?.name || 'BANGER', 0, -h * 0.25, w * 0.78);
    // the window, and the reels in it — the eyes
    ctx.fillStyle = '#16131f'; rr(ctx, -w * 0.28, -h * 0.14, w * 0.56, h * 0.26, r * 0.13); ctx.fill();
    ctx.fillStyle = col('#5a3a2a', '#3a3a40'); ctx.fillRect(-w * 0.12, -h * 0.07, w * 0.24, h * 0.12);
    const open = alive ? Math.min(1, since * 6) : 0;
    const blink = alive && (t % 2.6) > 2.45;
    for (const dx of [-w * 0.17, w * 0.17]) {
      ctx.save(); ctx.translate(dx, -h * 0.01);
      ctx.fillStyle = '#f2f2f6'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.rotate(alive ? t * 5 : 0);
      ctx.fillStyle = '#8a8e98';
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.fillRect(Math.cos(a) * r * 0.14 - r * 0.025, Math.sin(a) * r * 0.14 - r * 0.025, r * 0.05, r * 0.05); }
      ctx.restore();
      if (open > 0 && !blink) {
        ctx.fillStyle = '#1b1828';
        ctx.beginPath(); ctx.ellipse(r * 0.03 * Math.sin(t * 1.7), 0, r * 0.09, r * 0.09 * open, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-r * 0.03, -r * 0.03, r * 0.025, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.strokeStyle = '#1b1828'; ctx.lineWidth = r * 0.04;
        ctx.beginPath(); ctx.moveTo(-r * 0.1, 0); ctx.lineTo(r * 0.1, 0); ctx.stroke();
      }
      ctx.restore();
    }
    // the mouth, along the bottom: a flat line, then a grin
    ctx.strokeStyle = '#1b1828'; ctx.lineWidth = r * 0.07; ctx.lineCap = 'round';
    ctx.beginPath();
    if (alive) ctx.arc(0, h * 0.12, r * 0.42, Math.PI * 0.22, Math.PI * 0.78);
    else { ctx.moveTo(-r * 0.25, h * 0.38); ctx.lineTo(r * 0.25, h * 0.38); }
    ctx.stroke(); ctx.lineCap = 'butt';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  drawGary(ctx, { portrait, P, base, coilX }) {
    const t = this.t;
    const since = t - SWITCH_AT;
    const h = portrait ? 100 * P : 72;
    const gx = W * (portrait ? 0.27 : 0.32);            // beside the slab
    const L = h * 0.2;                                  // the lever, pivot to handle
    const px = gx - h * 0.43, py = base - h * 0.57;     // its pivot, on the panel
    const ang = this.switchAngle();
    const tip = [px + Math.cos(ang) * L, py + Math.sin(ang) * L];
    // the panel, wired to the left coil
    const pw = h * 0.3, ph = h * 0.5;
    ctx.strokeStyle = '#3a3448'; ctx.lineWidth = h * 0.025;
    ctx.beginPath(); ctx.moveTo(px, py + ph / 2); ctx.quadraticCurveTo(px - h * 0.1, base + h * 0.02, coilX + h * 0.12, base - h * 0.04); ctx.stroke();
    ctx.fillStyle = '#2a2540';
    ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
    ctx.strokeStyle = '#4a4466'; ctx.lineWidth = h * 0.012;
    ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
    ctx.fillStyle = '#5a5470';
    for (const [rx, ry] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath(); ctx.arc(px + rx * pw * 0.38, py + ry * ph * 0.42, h * 0.012, 0, Math.PI * 2); ctx.fill();
    }
    // the copper jaws the blade drops into
    const jx = px + Math.cos(SWITCH_DOWN) * L, jy = py + Math.sin(SWITCH_DOWN) * L;
    ctx.fillStyle = '#b07a3a';
    ctx.fillRect(jx - h * 0.05, jy - h * 0.012, h * 0.025, h * 0.06);
    ctx.fillRect(jx + h * 0.025, jy - h * 0.012, h * 0.025, h * 0.06);
    // the blade and its handle
    ctx.strokeStyle = '#c8c8d8'; ctx.lineWidth = h * 0.035; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#5a5470';
    ctx.beginPath(); ctx.arc(px, py, h * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1828';
    ctx.beginPath(); ctx.arc(tip[0], tip[1], h * 0.04, 0, Math.PI * 2); ctx.fill();
    // sparks off the jaws as it lands
    if (since >= 0 && since < 0.5) {
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = h * 0.012;
      ctx.globalAlpha = 1 - since / 0.5;
      for (let i = 0; i < 9; i++) {
        const a = this.random() * Math.PI * 2, r0 = h * 0.03, r1 = h * (0.08 + this.random() * 0.14) * (0.4 + since * 2);
        ctx.beginPath(); ctx.moveTo(jx + Math.cos(a) * r0, jy + Math.sin(a) * r0); ctx.lineTo(jx + Math.cos(a) * r1, jy + Math.sin(a) * r1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Gary: his hand goes to the handle, rides it down, holds it, lets go.
    // at his sides, out from the body far enough to be seen (tucked in, the arms vanish behind him)
    const rest = [0.7, 0.85];
    const toHandle = [(gx - tip[0] - 0.1 * h) / (0.26 * h), (tip[1] - base + 0.511 * h) / (0.256 * h)];
    const grip = t < REACH_AT ? 0 : t < BRACE_AT ? smooth((t - REACH_AT) / (BRACE_AT - REACH_AT))
      : t < LET_GO_AT ? 1 : 1 - smooth((t - LET_GO_AT) / LET_GO_S);
    const hand = rest.map((v, i) => v + (toHandle[i] - v) * grip);
    const pose = {
      kind: 'stand', time: t, phase: 0, grounded: true, facing: 1, squash: 0,
      // a lean into the haul
      lean: t >= PULL_AT && t < LET_GO_AT ? 0.06 : 0,
      dance: { hands: [hand, [0.7, 0.85]], ankles: [0, 0], pointAngle: null, shoulderLift: 0 },
      // the painter's face-only moods: shocked by what he has done, then pleased with it
      faceSurprised: t >= SWITCH_AT && t < SMILE_AT,
      faceJoy: t >= SMILE_AT,
    };
    try { drawToon(ctx, 'gary', pose, gx, base, h); } catch { /* the switch throws itself */ }
  }

  draw(ctx) {
    const portrait = portraitMenuActive();
    const P = portrait ? W / 390 : 1;
    const u = portrait ? 1.9 * P : 1;
    const t = this.t;
    // nothing until the switch is thrown; then the charge builds to the flash
    const charge = Math.max(0, Math.min(1, (t - SWITCH_AT) / (FLASH_AT - SWITCH_AT)));
    const live = t >= SWITCH_AT;
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
    const xs = [W * (portrait ? 0.1 : 0.2), W * (portrait ? 0.9 : 0.8)];
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

    // what is being born: the giant cassette on its slab, glowing as the charge builds
    const nr = (portrait ? 44 : 30) * P;
    const slabH = (portrait ? 64 : 36) * P;
    const sy = base - slabH - nr * 0.8;                 // the cassette's middle
    const ng = ctx.createRadialGradient(W / 2, sy, 0, W / 2, sy, nr * 3);
    ng.addColorStop(0, alive ? ALIVE + '88' : `rgba(168,230,255,${0.1 + 0.4 * charge})`); ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.arc(W / 2, sy, nr * 3, 0, Math.PI * 2); ctx.fill();
    if (this.subject) this.subject(ctx, W / 2, sy, nr * 0.6, { charge, alive, since: Math.max(0, since), t });
    else this.drawCassette(ctx, W / 2, sy, nr, { alive, since: Math.max(0, since), t, base, coilXs: xs, u });
    // Gary in front of the slab and its cables
    this.drawGary(ctx, { portrait, P, base, coilX: xs[0] });

    // arcs: from the coils into it, more of them as the charge builds — once the switch is in
    const arcs = alive || !live ? 0 : 1 + Math.floor(charge * 3);
    for (let i = 0; i < arcs; i++) {
      for (const [tx, ty] of tops) {
        if (this.random() < 0.35 + charge * 0.5) this.bolt(ctx, tx, ty, W / 2, sy, 26 * u, 1.1 * u, ARC);
      }
    }
    if (live && !alive && charge > 0.5 && this.random() < charge * 0.6) this.bolt(ctx, tops[0][0], tops[0][1], tops[1][0], tops[1][1], 30 * u, 1.3 * u, ARC);

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
      ctx.fillText(live ? `${BIRTH_STEPS[Math.max(0, this.step)]}${dots}` : 'THROWING THE SWITCH', W / 2, my - (portrait ? 14 : 8) * P);
    }

    // IT'S ALIVE!
    if (alive) {
      const pop = 1 + 0.35 * Math.exp(-since * 7);
      const size = (portrait ? 58 : 38) * P;
      ctx.save();
      ctx.translate(W / 2, cy - (portrait ? 100 : 62) * P);   // portrait: clear of the song's name
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
        this.bolt(ctx, W / 2 + (this.random() - 0.5) * 40 * u, 0, W / 2, sy, 40 * u, 2.4 * u, '#ffffff');
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

/**
 * A jagged bolt from (x0,y0) to (x1,y1), new every call: a glow (`glow`, the core's colour unless
 * given) under a hot core, and now and then a branch off it. `alpha` scales the whole bolt, for one
 * fading out. The club's reroll arcs with it too.
 */
export function drawBolt(ctx, random, x0, y0, x1, y1, { spread, width, colour, glow = colour, alpha = 1 }, depth = 0) {
  const n = 9;
  const pts = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const k = i / n;
    pts.push([x0 + (x1 - x0) * k + (random() - 0.5) * spread * 0.4, y0 + (y1 - y0) * k + (random() - 0.5) * spread]);
  }
  pts.push([x1, y1]);
  for (const [w, a, c] of [[width * 3.2, glow === colour ? 0.18 : 0.4, glow], [width, 0.95, colour]]) {
    ctx.strokeStyle = c;
    ctx.globalAlpha = a * alpha; ctx.lineWidth = w;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (depth < 1 && random() < 0.6) {
    const [bx, by] = pts[2 + Math.floor(random() * (n - 4))];
    drawBolt(ctx, random, bx, by, bx + (random() - 0.5) * spread * 1.4, by + spread * (0.4 + random() * 0.6),
      { spread: spread * 0.5, width: width * 0.6, colour, glow, alpha }, depth + 1);
  }
}
