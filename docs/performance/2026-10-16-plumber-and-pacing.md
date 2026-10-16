# Plumber 1 late scenery and presentation pacing

The desktop full-level report pointed to two distinct issues: Plumber 1's late scenery had high drawing cost, while high-refresh displays showed uneven presentation gaps despite an approximately 60 FPS average. I reproduced both locally at a 1430×1166 CSS viewport and DPR 2.

In Plumber 1, the patchwork field entrance was the dominant sampled CPU path. It renders three scenery passes into reusable scratch canvases, then copies the rising ground back in narrow vertical strips. These were 3 logical pixels wide, creating hundreds of canvas-to-canvas copies per frame. Increasing the strip to 8 pixels leaves the same baked field artwork and height function in place while reducing the copies by roughly two thirds. A captured late gameplay frame shows the patchwork fields and foreground hill drawing normally.

| Late Plumber 1 window | Before | After |
| --- | ---: | ---: |
| Mean state draw | 13.76 ms | 9.46 ms |
| p95 state draw | 25.9 ms | 15.1 ms |
| Max state draw | 178.6 ms | 106.2 ms |

The paired reports and CPU profiles are in `work/mockups/performance-test/plumber-late-{before,after}.{json,cpuprofile}`. This is a local headless Chrome comparison, not an M1 measurement. The remaining draw cost is still substantial and the next profile should target the exact mid-ramp section if an M1 run struggles.

The presentation loop previously decided whether to skip a callback using the fixed-step simulation result (`steps === 0`). On a 120 Hz callback stream with ordinary timestamp jitter, this produced alternating roughly 8 ms and 25 ms gaps between drawn frames. Presentation now follows its own 60 Hz deadline; simulation still runs on its original fixed 60 Hz accumulator. A long stall is excluded from the refresh-rate estimate and cannot trigger a burst of closely spaced presentations. The deterministic cadence test verifies 60, 75, 120, 144, and 240 Hz callback streams and pause/resume behavior.

The M1 still needs a direct run. The screenshot and local profile establish that the change helps this desktop configuration; they cannot establish graphics or memory headroom on another machine.
