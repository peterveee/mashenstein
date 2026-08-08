// Which library presets are actively referenced by cabinet songs or style-pack
// starters — the ones worth keeping, and the complement the library's "Unused"
// filter shows so they can be cleaned up.
//
// Computed once at import time: the cabinet catalogue and the style packs are
// static data that never change at runtime, so there is nothing to invalidate.
//
// Engine presets (kind: 'engine') are excluded — they are code paths, not editable
// library entries, and "unused" has no meaning for them.
import { MIX } from './mix.js';
import { listTracks } from './tracks.js';
import { VOICES } from './voices.js';
import { SONG_STYLES } from '../../tools/lib/song-styles.js';

const COUNTED_GROUPS = new Set(['cabinet', 'theme']);

/** Every library voice id a cabinet song or theme names in its mix. */
function songVoiceIds() {
  const ids = new Set();
  for (const t of listTracks()) {
    if (!COUNTED_GROUPS.has(t.group)) continue;
    const mix = MIX[t.id];
    if (!mix?.voice) continue;
    for (const voiceId of Object.values(mix.voice)) {
      if (typeof voiceId !== 'string') continue;
      const v = VOICES[voiceId];
      if (v && v.kind !== 'engine') ids.add(voiceId);
    }
  }
  return ids;
}

/** Every voice id a style pack names in its bank. These are STARTER ids. */
function styleVoiceIds() {
  const ids = new Set();
  for (const style of SONG_STYLES) {
    if (!style.bank) continue;
    for (const [key, voiceId] of Object.entries(style.bank)) {
      // Only the keys that name a voice — skip musicTrim, drumGain, etc.
      if (!key.endsWith('Voice') || typeof voiceId !== 'string') continue;
      ids.add(voiceId);
    }
  }
  return ids;
}

/**
 * Every library preset id a cabinet song, theme, or style-pack starter references.
 *
 * A preset NOT in this set has no listener — it is safe to delete or refile.
 * Starter presets (the `STARTER` table) are included because every style pack
 * names them; a starter not named by any style pack has no path to being heard.
 */
export const USED_VOICE_IDS = new Set([...songVoiceIds(), ...styleVoiceIds()]);

/**
 * Is this a library preset that a cabinet song or style pack actively uses?
 * Engine presets (kind: 'engine') return true — they are code paths, not
 * clean-up candidates.
 */
export function isVoiceUsed(id) {
  const v = VOICES[id];
  if (!v || v.kind === 'engine') return true;
  return USED_VOICE_IDS.has(id);
}
