# M8TRX controls — what each one does, and what it acts on

Every control in the M8TRX panel, grouped by where it lives, with the thing it changes
named explicitly. The last section lists the names that changed and why.

**Four scopes**, and almost every confusion in the panel used to come from mixing them up:

| Scope | Means | Where it lives |
| --- | --- | --- |
| **Selection** | The slices currently held — one, a run, or a whole part. | The two Selection rails |
| **Part** | One row of the timeline: a named section (A · Verse). Resolved from whichever part the selection sits in. | The Part rail |
| **Arrangement** | The whole recipe — every part, the output length. | The Arrangement band |
| **Next Generate** | Changes nothing now. Sets what the *next* press of **Go** will build. | The Generate band |

**A control's band is its scope.** The chrome is five bands stacked in a fixed order, each
with a 212px rail down its right naming the scope and — on the three that act now — the live
subject a press would hit ("2 slices in B · Verse", "all of B", "nothing held", "no part").
A control's vertical position is therefore the answer to "what does this touch", and the
meaning of a row never changes under you.

**Dashed means it waits.** Solid border = acts the moment you press it. Dashed border (plus
a `⌁` where it needs saying twice) = nothing happens until the next **Go**. Every control in
the Generate band is dashed.

**Scope is never carried by colour.** Four scope hues would collide with four of the five
fixed part-role hues, so the rails say it in words and the accent stays reserved for
*on / selected / moving*.

**An empty rail says what to click.** A rail whose scope holds nothing shows one line of
instruction at the same height instead of thirty greyed-out controls — the height is fixed
either way, so the timeline never moves under a pointer heading for a slice.

Nothing in this panel ever changes the song. M8TRX is a performance layer over it.

**Parts are no longer all four bars.** **Form** decides how long each part is: several
grammars use eight- and sixteen-bar parts, and *This song's own* uses whatever lengths the
song actually has. Anything below that reads "four bars" as a fixed quantity is describing
behaviour that has changed. Chord walks follow — any part of four bars or more can carry
one, at one chord per bar.

**Transport is the desk's own.** M8TRX has no Play or Stop of its own: the desk's ▶ and ■
work while a recipe is armed, and **start-from-the-beginning** plays the recipe from its
top with the four-beat count-in. **Undo is borrowed the same way**: while a recipe is live
the desk's Undo becomes `Undo M8TRX` and drives M8TRX's stack, exactly as the loop button
becomes Recipe Once / Recipe Loop. The two histories never merge.

---

## The Generate band — everything deferred, everything dashed

| Control | Scope | What it does |
| --- | --- | --- |
| **Grain** | Next Generate | How finely the song is cut: Phrases ▸ Bars ▸ Groove ▸ Beats ▸ Shards. The two ENDS are hard limits rather than leanings — at the bottom nothing shorter than a bar is emitted, at the top nothing longer — and the middle interpolates between them. Greys out while a named **Style** is set in Advanced, because then it is not deciding anything. |
| **Mood** slider | Next Generate | Dark ↔ euphoric, and the only dial that touches harmony. See the four dials below. |
| **Hypnosis** slider | Next Generate | Collage ↔ locked loop: how much the song repeats itself. |
| **Chaos** slider | Next Generate | Tame ↔ feral: how far from the safest answer a choice may land. |
| **Drive** slider | Next Generate | Chill ↔ peak-time: energy, fills, chord pace, and the Auto kit. |
| **New length** | Next Generate | Output length as a multiple of the song: half, three quarters, original, five quarters, one and a half. |
| **Drums** | Arrangement, now — except **Auto** | What the drums do for the whole recipe. Chopped (cut with everything else), Song groove (the song's own kit at the output clock), or one of nine generated kits: Steady 4/4, Half-time, Breakbeat, Boom bap, Two-step, Disco, House, Deep house, Techno. **Auto · Drive** is the exception and is *next Generate*: it lets the Drive dial pick the kit, and the option names what it will build (`Auto → House`). |
| **🎲** (left of Generate) | Arrangement, now | Lucky dip: rolls all four dials somewhere musical, rolls a fresh seed, and generates. The dials move to what was rolled, so a happy accident can be kept and tweaked. Ignores the seed pin for its own roll without releasing it. |
| **Generate** | Arrangement, now | Builds a new recipe, replacing the current one. Locked parts and clips survive into it. While playing, it lands at the next bar. |
| **📌** (right of Generate) | Next Generate | Holds the current recipe's seed, so Generate reshapes *this* arrangement as the dials move instead of rolling an unrelated one. Without it every Generate rolls a new seed, and a dial moved between two of them tells you nothing. The status line reads `seed N held`. Clears on song switch. |
| **Lock what’s playing** | Part | Locks whichever part is sounding right now, so the next Generate keeps it verbatim. |
| **Save M8TRX version** | Persistence | Stores the recipe, the settings that built it, **and locks/shelf/unique-letter opt-outs**, in the song file for the Mixer only. Never becomes a game alternate. Reopening the panel restores all of it, so the next tweak starts exactly where you left off. |
| **Save JSON… / Load JSON…** | Persistence | A small instructions file — no audio, no notes — that also carries locks and the shelf. Load never auto-plays. A malformed shelf entry in a hand-edited file is dropped rather than breaking the load; the toast says how many. |
| **Return to Song** | Arrangement | Clears the recipe and gives the transport back to the normal song. |

### The four dials

Each is 0–100 and reads as a word. They replaced a single **Variation** slider that was
quietly doing all four jobs at once, which is why it never quite answered anything.

| Dial | Readings | What it actually moves |
| --- | --- | --- |
| **Mood** | Noir · Brooding · Bittersweet · Golden · Euphoric | The emotion, and all of the harmony. At the dark end a major song is re-read in its **relative minor**, at the bright end a minor song in its relative major — the same seven notes with a different home, so the riff still lands on scale tones. It also picks the chord palette (dark → house → pop → edm → anthem), how much of the loop moves, and which way a chromatic lift leans. A key you name yourself is never re-read. |
| **Hypnosis** | Scatter · Restless · Woven · Circling · Trance | How much the song repeats itself: returning motifs, A/B pairs, single-loop parts, repeat counts. High settings build a part from fewer pieces and come back to each more often. |
| **Chaos** | Tame · Playful · Frisky · Unruly · Feral | How far from the safest answer a choice may land: how deep into the ranked candidates a slice comes from, how often a part takes a chromatic lift, and how wild the fills get. It does *not* chop the song into more pieces — that is Hypnosis. |
| **Drive** | Ambient · Cruise · Rolling · Charged · Peak-time | Energy: how dense the material each part aims for, how often a part ends with a fill, how fast the chords move, and which kit **Drums: Auto** picks. |

The centre of every dial is the behaviour the panel had before they existed, so a fresh
panel sounds like it always did.

### Three dice, three scopes

| Where | Scope | Rolls |
| --- | --- | --- |
| **🎲** beside Generate | Whole arrangement | The four dials *and* a new seed, then generates. Everything changes. |
| **🎲** on a part card | That part | Rebuilds it from scratch — new material and a new chop — inside its existing span. The song's form stays put. |
| **🎲** beside Walk, in the toolbar | Selected part | Its chord order only. The material is not touched. |

They are deliberately the same icon: each one means "roll me something else", and what
gets rolled is whatever the dice is sitting next to.

One thing worth knowing about the part dice: **a part that walks chords is one repeated
cell by contract** — that is the club shape Generate builds, and the dice does not
overrule it. So on a song with a detected key, rolling a Verse or Chorus gives new
material under the same chords rather than a new chop. Where the chop is free — Intro and
Outro, or any part on a song set to **Key: None · chromatic** — it comes back genuinely
re-cut, as a pair, a loop or a collage. Measured over 12 rolls of a free part: 10
different takes, 6 different chops.

### The rest of the Generate band

These decide what **Go** builds. None of them changes what is currently on the timeline.
They used to live in an "Advanced" block on the far side of the header; Advanced is gone as
a concept, because these three were only advanced in the sense of having nowhere to sit.
It once held Chord loop, Walk and Chord pace as well — Mood and Drive decide all three now,
and a select asking the same question again would have been a second dial quietly overruling
the first.

| Control | What it sets |
| --- | --- |
| **Form** | The overall shape Go builds — how many parts, how long each is, and which of them come back. **Song** is the familiar Intro/Verse/Chorus roadmap in four-bar parts. **This song's own** reads the roadmap off the material instead, with the song's real part lengths and its real repeats. **Dance** builds and drops, with no verse or chorus. **Loop** is one idea that grows and falls away. **AABA** states an idea twice, contrasts, and returns. **Arch** holds the hook back for a bigger payoff. |
| **Style** | An exact override for **Grain**, and Auto — the default — simply follows the dial. Naming one is a *promise* about cut sizes rather than a leaning: Phrase takes whole one to four-bar phrases, Groove bars and half-bars, Chop beats, and Mix gives each repeated letter its own stable identity. This is the one thing a dial cannot do, which is why it survives. |
| **Key** | The key walks move within. **Detected** trusts the analysis (marked `?` when the song does not settle) and is what Mood re-reads; naming one yourself overrules both. The readout beside it shows the key Go will *actually* walk in, marked `· Mood` when the dial moved it. **None · chromatic** turns the chord walks off entirely. |
| **Fill new sections** | Whether the sections **Go builds** get an end-of-part fill, and which shape. Auto's rate follows Drive — roughly one part in three at the centre — and can always come out as no fill at all. The Part rail's **Fill this ending** is the one that acts on the part in hand, now. |
| **Transpose** | How adventurous generated chromatic lifts are. Off means the generator adds none. Live only when **Key** is *None · chromatic*: with a key in play the harmony belongs to Mood, and the dial says so rather than sitting there looking adjustable. |

## The Arrangement band — the whole recipe, and the song it never touches

| Control | Scope | What it does |
| --- | --- | --- |
| **M8TRX drums** | Arrangement (except **Auto**) | See the table above. |
| **Clear locks & shelf** | Arrangement | Empties every lock, everything on the shelf, and every repeated-letter opt-out — a start from scratch for the next Go without leaving M8TRX or discarding the recipe on the timeline. Disabled when there is nothing to clear. |
| **Lock what's playing** | Part | Locks whichever part is sounding right now, so the next Go keeps it verbatim. |
| **Save version / Save JSON… / Load JSON…** | Persistence | See the table above. |
| **Return to Song** | Arrangement | Clears the recipe and gives the transport back to the normal song. |
| **?** | — | The three paragraphs explaining what M8TRX is, how to read the timeline and how to select. A top-layer popover, so nothing on the desk can clip it. |
| **×** | Transport | Closes the panel. The recipe stays armed. |

There is **no Undo button here.** While a recipe is live the desk's own Undo becomes
`Undo M8TRX` and drives M8TRX's 40-deep stack; the desk's mix and arrangement history waits
untouched and comes back on Return to Song.

## Selection · material — what the held slices are made of

The rail names what is held. With nothing held the row reads "Click a slice in the timeline
to change what it is made of."

| Control | Scope | What it does |
| --- | --- | --- |
| **Clear** | Selection | Lets go of everything currently held. |
| **Play from here** | Transport | Plays from the start of the selection. |
| **🎲 Reroll material** | Selection | New source material for the selected slices; lengths and positions stay. |
| **Pitch** | Selection | Shifts the selected slices by a fixed interval, −12 to +12. Disabled while they carry a chord walk. |
| **Chord** | Selection | Sets what chord the selected slices play — any degree of the key, or As written. This is the slice-by-slice override of a part's walk. |
| **Stutter…** | Selection | Retriggers each slice's opening fragment across its own time: ×2, ×4, ×8, or Gallop / Ramp / Build. Options that will not divide the selection are greyed. |
| **Repeat + / −** | Selection | One more or one fewer pass. Changes the song's length. |

## Selection · arrangement — what they are, and where they sit

With nothing held: "Click a slice to move, join, split or delete it."

| Control | Scope | What it does |
| --- | --- | --- |
| **Copy** | Selection | Copies the selected slices — one, a run, or a whole part. |
| **Paste** | Selection | Puts the copy over the selected slices, fitted to the time they take: longer material is cut, shorter leaves the rest silent. The song's length never changes. |
| **Mute / Unmute** | Selection | Stops the slices sounding without removing them. Time is still taken; the material comes back. |
| **Join** | Selection | The opposite of Split: the first of a contiguous run grows to cover the whole run, the rest go. Also how a stuttered run becomes one slice again. |
| **Split** | Selection | Interleaves each slice's two halves — A B A B, same length. |
| **Separate passes** | Selection | Turns a compact repeated slice into separately selectable passes. |
| **Borrow neighbours** | Selection | Swaps the slices for the material either side of them, keeping the exact length. |
| **Loop a neighbour** | Selection | Removes the slices and loops one nearby motif through their whole span. |
| **To shelf ⌁** | Next Generate | Saves the selected slices to the session shelf for reuse at the next Go. Dashed: the shelf changes nothing until then. |
| **Delete slices** | Selection | Removes the slices. The song gets shorter. |

## The Part rail — the whole part in hand

Tinted, because its subject is a different kind of thing from the two rails above it. With
no part held: "Click a part card at the left of the timeline to hold the whole part."

| Control | Scope | What it does |
| --- | --- | --- |
| **Chord walk / Chord walk off** | Part | Puts a chord walk across the held slices, or takes it off exactly those. To walk a whole part, hold the part. |
| **Reroll walk** | Part | Rerolls the part's chord order without touching its material. |
| **Fill this ending** | Part | Adds a whole-band fill at **this** part's ending, now, or No fill to take one off. The Generate band's **Fill new sections** is the other one. |
| **Regenerate separately ⌁** | Next Generate | Stops this part's letter sharing a template with its twins, so the next Go builds it on its own. |
| **½ / ×2** | Part | Halves or doubles the held part's output. Also on the part card, which is how you reach a part you are not holding. |
| **Delete part** | Part | Removes the part entirely. The song gets shorter by what it was taking. |

## Part card — the left cap of each row

| Control | Scope | What it does |
| --- | --- | --- |
| Letter · name (e.g. **B · Verse**) | Transport | Plays from the start of this part. |
| Click the card | Part | Holds this part's slices — and only this part's. Picking another replaces it. The held part wears an accent bar down its left edge. |
| Double-click the card | Transport + Part | Plays from here and keeps the part held. |
| Drag the card | Arrangement | Reorders parts. Their internal edits travel with them. |
| **🔒 / 🔓** | Part | Locked parts are kept verbatim through the next Generate. |
| **🎲** | Part | Builds this part again from scratch — new material *and* a new chop, in exactly the space it already takes. So the song's form never moves and no other part is disturbed. It keeps the part's walk, its favourites and its fill. A locked part refuses. Acts on the card you clicked, whatever is selected; press again for another. |
| **½** | Part | Halves the part's length. The song gets shorter. |
| **×2** | Part | Doubles the part's length by playing its slices again. The song gets longer. The card then reads `· ×2` and each repeat's first slice carries a heavier left rule. |
| **To shelf** | Part | Saves the whole part to the session shelf. |
| Right-click the card | Part | Everything a whole part can be told to do, written out in words — play from here, hold it, rebuild it, lock it, ½ and ×2, walk, fill, copy, paste, delete. The card carries no **⋯** button: the buttons above are the fast way, this is the legible one, and one menu reached one way is one menu to keep in step. |

**A letter can only ever have one clip.** Reassigning a clip onto a letter another clip
already holds refuses outright, with a toast naming the letter. A freshly saved clip that
would otherwise *inherit* a taken letter — saving both of two Choruses to the shelf, which
both default to the same letter — is saved unassigned instead, with the same toast. Before
this, the second clip arrived on the shared letter silently: nothing in the shelf row said
so, and at the next Generate only the LAST clip on that letter was actually used — the
first one looked ready and quietly wasn't. There is no "pick the active one" control
because there is never more than one to pick between; the letter dropdown on each row is
how you move a clip onto a free letter.

## Slices — the blocks in each row

| Action | What it does |
| --- | --- |
| Click | Holds that slice alone. Clicking the only held slice lets it go. |
| Ctrl / Cmd / Shift-click | Adds or removes one slice from the selection. |
| Press and drag | Holds the run you drag across — across rows too. |
| Double-click | Plays from that slice, and keeps it held. While already playing this is a SEEK, not a restart: the bar being heard finishes and the jump lands on its line, with the destination pulsing until it arrives. |
| Right-click | Opens the slice menu at the pointer. Two one-press rows — **Transpose** (−5 −2 Off +2 +5) and **Chord** (as written, then every degree of the key, with the current one lit) — then Walk on/off, 🎲 Reroll this part's walk, 🎲 Reroll, Silence, Stutter ×4, Split, Join, Copy, Paste here, Delete, Play from here. Right-clicking a slice that is not held takes it first. |

What a block tells you without being clicked: its **colour** is the source material, so the
same colour anywhere in the song is the same piece returning; its **width** is the time it
takes, at one scale for the whole panel; **interior rules** divide it into its passes, and a **heavier left rule** means a part is
starting to say itself again; a
**roman numeral or interval** at the foot is its chord or its transpose; a **small square**
means it is part of a fill; **hatched and grey** means silenced.

## Transport bar

| Control | Scope | What it does |
| --- | --- | --- |
| **Recipe Loop / Recipe Once** | Arrangement | Whether a finished recipe starts again. Defaults to **Once**, so an arrangement plays through and stops. |

---

# Names that changed, and why

These were applied on 2026-08-16. Each was a rename only — same button, same behaviour —
except §5, which also removed a button. The old names are listed so a screenshot or an
older note still reads.

### 1. Three controls all sounded like "make these play something else"

**Make new**, **Replace material** and **Remove + loop pattern** all replaced what the
selected slices play, and nothing in their names said how they differ. They are,
respectively: roll new source for them; borrow the material either side of them; and loop
one nearby motif through their whole span.

> **Make new** → **Reroll** · **Replace material** → **Borrow neighbours** ·
> **Remove + loop pattern** → **Loop a neighbour**

### 2 & 3. "Make clip", the card's "Clip", and "Copy" all sounded like copying

Two of them were the same action at two scopes wearing two names, and the third was
something else entirely: the shelf is offered to the *next Generate*, while Copy is a
clipboard for *pasting now*.

> **Make clip** and the card's **Clip** → **To shelf**, both of them. **Copy** keeps its
> name and now means only the immediate one.

### 4. "Make unique" said nothing about what it does

It stops a repeated letter sharing a template with its twins on the next Generate. Nobody
would guess that.

> **Make unique** → **Regenerate separately**

### 5. "Grab" appeared twice and meant two different things

The header's **Grab heard section** locked whatever was sounding. The card's **Grab**
locked that card — but only if it happened to be the one sounding, so on any card you
were actually looking at it usually did nothing and said so in a toast.

> **Grab heard section** → **Lock what's playing**, and the card's **Grab** is GONE. The
> lock beside it already did that job with no condition attached. This is the one change
> in this list that is not purely a rename.

### 6. "Part" and "Section" were the same thing under two words

The toolbar said **Part → Fill…** and **Delete part**; Advanced said **Section fill**; the
code and handover say section throughout.

> Advanced's **Section fill** → **Fill on Generate**, which also ends two controls called
> Fill doing different things — one acts now, one only affects the next Generate. The code
> still says section internally; the UI says part.

### 7. Smaller ones

- **Split halves** → **Split**. It only ever makes halves.
- **Unroll repeats** → **Separate passes**. "Unroll" is a programmer's word.
- **Length** → **New length**: it sat among controls that act immediately but only
  affects the next Generate.

Toasts moved with the buttons, so an edit reports itself in the same words the button
used: "Rerolled material", "Borrowed from the neighbours", "Looped a neighbour",
"Separated passes", "Split".

---

## Names that changed with the rails layout — 2026-08-16

Every one of these makes a control **name its own scope**, which is what the five bands are
for. Labels only: every element id, handler and JSON key is unchanged, so saved recipes and
the layout contract are unaffected.

| Was | Now | Why |
| --- | --- | --- |
| **Generate** (button) | **Go ▸** | The band is called Generate. A band and its primary button sharing one word meant "Generate" named both a place and a press. |
| **Fill on Generate** | **Fill new sections** | Named for what it acts on — only the sections Go builds — instead of for when it happens. |
| **Part → Fill…** | **Fill this ending** | Its twin. Two bands apart and no longer readable as the same control. |
| **Walk** | **Chord walk** | It was already called a chord walk everywhere except on the button. |
| **🎲** (beside Walk) | **Reroll walk** | A die next to the header's die read as the same roll. Now a word. |
| **Reroll** | **🎲 Reroll material** | Says what it rolls: the material, not the timing or the part. |
| **Delete selected** | **Delete slices** | "Selected" is the scope, and the rail already states it. |
| **Silence / Unsilence** | **Mute / Unmute** | The code has called it mute since it was written — `op.mute`, `data-mute`, the `mute`/`unmute` transforms — and the button was the only place using a second word for the same thing. |
| **Save M8TRX version** | **Save version** | It is in the M8TRX panel. |
| **To shelf**, **Regenerate separately** | **To shelf ⌁**, **Regenerate separately ⌁** | Both act on something now but only take effect at the next Go, so they carry the deferred mark as well as the dashed border. |
| **Undo M8TRX** (panel button) | *removed* | The desk's Undo becomes `Undo M8TRX` while a recipe is live, the same way the loop button becomes Recipe Once / Recipe Loop. The stacks stay separate. |
| **Advanced** (header block) | *removed* | Key, Fill new sections and Transpose moved into the Generate band beside the dials they modify. |
| The three-paragraph blurb | behind **?** | A first-run explanation, not a permanent wall of 11px prose. |

The slice context menu moved with them: it had drifted furthest, still saying "Make new"
and "Split halves" after those names were retired.

### A second pass, the same day

| Was | Now | Why |
| --- | --- | --- |
| `Style` — four segmented buttons, then a four-stop dial | **`Grain`**, a real dial — and Style demoted to an exact override in Advanced | Style was four named boxes sitting on a dial's track, and its fourth box, `Mix`, existed only to say *do not commit to one of these* — a control admitting it should not have been boxes. How finely a song is cut is a continuum, so Grain runs it. The objection to a dial is real and is answered rather than waved away: naming a cut size is worth doing because you can RELY on it, so Grain's two ends stay hard gates and Style stays reachable for an exact promise. Auto is its default, so the two can never state contradictory intents. |
| every part exactly four bars | **`Form`**, in Advanced | The generator knew one macro shape — the Intro/Verse/Chorus ladder — stretched to any length, every part four bars. Measured across the imported catalogue only 29% of real parts are four bars long; 13, 14, 16 and 22 are ordinary. Form offers five written shapes and, more usefully, *This song's own*, read off the material. |
| `📌 Hold seed` | **`📌 Vary this one`** | "Seed" is the number a roll starts from, which is an implementation detail. What the button decides is what **Go** means: a *variation* of the arrangement in front of you (same roll, reshaped by the dials) or a completely different one. Lucky dip is always fresh either way. |
| `Key`, `Fill new sections`, `New length`, `Transpose` | behind an **`Advanced ⌄`** popup | The four reached for least, and between them half the width of the band. The button **counts whatever is off its default** — `Advanced · 2 set` — so a popup can never hide a setting the next Go will read. |
| Panel `?` and `×` | the desk's **`?`**; no close button | The `?` is the third control the desk lends M8TRX, after `Undo M8TRX` and `Recipe Once / Loop`, and it opens a fuller explanation than the old three paragraphs. The M8TRX button in the toolbar is the way in and the way out. |
| Card `🚶` and `⌁` | **`W`** and **`F`**, lit when on | At 24px a pictogram is a rebus you re-solve every glance, and a walking figure for "moves around the key" is a pun rather than an icon. |
| Panel floating over the mixer | **edge to edge**, between header and status bar | A strip of channel strips down one side is the desk saying "you are still in the mixer" while you read a timeline. Both edges are **measured**, not hardcoded: the header wraps to a second row at some widths, and the footer grows when M8TRX's own line joins it. |
| Chord line `i i \| iv \| v` | **`i ×2 ▸ iv ▸ v`** | Two failures at once. A pipe is what a bar line uses everywhere else on this desk, so the walk read as three bars rather than one progression — hence the arrow. And two bars of the tonic written out as `i i` reads as **`ii`**, the supertonic: a *different chord*, not a near miss. A held chord is counted now. |
