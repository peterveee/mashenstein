import assert from 'node:assert/strict';
import {
  defaultFrame, frameForViewport, PORTRAIT_BACKGROUND_ZOOM,
} from '../src/engine/frame.js';
import {
  portraitHudLayout, portraitChatScale, PORTRAIT_CHAT_MAX_LINES,
  PORTRAIT_CHAT_ROW, PORTRAIT_CHAT_PADDING,
} from '../src/game/portrait-layout.js';
import {
  BACKGROUND_DEPTHS, SCENERY_BANDS, backgroundParallaxOffset, resolveSceneryLayout,
} from '../src/engine/scenery-layout.js';
import {
  PORTRAIT_GROUND_ANCHOR_RATIO, PORTRAIT_GROUND_GAP_CSS,
} from '../src/engine/portrait-geometry.js';
import { layoutDiagnosticSnapshot } from '../src/game/layout-diagnostic.js';
import { speechChannel, speechPageCount, speechPageLines } from '../src/game/hud.js';
import { setPresentationFrame } from '../src/engine/renderer.js';

assert.deepEqual(SCENERY_BANDS, {
  celestial: [0.00, 0.14],
  upperCloud: [0.10, 0.27],
  middleCloud: [0.32, 0.48],
  lowerCloud: [0.50, 0.62],
  birds: [0.25, 0.50],
  farLandmark: [0.24, 0.44],
  middle: [0.48, 0.68],
  near: [0.60, 0.82],
}, 'portrait scenery uses the upper-filled, overlap-aware ranges');

const phones = [
  { width: 320, height: 568, safeInsets: { top: 24, right: 0, bottom: 20, left: 0 } },
  { width: 390, height: 844, safeInsets: { top: 59, right: 0, bottom: 34, left: 0 } },
  { width: 430, height: 932, safeInsets: { top: 59, right: 0, bottom: 34, left: 0 } },
];

for (const viewport of phones) {
  const frame = frameForViewport({ mode: 'phone-portrait',
    viewportWidth: viewport.width, viewportHeight: viewport.height,
    safeInsets: viewport.safeInsets });
  const hud = portraitHudLayout(frame);
  const scene = resolveSceneryLayout({ frame, hud });
  const label = `${viewport.width}x${viewport.height}`;
  assert.ok(frame.groundScreenY <= hud.groundFloorScreenY + 1e-9,
    `${label} ground never falls below the largest-chat floor`);
  assert.ok(Math.abs((hud.largestChatTop - frame.groundScreenY) * frame.scale
    - PORTRAIT_GROUND_GAP_CSS) < 1e-9,
  `${label} ground clears the largest chat card by ${PORTRAIT_GROUND_GAP_CSS} CSS px`);
  assert.ok(hud.gameplayTop < hud.gameplayBottom,
    `${label} leaves a non-empty gameplay rectangle`);
  assert.ok(scene.screenRect.top >= hud.sceneryTop - 1e-9,
    `${label} scenery begins below HUD/rhythm furniture`);
  assert.ok(scene.screenRect.bottom <= frame.groundScreenY + 1e-9,
    `${label} scenery ends at the resting groundline`);
  for (const [name, range] of Object.entries(SCENERY_BANDS)) {
    const band = scene.screenBands[name];
    assert.ok(band.top >= scene.screenRect.top - 1e-9
      && band.bottom <= scene.screenRect.bottom + 1e-9,
    `${label} ${name} stays inside the scenery rectangle`);
    assert.ok(Math.abs(band.height - scene.screenRect.height * (range[1] - range[0])) < 1e-9,
      `${label} ${name} keeps its normalized height`);
  }
  assert.equal(scene.localRect.bottom, 232,
    `${label} pack-local scenery remains welded to the authored groundline`);
}

const scaledFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
});
const scaledHud = portraitHudLayout(scaledFrame);
const scaledScene = resolveSceneryLayout({
  frame: scaledFrame,
  hud: scaledHud,
  backgroundZoom: PORTRAIT_BACKGROUND_ZOOM,
});
assert.ok(Math.abs(scaledScene.localRect.height
  - scaledScene.screenRect.height / PORTRAIT_BACKGROUND_ZOOM) < 1e-9,
  'portrait background coordinates compress before the landscape-scale backdrop grows');
for (const name of ['celestial', 'farLandmark', 'near']) {
  const local = scaledScene.bands[name];
  const screen = scaledScene.screenBands[name];
  const finalCenter = scaledFrame.groundScreenY
    + PORTRAIT_BACKGROUND_ZOOM * (local.center - 232);
  assert.ok(Math.abs(finalCenter - screen.center) < 1e-9,
    `${name} remains in its resolved portrait band after backdrop scaling`);
}

assert.equal(backgroundParallaxOffset(100, 'celestial'), -100,
  'celestial objects cancel the full camera translation');
assert.equal(backgroundParallaxOffset(100, 'near'), -65,
  'near scenery follows one shared depth value');
assert.equal(backgroundParallaxOffset(100, BACKGROUND_DEPTHS.middle), -70,
  'numeric depth follows the same vertical parallax rule');
assert.equal(backgroundParallaxOffset(-80, 'far'), 68,
  'camera descent reverses the same depth calculation');

const diagnosticFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 }, revision: 19,
});
const diagnostic = layoutDiagnosticSnapshot({
  style: { name: 'lcd' }, camPan: 0, camZoom: 2.2, camFloorY: 232,
  portraitFrameFitState: {},
}, diagnosticFrame);
for (const name of ['progress rail', 'status row', 'goal row', 'bonus row',
  'rhythm row', 'celestial', 'upperCloud', 'middleCloud', 'lowerCloud',
  'birds', 'farLandmark', 'middle', 'near', 'resting ground',
  'message shelf', 'chat-clearing floor', 'largest chat top']) {
  assert.ok(diagnostic.lines.some((line) => line.name === name)
    || diagnostic.ranges.some((range) => range.name === name),
  `layout diagnostic exposes ${name}`);
}
assert.ok(diagnostic.lines.some((line) => line.name === `${Math.round(PORTRAIT_GROUND_ANCHOR_RATIO * 100)}% line`),
  'layout diagnostic exposes the updated lower ground anchor');
assert.ok(diagnostic.largestSkyGapPercent <= 20,
  `LCD portrait vocabulary leaves no diagnostic sky gap over 20% (${diagnostic.largestSkyGapPercent.toFixed(1)}%)`);
for (const name of ['progress rail', 'status row', 'goal row', 'bonus row',
  'rhythm row', 'gameplay top', 'gameplay bottom', 'message shelf',
  'chat-clearing floor', 'largest chat top']) {
  const entry = diagnostic.lines.find((line) => line.name === name)
    || diagnostic.ranges.find((range) => range.name === name);
  const values = entry?.percent || [];
  const min = Array.isArray(values) ? Math.min(...values) : values;
  const max = Array.isArray(values) ? Math.max(...values) : values;
  assert.ok(min >= -1e-9 && max <= 100 + 1e-9,
    `diagnostic ${name} reports percentages against its own screen rectangle`);
}

const longSpeech = { text: 'A very long sentence keeps its complete text available across dialogue pages.' };
assert.ok(speechPageCount(longSpeech, { maxWidth: 92, scale: 1, maxLines: 3 }) > 1,
  'long portrait speech is paged rather than truncated');
assert.ok(!speechPageLines(longSpeech, { maxWidth: 92, scale: 1, maxLines: 3 })
  .some((line) => line.includes('…')),
  'portrait speech pages contain no ellipsis truncation');
assert.ok(speechPageLines({ ...longSpeech, page: 1 }, { maxWidth: 92, scale: 1, maxLines: 3 }).length > 0,
  'the next portrait speech page contains the remaining copy');

const portraitSpeechFrame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 },
});
setPresentationFrame(portraitSpeechFrame);
const portraitChannel = speechChannel({ bonusT: 0, speech: { who: 'eggshell' } });
assert.equal(portraitChannel.allowWide, true,
  'portrait speech opts into its dedicated wide message shelf');
assert.equal(portraitChannel.compact, true,
  'portrait speech uses the compact lower chat card');
assert.ok(portraitChannel.maxWidth
  > 480 - 100 * portraitChannel.scale,
  'portrait named speech is wider than the landscape shoulder cap');
const compactChatCss = (PORTRAIT_CHAT_MAX_LINES * PORTRAIT_CHAT_ROW
  + PORTRAIT_CHAT_PADDING) * portraitChatScale(portraitSpeechFrame,
    portraitHudLayout(portraitSpeechFrame)) * portraitSpeechFrame.scale;
assert.ok(compactChatCss <= portraitHudLayout(portraitSpeechFrame).messageShelfHeightCss - 2 + 1e-9,
  `portrait compact chat fits its shelf (${compactChatCss.toFixed(1)}px)`);
const shortPortraitSpeech = { who: 'eggshell', text: 'PEW', page: 0 };
const mediumPortraitSpeech = {
  who: 'eggshell', text: 'THIS MESSAGE NEEDS TWO ROWS TO STAY INSIDE THE CHAT SHELF', page: 0,
};
const longestPortraitSpeech = {
  who: 'eggshell',
  text: 'HE HAS MOPPED THE CEILING. HE HAS POLISHED THE INSIDE OF A GLASS TUBE. NOW, HE HAS TO CLEAN YOU. HE IS NOT HAPPY ABOUT IT.',
  page: 0,
};
const shortChannel = speechChannel({ bonusT: 0, speech: shortPortraitSpeech });
const mediumChannel = speechChannel({ bonusT: 0, speech: mediumPortraitSpeech });
const longestChannel = speechChannel({ bonusT: 0, speech: longestPortraitSpeech });
assert.ok(shortChannel.textScale > shortChannel.scale,
  'short portrait speech grows beyond the three-line safety scale');
assert.ok(shortChannel.textScale > mediumChannel.textScale
  && mediumChannel.textScale > longestChannel.textScale,
  'portrait speech scales down progressively as wrapped rows increase');
assert.equal(shortChannel.cardWidth, longestChannel.cardWidth,
  'portrait speech keeps one fixed card width');
assert.equal(shortChannel.cardHeight, longestChannel.cardHeight,
  'portrait speech keeps one fixed card height');
assert.equal(shortChannel.cardHeight * portraitSpeechFrame.scale,
  portraitHudLayout(portraitSpeechFrame).messageShelfHeightCss - 2,
  'the fixed portrait card keeps the existing two-pixel shelf buffer');
assert.equal(speechPageLines(shortPortraitSpeech,
  { ...shortChannel, scale: shortChannel.textScale }).length, 1,
  'the short portrait line remains one centred row at its larger scale');
assert.equal(speechPageLines(mediumPortraitSpeech,
  { ...mediumChannel, scale: mediumChannel.textScale }).length, 2,
  'the medium portrait line remains two rows at its intermediate scale');
assert.equal(speechPageLines(longestPortraitSpeech,
  { ...longestChannel, scale: longestChannel.textScale }).length, 3,
  'the longest portrait line still uses the three-row safety case');
setPresentationFrame(defaultFrame());
console.log('SCENERY LAYOUT: PASSED');
