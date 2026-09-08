// Grumpos's back axe — gallery only. He is a shipped hero, so each cut is his
// own production spec with one key changed (`axeArt`), fed through drawToon's
// opts.spec seam. Nothing here can reach the game; pick one and its object
// becomes `axeArt` on TOON_SPECS.grumpos and this file comes out.
//
// The three things being judged, and why each is on the table:
//   ANGLE  the shipped haft runs at 41.3 degrees, which is shallow enough to
//          land the blade beside his jaw at ear height, where it competes with
//          his face. Steeper puts it behind the shoulder.
//   SIZE   the blade is 0.30 x 0.33u against a 0.44u head — about three
//          quarters the size of his skull — and stands a head's radius clear
//          of his shoulder.
//   VALUE  pale ice blue with a near-white sheen makes it lighter than his
//          skin, so the eye reaches the axe before the face.
import { TOON_SPECS } from '../sprites/toons.js';

const G = TOON_SPECS.grumpos;
const cut = (id, name, note, axeArt) => ({
  id: `grumpos-axe-${id}`, name, note,
  spec: axeArt ? { ...G, axeArt } : G,
});
// Steel that is DARKER than his skin (#ded9d2) rather than lighter, so the
// axe stops being the brightest thing on the sprite.
const STEEL = { steel: '#8fa9bd', sheen: '#cfe2ef' };
// The anchor on the shoulder is right and the head's bearing is settled. What
// is open is the HAFT: it should stand more upright. Each cut steepens the
// shaft and COMPENSATES the head by the same amount, so the blade keeps the
// attitude already approved and the only thing changing down the row is the
// angle of the shaft against his back. Without that compensation a steeper
// haft drags the head over with it and the row would be judging two things.
const STEEP = (deg) => ({ angle: deg, headAngle: 25 + (deg - 60), blade: 0.82, ...STEEL });
export const GRUMPOS_AXES = [
  cut('shipped', 'X1 — SHIPPED', 'What he carries now: 41.3 degrees, full blade, ice blue. The reference.', null),
  cut('c60', 'C1 — HAFT 60°', 'The settled axe as it stands. The before for this row.', STEEP(60)),
  cut('c68', 'C2 — HAFT 68°', 'Eight degrees more upright.', STEEP(68)),
  cut('c76', 'C3 — HAFT 76°', 'Standing well up his back now.', STEEP(76)),
  cut('c84', 'C4 — HAFT 84°', 'Nearly plumb: the shaft runs straight up beside his head.', STEEP(84)),
  cut('c90', 'C5 — HAFT 90°', 'Vertical, so the row has a ceiling rather than an open end.', STEEP(90)),
];
