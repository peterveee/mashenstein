# All-synth Simple / Advanced preset editors

Implementation handoff for GPT-5.6 Luna Max.

## Current rollout scope

> **DuoSynth was retired into MRDR-3 on 2026-08-21**, after this plan was written. Its
> Simple and Advanced surfaces are gone with it and the rows below are history rather than
> work — kept because the reasoning behind the shared controls still applies to the
> engines that remain. See docs/synth-naming.md.


Implement now for **KNDO-5, WNDR-9, RMND-2 and DuoSynth**, while
retaining MRDR-3, TNGR-2 and KLNG8 as the reference implementations. Also add the agreed
TRANSPOSE control to the MRDR-3 and TNGR-2 Simple surfaces and use CUTOFF/RESONANCE where
those are the actual parameters.

Do not change the legacy **Synth** or **MonoSynth** editors in this rollout; they will be
replaced by CRLS1. Do not change **MetalSynth, NoiseSynth or MembraneSynth** editors; those
families are being removed. The broader CRLS1 and 12-family material below is retained as
future design context, but this rollout-scope section takes precedence for implementation
and acceptance.

## Outcome

Every editable sound family gets the same two-level editing model. The target roster is
12 families once the current Synth + MonoSynth merge into **CRLS1** is complete:

- **Simple** is the normal compact preset editor. It contains a small set of high-value
  controls that can be understood without knowing the synth architecture.
- **Advanced** opens the existing full-window preset editor used by MRDR-3, TNGR-2 and
  KLNG8. It exposes every parameter supported by that engine, with engine-specific card
  layout but the same window, controls, preset picker, keyboard, undo and save lifecycle.

Do not build a second editor or a second preset state. Both surfaces must continue to use
the one `state.voice`, one `touched()` path and the kit passed from
`tools/mixer-voice-editor.js` to `tools/mixer-synth-full.js`.

This is an editor/UI project. It must not change synthesis, preset defaults or the sound of
an untouched preset.

## Product decisions

1. **Add TRANSPOSE to Simple for every pitched preset**, including MRDR-3 and TNGR-2.
   Range is the existing `-24 ... +24 st`, integer semitones, default `0`.
2. **Do not put FINE in Simple.** Fine tuning remains in Advanced. In a quick preset
   context, octave/register placement is common; cent offsets are sound-design detail.
3. **LEVEL is the Simple label for preset output trim.** It writes the existing `$trim`
   value; it is not a second gain stage.
4. **Do not force controls onto engines that cannot honour them.** Unpitched NoiseSynth
   has no Transpose. NoiseSynth and KLNG8 have decay envelopes rather than a note release.
   A synth with no honest cutoff or spectral axis should not receive a cosmetic knob.
   Capability may be **preset-dependent**, not merely engine-dependent: a CRLS1 preset
   with a filter gets CUTOFF and RESONANCE, while a CRLS1 preset with no filter gets
   neither.
5. **Simple controls must be stable and reversible.** A direct control writes the same
   parameter Advanced shows. A macro must always derive from a captured authored baseline,
   never from its previously transformed output. Advanced edits rebase the macro.
6. **Simple is small.** Aim for 6-8 controls per engine; 9 is an upper bound where the
   existing MRDR-3 surface already justifies it. Do not reproduce Advanced in a
   narrower scroll.
7. UI terminology should be **SIMPLE** and **ADVANCED**. Internal `quickRows` names may be
   retained during implementation to avoid a large mechanical rename, but user-facing
   copy should stop mixing “Quick”, “Edit Preset” and “Advanced” ambiguously.

## Simple control sets

The first four pitched controls form the shared spine where the engine supports them:
`LEVEL`, `TRANSPOSE`, `ATTACK`, `RELEASE`. The remaining controls express the character of
that synth. Use the standard musical term `CUTOFF` whenever the control changes filter
cutoff frequency, even when it moves several cutoffs together. Reserve `BRIGHTNESS` for a
genuinely abstract spectral macro that is not simply a filter-frequency control.

| Engine | Simple controls, in order | Mapping / reason |
| --- | --- | --- |
| **MRDR-3** | LEVEL, TRANSPOSE, ATTACK, DECAY, RELEASE, CUTOFF, RESONANCE, ENV AMOUNT, VIBRATO | Add Transpose and otherwise preserve the useful existing Simple surface. CUTOFF is the existing collective cutoff macro: its wider scope does not justify renaming the familiar filter parameter. The collective envelope/filter macros retain their current baseline/rebase contract. |
| **TNGR-2** | LEVEL, TRANSPOSE, POSITION, MOTION, CUTOFF, ATTACK, RELEASE | Existing Simple surface plus Transpose. POSITION and MOTION are the wavetable engine's defining gestures. CUTOFF is `tngr2.filter.cutoff`. |
| **KLNG8 / Drum** | LEVEL, TUNE, ATTACK, DECAY, CUTOFF, PUNCH, DRIVE, TAPS | Keep TUNE rather than relabel it Transpose: drum tuning is part of the hit, not the note. CUTOFF collectively moves the actual active noise/metal/tone filter cutoffs and remains conditional where none exists. Existing collective attack/decay/cutoff behavior stays. |
| **KNDO-5** | LEVEL, TRANSPOSE, WAVE, ATTACK, RELEASE, CUTOFF | CUTOFF controls the optional filter cutoff. If the filter is absent, it reads as maximum/raw; moving below maximum creates a quick-seeded filter, and returning to maximum removes only that seed. If a filter was already authored, maximum is simply its highest cutoff and must not bypass it. |
| **WNDR-9** | LEVEL, TRANSPOSE, ATTACK, RELEASE, BRIGHTNESS, PERCUSSION | ATTACK/RELEASE are `additive.attack/release`. BRIGHTNESS is an inverse presentation of `additive.damp` (more damping = less brightness), not a rewrite of nine drawbars. PERCUSSION is the optional percussion level; zero/bottom bypasses while preserving the held section. |
| **CRLS1** *(merging Synth + MonoSynth)* | LEVEL, TRANSPOSE, WAVE, ATTACK, RELEASE, UNISON; **plus CUTOFF and RESONANCE only when this preset contains a filter** | Resolve the Simple surface from the current preset's structure, not from the CRLS1 family name alone. CUTOFF maps to the preset's filter cutoff/base frequency and RESONANCE maps to its filter Q. A no-filter preset must omit both entirely: do not show disabled knobs, treat maximum as “no filter”, or create a filter from Simple. UNISON remains conditional on compatible oscillator voicing. During migration, legacy `Synth` and `MonoSynth` identifiers should route to this same intended surface without changing an untouched preset. |
| **RMND-2** *(merging FMSynth + AMSynth)* | CARRIER, LEVEL, TRANSPOSE, ATTACK, RELEASE, RATIO; **plus FM DEPTH only when this preset modulates frequency** | Resolve the Simple surface from the current preset's structure, not from the family name: a top-level `modulationIndex` is what says the modulator reaches pitch rather than level, and an AM preset must omit FM DEPTH entirely rather than show a disabled knob. RATIO is `harmonicity`. CARRIER leads the surface as WAVE does on KNDO-5 and CRLS-1. The AM/FM switch itself is Advanced-only — a preset arrives already knowing what it is. Legacy `FMSynth`/`AMSynth` identifiers route to this same surface without changing an untouched preset. |
| **DuoSynth** | LEVEL, TRANSPOSE, ATTACK, RELEASE, CUTOFF, VIBRATO | ATTACK/RELEASE and CUTOFF are collective macros over both voices. CUTOFF scales both filter base frequencies from a fixed baseline. Per-voice tuning is intentionally Advanced-only: each oscillator exposes independent INTERVAL (whole semitones) and DETUNE (cents), the same pair every other oscillator card on the desk carries. Legacy Ratio values are read as Voice 2's DETUNE and the engine derives Ratio from the pair. |
| **MembraneSynth** | LEVEL, TRANSPOSE, ATTACK, RELEASE, PITCH DROP, DROP TIME | There is no filter. The pitch fall is the instrument's defining gesture and is more useful than a fabricated Brightness control. |
| **MetalSynth** | LEVEL, TRANSPOSE, ATTACK, RELEASE, RES FREQ, METALLIC, PITCH DROP | RES FREQ is Tone MetalSynth's frequency-valued `resonance`; it is not a cutoff or the Q-style RESONANCE used elsewhere. METALLIC maps to `modulationIndex`. |
| **NoiseSynth** | LEVEL, DECAY, CUTOFF, BODY, TAPS | It is unpitched, so no Transpose or Fine. CUTOFF is the burst filter cutoff. BODY is body level and is conditional/held like the optional Body section. TAPS is the existing tap count gesture. |

### Notes on labels and exceptional mappings

- Prefer standard terms a typical musician already knows: CUTOFF, RESONANCE, ENV AMOUNT,
  ATTACK, DECAY and RELEASE. Simple and Advanced should use the same name when they move
  the same kind of parameter.
- A collective filter macro is still CUTOFF. “Collective” describes its scope, not a new
  parameter type.
- A filter-Q control is RESONANCE in both Simple and Advanced. Do not rename it Character,
  Peak or Bite merely because the surface is compact.
- BRIGHTNESS remains appropriate only for a non-filter spectral macro, such as Additive
  damping. Add a short tooltip stating what any such abstract macro actually moves.
- DuoSynth's per-voice pitch pair is INTERVAL/DETUNE, **not** TRANSPOSE/FINE. Those two
  names are already on this board's SETTINGS card, where they move the whole preset, and
  two pots on one panel cannot both be called TRANSPOSE — the same rule the MRDR-3 layers
  and TNGR-2 oscillators already follow.
- DuoSynth legacy `harmonicity` is read as Voice 2's DETUNE with `1200 * log2(harmonicity)`
  at the engine boundary. The old shared Ratio is retained only as backwards-compatible
  source data and is replaced once a per-voice pitch field exists; users edit DETUNE in
  Advanced, not Simple. With Voice 1 at zero the engine's arithmetic hands the same ratio
  back, so an untouched legacy preset is unchanged.
- DuoSynth's voice cards have **no VOICING pill row**. Tone spells a voicing as a prefix on
  the oscillator type, and two of the four — `am` and `fm` — are whole synthesis methods
  with a board each, offered there with the modulator, ratio and modulation envelope they
  need. What is left is `fat`, which is UNISON above 1: UNISON writes the prefix along with
  the count, and SPREAD opens above 1, exactly as every other oscillator on the desk.
- Fine Tune remains visible in every pitched Advanced Note/Master card and continues to
  use the existing `$fine` engine path.
- Do not add preset-level velocity. Current engine/editor notes establish that no playback
  path reads it; LEVEL/TRIM is the audible control.

## Advanced layouts

Retain the bespoke layouts for MRDR-3, TNGR-2 and KLNG8. Add layouts for every remaining
family using the same `fullLayout()` data contract and the same renderer.

| Engine | Proposed full-window arrangement |
| --- | --- |
| KNDO-5 | One band: NOTE, OSCILLATOR, AMP, PITCH ENV, FILTER. Let FILTER span two columns if needed. |
| WNDR-9 | Two bands: DRAWBARS + CHARACTER + AMP/NOTE on top; PITCH + PERCUSSION + HUMANISE below. Drawbars may span two columns. |
| CRLS1 | One adaptive band: NOTE, OSCILLATOR and AMP are always present; FILTER and FILTER ENV appear only when the current preset contains a filter. Keep the board centred and compact in the three-card no-filter case. If Advanced adds/removes a filter, rebuilding Simple must add/remove CUTOFF and RESONANCE immediately. During migration, legacy Synth/MonoSynth presets use this same layout policy. |
| RMND-2 | One band: top OSCILLATORS/MOD stack, then MOD ENVELOPE, VCA/AMP ENVELOPE, and rightmost SETTINGS. The MOD card leads with the MODE pill (FM/AM), then RATIO and FM DEPTH; FM DEPTH greys in AM rather than being removed, so the board never changes width. |
| DuoSynth | Two five-column bands: first band holds VOICE 1 OSC, VOICE 1 FILTER, VOICE 1 FILTER ENV, VOICE 1 AMP/VCA and rightmost SETTINGS; second band mirrors the four Voice 2 cards beneath it, with a blank cell under SETTINGS. No leading spacer — an empty column is a card's width of window, not free space. Each voice OSC card lays LEVEL (linear 0–2, unity 1.0) along its top as a fader, then WAVE, then INTERVAL/DETUNE, then UNISON/SPREAD on the board's own four-column grid so the pots pack left. Native VIBRATO/VIB RATE is seamed onto the floor of SETTINGS. |
| MembraneSynth | One compact centred band: NOTE, DRUM, OSCILLATOR, ENVELOPE. |
| MetalSynth | One compact centred band: NOTE, METAL, ENVELOPE. |
| NoiseSynth | One band: MASTER, BURST, BODY, HUMANISE; TAPS remains a door/panel using the existing dynamic taps renderer. |

Layout fine-tuning is expected, but these rules are acceptance requirements:

- Every row returned by `panelSpec(voice)` appears exactly once in Advanced.
- Optional-section switches, conditional rows, disabled states and held values behave as
  they do in the current editor.
- Use the existing `groupCard`, pot, pill, graph, curve-door and taps-panel renderers.
- Amp/filter cards get the existing envelope/response graphs wherever their row shapes
  match; a graph is another grip on existing rows, not a new parameter.
- Small engines should occupy a visually centred, sensibly sized board. Do not stretch
  three sparse cards into six giant empty columns merely to fill the window.
- No vertical page scroll at the target desktop layout. The window may remain responsive
  at smaller sizes using the current bounds.
- Keep the current non-modal, draggable, transport-avoiding window behavior and the shared
  searchable same-engine preset picker, keyboard, MIDI, undo, save/revert and close paths.

## Implementation sequence

### 1. Generalize eligibility and routing

- Replace the current pilot-only `QUICK_SYNTHS`/`FULL_EDITORS` gating with a single
  supported-editor predicate covering the target 10 named synth families plus NoiseSynth
  and KLNG8. Until migration is complete, accept legacy `Synth` and `MonoSynth` identifiers
  as aliases of the CRLS1 editor family.
- `Edit Simple` always opens the compact surface.
- `Edit Advanced` always opens the full window.
- The `ADVANCED` button inside Simple must be present for every supported family.
- Preserve the current song-local-copy boundary and same-object rebinding in
  `syncVoiceEditorToLane()`; do not edit library presets through a lane.
- Preserve exact-engine filtering in the Advanced preset picker.

### 2. Make Simple data-driven for every engine

- Keep `commonRows()` as the canonical Advanced controls.
- Expand `quickRows()` (or introduce `simpleRows()`) with an explicit engine dispatch.
- Reuse existing row definitions where a Simple control is a direct view of one Advanced
  path. Do not duplicate ranges, tapers, defaults or conditions in two places.
- Build CRLS1's Simple rows from the current preset on every repaint. Filter presence is
  the condition for both CUTOFF and RESONANCE; changing presets or adding/removing the
  filter in Advanced must update the Simple surface without closing the editor.
- Extract generic collective-macro helpers for paired or multi-stage engines rather than
  adding one-off mutation code for MRDR-3, DuoSynth and KLNG8.
- Add Transpose to MRDR-3 and TNGR-2 immediately, then bring the remaining families onto
  Simple one engine at a time.

### 3. Generalize `fullLayout()`

- Keep `buildDrumFullLayout`, `buildTngr2FullLayout` and MRDR-3's bespoke builder intact.
- Add small explicit layout builders, or one declarative packer plus per-engine layout
  descriptors, for the simpler families above.
- Prefer layout descriptors over synth-specific DOM branches. The renderer should not
  learn synthesis details.
- Update the full-window heading fallback so NoiseSynth is named correctly as well as
  KLNG8.
- Make `FULL_EDITORS` derived from actual `fullLayout()` support if practical, avoiding a
  second list that can drift.

### 4. Macro correctness

For every collective or translated Simple control:

- Capture the authored constituent values at first movement in editor-only state.
- Derive every later position directly from that baseline.
- Prove `x -> z` equals `x -> y -> z`.
- Prove returning to the neutral/end position restores optional sections and authored
  values exactly, including bypassed state.
- If Advanced changes any constituent, invalidate/rebase the Simple baseline before the
  next Simple move.
- One gesture is one undo transaction even if it writes multiple parameters.

Do not serialize Simple-only pseudo-paths such as `$quick.*` into presets.

### 5. Layout and interaction pass

- Tune card spans and board width per engine after all controls are present.
- Check every mixer theme, long preset names, optional sections on/off and the largest
  shipped preset for each engine.
- Verify the two entry points from both the track popup and channel menu.
- Verify switching between different engine presets while the editor is open rebuilds
  both the Simple surface and Advanced eligibility from the current `state.voice`.

## Tests and acceptance gates

Extend the current focused suites rather than relying on screenshots or build success.

1. `tests/synth-full-layout.js`
   - Instantiate one real catalogue preset for every family.
   - Assert `fullLayout()` is non-null for all 12 target families, plus transitional
     legacy Synth/MonoSynth identifiers while they remain loadable.
   - Assert every `panelSpec` row is placed once, never zero or twice.
   - Delete the old assertions that the simpler classes have no full layout.
2. `tests/pot-coverage.js`
   - All Advanced controls still correspond to engine reads.
   - Simple pseudo-paths are recognized as projections and never mistaken for engine
     parameters.
3. Add a focused Simple-surface test
   - Assert the exact ordered labels above per family.
   - Assert Fine is absent from every Simple pitched surface and present in Advanced.
   - Assert Transpose is present for every pitched family, including MRDR-3/TNGR-2, and
     absent for NoiseSynth; KLNG8 uses Tune.
   - Assert a filtered CRLS1 preset has CUTOFF and RESONANCE and a no-filter CRLS1 preset
     has neither. Switching between those presets while the editor is open must rebuild
     the row set.
4. Macro regressions
   - Direct-versus-via movement for every collective/translated macro.
   - Advanced-edit rebasing.
   - Exact optional-section and bypass restoration.
   - One undo restores every constituent written by a macro.
5. Routing/lifecycle
   - Both menu entries open the requested surface for every family.
   - Advanced opened from Simple shares the same live object.
   - Preset switches, save-as-new, revert, close and lane changes preserve current
     ownership and do not leave a stale engine surface behind.
6. Run focused checks, then `npm run build` and `git diff --check`.
7. Restart `npm run dev` after builder/template changes and verify the served UI.
8. Browser QA is required for visual/interaction sign-off; listening QA is required for
   the macros whose semantics are perceptual (Additive Brightness, FM Amount, Metallic,
   Duo Detune). Static
   tests prove mappings and state behavior, not that the chosen travel sounds musical.

## Completion boundary

This work is complete only when every family has both surfaces, every Advanced leaf is
reachable exactly once, the Simple mappings pass the state/undo tests, and the served UI
has been exercised through both entry routes. If browser or audio access is unavailable,
report source/test/build completion separately and leave visual/listening acceptance
explicitly unverified.

Do not call a partial rollout complete because MRDR-3, TNGR-2 and KLNG8 still work. Those
are the reference implementations; the goal is parity of editing model across all 12
target families, with legacy Synth/MonoSynth compatibility during the CRLS1 migration.
