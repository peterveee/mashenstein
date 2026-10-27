# FRPP-6 guitar before/afters — 27 Oct 2026

Render: `node work/local/frpp6-guitar-ab.mjs` → `work/auditions/frpp6-guitar-ab/`.

The three extras below came out of the piano trial ([frpp6-piano-auditions.md](frpp6-piano-auditions.md)).
None of them is on the desk yet. Each preset plays the same phrase: two bars fingerpicked
(G C D Em), one bar strummed, then a held G.

Every file is matched in loudness (rms) to its preset's *before*, so no version wins just by
being louder. One shared gain per preset puts the loudest peak at −1 dBFS.

| Suffix | What changes |
| --- | --- |
| a-before | The preset as it ships. |
| b-body-noise | A short wood-noise tail added to the body: lows about 0.2 s, highs about 35 ms. |
| c-sympathetic | The six open strings ring along with what is played, about 3 s. Listen to the tail of the held chord. |
| d-two-stage | Each string becomes its two polarisations: a loud one that dies fast, then a quieter one that rings on. |
| e-all | b + c + d together. |

Presets: Steel acoustic (01–05), Nylon classical (06–10), Steel acoustic Shimmer (11–15), and
Clean Electric (16–19). The electric has no body, so it has no b file.
