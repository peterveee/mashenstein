// Title, slot select, difficulty select (the joke), intro cutscene, results,
// finale, settings. All keyboard + touch navigable.
import { W, H, setFancyFx, setSceneGlow, setSkyFx, pushOverlayDraw } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { canInstall, showInstallGuide } from '../engine/install-prompt.js';
import { drawText, drawTextCentered, textWidth, getSprite, wrapText, platePath, drawMenuRow, textYForMid, TEXT_INK_H } from '../engine/sprites.js';
import {
  drawToon, titleParadeAction, b33pTitleShotPose, B33P_TITLE_WINDUP_T,
} from '../sprites/toons.js';
import { drawProp, hasProp, glowSprite, propFrames, propFps, propSprite } from '../sprites/props.js';
import { burst, spawnShard, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';

// Field-guide icon sizes (logical px) for vector props.
const GUIDE_ICON_SIZES = {
  cactus: [13, 19], snowman: [13, 19], crate: [12, 11], barrel: [13, 13], chair: [12, 10],
  tombstone: [11, 8], zombieWalk: [10, 14], resident: [10, 12], drone: [13, 8], buzzbird: [13, 8],
  icicle: [8, 10], cardboardMonster: [12, 9], printer: [12, 8], capStar: [9, 9],
  battery: [8, 9], boostPad: [14, 5], coin: [8, 8], capShield: [9, 9],
  capMagnet: [9, 9], capAirJump: [9, 9], capSpeed: [9, 9], capLowGrav: [9, 9], capUnpeel: [9, 9], capRelay: [9, 9], appliance: [17, 14], cord: [13, 8], fuse: [9, 7],
  eggshell: [24, 20], target: [9, 9],
};
import { DIFFICULTIES, INTRO_PANELS, FINALE_BEATS, FINALE_CODA, RANK_LINES } from '../data/jokes.js';
import { cabinetPalette, drawCabinetShell, drawCabinetScreen, drawScreenSweep } from '../sprites/arcade.js';
import { BRIEFINGS, BRIEFING_PROMPTS } from '../data/briefings.js';
import { CABINETS, HUB_THEME, TITLE_THEME, FINALE_THEME } from '../data/cabinets.js';
import { totalPlugs, MAX_PLUGS, formatCoins, nextStage, stageUnlocked } from './progress.js';

// See Input.confirmVerb — the word is shared with the in-run ACT card now, so
// it lives with the device test. Kept as a local name because every screen in
// this file reads better calling it bare.
const confirmVerb = () => Input.confirmVerb();

function menuNav(input, idx, len) {
  if (input.pressed('down') || input.pressed('right')) { Audio.sfx('ui'); return (idx + 1) % len; }
  if (input.pressed('up') || input.pressed('left')) { Audio.sfx('ui'); return (idx + len - 1) % len; }
  return idx;
}

const TAGLINES = [
  'NOW WITH 40% MORE UNPLUGGING',
  'THE ARCADE SMELLS LIKE VICTORY AND OLD NACHOS',
  'NO REFUNDS. THE MACHINE ATE YOUR QUARTER HONESTLY',
  'RATED E FOR EGGSHELL',
  'CONTAINS TRACE AMOUNTS OF PLUMBER',
  'THE TOASTER IS NOT A METAPHOR',
  'A HEDGEHOG LAWYER REVIEWED THIS TITLE SCREEN',
  'BATTERIES NOT INCLUDED. BATTERIES ARE THE PLOT',
  'THE CLOUD IS LAUGHING AT YOU SPECIFICALLY',
  'ESTABLISHED 198X. RENOVATED NEVER',
  'FLOOR MOPPED HOURLY BY A HAUNTED VACUUM',
  'EVERY PIXEL LOVINGLY REPLACED WITH MATH',
];

let titleGrad = null;
// Offsets here are in the 26-tall units the accents were drawn against; the
// caller scales the whole thing to whatever size the parade is running at.
function drawParadeAccent(ctx, id, x, feetY, p) {
  const fade = Math.sin(p * Math.PI);
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha *= fade * 0.9;
  if (id === 'lorenzo') {
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(x + 8, feetY - 24, 2, 5); ctx.fillRect(x + 6, feetY - 22, 6, 2);
  } else if (id === 'gnash') {
    ctx.strokeStyle = '#9ca8ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 12, feetY - 8); ctx.lineTo(x - 5, feetY - 8); ctx.moveTo(x - 10, feetY - 12); ctx.lineTo(x - 4, feetY - 12); ctx.stroke();
  } else if (id === 'fernwick') {
    ctx.fillStyle = '#d7ff83';
    ctx.fillRect(x - 11, feetY - 5, 3, 2); ctx.fillRect(x - 14, feetY - 3, 2, 2);
  } else if (id === 'b33p') {
    ctx.fillStyle = '#e8f8ff';
    ctx.fillRect(x + 10, feetY - 16, 5, 1); ctx.fillRect(x + 12, feetY - 18, 1, 5);
  } else if (id === 'mochi') {
    const yy = feetY - 27 - p * 5;
    ctx.fillStyle = '#c9a3f0';
    ctx.fillRect(x - 4, yy, 2, 2); ctx.fillRect(x, yy, 2, 2);
    ctx.fillRect(x - 3, yy + 2, 4, 2); ctx.fillRect(x - 2, yy + 4, 2, 2);
  } else if (id === 'chompo') {
    ctx.fillStyle = '#ffd184';
    ctx.fillRect(x + 11, feetY - 13, 2, 2); ctx.fillRect(x + 15, feetY - 17, 2, 2);
  } else if (id === 'raymn') {
    ctx.strokeStyle = '#f6d33c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 14, feetY - 18, 5, -1.1, 0.8); ctx.stroke();
  } else if (id === 'grumpos') {
    ctx.strokeStyle = '#f4d08a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 10, feetY - 23); ctx.lineTo(x - 14, feetY - 27);
    ctx.moveTo(x + 10, feetY - 23); ctx.lineTo(x + 14, feetY - 27); ctx.stroke();
  }
  ctx.restore();
}
// A space-invader wanders across the sky every so often, waggling its legs in
// the classic two-frame march. It is not part of any joke; it is just up there.
const INVADER_FRAMES = [
  ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.',
   '###########', '#.#######.#', '#.#.....#.#', '...##.##...'],
  ['..#.....#..', '#..#...#..#', '#.#######.#', '###.###.###',
   '###########', '.#########.', '..#.....#..', '.#.......#.'],
];
const INVADER_PIXEL = 1.35;
// It keeps to the very top of the sky, well clear of the logo. Every other
// pass is armed, and an armed pass drops a short little spread of bombs.
// Everything below is a pure function of the clock: no state to keep in sync.
const INV_FIRST = 24;      // the sky stays empty for the first half-minute
const INV_PERIOD = 46;     // ...and between fly-bys after that
const INV_CROSS = 11;      // slower than the hero parade, so targets change
// Spread the three releases across the fly-by. The middle one is a harmless
// near miss; the first and last are the only bombs allowed to connect.
const INV_DROP_PS = [0.10, 0.45, 0.80];
const INV_SPAN = W + 44;
const BOLT_G = 260;        // px/s^2
const BOLT_HEAD_Y = 227;   // where the parade's heads are
const KNOCK_T = 1.9;       // how long a clobbered hero stays airborne
const INV_HIT_RADIUS = 48;
const PARADE_EDGE_FADE = 32;
// How tall the cast stands on the title screen. The whole text stack above them
// is pinned well clear of this, so the parade gets the bottom strip to itself
// and reads at close to the size the heroes have in the food court.
// The title menu has been opened up, so the cast can read as characters rather
// than a thin footer strip. All parade proportions, tap radii and clearance
// bounds derive from this height.
const HERO_PARADE_H = 48;
// Every hop, accent and tap footprint below was tuned against a 26-tall parade;
// they scale off this rather than being re-eyeballed one at a time.
const PARADE_K = HERO_PARADE_H / 26;
const HERO_PARADE_SPEED = 42;
const HERO_PARADE_SPAN = W + 140;
const HERO_PARADE_DELAY = 3.5;
const HERO_ENTRY_GAP = 66 / HERO_PARADE_SPEED;
const HERO_ENTRY_JUMP_T = 2.1;
const HERO_ENTRY_JUMP_H = 30 * PARADE_K;
const HERO_ENTRY_ZOOM = 1.35;
// A tapped hero's startled little hop, overriding whatever they were doing.
const HERO_POKE_T = 0.4;
const HERO_POKE_H = 11 * PARADE_K;

const invX = (trip, p) => (trip % 2 === 0 ? -22 + p * INV_SPAN : W + 22 - p * INV_SPAN);
// Tucked right under the top edge: the marquee moved up to give the cast the
// bottom of the screen, so the fly-by has less sky to keep out of its way.
const invY = (trip, t) => 2 + (trip % 3) * 3 + Math.sin(t * 2.3) * 1.6;
const heroX = (i, t) => {
  const local = t - HERO_PARADE_DELAY - i * HERO_ENTRY_GAP;
  return local < 0 ? -70 : ((local * HERO_PARADE_SPEED) % HERO_PARADE_SPAN) - 70;
};
function paradeEdgeAlpha(x) {
  // Let each hero leave fully before the modulo wrap puts them back at the
  // left. This avoids a hard clipped pop when the toon or its accent is still
  // partly visible at either edge of the title screen.
  const entering = Math.max(0, Math.min(1, (x + PARADE_EDGE_FADE) / PARADE_EDGE_FADE));
  const leaving = Math.max(0, Math.min(1, (W + PARADE_EDGE_FADE - x) / PARADE_EDGE_FADE));
  return Math.min(entering, leaving);
}

// Rare, legally-distinct maze-wisp cameos. They share the heroes' floor line
// but are visitors rather than roster members: a small gang crosses once, then
// leaves the parade alone for long enough that the next appearance surprises.
const PARADE_SPEED = 42;
const PARADE_SPAN = W + 140;
const WISP_GAP = 38;
// Start when the lead wisp trails Lorenzo by 46px, then repeat only every
// third parade lap. This leaves a little breathing room before the guests.
const WISP_FIRST = PARADE_SPAN / PARADE_SPEED + 92 / PARADE_SPEED;
const WISP_PERIOD = (PARADE_SPAN / PARADE_SPEED) * 3;
const WISP_COLORS = ['#f06c88', '#66cbe8', '#f2a45f', '#ad82e8', '#79d48d'];
// Tapping any visitor spooks the whole crossing gang into a power-pellet
// fright: everyone on screen turns blue and scatters in place for a few
// seconds, still crossing normally rather than fleeing. Tapping one of them
// again while frightened eats it — the body drops away to just a pair of
// eyes that zip straight off whichever edge is nearest.
const WISP_TAP_RADIUS = 12 * PARADE_K;
// Top of the strip a tap has to land in to count as poking the parade rather
// than the menu. Tracks the tallest head, so it follows HERO_PARADE_H.
const PARADE_TAP_TOP = 268 - HERO_PARADE_H - 6;
// The visitors share the parade's floor line, so they share its scaling too —
// a fixed 0.68 left them knee-high once the cast grew.
const WISP_SCALE = 0.68 * PARADE_K;
const WISP_FRIGHT_T = 7;
const WISP_FRIGHT_COLOR = '#4a5be0';
const WISP_FRIGHT_FLASH_T = 2; // last stretch blinks blue/white, the classic warning
const WISP_EATEN_SPEED = 150;
// Scattering: each visitor still on screen when the fright starts breaks from
// the shared marching formula onto its own independent line — half hold still,
// half peel off backward — instead of the whole gang drifting on in the same
// lockstep it was in a moment ago. Once fright wears off (color reverts to
// normal), a scatterer freezes right where it is and waits for a clear gap in
// the hero line before calmly walking on and off screen.
const WISP_SCATTER_SPEED = 58;
// How close a hero can be to a spot before it no longer counts as clear for a
// calmed-down wisp to walk back out through.
const WISP_GAP_CLEARANCE = 22 * PARADE_K;
function wispScatterX(t, w) {
  if (w.frozen) {
    if (w.frozen.resumeAt == null) return w.frozen.x;
    return w.frozen.x + (t - w.frozen.resumeAt) * PARADE_SPEED;
  }
  if (w.mode === 'reverse') return w.x0 - (t - w.t0) * WISP_SCATTER_SPEED;
  return w.x0; // 'pause': holds until fright ends and a gap opens up
}
function heroGapAt(t, x, tapBombs) {
  for (let i = 0; i < HERO_PARADE.length; i++) {
    if (!heroOnScreen(i, t) || heroIsKnockedOut(i, t, tapBombs)) continue;
    if (Math.abs(heroX(i, t) - x) < WISP_GAP_CLEARANCE) return false;
  }
  return true;
}

function mazeWispPass(t) {
  if (t < WISP_FIRST) return null;
  const elapsed = t - WISP_FIRST;
  const trip = Math.floor(elapsed / WISP_PERIOD);
  const local = elapsed % WISP_PERIOD;
  const count = 1 + (trip % 2);
  // From the lead wisp touching the left edge until the final trailing wisp
  // has completely cleared the right. No alpha fade and no mid-screen cutoff.
  const cross = (W + 48 + (count - 1) * WISP_GAP) / PARADE_SPEED;
  if (local > cross) return null;
  return { trip, local, count };
}

function drawMazeWisp(ctx, x, feetY, color, phase, mood, scatter) {
  const bob = Math.sin(phase * Math.PI * 2) * (scatter ? 1.8 : 1.3);
  const swish = Math.sin(phase * (scatter ? 2.4 : 1.35) + mood) * (scatter ? 1.9 : 1.2);
  // Scattering reads as one fixed startled face, not the leisurely per-phase cycle.
  const face = scatter ? 1 : (Math.floor(phase * 0.42) + mood) % 4;
  const blinkClock = ((phase + mood * 1.31) % 6 + 6) % 6;
  const blinking = !scatter && blinkClock > 5.68;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(feetY + bob));
  ctx.scale(WISP_SCALE, WISP_SCALE);
  ctx.lineJoin = 'round';
  // Rounded hood, tapered sides and three uneven little skirt points make a
  // soft floating mascot rather than a literal arcade-ghost sprite.
  ctx.beginPath();
  ctx.moveTo(-9, 0); ctx.lineTo(-9, -16);
  ctx.bezierCurveTo(-9, -23, -4, -27, 0, -27);
  ctx.bezierCurveTo(5, -27, 9, -22, 9, -16);
  ctx.lineTo(9, swish * 0.35); ctx.lineTo(5, -4 - swish); ctx.lineTo(1, swish * 0.45);
  ctx.lineTo(-3, -4 + swish); ctx.lineTo(-7, -swish * 0.25); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(25,16,40,0.42)'; ctx.lineWidth = 1; ctx.stroke();
  // Each visitor scans the room on its own rhythm; the small vertical glance
  // keeps the pupils from looking like they merely slide on rails.
  const glanceX = Math.sin(phase * 0.83 + mood * 2.1) * 1.25;
  const glanceY = Math.cos(phase * 0.57 + mood) * 0.65;
  ctx.fillStyle = '#fff8e8';
  if (blinking) {
    ctx.strokeStyle = '#30204a'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(-5.8, -16); ctx.quadraticCurveTo(-3.3, -14.8, -0.8, -16);
    ctx.moveTo(0.8, -16); ctx.quadraticCurveTo(3.3, -14.8, 5.8, -16); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(-3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#30204a';
    ctx.beginPath(); ctx.arc(-3.3 + glanceX, -16 + glanceY, 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.3 + glanceX, -16 + glanceY, 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-3.65 + glanceX, -16.35 + glanceY, 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.95 + glanceX, -16.35 + glanceY, 0.32, 0, Math.PI * 2); ctx.fill();
  }
  // Expressions turn over at a leisurely pace rather than flickering with the
  // walk cycle: happy, surprised, doubtful, then determined.
  ctx.strokeStyle = '#6f3555'; ctx.lineWidth = 0.9; ctx.beginPath();
  if (face === 0) { ctx.arc(0, -11, 2.5, 0.15, Math.PI - 0.15); ctx.stroke(); }
  else if (face === 1) { ctx.ellipse(0, -9.5, 1.55, 2, 0, 0, Math.PI * 2); ctx.fillStyle = '#6f3555'; ctx.fill(); }
  else if (face === 2) { ctx.arc(0, -8, 2.3, Math.PI + 0.2, Math.PI * 2 - 0.2); ctx.stroke(); }
  else { ctx.moveTo(-2.3, -10); ctx.lineTo(2.3, -10.5); ctx.stroke(); }
  ctx.restore();
}

// The eaten state: just the eyes, screaming off toward the nearest edge —
// the body doesn't survive contact with a tap once frightened.
function drawWispEyes(ctx, x, feetY, dir) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(feetY));
  ctx.scale(WISP_SCALE, WISP_SCALE);
  const gx = dir * 1.4;
  ctx.fillStyle = '#fff8e8';
  ctx.beginPath(); ctx.ellipse(-3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#30204a';
  ctx.beginPath(); ctx.arc(-3.3 + gx, -16, 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3.3 + gx, -16, 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMazeWispCameo(ctx, t, reduced, frightStart, eaten, scatter) {
  if (reduced) return;
  const frightActive = frightStart != null && t - frightStart < WISP_FRIGHT_T;
  // The last stretch blinks blue/white — the classic warning that fright is
  // about to wear off — on the same 8Hz clock the flicker uses elsewhere.
  const frightFlashing = frightActive && WISP_FRIGHT_T - (t - frightStart) < WISP_FRIGHT_FLASH_T
    && Math.floor((t - frightStart) * 8) % 2 === 0;
  const frightColor = frightFlashing ? '#fbfbf0' : WISP_FRIGHT_COLOR;
  // Eaten visitors run on their own clock, independent of the pass that
  // spawned them — often still zipping off well after their group has crossed.
  if (eaten) {
    for (const w of eaten.values()) {
      const x = w.x0 + w.dir * (t - w.t0) * WISP_EATEN_SPEED;
      if (x < -24 || x > W + 24) continue;
      drawWispEyes(ctx, x, 267, w.dir);
    }
  }
  // Scattering visitors also run on their own clock, independent of the
  // shared marching formula their pass would otherwise place them on.
  if (scatter) {
    for (const [key, w] of scatter) {
      if (eaten && eaten.has(key)) continue;
      const x = wispScatterX(t, w);
      if (x < -24 || x > W + 24) continue;
      ctx.fillStyle = 'rgba(4,3,9,0.25)';
      ctx.beginPath(); ctx.ellipse(x, 268, 5.5 * PARADE_K, 1.5 * PARADE_K, 0, 0, Math.PI * 2); ctx.fill();
      const color = frightActive ? frightColor : WISP_COLORS[w.colorIdx];
      drawMazeWisp(ctx, x, 267, color, t * 1.8 + w.colorIdx * 0.24, w.colorIdx % 3, !w.frozen);
    }
  }
  // No new visitor appears while the current episode (scattering or still
  // being eaten) is unresolved — the roster is fixed the moment fright starts.
  if ((eaten && eaten.size > 0) || (scatter && scatter.size > 0)) return;
  const pass = mazeWispPass(t);
  if (!pass) return;
  // All visitors share the parade's exact speed. Starting this traversal at
  // the aligned WISP_FIRST time places the leader 46px behind Lorenzo; the
  // remaining guests follow in the rest of the cast's reserved tail space.
  for (let i = 0; i < pass.count; i++) {
    const x = -24 + pass.local * PARADE_SPEED - i * WISP_GAP;
    if (x < -24 || x > W + 24) continue;
    ctx.fillStyle = 'rgba(4,3,9,0.25)';
    ctx.beginPath(); ctx.ellipse(x, 268, 5.5 * PARADE_K, 1.5 * PARADE_K, 0, 0, Math.PI * 2); ctx.fill();
    const color = frightActive ? frightColor : WISP_COLORS[(pass.trip + i) % WISP_COLORS.length];
    drawMazeWisp(ctx, x, 267, color, t * 1.8 + i * 0.24, (pass.trip + i) % 3, frightActive);
  }
}

// A tap landing on a not-yet-eaten maze-wisp visitor. Returns its map key and
// current x (so eating it knows which edge is nearest), or null.
function wispTapHit(t, px, py, eaten, scatter) {
  if (py < PARADE_TAP_TOP || py > 270) return null;
  if (scatter) {
    for (const [key, w] of scatter) {
      if (eaten && eaten.has(key)) continue;
      const x = wispScatterX(t, w);
      if (x < -24 || x > W + 24) continue;
      if (Math.abs(px - x) < WISP_TAP_RADIUS) return { key, x };
    }
  }
  // No new visitor to tap while the current episode is still unresolved.
  if ((eaten && eaten.size > 0) || (scatter && scatter.size > 0)) return null;
  const pass = mazeWispPass(t);
  if (!pass) return null;
  for (let i = 0; i < pass.count; i++) {
    const x = -24 + pass.local * PARADE_SPEED - i * WISP_GAP;
    if (x < -24 || x > W + 24) continue;
    if (Math.abs(px - x) < WISP_TAP_RADIUS) return { key: `${pass.trip}:${i}`, x };
  }
  return null;
}

// Which fly-by (if any) is on screen right now.
export function invaderPass(t) {
  if (t < INV_FIRST) return null;
  const e = t - INV_FIRST;
  const trip = Math.floor(e / INV_PERIOD);
  const p = (e % INV_PERIOD) / INV_CROSS;
  return p <= 1 ? { trip, p } : null;
}

// Flying-toaster cameos: a small, deterministic formation that crosses the
// entire title in front of both the menu and the cast. The count is varied per
// trip rather than per frame, so every appliance belongs to the same pass and
// screenshots/replays do not see the formation changing halfway across.
export const TITLE_TOASTER_MIN_COUNT = 1;
export const TITLE_TOASTER_MAX_COUNT = 5;
let titleToasterIntroSeen = false;
// The first space ship owns the opening sky beat. Its pass starts at 24s and
// takes 11s to cross, so toasters wait for it to clear plus a small breath.
const TOASTER_FIRST = INV_FIRST + INV_CROSS + 2;
const TOASTER_PERIOD = 29;
const TOASTER_SPEED = 72;
const TOASTER_GAP = 30;
const TOASTER_EDGE = 38;
const TOASTER_LANES = {
  1: [0],
  2: [-16, 16],
  3: [-22, 0, 22],
  4: [-27, -9, 9, 27],
  5: [-30, -15, 0, 15, 30],
};

function titleToasterCount(trip, singleOpening) {
  if (trip === 0 && singleOpening) return TITLE_TOASTER_MIN_COUNT;
  return 2 + Math.floor(shaderHash21(trip + 1, 23) * 4);
}

// Give each toaster its own point in the slow four-second toast cycle. The
// small index bias keeps neighbours apart, while the seeded phase makes the
// launch moments feel naturally irregular instead of like a ripple effect.
export function titleToasterStagger(trip, index) {
  return index * 0.14 + shaderHash21(trip + index + 71, 67) * 3.4;
}

// Which fly-by (if any) is on screen right now. Exported as a small visual
// contract so the title tests can pin the promised 1–4 range without needing
// to inspect pixels.
export function titleToasterPass(t, singleOpening = true) {
  if (t < TOASTER_FIRST) return null;
  // The spaceship owns the sky while it is crossing. The two effects are
  // both title foreground cameos, so never let their visible windows overlap
  // as the independent schedules drift over time.
  if (invaderPass(t)) return null;
  const elapsed = t - TOASTER_FIRST;
  const trip = Math.floor(elapsed / TOASTER_PERIOD);
  const count = titleToasterCount(trip, singleOpening);
  const cross = (W + TOASTER_EDGE * 2 + (count - 1) * TOASTER_GAP) / TOASTER_SPEED;
  const local = elapsed % TOASTER_PERIOD;
  if (local > cross) return null;
  return {
    trip,
    local,
    p: local / cross,
    count,
    dir: trip % 2 === 0 ? 1 : -1,
    centerY: 52 + shaderHash21(trip + 7, 41) * 112,
  };
}

function drawFlyingToasters(ctx, t, reduced, singleOpening) {
  if (reduced) return;
  const pass = titleToasterPass(t, singleOpening);
  if (!pass) return;
  const offsets = TOASTER_LANES[pass.count];
  for (let i = 0; i < pass.count; i++) {
    const x = pass.dir > 0
      ? -TOASTER_EDGE + pass.local * TOASTER_SPEED - i * TOASTER_GAP
      : W + TOASTER_EDGE - pass.local * TOASTER_SPEED + i * TOASTER_GAP;
    if (x < -TOASTER_EDGE - 42 || x > W + TOASTER_EDGE + 42) continue;
    const size = 32 + shaderHash21(pass.trip + i + 13, 59) * 13;
    const h = size * 0.82;
    const y = pass.centerY + offsets[i] + Math.sin(t * 2.2 + i * 0.8 + pass.trip) * 1.5;
    const edge = Math.min(1, Math.max(0, (x + TOASTER_EDGE) / TOASTER_EDGE), Math.max(0, (W + TOASTER_EDGE - x) / TOASTER_EDGE));
    const animationOffset = titleToasterStagger(pass.trip, i);
    const frame = Math.floor((t + animationOffset) * propFps('appliance')) % propFrames('appliance');
    // Rasterize one authored appliance size and scale it only at draw time.
    // Passing every random display size into propSprite used to create another
    // 96-frame canvas set per toaster, which eventually exhausts iOS canvas
    // memory during repeated title visits.
    const toaster = propSprite('appliance', 40, 33, frame);
    const lightPulse = 0.72 + Math.sin((t + animationOffset) * 2.4) * 0.18;
    ctx.save();
    ctx.globalAlpha *= edge;
    ctx.translate(Math.round(x), Math.round(y));
    if (pass.dir < 0) ctx.scale(-1, 1);
    // A soft warm pool makes the appliance feel lit against the dark title
    // sky. It breathes on the toaster's own phase, so a formation catches the
    // light in separate little moments instead of pulsing as one object.
    const halo = glowSprite('rgba(246,211,60,0.24)', 16);
    const haloSize = size * (1.35 + lightPulse * 0.18);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= 0.42 + lightPulse * 0.22;
    ctx.drawImage(halo, -haloSize / 2, -haloSize / 2, haloSize, haloSize);
    ctx.restore();
    if (toaster) ctx.drawImage(toaster, -size / 2, -h / 2, size, h);
    ctx.restore();
  }
}

// Whether hero i has actually appeared on screen yet at time t: past their
// entrance and not faded out at the parade's wrap edge. A bomb should only
// ever pick a target the player can actually see get hit — otherwise a
// not-yet-entered or already-offscreen hero snaps into view just to be flung.
function heroOnScreen(i, t) {
  const entryT = t - HERO_PARADE_DELAY - i * HERO_ENTRY_GAP;
  if (entryT < 0) return false;
  return paradeEdgeAlpha(heroX(i, t)) > 0;
}

function invaderBombsForTrip(trip) {
  if (trip < 0 || trip % 2 !== 0) return [];
  const bombs = [];
  const claimedVictims = new Set();
  let hitCount = 0;
  for (const [dropIndex, dropP] of INV_DROP_PS.entries()) {
    const tDrop = INV_FIRST + trip * INV_PERIOD + dropP * INV_CROSS;
    const x = invX(trip, dropP) + 5;
    const y0 = invY(trip, tDrop) + 8;
    const tHit = tDrop + Math.sqrt((2 * (BOLT_HEAD_Y - y0)) / BOLT_G);
    // A bomb landing within the hero's sprite width counts as a clobber. The
    // slightly generous radius makes the hit legible at the title's small scale.
    let victim = -1;
    if (dropIndex !== 1) {
      let best = INV_HIT_RADIUS;
      for (let i = 0; i < HERO_PARADE.length; i++) {
        if (claimedVictims.has(i) || !heroOnScreen(i, tHit)) continue;
        const d = Math.abs(heroX(i, tHit) - x);
        if (d < best) { best = d; victim = i; }
      }
    }
    if (victim >= 0 && hitCount >= 2) victim = -1;
    else if (victim >= 0) { hitCount++; claimedVictims.add(victim); }
    // Once the knockback has carried the hero away, their next scheduled
    // parade wrap is the first fair moment to let them rejoin the line.
    const phase = victim < 0 ? 0 : heroX(victim, tHit) + 70;
    const returnAt = victim < 0 ? Infinity : tHit + (HERO_PARADE_SPAN - phase) / HERO_PARADE_SPEED;
    bombs.push({ id: `${trip}:${dropP}`, tDrop, x, y0, tHit, victim, returnAt, dir: trip % 2 === 0 ? 1 : -1 });
  }
  return bombs;
}

function bombStrike(bomb, t) {
  if (t < bomb.tDrop || t > bomb.tHit + KNOCK_T) return null;
  if (t < bomb.tHit) {
    return { id: bomb.id, x: bomb.x, y: bomb.y0 + 0.5 * BOLT_G * (t - bomb.tDrop) * (t - bomb.tDrop), tHit: bomb.tHit };
  }
  return { id: bomb.id, x: bomb.x, y: BOLT_HEAD_Y, tHit: bomb.tHit, kt: t - bomb.tHit, victim: bomb.victim, dir: bomb.dir };
}

// The active bombs for the current pass, plus who each one lands on. Every
// other trip is armed on its own, giving the fly-by an exact 50% attack rate
// — but a tapped ship (tapBombs) drops one regardless of whether its trip
// was armed, so those are folded in independent of the trip check below.
function invaderStrikes(t, tapBombs) {
  const strikes = [];
  const pass = invaderPass(t);
  if (pass && pass.trip % 2 === 0) {
    for (const bomb of invaderBombsForTrip(pass.trip)) {
      const s = bombStrike(bomb, t);
      if (s) strikes.push(s);
    }
  }
  for (const bomb of tapBombs || []) {
    const s = bombStrike(bomb, t);
    if (s) strikes.push(s);
  }
  return strikes.length ? strikes : null;
}

function heroIsKnockedOut(i, t, tapBombs) {
  const latestTrip = Math.floor((t - INV_FIRST) / INV_PERIOD);
  // A knockback lasts less than one fly-by period, so the current and previous
  // attack passes cover every possible return window.
  if (latestTrip >= 0) {
    for (let trip = Math.max(0, latestTrip - 1); trip <= latestTrip; trip++) {
      for (const bomb of invaderBombsForTrip(trip)) {
        if (bomb.victim === i && t >= bomb.tHit && t < bomb.returnAt) return true;
      }
    }
  }
  for (const bomb of tapBombs || []) {
    if (bomb.victim === i && t >= bomb.tHit && t < bomb.returnAt) return true;
  }
  return false;
}

// A tap landing on the invader mid fly-by: makes it drop an extra bomb from
// its current spot regardless of whether this trip was already armed.
const INV_TAP_PAD = 9;
function invaderTapHit(t, px, py) {
  const pass = invaderPass(t);
  if (!pass) return null;
  const x = invX(pass.trip, pass.p), y = invY(pass.trip, t);
  if (px < x - INV_TAP_PAD || px > x + 11 * INVADER_PIXEL + INV_TAP_PAD || py < y - INV_TAP_PAD || py > y + 8 * INVADER_PIXEL + INV_TAP_PAD) return null;
  return { trip: pass.trip, x, y };
}

// Builds a bomb with the same shape invaderBombsForTrip produces, so it can
// flow through bombStrike/heroIsKnockedOut unmodified.
function makeTapBomb(id, tDrop, invaderX, invaderY, dir, tapBombs) {
  const x = invaderX + 5, y0 = invaderY + 8;
  const tHit = tDrop + Math.sqrt((2 * (BOLT_HEAD_Y - y0)) / BOLT_G);
  let victim = -1, best = INV_HIT_RADIUS;
  for (let i = 0; i < HERO_PARADE.length; i++) {
    if (!heroOnScreen(i, tHit) || heroIsKnockedOut(i, tHit, tapBombs)) continue;
    const d = Math.abs(heroX(i, tHit) - x);
    if (d < best) { best = d; victim = i; }
  }
  const phase = victim < 0 ? 0 : heroX(victim, tHit) + 70;
  const returnAt = victim < 0 ? Infinity : tHit + (HERO_PARADE_SPAN - phase) / HERO_PARADE_SPEED;
  return { id, tDrop, x, y0, tHit, victim, returnAt, dir };
}

// A tap landing on a parading hero: same rough footprint the invader bombs
// use to find a victim, keyed off the pointer instead of a bomb's landing
// site. Knocked-out heroes are mid-knockback (translated/rotated in their own
// draw branch) and not worth hit-testing against their nominal floor spot.
const HERO_TAP_RADIUS = 13 * PARADE_K;
function heroTapIndex(t, px, py, tapBombs) {
  if (py < PARADE_TAP_TOP || py > 270) return -1;
  for (let i = 0; i < HERO_PARADE.length; i++) {
    if (heroIsKnockedOut(i, t, tapBombs)) continue;
    const hx = heroX(i, t);
    if (paradeEdgeAlpha(hx) <= 0) continue;
    if (Math.abs(px - hx) < HERO_TAP_RADIUS) return i;
  }
  return -1;
}

// b33p doesn't take a poke lying down: tapping him fires a shot instead of
// the usual startled hop. It travels until it hits a hero (who goes through
// the same explode/knockback the invader's bombs use) or a wisp (who takes
// it exactly like a tap would — fright if calm, eaten if already blue).
const SHOT_SPEED = 220;
const SHOT_HIT_RADIUS = 12 * PARADE_K;
// Raised cannon muzzle, rather than the old hip-height projectile line.
const SHOT_Y = 268 - HERO_PARADE_H * 0.58;

function drawInvader(ctx, t) {
  const pass = invaderPass(t);
  if (!pass) return;
  const x = invX(pass.trip, pass.p), y = invY(pass.trip, t);
  const rows = INVADER_FRAMES[Math.floor(t * 3.5) % 2];
  ctx.fillStyle = '#a8ffc0';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '#') ctx.fillRect(Math.round(x) + c * INVADER_PIXEL, Math.round(y) + r * INVADER_PIXEL, INVADER_PIXEL, INVADER_PIXEL);
    }
  }
}

// The bolt itself: the classic wiggling bar, then a flat little starburst
// where it lands.
function drawBolt(ctx, t, strikes) {
  if (!strikes) return;
  for (const strike of strikes) {
    if (strike.kt === undefined) {
      const x = Math.round(strike.x + Math.sin(t * 22) * 0.5);
      const y = Math.round(strike.y);
      // A tiny, plain projectile keeps the homage closer to the original
      // Space Invaders drop. The contact effect supplies the visual punch.
      ctx.fillStyle = '#fff6a8';
      ctx.fillRect(x, y, 1, 5);
      continue;
    }
    if (strike.kt > 0.32) continue;
    const p = strike.kt / 0.32;
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = '#fff6a8';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillRect(Math.round(strike.x + Math.cos(a) * (3 + p * 12)), Math.round(strike.y + Math.sin(a) * (2 + p * 8)), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}

// b33p's shot: a short bright streak with a fading tail, punchier than the
// invader's plain falling bolt since this one travels the width of the screen.
function drawShots(ctx, t, shots) {
  if (!shots) return;
  for (const shot of shots) {
    if (t < shot.tFired) continue;
    const x = shot.x0 + (t - shot.tFired) * SHOT_SPEED;
    ctx.fillStyle = 'rgba(168,255,192,0.4)';
    ctx.fillRect(Math.round(x - 9), Math.round(shot.y), 6, 2);
    ctx.fillStyle = '#eaffef';
    ctx.fillRect(Math.round(x - 4), Math.round(shot.y), 4, 2);
  }
}

function drawInvaderImpact(ctx, strikes) {
  if (!strikes) return;
  for (const strike of strikes) {
    if (strike.kt === undefined || strike.victim < 0 || strike.kt >= 0.72) continue;
    const age = strike.kt;
    const ringP = Math.min(1, age / 0.42);
    const fade = Math.max(0, 1 - age / 0.72);
    const x = Math.round(strike.x);
    const y = BOLT_HEAD_Y;
    ctx.save();
    ctx.globalAlpha = fade;
    // A hot square core and a widening pixel ring sell contact even when the
    // hero immediately spins away from the impact point.
    ctx.fillStyle = '#fffbe0';
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(x - 5, y - 1, 10, 2);
    ctx.fillRect(x - 1, y - 5, 2, 10);
    ctx.strokeStyle = '#ff8b52';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 4 + ringP * 13, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + strike.victim * 0.37;
      const inner = 5 + ringP * 4;
      const outer = inner + 3 + ringP * 5;
      ctx.fillStyle = i % 2 ? '#ff8b52' : '#fffbe0';
      ctx.fillRect(Math.round(x + Math.cos(a) * inner), Math.round(y + Math.sin(a) * outer), 2, 2);
    }
    ctx.restore();
  }
}

function titleScene(ctx, t, reduced, poke, frightStart, eaten, scatter, tapBombs, shots) {
  // night sky over the last functioning food court
  if (!titleGrad) {
    titleGrad = ctx.createLinearGradient(0, 0, 0, H);
    titleGrad.addColorStop(0, '#07070f');
    titleGrad.addColorStop(0.65, '#141026');
    titleGrad.addColorStop(1, '#1c1430');
  }
  // Under WebGL the sky is generated on the GPU — gradient, drifting nebula,
  // parallax twinkle and the odd shooting star — so we leave a transparent
  // hole for it. Reduced flashing freezes its clock instead of animating.
  // Without WebGL, the old hand-drawn sky stands in.
  const gpuSky = setSkyFx(true, reduced ? 0 : t);
  ctx.clearRect(0, 0, W, H);
  if (!gpuSky) {
    ctx.fillStyle = titleGrad;
    ctx.fillRect(0, 0, W, H);
    // twinkling stars (the bright ones catch the bloom)
    for (let i = 0; i < 26; i++) {
      const sx = (i * 97 + 23) % W;
      const sy = (i * 53 + 11) % 110;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.1 + (i % 5) * 0.3) + i));
      ctx.globalAlpha = tw;
      ctx.fillStyle = i % 4 === 0 ? '#fff' : '#b8c8e8';
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }
  if (!reduced) drawInvader(ctx, t);

  // The nine-cabinet row used to stand here. It was competing with the marquee,
  // the save-file panel and the hero parade for the same screen, and the title
  // is not the place to inventory the arcade — the food court does that, at a
  // size where the machines actually read.

  // Ground plane. The checkered tiles went with the cabinets: with nothing
  // standing on it, the pattern was reading as arcade carpet on a screen that
  // is no longer an arcade. A flat band still gives the parade something to
  // walk on, and it starts higher than the text stack needs it to, because the
  // cast is what the bottom of the screen is for — a taller parade standing on
  // a deeper floor reads as a room rather than a strip of sprites.
  ctx.fillStyle = '#171222';
  ctx.fillRect(0, TITLE_FLOOR_Y, W, H - TITLE_FLOOR_Y);

  // The cast, the invader and its ordnance, returned as a painter instead of
  // drawn here — the caller hands it to pushOverlayDraw so it renders at DEVICE
  // resolution, the same treatment in-run heroes get.
  //
  // This is what made the whole roster look washed out on the title screen. The
  // parade was painting into the 480x270 backbuffer and being upscaled with it,
  // so a 36px-tall hero was blurred into the dark sky behind them — and blending
  // a character with the background is exactly how you desaturate one. Nothing
  // was wrong with the palettes; they were being averaged away. sprites/toons.js
  // has always said these are meant to be drawn at device resolution.
  const cast = (c) => {
    const touchCast = titleTouch();
    const castH = touchCast ? 38 : HERO_PARADE_H;
    const castK = castH / 26;
    const entryZoomExtra = touchCast ? 0.55 : HERO_ENTRY_ZOOM;
    // The cast still crosses the arcade, but each hero occasionally breaks into
    // a small personality beat. Cycles are offset so the parade stays readable.
    const strikes = reduced ? null : invaderStrikes(t, tapBombs);
    drawBolt(c, t, strikes);
    drawShots(c, t, shots);
    drawMazeWispCameo(c, t, reduced, frightStart, eaten, scatter);
    for (let i = 0; i < HERO_PARADE.length; i++) {
      const hx = heroX(i, t);
      const id = HERO_PARADE[i];
      // Clobbered: launched into a spin and tumbled off the side of the screen,
      // fading out before the parade loop would have wrapped them around.
      const strike = strikes?.find((candidate) => candidate.victim === i && candidate.kt < KNOCK_T);
      if (strike) {
        const kt = strike.kt;
        const kx = heroX(i, strike.tHit) + strike.dir * kt * 165;
        const ky = 268 - (kt * 190 - 0.5 * 150 * kt * kt);
        const knockScale = 1 + Math.min(0.8, kt * 0.42);
        c.save();
        c.globalAlpha = Math.min(1, (KNOCK_T - kt) / 0.5) * paradeEdgeAlpha(kx);
        // Keep the feet at the throw point while the body grows toward the
        // viewer, like the hero is being flung out of the title screen.
        c.translate(kx, ky);
        c.rotate(strike.dir * kt * 7);
        drawToon(c, id, { kind: 'jump', grounded: false, time: t, menu: true, phase: 0.5 }, 0, 0, castH * knockScale);
        c.restore();
        continue;
      }
      if (heroIsKnockedOut(i, t, tapBombs)) continue;
      const actionLength = 1.35;
      const beat = (t + i * 0.71) % 4.9;
      const entryT = t - HERO_PARADE_DELAY - i * HERO_ENTRY_GAP;
      const entering = entryT >= 0 && entryT < HERO_ENTRY_JUMP_T;
      const acting = !reduced && !entering && beat < actionLength;
      const actionP = acting ? beat / actionLength : 0;
      const pose = {
        kind: 'run', grounded: true, time: t, menu: true,
        phase: (t * 1.5 + i * 0.37) % 1,
      };
      let feetY = 268;
      if (entering) {
        const landing = entryT / HERO_ENTRY_JUMP_T;
        // Keep the gait moving during the airborne part so this reads as a
        // running leap into the arcade, not a frozen sprite sliding in.
        pose.kind = 'run'; pose.grounded = false; pose.vy = -260 + landing * 260;
        feetY -= Math.sin((1 - landing) * Math.PI / 2) * HERO_ENTRY_JUMP_H;
      }
      if (acting) {
        const action = titleParadeAction(id, t, actionP);
        Object.assign(pose, action.pose);
        feetY -= action.feetLift * castH;
      }
      // A tap startles whoever it lands on, overriding their signature beat —
      // getting poked takes priority over whatever bit they were mid-performing.
      const pokeAt = poke && poke.get(i);
      if (pokeAt != null && t - pokeAt < HERO_POKE_T) {
        const pokeP = (t - pokeAt) / HERO_POKE_T;
        if (id === 'b33p') {
          // Raise first, then fire and recoil. The projectile uses the same
          // wind-up delay below, so it cannot leave before the arm is level.
          Object.assign(pose, b33pTitleShotPose(t - pokeAt));
        } else {
          pose.kind = 'jump'; pose.grounded = false;
          feetY -= Math.sin(pokeP * Math.PI) * HERO_POKE_H;
        }
      }
      const edgeAlpha = paradeEdgeAlpha(hx);
      if (edgeAlpha <= 0) continue;
      const entryZoom = entering ? 1 + (1 - entryT / HERO_ENTRY_JUMP_T) * entryZoomExtra : 1;
      c.save();
      c.globalAlpha *= edgeAlpha;
      drawToon(c, id, pose, hx, feetY, castH * entryZoom);
      if (acting) {
        c.translate(hx, feetY);
        c.scale(castK, castK);
        drawParadeAccent(c, id, 0, 0, actionP);
      }
      c.restore();
    }
    drawInvaderImpact(c, strikes);
  };

  // The marquee: MASHENSTEIN in warm cartoon gold, outlined, stitched together
  // out of parts, and wired to a sign that has seen better decades. It stutters
  // twice in quick succession, then holds steady for a few seconds before the
  // next fit — a constant strobe reads as broken rather than characterful.
  ctx.globalAlpha = flickerAlpha(t, reduced);
  drawTextCentered(ctx, 'MASHENSTEIN', W / 2 + 1.5, TITLE_MARQUEE_Y + 1.5, '#a8791f', TITLE_SCALE, 'marquee');
  drawTextCentered(ctx, 'MASHENSTEIN', W / 2, TITLE_MARQUEE_Y, '#ffcf33', TITLE_SCALE, 'marquee');
  // The seams: six stitched joins where the letters were sewn back together.
  // Spread across the measured width of the logo rather than a fixed span, so
  // they stay on the lettering instead of dangling off the ends.
  ctx.strokeStyle = 'rgba(42,30,5,0.85)';
  ctx.lineWidth = 1.4;
  const logoW = textWidth('MASHENSTEIN', TITLE_SCALE, 'marquee');
  const seamK = TITLE_SCALE / 4;   // seam band tracks the logo's size
  const seamTop = TITLE_MARQUEE_Y + 4 * seamK, seamBot = TITLE_MARQUEE_Y + 22 * seamK;
  for (let i = 0; i < 6; i++) {
    const sx = W / 2 - logoW / 2 + (logoW * (i + 0.5)) / 6 - 4;
    ctx.beginPath(); ctx.moveTo(sx, seamTop); ctx.lineTo(sx + 8, seamBot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 8, seamTop); ctx.lineTo(sx, seamBot); ctx.stroke();
  }
  drawTextCentered(ctx, 'THE UNPLUGGENING', W / 2, TITLE_SUBTITLE_Y, '#5fd6c8', 1, 'subtitle');
  ctx.globalAlpha = 1;

  // A live power cord dangles off the logo, swinging, occasionally sparking.
  // The anchor tracks the measured width so the cord stays bolted to the last
  // letter — hardcoding it left the cord dangling in mid air once the marquee's
  // letter-spacing changed and the lettering shrank away from under it.
  // It hangs straight down from the corner of the sign and swings as one piece.
  // Anchoring the top to the letter while leaving the bottom where it used to be
  // turned the cord into a permanent diagonal, which read as a mistake.
  // The anchor sits INSIDE the last letter's ink, near its foot: the measured
  // advance includes the N's right side bearing, so parking the cord at the raw
  // logoW edge floated it in the gap beside the letter, and starting it halfway
  // up the letterform read as a wire crossing the sign rather than leaving it.
  const ax = W / 2 + logoW / 2 - 5 * seamK, ay = TITLE_MARQUEE_Y + 24 * seamK;
  const sway = reduced ? 0 : Math.sin(t * 1.15) * 9;
  // Stops short of the panel so the plug swings in open air at any phase of the
  // swing, instead of disappearing behind the menu at one end of its arc.
  const px2 = ax + sway, py2 = TITLE_PANEL_Y - 16;
  ctx.strokeStyle = '#241c30';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + sway * 0.4, (ay + py2) / 2 + 8, px2, py2);
  ctx.stroke();
  // A grommet where the cord leaves the sign, so the join reads as deliberate
  // hardware instead of a line that happens to end on a letter.
  ctx.fillStyle = '#241c30';
  ctx.beginPath();
  ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a48';
  ctx.fillRect(px2 - 3, py2, 6, 8);
  ctx.fillStyle = '#8a8a98';
  ctx.fillRect(px2 - 2, py2 + 8, 1.6, 3);
  ctx.fillRect(px2 + 0.6, py2 + 8, 1.6, 3);
  if (flickerDark(t, reduced)) {
    // Zap: sparks plus the same cached radial glow the power capsules use. A
    // flat translucent rectangle read as a yellow card sitting behind the plug
    // — a radial falloff has no edge to mistake for a background.
    const glow = glowSprite('rgba(246,211,60,0.3)', 6);
    ctx.drawImage(glow, px2 - 7, py2 + 2, 14, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px2 - 4 + ((i * 37 + Math.floor(t * 60)) % 8), py2 + 9 + (i % 3) * 2, 1.6, 1.6);
    }
  }
  return cast;
}
// Shuffled each time we enter the title so the cast doesn't always cross in the
// same order. Mutated in place (Fisher-Yates) so every reader that indexes into
// it — the parade draw, heroX, the invader strike — stays in agreement.
const HERO_PARADE = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'raymn', 'grumpos'];
function shuffleParade() {
  for (let i = HERO_PARADE.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [HERO_PARADE[i], HERO_PARADE[j]] = [HERO_PARADE[j], HERO_PARADE[i]];
  }
}

// Title menu geometry, shared by the renderer and the touch hit-test so a tap
// always lands on the row it looks like it lands on.
// The stack is tight: marquee, subtitle, panel, then the two footer lines, all
// of which have to finish above the cast's heads at 268 - HERO_PARADE_H.
const TITLE_SCALE = 4.4;        // sized so the logo spans about the panel's width
// Set by build.js ahead of the bundle, and only for `npm run dev` — the
// published build never defines it, so this is '' and the title draws no stamp.
const BUILD_STAMP = (typeof window !== 'undefined' && window.__MASH_BUILD__) || '';
// The stack rides high: only enough headroom above the marquee for the invader
// to cross without clipping the lettering, so everything the text needs is
// spent above the cast rather than in the middle of the screen.
const TITLE_MARQUEE_Y = 20;
const TITLE_SUBTITLE_Y = 61;
const TITLE_PANEL_Y = 80;
const TITLE_FLOOR_Y = 194;      // horizon line, above the parade's own strip
const TITLE_PANEL_PAD = 10;     // panel height beyond the rows themselves
const TITLE_PANEL_W = 220;
const TITLE_PANEL_X = W / 2 - TITLE_PANEL_W / 2;
// The footer hangs off the bottom of the panel rather than sitting at a fixed
// y, because the panel grows with the number of save files — pinning it would
// leave the gap different on a 4-row menu than a 5-row one. The gap matches
// the one above the panel, so the subtitle and the footer frame it evenly.
const TITLE_FOOTER_GAP = 12;
const TITLE_FOOTER_LINE_H = 11;
// The tagline and the attract countdown were set at 0.875 — about 10 CSS px on
// a phone, under the smallest size iOS itself sets body copy at. There is room
// under the panel for a full-size line, so they get one.
const TITLE_FLAVOR_S = 1;
// A row is only ever as tall as its share of the band between the panel's top
// and the lowest it may reach, capped so a short menu doesn't sprawl.
//
// Touch gets its own pair of numbers. The canvas scales by min(w/480, h/270),
// so a phone in landscape is height-limited at roughly 1.45 CSS px per logical
// unit — a 12-unit row lands at 17 CSS px, well under the 44pt/48dp minimum
// every platform asks for. Touch therefore spends the footer's second line (see
// the draw below) on taller rows, while keeping the panel compact enough to
// share the lower title with the foreground cast.
const TITLE_ROW_H = 24;
const TITLE_ROW_H_TOUCH = 29;
// The title menu has only three files and EXTRAS now, so its labels can use
// the room instead of inheriting the compact scale used by denser menus.
// Touch gets the larger step because the canvas is displayed smaller per
// logical unit on a phone, while the row height keeps the text comfortably
// inside the tap target.
const TITLE_MENU_TEXT_S = 1.35;
const TITLE_PANEL_MAX_BOTTOM = 190;
const TITLE_PANEL_MAX_BOTTOM_TOUCH = 216;
// isTouchDevice(), not usingTouch: a phone should get the touch layout on its
// FIRST paint, not only once a finger has landed. Both the renderer and the tap
// hit-test read this, so a tap always lands on the row it looks like it does.
function titleTouch() { return Input.isTouchDevice(); }
function titleRowH(count) {
  const touch = titleTouch();
  const bottom = touch ? TITLE_PANEL_MAX_BOTTOM_TOUCH : TITLE_PANEL_MAX_BOTTOM;
  const fits = Math.floor((bottom - TITLE_PANEL_Y - TITLE_PANEL_PAD) / count);
  return Math.min(touch ? TITLE_ROW_H_TOUCH : TITLE_ROW_H, fits);
}
// Top edge of row i's band. Rows own the full height between these edges, so
// the highlight, the lettering and the tap target all derive from one number.
function titleRowTop(i, rowH) { return TITLE_PANEL_Y + TITLE_PANEL_PAD / 2 + i * rowH; }
// Which row a pointer landed on, or -1. Bounded in x as well as y: without it
// a tap anywhere across the full 480-unit width — out over the starfield, or
// the parade — counted as a tap on whichever row shared its y.
function titleRowAt(px, py, count) {
  if (px < TITLE_PANEL_X - 6 || px > TITLE_PANEL_X + TITLE_PANEL_W + 6) return -1;
  const rowH = titleRowH(count);
  const i = Math.floor((py - titleRowTop(0, rowH)) / rowH);
  return i >= 0 && i < count ? i : -1;
}

// Both of the title's modal lists — ERASE and EXTRAS — are sized from here, so
// they share one box, one row pitch and one hit-test. Touch rows are nearly
// twice as tall, which matters most for ERASE: it is the only list in the game
// that destroys data, and a single tap commits each step.
// ERASE carries a warning line under its heading and EXTRAS doesn't, so the
// header comes in two heights — reserving room for a line that isn't there
// left the list floating well below its own title.
const MODAL_HEAD_H = 42;        // heading plus a note line
const MODAL_HEAD_H_BARE = 28;   // heading alone
function modalListGeom(count, hasNote) {
  const rowH = titleTouch() ? 30 : 21;
  const headH = hasNote ? MODAL_HEAD_H : MODAL_HEAD_H_BARE;
  // Sized from the row count rather than pinned. The old fixed 92-unit box
  // wasn't tall enough for its own longest list — three files plus CANCEL
  // needed 102, so the last row was drawn below the box's bottom edge.
  const h = headH + count * rowH + 8;
  // Centred, with a floor low enough that the tallest list — EXTRAS at seven
  // rows on touch — still centres instead of being pinned to the top and
  // hanging off the bottom.
  const y = Math.max(8, Math.round((H - h) / 2));
  return { x: 88, y, w: W - 176, h, rowH, firstY: y + headH };
}
function modalRowAt(px, py, count, hasNote) {
  const g = modalListGeom(count, hasNote);
  if (px < g.x || px > g.x + g.w) return -1;
  const i = Math.floor((py - g.firstY) / g.rowH);
  return i >= 0 && i < count ? i : -1;
}

// JavaScript twin of the starfield shader's hash21. This lets the audio fire
// only on 6.5-second cycles where the shader actually draws a shooting star.
function shaderHash21(x, y) {
  let px = ((x * 123.34) % 1 + 1) % 1;
  let py = ((y * 456.21) % 1 + 1) % 1;
  const d = px * (px + 45.32) + py * (py + 45.32);
  px += d; py += d;
  const v = px * py;
  return v - Math.floor(v);
}

// A tired neon sign: two fast blinks, then it holds steady until the next
// short-out. reducedFlashing pins it fully lit.
//
// The stutter runs on the SONG's clock, not a wall clock — one short-out on the
// downbeat of every two-bar block, blinking on 32nds. A sign shorting out in
// time with the music reads as part of the arcade rather than a loose timer
// ticking over the top of it, and locking to the block means it lands where the
// bank's own phrase turns over. Audio.songBeat() is null before the context
// exists (or in headless tests), so the old free-running period is the fallback.
const FLICKER_BEATS = 4;      // one short-out per bar
const FLICKER_SLOT = 0.25;    // blink slot, in beats
const FLICKER_DARK_BEATS = 0.125;
const FLICKER_PERIOD = 4.5;   // fallback wall clock, matched to the musical rate
const FLICKER_BLINK = 0.21;
const FLICKER_DARK = 0.09;
// The sign doesn't stutter on its own — the cord shorting out is what does it.
// Both the marquee and the plug read this one phase, so the spark lands on the
// exact frames the lettering drops out and the two read as cause and effect.
// On their own clocks they drifted, and the sign looked merely broken.
function flickerDark(t, reduced) {
  if (reduced) return false;
  const beat = Audio.songBeat();
  if (beat == null) {
    const phase = t % FLICKER_PERIOD;
    if (phase >= FLICKER_BLINK * 2) return false;
    return (phase % FLICKER_BLINK) < FLICKER_DARK;
  }
  const phase = ((beat % FLICKER_BEATS) + FLICKER_BEATS) % FLICKER_BEATS;
  if (phase >= FLICKER_SLOT * 2) return false;
  return (phase % FLICKER_SLOT) < FLICKER_DARK_BEATS;
}
// Softer than a full dropout: the sign browns out and recovers, rather than
// switching off. A hard blink at this size read as a fault in the renderer.
// But 0.62 over ~8 frames was below the threshold of noticing — against the
// bloom pass, which smears the dip further, the sign just looked lit. This is
// the deepest brownout that still reads as a sag rather than a dropped frame.
function flickerAlpha(t, reduced) {
  return flickerDark(t, reduced) ? 0.45 : 1;
}
// Which two-bar block we're in, off whichever clock flickerDark is using. The
// audible short-out is gated per block, so it has to be counted on the same
// clock as the blinks or the gate lands between them.
function flickerBlock(t) {
  const beat = Audio.songBeat();
  if (beat == null) return Math.floor(t / FLICKER_PERIOD);
  return Math.floor(beat / FLICKER_BEATS);
}

export class TitleState {
  constructor({ save, onSlotChosen, onSettings, onHowTo, onGuide, onSoundTest, onIntro, onAttract, attractDelay, attractLabel }) {
    this.save = save; this.onSlotChosen = onSlotChosen; this.onSettings = onSettings;
    this.onHowTo = onHowTo; this.onGuide = onGuide; this.onSoundTest = onSoundTest; this.onIntro = onIntro;
    this.onAttract = onAttract; this.attractDelay = attractDelay ?? 60;
    this.attractLabel = attractLabel || 'DEMO';
  }
  enter() {
    this.singleToasterOpening = !titleToasterIntroSeen;
    titleToasterIntroSeen = true;
    shuffleParade();
    this.idx = 0;
    this.erase = null;
    this.extras = null;
    this.t = 0;
    this.idleT = 0;
    this.lastCometCycle = -1;
    this.wasDark = false;
    this.lastBuzzCycle = -1;
    this.hitBombs = new Set();
    this.poke = new Map(); // hero parade index -> t when last tapped
    this.frightStart = null; // set when a wisp tap triggers the power-pellet fright
    this.eaten = new Map(); // wisp pass key -> { t0, x0, dir } once eaten while frightened
    this.scatter = new Map(); // wisp pass key -> { t0, x0, mode, colorIdx } once frightened
    this.tapBombs = []; // player-triggered invader bombs, same shape as the scheduled ones
    this.tapBombId = 0;
    this.shots = []; // b33p projectiles; tFired follows the visible arm wind-up
    this.shotId = 0;
    this.actTok = Input.activity;
    this.tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
    // Returning from settings, help, or another title-side screen should not
    // rewind a title theme that is already playing. Other screens replace the
    // bank, so this still starts the theme normally after gameplay or jukebox.
    if (Audio.bank !== TITLE_THEME) Audio.setBank(TITLE_THEME);
    Input.setMenuButtons();
    setSceneGlow(true); // the marquee and cabinet screens get to glow
  }
  exit() { setSceneGlow(false); setSkyFx(false); }
  // Whatever lands the hit — a direct tap, b33p's shot, or the ship's bomb —
  // a wisp always reacts the same way: fright if it's calm, eaten if it's
  // already blue. Centralizing this keeps all three triggers in lockstep.
  hitWisp(wisp) {
    const frightActive = this.frightStart != null && this.t - this.frightStart < WISP_FRIGHT_T;
    if (frightActive) {
      const dir = wisp.x < W / 2 ? -1 : 1;
      this.eaten.set(wisp.key, { t0: this.t, x0: wisp.x, dir });
      this.scatter.delete(wisp.key);
      Audio.sfx('tag');
    } else {
      this.frightStart = this.t;
      // Snapshot every visitor visible right now — no more may join once the
      // pellet's been eaten, so the gang scattering stays a fixed headcount.
      const pass = mazeWispPass(this.t);
      if (pass) {
        for (let j = 0; j < pass.count; j++) {
          const key = `${pass.trip}:${j}`;
          const x = -24 + pass.local * PARADE_SPEED - j * WISP_GAP;
          if (x < -24 || x > W + 24) continue;
          this.scatter.set(key, {
            t0: this.t, x0: x,
            mode: j % 2 === 0 ? 'pause' : 'reverse',
            colorIdx: (pass.trip + j) % WISP_COLORS.length,
            frozen: null,
          });
        }
      }
      Audio.sfx('power');
    }
  }
  // Same explode/knockback the invader's bombs use, for any other projectile
  // (b33p's shot) that lands on a hero.
  explodeHero(id, x, victim, dir) {
    const tHit = this.t;
    const phase = heroX(victim, tHit) + 70;
    const returnAt = tHit + (HERO_PARADE_SPAN - phase) / HERO_PARADE_SPEED;
    this.tapBombs.push({ id, tDrop: tHit, x, y0: BOLT_HEAD_Y, tHit, victim, returnAt, dir });
  }
  options() {
    const opts = [];
    this.save.data.slots.forEach((s, i) => {
      opts.push({
        id: 'slot' + i,
        label: s ? `FILE ${i + 1}: ${totalPlugs(s)}/${MAX_PLUGS} PLUGS, ${formatCoins(s.coins)} COINS` : `FILE ${i + 1}: NEW GAME`,
        act: () => this.onSlotChosen(i, !s),
      });
    });
    // Everything that isn't "start playing" lives one tap deeper. Nine rows in
    // a 100-unit band meant 11-unit rows, which on a phone is a 16px target —
    // and ERASE A FILE sat two of them below FILE 3, where a miss is
    // destructive. Four or five rows is what lets a row be worth tapping.
    opts.push({ id: 'extras', label: 'EXTRAS...', act: () => { this.extras = { idx: 0 }; Audio.sfx('ui'); } });
    return opts;
  }
  extrasChoices() {
    // Ordered by what someone opening this menu actually wants: the two
    // orientation screens first, then the rest of the reference, then the
    // file/system rows.
    // Both file-dependent rows hang off this. With no save yet there is nothing
    // to erase, and the opening isn't a rerun you'd want early — starting a file
    // plays it for you.
    const anyFile = this.save.data.slots.some(Boolean);
    const choices = [{ label: 'HOW TO PLAY', act: () => this.onHowTo() }];
    // The Home Screen walkthrough, for the player who waved it away on first
    // load and then spent a level looking at Safari's toolbar. Only drawn where
    // it can actually be followed — an iPhone that is not already installed.
    if (canInstall()) {
      choices.push({
        label: 'PLAY FULLSCREEN (ADD TO HOME)',
        act: () => { this.extras = null; showInstallGuide({ hasSave: anyFile }); },
      });
    }
    // Until now the opening was reachable only by starting a brand new file —
    // so the one way to read it twice was to erase your progress.
    if (anyFile) choices.push({ label: 'HOW THIS ALL STARTED', act: () => this.onIntro() });
    choices.push({ label: 'FIELD GUIDE (WHAT IS WHAT)', act: () => this.onGuide() });
    choices.push({ label: 'SOUND TEST (JUKEBOX)', act: () => this.onSoundTest() });
    if (anyFile) choices.push({ label: 'ERASE A FILE', act: () => { this.extras = null; this.beginErase(); } });
    choices.push({ label: 'SETTINGS', act: () => this.onSettings() });
    choices.push({ label: 'BACK', cancel: true });
    return choices;
  }
  // Same shape as updateErase below: the modal owns the frame while it is open.
  updateExtras() {
    const choices = this.extrasChoices();
    if (Input.pressed('down') || Input.pressed('right')) { this.extras.idx = (this.extras.idx + 1) % choices.length; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.extras.idx = (this.extras.idx + choices.length - 1) % choices.length; Audio.sfx('ui'); }
    if (Input.pressed('back')) { this.extras = null; Audio.sfx('ui'); return; }
    let chosen = Input.pressed('confirm') ? this.extras.idx : -1;
    if (Input.pressed('pointer')) {
      const i = modalRowAt(Input.pointer.x, Input.pointer.y, choices.length, false); // heading only
      if (i >= 0) chosen = i;
    }
    if (chosen < 0) return;
    this.extras.idx = chosen;
    const choice = choices[chosen];
    if (choice.cancel) { this.extras = null; Audio.sfx('ui'); return; }
    Audio.sfx('uiConfirm');
    choice.act();
  }
  beginErase() {
    const slots = this.save.data.slots.map((slot, i) => slot ? i : -1).filter((i) => i >= 0);
    if (!slots.length) return;
    this.erase = { step: 'choose', slots, idx: 0, slot: null };
  }
  eraseChoices() {
    if (this.erase.step === 'choose') {
      return [
        ...this.erase.slots.map((i) => ({ label: `FILE ${i + 1}: ${totalPlugs(this.save.data.slots[i])}/${MAX_PLUGS} PLUGS, ${formatCoins(this.save.data.slots[i].coins)} COINS`, slot: i })),
        { label: 'CANCEL', cancel: true },
      ];
    }
    return this.erase.step === 'confirm'
      ? [{ label: 'NO, KEEP IT', cancel: true }, { label: 'YES, CONTINUE' }]
      : [{ label: 'NO, GO BACK', cancel: true }, { label: 'ERASE IT' }];
  }
  updateErase() {
    const choices = this.eraseChoices();
    if (Input.pressed('down') || Input.pressed('right')) { this.erase.idx = (this.erase.idx + 1) % choices.length; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.erase.idx = (this.erase.idx + choices.length - 1) % choices.length; Audio.sfx('ui'); }
    if (Input.pressed('back')) { this.erase = null; Audio.sfx('ui'); return; }
    let chosen = Input.pressed('confirm') ? this.erase.idx : -1;
    if (Input.pressed('pointer')) {
      const i = modalRowAt(Input.pointer.x, Input.pointer.y, choices.length, true); // every step warns
      if (i >= 0) chosen = i;
    }
    if (chosen < 0) return;
    this.erase.idx = chosen;
    const choice = choices[chosen];
    if (choice.cancel) { this.erase = null; Audio.sfx('ui'); return; }
    if (this.erase.step === 'choose') {
      this.erase = { step: 'confirm', slots: this.erase.slots, slot: choice.slot, idx: 0 };
      Audio.sfx('uiBad');
    } else if (this.erase.step === 'confirm') {
      this.erase = { ...this.erase, step: 'final', idx: 0 };
      Audio.sfx('uiBad');
    } else {
      const erased = this.erase.slot;
      this.save.eraseSlot(erased);
      const next = this.save.data.slots.findIndex(Boolean);
      this.save.selectSlot(next >= 0 ? next : 0);
      this.erase = null;
      this.idx = Math.min(this.idx, this.options().length - 1);
      Audio.sfx('uiConfirm');
    }
  }
  update(dt) {
    this.t += dt;
    if (!this.save.settings.reducedFlashing) {
      for (const strike of invaderStrikes(this.t, this.tapBombs) || []) {
        // The strike is present for the knockback window, so use its age to
        // edge-trigger the sound on the first frame after contact.
        if (strike.victim >= 0 && strike.kt >= 0 && strike.kt < dt + 0.02 && !this.hitBombs.has(strike.id)) {
          this.hitBombs.add(strike.id);
          Audio.sfx('boom');
        }
      }
    }
    // A tap-bomb landing on a ghost instead acts exactly like tapping it —
    // the ghost takes the hit rather than whichever hero happened to be
    // nearest. Scoped to player-dropped bombs (ship taps + b33p's shots);
    // resolved once, right as each bomb lands.
    for (const bomb of this.tapBombs) {
      if (bomb._wispChecked || this.t < bomb.tHit) continue;
      bomb._wispChecked = true;
      const wisp = wispTapHit(bomb.tHit, bomb.x, SHOT_Y, this.eaten, this.scatter);
      if (wisp) { bomb.victim = -1; this.hitWisp(wisp); }
    }
    const cometCycle = Math.floor(this.t / 6.5);
    const cometPhase = this.t - cometCycle * 6.5;
    if (!this.save.settings.reducedFlashing && cometPhase >= 0.4 && this.lastCometCycle !== cometCycle && shaderHash21(cometCycle, 3) >= 0.55) {
      this.lastCometCycle = cometCycle;
      Audio.sfx('comet');
    }
    // The buzz reads off the same phase as the dropout and the spark, so it
    // lands on the same frame. Edge-triggered: the dark window spans several
    // frames and re-firing every one of them stacks into a rasp.
    //
    // It deliberately does NOT follow every blink. At most one buzz per block
    // (the first blink only — the second is close enough to overlap its tail),
    // and only on blocks the hash picks out, so the sign mostly stutters in
    // silence and every so often you actually hear it go. A sound tied 1:1 to a
    // repeating animation stops being ambience and turns into a metronome; the
    // hash keeps the gaps uneven, which reads as a fault rather than a rhythm.
    const dark = flickerDark(this.t, this.save.settings.reducedFlashing);
    const block = flickerBlock(this.t);
    if (dark && !this.wasDark && this.lastBuzzCycle !== block && shaderHash21(block, 11) >= 0.72) {
      this.lastBuzzCycle = block;
      Audio.sfx('neonBuzz');
    }
    this.wasDark = dark;
    // Attract mode: fire after attractDelay seconds of zero HUMAN input.
    if (Input.activity !== this.actTok) { this.actTok = Input.activity; this.idleT = 0; this.attractDelay = 60; }
    if (this.erase || this.extras) {
      this.idleT = 0;
      if (this.erase) this.updateErase(); else this.updateExtras();
      Input.endFrame();
      return;
    }
    this.idleT += dt;
    if (this.onAttract && this.idleT >= this.attractDelay) { this.onAttract(); return; }
    const opts = this.options();
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); opts[this.idx].act(); }
    if (Input.pressed('pointer')) {
      const p = Input.pointer;
      const i = titleRowAt(p.x, p.y, opts.length);
      if (i >= 0) { this.idx = i; Audio.sfx('uiConfirm'); opts[i].act(); }
      else {
        // Didn't land on a menu row — maybe it landed on the invader overhead.
        const ship = invaderTapHit(this.t, p.x, p.y);
        if (ship) {
          const dir = ship.trip % 2 === 0 ? 1 : -1;
          this.tapBombs.push(makeTapBomb(`tap:${this.tapBombId++}`, this.t, ship.x, ship.y, dir, this.tapBombs));
          Audio.sfx('shoot');
        } else {
          // Or a parading hero.
          const hero = heroTapIndex(this.t, p.x, p.y, this.tapBombs);
          if (hero >= 0) {
            if (HERO_PARADE[hero] === 'b33p') {
              // b33p doesn't hop when poked — he shoots. Still routes through
              // `poke` so his pose snaps to the aiming stance (arm up, gun
              // level) instead of firing from whatever his run-cycle arm was
              // doing a moment ago.
              const tFired = this.t + B33P_TITLE_WINDUP_T;
              this.shots.push({
                id: `shot:${this.shotId++}`,
                tFired,
                x0: heroX(hero, tFired) + 12,
                y: SHOT_Y,
                sounded: false,
              });
              this.poke.set(hero, this.t);
            } else {
              this.poke.set(hero, this.t);
              Audio.sfx('jump');
            }
          } else {
            // Or a maze-wisp visitor. First tap on any of them is a power
            // pellet: the whole crossing gang turns blue and scatters, still
            // on screen. A tap on one of them while frightened eats it, and
            // it zips off toward whichever edge is nearest.
            const wisp = wispTapHit(this.t, p.x, p.y, this.eaten, this.scatter);
            if (wisp) this.hitWisp(wisp);
          }
        }
      }
    }
    // Once fright wears off (color reverts to normal), a still-scattering
    // wisp freezes right where it is and waits for a clear gap in the hero
    // line before calmly walking on and off screen, rather than plowing on
    // through whoever's in its way.
    {
      const frightActive = this.frightStart != null && this.t - this.frightStart < WISP_FRIGHT_T;
      for (const w of this.scatter.values()) {
        if (w.frozen) {
          if (w.frozen.resumeAt == null && heroGapAt(this.t, w.frozen.x, this.tapBombs)) w.frozen.resumeAt = this.t;
        } else if (!frightActive) {
          w.frozen = { x: wispScatterX(this.t, w), resumeAt: null };
        }
      }
    }
    // Resolve b33p's shots: travel until a hit or the far edge.
    this.shots = this.shots.filter((shot) => {
      if (this.t < shot.tFired) return true;
      if (!shot.sounded) { shot.sounded = true; Audio.sfx('shoot'); }
      const x = shot.x0 + (this.t - shot.tFired) * SHOT_SPEED;
      if (x > W + 20) return false;
      for (let i = 0; i < HERO_PARADE.length; i++) {
        if (HERO_PARADE[i] === 'b33p') continue;
        if (!heroOnScreen(i, this.t) || heroIsKnockedOut(i, this.t, this.tapBombs)) continue;
        if (Math.abs(heroX(i, this.t) - x) < SHOT_HIT_RADIUS) {
          this.explodeHero(shot.id, x, i, 1);
          Audio.sfx('hit');
          return false;
        }
      }
      const wisp = wispTapHit(this.t, x, shot.y, this.eaten, this.scatter);
      if (wisp) { this.hitWisp(wisp); return false; }
      return true;
    });
    // Prune spent tap-bombs: misses once their impact has fully faded, hits
    // once the knocked-out hero has earned their way back into the line.
    this.tapBombs = this.tapBombs.filter((b) => this.t < (b.victim < 0 ? b.tHit + KNOCK_T : b.returnAt));
    // Prune eaten wisps once they've fully cleared whichever edge they zipped toward.
    for (const [key, w] of this.eaten) {
      const x = w.x0 + w.dir * (this.t - w.t0) * WISP_EATEN_SPEED;
      if (x < -40 || x > W + 40) this.eaten.delete(key);
    }
    // Prune scattered wisps once they've wandered off whichever edge they reached.
    for (const [key, w] of this.scatter) {
      const x = wispScatterX(this.t, w);
      if (x < -40 || x > W + 40) this.scatter.delete(key);
    }
    Input.endFrame();
  }
  draw(ctx) {
    const cast = titleScene(ctx, this.t, this.save.settings.reducedFlashing, this.poke, this.frightStart, this.eaten, this.scatter, this.tapBombs, this.shots);
    // Pushed BEFORE the ui painter below, so the save panel and its modals still
    // land on top of a hero who has been launched up the screen. Falls back to
    // painting straight into the backbuffer where there is no overlay layer at
    // all (headless tests): the parade then draws over the marquee instead of
    // under it, which costs nothing — one is the top of the screen and the other
    // is the bottom strip, and they never share a pixel.
    const castOverMenu = titleTouch() && !this.erase && !this.extras;
    if (!castOverMenu && !pushOverlayDraw(cast)) cast(ctx);
    const opts = this.options();
    const ui = (d) => {
      // The cast owns the bottom strip, so every line of text sits above it:
      // panel under the logo, then the controls and the flavour line as a footer.
      const panelW = TITLE_PANEL_W, panelX = TITLE_PANEL_X;
      const rowH = titleRowH(opts.length);
      const menuTextS = TITLE_MENU_TEXT_S;
      const panelY = TITLE_PANEL_Y, panelH = opts.length * rowH + TITLE_PANEL_PAD;
      // solid backing so the crates behind don't bleed through the list
      d.fillStyle = 'rgba(8,10,20,0.86)';
      platePath(d, panelX, panelY, panelW, panelH, 3);
      d.fill();
      d.strokeStyle = 'rgba(109,90,145,0.35)';
      d.lineWidth = 1;
      platePath(d, panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1, 3);
      d.stroke();
      opts.forEach((o, i) => {
        const sel = i === this.idx;
        const rowTop = titleRowTop(i, rowH);
        // The highlight fills the row's whole band and the lettering centres in
        // it. A fixed 11-unit highlight read as a thin bar floating in a tall
        // touch row, and text pinned to the band's top left the tap target
        // looking like it belonged to the row above.
        const textY = textYForMid(rowTop + rowH / 2) - (sel ? 1 : 0);
        if (sel) drawMenuRow(d, panelX + 4, rowTop + 1, panelW - 8, rowH - 2);
        drawTextCentered(d, (sel ? '> ' : '') + o.label, W / 2, textY, sel ? '#c9a0ff' : '#c3cede', menuTextS, sel ? 'bold' : 'ui');
      });
      // Touch spends the controls line on taller rows: "ARROWS" means nothing
      // there, and the rows read as buttons without being told they're tappable.
      const touch = titleTouch();
      const controlsY = panelY + panelH + TITLE_FOOTER_GAP;
      const flavorY = touch ? controlsY : controlsY + TITLE_FOOTER_LINE_H;
      // The footer is useful while the title is waiting for input, then gets
      // out of the way as soon as the first parade member arrives. This keeps
      // the cast from competing with instructions and the rotating gag line.
      // The first hero spends a moment approaching from off-screen; begin the
      // fade once that approach is visible, not on the parade's first frame.
      // Instructions leave first, then the little bottom gag follows them.
      const fade = (start, duration) => Math.max(0, Math.min(1, (start + duration - this.t) / duration));
      const flavorFade = fade(HERO_PARADE_DELAY + 2.2, 1.2);
      const controlsFade = fade(HERO_PARADE_DELAY + 3.8, 1.2);
      d.globalAlpha = controlsFade;
      // Keyboard-only by the branch above, so it names keys only: listing taps
      // to the one reader who cannot make them is the mirror of the mistake the
      // touch layout avoids by dropping this line entirely.
      if (!touch) drawTextCentered(d, 'ARROWS: CHOOSE   ENTER: CONFIRM', W / 2, controlsY, '#6b7d95');
      d.globalAlpha = flavorFade * 0.85;
      if (this.onAttract && this.attractDelay <= 10) {
        // A tap bumps Input.activity exactly like a keypress does, so it cancels
        // the countdown too — named for the device in hand rather than listing
        // both, the way every other prompt on this screen is.
        drawTextCentered(d, `NEXT ${this.attractLabel} IN ${Math.max(1, Math.ceil(this.attractDelay - this.idleT))} - ${touch ? 'TAP' : 'ANY KEY'} CANCELS`, W / 2, flavorY, '#8858c8', TITLE_FLAVOR_S);
      } else {
        drawTextCentered(d, this.tagline, W / 2, flavorY, '#55647a', TITLE_FLAVOR_S);
      }
      d.globalAlpha = 1;
      if (BUILD_STAMP) {
        d.globalAlpha = 0.55;
        drawText(d, `BUILD ${BUILD_STAMP}`, 4, 4, '#55647a', 0.75);
        d.globalAlpha = 1;
      }
      if (this.erase) this.drawEraseModal(d);
      else if (this.extras) this.drawExtrasModal(d);
    };
    if (!pushOverlayDraw(ui)) ui(ctx);
    // On phones the parade is part of the foreground. Keeping it above the
    // compact title panel avoids chopping characters at the panel edge; modal
    // lists still cover it because they must remain unambiguous.
    if (castOverMenu && !pushOverlayDraw(cast)) cast(ctx);
    // Toasters are the title's foreground cameo: queue them after the menu so
    // they can pass over the logo, panel, modal lists, heroes, and invader.
    const foregroundToasters = (d) => drawFlyingToasters(
      d, this.t, this.save.settings.reducedFlashing, this.singleToasterOpening,
    );
    if (!pushOverlayDraw(foregroundToasters)) foregroundToasters(ctx);
  }
  drawEraseModal(d) {
    let title = 'ERASE WHICH FILE?';
    let note = 'CHOOSE CAREFULLY. BACK CANCELS.';
    if (this.erase.step === 'confirm') {
      title = `ERASE FILE ${this.erase.slot + 1}?`;
      note = 'ALL PROGRESS IN THIS FILE WILL BE LOST.';
    } else if (this.erase.step === 'final') {
      title = `FINAL WARNING: ERASE FILE ${this.erase.slot + 1}?`;
      note = 'THIS CANNOT BE UNDONE.';
    }
    drawModalList(d, this.eraseChoices(), this.erase.idx, { title, note, accent: '#e05a62', titleColor: '#ff727c' });
  }
  drawExtrasModal(d) {
    drawModalList(d, this.extrasChoices(), this.extras.idx, {
      title: 'EXTRAS', accent: 'rgba(109,90,145,0.35)', titleColor: '#f4f1fa',
    });
  }
}

// The title's two modal lists, drawn one way. Geometry comes from
// modalListGeom, which the tap hit-test reads too, so the rows a finger finds
// are exactly the rows on screen at whatever size the device asked for.
function drawModalList(d, choices, idx, { title, note, accent, titleColor }) {
  const g = modalListGeom(choices.length, !!note);
  const modalTextS = 1.35;
  d.fillStyle = 'rgba(2,3,10,0.78)';
  d.fillRect(0, 0, W, H);
  d.fillStyle = 'rgba(11,10,20,0.98)';
  platePath(d, g.x, g.y, g.w, g.h, 4); d.fill();
  d.strokeStyle = accent; d.lineWidth = 1;
  platePath(d, g.x + 0.5, g.y + 0.5, g.w - 1, g.h - 1, 4); d.stroke();
  drawTextCentered(d, title, W / 2, g.y + 12, '#f4f1fa', 1.5, 'title');
  if (note) drawTextCentered(d, note, W / 2, g.y + 28, '#aab4c6', 1, 'ui');
  choices.forEach((choice, i) => {
    const selected = i === idx;
    const rowTop = g.firstY + i * g.rowH;
    const textY = textYForMid(rowTop + g.rowH / 2) - (selected ? 2 : 0);
    if (selected) drawMenuRow(d, g.x + 7, rowTop + 1, g.w - 14, g.rowH - 2);
    drawTextCentered(d, `${selected ? '> ' : ''}${choice.label}`, W / 2, textY, selected ? '#c9a0ff' : '#d3d9e5', modalTextS, selected ? 'bold' : 'ui');
  });
}

// A centred list's cursor band hugs the widest row it will ever draw rather
// than running the width of the screen: a band three times wider than the words
// in it stops reading as a row and starts reading as a bar they sit in front
// of. Measured over every label the list has, not just the selected one, so the
// band doesn't breathe as the cursor moves.
function centredBand(labels, scale = 1) {
  const widest = labels.reduce((m, s) => Math.max(m, textWidth(s, scale)), 0);
  const w = Math.min(W - 48, widest + 28);
  return { x: (W - w) / 2, w };
}

// PROSE THAT SIZES ITSELF TO THE ROOM IT HAS.
//
// A phone shows this 480x270 canvas at about 1.5 CSS px per unit, so a fixed
// scale 1 is caption-sized in a hand — and the screens that read this way (the
// briefing, the intro, the finale) spend most of their height on black. So:
// pick the largest step whose wrapped block fits the band, and centre it there.
const TYPE_STEPS = [2, 1.75, 1.5, 1.25, 1];
const TYPE_LINE_H = 11; // per unit of scale

// Wrapped lines carrying the character offset each starts at, so a typewriter
// reveals into a layout that never reflows underneath itself. Wrapping the
// PARTIAL string every frame — what these screens used to do — walked every
// line below down the screen as the one above filled in.
function typeLines(text, maxW, scale, from = 0, maxLines = 12) {
  return wrapText(text, maxW, scale, maxLines).map((t) => {
    const line = { text: t, from };
    from += t.length + 1; // the wrap ate exactly one space
    return line;
  });
}

// `maxLines` is for the lines that turn on their last word. Fitting by height
// alone, the finale's closer took the biggest step that merely FIT the band and
// wrapped to "...THE POWER STRIP DOES / NOT." — a greedy break that strands the
// punchline on a line of its own and reads as a bug rather than as timing.
// Capping the line count makes it step down until the sentence holds together.
function fitProse(text, maxW, band, steps = TYPE_STEPS, maxLines = Infinity) {
  let block = null;
  for (const scale of steps) {
    const lines = typeLines(text, maxW, scale);
    block = { lines, scale, height: lines.length * TYPE_LINE_H * scale };
    if (block.height <= band && lines.length <= maxLines) break;
  }
  return block;
}

// `budget` characters of a fitProse block, centred in [top, top + band].
// budget null shows the whole thing. For a block of prose, prefer the cascade
// below — a per-character crawl only reads as delivery when the unit is one
// sentence, which on these screens means the finale and nothing else.
function drawProse(ctx, block, top, band, color, budget = null) {
  const y0 = top + Math.max(0, (band - block.height) / 2);
  block.lines.forEach((line, i) => {
    const shown = budget == null ? line.text : line.text.slice(0, Math.max(0, budget - line.from));
    if (shown) drawTextCentered(ctx, shown, W / 2, y0 + i * TYPE_LINE_H * block.scale, color, block.scale);
  });
}

// A PARAGRAPH ARRIVES A LINE AT A TIME, NOT A LETTER AT A TIME.
//
// Nobody reads a block while it assembles — the eye wants the whole shape — so
// a character crawl across eight lines is not delivery, it is a wait, on
// screens that are read before every stage and again on every retry. And a
// centred line drawn half-finished walks sideways as it fills, which at these
// sizes was the loudest movement on the screen.
//
// So each line fades and drops the last of its rise into place a beat behind
// the one above: the whole memo is standing in well under a second, every line
// is readable the instant it appears, and the fiction is right — a memo comes
// out of a machine a line at a time.
const CASCADE_STAGGER = 0.07;
const CASCADE_FADE = 0.14;
const CASCADE_RISE = 2.5; // units of the block's own scale
function cascadeAt(t, i) {
  const k = Math.max(0, Math.min(1, (t - i * CASCADE_STAGGER) / CASCADE_FADE));
  return { alpha: k, dy: (1 - k) * (1 - k) * CASCADE_RISE };
}
function cascadeDone(t, n) { return t >= Math.max(0, n - 1) * CASCADE_STAGGER + CASCADE_FADE; }
// Long enough to have landed every line of anything this game sets.
const CASCADE_ALL = 99;

function drawCascade(ctx, block, top, band, color, t) {
  const y0 = top + Math.max(0, (band - block.height) / 2);
  ctx.save();
  block.lines.forEach((line, i) => {
    const { alpha, dy } = cascadeAt(t, i);
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    drawTextCentered(ctx, line.text, W / 2, y0 + (i * TYPE_LINE_H + dy) * block.scale, color, block.scale);
  });
  ctx.restore();
}

// Difficulty rows are a name over a one-line gloss, and the pair is what the
// tap hit-test and the cursor band both cover — so the geometry lives here
// rather than being spelled out again in update() and draw().
//
// Five rows used to take 120 of the 270 units and leave the bottom third black,
// at a pitch of 24 — 35 CSS px on a phone, under every platform's 44pt touch
// minimum. They fill the screen now, which fixes the target and the type size
// with the same number.
const DIFF_TOP = 86, DIFF_ROW = 31, DIFF_GLOSS_DY = 13;
const DIFF_NAME_S = 1.3, DIFF_GLOSS_S = 1.05;

export class DifficultyState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  // The base list never had a back affordance (there's nowhere to go back TO —
  // this only ever runs once, right after creating a save slot), so the corner
  // button was only ever load-bearing inside the confirm modal below, which now
  // carries its own YES/NO zones instead.
  enter() { this.idx = 0; this.confirming = false; Input.setMenuButtons(); }
  update(dt) {
    const n = DIFFICULTIES.length;
    if (this.confirming) {
      // Two explicit tap zones (see draw()) rather than "anywhere but the
      // corner button" — this is a menu now, not a floating-button screen.
      const p = Input.pointer;
      const tapped = Input.pressed('pointer') && p.y >= 142 && p.y <= 160;
      if (Input.pressed('confirm') || (tapped && p.x < W / 2)) { Audio.sfx('uiConfirm'); this.commit(5); }
      if (Input.pressed('back') || Input.pressed('duck') || (tapped && p.x >= W / 2)) { this.confirming = false; Audio.sfx('ui'); }
      Input.endFrame();
      return;
    }
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - DIFF_TOP) / DIFF_ROW);
      if (i >= 0 && i < n) {
        if (this.idx === i) this.select(); else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('confirm')) this.select();
    Input.endFrame();
  }
  select() {
    const d = DIFFICULTIES[this.idx];
    if (d.id === 5) { this.confirming = true; Audio.sfx('uiBad'); return; }
    Audio.sfx('uiConfirm');
    this.commit(d.id);
  }
  commit(id) {
    this.save.slot.difficulty = id;
    this.save.persist();
    this.onDone();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SELECT DIFFICULTY', W / 2, 40, '#fff', 2, 'title');
    drawTextCentered(ctx, '(THE PAUSE MENU WILL ALWAYS TELL YOU THE TRUTH)', W / 2, 64, '#5a5a68');
    // Widest of the two columns of type, since the names are set a size above
    // their glosses and either can be the long one.
    const names = centredBand(DIFFICULTIES.map((d) => `> ${d.name}`), DIFF_NAME_S);
    const glosses = centredBand(DIFFICULTIES.map((d) => d.desc), DIFF_GLOSS_S);
    const band = names.w >= glosses.w ? names : glosses;
    DIFFICULTIES.forEach((d, i) => {
      const sel = i === this.idx;
      const danger = d.id === 5;
      const label = d.name;
      const color = danger ? '#e04848' : sel ? '#c9a0ff' : '#c8c8d8';
      const rowTop = DIFF_TOP + i * DIFF_ROW;
      if (sel) drawMenuRow(ctx, band.x, rowTop + 1, band.w, DIFF_ROW - 2);
      // The name/gloss pair centres in the band as one block, so the band the
      // finger finds is the band the words sit in the middle of.
      const nameY = textYForMid(rowTop + DIFF_ROW / 2, DIFF_NAME_S) - DIFF_GLOSS_DY / 2;
      drawTextCentered(ctx, (sel ? '> ' : '') + label, W / 2, nameY, color, DIFF_NAME_S);
      drawTextCentered(ctx, d.desc, W / 2, nameY + DIFF_GLOSS_DY, '#5a5a68', DIFF_GLOSS_S);
      // the skull is smiling
      if (d.id === 3 && sel) drawText(ctx, ':)', W / 2 + textWidth(label, DIFF_NAME_S) / 2 + 18, nameY, '#8a8a98', DIFF_NAME_S);
    });
    if (this.confirming) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(40, 90, W - 80, 80);
      ctx.strokeStyle = '#e04848';
      ctx.strokeRect(40.5, 90.5, W - 81, 80);
      drawTextCentered(ctx, 'ARE YOU SURE?', W / 2, 108, '#e04848', 2);
      drawTextCentered(ctx, '(WE ARE NOT.)', W / 2, 132, '#8a8a98');
      // Two tappable words instead of a floating corner button — left half of
      // the box is YES, right half is NO (see update()'s hit test). ENTER/ESC
      // still work too; the words are the touch affordance, not a replacement.
      drawTextCentered(ctx, 'YES', W / 2 - 100, 150, '#e04848', 1.25, 'bold');
      drawTextCentered(ctx, 'NO — WISDOM', W / 2 + 100, 150, '#c8c8d8', 1.25, 'bold');
    }
  }
}

// How wide each panel's frame wants to be. The frame is not decoration — it is
// the stage each panel plays on, and they need different amounts of room: six
// cabinets, one villain, then eight heroes shoulder to shoulder. Animating
// between them turns the widest panel's arrival into a reveal, and the hero
// line-up spreads as it opens because its pitch is derived from the live width.
const INTRO_FRAME_W = [404, 250, 470, 470];
const INTRO_FRAME_Y = 30.5, INTRO_FRAME_H = 120;
// The caption strip: under the picture frame, above the panel counter.
const INTRO_TEXT_TOP = INTRO_FRAME_Y + INTRO_FRAME_H + 6;
const INTRO_TEXT_BOTTOM = H - 28;

export class IntroState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.panel = 0; this.reveal = 0; this.t = 0; this.panelT = 0; this.frameW = INTRO_FRAME_W[0]; this.blocks = []; Input.setMenuButtons(); }
  // Laid out once per panel and kept: the wrap is measured type, and measuring
  // it every frame to draw a growing prefix of it is both wasteful and how the
  // lines used to shuffle mid-typewriter.
  block(i) {
    if (!this.blocks[i]) this.blocks[i] = fitProse(INTRO_PANELS[i].text, W - 56, INTRO_TEXT_BOTTOM - INTRO_TEXT_TOP);
    return this.blocks[i];
  }
  update(dt) {
    this.t += dt;
    this.panelT += dt;
    // Eased toward the target rather than snapped: the panels are read at a
    // click each, so a hard cut in frame width reads as a layout glitch where a
    // half-second open reads as the scene making room.
    const want = INTRO_FRAME_W[Math.min(this.panel, INTRO_FRAME_W.length - 1)];
    this.frameW += (want - this.frameW) * Math.min(1, dt * 6);
    if (this.panel >= INTRO_PANELS.length) { Input.endFrame(); return; }
    this.reveal += dt;
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      // First input lands the caption, second turns the page — unchanged, the
      // cascade is just quick enough that the first one is rarely needed.
      if (!cascadeDone(this.reveal, this.block(this.panel).lines.length)) this.reveal = CASCADE_ALL;
      else { this.panel++; this.reveal = 0; this.panelT = 0; Audio.sfx('ui'); if (this.panel >= INTRO_PANELS.length) { this.onDone(); } }
    }
    if (Input.pressed('back')) this.onDone();
    Input.endFrame();
  }
  draw(ctx) {
    if (this.panel >= INTRO_PANELS.length) return;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    // panel art: minimal pixel scenes
    ctx.strokeStyle = '#30303f';
    const fw = this.frameW;
    ctx.strokeRect(W / 2 - fw / 2, INTRO_FRAME_Y, fw, INTRO_FRAME_H);
    if (this.panel === 1) drawProp(ctx, 'eggshell', W / 2 - 24, 60, 48, 40);
    if (this.panel === 0) {
      // The real cabinets, from the real palettes. These were six hardcoded
      // rectangles in colours hand-copied off CABINETS — so the opening shot of
      // the arcade showed machines that existed nowhere else in the game, and
      // drifted further every time the cabinet art changed. Same painters the
      // food court stands them up with, so this shot can never go stale again.
      const CW = 46, CH = 82, BOT = 146;
      for (let i = 0; i < 6; i++) {
        const cab = CABINETS[i];
        const cx = W / 2 + (i - 2.5) * 68;
        const pal = cabinetPalette(cab);
        drawCabinetShell(ctx, cx - CW / 2, BOT - CH, CW, CH, pal);
        // "EVERY CABINET DREAMING ITS LITTLE ELECTRIC DREAM" — so they are lit,
        // each rolling its own attract on its own clock.
        const scr = drawCabinetScreen(ctx, cx - CW / 2, BOT - CH, CW, CH, pal);
        if (scr) drawScreenSweep(ctx, scr, this.t + i * 1.3, i * 977);
      }
    }
    if (this.panel === 2 || this.panel === 3) {
      // One row of eight, filling the widened frame. They were 24 units tall in
      // a single row, then 44 in two rows of four; a single row across the wider
      // box gets them to 78 — three times the original, on the one screen whose
      // entire job is introducing them. A row also says "a line-up" in a way a
      // block of four-by-two does not, which is what these two panels are about.
      const heroes = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'raymn', 'grumpos'];
      // Pitch comes from the LIVE frame width, so the line-up spreads as the
      // frame opens instead of sitting at a fixed spacing inside a moving box.
      // 64 rather than 72: chompo's flame trail and mochi's ears are far wider
      // than 0.6x their height, so the pair that touches is not the pair the
      // pitch maths predicts. Eight units off every hero clears it without the
      // row visibly shrinking.
      //
      // The 72 is the END INSET, and it is a silhouette measurement, not half a
      // hero box: it is the room the outermost hero's actual ink needs inside
      // the frame. At 46 grumpos — right end, bearded, armed, and the widest
      // hero from anchor to fingertip — hung a blade off the side of the SCREEN.
      // ROW_X leans the whole line 4px left of centre for the other half of the
      // same problem: he reaches further right of his anchor than lorenzo does
      // left of his, so centring the ANCHORS leaves the INK off-centre by
      // exactly that difference, and the overflow all lands on grumpos.
      //
      // Height and inset are one dial, not two. Insetting alone buys end margin
      // by squeezing the middle — at 68 tall the room that clears grumpos is the
      // same room mochi and chompo were using. Taking four units off the heroes
      // pays for both ends at once: every silhouette narrows, so the ends pull in
      // AND the pairs that touch get further apart. This lands ~10px of daylight
      // at each end of the frame with the middle gaps no tighter than they were.
      const HH = 64, PITCH = (fw - 72) / (heroes.length - 1), ROW_X = W / 2 - 4;
      // The roll call plays ONCE, on panel 3, where the cast is being introduced.
      // Panel 4 is the same eight people a beat later — replaying their entrance
      // there would say they had just arrived again, and turn a one-off flourish
      // into a tic you sit through twice.
      const rollCall = this.panel === 2;
      heroes.forEach((h, i) => {
        // They arrive one at a time, left to right, over about a second — a
        // roll call rather than a group photo that was always there. Each pops
        // in on its own short ease with a bulge past full size at the midpoint
        // and a rise from below, so the landing reads as weight rather than a
        // fade. Anyone whose turn has not come yet simply is not drawn.
        const a = rollCall ? Math.min(1, Math.max(0, (this.panelT - (0.2 + i * 0.13)) / 0.28)) : 1;
        if (a <= 0) return;
        const ease = 1 - Math.pow(1 - a, 3);
        const scale = ease + Math.sin(a * Math.PI) * 0.14;
        // On the relay panel the assembled cast now uses the same approved
        // celebration routines as the results screen and cast-roll spotlight.
        // Their clocks are staggered by the same 0.35s used by the curtain call,
        // so the row reads as a crowd rather than one synchronized metronome.
        const pose = { kind: 'idle', phase: (this.panelT * 0.55 + i * 0.21) % 1, time: this.panelT + i * 0.8, grounded: true };
        if (!rollCall) {
          pose.menu = true;
          pose.kind = 'celebrate';
          pose.phase = 0;
          pose.time = this.panelT + i * 0.35;
        }
        drawToon(ctx, h, pose, ROW_X + (i - 3.5) * PITCH, 145 + (1 - ease) * 13, HH * scale, { alpha: ease });
      });
    }
    // The caption fills the strip under the frame instead of sitting at a fixed
    // scale 1 on two hard-wrapped lines: this is the first prose a new file ever
    // shows, and on a phone that was a 12px caption under a 120-unit picture.
    const block = this.block(this.panel);
    drawCascade(ctx, block, INTRO_TEXT_TOP, INTRO_TEXT_BOTTOM - INTRO_TEXT_TOP, '#e8e8f0', this.reveal);
    const promptS = Input.isTouchDevice() ? 1.25 : 1;
    drawTextCentered(ctx, `${this.panel + 1}/${INTRO_PANELS.length}  (${confirmVerb()})`,
      W / 2, textYForMid(H - 16, promptS), '#5a5a68', promptS);
  }
}

// THE BRIEFING MANIFEST: a full-black establishment screen before every
// stage. The MISSION line carries the real information; the memo blocks are
// letterhead comedy. One input completes the typewriter, a second proceeds.
//
// The type is sized to the memo rather than fixed: at a constant scale 1 the
// longest briefing and the shortest one both crowded the top third and left
// the rest of the screen black, which on a phone — where 270 logical units is
// about three inches — put the whole manifest under ten CSS pixels a line. The
// layout below picks the largest step that still fits between the header and
// the confirm line, so short memos come up large and only the densest ones
// step back down toward the old size.
//
// The top step is 1.75, not whatever fits: the header is drawn at scale 2 in a
// heavier face, and a one-line mission blown up past it made the body outrank
// the title it was filed under.
const BRIEF_SCALES = TYPE_STEPS.filter((s) => s <= 1.75);
const BRIEF_TOP = 54;             // under the header, with air
const BRIEF_BOTTOM = H - 36;      // above the confirm line
const BRIEF_HEAD_GAP = 1;         // letterhead to its own body
const BRIEF_PIECE_GAP = 8;        // memo to memo
const BRIEF_MARGIN = 56;          // total horizontal margin

// One memo laid out at one scale. Lines carry their own y (relative to the top
// of the block) and the character offset they start at, so the typewriter can
// reveal into a layout that never reflows underneath itself — at scale 1 the
// old code re-wrapped the partial string every frame, which walked the lower
// memos down the screen as the upper one filled in.
function briefingLayout(pieces, scale) {
  const maxW = W - BRIEF_MARGIN;
  const lineH = TYPE_LINE_H * scale;
  const lines = [];
  let y = 0, chars = 0;
  for (const piece of pieces) {
    const start = chars;
    if (piece.head) {
      const isEgg = piece.head.startsWith('INTERRUPTION');
      for (const line of wrapText(piece.head, maxW, scale, 3)) {
        lines.push({ text: line, y, from: start, head: true, color: isEgg ? '#f0a0a0' : '#48e0c8' });
        y += lineH;
      }
      y += BRIEF_HEAD_GAP * scale;
    }
    for (const line of typeLines(piece.text, maxW, scale, start)) {
      lines.push({ ...line, y, head: false, color: piece.head ? '#c8c8d8' : '#f6d33c' });
      y += lineH;
    }
    chars = start + piece.text.length;
    y += BRIEF_PIECE_GAP * scale;
  }
  return { lines, scale, height: y - BRIEF_PIECE_GAP * scale };
}

export class BriefingState {
  constructor({ cab, stage, onDone }) { this.cab = cab; this.stage = stage; this.onDone = onDone; }
  enter() {
    this.reveal = 0;
    this.t = 0;
    Input.setMenuButtons();
    this.pieces = [
      { head: null, text: `MISSION: ${this.stage.mission.desc}` },
      ...(BRIEFINGS[this.stage.id] || []),
    ];
    const band = BRIEF_BOTTOM - BRIEF_TOP;
    const steps = BRIEF_SCALES.map((s) => briefingLayout(this.pieces, s));
    this.layout = steps.find((l) => l.height <= band) || steps[steps.length - 1];
    // Centred in the band: a two-line mission pinned to the top of a black
    // screen reads as a rendering fault rather than as a title card.
    this.top = BRIEF_TOP + Math.max(0, (band - this.layout.height) / 2);
  }
  update(dt) {
    this.t += dt;
    this.reveal += dt;
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      // Still two inputs — land the memo, then proceed — but the memo lands in
      // well under a second, so the first one is a courtesy rather than a gate.
      if (!this.landed()) { this.reveal = CASCADE_ALL; Audio.sfx('ui'); }
      else { Audio.sfx('uiConfirm'); this.onDone(); }
    }
    if (Input.pressed('back')) { Audio.sfx('uiConfirm'); this.onDone(); }
    Input.endFrame();
  }
  landed() { return cascadeDone(this.reveal, this.layout.lines.length); }
  draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const cabNo = CABINETS.findIndex((c) => c.id === this.cab.id) + 1;
    drawTextCentered(ctx, `STAGE ${cabNo}-${this.stage.index} BRIEFING`, W / 2, 26, '#e8e8f0', 2, 'title');
    // Letterhead and memo cascade together, in the order they are read: a head
    // is just the line its memo starts with.
    const { lines, scale } = this.layout;
    ctx.save();
    lines.forEach((line, i) => {
      const { alpha, dy } = cascadeAt(this.reveal, i);
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      drawTextCentered(ctx, line.text, W / 2, this.top + line.y + dy * scale, line.color, scale);
    });
    ctx.restore();
    const done = this.landed();
    if (!done || Math.floor(this.t * 2) % 2 === 0) {
      // The confirm line rides a size up on touch: it is the one thing on the
      // screen a thumb has to act on, not just read.
      const promptS = Input.isTouchDevice() ? 1.25 : 1;
      drawTextCentered(ctx, `[${confirmVerb()}]: ${BRIEFING_PROMPTS[this.cab.id] || 'PROCEED'}`,
        W / 2, textYForMid(H - 16, promptS), done ? '#c8c8d8' : '#5a5a68', promptS);
    }
  }
}

// Party colors for the results screen: the game's own gold/teal/pink/purple,
// so the confetti reads as MASHENSTEIN and not as generic stock celebration.
const PARTY_COLORS = ['#f6d33c', '#48e0c8', '#f890b8', '#8858c8', '#48c848', '#ffffff'];
const BURST_SFX = ['popSmall', 'popBig', 'crackle'];

// The results screen sizes its ledger to the band it actually has, the way
// titleRowH() does for the slot menu. Fixed at scale 1 it was wrong in both
// directions: the canvas is 480x270 scaled by min(w/480, h/270), so a landscape
// iPhone is height-limited at ~1.44 CSS px per unit and a body row landed at
// 8.6 CSS px of cap height — iOS caption size — while a typical clear left
// forty units of empty tube under it. A ten-line one overran into the heroes.
const RESULT_BODY_TOP = 92;
const RESULT_ROW_H = 12;        // per unit of body scale
const RESULT_BODY_S_MAX = 1.35; // past this the ledger starts out-shouting the title
const RESULT_BODY_PAD = 10;     // clear of the glass, so a long rank line never touches it
const RESULT_GAP = 6;           // between the ledger, the curtain call and the prompt
const RESULT_HERO_H = 32;
// Low, because the ten-row case is genuinely over-subscribed and a small bow is
// better than one taken through the last two rows of the ledger. The celebrate
// rig lifts a hero by up to ~0.2h off its feet, so the clearance above has to
// survive that too.
const RESULT_HERO_H_MIN = 18;
// The prompt's ink sits on this line at every size, so growing it for a thumb
// moves its edges, never its middle.
const RESULT_FOOTER_MID = H - 27;

// The results screen is the one place we admit where the game physically is:
// inside the tube. Act III says so literally, so the frame here is the CRT
// itself seen from within — the rounded corners of the glass, the dark mask
// where the tube stops, and the phosphor glow banked at the bottom.
//
// The renderer already supplies the optics — glfx applies vignette and
// chromatic aberration to the whole canvas — so what was missing was never a
// filter, it was the *shape*. Rounded corners are what makes a screen read as
// a CRT rather than as a rectangle that happens to be dark.
//
// Deliberately static. The screen already carries dense text, up to eight hero
// sprites, fireworks and falling streamers; a fifth moving layer behind the
// most information-dense part of the frame is exactly what a starfield would
// have been, and it would fight the burst shrapnel dot for dot.
// The glass is inset on all four sides — a tube sits inside its housing, and
// bleeding to the canvas edge on any side breaks that read. Slightly more top
// and bottom than at the sides, since the screen is wider than it is tall.
// The results layout below is pinned to these — change one, check the other.
const TUBE_INSET_X = 16;
const TUBE_INSET_Y = 19;
const TUBE_R = 34;       // generous: a shallow curve reads as a rounded box
let tubeGlow = null;
let tubeWash = null;

// Traced by hand rather than platePath() — the corner is a quadratic through
// the actual corner point, which gives the slightly-inflated curve of real
// tube glass instead of a perfect quarter circle.
// `fresh` false appends the tube as a second subpath to whatever is already
// being built — the mask needs it inside a full-screen rect for an evenodd
// fill, and an unconditional beginPath() here silently threw that rect away.
function tubePath(ctx, fresh = true) {
  const x0 = TUBE_INSET_X, y0 = TUBE_INSET_Y, x1 = W - TUBE_INSET_X, y1 = H - TUBE_INSET_Y;
  if (fresh) ctx.beginPath();
  ctx.moveTo(x0 + TUBE_R, y0);
  ctx.lineTo(x1 - TUBE_R, y0);
  ctx.quadraticCurveTo(x1, y0, x1, y0 + TUBE_R);
  ctx.lineTo(x1, y1 - TUBE_R);
  ctx.quadraticCurveTo(x1, y1, x1 - TUBE_R, y1);
  ctx.lineTo(x0 + TUBE_R, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - TUBE_R);
  ctx.lineTo(x0, y0 + TUBE_R);
  ctx.quadraticCurveTo(x0, y0, x0 + TUBE_R, y0);
  ctx.closePath();
}

// Speckle: fixed positions, so it reads as grain in the glass rather than as
// a sixth animated layer. Seeded by index — no Math.random, so the pattern is
// identical every visit and never crawls between frames.
const TUBE_SPECKLE = Array.from({ length: 520 }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  const s = Math.sin(i * 78.233) * 24634.6345;
  return { x: Math.abs(r) % W | 0, y: Math.abs(s) % H | 0, a: 0.03 + (Math.abs(r * 3) % 1) * 0.05 };
});

function drawTubeFace(ctx) {
  ctx.fillStyle = '#07070c';           // the dark beyond the glass
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  tubePath(ctx);
  ctx.clip();
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(0, 0, W, H);
  // The tube has to actually EMIT before any of the texture below can read.
  // Scanlines and speckle are modulation — they need luminance to modulate,
  // and dark lines over a near-black field are simply invisible. This wash is
  // what everything else is drawn against.
  if (!tubeWash) {
    tubeWash = ctx.createRadialGradient(W / 2, H * 0.40, 8, W / 2, H * 0.40, W * 0.60);
    tubeWash.addColorStop(0, 'rgba(104,132,214,0.30)');
    tubeWash.addColorStop(0.55, 'rgba(78,96,168,0.14)');
    tubeWash.addColorStop(1, 'rgba(60,70,140,0)');
  }
  ctx.fillStyle = tubeWash;
  ctx.fillRect(0, 0, W, H);
  // Phosphor banked along the bottom of the tube, warm where the beam has
  // been working hardest. Lands under the hero row, so the curtain call reads
  // as standing in the glow rather than floating on black.
  // Anchored to the bottom of the GLASS, not the canvas — anchored to the
  // canvas, its brightest stop sat under the mask and never showed.
  const gy = H - TUBE_INSET_Y;
  if (!tubeGlow) {
    tubeGlow = ctx.createLinearGradient(0, gy, 0, gy - 100);
    // Modest: this now sits on a lit face rather than on black, and any more
    // washes out the grey footer line drawn over it.
    tubeGlow.addColorStop(0, 'rgba(255,168,88,0.13)');
    tubeGlow.addColorStop(1, 'rgba(255,168,88,0)');
  }
  ctx.fillStyle = tubeGlow;
  ctx.fillRect(0, gy - 100, W, 100);
  ctx.restore();
}

// Scanlines and speckle: the glass texture, drawn onto the empty face BEFORE
// the party. Confetti sits on top of the glass rather than under it — with
// the party underneath, the scanline pass dimmed every ribbon by a third and
// the confetti effectively vanished.
function drawTubeTexture(ctx) {
  ctx.save();
  tubePath(ctx);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  // Every third line gets a lit companion — the beam edge. Bright-on-dark is
  // what reads as a scanline; dark-on-dark just dims the screen.
  ctx.fillStyle = 'rgba(150,180,255,0.07)';
  for (let y = 1; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  for (const s of TUBE_SPECKLE) {
    ctx.fillStyle = `rgba(190,205,255,${s.a})`;
    ctx.fillRect(s.x, s.y, 1, 1);
  }
  ctx.restore();
}

// Runs LAST, so streamers tumble away behind the curve instead of running off
// a square edge. That occlusion is most of what sells the glass.
function drawTubeMask(ctx) {
  ctx.save();
  // Everything outside the tube. evenodd against a full-screen rect.
  ctx.fillStyle = '#07070c';
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  tubePath(ctx, false);
  ctx.fill('evenodd');
  // The lit edge of the glass, brightest along the top where a tube catches
  // the room. lineWidth is set explicitly: it persists across frames.
  ctx.lineWidth = 1;
  tubePath(ctx);
  ctx.strokeStyle = 'rgba(150,190,255,0.10)';
  ctx.stroke();
  ctx.restore();
}

// A failed run used to end on a single CONTINUE that walked you to the food
// court, leaving the cabinet four screens away — so the cheapest thing a player
// could do after a loss was the most expensive one to ask for. The retry rows
// only appear on a loss: a clear ends on the curtain call, which is the flourish
// this screen is built around, and it stands where these rows would.
const RESULT_OPT_H = 14;
// The rows stand in the curtain call's place and reach down over the prompt
// line: they name their own actions, so there is nothing left to prompt for.
const RESULT_OPT_TOP = RESULT_FOOTER_MID + TEXT_INK_H / 2 - RESULT_OPT_H * 2;
export class ResultsState {
  constructor({ result, gains, save, onDone, onRetry }) {
    this.result = result; this.gains = gains; this.save = save; this.onDone = onDone;
    // No retry offered (overtime's seed is the day's, not the run's) falls back
    // to the plain prompt rather than drawing a row that cannot fire.
    this.onRetry = onRetry || null;
  }
  // Not on a quit. That button is labelled EXIT TO FOOD COURT and the player
  // just pressed it, so offering them the choice again — with RUN IT AGAIN
  // sitting under the cursor — argues with the thing they already decided.
  get retryable() { return !!this.onRetry && !this.result.success && this.result.reason !== 'QUIT'; }
  enter() {
    this.t = 0; this.shown = 0; this.idx = 0;
    this.shells = [];       // rising mortars; they burst at the top of their arc
    this.shellT = 0.25;     // first one goes up almost immediately
    this.streamerT = 0;
    this.lastBurst = null;
    clearParticles();
    Input.setMenuButtons();
    Audio.sfx(this.result.success ? 'win' : 'lose');
  }
  // Fireworks over the celebration row, plus streamers tumbling down the
  // frame. Losses get neither — a quiet screen is part of the joke.
  updateParty(dt) {
    if (!this.result.success || this.save.settings.reducedMotion) return;
    this.shellT -= dt;
    if (this.shellT <= 0) {
      this.shellT = 0.55 + Math.random() * 0.7;
      const x = 40 + Math.random() * (W - 80);
      this.shells.push({
        x, y: H + 6, vx: (Math.random() - 0.5) * 24, vy: -(230 + Math.random() * 50),
        fuse: 0.85 + Math.random() * 0.3, color: PARTY_COLORS[(Math.random() * PARTY_COLORS.length) | 0],
      });
      // The original blip stays as the tonal layer — it's the part that reads
      // as "a thing launched" — with the new air underneath it for body.
      Audio.sfx('ui');
      Audio.sfx('fizzUp', { pitch: 0.9 + Math.random() * 0.3 });
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.fuse -= dt; s.vy += 120 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      // a thin trail of sparks so the shell reads as climbing, not floating
      if (Math.random() < 0.5) burst(s.x, s.y, 1, 12, 0.28, s.color, 1.1, 40);
      if (s.fuse <= 0) {
        // low gravity on the shrapnel: the ring hangs, then drifts down
        burst(s.x, s.y, 26, 115, 1.3, s.color, 4.5, 30);
        burst(s.x, s.y, 6, 40, 0.3, '#ffffff', 3, 18); // white core flash
        this.shells.splice(i, 1);
        // 'coin' is the sparkle on top and always plays — it's the cue the
        // burst is recognisable by. Detuned per shot so a run of them varies.
        Audio.sfx('coin', { pitch: 0.9 + Math.random() * 0.35 });
        // Underneath it, never the same crack twice running: pick a different
        // shape from the last one, then detune that too.
        let pick = (Math.random() * BURST_SFX.length) | 0;
        if (BURST_SFX[pick] === this.lastBurst) pick = (pick + 1) % BURST_SFX.length;
        this.lastBurst = BURST_SFX[pick];
        Audio.sfx(this.lastBurst, { pitch: 0.85 + Math.random() * 0.4 });
      }
    }
    // Streamers: paper ribbons that fall past the whole screen, spinning.
    this.streamerT -= dt;
    if (this.streamerT <= 0) {
      this.streamerT = 0.12 + Math.random() * 0.1;
      spawnShard(
        Math.random() * W, -6,
        (Math.random() - 0.5) * 30, 26 + Math.random() * 34,
        4.5, PARTY_COLORS[(Math.random() * PARTY_COLORS.length) | 0],
        2 + Math.random() * 2, 5 + Math.random() * 4,
        (Math.random() - 0.5) * 9, 14,
      );
    }
  }
  update(dt) {
    this.t += dt;
    this.updateParty(dt);
    updateParticles(dt);
    this.shown = Math.min(this.result.score, this.shown + dt * Math.max(500, this.result.score));
    // Short enough to only swallow a stray input carried in from the run; the
    // screen is fully drawn on frame one, so a longer lock just reads as stuck.
    if (this.t <= 0.15) { Input.endFrame(); return; }
    if (this.retryable) {
      if (Input.pressed('down') || Input.pressed('right') || Input.pressed('up') || Input.pressed('left')) {
        this.idx = 1 - this.idx; Audio.sfx('ui');
      }
      // Tap-to-select, tap-again-to-confirm, the same contract every hub list
      // makes — a phone has no arrow keys and the rows are the only way through.
      if (Input.pressed('pointer')) {
        const i = Math.floor((Input.pointer.y - RESULT_OPT_TOP) / RESULT_OPT_H);
        if (i >= 0 && i < 2) {
          if (this.idx === i) this.choose(i);
          else { this.idx = i; Audio.sfx('ui'); }
        }
      }
      // `jump` is deliberately not a confirm here: it is the button the player
      // was mashing a second ago, and it would pick a row before they read one.
      if (Input.pressed('confirm')) this.choose(this.idx);
    } else if (Input.pressed('confirm') || Input.pressed('pointer') || Input.pressed('jump')) {
      Audio.sfx('uiConfirm');
      this.onDone();
    }
    Input.endFrame();
  }
  choose(i) {
    Audio.sfx('uiConfirm');
    if (i === 0) this.onRetry(); else this.onDone();
  }
  draw(ctx) {
    drawTubeFace(ctx);
    drawTubeTexture(ctx);
    drawTubeMask(ctx);
    // Party drawn last, unclipped: the celebration spills past the glass
    // and over the bezel instead of being cut off at the tube's curve.
    drawParticles(ctx);
    for (const s of this.shells) {
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 3);
    }
    const r = this.result;
    // Everything below is pinned to the tube: the glass runs TUBE_INSET_Y to
    // H - TUBE_INSET_Y, and the title and footer sit a margin inside that.
    drawTextCentered(ctx, r.success ? (r.boss ? 'BOSS DEFEATED' : 'STAGE COMPLETE') : (r.failMsg || 'UNPLUGGED'), W / 2, 38, r.success ? '#48c848' : '#e04848', 2, 'title');
    // MISSION INCOMPLETE never said what was incomplete, and the run knew: the
    // count sits under the headline in the same words the GOAL panel used, so
    // the answer is where the question was asked rather than in the ledger of
    // rewards below it.
    if (r.failDetail) drawTextCentered(ctx, r.failDetail, W / 2, 56, '#c05050', 1);
    // The ledger is COLLECTED before any of it is drawn: its type size falls
    // out of how many rows there turned out to be, so the rows have to exist
    // first. Blank ones are dropped rather than left as a gap — an empty row
    // used to cost the whole block a size for nothing.
    const rows = [];
    const line = (t, c) => { if (String(t).trim()) rows.push([t, c || '#c8c8d8']); };
    line(`COINS BANKED: +${formatCoins(this.gains.coins)}`, '#f6d33c');
    // The best score banks whether or not the run cleared, so this row can land
    // on a loss — where a gold exclamation directly above NO PLUGS was the
    // screen congratulating and penalising in the same breath. The fact keeps
    // its place; the party is only thrown for a clear.
    if (r.newBestScore) line(r.success ? 'NEW BEST SCORE ON THIS STAGE!' : 'STILL A NEW BEST SCORE ON THIS STAGE.', r.success ? '#f6d33c' : '#8a8a98');
    if (r.stage) {
      const plugs = this.save.slot.campaign.plugs[r.stage.id] || [];
      line(`PLUGS: ${['MISSION', 'CHALLENGE', 'TOASTER'].map((n, i) => `${n} ${plugs[i] ? 'X' : '-'}`).join('  ')}`, '#48e0c8');
      if (this.gains.plugsNew > 0) line(`+${this.gains.plugsNew} NEW PLUG${this.gains.plugsNew > 1 ? 'S' : ''}`, '#48e0c8');
      // Three dashes on the row above is the whole consequence, and it is a long
      // way from "the next stage is still shut". Name the stage that stayed
      // locked — and only when it did, so a toaster salvaged from a lost run
      // (which opens the next stage on its own) is not told off for it.
      else {
        const nxt = nextStage(r.stage);
        if (nxt && !stageUnlocked(this.save.slot, nxt)) line(`NO PLUGS. ${nxt.id.toUpperCase()} STAYS LOCKED.`, '#c05050');
      }
      if (r.rank) {
        const osha = this.save.slot.mods.equipped.includes('osha');
        line(`RANK: ${r.rank}${osha ? '*' : ''}`, r.rank === 'S' || r.rank === 'CONCERNING' ? '#f6d33c' : '#c8c8d8');
        line(RANK_LINES[r.rank] || '', '#8a8a98');
        // Quietest row on the screen, but not below the floor: #5a5a68 measures
        // ~2.3:1 against the lit tube, which is the same grey the prompt just
        // lost for being unreadable at phone size. The aside shares the rank
        // line's grey instead — the asterisk already ties the two together.
        if (osha) line('* THE BINDER IS DISAPPOINTED.', '#8a8a98');
      }
    }
    // Two named mastery-ups, then a summary — a full-cast run would otherwise
    // stack eight lines straight through the celebration row below.
    const mastery = this.gains.mastery || [];
    mastery.slice(0, 2).forEach((m) => line(`${m.heroId.toUpperCase()} MASTERY LEVEL ${m.level}!`, '#f890b8'));
    if (mastery.length > 2) line(`+${mastery.length - 2} MORE MASTERY-UPS. THE BENCH IS IMPRESSED.`, '#f890b8');

    // The prompt is placed and sized FIRST and everything else is fitted above
    // it, because it is the one line on this screen that has to be acted on
    // rather than read — the same trade BriefingState makes. It used to get the
    // leftovers: body size, the dimmest grey on the tube (~2.3:1 against the
    // phosphor glow it sits in, under even the large-text floor), and a hero
    // clamp whose bottom stop was BELOW its own baseline, so a dense result
    // stood the curtain call on top of it.
    const promptS = Input.isTouchDevice() ? 1.25 : 1;
    const footerInkTop = RESULT_FOOTER_MID - TEXT_INK_H * promptS / 2;
    const heroFeet = footerInkTop - RESULT_GAP;
    // Height first, then width: a six-line clear has room to spend and a
    // ten-line one has none, and either way the longest row still has to clear
    // the glass. Whichever bound is tighter wins, and never below 1 — the point
    // of the exercise is that a phone stops getting caption-sized copy.
    const widest = rows.reduce((m, [t]) => Math.max(m, textWidth(t, 1)), 1);
    // The ledger is fitted above whichever stands below it — the retry rows on a
    // loss, the curtain call on a clear.
    const bodyFloor = this.retryable ? RESULT_OPT_TOP - RESULT_GAP : heroFeet - RESULT_HERO_H - RESULT_GAP;
    const bodyS = Math.max(1, Math.min(
      RESULT_BODY_S_MAX,
      (bodyFloor - RESULT_BODY_TOP) / (rows.length * RESULT_ROW_H),
      (W - TUBE_INSET_X * 2 - RESULT_BODY_PAD * 2) / widest,
    ));
    // Derived from the ledger rather than fixed, so the headline stays a step
    // above it wherever it lands.
    drawTextCentered(ctx, `SCORE: ${Math.floor(this.shown)}`, W / 2, 68, '#fff', bodyS + 0.3);
    let y = RESULT_BODY_TOP;
    for (const [t, c] of rows) { drawTextCentered(ctx, t, W / 2, y, c, bodyS); y += RESULT_ROW_H * bodyS; }

    if (r.success && r.team && r.team.length) {
      // The curtain call stands on a fixed floor and takes whatever height the
      // ledger left it, down to a floor of its own: it is the flourish, and the
      // rows above it and the prompt below it are the content. Shrinking beats
      // the old behaviour of moving down into them.
      const heroH = Math.max(RESULT_HERO_H_MIN, Math.min(RESULT_HERO_H, heroFeet - RESULT_GAP - y));
      // The relay team takes a bow — each hero in their own celebrate pose,
      // slightly out of phase so the line reads as a crowd, not a metronome.
      // Only one hero is ever inside a level at a time, but the cast all exist
      // together OUTSIDE the cabinets (the food court, the hub), so a curtain
      // call after the stage clears is the one moment they can share a frame.
      r.team.forEach((id, i) => drawToon(ctx, id,
        { kind: 'celebrate', grounded: true, menu: true, time: this.t + i * 0.35 },
        W / 2 + (i - (r.team.length - 1) / 2) * heroH * 1.5, heroFeet, heroH));
    }
    if (this.retryable) {
      // Retry sits first and starts selected: it is what the player came to this
      // screen wanting, and confirm-on-arrival should be the cheap thing.
      ['RUN IT AGAIN', 'BACK TO THE FOOD COURT'].forEach((label, i) => {
        const sel = i === this.idx;
        const y = RESULT_OPT_TOP + i * RESULT_OPT_H;
        if (sel) drawMenuRow(ctx, TUBE_INSET_X + 6, y + 1, W - (TUBE_INSET_X + 6) * 2, RESULT_OPT_H - 2);
        drawTextCentered(ctx, `${sel ? '> ' : '  '}${label}`, W / 2,
          textYForMid(y + RESULT_OPT_H / 2, 1), sel ? '#c9a0ff' : '#8a8a98', 1);
      });
    } else {
      drawTextCentered(ctx, `${confirmVerb()} TO CONTINUE`, W / 2, textYForMid(RESULT_FOOTER_MID, promptS), '#c8c8d8', promptS);
    }
  }
}

// Where the beats that carry art (Eggshell, the vacuum, the OVERTIME card)
// leave off, and where the beat counter starts.
const FINALE_ART_BOTTOM = 108;
const FINALE_TEXT_BOTTOM = H - 30;
// The strip the closing beat holds back for HR's fine print, and how long the
// ending gets to sit on its own before the disclaimer lands on it. Long enough
// to read as a separate thought; short enough that nobody reaches for a button.
const FINALE_CODA_BAND = 40;
const FINALE_CODA_DELAY = 1.4;
const LAST_BEAT = FINALE_BEATS.length - 1;

// THE ONE SCREEN THAT STILL TYPES A LETTER AT A TIME.
//
// The intro and the briefing gave the character crawl up for the line cascade
// above, on the grounds that nobody reads a block while it assembles and that
// those screens are re-read before every stage and again on every retry. The
// finale is neither of those things: it is seen once, and its beats are single
// sentences rather than eight-line memos, so the crawl costs a reader who
// already knows the words nothing.
//
// And here the wait is the delivery. These are a joke a screen, and the dead
// air in front of the last two is the setup — cascade them in and all nine
// punchlines land the instant the screen does. It is the same reason the coda
// sits on FINALE_CODA_DELAY before it starts typing at all. If this ever gets
// unified with drawCascade for consistency's sake, that is what it costs.
export class FinaleState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() {
    this.beat = 0; this.chars = 0; this.blocks = [];
    this.codaT = 0; this.codaChars = 0; this.coda = null;
    Input.setMenuButtons(); Audio.setBank(FINALE_THEME);
  }
  // Which band this beat's prose owns. Shared by block() and draw() so the
  // typed layout and the drawn one cannot drift apart.
  layout(i) {
    const art = (i >= 1 && i <= 6) || i === LAST_BEAT;
    return {
      art,
      top: art ? FINALE_ART_BOTTOM : 56,
      bottom: i === LAST_BEAT ? FINALE_TEXT_BOTTOM - FINALE_CODA_BAND : FINALE_TEXT_BOTTOM,
    };
  }
  // One layout per beat, kept — see IntroState.block.
  block(i) {
    if (!this.blocks[i]) {
      const { top, bottom } = this.layout(i);
      this.blocks[i] = fitProse(FINALE_BEATS[i], W - 56, bottom - top, TYPE_STEPS, i === LAST_BEAT ? 1 : Infinity);
    }
    return this.blocks[i];
  }
  codaBlock() {
    if (!this.coda) this.coda = fitProse(FINALE_CODA, W - 56, FINALE_CODA_BAND, [1.25, 1]);
    return this.coda;
  }
  update(dt) {
    if (this.beat >= FINALE_BEATS.length) { Input.endFrame(); return; }
    this.chars += dt * 34;
    const text = FINALE_BEATS[this.beat];
    const last = this.beat === LAST_BEAT;
    const done = this.chars >= text.length;
    if (last && done) {
      this.codaT += dt;
      if (this.codaT >= FINALE_CODA_DELAY) this.codaChars += dt * 34;
    }
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      // Three states to skip through on the last beat, not two: the line, then
      // the disclaimer. A player who mashes still gets to see the fine print
      // rather than skipping the ending's second half without knowing it exists.
      if (!done) this.chars = text.length;
      else if (last && this.codaChars < FINALE_CODA.length) {
        this.codaT = FINALE_CODA_DELAY; this.codaChars = FINALE_CODA.length;
      } else {
        this.beat++; this.chars = 0; Audio.sfx('ui');
        if (this.beat >= FINALE_BEATS.length) {
          this.save.slot.campaign.storyFlags.sawEnding = true;
          this.save.persist();
          this.onDone();
        }
      }
    }
    Input.endFrame();
  }
  draw(ctx) {
    if (this.beat >= FINALE_BEATS.length) return;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    if (this.beat >= 1 && this.beat <= 5) drawProp(ctx, 'eggshell', W / 2 - 24, 60, 48, 40);
    if (this.beat === 6) drawProp(ctx, 'dustdevil', W / 2 - 20, 60, 40, 44);
    if (this.beat === LAST_BEAT) drawTextCentered(ctx, 'OVERTIME UNLOCKED', W / 2, 70, '#8858c8', 2, 'title');
    // The ending is one sentence on a black screen and it used to be set at the
    // same size as a menu row, pinned to y150 with a hard 58-character break.
    // It takes whatever the beat's art leaves it now, and centres in that.
    const { top, bottom } = this.layout(this.beat);
    drawProse(ctx, this.block(this.beat), top, bottom - top, '#e8e8f0', Math.floor(this.chars));
    // Muted and a size down from the line above: the disclaimer has to read as
    // filed against the ending, not as the ending's own last sentence.
    if (this.beat === LAST_BEAT && this.codaChars > 0) {
      drawProse(ctx, this.codaBlock(), bottom, FINALE_CODA_BAND, '#8a8a98', Math.floor(this.codaChars));
    }
    drawTextCentered(ctx, `${this.beat + 1}/${FINALE_BEATS.length}`, W / 2, H - 20, '#5a5a68');
  }
}

// FIELD GUIDE: every enemy, object, and pickup with its sprite and one line
// of truth. Color legend: red = avoid, teal = touch it, gold = collect.
const GUIDE_PAGES = [
  {
    title: 'HAZARDS: GROUND FLOOR', color: '#e04848', hint: 'RED = AVOID. JUMP THESE.',
    rows: [
      { s: 'cactus', name: 'THORN CACTUS', desc: 'RED AND PRICKLY. JUMP IT. BREAKABLE.' },
      { s: 'snowman', name: 'HOSTILE SNOWMAN', desc: 'COLD, CROSS, AND BREAKABLE. JUMP IT.' },
      { s: 'crate', name: 'CRATE', desc: 'WOOD. SOMETIMES STACKED. JUMP OR SMASH IT.' },
      { s: '_pipe', name: 'PIPE', desc: 'TALL AND SMUG. JUMP IT.' },
      { s: 'barrel', name: 'BARREL', desc: 'ROLLS AT YOU. JUMP IT.' },
      { s: 'chair', name: 'OFFICE CHAIR', desc: 'ALSO ROLLS AT YOU. FASTER. JUMP IT.' },
      { s: '_gap', name: 'PIT', desc: 'A HOLE WHERE FLOOR SHOULD BE. JUMP IT.' },
      { s: 'tombstone', name: 'TOMBSTONE', desc: 'JUMP IT. RESPECTFULLY.' },
      { s: 'zombieWalk', name: 'ZOMBIE', desc: 'SHAMBLES TOWARD YOU. JUMP IT.' },
    ],
  },
  {
    title: 'HAZARDS: AIRBORNE + WEIRD', color: '#e04848', hint: 'RED = AVOID. DUCK OR DODGE THESE.',
    rows: [
      { s: 'drone', name: 'DRONE', desc: 'FLIES LOW. DUCK; FERNWICK CAN SHIELD-ROLL.' },
      { s: 'drone', name: 'SHOOTER DRONE', desc: 'STAYS HIGH. DODGE ITS SHOTS INSTEAD.' },
      { s: '_shot', name: 'ENEMY SHOT', desc: 'RED MEANS DODGE. YELLOW MEANS ABOUT TO FIRE.' },
      { s: 'buzzbird', name: 'BUZZBIRD', desc: 'MID-AIR MENACE. DO NOT JUMP INTO IT.' },
      { s: 'icicle', name: 'ICICLE', desc: 'FALLS WHEN YOU GET CLOSE. WATCH ITS SHADOW.' },
      { s: '_beatBar', name: 'BEAT BAR', desc: 'POPS UP ON THE BEAT. JUMP ON TIME.' },
      { s: '_paper', name: 'PAPERWORK', desc: 'FLIES LOW. DUCK. DO NOT SIGN IT.' },
      { s: 'cardboardMonster', name: 'BOX MONSTER', desc: 'CARDBOARD. STILL COUNTS. JUMP IT.' },
    ],
  },
  {
    title: 'TOUCH THESE ON PURPOSE', color: '#48e0c8', hint: 'TEAL = RUN INTO IT. IT IS FINE.',
    rows: [
      { s: '_qcrate', name: '!-CRATE', desc: 'FLOATS. TOUCH TO BREAK. DROPS COINS.' },
      { s: 'target', name: 'TARGET', desc: 'FLOATING TARGET. TOUCH TO DESTROY.' },
      { s: 'printer', name: 'PRINTER', desc: 'SHOOTS PAPER. RAM IT TO BREAK IT.' },
      { s: 'battery', name: 'FROZEN SWITCH', desc: 'TOUCH TO EXTEND A BRIDGE OVER THE NEXT PIT.' },
      { s: 'boostPad', name: 'BOOST PAD', desc: 'RUN OVER IT. GO UNREASONABLY FAST.' },
      { s: '_portal', name: 'HERO PORTAL', desc: 'RUN THROUGH TO TAG IN THE PREVIEWED HERO.' },
      { s: 'eggshell', name: 'CLOWN-COPTER', desc: 'CATCH IT WHEN IT SWOOPS LOW. CHASE MISSIONS.' },
    ],
  },
  // All eight capsules live on one page. They come from the same drip table and
  // behave identically, so splitting them by flavour ("essentials" vs "hero
  // traits") only made players think the missing half did not exist.
  {
    title: 'PICKUPS: CAPSULES', color: '#72d8f0', hint: 'BLUE = A TIMED POWER. GRAB A DUPLICATE TO OVERCHARGE IT.',
    rows: [
      { s: 'capShield', name: 'SHIELD', desc: 'ABSORBS ONE HIT. POLITELY.' },
      { s: 'capMagnet', name: 'MAGNET', desc: 'PULLS NEARBY COINS TO YOU.' },
      { s: 'capStar', name: 'STAR', desc: 'SCORE MULTIPLIER. YES, IT LOOKS LIKE A TARGET.' },
      { s: 'capAirJump', name: 'AIR JUMP', desc: 'ONE EXTRA AIR-JUMP. STACKS WITH MOCHI AND THE CAPE.' },
      { s: 'capSpeed', name: 'SPEED BURST', desc: 'RUNS FASTER. THE SCENERY OBJECTS.' },
      { s: 'capLowGrav', name: 'LOW GRAVITY', desc: 'YOUR JUMPS GET BIGGER. PHYSICS FILES A COMPLAINT.' },
      { s: 'capUnpeel', name: 'UNPEELABLE', desc: 'RARE. HITS BOUNCE OFF. PITS STILL DO NOT CARE.' },
      { s: 'capRelay', name: 'RELAY BATON', desc: 'VERY RARE. BANKS ONE SUPERCHARGED POWER. SPEND IT WELL.' },
    ],
  },
  {
    title: 'PICKUPS: ESSENTIALS + MISSION', color: '#f6d33c', hint: 'GOLD = COLLECT. NO DOWNSIDES. PROBABLY.',
    rows: [
      { s: 'coin', name: 'COIN', desc: 'MONEY. THE ARCADE RUNS ON IT.' },
      { s: 'battery', name: 'BATTERY', desc: '+1 BATTERY CELL. HEALTH, BASICALLY.' },
      { s: 'appliance', name: 'GOLDEN TOASTER', desc: 'THE THIRD PLUG. GRAB IT MID-STAGE.' },
      { s: 'cord', name: 'CORD PIECE', desc: 'MISSION PICKUP. COLLECT ALL THE PIECES.' },
      { s: 'resident', name: 'RESIDENT', desc: 'ALIVE. WAVES. FOLLOWS YOU. ESCORT THEM TO THE FINISH.' },
    ],
  },
];

export class FieldGuideState {
  constructor({ onDone, settings }) { this.onDone = onDone; this.settings = settings || {}; }
  // Paging already claims the whole screen (see update()), so DONE gets its
  // own carved-out corner.
  enter() { this.page = 0; this.t = 0; Input.setMenuButtons(); }
  update(dt) {
    this.t += dt;
    const n = GUIDE_PAGES.length;
    if (Input.pressed('right') || Input.pressed('down')) { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('left') || Input.pressed('up')) { this.page = (this.page + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer') && this.t > 0.3) {
      const p = Input.pointer;
      // DONE lives in the bottom-right corner (see draw()), carved out of the
      // otherwise screen-wide paging zones so leaving needs no other button.
      if (p.x > W - 56 && p.y > H - 20) { Audio.sfx('ui'); this.onDone(); }
      else if (p.x < W / 3) { this.page = (this.page + n - 1) % n; Audio.sfx('ui'); }
      else { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    }
    if (Input.pressed('confirm') && this.t > 0.3) { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('back')) { Audio.sfx('ui'); this.onDone(); }
    Input.endFrame();
  }
  // yMid is the row text's optical centre. Icons are centred on it rather than
  // sharing one bottom edge — bottom-aligning left the short ones (boost pad,
  // coin, fuse) sitting entirely below their own label.
  drawIcon(ctx, key, cx, yMid) {
    const top = (h) => Math.round(yMid - h / 2);
    // custom composites for things without a single sprite
    if (key === '_gap') {
      const t0 = top(8);
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 10, t0 + 2, 20, 6);
      ctx.fillStyle = '#30303f'; ctx.fillRect(cx - 12, t0, 3, 8); ctx.fillRect(cx + 9, t0, 3, 8);
      return;
    }
    if (key === '_beatBar') {
      const t0 = top(10);
      ctx.fillStyle = '#e04898'; ctx.fillRect(cx - 4, t0, 8, 10);
      ctx.fillStyle = '#f890c8'; ctx.fillRect(cx - 4, t0, 8, 2);
      return;
    }
    if (key === '_paper') {
      const t0 = top(8);
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 5, t0, 10, 8);
      ctx.fillStyle = '#f0f0f8'; ctx.fillRect(cx - 4, t0 + 1, 8, 6);
      ctx.fillStyle = '#8a8a98'; ctx.fillRect(cx - 3, t0 + 3, 6, 1);
      return;
    }
    if (key === '_shot') {
      const t0 = top(6);
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 3, t0, 6, 6);
      ctx.fillStyle = '#e04848'; ctx.fillRect(cx - 2, t0 + 1, 4, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, t0 + 2, 2, 2);
      return;
    }
    if (key === '_portal') {
      const pulse = Math.round(Math.sin(this.t * 5) * 2);
      const h = 20 + pulse;
      drawProp(ctx, 'portal', cx - 6, top(h), 12, h);
      return;
    }
    if (key === '_pipe') { drawProp(ctx, 'pipe', cx - 7, top(18), 14, 18); return; }
    if (key === '_qcrate') {
      const bob = Math.round(Math.sin(this.t * 3) * 2);
      drawProp(ctx, 'qcrate', cx - 6, top(11) + bob, 12, 11);
      return;
    }
    if (hasProp(key)) {
      const d = GUIDE_ICON_SIZES[key] || [12, 11];
      // Animated props (fire) keep flickering in the guide — a still frame of
      // something the player only ever sees moving is a worse likeness.
      const frame = this.settings.reducedMotion ? 0 : Math.floor(this.t * 11);
      drawProp(ctx, key, cx - d[0] / 2, top(d[1]), d[0], d[1], frame);
      return;
    }
    const spr = getSprite(key);
    if (spr) ctx.drawImage(spr, cx - Math.floor(spr.width / 2), top(spr.height));
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const p = GUIDE_PAGES[this.page];
    drawTextCentered(ctx, 'FIELD GUIDE', W / 2, 14, '#fff', 2, 'title');
    drawTextCentered(ctx, p.title, W / 2, 36, p.color, 1);
    drawTextCentered(ctx, p.hint, W / 2, 48, '#5a5a68');
    const rh = p.rows.length > 9 ? 18 : p.rows.length > 8 ? 20 : 22; // long pages tighten up a touch
    p.rows.forEach((r, i) => {
      const y = 62 + i * rh;
      this.drawIcon(ctx, r.s, 44, y + 9);
      drawText(ctx, r.name, 70, y + 6, p.color);
      drawText(ctx, r.desc, 190, y + 6, '#c8c8d8');
    });
    // Touch pages by tapping the left/right thirds of the screen (see update());
    // the arrow-key hint means nothing there, so it's swapped for the gesture,
    // and DONE — the corner tap zone update() carves out — gets its own label.
    //
    // isTouchDevice(), not usingTouch: usingTouch only turns true after a finger
    // has already landed, so a phone opening this screen cold was told to press
    // ESC — a key it does not have — until it tapped something.
    if (Input.isTouchDevice()) {
      drawTextCentered(ctx, `TAP L/R TO PAGE   ${this.page + 1}/${GUIDE_PAGES.length}`, W / 2, H - 14, '#5a5a68');
      drawText(ctx, 'DONE', W - 50, H - 18, '#f6d33c');
    } else {
      drawTextCentered(ctx, `< PREV   PAGE ${this.page + 1}/${GUIDE_PAGES.length}   NEXT >   ESC: BACK`, W / 2, H - 14, '#5a5a68');
    }
  }
}

// SOUND TEST: the classic arcade jukebox. Every cabinet track + the hub theme.
const JUKEBOX = [
  { name: 'EMPTY ARCADE (TITLE THEME)', bank: TITLE_THEME },
  { name: 'THE FOOD COURT (HUB THEME)', bank: HUB_THEME },
  ...CABINETS.map((c) => ({ name: `${c.name} (${c.genre})`, bank: c.music })),
  { name: 'ONE MORE SWITCH (FINALE THEME)', bank: FINALE_THEME },
];
// Track list sits above the visualizer bars so the two never collide. The bars
// are drawn from the bottom up and the tallest reaches VIS_TOP, so the rows
// divide what is left rather than sitting at a fixed pitch — at a fixed 14 the
// last row's cursor band ran under the bars, which was survivable while the row
// was bare lettering and is not once it has a lit rectangle behind it.
const JUKEBOX_TOP = 58;
const VIS_TOP = H - 24 - 13;
function jukeboxRowH(count) { return Math.min(14, (VIS_TOP - 4 - JUKEBOX_TOP) / count); }

export class SoundTestState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.idx = 0; this.playing = -1; this.t = 0; Audio.setBank(null); Input.setMenuButtons(); }
  exit() { Audio.setBank(null); }
  play(i) {
    this.playing = i;
    Audio.setBank(JUKEBOX[i].bank);
    Audio.sfx('uiConfirm');
  }
  update(dt) {
    this.t += dt;
    const n = JUKEBOX.length;
    const total = n + 1; // +1 for the trailing BACK row
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % total; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + total - 1) % total; Audio.sfx('ui'); }
    if (Input.pressed('confirm')) { if (this.idx === n) { Audio.setBank(null); this.onDone(); } else this.play(this.idx); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - JUKEBOX_TOP) / jukeboxRowH(total));
      if (i >= 0 && i < total) {
        if (this.idx === i) { if (i === n) { Audio.setBank(null); this.onDone(); } else this.play(i); }
        else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('back')) { Audio.setBank(null); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SOUND TEST', W / 2, 16, '#fff', 2, 'title');
    drawTextCentered(ctx, 'ALL CHIPTUNES ARE PLAYED LIVE BY A VERY SMALL ORCHESTRA.', W / 2, 40, '#5a5a68');
    // The trailing BACK row is drawn from the same list as the tracks so it gets
    // the same cursor band and the same pitch the hit-test uses.
    const rows = JUKEBOX.concat([null]);
    const rowH = jukeboxRowH(rows.length);
    const band = centredBand(rows.map((tr) => (tr ? `> * ${tr.name}  (${tr.bank.bpm} BPM)` : '')));
    rows.forEach((tr, i) => {
      const sel = i === this.idx;
      const on = tr && i === this.playing;
      const label = tr ? `${on ? '* ' : ''}${tr.name}  (${tr.bank.bpm} BPM)` : 'BACK';
      const rowTop = JUKEBOX_TOP + i * rowH;
      if (sel) drawMenuRow(ctx, band.x, rowTop + 1, band.w, rowH - 2);
      drawTextCentered(ctx, (sel ? '> ' : '') + label, W / 2,
        textYForMid(Math.round(rowTop + rowH / 2)), on ? '#48e0c8' : sel ? '#c9a0ff' : '#c8c8d8');
    });
    if (this.playing >= 0) {
      const bars = 12;
      for (let i = 0; i < bars; i++) {
        const hgt = 3 + Math.abs(Math.sin(this.t * 6 + i * 0.9)) * 10;
        ctx.fillStyle = '#48e0c8';
        ctx.fillRect(W / 2 - bars * 5 + i * 10, H - 24 - hgt, 6, hgt);
      }
    }
    // The BACK row is in the list itself, so touch needs no key named for it.
    drawTextCentered(ctx, Input.isTouchDevice() ? 'TAP: PLAY' : 'ENTER: PLAY   ESC: BACK',
      W / 2, H - 14, '#5a5a68');
  }
}

export class HowToPlayState {
  constructor({ onDone }) { this.onDone = onDone; }
  // A tap ANYWHERE dismisses this card (update()), and the footer already
  // says so — no floating corner button needed on top of that.
  enter() { this.t = 0; Input.setMenuButtons(); }
  update(dt) {
    this.t += dt;
    if (this.t > 0.3 && (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('pointer'))) {
      Audio.sfx('ui');
      this.onDone();
    }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'HOW TO PLAY', W / 2, 22, '#fff', 2, 'title');
    drawTextCentered(ctx, 'ONE HERO RENDERS AT A TIME. BUDGET CUTS. RUN ANYWAY.', W / 2, 44, '#8a8a98');
    let y = 64;
    const line = (a, b, c) => {
      drawText(ctx, a, 46, y, c || '#f6d33c');
      drawText(ctx, b, 170, y, '#c8c8d8');
      y += 15;
    };
    // The three control rows used to carry both schemes either side of a dash,
    // which meant half of every row named hardware the reader does not have.
    // A phone gets the gestures, a keyboard gets the keys, nobody gets both.
    const touch = Input.isTouchDevice();
    line('JUMP', touch ? 'TAP. HOLD FOR HIGHER.' : 'SPACE / W / UP. HOLD FOR HIGHER.');
    line('DUCK', touch ? 'SWIPE DOWN AND HOLD.' : 'S / DOWN. HOLD IT.');
    line('HERO POWER', touch ? 'THE PWR BUTTON, OR SWIPE RIGHT.' : 'RIGHT / D. X / SHIFT TOO.');
    line('PORTALS', 'RUN THROUGH TO TAG IN THE PREVIEWED HERO.', '#48e0c8');
    line('RELAY BATON', 'VERY RARE CAPSULE. BANKS ONE SUPERCHARGED POWER.', '#48e0c8');
    y += 4;
    line('MISSION', 'FINISH IT TO WIN THE STAGE. EARNS A PLUG.', '#f890b8');
    line('CHALLENGE', 'OPTIONAL. ANOTHER PLUG. NO PRESSURE. SOME PRESSURE.', '#f890b8');
    line('TOASTER', 'GRAB THE FLOATING APPLIANCE MID-STAGE. THIRD PLUG.', '#f890b8');
    line('PLUGS', 'ONE-TIME EACH. UNLOCK CABINETS. COINS BUY UPGRADES.', '#f890b8');
    // The last two rows are the only ones that name a way OUT of something, and
    // a phone has none of the keys they used to name: the breaker box carries a
    // SKIP button, and pause is a button that opens plates you press.
    line('BREAKER BOX', `WIN IT: BONUS POWERUP. ${touch ? 'TAP SKIP' : 'ESC OR SKIP'} TO BAIL OUT.`, '#f890b8');
    y += 4;
    line('PAUSE / MUTE', touch ? 'THE PAUSE BUTTON. EXIT TO FOOD COURT QUITS.' : 'P OR ESC / M. ESC AGAIN QUITS.');
    drawTextCentered(ctx, 'JUMP RED HAZARDS. DUCK THE DRONES. MIND THE GAPS.', W / 2, y + 6, '#d84828');
    drawTextCentered(ctx, `${confirmVerb()}: BACK`, W / 2, H - 16, '#5a5a68');
  }
}

const SETTINGS_TOP = 70, SETTINGS_ROW = 18;

export class SettingsState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() { this.idx = 0; Input.setMenuButtons(); }
  volumeOption(key, name) {
    const s = this.save.settings;
    const adjust = (dir) => {
      const current = Number.isFinite(s.volumes[key]) ? s.volumes[key] : (key === 'music' ? 0.7 : 0.9);
      s.volumes[key] = Math.max(0, Math.min(1, Math.round((current + dir * 0.1) * 10) / 10));
      Audio.setVolumes(s.volumes);
    };
    const value = Number.isFinite(s.volumes[key]) ? s.volumes[key] : 1;
    const filled = Math.round(value * 10);
    return {
      label: `${name}: ${Math.round(value * 100)}%  [${'|'.repeat(filled)}${'.'.repeat(10 - filled)}]`,
      act: () => adjust(value >= 1 ? -10 : 1),
      adjust,
    };
  }
  options() {
    const s = this.save.settings;
    return [
      { label: `MUTE: ${s.muted ? 'ON' : 'OFF'}`, act: () => { s.muted = !s.muted; Audio.setMuted(s.muted); } },
      this.volumeOption('music', 'MUSIC VOLUME'),
      this.volumeOption('sfx', 'SFX VOLUME'),
      { label: `REDUCED MOTION: ${s.reducedMotion ? 'ON' : 'OFF'}`, act: () => { s.reducedMotion = !s.reducedMotion; } },
      { label: `REDUCED FLASHING: ${s.reducedFlashing ? 'ON' : 'OFF'}`, act: () => { s.reducedFlashing = !s.reducedFlashing; } },
      { label: `SCREEN SHAKE: ${Math.round(s.screenShake * 100)}%`, act: () => { s.screenShake = s.screenShake >= 1 ? 0 : s.screenShake + 0.5; } },
      { label: `HIGH CONTRAST OUTLINES: ${s.highContrast ? 'ON' : 'OFF'}`, act: () => { s.highContrast = !s.highContrast; } },
      { label: `GLOW EFFECTS: ${s.fancyFx ? 'ON' : 'OFF'}`, act: () => { s.fancyFx = !s.fancyFx; setFancyFx(s.fancyFx); } },
      { label: `ASSIST SPEED: ${s.assistSpeed}%`, act: () => { s.assistSpeed = s.assistSpeed === 100 ? 80 : s.assistSpeed + 10; } },
      { label: 'DONE', act: () => { this.save.persist(); this.onDone(); } },
    ];
  }
  update(dt) {
    const opts = this.options();
    if (Input.pressed('down')) { this.idx = (this.idx + 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('up')) { this.idx = (this.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('left')) { if (opts[this.idx].adjust) opts[this.idx].adjust(-1); else opts[this.idx].act(); Audio.sfx('ui'); }
    if (Input.pressed('right')) { if (opts[this.idx].adjust) opts[this.idx].adjust(1); else opts[this.idx].act(); Audio.sfx('ui'); }
    if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); opts[this.idx].act(); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - SETTINGS_TOP) / SETTINGS_ROW);
      if (i >= 0 && i < opts.length) {
        if (this.idx === i) { Audio.sfx('uiConfirm'); opts[i].act(); } else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('back')) { this.save.persist(); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SETTINGS', W / 2, 30, '#fff', 2, 'title');
    drawTextCentered(ctx, 'ALL OF THESE DO EXACTLY WHAT THEY SAY.', W / 2, 52, '#5a5a68');
    const opts = this.options();
    const band = centredBand(opts.map((o) => `> ${o.label}`));
    opts.forEach((o, i) => {
      const sel = i === this.idx;
      const rowTop = SETTINGS_TOP + i * SETTINGS_ROW;
      if (sel) drawMenuRow(ctx, band.x, rowTop + 1, band.w, SETTINGS_ROW - 2);
      // A bare leading '> ' on a centred row shunts the whole label half a
      // caret to the left as the cursor arrives; the closing one balances it.
      drawTextCentered(ctx, (sel ? '> ' : '') + o.label, W / 2,
        textYForMid(rowTop + SETTINGS_ROW / 2), sel ? '#c9a0ff' : '#c8c8d8');
    });
    // Touch selects a row with one tap and changes it with a second, same as
    // every other listMenu-style screen — there is no left/right gesture here.
    drawTextCentered(ctx, Input.isTouchDevice() ? 'TAP: SELECT   TAP AGAIN: CHANGE' : 'LEFT/RIGHT: ADJUST   ENTER: CHANGE', W / 2, H - 14, '#5a5a68');
  }
}
