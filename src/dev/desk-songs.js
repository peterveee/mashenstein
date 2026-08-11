// Desk songs you can hear IN THE GAME, on the jukebox, from the dev menu.
//
// THIS FILE IS THE EXCEPTION, and it is deliberately the only one. `src/data/imported/`
// holds a hundred-odd scratch songs and MIDI auditions, and its generated index says
// plainly that the game does not import it: a scratch song is desk material and has no
// business in the bundle a player downloads. That rule is worth keeping, so this list is
// hand-written rather than generated — nothing lands in the game by being saved.
//
// What it costs: the song's note data, in the bundle, for everybody. One song is about
// 130KB of source against a 1.9MB build. Adding a dozen would not be free, and the
// moment this list stops being short it is the wrong mechanism — the right one then is
// a dev-build-only import (see build/build.js, which already stamps a dev-only global
// and rewrites source for the tunables strip).
//
// To take a song back out: delete its import and its row. Nothing else refers to them.
//
// A row is a jukebox track, and carries what the desk knows that the game's registries
// do not: an imported song's mix and arrangement live in its own module rather than in
// `MIX`/`ARRANGEMENTS`, so they are passed explicitly or the game would play the notes
// with none of the balance.
import * as SMW_ALL_INSTRUMENTS from '../data/imported/smw-all-instruments.js';

export const DESK_SONGS = [
  {
    name: 'SMW ALL INSTRUMENTS (DESK)',
    bank: SMW_ALL_INSTRUMENTS.bank,
    mix: SMW_ALL_INSTRUMENTS.mix,
    arrangement: SMW_ALL_INSTRUMENTS.arrangement,
  },
];
