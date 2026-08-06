# The BEST presets — what each one is, and what it is showing off

Ten LayerSynth patches written to demonstrate the stack rather than to fill a lane. Render
them with `node tools/render-best-auditions.js`, which writes `work/auditions/best/<id>.wav`
— one pass of a phrase that suits the patch, through the real offline engine.

**They are rendered at song level**, then given **one makeup gain across the whole set**
(currently +13.7 dB). Each file is not normalised on its own: the engine already levels
every preset to its lane's measured energy target, so the choir and the bass are *meant* to
arrive equally loud, and their peaks differ only because a pad and a bass have different
crest factors. Normalising per file would throw that away.

## The trick most of these turn on

A layer filter with **KEY FOLLOW at zero does not track the note** — so it is a **formant**,
a fixed resonance the pitch moves underneath. Three layers is three formants, which is a
vowel, which is a voice. That is how singing works, and it is what a synth with one filter
per voice cannot say. The vowels below are the published formant tables.

## Voices

| Preset | Lane | What it is |
| --- | --- | --- |
| **BEST Choir Aah** | chords | The /a/ vowel — bandpass formants at 800, 1150 and 2900 Hz on three detuned saws, delayed vibrato, slow swell. Nine oscillators with unison |
| **BEST Choir Ooh** | chords | The /u/ vowel — 320, 800, 2250 Hz, rounder and darker, with a **noise layer** as breath. A noise layer is a full member of the stack: its band follows the note, so it sits *with* the voice instead of hissing over it |
| **BEST Voice Box 70s** | lead | The tube-in-the-mouth lead. Two formants move in **opposite directions** — one opening (+1.7 oct), one closing (−1.3 oct) — which is a mouth changing shape; the LFO does it repeatedly. Mono with a 55 ms glide, drive 0.42. Its body layer is a **22% pulse** — the even harmonics are what make it read as a reed. This is what bipolar ENV AMOUNT is for |
| **BEST Robot Vox** | lead | A vocoder that never met a singer: square carrier, an FM operator at 2.01 buzzing the /o/ formants, a −1 semitone pitch drop into every note, fold drive |
| **BEST Vowel Pad** | chords | Formants that drift between /o/ and /a/ across a held chord — deep slow filter movement under one shared lowpass. Unison on every layer: nine oscillators wide |

## Leads

| Preset | Lane | What it is |
| --- | --- | --- |
| **BEST Mega Saw Lead** | lead | Eleven oscillators — two 5-voice unison saws a fifth apart plus a sub — through **one** shared filter that opens 4.6 octaves per note. The shared stage is the point: eleven separate filters would be eleven sounds |
| **BEST Hero Lead** | lead | Mono with a real glide **and** a 2-semitone blip into every note — the pitch envelope and the portamento running at once, which was impossible until they stopped sharing `.frequency` |
| **BEST Screamer Lead** | lead | An FM operator at a deliberately inharmonic 2.47 puts metal on the saw; the fold shaper makes more level a *different* sound rather than a louder one |

## Basses

| Preset | Lane | What it is |
| --- | --- | --- |
| **BEST Monster Bass** | bass | Sine sub, saw body, square an octave up for teeth — all arriving at one filter that slams 4.2 octaves open and shut per note. The growl is the **shared** envelope, not three that happen to agree |
| **BEST Reese Bass** | bass | Two saws detuned ±14 cents so they beat against each other — the 1988 Reese — over a clean, undetuned sine sub, because a sub that beats is a sub that vanishes on a phone. The LFO walks the shared filter |

## The PWM family

Ten more, built on the one thing a wavetable cannot do: a width that **moves**. A
`PeriodicWave` is immutable, so a modulated pulse is built the other way — `pulse(t) =
saw(t) − saw(t − duty/f)`, two band-limited sawtooths differenced through a delay line
whose time an LFO drives. Zero DC by construction, since both saws share a mean.

**Each layer carries its own PWM rate**, and that is the whole design. One LFO driving
three widths in lockstep is one oscillator getting fatter and thinner; three rates that
never line up is a section. It is the Jupiter-8 answer rather than the Juno one — the Juno
had a single DCO per voice and got its width from a chorus pedal instead.

| Preset | Lane | What it is |
| --- | --- | --- |
| **BEST PWM Strings** | chords | The string machine. Two pulses drifting at 0.28 and 0.37 Hz over a clean saw sub — rates chosen not to line up |
| **BEST PWM Brass** | chords | The Jupiter brass stab: pulse leaning on saw, width moving fast enough to hear inside a short note, filter opening three octaves |
| **BEST PWM Pad Wide** | chords | Three pulses at three rates, all slow and deep, through a filter the LFO also breathes |
| **BEST PWM Bass** | bass | A moving pulse body over a sine sub left deliberately **alone** — modulate the sub and the weight goes with it |
| **BEST PWM Growl Bass** | bass | Fast deep width modulation into the fold shaper. A different sound every few milliseconds |
| **BEST PWM Hollow Lead** | lead | The Oberheim hollow lead — two pulses near a quarter duty, shimmering rather than wobbling |
| **BEST PWM Reed Lead** | lead | A 15% pulse through a static bandpass: the formant trick and the moving width in one patch |
| **BEST PWM Clav** | lead | Percussive, narrow, with a filter envelope that shuts as fast as it opens |
| **BEST PWM Choir** | chords | The /a/ formants over drifting pulses instead of plain saws — the source moving is what makes it a section |
| **BEST PWM Drift** | lead | Periods of fourteen, nine and twenty seconds, so the texture never repeats inside anything you would write |

Three of the original ten were revisited where PWM genuinely helped: **BEST Vowel Pad**
(the formant source now drifts), **BEST Mega Saw Lead** (its square sub is a slow-PWM pulse
— free width where a twelfth oscillator would have cost a voice), and **BEST Voice Box 70s**
(slow PWM on the reed body, which is the breath a talk box has). The other seven are
untouched.

## Notes

- Every one is measured (`level`/`peak` in `src/data/voices.js`), so they arrive at the right
  level on any lane without further dialling.
- `BEST Screamer Lead` renders at a peak of 0.993 at unity — that is the fold shaper
  reaching full scale by design, not clipping in play, where `voiceGain` scales it down.
- The choirs measure quiet (level 0.029, 0.048) because bandpass formants throw most of a
  saw's energy away. That is what the measurement is for: they still arrive level.
- **The pads carry no `drive`, on purpose.** A `WaveShaper` clamps at ±1, and the engine
  normalises ENERGY — so a dense, low-crest stack needs enough gain to reach the lane's
  target that its peaks run into the shaper and come back flat. The tell is a measured peak
  pinned at exactly 0.7 (full scale through the 0.7 music bus). Lowering the layer gains
  cannot fix it — the engine just turns it up again. Taking the drive off can, and did:
  `BEST PWM Strings` went from a pinned 0.7 to an honest 0.836.
  Nineteen **drum** presets sit on that same ceiling and are meant to: driving the shaper
  is what an 808 kick IS. Do not "fix" those.
