// Title, slot select, difficulty select (the joke), intro cutscene, results,
// finale, settings. All keyboard + touch navigable.
import { W, H, bakeSS, onPresentationChanged, screen, setSceneGlow, setSkyFx, setOverlayMerge, pushOverlayDraw, setVisualiserFullscreen, setJukeboxPortrait, visualiserFrame, isPhonePortraitPresentation, presentationFrame } from '../engine/renderer.js';
import { titleProfileOptions } from '../engine/title-profile.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import {
  VISUALISER_NAMES, clamp, createVisualiser, pickVisualiser, smooth, setVisualiserViewport,
} from '../engine/visualisers.js';
import { defaultSettings, clampAudioSyncMs, AUDIO_SYNC_STEP } from '../engine/save.js';
import { formatBuildTime } from '../engine/build-time.js';
import {
  drawTextForPresentation as drawText,
  drawTextCenteredForPresentation as drawTextCentered,
  textWidth, getSprite, wrapText, platePath, drawPanel, drawMenuRow, onGameFontsChanged,
  textYForMid, TEXT_INK_H, TEXT_INK_TOP, drawPellet,
} from '../engine/sprites.js';
import {
  drawToon, drawRocketFist, drawThrownAxe, titleParadeAction,
  drawRangedProjectile, b33pTitleShotPose, B33P_TITLE_WINDUP_T,
} from '../sprites/toons.js';
import {
  drawProp, eggshellCopterArt, hasProp, glowSprite, propFrames, propFps, propSprite, PORTAL_SPRITE, portalArtWidth,
} from '../sprites/props.js';
import { burst, spawnShard, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';
import { readPlatform } from '../engine/platform.js';
import { framingIsChosen } from './run.js';

// Field-guide icon sizes (logical px) for vector props.
const GUIDE_ICON_SIZES = {
  cactus: [13, 19], thistle: [13, 19], snowman: [13, 19], crate: [12, 11], barrel: [13, 13], chair: [12, 10],
  tombstone: [11, 8], zombieWalk: [10, 14], resident: [10, 12], drone: [13, 8], buzzbird: [13, 8],
  icicle: [8, 10], cardboardMonster: [12, 9], cardBox: [12, 11], printer: [12, 8], capStar: [9, 9],
  battery: [8, 9], boostPad: [14, 5], coin: [8, 8], capShield: [9, 9],
  capMagnet: [9, 9], capAirJump: [9, 9], capSpeed: [9, 9], capLowGrav: [9, 9], capUnpeel: [9, 9], capRewind: [9, 9], appliance: [17, 14], cord: [13, 8], fuse: [9, 7],
  eggshell: [24, 20], eggshellCopter: [28, 28], target: [9, 9], beatBar: [8, 14],
  // Standing hazards. Each is its def box times PROP_TALL, rounded — the guide
  // has to show the art the lane shows, and for these the art is mostly the
  // part that is not the hitbox.
  popSpikes: [15, 11], campfire: [14, 13], fireBarrel: [13, 22], brazier: [12, 22], floorSaw: [15, 12],
  // The peel, the four animals, and the pair at the finish. The animals are
  // sized box x PROP_TALL x PROP_VISUAL_SCALE, because unlike the props above
  // they draw over their boxes in the lane too — showing them at box size
  // would make the guide's cat smaller than the one that catches you.
  bananaPeel: [10, 6],
  dogBruiser: [17, 12], dogSnarler: [19, 13], dogFeral: [20, 16], catFury: [14, 12],
  finishSnarler: [26, 18], dogSign: [17, 18],
};
import {
  DIFFICULTIES, INTRO_BEATS, FINALE_BEATS, FINALE_CODA, RANK_LINES,
  FINALE_THANKS_TITLE, FINALE_THANKS, FINALE_SIGNOFF,
} from '../data/jokes.js';
import { HEROES } from '../data/heroes.js';
import { HERO_SPRITES } from '../sprites/heroes.js';
import { cabinetPalette, cabinetScreenRect, deadScreenBurst, drawCabinetShell, drawCabinetScreen, drawDeadScreen, drawScreenSweep } from '../sprites/arcade.js';
import { BRIEFINGS, BRIEFING_PROMPTS } from '../data/briefings.js';
import { CABINETS, HUB_THEME, TITLE_THEME, FINALE_THEME } from '../data/cabinets.js';
import { COUNTER_DANCE_MIX_THEME } from '../data/shop-themes.js';
import { JUKEBOX_TRACKS, MEGAMIX_THEME } from '../data/megamix.js';
// The jukebox lists a tempo per song, and the desk can now save one onto a song's
// arrangement — see bpmOf.
import { bpmOf } from '../data/arrangements.js';
import { trackIdOf } from '../data/tracks.js';
import { totalPlugs, MAX_PLUGS, formatCoins, formatRunTime, nextStage, stageUnlocked } from './progress.js';
import {
  portraitMenuActive, portraitMenuScale, portraitMenuText, portraitMenuTextCentered,
  portraitMenuTextY, portraitMenuFit, portraitMenuWrap,
  portraitMenuSafeTop, portraitMenuSafeBottom,
} from '../engine/portrait-menu.js';

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
  } else if (id === 'gnash' || id === 'rusty') {
    // The speed lines are the SLOT's mark, so Rusty inherits them with the slot.
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
  } else if (id === 'kiko') {
    // The orb she is holding out, in her ki blue, plus its two loose sparks.
    // ROUND — it was a 4x4 fillRect and read as exactly that: a square
    // fireball. The neighbours above are pixel marks on purpose (Mochi's
    // sparkle, Chompo's crumbs) and squares suit them; a ball of energy is the
    // one thing in this row that has to be a circle, so it is drawn as arcs
    // like Ramon's rocket-fist trail beside it.
    ctx.fillStyle = '#8fe4ff';
    ctx.beginPath(); ctx.arc(x + 13, feetY - 18, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eafcff';
    ctx.beginPath(); ctx.arc(x + 13, feetY - 18, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(x + 17, feetY - 23, 1, 1); ctx.fillRect(x + 16, feetY - 15, 1, 1);
  } else if (id === 'clara') {
    // The muzzle flash off her drawn pistol, in her own brass — a short flash
    // bar and two sparks, pixel marks like the rest of the row.
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(x + 12, feetY - 18, 4, 1); ctx.fillRect(x + 14, feetY - 20, 1, 5);
    ctx.fillRect(x + 18, feetY - 16, 1, 1);
  } else if (id === 'ramon') {
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
const KNOCK_T = 1.9;       // how long a clobbered hero stays airborne
const INV_HIT_RADIUS = 48;
const PARADE_EDGE_FADE = 32;
// How tall the cast stands on the title screen. The whole text stack above them
// is pinned well clear of this, so the parade gets the bottom strip to itself
// and reads at close to the size the heroes have in the food court.
// The title menu has been opened up, so the cast can read as characters rather
// than a thin footer strip. All parade proportions, tap radii and clearance
// bounds derive from this height.
const HERO_PARADE_H = 60;
// The parade is decorative, but drawToon is a full procedural rig with
// gradients, path bounds and multiple outline passes. Holding its pose raster
// at 30Hz cuts that CPU work roughly in half while positions and effects still
// move at the full title tick. The cache is one reusable canvas per hero: this
// is deliberately bounded, so an idle title cannot grow an animation atlas
// forever.
// The parade is sampled less often on high-density phones. Positions and
// accents still move at the full title tick; only the expensive procedural
// toon raster is held for a few presentation frames. At 3x this halves the
// number of full rig paints while remaining much smoother than a static atlas.
function titleIsDesktop() {
  if (typeof window === 'undefined') return true;
  const platform = window.__mash_platform || readPlatform();
  return !!platform.isDesktop;
}

function titlePoseFps() {
  const ss = bakeSS();
  // Desktop previously rendered the parade at the full title tick. Keep that
  // crisp 60 Hz path; the lower cadence is the mobile thermal optimization.
  if (titleIsDesktop()) return 60;
  if (ss >= 3) return 15;
  if (ss >= 2.5) return 20;
  return 30;
}
const titleToonSlots = new Map();

function titlePoseKey(id, pose, h) {
  const qh = Math.round(h * 2) / 2;
  const qt = Math.floor((Number(pose.time) || 0) * titlePoseFps());
  return [
    id, qh, qt, pose.kind || '', pose.grounded ? 1 : 0,
    pose.facing === -1 ? -1 : 1, pose.menuAction || '',
    pose.headless ? 1 : 0, pose.fistThrown ? 1 : 0,
    // Matches drawToon's opt-out test — an absent flag draws the axe, so it
    // must not key the same as an explicit false or a cooled-down title toon
    // would serve a cached frame with the axe still on his back.
    pose.axeThrown ? 1 : 0, pose.axeReady === false ? 0 : 1,
    pose.roll ? 1 : 0,
    pose.slideAmount == null ? '' : Math.round(Number(pose.slideAmount) * 8),
  ].join('|');
}

function cachedTitleToon(id, pose, h) {
  const ss = bakeSS();
  const qh = Math.max(1, Math.round(h * 2) / 2);
  const key = `${titlePoseKey(id, pose, qh)}|ss${ss}`;
  let slot = titleToonSlots.get(id);
  if (!slot) { slot = {}; titleToonSlots.set(id, slot); }
  if (slot.key === key && slot.canvas) return slot;

  // Keep a generous transparent margin for hats, axes and the occasional
  // airborne lean. The actual figure remains aligned by its feet anchor.
  const w = Math.ceil(Math.max(96, qh * 2.0));
  const hh = Math.ceil(Math.max(112, qh * 2.1));
  const feet = hh * 0.8;
  if (!slot.canvas || slot.w !== w || slot.h !== hh || slot.ss !== ss) {
    slot.canvas = document.createElement('canvas');
    slot.canvas.width = Math.max(1, Math.round(w * ss));
    slot.canvas.height = Math.max(1, Math.round(hh * ss));
    slot.w = w; slot.h = hh; slot.ss = ss;
    slot.ctx = slot.canvas.getContext('2d');
  }
  const x = slot.ctx;
  x.setTransform(ss, 0, 0, ss, 0, 0);
  x.clearRect(0, 0, w, hh);
  drawToon(x, id, pose, w / 2, feet, qh);
  slot.key = key;
  slot.feet = feet;
  return slot;
}

function drawCachedTitleToon(ctx, id, pose, cx, feetY, h, scale = 1) {
  const slot = cachedTitleToon(id, pose, h);
  const dw = slot.w * scale;
  const dh = slot.h * scale;
  ctx.drawImage(slot.canvas, cx - dw / 2, feetY - slot.feet * scale, dw, dh);
}

// The parade is a visual layer, not the interaction model. Keep the logical
// hero positions and tap tests independent, but composite the settled lower
// strip as one image: six high-resolution drawImage calls every frame were
// enough to pull both Canvas2D and WebGL into the 40 FPS range on iPhone.
const titleParadeCache = { canvas: null, ctx: null, ss: 0, key: '' };

function invalidateTitleParadeCache() {
  titleParadeCache.key = '';
}

function titleParadeStateKey(state) {
  const pokes = [...state.poke.entries()].map(([i, t]) => `${i}:${t}`).join(',');
  const eaten = [...state.eaten.keys()].join(',');
  const scatter = [...state.scatter.entries()]
    .map(([key, w]) => `${key}:${w.frozen ? `${w.frozen.x}:${w.frozen.resumeAt}` : ''}`).join(',');
  const bombs = state.tapBombs.map((b) => `${b.id}:${b.victim}:${b.tHit}`).join(',');
  const shots = state.shots.map((s) => `${s.id}:${s.tFired}:${s.source}:${s.kind || ''}`).join(',');
  const shooters = [...(state.titleShooters || [])].sort().join(',');
  return [
    HERO_PARADE.join(','),
    state.frightStart,
    state.wispsDismissed ? 1 : 0,
    shooters, pokes, eaten, scatter, bombs, shots,
  ].join('|');
}

function drawCachedTitleParade(ctx, cast, t, stateKey) {
  // The lower strip cache is for mobile fill-rate, not desktop animation. A
  // desktop title keeps the entire parade live so its movement remains a true
  // 60 Hz surface on machines that can sustain it.
  if (titleIsDesktop()) {
    cast(ctx, 'stable');
    return;
  }
  const layout = titleLayout();
  const ss = bakeSS();
  // The portrait parade has a transparent headroom buffer above its visible
  // floor. A regular jump stretches above the lower stage, and cropping the
  // retained canvas there made the top of a head disappear even though the
  // stars were correctly painted underneath it.
  const cacheTop = layout.portrait
    ? Math.max(0, layout.paradeTop - layout.castH * 0.9)
    : layout.paradeTop;
  const cacheH = Math.max(1, H - cacheTop);
  const key = `${Math.floor(t * 30)}|${ss}|${cacheTop}|${cacheH}|${stateKey}`;
  if (titleParadeCache.key !== key) {
    if (!titleParadeCache.canvas || titleParadeCache.ss !== ss
        || titleParadeCache.w !== W || titleParadeCache.h !== cacheH) {
      titleParadeCache.canvas = document.createElement('canvas');
      titleParadeCache.canvas.width = Math.max(1, Math.round(W * ss));
      titleParadeCache.canvas.height = Math.max(1, Math.round(cacheH * ss));
      titleParadeCache.ctx = titleParadeCache.canvas.getContext('2d');
      titleParadeCache.ss = ss;
      titleParadeCache.w = W;
      titleParadeCache.h = cacheH;
    }
    const x = titleParadeCache.ctx;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, titleParadeCache.canvas.width, titleParadeCache.canvas.height);
    x.setTransform(ss, 0, 0, ss, 0, -cacheTop * ss);
    x.imageSmoothingEnabled = true;
    cast(x, 'stable');
    titleParadeCache.key = key;
  }
  ctx.drawImage(titleParadeCache.canvas, 0, cacheTop, W, cacheH);
}

// Every hop, accent and tap footprint below was tuned against a 26-tall parade;
// they scale off this rather than being re-eyeballed one at a time.
const HERO_PARADE_SPEED = 42;
const HERO_PARADE_DELAY = 3.5;
// The parade is an 11-slot loop: eight hero slots, two ghost slots, then one
// permanently empty slot before slot one returns. This leaves a real handoff
// gap without allowing the cameo to drift into the hero stream.
const HERO_PARADE_SLOTS = 11;
const HERO_PARADE_LANDSCAPE_GAP = 84;
const HERO_ENTRY_JUMP_T = 2.1;
const HERO_ENTRY_ZOOM = 1.35;
// A tapped hero's startled little hop, overriding whatever they were doing.
const HERO_POKE_T = 0.4;

// The landscape parade's 84-unit spacing was tuned for a 60-unit-tall toon.
// Portrait makes the toons larger, so preserve that same visual breathing room
// by scaling the gap with the cast rather than packing the enlarged bodies into
// the old horizontal rhythm. The landscape result remains byte-for-byte the
// old 84-unit schedule.
function titleHeroGap() {
  return titleLayout().paradeGap;
}
function titleHeroEntryGap() { return titleHeroGap() / HERO_PARADE_SPEED; }
function titleHeroParadeSpan() { return titleHeroGap() * HERO_PARADE_SLOTS; }

const invX = (trip, p) => (trip % 2 === 0 ? -22 + p * INV_SPAN : W + 22 - p * INV_SPAN);
// Tucked right under the top edge: the marquee moved up to give the cast the
// bottom of the screen, so the fly-by has less sky to keep out of its way.
const invY = (trip, t) => {
  const layout = titleLayout();
  const top = layout.portrait ? layout.safeTop + 8 : 2;
  return top + (trip % 3) * 3 + Math.sin(t * 2.3) * 1.6;
};
const heroX = (i, t) => {
  const local = t - HERO_PARADE_DELAY - i * titleHeroEntryGap();
  return local < 0 ? -70 : ((local * HERO_PARADE_SPEED) % titleHeroParadeSpan()) - 70;
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
// Start when the lead wisp trails Lorenzo by 46px, then repeat only every
// third parade lap. This leaves a little breathing room before the guests.
// Ghosts occupy parade slots 9 and 10 only (the two slots immediately after
// the eight heroes). They enter when slot 9 reaches the left edge, then share
// the hero loop's timing instead of drifting on a separate schedule.
function titleWispFirst() { return HERO_PARADE_DELAY + titleHeroEntryGap() * (HERO_PARADE_SLOTS - 3); }
function titleWispPeriod() { return titleHeroEntryGap() * HERO_PARADE_SLOTS; }
const WISP_COUNT = 2;
const WISP_COLORS = ['#f06c88', '#66cbe8', '#f2a45f', '#ad82e8', '#79d48d'];
// Tapping any visitor spooks the whole crossing gang into a power-pellet
// fright: everyone on screen turns blue and scatters in place for a few
// seconds, still crossing normally rather than fleeing. Tapping one of them
// again while frightened eats it — the body drops away to just a pair of
// eyes that zip straight off whichever edge is nearest.
// Top of the strip a tap has to land in to count as poking the parade rather
// than the menu. Tracks the tallest head, so it follows HERO_PARADE_H.
// The actual bound is resolved by titleParadeTapTop() below.
// The visitors share the parade's floor line, so they share its scaling too —
// a fixed 0.68 left them knee-high once the cast grew.
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
    if (Math.abs(heroX(i, t) - x) < titleWispGapClearance()) return false;
  }
  return true;
}

function mazeWispPass(t) {
  const first = titleWispFirst();
  if (t < first) return null;
  const trip = Math.floor((t - HERO_PARADE_DELAY) / titleWispPeriod());
  return { trip, count: WISP_COUNT };
}

function wispX(i, t) {
  const local = (t - titleWispFirst()) * PARADE_SPEED;
  return ((local % titleHeroParadeSpan()) + titleHeroParadeSpan()) % titleHeroParadeSpan() - 70
    - i * titleHeroEntryGap() * PARADE_SPEED;
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
  ctx.scale(titleWispScale(), titleWispScale());
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
  ctx.scale(titleWispScale(), titleWispScale());
  const gx = dir * 1.4;
  ctx.fillStyle = '#fff8e8';
  ctx.beginPath(); ctx.ellipse(-3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#30204a';
  ctx.beginPath(); ctx.arc(-3.3 + gx, -16, 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3.3 + gx, -16, 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMazeWispCameo(ctx, t, frightStart, eaten, scatter, wispsDismissed) {
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
      drawWispEyes(ctx, x, titleCastFeetY() - 1, w.dir);
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
      ctx.beginPath(); ctx.ellipse(x, titleCastFeetY(), 5.5 * titleParadeK(), 1.5 * titleParadeK(), 0, 0, Math.PI * 2); ctx.fill();
      const color = frightActive ? frightColor : WISP_COLORS[w.colorIdx];
      drawMazeWisp(ctx, x, titleCastFeetY() - 1, color, t * 1.8 + w.colorIdx * 0.24, w.colorIdx % 3, !w.frozen);
    }
  }
  // No new visitor appears while the current episode (scattering or still
  // being eaten) is unresolved — the roster is fixed the moment fright starts.
  if ((eaten && eaten.size > 0) || (scatter && scatter.size > 0)) return;
  // Being eaten removes these visitors from this title-screen procession.
  // Keep that decision after the fleeing eyes and scatter records are pruned;
  // otherwise the next modulo lap silently recreates the same reserved slots.
  if (wispsDismissed) return;
  const pass = mazeWispPass(t);
  if (!pass) return;
  // All visitors occupy the two reserved slots after the eight heroes, so
  // their crossing uses the same speed and span as the cast without inheriting
  // each slot's different phase at the modulo boundary.
  for (let i = 0; i < pass.count; i++) {
    const x = wispX(i, t);
    if (x < -24 || x > W + 24) continue;
    ctx.fillStyle = 'rgba(4,3,9,0.25)';
    ctx.beginPath(); ctx.ellipse(x, titleCastFeetY(), 5.5 * titleParadeK(), 1.5 * titleParadeK(), 0, 0, Math.PI * 2); ctx.fill();
    const color = frightActive ? frightColor : WISP_COLORS[(pass.trip + i) % WISP_COLORS.length];
    drawMazeWisp(ctx, x, titleCastFeetY() - 1, color, t * 1.8 + i * 0.24, (pass.trip + i) % 3, frightActive);
  }
}

// A tap landing on a not-yet-eaten maze-wisp visitor. Returns its map key and
// current x (so eating it knows which edge is nearest), or null.
function wispTapHit(t, px, py, eaten, scatter, wispsDismissed = false) {
  if (py < titleParadeTapTop() || py > titleCastFeetY() + 12) return null;
  if (scatter) {
    for (const [key, w] of scatter) {
      if (eaten && eaten.has(key)) continue;
      const x = wispScatterX(t, w);
      if (x < -24 || x > W + 24) continue;
      if (Math.abs(px - x) < titleWispTapRadius()) return { key, x };
    }
  }
  // No new visitor to tap while the current episode is still unresolved.
  if ((eaten && eaten.size > 0) || (scatter && scatter.size > 0)) return null;
  // The renderer also suppresses dismissed visitors. Keep their hitboxes gone
  // with them instead of leaving an invisible ghost in a later parade lap.
  if (wispsDismissed) return null;
  const pass = mazeWispPass(t);
  if (!pass) return null;
  for (let i = 0; i < pass.count; i++) {
    const x = wispX(i, t);
    if (x < -24 || x > W + 24) continue;
    if (Math.abs(px - x) < titleWispTapRadius()) return { key: `${pass.trip}:${i}`, x };
  }
  return null;
}

// Raw ship schedule, before the toaster cameo claims the sky.
function rawInvaderPass(t) {
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
export const TITLE_TOASTER_MAX_COUNT = 4;
let titleToasterIntroSeen = false;
// The first space ship owns the opening sky beat. Its pass starts at 24s and
// takes 11s to cross, so toasters wait for it to clear plus a small breath.
const TOASTER_FIRST = INV_FIRST + INV_CROSS + 2;
const TOASTER_PERIOD = 29;
const TOASTER_SPEED = 72;
const TOASTER_GAP = 38;
const PORTRAIT_TOASTER_GAP = 68;
const TOASTER_EDGE = 48;
const TOASTER_BREATH = 2;
const TOASTER_LANES = {
  1: [0],
  2: [-16, 16],
  3: [-22, 0, 22],
  4: [-27, -9, 9, 27],
};
// Portrait has enough vertical breathing room below the menu to let a large
// formation read as two staggered lines instead of one tiny ribbon.
const TOASTER_LANES_PORTRAIT = {
  1: [0],
  2: [-46, 46],
  3: [-48, 0, 48],
  4: [-48, -16, 16, 48],
};

function titleToasterGap() {
  return titleLayout().portrait ? PORTRAIT_TOASTER_GAP : TOASTER_GAP;
}

function titleToasterCount(trip, singleOpening) {
  if (trip === 0 && singleOpening) return TITLE_TOASTER_MIN_COUNT;
  return 2 + Math.floor(shaderHash21(trip + 1, 23) * (TITLE_TOASTER_MAX_COUNT - 1));
}

// Give each toaster its own point in the slow four-second toast cycle. The
// small index bias keeps neighbours apart, while the seeded phase makes the
// launch moments feel naturally irregular instead of like a ripple effect.
export function titleToasterStagger(trip, index) {
  return index * 0.14 + shaderHash21(trip + index + 71, 67) * 3.4;
}

// A toaster pass owns its whole crossing once it starts. If its nominal start
// would overlap a spaceship pass, move the toaster cameo to just after that
// ship clears instead of hiding the toaster halfway through its crossing.
function titleToasterStart(trip, count) {
  const cross = (W + TOASTER_EDGE * 2 + (count - 1) * titleToasterGap()) / TOASTER_SPEED;
  let start = TOASTER_FIRST + trip * TOASTER_PERIOD;
  for (let attempt = 0; attempt < 8; attempt++) {
    const firstShip = Math.max(0, Math.floor((start - INV_FIRST) / INV_PERIOD) - 1);
    let moved = false;
    for (let shipTrip = firstShip; shipTrip <= firstShip + 3; shipTrip++) {
      const shipStart = INV_FIRST + shipTrip * INV_PERIOD;
      const shipEnd = shipStart + INV_CROSS;
      if (start < shipEnd && start + cross > shipStart) {
        start = shipEnd + TOASTER_BREATH;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  return { start, cross };
}

function titleToasterCenterY(trip) {
  const layout = titleLayout();
  if (!layout.portrait) return 84 + shaderHash21(trip + 7, 41) * 76;
  // Portrait follows the landscape gag: the appliances fly through the menu
  // stack, not down at the hero heads. The two-row offsets let a formation
  // occupy different buttons while the overlay draw order keeps it visible.
  const cardsBottom = layout.panelY + layout.cardH * 4 + layout.cardGap * 3;
  const laneTop = layout.panelY + 32;
  const laneBottom = cardsBottom - 32;
  const span = Math.max(0, laneBottom - laneTop);
  return laneTop + shaderHash21(trip + 7, 41) * span;
}

// Which fly-by (if any) is on screen right now. Exported as a small visual
// contract so the title tests can pin the promised 1–4 range without needing
// to inspect pixels.
export function titleToasterPass(t, singleOpening = true) {
  if (t < TOASTER_FIRST) return null;
  const elapsed = t - TOASTER_FIRST;
  const trip = Math.floor(elapsed / TOASTER_PERIOD);
  const count = titleToasterCount(trip, singleOpening);
  const { start, cross } = titleToasterStart(trip, count);
  const local = t - start;
  if (local < 0) return null;
  if (local > cross) return null;
  return {
    trip,
    local,
    p: local / cross,
    count,
    dir: trip % 2 === 0 ? 1 : -1,
    // Portrait places the yellow appliances in the reserved lane below STAFF
    // ONLY; landscape keeps its established sky cameo height.
    centerY: titleToasterCenterY(trip),
  };
}

// Toaster passes move around the raw ship schedule before they begin. This
// second guard is deliberately reciprocal: if a pass is already crossing,
// the ship waits for it instead of making the toaster disappear mid-flight.
export function invaderPass(t) {
  if (isPhonePortraitPresentation()) return null;
  if (titleToasterPass(t, false)) return null;
  return rawInvaderPass(t);
}

function drawFlyingToasters(ctx, t, singleOpening) {
  const layout = titleLayout();
  const pass = titleToasterPass(t, singleOpening);
  if (!pass) return;
  const offsets = (layout.portrait ? TOASTER_LANES_PORTRAIT : TOASTER_LANES)[pass.count];
  const gap = titleToasterGap();
  for (let i = 0; i < pass.count; i++) {
    const x = pass.dir > 0
      ? -TOASTER_EDGE + pass.local * TOASTER_SPEED - i * gap
      : W + TOASTER_EDGE - pass.local * TOASTER_SPEED + i * gap;
    if (x < -TOASTER_EDGE - 42 || x > W + TOASTER_EDGE + 42) continue;
    // These are a foreground gag now, not distant sky decoration. Give the
    // appliance body enough scale to read clearly over the portrait cards.
    const size = layout.portrait
      ? 96 + shaderHash21(pass.trip + i + 13, 59) * 32
      : 68 + shaderHash21(pass.trip + i + 13, 59) * 24;
    const h = size * 0.82;
    const y = pass.centerY + offsets[i] + Math.sin(t * 2.2 + i * 0.8 + pass.trip) * 1.5;
    // The old edge fade was tied to the small toaster's centre point. With
    // portrait bodies this large, the appliance could still be clipped while
    // its centre was fading in. Use the actual half-width and a real inner
    // gutter so the body never appears beyond the screen's left/right edges.
    const edgeFade = 18;
    const bodyHalf = size / 2;
    if (x < bodyHalf || x > W - bodyHalf) continue;
    const edge = Math.min(1,
      Math.max(0, (x - bodyHalf) / edgeFade),
      Math.max(0, (W - bodyHalf - x) / edgeFade));
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
  const entryT = t - HERO_PARADE_DELAY - i * titleHeroEntryGap();
  if (entryT < 0) return false;
  return paradeEdgeAlpha(heroX(i, t)) > 0;
}

function invaderBombsForTrip(trip) {
  if (isPhonePortraitPresentation()) return [];
  if (trip < 0 || trip % 2 !== 0) return [];
  const bombs = [];
  const claimedVictims = new Set();
  let hitCount = 0;
  for (const [dropIndex, dropP] of INV_DROP_PS.entries()) {
    const tDrop = INV_FIRST + trip * INV_PERIOD + dropP * INV_CROSS;
    const x = invX(trip, dropP) + 5;
    const y0 = invY(trip, tDrop) + 8;
    const tHit = tDrop + Math.sqrt((2 * (titleBoltHeadY() - y0)) / BOLT_G);
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
    const returnAt = victim < 0 ? Infinity : tHit + (titleHeroParadeSpan() - phase) / HERO_PARADE_SPEED;
    bombs.push({ id: `${trip}:${dropP}`, tDrop, x, y0, tHit, victim, returnAt, dir: trip % 2 === 0 ? 1 : -1 });
  }
  return bombs;
}

function bombStrike(bomb, t) {
  if (t < bomb.tDrop || t > bomb.tHit + KNOCK_T) return null;
  if (t < bomb.tHit) {
    return { id: bomb.id, x: bomb.x, y: bomb.y0 + 0.5 * BOLT_G * (t - bomb.tDrop) * (t - bomb.tDrop), tHit: bomb.tHit };
  }
  return { id: bomb.id, x: bomb.x, y: titleBoltHeadY(), tHit: bomb.tHit, kt: t - bomb.tHit, victim: bomb.victim, dir: bomb.dir };
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
  if (isPhonePortraitPresentation()) return null;
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
  const tHit = tDrop + Math.sqrt((2 * (titleBoltHeadY() - y0)) / BOLT_G);
  let victim = -1, best = INV_HIT_RADIUS;
  for (let i = 0; i < HERO_PARADE.length; i++) {
    if (!heroOnScreen(i, tHit) || heroIsKnockedOut(i, tHit, tapBombs)) continue;
    const d = Math.abs(heroX(i, tHit) - x);
    if (d < best) { best = d; victim = i; }
  }
  const phase = victim < 0 ? 0 : heroX(victim, tHit) + 70;
  const returnAt = victim < 0 ? Infinity : tHit + (titleHeroParadeSpan() - phase) / HERO_PARADE_SPEED;
  return { id, tDrop, x, y0, tHit, victim, returnAt, dir };
}

// A tap landing on a parading hero: same rough footprint the invader bombs
// use to find a victim, keyed off the pointer instead of a bomb's landing
// site. Knocked-out heroes are mid-knockback (translated/rotated in their own
// draw branch) and not worth hit-testing against their nominal floor spot.
function heroTapIndex(t, px, py, tapBombs) {
  if (py < titleParadeTapTop() || py > titleCastFeetY() + 12) return -1;
  for (let i = 0; i < HERO_PARADE.length; i++) {
    if (heroIsKnockedOut(i, t, tapBombs)) continue;
    const hx = heroX(i, t);
    if (paradeEdgeAlpha(hx) <= 0) continue;
    if (Math.abs(px - hx) < titleHeroTapRadius()) return i;
  }
  return -1;
}

// b33p doesn't take a poke lying down: tapping him fires a shot instead of
// the usual startled hop. It travels until it hits a hero (who goes through
// the same explode/knockback the invader's bombs use) or a wisp (who takes
// it exactly like a tap would — fright if calm, eaten if already blue).
const TITLE_SHOT_SPEED = 220;
// Title weapons travel in the same character-relative space in both layouts.
// This is deliberately derived from the parade gap, not from W or a percentage
// of the canvas: portrait enlarges the cast and its slot spacing together, so a
// fist or pellet still reaches the next hero before its outbound story ends.
function titleProjectileScale() {
  return titleHeroGap() / HERO_PARADE_LANDSCAPE_GAP;
}
function titleShotSpeed() { return TITLE_SHOT_SPEED * titleProjectileScale(); }
// Raised cannon muzzle, rather than the old hip-height projectile line. The
// portrait values follow the enlarged cast instead of remaining near y=227.

function drawInvader(ctx, t) {
  if (isPhonePortraitPresentation()) return;
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

// Title ability shots: B33P uses the same pellet silhouette as gameplay; Ray
// and Grumpos keep their actual fist and axe artwork in flight. The thrown
// weapons use the same readable out/hold/return story as gameplay instead of
// disappearing at the right edge.
const TITLE_WEAPON_OUT_T = { fist: 0.42, axe: 0.55 };
const TITLE_WEAPON_HOLD_T = { fist: 0.35, axe: 0.45 };
const TITLE_WEAPON_RETURN_T = { fist: 0.42, axe: 0.5 };
function titleWeaponOutT(kind) { return TITLE_WEAPON_OUT_T[kind] * titleProjectileScale(); }

export function titleWeaponMotion(shot, t) {
  if (!shot || (shot.kind !== 'fist' && shot.kind !== 'axe') || t < shot.tFired) return null;
  const age = t - shot.tFired;
  const outT = titleWeaponOutT(shot.kind);
  const defaultHoldAt = shot.tFired + outT;
  const holdAt = shot.hoverAt ?? defaultHoldAt;
  const dir = shot.dir || 1;
  if (t < holdAt) {
    return {
      x: shot.x0 + age * titleShotSpeed() * dir,
      age,
      returning: false,
      done: false,
    };
  }
  const hoverX = shot.hoverX ?? (shot.x0 + (holdAt - shot.tFired) * titleShotSpeed() * dir);
  const returnAt = shot.returnAt ?? (defaultHoldAt + TITLE_WEAPON_HOLD_T[shot.kind]);
  if (t < returnAt) {
    return { x: hoverX, age, returning: false, done: false };
  }
  const returnT = shot.returnT ?? TITLE_WEAPON_RETURN_T[shot.kind];
  const returnP = Math.max(0, Math.min(1, (t - returnAt) / returnT));
  const catchX = shot.source == null ? shot.x0 : heroX(shot.source, t) + titleWeaponHandX() * dir;
  return {
    x: hoverX + (catchX - hoverX) * returnP,
    age,
    returning: true,
    done: returnP >= 1,
  };
}

function drawShots(ctx, t, shots) {
  if (!shots) return;
  for (const shot of shots) {
    if (t < shot.tFired) continue;
    if (shot.kind === 'fist' || shot.kind === 'axe') {
      const motion = titleWeaponMotion(shot, t);
      if (!motion || motion.done) continue;
      if (shot.kind === 'fist') {
        // Gameplay starts the fist's animation clock when the projectile is
        // spawned, so the title version does the same instead of using the
        // parade's absolute clock.
        drawRocketFist(ctx, motion.x, shot.y, motion.age, motion.returning, titleFistScale());
      } else {
        drawThrownAxe(ctx, motion.x, shot.y, motion.age * 14, titleAxeScale());
      }
      continue;
    }
    const x = shot.x0 + (t - shot.tFired) * titleShotSpeed() * (shot.dir || 1);
    const hero = shot.hero || 'b33p';
    if (shot.kind === 'arrow' || shot.kind === 'wrench' || shot.kind === 'bamboo') {
      drawRangedProjectile(ctx, shot.kind, x, shot.y, {
        hero, flying: true, rot: (t - shot.tFired) * (shot.kind === 'arrow' ? 0.2 : 12),
      });
    } else {
      const pal = HERO_SPRITES[hero]?.pal || {};
      drawPellet(ctx, x, shot.y, {
        size: shot.size || 1,
        fill: pal.ki || '#f6d33c',
        hi: hero === 'kiko' ? '#eafcff' : undefined,
        spark: pal.a,
        orb: hero === 'kiko',
      });
    }
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
    const y = titleBoltHeadY();
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

// Retained title artwork. These layers used to rebuild gradients, marquee
// glyph paths and stitched seams every frame even though only their opacity
// changes. Rasterize them once per bake density and composite the cached art;
// the live sky, cord, invader and parade remain independently animated.
const titleBaseCache = { canvas: null, ctx: null, key: '' };
const titleMarqueeCache = { canvas: null, ctx: null, ss: 0 };
const titleStarCaches = Array.from({ length: 3 }, () => ({ canvas: null, ctx: null, key: '' }));

function invalidateTitleArtwork() {
  titleToonSlots.clear();
  invalidateTitleParadeCache();
  titleBaseCache.key = '';
  titleMarqueeCache.key = '';
  for (const slot of titleStarCaches) slot.key = '';
}

onGameFontsChanged(invalidateTitleArtwork);
onPresentationChanged(invalidateTitleArtwork);

function ensureTitleCanvas(slot, w, h, ss) {
  if (!slot.canvas || slot.ss !== ss || slot.canvas.width !== Math.round(w * ss)
      || slot.canvas.height !== Math.round(h * ss)) {
    slot.canvas = document.createElement('canvas');
    slot.canvas.width = Math.max(1, Math.round(w * ss));
    slot.canvas.height = Math.max(1, Math.round(h * ss));
    slot.ctx = slot.canvas.getContext('2d');
    slot.ss = ss;
    slot.key = '';
  }
  return slot.ctx;
}

function drawRetainedTitleBase(ctx, skyMode) {
  // Two fixed samples are enough for the broad gradients while avoiding
  // another full 6x canvas on iPad. Stars live in their own sharper layers.
  const layout = titleLayout();
  const floorY = layout.floorY;
  const backgroundBottom = layout.backgroundBottom;
  const ss = 2;
  const key = `${ss}|${skyMode}|${H}|${floorY}|${backgroundBottom}`;
  const x = ensureTitleCanvas(titleBaseCache, W, H, ss);
  if (titleBaseCache.key !== key) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, titleBaseCache.canvas.width, titleBaseCache.canvas.height);
    x.setTransform(ss, 0, 0, ss, 0, 0);
    if (skyMode === 'canvas') {
      const grad = x.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#04050e');
      grad.addColorStop(0.48, '#0b0b1c');
      grad.addColorStop(0.78, '#17112b');
      grad.addColorStop(1, '#1d1530');
      x.fillStyle = grad;
      x.fillRect(0, 0, W, H);

      // A pair of very restrained colour clouds gives the 2D sky depth without
      // imitating the rejected title bloom or competing with the gold marquee.
      const violet = x.createRadialGradient(92, 70, 0, 92, 70, 205);
      violet.addColorStop(0, 'rgba(91,58,139,0.18)');
      violet.addColorStop(0.52, 'rgba(49,34,87,0.09)');
      violet.addColorStop(1, 'rgba(10,8,24,0)');
      x.fillStyle = violet;
      x.fillRect(0, 0, W, backgroundBottom);
      const blue = x.createRadialGradient(408, 48, 0, 408, 48, 180);
      blue.addColorStop(0, 'rgba(45,99,139,0.13)');
      blue.addColorStop(0.58, 'rgba(26,55,91,0.06)');
      blue.addColorStop(1, 'rgba(8,10,24,0)');
      x.fillStyle = blue;
      x.fillRect(0, 0, W, backgroundBottom);
    }
    if (skyMode === 'none' && backgroundBottom === H) {
      x.fillStyle = '#04050e';
      x.fillRect(0, 0, W, H);
    } else if (backgroundBottom < H) {
      x.fillStyle = '#171222';
      x.fillRect(0, floorY, W, H - floorY);
    }
    titleBaseCache.key = key;
  }
  ctx.drawImage(titleBaseCache.canvas, 0, 0, W, H);
}

function drawRetainedTitleStars(ctx, t) {
  // The old fallback was 26 logical-pixel squares. Three retained high-detail
  // layers provide varied size, colour temperature and gentle independent
  // twinkle without rebuilding radial gradients every frame.
  const layout = titleLayout();
  // Stars are a soft background layer. Keep them at 2x on the tall portrait
  // frame so a 390x844 phone does not allocate three full-height 3x atlases;
  // the logo and toon parade remain at the selected device density.
  const ss = layout.portrait ? 2 : Math.max(2, Math.min(3, bakeSS()));
  const starBottom = layout.backgroundBottom;
  for (let layer = 0; layer < titleStarCaches.length; layer++) {
    const slot = titleStarCaches[layer];
    const x = ensureTitleCanvas(slot, W, starBottom, ss);
    const key = `${ss}|${layer}|${starBottom}`;
    if (slot.key !== key) {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
      x.setTransform(ss, 0, 0, ss, 0, 0);
      for (let i = layer; i < 90; i += titleStarCaches.length) {
        const sx = 4 + shaderHash21(i + 3, 17) * (W - 8);
        const sy = 3 + shaderHash21(i + 19, 31) * (starBottom - 12);
        const bright = i % 13 === 0;
        const radius = bright
          ? 1.05 + shaderHash21(i + 7, 43) * 0.65
          : 0.35 + shaderHash21(i + 11, 53) * 0.55;
        const spread = radius * (bright ? 4.1 : 3.0);
        const warm = i % 9 === 0;
        const cool = i % 5 === 0;
        const core = warm ? '255,239,198' : cool ? '205,224,255' : '239,243,255';
        const star = x.createRadialGradient(sx, sy, 0, sx, sy, spread);
        star.addColorStop(0, `rgba(${core},0.98)`);
        star.addColorStop(0.22, `rgba(${core},0.72)`);
        star.addColorStop(1, `rgba(${core},0)`);
        x.fillStyle = star;
        x.fillRect(sx - spread, sy - spread, spread * 2, spread * 2);
        if (bright) {
          x.fillStyle = `rgba(${core},0.66)`;
          x.fillRect(sx - radius * 2.8, sy - 0.18, radius * 5.6, 0.36);
          x.fillRect(sx - 0.18, sy - radius * 2.8, 0.36, radius * 5.6);
        }
      }
      slot.key = key;
    }
    const pulse = 0.76 + Math.sin(t * (0.55 + layer * 0.17) + layer * 2.1) * 0.14;
    ctx.save();
    ctx.globalAlpha *= pulse;
    ctx.drawImage(slot.canvas, 0, 0, W, starBottom);
    ctx.restore();
  }
}

function drawRetainedMarquee(ctx, alpha) {
  const layout = titleLayout();
  const ss = bakeSS();
  const marqueeH = Math.max(108, layout.subtitleY + 22);
  const key = `${ss}|${layout.logoScale}|${layout.marqueeY}|${layout.subtitleY}|${layout.subtitleTextS}`;
  const x = ensureTitleCanvas(titleMarqueeCache, W, marqueeH, ss);
  if (titleMarqueeCache.key !== key) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, titleMarqueeCache.canvas.width, titleMarqueeCache.canvas.height);
    x.setTransform(ss, 0, 0, ss, 0, 0);
    drawTextCentered(x, 'MASHENSTEIN', W / 2 + 1.5, layout.marqueeY + 1.5, '#a8791f', layout.logoScale, 'marquee');
    drawTextCentered(x, 'MASHENSTEIN', W / 2, layout.marqueeY, '#ffcf33', layout.logoScale, 'marquee');
    const logoW = textWidth('MASHENSTEIN', layout.logoScale, 'marquee');
    const seamK = layout.logoScale / 4;
    const seamTop = layout.marqueeY + 4 * seamK;
    const seamBot = layout.marqueeY + 22 * seamK;
    x.strokeStyle = 'rgba(42,30,5,0.85)';
    x.lineWidth = 1.4;
    for (let i = 0; i < 6; i++) {
      const sx = W / 2 - logoW / 2 + (logoW * (i + 0.5)) / 6 - 4;
      x.beginPath(); x.moveTo(sx, seamTop); x.lineTo(sx + 8, seamBot); x.stroke();
      x.beginPath(); x.moveTo(sx + 8, seamTop); x.lineTo(sx, seamBot); x.stroke();
    }
    drawTextCentered(x, 'THE UNPLUGGENING', W / 2, layout.subtitleY, '#8fb0f5', layout.subtitleTextS, 'subtitle');
    titleMarqueeCache.key = key;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(titleMarqueeCache.canvas, 0, 0, W, marqueeH);
  ctx.restore();
}

function titleScene(ctx, t, poke, frightStart, eaten, scatter, wispsDismissed, tapBombs, shots, profile, titleShooters) {
  const layout = titleLayout();
  const activeShooters = titleShooters || new Set();
  // night sky over the last functioning food court
  // Under WebGL the sky is generated on the GPU — gradient, drifting nebula,
  // parallax twinkle and the odd shooting star — so we leave a transparent
  // hole for it. Reduced flashing freezes its clock instead of animating.
  // Without WebGL, the old hand-drawn sky stands in.
  const skyEnabled = profile?.sky !== false;
  const gpuSky = setSkyFx(skyEnabled, t);
  ctx.clearRect(0, 0, W, H);
  drawRetainedTitleBase(ctx, gpuSky ? 'gpu' : skyEnabled ? 'canvas' : 'none');
  if (skyEnabled && !gpuSky) {
    drawRetainedTitleStars(ctx, t);
  }
  if (!layout.portrait) drawInvader(ctx, t);

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
  const cast = (c, mode = 'all') => {
    const stable = mode !== 'dynamic';
    const dynamic = mode === 'dynamic';
    // Keep the parade physically consistent across devices; the responsive
    // layout changes spacing and hit targets, not the size of the characters.
    const castH = layout.castH;
    const castK = castH / 26;
    const entryZoomExtra = HERO_ENTRY_ZOOM;
    // The cast still crosses the arcade, but each hero occasionally breaks into
    // a small personality beat. Cycles are offset so the parade stays readable.
    const strikes = layout.portrait ? null : invaderStrikes(t, tapBombs);
    if (stable) {
      drawBolt(c, t, strikes);
      drawShots(c, t, shots);
      drawMazeWispCameo(c, t, frightStart, eaten, scatter, wispsDismissed);
    }
    for (let i = 0; i < HERO_PARADE.length; i++) {
      const hx = heroX(i, t);
      const id = HERO_PARADE[i];
      const entryT = t - HERO_PARADE_DELAY - i * titleHeroEntryGap();
      const entering = entryT >= 0 && entryT < HERO_ENTRY_JUMP_T;
      // Clobbered: launched into a spin and tumbled off the side of the screen,
      // fading out before the parade loop would have wrapped them around.
      const strike = strikes?.find((candidate) => candidate.victim === i && candidate.kt < KNOCK_T);
      if (strike) {
        if (stable) continue;
        const kt = strike.kt;
        const kx = heroX(i, strike.tHit) + strike.dir * kt * 165;
        const ky = layout.castFeetY - (kt * 190 - 0.5 * 150 * kt * kt);
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
      if (stable && entering) continue;
      if (dynamic && !entering) continue;
      if (heroIsKnockedOut(i, t, tapBombs)) continue;
      const actionLength = 1.35;
      const beat = (t + i * 0.71) % 4.9;
      const acting = !entering && beat < actionLength;
      const actionP = acting ? beat / actionLength : 0;
      const pose = {
        kind: 'run', grounded: true, time: t, menu: true,
        phase: (t * 1.5 + i * 0.37) % 1,
        axeReady: id === 'grumpos',
      };
      let feetY = layout.castFeetY;
      if (entering) {
        const landing = entryT / HERO_ENTRY_JUMP_T;
        // Keep the gait moving during the airborne part so this reads as a
        // running leap into the arcade, not a frozen sprite sliding in.
        pose.kind = 'run'; pose.grounded = false; pose.vy = -260 + landing * 260;
        feetY -= Math.sin((1 - landing) * Math.PI / 2) * 30 * castK;
      }
      if (acting) {
        const action = activeShooters.has(id)
          ? titleShooterAction(id, t, actionP)
          : titleJumpAction(actionP);
        Object.assign(pose, action.pose);
        feetY -= action.feetLift * castH;
      }
      const titleShot = shots?.find((shot) => shot.source === i);
      const titleShotMotion = titleShot && titleWeaponMotion(titleShot, t);
      // A tap startles whoever it lands on, overriding their signature beat —
      // getting poked takes priority over whatever bit they were mid-performing.
      const pokeAt = poke && poke.get(i);
      if (pokeAt != null && t - pokeAt < HERO_POKE_T) {
        const pokeP = (t - pokeAt) / HERO_POKE_T;
        if (activeShooters.has(id)) {
          const kind = titleShot?.kind || titleShotKind(id);
          if (id === 'b33p') {
            // Raise first, then fire and recoil. The projectile uses the same
            // wind-up delay below, so it cannot leave before the arm is level.
            Object.assign(pose, b33pTitleShotPose(t - pokeAt));
          } else {
            Object.assign(pose, {
              menuAction: 'aim',
              actionTime: Math.min(0.3, Math.max(0, t - pokeAt)),
            });
            if (kind === 'fist') pose.headless = true;
          }
        } else if (titleShot?.kind === 'fist' && titleShotMotion) {
          pose.headless = true;
        } else if (titleShot?.kind === 'axe' && titleShotMotion) {
          pose.axeThrown = true;
        } else {
          pose.kind = 'jump'; pose.grounded = false;
        feetY -= Math.sin(pokeP * Math.PI) * 11 * castK;
        }
      }
      // Keep the thrown weapon off the hero until the title projectile has
      // completed its return. This mirrors gameplay's `fistThrown` /
      // `axeThrown` flags instead of restoring the hand or axe while it is
      // still crossing the screen.
      // The pending shot includes the windup interval. Leave Ray's hand and
      // Grumpos's shoulder axe on the body until the weapon actually spawns;
      // restore the axe as soon as the return motion is caught.
      if (titleShot?.kind === 'fist') {
        const thrown = !!(titleShotMotion && !titleShotMotion.done);
        pose.headless = thrown;
        // Gameplay hides the menu orbit while the actual fist is detached;
        // only the projectile should remain visible during the throw.
        pose.fistThrown = thrown;
      }
      if (titleShot?.kind === 'axe') pose.axeThrown = !!(titleShotMotion && !titleShotMotion.done);
      const edgeAlpha = paradeEdgeAlpha(hx);
      if (edgeAlpha <= 0) continue;
      const entryZoom = entering ? 1 + (1 - entryT / HERO_ENTRY_JUMP_T) * entryZoomExtra : 1;
      c.save();
      c.globalAlpha *= edgeAlpha;
      // Keep entry zoom as a destination transform. Baking the changing size
      // into the cache key forced a fresh full toon raster on every few pixels
      // of the two-second entrance, exactly as more heroes joined the parade.
      drawCachedTitleToon(c, id, pose, hx, feetY, castH, entryZoom);
      if (acting && activeShooters.has(id)) {
        c.translate(hx, feetY);
        c.scale(castK, castK);
        drawParadeAccent(c, id, 0, 0, actionP);
      }
      c.restore();
    }
    if (stable) drawInvaderImpact(c, strikes);
  };

  // The marquee: MASHENSTEIN in warm cartoon gold, outlined, stitched together
  // out of parts, and wired to a sign that has seen better decades. It stutters
  // twice in quick succession, then holds steady for a few seconds before the
  // next fit — a constant strobe reads as broken rather than characterful.
  const logoW = textWidth('MASHENSTEIN', layout.logoScale, 'marquee');
  const seamK = layout.logoScale / 4;
  drawRetainedMarquee(ctx, flickerAlpha(t));

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
  const ax = W / 2 + logoW / 2 - 5 * seamK, ay = layout.marqueeY + 24 * seamK;
  const sway = Math.sin(t * 1.15) * 9;
  // Stops above the cards so the plug swings in open air at any phase of the
  // swing. Its length is independent of the card row: centring the controls in
  // the open middle of the screen should not stretch the title artwork.
  const px2 = ax + sway, py2 = layout.plugY;
  const plugK = layout.logoScale / TITLE_SCALE;
  ctx.strokeStyle = '#241c30';
  ctx.lineWidth = 2.4 * plugK;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + sway * 0.4, (ay + py2) / 2 + 8 * plugK, px2, py2);
  ctx.stroke();
  // A grommet where the cord leaves the sign, so the join reads as deliberate
  // hardware instead of a line that happens to end on a letter.
  ctx.fillStyle = '#241c30';
  ctx.beginPath();
  ctx.arc(ax, ay, 2.2 * plugK, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a48';
  ctx.fillRect(px2 - 3 * plugK, py2, 6 * plugK, 8 * plugK);
  ctx.fillStyle = '#8a8a98';
  ctx.fillRect(px2 - 2 * plugK, py2 + 8 * plugK, 1.6 * plugK, 3 * plugK);
  ctx.fillRect(px2 + 0.6 * plugK, py2 + 8 * plugK, 1.6 * plugK, 3 * plugK);
  if (flickerDark(t)) {
    // Zap: sparks plus the same cached radial glow the power capsules use. A
    // flat translucent rectangle read as a yellow card sitting behind the plug
    // — a radial falloff has no edge to mistake for a background.
    const glow = glowSprite('rgba(246,211,60,0.3)', 6);
    ctx.drawImage(glow, px2 - 7 * plugK, py2 + 2 * plugK, 14 * plugK, 14 * plugK);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px2 - 4 * plugK + ((i * 37 + Math.floor(t * 60)) % 8) * plugK,
        py2 + 9 * plugK + (i % 3) * 2 * plugK, 1.6 * plugK, 1.6 * plugK);
    }
  }
  return cast;
}
// Shuffled each time we enter the title so the cast doesn't always cross in the
// same order. Mutated in place (Fisher-Yates) so every reader that indexes into
// it — the parade draw, heroX, the invader strike — stays in agreement.
const HERO_PARADE = ['lorenzo', 'rusty', 'fernwick', 'b33p', 'clara', 'kiko', 'ramon', 'grumpos'];
export const TITLE_SHOOTER_COUNT = 3;

// Every current title hero owns a ranged ability. The title keeps the
// interaction deliberately sparse: three heroes get a shot on this visit and
// the other five get the familiar jump reaction. The art kind follows the
// ability data, so the randomized choice still shows the weapon that belongs
// to the hero rather than turning every shot into B-33P's pellet.
const TITLE_SHOT_KIND_BY_ABILITY = Object.freeze({
  shoot: 'pellet', axe: 'axe', fist: 'fist', bow: 'arrow', wrench: 'wrench', toss: 'bamboo',
});
function titleShotKind(id) {
  const hero = HEROES.find((candidate) => candidate.id === id);
  return TITLE_SHOT_KIND_BY_ABILITY[hero?.ability?.type] || 'pellet';
}

function chooseTitleShooters() {
  const pool = HERO_PARADE.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return new Set(pool.slice(0, TITLE_SHOOTER_COUNT));
}

function titleJumpAction(progress) {
  const lift = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
  return {
    pose: { kind: 'jump', grounded: false, vy: -240 + lift * 480 },
    feetLift: lift * 8 / 26,
  };
}

function titleShooterAction(id, time, progress) {
  const action = titleParadeAction(id, time, progress);
  const pose = {
    ...action.pose,
    menuAction: 'aim',
    actionTime: Math.max(0, Math.min(0.3, progress * 0.3)),
  };
  // Ray's glove is his launcher. Keep his established orbiting glove beat
  // while the other rigs use their shared aim pose and authored weapon prop.
  if (id === 'ramon') pose.headless = progress > 0.18 && progress < 0.78;
  return { pose, feetLift: action.feetLift };
}

function shuffleParade() {
  for (let i = HERO_PARADE.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [HERO_PARADE[i], HERO_PARADE[j]] = [HERO_PARADE[j], HERO_PARADE[i]];
  }
}

// Title menu geometry, shared by the renderer and the touch hit-test so a tap
// always lands on the row it looks like it lands on.
// Landscape keeps its compact horizontal row; portrait resolves a full-height
// logo/menu/cast composition below, from the published safe frame.
const TITLE_SCALE = 4.4;        // sized so the logo spans about the panel's width
// Set by build.js ahead of the bundle, and only for `npm run dev` — the
// published build never defines it, so this is '' and the title draws no stamp.
const BUILD_STAMP = (typeof window !== 'undefined' && window.__MASH_BUILD__) || '';
// The stack rides high: only enough headroom above the marquee for the invader
// to cross without clipping the lettering, so everything the text needs is
// spent above the cast rather than in the middle of the screen.
const TITLE_MARQUEE_Y = 20;
const TITLE_SUBTITLE_Y = 67;
const TITLE_FPS_TAP_WINDOW = 0.35;
const TITLE_DIAG_TAP_WINDOW = 3;
const TITLE_PLUG_Y = 88;
// Centred in the clear band between the subtitle and the tallest parade heads.
const TITLE_PANEL_Y = 110;
const TITLE_FLOOR_Y = 194;      // horizon line, above the parade's own strip
const TITLE_CARD_W = 78;
const TITLE_CARD_H = 54;
const TITLE_CARD_GAP = 10;
const TITLE_CARDS_W = TITLE_CARD_W * 4 + TITLE_CARD_GAP * 3;
const TITLE_CARDS_X = W / 2 - TITLE_CARDS_W / 2;
const TITLE_FOOTER_GAP = 20;
const TITLE_FOOTER_LINE_H = 11;

function titleMarqueeAt(x, y) {
  const layout = titleLayout();
  const logoW = textWidth('MASHENSTEIN', layout.logoScale, 'marquee');
  return x >= W / 2 - logoW / 2 - 8 && x <= W / 2 + logoW / 2 + 8
    && y >= layout.marqueeY - 8 && y <= layout.subtitleY + 12;
}
// The footer lives in the ground band now: cards stay airy, while the opening
// instruction and gag have a deliberate low-screen home before the parade
// arrives and takes over that space.
const TITLE_FOOTER_Y = 250;
  // The tagline and the attract countdown were set at 0.875 — about 10 CSS px on
  // a phone, under the smallest size iOS itself sets body copy at. There is room
  // under the panel for a full-size line, so they get one.
const TITLE_FLAVOR_S = 1;
const TITLE_CONTROLS_S = 2.0;

function titleCaptionLines(text, scale) {
  const maxWidth = W - 48;
  let lines = wrapText(text, maxWidth, scale, 2, 'ui').filter(Boolean);
  // Short taglines naturally fit on one line at the larger display size, but
  // the pre-parade caption is intentionally a two-line sign. Split those
  // cases at the nearest word midpoint while keeping both lines readable.
  if (lines.length === 1) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      const mid = Math.ceil(words.length / 2);
      lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
  }
  return lines.slice(0, 2);
}
// Wide enough for a clear three-line hierarchy, but only as tall as a phone
// finger target needs. Gloss supplies finish without turning them back into
// literal props that need an explanation.
const TITLE_MENU_TEXT_S = 1.55;
const TITLE_STATUS_TEXT_S = 1.15;
// A card's contents are one centred GROUP, not lines pinned to its edges. Fixed
// y's had the heading 7 units under the top rule, the status 10 above the
// bottom one and 21 units of nothing between the two — a hole the progress bar
// only half bridges on a started file and doesn't bridge at all on a CLOCK IN
// card, where the heading and its status read as belonging to different cards.
// Every tier is measured from the INK (a glyph box is half ascender slack these
// capitals never use), stacked on one gap, and the stack centred in the card, so
// the slack ends up around the group instead of inside it.
const TITLE_CARD_STACK_GAP = 5.5;
const TITLE_CARD_BAR_H = 3;
const TITLE_LABEL_INK = TEXT_INK_H * TITLE_MENU_TEXT_S;
const TITLE_STATUS_INK = TEXT_INK_H * TITLE_STATUS_TEXT_S;
const TITLE_CARD_STACK_TOP =
  (TITLE_CARD_H - (TITLE_LABEL_INK + TITLE_STATUS_INK + TITLE_CARD_BAR_H + TITLE_CARD_STACK_GAP * 2)) / 2;
const TITLE_CARD_LABEL_MID = TITLE_CARD_STACK_TOP + TITLE_LABEL_INK / 2;
const TITLE_CARD_PROGRESS_Y = TITLE_CARD_STACK_TOP + TITLE_LABEL_INK + TITLE_CARD_STACK_GAP;
const TITLE_CARD_STATUS_MID = TITLE_CARD_H - TITLE_CARD_STACK_TOP - TITLE_STATUS_INK / 2;
// The bar's row is held even on a slot with no file, so a started shift and a
// CLOCK IN sitting side by side keep their headings on one line across the row.
// STAFF ONLY has no third tier at all, so its two words are their own block,
// centred on the card and set on the same leading as the stack beside it.
const TITLE_CARD_LINE1_MID =
  (TITLE_CARD_H - (TITLE_LABEL_INK * 2 + TITLE_CARD_STACK_GAP)) / 2 + TITLE_LABEL_INK / 2;
const TITLE_CARD_LINE2_MID = TITLE_CARD_LINE1_MID + TITLE_LABEL_INK + TITLE_CARD_STACK_GAP;

// The title is one of the screens that can use the frame-based phone portrait
// presentation. It cannot simply stretch the old 16:9 coordinates: doing that
// would leave the logo and menu in the top quarter while the cast remains a
// tiny footer. Keep the established landscape values as the default, then
// resolve a real portrait composition from the current safe frame.
export function titleLayout() {
  if (!isPhonePortraitPresentation()) {
    return {
      portrait: false,
      safeTop: 0,
      safeBottom: H,
      logoScale: TITLE_SCALE,
      marqueeY: TITLE_MARQUEE_Y,
      subtitleY: TITLE_SUBTITLE_Y,
      plugY: TITLE_PLUG_Y,
      panelY: TITLE_PANEL_Y,
      floorY: TITLE_FLOOR_Y,
      backgroundBottom: TITLE_FLOOR_Y,
      paradeTop: 160,
      paradeH: H - 160,
      castH: HERO_PARADE_H,
      castFeetY: 268,
      cardsX: TITLE_CARDS_X,
      cardW: TITLE_CARD_W,
      cardH: TITLE_CARD_H,
      cardGap: TITLE_CARD_GAP,
      paradeGap: HERO_PARADE_LANDSCAPE_GAP,
      footerY: TITLE_FOOTER_Y,
      footerLineH: TITLE_FOOTER_LINE_H,
      controlsTextS: TITLE_CONTROLS_S,
      menuTextS: TITLE_MENU_TEXT_S,
      statusTextS: TITLE_STATUS_TEXT_S,
      subtitleTextS: 1,
      cardStackGap: TITLE_CARD_STACK_GAP,
      cardBarH: TITLE_CARD_BAR_H,
      footerTextS: TITLE_FLAVOR_S,
    };
  }

  const frame = presentationFrame();
  const safe = frame?.safeRect || { top: 0, bottom: H };
  const safeTop = Math.max(0, Number(safe.top) || 0);
  const safeBottom = Math.min(H, Number.isFinite(Number(safe.bottom)) ? Number(safe.bottom) : H);
  const logoBase = TITLE_SCALE * 1.72;
  const logoFit = (W - 22) / Math.max(1, textWidth('MASHENSTEIN', logoBase, 'marquee'));
  const logoScale = logoBase * Math.min(1, logoFit);
  const marqueeY = safeTop + 56;
  const subtitleY = marqueeY + logoScale * 8.3 + 20;
  const plugY = subtitleY + 30;
  const panelY = plugY + 45;
  const menuTextS = 2.8;
  const statusTextS = 2.5;
  const subtitleTextS = 2.4;
  // Size the menu column from the two display labels that must read at a
  // glance. Keep it just inside the subtitle's width, but never pinch STAFF
  // ONLY or the plug-count line, leaving generous star-field gutters on both
  // sides of the stack.
  const subtitleW = textWidth('THE UNPLUGGENING', subtitleTextS, 'subtitle');
  const staffW = textWidth('STAFF ONLY', menuTextS, 'bold');
  const cardW = Math.min(Math.max(180, W - 112), Math.max(180, subtitleW - 18, staffW + 32));
  const cardH = 104;
  const cardGap = 14;
  const castH = Math.min(124, Math.max(100, H * 0.115));
  const paradeGap = HERO_PARADE_LANDSCAPE_GAP * (castH / HERO_PARADE_H);
  // Let the enlarged parade walk nearer the lower edge while preserving a
  // small home-indicator-safe breathing room on phones.
  const castFeetY = Math.min(H - 10, safeBottom - 10);
  const floorY = Math.max(panelY + cardH * 4 + cardGap * 3 + 28, castFeetY - castH - 18);
  const paradeTop = Math.min(floorY, castFeetY - castH - 8 * (castH / 26) - 12);
  // THE GAG SITS UNDER THE CARDS, AT EVERY SIZE.
  //
  // `floorY` is the later of two things: the bottom of the card stack plus a
  // margin, or the parade's headroom. On a tall phone the stack wins, and a
  // fixed 82-unit lift off it put the caption straight across STAFF ONLY. Take
  // the lift only when it already clears the last card, and otherwise measure
  // down from the card itself; `footerY` is the caption BLOCK's centre, so a
  // two-line gag needs half a line of room above its first line.
  const footerTextS = 2.5;
  const captionLineH = 10.5 * footerTextS;
  const cardsBottom = panelY + cardH * 4 + cardGap * 3;
  const footerY = Math.min(
    H - 10 - captionLineH / 2 - TEXT_INK_H * footerTextS,
    Math.max(floorY - 82, cardsBottom + 24 + captionLineH / 2),
  );
  return {
    portrait: true,
    safeTop,
    safeBottom,
    logoScale,
    marqueeY,
    subtitleY,
    plugY,
    panelY,
    floorY,
    backgroundBottom: H,
    paradeTop,
    paradeH: Math.max(1, H - paradeTop),
    castH,
    castFeetY,
    cardsX: (W - cardW) / 2,
    cardW,
    cardH,
    cardGap,
    paradeGap,
    // This is a temporary pre-parade caption. Lift it into the open band above
    // the hero heads so the larger type has air, then let the existing fade
    // remove it when the parade becomes the focus.
    footerY,
    footerLineH: 14,
    controlsTextS: 2.1,
    // The first bump was still too close to the landscape ink at phone size,
    // especially on the plug-count line. Give the cards a clear headline and
    // status hierarchy instead of asking the progress bar to carry it.
    menuTextS,
    statusTextS,
    subtitleTextS,
    cardStackGap: 7,
    cardBarH: 4,
    footerTextS,
  };
}

function titleCastH() { return titleLayout().castH; }
function titleCastFeetY() { return titleLayout().castFeetY; }
function titleParadeK() { return titleCastH() / 26; }
function titleWispScale() { return 0.68 * titleParadeK(); }
function titleBoltHeadY() { return titleCastFeetY() - titleCastH() * 0.68; }
function titleShotY() { return titleCastFeetY() - titleCastH() * 0.58; }
function titleWeaponY() { return titleCastFeetY() - titleCastH() * 0.48; }
function titleWeaponHandX() { return titleCastH() * 0.29; }
function titleFistScale() { return titleCastH() / 40; }
function titleAxeScale() { return titleCastH() / 24; }
function titleParadeTapTop() { return titleCastFeetY() - titleCastH() - 6; }
function titleWispTapRadius() { return 12 * titleParadeK(); }
function titleHeroTapRadius() { return 13 * titleParadeK(); }
function titleShotHitRadius() { return 12 * titleParadeK(); }
function titleWispGapClearance() { return 22 * titleParadeK(); }

function titleCardMetrics(layout = titleLayout()) {
  const labelInk = TEXT_INK_H * layout.menuTextS;
  const statusInk = TEXT_INK_H * layout.statusTextS;
  const stackTop = (layout.cardH - (labelInk + statusInk + layout.cardBarH + layout.cardStackGap * 2)) / 2;
  return {
    labelMid: stackTop + labelInk / 2,
    progressY: stackTop + labelInk + layout.cardStackGap,
    statusMid: layout.cardH - stackTop - statusInk / 2,
    line1Mid: (layout.cardH - (labelInk * 2 + layout.cardStackGap)) / 2 + labelInk / 2,
    line2Mid: (layout.cardH - (labelInk * 2 + layout.cardStackGap)) / 2 + labelInk * 1.5 + layout.cardStackGap,
  };
}
// isTouchDevice(), not usingTouch: a phone should get the touch layout on its
// FIRST paint, not only once a finger has landed. Both the renderer and the tap
// hit-test read this, so a tap always lands on the card it looks like it does.
function titleTouch() { return Input.isTouchDevice(); }
function titleCardGeom(i) {
  const layout = titleLayout();
  return {
    x: layout.portrait ? layout.cardsX : layout.cardsX + i * (layout.cardW + layout.cardGap),
    y: layout.panelY + (layout.portrait ? i * (layout.cardH + layout.cardGap) : 0),
    w: layout.cardW,
    h: layout.cardH,
  };
}
// Which card a pointer landed on. The gutters belong to the sky, not either
// neighbouring card.
function titleButtonAt(px, py, count) {
  for (let i = 0; i < count; i++) {
    const g = titleCardGeom(i);
    if (px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h) return i;
  }
  return -1;
}

// Both of the title's modal lists — ERASE and STAFF ONLY — are sized from here, so
// they share one box, one row pitch and one hit-test. Touch rows are nearly
// twice as tall, which matters most for ERASE: it is the only list in the game
// that destroys data, and a single tap commits each step.
// ERASE carries a warning line under its heading and STAFF ONLY doesn't, so the
// header comes in two heights — reserving room for a line that isn't there
// left the list floating well below its own title.
const MODAL_HEAD_H = 58;        // heading plus a prominent warning line
const MODAL_HEAD_H_BARE = 28;   // heading alone
const warningGlowSprites = new Map();
function blurAlpha(source, w, h, radius, horizontal) {
  const output = new Float32Array(source.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset++) {
        const sampleX = horizontal ? x + offset : x;
        const sampleY = horizontal ? y : y + offset;
        if (sampleX < 0 || sampleX >= w || sampleY < 0 || sampleY >= h) continue;
        sum += source[sampleY * w + sampleX];
        count++;
      }
      output[y * w + x] = sum / count;
    }
  }
  return output;
}
function warningGlowSprite(text, scale) {
  const key = `${text}|${scale}`;
  let sprite = warningGlowSprites.get(key);
  if (sprite) return sprite;
  // The halo's softness is a fraction of the TYPE, not a fixed pixel count. At
  // a fixed 3-pixel blur the same sprite that reads as a glow around landscape
  // ink turns into a solid slab behind the portrait card's much heavier
  // glyphs — the blur no longer reaches past the letter it is meant to bloom
  // off. The padding grows with it so the spread still has somewhere to go.
  const blur = Math.max(3, Math.round(3 * scale));
  const pad = Math.max(12, blur * 3);
  const w = Math.ceil(textWidth(text, scale, 'ui') + pad * 2);
  const h = Math.ceil(12 * scale + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawText(ctx, text, pad, pad + scale, '#ff263d', scale, 'ui');
  const pixels = ctx.getImageData(0, 0, w, h);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < alpha.length; i++) alpha[i] = pixels.data[i * 4 + 3];
  const blurred = blurAlpha(blurAlpha(alpha, w, h, blur, true), w, h, blur, false);
  const glowPixels = ctx.createImageData(w, h);
  for (let i = 0; i < blurred.length; i++) {
    const a = Math.min(255, blurred[i] * 3.8);
    glowPixels.data[i * 4] = 255;
    glowPixels.data[i * 4 + 1] = 38;
    glowPixels.data[i * 4 + 2] = 61;
    glowPixels.data[i * 4 + 3] = a;
  }
  ctx.putImageData(glowPixels, 0, 0);
  sprite = { canvas, w, h, pad };
  warningGlowSprites.set(key, sprite);
  return sprite;
}
function modalListGeom(count, hasNote, gapBeforeLast = false, spaciousRows = false, labels = null) {
  const portrait = portraitMenuActive();
  const fullPortrait = portrait && !!labels;
  if (fullPortrait) {
    const firstTextMid = portraitMenuSafeTop() + 163;
    const footerY = portraitMenuSafeBottom(22);
    const rowH = Math.max(56, Math.min(86,
      (footerY - firstTextMid - 38) / Math.max(1, count)));
    const firstY = firstTextMid - rowH / 2;
    return {
      x: 0, y: 0, w: W, h: H, rowH, firstY, cancelGap: 0,
    };
  }
  // STAFF ONLY is a real page on a phone, not a small dialog floating in the
  // old landscape strip. Give its rows a thumb-sized pitch and let the box
  // use the generous portrait height; the same geometry feeds modalRowAt().
  const rowH = portrait
    ? (spaciousRows ? 74 : 56)
    : spaciousRows ? (titleTouch() ? 38 : 27) : (titleTouch() ? 30 : 21);
  const headH = portrait
    ? (hasNote ? 82 : 48)
    : hasNote ? MODAL_HEAD_H : MODAL_HEAD_H_BARE;
  const cancelGap = gapBeforeLast ? rowH * 0.6 : 0;
  // A boxed modal on a phone is still a box, but it cannot be a LANDSCAPE box:
  // portrait sets every glyph 1.55x larger (PORTRAIT_MENU_TEXT_SCALE), so a
  // 336-wide dialog was being asked to hold a row half as wide again as itself
  // and the longest shift line ran straight out through the border. Give the
  // card the phone's width bar a margin; drawModalList then fits its type to
  // whatever that leaves.
  // Sized from the row count rather than pinned. The old fixed 92-unit box
  // wasn't tall enough for its own longest list — three files plus BACK
  // needed 102, so the last row was drawn below the box's bottom edge.
  const h = headH + count * rowH + cancelGap + 8;
  // Centred, with a floor low enough that the tallest list — STAFF ONLY at seven
  // rows on touch — still centres instead of being pinned to the top and
  // hanging off the bottom.
  const y = Math.max(8, Math.round((H - h) / 2));
  const defaultX = portrait ? 24 : spaciousRows ? 72 : 88;
  const widest = labels
    ? labels.reduce((m, label) => Math.max(m, textWidth(label, portrait ? 1.55 : 1.35)), 0) : 0;
  const w = labels ? Math.min(W - 32, widest + 42) : W - defaultX * 2;
  const x = labels ? (W - w) / 2 : defaultX;
  return { x, y, w, h, rowH, firstY: y + headH, cancelGap };
}
function modalRowAt(px, py, count, hasNote, gapBeforeLast = false, spaciousRows = false, labels = null) {
  const g = modalListGeom(count, hasNote, gapBeforeLast, spaciousRows, labels);
  if (px < g.x || px > g.x + g.w) return -1;
  const relativeY = py - g.firstY;
  if (g.cancelGap && relativeY >= (count - 1) * g.rowH && relativeY < (count - 1) * g.rowH + g.cancelGap) return -1;
  const i = Math.floor((relativeY - (g.cancelGap && relativeY >= (count - 1) * g.rowH + g.cancelGap ? g.cancelGap : 0)) / g.rowH);
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
// short-out.
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
function flickerDark(t) {
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
function flickerAlpha(t) {
  return flickerDark(t) ? 0.45 : 1;
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
  static portraitMode = 'frame';

  constructor({ save, onSlotChosen, onSettings, onHowTo, onGuide, onSoundTest, onIntro, onAttract, attractDelay, attractLabel, onTutorial, openExtras = false, extrasFocus = null }) {
    this.save = save; this.onSlotChosen = onSlotChosen; this.onSettings = onSettings;
    this.onHowTo = onHowTo; this.onGuide = onGuide; this.onSoundTest = onSoundTest; this.onIntro = onIntro;
    this.onAttract = onAttract; this.attractDelay = attractDelay ?? 60;
    this.attractLabel = attractLabel || 'DEMO';
    this.onTutorial = onTutorial;
    this.openExtras = openExtras;
    this.extrasFocus = extrasFocus;
  }
  enter() {
    setVisualiserFullscreen(false);
    invalidateTitleParadeCache();
    this.singleToasterOpening = !titleToasterIntroSeen;
    titleToasterIntroSeen = true;
    shuffleParade();
    this.titleShooters = chooseTitleShooters();
    this.idx = 0;
    this.erase = null;
    const extrasIndex = this.extrasFocus
      ? this.extrasChoices().findIndex((choice) => choice.id === this.extrasFocus)
      : 0;
    this.extras = this.openExtras ? { idx: Math.max(0, extrasIndex) } : null;
    this.touchPress = null;
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
    this.wispsDismissed = false;
    this.tapBombs = []; // player-triggered invader bombs, same shape as the scheduled ones
    this.tapBombId = 0;
    this.shots = []; // title projectiles; tFired follows each visible wind-up
    this.shotId = 0;
    this.lastTitleTapAt = null;
    this.titleDiagTaps = 0;
    this.titleDiagFirstTapAt = 0;
    this.actTok = Input.activity;
    this.tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
    // Returning from settings, help, or another title-side screen should not
    // rewind a title theme that is already playing. Other screens replace the
    // bank, so this still starts the theme normally after gameplay or jukebox.
    // `sourceBank` is the song as CHOSEN; `Audio.bank` is what the sequencer walks,
    // after the arrangement, the layers and the voice overrides are folded in. The
    // title's mix does two of those, so it never matches the raw theme and this read
    // as "not playing" every time. Harmless only because setBank compares sourceBank
    // itself and returns early — the guard was asking a question it could not answer.
    if (Audio.sourceBank !== TITLE_THEME) Audio.setBank(TITLE_THEME);
    Input.setMenuButtons();
    setSceneGlow(true); // the marquee and cabinet screens get to glow
    // The title's foreground is already rendered at the selected device
    // density. Merge it into the backbuffer so WebGL uploads one full frame,
    // not a second full-size overlay texture, while retaining the title's
    // existing draw order and crispness.
    setOverlayMerge(true);
  }
  exit() { setOverlayMerge(false); setSceneGlow(false); setSkyFx(false); }
  handleTitleFpsTap(x, y) {
    if (!titleMarqueeAt(x, y)) {
      this.lastTitleTapAt = null;
      this.titleDiagTaps = 0;
      return false;
    }
    // Landscape iPad has no portrait pause card, so the marquee becomes its
    // hidden diagnostics anchor. Keep the gesture touch-only and iPad-only;
    // phones retain their existing two-tap FPS shortcut.
    const isIpad = !!(typeof window !== 'undefined' && window.__mash_platform?.isIpad);
    if (isIpad && Input.isTouchDevice()) {
      if (!this.titleDiagTaps || this.t - this.titleDiagFirstTapAt > TITLE_DIAG_TAP_WINDOW) {
        this.titleDiagTaps = 0;
        this.titleDiagFirstTapAt = this.t;
      }
      this.titleDiagTaps++;
      if (this.titleDiagTaps >= 5) {
        this.titleDiagTaps = 0;
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mashdiagopen'));
        }
      }
      return true;
    }
    if (this.lastTitleTapAt != null && this.t - this.lastTitleTapAt <= TITLE_FPS_TAP_WINDOW) {
      this.save.settings.showFps = !this.save.settings.showFps;
      this.save.persist();
      this.lastTitleTapAt = null;
      Audio.sfx('uiConfirm');
    } else {
      this.lastTitleTapAt = this.t;
    }
    return true;
  }
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
        this.wispsDismissed = true;
        for (let j = 0; j < pass.count; j++) {
          const key = `${pass.trip}:${j}`;
          const x = wispX(j, this.t);
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
    const returnAt = tHit + (titleHeroParadeSpan() - phase) / HERO_PARADE_SPEED;
    this.tapBombs.push({ id, tDrop: tHit, x, y0: titleBoltHeadY(), tHit, victim, returnAt, dir });
  }
  fireTitleShot(heroIndex) {
    const hero = HERO_PARADE[heroIndex];
    const kind = titleShotKind(hero);
    const tFired = this.t + B33P_TITLE_WINDUP_T;
    const returning = kind === 'fist' || kind === 'axe';
    const data = HEROES.find((candidate) => candidate.id === hero);
    const shot = {
      id: `shot:${this.shotId++}`,
      kind,
      hero,
      tFired,
      x0: heroX(heroIndex, tFired) + (returning ? titleWeaponHandX() : 12),
      y: returning ? titleWeaponY() : titleShotY(),
      dir: 1,
      source: heroIndex,
      sounded: false,
      size: data?.shotSize || 1,
    };
    if (returning) {
      shot.returnAt = tFired + titleWeaponOutT(kind) + TITLE_WEAPON_HOLD_T[kind];
      shot.returnT = TITLE_WEAPON_RETURN_T[kind];
    }
    this.shots.push(shot);
    this.poke.set(heroIndex, this.t);
  }
  options() {
    const opts = [];
    this.save.data.slots.forEach((s, i) => {
      const plugs = s ? totalPlugs(s) : 0;
      opts.push({
        id: 'slot' + i,
        label: `SHIFT ${i + 1}`,
        status: s ? `${plugs}/${MAX_PLUGS} PLUGS` : 'CLOCK IN',
        progress: s ? plugs / MAX_PLUGS : null,
        act: () => this.onSlotChosen(i, !s),
      });
    });
    // Everything that isn't "start playing" lives one tap deeper. Nine rows in
    // a 100-unit band meant 11-unit rows, which on a phone is a 16px target —
    // and ERASE A SHIFT sat two of them below SHIFT 3, where a miss is
    // destructive. Four or five rows is what lets a row be worth tapping.
    opts.push({ id: 'extras', label: 'STAFF ONLY', act: () => { this.extras = { idx: 0 }; Audio.sfx('ui'); } });
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
    const choices = [{ id: 'howto', label: 'HOW TO PLAY', act: () => this.onHowTo() }];
    if (this.onTutorial) choices.push({ id: 'tutorial', label: 'MANDATORY TRAINING', act: () => this.onTutorial() });
    // Until now the opening was reachable only by starting a brand new file —
    // so the one way to read it twice was to erase your progress.
    if (anyFile) choices.push({ id: 'intro', label: 'HOW THIS ALL STARTED', act: () => this.onIntro() });
    choices.push({ id: 'guide', label: 'FIELD GUIDE (WHAT IS WHAT)', act: () => this.onGuide() });
    choices.push({ id: 'soundtest', label: 'SOUND TEST (JUKEBOX)', act: () => this.onSoundTest() });
    if (anyFile) choices.push({ id: 'erase', label: 'ERASE A SHIFT', act: () => this.beginErase() });
    choices.push({ id: 'settings', label: 'SETTINGS', act: () => this.onSettings() });
    choices.push({ id: 'back', label: 'BACK', cancel: true });
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
      const i = modalRowAt(Input.pointer.x, Input.pointer.y, choices.length, false, false, false, choices.map((choice) => choice.label)); // heading only
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
        ...this.erase.slots.map((i) => ({ label: `SHIFT ${i + 1}: ${totalPlugs(this.save.data.slots[i])}/${MAX_PLUGS} PLUGS, ${formatCoins(this.save.data.slots[i].coins)} COINS`, slot: i })),
        { label: 'BACK', cancel: true },
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
      const i = modalRowAt(Input.pointer.x, Input.pointer.y, choices.length, true, this.erase.step === 'choose', true);
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
      this.extras = { idx: 0 };
      this.idx = Math.min(this.idx, this.options().length - 1);
      Audio.sfx('uiConfirm');
    }
  }
  update(dt) {
    this.t += dt;
    for (const strike of invaderStrikes(this.t, this.tapBombs) || []) {
      // The strike is present for the knockback window, so use its age to
      // edge-trigger the sound on the first frame after contact.
      if (strike.victim >= 0 && strike.kt >= 0 && strike.kt < dt + 0.02 && !this.hitBombs.has(strike.id)) {
        this.hitBombs.add(strike.id);
        Audio.sfx('boom');
      }
    }
    // A tap-bomb landing on a ghost instead acts exactly like tapping it —
    // the ghost takes the hit rather than whichever hero happened to be
    // nearest. Scoped to player-dropped bombs (ship taps + b33p's shots);
    // resolved once, right as each bomb lands.
    for (const bomb of this.tapBombs) {
      if (bomb._wispChecked || this.t < bomb.tHit) continue;
      bomb._wispChecked = true;
      const wisp = wispTapHit(bomb.tHit, bomb.x, titleShotY(), this.eaten, this.scatter, this.wispsDismissed);
      if (wisp) { bomb.victim = -1; this.hitWisp(wisp); }
    }
    const cometCycle = Math.floor(this.t / 6.5);
    const cometPhase = this.t - cometCycle * 6.5;
    if (cometPhase >= 0.4 && this.lastCometCycle !== cometCycle && shaderHash21(cometCycle, 3) >= 0.55) {
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
    const dark = flickerDark(this.t);
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
    // A touch needs one visible pressed frame before navigation replaces the
    // title. Keyboard/controller activation stays immediate; their persistent
    // purple focus is already the feedback those devices need.
    if (this.touchPress) {
      this.idleT = 0;
      if (Input.pressed('back')) {
        // A left swipe can begin on a row. Cancel its delayed touch commit so
        // the gesture never activates the row it started over.
        this.touchPress = null;
        Input.endFrame();
        return;
      }
      if (this.t >= this.touchPress.commitAt) {
        const act = this.touchPress.act;
        this.touchPress = null;
        act();
      }
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
      if (!this.handleTitleFpsTap(p.x, p.y)) {
        const i = titleButtonAt(p.x, p.y, opts.length);
        if (i >= 0) {
          this.idx = i;
          Audio.sfx('uiConfirm');
          if (Input.usingTouch) this.touchPress = { i, commitAt: this.t + 0.09, act: opts[i].act };
          else opts[i].act();
        }
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
            const id = HERO_PARADE[hero];
            if (this.titleShooters?.has(id)) {
              const kind = titleShotKind(id);
              const active = (kind === 'fist' || kind === 'axe') && this.shots.some((shot) => {
                if (shot.source !== hero || shot.kind !== kind) return false;
                const motion = titleWeaponMotion(shot, this.t);
                return !motion || !motion.done;
              });
              if (active) {
                this.poke.set(hero, this.t);
                Audio.sfx('jump');
              } else {
                this.fireTitleShot(hero);
              }
            } else {
              this.poke.set(hero, this.t);
              Audio.sfx('jump');
            }
          } else {
            // Or a maze-wisp visitor. First tap on any of them is a power
            // pellet: the whole crossing gang turns blue and scatters, still
            // on screen. A tap on one of them while frightened eats it, and
            // it zips off toward whichever edge is nearest.
            const wisp = wispTapHit(this.t, p.x, p.y, this.eaten, this.scatter, this.wispsDismissed);
            if (wisp) this.hitWisp(wisp);
          }
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
    // Resolve title shots. Ordinary projectiles are one-way; Ray's fist and
    // Grumpos's axe stay alive through their hold and return so the title
    // cannot show a second throw while the first weapon is still out.
    this.shots = this.shots.filter((shot) => {
      if (this.t < shot.tFired) return true;
      if (!shot.sounded) { shot.sounded = true; Audio.sfx('shoot'); }
      const weapon = shot.kind === 'fist' || shot.kind === 'axe';
      const motion = weapon ? titleWeaponMotion(shot, this.t) : null;
      if (weapon && (!motion || motion.done)) return false;
      if (weapon && motion.returning) return true;
      const x = motion
        ? motion.x
        : shot.x0 + (this.t - shot.tFired) * titleShotSpeed() * (shot.dir || 1);
      if (!weapon && (x < -40 || x > W + 40)) return false;
      if (weapon && shot.hit) return true;
      for (let i = 0; i < HERO_PARADE.length; i++) {
        if (i === shot.source || (shot.source == null && HERO_PARADE[i] === 'b33p')) continue;
        if (!heroOnScreen(i, this.t) || heroIsKnockedOut(i, this.t, this.tapBombs)) continue;
        if (Math.abs(heroX(i, this.t) - x) < titleShotHitRadius()) {
          this.explodeHero(shot.id, x, i, 1);
          Audio.sfx('hit');
          if (weapon) {
            shot.hit = true;
            shot.hoverAt = this.t;
            shot.hoverX = x;
            return true;
          }
          return false;
        }
      }
      const wisp = wispTapHit(this.t, x, shot.y, this.eaten, this.scatter, this.wispsDismissed);
      if (wisp) {
        this.hitWisp(wisp);
        if (weapon) {
          shot.hit = true;
          shot.hoverAt = this.t;
          shot.hoverX = x;
          return true;
        }
        return false;
      }
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
    // Staff Only and erase are opaque utility surfaces painted inside the title
    // state. Do not run the title's bloom/aberration over their glyphs: the
    // high-contrast text turns into a soft, shimmering fringe on WebGL.
    setSceneGlow(!(this.erase || this.extras));
    const profile = titleProfileOptions();
    const cast = titleScene(ctx, this.t, this.poke, this.frightStart, this.eaten, this.scatter, this.wispsDismissed, this.tapBombs, this.shots, profile, this.titleShooters);
    // The parade is always queued before the menu UI, including on touch. This
    // keeps the cards readable when a large character crosses their lower edge.
    // Modals are painted by the UI pass as the final surface over both layers.
    if (profile.parade) {
      const stateKey = titleParadeStateKey(this);
      const parade = (d) => {
        drawCachedTitleParade(d, cast, this.t, stateKey);
        // Entrances and knockouts stay individually composited above the strip,
        // so their motion and tap reactions never wait for the cache cadence.
        cast(d, 'dynamic');
      };
      if (!pushOverlayDraw(parade)) cast(ctx);
    }
    const opts = this.options();
    const ui = (d) => {
      // Four self-contained cards under the logo, then the controls and flavour
      // line as a footer. No surrounding machine or decorative object is needed.
      const layout = titleLayout();
      const cardMetrics = titleCardMetrics(layout);
      const menuTextS = layout.menuTextS;
      opts.forEach((o, i) => {
        const focused = i === this.idx;
        const sel = focused && !titleTouch();
        const pressed = this.touchPress?.i === i;
        const g = titleCardGeom(i);
        const y = g.y + (pressed ? 2 : (sel ? -1 : 0));
        const cardH = g.h - (pressed ? 1 : 0);
        const cx = g.x + g.w / 2;
        d.save();
        if (sel) {
          d.shadowColor = 'rgba(173,124,218,0.32)';
          d.shadowBlur = 5;
        }
        const cardFill = d.createLinearGradient(0, y, 0, y + cardH);
        if (sel) {
          cardFill.addColorStop(0, 'rgba(62,44,78,0.98)');
          cardFill.addColorStop(1, 'rgba(25,18,37,0.98)');
        } else if (pressed) {
          cardFill.addColorStop(0, 'rgba(18,23,38,0.98)');
          cardFill.addColorStop(1, 'rgba(6,8,17,0.98)');
        } else {
          cardFill.addColorStop(0, 'rgba(24,30,49,0.96)');
          cardFill.addColorStop(1, 'rgba(8,11,22,0.96)');
        }
        d.fillStyle = cardFill;
        platePath(d, g.x, y, g.w, cardH, 3); d.fill();
        d.shadowBlur = 0;
        const gloss = d.createLinearGradient(0, y, 0, y + cardH * 0.55);
        gloss.addColorStop(0, sel ? 'rgba(244,225,255,0.15)' : 'rgba(220,235,255,0.10)');
        gloss.addColorStop(1, 'rgba(255,255,255,0)');
        d.fillStyle = gloss;
        platePath(d, g.x + 1, y + 1, g.w - 2, cardH - 2, 2.5); d.fill();
        d.strokeStyle = sel ? 'rgba(205,165,242,0.92)' : 'rgba(105,125,153,0.58)';
        d.lineWidth = sel ? 1.25 : 0.8;
        platePath(d, g.x + 0.5, y + 0.5, g.w - 1, cardH - 1, 3); d.stroke();
        if (o.status) {
          const labelMid = y + cardMetrics.labelMid;
          const statusMid = y + cardMetrics.statusMid;
          drawTextCentered(d, o.label, cx, textYForMid(labelMid, menuTextS), sel ? '#f3eaff' : '#e3e9f3', menuTextS, 'bold');
          if (o.progress != null) {
            const barX = g.x + (layout.portrait ? 16 : 10);
            const barY = y + cardMetrics.progressY;
            const barW = g.w - (layout.portrait ? 32 : 20);
            const barH = layout.cardBarH;
            d.fillStyle = sel ? 'rgba(221,196,239,0.22)' : 'rgba(111,133,158,0.24)';
            platePath(d, barX, barY, barW, barH, 1.5); d.fill();
            const fillW = barW * Math.max(0, Math.min(1, o.progress));
            if (fillW > 0) {
              d.fillStyle = sel ? '#d8b2f2' : '#62d5cf';
              platePath(d, barX, barY, fillW, barH, 1.5); d.fill();
            }
          }
          drawTextCentered(d, o.status, cx, textYForMid(statusMid, layout.statusTextS), sel ? '#e4cdf7' : '#c0cbd9', layout.statusTextS, 'ui');
        } else {
          const staffColor = sel ? '#f3eaff' : '#e3e9f3';
          if (layout.portrait) {
            drawTextCentered(d, o.label, cx, textYForMid(y + layout.cardH / 2, menuTextS), staffColor, menuTextS, 'bold');
          } else {
            drawTextCentered(d, 'STAFF', cx, textYForMid(y + cardMetrics.line1Mid, menuTextS), staffColor, menuTextS, 'bold');
            drawTextCentered(d, 'ONLY', cx, textYForMid(y + cardMetrics.line2Mid, menuTextS), sel ? '#dbc0f3' : '#aebbd0', menuTextS, 'bold');
          }
        }
        d.restore();
      });
      // On touch the cards read as tappable without an instruction beneath them.
      const touch = titleTouch();
      const flavorY = layout.footerY;
      // The footer is useful while the title is waiting for input, then gets
      // The footer has a short opening beat of its own, then clears as the first
      // hero arrives so it never competes with the parade in the ground band.
      const fade = (start, duration) => Math.max(0, Math.min(1, (start + duration - this.t) / duration));
      // Let the lead character land and take a few walking steps before the
      // footer clears; the copy remains legible through the full entrance beat.
      const flavorFade = fade(HERO_PARADE_DELAY + 2.6, 1.2);
      const controlsFade = fade(HERO_PARADE_DELAY + 2.3, 1.2);
      const captionIsAttract = this.onAttract && this.attractDelay <= 10;
      const caption = captionIsAttract
        ? `NEXT ${this.attractLabel} IN ${Math.max(1, Math.ceil(this.attractDelay - this.idleT))} - ${touch ? 'TAP' : 'ANY KEY'}: BACK`
        : this.tagline;
      const captionLines = titleCaptionLines(caption, layout.footerTextS);
      const captionLineH = 10.5 * layout.footerTextS;
      const captionFirstY = flavorY - ((captionLines.length - 1) * captionLineH) / 2;
      const controlsY = touch
        ? flavorY
        : captionFirstY - 14 - (TEXT_INK_H + 1.5) * layout.controlsTextS;
      d.globalAlpha = controlsFade;
      // Keyboard-only by the branch above, so it names keys only: listing taps
      // to the one reader who cannot make them is the mirror of the mistake the
      // touch layout avoids by dropping this line entirely.
      if (!touch) drawTextCentered(d, 'ARROWS: CHOOSE   ENTER: CONFIRM', W / 2, controlsY, '#6b7d95');
      d.globalAlpha = flavorFade * 0.85;
      const captionColor = captionIsAttract ? '#8858c8' : '#55647a';
      captionLines.forEach((line, i) => {
        drawTextCentered(d, line, W / 2, captionFirstY + i * captionLineH,
          captionColor, layout.footerTextS);
      });
      d.globalAlpha = 1;
      if (BUILD_STAMP) {
        d.globalAlpha = 0.55;
        drawText(d, `BUILD ${BUILD_STAMP}`, 4, 4, '#55647a', 0.75);
        d.globalAlpha = 1;
      }
      if (this.erase) this.drawEraseModal(d);
      else if (this.extras) this.drawExtrasModal(d);
    };
    const foregroundToasters = (d) => drawFlyingToasters(d, this.t, this.singleToasterOpening);
    // Modal lists are solid surfaces: toaster cameos sit behind them so they
    // never compete with destructive choices, cabinet grids, or their labels.
    if (profile.ui && (this.erase || this.extras) && !pushOverlayDraw(foregroundToasters)) foregroundToasters(ctx);
    // On the normal title screen the menu is queued before the toasters, so the
    // enlarged appliances visibly cross the cards. Modal lists keep the
    // opposite order: their solid panel remains the final readable surface.
    if (profile.ui && !this.erase && !this.extras) {
      if (!pushOverlayDraw(ui)) ui(ctx);
      if (!pushOverlayDraw(foregroundToasters)) foregroundToasters(ctx);
    } else if (profile.ui && !pushOverlayDraw(ui)) ui(ctx);
  }
  drawEraseModal(d) {
    let title = 'ERASE WHICH SHIFT?';
    let note = 'CHOOSE CAREFULLY';
    let warningPulse = 0.5 + 0.5 * Math.sin(this.t * 3.2);
    if (this.erase.step === 'confirm') {
      title = `ERASE SHIFT ${this.erase.slot + 1}?`;
      note = 'ALL PROGRESS IN THIS SHIFT WILL BE LOST';
    } else if (this.erase.step === 'final') {
      title = `FINAL WARNING: ERASE SHIFT ${this.erase.slot + 1}?`;
      note = 'THIS CANNOT BE UNDONE.';
    }
    drawModalList(d, this.eraseChoices(), this.erase.idx, {
      title, note, accent: '#e05a62', titleColor: '#ff727c', gapBeforeLast: this.erase.step === 'choose',
      spaciousRows: true, warningPulse, align: 'left',
    });
    // Keep destructive-menu actions in the same compact keyboard hint format
    // used by the other menus, with the hint tucked against the right edge so
    // it never changes the left-aligned row geometry.
    //
    // Portrait parks it just under the card instead. Pinned to H - 12 it was a
    // caption at the very bottom of a phone, most of a screen away from the
    // dialog it belongs to, and at the landscape size to boot.
    const prompt = `${confirmVerb()}: CONFIRM   BACK`;
    if (portraitMenuActive()) {
      const g = modalListGeom(this.eraseChoices().length, true, this.erase.step === 'choose', true);
      portraitMenuTextCentered(d, prompt, W / 2,
        portraitMenuTextY(g.y + g.h + 30, 1.3), '#8a8a98', 1.3);
      return;
    }
    const promptScale = 0.9;
    drawText(d, prompt, W - 16 - textWidth(prompt, promptScale), H - 12, '#8a8a98', promptScale);
  }
  drawExtrasModal(d) {
    drawModalList(d, this.extrasChoices(), this.extras.idx, {
      title: 'STAFF ONLY', accent: 'rgba(109,90,145,0.35)', titleColor: '#f4f1fa',
      align: 'left', fitWidth: true,
    });
    if (portraitMenuActive()) {
      portraitMenuTextCentered(d,
        Input.isTouchDevice() ? 'TAP: CHOOSE   BACK: EXIT' : 'ARROWS: CHOOSE   ENTER: CONFIRM',
        W / 2, portraitMenuTextY(portraitMenuSafeBottom(22), 1.3), '#5a5a68', 1.3);
    }
  }
}

// The title's two modal lists, drawn one way. Geometry comes from
// modalListGeom, which the tap hit-test reads too, so the rows a finger finds
// are exactly the rows on screen at whatever size the device asked for.
function drawModalList(d, choices, idx, { title, note, accent, titleColor, gapBeforeLast = false, spaciousRows = false, warningPulse = 0, align = 'center', fitWidth = false }) {
  const g = modalListGeom(choices.length, !!note, gapBeforeLast, spaciousRows, fitWidth ? choices.map((choice) => choice.label) : null);
  const portrait = portraitMenuActive();
  const fullPortrait = portrait && fitWidth;
  const modalTextS = fullPortrait ? 1.8 : portrait ? (spaciousRows ? 1.8 : 1.35) : spaciousRows ? 1.55 : 1.35;
  const modalTitleS = fullPortrait ? 3.1 : portrait ? (spaciousRows ? 2.8 : 1.8) : spaciousRows ? 1.75 : 1.5;
  const left = align === 'left';
  const textX = fullPortrait ? 28 : g.x + 24;
  // How much room a line of type actually has inside this card: from the text
  // column to the far padding. Every string on a portrait card is fitted to it,
  // so a long shift summary or a FINAL WARNING title shrinks a little instead
  // of crossing the border.
  const textBudget = Math.max(1, g.x + g.w - 24 - textX);
  const fit = (text, size, style = 'ui') => (portrait && !fullPortrait
    ? portraitMenuFit(text, size, textBudget, style) : size);
  d.fillStyle = fullPortrait ? '#0b0b14' : 'rgba(2,3,10,0.78)';
  d.fillRect(0, 0, W, H);
  if (!fullPortrait) {
    d.fillStyle = 'rgba(11,10,20,0.98)';
    platePath(d, g.x, g.y, g.w, g.h, 4); d.fill();
    d.strokeStyle = accent; d.lineWidth = 1;
    platePath(d, g.x + 0.5, g.y + 0.5, g.w - 1, g.h - 1, 4); d.stroke();
  }
  const titleMid = fullPortrait ? portraitMenuSafeTop() + 34 : g.y + 16;
  const titleFit = fullPortrait ? portraitMenuFit(title, modalTitleS, W - 48, 'title') : modalTitleS;
  if (left) {
    if (fullPortrait) portraitMenuText(d, title, textX,
      portraitMenuTextY(titleMid, titleFit, 'title'), '#f4f1fa', titleFit, 'title');
    else if (portrait) portraitMenuText(d, title, textX, g.y + 16, '#f4f1fa', fit(title, modalTitleS, 'title'), 'title');
    else drawText(d, title, textX, g.y + 12, '#f4f1fa', modalTitleS, 'title');
  } else if (fullPortrait) {
    portraitMenuTextCentered(d, title, W / 2,
      portraitMenuTextY(titleMid, titleFit, 'title'), '#f4f1fa', titleFit, 'title');
  } else if (portrait) {
    portraitMenuTextCentered(d, title, W / 2, g.y + 16, '#f4f1fa', fit(title, modalTitleS, 'title'), 'title');
  } else {
    drawTextCentered(d, title, W / 2, g.y + 12, '#f4f1fa', modalTitleS, 'title');
  }
  if (note) {
    d.save();
    // The warning's halo is built from the same string at the same rendered
    // size and laid over the same baseline. It used to be built at the
    // landscape scale and hung off the landscape row while portrait drew the
    // words 18 units lower and half again as big — a smear beside the line
    // rather than a glow behind it.
    const noteSize = portrait ? fit(note, spaciousRows ? 1.45 : 1.1) : spaciousRows ? 1.35 : 1.2;
    const noteY = portrait ? g.y + 48 : g.y + 30;
    const glowScale = portrait ? portraitMenuScale(noteSize) : noteSize;
    const glow = warningGlowSprite(note, glowScale);
    d.globalCompositeOperation = 'lighter';
    d.globalAlpha = 0.32 + warningPulse * 0.28;
    const glowX = left ? textX - glow.pad : W / 2 - glow.w / 2;
    d.drawImage(glow.canvas, glowX, noteY - glowScale - glow.pad);
    d.globalCompositeOperation = 'source-over';
    d.globalAlpha = 1;
    if (left) {
      if (portrait) portraitMenuText(d, note, textX, noteY, '#ff727c', noteSize, 'ui');
      else drawText(d, note, textX, noteY, '#ff727c', noteSize, 'ui');
    } else if (portrait) {
      portraitMenuTextCentered(d, note, W / 2, noteY, '#ff727c', noteSize, 'ui');
    } else {
      drawTextCentered(d, note, W / 2, noteY, '#ff727c', noteSize, 'ui');
    }
    d.restore();
  }
  choices.forEach((choice, i) => {
    // Touch activates a row on the same tap that would otherwise just move
    // this cursor (updateExtras/updateErase), so idx sits on row 0 before
    // anything has been chosen. Keyboard/controller get to see it as a
    // resting cursor; touch doesn't, same gate as the title cards.
    const selected = i === idx && !titleTouch();
    const rowTop = g.firstY + i * g.rowH + (g.cancelGap && i === choices.length - 1 ? g.cancelGap : 0);
    const labelSize = fullPortrait
      ? portraitMenuFit(choice.label, modalTextS, W - 56, selected ? 'bold' : 'ui')
      : fit(choice.label, modalTextS, selected ? 'bold' : 'ui');
    const textY = portrait
      ? portraitMenuTextY(rowTop + g.rowH / 2, labelSize, selected ? 'bold' : 'ui')
      : textYForMid(rowTop + g.rowH / 2);
    if (selected) drawMenuRow(d, fullPortrait ? 18 : g.x + 7, rowTop + 1,
      fullPortrait ? W - 36 : g.w - 14, g.rowH - 2);
    if (left) {
      if (portrait) portraitMenuText(d, choice.label, textX, textY,
        selected ? '#c9a0ff' : '#d3d9e5', labelSize, selected ? 'bold' : 'ui');
      else drawText(d, choice.label, textX, textY, selected ? '#c9a0ff' : '#d3d9e5', labelSize, selected ? 'bold' : 'ui');
    } else if (portrait) {
      portraitMenuTextCentered(d, choice.label, W / 2, textY,
        selected ? '#c9a0ff' : '#d3d9e5', labelSize, selected ? 'bold' : 'ui');
    } else {
      drawTextCentered(d, choice.label, W / 2, textY, selected ? '#c9a0ff' : '#d3d9e5', labelSize, selected ? 'bold' : 'ui');
    }
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

function leftBand(labels, scale = 1) {
  const widest = labels.reduce((m, s) => Math.max(m, textWidth(s, scale)), 0);
  // The label starts 20 units inside the band; leave the same breathing room
  // on the far side so the widest rendered entry remains fully covered.
  const w = Math.min(W - 40, widest + 44);
  const x = (W - w) / 2;
  return { x, w, textX: x + 20 };
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

function drawCascade(ctx, block, top, band, color, t, opacity = 1) {
  const y0 = top + Math.max(0, (band - block.height) / 2);
  ctx.save();
  block.lines.forEach((line, i) => {
    const { alpha, dy } = cascadeAt(t, i);
    if (alpha <= 0) return;
    ctx.globalAlpha = opacity * alpha;
    drawTextCentered(ctx, line.text, W / 2, y0 + (i * TYPE_LINE_H + dy) * block.scale, color, block.scale);
  });
  ctx.restore();
}

// Difficulty rows are a name over a one-line gloss, and the pair is what the
// tap hit-test and the cursor band both cover — so the geometry lives here
// rather than being spelled out again in update() and draw().
//
// Landscape keeps the compact authored layout. Portrait resolves a separate
// full-height page below; both the painter and pointer hit-test use that page.
const DIFF_TOP = 68, DIFF_ROW = 31, DIFF_BACK_GAP = 12, DIFF_GLOSS_DY = 13;
const DIFF_NAME_S = 1.3, DIFF_GLOSS_S = 1.05;

function difficultyLayout() {
  if (!portraitMenuActive()) {
    const rows = [...DIFFICULTIES, { id: 0, name: 'BACK', desc: 'RETURN TO SHIFT SELECT' }]
      .map((d, i) => ({ d, y: DIFF_TOP + i * DIFF_ROW + (i === DIFFICULTIES.length ? DIFF_BACK_GAP : 0), h: DIFF_ROW }));
    return { portrait: false, rows };
  }
  const count = DIFFICULTIES.length + 1;
  const safeTop = portraitMenuSafeTop();
  const safeBottom = portraitMenuSafeBottom();
  const x = screen.safeLeft + 18;
  const right = W - screen.safeRight - 18;
  const w = Math.max(1, right - x);
  const firstY = safeTop + 104;
  const bottom = safeBottom - 22;
  const gap = 10;
  const rowH = Math.max(72, Math.min(132,
    (bottom - firstY - gap * (count - 1)) / count));
  const rows = [...DIFFICULTIES, { id: 0, name: 'BACK', desc: 'RETURN TO SHIFT SELECT' }]
    .map((d, i) => ({ d, y: firstY + i * (rowH + gap), h: rowH }));
  return {
    portrait: true, x, w, rows,
    titleY: safeTop + 34,
    subtitleY: safeTop + 75,
  };
}

function difficultyRowAt(y) {
  const rows = difficultyLayout().rows;
  const i = rows.findIndex((row) => y >= row.y && y < row.y + row.h);
  if (i >= 0) return i;
  return -1;
}

function difficultyConfirmLayout() {
  if (!portraitMenuActive()) {
    return { x: 40, y: 90, w: W - 80, h: 80, actionY: 142, actionH: 18 };
  }
  const safeTop = portraitMenuSafeTop();
  const safeBottom = portraitMenuSafeBottom();
  const w = Math.min(W - screen.safeLeft - screen.safeRight - 32, 440);
  const x = (W - w) / 2;
  const h = Math.min(238, Math.max(210, (safeBottom - safeTop) * 0.27));
  const y = safeTop + (safeBottom - safeTop - h) / 2;
  return { x, y, w, h, actionY: y + h - 68, actionH: 54 };
}

function drawDifficultyPortrait(ctx, state, layout) {
  const titleS = portraitMenuFit('SELECT DIFFICULTY', 2.8, layout.w, 'title');
  portraitMenuTextCentered(ctx, 'SELECT DIFFICULTY', W / 2,
    portraitMenuTextY(layout.titleY, titleS, 'title'), '#fff', titleS, 'title');
  const subtitleS = portraitMenuFit('CHOOSE THE TERMS OF YOUR SHIFT', 1.2,
    layout.w, 'ui');
  portraitMenuTextCentered(ctx, 'CHOOSE THE TERMS OF YOUR SHIFT', W / 2,
    portraitMenuTextY(layout.subtitleY, subtitleS), '#8a8a98', subtitleS);

  layout.rows.forEach(({ d, y, h }, i) => {
    const selected = i === state.idx;
    const danger = d.id === 5;
    if (selected) drawMenuRow(ctx, layout.x, y, layout.w, h, 8,
      'rgba(201,160,255,0.12)');
    const nameS = portraitMenuFit(d.name, 2.35, layout.w - 40, 'bold');
    const glossS = portraitMenuFit(d.desc, 1.55, layout.w - 40, 'ui');
    const nameH = TEXT_INK_H * portraitMenuScale(nameS);
    const glossH = TEXT_INK_H * portraitMenuScale(glossS);
    const pairGap = 12;
    const pairH = nameH + pairGap + glossH;
    const pairTop = y + Math.max(0, (h - pairH) / 2);
    const nameMid = pairTop + nameH / 2;
    const glossMid = pairTop + nameH + pairGap + glossH / 2;
    const color = danger ? '#e04848' : selected ? '#c9a0ff' : '#f0eef6';
    portraitMenuTextCentered(ctx, d.name, W / 2,
      portraitMenuTextY(nameMid, nameS, 'bold'), color, nameS, 'bold');
    portraitMenuTextCentered(ctx, d.desc, W / 2,
      portraitMenuTextY(glossMid, glossS), selected ? '#c9a0ff' : '#8f8b9e', glossS);
    // Keep the little joke attached to the enlarged name rather than letting
    // it become a second, misaligned column on the phone.
    if (d.id === 3 && selected) {
      const nameW = textWidth(d.name, portraitMenuScale(nameS), 'bold');
      portraitMenuText(ctx, ':)', W / 2 + nameW / 2 + 12,
        portraitMenuTextY(nameMid, nameS, 'bold'), '#8a8a98', nameS, 'bold');
    }
  });
}

function drawDifficultyConfirmPortrait(ctx) {
  const g = difficultyConfirmLayout();
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.strokeStyle = '#e04848';
  ctx.lineWidth = 2;
  ctx.strokeRect(g.x + 1, g.y + 1, g.w - 2, g.h - 2);
  const titleS = portraitMenuFit('ARE YOU SURE?', 2.4, g.w - 32, 'title');
  portraitMenuTextCentered(ctx, 'ARE YOU SURE?', W / 2,
    portraitMenuTextY(g.y + 48, titleS, 'title'), '#e04848', titleS, 'title');
  portraitMenuTextCentered(ctx, '(WE ARE NOT.)', W / 2,
    portraitMenuTextY(g.y + 94, 1.4), '#8a8a98', 1.4);
  const actionMid = g.actionY + g.actionH / 2;
  portraitMenuTextCentered(ctx, 'YES', g.x + g.w * 0.26,
    portraitMenuTextY(actionMid, 1.7, 'bold'), '#e04848', 1.7, 'bold');
  portraitMenuTextCentered(ctx, 'NO — WISDOM', g.x + g.w * 0.74,
    portraitMenuTextY(actionMid, 1.7, 'bold'), '#c8c8d8', 1.7, 'bold');
}

export class DifficultyState {
  static portraitMode = 'frame';

  constructor({ save, onStart, onDone, onCancel }) { this.save = save; this.onStart = onStart; this.onDone = onDone; this.onCancel = onCancel; }
  enter() { this.onStart?.(); this.idx = 0; this.confirming = false; Input.setMenuButtons(); }
  update(dt) {
    const n = DIFFICULTIES.length + 1;
    if (this.confirming) {
      // Two explicit tap zones (see draw()) rather than "anywhere but the
      // corner button" — this is a menu now, not a floating-button screen.
      const p = Input.pointer;
      const g = difficultyConfirmLayout();
      const tapped = Input.pressed('pointer')
        && p.x >= g.x && p.x <= g.x + g.w
        && p.y >= g.actionY && p.y <= g.actionY + g.actionH;
      if (Input.pressed('confirm') || (tapped && p.x < g.x + g.w / 2)) { Audio.sfx('uiConfirm'); this.commit(5); }
      if (Input.pressed('back') || Input.pressed('slide') || (tapped && p.x >= g.x + g.w / 2)) { this.confirming = false; Audio.sfx('ui'); }
      Input.endFrame();
      return;
    }
    if (Input.pressed('back')) { this.onCancel?.(); Audio.sfx('ui'); Input.endFrame(); return; }
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer')) {
      const i = difficultyRowAt(Input.pointer.y);
      if (i >= 0) {
        if (this.idx === i) this.select(); else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('confirm')) this.select();
    Input.endFrame();
  }
  select() {
    if (this.idx === DIFFICULTIES.length) { this.onCancel?.(); Audio.sfx('ui'); return; }
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
    const layout = difficultyLayout();
    if (layout.portrait) {
      drawDifficultyPortrait(ctx, this, layout);
      if (this.confirming) drawDifficultyConfirmPortrait(ctx);
      return;
    }
    drawTextCentered(ctx, 'SELECT DIFFICULTY', W / 2, 40, '#fff', 2, 'title');
    // Widest of the two columns of type, since the names are set a size above
    // their glosses and either can be the long one.
    const names = centredBand(DIFFICULTIES.map((d) => d.name), DIFF_NAME_S);
    const glosses = centredBand(DIFFICULTIES.map((d) => d.desc), DIFF_GLOSS_S);
    const band = names.w >= glosses.w ? names : glosses;
    [...DIFFICULTIES, { id: 0, name: 'BACK', desc: 'RETURN TO SHIFT SELECT' }].forEach((d, i) => {
      const sel = i === this.idx;
      const danger = d.id === 5;
      const label = d.name;
      const color = danger ? '#e04848' : sel ? '#c9a0ff' : '#c8c8d8';
      const rowTop = DIFF_TOP + i * DIFF_ROW + (i === DIFFICULTIES.length ? DIFF_BACK_GAP : 0);
      if (sel) drawMenuRow(ctx, band.x, rowTop + 1, band.w, DIFF_ROW - 2, 3, 'rgba(201,160,255,0.055)');
      // The name/gloss pair centres in the band as one block, so the band the
      // finger finds is the band the words sit in the middle of.
      const nameY = textYForMid(rowTop + DIFF_ROW / 2, DIFF_NAME_S) - DIFF_GLOSS_DY / 2;
      drawTextCentered(ctx, label, W / 2, nameY, color, DIFF_NAME_S);
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
const INTRO_FRAME_W = [404, 250, 404, 470, 470];
const INTRO_FRAME_Y = 30.5, INTRO_FRAME_H = 120;
const INTRO_POWER_DOWN_DELAY = 1;
// The caption strip: under the picture frame, above the panel counter.
const INTRO_TEXT_TOP = INTRO_FRAME_Y + INTRO_FRAME_H + 6;
const INTRO_TEXT_BOTTOM = H - 28;
const PORTRAIT_INTRO_SIDE_MARGIN_CSS = 16;
const PORTRAIT_INTRO_ART_TOP_CSS = 18;
const PORTRAIT_INTRO_TEXT_TOP_RATIO = 0.57;
const PORTRAIT_INTRO_TEXT_BOTTOM_CSS = 70;
const PORTRAIT_INTRO_ART_GAP_CSS = 18;

function drawEggshellCopterAt(ctx, x, y, size, frame, face, time = 0) {
  const driftX = Math.sin(time * 1.2) * size * 0.055;
  const driftY = Math.sin(time * 1.7) * size * 0.04;
  ctx.save();
  ctx.translate(x + driftX, y + driftY);
  eggshellCopterArt(ctx, size, size, frame, { face });
  ctx.restore();
}

function introEggshellPosition(time, center, span, top, height, size) {
  const p = clamp(time / 12, 0, 1);
  let offset;
  if (p < 0.35) offset = -span * 0.5 + (p / 0.35) * span * 0.45;
  else if (p < 0.72) offset = -span * 0.05 + Math.sin((p - 0.35) / 0.37 * Math.PI) * span * 0.08;
  else offset = -span * 0.05 + ((p - 0.72) / 0.28) * span * 0.48;
  const lift = p > 0.72 ? ((p - 0.72) / 0.28) * height * 0.08 : 0;
  return {
    x: center + offset - size / 2,
    y: top + (height - size) / 2 + Math.sin(time * 1.7) * 3 - lift,
  };
}

function eggshellCopterFrame(time) {
  const beat = Audio.songBeat?.();
  return beat == null ? Math.floor(time * 12) : Math.floor(beat * 24);
}

function portraitIntroBlock(text) {
  const frame = presentationFrame();
  const safe = frame.safeRect;
  const css = (n) => n / frame.scale;
  const width = Math.max(css(180), safe.width - css(PORTRAIT_INTRO_SIDE_MARGIN_CSS * 2));
  const textTop = safe.top + safe.height * PORTRAIT_INTRO_TEXT_TOP_RATIO;
  const textBottom = safe.bottom - css(PORTRAIT_INTRO_TEXT_BOTTOM_CSS);
  const scales = [2.7, 2.45, 2.2, 1.95, 1.7];
  let scale = scales[scales.length - 1];
  let lines = portraitMenuWrap(text, width, scale, 12);
  let lineH = 11 * portraitMenuScale(scale);
  for (const candidate of scales) {
    const candidateLines = portraitMenuWrap(text, width, candidate, 12);
    const candidateLineH = 11 * portraitMenuScale(candidate);
    scale = candidate;
    lines = candidateLines;
    lineH = candidateLineH;
    if (candidateLines.length * candidateLineH <= textBottom - textTop) break;
  }
  return {
    lines,
    scale,
    lineH,
    height: lines.length * lineH,
    center: (safe.left + safe.right) / 2,
    width,
    artLeft: safe.left + css(PORTRAIT_INTRO_SIDE_MARGIN_CSS),
    artW: width,
    artTop: safe.top + css(PORTRAIT_INTRO_ART_TOP_CSS),
    artBottom: textTop - css(PORTRAIT_INTRO_ART_GAP_CSS),
    textTop,
    textBottom,
    safe,
    css,
  };
}

function introEggshellFace(t) {
  const phase = t % 4.8;
  const mood = phase < 1.6 ? 'flat' : phase < 3.2 ? 'smirk' : 'really';
  return {
    look: Math.sin(t * 0.9) * 0.55,
    mood,
    blink: t % 3.7 > 3.54 ? 1 : 0,
    twitch: [Math.sin(t * 3.1) * 0.35, Math.sin(t * 3.7 + 0.8) * 0.35],
  };
}

export class IntroState {
  static portraitMode = 'frame';

  constructor({ onDone }) { this.onDone = onDone; }
  enter() {
    this.panel = -1; this.beatIndex = -1; this.beatT = 0; this.reveal = 0;
    this.t = 0; this.panelT = 0; this.finished = false; this.awaitingClose = false;
    this.frameW = INTRO_FRAME_W[0]; this.blocks = []; this.blockKey = null;
    this.staticMotion = CABINETS.map(() => ({ phase: Math.random() * 7, rate: 0.9 + Math.random() * 0.4 }));
    this.staticBurstActive = CABINETS.map(() => false);
    this.heroPopPlayed = Array(8).fill(false);
    Input.setMenuButtons();
    this.startBeat(0);
  }
  startBeat(index) {
    const beat = INTRO_BEATS[index];
    if (!beat) {
      this.awaitingClose = true;
      return;
    }
    const panelChanged = beat.panel !== this.panel;
    this.beatIndex = index;
    this.beatT = 0;
    this.reveal = 0;
    if (!panelChanged) return;
    this.panel = beat.panel;
    this.panelT = 0;
    this.staticBurstActive.fill(false);
    if (this.panel === 2) Audio.sfx('powerDown', { inSeconds: INTRO_POWER_DOWN_DELAY });
    else if (this.panel === 4) Audio.startCrowdCheer({ reverb: 0.85, reverbDecay: 6 });
    else if (this.panel > 0) Audio.sfx('ui');
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    Audio.stopCrowdCheer();
    this.onDone();
  }
  // Layout is cached per beat and presentation revision. A subtitle must never
  // reflow underneath itself while it fades in or out.
  block(i) {
    const portrait = isPhonePortraitPresentation();
    const key = portrait ? `portrait:${presentationFrame().revision}` : 'landscape';
    if (this.blockKey !== key) { this.blocks = []; this.blockKey = key; }
    if (!this.blocks[i]) {
      const text = INTRO_BEATS[i].text;
      this.blocks[i] = portrait
        ? portraitIntroBlock(text)
        : fitProse(text, W - 56, INTRO_TEXT_BOTTOM - INTRO_TEXT_TOP);
    }
    return this.blocks[i];
  }
  subtitleReveal() {
    return Math.min(CASCADE_ALL, this.beatT / 0.42 * CASCADE_ALL);
  }
  subtitleOpacity() {
    if (this.awaitingClose) return 1;
    const duration = INTRO_BEATS[this.beatIndex]?.duration ?? 1;
    const fadeIn = Math.min(1, this.beatT / 0.18);
    const fadeOut = Math.min(1, Math.max(0, (duration - this.beatT) / 0.35));
    return Math.min(fadeIn, fadeOut);
  }
  staticBurstAmount(i, seed) {
    const motion = this.staticMotion?.[i] || { phase: 0, rate: 2 };
    return deadScreenBurst(this.t * motion.rate + motion.phase, seed);
  }
  updateStaticAudio() {
    if (this.panel !== 2) {
      this.staticBurstActive.fill(false);
      return;
    }
    for (let i = 0; i < 6; i++) {
      const seed = cabinetPalette(CABINETS[i], false).seed;
      const dead = this.panelT >= INTRO_POWER_DOWN_DELAY + 0.12 + i * 0.12;
      const active = dead && this.staticBurstAmount(i, seed) > 0;
      if (active && !this.staticBurstActive[i]) Audio.sfx('static', { gain: 0.34 });
      this.staticBurstActive[i] = active;
    }
  }
  updateHeroEntranceAudio() {
    if (this.panel !== 3) {
      this.heroPopPlayed.fill(false);
      return;
    }
    for (let i = 0; i < this.heroPopPlayed.length; i++) {
      const appearsAt = 0.3 + i * 0.25;
      if (this.panelT >= appearsAt && !this.heroPopPlayed[i]) {
        this.heroPopPlayed[i] = true;
        Audio.sfx('popSmall', { pitch: 1 + i * 0.035, gain: 0.75 });
      }
    }
  }
  update(dt) {
    if (this.finished) { Input.endFrame(); return; }
    if (Input.pressed('back')) {
      this.finish();
      Input.endFrame();
      return;
    }
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      this.finish();
      Input.endFrame();
      return;
    }
    if (this.awaitingClose) {
      this.t += Math.max(0, dt);
      this.panelT += Math.max(0, dt);
      Input.endFrame();
      return;
    }
    let remaining = Math.max(0, dt);
    while (remaining > 0 && !this.finished) {
      const beat = INTRO_BEATS[this.beatIndex];
      const step = Math.min(remaining, Math.max(0, beat.duration - this.beatT));
      this.t += step;
      this.beatT += step;
      this.panelT += step;
      remaining -= step;
      if (this.beatT >= beat.duration - 0.000001) this.startBeat(this.beatIndex + 1);
    }
    // Eased toward the target rather than snapped: the panels are read at a
    // beat boundary, so a hard cut in frame width reads as a layout glitch where
    // a half-second open reads as the scene making room.
    const want = INTRO_FRAME_W[Math.min(this.panel, INTRO_FRAME_W.length - 1)];
    this.frameW += (want - this.frameW) * Math.min(1, dt * 6);
    if (!this.finished) {
      this.updateStaticAudio();
      this.updateHeroEntranceAudio();
    }
    Input.endFrame();
  }
  drawPowerDownCabinet(ctx, x, y, w, h, i) {
    const cabinet = CABINETS[i];
    const shutdownAt = INTRO_POWER_DOWN_DELAY + 0.12 + i * 0.12;
    if (this.panelT < shutdownAt) {
      const pal = cabinetPalette(cabinet);
      drawCabinetShell(ctx, x, y, w, h, pal);
      const screen = drawCabinetScreen(ctx, x, y, w, h, pal);
      if (screen) drawScreenSweep(ctx, screen, this.t + i * 1.3, i * 977);
      return;
    }
    const offPal = cabinetPalette(cabinet, false);
    drawCabinetShell(ctx, x, y, w, h, offPal);
    const elapsed = this.panelT - shutdownAt;
    const flash = elapsed < 0.12 ? 1 - elapsed / 0.12 : 0;
    drawDeadScreen(ctx, x, y, w, h, this.t, offPal.seed, null,
      Math.max(this.staticBurstAmount(i, offPal.seed), flash));
    if (flash > 0) {
      const screen = cabinetScreenRect(x, y, w, h, null);
      ctx.save();
      ctx.globalAlpha = flash * 0.78;
      ctx.fillStyle = '#f4f6ff';
      ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
      ctx.restore();
    }
  }
  drawPortrait(ctx) {
    const block = this.block(this.beatIndex);
    const { center, artLeft, artW, artTop, artBottom, textTop, textBottom, safe } = block;
    const artH = Math.max(1, artBottom - artTop);
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#171322';
    ctx.fillRect(artLeft, artTop, artW, artH);
    ctx.strokeStyle = '#30303f';
    ctx.strokeRect(artLeft, artTop, artW, artH);

    if (this.panel === 0) {
      const columns = 3;
      const gapX = 12;
      const gapY = 12;
      const cellW = (artW - gapX * (columns - 1)) / columns;
      const cabinetH = Math.min((artH - gapY) / 2 - 4, cellW * 82 / 46);
      const cabinetW = cellW;
      for (let i = 0; i < 6; i++) {
        const cab = CABINETS[i];
        const row = Math.floor(i / columns);
        const column = i % columns;
        const x = artLeft + column * (cabinetW + gapX);
        const bottom = artBottom - 6 - (1 - row) * (cabinetH + gapY);
        const pal = cabinetPalette(cab);
        drawCabinetShell(ctx, x, bottom - cabinetH, cabinetW, cabinetH, pal);
        const scr = drawCabinetScreen(ctx, x, bottom - cabinetH, cabinetW, cabinetH, pal);
        if (scr) drawScreenSweep(ctx, scr, this.t + i * 1.3, i * 977);
      }
    }
    if (this.panel === 1) {
      const copterSize = Math.min(artW * 0.78, artH * 0.84);
      const copter = introEggshellPosition(this.panelT, center, artW, artTop, artH, copterSize);
      drawEggshellCopterAt(ctx, copter.x, copter.y,
        copterSize, eggshellCopterFrame(this.t), introEggshellFace(this.t), this.t);
    }
    if (this.panel === 2) {
      const columns = 3;
      const gapX = 12;
      const gapY = 12;
      const cellW = (artW - gapX * (columns - 1)) / columns;
      const cabinetH = Math.min((artH - gapY) / 2 - 4, cellW * 82 / 46);
      const cabinetW = cellW;
      for (let i = 0; i < 6; i++) {
        const row = Math.floor(i / columns);
        const column = i % columns;
        const x = artLeft + column * (cabinetW + gapX);
        const bottom = artBottom - 6 - (1 - row) * (cabinetH + gapY);
        this.drawPowerDownCabinet(ctx, x, bottom - cabinetH, cabinetW, cabinetH, i);
      }
    }
    if (this.panel === 3 || this.panel === 4) {
      const heroes = ['lorenzo', 'rusty', 'fernwick', 'b33p', 'clara', 'kiko', 'ramon', 'grumpos'];
      const columns = 4;
      const gapY = 96;
      const heroH = Math.min(132, (artH - gapY) / 2, artW / 4.15);
      const pitch = (artW - heroH * 0.7) / (columns - 1);
      const castH = heroH * 2 + gapY;
      const castTop = artTop + Math.max(0, (artH - castH) / 2);
      const rollCall = this.panel === 3;
      heroes.forEach((h, i) => {
        const start = rollCall ? 0.3 + i * 0.25 : 0;
        const a = rollCall ? Math.min(1, Math.max(0, (this.panelT - start) / 0.22)) : 1;
        if (a <= 0) return;
        const ease = 1 - Math.pow(1 - a, 3);
        const scale = ease + Math.sin(a * Math.PI) * 0.14;
        const pose = { kind: 'idle', phase: (this.panelT * 0.55 + i * 0.21) % 1, time: this.panelT + i * 0.8, grounded: true };
        if (!rollCall) {
          pose.menu = true;
          pose.kind = 'celebrate';
          pose.phase = 0;
          pose.time = this.panelT + i * 0.35;
        }
        const row = Math.floor(i / columns);
        const column = i % columns;
        const rowX = artLeft + heroH * 0.35;
        const feet = castTop + (row + 1) * heroH + row * gapY + (1 - ease) * 13;
        drawToon(ctx, h, pose, rowX + column * pitch, feet,
          heroH * scale, { alpha: ease });
      });
    }

    const y0 = textTop + Math.max(0, (textBottom - textTop - block.height) / 2);
    const opacity = this.subtitleOpacity();
    block.lines.forEach((line, i) => {
      const { alpha, dy } = cascadeAt(this.subtitleReveal(), i);
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = opacity * alpha;
      const mid = y0 + i * block.lineH + block.lineH / 2
        + dy * portraitMenuScale(block.scale);
      portraitMenuTextCentered(ctx, line, center, portraitMenuTextY(mid, block.scale),
        '#e8e8f0', block.scale);
      ctx.restore();
    });
    if (this.awaitingClose) {
      const prompt = 'TAP OR PRESS ENTER TO CLOSE';
      const promptScale = portraitMenuFit(prompt, 1.55, block.width, 'bold');
      portraitMenuTextCentered(ctx, prompt, center,
        portraitMenuTextY(safe.bottom - block.css(28), promptScale, 'bold'),
        '#8a8492', promptScale, 'bold');
    }
  }
  draw(ctx) {
    if (this.finished || this.beatIndex < 0) return;
    if (isPhonePortraitPresentation()) {
      this.drawPortrait(ctx);
      return;
    }
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    // panel art: minimal pixel scenes
    ctx.strokeStyle = '#30303f';
    const fw = this.frameW;
    ctx.strokeRect(W / 2 - fw / 2, INTRO_FRAME_Y, fw, INTRO_FRAME_H);
    if (this.panel === 1) {
      const copterSize = 92;
      const copter = introEggshellPosition(this.panelT, W / 2, 240,
        INTRO_FRAME_Y, INTRO_FRAME_H, copterSize);
      drawEggshellCopterAt(ctx, copter.x, copter.y,
        copterSize, eggshellCopterFrame(this.t), introEggshellFace(this.t), this.t);
    }
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
    if (this.panel === 2) {
      const CW = 46, CH = 82, BOT = 146;
      for (let i = 0; i < 6; i++) {
        const cx = W / 2 + (i - 2.5) * 68;
        this.drawPowerDownCabinet(ctx, cx - CW / 2, BOT - CH, CW, CH, i);
      }
    }
    if (this.panel === 3 || this.panel === 4) {
      // One row of eight, filling the widened frame. They were 24 units tall in
      // a single row, then 44 in two rows of four; a single row across the wider
      // box gets them to 78 — three times the original, on the one screen whose
      // entire job is introducing them. A row also says "a line-up" in a way a
      // block of four-by-two does not, which is what these two panels are about.
      const heroes = ['lorenzo', 'rusty', 'fernwick', 'b33p', 'clara', 'kiko', 'ramon', 'grumpos'];
      // Pitch comes from the LIVE frame width, so the line-up spreads as the
      // frame opens instead of sitting at a fixed spacing inside a moving box.
      // 64 rather than 72, tuned when this row held chompo's flame trail and
      // mochi's ears — both far wider than 0.6x their height, so the pair that
      // touched was not the pair the pitch maths predicted. Both have since
      // left the row (Clara is no wider than the humanoids around her), so 64
      // is now margin rather than necessity; kept, because eight units off
      // every hero costs nothing visible.
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
      const rollCall = this.panel === 3;
      heroes.forEach((h, i) => {
        // They arrive one at a time, left to right, over about a second — a
        // roll call rather than a group photo that was always there. Each pops
        // in on its own short ease with a bulge past full size at the midpoint
        // and a rise from below, so the landing reads as weight rather than a
        // fade. Anyone whose turn has not come yet simply is not drawn.
        const start = rollCall ? 0.3 + i * 0.25 : 0;
        const a = rollCall ? Math.min(1, Math.max(0, (this.panelT - start) / 0.22)) : 1;
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
    const block = this.block(this.beatIndex);
    drawCascade(ctx, block, INTRO_TEXT_TOP, INTRO_TEXT_BOTTOM - INTRO_TEXT_TOP,
      '#e8e8f0', this.subtitleReveal(), this.subtitleOpacity());
    if (this.awaitingClose) {
      drawTextCentered(ctx, 'TAP OR PRESS ENTER TO CLOSE', W / 2, H - 16, '#8a8492', 1);
    }
  }
}

// THE BRIEFING MANIFEST: a full-black establishment screen before every
// stage. The MISSION line carries the real information; the memo blocks are
// letterhead comedy. Touch advances in one tap; keyboard can still use one press
// to complete the typewriter and a second to proceed.
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
const PORTRAIT_BRIEF_SIDE_MARGIN_CSS = 22;
const PORTRAIT_BRIEF_FOOTER_LAST_MID_CSS = 52;
const PORTRAIT_BRIEF_CALIBRATE_LAST_MID_CSS = 104;
const PORTRAIT_BRIEF_CALIBRATE_POINTER_TOP_CSS = 132;
const PORTRAIT_BRIEF_CALIBRATE_POINTER_BOTTOM_CSS = 78;
// Portrait has enough vertical room to show the memo, so do not let the
// desktop-style four-line safety cap turn a long interruption into a fake
// ellipsis. The height fit below still scales a genuinely dense briefing down.
const PORTRAIT_BRIEF_MAX_LINES = 32;
// The AUDIO SYNC row's tap band, around its drawn middle at H - 35. Everything
// outside it — every other pixel of the briefing — is the PLAY target.
const CALIBRATE_ROW_TOP = H - 44;
const CALIBRATE_ROW_BOTTOM = H - 26;

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
  static portraitMode = 'frame';

  constructor({ cab, stage, onDone, askCalibrate = false, onCalibrate = null, settings = null }) {
    this.cab = cab;
    this.stage = stage;
    this.onDone = onDone;
    // The AUDIO SYNC offer, on every rhythm briefing. It hangs here rather than
    // at NEW GAME because a latency question asked before the player has heard
    // a note is a question about nothing, and it repeats because headphones do:
    // a number measured on the laptop speaker is the wrong number on the bus,
    // and the screen in front of the stage is where that is worth noticing.
    this.askCalibrate = !!askCalibrate && !!onCalibrate;
    this.onCalibrate = onCalibrate;
    this.settings = settings;
  }
  /**
   * Before a first calibration the row names itself; afterwards it shows the
   * number in force. A player who has already set one is not looking for the
   * word CALIBRATE, they are checking whether the figure is still right.
   */
  calibrateLabel() {
    const s = this.settings;
    if (!s || !s.audioSyncAsked) return 'CALIBRATE AUDIO SYNC (WIRELESS HEADPHONES)';
    const ms = clampAudioSyncMs(s.audioSyncMs);
    return `AUDIO SYNC: ${ms > 0 ? '+' : ''}${ms} MS — RECALIBRATE`;
  }
  enter() {
    this.reveal = 0;
    this.t = 0;
    // PLAY preselected: a player who taps straight through — which is most of
    // them, on a card they have learned skips — must get the stage, not a
    // calibration screen they did not ask for.
    this.idx = 1;
    Input.setMenuButtons();
    this.pieces = [
      { head: null, text: `MISSION: ${this.stage.mission.desc}` },
      ...(BRIEFINGS[this.stage.id] || []),
    ];
    // The offer takes a row out of the memo's band rather than overlapping it.
    const band = (BRIEF_BOTTOM - BRIEF_TOP) - (this.askCalibrate ? 20 : 0);
    const steps = BRIEF_SCALES.map((s) => briefingLayout(this.pieces, s));
    this.layout = steps.find((l) => l.height <= band) || steps[steps.length - 1];
    // Centred in the band: a two-line mission pinned to the top of a black
    // screen reads as a rendering fault rather than as a title card.
    this.top = BRIEF_TOP + Math.max(0, (band - this.layout.height) / 2);
  }
  update(dt) {
    this.t += dt;
    this.reveal += dt;
    const acting = Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer');
    if (this.askCalibrate && this.landed()) {
      if (Input.pressed('up') || Input.pressed('down')
        || Input.pressed('left') || Input.pressed('right')) {
        this.idx = this.idx ? 0 : 1;
        Audio.sfx('ui');
      }
      if (Input.pressed('pointer')) {
        // Only the AUDIO SYNC row is a tap target of its own; the whole rest of
        // the screen means PLAY. The offer is a row of text at the bottom of a
        // briefing a thumb is already tapping through, and asking that thumb to
        // find an 18-unit band to get on with the stage made the common answer
        // the hard one. Missing the row now proceeds instead of doing nothing.
        const y = Input.pointer.y;
        if (isPhonePortraitPresentation()) {
          const frame = presentationFrame();
          const safe = frame.safeRect;
          const rowTop = safe.bottom - PORTRAIT_BRIEF_CALIBRATE_POINTER_TOP_CSS / frame.scale;
          const rowBottom = safe.bottom - PORTRAIT_BRIEF_CALIBRATE_POINTER_BOTTOM_CSS / frame.scale;
          this.idx = (y >= rowTop && y < rowBottom) ? 0 : 1;
        } else {
          this.idx = (y >= CALIBRATE_ROW_TOP && y < CALIBRATE_ROW_BOTTOM) ? 0 : 1;
        }
      }
      if (acting) { Audio.sfx('uiConfirm'); this.pick(); Input.endFrame(); return; }
      // BACK is the way past a question, and the way past this one is to play.
      if (Input.pressed('back')) { Audio.sfx('uiConfirm'); this.onDone(); }
      Input.endFrame();
      return;
    }
    if (Input.isTouchDevice() && acting) {
      // Touch is already an explicit continue gesture. Do not make a phone
      // player tap once to dismiss the typewriter and again to launch the run.
      this.reveal = CASCADE_ALL;
      Audio.sfx('uiConfirm');
      this.onDone();
      Input.endFrame();
      return;
    }
    if (acting) {
      // Keyboard keeps the two-step memo interaction: one press lands the copy,
      // and the next proceeds, which preserves the desktop read-through.
      if (!this.landed()) { this.reveal = CASCADE_ALL; Audio.sfx('ui'); }
      else { Audio.sfx('uiConfirm'); this.onDone(); }
    }
    if (Input.pressed('back')) { Audio.sfx('uiConfirm'); this.onDone(); }
    Input.endFrame();
  }
  pick() { if (this.idx === 0) this.onCalibrate(); else this.onDone(); }
  landed() { return cascadeDone(this.reveal, this.layout.lines.length); }
  draw(ctx) {
    if (isPhonePortraitPresentation()) {
      this.drawPortrait(ctx);
      return;
    }
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
    // The confirm line rides a size up on touch: it is the one thing on the
    // screen a thumb has to act on, not just read.
    const promptS = Input.isTouchDevice() ? 1.25 : 1;
    const playLine = `[${confirmVerb()}]: ${BRIEFING_PROMPTS[this.cab.id] || 'PROCEED'}`;
    if (this.askCalibrate && done) {
      // Only the selected row blinks. Two blinking rows read as one flashing
      // screen, and neither of them reads as the thing about to happen.
      const blink = Math.floor(this.t * 2) % 2 === 0;
      const dim = '#5a5a68';
      const rows = [
        [0, this.calibrateLabel(), textYForMid(H - 35, promptS)],
        [1, playLine, textYForMid(H - 16, promptS)],
      ];
      for (const [i, text, y] of rows) {
        const on = this.idx === i;
        if (on && !blink) continue;
        drawTextCentered(ctx, text, W / 2, y, on ? '#c8c8d8' : dim, promptS);
      }
      return;
    }
    if (!done || Math.floor(this.t * 2) % 2 === 0) {
      drawTextCentered(ctx, playLine, W / 2, textYForMid(H - 16, promptS),
        done ? '#c8c8d8' : '#5a5a68', promptS);
    }
  }

  drawPortrait(ctx) {
    const frame = presentationFrame();
    const safe = frame.safeRect;
    const css = (n) => n / frame.scale;
    // Portrait briefing copy is a reading surface, not HUD garnish. Keep it
    // off the curved glass with a real physical gutter, then let the extra
    // width budget come back as a larger face instead of a single clipped
    // footer line.
    const center = (safe.left + safe.right) / 2;
    const margin = css(PORTRAIT_BRIEF_SIDE_MARGIN_CSS);
    // Leave a little more bottom padding under the enlarged title before the
    // mission starts; the heading should read as its own card label.
    const bodyTop = safe.top + css(84);
    const bodyBottom = safe.bottom - css(this.askCalibrate ? 172 : 104);
    const width = Math.max(css(180), safe.width - margin * 2);
    const source = this.pieces || [];
    const words = source.map((p) => p.head ? `${p.head} ${p.text}` : p.text);
    // The old 13px physical cap-height was still caption-sized on a phone.
    // This target gives the mission and memo copy the weight of the screen's
    // main instruction while the line count remains comfortable in portrait.
    let scale = Math.max(2.35, Math.min(3.25, 15.5 / (TEXT_INK_H * frame.scale)));
    let lines = words.flatMap((text) => wrapText(text, width, scale, PORTRAIT_BRIEF_MAX_LINES));
    let lineH = 10.5 * scale;
    if (lines.length * lineH > bodyBottom - bodyTop) {
      scale = Math.max(1.15, scale * (bodyBottom - bodyTop) / (lines.length * lineH));
      lines = words.flatMap((text) => wrapText(text, width, scale, PORTRAIT_BRIEF_MAX_LINES));
      lineH = 10.5 * scale;
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const headingText = `STAGE ${this.stage.index} BRIEFING`;
    // Title is the largest thing on the card, but its fit is measured against
    // the same padded glass as the body so it never becomes a one-line crop.
    const headingWidth = Math.max(css(180), safe.width - margin * 2);
    const headingScale = headingWidth / Math.max(1, textWidth(headingText, 1, 'title'));
    drawTextCentered(ctx, headingText, center,
      safe.top + css(28), '#e8e8f0', headingScale, 'title');
    const revealed = Math.min(this.reveal / 0.02, lines.join(' ').length);
    let chars = 0;
    lines.forEach((line, i) => {
      const alpha = revealed >= chars ? 1 : 0;
      if (alpha) drawTextCentered(ctx, line, center, bodyTop + i * lineH,
        i === 0 ? '#48e0c8' : '#c8c8d8', scale);
      chars += line.length + 1;
    });
    const promptS = Math.max(2.1, Math.min(3, 15 / (TEXT_INK_H * frame.scale)));
    const playLine = `[${confirmVerb()}]: ${BRIEFING_PROMPTS[this.cab.id] || 'PROCEED'}`;
    const promptWidth = Math.max(css(180), safe.width - margin * 2);
    const promptLineH = 10.5 * promptS;
    const drawPromptBlock = (text, lastMid, color) => {
      const promptLines = wrapText(text, promptWidth, promptS, 2);
      promptLines.forEach((line, i) => {
        drawTextCentered(ctx, line, center,
          textYForMid(lastMid - (promptLines.length - 1 - i) * promptLineH, promptS),
          color, promptS);
      });
    };
    if (this.askCalibrate && this.landed()) {
      drawPromptBlock(this.calibrateLabel(), safe.bottom - css(PORTRAIT_BRIEF_CALIBRATE_LAST_MID_CSS),
        this.idx === 0 ? '#c8c8d8' : '#5a5a68');
      drawPromptBlock(playLine, safe.bottom - css(PORTRAIT_BRIEF_FOOTER_LAST_MID_CSS),
        this.idx === 1 ? '#c8c8d8' : '#5a5a68');
    } else if (!this.landed() || Math.floor(this.t * 2) % 2 === 0) {
      // Acknowledgement copy is deliberately allowed two lines. The old
      // single line was wider than the physical glass, so its first and last
      // words disappeared into the iPhone's curved corners.
      drawPromptBlock(playLine, safe.bottom - css(PORTRAIT_BRIEF_FOOTER_LAST_MID_CSS),
        this.landed() ? '#c8c8d8' : '#5a5a68');
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
// An overtime curtain call caps at this many heroes regardless of how long the
// baton has been running — see ResultsState.celebrateTeam.
const RESULT_CELEBRATE_MAX = 4;
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
// The portrait hero tube is the inside of a CRT, so give the glass the classic
// 4:3 screen proportion instead of inheriting the landscape game's widescreen
// tube. The portrait layout can spend its extra vertical room on the picture.
const PORTRAIT_TUBE_ASPECT = 4 / 3;
const PORTRAIT_TUBE_SIDE_MARGIN_CSS = 28;
const PORTRAIT_RESULT_TUBE_BOTTOM_GAP_CSS = 118;
let tubeGlow = null;
let tubeWash = null;

function portraitResultTubeBox(frame = presentationFrame()) {
  const safe = frame?.safeRect || { left: 0, right: W, top: 0, bottom: H };
  const css = (n) => n / (frame?.scale || 1);
  const side = css(PORTRAIT_TUBE_SIDE_MARGIN_CSS);
  const footerMid = safe.bottom - css(23);
  const bottom = footerMid - css(PORTRAIT_RESULT_TUBE_BOTTOM_GAP_CSS);
  const w = Math.max(css(220), safe.width - side * 2);
  const h = w / PORTRAIT_TUBE_ASPECT;
  return {
    x: safe.left + side,
    y: bottom - h,
    w,
    h,
    r: Math.min(css(30), h * 0.18),
  };
}

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

// The phone has enough vertical room to give the curtain call two separate
// surfaces: a reading band above, and a 4:3 CRT tube for the cast below. Keep
// this path local to the results card instead of stretching the landscape tube
// over the whole tall frame — the copy feels like a poster
// mounted above the CRT, while the hero party stays inside the same screen shape
// players see in landscape.
function portraitResultTubePath(ctx, box, fresh = true) {
  const x0 = box.x, y0 = box.y, x1 = box.x + box.w, y1 = box.y + box.h;
  const r = Math.min(box.r, box.w / 2, box.h / 2);
  if (fresh) ctx.beginPath();
  ctx.moveTo(x0 + r, y0);
  ctx.lineTo(x1 - r, y0);
  ctx.quadraticCurveTo(x1, y0, x1, y0 + r);
  ctx.lineTo(x1, y1 - r);
  ctx.quadraticCurveTo(x1, y1, x1 - r, y1);
  ctx.lineTo(x0 + r, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - r);
  ctx.lineTo(x0, y0 + r);
  ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.closePath();
}

function portraitResultTube(ctx, box) {
  const bezel = 5;
  const inner = {
    x: box.x + bezel, y: box.y + bezel,
    w: box.w - bezel * 2, h: box.h - bezel * 2,
    r: Math.max(4, box.r - bezel),
  };
  ctx.fillStyle = '#030309';
  portraitResultTubePath(ctx, box);
  ctx.fill();
  ctx.save();
  portraitResultTubePath(ctx, inner);
  ctx.clip();
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  const wash = ctx.createRadialGradient(
    inner.x + inner.w / 2, inner.y + inner.h * 0.38, 8,
    inner.x + inner.w / 2, inner.y + inner.h * 0.38, inner.w * 0.72,
  );
  wash.addColorStop(0, 'rgba(104,132,214,0.34)');
  wash.addColorStop(0.55, 'rgba(78,96,168,0.16)');
  wash.addColorStop(1, 'rgba(60,70,140,0)');
  ctx.fillStyle = wash;
  ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
  const glow = ctx.createLinearGradient(0, inner.y + inner.h, 0, inner.y + inner.h * 0.52);
  glow.addColorStop(0, 'rgba(255,168,88,0.18)');
  glow.addColorStop(1, 'rgba(255,168,88,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(inner.x, inner.y + inner.h * 0.45, inner.w, inner.h * 0.55);
  // The landscape tube's texture is intentionally repeated here at the
  // panel's own scale. It lands under the sprites, so the CRT reads as glass
  // around the team without turning their faces into a dim scanline mesh.
  // Use broad bands here: at portrait phone scale, a dense 3u texture blends
  // into a flat grey wash. The 7u cadence keeps the CRT read visible without
  // competing with the tiny character pixels.
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  for (let y = inner.y; y < inner.y + inner.h; y += 7) ctx.fillRect(inner.x, y, inner.w, 1);
  ctx.fillStyle = 'rgba(150,180,255,0.07)';
  for (let y = inner.y + 2; y < inner.y + inner.h; y += 7) ctx.fillRect(inner.x, y, inner.w, 1);
  for (let i = 0; i < 360; i++) {
    const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const b = Math.abs(Math.sin(i * 78.233) * 24634.6345) % 1;
    ctx.fillStyle = `rgba(190,205,255,${0.025 + a * 0.055})`;
    ctx.fillRect(inner.x + a * inner.w, inner.y + b * inner.h, 1, 1);
  }
  ctx.restore();
  ctx.lineWidth = 1;
  portraitResultTubePath(ctx, box);
  ctx.strokeStyle = 'rgba(150,190,255,0.22)';
  ctx.stroke();
  portraitResultTubePath(ctx, inner);
  ctx.strokeStyle = 'rgba(150,190,255,0.10)';
  ctx.stroke();
  // A lit top seam makes the boundary unmistakable at phone size: everything
  // above it is the results poster, everything below it is the celebration
  // playing inside the tube.
  ctx.strokeStyle = 'rgba(190,215,255,0.22)';
  ctx.beginPath();
  ctx.moveTo(inner.x + inner.r, inner.y + 1.5);
  ctx.lineTo(inner.x + inner.w - inner.r, inner.y + 1.5);
  ctx.stroke();
  return inner;
}

function drawPortraitTubeParty(ctx, inner, shells) {
  ctx.save();
  portraitResultTubePath(ctx, inner);
  ctx.clip();
  drawParticles(ctx);
  for (const s of shells) {
    ctx.fillStyle = s.color;
    ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 3);
  }
  ctx.restore();
}

// A failed run used to end on a single CONTINUE that walked you to the food
// court, leaving the cabinet four screens away — so the cheapest thing a player
// could do after a loss was the most expensive one to ask for. The retry rows
// only appear on a loss: a clear ends on the curtain call, which is the flourish
// this screen is built around, and it stands where these rows would.
// Match the landscape pause plates: result actions are also deliberate,
// one-press decisions, so the compact row height made them feel too slight.
const RESULT_OPT_H = 26;
const RESULT_OPT_GAP = 4;
// The two ways out of a lost run, named once. Three draw paths render this pair
// — landscape, portrait failure, portrait legacy — and a label edited in one of
// them is a screen that disagrees with the other two.
//
// TRY AGAIN, not RUN IT AGAIN: shorter, and it says what the button does rather
// than commenting on it. At scale 1 it measures 53.5 against the old 71.5, which
// is what lets the pair sit side by side without shrinking the type.
const RESULT_OPTIONS = ['TRY AGAIN', 'BACK TO THE FOOD COURT'];
// SIDE BY SIDE in landscape, the same shape as the pause row, for the same
// reason given there: these are the answers to one question, not a list. The row
// takes the pause row's exact span (388 = 120*3 + 14*2) so the two screens line
// up, split into two plates rather than three. The long label measures 131.5 at
// scale 1 inside a 187-wide plate, so nothing has to shrink to fit.
const RESULT_OPT_GAP_X = 14;
const RESULT_OPT_ROW_W = 388;
const RESULT_OPT_W = (RESULT_OPT_ROW_W - RESULT_OPT_GAP_X) / 2;
// One row now, not two: the rows stand in the curtain call's place and reach
// down over the prompt line, and they name their own actions, so there is
// nothing left to prompt for. The height the second row used to take goes back
// to the ledger above (see bodyFloor).
const RESULT_OPT_TOP = RESULT_FOOTER_MID + TEXT_INK_H / 2 - RESULT_OPT_H;
// Portrait losses are a decision screen, not a ledger squeezed into the
// landscape footprint. These are CSS-sized so the plates stay genuinely large
// as the logical frame changes with the phone's aspect ratio.
const PORTRAIT_FAIL_BUTTON_H_CSS = 84;
const PORTRAIT_FAIL_BUTTON_GAP_CSS = 14;
const PORTRAIT_RESULT_EDGE_MARGIN_CSS = 20;
const PORTRAIT_RESULT_CONTENT_MARGIN_CSS = 20;
const PORTRAIT_RESULT_CARD_TOP_CSS = 20;
export class ResultsState {
  static portraitMode = 'frame';

  constructor({ result, gains, save, onDone, onRetry }) {
    this.result = result; this.gains = gains; this.save = save; this.onDone = onDone;
    // No retry offered (overtime's seed is the day's, not the run's) falls back
    // to the plain prompt rather than drawing a row that cannot fire.
    this.onRetry = onRetry || null;
  }
  // Not on a quit. The player just pressed EXIT, so offering them the choice
  // again — with TRY AGAIN sitting under the cursor — argues with the thing they
  // already decided.
  get retryable() { return !!this.onRetry && !this.result.success && this.result.reason !== 'QUIT'; }
  // Overtime never sets result.success — it only ever ends in a death — so a
  // beaten time record is the one way a loss screen still gets the party. Gated
  // on newBestTime, which applyResult only sets for an on-record run: the back
  // room's seed is a fresh roll every entry, the same reason it never writes
  // slot.overtime.bestTime, so it never earns the curtain call either.
  get celebrating() { return this.result.success || (this.result.overtime && this.result.newBestTime); }
  // Who takes the bow. A real clear's team is a handful of relay tags at most,
  // so it prints whole. An overtime run can drag the same baton through the
  // entire cast before it ends, and nobody needs to watch all eight line up —
  // just whoever was actually running it home.
  get celebrateTeam() {
    const r = this.result;
    if (!r.team || !r.team.length) return [];
    if (r.success) return r.team;
    if (this.celebrating) return r.team.slice(-RESULT_CELEBRATE_MAX);
    return [];
  }
  enter() {
    this.t = 0; this.shown = 0; this.idx = 0;
    this.shells = [];       // rising mortars; they burst at the top of their arc
    this.shellT = 0.25;     // first one goes up almost immediately
    this.streamerT = 0;
    this.lastBurst = null;
    clearParticles();
    Input.setMenuButtons();
    Audio.sfx(this.celebrating ? 'win' : 'lose');
  }
  // Fireworks over the celebration row, plus streamers tumbling down the
  // frame. Losses get neither — a quiet screen is part of the joke — unless
  // the loss just beat the overtime clock, which earns the same party a clear does.
  updateParty(dt) {
    if (!this.celebrating) return;
    const portrait = isPhonePortraitPresentation();
    const portraitTube = portrait ? portraitResultTubeBox() : null;
    const portraitFrame = portrait ? presentationFrame() : null;
    const portraitCss = portraitFrame ? (n) => n / (portraitFrame.scale || 1) : null;
    this.shellT -= dt;
    if (this.shellT <= 0) {
      this.shellT = 0.55 + Math.random() * 0.7;
      const x = portraitTube
        ? portraitTube.x + portraitCss(24)
          + Math.random() * Math.max(1, portraitTube.w - portraitCss(48))
        : 40 + Math.random() * (W - 80);
      const fuse = portraitTube ? 0.72 + Math.random() * 0.14 : 0.85 + Math.random() * 0.3;
      this.shells.push({
        x,
        y: portraitTube
          ? portraitTube.y + portraitTube.h - portraitCss(18) : H + 6,
        vx: portraitTube ? (Math.random() - 0.5) * portraitCss(32) : (Math.random() - 0.5) * 24,
        // A portrait firework launches from the lower glass and needs a real
        // CRT-sized arc. The old full-canvas launch only reached the bottom
        // edge of the taller phone frame, so its burst was mostly clipped.
        vy: portraitTube
          ? -(portraitTube.h * (0.95 + Math.random() * 0.12))
          : -(230 + Math.random() * 50),
        fuse, color: PARTY_COLORS[(Math.random() * PARTY_COLORS.length) | 0],
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
        const options = isPhonePortraitPresentation()
          ? this.portraitOptions() : this.landscapeOptions();
        const i = options.findIndex((option) =>
          Input.pointer.x >= option.x && Input.pointer.x < option.x + option.w
          && Input.pointer.y >= option.y && Input.pointer.y < option.y + option.h);
        if (i >= 0) {
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
  ledgerRows() {
    const r = this.result;
    const rows = [];
    const line = (t, c) => { if (String(t).trim()) rows.push([t, c || '#c8c8d8']); };
    line(`COINS BANKED: +${formatCoins(this.gains.coins)}`, '#f6d33c');
    if (r.overtime) line(`TIME SURVIVED: ${formatRunTime(r.time)}`, '#48e0c8');
    if (r.newBestTime) line(`NEW RECORD! PREVIOUS: ${formatRunTime(r.prevBestTime)}`, '#f6d33c');
    if (r.newBestScore) line(r.success ? 'NEW BEST SCORE ON THIS STAGE!' : 'STILL A NEW BEST SCORE ON THIS STAGE.', r.success ? '#f6d33c' : '#8a8a98');
    if (r.stage) {
      const plugs = this.save.slot.campaign.plugs[r.stage.id] || [];
      // The plug marks are status, not multiplication signs: a tick means the
      // objective was earned, while a dash means it is still missing.
      line(`PLUGS: ${['MISSION', 'CHALLENGE', 'TOASTER'].map((n, i) => `${n} ${plugs[i] ? '✓' : '-'}`).join('  ')}`, '#48e0c8');
      if (this.gains.plugsNew > 0) line(`+${this.gains.plugsNew} NEW PLUG${this.gains.plugsNew > 1 ? 'S' : ''}`, '#48e0c8');
      else {
        const nxt = nextStage(r.stage);
        if (nxt && !stageUnlocked(this.save.slot, nxt)) line(`NO PLUGS. ${nxt.id.toUpperCase()} STAYS LOCKED.`, '#c05050');
      }
      if (r.rank) {
        const osha = this.save.slot.mods.equipped.includes('osha');
        line(`RANK: ${r.rank}${osha ? '*' : ''}`, r.rank === 'S' || r.rank === 'CONCERNING' ? '#f6d33c' : '#c8c8d8');
        line(RANK_LINES[r.rank] || '', '#8a8a98');
        if (osha) line('* THE BINDER IS DISAPPOINTED.', '#8a8a98');
      }
    }
    const mastery = this.gains.mastery || [];
    mastery.slice(0, 2).forEach((m) => line(`${m.heroId.toUpperCase()} MASTERY LEVEL ${m.level}!`, '#f890b8'));
    if (mastery.length > 2) line(`+${mastery.length - 2} MORE MASTERY-UPS. THE BENCH IS IMPRESSED.`, '#f890b8');
    return rows;
  }
  draw(ctx) {
    if (isPhonePortraitPresentation()) {
      this.drawPortrait(ctx);
      return;
    }
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
    const rows = this.ledgerRows();

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

    const team = this.celebrateTeam;
    if (team.length) {
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
      team.forEach((id, i) => drawToon(ctx, id,
        { kind: 'celebrate', grounded: true, menu: true, time: this.t + i * 0.35 },
        W / 2 + (i - (team.length - 1) / 2) * heroH * 1.5, heroFeet, heroH));
    }
    if (this.retryable) {
      // Retry sits first and starts selected: it is what the player came to this
      // screen wanting, and confirm-on-arrival should be the cheap thing.
      const options = this.landscapeOptions();
      RESULT_OPTIONS.forEach((label, i) => {
        const sel = i === this.idx;
        const b = options[i];
        drawPanel(ctx, b.x, b.y, b.w, b.h, 5, 'rgba(11,11,20,0.68)', {
          border: sel ? '#ffcf33' : 'rgba(255,255,255,0.30)', shadow: true,
        });
        if (sel) drawMenuRow(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 4,
          'rgba(201,160,255,0.18)');
        drawTextCentered(ctx, label, b.x + b.w / 2,
          textYForMid(b.y + b.h / 2, 1), sel ? '#c9a0ff' : '#c8c8d8', 1);
      });
    } else {
      drawTextCentered(ctx, `${confirmVerb()} TO CONTINUE`, W / 2, textYForMid(RESULT_FOOTER_MID, promptS), '#c8c8d8', promptS);
    }
  }

  landscapeOptions() {
    const rowW = Math.min(RESULT_OPT_ROW_W, W - TUBE_INSET_X * 2 - 12);
    const w = (rowW - RESULT_OPT_GAP_X) / 2;
    const x = (W - rowW) / 2;
    const y = RESULT_OPT_TOP;
    return [
      { x, y, w, h: RESULT_OPT_H },
      { x: x + w + RESULT_OPT_GAP_X, y, w, h: RESULT_OPT_H },
    ];
  }

  portraitOptions() {
    const frame = presentationFrame();
    const safe = frame.safeRect;
    const css = (n) => n / frame.scale;
    const h = css(PORTRAIT_FAIL_BUTTON_H_CSS);
    const gap = css(PORTRAIT_FAIL_BUTTON_GAP_CSS);
    const margin = css(PORTRAIT_RESULT_EDGE_MARGIN_CSS);
    const y = safe.bottom - h * 2 - gap - margin;
    return [
      { x: safe.left + margin, y, w: safe.width - margin * 2, h },
      { x: safe.left + margin, y: y + h + gap, w: safe.width - margin * 2, h },
    ];
  }

  drawPortrait(ctx) {
    const r = this.result;
    // The tube is the curtain call, so anything with heroes to frame gets it —
    // a real clear, or an overtime death that just beat the clock.
    if (this.celebrateTeam.length) {
      this.drawPortraitSuccess(ctx);
      return;
    }
    // Keep the loss/retry card's existing two-button contract. The portrait
    // CRT is the curtain call, where it has a team to frame.
    if (!r.success) this.drawPortraitFailure(ctx);
    else this.drawPortraitLegacy(ctx);
  }

  drawPortraitSuccess(ctx) {
    const frame = presentationFrame();
    const safe = frame.safeRect;
    const css = (n) => n / frame.scale;
    const r = this.result;
    const rows = this.ledgerRows();
    // This tube also frames an overtime death that beat the clock, which
    // never sets result.success — the headline still has to tell that apart
    // from a real clear.
    const title = r.success ? (r.boss ? 'BOSS DEFEATED' : 'STAGE COMPLETE') : (r.failMsg || 'UNPLUGGED');
    const center = (safe.left + safe.right) / 2;
    const margin = css(18);
    const textWidthLimit = Math.max(css(210), safe.width - margin * 2);
    const titleS = textWidthLimit / Math.max(1, textWidth(title, 1, 'title'));
    const scoreText = `SCORE: ${Math.floor(this.shown)}`;
    const footerMid = safe.bottom - css(23);
    const footerS = Math.min(2.3,
      textWidthLimit / Math.max(1, textWidth(`${confirmVerb()} TO CONTINUE`, 1)));
    // Lift the whole portrait CRT into the open band left by the spaced copy;
    // the footer keeps its own safe-frame anchor below it.
    // The portrait result is the CRT's 4:3 inner screen. On a phone the width
    // still sets the scale, while the taller glass gives the jumping cast room
    // to read as a picture rather than a stretched widescreen strip.
    const tubeBox = portraitResultTubeBox(frame);
    const wantedTubeTop = tubeBox.y;
    const bodyTop = safe.top + css(30);
    const textTubeGap = css(17);
    // Give each information tier its own air. These are CSS-sized gaps so the
    // separation stays generous on both the narrow phone and the tall review
    // canvas instead of collapsing with the render density.
    const titleGap = css(18);
    const detailLineGap = css(8);
    const detailScoreGap = css(16);
    const scoreLedgerGap = css(16);
    const ledgerLineGap = css(9);

    // Fit the copy first. A long plug ledger may wrap to two or three large
    // lines, and the tube gives up a little height for that before the type is
    // allowed to fall back to the small landscape scale.
    const buildTextLayout = (bodyS) => {
      const detailS = r.failDetail
        ? Math.min(2.55, bodyS * 0.82,
          textWidthLimit / Math.max(1, textWidth(r.failDetail, 1))) : 0;
      const detailLines = r.failDetail
        ? wrapText(r.failDetail, textWidthLimit, detailS, 2) : [];
      const scoreS = Math.min(3.8, bodyS + 0.35,
        textWidthLimit / Math.max(1, textWidth(scoreText, 1, 'bold')));
      const ledgerLines = rows.flatMap(([text, color]) =>
        wrapText(text, textWidthLimit, bodyS, 3).map((line) => [line, color]));
      const titleH = 11.5 * titleS;
      const detailH = detailLines.length
        ? detailLines.length * 10.5 * detailS
          + Math.max(0, detailLines.length - 1) * detailLineGap + detailScoreGap : 0;
      const scoreH = 10.5 * scoreS + scoreLedgerGap;
      const ledgerH = ledgerLines.length
        ? ledgerLines.length * 10.5 * bodyS
          + Math.max(0, ledgerLines.length - 1) * ledgerLineGap : 0;
      return {
        bodyS, detailS, detailLines, scoreS, ledgerLines,
        height: titleH + titleGap + detailH + scoreH + ledgerH,
      };
    };

    let textLayout = buildTextLayout(3.35);
    let tubeTop = wantedTubeTop;
    let available = tubeTop - bodyTop - textTubeGap;
    if (textLayout.height > available) {
      const fittedS = Math.max(1.85, textLayout.bodyS * available / textLayout.height);
      textLayout = buildTextLayout(fittedS);
      available = tubeTop - bodyTop - textTubeGap;
      if (textLayout.height > available) {
        textLayout = buildTextLayout(Math.max(1.55,
          textLayout.bodyS * available / textLayout.height));
      }
    }

    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, W, H);
    let y = bodyTop;
    drawTextCentered(ctx, title, center, y, r.success ? '#48c848' : '#ff6b6b', titleS, 'title');
    y += 11.5 * titleS + titleGap;
    if (textLayout.detailLines.length) {
      textLayout.detailLines.forEach((line, i) => {
        drawTextCentered(ctx, line, center, y, '#e8a0a0', textLayout.detailS);
        y += 10.5 * textLayout.detailS + (i < textLayout.detailLines.length - 1 ? detailLineGap : 0);
      });
      y += detailScoreGap;
    }
    drawTextCentered(ctx, scoreText, center, y, '#fff', textLayout.scoreS, 'bold');
    y += 10.5 * textLayout.scoreS + scoreLedgerGap;
    textLayout.ledgerLines.forEach(([line, color], i) => {
      drawTextCentered(ctx, line, center, y, color, textLayout.bodyS);
      y += 10.5 * textLayout.bodyS + (i < textLayout.ledgerLines.length - 1 ? ledgerLineGap : 0);
    });

    tubeBox.y = tubeTop;
    const inner = portraitResultTube(ctx, tubeBox);
    drawPortraitTubeParty(ctx, inner, this.shells);
    // Keep the jumping team close to the base of the glass. The CRT itself is
    // lifted above the footer, so the lower hero line can sit low without
    // colliding with the prompt.
    const heroFeet = inner.y + inner.h - css(18);
    const heroRoom = Math.max(css(50), heroFeet - inner.y - css(18));
    const pitchK = 1.15;
    const team = this.celebrateTeam;
    const widthK = team.length === 1 ? 1.05 : (team.length - 1) * pitchK + 1.05;
    const heroH = Math.min(heroRoom * 0.88,
      (inner.w - css(24)) / Math.max(1, widthK));
    // The landscape curtain call lets confetti spill over the glass, but the
    // hero line is the picture on the tube. Clip the portrait party to the
    // inner glass so the phone version preserves that screen read rather than
    // growing characters over the bezel.
    ctx.save();
    portraitResultTubePath(ctx, inner);
    ctx.clip();
    team.forEach((id, i) => drawToon(ctx, id,
      { kind: 'celebrate', grounded: true, menu: true, time: this.t + i * 0.35 },
      center + (i - (team.length - 1) / 2) * heroH * pitchK,
      heroFeet, heroH));
    ctx.restore();

    drawTextCentered(ctx, `${confirmVerb()} TO CONTINUE`, center,
      textYForMid(footerMid, footerS), '#c8c8d8', footerS);
  }

  drawPortraitFailure(ctx) {
    const frame = presentationFrame();
    const safe = frame.safeRect;
    const css = (n) => n / frame.scale;
    const r = this.result;
    const rows = this.ledgerRows();
    const center = (safe.left + safe.right) / 2;
    const margin = css(PORTRAIT_RESULT_CONTENT_MARGIN_CSS);
    const contentW = Math.max(1, safe.width - margin * 2);
    const options = this.retryable ? this.portraitOptions() : null;
    const buttonTop = options?.[0]?.y ?? safe.bottom - css(96);
    const copyTop = safe.top + css(PORTRAIT_RESULT_CARD_TOP_CSS + 16);
    const copyBottom = buttonTop - css(24);
    const title = r.failMsg || 'UNPLUGGED';
    // A failure headline should feel like a verdict. Keep it large and let a
    // long authored joke take two lines rather than shrinking it back to a
    // caption-sized sentence.
    const titleS = 3.7;
    const titleLines = wrapText(title, contentW, titleS, 2, 'title');
    const scoreText = `SCORE: ${Math.floor(this.shown)}`;
    const scoreS = Math.min(3.4,
      contentW / Math.max(1, textWidth(scoreText, 1, 'bold')));

    const buildLayout = (bodyS) => {
      const detailS = Math.min(2.55,
        contentW / Math.max(1, textWidth(r.failDetail || '', 1)));
      const detailLines = r.failDetail
        ? wrapText(r.failDetail, contentW, detailS, 2) : [];
      const ledgerLines = rows.flatMap(([text, color]) =>
        wrapText(text, contentW, bodyS, 2).map((line) => [line, color]));
      const titleLineGap = css(8);
      const detailLineGap = css(9);
      const titleGap = css(18);
      const detailScoreGap = css(20);
      const scoreLedgerGap = css(22);
      const ledgerLineGap = css(10);
      const titleH = titleLines.length * 11.5 * titleS
        + Math.max(0, titleLines.length - 1) * titleLineGap;
      const detailH = detailLines.length
        ? detailLines.length * 10.5 * detailS
          + Math.max(0, detailLines.length - 1) * detailLineGap
          + detailScoreGap : 0;
      const scoreH = 10.5 * scoreS + scoreLedgerGap;
      const ledgerH = ledgerLines.length
        ? ledgerLines.length * 10.5 * bodyS
          + Math.max(0, ledgerLines.length - 1) * ledgerLineGap : 0;
      return {
        bodyS, detailS, detailLines, ledgerLines,
        titleGap, scoreH, ledgerLineGap,
        height: titleH + titleGap + detailH + scoreH + ledgerH,
      };
    };

    // Keep the first choice generous even on the shortest supported phone. If
    // a particularly wordy loss has more ledger lines, spend a little of that
    // room before allowing the type to fall below the large-text floor.
    const available = Math.max(1, copyBottom - copyTop);
    let layout = buildLayout(2.35);
    if (layout.height > available) {
      layout = buildLayout(Math.max(1.85, layout.bodyS * available / layout.height));
    }

    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, W, H);
    const panelX = safe.left + css(PORTRAIT_RESULT_EDGE_MARGIN_CSS);
    const panelW = Math.max(1, safe.width - css(PORTRAIT_RESULT_EDGE_MARGIN_CSS * 2));
    const panelY = safe.top + css(PORTRAIT_RESULT_CARD_TOP_CSS);
    const panelH = Math.min(copyBottom - panelY, layout.height + css(36));
    drawPanel(ctx, panelX, panelY, panelW, panelH, 12, 'rgba(26,18,32,0.96)', {
      border: 'rgba(224,72,72,0.62)', shadow: true,
    });

    let y = copyTop;
    titleLines.forEach((line, i) => {
      drawTextCentered(ctx, line, center, y, '#ff6b6b', titleS, 'title');
      y += 11.5 * titleS + (i < titleLines.length - 1 ? css(8) : 0);
    });
    y += layout.titleGap;
    layout.detailLines.forEach((line, i) => {
      drawTextCentered(ctx, line, center, y, '#e8a0a0', layout.detailS);
      y += 10.5 * layout.detailS + (i < layout.detailLines.length - 1 ? css(9) : 0);
    });
    if (layout.detailLines.length) y += css(20);
    drawTextCentered(ctx, scoreText, center, y, '#fff', scoreS, 'bold');
    y += 10.5 * scoreS + css(22);
    layout.ledgerLines.forEach(([line, color], i) => {
      drawTextCentered(ctx, line, center, y, color, layout.bodyS);
      y += 10.5 * layout.bodyS + (i < layout.ledgerLines.length - 1 ? layout.ledgerLineGap : 0);
    });

    if (options) {
      const hint = Input.usingTouch
        ? 'TAP TO SELECT · TAP AGAIN TO CONFIRM'
        : `${confirmVerb()} TO CHOOSE · ARROWS TO MOVE`;
      drawTextCentered(ctx, hint, center, options[0].y - css(18), '#a8a0b0', 1.45, 'bold');
      RESULT_OPTIONS.forEach((label, i) => {
        const b = options[i];
        const sel = i === this.idx;
        const buttonLabelS = Math.min(2.65,
          (b.w - css(28)) / Math.max(1, textWidth(label, 1, 'bold')));
        drawPanel(ctx, b.x, b.y, b.w, b.h, 12, 'rgba(11,11,20,0.96)', {
          border: sel ? '#ffcf33' : i === 0 ? 'rgba(224,72,72,0.78)' : 'rgba(255,255,255,0.30)',
          shadow: true,
        });
        if (sel) drawMenuRow(ctx, b.x + 3, b.y + 3, b.w - 6, b.h - 6, 9,
          'rgba(201,160,255,0.18)');
        drawTextCentered(ctx, label, b.x + b.w / 2,
          textYForMid(b.y + b.h / 2, buttonLabelS, 'bold'),
          sel ? '#f0d8ff' : '#c8c8d8', buttonLabelS, 'bold');
      });
    } else {
      drawTextCentered(ctx, `${confirmVerb()} TO CONTINUE`, center,
        textYForMid(safe.bottom - css(24), 2.2), '#c8c8d8', 2.2);
    }
  }

  drawPortraitLegacy(ctx) {
    const frame = presentationFrame();
    const safe = frame.safeRect;
    const css = (n) => n / frame.scale;
    const margin = css(12);
    const r = this.result;
    const rows = this.ledgerRows();
    const title = r.success ? (r.boss ? 'BOSS DEFEATED' : 'STAGE COMPLETE') : (r.failMsg || 'UNPLUGGED');
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, title, W / 2, safe.top + css(32), r.success ? '#48c848' : '#e04848', 2.15, 'title');
    if (r.failDetail) drawTextCentered(ctx, r.failDetail, W / 2, safe.top + css(58), '#e8a0a0', 1.2);
    drawTextCentered(ctx, `SCORE: ${Math.floor(this.shown)}`, W / 2, safe.top + css(88), '#fff', 1.7, 'bold');
    const options = this.retryable ? this.portraitOptions() : null;
    const bodyTop = safe.top + css(112);
    const bodyBottom = options ? options[0].y - css(14) : safe.bottom - css(68);
    const widest = rows.reduce((m, [text]) => Math.max(m, textWidth(text, 1)), 1);
    let scale = Math.max(1.7, Math.min(2.45,
      13 / (TEXT_INK_H * frame.scale),
      (bodyBottom - bodyTop) / Math.max(1, rows.length * 12),
      (safe.width - margin * 2) / widest));
    const lineH = 12 * scale;
    let y = bodyTop;
    for (const [text, color] of rows) {
      const lines = wrapText(text, safe.width - margin * 2, scale, 3);
      for (const line of lines) {
        if (y + lineH > bodyBottom) break;
        drawTextCentered(ctx, line, W / 2, y, color, scale);
        y += lineH;
      }
    }
    if (r.success && r.team?.length && y + css(42) < bodyBottom) {
      const heroH = Math.min(css(42), Math.max(css(24), bodyBottom - y - css(8)));
      r.team.forEach((id, i) => drawToon(ctx, id,
        { kind: 'celebrate', grounded: true, menu: true, time: this.t + i * 0.35 },
        W / 2 + (i - (r.team.length - 1) / 2) * heroH * 1.35, y + heroH, heroH));
    }
    if (options) {
      RESULT_OPTIONS.forEach((label, i) => {
        const b = options[i];
        if (i === this.idx) drawMenuRow(ctx, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 8);
        drawTextCentered(ctx, label, b.x + b.w / 2, textYForMid(b.y + b.h / 2, 1.8),
          i === this.idx ? '#c9a0ff' : '#8a8a98', 1.8, 'bold');
      });
    } else {
      drawTextCentered(ctx, `${confirmVerb()} TO CONTINUE`, W / 2,
        textYForMid(safe.bottom - css(24), 1.8), '#c8c8d8', 1.8);
    }
  }
}

// Where the beats that carry art (Eggshell, the vacuum, the OVERTIME card)
// leave off, and where the beat counter starts.
const FINALE_ART_BOTTOM = 108;
const FINALE_ART_TOP = 24;
const FINALE_TEXT_BOTTOM = H - 30;
// The strip the closing beat holds back for HR's fine print, and how long the
// ending gets to sit on its own before the disclaimer lands on it. Long enough
// to read as a separate thought; short enough that nobody reaches for a button.
const FINALE_CODA_BAND = 40;
const FINALE_CODA_DELAY = 1.4;
const LAST_BEAT = FINALE_BEATS.length - 1;

// The curtain call is a beat like the others — one more index past the written
// ones — so skipping, the counter and the confirm contract all keep working
// without a second state machine bolted on beside them.
const CURTAIN = FINALE_BEATS.length;
const CURTAIN_MARGIN = 12;      // the row is eight wide; it needs every pixel
const CURTAIN_HERO_H = 44;
const CURTAIN_HERO_FEET = 158;
const CURTAIN_THANKS_TOP = 166;
const CURTAIN_THANKS_BAND = 40;
const CURTAIN_SIGNOFF_BAND = 28;
const CURTAIN_SIGNOFF_DELAY = 1.1;
// A player arrives here mid-mash, having just skipped the coda. Hold the button
// off long enough that the bow is seen rather than clicked through blind.
const CURTAIN_LOCK = 0.7;
const PORTRAIT_FINALE_SIDE_MARGIN_CSS = 16;
const PORTRAIT_FINALE_ART_TOP_CSS = 18;
const PORTRAIT_FINALE_ART_BOTTOM_RATIO = 0.64;
const PORTRAIT_FINALE_ART_GAP_CSS = 18;
const PORTRAIT_FINALE_TEXT_BOTTOM_CSS = 70;
const PORTRAIT_FINALE_CODA_BOTTOM_CSS = 108;

function finalePortraitBlock(text, { art = false, last = false } = {}) {
  const frame = presentationFrame();
  const safe = frame.safeRect;
  const css = (n) => n / frame.scale;
  const margin = css(PORTRAIT_FINALE_SIDE_MARGIN_CSS);
  const width = Math.max(css(180), safe.width - margin * 2);
  const artTop = safe.top + css(PORTRAIT_FINALE_ART_TOP_CSS);
  const artBottom = art
    ? safe.top + safe.height * PORTRAIT_FINALE_ART_BOTTOM_RATIO
    : artTop;
  const textTop = art ? artBottom + css(PORTRAIT_FINALE_ART_GAP_CSS) : safe.top + css(120);
  const textBottom = safe.bottom - css(last ? PORTRAIT_FINALE_CODA_BOTTOM_CSS : PORTRAIT_FINALE_TEXT_BOTTOM_CSS);
  const scales = [2.8, 2.5, 2.2, 1.95, 1.7];
  let scale = scales[scales.length - 1];
  let lines = typeLines(text, width, portraitMenuScale(scale), 0, 5);
  let lineH = 11 * portraitMenuScale(scale);
  for (const candidate of scales) {
    const candidateLines = typeLines(text, width, portraitMenuScale(candidate), 0, 5);
    const candidateLineH = 11 * portraitMenuScale(candidate);
    scale = candidate;
    lines = candidateLines;
    lineH = candidateLineH;
    if (candidateLines.length * candidateLineH <= textBottom - textTop) break;
  }
  return {
    lines,
    scale,
    lineH,
    height: lines.length * lineH,
    center: (safe.left + safe.right) / 2,
    width,
    artLeft: safe.left + margin,
    artW: width,
    artTop,
    artBottom,
    textTop,
    textBottom,
    safe,
    css,
  };
}

function finaleEggshellFace(t) {
  return {
    look: Math.sin(t * 0.8) * 0.45,
    mood: 'roll',
    blink: t % 3.8 > 3.62 ? 1 : 0,
    twitch: [Math.sin(t * 2.7) * 0.25, Math.sin(t * 3.4 + 0.7) * 0.25],
  };
}

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
  static portraitMode = 'frame';

  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() {
    this.beat = 0; this.chars = 0; this.blocks = [];
    this.blockKey = null;
    this.codaT = 0; this.codaChars = 0; this.coda = null;
    this.t = 0;
    this.curtainT = 0; this.bowT = 0;
    this.signoffChars = 0; this.signoff = null; this.thanks = null;
    this.streamerT = 0; this.popT = 0.35;
    clearParticles();
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
    const portrait = isPhonePortraitPresentation();
    const key = portrait ? `portrait:${presentationFrame().revision}` : 'landscape';
    if (this.blockKey !== key) { this.blocks = []; this.blockKey = key; }
    if (!this.blocks[i]) {
      const { top, bottom } = this.layout(i);
      this.blocks[i] = portrait
        ? finalePortraitBlock(FINALE_BEATS[i], { art: this.layout(i).art, last: i === LAST_BEAT })
        : fitProse(FINALE_BEATS[i], W - 56, bottom - top, TYPE_STEPS, i === LAST_BEAT ? 1 : Infinity);
    }
    return this.blocks[i];
  }
  codaBlock() {
    if (!this.coda) this.coda = fitProse(FINALE_CODA, W - 56, FINALE_CODA_BAND, [1.25, 1]);
    return this.coda;
  }
  thanksBlock() {
    if (!this.thanks) this.thanks = fitProse(FINALE_THANKS, W - 56, CURTAIN_THANKS_BAND);
    return this.thanks;
  }
  signoffBlock() {
    if (!this.signoff) this.signoff = fitProse(FINALE_SIGNOFF, W - 56, CURTAIN_SIGNOFF_BAND, [1.25, 1]);
    return this.signoff;
  }
  // Confetti over the bow. Ribbons the whole time, pops on a loose timer — the
  // same two layers the results screen throws, at about half its rate: this one
  // has to sit under a sentence somebody is reading.
  updateParty(dt) {
    this.streamerT -= dt;
    if (this.streamerT <= 0) {
      this.streamerT = 0.16 + Math.random() * 0.14;
      spawnShard(
        Math.random() * W, -6,
        (Math.random() - 0.5) * 30, 24 + Math.random() * 30,
        5, PARTY_COLORS[(Math.random() * PARTY_COLORS.length) | 0],
        2 + Math.random() * 2, 5 + Math.random() * 4,
        (Math.random() - 0.5) * 9, 12,
      );
    }
    this.popT -= dt;
    if (this.popT <= 0) {
      this.popT = 1.1 + Math.random() * 0.9;
      const x = 60 + Math.random() * (W - 120);
      const y = 60 + Math.random() * 50;
      const color = PARTY_COLORS[(Math.random() * PARTY_COLORS.length) | 0];
      burst(x, y, 22, 105, 1.3, color, 4, 26);
      burst(x, y, 5, 38, 0.3, '#ffffff', 3, 16);
      Audio.sfx('coin', { pitch: 0.9 + Math.random() * 0.35 });
    }
  }
  // The bow types its thanks, waits, then files the fine print — the last beat's
  // shape exactly, so the ending and its curtain call read as one gesture.
  updateCurtain(dt) {
    this.curtainT += dt;
    this.chars += dt * 34;
    const done = this.chars >= FINALE_THANKS.length;
    if (done) {
      this.bowT += dt;
      if (this.bowT >= CURTAIN_SIGNOFF_DELAY) this.signoffChars += dt * 34;
    }
    this.updateParty(dt);
    updateParticles(dt);
    if (this.curtainT < CURTAIN_LOCK) return;
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      if (!done) this.chars = FINALE_THANKS.length;
      else if (this.signoffChars < FINALE_SIGNOFF.length) {
        this.bowT = CURTAIN_SIGNOFF_DELAY; this.signoffChars = FINALE_SIGNOFF.length;
      } else {
        this.beat++; Audio.sfx('uiConfirm');
        clearParticles();
        this.onDone();
      }
    }
  }
  update(dt) {
    this.t += dt;
    if (this.beat > CURTAIN) { Input.endFrame(); return; }
    if (this.beat === CURTAIN) { this.updateCurtain(dt); Input.endFrame(); return; }
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
        if (this.beat === CURTAIN) {
          // The story is over at the bow, not after it — a player who walks away
          // mid-curtain-call has still seen the ending, and OVERTIME should not
          // be held hostage to the last button press of the campaign.
          this.save.slot.campaign.storyFlags.sawEnding = true;
          this.save.persist();
          Audio.sfx('win');
        }
      }
    }
    Input.endFrame();
  }
  // ALL EIGHT, ONE ROW, THE ONLY TIME IT HAPPENS IN THE STORY.
  //
  // The relay's premise is that the arcade can render one hero at a time, so
  // every stage screen and every beat above this one has held at most a single
  // toon. The bow spends that rule: the cast lines up, out of phase with each
  // other so the row reads as a crowd rather than a metronome (see the results
  // curtain call, which does the same with whoever actually ran).
  drawCurtain(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawParticles(ctx);
    drawTextCentered(ctx, FINALE_THANKS_TITLE, W / 2, 54, '#f6d33c', 2, 'title');
    // Eight figures across 480px: the slot is what sets the size, not the other
    // way round, so nobody overlaps their neighbour on the widest hero.
    const slot = (W - CURTAIN_MARGIN * 2) / HEROES.length;
    const heroH = Math.min(CURTAIN_HERO_H, slot / 1.35);
    HEROES.forEach((h, i) => drawToon(ctx, h.id,
      { kind: 'celebrate', grounded: true, menu: true, time: this.t + i * 0.35 },
      CURTAIN_MARGIN + slot * (i + 0.5), CURTAIN_HERO_FEET, heroH));
    drawProse(ctx, this.thanksBlock(), CURTAIN_THANKS_TOP, CURTAIN_THANKS_BAND, '#e8e8f0', Math.floor(this.chars));
    // Same treatment as the coda one screen back, because it is the same joke:
    // the cast means the thanks, HR files a note about it.
    if (this.signoffChars > 0) {
      drawProse(ctx, this.signoffBlock(), CURTAIN_THANKS_TOP + CURTAIN_THANKS_BAND,
        CURTAIN_SIGNOFF_BAND, '#8a8a98', Math.floor(this.signoffChars));
    }
  }
  drawPortraitCurtain(ctx) {
    const frame = presentationFrame();
    const safe = frame.safeRect;
    const css = (n) => n / frame.scale;
    const center = (safe.left + safe.right) / 2;
    const margin = css(PORTRAIT_FINALE_SIDE_MARGIN_CSS);
    const width = Math.max(css(180), safe.width - margin * 2);
    const titleS = portraitMenuFit(FINALE_THANKS_TITLE, 3.2, width, 'title');
    const artTop = safe.top + css(84);
    const artBottom = safe.top + safe.height * 0.54;
    const artH = artBottom - artTop;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawParticles(ctx);
    portraitMenuTextCentered(ctx, FINALE_THANKS_TITLE, center,
      portraitMenuTextY(safe.top + css(42), titleS, 'title'), '#f6d33c', titleS, 'title');

    const columns = 4;
    const gapY = css(96);
    const heroH = Math.min(css(136), (artH - gapY) / 2, width / 4.15);
    const pitch = (width - heroH * 0.7) / (columns - 1);
    const castH = heroH * 2 + gapY;
    const castTop = artTop + Math.max(0, (artH - castH) / 2);
    HEROES.forEach((hero, i) => {
      const row = Math.floor(i / columns);
      const column = i % columns;
      const rowX = safe.left + margin + heroH * 0.35;
      const feet = castTop + (row + 1) * heroH + row * gapY;
      drawToon(ctx, hero.id,
        { kind: 'celebrate', grounded: true, menu: true, time: this.t + i * 0.35 },
        rowX + column * pitch, feet, heroH);
    });

    const thanksScale = 1.65;
    const thanksLines = typeLines(FINALE_THANKS, width, portraitMenuScale(thanksScale), 0, 4);
    const thanksLineH = 11 * portraitMenuScale(thanksScale);
    const thanksTop = artBottom + css(20);
    thanksLines.forEach((line, i) => {
      const shown = line.text.slice(0, Math.max(0, Math.floor(this.chars) - line.from));
      if (shown) portraitMenuTextCentered(ctx, shown, center,
        portraitMenuTextY(thanksTop + i * thanksLineH, thanksScale), '#e8e8f0', thanksScale);
    });
    if (this.signoffChars > 0) {
      const signoffScale = 1.25;
      const signoffLines = typeLines(FINALE_SIGNOFF, width, portraitMenuScale(signoffScale), 0, 2);
      const signoffLineH = 11 * portraitMenuScale(signoffScale);
      const signoffTop = safe.bottom - css(78) - (signoffLines.length - 1) * signoffLineH;
      signoffLines.forEach((line, i) => {
        const shown = line.text.slice(0, Math.max(0, Math.floor(this.signoffChars) - line.from));
        if (shown) portraitMenuTextCentered(ctx, shown, center,
          portraitMenuTextY(signoffTop + i * signoffLineH, signoffScale), '#8a8a98', signoffScale);
      });
    }
    portraitMenuTextCentered(ctx, `${this.beat + 1}/${CURTAIN + 1}`, center,
      portraitMenuTextY(safe.bottom - css(24), 1.25), '#8a8492', 1.25);
  }
  drawPortrait(ctx) {
    if (this.beat === CURTAIN) {
      this.drawPortraitCurtain(ctx);
      return;
    }
    const block = this.block(this.beat);
    const { center, artLeft, artW, artTop, artBottom, textTop, textBottom, safe } = block;
    const artH = Math.max(1, artBottom - artTop);
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    if (block.art && this.beat >= 1 && this.beat <= 5) {
      const copterSize = Math.min(artW * 0.8, artH * 0.86);
      const copterY = artTop + (artH - copterSize) / 2;
      drawEggshellCopterAt(ctx, center - copterSize / 2, copterY,
        copterSize, eggshellCopterFrame(this.t), finaleEggshellFace(this.t), this.t);
    } else if (this.beat === 6) {
      const propSize = Math.min(artW * 0.58, artH * 0.82);
      drawProp(ctx, 'dustdevil', center - propSize / 2, artBottom - propSize,
        propSize, propSize, Math.floor(this.t * 8));
    } else if (this.beat === LAST_BEAT) {
      const title = 'OVERTIME UNLOCKED';
      const titleS = portraitMenuFit(title, 2.8, artW, 'title');
      portraitMenuTextCentered(ctx, title, center,
        portraitMenuTextY(artTop + artH * 0.5, titleS, 'title'), '#8858c8', titleS, 'title');
    }

    const y0 = textTop + Math.max(0, (textBottom - textTop - block.height) / 2);
    block.lines.forEach((line, i) => {
      const shown = line.text.slice(0, Math.max(0, Math.floor(this.chars) - line.from));
      if (!shown) return;
      portraitMenuTextCentered(ctx, shown, center,
        portraitMenuTextY(y0 + i * block.lineH, block.scale), '#e8e8f0', block.scale);
    });
    if (this.beat === LAST_BEAT && this.codaChars > 0) {
      const codaScale = 1.35;
      const codaLines = typeLines(FINALE_CODA, block.width, portraitMenuScale(codaScale), 0, 2);
      const codaLineH = 11 * portraitMenuScale(codaScale);
      const codaTop = safe.bottom - block.css(68) - (codaLines.length - 1) * codaLineH;
      codaLines.forEach((line, i) => {
        const shown = line.text.slice(0, Math.max(0, Math.floor(this.codaChars) - line.from));
        if (shown) portraitMenuTextCentered(ctx, shown, center,
          portraitMenuTextY(codaTop + i * codaLineH, codaScale), '#8a8a98', codaScale);
      });
    }
    portraitMenuTextCentered(ctx, `${this.beat + 1}/${CURTAIN + 1}`, center,
      portraitMenuTextY(safe.bottom - block.css(24), 1.25), '#5a5a68', 1.25);
  }
  draw(ctx) {
    if (this.beat > CURTAIN) return;
    if (isPhonePortraitPresentation()) {
      this.drawPortrait(ctx);
      return;
    }
    if (this.beat === CURTAIN) { this.drawCurtain(ctx); this.drawCounter(ctx); return; }
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    if (this.beat >= 1 && this.beat <= 5) {
      const copterSize = 76;
      const copterY = FINALE_ART_TOP + (FINALE_ART_BOTTOM - FINALE_ART_TOP - copterSize) / 2;
      drawEggshellCopterAt(ctx, W / 2 - copterSize / 2, copterY,
        copterSize, eggshellCopterFrame(this.t), finaleEggshellFace(this.t), this.t);
    }
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
    this.drawCounter(ctx);
  }
  // The bow counts as a beat, so the tally counts it too — otherwise the last
  // written line reads as 9/9 and the screen after it looks like an overrun.
  drawCounter(ctx) {
    drawTextCentered(ctx, `${this.beat + 1}/${CURTAIN + 1}`, W / 2, H - 20, '#5a5a68');
  }
}

// FIELD GUIDE: every enemy, object, and pickup with its sprite and one line
// of truth. Color legend: red = avoid, teal = touch it, gold = collect.
// A page holds about ten rows. The ground-floor page had FOURTEEN and the last
// three were drawn past the bottom of a 270px screen — the burning barrel and
// the brazier were in the guide's source and had never once been on it, and the
// campfire sat under the footer. So the ground floor is split by what a thing
// DOES rather than padded out: things in the lane, things that stand still, and
// things that come at you.
const GUIDE_PAGES = [
  {
    title: 'HAZARDS: GROUND FLOOR', color: '#e04848', hint: 'RED = AVOID. JUMP THESE.',
    rows: [
      { s: 'cactus', name: 'THORN CACTUS', desc: 'RED AND PRICKLY. JUMP IT. BREAKABLE.' },
      { s: 'thistle', name: 'GIANT THISTLE', desc: 'ALL SPIKES, NO MANNERS. JUMP IT. BREAKABLE.' },
      { s: 'snowman', name: 'HOSTILE SNOWMAN', desc: 'COLD, CROSS, AND BREAKABLE. JUMP IT.' },
      { s: 'crate', name: 'CRATE', desc: 'WOOD. SOMETIMES STACKED. JUMP OR SMASH IT.' },
      { s: '_pipe', name: 'HYDRAULIC BOLLARD', desc: 'SEALED. UNBREAKABLE. JUMP IT.' },
      { s: 'barrel', name: 'BARREL', desc: 'ROLLS AT YOU. JUMP IT.' },
      { s: 'chair', name: 'OFFICE CHAIR', desc: 'ALSO ROLLS AT YOU. FASTER. JUMP IT.' },
      { s: '_gap', name: 'PIT', desc: 'A HOLE WHERE FLOOR SHOULD BE. JUMP IT.' },
      { s: 'tombstone', name: 'TOMBSTONE', desc: 'JUMP IT. RESPECTFULLY.' },
      { s: 'zombieWalk', name: 'ZOMBIE', desc: 'SHAMBLES TOWARD YOU. JUMP IT.' },
      // The one hazard in the game whose ONLY answer is the jump: nothing
      // breaks it, a boot meets the floor, and sliding into it still slips.
      { s: 'bananaPeel', name: 'BANANA PEEL', desc: 'ONLY THE JUMP. NO SMASHING, NO SLIDING.' },
    ],
  },
  {
    title: 'HAZARDS: STANDING STILL', color: '#e04848', hint: 'RED = AVOID. THEY DO NOT MOVE. THEY DO NOT NEED TO.',
    rows: [
      { s: 'popSpikes', name: 'SPIKE PLATE', desc: 'IN THE FLOOR. JUMP IT. NOTHING BREAKS IT.' },
      { s: 'floorSaw', name: 'FLOOR SAW', desc: 'ALSO IN THE FLOOR. ALSO UNBREAKABLE. JUMP IT.' },
      { s: 'campfire', name: 'CAMPFIRE', desc: 'IT JUST SITS THERE BURNING. JUMP IT.' },
      { s: 'fireBarrel', name: 'BURNING BARREL', desc: 'STANDS STILL. SHOOT IT OR JUMP IT. NO KICKING.' },
      { s: 'brazier', name: 'BRAZIER', desc: 'LIGHTS THE CRYPT. SHOOT IT OR JUMP IT. NO KICKING.' },
    ],
  },
  {
    // The animals were in the lane for a while before they were in the guide.
    // They are the only ground hazards that CLOSE on the hero, which is the one
    // fact the page has to teach — every line here is about speed.
    title: 'HAZARDS: ANIMALS', color: '#e04848', hint: 'RED = AVOID. THESE ONES COME TO YOU.',
    rows: [
      { s: 'dogBruiser', name: 'BRUISER', desc: 'LOW AND SLOW. THE ONE YOU CAN OUT-THINK.' },
      { s: 'dogSnarler', name: 'SNARLER', desc: 'CORPORATE SECURITY. WEARS A COLLAR. FASTER.' },
      { s: 'dogFeral', name: 'FERAL DOG', desc: 'LEAN AND STARVING. FASTER AGAIN.' },
      { s: 'catFury', name: 'FURY CAT', desc: 'SMALLEST AND FASTEST. IT IS NOT FLEEING ANYTHING.' },
      // The set piece. Its whole identity is the two words UNBREAKABLE and
      // JUMP, so the line says both and nothing else.
      { s: 'finishSnarler', name: 'GUARD DOG', desc: 'HOLDS THE FINISH. NOTHING KILLS IT. JUMP IT.' },
      { s: 'dogSign', name: 'BEWARE OF DOG', desc: 'A WARNING, NOT A HAZARD. RUN THROUGH IT.' },
    ],
  },
  {
    title: 'HAZARDS: AIRBORNE + WEIRD', color: '#e04848', hint: 'RED = AVOID. SLIDE UNDER OR DODGE THESE.',
    rows: [
      { s: 'drone', name: 'DRONE', desc: 'FLIES LOW. SLIDE; FERNWICK CAN SHIELD-ROLL.' },
      { s: 'drone', name: 'SHOOTER DRONE', desc: 'STAYS HIGH. DODGE ITS SHOTS INSTEAD.' },
      { s: '_shot', name: 'ENEMY SHOT', desc: 'RED MEANS DODGE. YELLOW MEANS ABOUT TO FIRE.' },
      { s: 'buzzbird', name: 'BUZZBIRD', desc: 'MID-AIR MENACE. DO NOT JUMP INTO IT.' },
      { s: 'icicle', name: 'ICICLE', desc: 'FALLS WHEN YOU GET CLOSE. WATCH ITS SHADOW.' },
      { s: 'beatBar', name: 'BEAT ARROWS', desc: 'UP MEANS JUMP. DO IT ON THE BEAT.' },
      { s: '_paper', name: 'PAPERWORK', desc: 'FLIES LOW. SLIDE. DO NOT SIGN IT.' },
      { s: 'cardboardMonster', name: 'BOX MONSTER', desc: 'CARDBOARD. STILL COUNTS. JUMP IT.' },
    ],
  },
  {
    title: 'TOUCH THESE ON PURPOSE', color: '#48e0c8', hint: 'TEAL = RUN INTO IT. IT IS FINE.',
    rows: [
      { s: '_qcrate', name: '!-CRATE', desc: 'FLOATS. TOUCH TO BREAK. DROPS COINS.' },
      { s: 'target', name: 'TARGET', desc: 'FLOATING TARGET. TOUCH TO DESTROY.' },
      { s: 'cardBox', name: 'CARD BOX', desc: 'RHYTHM STAGES. SHOOT ON THE BEAT; IT OPENS ON THE NEXT ONE.' },
      { s: 'printer', name: 'PRINTER', desc: 'SHOOTS PAPER. RAM IT TO BREAK IT.' },
      { s: 'switch', name: 'POWER BLOCK', desc: 'HOP INTO IT (OR SHOOT IT). A BRIDGE IS LAID OVER THE PIT BEHIND IT.' },
      { s: 'boostPad', name: 'BOOST PAD', desc: 'RUN OVER IT. GO UNREASONABLY FAST.' },
      { s: '_portal', name: 'HERO PORTAL', desc: 'RUN THROUGH TO TAG IN THE PREVIEWED HERO.' },
      { s: 'eggshellCopter', name: 'CLOWN-COPTER', desc: 'FLIES AHEAD. WHEN IT DROPS IN, JUMP AND BONK IT. HIT MISSIONS.' },
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
      { s: 'capStar', name: 'STAR', desc: 'SCORE MULTIPLIER. IT IS A STAR. THE TARGET IS THE RED ONE.' },
      { s: 'capAirJump', name: 'AIR JUMP', desc: 'ONE EXTRA AIR-JUMP. STACKS WITH KIKO AND THE CAPE.' },
      { s: 'capSpeed', name: 'SPEED BURST', desc: 'RUNS FASTER. THE SCENERY OBJECTS.' },
      { s: 'capLowGrav', name: 'LOW GRAVITY', desc: 'YOUR JUMPS GET BIGGER. PHYSICS FILES A COMPLAINT.' },
      { s: 'capUnpeel', name: 'UNPEELABLE', desc: 'RARE. HITS BOUNCE OFF. PITS STILL DO NOT CARE.' },
      { s: 'capRewind', name: 'REWIND', desc: 'RARE. YOUR NEXT MISTAKE UNDOES ITSELF. EVEN A PIT.' },
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
  static portraitMode = 'frame';

  constructor({ onDone, settings }) { this.onDone = onDone; this.settings = settings || {}; }
  // Paging already claims the whole screen (see update()), so BACK gets its
  // own carved-out corner.
  enter() { this.page = 0; this.t = 0; Input.setMenuButtons(); }
  update(dt) {
    this.t += dt;
    const n = GUIDE_PAGES.length;
    if (Input.pressed('right') || Input.pressed('down')) { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('left') || Input.pressed('up')) { this.page = (this.page + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer') && this.t > 0.3) {
      const p = Input.pointer;
      // BACK lives in the bottom-right corner (see draw()), carved out of the
      // otherwise screen-wide paging zones so leaving needs no other button.
      const backY = portraitMenuActive() ? portraitMenuSafeBottom(34) : H - 20;
      if (p.x > W - 56 && p.y > backY) { Audio.sfx('ui'); this.onDone(); }
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
      const h = 22, pw = portalArtWidth(h);
      const f = Math.floor(this.t * propFps(PORTAL_SPRITE)) % propFrames(PORTAL_SPRITE);
      drawProp(ctx, PORTAL_SPRITE, cx - pw / 2, top(h), pw, h, f);
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
      const frame = Math.floor(this.t * 11);
      drawProp(ctx, key, cx - d[0] / 2, top(d[1]), d[0], d[1], frame);
      return;
    }
    const spr = getSprite(key);
    if (spr) ctx.drawImage(spr, cx - Math.floor(spr.width / 2), top(spr.height));
  }
  draw(ctx) {
    if (portraitMenuActive()) {
      this.drawPortrait(ctx);
      return;
    }
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
    // and BACK — the corner tap zone update() carves out — gets its own label.
    //
    // isTouchDevice(), not usingTouch: usingTouch only turns true after a finger
    // has already landed, so a phone opening this screen cold was told to press
    // ESC — a key it does not have — until it tapped something.
    if (Input.isTouchDevice()) {
      drawTextCentered(ctx, `TAP L/R TO PAGE   ${this.page + 1}/${GUIDE_PAGES.length}`, W / 2, H - 14, '#5a5a68');
      drawText(ctx, 'BACK', W - 50, H - 18, '#f6d33c');
    } else {
      drawTextCentered(ctx, `< PREV   PAGE ${this.page + 1}/${GUIDE_PAGES.length}   NEXT >   ESC: BACK`, W / 2, H - 14, '#5a5a68');
    }
  }

  drawPortrait(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const p = GUIDE_PAGES[this.page];
    const safeTop = portraitMenuSafeTop();
    const safeBottom = portraitMenuSafeBottom();
    const titleMid = safeTop + 34;
    const titleS = portraitMenuFit('FIELD GUIDE', 2.35, W - 44, 'title');
    portraitMenuTextCentered(ctx, 'FIELD GUIDE', W / 2,
      portraitMenuTextY(titleMid, titleS, 'title'), '#fff', titleS, 'title');
    const pageTitleS = portraitMenuFit(p.title, 1.35, W - 44);
    portraitMenuTextCentered(ctx, p.title, W / 2,
      portraitMenuTextY(titleMid + 40, pageTitleS), p.color, pageTitleS);
    const hintS = portraitMenuFit(p.hint, 1.0, W - 44);
    portraitMenuTextCentered(ctx, p.hint, W / 2,
      portraitMenuTextY(titleMid + 70, hintS), '#8a8a98', hintS);

    const listTop = titleMid + 102;
    const footerMid = safeBottom - 17;
    const rowH = Math.max(70, Math.min(84,
      (footerMid - listTop - 24) / p.rows.length));
    p.rows.forEach((r, i) => {
      const rowMid = listTop + i * rowH + rowH / 2;
      // The guide's vector props are authored at tiny gameplay scale. Enlarge
      // the icon in portrait while keeping the text columns independent.
      ctx.save();
      ctx.translate(50, rowMid);
      ctx.scale(1.5, 1.5);
      this.drawIcon(ctx, r.s, 0, 0);
      ctx.restore();

      const nameS = portraitMenuFit(r.name, 1.12, 100, 'bold');
      portraitMenuText(ctx, r.name, 84,
        portraitMenuTextY(rowMid, nameS, 'bold'), p.color, nameS, 'bold');
      const descX = 194;
      const descW = W - descX - 18;
      const lines = portraitMenuWrap(r.desc, descW, 0.98, 3);
      const lineGap = 15;
      const firstMid = rowMid - (lines.length - 1) * lineGap / 2;
      lines.forEach((line, j) => portraitMenuText(ctx, line, descX,
        portraitMenuTextY(firstMid + j * lineGap, 0.98), '#c8c8d8'));
    });

    portraitMenuTextCentered(ctx,
      `TAP L/R TO PAGE   ${this.page + 1}/${GUIDE_PAGES.length}`,
      W / 2, portraitMenuTextY(footerMid, 1.0), '#5a5a68', 1.0);
    portraitMenuText(ctx, 'BACK', W - 58,
      portraitMenuTextY(footerMid, 1.0), '#f6d33c', 1.0);
  }
}

// SOUND TEST: the classic arcade jukebox. Every cabinet track + the hub theme.
export const JUKEBOX = [
  ...JUKEBOX_TRACKS,
  { name: 'MASHENSTEIN: THE MONSTER MIX', bank: MEGAMIX_THEME },
];
// The tempo a row reports is the one the song PLAYS at: the arrangement's when the
// mixing desk has retuned it, else the tempo it was written at. Read through the same
// seam the engine reads, so the list cannot disagree with what you are hearing.
const jukeboxBpm = (tr) => Math.round(bpmOf(tr.bank, trackIdOf(tr.bank)));
// Match Settings' finger-sized scrolling list. BACK stays fixed below the
// window so a long catalogue never shrinks the rows or pushes the exit target
// off-screen.
const JUKEBOX_TITLE_TOP = 12;
const JUKEBOX_STATUS_TOP = 39;
const JUKEBOX_BARS_BASE = 63;   // the level meter stands on this line
const JUKEBOX_TOP = 68;
const JUKEBOX_ROW = 23;
const JUKEBOX_ROW_MIN = 16;
const JUKEBOX_VISIBLE_ROWS = 6;
const JUKEBOX_BACK_TOP = 216;
const JUKEBOX_BACK_H = 25;
const JUKEBOX_LIST_GAP = 10;    // list bottom -> BACK row
const JUKEBOX_HINT_TOP = H - 14;
// Air between a device cutout and this screen's own ink. Portrait stretches Y
// by roughly 3x, so two logical px is a comfortable handful of real ones.
const JUKEBOX_SAFE_PAD = 2;
// Portrait fills the phone's height, so glyphs are drawn compressed in the
// logical canvas and the CSS fill expands them back out; they also get to be
// bigger, since a whole phone's worth of height is a lot of room for six rows.
const PORTRAIT_MENU_S = 1.9;
const LEFT_MENU_ITEM_S = 1.15;
const VISUAL_MENU_FADE = 0.30;
const VISUAL_GAP = 0.12;
const VISUAL_IN_TOTAL = 1.0;
const VISUAL_OUT_FADE = 0.20;
const VISUAL_OUT_GAP = 0.10;
const VISUAL_OUT_TOTAL = 0.45;

export class SoundTestState {
  // The listening/visualiser surface is deliberately usable in portrait. Its
  // list uses the same uniform frame and full-height rows as the other staff
  // menus; the visualiser itself still takes over the whole viewport when it
  // wakes. lifecycle.js reads this to decide the rotate overlay stays down here.
  static portraitMode = 'frame';

  // `tracks` defaults to the shipped jukebox, so every production route is the list it
  // always was. The dev menu passes a longer one to audition a song that lives on the
  // mixing desk rather than in the game — see src/dev/desk-songs.js.
  constructor({
    onDone, initialTrack = -1, startVisualiser = false, startVisualiserIndex = null,
    tracks = JUKEBOX,
  }) {
    this.onDone = onDone;
    this.tracks = tracks && tracks.length ? tracks : JUKEBOX;
    this.initialTrack = initialTrack;
    this.startVisualiserOnEnter = startVisualiser;
    this.startVisualiserIndex = Number.isInteger(startVisualiserIndex) ? startVisualiserIndex : null;
    // Vertical layout is re-measured against the device's safe area every frame
    // (see layout()); these are the letterboxed numbers it starts from.
    this.visibleRows = JUKEBOX_VISIBLE_ROWS;
    this.titleY = JUKEBOX_TITLE_TOP;
    this.statusY = JUKEBOX_STATUS_TOP;
    this.barsBase = JUKEBOX_BARS_BASE;
    this.hintY = JUKEBOX_HINT_TOP;
    this.listY = JUKEBOX_TOP;
    this.rowH = JUKEBOX_ROW;
    this.backY = JUKEBOX_BACK_TOP;
    this.backH = JUKEBOX_BACK_H;
    this.listStart = 0;
    this.pointerGesture = null;
    this.visualSwipe = null;
    this.idleT = 0;
    this.visualState = 'list'; // list -> in -> active -> out
    this.visualT = 0;
    this.visualiser = null;
    this.previousVisualiser = null;
    this.visualSwitchT = 0;
    this.labelT = 0;
    this.shownLabel = null;
    this.visualiserIndex = -1;
    this.lastVisualiserIndex = -1;
    this.fullscreenReady = false;
    this.actTok = 0;
  }
  enter() {
    // The list now uses the same uniform frame as Settings. Keeping the old
    // non-uniform jukebox flag here made glyphs soft and gave long labels a
    // narrower effective column than the rest of the staff screens.
    setJukeboxPortrait(false);
    // Sound Test can also be opened directly by the portrait hand-off, so do
    // not rely on TitleState.exit() to turn off title post-processing.
    setSceneGlow(false);
    this.layout();
    const initial = Number.isInteger(this.initialTrack) && this.initialTrack >= 0 && this.initialTrack < this.tracks.length
      ? this.initialTrack : -1;
    this.idx = initial >= 0 ? initial : 0;
    this.playing = initial;
    this.t = 0;
    this.listStart = 0;
    this.pointerGesture = null;
    this.visualSwipe = null;
    this.idleT = 0;
    this.visualState = 'list';
    this.visualT = 0;
    this.visualiser = null;
    this.previousVisualiser = null;
    this.visualSwitchT = 0;
    this.labelT = 0;
    this.visualiserIndex = -1;
    this.lastVisualiserIndex = -1;
    this.fullscreenReady = false;
    this.actTok = Input.activity;
    Audio.setBank(null);
    if (this.playing >= 0) {
      this.openTrack(this.playing);
      this.resetIdle();
      if (this.startVisualiserOnEnter) this.startVisualiser();
    }
    Input.setMenuButtons();
  }
  exit() {
    Audio.setBank(null);
    this.clearVisualiser();
    setJukeboxPortrait(false);
  }
  clearVisualiser() {
    setVisualiserFullscreen(false);
    this.visualState = 'list';
    this.visualT = 0;
    this.visualiser = null;
    this.previousVisualiser = null;
    this.visualSwitchT = 0;
    this.labelT = 0;
    this.shownLabel = null;
    this.visualiserIndex = -1;
    this.fullscreenReady = false;
    this.visualSwipe = null;
  }
  resetIdle() {
    this.idleT = this.playing >= 0 ? -(Audio.pendingStartDelay || 0) : 0;
    this.actTok = Input.activity;
    this.clearVisualiser();
  }
  startVisualiser() {
    if (this.playing < 0 || this.visualState !== 'list') return;
    const requested = this.startVisualiserIndex;
    this.startVisualiserIndex = null;
    this.visualiserIndex = requested == null
      ? pickVisualiser(this.lastVisualiserIndex, Math.random)
      : ((requested % VISUALISER_NAMES.length) + VISUALISER_NAMES.length) % VISUALISER_NAMES.length;
    this.lastVisualiserIndex = this.visualiserIndex;
    const seed = ((Math.random() * 0xffffffff) ^ (this.visualiserIndex * 0x9e3779b9)) >>> 0;
    this.visualiser = createVisualiser(this.visualiserIndex, seed, this.tracks[this.playing].bank);
    this.previousVisualiser = null;
    this.visualSwitchT = 0;
    this.labelT = 0;
    this.visualState = 'in';
    this.visualT = 0;
    this.fullscreenReady = false;
    this.actTok = Input.activity;
  }
  wakeVisualiser() {
    if (this.visualState === 'list') return false;
    this.visualState = 'out';
    this.visualT = 0;
    this.fullscreenReady = true;
    this.idleT = 0;
    // The wake gesture is intentionally consumed by this screen. The next
    // gesture belongs to the jukebox list and can stop/switch the song.
    this.actTok = Input.activity;
    return true;
  }
  switchVisualiser(delta) {
    if (!this.visualiser || this.visualState === 'out') return;
    const count = VISUALISER_NAMES.length;
    const next = (this.visualiserIndex + delta + count) % count;
    this.previousVisualiser = this.visualiser;
    this.visualiserIndex = next;
    const seed = ((Math.random() * 0xffffffff) ^ (next * 0x9e3779b9) ^ this.t * 1000) >>> 0;
    this.visualiser = createVisualiser(next, seed, this.tracks[this.playing]?.bank);
    this.visualSwitchT = 0.35;
    this.labelT = 0;
    this.actTok = Input.activity;
  }
  handleVisualiserSwipe() {
    // A touch on the full-screen visualiser is ambiguous until it either
    // travels horizontally or is released. Hold the activity token while the
    // finger is down so the visualiser does not wake on pointer-down; a tap
    // still wakes on release, while a completed swipe is consumed here.
    if (Input.pressed('pointer') && Input.usingTouch && this.visualState !== 'out') {
      this.visualSwipe = {
        startX: Input.pointer.x,
        startY: Input.pointer.y,
        moved: false,
      };
      this.actTok = Input.activity;
      return true;
    }
    const gesture = this.visualSwipe;
    if (!gesture) return false;
    if (Input.pointer.down) {
      const dx = Input.pointer.x - gesture.startX;
      const dy = Input.pointer.y - gesture.startY;
      // Use logical pixels so the same gesture feels consistent in the
      // letterboxed desktop view and portrait full-screen view.
      if (!gesture.moved && Math.abs(dx) >= 26 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        gesture.moved = true;
        this.switchVisualiser(dx < 0 ? 1 : -1);
      }
      return true;
    }
    // Pointer-up does not increment Input.activity. Explicitly consume the
    // release after a swipe, or wake for a stationary tap.
    this.visualSwipe = null;
    if (gesture.moved) {
      this.actTok = Input.activity;
    } else {
      this.wakeVisualiser();
    }
    return true;
  }
  visualiserInput() {
    return Input.activity !== this.actTok
      || Input.pressed('pointer') || Input.pressed('confirm') || Input.pressed('back')
      || Input.pressed('jump') || Input.pressed('ability') || Input.pressed('pause');
  }
  // Glyphs are drawn into a logical canvas that portrait then stretches
  // vertically, so text is pre-compressed by exactly that factor to come out
  // with normal proportions. Layout and painting both need the number.
  portraitTextYScale() {
    return screen.portraitFill
      ? screen.cssH / (H * Math.max(0.001, screen.scale)) : 1;
  }
  // This is the one screen whose canvas is stretched over the WHOLE phone, so
  // logical y=0 is the physical top edge — directly under a notch or Dynamic
  // Island, which was clipping the SOUND TEST title. screen.safe* reports what
  // the device itself says those cutouts take, so the header drops below the
  // island, BACK and the hint lift off the home indicator, and the rows absorb
  // the difference. Letterboxed (landscape, desktop) every inset reads 0 — the
  // cutouts sit out in the black margin — and this is the fixed layout the
  // screen has always had, to the pixel.
  layout() {
    // The fullscreen visualiser always composes in the original 480x270 field
    // — the renderer cover-crops that field to reach a portrait screen, the
    // same way tools/visualiser-entry.js does, rather than stretching the
    // scene into a tall, mostly-empty logical surface.
    setVisualiserViewport(270);
    if (portraitMenuActive()) {
      const safeTop = portraitMenuSafeTop();
      const safeBottom = portraitMenuSafeBottom();
      const footerY = safeBottom - 22;
      const itemCount = Math.min(this.tracks.length, 10);
      this.titleY = safeTop + 34;
      this.statusY = safeTop + 70;
      this.barsBase = safeTop + 99;
      this.listY = safeTop + 118;
      this.visibleRows = Math.max(1, itemCount);
      // Reserve a compact footer shelf first, then let up to ten album rows
      // take the rest of the phone. The two-line title/BPM stack still has
      // room to breathe, but no longer leaves a large unused lower band.
      this.backH = 60;
      this.backY = footerY - 18 - this.backH;
      this.rowH = Math.max(56, Math.min(96,
        (this.backY - this.listY - 12) / this.visibleRows));
      this.hintY = footerY;
      return;
    }
    const menuScale = screen.portraitFill ? PORTRAIT_MENU_S : 1;
    const yScale = this.portraitTextYScale();
    // Measured against the INK, not the glyph box: the box carries ascender and
    // descender slack a cutout is welcome to have.
    const titleInk = TEXT_INK_TOP * 2 * menuScale / yScale;
    const hintInk = (TEXT_INK_TOP + TEXT_INK_H) * menuScale / yScale;
    const drop = Math.max(0, screen.safeTop + JUKEBOX_SAFE_PAD - (JUKEBOX_TITLE_TOP + titleInk));
    const lift = Math.max(0, screen.safeBottom + JUKEBOX_SAFE_PAD - (H - JUKEBOX_HINT_TOP - hintInk));
    this.titleY = JUKEBOX_TITLE_TOP + drop;
    this.statusY = JUKEBOX_STATUS_TOP + drop;
    this.barsBase = JUKEBOX_BARS_BASE + drop;
    this.hintY = JUKEBOX_HINT_TOP - lift;
    this.listY = JUKEBOX_TOP + drop;
    this.backY = JUKEBOX_BACK_TOP - lift;
    this.backH = JUKEBOX_BACK_H;
    // Rows give up whatever the header gained and the footer kept, never
    // growing past the finger-sized height every other list uses.
    this.rowH = Math.min(JUKEBOX_ROW, Math.max(JUKEBOX_ROW_MIN,
      (this.backY - JUKEBOX_LIST_GAP - this.listY) / this.visibleRows));
  }
  /**
   * Put one track on the transport.
   *
   * A GAME track carries no mix and no arrangement of its own: `undefined` is exactly
   * what `setBank`'s own registry lookup means, so those rows behave as they always
   * did. A DESK song keeps both in its module rather than in `MIX`/`ARRANGEMENTS`, so
   * they are handed over explicitly — without them the game would play the right notes
   * with none of the balance and none of the section order.
   */
  openTrack(i) {
    const tr = this.tracks[i];
    if (!tr) { Audio.setBank(null); return; }
    // Sound Test is a listening surface: always play the first bar on the first pass,
    // even when gameplay normally skips into a song at its authored start marker.
    // Its repeat region stays armed, so only the initial entry differs.
    Audio.setBank(tr.bank, tr.mix, tr.arrangement, { startAtBeginning: true });
  }

  maxListStart() { return Math.max(0, this.tracks.length - this.visibleRows); }
  trackCounter(i) { return `${i + 1}.`; }
  keepSelectionVisible() {
    if (this.idx >= this.tracks.length) return;
    if (this.idx < this.listStart) this.listStart = this.idx;
    else if (this.idx >= this.listStart + this.visibleRows) this.listStart = this.idx - this.visibleRows + 1;
    this.listStart = Math.max(0, Math.min(this.maxListStart(), this.listStart));
  }
  pointerIndex(y) {
    if (y >= this.backY && y < this.backY + this.backH) return this.tracks.length;
    if (y < this.listY || y >= this.listY + this.visibleRows * this.rowH) return -1;
    const i = this.listStart + Math.floor((y - this.listY) / this.rowH);
    return i < this.tracks.length ? i : -1;
  }
  toggle(i) {
    if (this.playing === i) {
      this.playing = -1;
      Audio.setBank(null);
    } else {
      this.playing = i;
      this.openTrack(i);
    }
    this.resetIdle();
    Audio.sfx('uiConfirm');
  }
  done() {
    Audio.setBank(null);
    this.clearVisualiser();
    setJukeboxPortrait(false);
    this.onDone();
  }
  update(dt) {
    this.t += dt;
    // Rotating the phone or opening it in portrait moves every row, and taps are
    // resolved against these same numbers — re-measure before reading a pointer.
    this.layout();
    const n = this.tracks.length;
    const total = n + 1; // +1 for the trailing BACK row
    if (this.visualState !== 'list') {
      const swipeHandled = this.handleVisualiserSwipe();
      const previous = Input.pressed('left') || Input.pressed('up');
      const next = Input.pressed('right') || Input.pressed('down');
      if (this.visualState !== 'out' && (previous || next)) this.switchVisualiser(next ? 1 : -1);
      else if (!swipeHandled && this.visualiserInput()) this.wakeVisualiser();
      if (this.visualiser) this.visualiser.update(dt, Audio.musicAnalysis());
      // The megamix changes record without the jukebox switching preset, so the
      // corner tag is re-announced whenever the name it would print changes —
      // not only when the player asks for a different preset.
      const shownLabel = this.visualiser ? (this.visualiser.label || this.visualiser.name) : null;
      if (shownLabel !== this.shownLabel) {
        this.shownLabel = shownLabel;
        this.labelT = 0;
      }
      if (this.visualState !== 'out') this.labelT += dt;
      if (this.visualSwitchT > 0) {
        this.visualSwitchT = Math.max(0, this.visualSwitchT - dt);
        if (this.visualSwitchT === 0) this.previousVisualiser = null;
      }
      this.visualT += dt;
      if (this.visualState === 'in' && !this.fullscreenReady
        && this.visualT >= VISUAL_MENU_FADE + VISUAL_GAP) {
        // The menu has fully disappeared and the beat-sized gap is over. Only
        // now expand the canvas, while the frame is already a dark visualiser
        // field, so the menu never visibly zooms or crops.
        setVisualiserFullscreen(true);
        this.fullscreenReady = true;
      }
      if (this.visualState === 'out' && this.fullscreenReady
        && this.visualT >= VISUAL_OUT_FADE + VISUAL_OUT_GAP) {
        // Restore the normal letterboxed canvas before the menu starts its
        // return fade, making the reverse transition just as stable.
        setVisualiserFullscreen(false);
        this.fullscreenReady = false;
      }
      if (this.visualState === 'in' && this.visualT >= 1.0) {
        this.visualState = 'active';
        this.visualT = VISUAL_IN_TOTAL;
      } else if (this.visualState === 'out' && this.visualT >= VISUAL_OUT_TOTAL) {
        this.clearVisualiser();
      }
      Input.endFrame();
      return;
    }
    if (this.playing >= 0) {
      this.idleT += dt;
      if (this.idleT >= 5) this.startVisualiser();
    }
    if (Input.pressed('down') || Input.pressed('right')) {
      this.idx = (this.idx + 1) % total;
      this.keepSelectionVisible();
      this.resetIdle();
      Audio.sfx('ui');
    }
    if (Input.pressed('up') || Input.pressed('left')) {
      this.idx = (this.idx + total - 1) % total;
      this.keepSelectionVisible();
      this.resetIdle();
      Audio.sfx('ui');
    }
    if (Input.pressed('confirm')) {
      if (this.idx === n) this.done();
      else this.toggle(this.idx);
    }
    if (Input.pressed('pointer')) {
      const i = this.pointerIndex(Input.pointer.y);
      if (i >= 0) {
        if (Input.usingTouch) {
          this.pointerGesture = {
            startY: Input.pointer.y,
            startList: this.listStart,
            moved: false,
          };
        } else if (i === n) {
          this.done();
        } else if (this.idx === i) {
          this.toggle(i);
        } else {
          this.idx = i;
          this.resetIdle();
          Audio.sfx('ui');
        }
      }
    }
    if (this.pointerGesture && Input.pointer.down) {
      const dy = Input.pointer.y - this.pointerGesture.startY;
      if (Math.abs(dy) >= 8) this.pointerGesture.moved = true;
      if (this.pointerGesture.moved) {
        const rows = Math.round(-dy / this.rowH);
        this.listStart = Math.max(0, Math.min(this.maxListStart(), this.pointerGesture.startList + rows));
        this.idx = Math.max(this.listStart, Math.min(this.idx, this.listStart + this.visibleRows - 1));
      }
    } else if (this.pointerGesture && !Input.pointer.down) {
      const moved = this.pointerGesture.moved;
      this.pointerGesture = null;
      if (!moved) {
        const i = this.pointerIndex(Input.pointer.y);
        if (i === n) this.done();
        else if (i >= 0) {
          this.idx = i;
          this.toggle(i);
        }
      }
    }
    if (Input.pressed('back')) this.done();
    Input.endFrame();
  }
  drawList(ctx, alpha = 1) {
    if (portraitMenuActive()) {
      this.drawPortraitList(ctx, alpha);
      return;
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    this.layout();
    // Portrait jukebox mode fills the phone vertically. Compensate only the
    // glyphs for the non-uniform CSS fill; rows and bars are allowed to use
    // the extra height, while text retains its normal physical proportions.
    const portraitMenuScale = screen.portraitFill ? PORTRAIT_MENU_S : 1;
    const itemScale = LEFT_MENU_ITEM_S * portraitMenuScale;
    const textYScale = this.portraitTextYScale();
    const menuText = (text, x, y, color, size, font) => {
      const renderedSize = (size == null ? 1 : size) * portraitMenuScale;
      if (textYScale === 1) return drawText(ctx, text, x, y, color, renderedSize, font);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 1 / textYScale);
      drawText(ctx, text, 0, 0, color, renderedSize, font);
      ctx.restore();
    };
    const menuTextCentered = (text, x, y, color, size, font) => {
      const renderedSize = (size == null ? 1 : size) * portraitMenuScale;
      if (textYScale === 1) return drawTextCentered(ctx, text, x, y, color, renderedSize, font);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 1 / textYScale);
      drawTextCentered(ctx, text, 0, 0, color, renderedSize, font);
      ctx.restore();
    };
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const band = leftBand(this.tracks.map((tr, i) => `${this.trackCounter(i)} ${tr.name}  (${jukeboxBpm(tr)} BPM)`), itemScale);
    menuText('SOUND TEST', band.textX, this.titleY, '#fff', 2, 'title');
    const status = this.playing >= 0 ? `NOW PLAYING: ${this.tracks[this.playing].name}` : 'STOPPED';
    menuText(status, band.textX, this.statusY, this.playing >= 0 ? '#48e0c8' : '#5a5a68');
    this.tracks.forEach((tr, i) => {
      if (i < this.listStart || i >= this.listStart + this.visibleRows) return;
      const sel = i === this.idx;
      const on = i === this.playing;
      const rowTop = this.listY + (i - this.listStart) * this.rowH;
      if (sel) {
        const highlightY = rowTop + 1;
        const highlightH = this.rowH - 2;
        drawMenuRow(ctx, band.x, highlightY, band.w, highlightH);
      }
      const rowMid = rowTop + this.rowH / 2;
      if (screen.portraitFill) {
        const lineGap = itemScale * 2.6;
        // The glyphs are vertically compressed in the logical canvas and
        // expanded by the portrait CSS fill. Account for that once when
        // choosing the baseline, otherwise the ink lands high in the plate.
        const inkScale = itemScale / textYScale;
        const titleY = textYForMid(rowMid - lineGap / 2, inkScale);
        const bpmY = textYForMid(rowMid + lineGap / 2, inkScale);
        // Both lines share one left margin so the stack reads as a column.
        const titleX = band.textX + 6;
        menuText(`${this.trackCounter(i)} ${tr.name}`, titleX, titleY,
          on ? '#48e0c8' : sel ? '#c9a0ff' : '#c8c8d8', LEFT_MENU_ITEM_S);
        menuText(`(${jukeboxBpm(tr)} BPM)`, titleX, bpmY,
          on ? '#48e0c8' : sel ? '#c9a0ff' : '#8b8ba0', LEFT_MENU_ITEM_S);
      } else {
        const textY = textYForMid(rowMid);
        menuText(`${this.trackCounter(i)} ${tr.name}  (${jukeboxBpm(tr)} BPM)`, band.textX,
          textY, on ? '#48e0c8' : sel ? '#c9a0ff' : '#c8c8d8', LEFT_MENU_ITEM_S);
      }
    });
    if (this.tracks.length > this.visibleRows) {
      const trackY = this.listY + 4;
      const trackH = this.visibleRows * this.rowH - 8;
      const thumbH = Math.max(18, trackH * this.visibleRows / this.tracks.length);
      const thumbY = trackY + (trackH - thumbH) * this.listStart / this.maxListStart();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(W - 17, trackY, 2, trackH);
      ctx.fillStyle = 'rgba(72,224,200,0.55)';
      ctx.fillRect(W - 18, thumbY, 4, thumbH);
    }
    const backSelected = this.idx === this.tracks.length;
    if (backSelected) drawMenuRow(ctx, band.x, this.backY + 1, band.w, this.backH - 2);
    const backTextY = textYForMid(this.backY + this.backH / 2);
    menuText('BACK', band.textX, backTextY, backSelected ? '#c9a0ff' : '#c8c8d8', LEFT_MENU_ITEM_S);
    if (this.playing >= 0) {
      const bars = 12;
      for (let i = 0; i < bars; i++) {
        const hgt = 2 + Math.abs(Math.sin(this.t * 6 + i * 0.9)) * 7;
        ctx.fillStyle = '#48e0c8';
        ctx.fillRect(band.textX + i * 6, this.barsBase - hgt, 4, hgt);
      }
    }
    menuTextCentered(Input.isTouchDevice() ? 'TAP: PLAY/STOP   DRAG: SCROLL' : 'ENTER: PLAY/STOP   ESC: BACK',
      W / 2, this.hintY, '#5a5a68');
    ctx.restore();
  }
  drawPortraitList(ctx, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    this.layout();
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const titleX = 28;
    const titleS = portraitMenuFit('SOUND TEST', 2.35, W - 56, 'title');
    portraitMenuText(ctx, 'SOUND TEST', titleX,
      portraitMenuTextY(this.titleY, titleS, 'title'), '#fff', titleS, 'title');
    const status = this.playing >= 0 ? `NOW PLAYING: ${this.tracks[this.playing].name}` : 'STOPPED';
    const statusS = portraitMenuFit(status, 1.0, W - titleX - 28);
    portraitMenuText(ctx, status, titleX,
      portraitMenuTextY(this.statusY, statusS), this.playing >= 0 ? '#48e0c8' : '#5a5a68', statusS);

    const labels = this.tracks.map((tr, i) => `${this.trackCounter(i)} ${tr.name}`);
    const band = leftBand(labels, portraitMenuScale(1.35));
    this.tracks.forEach((tr, i) => {
      if (i < this.listStart || i >= this.listStart + this.visibleRows) return;
      const selected = i === this.idx;
      const rowTop = this.listY + (i - this.listStart) * this.rowH;
      if (selected) drawMenuRow(ctx, band.x, rowTop + 1, band.w, this.rowH - 2, 5);
      const rowMid = rowTop + this.rowH / 2;
      const label = `${this.trackCounter(i)} ${tr.name}`;
      const labelS = portraitMenuFit(label, 1.35, W - titleX - 30);
      const bpmText = `(${jukeboxBpm(tr)} BPM)`;
      const bpmS = portraitMenuFit(bpmText, 1.05, W - titleX - 30);
      const labelColor = this.playing === i ? '#48e0c8' : selected ? '#c9a0ff' : '#c8c8d8';
      portraitMenuText(ctx, label, titleX,
        portraitMenuTextY(rowMid - 14, labelS), labelColor, labelS);
      portraitMenuText(ctx, bpmText, titleX,
        portraitMenuTextY(rowMid + 16, bpmS), this.playing === i ? '#48e0c8' : selected ? '#c9a0ff' : '#8b8ba0', bpmS);
    });
    if (this.tracks.length > this.visibleRows) {
      const trackY = this.listY + 6;
      const trackH = this.visibleRows * this.rowH - 12;
      const thumbH = Math.max(28, trackH * this.visibleRows / this.tracks.length);
      const thumbY = trackY + (trackH - thumbH) * this.listStart / this.maxListStart();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(W - 14, trackY, 3, trackH);
      ctx.fillStyle = 'rgba(72,224,200,0.58)';
      ctx.fillRect(W - 16, thumbY, 7, thumbH);
    }
    const backSelected = this.idx === this.tracks.length;
    if (backSelected) drawMenuRow(ctx, 18, this.backY + 1, W - 36, this.backH - 2, 5);
    const backS = portraitMenuFit('BACK', 1.18, W - titleX - 30);
    portraitMenuText(ctx, 'BACK', titleX,
      portraitMenuTextY(this.backY + this.backH / 2, backS), backSelected ? '#c9a0ff' : '#c8c8d8', backS);
    if (this.playing >= 0) {
      for (let i = 0; i < 12; i++) {
        const hgt = 3 + Math.abs(Math.sin(this.t * 6 + i * 0.9)) * 10;
        ctx.fillStyle = '#48e0c8';
        ctx.fillRect(titleX + i * 7, this.barsBase - hgt, 5, hgt);
      }
    }
    portraitMenuTextCentered(ctx,
      Input.isTouchDevice() ? 'TAP: PLAY/STOP   SWIPE: SCROLL' : 'ENTER: PLAY/STOP   ESC: BACK',
      W / 2, portraitMenuTextY(this.hintY, 1.0), '#5a5a68', 1.0);
    ctx.restore();
  }
  draw(ctx) {
    if (this.visualState === 'list' || !this.visualiser) {
      this.drawList(ctx);
      return;
    }
    let visualAlpha = 1;
    let menuAlpha = 0;
    if (this.visualState === 'in') {
      menuAlpha = this.visualT < VISUAL_MENU_FADE
        ? 1 - smooth(clamp(this.visualT / VISUAL_MENU_FADE)) : 0;
      visualAlpha = this.visualT <= VISUAL_MENU_FADE + VISUAL_GAP
        ? 0 : smooth(clamp((this.visualT - VISUAL_MENU_FADE - VISUAL_GAP)
          / (VISUAL_IN_TOTAL - VISUAL_MENU_FADE - VISUAL_GAP)));
    } else if (this.visualState === 'out') {
      visualAlpha = this.visualT < VISUAL_OUT_FADE
        ? 1 - smooth(clamp(this.visualT / VISUAL_OUT_FADE)) : 0;
      menuAlpha = this.visualT <= VISUAL_OUT_FADE + VISUAL_OUT_GAP
        ? 0 : smooth(clamp((this.visualT - VISUAL_OUT_FADE - VISUAL_OUT_GAP)
          / (VISUAL_OUT_TOTAL - VISUAL_OUT_FADE - VISUAL_OUT_GAP)));
    }
    if (menuAlpha > 0) this.drawList(ctx, menuAlpha);
    else {
      ctx.fillStyle = '#0b0b14';
      ctx.fillRect(0, 0, W, H);
    }
    // Visuals and metadata live on the dedicated device-density overlay. This
    // makes the screensaver a true composited surface: the jukebox list fades
    // underneath it, and WebGL/2D get the same fade and layer ordering.
    const drawVisualSurface = (surface) => {
      surface.save();
      // `frameAlpha` travels with the context alpha. A preset is free to ASSIGN
      // globalAlpha mid-frame — a few do — and without being told the weight it
      // is being painted at, those parts of it punch straight through the fade
      // and the swipe-switch at full strength.
      const paint = (preset, alpha) => {
        surface.globalAlpha = alpha;
        preset.frameAlpha = alpha;
        preset.draw(surface);
        preset.frameAlpha = 1;
      };
      if (this.previousVisualiser && this.visualSwitchT > 0) {
        const switchP = 1 - this.visualSwitchT / 0.35;
        paint(this.previousVisualiser, visualAlpha * (1 - switchP));
        paint(this.visualiser, visualAlpha * switchP);
      } else {
        paint(this.visualiser, visualAlpha);
      }
      surface.restore();
      // Keep the screensaver metadata quiet and out of the way: the track hugs
      // the lower-left edge while the current preset balances it on the right.
      // A safe inset keeps both clear of rounded mobile display corners — plus
      // whatever the device reports for a notch or home indicator, since a
      // fullscreen visualiser reaches the physical screen edge the same way the
      // portrait list does. Those read 0 on hardware with nothing to dodge.
      const portraitLabels = visualiserFrame.bottom - visualiserFrame.top
        > (visualiserFrame.right - visualiserFrame.left) * 1.35;
      const labelScale = portraitLabels ? 1.05 : 0.82;
      const labelInset = portraitLabels ? 10 : 24;
      const trackLabel = this.tracks[this.playing]?.name || 'NOW PLAYING';
      const visualLabel = this.visualiser.label || this.visualiser.name;
      const safeLeft = visualiserFrame.left + labelInset + screen.safeLeft;
      const safeRight = visualiserFrame.right - labelInset - screen.safeRight;
      const trackWidth = textWidth(trackLabel, labelScale);
      const visualWidth = textWidth(visualLabel, labelScale);
      const maxWidth = Math.max(32, safeRight - safeLeft);
      const fitLabel = (label, width) => {
        if (width <= maxWidth) return label;
        const keep = Math.max(4, Math.floor(label.length * maxWidth / width) - 1);
        return `${label.slice(0, keep)}…`;
      };
      const fittedTrack = fitLabel(trackLabel, trackWidth);
      const fittedVisual = fitLabel(visualLabel, visualWidth);
      const fittedTrackWidth = textWidth(fittedTrack, labelScale);
      const fittedVisualWidth = textWidth(fittedVisual, labelScale);
      const trackX = portraitLabels ? Math.max(safeLeft, (safeLeft + safeRight - fittedTrackWidth) * 0.5) : Math.max(labelInset, safeLeft);
      const visualX = portraitLabels
        ? Math.max(safeLeft, (safeLeft + safeRight - fittedVisualWidth) * 0.5)
        : Math.min(W - labelInset - fittedVisualWidth, safeRight - fittedVisualWidth);
      const labelY = (portraitLabels
        ? Math.min(H - 25, visualiserFrame.bottom - 28)
        : Math.min(H - 14, visualiserFrame.bottom - 14)) - screen.safeBottom;
      const labelFade = 1 - smooth(clamp((this.labelT - 5) / 1));
      surface.save();
      surface.globalAlpha = visualAlpha * labelFade * 0.92;
      drawText(surface, fittedTrack, trackX + 1, labelY + 1, '#02030a', labelScale);
      drawText(surface, fittedVisual, visualX + 1, portraitLabels ? labelY + 15 : labelY + 1, '#02030a', labelScale);
      drawText(surface, fittedTrack, trackX, labelY, '#f4f1fa', labelScale);
      drawText(surface, fittedVisual, visualX, portraitLabels ? labelY + 14 : labelY, '#48e0c8', labelScale);
      surface.restore();
    };
    if (!pushOverlayDraw(drawVisualSurface)) drawVisualSurface(ctx);
  }
}

export class HowToPlayState {
  static portraitMode = 'frame';

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
    if (portraitMenuActive()) {
      this.drawPortrait(ctx);
      return;
    }
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
    line('JUMP', touch ? 'TAP THE LEFT HALF. HOLD FOR HIGHER.' : 'SPACE / W / UP / LEFT CLICK. HOLD FOR HIGHER.');
    line('POWER SLIDE', touch ? 'TAP THE RIGHT HALF AND HOLD, OR SWIPE DOWN. KICKS CONES AND BARRELS.' : 'S / DOWN / RIGHT CLICK. HOLD IT. KICKS CONES AND BARRELS.');
    line('HERO POWER', touch ? 'THE USE DISC, OR SWIPE RIGHT.' : 'X / SHIFT / MIDDLE CLICK.');
    line('PORTALS', 'RUN THROUGH TO TAG IN THE PREVIEWED HERO.', '#48e0c8');
    y += 4;
    line('MISSION', 'FINISH IT TO WIN THE STAGE. EARNS A PLUG.', '#f890b8');
    line('CHALLENGE', 'OPTIONAL. ANOTHER PLUG. NO PRESSURE. SOME PRESSURE.', '#f890b8');
    line('TOASTER', 'GRAB THE FLOATING APPLIANCE MID-STAGE. THIRD PLUG.', '#f890b8');
    line('PLUGS', 'ONE-TIME EACH. UNLOCK CABINETS. COINS BUY UPGRADES.', '#f890b8');
    drawTextCentered(ctx, 'JUMP RED HAZARDS. SLIDE UNDER DRONES. MIND THE GAPS.', W / 2, y + 6, '#d84828');
    drawTextCentered(ctx, `${confirmVerb()}: BACK`, W / 2, H - 16, '#5a5a68');
  }

  drawPortrait(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);

    const safeTop = portraitMenuSafeTop();
    const safeBottom = portraitMenuSafeBottom();
    const titleMid = safeTop + 34;
    portraitMenuTextCentered(ctx, 'HOW TO PLAY', W / 2,
      portraitMenuTextY(titleMid, 2.35, 'title'), '#fff', 2.35, 'title');

    const touch = Input.isTouchDevice();
    const rows = [
      ['JUMP', touch ? 'TAP THE LEFT HALF. HOLD FOR HIGHER.' : 'SPACE / W / UP / LEFT CLICK. HOLD FOR HIGHER.', '#f6d33c'],
      ['POWER SLIDE', touch ? 'TAP THE RIGHT HALF AND HOLD, OR SWIPE DOWN. KICKS CONES AND BARRELS.' : 'S / DOWN / RIGHT CLICK. HOLD IT. KICKS CONES AND BARRELS.', '#f6d33c'],
      ['HERO POWER', touch ? 'THE USE DISC, OR SWIPE RIGHT.' : 'X / SHIFT / MIDDLE CLICK.', '#f6d33c'],
      ['PORTALS', 'RUN THROUGH TO TAG IN THE PREVIEWED HERO.', '#48e0c8'],
      ['MISSION', 'FINISH IT TO WIN THE STAGE. EARNS A PLUG.', '#f890b8'],
      ['CHALLENGE', 'OPTIONAL. ANOTHER PLUG. NO PRESSURE. SOME PRESSURE.', '#f890b8'],
      ['TOASTER', 'GRAB THE FLOATING APPLIANCE MID-STAGE. THIRD PLUG.', '#f890b8'],
      ['PLUGS', 'ONE-TIME EACH. UNLOCK CABINETS. COINS BUY UPGRADES.', '#f890b8'],
    ];
    const contentX = 28;
    const contentW = W - contentX * 2;
    const rowH = 80;
    const sectionGap = 34;
    const sectionHeaderS = 1.5;
    const labelSBase = 1.35;
    const descriptionS = 1.4;
    const sectionNames = new Map([[0, 'CONTROLS'], [4, 'STAGE GOALS']]);
    let rowTop = titleMid + 52;
    rows.forEach(([label, description, color], i) => {
      if (sectionNames.has(i)) {
        if (i > 0) rowTop += sectionGap;
        portraitMenuText(ctx, sectionNames.get(i), contentX,
          portraitMenuTextY(rowTop - 11, sectionHeaderS, 'bold'), '#8a8492', sectionHeaderS, 'bold');
      }
      const labelS = portraitMenuFit(label, labelSBase, contentW, 'bold');
      portraitMenuText(ctx, label, contentX,
        portraitMenuTextY(rowTop + 19, labelS, 'bold'), color, labelS, 'bold');
      const lines = portraitMenuWrap(description, contentW, descriptionS, 3);
      const lineGap = 20;
      const firstMid = rowTop + 56 - (lines.length - 1) * lineGap / 2;
      lines.forEach((line, j) => {
        portraitMenuText(ctx, line, contentX,
          portraitMenuTextY(firstMid + j * lineGap, descriptionS), '#c8c8d8', descriptionS);
      });
      rowTop += rowH;
    });

    portraitMenuTextCentered(ctx, `${confirmVerb()}: BACK`, W / 2,
      portraitMenuTextY(safeBottom - 16, 1.2), '#5a5a68', 1.2);
  }
}

const SETTINGS_TOP = 68;
const SETTINGS_ROW = 23;
const SETTINGS_VISIBLE_ROWS = 6;
const SETTINGS_BACK_TOP = 216;
const SETTINGS_BACK_H = 25;

export class SettingsState {
  static portraitMode = 'frame';

  constructor({ save, onDone, onCalibrate = null }) {
    this.save = save;
    this.onDone = onDone;
    this.onCalibrate = onCalibrate;
    this.listY = SETTINGS_TOP;
    this.rowH = SETTINGS_ROW;
    this.visibleRows = SETTINGS_VISIBLE_ROWS;
    this.doneY = SETTINGS_BACK_TOP;
    this.doneH = SETTINGS_BACK_H;
    this.listStart = 0;
    this.pointerGesture = null;
  }
  layout() {
    if (!portraitMenuActive()) {
      this.listY = SETTINGS_TOP;
      this.rowH = SETTINGS_ROW;
      this.visibleRows = SETTINGS_VISIBLE_ROWS;
      this.doneY = SETTINGS_BACK_TOP;
      this.doneH = SETTINGS_BACK_H;
      return;
    }
    const safeTop = portraitMenuSafeTop();
    const safeBottom = portraitMenuSafeBottom();
    // The portrait frame is roughly four times as tall as the landscape one.
    // Use that room for a denser full-page list: the type stays large while
    // the extra height goes toward showing more settings at once.
    this.doneH = 60;
    const count = this.listCount();
    const footerY = safeBottom - 18;
    this.doneY = footerY - 18 - this.doneH;
    const listBottom = this.doneY - 12;
    const firstTextMid = safeTop + 163;
    // Fit the complete settings list on a tall phone where possible. Smaller
    // portrait windows keep scrolling, but the minimum pitch stays large
    // enough for a clearly tappable row with the enlarged type.
    this.rowH = Math.max(54, Math.min(90,
      (listBottom - firstTextMid) / Math.max(1, Math.min(count, 13) - 0.5)));
    this.listY = firstTextMid - this.rowH / 2;
    this.visibleRows = Math.max(1, Math.min(count,
      Math.floor((listBottom - this.listY) / this.rowH)));
  }
  enter() {
    this.idx = 0;
    this.listStart = 0;
    this.pointerGesture = null;
    this.confirming = false;
    this.layout();
    Input.setMenuButtons();
  }
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
  /**
   * AUDIO SYNC, in milliseconds, signed.
   *
   * The row names the system figure it sits ON TOP OF, because the number by
   * itself reads as the whole correction and is not: zero here means "the
   * ~168 ms this device admits to, and nothing more". Naming both is what
   * stops RESET looking like it is about to set 168.
   *
   * Left and right nudge it by ten; CONFIRM opens the tap test, which is the only
   * way in on a touchscreen — a phone has no left and right, and a phone is
   * exactly the device that needs this row.
   */
  audioSyncOption() {
    const s = this.save.settings;
    const adjust = (dir) => {
      s.audioSyncMs = clampAudioSyncMs(s.audioSyncMs + dir * AUDIO_SYNC_STEP);
      Audio.setSyncOffset(s.audioSyncMs);
    };
    const ms = clampAudioSyncMs(s.audioSyncMs);
    const reported = Math.round(Audio.reportedLatencySec() * 1000);
    return {
      label: `AUDIO SYNC: ${ms > 0 ? '+' : ''}${ms} MS ON TOP OF SYSTEM ~${reported}`,
      portraitTitle: 'SET AUDIO SYNC',
      portraitSubtitle: `${ms > 0 ? '+' : ''}${ms} MS ON TOP OF SYSTEM ~${reported}`,
      act: () => { if (this.onCalibrate) this.onCalibrate(); else adjust(1); },
      adjust,
    };
  }
  /**
   * The way back to the browser's own figure, without tapping sixteen clicks.
   *
   * AUDIO SYNC is an offset ON TOP of what the device reports (audio.js,
   * heardLatencySec), so zero is not "no correction at all" — it is "trust the
   * system's number", which is the right answer on a wired output and the
   * answer a player wants back the moment they unplug the bluetooth headphones
   * they calibrated for. The row names the figure it is handing back to, and
   * refuses when it is already in force rather than pretending to act.
   */
  audioSyncResetOption() {
    const s = this.save.settings;
    const reported = Math.round(Audio.reportedLatencySec() * 1000);
    const ms = clampAudioSyncMs(s.audioSyncMs);
    return {
      label: `RESET AUDIO SYNC (SYSTEM ~${reported} MS ALONE)`,
      portraitTitle: 'RESET AUDIO SYNC',
      portraitSubtitle: `SYSTEM ~${reported} MS ALONE`,
      act: () => {
        if (ms === 0) { Audio.sfx('uiBad'); return; }
        s.audioSyncMs = 0;
        Audio.setSyncOffset(0);
        this.save.persist();
      },
    };
  }
  options() {
    const s = this.save.settings;
    return [
      { label: `MUTE: ${s.muted ? 'ON' : 'OFF'}`, act: () => { s.muted = !s.muted; Audio.setMuted(s.muted); } },
      // Only where the choice is honoured: a handheld's framing is fixed.
      ...(framingIsChosen()
        ? [{ label: `CAMERA: ${s.zoomIn ? 'ZOOM IN' : 'NORMAL'}`, act: () => { s.zoomIn = !s.zoomIn; } }]
        : []),
      this.volumeOption('music', 'MUSIC VOLUME'),
      this.volumeOption('sfx', 'SFX VOLUME'),
      this.audioSyncOption(),
      this.audioSyncResetOption(),
      { label: `SHOW FPS: ${s.showFps ? 'ON' : 'OFF'}`, act: () => { s.showFps = !s.showFps; } },
      { label: `ASSIST SPEED: ${s.assistSpeed}%`, act: () => { s.assistSpeed = s.assistSpeed === 100 ? 80 : s.assistSpeed + 10; } },
      { label: 'RESET TO DEFAULTS', act: () => { this.confirming = true; Audio.sfx('uiBad'); } },
      { label: 'BACK', act: () => { this.save.persist(); this.onDone(); } },
    ];
  }
  listCount(opts = this.options()) { return opts.length - 1; }
  maxListStart(opts = this.options()) {
    return Math.max(0, this.listCount(opts) - this.visibleRows);
  }
  keepSelectionVisible(opts = this.options()) {
    const count = this.listCount(opts);
    if (this.idx >= count) return;
    if (this.idx < this.listStart) this.listStart = this.idx;
    else if (this.idx >= this.listStart + this.visibleRows) {
      this.listStart = this.idx - this.visibleRows + 1;
    }
    this.listStart = Math.max(0, Math.min(this.maxListStart(opts), this.listStart));
  }
  pointerIndex(y, opts = this.options()) {
    this.layout();
    const done = opts.length - 1;
    if (y >= this.doneY && y < this.doneY + this.doneH) return done;
    if (y < this.listY || y >= this.listY + this.visibleRows * this.rowH) return -1;
    const visible = Math.floor((y - this.listY) / this.rowH);
    const index = this.listStart + visible;
    return index < done ? index : -1;
  }
  activate(option) {
    Audio.sfx('uiConfirm');
    option.act();
  }
  resetToDefaults() {
    Object.assign(this.save.settings, defaultSettings());
    Audio.setVolumes(this.save.settings.volumes);
    Audio.setMuted(this.save.settings.muted);
    // Zeroes AUDIO SYNC along with everything else. That is the right answer for a
    // reset — a measurement made on someone else's headphones is worse than none —
    // and it also clears `audioSyncAsked`, so the rhythm briefing offers the tap
    // test once more.
    Audio.setSyncOffset(this.save.settings.audioSyncMs);
    this.confirming = false;
  }
  update(dt) {
    this.layout();
    const opts = this.options();
    if (this.confirming) {
      if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); this.resetToDefaults(); }
      if (Input.pressed('back') || Input.pressed('slide')) { this.confirming = false; Audio.sfx('ui'); }
      Input.endFrame();
      return;
    }
    if (Input.pressed('down')) {
      this.idx = (this.idx + 1) % opts.length;
      this.keepSelectionVisible(opts);
      Audio.sfx('ui');
    }
    if (Input.pressed('up')) {
      this.idx = (this.idx + opts.length - 1) % opts.length;
      this.keepSelectionVisible(opts);
      Audio.sfx('ui');
    }
    if (Input.pressed('left')) { if (opts[this.idx].adjust) opts[this.idx].adjust(-1); else opts[this.idx].act(); Audio.sfx('ui'); }
    if (Input.pressed('right')) { if (opts[this.idx].adjust) opts[this.idx].adjust(1); else opts[this.idx].act(); Audio.sfx('ui'); }
    if (Input.pressed('confirm')) this.activate(opts[this.idx]);
    if (Input.pressed('pointer')) {
      const i = this.pointerIndex(Input.pointer.y, opts);
      if (i >= 0) {
        if (Input.usingTouch) {
          this.pointerGesture = {
            startY: Input.pointer.y,
            startList: this.listStart,
            pressedIndex: i,
            moved: false,
          };
        } else if (i === opts.length - 1 || this.idx === i) {
          this.activate(opts[i]);
        } else {
          this.idx = i;
          Audio.sfx('ui');
        }
      }
    }
    if (this.pointerGesture && Input.pointer.down) {
      const dy = Input.pointer.y - this.pointerGesture.startY;
      if (Math.abs(dy) >= 8) this.pointerGesture.moved = true;
      if (this.pointerGesture.moved) {
        const rows = Math.round(-dy / this.rowH);
        this.listStart = Math.max(0, Math.min(
          this.maxListStart(opts),
          this.pointerGesture.startList + rows,
        ));
      }
    } else if (this.pointerGesture && !Input.pointer.down) {
      const gesture = this.pointerGesture;
      this.pointerGesture = null;
      if (!gesture.moved) {
        const i = this.pointerIndex(Input.pointer.y, opts);
        if (i >= 0) {
          if (i === opts.length - 1 || this.idx === i) this.activate(opts[i]);
          else {
            this.idx = i;
            Audio.sfx('ui');
          }
        }
      }
    }
    if (Input.pressed('back')) { this.save.persist(); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    if (portraitMenuActive()) {
      this.drawPortrait(ctx);
      return;
    }
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const opts = this.options();
    const doneIndex = opts.length - 1;
    const band = leftBand(opts.slice(0, doneIndex).map((o) => o.label), LEFT_MENU_ITEM_S);
    drawText(ctx, 'SETTINGS', band.textX, 30, '#fff', 2, 'title');
    opts.slice(0, doneIndex).forEach((o, i) => {
      if (i < this.listStart || i >= this.listStart + this.visibleRows) return;
      const sel = i === this.idx;
      const rowTop = this.listY + (i - this.listStart) * this.rowH;
      if (sel) drawMenuRow(ctx, band.x, rowTop + 1, band.w, this.rowH - 2);
      const textY = textYForMid(rowTop + this.rowH / 2);
      drawText(ctx, o.label, band.textX, textY, sel ? '#c9a0ff' : '#c8c8d8', LEFT_MENU_ITEM_S);
    });
    if (this.listCount(opts) > this.visibleRows) {
      const trackY = this.listY + 4;
      const trackH = this.visibleRows * this.rowH - 8;
      const thumbH = Math.max(18, trackH * this.visibleRows / this.listCount(opts));
      const thumbY = trackY + (trackH - thumbH) * this.listStart / this.maxListStart(opts);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(W - 17, trackY, 2, trackH);
      ctx.fillStyle = 'rgba(201,160,255,0.55)';
      ctx.fillRect(W - 18, thumbY, 4, thumbH);
    }
    const doneSelected = this.idx === doneIndex;
    if (doneSelected) drawMenuRow(ctx, band.x, this.doneY + 1, band.w, this.doneH - 2);
    const doneTextY = textYForMid(this.doneY + this.doneH / 2);
    drawText(ctx, 'BACK', band.textX, doneTextY, doneSelected ? '#c9a0ff' : '#c8c8d8', LEFT_MENU_ITEM_S);
    drawTextCentered(ctx, Input.isTouchDevice() ? 'TAP: SELECT   TAP AGAIN: CHANGE' : 'LEFT/RIGHT: ADJUST   ENTER: CHANGE', W / 2, H - 14, '#5a5a68');
    // Use the same device-local formatter as the portrait shell. The dev-only
    // stamp is a fallback for an older live shell that predates __MASH_BUILT_AT__.
    const buildStamp = formatBuildTime(window.__MASH_BUILT_AT__) || window.__MASH_BUILD__;
    if (buildStamp) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      drawText(ctx, `BUILT: ${buildStamp}`, 4, 4, '#55647a', 0.75);
      ctx.restore();
    }
    if (this.confirming) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(40, 90, W - 80, 60);
      ctx.strokeStyle = '#e04848';
      ctx.strokeRect(40.5, 90.5, W - 81, 60);
      drawTextCentered(ctx, 'RESET ALL TO DEFAULTS?', W / 2, 108, '#e04848', 1.5);
      drawTextCentered(ctx, `${confirmVerb()}: CONFIRM   BACK`, W / 2, 132, '#8a8a98');
    }
  }

  drawPortrait(ctx) {
    this.layout();
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const opts = this.options();
    const doneIndex = opts.length - 1;
    const labels = opts.slice(0, doneIndex).map((o) => o.label);
    const itemS = 1.8;
    const band = leftBand(labels, portraitMenuScale(itemS));
    const titleX = band.textX;
    const titleMid = portraitMenuSafeTop() + 34;
    portraitMenuText(ctx, 'SETTINGS', titleX,
      portraitMenuTextY(titleMid, 3.1, 'title'), '#fff', 3.1, 'title');

    labels.forEach((_, i) => {
      if (i < this.listStart || i >= this.listStart + this.visibleRows) return;
      const o = opts[i];
      const rowTop = this.listY + (i - this.listStart) * this.rowH;
      const selected = i === this.idx;
      if (selected) drawMenuRow(ctx, band.x, rowTop + 1, band.w, this.rowH - 2, 5);
      const maxWidth = W - titleX - 28;
      if (o.portraitTitle) {
        const titleStyle = selected ? 'bold' : 'ui';
        const titleSize = portraitMenuFit(o.portraitTitle, itemS, maxWidth, titleStyle);
        const subtitleSize = portraitMenuFit(o.portraitSubtitle, 1.5, maxWidth);
        const titleInk = TEXT_INK_H * portraitMenuScale(titleSize);
        const subtitleInk = TEXT_INK_H * portraitMenuScale(subtitleSize);
        const blockGap = 12;
        const titleMid = rowTop + this.rowH / 2
          - (titleInk + blockGap + subtitleInk) / 2 + titleInk / 2;
        const subtitleMid = titleMid + titleInk / 2 + blockGap + subtitleInk / 2;
        portraitMenuText(ctx, o.portraitTitle, titleX,
          portraitMenuTextY(titleMid, titleSize, titleStyle),
          selected ? '#c9a0ff' : '#c8c8d8', titleSize, titleStyle);
        portraitMenuText(ctx, o.portraitSubtitle, titleX,
          portraitMenuTextY(subtitleMid, subtitleSize),
          selected ? '#b8a7c9' : '#9292a3', subtitleSize);
        return;
      }
      const size = portraitMenuFit(o.label, itemS, maxWidth);
      portraitMenuText(ctx, o.label, titleX,
        portraitMenuTextY(rowTop + this.rowH / 2, size),
        selected ? '#c9a0ff' : '#c8c8d8', size);
    });

    if (this.listCount(opts) > this.visibleRows) {
      const trackY = this.listY + 6;
      const trackH = this.visibleRows * this.rowH - 12;
      const thumbH = Math.max(26, trackH * this.visibleRows / this.listCount(opts));
      const thumbY = trackY + (trackH - thumbH) * this.listStart / this.maxListStart(opts);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(W - 18, trackY, 3, trackH);
      ctx.fillStyle = 'rgba(201,160,255,0.62)';
      ctx.fillRect(W - 20, thumbY, 6, thumbH);
    }

    const doneSelected = this.idx === doneIndex;
    if (doneSelected) drawMenuRow(ctx, band.x, this.doneY + 1, band.w, this.doneH - 2, 5);
    const backSize = portraitMenuFit('BACK', itemS, W - titleX - 28);
    portraitMenuText(ctx, 'BACK', titleX,
      portraitMenuTextY(this.doneY + this.doneH / 2, backSize),
      doneSelected ? '#c9a0ff' : '#c8c8d8', backSize);
    portraitMenuTextCentered(ctx,
      Input.isTouchDevice() ? 'TAP: SELECT   TAP AGAIN: CHANGE' : 'LEFT/RIGHT: ADJUST   ENTER: CHANGE',
      W / 2, portraitMenuTextY(portraitMenuSafeBottom(18), 1.3), '#5a5a68', 1.3);

    if (this.confirming) {
      const mw = W - 64;
      const mh = 150;
      const my = Math.round((H - mh) / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.90)';
      ctx.fillRect(32, my, mw, mh);
      ctx.strokeStyle = '#e04848';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(32.5, my + 0.5, mw - 1, mh - 1);
      const confirmS = portraitMenuFit('RESET ALL TO DEFAULTS?', 1.9, mw - 24, 'title');
      portraitMenuTextCentered(ctx, 'RESET ALL TO DEFAULTS?', W / 2,
        portraitMenuTextY(my + 47, confirmS, 'title'), '#e04848', confirmS, 'title');
      portraitMenuTextCentered(ctx, `${confirmVerb()}: CONFIRM   BACK`, W / 2,
        portraitMenuTextY(my + 101, 1.3), '#8a8a98', 1.3);
    }
  }
}
