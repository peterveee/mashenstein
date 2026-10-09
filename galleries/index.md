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
| 2026-10-03 | `950d1ce` | [2026-10-03-950d1ce.html](2026-10-03-950d1ce.html) | [bake-offs](2026-10-03-950d1ce-lab.html) | feat: THE LAB opens with NEON ORBIT, a starter song |
| 2026-10-03 | `edd636b` | [2026-10-03-edd636b.html](2026-10-03-edd636b.html) | [bake-offs](2026-10-03-edd636b-lab.html) | Add mirror ball candidates, dance legs, LED slogans, mood names, and mood song name generation |
| 2026-10-04 | `ce94f69` | [2026-10-04-ce94f69.html](2026-10-04-ce94f69.html) | [bake-offs](2026-10-04-ce94f69-lab.html) | Archive published build edd636b |
| 2026-10-04 | `c25625e` | [2026-10-04-c25625e.html](2026-10-04-c25625e.html) | [bake-offs](2026-10-04-c25625e-lab.html) | feat: add new Banger report and section effects functionality |
| 2026-10-05 | `cac6fcc` | [2026-10-05-cac6fcc.html](2026-10-05-cac6fcc.html) | [bake-offs](2026-10-05-cac6fcc-lab.html) | feat: add 'more' variation to banger options and update related functionality |
| 2026-10-06 | `9db55ef` | [2026-10-06-9db55ef.html](2026-10-06-9db55ef.html) | [bake-offs](2026-10-06-9db55ef-lab.html) | Add comprehensive tests for Banger Rolls styles and their properties |
| 2026-10-06 | `1c8865c` | [2026-10-06-1c8865c.html](2026-10-06-1c8865c.html) | [bake-offs](2026-10-06-1c8865c-lab.html) | feat(banger): enhance track effects planning by excluding percussion lanes from treatment budget |
| 2026-10-06 | `1eaf382` | [2026-10-06-1eaf382.html](2026-10-06-1eaf382.html) | [bake-offs](2026-10-06-1eaf382-lab.html) | fix(audio): finished drum hits leave the render graph — the banger slow-down |
| 2026-10-06 | `80cf910` | [2026-10-06-80cf910.html](2026-10-06-80cf910.html) | [bake-offs](2026-10-06-80cf910-lab.html) | feat(banger): club pitch fader, Dolores's push broom, BOLT on the bar line, no swipe-back |
| 2026-10-06 | `3e5d16a` | [2026-10-06-3e5d16a.html](2026-10-06-3e5d16a.html) | [bake-offs](2026-10-06-3e5d16a-lab.html) | Refactor code structure for improved readability and maintainability |
| 2026-10-07 | `fcd3390` | [2026-10-07-fcd3390.html](2026-10-07-fcd3390.html) | [bake-offs](2026-10-07-fcd3390-lab.html) | Add mermaid sprite implementation with various styles and animations |
| 2026-10-07 | `5da2928` | [2026-10-07-5da2928.html](2026-10-07-5da2928.html) | [bake-offs](2026-10-07-5da2928-lab.html) | Add Banger Fusion functionality and related tests |
| 2026-10-07 | `8872f69` | [2026-10-07-8872f69.html](2026-10-07-8872f69.html) | [bake-offs](2026-10-07-8872f69-lab.html) | Add tests for Banger Mood Pairs functionality |
| 2026-10-07 | `8519c68` | [2026-10-07-8519c68.html](2026-10-07-8519c68.html) | [bake-offs](2026-10-07-8519c68-lab.html) | Enhance pre-push hook to log test results and notify on failure; update gallery entries and descriptions |
| 2026-10-07 | `824c335` | [2026-10-07-824c335.html](2026-10-07-824c335.html) | [bake-offs](2026-10-07-824c335-lab.html) | Implement strike completion messages in BangerClubState and add related tests |
| 2026-10-08 | `1bac968` | [2026-10-08-1bac968.html](2026-10-08-1bac968.html) | [bake-offs](2026-10-08-1bac968-lab.html) | Enhance app manifest and lifecycle handling for lock screen integration; update tests for consistency |
| 2026-10-08 | `3d80115` | [2026-10-08-3d80115.html](2026-10-08-3d80115.html) | [bake-offs](2026-10-08-3d80115-lab.html) | Jukebox REPEAT switch; lock-screen stand-in back on |
| 2026-10-09 | `3093b8d` | [2026-10-09-3093b8d.html](2026-10-09-3093b8d.html) | [bake-offs](2026-10-09-3093b8d-lab.html) | Update chip result trims for improved audio balance across various tracks |
