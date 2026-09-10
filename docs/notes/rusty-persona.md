# RUSTY, FOCUS-TESTED — Persona

The red panda speedster. This is the record of the swap and the brief that
still needs writing.

**He is cast** (10 Sep 2026). He took slot 2 in `HEROES` — the speedster slot —
from Gnash the Needlemouse, who is not deleted: `TOON_SPECS.gnash` and
`HERO_SPRITES.gnash` stay live so he can come back as an NPC.

## What is his, and what is on loan

His: the look (`TOON_SPECS.rusty`, `HERO_SPRITES.rusty`), the ability, the
numbers of the slot (speed 1.15, jump 1.05, the MOMENTUM GUY mastery).

**On loan from Gnash, deliberately, until his own writing exists:** the tagline
("ALREADY THERE. WAITING."), the tag-in line ("FINALLY."), the running joke
(arrives too early and waits for reality to catch up), every exit line and hub
line, the authored hand-offs with Lorenzo and Fernwick, and the credits gag
("Credited as Already Left"). In `jokes.js` his `EXIT_LINES` and `HUB_LINES`
entries are getters that return Gnash's arrays, so the loan is one line to
revoke per table. When his own lines are written, replace those getters and
the strings on his `HEROES` row, and update `docs/GAME_BIBLE.md`, `docs/CAST.md`,
`docs/SCRIPT.md` and `docs/gameplay-messages.md`.

## The look

Twenty-seven bake-off rounds, all recorded in `src/dev/hero-candidates.js`
(the `PANDA_*` and `RUSTY_*` candidate lists and the notes on `RUSTY_W3B`): the
red panda head with the cream mask and tufted cheeks, pointed ears at 1.15,
the bushy ringed tail, snap limbs with gloves, runner flats, and the tilted
pouch on the left hip carrying two staggered bamboo canes. `RUSTY_W3B` in that
file is now an alias of the shipped spec and exists only so the gallery's lab
sections and the round notes still read.

## The ability — BAMBOO SHOOT

`ability.type: 'toss'`, cooldown 3.2s. Nothing leaves on the press: he reaches
to the pouch, pulls a cane and whips it forward (the `bundle` throw gesture in
`drawHumanoid`, 0.3s), and the cane leaves at `RANGED_RELEASE_AT.toss` of that
window. It flies the returning-axe cycle in `run.js` (`type: 'axe'`,
`art: 'bamboo'`): out, a short hover, home to the pouch. Ranged, so he is dealt
card boxes on the rhythm charts like every other thrower.

The pouch is stateful. `player.stickParity` flips on every press; the
projectile carries `caneParity` and is drawn at `caneScale(parity)`, so the
long and the short cane alternate and the one in the air is the one he pulled.
While it is out, `player.axeThrown` empties that slot on the sprite.

Audio: no baked launch or contact cue yet — `playLaunch` falls back to the axe
ring pitched up (1.12), and contact falls to the generic crash. Rendering his
own cane cues is open.
