// Which of the library's QUOTATIONS the game still plays — and so what the desk's
// preset selector should offer.
//
// A quotation is an engine preset mined from one song: `Finale Saw Stab`, `Layaway
// Organ`, `Lounge Bass`. Its whole claim is provenance — this is the sound that thing
// makes — and a quotation of a sound nothing makes any more is a name for nothing,
// sitting in the picker looking like it came from somewhere. Retune the finale's stab
// and the preset does not follow it; park the shop audition it was taken from and the
// sound is only in the picker. So a quotation earns its row by still being played.
//
// The engine's OWN presets are not affected and must not be: the filtered saw, the 80s
// stack, the bright drawbars and the plain sine are things `scheduleStep` can be asked
// to do, and a capability with nobody currently using it is still a capability. Only
// the `quoted` entries in src/data/voices.js answer to this — see the note there.
//
// It lives HERE rather than in voices.js because voices.js is a leaf: it imports
// nothing, which is what lets tools/lib/voices-source.js write a candidate copy of it
// to a temp directory and import it back to prove the edit parses (tests/voice-source.js).
// This module is the one that knows both halves — the catalogue and the song registry.
import { VOICES, VOICE_LANES, defaultVoiceOf, voicesFor, voicesByCategory } from './voices.js';
import { synthFamily as engineFamily } from '../engine/synth-families.js';
import { listTracks, resolveTrack } from './tracks.js';

// Preset selection is a FAMILY choice, not a request to rewrite the stored voice, so
// compare both sides through the engine's own rename map and leave the persisted identity
// untouched. This used to be a local one-liner that knew about CRLS-1 and nothing else,
// which meant a lane still carrying `GameSynth` or `FMSynth` was offered no presets at
// all: every preset in the catalogue had been renamed out from under a raw-string
// comparison. See src/engine/synth-families.js — one map, so it cannot drift again.

/**
 * IN THE GAME means a cabinet's music or a game theme, and nothing else.
 *
 * The parked shop auditions are in the registry so the desk can open them, but nobody
 * hears them — a sound surviving only in a candidate that lost is exactly what this is
 * for. Imported and scratch songs are out at the other end: a preset would blink into
 * the library because a .mid was dropped on the desk this morning, and blink out again
 * when it was deleted.
 */
const COUNTED = new Set(['cabinet', 'theme']);

/**
 * The quoted presets a counted song still plays, as a Set of ids.
 *
 * Asked per bank AND per section, because a song can change a lane's timbre halfway
 * and `defaultVoiceOf` deliberately answers null when the sections disagree — a strip
 * cannot label a lane that is two sounds, but a preset one of those sections plays is
 * plainly still played. A view carries `sections: null` so reading it is a leaf, which
 * is the same shape `bankViews` builds inside voices.js.
 *
 * Computed once, on the first picker to open. The two counted groups are built at
 * module load and never change — `registerTrack` only ever adds an imported or scratch
 * song, and neither counts — so there is nothing to invalidate.
 */
let PLAYED = null;
export function quotesInPlay() {
  if (PLAYED) return PLAYED;
  const out = new Set();
  const read = (view) => {
    for (const lane of Object.keys(VOICE_LANES)) {
      const v = defaultVoiceOf(view, lane);
      if (v?.quoted) out.add(v.id);
    }
  };
  for (const t of listTracks()) {
    if (!COUNTED.has(t.group)) continue;
    const bank = resolveTrack(t.id)?.bank;
    if (!bank) continue;
    read(bank);
    for (const s of Array.isArray(bank.sections) ? bank.sections : []) {
      if (s) read({ ...bank, ...s, sections: null });
    }
  }
  PLAYED = out;
  return out;
}

/** Is this preset one the selector should offer? `keep` is what the lane plays now. */
const offered = (keep) => {
  const played = quotesInPlay();
  // A preset the library would leave off the menu is still offered while this lane is
  // the thing playing it: a picker cannot hide the row it is meant to be highlighting,
  // and a mix that chose one of these before it was filtered must still show as chosen
  // and be returnable to. Nothing in the game names one today — it is the desk's own
  // saved mixes that can.
  return (v) => !v.quoted || v.id === keep || played.has(v.id);
};

/**
 * `voicesFor`, less the quotations nothing plays. What the preset selector offers.
 *
 * The library itself is unchanged and every preset stays resolvable: a mix naming one
 * of these goes on playing it, and `defaultVoiceOf` goes on naming it on the strip of
 * the audition it was mined from. This is the MENU, not the catalogue.
 */
export function offeredVoices(laneKey, { keep = null } = {}) {
  return voicesFor(laneKey).filter(offered(keep));
}

/** The same, grouped the way `voicesByCategory` groups it, empty categories dropped. */
export function offeredByCategory(laneKey, { keep = null } = {}) {
  const ok = offered(keep);
  return voicesByCategory(laneKey)
    .map(([category, list]) => [category, list.filter(ok)])
    .filter(([, list]) => list.length);
}

/**
 * Presets for a full editor, filtered by the engine that will actually play them.
 *
 * A full-window editor has no reason to know about lane names when it is being used as
 * an instrument on its own, but the Song Mixer still needs the lane-aware restrictions
 * from `voicesFor`. Keeping that choice here means both surfaces apply the same rules:
 * no engine bundles, starters, drafts, private song copies, or parked quotations.
 */
export function offeredByEngine(engine, { laneKey = null, keep = null } = {}) {
  const wanted = engineFamily(engine);
  const list = laneKey
    ? offeredVoices(laneKey, { keep })
    : Object.values(VOICES).filter((v) =>
      !v.songLocal && !v.nameOnly && !v.starter && !v.draft && v.kind !== 'engine'
      && (!v.quoted || v.id === keep || quotesInPlay().has(v.id)));
  return list.filter((v) => {
    const key = v.kind === 'drum' ? 'drum' : engineFamily(v.synth);
    return key === wanted;
  });
}
