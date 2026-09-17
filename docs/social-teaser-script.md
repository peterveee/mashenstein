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
| 4 | 0:07.02 | 0.50 | FOOD COURT floor (half bar) | `work/video/k2-hub-20260916-094145.mp4` | 7.9s | 3070x1727 @420,300 |
| 5 | 0:07.98 | 2 | plumber-1 Lorenzo (slide kick) | `work/video/p-lorenzo-20260915-225241.mp4` | 12.029032258064516s | 2382x1340 @280,620 |
| 6 | 0:11.85 | 1 | L5 LORENZO card | `say-lorenzo.mp4` | 0s | — |
| 7 | 0:13.79 | 1 | PORTAL hero swap (zoom) | `work/video/k3-toaster-20260916-114647.mp4` | 34.2s | 2880x1620 @0,380 |
| 8 | 0:15.73 | 1 | RUSTY kicks the cone (zoom) | `work/video/p2-rusty-20260916-112537.mp4` | 3.92s | 3040x1710 @0,290 |
| 9 | 0:17.66 | 1.50 | speed-1 THE LOOP (zoom) | `work/video/k4-loop-20260916-114824.mp4` | 30.18s | 3244x1822 @0,178 |
| 10 | 0:20.56 | 0.50 | FOOD COURT: the dark cabinets | `work/video/k2-hub-20260916-094145.mp4` | 4.6s | 3626x2040 @107,0 |
| 11 | 0:21.53 | 1 | K4 KIKO card | `say-kiko.mp4` | 0s | — |
| 12 | 0:23.47 | 2 | KIKO kicks the barrel into EGGSHELL (follow) | `work/video/k8-kiko-20260916-115221.mp4` | 14.36s | 3100x1744 @0,416 |
| 13 | 0:27.34 | 1 | E1 EGGSHELL card | `say-eggshell.mp4` | 0s | — |
| 14 | 0:29.27 | 1 | frost-1 Grumpos axe (zoom) | `work/video/k2-frost1-20260916-115413.mp4` | 1s | 2560x1440 @11,534 |
| 15 | 0:31.21 | 1 | frost-3 B-33P shoots the snowman | `work/video/k6-frost3-20260916-124401.mp4` | 9.3s | 3244x1822 @0,178 |
| 16 | 0:33.15 | 1 | REWIND power-up | `work/video/p-rewind-20260915-223702.mp4` | 9.55s | 2809x1580 @0,580 |
| 17 | 0:35.08 | 0.75 | FERNWICK looses an arrow (zoom) | `work/video/k3-fernbow-20260916-115645.mp4` | 14.15s | 2743x1543 @0,420 |
| 18 | 0:36.53 | 0.25 | roll speed (Lorenzo) | `work/video/k4-loop-20260916-114824.mp4` | 41.6s | — |
| 19 | 0:37.02 | 0.25 | roll SPRING pad (zoom) | `work/video/k3-finish-20260916-114952.mp4` | 30.95s | 3076x1730 @0,180 |
| 20 | 0:37.50 | 0.25 | roll frost-1 | `work/video/k2-frost1-20260916-115413.mp4` | 2.5s | — |
| 21 | 0:37.98 | 0.25 | roll speed booster | `work/video/k4-loop-20260916-114824.mp4` | 1.72s | 3040x1710 @0,290 |
| 22 | 0:38.47 | 0.25 | roll plumber | `work/video/k3-plumber1-20260916-115751.mp4` | 18.95s | — |
| 23 | 0:38.95 | 0.25 | roll speed toaster | `work/video/k3-toaster-20260916-114647.mp4` | 25s | — |
| 24 | 0:39.44 | 0.25 | roll frost-3 Fernwick | `work/video/k6-frost3-20260916-124401.mp4` | 42s | 3244x1822 @0,178 |
| 25 | 0:39.92 | 0.25 | roll frost-1 | `work/video/k2-frost1-20260916-115413.mp4` | 20s | — |
| 26 | 0:40.40 | 0.25 | roll rhythm (Kiko) | `work/video/k8-kiko-20260916-115221.mp4` | 5.14s | 3100x1744 @0,416 |
| 27 | 0:40.89 | 0.50 | FINISH: LORENZO reaches the pad | `work/video/p-fin-lorenzo-20260916-005742.mp4` | 4.15s | — |
| 28 | 0:41.85 | 0.50 | FINISH: the flag goes up (zoom) | `work/video/p-fin-lorenzo-20260916-005742.mp4` | 5.12s | 2400x1350 @1440,450 |
| 29 | 0:42.82 | 0.75 | pit gag (Clara goes under) | `work/video/p-pit-clara-20260916-004012.mp4` | 26.4s | 1700x956 @560,1204 |
| 30 | 0:44.27 | 1.13 | FLOOR card | `card-floor.png` | — | — |
| 31 | 0:46.45 | 1.87 | C3 Clara TO BE CONTINUED (push in, hold) | `claracard.mp4` | 0s | — |
| 32 | 0:50.08 | 0.31 | SCREEN CLOSES on the card | `crtoff.mp4` | — | — |
| 33 | 0:50.68 | 1.34 | GARY peeks, far left | `gary.mp4` | 0s | — |
| 34 | 0:53.28 | 3 | TITLE + COMING SOON (held) | `titleclip.mp4` | 0s | — |
| 35 | 0:59.09 | 0.25 | black tail | `black.png` | — | — |

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
