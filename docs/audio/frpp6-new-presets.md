# FRPP-6 new preset candidates — 27 Oct 2026

Render: `node work/local/frpp6-new-presets.mjs` → `work/auditions/frpp6-new-presets/`.
Every candidate uses only the stored pots (DROP, RESONANCE, WOOD, METAL to 2, and the wider
RING / SIZE / WHERE), so any that are kept go into voices.js exactly as the script has them.
Files 01–14 are each normalised to −1 dBFS, so compare tone, not level.

| # | File | What it is |
| --- | --- | --- |
| 01 | harpsichord | Quill near the end of the string (WHERE 0.03), an octave course (8′ + 4′), soundboard, short release like a damper. |
| 02 | harpsichord-single-8ft | 01 with the octave course off. |
| 03 | santoor | Struck, a shimmer pair, RESONANCE 1.6 so the open strings ring under every note. |
| 04 | oud | A big dark box (SIZE 1.8, WOOD 1), slight shimmer, DROP 0.6. Played as a single line. |
| 05 | pizzicato-strings | Short RING, a section detune, through the violin body with WOOD 1.5. |
| 06 | pizzicato-strings-guitar-box | 05 through a small nylon box instead. |
| 07 | ukulele | Soft nylon pluck, SIZE 0.3. |
| 08 | charango | Bright doubled courses, SIZE 0.25. |
| 09 | upright-bass-cello-body | Plucked, low brightness, cello body, WOOD 1.2. Walking line. |
| 10 | upright-bass-big-box | 09 through a nylon box at SIZE 4. |
| 11 | autoharp-wash | RING 20 s, RESONANCE 2, strummed chords left to bloom. |
| 12 | music-box | METAL 2, tiny body, struck. |
| 13 | gamelan-pluck | METAL 2 with a 12-cent pair, for the beating. |
| 14 | ambient-long-pluck | RING 30 s, SIZE 4, RESONANCE 1.5. Strummed. |

## Upgrades to presets that ship

Each pair is the preset as it ships, then with the new pots added. The two files are
loudness-matched, so they compare tone rather than level.

| # | Preset | Added |
| --- | --- | --- |
| 15–16 | Sitar | RESONANCE 1.5 (a real sitar's sympathetic strings) |
| 17–18 | Tanpura drone | RESONANCE 1.5 |
| 19–20 | Silk Koto | DROP 0.4, RESONANCE 0.6, WOOD 0.6 |
| 21–22 | Concert Harp | RESONANCE 1, WOOD 0.5 |
| 23–24 | Hammered dulcimer | DROP 0.3, RESONANCE 1.2, WOOD 0.5 |

Taking an upgrade changes every song that uses that preset, as the guitar change did.

## Kept (27 Oct 2026)

Peter kept all of them. The new presets are in voices.js as `frppHarpsichord`,
`frppHarpsichord8`, `frppSantoor`, `frppOud`, `frppPizzicato`, `frppPizzicatoBox`, `frppUkulele`,
`frppCharango`, `frppUprightBass`, `frppUprightBassBig`, `frppAutoharp`, `frppMusicBoxTines`
(named so it doesn't clash with the glass set's `frppMusicBox`), `frppGamelan` and
`frppAmbientPluck`. The five upgrades replaced the shipped presets, each with a trim
(1–2 dB) to keep a typical note as loud as before. The songs' own copies got the same change:
Sitar, Sitar · Chikari and Silk Koto in the Space Raga remix, and Concert Harp · Damped in the
Winter Ballad.
