# Synth suite naming

A decision record for what the instruments are called. Two complete systems are laid out
below — every slot, every alternate, and every rejected candidate with the reason it was
rejected. Pick a system from it; don't mix them.

Only `MRDR-3` exists in code today (`_playLayer`, `src/engine/voices.js:1719`). Every
other name is still free, which is why this is worth settling now rather than after the
names are baked into presets, the mixer desk, and the plugin work in
`POTENTIAL-VST-AU-layer-synth-plan.md`.

---

## The formula

Every instrument is `[4-LETTER CODE]-[SPEC NUMBER]`.

**The code** is four letters. Not three. Under System A it is a consonant-stripped
homage to a pioneer who defined that style of synthesis, favouring producer lore over
the obvious pick. Under System B it is a word from the monster lab.

**The number** is a real architectural constraint read off the engine — oscillators per
voice, drawbars, operators, waveforms, drum channels. It is not a version and not a
serial. This is the rule that does the work: the moment a number is chosen because it
sounds good, every other number becomes decoration too.

The original draft broke both rules. `TMT` and `APX` are three letters, and `APX-4`
claims four FM operators the engine does not have.

---

## The verified roster

Eleven architectures ship today. Every spec number below was read off the code, and the
citations are here so they stay auditable when the engine changes.

| Engine (`synth:` in `src/data/voices.js`) | Presets | Spec | Architecture |
| --- | --- | --- | --- |
| `MonoSynth` | 39 | **1** | 1 osc + filter + 2 envelopes, mono |
| `FMSynth` | 32 | **2** | 2-op FM — carrier + modulator |
| `MembraneSynth` | 20 | **1** | 1 osc + pitch envelope (kick) |
| `Synth` | 19 | **1** | 1 osc + amp envelope, no filter |
| `MetalSynth` | 19 | **6** | 6 inharmonic squares — the 808 cymbal circuit |
| noise (`kind: 'noise'`) | 12 | **0** | noise + filter + envelope — zero oscillators |
| `DuoSynth` | 11 | **2** | 2 MonoSynths + shared vibrato |
| `AMSynth` | 10 | **2** | 2 osc, amplitude modulation |
| `AdditiveSynth` | 8 | **9** | 9 drawbars |
| `GameSynth` | 8 | **5** | chip engine — sine/square/saw/triangle/noise |
| `_playDrum` (`kind: 'drum'`) | 5 | **5** † | 5 generators per voice — osc, noise, ring, metal, knock |
| `_playLayer` | 3 | **3** | 3 osc + filter — this is `MRDR-3` |

† **`KLNG-8`'s number is the one that isn't measured.** `_playDrum`
(`src/engine/voices.js:1223`) has no channel count — it builds a single drum voice from
up to five generators, and each preset is one voice. The `-8` describes a *planned*
8-pad product, not shipped code. That may well be the right call, but it is the same
species of claim `APX-4` was rejected for, and it should be made knowingly. Two ways out:
ship the eight pads and the number becomes true, or take **`KLNG-5`** for the five
generators. `-5` collides with `GameSynth`, which is fine — see the note on collisions.

Where the numbers come from:

- `src/engine/voices.js:452` — `FMSynth: Tone.FMSynth`. These are literal Tone classes,
  so Tone's architecture is ours. Tone's `FMSynth` is a carrier and one modulator:
  **FM here is 2-operator.**
- `src/engine/voices.js:1523` — *"Nine bars reach the eighth harmonic."* `-9` is honest.
- `src/engine/voices.js:1437` — *"Six squares at inharmonic ratios through a highpass:
  the 808's cymbal circuit."* `-6` is honest.
- `src/engine/voices.js:104` — `NATIVE_WAVES`, four waveforms, plus the noise path at
  `:766`. That is the `-5`.
- `src/engine/voices.js:1495` — *"partials are the harmonic series and this is a
  Hammond."* The code is already arguing for `HMND-9`.

---

## System A — pioneer homage

The original conceit, corrected. Each row gives the recommendation, the alternates still
in play, and what was thrown out.

| Slot | Recommended | Alternates | Rejected — why |
| --- | --- | --- | --- |
| `Synth` -1 | **NMAN-1** Gary Numan | `VCLK-1` Clarke, spelling fixed · `DLIA-1` Delia Derbyshire · `WLDR-1` Alan Wilder | `CLRK-1` — reads *clerk* · `YAZO-1` — a band, and reads like a brand |
| `MonoSynth` -1 | **CRLS-1** Wendy Carlos | `KKMT-1` Kikumoto, TB-303/909 · `HNCK-1` Hancock | `MOOG-1` — live trademark · `SH01-1` — a model number, not a homage |
| `DuoSynth` -2 | **JARR-2** Jean-Michel Jarre | `EMRS-2` Keith Emerson · `VNGL-2` Vangelis | `WKMN-2` Wakeman — reads *Walkman*; Sony |
| `FMSynth` -2 | **CHWN-2** John Chowning | `AFXT-2` — Aphex via his own *AFX* alias: four letters, no company collision | `APX-4` — three letters, invented op count, and collides with Aphex Systems · `RDJS-2` — unsayable · `YMHA-2` — trademark |
| `AMSynth` -2 | **BRRN-2** Louis & Bebe Barron | `STKH-2` Stockhausen, *Mantra*/*Mixtur* ring mod | `RNGM-2` — names the technique, not a pioneer |
| `MetalSynth` -6 | **CAGE-6** John Cage | `RSST-6` — the Risset bell is the canonical inharmonic spectrum | `RSST-6` **if** Risset takes the additive slot; one pioneer can't hold two |
| `MembraneSynth` -1 | folds into **KLNG-8** | `KKHS-1` Kakehashi, if ever standalone | `LINN-1` — LinnDrum is a shipping product |
| noise -0 | **RSSL-0** Luigi Russolo | `XNKS-0` Xenakis, stochastic noise clouds | `SCHF-0` Schaeffer — unpronounceable even by this suite's standards |
| `AdditiveSynth` -9 | **RSST-9** Jean-Claude Risset | `HMND-9` Hammond, which the code already calls it · `STKH-9` Stockhausen, *Studie II* · `SMTH-9` Jimmy Smith | `TMT-9` — three letters, and Tomita is a subtractive Moog figure; wrong lineage |
| `_playLayer` -3 | **MRDR-3** Moroder — keep | `VNGL-3` Vangelis CS-80 · `JARR-3` | nothing; it's the strongest name in the set |
| `GameSynth` -5 | **TANK-5** Hirokazu "Hip" Tanaka | `KNDO-5` Koji Kondo — the famous one | `MYMT-5` Miyamoto — the *designer*, not a composer · `TOTK-5` Totaka — now reads as *Tears of the Kingdom* · `KSHR-5` Koshiro — Sega and FM, and FM is `CHWN`'s · `UMTS-5` Uematsu — Square, and orchestral rather than chip |
| drums -8 † | **KLNG-8** Kling Klang — keep | `KLNG-5` if the 8 pads never ship · `KKHS-8` Kakehashi · `DSSL-8` Düsseldorf · `KRFT-8` | `LINN-8` — trademark |

### Why the swaps

**`CRLS-1`** — *Switched-On Bach* was built one monophonic line at a time. That
constraint **is** MonoSynth; the homage and the architecture are the same fact.

**`JARR-2`** — two detuned oscillators under a shared vibrato is the *Oxygène* lead,
which is precisely and only what DuoSynth is.

**`RSSL-0`** — Russolo built the *intonarumori* in 1913, which makes him the origin of
noise as music rather than as a fault. And **`-0` is the best number in the suite**: an
instrument with zero oscillators is the proof that the numbers were measured, not
chosen.

**`CHWN-2`** — Chowning invented FM at Stanford and licensed it to Yamaha. Note the
`-2`. If the engine ever grows a 4-operator path the number moves; the name doesn't.

### Why `TANK-5` over `KNDO-5`

Koji Kondo is the right answer to "most famous Nintendo composer" — Mario and Zelda are
his. Hirokazu "Hip" Tanaka is the better homage for *this* engine:

1. **He built the chip, not just the tunes.** Tanaka was a sound engineer who programmed
   the hardware at register level — Metroid, Kid Icarus, Balloon Fight, Dr. Mario, Game
   Boy Tetris, EarthBound. `GameSynth` is a waveform-level chip engine, so the hardware
   engineer is the apt lineage. Kondo is a melodist.
2. **It lands on a word.** `TANK` clears the System C bar that otherwise only `MRDR`,
   `KLNG`, `CAGE`, and `BRRN` clear.
3. **The formula asks for it** — lore over the obvious pick, and Kondo is the obvious
   pick.

`KNDO-5` stays live. It is far more legible to anyone not deep in chip lore, which
matters if the suite is ever sold outside the game.

On the `-5`: four native waveforms plus the noise path. The NES APU also had five
channels — honest first, nod second, which is the right order.

---

## System B — the horror lexicon

Drops the pioneer conceit entirely and compresses monster-lab vocabulary through the
same formula. `MRDR-3` is the proof of concept: the codes land hardest when they hit a
real word with teeth. No likeness exposure, no trademark screen, and the suite belongs
to MASHENSTEIN rather than to a private joke.

| Slot | Recommended | Alternates | Rejected — why |
| --- | --- | --- | --- |
| `Synth` -1 | **GRFT-1** graft | `CLNE-1` clone · `SEAM-1` | `SKIN-1` — too soft for a stab synth |
| `MonoSynth` -1 | **PULS-1** pulse | `VEIN-1` · `SPNE-1` spine | `LINE-1` — no menace |
| `DuoSynth` -2 | **TWIN-2** twins | `GMNI-2` gemini · `PAIR-2` | `DUET-2` — pretty, not frightening |
| `FMSynth` -2 | **VOLT-2** | `JOLT-2` · `ARCC-2` arc | `SPRK-2` — reads like a startup |
| `AMSynth` -2 | **THRB-2** throb | `WARP-2` · `SHDR-2` shudder | `WAVE-2` — generic |
| `MetalSynth` -6 | **NAIL-6** | `TEET-6` teeth · `SCLP-6` scalpel · `CHNS-6` chains | `IRON-6` — flat |
| noise -0 | **STTC-0** static | `HSSS-0` hiss · `GHST-0` ghost | `NOIS-0` — names the thing and says nothing |
| `AdditiveSynth` -9 | **ORGN-9** organ | `CRPT-9` crypt · `CHOR-9` choir | — |
| `_playLayer` -3 | **MRDR-3** murder | — | — |
| `GameSynth` -5 | **MASH-5** | `BLIP-5` · `GHST-5` · `PIXL-5` | `8BIT-5` — describes the format, not the feeling |
| drums -8 † | **BONE-8** | `RIBS-8` · `SKUL-8` skull | `DRUM-8` — names the thing |

**`ORGN-9` is the standout of either system.** *Organ* is both the pipe organ whose nine
drawbars the number refers to and a body part on a stitched-together monster. It is the
only name in the exercise where the architecture, the reference, and the game's premise
land on one word.

**`MRDR-3` survives both systems unchanged** — Moroder and murder. It is the bridge
between them, and the reason System B is worth considering at all.

Under System B the house engine takes the house name. `MASH-5` inverts System A's
reasoning deliberately: there, `GameSynth` needs a homage to match its siblings; here, it
*is* the sound of the game and should say so.

---

## System C — the strict hybrid, and why it fails

The strictest rule available: keep the pioneer homage, but accept only codes that also
land on a menacing word.

- **Passes:** `MRDR` (Moroder / murder) · `KLNG` (Kling Klang / klang) · `CAGE` (Cage /
  cage) · `BRRN` (Barron / barren) · `TANK` (Tanaka / tank)
- **Fails:** `CHWN` · `RSST` · `CRLS` · `JARR` · `NMAN` · `RSSL`

Five of eleven. Not a system — but the right **tiebreaker inside System A**: when two
homages are equally good, take the one that is also a word.

---

## Structural notes

**Four letters, enforced.** `TMT` and `APX` are three. Either the rule holds or it is
decoration, and a formula that bends for two of five names was never a formula.

**Spec numbers collide, and that is correct.** Three engines want `-1` (`Synth`,
`MonoSynth`, `MembraneSynth`) and three want `-2` (`DuoSynth`, `FMSynth`, `AMSynth`).
The number cannot be a unique identifier, and it should not try to be: **the code is the
identity, the number is a spec.** Roland shipped a Juno-6 and a Juno-60. Forcing
uniqueness would mean lying about at least one architecture, which destroys the only
thing that gives the numbers meaning.

**Trademark screen.** Live audio brands are out: Moog, Linn, Yamaha, Sony — and **Aphex
Systems**, maker of the Aural Exciter and Big Bottom. That last one is the non-obvious
hazard and the reason `APX` cannot ship on an audio product. Richard D. James named
himself after them; we don't get to.

**Living artists.** Numan, Clarke, Jarre, and James are alive. Consonant-stripping is
reasonable cover and homage naming is long-standing practice in this industry, but it is
a real risk axis and better named here than discovered later.

**`GameSynth` gets a homage after all.** It models a style — chip music — exactly as the
other ten model styles. Exempting it would leave one instrument with no lore while every
sibling has some.

---

## Recommendation

The deciding question is not which names are better. It is:

> **System A** if the suite is sold as *gear* — a vintage-instrument line that happens to
> live in a game.
> **System B** if it is sold as *part of MASHENSTEIN*.

Pick one whole. A lineup that is half lore quiz and half horror joke reads as neither.

**System A refined**

```
MRDR-3   Moroder          3 osc + filter
NMAN-1   Gary Numan       1 osc, no filter
CRLS-1   Wendy Carlos     1 osc + filter, mono
JARR-2   Jarre            2 osc + vibrato
CHWN-2   Chowning         2-op FM
BRRN-2   the Barrons      2 osc, AM
TANK-5   Hip Tanaka       5-waveform chip
CAGE-6   John Cage        6 inharmonic squares
RSSL-0   Russolo          noise, zero oscillators
RSST-9   Risset           9 drawbars
KLNG-8   Kling Klang      8 drum pads — aspirational, see †
```

**System B**

```
MRDR-3   murder      GRFT-1   graft       PULS-1   pulse
TWIN-2   twins       VOLT-2   volt        THRB-2   throb
MASH-5   mash        NAIL-6   nail        STTC-0   static
ORGN-9   organ       BONE-8   bone
```

System A is the recommendation: it keeps the two names that already work, fixes both
formula violations, corrects the one homage that was architecturally wrong, and removes
the Aphex trademark exposure. System B is the stronger *brand* and the weaker *lore* —
take it if the instruments are never leaving the game.
