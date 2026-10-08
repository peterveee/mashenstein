// 8-BIT RESULTS — each lane's fader trim, in dB, for its 8-bit part: the part measured against the
// one it replaces. What the 8-bit alternates are made with (tools/lib/chip-results-mixes.js).
//
// WRITTEN BY tools/chip-results-levels.js — run it again after a song's mix or the 8-Bit set
// changes, then remake an alternate with --force to start it from them. A lane not listed needs
// no trim, or was not measured.
export const CHIP_RESULT_TRIMS = {
  cardboard: { bass: 3.2, lead: -6.3, kick: -0.3, snare: -4.4 },
  crypt: { bass: -5.6, lead: -0.1, twinkle: -2.8, chords: -5.6, organChords: -1.1, kick: -0.7, clap: 7.7, rim: -5, hats: 5.5, bass2: -7.1, lead3: -1.5, lead2: -3.4, bass3: -6.6, bass4: -7.4, lead5: -6.6, lead6: -3.8, lead7: -3.3, snare2: -0.5, hats2: 2 },
  finale: { bass: 12, lead: 1.8, chords: 0.3, kick: -0.3, clap: 2.1, rim: -1.5, crash: 0.4 },
  frost: { bass: -5.7, lead: -4.4, snare: 7.5, clap: 0.9, hats: 0.7, ohats: 2.6, bass2: 3.4, lead8: 3.7, lead2: -1.4, lead3: -3.5, lead4: -0.7, lead9: 8.2, lead10: -2.6 },
  gravity: { bass: -6.2, lead: -7.5, chords: -3.5, kick: 1.2, snare: -2.4, hats: -1.8, ohats: 7.5, lead2: -5.5 },
  hub: { bass: 3.5, chords: -3.3, kick: 0.2, snare: 3.9, clap: 1.3, hats: 2.5, ohats: -4, crash2: 0.5, crash3: -1.6, bass2: -0.3, chords2: -3.9 },
  megamix: { bass: 7.1, lead: -2, chords: -0.1, kick: -2.3, snare: 3.5, clap: 0.6, hats: 1.1, ohats: 0.6, tom2: 12, bass3: 0.7, bass2: 0.3, lead2: 3.1 },
  neon: { bass: 3.2, lead: -3.9, twinkle: -0.7, chords: -5.8, kick: -2.5, snare: 5.5, clap: 4.3, hats: 3, ohats: 0.1, crash: 3.4, lead2: -2.1, lead3: 1, lead4: 3.7, lead8: -2.1, lead6: 2.4, bass2: -2.8, chords2: -1.2, snare2: 5, clap2: 3, hats3: 0.8, hats2: 3.3, lead9: -0.3, lead10: 0.9, lead11: -1.1, lead13: -4.5, crash2: 3.3, lead14: -4.9 },
  office: { bass: 3.1, lead: -2.8, kick: -0.5, clap: 3.1 },
  plumber: { bass: 0.6, lead: -6.7, chords: 0.6, snare: 0.5, clap: 3.2, hats: 0.5, ohats: 0.8, crash: 5.9, bass2: -0.6, chords2: -5.3, chords3: -2.6, lead2: -1, lead4: -1.3, lead5: -6.4, lead6: -0.5, kick2: 2.1, hats2: -0.1, lead7: 0.9, crash3: -0.7, snare2: 1.6, snare3: 6 },
  rhythm: { bass: 2.7, kick: -1.9, snare: -0.3, clap: 4.8, ohats: 0.6, crash: -0.3, bass3: 7.6, lead2: -1.1, lead3: 2.9, lead8: 5.2, lead4: -5.3, lead12: -0.1, lead5: 2.7, lead6: -1.9, lead7: -15, lead9: -11, lead10: -5, lead11: -1.6, crash2: -0.1 },
  shop: { bass: -1.8, lead: -0.3, chords: -15, organChords: -0.9, kick: -0.1, snare: -4.3, clap: 6.1, hats: 1.9, chords2: -6.5, bass2: -1.4 },
  speed: { lead: -0.1, kick: 3.5, snare: -4.1, clap: 3.2, hats2: 2.6, lead3: 0.6, crash2: 6.5, bass2: -1.2, crash3: 0.7, lead10: 4.2, lead7: 4.9, lead11: -6.7 },
  surge: { bass: 2.4, lead: -7.8, kick: -0.5, snare: -4.8, clap: 3.2 },
  title: { bass: 5.4, lead: 12, chords: 12 },
};
