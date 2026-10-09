// Breakdown Hook auditions (generator v11): the same take with each way of playing the hook through
// its breakdown (breakdown-ways.js — all but As Written and No Hook) from the last two bars of the
// drop before it to the first two of the build after. Real engine, the saved arrangement, no normalising.
//
//   node tools/render-banger-breakdown-auditions.js [style …]     (default: big-room trance electro)
//
// Writes work/auditions/banger-breakdowns/<style>-<n>-<way>.wav, <style>-00-all.wav (every way in
// turn, two seconds apart) and a manifest.
import { mkdirSync, writeFileSync } from 'node:fs';
import { installDom } from '../tests/dom-stub.js';
installDom();
const { generateBanger } = await import('./lib/banger/index.js');
const { BREAKDOWN_WAYS } = await import('./lib/banger/breakdown-ways.js');
const { riffFromNotes, DEFAULT_SIMPLE } = await import('../src/game/banger/riff.js');
const { hookSoundFor, defaultMoodFor } = await import('../src/game/banger/make.js');
const { openRenderer } = await import('./lib/render-bank-browser.js');
const { wavBuffer, rmsOf, SR } = await import('./lib/wav.js');

const styles = process.argv.slice(2).length ? process.argv.slice(2) : ['big-room', 'trance', 'electro'];
const SEED = 11;
const directory = new URL('../work/auditions/banger-breakdowns/', import.meta.url);
mkdirSync(directory, { recursive: true });
const manifest = { note: 'Each way of playing the breakdown on the same take: two bars of drop, the breakdown, two bars of build. Raw engine output.', renders: [] };
const renderer = await openRenderer();
try {
  for (const style of styles) {
    const mood = defaultMoodFor(style);
    const riff = riffFromNotes(DEFAULT_SIMPLE, hookSoundFor(style, mood, SEED), 'simple');
    const reel = [];
    for (const [n, way] of BREAKDOWN_WAYS.map((w) => w.id).filter((id) => id !== 'written' && id !== 'none').entries()) {
      // The Club form, so every style has its breakdown in the same place.
      const song = generateBanger({ riff, seed: SEED, options: { style, mood, form: { template: 'club', breakdownHook: way } } });
      const bd = song.form.find((f) => f.role === 'breakdown');
      if (!bd) throw new Error(`${style} has no breakdown`);
      const last = song.form[song.form.length - 1].to;
      const audio = await renderer.render(song.bank, { mix: song.mix, arrangement: song.arrangement, trackId: null,
        range: { startStep: Math.max(0, bd.from - 3) * 16, endStep: Math.min(last, bd.to + 2) * 16 }, tail: 2 });
      if (!Number.isFinite(audio.peak) || audio.peak <= 0) throw new Error(`${style} ${way}: silent render`);
      const file = `${style}-${String(n + 1).padStart(2, '0')}-${way}.wav`;
      writeFileSync(new URL(file, directory), wavBuffer([audio.outL, audio.outR]));
      const entry = { file, style, way, breakdownBars: `${bd.from}–${bd.to}`, peakDb: +(20 * Math.log10(audio.peak)).toFixed(2),
        rmsDb: +(20 * Math.log10(Math.sqrt((rmsOf(audio.outL) ** 2 + rmsOf(audio.outR) ** 2) / 2))).toFixed(2) };
      manifest.renders.push(entry);
      reel.push(audio);
      console.log(`${file}: breakdown ${entry.breakdownBars}, peak ${entry.peakDb} dBFS, RMS ${entry.rmsDb} dBFS`);
    }
    const gap = 2 * SR;
    const join = (side) => {
      const out = new Float32Array(reel.reduce((t, a) => t + a[side].length + gap, 0));
      let at = 0;
      for (const a of reel) { out.set(a[side], at); at += a[side].length + gap; }
      return out;
    };
    writeFileSync(new URL(`${style}-00-all.wav`, directory), wavBuffer([join('outL'), join('outR')]));
  }
} finally { await renderer.close(); }
writeFileSync(new URL('manifest.json', directory), JSON.stringify(manifest, null, 2) + '\n');
