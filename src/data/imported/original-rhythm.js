// RHYTHM BANKRUPTCY — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-rhythm";
export const title = "RHYTHM BANKRUPTCY (ORIGINAL)";
export const slug = "original-rhythm";
export const group = "original";

export const bank = { bpm: 124, bass: seq('C2 . C2 . G2 . E2 . C2 . C2 . A2 . G2 . F2 . F2 . C2 . A1 . G1 . G2 . B2 . D3 .'), lead: seq('C5 . E5 G5 C5 . E5 G5 . A4 . C5 . E5 . .'), kick: seq('C1 . . . C1 . . . C1 . . . C1 . C1 .').map((v) => !!v), hats: seq('. . C1 . . . C1 . . . C1 . . C1 . C1').map((v) => !!v) };
