// CLI for the MIDI export. The walk itself lives in lib/render-midi-bank.js,
// shared with render-stems.js so a stem folder's .mid always matches its WAVs.
// Usage: node tools/render-midi.js [trackId] [repeats] [outPath] [--patches|--gm-channels]
// e.g.:  node tools/render-midi.js hub 1 dist/food-court.mid
//
// Every part is written on channel 1 (drums on 10), because Logic turns a
// multi-channel file into External MIDI tracks routed by channel — silent until
// pointed at a device. `--patches` adds each lane's GM program (still channel 1),
// which is what a DAW wants; `--gm-channels` is the full GM layout — one channel
// and one program per lane — for a hardware module or GM player, not for Logic.
import { writeFileSync } from 'fs';
import { midiBuffer, MIDI_UNSUPPORTED_LANES } from './lib/render-midi-bank.js';
import { activeLanes } from '../src/engine/lanes.js';
import { resolveOrExit } from './lib/tracks.js';
import { bpmOf } from '../src/data/arrangements.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const GM = process.argv.includes('--gm-channels');
const PATCHES = GM || process.argv.includes('--patches');
const [trackId = 'hub', repeatArg = '1', outArg = null] = args;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 1);
const track = resolveOrExit(trackId);
const OUT = outArg || `dist/${track.slug}.mid`;

const { buffer, trackNames, tracks, ppq, blocks, seconds, trimmed, deadPitches } =
  midiBuffer(track.bank, {
    repeat: REPEAT, title: track.title, gmChannels: GM, patches: PATCHES,
    bpm: bpmOf(track.bank, track.id),
  });
writeFileSync(OUT, buffer);
console.log(`${OUT} — ${trackNames.length} instrument tracks, ${blocks} blocks (${seconds.toFixed(1)}s at ${bpmOf(track.bank, track.id)}bpm)`);
// Where each part actually plays. A lane that does not come in until section 3 is
// silent over the first bars BY DESIGN, and looks like a broken export otherwise.
const w = Math.max(...tracks.map((t) => t.name.length));
const bar = (tick) => tick / (ppq * 4) + 1;
for (const t of tracks) {
  console.log(`  ${t.name.padEnd(w)}  ch${String(t.ch).padStart(2)}  ${String(t.notes).padStart(4)} notes`
    + `   bars ${bar(t.firstTick).toFixed(2)}–${bar(t.lastTick).toFixed(2)}`);
}
console.log(GM
  ? '  one channel and one GM program per part (--gm-channels) — for hardware/GM players, not Logic'
  : PATCHES
    ? '  every part on channel 1 with its GM program (--patches)'
    : '  every part on channel 1, drums on 10 — assign instruments per track in your DAW');
if (trimmed) console.log(`  ${trimmed} notes shortened to clear a same-pitch retrigger`);
if (deadPitches) console.log(`  ${deadPitches} unparseable 0 Hz pitches dropped — the bank plays these silent too (see chordSeq)`);

const dropped = activeLanes(track.bank, REPEAT)
  .map((l) => l.key)
  .filter((k) => MIDI_UNSUPPORTED_LANES.includes(k));
if (dropped.length) console.log(`  note: ${dropped.join(', ')} has no MIDI equivalent (unpitched noise) and is not in this file`);
