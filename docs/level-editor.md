# THE LEVEL EDITOR

```
npm run levels      # the editor, on http://127.0.0.1:8020
npm run dev         # the game, on :8001 — the PLAY button opens this
```

Both, in two shells. The editor does not host the game and the game does not
know about the editor; PLAY is a link between them.

## What it edits

One file: `src/data/stage-layouts.js`, generated, read by the build. It holds
everything about a stage that is not its identity — the clock, the speed, the
checkpoints, the pinned set pieces, the per-stretch curation of the random bag.
Missions, challenges, act cards and intro dialog stay hand-written in
`src/data/stages.js`; the editor never touches them.

Saving validates first, snapshots the old file into `work/level-history/`, and
writes atomically. A save that changes nothing writes nothing.

## The timeline

Six lanes over one x-axis, which is the stage from start to tape:

| Lane | What it is |
| --- | --- |
| SECTIONS | the stretches, each curating its own bag. Click one to edit it; drag a boundary, or a middle section's body to slide the whole stretch. |
| SET PIECES | pits, spike crossings, the toaster, the rewind capsule, the loop, the dog. All but the dog drag. |
| ROADS | islands, forks and tunnels — inherited from the cabinet until you fork them. Dragging one forks them for you. |
| CHECKPOINTS | where a death puts you back |
| FORECAST | one concrete deal, from the real spawner, on the seed in the top bar |
| REWARDS | the capsules and cells that seed drips |

And under the six, THE LEVEL: the same stage as a picture, in the cabinet's own
art. See below.

The forecast is the game's own `Spawner` on the game's own seeded streams, so
the SEQUENCE it shows is the sequence you will play. Positions are approximate:
the live lane carries a hero's speed multiplier, boosts and whatever the player
does, none of which a forecast can know. ROLL for another deal; PLAY opens that
exact stage at that exact seed.

Click anything to select it, and **drag it to move it**. Everything on the
timeline with a position has one gesture: pits and crossings, the toaster, the
rewind capsule, the loop-de-loop, checkpoints, roads, section boundaries, and a
middle section's whole body — that last one slides both of its edges at once.
The cursor says what can be picked up. Nothing may be dragged through its
neighbour or off either end of the stage; the inspector's slider is still there
for the pixel a hand cannot hit. `tools/lib/timeline-drag.js` owns those rules
and `tests/level-editor.js` holds them.

Three things on the lanes deliberately do not drag, and all three for the same
reason — nothing behind them would change if they did. The FINISH DOG is a
chance rather than a place: the run puts it on the tape, and clicking it gives
you the odds. A crossing's stepping stones belong to the pit above them, so
drag the pit. And FORECAST and REWARDS are a deal, not a layout: they are what
this seed does with the stage, and the way to move them is to change the stage
or roll another seed.

## THE LEVEL — the picture

Under the lanes is the stage itself, painted with the cabinet's own art by the
run's own painters: its ground and hills, its roads, its holes and what is in
them, the ring, and every obstacle this seed deals. It is read-only; the lanes
above it do the editing.

It wraps. A whole stage in one strip puts a crate at 1.6px on the shortest level
in the game and 0.4px on the longest, so the SCALE is fixed and the stage runs
onto as many rows as it needs — 1:1, 1:2 or 1:4, the buttons on the card. Each
row is badged with where it starts, as a percentage of the stage, which is the
same number the lanes are ruled in.

**It goes stale while a hand is down.** A drag on a lane re-renders once a
frame and so does every slider in the inspector; the map holds the last picture
through either and repaints when the hand lets go (the card says "catching up"
meanwhile). A whole stage costs 5–22ms to paint, so this is about never
competing with a drag rather than about the paint being dear.

What it is honest about not knowing, in the line under the picture: a hazard can
push the toaster or the rewind capsule further along than the spot the run
starts looking at, and the sweeps a road makes around itself belong to RunState
rather than to the layout, so they are not drawn. On a beat-charted stage the
map draws the level and not a deal, because the lane comes from a chart.

`tools/lib/stage-preview.js` is the renderer — `buildScene` gathers what the run
would place, `paintRange` paints one stretch, `paintMap` wraps. It paints in
480-world-px tiles at 1:1 and blits them down, because `drawRoutes` and
`drawTerrain` clamp themselves to one screen however wide you say the view is,
and because a painter drawn at 1:1 and shrunk looks like the game seen from far
away while one drawn at half scale looks like a mistake.

## Sections, and how randomness survives

A section does not place anything. It says what MAY be dealt over its stretch,
how thickly, and how often a reward drops — and then the dice deal inside it.
That is the whole point: a level you can shape without a level that plays the
same way twice.

- **the bag** — tick obstacles off. The list is grouped by what each thing IS
  (dogs, pits, standing hazards, flyers…), derived from the flags in
  `src/game/entities.js`. Anything the run places itself — signs, spring pads,
  the finish dog — is shown greyed under PLACED BY THE RUN, because excluding
  it would do nothing.
- **density** — multiplies the gap the spawner rolls between patterns. It can
  only ever spend the slack the roll had to give: the reaction runway
  underneath (`fairGap`) is not scalable, and `tools/fairness-sim.js` sweeps
  every curated bag to prove it.
- **tier cap** — holds a stretch to easier patterns than the stage has reached.
- **reward rates** — the capsule and battery windows, and optionally the odds
  of each capsule. Leave the odds alone and the game's own ladder runs.

## The loop-de-loop

The ring used to stand at one constant — `LOOP.at`, 0.55 — on every boost stage
there is. It is a layout field now: absent means that same 0.55, a number moves
it, `null` takes the ring off the stage entirely, and only the boost cabinets
have one at all. The resolver (`src/game/layout.js`) still spends `LOOP.at`
rather than restating it, and `src/data/stage-layouts.js` carries a `loopAt`
only where a stage disagrees with the default.

The one thing to watch is the checkpoints. 0.55 sits between the restore points
at 1/3 and 2/3 on purpose, so a death never drops the hero on top of the ring —
drag the loop onto one and the timeline says so, in WORTH A LOOK, along with a
ring dragged so far down the stage that the run would refuse to place it at all.

## Roads, and what dragging one costs

A stage inherits its cabinet's islands, forks and tunnels until it forks them,
and a fork is a copy: from then on this stage's roads are its own and a hand
edit to `cabinets.js` no longer reaches it. Dragging a road does that copy for
you on the first gesture, because the alternative is editing the machine's roads
from a page that says it is editing one stage. The STAGE panel hands them back.

What you are moving is `at`, a fraction of the stage; `dwell` — the panel's
second field — is how long the road lasts in SECONDS of lane, so a road keeps
its shape on a stage that runs half again as fast. A staircase is one island
with `steps`, so grabbing any tread moves the whole climb.

Two roads that would sit on top of each other cannot both exist: `buildRoutes`
drops the later one, and it will vanish off the lane as you drag its neighbour
onto it. That is the run's rule, not the editor's, and it is why the ribbon you
just moved sometimes takes a road with it.

## Adding a new obstacle or reward

Nothing here needs telling. The editor imports `OBSTACLES`, `PICKUPS` and
`POWER_DEFS` and builds its palette from their flags, so a new entry appears on
the next refresh, in the group its flags put it in. The one flag that cannot be
derived is `animal` — a dog is a dog by being a dog — so a new animal declares
`animal: true` beside its width and height.

## Why an edit is safe

`tests/layout-parity.js` holds eighteen real headless runs, spawn for spawn,
to ledgers recorded before any of this existed. A stage nobody has edited must
still deal exactly what it always dealt; when it does not, the suite prints the
entity where the two diverged.

Editing a stage naturally changes its ledger — that is the point of editing it.
When an edit is one you mean to keep, re-record with:

```
node tools/capture-layout-baseline.js
```

and say so in the commit. Never re-record to make a red suite green.

## If the file gets into a state

```
node tools/migrate-stage-layouts.js     # rebuild it from stages.js
node tools/level-editor.js --baseline   # the same thing, from the editor's side
```

Both snapshot before they write. Older copies are in `work/level-history/`,
newest last.
