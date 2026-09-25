# MASHENSTEIN feature reel (September, v2)

## Deliverable

- Review export: `work/social/mashenstein-feature-reel-16x9.mp4`, 1920 × 1080, 60 fps, 49.6 s, H.264 + AAC.
- The default dev URL is `http://localhost:8001`.
- Built by `tools/render-feature-reel.js`. Shots, cue logs, probes and audio stems are in `work/local/feature-reel-build/`.

## What changed from v1, and why

Peter's notes on v1 were that the hero was invincible and often invisible, the objects were too small, nothing was interacted with, the rake appeared twice while the rattlesnake was missing, there was no fade in or out, the text was too small, and there were no sound effects. The v2 fixes:

- **Real play.** There is no `invuln` and no stubbed `takeHit`, and the hero is never hidden. Two real hits are left in on purpose: the rake bonk and the snake bite. The post-hit blink is capped at 0.45 s so the hero stays on screen.
- **Staged lanes.** For each shot the spawner is stubbed, natural hazards and power-up capsules are removed, and only that shot's objects are placed. Coins stay. Each object is placed so it reaches the hero on a chosen second, so a rake can't turn up in someone else's shot.
- **One hero per cabinet.** Lorenzo plays Plumber, Rusty Speed, Grumpos Frost and Kiko Neon. The relay portal is disabled for the capture.
- **Zoom.** Everything is captured at 4K. Action shots are native 2× or 1.5× crops. The crop follows the ground under the hero (through the game's own camera transform), so it doesn't lose him on a slope or cut off his jump.
- **Sound effects in sync.** `Audio.sfx` is wrapped during capture, so every cue the game fires is logged with its frame. The soundtrack renders each of those cues through the real engine, using `tools/lib/cue-render.js`, and places it on its frame. The v1 "camera click" was `clickHard`, which is the finish plunger. The shutter is now the game's `cameraClick`, fired by the speed trap itself.
- **Fades and text.** The film fades up from black over 1 s and down to black over 0.8 s. Text is described under **The cut** below. The end card is the teaser's animated title card (`work/local/teaser/titleclip.mjs`).

## The cut

The cut is timed to TERMINAL VELOCITY at 150 BPM, where one bar is 1.6 s. It runs 49.6 s.

| Shot | Bars | Stage, hero | What happens | Text on screen |
| --- | --- | --- | --- | --- |
| dive | 2 | intro film | Fades up from black in silence; the first sound is the leap | NEW THIS WEEK |
| rake | 2 | plumber-1, Lorenzo | Steps on the rake and gets hit by the handle, then jumps on past the barn | NEW IN / PLUMBER PANIC |
| goose | 1 | plumber-2 | The goose charges and he jumps it | ANGRY GEESE |
| balloon | 1 | plumber-2, close-up | Hot-air balloon | NEW SCENERY |
| windmill | 1 | plumber-3, close-up | Windmill turning | — |
| snake | 2 | speed-1, Rusty | The rattlesnake strikes and bites; he jumps clear | NEW IN / SPEED ZONE |
| camera → mugshot | 1 + 1 | speed-2 | SMILE! board, then a cut-in on the flash and a GOTCHA mugshot with a $1986 fine | SAY CHEESE! |
| pumpjack | 1 | speed-1, close-up | Pumpjack and dish | — |
| coyote | 1 | speed-1, close-up | The coyote howls as a tumbleweed rolls by | — |
| jet | 1 | speed-3 | The jet goes supersonic | — |
| crystals | 1 | frost-1, Grumpos | Slide-kicks the ice crystals apart | NEW IN / FROST FORTRESS |
| axe | 1 | frost-1 | The axe goes through a snowman and comes back | SNOWMEN BEWARE |
| lift | 1 | frost-1, close-up | Chair-lift cabins | — |
| reindeer | 1 | frost-2, close-up | The herd gallops behind the fortress | — |
| flypast | 1.5 | neon-1, Kiko | A day-livery train flies over Mt Fuji | NEW IN / TERMINAL VELOCITY |
| strike | 1.5 | neon-1 | Lightning turns day to night; the only thunder in the reel | DAY TURNS TO NIGHT |
| panda | 2 | neon-2 | Punts the panda, then the frog | KICK THE ROADWORKS |
| drones | 1 | neon-2 | Slides under a three-high drone column | DRONE STACKS |
| train | 3 | neon-2 | Wide shot: the train lands, she jumps onto the roof and runs along it | CATCH THE BULLET TRAIN |
| tag | 1.5 | card | WHO'S GOING FIRST? on black, pushing in | — |
| title | 2.5 | end card | The teaser's animated title card; the tape stops | — |

- **Text.** Everything is set in Lilita One across the top of the frame. A cabinet card is a yellow NEW IN over the white cabinet name. A callout is a single yellow line. Both are defined in the `texts` table, and `dy` moves a line down, for example to clear the flypast train.
- **Close-ups.** They ride the parallax: `pan` gives the subject's centre at the shot's first and last frame, found with `--probe --wide`. They render at 1.5×, from a 5760-wide canvas at density 12. The hero is hidden in them, and hero cues are left out of their sound.
- **Scenery clock.** `bgT` sets the scenery clock for a shot; the coyote's howl is on a 5 s cycle. `songBeat` pins the neon song clock to the frame, because a muted page runs it in real time and the sky struck at random. Only the strike shot crosses a strike beat.
- **Continuous cut.** `continues` lets a cue's tail run across the next cut. The shutter from the camera shot rings on into the mugshot close-up.

The music is the full TERMINAL VELOCITY mix from bar 45. It starts on the first gameplay bar, runs under the tag card, and tape-stops over the end card. The dive's cues are logged offline like every other shot, so nothing plays before takeoff.

## Rebuild

A dev server has to be running; the default is `http://localhost:8001`.

```sh
MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js                        # everything
MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js --probe --shots=rake    # contact sheet + cue log
MASH_DEV_URL=http://localhost:8001 node tools/render-feature-reel.js --capture-only --shots=rake,goose
node tools/render-feature-reel.js --audio-only        # soundtrack from the saved cue logs
node tools/render-feature-reel.js --assemble          # cut saved shots, re-render the soundtrack (--keep-audio to reuse it)
```

- **Probe first.** `--probe` steps a shot at half resolution and writes `probe-<shot>.jpg`, one frame every 0.2 s at the shot's crop. It also prints the hero's state and every cue fired. Framing and input timing are what go wrong, and a probe takes seconds where a 4K capture takes minutes.
- **Adjusting a shot.** Each shot is one entry in the `shots` table. `inject[].at` is the second the object reaches the hero. `keys[].t` is a key press: `Space` is jump, `ArrowDown` is slide/kick, `KeyX` is the ability. `track` sets the crop: width, where the hero sits across it, and where the ground sits down it, plus an optional zoom move.
- **Music.** The music bus is cached in `music-bus.wav`. `--refresh-music` re-renders it, which you need after `src/data/songs/neon.js` changes (it was mid-remix when this was cut). `--refresh-title` re-renders the end card.
- **Stems for auditioning:** `sfx-bus.wav`, `music-bus.wav`, `soundtrack.wav`, and `cues-placed.txt`, which lists every cue with its reel time.

## Known limits

- The goose, rattlesnake, rake and trains have no sound cues of their own in the game, so their moments are carried by the hit, jump, land and coin cues.
- Sheep, the collie and the tractor are not in the cut. The flocks sit at hashed summits and never landed in a chosen frame, and the tractor is too small for a close-up.
- `tools/render-cues.js` still passes only gain, shape and reverb to a cue. `tools/lib/cue-render.js` passes everything, and the two could share it.
