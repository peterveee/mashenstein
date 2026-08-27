# Rewind power-up for touch devices

> **Status: designed, not built.** Parked for later. Nothing in `src/` has changed.

## Context

Rewind is currently **fully off** on mobile — not degraded, absent. Both halves of the
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

## Decisions taken

- **Desktop is untouched.** Hold-Left / pad-A stays free and unlimited, with constant
  recording and the 10-second ring exactly as today. The capsule is the touch-device
  equivalent, and the two are mutually exclusive by construction (both keyed off
  `Input.rewindAvailable()`).
- **Tap fires a fixed ~3s rewind**, then hands off to the existing 0.55s deceleration
  ramp and the 3s lockout. No hold semantics on the touch button.
- **No death undo.** The rewind branch stays below the `if (this.dead)` early return
  (`run.js:1844`); deaths remain the checkpoint system's job (`this.snapshot` /
  `restoreSnapshot`, `run.js:4582`).

## Design

Grab a `capRewind` capsule → `powerups.active.rewind` arms for ~12s → for exactly that
window the snapshot ring records and the audio capture node exists → a REWIND button
appears in the touch chrome → tapping it runs the tape back 3 seconds and consumes the
charge → recording and the capture node stop.

Cost on mobile: ~45 pooled snapshot records instead of 150, alive for roughly 12s per
capsule at a ~6% drip rate, rather than every frame of every run.

## Changes

### `src/game/powerups.js`
- `POWER_DEFS.rewind = { name: 'REWIND', color: '#7ce8a0' }` — mint green is the one
  slot the capsule set has left; shield/airjump already own two blues and the tape FX
  itself is cold blue-white (`rewindFx.js`), so a third blue would read as one of them
  at 8px. Colour is a tuning call.
- `durationFor`: `rewind: [0, 12, 15, 18, 20][level] || 12` — this is the **arm
  window**, not the rewind length.
- `rollPowerPickup(rng, allowRewind)`: carve rewind out of the rare UNPEELABLE band so
  the desktop table stays byte-identical and the RNG stream consumes the same number of
  floats either way:
  ```js
  if (roll < 0.18) return allowRewind && roll >= 0.12 ? 'capRewind' : 'capUnpeel';
  ```
  ≈6% on touch, 0% elsewhere. Thread `allowRewind` through `randomPowerPickup(rng,
  avoid, allowRewind)`; the drip caller in `run.js` passes `!Input.rewindAvailable()`.

### `src/game/entities.js` + `src/sprites/props.js`
- `PICKUPS.capRewind = { w: 8, h: 8, sprite: 'capRewind', power: 'rewind' }`.
- A `capRewind` painter beside `capUnpeel`/`capRelay` (`props.js:889`) — a ◀◀
  double-triangle over a tape reel reads unambiguously in silhouette at 8px regardless
  of the colour choice. Add `capRewind: 2` to `PROP_DETAIL_SCALE` (`props.js:2601`).
- `art-warmup.js:81` already enumerates `PICKUPS`, so warm-up picks it up for free.

### `src/engine/input.js`
- New action `'rewind'`. Bind it in `DEFAULT_KEYS` (`KeyR` is free) so headless tests and
  a curious desktop player can reach it; leave `left` and `GAMEPAD_MAP` alone.
- No change to `rewindAvailable()` — it keeps meaning "this player has *free* rewind",
  which is exactly the predicate both the drip gate and the ring sizing want.

### `src/engine/renderer.js` (`resizeChrome`, ~line 869)
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
- Exclude `rewind` from the Arcade Corner prize pool (`main.js:439`,
  `rr.pick(Object.keys(POWER_DEFS))`). Arcade Corner is shuttered on touch, so that
  pool can only ever hand rewind to a player who cannot use it.

### Not in scope for v1
No Repair Bench upgrade track (`src/data/progression.js` `BENCH_UPGRADES` stays at
three), so `levelOf('rewind')` is always 1 and the level tables above are headroom only.

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
arm window (and buys a temporary +1 level), it does not stack a second rewind.

## Verification

- `node tests/run-all.js` — the whole suite must stay green. Watch in particular:
  - `tests/rewind-pooling.js`, which drives real snapshot recording and asserts no
    aliasing between recorded and live state; it runs desktop-side and pins that this
    change did not disturb the existing path.
  - `tests/difficulty-identity.js`, which is the guard on the drip table being unchanged
    for keyboard players (headless = no coarse pointer = the desktop branch).
  - `tests/breaker-bonus.js`, for the prize-pool exclusion.
- **New `tests/rewind-powerup.js`**, modelled on `tests/rewind-pooling.js` for the boot
  and stage-entry route, plus `tests/touch-smoke.js:11`'s
  `window.matchMedia = (q) => ({ matches: q.includes('coarse') })` to simulate the
  device. `setButtons` gates on `Input.usingTouch`, which only flips on a real touch
  pointer event, so dispatch a `pointerdown` with `pointerType: 'touch'` on `#game`
  first. Assert:
  - ring length stays 0 through a stretch of normal play (no capsule, no recording);
  - after force-granting the charge, the ring fills and caps at `POWER_REWIND_FRAMES`;
  - a REWIND chrome button is registered while armed and gone once it is spent;
  - firing walks `run.distance` backwards, and `powerups.active.rewind` is **absent**
    once the rewind finishes (the refund gotcha above — this is the assertion that would
    have caught it);
  - the arm window expiring with the charge unused stops recording.
- Real device pass via the `verify` skill (drives a browser and screenshots the canvas),
  at a phone viewport: capsule is legible at 8px, the RWD button appears in the margin
  without crowding JUMP, and a tap fires the tape effect.
- Perf sanity: the gameplay profile HUD prints `REWIND x.xxms`
  (`src/engine/gameplay-profile.js:193`) — confirm it reads 0 outside armed windows and
  only rises inside them.
- Audio: the capture node is a `ScriptProcessor` created mid-run on grab. Listen for a
  glitch at that moment on a real phone — it lands under the `'power'` sting, which
  should mask it, but this is the one thing here that could sound wrong.
