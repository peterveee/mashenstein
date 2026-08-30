# True Beat-Synced Rhythm Levels — Implementation Plan

Turn the RHYTHM BANKRUPTCY cabinet into a true rhythm level: the obstacle lane is authored
to the soundtrack, every musical beat lands as a player action (jump on kicks, slide-kick or
duck on snares, coin accents where a full action is infeasible), a visible beat telegraph
pulses in time, and — deliberately — **tempo and world speed are locked constant** on those
stages, because a lane that speeds up or slows down against the music is too tricky.

**Status: implemented.** The sections below are kept as the design record — what was
built and why. `src/game/beatchart.js` holds the chart and its spawner, `tests/beat-chart.js`
pins the invariants, and the lane was verified in a browser on rhythm-1: speed pinned at
232 px/s across dash and powerups, beat bars laid exactly 224.5 px (two beats) apart, and
the telegraph ribbon scrolling its carets into the now-tick.

## Why: the current state

The rhythm cabinet is rhythm in name only.

- `mechanic: 'beat'` (`src/data/cabinets.js:602`) is dead data. The only mechanics ever read
  are `'ice'`, `'boost'`, and `'darkness'`; nothing tests for `'beat'`. Obstacles come from
  the same distance-based RNG spawner as every other cabinet — `Spawner.fill` lays patterns
  by pixel cadence (`spawner.js:331-335`), with zero connection to the music.
- The only two "beat" features are cosmetic and broken. The `beatBar` height wobble
  (`run.js:3800`/`run.js:3974`) and the `onbeat` challenge scoring (`checkOnBeat`,
  `run.js:4406-4414`) both use `Audio.beatPhase()` (`audio.js:6792`) — a free-running
  `ctx.currentTime % beatLength` whose phase origin is AudioContext creation, not the song's
  downbeat. It ignores output latency and loop ranges, and jumps discontinuously when tempo
  warps. The bars bob at the right *rate* but at an arbitrary *phase*.
- Speed is never constant: `speed = base × hero.speedMult × √ramp × (1+speedBoost) ×
  powerups × (dash 1.8 | roll 1.25 | stumble 0.72)` (`run.js:2103-2111`), and `run.js:2406`
  warps music tempo every frame — SPEED BURST pushes the world ×1.25/1.4 but the music only
  ×1.12/1.18 (`powerups.js:122-140`), so world and music are deliberately decoupled today.

## How it will work

**The music is the level.** The song (`src/data/songs/rhythm.js`, 124 BPM, one 2-bar /
8-beat / 32-step loop, `arrangement = null`) already stores its drums as boolean lanes
(`kick`/`hats`/`snare`/`clap`). A new beat spawner turns that chart directly into the lane:
kicks become beat-bars you jump, snares become drones you slide under, and beats that cannot
legally take an action become coin accents — so every beat lands as *something*, and playing
the level correctly feels like playing the drum part.

**Obstacles land exactly on beats.** The engine already knows precisely what beat is being
heard: `Audio.songBeat()` (`audio.js:6665`) is lookahead- and output-latency-corrected and
loop-aware. With speed locked, one beat equals a fixed distance:
`pxPerBeat = lockedSpeed × 60/bpm ≈ 232 × 0.4839 ≈ 112 px`. Each spawner fill reads the live
beat position once and places chart slot `k` (unwrapped mod 8) at
`x = playerWorldX + (k − songBeatNow) × pxPerBeat`, so the obstacle physically arrives at the
player at the exact moment its drum hit sounds. Re-anchoring on every fill makes drift
structurally impossible.

**Tempo can never change.** On beat stages: the √ speed ramp is off, hero speed differences
are neutralized, dash/roll/stumble no longer change scroll speed, the every-frame music warp
is forced to 1×, and speed / low-gravity / rewind capsules simply don't spawn (LOW GRAVITY
changes airtime ×1.5-2, breaking chart feasibility the same way SPEED BURST breaks phase).

**The rhythm is visible.** A slim HUD ribbon shows the next ~4 beats scrolling into a pulsing
"now" marker — up-carets for jumps, down-bars for ducks — read straight from the spawned
obstacles, so ribbon and world cannot disagree. The clock fix also makes the existing beat-bar
pulse and on-beat scoring genuinely phase-locked, and on-beat presses gain combo feedback.

## Load-bearing facts (verified in code)

- Music does **not** restart at run start: `MusicDirector.enterStage` (called at
  `run.js:1855`) hands over on the next bar line and keeps the clock
  (`music-director.js:286`). The chart must anchor off a live `songBeat()` read, never `tRun`.
- `songBeat()` wraps at the loop boundary (8 beats for this song) — beat→x mapping works
  modulo the loop, unwrapped against the lane frontier.
- Music keeps playing while the run is paused (`run.js:2255-2262` returns without suspending
  audio), so the already-laid lane drifts across a pause → re-phase on unpause. The rewind
  mechanic (`Audio.setRewinding`) detaches the transport entirely → re-phase on release.
- Physics forbids jump-per-beat: airtime is 0.57–0.82 s across the hero cast
  (`player.js:5-20`, `spawner.js:71 worstAirtime = 0.512 s`) vs a 0.484 s beat, and the
  fairness floor already forbids jump→jump gaps under `react + worstAirtime = 0.762 s`
  (`spawner.js:189-200`). Jumps sit on half-notes.
- `restoreSnapshot` (`run.js:5452-5506`) wipes entities and resets `spawner.nextX` —
  checkpoint restores are handled for free by a re-anchoring spawner.
- The rhythm-3 chase copter closes distance on its own (`run.js:4022-4029`) — the chase
  mission survives a speed lock.
- `Audio.onBeat(fn)` (`audio.js:4687`) exists and delivers `(beatIdx, when, step)` with the
  exact audio time ≥250 ms early, but has no unsubscribe; its sole listener is
  `MusicDirector._onBeat` (`music-director.js:516-532`).

## Architectural decisions

- **D1 — Placement: world-x mapping from a live `songBeat()` anchor**, re-read on every
  `fill` call (as above). *Rejected:* spawning from `Audio.onBeat` callbacks — they arrive on
  the audio timeline up to a lookahead early, wrap at the loop, and need run-scoped
  subscribe/unsubscribe. Headless fallback: `songBeat()` returns `null` with no
  AudioContext → anchor from `tRun × bpm/60` so tests stay deterministic.
- **D2 — Physics: keep global jump physics; author jumps at 2-beat cadence.** *Rejected:*
  per-cabinet gravity/jumpV — `worstAirtime`/`fairGap`/`crossingLayout` read the global
  constants, rhythm-2's crossing is sized off them at init (`run.js:1755`), and per-stage
  feel changes punish hero-swap muscle memory. Chart spacing rules (worst-case hero):
  jump→anything ≥ 2 beats; duck→jump and duck→duck ≥ 1 beat; jump→duck ≥ 2 beats. Beats that
  can't take an action get coin accents.
- **D3 — Speed lock via a `beatLock` flag; ban rather than convert.** Speed / low-gravity /
  rewind capsules are suppressed from spawning on beat stages (mirroring the existing
  `allowRewind` precedent at `spawner.js:437`) instead of converting grabs to points — no new
  pickup behavior, nothing to explain.
- **Cabinet-wide, with two exclusions.** Everything keys on
  `cabinet.mechanic === 'beat'`, so all three RHYTHM BANKRUPTCY stages get the mechanic:
  rhythm-1 jumps-only, rhythm-2 jumps+ducks with its pits/crossing as musical rests,
  rhythm-3 the full chart. OVERTIME falls back to the normal spawner (an infinite fixed-speed
  loop of an 8-beat chart would be monotonous, and overtime's escalation is its point), and
  boss runs are untouched. A future cabinet becomes beat-synced just by setting the flag —
  the chart derives from that cabinet's own song.

## Implementation steps

### 1. `src/engine/audio.js` — fix the clock, add unsubscribe
- `beatPhase()` (line 6792): reimplement on `songBeat()` — if it returns a beat, return
  `((b % 1) + 1) % 1`; keep the wall-clock fallback when `null` (menus/visualisers with no
  song). This phase-locks both existing call sites (`run.js:3800` beatBar wobble,
  `run.js:4407` checkOnBeat) with zero call-site churn.
- `onBeat(fn)` (line 4687): return an unsubscribe closure, mirroring `onLoop`
  (`audio.js:4689`). The sole caller ignores the return value — safe. Not needed by this
  feature (it polls), but it closes the leak trap for anything run-scoped later.

### 2. New module `src/game/beatchart.js` (DOM-free, beside spawner.js)
- `deriveChart(bank, { density })` → `[{ slot, action: 'jump'|'duck'|'coin', type }]` over
  the bank's 8-beat loop (32 steps ÷ 4):
  - kick → `beatBar` (jump; already `beatSync: true`, `entities.js:88`), snare → `drone`
    (duck, `entities.js:31`), clap/hats → coin accents.
  - Feasibility pass thins in priority kick > snare > clap using the D2 spacing rules,
    **including across the loop seam** (slot 7 → slot 0 of the next pass).
  - `density` from `stage.index`: 1 = jumps only, 2 = + ducks, 3 = full chart — the existing
    tierMax difficulty ramp, restated musically.
  - Honor an optional hand-authored `export const chart` from the song file as an override —
    the tuning valve after playtesting, so awkward derived lanes are fixed in data, not code.
- `class BeatSpawner` with the same `fill(worldX, speed, obstacles, pickups, jumpHeightFn,
  stopX)` surface as `Spawner`, plus `nextX`/`lastActionX` fields so `restoreSnapshot`
  (`run.js:5477`) and `spawnScriptedPits`'s `nextX` push (`run.js:5314`) work unchanged; ctor
  `{ bank, chart, pitPlan, react }`:
  - Per fill: anchor per D1, lay chart obstacles up to the lookahead/`stopX`, tag each with
    `ob.chartAction` and `ob.chartSlot` (the telegraph reads these).
  - Skip any event within `pitClearance` of a `pitPlan` entry or inside a crossing span —
    pits and crossings read as drum-fill *rests*; `spawnScriptedPits` itself is untouched
    (pits are not quantized to bars — not worth the coupling; the lane simply goes quiet).
  - No random patterns and no `fairGap` — the chart is feasible by construction. Coins via
    the existing `makePickup('coin', …)` shapes.

### 3. `src/game/run.js` — the `mechanic === 'beat'` branches
- Init: `this.beatLock = this.cabinet.mechanic === 'beat' && !this.overtime && !this.bossCab`.
  Construct `BeatSpawner` instead of `Spawner` when set. Note ordering: `pitPlan` is built at
  `run.js:1742-1759`, *after* the spawner (`run.js:1701-1708`) — move the beat-branch spawner
  construction below the pitPlan block so the plan can be handed in.
- `get speed` (`run.js:2103`): if `beatLock`, return `this.baseSpeed()` — no ramp, no
  `hero.speedMult`, no `speedBoost`, no powerup multiplier, no dash/roll/stumble multipliers.
  Abilities stay usable (they still smash things); they just don't change scroll speed here.
- `speedAt(frac)` (`run.js:2097`): same branch, so rhythm-2's crossing (`run.js:1755`) is
  sized for the locked speed.
- Music warp (`run.js:2406`): `if (this.beatLock) Audio.setWarp(1, star); else` the existing
  line — tempo locked; the invincibility star keeps its pitch color.
- Pickup bans: extend `randomPowerPickup(rng, avoid, allowRewind)` to a ban-list form banning
  `capSpeed`, `capLowGrav`, `capRewind` on beat stages (substituting shield/magnet, keeping
  the table shape); thread through the drip call (`run.js:~2581`) and the !-crate prize call
  site.
- `checkOnBeat` (`run.js:4406`): now phase-locked via step 1. Add feedback: `this.beatCombo`
  increments on hit (score `20 + 5·min(combo, 8)`), resets on an off-beat press;
  `floatText('ON BEAT x' + n, '#f6d33c')` every 4th hit (existing primitive, cf.
  `run.js:3792`). Also count `ability` presses (`run.js:2522`) toward the onbeat challenge,
  matching "every action".
- `rephaseBeatLane()`: read the live anchor, compute the phase delta, and shift only
  off-screen `chartAction` obstacles. Call on unpause and after rewind release
  (`Audio.setRewinding(false)` sites).

### 4. `src/game/hud.js` — beat telegraph (in `drawHud`, line 374)
When `run.cabinet.mechanic === 'beat'` and not paused/dead: a slim ribbon (~6 px) across the
HUD bottom — a "now" tick pulsing with `Audio.musicAnalysis().beatPulse` (allocation-free,
safe per frame), faint beat gridlines, and up-caret / down-bar icons for upcoming chart
obstacles placed at `(ob.x − playerWorldX) / pxPerBeat`, horizon ~4 beats, read straight from
`run.obstacles` entries carrying `chartAction`. Existing `drawPanel` pixel style.

### 5. Data
- `src/data/songs/rhythm.js`: no change — keep 124 BPM. Derivation first; the hand-authored
  `chart` export is the tuning valve if the derived lane plays thin or awkward.
- `src/data/cabinets.js`: the cabinet's obstacle patterns become unused on beat stages
  (BeatSpawner ignores them) — leave them (Surge's union bank and the fairness sim still
  consume them) and note it in a comment.
- `src/data/stages.js`: no change — the `onbeat` challenges on rhythm-1/2 become real via the
  clock fix.
- Note: with no ramp, `totalDist = duration × baseSpeed × 1.05` (`run.js:1683`) makes a
  90 s stage take ~94.5 s — acceptable; optionally drop the 1.05 factor under `beatLock`.

## Verification

- New `tests/beat-chart.js` (registered in `tests/run-all.js`):
  1. Unit — `deriveChart(RHYTHM.bank)` invariants: all actions on integer slots, jump spacing
     ≥ 2 beats including the loop seam, jump→duck ≥ 2 beats, density ramps by stage index.
  2. Integration via `tests/dom-stub.js` (pattern: `tests/spike-crossing.js`) — build
     `RunState` for rhythm-1/2/3, step frames, assert every `chartAction` obstacle sits at
     `(x − anchorX)/pxPerBeat ≈ integer`, the speed getter stays constant across
     tRun/dash/powerups, no chart obstacle lands inside a pit clearance window on rhythm-2,
     and a checkpoint restore refills a phase-consistent lane.
- `npm test`, `npm run sim` (the base `Spawner` is untouched — the fairness sim must still
  pass, including its rhythm cabinet entry), `tests/run-complete.js` (the DemoBot must
  survive the new lane; chart spacing ≥ the fairness worst case guarantees it).
- `/verify` in a real browser: drive to rhythm-1 (`?startAt=` dev URL, `run.js:1685`),
  screenshot the ribbon and beatBars pulsing in phase with obstacles ~112 px apart;
  pause/unpause and confirm the off-screen re-phase.

## Critical files

| File | Role |
| --- | --- |
| `src/game/run.js` | speed lock (2103/2097), warp (2406), spawner swap (~1701, moved below pitPlan), checkOnBeat (4406), re-phase hooks |
| `src/game/beatchart.js` | new: `deriveChart` + `BeatSpawner` |
| `src/engine/audio.js` | `beatPhase` rebuild (6792), `onBeat` unsubscribe (4687) |
| `src/game/hud.js` | telegraph ribbon in `drawHud` (374) |
| `src/game/spawner.js` | pickup ban option on the drip (437/449); fairness constants as reference |
