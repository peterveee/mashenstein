# JMJR-4 and the robot voice — implementation handover

Date: 2026-09-06, with the round-two performance pass added 2026-09-07

A formant speech and singing synthesiser for MASHENSTEIN, and the instrument panel built
on it. Prototyped 5–6 September 2026 against
`work/local/robot-voice-improvement-plan-2026-09-05.md`.

**Since 6 September the instrument is in the mixer.** The engine lives in
`src/engine/jmjr4/`, the panel in `tools/mixer-voice-editor.js`, twenty-three presets in
`src/data/voices.js`, and SPEAK compiles in JavaScript — see [In the mixer](#in-the-mixer).
The Python under `work/local/` is now the reference the tests hold the port to, and the
generator of `src/engine/jmjr4/data.js`; it is not needed to run anything. The renders in
`work/auditions/robot-voice/` are gitignored. This document is the authoritative statement
of where the work stands; the phase handbacks under `work/local/` are historical.

The synth is named **JMJR-4**: Jean-Michel Jarre, and 4 for the maximum unison count.

## Contents

1. [How to run it](#how-to-run-it)
2. [The chain](#the-chain)
3. [The engine](#the-engine)
4. [Levels](#levels)
5. [The instrument panel](#the-instrument-panel)
6. [Voices](#voices)
7. [Presets](#presets)
8. [Verification](#verification)
9. [In the mixer](#in-the-mixer)
10. [Cost, measured](#cost-measured)
11. [What is not done](#what-is-not-done)
12. [File map](#file-map)

## How to run it

```
work/local/voice-venv/bin/python work/local/robot_voice_ui.py --port 8020
```

Ports 8001 and 8010 belong to the game dev server and the mixer desk; never take them.
If 8020 is already held by an older run, kill it first, because a stale server answers
the pages but serves the old data file and everything then fails silently:

```
kill $(lsof -nP -iTCP:8020 -sTCP:LISTEN -t)
```

| URL | What it is |
| --- | --- |
| `/jmjr` | **JMJR-4, the instrument.** The desk's advanced preset editor, playing for real. |
| `/vox` | The earlier simple instrument. Same engine, plain controls, kept as a reference. |
| `/play` | The engineer's console: every parameter, a sequencer, MIDI. |
| `/` | Type text, hear it, save it. Voices, prosody, production level. |
| `/checks` | One page runs parity, acceptance, the keyboard self-test and the bench. |
| `/ab`, `/accept`, `/parity`, `/bench` | The individual harnesses. |

Regression checks:

```
work/local/voice-venv/bin/python work/local/robot_voice_tests.py     # 36 checks
```

After any change to the engine's tables, re-export the browser's data file or the
instrument keeps playing the old numbers:

```
work/local/voice-venv/bin/python work/local/robot_voice_export.py
```

## The chain

One sound design, expressed twice: once in Python as the reference, once in Web Audio for
playing. They are held together by an intermediate representation and by tests, not by
discipline.

| Stage | File | What it does |
| --- | --- | --- |
| Reference engine | `robot_voice.py` | The phoneme table, the synthesis, `say()`. Authoritative for how anything sounds. |
| Compile | `compile_ir()` | A phoneme sequence becomes an IR: every envelope as breakpoints, every noise event with its start, length and spectrum. Schema `robot-voice-ir/1`. |
| Render, offline | `render_ir()` | The reference renderer. Used for cues and auditions. |
| Render, live | `robot_voice_dsp.js` | The same IR through native Web Audio nodes. Acceptance-checked against the reference. |
| Compile, live | `robot_voice_syll.js` | A port of the scheduler for note-shaped input, so a key press does not need the server. Parity-checked. |
| Notes | `robot_voice_live.js` | Held notes, poly/mono/legato, envelope, unison, vibrato, glide, bend, morph, nasality. |
| Panel | `robot_voice_jmjr.html` | JMJR-4 itself, in the desk's own stylesheet and with the desk's own knob. |
| Text | `robot_voice_ui.py` | CMUdict front end and prosody, server side, for spoken phrases. |
| Export | `robot_voice_export.py` | Writes `robot_voice_data.js` (the browser's copy of every table) and `robot_voice_cues.json`. |

Two properties matter and are tested:

- **The browser and the reference agree.** Twelve acceptance items land within tolerance,
  worst envelope p90 2.63 dB and worst spectrum 2.76 dB.
- **The live scheduler and the reference scheduler agree.** Six sequences covering stops,
  fricatives, aspiration, nasals, boundaries and diphthongs produce identical breakpoints;
  the levels a live note cannot measure for itself land within 2.1 dB.

The browser's numbers all come from `robot_voice_data.js`. Nothing is typed twice.

## The engine

Klatt-style, with the choices below taken deliberately and measured.

**Source.** A Rosenberg glottal pulse, peak-normalised after the radiation difference,
with Klatt's spectral tilt as a one-pole roll-off referenced at 3 kHz. Open quotient is
the pressure control. A sawtooth is available as an alternative source and is what the
`robot` voice uses. Jitter is a bounded random walk on the pitch; flutter is Klatt's three
slow sines at 12.7, 7.1 and 4.7 Hz.

**Tract.** Hybrid: F1 and F2 as a cascade, F3, F4 and F5 as a parallel bank, with the
upper branch scaled by a vowel-dependent term fitted to the all-parallel bank. This was
chosen by listening in phase 2, after the pure cascade came out too dark on OO and the
pure parallel too bright. Formant bandwidths are a single table, and RESONANCE on the
panel scales all four.

**Nasals.** A nasal pole at 250 Hz and a per-place anti-resonator, crossfaded in over
40 ms at each edge. In the browser the anti-resonator is an `IIRFilterNode` whose
coefficients cannot be automated, so there is one wet path per place and the IR's envelope
crossfades between them; at rest the pole and zero cancel exactly, which is the dry path.
Any live note can be nasalised after the fact, which is what NASAL and the morph to MMM
use.

**Stops.** A closure, a burst at the place of articulation, then aspiration for the
voice-onset time. Velars pinch their burst towards the following vowel's F2. A word-final
stop is barely released.

**Fricatives.** Two noise bands each, with glottal amplitude modulation on the voiced ones.

**Transitions.** Formant transitions depend on the pair, not on a single global time.
Diphthongs hold and then move. A word boundary is a dip, not a hole.

### Sound-design fixes, 6 September

Three defects found by ear and then measured. All three were in the reference engine, so
they affected the game cues as much as the instrument.

| Symptom | Cause | Fix | Before → after |
| --- | --- | --- | --- |
| T and D far too loud and percussive | Burst gains were matched on RMS, but a burst is a transient, so the peak stabbed. The post-release aspiration, not the burst, was the floor underneath it. The 2 ms burst edge was the click. | Burst `g` cut to about an eighth (T/K/P 0.11, D/G/B 0.075), the release aspiration named and lowered (`RELEASE_ASP` 0.7 → 0.32), and the burst edge softened to 6 ms | Mid-phrase T peak vs the vowels around it: **+8 dB → −6 dB** |
| Then no consonant read at all | The cut was global, so it took the word-initial bursts with it, and those carry the word. | `ONSET_BURST` 1.7 on a stop that starts a word into a vowel, mirroring the 0.5 already applied to a word-final one | DOO's burst band vs its vowel: **−20 dB → −9 dB**, mid-phrase T unchanged |
| Word-final S was just noise | It sat only 8 dB under the vowel where speech puts it 15 to 18 under, and its 15 ms attack made it arrive like a hit. Its two bands were also broad enough to overlap into flat hiss. | `g` 0.45 → 0.20, attack 15 → 30 ms, bands moved to 7200 Hz Q4 and 5400 Hz Q5 | S vs vowel RMS **−8 → −15 dB**; peak band vs its own 1 kHz **15 → 21 dB** |
| MMM did not read as an M | The M's anti-formant sat at 1000 Hz, exactly on its own second formant, cancelling the murmur dead. What was left was close to a sine. | `nz` 1000 → 750 Hz, where a real /m/ has it | M murmur at 1–3 kHz vs a vowel: **−40 → −32 dB** |

The other fricatives came down with the S in proportion. Three passes were needed: the
first was too timid, the second went too far and took the consonant onsets with it, and the
third separates where a stop sits from how loud it is.

**A consonant onset is also at the mercy of the note's ATTACK.** The amplitude envelope
starts when the key does, and a syllable's onset lives in its first 60 to 70 ms, so any
preset with an attack longer than that fades its own consonant in. Sung syllables with a
consonant want a short attack; this is deliberate rather than a defect, but it is the first
thing to check if a D or a B cannot be heard.

Renders of all of this are in `work/auditions/robot-voice/consonant-fix/`, level-matched
to one ceiling so passes can be compared directly.

## Levels

Two policies, kept apart on purpose.

- **Production.** Every cue is rendered to a target of −20 dBFS RMS with a per-voice gain,
  so no cue is louder than another by accident.
- **Audition.** A comparison set shares one peak ceiling, measured on one member of the
  set, so the only difference heard is the thing under test. Never normalise the two sides
  of an A/B separately.

A live note carries its own levels: the vowel reference table per vowel, the aspiration
unit per vowel and per stop, and a nasality level, because a hum through the nasal path
runs hotter than the oral tract and would otherwise sit 6 dB above the vowels.

## The instrument panel

`/jmjr`. Three cards across a fixed band of 440 px, which is two ENVELOPE cards; that card
needs 211 px for its header, its graph and one row of pots, and every stacked half is 217.
The height is a number, not a measurement, so the window never moves when a control is
hidden. The page loads the desk's own stylesheet, extracted from `tools/mixer-shell.html`,
and the desk's own knob, served read-only from `tools/mrdr3-knob.js`.

### VOCAL

What is being sung or said. Everything in it is mode-specific, and what does not apply is
**hidden**, not greyed, because a mode's controls should not be a list of things you cannot
use.

| Control | Applies | What it does |
| --- | --- | --- |
| MODE | both | SING or SPEAK. |
| text + APPLY | both | A syllable in SING, a phrase in SPEAK. Several syllables take turns, one per key; a trailing dash ties the vowel over the next key. |
| SYLLABLE | SING | Three rows of four: OOH AAH EEH OH / MMM DOO DAA LAA / BAH WAH DEE HEY. |
| MORPH TO | SING | Three rows of four: OOH AAH EEH OH / EH AE UH AW / MMM ER IH UHH. Same spellings as the syllable row for the same vowel. |
| MORPH % | SING | How far the vowel moves towards the MORPH TO vowel. Works on held notes. |
| MORPH TIME | SING | 0 sits at the morph position; above 0 the note starts on its own vowel and glides there after the onset. Greys at MORPH 0. |
| BEND, BEND TIME | SING | The scoop into a note, in semitones and seconds. GLIDE from the previous key wins over it. |
| UNISON, SPREAD | SING | Up to four complete singers per key, each with its own source, tract and noise seed, and how far apart they sit in cents. |
| SPEED, PITCH Hz, RANGE | SPEAK | How fast, at what pitch, and how far the contour moves. PITCH greys when the key is setting the pitch. |
| PITCH key/fixed | SPEAK | Whether a key shifts the phrase or the phrase keeps its own pitch. |
| PER KEY phrase/word | SPEAK | A key says the whole phrase, or the next word of it. Each word is compiled separately so it keeps its own contour. |
| ENDING | SPEAK | Falls, rises, or flat. |
| STEP | SPEAK | Quantises the contour to whole semitones. OFF, 1, 2 or 3. |

C0, and any key below C1, restarts a syllable or word sequence without making a sound. A
hint appears under the text box whenever the sequence has more than one step.

### VOICE

What the voice is, in both modes. Nothing here is hidden or greyed by mode.

PRESET, TRACT, PRESS, TILT dB, BREATH, JITTER %, FLUTTER %, NASAL %, RESONANCE.

TILT was called BRIGHT and was renamed because it is not an output EQ: it is Klatt's TL,
roll-off at 3 kHz applied to the glottal pulse **before** the tract, so it changes what
drives the formants. The pot now reads the parameter itself, 0 for the raw pulse.

### ENVELOPE

ATTACK, DECAY, SUSTAIN %, RELEASE, with the desk's own envelope graph above them, imported
from `tools/mixer-synth-graphs.js` and bound to the same four pots, so dragging a handle
moves the pots and there is no second source of truth. SING only; a spoken phrase carries
its own timing.

### SETTINGS and EFFECTS

SETTINGS holds TRIM dB, TRANSPOSE, FINE cents, GLIDE, KEY MODE, and then a seamed block at
the foot with VIB DEPTH, VIB RATE and VIB DELAY, the way the desk's `splitCard` separates
vibrato from the rest of the note card.

EFFECTS holds BITS and RATE kHz: the reference engine's arcade stage, `chip()`, implemented
in the browser as a lowpass at 0.45 times the hold rate feeding an AudioWorklet that
sample-and-holds and then requantises. Where a worklet cannot load, BITS still works
through a waveshaper and RATE greys itself. It is in EFFECTS rather than VOICE because it
is a post stage, not part of how the voice is made.

### Conventions this panel follows

These came from Peter over the course of the build and are worth keeping if the panel is
rebuilt elsewhere.

- No new terminology. UNISON and SPREAD, not ensemble and detune; RESONANCE for formant
  bandwidth because that is what resonance means on a filter; SETTINGS on the right.
- Every control the engine reads has a pot, and every pot has an engine key behind it.
- Choices are pills, never an OS dropdown. The voice list is the desk's `.vedrop`.
- A card is a fixed height and never grows with its content.
- Controls hang from the top of a card.
- Time pots read the desk's way: unit `s` on the label, `90ms` or `1.2s` in the readout.
- The keyboard is the trigger. There is no play button.

## Voices

Nine, in `robot_voice.py`. The five original ones are unchanged; the four added on
6 September carry the new tract keys, which older voices simply omit.

| Voice | For | Notable |
| --- | --- | --- |
| announcer | The default. Clear, steady, unhurried. | |
| eggshell | The villain. Low, deliberate, theatrical. | |
| dolores | Clipped, tired finality. | Narrow range |
| robot | Stepped pitch, crisp articulation. | Sawtooth source |
| small | Higher, smaller tract. | |
| chorister | Held vowels rather than sentences. | Wide formants, a little flutter |
| titan | Enormous. | Tract 0.76, pitch 68 Hz, formants held tight |
| elder | Cannot hold a pitch. | Flutter 1.3, jitter 0.35 |
| nasal | Blocked up. | Nasality 62 |

## Presets

Sixteen in the panel, twelve of them singing. Each one names every pot it cares about,
because a preset that omits a pot inherits whatever the previous preset left there.

Choir Ooh, Doo-wop, Robot Chant, Small Voice, Ooh Opens, Hums Closed, Scoop Lead, Old
Chorister, Formant Machine, Arcade Chorus, Titan Drone, Breath Pluck, Announcer, Eggshell
Says, Cabinet Voice, Word Per Key.

The eight added on 6 September each demonstrate one thing: the morph sweep opening and
closing, the pitch scoop, flutter and jitter, resonance hard over, nasality with the
crusher, the largest tract, decay and sustain, and word-per-key triggering.

Saving writes JSON to `work/auditions/robot-voice/vox-presets/` through the server, and
the header dropdown lists the built-ins plus anything saved.

## Verification

**Python, 36 checks**, `robot_voice_tests.py`. Covers the schedule (ordering, VOT
absorption, voice bar, boundaries, transitions by pair), the IR round trip rendering
identically to `say()`, the IR carrying every constant the browser renderer reads, the
exported data file matching the engine's tables, and the shared noise generator being
deterministic and unit variance.

**Browser, `selfTest()` in the panel.** Around 45 assertions, run from the console at
`/jmjr`. It covers what is hidden and what is greyed in each mode, the unison spread
reaching the singers in cents, transpose, trim, glide living only outside poly, the text
box advancing syllables, the sequence reset key, word-per-key saying the right words, the
morph moving a held note's F1, the morph sweep over time, the morph to MMM engaging the
nasal path and staying level with a vowel, the nasal, resonance and flutter pots reaching
the engine, the pitch scoop arriving on pitch, every preset applying without error, the
envelope graph handles moving sustain, sustain actually settling the note's gain, the
2×3-by-4 pill grids lining up, the card heights and the absence of overflow.

Two known flakes, both in the test rather than the synth: the very first run after a cold
page load can fail the word-per-key check, because the first phrase fetch races the audio
context starting, and one transpose check has failed once on timing. Both pass on a rerun.

**One page for the rest**, `/checks`: scheduler parity on six sequences, acceptance on
twelve items with the comparison done by the server, the keyboard self-test in a frame, and
the render cost bench.

**Cost**, measured offline in Chrome, warm pass, 2 seconds of audio: one voice renders in
about 0.5 % of real time, four in 1.5 %, eight in 3 %. Graph build is 3 to 20 ms. This is
not a live CPU figure and says nothing about a phone.

## In the mixer

The plan (`~/.claude/plans/it-sounds-good-but-playful-yeti.md`, approved 6 September 2026)
ran in five phases on 6 September: a census bench before touching `src/`, the engine as a
native path, the desk panel, the presets, the cost write-up below, and SPEAK ported to
JavaScript so a user types a phrase in the mixer with no Python anywhere.

### The engine (`src/engine/jmjr4/`)

| File | Role |
| --- | --- |
| `data.js` | GENERATED by `work/local/robot_voice_export.py --into src/engine/jmjr4/data.js`: every phoneme, voice, tract constant, level table and, under `text`, the spoken-text tables. 16 KB. `tests/jmjr4-data.js` checks it against the Python whenever the Python is present. |
| `syll.js` | The scheduler as pure functions over `data`: `compileSeq`, `syllable`, `parseSyllable`, `syllablesFromText`, the twelve syllables and twelve morph targets. Bursts are placed in samples at the data's 44 100 Hz and converted by the renderer, which fixed the prototype's 8 % early bursts on a 48 kHz desk. |
| `dsp.js` | `renderIr(ctx, ir, opts)`: the graph for one IR. JITTER is rendered here (the shared seeded noise played slow through an 8 Hz lowpass into every source's frequency, scaled so the pot's percent is an RMS percent of the note). One seeded 4 s noise buffer per context (a note takes an offset from its seed) instead of 12 s per singer; the glottal wave memoised per context; every source `stop()`ped at release, no timers; the voice-bar oscillator stops when the closure ends rather than running the note's length (a third of a held doo, see below). Nasal pole as a real Klatt resonator (`IIRFilterNode`). Deterministic: a stem is byte-for-byte the lane inside the mix. |
| `note.js` | `buildJmjr4Note`: one note per key — its UNISON sources (detuned, each with its own pulse shape) into the key's one tract — the ADSR, the scoop, the morph (retarget + nasalise), the hum level, the ending consonant, and the nasal path built only when the note can reach it. |
| `compile.js` | `compileJmjr4(voice, data) → { patch, problems }` on MRDR-3's refuse rule: an unknown voice, a word that is not a syllable, an out-of-range pot, a stale phrase block — refused, never approximated. `JMJR4_DEFAULTS` / `JMJR4_RANGES` are the one table the panel and the compiler share. |
| `line.js` | Which syllable a STEP sings: same step, same syllable (a chord, a strum, an arpeggio); a higher step advances; a lower step (loop wrap, seek) restarts; no step (the desk keyboard) advances per key; a trailing dash ties over the next onset. |
| `text.js` | SPEAK: `tokenize`, `pronounce`, `elongate`, `phraseToSeq`, `contour`, `compilePhrase`, `compactDict`, `compactIr`. A function-for-function port of `robot_voice_ui.py`, held to the Python by fourteen fixtures. |

The rack (`src/engine/voices.js`): `play()` takes a `step`, `_playJmjr4` branches before
MRDR-3 and copies `_playAdditive`'s shape — the lane chorus stage, one vibrato LFO per
note-on in cents into every singer's `detune`, the SHAPE/DRIVE/TONE pair, the generic
held record so preview release and panic need no branch. Legato is a NEW note that
continues the old one (no onset, no attack, glide in) because a booked `stop()` cannot be
taken back; mono cuts the old note in a cycle and a half. UNISON is N glottal sources into
ONE tract (power-summed inside the note), not N tracts: see the cost section.
`src/engine/audio.js` passes `this.step` and resets the syllable lines beside each
`noteFx.reset()`. The prototype's `_playJmjr4` cost more than the hygiene prototype until
the voice bar was found running the note's whole length (`work/local/jmjr4-ablate.mjs`).

### The panel

`SYNTH_GROUPS['JMJR-4']` in `tools/mixer-voice-editor.js`: VOCAL (MODE; in SING the
SYLLABLES text row, the SYLLABLE and MORPH TO grids, MORPH, MORPH TIME, BEND, BEND TIME,
UNISON, SPREAD; in SPEAK the PHRASE text row, SPEED, PITCH, RANGE, FOLLOWS, PER KEY,
ENDING, STEP — the other half hidden, the mock's rule, through a `hideWhen` guard beside
`when`; MORPH and MORPH TIME sit above the MORPH TO grid, which rests until MORPH is above
zero; the card spreads its groups down its height, `airy` in `fullLayout` with `gapAfter` /
`gapBefore` marking where a group ends), VOICE (the dropdown and TRACT / PRESS / TILT / BREATH / FLUTTER / NASAL /
JITTER / SIBILANCE / BUZZ / RESONANCE), ENVELOPE (the desk's ADSR, greyed in SPEAK), SETTINGS
(the common rows; KEY MODE, GLIDE and the vibrato greyed in SPEAK) and EFFECTS (SHAPE,
DRIVE, TONE, then BITS and RATE — the reference's arcade stage, one sample-and-hold per
lane and preset after the drive with a lowpass at 0.45× the hold rate in front, the same
processor the lane's Bit Crusher effect is; then CHORUS — no PLACE, the path drives after
the voice). The text row is the one new row kind on the desk. Full window: VOCAL | VOICE over ENVELOPE | SETTINGS over
EFFECTS. Simple strip: LEVEL, TRANSPOSE, ATTACK, RELEASE, TONE (tilt read upwards),
UNISON, SYLLABLE (PHRASE in SPEAK), VIBRATO. The approved SOFT/HARD macro was not built
because it would write the same leaves as the strip's own ATTACK and RELEASE. Arcade Chorus
and Cabinet Voice carry their crusher (6 bits at 8 and 9 kHz). Every JMJR-4 trim is 0: the
mock's trims levelled the standalone bank, and the mixer levels by measurement, so they
were being counted twice.

### SPEAK, in JavaScript

A spoken preset carries its phrase COMPILED: `jmjr4.phraseIr = { source, ir, words }`,
stamped with everything the block depends on (`jmjr4SpeakSource`: the text, the voice,
SPEED / PITCH / RANGE / STEP / ENDING and the nine voice pots). The desk recompiles it
whenever the stamp no longer matches (`ensureJmjr4Phrase`, called from `touched()` and on
open), and until it lands the compiler refuses the preset and the keys are quiet rather
than wrong. The dictionary is CMUdict, fetched once per session from the desk server's
`/cmudict.json` (which downloads the upstream file into `work/local/cmudict.dict` on first
use and caches it compacted, 3.8 MB of JSON) or, on a static desk, from upstream directly and
compacted in the page. A song plays a spoken preset with no dictionary and no server.
FOLLOWS = KEY shifts the compiled contour by the key against PITCH; FIXED makes the key a
trigger. PER KEY = WORD says one word per step through the same line rule as the syllables.
A block is `compactIr`: no `schedule`, numbers at five decimals, the contour thinned to its
breakpoints (the 5 ms grid was a sampling of a piecewise-linear curve) — 7 to 13 KB per
preset instead of 25 to 45.

### Presets

Twenty-three in `src/data/voices.js`: nineteen singing (`jmjrChoirAah` … `jmjrKazooLead`,
Pad / Lead / FX / Pluck, levels and peaks measured by `node tools/measure-voices.js --fill`)
and four speaking (`jmjrAnnouncer`, `jmjrEggshellSays`, `jmjrCabinetVoice`,
`jmjrWordPerKey`, FX, their blocks generated once by the same compiler the desk runs).
Vibrato depth converted from the prototype's fraction of frequency to the desk's semitones
(`12·log2(1 + d)`). The vox lane's picker opens on Pad.

### Verification

`tests/jmjr4-{data,compile,syllables,render,text}.js` are in `tests/run-all.js`.
`jmjr4-render.js` plays every shipped preset through the real rack offline (finite, under
full scale, silent by the end), renders the same chord twice on fresh contexts to 5e-6,
lands a D burst at the same moment at 44.1 and 48 kHz, plays a legato line and a spoken
line (a word per step, a word outliving its step, a stale block silent), and releases a
held key through the generic record. `tests/pot-coverage.js`, `synth-full-layout.js` and
`synth-dropdown.js` cover the panel; `voices.js` and `mix.js` the catalogue.

## Cost, measured

Phase 0 of the mixer plan, 6 September 2026, `work/local/jmjr4-bench.mjs`: 8 s renders at
48 kHz, best of three, the prototype played through a time-explicit copy of its note
builder with the three hygiene fixes the port makes (shared seeded noise buffer, memoised
glottal wave, hold = duration). Share of one audio thread, an estimate from offline wall
time, never a live figure.

| Case | JMJR-4 | MRDR-3 | TNGR-2 | JMJR ÷ MRDR |
| --- | ---: | ---: | ---: | ---: |
| 8 held notes, unison 2 | 6.26 % | 2.22 % | 2.38 % | 2.8× |
| 4-note pad, unison 3 | 5.26 % | 1.73 % | 1.27 % | 3.0× |
| 16th-note bass line, unison 1 | 5.26 % | 7.12 % | 0.47 % | 0.74× |
| 16 notes, unison 4 | 18.8 % | 6.60 % | 4.81 % | 2.9× |
| Choir Aah vs bestChoirAah vs tngrGlassChoir, 8 held | 15.7 % | 7.88 % | 2.37 % | 2.0× |
| the same, 4-note pad | 8.0 % | 3.96 % | 1.28 % | 2.0× |

Main-thread graph build: 10 to 15 ms per note-on at unison 2 to 4 with hygiene, 2.7 ms on
the unison-1 sixteenth line; 24 to 46 ms without. A census on the 8-held rows, removing one
part of the graph at a time: the nasal path (a resonator and an anti-resonator node per place, one node since the fusion below) is
about 5 ms of that build and a sixth of the choir's render; the parallel upper branch is a
third of the choir's render; with both removed a singer still costs 0.25 to 0.33 %, which is
about one MRDR-3 note. That is the economics of a native formant voice: unison N costs N
notes, and the choir sound JMJR-4 exists for sits at twice MRDR-3's choir.

**Gate 0 verdict: proceed native.** The sixteenth line is under MRDR-3's own cost and its
build is under 3 ms per note-on; the choir pairing sits on the 2× line; the unison-2 pad
misses the 5 % budget by 1.3 points. The port takes three savings the bench pointed at: the
nasal path built only when a note can reach it, the flutter oscillators shared per note-on
rather than per singer, and the unison sum scaled by 1/√n (the bench peaked at 1.4 to 2.0).
A worklet port is decided in Phase 4 from the shipped path's numbers.

### The shipped path (Phase 4)

`node work/local/jmjr4-bench.mjs --engine` plays the catalogue's own presets through
`VoiceRack.play` on the vox lane — chorus stage, vibrato, drive, the lot — against the same
MRDR-3 and TNGR-2 cases. 8 s at 48 kHz, best of three, on a quiet machine, after the
later-stop fix below.

| Case | JMJR-4 (shipped) | MRDR-3 | TNGR-2 | ÷ MRDR | ÷ TNGR | build ms / note-on |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 8 held notes, Doo-wop (unison 2) | 3.70 % ✓ | 2.23 % | 2.40 % | 1.7× | 1.5× | 4.1 |
| 4-note pad, Choir Ooh (unison 3) | 2.03 % | 1.76 % | 1.29 % | 1.2× | 1.6× | 3.3 |
| 16th-note line, Robot Chant (unison 1) | 10.4 % | 7.56 % | 0.49 % | 1.4× | 21× | 0.3 |
| 16 notes, Choir Aah (unison 4) | 10.2 % | 6.48 % | 4.80 % | 1.6× | 2.1× | 3.4 |
| Choir Aah vs bestChoirAah vs tngrGlassChoir, 8 held | 4.96 % ✓ | 7.53 % | 2.37 % | 0.66× | 2.1× | 3.8 |
| the same, 4-note pad | 2.55 % | 3.84 % | 1.30 % | 0.66× | 2.0× | 3.6 |

Budget (docs/TNGR-2-completion-spec.md §11): one lane of 8 held notes under 5 %, four such
lanes under 20 %. Both 8-held rows pass; the choir JMJR-4 exists for costs two thirds of
MRDR-3's choir and twice TNGR-2's. The 16th line is 1.4× MRDR-3's own, over the gate's
"at or under" — per-note-on cost is what that row measures (64 graphs of 18 to 27 nodes
built and torn down in 8 s), an ablation found no single part of it to take out, and
every native engine pays it there.

**Unison is one tract.** Before this table the choir rows were 12.4 % and 26.8 %: each
UNISON singer was a complete tract of its own, so unison 4 was four notes per key. A
worklet would not have helped — `work/local/jmjr4-worklet-probe.mjs` runs a formant
singer's maths in plain JavaScript inside an AudioWorklet and lands at 0.29 % of a thread
per singer, the same as the native graph; the cost is the tract, not the nodes. So UNISON
is now what it is on MRDR-3: N detuned sources (each with its own open quotient, so its
own pulse shape) summed into the key's ONE tract, power-scaled so the compiled levels
still hold. What went with it is the per-singer tract scale (±4 %), which was the
prototype's formant shimmer; what stayed is the detune, the pulse variation and the
vibrato. Choir Aah at 8 held notes went 12.4 % → 4.96 %. Peter approved the sound the
same day.

`work/local/bench-synth-classes.mjs` (48 notes in 10 s, each the preset's own length,
against the reference Tone synth): `jmjrChoirAah` 140×, `jmjrDoowop` 59×,
`jmjrRobotChant` 21× — forty-eight overlapping 8 s choir chords is 190 singers, which is
the number that row is.

**What the ablation found** (`work/local/jmjr4-ablate.mjs`, the 8-held row with one thing
removed at a time; `jmjr4-nodes.mjs` for the per-singer census): a doo cost half again
what an ooh cost in the rack — 9.2 % against 6.3 % — while the same sixteen singers straight
through `renderIr` cost the same either way. The gap was the note's release: it stopped
every source at the note's end, and a later `stop()` REPLACES an earlier one (the spec's
rule), so the burst noise and the voice-bar oscillator booked to end at 70 ms were
un-stopped and ran the whole note. `renderIr` now books every source's end and only ever
re-stops a source EARLIER; the brief ones stay off the handle's `sources`, which the rack's
held record and panic stop at the note's end. After it a doo costs an ooh (5.66 % against
5.76 % through the note builder), and the doo-wop row fell from 9.06 % to 6.13 %.

**Worklet decision: no.** The probe above is the number: a formant singer costs the same
in a worklet as in native nodes, because its cost is a dozen filters per sample, not the
graph. What a worklet would still buy is the per-note-on cost on the 16th line (no graph
to build per note), and that row is 1.4× MRDR-3's, which is not worth the
schedule-collection path (`_collectTngr2` / `flushTngr2Offline` / `renderTngr2Lane`) a
worklet engine needs for offline bounce.
`profileTrackLoad()` on the desk is **not** the live number, and calling it one here was
wrong. It bounces the song offline through `bounceWav(..., measureOnly: true)` — its own
docstring says so: "Offline render wall time is not a realtime AudioWorklet gauge." It is a
second offline measurement, useful for the same apples-to-apples reason this table is, and it
identifies which track graphs deserve a live listening A/B. **The live figure has never been
taken by anything in this tree.** Every percentage on this page is offline render wall time
divided by buffer duration: a ratio between engines, never a measured audio-thread share.

Auditions: `node work/local/jmjr4-audition.mjs` renders the three choirs (`bestChoirAah`,
`jmjrChoirAah`, `jmjrChoirOoh`, `tngrGlassChoir`) as an 8 s held A2 C#3 E3 A3 through the
real rack into `work/auditions/jmjr4/` at one peak ceiling, the loudest take at 0.89.

### The sound-preserving pass, 6 September 2026

Three optimisations were implemented one at a time against a FROZEN baseline — the working
tree bundled and SHA-256-manifested before any edit, because HEAD is not the sound reference
while this work is untracked. Two were kept, one was measured and thrown away, and a fourth
item found nothing to change. Harness, evidence and raw timings:
`work/local/jmjr4-perf.mjs` and `work/local/jmjr4-perf-2026-09-06/`.

How a change had to earn its place. Median B and C over seven alternated paired runs, MADs
MB and MC: kept only if `(B−C)/B > max(0.03, 2·max(MB/B, MC/C))` **and** the candidate won at
least 6 of the 7 pairs; an inconclusive result got one bounded rerun at fifteen pairs needing
12 of 15, and stayed dropped if it stayed inconclusive. Sound had to be unchanged first:
every sample of every channel of 160 renders — every renderable shipped preset at 110, 220
and 440 Hz plus fourteen targeted cases, at 44.1 **and** 48 kHz — compared in the browser
against the frozen bundle, tolerance 1e-5 at production gain, never widened.

| | Sound | Verdict |
| --- | --- | --- |
| **A. Constant automation** | 146/160; 14 rows over gate, worst 1.5e-4 (−72 dB) | **kept on Peter's call** — the only change here that alters the sound |
| **B. Nasal filter fusion** | 160/160, worst 2.2e-6 | **kept** |
| **C. Provably silent branches** | 160/160, worst 2.2e-6 | **kept** |
| **D. Lifecycle audit** | — | **no change** — no defect reproduced |

**B — one nasal filter, not two.** The Klatt resonator `pA/(1 − pB z⁻¹ − pC z⁻²)` and the
anti-resonator `(1 − B z⁻¹ − C z⁻²)/A` are both LTI, so their product is one 3-tap-over-3-tap
IIR: feedforward `[pA/A, −pA·B/A, −pA·C/A]`, feedback `[1, −pB, −pC]`. Every wet path is now
one `IIRFilterNode` where it was two. Impulse responses agree to 1e-15 in double precision at
both rates and at all four nasal places the data reaches (750, 1000, 1550, 3000 Hz).
Held MMM build −22.6 %, render −3.8 %; oral-to-MMM morph build −11.3 %; SPEAK build −18.9 %.

**C — a branch that is provably silent is not built.** 13 of the 19 sung presets have an
aspiration envelope that is zero at every breakpoint: `syll.js` writes `bp(aT, av, …, 0)` for
a vowel, so a line with no H and no stop in it has nothing there. Built anyway, that was a
looping `AudioBufferSourceNode` reading the shared noise buffer and a `GainNode` multiplying
it by zero, for the whole length of every note — on Choir Aah, Choir Ooh, Hummer, Titan
Drone, Old Chorister and the rest of the pads. The test is the EFFECTIVE scheduled values
(the envelope through the same transform `automate` applies): a stop's release aspiration
is in the envelope, so Doo-wop keeps its source at its own BREATH, and BREATH 0 — a gain of
exactly zero now that the pot is connected (below) — takes the branch and leaves the burst. An
extra event whose final gain is exactly zero is skipped the same way, without renumbering:
the survivors keep the seed (`ir.seed + 17·(i+1)`) and the level their own IR index gives
them. Nothing can switch a branch back on later — the handle's live controls are `retarget`,
`nasalise`, `release` and `stop`, and the rack's vibrato reaches `oscs`, which a buffer source
is not.

Measured against the frozen baseline, everything together, seven alternated paired runs at
48 kHz (`results/final-abc.json`). An em dash is "the gate would not call it", not "no
change".

| Workload | build | **render** | cold build |
| --- | ---: | ---: | ---: |
| four-note Choir Ooh pad | −22.5 % | **−19.7 %** | −22.2 % |
| one chord-array call, four keys | −17.1 % | **−17.9 %** | — |
| four-note Choir Aah pad | −16.9 % | **−16.6 %** | −18.4 % |
| eight held MMM hums | −15.0 % | **−16.1 %** | — |
| eight held Choir Aah, lane FX off | −9.6 % | **−16.0 %** | −9.4 % |
| sixteen Choir Aah, unison 4 | −4.9 % | **−15.3 %** | −6.6 % |
| eight held Choir Aah | −7.5 % | **−14.9 %** | −8.4 % |
| a sustained zero-breath AAH | −41.1 % | **−14.6 %** | — |
| eight oral-to-MMM morphs | −11.7 % | **−9.0 %** | — |
| eight held Doo-wop | — | **−6.9 %** | — |
| eight held Doo-wop, lane FX off | — | **−5.8 %** | — |
| repeated zero-breath DOO | — | **−3.7 %** | — |
| SPEAK, a word per key | — | — | — |
| rapid Robot Chant line | — | — | — |

Nothing regressed. Twelve of fourteen workloads got cheaper to render; the two that did not
are the sixteenth line (dominated by per-note-on graph construction) and SPEAK (one long
phrase, not many notes). B and C alone were build −8 to −43 %, render −3 to −6 %
(`results/final.json`) — so **A is where the render win lives**, B and C are the note-on win.

**A — the one change here that alters the sound, kept deliberately.** The IR's curves are
mostly flat: F4 and F5 arrive as one constant repeated at every breakpoint, a vowel that does
not sweep gives F1..F3 two identical points, and thirteen presets have an aspiration envelope
that is zero throughout. `automate` now drops the interior points of every run of exactly
equal values, and a curve that never moves at all becomes ONE event.

That last part is what pays, and it is not free. An AudioParam carrying a live timeline is
sample-accurate: Chromium asks it for a value at each of 48 000 samples a second and rebuilds
the biquad's coefficients from the answer, to arrive at the same answer every time. A param
that cannot move has its coefficients computed once per 128-sample quantum and runs the
filter through the vectorised path instead. Same filter, different arithmetic order,
therefore different rounding — and a resonant filter feeds its output back in, so it
compounds over a note.

Measured: of 160 full-buffer comparisons at both rates, **146 unchanged and 14 over the 1e-5
gate**, across four presets — Small Voice, Choir Ooh, Doo-wop, Doo Wop Line. Worst 1.47e-4
absolute (Small Voice at 440 Hz); against each note's own peak, 6e-5 to 2.4e-4, or **−72 to
−84 dB**, growing with pitch because the tract rings longer up there. Every sample stayed
finite and every note-acceptance outcome identical.

The order matters. It was implemented as specified, **failed the gate, and was reversed** to
byte-identical. A sound-preserving variant — the run rule applied uniformly, so a constant
curve keeps two events — restored parity at 1.3e-6 and proved measurably free (every case
inconclusive; the two near-misses reran at fifteen pairs and landed 9/15 and 7/15). Only then,
with the cost measured and the free alternative shown to be worth nothing, did Peter compare
the audition pairs and take the trade. **The gate was not widened; it was overruled once, on
the record.** Both variants are kept as `dsp-A-full-collapse.js` and `dsp-A-uniform-runs.js`.

**So the 14 rows will keep failing a 1e-5 comparison against this run's baseline, because
they are meant to.** The new baseline is already taken —
`work/local/jmjr4-perf-2026-09-07/baseline/`, bundle sha256 `cd97b52e…` — so measure future
JMJR-4 work against that, and keep the 09-06 one, which is what the 14 rows were measured
against.

**D — audited, nothing to fix.** `work/local/jmjr4-perf-2026-09-06/lifecycle-audit.mjs`
wraps `AudioScheduledSourceNode`'s start and stop in CALL ORDER for the length of one render
— harness only, no production hot path — over scheduled release, a held key released, a held
key never released, repeated mono, repeated legato, ending consonants, SPEAK, the sixteenth
line, `stopPreview`, `panicMrdr3Aw` and `dispose`. Across every case: **0 sources started
without a stop booked, 0 stops widened** (the later-stop trap `cut` exists to prevent is
closed), and 80 note-ons on one rack leave one line, one last-note record and nothing held;
`dispose` clears all three. The only source booked far out is the held key nobody released,
at `HOLD_SECONDS` = 30 s, which is the rack's documented backstop and not a leak. No
lifecycle change was made.

**Two things the harness had to be taught, both pre-existing.**

- **`jmjrArcadeChorus` does not render deterministically offline.** It is the only preset
  that switches BITS / RATE on, and `_jmjr4Bus` builds that stage from `makeBitCrusher`,
  whose sample-and-hold is a `ScriptProcessorNode`. An `OfflineAudioContext` services
  `onaudioprocess` on the MAIN THREAD, so whether every 256-frame block is filled before the
  render finishes is a race. Two pages running the SAME frozen bundle: over the 1e-5 gate in
  **4 renders of 10, worst 3.1e-2**, while every preset without a crusher stayed at 6e-8. Its
  rows are reported and never counted against a candidate.
- **The harness's own floor is 1.5e-6.** Two renders of identical code are not bit-identical
  in Chromium, same page or across pages, and the difference scales with level (1.5e-6 at
  peak 1.07, 7.5e-9 at peak 0.12). The 1e-5 gate has about 7× headroom over it — worth
  knowing before anyone reads a 2e-6 parity number as a change.

**Verified.** `node tests/jmjr4-performance.js` (new, registered in `run-all.js`) — the fused
filter against the serial pair at both rates and every place, the silent-branch rule both
ways round, the un-renumbered extra, source lifetime, and the nasal presets still sounding.
`npm test` and `npm run test:all` both pass with zero failures, including the null test: the
shipped songs still render identical to their committed baselines (max diff 1.19e-7).
`npm run build` clean, `git diff --check` clean. The desk is request-built, so a refresh is
the deploy — the served page at `http://127.0.0.1:8031/` (my own desk on a free port, stopped
afterwards; Peter's 8010 was never touched) carries the fused coefficients and the
`hasAsp` guard, and no longer carries the serial pole/zero, and comes up with no page errors
in Chromium 149.0.7827.55.

**Not verified.** *Listening.* Headless Chromium has no output device; the audible A/B is
Peter's, from the 28 baseline/candidate WAV pairs in
`work/auditions/jmjr4/jmjr4-perf-2026-09-06-final-vs-baseline/` (32-bit float, both rates,
production gain, `index.json` names the recipe and the measured error for each). *A song
bounce and matching stem for a JMJR-4 fixture:* no song in the tree uses a JMJR-4 voice, so
there is no such pair to take. The closest evidence is the null test above, which puts the
shipped songs through the export path unchanged, and the 160-case full-buffer parity, which
goes through `VoiceRack.play` — the same call the sequencer makes.

### BREATH, found dead and reconnected

`controls.asp` was written into every IR by `syll.js` and read by nothing: `liveLevels`
derived the rendered aspiration gain from `data.levels.asp`, the data file's constant 0.35,
so moving BREATH changed the compiled IR and not the sound. The reference does it the other
way — `robot_voice.py` line 1072, `asp_gain = asp * vref / ra`, from the CONTROLS — and
`syll.js` now does the same: `asp_gain = (ir.controls.asp ?? lv.asp) * vref / aspUnit`.

What it changes: nothing shipped. The default is the constant it replaced, and the only two
presets that set BREATH elsewhere — Choir Aah (0.42) and Breath Pluck (0.7) — are pure
vowels whose aspiration envelope is zero at every breakpoint, so the gain multiplies nothing.
The parity suite against the frozen baseline says so: 158 of 160 rows unchanged
(`results/breath-fix.json`), and the two that moved are the harness's own BREATH-0 stop
fixture, by design. What it makes possible: BREATH on a line with an H or a stop in it now
does what the panel says — 0 is exactly silent and 0.7 is twice 0.35
(`tests/jmjr4-syllables.js`), and at 0 the stop keeps its burst and loses only the
aspiration branch (`tests/jmjr4-performance.js`).

**Breath Pluck is still a preset with no breath in it.** Its line is a vowel, and a vowel
writes zero aspiration — in the reference too. A pot at 0.7 on a line it cannot reach is a
sound-design question, not an engine one: it wants an H (`hah`) or a stop in the line.

### The round-two pass, 7 September 2026

Peter's second brief (`docs/Further JMJR OPTIMISATIONS.md`, working copy with the results
written into it at `work/local/jmjr4-performance-plan-round2-2026-09-07.md`) let the sound
change for at least a 10 % improvement on an affected workload, and revised engine defaults
and factory presets rather than adding a quality selector. Evidence, every frozen bundle and
every raw timing: `work/local/jmjr4-perf-round2-2026-09-07/`.

**The harness's own bias was found first, and it mattered.** The frozen baseline, run against
ITSELF, graded five render rows as improvements — one of them 4.8 % at 7 wins of 7 — while
every sample of every sound row matched to 1.4e-6. Two pages are two renderer processes, and
on an Apple Silicon machine one may sit on a performance cluster and the other on an
efficiency cluster for its whole life; `work/local/jmjr4-bias-probe.mjs` measured the same
bundle against itself at +1.7 % (7/7) in one configuration and −3.5 % (0/7) in another. Both
bundles now load into ONE page under separate globals, so the alternating pairs interleave in
one process on one core, and the warm-up went from one untimed pass to three. The self-check
then graded nothing as moved. Anyone measuring anything in a browser in this repo should read
that comment in `work/local/jmjr4-perf.mjs` before trusting a two-page A/B.

| | Sound | Verdict |
| --- | --- | --- |
| **A. No terminal automation point** | 168/168, worst 1.43e-6 | **kept** — `held8-doowop` render −10.1 % (7/7) |
| **B. Stop the silent aspiration source** | 168/168, worst 1.46e-6 | **kept** — −3.0 % on top of A, confirmed −2.7 % at 15/15; −14.4 % cumulative |
| **C. Four formants (drop F5)** | changed, by design | **dropped** — 6.0 % on its declared target against a required 10 % |
| **D1. Robot Chant BREATH → 0** | changed, 24 rows, all Robot Chant | **kept on Peter's call** — render −42.7 % on the rapid line |
| **D2. Choir Aah UNISON 4 → 3** | changed, 32 rows, all Choir Aah | **taken on Peter's override** — missed the 10 % render gate at 8.6 %, kept for the note-on cost (build −23 %) |
| **D3. Choir Ooh UNISON 3 → 2** | changed, 12 rows, all Choir Ooh | **taken on Peter's override** — missed at 9.7 %, kept for the note-on cost (build −30 %) |

**A — nothing after the last move.** `automate` already collapsed a curve that never moves to
one event and dropped the interior of a flat run. It now also drops the FINAL plateau: an
AudioParam holds its last value for ever, so a closing ramp from v to v is a booked event
that cannot change a sample, and one booked event is what keeps a param's timeline live for
the whole sustain. It is the commonest shape in the IR — a consonant's formant transition
lands and holds, the voicing envelope reaches the vowel's amplitude and holds. Interior
plateaus still keep both ends, the ramp that REACHES a value is always kept, and only exact
equality counts.

**B — the breath stops when the breath stops.** `syll.js` writes a stop consonant's release
aspiration as 0.32 at the burst and 0.09 into the vowel, and then the vowel writes zero and
holds zero to the end of the note; a held pad was carrying a looping noise BufferSource
through a gain of exactly zero for thirty seconds. The source is now booked to stop at the
last nonzero breakpoint's successor (`silentFrom`), which keeps a second H later in a line
alive. Because the last `stop()` wins in the spec, an early stop is only safe if nothing
re-stops the source later: the note handle owns its sources' lifetimes through `cut`, and
`buildJmjr4Note` hands the rack a `stopSources(t)` callback that the note-off path
(`_letGoNative`) and the panic path (`stopPreview`) call instead of walking the raw list.
Other synths' held records carry no callback and take the old path untouched.

**D1, and what it says about the preset.** Robot Chant's line is `daa`, and a D's release
aspiration is the only breath in it. At BREATH 0 the burst survives — the plosive is a
separate event — and the noise behind it does not, which takes the rapid sixteenth line from
1123.7 ms to 644.2 ms of a 12-second buffer. Peter listened to the pairs on 7 September and
took it (`decisions/D-robot-breath.json`, recorded as slightly-changed: the sound differs and
he judged it acceptable). A robot has no lungs, so this is arguably the preset it should
always have been.

**Why the choir barely moved, in both stages.** A plain sustained vowel has no consonant, so
its formant curves are already two identical points and already one event, and it has no
aspiration branch at all. The saving lands on syllables that have a consonant in them.

**The two UNISON reductions were overruled INTO the bank, not accepted.** Both missed the
plan's 10 % render gate; Peter listened, said the choirs sound fine, and took them for their
note-on cost. Neither is in `accepted.json` and `accept` still refuses them — the record of
what passed a gate and the record of what Peter decided are two different files
(`decisions/D-aah-unison.json`, `decisions/D-ooh-unison.json`). Choir Aah is three singers,
Choir Ooh is two, and the pinned workloads `sixteen-aah-unison4` and `line16th-robot-breath`
still stress four singers and a breathing robot so the benchmarks did not shrink with the
presets.

**What ships, against the round-two baseline** (`results/final-shipped.json`): the rapid robot
line −41.1 %, eight held Doo-wop −15.8 %, the sixteen-note choir stress −11.2 % render and
−23.2 % build, eight held Choir Aah −10.5 % render and −23.8 % build, the Ooh pad −9.5 %
render and −26.7 % build. Nothing regressed, and the pinned fixtures did not move.

**What the drops say about where the cost is.** Removing one of the five tract filters is
worth 6 % of a choir render, and a singer is worth about 8–10 % of it. The tract is the cost,
it is not made of events, and nothing in this round could touch it.

Live check on a real-time audio thread (`work/local/jmjr4-round2-live-check.mjs`, headless
Chromium, null sink, 48 kHz): 82 rapid Robot Chant note-ons in ten seconds cost at worst
12.4 ms of audio-clock lag, an eight-note four-singer choir chord a second cost 6.7 ms, both
together 2.0 ms, and held keys, an edit under the fingers, a note-off and a panic all behaved.
The device is a null sink, so this is evidence that the engine keeps up under load and it is
still not a live CPU percentage.

## What is not done

- **The game's cues are not wired.** The fifteen baked cues in `robot_voice_cues.json`
  (actone, acttwo, actthree, budgetcuts, denied, go, haha, hahaha, hello, next, nobodyplays,
  ouch, ow, runanyway, uhoh) play through the same `renderIr` the mixer uses and `text.js`
  can regenerate them from their words at build time; nothing loads them yet. POYO, SORRY,
  BOY and LOW ON CYAN were rejected as cue candidates.
- **The live number.** Every percentage on this page is offline wall time, and so is
  `profileTrackLoad()` — it bounces offline too. Round two's live check
  (`work/local/jmjr4-round2-live-check.mjs`) is the closest thing in the tree: it drives the
  real rack on a REAL-TIME context and watches the audio clock against the wall clock, which
  catches an overloaded thread. Its output device is a headless null sink, so it still is not
  a measurement of JMJR-4's share of a real audio device, and no percentage here should be
  quoted as if it were.
- **The dictionary needs a network once.** A machine with no cached `work/local/cmudict.dict`
  and no network cannot compile a NEW phrase; every preset already carrying a block plays.
- **Ending consonants are detached.** A syllable's closing consonant is rendered as a
  separate short event at key release rather than growing out of the note, which is why
  DUM was rejected from the syllable row in favour of DEE.
- **N as a morph target.** MMM works; NNN would need the N anti-resonator built alongside
  the M one, which is a small addition now that the path exists.
- **The Simple strip's SOFT/HARD macro** was approved on the mock and deliberately not
  built: it would write the same leaves as the strip's own ATTACK and RELEASE, which the
  simple/advanced editor plan forbids. TONE (tilt, read upwards) is there.

## File map

In the repo:

| Path | Role |
| --- | --- |
| `src/engine/jmjr4/` | The engine: `data.js` (generated), `syll.js`, `dsp.js`, `note.js`, `compile.js`, `line.js`, `text.js`. |
| `src/engine/voices.js` | `_playJmjr4`, `_speakJmjr4`, `_jmjr4Bus`, `_jmjr4Line`, `_jmjr4Patch`. |
| `src/data/voices.js` | The twenty-three presets, after the TONE table's MRDR-3 entries. |
| `tools/mixer-voice-editor.js` | `SYNTH_GROUPS['JMJR-4']`, `buildJmjr4FullLayout`, the text row, `ensureJmjr4Phrase`. |
| `tools/mixer.js` | `/cmudict.json`. |
| `tests/jmjr4-*.js`, `tests/fixtures/jmjr4-text/` | The tests and the Python-written SPEAK fixtures. |
| `work/local/jmjr4-bench.mjs`, `jmjr4-ablate.mjs`, `jmjr4-audition.mjs` | The benches and the audition render (gitignored, re-creatable). |
| `work/local/jmjr4-perf.mjs` | Both passes' harness: `snapshot` freezes a baseline bundle and manifest, `compare` runs the paired timings and the full-buffer parity suite in ONE page (see its header on why two pages lied), `accept --result <file>` promotes a frozen candidate against explicit evidence, `decide` records Peter's audition call separately, `regrade` re-derives verdicts from stored raw timings. |
| `work/local/jmjr4-perf-round2-2026-09-07/` | Round two's evidence: the frozen baseline, every candidate bundle, every result, the accepted stages and the decisions. |
| `work/local/jmjr4-performance-plan-round2-2026-09-07.md` | Round two's plan with its results written into it, stage by stage. |
| `work/local/jmjr4-bias-probe.mjs`, `jmjr4-round2-live-check.mjs`, `jmjr4-loudness-match.mjs` | The benchmark-bias probe, the real-time-thread check, and the loudness-matched audition writer. |
| `tests/jmjr4-lifetimes.js` | What a note SCHEDULES and how long its sources live: the automation shapes, and the rule that no stop may ever be widened. |
| `work/local/jmjr4-perf-2026-09-06/` | That pass's evidence: the frozen baseline, every stage's raw measurements, the lifecycle audit, the dropped variants of A. |
| `work/auditions/jmjr4/jmjr4-perf-2026-09-06-final-vs-baseline/` | 28 baseline/candidate WAV pairs at both rates, with `index.json` naming each recipe and its measured error. |
| `work/local/robot_voice_fixtures.py` | Writes the SPEAK fixtures from the Python reference. |

Under `work/local/` (the Python reference and the prototype):

| Path | Role |
| --- | --- |
| `robot_voice.py` | The reference engine. 1210 lines. Phoneme table, synthesis, `compile_ir`, `render_ir`, `say`, voices, level policy. |
| `robot_voice_ui.py` | CMUdict front end, prosody, and the server that serves every page and route. |
| `robot_voice_export.py` | Writes `robot_voice_data.js` and `robot_voice_cues.json`. Run it after any table change. |
| `robot_voice_data.js` | The browser's copy of every table. Generated; never edit. |
| `robot_voice_cues.json` | Fifteen baked cues, 40 KB. The dictionary is 3.6 MB and is not shipped. |
| `robot_voice_dsp.js` | The browser renderer for an IR. |
| `robot_voice_syll.js` | The browser scheduler for note-shaped input. |
| `robot_voice_live.js` | Held notes, unison, envelope, morph, nasality, bend. |
| `robot_voice_jmjr.html` | JMJR-4. |
| `robot_voice_vox.html`, `robot_voice_play.html` | The simple instrument and the engineer's console. |
| `robot_voice_desk.css` | The desk's rules, extracted from `tools/mixer-shell.html`. Generated. |
| `robot_voice_tests.py` | The 36 checks. |
| `robot_voice_checks.html`, `_parity`, `_bench`, `_accept`, `_ab` | The browser harnesses. |
| `robot-voice-README.md` | The index, and the run instructions. |
| `robot-voice-phase*-handback.md` | The six phase handbacks. Historical. |
| `robot-voice-improvement-plan-2026-09-05.md` | Peter's plan, which the phases answer. |
| `work/auditions/robot-voice/` | Every render. `consonant-fix/`, `crush/`, `voice-controls/` are the recent ones. |

Two files are read from the repo and never written: `tools/mrdr3-knob.js` and
`tools/mixer-synth-graphs.js`, served to the page so the panel uses the desk's real knob
and the desk's real envelope graph rather than copies.
