// The two unsaved halves of one song on the mixing desk.
//
// A duplicated lane lives in the mix draft; a painted step lives in the arrangement
// draft. Any operation that claims to replace or discard a SONG must move both or it
// leaves a hybrid behind: old channels playing the new balance, or new notes surviving
// a revert. These helpers keep that boundary small enough to test without a browser.

const clone = (value) => JSON.parse(JSON.stringify(value));

export const EMPTY_MIX = Object.freeze({
  master: 0, masterPan: 0, limiter: false, lanes: {},
});

/** Discard every unsaved decision for exactly one song. */
export function discardSongDraft(mixDraft, arrangementDraft, id) {
  delete mixDraft[id];
  delete arrangementDraft[id];
}

/**
 * Load one historical version into the drafts, including an explicit empty half.
 * Other songs are deliberately untouched.
 */
export function restoreSongDraft(mixDraft, arrangementDraft, id, mixEntry, arrangementEntry) {
  mixDraft[id] = clone(mixEntry ?? EMPTY_MIX);
  arrangementDraft[id] = clone(arrangementEntry ?? null);
}

