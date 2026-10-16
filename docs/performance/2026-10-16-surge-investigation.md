# Surge hitch investigation

The M3 Pro desktop suite completed all 27 stages at 59.97 FPS overall. It nevertheless recorded early Surge stalls of 166–208 ms. Surge 1 and 2 both recorded a stall at simulation time 8.083 seconds / distance 1812.29. Their early-window maximum CPU draw times were 203.2 and 172 ms. The expensive work precedes the frame-gap row, so the small draw cost in that row is not evidence against a drawing stall.

A fresh local Chrome CPU profile reproduced a 296.3 ms measured draw. The expensive path was:

`drawFrame → Surge bg → paintSurgeBackdrop → glitchBackdrop → Crypt bg → drawCryptGouache → ensureBake → bakeSteps`

That path builds strips and bank masks; sampled bank-mask `getImageData` alone accounted for about 87 ms in the capture. Surge can flash another cabinet before its normal cycle slot. Although the briefing queues Crypt warm-up jobs, bot/demo and direct-entry paths can reach play without draining those jobs. Standalone Crypt already explicitly finishes this bake during stage entry; Surge did not.

The fix extends the existing entry-time `finishCryptGouacheBake()` call to Surge. It reuses the same cache, with no extra copy or art/resolution change. Cost moves into stage preparation, before stage music starts. Normal already-warmed entries return quickly. The three direct-entry regression cases verify the bake is finished before the first gameplay draw.

In a follow-up local profile, the Crypt mask readback moved beneath `start → nextCase → enter`, and the largest measured gameplay draw was 37.1 ms. These timings are indicative, not a controlled speedup: Surge chooses cosmetic effect seeds with Math.random, and the dev build can change while other work proceeds. Profiles are under `work/mockups/performance-test/surge-{cold,after}.cpuprofile`.

Remaining priorities for lower-end Macs:

1. Live Surge palette processing: `afterGround → applySurgePalette → lowRes → getImageData`. Even a small output image requires synchronizing the source canvas. The after profile sampled about 51 ms cumulatively here over the opening capture; this is not one 51 ms frame. Consider a GPU implementation only with visual parity tests and measured benefit.
2. Plumber 1's later window averaged 6.74 ms state drawing with a 15.6 ms p95 on M3 Pro. That leaves little room on slower hardware and merits its own trace before further caching changes.
3. Presentation pacing: many desktop windows have ~25 ms p95 presentation gaps despite a 60 FPS average. Inspect the fixed-step/high-refresh presentation selection before treating average FPS as smoothness.
4. Memory: reported desktop JS heap reached ~960 MiB and later fell; this is not proof of a leak. Audit retained caches and native canvas memory before adding caches. Base M1 memory headroom matters.
5. Benchmark comparability: demos skip the normal briefing and intro warm-up time, and the gameplay seed does not fix Surge's cosmetic seed. Report/replay that seed and explicitly distinguish cold entry from prepared play in subsequent measurement work.

An actual M1 remains the acceptance device. Chrome CPU throttling can expose CPU headroom problems but does not model M1 graphics, memory bandwidth or Safari behavior.

A separate Surge 3 opening check at the report's desktop viewport, with Chrome CPU throttling set to 4x, averaged 58.83 FPS. State drawing averaged 4.96 ms, p95 10.7 ms, with three >50 ms presentation gaps and an 86.7 ms maximum draw. This is evidence of remaining spikes, not M1 certification. The JSON is `work/mockups/performance-test/surge3-cpu4x.json`.
