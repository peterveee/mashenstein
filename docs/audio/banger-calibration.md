# Banger instrument calibration

The desk's **BANGER CALIBRATION** action measures instrument/channel combinations through the real browser audio engine, validates the estimates on unseen phrases, and publishes reusable measurements. Generation uses a small lookup; it does not render audio on the player's device.

## Running it

```sh
npm run banger-calibrate -- report
npm run banger-calibrate -- refresh
npm run banger-calibrate -- refresh big-room trance
npm run banger-calibrate -- refresh --full
# Suitable for a daily external scheduler: runs only when changed or a week has elapsed.
npm run banger-calibrate -- refresh --due-days=7
# Bounded smoke run; explicitly reported as partial, not complete coverage.
npm run banger-calibrate -- refresh big-room --max-profiles=1
```

On the desk, choose styles and RUN. FULL REBUILD ignores cached measurements for that run. BANGER CALIBRATION COVERAGE is a quick inventory without audio rendering. OPEN leads to the calibration report, including validation errors, peaks and rejected profiles.

WEEKLY: ON schedules an incremental run of all styles seven days later. The setting survives restarting the desk. An overdue job starts when the desk is open and no other desk job is running. Turning the setting off prevents future runs; it does not interrupt an existing refresh. This is a desk-local scheduler, not a machine service that runs after the desk closes. It starts disabled.

## What is measured

Discovery includes the style parts, random instruments, rolled alternatives, mood overrides and saved sound combos, using `buildMix` to obtain the same channel settings as generation. Identical instrument/channel combinations share one profile. Melodic preset instruments are supported; drums retain existing sound matching, and built-in engine-only reference sounds are reported rather than approximated as presets.

The bench covers three registers, sixteenth notes, short eighth-note stabs, sustained notes, and two tempos around each profile's style tempo. Chord profiles also cover three and four simultaneous notes. Measurements include the instrument's EQ, inserts and sends, with the channel fader at unity and no master processing. Role-specific targets come from the existing reference parts and their original channels, also measured at unity fader. The approved reference fader remains the musical balance anchor. If a real but very quiet phrase falls entirely below the loudness meter's -70 LUFS absolute gate, calibration retries it with the same K-weighted blocks and relative gate but without that cutoff; a truly silent render still fails.

Each profile stores the measured difference from the existing note-energy predictor. Runtime interpolation considers pitch, duration, onset rate and chord size; distant scenarios fall back to the old model. A new profile must predict two unseen phrases within 3 dB. Unreliable profiles are listed as rejected and are not published. Existing valid profiles are retained on a failed remeasurement.

Both sides of a level comparison must have measured support. Otherwise the existing predictor remains in effect. Measured corrections allow attenuation up to 18 dB, with boosts limited to 2 dB. The existing conservative lead trims remain. A kept riff still retains its original channel behavior; this does not rewrite the balance of imported riffs.

Before publication, two deterministic generated mixes per selected style are compared against the existing predictor in an eight-bar busy section. A new clipping regression or a loudness increase over 3 dB blocks publication. These checks appear in the report.

This is instrument/part calibration, not full-song mastering. Per-profile peaks are reported, but are not a guarantee against clipping when layers sum. Use the desk's existing BANGER LEVELS checker and listening checks for generated combinations and overall musical balance. Temporary arrangement automation and master processing are not included in the instrument lookup.

## Cache, publication and maintenance

- Completed renders are saved individually to `work/local/banger-calibration/cache.json`; interrupted runs resume from that cache.
- The cache key covers the sound definition, channel processing, notes, tempo, renderer and engine signature. Editing an instrument invalidates its affected profiles; changing shared DSP invalidates all affected renders.
- A process lock prevents overlapping refreshes. Rendering uses the existing machine-wide slots and runs at reduced priority.
- `work/local/reports/banger-calibration.json` is the latest coverage or run report.
- `tools/lib/banger/calibration-data.js` is the published runtime table. Publication is atomic, and rendering errors leave the previous table intact. Source edits during a run prevent publication; rerun to reuse unaffected cached measurements.
- A full sweep can require tens of thousands of renders. Start with selected styles; the first sweep is much longer than later incremental runs.
- After changing an instrument, effects chain, library gain behavior or engine, run refresh and rebuild the game. Review rejected profiles instead of compensating with large blanket boosts.

The older single-note curve collector now includes rolled alternatives and combo parts too. Its `curves` and `check` commands remain available independently. Calibration can use its existing fallback predictor even when a one-note curve is absent; the new empirical residual is measured against that exact predictor.
