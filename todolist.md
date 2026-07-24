# Nice-to-haves

A running list of non-urgent ideas — things that would be good to have but aren't
blocking anything. Move items to "Done" when shipped, or delete them if they stop
mattering.

## Ideas

### "You can afford an upgrade" nudge
A proactive reminder that pops when your coins first cross the price of the
cheapest bench upgrade you can still buy — a gentle "go treat yourself at the
Repair Bench," not a nag every frame.

- **What exists today:** only the *inverse* — Dolores' can't-afford quips
  (`BENCH_AFFORDABILITY_GAGS` in `src/game/hub/index.js`) that fire when you try
  to buy something you can't afford, plus the gold-vs-grey price coloring inside
  the bench menu. There is no positive "you have enough now" signal anywhere.
- **Natural home:** `HubState` (it already reads `slot.coins` for the corner
  readout). Fire once when coins cross the threshold, not every hub entry.
- **Affordability check:** cheapest next-tier `cost` across `BENCH_UPGRADES`,
  including the food-court surcharge (see `BenchState.options()` for how the
  surcharged cost is computed) — reuse that so the nudge and the counter agree.
- **Watch out for:** don't re-fire every time you re-enter the hub; gate it on a
  threshold-crossing (or a one-shot flag that resets after a purchase).

### Phase 2: cache the live toon rendering (real fix for CPU-bound devices)
The adaptive render-density work (shipped) proved that weak devices are **CPU-bound
on the character painting**, not fill/upload-bound: a cheap Android ran in the low
teens identically at 1×, 2×, and 3× density, so no rendering-density trick can help
it. The live toons re-rasterize their full vector rigs every frame; only static
sites (HUD faces, hub NPCs) are cached today.

- **The cost:** `src/sprites/toons.js` (~5,200 lines of procedural vector paint)
  runs `drawToon` per live character per frame. Static crops go through `cached()`
  (~`toons.js:5173`; see the comment at `toons.js:4922`), but animated on-field
  toons do not.
- **The fix:** rasterize each pose to an offscreen sprite once and stamp it, keyed
  by `(heroId, pose bucket, density)` — quantize the animation into a small number
  of pose buckets so the cache actually hits instead of missing every frame.
- **Profile first:** confirm the paint path dominates with `?renderer=2d` vs WebGL
  and a frame profile on a real weak device, so we cache the right thing.
- **Must verify cast-wide:** it touches the shared painter every hero uses, so it
  needs measured per-hero before/after across the whole cast before shipping (see
  the shared-painter-cast-wide-check rule).

### Fix the near-shoulder/torso disconnect on running humanoids
In the run cycle every light humanoid (all except grumpos) shows a slight
disconnect where the near arm meets the torso — the arm's rounded root cap
reads as separate/not quite attached instead of a shoulder growing out of
the body. Visible in the gallery's "Heroes — in-run render" tiles.

- **Root cause (diagnosed 2026-07-24):** the light rigs root the running near
  arm *flush with the torso edge* (`nearFlush` in `src/sprites/toons.js`) —
  exactly where `shoulderCap`'s fit-inside-the-body clamp (`bodyRoom`)
  collapses to zero. So no cap merges the joint and the arm's raw root cap +
  outline show.
- **Already tried and REJECTED:** giving the front-on depth run the turned
  rig's proud, outer-arc-stroked cap (`proud = turned || (depthRun && !heavy)`).
  At game scale it read as a bulge bolted onto the shoulder, not a deltoid —
  vetoed on sight. A REJECTED EXPERIMENT comment marks the spot in
  `shoulderCap`; don't re-try that shape.
- **How to attempt it next time:** build 2–3 candidate treatments side by side
  as a gallery bake-off section (lab cluster) and pick by eye at real game
  scale BEFORE touching the shared painter — zoomed stills exaggerate the
  seam, which is how the rejected fix got shipped. Candidates worth mocking:
  a fill-only bridge wedge (no stroke) between arm root and torso, softening
  just the root cap's outline where it overlaps the body, or nudging the run
  root a hair inboard so `bodyRoom` leaves the clamped cap some room.
- **Must verify cast-wide:** shared painter — measured per-hero before/after
  (incl. grumpos unchanged, b33p's cannon arm exempt, dolores under her apron
  straps) before shipping.

## Done
<!-- move shipped items here with a date -->
