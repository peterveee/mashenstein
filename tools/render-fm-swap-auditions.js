// BEFORE / AFTER of three sound swaps the new FM controls made possible (23 Oct 2026):
//
//   gravity  the twinkle lane's "Ring Mod" copy at AM DEPTH 200% — real ring modulation,
//            which the preset was named for and Tone's AMSynth never did
//   crypt    the lead, Crypt Theremin (MRDR-3) against AM Theremin (RMND-7)
//   office   the lead lanes, PWM Hollow Lead against Hollow FM Lead (shipped: office.js
//            now plays the AFTER; BEFORE is the library's PWM Hollow Lead put back)
//
// Eight bars each, where that lane is busiest, through the game's own engine with the
// song's own mix and arrangement: the full mix, and the lane alone. Raw engine output,
// not normalised, so before and after are at the levels the game would play them.
//
//   node tools/render-fm-swap-auditions.js            → work/auditions/fm-swaps/
import { mkdirSync, writeFileSync } from 'node:fs';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, rmsOf } from './lib/wav.js';
import { VOICES } from '../src/data/voices.js';

const copyOf = (id) => {
  const { user, ...v } = VOICES[id];
  return JSON.parse(JSON.stringify({ ...v, id }));
};
const CASES = [
  { song: 'gravity', lanes: ['twinkle'], label: 'ring-mod',
    swap: (mix) => { mix.voiceParams.twinkleVoice = { ...mix.voiceParams.twinkleVoice, amDepth: 2 }; } },
  { song: 'crypt', lanes: ['lead'], label: 'theremin',
    swap: (mix) => { mix.voice.leadVoice = 'rm7AmTheremin'; mix.voiceParams.leadVoice = copyOf('rm7AmTheremin'); } },
  { song: 'office', lanes: ['lead', 'lead8', 'lead10'], label: 'lead', afterIsShipped: true,
    swap: (mix) => {
      for (const k of ['leadVoice', 'lead8Voice', 'lead10Voice']) {
        mix.voice[k] = 'bestPwmHollowLead'; mix.voiceParams[k] = copyOf('bestPwmHollowLead');
      }
    } },
];

/**
 * The eight bars where the swap changes the lane most, on the RENDERED timeline.
 *
 * Counted from a render rather than from the bank: a song's arrangement plays its sections
 * in its own order, so bar 14 of the bank is not bar 14 of what the game plays, and a range
 * picked from the bank landed on bars where the lane was silent. Rendering the lane both
 * ways and measuring where they differ cannot pick a section the change is not in.
 */
const busiest = (a, b, barSeconds, rate) => {
  const n = Math.floor(Math.min(a.length, b.length) / (barSeconds * rate));
  const per = [];
  for (let bar = 0; bar < n; bar++) {
    let d = 0;
    for (let i = Math.floor(bar * barSeconds * rate); i < Math.floor((bar + 1) * barSeconds * rate); i++) d += (a[i] - b[i]) ** 2;
    per.push(d);
  }
  let best = -1; let at = 0;
  for (let i = 0; i + 8 <= per.length; i++) {
    const t = per.slice(i, i + 8).reduce((x, y) => x + y, 0);
    if (t > best) { best = t; at = i; }
  }
  return { at, notes: Math.round(best) };
};

/**
 * The bank with every lane but these taken out — layers included. The renderer's own
 * `lanes` option strips the standard lanes and keeps the desk's layer lanes (`lead2`,
 * `chords4`, …), so a "solo" through it still carried half the arrangement.
 */
const only = (bank, lanes) => {
  const keep = new Set(lanes);
  const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) =>
    !Array.isArray(v) || k === 'order' || k === 'sections' || keep.has(k)));
  const out = strip(bank);
  if (bank.sections) out.sections = bank.sections.map(strip);
  return out;
};

const out = new URL('../work/auditions/fm-swaps/', import.meta.url);
mkdirSync(out, { recursive: true });
const renderer = await openRenderer();
const manifest = { note: 'Eight bars where the swapped lane is busiest; raw engine output, not normalised.', renders: [] };
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity).toFixed(1);
try {
  for (const c of CASES) {
    const song = await import(`../src/data/songs/${c.song}.js`);
    const shipped = JSON.parse(JSON.stringify(song.mix));
    const swapped = JSON.parse(JSON.stringify(song.mix));
    c.swap(swapped);
    const [before, after] = c.afterIsShipped ? [swapped, shipped] : [shipped, swapped];
    const whole = [];
    for (const mix of [before, after]) {
      whole.push(await renderer.render(only(song.bank, c.lanes), { mix, arrangement: song.arrangement, trackId: c.song, tail: 1 }));
    }
    const bpm = song.arrangement?.bpm || song.bank.bpm;
    const { at, notes } = busiest(whole[0].outL, whole[1].outL, 240 / bpm, 44100);
    for (const [stem, tag] of [[false, 'mix'], [true, 'solo']]) {
      const pair = [];
      for (const [which, mix] of [['before', before], ['after', after]]) {
        const audio = await renderer.render(stem ? only(song.bank, c.lanes) : song.bank, {
          mix, arrangement: song.arrangement, trackId: c.song, tail: 2,
          range: { startStep: at * 16, endStep: (at + 8) * 16 },
        });
        if (!Number.isFinite(audio.peak) || audio.peak <= 0) throw new Error(`${c.song} ${which} ${tag}: silent or broken (${audio.peak})`);
        const file = `${c.song}-${c.label}-${tag}-${which}.wav`;
        writeFileSync(new URL(file, out), wavBuffer([audio.outL, audio.outR]));
        const rms = Math.sqrt((rmsOf(audio.outL) ** 2 + rmsOf(audio.outR) ** 2) / 2);
        manifest.renders.push({ file, bars: `${at + 1}-${at + 8}`, changeEnergy: notes, peakDb: +db(audio.peak), rmsDb: +db(rms) });
        console.log(`${file.padEnd(36)} bars ${at + 1}-${at + 8}  peak ${db(audio.peak)} dBFS  rms ${db(rms)} dBFS${audio.peak >= 1 ? '  CLIPS' : ''}`);
        pair.push(audio.outL);
      }
      let diff = 0;
      for (let i = 0; i < Math.min(pair[0].length, pair[1].length); i++) diff += (pair[0][i] - pair[1][i]) ** 2;
      if (diff < 1e-6) throw new Error(`${c.song} ${tag}: the swap did not change the audio`);
    }
  }
} finally {
  await renderer.close();
}
writeFileSync(new URL('manifest.json', out), JSON.stringify(manifest, null, 2) + '\n');
