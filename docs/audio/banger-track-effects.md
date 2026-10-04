# Banger Track Effects — policy 1

Track Effects chooses ongoing production after the notes, sounds and lanes are known,
before final level balancing. It writes normal mixer inserts and sends: playback has
no separate Banger effects path. The desk's Make a Banger dialog and the Lab both offer
**Keep Style**, **Subtle Variation** and **Adventurous**.

Keep Style is the generator's default, including recipes saved before this feature.
A fresh Lab draft starts on Subtle Variation. The selected mode and policy version are
saved with Lab recipes; the cache includes them. An unknown future policy keeps the
style's production. Another Take changes the seeded choices; Modify This Take can also
re-roll Track Effects separately from the notes and instruments.

The planner reads each part's actual notes, lengths, density, polyphony, pitch and
estimated envelope release. Silent sections do not make a busy part look sparse.
Instrument category and envelope metadata supply hints; these are rules rather than
listening or spectral measurements. Styles weight echo, chorus and room differently;
airy and dry moods adjust the room/chorus preference.

- **Echo:** sparse monophonic notes with gaps and short enough release tails can earn
  an eighth-note or dotted-eighth echo. A shared return is used only when its explicit
  sync, division and restrained feedback match. Otherwise an Advanced Delay insert
  supplies filtered repeats and the inherited delay send is set to zero.
- **Lush:** held parts can earn restrained Stereo Chorus, including the main hook
  in Adventurous. It is not stacked onto existing modulation/width inserts.
- **Room:** a part without heavy existing ambience can earn a short, darkened local
  reverb. Its shared reverb send is cleared so two rooms are not stacked.
- **Upfront:** busy generated parts can have inherited delay turned off and their
  reverb send reduced. Existing delay/reverb inserts are preserved.
- **Clean:** supporting parts can stay dry. Adventurous always picks a treatment
  for the main hook when a suitable option fits the instrument, phrase and budgets.
  Simple held hooks can receive chorus; sparse short hooks can receive delay.

Subtle mode changes at most two parts, Adventurous at most four. Existing prominent
echo/width inserts and sends consume the song's respective budgets. There can be at
most one new short-room insert. These budgets control production prominence and added
graph cost; they are not a guarantee about device CPU or a full-song loudness target.

All source accompaniment, low-end lanes and percussion remain untouched in v1. A main
riff with authored sends or inserts is protected in Subtle mode. Adventurous can add
a complementary treatment while keeping existing inserts and their bypass states.
An explicit bypass protects its effect family; zero sends and empty chains do not
lock the entire lead. Prominent existing sends prevent stacked ambience. Sound Combos
keep their tuned channels. Pan, EQ and Note FX are untouched.
This planner does not override the existing Riff Sound = Random behaviour, which
explicitly discards the source sound's insert chain when changing its instrument.

The production RNG is split by role and independent of the other generator streams.
The decision report, including clean/protected decisions and their reasons, is returned
as `trackEffects`, saved in the desk's Banger metadata and written into the song note.
Every treatment remains editable in the mixer.

Modify compares production fingerprints separately from notes, sounds and portamento.
An unchanged decision keeps hand-edited sends/inserts. A changed decision replaces
those fields and reports conflicts; faders, pan, EQ and other Note FX stay as edited.
Keep Style restores the generated style/source production, rather than trying to
subtract effects from a hand-edited chain.

## Section FX

For direct arrangement editing, select any track/bar range and open **Spot FX**.
Its **Style effects** picker includes the generic Banger treatments and unique saved
style chains. **Add to region** appends the complete preset across the selected bars,
without using song-section names or rule slots. Existing effects stay in place; the
new cards use the normal step grid, live editing, saving and undo. This is available
on ordinary songs as well as Bangers, and on group/master regions too.

Full Options → More Options → **Section FX** offers Style Presets, Style + Automatic,
or Manual Only. Selecting **Wild** or **Go Crazy** on the desk enables Style + Automatic
and keeps your explicit rules. You can change Section FX afterward, including switching
it to Manual Only; reading a saved Wild recipe does not force it back on.
Two explicit rules each choose a part, effect, section type and range
(whole section, first half, second half, or last two bars). Rules apply to every matching
section. Choose Main Lead / Ping-Pong Echo / Intro / Whole Section, for example, or
Arp / Arp Echo Layers / Drop / Second Half. A silent or absent part is reported as skipped.

Arp Echo Layers overlaps recent notes with dotted-eighth ping-pong repeats. The three-step
offset overlaps different pitches in a typical four-note sixteenth arp. Busy phrases
remain eligible; generic presets use a lower wet mix for busy notes and a 2 dB gain
reserve. Automatic adds at most one lead/arp treatment per section and four sections,
avoiding existing channel ambience and occupied Spot FX ranges. It has its own seeded
Section FX reroll. Manual rules are deliberate and may layer over existing channel
inserts/sends. The resulting effects remain editable in the normal Spot FX editor.

Use as Style and Save as Combo now capture part Spot FX (including legacy inline
snapshots) by musical section, repeated occurrence and relative position. A second-half
effect follows the second half when section lengths change. Repeated source occurrences
cycle over the destination's matching section type. Cross-section effects are split at
the section boundary. Master Spot FX, cuts and volume curves are not captured as part
presets. Big-Room and Future Bass's already-published channel profiles have been refreshed
with their saved seeds' part Spot FX; future seed edits still need Use as Style.

Precedence is automatic, then saved style, then Rule 1, then Rule 2. Overlapping Spot FX
chains retain unrelated effects and replace matching delay/reverb families. Fades and
cuts survive. Banger Report records origins, ranges, skipped decisions and overrides;
Modify reports changed automation and replaced hand edits. Existing song files are not
rewritten until a take is modified or regenerated.

`node tests/banger-section-effects.js` covers placement, busy phrases, inheritance,
overlaps, determinism and modification. `node tools/render-banger-section-auditions.js`
produces bounded busy-lead stem/mix A/B WAVs in `work/auditions/banger-section-effects/`.

## Balance and verification

New echo/room/chorus treatments include a visible **Gain** insert reserving 1–1.5 dB
of headroom (2 dB for chorus). This is a conservative production choice, **not a measured calibration
offset**. The offline calibration fingerprints the complete processed strip, so dry
measurements cannot silently validate a new treatment. Missing processed support uses
the existing predictive fallback. Full processed calibration and phone listening are
separate from source correctness.

The calibration tool can discover the processed variants separately:

```
node tools/banger-calibrate.js report trance --track-effects
node tools/banger-calibrate.js refresh trance --track-effects --max-profiles=1
```

This uses the planner's finite strengths/timings and real decisions on sparse, held
and busy fixtures. The ordinary calibration command still targets the style strips.
The bounded refresh above is one processed profile, not complete treatment coverage.

`node tests/banger-production.js` checks musical eligibility, authored-strip protection,
engine parameters, deterministic choices across all styles, independent note/sound/
transition streams, saving/cache behaviour and modification semantics.

`node tools/render-banger-production-auditions.js` writes raw A/B stems and short mixes
to `work/auditions/banger-production/`, using the real audio engine with explicit mix
and arrangement. Its manifest records decisions, peak/RMS values and the limitations
of these bounded renders. The files share notes, sounds and faders and are not separately
normalized. They provide review material; successful renders are not listening approval.

The desk footer's **Banger Report** opens the current take's recorded choices: style,
mood, hook, form, track production and its reasons, Auto Portamento, transitions and
balance support. It also lists the current sounds, inserts and sends, and flags mixer
settings that differ from the recorded roll. New rolls save this evidence with the
recipe; older takes show their available recipe/current mixer without reconstructing
missing decisions. Modify records its merge actions and keeps the proposed roll
snapshot distinct from retained mixer edits.
