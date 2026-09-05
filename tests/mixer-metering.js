// Live graph coverage: offline contexts already omitted display meters before this change.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';
import { openLiveBrowser } from './lib/live-browser.js';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert(main.indexOf('Audio.setMixerMeteringEnabled(false)') < main.indexOf('Audio.ensure()'));
const bundle = await build({ stdin: { contents: `import {Audio} from './src/engine/audio.js'; import {bank,mix} from './src/data/songs/rhythm.js'; window.audio = Audio; window.rhythm = {bank,mix};`,
  resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife' });
const host = await openLiveBrowser();
const { browser, origin } = host;
try {
  const results = [];
  for (const metered of [true, false]) {
    const page = await browser.newPage();
    await page.goto(origin);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    results.push(await page.evaluate(async (metered) => {
      const A = window.audio;
      let analysers = 0, splitters = 0;
      for (const name of ['createAnalyser', 'createChannelSplitter']) {
        const original = AudioContext.prototype[name];
        AudioContext.prototype[name] = function (...args) {
          if (name === 'createAnalyser') analysers++; else splitters++;
          return original.apply(this, args);
        };
      }
      if (!metered && !A.setMixerMeteringEnabled(false)) throw Error('early setter refused');
      A.ensure();
      await A.ctx.resume();
      A.songTrim.gain.value = 1;
      const counts = { analysers, splitters };
      if (A.mixer.metered !== metered || !A.songAnalyser) throw Error('wrong graph mode');
      if (A.setMixerMeteringEnabled(!metered) || !A.setMixerMeteringEnabled(metered)) throw Error('late setter');
      const lane = A.mixer.lane('lead');
      const osc = A.ctx.createOscillator();
      const gain = A.ctx.createGain(); gain.gain.value = 0.05;
      osc.connect(gain); gain.connect(lane.dry); osc.start();
      await new Promise(r => setTimeout(r, 150));
      const levels = [lane.level(), A.mixer.masterLevel(), ...A.mixer.masterLevels(), ...A.mixer.masterInputLevels()];
      if (metered ? !levels.some(v => v > 0) : levels.some(v => v !== 0)) throw Error(`levels ${levels}`);
      if (!metered && A.mixer.auxLevel('reverb') !== 0) throw Error('aux reader');
      // These rewire the output and schedule treatment handovers, with no display branches.
      A.mixer.setLimiter(false); A.mixer.setLimiter(true);
      A.mixer.setTreatment([]); A.mixer.rampTreatment(1, A.ctx.currentTime, 0.01);
      A.rampMix({ master: -3, lanes: { lead: { gain: -6 } } }, A.ctx.currentTime, 0.01);
      await new Promise(r => setTimeout(r, 80));
      const waveform = new Float32Array(A.songAnalyser.fftSize);
      A.songAnalyser.getFloatTimeDomainData(waveform);
      const audiblePeak = Math.max(...waveform.map(Math.abs));
      osc.stop();
      if (!(audiblePeak > 0)) throw Error('song signal lost during rewiring');
      if (!await A.rebuildRealtimeContext()) throw Error('rebuild failed');
      if (A.mixer.metered !== metered || A.mixerMeteringEnabled !== metered) throw Error('mode lost on rebuild');
      clearInterval(A.timer); await A.ctx.close();
      return { metered, ...counts, audiblePeak };
    }, metered));
    await page.close();
  }
  assert(results[0].analysers > results[1].analysers);
  assert(results[0].splitters > results[1].splitters);
  assert(results[1].analysers > 1, 'song and effect-sleep analysers remain');
  console.log('ok: live metering graph, signal, readers, handover, rebuild', JSON.stringify(results));
  if (process.env.MASH_PERF_BENCH) {
    const cdp = await browser.newBrowserCDPSession();
    const report = [];
    for (const metered of [true, false]) {
      const page = await browser.newPage();
    await page.goto(origin);
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await page.evaluate(async (metered) => {
        const A = window.audio;
        A.setMixerMeteringEnabled(metered); A.setSilentLaneSkip(true); A.setSequencerLookahead(0.5);
        A.ensure(); await A.ctx.resume(); A.setBank(window.rhythm.bank, window.rhythm.mix);
        A.setStepAtBoundary(512);
      }, metered);
      await page.waitForTimeout(2000);
      const before = (await cdp.send('SystemInfo.getProcessInfo')).processInfo;
      const stats = await page.evaluate(async () => {
        const A = window.audio;
        A.takeSchedulerHealth();
        const begin = performance.now(), audioBegin = A.ctx.currentTime;
        const passes = [];
        for (let i = 0; i < 1200; i++) {
          await new Promise(r => setTimeout(r, 1000/60));
          const start = performance.now(); A.schedule(); passes.push(performance.now() - start);
        }
        const wall = (performance.now() - begin) / 1000;
        passes.sort((a,b) => a-b);
        return { wall, clockRatio: (A.ctx.currentTime - audioBegin) / wall,
          scheduler: A.takeSchedulerHealth(), scheduleP95Ms: passes[Math.floor(passes.length * .95)] };
      });
      const after = (await cdp.send('SystemInfo.getProcessInfo')).processInfo;
      const cpuSeconds = after.reduce((sum, p) => sum + Math.max(0, p.cpuTime - (before.find(b => b.id === p.id)?.cpuTime ?? p.cpuTime)), 0);
      report.push({ metered, cpuSeconds, ...stats });
      await page.close();
    }
    writeFileSync('/tmp/mash-metering-bench.json', JSON.stringify(report, null, 2));
    console.log('live rhythm metering benchmark', JSON.stringify(report));
  }

} finally { await host.close(); }
