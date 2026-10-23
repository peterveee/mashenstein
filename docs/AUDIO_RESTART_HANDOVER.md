# AUDIO RESTART ON iOS — HANDOVER

*23 Oct 2026. The one open problem in the audio guard: after a RESTART on the iPhone, every
sound plays late. Peter: "the jump sound no longer synchronises with the jump itself, this is
unacceptable… there must be a way to restart it properly". Phone speaker only — no Bluetooth.*

## What the restart is for

The audio guard (`src/engine/audio-guard.js`) has two levers: RELIEF (the song's 8-bit version,
reliable) and RESTART. RESTART exists because once the iPad/iPhone audio thread has tipped it
LATCHES: the clock sits at 0.2–0.4 whatever load is taken away (muting every lane did nothing),
the backlog grows at ~0.6 s/s, and the only thing that releases it is near-zero load — at which
point WebKit renders the whole backlog at once (the glitch log's `CATCHUP`, C 3–5 for a second)
and after a burst ≥3 s the device played everything late, or nothing until a reload. Closing the
AudioContext takes the backlog with it. Peter's direction: silence as soon as it sounds bad, then
a restart; if a tap is needed, freeze and ask for one (`main.js drawAudioTapPrompt`).

## What is implemented (all uncommitted on 23 Oct)

- `Audio.haltAudio()` — snapshot the song/transport, dispose the rack and the mixer graph
  (`mixer.dispose()`, so memory does not double), suspend then close the context (each awaited
  with a deadline), `ctx = null`, keep the snapshot in `_halted`.
- `Audio.ensure()` — builds a context as always, and if `_halted` is set restores the song where
  its clock was (`_reviveHalted`). `rebuildRealtimeContext()` = halt + ensure (desk, tests).
- `main.js audioRestart(why)`: halt → **1.5 s with no context at all** (`AUDIO_RESTART_QUIET_MS`)
  → `ensure()` → if running within 1.5 s, done; else halt again, freeze the game, show the
  prompt; the tap's own `Input.onAnyGesture → Audio.ensure()` makes the context synchronously
  inside the gesture. Three taps with no sound → the game goes on silent. `?audiorestart=N[,M]`
  forces restarts N (and M) seconds in (dev builds).
- `audioResponseProbe(label)` writes `AUDIO probe …` to the crash trail at the start (4 s after
  the first tap) and 3 s after each restart: cue→render ms (a near-silent cue timed until it
  reaches the SFX bus), output lag ms (`ctx.currentTime` against `getOutputTimestamp`), and the
  context's `baseLatency` / `outputLatency`.
- The guard restarts at most twice a level/song; the second also mutes all but drums/bass/lead.

## What the device has shown

| Run | What happened |
| --- | --- |
| load song, old build | restart → page killed ~60 s later (memory: the new graph on top of the old one's — fixed by `mixer.dispose()` and the Spot FX changes; 2.2 GB → 870 MB) |
| load song | restart → "the new context is suspended" → **no sound after 3 taps** (a context made outside a tap did not start; taps did not rescue it) |
| load song | restart → suspended → **running after 2 taps**, context reports base 3 ms / output 12 ms, our lag 0 — yet everything a second late |
| load song, gap build | restart → suspended → running after 1 tap. Peter: still a noticeable delay, "perhaps not a second" |

On the Mac (headless WebKit, `work/local/_probe-sfx-delay.mjs`) a cue is heard 5–8 ms after the
call before and after a rebuild, so the engine's own path is not it. On the Mac a second rebuild
in a page leaves the third context suspended (WebKit runs few realtime contexts at once — see
`work/local/_probe-ctx-variants.mjs`); the tap resumes it.

## Where the delay must be

Everything measured inside WebKit reads normal after the restart (12 ms output latency, 0 lag,
cue rendered at once — pending the probe lines from the next run). The sound is nonetheless late
by hundreds of ms. That leaves the layer under WebKit: iOS's audio session / the one output unit
the page's contexts share (rendered in the GPU process on recent iOS). Two candidate mechanisms:

1. **A queue that survives the context.** The old context, 1.6–2 s behind, renders its backlog
   into the shared output as it is suspended/closed; the new context's sound queues behind it.
   The 1.5 s context-free gap was meant to tear that output down; the delay persisted, so either
   the gap is too short, the output is not torn down while the page is audible/visible, or this
   is not the mechanism.
2. **A re-activated audio session with a larger IO buffer.** When the session is restarted iOS
   may grant a longer preferred IO buffer duration than the first activation did, and
   `outputLatency` may not report it. A delay of a few hundred ms is the size of a session
   buffer change, not of a 2 s backlog.

## What to try, in order

1. **Read the probe lines** from the next iPhone run (`?audiorestart=15` on an ordinary song,
   then a few taps). If `after the restart` reads like `at the start`, the delay is below
   WebKit for certain.
2. **A restart on a healthy context** (`?audiorestart=15` on Gravity, no overload): delay or
   not? If NOT, the delay is the old context's backlog (mechanism 1) and the fix is to make the
   old context DROP it before closing — e.g. `ctx.suspend()` while still latched and leave it
   suspended (never let it catch up), or set the master gain to 0 and wait for the catch-up
   burst to drain *before* closing, then close with the output idle. If YES, it is the session
   (mechanism 2) and no page-side gap will fix it.
3. **Do not make a new context at all.** KICK the same context inside the tap: `suspend()` then
   `resume()` (the original KICK lever failed only because it ran outside a gesture). The
   session and its buffer are kept; whether the backlog is dropped on suspend is the question —
   measure the catch-up with the glitch log's `CATCHUP` tag after it. Wire it as
   `?restartmode=kick` beside the current one so both can be compared on one device.
4. **A longer gap / a gap with the page quiet.** Try 4 s with no context, and with the
   exit fade applied first (`Audio.fadeForExit()`), to give iOS a reason to release the session.
5. **Latency hint on the rebuilt context.** `phone-audio.js` asks for 50 ms; try `'interactive'`
   (the default) on the rebuilt one only, and read `baseLatency` in the probe line.
6. If none of it moves the number: the honest fallback is the prompt saying "reload to restore
   full-speed sound" — a reload does fix it — rather than silence or a lag.

## Files

- `src/engine/audio-guard.js` — the levers. `src/main.js` — `audioRestart`, the prompt,
  `audioResponseProbe`, `?audiorestart`. `src/engine/audio.js` — `haltAudio`, `_reviveHalted`,
  `rebuildRealtimeContext`, `contextRunning`. `src/engine/glitch-log.js` — `CATCHUP`, `L` lag.
- Tests: `tests/audio-guard.js`, `tests/audio-restart.js`, `tests/music-hush.js`.
- Probes: `work/local/_probe-sfx-delay.mjs`, `_probe-ctx-variants.mjs`, `_probe-second-ensure.mjs`,
  `_smoke3.mjs` (the real game through two forced restarts and the tap).
- The device's story: `work/local/crash-trail.txt` (uploaded at boot from a dev build), lines
  tagged `AUDIO` and `GUARD`, and the `GLITCHES` rows (`C` clock, `L` lag, `CATCHUP`, `MUTE`).
- Plan log: `docs/AUDIO_SYNTH_AUDIT_PLAN.md`, the 22–23 Oct entries.

## 23 Oct, later — the warm restart (built; on the phone it was NOT the fix — see below)

**The reading of the evidence.** Every number WebKit reports after a restart is normal, the
delay is real, and a reload fixes it. The one mechanism that fits all three, and the latch
itself: on iOS the GPU process's output reader does not SKIP a quantum the render thread
failed to deliver, it WAITS for it — so every late quantum is a permanent step of delay for
that context (that is the latch: clock 0.2–0.4 for two seconds = 1.5 s late for good, and
`L` reads 0 because `getOutputTimestamp` is computed from the same counter, not measured).
A new context starts clean, but the old restart STARTED it the instant it was made, and its
first second was spent compiling worklet modules and constructing processors on its own
render thread — the song's lanes, the mixer's gates — plus the cold JIT of every processor.
Those stalls became the delay heard. At boot the same work happens while the context waits
for its first tap, which is why the first context never had it.

**What changed.**

- `Audio.buildHaltedContext()` (audio.js): after `haltAudio`, the context is built with its
  automatic `resume()` held (`_holdResume`), then `mixer.ready`, `prepareRealtimeVoices` and
  `warmWorkletLanes` run against it standing still (4 s deadline). `Audio.lastWarm` says what
  was built; the trail line reads `restart: the new context built and warmed in N ms (state;
  V voices, L worklet lanes)`.
- `main.js audioRestart`: halt → 1.5 s with no context → warm build → `resumeContext()`. If
  it is not running within 1.5 s the game freezes and asks for a tap; **the tap resumes THIS
  warmed context** (its `ensure()` resumes when a context exists). If 1.2 s after that tap it
  still is not running, the context is halted and the next tap builds one inside the gesture
  — the path that proved to start on the phone — and the third tap gives up as before.
- `?restartmode=warm|cold|kick` (dev builds): `warm` is the game; `cold` is the 23 Oct
  behaviour (built and started at once) for the A/B; `kick` is handover item 3 —
  `Audio.kickContext()`: the same context suspended, quiet 1.5 s, resumed, no new context
  and no tap. The trail says which ran: `restart (warm): …`, `kick: the context runs again`.
- `tests/audio-restart.js` now takes the first restart down the warm path: mixer worklets
  and the song's lanes (3 on Gravity) are ready before the context is started; the song and
  a cue are heard after. Headless WebKit starts a fresh context by itself, so "stood still
  until the tap" is reported there, not asserted.

Mac, headless WebKit, the real game at :8001 with `?audiorestart=3,10`: all three modes come
back running with no page errors; the probe after a warm restart reads cue→render 15–24 ms.

**On the phone, in this order** (each is `?audiorestart=15` on an ordinary song, then jumps):

1. `?restartmode=warm` (the default). If the jump is in time after the restart the model is
   right and this is the fix. Read the trail: `built and warmed in N ms` and how many lanes.
2. If still late: `?restartmode=kick`. In time → suspend drops the backlog on iOS and the
   kick should be the game's lever (no tap at all). Late by the same amount as before the
   kick → suspend keeps it, and the kick is out.
3. If warm is still late AND the first restart was on a HEALTHY song, the delay is below the
   context after all (the session, item 2 of the list above) and items 4–6 stand.

## 23 Oct, evening — RESOLVED: the KICK is the restart

Peter, from the iPhone: **"with restartmode=kick it is fine."** The jump sound is on the jump
again after a restart. `kick` is now the game's RESTART (`main.js audioRestartMode = 'kick'`):
the same context is suspended, left quiet for 1.5 s, and resumed (`Audio.kickContext`). No new
context, so no tap — the context is the one the first tap unlocked. iOS drops the backlog on
the suspend; what the two closing restarts left late (warm or cold) was something about a
second context, not the backlog, and it no longer matters which. `?restartmode=warm|cold`
remain on dev builds for comparison only. `tests/audio-restart.js` checks the kick (same
context, running, song on from where it was, a cue after).

So a song that is too heavy now goes: RELIEF at the first crackle (8-bit version, density
down, 1 s lookahead; the light version learned for its next start) → if the clock stays under
0.9 for 3 s, drops under 0.7, or the backlog reaches 1 s: 1.5 s of silence, then the sound
back in time → a second time in the same level/song also mutes all but drums, bass and lead
→ no third: after that the lag can build again until the level or song ends.
