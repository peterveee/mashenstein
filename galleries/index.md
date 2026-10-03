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
| 2026-09-27 | `18acca2` | [2026-09-27-18acca2.html](2026-09-27-18acca2.html) | [bake-offs](2026-09-27-18acca2-lab.html) | feat: add crypt enemies and headstone drawing functionality |
| 2026-09-27 | `2b096da` | [2026-09-27-2b096da.html](2026-09-27-2b096da.html) | [bake-offs](2026-09-27-2b096da-lab.html) | Add time-arc.js for dynamic lighting and color palettes in MCM act |
| 2026-09-27 | `833af42` | [2026-09-27-833af42.html](2026-09-27-833af42.html) | [bake-offs](2026-09-27-833af42-lab.html) | feat: add audio reports functionality and UI updates |
| 2026-09-28 | `054c34f` | [2026-09-28-054c34f.html](2026-09-28-054c34f.html) | [bake-offs](2026-09-28-054c34f-lab.html) | Add speed-mcm.js test suite for mid-century style pack validation |
| 2026-09-29 | `924c72c` | [2026-09-29-924c72c.html](2026-09-29-924c72c.html) | [bake-offs](2026-09-29-924c72c-lab.html) | feat: add frost crayon sky rendering and portal train clearance tests |
| 2026-10-01 | `4bc4afd` | [2026-10-01-4bc4afd.html](2026-10-01-4bc4afd.html) | [bake-offs](2026-10-01-4bc4afd-lab.html) | Add audition scripts for piano, slap bass, and woodwind instruments |
| 2026-10-03 | `950d1ce` | [2026-10-03-950d1ce.html](2026-10-03-950d1ce.html) | [bake-offs](2026-10-03-950d1ce-lab.html) | feat: THE LAB opens with NEON ORBIT, a starter song |
