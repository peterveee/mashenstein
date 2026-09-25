# Neon cabinet: audio and performance handover

Written 24 Sep 2026, overnight, after Peter reported:

> "the audio is breaking up in places. In our tests against rhythm song we were
> supposedly using LESS cpu than it but the audio is a bit flaky... it is a bit glitchy
> even getting INTO the cabinet... the song doesn't start perfectly from the dev menu...
> anything to do with the rewind?"

Everything below was **measured**, not reasoned from code. The scripts are in `work/local/`
and are listed with their commands at the end, so every number can be re-run.

## TL;DR

1. **Fixed tonight: the stall entering the cabinet and the ragged song start.** Both
   came from TNGR-2 building its wavetable families (the synth's precomputed waveform
   tables). This happens once per session.
   - **The cost:** SESERAGI plays seven TNGR-2 lanes, and building their families took
     **~700–950 ms of main thread** in one block (`buildFamily`).
   - **Where it landed:** inside the cabinet screen's warm-up (the glitch getting in),
     or inside a stage's `enter()` while its song was starting (the ragged start from the
     dev menu).
   - **Now:**
     - The tables are built in idle time on the title screen.
     - The run builds them **before** handing the song over, never inside its start gap.
   - **After the fix:**
     - All neon and rhythm starts have **0 late notes** from page load.
     - No table building happens during gameplay.
2. **Rewind is not the cause.** The same run with rewind recording off (`?norewind`) or
   with the rewind audio capture removed shows no difference. All three: 0 underruns,
   0 late notes, 120 fps.
3. **On an idle Mac the neon stage does not break up.**
   - 40 s of neon-1, headed, on the real output device (made inaudible): **0 underruns**,
     audio clock 1.000, no late notes.
   - Rhythm-1: the same.
   - Main-thread load is about equal: neon 8.1%, rhythm 8.8%.
   - Graphics are not the issue.
4. **So what is left is capacity under load.** The song is heavy on the audio thread,
   and the game runs it on the browser's smallest output buffer (5.3 ms). When something
   else takes the machine — the mixer desk playing on :8010, other Claude sessions,
   builds, a phone — the audio thread misses its deadline and it crackles.
   - The heaviest parts are **not** the TNGR-2 lanes. They are the JMJR-4 choir, two
     CRLS-1 pad/square lanes, the six-bit open hat, and the lane effects (§4).
   - See **Where to look next**.

## 1. The TNGR-2 table stall (fixed)

**Measured** (`work/local/_rt-profile.mjs`, CPU profile from page load, headed):

| Moment | Longest frame | Inside it |
| --- | --- | --- |
| neon-1 from the dev menu, before | 1024 ms | `buildFamily` 682 ms ← `warmTngr2Families` ← `warmWorkletLanes` ← `RunState.enter` (after the song had been handed over) |
| Same, 4× slower CPU (phone-like) | 4134 ms | the same |
| Cabinet screen, first open | same cost | `StageSelectState.enter` → `warmWorkletLanes` |

**What changed** (not committed):

- **`Audio.warmSongTables(bank, mix, { idle })`** (src/engine/audio.js).
  - Collects every TNGR-2 voice a song uses: `mix.voiceParams`, `mix.voice`, and the
    bank's own `*Voice` keys.
  - Builds their families, inline or one per idle slice.
  - Families are memoised for the page's life, so a second call costs nothing.
- **`RunState.enter`** (src/game/run.js) calls it **before**
  `MusicDirector.enterStage`.
  - A dev-menu start still pays the ~950 ms, but ahead of the song rather than inside its
    half-second start gap.
  - `warmWorkletLanes` still runs after `enterStage`, as before, since `setBank` releases
    the lanes. It now finds the tables already built.
- **Boot** (src/main.js), three seconds after launch:
  - Warms every cabinet song's tables, one cabinet at a time, one family per idle slice.
  - **It never runs during a stage.** It waits out a `RunState` and retries every 2 s. A
    first version ran mid-stage from the dev menu and caused 66–75 ms hitches; that is
    fixed and re-measured.

**Result:**

- Dev-menu starts of neon-1, neon-2 and rhythm-1: **0 late notes, lowest queue 223–240 ms**
  from page load (`work/local/_start-check.mjs`).
- On the title screen, the warm-up builds everything within ~5 s of boot. The cost is
  **~1 s of 57–68 ms title frames** around 4.5 s in (`work/local/_title-warm-profile.mjs`).
- A player reaching the neon cabinet normally meets no stall.

**Update, 24 Sep, later: the families now build in a background worker.**

How it works:
- `expandFamilySpectra` (src/engine/tngr2/tables.js) is the table maths as a function
  that closes over nothing.
- The main thread's `buildFamily` calls it directly.
- A Blob worker, created from the same function's source text (`tngr2FamilyWorkerSource`),
  runs it off-thread and returns seven transferred buffers per family.
- `warmTngr2Families(ids, { worker: true })` uses the worker when the page can run one,
  and falls back to idle slices otherwise.
- The worker shuts itself down 5 s after going idle.

Boot now warms every cabinet song through it, 0.5 s after launch.

Measured:

| What | Before | After |
| --- | --- | --- |
| Table building on the title's main thread | 957 ms | 0 ms (no long frames from it) |
| Worker finishes every cabinet song's tables | — | ~2.9 s after launch |
| Dev-menu start of neon-1 | ~950 ms built inline before the song | ~560 ms (the stage arrives ~1.2 s after page load, before the worker has started) |

The dev-menu start still gives 0 late notes. `tests/tngr2-tables.js` checks that the
worker builds the same tables bit for bit as the main thread, including when its source
comes out of a MINIFIED bundle, as it does in the shipped game.

## 2. Rewind (not the cause)

`work/local/_rt-audio-probe.mjs`, neon-1, 40 s each, headed, real output device:

| Run | Underruns | Late notes | Worst frame | fps |
| --- | --- | --- | --- | --- |
| normal | 0 | 0 | 67 ms | 120 |
| `?norewind` (no state recording) | 0 | 0 | 65 ms | 120 |
| rewind audio capture removed | 0 | 0 | 50 ms | 120 |

The capture is a `ScriptProcessorNode` on the master (src/engine/audio.js
`_startCapture`). Its callback runs on the main thread. It could only matter on a machine
whose main thread is already starved, and even at 4× CPU throttle nothing was late.
Worth replacing with an AudioWorklet recorder one day on principle; it is not tonight's
bug.

## 3. Real-time health, neon vs rhythm

All headed on the real output device, made inaudible (a −66 dB gain before the
destination), with Chromium's playout statistics enabled
(`--enable-blink-features=AudioContextPlayoutStats`, so underruns are counted, not
inferred).

| Run | Underruns | Audio clock | Late notes | Lowest queue | Main thread busy |
| --- | --- | --- | --- | --- | --- |
| neon-1 | 0 | 1.000 | 0 | 213–239 ms | 8.1% (81 ms/s) |
| rhythm-1 | 0 | 1.000 | 0 | 223 ms | 8.8% (88 ms/s) |
| neon-1, CPU ×4 slower | 0 | 1.000 | 0 | 105 ms | — |
| rhythm-1, CPU ×4 slower | 0 | 1.000 | 0 | 93 ms | — |

- **Headless cannot find crackle.** It renders to a fake output that cannot underrun: 0
  underruns in every case, whatever the load. Any future audio investigation must run
  **headed**. The probe does this, inaudibly.
- **The game's desktop audio buffer is the browser default: 5.3 ms** (`baseLatency`
  0.0053 at 48 kHz, 'interactive'). The mixer desk moved to `latencyHint: 'playback'` in
  August for exactly this symptom (see memory "audio glitch clock probe"). Phones already
  get 50 ms (src/engine/phone-audio.js). Desktop does not.
- **Main-thread hot spots in neon gameplay** are the renderer's own: texture upload
  (`texSubImage2D` 5.2 ms/s) and `drawImage` 5.1 ms/s, the same as rhythm. The new neon
  art does not appear in the top 14: golden sky, aurora (cached, redrawn at 15 fps),
  signs (baked), boards. `addColorStop` at 1.2 ms/s was the golden sun rebuilding two
  gradients every frame. They are now cached per context and sun position (done
  tonight).

## 4. What the song costs the audio thread

`work/local/_neon-lane-cost.mjs` renders bars 21–40 (the dense dark section) offline
three ways, keeping the best of two passes: the full song, the song with each lane
removed (leave-one-out), and the song with lane effects or master effects removed. "Saves"
is what taking that part out would free. 1000 ms/s is a full core.

**Full song, bars 21–40: 349 ms per audio second, 35% of a core.**

The noise floor is about ±7 ms/s: the negative rows are lanes that are near-silent in
this window, measured as noise.

| Take out | Saves | Share of the song |
| --- | --- | --- |
| all lane effects and sends | 76 ms/s | 22% |
| lead5 — JMJR-4 *Ooh Opens* (brass stabs voiced as a choir) | 61 ms/s | 18% |
| lead10 — CRLS-1 *simpleSquare* (added on the desk tonight) | 56 ms/s | 16% |
| lead8 — CRLS-1 *warmPad* (fatsawtooth) | 47 ms/s | 14% |
| ohats — *909 Six-Bit* open hat (crush shaper) | 46 ms/s | 13% |
| chords2 — TNGR-2 *Burnt Horizon* | 31 ms/s | 9% |
| hats — engine hat | 30 ms/s | 9% |
| lead3 — CRLS-1 *simpleSawtooth* | 30 ms/s | 9% |
| master effects (multiband comp + EQ) | 28 ms/s | 8% |
| lead4 — TNGR-2 *Crystal Trigger* | 25 ms/s | 7% |
| bass2 — TNGR-2 *Night Sequence* | 24 ms/s | 7% |
| clap / kick / snare | 13–18 ms/s each | 4–5% |
| lead7 (TNGR-2 chime), twinkle, sweeps, clap2, snare2, lead9 (wub), hats3, lead6 | 4–11 ms/s each | ≤3% |
| tom, lead, lead2, chords, bass, crash, hats2 | within noise | — |

**What this says:**

- **The seven TNGR-2 lanes are NOT where the audio time goes.** Together they are
  ~25% of the song. Their cost is the one-off table build at the start (§1), which is
  fixed.
- **The heaviest single voices are sustained, per-note-heavy synths:**
  - the JMJR-4 choir (18%);
  - two CRLS-1 pads/squares, lead10 and lead8 (16% and 14%);
  - the six-bit open hat (13%). A crush shaper on a hat that fires every off-beat is
    expensive for what it is.
- **Lane effects and sends together are a fifth of the song.** The per-effect
  catalogue costs say where: exciter ×2, tremolo, chorus, doubler, autopanner ×2.
- **Cheapest wins, if it turns out to be capacity:**
  - lead10: try a lighter voice, or check whether it is doubling another lane;
  - the open hat: a plain voice instead of six-bit crush;
  - the lead5 choir: reduce its unison;
  - drop one of the two exciters.

  These four are about half the song's cost.
- **Whole-song context:** v17 measured 0.53 cores against rhythm's 0.77–0.90 over its
  whole length (`bench-seseragi-cpu`). This window is lighter (0.35). Its heaviest
  stretch is the breakdown and the D-minor return.


**What the song is made of** (the neon song's own mix):

| Synth | Lanes |
| --- | --- |
| TNGR-2 (7) | lead (Alloy Chime), lead7 (Alloy Chime), chords (Warm Strings), lead4 (Crystal Trigger), lead6 (Neon Reed), bass2 (Night Sequence), chords2 (Burnt Horizon) |
| RMND-2 | twinkle, lead2 |
| CRLS-1 | bass, lead3, lead8, lead10 |
| JMJR-4 | lead5 |
| MRDR-3 | lead9 (WUB Sync Screech, added on the desk tonight) |
| Drums | 12 lanes |

**Lane effects:**
- exciter + compressor on lead and on lead7
- chorus on twinkle
- autopanner on lead3 and on hats3
- doubler on lead5
- compressor on bass2
- widener on chords2
- ping-pong on tom
- channel delay on clap2
- tremolo on lead9

**Master chain:** multiband compressor, then EQ.

## Where to look next (in order)

1. **Reproduce Peter's break-up with the probe running headed, while his usual load is
   on the machine:** the mixer desk playing on :8010, a build, other sessions. If
   underruns appear there and not idle, it is capacity, and these are the levers:
   - **A bigger desktop buffer for the game.** `Audio.setLatencyHint('balanced')` (or
     `'playback'`) before `ensure()` in src/main.js, as the desk and phones do. The beat
     judge follows `heardLatencySec`, so scoring is unaffected (see the comment above
     `opts.latencyHint` in audio.js). This is a one-line change, but it is a feel change
     for every cabinet, so it needs Peter's ear first.
   - **Cheaper voices for the heaviest lanes** in the table above. The desk's lane meters
     and CPU readout make it a mixing decision.
   - **The note cache** (`Audio.setNoteCache(true)`, desk-only today). It renders
     deterministic voices once and plays buffers. It has not been tried in the game.
2. **Phone check.** A phone has a fraction of this Mac's core, and seven TNGR-2
   worklets plus JMJR-4 is a lot. Run neon-1 on the phone with the dev menu's audio
   readout, or remote-debug with the probe's clock and `takeSchedulerHealth()` reads.
3. ~~TNGR-2 tables in a Worker~~: done (§1).
4. **The rewind capture as an AudioWorklet** (§2), on principle only.

## The toolbox

| Script | What it does |
| --- | --- |
| `work/local/_rt-audio-probe.mjs <label> "<query>" <secs> [--headed] [--nocapture] [--throttle=4]` | Real-time health per second: underruns (playout stats), audio clock vs wall, late notes and lowest queue (`takeSchedulerHealth`), worst frame, long tasks. `--headed` is the only mode that can see underruns; it is inaudible. |
| `work/local/_rt-profile.mjs "<query>" <secs> --headed` | CPU profile from page load. Names the game functions inside every frame over 60 ms. |
| `work/local/_rt-busy.mjs <label> "<query>"` | Main-thread busy % over 30 s of gameplay, and the top functions by self time. |
| `work/local/_start-check.mjs` | Late notes and lowest queue from page load through the first 3 s of neon-1, neon-2 and rhythm-1 dev-menu starts. |
| `work/local/_title-warm-profile.mjs` | What the boot-time table warm-up costs the title screen. |
| `work/local/_neon-lane-cost.mjs` | Leave-one-out audio cost of every lane of the neon song. Output in `_neon-lane-cost.txt`. |
| `work/local/bench-seseragi-cpu.mjs` | Whole-song offline cost against the game's other songs (`BENCH_SONGS`, `BENCH_GAME` env). |

Queries used: `goto=stage&cab=neon&stage=neon-1&hero=lorenzo&invuln` (and `neon-2`,
`cab=rhythm&stage=rhythm-1`). Add `&norewind` for the rewind A/B. The dev server on
:8001 must be up.

**Rules learned tonight, on top of the memory's "perf measurement rules":**
- Headless can't underrun, so audio health is measured headed or not at all.
- Playwright's fake clock doesn't drive the AudioContext, so song-timed events such as
  the minor-turn strike fire early in fake-clock captures.
- A table warm-up that uses idle time must still refuse to run inside a stage.

## 25 Sep follow-up: "breaking up again, esp. neon-1"

Peter's report, 24 Sep ~23:30: the audio was breaking up again in the neon levels,
mostly neon-1. Since the 24 Sep work the song has gained lanes (lead11–13, `kick2` with
a 6.8 s reverb, `crash2`), and the machine was rendering the feature reel at the time:
ffmpeg on ~8 cores and a 4K headless Chromium, load average 16.

Scripts and raw output: `work/local/neon-audio-0925/`.

### Last night's fixes: none regressed

- The code is intact. `warmSongTables` still runs before `enterStage`, `warmWorkletLanes`
  after it, and the boot warm still goes through the worker.
- `tests/tngr2-tables.js` and `tests/silent-lane-skip.js` pass.
- On an idle Mac, headed, 95 s of neon-1: **0 underruns, audio clock 1.000, 0 late
  notes**. The same at a retina window (1512×900 @2×).

### One new stall, now fixed: the golden paper sky

The neon-1 golden sky arrived at 16:15 on 24 Sep. Its paper texture (`cardstockClear`)
was built on the sky's first frame, **after** the song had started. That made one
234–259 ms frame (`paintPaperFibres` 100 ms, plus `inkBounds`, which dates from July).

| neon-1 start | Before | After |
| --- | --- | --- |
| Lowest scheduler queue, dev-menu start (×3) | 47–79 ms | 189–219 ms |
| Under an 11-core synthetic load: late notes | **1** (queue −27 ms) | 0 (queue 140–217 ms) |
| Longest frame after the song starts | 234–259 ms | 66 ms |

A late note at the start of neon-1 on a busy machine is exactly "glitchy, especially #1".

**The fix** (not committed):
- **`RunState.enter`** (src/game/run.js) builds the stage's paper sheet (`paperPreset`,
  else `cardstockClear`) next to `warmSongTables`, before the song is handed over.
- **Boot** (src/main.js) builds the three shipped materials (`cardstockClear`,
  `cardstockSoft`, `skySmooth`) on the title screen, one per 250 ms.
  - It is **abandoned** once a run begins.
  - A first version waited out the run instead, and so built them on the results screen
    with the song playing (108–117 ms frames). That was caught and removed.
  - The cost on the title: 2 frames of ~108 ms around 3 s, with 0 late notes and a
    lowest queue of 208 ms.
- Tests pass: dev-menu, loop, phone-audio, paper-material, rewind-powerup,
  rewind-pooling, art-warmup.

### Is the song too heavy? No: it has more real-time headroom than rhythm

- **Ballast test** (`rt-probe.mjs --ballast=f`): an AudioWorklet burns a fraction `f` of
  every render quantum on the game's own audio thread, and the level runs headed for its
  whole length.

  | Ballast | neon-1 | rhythm-1 |
  | --- | --- | --- |
  | 50% | 0 underruns | 0 underruns |
  | 65% | breaks up in bursts at the densest bars (~43 s, 51–55 s, 65–70 s, 77 s on) | breaks up continuously from 40 s |
  | 80% | breaks up throughout | breaks up throughout |

  So at its peak the neon song leaves roughly a third of the audio thread free.
- **Under an 11-core synthetic load**, neon-1 and rhythm-1 both had 0 underruns. macOS
  keeps the audio thread's priority. What the load hurt was the MAIN thread's scheduling,
  which is the stall fixed above.
- **Offline, last night's mix vs tonight's** (`windows.mjs`): tonight is ~10–25% heavier
  per 8-bar window. The heaviest window is bars 67–82, ~0.52 cores offline, where ~0.14
  is the renderer's floor.

### What does not cost

- **Muted and empty bars are never rendered.**
  - An `off:` bar nulls the lane before the sequencer reads it, and an empty step
    schedules nothing, so no voice is built.
  - A lane the level mix mutes is skipped outright once the run's handover lands
    (`setSilentLaneSkip`).
  - An idle TNGR-2 lane zero-fills its quantum natively (`Tngr2Core.process`
    fast path).
- **Effects** (`fx-bench.mjs`): isolated, the song's own params, one page, median of 7.
  The bare-vs-bare control reads 0.00. Figures are % of one core.

  | Effect | Playing | Lane idle |
  | --- | --- | --- |
  | **kick2 reverb, decay 6.8** | **1.63** | 0.65 — the 6.8 s tail, then off |
  | same reverb at decay 3.0 / 2.0 | 1.05 / 0.91 | 0.25 / 0.19 |
  | mbCompN (master) | 0.83 | 0.14 |
  | exciter (lead, lead7) | 0.70 each | 0.07 |
  | l7 (lead13) | 0.57 | 0.37 |
  | autopanner (lead3, hats3, lead13) | 0.33 each | 0.33 |
  | widener, chorus, chandelay ×2, pingpong, doubler, compressor ×3 | 0.19–0.30 each | 0.03–0.29 |

  - **All the song's effects together are ~7.5% of a core.**
  - The long reverb is the single dearest effect, and it is still under 2%. It switches
    itself off 6.8 s after `kick2` stops. Shortening it saves ~0.6–0.7% while `kick2`
    plays. **It is not the problem.**
  - The LFO-driven effects (chorus, autopanners, widener, ping-pong, channel delays, l7,
    doubler) keep running when their lane is idle, ~2.3% of a core together.

### The heaviest voices

Leave-one-out over bars 67–74 (`loo.mjs`, median of 7, with a FULL-again control). The
harness noise is about ±6% of a core, so only these stand clear:

| Lane | Voice | Share of a core |
| --- | --- | --- |
| lead5 | JMJR-4 *Ooh Opens* (brass stabs voiced as a choir) | **~13%**: the dearest single part, in every run on both nights |
| lead8 | CRLS-1 *warmPad* (doubles lead5's notes) | ~7% |
| chords2 | TNGR-2 *Burnt Horizon* | ~4–7% |

Everything else is inside the noise. lead12 is also `jmjrOohOpens` but has no notes, so
it costs nothing.

**If a lever is wanted:** lead5's voice is the one that matters (fewer unison voices, or
a cheaper voice for the stabs). No effect is worth removing for CPU.

### What was left, and why

- **Most likely cause of what Peter heard:** the new neon-1 start stall (fixed). What
  made it audible was the machine being flat out on the reel render.
  - The song itself is inside budget with room to spare.
  - Nothing in the song or the engine glitched on an idle or loaded machine once the
    stall was gone.
- **Not done: the bigger desktop buffer** (`latencyHint: 'balanced'`, 10 ms instead of
  5.3 ms). It is still the lever for a busy machine, and still a feel change that needs
  Peter's ear. Under load both buffer sizes gave 0 underruns.
- **The offline leave-one-out is noisy.** A render per page lands on whichever core it
  lands on: identical renders ranged 460–740 ms/s. Trust `fx-bench.mjs` (one page) and
  the ballast test, and read the lane ranking only for its top three.
- **The earlier 'breaking up' was not clipping.** Tonight's mix peaks at +0.1 dB on 2
  samples in the whole song, where last night's peaked at +0.7 dB on 15.
