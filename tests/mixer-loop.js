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
import { resolveTrack } from ${JSON.stringify(join(ROOT, 'src/data/tracks.js'))};
window.__Audio = Audio;
window.__resolveTrack = resolveTrack;
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

    // The Mixer may widen the foreground scheduler margin live, while an unfocused
    // page must retain at least the background safety window. This is intentionally
    // tested on the real AudioSys rather than by matching source text alone.
    const hasFocus = document.hasFocus;
    document.hasFocus = () => true;
    Audio.setSequencerLookahead(0.5);
    const focusedAhead = Audio.lookahead();
    Audio.setSequencerLookahead(1);
    document.hasFocus = () => false;
    const backgroundAhead = Audio.lookahead();
    Audio.setSequencerLookahead('invalid');
    document.hasFocus = hasFocus;
    const invalidAhead = Audio.lookahead();
    Audio.setSequencerLookahead(0.25);
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

    // Per-bar pan is the one arrangement transform that temporarily lives on a
    // channel strip. Make the first bar of the loop a rest for this lane, then put a
    // pan edit on the second bar. The wrap must clear that offset before the new
    // (silent) bar begins; waiting for the lane's next note would leave a release tail
    // and the strip's live state in the previous bar's position.
    const sparse = new Array(32).fill(null);
    sparse[16] = 440;
    const sparseLen = new Array(32).fill(null);
    sparseLen[16] = 1;
    const panBank = {
      bpm: 120,
      twinkle: sparse,
      twinkleLen: sparseLen,
      order: [
        { s: 0, bars: 1 },
        { s: 0, bars: 1, pan: { twinkle: -60 } },
      ],
    };
    Audio.setBank(panBank, { lanes: { twinkle: { pan: 0 } } });
    Audio.nextTime = 0;
    Audio.songTrim.gain.cancelScheduledValues(0);
    Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);
    Audio.setLoop(0, 32);
    Audio.step = 0;
    for (let i = 0; i < 32; i++) Audio.scheduleStep();
    const panBeforeSparseWrap = Audio.mixer.lane('twinkle').panOffset;
    Audio.scheduleStep(); // step 0 of the new loop; there is no twinkle note here
    const panAfterSparseWrap = Audio.mixer.lane('twinkle').panOffset;
    return {
      focusedAhead, backgroundAhead, invalidAhead,
      armed, atLocatorA, ...locatorLoop,
      beforePendingBoundary, afterPendingBoundary,
      beforePendingSeek, afterPendingSeek,
      panBeforeSparseWrap, panAfterSparseWrap,
    };
  });

  // A SONG'S OWN markers against a SELECTED range, as the desk's double-click meets
  // them. THE FOOD COURT comes in on bar 1 and repeats bars 9-28, so bars 1-8 are an
  // intro the game plays once — and pointing at one of them while the music runs has
  // to land there, not on the loop start. The same seek against a range the mixer
  // selected must still be pulled into that range, which is what a chosen loop is for.
  const seeks = await page.evaluate(async () => {
    const Audio = window.__Audio;
    const bank = window.__resolveTrack('hub').bank;
    Audio.setBank(bank, null);
    const song = {
      armed: Audio.formLoopArmed, start: Audio.loopStart, end: Audio.loopEnd,
    };
    // Inside the repeat, the way the transport is when you reach for an intro bar.
    Audio.step = 200;
    Audio.loopHasWrapped = true;
    Audio.setStepAtBoundary(16);                    // bar 2 — the intro
    const introQueued = { ...Audio.pendingStep };
    Audio.step = introQueued.boundary;
    Audio.applyPendingStep();
    const intro = { step: Audio.step, wrapped: Audio.loopHasWrapped,
      start: Audio.loopStart, end: Audio.loopEnd, armed: Audio.formLoopArmed };
    // Past the end there is nothing to hear: the wrap would pull it straight back.
    Audio.step = 200;
    Audio.setStepAtBoundary(Audio.loopEnd + 32);
    const pastEnd = Audio.pendingStep.step;
    // The desk's own selected range is a fence, whichever side you point at.
    Audio.setLoop(song.start, song.end);
    Audio.step = 200;
    Audio.setStepAtBoundary(16);
    const fenced = Audio.pendingStep.step;
    Audio.setBank(null);
    return { song, introQueued, intro, pastEnd, fenced };
  });
  await browser.close();

  for (const error of errors) assert(false, `page error — ${error}`);
  assert(out.focusedAhead === 0.5,
    'the foreground sequencer read-ahead can widen live to 500ms');
  assert(out.backgroundAhead === 1.5,
    'an unfocused page keeps at least the 1.5s background safety margin');
  assert(out.invalidAhead === 0.25,
    'an invalid read-ahead request falls back to the responsive 250ms default');
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
  assert(out.panBeforeSparseWrap === -0.6,
    'the sparse loop test reaches the second bar\'s -60 pan offset');
  assert(out.panAfterSparseWrap === 0,
    'a loop boundary resets per-bar pan before a silent first bar');

  assert(seeks.song.armed && seeks.song.start === 128 && seeks.song.end === 448,
    'THE FOOD COURT arms its own markers — bars 9-28, with bars 1-8 as the intro');
  assert(seeks.introQueued.step === 16 && seeks.introQueued.boundary === 208,
    'a seek to an intro bar under the song loop keeps the bar that was clicked');
  assert(seeks.intro.step === 16 && !seeks.intro.wrapped,
    'the intro seek lands on that bar rather than on the loop start');
  assert(seeks.intro.armed && seeks.intro.start === 128 && seeks.intro.end === 448,
    'the song loop survives the seek, so the intro plays once and then repeats');
  assert(seeks.pastEnd === 128,
    'a seek past the loop end still lands on the loop start — the wrap owns that side');
  assert(seeks.fenced === 128,
    'a seek outside a SELECTED range is still pulled into it');

  console.log(failed ? 'MIXER LOOP: FAILED' : 'MIXER LOOP: PASSED');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
