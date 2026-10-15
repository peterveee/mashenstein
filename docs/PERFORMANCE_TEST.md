# Automated performance test

Open **Settings → Performance Test** in either the normal or dev build. Quick runs four stages twice (~5 minutes). Full runs a representative stage in each cabinet plus Office 3, twice (~12 minutes). The bot uses a disposable save, Lorenzo, fixed seeds and invulnerability; a mistake does not end the sample. It is a reactive bot, not a recording of human inputs. Use the same suite and orientation on desktop and phone. Keep the app visible. Backgrounding or rotating stops the test with an interrupted report.

The test pins resolution to the starting density and retains music settings. On exit it restores the prior density/pin policy. This is protocol `bot-30s-fixed-density-v2`; older v1 reports allowed adaptation and are not directly comparable. It disables the installed dev toolkit while playing and suspends breadcrumb persistence/uploads. Renderer-settle saving/telemetry is suppressed during the suite. Shared menu-time warmers recognize bot shells as gameplay. Video recording must be stopped first.

Afterwards use **Share / download report** or **Copy report**. iPhone uses file sharing where supported; desktop downloads JSON. Only the last report is saved locally, once after playback stops; Previous report reopens it. Back returns to Settings. Nothing is automatically sent.

Each case measures 30 simulation seconds after run-in and the first two run seconds. Entry wall time is separate. Two passes expose cache reuse and growth; neither is a controlled cold-start test. Tests cover opening portions, not complete levels or all bosses. The bot and timing hooks have overhead, recorded separately where possible.

Report contents:
- Build, browser, viewport, settings, dev-build flag, seed, stage, pass and completion status.
- Presented frame interval mean/95th/99th/worst and gaps over 25/50 ms.
- Simulation, bot, audio scheduler, state draw, final blit, dev hook and diagnostic timings.
- Thirty worst frames per case with run time and distance.
- Renderer density/backend before and after, upload/overlay timings, prop cache allocations and resident bytes, audio queue health, JS heap when supported.

Interpretation: update includes bot time; blit includes overlay painters (including the hero). These categories must not all be added together. Audio includes timer-driven scheduler calls between presents. A long gap and expensive work in the same row do not establish causality; prior-frame work and GPU/compositor delays matter too. GC and GPU time are not directly measured. Prop-cache bytes are not total texture memory. iOS generally does not expose JS heap. No automatic bottleneck verdict is made.

Implementation: opt-in bounded typed-array capture (12,000 frames per case), no sampling timers, no per-frame network/storage. Normal play takes inactive branches only. Stop/error/exit disarms capture, releases bot input, and restores the toolkit state. The temporary density pin prevents adaptive quality reductions from hiding slow rendering.

Validation: timing bounds/cleanup tests; existing attract/save isolation and lifecycle tests; desktop and portrait browser smoke runs with shortened samples, including export. Physical-phone results remain user-run acceptance.

Browser evidence is in `work/mockups/performance-test/`: all ten desktop stage controllers completed two-second smoke samples; four quick-suite controllers completed in portrait. Desktop download was exercised. The portrait share payload was verified with a stub of the OS share API; the actual iPhone share sheet still needs device confirmation. Smoke timings are functional checks, not performance verdicts.
