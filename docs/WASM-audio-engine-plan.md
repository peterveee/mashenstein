# MRDR-3 in WebAssembly, then across cores — build and measurement plan

Written 10 Oct 2026. An experiment, not a migration: every stage ends in a number, and
every stage can be stopped at. Nothing here reaches a player until Peter has heard it and
the numbers say it is worth it.

## 1. The question, and why MRDR-3

Two separate claims are under test. They are measured separately because either can
succeed without the other:

1. **Per-core: WebAssembly makes the same DSP cheaper.** Same algorithm, same thread, less
   time per audio second.
2. **Multi-core: synth lanes can be rendered off the audio thread.** Web Workers render a
   little ahead into shared memory; the real-time thread only plays it back.

MRDR-3 is the subject because it is what saturates the iPhone. In WebKit, live load tracks
MRDR-3 note rate (r = 0.62, nothing else correlates). HAIRPIN, NIGHT DRIVE, MASHTERPIECE,
FIRE SALE, ENDSTATION, SLAP HAPPY, AUSSENDIENST and plumber run 55–85% median at M3 Pro
speed and saturate at their peaks (`work/local/_live-load-webkit-*.txt`). Phones only cope
because `MRDR_QUALITY.PHONE` cuts unison, PWM width and filter stages.

The groundwork already exists. MRDR-3 has a pure-JS DSP core
(`src/engine/mrdr3/dsp.js`, "one source string, two hosts"): it runs in an AudioWorklet
and in Node, sample-identical. It has a null oracle (`work/local/mrdr3-null-oracle.mjs`)
and live-load tools for both engines. TNGR-2 ships on the same worklet pattern. So the
port has a reference implementation to null against, rather than a node graph.

**Expectation, stated now so it can be wrong in public:**
- **WebKit/iPhone** should move a lot. Its cost is MRDR-3 DSP.
- **Chrome on the Mac** should barely move. Chrome's live cost is graph *size*: about 25
  nodes per mixer channel, about 1200 node visits per quantum. That lives in mixer.js and
  effects.js, which this plan does not touch until §8.

## 2. Decisions taken up front

| Decision | Choice | Why |
| --- | --- | --- |
| Language | **C11, freestanding** (no libc, no Emscripten) | The smallest toolchain and no JS glue. The same file compiles into an iOS Core Audio app later, if that ever happens. Rust would work too, but adds a toolchain and gains nothing here. |
| Toolchain | Homebrew `llvm` + `lld` (`clang --target=wasm32 -nostdlib -Wl,--no-entry`) | Apple's `/usr/bin/clang` has no wasm32 target. Nothing else is installed (no emcc, no rustc). |
| Maths library | A vendored subset of musl's libm (`sin`, `cos`, `exp`, `pow`, `log`, `tanh`), MIT | Freestanding has no libm. musl's is small, correct and portable. |
| Precision | `double`, as the JS core uses | Keeps the null against the JS core tight. `float` and SIMD are a later, separately measured optimisation (§5.4). |
| Loading | The `.wasm` bytes embedded as base64 in a JS module, compiled **synchronously inside the processor** | This matches how processors already load (Blob URL, no origin, so offline renders work). Stage 0 must prove sync compile works in a WebKit worklet. |
| Generated artifact | `src/engine/mrdr3wasm/core.wasm.js`, **tracked** | The precedent is `tngr2/generated-tables.js`. The game builds without LLVM installed, and a test fails if the bytes are stale against the C source hash. |
| Partition point | **Synth lanes only.** The worklet (or farm) emits each lane's dry stereo into the existing channel strip | effects.js, mixer.js, buses and master stay as they are, so the experiment touches one synth family and nothing downstream. |

## 3. Stages at a glance

| Stage | What | Gate (frozen before running) | Effort with Claude | Peter's part |
| --- | --- | --- | --- | --- |
| 0 | Toolchain + "hello wasm" in a worklet in every host | Runs in Chrome, Playwright WebKit, Mac Safari, iPhone | ½ day | Open one URL on the iPhone |
| 1 | Kernel bench: one MRDR-3 layer, JS vs WASM | WASM ≥ 1.5× JS in **WebKit** | 1 day | — |
| 2 | Full MRDR-3 core in C, nulled against the JS core | Every preset within tolerance | 3–5 days | Listen to anything that doesn't null |
| 3 | Live, single thread: `?mrdr=wasm` | See §5.3 | 1–2 days | iPad / iPhone runs |
| 4 | Multi-core voice farm | See §6.5 | 3–5 days | iPad / iPhone runs, a play-through |
| 5 | Verdict doc | — | ½ day | Decide |

**Stop points.**
- If Stage 1 misses, the per-core claim is dead. Skip to Stage 4 using the **JS** core,
  because multi-core does not need WASM.
- If Stage 4's Stage 0 isolation check fails on the iPhone, multi-core needs a hosting
  decision before anything else is built (§6.1).

## 4. Stage 0 — the plumbing, proven in every host

1. `brew install llvm lld`. Then `tools/build-wasm.js` compiles `src/engine/mrdr3wasm/*.c`
   and writes `core.wasm.js` (base64 plus a source hash).
2. A trivial exported `render(ptr, frames)` that writes a sine wave. Load it through a
   Blob-URL processor exactly as `mrdr3/worklet.js` does. Compile with
   `new WebAssembly.Module(bytes)` in the processor constructor.
3. Prove it in the four hosts named in the MRDR-3 spec §13: the game, the desk, the
   offline render harness and the MRDR-3 playground. Prove it in these browsers: headless
   Chromium, Playwright WebKit, Mac Safari, and iPhone Safari (both a tab and the
   Home Screen app).
4. **Also check cross-origin isolation now**, even though only Stage 4 needs it. Inject
   COOP/COEP headers from `build/sw.js`, then confirm `crossOriginIsolated === true` on
   the iPhone Home Screen app. This is the one finding that could force a hosting change,
   so learn it on day one rather than in week two.

**Gate:** a 440 Hz tone, nulled against `OscillatorNode` by the test, in every
host/browser pair. Record any pair that fails, and why.

## 5. Stages 1–3 — WebAssembly on one thread

### 5.1 Stage 1: the kernel bench

Port **only** the hot path to C: one layer, a mip-table oscillator with its band-limited
lookup, the 2-stage global biquad (the per-sample coefficient rebuild the primitives
suite matched to Chromium) and the VCA. Bench the same note stream through four
renderers:

- JS kernel in Node (V8)
- WASM kernel in Node
- JS kernel in a WebKit worklet
- WASM kernel in a WebKit worklet

Use the existing burner method to measure WebKit, since WebKit has no trace. Use the
measurement rules: best of 5, round-robin, warm-up discarded, noise floor stated, quiet
machine (load < 3).

**Gate:** WASM ≥ 1.5× faster than JS **in WebKit**. V8's JIT is good at this kind of loop.
JavaScriptCore on the audio thread is the open question, and it is the one the phone
answers to.

### 5.2 Stage 2: the full core

Port `dsp.js` as it stands today: allocation and stealing, the note group, three layers,
unison, PWM, noise, FM, hard sync, LFOs, vibrato, glide, mono/legato and drive. Start by
reading the spec's §0 against the code. That status block is dated 20 Aug, and dsp.js has
moved since. Port what the JS core does. Anything it does not do stays on the native path
and is listed.

- **Parity:** a Node harness runs the JS core and the WASM core on the same events and
  reports per-preset residuals. Expect this to be near-identical, not bit-exact, because
  musl's `pow` and V8's `Math.pow` differ in the last bit. Tolerance: residual below
  −100 dBFS and peak error below 1e-5. Any preset above that is either fixed or goes
  to Peter's ears.
- **Oracle:** extend `mrdr3-null-oracle.mjs` with a `--core=wasm` axis, so the existing
  pinned presets are checked through the new core.
- **The controller does not change.** Events, `installPatch`, tables and noise reach the
  WASM core through the same calls. Each call copies into linear memory at
  install time, never in `process()`.
- **Exceptions:** a trap in `process()` kills the processor permanently, exactly like a JS
  throw. Wrap it the way `mrdr3/worklet.js` already does.

### 5.3 Stage 3: live, one thread

A dev switch, `?mrdr=wasm`, alongside the existing `?mrdr=full|phone`, routes MRDR-3 lanes
through the WASM worklet. It shows `SYNTH WASM` in the stats readout. This is scaffolding
in the same sense as `MRDR-3 AW` (§1 of the MRDR-3 spec): one patch library, no `-wasm`
preset copies, removed or promoted at the end.

**Configurations:**

| Config | MRDR-3 rendered by |
| --- | --- |
| A | Native nodes, as shipped today |
| B | JS worklet core (MRDR-3 AW) |
| C | WASM worklet core |
| C-full | C at `MRDR_QUALITY.FULL` on phone |

C-full is the real prize: whether phones can drop the PHONE quality cuts.

**Song set:** HAIRPIN, NIGHT DRIVE, MASHTERPIECE, FIRE SALE, ENDSTATION, SLAP HAPPY,
AUSSENDIENST, plumber. Add two light songs as controls, and NEON ORBIT for the Lab.

**Tools:** `_live-headroom-webkit.mjs` and `_live-headroom.mjs`, each gaining a `--mrdr=wasm`
axis. Use the game's phone setup: metering off, no capture, latencyHint 0.05. On
devices, run the iPad Pro A12Z and the iPhone 13 through the dev jukebox stats readout.

**Gate (provisional, Peter to freeze before the first run):**
- HAIRPIN's WebKit median ≤ 50% in config C (today 75%).
- No song in the set with a worst-4 s window at 100%.
- Chrome no worse than A.

## 6. Stage 4 — across cores

### 6.1 Cross-origin isolation

`SharedArrayBuffer` needs `crossOriginIsolated`. GitHub Pages cannot send headers, but the
game already ships a service worker (`build/sw.js`), which can add
`Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`
to the page response. That is the coi-serviceworker pattern, and the first visit reloads
once.

Things to fix along the way:
- The dev servers and desk servers send the headers directly.
- The Google Fonts stylesheet `<link>` needs `crossorigin` (the font files are already
  CORS).
- The telemetry POST is CORS and unaffected.

If Stage 0 showed isolation failing in the iPhone Home Screen app, the options are a host
that sends headers (Cloudflare Pages, Netlify) or no multi-core on iOS. **That is Peter's
call, asked before Stage 4 starts.**

### 6.2 The voice farm

- **Workers.** N workers, with N = `navigator.hardwareConcurrency − 2`, clamped to 1–4. Each
  instantiates the WASM core and owns a partition of MRDR-3 lanes, balanced by measured
  note rate.
- **Ring buffers.** Each lane gets a stereo ring in a `SharedArrayBuffer`. A worker renders
  its lanes up to the **render-ahead horizon** (the audio frame it may render to), which
  the audio thread advances as it consumes.
- **One consumer `AudioWorkletNode`.** It has one output per lane, which feeds that lane's
  existing channel strip. Its `process()` copies 128 frames per lane out of the ring and
  bumps the read index. It never computes anything.
- **Synchronisation.** Lock-free: `Atomics.load` and `Atomics.store` on the indices.
  The worklet calls `Atomics.notify` after each read, and a worker that is ahead blocks in
  `Atomics.wait`. A worklet may notify but not wait, which is exactly the direction needed.
- **Events.** The sequencer already schedules 0.25 s ahead (`SEQUENCER_LOOKAHEAD`), so
  notes reach the worker before its horizon. They are frame-stamped exactly as the
  worklet core already expects. Choke, panic and song change are posted as
  frame-stamped events too.
- **Underruns.** If a ring is short, the consumer outputs silence for that lane and
  increments an underrun counter. **Underruns are the metric that matters here.** A
  dropout is a dropout whether or not the audio thread had headroom.

### 6.3 Render-ahead, the knob

Horizon candidates: 1024, 2048 and 4096 frames (23, 46 and 93 ms at 44.1 kHz).

- **The cost of a longer horizon:** a pot drag, a Lab tweak or a choke takes effect
  that much later, and pausing has to discard what was already rendered.
- **The benefit:** workers run at normal priority, not real-time, so the horizon is what
  absorbs a GC or a main-thread stall.

Stage 4 measures underruns per horizon and picks the smallest that survives a full song on
the iPhone.

### 6.4 What stays single-threaded

- **SFX, Tone voices and native-node voices.** They stay as they are, on the audio
  thread.
- **Offline renders** (bounces, baselines, null tests). They use the Stage 3 single-thread
  worklet core, because an OfflineAudioContext has no wall clock for a farm to keep ahead
  of. Same core, same numbers, so a bounce still matches live.

### 6.5 Measurement, and the gate

Extra configurations, layered on Stage 3's:

| Config | MRDR-3 rendered by |
| --- | --- |
| D | WASM farm |
| D-js | JS core in the farm (multi-core without WASM) |
| D-full | D at FULL quality on phone |

Per song, record:
- audio-thread load (median and worst 4 s)
- underruns per minute
- **total CPU**, summed across threads. This is what multi-core costs in battery and heat.
  Get it from the Chrome trace's worker threads, and on WebKit from the process's CPU
  time via `ps`.
- wasm compile time, memory

On the iPhone, also record a 10-minute play for heat and battery feel.

**Gate (provisional):**
- Every song in the set ≤ 60% worst-4 s on iPhone-13-scaled numbers.
- Zero underruns across a full play at the chosen horizon.
- Total CPU no more than 1.3× config C.

## 7. Stage 5 — the verdict

Write the after-numbers into `docs/audio-performance-2026-08.md`. Use one table, songs ×
configs (A, B, C, C-full, D, D-js, D-full), for each browser and device. Then recommend
one of four outcomes:
- Ship C.
- Ship D.
- Ship nothing and delete the scaffold.
- Continue to §8.

Shipping anything follows the MRDR-3 spec's §9 and §12 approval path: batches by ear,
level re-measurement, baselines.

## 8. If it wins — what comes next (not part of this plan)

- **TNGR-2 and JMJR-4.** Both are already pure-JS cores, so they take the same port with
  the same harness.
- **SIMD.** `wasm_simd128` is in Safari 16.4+ and Chrome 91+. Run the four-voice unison
  stack four-wide in `float`. Measure it separately, since it changes precision.
- **The mixer and effects in WASM.** This is Chrome's lever (graph size), and the big job:
  effects.js is 5.3k lines.
- **An iOS app.** The C core drops into a Core Audio render callback unchanged, and Apple's
  audio workgroups give real-time-priority threads. Only then is a native app worth
  revisiting.

## 9. Risks

- **JSC's JIT is already good on this loop**, so Stage 1 finds little. That is the stop
  point, and multi-core stays on the table with the JS core.
- **Sync `WebAssembly.Module` may be refused** in a WebKit worklet. In that case compile on
  the main thread and pass the `Module` in `processorOptions`. Whether WebKit can
  structured-clone a Module into a worklet is itself a Stage 0 question.
- **Workers get descheduled** on a busy phone. Workers have no real-time priority in any
  browser, so the horizon may need to be longer than live tweaks would like. Stage 4
  measures exactly this.
- **Service-worker isolation fails in the Home Screen app** (§6.1). That means a hosting
  change.
- **Two cores drift while both live.** This is the same risk as MRDR-3 AW, with the same
  mitigation: one patch payload, oracle-pinned, and a stop date set when Stage 3 starts.
- **The WebKit summing-junction crash** (`src/engine/webkit-junction-guard.js`) is unrelated,
  but it will show up in long WebKit runs. Count crashes per config rather than discarding
  runs.
