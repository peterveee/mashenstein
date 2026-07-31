# Engine bass and kick reference

This is a translation of the current hand-written engine voices into sound-design
terms. It is intended as a replacement brief for the Song Mixer, not as a promise
that a Tone recreation will be sample-identical.

The engine does not store a fixed musical frequency in a bass patch. The song supplies
the note frequency; the patch supplies oscillator type, envelopes, filters, layers,
and relative frequencies such as a sub-octave. Engine levels are authored gains. They
do not use the measured-preset `voiceGain` path used by the Tone/noise/drum library.

## Bass voices

### Basic engine bass

| Voice | Construction | Character |
| --- | --- | --- |
| `engSquare` | Square oscillator | Default arcade body; usable on general pitched lanes. |
| `engSaw` | Sawtooth oscillator | Bright, harmonically dense, aggressive. |
| `engTriangle` | Triangle oscillator | Softer and hollow; fewer upper harmonics. |
| `engSine` | Sine oscillator | Fundamental only; easily disappears in a busy mix. |

These are simple to replace as Tone presets. The important non-frequency details are
the lane's authored gain, attack, duration, and release behavior.

### Filtered bass family

| Voice | Oscillator and layers | Filter / envelope | Intended use |
| --- | --- | --- | --- |
| `engFilteredSaw` | Sawtooth plus sine sub at 1/2 frequency | Low-pass starts around 1150 Hz and closes to 320 Hz; Q 1.15 by default | Round but present bass with a bright attack. |
| `engFilteredSawOpen` | Same saw plus sub | Opens to 2200 Hz, closes to 520 Hz, Q 1.6 | More resonant and growling. |
| `engMegamixBass` | Filtered saw plus raised sub | Opens 820 Hz, closes 260 Hz, Q 0.9; sub gain 0.21; echo off | Dark, supportive low end. |
| `engShopBass` | Filtered saw plus sub | Opens 1100 Hz, closes 310 Hz, Q 1.1; sine body, attack 0.003, duration 1.08; echo off | Shorter and bouncier shop bass. |

The filtered-saw voices are not just “a saw through a filter”: the sine sub and its
level are part of the identity. A replacement should retain those as separate layers.

### 80s bass family

| Voice | Layers | Character |
| --- | --- | --- |
| `eng80s` | Square body, sine sub at 1/2 frequency, triangle octave at 2x | Phone-friendly, three-layer bass stack. |
| `eng80sSaw` | Saw body, sine sub, triangle octave | Same construction with a harder top. |
| `engBright80sBass` | Triangle body, sine sub, triangle octave; short notes and no repeat | Bright shop variation. |

The sub, body, and octave are independently scaled. Replacing this with one Tone
instrument would lose much of the original sound; it should become a small preset
graph or three coordinated voices.

### Song-specific engine basses

| Voice | Recipe | Character |
| --- | --- | --- |
| `engTitleBass` | Slow sine; attack 0.18 s; duration 7.4 steps | Very soft, sustained nocturne bass. |
| `engFinaleBass` | Square; attack 0.001 s; duration 0.95 steps | Short, hard house bass. |
| `engFinaleBassRepeat` | Saw; duration 3.2; written repeat 3 steps later at 0.38 gain | Grid-locked ghost/repeat, not a normal delay. |
| `engLoungeBass` | Triangle; duration 1.25 steps | Soft, uncomplicated counter bass. |
| `engWalkingBass` | Sine; duration 1.85; repeat 3 steps later at 0.22 gain | Quiet shuffle/ghost-note bass. |

These are straightforward to recreate once the engine voice is treated as a complete
recipe. Their exact balance is currently held in the song bank and mixer, not in a
normalized patch definition.

## Kick voices

### The default engine kick

The engine kick is a three-part procedural 808-style sound:

1. Sine body: 165 Hz dropping exponentially to 48 Hz over 50 ms, peaking at `0.42`
   times the kick/drum trims, then decaying to near silence.
2. High-passed noise click: 1900 Hz cutoff, peaking at `0.13` times the trims,
   decaying over 12 ms.
3. Optional triangle knock: 300 Hz dropping to 180 Hz over 40 ms, peaking at `0.17`
   times the trims and ending around 50 ms.

The bank controls the subjective shape:

| Parameter | Default | Meaning |
| --- | ---: | --- |
| `kickTail` | 0.20 s | How long the sub rings. |
| `kickKnock` | 1 | Amount of the mid punch; 0 removes it. |
| `kickGain` | 1 | Per-song kick trim. |
| `drumGain` | 1 | Whole-kit trim. |

This default is itself a preset now — `engKick`, "Arcade Kick", stating `kickTail 0.2`
and `kickKnock 1` — so a bank that never tuned its kick is named after it rather than
reading `ENGINE`. The rest of the kit is named the same way: `engSnare`, `engClap`,
`engHat`, `engOpenHat`, `engRim`, `engTom`, `engCrash`. The five whose bodies read no
bank keys at all are `nameOnly` and label without being choosable.

### Named engine kick variations

| Voice | Parameters | Character |
| --- | --- | --- |
| `engShopKick` | Tail 0.15 s, knock 0.50 | Shorter boom, stronger front. |
| `engCounterKick` | Tail 0.12 s, knock 0.38 | Short and softer; timekeeping kick. |
| `engMegamixKick` | Tail 0.13 s, knock 0.56 | Strongest mid attack for a dense arrangement. |

### Existing library kick replacements

The mixer already has measurable kick alternatives:

| Preset | Construction | Character |
| --- | --- | --- |
| `kick808` | Sine MembraneSynth; pitch decay 0.05, 6 octaves; decay/release 0.5 | Closest simple replacement for the engine kick. |
| `kickTight` | Sine MembraneSynth; pitch decay 0.02, 4 octaves; decay/release 0.16 | Shorter, cleaner, less low-end smear. |
| `kickClick` | Square MembraneSynth; pitch decay 0.03, 5 octaves; decay/release 0.3 | More audible attack on small speakers. |
| `kickDeep` | Sine MembraneSynth; pitch decay 0.12, 8 octaves; decay 1.1, release 1.0 | Long sub kick; use sparingly. |
| `kickPunch` | Triangle MembraneSynth; pitch decay 0.025, 5 octaves; decay 0.28, release 0.25 | More midrange punch under a busy bass. |
| `kickDirty` | Square MembraneSynth; pitch decay 0.05, 6 octaves; decay 0.35, release 0.3 | Buzzier and more aggressive. |
| `kickThud` | Sine MembraneSynth; pitch decay 0.01, 1.5 octaves; decay 0.2, release 0.18 | Dull, restrained thud rather than a boom. |
| `dsKick` | Sine 165→48 Hz, filtered click, 20% drive | A more explicit two-source recreation of the engine kick. |
| `dsKickHard` | Sine 230→55 Hz, band-passed attack, 55% drive | Shorter and harder for dense mixes. |

## Replacement implications

- The simplest migrations are the basic basses, song-specific sine/triangle/square
  basses, and the kick alternatives.
- The filtered saw and 80s basses need layered Tone patches to preserve their identity.
- The engine kick is already documented well enough to recreate closely. `dsKick` is
  the closest existing library candidate, while `kick808` is the simpler replacement.
- Every replacement should be peak-measured, then given a small subjective patch trim
  only if listening shows that peak matching is not enough.
- The old engine voice should remain available during the track-by-track remix so each
  replacement can be compared directly before the song is saved.
