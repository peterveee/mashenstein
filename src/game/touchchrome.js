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
// Nothing here knows which device it is on. The discs sit on the picture at
// fixed logical spots and the margin's zones extend them, on every device.
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

// The look, once. A 14% glass disc that deepens while it is held — the press
// is the only feedback a thumb gets from a control it is not looking at — and
// glyphs on the shadow drawRoundButton gives them.
const GLASS = 'rgba(11,11,20,0.14)';
const GLASS_PRESSED = 'rgba(11,11,20,0.30)';
const PAUSE_INK = 'rgba(255,255,255,0.9)';
const WALK_INK = 'rgba(255,255,255,0.9)';
// USE is the one disc that carries a word. Its em height as a fraction of the
// disc's radius, turned into the text system's scale (GLYPH_PX em at scale 1).
const LABEL_EM = 0.56;

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
  const use = discs.find((b) => b.id === 'ability');
  const meter = use ? abilityMeter(state) : null;
  // Everything that changes the painted pixels: the layout generation, which
  // discs are up and which are held, and the waterline quantised to the pixel
  // it would move — so a ready USE repaints zero times while a recharge
  // repaints once per pixel of rise.
  let sig = `run|${chrome.gen}`;
  for (const b of discs) sig += `|${b.id}${Input.held(b.action) ? '*' : ''}`;
  if (meter) sig += `|${Math.round(meter.frac * use.r * 2)}|${meter.ink}`;
  paintChrome(sig, (ctx) => {
    for (const b of discs) {
      const fill = Input.held(b.action) ? GLASS_PRESSED : GLASS;
      if (b.id === 'jump') drawRoundButton(ctx, { ...box(b), icon: 'up' }, { fill, ink: ACTION_INK.jump });
      else if (b.id === 'slide') drawRoundButton(ctx, { ...box(b), icon: 'down' }, { fill, ink: ACTION_INK.slide });
      else if (b.id === 'pause') drawRoundButton(ctx, { ...box(b), icon: 'pause' }, { fill, ink: PAUSE_INK });
      else if (b.id === 'ability') {
        drawRoundButton(ctx, { ...box(b), label: 'USE' }, {
          fill, ink: meter.ink,
          frac: meter.frac, levelFill: meter.ink, levelAlpha: 0.22, waterline: '#d7fff6',
          labelScale: (b.r * LABEL_EM) / GLYPH_PX, labelStyle: 'ui',
        });
      }
    }
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
