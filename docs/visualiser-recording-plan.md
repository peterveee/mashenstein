# Recording the visualiser lab

Parked, not started. Written up while the half-pipe lab was fresh so the reasoning
survives; nothing below has been built.

## What this is for

The desk's Visualiser panel has a tunable version of HALF-PIPE HORIZON —
`HALF-PIPE HORIZON — LAB`, reached from the picker, with a row of knobs along the
bottom of the full-screen overlay. Playing with those knobs against a song is a
performance: the interesting output is not a set of numbers held for four minutes
but *when* you turned them. Nothing currently captures that.

There are two routes, and they answer different questions. The first captures a
take. The second masters one. They are not alternatives so much as a cheap one and
an expensive one, and the cheap one is almost certainly the one to build.

## Route A — live capture (recommended, small)

Record the pixels and the audio as they happen, exactly as performed.

**Video.** The overlay already owns a canvas that is drawn to every frame, so
`viscanvas.captureStream(60)` yields a live video track with no extra rendering
work. See `visualiserFrame()` in [tools/mixer-entry.js](../tools/mixer-entry.js).

**Audio.** `Audio.ctx.createMediaStreamDestination()`, connected in parallel from
`Audio.master`. That node already feeds `ctx.destination`
([src/engine/audio.js:589](../src/engine/audio.js#L589)); a second connection off
the same gain taps the full desk output without changing a thing about what is
heard. This is the same trick `_startCapture` uses around
[src/engine/audio.js:3291](../src/engine/audio.js#L3291) — worth reading first, it
is the existing precedent for tapping master, and its zero-gain-sink comment
explains why the tap does not double the output.

**Recorder.** Combine the two tracks into one `MediaStream`, hand it to
`MediaRecorder`, accumulate chunks, and on stop build a Blob and trigger a
download. A REC button on the control bar next to RANDOMISE/RESET, and a visible
running indicator — a recording with no obvious way to stop it is how somebody
ends up with a four-gigabyte file.

Roughly forty lines in `mixer-entry.js` plus a button and a dot in
[tools/mixer-shell.html](../tools/mixer-shell.html). No engine changes.

### What to get right

- **Container.** Chrome's `MediaRecorder` reliably produces WebM (VP9). Recent
  Chrome also accepts `video/mp4;codecs=avc1`. Feature-test with
  `MediaRecorder.isTypeSupported` and prefer MP4, falling back to WebM rather than
  assuming either. If a true MP4 is required from a WebM take, remuxing after the
  fact with ffmpeg is lossless and takes one command.
- **It is a performance, not a render.** Five minutes takes five minutes, and any
  frame the machine misses is missed for good. Headroom is good — the desk stops
  drawing while the overlay is up (see the note above `tick()`), and the preset
  costs 0.70 ms/frame at 1080p — but this is real time and cannot be rescued.
- **Size.** 1080p60 VP9 runs roughly 100–300 MB for a few minutes. It arrives as a
  browser download; `work/video/` is where it belongs, per the table in
  [CLAUDE.md](../CLAUDE.md).
- **Stopping.** Stop on the button, on leaving the overlay, and on the song
  stopping. Leaving the visual mid-recording should finish the file, not discard
  it.
- **Don't record the hint or the knobs.** They are DOM siblings of the canvas, not
  drawn into it, so `captureStream` already excludes them. Worth stating, because
  it is the reason this route needs no compositing at all.

## Route B — record the moves, render offline (a master, expensive)

Capture a timestamped automation list — `{ beat, key, value }` per knob change —
instead of pixels, then replay it through
[tools/render-video.js](../tools/render-video.js) for a deterministic 1080p60 file
with no dropped frames.

This needs three things that do not exist:

1. **A `--tune` flag** on `render-video.js`. It currently resolves a preset with
   `VISUALISER_NAMES.indexOf(...)` and exits if it misses, and the lab is
   deliberately not in that list — see the comment on `createHalfPipeLab` in
   [src/engine/visualisers.js](../src/engine/visualisers.js). The renderer already
   bundles that module, so the factory is in reach; what is missing is a way to
   pass a tuning in and a branch to call it.
2. **Automation playback.** The list is keyed on beat rather than wall time, so it
   lands in the same place at any frame rate. `applyTune()` already takes a partial
   and eases the geometry, so playback is: before each frame, apply every event
   whose beat has passed.
3. **A way to get the list out of the desk.** Simplest is a "copy automation" button
   that puts JSON on the clipboard, which is also the thing that would let a take be
   kept, edited and re-rendered.

Worth it only if a finished, clean video is the goal. For "capture what I just
did", it is the wrong size of answer.

## Recommendation

Build Route A when the mood takes. Leave Route B until there is a take worth
mastering — and note that Route A's output is enough to decide whether there is
one.

## Standing constraint

Whatever gets built, the shipped preset must not move. `HALF-PIPE HORIZON` at
index 20 is what the game deals and what the megamix mixes, and
[tests/visualisers.js](../tests/visualisers.js) holds the claim that the lab at its
defaults is that preset frame for frame. Recording is a desk feature; it does not
get to reach into the pack.
