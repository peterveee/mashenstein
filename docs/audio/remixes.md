# Cabinet remixes — how they were made, and how to make more

29–30 Sep 2026. Twenty-three remixes of the cabinet themes, written as **game
alternates**: each is its own song file, selectable from the dev menu (GAME ALTERNATES)
and on the mixer desk, and none of them replaces a shipped song.

> **The tools are untracked.** Everything under `work/local/` named below is where the
> generators and helpers live. `work/` is the drawer that is safe to delete, so promote
> them into `tools/` before anyone wipes it — the song files in `src/data/imported/`
> survive without them, but you can't re-run a generator that no longer exists.

## What exists

| Cabinet | Remixes (★ = the banger) | Style, BPM |
|---|---|---|
| Field Service (plumber) | `field-service-night-drive` | synthwave, 118 |
| | `field-service-harvest` | folk-house, 124 |
| | `field-service-slap-happy` | future funk, 116, swing 56 |
| | `field-service-overclock` | liquid drum & bass, 172 |
| | `field-service-chipstep` | chip + half-time wobble, 140 |
| | `field-service-aussendienst` | Kraftwerk (Man-Machine / Computer World), 116 |
| | `field-service-harvest-opus` | Peter's HARVEST copy + a hyper-electronic intro (bars 1–8 only) + the POWER DOWN on bar 4, 124. **Since 30 Sep 2026 this is the plumber cabinet's song** (`src/data/songs/plumber.js`, in game and jukebox); the old 112 BPM theme is kept as `field-service-original` (FIELD SERVICE (ORIGINAL VERSION)) and frozen for tests as `tests/fixtures/plumber-classic.js`. |
| Speed | ★ `speed-remix-breakneck` · `speed-remix-hairpin` · `speed-remix-cowbell` | D&B 174 · eurobeat 155 · drift phonk 130 |
| Neon | ★ `neon-remix-live-wire` · `neon-remix-golden-hour` · `neon-remix-freefall` | hard-dance 150 · city pop 120 · lo-fi→jungle 174 |
| | `neon-remix-endstation` | Kraftwerk, 124 |
| Frost | ★ `frost-remix-absolute-zero` · `frost-remix-black-ice` · `frost-remix-snow-globe` | big-room 128 · future garage 134 · future bass 140 |
| Crypt | ★ `crypt-remix-raise-the-dead` · `crypt-remix-coven` · `crypt-remix-graveyard-shift` | horror big-room 128 · witch house 140 · darksynth 112 |
| Rhythm | ★ `rhythm-remix-hostile-takeover` · `rhythm-remix-fire-sale` · `rhythm-remix-in-the-red` | big-room · nu-disco · acid house, all 124 |
| The Surge | `surge-remix-mashterpiece` · `surge-remix-overload` · `surge-remix-short-circuit` · `surge-remix-high-voltage` | cinematic trailer hybrid 132 · neurofunk D&B 174 · big beat 140 · hard trance 150 (30 Sep; see [The Surge](#the-surge-quoting-every-cabinet)) |

- Songs: `src/data/imported/<id>.js`, `group: "alternate"`, `alternateOf: "<cabinet>"`. Each
  file's header comment has its bar-by-bar structure and how it uses the original melody.
- Generators: `work/local/_fs-remix-<name>.mjs` (plumber) and `work/local/_<cabinet>-remix-<name>.mjs`.
- Bounces: `work/auditions/remixes/<cabinet>/<id>.wav`, and `work/auditions/field-service-remixes/`.
- All sit at **−21 LUFS** integrated (the cabinet line), set by a trailing Gain on the master chain.
- Peter's own desk copies — `field-service-harvest-copy`, `field-service-night-drive-with-piano-lead` —
  are his experiments. Never overwrite them. (`field-service-live-wire`/`-machine-code` "— GPT" came
  from another tool, not this workflow.)

### The Surge: quoting every cabinet

The Surge's own song is a 2-bar loop (132 BPM, A minor, `| Am F | G E |`). Its four remixes
expand it into a final-act track that **quotes all eight other cabinets' hooks**, because
the stage is every other level glitched together.

- **They all share one quote library:** `work/local/_surge-quotes.mjs`. It holds the Surge
  riff, its half-speed THEME (`| Am | F | G | E |`) and the original loop, plus a 4-bar hook
  from every cabinet with that cabinet's chords, a harmonisation onto Am–F–G–E, and its
  signature voices. It also carries glitch devices (`glitchRepeat`, `sag`, `slice`, `CRUSH`,
  `TAPE`, `automate`). `node work/local/_surge-quotes.mjs` prints it all.
- **Every hook is already in the Surge's key at its own pitch** (A minor, C major, D dorian,
  G major without F#, Speed's riff without F#), so a quote drops onto the Surge's bed
  untransposed. That is what holds the mash together.
- **They all share one form:**
  1. IGNITION: the original loop, restyled (bars 1–4, the cabinet screen).
  2. Build.
  3. Drop one: the riff as the hook, the THEME as a counter-line.
  4. CHANNEL SURF: glitch-cut windows, one hook each, on that cabinet's own timbre.
  5. Breakdown: Crypt and Frost.
  6. Build two.
  7. Drop two: a key lift, with the remaining hooks as counter-lines.
  8. EVERYTHING AT ONCE: back in A minor for the loop.
- **Every loop runs over 120 s** (bar 9 → end), longer than a Surge stage.
- **The quote order** follows the surge backdrop's look cycle (`surgePack`: pixel, faux3d, neon,
  watercolor, vhs, lcd, cardboard, doodle), so the backdrop can later be synced to the music.
- **The opening film uses the Surge song.** `SURGE_THEME` slams in at the door cut, and the
  hero section is choreographed to 132 BPM bars (`src/data/jokes.js`). Promoting a remix
  means freezing the old loop for the film, unless it is MASHTERPIECE, whose bar 1 is
  written as that slam.
- The brief is `work/local/_surge-remix-brief.md`. The generators are
  `work/local/_surge-remix-<name>.mjs`.

## The toolkit (`work/local/`)

| File | What it does |
|---|---|
| `_remix-lib.mjs` | Write a song as a list of **bars**. `L('A4 . C5:3 …')`, `E([[step, note, len]])` and `P('x...x...')` shorthands; chord and part builders (`voicing`, `chordBar`, `padBar`, `bassBar`, `arpBar`); melody transforms (`augment`, `legato`, `diatonic`, `scaleOf`, `shift`, `lenAll`); `packBank` (one section per bar pair); `writeSong` and `saveSong`; `riser(seconds)`. |
| `_remix-extract.mjs <id> --map` / `--lanes=a,b --bars=1-16 [--len]` | Shows a song as the sequencer plays it (arrangement, transposes and mutes applied), lane by lane, as note names. This is how you find a cabinet's melody. |
| `_remix-bounce.mjs <id> [--no-wav] [--lanes[=a,b]] [--range=17-32]` | Bounces with the song's own mix and arrangement and prints LUFS, peak, and 7 bands against the finished cabinets' median. `--lanes` solos each lane and shows its level and band shares. Every render takes one of 3 machine-wide **render slots**, so parallel work can't make the desk crackle. |
| `_remix-arrcheck.mjs` | Lists any song that would fail `tests/arrangement.js`'s round-trip checks. It must print nothing. |
| `_kw-speak.mjs` | `speaker(phrase, pots, {from})` gives a song-local JMJR-4 talking voice, with its phrase compiled from text the way the desk does it. |
| `_rhythm-remix-verify.mjs` | Checks a rhythm alternate against the beat-chart rules (see Sync). |
| `_remix-cpu-bench.mjs <ids…>` | Best-of-N CPU cost against rhythm, over the whole song. Needs a quiet machine. First run 1 Oct 2026: `_remix-cpu-bench-2026-10-01.txt`. |
| `_remix-brief.md` | The brief the five parallel composers worked from. |
| `_remix-voices.txt`, `_remix-effects.txt` | Every voice id with its description, and every effect id with its default params. |

## The workflow

1. **Find the melody.** Run `_remix-extract.mjs <cab> --map`, then read the lanes that actually
   play. **M** means muted in the mix: speed's composed SYNTH LEAD is muted, and what the player
   hears is a different riff. Read the song file's header comment too; it usually explains the design.
2. **Find the harmony the tune implies, not the one the bass plays.** Plumber's bass looped
   Am F C G a *beat* each, but the melody only ever implied a chord every *half bar*
   (A phrase `| Am F | C G |`, B `| Am C | F G |`). Harmonise at that rate.
   - Augmenting the tune ×2 (`augment`) maps it onto a chord a bar (`| Am | F | C | G |`), so the
     same hook works as a half-speed verse. That's also how drum & bass carries it at 172 or 174 BPM.
3. **Check the cabinet's sync constraints** (below) before you pick a tempo or a form.
4. **Write a generator.** Copy `_fs-remix-night-drive.mjs` or `_fs-remix-harvest.mjs`:
   - Bars are data: an array of `{ lane: part }`. Build them section by section with small helpers.
   - `packBank(bars, { bpm, drums })` makes one section per bar pair.
   - The mix block holds `layers`, `voice`, `voiceParams` (song-local voices), `lanes` and `labels`.
     The master chain is `mbCompN` plus a trailing `gain`.
   - `variants.select` loops bars 1–4 on the cabinet screen.
   - `writeSong({ …, loop: { fromBar: 5, toBar: N }, alternateOf })`, then `saveSong` writes the file.
5. **Write, then re-index:** `node tools/import-midi.js --reindex`. The song shows up on the desk
   after a refresh.
6. **Balance by measurement.** Run `_remix-bounce.mjs <id> --no-wav --lanes=… --range=<a drop>`.
   - Solo targets in a drop, relative to the main lead:
     - kick ≈ lead
     - bass 1–3 dB under
     - snare and clap 3–6 dB under
     - pads 6–10 dB under
     - arps 6–9 dB under
     - hats 12–16 dB under
   - In quiet sections the melody must be the loudest melodic part.
   - Then set the trailing Gain so the whole song reads −21.0 ±0.3 LUFS.
7. **Test:** `_remix-arrcheck.mjs` (prints nothing), `node tests/arrangement.js`,
   `tests/game-alternates.js`, `tests/song-alternates.js`.
8. **Bounce the WAV** (drop `--no-wav`) and hand over. Nothing is committed unless Peter asks.

## Editing on top of Peter's desk copy (the HARVEST OPUS pattern)

When Peter says "take my copy and change bars X–Y", don't re-generate the song. Read his copy's
module and add **one arrangement section per changed bar** that starts from his:

- Expand his order into one entry per bar with `expandOrder(order, true)`.
- For each changed bar, push `{ base: <his section>, lane: …, laneLen: … }` onto `arrangement.sections`.
  Consecutive halves of one section can share a single new section.
- Point that bar at the new section, then re-compact with `planToOrder(plan)` from
  `tools/lib/arrangement-edit.js`. This keeps every per-bar mute, transpose and effect he set.
- Write the result with `songFile()` from `tools/lib/song-source.js` under a **new id**.
- Prove the untouched bars are identical: compare `songBars(...)` of the two songs bar by bar, lane by lane.
- `_fs-remix-harvest-opus.mjs` is the worked example. It re-reads his copy on every run, so his later
  edits flow through.

## Arranging tricks that worked

- **Keep the hook's rhythm and pitches.** Vary the setting: tempo, harmony rate, register,
  timbre, octave doubling.
  - Peter rejected an upside-down (diatonically mirrored) answer to the repeated phrases.
    Keep his melody as it is.
- **Get to the energy fast.** Peter cut HARVEST's 8-bar verse: a 4-bar intro, then the build,
  then the drop by about bar 9, and 48 bars in total.
  - Stages are 60–90 s, and the cabinet screen hands over at bar 5.
- **Phrase plan** A A B B A A C C works. A build that climbs the hook's opening figure
  (F G Am E7) with a harmonic-minor V (E or E7) leads cleanly into an Am drop.
- **The third below.** `diatonic(part, -2)` reproduces plumber's own hand-written harmony line
  exactly. It's a quick way to get idiomatic harmony on any cabinet melody.
- **The banger kit:**
  - a snare roll accelerating over the last 2 bars;
  - a riser on the first bar of a 2-bar build;
  - a drop with four on the floor, an off-beat bass, and pumping supersaw chords
    (`rhythmgate` with `division: 1, gateLength: 1, attack: 0.14–0.18, decay: 0.02, depth: 0.55–0.8`);
  - a crash on the one and a fill every 8 bars;
  - a second drop that goes harder: an octave-up double, a key lift, or a switch between half time and four on the floor.
- **Hyper-electronic intros** set up a banger: a square hook, a 16th square arpeggio, square octave
  bass, a 909 kick, metallic hats and blips. Then carry the arpeggio up through the build.
- **Kraftwerk** (Man-Machine / Computer World): the style is precision, repetition, and parts
  entering one at a time. No risers, no pumping.
  - Parts:
    - a sequencer ostinato;
    - `bestClassicMono` (Minimoog-style) on a 3-3-2 figure;
    - Simmons drums (`sdsKick`, `sdsSnare`), `stMetalHatClosed` hats and `kwBlip*` blips;
    - the Casio `vl1Pi` / `vl1Po` playing the hook's rhythm;
    - `bestPwmChoir` (Polymoog), `bestRobotVox` (vocoder);
    - robot lines from `_kw-speak.mjs` (`voice: 'robot', bits: 6, rate: 9`).
  - Don't use Kraftwerk's lyrics or melodies. Have the robot say the game's own words.

## What Peter likes (from his own edits)

- **Keys on the hook.** He swapped a gliding synth lead for `tngrConcertGrand` and a mega-saw for
  `mrdrElectricGrand`. Saws are fine as layers.
- **Bright leads.** He added `{ id: 'exciter', params: { tune: 2500, drive: 0.5, timbre: 0.4, mix: 0.3 } }`
  and `eq: { high: 2.6 }`. Don't EQ a lead's presence down just to meet the band median.
- **Loud risers and crashes:**
  - The riser is a crash layer (`crash2`) with `voiceParams: { crash2Voice: riser(2 * 240 / BPM) }`,
    around −4 to −2.7 dB, with `eq: { low: 5.5, high: 2 }` and a reverb send of 0.8.
  - Crashes get big reverb sends.
- **A punchy backbeat.** `dsSnare` at about +1.7 dB with `eq: { low: 2.8, high: 5.2 }`, and a louder kick.
- **A loud plain-square double** (`roundMono2`) under the hook in the drops.
- He listens on the desk while you work, and saves **copies** to compare. Treat a copy as
  feedback: diff it against yours (`mix`, `bank`, `arrangement`) to see what he changed.

## Style guide: what each style is made of, and what to ask for

Every sound here is synthesised: there are no sampled vocals, guitars or breakbeats. Vocals come
from the JMJR-4 singers and speakers, and breaks are programmed hit by hit.

### Styles used

**Synthwave / outrun** — NIGHT DRIVE (118)
- **Feel:** 100–120 BPM, straight and driving, an 80s film score.
- **Drums:** kick on 1 and 3 in the verse, four on the floor in the chorus. A big *gated-reverb snare*
  (reverb, then a noise gate). 16th hats and Simmons tom fills.
- **Bass:** root–octave 16ths on a brassy mono saw, with a sine sub.
- **Harmony:** a chord a bar in minor with maj7/add9 colour. The last chorus lifts a whole step
  (the 80s "truck-driver" key change).
- **Parts:** a gliding hero or hollow PWM lead, a string machine pumping on the beat, a crystal arp,
  and brass stabs.
- **Ask for:** "gated snare, octave bass, string machine, 80s hero lead, key change up a tone."

**Folk-house (stomp-clap EDM)** — HARVEST (124)
- **Feel:** Avicii's "Wake Me Up": an acoustic verse, then an EDM drop.
- **Drums:** the verse has a stomp on 1 and 3, big-room claps on 2 and 4, tambourine off-beats and
  16th shaker. The drop has a four-on-the-floor 909 and off-beat open hats.
- **Bass:** picked root–fifth bass in the verse, off-beat bass in the drop.
- **Parts:** a plucked koto or banjo-like hook, strummed chords (`noteFx` strum), and a whistle
  (ocarina or pan flute) hook. The drop has pumping supersaw chords.
- **Ask for:** "stomp-clap verse, strummed chords, whistle hook, supersaw drop."

**Future funk / nu-disco** — SLAP HAPPY (116, swing 56), FIRE SALE (124)
- **Feel:** four on the floor with a little shuffle (swing 54–58), mixing French house with 80s Japanese funk.
- **Drums:** disco kick, clap and snare on 2 and 4, 16th hats with open hats on the off-beats. Congas,
  tambourine and cowbell. A syndrum "pew" on the downbeats.
- **Bass:** slap bass (thumb on the root, octave pops on off-beat 16ths) or disco octaves.
- **Harmony:** 9ths and 13ths (Am9 Fmaj9 Cmaj9 G13), with ii–V–I turnarounds.
- **Parts:** a talkbox sings the hook, vocal chops answer or sit a third under, plus brass stabs,
  violin runs, Rhodes comping and clav chops.
- **Filter house:** the whole band through a closing or opening low-pass.
- **Ask for:** "talkbox hook, slap bass, Rhodes 9ths, disco strings, congas, filter sweep."

**Liquid drum & bass** — OVERCLOCK (172)
- **Feel:** 170–176 BPM, lush and rolling. The hook plays at half speed, so it sings over double-time drums.
- **Drums:** two-step (kick on 1 and the "and" of 3, snare on 2 and 4), ghost snares, 16th shaker,
  and a ride in the second drop.
- **Bass:** Reese (two detuned saws) over a clean sub.
- **Harmony:** a chord a bar with 9ths, Rhodes stabs and a warm pad.
- **Parts:** a bell carries the hook, with a reed an octave under; an air flute takes the breakdown.
- **Ask for:** "liquid D&B, Rhodes, Reese, half-speed hook over double-time drums."

**Drum & bass, harder** — BREAKNECK (174); **jungle** — FREEFALL (174)
- **BREAKNECK:** a screaming riff lead over a galloping Reese, pumping saw chords and 808 impacts.
  The second drop stacks the other melody under the riff.
- **Jungle:** chopped, amen-style breaks (ghost notes and rolls) over a rolling sub. FREEFALL opens
  lo-fi and half-time, then *falls* into jungle.
- **Ask for:** "Reese gallop, screamer riff, amen-style break, half-time intro that drops into jungle."

**Lo-fi** — FREEFALL's intro
- **Feel:** a 70–90 BPM feel (half time at 174).
- **Sound:** dusty soft drums, felt piano, and a Rhodes with tape wow and flutter (`tape` effect).
- **Ask for:** "lo-fi: felt piano, tape-warbled Rhodes, dusty drums."

**Chipstep / chip-house** — CHIPSTEP (140)
- **Sound:** square and pulse waves with a Game Boy snare, built like a modern track.
- **Drums:** four-on-the-floor chip-house in the verse, a half-time dubstep drop (kick on 1, snare on 3, 808).
- **Bass:** square octaves in the verse, a *wobble* (LFO filter) in the first drop, a stutter bass in the second.
- **Parts:** an arcade chorus voice sings the hook; a screamer takes the peak.
- **Ask for:** "chiptune squares, half-time wobble drop, arcade chorus."

**Kraftwerk electro** (Man-Machine / Computer World) — AUSSENDIENST (116), ENDSTATION (124)
- **Feel:** dry, precise and repetitive, with parts entering one at a time. No risers, no pump.
- **Drums:** Simmons, metallic hats, blips on the off-16ths, and the Casio VL-1 "pi-po".
- **Bass:** a Minimoog on a 3-3-2 figure or octaves, and a Tron 16th sequencer.
- **Harmony:** one or two chords, Polymoog choir and brass.
- **Parts:** a plain square hook with a music bell over it, a vocoder theme, and a six-bit robot
  saying the game's words.
- **Ask for:** "Kraftwerk: sequencer ostinato, Minimoog, vocoder, robot says ‘…’, calculator blips."

**Eurobeat** — HAIRPIN (155)
- **Feel:** 150–160 BPM, Initial D racing music.
- **Drums:** relentless four on the floor with off-beat open hats.
- **Bass:** octave 8ths under everything.
- **Harmony:** dramatic minor progressions (Em G C D); the last chorus goes up a tone.
- **Parts:** a sync or razor riff and solo, orchestra hits, brass, piano chords, and a
  doubled chorus melody.
- **Ask for:** "eurobeat: octave bass, orch hits, sync-lead solo, last chorus up a tone."

**Drift phonk** — COWBELL (130); a phonk hook also appears in COVEN
- **Feel:** a dark, gritty half-time feel (Memphis rap by way of drift videos).
- **Signature:** the melody played on a pitched **TR-808 cowbell**, over a distorted 808 that slides
  between notes.
- **Drums:** trap hat rolls.
- **Ask for:** "phonk cowbell melody, distorted sliding 808, half-time."

**Festival hard-dance** — LIVE WIRE (150)
- **Feel:** big-room energy at 145–155 BPM.
- **Bass:** off-beat bass layered with Tron 16ths.
- **Parts:** the hook doubled by piano in octaves and a square pluck, a supersaw pump, and a
  filter-sweep saw on the builds.
- **Ask for:** "hard-dance: off-beat plus rolling 16th bass, filter-sweep builds, octave piano hook."

**City pop** — GOLDEN HOUR (120, swing 56)
- **Feel:** sunny, sophisticated 80s Japanese pop (Tatsuro Yamashita, Mariya Takeuchi).
- **Drums:** a tight kit with cross-stick and Simmons tom fills.
- **Bass:** a busy, melodic DX7 slap bass.
- **Harmony:** lush chords (C6/9, Fmaj9, Em11, G13, ii–V–I).
- **Parts:** the hook on a CP-70 electric grand with the chime; celeste octaves, clavinet, PWM brass and strings.
- **Ask for:** "city pop: DX slap bass, CP-70, rich 9th/11th/13th chords, cross-stick, a little swing."

**Big-room / progressive house** — the banger template: ABSOLUTE ZERO (128), HOSTILE TAKEOVER (124),
RAISE THE DEAD (128, with a horror flavour)
- **Shape:** build, drop, breakdown, build, then a harder drop (a double drop and/or a key lift).
- **Drums:** four on the floor, clap on 2 and 4, off-beat open hats, crash and impact on the one,
  an accelerating snare roll, and a fill every 8 bars.
- **Bass:** off-beat bass over a sub, with pumping supersaw chords.
- **Hook:** an electric grand with a **loud plain-square double** and an ice bell an octave up;
  a mega-saw or screamer an octave up in the last drop.
- **Horror flavour:** church bell on the drops, a choir, and a growled tag landing its last word on the downbeat.
- **Ask for:** "big-room banger: pumping supersaws, off-beat bass, square-doubled grand hook, loud riser,
  double drop with a key lift."

**Future garage / UK 2-step** — BLACK ICE (134, swing 57)
- **Feel:** swung, skippy and moody (Burial, Joy Orbison).
- **Drums:** a 2-step kick with a skipping second kick, swung hats, and a half-time section.
- **Bass:** dubby Reese over a sub.
- **Parts:** pitched *vowel chops* call the hook, an ice bell answers, plus Rhodes stabs and a dub
  section with the drums out.
- **Ask for:** "UK garage 2-step swing, pitched vocal chops, Reese sub, dub breakdown."

**Kawaii future bass** — SNOW GLOBE (140, half time)
- **Feel:** cute and sparkly, half time (Snail's House).
- **Signature:** **stuttered supersaw chords** (rhythmic gating).
- **Drums:** half-time drums with hat rolls; the second drop goes full time.
- **Bass:** 808 and a talking "yoi" wobble.
- **Parts:** a vowel-chop hook with a music box an octave up, and a bright grand.
- **Harmony:** recast in a major key.
- **Ask for:** "kawaii future bass: stuttered supersaws, music box, vowel chops, 808, major key."

**Witch house / Halloween trap** — COVEN (140, half time, G minor)
- **Feel:** slow, dark and occult, with trap drums at half time.
- **Bass:** an 808 that glides only where notes overlap.
- **Parts:** a warped music box, an old upright piano, a ghost voice at half speed, choir,
  church bell, and a spoken tag.
- **Ask for:** "witch house: half-time trap, 808 glide, warped music box, ghost choir, spoken tag."

**Darksynth / industrial** — GRAVEYARD SHIFT (112)
- **Feel:** aggressive 80s horror synth (Carpenter Brut, Perturbator).
- **Drums:** metal clap, clang rim, clock ticks and Simmons toms.
- **Bass:** a pulsing 16th bass.
- **Parts:** the hook on FM piano in octaves, a razor sync lead an octave up at the peaks, brass stabs
  in the hook's rhythm, PWM strings and a robot chant.
- **Ending:** a false ending, then a return a half step up.
- **Ask for:** "darksynth: pulsing bass, razor sync lead, metal percussion, false ending, half-step lift."

**Chicago acid house** — IN THE RED (124)
- **Feel:** raw, hypnotic and jacking.
- **Drums:** 909 kick and rim with a ride.
- **Signature:** a **TB-303 squelch** line (resonant filter) playing the original arp *unchanged* while
  the harmony moves underneath, and a second, distorted 303 an octave up.
- **Parts:** a house-piano chord riff, organ stabs, and a filter that opens over long stretches.
- **Ask for:** "acid house: 303 riff, house piano stabs, organ, 909, a filter opening over 16 bars."

**Moves that work in any style:**
- the hook at half speed (a verse, D&B, lo-fi) or doubled an octave (bell, square);
- a key lift (whole step, half step, or frost's own major third);
- a half-time switch, a double drop or a false ending;
- a filter-sweep build, a stutter, or call-and-response between two voices.
- Peter turned down an upside-down answer to his melody; vary the setting, not the tune.

### Five more styles to try

**Trance** (uplifting or psy), 136–142
- Four on the floor with a *rolling off-beat 16th bass* (the psy gallop: kick, bass, bass, bass).
- **Trance-gated** supersaw chords (`rhythmgate` at 16ths).
- A long breakdown with the hook on a pluck or piano, then the full supersaw lead.
- 32nd-note snare builds and a key lift. The psy variant adds 303 and FM squelches.
- Suits speed, frost and neon.
- **Ask for:** "uplifting trance: trance-gated supersaws, rolling 16th bass, long piano breakdown, key lift."

**Electro swing**, 120–128 with heavy swing (60–66)
- Four on the floor under swung hats and a walking or upright-style bass.
- The hook on clarinet or soft horn, with brass-section stabs, stride piano, 6th and diminished
  chords, vinyl-crackle noise and "hey!" chops.
- Suits plumber, the shop and food court, and office. It's a natural fit for the game's cartoon-retro look.
- **Ask for:** "electro swing: swung four-on-the-floor, clarinet hook, brass stabs, walking bass, stride piano."

**Amapiano**, 110–115
- The **log-drum bass** is the signature: a percussive sine thump with a fast pitch drop, playing
  syncopated lines. Here it would be a song-local MRDR-3 voice, like the 808 glide.
- 16th shakers, a sparse kick, congas and woodblock, deep-house piano chords (m9, maj9), long
  laid-back builds, airy chops or whistles.
- Suits hub/menus, office and frost.
- **Ask for:** "amapiano: log-drum bass, shakers, deep-house piano chords, laid-back 113."

**Big beat / breakbeat** (Prodigy, Chemical Brothers, Fatboy Slim), 125–140
- Programmed breakbeats with syncopated snares and ghost notes.
- A distorted acid or synth riff as the hook, sirens, stabs, huge filter sweeps and shouted "hey!" chops.
- Suits speed, rhythm and surge.
- **Ask for:** "big beat: breakbeat drums, distorted acid riff, sirens, shouted hooks, filter sweeps."

**Hyperpop / glitch pop**, 150–170
- Maximalist: distorted 808s, bit-crushed drums, and sudden switches between half and double time.
- Pitched-up vocal chops (JMJR-4 small voice), very bright supersaws, 16th and 32nd stutters, chip bleeps.
- The arcade identity, but modern and chaotic.
- Suits neon, cardboard and surge.
- **Ask for:** "hyperpop: pitched-up chops, distorted 808, glitch stutters, bit-crushed drums, tempo switches."

**Also possible:**
- orchestral trailer (finale, crypt);
- Jersey club (140, triplet "bed-squeak" kicks);
- moombahton (108, dembow rhythm);
- italo disco / synth-pop.
- Surf rock and anything guitar-led are weak here: there is no convincing guitar voice.

## Sync: what each cabinet's song drives

| Cabinet | Keep |
|---|---|
| rhythm | `beatCharts` lay holes and coins on the song's beats. Exactly 124 BPM, no swing, phrases on bars 1, 5, 9…, a loop spanning whole 16-beat chart loops, a kick on every quarter. |
| neon | `NEON_STRIKE_BEATS = [56, 176]`: the minor turn / lightning on bar 15's downbeat and another strike on bar 45. The turn must land 13–18 s after the cabinet screen (neon-1's first rideable train), so the select loop sits just before it. The loop returns to bar 15. |
| crypt | `CRYPT_WEATHER_TIMING`: a 192-beat (48-bar) cycle, with the dark choir middle eight on bars 17–24 (and 65–72 in 80-bar songs). No loop boundary inside bars 16–28 of a cycle. |
| frost | The frost-3 sleigh carol takes its key from the `bass` lane's first note in the section, so start every bar pair on the tonic. It plays at song tempo; keep to roughly 100–140 BPM. |
| speed | The coyote's cues are in E minor (and rendered at song tempo), so keep speed remixes in E minor at home. |

> **Blocker (not fixed):** `src/game/run.js` only reads the song's beat when
> `Audio.sourceBank === this.cabinet.music`. So **no rhythm alternate lays its chart**, and crypt's
> eclipse, the speed coyote and frost's carol fall back to plain seconds under any alternate. The
> suggested fix is to compare against the bank the stage was entered with. It's a game-code change
> and Peter's call.

## Engine gotchas

- **Voices**
  - The fx `sweeps` lane plays any riser about 25 dB too quietly. Use a crash layer.
  - A song-local voice with no measured `level` is levelled by `peak`. A low `peak` (e.g. 0.034) pushes
    it to the +12 dB boost cap (`MAX_LEVEL_BOOST`).
  - Engine voices (`eng*`) do nothing on a layer lane.
  - **Don't put a dense lane on a CRLS-1 voice** (the Tone-based class: `tpSuperSaw`, `roundMono`,
    `bass303*`, `acidSquelch`, and so on). A CRLS-1 pool is built the first time a lane plays and
    keeps running for the rest of the song. Two Surge remixes benched at 214% and 172% of rhythm,
    and their CRLS-1 lanes were 64% and 46% of the whole-song cost. Rendered section by section,
    they looked fine: the cost only shows over the whole song. Build dense parts on MRDR-3
    instead, which costs next to nothing when idle. A copy with the same oscillator, envelopes and
    filter sounds the same (`fatsawtooth` count N becomes `unison: N, spread`). Tone's −24 filter
    applies its Q twice, so raise the Q a little on the MRDR-3 copy. Re-level by solo LUFS.
    Tools: `_surge-ablate.mjs` (the cost of each lane group, by blanking its notes),
    `_surge-sections.mjs` (the cost of each section), `_surge-solo-compare.mjs` (solo LUFS, old
    version against new).
- **Layers**
  - A layer's key is a base lane plus a digit (`lead7`, `bass3`, `crash2`).
  - `independent: true` gives it its own notes. Without that flag it copies its source lane's notes.
    Title's sub fix is `{ key: 'bass3', from: 'bass' }` voiced as an MRDR-3 sine at `ratio: 0.5`,
    one octave down.
- **Notes and velocity**
  - `*Vel` arrays in song files are ignored. Make ghost notes on a quieter layer.
  - Note names are sharps.
  - `chordSeq` names only maj/min/7/maj7/min7/9, so the lib writes other voicings as raw frequency arrays. That's fine.
- **Arrangement format**
  - Bank sections may not carry `base:` (a test forbids it).
  - Per-bar `inlineFx`, `gain` or `transpose` belong in the **arrangement's** order only, via
    `writeSong({ order })`. In the bank's order they fail the round-trip test.
  - A desk-arranged song (neon) keeps its notes in `arrangement.sections`. Soloing has to blank those
    too; `_remix-bounce.mjs` does.
- **EQ and levels**
  - Lane EQ corners are 250 Hz, 1.2 kHz and 4 kHz. For surgery use `peq`: `f1/g1` low shelf,
    `f2|f3|f5` peaks with `g`/`q`, `f4/g4` high shelf.
  - The master `mbCompN` mid band (180–1800 Hz) squashes mid-frequency strip boosts. That's why
    neon's mid fix stalled at about −2.3.
  - Levels go on a **trailing** Gain after the whole master chain. For shipped songs use
    `node tools/song-levels.js <ids> --apply`; the desk's APPLY levels every song at once.
  - `tools/bass-report.js` can't render an alternate, because it uses the shipped mix table.
    Use `_remix-bounce.mjs`'s band table instead.
- **Robot speech (JMJR-4)**
  - Compile phrases against `work/local/cmudict.json`, which the desk caches.
  - A word that isn't in the dictionary throws: respell it ("shibuya" → "she boo ya").
- **Desk files**
  - The desk rewrites a whole song file on save. After editing a song file, Peter must reload that song
    on the mixer before saving it again.
  - `saveSong` refuses to overwrite a file the desk saved since the generator last wrote it.

## Working at scale (five composers in parallel)

- One agent per cabinet, all briefed from `_remix-brief.md`. Relay Peter's newest taste signals
  to every agent while they work; his copies changed the brief twice in a day.
- Machine etiquette:
  - Render slots cap concurrent renders at 3.
  - Never `pkill`.
  - Leave ports 8000/8010 (his desk) alone.
  - A wait loop using `pgrep -f "_remix-bounce.mjs"` matches **its own command line** and never exits.
    Use `pgrep -f "node work/local/_[r]emix-bounce"`.
  - macOS has no `timeout`.
- The shared tree: no git operations. The only tracked changes are the re-indexed
  `src/data/imported/index.js` and `src/data/game-alternates.js`.
- Reports "from the desk": POST `localhost:8000/api/run/songlevels` (measure only), then
  POST `/api/run/bassreport` with `{"ids":[…14 songs…],"opts":[]}`. Results land on `/reports`.

## Open items

- The `run.js` sourceBank gate described above: rhythm alternates can't play a beat stage.
- CPU was benched on 1 Oct 2026, whole song, best of 2, against rhythm, the heaviest cabinet (full
  table: `work/local/_remix-cpu-bench-2026-10-01.txt`). Every remix is at or under rhythm:
  - `speed-remix-hairpin` is the heaviest at 103%. After it come the plumber cabinet song (87%),
    SLAP HAPPY (84%) and SHORT CIRCUIT (84%). The lightest is COVEN at 36%.
  - HIGH VOLTAGE and SHORT CIRCUIT first benched at 214% and 172%. Moving their dense lanes off
    CRLS-1 brought them to 72% and 84% (see Engine gotchas). Re-bench any new remix before it ships.
- Several remixes sit +3 to +5 dB in presence or low-mid against the median (bright leads, which Peter
  asked for, and melodies in the 300–800 Hz range).
- Shipped songs:
  - crypt measured −26.1 LUFS (5 dB under its line; another session was editing it);
  - finale peaks at −0.2 dBFS;
  - neon's mid and presence sit about 0.3 dB past the ±2 flag. Easing its master `mbCompN` mid band
    would clear them, which is Peter's call.
