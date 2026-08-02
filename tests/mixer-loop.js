// The mixer passes locator positions to the game's real sequencer as song-relative
// steps. This is the audio-side proof that an armed region wraps at those bounds,
// including when Play from start restores the transport to step zero after arming.
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = `
import { Audio } from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = Audio;
`;

let failed = false;
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
};

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('FAIL: playwright is required: npm install');
    process.exit(1);
  }
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundleJs = built.outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent(`<!doctype html><meta charset="utf-8">`
    + `<script>${bundleJs.replace(/<\/script/gi, '<\\/script')}<\/script>`,
  { waitUntil: 'load' });

  const out = await page.evaluate(async () => {
    const Audio = window.__Audio;
    const ctx = new OfflineAudioContext(2, 44100 * 4, 44100);
    const rest = () => new Array(32).fill(null);
    const bank = { bpm: 120, bass: rest(), bassLen: rest(), bassGain: 0.2 };
    bank.bass[0] = 220;
    bank.bassLen[0] = 1;
    Audio.setCaptureEnabled(false);
    Audio.setNoiseSeed(1);
    Audio.ensure(ctx);
    if (Audio.mixer) await Audio.mixer.ready;
    Audio.setBank(bank, null);
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);

    Audio.setLoop(8, 12);
    const armed = { start: Audio.loopStart, end: Audio.loopEnd, step: Audio.step };
    Audio.step = 0; // applyLoopNoJump's deliberate override for Play from start
    for (let i = 0; i < 8; i++) Audio.scheduleStep();
    const atLocatorA = Audio.step;
    for (let i = 0; i < 4; i++) Audio.scheduleStep();
    const locatorLoop = {
      afterWrap: Audio.step, wrapped: Audio.loopHasWrapped,
      loopStart: Audio.loopStart, loopEnd: Audio.loopEnd,
    };
    Audio.setLoop(0, 48);
    Audio.step = 0;
    for (let i = 0; i < 15; i++) Audio.scheduleStep();
    Audio.setLoopAtBoundary(16, 48);
    const beforePendingBoundary = {
      loopStart: Audio.loopStart, loopEnd: Audio.loopEnd, step: Audio.step,
      pending: Audio.pendingLoop,
    };
    Audio.scheduleStep();
    const afterPendingBoundary = {
      loopStart: Audio.loopStart, loopEnd: Audio.loopEnd, step: Audio.step,
      pending: Audio.pendingLoop,
    };
    Audio.setLoop();
    Audio.step = 0;
    for (let i = 0; i < 15; i++) Audio.scheduleStep();
    Audio.setStepAtBoundary(32);
    const beforePendingSeek = { step: Audio.step, pending: Audio.pendingStep };
    Audio.scheduleStep();
    const afterPendingSeek = { step: Audio.step, pending: Audio.pendingStep };
    return {
      armed, atLocatorA, ...locatorLoop,
      beforePendingBoundary, afterPendingBoundary,
      beforePendingSeek, afterPendingSeek,
    };
  });
  await browser.close();

  for (const error of errors) assert(false, `page error — ${error}`);
  assert(out.armed.start === 8 && out.armed.end === 12,
    'the engine receives the two locator steps as the loop bounds');
  assert(out.atLocatorA === 8,
    'Play from start reaches locator A without jumping into the region first');
  assert(out.afterWrap === 8 && out.wrapped,
    'the scheduler wraps from locator B back to locator A');
  assert(out.loopStart === 8 && out.loopEnd === 12,
    'the loop remains anchored to the same song-relative locator bounds');
  assert(out.beforePendingBoundary.loopStart === 0
    && out.beforePendingBoundary.loopEnd === 48
    && out.beforePendingBoundary.step === 15
    && out.beforePendingBoundary.pending?.start === 16
    && out.beforePendingBoundary.pending?.end === 48,
  'a changed selection stays queued on the currently playing bar until its boundary');
  assert(out.afterPendingBoundary.loopStart === 16
    && out.afterPendingBoundary.loopEnd === 48
    && out.afterPendingBoundary.step === 16
    && out.afterPendingBoundary.pending == null,
  'the newest selection becomes the active loop exactly at the boundary');
  assert(out.beforePendingSeek.step === 15
    && out.beforePendingSeek.pending?.step === 32
    && out.beforePendingSeek.pending?.boundary === 16,
  'a normal playing seek stays queued until the current bar completes');
  assert(out.afterPendingSeek.step === 32 && out.afterPendingSeek.pending == null,
  'the normal seek lands on the first step after that bar boundary');

  console.log(failed ? 'MIXER LOOP: FAILED' : 'MIXER LOOP: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
