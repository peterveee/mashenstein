# Audio synth and effect audit — measurement plan

Written 20 Oct 2026, the evening the KNDO-5 leak was found. Peter: "it's disturbing we're
finding these inefficiencies after so long … we need a good plan to audit all our software
synths and potentially plugins to make sure they are as light as possible within reason."

**Revised 21 Oct 2026 after a review** (§A; the brief is
[AUDIO_SYNTH_AUDIT_SUPPLEMENT.md](AUDIO_SYNTH_AUDIT_SUPPLEMENT.md) — review questions, not
evidence). The objective is now wider than individual
synths: **performance, reliability and bounded memory across all sound and music generation
and playback** — synths, effects, the mixer, worklets, caches, the Banger generator, offline
rendering, calibration and export, and the transitions between them. Completed work and its
measurements stand; where the review found a conclusion broader than its evidence, the
conclusion is narrowed here rather than the work redone.

Every claim in this document carries one of four labels:

| Label | Meaning |
| --- | --- |
| **IMPLEMENTED** | the code exists in the tree (committed or not — §10 says which) |
| **MEASURED** | a number exists, with the engine, device, method and file it came from |
| **PROPOSED** | planned, not built |
| **UNVERIFIED** | believed, or true on the Mac only, or true in one run only — not yet shown |

Four kinds of evidence are kept apart and never stand in for each other: **performance**
(load, time, memory), **sample-level correctness** (null tests, diffs), **listening
acceptance** (Peter's ears, for the exact change he heard), and **device validation** (Peter's
iPad / iPhone, over https for the final word).

## A. The 21 Oct review — what was checked and what was found

Each concern was checked against the code as it stood on 21 Oct (commit 22b65a02 plus the
working tree). **Bold** items change what the plan does next.

### A.1 The harness (`tools/audio-audit.js`, `tests/audio-leaks.js`) — IMPLEMENTED, with gaps

| Concern | Verified state |
| --- | --- |
| AudioParam connections tracked? | **No.** `connect(dest)` records an edge only when `dest` is an AudioNode. A modulator wired into an AudioParam (LFO → frequency, jitter → pitch, sidechain → gain) is invisible to the "wired" census. The modulator leaks of 21 Oct were caught only by the separate never-ended-sources count, not by the wired walk. |
| Input/output indices and every `disconnect()` overload? | **No.** Edges are a Set of destinations per node, ignoring output/input indices. `disconnect(outputIndex)` is treated as disconnect-all; `disconnect(dest, out, in)` removes the whole edge even if other index pairs to the same destination remain; `disconnect(param)` is not handled. |
| Records only updated when the operation succeeds? | **No.** The edge map is updated before the real `connect`/`disconnect` runs; a call that throws (an invalid index, a node from another context) still changes the record. |
| Strong references contaminating memory? | **Yes.** The edge `Map` holds every connected node and its destinations strongly until disconnected; the open-sources `Set` holds every started source until `ended`; `--stacks` adds a string per source. The harness as written prevents collection — fine for counting graph leaks, **unusable for memory measurement**. |
| Long releases, tails, pools, small leaks? | Partly. Censuses are taken 5 s after silence: a release or tail longer than that counts as "left wired" at both censuses, which is flat and passes — correct for the verdict, but the absolute count is not "leftovers". Bounded pools pass correctly (flat). A leak under ~20 nodes per 40 s passes (threshold); a leak per **rare event** (seek, retrigger, song change, preset edit) is never exercised, because the phrase loops one shape. |
| Raw samples kept? | **No.** The per-subject JSON holds summaries; the burner's samples and the censuses' per-kind breakdowns beyond the top entries are discarded. A suspicious number cannot be re-examined. |
| Silent/unavailable synth passes as cheap? | **Yes, it can.** Nothing checks that the subject made sound. A worklet that failed to load, a TNGR-2 lane on an insecure page, or a preset that renders silence reads as zero cost and zero leaks. |
| Does the silent setup still exercise the real processing? | Believed yes, not proven: the gain-0 sink sits *after* the subject, and a gain node at 0 still pulls its inputs in both engines (the KNDO-5 proof and the burner's load readings both moved with the subject, so the work was being done). Nothing in the harness checks it per run — §2.2 item 4 adds the check. |
| Reproducibility metadata? | **None recorded** — no source revision, dirty-tree note, browser build, OS, sample rate, latency, seed, preset/mix settings, instrumentation mode or duration in the output. |

**What still stands:** the KNDO-5 before/after proof (§10, 21 Oct) measured node-graph leaks
the harness *can* see; the four Crypt choir lanes were a node-graph leak; the never-ended-source
counts are independent of the edge map and are valid. The Stage 2 verdict is narrowed in §10
to what was tested: each game song's lane sounds, on the standard phrase, counted at two
silences.

### A.2 Memory — UNVERIFIED throughout

- **No memory measurement exists.** Flat node counts show the audio *graph* is bounded on one
  phrase; they say nothing about AudioBuffers, PeriodicWaves, caches, retired racks, listeners,
  timers or retained song data.
- **Configured limits, not consumption:** the note cache's `NOTE_CACHE_BYTES` is 320 MiB and
  `NOTE_CACHE_PLAN_BYTES` 192 MiB (`voices.js`), with 4,096 entries. **Scope verified: desk
  only** — `Audio.setNoteCache` is called only from `tools/mixer-entry.js`; the game never
  turns it on. **The two budgets overlap, they do not add** (verified, `voices.js`
  `commitPreparedNotePlan` / `_trimNoteCache`): the 192 MiB is how much of the one cache the
  pre-planned renders may claim, using each candidate's *estimated* bytes; everything lives in
  the same `_noteCache`, trimmed to 320 MiB / 4,096 entries. Two things can exceed the cap
  briefly and are unmeasured: an entry evicted mid-render still allocates its buffer when the
  render completes (into an unreachable object, per the comment), and estimated bytes may
  differ from actual. Nobody has measured what the cache actually holds.
- **Caches found by reading the code, none measured:**
  - JMJR-4 `glottalWave` memo (`jmjr4/dsp.js`): a PeriodicWave per context per
    (press, tilt, rounded pitch, flow) — keyed by integer pitch and three-decimal press, which
    velocity and singer variants move; **no eviction for the life of the context**.
  - `Audio._revBufs` and `_howlBufs` (`audio.js`): set, never deleted — bounded only by
    however many distinct keys arise; **unverified whether that is small**.
  - MRDR-3 pulse/sync/phase tables per context (`voices.js` `pulseTables`, `syncTables`,
    `phaseWaves`); `tngr2/tables.js` `built`; `mrdr3/tables.js` `SYNC_PYRAMIDS`.
  - TNGR-2 table sets (`tngr2/controller.js`): **bounded**, LRU of `MAX_TABLE_SETS = 8`.
  - Reverb impulse responses: one per convolver, rebuilt on a decay change (a 4.5 s stereo
    IR at 48 kHz is ~1.7 MB).
  - Effects' `CRUSH_CURVES`, the drive-curve cache (`_driveCurves`): keyed by settings.

### A.3 Whole songs and sessions — not tested by the harness

Verified: `songs` plays **each lane's sound on the synthetic phrase**, with that song's own
settings — not the song. Arrangements, sections, automation, bar mutes, transitions, the
MusicDirector's cabinet handovers, the guard's mix changes and the light/8-bit filters are not
exercised. Existing related suites: `song-switch`, `song-change-fade`, `mobile-lifecycle`,
`frozen-switch`, `results-chip` — each checks behaviour, none checks that resources return to
a baseline. The work/local leak probes (`_jukebox-leak.mjs`, `_leak-webkit.mjs`,
`_banger-loop-leak.mjs`) were one-off and are not tests.

### A.4 Generation, preparation, rendering, export — not audited

A search of the Banger maker (`src/game/banger/make.js`, `lazy.js`) and the Lab WAV render
path found **no explicit cancellation or staleness token**. The desk's note-cache render queue
does count `stale` jobs (`voices.js`, `stats.stale`) — that is the one place with any
bookkeeping. Whether an abandoned generation or render can still install its result, keep
filling a cache, or hold buffers is **unverified**.

### A.5 Scheduling versus DSP overload

The glitch log separates them (C = audio clock; M = sequencer margin and late passes; F =
frames), but **the guard's relief raises the sequencer lookahead to 1 s** (`audio-guard.js`
`reliefLookahead`). Lookahead cures holes (a starved main thread), not crackle (an overloaded
audio thread) — and on an overloaded device it commits up to a second more notes that the
thread then has to render, which works against the one recovery the LATCH TEST showed works
(near-zero load). The plan stops treating lookahead as relief for DSP overload (§9, Stage S).

### A.6 Coverage

The standard phrase stays for comparisons; it does not cover maximum chords/unison, legato,
slides, rapid retriggers, automation, effect extremes, feedback tails, sleep/wake, cold caches,
music with SFX and speech, generated Banger songs, or worklet startup and failure. The
fallback paths (http dev URL: no AudioWorklet, TNGR-2 silent, gate and capture on
ScriptProcessor) are where most iPad trails were recorded and are untested by the harness.

### A.7 Conclusions that exceeded their evidence (now narrowed)

- *"Effects are not where the cost is"* — from one offline instance per effect at default
  settings on a four-saw chord. It does not cover real settings, real chains, feedback tails,
  wake-up, or the iPad. Narrowed in §5.
- *"Spectra identical (centroid 770 → 769 Hz)"* — a centroid and five band shares agreeing is
  not an identical spectrum, and not identical sound. Peter's listening approval of SHARED
  chords stands for the renders he heard (Gravity `lead11`, HIGH and LOW); it does not extend
  to other presets, speech, consonant syllables (Crypt's "daa") or the later MEDIUM default.
- *"About 1.9× this M3 Pro"* — an estimate from trails; the iPad's own stress page read 1.8×
  on native chains. Scaling is a planning aid, not device confirmation.
- *"Every sound of every game song now leaves nothing running"* — true of the phrase test
  (§A.3); not shown for songs, sessions or memory.
- *"Rhythm 1 plays clean on the iPad"* — one run with no glitch rows. It is evidence the
  climb is gone; it is not proof of bounded memory or reliable cleanup.

### A.8 Regression prevention — the scheduled run would fail

Verified: `.github/workflows/deploy-pages.yml` runs `npm run test:all` (browser suites
included) **only on the weekly schedule** (Sundays 03:00 UTC) and installs **Chromium only**
(`npx playwright install --with-deps chromium`). `tests/audio-leaks.js` launches **WebKit**,
which that runner does not have — so the next scheduled run fails at launch, and with it that
week's archive deploy. No other suite in the browser set launches Playwright WebKit. **First
action of the revised plan (Stage 0).** No nightly runner exists; "nightly" in the first
version of this plan described an intention, not a schedule.

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
3. **Nothing fails when a cost comes back** — and a test that is listed but never run is the
   same as no test (§A.8).

## 1. The target

Peter's iPad (A12Z, iPadOS, WebKit — the `Macintosh` user agent, the 2D renderer,
`SYNTH PHONE`) is the floor. Scale estimates (UNVERIFIED as device truth): ~1.8–1.9× this M3
Pro in WebKit (trails 2 Oct; the iPad's stress page 20 Oct: 560 native chains against ~1,000);
an iPhone 13 ~1.4×.

The budget is **one audio thread**. The game's own share of it, from the trails:

| What | Share of the iPad's audio thread | Evidence |
| --- | --- | --- |
| Gravity Grid song, typical | ~40 % (estimate) | Mac WebKit × scale |
| Gravity bar 18–21 (the choir) or bar 37–38 (lead4 32nds + choir) | tips it | iPad trails, 20 Oct |
| Rhythm Bankruptcy, before the KNDO-5 fix, by bar 39 | tips it | iPad trails |
| Rhythm after the fix | ~24 % flat (estimate) | Mac × scale; one clean iPad run |
| Game reverb, 4.5 s | ~5 % (±2) | iPad stress page, 20 Oct |
| Sound effects, hero overlay, density changes | not measurable against the song | Mac ablations |

**What "tips" means on this iPad** (MEASURED, iPad, no game: the LATCH TEST, 20 Oct 21:26).
Held 40 % over its limit for 12 s, the iPad then ran the *same* 30 % load that had run at 1.00
at 0.66–0.81 for 40 s; only **zero** load released it, within a second. A dozen 3-s overloads
did not latch. The Mac's WebKit never latches (`work/local/_latch-webkit.mjs`). Prevention is
worth far more than relief.

**Headroom goal.** No song's worst four seconds over **55 % of the iPad's thread**, measured
by the harness and confirmed once per song on the device — *plus* the short-window evidence
of Stage S (§S), because a tip starts in a second, not over four.

## 2. The harness — Stage 1 DONE (IMPLEMENTED 21 Oct), Stage 1b PROPOSED

### 2.1 What exists (IMPLEMENTED)

```
node tools/audio-audit.js synth <id|family:SYNTH> [--params=f.json]   one preset (or a song's copy)
node tools/audio-audit.js songs [songId] [--only=song:lane,…]        every lane sound of the game's songs
node tools/audio-audit.js effect <effectId>                           absent / active / muted on an MRDR-3 phrase
node tools/audio-audit.js strip <songId>                              a song's whole mix, no notes
node tools/audio-audit.js leaks                                       one preset per family, counts only
  --seconds=N --counts --copies=N (8) --src=<copy of src beside a tools symlink> --json --stacks
```

Headless WebKit, phone setup (latencyHint 0.05, no capture, metering off, MRDR-3 PHONE, muted
lanes skipped), https via a routed page so worklets run, **silent** (a gain-0 sink before the
speakers, which still renders). The phrase: two bars at 120 BPM, eighths over two octaves, a
held four-note chord, eighths again — 16 note-ons per 4 s — on **8 lanes at once** (one lane
is inside the burner's noise). Censuses at two silences (5 s after the lanes are muted),
the phrase played between them; the leak verdict is the wired count growing more than 20
nodes, and (in `tests/audio-leaks.js`) never-ended sources growing more than 20. Load comes
from an in-thread burner against the page's own baseline (22 s settle before the phrase), ±3
points.

`tests/audio-leaks.js` — nine presets (toneSquare, bestClassicMono, simpleSawtooth, fmKeys,
addDrawbar, jmjrChoirAah, tngrSoftStrings, kickEngine, crashEngine), 40 s each, about 9
minutes, in the browser set (`npm run test:all`). **Not yet run by any scheduler** (§A.8).

### 2.2 Stage 1b — harness correctness (PROPOSED, first priority after Stage 0)

1. **Edges with indices and parameters.** Record `(source, output) → (destination node or
   AudioParam, input)`; map each AudioParam to its owning node when the param is created
   (wrap the owner's getters) so the reachability walk follows modulation; implement every
   `disconnect()` overload exactly (none; output index; destination; destination + output;
   destination + output + input; AudioParam forms).
2. **Record only on success.** Call the real method first; update the record only if it
   returned without throwing.
3. **Two instrumentation modes.** *Graph mode* (today's strong records, for leak counting) and
   *memory mode* (WeakRef/FinalizationRegistry-based, no strong references, no stacks) — never
   measure memory in graph mode.
4. **Output check.** Every subject records the RMS and peak of its signal before the silent
   sink; a subject that made no sound is **UNAVAILABLE**, not cheap. Worklet load failures,
   page errors and silent output are reported as such.
5. **Raw data kept.** Burner samples, every census with its full per-kind breakdown, output
   levels and timings go into the subject's JSON.
6. **Metadata in every result:** `git rev-parse HEAD`, `git status --porcelain` for `src/`
   and `tools/`, browser name and build, OS, sample rate, `baseLatency`/`outputLatency`,
   MRDR-3 tier, phrase and seed, preset id and settings (or the song's voiceParams), mix
   settings, instrumentation mode, copies, durations, and the command line.
7. **Tail-aware censuses.** Take the second census after the longest release/tail the subject
   declares (preset release, effect tail estimate), and report "still wired" separately from
   "wired at the first census"; add a third census after a longer wait for long-tail subjects.
8. **Self-tests with deliberately broken fixtures** (`tests/audio-audit-selftest.js`), each of
   which the harness must FAIL, and a fixed twin it must PASS:
   - an orphaned modulation source (LFO into a stopped oscillator's frequency, stopped after
     its carrier) — the class found 21 Oct;
   - a note graph never unwired (the KNDO-5 shape — keep the existing before/after proof,
     `work/local/_lab-kndo-before/`, as the reference);
   - a retained AudioBuffer per note (memory mode);
   - incomplete cleanup on song replacement (a strip or pool left behind);
   - a slow leak: one node every 10 s (below today's 20-node threshold) — the threshold is
     redefined as a slope over a longer run;
   - a silent subject (worklet that never loads) — must read UNAVAILABLE.

Exit: every fixture fails and its twin passes, in graph and memory modes as relevant; the
existing nine `leaks` presets still pass; results carry the metadata.

## 3. The synths — what to look at in each

Eight families, 925 presets. Status per family (21 Oct):

| Family | Path | Presets | Leak status (phrase test) | Open |
| --- | --- | --- | --- | --- |
| JMJR-4 (formant) | `_playJmjr4` → `jmjr4/note.js` → `dsp.js renderIr` | 29 | FIXED 21 Oct: jitter left whole notes wired; flutter/vibrato never ended | speech and consonant chords with SHARED unheard; per-component cost (§3.1) |
| MRDR-3 native | `_playLayer`, cache `_playCachedLayer` | 166 | FIXED 21 Oct: vibrato, PWM, FM and pitch-LFO modulators now stop before carriers | per-preset cost at PHONE; slides and held notes (retire skips them by design) |
| CRLS-1 / RMND-2 (Tone pool) | `SYNTHS` classes, pools | 71 + 62 | FIXED 21 Oct: `engine/tone-retire.js` — Tone disposed each note's oscillator before its stop | the pool's standing Signals; pools only grow (§3.2) |
| KNDO-5 (chip) | `_playGame` | 10 | FIXED 20 Oct (notes unwired), 21 Oct (vibrato LFO) | — |
| TNGR-2 (wavetable worklet) | `_playTngr2Node` | 82 | passes on https | never measured on the iPad over https; silent and free on the http dev URL |
| WNDR-9 (additive) | `_playAdditive` | 12 | FIXED 21 Oct (vibrato LFO) | partial count on phones |
| Drums | `_playDrum` | 445 | passes (retire since 6 Oct) | — |
| Engine (legacy) | engine voice | 48 | not tested | which songs still reach it |

### 3.1 JMJR-4 — Stage 3 (mostly IMPLEMENTED; listening partly given)

MEASURED (Mac WebKit, 20–21 Oct):
- Gravity bars 18–21: 28 % median / 40 % worst with the choir, 17 % / 21 % without
  (`work/local/_gravity-jmjr-webkit-2026-10-20.txt`, three rounds).
- Nodes per singer (flutter excluded — it is one set per note-on, shared by a chord's
  singers): `lead11` HIGH/MEDIUM/LOW 19 / 14 / 10; biquads 5 / 3 / 2.
- Offline, 16 singers of `lead11`: HIGH 130 ms, MEDIUM 105, LOW 91.
- SHARED chords (one tract per chord): four overlapping four-note chords HIGH 170 → 72 ms,
  LOW 119 → 59; level equal (−28.7 dB); difference signal 15 dB under the sound.
- Against MRDR-3's Synth Choir Aah (= 1.0), whole-engine offline render at PHONE: chords
  1.08 (HIGH, separate) → 0.71 (SHARED) → 0.66 (SHARED + MEDIUM); a single line 0.90 (HIGH)
  → 0.80 (MEDIUM). Engine overhead is included, so the true ratios are a little lower.

IMPLEMENTED: QUALITY HIGH/MEDIUM/LOW and CHORDS SHARED/SEPARATE on the card; defaults MEDIUM
for singing, HIGH for SPEAK voices, and SHARED (Peter, 21 Oct).

LISTENING: Peter heard `lead11` HIGH/LOW × separate/shared ("pretty good") and MEDIUM on the
aah on the desk ("very close"). **Not heard:** MEDIUM on brighter presets, SHARED on Crypt's
consonant chords ("daa"), Neon `lead5`, Speed `lead12`; speech at any non-HIGH setting.

Still to measure (PROPOSED): what a singer costs at LOW that remains per singer (glottal source,
F1/F2, envelope gains) and whether any of it can be shared; the ending-consonant tract's share
on consonant presets; a voice cap per lane as a last resort (audible — Peter's call).

### 3.2 The Tone pool — CRLS-1, RMND-2

FIXED 21 Oct: each note's ToneOscillatorNode was disposed (disconnected) before its own
native stop arrived and never ended — 960 in 32 s of one RMND-2 preset on eight lanes; 67 game
lanes. `tone-retire.js` defers the dispose to `ended` (10 s fallback, live contexts only).
Remaining by design and UNMEASURED: each slot's Signals (ConstantSourceNodes) live as long as
the pool, and pools add slots to their busiest polyphony and never shrink. Proposed: retire
idle slots after a few seconds; measure standing cost before and after (Stage 4).

### 3.3 MRDR-3

Open: per-preset cost at PHONE; whether slides and held notes, which the retire skips, leave
anything; the desk note cache's real memory (§M).

## 4. Standing costs — Stage 4 (IN PROGRESS)

`audio-audit.js strip <song>`: a song's whole mix with every note removed, against the page's
own baseline. First run 21 Oct (`work/local/_audit-strip-2026-10-21.txt`, Mac WebKit,
preliminary, single run): title 3.2 %, rhythm 11.0 %; several songs failed to run (to fix
before reading anything into the table). Questions: the strip (~25 nodes a channel), auxes
when nothing sends (`pruneAuxes`), parked muted inserts (Neon 8, Office 5, Speed 3), lane
stages left standing, Tone Signals per slot. Exit: every song's standing cost known on the Mac
with three runs, the worst one confirmed on the iPad; anything over 1 % per lane parked when
idle.

## 5. Effects — Stage 5 (first pass MEASURED; conclusions narrowed)

MEASURED (offline WebKit, 21 Oct, one instance at default settings on a four-saw chord,
`work/local/_fx-offline-webkit-2026-10-21.txt`): reverb ~1 % of a Mac core per instance, pitch
0.8, mbCompN 0.6, shifter 0.6, msComp 0.55, most under 0.3 %. A song's inserts summed at those
defaults: Office 6.7 %, Gravity 6.0, Neon 5.9, Rhythm 4.7 of a Mac core.

What that does **not** show (UNVERIFIED): real settings (Gravity's 4.5 s reverb against the
default), real chains, feedback tails, the cost of waking from sleep, the sleeper's own
analyser, live versus offline processing, and the iPad. The iPad's own REVERB COST reading
(~5 % at 4.5 s, ±2) is the only device number. Narrowed conclusion: *no single effect at
default settings is a major cost offline on the Mac; whether effects matter in a real chain on
the iPad is open.*

PROPOSED: effects measured live in their real chains with the song's settings (the `effect`
subject with `--params`), the Noise Gate on its worklet path, extreme settings and feedback
tails, and one iPad stress-page reading for the most expensive chain.

## 6. Device truth — every stage

- **`dist/audio-stress.html`** (dev server): REVERB COST, LATCH TEST, OFFLINE BENCH; results
  appended to `work/local/audio-stress.txt` since 20 Oct 22:45.
- **Glitch log + trails**, with `?soundtest=…`, `?lightmix` / `?fullmix` and the guard's
  `>> GUARD` lines named on the trail.
- Scale (1.8–1.9×) is re-read from each confirmation, never assumed.
- **https for the final word**: the http dev URL has no AudioWorklet (TNGR-2 silent and free,
  no MRDR-3 farm, gate and capture on ScriptProcessor). http trails locate; https signs off.

## M. Memory audit — Stage M (PROPOSED, priority 2)

Goal: show that memory reaches a **bounded plateau after warm-up** in every workflow, and
falls back to an explained baseline after cleanup.

**Measure, in memory mode (§2.2.3):**
- Application-owned allocations, counted by the engine itself (exact): AudioBuffer bytes per
  owner (noise, reverb IRs, reverse and howl buffers, note cache), PeriodicWaves and tables
  per context, Maps/caches by entry count and bytes, voice pools and slots, racks created and
  disposed, contexts alive, worklet nodes and their message ports, pending render jobs,
  listeners and timers registered by the engine.
- Browser estimates (approximate, labelled as such): `performance.measureUserAgentSpecificMemory()`
  in Chromium (cross-origin isolated pages), JS heap via CDP; WebKit has no equivalent API —
  use process RSS from the host where available, never presented as exact.
- Peak during generation and rendering; retained after cleanup.
- Caches: bytes, entries, hits, misses, evictions, cancelled and stale jobs (the note cache
  already keeps `stale`; add the rest).

**Budgets (PROPOSED, to be set from the first measurements):** game on a phone — retained
audio memory after a level and back to the hub within 10 % of the hub's own warm baseline;
the desk — note cache at or under its configured 320 MiB with hit/eviction ratios reported;
every unbounded cache in §A.2 either bounded or justified with a measured ceiling.

**Exit:** for each workflow (§L) the plateau is reached within N repetitions and holds for N
more; every cache in §A.2 has a measured high-water mark; the `glottalWave` memo, `_revBufs`
and `_howlBufs` have a verified bound or an eviction.

## L. Whole-song and repeated-session lifecycle — Stage L (PROPOSED, priority 3)

Real songs with their arrangements, automation and transitions — not the phrase.

**Quick checks (every push, Chromium; minutes):** start/stop, seek, retry and song replacement
on two songs; one cabinet handover; light and 8-bit switches; a preset edit and an effect edit
during play — each ends with graph, live sources and engine-owned caches back to an explained
baseline, no duplicate playback, no stale queued notes, no stuck voices, one context.

**Soak (scheduled, WebKit; tens of minutes):** every cabinet song looped several times;
level → results → hub → jukebox → Mixer → level cycles; the attract demo across all cabinets;
backgrounding/foregrounding, lock-screen pause, and an audio interruption (emulated where the
browser allows); **stopping or replacing a song while its preparation is still pending**.
Report per cycle: graph size, live sources, memory (§M), contexts, worklet nodes.
Both endings are tested: normal completion, and the interrupted or error path (a worklet
that throws, a load that fails, a context that closes under the song).

**Exit:** no growth across cycles beyond warm-up, in quick checks and soaks, on the Mac;
one soak confirmed on the iPad over https.

## G. Generation, preparation, rendering and export — Stage G (PROPOSED)

Banger generation and arrangement resolution, the desk's note-cache preparation, offline
rendering (`tools/lib/render-bank-page.js`, the Lab WAV render), calibration, and recording
and export (`/__dev/record`). For each: elapsed time, main-thread stalls (long tasks), peak
memory, interference with live playback (the glitch log's M and C while it runs).

**Explicit cancellation test:** start expensive work, cancel or replace it, start different
work; verify the stale work cannot install its result, cannot keep filling a cache, and leaves
nothing behind. Where the platform cannot stop the computation (an `OfflineAudioContext`
render cannot be aborted once started), the test checks the *result is discarded* and the
next job is not blocked behind it — cancelling the work and discarding its result are
reported separately. **Verified gap:** no cancellation token found in the Banger maker or the Lab
render path (§A.4). Identify where bounded queues, backpressure or cancellation are needed.

**Exit:** each path has a measured cost and a passing cancel/replace test, or a recorded
decision that it does not need one.

## S. Scheduling versus audio-processing overload — Stage S (PROPOSED)

Separate the two in every report: scheduler lateness and lookahead remaining, late and dropped
notes, main-thread long tasks, worklet readiness and errors, and the audio clock.

- **Lookahead is not a cure for DSP overload.** It fixes holes, not crackle, and on an
  overloaded device adds committed work. The guard's 1 s relief lookahead (`audio-guard.js`)
  is to be re-examined in §9.
- **Short-window evidence** beside the worst four seconds: 250 ms windows around chord
  entries, effect wake-ups, preset changes, cache misses and song transitions.
- **Uncertainty stated with every number.** The burner estimates *headroom*, ±3 points on a
  quiet Mac; it is not a CPU percentage. Offline render times compare variants; they are not
  real-time costs. When a difference is within twice the noise, the A/B is repeated with
  fresh bare controls before anything is concluded.

**Exit:** every glitch class has a probe that tells it apart; the iPad trails are re-read
with it.

## W. Workload and capability coverage — Stage W (PROPOSED)

Keep the standard phrase for comparisons. Add: maximum supported chords and unison with
overlapping releases; legato, slides, sustain, rapid retriggers, automation; effect extremes,
feedback tails, sleep/wake cycles; cold and warm caches; music with SFX, speech and
transitions; reproducible generated Banger seeds and arrangements; the worklet paths **and**
the fallback paths (http dev URL); worklet startup, slow startup and failure. Every report
lists subjects as **tested / failed / unavailable / untested** — a silent or missing synth is
never counted as cheap. Sample rates and device configurations are covered by
representatives (44.1 and 48 kHz; desktop and PHONE tiers; https and http) on the subjects
most likely to differ — not as a full product of every case.

## Q. Sound checks for optimisations (PROPOSED)

Any change made for cost that can change the sound gets, before listening, an offline A/B
against the original that reports: invalid samples (NaN, ±Infinity, peaks over 0 dBFS),
unintended silence (a note or section under −60 dB that was not), truncated tails (the
release's energy at the original's end point), timing (onset shift per note, over 1 ms
flagged), and discontinuities (sample-to-sample steps beyond the original's largest). These
are sample-level correctness; they do not replace Peter's listening, and his approval covers
only what he heard.

## R. Regression prevention — Stage 0 and Stage R

**Stage 0 (immediate):** the scheduled workflow must install WebKit (`npx playwright install
--with-deps chromium webkit`) or `tests/audio-leaks.js` must be gated on WebKit being present
— otherwise the next Sunday run fails and blocks that week's archive deploy (§A.8). Decide
which; it is Peter's workflow.

**Stage R (PROPOSED):**
- **Quick cleanup/lifecycle checks** in `npm test` (Chromium-free where possible, seconds).
- **Nightly** representative browser tests (`audio-leaks`, the §L quick checks in WebKit, the
  harness self-tests) on a scheduled runner — a new schedule, since today's runs weekly.
- **Weekly** broader sweeps: all game lane sounds (`songs --counts`), generated Banger songs,
  standing costs.
- **Periodic device soaks** on the iPad and an iPhone over https, logged with the trail.
- **Reports kept** under `work/audit/<date>/` locally and as workflow artifacts (90 days);
  failures post to the ntfy topic already used for deploys, naming the subject, the census
  that grew, and the command to reproduce.
- **Deterministic and noisy checks kept apart:** resource counts (nodes, sources, contexts,
  cache entries) are deterministic and fail the run; load and timing thresholds are noisy and
  warn, failing only on a repeated breach. Skipped and unavailable coverage is listed in every
  report, never omitted.
- **Acceptance:** a failing check names what grew, by how much, and on which subject; a
  threshold change needs a recorded reason in this document.

## 7. Order, effort, exit

| Priority | Stage | What | Effort | Done when |
| --- | --- | --- | --- | --- |
| 0 | 0 | CI can run the WebKit test | ½ hour | the scheduled run passes or skips it deliberately |
| 1 | 1b | Harness correctness and self-tests | 1–2 days | §2.2 exit |
| 2 | M | Memory accounting | 2 days | §M exit |
| 3 | L | Whole songs and repeated sessions | 2 days | §L exit |
| 4 | 4 | Standing costs (running) | ½ day | §4 exit |
| 5 | S | Scheduling vs overload | 1 day | §S exit |
| 6 | G | Generation, preparation, rendering | 2 days | §G exit |
| 7 | W | Coverage | 1–2 days | every subject labelled tested/failed/unavailable/untested |
| 8 | 5 | Effects, live and in real chains | 1 day | §5 proposed items measured |
| 9 | 6 | Songs on the iPad over https | ½ day each | worst 4 s ≤ 55 % and no short-window tip |
| 10 | R | Regression operations | 1 day | §R in place |
| after | 9 | Guard recovery | ½ day + device | §9 acceptance |

DONE: Stage 1 (harness, IMPLEMENTED); Stage 2 (leak sweep on the phrase test, MEASURED);
Stage 3 (JMJR-4 switches, IMPLEMENTED and partly heard); Stage 5 first pass (MEASURED,
narrowed). The synth/effect sweeps continue alongside the new stages.

Exit for the whole audit: Gravity and Rhythm play through on the iPad, over https, at full
quality with the guard never firing; memory plateaus in every §L workflow; and a scheduled run
fails if any of it regresses.

## 8. Rules this audit runs by

- A cost claim names the engine, the device, the duration, the method and the file.
- Whole-song or long runs for pricing; a bar range locates a peak, it does not price a synth.
- Interleaved A/B in one page with a bare control first; three rounds; medians; the
  uncertainty stated.
- Mute is not silence: a muted lane is skipped only because `setSilentLaneSkip` is on; a
  muted insert costs nothing only because `parkMuted` is on. Both are game-only switches.
- A silent or unavailable subject is reported as such, never as cheap.
- Memory is never measured with instrumentation that retains what it measures.
- Nothing is "fixed" until the measurement is flat AND an iPad trail agrees; a listening
  approval covers exactly what was heard.
- Every fix lands behind a test, and the test runs on a schedule, or it is not a fix.
- A modulator (LFO, vibrato, FM, jitter, flutter) stops BEFORE its carrier (21 Oct rule —
  `MOD_EARLY` in voices.js and jmjr4/dsp.js); anything that waits on sources to end waits
  only on sources something still pulls.

## 9. After the audit — the guard's recovery (PROPOSED, kept last)

Deferred by Peter, 20 Oct 2026, to the end of this plan: the audit and the light versions are
meant to keep any device from tipping; this is the net for when they do not.

**Why.** The LATCH TEST: after 12 s over its limit the iPad ran a 30 % load at 0.66–0.81 for
40 s; only zero load released it, within a second. 8-bit, density and DEEP all leave load;
the suspend + resume kick stopped the clock dead even inside a tap.

**What (draft):** on a sustained tip, a one-second stop of the music on a beat — the queued
notes and ringing voices dropped too — then the song back on a bar line in 8-bit or its light
version; once more if needed, then light for the rest of the level; every step on the trail;
the song learned (`learnLight`).

**Acceptance (all required):**
1. **Queued notes are cancelled**, not only muted: nothing booked in the lookahead before the
   stop plays after it — verified by a note-on log.
2. **Processing load genuinely falls:** the audio thread's work during the stop is measured
   near zero (burner headroom on the Mac; the stress-page method on the iPad). Output silence
   alone does not prove the processing has stopped.
3. **Timing is preserved:** the song resumes on its own grid, at the bar the clock says, and
   the game's beat-locked events stay in step (rhythm stages especially).
4. **Resumption is correct:** the right mix (8-bit or light), no stuck voices, no doubled
   notes, effects and sends restored.
5. **No recovery loops:** at most two stops per level; a third tip leaves the song light and
   logs it; a recovery never fires while the previous one is still settling.
6. **The relief lookahead is reconsidered** (§S): during and after a recovery the lookahead is
   not raised.
7. **Device confirmation:** one iPad run that tips, recovers, and plays the rest of the level
   at 1.00.

## 10. Status

- *20 Oct 2026:* KNDO-5 retire fixed (IMPLEMENTED; Rhythm 1 one clean iPad run); muted tracks
  skipped game-wide; muted inserts parked; guard DEEP step; light versions with the device
  benchmark (600 ms cut-off, assumed — the iPad's own reading still to come) and per-device
  learning; JMJR-4 QUALITY; `dist/audio-stress.html` (REVERB COST, LATCH TEST, OFFLINE BENCH).
- *21 Oct — Stage 1 done (IMPLEMENTED).* `tools/audio-audit.js` and `tests/audio-leaks.js`.
  The leak signal is a count, not a load. Proven on KNDO-5: the pre-fix engine
  (`work/local/_lab-kndo-before/`) leaves 1,642 → 5,866 nodes wired over 90 s, the fixed one
  106 → 106. Load growth alone did not show the KNDO-5 leak on the Mac at all. Gaps found in
  review: §A.1.
- *21 Oct — Stage 2 (MEASURED, phrase test).* All 259 game lane sounds, each with its song's
  settings, on the standard phrase, counted at two silences
  (`work/local/_audit-songs-counts-2026-10-21.txt`, `…-after.txt`,
  `work/local/_audit-recheck-2026-10-21.txt`):
  - Wired: 4 lanes (Crypt's choir, JITTER 0.6) left whole notes wired — FIXED (jitter is a
    modulator, `dsp.js` `mods`).
  - Never-ended sources: 74 lanes, then 13 — JMJR-4 flutter and vibrato, the Tone pool's
    per-note oscillators, and MRDR-3 / WNDR-9 / KNDO-5 vibrato, PWM and FM — FIXED.
  - After the fixes, on this test: no lane grows either count. Not shown: whole songs,
    transitions, sessions, memory (§A.3, §M, §L).
  - `tests/note-duration.js` ("swing of 50 through the preset path") fails on the committed
    tree too — not this work. The null test fails on all five songs identically on HEAD:
    its baselines date from August and are stale (`npm run baseline` is Peter's call).
- *21 Oct — Stage 3 (IMPLEMENTED; listening partly given).* CHORDS SHARED/SEPARATE and the
  defaults (MEDIUM, HIGH for SPEAK, SHARED) — measurements in §3.1.
- *21 Oct — Stage 5 first pass (MEASURED, narrowed in §5).*
- *21 Oct — Stage 4 started:* `strip` built; first readings preliminary, some songs failed to
  run (§4).
- *21 Oct — Review* (§A): harness gaps (§A.1), no memory evidence (§A.2), songs and sessions
  untested (§A.3), no cancellation found in generation/render paths (§A.4), the relief
  lookahead (§A.5), coverage (§A.6), narrowed conclusions (§A.7), and the scheduled CI run
  that cannot launch WebKit (§A.8).
- *21 Oct — Stage 0 (IMPLEMENTED, unverified until a scheduled run):* the workflow installs
  `chromium webkit` (Peter's pick over skipping; adds ~10 min to the weekly run).
