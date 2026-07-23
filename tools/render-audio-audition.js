// Build one listening reel: a Plumber music pass followed by every generated
// weapon/contact SFX candidate. A timestamp index is written beside the WAV.
// Usage: node tools/render-audio-audition.js [outPath]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(process.argv[2] || join(root, 'dist', 'plumber-audio-audition.wav'));
const musicPath = join(root, 'dist', 'plumber-panic.wav');
const effectsDir = join(root, 'audio', 'weapon-candidates');
const GAP_S = 0.35;
const MUSIC_GAP_S = 0.8;
const ATTACK_MASTER_TRIM = 0.25;
const SR = 44100;

// Match the in-game trims for the nine cues now used by gameplay. The other
// candidates stay at their authored level for comparison.
const GAINS = {
  '01-b33p-laser-orb-pulse.wav': 0.92 * 0.42,
  '08-raymn-rocket-fist-launch.wav': 0.92 * 0.95,
  '18-grumpos-axe-throw-ring.wav': 0.92 * 0.82,
  '25-contact-b33p-orb-pop.wav': 0.45,
  '26-contact-grumpos-axe-chop.wav': 0.94,
  '27-contact-lorenzo-wrench-hit.wav': 0.95,
  '28-contact-raymn-fist-impact.wav': 0.76,
  '29-contact-fernwick-shield-bonk.wav': 0.98,
  '30-contact-miss-chomp-crunch.wav': 0.9,
};

function wavData(path) {
  const bytes = readFileSync(path);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`not a WAV: ${path}`);
  }
  const channels = bytes.readUInt16LE(22);
  const sampleRate = bytes.readUInt32LE(24);
  const bits = bytes.readUInt16LE(34);
  const dataTag = Buffer.from('data');
  const dataAt = bytes.indexOf(dataTag, 12);
  if (dataAt < 0 || channels !== 1 || sampleRate !== SR || bits !== 16) {
    throw new Error(`expected 44.1kHz/16-bit/mono WAV: ${path}`);
  }
  const size = bytes.readUInt32LE(dataAt + 4);
  const samples = new Float32Array(Math.floor(size / 2));
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readInt16LE(dataAt + 8 + i * 2) / 32768;
  return samples;
}

function silence(seconds) { return new Float32Array(Math.round(seconds * SR)); }

function append(target, source, gain = 1) {
  for (let i = 0; i < source.length; i++) target.push(source[i] * gain);
}

mkdirSync(dirname(outPath), { recursive: true });
const built = spawnSync(process.execPath, [join(root, 'tools', 'render-track.js'), 'plumber', '1', musicPath], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});
if (built.status !== 0) throw new Error(built.stderr || 'music render failed');

const effects = readdirSync(effectsDir).filter((name) => name.endsWith('.wav')).sort();
const samples = [];
const index = [];
let cursor = 0;
const music = wavData(musicPath);
append(samples, music);
index.push({ start: cursor, end: cursor + music.length, label: 'PLUMBER LEVEL MUSIC', source: musicPath });
cursor += music.length;
append(samples, silence(MUSIC_GAP_S)); cursor += Math.round(MUSIC_GAP_S * SR);

for (const name of effects) {
  const clip = wavData(join(effectsDir, name));
  const start = cursor;
  const attackTrim = GAINS[name] == null ? 1 : ATTACK_MASTER_TRIM;
  append(samples, clip, (GAINS[name] ?? 1) * attackTrim);
  cursor += clip.length;
  index.push({ start, end: cursor, label: name, source: join('audio', 'weapon-candidates', name) });
  append(samples, silence(GAP_S)); cursor += Math.round(GAP_S * SR);
}

let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
const norm = peak > 0 ? Math.min(1, 0.89 / peak) : 1;
const data = Buffer.alloc(samples.length * 2);
for (let i = 0; i < samples.length; i++) {
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * norm * 32767))), i * 2);
}
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(data.length, 40);
writeFileSync(outPath, Buffer.concat([header, data]));

const indexPath = outPath.replace(/\.wav$/i, '.txt');
const lines = [`${outPath}`, `duration ${(samples.length / SR).toFixed(2)}s`, ''];
for (const item of index) lines.push(`${(item.start / SR).toFixed(2)}-${(item.end / SR).toFixed(2)}  ${item.label}`);
writeFileSync(indexPath, `${lines.join('\n')}\n`);
console.log(`${outPath}: ${(samples.length / SR).toFixed(2)}s, ${effects.length} effects`);
console.log(indexPath);
