// 4-BIT, SEEN — candidates (Peter, 8 Oct 2026: "give me a bake off to see 8 bit vs 4 bit crt").
// PICKED the same day: D, CHUNKIER — club-crt.js FOUR_BIT_TUBE, what 4-BIT puts the room on now.
//
// B-33P on a take already on the 8-Bit set now crushes the mix and calls it 4-BIT
// (club-voices.js CRUSH), and the room has no tube for it. These are looks it could go on: the
// club's own CRT (club-crt.js clubCrt) with fewer, bigger cells and fewer inks than 8-BIT's, so
// it reads as lower-fi than the 8-bit the room already claims. `rows` is how many cells tall a
// hero is (8-BIT's is HERO_ROWS, 22); `inks` the flat colours every cell snaps to (8-BIT has
// CLUB_INKS, 47); `mono` snaps by brightness alone, and `dim` and `sat` grade the room before it
// is snapped. The LED board and the sign keep tubes of their own, as in 8-BIT.
//
// The gallery draws each through the club's `crtLook` seam (club.js tubeLook).
import { CLUB_INKS, CLUB_INKS_16, HERO_ROWS, FOUR_BIT_TUBE } from '../game/banger/club-crt.js';

const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const inks = (list) => Object.freeze(list.map(hexRgb));

/** THE PC'S SIXTEEN: the old 4-bit RGBI palette — two levels a gun, and a bright bit. */
export const RGBI_16 = inks([
  '#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
  '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff',
]);

/** GREEN SCREEN: one phosphor, four levels of it. */
export const GREEN_4 = inks(['#0b1a0e', '#2c5a2a', '#6aa846', '#c6f28c']);

/** 8-BIT as it ships, for the lineup, then the candidates. */
export const CRT_8BIT = Object.freeze({ letter: '0', name: '8-BIT (TODAY)', rows: HERO_ROWS, inks: CLUB_INKS,
  description: `What B-33P's 8-BIT puts the room on now: a hero ${HERO_ROWS} cells tall, ${CLUB_INKS.length} of the club's own inks.` });

export const CRT_4BIT_CANDIDATES = Object.freeze([
  { letter: 'A', name: 'CHUNKY', rows: 14, inks: CLUB_INKS,
    description: 'Only the cells bigger: a hero 14 cells tall, on 8-BIT’s own inks.' },
  { letter: 'B', name: 'SIXTEEN OF OURS', rows: 14, inks: CLUB_INKS_16,
    description: 'A hero 14 cells tall, on sixteen of the club’s own inks — 4 bits of colour.' },
  // graded first: snapped as it is, the room and every hero's clothes went to the palette's two greys
  { letter: 'C', name: 'THE PC’S SIXTEEN', rows: 14, inks: RGBI_16, dim: 0.8, sat: 2,
    description: 'A hero 14 cells tall, on the old 4-bit RGBI palette (two levels a gun and a bright bit), the room pushed darker and louder onto it.' },
  { letter: 'D', name: 'CHUNKIER (SHIPS)', ...FOUR_BIT_TUBE,
    description: 'B’s sixteen inks, the cells bigger again: a hero 10 cells tall. Picked 8 Oct 2026 — 4-BIT’s tube (club-crt.js FOUR_BIT_TUBE).' },
  { letter: 'E', name: 'GREEN SCREEN', rows: 14, inks: GREEN_4, mono: true,
    description: 'A hero 14 cells tall, the whole room in four levels of one green phosphor.' },
].map(Object.freeze));
