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

| Date | Commit | Gallery | Lab | Change |
| --- | --- | --- | --- | --- |
| 2026-07-26 | `716e8e8` | [2026-07-26-716e8e8.html](2026-07-26-716e8e8.html) | -- | Add offline MIDI export and rendering tools |
| 2026-08-02 | `136ef1c` | [2026-08-02-136ef1c.html](2026-08-02-136ef1c.html) | -- | Archive published build 48bef85 |
| 2026-08-05 | `fd28b2e` | [2026-08-05-fd28b2e.html](2026-08-05-fd28b2e.html) | -- | Add mixer voice editor enhancements and tutorial script |
| 2026-08-16 | `c680f60` | [2026-08-16-c680f60.html](2026-08-16-c680f60.html) | -- | Archive published build 414ae37 |
| 2026-08-20 | `4db943a` | [2026-08-20-4db943a.html](2026-08-20-4db943a.html) | -- | Refactor TNGR-2 Chorus Handling and Improve Note FX Logic |
| 2026-08-30 | `f3ebb18` | [2026-08-30-f3ebb18.html](2026-08-30-f3ebb18.html) | -- | Layout parity: fingerprint generation, not the hero's frame |
| 2026-09-06 | `71a8e7d` | [2026-09-06-71a8e7d.html](2026-09-06-71a8e7d.html) | [bake-offs](2026-09-06-71a8e7d-lab.html) | Archive published build f7d5dae |
| 2026-09-08 | `b816b54` | [2026-09-08-b816b54.html](2026-09-08-b816b54.html) | [bake-offs](2026-09-08-b816b54-lab.html) | feat: rename 'duck' to 'slide' across the codebase |
| 2026-09-09 | `413dbd5` | [2026-09-09-413dbd5.html](2026-09-09-413dbd5.html) | [bake-offs](2026-09-09-413dbd5-lab.html) | Refactor and enhance game assets and testing framework |
| 2026-09-09 | `373d3d6` | [2026-09-09-373d3d6.html](2026-09-09-373d3d6.html) | [bake-offs](2026-09-09-373d3d6-lab.html) | Add new gallery HTML files for 2026-09-09 with large content |
| 2026-09-09 | `ec8af02` | [2026-09-09-ec8af02.html](2026-09-09-ec8af02.html) | [bake-offs](2026-09-09-ec8af02-lab.html) | feat: add Lorenzo polished variant and review page for art comparison |
| 2026-09-10 | `5450f08` | [2026-09-10-5450f08.html](2026-09-10-5450f08.html) | [bake-offs](2026-09-10-5450f08-lab.html) | Enhance Grumpos and axe mechanics; update gallery entries |
| 2026-09-10 | `b2dab03` | [2026-09-10-b2dab03.html](2026-09-10-b2dab03.html) | [bake-offs](2026-09-10-b2dab03-lab.html) | Refactor portrait preview entry and add background zoom functionality |
| 2026-09-10 | `58262f8` | [2026-09-10-58262f8.html](2026-09-10-58262f8.html) | [bake-offs](2026-09-10-58262f8-lab.html) | Refactor character editor and gallery to remove Rusty as a guest hero |
| 2026-09-14 | `31e205b` | [2026-09-14-31e205b.html](2026-09-14-31e205b.html) | [bake-offs](2026-09-14-31e205b-lab.html) | Refactor title layout and pause menu for improved alignment and readability |
