# The rewind power-up

> **Status: built and shipped on every device.** Two things changed from the design
> below, which is otherwise still accurate about the *mechanism*:
>
> 1. **It is dealt to every device**, not just touch. On a keyboard it sits alongside
>    the free hold-Left scrub rather than replacing it. See **Cross-platform**.
> 2. **It has no button. It fires itself.** The design had the player press RWD/a key to
>    spend the charge; playtesting killed that — see **Why it has no button**. Every
>    reference below to a REWIND button, the `rewind` input action, `chrome.rewind` or
>    `KeyZ` is HISTORY: none of it exists in the code.

## Context

*(As of the original design. The gate described here still governs COST — ring size,
capture node, recording — but no longer governs who is dealt a capsule.)*

Rewind was **fully off** on mobile — not degraded, absent. Both halves of the
feature ask `Input.rewindAvailable()` (`src/engine/input.js:358`, which is
`!isTouchDevice() || padConnected`) and both bail on a coarse-pointer device:

- `src/game/run.js:3950` — `recordRewindFrame` returns before capturing, so the snapshot
  ring stays empty for the whole run.
- `src/main.js:523` — `Audio.setCaptureEnabled(false)`, so the continuously-running
  master-output recorder node is never created and there is no reversed-SFX audio.

The touch layout never had a control for it anyway: `RunState.setButtons`
(`src/game/run.js:1499`) binds only JUMP / USE / PAUSE, and rewind is a *held* `left`.
The `LT/A REWIND` key legend (`src/game/hud.js:696`) is drawn only when
`!Input.usingTouch`.

That gate was a cost decision — recording is the largest steady allocation source in a
run — and it is right for a control that is always live. A power-up changes the shape of
the problem: the tape only has to roll while a charge is armed, which is a small
fraction of a run instead of all of it.

One constraint shapes everything below: the buffer must already be rolling *before* the
button is pressed. You cannot start recording at press time — the rewind rewinds the
past. So "record for a short time" means "record for the armed window", not "record on
demand".

## Why it has no button

The first build did what this document originally specified: the capsule banked a
charge and the player spent it with a REWIND button (touch) or a key (desktop). The
first time it was played, the report was *"I collected a rewind power up and nothing
happened — I thought it would just automatically rewind."*

That is the correct reading of the object, and the manual version was wrong for a
reason no amount of signposting fixes. A rewind is useful at exactly one moment — the
instant after a mistake — and that is the moment the player is least able to notice a
banked resource and press something for it. Asking them to is asking for the hardest
possible input at the worst possible time.

So the trigger is the mistake itself. `RunState.autoRewindHit`, called from the top of
`takeHit`, is now the ONLY way the capsule ever fires: take a hit with a charge armed
and the hit is not applied at all — the tape runs back three seconds and the run
continues from before it happened. Nothing to press, nothing to learn.

What that bought, beyond the confusion going away:

- **It undoes a PIT**, which nothing else in the game does. This deliberately overrules
  both the "nothing saves you from a hole" rule in `takeHit` and this document's
  original "No death undo" decision. The distinction that makes it legal: i-frames
  claim you *survived* the fall, which a hole must never allow; a rewind means the fall
  never happened. The pit is still there when the tape stops, three seconds upstream
  and coming again — the player gets the approach back, not a pass.
- **The whole touch-button apparatus is gone.** No `rewind` action in `DEFAULT_KEYS`, no
  `chrome.rewind` slot in `resizeChrome`, no fourth disc in `playButtons`, no `RWD`
  label in `chromeButtonArt`. The `### src/engine/input.js` and `### src/engine/renderer.js`
  sections below describe work that was built and then removed.
- **The messaging changed with it.** The grab floats `REWIND ARMED: YOUR NEXT MISTAKE
  UNDOES ITSELF`, the firing floats `REWIND!` at the *start* of the tape so the player
  knows why the world reversed while it is reversing, and the finish floats
  `REWIND SPENT`.

## Cross-platform

The capsule does **the same thing everywhere**: it banks exactly one 3-second rewind.
What differs by device is only what it sits *beside*, and what the recording costs:

| | touch (no pad) | desktop / pad |
| --- | --- | --- |
| free hold-Left scrub | none | unchanged: unlimited, 10s tape |
| the capsule | the ONLY rewind there is | one banked 3s shot beside the scrub |
| snapshot ring | 45 records (3s), armed windows only | 150 records (10s), always |
| audio capture node | created on grab, torn down on spend/expiry | boot-time, permanent |
| how it is spent | automatically, on your next mistake | automatically, on your next mistake |

`Input.rewindAvailable()` still gates every line in the cost column — the ring size, the
capture node and the recording gate. It no longer gates *access*: nothing about who is
handed a capsule depends on the device.

Two consequences worth stating, because both were live decisions:

- **The desktop capsule is a genuine convenience, not a downgrade.** Holding Left is a
  scrub you steer; the capsule is a single button that undoes the last three seconds
  without taking your hand off the run. They coexist, and firing the capsule arms the
  ordinary `REWIND_LOCKOUT` so it cannot be chained with the scrub.
- **Both platforms need to be TOLD.** The capsule does nothing visible when grabbed, so
  it reads as a dud until it fires. The grab floats `REWIND ARMED: YOUR NEXT MISTAKE
  UNDOES ITSELF` and the pause screen carries a matching chip; both are device-neutral,
  since there is no control to name.

## Decisions taken

- **Desktop's free rewind is untouched.** Hold-Left / pad-A stays free and unlimited,
  with constant recording and the 10-second ring exactly as before.
- **A hit fires a fixed ~3s rewind**, then hands off to the existing 0.55s
  deceleration ramp and the 3s lockout.
- ~~**No death undo.**~~ **Reversed** — see **Why it has no button**. The charge fires
  from inside `takeHit`, before any death is staged, so it undoes fatal hits and pits
  as well as ordinary damage. Deaths with no charge banked remain the checkpoint
  system's job, unchanged.

## Design

Grab a `capRewind` capsule → `powerups.active.rewind` remains armed until the level ends
→ the next hit runs the tape back 3 seconds instead, and consumes the charge. There is
no countdown and no expiry. (The design originally had a button here; see **Why it has
no button**.)

On touch the armed lifetime is also the *recording* lifetime: from collection until the
charge fires or the level ends, the snapshot ring records and the audio capture node
exists. Cost there is ~45 pooled snapshot records instead of desktop's 150; a touch run
still pays nothing before collecting the capsule or after spending it.

On desktop none of that applies — the ring and the capture node are always live for the
free hold-Left scrub — so arming and disarming are pure no-ops beyond showing the hint.
`updateRewindArm` returns early on `Input.rewindAvailable()` for exactly this reason,
and that early return is load-bearing: without it, a capsule expiring would reset the
10-second ring and silently take the free scrub's tape with it.

## Changes

### `src/game/powerups.js`
- `POWER_DEFS.rewind = { name: 'REWIND', color: '#7ce8a0' }` — mint green is the one
  slot the capsule set has left; shield/airjump already own two blues and the tape FX
  itself is cold blue-white (`rewindFx.js`), so a third blue would read as one of them
  at 8px. Colour is a tuning call.
- `grab('rewind')` stores `{ level, persistent: true }`; `Powerups.update` does not tick
  persistent entries. The fixed rewind length still lives in `run.js`.
- `rollPowerPickup(rng)`: see **Where it comes from** below. (The original plan carved
  rewind out of unpeel's band behind an `allowRewind` flag; going cross-platform
  retired both the carve and the flag.)

### `src/game/entities.js` + `src/sprites/props.js`
- `PICKUPS.capRewind = { w: 8, h: 8, sprite: 'capRewind', power: 'rewind' }`.
- A `capRewind` painter beside `capUnpeel` (`props.js:889`) — a ◀◀
  double-triangle over a tape reel reads unambiguously in silhouette at 8px regardless
  of the colour choice. Add `capRewind: 2` to `PROP_DETAIL_SCALE` (`props.js:2601`).
- `art-warmup.js:81` already enumerates `PICKUPS`, so warm-up picks it up for free.

### `src/engine/input.js`
**REMOVED — nothing here is in the code.** A `rewind` action was bound to `KeyZ` (not
`KeyR` as first planned: R is reserved by the dev tuning strip, and `tests/tunables.js`
rejects a game action that takes it). The auto-fire trigger left it with nothing to do.
- No change to `rewindAvailable()` — it keeps meaning "this player has *free* rewind",
  which is exactly the predicate both the drip gate and the ring sizing want.

### `src/engine/renderer.js` (`resizeChrome`) — REMOVED, see **Why it has no button**
- Add a `chrome.rewind` slot in both margin modes, mirroring how PAUSE shares a
  column with ABILITY:
  - `'side'`: at `{ x: jumpX, y: yTop }` (top of the JUMP column), zone
    `{ x: 0, y: 0, w: ox + CHROME_GAME_EDGE_BUF, h: pauseZoneH }`.
  - `'topbottom'`: top-left, taking the left half of the top bar; PAUSE keeps the right.
- **Leave JUMP's zone at full height.** `Input.chromeButtonAt` (`input.js:405`) returns
  the *first* registered button whose zone contains the point, so registering REWIND
  ahead of JUMP makes the specific zone win while an unregistered REWIND leaves no dead
  strip. Shrinking JUMP's zone instead would open a hole whenever the charge is absent.

### `src/game/run.js`
- Constants beside the existing rewind block (~line 144):
  ```js
  const POWER_REWIND_SECONDS = 3;                                  // tape length
  const POWER_REWIND_FRAMES = POWER_REWIND_SECONDS * REWIND_FPS;   // 45 snapshots
  ```
- Ring sizing in the constructor (`run.js:743`):
  `new RewindRing(Input.rewindAvailable() ? REWIND_MAX_FRAMES : POWER_REWIND_FRAMES)`.
  Comment the one edge this accepts: a pad paired *mid-run* on a touch device gets a 3s
  free rewind for the rest of that run instead of 10s, because capacity is fixed at
  construction.
- `recordRewindFrame` (`run.js:3946`) gate becomes
  `if (REWIND_DISABLED) return; if (!Input.rewindAvailable() && !this.powerups.active.rewind) return;`
- **One armed/disarmed transition hook**, immediately after `this.powerups.update(dt)`,
  comparing against a `this.rewindArmedPrev` flag. It is the single place that handles
  grab, expiry and spend uniformly, and it does two things (both no-ops when
  `Input.rewindAvailable()`, so desktop's boot-time capture node is never torn down):
  - `Audio.setCaptureEnabled(armed)` — `setCaptureEnabled` (`audio.js:1995`) already
    starts/stops the node live once `ctx` exists, despite its comment.
  - `this.setButtons()` — so the REWIND chrome button appears and disappears with the
    charge. `drawChromeButtons` already folds `b.id` into its dirty signature
    (`run.js:1589`), so the repaint follows for free.
- `setButtons` (`run.js:1499`): when `this.powerups.active.rewind`, prepend
  `{ id: 'rewind', ...chromeGeo.rewind, action: 'rewind' }` **before** the jump entry in
  the `setChromeButtons` list (see the zone-order note above). For `chrome.mode ===
  'none'`, add a matching in-canvas round button to `playButtons()`
  (`src/game/hud.js:57`) — the existing three sit at `x: 12` / `x: W - 56`, so REWIND
  goes above JUMP on the left.
- `chromeButtonArt` (`run.js:1574`): `if (id === 'rewind') return { label: 'RWD' };`
- Firing, in the update block at `run.js:1846`, **above** the existing hold-`left`
  branch so the two never fight over the same tick:
  - Trigger: `Input.pressed('rewind') && this.powerups.active.rewind &&
    this.rewindFrames.length > 0 && this.rewindLockout <= 0` →
    `this.rewindPlayFrames = Math.min(POWER_REWIND_FRAMES, this.rewindFrames.length)`,
    then `Audio.setRewinding(true)`, `this.rewindFx.start()`, `this.rewinding = true`.
  - Playback: while `this.rewindPlayFrames > 0`, pop and restore one snapshot per tick
    (the same 1-per-tick rate as the hold path — 45 snapshots is 45 ticks of wall time
    covering 3s of recorded time), decrement, `rewindFx.tick(dt)`, `Input.endFrame()`,
    `return`.
  - Finish (counter hits 0 or the ring empties): fall through to the existing release
    edge at `run.js:1871`, which already does `Audio.setRewindPos()`,
    `setRewinding(false)`, `rewindFx.stop()`, the squared deceleration ramp and
    `REWIND_LOCKOUT`. Nothing there needs changing.
- **Gotcha — the charge restores itself.** `writeRewindSnapshot` records
  `s.activePowerups` (`run.js:4018`) and `restoreRewindSnapshot` copies it back, so every
  snapshot taken while armed carries `active.rewind` with a *longer* remaining timer.
  Without an explicit `delete this.powerups.active.rewind` **after** the final restore,
  the capsule refunds itself and the rewind is infinite. Do the delete in the finish
  branch, not on trigger. See the single-shot section below — this is the one line the
  whole guarantee rests on.

### `src/main.js`
- Leave the boot-time `Audio.setCaptureEnabled(Input.rewindAvailable())` (`main.js:523`)
  exactly as it is — desktop keeps its permanent node, touch starts with none and
  run.js toggles it.
- The Arcade Corner prize pool (`main.js:439`, `rr.pick(Object.keys(POWER_DEFS))`)
  includes `rewind` and needs no filter. The original plan excluded it because Arcade
  Corner is shuttered on touch, so the pool could only reach a player who could not use
  the prize — cross-platform removes exactly that objection.

### Not in scope for v1
No Repair Bench upgrade track (`src/data/progression.js` `BENCH_UPGRADES` stays at
three), so `levelOf('rewind')` is always 1 and the level tables above are headroom only.

## Where it comes from

Three sources, and a player meets them in this order:

1. **The scripted introduction.** `rewindAt` on a stage (`src/data/stages.js`), a
   fraction of stage distance exactly like `applianceAt`, planted by
   `RunState.spawnScriptedRewindMaybe`. **PLUMBER PANIC 2 at 0.15** is the one that
   exists: its challenge is TAKE NO DAMAGE, which is the run where undoing three
   seconds is worth most, and 0.15 is early enough that the player meets the capsule
   before the stage is asking for attention. It rides the drip's own spacing ledger
   (`canPlacePower` / `notePower`), so it holds rather than skips when crowded.
2. **The drip**, ~10% of capsules, on every device.
3. **`!`-crate prizes and the Arcade Corner bonus**, which share the drip's table.

### The drop table

Rewind holds a **10% band of its own, taken from the staple tail** — it does *not* split
unpeel's band, which is what the touch-only design did:

```js
if (roll < 0.08) return staple(roll);  // 8%  — the relay baton's old band, now a staple
if (roll < 0.18) return 'capUnpeel';   // 10% — unchanged, as tuned
if (roll < 0.28) return 'capRewind';   // 10% — its own band
if (roll < 0.58) return [...traits];   // 30% — unchanged
return rng.pick(['capShield', 'capMagnet']);  // 42%, down from 52%: the staples pay
```

The carve was wrong once rewind went cross-platform, and `tests/breaker-bonus.js` is
what said so: halving unpeel to 6% took "rarest drop in the game" away from the relay
charge, which is a free power and is supposed to hold it. Pricing rewind at unpeel's 10%
says the true thing about it — the same *kind* of find, not a staple — and the staples
absorb the cost without any of them falling near unpeel. Measured: relay 8.1%,
unpeel 10.8%, rewind 10.6%, traits 10.4/10.0/10.6, staples 19.8/19.7.

## The single-shot guarantee

One capsule = one rewind, and the button is gone the instant it fires. Four independent
things enforce that, so no single mistake can leave the player in a loop:

1. **The charge is consumed.** `delete this.powerups.active.rewind` in the finish branch,
   *after* the last restore has run. Placing it on trigger instead is the bug: the
   snapshots being restored still carry the charge, so the restore would hand it straight
   back and the player could rewind forever. This is the ordering the new test asserts.
2. **The button is removed.** The armed/disarmed transition hook sees `active.rewind`
   vanish on the next frame and calls `setButtons()`, which drops the REWIND entry from
   `Input.setChromeButtons` — so there is no target left to tap. `drawChromeButtons`'
   dirty signature changes with it and the margin repaints without it.
3. **The tape is spent and cannot refill.** Firing pops the snapshots it replays, and the
   same transition hook stops `recordRewindFrame` and tears down the audio capture node —
   so `this.rewindFrames.length` is drained and stays drained until another capsule is
   grabbed. Even a stray `Input.pressed('rewind')` fails its `rewindFrames.length > 0`
   guard.
4. **The existing lockout backstops it.** The finish branch falls into the release edge
   at `run.js:1871`, which arms `REWIND_LOCKOUT` (3s) exactly as the desktop path does.

Grabbing a second capsule mid-window is the normal `Powerups.grab` path: it refreshes the
banked charge (and buys a temporary +1 level), it does not stack a second rewind.

## Verification

- `node tests/run-all.js` — the whole suite must stay green. It is green. Watch in
  particular:
  - `tests/rewind-pooling.js` — the desktop path. Pins that pooling is still
    alias-free, and now also carries the **desktop half of the power-up**: it is the
    only suite that boots a keyboard run, so a hit spending the charge, the camera
    walking back, the single-shot guarantee and constant recording surviving the
    capsule are all asserted there.
  - `tests/rewind-powerup.js` — the touch path, where the mechanism is load-bearing
    rather than a convenience. Also pins the **pit undo**, the one rule this feature
    deliberately overrules. Boots on a simulated coarse-pointer device
    (`tests/touch-smoke.js:11`'s `matchMedia` stub) and asserts: the ring is 45 and not
    150; length stays 0 through normal play with no charge; a scripted `rewindAt` deals
    exactly one capsule; an armed charge fills the tape and caps it; a hit fires the tape instead of landing; the run walks
    backwards; `powerups.active.rewind` is **absent** afterwards (the
    refund gotcha — the assertion that would have caught it); the lockout arms; and an
    an unused charge remains armed and keeps a fresh 3-second tape through the level.
  - `tests/breaker-bonus.js` — the drop table, including rewind's share and the
    ordering that keeps the relay charge rarest. This is the suite that caught the
    original band carve being wrong for cross-platform.
  - `tests/difficulty-identity.js` — difficulty modes still resolve identically.
- Note `tests/routes.js` is seed-flaky by design (`Date.now()` seed); rerun it several
  times before attributing a failure there to this work.

### Still outstanding

- ~~**Real-device pass**~~ **DONE.** Driven in Chromium at a phone viewport (844x390)
  through PLUMBER PANIC 2 via `work/local/verify-rewind.mjs`: the scripted capsule
  spawns and is legible in the lane, the grab floatie and the mint REWIND timer both
  read, a real `takeHit` fires the tape effect, the world walks backwards
  (215 -> 181 distance), the battery is untouched (4 -> 4), the charge is spent, and
  **the TAKE NO DAMAGE bonus is still showing OK** — the hit genuinely never happened,
  which is the whole payoff for putting the capsule on this stage. No console errors.
- **Perf sanity**: the gameplay profile HUD prints `REWIND x.xxms`
  (`src/engine/gameplay-profile.js`) — on touch it should read 0 outside armed windows
  and rise only inside them. Not yet measured on hardware.
- **Audio**: on touch the capture node is a `ScriptProcessor` created mid-run on grab.
  Listen for a glitch at that moment on a real phone — it lands under the `'power'`
  sting, which should mask it, but it is the one thing here that could sound wrong.
  Desktop is unaffected (its node is a boot-time fixture).

## Known adjacent quirk (not fixed)

The free hold-Left path never actually arms `REWIND_LOCKOUT`: the "Done. Reset." lines
at the foot of the rewind block zero `rewindCooldown` on every idle frame, so the 0.55s
deceleration ramp lasts one frame and the branch that would set the lockout is not
reached. Pre-existing, unrelated to the capsule, and left alone deliberately — it is a
live gameplay change that has not been asked for. The power-up path is unaffected: it
arms its own lockout explicitly on the finish frame.
