// Track-id resolution for the offline render tools.
//
// The registry itself moved to src/data/tracks.js, because the mixing desk and the
// running game need it too — a saved mix is keyed by track id, and the game only
// ever holds a bank object. This file is the node-side wrapper: the same
// resolution, plus the CLI-friendly exit path.
//
// Importing this module also registers everything in src/data/imported/, so a song
// that came in from a .mid is a track every CLI tool can render, export and mix —
// the game's own bundle never pulls that folder in.
export { resolveTrack, listTracks, trackIdOf, registerTrack, unregisterTrack } from '../../src/data/tracks.js';
import { resolveTrack } from '../../src/data/tracks.js';

// Guarded, because that index is generated from a folder people edit: delete a bank
// by hand and a static import turns every tool in here into a module-resolution stack
// trace, including the one that repairs the list. A tool that still runs and says
// what to do beats one that cannot start.
try {
  await import('../../src/data/imported/index.js');
} catch (err) {
  console.error(`src/data/imported is not loading, so imported songs are unavailable:`);
  console.error(`  ${err.message || err}`);
  console.error('  fix or remove the bank, then: node tools/import-midi.js --reindex');
}

// The scratch drawer, separately and quietly. `work/` is gitignored, so a fresh clone
// simply has no scratch songs — that is the drawer working as designed, not a fault to
// report. Only a drawer that exists and will not load is worth a word.
try {
  await import('../../work/scratch/index.js');
} catch (err) {
  if (err?.code !== 'ERR_MODULE_NOT_FOUND' || !/work\/scratch\/index\.js/.test(String(err.message))) {
    console.error('work/scratch is not loading, so scratch songs are unavailable:');
    console.error(`  ${err.message || err}`);
    console.error('  fix or remove the bank, then: node tools/import-midi.js --reindex');
  }
}

export function resolveOrExit(trackId) {
  const track = resolveTrack(trackId);
  if (!track) {
    console.error(`unknown track "${trackId}" — try one of: hub, title, finale, megamix, shop, a cabinet id, a shop-theme id, or an imported id (src/data/imported)`);
    process.exit(1);
  }
  return track;
}
