// A song's desk master is a MUSIC control. It must not make menu/tutorial SFX
// quieter just because the current song has a large negative master trim.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { MIX } from '../src/data/mix.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
import { TITLE_THEME } from ${JSON.stringify(join(ROOT, 'src/data/cabinets.js'))};
import { MIX } from ${JSON.stringify(join(ROOT, 'src/data/mix.js'))};
window.__measureSfx = async (name, withMix) => {
  const SR = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * 0.25), SR);
  Audio.setCaptureEnabled(false);
  Audio.setNoiseSeed(1);
  Audio.ensure(ctx);
  if (Audio.mixer) await Audio.mixer.ready;
  Audio.setBank(TITLE_THEME, withMix ? MIX.title : null);
  Audio.sfx(name);
  const rendered = await ctx.startRendering();
  let peak = 0;
  for (const channel of [rendered.getChannelData(0), rendered.getChannelData(1)]) {
    for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  }
  return peak;
};
`;

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('SFX ROUTING: playwright is required');
  process.exit(1);
}

const esbuild = require('esbuild');
const built = await esbuild.build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
});
const bundleJs = built.outputFiles[0].text;
const browser = await chromium.launch({ headless: true });
let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

async function measure(name, withMix) {
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><script>${bundleJs.replace(/<\/script>/gi, '<\\/script>')}</script>`);
  const peak = await page.evaluate(({ name, withMix }) => window.__measureSfx(name, withMix), { name, withMix });
  await page.close();
  return peak;
}

try {
  assert(MIX.title.master < -10, 'the title fixture has a strongly negative song master trim');
  for (const name of ['uiConfirm', 'coin']) {
    const clean = await measure(name, false);
    const withMix = await measure(name, true);
    assert(clean > 0.001, `${name} renders an audible SFX signal`);
    assert(withMix > clean * 0.95,
      `${name} keeps its level when the title song mix is loaded (${clean.toFixed(4)} -> ${withMix.toFixed(4)})`);
  }
} finally {
  await browser.close();
}

console.log(failed ? 'SFX ROUTING: FAILED' : 'SFX ROUTING: PASSED');
process.exit(failed ? 1 : 0);
