# Visualiser spin-out: an MP4 maker for arbitrary audio files

## Objective

A self-contained app where someone drops in an MP3 or WAV, previews any of the
jukebox visualisers reacting to it live, and exports an MP4 carrying the
original track. No game, no music bank, no sequencer.

Status: **idea only, nothing built.** Written up 2026-07-29 after a feasibility
read of the existing code. Overall verdict: far cheaper than it sounds, because
two of the three hard pieces already exist and are battle-tested.

## Why this is cheap

**The visualiser is already a pure function of an analysis feed.** It has no
idea the game exists. The entire contract is:

```js
const vis = createVisualiser(name, seed, { bpm });   // visualisers.js:2517
vis.update(dt, { bass, mid, treble, level, dynamics, beat, beatPhase, beatPulse, spectrum });
vis.draw(ctx);                                       // writes no state
```

The `track` object it is handed only ever reads `.bpm`, at `visualisers.js:164`,
and only as a fallback when `analysis.beat` is absent. Nothing else in
`src/engine/visualisers.js` reaches into game data.

**`tools/render-video.js` is already ~90% of the export pipeline.** Chromium +
Canvas2D at output resolution, supersampling, cover-crop to arbitrary aspect
(`--size=1080x1350` works today), PNG→ffmpeg pipe, parallel workers, audio mux.
The only game-shaped line in the whole file is the `renderBankBrowser(track.bank)`
call that synthesizes the game's own song. Replace it with "decode the user's
file" and the rest stands.

**The offline analyser generalizes for free.** `analyseSong()` at
`tools/render-video.js:192` is a from-scratch reimplementation of the engine's
`AnalyserNode` readout (matching `musicAnalysis()` in `src/engine/audio.js:2615`)
that takes raw PCM. It does not care where the samples came from. Feed it
mp3-decoded PCM and it works unchanged.

That leaves one genuinely new problem, one easy-to-miss risk, and a packaging
decision.

## The one hard part: beat detection

Today the beat is a *perfect procedural clock* — `const beat = (t * bpm) / 60`
in `analyseSong`, and `songBeat()` in the live path, because the sequencer is
the source of truth. An arbitrary MP3 has none of that.

This matters more than it looks. The presets lean on beat heavily:
`ringRotationAt()` (`visualisers.js:132`) picks seeded 4/8/16-beat holds and
eases a 90–180° turn over exactly one beat, and `beatPulse` drives accents in
nearly every preset. A wrong or drifting beat does not degrade gracefully — it
reads as broken.

Two tiers:

- **Cheap (hours):** the user types a BPM, with tap-tempo and a downbeat-offset
  slider. Unglamorous, but honest, and it gets ~90% of the result.
- **Proper (~a week):** onset detection plus autocorrelation tempo estimation.
  Substantially easier than the realtime case because the whole file is
  available up front — estimate over the entire track, then fit a phase.

## The easy-to-miss risk: loudness

`dynamics` is `sqrt(level / recentPeak)` with a ~30s peak decay, and it feeds
`MOTION_FLOOR` / `MOTION_EASE` (`visualisers.js:48-53`) — the whole
slow-down-through-a-breakdown behaviour. Those constants were tuned against
*our own mixes*.

A commercial master crushed to −8 LUFS will pin `dynamics` near 1 for the entire
track: the motion floor never engages, nothing breathes, and every song looks
like one long chorus. Needs a per-file normalization pass before analysis.
`tools/lib/loudness.js` already implements BS.1770/EBU R128, so the measurement
side is done.

## The art question (not a technical one)

14 of the 17 presets are abstract and ship clean. Three are not:

- **ARCADE ART GALLERY** and **TOASTER SKY PARADE** call `drawToon`
  (`visualisers.js:1564`, `:1590`) and `drawProp`/`drawApplianceFinish`
  (`:1510`, `:1722`), pulling in `src/sprites/toons.js` (~5,500 lines) and
  `src/sprites/props.js`. These put MASHENSTEIN heroes and appliances on screen.

Either ship the characters as branding or cut those presets. That is a decision
about what the product is, not a difficulty.

## Packaging: two routes

**Electron / Tauri, bundling ffmpeg.** Reuses `render-video.js` nearly verbatim,
keeps the fast parallel-Chromium-worker render. More build/signing work,
requires an install.

**Pure browser, WebCodecs.** `VideoEncoder` + `AudioEncoder` + an mp4 muxer —
no server, no ffmpeg, no install. Drag an MP3 onto a page, get an MP4 back.
Much better UX and well-supported now outside Firefox; slower than four
parallel workers. Probably the right answer for a consumer product.

Note that browser-side decoding is free either way: `decodeAudioData` handles
mp3/wav/m4a. A Node CLI variant would shell out to ffmpeg, already in the pipeline.

## Rough effort

| Scope | Effort |
|---|---|
| Browser page: load a file, live preview, manual BPM, export via adapted `render-video.js` | 2–3 days |
| + real beat detection, loudness normalization, in-page WebCodecs export, preset/aspect UI | 1–2 weeks |
| Shippable: format edge cases, progress UI, error handling, branding | ~a month |

## Watch out for

- **The presets are tuned against our mixes.** Drum-and-bass and solo piano will
  expose whether the analysis constants generalize at all. Test against a handful
  of real, varied tracks *before* committing to the idea — this is the largest
  hidden risk and it is not a code risk.
- **`analyseSong` mirrors `musicAnalysis` by hand.** Two implementations of the
  same filter chain that must stay in step; a spin-out doubles the reasons to
  touch them. Worth extracting to a shared module if this goes ahead.
- **Logical 480×270 is baked in** as `W`/`H` consts throughout `visualisers.js`.
  Not a blocker — `render-video.js` already resolves it with a cover-crop
  transform and rasterizes at output resolution — but nothing can be drawn
  *outside* that logical frame.
- **`screen.px` is read once** at `visualisers.js:2087` (density in the fractal
  preset), the only import from `src/engine/renderer.js`. A spin-out needs a
  one-line stub for it.
