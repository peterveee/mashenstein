// Plumber's sun is a sky object, not part of the scenery that follows a raised
// road. The background is rendered in a shifted context during a high jump;
// the sun must cancel that shift and keep its screen position.
import { installDom } from './dom-stub.js';
installDom();

const { getStylePack } = await import('../src/engine/stylePacks/index.js');
const { CABINETS } = await import('../src/data/cabinets.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

function recorder() {
  const ops = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    canvas: { width: 480, height: 270 },
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    fillRect(...args) { ops.push(['fillRect', ...args]); },
    beginPath() {},
    arc() {}, ellipse() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() {}, stroke() {},
    save() {}, restore() {},
    translate(...args) { ops.push(['translate', ...args]); },
    scale() {}, rotate() {}, clip() {}, drawImage() {},
  };
  return { ctx, ops };
}

const plumber = CABINETS.find((cab) => cab.id === 'plumber');
const pack = getStylePack('pixel', {});
function sunPosition(bgShift) {
  const { ctx, ops } = recorder();
  // Infinity skips the Plumber volcano; the first translate is still the sun,
  // before any cloud or hill painter gets a chance to add its own transform.
  pack.bg(ctx, 12, 0, plumber, Infinity, null, bgShift);
  return ops.find((op) => op[0] === 'translate');
}

const grounded = sunPosition(0);
const highJump = sunPosition(42);
assert(grounded && highJump && grounded[1] === highJump[1]
  && grounded[2] === highJump[2] + 42,
  'the Plumber sun stays fixed on screen when the raised-road background shifts');

console.log(failed ? 'PIXEL BACKGROUND: FAILED' : 'PIXEL BACKGROUND: PASSED');
process.exit(failed ? 1 : 0);
