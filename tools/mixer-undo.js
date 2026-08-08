// Small, editor-agnostic undo history for mutable mixer state.
//
// The editor mutates its live preset before it calls `touch()`, so `current` is the
// snapshot immediately before the next edit. `begin()`/`end()` bracket a continuous
// gesture; a click can simply call `touch()` and is committed as one implicit step.
// Keeping this outside the voice editor makes the transaction rule testable without
// booting the mixer or importing Tone.

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createUndoHistory({ capture, restore, limit = 100 }) {
  const undo = [];
  let current = null;
  let transaction = null;

  const reset = () => {
    undo.length = 0;
    transaction = null;
    current = capture();
  };

  const sync = () => { current = capture(); };

  const begin = () => {
    if (!transaction) transaction = { before: current ?? capture(), recorded: false };
  };

  const end = () => { transaction = null; };

  /** Call after the live state has been changed. */
  const touch = () => {
    const implicit = !transaction;
    if (implicit) begin();
    const after = capture();
    if (!transaction.recorded && !equal(transaction.before, after)) {
      undo.push(transaction.before);
      if (undo.length > limit) undo.shift();
      transaction.recorded = true;
    }
    current = after;
    if (implicit) end();
  };

  const canUndo = () => undo.length > 0;

  const take = () => {
    if (transaction) end();
    const previous = undo.pop();
    if (previous === undefined) return false;
    restore(previous);
    current = capture();
    return true;
  };

  return { reset, sync, begin, end, touch, canUndo, undo: take };
}
