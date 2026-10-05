// node tools/render-creative-kit-auditions.js [--measure] [--measure-kit=pocket-pixel]
// Real-engine calibration (new voices only), then two seamless WAV loops per kit.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CREATIVE_DRUM_KITS } from '../src/data/creative-drum-kits.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';
import { openRenderer, SR } from './lib/render-bank-browser.js';
import { setMeasured } from './lib/voices-source.js';
import { measureVoiceAt } from './lib/measure-voice.js';
import { wavBuffer } from './lib/wav.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}work/auditions/creative-kits`;
mkdirSync(outDir, { recursive: true });
const four = [0, 4, 8, 12, 16, 20, 24, 28];
const back = [4, 12, 20, 28];
const off = [2, 6, 10, 14, 18, 22, 26, 30];
const common = { kick: four, snare: back, clap: back, hats: four, ohats: off, rim: [], tom: [], crash: [0] };
const grooves = {
  'glasshouse': { ...common, hats: [0, 3, 4, 8, 11, 12, 16, 19, 20, 24, 27, 28], rim: [7, 23], tom: [28, 30] },
  'havana-patio': { ...common, snare: [12, 28], hats: [0, 3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31], rim: [0, 6, 12, 20, 24], tom: [3, 10, 14, 19, 26, 30] },
  'moon-dust': { ...common, snare: [12, 28], hats: four, rim: [], tom: [27, 30] },
  'neon-origami': { ...common, hats: [0, 1, 3, 4, 5, 7, 8, 9, 11, 12, 13, 15, 16, 17, 19, 20, 21, 23, 24, 25, 27, 28, 29, 31], rim: [], tom: [28, 30, 31] },
  'pocket-pixel': { kick: [0, 7, 8, 16, 22, 24], snare: back, clap: [30], hats: [0, 2, 6, 8, 10, 14, 16, 18, 22, 24, 26], ohats: [15, 31], rim: [3, 11, 19, 27], tom: [13, 29, 30], crash: [0] },
  'rio-lanterns': { ...common, snare: [12, 28], hats: [0, 3, 4, 7, 8, 11, 12, 15, 16, 19, 20, 23, 24, 27, 28, 31], rim: [3, 10, 19, 26], tom: [3, 6, 14, 19, 22, 30] },
  'rubber-factory': { ...common, snare: [12, 28], hats: [0, 3, 4, 8, 11, 12, 16, 19, 20, 24, 27, 28], rim: [7, 15, 23, 31], tom: [26, 30] },
  'velvet-basement': { ...common, hats: [0, 3, 4, 8, 11, 12, 16, 19, 20, 24, 27, 28], rim: [7, 23], tom: [29, 31] },
};
let renderer = await openRenderer();
try {
  const measureKit = process.argv.find(arg => arg.startsWith('--measure-kit='))?.split('=')[1];
  if (measureKit && !CREATIVE_DRUM_KITS.some(k => k.key === measureKit)) throw new Error(`Unknown kit: ${measureKit}`);
  if (process.argv.includes('--measure') || measureKit) {
    const levels = {}, peaks = {};
    for (const kit of CREATIVE_DRUM_KITS) {
      if (measureKit && kit.key !== measureKit) continue;
      for (const [lane, id] of Object.entries(kit.voices)) {
        const m = await measureVoiceAt(renderer.render, VOICES[id], lane);
        if (!(m.level > 0 && m.peak > 0 && Number.isFinite(m.level + m.peak))) throw new Error(`Bad measurement: ${id}`);
        levels[id] = m.level; peaks[id] = m.peak;
      }
      console.log(`Measured ${kit.label}`);
    }
    const file = `${root}src/data/voices.js`;
    let source = readFileSync(file, 'utf8');
    for (const id of Object.keys(levels)) source = setMeasured(source, id, { level: levels[id], peak: peaks[id] });
    writeFileSync(file, source);
    await renderer.close();
    renderer = await openRenderer(); // rebundle the measured catalogue
  }
  const report = [];
  for (const kit of CREATIVE_DRUM_KITS) {
    for (const mode of ['groove', 'comparison']) {
      const bpm = mode === 'comparison' ? 124 : kit.bpm;
      const pattern = mode === 'comparison' ? common : grooves[kit.key];
      const bank = { bpm, echoLevel: 0, swing: mode === 'groove' && ['velvet-basement', 'rubber-factory', 'havana-patio'].includes(kit.key) ? 54 : 50 };
      for (const [lane, id] of Object.entries(kit.voices)) {
        bank[VOICE_LANES[lane].voiceKey] = id;
        bank[lane] = Array.from({ length: 64 }, (_, i) => {
          if (lane === 'crash') return i === 0;
          // House toms mark the last bar; Latin hand drums are part of the groove.
          if (lane === 'tom' && !['havana-patio', 'rio-lanterns', 'pocket-pixel'].includes(kit.key) && i < 48) return false;
          return pattern[lane]?.includes(i % 32) || false;
        });
      }
      // Three four-bar passes; retain the middle pass with the previous crash tail.
      const r = await renderer.render(bank, { repeat: 3, tail: 0, mix: null, trackId: null });
      const start = Math.round(64 * 60 / bpm / 4 * SR);
      const end = Math.round(128 * 60 / bpm / 4 * SR);
      const channels = [r.outL.slice(start, end), r.outR.slice(start, end)];
      let peak = 0, energy = 0;
      for (const ch of channels) for (const x of ch) { if (!Number.isFinite(x)) throw new Error('Non-finite audio'); peak = Math.max(peak, Math.abs(x)); energy += x*x; }
      if (!(peak > .001) || peak >= 1) throw new Error(`${kit.key}: silent or clipping (${peak})`);
      const filename = `${kit.key}-${mode}-${kit.key === 'pocket-pixel' ? 'v4' : 'v2'}.wav`;
      writeFileSync(`${outDir}/${filename}`, wavBuffer(channels));
      writeFileSync(`${outDir}/${kit.key}-${mode}.json`, JSON.stringify(bank, null, 2)+'\n');
      report.push({ kit: kit.key, mode, bpm, filename, peakDb: 20*Math.log10(peak), rmsDb: 10*Math.log10(energy/(channels[0].length*2)), seconds: channels[0].length/SR });
      console.log(`${filename}: ${report.at(-1).peakDb.toFixed(1)} dBFS`);
    }
  }
  writeFileSync(`${outDir}/measurements.json`, JSON.stringify(report,null,2)+'\n');
  const cards = CREATIVE_DRUM_KITS.map(k=>`<article><h2>${k.label}</h2><p>${k.description}</p><label>Signature groove · ${k.bpm} BPM<audio controls loop preload="metadata" src="${k.key}-groove-${k.key === 'pocket-pixel' ? 'v4' : 'v2'}.wav"></audio></label><label>Same comparison beat · 124 BPM<audio controls loop preload="metadata" src="${k.key}-comparison-${k.key === 'pocket-pixel' ? 'v4' : 'v2'}.wav"></audio></label><a href="${k.key}-groove-${k.key === 'pocket-pixel' ? 'v4' : 'v2'}.wav" download>Download groove WAV</a></article>`).join('\n');
  writeFileSync(`${outDir}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dance kits · revised auditions</title><style>body{background:#101820;color:#e8f0e8;font:17px/1.55 system-ui;max-width:1120px;margin:48px auto;padding:0 24px}h1{font-size:44px;line-height:1.1}header p{max-width:760px;color:#b5c8ca}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}article{background:#1a2832;padding:24px;border:1px solid #34505b;border-radius:16px}h2{color:#b8e799;margin:0}article p{min-height:82px;color:#c3cfd1}label{display:block;font-size:14px;margin:20px 0}audio{display:block;width:100%;margin-top:8px}a{color:#b8e799}</style><header><p>MASHENSTEIN / DRUM ROOM</p><h1>Seven for the dance floor. One for the pocket.</h1><p>Rebuilt around house, progressive, trance, tech house and disco drums, including two Latin house palettes. Pocket Pixel is the one deliberately game-like kit. Each four-bar WAV loops. Use the identical comparison beat to hear the kit change at the same tempo.</p><p>Native game-engine renders, original lane balance, no mastering or loudness normalisation. Available in the mixer Kit menu and the Lab's drum Kit selector. Latin grooves live here; choosing a kit changes sounds, not rhythm.</p></header><main class="grid">${cards}</main><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>`);
} finally { await renderer.close(); }
console.log(`Audition page: ${outDir}/index.html`);
