// The level editor's session history: what UNDO takes back, and what REVERT
// puts back.
//
// Two questions about one working copy, so they share one baseline. UNDO walks
// a stack of snapshots taken as the draft is edited; REVERT throws this stage's
// draft away and takes the last SAVED copy of it instead. The baseline moves on
// a save and nowhere else.
//
// That baseline also replaces the editor's `dirty` flag, which was set by every
// edit and cleared by a save but never re-derived — so an edit undone by hand
// still read as unsaved, and SAVE stayed lit with nothing to write. Comparing
// the draft to the baseline cannot drift, and it is the same comparison REVERT
// asks to decide whether it has anything to do.
//
// A snapshot is ONE stage, tagged with which stage it was. 27 layouts are live
// at once, and an undo that silently edited a level you were not looking at
// would be a worse mistake than the one it took back — so restoring goes to
// that stage, and what you undo is on screen when you undo it.
//
// The stack underneath is tools/mixer-undo.js, unchanged: "a drag is one step,
// not sixty" is the same transaction rule the voice editor needed, and it is
// already tested.
import { createUndoHistory } from '../mixer-undo.js';

const clone = (v) => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @param state  the editor's live state: { layouts, stageId, sel }. Mutated in
 *               place, because the page holds the same object.
 * @param saved  the layouts as the FILE has them — the first baseline.
 */
export function createLayoutHistory({ state, saved, limit = 100 }) {
  let baseline = clone(saved);

  const history = createUndoHistory({
    capture: () => ({ stageId: state.stageId, layout: clone(state.layouts[state.stageId]) }),
    restore: (snap) => {
      state.layouts[snap.stageId] = clone(snap.layout);
      state.stageId = snap.stageId;
      // The selection is an INDEX into arrays this just replaced: undoing an
      // added pit leaves {kind:'pit', i:3} pointing at nothing, and the
      // inspector would read a field off undefined. Dropping it is cheaper
      // than teaching six panels to doubt their own index.
      state.sel = null;
    },
    limit,
  });

  const stageDirty = (id = state.stageId) => !same(state.layouts[id], baseline[id]);

  return {
    ...history,

    /** Anything at all to save, across every stage. */
    dirty: () => !same(state.layouts, baseline),
    stageDirty,

    /** A save landed: the draft on disk is the thing to revert to from now on. */
    markSaved: () => { baseline = clone(state.layouts); },

    /**
     * This stage's draft back to the last saved copy. Goes through touch(), so
     * a revert is itself undoable — which is why it needs no confirmation.
     */
    revertStage: () => {
      if (!stageDirty()) return false;
      state.layouts[state.stageId] = clone(baseline[state.stageId]);
      state.sel = null;
      history.touch();
      return true;
    },
  };
}
