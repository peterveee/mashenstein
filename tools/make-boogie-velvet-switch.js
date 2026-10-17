// A wholly new melody over Peter's saved Minute Waltz boogie backing.
// The original riff and its direct doubles remain in the song, muted, for A/B on the Desk.
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as source from '../src/data/imported/chopin-minute-waltz-boogie-rhythm.js';
import { n } from '../src/engine/notes.js';
import { songFile } from './lib/song-source.js';
import { writeImportedIndex } from './lib/imported-index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const id = 'chopin-minute-waltz-boogie-velvet-switch';
const path = join(root, 'src/data/imported', id + '.js');
if (existsSync(path) && !process.argv.includes('--force')) {
  throw new Error(path + ' already exists; use --force to deliberately regenerate it');
}
const bank = structuredClone(source.bank);
const mix = structuredClone(source.mix);
const arrangement = structuredClone(source.arrangement);
if (bank.sections.length !== 32) throw new Error('the backing is no longer 64 bars');

// Original, singable two-bar question/answer: an offbeat ascent over C# major,
// then a falling answer through F minor. Its later phrases open upward over
// F# major, and resolve through D#m7 and G#7. Every phrase has breathing space
// for the existing clav, bass, guitar arp and horn replies.
const A = [[1,'C#5',2],[4,'F5',1],[6,'G#5',3],[10,'A#5',1],[11,'G#5',2],[14,'F5',1]];
const B = [[0,'G#5',2],[3,'F5',2],[6,'D#5',1],[7,'C5',3],[11,'D#5',2],[14,'F5',1]];
const A_HIGH = [[1,'C#5',2],[4,'F5',1],[6,'G#5',3],[10,'C#6',2],[13,'A#5',1],[15,'G#5',1]];
const FS = [[0,'A#5',2],[3,'C#6',2],[6,'A#5',2],[9,'F#5',2],[12,'G#5',1],[14,'A#5',2]];
const A_FALL = [[0,'G#5',3],[4,'F5',1],[6,'C#5',2],[9,'F5',2],[12,'G#5',3]];
const A_PUSH = [[1,'C#5',2],[4,'F5',1],[6,'G#5',2],[9,'F5',1],[10,'D#5',2],[13,'F5',1],[15,'G#5',1]];
const DM = [[0,'F#5',2],[3,'A#5',2],[6,'C#6',2],[10,'A#5',1],[11,'F#5',2],[14,'D#5',1]];
const DM2 = [[1,'D#5',2],[4,'F#5',1],[6,'A#5',2],[9,'C#6',2],[12,'A#5',1],[14,'F#5',1]];
const GS = [[0,'G#5',2],[3,'A#5',1],[5,'C6',2],[8,'D#6',2],[11,'C6',1],[13,'A#5',2],[15,'G#5',1]];
const GS2 = [[0,'C6',2],[3,'A#5',1],[5,'G#5',2],[8,'F#5',2],[11,'D#5',1],[13,'C5',2],[15,'D#5',1]];

const bars = [
  // Exposed intro: fragments, then a rising pickup.
  [[6,'C#5',3],[12,'F5',2]],
  [[3,'G#5',2],[10,'F5',2]],
  [[1,'C#5',2],[6,'F5',1],[10,'G#5',3]],
  [[0,'G#5',2],[4,'A#5',1],[8,'C6',1],[11,'D#6',2]],
  // Build: let the whole hook emerge against the four-chord groove.
  A, B, A_HIGH, FS,
  // Drop 1: three eight-bar passes, with a changed back half in the middle.
  A, B, A_HIGH, FS, A_FALL, A_PUSH, DM, GS,
  A, B, A_HIGH, FS, DM, GS, DM2, GS2,
  A, B, A_HIGH, FS, A_FALL, A_PUSH, DM2, GS,
  // Breakdown: a low, lyrical outline leaves the existing arps in front.
  [[0,'C#5',6],[10,'F5',3]],
  [[0,'D#5',3],[8,'F#5',3]],
  [[0,'G#5',4],[8,'F5',2]],
  [[0,'F5',4],[8,'A#5',2]],
  [[2,'C#5',4],[10,'G#5',3]],
  [[0,'F5',4],[9,'D#5',2]],
  [[0,'D#5',3],[7,'A#5',2]],
  [[0,'C#6',4],[7,'A#5',2],[11,'G#5',2]],
  // Rebuild, then a higher-energy return of the hook.
  A, B, A_HIGH, FS,
  A, B, A_HIGH, FS, DM, GS, DM2, GS2,
  A_HIGH, B, A_HIGH, FS, A_FALL, A_PUSH, DM2, GS,
  // Outro: the tune peels back to its three-note signature and resolves.
  [[0,'C#5',3],[5,'F5',2],[10,'G#5',4]],
  [[0,'G#5',3],[5,'F5',2],[10,'C5',4]],
  [[0,'C#5',3],[5,'F5',2],[10,'G#5',4]],
  [[0,'G#5',3],[5,'F5',2],[9,'D#5',2],[12,'C#5',4]],
];
if (bars.length !== 64) throw new Error('the original melody must cover exactly 64 bars');
bank.lead7 = Array(32).fill(null);
for (let bar = 0; bar < bars.length; bar++) {
  const section = bank.sections[Math.floor(bar / 2)];
  if (!section.lead7) section.lead7 = Array(32).fill(null);
  if (!section.lead7Len) section.lead7Len = Array(32).fill(null);
  const offset = (bar % 2) * 16;
  for (const [step, pitch, length] of bars[bar]) {
    if (step < 0 || step >= 16 || length <= 0 || step + length > 16
        || section.lead7[offset + step]) {
      throw new Error('invalid melody event in bar ' + (bar + 1));
    }
    section.lead7[offset + step] = n(pitch);
    section.lead7Len[offset + step] = length;
  }
}

mix.layers.push({ key: 'lead7', from: 'lead', independent: true });
mix.order.splice(mix.order.indexOf('lead') + 1, 0, 'lead7');
mix.labels = { ...(mix.labels || {}), lead7: 'VELVET SWITCH · talk-box hook' };
mix.voice = { ...(mix.voice || {}), lead7Voice: 'bestVoiceBox70s' };
mix.lanes = { ...(mix.lanes || {}),
  lead: { ...(mix.lanes?.lead || {}), mute: true },
  lead3: { ...(mix.lanes?.lead3 || {}), mute: true },
  lead5: { ...(mix.lanes?.lead5 || {}), mute: true },
  lead7: { gain: -6.5, pan: 0.06, send: { delay: 0.17, reverb: 0.11 } } };

const title = 'BOOGIE AFTER HOURS · VELVET SWITCH';
const note = 'A completely original, funk-shaped talk-box melody over Peter’s saved\n'
  + 'Minute Waltz boogie backing. The previous main riff and its direct doubles\n'
  + 'are present but muted. Clav, bass, drums, horn replies, guitar\n'
  + 'arps, the saved mix, and the hand-edited arrangement are retained.\n'
  + 'Backing source score: https://www.ibiblio.org/mutopia/cgibin/piece-info.cgi?id=483\n'
  + 'Regenerate from the edited rhythm cut with node tools/make-boogie-velvet-switch.js --force.';
writeFileSync(path, songFile({ id, title, slug: id, group: 'imported', bank, mix,
  arrangement, variants: structuredClone(source.variants), note, seed: source.seed,
  banger: structuredClone(source.banger) }));
writeImportedIndex(root);
console.log(id + ': original 64-bar melody on lead7; old lead muted');
