// Render the voice catalogue so it can be heard rather than read.
//
// A table of synth options is not a sound. This renders one WAV per voice on a real
// song — with the ENGINE reference beside it, rendered from the same take — so each
// one is an A/B against the voice it would replace rather than a thing you have to
// imagine. Only the lane being auditioned changes; everything else is the song as it
// stands, because a bass judged on its own tells you nothing about a bass under a kit.
//
// Usage: node tools/render-voice-auditions.js [trackId] [repeats] [lane|category]
// e.g.:  node tools/render-voice-auditions.js hub 1
//        node tools/render-voice-auditions.js plumber 1 bass
//        node tools/render-voice-auditions.js plumber 1 "Drums & Percussion"
//
// With 65 presets over 13 lanes the whole set is hundreds of renders, so it takes a
// filter: a lane name does that lane only, a category name does that category on
// every lane it suits.
//
// Writes dist/voice-auditions/<lane>-engine.wav and <lane>-<voiceId>.wav.
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { MIX } from '../src/data/mix.js';
import { VOICES, VOICE_LANES, voicesFor } from '../src/data/voices.js';
import { LANES } from '../src/engine/lanes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [trackId = 'plumber', repeatArg = '1', filter = null] = args;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 1);
const track = resolveOrExit(trackId);
const outDir = join(root, 'dist', 'voice-auditions');
mkdirSync(outDir, { recursive: true });

// The song's own saved mix underneath, so the audition is the song as it is heard —
// its trims, sends and effect chains — with one lane's voice swapped and nothing else.
const base = MIX[track.id] || {};

// Only lanes this song actually plays. Auditioning a chord voice on a track with no
// chords writes a file that is identical to the reference and tells you nothing.
const plays = (key) => (track.bank[key] && track.bank[key].some(Boolean))
  || (track.bank.sections || []).some((s) => s[key] && s[key].some(Boolean));
let lanes = Object.keys(VOICE_LANES).filter(plays);
if (filter && VOICE_LANES[filter]) lanes = lanes.filter((l) => l === filter);
if (!lanes.length) {
  console.error(`${track.id} plays none of the lanes a voice can go on `
    + `(${Object.keys(VOICE_LANES).join(', ')}).`);
  process.exit(1);
}

const renderer = await openRenderer();
try {
  for (const lane of lanes) {
    const wanted = voicesFor(lane).filter((v) => !filter || VOICE_LANES[filter] || v.category === filter);
    if (!wanted.length) continue;
    const takes = [[null, 'engine'], ...wanted.map((v) => [v.id, v.id])];
    for (const [voiceId, name] of takes) {
      const mix = voiceId
        ? { ...base, voice: { ...(base.voice || {}), [VOICE_LANES[lane].voiceKey]: voiceId } }
        : base;
      const { outL, outR, seconds, peak } = await renderer.render(track.bank, {
        repeat: REPEAT, mix, trackId: track.id,
      });
      const out = join(outDir, `${lane}-${name}.wav`);
      // Unity, like every other render here: normalising would hide the very thing
      // the catalogue's levels were calibrated to get right.
      writeFileSync(out, wavBuffer([outL, outR]));
      const label = voiceId ? VOICES[voiceId].label : 'the engine’s own';
      console.log(`${out.replace(root + '/', '')}  ${seconds.toFixed(1)}s  peak ${dbfs(peak)}`
        + `  — ${lane}: ${label}`
        + (peak > 1 ? '  ** CLIPS **' : ''));
    }
  }
} finally {
  await renderer.close();
}
console.log(`\n${track.id}: ${lanes.length} lane${lanes.length === 1 ? '' : 's'} auditioned`
  + ` — dist/voice-auditions/`);
