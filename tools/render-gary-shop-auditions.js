// Render same-source Gary's Shop effect auditions through the game's real engine.
//
// The files are deliberately kept in work/, which is ignored by git. This is an
// audition helper: it does not change the treatment used by the game.
//
// Usage:
//   node tools/render-gary-shop-auditions.js
import { createRequire } from 'module';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { COUNTER_DANCE_MIX_THEME } from '../src/data/shop-themes.js';
import { MIX } from '../src/data/mix.js';
import { wavBuffer, rmsOf, dbfs } from './lib/wav.js';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'work', 'auditions', 'garys-shop');
const SAMPLE_RATE = 44100;
const STEPS = 8 * 16;       // Eight bars: enough musical context, quick to compare.
const TAIL_SECONDS = 1.5;
const GAP_SECONDS = 0.75;
const OUTPUT_GAIN = 0.4;   // Shared -8 dB safety trim; effects can add peak energy.

const VARIANTS = [
  {
    file: '00-dry-reference.wav',
    title: 'Dry reference',
    effects: [],
  },
  {
    file: '01-wide-chorus.wav',
    title: 'Wide slow chorus',
    effects: [
      { id: 'chorus2', params: {
        rateSync: true, rateDivision: 2, delayMs: 18, depth: 0.72,
        density: 0.86, width: 1.35, feedback: 0.08, tone: 7200, wet: 0.62,
      } },
    ],
  },
  {
    file: '02-bitcrush-console.wav',
    title: 'Low-bit console colour',
    effects: [
      { id: 'bitcrusher', params: { bits: 6, drive: 0, tone: 10000, wet: 0.62 } },
    ],
  },
  {
    file: '03-open-vowel.wav',
    title: 'Open vowel / talkbox movement',
    effects: [
      { id: 'vowel', params: {
        voice: 'alto', stack: 'a e i o u', rateSync: true, rateDivision: 0.5,
        waveform: 'triangle', depth: 1, glide: 0.5, articulation: 0,
        reso: 1.4, spread: 0.8, tilt: 0.3, intensity: 0.1,
        excite: 0.04, breath: 0, body: 0.75, air: 0.4, wet: 0.8,
      } },
    ],
  },
  {
    file: '04-chorus-bitcrush.wav',
    title: 'Wide chorus into soft bitcrush',
    effects: [
      { id: 'chorus2', params: {
        rateSync: true, rateDivision: 2, delayMs: 16, depth: 0.58,
        density: 0.8, width: 1.2, feedback: 0.06, tone: 7800, wet: 0.48,
      } },
      { id: 'bitcrusher', params: { bits: 7, drive: 0, tone: 9500, wet: 0.48 } },
    ],
  },
  {
    file: '05-vowel-bitcrush.wav',
    title: 'Open vowel into soft bitcrush',
    effects: [
      { id: 'vowel', params: {
        voice: 'alto', stack: 'a e i o u', rateSync: true, rateDivision: 0.5,
        waveform: 'triangle', depth: 1, glide: 0.5, articulation: 0,
        reso: 1.4, spread: 0.8, tilt: 0.3, intensity: 0.1,
        excite: 0.04, breath: 0, body: 0.75, air: 0.4, wet: 0.8,
      } },
      { id: 'bitcrusher', params: { bits: 7, drive: 0, tone: 10000, wet: 0.42 } },
    ],
  },
];

// This page uses the same Audio singleton and mixer/effect implementations as the
// game. The browser is only here because OfflineAudioContext is not available in Node.
const ENTRY = [
  'import { Audio } from ' + JSON.stringify(join(ROOT, 'src', 'engine', 'audio.js')) + ';',
  'window.__renderGary = async ({ bank, mix, effects, steps, tail, sampleRate }) => {',
  '  const spb = (60 / bank.bpm) / 4;',
  '  const frames = Math.ceil((steps * spb + tail) * sampleRate);',
  '  const ctx = new OfflineAudioContext(2, frames, sampleRate);',
  '  Audio.setCaptureEnabled(false);',
  '  Audio.setNoiseSeed(0x5eed1);',
  '  Audio.ensure(ctx);',
  '  if (Audio.mixer) await Audio.mixer.ready;',
  '  Audio.setBank(bank, mix || null);',
  '  if (Audio.mixer) {',
  '    if (effects && effects.length) {',
  '      Audio.mixer.setTreatment(effects, bank.bpm || 120);',
  '      Audio.mixer.rampTreatment(1, 0, 0);',
  '    } else {',
  '      Audio.mixer.clearTreatment();',
  '      Audio.mixer.rampTreatment(0, 0, 0);',
  '    }',
  '  }',
  '  Audio.nextTime = 0;',
  '  Audio.step = 0;',
  '  Audio.songTrim.gain.cancelScheduledValues(0);',
  '  Audio.songTrim.gain.setValueAtTime(Audio.musicTrim, 0);',
  '  for (let i = 0; i < steps; i++) Audio.scheduleStep();',
  '  const buf = await ctx.startRendering();',
  '  const left = buf.getChannelData(0);',
  '  const right = buf.numberOfChannels > 1 ? buf.getChannelData(1) : left;',
  '  let peak = 0;',
  '  for (let i = 0; i < left.length; i++) {',
  '    const a = Math.abs(left[i]);',
  '    const b = Math.abs(right[i]);',
  '    if (a > peak) peak = a;',
  '    if (b > peak) peak = b;',
  '  }',
  '  const inter = new Float32Array(left.length * 2);',
  '  for (let i = 0; i < left.length; i++) {',
  '    inter[i * 2] = left[i];',
  '    inter[i * 2 + 1] = right[i];',
  '  }',
  '  window.__pcm = new Uint8Array(inter.buffer);',
  '  window.__pcmDownload = () => {',
  '    const blob = new Blob([window.__pcm], { type: "application/octet-stream" });',
  '    const a = document.createElement("a");',
  '    a.href = URL.createObjectURL(blob);',
  '    a.download = "gary-pcm.bin";',
  '    document.body.appendChild(a);',
  '    a.click();',
  '  };',
  '  return { bytes: window.__pcm.length, frames: left.length, seconds: left.length / sampleRate, peak };',
  '};',
].join('\n');

function peakOf(left, right) {
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  return peak;
}

function splitPcm(pcm, frames) {
  const inter = new Float32Array(pcm.buffer, pcm.byteOffset, frames * 2);
  const left = new Float32Array(frames);
  const right = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    left[i] = inter[i * 2];
    right[i] = inter[i * 2 + 1];
  }
  return { left, right };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { chromium } = require('playwright');
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const bundle = built.outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  const rendered = [];

  try {
    for (const variant of VARIANTS) {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.setContent(
        '<!doctype html><meta charset="utf-8"><script>'
        + bundle.replace(/<\/script>/gi, '<\\/script>')
        + '</script>',
        { waitUntil: 'load' },
      );

      let meta;
      try {
        meta = await page.evaluate(
          (args) => window.__renderGary(args),
          {
            bank: COUNTER_DANCE_MIX_THEME,
            mix: MIX.shop,
            effects: variant.effects,
            steps: STEPS,
            tail: TAIL_SECONDS,
            sampleRate: SAMPLE_RATE,
          },
        );
      } catch (error) {
        await page.close();
        throw new Error(
          'offline render failed for ' + variant.title + ': ' + error.message
          + (pageErrors.length ? '\n  page errors: ' + pageErrors.join('; ') : ''),
        );
      }

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.evaluate(() => window.__pcmDownload()),
      ]);
      const temp = join(OUT_DIR, '.gary-pcm-' + process.pid + '-' + Date.now() + '.bin');
      await download.saveAs(temp);
      await page.close();
      const pcm = readFileSync(temp);
      unlinkSync(temp);
      if (pcm.length !== meta.bytes) {
        throw new Error('PCM transfer truncated for ' + variant.title);
      }

      const channels = splitPcm(pcm, meta.frames);
      const output = join(OUT_DIR, variant.file);
      writeFileSync(output, wavBuffer([channels.left, channels.right], OUTPUT_GAIN));
      const peak = peakOf(channels.left, channels.right);
      rendered.push({ ...variant, ...channels, seconds: meta.seconds, peak });
      console.log(
        variant.file + ': ' + meta.seconds.toFixed(1) + 's, '
        + 'peak ' + dbfs(peak * OUTPUT_GAIN)
        + ', rms ' + rmsOf(channels.left, OUTPUT_GAIN).toFixed(3),
      );
    }
  } finally {
    await browser.close();
  }

  const gapFrames = Math.round(GAP_SECONDS * SAMPLE_RATE);
  const totalFrames = rendered.reduce((sum, item) => sum + item.left.length, 0)
    + gapFrames * Math.max(0, rendered.length - 1);
  const comparisonLeft = new Float32Array(totalFrames);
  const comparisonRight = new Float32Array(totalFrames);
  const timeline = [];
  let cursor = 0;
  for (const item of rendered) {
    const start = cursor / SAMPLE_RATE;
    comparisonLeft.set(item.left, cursor);
    comparisonRight.set(item.right, cursor);
    cursor += item.left.length;
    timeline.push(start.toFixed(2) + 's - ' + (cursor / SAMPLE_RATE).toFixed(2)
      + 's: ' + item.title + ' (' + item.file + ')');
    cursor += gapFrames;
  }
  writeFileSync(
    join(OUT_DIR, 'gary-shop-comparison.wav'),
    wavBuffer([comparisonLeft, comparisonRight], OUTPUT_GAIN),
  );
  writeFileSync(
    join(OUT_DIR, 'gary-shop-comparison.txt'),
    'Gary\'s Shop effect comparison timeline\n'
    + 'Each clip is the same first eight bars of the actual Counter Dance Mix source,'
    + ' followed by ' + GAP_SECONDS + ' seconds of silence.\n\n'
    + timeline.join('\n') + '\n',
  );
  writeFileSync(
    join(OUT_DIR, 'README.txt'),
    'Gary\'s Shop effect auditions\n\n'
    + 'These are offline renders through the game\'s actual Audio engine and mixer.'
    + ' The live Gary\'s Shop treatment is unchanged.\n'
    + 'All files use the same source, mix, seed, length, and output level.'
    + ' A fixed -8 dB safety trim prevents effect-added peaks from clipping.\n\n'
    + VARIANTS.map((item) => item.file + ' - ' + item.title).join('\n') + '\n\n'
    + 'The comparison reel has the same clips in the numbered order above, with'
    + ' short silent gaps.\n',
  );
  console.log('comparison: ' + join(OUT_DIR, 'gary-shop-comparison.wav'));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
