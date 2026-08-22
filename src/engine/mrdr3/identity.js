/*
 * Which voices are MRDR-3 — and the one question that is deliberately NOT this.
 *
 * docs/MRDR-3-worklet-spec.md §9.1. During the project two dispatch identities exist:
 * `MRDR-3` renders through `_playLayer`, `MRDR-3 AW` renders through the lane worklet.
 * They are the same instrument — the same subtractive model, the same patch payload, the
 * same panel — so almost everything that asks "is this an MRDR-3?" is really asking about
 * the FAMILY, and gets `isMrdrVoice`.
 *
 * ---- what must stay an EXACT identity check, and why -----------------------------
 *
 * Two kinds of caller must keep asking for `MRDR-3` by name, and getting this wrong is
 * how the project quietly breaks rather than loudly fails:
 *
 *   1. RENDERER DISPATCH. `play()` chooses a synthesis path, and that is the one place
 *      the difference between the two identities is the entire point. §9 forbids an
 *      `auto` router whose answer could change under a library update: which one plays is
 *      written in the lane.
 *
 *   2. THE NATIVE-ONLY MACHINERY. The note cache, the prepared-note planner, tail
 *      culling and the Performance-quality caps exist to manage the cost of building a
 *      node graph per note. An AW lane HAS no node graph per note, so it must never
 *      reach any of them — §10 requires that bypass to hold "by construction", and a
 *      health report showing zero cache lookups for AW lanes is the proof. Widening
 *      those guards to the family would put AW lanes back into the very machinery this
 *      project exists to delete, and it would look like it was working.
 *
 * Everything else — the editors, the patch share format, the lane chorus stage, the
 * pot tables — is family behaviour and takes the predicate. The test that holds this
 * line is tests/mrdr3-identity.js.
 *
 * ---- and the scaffold rule --------------------------------------------------------
 *
 * `MRDR3_AW` is dev-only and temporary (§1.1). It never enters `VOICES`, never appears in
 * a player-facing picker, and never lands in a tracked song. When the last batch of
 * presets is approved it is deleted along with `_playLayer` and this file collapses back
 * to a constant. Nothing here should grow a feature that assumes otherwise.
 */

/** The shipping identity: rendered by `_playLayer`. */
export const MRDR3_NATIVE = 'MRDR-3';

/**
 * The dev-only comparison identity: rendered by the lane worklet.
 *
 * Temporary by design — see the scaffold rule above.
 */
export const MRDR3_AW = 'MRDR-3 AW';

/** Both identities, in the order a picker would show them. */
export const MRDR3_SYNTHS = Object.freeze([MRDR3_NATIVE, MRDR3_AW]);

/** Is this synth name an MRDR-3 of either backend? */
export const isMrdrSynth = (synth) => synth === MRDR3_NATIVE || synth === MRDR3_AW;

/** Is this VOICE an MRDR-3 of either backend? Null-safe, as every call site needs. */
export const isMrdrVoice = (voice) => isMrdrSynth(voice?.synth);

/** Does this voice render through the worklet rather than through `_playLayer`? */
export const isMrdrAw = (voice) => voice?.synth === MRDR3_AW;

/*
 * ---- the comparison override (§9.2) ------------------------------------------------
 *
 * DIAGNOSTIC AND SESSION-ONLY. It forces the same canonical patch through one renderer so
 * the two can be heard against each other, and it is never serialized: a song records the
 * identity its lane was saved with, and nothing here may change what that means.
 *
 * Named a comparison override rather than a router on purpose. §9 forbids an `auto` mode
 * whose answer could change under a library update — which one plays is written in the
 * lane — so this substitutes the VOICE in front of dispatch rather than adding a third
 * branch to it. Dispatch keeps naming one identity exactly, and this stays visibly a
 * bench control rather than becoming a quiet third engine mode.
 */
let comparison = null;

/** `null` honours the lane; 'native' or 'worklet' forces one backend. Not persisted. */
export function setMrdrComparisonBackend(mode) {
  comparison = mode === 'native' || mode === 'worklet' ? mode : null;
  return comparison;
}

/** What the override is currently forcing, or null. */
export const mrdrComparisonBackend = () => comparison;

/**
 * The voice as the override wants it played.
 *
 * Returns the voice UNCHANGED when nothing is forced, which is the shipping path and must
 * cost nothing. When something is forced it returns a shallow copy carrying the other
 * identity — by value, never by id, because an id would resolve back through `VOICES` to
 * the original and quietly play the renderer it was meant to be switched away from.
 */
export function mrdrComparisonVoice(voice) {
  if (!comparison || !isMrdrVoice(voice)) return voice;
  const want = comparison === 'worklet' ? MRDR3_AW : MRDR3_NATIVE;
  return voice.synth === want ? voice : { ...voice, synth: want };
}
