// Offline WAV render of the ta-da cue (audio.js tadaSamples): the synthesized Windows-style
// start-up fanfare played at the first cubicle monitors after the lift on office-2.
// Usage: node tools/render-tada.js [outDir]   (default work/sfx/tada.wav)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installDom } from '../tests/dom-stub.js';

installDom();
const { tadaSamples } = await import('../src/engine/audio.js');
const root = resolve(join(fileURLToPath(import.meta.url), '..', '..'));
const outDir = resolve(process.argv[2] || join(root, 'work', 'sfx'));
const SR = 44100;
const x = tadaSamples(SR);
const pcm = Buffer.alloc(44 + x.length * 2);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + x.length * 2, 4); pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write('data', 36); pcm.writeUInt32LE(x.length * 2, 40);
for (let i = 0; i < x.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
mkdirSync(outDir, { recursive: true });
const file = join(outDir, 'tada.wav');
writeFileSync(file, pcm);
console.log(file);
