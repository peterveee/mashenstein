// Landscape touch chrome: safe-area-aware rails, orientation swapping, and
// local hit zones that follow the visible controls even when they straddle the
// edge of the game picture.
import {
  DISC_SLOP, MARGIN_MIN, fitFor, landscapeControlSide, layoutTouchChrome,
} from '../src/engine/touch-layout.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const DEVICES = [
  { name: 'iPhone 15 Pro', vw: 852, vh: 393, safe: { right: 59, bottom: 21, left: 59 } },
  { name: 'iPhone 13 mini', vw: 812, vh: 375, safe: { right: 47, bottom: 21, left: 47 } },
  { name: 'iPhone SE', vw: 667, vh: 375, safe: {} },
  { name: 'iPad 11 landscape', vw: 1180, vh: 820, safe: { bottom: 20 } },
  { name: 'Pixel 8', vw: 915, vh: 412, safe: {} },
  { name: 'desktop window', vw: 1440, vh: 900, safe: {} },
];

const MIN_THUMB = 44;
const discsOf = (list) => list.filter((b) => b.r != null);
const zonesOf = (list) => list.filter((b) => b.zone);
const safeRect = (fit) => ({
  left: fit.safe.left,
  right: fit.vw - fit.safe.right,
  top: fit.safe.top,
  bottom: fit.vh - fit.safe.bottom,
});

function zoneContainsDisc(z, b) {
  return z.x <= b.x - b.r + 0.001
    && z.x + z.w >= b.x + b.r - 0.001
    && z.y <= b.y - b.r + 0.001
    && z.y + z.h >= b.y + b.r - 0.001;
}

function zonesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
    && a.y < b.y + b.h && a.y + a.h > b.y;
}

function checkLandscape(device, fit, expectedSide) {
  const layout = layoutTouchChrome(fit);
  const discs = discsOf(layout.run);
  const zones = zonesOf(layout.run);
  const safe = safeRect(fit);
  assert(layout.landscapeSide === expectedSide,
    `${device.name}: resolves ${expectedSide} control rail`);
  assert(discs.map((b) => b.id).join(',') === 'pause,jump,ability,slide',
    `${device.name}: pause plus the three action discs are registered`);

  for (const b of discs) {
    assert(b.x - b.r >= -0.001 && b.x + b.r <= fit.vw + 0.001
      && b.y - b.r >= safe.top - 0.001 && b.y + b.r <= safe.bottom + 0.001,
    `${device.name}: ${b.id} disc stays in the viewport`);
    assert(b.r * 2 >= MIN_THUMB,
      `${device.name}: ${b.id} disc is at least ${MIN_THUMB} css px across (${Math.round(b.r * 2)})`);
    const z = zones.find((candidate) => candidate.id === `zone:${b.id}`)?.zone;
    assert(!!z && zoneContainsDisc(z, b), `${device.name}: ${b.id} hit zone surrounds its disc`);
  }

  const actionIds = ['jump', 'ability', 'slide'];
  const actionDiscs = actionIds.map((id) => discs.find((b) => b.id === id));
  const actionOnLeft = expectedSide === 'right';
  assert(actionDiscs.every((b) => actionOnLeft ? b.x < fit.vw / 2 : b.x > fit.vw / 2),
    `${device.name}: jump/power/slide use the rail opposite the notch`);
  const actionMargin = actionOnLeft ? fit.ox : fit.vw - fit.ox - fit.cssW;
  assert(actionMargin < actionDiscs[0].r * 2
    ? actionDiscs.every((b) => actionOnLeft ? b.x - b.r <= 0.001 : b.x + b.r >= fit.vw - 0.001)
    : actionDiscs.every((b) => actionOnLeft
      ? Math.abs(b.x - fit.ox / 2) < 0.001
      : Math.abs(b.x - (fit.ox + fit.cssW + actionMargin / 2)) < 0.001),
  `${device.name}: action controls are centered in the available rail${actionMargin < actionDiscs[0].r * 2 ? ' edge' : ' margin'}`);
  const gaps = actionDiscs.slice(1).map((b, i) => b.y - actionDiscs[i].y);
  assert(Math.abs(gaps[0] - gaps[1]) < 0.01,
    `${device.name}: jump/power/slide are evenly spread vertically`);
  assert(actionDiscs[2].y - actionDiscs[0].y < fit.vh * 0.7,
    `${device.name}: action rail stays clear of the top and bottom HUD bands`);
  const pause = discs.find((b) => b.id === 'pause');
  assert(pause.y < actionDiscs[0].y,
    `${device.name}: pause is the upper control on its own rail`);
  const pauseMargin = expectedSide === 'left'
    ? fit.ox : fit.vw - fit.ox - fit.cssW;
  if (pauseMargin >= pause.r * 2) {
    const pauseCenter = expectedSide === 'left'
      ? fit.ox / 2 : fit.ox + fit.cssW + pauseMargin / 2;
    assert(Math.abs(pause.x - pauseCenter) < 0.001,
      `${device.name}: pause is centered in its available rail margin`);
  }
  assert(zones.every((entry) => {
    const z = entry.zone;
    return z.x >= -0.001 && z.x + z.w <= fit.vw + 0.001
      && z.y >= safe.top - 0.001 && z.y + z.h <= safe.bottom + 0.001;
  }), `${device.name}: hit zones stay inside the safe rectangle`);
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      assert(!zonesOverlap(zones[i].zone, zones[j].zone),
        `${device.name}: ${zones[i].id} and ${zones[j].id} do not overlap`);
    }
  }

  const noPower = discsOf(layout.runNoPower);
  assert(!noPower.some((b) => b.id === 'ability'),
    `${device.name}: the no-power layout removes the power disc`);
  assert(noPower.some((b) => b.id === 'jump') && noPower.some((b) => b.id === 'slide'),
    `${device.name}: the no-power layout keeps jump and slide`);
}

for (const device of DEVICES) {
  checkLandscape(device, fitFor(device.vw, device.vh, device.safe), 'left');
}

// Equal left/right insets are common on iOS landscape, so orientation is the
// deciding signal there. The two rotations swap the rails, and an asymmetric
// inset wins if a browser gives us one.
const pro = { vw: 852, vh: 393, safe: { left: 59, right: 59, bottom: 21 } };
checkLandscape({ name: 'iPhone 15 Pro, landscape-secondary' },
  fitFor(pro.vw, pro.vh, pro.safe, { angle: 270, type: 'landscape-secondary' }), 'right');
assert(landscapeControlSide({ safe: { left: 72, right: 20 }, orientationAngle: 90 }) === 'left',
  'an asymmetric left safe inset wins over the angle fallback');
assert(landscapeControlSide({ safe: { left: 20, right: 72 }, orientationAngle: 270 }) === 'right',
  'an asymmetric right safe inset wins over the angle fallback');
assert(landscapeControlSide({ safe: { left: 59, right: 59 }, orientationAngle: 270, orientationType: 'landscape-primary' }) === 'right',
  'the measured angle wins when a platform labels that rotation primary');

// The portrait fallback remains available to callers that use this pure module
// directly; shipped phone portrait gameplay uses portrait-input.js instead.
const portrait = layoutTouchChrome(fitFor(820, 1180, { top: 24, bottom: 20 }));
assert(discsOf(portrait.run).length === 4, 'portrait fallback retains its four controls');
assert(discsOf(portrait.run).every((b) => b.x >= 0 && b.x <= 820 && b.y >= 0 && b.y <= 1180),
  'portrait fallback controls remain in the viewport');
assert(DISC_SLOP > 0 && DISC_SLOP < 12, 'disc slop is a thumb-sized allowance');
assert(MARGIN_MIN > 0, 'fit rounding still ignores paper-thin margins');

console.log(failed ? 'TOUCH LAYOUT: FAILED' : 'TOUCH LAYOUT: PASSED');
process.exit(failed ? 1 : 0);
