// Gallery-only: PYTHAGORAS'S SNARL, a bake-off (16 Oct 2026). Peter: "could we do a bake off
// with more prominent teeth baring on pythagoras? it is a little subtle right now".
// Every take is the shipped painter (sprites/neonCats.js pythagoras) with `snarl` set —
// SNARL_STYLES there — so a pick ships by changing SNARL_DEFAULT. The new takes also lift
// his head on the strike (headLift) so the teeth show over his own swiping arm.
import { pythagoras, SNARL_STYLES } from '../sprites/neonCats.js';

export const SNARL_CANDIDATES = SNARL_STYLES.map((style, k) => ({
  letter: String.fromCharCode(65 + k), id: `snarl-${style}`, name: style === 'now' ? 'NOW (as shipped)' : style.toUpperCase(),
  paint: (c, w, h, t, u) => pythagoras(c, w, h, t, u, { snarl: style }),
}));
