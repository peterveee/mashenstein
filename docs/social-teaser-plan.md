# Instagram teaser art and video plan

## Objective

Build a repeatable supply of Instagram-ready stills and short videos that tease
MASHENSTEIN before launch, generated from the game's own painters and tooling
rather than hand-made in an image editor. Every idea below is anchored to art
that already exists in `src/`, so promo assets cannot drift from the game, and a
re-render after an art change costs a command rather than a redraw.

## Why the existing art suits the format

- **The art is vector, not pixel.** Props bake at 8x (`SS` in
  [props.js](../src/sprites/props.js)) and skies are gradients, so the same
  logical 480x270 drawing code rasterizes cleanly at 1080p or above. See the
  resolution section of `.claude/skills/render-video/SKILL.md` — drawing small
  and upscaling throws away detail the painters would happily have drawn.
- **Nine cabinets in eight visual styles** (pixel, faux3d, neon, watercolor,
  vhs, lcd, cardboard, doodle, plus SURGE mashing all eight) means built-in
  visual variety without new art.
- **The hub already contains promo art.** The per-hero marquee posters
  ("LORENZO / UNLICENSED", "GNASH / NEEDS A NAP") are diegetic advertising
  inside a game about an arcade. They work as promo art unmodified.
- **Existing tooling covers most of the work:** `tools/render-video.js` already
  accepts `--size=1080x1350`, `tools/gallery-entry.js` renders every drawable
  through the real draw functions, `tools/render-icon.js` is the pattern for a
  one-off high-resolution still, and `src/game/attract.js` plays real stages
  deterministically with no human at the keyboard.

## Shipped tooling

Three dev tools. None of them ship — nothing in `src/` imports from `tools/`, and
output lands in gitignored `dist/social/`.

```
node tools/render-social.js [all|posters|styles|cabinets|locked|menuboard] [--flags]
node tools/render-cabinet-reel.js [trackId] [outPath] [--flags]
node tools/render-loop.js [locked|gary|coin|eggshell] [outPath] [--flags]
```

`render-social.js` writes 30 PNGs in about a minute: nine 1080x1350 posters, the
1080x1080 nine-style contact sheet, eighteen 1080x1350 lit-cabinet portraits, the
one unplugged-cabinet still, and the menu board. Useful flags: `--only=ID` for one
cabinet, `--hero=ID` and `--crop=N` for the contact sheet, `--ss=N` for
supersampling, `--out=DIR`.

The cabinet portraits come in pairs: `cabinet-ID.png` with the cabinet's poster
star running on the glass, and `cabinet-ID-empty.png` with the screen showing only
its own background. Both are rendered because which one works depends on the
cabinet and on the caption — the machine and its style pack are the subject, and a
character on the screen is either the thing that sells it or a second thing
competing for the eye. Choose at posting time rather than re-running the tool.

Where a hero does appear in a scene, he is placed off centre, at the fraction of
the frame a real run puts him at — `HERO_SCENE_X` and `HERO_FRAME_FRAC` in
`tools/lib/concourse-art.js`, both derived from `PLAYER_X` and the camera `ZOOM`
rather than dialled in. A run welds the runner to a fixed offset from the camera
and gives everything to his right to runway; that asymmetry is what the game looks
like, and a promo still that centres him is a picture of a different game. The
cabinet screen was centred until this was fixed, which also stood the hero inside
the crate he was supposed to be running at.

`render-cabinet-reel.js` writes `dist/social/nine-cabinets.mp4` — 9.00s,
1080x1350, one second per cabinet on the MEGAMIX beat grid. Useful flags:
`--beats=N` (music per cabinet), `--zoom=N` (logical rows in shot), `--band=N`
(caption height, 0 for none), `--size=WxH`, `--from-bar=N`, `--no-flash`,
`--no-labels`, `--reel`, `--frames=N` for a smoke test.

**`--reel` gives any of the videos the 9:16 Instagram Reels / Stories frame**
(1080x1920); without it they render 4:5 for the feed. It is not a crop. Each scene
derives its logical frame from the output's own aspect and composes natively for
it, so a reel gains room rather than losing its sides:

- The **cabinet reel** grows its caption band with the frame (a fifth of the
  height, which at 4:5 is the same 270px it always was) and the scene box above it
  simply gets taller.
- **Gary** is sized off the frame's WIDTH, not its height — key a character to
  height and a 9:16 frame makes him half again as tall while the frame stays
  1080 wide, which puts his head through both sides. The extra height becomes
  black over his head, which is where Instagram's own UI sits anyway.
- The **coin fall** scales its durations and its coin count with the frame, so a
  coin falls at the same speed and the same on-screen density in any shape. Its
  clip length is then *derived* rather than declared — last spawn, plus the
  slowest coin's crossing at this height, plus the black tail — so a reel runs
  4.98s against the feed cut's 4.50s instead of guillotining coins mid-air.
- The **locked cabinet** is one object centred on black; it needs nothing.

```
node tools/render-loop.js coin --reel dist/social/reel-coin.mp4
node tools/render-cabinet-reel.js megamix --reel dist/social/reel-nine-cabinets.mp4
```

`render-loop.js` writes silent clips — three on black, and the eggshell pass on
a flat dark grey. Each is built around one
CYCLE and rendered as a whole number of them, with everything that moves a
function of the position within a cycle — so the last frame hands off to the first
and the file repeats without a join. Verified: matching frames across the seam
measure PSNR 61.5 dB, i.e. identical at source with only x264 quantisation between
them. Useful flags: `--cycle=N`, `--repeats=N`, `--zoom=N` (logical frame width;
bigger is further back), `--seed-from=ID`, `--poster`, `--coins=N`, `--size=WxH`,
`--reaction=R`, `--grey=#RRGGBB`.

Only `locked` repeats within its own file (two flashes). `gary` and `coin` are
single arcs of 9.80s and 4.50s that open and close on black — they meet the seam
rule for free, and both are events that stop being events when they happen twice:
Gary leaning in three times in eight seconds turned the gag into a screensaver.

Gary is 2.616s of black, 1.568s of Gary, then 5.616s of black — absent for 84% of
his own clip. That is the dial that stops him reading as frequent when the file is
played on repeat: the tail of one pass plus the lead of the next puts over eight
seconds of nothing between two appearances. His beats are held in SECONDS rather
than as fractions of the cycle precisely so that dial can move without touching the
performance; `--cycle=N` re-dials the trailing black instead of stretching him.
Below `GARY_LEAD + GARY_ACTION` (4.184s) it starts cutting his exit off.

The coin fall is 60 coins, down from 150. At 150 it closed into a solid curtain and
the individual coin stopped being legible, taking the flip, the depth banding and
the face with it — the only things in the shot worth looking at. `--coins=N` dials
it without editing the file.

All three share `tools/lib/art-page.js`, which opens the headless page, turns on GPU
rasterization, and — the part that matters — loads the game's webfonts and
*checks* they arrived before anything draws. `src/engine/sprites.js` measures each
glyph once and caches the advance, so type drawn before Lilita One and Fredoka
land is not merely in the wrong face, it is spaced for Trebuchet for the life of
the page. The harness throws rather than shipping that silently. **These renders
need network access the first time**, for the Google Fonts stylesheet the boot
gate uses.

Three things worth knowing before editing them:

- **Lay promo compositions out in output pixels, not small logical units.**
  `drawPoster` stamps its star from `starPlate()`, which supersamples 3x the size
  it is *asked* for — sized for a 40px sheet on a wall. Laying the poster out in
  an 80-unit logical frame cached the star at 84px and then magnified it ~9x, for
  a visibly blurry hero on otherwise razor-sharp type.
- **Frame scenes, do not fit them.** `GROUND_Y` is 232 of 270, so cover-fitting a
  whole world frame into a square spends 86% of it on empty sky. Both tools take
  a crop/zoom in logical rows and anchor it on the ground line.
- **Take each cabinet's first pattern cell and you get nine cactuses.** Most
  banks open on one. The contact sheet does a greedy first-unused pass instead.

The concourse composition itself — one machine, its poster, the floor, the row of
neighbours, the light falloff — lives in `tools/lib/concourse-art.js`, because
three outputs now want it (the lit stills, the locked still, the locked loop) and a
painter copied into three entry strings is a painter that disagrees with itself
within a week. The frame plumbing is likewise shared in `tools/lib/mp4-pipe.js`.

Re-run all three after any cast or style change, the same way
`tools/render-icon.js` gets re-run. `src/sprites/backwall.js` exports
`CABINET_STAR` so the promo renders read the poster casting from the game rather
than keeping a copy that goes stale.

## Stills — 10 ideas

Ordered roughly by value-per-effort. The four marked **shipped** are built.

### 1. The poster wall, one hero per slide — **shipped**
`node tools/render-social.js posters` → `poster-<cabinet>.png` x9.

The hub's marquee posters rendered standalone at 4:5 on the game's own wall, with
a spotlight and a vignette added as framing. Nine-slide carousel; caption is that
hero's tagline from [heroes.js](../src/data/heroes.js) /
[jokes.js](../src/data/jokes.js). Nine rather than eight because the posters are
cast per *cabinet* — which covers all eight heroes plus Gary fronting THE SURGE.
OVERTIME has a tenth one-sheet and is deliberately left out: it is post-finale.

One thing to accept or change deliberately: `drawPoster` always sets the wordmark
in `pal.button` gold, so on the pale cabinets (office, cardboard) it is gold on
light grey and reads weakly. That is the game's own poster logic, visible in the
hub too, so it is left alone here rather than special-cased for promo.

### 2. Same hero, nine styles — **shipped**
`node tools/render-social.js styles` → `styles-lorenzo.png` (`--hero=ID` for any
other, `--crop=N` to reframe).

One hero across all eight style packs plus THE SURGE, as a 3x3 filling one
1080x1080. Each cell is a real scene — that cabinet's own sky, ground renderer and
hazards, hero at the size a run actually draws him — cropped square and captioned
with the game's name, so the sheet reads as a line-up rather than a mood board.

### 3. Mugshot grid / cast carousel
`drawToonFace()` at high resolution on flat brand-colour tiles, 3x3 with
Eggshell centre. Works as a single post and as the pinned "who's who" carousel.

### 4. THE GOLDEN APPLIANCE
The toaster, enormous, dead centre, gold finish with rim glow on near-black.
Caption: the hidden collectible in every stage is a toaster. Object-photography
framing; needs no context to land.

### 5. Nine cabinets, one lit — **shipped**
`node tools/render-social.js cabinets` → `cabinet-<id>.png` x9.

One machine and the floor it stands on, in a 4:5 frame at hub scale. No poster and
no neighbours — the sheet and the row are concourse context, and what these are for
is the machine. The floor stays: without it the cabinet floats, and the light it
pools on the tiles is what puts it in a room. The wall falls off into the dark on
the game's own smoothstep (`wallLitFrom`, one fixture over the machine).

The glass runs that cabinet's own attract scene with its poster star in it, framed
so the ground line sits 72% down the screen — the hub frames its screens higher,
which is right for a 34px screen you walk past and wrong for a still that fills a
phone.

The logical frame is 140x175, and since the machine is a fixed 48x85 in logical
units, that frame is the only zoom control these shots have — bigger is further
back. At 140 the cabinet is 34% of the frame width, stepped back from the 44% an
earlier 110x137.5 pass filled, which read as a product shot cropped to the object
rather than a machine standing in a room.

Stepping back is only safe because the ground line is PINNED, at `CAB_GROUND`
0.718. paintConcourse's default stacking is proportional to the frame, which holds
while the machine is most of the picture and falls apart past that: open the frame
up with it in force and the same proportions march the ground line up and hand the
bottom 40% of the shot to floor tiles. Pinned, the room a wider frame buys goes
into wall ABOVE the machine — which is what stepping back actually looks like —
and the floor keeps the bottom quarter it always had. (This is also why the old
144x180 poster-era frame failed once the sheet was dropped: same trap, no pin.)

Nine posts with a rigid signature, so the profile grid reads as a set. Caption
pairs the genre with its plug gate.

### 5b. The locked machine, static on the glass — **shipped**
`node tools/render-social.js locked` → `locked-cabinet.png`.
`node tools/render-loop.js locked` → `loop-locked.mp4`, 6.40s, silent.

The counter-shot to #5, and the game's own dead screen doing the work:
`drawDeadScreen`'s noise bands, its bright spark, its scanlines and the glass spill
past the bezel, plus a bloom and a floor pool that ride the burst amplitude so the
static reads as happening in a room rather than on a picture of a cabinet. An
unplugged palette makes `drawCabinetScreen` return null on its own, which is the
same branch the hub takes to reach the dead screen — so nothing here is a special
case.

Three things this needed:

- **The still has to aim at the burst, not sample it.** `deadScreenBurst` holds
  the static on for 0.42s out of a period of 6.5–11.7s, so 94% of clocks render a
  black screen. `burstTime()` in the shared module solves for the phase; 0.16 is
  mid-plateau, where the amplitude is full and the spark is firing.
- **One still, not nine.** `cabinetPalette(cab, false)` returns the same dark
  palette for every cabinet — an unplugged machine has no chassis colour, no screen
  and no marquee, and its poster loses its motif. Only the burst seed differs.
- **The video cuts the dead air rather than speeding the burst up.** Each burst
  plays at its true length and true 18Hz noise stepping; the clip just skips the
  minutes of nothing between them. Compressing the period instead gives a fast
  chattering crackle, which is a different and worse thing. The room also dims
  slightly as the glass crackles — framing, but the fiction's own premise, and it
  stops the frames between bursts being byte-identical stills.

The still and the video are deliberately different shots. The still is framed close,
in the concourse, with the poster above it. The video is **one machine on black** —
no wall, no floor, no neighbours, no poster — and framed a long way back, so the
cabinet is about a seventh of the picture. That went through a close framing and a
wide row of dead machines first; losing the room outright beat both, because with
walls in shot the eye has furniture to look at and the burst is one event among
several, where on black the only thing that is not black is the glass doing it.
`--poster`, `--zoom=N` and the `bare` flag in the scene table dial all of that.

### 6. A profile grid that is one picture
Slice the title logo or the hub wall into nine tiles, posted in reverse order so
the profile itself is a mural. Costs nine posts, buys a permanent brand asset.
Once, at launch.

### 7. Museum plates for props
Cactus, tombstone, office printer, traffic cone, the Dust Devil — each on a flat
pastel field with a small serif museum label and a fake accession number.
Deadpan, and it shows off prop painters nobody sees at gameplay size.

### 8. Plugged / unplugged split
One stage, hard diagonal split: full colour on one side, drained to dead CRT
grey on the other. Literalises the title. Reuse the VHS treatment in
[rewindFx.js](../src/game/rewindFx.js) for the dead half.

### 9. Dolores' menu board — **shipped**
`node tools/render-social.js menuboard` → `menuboard.png`.

Straight `drawWallBay` on the `menuboard` dressing: the struck-through items, the
prices in plugs, COLD DOG written over HOT DOG, FRIES re-marked from 1 PLUG up to
9, NOW SERVING stuck on 0, and the health grade re-graded A+++ by the same marker.
Hung at readable size with the room put out around it. Nothing in this image is
drawn by the tool except the darkness.

The board gets `lit: 0.95` where the hub gives its bay 0.42 — a post is a
photograph of the one thing still on. The room is darkened *before* the board goes
up: darkening only the strips above and below leaves a full-width band of lit wall
between them, which reads as a lit stripe across the picture rather than as one
powered object.

### 10. `PRESENTATION ERROR`
Tight crop on a boss health bar carrying that label. Companion post: the
difficulty select, where four of the five modes are identical. Both jokes only
land as screenshots of a real UI, which is what we have.

## Videos — 8 ideas

### 1. Visualiser loops (the pipeline is already done)
15 visualisers x 13 music banks via `tools/render-video.js`, with
`--size=1080x1350 --repeat --fade`. TOASTER SKY PARADE on MONSTER MEGAMIX,
PRISMATIC STORM on the shop theme, NEON CATHEDRAL on CRYPT SHIFT. One a week
indefinitely, captioned with the track name. Constraints: `--size` and
`--pixel` are mutually exclusive, and a portrait target cover-crops the sides.

### 2. Attract-mode reels — no hand-playing required
[attract.js](../src/game/attract.js) already runs a real stage or boss with
DemoBot against a throwaway save, deterministically, over a shuffled rotation of
all 27 stages plus 3 bosses. Capture eight-second clips and stack them 9:16 with
a title band above and the control legend below. Endless competent footage from
a fixed seed.

### 3. Style morph on the beat
One hero on a treadmill loop while the cabinet style crossfades through all
eight packs, cutting on the downbeat, ending on SURGE with all eight at once.
About six seconds. This is the core trailer beat.

### 4. Relay hand-off, slowed, seamless loop
Hero enters the cable portal, next hero exits. Slowed and looped clean, with the
scripted `PORTAL_BANTER` line as a subtitle. Reels reward perfect loops.

### 5. Roster count-in
Eight heroes pop onto the hub floor one per beat, then the every-third-switch
Relay Blast whites the screen out. Six seconds, ends on the logo.

### 6. Eggshell taunt cards
Black screen, large type, chiptune sting: "I HAVE FILED A FORM DISPUTING THAT
LAST JUMP." / "I HAVE BEEN LOSING TO PLUMBERS SINCE 1986." A cheap recurring
series that builds the villain before there is anything to play.

### 7. Nine cabinets in nine seconds — **shipped**
`node tools/render-cabinet-reel.js` → `dist/social/nine-cabinets.mp4`, 9.00s,
1080x1350.

One second per cabinet, hard cuts on the downbeat. MEGAMIX is 120bpm, so two beats
is exactly one second and nine cabinets is exactly nine — the cut grid comes from
the track's own bpm, and `--from-bar=N` shifts the music by whole bars so an offset
can never land the reel off that grid. No audio analysis: nothing here reacts to
the mix, so the picture is a pure function of the frame index and 540 frames render
serially in about nine seconds with GPU rasterization on.

Each clip is real: that cabinet's style pack, the hazards its own pattern bank
spawns, scrolling at `BASE_SPEED * (1 + speedBonus)` — the speed a run there
actually gives you — with the hero that fronts its poster. The bottom 270px is a
caption band carrying the game's name, its genre, and nine pips marking which
machine this is, because the count is the pitch.

Two deliberate fictions, both flagged in the source:

- **The hero jumps on a faked parabola**, not the game's jump integration. It
  triggers when a hazard is about to cross him and apexes over its centre. This is
  footage of the art; faking an arc is honest where sliding a runner through a
  cactus would not be.
- **THE SURGE gets a fast-forwarded clock.** Its pack cycles the other eight
  styles holding each for seven seconds, so one real second is whichever style it
  opened on, in the surge cabinet's own dark palette — the payoff cut with no
  payoff. It is fed 21 seconds of pack time instead, so the final clip flips
  through about three styles. The pack does exactly what it always does, faster.

### 7b. Gary catches you looking — **shipped**
`node tools/render-loop.js gary` → `loop-gary.mp4`, 8.00s, silent.

Black. Gary leans in from off screen, finds you looking back, panics, and goes.
Three cycles of a 2.8-second beat: empty, lean in, eye contact, flinch, held, gone,
empty.

The panic is `pose.faceSurprised`, the rig's own surprise face — wide eyes, round
mouth, lifted brows. He is drawn taller than the frame with his feet well below it,
so the bottom edge cuts him at the waist. Nothing here is a "peeking" pose; it is
the standing rig pushed most of the way out of shot.

He stays **front on**. An earlier pass yawed him to camera with `pose.turn` on the
eye-contact beat — a real control and the wrong one: a three-quarter torso reads as
a character in a scene, where front-on reads as something looking directly at you,
which is the whole joke. The waist crop exists for the same reason; below it the rig
is a standing pose seen from far too close and the hip read as a shape rather than
a body.

The ink is retuned for this draw and reset after —
`setInk({ body: 0.42, face: 0.5, brow: 1.4, browA: 0.88, browL: 0.5 })`. Two
separate reasons:

- **Contours.** The cast's are soft, translucent and sized to survive being 24px
  tall over moving scenery; at ten times that on flat black they read as a heavy
  border drawn round him. Same reasoning as `tools/render-icon.js`.
- **Brows**, and only once he needs them. He leans in with a bare neutral
  forehead and gets brows at the instant he reacts, which is most of what sells
  the reaction. They also need taming: Gary's brow ink is his own red eye colour,
  and at full width and saturation it is a pair of scarlet bars that read as
  furious rather than startled.

This one needed a change to shared cast art — see below.

#### The one src change: `pose.browRaise`

`drawEyes` only draws a brow when the face is annoyed, calling, hmph, focus, cocky
or gruff. Gary's mood is `soft` and an idle pose is none of those, so the surprise
face came out as wide eyes and an open mouth on a bare forehead. Every route in was
blocked:

- `pose.annoyed` lights the brows but wins the mouth chain outright, taking the
  round shocked mouth with it.
- `calling` / `hmph` draw the one shape the source itself describes as reading
  "startled" — and are hard gated to `id === 'dolores'`.
- `focus` is reachable from `kind: 'run'`, and was the first thing tried, but its
  shape drives the inner ends **down** and reads as a glare. Wrong expression, and
  present from the first frame rather than arriving with the reaction.

So a face could be surprised or it could have eyebrows, and not both.
`src/sprites/toons.js` now has an opt-in `pose.browRaise` that unlocks the brow
block with a lifted, level shape. It is **additive and inert**: nothing in `src/`
sets it (`grep browRaise src/` finds only the two lines that define it), so
in-game rendering is unchanged and the suite passes. The lift is 0.104u, taken
from the counter-staff branch's own comment recording that value as the point
where the face reads as startled — the read Dolores did not want and this does.

Worth knowing it is there, since it is cast-wide code touched for a promo clip.

He is the right character for it twice over: he is the one who knows he is dead and
files it under someone else's problem, and he is the one who turns out to have had
hands all along.

Three things that had to be got right:

- **The flinch must not hide the face.** The first pass pulled him 18% back on the
  shock beat, which hid one eye and half the mouth — losing the surprise face on
  the exact beat the clip exists for. He barely moves now; the panic is on his face
  and the leaving is a separate, much faster beat.
- **He stops as soon as he is in shot and no further.** Travelling to a third of
  the frame made it a stride rather than a lean, and a shorter move is a snappier
  one for free.
- **Measure the head, do not reason about it.** Half-width is 0.21 of drawn height
  front on — but 0.15 while he was yawed, because a turned head is narrower in
  projection. Reusing the yawed figure after he faced front put the frame edge
  through the side of his face.

### 7c. INSERT COIN — **shipped**
`node tools/render-loop.js coin` → `loop-coin.mp4`, 13.20s, silent.

INSERT COIN flashes on black, then the arcade gets paid all at once. 150 coins over
about three seconds. Timeline:

| t | |
|---|---|
| 0.0 | black; INSERT COIN blinking in the game's own display face, low in the frame |
| 1.0–1.35 | the prompt holds on and fades out |
| 1.15 | first coins start falling, sparse |
| 1.15–3.1 | the fall builds; spawn density climbs the whole way |
| 3.1 | last coin spawns |
| ~4.25 | the last one leaves the bottom of the frame |
| 4.25–4.5 | black |

The prompt is gone **before** any coin gets near it — the fall arriving over live
text reads as an accident rather than as a beat. Worst case is the biggest, fastest
coin, which reaches the caption line at about 0.72 of its 0.5s crossing, so the
earliest contact is 1.51s against a fade that finishes at 1.35s. **That margin is
thin and it is the first thing to recheck if these timings are compressed again.**

Not a loop in the sense the other two scenes are, but the same machinery: it opens
and closes on black, so treating the whole arc as one cycle makes it repeat cleanly
anyway. The blink runs at a 0.34s period rather than 0.55s — the prompt only has a
second before it starts going, and at the slower rate that is barely one on-off,
too few to read as blinking rather than as a single flicker.

`PROP_PAINTERS.coin` is a face-on vector with no frames, so the rotation is the
tool's — done the way a flat coin actually turns rather than by faking frames. A
constant-width edge is drawn first and the face is squashed horizontally by
cos(angle) over it, so when the face narrows to nothing the edge is what is left;
past ninety degrees the scale goes negative and mirrors the face, which is the back
of the coin and what stops the spin reading as a pulse.

Three implementation notes:

- **Depth is one `z` per coin driving size, fall speed and brightness together**,
  the way the jukebox visualisers do it. Sorted by z once at build time so near
  coins draw over far ones with no per-frame sort.
- **Distance darkens, it does not make transparent.** The first pass used
  `globalAlpha` for depth, and distant coins came out see-through with the coins
  behind showing through them — ghosts, not depth. Now four plates are baked at
  four brightnesses with `source-atop` and every coin is opaque.
- **The face is rasterized once and blitted.** Two gradients per coin per frame,
  with a hundred on screen, is the one thing here that would actually be slow;
  `props.js` caches its own painters for the same reason.
- **The coins are small.** The painter is drawn for a pickup a few pixels across
  in a run; blown up to a third of the frame it stops reading as a coin — the
  stamp becomes a shape and the highlight becomes a blob. Held under a seventh of
  the frame width, the spread reads as loose change.

The spawn times are spaced by `sqrt(u)` rather than uniformly. The derivative of
sqrt shrinks as u grows, so starts bunch toward the end and the fall thickens into
a sea instead of arriving as a constant drizzle.

### 7d. Eggshell has a look round — **shipped**
`node tools/render-loop.js eggshell [--reaction=smirk|gloat|roll|really]` →
`work/social/loop-eggshell.mp4`, 9.00s, 1080x1350, silent. `--reel` for the 9:16
cut.

The villain slides on from the left, checks both ways, has an opinion about it,
and carries on out the right still wearing it.

| t | |
|---|---|
| 0.00–0.55 | empty frame |
| 0.55–1.95 | he glides in, decelerating to a stop |
| 1.95–2.50 | hovering, dead front — arrived, nothing yet |
| 2.50–2.80 | eyes go left, back the way he came |
| 2.80–3.75 | **and wait** |
| 3.75–4.17 | all the way across |
| 4.17–5.12 | **and wait** |
| 5.12–7.22 | eyes come back to you *and the expression with them*, then hold |
| 7.22–8.42 | and off to the right, pose and all |
| 8.42–9.00 | empty frame |

**The waits are the performance.** The first cut swept his eyes through one
continuous sine in 1.3s and read as a man scanning a room on his way past —
smooth, and over before you had looked at it. Peter, 5 Sep: *"slow motion way
down… look left, wait a beat, look right, wait a beat, smirk, wait a beat, return
to normal, fly off."* So every move is now followed by a hold, and the holds are
the longest beats in the clip: a held pose is what gives a viewer time to read a
face, and the travel between two poses is only how the face got there. The clip
went from 5.25s to 9.00s and every second of that went into holding still. The
*travel* between holds is quick — Peter, 5 Sep, "speed up the eye movement a bit":
at 0.42s and 0.55s the moves were drifting, and a move only has to be long enough
not to look like a cut. 0.30s across, 0.42s for the sweep that goes twice as far.

The order is the joke's grammar too — he checks **both** ways before he allows
himself the expression; reacting mid-scan would be a man who did not need to
look.

**The second look goes straight into the pose.** There was a `front` beat that
walked his eyes back to centre before the reaction, and it read as a man
finishing one thought and starting another. Peter, 5 Sep: *"can we transition
from the right eye movement to the pose? looks a bit odd to go back to normal."*
So the return to camera is now the first 0.30s **of the reaction** rather than a
beat before it — the mood is already on while his eyes are still out at the
right, and they come back wearing it. The head cock lands on the same 0.30s, so
face, eyes and body all arrive together. Held in seconds rather than as a
fraction of the beat, because it is an eye move and has to travel at the speed
the other two do however long the hold behind it runs.

**And he leaves wearing it.** There was a `relax` beat that put his face back to
neutral before the exit, on the argument that a villain who flies off still
pulling the face was performing for you. Peter, 5 Sep: *"he should slide off WITH
his pose, not revert back to normal."* Which is the better read: dropping it made
the expression a thing that happened and then stopped, where carrying it out of
frame makes it the thing he leaves with. The mood, the cock of the head and the
gaze all hold straight through — he does not even turn to look where he is going.
That beat's 0.85s went into the reaction, so the hold got longer rather than the
clip shorter.

**Every beat is a control drawCopter already drives.** The professor's face is
live in game — `look`, `mood`, `blink`, and an independent twitch per brow —
because a cached expression next to the cabinet's own blinking gorilla read as a
sticker. The look-around is `face.look` held at ±1 with smootherstep travel
between, and the reaction is `face.mood`:

- **smirk** — one brow up and the mouth lifted at *that same corner*, the whole
  right half of the face rising as one gesture. Same-side is the smug read. In
  game he wears it passing the rooftop gorilla, and after a near miss.
- **gloat** — the grin pulled to one side, teeth showing, same raised brow. In
  game it is the pose he holds directly over the hero.
- **roll** — pupils up and out to the corners of their lenses, brows up with
  them, mouth flattened to the faintest downturn: the face of a man being made
  to wait. run.js sets it when the player ignores a hover window.
- **really** — *"oh really?"*, and the difference from the smirk is a **cross**.
  The smirk lifts one brow and the mouth corner under it; scepticism is the pair
  disagreeing. The right brow arches half again as far *and rolls outer-end-up*,
  the left one drops and rolls the other way, and the mouth lifts at the far
  corner. Nothing on his face agrees with anything else, which is what doubt
  looks like. Height alone was not enough on the first pass — two brows lifted
  straight up at different heights is a man with a wonky face, not a sceptical
  one; the **arch** is what carries it.

`really` is the one new mark in this whole clip: a `PRO_MOOD` entry and two
branches in [props.js](../src/sprites/props.js), additive, and nothing in a run
reaches it yet. Everything else was already drawn.

**He does not blink.** There was one mid-hold on each side, on the argument that
a face holding perfectly still for a second reads as a photograph. Peter, 5 Sep:
*"is he blinking in between eye movements? don't."* Right, and the reason is what
the holds are *for*: the eyes have stopped somewhere on purpose, and a blink is
the one thing that takes them off the thing they stopped on. The stillness is the
performance, not a gap in it.

**And no brow twitch.** One survived the blinks, closing the second hold, on the
argument that it said he was thinking without moving where he was looking — and
on the *left* brow specifically, since the right one is about to go up on its own
for three of the four reactions. It did not survive contact: Peter, 5 Sep, *"he
is flicking an eyebrow up before the final pose."* Which is exactly what it was.
Any brow moving in the beat before a reaction that raises a brow is a false start
on the thing the clip is building to, and which brow it is makes no difference.

So the holds hold completely. Nothing on his face moves but the pupils, and they
only move when he means to; the hover bob and the rotor are the whole of the life
in the still beats, which is the right amount — they belong to the machine, not
to him.

**The lean is what sells the scan.** He is drawn front on and his only gaze
control is the pupils inside the lenses — there is no yaw on this rig. At lane
size the pupils carry a glance alone; at three quarters of a frame wide, a body
that stays rigid while the eyes *stop and hold* is where the doll read comes
back. So the whole copter tips into each look and drifts with it, and cocks a
little further when the expression lands.

**The backdrop is a flat dark grey, and that is a correction.** It was first the
rhythm cabinet's own panel with the city taken off it — sky, wash and cell
lattice — and the lattice was the problem. The rotor is two thin blades and a
pair of translucent sweeps, which is a *texture*, and a texture over a texture
cancels: the one part of the machine that says it is flying went missing on a
background full of fine lines. `#2e2e34` is dark enough that the pale sweeps
carry and light enough that the near-black blades still have an edge — flat black
loses the blades outright, and anything lighter starts merging his cape into the
ground. `--grey=#RRGGBB` moves it.

**9.00s is not a round number by accident.** The rotor steps 48 times a second
through a twelve-frame half-turn — `copterFrame`'s own rate with no song setting
the beat, and this clip is silent — so the seam is only clean where `48 * cycle`
is a multiple of 12, i.e. on quarter seconds. A `--cycle=N` off that grid lands
the last frame mid-blade. The hover bob is likewise a whole number of cycles per
clip, and slower than the first cut's: it is the only thing moving through the
holds, and at the old rate it was busier than the performance on top of it. First
and last frames are the bare backdrop, identical at source and identical through
the encode too (PSNR infinite).

### 8. Launch day only: the ending
Eggshell warmed by the socket — "SO THIS IS THE WARMTH I NEVER GOT." Hold this
one back.

## Format and delivery notes

- **Sizes:** 1080x1350 (4:5 feed), 1080x1080 (square), 1080x1920 (Reels).
- **Gameplay must not be cropped to portrait.** The game is 16:9; portrait
  targets crop the sides rather than letterbox. Cropping is fine for
  visualisers, wrong for gameplay — letterbox the 16:9 clip into a designed 9:16
  frame instead.
- **Renders land in `dist/`,** which is gitignored, so large MP4s are never
  committed. Stills worth keeping should be archived deliberately.
- **Re-render after art changes.** These assets are generated from the live
  painters, so any cast or style change dates them; treat a re-render as part of
  shipping an art change, the same way `tools/render-icon.js` is.

## Status

Rendered and on disk in `dist/social/`:

| Asset | Files | Command |
|---|---|---|
| Cabinet one-sheets (#1) | 9 x 1080x1350 | `render-social.js posters` |
| Nine-style contact sheet (#2) | 1 x 1080x1080 | `render-social.js styles` |
| Lit-cabinet portraits (#5) | 9 x 1080x1350 | `render-social.js cabinets` |
| Locked machine, static (#5b) | 1 x 1080x1350 | `render-social.js locked` |
| Menu board (#9) | 1 x 1080x1350 | `render-social.js menuboard` |
| Nine cabinets in nine seconds (#7) | 9.00s 1080x1350 mp4 | `render-cabinet-reel.js` |
| Locked machine crackling (#5b) | 6.80s silent loop | `render-loop.js locked` |
| Gary catches you looking (#7b) | 8.40s silent loop | `render-loop.js gary` |
| INSERT COIN cascade (#7c) | 4.50s silent | `render-loop.js coin` |

That is roughly three weeks of posting: the nine posters as a carousel plus nine
singles, the contact sheet as the premise post, the nine cabinet portraits as a
series, the menu board as a standalone, and the reel as the first video.

Still outstanding, in the order they are worth building:

1. **Visualiser loops (video #1)** — no new code needed at all:
   `node tools/render-video.js megamix "TOASTER SKY PARADE" --size=1080x1350 --fade=1`.
2. **Mugshot grid (still #3)** — `drawToonFace` at output resolution; a short
   painter added to `render-social.js`, since the harness now exists.
3. **Attract-mode reels (video #2)** — the biggest remaining unlock, and the only
   one that needs real work: capturing [attract.js](../src/game/attract.js) driving
   a live `RunState` rather than painting scenes frame by frame.
4. Stills #4, #7, #8, #10, #11 and the remaining videos, all of which the two
   existing tools can be extended into rather than replaced.

Ideas worth trying on what is already built:

- **Per-cabinet audio in the reel.** Give each clip one second of that cabinet's
  *own* theme instead of one continuous track. Nine keys and nine tempos colliding
  on the cut is jarring — which is arguably the joke, for a game stitched together
  from parts of other games. Needs nine `renderBank` calls and a sample-accurate
  concatenation.
- **A 9:16 cut of the reel** for Reels/Stories: `--size=1080x1920 --band=360`.
