# Pilot Quick Editors: MRDR-3 and Drum Synth

## Summary

Implement Quick/Advanced editing for only two synths first:

- **MRDR-3:** complex melodic/layered test case.
- **Drum Synth:** variable multi-source percussion test case.

Other synth types retain their current detailed editor until the pilot has been used and evaluated.

Quick contains up to eight pots in the existing four-column grid. Advanced opens as a non-modal right-hand slide-over and reuses the existing detailed controls. Both views edit the same live preset and share audition, Save, Revert and level measurement.

There are no hidden macro offsets:

- Direct controls alias one Advanced parameter.
- Collective controls proportionally rewrite applicable Advanced values.
- Advanced always shows exactly what will be saved.

## MRDR-3 Quick Editor

Eight pots:

1. **Level** — preset `trim`.
2. **Attack** — all active VCA attack stages.
3. **Decay** — all active VCA decay stages.
4. **Release** — all active VCA release stages.
5. **Brightness** — master post-drive `tone.freq`.
6. **Filter Sweep** — `global.filter.env.octaves`.
7. **Resonance** — `global.filter.Q`.
8. **Vibrato** — shared `vibrato.depth`.

Collective VCA rules:

- Include Osc 1–3 when enabled and their Amp mode is `ENV`.
- Include Global Amp when enabled.
- Exclude disabled layers, `THROUGH` layers, filter envelopes, pitch envelopes, FM envelopes, Gate and curve shapes.
- Display the longest applicable stage in Quick.
- Setting a new value multiplies every applicable stage by `new longest ÷ previous longest`, preserving envelope relationships.
- If all applicable values are zero, assign the selected value to all of them.
- Use the existing 0–10-second envelope ranges and taper.

Filter rules:

- Brightness aliases the existing Advanced `TONE` control. At its top detent, remove/bypass the tone filter.
- Filter Sweep and Resonance enable Global Filter when absent, creating a low-pass, −12 dB/octave section with neutral Q, zero envelope amount and a near-open cutoff derived from the current master tone, capped at 8 kHz.
- Once created, the Global Filter remains an ordinary Advanced section.
- Rename the Advanced `LFO` card to **Mod LFO**. Mod LFO and per-layer PWM remain Advanced-only.

## Drum Synth Quick Editor

Maximum eight pots:

1. **Level** — preset `trim`.
2. **Tune** — master tuning in semitones.
3. **Attack** — active source amplitude attacks.
4. **Decay** — active source amplitude decays.
5. **Tone** — master post-drive `tone.freq`.
6. **Punch** — oscillator `knock`.
7. **Drive** — `drive`.
8. **Hits** — number of taps.

Applicability:

- **Tune** appears when Oscillator, Ring or Metal is active.
- **Punch** appears only when Oscillator is active.
- All other controls remain available, giving noise-only drums six controls and pitched drums up to eight.
- Conditional controls are omitted rather than displayed inertly; remaining pots reflow within the two-row grid.

Exact behaviour:

- **Level:** direct `trim` alias, −6 to +6 dB.
- **Tune:** add an optional top-level `tune` value, −24 to +24 semitones, default/neutral `0`. Expose the same Master Tune pot in Advanced.
  - Apply its frequency multiplier to Oscillator start/destination, FM carrier basis, Ring start/destination, Metal base/destination and Knock.
  - Preserve every internal interval and pitch-envelope amount.
  - Do not retune noise-filter cutoffs, Metal high-pass cutoff or the master Tone filter.
  - Presets without `tune` render identically to today.
- **Attack:** include `osc.attack`, `noise.attack`, `ring.attack` and `metal.attack` for active sections. Add Ring and Metal Attack to Advanced because the engine already supports those values. Exclude FM attack and Ring Strike.
- **Decay:** include `osc.decay`, `noise.decay`, `ring.decay` and `metal.decay` for active sections. Also scale stored `tapDecays`, because those override Noise Decay per hit. Exclude FM decay, Hold, Ring Strike and the fixed Knock duration.
- Attack and Decay use the same longest-stage proportional algorithm as MRDR-3 and the existing 0–10-second envelope taper.
- **Tone:** direct alias of the existing post-drive low-pass cutoff. The top detent removes/bypasses the tone filter.
- **Punch:** direct alias of `knock`, 0–1. It does not change Sag; detailed transient shaping remains Advanced.
- **Drive:** direct 0–1 alias. Drive shape remains Advanced.
- **Hits:** stepped range of 1–8. Use the existing tap add/remove behavior so uneven authored spacing is preserved. Per-hit timing, level, decay, tone, pitch and falloff remain Advanced.

## UI and Integration

- Add declarative pilot Quick specifications beside the current detailed definitions in `tools/mixer-voice-editor.js`.
- Default MRDR-3 and Drum Synth to Quick. Add one clear **Advanced** button; Advanced closes with its chevron or Escape.
- Lazily construct the slide-over only when requested. Use no backdrop and keep mixer playback and controls interactive.
- Preserve the editor’s strip-docked, library-docked and floating lifecycles. The slide-over is viewport-right in all three cases and retains separate scroll positions per preset.
- Use the existing `state.voice`, `touched()`, refresh, measurement, song-local draft and Save/Revert paths. No parallel editor state.
- Other synth classes continue opening directly in their existing detailed editor during the pilot.

## Tests and Pilot Gate

- Cover MRDR-3 with one, two, three and four active VCA envelopes, including disabled layers, `THROUGH` and Global Amp.
- Cover Drum presets built from Oscillator only, Noise only, Oscillator plus Noise, Ring, Metal, Knock and multi-hit taps.
- Verify collective edits preserve ratios, respect exclusions, handle all-zero stages and synchronize with Advanced.
- Verify Drum Tune at zero is render-identical; +12 semitones doubles all intended pitched frequencies, including Knock, without moving filter cutoffs.
- Verify Ring/Metal Attack round-trip through source saving and are audible only when non-default.
- Verify Tone’s bypass detent restores the node-free signal for both pilot synths.
- Verify Hits preserves irregular spacing and per-hit override arrays.
- Confirm Revert, Save, Save as New, song-local copies, class changes, deterministic rendering, level/peak estimation and silence rejection.
- Confirm opening Advanced during playback causes no audio rebuild until a parameter changes.
- Browser/listening acceptance: evaluate representative MRDR pads/basses/leads and Drum kicks/snares/claps/hats/rings/metal. Approve control names, ranges, conditional visibility and sound changes before mapping the remaining synths.

## Assumptions

- Eight is a ceiling, not a quota.
- The pilot may refine shared layout and aggregate-control behavior before other synths receive Quick mode.
- Hand-written `engine` presets and Noise Synth are outside this pilot.
