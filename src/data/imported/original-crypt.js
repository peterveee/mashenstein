// CRYPT SHIFT — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-crypt";
export const title = "CRYPT SHIFT (ORIGINAL)";
export const slug = "original-crypt";
export const group = "original";

export const bank = { bpm: 90, bass: seq('A1 . . . A1 . . . A1 . . . C2 . B1 . A1 . . . A1 . . . F1 . . . E1 . . .'), lead: seq('A4 . . . . . C5 . . . B4 . . . . .'), leadType: 'triangle', kick: seq('C1 . . . . . . .').map((v) => !!v), hats: seq('. . . C1').map((v) => !!v) };
