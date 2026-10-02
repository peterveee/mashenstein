// CARDBOARD KINGDOM — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-cardboard";
export const title = "CARDBOARD KINGDOM (ORIGINAL)";
export const slug = "original-cardboard";
export const group = "original";

export const bank = { bpm: 108, bass: seq('C2 . G1 . C2 . G1 . F1 . C2 . F1 . C2 . G1 . D2 . G1 . D2 . C2 . E2 . G2 . C3 .'), lead: seq('E5 D5 C5 . . G4 . . E5 D5 C5 . D5 . . .'), leadType: 'triangle', kick: seq('C1 . . . C1 . . .').map((v) => !!v), hats: seq('. C1 . . . C1 . C1').map((v) => !!v) };
