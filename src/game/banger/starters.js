// THE LAB'S STARTER SONG — what a first-time player finds in THE LAB. 3 Oct 2026.
//
// Peter: a preset riff and a full recipe for a first-time player, instead of an empty
// list — NEON ORBIT BANGER, as he saved it on the desk. The song plays exactly as saved
// (src/data/bangers/neon-orbit-banger.js), not regenerated: the generator has moved on
// since (the hypnotic echo bass, the bass level), and what he liked is that take.
//
// The kept record carries `preset`, which songFor() (store.js) answers with the saved song.
// It also carries an ordinary grid recipe — the riff on the standard SIMPLE grid, the style
// and mood — so the pencil can open it. Editing it never overwrites it: BRING TO LIFE keeps
// a NEW song, made by the game's own plain recipe (Peter, 3 Oct 2026).
import * as NEON_ORBIT from '../../data/bangers/neon-orbit-banger.js';

/**
 * The desk riff (two bars of eighth notes around G#) on the SIMPLE grid — eighths on the
 * eight notes of A minor, A4 to A5 — taken down a semitone, which puts seven of its nine
 * notes on the scale; the other two go to their neighbours, the leap up to the B kept as
 * a leap up to the top A.
 */
const NEON_ORBIT_GRID = Object.freeze([5, -1, 2, -1, 1, -1, 6, -1, 4, -1, 3, 7, -1, 3, -1, 6]);

const formOf = (b) => (b.form || []).map((f) => ({ role: f.role, type: f.type, from: f.from, to: f.to }));

export const STARTERS = Object.freeze({
  'neon-orbit': Object.freeze({
    name: 'NEON ORBIT',
    recipe: Object.freeze({
      mode: 'simple', notes: NEON_ORBIT_GRID, style: NEON_ORBIT.banger.options.style,
      mood: NEON_ORBIT.banger.options.mood, seed: NEON_ORBIT.banger.seed, bpm: NEON_ORBIT.bank.bpm,
    }),
    song: () => ({ bank: NEON_ORBIT.bank, mix: NEON_ORBIT.mix, arrangement: NEON_ORBIT.arrangement,
      bpm: NEON_ORBIT.bank.bpm, form: formOf(NEON_ORBIT.banger) }),
  }),
});

/** The starter a first-time Lab gets. */
export const FIRST_STARTER = 'neon-orbit';
