// Bounded real-engine A/B: section delay on a busy arpeggiated lead, solo and in a mix.
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateBanger } from './lib/banger/index.js';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, rmsOf } from './lib/wav.js';
const phrase = 'A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5 A4 C5 E5 A5';
const riff = { version: 1, source: { id: 'section-audition', title: 'ECHO LAYERS', from: 0, to: 1, bpm: 120 }, bars: 2, grid: 16, stats: {},
  parts: [{ key: 'lead', label: 'Arp lead', kind: 'melodic', role: 'hook', meanPitch: 72, voice: 'synthPluck', voiceParams: null, engineKeys: null, strip: null, bars: [phrase, phrase] }] };
const make = firstEffect => generateBanger({ riff, seed: 19, options: { style: 'trance', sectionFx: { mode: 'off', firstEffect, firstPart: 'hook', firstSection: 'drop' } } });
const before = make('none'), after = make('stack');
const first = after.form.find(f => f.role === 'drop');
const lane = after.banger.laneOf.hook;
const directory = new URL('../work/auditions/banger-section-effects/', import.meta.url);
mkdirSync(directory, { recursive: true });
const renderer = await openRenderer();
const manifest = { note: 'Four-bar busy lead excerpt, raw engine output with saved arrangement. No separate normalization; not full-song calibration or listening acceptance.', renders: [] };
try {
  for (const stem of [true, false]) {
    const renders = [];
    for (const [label, song] of [['before', before], ['after', after]]) {
      const audio = await renderer.render(song.bank, { mix: song.mix, arrangement: song.arrangement, trackId: null,
        lanes: stem ? new Set([lane]) : null, range: { startStep: (first.from - 1) * 16, endStep: (first.from + 3) * 16 }, tail: 2 });
      if (!Number.isFinite(audio.peak) || audio.peak <= 0 || audio.peak >= 1) throw new Error(`Invalid/clipping ${label} peak: ${audio.peak}`);
      const file = `busy-echo-${stem ? 'stem' : 'mix'}-${label}.wav`;
      writeFileSync(new URL(file, directory), wavBuffer([audio.outL, audio.outR]));
      const entry = { file, peakDb: 20 * Math.log10(audio.peak), rmsDb: 20 * Math.log10(Math.sqrt((rmsOf(audio.outL) ** 2 + rmsOf(audio.outR) ** 2) / 2)) };
      manifest.renders.push(entry); renders.push(audio);
      console.log(`${file}: peak ${entry.peakDb.toFixed(2)} dBFS, RMS ${entry.rmsDb.toFixed(2)} dBFS`);
    }
    let diff = 0;
    for (let i = 0; i < renders[0].outL.length; i++) diff += (renders[0].outL[i] - renders[1].outL[i]) ** 2;
    if (diff < 1e-6) throw new Error('Section FX did not change the rendered audio');
  }
} finally { await renderer.close(); }
writeFileSync(new URL('manifest.json', directory), JSON.stringify(manifest, null, 2) + '\n');
