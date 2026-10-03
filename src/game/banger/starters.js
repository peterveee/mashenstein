// THE LAB'S STARTER SONG — what a first-time player finds in THE LAB. 3 Oct 2026.
//
// Peter: a preset riff and a full recipe for a first-time player, instead of an empty
// list — NEON ORBIT BANGER, as he saved it on the desk (the dark-mood take, since the same
// afternoon; replacing the file updates everyone's copy). The song plays exactly as saved
// (src/data/bangers/neon-orbit-banger.js), not regenerated: the generator has moved on
// since (the hypnotic echo bass, the bass level), and what he liked is that take.
//
// The kept record carries `preset`, which songFor() (store.js) answers with the saved song.
// It also carries an ordinary grid recipe — the riff on the ADVANCED grid (Peter, 3 Oct
// 2026: the pencil opens it in advanced mode), the style and mood — so the pencil can open it. Editing it never overwrites it: BRING TO LIFE keeps
// a NEW song, made by the game's own plain recipe (Peter, 3 Oct 2026).
import * as NEON_ORBIT from '../../data/bangers/neon-orbit-banger.js';

/**
 * The desk riff (two bars of eighth notes, C6 to B6) on the ADVANCED grid — sixteenths on
 * every semitone, A4 to A5 — taken down a whole tone, which fits all nine notes in the
 * grid's octave with the tune's shape exactly as written: each entry is a note's semitone
 * above A4, on the sixteenth it starts on.
 */
const NEON_ORBIT_GRID = (() => {
  const g = new Array(32).fill(-1);
  [[0, 7], [4, 2], [8, 1], [12, 9], [16, 6], [20, 4], [22, 12], [26, 4], [30, 10]].forEach(([at, semi]) => { g[at] = semi; });
  return Object.freeze(g);
})();

const formOf = (b) => (b.form || []).map((f) => ({ role: f.role, type: f.type, from: f.from, to: f.to }));

/**
 * The dark take was made by the first generator, which did not write its form into the
 * recipe; this is its form as the file's header lists it, for the club's crowd moments.
 */
const NEON_ORBIT_FORM = Object.freeze([
  { role: 'intro', type: 'intro', from: 1, to: 4 }, { role: 'build', type: 'build', from: 5, to: 8 },
  { role: 'drop', type: 'drop', from: 9, to: 24 }, { role: 'breakdown', type: 'breakdown', from: 25, to: 28 },
  { role: 'build2', type: 'build', from: 29, to: 32 }, { role: 'drop2', type: 'drop', from: 33, to: 40 },
  { role: 'drop3', type: 'drop', from: 41, to: 48 },
]);

export const STARTERS = Object.freeze({
  'neon-orbit': Object.freeze({
    name: 'NEON ORBIT',
    recipe: Object.freeze({
      mode: 'advanced', notes: NEON_ORBIT_GRID, style: NEON_ORBIT.banger.options.style,
      mood: NEON_ORBIT.banger.options.mood, seed: NEON_ORBIT.banger.seed, bpm: NEON_ORBIT.bank.bpm,
    }),
    song: () => ({ bank: NEON_ORBIT.bank, mix: NEON_ORBIT.mix, arrangement: NEON_ORBIT.arrangement,
      bpm: NEON_ORBIT.bank.bpm, form: NEON_ORBIT.banger.form ? formOf(NEON_ORBIT.banger) : NEON_ORBIT_FORM.map((f) => ({ ...f })) }),
  }),
});

/** The starter a first-time Lab gets. */
export const FIRST_STARTER = 'neon-orbit';
