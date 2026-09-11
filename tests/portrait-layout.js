import assert from 'node:assert/strict';
import { frameForViewport } from '../src/engine/frame.js';
import { portraitHudLayout, PORTRAIT_HUD_TOP_CLEARANCE_CSS } from '../src/game/portrait-layout.js';

const phones = [
  { width: 390, height: 844, safeInsets: { top: 59, right: 0, bottom: 34, left: 0 } },
  { width: 320, height: 568, safeInsets: { top: 24, right: 0, bottom: 20, left: 0 } },
  { width: 430, height: 932, safeInsets: { top: 59, right: 0, bottom: 34, left: 0 } },
];

for (const viewport of phones) {
  const frame = frameForViewport({
    mode: 'phone-portrait',
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    safeInsets: viewport.safeInsets,
  });
  const layout = portraitHudLayout(frame);
  const label = `${viewport.width}x${viewport.height}`;
  assert.equal(frame.mode, 'phone-portrait', `${label} remains a portrait frame`);
  assert.ok(layout.left >= frame.safeRect.left && layout.right <= frame.safeRect.right,
    `${label} HUD clears the horizontal safe area`);
  assert.ok(layout.statusY >= frame.safeRect.top && layout.actionY < frame.safeRect.bottom,
    `${label} HUD stays inside the vertical safe area`);
  assert.ok(layout.railY >= frame.safeRect.top + PORTRAIT_HUD_TOP_CLEARANCE_CSS / frame.scale,
    `${label} top rail leaves the authored status/notch breathing band`);
  assert.equal(layout.railLeft, frame.safeRect.left,
    `${label} timeline starts at the horizontal safe edge`);
  assert.equal(layout.railRight, frame.safeRect.right,
    `${label} timeline reaches the horizontal safe edge`);
  assert.ok(layout.railH * frame.scale >= 8,
    `${label} timeline keeps the thicker 8px CSS stroke`);
  assert.ok(layout.statusY + layout.statusH + layout.gap <= layout.goalY,
    `${label} status and goal do not overlap`);
  assert.ok(layout.goalY + layout.goalH + layout.gap <= layout.bonusY,
    `${label} goal and bonus do not overlap`);
  assert.ok(layout.bonusY + layout.bonusH <= layout.rhythmY,
    `${label} bonus leaves room for the rhythm band`);
  assert.ok(layout.rhythmY + layout.rhythmH <= layout.chatterY,
    `${label} rhythm band and chatter do not overlap`);
  assert.ok(layout.floatieY < layout.actionY,
    `${label} floaties have a clear run above the action shelf`);
  const labelHalfH = 7 * layout.actionLabelScale;
  assert.ok(layout.actionY + labelHalfH < frame.safeRect.bottom,
    `${label} action labels clear the bottom safe edge`);
  assert.ok(layout.actionY - labelHalfH > frame.safeRect.bottom - 40 / frame.scale,
    `${label} action labels stay in the bottom strip under the controls`);
  assert.ok(layout.panelScale >= 2.15,
    `${label} primary HUD text keeps the minimum portrait scale`);
}

const landscape = frameForViewport({ mode: 'landscape', viewportWidth: 844, viewportHeight: 390 });
const landscapeLayout = portraitHudLayout(landscape);
assert.ok(landscapeLayout.right - landscapeLayout.left > 400,
  'layout resolver remains usable when called with the default landscape frame');
console.log('PORTRAIT HUD LAYOUT: PASSED');
