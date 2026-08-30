# Boss level redesign — three bespoke fights

## Context

The user dislikes the boss levels: all three bosses share one 232-line template
(`src/game/boss.js`) where the boss is welded to the camera at 62% of view width with
a sine wobble on an infinite treadmill, and its only behavior is spawning an ordinary
lane obstacle every ~2s. It reads as a re-skinned `chase` mission (same pinned-sprite
idiom, `run.js:4022`). Problems confirmed in code:

- No telegraphs, no phases beyond a drop-rate index (`phaseIdx()` only indexes `dropEvery`).
- Shooter heroes can spam their ability at nothing and win (always-live boss AABB,
  `boss.js:130-144`).
- Dying is nearly free: `makeSnapshot` (`run.js:5407`) doesn't capture `bossHp`, so the
  t=0 snapshot refills the battery while the boss keeps its damage — unloseable outside
  UNPLUGGED.
- Two abandoned mechanics sit in the data: `switches: true` (surge, never read) and a
  "jump on beat" comment (`boss.js:121`) that was never implemented.
- Joke beats hard-freeze the game (`jokeT` branch) instead of being mechanics.

**User decisions:** three bespoke fights (one mechanic identity each); use telegraphed
attacks, weak-point windows, terrain & switches, and role-reversal segments; boss HP
resets on death. Design pillar stays (GAME_BIBLE.md:638): "Runners, not fighters" —
every attack dodgeable with jump/duck; abilities accelerate, never gate survival.

**Hard constraint:** difficulties 1–4 must stay byte-identical
(`tests/difficulty-identity.js`) — scripts never read `difficulty`. UNPLUGGED differs
only via existing `oneHit`/no-snapshot paths.

## Architecture: one chassis + three fight modules

Keep a single `BossState extends RunState` in `src/game/boss.js` (physics, collision,
relay, HUD, speech, projectiles come free). Move each fight into
`src/game/boss/{neon,rhythm,surge}.js` modules — **not** subclasses, because the
RunState overrides (`breakObstacle`, `endRun`, snapshot, draw, damage routing, HUD) are
shared concerns that would drift across three subclasses. What differs per boss is a
fight script: data plus small hook functions.

Module contract (default export):
```
{ data: {name, hp, sprite, intro, subtitle?, fakeBars?},
  init(bs), phases: [{hpAbove, script: [move,...]}],
  update(bs, dt), onWindowOpen/Close(bs), onBossHit(bs, src), onPhase(bs, i),
  drawWorld(bs, ctx)?, drawHud(bs, ctx)?, serialize(bs)/restore(bs, s) }
```

The chassis owns, written once:

1. **Pose interpolator** — `bossPose` eased toward a target `{x, alt}`; replaces the
   welded sine hover; gives swoop/park/flee/behind-player for free (~30 lines).
2. **Attack-script runner** — sequential moves per phase, each
   `{telegraph: {t, sfx, callout?, shadow?}, act(bs), recovery}`; deterministic off
   `this.rng`; loops until HP crosses into the next band.
3. **Weak-point windows** — `vulnT > 0` + `windowHitsLeft` (1–3). Outside a window,
   direct hits ping off with a spark + `'DISPUTED'` floatie (fixes shooter spam).
   Inside: any projectile in the boss box, **or player contact while attacking**
   (stomping / dashT / rollT / flurry) — so all 8 kits have identical window access.
   The boss body never hurts on touch (attacks hurt; the body is furniture).
4. **Damage routing + HP/phase machine** with hitstop/shake/floaties
   (keep `BOSS_HIT_SHORT`/`BOSS_DEFLECT_SHORT`).
5. **Fair-spawn helper** `layDrop`/`layShot` — telegraph ≥ 0.5s, arrival ≥
   `speed * REACT_FLOOR` (import from `spawner.js:32`) past the previous
   action-requiring spawn, never a jump-read and duck-read within 0.35s. Timing is
   authored; only drop-type picks are random.
6. **Beat clock** `bs.beat()` → `Audio.beatPhase()` with a deterministic
   `tRun`-derived 120 BPM fallback (headless/muted).
7. **Shared boss HUD** — name plate, real bar, fake-bar gag kept; boss + bar flash
   gold with a `LIABLE` tag while `vulnT > 0` (HUD teaches the damage rule).
8. **Snapshot extension** — see Death stakes.

`boss.js` keeps exporting `BOSSES` (assembled from module `data`) and `BossState`, so
`main.js:374` and `tests/boss.js` imports don't move.

## Per-boss fights

### Neon — CLOWN-COPTER (Act I, 6 HP): deflection duel with swoop windows
- Redirect damage stays (break a `fromBoss` drop = 1 dmg) — keeps Act I generous.
- Phase 1: strafe + **falling drops** (`alt≈70, falls:true, telegraph:0.7` — the icicle
  mechanism, `run.js:3903` — plus a drawn landing-shadow ring); one `enemyShot` laser
  volley (existing 0.4s telegraph; Fernwick can deflect it back into the boss box for
  a window hit, extending `run.js:4143`); then **SWOOP WINDOW**: callout
  `'ROTOR OVERHEAT. BRIEFLY LIABLE.'`, boss drops to ground level ~60px ahead for
  1.6s, 1 hit — reachable by every kit.
- Phase 2: drops ×3 incl. cactus, volleys ×2 alternating jump/duck reads, window 1.2s.
- **LOW BATTERY joke made diegetic:** at 50% HP the copter lands and powers down 3s —
  the existing card draws over *live* gameplay; the parked copter is a long free
  window. The freeze branch is deleted.
- Phase 3 (role-reversal lite): after each volley the copter **skids along the ground
  toward the player** (finish-dog closing numbers, `run.js:3868`, as reference) —
  simultaneously a jump-read hazard and the window; telegraphed by skid dust + klaxon
  0.6s before it drops. Attacking it cancels the skid.

### Rhythm — DUST DEVIL 9000 (Act II, 8 HP): the beat fight; finish the abandoned mechanic
- Suction all fight (grounded-only camX creep); **jumping on-beat** (takeoff within
  ±0.12 of a beat edge) grants 0.7s immunity + pushback + `'ON BEAT'` floatie. The
  nozzle drawn ahead is an ordinary hazard box (1 cell + pushout, never instakill).
- **Beat-pulse ring** around the boss contracting to zero on each beat (new small
  primitive; visible timing for accessibility).
- 4-bar phrases: **HURL** junk on downbeats via `layDrop` snapped to beats (the
  `beatSync` precedent, `run.js:3974`) — the dodge rhythm is the song. Phase 2 adds
  off-beat eighths and a **DEEP CLEAN bar** (suction doubles, telegraphed one bar
  early by vacuum-whine + LED callout).
- **BAG EMPTY window** every 2 phrases: it grounds and opens its bag for 2 bars
  (2 hits) — the existing shame joke becomes the weak point.
- **RHYTHM ROYALTIES**: 4 consecutive on-beat jumps stun it early → bonus window
  (1 hit). Beat skill accelerates the fight; ignoring it only slows it.
- Phase 3 hunt (≤⅓ HP, role reversal): it vaults **behind** the player; suction sign
  flips (dragged backward unless jumping on beat) while junk arrives from ahead.
  Survive 4 bars → it overheats, tumbles past, spills the bag — final window (2 hits).
- Breaking hurled junk pays coins but not damage (that's neon's identity); HUD hint
  line: `DAMAGE WINDOW: WHEN THE BAG OPENS`.

### Surge — EGGSHELL & THE POWER STRIP (Act III, 12 HP): terrain & switches; escape-wall finale
Finish the abandoned `switches` mechanic. Three segments of 4 HP, each
**remix volley → switch circuit → stun window**:
1. **Remix volley** — samples the campaign: a falling-junk volley (neon callback), a
   beat-synced hurl pair (rhythm callback), one `shooterDrone`, plus chair /
   cardboardMonster drops. `EGGSHELL_TAUNTS` via `say()`.
2. **Switch circuit** — the script lays a raised island (hand-built object matching
   the `routes.js:278-399` shape, pushed into `this.routes` at runtime — run.js
   consumes routes per-frame at :2534/:2593/:6941; the guard at :1765 only governs
   enter-time `buildRoutes`) over a gap, with a **`bossSwitch`** on top: new
   entities.js def = switch + `isTarget:true` (pellets connect, run.js:4099) +
   `sign:true` (running through it flips it — the kit-agnostic path). Flipping it
   calls `openGates` (bridges the gap, `run.js:3565`) **and shorts the copter**:
   Eggshell crashes, sparking — 3s stun window, up to 3 hits. Missing it = jump the
   gap the hard way, volley repeats. Cull boss-laid routes off-screen left.
3. Jokes play as speech over live play (crayon-certificate "shield" draws as a
   useless prop during a stun window; `'PHASE FIVE'` line at 25%). `fakeBars` gag
   stays; `fakeBarsReal` deleted.
- **Finale (last 2 HP): THE UNPLUGGENING** — `escapeWall` activates
  (`run.js:1795/:4044` reused wholesale), screen tint + music detune; one denser
  circuit under wall pressure ends it. `endRun(true)` → existing
  `bossesDown.surge` + `Flow.startFinale()` flow untouched.
- **Per-segment checkpoints**: fresh snapshot at each segment boundary taken at a
  lane moment (`route == null`, no live boss routes).

## Death stakes

- `BossState.makeSnapshot()` = `super.makeSnapshot()` +
  `{bossHp, phaseIdx, scriptCursor, fight: module.serialize(bs)}`;
  `restoreSnapshot` restores them, clears live windows/boss routes, rebuilds the
  current arena from the script cursor, and holds the script 1s after the existing
  0.75s restore i-frames (no instant attack on respawn).
- Neon/rhythm: single t=0 snapshot → death resets the whole fight. Surge: segment
  snapshots → death resets the current segment only (12 HP anti-frustration).
- UNPLUGGED unchanged: `oneHit` → death ends the run (`run.js:6700`).

## Cleanup

Delete: `jokeT` freeze branch (`boss.js:94-98`) + freeze overlay (:225-230);
`fakeBarsReal` (:51); the no-op `realOrAllReal` ternary (:213 — both branches
identical; recompute honestly for the `REAL NOW` label). Replace `switches: true`
(:52) with the real surge script. The `:121` "jumping on beat" comment becomes real.
Fold the ad-hoc HUD (:207-224) into the chassis HUD with the window cue.

## Files

| File | Scope |
|---|---|
| `src/game/boss.js` | Rewrite as chassis (pose, script runner, windows, damage, fair-spawn, beat clock, snapshot, HUD). ~350–420 lines. Keep `BOSSES` + `BossState` exports and constructor signature. |
| `src/game/boss/neon.js`, `rhythm.js`, `surge.js` (new) | Fight modules, ~130/~180/~220 lines. |
| `src/game/entities.js` | `bossSwitch` def (+DEBRIS entry), ~10 lines. |
| `src/data/jokes.js` | New callout/window lines, ~30 lines. |
| `tests/boss.js` | Bot + assertion rewrite, ~200 lines. |
| `docs/SCRIPT.md`, `docs/GAME_BIBLE.md` | Update the three boss beat sections (SCRIPT.md :347/:422/:493 is dialogue source of truth). |
| `src/game/run.js` | Ideally zero. If the Fernwick deflect needs a boss-box check, do it inside BossState.update instead. |

## Verification

- **`tests/boss.js`**: keep the jump/duck/stomp bot core + 420s watchdog + smoke-draw;
  add "use ability when `vulnT > 0` and boss box within ~70px". Rhythm bot jumps when
  `bs.beat()` nears an edge (deterministic fallback clock makes this headless-safe).
  Surge bot uses the low road: B-33P pellets flip `bossSwitch` (isTarget) from the
  lane — no platforming needed. New assertions: all three fights winnable
  (`result.success`); shooter-spam outside windows leaves `bossHp` unchanged;
  death-stakes check — damage boss, `restoreSnapshot`, assert `bossHp === bossMax`
  (segment semantics for surge); at least one surge island laid and culled cleanly.
- Regression: `npm test` (esp. `tests/difficulty-identity.js`, `tests/routes.js`),
  `npm run sim`.
- **Browser**: repo `verify` skill; shots to `work/local/` (per CLAUDE.md). Capture
  per boss: intro, a telegraph (landing shadow / beat ring), a `LIABLE` window,
  rhythm's phase-3 hunt, surge's switch island + escape-wall tint, each victory.
  Manually verify the non-shooter path once per boss (Lorenzo-only team).

## Scope risks

1. **Runtime-laid islands (surge)** — the one feature leaning on engine paths not
   exercised on boss levels. Spike it first; fallback that keeps the design: no
   raised road — `bossSwitch` hovers at jump height over the lane + gaps +
   `openGates`. Same fight, less geometry.
2. Role-reversal segments stay re-skins of shipped primitives (pose interpolator,
   signed suction, escapeWall) — no chase AI, no pathfinding, no minigame weaving.
3. The boss body never enters the obstacle list — contact damage is a window-only
   check against `playerBox()` in BossState.update (avoids collision/snapshot
   entanglement).
4. Never snapshot indices into boss-laid route lists — snapshot only at lane moments
   and rebuild the arena from the script cursor.

## Branch

Develop on `claude/boss-level-design-alternatives-ho8twu`; commit and push there.
