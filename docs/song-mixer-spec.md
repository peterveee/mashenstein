# Song Mixer — Technical Specification

## Overview

The Song Mixer is a browser-based digital audio workstation (DAW) purpose-built for
**MASHENSTEIN**, a rhythm-action game. It runs at `http://127.0.0.1:8010` via
`npm run mixer` and provides a full mixing desk, arrangement editor, step sequencer,
piano roll, voice preset library, and effect rack — all driving the game's own audio
engine. Every fader, EQ band, send, and insert you move controls the **exact same
Web Audio API nodes** the game uses at runtime and the offline renderer uses when
exporting WAVs, stems, or videos. Nothing in the tool reimplements audio.

### Key architectural principle

The mixer is NOT a separate audio application. It is the game's engine (`src/engine/`)
loaded into a browser page with a control surface bolted on. This means:
- A mix heard in the desk **is** what the game will sound like.
- An offline render (WAV export, stem export, video render) **is** the same signal
  path, just driven by an `OfflineAudioContext` instead of a real-time one.
- There is no "export mix settings" step — saving a song writes its channel strips,
  effects, arrangement, and voice assignments directly into the source file the game
  imports.

---

## What it produces

Each song lives in a single JavaScript module under `src/data/songs/<id>.js` (built-in
songs) or `src/data/imported/<id>.js` (scratch songs). The file contains:

1. **The bank** — the composition: which voices play which notes, in which patterns,
   at what BPM. Written above a marker comment; the desk never touches this half.
2. **The mix** — per-lane channel strip settings: gain, pan, mute, 3-band EQ, stereo
   width, up to 6 insert effects, and send levels to shared delay and reverb returns.
   Written below the marker.
3. **The arrangement** — which lanes play in which bars, and any per-bar edits
   (transpose, timing offset, gain trim, mute, note-level edits).
4. **Voice assignments** — which preset (or engine default) each lane uses.
5. **Master settings** — trim, pan, limiter on/off, master insert chain.

These are saved together in one operation. Peter reviews diffs and commits; the mixer
never touches git.

---

## Desk layout (top to bottom)

### 1. Header

| Element | Purpose |
| --- | --- |
| **Song picker** (hamburger menu) | Slide-out drawer: open/save/delete songs, recent list (localStorage MRU), search by title/ID, grouped by theme/cabinet/scratch/MIDI-import. |
| **New Song dialog** | Creates a scratch song with a generated name (adjective+noun), configurable bars (1–64), BPM, a **style pack** (8 genres — see below), and a starter template (Blank/Beat/Full Band). |
| **Transport** | Play-from-top, Stop (returns to start position), Play (from playhead), Pause. Stop ≠ Pause — Stop snaps back; Pause holds position. |
| **Solo clear** | Lit when anything is soloed; one click clears all solos (monitoring only, never saved). |
| **Loop** | Arms loop over shaded region on timeline. 1/2/4/8/All bar presets. Loop follows playhead bar. `L` toggles. |
| **Readouts** | Current bar / total bars, elapsed / total time, draggable BPM override (teal when overridden; never saved — tempo belongs to the song), CPU meter (engine base ~10% + measured effect costs; red >45%). |
| **Panel toggles** | On-screen keyboard, step sequencer (G), piano roll (N), preset library. |
| **A/B saved** | Hold to hear what's on disk, release to return to your draft. |
| **Undo** | 200-step undo stack spanning songs. Slider drags coalesce into one gesture. |

### 2. Timeline

A bar ruler with ticks, numbered every 2/4/8/16 bars depending on song length. Red
playhead line; teal loop band. Click to park, double-click to play from there. Drag
to select a bar range (hatched band = structural selection for copy/cut/paste/silence/
delete operations).

**Right-click the timeline** opens the selected-bars editor with cut/copy/paste,
repeat, insert silence, mute, delete, and exact per-track controls (transpose ±12
semitones, timing offset ±quarter note in 1/64 steps, gain ±12 dB in 0.5 dB steps).

**Fold chevron** reveals section blocks: coloured 2-bar blocks showing verse/lift/
bridge structure.

Playhead position is compensated for Web Audio lookahead and output latency. A
per-machine offset (default 50ms, adjustable with `[`/`]` keys while playing) accounts
for display buffering.

### 3. Arrangement panel

One row per instrument lane, one cell per bar (or per beat on short songs). Cells are
shaded by density — hue = channel, lightness = note density.

Each row: track number, M(ute)/S(olo) buttons, family icon, lane name.

- **Click a bar** — select channel + park playhead
- **Double-click a bar** — play from there
- **Click a lane name** — select that channel
- **Double-click a name** — play from where that lane first sounds
- **Right-click a name** — track panel: rename, change preset, duplicate, delete,
  edit part
- **Drag across a row** — select a bar range for that instrument
- **Drag a row's header** — reorder the track. Down lands after the drop target, up
  lands before it. A track carries the layers sitting under it. The strips below move
  with it: the arrangement and the mixer are two views of one order, stored per song as
  `mix.order` and applied by `deskLanes()` in `src/engine/lanes.js`. A song nobody has
  dragged has no `order` and keeps the engine's derived order exactly.
- **Right-click a bar** — selected-bars editor targeted at that instrument

**Colour coding**: filled cells = lane plays here; hollow/outlined cells = lane
silenced here (different from "doesn't play"). Transpose annotations show as `+5`,
`-7` etc. on affected bars.

**Splitter** below: drag to resize arrangement vs. mixer; double-click to auto-fit.

### 4. Step Sequencer (floating window, `G`)

A 16-step grid (sixteenth notes per bar) for editing drum/kit patterns. Floating
window — drag by title bar, remembers position.

- Paint/drag steps on/off in one undoable gesture
- **Groove** dropdown: complete kit figures per style
- Per-lane dropdown: figures for that specific drum
- **Selected bars** mode: edits only visible bars
- **Shared pattern** mode: changes every bar using the same underlying pattern
- Click a lane name to mute/restore that drum in the visible bars
- Playhead stays live while song runs

### 5. Notes panel — Piano Roll (`N`)

For pitched/melodic lanes. Its own panel between the Arrangement and the Mixer, with
its own fold. Edits the selected channel's part for the selected bars. Same write
path, same undo/save integration as the step sequencer.

It sits there because both of its drivers are adjacent: double-clicking an arrangement
cell above selects that lane, marks that bar and opens the roll, and the selected strip
in the rack below is what the roll stays scoped to.

### 6. Mixer rack

**Strip-part switches** (EQ, Sends, Effects) — toggle visibility of those sections
across ALL strips. Hidden sections still process audio; this is a view filter only.
Collapsing them gives the freed height to the faders.

**Track-family filters** — buttons for drums/melodic/fx/vocal with lane counts. Hide
strips from the rack only (arrangement keeps all lanes, nothing is muted). Cannot
hide the last visible family. Track numbers remain global (hiding drums doesn't
renumber the bass).

**Channel strips** (left to right: master, channels 1–N, send returns pinned right):

| Section | Controls |
| --- | --- |
| **Head** | Track number, lane name, family badge. Click to select; double-click to play from lane entry; drag to reorder the track (moves the arrangement row with it — one order, two views). |
| **Voice** | Button showing current voice, or — with none chosen — the engine voice the bank already plays, named in dim italics ("ENGINE" only where the bank matches no preset). `‹` `›` arrows cycle within category. Click opens the voice library panel. |
| **EQ** | 3-band: HIGH shelf @4kHz, MID peak @1.2kHz, LOW shelf @250Hz. ±18 dB each. Transparent at 0 dB (serial biquad topology). |
| **Sends** | DELAY SEND, REVERB SEND: 0–2 range. Absolute and identical on every channel — each taps its whole lane, so the same reading sends the same amount of kick as of lead, in every bar. (It used to be scaled by the playing section's `echoLevel`, which is why a send could do nothing at all; that key is inert now.) |
| **Inserts** | Up to 6 effect slots. Click empty to open catalogue. Power button to bypass; × to remove. Drag to reorder. Right-click for context menu. |
| **Pan** | −100…+100 pot. Drag either axis; double-click to centre. |
| **Fader** | −60…+6 dB with console taper (unity at 75% travel). Meter with peak-hold (1.5s), red border on clip. |
| **M/S** | Mute (saved) / Solo (monitoring only, never saved). |

Every readout IS a control: drag up/down to change, shift for fine, click to type,
double-click (or click label) to reset to default.

**Send returns** (Delay, Reverb): same strip layout — EQ, fader (return level), pan,
mute/solo, insert slots. Device summary at top (e.g. `375ms · 0.35 · 2.8k`) is a
button opening that return's settings.

**Master strip**: trim on top of the bank's `musicTrim`, limiter toggle, 6 insert
slots. Same fader range as channels (−60…+6). No fixed EQ bands (use a Parametric EQ
insert instead).

### 7. Effects panel

Shows parameters for the selected strip's effect chain. Cards laid out horizontally.

**Insert slots on each strip**: click empty slot → catalogue. Click slot name →
select strip + scroll card into view. Power mark (hover left, or ⌥-click) → bypass.
× (hover right) → remove. Drag → reorder (order IS the signal path). Right-click →
context menu (open, bypass, copy/paste settings, duplicate, insert before/after, move
up/down, reset, remove).

**Effect catalogue** (grouped, with measured CPU cost per effect):

| Group | Effects |
| --- | --- |
| Level & EQ | Gain, Parametric EQ, Filter |
| Delay | Advanced Delay, Delay, Ping-Pong Delay |
| Modulation | Chorus, Phaser, Tremolo, Vibrato, Auto Filter, Auto Wah, Auto Panner |
| Drive | Exciter, Distortion, Chebyshev |
| Space & Stereo | Reverb, Doubler, Stereo Widener, Frequency Shifter, Pitch Shift |
| Dynamics | L7 Limiter, Compressor, Mid/Side Compressor, Multiband Compressor |

Every left/right control is labelled **BALANCE** for consistency.

**Key effects detail**:
- **Gain**: ±24 dB (extends beyond fader's +6), plus balance. Bit-transparent at centre.
- **Exciter**: Harmonic exciter — splits signal at TUNE frequency (700Hz–10kHz), distorts
  only the high band, mixes back over dry. TIMBRE knob blends odd→even harmonics. 4×
  oversampled to prevent aliasing.
- **L7 Limiter**: Lookahead brickwall limiter. THRESHOLD and OUT CEILING are coupled
  (pulling threshold down auto-applies makeup gain). ARC (auto release) adapts to
  material. Costs lookahead in latency (3ms default). Bypassed = sample-transparent.
- **Doubler**: Simulates double-tracking with independent controls for timing offset,
  pitch deviation, and level.

### 8. On-screen keyboard (floating window)

Plays the selected channel through its entire strip (fader, pan, EQ, sends, effects).
Floating window — drag by title bar, remembers position.

- **Melodic channel**: two octaves of piano keys in the channel's register. ◀ ▶ shift
  octaves. Click or drag across keys.
- **Drum channel**: one pad per drum in the song's kit. Drag across pads for a roll.
- **Keyboard**: computer keyboard input, two-row DAW layout — `Z S X D C V G B H N J M`
  is the lower octave with its black keys, `Q 2 W 3 E R 5 T 6 Y 7 U` the one above,
  carrying on through `I O P` / `[ = ]`; `−`/`+` shift the octave, `,` is the C above M,
  home row plays pads. Shifted keys are never claimed (that is what leaves `⇧R` free).
  Esc releases keys back to desk shortcuts.
- **MIDI**: Web MIDI input (Chrome/Edge). General MIDI drum note mapping (36→kick,
  38→snare, 42→hats). New ports detected after enabling.
- **Record** (`⇧R`): arms; all three inputs then write into the bank. Realtime,
  quantised to sixteenths, overdub, shared across repeats, buffered and flushed on the
  beat. Held time becomes the note's `${lane}Len`. Esc discards the take.
- **Record is in the transport group** (`#recbtn`, after `#pause`); **MIDI is in the
  right-hand toggle group** (`#midibtn`). Neither needs the OSK:
  `onMidiMessage` is gated only on a selected channel, and the GM drum map resolves
  through `oskKitLanes()` rather than the drawn pad elements. Only the computer keyboard
  still requires the window, via `oskCatch`.
- Keys light up with the notes currently playing through that channel.
- **Velocity is ignored** — level is the channel's, and a bank has no per-note velocity
  field. **Note-off is read** only by the recorder, to measure how long a key was held.

### 9. Voice library & editor

65+ presets across two kinds:
- **Built-in**: the game's hand-written voice code paths (Filtered Saw, 80s Bass,
  drawbar organ, plain waveforms). These are bank keys, not synths.
- **Synth presets**: built from Tone.js classes (MonoSynth, FMSynth, AMSynth,
  MembraneSynth, MetalSynth, NoiseSynth, DrumSynth).

Categories: Bass, Lead, Pad, Keys, Pluck, Organ, Bells, Orch, FX, Kick, Snare, Hats,
Clap, Tom, Crash, Perc.

**Voice editor**: opens inline on the strip (widens it). Edits mutate the catalogue
entry and hot-reload the synth. Parameters grouped by function (oscillator, filter,
envelope, etc.) using pots (not sliders). Choices are pill buttons, not dropdowns.
Peak level tracks in real-time as you edit (ratio-based, ~10ms offline render).
Save measures properly via the server's offline render pipeline.

**Drum constructions**: Tone drums (oscillator-based, 808-like), noise presets
(filtered burst from seeded buffer + optional pitched body), drum synth/Microtonic
(oscillator + filtered noise with independent envelopes summed into drive). All use
the engine's seeded noise buffer (not `Math.random`) so stems sum to the mix.

### 10. On-disk format

Each song file has this structure:

```
// ---- song file header (hand-authored) ----
// composition data: bank, patterns, notes, BPM
// ---- DESK MARKER (everything above is never touched by the mixer) ----

// Everything BELOW the marker is written by `npm run mixer`:

export const mix = {
  master: 0,           // master trim in dB
  masterPan: 0,        // -100..100
  limiter: false,      // master limiter on/off (costs 6ms latency when on)
  masterEffects: [],   // insert chain on master
  lanes: {
    bass: {
      gain: 0, pan: 0, mute: false,
      eq: { low: 0, mid: 0, high: 0 },
      width: 1,
      voice: null,        // null = engine default, else preset id
      effects: [],        // up to 6 { id, params, bypass }
      send: { delay: 0, reverb: 0 },  // 0–2
    },
    kick: { /* same shape */ },
    // ... one entry per lane in the song
  },
  // Aux returns
  delay: { level: 1, pan: 0, mute: false, eq: {...}, effects: [], division: 0.75, feedback: 0.35, tone: 2800 },
  reverb: { level: 1, pan: 0, mute: false, eq: {...}, effects: [], decay: 2.2, preDelay: 0.012 },
};

export const arrangement = {
  order: ['intro', 'verse', 'chorus'],  // section order
  sections: {
    intro: { bars: 4, lanes: { kick: {}, snare: {}, bass: {} } },
    verse: { bars: 8, lanes: { kick: {}, snare: {}, bass: {}, lead: {} } },
    // ... per-section lane lists with optional per-bar overrides
  },
};
```

Values equal to their engine defaults are omitted from the file to keep diffs clean.

---

## Style packs (New Song generator)

When creating a new scratch song, one of 8 style packs determines the song's
character. Each pack specifies:

- **Tempo** (e.g. 120, 72, 152, 88, 168, 96, 112, 76 BPM)
- **Key and mode** (aeolian/minor, dorian, ionian/major, harmonicMinor)
- **Harmony**: chord progression vocabulary, harmonic rhythm
- **Kit patterns**: drum figures for the style
- **Bass figures**: rhythmic and contour vocabulary
- **Melody grammar**: rhythmic patterns and pitch contour, chosen independently
  (so melodies have rests and syncopation, not unbroken eighth notes)
- **Which lanes are used** (e.g. Bell Box has NO drums at all)
- **Which voices those lanes play** (e.g. music box, celeste, glass pad)
- **drumGain / musicTrim**: per-pack level calibration so all packs sit in the
  same balance

| Pack | BPM | Key Character |
| --- | --- | --- |
| Electropop | 120 | Default; engine's own voices, square lead |
| Half-time Dirge | 72 | Reed organ + taiko |
| Surf Spy | 152 | Harmonic minor, plucked lead |
| Boom Bap | 88 | Dorian, electric piano sevenths |
| Motorik Driver | 168 | One chord, straight eighths |
| Bell Box | 96 | No drums — music box, celeste, glass pad |
| Parade March | 112 | Major, brass + strings |
| Dub Chamber | 76 | One drop, organ skank, everything in the echo |

A creation seed picks the key, progression, kit patterns, bass, and melody — so each
generated song is different but repeatable. Harmony and melody are written as scale
degrees, so transposition is real (same pack in D = D minor, with per-lane register
floors keeping bass and melody in their written octaves).

---

## Audio engine architecture

### Signal path

```
Per-lane voice → [Width] → [EQ (3-band biquad)] → [Insert chain (0–6 effects)]
    → [Fader + Pan] → [Mute] → musicBus
    ↘ pre-fader send (melodic lanes) → Delay send bus
    ↘ post-fader send (all other lanes) → Delay/Rev send buses

Delay send bus → [EQ] → [Insert chain] → [Fader + Pan] → master
Reverb send bus → [EQ] → [Insert chain] → [Fader + Pan] → master

musicBus → [songTrim] → [Master inserts (0–6)] → [Master trim]
    → [Limiter (optional DynamicsCompressorNode)] → destination
```

### Key implementation details

- **Pan law**: Forced stereo throughout. A mono voice is upmixed to L=R (unity gain)
  before the stereo panner, so centre is exactly transparent (gain ratio 1.0000).
  This avoids the 3 dB discrepancy between mono and stereo lanes that a native
  StereoPannerNode would introduce.
- **EQ topology**: Serial lowshelf → peaking → highshelf (native BiquadFilterNodes).
  Transparent at 0 dB (coefficients collapse to pass-through). NOT a crossover
  splitter (which would not be phase-transparent even at 0 dB).
- **Stereo width**: Mid/side matrix. width=1 is transparent; 0 = mono; >1 pushes
  sides beyond speakers.
- **Insert chain**: With no active effects, `from` connects directly to `to` — zero
  added nodes. Bypassed effects are disconnected (not turned down), so an effect with
  a tail doesn't keep ringing.
- **Delay**: Shared tempo-synced delay return (0.75 division default, 0.35 feedback,
  2.8kHz tone). Melodic lanes tap pre-fader (preserving the engine's original echo
  behaviour); all others tap post-fader.
- **Reverb**: Shared convolution reverb with generated (seeded) impulse response.
  NOT Tone.Reverb (which uses `Math.random` — two renders would differ, breaking
  stems and null tests). 2.2s decay, 12ms pre-delay defaults.
- **Limiter**: `DynamicsCompressorNode` on the master — a seatbelt, not a creative
  tool. Costs 6ms of output latency when engaged.
- **Voice preview**: Plays through the channel's entire strip (fader, pan, EQ, sends,
  effects) onto the master — so you hear exactly what the song will sound like.

### Constraints

- **All effects must render in an `OfflineAudioContext`**. Effects that use
  `AudioWorklet` (BitCrusher, JCReverb, Freeverb) are deliberately excluded — they
  render silent offline and would vanish from every WAV, stem, and video export.
- **All effects must render deterministically**. Anything using `Math.random` for
  buffer generation (like Tone.Reverb) breaks the null test — two renders of the
  same song must be bit-identical.
- **At defaults, the mixer must be inaudible**. Every existing song was balanced
  against the old topology; a strip at unity must be a pass-through.

---

## Data flow

### Loading
1. Server bundles `tools/mixer-entry.js` + all engine source + all song data into
   one IIFE via esbuild.
2. Browser loads the page, imports the game's audio engine (`Audio` class from
   `src/engine/audio.js`).
3. `MIX` and `ARRANGEMENTS` are imported from `src/data/mix.js` and
   `src/data/arrangements.js` as the "saved" state.
4. Any unsaved edits are restored from `localStorage` (keyed by track ID) as the
   "draft" state.
5. The engine's `AudioSys` is initialized with the mixer topology (channel strips,
   sends, master chain).

### Editing
1. Every control change updates the in-memory `draft` object AND moves the
   corresponding Web Audio API node (gain, biquad filter, pan, etc.) in real-time.
2. Undo stack records inverse operations. Slider drags are coalesced.
3. A/B comparison temporarily swaps the draft for the saved state.
4. Voice changes trigger a sequencer restart (half-second gap, playhead preserved).

### Saving
1. Desk posts the current song's mix + arrangement as JSON to the server.
2. Server takes a byte-copy snapshot of the existing file (`work/mix-history/` folder,
   kept for ~300 saves).
3. Server reads the current source file, finds the desk marker, replaces everything
   below it with the new mix + arrangement data.
4. Server writes the file back, updates `src/data/imported/index.js` if needed.
5. Server re-imports the file (with cache-busting query string) and returns the
   confirmed state, which becomes the new "saved" state in the browser.
6. Draft is cleared for that song. The dot (unsaved indicator) disappears.

### Rendering
- WAV export: server loads the song's bank + mix, creates an `OfflineAudioContext`,
  renders the full song through the engine, writes a WAV buffer. Reports LUFS
  integrated + peak.
- Stem export: same but one lane at a time.
- MIDI export: extracts note data from the bank, writes a Standard MIDI File with
  GM patch names.
- MIDI import: parses a `.mid` file into a bank, creates a scratch song.

---

## Server (Node.js)

`tools/mixer.js` — a plain `http.createServer`:

- **Port**: 8010 by default (`MASH_MIXER_PORT` env var), `MASH_MIXER_HOST` for
  binding.
- **Live rebuild**: the JS bundle is rebuilt per request via esbuild — save an
  engine edit and refresh to pick it up. No restart needed (unless adding server
  routes).
- **Routes**: serves the bundled page, handles Save (POST), WAV render, MIDI
  import/export, voice measurement, history listing/restore, scratch song creation.
- **Cache busting**: Every `import()` of a song file uses a monotonically
  incrementing query-string counter to defeat Node's ES module cache. A single
  counter is used for all reads to prevent stale-cache collisions.
- **History**: every save snapshots the file before overwriting. Keeps last ~300
  per type (mix files + arrangement files). Snapshots are byte copies of the `.js`
  (not JSON dumps), so they're diffable and loadable as real modules.
- **Song file writing**: one function (`writeSongFile`) writes one song, replacing
  everything below the desk marker. Never rebuilds the entire `mix.js` from all
  songs at once (a previous design that caused silent data loss).

---

## Current limitations & design choices

These are intentional constraints that another LLM should understand before
suggesting enhancements:

1. **Velocity is ignored** in the on-screen keyboard and MIDI input, and there is
   nowhere for it to go: a bank has no per-note velocity field, because level is a
   property of the channel. Adding one means a new `${lane}Vel` array, a `scheduleStep`
   change, an offline-render change and fresh `tests/null-test.js` risk. Note-off *is*
   read, and only recording uses it — see below.

2. **Recording is realtime and quantised to sixteenths.** All three live inputs (drawn
   keys, computer keyboard, MIDI) write into the bank when armed; see
   `tools/lib/note-recorder.js` for the clock and the take buffer, and the roll's
   `noteCell`/`noteLength` for the note semantics it reuses. Constraints worth knowing
   before extending it:
   - **Note starts remain on the sixteenth storage grid** — 16 steps per bar, with no
     note-on positions between them. Melodic note lengths live in per-note `${lane}Len`
     arrays and may be fractional; the piano roll edits them continuously by default,
     while its explicit Length menu can quantise selected notes or a whole track to
     sixteenth intervals.
   - **Overdub only.** Recording adds notes; deletion stays with the grid and the roll.
   - **Writes are shared** (`writeBarNotesShared`), so a note played into a looping
     section changes every bar that plays that part.
   - **Buffered, flushed on the BEAT** (~500ms at 120bpm), never per note:
     `applyArrangementEdit` pushes undo, revalidates the arrangement and rebuilds the
     timeline. The writes coalesce via `pushUndo`'s 700ms same-tag window, so a whole
     take is one undo step; mid-take writes are silent.
   - **Any pitched lane can hold a chord** — `polyLane(bank, lane)` in
     src/data/voices.js, which is now `!PERCUSSION_LANES && !MONO_LANES`. `scheduleStep`
     resolves a step through `tonesOf(v)` and each hand-written pitched body (bass, lead,
     leadHarm, twinkle) runs once per tone; `play()` builds its own oscillator per call,
     so polyphony there is a loop rather than a capability. `MONO_LANES` are the gesture
     lanes plus vox/shout, where a step is a shape or a word and not a pitch. A scalar
     yields one iteration, which is why tests/null-test.js is still sample-exact.
   - The piano roll stays VALUE-based (`isChord(value)`): a step is chordal when it holds
     an array, so click-to-replace on single-note parts is unchanged.
   - Notes within ~45ms share a quantised step (`chordAnchor`) so a chord cannot split
     across a rounding boundary.
   - **Held time becomes `${lane}Len`**, but that is a scheduled duration rather than a
     gate, and most hand-written voices cannot sustain — so long holds under-deliver on
     the voices whose envelopes are short. Percussion gets no length.
   - **No step recording yet** (transport parked, each note advancing the playhead).
     Same take buffer, different clock in front of it.

3. **The arrangement is bar-level**, not beat-level. You can mute/delete/transpose
   a lane for a whole bar, but not for (say) beat 3 of bar 4. Finer editing is in
   the step sequencer / piano roll.

4. **Two sends only**: delay and reverb. Additional shared effects would require
   adding entries to the `AUXES` array and growing every strip's send section.
   Per-channel delay inserts are already supported and are cheap (8.7ms per 20s of
   audio vs. 165ms for a convolution reverb).

5. **No automation.** There are no volume/pan/effect automation lanes or envelopes
   over time. Everything is static per song (though banks can vary per section).

6. **Scratch songs are not in the game catalogue.** They live in `src/data/imported/`
   and are not registered as playable tracks. MIDI imports are read-only (no desk
   marker to write below).

7. **Single undo stack** shared across songs (200 steps). No per-song undo history.

8. **No collaboration features.** Single-user, localhost-only by default. The
   `MASH_MIXER_HOST=0.0.0.0` env var allows LAN access but there's no multi-user
   conflict resolution.

9. **No metering beyond peak.** The channel meters show peak with 1.5s hold. No
   RMS, LUFS, K-scale, or spectral analysis in the desk. LUFS is only reported on
   WAV export.

10. **The voice library is flat** — 65+ presets, no user folders, no tags beyond
    the built-in categories, no favourites.

11. **Effects are Tone.js only.** No VST/AU plugin support (though `tools/audition.py`
    lets you preview a render through an AU plugin externally).

12. **No mixer snapshots or scenes.** A/B compares against the saved file only. No
    A/B/C/D comparison slots.

13. **No EQ spectrum display.** The 3-band EQ has no visual feedback of the
    frequency content.

14. **The timeline has no tempo map.** One BPM per song. No tempo changes, no
    time-signature changes.

15. **No vocal comping or audio tracks.** Everything is MIDI/sequencer-driven
    synthesised audio. No audio clip import or recording.

---

## Technology stack

- **Runtime**: Browser (Chrome/Edge recommended for Web MIDI)
- **Audio**: Web Audio API + Tone.js 15.x
- **Bundler**: esbuild (per-request rebuild)
- **Server**: Node.js `http` module (no Express)
- **Persistence**: Source files on disk (JavaScript ES modules) + `localStorage`
  for drafts and workspace state
- **Offline render**: `OfflineAudioContext` for WAV/stem/video export
- **MIDI**: Web MIDI API (input), custom parser/generator (import/export)

---

## File map

| Path | Purpose |
| --- | --- |
| `tools/mixer.js` | Node.js server: routing, save, render, history, import/export |
| `tools/mixer-entry.js` | Browser entry point: desk UI, state management, wiring |
| `tools/mixer-shell.html` | HTML shell the JS is injected into |
| `tools/mixer-step-seq.js` | Step sequencer UI component |
| `tools/mixer-piano-roll.js` | Piano roll UI component |
| `tools/mixer-bar-grid.js` | Arrangement grid UI |
| `tools/mixer-voice-editor.js` | Voice preset editor UI |
| `tools/mixer-voice-library.js` | Voice preset library panel |
| `tools/lib/song-styles.js` | Style pack definitions for New Song generator |
| `tools/lib/song-names.js` | Random name generator (adjective+noun) |
| `tools/lib/new-song.js` | Scratch song generator (uses style packs) |
| `tools/lib/song-file.js` | Song file reader/writer |
| `tools/lib/arrangement-edit.js` | Arrangement editing operations |
| `tools/lib/mixer-drafts.js` | Draft save/restore in localStorage |
| `tools/lib/mix-signature.js` | Change detection (is this song dirty?) |
| `tools/lib/voices-source.js` | Voice preset file reader/writer |
| `tools/lib/render-bank-browser.js` | Offline audio rendering |
| `tools/lib/wav.js` | WAV file encoding |
| `tools/lib/loudness.js` | LUFS measurement |
| `tools/lib/midi-import.js` | MIDI file → bank conversion |
| `tools/lib/render-midi-bank.js` | Bank → MIDI file conversion |
| `tools/lib/tracks.js` | Track registry (for imported songs) |
| `src/engine/mixer.js` | Audio graph: channel strips, sends, master, EQ, width, chain slots |
| `src/engine/effects.js` | Effect catalogue: definitions, parameter ranges, creation, measurements |
| `src/engine/audio.js` | Game audio system (uses mixer.js) |
| `src/engine/lanes.js` | Lane definitions, desk lane layout, voice routing |
| `src/engine/voices.js` | Voice/synth construction for the engine |
| `src/data/voices.js` | Voice preset library data (65+ presets) |
| `src/data/mix.js` | Central mix data (imports all songs) |
| `src/data/arrangements.js` | Central arrangement data |
| `src/data/songs/*.js` | Built-in song files |
| `src/data/imported/*.js` | Scratch/imported song files |
| `tests/mixer-layout.js` | Desk layout tests |
