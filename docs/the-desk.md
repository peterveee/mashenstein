# THE DESK

```
npm run desk        # http://127.0.0.1:8000
```

One page listing every tool server in the project, what it is for, whether it is
running, and a button to start or stop it. It exists because the tools had
quietly grown into a port collision — the level editor and the SFX desk both
claimed 8020, the character editor and the composition tuner both claimed 8030 —
so half of them could not run at the same time and nobody found out until the
second one failed to boot.

## Straight in

Every tool has a URL on the desk that goes to the tool:

```
http://localhost:8000/mixer          → :8010
http://localhost:8000/game           → :8001
http://localhost:8000/sfx            → :8020
http://localhost:8000/levels         → :8021
http://localhost:8000/characters     → :8030
http://localhost:8000/composition    → :8031
```

Warm, it redirects. Cold, it starts the tool first and holds the request until
the port answers — a second or two for the bundling tools, longer for the mixer
— then redirects. A bookmark on `/mixer` therefore works whether or not a mixer
is running, which is the whole point of it.

The direct ports are unchanged and still the primary way in: `localhost:8010` is
the mixer today exactly as it was before any of this existed, and every tool
still runs standalone from its own npm script. The desk is a launcher, not a
dependency — nothing in `tools/` knows it exists.

## The port map

| Tool | npm | Port | Writes |
| --- | --- | --- | --- |
| THE GAME | `npm run dev` | 8001 | — |
| MIXER | `npm run mixer` | 8010 | `src/data/songs/` |
| SFX DESK | `npm run sfx` | 8020 | `SFX_TRIM` |
| LEVEL EDITOR | `npm run levels` | 8021 | `src/data/stage-layouts.js` |
| CHARACTER EDITOR | `npm run characters` | 8030 | hero spec files |
| COMPOSITION TUNER | `npm run composition` | 8031 | `src/data/composition-profiles.js` |

The level editor moved off 8020 and the composition tuner off 8030 when the desk
was built; the four numbers people have in muscle memory did not move.

The map lives once, in `tools/desk.js`, and every row of it is checked against
the tool's own source by `tests/desk.js`: the script exists, the env var the
desk hands a port to is the one that file reads, that file's own default IS the
port on the card, and no two tools want the same slot. A port moved in one place
and not the other is a red suite rather than a launcher that sends you somewhere
empty.

## Adopt, never kill

A port that is already answering belongs to somebody else — most likely a live
mixer, mid-song, with an unsaved draft on screen. The desk links to it, shows it
as running, tags it `already running — not mine to stop`, and the stop endpoint
refuses it. Only a process the desk itself spawned is one the desk will stop,
including on its own ^C: quitting the desk takes its own children down and
leaves everything else alone.

That is the rule whether the other process was started by hand in a terminal, by
another desk, or by anything else. The desk cannot tell the difference and does
not try: the port answered, so it is not mine.

## Background browsers

Every Chromium that Playwright launched — the render tools, the tests, the mixer's
warm renderer, a Claude session's Playwright MCP — is listed under BACKGROUND
BROWSERS with its CPU, memory, uptime and the process that owns it. The header chip
turns red when any of them is busy. A headless one has no window, so this is the
only place a stray one shows up: on 23–24 Sep 2026 two of them pegging the CPU made
two nights of song and level glitches that were really a busy machine.

This is the one thing the desk will kill that it did not start, and only on an
explicit click — KILL arms for four seconds, SURE? kills. An ORPHAN (its script is
gone) is always safe. A SCRIPT row names the job that owns it; if that job is a
render still running in another session, killing its browser fails the render. The
mixer's warm renderer is refused, for the same reason as adopt-never-kill.

The same list from a terminal: `npm run browsers` (`tools/browsers.js`, which also
takes `--kill`, `--kill <pid>` and `--kill-all`). It exits 1 when anything is
running, so a bench can refuse to start on a noisy machine.

## Audio reports

```
http://localhost:8000/reports
```

Three RUN cards under AUDIO REPORTS, and a page that shows what they found:

| Card | Runs | Writes |
| --- | --- | --- |
| SONG LEVELS: MEASURE | `tools/song-levels.js` | the report only |
| SONG LEVELS: APPLY | `tools/song-levels.js --apply` | each off-line song's `master` in `src/data/songs/` |
| BASS REPORT | `tools/bass-report.js <ticked songs> [--lanes]` | the report only; unticked songs keep their last rows |

Each tool writes its latest result to `work/local/reports/` wherever it was run
from, terminal included, so `/reports` is always the last run. The page redraws
when a file changes.

- **Song levels** shows every song that ships against its line: -21 LUFS for the nine
  cabinets, the finale and the credits megamix; -24 for the title, the Food Court
  and the shop, which play between games. It shows how far off each one is, and the
  master that would put it back.
- **Bass & band balance** shows seven bands per song, each measured against that
  song's own loudness and coloured where it sits 2 dB or more off the median of
  the finished cabinets. Below the table, **What it's telling you** turns each
  coloured band into advice: what you'd hear, which Channel EQ band to reach for, and
  which strip carries it once + LANES has run. A band 15 dB or more under is reported as
  a missing part, not an EQ job. The title, Food Court, shop, finale and megamix are
  compared too, but kept out of the median.
- **Who carries the low end** has one card per song broken down with + LANES. It
  shows each strip's share of the low bands, which is where a Channel EQ goes,
  and is tagged when the song has changed since.

APPLY asks twice, because it edits song files. On a song with nothing on its master
chain it moves the master fader. On a song with a compressor, limiter or exciter on
the master it moves a Gain at the END of that chain instead, adding one the first
time: the master fader drives the chain, so moving it would change how hard the
compressor works rather than just the level. The master fader stays the mix's.
Keep the tool's Gain last; put an effect after it and the next run adds a fresh one.
It re-measures what it moved and goes again until it lands, up to three passes. Save the mixer first,
and reload the song there afterwards: a mixer save from a stale copy puts the old
master back. The desk shows those steps above the cards. Every run is under `nice`, because all of
them render through headless Chromium for minutes at a time, and the mixer's
playback comes first.

### Background or full speed

The audio cards and the two gallery refreshes each have a **BACKGROUND / FULL SPEED**
pair, and BACKGROUND is the default. In BACKGROUND the job runs in macOS's background
band (what `taskpolicy -b` sets): efficiency cores only and throttled disk, so the
performance cores stay with the mixer and the game. It is slower for it: a CPU-bound
loop measured 4–5× slower, so a fifteen-minute SONG LEVELS run can take an hour.

Flip to FULL SPEED before RUN, or while it runs: the desk moves every process in the
job's tree (node, its Chromium, every renderer) on the spot, and whatever the job
starts afterwards follows. Flipping back works the same way. The setting is the
desk's, not the page's, so it holds across a reload until the desk restarts.

FRAME REPORT has no switch. It measures frame time, and in the background band
every number would come from the efficiency cores.

## Performance

Two RUN cards under PERFORMANCE, reported at the top of the same `/reports` page
(`#frames`):

| Card | Runs | Writes |
| --- | --- | --- |
| FRAME REPORT | `tools/frame-report.js <ticked cabinets>` | the report only; unticked cabinets keep their last rows |

It plays every stage of cabinets 1–6 on an iPhone 15 Pro-shaped screen, at three points
a stage in portrait and at the halfway point in landscape, and times every frame for six
seconds each. The render density is pinned where that phone plays (2 portrait, 3
landscape), and the 2D renderer is forced, since headless Chromium has no GPU. Each row
is a stage's slowest point:
- **OK**: the typical frame fits the 16.7 ms budget.
- **MARGINAL**: it fits, but one frame in ten or more takes over 20 ms.
- **OVER**: the typical frame misses, which reads as steady judder.

The numbers are this Mac's, not the phone's. Read them against each other: cabinet
against cabinet, portrait against landscape, and this run against the last one (the
page shows the change). It uses THE GAME on :8001, or starts the dev server for the run
and stops it after. It takes about twelve minutes; run it with the mixer quiet, since
anything else busy on the machine shows up as slow frames. `--quick` measures portrait
only, one point a stage.

## When a tool will not start

The card keeps the last few lines the tool printed and shows them once it is not
running, which is usually enough — a port held by something else, or a crash on
boot, says so in its own words. A shortcut URL for a tool that dies on the way
up answers 502 with the same output rather than spinning, and tells you the npm
script to run by hand for the rest of it.

## Why they are separate processes

Because the mixer wants a core to itself — the desk's whole audio graph is
budgeted against one — and because a level editor that threw inside a shared
process would take a mix down with it. One page in front of six servers is worth
having; one server behind six pages is not.
