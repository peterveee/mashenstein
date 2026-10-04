# Auto Portamento

Selective slides between nearby melody notes. A preset's own portamento is a blanket — every note that starts while the one before it is still gated glides in — and on a busy lead that is every note. Auto Portamento is the other way round: the song decides *which* connections slide, from the notes actually heard, and every other note keeps its attack. Written pitches, note starts and drawn lengths are never changed; a plan is playback instructions beside the notes.

## The setting

One lane setting, saved with the mix:

```js
mix.lanes[laneKey].noteFx.portamento = { enabled: true, amount: 35, glide: 40, version: 1 };
```

- **Amount** 0–100 (default 35) — how many of the eligible connections slide. 0 selects none.
- **Glide** 0–100 (default 40) — how pronounced each slide is. It never touches the preset's own portamento.
- Missing means off. Malformed means off. A `version` this build does not know means off, with a diagnostic — never read as 1. `enabled` is the literal `true`.
- `src/engine/auto-portamento.js` is the one reader (`readAutoPortamento`); `hasEnabledNoteFx` in `src/engine/note-fx.js` is the one answer to "does this lane's Note FX say anything", behind the serialiser, the save signature, the NFX marker and the setters. Clearing the arpeggiator does not clear a portamento.
- Lane scope only. A bar's Note FX override has no portamento controls; the engine reads it from the lane.

## Which sounds take it

`autoPortamentoSupport(voice)` is the one predicate (desk, Lab, scheduler). A slide is the legato hand-over, so the sound has to hold, and the renderer has to have the hand-over:

| Takes a slide | Refused |
| --- | --- |
| CRLS-1 (the pooled Tone leads, `Synth`/`MonoSynth`) with sustain ≥ 0.2 | anything that decays away (pianos, plucks, bells) |
| MRDR-3, native and worklet, with a sustaining amp | TNGR-2, KNDO-5, RMND-2, WNDR-9, JMJR-4 |
| | the engine's hand-written voices, drums, noise |

Unsupported lanes are left exactly as they were and the desk says why; the sound is never swapped. Only melody lanes (`autoPortamentoLane`: bass, lead, harmony, twinkle and their layers) can carry it.

## How a connection is chosen

`planAutoPortamento` (pure, deterministic; every number is in `AUTO_PORTAMENTO_POLICY`) reads an ordered event view — start and gate in beats, sounding pitch, whether the gate was drawn or inherited, and barriers (chord, different instrument, generated Note FX, a jump in the transport):

1. A local pulse is estimated from nearby onset spacings; a missing slot (spacing above 1.75 pulses) or a rest ends a **phrase**. A bar line alone does not.
2. A pair A→B is **eligible** if it touches (or the gap is under 20% of a pulse), is a different pitch, within an octave, and leaves room for a slide. Explicit staccato is never bridged; a regular run of *inherited* gates may bridge up to 35% of a pulse (and 80 ms).
3. It is **ranked**: steps first, then skips, then leaps; a short pickup into a long note and a run's final landing are promoted; interior notes of a fast run are down-ranked; the beat is a small bonus.
4. Each phrase has a **budget**: about 15% of its transitions at Amount 35, at most 40% at 100. Adjacent selections are avoided (two in a row above Amount 70). A candidate under the quality floor (0.5, or 0.3 above Amount 70) never slides — a phrase with nothing suitable takes nothing. A figure that repeats inside a phrase is taken whole or not at all.
5. The slide's length is a share of a beat, widened a little by interval and Glide, then capped at 30% of the note it lands on and 140 ms; under 8 ms it is dropped.

Every candidate keeps a reason (`pickup-landing`, `near-step`, `rest`, `chord`, `explicit-staccato`, `phrase-budget`, `weak`, …).

## How it plays

The scheduler reads one step at a time, so the lane is read ahead (`src/engine/lane-view.js`, through the same bar plan, sections, mute masks and transpositions `scheduleStep` uses) and planned once per edit. For each note on a lane that has asked, `AudioSys._portamentoFor` gives the rack an **articulation**:

- *lane has not asked / sound cannot slide / chord / note the plan does not recognise* — nothing; the note plays as it always did.
- **attack** — an unchosen note: struck normally, with the preset's own glide and legato suppressed for this note.
- **slide** — the destination of a chosen connection: continues the sounding note it names (legato hand-over) and glides over `glideSeconds`.
- The *source* of a slide has its gate stretched through the destination plus 2 ms; the destination keeps its authored start and end.

Per-note treatment never touches `VOICES`, a shared preset or a compiled patch: pooled Tone voices lend the instance a glide for the one call, the native layer path reads it in place of the preset's mode, and the MRDR-3 worklet takes it on the event (`auto`) and reads it in `applyDue`. A slide names its source by id and is refused — the note is struck cleanly — if the rack has no such note with its gate still open (seek, loop, an edit, a ranged render that begins on the destination). Stop, seek, loop wraps and song changes close the book; the end of a loop is never joined to its beginning. An edit that voids a stretched gate shortens it back to the written end where that is still ahead.

## In the desk

The Note FX panel has an **Auto Portamento** section (track scope only): toggle, Amount, Glide, and a line about the song — "N connections on offer", "Applied: N of M connections slide", or "No suitable connections" — answered by the engine while playing and from the desk's own bank while parked. An unsupported sound says why and greys the controls (it can still be switched off). The NFX marker, hover card, Save, freeze fingerprint (which also carries the planner version while the treatment is on) and undo all follow the lane setting.

## In the Lab

The desk's **Make a Banger…** dialog also offers **Auto Portamento** under **Full Options → More Options → Leads**. Choosing **Wild** or pressing **Go Crazy** switches it on; choosing a milder variation switches it off. The switch can be changed independently afterward. It survives saved takes, Banger Settings and Modify This Take, and stays on when changing style. Older recipes retain their saved behaviour until the user changes these controls. The generator only adds it where both the sound and melody qualify; no instrument is replaced to obtain slides.

GO WILD asks the generator for `options.expression = { autoPortamento: true, version: 1 }` (`tools/lib/banger/expression.js`): after notes, sounds, lanes and faders are known it puts an ordinary `noteFx.portamento` on the hook (then, on a coin flip, the counter) **only if** the sound takes a slide and the planner, asked with the settings about to be written, selects at least one connection. A take with no suitable material gets none. Of the eight Lab styles the hooks that qualify are Eurobeat, Shibuya-Kei, Electro and Mega Drive; Big-Room, Trance, Future Bass and Drum & Bass hook on pianos and a TNGR-2 harp, and get none.

Kept Lab songs are rebuilt from recipes, so a recipe carries `expression` (its own version, not `RIFF_VERSION`): new and revised recipes opt in; older recipes, `wild: true` ones included, regenerate exactly as before. The generator version is 3. Modify This Take fingerprints `noteFx.portamento` per role and merges that one field — never the whole strip.

## Tests and auditions

```sh
node tests/auto-portamento.js            # the decision, as music; the lane view; the report
node tests/auto-portamento-render.js     # slides and clean attacks, rendered; scheduler = lane view
node tests/banger-expression.js          # the Lab option, policy, Modify, recipes
node tests/note-fx.js && node tests/mix.js && node tests/freeze-fingerprint.js && node tests/mixer-layout.js
node tools/render-portamento-auditions.js   # before / after / max → work/auditions/auto-portamento/
```

The audition set is three melodies (lyrical, a fast run into held notes, phrases with rests and leaps) on four sounds (`syncRazorLead`, `mrdrConcertFlute`, `bestRobotVox`, `simpleSawtooth`), each as `-before` (off), `-after` (Amount 35, Glide 40) and `-max` (100 / 60), at one gain per set, with `manifest.json` naming every slide and why. Listen for: the slide is a scoop *into* a landing, not a smear over the line; a fast run keeps its attacks; the repeated note and the leap past an octave are left alone; the rhythm does not move.

## Known limits

- Amount above about 35 changes little on short phrases (a four-transition phrase is capped at one slide); it matters on long unbroken lines. The numbers are starting points for the ear — one table, `AUTO_PORTAMENTO_POLICY`.
- Counter lines in the Lab are mostly chord stabs or repeated staccato, so in practice only the hook is set.
- A lane whose bar has Note FX generating its notes (arp, strum) is a barrier there; Rearrange cuts are barriers.
- An edit cannot shorten a stretched gate that has already passed its written end; it rings out a few milliseconds.
- Not yet verified by ear or on a phone: the renders above are measured, not listened to.
