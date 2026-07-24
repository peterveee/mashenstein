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

## Done
<!-- move shipped items here with a date -->
