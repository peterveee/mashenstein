// The widened ranges of 27 Oct 2026, heard: each new reach beside where the old pot stopped.
//
//   node tools/render-range-auditions.js            → work/auditions/ranges/*.wav
//
//   lfo-*    MRDR-3 Dream Pad's layer LFO on the filter, from its own 0.5 Hz to 200 (was 12)
//   pwm-*    MRDR-3 PWM Hollow Lead's width LFO, 0.4 Hz to 200 (was 12)
//   tngr-*   TNGR-2 Vowel Swell Pad's LFO 1 on table position, to 200 (was 8), and its
//            position envelope as a 25-second sweep (envelopes were capped at 10)
//   fm-*     the TR-808 Low Tom with Osc 1 FM DEPTH from 2 to 100 (was 8)
//
// MRDR-3 and TNGR-2 render in Node through their reference cores; the tom goes through the
// game's own offline render, because the drum engine is native nodes. Each file is
// normalised to a -1 dBFS peak — levels between them are not the point.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wavBuffer, SR } from './lib/wav.js';
import { normalise } from './render-frpp6-auditions.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';
import { compileMrdr3, mrdr3Colours } from '../src/engine/mrdr3/compile.js';
import { mrdr3NoiseSet } from '../src/engine/mrdr3/noise.js';
import { renderMrdr3 } from '../src/engine/mrdr3/dsp.js';
import { mrdr3Tables } from '../src/engine/mrdr3/tables.js';
import { renderTngr2 } from '../src/engine/tngr2/dsp.js';
import { packTngr2Tables } from '../src/engine/tngr2/tables.js';
import { tngr2PatchForVoice } from '../src/engine/tngr2/controller.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'work', 'auditions', 'ranges');
mkdirSync(OUT, { recursive: true });

const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const clone = (x) => JSON.parse(JSON.stringify(x));
let n = 1;
const write = (id, label, channels) => {
  const file = `${String(n++).padStart(2, '0')}-${id}.wav`;
  writeFileSync(join(OUT, file), wavBuffer(channels, normalise(channels)));
  console.log(`  ${file.padEnd(30)} ${label}`);
};

/** Notes as [startSeconds, midi or [midi…], lengthSeconds]. */
const eventsOf = (notes) => {
  const events = [];
  let id = 1;
  for (const [at, midi, len] of notes) {
    for (const m of Array.isArray(midi) ? midi : [midi]) {
      events.push({ type: 'noteOn', frame: Math.round(at * SR), eventId: id++, hz: hz(m),
        velocity: 1, durFrames: Math.round(len * SR) });
    }
  }
  return events.sort((a, b) => a.frame - b.frame);
};

console.log(`Range auditions → ${OUT}`);

// ---- MRDR-3 ---------------------------------------------------------------------------
const mrdrTables = mrdr3Tables();
const mrdrNoise = mrdr3NoiseSet(SR, mrdr3Colours(VOICES));
const mrdr = (voice, notes, seconds) => renderMrdr3({ events: eventsOf(notes), seconds, sampleRate: SR,
  channels: 2, patch: compileMrdr3(voice).patch, tables: mrdrTables, noise: mrdrNoise }).channels;

const PAD_CHORD = [[0, [48, 55, 60, 64], 3.5]];
for (const rate of [0.5, 12, 40, 110, 200]) {
  const v = clone(VOICES.layerDreamPad);
  v.layer.lfo = { ...v.layer.lfo, rate, delay: 0 };
  write(`lfo-dreampad-${rate}hz`, `MRDR-3 Dream Pad, filter LFO at ${rate} Hz${rate === 12 ? ' (the old top)' : ''}`,
    mrdr(v, PAD_CHORD, 5));
}

const LEAD_LINE = [[0, 57, 0.9], [1, 60, 0.9], [2, 64, 0.9], [3, 62, 1.6]];
for (const rate of [0.4, 12, 30, 80, 200]) {
  const v = clone(VOICES.bestPwmHollowLead);
  for (const k of ['osc1', 'osc2', 'osc3']) {
    if (v.layer[k]?.pwm) v.layer[k].pwm = { ...v.layer[k].pwm, rate };
  }
  write(`pwm-hollowlead-${rate}hz`, `MRDR-3 PWM Hollow Lead, PWM at ${rate} Hz${rate === 12 ? ' (the old top)' : ''}`,
    mrdr(v, LEAD_LINE, 6));
}

// ---- TNGR-2 ---------------------------------------------------------------------------
const tngr = (voice, notes, seconds) => {
  const patch = tngr2PatchForVoice(voice);
  const tables = packTngr2Tables([patch.oscA?.table, patch.oscB?.table].filter(Boolean));
  return renderTngr2({ events: eventsOf(notes), seconds, sampleRate: SR, tables, patch }).channels;
};
for (const rate of [0.3, 8, 40, 120, 200]) {
  const v = clone(VOICES.tngrBurntHorizon);
  v.tngr2.lfo1 = { ...(v.tngr2.lfo1 || {}), rate };
  // Its own LFO MOVE is a whisper (0.08 / -0.1); wound up so the rate is what is heard.
  v.tngr2.oscA.lfoAmount = 0.5;
  v.tngr2.oscB.lfoAmount = -0.4;
  write(`tngr-lfo-${rate}hz`, `TNGR-2 Vowel Swell Pad, LFO 1 at ${rate} Hz, LFO MOVE wound up${rate === 8 ? ' (the old top)' : ''}`,
    tngr(v, PAD_CHORD, 7));
}
{
  const v = clone(VOICES.tngrBurntHorizon);
  v.tngr2.positionEnv = { attack: 25, decay: 2, sustain: 1, release: 3 };
  v.tngr2.oscA.envAmount = 0.85;
  v.tngr2.oscB.envAmount = 0.7;
  v.tngr2.amp = { ...v.tngr2.amp, release: 6 };
  write('tngr-position-25s', 'TNGR-2 Vowel Swell Pad, position envelope ATTACK 25 s — one chord, 28 s',
    tngr(v, [[0, [45, 52, 57, 60], 28]], 34));
}

// ---- Drum FM, through the game's offline render ----------------------------------------
const { openRenderer } = await import('./lib/render-bank-browser.js');
const renderer = await openRenderer();
try {
  const lane = 'tom';
  const voiceKey = VOICE_LANES[lane].voiceKey;
  const steps = Array.from({ length: 32 }, (_, i) => [0, 6, 8, 16, 22, 24].includes(i));
  for (const index of [2, 8, 25, 60, 100]) {
    const v = clone(VOICES.tr808Tom);
    v.osc = { ...v.osc, fm: { type: 'sine', ratio: 1.4, decay: 0.35, ...(v.osc?.fm || {}), index } };
    const bank = { bpm: 120, [lane]: steps, [voiceKey]: 'tr808Tom' };
    const { outL, outR } = await renderer.render(bank,
      { repeat: 1, mix: { voiceParams: { [voiceKey]: v } }, trackId: null });
    write(`fm-808tom-${index}`, `TR-808 Low Tom, FM DEPTH ${index}${index === 8 ? ' (the old top)' : ''}`, [outL, outR]);
  }
} finally {
  await renderer.close();
}
