// FROST FORTRESS — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-frost";
export const title = "FROST FORTRESS (ORIGINAL)";
export const slug = "original-frost";
export const group = "original";

export const bank = { bpm: 100, bass: seq('D2 . . . A2 . . . B1 . . . F2 . . . G1 . . . D2 . . . G2 . . . A2 . . .'), lead: seq('D5 . F5 . A5 . F5 . D5 . . . C5 . E5 .'), leadType: 'triangle', kick: seq('C1 . . . . . . . C1 . . . . . . .').map((v) => !!v), hats: seq('. . C1 . C1 . . .').map((v) => !!v) };
