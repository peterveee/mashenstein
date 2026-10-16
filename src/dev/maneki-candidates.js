// Gallery-only: THE MANEKI-NEKO, a bake-off (16 Oct 2026). Peter, of the lucky cat going in
// as Terminal Velocity 1's first cat: "do a bake off with a few different versions … like a
// completely different cat... white predominantly though", "maybe gold", "would love if
// smiling when idle and then vicious when it attacks", "possibly a bit more 2d to fit in
// better" — and, of the beckon, "i am not 100% happy with his hand rocking … in the idle part".
//
// Every design and every beckon is the one painter in sprites/neonCats.js (maneki, with
// MANEKI_DESIGNS and BECKON_STYLES), so a pick ships by naming it. The game deals
// `catManeki`, which draws MANEKI_DEFAULT with BECKON_DEFAULT.
import { maneki, MANEKI_DESIGNS, BECKON_STYLES } from '../sprites/neonCats.js';

export const MANEKI_CANDIDATES = Object.entries(MANEKI_DESIGNS).map(([id, d], k) => ({
  letter: String.fromCharCode(65 + k), id: `maneki-${id}`, name: d.name,
  paint: (c, w, h, t, u) => maneki(c, w, h, t, u, { design: id }),
}));

export const BECKON_CANDIDATES = BECKON_STYLES.map((style, k) => ({
  letter: String(k + 1), id: `beckon-${style}`, name: style.toUpperCase(),
  paint: (c, w, h, t, u) => maneki(c, w, h, t, u, { beckon: style }),
}));
