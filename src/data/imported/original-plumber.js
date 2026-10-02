// PLUMBER PANIC — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-plumber";
export const title = "PLUMBER PANIC (ORIGINAL)";
export const slug = "original-plumber";
export const group = "original";

export const bank = { bpm: 112, bass: seq('A2 . A2 . F2 . F2 . C3 . C3 . G2 . G2 .'), lead: seq('A4 . C5 E5 . A4 . . F4 A4 C5 . E5 . D5 C5 | A4 . C5 E5 . G5 . . F5 E5 D5 . C5 . B4 A4'), kick: seq('C1 . . . C1 . . . C1 . . . C1 . . .').map((v) => !!v), hats: seq('. . C1 . . . C1 . . . C1 . . . C1 .').map((v) => !!v) };
