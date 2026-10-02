// NEON BLASTERS — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-neon";
export const title = "NEON BLASTERS (ORIGINAL)";
export const slug = "original-neon";
export const group = "original";

export const bank = { bpm: 120, bass: seq('A2 . E2 . A2 . E2 . F2 . C2 . F2 . C2 . D2 . A1 . D2 . A1 . E2 . E2 . G2 . B2 .'), lead: seq('A5 . . E5 . C5 . E5 A5 . . G5 . E5 . C5'), leadType: 'sawtooth', kick: seq('C1 . . C1 . . C1 .').map((v) => !!v), hats: seq('. C1 . C1').map((v) => !!v) };
