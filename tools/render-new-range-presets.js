// The nine presets of 27 Oct 2026 that need the widened ranges, each playing a phrase that
// suits it, through the game's own offline render — the same path every WAV and stem uses.
//
//   node tools/render-new-range-presets.js      → work/auditions/new-range-presets/*.wav
//
// Unity gain, like render-voice-auditions.js: the measured levels are part of what is
// being checked, so normalising would hide them.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { seq, chordSeq } from '../src/engine/notes.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'work', 'auditions', 'new-range-presets');
mkdirSync(OUT, { recursive: true });

/** A lengths array: `len` steps on every step that has a note. */
const lens = (notes, len) => notes.map((x) => (x == null ? null : len));
const hits = (slots, at) => Array.from({ length: slots }, (_, i) => at.includes(i));

// Each take: the preset, its lane, a bpm, seconds of tail after the two bars, the lanes'
// notes (and lengths), and the existing preset it is closest to — rendered on the same
// phrase right after it, so the level and the character can be compared by ear.
const TAKES = [
  ['tngrTidalWavetable', 'chords', 60, 26, () => {
    const chords = chordSeq('A2min7 ' + '. '.repeat(31));
    return { chords, chordsLen: lens(chords, 112) };
  }, 'tngrBurntHorizon'],
  ['tngrGlassRing', 'chords', 90, 4, () => {
    const chords = chordSeq('A3min7 . . . . . . . . . . . . . . . | F3maj7 . . . . . . . . . . . . . . .');
    return { chords, chordsLen: lens(chords, 14) };
  }, 'tngrBurntHorizon'],
  ['layerGrowlPad', 'chords', 90, 4, () => {
    const chords = chordSeq('D3min7 . . . . . . . . . . . . . . . | A#2maj7 . . . . . . . . . . . . . . .');
    return { chords, chordsLen: lens(chords, 15) };
  }, 'layerDreamPad'],
  ['addCathedralBell', 'twinkle', 60, 22, () => {
    const twinkle = seq('D4 . . . . . . . . . . . . . . . | A3 . . . . . . . . . . . . . . .');
    return { twinkle, twinkleLen: lens(twinkle, 4) };
  }, 'addBell'],
  ['bestBuzzwireLead', 'lead', 110, 4, () => {
    const lead = seq('A4 . . . C5 . D5 . E5 . . . D5 . C5 . | A4 . . . G4 . A4 . . . . . . . . .');
    return { lead, leadLen: lens(lead, 2) };
  }, 'bestPwmHollowLead'],
  ['layerRobotTremor', 'lead', 100, 4, () => {
    const lead = seq('C4 . . . . . D#4 . . . C4 . . . . . | G3 . . . . . . . A#3 . . . . . . .');
    return { lead, leadLen: lens(lead, 5) };
  }, null],
  ['tomClank', 'tom', 110, 4, () => ({ tom: hits(32, [0, 3, 6, 8, 16, 19, 22, 24, 26, 28]) }), 'tr808Tom'],
  ['kickIron', 'kick', 120, 4, () => ({ kick: hits(32, [0, 8, 16, 24, 27]) }), 'tr909Kick'],
  ['dsLaserZap', 'crash', 120, 4, () => ({ crash: hits(32, [0, 12, 16, 28]) }), 'dsZap'],
];

const renderer = await openRenderer();
try {
  let n = 1;
  for (const [id, lane, bpm, tail, notes, ref] of TAKES) {
    for (const voice of ref ? [id, ref] : [id]) {
      const bank = { bpm, ...notes(), [VOICE_LANES[lane].voiceKey]: voice };
      const { outL, outR, seconds, peak } = await renderer.render(bank, { repeat: 1, mix: null, trackId: null, tail });
      const file = voice === id ? `${String(n).padStart(2, '0')}-${id}.wav` : `${String(n).padStart(2, '0')}b-ref-${voice}.wav`;
      writeFileSync(join(OUT, file), wavBuffer([outL, outR]));
      console.log(`  ${file.padEnd(34)} ${seconds.toFixed(1)}s  peak ${dbfs(peak)}  — ${VOICES[voice].label} on ${lane}`
        + (peak > 1 ? '  ** CLIPS **' : ''));
    }
    n++;
  }
} finally {
  await renderer.close();
}
