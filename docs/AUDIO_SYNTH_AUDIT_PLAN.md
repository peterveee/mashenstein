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

## 2. The harness — Stage 1 DONE (IMPLEMENTED 21 Oct), Stage 1b DONE (IMPLEMENTED 21 Oct; §10)

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

### 2.2 Stage 1b — harness correctness (IMPLEMENTED 21 Oct — see §10 for what was built)

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
| CRLS-1 / RMND-7 (Tone pool) | `SYNTHS` classes, pools | 71 + 62 | FIXED 21 Oct: `engine/tone-retire.js` — Tone disposed each note's oscillator before its stop | the pool's standing Signals; pools only grow (§3.2) |
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

### 3.2 The Tone pool — CRLS-1, RMND-7

FIXED 21 Oct: each note's ToneOscillatorNode was disposed (disconnected) before its own
native stop arrived and never ended — 960 in 32 s of one RMND-7 preset on eight lanes; 67 game
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
- *21 Oct — Stage 1b (IMPLEMENTED):* `tools/audio-audit.js` records connections into
  AudioParams (followed to their owner), output/input indices and every `disconnect()`
  overload, only after the browser accepts the call; graph and `--memory` modes (memory:
  FinalizationRegistry counts of nodes, AudioBuffer bytes and PeriodicWaves, Chromium with a
  forced collection, nothing held); an output meter before the silent sink (no sound =
  UNAVAILABLE; non-finite samples counted); raw burner samples, levels and every census in
  the JSON; metadata (revision, dirty files, browser build, OS, CPU, sample rate, latencies,
  mode, phrase, command); a third census 10 s on when the second is bigger, and any confirmed
  growth is a leak (the 20-node threshold is gone). Self-test: `tests/audio-audit-selftest.js`
  with `tools/lib/audio-audit-fixtures.js` — 13 graph fixtures in WebKit, 2 memory fixtures in
  Chromium, plus the KNDO-5 before/after proof. **Found while building it:** WebKit may drop an
  AudioParam's JS wrapper and hand out a new one on the next read, so anything keyed weakly by
  an AudioParam loses it — the owner map had to be strong; every param edge read as unowned
  until it was. `strip` fixed: it emptied the arrangement (`sections`, `order`) along with the
  notes, which crashed 9 of 15 songs, and did not pass the arrangement; it now reports the
  nodes pulled before and after the song (the booted engine already has the standard lanes'
  strips, so surge and cardboard read 3 "song" nodes over ~345 already standing).
- *21 Oct — re-measured on the corrected harness (MEASURED, Mac WebKit, counts):*
  `tests/audio-leaks.js` passes (all nine flat, all sounded); the self-test passes (17 fixtures
  and the KNDO-5 proof, 746 → 2,026 wired before, 106 → 106 now); all 259 game lane sounds
  on the phrase: 259 ok, none silent, none with non-finite samples
  (`work/local/_audit-songs-1b-2026-10-21.txt`). Newly visible with param edges: an 8-lane
  CRLS-1 preset keeps 1,226 nodes pulled (Tone pool slots and their Signals), RMND-7 426,
  against 106–130 for the other families — flat, a standing cost (§3.2, §4).
- *21 Oct — Stage 4 standing costs (MEASURED, Mac WebKit, 3 runs, muted inserts NOT parked —
  re-run with parking pending; `work/local/_audit-strip-1b-2026-10-21.txt`).* Burner headroom
  used by each song's mix with no notes, over the booted engine (±3): neon ~20 %, office ~18,
  gravity ~16, rhythm ~15, speed ~13, frost ~12, crypt ~13, plumber ~12, megamix ~8, hub ~8,
  shop ~5–7, title ~4.5, surge/cardboard/finale ~2 (noise). Repeatable within ±2 except one
  shop and one speed run. **The standing mix is most of a song's cost** — Gravity's whole song
  measured ~17 % without its choir (§3.1) — so Stage 4 moves up: what in a strip, insert,
  send or aux costs when nothing plays, and what can sleep.
- *21 Oct — Stage L first check (IMPLEMENTED: `audio-audit.js song <id>`, stop and restart).*
  Every game song left sources running after each stop: 70–285 per stop (Gravity 219,
  Office 285, Rhythm 282). Causes and fixes (IMPLEMENTED, measured on Gravity and Title):
  1. Tone Signals (ToneConstantSource) inside every Tone effect and pool slot — Filter,
     StereoWidener, Tremolo, AutoPanner — disposed with their chain, so never pulled to their
     stop. `tone-retire.js` now covers ToneConstantSource and drains what is still running a
     second after dispose (`engine/drain.js`); it also stopped a second dispose (Tone disposes
     a Signal's source twice) from unplugging the waiting source.
  2. Rack notes still ringing at the stop (MRDR-3, JMJR-4, KNDO-5): the rack keeps its
     ringing notes and drains them after the song-change fade.
  Gravity 219 → 2 per stop, Title 69 → 12.
  3. The hand-written engine voices (`audio.js` `play`, 48 `engine` presets — the "Engine
     (legacy)" row of §3) never unwired a note during the song: engSquare +216 wired in 16 s;
     the title theme plays 21 of 22 lanes this way. Fixed (unwire on `ended`, live only);
     engSquare 106 → 106. The other 47 being checked.
- *22 Oct, overnight (MEASURED):*
  - **Standing costs with muted inserts parked, as the game runs** (3 runs, Mac WebKit,
    `work/local/_audit-strip-parked-2026-10-21.txt`): neon 19.2 %, office 17.2, rhythm 15.7,
    gravity 14.4, crypt 13.1, frost 12.9, speed 12.0, plumber 11.8, megamix 9.6, hub 8.0,
    shop 7.4, title 4.9; surge/cardboard/finale ~2–3 (noise). Parking moved little
    (gravity −1.8, speed −1.1, the rest within noise). The standing graph is mostly gains
    (383–832 per song), filters (62–142), running oscillators — effect LFOs — (21–117) and
    Tone Signals (up to 128). Ablation by part (effects / sends / EQ / all) queued.
  - **Memory, first pass** (Chromium, forced collection, `--memory`;
    `work/local/_audit-memory-*-2026-10-21.txt`): the nine presets flat in nodes, buffer
    bytes and sources; every game song stopped and restarted twice returns to the engine's
    own ~517 nodes and the same buffer bytes within 15 s (Rhythm, Gravity, Crypt, Megamix
    hold ~0.8 MB more buffers than the rest — their reverb IRs and noise, constant). Neon,
    Gravity and Office leave one source per restart in Chromium. **Bounded in Chromium; WebKit
    has no forced collection, so the iPad's memory is still UNVERIFIED** — the WebKit
    never-ended-source counts are the proxy there.
  - **Song stops after the fixes** (`work/local/_audit-song-restart-after-2026-10-21.txt`):
    sources left running per stop 70–285 → 1–12. The 9-preset leak test still passes.
    Browser suites on the changed engine: song-switch, song-change-fade, game-synth-effects,
    stereo-widener, crls-filter-env, tngr2-audio, jmjr4-lifetimes, sfx-routing,
    mix-automation pass; `tests/voices.js` fails 7 preset-data checks (placeholder peaks on
    blastThunder/NoiseCrash/Bolt/Gated and seedUkGarageSnare; kit_pocket_pixel_clap taps)
    identically on the committed engine — not this work. The hand-written notes still
    ringing at a stop are now drained too (`_cutLaneGates`); re-check queued.
- *22 Oct — song stops, third pass (MEASURED, `work/local/_audit-song-restart-after3-2026-10-22.txt`):*
  with the hand-written notes drained at the gate cut (`audio.js _cutLaneGates`) and the
  Tone pools' own vibrato LFOs and filter envelopes drained at disposal (`voices.js
  _disposePool`): 11 of 15 songs leave nothing per stop; Shop, Neon, Gravity and Office one
  source each (Tone's Transport clock signals and a bar-effect keep-alive) and two wired
  nodes on Neon/Gravity/Office. From 70–285 per stop on 21 Oct. Leak test and six browser
  suites pass.
- *22 Oct — what the standing cost is (MEASURED, Mac WebKit, 3 runs each, ±3;
  `work/local/_audit-strip-ablation-2026-10-22.txt`).* Each song's no-note mix, then with
  parts of the mix taken out:

  | song | full | − effects | − sends | − EQ | − all four (incl. master FX) |
  | --- | --- | --- | --- | --- | --- |
  | neon | 19.7 % | 14.4 | 16.9 | 19.7 | 10.5 |
  | office | 17.7 | 11.6 | 16.0 | 18.7 | 8.5 |
  | gravity | 16.9 | 13.1 | 11.2 | 14.2 | 8.0 |
  | rhythm | 17.2 | 13.1 | 15.4 | 18.5 | 8.8 |

  Lane effects are the largest single part (−4 to −6 points), sends next (Gravity's reverb
  send −6), EQ nothing measurable. **Half the standing cost remains with all of those gone**
  — 850–975 nodes still pulled: ~33 lanes' bare strips (≈13 gains each), and the bank's
  Spot FX sections, which are built for the whole song when it starts
  (`prepareBarEffects`: Tone Filters, their Signals and LFO oscillators, running from bar 1
  whether or not their bars have come). Spot FX share queued. The effects' sleeper does not
  show in these numbers (the first 10 s and the rest read the same). Candidates (PROPOSED —
  Peter's call, they change when things are built): build Spot FX a few bars before their
  section and take them down after; let a lane's strip sleep when it has not played for some
  bars and its tail is done; find why the effect sleeper saves nothing here.
- *22 Oct — the effect sleeper never slept (FOUND, FIXED, MEASURED on no-note mixes).*
  `mixer.js makeChainSlot` put a chain to sleep by unplugging the sleeper analyser's output.
  An AnalyserNode with input but no output is an automatic pull node in WebKit and Chromium,
  so the chain behind it was rendered every quantum anyway. Asleep now unplugs it at both
  ends (the sequencer already wakes a chain before its notes). The harness census missed
  the same thing and now counts output-less analysers as pulled. Standing cost, the same
  no-note mixes, before → after (3 runs, `work/local/_audit-strip-sleeper-2026-10-22.txt`):
  Gravity 16.5 → 4.9 %, Neon 19.2 → 15.0, Office 17.9 → 12.6, Rhythm 15.7 → 11.2; nodes
  pulled Gravity 1,919 → 937. With no notes every chain sleeps, so this is the ceiling of
  the saving; what it gives a playing song is being measured. Seven effect/mix browser
  suites and the leak test pass. **Listening needed:** a chain that was asleep when a
  note arrives without a wake is now silent rather than late — the same as before in
  principle (the output was unplugged), but its internal state is frozen while asleep.
  **Whole songs playing** (90 s each, 3 runs, medians, `work/local/_audit-song-load-sleeper-2026-10-22.txt`):
  Gravity 24.3 → 18.3 %, Neon 21.3 → 15.1, Office 26.1 → 23.6, Rhythm 19.3 → 16.3 of the
  Mac's WebKit headroom; output RMS unchanged within 2 % on all four (a coarse check that
  nothing went missing, not a listening test). At ~1.8× that is roughly 11 points of the
  iPad's thread back on Gravity and Neon (an estimate until the iPad says so).
  Spot FX sections, by contrast, are not a measurable standing cost (removing them moved
  nothing beyond noise, `work/local/_audit-strip-spotfx-2026-10-22.txt`).
- *22 Oct — idle strips sleep (IMPLEMENTED; Peter: "worth the saving to sleep inactive
  channel strips").* `mixer.js makeStrip`: a strip silent for 2 s past its last wake is
  unplugged from the mix, its linked sends and its own probe analyser; `wakeEffects` (called
  before every note and frozen bar) plugs it back first. One switch, `setDeepSleep`, covers
  this and the effect chains' input unplug, and the game turns it on **on WebKit only**
  (`deepSleepSuits`, main.js): Chromium loses a Spot FX switch that falls due while a chain
  is idle and unplugged, keep-alive or not; WebKit lands it
  (`work/local/_param-switch-sleep-probe.mjs`). The desk (metered strips) never sleeps.
  `tests/strip-sleep.js` (WebKit, live): a never-played lane is asleep within 4 s; a lane
  with one note every 4 s sleeps between notes and every note is heard at the level it has
  with sleep off. Risk to listen for: any path that plays into a lane without going
  through the sequencer's wake (Lab live play, held keys) — none found in the game's note
  paths, but not proven. Checks with strip sleep on: song stops unchanged; leak test passes;
  game-synth-effects, fx-sections, stereo-widener, mix-automation, chain-reapply,
  song-switch, song-change-fade, sidechain-duck, bar-gain, bar-pan pass; `tests/group-buses.js`
  fails one check ("and nowhere else", Spot FX on a group) identically on the committed
  engine — not this work.
  **Whole songs playing, engine before 21 Oct → now (chains + strips sleeping)** — 90 s,
  3 runs, medians, Mac WebKit, machine NOT quiet (VS Code busy; spreads 1–6 points;
  `work/local/_audit-song-load-stripsleep-2026-10-22.txt`): Gravity 22.6 → 18.1 %, Neon
  19.3 → 13.0, Rhythm 19.5 → 14.0, Office 24.7 → 25.2 (no gain shown). Against the
  chains-only result the night before, strip sleep adds about 0–2.5 points while a song
  plays — most lanes play often enough that their strips rarely reach two silent seconds.
  Its larger saving is where lanes sit out: intros, breakdowns, menus, and the no-note
  standing measure. Office re-run, 5 interleaved pairs (machine moderately busy,
  `work/local/_audit-office-load-2026-10-22.txt`): 24.7 → 23.4 % median, every pair lower
  (−0.2 to −5.4, median −1.3) — a small gain: Office's lanes and effects are busy almost
  throughout, so little gets the chance to sleep.
- *22 Oct — Tone pool idle slots (MEASURED, then IMPLEMENTED at Peter's ask).*
  `work/local/_probe-pool-slots.mjs`, 2 min of each song in WebKit: Rhythm builds 21 slots
  against ~15 needed in any 10 s window, Office 19 against ~16 (~28 nodes a slot). Built
  anyway (Peter: "Can we do trim"): `voices.js setTrimIdleSlots` (the game, all browsers;
  never the desk or offline). A pool remembers the most slots its notes asked for over the
  last 8 s (one, once the lane goes quiet); the round robin runs over that many, so the rest
  fall idle, and a 2 s sweep disposes from the end any slot with no finger, no gate, no note
  or tail to come and no mono group or slide holding it. `tests/pool-trim.js` (WebKit,
  live): a chord builds the pool to five, single notes after it bring it back to two within
  ~10 s and sound the same as untrimmed, the chord's return rebuilds five and is heard (0.26
  against 0.29 untrimmed — a rebuilt slot's first chord a little quieter; listen for it).
  Expected gain small (~1–2 points on Rhythm); measured in the quiet run. **To listen for:**
  with the round robin over only the slots the last 8 s needed, a new note can land on a slot
  whose last note is still releasing and cut its tail — thinner sustained keys or pads where
  a pool had grown wider than the passage needs. Pools rebuild slots only at Crypt bar 7
  (chords) and Office bar 27 (chords, chords3) (`work/local/_pool-rebuild-bars.mjs`). If it
  is heard: round over every slot that exists and trim only those silent past their tail. A busy CRLS-1 lane
  keeps its slots busy, so this does not make CRLS-1 cheap on dense lanes.
- *22 Oct — Stage S begun (IMPLEMENTED: the guard's levers by cause, the worst quarter, the
  probe).*
  - `audio-guard.js`: relief (crackle) no longer raises the lookahead; a separate AHEAD
    lever raises it to 1 s after 2 s of HOLES (margin under zero or late passes), and puts
    it back when the level is left. main.js passes the sequencer's health into the guard.
    `tests/audio-guard.js` covers both.
  - The glitch log adds **Q**, the worst 250 ms of the audio clock inside each second, read
    off `getOutputTimestamp` (falls back to currentTime); a second whose average is fine but
    one quarter is under 0.8 is logged as **DIP**.
  - `tools/audio-glitch-probe.js` makes each kind of trouble on purpose in headless WebKit
    and classifies the seconds with the glitch log's own thresholds. First run (Mac, not
    quiet, 12 s per mode, Gravity): clean — nothing (Q lowest 0.989: getOutputTimestamp is
    quiet enough for a 0.8 threshold on the Mac); a burner over the thread's budget —
    CRACKLE every second, no HOLES (C 0.68); main thread busy 400 ms a second — HOLES every
    second, no CRACKLE (M −98 ms); both — CRACKLE, holes 10 % (an overloaded audio clock
    runs slow, so the queue stays ahead of it). The classes come apart as named.
  - The 20 Oct phone trail (`work/local/crash-trail.txt`, iPhone): its sessions are almost
    all FRAMES; audio rows are a handful of boot-time CRACKLE (context starting) and two
    HOLES with a 53–63 ms frame — nothing for the lookahead change to have helped or hurt.
  - Queued for a quiet machine (`work/local/_stage-s-quiet-2026-10-22.sh`, starts itself when
    the load has been low for five minutes): the probe at lookahead 0.25 and 1 on Gravity
    and Rhythm; whole-song load at lookahead 0.25 vs 1 (does queueing further ahead cost the
    audio thread?); and the sleep fixes' before/after again, quiet.
  - **Results (22 Oct 10:29–12:21; `work/local/_stage-s-*-2026-10-22.txt`):** the probe
    separates the classes on Gravity and Rhythm at both lookaheads — a DSP overload is
    CRACKLE every second and never HOLES; a starved main thread is HOLES every second at
    0.25 s and **none at 1 s** (lookahead cures holes), never CRACKLE; the overload reads the
    same at 0.25 s and 1 s (C 0.67 / 0.66 — lookahead does nothing for crackle). Clean Q never
    went under 0.985, so the 0.8 DIP threshold has no false alarms here. **Lookahead's own
    cost:** whole songs at 0.25 s vs 1 s, 3 runs — Gravity 24.7 vs 26.5 %, Rhythm 21.7 vs
    21.7: under 2 points, inside the noise; it is not a load lever either way. The quiet
    before/after re-run was not quiet (Office "after" 34–57 %, "before" Gravity 35–64 %:
    the machine was in use) and is discarded.
  - Trim checks: leak test passes, song stops unchanged, six suites pass; `held-keys` throws
    in MRDR-3 AW (`mrdr3NoteOn`, an undefined lane port) and `voices` fails its 7 preset-data
    checks — both identically on the engine from before 21 Oct, not this work.
- *22 Oct — Stage G (generation, preparation, rendering): mapped, measured, races fixed.*
  Every path outside steady playback was mapped (Lab, club, cues, warm-ups, bench, swaps,
  MusicDirector, calibration, desk). Findings:
  - **The Lab's own generation is cheap and cannot install a stale song.** `makeBanger`
    takes median 6 ms, p90 9, max 29 (cold) on the Mac across 72 songs in 24 styles
    (`work/local/_banger-make-cost.mjs`; an iPad perhaps 2–3× that), synchronously, behind
    the CHARGING frame; every install (BRING TO LIFE, BOLT, kept songs, club swaps) is
    frame-scoped inside the state that asked, so leaving the state stops it. Not a problem.
  - **FIXED — TNGR-2 lane builds orphaned worklet nodes.** `tngr2Lane` awaited the DSP and
    then built a node without looking again: two builds of one lane (the Lab warms on every
    style or mood change, the club on every DICE, the scheduler on its first note) made two
    nodes and orphaned one; a build caught by a song change put its node into the released
    state, where nothing would stop it. `tests/worklet-lane-races.js` (WebKit, https): the
    committed controller made 2 nodes for one lane, and 6 builds under song changes left 7
    live nodes the controller did not own — each with its own copy of the tables. Now 1
    and 0. MRDR-3 AW's race loser is stopped and unhooked rather than dropped, and a build
    caught by a context release is abandoned (only reachable under `?mrdrbackend`).
  - **FIXED — queued worklet notes flushed into a disposed rack** (`voices.js`): the old
    song's queued TNGR-2 / MRDR-3 AW notes no longer play after the song has stopped.
  - **FIXED — treatment teardown timers cleared other people's treatments.** MusicDirector's
    exit (`music-director.js`) and a club's 4-BIT off (`club-voices.js`) each cleared the
    treatment leg seconds later without checking it was still theirs: the results screen's
    8-bit crusher, or the next club's 4-BIT, put on in that window, came off. Each now clears
    only the treatment it faded.
  - **FIXED — `retuneOnTheBeat` (results-chip.js):** overlapping retunes raced, and one that
    waited put back the mix it captured over a club swap made meanwhile; only the latest now
    lands, with the mix the song has when it does.
  - **FIXED — the Lab's module load** (`main.js openLabWhenLoaded`): a slow bangerLab.js
    pulled the player into the Lab from wherever they had gone since; it now opens only if
    they are still on the screen that asked, and a failed load goes on the trail.
  - **FIXED — failed cue renders stayed silent for the session** (`audio.js` reversed voice
    cues, coyote howl): a rejected render is now forgotten and retried.
  - **Noted, not changed:** the coyote howl is cached per tempo, so a tempo change in Speed
    Zone renders a new one mid-run (a quiet howl that once, then cached); the device bench
    renders four offline contexts 1.5 s after a first launch, whatever screen is up (first
    launch only); a cold TNGR-2 table set expands synchronously on a Lab style change (up
    to ~230 ms by the code's own comment); session caches with no LRU (kept Lab songs,
    TNGR-2 families, cue buffers) are bounded by what a session can ask for.
  - Not in the game, so out of scope here: the desk's note cache (well guarded: generation
    and revision checked at dequeue and keep) and the dev LAB WAV RENDER (no abort passed).
- *22 Oct — Stages W and Q begun (IMPLEMENTED: the tools; results below as they land).*
  - **W, coverage switches** in `tools/audio-audit.js`: `--phrase=dense|retrigger|held`
    (eight-note chords with overlapping releases; a note on every step; four-bar holds),
    `--quality=full|performance` (MRDR-3's desktop tiers), `--insecure` (an http page with
    no AudioWorklet, the LAN dev URL), `--fail-worklets` (every engine worklet module fails to
    load), `--sfx` (the game's cues fired over a song, three a second), `effect <id>
    --extreme` (every ranged parameter at its maximum), and `banger <style|all>` (generated
    Lab songs, stopped and restarted twice). First tries: a generated trance song clean; Neon
    with every worklet failing plays its other lanes, no errors; a TNGR-2 preset on an http
    page reads UNAVAILABLE, not cheap; the delay at its extremes leaves nothing.
  - **Found while adding them — the harness's counts and deep sleep.** Since the strips learnt
    to sleep, a census taken in a silence finds them unplugged: anything a note left wired
    on a lane reads as gone, and is pulled again when the lane wakes. Counts now run with
    every strip awake (`--deep` to override); load still runs as the game does. Counts taken
    with deep sleep on (22 Oct morning to afternoon: song stops after strip sleep, the trim
    and Stage G checks) are re-run.
  - **Q, `tools/audio-sound-check.js`:** the same song played live twice in WebKit — once on
    an engine copy from before (`--before=<src dir>`), once on this tree (`--deep` for the
    game's sleep and trim) — recorded by a worklet before the silent sink, compared on aligned
    50 ms envelopes: invalid samples, dropouts (after 6 dB under before while before is
    above −50 dBFS), bursts, clicks (steps over twice the before's largest), and timing drift
    per 2 s block. Proven on itself: Gravity with its lead muted in the after run reads LOOK,
    50 dropout windows from 12 s, where the theremin comes in; Gravity before vs now (sleep +
    trim) reads ok — no invalid samples, no dropouts, no bursts, no clicks, 50 ms drift. A
    clean report is evidence, not a listening approval.
- *22 Oct, evening — first notes lost after a song change (FOUND by Peter on the iPad, FIXED).*
  Neon → Crypt → Neon in the jukebox (and into levels) lost each song's opening — Crypt's
  theremin, Neon's arpeggio — in 8-bit too, so a channel's, not a synth's. Reproduced on
  the Mac (`work/local/_probe-first-notes.mjs`, the jukebox's own sequence, game settings):
  only with deep sleep on, and not with strip sleep alone — the insert chain. A chain that
  slept through the last song is unplugged at both ends; the next song's mix rebuilt it and
  marked it awake, but only `wake` put the sleeper's input back, so the new chain played
  into nothing until its next sleep and wake. `rewire` now restores the input whenever it
  wires a chain awake. `tests/chain-sleep-rebuild.js` fails without the line and passes with
  it. Also from this iPad session: the guard's 8-bit in the jukebox stuck for every song
  after Neon, and SETTINGS showed ORIGINAL and could not be switched back — now relief
  outside a level lasts one song, SETTINGS shows **8-BIT (AUTO)**, and any soundtrack
  choice by the player takes the guard's 8-bit off (it goes again if the device needs it);
  jukebox songs build their pools and worklet lanes when chosen, as levels do.
- *22 Oct — §9, the guard's STOP (IMPLEMENTED behind `?guardstop`; Mac test pending, iPad
  untested).* `Audio.hushMusic(seconds)`: the transport runs on and books nothing (the
  rearrangement mute's path in scheduleStep), what was booked plays out (lookahead + 0.2 s),
  the music path comes off the master through a unity `_hushGain` — nothing pulls the song's
  graph, so nothing renders it — and goes back on at the first bar line after, faded in over
  30 ms; a song change ends it. The guard's STOP lever takes the KICK's place (clock under
  0.6 for 3 s with relief on), twice a level at most, never within 6 s of the last
  (`tests/audio-guard.js`). Acceptance (§9) to check: queued notes cancelled, load near zero
  (unplugged — the Mac test counts the graph), timing kept (the transport never stops),
  correct resumption, no loops (two a level), lookahead never raised; `tests/music-hush.js`
  covers the first four on the Mac. **Device:** an iPad run that tips and recovers.
- *22 Oct, evening — STOP and DEEP on by default (IMPLEMENTED; Mac test passes; iPad
  pending).* Peter's `?guardstop` run of the canary's load song: relief at 35 s (C 0.87),
  STOP at 45 s (0.38) and 51 s (0.30), and the clock never moved (0.38–0.45 through the first
  hush). Two faults, both now fixed: (1) the hush gain hung off `musicGain`, which with the
  mixer feeds the song's master chain — so it hushed nothing, and after the first hush a
  second, unmastered copy of the music ran beside the first; it now sits between `songOut`
  and the master (`tests/music-hush.js` failed on "silent through it" before, passes now);
  (2) each strip's sleep probe pulls the strip whatever it feeds, so the hush now also puts
  every strip to sleep at once (`mixer.sleepStripsNow`, deep sleep only; the next note wakes
  each). Peter: "turn on stop and deep" — STOP is wired always (`?noguardstop` leaves it
  out), and DEEP fires outside a level too (jukebox, Lab): a song with no 8-bit version gets
  nothing from relief, and DEEP is the lever that takes lanes away.
- *22 Oct, evening — a Spot FX branch pinned the voices (IMPLEMENTED; Mac tests pass; iPad
  pending).* The next iPad run with both on: DEEP at 39 s, STOPs at 43 s and 50 s, and the
  clock still 0.30 — until bar 19, where the load song's Spot FX sections end; after the loop
  it tipped again and held there. A selected Spot FX branch is pinned awake for its whole
  section, and its sleeper analyser pulls the lane's voices whatever the strip feeds — so 32
  lanes of reverb + chorus (+ phaser) rendered muted, asleep or hushed. Now a sleeping strip
  takes its branches and insert chain with it (`makeSectionSwitch.sleep/wake`,
  `slot.sleepNow`), and a section selected while the strip sleeps waits for its wake
  (`tests/strip-sleep.js`: the branch sleeps with the strip, and the notes after a sleep
  come through it at full level).
- *22 Oct, late — STOP/DEEP re-examined (MEASURED on the Mac's WebKit; IMPLEMENTED; iPad
  pending).* Four iPad runs of the load song, read together: (1) the second after each STOP
  read C 2.2–4.8 — WebKit renders every second it fell behind on, at once, when the load drops,
  and each burst matched the debt Σ(1 − C) built before it (≈3.4 s → C 3.37, ≈4.8 s → C 4.78);
  after a 3.3 s burst everything played late, after a 4.8 s one nothing played until a reload.
  `getOutputTimestamp` cannot see that delay (L read 0 throughout). (2) DEEP did nothing to the
  load song: `work/local/_probe-guard-levers.mjs` (live, WebKit, the game's settings, per second:
  burn load, sources started, worklet posts, strips asleep, lanes silent, Spot FX branches awake)
  showed DEEP muting 1 lane of 32 — `deepReliefMix` walked the song bank's lanes, and a mix's
  LAYERS are not in it (ten game songs have layers). Fixed: layers muted too. With that, DEEP
  silences all 32 within a second, every strip and branch sleeps, and the clock holds 1.00.
  (3) STOP fired a second after DEEP every time — its count ran through relief — so DEEP never
  showed, and the STOP's own release of the debt was the burst. Now: DEEP also goes on the DEBT
  (`GUARD.deepDebt` 0.6 s behind, seconds under 0.97 adding, catch-up seconds paying off, five
  healthy seconds clearing it), and STOP only after DEEP has been on `stopAfterDeep` (5) s. The
  real guard against the load song on the Mac: relief at 0.77, DEEP two seconds later at 0.9 s
  behind, a 1.16 catch-up, then 1.00 to the end. Glitch log: CATCHUP marks a second at 1.5+.
  Open: repairing the output after a big burst — `rebuildRealtimeContext` makes a new context,
  but it starts suspended (WebKit, even headless) until a gesture; not wired.
- *22 Oct, night — the guard is RELIEF → RESTART (IMPLEMENTED; Mac tests pass; iPad pending).*
  Two more iPad runs with STOP and DEEP on: a DEEP at 0.90 did release the thread (the clock held
  0.98 for 5 s), the lift walked the lanes back into the heaviest bars and latched it at 0.40 in
  two seconds, where a second DEEP did nothing; then STOP → C 5.60 CATCHUP → silence for good
  (the song path rendered — O 9e-2 — and nothing was heard: WebKit's output side, not our
  graph). Peter: "I just want silence once the sound starts to sound bad… and then for audio to
  restart after; if a click is required, then perhaps pause things and tell user to click a
  button"; "the 8-bit switch seems to be reliable enough". So: `engine/audio-guard.js` is
  rewritten — RELIEF (8-bit, unchanged) → RESTART when still under 0.9 for 3 s, a second under
  0.7, or 1 s of DEBT; 8 s settle; from the second restart in a level the lanes stay muted
  (`hooks.deep`). DEEP and STOP are no longer levers (the engine keeps `hushMusic` and
  `sleepStripsNow`; `tests/music-hush.js` still passes). `main.js audioRestart` →
  `Audio.rebuildRealtimeContext()` (the context closed, backlog and all; the song where its
  clock was); if the new context is not running within 1.5 s the game freezes under a TAP TO
  CONTINUE prompt and the tap's own `ensure()` resumes it; three taps without sound and it goes
  on silent rather than hold the player. `?audiorestart=N` (dev) forces one after N s.
  **Found on the way:** `rebuildRealtimeContext` raced `close()` against 500 ms and built the
  new context regardless — and in WebKit a context made while an old one still holds its place
  never starts (two run at once in headless WebKit without a gesture;
  `work/local/_probe-ctx-variants.mjs`); it now awaits suspend, then close. One restart mid-song
  works end to end in headless WebKit (`tests/audio-restart.js`: closed, running, mixer ready,
  heard, step kept, SFX); a SECOND restart in the same page leaves the third context suspended
  there — the tap path's case. In the real game in headless WebKit (`?audiorestart=3,7`,
  `work/local/_smoke3.mjs`): the first restart gives a new running context with no prompt; the
  second leaves it suspended, the game freezes under the prompt, and the first tap brings it to
  running and the game on (screenshots `work/local/_smoke-tap-prompt.png`, `_smoke-after-taps.png`).
  **Device:** the load song on the iPad, and `?audiorestart=20` on any song to see the prompt.
- *23 Oct — the iPhone's restart was a memory kill; Spot FX reverbs and branches (IMPLEMENTED;
  MEASURED on the Mac; device pending).* The iPhone's load-song run: relief at 38.6 s, the
  restart at 39.6 s (clock 0.21, 1.6 s behind), then NO CLEAN EXIT — iOS killed the page.
  Measured in headless WebKit (`work/local/_probe-ensure-memory.mjs`): the load song took
  WebKit from ~700 MB to 2.2 GB, and a restart to 3.4 GB — a new graph built before the old
  one's memory went (and in WebKit a convolver's kernels are never given back while the
  context lives: `buffer = null` or a one-sample buffer changed nothing). The song without its
  Spot FX: +50 MB. Each Spot FX reverb on each lane was its own convolution — 64 of them,
  ~20 MB each. Three changes: (1) `mixer.dispose()` takes the old graph down before the
  rebuild closes its context; (2) THE SPOT FX ROOM — one reverb per mixer that every lane's
  Spot FX reverb SENDS to (`makeRoomSend`; equal-power dry/send as makeReverb's own mix;
  returned to songTrim like the auxes; the first section's decay; asleep when nothing sends).
  The tail no longer passes through later links in the same chain, and lanes share one decay
  — Peter: "do". Load song: 2.2 GB → 870 MB, a restart +220 MB instead of +1.2 GB. (3) Spot
  FX branches are BUILT WHEN SELECTED and dropped after their tail (live contexts only;
  chains with a rhythm effect — gate, stutter, vowel, duck — are built at prepare and kept,
  since their pulses for a step are scheduled before the select). Chrome, where an idle branch
  never slept, read the load song at 86–97 % of the audio thread from bar one — the reason it
  "won't play at all on the Mac" (Peter's Chrome trail, restarting every 10 s) — and reads
  10–32 % now. The guard restarts twice a level at most. fx-sections, strip-sleep,
  audio-canary, sidechain-duck, banger-section-effects, automation, music-hush (modulator
  starts no longer counted), audio-restart pass. **Open:** stems/null baselines with Spot FX
  reverbs now differ by design; a second restart still adds ~200 MB.
- *23 Oct, later — the restart's gap, the tap that makes the context, THE CHANNEL CARD
  (IMPLEMENTED; Mac tests pass; iPhone pending).* iPhone runs on the new build: once "no sound
  after 3 taps" (a context made outside a tap never ran), once running after two taps — with
  the context reporting 12 ms output latency and our lag reading 0, yet every sound a second
  late (Peter: "the jump sound no longer synchronises with the jump"). On the Mac a cue is heard
  5–8 ms after the call before and after a rebuild (`work/local/_probe-sfx-delay.mjs`), so the
  delay is below the context. `Audio.haltAudio()` / `_reviveHalted()` split the rebuild;
  `main.js audioRestart` halts, leaves the page with NO context for 1.5 s (iOS's one output
  torn down, queue and all), then tries a context; if it is not running in 1.5 s it is halted
  too and the TAP's own `ensure()` makes the next one synchronously inside the gesture.
  Restarts: twice a level. `audioResponseProbe` writes to the trail, at the start and after
  each restart: cue→render ms, output lag ms, base/output latency. Peter then reports the
  delay is still there, smaller than a second; Chrome untested. **Spot FX:** rooms keyed by
  reverb settings (two different reverbs stay two), and THE CHANNEL CARD (`effects.js
  'strip'`, virtual, sections only: bass/mid/treble dB and delay/reverb send amounts, applied
  to the lane's strip as offsets for the section — `applyStripFx`; no node; a node-less
  section keeps the direct path). The Lab's lane reverbs (room, trance breakdown space, disco
  short room, the quiet wash) are the card now; the master keeps real reverbs.
  `tests/channel-card.js`; fx-sections, banger-section-effects, jukebox-banger, banger-forms,
  audio-restart, music-hush, audio-canary pass.
- *23 Oct — the restart that works on the iPhone: KICK (IMPLEMENTED in another session; device
  CONFIRMED).* `main.js audioRestartMode = 'kick'` (`Audio.kickContext`): no new context at all
  — the same one is suspended, left quiet for `AUDIO_RESTART_QUIET_MS`, resumed. iOS drops the
  backlog on the suspend, the jump sound is on the jump again, and no tap is needed because it
  is the context the first tap unlocked. Peter: "with restartmode=kick it is fine". The two
  new-context modes stay behind `?restartmode=warm|cold` for comparison; both left every sound
  late by a few hundred ms on the iPhone. The Channel card later gained LEVEL and PAN, the
  strip's order (treble first), ± sends, and is held last in the Spot FX editor.
- *23 Oct — every song change leaked ~48 MB in WebKit (MEASURED; FIXED to ~5 MB; device
  pending).* Found by the per-lane cost probe: its 35 restarts of Neon made the load creep from
  29 % to 100 %, and WebKit's memory from 965 MB to 1.2 GB. Pure Web Audio in WebKit
  (`work/local/_probe-webkit-node-churn.mjs`): the memory of a ConvolverNode (~20 MB), a
  PeriodicWave (~580 KB), an AnalyserNode (~275 KB) and a DelayNode (its line) is never given
  back while the context lives — not on disconnect, not when every reference is gone, not under
  GC pressure; gains, filters, oscillators and sources are fine. And `Tone.setContext(rawCtx)`
  makes a new Tone.Context each call — a Transport, a Destination and a Ticker Web Worker —
  which the rack did every song. Fixes: convolvers pooled and impulses cached per context
  (effects.js); analysers pooled (chain sleepers and strip probes, mixer.js); one Tone wrapper
  per context (`src/engine/tone-context.js useToneContext`); TNGR-2 lanes kept across racks
  (choked at the fade, re-patched by message; the main play path re-points a moved gate as the
  held path did); Spot FX branches dropped after their tail only without deep sleep (Chrome).
  Neon restarts in WebKit: +48 → +3–14 MB, reclaimed later. The Lab's "leftover sources" were
  the chorus LFO built on a lane's first note (now built at warm-up), Tone's lazy transport and a
  keep-alive source `clear()` made to turn off — all audit artefacts, all gone. Open: PeriodicWave
  caches that evict (sync/phase waves) leak each eviction on WebKit; Tone effects' own delays.
- *23 Oct — the PeriodicWave caches are finite and never evict (IMPLEMENTED; tested).* On a
  live context: vibrato phase waves quantised to 16 phases a waveform (was 4 decimals, capped
  at 256 and evicted — tens of thousands a session, each kept by WebKit); hard-sync tables
  quantised to an eighth of a semitone, and past 192 the nearest table of the same shape and
  width serves (was capped at 512 and evicted); JMJR-4's spoken glottal waves keyed to the
  semitone (was the hertz, never evicted — a wave per pitch). Offline renders keep their exact
  keys, so renders are unchanged (null test: the same two warnings, plumber and megamix, as on
  22 Oct). `tests/wave-caches-finite.js`: 80 000 phase asks → 64 waves, 25 000 sync asks → 192,
  5000 spoken pitches → 33.
- *24 Oct — overnight and after (MEASURED; partly FIXED).* Song load against 22 Oct (WebKit,
  playing): Office 25.4 → 18.9 %, Gravity 17.3 → 10.3, Plumber 17.1 → 12.0, Neon 16.1 → 13.1,
  Rhythm 15.1 → 12.0. The 45-min soak: +18 sources a lap (unplugged Spot FX LFOs kept until the
  next song, mostly). A lap of the soak (15 songs, cues firing) took headless WebKit from ~480 MB
  to ~1 GB, then ~+10–35 MB a song on repeats. Delay lines (never freed by WebKit) made per song
  change, and fixed: `Audio.growDelayLine` compared against `maxDelayTime`, which a DelayNode
  does not have, so every call built a new 2 s line (2–3 a song) — now `delayTime.maxValue`;
  the Channel Delay's 8 s line is sized to its time live (regrown on demand; offline keeps 8 s);
  the drum resonator's per-HIT 50 ms line is 512 samples live. Not fixed: Tone's own delays
  (ping-pong, chorus, feedback: 1 s each, per insert per song), the PWM per-note 0.25 s line,
  and a remainder of ~10 MB a song change not accounted for by node type. The soak's crashes on
  24 Oct are the TEST BROWSER's: every crash report is a JavaScriptCore DFG assertion
  (`VirtualRegisterAllocationPhase`) on a JIT thread in Playwright's development WebKit build;
  at random songs, ~1 run in 2, not memory. Null test unchanged (plumber, megamix warnings as
  on 22 Oct). Bench cut-off LIGHT_BENCH_MS 600 → 700 (Peter). The five long-failing suites pass:
  held-keys and auto-portamento-render (fake MRDR-3 lanes given `port`), group-buses (window
  allows the designed 4 ms early crossfade), note-duration (swing 50 within 1e-6: the preset
  path differs ~1e-7 run to run), voices (the Pocket Pixel clap's one-tap `taps` dropped; the
  four blast presets' real peaks stored — 1.24–1.45, 0.9–1.6 dB quieter, Peter's yes;
  seedUkGarageSnare measures exactly 1 and is allowed).
- *24 Oct, later — the rest of the per-song memory (FIXED; MEASURED).* On WebKit's live contexts
  Tone's ping-pong and feedback delays get a line twice their time (≤1 s) instead of 1 s
  (`effects.js webkitLive`; the desk in Chromium unchanged), and the PWM's per-NOTE line is one
  cycle of the note's lower pitch plus a tenth instead of 0.25 s (A/B live in WebKit: level
  within 1 % at 55/110/440 Hz, same top end). The JS heap is flat across song changes (Chromium,
  forced GC: 32–33 MB over 8 rounds of shop+neon+crypt), and plain nodes level off in WebKit
  (25 cycles of 600) — so what was left was WebKit's delay lines. Repeats now: Shop +9 MB once,
  then ~0 (was +10–12 every time); Gravity +3–12 (was +20–48). What remains on Gravity: ~32
  WaveShapers (~43 KB each, also kept by WebKit) and a few compressors — ~2 MB a load.
- *24 Oct, later still — shapers pooled, Spot FX dropped at a stop, the soak clean (FIXED;
  MEASURED).* WaveShapers on WebKit's live contexts are shelved per context (`effects.js
  shaperPoolFor`): every shaper made while an effect is built — ours and Tone's, through the
  context's own `createWaveShaper` — is noted against it, and goes back on the shelf, curve and
  oversampling reset, when the mixer disposes it (`releaseEffectShapers` in `disposeLinks`).
  After Gravity's first load none is built new. A reused shaper carries nothing (Gravity live in
  WebKit fresh / after two rounds of other songs: RMS 0.0229 / 0.0225 / 0.0234; silence exactly
  0). Compressors are left: ~20 KB each and they hold envelope state. Gravity over 15 reloads:
  812 → 917 MB, ~2–6 MB a reload after the first few (was +20–48). Panners, splitters/mergers
  and short delays churn flat in WebKit. A song's STOP now drops every Spot FX branch after its
  tail on every browser (`makeSectionSwitch.release`): Office left 46 LFOs running after its
  stop, now 7 — its own inserts, which belong to the mix until the next song, steady across a
  restart. The soak: still-running sources 3 every lap (the keep-alive and Tone's transport),
  wired 84 every lap — the +18 a lap is gone. The harness launches WebKit with
  `__XPC_JSC_useDFGJIT=0` (macOS hands an XPC service only `__XPC_`-prefixed variables): the
  test browser's DFG assertion stops ending runs (`--dfg` keeps it). The full suite passes
  (song-processing, tngr2-controller and mixer-metering updated for the audit's new behaviour).
- *24 Oct, evening — measured as iOS measures, and the caches capped (MEASURED; FIXED).* RSS
  (`ps`) had been overstating all day: it counts memory WebKit has freed and kept for reuse.
  macOS `footprint` (phys_footprint, what jetsam reads) over the game's own laps (15 songs,
  cues firing, no harness bookkeeping — the soak's graph mode holds every node it ever saw in
  strong Maps, which was most of its 300 MB a lap): start 237 MB → after lap 1 470 → lap 2 478.
  Repeat song changes cost ~1.5–2.5 MB; the first lap is the cost — WebKit malloc +154 MB,
  JS typed arrays +52. Not caches of ours: the note cache is desk-only, the worklets hold ~5 MB
  of tables, PeriodicWaves ~33 a lap, JS keeps ~23 MB of big arrays after a lap (Chromium, GC).
  Capped: the convolver shelf at 3 (`effects.js parkConvolver` — past it a convolver's impulse
  is swapped for one sample, so WebKit frees its kernels, and it is dropped) → after two laps
  442 MB against 478; the impulse cache at the 4 most recent rooms (16 MB after a lap before).
  Null test unchanged. The probe had played out loud for an hour before it had a gain-0 sink
  (Peter heard it); every `work/local/_probe-*.mjs` that plays now has one.
- *22 Oct — the Lab on the iPad (MEASURED, device, https, 17:38).* Full Gravity over https:
  bars 1–50 at C 1.00. The Lab crackled: a Big Room House club song at bar 13 (C 0.92, Q 0.84,
  no frame trouble — DSP) and bar 27 (C 0.94, after the guard's 8-bit), and the next club song
  on its downbeat (C 0.93, Q 0.73, a 238 ms frame — a start-up spike); Peter also heard a few
  on Rave. Start-up: a cold TNGR-2 table set expanded in one block when the club's first
  notes asked; now `openPendingClub` warms the song's tables in idle slices during IT'S
  ALIVE! / the BOLT, and the club builds its worklet lanes when it starts the song, not on
  the downbeat. The styles' own cost: a sweep of one generated song per style, plus Big Room
  and Rave ×3, queued for the quiet machine.
- *22 Oct, 17:24 — the iPad on the dev build with every fix in (MEASURED, device, http;
  `work/local/crash-trail.txt`).* Peter played Gravity and Rhythm (the attract demo's
  gravity-2, rhythm-1 and plumber-1, about five minutes): **no audio trouble at all** — every
  second the glitch log kept reads C 1.00 and Q 0.99–1.00, no CRACKLE, DIP or HOLES, the
  guard never fired. The only rows are FRAMES (6–20 frames lost a second, worst frames
  70–232 ms at density 3–4): on the iPad the picture is now the limit, not the audio. Live
  sources held at 1,100–1,350 without climbing (20 Oct: climbing to 2,833). The device bench
  read **1,339 ms** — the iPad's first reading, well over the 600 ms cut-off — so light
  versions are on: Gravity played its light mix; Rhythm has none. Caveats: http (TNGR-2
  silent), the light Gravity, one session. Next: the full Gravity over https (`?fullmix`).
- *22 Oct — Stage W and Q results (Mac WebKit, counts and sound checks;
  `work/local/_stage-w-coverage.txt`, `_stage-q-sound.txt`).* **Coverage: 104 subjects ok.**
  Eight-note chords, every-step retriggers and four-bar holds on every family — clean; MRDR-3
  at desktop quality — clean; an http page — every family plays except TNGR-2, which reads
  UNAVAILABLE (as it should: no worklet), with no page errors; every worklet failing to load
  — the songs play their other lanes, no errors; 24 generated Lab songs, one per style,
  stopped and restarted — clean but for the known one-source residue (downtempo); all 38
  effects at the top of every range — clean (the noise gate at its maximum threshold shuts
  everything, so it reads UNAVAILABLE: the setting, not a fault). Flagged and since dealt
  with: songs with the game's cues over them (the SFX leak below); fmKeys at full quality
  and on http read "LEAK" from a pool trim landing between two counts (counts now run
  untrimmed). **Sound checks, the sleep and trim changes against the engine before them:
  Gravity, Rhythm, Neon, Office, Crypt, Title, Plumber ok; Hub flagged** — bursts every 4 s.
  The tool's first alignment (on the first loud window) was off by a beat there; it now
  aligns on the best agreement over the whole run, and a control (the old engine against
  itself) reads the same handful of 6 dB windows Hub's own variation produces. Hub: ok,
  ok and ok — control, this tree without deep sleep, with it.
- *22 Oct — Stage W found two more leaks of the KNDO-5 kind (FIXED).*
  - **Every sound effect left its graph on the SFX bus for the session.** New subject
    `audio-audit.js sfx <name|all>` fires a cue three times a second and counts: 14 of 15
    cues left their nodes wired, from 2 (ui) to 51 (thunder) per firing, and a level fires
    hundreds (`--sfx` over Gravity: 258 → 746 wired in 40 s). The cue helpers `osc()` and
    `noise()` — most cues are built from them — now unwire when their source ends
    (`_unwireOnEnd`), as do the inline builders: the explosions (boom, thunder's body),
    impact crash, box kick, contact and launch samples, jump, girder boing, comet swoop,
    neon buzz, zap, roll splat, the reversed voice cues, the coyote howl, the sleigh carol,
    and — by the clock, past their longest source (`_unwireAfter`) — the cat and dog voices.
    After the helpers alone: 15 of 18 cues clean; with the builders, **all 18 clean**
    (thunder holds 12 nodes flat — a room built on first use, kept by design). All 48
    hand-written engine voices clean, the leak test and sfx-routing, song-switch,
    song-change-fade and mix-automation pass, and sound checks on Title, Hub, Megamix and
    Plumber — the songs with hand-written lanes — read ok: nothing missing, cut or louder
    (`work/local/_stage-w2.txt`, `_stage-q2.txt`).
    A first, generic attempt (record every node a cue creates and unwire it all) was
    abandoned unrun: cues build shared rooms, taps and rack pools on first use, and those
    must stay.
  - **The hand-written song voices kept every note on its lane for the whole song.** Only
    `play` had been fixed on 21 Oct; the other 23 note builders in `scheduleStep` (chords,
    bass, drums, toms, rim, gliss, star, …) never unwired: `song title --during` (new:
    counts while playing, never silenced) found 72 oscillators and their gains piled up in a
    minute of the title theme, which loops for as long as the title screen is up. Each now
    unwires on its source's end and is drained at a song stop (`_engineNote`); the gliss's
    echo taps and the rim's ring by the clock. Title: 257 → 444 wired before, 245 → 244 now.
    `--during` is noisy on songs whose sections bring lanes in and out (hub, megamix read
    in-flight notes and pools as growth); it locates, the stop-and-restart count verdicts.
- *21 Oct — Stage 0 (IMPLEMENTED, unverified until a scheduled run):* the workflow installs
  `chromium webkit` (Peter's pick over skipping; adds ~10 min to the weekly run).
