// The Frost aurora: what the pass promises, held at the blit.
//
// The painter bakes each curtain into a sprite and then does one drawImage per
// curtain, so the contract is checkable without a real rasteriser: how many
// curtains a stage shows, that the scene can take it to nothing, that it stays
// clear of the ridges.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack, __testing } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { GROUND_Y } = await import('../src/engine/camera.js');
const { frameForViewport } = await import('../src/engine/frame.js');
const { portraitHudLayout } = await import('../src/game/portrait-layout.js');
const { resolveCompositionProfile } = await import('../src/engine/composition-profile.js');
const { resolveSceneryLayout } = await import('../src/engine/scenery-layout.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A recorder that keeps the blits, and enough of a canvas factory that the bake
// path produces a sprite instead of bailing out to null.
function recorder() {
  const blits = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    canvas: { width: 480, height: 270 },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    fillRect() {}, beginPath() {}, rect() {}, quadraticCurveTo() {},
    arc() {}, ellipse() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() {}, stroke() {}, save() {}, restore() {},
    translate() {}, scale() {}, rotate() {}, clip() {},
    drawImage(image, x, y, w, h) {
      blits.push({ x, y, w, h, alpha: this.globalAlpha, image });
    },
  };
  return { ctx, blits };
}

const frost = CABINETS.find((cab) => cab.id === 'frost');
const pack = getStylePack(frost.style, {});

function auroraBlits(scene, settings) {
  // The aurora's sprites are the only thing this pack blits with a source
  // canvas it minted itself; separate them from the sky/hill paper passes by
  // differencing against the same frame with the pass switched off.
  const on = recorder();
  const off = recorder();
  const p = settings ? getStylePack(frost.style, settings) : pack;
  p.bg(on.ctx, 2.5, 640, frost, 1000, scene, 0, scene);
  const dark = { ...scene, auroraGain: 0 };
  p.bg(off.ctx, 2.5, 640, frost, 1000, dark, 0, dark);
  return { on: on.blits, off: off.blits };
}

// --- how many curtains a stage shows ---------------------------------------
for (const [stageIndex, expected] of [[1, 2], [2, 3], [3, 3]]) {
  const { on, off } = auroraBlits({ stageIndex });
  assert(on.length - off.length === expected,
    `frost-${stageIndex} paints ${expected} aurora curtains`);
}

// --- the scene can take it to nothing --------------------------------------
{
  const a = recorder(); const b = recorder();
  pack.bg(a.ctx, 2.5, 640, frost, 1000, { stageIndex: 3, auroraGain: 0 }, 0,
    { stageIndex: 3, auroraGain: 0 });
  pack.bg(b.ctx, 2.5, 640, frost, 1000, { stageIndex: 3, auroraGain: 0 }, 0,
    { stageIndex: 3, auroraGain: 0 });
  assert(a.blits.length === b.blits.length,
    'auroraGain 0 removes the pass without disturbing the rest of the frame');
}

// --- it is sky, not scenery -------------------------------------------------
// The far ridge sits at GROUND_Y - 66 before Frost's landscape lift; a curtain
// whose baseline reaches that line has stopped being weather in the upper
// atmosphere and become a green cloud bank sitting on the hills.
{
  const { on } = auroraBlits({ stageIndex: 3 });
  assert(on.length === 3, 'frost-3 blits three curtains');
  // Judge the INK, not the sprite: the sprite is padded by three sigma of blur
  // on every side so the Gaussian is not sliced off square, and nearly all of
  // that padding is empty. The far ridge is authored at GROUND_Y - 66 and then
  // lifted; the lifted line is the higher one, so it is the strict test.
  const ridge = GROUND_Y - 66 - __testing.FROST_LANDSCAPE_SCENERY_LIFT;
  const rect = __testing.frostAuroraRect(null);
  const bounds = __testing.FROST_AURORA_CURTAINS.map((spec) =>
    __testing.frostAuroraBounds(rect, spec, __testing.FROST_AURORA_BLUR));
  assert(bounds.every((b) => b.bottom < ridge),
    'every aurora curtain clears the lifted far ridge line');
  assert(bounds.every((b) => b.top >= 0),
    'no curtain reaches off the top of the frame');
  // The point of the size: it should be weather across the sky, not a decal.
  const covered = Math.max(...bounds.map((b) => b.bottom - b.top));
  assert(covered > rect.height * 0.6,
    'the aurora fills most of the sky it is given');
}

// --- portrait stretches the display, it does not strand it at the top --------
{
  const frame = frameForViewport({
    mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
    safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
  });
  const profile = resolveCompositionProfile('frost');
  const layout = resolveSceneryLayout({
    frame, hud: portraitHudLayout(frame), bands: profile.bands,
  });
  const portrait = __testing.frostAuroraRect({ sceneryLayout: layout });
  const landscape = __testing.frostAuroraRect(null);
  assert(portrait.height > landscape.height,
    'portrait gives the aurora more sky than the authored landscape frame');
  assert(portrait.top === layout.bands.celestial.top
    && Math.abs(portrait.top + portrait.height - layout.bands.upperCloud.bottom) < 0.001,
    'the aurora rectangle is exactly celestial through upper cloud');
}

// --- stage gain is a ramp, not a switch -------------------------------------
{
  const gains = __testing.FROST_AURORA_STAGE_GAIN;
  assert(gains[1] < gains[2] && gains[2] < gains[3],
    'the aurora gets stronger act by act through the cabinet');
}

console.log(failed ? 'FROST AURORA: FAILED' : 'FROST AURORA: PASSED');
process.exit(failed ? 1 : 0);
