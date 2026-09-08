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
| 2026-09-02 | `4ab5228` | [2026-09-02-4ab5228.html](2026-09-02-4ab5228.html) | -- | Refactor MIDI and arrangement handling in mixer tools |
| 2026-09-03 | `f52f1d1` | [2026-09-03-f52f1d1.html](2026-09-03-f52f1d1.html) | -- | Remove unused LCD_RUNNER_STYLES and related code for the tower plumber bake-off; add new gallery entry for September 2026. |
| 2026-09-03 | `6a2d8ea` | [2026-09-03-6a2d8ea.html](2026-09-03-6a2d8ea.html) | [bake-offs](2026-09-03-6a2d8ea-lab.html) | Refactor gallery entry and shell for improved organization and functionality |
| 2026-09-03 | `c94052a` | [2026-09-03-c94052a.html](2026-09-03-c94052a.html) | [bake-offs](2026-09-03-c94052a-lab.html) | Refactor gallery archiving to include both production and lab pages |
| 2026-09-03 | `c94c455` | [2026-09-03-c94c455.html](2026-09-03-c94c455.html) | [bake-offs](2026-09-03-c94c455-lab.html) | Refactor jump height calculations and update related tests |
| 2026-09-03 | `4174be0` | [2026-09-03-4174be0.html](2026-09-03-4174be0.html) | [bake-offs](2026-09-03-4174be0-lab.html) | Add new gallery entry for September 2026 and refactor related files |
| 2026-09-04 | `7f614a7` | [2026-09-04-7f614a7.html](2026-09-04-7f614a7.html) | [bake-offs](2026-09-04-7f614a7-lab.html) | Implement audio sync calibration feature with comprehensive tests |
| 2026-09-04 | `8957756` | [2026-09-04-8957756.html](2026-09-04-8957756.html) | [bake-offs](2026-09-04-8957756-lab.html) | Refactor HUD Objective Panel Logic and Bonus Placement |
| 2026-09-04 | `6ecac0b` | [2026-09-04-6ecac0b.html](2026-09-04-6ecac0b.html) | [bake-offs](2026-09-04-6ecac0b-lab.html) | Add new Eggshell redesigns and associated HTML files |
| 2026-09-04 | `6a295d3` | [2026-09-04-6a295d3.html](2026-09-04-6a295d3.html) | [bake-offs](2026-09-04-6a295d3-lab.html) | Add bonk sound effect candidates and rendering tool |
| 2026-09-04 | `aa36e6c` | [2026-09-04-aa36e6c.html](2026-09-04-aa36e6c.html) | [bake-offs](2026-09-04-aa36e6c-lab.html) | Refactor HUD hero disc plate color and enhance girder ring mechanics |
| 2026-09-04 | `f49f539` | [2026-09-04-f49f539.html](2026-09-04-f49f539.html) | [bake-offs](2026-09-04-f49f539-lab.html) | Refactor face contour handling and improve face crop rendering |
| 2026-09-04 | `28b127f` | [2026-09-04-28b127f.html](2026-09-04-28b127f.html) | [bake-offs](2026-09-04-28b127f-lab.html) | feat: Add cape redesigns gallery and related assets |
| 2026-09-05 | `a00af6f` | [2026-09-05-a00af6f.html](2026-09-05-a00af6f.html) | [bake-offs](2026-09-05-a00af6f-lab.html) | feat: Implement eggshell reaction animations and update render-loop functionality |
| 2026-09-05 | `7924b36` | [2026-09-05-7924b36.html](2026-09-05-7924b36.html) | [bake-offs](2026-09-05-7924b36-lab.html) | Refactor touch controls layout and input handling |
| 2026-09-06 | `71a8e7d` | [2026-09-06-71a8e7d.html](2026-09-06-71a8e7d.html) | [bake-offs](2026-09-06-71a8e7d-lab.html) | Archive published build f7d5dae |
| 2026-09-07 | `6b94167` | [2026-09-07-6b94167.html](2026-09-07-6b94167.html) | [bake-offs](2026-09-07-6b94167-lab.html) | Add JMJR-4 test suites and validate playwright requirements |
| 2026-09-08 | `b816b54` | [2026-09-08-b816b54.html](2026-09-08-b816b54.html) | [bake-offs](2026-09-08-b816b54-lab.html) | feat: rename 'duck' to 'slide' across the codebase |
