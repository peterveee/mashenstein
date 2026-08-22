# Ambience insert benchmark

Measured 2026-08-22 on the local Chromium `OfflineAudioContext` runner at 44.1kHz.
The isolated candidate pass used a four-second stereo two-tone signal and a no-effect
baseline. The real-mix pass used `work/local/effect-cost-bench.mjs barber-96 1 3`,
with fresh pages, three rounds, and the existing idle/playing measurements.

| Candidate | Isolated delta | Gate/result |
| --- | ---: | --- |
| Short seeded convolution, 350ms IR | 3.78 ms/audio-second (0.38%) | Rejected: over 0.35% |
| Sparse filtered four-tap delay | 1.83 ms/audio-second (0.18%) | Rejected: discrete/correlated tail |
| Two-line feedback/all-pass spring approximation | 2.40 ms/audio-second (0.24%) | Selected: diffuse tail and stereo decorrelation |

The selected implementation's real-song result on `barber-96` was:

| State | Delta (ms/audio-second) |
| --- | ---: |
| Idle | 2.2 |
| Playing | 1.6 |
| Catalogue cost (larger / 10) | **0.22%** |

The catalogue cost is therefore below the 0.35% gate and remains separate from the
existing shared convolution Reverb. This is an offline/rendering benchmark, not a
phone playback or listening sign-off; live Song Mixer audition remains required.
