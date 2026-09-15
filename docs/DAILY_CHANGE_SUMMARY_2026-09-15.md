# MASHENSTEIN — Daily Change Summary

**Prepared:** 2026-09-15 (Australia/Sydney)  
**Project:** `/Users/Peter/mashenstein`

## Scope and attribution

The current Codex clock is just after midnight on 2026-09-15. The active work
stream began on 2026-09-14 and continued past midnight, so this report covers
the complete workday visible in the Codex session history: 2026-09-14 00:03 to
2026-09-15 01:51 AEST.

The repository was already dirty during several tasks. Existing unrelated
edits were preserved, so this is a session-attributed summary rather than a
claim that every hunk in every touched file originated in one clean patch.
At the audit point, before adding this document, the worktree contained 42
modified tracked files and 5 new untracked files.

## Executive summary

Today’s work covered:

- A more reliable portrait/landscape presentation refresh, including camera,
  resolution, DPR, cache, blackout, and audio handling.
- Substantial Plumber, Frost, and Speed Zone scenery work using the paper style,
  stable ridge attachment, improved embedding, and gallery review surfaces.
- Softer, larger, more readable contact shadows, with detached airborne marks
  removed so shadows cannot be mistaken for damage sources.
- New and refined hazards, especially Frost’s grounded bear trap and
  slope-aware embedding for floor hazards while keeping gameplay hitboxes
  unchanged.
- Rhythm fairness fixes covering deterministic retries, beat placement, coin
  key selection, and coin/card-box overlap validation.
- Portrait HUD, chat, controls, pause, results, title, Food Court, Trophy Room,
  and shop presentation cleanup.
- Difficulty/content cleanup, cabinet-theme documentation, review bake-offs,
  and expanded regression coverage.

## Committed changes

Four commits were made during the workday:

| Commit | Subject | Main result |
|---|---|---|
| `840341c` | Enhance difficulty selection UI and improve portrait rendering | Plumber scenery pass, difficulty/portrait presentation improvements, ridge attachment, and scenery regression coverage. |
| `7a5ab18` | Implement presentation refresh handling and audio management | Covered orientation refresh, settled viewport measurements, cache/backing-store rebuilds, DPR detection, adaptive-quality suppression, and state-aware audio behavior. |
| `642a5a5` | Add tests for portrait layout visibility and hero rendering behavior | Portrait visibility/render contracts, additional scenery/style work, review candidates, and the alternate cabinet themes document. |
| `31e205b` | Refactor title layout and pause menu for improved alignment and readability | Title, pause, hub, Trophy Room, touch layout, menu geometry, and bot landing-safety refinements. |

### Plumber scenery and presentation

- Added a restrained country-scene vocabulary: flowers, grass, bushes, short
  fences, larger ridge trees, and occasional small houses.
- Kept scenery attached to the existing ridge/parallax geometry and clipped
  lower portions into the hill rather than rotating props or changing gameplay
  surfaces.
- Raised the landscape scenery stack while preserving the resolved portrait
  composition and logical world geometry.
- Removed reviewed-but-rejected prototype scenery such as the watering pipe,
  pinwheel, butterfly, path, and bridge from the retained catalogue.
- Added deterministic placement/cache handling and expanded Plumber scenery,
  hill-clamp, pixel-background, and portrait regression coverage.

### Presentation refresh, orientation, and audio

- Added a coordinated dark cover while a resize or rotation settles.
- Waits for a quiet delay and matching animation-frame measurements before
  revealing the new frame.
- Rebuilds canvas backing stores, transforms, WebGL targets, touch geometry,
  retained artwork, and related caches together.
- Detects DPR and visual-viewport scale changes, rejects stale callbacks during
  rapid rotations, and suppresses adaptive-quality decisions during refresh.
- Coalesces late viewport events into one blackout to avoid the double-flash
  effect.
- Non-rhythm music continues while presentation refresh briefly holds gameplay;
  beat-locked levels pause music and gameplay together to preserve sync.
- Reset portrait/landscape camera state, route/pan interpolation, floor spring,
  tunnel/high-path state, portrait fit state, and orientation-specific zoom so
  stale portrait motion cannot bleed into landscape or vice versa.

### Portrait chat, HUD, and controls

- Chat cards use a fixed portrait shelf with larger type for short messages and
  a smaller fitted size for long messages.
- Increased chat-to-ground clearance without moving the ground or landscape
  layout.
- Added portrait `JUMP`, hero-power, and `SLIDE` labels only when the matching
  visible touch buttons exist; gesture zones and absent buttons do not produce
  labels.
- Left-aligned portrait power-up labels to the shared HUD safe-frame column and
  fitted long names so they cannot spill off-screen.
- Added portrait safe-frame spacing to pause/result panels and corrected
  objective/warning-row clearance.
- Moved the world progress line to the bottom edge and reserved its space from
  the bottom HUD row.
- Simplified desktop control instructions into one action per line and added
  mouse alternatives. The current desktop display is:

  - `UP / SPACE / LEFT CLICK` — jump
  - `DOWN / RIGHT CLICK` — slide
  - `X / SHIFT / MIDDLE CLICK` — power

- Kept `D`/Right as compatibility aliases while making `X` the primary power
  key shown to players.
- Made landscape result buttons equal-sized, centered, and 26px high to match
  pause buttons; pointer hit-testing follows the visible bounds.
- Refined title, pause, modal, hub, Trophy Room, and touch layouts for portrait
  safe areas and readable spacing.

### Cabinet-theme and design documentation

- Added [`ALTERNATE_CABINET_THEMES.md`](ALTERNATE_CABINET_THEMES.md), covering
  eight alternatives with gameplay rules, visual language, obstacle families,
  set pieces, risks, and replacement lineups.
- The strongest documented direction was Volcano Vault → Gravity Grid → The
  Surge, while retaining Corporate Kombat where its office comedy remains
  valuable.
- Expanded the Neon Blasters direction into a “Midnight Express” train chase,
  with stronger use of blasters and more variety than repeated fuse-carrying
  missions.

## Uncommitted changes after `31e205b`

The remaining worktree edits are grouped below by outcome.

### Frost Fortress scenery and hazard pass

- Added paper-enabled Frost scenery with glacier silhouettes, stage-specific
  landmarks, ice rocks, snowbanks, layered pines, and coloured sky ribbons.
- Raised and densified the scenery while fixing portrait and landscape hill
  seams and stable near/far tile wrapping.
- Added full-footprint embedding: wide rocks and fortresses are positioned from
  the deepest point of their footprint, then occluded by the ridge.
- Added a translucent nearer hill layer for atmosphere while keeping the main
  gameplay ridge opaque enough to bury props correctly.
- Enlarged pines, raised their lower branch line, and reduced their root burial
  so trunks remain visible. Rocks and fortresses were eased one pixel out of
  the snow after the deeper embedding pass.
- Replaced floating icicles in Frost patterns with grounded, jumpable bear
  traps. Drones were returned to their ordinary shared purple/yellow palette.
- Added animated bear-trap art with shorter inward jaws, hinge/trigger details,
  a compact base, and a cool contact shadow instead of a pink warning strip.
- Added a procedural `trapSnap` sound, prevented the generic `hit` cue from
  masking it, and ensured invulnerability frames do not retrigger it.
- Removed detached landing marks for airborne hazards, including legacy
  falling-icicle paths; grounded contact treatment remains attached to grounded
  objects.
- Fixed a Frost-only bot/pit survivability edge case introduced by the hazard
  swap.

### Shared shadows and slope embedding

- Added [`src/engine/shadows.js`](../src/engine/shadows.js) with shared soft
  radial contact-shadow rendering, transparent falloff, and a rounded fallback.
- Replaced hard rectangular or bar-like marks on ground obstacles, drones,
  loop supports, finish hardware, roadside signs, breaker hardware, and Food
  Court contacts.
- Increased shadow size and core contrast while keeping dimensions in world
  units so portrait camera zoom scales correctly.
- Removed generic airborne landing shadows that made low or hidden hazards look
  like invisible damage objects.
- Bedded floor hazards now use a slope-sampled ground clip. The final approach
  keeps the spike teeth upright while the buried plate follows the local slope;
  the saw and bear trap use the same embedded treatment. Hitboxes and logical
  world geometry remain unchanged.

### Speed Zone scenery and sign review

- Added an in-level scenery gallery section and a project-local sign bake-off.
- Added 11 sign candidates, including the later Autobahn candidate, with the
  alternatives remaining gallery-only until selected.
- Reworked the live route sign into a clean, flat, Autobahn-style panel and
  corrected its size, aspect ratio, anchoring, and removal of extra grain/glint
  treatment.
- Reworked the warning sign into a compact, flat, rounded-corner triangle and
  replaced its oversized exclamation with a centred `mc²` formula.
- Added randomized 10–99 speed-limit values that remain stable while a sign is
  visible, and changed review labels to kilometres.
- Corrected sign poles, board clearance, planted feet, and portrait/landscape
  positioning; removed the decorative white top highlight from rectangular
  signs.
- Added irregular hill-contour bands with different lengths and thicknesses,
  continuous soft blur, endpoint fades, a 75% maximum arc span, and occasional
  three- versus four-band sections.
- Reworked the former dust-devil/tornado shapes into separated, outlined
  campfire-smoke plumes behind the hills, then adjusted spacing and puff
  separation for a clearer smoke read.
- Added a water-tower bake-off with ten gallery-only variants and improved the
  current tower’s central support, X-bracing, and broad foundation pad.

### Paper and material review

- Added a review-only `felt` material candidate with a denser, softer nap and
  reduced paper-like fibre pairing.
- Kept `cardstockClear` as the Frost scenery preset and extended material tests
  to cover the felt candidate and paper-strength behaviour.

### Rhythm fairness, spawning, and audio

- Respawn state now preserves the authored obstacle, coin, and power-up stream
  instead of rerolling it on ordinary retries; a new stage still receives a
  fresh seed.
- Checkpoint snapshots preserve RNG state, timers, generation cursors, and
  distance so restoring a checkpoint is repeatable.
- Restored continuous music for rhythm retries. Rhythm obstacles and coins
  re-anchor to the heard beat, while power-ups remain fixed between attempts.
- Added heard-transport coin-key lookup so collected coin notes follow the chord
  the player is actually hearing rather than the scheduler’s future lookahead.
- Added chart validation that rejects any coin whose body overlaps a card box,
  including loop-seam comparisons, and corrected the affected Rhythm 1 fill.
- Added regression coverage for beat charts, coin keys, coin/card-box overlap,
  retry determinism, and fixed power-up state.
- Added [`RHYTHM_RESPAWN_HANDOVER.md`](RHYTHM_RESPAWN_HANDOVER.md) with the
  implementation status, Git history, current retry policy, remaining
  beat-jump design decision, and validation notes.

### Gameplay, content, and character details

- Slowed the overall late-campaign speed curve and adjusted later cabinet
  bonuses so the finale is less excessively fast.
- Made an early Plumber pit 48px wide as a short-hop teaching case while
  leaving the larger multi-hop crossing intact.
- Hardened the demo bot’s pit priority and optional-pickup decisions so a later
  hazard or speed-changing pickup cannot make it land on a pit lip.
- Removed `NO JUMPING` and Eggshell’s `INACCURATE LORE` from corrupted levels;
  corrupted mode now keeps `MAXIMUM SPEED` and `RANDOM TAGS`. Eggshell narration
  remains available in `UNPLUGGED`.
- Renamed Gary’s shop consistently to `GARY'S LEGAL PAWN SHOP` across the hub,
  shop screen, credits, script, game bible, and gameplay documentation.
- Removed obsolete `SPACE: JUMP` legends from the Food Court and Trophy Room.
- Kept Bruiser’s finish-dog and regular gameplay silhouettes consistent by
  extending the long tail in both paths.
- Updated arcade door/icon wording and related gameplay copy where the revised
  presentation required it.

## Design-only result recorded today

The perfect-run duration question was answered from the authored `durationSec`
values: 27 campaign levels total **42 minutes**, ignoring menus, selection,
speed-up power-ups, and non-level time. This was an analysis result only and did
not change source files.

## Generated and ignored review outputs

The build and gallery work also refreshed ignored/generated outputs that do not
appear in the Git inventory above:

- `dist/game.js`, the main HTML/service-worker bundle, the gallery pages, and
  the MRDR3/TRK24 preview pages.
- The project-local `work/mockups/` review surfaces for paper/felt materials,
  Plumber scenery, portrait chat, Speed Zone background variety, and the
  Speed Zone sign bake-off (A–K PNG candidates plus README).
- Gallery-only water-tower and sign candidate surfaces remain review artifacts,
  not automatically promoted production gameplay.

## Validation recorded

Repeated checks across the workday included:

- `npm run build` — passed after the major implementation passes.
- `npm run gallery` — passed after scenery, sign, water-tower, prop, and shadow
  review updates.
- `npm test` — passed in the final Frost/shadow/rhythm runs; the project’s
  non-browser gate skips 38 Chromium suites when Playwright Chromium is not
  available.
- Focused suites for orientation refresh, lifecycle, renderer, portrait lab and
  layout, pixel backgrounds, paper materials, Plumber scenery, props, standing
  hazards, reliability, beat charts, coin keys, routes, and SFX routing passed
  at the relevant implementation checkpoints.
- `git diff --check` — passed repeatedly.

Known acceptance limits:

- Physical-phone portrait/landscape and audio acceptance remains separate from
  source, build, and headless checks.
- Some live browser previews and Chromium audio checks were blocked by the
  local server/sandbox or macOS Chromium permission boundary.
- Intermediate runs exposed expected fixture drift from intentional speed or
  seeded-layout changes and a few transient watchdog/menu failures; later
  focused or full non-browser runs passed after the corresponding fixes.

## Exact current worktree inventory

At the audit point, the uncommitted tracked files were:

```text
docs/CREDITS.md
docs/GAME_BIBLE.md
docs/SCRIPT.md
docs/gameplay-messages.md
src/data/cabinets.js
src/data/jokes.js
src/data/songs/rhythm.js
src/data/stages.js
src/engine/audio.js
src/engine/paper-material.js
src/engine/stylePacks/index.js
src/game/beatchart.js
src/game/bot.js
src/game/credits.js
src/game/draw.js
src/game/entities.js
src/game/finishMarker.js
src/game/hub/index.js
src/game/hud.js
src/game/menus.js
src/game/portrait-layout.js
src/game/run.js
src/game/tutorial.js
src/sprites/animals.js
src/sprites/arcade.js
src/sprites/props.js
tests/beat-chart.js
tests/coin-key.js
tests/finish-dog.js
tests/fixtures/layout-baseline.json
tests/paper-material.js
tests/pixel-background.js
tests/plug-tally.js
tests/plumber-scenery.js
tests/portrait-lab.js
tests/portrait-layout.js
tests/props.js
tests/reliability.js
tests/run-all.js
tests/sfx-routing.js
tests/standing-hazards.js
tools/gallery-entry.js
```

New files at that point were:

```text
docs/RHYTHM_RESPAWN_HANDOVER.md
src/dev/speed-sign-candidates.js
src/engine/shadows.js
tests/coin-magnet.js
tests/object-shadows.js
```

This summary document is itself an additional new file.
