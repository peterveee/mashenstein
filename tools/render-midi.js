// CLI for the MIDI export. The walk itself lives in lib/render-midi-bank.js,
// shared with render-stems.js so a stem folder's .mid always matches its WAVs.
// Usage: node tools/render-midi.js [trackId|hub|title|finale|megamix|shop] [repeats] [outPath]
// e.g.:  node tools/render-midi.js hub 1 dist/food-court.mid
import { writeFileSync } from 'fs';
import { midiBuffer, MIDI_UNSUPPORTED_LANES } from './lib/render-midi-bank.js';
import { activeLanes } from './lib/render-bank.js';
import { resolveOrExit } from './lib/tracks.js';

const [, , trackId = 'hub', repeatArg = '1', outArg = null] = process.argv;
const REPEAT = Math.max(1, parseInt(repeatArg, 10) || 1);
const track = resolveOrExit(trackId);
const OUT = outArg || `dist/${track.slug}.mid`;

const { buffer, trackNames, blocks, seconds, trimmed, deadPitches } = midiBuffer(track.bank, { repeat: REPEAT, title: track.title });
writeFileSync(OUT, buffer);
console.log(`${OUT} — ${trackNames.length} instrument tracks, ${blocks} blocks (${seconds.toFixed(1)}s at ${track.bank.bpm}bpm)`);
console.log(`  ${trackNames.join(', ')}`);
if (trimmed) console.log(`  ${trimmed} notes shortened to clear a same-pitch retrigger`);
if (deadPitches) console.log(`  ${deadPitches} unparseable 0 Hz pitches dropped — the bank plays these silent too (see chordSeq)`);

const dropped = activeLanes(track.bank, REPEAT)
  .map((l) => l.key)
  .filter((k) => MIDI_UNSUPPORTED_LANES.includes(k));
if (dropped.length) console.log(`  note: ${dropped.join(', ')} has no MIDI equivalent (unpitched noise) and is not in this file`);
