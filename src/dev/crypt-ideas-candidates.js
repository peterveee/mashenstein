// CRYPT SHIFT — more life in the graveyard, bake-off (Peter, 26 Sep 2026: "can we add more
// objects (maybe animals) for the crypt levels? animated ideally, but still is o... do we
// hav layers that move at different rates … lets do a bakeoff"). One file per depth layer
// under src/dev/crypt-ideas/, each idea painted inside the shipped gouache backdrop through
// its study seam; see crypt-ideas/scene.js for the idea shape and the cards.
//
// Gallery-only: nothing here is wired into the run.
// The painters live with the backdrop (stylePacks/cryptLife/) since Peter's picks shipped;
// every idea stays here in the bake-off, chosen or not.
import { IDEAS as FG } from '../engine/stylePacks/cryptLife/fg.js';
import { IDEAS as MID } from '../engine/stylePacks/cryptLife/mid.js';
import { IDEAS as FAR } from '../engine/stylePacks/cryptLife/far.js';

export { drawCryptIdeaScene, drawCryptIdeaCloseUp } from './crypt-ideas/scene.js';

// Nearest layer first, as the eye reads the frame from the lane back.
export const CRYPT_IDEA_GROUPS = [
  { tag: 'N', title: 'the near bank', ideas: FG },
  { tag: 'H', title: 'the graveyard hill', ideas: MID },
  { tag: 'F', title: 'the far ridge and sky', ideas: FAR },
];
