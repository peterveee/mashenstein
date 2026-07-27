---
name: render-video
description: Export an MP4 of a jukebox visualizer set to a rendered music bank, using tools/render-video.js. Use when asked for a video, trailer, clip, or screen-capture of a visualizer or track.
---

# Rendering MASHENSTEIN videos

`tools/render-video.js` exports an MP4 of any visualizer driven by any music
bank. It is **dev tooling and never ships** — nothing in `src/` imports from
`tools/`, the build only bundles `src/gate.js` and `src/main.js`, and the
dependency runs one way (the tool imports *from* `src/`). Rendered MP4s land in
`dist/`, which is gitignored, so a 300MB video is never committed.

```
node tools/render-video.js [trackId] [visualizer] [outPath] [--flags]
```

Defaults render the whole MONSTER MEGAMIX with TOASTER SKY PARADE at 1080p60.
`trackId` accepts `megamix|hub|title|finale|shop`, a cabinet id, or a shop-theme
id (see `tools/lib/tracks.js`); `visualizer` accepts a name or index from
`VISUALIZER_NAMES`. Useful flags: `--frames=N` (smoke test), `--ss=1` (faster,
slightly softer diagonals), `--workers=N`, `--no-gpu`, `--pixel`, `--crf=N`,
`--size=WxH` (arbitrary frame, cover-cropped), `--fade=N` (audio fade-out).

## The three things that make it fast

Measured on a 12-core M-series: 7800 frames went from ~43 min to **3:37**.

1. **GPU rasterization is worth ~5.6x and is off by default.** Headless
   Chromium software-rasterizes Canvas2D (SwiftShader). Launching with
   `--use-angle=metal --enable-gpu --ignore-gpu-blocklist` took end-to-end
   throughput from 3.45 to 19.3 fps. This is the single biggest lever — check it
   first for any Chromium-based rendering work in this repo.
2. **Segments render in parallel.** `draw()` on every visualizer is
   side-effect free — no RNG draws, no writes to `this.*` or particle state; all
   mutation lives in `update()`. So a worker reaches any frame by replaying
   `update()` alone, at ~0.01ms/frame against ~250ms to draw one. Each worker
   encodes its own range and the segments concat with `-c:v copy`.
3. **Each worker must draw one discarded warm-up frame.** Chromium rasterizes a
   canvas's *first* draw on a different path (the surface is promoted to GPU
   acceleration only once drawn to). Without the warm-up a worker's opening
   frame differs from a serial render on ~70 of 518,400 subpixels; with it, the
   output is bit-identical.

**ffmpeg is not the bottleneck** — don't optimise it. Encoding all 7800 frames
with `-preset slow -tune animation -crf 12` takes 136s, already across ~10
cores, and it runs *concurrently* with capture through a pipe. Hardware encoders
and JS muxers save essentially nothing here.

**WebCodecs is unavailable.** Playwright ships the headless *shell*, which does
not expose `VideoEncoder` at all. It would only have addressed PNG encoding
anyway — measured at 18% of frame time at `--ss=2`.

## Resolution: this art is not pixel art

Props are vector painters baked at 8x (`SS` in `src/sprites/props.js`) and the
skies are gradients, so drawing at 480x270 and upscaling throws away detail the
painters would happily have drawn. The tool sizes the canvas to the output and
scales the *context*, so the same logical 480x270 drawing code rasterizes at
1080p. `--pixel` opts back into the game's own presentation (draw small,
nearest-neighbour upscale) if you ever want that look deliberately.

Verified safe: no visualizer or sprite code calls `setTransform`/`resetTransform`,
which would break a pre-scaled context. Re-check that if you point this at new
drawing code.

## Audio reactivity is reimplemented offline

There is no Web Audio graph in an offline render, so `analyseSong()` reproduces
`Audio.musicAnalysis()` (`src/engine/audio.js`) against the rendered samples:
256-point FFT, Blackman window, `smoothingTimeConstant` 0.72, −100..−30 dB mapped
to 0–255, the same 55/240/2200/9000 Hz band splits and feature-level one-poles,
stepped once per video frame. The tool prints mean/peak for bass, mid and treble
— healthy values on megamix are ~0.66/0.40/0.23 mean. All-zero or pegged-at-1.0
means the analysis is wrong, and the visualizer will look dead or fully saturated.

Audio itself comes from `renderBank()`, the same DSP as `tools/render-track.js`,
so a video's soundtrack is identical to the WAV audition. It is mono, because
every bank in the game renders mono.

## Portrait and social exports

`--size=WxH` renders any frame. The logical 480x270 is scaled to **cover** the
target and centred, so a portrait frame crops the sides rather than distorting
or letterboxing. (The transform must be uniform — scaling each axis
independently is invisible at 16:9 but stretches the art at any other aspect.)

| target | size | keeps of 480 logical px |
| --- | --- | --- |
| Instagram feed 4:5 | `1080x1350` | 216 (44%) |
| Reels / Stories 9:16 | `1080x1920` | 152 (32%) |

Cropping suits **radial** visualizers (PRISMATIC STORM, MONSTER REACTOR,
SINGULARITY BLOOM) — shards leaving frame reads as energy. It suits wide
travelling compositions like TOASTER SKY PARADE far less, since the flock's
horizontal spread is the composition. Check what the visualizer's `draw()`
actually spans before promising a portrait cut; PRISMATIC STORM's field, for
instance, is ±240 logical px horizontally but only ±150 vertically.

`--size` rejects odd dimensions (yuv420p needs even) and refuses to combine with
`--pixel`, which exists to preserve an integer nearest-neighbour upscale.

For upload, re-render at a higher CRF rather than transcoding the master — same
wall time, but a single-generation encode. Instagram transcodes to roughly
3-5 Mbps regardless, so `--crf=20` is plenty: on a 49s 4:5 clip that measured
44MB / 7.5 Mbps against the crf-12 master's 106MB / 18 Mbps, at 44.9 dB PSNR
(visually indistinguishable). Dense, high-motion visualizers compress worse than
you would guess — hard-edged translucent shards give x264 little to reuse
between frames.

## Cutting to a musical boundary

Don't eyeball a cut point — banks declare their own structure. A bank has
`sections` plus an `order` array, and **each `order` entry is a two-bar block**
(`songBlocks()` in `tools/lib/render-bank.js`). So:

```
blockSeconds = 32 * (60 / bank.bpm) / 4      // 32 sixteenth steps
cutSeconds   = blockIndex * blockSeconds
--frames     = Math.round(cutSeconds * fps)
```

Find the section you want by index in `order`. Worked example: the shop theme
names sections 7 and 8 `breakdownBase`/`breakdownLift`, and `order.indexOf(7)`
is 11 — so at 108 bpm (4.444s per block) the breakdown starts at 48.889s, or
frame 2933 at 60fps. Cutting a few ms early lands just before the downbeat.

Truncating with `--frames` also truncates the audio (ffmpeg `-shortest`), which
lands mid-waveform and clicks. Pass `--fade=0.35` or similar. Verify it landed
with `ffmpeg -hide_banner -ss <end-0.15> -i out.mp4 -af volumedetect -f null -`
— note `-v error` suppresses volumedetect's output, so use `-hide_banner`.

## Verifying a render

- **Never trust the file until the run finishes.** An MP4 has no `moov` atom
  until the last moment, so a partial render is unopenable with or without
  `+faststart`. The tool encodes to a hidden `.partial` beside the destination
  and renames atomically on success, so the output path always holds either a
  complete video or the previous one.
- `ffmpeg -v error -i out.mp4 -f null -` decodes every frame and reports errors.
- `ffprobe -count_frames` to confirm the expected frame count survived the concat.
- To compare two renders, use PSNR rather than byte equality:
  `ffmpeg -i a.mp4 -i b.mp4 -lavfi psnr -f null -`. Parallel and serial renders
  differ at ~56 dB (visually lossless) purely because x264 rate control sees
  different windows — that is codec noise on identical source frames, not a
  content difference. CRF keeps quality constant across segments, so there is
  no seam.

## Cost

At `--ss=2` a 130s render pipes ~15GB of PNG over the CDP bridge (never to
disk). `--ss=1` is roughly 2-3x faster with the difference confined to diagonal
edges — the right setting while iterating; save `--ss=2` for final exports.
