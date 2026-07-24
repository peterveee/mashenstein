// Title attract: a roll call of the cast, one hero at a time, each announced
// by name with their tagline and what they actually do. Replaces the playable
// demo as the idle screen. Any HUMAN input exits immediately, except Left/A
// and Right/D which navigate the roll call and are consumed so they cannot
// fall through into a menu selection.
import { W, H } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { drawText, drawTextCentered, textWidth, wrapText } from '../engine/sprites.js';
import { drawToon } from '../sprites/toons.js';
import { HEROES } from '../data/heroes.js';

const SLOT_T = 16.0;       // seconds per hero; gives players time to read the full card
const FADE_T = 0.45;       // slide/fade in at the start of each slot
// Every hero but the last is covered by the next one fading in over them. The
// last has nothing following it, so without a tail the roll call cuts to the
// title mid-pose and reads as a glitch. Hold, then bow out.
const TAIL_T = 1.2;
const FADE_OUT_T = 0.55;
// Default card arc: move for 70%, then celebrate for the final 30%. Individual
// locomotion-special cards override the second beat below. Nobody idles.
const PERFORMANCE_IN = SLOT_T * 0.7;
const LORENZO_ATTACK_IN = SLOT_T * 0.45;
const LORENZO_ATTACK_T = 0.55;
const GRUMPOS_CELEBRATE_IN = SLOT_T * 0.5;
// Whole-cycle gait rates: eight ordinary cycles and twelve Gnash cycles land
// exactly at 11.2s. This preserves a constant walking speed right up to the
// celebration/special handoff—no late brake and no half-raised foot.
const CAST_GAIT_RATE = 8 / PERFORMANCE_IN;
const GRUMPOS_GAIT_RATE = 6 / GRUMPOS_CELEBRATE_IN;
const GNASH_GAIT_CYCLES = 12;
function gnashGaitPhase(beat) {
  const p = Math.max(0, Math.min(1, beat / PERFORMANCE_IN));
  // Integral of a linearly increasing gait rate. The 0.7/0.3 curve starts
  // just above the ordinary walk and reaches nearly twice that cadence, while
  // still accumulating exactly twelve complete strides at the dash handoff.
  return (GNASH_GAIT_CYCLES * (0.7 * p + 0.3 * p * p)) % 1;
}
const FLOOR_Y = 214;
const CAST_HERO_TILE = 150;
const CAST_HERO_SCALE = 2;
const CAST_HERO_FLOOR = 140;

// Gary and Dolores are NPC gags, not playable relay members. Keep them local
// to the roll call so the normal eight-hero systems do not start selecting
// them. The Dust Devil is deliberately NOT here: he is a surprise, and a card
// would spend him before the player meets him.
const GARY_CAST = {
  id: 'gary', name: 'GARY, STILL ON THE CLOCK', short: 'GARY', subtitle: 'STILL ON THE CLOCK',
  tagline: 'TECHNICALLY I NEVER CLOCKED OUT.',
  ability: { label: 'UNAUTHORIZED INITIATIVE' },
  abilityDesc: 'STILL RESPONSIBLE FOR THE PHYSICAL SWITCHES. DEATH DID NOT UPDATE THE ROSTER.',
  joke: 'HR SAYS BEING DECEASED IS NOT APPROVED LEAVE. I HAVE APPEALED.',
};

// Her rule, per the hub lines: she never acknowledges the arcade is dead. Not
// denial — a shift that has not ended. So the card never winks at it either;
// it is written as staff copy, and the gap is the joke.
const DOLORES_CAST = {
  id: 'dolores', name: 'DOLORES, NOT YET RELIEVED', short: 'DOLORES', subtitle: 'NOT YET RELIEVED',
  tagline: 'NEXT.',
  ability: { label: 'REPAIR COUNTER' },
  abilityDesc: 'PERMANENT UPGRADES FOR THE CAST. ASK DOLORES.',
  joke: 'NOW SERVING ZERO. PLEASE HAVE YOUR NUMBER READY.',
};

// The two counter staff land together, then the roll call still ends on a
// hero rather than the NPC bit.
export const CAST_HEROES = [
  ...HEROES.slice(0, -1),
  GARY_CAST,
  DOLORES_CAST,
  HEROES[HEROES.length - 1],
];

let castHeroSurface;

function paintCastPose(ctx, heroId, pose, cx, feetY) {
  // Gnash's actual dash read comes from the moving ghosts as much as the lean.
  // Reproduce that layer in the roll call rather than reducing SPIN DASH to a
  // slightly tilted run pose. The offsets scale with the 104u cast figure.
  if (pose.castDash) {
    drawToon(ctx, heroId, pose, cx - 18, feetY, 104, { alpha: 0.16 });
    drawToon(ctx, heroId, pose, cx - 10, feetY, 104, { alpha: 0.28 });
  }
  drawToon(ctx, heroId, pose, cx, feetY, 104);
}

// The gallery's CRT filter is intentionally applied to the hero tile rather
// than the whole cast screen. This keeps the dossier copy crisp while giving
// the character the same RGB fringe and scanline treatment as the high-res
// gallery preview.
function drawCastHero(ctx, heroId, pose, cx, feetY) {
  if (typeof document === 'undefined') {
    paintCastPose(ctx, heroId, pose, cx, feetY);
    return;
  }

  try {
    if (!castHeroSurface) {
      const canvas = document.createElement('canvas');
      const off = canvas.getContext('2d');
      if (!off) throw new Error('cast hero canvas unavailable');
      castHeroSurface = { canvas, off };
    }

    const { canvas, off } = castHeroSurface;
    const w = CAST_HERO_TILE * CAST_HERO_SCALE;
    const h = CAST_HERO_TILE * CAST_HERO_SCALE;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    off.setTransform(CAST_HERO_SCALE, 0, 0, CAST_HERO_SCALE, 0, 0);
    off.clearRect(0, 0, CAST_HERO_TILE, CAST_HERO_TILE);
    paintCastPose(off, heroId, pose, CAST_HERO_TILE / 2, CAST_HERO_FLOOR);

    // Shift red one physical pixel left and blue one physical pixel right;
    // alternate scanlines are dimmed like the existing gallery CRT filter.
    const source = off.getImageData(0, 0, w, h).data;
    const image = off.createImageData(w, h);
    if (!image || !image.data || image.data.length !== source.length) throw new Error('image data unavailable');
    const output = image.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const left = (y * w + Math.max(0, x - 1)) * 4;
        const right = (y * w + Math.min(w - 1, x + 1)) * 4;
        const alpha = Math.max(source[i + 3], source[left + 3], source[right + 3]);
        if (!alpha) continue;
        const dim = y & 1 ? 0.7 : 1.06;
        output[i] = source[left] * dim;
        output[i + 1] = source[i + 1] * dim;
        output[i + 2] = source[right + 2] * dim;
        output[i + 3] = alpha;
      }
    }
    off.putImageData(image, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      canvas,
      cx - CAST_HERO_TILE / 2,
      feetY - CAST_HERO_FLOOR,
      CAST_HERO_TILE,
      CAST_HERO_TILE,
    );
  } catch {
    // Keep headless test contexts and unusual canvas implementations usable.
    paintCastPose(ctx, heroId, pose, cx, feetY);
  }
}

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

  isLast() { return this.i === CAST_HEROES.length - 1; }
  slotLen() { return SLOT_T + (this.isLast() ? TAIL_T : 0); }
  heroTapped() {
    if (!Input.pressed('pointer')) return false;
    const k = this.reduced ? 1 : Math.min(1, this.slotT / FADE_T);
    const ease = 1 - (1 - k) * (1 - k);
    const cx = 108 + (1 - ease) * -26;
    const { feetOff } = this.poseFor(CAST_HEROES[this.i], false);
    const feetY = FLOOR_Y - feetOff;
    return Input.pointer.x >= cx - 75 && Input.pointer.x <= cx + 75
      && Input.pointer.y >= feetY - 140 && Input.pointer.y <= feetY + 20;
  }

  update(dt) {
    // Left/A and Right/D: navigate without leaving the roll call.
    if (Input.activity !== this.actTok) {
      const advance = Input.pressed('right') || this.heroTapped();
      const retreat = Input.pressed('left');
      Input.clearAll();
      this.actTok = Input.activity;
      if (advance) {
        if (!this.isLast()) { this.i++; this.slotT = 0; }
        return;
      }
      if (retreat) {
        if (this.i > 0) { this.i--; this.slotT = 0; }
        return;
      }
      // Other human input: bail to the title (no interlude).
      this.o.onExit(false);
      return;
    }
    this.t += dt;
    this.slotT += dt;
    if (this.slotT >= this.slotLen()) {
      this.slotT = 0;
      this.i++;
      if (this.i >= CAST_HEROES.length) { this.o.onExit(true); return; } // whole cast seen
    }
    Input.endFrame();
  }

  // The hero acts for a beat once they've settled in.
  poseFor(hero, intro) {
    const t = this.t;
    const beat = this.slotT;
    const pose = {
      kind: 'run', grounded: true, time: t, menu: true,
      phase: (beat * CAST_GAIT_RATE) % 1,
    };
    if (this.reduced) return { pose, feetOff: 0 };

    if (hero.id === 'lorenzo') {
      // Lorenzo's card demonstrates the actual wrench kit instead of the
      // curtain-call celebration: walk continuously, layer one readable
      // working swing over the gait, then keep walking. Only the upper-body
      // arm targets change; phase and legs never stop or restart. The cast
      // version gives the 0.3s gameplay action 0.55s of screen time without
      // changing its authored wind-up / hit / recovery proportions.
      pose.phase = (beat * 1.5) % 1;
      if (beat >= LORENZO_ATTACK_IN && beat < LORENZO_ATTACK_IN + LORENZO_ATTACK_T) {
        const local = beat - LORENZO_ATTACK_IN;
        pose.menuAction = 'smash';
        pose.actionTime = local / LORENZO_ATTACK_T * 0.3;
      }
      return { pose, feetOff: 0 };
    }

    if (hero.id === 'dolores') {
      // Dolores does not perform for the camera. Her shift is still in
      // progress, so she keeps walking through the whole card: no celebration
      // and, like every other roll-call card, no idle pause.
      pose.phase = (beat * CAST_GAIT_RATE) % 1;
      return { pose, feetOff: 0 };
    }

    if (hero.id === 'gnash' || hero.id === 'fernwick') {
      // These two demonstrate a locomotion ability, so a pause actively works
      // against the verb. Keep moving at a constant rate for 70%, land the
      // whole-number gait on a planted frame, then enter the gameplay special.
      if (beat < PERFORMANCE_IN) {
        pose.phase = hero.id === 'gnash'
          ? gnashGaitPhase(beat)
          : (beat * CAST_GAIT_RATE) % 1;
      } else {
        pose.time = beat - PERFORMANCE_IN;
        if (hero.id === 'gnash') {
          pose.kind = 'run';
          pose.phase = (pose.time * 3.1) % 1;
          pose.lean = 0.26;
          pose.castDash = true;
        } else {
          pose.kind = 'duck';
          pose.phase = 0;
          pose.roll = true;
        }
      }
      return { pose, feetOff: 0 };
    }

    if (hero.id === 'grumpos') {
      if (beat >= GRUMPOS_CELEBRATE_IN) {
        pose.kind = 'celebrate';
        pose.phase = 0;
        pose.time = beat - GRUMPOS_CELEBRATE_IN;
      } else {
        pose.phase = (beat * GRUMPOS_GAIT_RATE) % 1;
      }
      return { pose, feetOff: 0 };
    }

    if (beat >= PERFORMANCE_IN) {
      pose.time = beat - PERFORMANCE_IN;
      // Everyone else uses the same approved routine as the results curtain
      // call, and never falls back to walking before the next card arrives.
      pose.kind = 'celebrate';
      pose.phase = 0;
    }
    return { pose, feetOff: 0 };
  }

  draw(ctx) {
    const hero = CAST_HEROES[Math.min(this.i, CAST_HEROES.length - 1)];
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

    // spotlight cone onto the floor. It is mostly steady, but the old arcade
    // fixture has a little mechanical drift and electrical flutter.
    const hx = 108;
    const spotX = hx + Math.sin(t * 0.75) * 4.5 + Math.sin(t * 1.9 + 0.7) * 1.8;
    const spotFlicker = 0.84 + Math.sin(t * 5.3) * 0.07 + Math.sin(t * 13.1 + 1.2) * 0.045;
    const beamTop = -24;
    const cone = ctx.createLinearGradient(spotX, beamTop, spotX, FLOOR_Y);
    cone.addColorStop(0, `rgba(246,211,60,${0.16 * spotFlicker})`);
    cone.addColorStop(1, 'rgba(246,211,60,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(spotX - 17, beamTop);
    ctx.lineTo(spotX + 17, beamTop);
    ctx.lineTo(spotX + 62, FLOOR_Y);
    ctx.lineTo(spotX - 62, FLOOR_Y);
    ctx.closePath();
    ctx.fill();

    // floor + pooled light
    ctx.fillStyle = '#171222';
    ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    ctx.fillStyle = `rgba(246,211,60,${0.09 * spotFlicker})`;
    ctx.beginPath();
    ctx.ellipse(spotX, FLOOR_Y + 2, 58, 9, 0, 0, Math.PI * 2);
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
    drawCastHero(ctx, hero.id, pose, hx + (1 - ease) * -26, FLOOR_Y - feetOff);
    ctx.restore();

    // --- the card ----------------------------------------------------------
    const tx = 196 + (1 - ease) * 18;
    ctx.save();
    ctx.globalAlpha = ease;
    let y = 62;
    drawText(ctx, hero.short, tx, y, '#ffd94a', 2);
    y += 26;
    // Avoid repeating the displayed name: GRUMPOS followed by GRUMPOS, DAD OF
    // BOY is redundant. Keep a second line only when it adds a distinct name.
    if (hero.subtitle || (hero.name !== hero.short && (hero.showFullName || !hero.name.startsWith(hero.short)))) {
      drawText(ctx, hero.subtitle || hero.name, tx, y, '#8a8a98');
      y += 14;
    }
    drawText(ctx, `"${hero.tagline}"`, tx, y, '#48e0c8');
    y += 20;

    ctx.fillStyle = 'rgba(246,211,60,0.5)';
    ctx.fillRect(tx, y - 2, 44, 1);
    y += 8;
    if (hero.ability.type) {
      drawText(ctx, 'SKILL: ' + (hero.skillLabel || hero.ability.label), tx, y, '#f6d33c');
      y += 14;
      for (const line of wrapText(hero.skillDesc || hero.abilityDesc, W - tx - 16, 1, 3)) {
        drawText(ctx, line, tx, y, '#c8c8d8');
        y += 11;
      }
      y += 6;
      drawText(ctx, 'MOVE: ' + hero.ability.label, tx, y, '#f6d33c');
      y += 14;
      for (const line of wrapText(hero.powerDesc || hero.abilityDesc, W - tx - 16, 1, 3)) {
        drawText(ctx, line, tx, y, '#c8c8d8');
        y += 11;
      }
    } else {
      drawText(ctx, hero.ability.label, tx, y, '#f6d33c');
      y += 14;
      for (const line of wrapText(hero.abilityDesc, W - tx - 16, 1, 3)) {
        drawText(ctx, line, tx, y, '#c8c8d8');
        y += 11;
      }
    }
    // The dossier footnote nobody asked for, filling the card's lower half.
    y += 6;
    for (const line of wrapText(hero.joke, W - tx - 16, 1, 3)) {
      drawText(ctx, line, tx, y, '#5a5a68');
      y += 11;
    }
    ctx.restore();

    // --- roll-call progress + exit hint ------------------------------------
    const dotW = 8;
    const x0 = W / 2 - (CAST_HEROES.length * dotW) / 2;
    for (let i = 0; i < CAST_HEROES.length; i++) {
      ctx.fillStyle = i === this.i ? '#f6d33c' : i < this.i ? '#5a5a68' : '#2a2a3a';
      ctx.fillRect(x0 + i * dotW, H - 30, 5, 3);
    }
    if (this.reduced || Math.floor(t * 1.6) % 2 === 0) {
      // isTouchDevice(), not usingTouch: this screen can be arrived at cold from
      // the attract loop, and 'PRESS ANY KEY' on a phone names hardware it does
      // not have.
      drawTextCentered(ctx, Input.isTouchDevice() ? 'TAP TO RETURN' : 'PRESS ANY KEY TO RETURN', W / 2, H - 18, '#8a8a98');
    }
  }
}
