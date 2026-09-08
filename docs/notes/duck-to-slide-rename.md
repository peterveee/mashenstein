# Renaming `duck` → `slide`

**Status: DONE, 8 Sep 2026.** 63 files, 747 lines, `tests/run-all.js` green
before and after. The script that did it is `work/local/rename-duck-to-slide.py`
and the partial revert below is `work/local/_unrename-audio.py`.

What the plan did not predict, and the pass found:

- **Audio ducking is a different word.** `src/engine/audio.js`,
  `src/engine/effects.js` and `src/data/voices.js` use "duck" for sidechain
  ducking — the song dropping under the star layer, a kick ducking the bus.
  Renamed, they read as nonsense ("the song is NOT slid under it"). Reverted
  line by line rather than by checkout, because those files carry other
  sessions' uncommitted work.
- **Two identifiers meant "get out of the way", not the move.** `floatDuck` /
  `easeFloatDuck` (the popup stack shifting off the hero) and
  `FLOAT_DUCK_GAP` / `SPEECH_DUCK_GAP` became `floatClear` / `easeFloatClear` /
  `FLOAT_CLEAR_GAP` / `SPEECH_CLEAR_GAP` — not `*Slide*`, which would have put
  a hero move's name on a HUD card's dodge.
- **The rename BROKE GAMEPLAY and no suite noticed.** The style table's key for
  the power slide had to move from `'slide'` to `'kick'` — `'slide'` had become
  the pose kind. The table moved; the one place that ASKS for it,
  `poseFromPlayer` in `toons.js`, did not, because there the literal sits on a
  different line from `slideStyle:` inside a ternary and the style regex only
  matched them adjacent. The lookup returned undefined, every humanoid fell
  through to the generic crouch, and the old ducking animation was back in the
  running game while `tests/run-all.js` stayed green. Peter found it by playing.
  It was invisible to the whole art rig because the gallery, the probes and the
  tests all NAME the style themselves; only gameplay goes through the lookup.
  `tests/slide-kit.js` now drives `poseFromPlayer` per hero and asserts the
  style it asks for is a key the painter has — verified failing on the broken
  code before the fix.
- **One comment went ambiguous** where a speech card "ducks" under the hero
  (`hud.js`, the crossing paragraph). Reworded to "dodge", with a line saying
  why, since the sentence only made sense while both things shared a word.

## Why

There is no ducking in the game any more. The move is a power slide: the hero
tips back onto a hip and kicks through. `duck` is the name of the input that
used to crouch, and every layer below it inherited the word — pose kind, painter
names, style table, beat-chart action, test names. The name being wrong is the
smaller half of the problem; the bigger half is that it hides what the pose
actually is from anyone adding a character (see
`tests/slide-kit.js` and the `SLIDE_HEAD_SEAT` comment for what that costs).

## Size

961 occurrences of `duck`/`Duck`/`DUCK` across ~40 files under `src`, `tools`,
`tests`. Heaviest: `src/sprites/toons.js` (132), `src/game/run.js` (80),
`src/game/player.js` (60), `tools/gallery-entry.js` (58),
`tests/beat-chart.js` (51), `src/game/beatchart.js` (40), `src/game/bot.js` (30).

## No data migration needed

The only place `'duck'` is a *stored* value is authored beat-chart actions in
`src/data/songs/rhythm.js` (5 sites, e.g. `{ slot: 0, action: 'duck', ... }`).
Those live in the repo and get renamed in the same pass. Nothing is written to
`localStorage` under this name and no save field carries it, so there is no
compatibility window — checked before planning this.

## The identifiers, in dependency order

Rename these together; a half-done pass leaves two vocabularies for one pose.

| From | To | Sites |
| --- | --- | --- |
| `pose.kind === 'duck'` / `kind: 'duck'` | `'slide'` | 37 |
| `pose.duckStyle` | `pose.slideStyle` | 24 |
| `DUCK_STYLE_DRAWS` | `SLIDE_STYLE_DRAWS` | 6 |
| `DUCK_STYLE_CANDIDATES` | `SLIDE_STYLE_CANDIDATES` | 1 |
| `duckStyleEntry` | `slideStyleEntry` | 3 |
| `drawDuckSlide` | `drawSlideKick` | 9 |
| `drawDuckTuckRoll` | `drawSlideTuckRoll` | 2 |
| `drawDuckDive` | `drawSlideDive` | 2 |
| `duckTorsoCapsule` | `slideTorsoCapsule` | 3 |
| `duckExtra` | `slideExtra` | 6 |
| `DUCK_ROLL_R`, `DUCK_ROLL_SPIN` | `SLIDE_ROLL_*` | 4 |
| `DUCK_SPREAD` | `SLIDE_SPREAD` | 4 |
| input action `duck` | `slide` | 5 |
| beat-chart action `'duck'` | `'slide'` | 5 (data) + `hud.js` marker + `beatchart.js` |
| `player.duckAmount` | `player.slideAmount` | 55 |
| `player.duckHoldT` | `player.slideHoldT` | 23 |
| touch button id/zone `'duck'`, `ACTION_INK.duck` | `'slide'` | 9 |
| `FLOAT_DUCK_GAP` | `FLOAT_SLIDE_GAP` | 2 |

The player-state pair (`duckAmount`, `duckHoldT`) was missed on the first
count — they are the two biggest single identifiers after the pose kind, and
`tools/mixer*` / `tests/tutorial.js` read `duckAmount` through `poseFromPlayer`,
so they cross more files than the painter names do.

`spec.rollDuck` and `pose.hideSkirt` are separate questions: `rollDuck` selects
the tuck-roll variant and wants a name of its own (`slideStyle: 'tuck'` on the
spec would remove it entirely), and `hideSkirt` is an anatomy-view flag that
never meant ducking.

## Watch out for

- **`'slide'` is already taken as a `duckStyle` value** (`DUCK_STYLE_DRAWS.slide`).
  After the rename that reads `SLIDE_STYLE_DRAWS.slide`, which is redundant —
  the three styles want renaming too: `slide`→`kick`, `tuck`, `dive`. Do it in
  the same pass or the vocabulary is still confusing, just differently.
- **Whole-word only.** A blind `s/duck/slide/` hits prose in comments where
  "duck" is describing the *history* ("it used to duck"), and those sentences
  should stay true. Rename identifiers and string literals; read the comments.
- **One line of copy stays.** `jokes.js:169` — "A BARREL APPROACHES. OR A DUCK.
  MY NOTES ARE BAD." — is the bird, not the move. It is the only user-facing
  "duck" in the game, and it is deliberate; a blind pass would turn a joke into
  a typo.
- **The touch chrome already says SLIDE** in its design note (right half =
  SLIDE) while the button is `id: 'duck'` — so the rename here is the code
  catching up with the layout, not a change of intent.
- **`work/local` probes and `galleries/` snapshots** are not part of the rename.
  Old snapshots are archives of what shipped; leave them.

## Verify

`node tests/run-all.js`, then `npm run gallery`, `node work/local/_gallery-boot.mjs`
(unbound identifiers pass esbuild and only fail at runtime), and the slide
sheets in `work/local/_slide-heads.mjs` and `_belt-hw.mjs`.
