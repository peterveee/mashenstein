# POTENTIAL VST AU — Layer Synth as a Standalone Plugin

> **Status: parked.** Not on the cards near-term. Written down so the shape of the job
> and its gotchas are on record rather than re-derived from scratch later.

Scope: turn `MRDR-3` (`_playLayer` in `src/engine/voices.js`) into a standalone
instrument plus AU/VST3 plugin, playable from a MIDI keyboard in any DAW.

---

## The one thing to understand first

**There is no DSP in this repo to port.** `_playLayer` is ~320 lines and its helpers
another ~150, but not one of those lines computes a sample. It is all node wiring:

| Node | Uses across the audio engine |
|---|---|
| `createGain` | 215 |
| `createBiquadFilter` | 58 |
| `createOscillator` | 41 |
| `createBufferSource` | 25 |
| `createWaveShaper` | 12 |

No `AudioWorklet` anywhere. The synthesis lives in Chrome. So the job is not "move our
C++ into a plugin" — it is "write the synth that Chrome is currently writing for us."

The architecture, however, is genuinely good and transfers completely: three complete
voices per layer, each with its own ratio, level, gate, envelope, filter, filter
envelope, pitch envelope, FM operator and unison, all summed into one shared output
chain so a stack reads as one instrument. Structurally a Roland partial. That design —
and the ~120-parameter naming/grouping scheme already argued out on the desk — is the
expensive part of designing a synth, and it is already done.

---

## Broadly, what's involved

1. **Oscillators.** Chrome's is a fixed wavetable. Write PolyBLEP or a proper wavetable.
2. **Filter.** `_filterChain` gets -24/-48 dB/oct by cascading RBJ biquads with `Q` only
   on the first stage. Correct given the available nodes, and not what a synth filter
   should be — no self-oscillation, no drive into resonance. Want a ZDF state-variable
   or ladder model.
3. **Envelopes, voice allocation, polyphony.** Ordinary work. The ADSR contract is
   already correct: note-on starts it, note-off releases it.
4. **MIDI layer** — velocity, pitch bend, mod wheel, sustain pedal. See gotchas.
5. **Plugin shell** — JUCE or equivalent, ~120 automatable params, preset I/O,
   `auval` + `pluginval`, notarization.
6. **UI.** The desk is web tech and does not come along. For a standalone people design
   sounds on, this is the product, not a finishing touch.

---

## Gotchas

**Velocity does not exist.** Nowhere in the engine. `gain` arrives from the lane's mix
level, and the only per-note variation is `humanize`. For a played instrument you need
velocity → level *and* velocity → filter envelope amount, or hard playing won't open up.
This is a design task, not a port.

**Everything is computed once at note-on.** `shift`, the vibrato depth, the LFO depth,
the filter cutoff — all `setValueAtTime(…, t)`. Live control means these become
continuously updated values that affect notes *already ringing*: bend a held chord and
every layer of every note must move together. One architectural change, but it covers
bend, mod wheel, aftertouch and expression in a single stroke.

**Pitch bend and mod have their sinks already.** Every oscillator and every biquad takes
cents on `.detune`, and vibrato already fans into all of them. Bend lands on noise layers
for free — their pitch is a bandpass centre, and a biquad's `.detune` is cents like an
oscillator's.

**The LFO has no pitch target, deliberately.** Pitch wobble is `$vibrato`, one key with
one meaning. Sensible in the game, but a mod wheel conventionally does vibrato — so
either hardwire wheel → `$vibrato.depth` or add a small mod matrix. Hardwire first.

**`humanize` is seeded off absolute time.** Under fingers that drift is wrong. Reseed per
note-on, or expose an off switch.

**The strip is not included.** `src/engine/effects.js` is 2138 lines of reverb, delay,
parametric EQ, exciter, limiter and doubler — that's the mixer channel, not the synth.
Several presets assume it (the finale and walking basses had their written-in slapback
removed because the strip's delay says it now). A bare MRDR-3 plugin leans on the
host's effects unless the strip is ported too.

**Sample rate.** Written against `ctx.sampleRate` with nyquist guards; hosts run 44.1k
through 192k. The seeded noise buffer in particular needs a decision.

**Presets are not a constraint.** The 24 `layer*` presets exist to get the game's songs
done and would be redesigned from scratch for a standalone. This is *good news*: it
removes any need to match Chrome sample-for-sample, which was otherwise the single
biggest technical risk. It also means the game and the plugin will diverge — see below.

---

## The fork worth deciding before any code

Two engines that drift apart forever, or one shared source:

1. **JUCE + C++** — boring, correct, shippable. Maintain two synths.
2. **Faust or Cmajor** — both export VST3/AU *and* WASM. The game loads it as an
   AudioWorklet, the plugin loads it natively, one source of truth. Faust is the mature
   option (GRAME; its standard library already has ladder filters and PolyBLEP
   oscillators). Cmajor is Julian Storer's — nicer language, smaller ecosystem.

Option 2 suits this project unusually well, since we already have a browser host that
would benefit, and it would retire the "no AudioWorklet anywhere" limitation at the same
time. Worth prototyping one layer in Faust for a weekend before committing to either.

---

## Rough sizing

| | |
|---|---|
| DSP core (oscillators, ZDF filter, envelopes, voice management) | 3–4 weeks |
| Plugin shell, params, presets, AU/VST3 validation | 1–1.5 weeks |
| MIDI + expression layer | ~1 week |
| UI worth designing sounds on | 4–8 weeks |

**~6 weeks** for something good with a plain UI that we'd use ourselves.
**2–3 months part-time** for something releasable.

The synth design is done. The DSP and the UI are the work.
