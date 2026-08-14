# The bounce is not what you hear: per-bar gain trims and the offline voice pool

Found while chasing "bar 9 of SHOPPINGCHANNEL sounds muted, bars 8 and 10 are fine".
Bar 9 was a symptom. The real defect is that **an offline render and live playback take
different code paths, and one of them was wrong** — so a song that plays correctly on
the desk bounces to a WAV with notes missing. Three faults are fixed and verified; a
fresh desk bounce/listening pass remains the final audible acceptance gate for the
complete SHOPPINGCHANNEL song.

The first question asked was whether anything drops instruments to control clipping.
**It does not.** The bounce writes at unity (`bounceWav`, tools/mixer-bounce.js), and
`clipping: out.peak > 1` is a report that reaches the UI as the `** CLIPPING **` text
and nothing else. No lane is muted, ducked or gain-ridden on that path. Every level
change in a bounce comes from the song's own mix.

## The song under test

`src/data/imported/shoppingchannel.js` — 64 arranged bars, `arrangement.bpm` 80 against
a composed 120, so 3.0 s a bar and 192 s of music. The lane that shows it best is
`lead3`: the `epiano` preset, lane gain +1.488 dB, a doubler insert, delay and reverb
sends. Its per-bar gain trims across the song:

| bars | 1–9 | 10 | 11–18 | 19–25 | 26–34 | 35–41 | 42–50 | 51–57 | 58–64 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lead3 trim | — | −3.5 | −6 | — | −6 | — | −6 | — | −10.5 |

Bars 9 and 41 are the same bar of music twice: same section, same half, same mutes,
same transposes, no per-bar gain. They must render identically. They did not.

## Fault 1 — `_retire` disposed the voice pool offline. FIXED

`VoiceRack._pool` (src/engine/voices.js) keys a pool on `laneKey|voiceId|echo` and
treats a changed `dry`/`wet` pair as a different graph — it retires the pool and builds
another. A per-bar `gain` trim routes the lane through a bus of its own
(`Audio._barGainBus`, src/engine/audio.js, keyed `lane|dB`), so **every change of trim
value on a lane is a new graph, and every change retires that lane's pool.**

`_retire` then branched on the context:

```js
if (typeof this.ctx.startRendering === 'function') { this._disposePool(pool); return; }
```

Live, it books a `setTimeout` and lets the pool ring out. Offline, it disposed on the
spot — and offline, "on the spot" is **scheduling** time. The walk runs ahead of the
render clock, and a bounce schedules the whole song before a sample is rendered, so
disposal destroyed every note already booked on those synths. They never sounded.

This is why the defect is inaudible live and total in a bounce.

### The fix

Three edits in `src/engine/voices.js`: a `_retiredOffline` list in the constructor,
`_retire` setting the pool aside instead of disposing it when offline, `dispose()`
draining that list, and `retiredPools` in the diagnostic counting both lists. A render
is bounded and its whole graph goes with the context, so nothing leaks.

### Evidence

`work/local/bargain-min.js` — one lane, sixteen bars, trims of none / −6 / none / −10.5
in four-bar blocks, whole song scheduled before rendering, exactly as a bounce does.

| bars | trim | before the fix | after the fix |
| --- | --- | --- | --- |
| 1–4 | — | **−∞ (silent)** | 0.0 dB, exact |
| 5–8 | −6 | **−∞ (silent)** | −6.0 dB, exact |
| 9–12 | — | **−∞ (silent)** | −0.0 dB, exact |
| 13–16 | −10.5 | −10.5 dB | −10.5 dB, exact |

Only the block after the last retire survived. Everything booked before it was gone.

In the real song, lead3 soloed, dBFS RMS per bar against a reference render with the
per-bar trims stripped, after Fault 1 but before Fault 2:

| bar | before fix | after fix | reference |
| --- | --- | --- | --- |
| 8 | −37.5 | **−28.5** | −28.5 |
| 23 | −57.4 | **−27.8** | −27.6 |
| 38 | −40.7 | **−28.5** | −27.8 |
| 52 | −34.5 | **−28.2** | −28.1 |
| 9 | −34.0 | −30.4 | −28.4 |
| 53 | −43.1 | −30.4 | −28.4 |

`npm run test:sound` passes all 47 audio suites with the fix in place, and
`tests/bar-gain.js` passes specifically.

### Why nothing caught it

`tests/bar-gain.js` renders **one** trimmed bar and checks its arithmetic. The failure
needs at least two different trim values with untrimmed bars before them. The suite
proved the level was right while whole bars went missing.

**Implemented:** the multi-switch case from `work/local/bargain-min.js` is now a second
case in `tests/bar-gain.js`. It renders sixteen bars with `none / −6 / none / −10.5`
four-bar blocks, checks every bar remains audible, and checks each block against a
no-trim reference. `tests/bar-gain.js` is also included in the sound-test group.

The shared JIT render walk now checks completion against `scheduleCalls` rather than
the musical `steps` count, so a 1/32 transport cannot report success after scheduling
only half of its required calls. The render metadata exposes both scheduled and expected
call counts for focused coverage.

## Fault 2 — untrimmed bars take the FOLLOWING block's trim. FIXED

After Fault 1, bars carrying no trim of their own still rendered attenuated, by very
close to the trim value of the *next* block:

| bars | measured deficit | next block's trim |
| --- | --- | --- |
| 9 | 1.9 dB | −3.5 |
| 24, 25 | 6.3, 5.1 dB | −6 |
| 39, 40 | 5.2, 5.1 dB | −6 |
| 54–57 | 10.1–10.7 dB | −10.5 |

Damage begins three to six bars into an untrimmed run and worsens toward the change.

### Ruled out

- **The arrangement data.** Bar 9 carries the same lanes, mutes, transposes and gains
  as bars 3–8 and 10. Its twin bar 41 is identical in every field.
- **Note lengths.** Every chord in bars 7–10 carries `lead3Len` 0.96.
- **Voice stealing.** Simulated against the round-robin pool: lead2 and lead3 lose
  ~100% of their notes to stealing in *every* bar of that section, so it is real but
  does not single out any bar. (See "separate finding" below.)
- **The trim value itself.** Give lead3 the **same** trim on every single bar and the
  render is bar-for-bar identical to one with no trims at all. Having a trim is
  harmless; changing one is not.
- **Peter's uncommitted edit** to bar 10 (`lead3` −6 → −3.5, `lead2` −7.5 → −5.5).
  Reverting it to the HEAD value leaves bar 8 at −37.5 dB either way. The fault is in
  HEAD; the edit only changed which bars were noticed.

### The awkward counter-evidence

Strip every lead3 trim and put **one** back on bar 58 alone at −10.5:

- bars 54–57 barely move (−1.7 to +0.6 dB)
- **bar 58 itself drops only 0.4 dB**, when its own trim is −10.5

So a single isolated trim change is nearly harmless, and the trim is barely applied at
all in that configuration. The effect needs a *history* of switches. Any explanation has
to account for both this and the uniform-trim result above.

### Cause and fix

The saved arrangement was resolving the correct dB values. The defect was the route
change itself: a pooled preset voice was handed a new dry/wet gain bus whenever its bar
trim changed. `VoiceRack._pool` correctly treats a changed route as a new graph, so the
trim sequence repeatedly retired and replaced the pool. The old pool was kept alive after
Fault 1, but the route transition still made the audible level depend on the history of
prior trims and on which long-release slots were active.

For pooled voices, `scheduleStep` now keeps the stable lane gate/strip route and passes the
bar trim as `gainScale` to `playVoice`. That applies the same linear factor to the voice's
per-note gain while preserving the dry and wet sends, pool identity, and release tails.
Hand-rolled engine lanes retain the existing bar-gain bus because their envelopes
converge on the native `play` helper rather than a pooled voice gain.

### Evidence

- The browser-backed `tests/bar-gain.js` switch case passes every bar and measures
  0.00, −6.00, −0.00 and −10.49 dB for the four requested blocks.
- The diagnostic SHOPPINGCHANNEL route trace isolated the cause: the expected dB value
  was resolved at each changed bar, but each switch changed the pool's dry/wet identity.
  JIT and upfront walks made the same 1,024 calls and the same route decisions, ruling
  out the chunked walk as the source of the attenuation.
- The focused browser regression is the acceptance gate for the gain arithmetic. A full
  48 kHz, 64-bar A/B is intentionally not claimed here: it exceeded the available local
  render window before producing a result.

## Fault 3 — silent stretches. FIXED

Independent of the trim-route faults, the original probe showed lead3 with notes and no
mute at or near digital silence:

- bars 26, 40, 41, 42 (bar 41 is bar 9's twin), 60–64
- bars 61–64 are −∞ in **every** lane, not just lead3

The renderer was the cause. When a caller supplied an explicit desk arrangement, the
page applied that arrangement to the scheduler, but `openRenderer().render()` still
sized the `OfflineAudioContext` and its fallback step count from `songBlocks(bank)` on
the composed form. A longer arranged form was therefore truncated at the composed end;
per-bar probes that continued across the arranged timeline saw digital silence. The
same mismatch made quiet lane-only stretches look like an instrument or pool failure.

### The fix

`tools/lib/render-bank-browser.js` now builds one `sizedBank` with the explicit
arrangement before resolving tempo, swing, loop length, block count and buffer steps.
The page still receives the original bank plus the arrangement and applies it through
`Audio.setArrangement`; both sides now use the same bar plan. Composed-form renders
remain unchanged when no arrangement is supplied.

### Evidence

- The focused arranged-render regression in `tests/render-length.js` uses a two-bar
  composition with an eight-bar explicit arrangement. It schedules all 128 steps,
  allocates 16.25 seconds, and remains audible near the end of the form.
- A reduced-rate full SHOPPINGCHANNEL render schedules all 1,024 calls and has nonzero
  RMS in every arranged bar, including 40–42 and 61–64. This is diagnostic PCM evidence,
  not a claim of a production-rate listening session.

Fault 3 is therefore **FIXED**. A fresh desk bounce/listening pass remains the final
audible acceptance gate for the complete SHOPPINGCHANNEL song.

## Where the render and live playback diverge

Every offline-only branch in the engine, for whoever needs the map:

| site | offline behaviour | affects a bounce? |
| --- | --- | --- |
| `voices.js` `_retire` | **was** disposing immediately | **yes — fault 1** |
| `voices.js` `_playCached` | never replays cached notes | no, and correct: a bounce must synthesise |
| `voices.js` `_playCachedLayer` | same | no |
| `voices.js` `_applyLive` | writes values instead of gliding | no — live pot edits only |
| `voices.js` `_fadeAndDispose` | disposes without a fade | no — preview pools only |
| `audio.js` `_cutBenchGates` | cuts at once | no — bench gates only |
| `mixer.js` `canSleep` | never sleeps silent lanes | no, and the safe direction |

Apart from the note cache, which is deliberate and desk-only, a bounce is meant to be
identical to playback. `_retire` was the one place it silently was not.

## Separate finding, not a regression

`lead2` runs `tpPianoetta`, whose decay is 3 s, on a pool of 5 slots taking 3-note
chords every one or two sixteenths. Simulating the round-robin allocation over the
arranged song, that lane loses close to 100% of its notes to stealing in every bar,
throwing away ~2.8 s of tail per note. `lead3` (`epiano`, 1.2 s decay + 1 s release)
is the same story at ~1.6 s per note. This is how the engine has always behaved —
`_pool` grows to the widest chord plus one and stops — but it means those two lanes
never sound the way their presets suggest. Worth a decision, separately from the bug.

## Reproducing

All probes are throwaway and live in `work/local/`:

| script | what it answers |
| --- | --- |
| `bargain-min.js` | the minimal 16-bar repro; run with and without the fix |
| `bar9-probe.js` | full song, per-bar RMS, whole mix then one lane at a time |
| `bar9-cause.js` | as-saved vs lead3 trims stripped vs all trims stripped |
| `bar9-bus-switch.js` | uniform trim on every bar vs no trims — isolates switch from value |
| `bar9-backwards.js` | a single trim on bar 58 at two values |
| `bar9-steal.js` | voice stealing per bar, no render needed |
| `bar9-regression.js` | working tree vs HEAD's bar 10 |

Each writes a CSV beside itself. A full-song solo render is ~3 minutes.
