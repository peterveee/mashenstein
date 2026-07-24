// Deterministic mono WAV audition set for MASHENSTEIN hero abilities.
// These are deliberately standalone candidates: generating them does not wire
// any sound into gameplay, so choices can be made by ear first.
//
// The synthesis recipes live in src/engine/weapon-sfx.js so the game and this
// tool render from one source — the nine wired cues can never drift from the
// audition files. This tool just walks every candidate and writes it to disk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUES, renderCue } from '../src/engine/weapon-sfx.js';

const RATE = 44100;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../audio/weapon-candidates');

function wavBytes(samples) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    bytes.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  }
  return bytes;
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name] of CUES) {
  fs.writeFileSync(path.join(OUT, name), wavBytes(renderCue(name, RATE)));
}
console.log(`Wrote ${CUES.length} WAV candidates to ${OUT}`);
