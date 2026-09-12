// Shared canvas text keeps the authored logical position while compensating for
// the actual loaded face. This is the small contract that prevents an iOS font
// rasterizer from disagreeing with the HUD's explicit ink-centering helper.
import { installDom } from './dom-stub.js';

const dom = installDom();
const createCanvas = document.createElement;
document.createElement = () => {
  const canvas = createCanvas();
  const getContext = canvas.getContext;
  canvas.getContext = (type, opts) => {
    const ctx = getContext(type, opts);
    if (type !== '2d' || !ctx) return ctx;
    ctx.measureText = () => ({ width: 120 });
    ctx.getImageData = () => {
      const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      const top = Math.round(8.2 * 8);
      const first = top + 10;
      const last = first + 47;
      for (let row = first; row <= last; row++) data[(row * canvas.width) * 4 + 3] = 255;
      return { data };
    };
    return ctx;
  };
  return canvas;
};

const { drawText, textYForMid, TEXT_INK_TOP, TEXT_INK_H } =
  await import('../src/engine/sprites.js?text-centering');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const ctx = dom.canvas.getContext('2d');
const referenceMid = TEXT_INK_TOP + TEXT_INK_H / 2;
const measuredMid = (10 + 24) / 8;
const expectedY = 20 + (referenceMid - measuredMid);
drawText(ctx, 'A', 4, 20, '#fff');
const blit = dom.contextCalls.find((call) => call.canvas === dom.canvas && call.method === 'drawImage');
assert(blit && Math.abs(blit.args[2] - (expectedY - 1)) < 1e-6,
  'drawText applies the measured face correction to legacy top coordinates');

const midY = 50;
const centredY = textYForMid(midY);
assert(Math.abs(centredY - (midY - referenceMid)) < 1e-6,
  'textYForMid stays in the shared reference coordinate system');
const before = dom.contextCalls.length;
drawText(ctx, 'A', 4, centredY, '#fff');
const centredBlit = dom.contextCalls.slice(before)
  .find((call) => call.canvas === dom.canvas && call.method === 'drawImage');
assert(centredBlit && Math.abs(centredBlit.args[2] - (midY - measuredMid - 1)) < 1e-6,
  'textYForMid and drawText compose without applying the iOS correction twice');

process.exitCode = failed ? 1 : 0;
