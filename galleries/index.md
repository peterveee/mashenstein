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
| 2026-09-19 | `cef82df` | [2026-09-19-cef82df.html](2026-09-19-cef82df.html) | [bake-offs](2026-09-19-cef82df-lab.html) | Settings reset asks with YES/NO buttons; trim three stale touch hints |
| 2026-09-20 | `6e67727` | [2026-09-20-6e67727.html](2026-09-20-6e67727.html) | [bake-offs](2026-09-20-6e67727-lab.html) | Archive published build 0862cd5 |
| 2026-09-22 | `b9c3169` | [2026-09-22-b9c3169.html](2026-09-22-b9c3169.html) | [bake-offs](2026-09-22-b9c3169-lab.html) | Refactor HUB_LIGHT_Y and REFLECT_SOLE_DROP to remove export and streamline code; add proposed mechanic ideas for Crypt Shift and Neon Blasters. |
| 2026-09-23 | `eb03b14` | [2026-09-23-eb03b14.html](2026-09-23-eb03b14.html) | [bake-offs](2026-09-23-eb03b14-lab.html) | Add tests for neon city arrival and moon phases |
| 2026-09-23 | `77ae44b` | [2026-09-23-77ae44b.html](2026-09-23-77ae44b.html) | [bake-offs](2026-09-23-77ae44b-lab.html) | Add neon-themed candidates and gravity mechanics for enhanced gameplay experience |
| 2026-09-24 | `3bce133` | [2026-09-24-3bce133.html](2026-09-24-3bce133.html) | [bake-offs](2026-09-24-3bce133-lab.html) | Update mix.js assertions for remixed song settings |
| 2026-09-24 | `4aaa009` | [2026-09-24-4aaa009.html](2026-09-24-4aaa009.html) | [bake-offs](2026-09-24-4aaa009-lab.html) | Update LEVEL_SCENERY.md to clarify patchwork fields animation; enhance drone column spacing in entities.js and spawner.js for improved gameplay dynamics. |
| 2026-09-24 | `5c84e17` | [2026-09-24-5c84e17.html](2026-09-24-5c84e17.html) | [bake-offs](2026-09-24-5c84e17-lab.html) | Refactor and enhance various components across the codebase |
| 2026-09-24 | `3623387` | [2026-09-24-3623387.html](2026-09-24-3623387.html) | [bake-offs](2026-09-24-3623387-lab.html) | Add new level scenery and obstacles for Plumber, Speed, Frost, and Neon stages; implement feature reel rendering tool |
| screens.ht | `screens` | [screens.html](screens.html) | -- | (commit not in history) |
