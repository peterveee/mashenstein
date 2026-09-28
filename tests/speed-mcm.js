// SPEED ZONE's mid-century backdrop (stylePacks/speedMcm.js, index.js mcmPack): the
// cabinet names it, the paper desert it replaced is still registered, the light runs one
// afternoon across the act with no seam at a stage join, every stage paints in both
// orientations, the lane takes the late light, and the textures are warmed before a run.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');
const { STAGE_BY_ID } = await import('../src/data/stages.js');
const { arcPalette, actU, ARC_KEYS, speedMcmWarmJobs } = await import('../src/engine/stylePacks/speedMcm.js');
const { JONES_MODEL } = await import('../src/engine/stylePacks/speedMcmCoyote.js');
const { beginStageArtWarmup, artWarmupPending, resetArtWarmup } = await import('../src/game/art-warmup.js');
const { frameForViewport } = await import('../src/engine/frame.js');
const { portraitHudLayout } = await import('../src/game/portrait-layout.js');
const { resolveCompositionProfile } = await import('../src/engine/composition-profile.js');
const { resolveSceneryLayout } = await import('../src/engine/scenery-layout.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A context that accepts every call and counts fills.
function recorder() {
  const counts = { fill: 0, drawImage: 0 };
  let m = { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 };
  const target = {
    canvas: { width: 960, height: 540 },
    globalAlpha: 1, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    getTransform: () => ({ ...m }),
    setTransform: (a, b, c, d, e, f) => { m = { a, b, c, d, e, f }; },
    createPattern: () => ({ setTransform() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    fill: () => { counts.fill++; },
    drawImage: () => { counts.drawImage++; },
  };
  const ctx = new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { ctx, counts };
}

const speed = CABINETS.find((cab) => cab.id === 'speed');
assert(speed.style === 'mcm', 'Speed Zone names the mid-century pack');
const settings = { paperCabinet: 'speed', paperPreset: STAGE_BY_ID['speed-1'].paperPreset, paperCutout: true };
const pack = getStylePack('mcm', settings);
assert(pack.name === 'mcm' && pack.lightBg === true, 'the pack is registered and opts out of the bloom');
assert(!!pack.paperSlab, 'the lane keeps the stage\'s paper finish');
assert(getStylePack('faux3d', settings).name === 'faux3d', 'the paper desert it replaced is kept');

// The light: one afternoon, continuous across the stage joins.
assert(actU(1, 0) === 0 && actU(3, 1) === 1, 'the act runs from speed-1\'s opening to speed-3\'s finish');
for (const s of [1, 2]) {
  assert(JSON.stringify(arcPalette(actU(s, 1))) === JSON.stringify(arcPalette(actU(s + 1, 0))),
    `speed-${s + 1} opens in the light speed-${s} closed in`);
}
assert(arcPalette(0).sky.join() === ARC_KEYS[0].pal.sky.join() && arcPalette(1).sky.join() === ARC_KEYS.at(-1).pal.sky.join(),
  'the arc starts at MIDDAY and ends at DUSK');

// Every stage paints, landscape and portrait, at its opening, middle and finish.
const LEN = 11340;
const frame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
});
const sceneryLayout = resolveSceneryLayout({
  frame, hud: portraitHudLayout(frame), bands: resolveCompositionProfile('speed').bands,
});
for (const portrait of [false, true]) {
  for (const stageIndex of [1, 2, 3]) {
    let threw = null;
    let fills = 0;
    for (const p of [0.02, 0.45, 0.63, 0.97]) {
      const { ctx, counts } = recorder();
      ctx.__mashBackgroundCoverage = portrait ? { left: 131, right: 401, width: 270 } : { left: 0, right: 480, width: 480 };
      if (portrait) ctx.__mashBackgroundBand = { top: -120, bottom: 300 };
      try {
        pack.bg(ctx, 3.1, p * LEN, speed, LEN, null, 0, {
          stageIndex, progress: p, heroFrac: 0.3, portrait,
          sceneryLayout: portrait ? sceneryLayout : undefined,
        });
      } catch (e) { threw = e; }
      fills += counts.fill;
    }
    assert(!threw && fills > 400, `speed-${stageIndex} paints in ${portrait ? 'portrait' : 'landscape'}${threw ? `: ${threw.stack}` : ''}`);
  }
}

// The lane takes the late light, and only late.
const lightAt = (stageIndex, p) => {
  const { ctx } = recorder();
  pack.bg(ctx, 1, p * LEN, speed, LEN, null, 0, { stageIndex, progress: p });
  return pack.heroLight();
};
assert(lightAt(1, 0.5) === null, 'no cast on the hero at midday');
assert(/^rgba\(/.test(lightAt(3, 0.97) || ''), 'a dusk veil on the hero at speed-3\'s finish');
{
  const { ctx } = recorder();
  const rects = [];
  ctx.fillRect = (...a) => rects.push([ctx.fillStyle, ctx.globalAlpha, ...a]);
  pack.bg(ctx, 1, 0.97 * LEN, speed, LEN, null, 0, { stageIndex: 3, progress: 0.97 });
  const veil = pack.heroLight().match(/rgba\((\d+),(\d+),(\d+),/).slice(1).map(Number);
  const hex = `#${veil.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  rects.length = 0;
  pack.ground(ctx, 0.97 * LEN, speed, [], [], 60, 480);
  assert(rects.some((r) => r[0] === hex && r[1] > 0.3 && r[2] === 0 && r[4] === 480),
    'the road is tinted across its solid run, in the hero\'s veil');
}

// The Jones coyote plays every show the desert deals.
for (const mode of ['howl', 'yawn', 'chorus', 'wink']) {
  assert(JONES_MODEL.modes.includes(mode), `the Chuck Jones coyote has the ${mode}`);
}
assert(typeof JONES_MODEL.wink === 'function' && JONES_MODEL.headLie, 'it winks square on and lies down to doze');

// Warmed before the run.
assert(speedMcmWarmJobs().length === 8, 'eight texture bakes to warm');
resetArtWarmup();
beginStageArtWarmup({ id: 'speed-probe', style: 'mcm' });
assert(artWarmupPending() >= 8, 'the art warm-up queues the backdrop\'s bakes for the mid-century pack');
resetArtWarmup();

if (failed) process.exit(1);
