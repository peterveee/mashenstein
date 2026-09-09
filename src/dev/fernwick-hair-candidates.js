// Fernwick's hair — highlight bake-off. OPEN.
//
// She ships as ONE FLAT GOLD (#e8bc46, HERO_SPRITES.fernwick.pal.hair), and at
// lane size a single-tone mass is the least interesting thing on the most
// visible head in the cast. The question this answers is narrow: what does
// gold-on-blonde look like when the hair is broken into strands or sections,
// and which reading survives 24u.
//
// Nothing here is cast. Each option is the SHIPPED Fernwick spec plus one key
// — `spec.hairStreaks`, the seam added in sprites/toons.js for this — handed
// to drawToon through `opts.spec`, so every option is the same head, the same
// bangs, the same tufts and the same headband, differing only in what is
// painted inside the hair. That is the whole point: a bake-off can only answer
// "which highlights" if the answer is not also contaminated by "which cut".
//
// The tones are mixed off the palette's own hair colour at draw time (see
// hairTones in toons.js), so the two options below that also move the BASE
// colour keep their highlights without a second table of hexes. The pale end
// runs toward bleached gold and the dark end toward warm honey — never white,
// never grey, which is what keeps blonde hair from reading as a metal helmet.
//
// When one wins: put `hairStreaks: '<style>'` into TOON_SPECS.fernwick (plus
// any palette key it needs), delete this file, and take the section out of the
// preview page. The painter stays; the bake-off does not.

import { TOON_SPECS } from '../sprites/toons.js';
import { HERO_SPRITES } from '../sprites/heroes.js';

const BASE = TOON_SPECS.fernwick;
const PAL = HERO_SPRITES.fernwick.pal;

const option = (id, name, style, note, pal = null) => ({
  id, name, note,
  spec: { ...BASE, hairStreaks: style },
  pal: pal ? { ...PAL, ...pal } : null,
});

export const FERNWICK_HAIR_CANDIDATES = [
  option('shipped', '0 · Shipped', null,
    'One flat gold. The control — every judgement below is against this.'),
  option('pair', 'A · Two strands', 'pair',
    'One bleached strand per side, where the sweep is widest. The least that still reads.'),
  option('fine', 'B · Six fine strands', 'fine',
    'Highlight and lowlight alternating at hair width: one richer gold from across the lane, strands up close.'),
  option('money', 'C · Money piece', 'money',
    'A broad pale panel down the front of each side, framing the face. Chunky and modern.'),
  option('ombre', 'D · Ombré tips', 'ombre',
    'Base gold at the crown running to bleached at the ends of the bangs and tufts.'),
  option('roots', 'E · Deep roots', 'roots',
    'The reverse: honey at the parting, gold below it. Warm rather than bright.'),
  option('sections', 'F · Three flat sections', 'sections',
    'No blend anywhere — pale along the silhouette, base through the middle, honey where the hair meets the face.'),
  option('ribbon', 'G · Soft ribbon', 'ribbon',
    'A wide low-contrast sheen with a brighter core: light ON the hair rather than strands in it.'),
  option('woven', 'H · Woven chunks', 'woven',
    'Every strand broken into hard-ended sections stepping down the fall, alternating tone.'),
  option('split', 'I · Hard split', 'split',
    'One line across the hair, a different gold either side of it, a honey seam on the join.'),
  option('lowlight', 'J · Lowlights only', 'lowlight',
    'Three honey strands and nothing pale: depth without raising the brightness that competes with her face.'),
];

// Two palette variants, offered alongside the styles rather than as options of
// their own: the same strand work on a cooler and on a warmer blonde. They
// exist because "more gold" can mean either more contrast in the strands or a
// warmer base under them, and those are different asks.
export const FERNWICK_HAIR_PALETTES = [
  { id: 'stock', name: 'Shipped gold', pal: null },
  { id: 'cool', name: 'Cooler blonde', pal: { hair: '#e5c66a' } },
  { id: 'warm', name: 'Warmer honey', pal: { hair: '#dfa93a' } },
];
