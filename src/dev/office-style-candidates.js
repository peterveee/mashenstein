// CORPORATE KOMBAT — backdrop style bake-off (Peter, 10 Oct 2026: "not totally happy with the
// corporate kombat cabinet... it's extremely basic and the graph paper background is very
// boring... do a bake off with some significantly more elaborate backgrounds with paralax and
// using a painting style that we like such as gooache or crayon or mcm... is there any other
// drawing theme that we could potneitally use.. paper is nice, but it's the 2nd last level - it
// needs to be fancier... the whole working your way through an office buliding hall perhaps").
//
// Seven hands over ONE composition — THE CLIMB, three floors of one tower (lobby at nine,
// floor 23 at noon, floor 88 at dusk) in src/dev/office-styles/plan.js — each in its own file,
// against the shipped doodle backdrop. Gouache, crayon and mid-century modern are Peter's
// A-level styles from the crypt bake-off; art deco, ligne claire, the Busytown cutaway and
// vaporwave are new.
//
// Gallery-only: nothing here is wired into the run.
import { STYLE as GOUACHE } from './office-styles/gouache.js';
import { STYLE as MCM } from './office-styles/mcm.js';
import { STYLE as CRAYON } from './office-styles/crayon.js';
import { STYLE as DECO } from './office-styles/deco.js';
import { STYLE as LIGNE } from './office-styles/ligne.js';
import { STYLE as CUTAWAY } from './office-styles/cutaway.js';
import { STYLE as VAPOR } from './office-styles/vapor.js';
import { STYLE as GOUACHE88 } from './office-styles/gouache88.js';
import { STYLE as DECO86 } from './office-styles/deco86.js';
import { STYLE as LIGNE89 } from './office-styles/ligne89.js';
import { STYLE as LIGNE89LIT } from './office-styles/ligne89lit.js';
import { STYLE as DECO88 } from './office-styles/deco88.js';
import { STYLE as BLOCKOUT } from './office-styles/blockout.js';

export { drawOfficeStyleScene, OFFICE_SCREENS, OFFICE_STYLE_LOOP } from './office-styles/scene.js';

export const OFFICE_STYLE_SHIPPED = {
  id: 'shipped', name: 'PREVIOUS SHIPPED — doodle', style: null,
  note: 'The previous shipped look: graph paper held still behind the run, a margin, two punch holes, a coffee ring, five biro '
    + 'office blocks, a wobbly ballpoint ground line and a biro underline under each hazard. It does not follow '
    + 'the shared composition; it is the control.',
};

export const OFFICE_STYLE_CANDIDATES = [GOUACHE, MCM, CRAYON, DECO, LIGNE, CUTAWAY, VAPOR];

// ROUND TWO, 11 Oct 2026. Peter: vaporwave "unexpectedly is really fitting as it fits in with
// the time period we have set the game in late 80's / 90's … would we take one of the more
// beautiful ones and infuse it with a slightly tacky 80s / 90's vibe?" Three of the beautiful
// hands kept exactly, with the set and palette re-dressed as a 1986–89 corporate tower.
export const OFFICE_STYLE_INFUSIONS = [GOUACHE88, DECO86, LIGNE89];

// ROUND THREE, 11 Oct 2026. Peter put LIGNE ’89 first (a style used nowhere else, and the period
// itself) and found DECO ’86 "not as good as the original". So: LIGNE ’89 with a light pass for
// "fancier", against DECO ’88 — the original deco's black and gold with only the props moved to
// the 80s. Each is shown beside the card it came from.
export const OFFICE_STYLE_ROUND_THREE = [
  { tag: '10', cand: LIGNE89 }, { tag: '11', cand: LIGNE89LIT },
  { tag: '4', cand: DECO }, { tag: '12', cand: DECO88 },
];

// The plan in grey blocks, for checking layout and motion — not a candidate.
export const OFFICE_STYLE_BLOCKOUT = BLOCKOUT;
