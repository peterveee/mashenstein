// Scratch-song generation for the mixer. The engine still owns playback and the desk
// only chooses a starter shape; what this file does is turn one seed into a playable
// song whose source reads like every other song file in the repository.
//
// The musical machinery lives in new-song-plan.js (browser-safe, no Node imports).
// This file adds the server-side half: writing the generated bank out as a source
// file. Everything the static mixer needs is in new-song-plan.js.
import { songFile } from './song-source.js';
import { slugFor } from './imported-index.js';
import { newSongPlan } from './new-song-plan.js';
import { styleSummary } from './song-styles.js';
import { MIXER_BRAND } from '../mixer-brand.js';

// Re-export everything from the plan module so existing callers are unaffected.
export {
  NEW_SONG_TEMPLATES, NEW_SONG_STYLES, NEW_SONG_DEFAULTS, NEW_SONG_LIMITS,
  NEW_SONG_DEFAULT_SEED, normalizeSeed, styleFor, validateNewSong,
  newSongPlan, buildNewSongBank,
} from './new-song-plan.js';

/**
 * Build the source file for a new scratch song.
 *
 * Written into `work/scratch/` by the desk (see SCRATCH_DIR) and into
 * `src/data/imported/` by tools/style-auditions.js, which is the same generator filed
 * under its own heading. Two destinations, two ways to reach the note shorthand, so the
 * caller says which — the default is the in-tree one every other song file uses.
 */
export function newScratchSong({
  id, title, slug = id, group = 'scratch', notesPath, ...input
} = {}) {
  if (!id) throw new Error('a scratch song needs an id');
  const { spec, seed, style, root, bank, key } = newSongPlan({ title, ...input });
  const source = songFile({
    id,
    title: spec.title,
    slug,
    // The desk's own New Song makes scratch songs and names nothing. The one caller
    // that does is tools/style-auditions.js, whose songs are the same thing filed
    // under their own heading — see the group list in src/data/tracks.js.
    group,
    bank,
    mix: null,
    arrangement: null,
    seed,
    ...(notesPath ? { notesPath } : {}),
    note: `Created in the ${MIXER_BRAND} as a ${spec.template} starter.\n`
      + styleSummary(style, root, spec.bpm),
  });
  return {
    ...spec, id, slug, seed, bank, source, key,
    style: style.id, styleLabel: style.label,
  };
}

export { slugFor };
export { randomSongName, songNameAt, SONG_NAME_COUNT } from './song-names.js';
export { SONG_STYLES, STYLE_BY_ID } from './song-styles.js';
