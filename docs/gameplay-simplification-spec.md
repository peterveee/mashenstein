# Gameplay Simplification Spec

Status: Proposed  
Scope: Relay/team system and in-game explanations  
Principle: MASHENSTEIN should be understandable while running. If a mechanic
needs a paragraph before it becomes useful, remove or automate it.

## What is already complete

- Hero exhaustion has been removed.
- Portals currently rotate predictably through the selected three-hero team.
- The obsolete Exhaustion Recovery upgrade and cape penalty have been removed.
- Mobile sizing, a touch ENTER button, desktop control guidance, smoother art,
  softer outlines, and rolling terrain in selected levels have been added.

The larger relay redesign below has **not** been implemented.

## Problem

The current relay system asks the player to:

1. Select three heroes before a stage.
2. Understand that portals switch heroes automatically.
3. Understand that switching charges a Relay Meter.
4. Learn that `C` does not switch heroes and only works when the meter is full.
5. Discover Perfect Tags, Duo Moves, pair requirements, and mastery gating.

These rules are difficult to infer during an automatic runner. Several provide
little meaningful choice, so players are likely to ignore them or assume that
the controls are broken.

## Target experience

The complete relay rule should fit in two sentences:

> Run through portals to become a different hero. Every third switch triggers
> an automatic Relay Blast that clears nearby hazards.

The normal control set becomes:

- Jump
- Duck / roll / stomp
- Hero ability, when the current hero has one
- Pause

There is no dedicated tag or Team Move button.

## Proposed design

### 1. The full cast replaces three-hero teams

- Remove the pre-stage Team Select screen.
- All eight heroes are available in every normal stage.
- At stage start, choose the first hero from a shuffled eight-hero bag.
- Each portal previews the next hero in the bag.
- Running through the portal switches automatically.
- A hero cannot immediately repeat.
- Every hero must appear once before the bag reshuffles.
- Boss stages use the same system unless a boss explicitly requires a fixed
  hero for narrative reasons.

This makes portals surprising but fair and ensures the whole cast is seen.

### 2. Replace the Relay Meter with three clear pips

- Show three pips beside the current hero portrait.
- Each portal switch fills one pip.
- Filling the third pip automatically activates **Relay Blast**.
- Relay Blast clears breakable on-screen hazards, plays one strong effect, and
  resets the pips to zero.
- Gaps, bosses, mission-critical objects, and explicitly unbreakable obstacles
  are unaffected.
- Remove the manual `C` / `E` tag action and the touch `TAG` button.

The automatic activation prevents a charged move from being missed and removes
a button that appears broken most of the time.

### 3. Remove hidden relay sub-systems

Remove:

- Perfect Tags
- tag combos
- Duo Moves and hero-pair requirements
- mastery gating for Duo Moves
- the Perfect Tag Window upgrade
- the Relay Meter charging-rate upgrade
- tag/perfect-tag mission and challenge requirements

Existing save fields may remain readable for backward compatibility, but new
runs must not write or display these systems. Removed purchased upgrades should
be refunded once during migration.

### 4. Explain each hero at the moment of use

When a portal reveals its next hero, show a short label above it:

- `GNASH — SPEED BOOST`
- `B-33P — SHOOT`
- `GRUMPOS — THROW AXE`
- `LORENZO — AIR STOMP`
- `MOCHI — DOUBLE JUMP / FLOAT`

After switching, show the current ability and input for approximately two
seconds. Passive heroes should describe their passive instead of showing a
non-functional ability control.

Examples:

- Desktop: `X: SHOOT`
- Touch: `PWR: SHOOT`
- Passive: `COIN MAGNET ACTIVE`

### 5. Contextual first-use teaching

Use short, one-time prompts stored in the save file:

1. First portal: `RUN THROUGH THE PORTAL TO CHANGE HERO.`
2. First switch: `SWITCH 3 TIMES FOR A RELAY BLAST.`
3. First charged blast: `RELAY BLAST — AUTOMATIC SCREEN CLEAR.`
4. First active ability hero: show the exact ability input and result.
5. First passive hero: explain that no ability button is required.

Prompts may briefly slow the world but must never stop the run or require a
confirmation tap.

### 6. Pause/help screen

The pause screen must show only information relevant to the current run:

- current hero name
- current hero ability or passive
- keyboard/touch control mapping
- current mission in plain language
- Relay Blast progress (`2 / 3 SWITCHES`)

Remove explanations for deleted mechanics from How to Play, Field Guide, HUD,
stage descriptions, upgrades, dialogue, and README text.

## Data and code changes

Expected areas:

- `src/main.js`: bypass `TeamSelectState` and start stages directly.
- `src/game/relay.js`: replace team rotation/meter/duo logic with an eight-hero
  shuffle bag and three-switch counter.
- `src/game/run.js`: remove manual tag handling; trigger Relay Blast after the
  third automatic portal switch.
- `src/game/hud.js`: replace team portraits and meter with current hero plus
  three pips; remove the `C`/`TAG` prompt.
- `src/game/menus.js` and `src/game/hub/index.js`: remove Team Select and update
  help text.
- `src/data/stages.js`: replace tag/perfect-tag objectives.
- `src/data/progression.js`: remove relay-only upgrades and Duo Move data.
- `src/engine/input.js`: remove the `tag` action and its key mappings.
- `src/engine/save.js`: add one-time tutorial flags and upgrade refunds.

## Save migration

- Existing saves must continue loading.
- Ignore stored three-hero teams after migration.
- Refund coins spent on `tagWindow` and `meterRate` once.
- Preserve historical tag statistics as legacy data, but do not display them.
- Record a migration flag so refunds cannot repeat.

## Acceptance criteria

- A new player can start a stage without selecting a team.
- Across a long run, all eight heroes appear before any shuffled-bag repeat.
- A portal never selects the current hero.
- Every portal clearly previews the incoming hero and their capability.
- The third successful switch automatically performs Relay Blast.
- `C`, `E`, and the touch `TAG` button have no gameplay mapping or UI label.
- No visible text refers to exhaustion, Perfect Tags, Duo Moves, tag combos, or
  manual Team Moves.
- Passive heroes never display a dead ability button.
- Existing saves migrate without errors or repeated refunds.
- Difficulty modes 1–4 remain mechanically identical.
- Fairness, campaign flow, boss, minigame, migration, and smoke tests pass.

## Deliberately out of scope

This change does not remove missions, challenges, plugs, upgrades unrelated to
the relay, hero mastery, minigames, bosses, or cabinet progression. Those can be
audited separately after the simplified relay has been play-tested.

