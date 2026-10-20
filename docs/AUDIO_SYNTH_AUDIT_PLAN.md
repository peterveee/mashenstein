# Audio synth and effect audit — measurement plan

Written 20 Oct 2026, the evening the KNDO-5 leak was found. Peter: "it's disturbing we're
finding these inefficiencies after so long … we need a good plan to audit all our software
synths and potentially plugins to make sure they are as light as possible within reason."

This is a plan for finding out what every synth and effect actually costs, on the device
that matters, over a whole song — and for keeping it found. Fixes come out of the numbers;
none are promised here. Every stage ends in a table and can be stopped at.

## 0. Why these keep hiding

Three things the KNDO-5 leak, the MRDR-3 LFO leak (5 Oct), the drum leak (6 Oct) and the
Gravity choir peak have in common:

1. **They were measured once, over one pass.** A dead note left on a lane costs nothing
   for the first bar and everything by the last. A render of eight bars cannot see it.
   `mrdr-dead-note-graphs.md` had it written down for MRDR-3 and still said of KNDO-5
   "single-input per note — retires on its own; not touched." A comment is not a
   measurement.
2. **They were measured on the Mac, mostly in Chrome.** Chrome pays per node and
   short-circuits silent chains; WebKit pays per oscillator and per convolution. The
   reverb reads 3 % of the budget on the Mac's WebKit and moved Gravity's tipping point
   from bar 20 to bar 38 on the iPad. The Mac gets priorities roughly right and absolute
   numbers wrong, and some costs it does not see at all.
3. **Nothing fails when a cost comes back.** The null test guards the sound; nothing guards
   the load. A regression is found by Peter, on the iPad, weeks later.

So the plan is a harness before it is a list of fixes, and a test before it is a harness.

## 1. The target

Peter's iPad (A12Z, iPadOS, WebKit — the `Macintosh` user agent, the 2D renderer,
`SYNTH PHONE`) is the floor. Scale: about 1.9× this M3 Pro in WebKit (2 Oct measurement,
confirmed by every trail since). An iPhone 13 is about 1.4×.

The budget is **one audio thread**. The game's own share of it, from the trails:

| What | Share of the iPad's audio thread |
| --- | --- |
| Gravity Grid song, typical | ~40 % |
| Gravity bar 18–21 (the choir) or bar 38 (lead4 32nds + choir) | tips it |
| Rhythm Bankruptcy, before the KNDO-5 fix, by bar 39 | tips it |
| Rhythm after the fix (Mac, scaled; iPad played it clean end to end, 20 Oct evening) | ~24 %, flat |
| Sound effects, hero overlay, density changes | not measurable against the song |

**What "tips" means on this iPad.** Once the clock falls under ~0.9 it does not fall in
proportion to the overload: it drops to 0.2–0.3 and stays there while the load is over
some reduced capacity, and the device stays slow in menus for up to a minute afterwards.
The Mac's WebKit never does this (`work/local/_latch-webkit.mjs`). Prevention is worth far
more than relief, which is why this audit exists.

**Headroom goal.** No song's worst four seconds over **55 % of the iPad's thread** (so a
sound effect, a bake, or a hot afternoon has room), measured by the harness below and
confirmed once per song on the device.

## 2. The harness — Stage 1, one day

One command-line tool, `tools/audio-audit.js`, built from the pieces that already exist in
`work/local/` (`_light-headroom-webkit.mjs`, `_lane-peak-webkit.mjs`, `_latch-webkit.mjs`,
`_attract-census-webkit.mjs`), promoted into `tools/` because this one is kept.

### 2.1 What it runs

Headless WebKit, phone setup (`latencyHint 0.05`, no capture, metering off, MRDR-3 PHONE
tier) — the game's own setup, mirrored from `src/main.js`. The in-thread burner worklet from
`_live-headroom-webkit.mjs` (load = 1 − burn_with / burn_empty, ±5–10 points per run,
so every verdict is a median of three interleaved runs with a bare control first).

Served over https via a routed page (worklets need a secure context), as the existing tools
do. **Silent from line one:** every page gets the `SILENT_SINK` init script (every
connect to the speakers through one gain-0 node, which still renders), so nothing plays
through the Mac's speakers — memory `headless-audio-must-be-silent`. Also runnable against `http://MBP14.local:8001` to reproduce the iPad's no-worklet path
when needed.

### 2.2 Subjects

```
node tools/audio-audit.js synth <family> [--preset id]   every preset of one synth family
node tools/audio-audit.js effect <id|all>                one effect, or every one
node tools/audio-audit.js song <id> [@from-to] [~variant] a song, a bar range, a mute/solo
node tools/audio-audit.js strip                           the mixer with nothing playing
node tools/audio-audit.js all                             the whole table, overnight
```

A **synth** subject plays one preset on one lane from a fixed phrase: eighth notes, a
two-octave range, a chord every fourth bar, a held note every eighth, for 150 s. The same
phrase for every synth, so the numbers compare.

An **effect** subject puts one insert on a lane carrying a plain MRDR-3 saw phrase, then the
same effect muted, then bypassed, then absent.

### 2.3 The five numbers per subject

| Number | How | Fails when |
| --- | --- | --- |
| **Per-note cost** | load during the phrase minus the lane's idle load, divided by notes a second | over 2× the family median (the preset is an outlier) |
| **Standing cost** | load with the lane built, nothing played, 20 s | over 1 % for a synth lane, over 0.5 % for an idle effect |
| **Growth** | load in the last 30 s minus the first 30 s, same phrase throughout | over 2 points — a leak |
| **Live sources at the end** | `AudioScheduledSourceNode.start` patched, `ended` counted, as `glitch-log.js` does | over 2× the notes still sounding |
| **Wired leftovers** | `AudioNode.connect`/`disconnect` patched to keep an outgoing count; nodes connected to a lane strip's input at the end | any, after the last note's release plus a second |

Growth and wired leftovers are the two the KNDO-5 case would have failed on day one.

### 2.4 Outputs

- `work/audit/<date>/<subject>.json` — the raw samples (gitignored, reproducible).
- `work/audit/<date>/REPORT.md` — one table per family, sorted worst first.
- `docs/audio/AUDIT.md` — the kept summary, updated by hand after each stage, with the
  date and the number that moved.

### 2.5 The test

`tests/audio-leaks.js`, in `run-all`: one preset per synth family (the heaviest by the
report), 60 s, growth and wired-leftovers only, headless WebKit. About 10 minutes for the
suite, so it runs in the nightly set, not on every change. Thresholds from §2.3. When it
fails it names the family and prints the growth curve.

## 3. The synths — what to look at in each

Eight families, 925 presets. The order is by suspicion, not by catalogue order.

| Family | Path in `voices.js` | Presets | Per-note graph | First suspicion |
| --- | --- | --- | --- | --- |
| JMJR-4 (formant) | `_playJmjr4` → `jmjr4/note.js` → `dsp.js renderIr` | 29 | 23 gains, 7 biquads, 4 oscs, an IIR, a buffer source, per VOICE | half of Gravity's bar-20 peak |
| MRDR-3 native | `_playLayer`, cache `_playCachedLayer` | 166 | one filter chain per note, 1–3 oscs × unison | PWM delay lines, unison on phone |
| CRLS-1 / RMND-2 (Tone pooled) | `SYNTHS` classes, pools | 71 + 62 | Tone Synth/MonoSynth/FMSynth per slot | ~1,400 Tone oscillators still running after 100 s of Rhythm |
| KNDO-5 (chip) | `_playGame` | 10 | osc, gain, optional filter + drive, shared LFO | FIXED 20 Oct — verify it stays fixed |
| TNGR-2 (wavetable worklet) | `_playTngr2Node` | 82 | one worklet node per lane | NEVER measured on the iPad: every iPad trail so far was the http dev URL, where worklets do not exist and TNGR-2 lanes are silent AND free. Gravity has three (chords4, chords7, lead13), Rhythm one (lead7). The https build is heavier than any trail shows |
| WNDR-9 (additive) | `_playAdditive` | 12 | partials × oscs | standing cost per partial |
| Drums | `_playDrum` | 445 | body + click + metal partials per hit | retire fixed 6 Oct; cymbals' six partials |
| Engine (legacy) | engine voice | 48 | — | which songs still reach it |

### 3.1 JMJR-4 — Stage 3, two to three days

The known heaviest. Facts from today:

- Gravity bars 18–21 at 28 % median / 40 % worst on the Mac with the choir, 17 % / 21 %
  without (`work/local/_gravity-jmjr-webkit-2026-10-20.txt`, three rounds). The choir
  alone is as much as the rest of the song.
- `lead11` (choir Aah) sings 12–16 voices a bar there. Each voice is its own `renderIr`:
  its own glottal oscillator, its own 4-formant tract, flutter (3 sines or a shared
  source), jitter (a noise source through a lowpass), nasal places when reachable, and a
  second whole IR for the ending consonant.
- `chipRole` leaves JMJR-4 out of the 8-bit set on purpose, so 8-bit relief did not touch
  it; `reliefMix` now swaps it for the chip pad.

**Built 20 Oct 2026: QUALITY on the JMJR-4 card** (Peter's design: a sound choice, not a
device rule). HIGH = F1–F5 (today's sound, the default); MEDIUM drops F4 and F5; LOW sings on
F1 and F2 alone. Nodes per singer, counted on Gravity's choir presets (flutter excluded —
it is already ONE set per note-on, shared by every singer of a chord, not per singer as first
thought): `lead11` 19 → 14 → 10, `chords5` 17 → 13 → 9; biquads 5 → 3 → 2. The game uses it
through a song's light version (set LOW on the choir lanes there). Not yet heard: renders of
all three on a Gravity choir passage and a spoken line are the next step.

Measure first, in this order, each as a one-line switch so the A/B is honest:

1. **Voices per note-on.** How many `renderIr` calls a chord makes, and whether `unison`
   (several sources into ONE tract, already supported) is what the choir presets use. If a
   four-note chord is four tracts, the fix is in the preset, not the engine.
2. **Flutter and jitter on the phone tier.** MRDR-3 already drops unison to 1 on phones
   (`MRDR_QUALITY.PHONE`). The same tier for JMJR-4: shared flutter source per lane (the
   `flutterSource` option exists), jitter off, nasal places only when the preset is nasal.
3. **The ending IR.** A second full tract per note for the consonant. Measure what share
   of a choir note it is; if it matters, a shared ending tract per lane or a shorter one.
4. **Tract cost itself.** Seven biquads per voice at phone quality: can the two highest
   formants go when the preset is a sung vowel at speaker volume? Measure before deciding.
5. **A voice cap per lane,** bar-ahead: the sequencer knows the chord a bar early; a lane
   over N voices drops the inner ones. Last resort, audible, Peter's call.

Target: a choir note at the price of an MRDR-3 note, or JMJR-4 declared a desktop synth
and given a phone stand-in in every cabinet song (which is what `reliefMix` already does
under duress).

### 3.2 The Tone pool — CRLS-1, RMND-2 — Stage 2, inside the leak sweep

The census of Rhythm on the LAN URL (`work/local/_game-audio-webkit-http.mjs`, 100 s)
found **1,403 unwired `OscillatorNode`s and 428 `ConstantSourceNode`s still running**,
started by Tone's `Oscillator.start` and never ended — plus 57 constant sources still
WIRED. Unwired sources are not pulled, so they cost little audio time, but they are the
same shape as every leak so far, they hold memory on a device that kills the page when it
runs out (`ios-crash-trail.md`), and the wired 57 are not explained. Find who starts them
(the stack is in the census), whether Tone's `OneShotSource` ever disposes them under our
pool, and what `_retireNote` should do for a pooled note.

Also here: `Tone.Vibrato`'s LFO per slot runs forever (noted 1 Oct); the pool keeps a
`Signal` (a `ConstantSourceNode`) per parameter rendered every block — the standing cost
`synth-class-cpu-costs.md` measured at 2× a bare synth for a MonoSynth. The harness's
standing-cost number says whether a lane that has gone quiet should have its pool parked.

### 3.3 MRDR-3

The most-measured synth and the one with a phone tier already. Open questions the harness
answers: per-preset cost at PHONE (the 1 Oct "per-preset micro-bench" never happened);
whether the note cache is worth turning on in the game for dense cabinet lanes (it is
desk-only — `setNoteCache` comment); whether `_retireLayerNote` leaves anything after a
slide or a held note, which the retire skips by design.

### 3.4 KNDO-5

Fixed today (`_playGame` now retires `noteOuts`). Rhythm went from a 12 → 55 % climb to a
flat 16–17 %. The test in §2.5 exists so this one is never found again on the iPad. Still
to check: `lead10`'s `squareTone2`, and the 8-Bit sound set, which is mostly this synth.

### 3.5 TNGR-2, WNDR-9, drums, engine

Measured once each by the harness; no suspicion beyond standing cost. WNDR-9's partial
count on the phone tier is the one knob worth a measurement. Drums: the six-partial cymbals
and any hit that sums into one node — the retire exists, confirm the growth number is zero.

## 4. Standing costs — Stage 4, one day

What the graph costs with nothing playing. Chrome short-circuits most of it; WebKit may
not, and the iPad has not been asked.

- **The strip.** ~25 nodes a channel, 11 in the M/S width stage (bypassed at width 1
  since 2 Oct), sends, EQ, metering (off in the game). `audio-audit.js strip` builds every
  lane of Gravity's mix and plays nothing: that number, on the Mac and once on the iPad,
  is the floor every song pays.
- **Auxes** (reverb, delay returns): unhooked when nothing sends (`pruneAuxes`), confirm
  on the iPad that an unhooked convolver really is free.
- **Muted inserts**: parked as of today (`mixer.js parkMuted`). Confirm the parked
  count matches the muted count in every cabinet mix (Neon 8, Office 5, Speed 3).
- **Lane stages** (`_ensureMrdrLaneStage`, the chorus stage) left standing after a lane
  goes quiet.
- **Tone's `Signal`s**: a constant source per parameter per pool slot, counted by the
  census.

## 5. Effects — Stage 5, one day

73 effects in `effects.js`. The harness runs each on a plain phrase, active / muted /
bypassed / absent, and ranks them. Known questions:

- **Reverb.** One stereo convolution (`makeReverb`), Gravity at 4.5 s. Mac WebKit:
  ~3 % of the budget at 4.5 s, ~12 % at 1.5 s (the edge-search method,
  `dist/audio-stress.html` REVERB COST dry run). iPad (20 Oct, 21:05, `work/local/audio-stress.txt`): **~5 % at 4.5 s, ~3 % at
  1.5 s**, against ±2 % between the two bare readings. Small, but at Gravity's bar 20 it was
  the margin: reverb off moved the tip to bar 38. The same run overloaded the iPad for 3 s
  at a time, a dozen times, and it came straight back every time — no latch from a short
  overload. The LATCH TEST (21:26) held 140 % for 12 s: afterwards the same 30 % load that
  had run at 1.00 ran at 0.66–0.81 for 40 s, and only ZERO load brought it back (within a
  second). A suspend + resume inside a tap stopped the clock dead. A sustained overrun
  latches the iPad; prevention is the point of this audit. If so: shorter IR on
  tablets, or the reverb off on tablets and phones only.
- **mbCompN** (three compressors and two crossovers per instance, on most masters) and
  any effect with a `ScriptProcessor` fallback on the http URL.
- **Sleep.** Effects already sleep when silent (`watchForSilence`); confirm the sleeper's
  analyser is not itself a standing cost on WebKit.
- **Chorus2 / doubler / widener / autopanner** — the ones the light recipes drop. The
  harness says whether that was worth anything.

## 6. Device truth — every stage

Each stage's Mac table gets one confirmation on the iPad before anything is acted on:

- **`dist/audio-stress.html`** (served by the dev server): REVERB COST and LATCH TEST,
  results POSTed to `/__dev/crumbs` → `work/local/crash-trail.txt`. Add a page per
  question as they come up (a JMJR-4 note A/B, a strip-only load) — a stress page costs an
  hour and answers what no Mac number can.
- **Glitch log + trails.** `?soundtest=noreverb|chipvoices`, `?lightmix` (now named on the
  trail), the guard's `>> GUARD` lines. Every claim in `docs/audio/AUDIT.md` carries the
  trail timestamp that confirmed it.
- The Mac-to-iPad scale (1.9×) is re-read from each confirmation, not assumed.
- **https for the final word.** The http dev URL has no AudioWorklet, so TNGR-2 is silent
  and free there and the MRDR-3 farm is unavailable. A song is confirmed on the iPad over
  https (a Home Screen install of the dev build, or the published Pages site) before it is
  called done; http trails are for locating, not for signing off.

## 7. Order, effort, exit

| Stage | What | Effort | Done when |
| --- | --- | --- | --- |
| 1 | Harness + `tests/audio-leaks.js` | 1 day | every family has five numbers; the test is in `run-all` |
| 2 | Leak sweep, all families + drums | 1 day | growth ≤ 2 points and no wired leftovers for every family; the Tone pool's 1,400 explained |
| 3 | JMJR-4 | 2–3 days | a choir note ≤ an MRDR-3 note on the phone tier, or a phone stand-in in every cabinet song |
| 4 | Standing costs | 1 day | the strip's idle cost known on the iPad; anything over 1 % per lane parked when idle |
| 5 | Effects | 1 day | ranked table; reverb's iPad cost known; a tablet policy decided |
| 6 | Songs | ½ day each as they are finalised | every cabinet song's worst 4 s ≤ 55 % on the iPad |

Exit for the whole audit: Gravity and Rhythm play through on the iPad at full quality with
the guard never firing, and the nightly test fails if any synth starts leaking again.

## 8. Rules this audit runs by

- A cost claim names the engine, the device, the duration and the file the numbers are in.
- Whole-song or 150 s runs only; never a single pass or a bar range alone (a bar range is
  for locating a peak, not for pricing a synth).
- Interleaved A/B in one page with a bare control first; three rounds; medians.
- Mute is not silence: a muted lane is skipped only because `setSilentLaneSkip` is on; a
  muted insert costs nothing only because `parkMuted` is on. Both are game-only switches.
- Nothing is "fixed" until the growth number is flat AND an iPad trail agrees.
- Every fix lands behind a test or it is not a fix.

## 9. After the audit — the guard's one-second silence

Deferred by Peter, 20 Oct 2026, to the end of this plan: the audit and the light versions are
meant to keep any device from tipping, and this is the net for when they do not.

**Why.** The LATCH TEST (`work/local/audio-stress.txt`, 21:26): after 12 s over its limit the
iPad ran a 30 % load at 0.66–0.81 for 40 s; only ZERO load released it, within a second. So
nothing the guard does today works once the tip has happened — 8-bit, density, DEEP all
leave load — and the old suspend + resume kick stopped the clock dead even inside a tap.

**What.** A new step in `engine/audio-guard.js`, after the 8-bit relief at 0.95:

1. Clock under 0.9 → on the next beat every lane goes silent for ~1 s, and the notes already
   queued (up to the 1 s lookahead) and still ringing are dropped too — the engine's `panic()`
   cut, minus what it tears down for good: keep the mixer, the song position and the clock.
2. The song comes back on a bar line in 8-bit, or in its light version where it has one.
3. Still under 0.9 → once more, then 8-bit for the rest of the level.
4. Every step a `>> GUARD` line on the trail; the song is learned (`learnLight`).

**Cost.** About 1–1½ hours plus tests; one iPad run decides whether a second of near-silence
(the mixer and the picture still running) releases the latch, or whether it needs longer.
Until it exists, a device the benchmark misjudges crackles to the end of the level once, and
plays the song light from then on.

## 10. Status

- *20 Oct 2026:* KNDO-5 retire fixed and confirmed on the iPad (Rhythm 1 clean end to end);
  muted tracks skipped game-wide; muted inserts parked; guard DEEP step; light versions with
  the device benchmark (600 ms cut-off, assumed — the iPad's own reading still to come) and
  per-device learning; JMJR-4 QUALITY (HIGH / MEDIUM / LOW: 130 / 105 / 91 ms for 16 singers
  offline); `dist/audio-stress.html` (REVERB COST, LATCH TEST, OFFLINE BENCH).
- *21 Oct 2026 — Stage 1 done.* `tools/audio-audit.js` (synth / songs / effect / leaks;
  silent; `--counts`, `--copies`, `--src` for a before/after) and `tests/audio-leaks.js`
  (on demand, in the browser set). **The leak signal is a count, not a load:** what the
  browser still pulls at two silences, walked back from the speakers over every recorded
  connection. Proven on KNDO-5: the pre-fix engine (a copy of src with the old retire line,
  `work/local/_lab-kndo-before/`) leaves 1,642 → 5,866 nodes wired over 90 s, the fixed one
  106 → 106. The load numbers need a page-local baseline (the burner settles 22 s before the
  phrase) and read ±3 points; load growth alone did not show the KNDO-5 leak on the Mac at
  all, which is why it does not decide the verdict. All nine `leaks` presets pass.
- *Stage 2, first sweep (21 Oct):* `node tools/audio-audit.js songs --counts --seconds=40` —
  every lane sound of every game song as that song sets it (259; results
  `work/local/_audit-songs-counts-2026-10-21.txt`, `work/audit/2026-10-21/`).
  - **Wired leaks: 4 lanes, one cause, FIXED.** Crypt Shift's choir (four lanes of
    jmjrChoirAah with JITTER 0.6): 5,514 → 17,250 nodes wired over 40 s. The jitter noise was
    on the note's source list but drives only pitch, so it outlived its carriers unpulled,
    never ended, and the rack never unwired the note. Now a modulator (`dsp.js` `mods`).
  - **Never-ended sources: 74 lanes.** Unwired (no audio cost on the Mac) but each one held
    for the session — memory on a phone that the OS kills when it runs out.
    - JMJR-4 (7 lanes in 6 songs, ~2,800 per 40 s): flutter sines and the vibrato LFO were
      stopped 0.05–0.08 s AFTER their carriers, unpulled by then. FIXED: they stop 0.01 s
      before (`voices.js` `modOff`, `dsp.js` `MOD_EARLY`), after the release has reached 0.
    - **CRLS-1 and RMND-2, the Tone pool (67 lanes): FIXED 21 Oct.** Every note's
      ToneOscillatorNode: Tone books the native stop for now + its look-ahead, then disposes
      (disconnects) it on the next idle callback — before the stop arrives, so it never ends
      (tpTiny: 960 in 32 s of eight lanes). `engine/tone-retire.js` makes Tone's one-shot
      sources (oscillator and buffer) dispose on their own `ended` (10 s fallback), live
      contexts only. tpTiny now 763 → 763: what is left is the pool's own Signals, which
      live as long as the pool. `npm run test:all` note: `tests/note-duration.js` "swing of 50
      through the preset path" fails on the committed tree too — not this work.
  - `tests/audio-leaks.js` now also fails ANY family whose never-ended sources grow; all
    nine pass. A second sweep of all 259 lane sounds with every fix in:
    `work/local/_audit-songs-counts-2026-10-21-after.txt`.
