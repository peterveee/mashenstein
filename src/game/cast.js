// Title attract: a roll call of the cast, one hero at a time, each announced
// by name with their tagline and what they actually do. Replaces the playable
// demo as the idle screen. Any HUMAN input exits immediately, except Left/A
// and Right/D which navigate the roll call and are consumed so they cannot
// fall through into a menu selection.
import {
  W, H, isPhonePortraitPresentation, presentationFrame,
} from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import {
  drawPanel, drawText, drawTextCentered, drawTextCenteredForPresentation,
  textWidth, textYForMid, wrapText, TEXT_INK_H,
} from '../engine/sprites.js';
import { drawToon, toonInkTop } from '../sprites/toons.js';
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
// Whole-cycle gait rates: the stride count lands exactly on the handoff, so the
// walking speed is constant right up to the celebration/special—no late brake
// and no half-raised foot. The cycle COUNT is the only speed control the cards
// have: nothing here is cached or frame-limited (the loop is a fixed 60 Hz and
// the hero tile is repainted every frame), so a low count is simply a slow walk.
// Sixteen cycles over 11.2s is 1.43 strides/s: a purposeful walk rather than the
// half-speed trudge eight cycles produced.
const CAST_GAIT_CYCLES = 16;
const CAST_GAIT_RATE = CAST_GAIT_CYCLES / PERFORMANCE_IN;
const GRUMPOS_GAIT_RATE = 8 / GRUMPOS_CELEBRATE_IN;
// Every card shares one rig at one stride length, so cadence is the only thing
// separating a walk from a run. The needlemouse never walks: he enters at 2.61
// cycles/s — near twice the cast's walk, a run on arrival — and winds up to
// exactly the 3.1 cycles/s of the Spin Dash he hands off into.
const GNASH_GAIT_CYCLES = 32;
const GNASH_GAIT_LINEAR = 0.915;
function gnashGaitPhase(beat) {
  const p = Math.max(0, Math.min(1, beat / PERFORMANCE_IN));
  // Integral of a linearly increasing gait rate. The 0.915/0.085 split is what
  // makes the entry cadence a run rather than a brisk walk: nearly all of the
  // stride budget is spent at speed, with the rest accelerating into the dash —
  // and it still accumulates exactly 32 complete strides at the handoff.
  const a = GNASH_GAIT_LINEAR;
  return (GNASH_GAIT_CYCLES * (a * p + (1 - a) * p * p)) % 1;
}
const FLOOR_Y = 214;
const CAST_HERO_TILE = 150;
const CAST_HERO_SCALE = 2;
const CAST_HERO_FLOOR = 140;

// Portrait is a different composition, not a taller copy of the landscape
// card. The logical frame stays 480 units wide, so these values are resolved
// against the published frame below and then painted with the loaded vector
// face. The base scales are the readable size at a 1x CSS/logical frame; the
// small density compensation keeps the physical type size steady on a narrow
// phone without allowing the long copy to escape its column.
const PORTRAIT_CAST_MARGIN = 26;
const PORTRAIT_CAST_HEADER_BASE = 5.2;
const PORTRAIT_CAST_NAME_BASE = 3.7;
// All dossier copy shares one scale. Only the screen heading and the hero's
// short name are intentionally larger; keeping the rest equal makes wrapped
// rows and section boundaries read as one typographic system.
const PORTRAIT_CAST_COPY_BASE = 2.0;
const PORTRAIT_CAST_PROMPT_BASE = 2.0;
const PORTRAIT_CAST_TOP_CSS = 52;
const PORTRAIT_CAST_COPY_GAP_CSS = 48;
const PORTRAIT_CAST_FOOTER_BOTTOM_CSS = 10;
const PORTRAIT_CAST_PROGRESS_TO_PROMPT_CSS = 22;
const PORTRAIT_CAST_FLOOR_TO_PROGRESS_CSS = 34;
const PORTRAIT_CAST_RULE_H = 32;
const PORTRAIT_CAST_LINE_GAP = 15;
const PORTRAIT_CAST_SECTION_GAP = 22;
const PORTRAIT_CAST_PROGRESS_W_CSS = 11;
const PORTRAIT_CAST_PROGRESS_H_CSS = 8;
const PORTRAIT_CAST_PROGRESS_STEP_CSS = 17;
const PORTRAIT_CAST_HERO_MIN = 150;
const PORTRAIT_CAST_HERO_MAX = 250;
const PORTRAIT_CAST_HERO_TARGET = 0.28;
const PORTRAIT_CAST_HERO_POSE_AIR = 0.18;
const PORTRAIT_CAST_HERO_TILE_BOTTOM = 16;

function castSecondaryName(hero) {
  return hero.subtitle
    || (hero.name !== hero.short && (hero.showFullName || !hero.name.startsWith(hero.short))
      ? hero.name : null);
}

function portraitScale(base, frame) {
  const frameScale = Number(frame?.scale);
  return base / (Number.isFinite(frameScale) && frameScale > 0 ? frameScale : 1);
}

function portraitLogicalCss(px, frame) {
  const frameScale = Number(frame?.scale);
  return px / (Number.isFinite(frameScale) && frameScale > 0 ? frameScale : 1);
}

function portraitFitScale(text, base, maxWidth, frame, style = 'ui') {
  const wanted = portraitScale(base, frame);
  const width = textWidth(text, wanted, style);
  return width > maxWidth ? wanted * maxWidth / width : wanted;
}

// The copy is kept as measured rows so the panel, the hero stage, and the
// actual text painter all use one height calculation. This matters on the
// shorter portrait frames: a fixed y list is how the old landscape card would
// eventually put the joke under the hero once the type got larger.
function portraitCastRows(hero, maxWidth, frame) {
  const rows = [];
  const copyScale = portraitScale(PORTRAIT_CAST_COPY_BASE, frame);
  const textRow = (text, scale, color, style = 'ui', gap = PORTRAIT_CAST_LINE_GAP) => {
    if (!text) return;
    rows.push({ kind: 'text', text: String(text), scale, color, style, gap });
  };
  const sectionGap = (height = PORTRAIT_CAST_SECTION_GAP) => {
    rows.push({ kind: 'section-gap', height });
  };
  const wrappedRows = (text, color, maxLines, style = 'ui') => {
    if (!text) return;
    for (const line of wrapText(text, maxWidth, copyScale, maxLines, style)) {
      textRow(line, copyScale, color, style);
    }
  };

  textRow(hero.short,
    portraitFitScale(hero.short, PORTRAIT_CAST_NAME_BASE, maxWidth, frame, 'bold'),
    '#ffd94a', 'bold');
  const secondary = castSecondaryName(hero);
  wrappedRows(secondary, '#98a0b8', 2);
  wrappedRows(`"${hero.tagline}"`, '#48e0c8', 2);
  rows.push({ kind: 'rule', height: PORTRAIT_CAST_RULE_H });

  const labelRow = (text) => textRow(text,
    copyScale, '#f6d33c', 'bold');
  if (hero.ability.type) {
    labelRow('SKILL: ' + (hero.skillLabel || hero.ability.label));
    wrappedRows(hero.skillDesc || hero.abilityDesc, '#c8c8d8', 4);
    sectionGap();
    labelRow('MOVE: ' + hero.ability.label);
    wrappedRows(hero.powerDesc || hero.abilityDesc, '#c8c8d8', 4);
    sectionGap();
  } else {
    labelRow(hero.ability.label);
    wrappedRows(hero.abilityDesc, '#c8c8d8', 4);
    sectionGap();
  }
  wrappedRows(hero.joke, '#98a0b8', 4);
  return rows;
}

function portraitRowsHeight(rows) {
  return rows.reduce((height, row) => height + (row.kind === 'rule' || row.kind === 'section-gap'
    ? row.height : TEXT_INK_H * row.scale + row.gap), 0);
}

// The toon height is the body height, not a guaranteed ink box: hats, ears,
// hair, props and celebration hops can all reach above it. Reserve that real
// top reach before sizing the stage and the CRT tile, so a portrait cast never
// loses the top of a hero to the offscreen filter canvas.
function portraitHeroTopRatio(heroId) {
  let measured = 1.28;
  try {
    const candidate = Number(toonInkTop(heroId));
    if (Number.isFinite(candidate) && candidate > 1) measured = candidate;
  } catch { /* keep the conservative headless fallback */ }
  return Math.min(1.7, Math.max(1.28, measured + PORTRAIT_CAST_HERO_POSE_AIR));
}

// Public so preview tooling and the focused regression can inspect the same
// contract the painter uses. Landscape deliberately retains its authored
// geometry and does not need a second set of numbers.
export function castLayout(hero = null) {
  if (!isPhonePortraitPresentation()) return { portrait: false };
  const frame = presentationFrame();
  const safe = frame?.safeRect || { left: 0, top: 0, right: W, bottom: H };
  const safeLeft = Math.max(0, Number(safe.left) || 0);
  const safeTop = Math.max(0, Number(safe.top) || 0);
  const safeRight = Math.min(W, Number.isFinite(Number(safe.right)) ? Number(safe.right) : W);
  const safeBottom = Math.min(H, Number.isFinite(Number(safe.bottom)) ? Number(safe.bottom) : H);
  const margin = Math.min(PORTRAIT_CAST_MARGIN, Math.max(18, (safeRight - safeLeft) * 0.12));
  const left = safeLeft + margin;
  const right = safeRight - margin;
  const width = Math.max(220, right - left);
  const center = (left + right) / 2;
  const headerScale = portraitFitScale('MEET THE CAST', PORTRAIT_CAST_HEADER_BASE,
    width, frame, 'bold');
  const headerMid = safeTop + PORTRAIT_CAST_TOP_CSS / (frame.scale || 1);
  const copyTop = headerMid + portraitLogicalCss(PORTRAIT_CAST_COPY_GAP_CSS, frame);
  const textRows = hero ? portraitCastRows(hero, width, frame) : [];
  const copyBottom = copyTop + portraitRowsHeight(textRows);
  const panelTop = Math.max(safeTop + 8, headerMid - 17);
  const panelBottom = copyBottom + 14;
  const promptScale = portraitScale(PORTRAIT_CAST_PROMPT_BASE, frame);
  const promptInkH = TEXT_INK_H * promptScale;
  const footerBottom = safeBottom - portraitLogicalCss(PORTRAIT_CAST_FOOTER_BOTTOM_CSS, frame);
  const hintMid = footerBottom - promptInkH / 2;
  const progressH = portraitLogicalCss(PORTRAIT_CAST_PROGRESS_H_CSS, frame);
  const progressW = portraitLogicalCss(PORTRAIT_CAST_PROGRESS_W_CSS, frame);
  const progressStep = portraitLogicalCss(PORTRAIT_CAST_PROGRESS_STEP_CSS, frame);
  const progressMid = hintMid - promptInkH / 2
    - portraitLogicalCss(PORTRAIT_CAST_PROGRESS_TO_PROMPT_CSS, frame);
  const progressY = progressMid - progressH / 2;
  const floorY = progressY - portraitLogicalCss(PORTRAIT_CAST_FLOOR_TO_PROGRESS_CSS, frame);
  // The floor is the line the toon is actually standing on. The footer below
  // it is deliberately separate, so the progress marks and return prompt do
  // not float above the figure as they did in the first portrait pass.
  const heroFeetY = floorY;
  const heroTopRatio = hero ? portraitHeroTopRatio(hero.id) : 1.46;
  const desiredHeroH = Math.max(PORTRAIT_CAST_HERO_MIN,
    Math.min(PORTRAIT_CAST_HERO_MAX, H * PORTRAIT_CAST_HERO_TARGET));
  // Keep the copy above the stage even on the shorter phone frames. The
  // portrait figure can give back some height, but never enough to become a
  // tiny landscape-sized thumbnail again.
  const availableHeroH = (heroFeetY - panelBottom - 36) / heroTopRatio;
  const heroH = Math.max(PORTRAIT_CAST_HERO_MIN,
    Math.min(desiredHeroH, availableHeroH));
  const heroTopReach = heroH * heroTopRatio;
  // On a short portrait frame, the larger line-height can consume the spare
  // headroom that normally separates the copy from the performance band. Let
  // the band start after the panel in that case, rather than letting its touch
  // region overlap the last joke line.
  const heroStageTop = Math.max(panelBottom + 8,
    heroFeetY - heroTopReach - 24);
  const heroTileFloor = Math.ceil(heroTopReach + 10);
  const heroTile = heroTileFloor + PORTRAIT_CAST_HERO_TILE_BOTTOM;
  return {
    portrait: true,
    frame,
    safeTop,
    safeBottom,
    left,
    right,
    width,
    center,
    headerScale,
    headerMid,
    copyTop,
    copyBottom,
    panelTop,
    panelBottom,
    textRows,
    separatorW: Math.min(150, width * 0.42),
    separatorX: center - Math.min(150, width * 0.42) / 2,
    heroFeetY,
    floorY,
    heroH,
    heroTopReach,
    heroTile,
    heroTileFloor,
    heroStageX: 0,
    heroStageW: W,
    heroStageTop,
    progressY,
    progressW,
    progressH,
    progressStep,
    hintMid,
    promptScale,
    panelX: left - 12,
    panelW: width + 24,
    panelH: panelBottom - panelTop,
  };
}

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

// Retired from the relay, not from the arcade: Kiko took her slot in HEROES and
// Miss Chomp went back to the food court she always claimed. Her card is written
// the way Dolores' is — straight, no wink at having been a hero once — because
// she has not noticed she stopped being one. The tab is the oldest running joke
// between her and the serving line, so it is what her card is about.
const CHOMP_CAST = {
  id: 'chompo', name: 'MISS CHOMP, IN RESIDENCE', short: 'MISS CHOMP', subtitle: 'IN RESIDENCE',
  tagline: 'THE FOOD COURT IS MY HOMELAND. I AM ITS QUEEN.',
  ability: { label: 'STANDING TAB' },
  abilityDesc: 'AN UNSETTLED ACCOUNT AT THE SERVING LINE. THE LEDGER DISAGREES.',
  joke: 'I CONSIDERED EATING GARY. HE DECLINED POLITELY. I RESPECTED THAT.',
};

// The three residents land together, then the roll call still ends on a hero
// rather than the NPC bit.
//
// This is the WHOLE cast, including Miss Chomp, who is currently nowhere in the
// building. What a given player is shown is castRollFor() below.
export const CAST_HEROES = [
  ...HEROES.slice(0, -1),
  GARY_CAST,
  DOLORES_CAST,
  CHOMP_CAST,
  HEROES[HEROES.length - 1],
];

// Who the roll call actually shows. Everyone except Miss Chomp: she is out of
// the food court and not placed anywhere else yet, and the roll call is
// advertising — advertising someone unreachable is the failure worth avoiding.
// Her card stays written and stays in CAST_HEROES, so whenever she is given a
// cameo the gate here is the one line that has to change back.
export function castRollFor(_slot) {
  return CAST_HEROES.filter((h) => h.id !== 'chompo');
}

let castHeroSurface;

function paintCastPose(ctx, heroId, pose, cx, feetY, heroH = 104) {
  // Gnash's actual dash read comes from the moving ghosts as much as the lean.
  // Reproduce that layer in the roll call rather than reducing SPIN DASH to a
  // slightly tilted run pose. The offsets scale with the cast figure.
  const motionScale = heroH / 104;
  if (pose.castDash) {
    drawToon(ctx, heroId, pose, cx - 18 * motionScale, feetY, heroH, { alpha: 0.16 });
    drawToon(ctx, heroId, pose, cx - 10 * motionScale, feetY, heroH, { alpha: 0.28 });
  }
  drawToon(ctx, heroId, pose, cx, feetY, heroH);
}

// The gallery's CRT filter is intentionally applied to the hero tile rather
// than the whole cast screen. This keeps the dossier copy crisp while giving
// the character the same RGB fringe and scanline treatment as the high-res
// gallery preview.
function drawCastHero(
  ctx, heroId, pose, cx, feetY,
  heroH = 104, tile = CAST_HERO_TILE, tileFloor = CAST_HERO_FLOOR,
  { crt = true, portrait = false } = {},
) {
  // The cast figure keeps the same CRT pass as the landscape card. The direct
  // path remains available for headless/diagnostic callers that explicitly
  // disable it, but portrait's user-facing hero uses the filtered tile too.
  if (!crt) {
    paintCastPose(ctx, heroId, pose, cx, feetY, heroH);
    return;
  }
  if (typeof document === 'undefined') {
    paintCastPose(ctx, heroId, pose, cx, feetY, heroH);
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
    const tileSize = Math.max(1, Math.round(tile));
    const w = tileSize * CAST_HERO_SCALE;
    const h = tileSize * CAST_HERO_SCALE;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    off.setTransform(CAST_HERO_SCALE, 0, 0, CAST_HERO_SCALE, 0, 0);
    off.clearRect(0, 0, tileSize, tileSize);
    paintCastPose(off, heroId, pose, tileSize / 2, tileFloor, heroH);

    // The portrait tile is supersampled, so one raw buffer pixel is only half
    // a logical pixel. Resize the CRT pass with it: use a one-logical-pixel
    // RGB spread and one-logical-pixel scanline bands. Without this, the
    // portrait hero gets a half-strength fringe and a subpixel stripe pattern
    // that downsampling turns into mush.
    const crtPixelScale = portrait ? CAST_HERO_SCALE : 1;
    const chromaShift = portrait ? CAST_HERO_SCALE * 2 : 1;
    const darkScanline = portrait ? 0.52 : 0.7;
    const brightScanline = portrait ? 1.16 : 1.06;
    const source = off.getImageData(0, 0, w, h).data;
    const image = off.createImageData(w, h);
    if (!image || !image.data || image.data.length !== source.length) throw new Error('image data unavailable');
    const output = image.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const left = (y * w + Math.max(0, x - chromaShift)) * 4;
        const right = (y * w + Math.min(w - 1, x + chromaShift)) * 4;
        const alpha = Math.max(source[i + 3], source[left + 3], source[right + 3]);
        if (!alpha) continue;
        const dim = Math.floor(y / crtPixelScale) & 1 ? darkScanline : brightScanline;
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
      cx - tileSize / 2,
      feetY - tileFloor,
      tileSize,
      tileSize,
    );
  } catch {
    // Keep headless test contexts and unusual canvas implementations usable.
    paintCastPose(ctx, heroId, pose, cx, feetY, heroH);
  }
}

export class CastState {
  static portraitMode = 'frame';

  // opts: { realSettings, onExit(autoAdvance) }
  constructor(opts) { this.o = opts || {}; }

  enter() {
    this.roll = castRollFor(this.o.slot);
    this.t = 0;
    this.i = 0;
    this.slotT = 0;
    this.actTok = Input.activity;
    Input.clearAll();
  }

  exit() { Input.clearAll(); }

  isLast() { return this.i === this.roll.length - 1; }
  slotLen() { return SLOT_T + (this.isLast() ? TAIL_T : 0); }
  heroTapped() {
    if (!Input.pressed('pointer')) return false;
    const hero = this.roll[this.i];
    if (isPhonePortraitPresentation()) {
      const layout = castLayout(hero);
      // The performance floor is intentionally a full-width touch target. The
      // hero is the visual subject of this whole band, and making a phone tap
      // land only on the figure's silhouette would turn the new wide stage
      // into a tiny target again.
      return Input.pointer.x >= 0 && Input.pointer.x <= W
        && Input.pointer.y >= layout.heroStageTop
        && Input.pointer.y <= H;
    }
    const k = Math.min(1, this.slotT / FADE_T);
    const ease = 1 - (1 - k) * (1 - k);
    const cx = 108 + (1 - ease) * -26;
    const { feetOff } = this.poseFor(hero, false);
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
      if (this.i >= this.roll.length) { this.o.onExit(true); return; } // whole cast seen
    }
    Input.endFrame();
  }

  drawPortrait(ctx, hero, ease) {
    const layout = castLayout(hero);
    const t = this.t;

    // --- backdrop: give the tall frame somewhere to breathe ---------------
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 48; i++) {
      const sx = (i * 91 + 17) % W;
      const sy = (i * 67 + 23) % Math.max(1, H - 12);
      ctx.globalAlpha = 0.18 + 0.34 * Math.abs(Math.sin(t * (0.75 + (i % 5) * 0.17) + i));
      ctx.fillStyle = i % 7 === 0 ? '#f6d33c' : '#6a6a9a';
      ctx.fillRect(sx, sy, 1, 1);
    }
    ctx.globalAlpha = 1;

    // The lower band is a real stage across the phone, not a narrow landscape
    // floor tucked behind the character. The cone runs down to the hero's
    // actual foot line; the footer below that line is reserved for progress
    // and the exit affordance.
    const spotX = layout.center + Math.sin(t * 0.75) * 5 + Math.sin(t * 1.9 + 0.7) * 2;
    const spotFlicker = 0.84 + Math.sin(t * 5.3) * 0.07 + Math.sin(t * 13.1 + 1.2) * 0.045;
    const beamTop = Math.max(0, layout.panelTop - 12);
    const cone = ctx.createLinearGradient(spotX, beamTop, spotX, layout.heroFeetY);
    cone.addColorStop(0, `rgba(246,211,60,${0.23 * spotFlicker})`);
    cone.addColorStop(0.34, `rgba(246,211,60,${0.15 * spotFlicker})`);
    cone.addColorStop(1, 'rgba(246,211,60,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(spotX - 24, beamTop);
    ctx.lineTo(spotX + 24, beamTop);
    ctx.lineTo(W + 36, layout.heroFeetY + 8);
    ctx.lineTo(-36, layout.heroFeetY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#171222';
    ctx.fillRect(0, layout.floorY, W, H - layout.floorY);
    ctx.fillStyle = `rgba(246,211,60,${0.07 * spotFlicker})`;
    ctx.fillRect(0, layout.floorY, W, 3);
    ctx.fillStyle = `rgba(246,211,60,${0.08 * spotFlicker})`;
    ctx.beginPath();
    ctx.ellipse(spotX, layout.floorY + 3, Math.min(150, W * 0.36), 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b2039';
    ctx.fillRect(0, layout.floorY + 5, W, 2);
    ctx.fillStyle = 'rgba(8,6,12,0.46)';
    ctx.beginPath();
    ctx.ellipse(layout.center, layout.floorY + 1, Math.min(76, W * 0.22), 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- dossier copy ------------------------------------------------------
    // Keep the dossier outline and its heading fixed. The dossier has no
    // fill or shadow, so the spotlight remains visible behind the copy.
    // Only the changing card copy slides/fades, so "MEET THE CAST" reads as a
    // screen heading rather than another character in the roll-call animation.
    drawPanel(ctx, layout.panelX, layout.panelTop, layout.panelW, layout.panelH, 8,
      'rgba(11,11,20,0)', { border: 'rgba(72,224,200,0.18)' });
    drawTextCenteredForPresentation(ctx, 'MEET THE CAST', layout.center,
      textYForMid(layout.headerMid, layout.headerScale, 'bold'), '#48e0c8',
      layout.headerScale, 'bold');
    ctx.save();
    ctx.globalAlpha = ease;
    ctx.translate(0, (1 - ease) * 18);
    let cursor = layout.copyTop;
    for (const row of layout.textRows) {
      if (row.kind === 'rule') {
        ctx.fillStyle = 'rgba(246,211,60,0.54)';
        ctx.fillRect(layout.separatorX, cursor + 7, layout.separatorW, 2);
        cursor += row.height;
        continue;
      }
      if (row.kind === 'section-gap') {
        cursor += row.height;
        continue;
      }
      const inkH = TEXT_INK_H * row.scale;
      const mid = cursor + inkH / 2;
      drawTextCenteredForPresentation(ctx, row.text, layout.center,
        textYForMid(mid, row.scale, row.style), row.color, row.scale, row.style);
      cursor += inkH + row.gap;
    }
    ctx.restore();

    // Keep the progress and exit affordance under the floor. The marks are
    // intentionally larger than the landscape dots and the whole footer is
    // anchored to the safe bottom edge, so it cannot drift up beside the hero.
    const totalDotsW = (this.roll.length - 1) * layout.progressStep + layout.progressW;
    const x0 = layout.center - totalDotsW / 2;
    for (let i = 0; i < this.roll.length; i++) {
      ctx.fillStyle = i === this.i ? '#f6d33c' : i < this.i ? '#5a5a68' : '#2a2a3a';
      ctx.fillRect(x0 + i * layout.progressStep, layout.progressY,
        layout.progressW, layout.progressH);
    }
    if (Math.floor(t * 1.6) % 2 === 0) {
      drawTextCenteredForPresentation(ctx,
        Input.isTouchDevice() ? 'TAP TO RETURN' : 'PRESS ANY KEY TO RETURN',
        layout.center, textYForMid(layout.hintMid, layout.promptScale),
        '#98a0b8', layout.promptScale);
    }

    // --- the hero: one large, sharp performance at the foot of the phone ---
    const { pose, feetOff } = this.poseFor(hero, false);
    ctx.save();
    ctx.globalAlpha = ease;
    drawCastHero(ctx, hero.id, pose,
      layout.center + (1 - ease) * -72,
      layout.heroFeetY - feetOff,
      layout.heroH, layout.heroTile, layout.heroTileFloor, { crt: true, portrait: true });
    ctx.restore();
  }

  // The hero acts for a beat once they've settled in.
  poseFor(hero, intro) {
    const t = this.t;
    const beat = this.slotT;
    const pose = {
      kind: 'run', grounded: true, time: t, menu: true,
      phase: (beat * CAST_GAIT_RATE) % 1,
    };
    if (hero.id === 'lorenzo') {
      // Lorenzo's card demonstrates the actual wrench kit instead of the
      // curtain-call celebration: walk continuously, layer one readable
      // working swing over the gait, then keep walking. Only the upper-body
      // arm targets change; phase and legs never stop or restart. The cast
      // version gives the 0.3s gameplay action 0.55s of screen time without
      // changing its authored wind-up / hit / recovery proportions.
      pose.phase = (beat * CAST_GAIT_RATE) % 1;
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
          pose.kind = 'slide';
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
    const hero = this.roll[Math.min(this.i, this.roll.length - 1)];
    const t = this.t;
    // Slide/fade the panel in at the top of each slot.
    const intro = this.slotT < FADE_T;
    const k = Math.min(1, this.slotT / FADE_T);
    let ease = 1 - (1 - k) * (1 - k);
    // The last hero fades out over the tail rather than being cut off.
    const left = this.slotLen() - this.slotT;
    if (this.isLast() && left < FADE_OUT_T) {
      ease *= Math.max(0, left / FADE_OUT_T);
    }

    if (isPhonePortraitPresentation()) {
      this.drawPortrait(ctx, hero, ease);
      return;
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
    const x0 = W / 2 - (this.roll.length * dotW) / 2;
    for (let i = 0; i < this.roll.length; i++) {
      ctx.fillStyle = i === this.i ? '#f6d33c' : i < this.i ? '#5a5a68' : '#2a2a3a';
      ctx.fillRect(x0 + i * dotW, H - 30, 5, 3);
    }
    if (Math.floor(t * 1.6) % 2 === 0) {
      // isTouchDevice(), not usingTouch: this screen can be arrived at cold from
      // the attract loop, and 'PRESS ANY KEY' on a phone names hardware it does
      // not have.
      drawTextCentered(ctx, Input.isTouchDevice() ? 'TAP TO RETURN' : 'PRESS ANY KEY TO RETURN', W / 2, H - 18, '#8a8a98');
    }
  }
}
