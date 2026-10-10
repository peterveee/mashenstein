// MAKE A BANGER — the drum kits a take may ROLL to, per style. 10 Oct 2026.
//
// Peter: "I want some to come up on a kit roll. Pick appropriately. User can pick any from
// mixer." So a roll draws from the machine kits every style has always rolled (less DS, retired), plus the
// creative kits (src/data/creative-drum-kits.js) that suit the style — never all of them: a
// straight draw from seventeen would put Brushes under Big Room. Choosing a kit by hand is the
// Kit switch, which offers every kit to every style.
//
// Read by the Lab's voltage roll (src/game/banger/make.js, recipe expression 11 on — a recipe
// kept before that rolls from the five alone, as it did) and by the desk's Surprise Me
// (options.js). A fusion rolls from its GROOVE style's list: the beat is the groove's.
// Browser-safe: no `node:*` imports.
import { inLab } from '../../../src/data/creative-drum-kits.js';

/** The machine kits every style rolls: the Lab's old five less DS and Studio, retired 10 Oct 2026 (sound-rules.js). */
export const BASE_KIT_ROLLS = Object.freeze(['909', '808', 'cr78']);

/** The creative kits that suit each style, added to its roll. A style not named rolls the five. */
export const STYLE_KIT_ROLLS = Object.freeze({
  'big-room': ['glasshouse', 'neon-origami'],
  trance: ['neon-origami', 'moon-dust'],
  'future-bass': ['neuro'],
  eurobeat: ['syndrum-disco', '80s-pop'],
  chipstep: ['nes', 'pocket-pixel'],
  synthwave: ['80s-pop', 'simmons'],
  shibuya: ['brushes', 'breakbeat'],
  dnb: ['breakbeat', 'neuro'],
  electro: ['80s-pop', 'simmons'],
  megadrive: ['nes', 'pocket-pixel'],
  'deep-house': ['velvet-basement', 'glasshouse', 'rubber-factory'],
  'nu-disco': ['syndrum-disco', 'velvet-basement'],
  downtempo: ['breakbeat', 'brushes'],
  eurodance: ['glasshouse', '80s-pop'],
  'italo-disco': ['syndrum-disco', '80s-pop'],
  'electro-funk': ['80s-pop', 'syndrum-disco'],
  'french-house': ['velvet-basement', 'glasshouse'],
  moombahton: ['havana-patio', 'rio-lanterns'],
  merenhouse: ['havana-patio', 'rio-lanterns'],
  'afro-house': ['rio-lanterns', 'havana-patio'],
  'acid-house': ['glasshouse', 'rubber-factory'],
  techno: ['rubber-factory', 'moon-dust'],
  rave: ['breakbeat', 'neon-origami'],
  'uk-garage': ['glasshouse', 'rubber-factory'],
  freestyle: ['80s-pop', 'syndrum-disco'],
});

/**
 * Every kit a take of `styleId` may roll to: the five, then the style's own creative kits. `lab`:
 * only those the game's Lab offers (creative-drum-kits.js `inLab`) — the desk rolls them all.
 */
export const kitRollsFor = (styleId, { lab = false } = {}) => [...BASE_KIT_ROLLS, ...(STYLE_KIT_ROLLS[styleId] || [])]
  .filter((k) => !lab || inLab(k));
