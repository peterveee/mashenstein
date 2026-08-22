/*
 * The MRDR-3 AW comparison view — dev-only, temporary, and never in the bundle a player
 * downloads. docs/MRDR-3-worklet-spec.md §1.1 and §9.1.
 *
 * ---- what this is ---------------------------------------------------------------
 *
 * During the worklet project, a preset that has been ear-approved on the AW backend can
 * be played BOTH ways so the two can be compared on the desk at the same time, on
 * different lanes, in one song. That is more than a global override can do, and it is the
 * only reason a second identity exists at all.
 *
 * It is a VIEW, not a library. Nothing here is a preset: each row is the canonical MRDR
 * payload with one key changed, derived on demand from `VOICES`. So there are no `-aw`
 * copies to drift, no second calibration to keep in step, and no possibility of the two
 * sides disagreeing about anything except which renderer plays them — which is the whole
 * question being asked.
 *
 * ---- why it lives in src/dev/ ----------------------------------------------------
 *
 * Same seam, same reason, as `hero-candidates.js`: a thing that exists to be evaluated is
 * not a thing that ships. `src/data/voices.js` stays the catalogue and knows nothing
 * about this; the game imports neither. `tests/mrdr3-identity.js` asserts the separation
 * rather than trusting it — no factory preset and no registered song may carry the AW
 * identity, which is a rule about a string and would otherwise be enforced by nobody.
 *
 * ---- and why it is currently empty ------------------------------------------------
 *
 * Approval is per preset and nothing has crossed yet: Phase 1 has a proof gate and no
 * synthesis. An empty view is the correct state and the tests say so — the same shape as
 * TNGR-2's "oracle skeleton green over nothing". The first row appears when the first
 * batch of §3.5 is approved, and the last one disappears when `_playLayer` is deleted and
 * this file goes with it.
 */
import { VOICES } from '../data/voices.js';
import { MRDR3_AW, MRDR3_NATIVE } from '../engine/mrdr3/identity.js';

/**
 * Has this preset been ear-approved on the worklet backend?
 *
 * The marker is staged on the canonical preset (§9) rather than kept in a side table, so
 * a preset that has crossed says so where its author can see it. At cutover the block's
 * level and peak are promoted to the top-level values and the block is deleted — it is a
 * staging area with an end, not a permanent second calibration.
 */
export const awApproved = (voice) => voice?.synth === MRDR3_NATIVE && !!voice?.mrdrAw?.approved;

/**
 * One canonical preset, as the AW backend would render it.
 *
 * By VALUE. An id-only handle would resolve back through `VOICES` to the native object
 * and quietly play the wrong renderer — which would look exactly like the two backends
 * sounding identical, the one wrong answer this whole apparatus exists to avoid.
 */
export function awViewOf(voice) {
  if (!voice) return null;
  return {
    ...voice,
    synth: MRDR3_AW,
    // The AW rendering carries its own measured level while both paths are live, falling
    // back to the native calibration until it has been measured. Never the other way
    // round: writing an unmeasured AW level over the native one is how an A/B level
    // difference disappears into catalogue drift.
    level: voice.mrdrAw?.level ?? voice.level,
    peak: voice.mrdrAw?.peak ?? voice.peak,
  };
}

/** Every approved preset, as AW views. Empty until the first batch crosses. */
export function awVoices() {
  return Object.values(VOICES).filter(awApproved).map(awViewOf);
}

/** The AW view of one preset id, or null if it has not been approved. */
export function awVoiceOf(id) {
  const voice = VOICES[id];
  return awApproved(voice) ? awViewOf(voice) : null;
}
