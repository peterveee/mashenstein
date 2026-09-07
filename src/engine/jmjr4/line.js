/*
 * JMJR-4 — which syllable of a line a step sings.
 *
 * ONE PER STEP, not one per note: a chord's tones, a strum's events and an arpeggio's
 * steps all arrive as separate plays of the same step, and they all sing the same
 * syllable. The line advances when the step advances, starts again when the step goes
 * backwards (a loop wrap, a seek; a transport restart clears the state outright), and
 * advances per key when there is no step at all, which is the desk's own keyboard. A
 * one-word line is that word every time.
 *
 * A trailing dash on a syllable ties its vowel over the next key: the next step's onset
 * consonant is dropped, so `laa- laa` is one long note that moves.
 *
 * A pure function over a small state object, so the rule can be tested without a rack.
 */

/** A fresh position: nothing sung yet. */
export const newLineState = () => ({ index: 0, lastStep: null, started: false, prevTie: false });

/**
 * Advance `state` for `step` (a number, or null for the desk keyboard) and return the
 * syllable to sing and whether its onset is silent because the one before tied over.
 */
export function advanceLine(state, line, step) {
  if (!line.length) return { syl: null, onsetSilent: false };
  if (!state.started) {
    state.started = true;
    state.index = 0;
    state.lastStep = step;
    state.prevTie = !!line[0].tie;
    return { syl: line[0], onsetSilent: false };
  }
  let advanced;
  if (step == null || state.lastStep == null) advanced = true;               // the keyboard: every key advances
  else if (step === state.lastStep) advanced = false;                        // the same step: the same syllable
  else advanced = true;
  if (advanced) {
    if (line.length > 1) {
      const back = step != null && state.lastStep != null && step < state.lastStep;
      state.index = back ? 0 : (state.index + 1) % line.length;
    }
  }
  state.lastStep = step;
  const syl = line[state.index];
  const onsetSilent = advanced && state.prevTie;
  if (advanced) state.prevTie = !!syl.tie;
  return { syl, onsetSilent };
}
