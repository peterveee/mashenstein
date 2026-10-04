// Short A/Bs through the real engine, with identical notes, sounds and faders.
// No per-file normalization: the planner's visible headroom reserve is included.
// node tools/render-banger-production-auditions.js
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateBanger } from './lib/banger/index.js';
import { songSlots, laneKeysOf } from './lib/banger/modify.js';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, rmsOf } from './lib/wav.js';

const directory = new URL('../work/auditions/banger-production/', import.meta.url);
mkdirSync(directory, { recursive: true });
const bars = ['A4:1 . . . E5:1 . . . C5:1 . . . . . . .', 'F4:1 . . . C5:1 . . . A4:1 . . . . . . .'];
const riff = { version: 1, source: { id: 'production-audition', title: 'SPACE', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Pluck', kind: 'melodic', role: 'hook', meanPitch: 72, voice: 'synthPluck', voiceParams: null, engineKeys: null, strip: null, bars }] };
const cases = [];
for (const [style, treatment] of [['trance', 'echo'], ['shibuya', 'room'], ['synthwave', 'lush']]) {
  for (let seed = 1; seed <= 40; seed++) {
    const options = { style, production: { mode: 'adventurous', version: 1 } };
    const after = generateBanger({ riff, options, seed, level: false });
    const choice = after.trackEffects.applied.find(x => x.treatment === treatment);
    if (!choice) continue;
    const before = generateBanger({ riff, options: { ...options, production: { mode: 'style' } }, seed, level: false });
    cases.push({ style, treatment, seed, before, after, choice }); break;
  }
}
if (cases.length !== 3) throw new Error('No representative take for each treatment');
const db = x => x > 0 ? 20 * Math.log10(x) : -120;
const manifest = { policy: 1, note: 'Identical notes, instruments and faders. Raw engine output; no separate normalization. Bounded stems and four-bar mixes, not full calibration or listening approval.', takes: [] };
const renderer = await openRenderer();
try {
  for (const c of cases) {
    const lane = c.choice.lane;
    const slots = songSlots(c.after.bank, c.after.arrangement);
    const first = slots.findIndex(s => Array.isArray(s.sec[lane]) && s.sec[lane].some(n => n != null));
    const selected = slots.slice(first, first + 2);
    for (const stem of [true, false]) {
      const sections = selected.map(s => stem
        ? Object.fromEntries(laneKeysOf(s.sec, lane).map(k => [k, s.sec[k]])) : s.sec);
      const bank = { ...c.after.bank, sections, order: sections.map((_, i) => i) };
      const pair = {};
      for (const label of ['before', 'after']) {
        const mix = c[label].mix;
        const audio = await renderer.render(bank, { mix, trackId: null, arrangement: {}, lanes: stem ? new Set([lane]) : null, tail: 2 });
        const file = `${c.style}-${c.treatment}-${stem ? 'stem' : 'mix'}-${label}.wav`;
        if (!Number.isFinite(audio.peak) || audio.peak <= 0 || audio.peak >= 1) throw new Error(`${file}: invalid/clipping peak ${audio.peak}`);
        writeFileSync(new URL(file, directory), wavBuffer([audio.outL, audio.outR]));
        pair[label] = { file, peakDb: db(audio.peak), rmsDb: db(Math.sqrt((rmsOf(audio.outL) ** 2 + rmsOf(audio.outR) ** 2) / 2)) };
      }
      const entry = { style: c.style, seed: c.seed, role: c.choice.role, treatment: c.treatment, reason: c.choice.reason,
        stem, pair, rmsChangeDb: pair.after.rmsDb - pair.before.rmsDb };
      manifest.takes.push(entry);
      console.log(`${c.style}/${c.treatment}/${stem ? 'stem' : 'mix'}: peak ${pair.after.peakDb.toFixed(1)} dBFS, RMS change ${entry.rmsChangeDb.toFixed(2)} dB`);
    }
  }
} finally { await renderer.close(); }
writeFileSync(new URL('manifest.json', directory), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Written ${manifest.takes.length * 2} A/B files and manifest to ${directory.pathname}`);
