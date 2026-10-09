// 8-BIT RESULTS — each lane's fader trim, in dB, for its 8-bit part: the part measured against the
// one it replaces. What the 8-bit alternates are made with (tools/lib/chip-results-mixes.js).
//
// WRITTEN BY tools/chip-results-levels.js — run it again after a song's mix or the 8-Bit set
// changes, then remake an alternate with --force to start it from them. A lane not listed needs
// no trim, or was not measured.
export const CHIP_RESULT_TRIMS = {
  cardboard: { bass: 3.2, lead: -6.3, kick: -0.3, snare: -4.9 },
  crypt: { bass: -5.8, lead: 0.2, twinkle: -2.8, chords: -5.7, organChords: 0.6, kick: -0.5, clap: 8.3, rim: -5, hats: 5.5, bass2: -8.6, lead3: -1, lead2: -3.5, bass3: -8.1, bass4: -7.3, lead5: -6.6, lead6: -3.8, lead7: -3.2, snare2: -1.4, hats2: 1.9 },
  finale: { bass: 12, lead: 1.8, chords: 0.3, kick: -0.3, clap: 2.1, rim: -1.5, crash: 0.4 },
  frost: { bass: -3.4, lead: -4.5, snare: 7.1, clap: 2.1, hats: 0.2, ohats: 2.6, bass2: 4, lead8: 3.7, lead2: -0.8, lead3: -3.3, lead4: -4.3, lead9: 8.4, lead10: -2.4 },
  gravity: { bass: -2.1, lead: -1.1, chords: -7.2, kick: 1.9, snare: -4.9, hats: -1.9, lead2: -2.2 },
  hub: { bass: 3.5, chords: -3.3, kick: 0.2, snare: 3.4, clap: 1.3, hats: 2.5, ohats: -4, crash2: 0.7, crash3: -0.7, bass2: -0.3, chords2: -3.8 },
  megamix: { bass: 7.1, lead: -2, chords: -0.1, kick: -2.3, snare: 2.8, clap: 0.6, hats: 1.1, ohats: 0.6, tom2: 12, bass3: 4.5, bass2: 2, lead2: 7.6 },
  neon: { bass: 3.2, lead: -5.2, twinkle: -0.8, chords: -5.1, kick: -2.6, snare: 5.1, clap: 4.3, hats: 2.6, ohats: -0.9, crash: 3, lead7: -4.2, lead2: -2.1, lead3: -2.7, lead4: -0.2, lead8: -2.3, lead6: -1.1, bass2: -0.7, chords2: -1.1, snare2: 4.5, clap2: 3, hats3: 0.5, hats2: 3.6, lead9: -0.2, lead10: -3, lead11: -1, lead13: -0.9, crash2: 2.7, lead14: -6.2 },
  office: { bass: 3.1, lead: -2.8, kick: -0.5, clap: 3.1 },
  plumber: { bass: -1, lead: -4.2, chords: 0.5, snare: 0.2, clap: 3.4, hats: 0.6, ohats: -0.6, crash: 5.8, bass2: -1.1, chords2: -5.2, chords3: -2, lead2: -0.9, lead4: -0.9, lead5: -4.4, lead6: -0.5, kick2: 2.1, lead7: 0.9, crash3: -0.7, snare2: 1.3, snare3: 5.7 },
  rhythm: { bass: 2.4, kick: -1.8, snare: -1.1, clap: 4.8, ohats: 0.6, crash: -0.3, bass3: 7.7, lead2: 1.1, lead3: 3.2, lead8: 5.6, lead4: -5.1, lead5: 2.7, lead6: -1.9, lead7: -15, lead9: -11, lead10: -5.3, lead11: -3.3, crash2: -0.7 },
  shop: { bass: -1.8, lead: -0.3, chords: -15, organChords: -0.9, kick: -0.1, snare: -4.7, clap: 6.1, hats: 1.9, chords2: -6.7, bass2: -0.8 },
  speed: { lead: -0.1, kick: 3.5, snare: -4.7, clap: 3.2, hats2: 2.6, lead3: 0.6, crash2: 6.5, bass2: -1.2, crash3: 0.6, lead10: 4, lead7: 4.9, lead11: 1.2 },
  surge: { bass: 2.4, lead: -7.8, kick: -0.5, snare: -5.3, clap: 3.2 },
  title: { bass: 4.9, lead: 12, chords: 12 },
};
