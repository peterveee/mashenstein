// Public names used by mixer UI. Persisted engine/kind values remain separate so
// compatibility and routing never depend on presentation spelling.
//
// The rename half is NOT a second copy of the map: it comes from the engine's own
// `RENAMED`, so a family that gains a name is spelled correctly here on the same day.
// What this file adds is the one name that is not an engine family at all — `drum` is a
// `kind`, and KLNG-8 is what the desk calls it.
import { RENAMED } from '../../src/engine/synth-families.js';

const DISPLAY_NAMES = Object.freeze({ ...RENAMED, drum: 'KLNG-8' });

export const synthDisplayName = (name) => DISPLAY_NAMES[name] || name;

// What each engine DOES, for the one place a name alone is not enough: a dropdown of
// engines being chosen between. The codes are the identity and are learned by using
// them; a player meeting the list for the first time needs to know which one is the
// wavetable and which one is the chiptune.
const SYNTH_STYLE = Object.freeze({
  'MRDR-3': 'Layered analogue',
  'CRLS-1': 'Subtractive',
  'TNGR-2': 'Wavetable',
  'WNDR-9': 'Additive',
  'KNDO-5': 'Chiptune',
  'KLNG-8': 'Drums',
  'RMND-2': 'FM & AM',
});

// Exported as well as joined below: the engine pickers draw the name and the style in
// two ALIGNED columns rather than one run of text, so they need the halves separately.
export const synthStyleName = (name) => SYNTH_STYLE[synthDisplayName(name)] || '';

/** The display name with a trailing `Synth` dropped — `AdditiveSynth` is `Additive`. */
export const synthShortName = (name) => {
  const shown = synthDisplayName(name);
  const short = shown.replace(/Synth$/, '') || shown;
  return short.charAt(0).toUpperCase() + short.slice(1);
};

/** `RMND-2 · FM & AM` — the name, and what it is, where an engine is being chosen. */
export const synthChoiceLabel = (name) => {
  const shown = synthShortName(name);
  const style = synthStyleName(name);
  return !style || style.toLowerCase() === shown.toLowerCase() ? shown : `${shown} · ${style}`;
};
