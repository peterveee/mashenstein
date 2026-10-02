// CORPORATE KOMBAT — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-office";
export const title = "CORPORATE KOMBAT (ORIGINAL)";
export const slug = "original-office";
export const group = "original";

export const bank = { bpm: 116, bass: seq('G1 . G1 . B1 . B1 . C2 . C2 . D2 . D2 . E2 . E2 . C2 . C2 . D2 . B1 . G1 . . .'), lead: seq('G4 . B4 D5 . . B4 . C5 . E5 . D5 . B4 .'), kick: seq('C1 . . C1 . . C1 .').map((v) => !!v), hats: seq('C1 . C1 . C1 . C1 .').map((v) => !!v) };
