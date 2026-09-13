// Portrait gameplay HUD geometry.  This module is deliberately DOM-free: the
// renderer publishes a logical portrait frame, and the HUD uses the same
// safe-area math on every phone size.  Landscape keeps its existing geometry.

import { portraitGeometry, PORTRAIT_CHAT_CARD_MAX_CSS } from '../engine/portrait-geometry.js';
import { cornerInsetAt } from '../engine/platform.js';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Portrait chatter is split by job: short feedback stays above the hero, while
// dialogue gets the lower message shelf. These are overlay units, not world
// units, so they do not inherit the camera zoom.
export const PORTRAIT_FLOATIE_GAP_CSS = 6;
export const PORTRAIT_FLOATIE_MAX_LINES = 2;
export const PORTRAIT_FLOATIE_ROW = 10;
export const PORTRAIT_FLOATIE_PADDING = 8;
export const PORTRAIT_FLOATIE_HERO_HEIGHT = 24;
// The resting portrait magnification, for the one HUD measurement that has to
// know how tall the drawn hero is: the chatter hangs above the standing hero's
// crown, so it needs his drawn height.
//
// This MUST track the camera's resting zoom in src/dev/portrait-lab.js. It is
// a literal rather than an import because portrait-layout is DOM-free HUD
// geometry and has no business importing dev state — but that makes it a
// second copy, and a stale one floats the chatter a hero-height off. It was
// 3.75 while the camera came down to 3.5, which sat the cards higher and
// emptier than they had been. If the resting zoom moves again, move this.
export const PORTRAIT_FLOATIE_WORLD_ZOOM = 3.5;
export const PORTRAIT_CHAT_MAX_LINES = 3;
export const PORTRAIT_CHAT_ROW = 11;
export const PORTRAIT_CHAT_PADDING = 8;

function portraitPanelScale(scale) {
  return clamp(13 / (6 * scale), 2.15, 2.8);
}

export function portraitFloatieScale(frame, panelScale = null) {
  const scale = Number.isFinite(Number(frame?.scale)) && Number(frame.scale) > 0
    ? Number(frame.scale) : 1;
  const panel = panelScale != null && Number.isFinite(Number(panelScale))
    ? Number(panelScale) : portraitPanelScale(scale);
  return Math.max(1.8, Math.min(2.4, panel * 0.85));
}

export function portraitChatScale(frame, layout = null) {
  const scale = Number.isFinite(Number(frame?.scale)) && Number(frame.scale) > 0
    ? Number(frame.scale) : 1;
  const resolved = layout || portraitHudLayout(frame);
  const target = clamp(resolved.panelScale * 0.70, 1.4, 2.15);
  // Keep a 2px physical buffer inside the 64px shelf. The cap is derived from
  // the real card height, so large phones do not silently overflow the shelf
  // just because their logical frame is shorter.
  const fit = (resolved.messageShelfHeightCss - 2)
    / ((PORTRAIT_CHAT_MAX_LINES * PORTRAIT_CHAT_ROW + PORTRAIT_CHAT_PADDING) * scale);
  return Math.max(1.4, Math.min(target, fit));
}

function portraitFloatieBaseYFor(frame, layout, {
  zoom = PORTRAIT_FLOATIE_WORLD_ZOOM,
  heroHeight = PORTRAIT_FLOATIE_HERO_HEIGHT,
  floatScale = null,
} = {}) {
  const scale = Number.isFinite(Number(frame?.scale)) && Number(frame.scale) > 0
    ? Number(frame.scale) : 1;
  const s = floatScale != null && Number.isFinite(Number(floatScale))
    ? Number(floatScale) : portraitFloatieScale(frame, layout.panelScale);
  const cardH = (PORTRAIT_FLOATIE_MAX_LINES * PORTRAIT_FLOATIE_ROW
    + PORTRAIT_FLOATIE_PADDING) * s;
  const ground = Number.isFinite(Number(frame?.groundScreenY))
    ? Number(frame.groundScreenY) : 232;
  const heroTop = ground - Number(zoom || PORTRAIT_FLOATIE_WORLD_ZOOM) * heroHeight;
  const gap = PORTRAIT_FLOATIE_GAP_CSS / scale;
  // `y` is the first text row; the panel itself starts four scaled units above
  // it. Put the largest possible floatie above the standing hero, while still
  // keeping its panel below the permanent HUD band.
  const aboveHero = heroTop - gap - cardH + 4 * s;
  const hudFloor = layout.gameplayTop + 4 * s;
  // Bias upward when quantising. Rounding down in screen space is the safe
  // side here: a card that is a fraction above the hero remains above him,
  // while rounding into the hero makes the intended separation disappear.
  return Math.floor(Math.max(hudFloor, aboveHero));
}

export function portraitFloatieBaseY(frame, options = {}) {
  const layout = options.layout || portraitHudLayout(frame);
  return portraitFloatieBaseYFor(frame, layout, options);
}
// The gap between the safe-area edge and the first HUD ink.
//
// It is ADDITIONAL to the inset, and with the OPAQUE status-bar style the inset
// is usually zero: iOS reserves its own band above the page, so the page's top
// edge already sits below the status bar and the cutout is somebody else's
// problem. What is left for this number to buy is distance from the soft edge
// where that reserved band meets our picture — measured at 60-75pt from the top
// of a 17 Pro's display, against a page that starts at 62 — plus the breathing
// room a punch-hole Android or a browser tab wants, where the band does not
// exist at all and this is the only gap there is.
//
// 20 puts the first HUD ink at 82 from the top of the display on a 17 Pro, and
// that number is measured, not chosen. Drawing a row of identical white-on-
// black patches down the top of the screen and reading them off a screenshot
// gives the wash's profile exactly: 16.7% dimming at 70, 11.1% at 74, 6.9% at
// 78, 2.8% at 82, and nothing at all by 86. 2.8% is about seven values out of
// 255 — past the point anyone can see it, and eight pixels higher than playing
// safe at 90 would put the row. Above 78 it starts to show.
export const PORTRAIT_HUD_TOP_CLEARANCE_CSS = 20;
// THE TIMELINE LIVES ON THE BOTTOM EDGE. It is a progress bar, not an
// instrument to be read mid-jump, and at the top it cost the whole HUD stack a
// row. FLUSH: it ends where the glass ends. The display's corner radius clips
// the last few pixels of each end, which is the intended look — the bar runs
// off the screen rather than floating above it — and the fill and the
// checkpoint notches all live well inside the curve. Raise this if the ends
// ever need to be legible.
export const PORTRAIT_TIMELINE_BOTTOM_CSS = 0;
export const PORTRAIT_TIMELINE_HEIGHT_CSS = 4;
// Checkpoint notches must remain a visible mark on narrow portrait rails. Keep
// this in CSS pixels, then convert it to logical canvas units below; it is a
// minimum physical stroke, never a percentage of the phone width.
export const PORTRAIT_TIMELINE_MARKER_MIN_CSS = 4;
// Portrait objectives are an opening read, not permanent furniture. They sit
// over the first scenery band for five seconds, then leave through the left
// edge beneath the permanent status HUD so the camera never reserves their rows.
export const PORTRAIT_OBJECTIVE_HOLD_SEC = 5;
export const PORTRAIT_OBJECTIVE_SLIDE_SEC = 0.65;
// Progress notices use the same objective column, but are short-lived event
// cards rather than the opening read. They enter and leave horizontally so a
// notice never drops through the playfield or stacks with the other objective.
export const PORTRAIT_OBJECTIVE_NOTICE_SEC = 2.8;
export const PORTRAIT_OBJECTIVE_NOTICE_ENTRY_SEC = 0.25;
export const PORTRAIT_OBJECTIVE_NOTICE_EXIT_SEC = 0.3;
let cachedKey = '';
let cachedLayout = null;

const smoothstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function portraitObjectiveSlide(elapsed = 0) {
  const seconds = Number.isFinite(Number(elapsed)) ? Number(elapsed) : 0;
  const t = (seconds - PORTRAIT_OBJECTIVE_HOLD_SEC)
    / PORTRAIT_OBJECTIVE_SLIDE_SEC;
  return smoothstep(Math.max(0, Math.min(1, t)));
}

/**
 * Return the logical portrait HUD bands.  `frame.scale` converts logical
 * pixels to CSS pixels, so the margins and minimum text sizes below stay
 * meaningful on both small and large phones.
 */
export function portraitHudLayout(frame, options = {}) {
  const scale = Number.isFinite(frame?.scale) && frame.scale > 0 ? frame.scale : 1;
  const safe = frame?.safeRect || { left: 0, top: 0, right: 480, bottom: 270 };
  const rhythmStage = options?.rhythmStage === true;
  const key = [frame?.revision ?? -1, scale, safe.left, safe.top, safe.right, safe.bottom,
    frame?.height ?? -1, frame?.cornerRadiusCss ?? 0, rhythmStage ? 1 : 0].join('|');
  if (key === cachedKey && cachedLayout) return cachedLayout;
  const css = (px) => px / scale;
  const safeWidth = Number.isFinite(safe.width) ? safe.width : Math.max(0, safe.right - safe.left);
  const margin = css(12);
  const gap = css(8);
  // The progress rail is the one HUD element allowed to use the entire safe
  // width. Four CSS pixels keeps it readable as a timeline without crowding the
  // bottom action labels while the panels below retain their inset, centered
  // column.
  const railH = css(PORTRAIT_TIMELINE_HEIGHT_CSS);
  const railMarkerW = css(PORTRAIT_TIMELINE_MARKER_MIN_CSS);
  // OFF THE CURVE, not off the safe rectangle. A bar flush to the bottom loses
  // its ends to the display's rounded corners — the first movement and the last
  // few percent are exactly the parts you watch for, and they were behind the
  // radius. Inset each end by how far the edge has curved in at the bar's TOP
  // row: that is the shallowest point of the bar, so the whole top edge lands
  // on flat glass while the bar's lower corners tuck into the curve. Zero on
  // anything that is not an iPhone (see displayCornerRadiusCss) — a square
  // screen must not pay a permanent margin for a curve it does not have.
  const railTopFromBottom = PORTRAIT_TIMELINE_BOTTOM_CSS + PORTRAIT_TIMELINE_HEIGHT_CSS;
  const railCornerInset = css(cornerInsetAt(Number(frame?.cornerRadiusCss) || 0,
    railTopFromBottom));
  // Measured from the PHYSICAL bottom, like the action discs: the frame now
  // reaches the glass, and the rail is the thing closest to it.
  const frameBottom = Number.isFinite(frame?.height) ? frame.height : safe.bottom;
  const railY = frameBottom - railH - css(PORTRAIT_TIMELINE_BOTTOM_CSS);
  // The landscape HUD's glyphs are about 6 logical px high.  This scale makes
  // the primary portrait ink roughly 12–13 CSS px without letting the panels
  // consume the whole safe frame on a narrow phone.
  const panelScale = portraitPanelScale(scale);
  // The status row starts at the authored breathing band. Rhythm's rail sits
  // immediately below it, with the temporary objective cards following.
  const statusY = safe.top + css(PORTRAIT_HUD_TOP_CLEARANCE_CSS);
  const statusH = 18 * panelScale;
  const goalH = 18 * panelScale;
  const topHudBottom = statusY + statusH;
  const bonusScale = Math.max(0.9, panelScale * 0.9);
  // drawObjectivePanel receives `bonusScale` as its text scale, but uses its
  // full 18px row whenever that scale is >= 1.  Keep the resolver's band
  // measured from the painter's actual panel height rather than from the
  // smaller glyph scale, otherwise the chatter row can sit inside BONUS on
  // the smallest phones.
  const bonusH = 12 * panelScale;
  // Rhythm's rail is permanent; both opening objective panels are temporary.
  // Put the rail immediately below the status HUD, then let GOAL and BONUS
  // occupy the transient bands underneath it. Their painters share `left`
  // below, making the two rows one readable column even when their words have
  // different widths.
  const rhythmH = css(40);
  const firstObjectiveY = topHudBottom + gap;
  const rhythmY = rhythmStage
    ? firstObjectiveY
    : firstObjectiveY + goalH + gap + bonusH + css(10);
  const goalY = rhythmStage
    ? rhythmY + rhythmH + gap
    : firstObjectiveY;
  const bonusY = rhythmStage
    ? goalY + goalH + gap
    : firstObjectiveY + goalH + gap;
  const bonusCompactY = goalY + (goalH - bonusH) / 2;
  const expandedObjectiveBottom = bonusY + bonusH;
  const compactObjectiveBottom = goalY + goalH;
  // GOAL and BONUS are startup overlays, not reserved HUD rows. Only the
  // status pill owns the camera's top edge; the objective panels paint over the
  // scenery that begins immediately below it and leave after their opening
  // read. Keep the old objective measurements in the result for diagnostics
  // and preview tools, but none of them moves the world boundary.
  const hudGroupBottom = statusY + statusH;
  const bonusRenderY = bonusY;
  // Keep the rhythm rail below the top HUD. On rhythm stages the temporary
  // BONUS card is deliberately measured below the rail instead of blocking it.
  const sceneryTop = hudGroupBottom;
  const portrait = portraitGeometry({
    width: frame?.width,
    height: frame?.height,
    scale,
    safeRect: safe,
  });
  // A profile may raise the ground above the shared chat floor. Never let a
  // stale/default frame put it lower than the floor derived from the largest
  // chat card, though; the camera and the composition tuner use this same
  // resolved lower edge.
  const frameGround = Number(frame?.groundScreenY);
  const groundScreenY = Number.isFinite(frameGround)
    ? Math.min(frameGround, portrait.groundFloorScreenY) : portrait.groundScreenY;
  // The message shelf belongs below the active world and above the touch
  // controls. It is deliberately reserved while empty so a line of dialogue
  // never pushes the ground or camera on the frame it appears.
  const chatterY = portrait.shelfTop + css(12);
  // Kept as a public diagnostic anchor for the portrait lab. RunState refines
  // this with its live camera zoom through portraitFloatieBaseY().
  const floatieY = portraitFloatieBaseYFor(frame, {
    gameplayTop: sceneryTop,
    panelScale,
  });
  // TWO STRIPS, SPLIT BY WHAT THE NAME IS FOR.
  //
  // The hero's power is a property of the disc you press, so it hangs directly
  // UNDER the middle disc and reads as its caption. Power-ups are temporary
  // state that belongs to the run, not to a control, so they keep the strip
  // ABOVE the row where the shelf already reserves room for them. Splitting
  // them also stops a picked-up capsule from shoving the power's own name
  // sideways mid-run.
  const actionLabelScale = Math.max(1.55, Math.min(1.9, panelScale * 0.68));
  const actionY = portrait.actionTop - css(4) - 7 * actionLabelScale;
  const powerLabelY = portrait.actionBottom + css(4) + 7 * actionLabelScale;
  const nextLayout = {
    scale,
    panelScale,
    margin,
    gap,
    left: safe.left + margin,
    right: safe.right - margin,
    center: (safe.left + safe.right) / 2,
    railLeft: safe.left + railCornerInset,
    railRight: safe.right - railCornerInset,
    railY,
    railH,
    railMarkerW,
    statusY,
    statusH,
    goalY,
    goalH,
    bonusY,
    bonusH,
    bonusCompactY,
    bonusRenderY,
    expandedObjectiveBottom,
    compactObjectiveBottom,
    hudGroupBottom,
    bonusScale,
    rhythmY,
    rhythmH,
    chatterY,
    floatieY,
    messageShelfTop: portrait.shelfTop,
    messageShelfBottom: portrait.shelfBottom,
    messageShelfHeight: portrait.shelfBottom - portrait.shelfTop,
    messageShelfHeightCss: portrait.shelfHeightCss,
    gameplayTop: sceneryTop,
    gameplayBottom: groundScreenY,
    groundScreenY,
    groundFloorScreenY: portrait.groundFloorScreenY,
    groundFloorRatio: portrait.groundFloorRatio,
    largestChatTop: portrait.largestChatTop,
    largestChatHeightCss: PORTRAIT_CHAT_CARD_MAX_CSS,
    sceneryTop,
    actionLabelScale,
    actionY,
    powerLabelY,
    // Chat cards may use nearly the whole safe width. Keep only a 4px CSS
    // gutter on each side; the old HUD margin made portrait dialogue wrap
    // early even though this shelf has no neighbouring HUD panel to clear.
    chatterWidth: Math.max(css(180), safeWidth - css(8)),
  };
  // The floatie helper needs the completed layout's gameplay floor, but the
  // layout also exposes the result for diagnostics and preview tooling.
  nextLayout.floatieY = portraitFloatieBaseYFor(frame, nextLayout);
  cachedLayout = Object.freeze(nextLayout);
  cachedKey = key;
  return cachedLayout;
}
