# Weapon sound candidates

Short, deterministic 44.1 kHz/16-bit mono WAV auditions. These are not wired
into gameplay yet.

The WAVs live in `work/weapons/`, which is gitignored — if the links below
are dead, re-render them with `node tools/generate-weapon-sfx.js`. This index is
tracked because it says what each cue *is*, which the filenames only half tell you.

## B-33P — laser ball

- [01 — Laser orb pulse](../../work/weapons/01-b33p-laser-orb-pulse.wav)
- [02 — Laser orb bubble](../../work/weapons/02-b33p-laser-orb-bubble.wav)
- [03 — Laser orb arcade](../../work/weapons/03-b33p-laser-orb-arcade.wav)

## Grumpos — axe

- [04 — Heavy axe whoosh](../../work/weapons/04-grumpos-axe-heavy-whoosh.wav)
- [05 — Bright axe cleave](../../work/weapons/05-grumpos-axe-bright-cleave.wav)
- [18 — Axe throw ring](../../work/weapons/18-grumpos-axe-throw-ring.wav)

## Lorenzo — wrench

- [06 — Wrench clang](../../work/weapons/06-lorenzo-wrench-clang.wav)
- [07 — Wrench thunk](../../work/weapons/07-lorenzo-wrench-thunk.wav)

## Ray M'N — rocket fist

- [08 — Rocket-fist launch](../../work/weapons/08-raymn-rocket-fist-launch.wav)
- [09 — Spring fist](../../work/weapons/09-raymn-spring-fist.wav)

## Gnash — spin dash

- [10 — Spin-dash motor](../../work/weapons/10-gnash-spin-dash-motor.wav)
- [11 — Spin-dash whirl](../../work/weapons/11-gnash-spin-dash-whirl.wav)

## Mochi — compression

- [12 — Compress squish](../../work/weapons/12-mochi-compress-squish.wav)
- [13 — Compress spring](../../work/weapons/13-mochi-compress-spring.wav)

## Miss Chomp — bite

- [14 — Hard snap](../../work/weapons/14-miss-chomp-hard-snap.wav)
- [15 — Arcade bite](../../work/weapons/15-miss-chomp-arcade-bite.wav)

## Fernwick — shield

- [16 — Shield roll](../../work/weapons/16-fernwick-shield-roll.wav)
- [17 — Shield bash](../../work/weapons/17-fernwick-shield-bash.wav)

## Generic contact and material impacts

- [19 — Soft box thud](../../work/weapons/19-contact-box-soft-thud.wav)
- [20 — Hard box knock](../../work/weapons/20-contact-box-hard-knock.wav)
- [21 — Cardboard crumple](../../work/weapons/21-contact-cardboard-crumple.wav)
- [22 — Wood crack](../../work/weapons/22-contact-wood-crack.wav)
- [23 — Metal clang](../../work/weapons/23-contact-metal-clang.wav)
- [24 — Dull metal bong](../../work/weapons/24-contact-metal-dull-bong.wav)

## Weapon-specific contact accents

- [25 — B-33P laser-orb pop](../../work/weapons/25-contact-b33p-orb-pop.wav)
- [26 — Grumpos axe chop](../../work/weapons/26-contact-grumpos-axe-chop.wav)
- [27 — Lorenzo wrench hit](../../work/weapons/27-contact-lorenzo-wrench-hit.wav)
- [28 — Ray M'N fist impact](../../work/weapons/28-contact-raymn-fist-impact.wav)
- [29 — Fernwick shield bonk](../../work/weapons/29-contact-fernwick-shield-bonk.wav)
- [30 — Miss Chomp contact crunch](../../work/weapons/30-contact-miss-chomp-crunch.wav)

Regenerate the set with:

```sh
node tools/generate-weapon-sfx.js
```
