// Render one SFX cue, with ANY of its firing options, through the real engine in an
// OfflineAudioContext — the same route tools/render-cues.js takes, as a library.
//
//   const cues = await openCueRenderer();
//   const { L, R } = await cues.render('launch', { hero: 'grumpos' }, 3);
//   await cues.close();
//
// render-cues.js passes only gain/shape/reverb, so the per-hero weapon cues
// (`contact`/`launch` with `hero`), debris by material (`mat`) and the heavy punt all
// rendered as something else. This passes the options the game fired with.
//
// A fresh page per cue: Audio is a singleton and `ensure` binds one context for its
// lifetime (see render-cues.js).
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { SR } from './wav.js';

const require = createRequire(import.meta.url);
const ROOT = resolve(import.meta.dirname, '../..');

const ENTRY = `
import * as A from ${JSON.stringify(join(ROOT, 'src/engine/audio.js'))};
window.__Audio = A.Audio;
`;

export async function openCueRenderer() {
  const { chromium } = require('playwright');
  const esbuild = require('esbuild');
  const built = await esbuild.build({
    stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'js' },
    bundle: true, format: 'iife', target: ['es2020'], write: false, logLevel: 'silent',
  });
  const js = built.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
  const browser = await chromium.launch({ headless: true });
  return {
    async render(name, opt = {}, seconds = 3) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await page.setContent(`<!doctype html><meta charset="utf-8"><script>${js}<\/script>`, { waitUntil: 'load' });
        const out = await page.evaluate(async ({ name, opt, seconds, sr }) => {
          const Audio = window.__Audio;
          const ctx = new OfflineAudioContext(2, Math.round(sr * seconds), sr);
          Audio.setCaptureEnabled(false);
          Audio.setNoiseSeed(1);
          Audio.ensure(ctx);
          if (Audio.mixer) await Audio.mixer.ready;
          // A few cues ride musicBus, which sits at silence until a song opens it.
          Audio.songTrim.gain.cancelScheduledValues(0);
          Audio.songTrim.gain.setValueAtTime(1, 0);
          // `voice:<preset>` is a song-engine preset fired as a cue (Audio.voiceSfx).
          if (name.startsWith('voice:')) Audio.voiceSfx(name.slice(6), opt);
          else Audio.sfx(name, opt);
          const buf = await ctx.startRendering();
          return {
            L: Array.from(buf.getChannelData(0)),
            R: Array.from(buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)),
          };
        }, { name, opt, seconds, sr: SR });
        if (errors.length) console.warn(`cue ${name}: ${errors.join(' | ')}`);
        return { L: Float32Array.from(out.L), R: Float32Array.from(out.R) };
      } finally { await page.close(); }
    },
    close: () => browser.close(),
  };
}
