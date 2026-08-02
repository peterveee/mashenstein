# Game Engine and Song Mixer: Music Lifecycle, Mix Variants, and Transitions

**Status:** architecture document and future-design map. This document does not implement the transition mechanism.

**Scope:** current MASHENSTEIN source and Song Mixer in this checkout.

## Executive answer

The Song Mixer is the right place to author alternate presentations of the same composition. The current engine already separates a song's composition from much of its mix, but it does not yet have a first-class concept of a mix variant or a musical transition request.

Today, game states select a bank with `Audio.setBank(...)`. That is deliberately a hard operation: it cuts lingering notes, creates a half-second audio gap, and resets the incoming song to step 0. It is appropriate for replacing one song with another, but it is the wrong primitive for a seamless `MAIN THEME / SELECT` to `MAIN THEME / GAMEPLAY` handoff.

The best first target is:

- **Main Theme / Select:** the same composition, with drums and bass exposed and a restrained or heavily reverberated/echoed treatment;
- **Main Theme / Gameplay:** the same composition and musical clock, with the full mix brought in on a bar boundary.

That case can preserve musical phase and needs only one sequencer. Different compositions joining together are a later feature: they require compatible timing rules and usually two temporary song runtimes during the handoff.

---

## 1. The key distinction: composition, mix, and trigger

These are separate questions:

| Question | Current owner | Meaning |
| --- | --- | --- |
| What notes and drum hits exist? | The song `bank` | Patterns, voices, tempo, sections, form, note lengths, and engine-specific musical behavior. |
| How are those lanes presented? | The Song Mixer `mix` | Faders, pans, EQ, sends, inserts, return effects, master processing, voice overrides, duplicate lanes, and deleted lanes. |
| When should a song begin? | Game state code calling `Audio.setBank(...)` | A screen or gameplay state chooses a bank. There is no separate musical transition director yet. |
| How should current music move to another presentation? | Future transition controller | Target variant, quantization point, crossfade, transport policy, effect-tail policy, and fallback. |

Recommended vocabulary:

- A **composition** is the musical material.
- A **song family** is one composition plus its intended presentations.
- A **mix variant** is a presentation such as `select`, `gameplay`, `alert`, or `credits`.
- A **bank transition** changes the composition being scheduled.
- A **variant transition** keeps the composition and transport but changes lanes, levels, routing, or effects.
- A **trigger** is a game event such as `stage.launch` or `selection.confirmed`.

Under this model, “Main Theme B” and “Main Theme C” should usually be variants of `main-theme`, not three unrelated songs. If the notes, tempo, or form are genuinely different, they can be different compositions in the same family, with explicit compatibility metadata explaining how they join.

---

## 2. Current source model

The current files under [`src/data/songs/`](../src/data/songs/) already separate the important roles:

```js
export const bank = {
  bpm: 112,
  bass: /* sequence */,
  lead: /* sequence */,
  sections: [/* optional form sections */],
  order: [/* section order */],
};

export const mix = {
  master: 0,
  lanes: {
    bass: { gain: -2, send: { delay: 0.6 } },
  },
  fx: {
    delay: { division: 0.75, feedback: 0.35 },
  },
};

export const arrangement = null;
```

The exact fields vary, but the roles are stable.

### 2.1 The bank: what can play

The `bank` is the engine's composition input. It can contain:

- `bpm`, the written tempo;
- melodic lanes such as `bass`, `lead`, `leadHarm`, and `chords`;
- percussion lanes such as `kick`, `snare`, `hats`, `clap`, `rim`, and `crash`;
- lane-specific gain, duration, attack, filter, and synthesis keys;
- optional Tone-style voice assignments after mixer overrides are applied;
- `sections`, holding alternate two-bar or partial-bank material;
- `order`, determining the form played by the scheduler;
- `musicTrim`, the bank's authored output trim;
- bank-level behavior such as `echoEverything`.

The bank is not a rendered audio file. Notes are scheduled as Web Audio sources while the engine advances through the pattern. This is why the Song Mixer can edit source-level material and why the offline renderer can use the same engine to write a WAV.

Some banks contain historical or engine-specific values that should not be confused with visible mixer controls. For example, `echoLevel` remains in older banks as inert compatibility data. New variant work should use explicit variant mix data rather than reviving hidden bank multipliers.

### 2.2 The mix: how the bank is presented

The Song Mixer writes the mix associated with a track. The compatibility export [`src/data/mix.js`](../src/data/mix.js) is assembled from the per-song files through [`src/data/songs/index.js`](../src/data/songs/index.js).

A mix may contain:

- master trim and master pan;
- limiter state and master effect chains;
- per-lane gain, pan, width, mute, and three-band EQ;
- per-lane sends to shared delay and reverb returns;
- per-lane insert chains;
- effects on an auxiliary return;
- voice overrides for library voices;
- duplicated lanes carrying the same source notes;
- deleted lanes, whose authored notes remain in the bank but are excluded from that mix.

The mixer is therefore a source-backed presentation definition. It is not yet a transition definition: the current file describes one settled mix, not a set of named alternate presentations or a timeline of mix states.

### 2.3 The arrangement: what plays when inside one bank

The current arrangement system is the closest existing feature to musical interactivity. Its per-bar plan can express:

- which section or half-section a bar uses;
- which lanes are off for that bar;
- which lanes are deleted from the mix;
- per-bar melodic transpose;
- per-bar timing offsets;
- per-bar gain changes.

The compact form is stored as `order` and section deltas. Timeline selection answers **when**; lane-row editing answers **which lane**.

The live hook [`Audio.setArrangement(...)`](../src/engine/audio.js) already changes the arrangement of a playing bank without resetting `step` or `nextTime`. The next scheduled sixteenth is read from a new resolved bank copy. This is useful for future work, but it is not by itself a mix-variant system:

- arrangement changes alter the musical plan;
- mix changes alter the presentation of that plan;
- effect transitions need audio-node automation and tail handling as well.

For “drums and bass in the selection screen,” arrangement data could omit other lanes, but a named presentation variant is clearer because it can also carry fader, EQ, send, and effect choices.

### 2.4 Track IDs and bank identity

The game normally calls:

```js
Audio.setBank(cabinet.music);
```

It does not pass a string such as `"plumber"` to the audio engine. [`src/data/tracks.js`](../src/data/tracks.js) maps known bank object identities back to track IDs so the engine can find the saved mix.

This matters for variants. Two named variants sharing one bank object cannot currently be distinguished by bank identity alone. The existing `setBank(bank, mixOverride, arrangementOverride)` arguments are a low-level escape hatch for supplying a mix explicitly, but the game has no first-class `{ familyId, variantId }` request. A robust variant system should make variant identity explicit.

---

## 3. Current audio graph

Conceptually, the graph is:

```text
song voices -> lane strips -> musicBus -> songTrim -> analyser -> musicGain --┐
                    |           |                                               |
                    |           +-- shared delay/reverb returns -> songTrim ----|
                    +-- lane inserts / EQ / pan / width                        |
                                                                                v
SFX voices ---------------------------------------------------------------> global master
                                                                                |
                                             master trim / effects / pan / limiter
                                                                                |
                                                                            speakers
```

The main implementation seams are [`src/engine/audio.js`](../src/engine/audio.js), [`src/engine/mixer.js`](../src/engine/mixer.js), [`src/engine/effects.js`](../src/engine/effects.js), and the bank data.

### 3.1 Lane strips

Every scheduled lane is pointed at its own strip:

1. lane source nodes enter the strip;
2. fader, pan, EQ, and width shape the dry signal;
3. a lane insert chain can add or reshape effects;
4. the dry signal reaches `musicBus`;
5. saved sends feed auxiliary effects.

The lane gate is an engine-level routing pair. It exists because an oscillator or buffer source is fire-and-forget after it starts. Disconnecting the gate can silence a note that is still ringing when a new bank is selected.

### 3.2 Shared delay and reverb returns

Delay and reverb sends are explicit per-lane controls. The current shared delay is tempo-synced, with the written dotted-eighth division as the default. Reverb is a deterministic convolution reverb, which keeps offline renders reproducible and lets stems sum to the mix.

This is useful for the proposed selection treatment: a select variant could raise sends or return levels while retaining exactly the same notes. However, the current engine has one live delay and one live reverb return for the current graph. It does not have isolated `select` and `gameplay` effect racks that can both ring during a crossfade.

### 3.3 Master effects and the SFX boundary

There is an important caveat. The global `master` carries both `musicGain` and `sfxGain`. The mixer's master trim, master effects, master pan, and optional limiter are downstream of that shared node. Therefore a mix entry's `masterEffects` can affect gameplay SFX as well as music.

That is acceptable for existing authored mixes where it is known. It is not ideal for a future “heavily reverberated selection screen” variant. Before introducing variant-level master effects, the graph should be split conceptually into:

```text
song presentation bus -> music master effects -> musicGain --┐
                                                             +--> global master -> destination
SFX bus ---------------------------> sfxGain ---------------┘
```

This is a prerequisite for trustworthy full-song presentation variants. Lane inserts and music-only aux returns are already closer to that boundary.

### 3.4 Relevant existing live layer

Invincibility already ducks `musicBus` and brings up a separate `starBus` arpeggio while the underlying song continues. It is not a complete variant system, but it demonstrates the useful principle: a presentation layer can change while the composition clock continues.

---

## 4. How a song is currently set off

“Set off” currently means “a state enters and calls `Audio.setBank(...)`.” There is no central `MusicDirector.play(...)` call and no event queue that the engine interprets as a transition plan.

### 4.1 Boot and audio unlock

At boot, [`src/main.js`](../src/main.js) configures volumes, lifecycle behavior, and audio capture policy, then calls `Audio.ensure()`. `ensure()` creates the Web Audio graph and realtime scheduler machinery, but a bank still has to be selected before there is a song to schedule.

Browsers may leave the context suspended until a real gesture. `Input.onAnyGesture` calls `Audio.ensure()` again and resumes the same configured context. A future trigger must therefore be safe before audio is unlocked: retain the request or apply it when the context becomes usable rather than assuming autoplay.

### 4.2 State transition and music selection are separate

The state machine in [`src/engine/states.js`](../src/engine/states.js) handles the visual shutter or fade:

```text
game action
  -> setState(target)
  -> visual shutter covers outgoing state
  -> outgoing state.exit()
  -> target state.enter()
  -> target state calls Audio.setBank(...)
  -> audio engine silences old bank and schedules new bank
  -> visual reveal continues independently
```

The audio operation is a side effect of the destination state's `enter()`. The visual transition is not itself the audio trigger. `setBank()` opens its own half-second audio gap after the target state enters, so the new downbeat is not defined as “the exact frame the shutter opens.” That loose coupling is fine for deliberate hard handoffs, but a musical transition feature should make the relationship explicit.

### 4.3 What `Audio.setBank()` does today

The current behavior in [`src/engine/audio.js`](../src/engine/audio.js) is:

1. Compare the incoming bank with `sourceBank`. Re-selecting the same source bank with no overrides is a no-op, so returning from a title-side settings screen does not restart the title theme.
2. Record the new source bank and explicit arrangement override.
3. Dispose the current Tone voice rack, if one exists.
4. Cut current per-lane gates so long notes, crashes, sweeps, and piano-roll notes cannot ring through the new song.
5. Apply the bank's saved mix and arrangement, producing the resolved bank the scheduler reads.
6. Assign the bank's `musicTrim`.
7. Pull `songTrim` down to near-silence.
8. Move `nextTime` to current audio time plus a deliberate 0.5-second gap.
9. Reset `step` to zero, so the incoming song begins at its first step.
10. Reset music-analysis and percussion-tracking state.
11. Adopt the incoming bank's BPM and retune tempo-synced delay behavior.

So the current operation is closer to **stop current song, cleanly load next song, start next song from its top** than to **transition the current musical performance into a related presentation**.

The stop operation, `Audio.setBank(null)`, closes the song path and leaves no continuing bank for the scheduler to advance.

### 4.4 Realtime scheduling after selection

Once a bank is active:

- the realtime interval runs approximately every 25 ms;
- the scheduler fills roughly 120 ms of future audio;
- each `scheduleStep()` schedules one sixteenth at `nextTime`;
- `step` advances and wraps at the active loop range, or at the song form when no loop is armed;
- the current bank's `order` and `sections` resolve bar and lane content;
- `nextTime` advances by the current seconds-per-sixteenth value.

This lookahead is why a future transition cannot rely on changing a JavaScript variable on the next rendered frame. Some notes are already scheduled. A transition must schedule audio-node automation ahead of time, maintain separate runtimes, or deliberately invalidate/cut future material.

### 4.5 The musical clock

`Audio.songBeat()` reports the fractional beat position being heard, not merely the future `step`. It backs out scheduler lookahead and accounts for output latency where available. It also normalizes against `loopStart..loopEnd`, so a one-bar loop cannot report a position from a later bar in the surrounding song.

That makes `songBeat()` appropriate for visual synchronization and diagnostics. Exact audio scheduling should use audio-context time and the scheduler's step/next-time relationship. A visual frame clock is not exact enough for a downbeat crossfade.

---

## 5. Current game call sites

These are the places a future music director would eventually replace or wrap:

| Surface | Current selection | Current behavior |
| --- | --- | --- |
| Title | `TitleState.enter()` selects `TITLE_THEME` if it is not already the source bank | Same title bank continues from title-side screens; a different bank uses the hard gap and reset. |
| Food Court hub | `HubState.enter()` selects `HUB_THEME` | Hub music begins or resumes as a bank selection. |
| Stage run | `RunState.enter()` selects `this.cabinet.music` | The level composition starts from step 0 after the hard handoff. |
| Stage select / briefing | No level-bank selection in the screen itself | Previous appropriate music can remain until the run enters; the run is where the cabinet bank is selected. |
| Bench / Shop | Enter `COUNTER_DANCE_MIX_THEME`; exit to `HUB_THEME` | Separate banks, so current behavior is a hard song change. |
| Sound Test / Jukebox | `Audio.setBank(null)` and then the chosen track | A different track stops the old one and starts the new one from the top. |
| Credits | Select `MEGAMIX_THEME`; exit with `Audio.setBank(null)` | Credits have their own bank lifecycle. |
| Minigames | Enter with `Audio.setBank(null)` | Music is stopped rather than transitioned. |

The exact locations are searchable with `rg "Audio\\.setBank" src`. The key point is that game code chooses **banks**, not **song families and variants**.

---

## 6. What the Song Mixer can already author

### 6.1 Selection mix: drums and bass

A selection presentation could be a mix patch that:

- leaves kick, hats, and bass at their chosen levels;
- mutes or attenuates lead, harmony, chords, and decorative FX;
- narrows the stereo image if desired;
- raises delay/reverb sends on surviving lanes;
- adds a filter, doubler, chorus, or reverb insert;
- lowers music relative to UI SFX.

The underlying notes do not need to change. The same bank can keep scheduling its full form while only the selected presentation is audible.

If the selection state must not schedule certain expensive voices, use an arrangement variant. The trade-off is that arrangement changes are musical-plan changes, while mix variants are presentation changes.

### 6.2 Gameplay mix: full track

The gameplay presentation can use the same composition with:

- all intended lanes restored;
- normal per-lane balance;
- shorter or drier reverb;
- less delay feedback;
- normal stereo width and inserts;
- the same BPM and phrase position.

The convincing handoff is usually not “stop select and start gameplay.” It is “the same song reaches a bar line and the rest of the band arrives.” That requires an API that automates lane levels and effect returns without resetting transport.

### 6.3 Reverberated selection treatment

A select variant could use:

- greater lane sends into reverb and delay;
- a higher reverb return level;
- longer decay and pre-delay;
- a low-pass or high-cut treatment on dry music;
- a quiet dry bass/drum foundation beneath the wet presentation.

The mixer can author these values as a settled mix. It cannot yet guarantee a clean musical crossfade when they are changed during playback. The shared returns are stateful, and changing one live reverb changes the one live room rather than fading one room out while another fades in.

For a seamless result, the future engine should either:

1. keep separate old and new return racks and crossfade their outputs;
2. retain one rack but schedule safe parameter ramps and define tail behavior; or
3. use a dry/wet transition bus with old effect state allowed to decay while the new state enters.

Separate old/new racks are the easiest to reason about and test, at the cost of temporary CPU.

---

## 7. Recommended future data model

The cleanest model is a song family containing one immutable composition and named presentation variants. The exact JavaScript shape can evolve; the ownership boundaries are the important part.

~~~js
export const song = {
  id: 'main-theme',
  title: 'MAIN THEME',
  bank,
  variants: {
    select: {
      id: 'select',
      mix: selectMix,
      arrangement: selectArrangement,
      policy: { transport: 'preserve', quantize: 'bar', crossfadeBars: 1 },
    },
    gameplay: {
      id: 'gameplay',
      mix: gameplayMix,
      arrangement: gameplayArrangement,
      policy: { transport: 'preserve', quantize: 'bar', crossfadeBars: 1 },
    },
  },
};
~~~

Variants should probably be mix patches over a shared base mix rather than fully duplicated giant objects:

~~~js
variants: {
  select: {
    patch: {
      lanes: { lead: { mute: true }, chords: { mute: true } },
      fx: { reverb: { level: 1.35, decay: 6.5 } },
    },
  },
  gameplay: {
    patch: {
      lanes: { lead: { mute: false }, chords: { mute: false } },
      fx: { reverb: { level: 0.7, decay: 2.2 } },
    },
  },
},
~~~

The mixer would eventually need a variant selector, but should continue to write source-backed files. A sensible authoring experience would have:

- one composition/timeline shared by every variant;
- a tab or dropdown for SELECT, GAMEPLAY, ALERT, and so on;
- a clear indicator for shared versus variant-specific controls;
- audition of a variant in isolation;
- audition of a transition from one variant to another;
- one source file or clearly grouped source blocks per family, rather than silently duplicating note arrays.

The mixer should not make a variant by mutating the shared bank. Shared lane and section arrays must remain immutable or be copied before edits, as the current arrangement implementation already requires.

### 7.1 Variant identity should be explicit

The runtime request should carry more than a bank object:

~~~js
{
  familyId: 'main-theme',
  variantId: 'select',
  bank,
  mix,
  arrangement,
}
~~~

This avoids ambiguity when two presentations share one composition. It also gives diagnostics and tests a meaningful label such as main-theme/select -> main-theme/gameplay.

### 7.2 Keep hard bank changes and soft variant changes separate

Retain a clear low-level operation for screens that genuinely want a new song:

~~~js
Audio.setBank(nextBank);
~~~

A separate higher-level operation should express a same-composition change:

~~~js
MusicDirector.transitionVariant('gameplay', {
  quantize: 'bar',
  preserveTransport: true,
  crossfadeBars: 1,
});
~~~

The names are illustrative, not a request to implement them now. The important property is that code asking for a seamless transition cannot accidentally call the existing reset-and-gap behavior.

---

## 8. Recommended transition model

Every transition request should answer five questions.

### 8.1 What is changing?

- same bank, different mix variant;
- same bank, different arrangement variant;
- different bank in the same family;
- entirely different song.

The engine can choose a simpler implementation for the first case and a more involved one for the last.

### 8.2 When should it happen?

Useful quantization choices are:

- immediately;
- next sixteenth;
- next beat;
- next bar;
- next phrase or explicitly named boundary;
- a scheduled absolute audio time.

For selection-to-gameplay, nextBar is the sensible default. The game can request the change when the player confirms, but the audio controller decides the exact audio time. The visual transition can proceed independently while the controller waits for the musical boundary.

### 8.3 What happens to transport?

There are three distinct policies:

- **Preserve:** keep the current composition phase. Best for select to gameplay when the player should hear the same track continue.
- **Restart:** begin the target at bar 1. Appropriate when entering a new stage should introduce a fresh full mix.
- **Align:** start a different composition at a compatible bar/beat so its downbeat matches the current song. This requires metadata.

The current setBank policy is effectively restart, with a half-second gap.

### 8.4 How should level and effects move?

A transition should define separate curves for:

- lane dry level;
- lane send level;
- aux return level;
- insert wetness or bypass state;
- music-only master effects;
- the outgoing tail.

A one-bar crossfade is not necessarily the right curve for every element. For example:

- bring bass and kick in quickly at the downbeat;
- bring lead and chords over one bar;
- let select reverb decay over two bars;
- reduce delay feedback gradually so the old echo does not become a repeated downbeat;
- keep SFX on a separate bus and exclude them from the song crossfade.

### 8.5 What is the fallback?

The browser may not have unlocked audio, a device may be under load, or a future variant may not have compatible timing metadata. The fallback should be explicit:

- use the current presentation until audio is available;
- apply the variant at the next safe boundary;
- use existing hard setBank behavior for an incompatible bank transition;
- never leave the scheduler with two partially applied variants and no authoritative state.

---

## 9. Same-song variant transition: preferred first implementation

The selection-to-gameplay case can be solved without running two musical schedulers.

### 9.1 Conceptual sequence

~~~text
MAIN THEME / SELECT is playing
  - bank and transport remain active
  - drums and bass are audible
  - select effect rack is audible

player confirms selection
  -> game requests MAIN THEME / GAMEPLAY
  -> controller computes next bar's audio time
  -> controller schedules lane and effect ramps
  -> gameplay state enters
  -> same bank keeps advancing; no step reset and no 0.5s gap
  -> full mix arrives on the selected bar boundary
~~~

### 9.2 What the engine would need

At minimum:

1. stable currentFamilyId and currentVariantId;
2. a resolved base mix plus a resolved variant patch;
3. a way to schedule lane gain/send changes at an audio time;
4. a way to schedule or crossfade effect returns;
5. an authoritative transition queue so later requests replace or chain intentionally;
6. a way to keep step, nextTime, and bpm untouched for preserve-transport transitions;
7. tests proving outgoing and incoming lanes remain phase-aligned.

The current reapplyBank operation is not the finished solution. It intentionally re-merges bank and voice data without rebuilding the whole mixer, which is useful for a desk edit, but it is not a time-quantized variant application and does not provide old/new effect racks or scheduled ramps.

### 9.3 Arrangement variant versus lane automation

There are two ways to make the selection state expose only drums and bass:

| Method | Strength | Limitation |
| --- | --- | --- |
| Arrangement off data | Structural and exact; the scheduler knows those lanes are absent in selected bars | It changes the musical plan and currently applies on scheduled steps rather than providing a crossfade curve. |
| Variant lane mix | Can fade lanes in and out and carry effects, EQ, and sends | Muted lanes may still be scheduled internally; the engine must decide whether that cost matters. |

The recommended first pass is variant lane automation, with arrangement variants reserved for genuinely different forms. That keeps “same notes, different presentation” in the mix domain where the Song Mixer already works.

---

## 10. Different compositions joining together

Main Theme B could eventually mean a different composition that shares a motif, but this is a separate difficulty level.

### 10.1 What makes two songs joinable?

Family metadata should declare:

- BPM and whether it matches exactly;
- time signature and sixteenth-note grid;
- key or a permitted transposition range;
- phrase length in bars;
- compatible entry bars;
- compatible exit bars;
- whether the target begins with a pickup or a downbeat;
- whether the outgoing song has a safe tail or needs a transition stem;
- whether the target can be phase-aligned or must restart.

Without that metadata, a crossfade can be technically smooth but musically wrong: two unrelated downbeats, incompatible bass notes, or delay repeats landing against the new groove.

### 10.2 Why the current single-bank scheduler is insufficient

The current AudioSys has one active bank, one step, one nextTime, one bpm, one lane-gate map, one voice rack, and one set of mixer strips. Calling setBank replaces that state and resets transport.

A true overlapping crossfade needs either:

- two song runtimes, each with its own bank, phase, voices, lane graph, and effect state; or
- a pre-rendered transition asset, which sacrifices current procedural flexibility and does not match the real-engine mixer workflow.

The recommended direction is two temporary runtimes during a transition. The outgoing runtime fades and drains; the incoming runtime is scheduled at the compatible boundary; then the controller promotes the incoming runtime to current and disposes the old one.

### 10.3 Possible different-song policies

| Policy | Use case | Audio behavior |
| --- | --- | --- |
| Hard restart | Unrelated screens or intentionally dramatic cut | Keep current setBank semantics: cut old lanes, 0.5s gap, target starts at step 0. |
| Quantized restart | New song should start on a bar boundary but need not overlap | Wait for a bar boundary, then perform a controlled bank replacement. |
| Crossfade, same tempo | Songs share a grid and can overlap | Run both runtimes briefly and fade outgoing/incoming buses. |
| Stem handoff | A and B share a rhythm bed or transition stem | Keep a common bed running and replace only changing lanes. |
| Transition cue | Songs are too different for a direct blend | Play a short authored or procedural bridge, then start the target. |
| Tempo/key morph | Deliberate musical effect | Use explicit tempo/pitch automation and compatibility metadata; do not infer it from arbitrary bank differences. |

For MASHENSTEIN, stem handoff and same-tempo crossfade are likely more valuable than a general-purpose DJ system. They preserve the procedural song engine and support the same-song mix idea directly.

---

## 11. Effects and transition tails

Effects are where a visually simple variant becomes an audio-engine problem.

### 11.1 Reverb

The current reverb has a deterministic impulse response, which is good for reproducible offline renders. For a transition, it also has state: old selection notes may still be ringing in its tail when gameplay begins.

The transition contract should state whether the old tail:

- continues naturally under the new dry mix;
- is ducked over a specified time;
- is crossfaded through a separate old return;
- is intentionally cut for a dramatic change.

The best default for the proposed selection screen is usually “old wet tail fades for a short musical amount while the new dry/full return rises.”

### 11.2 Delay and echo

The shared delay is tempo-synced. If the same composition and BPM continue, timing remains coherent. If BPM or delay division changes, the transition must decide whether to:

- leave the old line at its old timing until its tail ends;
- ramp feedback down, change timing, and ramp it back up;
- crossfade to a new delay line;
- treat the change as a hard bank/effect reset.

For the first variant implementation, keep BPM and delay division constant within a family. Change send amount and return level first; defer live delay-time morphing until the rack supports it explicitly.

### 11.3 Inserts

Lane inserts such as chorus, doubler, filter, or ping-pong delay may hold their own state. Bypassing or rebuilding a chain exactly on a frame can click or drop a tail. Prefer wetness and bus-level ramps where possible. If an insert cannot be automated safely, run old and new chains in parallel during the transition.

### 11.4 Master processing

Variant-specific master effects should wait until music has its own master-processing boundary. Otherwise “reverb the main theme” can also reverberate UI confirmation or weapon sounds.

---

## 12. Game-engine trigger design

The game should express intent in game terms, while the audio layer resolves exact musical timing.

### 12.1 Proposed trigger vocabulary

Examples:

- title.enter;
- hub.enter;
- selection.open;
- selection.confirmed;
- stage.briefing;
- stage.launch;
- stage.restart;
- pause.open;
- pause.close;
- minigame.enter;
- results.enter;
- credits.enter.

The game event should not need to know whether the response is a hard bank change or a same-song variant change. That belongs in the song-family policy.

### 12.2 Example policy for the requested flow

~~~text
selection.open
  -> main-theme/select
  -> start at bar 1, or preserve an already-running main-theme transport

selection.confirmed / stage.launch
  -> main-theme/gameplay
  -> preserve transport
  -> quantize to next bar
  -> one-bar crossfade
  -> keep SFX on the global SFX bus
~~~

If the desired experience is instead “the level always announces itself from the beginning,” the policy can say restart rather than preserve. That is a design choice, not an implementation accident.

### 12.3 Trigger ownership

The trigger should be issued where the game knows the semantic event has happened. It should not be inferred from a canvas frame or visual shutter progress. For example:

- stage launch is known by Flow.launchStage() / RunState.enter();
- title entry is known by TitleState.enter();
- hub entry is known by HubState.enter();
- selection confirmation is known by the selection state's commit action.

The audio controller translates the event into an audio-time plan. This coordinates visual and music state without making either subsystem own the other.

---

## 13. Recommended implementation order

### Phase 0: preserve the current boundary

- Keep Audio.setBank() as the explicit hard-change API.
- Document every current call site and intended restart/continue behavior.
- Do not overload existing mix data with hidden transition semantics.

### Phase 1: introduce family and variant metadata

- Add a registry-level family/variant description without changing playback.
- Make familyId and variantId available to diagnostics and tests.
- Allow one shared bank to have multiple mix/arrangement profiles.
- Keep variant data immutable at runtime; build resolved copies for the scheduler.

### Phase 2: same-bank, bar-quantized variant changes

- Add a request API preserving step, nextTime, bpm, and the active bank.
- Schedule lane gain/send ramps at the next bar.
- Start with drums/bass versus full-band changes.
- Add one-bar transition audition to the Song Mixer.

### Phase 3: music-only effect racks

- Separate music master processing from the global SFX master boundary.
- Add old/new or wet/dry handling for reverb and delay returns.
- Add effect-tail policy to variant metadata.
- Test that UI and gameplay SFX do not inherit music-only reverb.

### Phase 4: compatible cross-song handoffs

- Add transition compatibility metadata.
- Introduce a temporary second song runtime or equivalent parallel bus.
- Support quantized crossfade for same-tempo, same-grid banks.
- Fall back explicitly to hard restart for incompatible banks.

### Phase 5: richer Song Mixer authoring

- Add variant tabs or a presentation selector.
- Show which fields are shared and which are variant-specific.
- Add “audition current variant” and “audition transition to target.”
- Render and measure every variant through the real offline engine.
- Keep source diffs readable; do not generate independent copies of shared note arrays.

The first visible payoff should arrive in Phase 2. There is no need to solve arbitrary song joining before selection-to-gameplay can be made convincing.

---

## 14. Constraints and pitfalls

### Hard changes are not seamless changes

Calling Audio.setBank() for Main Theme B will currently reset to step 0, cut old notes, and introduce the 0.5-second gap. It is the wrong primitive for an inaudible same-song handoff.

### reapplyBank is not a transition engine

reapplyBank keeps transport and avoids the bank-change gap, which is useful for Song Mixer voice and arrangement edits. It does not provide quantized automation, old/new effect buses, or a complete variant-state swap.

### The lookahead is real

The engine schedules ahead. A transition request must account for notes already in the lookahead and cannot assume that replacing a JavaScript object changes already-created Web Audio nodes.

### Bank identity is not variant identity

Two variants sharing one bank need explicit IDs or explicit mix objects. A registry that only maps bank identity to a track ID will otherwise select whichever saved entry was registered first.

### Do not confuse monitoring and composition state

Solo is monitoring-only. Mute, arrangement deletion, and variant exclusion have different meanings. “Not audible in this presentation,” “not scheduled in this arrangement,” and “temporarily muted by the player” should not be treated as automatically identical.

### Keep timing compatible within a family

Same-song variants should normally share BPM, grid, and phrase length. Different BPM, key, or bar structure should be metadata-driven rather than silently coerced.

### Protect SFX from music variants

Long reverb and echo are presentation choices for music, not necessarily for the whole game. Split the bus before variant-level master effects are expanded.

### Preserve deterministic rendering

Every variant should be renderable through the same browser/OfflineAudioContext engine used by the current tools. Offline renders, stems, null tests, and measurements should exercise the real graph, including deterministic reverb and seeded noise. A browserless test can prove data shape, not that a transition sounds seamless.

### Account for voice lifecycle

Tone voice instances and hand-written sources have different lifetimes. A variant that changes one lane's voice should not dispose every other lane's ringing voice. A true crossfade may need separate voice racks or a lane-level retirement policy.

---

## 15. Proposed acceptance tests

When this is eventually built, test it at four levels.

### Data and registry

- one family exposes multiple variants over one bank;
- each variant resolves its own mix and arrangement without mutating the shared bank;
- variant IDs remain distinct when bank identity is shared;
- invalid BPM/grid/phrase compatibility is rejected or falls back explicitly.

### Engine transport

- a same-bank variant transition does not reset step;
- it does not move nextTime backward;
- it lands at the requested bar boundary;
- a hard bank change still cuts long held notes and retains its current 0.5-second behavior;
- a one-bar loop continues to report the correct songBeat range.

### Audio graph

- drums and bass remain audible in the selection variant;
- full-band lanes enter at the requested crossfade curve;
- the old reverb/delay tail follows its declared policy;
- no music-only effect reaches SFX after the bus split;
- the same transition rendered offline is deterministic;
- stems and variant sums remain explainable.

### Game flow

- entering selection requests the intended family/variant;
- confirming selection requests gameplay at the correct semantic event;
- returning to a screen with the same variant does not restart it accidentally;
- a state transition does not issue duplicate requests during the shutter;
- pause, retry, minigame, credits, and jukebox behavior remain explicit.

The existing [tests/song-switch.js](../tests/song-switch.js) is the right model for the hard-change boundary: it measures rendered samples and proves that an old held note is actually gone after a bank change. The arrangement assertions in [tests/arrangement.js](../tests/arrangement.js) are the right model for proving that a live edit changes what is scheduled without moving transport. Future variant tests should combine those two kinds of evidence.

---

## 16. Source map

These are the current seams to revisit when implementation begins:

- [src/engine/audio.js](../src/engine/audio.js) — Web Audio graph, AudioSys, ensure, setBank, reapplyBank, setArrangement, lookahead, scheduleStep, songBeat, analysis, and lane gates.
- [src/engine/mixer.js](../src/engine/mixer.js) — lane strips, sends, shared aux returns, master chain, monitoring, and mixer runtime controls.
- [src/engine/effects.js](../src/engine/effects.js) — effect catalogue and deterministic reverb.
- [src/data/songs/](../src/data/songs/) — source-backed song files containing composition, saved mix, and arrangement exports.
- [src/data/songs/index.js](../src/data/songs/index.js) — generated song registry and per-song mix/arrangement indexes.
- [src/data/tracks.js](../src/data/tracks.js) — track ID resolution and bank-identity lookup.
- [src/data/arrangements.js](../src/data/arrangements.js) — arrangement validation, bar plans, and compact form representation.
- [src/game/menus.js](../src/game/menus.js) — title, jukebox, credits, and menu-side music selections.
- [src/game/hub/index.js](../src/game/hub/index.js) — hub, bench, shop, and stage-selection music selections.
- [src/game/run.js](../src/game/run.js) — cabinet-level bank selection when a run begins.
- [src/engine/states.js](../src/engine/states.js) — visual state transitions, whose enter calls currently cause most bank changes.
- [tools/lib/render-bank-browser.js](../tools/lib/render-bank-browser.js) — real-engine offline rendering for future variant audition and measurement.
- [tests/song-switch.js](../tests/song-switch.js) — hard bank-switch silence proof.
- [tests/arrangement.js](../tests/arrangement.js) — live arrangement and transport-preservation proof.

## Bottom line

The Song Mixer can become the authoring system for Main Theme / Select, Main Theme / Gameplay, and later Main Theme / Alert or Main Theme / Credits. The composition should stay shared; the mixer should own named variant presentations; and the game should request semantic transitions rather than directly swapping banks for every screen.

The first implementation should preserve one song clock and crossfade lane/effect presentation at a bar boundary. Only after that works should the engine grow parallel runtimes for genuinely different compositions. That ordering uses the architecture already present—banks, arrangements, lane strips, aux returns, and the real offline renderer—while avoiding current setBank reset-and-gap semantics when the desired result is seamless.
