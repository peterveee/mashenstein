// SPEED ZONE — ORIGINAL. Read-only.
//
// The song as it first existed: the first commit (04c9246, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.
import { seq } from '../../engine/notes.js';

export const id = "original-speed";
export const title = "SPEED ZONE (ORIGINAL)";
export const slug = "original-speed";
export const group = "original";

export const bank = { bpm: 128, bass: seq('E2 E2 . E2 . E2 . . G2 G2 . G2 . G2 . . A2 A2 . A2 . A2 . . B2 . D3 . B2 . G2 .'), lead: seq('E5 . . B4 . E5 . G5 . E5 . B4 . A4 . B4'), kick: seq('C1 . C1 . C1 . C1 . C1 . C1 . C1 . C1 .').map((v) => !!v), hats: seq('C1 C1 . C1 C1 C1 . C1').map((v) => !!v) };
