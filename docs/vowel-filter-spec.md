# Vowel Filter — insert effect spec

A formant bank as an ordinary entry in the effect catalogue, in the shape D16's LuSH-101
gives it: a voice type, a vowel sequence, a rate that walks it, resonance, stereo spread,
and a wet blend.

It is an **insert**, not a synth section. The reasoning is short enough to restate: a
biquad is linear, so one formant bank downstream of a summed chord is sample-identical to
one bank per note summed — per-note placement costs N× for no difference. Everything the
rack already provides (bypass, wet/dry, reorder, copy/paste, and the generated panel)
would have to be rebuilt inside MRDR-3 to get a worse version usable by one synth. The
current custom-effect API does not expose scheduled variant automation; live edits and
the sequencer scheduler remain supported.

What this does **not** do is rewrite the existing vowel-oriented presets in
`src/data/voices.js`. Several deliberately use different sources, envelopes, detunes,
noise, and per-layer movement, so carrying this insert inside a preset is a separate
feature, sketched in §9, deliberately not blocked on this one.

---

## 1. Signal graph

```
        ┌───────────────────────────────── dry ────────────────────────────┐
        │                                                                  ▼
input ──┼──▶ body LP(F1) ──▶ body ─────────────────────────────────────────┤
        ├──▶ bp1 (F1) ──▶ g1 ─┐                                            │
        ├──▶ bp2 (F2) ──▶ g2 ─┼──▶ bank ──▶ wet ──────────────────────────▶┼──▶ output
        ├──▶ bp3 (F3) ──▶ g3 ─┘                                            │
        └──▶ HP 3.2k ──▶ peak(F4) ──▶ peak(F5) ──▶ air ────────────────────┘
```

Twenty nodes, built once per slot and never rebuilt: a low-passed body return, 3
`BiquadFilter` formants, 3 `StereoPannerNode` formant positions, 3 formant gains, a
high-passed air return through 2 peaking `BiquadFilter`s + `bank` + `wet` + `dry` +
`input` + `output`. Biquads and panners pass stereo through natively, so the insert is
stereo-out-whatever-goes-in with no channel work, as
[SONG_MIXER.md:1074](SONG_MIXER.md) requires.

**Three bands are a reed, not a voice.** Measured against its own input, the bank alone
is ~15 dB down below F1 and ~35 dB down above 3 kHz: nothing carries the glottal weight
and nothing carries presence or air, so every vowel arrives thin whatever the source. The
two returns are the fix, and each is the acoustically correct one rather than a corrective
EQ. **BODY** is a low-pass whose corner tracks F1 — that is where the vowel's own weight
sits, and a fixed corner was above F1 for /i/ and /u/ and below it for /a/. **AIR** is a
high-passed pass-through above F3 carrying F4/F5, because above the third formant a tract
mostly passes what the source gives it.

**Why F4/F5 are series, not two more bands.** Summing bandpasses at F4/F5 alongside F3
puts a cancellation notch on F3: measured on alto /a/ it buried the third formant by 7 dB
and moved its peak out of its own window, because adjacent parallel bandpasses meet in
antiphase between their centres. Two peaking filters on the air tap add the same
resonances in series, where there is nothing to cancel against.

**Parallel, not cascaded.** Three bandpasses in series would be one narrow filter at
their intersection — which is nothing, since the formants do not overlap. Parallel with
per-formant gain is what a vocal tract is.

**Level.** The insert uses the catalogue's equal-power crossfade:
`dry.gain = cos(wet · π/2)` and `wet.gain = sin(wet · π/2)`. Sitting at `wet: 0` is
sample-identical to bypass. The bank makeup is energy-normalised as
`1.55 / sqrt(Σ 10^(dB/10))`, capped at 1.8, and recomputed whenever the vowel moves.
That controlled lift keeps the formant movement audible against a full-range synth
without allowing an extreme table to run away in level.

**The wet knob is the feature, not a courtesy.** Three narrow bandpasses discard
everything below F1 and everything between the formants — the formant-only path would
discard a bass part. `bestChoirAah` is effectively pinned there today because its formants
*are* its signal path. The BODY and AIR returns, both scaled by `sin(wet · π/2)`, follow
the wet amount: they preserve the glottal weight and the top octaves without restoring
the whole dry signal. Sitting at 0.4 gives vowel colour
over an intact synth; the catalogue default is deliberately assertive at **0.9** with
2× resonance and a fast 1/16-note walk, so the formant movement reads as a vowel instead
of a parallel thickener. Set `wet: 1` for a synthetic
talkbox with retained low body; pull it toward 0.5 when the source needs more dry detail.
The formant bands can also spread across the stereo field: **SPREAD** places F1 left,
F2 centre, and F3 right, while zero keeps the bank centred.

---

## 2. Registry entry

One entry in `EFFECTS`, beside `peq` — same shape and `custom` builder. The panel
generates itself from `params` / `ranges` / `labels`; no new widget or CSS is required,
but the explicit effect-picker group must include the new id.

```js
{ id: 'vowel', name: 'Vowel Filter', short: 'Vowel', cost: 0.80,
  custom: makeVowelFilter,
  params: ['voice', 'stack', 'rateSync', 'rateDivision', 'frequency',
           'depth', 'glide', 'reso', 'spread', 'tilt', 'intensity', 'body', 'air', 'wet'],
  defaults: { voice: 'alto', stack: 'a e i o u', rateSync: 1, rateDivision: 0.5,
              frequency: 0.5, depth: 1, glide: 0.08, reso: 2, spread: 0.9,
              body: 0.5, air: 0.25, tilt: 0.45, intensity: 0, wet: 0.9 },
  ranges: {
    voice: { options: ['robotic', 'soprano', 'alto', 'countertenor', 'tenor', 'bass'] },
    stack: { options: ['a', 'e', 'i', 'o', 'u',
                       'a e', 'a o', 'o u', 'i a',
                       'a e i', 'o a e', 'u o a',
                       'a e i o u', 'u o a e i'] },
    frequency: { min: 0.05, max: 8, step: 0.01, unit: 'Hz', log: true },
    reso: { min: 0.3, max: 3, step: 0.05 },
    glide: { min: 0, max: 1, step: 0.01 },
    spread: { min: 0, max: 1, step: 0.01 },
  },
  labels: { voice: 'VOICE', stack: 'VOWEL STACK', rateDivision: 'RATE',
            frequency: 'RATE', depth: 'DEPTH', glide: 'GLIDE', reso: 'RESO', spread: 'SPREAD' } },
```

`stack` as a **dropdown of sequences** rather than LuSH's free stack editor is the one
deliberate simplification. It costs a handful of the sequences anyone actually uses and
buys zero new widgets — [mixer.js:489](../tools/mixer.js#L489) already draws a dropdown
for anything carrying `options`. A stack editor can replace it later without touching the
engine, because the param stays a string either way.

`rateSync` / `rateDivision` / `frequency` follows the flanger and phaser convention
([effects.js:1766](../src/engine/effects.js#L1766)) rather than the delay's
`sync`/`division`/`delayMs`, because this is a modulation rate, not a time.

---

## 3. Controls

| Control | Key | Does |
| --- | --- | --- |
| **VOICE** | `voice` | which formant table — five sung registers plus `robotic` |
| **VOWEL STACK** | `stack` | the vowel sequence the walker visits, space-separated |
| **RATE** | `rateSync` · `rateDivision` · `frequency` | how fast it steps; synced to a note division or free in Hz |
| **DEPTH** | `depth` | how far from the *first* vowel it travels. 0 parks on vowel one — a static formant filter; 1 visits every vowel fully. Positions interpolate: `pos(n) = lerp(vowel[0], vowel[n], depth)` |
| **GLIDE** | `glide` | 0 uses a roughly 4ms snap between vowels (robotic, rhythmic); 1 slides continuously (a word). Above zero the time constant is `max(4ms, glide × 0.45)` of the step period. The default 0.08 keeps boundaries sharp |
| **RESO** | `reso` | multiplies every formant's Q. 1 is the published bandwidth |
| **SPREAD** | `spread` | places F1/F2/F3 from centre toward left/centre/right. 0 is centred; 1 is full separation |
| **TILT** | `tilt` | how much of the table's *singer's* amplitude rolloff to keep. 1 is the published rolloff; 0 is flat like `robotic`. The default 0.45 lifts F3 about 7 dB, because at the published level F3 is inaudible — and F3 is where the VOICE types differ |
| **INTENSITY** | `intensity` | crossfade from one pass through the formant bank to two. Two passes square the response, so every dB of formant contrast doubles — measured on the bare bank, 17.6 dB of peak-to-valley becomes 31.0 dB. Defaults to 0 |
| **BODY** | `body` | level of the low-pass return whose corner tracks F1 — the voiced weight under the vowel. 0 is the bare bank |
| **AIR** | `air` | level of the high-passed return above F3, shaped by the voice's F4/F5. 0 closes the top |
| **FX** | `wet` | the blend |

`depth` and `wet` are separate on purpose and it is worth being explicit, because one knob
called "amount" would collapse two different things: `depth` decides *how much vowel
movement*, `wet` decides *how much filter at all*. `depth: 0, wet: 0.5` is a fixed
formant colour — the useful setting the existing presets can't reach. `depth: 1, wet: 1`
is a talkbox.

---

## 4. `src/engine/formants.js` — new module

The tables are shared data, not effect-private: the hardcoded `vox` and `shout` lanes at
[audio.js:3659](../src/engine/audio.js#L3659) carry their own copies today
(`[750, 1150]` / `[600, 2000]`, and `shout`'s `[time, F1, F2]` trajectories), and so do
seven MRDR-3 presets. One module lets them converge.

Each entry is `[F1, F2, F3]` in Hz, `dB` relative amplitudes, `bw` bandwidths in Hz. Q is
derived, not stored — see §5.

```js
export const FORMANTS = {
  bass: {
    a: { f: [600, 1040, 2250], dB: [0, -7, -9],   bw: [60, 70, 110] },
    e: { f: [400, 1620, 2400], dB: [0, -12, -9],  bw: [40, 80, 100] },
    i: { f: [250, 1750, 2600], dB: [0, -30, -16], bw: [60, 90, 100] },
    o: { f: [400, 750, 2400],  dB: [0, -11, -21], bw: [40, 80, 100] },
    u: { f: [350, 600, 2400],  dB: [0, -20, -32], bw: [40, 80, 100] },
  },
  tenor: {
    a: { f: [650, 1080, 2650], dB: [0, -6, -7],   bw: [80, 90, 120] },
    e: { f: [400, 1700, 2600], dB: [0, -14, -12], bw: [70, 80, 100] },
    i: { f: [290, 1870, 2800], dB: [0, -15, -18], bw: [40, 90, 100] },
    o: { f: [400, 800, 2600],  dB: [0, -10, -12], bw: [40, 80, 100] },
    u: { f: [350, 600, 2700],  dB: [0, -20, -17], bw: [40, 60, 100] },
  },
  countertenor: {
    a: { f: [660, 1120, 2750], dB: [0, -6, -23],  bw: [80, 90, 120] },
    e: { f: [440, 1800, 2700], dB: [0, -14, -18], bw: [70, 80, 100] },
    i: { f: [270, 1850, 2900], dB: [0, -24, -24], bw: [40, 90, 100] },
    o: { f: [430, 820, 2700],  dB: [0, -10, -26], bw: [40, 80, 100] },
    u: { f: [370, 630, 2750],  dB: [0, -20, -23], bw: [40, 60, 100] },
  },
  alto: {
    a: { f: [800, 1150, 2800], dB: [0, -4, -20],  bw: [80, 90, 120] },
    e: { f: [400, 1600, 2700], dB: [0, -24, -30], bw: [60, 80, 120] },
    i: { f: [350, 1700, 2700], dB: [0, -20, -30], bw: [50, 100, 120] },
    o: { f: [450, 800, 2830],  dB: [0, -9, -16],  bw: [70, 80, 100] },
    u: { f: [325, 700, 2530],  dB: [0, -12, -30], bw: [50, 60, 170] },
  },
  soprano: {
    a: { f: [800, 1150, 2900], dB: [0, -6, -32],  bw: [80, 90, 120] },
    e: { f: [350, 2000, 2800], dB: [0, -20, -15], bw: [60, 100, 120] },
    i: { f: [270, 2140, 2950], dB: [0, -12, -26], bw: [60, 90, 100] },
    o: { f: [450, 800, 2830],  dB: [0, -11, -22], bw: [70, 80, 100] },
    u: { f: [325, 700, 2700],  dB: [0, -16, -35], bw: [50, 60, 170] },
  },
  // Not a person. Flat amplitudes and narrow fixed bandwidths — the resonances all
  // arrive at full strength with no upper rolloff, which is what makes a talkbox read
  // as a machine rather than as a singer. It is in the VOICE list rather than being a
  // separate algorithm for exactly the reason D16 puts it there: it is the same three
  // filters with the human part taken out.
  robotic: {
    a: { f: [800, 1150, 2900], dB: [0, 0, 0], bw: [40, 50, 60] },
    e: { f: [400, 1700, 2700], dB: [0, 0, 0], bw: [40, 50, 60] },
    i: { f: [300, 1900, 2900], dB: [0, 0, 0], bw: [40, 50, 60] },
    o: { f: [450, 800, 2600],  dB: [0, 0, 0], bw: [40, 50, 60] },
    u: { f: [325, 700, 2500],  dB: [0, 0, 0], bw: [40, 50, 60] },
  },
};
```

> **Source.** The human rows are the first three formants from Csound's published
> [Formant Table III](https://www.classes.cs.uchicago.edu/archive/1999/spring/CS295/Computing_Resources/Csound/CsManual3.48b1.HTML/Appendices/table3.html).
> The `robotic` rows are an authored equal-amplitude extension for deliberately synthetic
> voicings. Keep this provenance if the table changes.

---

## 5. Q from bandwidth, and what RESO actually multiplies

`Q = f / bw`, scaled by the knob:

```js
const q = (f, bw, reso) => Math.max(0.1, Math.min(150, (f / bw) * reso));
```

Soprano /a/ therefore lands at Q ≈ 10 / 12.8 / 24 rather than a flat guess. That is
sharper than the hand-tuned 7 / 9 / 11 in `bestChoirAah`, and correctly so: those presets
had to keep Q low because they were 100% wet and needed to leave some body behind. With a
dry blend the accurate Q is the better one.

The hand-tuning in the existing presets is also the argument that one RESO knob is enough.
`bestChoirAah` is 7/9/11 and `bestRobotVox` is 10/12/14 — the same rising-with-index
shape at two different bases. `f / bw` reproduces the shape; `reso` is the base. The
separate 1.55× makeup lift is output contrast, not extra resonance, and is capped before
it reaches the bank.

---

## 6. The walker

The custom node exposes `node.scheduleRhythm(step, when, sixteenth, bpm, swing)` from
[audio.js:3030](../src/engine/audio.js#L3030), the same hook `rhythmgate` uses. On each
sixteenth the walker works out which vowel the stack is on and schedules the nine
parameters — 3 × `frequency`, 3 × `Q`, 3 × `gain` — plus the bank makeup.

**It follows swing**, and this is the thing the reference plugin cannot do: a vowel step
landing on an off-beat sixteenth of a shuffled song is late with the song. The parity rule
is not restated here — it is the one in
[makeRhythmicGate](../src/engine/effects.js#L1761), verbatim, including that divisions of
an even number of sixteenths never move and triplets are left alone.

**Discontinuity handling** is `rhythmgate`'s as well: cancel and re-seat the nine params
when the step is not the continuation of the last one, or when a loop, jump, tempo change
or param edit invalidates what is already queued. Sign the state with
`voice|stack|rateSync|rateDivision|frequency|depth|glide|reso|bpm|swing` for the comparison.

Unsynced (`rateSync: 0`), the walker runs off `frequency` in Hz and ignores the grid;
`scheduleRhythm` still drives it, just against wall-clock periods rather than beats.

**Stepping vs gliding.** At `glide: 0` each vowel uses a roughly 4ms target snap at its
boundary: it reads as a step without introducing a filter-coefficient click. Above zero
the nine params ramp with `setTargetAtTime` at a time constant of
`max(4ms, glide × 0.45 × period)`, so a full-glide walk never quite arrives before it
leaves — which is what makes a vowel sequence read as a word rather than as five filter
settings. F1 and
F2 crossing in opposite directions is the whole of the talkbox sound, and it falls out of
this for free.

---

## 7. Files

| File | Change |
| --- | --- |
| `src/engine/formants.js` | **new** — the tables above, plus `vowelAt(voice, stack, position)` returning an interpolated `{f, dB, bw}` triple, and `UPPER_FORMANTS` / `upperFormants(voice)` for the singer's fixed F4/F5 pair |
| `src/engine/effects.js` | `makeVowelFilter`, one `EFFECTS` entry, native body return, per-formant panners, and `ranges` keys (`reso`, `glide`, `spread`, `voice`, `stack`) |
| `src/data/effect-presets.js` | source-backed defaults for the string and numeric parameters |
| `tools/mixer-entry.js` | add `vowel` to the Level & EQ picker group |
| `docs/SONG_MIXER.md` | catalogue row under Filters, with the measured cost |
| `tests/formants.js` | pure table and interpolation contracts |
| `tests/mix.js` | picker, ranges, labels, and visibility contracts |
| `tests/new-effects.js` | render cases — see below |
| `tools/measure-new-effects.js` | measured native graph/scheduler cost |

No new mixer widget or `tests/pot-coverage.js` work (that suite covers voices only).
`tests/effect-presets.js` picks the new entry up from `EFFECTS`, and its defaults must
round-trip through `tools/lib/effect-presets-source.js`, including the string-valued
`voice` and `stack` parameters.

**Cost must be measured, not assumed.** The current native bench reports `0.34%` of one
core for the sixteen-node graph with its scheduler hook; rerun it after any graph change.
The catalogue's prices are measured, and [effects.js:1901](../src/engine/effects.js#L1901)
records that intuition is unreliable.

### Tests

Offline renders through Chromium, matching `tests/new-effects.js`'s existing shape:

1. **Unity at `wet: 0`** — output is sample-identical to input. This is the no-3-dB rule.
2. **Formant peaks land** — a broadband impulse in, FFT out, energy peaks within one
   FFT bin or half a declared bandwidth of the table's F1/F2/F3 for a known
   `voice`/vowel at `depth: 0`.
3. **RESO widens and narrows** — higher `reso` produces monotonically narrower peak
   bandwidth in an unclamped test range.
4. **`depth: 0` is static** — two windows a second apart have the same spectrum.
5. **The body survives full wet** — the low-frequency return remains measurable at `wet: 1`.
6. **It is not thin** — at the defaults the impulse spectrum keeps measurable energy in
   the F4/F5 region and across 6–12 kHz relative to F1, and `body: 0, air: 0` measurably
   closes the top again, which is what proves the returns are carrying it.
7. **SPREAD is stereo-only** — full spread separates a mono input while zero spread remains
   centred.
8. **The walk is on the grid** — at `rateDivision: 1` and `glide: 0`, the vowel boundaries
   land on beats; at swing 66 with an odd division they land late by the swing shift.
9. **No dead knobs** — every parameter the desk shows is swept end to end and must move
   the render, each in the mode the panel shows it in (FREQUENCY only exists unsynced).
10. **No clicks** — the 4ms `glide: 0` snap has no transition outlier beyond the
   calibrated continuous-input threshold across a vowel boundary.

---

## 8. Not in v1

- **A free vowel-stack editor.** The dropdown covers it; revisit if the fixed sequences
  chafe.
- ~~**F4/F5.**~~ Shipped, after the three-band bank measured 35 dB down above 3 kHz and
  read as thin on every source. They are *not* two more bands in the parallel bank — that
  cancels F3 — but two peaking filters on the AIR return, and they need no scheduling at
  all, because F4/F5 are properties of the singer rather than of the vowel.
- **Per-formant gain pots.** The table's amplitudes are the point. Exposing them makes the
  VOICE selector meaningless and turns the effect into a three-band parametric, which
  exists already. TILT is deliberately *not* this: it scales the published rolloff rather
  than replacing it, so every voice keeps its own shape and only the depth of the singer's
  rolloff changes.

### How far it can be pushed, and what actually limits it

RESO is close to inert as a *pronouncedness* control, and this is worth stating because it
is the knob everyone reaches for: swept across its whole 0.3–3 range it moves formant
peak-to-valley contrast by well under a dB. Narrowing a peak cannot lower the floor
between peaks, and the floor is what the ear reads.

The floor is the ceiling. Three parallel returns set it — the dry path, BODY and AIR —
and INTENSITY is the one control that beats the bank's own share of it, by running the
vowel through itself so the response is squared. On the bare bank it takes contrast from
17.6 dB to 31.0 dB. At the shipped defaults it barely shows, and that is not a fault in
the knob: BODY and AIR are deliberately holding a floor 20 dB above where the squared
bank's valleys land, so they mask it. INTENSITY is absolute — it always means how many
passes through the bank — and the other three decide how much of the result you hear.

The measured recipe for the most pronounced setting the insert can reach:
`intensity: 1, wet: 1, body: 0.2, air: 0.08`. That is a hard talkbox and it gives up most
of the weight and air, which is the trade being made and the reason it is not the default.

### How distinct are the VOICE types, really

Measured as dB RMS of spectral shape on /a/ with level removed, the sung registers are
much closer to each other than two vowels are to each other:

| | vs | distance |
| --- | --- | --- |
| alto | soprano | **1.2** |
| tenor | countertenor | 1.8 |
| bass | soprano | 3.7 |
| bass | robotic | 3.8 |
| alto /a/ | alto /i/ | **6.0** |

That is the source table, not the implementation: Csound gives alto and soprano the
*identical* F1 and F2 for /a/ (800 / 1150 Hz), so F3 is the only thing separating them —
and the published rolloff puts it 20 and 32 dB down respectively. TILT at 0.45 and the
more open AIR default are what make the difference audible at all; they lift F3 and the
per-voice F4/F5 pair, and together they raise average voice separation from 3.25 to 4.08.
Do not expect VOICE to read like a vowel change. It reads like a different singer, which
is what it is. If a bigger jump is wanted, the honest lever is a vocal-tract-length scale
on all five formants rather than more knobs on the existing table.
- **Migrating `vox` / `shout` onto `formants.js`.** Worth doing, changes their sound,
  therefore its own change with its own null-test check.

## 9. Phase 2 — a preset that carries it

An insert lives on the lane; an MRDR-3 preset travels between lanes. So this does not by
itself let `bestChoirAah` be rewritten.

The mechanism, when it happens, is the one originally asked about: a preset may declare
**one** insert, instantiated on the lane's voice node when the preset is loaded, ahead of
the strip's six user slots. Restricting it to one, and to the tail of the voice rather
than inside `_playLayer`'s per-note graph, is what keeps it honest — a stateful effect
built per note-on is not the effect it claims to be (a chorus rebuilt every keypress is a
comb filter), and the rack's own history records a per-layer routing flag that was tried
and lost ([voices.js:1881](../src/engine/voices.js#L1881)).

The payoff is potentially concrete, but it is not a v1 promise: each candidate preset
needs a sound-by-sound null/listening check before its per-layer formants are replaced by
one post-sum insert.

## 10. Vowel improvements — implemented extension

The insert now also exposes four wet-source and motion controls:

| Control | Key | Behaviour |
| --- | --- | --- |
| **WAVE SHAPE** | `waveform` | `step`, `sine`, `triangle`, `saw up`, `saw down`, `square`, or deterministic `random` traversal of the vowel stack. RATE remains the duration of one stack slot. |
| **ARTICULATION** | `articulation` | Dips and reopens the complete wet vocal path at scheduled vowel boundaries, producing syllable-like attacks while leaving the dry path continuous. |
| **EXCITE** | `excite` | Adds a symmetric native WaveShaper branch before the wet formant paths, so dark sources have harmonics for F2/F3 to shape. The dry path is untouched. |
| **BREATH** | `breath` | Adds an input-derived high-passed transient at vowel boundaries. It is not a free-running noise source and stays silent with zero input. |

`INTENSITY` now derives effective BODY/AIR leakage directly from its current value while
crossfading the one-pass and two-pass banks. It remains path-independent: moving a control
directly to a value produces the same result as arriving there through intermediate values.
The existing `wet: 0` transparency and deterministic OfflineAudioContext contract still
apply to every new control.

## 11. Named effect presets

The source-backed `EFFECT_PRESETS.inserts.vowel.presets` map contains the initial named
starting points:

- Talking Robot
- Monster O-A
- Breathy Choir
- Chopped I-A
- Hard Talkbox

The Mixer displays these through a generic effect-card PRESET dropdown whenever an effect has
named presets. Choosing one writes a complete parameter snapshot into the current effect
instance, preserves id/order/bypass/routing, and does not create a live reference to future
source-data changes. Any subsequent edit is displayed as Custom. Effects with no named
presets do not receive an empty dropdown.
