# Auto Portamento and Lab Go Wild — implementation handoff for Luna Max

Prepared 3 October 2026 against the current working tree. This is an implementation plan, not an implemented feature.

## 1. Outcome and scope

Add a shared, selective Auto Portamento treatment that can be enabled manually on a desk lead lane or chosen automatically when generating a Lab banger with GO WILD enabled. Choose individual transitions from the actual melody using rhythmic gaps, pitch distance and phrase context. Users of the Lab must not need note-length controls.

Preserve written pitches, note starts and stored lengths. A chosen connection may extend a playback gate just enough to join two notes. Do not blanket-lengthen notes, globally switch a preset to mono, or increase its global glide. A monophonic passage is a property of the notes, not proof that its preset is configured mono.

Deliver the complete vertical path: desk controls → saved lane settings → deterministic transition planner → audio scheduling → supported synths → Lab generation → export/reload. Keep the first version modest: lane scope, two controls, no per-note editor or new musical transformations beyond portamento.

## 2. Verified repository context and precautions

- `src/game/banger/maker.js` already contains GO WILD, a `wild` field, pointer/keyboard handling and recipe construction. Do not add a second toggle.
- `src/game/banger/make.js::makeBanger` currently maps `wild` to `variation: 'wild'`. Preserve that behaviour and add the expression policy alongside it.
- `src/game/banger/store.js` already persists `wild` in drafts and kept/revised recipes. Kept songs are regenerated from recipes and cached: compatibility needs explicit treatment.
- `tools/mixer-banger.js` has a separate **Go Crazy** button using `goCrazyBangerOptions`. Do not rename it or change its bundle as part of this task.
- `tools/lib/banger/index.js::generateBanger` owns shared generation, independent seeded streams, output mix, role-to-lane mapping and generator versioning. Keep new generation code browser-safe.
- `tools/lib/banger/modify.js` currently fingerprints notes, voice and automation per role. An expression-only change needs its own fingerprint/merge; replacing a whole strip would overwrite unrelated desk edits.
- `src/engine/audio.js` resolves arrangement/Note FX and calls `playVoice`, then `VoiceRack.play`. `src/engine/voices.js` has native/Tone dispatch and MRDR-3 worklet dispatch. Existing glide generally depends on gate overlap and preset key mode.
- MRDR-3 DSP currently reads mono/legato/glide from its compiled patch. Per-event treatment must reach DSP explicitly; temporarily changing a shared patch is unsafe for queued events.
- Relevant files are already dirty, including the Lab maker, make/store code, voices and banger tests. Read current diffs before editing, preserve existing work, and re-check all locations before applying changes. No reset, checkout or blanket formatting.

Read applicable AGENTS.md instructions at implementation time. No implementation agents need to be spawned merely because this handoff names Luna Max.

## 3. User-facing behaviour

Add an **Auto Portamento** card to the desk's track Note FX panel:

- Enabled toggle, default off.
- **Amount**, 0–100, default 35: how many eligible connections to use. Zero selects none.
- **Glide**, 0–100, default 40: how pronounced each selected slide is. Never controls global preset portamento.
- Help text: “Adds slides between selected nearby melody notes. Preserves phrase breaks.”
- Indicate unsupported instruments with a short explanation. Do not silently claim to apply an effect which its renderer ignores. A supported lane with no candidates is valid: show “No suitable connections” when candidate analysis is available.
- Reuse the existing NFX enabled indicator, dirty tracking, save and undo mechanisms. Controls must work on a non-Lab song too.
- No new instrument choices, sound replacement or required note-length edits. Go Wild's generated settings are ordinary editable desk settings, not hidden processing.

Version one does not add styles, force-on/off connectors, bar overrides or a new piano-roll overlay. Keep the planner's diagnostics available for testing and later UI work.

## 4. Data contract

Use lane Note FX as the canonical saved location:

```js
mix.lanes[laneKey].noteFx.portamento = {
  enabled: true,
  amount: 35,
  glide: 40,
  version: 1,
};
```

Add shared normalisation: clamp finite values, provide defaults, and handle malformed data without NaNs or unexpected activation. Missing data means off. Unknown future versions must fail closed with a diagnostic rather than be interpreted as version 1.

Introduce/reuse a common “has enabled Note FX” predicate. Existing checks often accept only `arp.enabled || strum.enabled`; audit all such gates, including `setTrackNoteFx`, `clearTrackArp`, badges, signatures, serializers and resolution. Clearing an arp must not clear portamento. Portamento alone must survive saving.

Do not make portamento advance the stateful arp processor on additional ticks. Keep note production and articulation planning separate. Version one reads lane settings; retain existing arp/strum bar override semantics without inventing portamento bar controls.

Persist settings, not an entire duplicate event timeline. Derived transition plans are disposable caches, keyed by the musical inputs and planner version.

## 5. Shared planner and event inputs

Create `src/engine/auto-portamento.js`, a pure browser-safe module, with config normalisation, eligibility helpers and deterministic phrase/transition planning. Tests should exercise observable musical decisions, not internal function layout.

Feed it an ordered lane event view with stable event IDs, output position in beats, sounding pitch, effective gate duration, explicit-versus-inherited length provenance, and barriers such as chords, instrument changes or transport discontinuities. Resolve arrangement edits, transposition, repeats and Note FX before analysing the notes actually heard.

The scheduler adapter must obtain enough future context BEFORE scheduling a source note's release. A transition cannot be discovered only when its destination is scheduled: the previous gate may already have ended. Build/cache phrase or bounded event windows in advance, with at least the next two onsets and the local rhythmic context available. Reuse the existing resolver where possible; do not implement a second, subtly different arrangement or arp interpreter.

Do not call stateful `noteFx.process` speculatively and then call it again for playback. Materialise once and consume, or use an isolated deterministic planning state. Invalidate derived data on note edits, arrangement/voice/Note FX changes and relevant timing changes. Do not scan a whole song on every audio tick.

For A → B measure:

```text
gapBeats = B.startBeat - A.endBeat
onsetSpacing = B.startBeat - A.startBeat
intervalSemitones = 12 * log2(B.hz / A.hz)
```

Use pitch magnitude for selection, retaining direction for rendering/diagnostics. Simultaneous notes form a chord barrier. Clearly overlapping independent notes also form a barrier; do not mistake release tails or a small authored legato overlap for a chord. Skip ambiguous passages conservatively instead of choosing one chord tone.

## 6. Initial selection algorithm

These numbers are starting defaults for audition, not claims about universal musical rules. Keep them in one policy table.

1. Estimate a local rhythmic pulse from nearby onset spacings in the phrase; prefer the common short spacing, resistant to a single long rest. Use known grid spacing as a fallback when there is insufficient evidence. Work in beats, not raw milliseconds.
2. Split at clear missing rhythmic slots (initially spacing above 1.75 × local pulse), explicit substantial rests, chords, instrument changes and discontinuities. A bar boundary alone is not a phrase boundary.
3. Normally allow touching/overlapping gates or a positive gap up to 20% of local pulse. Never bridge an explicit short/staccato note merely because the onset grid is regular.
4. For inherited fixed gate lengths only, a regular onset run can indicate continuity even when end-to-start gaps are larger. Permit a conservative exception up to 35% of local pulse, provided spacing is within 15% of that pulse. Cap any bridged silence at 80 ms as well. Missing provenance means use the stricter rule.
5. Reject repeated pitch and intervals over an octave. Rank 1–2 semitone movements highest, 3–5 moderately, and 6–12 low. Promote a short pickup into a note at least 1.5 × the local pulse, and the final landing of a run. Down-rank rapid interior run notes. An accent/strong beat is a modest bonus, not a rule that every downbeat slides.
6. Allocate a phrase budget from Amount: initially about 15% of transitions at the default, rising to at most 40% at 100. Short phrases can select one strong candidate; never force a choice when none qualifies. At normal settings avoid adjacent selected transitions; at high amounts allow at most two in sequence.
7. Select highest-ranked candidates with stable tie-breaking and phrase-relative spacing constraints. No playback-time randomness. Equivalent repeated motifs should receive equivalent treatment; derive motif identity from relative pitches and rhythmic ratios, not absolute bar number or transposition.

Retain a reason per selected/rejected candidate, e.g. `pickup-landing`, `near-step`, `rest`, `chord`, `explicit-staccato`, `phrase-budget`. Use a small curated fixture set to tune the balance, not a huge number of exposed controls.

## 7. Per-transition audio contract

Produce playback instructions distinct from the saved note data:

```js
// Illustrative shape; adapt to existing event identifiers and timing units.
{
  sourceId, destinationId,
  glideSeconds,
  articulation: 'legato',
  sourceGateEndBeat, // minimal selected bridge, if required
  reason,
}
```

Start glide at B's authored onset and reach B's pitch early in B. Compute a tempo-relative base duration, scale moderately with interval and Glide, then cap it to 30% of the destination's usable duration and 140 ms. Skip a slide if less than roughly 8 ms is available. Clamp only after considering the duration cap; do not impose a minimum which overruns a short note. Keep a consistent perceived pitch ramp, preferably linear in semitones/exponential in Hz.

For a selected connection, schedule A's gate only through B plus a minimal handoff epsilon (initially 2 ms) where the adapter requires strict overlap. Preserve B's authored start and end. Use a lane-local connected voice for the pair. End that connection at its actual phrase/chain boundary and resume normal articulation.

Define three distinguishable cases in `VoiceRack.play` and downstream events:

- Auto feature inactive: preserve the existing preset's behaviour exactly.
- Auto feature active, transition unselected: suppress inherited blanket glide for this passage; retain normal attacks. Do not allow preset overlap alone to turn it into a selected slide.
- Selected transition: use its explicit source identity, glide time and legato handoff.

Never mutate `VOICES`, a shared preset or a lane's compiled patch per note. Do not bypass polyphonic material by dropping its notes. Only use lane-local mono ownership for supported selected monophonic connections. A poly/chord barrier returns to normal preset playback; no slide through the barrier.

Preserve vibrato and modulation through a handoff. Native legato has previously needed modulator lifetimes extended with carriers/envelopes; verify actual audio, including the destination's sustain and release.

Implement a capability predicate shared by UI, Lab and scheduler. Start with Tone sustained leads and MRDR-3 native/worklet paths, after confirming suitable presets are actually used by Lab styles. Ensure at least one real Lab style/preset can demonstrate the feature. Unsupported families must remain unchanged and must never be picked by automatic generation. Add other families only with their own renderer coverage. Do not swap the user's instrument to obtain support.

Thread explicit event overrides through MRDR-3 controller/queued-note payloads and DSP, including delayed lane initialisation. Do not rely on `syncMrdr3Patch` ordering to control individual notes. Native/offline paths must implement equivalent decisions; equivalent articulation does not require sample-identical synthesis.

Clear connection ownership on stop, seek, song switch and loop restart. Do not connect the end of a loop to its beginning in version one. When seeking to a destination without a live source, strike it cleanly. Reject stale source IDs. Honour cancellation when a pending gate bridge becomes invalid after an edit.

## 8. Go Wild integration and compatibility

Add a normalised shared generator option such as `expression: { autoPortamento: false, version: 1 }`. The Lab maps its existing `wild` to this option alongside the current Wild variation. Keep explicit schemas and names consistent once chosen.

Apply the policy after notes, sounds and lane allocation are known, before output fingerprints and final metadata. Eligible roles are monophonic hook, written lead and counter-melody on supported sustained sounds. Exclude drums, bass, pads/chords, piano/pluck roles and dense arps by default.

Use a new independent seeded stream such as `expression`, split by musical role. Enabling this policy must not consume harmony, sounds, form or drum RNG draws. Candidate selection itself is deterministic from the melody; generation randomness only chooses eligible lanes and conservative settings. Initially enable one eligible lead with candidates, optionally a second at lower Amount. A take without suitable material legitimately gets no portamento. Do not force slides for the sake of GO WILD being on.

The output mix contains ordinary `noteFx.portamento` settings; playback has no Lab-only branch. Preserve all existing GO WILD variation and Spot FX behaviour. Leave Go Crazy unchanged. No additional desk generation toggle is required for this version; manual lane controls are sufficient.

Version recipes explicitly because kept Lab songs are reconstructed. Do not reuse `RIFF_VERSION` (grid encoding) as the expression version. New/revised recipes opt into expression version 1; older recipes with no expression version retain their old sound, including existing `wild: true` recipes. Thread this through the maker, make/store paths, recipe cache key and reopen/edit flows. Bump `BANGER_GENERATOR_VERSION` when new options alter generated output; do not claim that a version bump alone preserves old recipes.

Extend `bangerPrints` and `modifyBanger` with an expression fingerprint per role and field-level merge:

- Generated expression unchanged from base: keep the user's current settings.
- Generated expression changed: replace only the portamento field, report replacement of a conflicting manual edit using existing Modify conventions.
- Never replace a whole lane strip for expression-only changes. Preserve gain, sends, EQ, other Note FX and unrelated automation.
- Remap expression with the role's stable lane mapping; include explicit removal when a newly generated setting becomes off.
- Handle old fingerprint records without spuriously treating every lane as edited.

## 9. Persistence, rendering and UI audit

Inspect/update at least:

- `src/engine/note-fx.js`, `src/engine/audio.js`, `src/engine/voices.js`.
- `src/engine/mrdr3/controller.js`, `dsp.js` and associated event transport as needed.
- `tools/mixer-note-fx-editors.js`, `tools/mixer-entry.js`.
- `tools/lib/mix-source.js`, `mix-signature.js`, arrangement clone/copy paths and `src/data/mix.js` as applicable.
- `tools/lib/banger/index.js`, `options.js`, `modify.js`; Lab `make.js`, `maker.js`, `store.js`.
- `tools/lib/render-bank-page.js`, `render-bank-browser.js`, `freeze-span.js`, `mash-freeze.js` and actual callers.

Verify saved mixes, song copies, static-desk takes, source exports and reloads retain the setting. Invalidate frozen/audio caches when settings or relevant notes change. Include preceding context in a partial render/freeze if needed for a selected connection, or explicitly begin that span with a clean attack; match desk audition semantics. Feed actual mix, track identity and arrangement into audition renders.

## 10. Implementation order

1. Read current instructions/diffs; inventory supported lead presets and existing event resolution. Record representative Lab fixtures and off-state baseline output.
2. Add canonical config, pure planner and musical decision tests, including provenance and barriers.
3. Integrate lookahead/event planning and one supported renderer end-to-end; prove a selected slide and an unselected clean attack with rendered audio.
4. Complete Tone/MRDR-3 native/worklet support, lifecycle handling and offline paths. Keep capability declarations honest throughout.
5. Add desk controls, persistence, undo and cache/signature handling.
6. Add Lab generation policy, recipe compatibility and field-level Modify merging.
7. Run focused regressions, build, actual served UI inspection and audio auditions. Fix discovered integration problems before calling the feature complete.

## 11. Acceptance and tests

Add focused planner/integration tests and extend existing tests only where their behaviour is affected:

- Touching C→D can slide; repeated C→C cannot; a clear rest or chord blocks a connection.
- Explicit staccato is preserved; a regular inherited-gate run can use the bounded exception.
- Fast runs remain articulated; a held final landing can be selected. Transposed/repeated motifs agree.
- Amount zero produces no auto connections; increasing Amount respects phrase limits. Glide stays within destination duration.
- Authored arrays, pitches, starts, lengths and shared presets remain unchanged.
- Off-state preserves existing mono/legato behaviour. Active-but-unselected transitions do not inherit blanket glide.
- Selected/unselected/selected sequences, poly-to-mono boundaries, voice changes, stop/seek/loop and delayed worklet warmup have no stale ownership or stuck notes.
- Rendered pitch progresses between source and target during a chosen slide and settles on the target; an unselected attack starts at target pitch. Verify sustained vibrato survives handoff.
- Live/native/worklet/offline rendering receives the same transition decisions; export and freeze include the treatment.
- Desk enable/edit/undo/save/reload/copy works when portamento is the only Note FX; clearing arp preserves it.
- Same recipe/seed/version reproduces settings. Policy changes alone do not reshuffle drums, harmony or sounds. Old kept recipes remain on the legacy path.
- Modify replaces only changed expression fields and reports manual-expression conflicts without erasing other lane edits.

Relevant existing suites: `tests/note-fx.js`, `note-fx-render.js`, `key-mode.js`, `key-mode-render.js`, `banger.js`, `banger-modify.js`, `jukebox-banger.js`, `mixer-export.js`, `mixer-freeze-restore.js`. Check test entrypoints before running; use focused new tests plus the affected suites, then `npm run build` and `git diff --check`. Record baseline failures separately in this dirty tree.

Audition three short before/after examples: lyrical lead, fast run into a held note, and phrase with rests plus a large leap. Save reproducible fixtures/renders under `work/audio/auto-portamento/` with settings and voice IDs. Confirm the effect is audible without swallowing the melody or changing the rhythm. Inspect the served desk card and existing Lab toggle in the real renderer. Restart `npm run dev` in-session if builder/template changes require it.

The final implementation report should name supported families, explain settings/defaults, link changed code and audition artifacts, and distinguish tests/build evidence from UI inspection, actual listening and phone/device QA. If a renderer or browser run is blocked, report the precise remaining gap; do not label source inspection as audio acceptance.
