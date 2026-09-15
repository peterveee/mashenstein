# Rhythm levels and deterministic respawn — handover

**Date:** 2026-09-15  
**Area:** RHYTHM BANKRUPTCY, beat charts, coin/powerup regeneration, and retry audio

## Executive summary

The rhythm levels now have an authored beat chart rather than relying entirely on
distance-based random spawning. Coins, hazards, card boxes, and pickup sounds carry
beat metadata so the lane can stay aligned with the continuously playing song.

Checkpoint restores have also been made deterministic: the spawner cursor, pickup drip
timers, and relevant RNG streams are saved and restored with the checkpoint. A retry
should therefore rebuild the same pattern instead of drawing a new one.

The **beat-jump respawn** is now implemented (15 Sep 2026). The song keeps playing,
and the restored world moves by exactly the beats the song has spent since the
checkpoint's lane anchor, reduced to one chart loop, so every chart mark lands on the
same world x it had the first time. The cadences (`every` slots) are counted off the
road rather than off the clock, so the card box and the rare fills stand on the same
road too. Deaths before the first checkpoint get the same treatment from the stage's
start anchor.

There was also a known card-box/coin regression, introduced by the September 3
card-box timing change. Peter's call (15 Sep 2026): move the box, not the coins.
rhythm-1's box now carries its own timing on the chart event (`boxLead: 2.4`,
`boxBurst: 2`, the cabinet's pre-September-3 numbers) and the stage plays "8, and, 9"
into its first hole as written. The other two charts keep the 1.5 / 1 default they
were re-authored around. The rocket fist parks short of a box 2.4 beats out, so Ray
M'N is not dealt that one (as before September 3); the lane now asks `canShoot` with
the lead in px (`RunState.heroReachesBox`).

## Player-facing goals

- A fresh run may still use the authored/random level setup as intended.
- Dying and retrying must not redraw a different obstacle, powerup, or coin pattern.
- The song must keep playing through death and respawn.
- The retry must be rhythmically aligned even though the music has advanced.
- The same coin pattern may use a different key after respawn if the song has moved to a
  different musical section.
- Coins must never be physically hidden inside a card box.

## What is implemented

### Beat-authored level lane

`src/game/beatchart.js` contains the beat chart and `BeatSpawner`.

- The authored rhythm charts use a 16-beat loop.
- The spawner reads the live `Audio.songBeat()` clock.
- Chart events receive `actionBeat` and `actionX` metadata.
- Coin runs are spaced in beats, not fixed pixels, so their spacing remains musical
  when the lane tempo changes.
- Card boxes are placed at `BOX_LEAD_BEATS` after their chart action and resolve on a
  beat using `BOX_BURST_BEATS`.
- `resetRhythmLane()` can invalidate/rebuild the lane from the current heard beat.
- Visible hazards are deliberately kept in place during a resync when moving them
  would invalidate a run-up the player has already seen.

The important placement formula is effectively:

```text
eventX = playerWorldX + (eventBeat - heardBeat) * pixelsPerBeat
```

That is the basis for the proposed beat-jump retry.

### Deterministic checkpoint restoration

`RunState.makeSnapshot()` and `restoreSnapshot()` in `src/game/run.js` now carry the
state needed to rebuild the same branch of the level:

- spawner cursor and spacing state;
- drip/capsule timers and previous powerup state;
- FX, speech, relay, spawn, and drip RNG states;
- one-shot pit, loop, sign, appliance, and finish-pickup state;
- player motion and route/camera-floor state.

`updateDead()` restores the checkpoint when one exists. Before the first checkpoint it
re-enters the stage with the same seed, so dying in the opening section does not create
a new layout.

This is currently present in the dirty worktree and must be kept separate from unrelated
visual and UI changes before committing.

### Continuous music and the beat-jump retry

The rhythm song is not restarted on death. A retry has a short synchronization hold
(`RHYTHM_DEATH_SYNC_SEC`, currently one second) while the audio clock continues.

The lane's mapping of song to road is whatever the last `BeatSpawner.fill` laid by:
`eventX = playerX + (eventBeat - fillBeat) * pxPerBeat`. Each fill records that beat and
camera (`fillRaw`, `fillBeat`, `fillX`), and `RunState.rhythmLaneAnchor()` reads them
back — the checkpoint banks one in its snapshot (`laneAnchor`) and the first live frame
banks one for the stage (`rhythmStartAnchor`).

On a death, `rhythmRespawnPlan(anchor, beatRaw)` computes:

```text
delta   = beatRaw - anchor.beatRaw           (raw heard beats; the transport loop is a
                                              multiple of the chart loop, so wrapping
                                              cannot change the phase)
shift   = delta mod loopBeats                (forward, less than one loop)
camX    = anchor.camX + shift * pxPerBeat
passOffset = anchor.passOffset + (beatRaw - shift) - anchor.laneBeat   (whole loops)
```

`restoreSnapshot` (and `enter()` on a top-of-stage retry) parks the camera on the plan
for the forecast release beat, so the world the player watches through the hold is the
one control returns to; `settleRhythmRespawn` re-plans on the beat actually heard at
release, taking the representative of the same phase nearest the parked shift, and only
then does `resetRhythmLane()` re-anchor the lane. The forecast error is a frame or so.

The shift is forward unless that opens the retry inside the approach to a scripted hole
or ring (`rhythmRespawnClear`: the pit runway plus a beat before, a beat after), in
which case the same phase one loop back is used, then one loop further on. Chart
hazards need no such care: the lane lays nothing that asks an input inside its runway.

The opening gate (jumps-only while the rooftop sign rolls) is banked as a world x once
the first attempt knows it (`rhythmOpeningGateX`), and re-read off the road after any
resync or retry, so a retry from the top gates the same road and a resync after a
transport wrap cannot make a stale gate beat come round again.

What a retry does NOT reproduce, by design:

- the first `laneRunwayBeats` past the respawn are action-free (coins only);
- on rhythm-3, marks already in flight when a checkpoint stepped the tempo were laid
  at the old spacing (up to 1% over the lookahead); the retry lays them at the new.

### Beat-locked pickup sounds and key selection

Coin and powerup pickup cues use `pickupLineInBeats()` so a chart pickup can schedule
its sound on its authored beat rather than simply playing at the collision frame.

`Audio.songKey()` uses the **heard** transport position instead of scheduler look-ahead,
and for a cue placed on the song (`sfx`'s `inBeats`) it keys on the bar the cue will
**sound** in (`cueBeatLead`, defaulted into `songKey(aheadBeats)`). This matters after a
respawn: the same deterministic coin pattern uses the key/scale of the section being
heard, not the key stored at the checkpoint and not a future scheduler section — and a
coin scheduled across a section line takes the new section's key. Verified in
`tests/coin-key.js`.

The rule is therefore:

- chart rhythm and world placement are deterministic;
- coin pitch is calculated from the current heard musical section.

## Git history and significant changes

The latest committed rhythm-specific changes are older than the recent portrait/UI
commits. There were no direct rhythm-chart commits on September 11–14.

| Commit | Date | Relevance |
| --- | --- | --- |
| `7849537` | Sep 1 | Large rhythm/chart/audio rewrite; introduced the current authored beat-level content and card-box charting. |
| `ef936a3` | Sep 1 | Further beat handling, chart, HUD, and rhythm presentation changes. |
| `6a2d8ea` | Sep 3 | Changed card-box timing from `BOX_LEAD_BEATS = 2.4`, `BOX_BURST_BEATS = 2` to `1.5` and `1`. This moved the rhythm-1 box body onto beat 8.5. |
| `7f614a7` | Sep 4 | Added audio-sync calibration, heard-latency handling, lane BPM/tempo warp, and more beat-to-world conversions. |
| `ca1b4fa` | Sep 5 | Changed playback seeking/rendering and additional generated rhythm/audio data. |
| `36b26ed` | Sep 5 | Changed capsule weighting; relevant to pickup variety, not authored coin timing. |

The September 3 card-box change explains the remembered regression:

- Before it, a slot-7 box was physically about `7 + 2.4 = 9.4` beats along the lane.
- The slot-8 `eighth` fill placed coins at beats `8` and `8.5`, so there was no overlap.
- After it, the box was physically at `7 + 1.5 = 8.5` beats.
- The second slot-8 coin therefore landed on the box.

The overlap only appeared on card-box passes and only for heroes who could shoot, which
made it intermittent enough to be easy to miss.

## Current uncommitted rhythm-related work

The worktree currently includes several relevant changes among many unrelated edits:

- `src/game/run.js`: deterministic snapshot/restore state and retry behavior;
- `src/data/songs/rhythm.js`: rhythm-1 slot 8 currently uses `eighthIn` so the pair
  ends on beat 8 instead of reaching the box at 8.5;
- `src/game/beatchart.js`: a validator now rejects coin/card-box physical overlap;
- `src/engine/audio.js`: `Audio.songKey()` now follows the heard section;
- `tests/beat-chart.js`: card-box/coin overlap and retry alignment coverage;
- `tests/coin-key.js`: heard-section key selection coverage;
- `tests/reliability.js`: retry and deterministic-state coverage.

The `eighthIn` change is not the underlying fix. It prevents the known overlap in the
current chart. Deterministic regeneration alone would make the bad overlap repeatable;
it would not make it fair.

## The beat-jump retry (implemented)

The model below is what shipped; see "Continuous music and the beat-jump retry" above
for the formula and the files.

### Model

At checkpoint time, save:

- the exact unwrapped chart beat;
- the world/camera anchor associated with that beat;
- the existing spawner, drip, RNG, pit, and player state.

After death:

1. Leave the song playing.
2. Read the current heard beat after the retry hold.
3. Compute the elapsed beat distance, including loop wrapping.
4. Restore the deterministic checkpoint state.
5. Move the respawn/world anchor forward by:

   ```text
   beatDelta * pixelsPerBeat
   ```

6. Rebuild the chart from the same authored pattern and RNG state.

This is a spatial jump, not an audio rewind. The player sees the same pattern and the
same deterministic content, but starts slightly ahead of the literal checkpoint so the
live song and lane geometry agree.

### Important constraint

Exact same world coordinates and an uninterrupted song are incompatible when an
arbitrary amount of music has elapsed during death. One of these must move. The agreed
choice is to keep the music continuous and move the respawn anchor slightly.

The shift must be deterministic and bounded. It must not place the player inside a
hazard, skip an authored action without accounting for it, or move a visible hole that
the player has already committed to jumping.

## Card-box fix decision

DECIDED 15 Sep 2026: option 1, scoped to rhythm-1. The chart event carries `boxLead`
and `boxBurst` (`beatchart.js` `boxLeadBeats` / `boxBurstBeats`), the validator checks a
chart-placed box the same way as a default one (a whole-beat fuse, in front of the hero
when it goes, over road not a hole, clear of every coin), and the lane stamps the box
with the fuse ceiling it was laid against (`burstBeats`). The `eighthIn` workaround is
gone. The earlier options, for the record:

1. restore the pre-September-3 box lead/burst timing if the old feel is still desired;
2. move the rhythm-1 box or coin chart slot so their physical ranges do not overlap; or
3. keep the new box timing but author a different safe coin fill.

The preferred order is to compare the pre-September-3 feel against the current box
timing, then make the chart and validator agree. Do not delete `eighthIn` merely because
respawns become deterministic.

Also reconcile the rhythm chart comments with the constants: some comments still refer
to the old box opening timing.

## Validation already run

These checks passed against the current worktree (15 Sep 2026):

```text
node tests/beat-chart.js     # incl. "A RETRY IS THE SAME ROAD": all three stages, a
                             # death past a checkpoint and one before the first, on the
                             # real RunState against a wrapping clock — same marks on the
                             # same world x, same slot and subdivision, same cadence
node tests/coin-key.js       # heard-section key, and the sounding-beat key for a cue
                             # placed on the song
                             # beat-chart also checks rhythm-1's own box timing: fuse
                             # long enough for the slowest gun, box in front when it
                             # goes, and the fist not dealt a box it cannot reach
node tests/reliability.js
npm run build
git diff --check
```

The tests confirm chart geometry, key selection, retry geometry, and build integrity.
They do not replace browser playtesting or listening on the target device. The
acceptance pass still needs to listen through a death, the continuous-song respawn (the
hero now reappears a few beats past the flag rather than on it), the card-box section,
and all three rhythm levels.

## Useful files

- `src/data/songs/rhythm.js` — authored song and beat charts.
- `src/game/beatchart.js` — chart validation, coin fills, box geometry, and beat spawner.
- `src/game/run.js` — rhythm clock integration, checkpoints, snapshots, retry, and pickup cues.
- `src/engine/audio.js` — heard beat, sync calibration, cue scheduling, and coin key selection.
- `tests/beat-chart.js` — chart and lane invariants.
- `tests/coin-key.js` — coin key behavior.
- `tests/reliability.js` — retry and state reproducibility coverage.
