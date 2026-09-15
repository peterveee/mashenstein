# MASHENSTEIN — teaser shooting script

GENERATED. Do not hand-edit: `node work/local/teaser/script.mjs` rewrites it from
`work/local/teaser/shots-v3.json`, which `build-v3.mjs` writes. Change the cut there.

## The shape of it

Everything is locked to the bar. RHYTHM BANKRUPTCY runs at 124bpm, so one bar is
**1.9355s** and every shot length in the cut is a whole or half multiple of it. That is
why the cut feels like it is cutting to the music rather than near it.

- **Music**: bars 1–4 under the opening cards, then a hard butt to **bar 29** for the
  body. Butted on the bar line, never cross-faded — a cross-fade blurs the downbeat the
  cut is locked to.
- **Head**: a half beat of black before the first picture. The music starts WITH the
  picture, not under the leader.
- **Tail**: the last music bar is the CRT switching off. After that it is silent —
  Gary, then the end card, then black.

## Rules the framing follows

- **Shot at 3840x2160.** A 1920x1080 crop is therefore a NATIVE 2x zoom with no
  upscaling, and an uncropped shot downsamples from 4K. The game runs 121fps live at 4K
  and captures 51–54fps, so this costs nothing. Density is PINNED (`?density=8`) or the
  adaptive controller can step down mid-take and change resolution mid-file.
- **Nothing clipped.** Crops stay inside y 168–1974 so neither the top HUD bar nor the
  bottom weapon strip can show a sliver, and the action shots sit below y≈760 so the
  game's centred speech banners are not sliced in half. A 1440-tall crop cannot clear
  those banners at all, which is why the action shots are all at the native 2x.
- **No gorilla.** The rooftop gorilla is a landmark in the LCD skyline shared by every
  rhythm stage and is wired to the barrel-drop mechanic, so it cannot be switched off.
  In rhythm-3 he sits at ~88% of frame width in every frame, so the crop clears him.
  In rhythm-1 he is DEAD CENTRE in every phase, so rhythm-1 is not in the cut at all —
  Kiko's line is shot on 3-3 instead.

## Source takes

All under `work/video/`, all 3840x2160, all reproducible — the seeds are fixed and the
4K re-takes landed on the same frame timings as the 1080p ones to within 0.02s.

| take | what it is | shots |
| --- | --- | --- |
| `k-hub` | HUB — food court, fresh save, walking right | 2 |
| `k-toaster` | SPEED-1 — bot play, seed 31 (jumps for the toaster) | 2 |
| `k-frost1` | FROST-1 — bot play, Grumpos seed 51 | 3 |
| `k-finish` | PLUMBER-1 — bot play, full stage: has the spring fork AND the finish | 1 |
| `k-frost3` | FROST-3 — bot play, B-33P seed 53 | 1 |

Recorded by `record-4k.sh` via `mark.mjs`, which logs when the set piece actually
happens (`--mark=loop,bonk,portal,appliance,rewind,finish`) and can force one
(`--fire=rewind@14`). The in-points below come from those marks, not from hunting.

## The cut

| # | at | bars | shot | source | in | crop |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0:00.00 | 0.13 | black leader | `black.png` | — | — |
| 1 | 0:00.24 | 1.50 | INSERT COIN | `insert.mp4` | 0s | — |
| 2 | 0:03.15 | 1 | ACT I card | `card-act1a.png` | — | — |
| 3 | 0:05.08 | 1 | EMERGENCY LIGHTING card | `card-act1b.png` | — | — |
| 4 | 0:07.02 | 0.50 | FOOD COURT floor (half bar) | `k-hub` | 7.9s | 2400x1350 @700,350 |
| 5 | 0:07.98 | 2 | plumber-1 Lorenzo (slide kick) | `work/video/p-lorenzo-20260915-225241.mp4` | 9.979032258064516s | — |
| 6 | 0:11.85 | 1 | L5 LORENZO card | `say-lorenzo.png` | — | — |
| 7 | 0:13.79 | 1 | PORTAL hero swap | `k-toaster` | 34.2s | wide (4K) |
| 8 | 0:15.73 | 1 | RUSTY kicks the cone | `work/video/p-rusty-20260915-220954.mp4` | 4.9s | — |
| 9 | 0:17.66 | 1.50 | speed-1 THE LOOP (zoom) | `work/video/k2-loop-20260915-210506.mp4` | 30.2s | 2560x1440 @0,470 |
| 10 | 0:20.56 | 0.50 | FOOD COURT: the dark cabinets | `k-hub` | 4.6s | 2880x1620 @300,220 |
| 11 | 0:21.53 | 1 | K4 KIKO card | `say-kiko.png` | — | — |
| 12 | 0:23.47 | 1.50 | KIKO runs and kicks the barrel | `work/video/k2-kiko-20260915-210715.mp4` | 14.52s | 3100x1744 @0,416 |
| 13 | 0:26.37 | 0.50 | EGGSHELL takes the hit (zoom) | `work/video/k2-kiko-20260915-210715.mp4` | 17.42s | 1700x956 @700,200 |
| 14 | 0:27.34 | 1 | E1 EGGSHELL card | `say-eggshell.png` | — | — |
| 15 | 0:29.27 | 2 | frost-1 Grumpos axe (zoom) | `k-frost1` | 1s | 2560x1440 @11,534 |
| 16 | 0:33.15 | 1 | REWIND power-up | `work/video/p-rewind-20260915-223702.mp4` | 9.55s | — |
| 17 | 0:35.08 | 0.75 | FERNWICK looses an arrow | `work/video/k2-fernbow-20260915-234820.mp4` | 14.45s | — |
| 18 | 0:36.53 | 0.25 | roll speed | `work/video/k2-loop-20260915-210506.mp4` | 1s | — |
| 19 | 0:37.02 | 0.25 | roll SPRING pad | `k-finish` | 30.95s | wide (4K) |
| 20 | 0:37.50 | 0.25 | roll plumber | `work/video/k2-plumber1-20260915-210307.mp4` | 17.4s | — |
| 21 | 0:37.98 | 0.25 | roll speed | `work/video/k2-loop-20260915-210506.mp4` | 18s | 1920x1080 @50,894 |
| 22 | 0:38.47 | 0.25 | roll frost-1 | `k-frost1` | 2.5s | wide (4K) |
| 23 | 0:38.95 | 0.25 | roll speed toaster | `k-toaster` | 25s | wide (4K) |
| 24 | 0:39.44 | 0.25 | roll frost-3 Fernwick | `k-frost3` | 42s | wide (4K) |
| 25 | 0:39.92 | 0.25 | roll frost-1 | `k-frost1` | 20s | wide (4K) |
| 26 | 0:40.40 | 0.25 | roll rhythm (Kiko) | `work/video/k2-kiko-20260915-210715.mp4` | 5.3s | 3100x1744 @0,416 |
| 27 | 0:40.89 | 1 | FINISH: LORENZO takes the flag | `work/video/p-fin-lorenzo-20260916-005742.mp4` | 4.15s | — |
| 28 | 0:42.82 | 0.75 | pit gag (Clara goes under) | `work/video/p-pit-clara-20260916-004012.mp4` | 26.4s | 1700x956 @560,1204 |
| 29 | 0:44.27 | 1.13 | FLOOR card | `card-floor.png` | — | — |
| 30 | 0:46.45 | 1.87 | C3 Clara TO BE CONTINUED (push in, hold) | `claracard.mp4` | 0s | — |
| 31 | 0:50.08 | 0.31 | SCREEN CLOSES on the card | `crtoff.mp4` | — | — |
| 32 | 0:50.68 | 1.34 | GARY peeks, far left | `gary.mp4` | 0s | — |
| 33 | 0:53.28 | 3 | TITLE + COMING SOON (held) | `titleclip.mp4` | 0s | — |
| 34 | 0:59.09 | 0.25 | black tail | `black.png` | — | — |

Total **59.57s**.

## Spoken lines

Four speech cards, forced through `RunState.say` by `bubble.mjs` and screenshot at
DPR 2. The stage is PAUSED before the line is set — stage 1-1 has its own intro line
that otherwise re-queues straight over the forced one — and the dev status strip and
the run's control legend are suppressed for the shot.

| who | line | shot on |
| --- | --- | --- |
| LORENZO | UNLICENSED, UNBOTHERED, UNDER WARRANTY. | plumber-1 |
| KIKO | SOMEBODY UNPLUGGED THIS ARCADE. I INTEND TO FIND THEM. | rhythm-3 (see the gorilla rule) |
| EGGSHELL | I HAVE BEEN LOSING TO PLUMBERS SINCE 1986. | rhythm-3 |
| CLARA | TO BE CONTINUED. | frost-2 |

Eggshell's and Clara's are lines the game already says (`EGGSHELL_TAUNTS`, `EXIT_LINES`
in `src/data/jokes.js`). Lorenzo's and Kiko's were written for the teaser.

## Cards and effects

| piece | built by | notes |
| --- | --- | --- |
| INSERT COIN | `insert.mjs` + `cards.mjs` | Blinks lit/dim on the quarter note, so the blink is in the song. Replaced a clip of falling coins. |
| ACT I / FLOOR cards | `cards.mjs` | Game display face on black. |
| CRT switch-off | `crtoff.mjs` | Scanline pass lifted from the game's own CRT filter (`src/game/cast.js`: rows at 0.70/1.06, red a pixel left, blue a pixel right). Raster collapses to a line, the line pulls to a dot, the dot burns out. Sound is the flyback whine cutting off plus the degauss thump. |
| Gary | `gary.mjs` | Drawn through `drawToon`, hinged on the frame edge so he leans in round the far LEFT rather than walking on. |
| End card | `cards.mjs` + `titleclip.mjs` | Marquee lands, COMING SOON fades up under it, whole card to black. © line bottom right. |

## Rebuilding

```sh
node work/local/teaser/cards.mjs        # title + act cards
node work/local/teaser/insert.mjs       # blinking INSERT COIN
node work/local/teaser/titleclip.mjs    # end card with the COMING SOON fade
node work/local/teaser/gary.mjs         # the peek
node work/local/teaser/crtoff.mjs work/local/teaser/bubble-clara.png
node work/local/teaser/bubble.mjs       # needs a dev server on :8001
./work/local/teaser/record-4k.sh        # ~20 min, needs :8001
node work/local/teaser/resolve.mjs      # takes -> shots-v3.json
node work/local/teaser/preview.mjs work/local/teaser/shots-v3.json work/local/teaser/chk/p 0.5
node work/local/teaser/assemble.mjs work/local/teaser/shots-v3.json work/video/teaser-v3.mp4
node work/local/teaser/script.mjs       # rewrite this document
```

`preview.mjs` renders one frame per shot AT ITS CROP into contact sheets. Framing is
what goes wrong, and re-assembling a minute of 4K to discover a hero is half out of
frame is the slow way to find out.
