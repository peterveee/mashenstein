import assert from 'node:assert/strict';
import { frameForViewport } from '../src/engine/frame.js';
import {
  portraitHudLayout, PORTRAIT_HUD_TOP_CLEARANCE_CSS,
  PORTRAIT_TIMELINE_BOTTOM_CSS, PORTRAIT_TIMELINE_HEIGHT_CSS,
  PORTRAIT_TIMELINE_MARKER_MIN_CSS,
  portraitChatScale, portraitFloatieBaseY, portraitFloatieScale,
  portraitObjectiveSlide, PORTRAIT_OBJECTIVE_HOLD_SEC, PORTRAIT_OBJECTIVE_SLIDE_SEC,
  PORTRAIT_CHAT_MAX_LINES, PORTRAIT_CHAT_ROW, PORTRAIT_CHAT_PADDING,
  PORTRAIT_FLOATIE_MAX_LINES, PORTRAIT_FLOATIE_ROW, PORTRAIT_FLOATIE_PADDING,
  PORTRAIT_FLOATIE_GAP_CSS, PORTRAIT_FLOATIE_WORLD_ZOOM,
} from '../src/game/portrait-layout.js';
import { portraitTouchLayout } from '../src/engine/portrait-input.js';
import { cornerInsetAt } from '../src/engine/platform.js';

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
  const touch = portraitTouchLayout({
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    safeInsets: viewport.safeInsets,
  });
  const label = `${viewport.width}x${viewport.height}`;
  assert.equal(frame.mode, 'phone-portrait', `${label} remains a portrait frame`);
  assert.ok(layout.left >= frame.safeRect.left && layout.right <= frame.safeRect.right,
    `${label} HUD clears the horizontal safe area`);
  assert.ok(layout.statusY >= frame.safeRect.top && layout.actionY < frame.safeRect.bottom,
    `${label} HUD stays inside the vertical safe area`);
  assert.ok(Math.abs((frame.height - (layout.railY + layout.railH)) * frame.scale
    - PORTRAIT_TIMELINE_BOTTOM_CSS) < 1e-9,
  `${label} the timeline sits on the bottom edge, off the corner curve`);
  assert.ok(Math.abs((layout.statusY - frame.safeRect.top) * frame.scale
    - PORTRAIT_HUD_TOP_CLEARANCE_CSS) < 1e-9,
  `${label} the top stack starts at the authored breathing band, no rail above it`);
  // Square frame (no radius given): the bar uses the whole safe width.
  assert.equal(layout.railLeft, frame.safeRect.left,
    `${label} timeline starts at the horizontal safe edge on a square screen`);
  assert.equal(layout.railRight, frame.safeRect.right,
    `${label} timeline reaches the horizontal safe edge on a square screen`);
  const rounded = portraitHudLayout({ ...frame, cornerRadiusCss: 62, revision: -99 });
  const roundedInset = (rounded.railLeft - frame.safeRect.left) * frame.scale;
  const expectedRoundedInset = cornerInsetAt(62,
    PORTRAIT_TIMELINE_BOTTOM_CSS + PORTRAIT_TIMELINE_HEIGHT_CSS);
  assert.equal(roundedInset, expectedRoundedInset,
    `${label} a rounded display insets the timeline from the shortened rail's top edge`);
  assert.ok(Math.abs((frame.safeRect.right - rounded.railRight) * frame.scale - roundedInset) < 1e-9,
    `${label} both ends of the timeline clear the curve by the same amount`);
  assert.equal(layout.railH * frame.scale, PORTRAIT_TIMELINE_HEIGHT_CSS,
    `${label} timeline uses its ${PORTRAIT_TIMELINE_HEIGHT_CSS}px CSS portrait height`);
  const pauseCenterY = touch.controls.pause.cy;
  const statusCenterY = (layout.statusY + layout.statusH / 2) * frame.scale;
  assert.ok(Math.abs(pauseCenterY - statusCenterY) <= 2,
    `${label} pause centre aligns with the centre of the top HUD panel`);
  assert.ok(layout.railMarkerW * frame.scale >= PORTRAIT_TIMELINE_MARKER_MIN_CSS - 1e-9,
    `${label} checkpoint markers keep their ${PORTRAIT_TIMELINE_MARKER_MIN_CSS}px CSS minimum`);
  assert.ok(layout.statusY + layout.statusH + layout.gap <= layout.goalY,
    `${label} status and goal do not overlap`);
  assert.ok(layout.goalY + layout.goalH + layout.gap <= layout.bonusY,
    `${label} goal and bonus do not overlap`);
  assert.equal(layout.hudGroupBottom, layout.statusY + layout.statusH,
    `${label} only the main status HUD reserves the top edge`);
  assert.equal(layout.sceneryTop, layout.statusY + layout.statusH,
    `${label} scenery starts immediately below the main HUD`);
  assert.ok(layout.sceneryTop < layout.goalY,
    `${label} GOAL is an overlay inside the scenery band`);
  assert.equal(layout.left, frame.safeRect.left + 12 / frame.scale,
    `${label} objective stack uses the inset safe-frame left anchor`);
  assert.ok(layout.rhythmY > layout.sceneryTop,
    `${label} rhythm is an overlay inside the scenery, not reserved HUD space`);
  assert.ok(layout.rhythmY + layout.rhythmH <= layout.chatterY,
    `${label} rhythm band and chatter do not overlap`);
  const floatScale = portraitFloatieScale(frame, layout.panelScale);
  const floatBase = portraitFloatieBaseY(frame, {
    layout, zoom: PORTRAIT_FLOATIE_WORLD_ZOOM, heroHeight: 24, floatScale,
  });
  const floatCardH = (PORTRAIT_FLOATIE_MAX_LINES * PORTRAIT_FLOATIE_ROW
    + PORTRAIT_FLOATIE_PADDING) * floatScale;
  const floatPanelTop = floatBase - 4 * floatScale;
  const floatPanelBottom = floatPanelTop + floatCardH;
  const standingHeroTop = frame.groundScreenY - PORTRAIT_FLOATIE_WORLD_ZOOM * 24;
  assert.ok(floatPanelTop >= layout.gameplayTop - 1e-9,
    `${label} floaties stay below the permanent HUD`);
  assert.ok(floatPanelBottom <= standingHeroTop - PORTRAIT_FLOATIE_GAP_CSS / frame.scale + 1e-9,
    `${label} floaties sit above the standing hero with a clear gap`);
  assert.equal(layout.floatieY, floatBase,
    `${label} diagnostic floatie anchor matches the live portrait default`);
  const chatScale = portraitChatScale(frame, layout);
  const chatCardCss = (PORTRAIT_CHAT_MAX_LINES * PORTRAIT_CHAT_ROW
    + PORTRAIT_CHAT_PADDING) * chatScale * frame.scale;
  assert.ok(chatCardCss <= layout.messageShelfHeightCss - 2 + 1e-9,
    `${label} compact three-line chat fits inside the message shelf (${chatCardCss.toFixed(1)}px)`);
  const labelHalfH = 7 * layout.actionLabelScale;
  const discTop = Math.min(...['jump', 'slide', 'use']
    .map((id) => touch.controls[id])
    .map((c) => (c.cy - c.r) / frame.scale));
  assert.ok(layout.actionY + labelHalfH <= discTop,
    `${label} action labels sit above the action discs, not under them`);
  assert.ok(layout.actionY - labelHalfH >= layout.messageShelfBottom - 1e-9,
    `${label} action labels stay clear of the message shelf`);
  assert.ok(layout.powerLabelY + labelHalfH <= layout.railY + 1e-9,
    `${label} special label stays clear of the bottom progress rail`);
  assert.ok(layout.chatterWidth * frame.scale
    >= (frame.safeRect.right - frame.safeRect.left) * frame.scale - 8 - 1e-9,
  `${label} chat shelf keeps only a 4px CSS gutter on each side`);
  assert.ok(layout.panelScale >= 2.15,
    `${label} primary HUD text keeps the minimum portrait scale`);

  assert.equal(layout.bonusRenderY, layout.bonusY,
    `${label} BONUS keeps its opening overlay row until the shared slide`);

  const rhythm = portraitHudLayout(frame, { rhythmStage: true });
  assert.ok(rhythm.statusY + rhythm.statusH + rhythm.gap <= rhythm.rhythmY,
    `${label} rhythm rail sits below the permanent status HUD`);
  assert.ok(rhythm.rhythmY + rhythm.rhythmH + rhythm.gap <= rhythm.goalY,
    `${label} temporary GOAL sits below the rhythm rail`);
  assert.ok(rhythm.goalY + rhythm.goalH + rhythm.gap <= rhythm.bonusY,
    `${label} temporary BONUS sits below GOAL and the rhythm rail`);
}

assert.equal(portraitObjectiveSlide(0), 0, 'portrait objectives start fully visible');
assert.equal(portraitObjectiveSlide(PORTRAIT_OBJECTIVE_HOLD_SEC), 0,
  'portrait objectives hold for five seconds');
assert.ok(portraitObjectiveSlide(PORTRAIT_OBJECTIVE_HOLD_SEC + PORTRAIT_OBJECTIVE_SLIDE_SEC / 2) > 0
  && portraitObjectiveSlide(PORTRAIT_OBJECTIVE_HOLD_SEC + PORTRAIT_OBJECTIVE_SLIDE_SEC / 2) < 1,
  'portrait objectives are partway through their exit during the slide');
assert.equal(portraitObjectiveSlide(PORTRAIT_OBJECTIVE_HOLD_SEC + PORTRAIT_OBJECTIVE_SLIDE_SEC), 1,
  'portrait objectives finish sliding off after the five-second hold');

const landscape = frameForViewport({ mode: 'landscape', viewportWidth: 844, viewportHeight: 390 });
const landscapeLayout = portraitHudLayout(landscape);
assert.ok(landscapeLayout.right - landscapeLayout.left > 400,
  'layout resolver remains usable when called with the default landscape frame');
console.log('PORTRAIT HUD LAYOUT: PASSED');
