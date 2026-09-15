// TOUCH CHROME — the on-screen controls, registered and painted from one place.
//
// Three screens put touch controls up (a run, the tutorial, the food court)
// and each used to keep its own copy of the geometry and the painter, which
// is how "the same disc" quietly stops being the same disc. The geometry is
// touch-layout.js's, recomputed by renderer.js on every resize into `chrome`;
// this file hands it to Input.setChromeButtons and paints it on #chrome
// through the dirty-flag layer, so the margin repaints only when something
// visible changes: a relayout, a disc pressed or released, the USE recharge
// crossing a pixel.
//
// Nothing here knows which device it is on. The layout supplies CSS-pixel
// positions for the current safe frame; this painter only gives each disc its
// shared visual vocabulary.
import { chrome, chromeCtx, paintChrome } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { drawRoundButton, GLYPH_PX } from '../engine/sprites.js';
import { ACTION_INK } from './beatground.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { specialMoveColor } from './draw.js';

// The button lists a playable screen registers. `hasPower` false (the tutorial
// before B-33P hands over the cannon) drops the USE disc and gives its band of
// the right pillar to SLIDE, so the pillar still tiles.
export function runChromeButtons({ hasPower = true } = {}) {
  return hasPower ? chrome.run : chrome.runNoPower;
}
export function hubChromeButtons() { return chrome.hub; }

// The look, once. Landscape actions get a slightly stronger translucent glass
// fill so they stay readable when they sit over the level; portrait keeps the
// quieter legacy fill. Neither mode draws an outer button rim: the attack's
// pink ring is its glyph, while the shared glass makes the three actions a set.
const GLASS = 'rgba(11,11,20,0.14)';
const GLASS_PRESSED = 'rgba(11,11,20,0.30)';
// A dark tint disappears against the landscape letterbox. These low-alpha
// action tints read as smoky/frosted glass on black while still carrying the
// action's established colour: green jump, blue slide, pink attack.
const ACTION_GLASS = {
  jump: 'rgba(63,191,90,0.20)',
  slide: 'rgba(114,216,240,0.20)',
  ability: 'rgba(248,144,184,0.18)',
};
const ACTION_GLASS_PRESSED = {
  jump: 'rgba(104,218,126,0.30)',
  slide: 'rgba(157,233,249,0.30)',
  ability: 'rgba(255,180,210,0.28)',
};
const GLASS_PAUSE = 'rgba(11,11,20,0.035)';
const GLASS_PAUSE_PRESSED = 'rgba(11,11,20,0.09)';
const PAUSE_GLASS = 'rgba(255,255,255,0.11)';
const PAUSE_GLASS_PRESSED = 'rgba(255,255,255,0.19)';
const PAUSE_INK = 'rgba(255,255,255,0.54)';
const PAUSE_OUTLINE = 'rgba(18,24,46,0.28)';
const WALK_INK = 'rgba(255,255,255,0.9)';
const REWIND_INK = 'rgba(124,232,160,0.95)';

function actionButtonStyle(held, ink, landscape, id) {
  return {
    fill: landscape
      ? (held ? ACTION_GLASS_PRESSED[id] : ACTION_GLASS[id])
      : (held ? GLASS_PRESSED : GLASS),
    ink,
  };
}
// USE's recharge, read off a run — or the tutorial's shim, which is the same
// two fields: {player, relay:{current}}. Full reads as ready, not empty: it
// drains to 0 the instant you fire it, rises back as the cooldown counts down,
// and stays full once ready. The ink is the hero-side orb's readiness palette,
// so both reads agree at a glance.
export function abilityMeter(state) {
  const cd = state.player.abilityCd;
  const maxCd = HERO_BY_ID[state.relay.current].ability.cooldown;
  const frac = cd > 0 ? Math.max(0, Math.min(1, 1 - cd / maxCd)) : 1;
  return { frac, ink: specialMoveColor(frac, cd <= 0) };
}

const box = (b) => ({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 });
const discsOf = (list) => list.filter((b) => b.r != null);

// The portrait review page has its own CSS-pixel layout, but it must not have
// its own button vocabulary. Keep the production chrome painter usable with a
// supplied disc list so screenshots and live touch chrome cannot disagree on
// arrow direction, ink, outline, label scale, or cooldown treatment.
export function drawRunChrome(ctx, discs, state, isHeld = (action) => Input.held(action)) {
  const list = discsOf(discs);
  const landscape = chrome.landscapeSide != null;
  const use = list.find((b) => b.id === 'ability' || b.id === 'use');
  const meter = use && state ? abilityMeter(state) : null;
  for (const b of list) {
    const held = isHeld(b.action);
    const fill = held ? GLASS_PRESSED : GLASS;
    const button = { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 };
    if (b.id === 'jump') drawRoundButton(ctx, { ...button, icon: 'up' }, actionButtonStyle(held, ACTION_INK.jump, landscape, 'jump'));
    else if (b.id === 'slide') drawRoundButton(ctx, { ...button, icon: 'down' }, actionButtonStyle(held, ACTION_INK.slide, landscape, 'slide'));
    else if (b.id === 'pause') drawRoundButton(ctx, { ...button, icon: 'pause' }, {
      fill: landscape
        ? (held ? PAUSE_GLASS_PRESSED : PAUSE_GLASS)
        : (held ? GLASS_PAUSE_PRESSED : GLASS_PAUSE),
      ink: PAUSE_INK,
      outline: PAUSE_OUTLINE,
      shadowColor: 'rgba(0,0,0,0.24)',
      shadowBlur: 0.24,
      shadowOffsetY: 0.05,
    });
    else if (b.id === 'rewind') drawRoundButton(ctx, { ...button, label: 'RWD' }, {
      fill, ink: REWIND_INK,
      labelScale: (b.r * 0.56) / GLYPH_PX, labelStyle: 'ui',
    });
    else if (b.id === 'ability' || b.id === 'use') {
      const frac = meter?.frac ?? 1;
      // Attack is the same action glyph as the rhythm ribbon: an outlined
      // pink circle. The meter still fills the disc from below while it
      // recharges, but the control no longer needs a separate word.
      const ink = ACTION_INK.ability;
      drawRoundButton(ctx, { ...button, icon: 'ability' }, {
        ...actionButtonStyle(held, ink, landscape, 'ability'),
        frac, levelFill: ink, levelAlpha: 0.22, waterline: '#d7fff6',
      });
    }
  }
}

// Whether the dev overlay is up: it draws on #game, and a live control painted
// over an open menu is a control that looks pressable and is not.
function devMenuOpen() {
  return typeof window !== 'undefined' && !!(window.__mash_dev && window.__mash_dev.open);
}

// A run's (or the tutorial's) discs. Called from the screen's draw; the frame
// is committed centrally by states.js, and a frame that declares nothing —
// paused, keyboard, nothing registered — clears the layer once and no-ops.
export function declareRunChrome(state) {
  if (!chromeCtx || devMenuOpen()) return;
  const discs = discsOf(Input.chromeButtons);
  if (!discs.length) return;
  // Everything that changes the painted pixels: the layout generation, which
  // discs are up and which are held, and the waterline quantised to the pixel
  // it would move — so a ready USE repaints zero times while a recharge
  // repaints once per pixel of rise.
  let sig = `run|${chrome.gen}`;
  for (const b of discs) sig += `|${b.id}${Input.held(b.action) ? '*' : ''}`;
  const use = discs.find((b) => b.id === 'ability');
  const meter = use ? abilityMeter(state) : null;
  if (meter) sig += `|${Math.round(meter.frac * use.r * 2)}|${meter.ink}`;
  paintChrome(sig, (ctx) => {
    drawRunChrome(ctx, discs, state);
  });
}

// The food court's walk arrows: the same discs with a sideways triangle.
export function declareHubChrome() {
  if (!chromeCtx || devMenuOpen()) return;
  const discs = discsOf(Input.chromeButtons).filter((b) => b.id === 'hubLeft' || b.id === 'hubRight');
  if (!discs.length) return;
  let sig = `hub|${chrome.gen}`;
  for (const b of discs) sig += `|${b.id}${Input.held(b.action) ? '*' : ''}`;
  paintChrome(sig, (ctx) => {
    for (const b of discs) {
      const fill = Input.held(b.action) ? GLASS_PRESSED : GLASS;
      drawRoundButton(ctx, { ...box(b), icon: b.id === 'hubLeft' ? 'left' : 'right' }, { fill, ink: WALK_INK });
    }
  });
}
