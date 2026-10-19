# Asset gallery history

Each file is a self-contained snapshot of every drawable in the game as of
that commit -- backgrounds, heroes, props, world sprites, obstacles, pickups,
the style matrix, and HUD bits. From 2026-09 a snapshot is two files: the
gallery itself and a Lab page holding that commit's open bake-offs, linked
to each other at the top. Open one directly in a browser -- no server
needed. Zoom, filter by name, and click any tile to save it as a PNG.

These render by calling the real draw functions, so a snapshot cannot drift
from the source it was built at.

Written by `tools/archive-gallery.js`, on pushes to `main` that touch art.
It keeps the last snapshot of each week plus every snapshot from the last
seven days, so an iteration in flight keeps all of its steps while older
history thins to one a week. Do not edit by hand.

For the actual running game instead of isolated drawables, see
[screens.html](screens.html) -- every UI screen and cabinet, portrait and
landscape side by side. It is a live snapshot, regenerated on demand with
`npm run gallery:screens`, not one entry per commit.

| Date | Commit | Gallery | Lab | Change |
| --- | --- | --- | --- | --- |
| 2026-07-26 | `716e8e8` | [2026-07-26-716e8e8.html](2026-07-26-716e8e8.html) | -- | Add offline MIDI export and rendering tools |
| 2026-08-02 | `136ef1c` | [2026-08-02-136ef1c.html](2026-08-02-136ef1c.html) | -- | Archive published build 48bef85 |
| 2026-08-05 | `fd28b2e` | [2026-08-05-fd28b2e.html](2026-08-05-fd28b2e.html) | -- | Add mixer voice editor enhancements and tutorial script |
| 2026-08-16 | `c680f60` | [2026-08-16-c680f60.html](2026-08-16-c680f60.html) | -- | Archive published build 414ae37 |
| 2026-08-20 | `4db943a` | [2026-08-20-4db943a.html](2026-08-20-4db943a.html) | -- | Refactor TNGR-2 Chorus Handling and Improve Note FX Logic |
| 2026-08-30 | `f3ebb18` | [2026-08-30-f3ebb18.html](2026-08-30-f3ebb18.html) | -- | Layout parity: fingerprint generation, not the hero's frame |
| 2026-09-06 | `71a8e7d` | [2026-09-06-71a8e7d.html](2026-09-06-71a8e7d.html) | [bake-offs](2026-09-06-71a8e7d-lab.html) | Archive published build f7d5dae |
| 2026-09-10 | `58262f8` | [2026-09-10-58262f8.html](2026-09-10-58262f8.html) | [bake-offs](2026-09-10-58262f8-lab.html) | Refactor character editor and gallery to remove Rusty as a guest hero |
| 2026-09-20 | `6e67727` | [2026-09-20-6e67727.html](2026-09-20-6e67727.html) | [bake-offs](2026-09-20-6e67727-lab.html) | Archive published build 0862cd5 |
| 2026-09-27 | `833af42` | [2026-09-27-833af42.html](2026-09-27-833af42.html) | [bake-offs](2026-09-27-833af42-lab.html) | feat: add audio reports functionality and UI updates |
| 2026-10-04 | `c25625e` | [2026-10-04-c25625e.html](2026-10-04-c25625e.html) | [bake-offs](2026-10-04-c25625e-lab.html) | feat: add new Banger report and section effects functionality |
| 2026-10-11 | `906ea68` | [2026-10-11-906ea68.html](2026-10-11-906ea68.html) | [bake-offs](2026-10-11-906ea68-lab.html) | Add WASM audio engine kernel implementations in JS and C, along with a probe for browser compatibility |
| 2026-10-12 | `ae27abf` | [2026-10-12-ae27abf.html](2026-10-12-ae27abf.html) | [bake-offs](2026-10-12-ae27abf-lab.html) | Crash log: never let the trail break boot |
| 2026-10-13 | `d11c0b6` | [2026-10-13-d11c0b6.html](2026-10-13-d11c0b6.html) | [bake-offs](2026-10-13-d11c0b6-lab.html) | Fix the deploy: Gravity Grid cues on the SFX desk, six stale test checks updated |
| 2026-10-13 | `c7addb6` | [2026-10-13-c7addb6.html](2026-10-13-c7addb6.html) | [bake-offs](2026-10-13-c7addb6-lab.html) | Fix sweep reach calculation in effects editor and add new gallery files for October 2026 |
| 2026-10-14 | `f31338c` | [2026-10-14-f31338c.html](2026-10-14-f31338c.html) | [bake-offs](2026-10-14-f31338c-lab.html) | feat: add surge HUD effects with dynamic movement and visual glitches |
| 2026-10-14 | `c573fc8` | [2026-10-14-c573fc8.html](2026-10-14-c573fc8.html) | [bake-offs](2026-10-14-c573fc8-lab.html) | Fix the deploy: surge HUD on a stub canvas, two stale gravity test checks |
| 2026-10-14 | `b7e2f29` | [2026-10-14-b7e2f29.html](2026-10-14-b7e2f29.html) | [bake-offs](2026-10-14-b7e2f29-lab.html) | Add office worker and window cleaner character rendering |
| 2026-10-15 | `f2ba693` | [2026-10-15-f2ba693.html](2026-10-15-f2ba693.html) | [bake-offs](2026-10-15-f2ba693-lab.html) | Add tests for cabinet unlocks, gravity star warmup, hero rendering, office wall caching, and office zombies |
| 2026-10-15 | `ed74725` | [2026-10-15-ed74725.html](2026-10-15-ed74725.html) | [bake-offs](2026-10-15-ed74725-lab.html) | Add zap sound effect and visual candidates for hero contact with live wire |
| 2026-10-15 | `48be4f6` | [2026-10-15-48be4f6.html](2026-10-15-48be4f6.html) | [bake-offs](2026-10-15-48be4f6-lab.html) | Add tests for M-A-S-H letters, performance capture, and scenery texture caching |
| 2026-10-16 | `f9aac8d` | [2026-10-16-f9aac8d.html](2026-10-16-f9aac8d.html) | [bake-offs](2026-10-16-f9aac8d-lab.html) | Add test for giant snowball kick behavior in snowball-kick.js |
| 2026-10-16 | `95019a5` | [2026-10-16-95019a5.html](2026-10-16-95019a5.html) | [bake-offs](2026-10-16-95019a5-lab.html) | Refactor performance testing and audio processing; enhance report structure and profiling |
| 2026-10-16 | `e3174cb` | [2026-10-16-e3174cb.html](2026-10-16-e3174cb.html) | [bake-offs](2026-10-16-e3174cb-lab.html) | Add pitFall.js for character falling mechanics and animations |
| 2026-10-16 | `35da346` | [2026-10-16-35da346.html](2026-10-16-35da346.html) | [bake-offs](2026-10-16-35da346-lab.html) | feat: add AboutState and integrate into menu flow |
| 2026-10-18 | `d6ac24f` | [2026-10-18-d6ac24f.html](2026-10-18-d6ac24f.html) | [bake-offs](2026-10-18-d6ac24f-lab.html) | Enhance trophy CRT feed rendering and caching |
| 2026-10-18 | `9cee3fd` | [2026-10-18-9cee3fd.html](2026-10-18-9cee3fd.html) | [bake-offs](2026-10-18-9cee3fd-lab.html) | Add vacuum robot bakeoff feature with candidate designs and animations |
| 2026-10-19 | `cf2e65c` | [2026-10-19-cf2e65c.html](2026-10-19-cf2e65c.html) | [bake-offs](2026-10-19-cf2e65c-lab.html) | Enhance vacuum robot bakeoff functionality and add new gallery files |
| 2026-10-19 | `2696638` | [2026-10-19-2696638.html](2026-10-19-2696638.html) | [bake-offs](2026-10-19-2696638-lab.html) | Refactor tests and implement new beat contact test |
