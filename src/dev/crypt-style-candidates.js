// CRYPT SHIFT — backdrop style bake-off (Peter, 25 Sep 2026: "i want to do a bakeoff in
// different styles … So the crypt instead of the plumber … World only … only the
// background will change our game lane remains as is"). Thirteen hands over ONE
// composition (src/dev/crypt-styles/plan.js), each in its own file, against the shipped
// vhs backdrop. The Hybrid Vector card follows Peter's own brief (voxel/blueprint
// structure, mid-century shapes, constructivist rays, pop-art halftone, shadow-puppet
// silhouettes, four-ink misregistered riso print); "Are we doing Mid century modern and
// pop art et al" added each of those ingredients as a card of its own.
//
// Gallery-only: nothing here is wired into the run.
import { STYLE as PIXEL } from './crypt-styles/pixel.js';
import { STYLE as INK } from './crypt-styles/ink.js';
import { STYLE as GOUACHE } from './crypt-styles/gouache.js';
import { STYLE as RISO } from './crypt-styles/riso.js';
import { STYLE as PLASTICINE } from './crypt-styles/plasticine.js';
import { STYLE as CRAYON } from './crypt-styles/crayon.js';
import { STYLE as HYBRID } from './crypt-styles/hybrid.js';
import { STYLE as MIDCENTURY } from './crypt-styles/midcentury.js';
import { STYLE as POPART } from './crypt-styles/popart.js';
import { STYLE as CONSTRUCTIVIST } from './crypt-styles/constructivist.js';
import { STYLE as VOXEL } from './crypt-styles/voxel.js';
import { STYLE as BLUEPRINT } from './crypt-styles/blueprint.js';
import { STYLE as PUPPET } from './crypt-styles/puppet.js';

export { drawCryptStyleScene, CRYPT_SCREENS, CRYPT_STYLE_LOOP } from './crypt-styles/scene.js';

export const CRYPT_STYLE_SHIPPED = {
  id: 'shipped', name: 'SHIPPED — VHS', paint: null,
  note: 'What ships: a violet gradient, two hill silhouettes with a dead tree and a headstone, a fog strip, '
    + 'and the tape\'s scanlines over the whole frame. It does not follow the shared composition; it is the control.',
};

// A LEVEL — Peter's favourites, 25 Sep 2026, in his order: "Gouache, crayon, voxel, shadow
// puppet, mid century modern"; then "move voxel to LEVEL B". The ones to carry into
// bake-offs on other cabinets; see docs/BACKDROP_STYLES.md.
export const CRYPT_STYLE_A_LEVEL = [GOUACHE, CRAYON, PUPPET, MIDCENTURY];

// B LEVEL — kept for reference. The Hybrid Vector brief's other ingredients stay here with
// the blend itself, so the brief can still be read part by part.
export const CRYPT_STYLE_B_LEVEL = [PIXEL, INK, PLASTICINE, VOXEL, BLUEPRINT, CONSTRUCTIVIST, POPART, RISO, HYBRID];
