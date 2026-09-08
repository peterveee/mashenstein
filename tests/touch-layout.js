// The touch chrome layout against real device geometries: every disc on the
// picture, big enough for a thumb, the margins tiled by zones with no gaps and
// no overlaps, and nothing reaching into the picture. Pure module, no DOM.
import { layoutTouchChrome, fitFor, DISC_SLOP, MARGIN_MIN } from '../src/engine/touch-layout.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// CSS-px viewports and the env(safe-area-inset-*) each reports in that
// orientation. iOS reports the island's DEPTH on both sides in landscape.
const DEVICES = [
  { name: 'iPhone 15 Pro', vw: 852, vh: 393, safe: { right: 59, bottom: 21, left: 59 } },
  { name: 'iPhone 13 mini', vw: 812, vh: 375, safe: { right: 47, bottom: 21, left: 47 } },
  { name: 'iPhone SE', vw: 667, vh: 375, safe: {} },
  { name: 'iPad 11 landscape', vw: 1180, vh: 820, safe: { bottom: 20 } },
  { name: 'iPad 11 portrait', vw: 820, vh: 1180, safe: { top: 24, bottom: 20 } },
  { name: 'Pixel 8', vw: 915, vh: 412, safe: {} },
  { name: 'desktop window', vw: 1440, vh: 900, safe: {} },
];

const MIN_THUMB = 44;

// The picture, half-open so a point on its far edge counts as margin.
const inPicture = (fit, x, y) => x >= fit.ox && x < fit.ox + fit.cssW && y >= fit.oy && y < fit.oy + fit.cssH;
const inZone = (z, x, y) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h;
// Whether a margin point sits in a sliver too thin to be a zone (fit rounding).
function inSliver(fit, x, y) {
  const left = fit.ox, right = fit.vw - fit.ox - fit.cssW, top = fit.oy, bottom = fit.vh - fit.oy - fit.cssH;
  if (x < fit.ox && left < MARGIN_MIN) return true;
  if (x >= fit.ox + fit.cssW && right < MARGIN_MIN) return true;
  if (y < fit.oy && top < MARGIN_MIN) return true;
  if (y >= fit.oy + fit.cssH && bottom < MARGIN_MIN) return true;
  return false;
}

function checkZones(name, fit, list) {
  const zones = list.filter((b) => b.zone).map((b) => b.zone);
  let insideClaimed = 0, marginUnclaimed = 0, marginDouble = 0, samples = 0;
  for (let x = 1.5; x < fit.vw; x += 3) {
    for (let y = 1.5; y < fit.vh; y += 3) {
      const hits = zones.filter((z) => inZone(z, x, y)).length;
      if (inPicture(fit, x, y)) { if (hits) insideClaimed++; continue; }
      if (inSliver(fit, x, y)) continue;
      samples++;
      if (hits === 0) marginUnclaimed++;
      if (hits > 1) marginDouble++;
    }
  }
  assert(insideClaimed === 0, `${name}: no zone reaches into the picture (${insideClaimed} points claimed)`);
  assert(marginUnclaimed === 0, `${name}: every margin point belongs to a zone (${marginUnclaimed} of ${samples} unclaimed)`);
  assert(marginDouble === 0, `${name}: no margin point belongs to two zones (${marginDouble} doubled)`);
}

for (const d of DEVICES) {
  const fit = fitFor(d.vw, d.vh, d.safe);
  const lay = layoutTouchChrome(fit);
  const discs = lay.run.filter((b) => b.r != null);
  assert(discs.map((b) => b.id).join(',') === 'jump,slide,ability,pause', `${d.name}: the run registers its four discs`);
  for (const b of discs) {
    assert(b.x - b.r >= fit.ox && b.x + b.r <= fit.ox + fit.cssW && b.y - b.r >= fit.oy && b.y + b.r <= fit.oy + fit.cssH,
      `${d.name}: ${b.id} disc lies on the picture`);
    assert(b.r * 2 >= MIN_THUMB, `${d.name}: ${b.id} disc is at least ${MIN_THUMB} css px across (${Math.round(b.r * 2)})`);
  }
  // On the picture means inside the safe area by construction; say so anyway.
  for (const b of discs) {
    assert(b.x - b.r > fit.safe.left && b.x + b.r < fit.vw - fit.safe.right && b.y - b.r > fit.safe.top && b.y + b.r < fit.vh - fit.safe.bottom,
      `${d.name}: ${b.id} disc clears every reported inset`);
  }
  const jump = discs.find((b) => b.id === 'jump'), slide = discs.find((b) => b.id === 'slide');
  assert(Math.abs(jump.y - slide.y) < 1e-6, `${d.name}: JUMP is level with SLIDE`);
  assert(Math.abs(lay.split - (fit.ox + fit.cssW / 2)) <= 0.5, `${d.name}: the halves split where the picture's centre is`);
  checkZones(d.name, fit, lay.run);
  const noPower = lay.runNoPower;
  assert(!noPower.some((b) => b.id === 'ability') && !noPower.some((b) => b.action === 'ability'),
    `${d.name}: without a power there is no USE disc and no USE zone`);
  checkZones(`${d.name} (no power)`, fit, noPower);
  const hub = lay.hub;
  const arrows = hub.filter((b) => b.r != null);
  assert(arrows.map((b) => b.action).join(',') === 'left,right', `${d.name}: the food court registers its two arrows`);
  for (const b of arrows) {
    const onPicture = b.x - b.r >= fit.ox && b.x + b.r <= fit.ox + fit.cssW;
    const inLeftPillar = b.x + b.r <= fit.ox && b.x - b.r >= fit.safe.left;
    const inRightPillar = b.x - b.r >= fit.ox + fit.cssW && b.x + b.r <= fit.vw - fit.safe.right;
    assert(onPicture || inLeftPillar || inRightPillar,
      `${d.name}: ${b.id} arrow is on the picture or in a pillar clear of the inset`);
    assert(b.y - b.r >= 0 && b.y + b.r <= fit.vh - fit.safe.bottom, `${d.name}: ${b.id} arrow clears the home indicator`);
  }
  checkZones(`${d.name} (hub)`, fit, hub);
}

// The specific claims behind the design.
const pro = layoutTouchChrome(fitFor(852, 393, { right: 59, bottom: 21, left: 59 }));
const proArrows = pro.hub.filter((b) => b.r != null);
assert(proArrows.every((b) => b.x - b.r >= 76), 'a Pro iPhone pillar (76pt beside a 59pt inset) cannot hold an arrow, so both stay on the picture');
const pixel = layoutTouchChrome(fitFor(915, 412, {}));
const pixelLeft = pixel.hub.find((b) => b.id === 'hubLeft');
assert(pixelLeft.x + pixelLeft.r <= 91, 'a 91px pillar with no inset takes the walk arrow');
const proRight = pro.run.filter((b) => b.zone && b.zone.x >= 775).sort((a, b) => a.zone.y - b.zone.y);
assert(proRight.map((b) => b.action).join(',') === 'escape,ability,slide',
  'the right pillar reads PAUSE / USE / SLIDE from the top down');
const proPause = pro.run.find((b) => b.id === 'pause');
assert(Math.abs(proRight[0].zone.y + proRight[0].zone.h - (proPause.y + proPause.r)) < 1e-6,
  'the PAUSE band ends at the pause disc\'s bottom edge');
const ipad = layoutTouchChrome(fitFor(1180, 820, { bottom: 20 }));
const bands = ipad.run.filter((b) => b.zone).map((b) => `${b.id}=${b.action}`).join(' ');
assert(bands === 'zone:topLeft=jump zone:topRight=escape zone:bottomLeft=jump zone:bottomRight=slide',
  `an iPad's bands split JUMP | PAUSE above and JUMP | SLIDE below (${bands})`);
assert(DISC_SLOP > 0 && DISC_SLOP < 12, 'disc slop is a thumb\'s worth, not a zone\'s');

console.log(failed ? 'TOUCH LAYOUT: FAILED' : 'TOUCH LAYOUT: PASSED');
process.exit(failed ? 1 : 0);
