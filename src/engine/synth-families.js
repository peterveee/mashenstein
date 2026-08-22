// The engine names, and every retired name resolved onto the one it became.
//
// A module of its own, with no imports, because three files need this map and only one of
// them can afford to load the engine: the rack builds Tone classes from it, the preset
// library filters by it, and the desk prints names from it. It used to be written out
// three times, and the copies had already drifted — `engineFamily` in
// src/data/voices-in-play.js knew about CRLS-1 and not about KNDO-5 or RMND-2, so a song
// whose lane still said `FMSynth` was offered no presets to switch to: every preset in
// the catalogue had been renamed out from under a comparison made on the raw string.
//
// Renames land HERE and nowhere else. Anything comparing a preset's `synth` against a
// family goes through `synthFamily`, so a stored preset written under an old name is the
// same instrument rather than an unknown one.

/** MRDR-3 — Moroder. Three oscillator layers into a shared filter. */
export const MRDR3 = 'MRDR-3';
/** CRLS-1 — Wendy Carlos. One oscillator into an envelope, filter optional. */
export const CRLS1 = 'CRLS-1';
/** TNGR-2 — Tangerine Dream. Two wavetable oscillators. */
export const TNGR2 = 'TNGR-2';
/** KNDO-5 — Koji Kondo. Four waveforms plus the noise channel. */
export const KNDO5 = 'KNDO-5';
/** RMND-2 — Raymond Scott. A carrier and a modulator, reaching pitch or level. */
export const RMND2 = 'RMND-2';
/** WNDR-9 — Klaus Wunderlich. Nine drawbars, and `stretch` to take them off the series. */
export const WNDR9 = 'WNDR-9';

/**
 * The retired names. Old spellings stay readable forever — song files carry them inside
 * serialised `voiceParams` and user presets carry them in local storage — because a name
 * is not worth a migration, and this alias is what makes that true.
 */
export const RENAMED = Object.freeze({
  Synth: CRLS1,
  MonoSynth: CRLS1,
  GameSynth: KNDO5,
  FMSynth: RMND2,
  AMSynth: RMND2,
  AdditiveSynth: WNDR9,
  // The one rename that is also a rebuild. DuoSynth's two Tone MonoSynths are two MRDR-3
  // layers and its parameters do not carry across on the name alone, so this alias is
  // only half the answer — `duoCopyAsLayer` in src/data/voices.js is the other half, and
  // a song's own frozen copy needs both.
  DuoSynth: MRDR3,
});

/** The family a preset belongs to, with every retired name resolved onto it. */
export const synthFamily = (synth) => RENAMED[synth] || synth;
