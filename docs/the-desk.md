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
