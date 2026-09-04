# LEVEL EDITOR — stage layouts as source of truth

> **BUILT.** `npm run levels` opens it on `127.0.0.1:8020`; run `npm run dev`
> in another shell for the PLAY button to have a game to open. This document is
> the plan it was built from, kept because it explains the reasoning; where the
> two disagree the code wins. See `docs/level-editor.md` for how to use it.

## Why

Levels are too randomised. A stage today deals from one uniform bag of patterns
for its whole length (`Spawner.pickPattern`, `src/game/spawner.js:222`), and the
only things placed on purpose are a handful of scripted fields hand-written into
`src/data/stages.js` — `pits`, `applianceAt`, `rewindAt`. Everything else is the
dice: which obstacles turn up, how thickly, which capsule drops, whether a dog is
at the tape. The difficulty ramp is a single knob (`tierMax`), checkpoints are a
hard-coded `[1/3, 2/3]`, and the reasoning behind every hand-placed pit lives in
comments rather than anywhere a tool can read.

What is wanted instead: an interactive editor, available in dev mode, that says
what each level contains — pits, spike crossings, springs, cloud islands, dogs,
which rewards are available and at what rate, where the checkpoints sit, how long
the level runs and how fast — and lays out what appears in what order. Saving
writes a file the next compile uses as its source of truth. Randomisation stays,
but curated: the dice roll inside boundaries somebody chose.

New obstacles, rewards and mechanics must appear in the editor by themselves. A
hand-kept list in the editor is a list that goes stale the first busy afternoon.

## The three decisions this plan rests on

1. **Sections + pinned events.** Each stage's timeline splits into sections; each
   section curates its own bag (which patterns are eligible), its density, and
   its reward rates. Set pieces are pinned at exact points. The spawner still
   rolls dice — inside a section, over a bag somebody chose.
2. **The editor owns layout only.** A new generated `src/data/stage-layouts.js`
   holds pacing and placement. Missions, challenges, act cards and intro dialog
   stay hand-authored in `stages.js`, comments and all — that file is writing,
   not data, and a generator would flatten it.
3. **Preview is a forecast plus a PLAY button.** The editor draws a schematic
   timeline and, beside it, one concrete deal: the real `Spawner` run at a chosen
   seed. PLAY opens that stage at that seed in the dev game.

## How the game is built today (what the editor has to fit)

Worth stating plainly, because most of the design falls out of it.

**Two layers.** Nine **cabinets** (`src/data/cabinets.js:153`) carry theme,
palette, speed bonus, mechanic, route set pieces and the pattern bank. Twenty-seven
**stages** (`src/data/stages.js:12`, three per cabinet) carry mission, challenge,
duration, speed multiplier and the scripted pins. A stage's length is TIME —
60/90/120s by act — and distance is derived: `duration * baseSpeed() * 1.05`
(`run.js:1683`). There is no par time; the clock running out is the fail.

**Patterns are data, not code.** `P(tier, cells, opts)` (`cabinets.js:23`), where
a cell is `{t, dx, y?, n?, w?}` or a coin formation. `BASE_PATTERNS` is shared by
every cabinet; `ANIMALS` holds the dogs; The Surge's bank is computed at load as
the union of everyone else's (`cabinets.js:821`). This is the vocabulary a
section curates.

**Fairness is computed, not authored.** `Spawner.fairGap` (`spawner.js:189`)
derives minimum spacing from reaction time, worst-case airtime and punt hang, and
`tools/fairness-sim.js` gates it across 200 seeds × 4 speeds × every cabinet.
Nothing in this plan touches it: every knob the editor offers can only ever make
gaps larger than the floor, never smaller.

**The registry is already data-driven.** `src/game/entities.js` is one flat table
of `OBSTACLES` (40) and `PICKUPS` (14) keyed by type string, with behaviour
dispatched off flags (`isGap`, `isSpring`, `shoots`, `falls`, `power`…). There is no enum and no factory switch. That is what makes
auto-discovery cheap: the editor imports the registry and reads the flags.

**There is precedent for a tool that writes game source.** The Song Mixer
(`tools/mixer.js`) is a local node server that bundles the real `src/` per
request, serves an HTML desk, and POSTs back into `src/data/*.js` behind a
`// GENERATED … Do not edit` header, snapshotting to `work/` first. The level
editor is the same machine pointed at a different file.

## The layout file — `src/data/stage-layouts.js`

An ES module (the repo has zero JSON under `src/`), generated, with the house
header. Formatting follows `tools/lib/mix-source.js`: quoted non-identifier keys,
atomic tmp+rename, no-op when unchanged.

```js
export const STAGE_LAYOUTS = {
  'plumber-3': {
    // pacing
    durationSec: 60,
    speedMult: 1,
    checkpoints: [0.33, 0.67],   // fractions of stage distance; default [1/3, 2/3]
    finishDog: 0.45,             // chance, true/false; default: plumber-1 always,
                               // the rest of that cabinet rolled, elsewhere none

    // pinned events — `at` is a fraction of the stage, as applianceAt always was
    appliance: { at: 0.55, high: false },
    rewindAt: null,
    pits: [{ at: 0.12, w: 52 }, { at: 0.7, jumps: 4 }],   // `jumps` = spike crossing

    // per-stage road override; omitted = inherit the cabinet's islands/forks/tunnels
    routes: { islands: [...], forks: [...], tunnels: [...] },

    // sections: consecutive spans, last one ends at 1
    sections: [
      { to: 0.33, label: 'OPENING',
        density: 1.15,                       // scales the inter-pattern gap
        tierCap: 1,                          // min()'d with the global tier ramp
        exclude: ['bananaPeel', 'barrel'],   // obstacle types out of this bag
        excludePatterns: ['2:barrel@0'],     // one specific pattern, by key
        drip: {
          capsule: [12, 18], battery: [20, 30],          // re-arm windows, seconds
          weights: { capUnpeel: 10, capRewind: 10, capShield: 21, ... },
        } },
      { to: 1 },   // a bare section is all defaults
    ],
  },
};
```

**Two emit rules, deliberately different.** `durationSec`, `speedMult`,
`appliance`, `pits` and `rewindAt` are written for every stage, always, even when
they match what `stages.js` used to say: these are the fields the layout file
takes over outright, and dropping one "because it equals the old value" would
make deleting the legacy field a behaviour change later. Everything else follows
the mixer's rule — a value equal to its global default is left out, so what
remains in the file is what somebody meant.

**Randomisation is untouched by the schema.** Nothing here places an ordinary
obstacle. Sections curate, scale and set rates; the spawner still draws from the
seeded `'spawn'` and `'drip'` streams. What gets pinned is exactly the set of
things that are already deterministic today.

## The resolver — `src/game/layout.js` (new, DOM-free)

One module three callers share: `RunState.enter()` building a real run, the
editor drawing and forecasting the same stage, and the tests holding both to the
same recording. DOM-free so the editor and the headless sims can import it
without dragging in `run.js`.

- `resolveLayout(stage, cabinet)` — the fallback chain: layout entry first, the
  legacy `stage` field second, the global default last. A stage with no entry
  must resolve to exactly today's behaviour. Returns `null` for overtime and
  bosses, which have no stage to lay out.
- `patternKey(pat)` — a stable signature so a section can name a pattern without
  depending on bank order. Reordering the bank keeps every key; editing a pattern
  changes its key, which is the honest outcome (the editor flags the stale
  exclusion rather than silently matching something else).
- `sectionAt(sections, frac)`, plus section normalisation.
- **The pacing constants move here** — `BASE_SPEED`, `SPEED_RAMP_K/CAP`,
  `FINISH_CLEAR`, `FINISH_DOG_CHANCE` — with `stageBaseSpeed()`, `rampAt()`,
  `totalDistFor()` and `speedAtFrac()`. `run.js` imports them back and re-exports
  `FINISH_CLEAR` where its callers have always found it. This is what stops the
  editor's forecast and the run's arithmetic from drifting apart. Note
  `tools/lib/tunables.js` names these constants by file, so its three rows move
  to `src/game/layout.js` and `tests/tunables.js` gains the new file in its
  no-registration-hook list. (Verified: this move passes `tests/tunables.js` and
  `tests/tune-store.js` untouched otherwise.)
- `PINNED_EVENTS` — the editor's lane vocabulary, declared here beside the code
  that honours it, so a future set piece surfaces in the editor by being added
  next to its implementation rather than in the editor bundle.

## Runtime consumption

**`run.js` `enter()`** reads `this.layout = resolveLayout(...)` and takes
duration, `speedMult` (in `baseSpeed()`), checkpoints, `pits`, `appliance`,
`rewindAt` and the finish-dog chance from it. Routes merge as
`buildRoutes(layout.routes ? {...cabinet, ...layout.routes} : cabinet, …)` —
`buildRoutes` only reads `islands/forks/tunnels` off its first argument, so a
merged shim needs no change in `routes.js`.

**`Spawner`** gains optional `{sections, totalDist}`, defaulting to null — and
null is a contract, not a shrug: with no sections every path runs the code it
runs today, drawing the same rng in the same order.
- `pickPattern` filters the bank by the section's exclusions and tier cap
  **before** the roll, which is the existing `once`-filter precedent: a pattern
  filtered out never costs the stream a draw.
- Density applies to the **result** of `rng.range(90, 220)`, never to its bounds,
  so density 1 is exact identity and the fairness floor still wins via the
  existing `Math.max(roll, fair)`.

**`DripSpawner`** gains the same pair, reading per-section re-arm windows and
capsule weights. The default windows live in `layout.js` as `DEFAULT_DRIP` so
"no section" and "a section that says nothing" are the same numbers from the same
table.

**`powerups.js`** gains `weightedPowerPickup` beside `rollPowerPickup` rather
than replacing it. This one matters: `rollPowerPickup` consumes one `rng.float()`
plus, on the staple tail only, an additional `rng.pick` — a shape no weight table
reproduces draw for draw. Rebuilding the default path on weights would silently
shift the `'drip'` stream of every un-edited stage. Weights engage only where a
section declares them.

**`main.js`** gains `&seed=` on the `?goto=stage` dev route. `Flow.launchStage`
already takes a `seedOverride` (`main.js:337`); the router just passes
`undefined` today (`main.js:210`). Two lines, and the editor's PLAY button
becomes exact.

**`entities.js`** gains one flag: `animal: true` on `dogSnarler`, `dogBruiser`,
`dogFeral`, `catFury` and `finishDog`. They are the only registry entries with
nothing to distinguish them, and the editor's DOGS checklist must come from a
flag rather than a hand-written list.

## The editor

| File | Role |
| --- | --- |
| `tools/level-editor.js` | node server on `127.0.0.1:8020` (`MASH_LEVELS_HOST/PORT`), `npm run levels`. Bundles the entry per request so `src/` edits land on refresh. Routes: page, `POST /save`, history/revert, `--baseline` to run the migration. |
| `tools/level-editor-entry.js` | the browser app; imports only DOM-free game modules |
| `tools/level-editor-shell.html` | shell with the usual `/*__BUNDLE__*/` substitution |
| `tools/lib/stage-layouts-source.js` | `writeStageLayouts`, `snapshotStageLayouts`, `validateLayouts` — shared by server and tests |
| `tools/migrate-stage-layouts.js` | the one-time materialisation of all 27 stages |

**Layout.** Left rail: cabinet and stage picker with info cards — act, mechanic,
speed bonus, bank size by tier, route counts; per stage the mission and challenge
one-liners read-only, duration, effective base speed, and an edited/inherited
badge. Centre: a multi-lane timeline on a stage-fraction x-axis with a seconds
ruler — a sections band with draggable boundaries, a set-pieces lane (pits drawn
to width, crossings with their jump count, appliance, rewind, the loop marker,
the finish dog with its chance dial), a routes lane drawing islands, forks and
tunnels as `routeRise` profile ribbons with spring pads marked and an "inherited"
watermark until forked, a checkpoints lane, and the forecast. Right rail: an
inspector for whatever is selected — section sliders and curation checklists,
numeric fields for a pin, or the stage's own duration/speed/checkpoints. Top bar:
seed field, PLAY, SAVE, history, and a validation badge.

**The forecast** builds `new Rng(seed)`, takes the `'spawn'` and `'drip'`
substreams exactly as `run.js:1703/1709` does, constructs a `Spawner` with the
run's own `tierMax` formula, and steps `fill()` in slabs across the stage. Label
it honestly: **the sequence is exactly the real run's, the positions are
approximate** — live speed carries hero multipliers and mid-run events the
forecast cannot know.

## Auto-discovery

The editor bundles against live `src/` per request, so a new entry in
`OBSTACLES`, `PICKUPS`, `POWER_DEFS`, a cabinet's bank or `ANIMALS` appears on
refresh with no editor change. Categories are derived from flags, never listed:
gaps `isGap`, springs `isSpring`, pads `isBoost`/`isLoop`, shooters `shoots`,
fallers `falls`, flyers `!ground`, movers `vx < 0`, animals `animal`, capsules
`power`, coins `coin`. The editor computes the union of `cell.t`
across the cabinet's bank so types the run places itself — signs, spring pads,
the finish dog — render greyed in a "placed by the run" group, and an exclusion
checklist never claims to affect something it cannot.

## Validation and tests

**In the editor**, importing the real constants rather than restating them: pit
and crossing overlap against `pitClearance`, route spans and tunnel mouths; a pit
inside the finishing straight (silently dropped at `run.js:5261` today); a
checkpoint inside a crossing or under `LOOP.at`; appliance or rewind inside
`FINISH_CLEAR`; sections not partitioning `[0,1]`; a section whose bag is empty
after exclusions; stale `excludePatterns` keys; drip cadence against
`POWER_MIN_GAP` at the stage's slowest speed; and `buildRoutes` run live for the
real geometry verdict.

**In node:**

1. `tests/stage-layouts.js` — schema and registry references over the shipped
   file. The tripwire that makes a renamed obstacle fail loudly.
2. `tests/layout-parity.js` — **the gate that makes all of this safe.** Capture
   spawn ledgers from real headless runs *before* any runtime change lands, then
   replay them after. This has been prototyped and works: a child script drives a
   real `RunState` through `tests/dom-stub.js` with the reactive bot from
   `tests/run-complete.js` (invulnerable and mission-forced, so the ledger
   records generation rather than play), recording enter()-time resolution —
   checkpoints, pit plan, routes, the finish-dog roll, the loop — plus every
   obstacle and pickup in creation order. One run is ~0.65s and byte-identical
   across repeats; a 6-stage × 3-seed matrix (plumber-2/3, speed-2, frost-2,
   crypt-2, cardboard-2) captures in ~11s and covers the rewind pin, crossings,
   the loop, ice spacing, tunnels and act III's tier ramp. **Capturing the
   fixture is the first task and cannot be done later** — once the runtime
   changes, the pre-change truth is gone.
3. `tools/fairness-sim.js` extended: for every layout section, build a `Spawner`
   over that section's effective bag and run the same invariant, so the gate
   covers curated bags and not just full ones.
4. `tests/level-editor.js` — writer round-trip idempotence, snapshot creation,
   no-op write skip, validation rejection paths.

## Phases

**A — schema, migration, runtime, identical defaults.** Capture the parity
fixture first. Then `layout.js` (with the constant move), the source writer, the
migration, and the wiring in `run.js` / `spawner.js` / `powerups.js` / `main.js` /
`entities.js`. Verify with `npm test`, `node tools/fairness-sim.js`, and the
`verify` skill on plumber-3's three pits and plumber-2's rewind.

**B — editor, read-only.** Server, entry, shell; picker, timeline, route ribbons,
forecast, seed field, PLAY. No save routes yet. Verify by playing a seed and
checking the first obstacles against the forecast.

**C — editing, save, history.** Inspector editing and drag, `POST /save` with
snapshot to `work/level-history/`, revert, and the writer tests. Verify that
`git diff src/data/stage-layouts.js` after an edit is small and readable.

**D — curation depth and polish.** Section CRUD, the flag-derived checklists,
density/tier/drip/weight controls, `weightedPowerPickup`, the fairness-sim
extension, and the validation badge. Verify by authoring something opinionated —
"no dogs, dense, shields only" on speed-2 — and confirming un-edited stages still
pass parity.

## The risky parts

1. **Parameterising the spawner without moving the streams.** Mitigated by
   filtering before the roll, multiplying the gap after it, keeping the legacy
   capsule ladder for the default path, and the golden fixture. `fairGap` is
   never touched.
2. **Back-compat for un-edited stages.** The migration writes only what it read;
   everything else resolves to today's literals. The fixture must be captured on
   a clean tree, first.
3. **Per-stage versus per-cabinet routes.** Inherit until forked, with a visible
   badge and an explicit "fork from cabinet" action. The accepted cost is that a
   forked stage stops tracking later cabinet edits — labelled, not hidden.
4. **Speed edits move derived geometry.** Crossing widths and route spans come
   from `speedAt`/`baseSpeed`, so editing duration or speed silently relocates
   set pieces. The editor must recompute every lane and re-validate on any such
   change — which is trustworthy only because the pacing maths lives once, in
   `layout.js`.
