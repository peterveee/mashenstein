# The audio performance campaign — August 2026

What was measured, what was changed, what was rejected, and the rules that now govern
any performance claim about this engine. The working notes, benches and A/B renders
live under `work/local/` and `work/auditions/` (disposable); this document is the
tracked record. Everything audible here was approved by ear before it stayed.

---

## 1. Results

| area | before | after |
| --- | --- | --- |
| TNGR-2 (8 held notes, share of one audio thread) | 2.76% | **2.43%** — budget is 5% |
| smw-all-instruments-newest, full offline render | 384 ms/audio-s | **266** |
| barber-96 standing graph (no notes) | 95.8 ms/audio-s | **72.6** |
| Doubler / Chorus 2 / Phaser (measured cost, % of a core) | 0.60 / 0.60 / 2.06 | **0.33 / 0.44 / 0.60** |
| every offline bounce (retired-pool sweep) | — | **8–9% faster** |
| sustain-0 presets (denormal trap; 35 presets incl. all 20 MembraneSynths) | 21.7 ms/s | **5.4** |
| barber-96 string section, live | re-synthesised every note, every lap | **rendered once, replayed** |
| note-cache warm-up on a playing song | impossible | trickles during playback; full-speed on pause; prepared start on Play-from-top |

Fully warm, both test songs play with **zero recorded dropouts**. The one open
question is §6.

---

## 2. The measurement rules

Every rule below produced a wrong conclusion the day it was broken. Any future
performance claim about this engine should state which bench produced it and confirm
it obeyed these.

1. **Muting is not silence.** `setMute` zeroes a fader; the voices are still built and
   rendered. Isolating any cost requires `Audio.setSilentLaneSkip(true)`. Broken, this
   produced "94% of a song is the standing graph" (truth: ~50:50, song-dependent).
2. **Fresh page per render.** `Audio` is a module singleton; a second `renderBankPage`
   in the same page renders silence — and a silent render still returns a plausible
   wall-clock time, so the error reads as data.
3. **Best-of-3, round-robin, discarded warm-up.** Single offline renders drift ±20%,
   which is larger than most effects being measured.
4. **Node count is not cost.** Chromium short-circuits silent chains: a thousand idle
   gains, whole channel strips, EQ biquads at flat settings and an 11-node width
   network at unity all ablate to zero. What costs is a node that GENERATES signal
   (looping buffer sources, oscillators, Tone's ConstantSource-per-param) or HOLDS it
   (convolver tails, compressor envelopes, denormal-range decays).
5. **Effect costs are measured in situ** — on a stereo bus inside a real mix, idle and
   playing. The old one-mono-oscillator bench under-priced nearly the whole catalogue
   about 2×. The `cost:` numbers in `EFFECTS` were all re-measured 2026-08-19.
6. **Per-lane cost tracks note density × duration × chord width, not synth class.**
7. **Census before building.** Three plausible optimisations died on their own
   preliminary census: the MRDR-3 Performance-mode caps (reached 3 of 68 presets —
   `MAX_UNISON = 4` had already taken the win), sharing the global filter across chord
   tones at keyTrack 0 (reached 2), and widening the pooled cache gate (reached ~1).

## 3. What changed in the engine

**Effects** (`src/engine/effects.js`): the Doubler lost its ±100-cent varispeed
detune — it is now what it was always used as: two short delays panned hard left and
right with a slow wander (10 permanently-looping sources → 2 per instance). Chorus 2
went from four taps to two hard-panned ones, which also fixed DENSITY silently walking
the image left. The Phaser is native now — four allpass stages and one LFO in place of
Tone's ten-stages-per-channel (~80 always-running ConstantSources). Every `mbComp` in
the library became the native `mbCompN` (identical parameters, 34% cheaper). The
tape's spare 4×-oversampled shaper only joins the graph during a curve crossfade;
dropping the oversampling itself was measured and **rejected** — the oversampler
carries group delay, and cheaper-but-phase-shifted is a different sound.

**MRDR-3** (`src/engine/voices.js`): the synthesis model is untouched — that is a
design decision, not an oversight. The per-occurrence ensemble jitter (humanize +
spread-vibrato reseeding per note) is **off**: entry stagger and scattered vibrato
phases survive inside every note, frozen to a fixed seed, so each occurrence is the
same section rather than a solo (zeroing the spread outright was tried and collapsed
unison voices coherently — peak jumped 0.594 → 0.861 — before the A/B caught it).
That freeze is what made the string section cacheable. The cache's render rack now
borrows the live rack's seeded noise buffers, so noise layers cache exactly. Amp
envelopes are floored at −120 dB because a sustain of literal zero decays into
denormal range and stalls the render thread ~4×.

**Pools**: offline renders sweep retired pool generations at the JIT checkpoints
(same booked-notes-plus-tail predicate as live retirement — it cannot cut sound); the
desk reaps pools idle for 30+ seconds.

**The note cache, live** (the largest single change in behaviour): preparation used to
stop entirely whenever a bank was loaded, so a playing song could never warm. It now
**trickles during playback** — one render per idle slice, at most one per 600 ms, held
only while the audio clock sits in the borderline band (healthy renders; drowning
renders, because it cannot meaningfully get worse; only the edge holds). **Pausing
lifts every brake** — a paused transport has no audible playback to protect, so pause
is the catch-up gesture and the overload banner says so, with a live count.
**Play-from-top prepares fully before starting** (the old 1.2 s budget always expired;
it is a stuck-render backstop now), second press skips the wait. Cache capacity was
raised 64 → 320 MB after the string section's key space (~250 MB on barber-96) was
caught thrashing the old cap — a cache at its cap is a machine for converting renders
into evictions.

**The desk**: the watchdog's verdict moved out of the toolbar CPU readout into its own
fixed footer slot, and a cleared verdict lingers dimmed for a few seconds instead of
vanishing with the evidence.

## 4. What was rejected, so it is not retried

- **Migrating Tone presets to TNGR-2** — rejected by design choice: MRDR-3's readable
  native-node synthesis is the point of MRDR-3.
- **MRDR-3 Performance-mode unison/filter caps** — inert; the census killed it.
- **Sharing per-chord-tone filters** — keyTrack > 0 in 38 of 40 filtered presets;
  key follow is the feature working, and keyTrack itself measures free.
- **Cheapening moving PWM** — decomposed and fairly priced; every cheaper
  construction is a different sound.
- **Tape at 2× oversampling** — half the cost, but group delay makes it a phase
  change nobody can point at.
- **Lazy channel strips, EQ/width bypass, echo-loop removal, aux sleeping** — all
  measured at zero (rule 4); the strip graph is genuinely near-free when silent.
- **Humanized replay** (render the deterministic core, re-jitter per occurrence at
  replay) — superseded by freezing the jitter outright.
- **Converting presets to TNGR-2** (restated after a misunderstanding was cleared,
  2026-08-20): what Peter declined was moving PRESETS onto the wavetable model — a
  typical user understands subtractive synthesis better. That stands.

## 4b. The recommended long-term project: MRDR-3 on an AudioWorklet backend

Reopened 2026-08-20 once the constraint above was correctly understood: it was about
the user-facing MODEL, not the implementation. A worklet backend keeps the subtractive
model, the panel, the presets and every parameter identical — only the rendering
substrate changes, from a per-note native-node graph to per-sample code.

The case is architectural reliability, and this campaign is its own evidence: the note
cache, its cost-aware planning, the warm-up trickle and its three brakes, the
prepared-start flow, pause-to-catch-up, and the 320 MB capacity raise are FOUR LAYERS
of machinery whose only job is managing the cost of building node graphs per note.
Every fragile live moment of this campaign (cache thrash, audible warm-ups, cold
restarts) lived in that machinery. A worklet deletes the class: flat deterministic
cost per voice, no cache, no warm-up, no cold start — the way TNGR-2 has been solid
throughout at ~10× cheaper on dense material. Bounces (which always synthesize) get
MRDR's ~18% share back too.

Shape: the TNGR-2 completion-spec pattern — one DSP source string evaluated by both a
Node reference renderer and the worklet, parity tests at zero tolerance between the
two hosts, a preset hash oracle. Hard parts that actually get EASIER per-sample: hard
sync becomes exact (today it is 32 ms grain crossfades), moving PWM needs no delay
trick. The honest costs: the sound cannot cross bit-exactly, so all 68 presets need
ear re-approval in batches with level re-measurement; and it is weeks of work. The
cache machinery is retired at the end, not before.

## 5. Verification infrastructure

- `tests/null-test.js` — five reference tracks, byte-level; baselines re-rendered
  and ear-approved 2026-08-19 (twice: effects round, sustain floor).
- `work/local/tngr2-null-oracle.mjs` — SHA-256 of all 43 TNGR-2 presets at both
  sample rates; the bit-exactness referee.
- `work/local/verify-note-cache.js` — cached-vs-live fidelity, including noise layers
  and the string section; compares dry on both paths because the lane chorus lives
  outside the cached buffer by design.
- `work/local/trickle-probe.mjs` — proves preparation renders during playback, under
  a busy main thread, and jumps to full speed on pause.
- `work/local/mix-bench.mjs` and friends — the ablation instruments (rule 3 built in).
- `tests/run-all.js` **skips 21 browser suites** — run the mixer ones directly;
  two real bugs this campaign were caught only that way.

## 6. The open question

Fully warm, both test songs play with zero recorded dropouts — but the desk's
worst-instant clock still dips to 0.70–0.81 (`AUDIO STRUGGLING`) during warm laps.
Two eliminations have since fenced this in (`work/local/reaper-ab.mjs`, a live A/B/A):

- **It is not note synthesis** — proven by playing fully cached.
- **It is not the engine's graph at all, and not the idle-pool reaper** — the same
  song, fully warm, played live through the real pipeline in a bare page holds a
  worst 500 ms window of **0.966** over six minutes, reaper on or off
  (indistinguishable: A1 min 0.991, B-with-reaper 0.985, A2 0.966).

What remains is the difference between a bare page and the desk: the desk UI's main
thread, the real output-device path, and whatever else the browser is doing. Given
zero dropouts ever recorded warm, the working hypothesis is now that the desk's flag
is a twitchy warning light in a busy environment rather than an engine defect — but
that final attribution has not been measured, and the honest close is one quiet warm
session on the real desk with the Loop CSV open. The full evidence chain is in
`work/local/perf-session-handover-2026-08-19.md` while it survives; this section is
the durable summary.
