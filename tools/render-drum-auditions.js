// Render the drum-synth presets so they can be heard rather than read.
//
// One WAV per DRUM preset, four hits on the lane the preset naturally belongs to,
// through the real engine — the same offline render every WAV, stem and video uses,
// so what these files play is what a song would get. Plus `_kit-demo.wav`: the kit
// playing together over two bars, because a kick judged alone tells you nothing
// about a kick under hats.
//
// Usage: node tools/render-drum-auditions.js
// Writes dist/drum-synth-auditions/<id>.wav
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { homeLane } from './lib/measure-voice.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'drum-synth-auditions');
mkdirSync(outDir, { recursive: true });

// Where each preset is most at home. The sound is the same anywhere — a drum-synth
// preset carries its own tuning — but each lane has its own measured level target,
// and auditioning on the lane it will actually be chosen on auditions that too.
const LANE_OVERRIDE = { dsHatOpen: 'ohats', dsZap: 'crash' };

const steps = (hits, value = true) => Array.from({ length: 32 }, (_, i) => (hits.includes(i) ? value : false));

const drums = Object.values(VOICES).filter((v) => v.kind === 'drum');
const renderer = await openRenderer();
try {
  for (const v of drums) {
    const lane = LANE_OVERRIDE[v.id] || homeLane(v);
    const bank = {
      bpm: 120,
      [lane]: steps([0, 8, 16, 24]),
      [VOICE_LANES[lane].voiceKey]: v.id,
    };
    const { outL, outR, peak } = await renderer.render(bank, { repeat: 1, mix: null, trackId: null });
    const out = join(outDir, `${v.id}.wav`);
    writeFileSync(out, wavBuffer([outL, outR]));
    console.log(`${out.replace(root + '/', '')}  peak ${dbfs(peak)}  — ${v.label} on ${lane}`);
  }

  // The kit together: four on the floor, backbeat, eighth hats, a clap doubling the
  // snare in the second bar, the zap once on the downbeat of bar two.
  const demo = {
    bpm: 120,
    kick: steps([0, 8, 16, 24]),
    snare: steps([4, 12, 20, 28]),
    clap: steps([20, 28]),
    hats: steps([0, 2, 4, 6, 8, 10, 12, 16, 18, 20, 22, 24, 26, 28]),
    ohats: steps([14, 30]),
    crash: steps([16]),
    kickVoice: 'dsKick', snareVoice: 'dsSnare', clapVoice: 'dsClap',
    hatsVoice: 'dsHatClosed', ohatsVoice: 'dsHatOpen', crashVoice: 'dsZap',
  };
  const { outL, outR, peak } = await renderer.render(demo, { repeat: 2, mix: null, trackId: null });
  const out = join(outDir, '_kit-demo.wav');
  writeFileSync(out, wavBuffer([outL, outR]));
  console.log(`${out.replace(root + '/', '')}  peak ${dbfs(peak)}  — the kit together`);
} finally {
  await renderer.close();
}
console.log(`\n${drums.length} drum-synth presets auditioned — dist/drum-synth-auditions/`);
