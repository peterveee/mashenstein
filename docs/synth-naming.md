# Synth suite naming

A decision record for what the instruments are called: what is settled, what is still
open, and every rejected candidate with the reason it was rejected.

**The system is decided, by shipping rather than by argument.** Four names are in code —
`MRDR-3` (Moroder), `CRLS-1` (Wendy Carlos), `TNGR-2` (Tangerine Dream), `KLNG8` (Kling
Klang) — and all four are pioneer or studio homages. That is System A. System B, the
horror lexicon, is kept at the bottom of this document because its reasoning is still
worth reading, but it is closed: a lineup that is half lore quiz and half horror joke
reads as neither, and the half already shipped is the lore quiz.

Settled 2026-08-21: **`KNDO-5`** for `GameSynth` — Koji Kondo. See *The gaming-legend
lane*. Settled the same day: **`RMND-2`** for the merged `FMSynth`/`AMSynth` — Raymond
Scott. See *The AM/FM merge*.

---

## The formula

Every instrument is `[4-LETTER CODE]-[SPEC NUMBER]`.

**The code** is four letters. Not three. It is a consonant-stripped homage to a pioneer
or a studio that defined that style of synthesis. Vowels survive where the code lands on
a real word — `TANK`, `CAGE`, `BODE` — which is the tiebreaker described under *System C*.

**The number** is a real architectural constraint read off the engine — oscillators per
voice, drawbars, waveforms, generators. It is not a version and not a serial. This is the
rule that does the work: the moment a number is chosen because it sounds good, every other
number becomes decoration too.

The original draft broke both rules. `TMT` and `APX` are three letters, and `APX-4`
claimed four FM operators the engine does not have.

**Amended 2026-08-21.** The formula used to read *"favouring producer lore over the
obvious pick"* — a clause written to justify `TANK-5` over `KNDO-5`, and one that a
decision then went against. Lore is a tiebreaker between equally good homages, not a
reason to reject the name most people would recognise. The clause is struck rather than
quietly bent, because a formula that bends for one name was never a formula.

---

## The verified roster

**Seven architectures ship today** — down from twelve, because four rounds of
consolidation removed engines rather than renaming them:

- `Synth` and `MonoSynth` merged into **`CRLS-1`**. They are the same oscillator into the
  same envelope, with a filter between them or not, so one engine with a filter switch is
  an honest description rather than a simplification (`src/engine/voices.js:1698`).
- `MembraneSynth` and `MetalSynth` retired into **`KLNG8`**: a pitch drop into a body is
  its `osc` section and six inharmonic squares are its `metal` section — the same two
  circuits with their numbers exposed instead of welded shut
  (`src/data/voices.js:1070`).
- `FMSynth` and `AMSynth` merged into **`RMND-2`**. Same carrier, same modulator, same
  two envelopes, differing only in which parameter of the carrier the modulator reaches —
  so one engine with a destination switch is an honest description rather than a
  simplification (`src/engine/voices.js`, `RMND2`).
- `DuoSynth` retired into **`MRDR-3`**. Two Tone MonoSynths under a shared vibrato is
  two MRDR-3 layers, and the eleven presets are now two-layer patches measured against the
  originals. The only rename whose PARAMETERS had to move as well as its name — see
  `duoCopyAsLayer` in `src/data/voices.js`, beside the alias.
- `kind: 'noise'` retired into **`KLNG8`** as well; there are zero noise presets left.
  `NoiseSynth` was never offered — `Tone.Noise` fills its buffer from `Math.random` at
  construction, so stems would stop summing to the mix.

Every spec number below was read off the code and the citations are here so they stay
auditable when the engine changes.

| Engine (`synth:` in `src/data/voices.js`) | Presets | Spec | Name | Architecture |
| --- | --- | --- | --- | --- |
| `MRDR-3` (`_playLayer`) | 80 | **3** | settled | 3 layers + filter |
| `CRLS-1` (`Tone.Synth` / `Tone.MonoSynth`) | 59 | **1** | settled | 1 osc + envelope, filter optional |
| `TNGR-2` (`_playTngr2Node`) | 43 | **2** | settled | 2 wavetable oscillators |
| `kind: 'drum'` (`_playDrum`) | 29 | **8** † | settled, number open | 5 generators — osc, noise, ring, metal, knock |
| `RMND-2` (`Tone.FMSynth` / `Tone.AMSynth`) | 42 | **2** | settled | carrier + modulator, reaching pitch or level |
| `KNDO-5` (`_playGame`) | 8 | **5** | settled | 4 waveforms + the noise channel |
| `WNDR-9` (`_playAdditive`) | 8 | **9** | settled | 9 drawbars |

Where the numbers come from:

- `SYNTHS` in `src/engine/voices.js`, the allowlist. `RMND-2`'s two classes are
  literal Tone classes, so Tone's architecture is ours, and Tone's
  `FMSynth` is a carrier and one modulator: **FM here is 2-operator.** Amplitude
  modulation is the same two oscillators, so the `-2` reads the same either way — which
  is why the merge did not have to renegotiate the number.
- `src/engine/tngr2/dsp.js:571` — `[p.oscA, p.oscB]`. Two, and only ever two.
- `src/engine/voices.js:210` — `NATIVE_WAVES`, four waveforms, plus the pitched-noise
  channel in `_playGame` (`:3069`). That is the `-5`.
- `src/engine/voices.js:187` — the nine drawbars of a tonewheel organ, as ratios of the
  note. `:4735` — *"Nine bars reach the eighth harmonic."* `-9` is honest.
- `src/engine/voices.js:4365` — `_playDrum` reads `osc`, `noise`, `ring`, `metal` and
  `knock`. **Five** generators.

† **`KLNG8`'s number is the one that isn't measured**, and consolidation made that worse
rather than better: absorbing `MetalSynth` and the noise path grew the generator count to
five, not to eight. The `-8` describes a *planned* 8-pad product. Two ways out — ship the
eight pads and the number becomes true, or take **`KLNG-5`** for the five generators.
`-5` colliding with `KNDO-5` is fine; see the note on collisions.

`KLNG8` is also the one name that breaks the formula's punctuation: code and docs spell
it `KLNG8`, against `MRDR-3`, `CRLS-1` and `TNGR-2`. Whichever number it keeps, it should
take the hyphen with it, and that is the same edit.

---

## Settled: the gaming-legend lane

**`KNDO-5` — Koji Kondo.** The lane was chosen first — game-music legends rather than
studio-electronics pioneers, because `GameSynth` models chip music exactly as the other
engines model styles — and then the most recognisable name in that lane was taken.

The `-5` is four native waveforms plus the noise channel. The NES APU also had five
channels: honest first, nod second, which is the right order.

| Runner-up | Who | The case for it |
| --- | --- | --- |
| `FLLN-5` | Tim Follin | *Fallen.* Clears the word test that `MRDR` and `KLNG` clear, and the word is horror-shaped — the only candidate that is a chip legend **and** on-theme for a monster game |
| `TANK-5` | Hirokazu "Hip" Tanaka | *Tank.* A sound engineer who programmed the hardware at register level — Metroid, Kid Icarus, Game Boy Tetris. The apt lineage for a waveform-level engine; the previous recommendation here |
| `HBRD-5` | Rob Hubbard | *Hybrid.* The C64 SID legend — widens the reference pool past Nintendo |

Rejected: `MYMT-5` Miyamoto — the *designer*, not a composer · `TOTK-5` Totaka — now
reads as *Tears of the Kingdom* · `KSHR-5` Koshiro — Sega and FM, and FM belongs to the
FM slot · `UMTS-5` Uematsu — Square, and orchestral rather than chip · `MASH-5` — the
house name, which is System B reasoning inside a System A suite.

**The known risk, stated rather than discovered later:** *Kondo* reads Marie Kondo to
anyone outside game music, which is the same hazard that killed `CLRK-1` (*clerk*) and
`TOTK-5`. Stripping to `KNDO` puts a letter between the name and the association, and
recognisability inside the lane was judged worth it. Kondo is alive and works at Nintendo
— see *Living artists*.

**Renamed in code 2026-08-21**, the way `CRLS-1` was: the eight catalogue presets now
say `synth: 'KNDO-5'`, and `GameSynth` resolves onto it forever through `RENAMED` /
`synthFamily` (`src/engine/voices.js`). Ten song files carry the old name inside
serialised `voiceParams` and were deliberately left alone — a name is not worth a
migration, and the alias is what makes that true. The desk shows `KN5` on the strip,
beside `MR3`, `TN2`, `KL8` and `CR1`. The method is still `_playGame`, and
`docs/game-synth-klng8.md` still has its filename: neither is a user-facing name.

---

## Settled: the AM/FM merge

**`RMND-2` — Raymond Scott.** `FMSynth` and `AMSynth` are **one engine**, shipped
2026-08-21. They were already the same shape — a carrier and a modulator, differing in
which parameter the modulator reaches — so the merge is the `CRLS-1` argument again, with
the modulation destination as the switch rather than the filter.

**Which axis won: lore, on a trademark tiebreak.** `BODE-2` was the better architecture
answer and lost on the one axis that can cost something later — Bode Sound Company still
trades on the name, and Scott's is clean. The section below asked for this to be recorded
when it settled, because the next open slot will ask the same question, so: *when two
homages are close, the live-brand screen decides.*

**The number survives the merge untouched.** Both halves read `-2` today, and a carrier
plus a modulator is `-2` whichever parameter it lands on. The merge also drops the
three-way `-2` collision to a two-way one.

Peter's constraint on the name: **pre-1980 legends, nobody recent.**

| Candidate | Who | Why | Against |
| --- | --- | --- | --- |
| **BODE-2** | Harald Bode (1909–1987) | The one workbench that holds **both halves**: Bode built the Bode Ring Modulator *and* the Bode Frequency Shifter, plus the Melochord (1947) and the modular thinking Moog credited. Four letters with no stripping needed, and it lands on a word that **bodes ill** — a System C pass | **Bode Sound Company still trades on the name.** Smaller exposure than Aphex Systems, but the trademark rule as written excludes live audio brands, and this is one |
| **RMND-2** | Raymond Scott (1908–1994) | The other finalist, and the **lore** answer. Manhattan Research Inc. — a one-man lab of homemade machines, which is MASHENSTEIN's own premise. The Clavivox (1952), the Electronium, the Circle Machine, proto-ambient records in 1962. A pure consonant strip of a name he **constructed for himself**: he was born Harry Warnow, so compressing it is a continuation rather than a liberty. And the young **Bob Moog** built theremin subassemblies for the Clavivox — this is how the suite nods at Moog without using the trademark. No live gear brand on the name | Scott defined electronic music *production*, not carrier-and-modulator synthesis. The same objection that killed `TMT-9`: right pioneer, adjacent lineage. `SCTT-2` is the alternative strip and is worse — it takes the half of his name that reads as a common first name |
| `CHWN-2` | John Chowning | Invented FM at Stanford (1967) and licensed it to Yamaha. The preset weight is on the FM side, 32 against 10 | Silent on the AM half of a merged engine, and hard to say out loud |
| `CHOW-2` | John Chowning | The same homage, actually pronounceable, and a word | The word is *chow*; comic rather than menacing |
| `BRRN-2` | Louis & Bebe Barron | *Forbidden Planet* (1956), the first fully electronic film score, built from ring-modulated circuits that they let burn out. *Barren* — a System C pass | Silent on the FM half |
| `STKH-2` | Karlheinz Stockhausen | *Mixtur* (1964) ring-modulates an orchestra; *Mantra* (1970) ring-modulates two pianos. Impeccable and pre-1980 | Unsayable as a code, and Stockhausen is also live for the additive slot — one pioneer cannot hold two |
| `SALA-2` | Oskar Sala (1910–2002) | The Mixtur-Trautonium, and the birds in Hitchcock's *The Birds* (1963) — horror-adjacent and decades pre-1980 | The Trautonium is subharmonic mixture generation, not carrier-and-modulator. The `-2` would be a claim the architecture does not make |

### The number, and the crowding at `-2`

`-2` was worn by four engines — `TNGR-2`, `FMSynth`, `AMSynth`, `DuoSynth` — which was
enough to make the spec look like a default rather than a measurement. It is not, and the
fix was never to pick a rarer number: the rule is that the moment one number is chosen
because it reads better, every other number in the suite becomes decoration too.

**Option 1 is what happened.** The merge took the count from four to three, and
retiring `DuoSynth` into MRDR-3 took it to **two**: `TNGR-2` and `RMND-2`. The suite
reads `1 · 2 · 2 · 3 · 5 · 8 · 9` — one duplicate, which is
Juno-6-and-Juno-60 territory and well inside what this document already accepts. The
other two routes are kept because they are the only ways `RMND-2` ever becomes something
else:

1. **Let the retirements do it.** Done.
2. **Earn a different number by building one.** A merged modulation engine is the natural
   place to grow past a single modulator: carrier plus three operators is the classic
   4-op architecture, and `RMND-4` would then be measured rather than wished for. This is
   the same escape route `KLNG8` has — ship the eight pads and the number becomes true.
   It is a product decision, not a naming one, and it is the only way `-4` is ever
   available: `APX-4` was rejected for claiming exactly this without building it.
3. **Count the routings instead of the oscillators**, but only if they exist. If the
   merged engine really offers FM, AM, ring and sync as four selectable destinations,
   four is a countable constraint in the same way `KNDO-5`'s waveforms are. Two
   destinations counted as `-2` is the same answer by another road.

Until one of those is built, the merged engine is `-2`, because that is what it is.

*(An accident worth noticing and not chasing: the settled numbers so far run 1, 2, 3, 5,
8. That is Fibonacci, `-9` breaks it, and designing the last two numbers to preserve it
would be precisely the decoration this rule exists to prevent.)*

**How the merge is built.** The switch is the preset's own STRUCTURE, not a flag beside
it: `modulationIndex` is how far the modulator bends the carrier's FREQUENCY, and
amplitude modulation has no such number — `Tone.AMSynth` does not read one and could not
use it. So a preset carrying an index is bending frequency and a preset without one is
bending amplitude, and there is no way for a preset to disagree with itself. The
catalogue was already written that way, with nothing in between: all 32 FM presets
carried a top-level `modulationIndex` and all 10 AM presets carried none, so the merge
renamed and changed nothing else. `synthClassFor` reads that structure to pick the Tone
class (`src/engine/synth-families.js`, `src/engine/voices.js`).

On the panel it is one **MODE** pill, FM against AM, and the single control the two
destinations do not share — **FM DEPTH**, which was `INDEX` — greys rather than
disappearing, holding its value in `bypassed` so a round trip through AM returns the
number the preset was authored with. Simple omits that row instead of greying it, the
same split a filterless `CRLS-1` preset already makes with CUTOFF: Advanced is where a
disabled control still has the switch beside it to explain itself.

`FM DEPTH` is the name on **all three** FM cards — RMND-2's, MRDR-3's `Osc N · FM` and
KLNG-8's `FM` — because they are one control. `ENV AMT` was the first choice and was
struck: MRDR-3's filter card already carries `ENV AMOUNT` two cards away and KLNG-8's
oscillator carries `AMOUNT`, so it would have put a near-identical name for an unrelated
control on the same board.

Rejected outright: `BCHL-2` Buchla — the 258 and the 285 are FM and balanced modulation
in one cabinet, which is exactly right, but **Buchla USA is a live trademark**, the same
rule that killed `MOOG-1` · `RNGM-2` — names the technique, not a pioneer · `APX-4` —
three letters, an invented operator count, and it collides with **Aphex Systems** ·
`YMHA-2` — trademark · `RDJS-2` — unsayable · `AFXT-2` Aphex via his own *AFX* alias:
four letters and no company collision, but Richard D. James is very much not pre-1980.

`CHWN-2` and `BRRN-2` were what the two slots would have taken had the merge not
happened — each unambiguous about which half it homages, which is precisely the property
a merged engine cannot have, and precisely why neither could hold the merged one.

---

## Settled: the drawbar organ

Nine drawbars, and the engine says what it is out loud: *"At zero the partials are the
harmonic series and this is a Hammond"* (`src/engine/voices.js:4704`). The name cannot be
`HMND` — live trademark — so the slot needs someone who **played** the instrument or
someone who **invented** the technique, and those are two different lanes.

The architecture picks the lane. This path is not a pure additive laboratory: it is a
drawbar stack **through a driven amp and a chorus** (`src/engine/voices.js:4746`), with
`stretch` and `damp` on top. That is a combo organ on a stage, not a sine-tone study, so
the player lane fits the code better than the mathematician lane does.

**`WNDR-9` — Klaus Wunderlich** (1931–1997). Settled and renamed in code 2026-08-21:
the eight catalogue presets say `synth: 'WNDR-9'`, and `AdditiveSynth` resolves onto it
forever through `RENAMED` in `src/engine/synth-families.js`. The strip tag is `WN9`.

- **The credential is the drawbars themselves.** Wunderlich's whole art was registration
  — building orchestral voices out of a drawbar stack and multitracking them, across the
  *Hammond Pops* records and after them on Wersi. A nine-drawbar engine named after the
  man who treated nine drawbars as an orchestra is the homage and the architecture landing
  on one fact, which is the test `CRLS-1` passed.
- **It lands on a word.** `WNDR` reads *wonder* immediately — a System C pass.
- **It rhymes with the suite's best name.** `MRDR-3` and `WNDR-9` are the same shape, four
  consonants over a hidden word, and *murder* and *wonder* are a pair. Nothing else in the
  document does that.
- **German**, alongside Kling Klang and Tangerine Dream, and dead since 1997 — no
  living-artist axis, no gear brand on the name (Wersi is the organ, not the man).
- The one thing to weigh: his sound is cheerful German easy-listening, not menace. In a
  comedy monster game that is arguably the joke rather than a mismatch, but it is the
  opposite temperature from `MRDR-3`.

| Alternate | Who | The case for it |
| --- | --- | --- |
| `LORD-9` | Jon Lord (1941–2012) | The rock Hammond — drawbars through an overdriven amp, which is **exactly** the chain this path builds. Zero stripping needed and a real word | Against: *lord* reads as a rank or a boast rather than a name |
| `HELM-9` | Hermann von Helmholtz (1821–1894) | The **father of additive synthesis** — *On the Sensations of Tone* (1863) proved timbre is a sum of harmonics, and he built resonators and driven tuning forks to add them back up. *Helm* is a word with armour in it | Against: a scientist in a suite of music-makers |
| `CHLL-9` | Thaddeus Cahill (1867–1934) | The deepest lore available: the **Telharmonium** (1897), the first electronic instrument, generated additive partials on rotating tonewheels — the Hammond's direct ancestor, thirty years early. Reads *chill* | Against: the code is a strip nobody will decode unaided |
| `AUGR-9` | Brian Auger (b. 1939) | A double word hit — an *auger* bores and an *augur* foretells — on a genuine Hammond legend | Against: living artist |
| `EMRS-9` | Keith Emerson (1944–2016) | The most violent Hammond player who ever lived, knives in the keys. A clean strip | Against: no word underneath |
| `RSST-9` | Jean-Claude Risset (1938–2016) | The previous recommendation. The Risset bell is the canonical additive spectrum, and `stretch`/`damp` together are literally how you build one here | Against: unsayable, and it is the mathematician lane |
| `SMTH-9` | Jimmy Smith (1928–2005) | *The* B-3 player, and *smith* is a word — someone who forges a thing out of parts | Against: reads as a surname placeholder |
| `BACH-9` | J. S. Bach | The Toccata and Fugue **is** the monster-movie organ, and *Bach* is four letters and a word (a brook) | Against: not an electronics pioneer at all, and next to `CRLS-1` it re-tells *Switched-On Bach* — an internal rhyme that may read as a muddle rather than a joke |
| `STKH-9` | Stockhausen | *Studie II* (1954) is additive in the strictest sense | Against: unsayable, and he is also live for the AM/FM slot — one pioneer cannot hold two |

**Struck.** `HMND-9` Hammond and `LSLE-9` Leslie — live trademarks (Suzuki), the same
rule as Moog and Linn; `HMND-9` was wrongly carried as an alternate in the first draft ·
`TMT-9` Tomita — three letters, and a subtractive Moog figure; wrong lineage ·
`FOUR-9` Fourier — the mathematics is right and the code self-destructs, because a
four-letter code that reads as a number sits next to a spec number · `ORAM-9` Daphne
Oram — Oramics is drawn waveforms, which is `TNGR-2`'s territory, not this one ·
`ORGN-9` organ — the standout of System B and the one name good enough to tempt a mixed
suite; kept in the System B table below rather than here.

---

## Open: the rest

| Slot | Recommended | Alternates | Rejected — why |
| --- | --- | --- | --- |
| `KLNG8` number | **decide `-8` or `KLNG-5`**, and take the hyphen either way | — | — |

**`DuoSynth` was never named, and is now retired — 2026-08-21.** Two MonoSynths under a
shared vibrato is what MRDR-3 does with two layers, so it was the suite's one redundant
engine and a name would only have made the redundancy permanent. `VNGL-2` — Vangelis,
whose CS-80 gave every voice two complete channels — is the name it would have had.
`JARR-2` Jarre was the alternate, and `OBRH-2` the near-miss worth recording: the
Oberheim **Two Voice** (1975) is a machine named for this exact architecture, and
Oberheim is a live trademark.

Measurement settled it rather than taste. No cabinet song used one — `0 of 34`, audited
in `work/local/duo-audit.mjs` — and the eleven presets are now MRDR-3 two-layer patches
whose audible spectrum matches the originals within 0.6 dB
(`work/local/duo-vs-mrdr3.mjs` renders both and compares). It is the one rename where the
parameters had to move as well as the name, so the `DuoSynth: MRDR3` alias has
`duoCopyAsLayer` beside it: harmonicity becomes cents of detune on layer two, Tone's
vibrato amount halves into semitones, and the 1600 Hz lowpass every Duo preset had
without asking for it is written down at last.

**`ORGN-9` remains the standout of either system.** *Organ* is both the pipe organ whose
nine drawbars the number refers to and a body part on a stitched-together monster: the
one name where the architecture, the reference, and the game's premise land on a single
word. It is System B, and System B is closed — recorded here because if any single name
is ever allowed to cross the line, it is this one.

---

## System C — the strict hybrid, and why it is a tiebreaker rather than a system

The strictest rule available: keep the pioneer homage, but accept only codes that also
land on a menacing word.

- **Passes:** `MRDR` (Moroder / murder) · `KLNG` (Kling Klang / klang) · `BODE` (Bode /
  bodes ill) · `BRRN` (Barron / barren) · `TANK` (Tanaka / tank) · `FLLN` (Follin /
  fallen) · `CAGE` (Cage / cage)
- **Fails:** `CRLS` · `TNGR` · `KNDO` · `CHWN` · `RSST`

Three of the four shipped names fail it, including two that shipped anyway. Not a system
— but the right **tiebreaker inside System A**: when two homages are equally good, take
the one that is also a word.

---

## System B — the horror lexicon (closed)

Kept for the record. It drops the pioneer conceit entirely and compresses monster-lab
vocabulary through the same formula, with no likeness exposure and no trademark screen.
It is closed because four System A names shipped, not because it was worse — it is the
stronger *brand* and the weaker *lore*.

| Slot | Recommended | Alternates | Rejected — why |
| --- | --- | --- | --- |
| `CRLS-1` slot | **PULS-1** pulse | `GRFT-1` graft · `VEIN-1` · `SPNE-1` spine · `CLNE-1` clone | `SKIN-1` — too soft · `LINE-1` — no menace |
| `TNGR-2` slot | **SHFT-2** shift | `WARP-2` · `GLSS-2` glass | `SCAN-2` — describes the mechanism |
| `FMSynth` -2 | **VOLT-2** | `JOLT-2` · `ARCC-2` arc | `SPRK-2` — reads like a startup |
| `AMSynth` -2 | **THRB-2** throb | `WARP-2` · `SHDR-2` shudder | `WAVE-2` — generic |
| `DuoSynth` -2 | **TWIN-2** twins | `GMNI-2` gemini · `PAIR-2` | `DUET-2` — pretty, not frightening |
| `AdditiveSynth` -9 | **ORGN-9** organ | `CRPT-9` crypt · `CHOR-9` choir | — |
| `GameSynth` -5 | **MASH-5** | `BLIP-5` · `GHST-5` · `PIXL-5` | `8BIT-5` — describes the format, not the feeling |
| drums -8 | **BONE-8** | `RIBS-8` · `SKUL-8` skull | `DRUM-8` — names the thing |
| retired: noise -0 | **STTC-0** static | `HSSS-0` hiss · `GHST-0` ghost | `NOIS-0` — names the thing and says nothing |

`MRDR-3` survives both systems unchanged — Moroder and murder — and is the reason System
B was ever worth considering.

**The one thing consolidation cost the suite.** `RSSL-0` (Russolo) and `STTC-0` were the
best numbers in either system: an instrument with **zero** oscillators is the proof that
the numbers were measured rather than chosen. The noise path is now a KLNG8 preset, so
there is no `-0` left to name and no argument that cheap again.

---

## Structural notes

**Four letters, enforced.** Either the rule holds or it is decoration.

**Spec numbers collide, and that is correct.** `RMND-2` and `TNGR-2` both want `-2`.
The number cannot be a unique identifier and should not
try to be: **the code is the identity, the number is a spec.** Roland shipped a Juno-6
and a Juno-60. Forcing uniqueness would mean lying about at least one architecture, which
destroys the only thing that gives the numbers meaning.

**Trademark screen.** Live audio brands are out: Moog, Linn, Yamaha, Sony, **Hammond**
and Leslie (Suzuki), **Buchla** (Buchla USA), and **Aphex Systems**, maker of the Aural
Exciter. That last one is the non-obvious hazard and the reason `APX` cannot ship on an
audio product; Richard D. James named himself after them, and we don't get to. **Bode
Sound Company** is the one that decided the AM/FM slot — smaller than any of the above,
and the only mark standing between `BODE-2` and the merged modulation engine, which is
why that engine ships as `RMND-2`.

**Living artists.** Kondo, Numan, Clarke, Jarre and James are alive; the Tangerine Dream
and Kling Klang marks are administered estates and companies rather than dormant.
Consonant-stripping is reasonable cover and homage naming is long-standing practice in
this industry, but it is a real risk axis and better named here than discovered later.

---

## The suite as it stands

```
settled
  MRDR-3   Moroder            3 layers + filter          80 presets
  CRLS-1   Wendy Carlos       1 osc, filter optional     59 presets
  TNGR-2   Tangerine Dream    2 wavetable oscillators    43 presets
  KLNG8    Kling Klang        5 generators — number open 29 presets
  RMND-2   Raymond Scott      carrier + modulator        42 presets
  KNDO-5   Koji Kondo         4 waveforms + noise         8 presets
  WNDR-9   Klaus Wunderlich   9 drawbars                  8 presets

retired, and readable forever through RENAMED
  Synth · MonoSynth -> CRLS-1     FMSynth · AMSynth -> RMND-2
  GameSynth -> KNDO-5             AdditiveSynth -> WNDR-9
  MembraneSynth · MetalSynth · kind:'noise' -> KLNG8
  DuoSynth -> MRDR-3              (the one that moved its parameters too)
```
