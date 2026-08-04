// Audition the SPEED BURST music warp: each cabinet song as the game plays it
// under a burst, next to itself at rest.
//
// The point of the set is the pair, so render the same song at every warp it can
// be heard at and name the files so they sort together. The warps come from
// powerups.js rather than being written down again here — an audition that has to
// be kept in step with the game by hand is an audition you stop trusting.
//
// Not a bpm change: see the note in lib/render-bank-browser.js. The mix's echoes
// stay timed against the song's own tempo while the transport speeds up, which is
// the artifact worth listening for and the reason the numbers are not larger.
//
// Usage: node tools/render-speed-burst-auditions.js [trackId ...] [--repeat N]
//        node tools/render-speed-burst-auditions.js            # crypt, plumber, speed
//
// --repeat matters for the short forms: a burst lasts 10-13 seconds in the game,
// and a song whose whole form is 7 of them gives the ear nothing to settle on.
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer, dbfs } from './lib/wav.js';
import { resolveOrExit } from './lib/tracks.js';
import { Powerups } from '../src/game/powerups.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'work', 'auditions', 'speed-burst');

// The three worth hearing by default: the slowest song (longest delay times, so
// the most drift), the one you meet first, and the fastest — which is also the
// cabinet whose boost pads put a burst in your hand most often.
const DEFAULT_TRACKS = ['crypt', 'plumber', 'speed'];

// Ask the game what a burst does to the music, at each level it comes in.
function burstWarps() {
  const at = (level) => {
    const p = new Powerups({});
    p.active.speed = { t: 10, t0: 10, level };
    return p.musicTempoMultiplier();
  };
  return [
    { tag: 'rest', tempo: 1 },
    { tag: 'burst1', tempo: at(1) },
    { tag: 'burst2', tempo: at(2) },
  ];
}

const argv = process.argv.slice(2);
const flagAt = argv.findIndex((a) => a.startsWith('--repeat'));
const REPEAT = Math.max(1, flagAt < 0 ? 1
  : parseInt(argv[flagAt].split('=')[1] ?? argv[flagAt + 1], 10) || 1);
// The value of `--repeat N` is an argument too, and it is not a track id. Compared
// against the flag's INDEX rather than against the flag itself — matching on an
// absent flag makes `undefined === undefined` true and eats the first real id.
const ids = argv.filter((a, i) => !a.startsWith('--') && !(flagAt >= 0 && i === flagAt + 1));
const tracks = (ids.length ? ids : DEFAULT_TRACKS).map(resolveOrExit);
const warps = burstWarps();

mkdirSync(outDir, { recursive: true });
const renderer = await openRenderer();
try {
  for (const track of tracks) {
    for (const warp of warps) {
      // Pitch stays at unity: the burst moves the clock only, and hearing it
      // against a pitched copy would be auditioning the star instead.
      const { outL, outR, seconds, peak } = await renderer.render(track.bank, {
        repeat: REPEAT, trackId: track.id, warp: { tempo: warp.tempo, pitch: 1 },
      });
      const out = join(outDir, `${track.slug}-${warp.tag}.wav`);
      writeFileSync(out, wavBuffer([outL, outR]));
      const bpm = track.bank.bpm * warp.tempo;
      process.stdout.write(`${out}: ${seconds.toFixed(1)}s, `
        + `${track.bank.bpm} -> ${bpm.toFixed(1)} bpm (x${warp.tempo.toFixed(2)}), `
        + `peak ${dbfs(peak)}\n`);
    }
  }
} finally {
  await renderer.close();
}
