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
| SECTIONS | the stretches, each curating its own bag. Click one to edit it. |
| SET PIECES | pits, spike crossings, the toaster, the rewind capsule, the loop, the dog |
| ROADS | islands, forks and tunnels — inherited from the cabinet until you fork them |
| CHECKPOINTS | where a death puts you back |
| FORECAST | one concrete deal, from the real spawner, on the seed in the top bar |
| REWARDS | the capsules and cells that seed drips |

The forecast is the game's own `Spawner` on the game's own seeded streams, so
the SEQUENCE it shows is the sequence you will play. Positions are approximate:
the live lane carries a hero's speed multiplier, boosts and whatever the player
does, none of which a forecast can know. ROLL for another deal; PLAY opens that
exact stage at that exact seed.

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
