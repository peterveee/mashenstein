# VOWEL improvements

Implementation handoff for GPT-5.6 Luna Max.

Status: approved implementation plan, not yet implemented.

This plan extends the existing Song Mixer **Vowel Filter** in four coordinated areas:

1. harmonic excitation before the formant bank;
2. a stronger, coherent `INTENSITY` / vocal-contrast response;
3. syllable articulation plus selectable modulation wave shape; and
4. a small reusable named-preset dropdown for effects, initially populated for Vowel.

The current effect is already a functioning native Web Audio insert. Preserve its existing
formant tables, tempo/free motion, swing handling, wet-zero transparency, offline rendering,
body/air restoration, F4/F5 presence, stereo spread, state persistence, and existing mixes.
This is an enhancement, not a rewrite.

---

## 1. Product outcome

The Vowel Filter should be able to move through three useful identities without changing
effects:

- a gentle vowel colour over the original source;
- an unmistakable animated talkbox; and
- a deliberately synthetic, sharply articulated robot/monster voice.

The most important perceptual change is that the insert must still speak when the source is
not already a bright saw or square wave. More `RESO` is not the solution: the current spec
and measurements already establish that narrowing the resonances barely changes the floor
between them. The improvement must instead give the bank harmonics to shape, reduce the
unshaped floor when asked, and articulate the boundaries between syllables.

The preset dropdown should make those identities immediately discoverable and establish a
small generic mechanism that later effects can reuse without receiving effect-specific UI.

---

## 2. Approved scope

### 2.1 Vowel DSP

Add these effect parameters:

| UI label | Key | Type | Range/default | Purpose |
| --- | --- | --- | --- | --- |
| `EXCITE` | `excite` | continuous | `0..1`, default `0` | Add source-dependent harmonics before the vowel bank. |
| `BREATH` | `breath` | continuous | `0..1`, default `0` | Add input-following, high-passed deterministic breath at vowel attacks. |
| `ARTICULATION` | `articulation` | continuous | `0..1`, default `0` | Turn smooth changes into syllables by dipping/reopening the vocal wet path at boundaries. |
| `WAVE SHAPE` | `waveform` | choice | default `step` | Choose how modulation travels through the vowel stack. |

`INTENSITY` remains an existing parameter and key. Change its internal behaviour so it is a
coherent vocal-contrast control, not only a crossfade into the second formant bank.

### 2.2 Reusable effect presets

Add one compact `PRESET` dropdown to an effect card when that effect has one or more named
presets in `src/data/effect-presets.js`.

The initial named presets belong only to `inserts.vowel.presets`. Do not invent presets for
every catalogue effect in this change. The UI and resolver must nevertheless be generic so
adding data for another insert later makes the same dropdown appear without more bespoke
code.

### 2.3 Vowel named presets

Ship a small auditioned set covering distinct use cases:

1. `Talking Robot`
2. `Monster O–A`
3. `Breathy Choir`
4. `Chopped I–A`
5. `Hard Talkbox`

The exact final numeric values are an auditioning task. Section 11 provides starting
values, constraints, and intent; they are not permission to skip listening.

---

## 3. Explicit non-goals

- Do not add vocal-tract `SIZE`, formant shift, tract warp, dual-mouth stereo, consonant
  spelling, a free-form vowel-stack editor, or per-formant knobs in this change.
- Do not migrate the engine's existing `vox`, `shout`, or MRDR-3 vowel presets.
- Do not add user-authored effect-preset saving, renaming, deletion, import, export, or a
  preset library window. This is a simple checked-in dropdown.
- Do not reinterpret existing song data or silently add new parameters to stored effect
  entries. Missing keys must receive catalogue defaults.
- Do not change the existing effect's identity, id (`vowel`), ordering, six-slot limit, or
  placement under `Level & EQ`.
- Do not use a Tone AudioWorklet or nondeterministic `Math.random()` path. Live and offline
  output must remain the same.
- Do not place Vowel inside individual synth voices. It remains one lane insert.
- Do not make preset selection a live reference to library data. A selected preset is a
  starting-point snapshot for the current effect instance.

---

## 4. Current architecture to preserve

The implementation lives primarily in:

- `src/engine/effects.js`: `makeVowelFilter`, parameter catalogue, default overlay,
  `createEffect`, parameter visibility;
- `src/engine/formants.js`: vowel/voice tables and interpolation;
- `src/data/effect-presets.js`: source-backed defaults and currently empty named-preset
  maps;
- `tools/mixer-entry.js`: generic effect-card UI and the direct live `link.set(...)` path;
- `tools/lib/effect-presets-source.js`: atomic DEV default writer that already preserves
  named-preset objects;
- `tests/formants.js`, `tests/mix.js`, `tests/effect-presets.js`, and
  `tests/new-effects.js`: pure, catalogue, persistence, and real offline-render contracts;
- `tools/measure-new-effects.js`: effect CPU measurement.

The present Vowel graph has dry, body, air/F4/F5, one-pass formant, and optional two-pass
formant branches. The body and air branches connect independently to output. Refactor them
through one vocal-wet sum/gain so articulation and intensity can act coherently on the
complete vowel without touching the dry source.

At `wet: 0`, the output must remain sample-identical to input. At all legacy parameter
defaults (`excite = breath = articulation = 0`, `waveform = step`) the render must remain
within the existing tolerance of the pre-change render.

---

## 5. Parameter and compatibility contract

Add the keys to the Vowel catalogue in this proposed order:

```js
params: [
  'voice', 'stack', 'rateSync', 'rateDivision', 'frequency', 'waveform',
  'depth', 'glide', 'articulation', 'reso', 'spread', 'tilt', 'intensity',
  'excite', 'breath', 'body', 'air', 'wet',
]
```

Recommended catalogue additions:

```js
defaults: {
  // existing values unchanged
  waveform: 'step',
  articulation: 0,
  excite: 0,
  breath: 0,
},
ranges: {
  waveform: {
    options: ['step', 'sine', 'triangle', 'saw up', 'saw down', 'square', 'random'],
  },
  articulation: { min: 0, max: 1, step: 0.01 },
  excite: { min: 0, max: 1, step: 0.01 },
  breath: { min: 0, max: 1, step: 0.01 },
},
labels: {
  waveform: 'WAVE SHAPE',
  articulation: 'ARTICULATION',
  excite: 'EXCITE',
  breath: 'BREATH',
},
```

If `waveform` conflicts semantically with another effect's shared range, use the Vowel
definition's local `ranges.waveform`, as the existing catalogue already supports local
range overrides. Do not broaden the global range merely to accommodate Vowel.

Compatibility rules:

- Old songs omit the new keys and therefore use the new zero/off defaults plus `step`.
- Existing songs with explicit Vowel parameters retain those exact values.
- The source-backed default in `src/data/effect-presets.js` must include every new key and
  agree byte-for-byte with `EFFECT_BY_ID.vowel.defaults` under the existing test contract.
- `fallbackDefaults` remains valid when the data file is stale or incomplete.
- Invalid waveform strings fall back to `step` inside DSP even if malformed external data
  reaches the engine.
- Bypass and `wet: 0` must suppress all internally generated breath. No noise or DC may
  appear on silent input.

---

## 6. Harmonic excitation design

### 6.1 Goal

Make dark, sine-like, or low-harmonic sources produce enough upper harmonic material for
F2/F3 and the upper presence path to speak. The dry path must remain untouched. Excitation
belongs only on the signal feeding the vowel wet branches.

### 6.2 Graph

Introduce a clean/excited front end before the wet split:

```text
input
  ├── dry ------------------------------------------------------> output
  └── excite input
        ├── clean ------------------------------------┐
        └── pre-gain -> WaveShaper -> compensation ---┴-> vocal source
                                                        ├-> body
                                                        ├-> F1/F2/F3 banks
                                                        └-> air/F4/F5
```

Use a native `WaveShaperNode`, not a Tone effect. Set oversampling to `2x` initially and
measure `4x` before choosing it; do not assume the more expensive option is audibly useful.

The curve must be odd-symmetric and contain an exact zero sample. A suitable family is:

```js
y = tanh(k * x) / tanh(k)
k = 1 + excite * K
```

Use an odd-length curve table so the centre index is exactly zero. `K` should be calibrated
by render and listening rather than guessed; begin near 8. Do not use bias or asymmetric
clipping because it can create DC and false meter motion.

Crossfade clean and shaped vocal-source branches with a correlated-signal-safe law. Since
the two signals are strongly correlated, start with a linear crossfade, not equal power:

```js
cleanGain = 1 - excite
shapedGain = excite * exciteMakeup
```

Calibrate `exciteMakeup` against broadband and sine test signals. The control should add
harmonic density, not function as an accidental volume knob. Do not normalize per block or
introduce an automatic gain controller.

At `excite: 0`, either disconnect the shaper feed or make its output gain exactly zero so
the optional path can be skipped. The vocal source must then null against the old input.

### 6.3 Breath path

`BREATH` is a high-passed deterministic-noise transient associated with vowel articulation.
It must not free-run audibly and must not produce output from silence.

Preferred native/offline-safe design:

1. Create one seeded, looping noise buffer per effect instance. Use the project's existing
   deterministic seeded-noise conventions; never use `Math.random()`.
2. High-pass it around 3.5–5 kHz, with the final corner chosen by audition.
3. Derive an input envelope from the vocal source using a zero-centred full-wave rectifier
   `WaveShaperNode` followed by a low-pass envelope smoother.
4. Connect that control signal to a breath VCA's `gain` AudioParam.
5. Multiply it by the scheduled articulation transient envelope and by `breath`.
6. Route the breath into the vocal wet sum, never the dry output.

If browser behaviour or cost makes the audio-rate envelope follower unreliable, do not ship
ungated noise as a shortcut. Instead ship `BREATH` as an input-derived high-passed transient
from the excited signal and record the fuller noise model as deferred work.

Required silence invariant:

```text
zero input + any EXCITE/BREATH/ARTICULATION settings -> zero output within meter tolerance
```

---

## 7. Coherent INTENSITY design

### 7.1 Current limitation

The existing control crossfades between one and two passes through the formant response.
BODY and AIR remain at their independently selected levels, so they establish an unshaped
floor that masks the deeper valleys of the cascaded bank. This is why the present hard
talkbox recipe also has to manually lower BODY and AIR.

### 7.2 Required behaviour

`INTENSITY` must remain path-independent and absolute: its sound at a given numeric value
must not depend on the order in which it or any other control was moved.

Derive all effective gains directly from current authored state on every apply:

```js
const i = clamp01(state.intensity);
const bodyKeep = lerp(1.0, 0.35, i);
const airKeep = lerp(1.0, 0.50, i);

onePassGain = 1 - i;
twoPassGain = i;
effectiveBody = state.body * bodyKeep;
effectiveAir = state.air * airKeep;
```

Those endpoint coefficients are starting points, not sacred values. Calibrate them so:

- `0` preserves the existing natural/body-rich behaviour;
- `0.5` is clearly more vocal without collapsing low weight;
- `1` is a hard, deep-contrast talkbox without requiring a second manual recipe.

Because the one- and two-pass paths are correlated, use a linear crossfade initially.
Measure the level across 0, .25, .5, .75, and 1. If a fixed correction curve is necessary,
derive it from measurements and keep it deterministic; do not use live normalization.

Move BODY, AIR, the one-pass bank, and the two-pass bank into a shared `vocalWetSum` before
the articulation VCA and wet output gain:

```text
body -------\
air --------+-> vocalWetSum -> articulationGain -> wetGain -> output
one pass ---+
two pass ---/
```

The `wet` equal-power law still controls only dry versus the completed vocal wet signal.
`INTENSITY` must not mutate the stored values of `body`, `air`, `reso`, `tilt`, or `wet`.
That keeps automation, preset recall, undo, and direct `x -> z` edits path-independent.

### 7.3 Safety

- Retain on-demand connection/disconnection of the second bank when intensity is zero.
- Ramp routing gains before disconnecting if a disconnect would otherwise click.
- Confirm repeated `0 -> 1 -> 0` changes do not accumulate duplicate connections.
- Bound peak output at maximum EXCITE, RESO, INTENSITY, BODY, and AIR.
- Add a fixed output trim only if measurements show it is necessary; do not quietly add a
  limiter whose latency or dynamics alter every setting.

---

## 8. Articulation design

### 8.1 Goal

Turn a filter movement into a syllable. At zero, retain the present continuous result. As
the control rises, briefly close the complete vocal wet path at vowel boundaries and reopen
it with a short attack. The dry signal remains continuous.

### 8.2 Scheduling

Use the existing `scheduleRhythm(step, when, sixteenth, bpm, swing)` boundary calculations.
Whenever the modulation enters a new vowel target, schedule the articulation envelope at
the same audio time used for the formant move. Do not use `setTimeout()`.

Recommended mapping:

```js
const a = clamp01(state.articulation);
const floor = lerp(1.0, 0.12, a);          // no dip at 0; deep but not dead at 1
const close = lerp(0.001, 0.004, a);       // seconds
const open = Math.min(period * 0.22,
                      lerp(0.004, 0.030, a));
```

At a boundary `t`:

1. hold/cancel the articulation gain at `t`;
2. reach `floor` at `t + close`;
3. return to 1 by `t + close + open`;
4. apply a matching, shorter transient envelope to BREATH.

The exact curve can be exponential-like but must never schedule an exponential ramp to
zero. Linear ramps or `setTargetAtTime` with a nonzero floor are safe.

At very short rates, clamp the total articulation event to a fraction of the period so the
effect does not remain permanently closed. At `articulation: 0`, the VCA must stay exactly
at unity and should not receive unnecessary automation.

### 8.3 Interaction with glide and shape

- `GLIDE` controls filter/formant transition smoothing.
- `ARTICULATION` controls the vocal amplitude boundary.
- `WAVE SHAPE` controls the trajectory through vowel space.

They must remain independent. A square waveform with low articulation is a filter step; a
square waveform with high articulation is a chopped syllable. A sine waveform with high
glide and low articulation is a smooth mouth. Presets may coordinate them, but the DSP must
not rewrite one control when another moves.

---

## 9. Modulation WAVE SHAPE

The waveform idea is approved. It adds a musically important dimension: the current walker
can choose rate and glide, but not the contour by which it travels. Preserve the existing
meaning of RATE as the duration of one vowel slot; do not redefine it as an entire-stack
cycle, because that would change existing timing and make stacks of different lengths run
at surprising speeds.

### 9.1 Shape semantics

Let `n` be the parsed stack length and `slot` the continuous count of rate periods since the
walk began. All modes are deterministic and wrap safely.

| Shape | Position behaviour |
| --- | --- |
| `step` | Existing behaviour: `floor(slot) mod n`; transition only uses the anti-click glide. |
| `saw up` | Continuous forward traversal: `slot mod n`; wraps from last vowel to first. |
| `saw down` | Continuous reverse traversal: `(n - (slot mod n)) mod n`. |
| `triangle` | Linear ping-pong path `0 -> n-1 -> 0`, with one vowel-slot duration per adjacent move. |
| `sine` | Same ping-pong endpoints/timing as triangle, but half-cosine eased between adjacent positions. |
| `square` | Alternates the first and last stack vowels once per rate period. For a one-vowel stack it is static. |
| `random` | Selects one stack index per rate period from a deterministic hash of reset epoch and ordinal; never calls `Math.random()`. |

For two-vowel stacks these shapes are immediately legible. For larger stacks, saw modes
sweep the sequence, triangle/sine speak it forwards and backwards, square exaggerates its
endpoints, and random makes a deterministic vowel chopper.

### 9.2 Scheduling implementation

Do not install seven unrelated algorithms. Add pure helpers, preferably beside the formant
helpers or in a small effect-private section:

```js
vowelPosition(shape, stackLength, slot, seed = 0) -> number
shapeBreakpoints(shape, fromSlot, toSlot, resolution) -> [{ offset, position }]
```

`vowelAt(...)` already accepts fractional positions. Continue to use it as the single table
resolver.

- `step`, `square`, and `random` schedule one target per period through the existing target
  writer.
- `saw up`, `saw down`, and `triangle` can schedule linear parameter ramps between resolved
  targets.
- `sine` should use a short deterministic value curve or 8–16 control breakpoints per
  period. Use the smallest resolution that produces no audible stepping at the 8 Hz maximum.
- Schedule frequency, Q, relative formant gain, bank makeup, and BODY corner from the same
  positions so the vowel remains internally coherent.
- Avoid overlapping `setValueCurveAtTime` events. The scheduler owns explicit nonoverlapping
  periods and the discontinuity reset cancels/holds all controlled parameters.
- Include `waveform` in `motionSignature` and the `setState` before/after comparison.
- Include every newly automated AudioParam in `cancelAt`.

`GLIDE` under continuous waveforms should scale additional smoothing around the target
trajectory, not flatten the modulation depth. Define and test the endpoints:

- glide 0: follows the selected shape accurately with the minimum anti-click transition;
- glide 1: maximum smoothing, still measurably traversing the requested vowels.

If that interaction proves ambiguous during implementation, preserve `step` exactly and
treat continuous shapes as owning their own contour while `GLIDE` adds only a bounded time
constant. Do not silently make GLIDE inert.

### 9.3 Reset determinism

On transport start, loop discontinuity, seek, tempo change, swing change, or a motion
parameter edit:

- cancel scheduled formant and articulation values at the handoff time;
- recompute the shape position from musical step/time, rather than continuing hidden wall
  state;
- reset deterministic random shape from a stable signature;
- ensure direct render A and render B are sample-identical.

Free-rate mode remains wall-clock based within the render but must reset deterministically at
effect creation and transport discontinuity.

---

## 10. Generic named effect-preset architecture

### 10.1 Existing data shape

Keep the current source structure:

```js
EFFECT_PRESETS = {
  inserts: {
    vowel: {
      default: { /* complete catalogue default */ },
      presets: {
        'Talking Robot': { /* partial or complete effect-local params */ },
      },
    },
  },
  returns: {
    // same shape, available for future reuse
  },
};
```

Do not introduce a second preset file or store callbacks/functions in source data.

Named presets may remain sparse so new parameters can inherit the current catalogue default.
At read/apply time:

1. ignore keys not declared by `def.params`;
2. overlay known preset keys onto `def.defaults`;
3. validate/clamp numeric values and validate option values through catalogue ranges;
4. produce a complete resolved snapshot in catalogue parameter order.

Add reusable exported helpers in the engine/data seam, for example:

```js
effectPresetNames(id, scope = 'inserts') -> string[]
resolveEffectPreset(id, name, scope = 'inserts') -> complete params | null
matchEffectPreset(id, params, scope = 'inserts') -> name | null
```

Avoid making `tools/mixer-entry.js` understand source-file normalization itself. It should
consume exported browser-safe data/helpers from `effects.js` (and later a return equivalent
from `mixer.js` if return presets are exposed).

### 10.2 Snapshot semantics

Selecting a named preset replaces the current effect-local parameters with the resolved,
complete snapshot. It does not change:

- effect id;
- slot index;
- bypass state;
- chain order;
- lane routing; or
- any other effect.

Store only the resulting `params`, not a durable preset reference. This guarantees that
changing a checked-in preset later does not silently change existing songs.

The UI derives its label by comparing the current effective parameter snapshot with resolved
presets:

- exact normalized match -> show that preset name;
- exact catalogue-default match -> show `Default`;
- otherwise -> show `Custom`.

Use stable comparison in `def.params` order and numeric tolerances no looser than the slider
step. Prefer the normalized stored values, so floating-point formatting does not make a
freshly selected preset immediately read `Custom`.

### 10.3 Dropdown UI

For any insert with at least one named preset:

- put a compact `PRESET` select as the first row of the effect card's grid;
- options are `Custom` (disabled as an action when selected), `Default`, then source order
  named presets;
- choosing `Default` or a named preset performs one atomic full-parameter patch;
- rebuild only that effect card/panel after the live handoff so every control reflects the
  selected values;
- do not rebuild the live effect chain, restart LFOs, or interrupt playback;
- announce the selection with a concise toast only if normal dropdown changes elsewhere do
  the same; avoid noisy feedback otherwise;
- retain keyboard operation and a programmatic label association;
- do not show an empty preset row on effects whose `presets` object is empty.

The existing `patch` helper merges values. Add a separate `replaceParams(snapshot, tag)`
path for preset selection so parameters omitted by the old state cannot survive. It should:

1. resolve and validate the complete snapshot;
2. call the live link's `set(snapshot, deskTempo())` once;
3. replace `entry.params` in the mix with the complete snapshot;
4. record one undoable mix edit;
5. update the local list reference;
6. rebuild `buildDevices()` only after the live state has been handed off.

This is an immediate user action, like moving a knob. It does not need scheduler-boundary
queueing unless testing finds that the multi-param `setState` click protection is
insufficient. The Vowel node already cancels and re-seats scheduled motion on relevant
state changes; extend that state signature correctly rather than rebuilding the node.

### 10.4 Default writer compatibility

The existing DEV default writer rewrites `default` and preserves `presets`. Retain this.
Add tests proving that:

- a default save cannot erase or reorder named presets;
- new Vowel keys are normalized into its default;
- unknown/stale preset parameters are ignored at runtime but preserved by the writer unless
  the writer's established ownership contract says otherwise;
- malformed preset values fail validation or fall back safely without breaking the Mixer.

Named-preset authoring remains source-only in this phase.

---

## 11. Initial Vowel preset intentions

These are starting points. Tune them through the real engine on at least one bright source,
one dark/bass source, one pad/chord source, and one sparse lead. Do not claim them finished
from impulse tests alone.

Every preset should contain all Vowel parameters after final tuning, even though the resolver
supports sparse presets. Complete authored snapshots are easier to review and prevent a later
default adjustment from changing the factory preset unintentionally.

### 11.1 Talking Robot

Intent: obvious synthetic speech that stays usable on a lead.

```js
{
  voice: 'robotic', stack: 'a e i o u',
  rateSync: 1, rateDivision: 0.25, frequency: 0.5,
  waveform: 'square', depth: 1, glide: 0.04, articulation: 0.65,
  reso: 2.4, spread: 0.65, tilt: 0.05, intensity: 0.72,
  excite: 0.55, breath: 0.08, body: 0.38, air: 0.18, wet: 1,
}
```

### 11.2 Monster O–A

Intent: dark, heavy two-vowel mouth suitable for bass and low leads.

```js
{
  voice: 'bass', stack: 'o a',
  rateSync: 1, rateDivision: 0.5, frequency: 0.5,
  waveform: 'sine', depth: 1, glide: 0.55, articulation: 0.30,
  reso: 2.6, spread: 0.35, tilt: 0.35, intensity: 0.82,
  excite: 0.68, breath: 0.03, body: 0.72, air: 0.10, wet: 1,
}
```

Without tract-size shifting this is a bass-register formant effect, not a pitch shifter.
Do not describe it as lowering the source voice.

### 11.3 Breathy Choir

Intent: gentle, wide, continuous sung movement for pads/chords.

```js
{
  voice: 'soprano', stack: 'u o a',
  rateSync: 1, rateDivision: 2, frequency: 0.25,
  waveform: 'sine', depth: 0.72, glide: 0.82, articulation: 0.10,
  reso: 1.25, spread: 0.95, tilt: 0.72, intensity: 0.18,
  excite: 0.16, breath: 0.30, body: 0.48, air: 0.48, wet: 0.72,
}
```

### 11.4 Chopped I–A

Intent: percussive, grid-locked syllables for rhythmic synth parts.

```js
{
  voice: 'alto', stack: 'i a',
  rateSync: 1, rateDivision: 0.25, frequency: 0.5,
  waveform: 'step', depth: 1, glide: 0, articulation: 0.92,
  reso: 2.25, spread: 0.80, tilt: 0.30, intensity: 0.68,
  excite: 0.48, breath: 0.18, body: 0.34, air: 0.16, wet: 0.95,
}
```

### 11.5 Hard Talkbox

Intent: maximum intelligible formant contrast while retaining enough body and top to avoid
the old thin three-band result.

```js
{
  voice: 'tenor', stack: 'a o e',
  rateSync: 1, rateDivision: 0.5, frequency: 0.5,
  waveform: 'saw up', depth: 1, glide: 0.16, articulation: 0.52,
  reso: 2.8, spread: 0.50, tilt: 0.18, intensity: 1,
  excite: 0.78, breath: 0.06, body: 0.42, air: 0.16, wet: 1,
}
```

Preset acceptance:

- each must sound materially different from Default and from every other preset;
- each must work on at least two source families;
- no preset may clip or create a large loudness jump merely on selection;
- no preset may depend on controls outside the Vowel effect;
- preset names must describe audible intent rather than borrowed product branding.

---

## 12. Detailed file-by-file implementation plan

### Phase A — Pure data and resolver

#### `src/engine/formants.js`

- Add pure waveform-position helpers if they do not need AudioContext state.
- Keep existing formant data unchanged.
- Preserve `vowelAt` compatibility.
- Add unit tests for one-, two-, and five-vowel stacks; negative/wrapped positions; every
  shape; and deterministic random output.

If modulation helpers become effect-specific or scheduler-aware, keep them private in
`effects.js` instead of turning `formants.js` into a transport module.

#### `src/engine/effects.js`

- Add browser-safe named-preset resolve/match helpers.
- Add and validate the four new Vowel parameters.
- Keep the default overlay order: code fallback first, source default second.
- Add the excitation nodes, shared vocal-wet sum, articulation gain, and breath path.
- Refactor `applyWet` into direct derivation of dry, completed wet, body/air effective gains,
  one/two-pass gains, excitation blend, and articulation steady state.
- Include new state keys in signatures and reset logic.
- Extend `dispose()` to disconnect every added node and stop/disconnect a looping noise source.
- Ensure `setState` can receive a full preset snapshot in one call.
- Do not rebuild any nodes when parameters change.

#### `src/data/effect-presets.js`

- Extend Vowel `default` with the new keys.
- Populate only `inserts.vowel.presets` with the five auditioned snapshots.
- Leave all unrelated effect defaults and empty preset maps untouched.

### Phase B — Generic UI

#### `tools/mixer-entry.js`

- Build one generic preset-row helper using the exported resolver/matcher.
- Render it only for effects with named presets.
- Add `replaceParams` beside the current merge-style `patch` helper.
- Ensure preset selection produces one undo entry and one live `set` call.
- Rebuild controls after selection without rebuilding the audio chain.
- Ensure any subsequent knob/select/toggle edit changes the derived dropdown selection to
  `Custom`. The simplest reliable route is to rebuild or update only the select label after
  each edit; do not rebuild the entire panel on every slider input.
- Keep drag behaviour confined to the title bar; the new select must never start a card drag.
- Check four-row/floating-column card sizing through `reserveDevices()` and `fitDevices()`.

Do not overload the existing DEV double-click-to-save-default gesture. Preset selection is
available in normal and DEV modes alike.

#### `tools/mixer-shell.html`

- Add only the minimal CSS needed if the existing `.fxsel`, `.row`, and `.head` rules do not
  already produce a compact accessible row.
- Verify the dropdown fits in the fixed card grid at narrow and wide Mixer widths.
- Do not increase the global Effects panel height merely because one card gains a row; the
  grid should flow into an additional column under the existing layout policy.

### Phase C — Source writer and server validation

#### `tools/lib/effect-presets-source.js`

- Preserve current atomic-write behaviour.
- Add a pure named-preset normalization helper only if the engine helper cannot be reused in
  Node without browser dependencies.
- Do not rewrite the file merely by reading it.

#### `tools/mixer.js`

- No new endpoint is required for checked-in named presets.
- Keep `/effect-default-save` scoped to defaults.
- Validate that its write continues to preserve the named maps after new keys are added.

### Phase D — Documentation

#### `docs/vowel-filter-spec.md`

- Update the signal graph for excitation, vocal-wet sum, and articulation.
- Add the four controls and the revised INTENSITY semantics.
- Document waveform timing precisely.
- Replace statements that INTENSITY only crossfades filter passes or requires manual BODY/AIR
  reduction.
- Add the named-preset/dropdown behaviour and snapshot semantics.
- Update measured node count and CPU only after measurement.

#### `docs/SONG_MIXER.md`

- Mention named effect presets as starting points, not linked references.
- Update the Vowel catalogue row/control list and measured cost.

---

## 13. Test plan

### 13.1 Pure formant/modulation tests — `tests/formants.js`

Add contracts for:

- `step` reproduces the legacy ordinal sequence exactly;
- saw up visits `0 -> 1 -> ... -> n-1` and wraps;
- saw down reverses it;
- triangle and sine hit both endpoints and return without a discontinuous endpoint jump;
- square alternates first/last and handles a one-item stack;
- random is deterministic across runs and stays within the stack;
- fractional positions interpolate finite, ascending formants;
- invalid shape falls back to step;
- negative and wrapped musical positions are stable.

### 13.2 Preset source tests — `tests/effect-presets.js`

Add contracts for:

- Vowel default contains the four new keys;
- Vowel has exactly the approved initial preset names unless review explicitly changes them;
- every named preset resolves to all declared Vowel parameters;
- unknown keys are excluded from runtime resolution;
- invalid numeric and option values are rejected or safely clamped according to the chosen
  resolver contract;
- source order is retained in the dropdown;
- resolving a preset does not mutate source data or catalogue defaults;
- matching a resolved snapshot returns its preset name;
- changing one parameter returns `Custom`/no match;
- default is recognized separately from named presets;
- a DEV default rewrite preserves all named preset data byte-equivalently;
- sparse-preset forward compatibility remains supported.

### 13.3 Mixer/source contracts — `tests/mix.js` and focused UI tests

Add source or DOM contracts proving:

- the new Vowel controls have the declared ranges/options/labels;
- old mixes round-trip without materializing unnecessary new keys;
- explicit new keys round-trip through mix serialization;
- the preset row is generic, not hard-coded to `vowel` names;
- effects with no named presets show no preset row;
- preset selection uses replacement rather than merge semantics;
- preset selection preserves bypass, id, and chain position;
- one preset selection creates one undo operation;
- a post-selection control edit displays Custom;
- selecting Default restores the effective source-backed default;
- preset selection does not call `setEffects` or rebuild the live chain.

### 13.4 Real offline DSP — `tests/new-effects.js`

Keep every existing Vowel assertion and add:

#### Legacy compatibility

- old/default-off values null or remain within calibrated tolerance of the pre-change Vowel
  render;
- wet zero remains sample-identical with maximum excite, breath, articulation, intensity,
  and any waveform;
- zero input produces effectively zero output at every extreme.

#### Excitation

- a sine input gains measurable F2/F3-region harmonic energy as EXCITE rises;
- EXCITE 0 is transparent to the vocal source;
- excitation is odd-symmetric/zero-centred and creates no DC meter activity;
- output remains finite and bounded at EXCITE 1;
- two identical renders are sample-identical.

#### Intensity

- peak-to-valley spectral contrast rises monotonically enough across intensity 0, .5, 1 to
  be meaningful;
- BODY/AIR effective leakage falls as designed without mutating their authored values;
- intensity 1 retains measurable low body and upper air at defaults;
- intermediate intensity does not produce an unexplained correlated-crossfade gain bulge;
- repeated intensity toggling creates no level accumulation or duplicate graph connection.

#### Articulation and breath

- articulation 0 has a stable wet envelope;
- articulation 1 produces a measurable dip/reopen at the exact vowel boundary;
- the event follows swing for odd synced divisions;
- event duration clamps safely at maximum 8 Hz/free rate and shortest synced division;
- breath energy is concentrated above its high-pass corner and around articulation attacks;
- breath remains silent with silent input and at wet zero;
- articulation introduces no sample discontinuity beyond the calibrated click threshold.

#### Wave shape

- each shape produces a render different from step and from at least one other shape on a
  controlled two-vowel input;
- saw/triangle/sine reach expected spectral endpoints at expected times;
- square changes only on boundaries;
- random repeats identically on a second render;
- loop/seek/discontinuity reset lands on the musically correct position;
- all shapes remain finite and click-safe at extreme rate/glide settings.

#### Presets

- every named Vowel preset renders finite, non-silent, deterministic stereo output;
- each differs materially from Default;
- pairwise renders differ above a calibrated threshold;
- no preset exceeds the agreed peak ceiling on the standard test source;
- wet-zero override remains transparent for every preset.

### 13.5 CPU measurement

Update `tools/measure-new-effects.js` with:

- default Vowel (`excite/breath/articulation/intensity = 0`);
- Talking Robot or equivalent typical dramatic preset;
- maximum-cost Vowel with second bank, excitation, breath follower, articulation, and smooth
  waveform active.

Record best-of-three figures in the catalogue comment and documentation. Preserve the
on-demand disabling of optional paths wherever it actually reduces render cost.

### 13.6 Full project checks

Run at minimum:

```text
node tests/formants.js
node tests/effect-presets.js
node tests/mix.js
node tests/new-effects.js
npm test
npm run build
git diff --check
```

The Chromium-backed effect test may require the approved macOS browser boundary. Report any
unrelated existing full-suite failure separately; do not attribute it to this work.

---

## 14. Listening and visual QA matrix

Automated renders prove mechanics, not that a preset sounds good. Audition through the real
Mixer while the song is playing.

### Sources

- bright saw lead;
- square/chip lead;
- sine or dark filtered bass;
- sustained chord/pad;
- short percussive synth phrase.

### Settings

- Default legacy-compatible state;
- each named preset;
- EXCITE 0/.5/1;
- INTENSITY 0/.5/1;
- ARTICULATION 0/.5/1;
- every waveform on `a e` and `a e i o u`;
- tempo sync at straight and swung timing;
- free rate at low and high extremes;
- wet 0 and wet 1;
- bypass toggling during playback.

### Listen for

- vowel intelligibility rather than generic brightness;
- obvious differences between preset intentions;
- consonant/breath transients that support speech rather than hiss continuously;
- low-end collapse at hard settings;
- harsh F2/F3 whistles;
- gain jumps while moving INTENSITY or choosing presets;
- zippering/clicks at vowel, loop, seek, and preset boundaries;
- stereo holes or a weak centre at large SPREAD;
- transport drift or a free-running shape that fails to reset predictably.

### UI checks

- preset dropdown appears only on Vowel initially;
- labels and values fit without clipping in the effect card;
- selecting a preset updates every displayed control;
- moving any control changes the dropdown to Custom without losing focus mid-drag;
- undo/redo treats selection as one action;
- card drag, bypass, remove, copy/paste, reorder, and double-click default save still work;
- deployed/static Mixer can select checked-in presets without a server;
- DEV default save keeps the preset list after reload.

Do not report listening or browser visual approval unless those checks were actually
performed.

---

## 15. Implementation sequence and acceptance gates

### Gate 1 — pure contracts

Implement waveform position helpers and preset normalization/resolution first.

Pass when:

- pure tests cover every shape and preset normalization;
- legacy step positions are unchanged;
- no browser or DSP graph changes are required to prove the data model.

### Gate 2 — graph refactor with no new sound

Route existing vocal branches through `vocalWetSum` and articulation unity gain. Add dormant
excitation/breath nodes or create them lazily.

Pass when:

- new controls at defaults reproduce the prior render within tolerance;
- wet zero and silence remain exact/near-exact;
- old tests pass before dramatic behaviour is enabled.

### Gate 3 — EXCITE and revised INTENSITY

Implement harmonic generation and direct-derived contrast/leakage coupling.

Pass when:

- low-harmonic input gains useful formant energy;
- intensity measurably increases contrast;
- levels remain bounded and intermediate values are smooth;
- optional paths do not accumulate connections.

### Gate 4 — articulation and waveform motion

Implement scheduler-bound envelopes and shape-aware formant trajectories.

Pass when:

- timing, swing, resets, determinism, and click thresholds pass;
- step mode remains compatible;
- GLIDE and ARTICULATION remain independently audible controls.

### Gate 5 — reusable dropdown

Implement generic preset resolver UI and atomic snapshot application.

Pass when:

- Vowel gets the dropdown from data alone;
- an empty-preset effect does not;
- a temporary test preset on another effect exercises the same generic path;
- selection does not rebuild the live chain or interrupt playback;
- Custom/Default/named matching is correct.

### Gate 6 — preset voicing

Tune the five presets in the real Mixer across the source matrix.

Pass when:

- every preset has a distinct, named audible purpose;
- no preset clips or disappears on the intended sources;
- final values replace the starting suggestions in source data;
- offline preset renders and listening checks agree.

### Gate 7 — performance and regression

Run CPU measurement, full tests, build, and diff hygiene.

Pass when:

- default/off optional paths remain reasonably close to the prior Vowel cost;
- maximum dramatic mode is measured and documented;
- all focused tests pass;
- build passes;
- unrelated worktree changes remain untouched;
- `git diff --check` passes.

---

## 16. Definition of done

This plan is complete only when all of the following are true:

- Vowel has live `EXCITE`, `BREATH`, `ARTICULATION`, and `WAVE SHAPE` controls.
- EXCITE makes a low-harmonic source noticeably more vowel-readable.
- INTENSITY directly produces a harder vocal contrast without requiring the user to know the
  hidden BODY/AIR recipe.
- ARTICULATION turns vowel boundaries into clear syllable attacks and remains grid/swing
  accurate.
- Every modulation shape follows the specified deterministic timing semantics.
- Legacy state remains compatible and wet-zero/silent-input guarantees hold.
- The generic effect-card dropdown is data-driven and reusable.
- Vowel ships with the five approved, auditioned named presets.
- Choosing a preset is one atomic, undoable snapshot action and later edits read Custom.
- Existing songs do not become linked to future preset-library edits.
- Offline renders are finite, non-silent when expected, deterministic, bounded, and click-safe.
- Focused tests, full build, and diff checks pass.
- Browser visual and listening QA are reported with an honest evidence boundary.

---

## 17. Handoff cautions for GPT-5.6 Luna Max

- Inspect the working tree before editing. Preserve unrelated changes, currently including
  song/music-director work unless the live tree has changed since this plan was written.
- Treat `docs/vowel-filter-spec.md` as the shipped-v1 rationale and this document as the
  approved enhancement. Update the former after implementation rather than deleting its
  measured history.
- Do not infer that a passing impulse-spectrum test proves a convincing voice. Perform the
  source-matrix listening pass.
- Do not introduce nondeterministic noise. Offline export equality is a product contract.
- Do not implement preset selection by rebuilding the effect chain. Use the live node's
  existing state handoff.
- Do not let INTENSITY mutate other authored controls. Derive effective values on every
  application.
- Do not let a macro or preset become path-dependent. Direct `x -> z` must sound like
  `x -> y -> z` at the same final state.
- Do not claim phone/device performance from the desktop CPU bench.
- If the breath envelope follower proves unsafe or disproportionately expensive, ship the
  input-derived transient fallback and document the deferred seeded-noise follower; never
  ship free-running hiss on silence.
- If waveform scheduling threatens the existing step/swing contract, land the generic preset
  UI and the three approved DSP improvements with `step` compatibility first, then complete
  continuous shapes behind focused tests. Do not silently change RATE semantics.

