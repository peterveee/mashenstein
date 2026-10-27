# FRPP-6 piano trial — 27 Oct 2026

Render: `node work/local/frpp6-piano-auditions.mjs` → `work/auditions/frpp6-piano/`.
Each file is normalised to −1 dBFS, so compare tone, not level. Every file plays the same
phrase: a slow four-chord ballad, a held low chord, then a staccato run from A0 up to A6,
so each register can be heard on its own.

Each step adds one thing to the step before it.

| # | File | What changes |
| --- | --- | --- |
| 01 | dulcimer-today | The existing Hammered Dulcimer preset, as a reference. 6 strings, so 25 notes get cut short. |
| 02 | piano-todays-pots | A piano built only from controls on the desk today: STRIKE, shimmer pair 1.5 ct, harp body, long RING. 12 strings. |
| 03 | piano-soundboard | The harp body swapped for the new **soundboard** body. |
| 04 | …-trio | **Unison 3**: three strings per note instead of two. |
| 05 | …-stiff | **Inharmonic**: METAL follows a piano's stretch curve, solved for each note. |
| 06 | all-pedal-sympathetic | Sustain pedal held: RELEASE 3 s, plus **sympathetic** strings at 0.7. 16 strings, but it still cuts 16 notes. |
| 07 | all-felt-soft | 05 with a soft felt hammer (HARD 0.25). |
| 08 | all-bright | 05 with a hard, bright hammer (HARD 0.75). |

## Round 2

Peter's verdict on round 1: richer than the dulcimer, but still a plucked string.

Measured, a C4 fell 40 dB in 2 s and a C6 was gone in 1 s. That short, single decay is the
pluck. The soundboard was also all clean tones, with no wood noise in it, and nothing went
"thunk".

Round 2 adds four things:
- **Longer ring:** 2.5× longer, with less shortening up the keyboard.
- **Two-stage decay:** the middle string carries the attack and dies fast; the outer two
  start lower and ring on. Measured on a C4, it drops 14 dB by 0.5 s, then holds near that
  level for the next half second before the slow tail.
- **A hammer-and-key knock:** about 14 dB under the note, the same at every pitch.
- **A noisy soundboard tail:** added to the soundboard body. This also changes files 03–08,
  which were re-rendered with it.

| # | File | What changes |
| --- | --- | --- |
| 09 | r2-long-twostage-knock | All of round 2. |
| 10 | r2-knock-loud | 09 with the knock 6 dB louder. |
| 11 | r2-pedal-sympathetic | 09 with the pedal held and sympathetic strings on. |
| 12 | r2-felt-soft | 09 with a soft felt hammer. |
| 13 | r2-no-knock | 09 without the knock, to hear what the knock adds. |

Cost, as a share of real time for this phrase in Node: dulcimer 0.8 %, 05 1.4 %, 06 2.7 %.

Stretch measured on 05 (`work/local/frpp6-piano-stretch.mjs`) is within a few cents of the
target curve up to C5. Partial 10 sits +16 ct at A1 and +52 ct at C4.
