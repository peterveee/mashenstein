// THE FOOD COURT — ORIGINAL. Read-only.
//
// The song as it first existed: the first HUB_THEME (9105c0a, 19 Jul 2026), copied verbatim from
// git history. Kept so the original can always be heard on the desk next to the song it
// grew into. There is deliberately no desk-save section in this file, so the desk opens
// it read-only; to work on it, use Save a copy.

export const id = "original-hub";
export const title = "THE FOOD COURT (ORIGINAL)";
export const slug = "original-hub";
export const group = "original";

export const bank = {
  bpm: 90,
  bass: [110, null, null, null, 82, null, null, null, 98, null, null, null, 73, null, null, null, 110, null, null, null, 82, null, null, null, 98, null, null, null, 123, null, null, null],
  kick: Array.from({ length: 32 }, (_, i) => i % 8 === 0),
  hats: Array.from({ length: 32 }, (_, i) => i % 8 === 4),
};
