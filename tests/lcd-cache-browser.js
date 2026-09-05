// Real pixels and total replay cost, including cache misses. No canvas stubs.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { openLiveBrowser } from './lib/live-browser.js';
const bundle = await build({ stdin: { contents: `
import * as lcd from './src/engine/stylePacks/index.js';
import {efficiencyProfile,setEfficiencyProfile} from './src/engine/render-efficiency.js';
import {Audio} from './src/engine/audio.js';
import {bank,mix} from './src/data/songs/rhythm.js';
window.lcdTest={...lcd,efficiencyProfile,setEfficiencyProfile,Audio,bank,mix};`, resolveDir: process.cwd() },
  bundle: true, write: false, format: 'iife' });
const host = await openLiveBrowser();
const { browser, origin } = host;
try {
  const page = await browser.newPage();
    await page.goto(origin);
  if (process.env.MASH_PERF_BASELINE) await page.addScriptTag({ content: readFileSync(process.env.MASH_PERF_BASELINE, 'utf8') });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const parity = await page.evaluate(() => {
    const api = window.lcdTest;
    const make = (density) => {
      const c = document.createElement('canvas'); c.width = 480 * density; c.height = 270 * density;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.scale(density, density); return ctx;
    };
    const bytes = c => c.getImageData(0, 0, c.canvas.width, c.canvas.height).data;
    const equal = (a, b, label) => {
      const x = bytes(a), y = bytes(b);
      let different = 0, max = 0;
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) { different++; max = Math.max(max, Math.abs(x[i] - y[i])); }
      if (different) throw Error(`${label}: ${different} different channels; maximum ${max}`);
    };
    let frames = 0;
    for (const density of [1, 3]) {
      const direct = make(density), cached = make(density), original = make(density);
      for (const stageIndex of [1, 2, 3]) {
        const spectrum = new Uint8Array(128).fill(80);
        const base = { stageIndex, beat: 33.2, progress: 0.3, audio: { spectrum, hit: 0.6, level: 0.7, treble: 0.4 } };
        const cases = [base, { ...base, beat: 33.8 }, { ...base, beat: 34 },
          { ...base, beat: 320 }, { ...base, beat: 80 }, { ...base, progress: 0.99 },
          { ...base, intro: { beat: 0 } }, { ...base, intro: { beat: 7 } },
          { ...base, omen: 4 }, { ...base, finish: true },
          { ...base, streak: 17, cheer: true }, { ...base, barrelBeat: 36, barrelGrid: 32 },
          { ...base, maxRoadRise: 80 }, { ...base, gorillaNostrils: 'N7' },
          ...[0.749, 0.75, 0.751].map(f => ({ ...base, beat: 33 + f, verbCue: { action: 'JUMP', ink: ['#ffcc00'] } })),
          { ...base, audio: { spectrum: new Uint8Array(128).fill(180), hit: 0.1, level: 0.1, treble: 0.95 } },
          { ...base, audio: null }];
        api.setLCDPanelCacheEnabled(true);
        for (const settings of [{ skyMeter: false }, { skyMeter: true }, { reducedMotion: true }, { reducedFlashing: true }]) {
          for (const scene of cases) {
            api.drawLCDPanelUncached(direct, scene, settings);
            api.setEfficiencyProfile(true);
            api.drawLCDPanel(cached, scene, settings); api.drawLCDPanel(cached, scene, settings);
            if (api.efficiencyProfile.lcdHits < 1) throw Error('cache did not hit');
            equal(direct, cached, `cache stage ${stageIndex} density ${density}`);
            if (window.perfApi) {
              window.perfApi.drawLCDPanel(original, scene, settings);
              equal(original, direct, `baseline stage ${stageIndex} density ${density}`);
            }
            frames++;
          }
        }
      }
    }
    // Invalidations without resetting the cache; mutable analyser and cue buffers.
    const c = make(1), reference = make(1);
    const scene = { stageIndex: 2, beat: 1.1, audio: { spectrum: new Uint8Array(128).fill(80), hit: 0, level: 0, treble: 0 } };
    api.setLCDPanelCacheEnabled(true); api.setEfficiencyProfile(true);
    api.drawLCDPanel(c, scene, { skyMeter: false });
    scene.beat = 1.2; api.drawLCDPanel(c, scene, { skyMeter: false });
    if (api.efficiencyProfile.lcdHits !== 1) throw Error('fractional beat invalidates equivalent state');
    scene.audio.spectrum.fill(240); api.drawLCDPanel(c, scene, { skyMeter: false });
    if (api.efficiencyProfile.lcdMisses !== 2) throw Error('mutable spectrum failed invalidation');
    const oldMisses = api.efficiencyProfile.lcdMisses;
    c.canvas.width = 960; c.canvas.height = 540; c.setTransform(2, 0, 0, 2, 0, 0);
    api.drawLCDPanel(c, scene, { skyMeter: false });
    if (api.efficiencyProfile.lcdMisses !== oldMisses + 1 || api.efficiencyProfile.lcdBytes !== 960 * 540 * 4) throw Error('resize');
    const other = make(2); api.drawLCDPanel(other, scene, { skyMeter: false });
    if (api.efficiencyProfile.lcdMisses !== oldMisses + 2) throw Error('context identity');
    api.clearLCDPanelCache();
    if (api.efficiencyProfile.lcdBytes !== 0) throw Error('clear');
    // Nonstandard blending uses direct painting, not flattened operations.
    c.globalAlpha = 0.5; api.setEfficiencyProfile(true); api.drawLCDPanel(c, scene);
    if (api.efficiencyProfile.lcdMisses || api.efficiencyProfile.lcdHits) throw Error('alpha fallback');
    // A failed real-surface probe must still draw the complete panel directly.
    c.globalAlpha = 1;
    api.clearLCDPanelCache(); api.setEfficiencyProfile(true);
    const probe = CanvasRenderingContext2D.prototype.createImageData;
    CanvasRenderingContext2D.prototype.createImageData = () => { throw Error('allocation unavailable'); };
    try { api.drawLCDPanel(c, scene, { skyMeter: false }); }
    finally { CanvasRenderingContext2D.prototype.createImageData = probe; }
    if (api.efficiencyProfile.lcdBytes || api.efficiencyProfile.lcdMisses) throw Error('allocation fallback retained a panel');
    const direct2 = make(2); api.drawLCDPanelUncached(direct2, scene, { skyMeter: false });
    equal(direct2, c, 'allocation fallback');
    return { frames, baselineCompared: !!window.perfApi };
  });
  console.log('ok: LCD cached/direct pixel parity and invalidation', JSON.stringify(parity));
  if (process.env.MASH_PERF_BENCH) {
    const bench = await page.evaluate(async () => {
      const api = window.lcdTest, A = api.Audio;
      A.setMixerMeteringEnabled(false); A.setSilentLaneSkip(true); A.setSequencerLookahead(0.5);
      A.ensure(); await A.ctx.resume();
      if (!A.ctx.audioWorklet) throw Error('live rhythm benchmark requires AudioWorklet');
      A.setBank(api.bank, api.mix);
      A.setStepAtBoundary(512);
      // Capture actual rhythm analyser output, including mutable-spectrum updates.
      const samples = [];
      for (let i = 0; i < 360; i++) {
        await new Promise(r => setTimeout(r, 1000 / 60));
        const audio = A.musicAnalysis();
        samples.push({ beat: A.songBeat(), audio: { ...audio, spectrum: Array.from(audio.spectrum) } });
      }
      const scheduler = A.takeSchedulerHealth();
      A.setBank(null); clearInterval(A.timer); await A.ctx.close();
      const c = document.createElement('canvas'); c.width = 1440; c.height = 810;
      const ctx = c.getContext('2d'); ctx.scale(3, 3);
      // Gameplay uploads its completed canvas to WebGL every frame. Include
      // that flush rather than timing only deferred Canvas2D command submission.
      const gpu = document.createElement('canvas').getContext('webgl');
      const tex = gpu.createTexture(); gpu.bindTexture(gpu.TEXTURE_2D, tex);
      gpu.texImage2D(gpu.TEXTURE_2D, 0, gpu.RGBA, 1440, 810, 0, gpu.RGBA, gpu.UNSIGNED_BYTE, null);
      const flush = () => { gpu.texSubImage2D(gpu.TEXTURE_2D, 0, 0, 0, gpu.RGBA, gpu.UNSIGNED_BYTE, c); gpu.finish(); };
      const report = [];
      for (const stageIndex of [1, 2, 3]) {
        for (let trial = 0; trial < 4; trial++) for (const enabled of trial % 2 ? [true, false] : [false, true]) {
          api.setLCDPanelCacheEnabled(enabled); api.setEfficiencyProfile(true);
          const times = [];
          for (const sample of samples) {
            const start = performance.now();
            api.drawLCDPanel(ctx, { ...sample, stageIndex, progress: 0.6 }, { skyMeter: false });
            flush();
            times.push(performance.now() - start);
          }
          // Force completion so the aggregate includes deferred canvas work.
          ctx.getImageData(0, 0, 1, 1);
          const sorted = [...times].sort((a,b) => a-b);
          report.push({ ...api.efficiencyProfile, stageIndex, trial, cacheEnabled: enabled, totalMs: times.reduce((a,b) => a+b,0),
            median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.floor(sorted.length * .95)],
            worst: sorted[sorted.length - 1] });
        }
      }
      return { scheduler, sampleCount: samples.length, report };
    });
    writeFileSync('/tmp/mash-lcd-bench.json', JSON.stringify(bench, null, 2));
    console.log('LCD replay bench:', JSON.stringify(bench));
  }
} finally { await host.close(); }
