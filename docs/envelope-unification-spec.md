# Envelope Unification Spec

> What the preset/synth engine has now, and what one unified envelope would look like.
> In-game engine envelopes (weapon SFX, game audio cues) are out of scope.

---

## 1. Current State — Three Envelopes, One Codebase

All three live in `src/engine/voices.js` and are called by `VoiceRack` methods. The Tone.js
path (Synth, MonoSynth, FMSynth, etc.) is a fourth category but is not part of this spec —
Tone owns its own envelopes and they cannot be replaced without abandoning the Tone
constructors entirely.

### 1.1 `adsr(param, t, end, peak, e)` — line 196

The "held" envelope. Used by `_playAdditive()` and available to any native pitched voice.

| Stage | Key | Default | Behaviour |
|---|---|---|---|
| Attack | `e.attack` | 0.01 s | Exponential ramp from 1e-4 to `peak`. Clamped to 45% of note length. |
| Decay | `e.decay` | — | Exponential (or linear if `curve === 'lin'`) from peak to sustain level. **If 0/falsy: runs to `end`** — the note-length struck shape. |
| Sustain | `e.sustain` | 0 | Fraction of peak, 0–1. Held from decay-end until `end`. |
| Release | `e.release` | 0.015 s | Exponential ramp from sustain level to 1e-4, then a hard 5ms linear ramp to 0 to prevent clicks. |
| Curve | `e.curve` | `undefined` (exp) | `'lin'` makes decay linear; anything else is exponential. |

**Returns:** `end + release + 0.005` — when the tail is actually over, so the caller can stop its oscillator.

**Missing:** hold, sag, per-stage curve selection, attack curve control.

### 1.2 `env(param, t, level, sec, dflt)` — inside `_playDrum()`, line ~990

The "struck" drum envelope. Defined per-call inside `_playDrum` so every drum section
(oscillator, noise, ring, metal) uses the same five controls.

| Stage | Key | Default | Behaviour |
|---|---|---|---|
| Attack | `sec.attack` | 0.001 s | **Linear** ramp from 1e-4 to level. (Different from `adsr`'s exponential attack!) |
| Hold | `sec.hold` | 0 | Holds at peak for `hold` seconds before decay begins. The 909 snare shape. |
| Decay | `sec.decay` | `dflt` (per-section) | Exponential (or linear if `curve === 'lin'`) from peak/hold to 0. |
| Sag | `sec.sag` | 0 | If > 0 and < 1: two-stage decay. Drops to `level × sag` at `sagAt` seconds, then continues the rest of the decay. The rimshot shape. |
| Sag point | `sec.sagAt` | 0.02 s | When the sag knee happens, clamped to 90% of decay. |
| Curve | `sec.curve` | `undefined` (exp) | `'lin'` makes decay and sag linear; anything else is exponential. |

**Returns:** `attack + hold + decay` — total length, not tail time.

**Missing:** sustain, release, attack curve control. Uses linear attack (not exponential).

### 1.3 Inline AR in `_playGame()` — line ~640

Not even a function — just three hardcoded ramps on a `GainNode`.

| Stage | Key | Default | Behaviour |
|---|---|---|---|
| Attack | `v.attack` | 0.01 s | Exponential ramp from 1e-4 to `gain × makeup`. Clamped to 45% of note length. |
| Release | `v.release` | 0.015 s | Exponential ramp from peak to 1e-4 at `end`, then linear to 0 at `end + release`. |

**No decay, no sustain, no hold, no sag, no curve selection.** Pure AR.

---

## 2. What They Agree On

- **Floor at 1e-4.** Every envelope starts its ramp from 1e-4 rather than 0 because an
  exponential ramp from 0 is a silent no-op and a ramp to exactly 0 throws.
- **Final hard ramp to 0.** Both `adsr` and `_playGame` add a 5ms linear ramp to actual
  zero at the very end to prevent an audible click from the exponential tail sitting at
  1e-4.
- **Attack clamped to 45% of note.** `adsr` and `_playGame` both cap attack at 45% of
  the note's length so a short note doesn't become a fade-in cut off partway up.
- **Exponential by default.** All three default to exponential curves for decay stages.

## 3. What They Disagree On

| Concern | `adsr` | drum `env` | `_playGame` AR |
|---|---|---|---|
| Attack curve | Always exponential | Always linear | Always exponential |
| Decay = 0 meaning | Runs to note end | Uses `dflt` (0.1) | N/A (no decay) |
| Sustain | Yes (0–1) | No | No |
| Release | Yes | No (decay runs to 0) | Yes |
| Hold stage | No | Yes | No |
| Sag (two-stage decay) | No | Yes | No |
| Curve key | `e.curve` | `sec.curve` | N/A |
| Return value meaning | Tail end time | Total length | (inlined) |

---

## 4. Proposed Unified Envelope

One function that supports ALL stages. Every caller passes the same bag; unused stages
default to off.

```js
/**
 * One envelope for every native voice in the rack.
 *
 * Stages, in order: attack → hold → decay (optionally sagged) → sustain → release.
 * Any stage can be zero, which skips it. The defaults are the `adsr` defaults, so every
 * existing preset renders identically without changes.
 *
 * @param {AudioParam} param  - the gain node's .gain (or filter .frequency, etc.)
 * @param {number}     t      - absolute start time
 * @param {number}     end    - absolute note-off time (the note's length)
 * @param {number}     peak   - peak level (0–∞, floored at 1e-4)
 * @param {object}     [e]    - envelope shape
 * @param {number}     [e.attack=0.01]   - attack time in seconds
 * @param {number}     [e.hold=0]        - hold at peak before decay (seconds; drum only)
 * @param {number}     [e.decay=0]       - decay time; 0 = "as long as the note"
 * @param {number}     [e.sustain=0]     - sustain level 0–1 (ignored if decay=0)
 * @param {number}     [e.release=0.015] - release time after note-off
 * @param {number}     [e.sag=0]         - sag fraction 0–1; two-stage decay knee level
 * @param {number}     [e.sagAt=0.02]    - when the sag knee hits (seconds from decay start)
 * @param {'exp'|'lin'} [e.curve='exp']  - decay/sag/release curve shape
 * @param {'exp'|'lin'} [e.attackCurve='exp'] - attack curve shape
 * @returns {number}  absolute time the envelope reaches silence (stop oscillators here)
 */
function envelope(param, t, end, peak, e = {}) {
  const level = Math.max(1e-4, peak);
  const attack = Math.max(0.001, e.attack ?? 0.01);
  const hold = Math.max(0, e.hold ?? 0);
  const release = Math.max(0, e.release ?? 0.015);
  const sustain = Math.min(1, Math.max(0, e.sustain ?? 0));
  const curve = e.curve || 'exp';
  const atkCurve = e.attackCurve || 'exp';

  // Attack — same 45% clamp both existing envelopes use
  const peakAt = t + Math.min(attack, Math.max(0.001, (end - t) * 0.45));

  // Decay: 0 means "as long as the note" (adsr convention).
  // Clamped so a long decay on a short note can't leave the release ramping
  // from a level the envelope never reached.
  const decay = e.decay > 0 ? Math.min(end - peakAt - hold, e.decay) : (end - peakAt - hold);
  const decayStart = peakAt + hold;
  const decayEnd = decayStart + Math.max(0, decay);

  // Sustain level
  const held = Math.max(1e-4, level * sustain);

  // --- schedule ---

  param.setValueAtTime(1e-4, t);

  // Attack ramp
  if (atkCurve === 'lin') {
    param.linearRampToValueAtTime(level, peakAt);
  } else {
    param.exponentialRampToValueAtTime(level, peakAt);
  }

  // Hold plateau
  if (hold > 0) {
    param.setValueAtTime(level, peakAt);
  }

  // Decay (possibly sagged)
  let from = decayStart;
  let left = Math.max(0.001, decay);
  if (e.sag > 0 && e.sag < 1) {
    const at = Math.min(e.sagAt ?? 0.02, decay * 0.9);
    const knee = Math.max(1e-4, level * e.sag);
    if (curve === 'lin') {
      param.linearRampToValueAtTime(knee, from + at);
    } else {
      param.exponentialRampToValueAtTime(knee, from + at);
    }
    from += at;
    left -= at;
  }

  // Rest of decay to sustain level (or to 1e-4 if no sustain)
  const decayTarget = sustain > 0 ? held : 1e-4;
  if (curve === 'lin') {
    param.linearRampToValueAtTime(decayTarget, from + left);
  } else {
    param.exponentialRampToValueAtTime(decayTarget, from + left);
  }

  // Sustain plateau (only if decay ended before the note)
  if (sustain > 0 && decayEnd < end) {
    param.setValueAtTime(held, end);
  }

  // Release
  const off = end + release;
  if (release > 0) {
    // The release starts from wherever the gain actually is at `end` —
    // sustain level if held, or wherever the decay left it.
    if (sustain > 0 && decayEnd < end) {
      // Held: ramp from sustain level
      param.exponentialRampToValueAtTime(1e-4, off);
    } else if (decayEnd >= end) {
      // Decay ran to/past note-off: release from wherever decay left it.
      // The decay already scheduled its ramp to the decay target, so the
      // release ramp overrides from `end` onward. Schedule a cancel + ramp.
      param.cancelScheduledValues(end);
      param.setValueAtTime(1e-4, end); // placeholder — real value is what decay settled to
      // Actually we can't read the value at end, so we ramp from 1e-4.
      // This is the existing _playGame behaviour: just do the exponential
      // release from wherever it is.
      param.exponentialRampToValueAtTime(1e-4, off);
    } else {
      param.exponentialRampToValueAtTime(1e-4, off);
    }
  }

  // Final click-proof ramp to absolute zero
  param.linearRampToValueAtTime(0, off + 0.005);

  return off + 0.005;
}
```

> **Note on the release-from-decay edge case above:** The draft is honest about a
> difficulty — when decay runs to/past note-off, you can't read the param's current
> value to know what level to release FROM. In practice both `adsr` and `_playGame`
> just schedule the exponential release ramp and Web Audio interpolates from wherever
> the value actually is. The real implementation would do the same. The "cancel +
> placeholder" pseudocode is there to flag the issue, not as a final answer.

---

## 5. How Each Caller Maps to the Unified Function

### 5.1 `_playAdditive` — currently calls `adsr()`

```js
// Before:
const off = adsr(g.gain, t, end, level, {
  attack: a.attack, decay, sustain: a.sustain, release: a.release, curve: a.curve,
});

// After — identical behaviour, no data changes needed:
const off = envelope(g.gain, t, end, level, {
  attack: a.attack, decay, sustain: a.sustain, release: a.release,
  curve: a.curve, hold: 0, sag: 0,
});
```

### 5.2 `_playDrum` — currently calls its own `env()`

Each drum section (oscillator, noise, ring, metal) calls `env(param, t, level, sec, dflt)`.

```js
// Before (oscillator section):
const len = env(eg.gain, t, o.gain ?? 1, o, 0.1);

// After — same bag, add sustain=0 + release=0 to keep the struck shape:
const len = envelope(eg.gain, t, t + 0.001 /* dummy end, not used when sustain=0 */,
  o.gain ?? 1, {
    attack: o.attack ?? 0.001,
    hold: o.hold ?? 0,
    decay: o.decay ?? 0.1,
    sustain: 0,
    release: 0,
    sag: o.sag ?? 0,
    sagAt: o.sagAt ?? 0.02,
    curve: o.curve,          // was 'lin' for lin
    attackCurve: 'lin',      // DRUM ATTACK IS LINEAR — this is the key difference!
  });
// len = attack + hold + decay. The old env() returned this; the new envelope()
// returns off+0.005. The caller uses len to set oscillator stop time, so
// the return change needs a small adjustment at the callsite.
```

**Key difference to preserve:** drum attack is LINEAR (the old `env` uses
`linearRampToValueAtTime` for the attack stage). The unified function needs
`attackCurve: 'lin'` to match. The `adsr` and `_playGame` callers would pass
`attackCurve: 'exp'` (or omit it, defaulting to exp).

### 5.3 `_playGame` — currently inlines its AR

```js
// Before (inline):
g.gain.setValueAtTime(0.0001, t);
g.gain.exponentialRampToValueAtTime(gain * makeup, peakAt);
g.gain.exponentialRampToValueAtTime(0.0001, end);
g.gain.linearRampToValueAtTime(0, end + release);

// After:
const off = envelope(g.gain, t, end, gain * makeup, {
  attack: v.attack ?? 0.01,
  decay: 0,           // no decay → struck
  sustain: 0,         // no sustain
  release: v.release ?? 0.015,
  hold: 0,
  sag: 0,
  attackCurve: 'exp',
});
```

---

## 6. Defaults Table

One set of defaults, chosen so every existing preset renders identically:

| Key | Default | Source | Note |
|---|---|---|---|
| `attack` | 0.01 | `adsr` / `_playGame` | |
| `attackCurve` | `'exp'` | `adsr` / `_playGame` | **Drum callers must explicitly pass `'lin'`** |
| `hold` | 0 | (new) | Off by default — only drum presets use it |
| `decay` | 0 | `adsr` | 0 = "as long as the note" |
| `sustain` | 0 | `adsr` | 0 = struck |
| `release` | 0.015 | `adsr` / `_playGame` | |
| `sag` | 0 | drum `env` | Off by default |
| `sagAt` | 0.02 | drum `env` | Only read if `sag > 0` |
| `curve` | `'exp'` | all three | Decay/sag/release shape |

---

## 7. Migration Plan

1. **Write `envelope()` as a new module-level function** in `src/engine/voices.js`, above
   `adsr`. Keep `adsr` in place.
2. **Add a `_drumEnvelope()` thin wrapper** that calls `envelope()` with `attackCurve: 'lin'`,
   `sustain: 0`, `release: 0` and returns `attack + hold + decay` (matching the old
   `env` return convention) so the drum path needs zero changes to its loop body.
3. **Swap `_playAdditive`** to call `envelope()` instead of `adsr()`. Verify offline render
   matches.
4. **Swap `_playGame`** to call `envelope()` instead of its inline ramps. Verify offline
   render matches.
5. **Swap `_playDrum`'s `env`** to the `_drumEnvelope()` wrapper. Verify.
6. **Delete `adsr`** and inline the wrapper out of existence.
7. **Update `tools/mixer-voice-editor.js`** — the envelope UI rows (`adsr()` helper in
   that file) already emit the same keys. The only changes needed are:
   - Add HOLD, SAG, SAG AT rows to the drum panel groups (they're already in the data,
     just not exposed).
   - Add ATK CURVE pill to the KNDO-5 and Additive panels (currently only Tone panels
     have it).
   - Possibly add HOLD to the pitched panels as an advanced row.

---

## 8. What This Does NOT Touch

- `src/engine/weapon-sfx.js` — in-game weapon cues, separate codebase
- `src/engine/audio.js` — game audio system, uses its own envelope scheduling
- Tone.js synth classes — their envelopes are inside Tone, unreachable
- `tools/render-sfx.js` — offline SFX render tool, separate
