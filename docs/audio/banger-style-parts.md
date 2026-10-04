# Make a Banger — what each style adds

The tuned parts (not drums) each style writes with its default switches, and what a mood
changes on top. Read off the generator on 4 Oct 2026: one default banger per style and per
mood, from a two-bar hook with no chords or bass of its own. The labels are the desk strip
names: the job, then the sound.

Where it lives: switches in `tools/lib/banger/options.js` (`BANGER_DEFAULTS.parts`) with
each style's `defaults` over them, in `tools/lib/banger/styles/`; sounds in
`tools/lib/banger/sounds.js`; moods in `tools/lib/banger/moods.js`.

## The parts, and when each plays

| Part | Switch | Plays |
| --- | --- | --- |
| Hook | — | the riff's own lead (or a Written Lead) |
| Bass | Bass | under the drops, in the style's figure |
| Sub | Sub Layer | a sine under the bass |
| Chords | Chords | Pumping Supersaws, Piano Stabs or Pad, through the drops |
| Pad | — | the breakdown (and the drops when the riff has no chords of its own) |
| Hook Double | Square Double | doubles the hook in the drops |
| Hook 8va | Bell Octave | an octave over the hook, from the second phrase |
| Lead 8va | — | the hook an octave up, legato, from drop two on — every style, no switch (Octave Hook is separate: it puts the hook itself in octaves in the final drop) |
| Arp | Arp | sixteenths in the builds and later drops |
| Choir | Choir | the breakdown and the final drop |
| Third Below | Third Below | a harmony a third under the hook, drop two |
| Counter | Counter-Melody | a line in the hook's rests, so only when the hook leaves room — or chord stabs on a rhythm of their own where the style has one (Eurobeat, Synthwave), which always play |
| Piano | — | the breakdown's hook, in styles that play it on a piano (Trance, Future Bass, Eurobeat) |

## Each style's default parts

**Big-Room House** (Anthemic) — Bass Off-Beat · Chords Supersaws

| Part | Strip |
| --- | --- |
| Bass | BASS · Wide Detune |
| Sub | SUB · Sub Sine |
| Chords | CHORDS Pump · Super Saw |
| Pad | PAD · Polar Drift |
| Hook Double | HOOK DOUBLE · Plain Square vs Synth |
| Hook 8va | HOOK 8VA · Ice Bell |
| Lead 8va | LEAD 8VA · Mega Saw Lead |
| Arp | ARP · Crystal Trigger |
| Choir | CHOIR · BEST Choir Aah |

**Trance** (Uplifting) — Bass Rolling 16ths · Chords Supersaws, trance-gated.
Adds over Big-Room: a **piano** for the breakdown hook.

| Part | Strip |
| --- | --- |
| Bass | BASS · Night Sequence |
| Sub | SUB · Sub Sine |
| Chords | CHORDS Gate · Super Saw |
| Piano | PIANO · Bright Pop Grand |
| Pad | PAD · Glass Choir |
| Hook Double | HOOK DOUBLE · Super Saw |
| Hook 8va | HOOK 8VA · Ice Bell |
| Lead 8va | LEAD 8VA · Mega Saw Lead |
| Arp | ARP · Crystal Trigger |
| Choir | CHOIR · BEST Choir Aah |

**Future Bass** (Euphoric) — Bass Off-Beat · Chords Supersaws, stuttered in eighths.
Adds: the **sub is a wobble** rather than a sine, and a **piano** for the breakdown hook.

| Part | Strip |
| --- | --- |
| Bass | BASS 808 · Round Bass |
| Sub | WOBBLE · WUB Glass Yowl |
| Chords | CHORDS Stutter · Super Saw |
| Piano | PIANO · Bright Pop Grand |
| Pad | PAD · Glass Choir |
| Hook Double | HOOK DOUBLE · Aiueo (vowel chop) |
| Hook 8va | HOOK 8VA · Music Box |
| Lead 8va | LEAD 8VA · Mega Saw Lead |
| Arp | ARP · Plain Saw Synth |
| Choir | CHOIR · BEST Choir Aah |

**Eurobeat** (Anthemic) — Bass Octave (fixed) · Chords as strings.
Adds: **brass stabs** (Counter on, playing off-beat triads). Drops: the sub.

| Part | Strip |
| --- | --- |
| Bass | BASS Octave · BASS 80s Duo |
| Chords | CHORDS · BEST PWM Strings |
| Pad | PAD · Warm Strings |
| Hook Double | HOOK DOUBLE · Sync Razor Lead |
| Hook 8va | HOOK 8VA · Bright Pop Grand |
| Lead 8va | LEAD 8VA · Mega Saw Lead |
| Arp | ARP · Crystal Trigger |
| Choir | CHOIR · BEST Choir Aah |
| Counter | STABS · BEST PWM Brass |

The breakdown hook goes to a piano here too, on a PIANO lane, when the form has a breakdown.

**Chipstep** (Anthemic) — Bass Octave square (fixed) · Chords PWM, pumped.
Adds: the **sub is a wobble**, and the **Third Below** is on — the arcade chorus.

| Part | Strip |
| --- | --- |
| Bass | BASS Octave · Classic Square Synth |
| Sub | WOBBLE · WUB Classic 1/8 |
| Chords | CHORDS Pump · BEST PWM Pad Wide |
| Pad | PAD · BEST PWM Strings |
| Hook Double | HOOK DOUBLE · Plain Pulse Synth |
| Hook 8va | HOOK 8VA · Square Tone |
| Lead 8va | LEAD 8VA · BEST Screamer Lead |
| Arp | ARP · Square Tone |
| Choir | CHOIR · BEST PWM Choir |
| Third Below | THIRD BELOW · Arcade Chorus |

**Synthwave** (Anthemic) — Bass root–octave 16ths (fixed) · Chords as a string machine.
Adds: **brass stabs** (Counter on, its own stab rhythm).

| Part | Strip |
| --- | --- |
| Bass | BASS · Classic Mono |
| Sub | SUB · Sub Sine |
| Chords | CHORDS String Machine · BEST PWM Strings |
| Pad | PAD · Warm Strings |
| Hook Double | HOOK DOUBLE · Hero Lead |
| Hook 8va | HOOK 8VA · Ice Bell |
| Lead 8va | LEAD 8VA · PWM Hollow Lead |
| Arp | ARP · Crystal Trigger |
| Choir | CHOIR · Glass Choir |
| Counter | BRASS Stabs · BEST PWM Brass |

**Shibuya-Kei** (Lounge) — Bass Off-Beat (the bossa figure) · Chords as Piano Stabs (a nylon guitar).
Adds: a **flute** counter-melody (Counter on). It's a line in the hook's rests, so a busy hook
gets no flute. Drops: sub, Octave Hook.

| Part | Strip |
| --- | --- |
| Bass | BASS · Round Bass |
| Chords | GUITAR Bossa · Acoustic Guitar |
| Pad | ORGAN · Drawbar Organ |
| Hook Double | VIBES · Vibraphone |
| Hook 8va | CELESTA · Celesta |
| Lead 8va | TRUMPET 8VA · Muted Trumpet |
| Arp | HARPSICHORD · Harpsichord |
| Choir | CHOIR Ba-Ba · BEST Choir Aah |
| Counter | FLUTE · Concert Flute (only when the hook leaves rests) |

**Drum & Bass** (Moody) — Bass Reese · Chords Pad. Drops: supersaws, Octave Hook.

| Part | Strip |
| --- | --- |
| Bass | BASS Reese · Reese Bass |
| Sub | SUB · Sub Sine |
| Chords / Pad | PAD · Polar Drift |
| Hook Double | HOOK PLUCK · Wire Harp |
| Hook 8va | HOOK 8VA · Ice Bell |
| Lead 8va | LEAD 8VA · PWM Hollow Lead |
| Arp | ARP · Crystal Trigger |
| Choir | CHOIR · Glass Choir |

**Electro** (Dark) — Bass 808, riding the kick · Chords as Piano Stabs (orchestra stabs).
Drops: sub, supersaws, Octave Hook.

| Part | Strip |
| --- | --- |
| Bass | BASS 808 · Distorted 808 |
| Chords | STABS · Brass Stab |
| Pad | PAD · BEST PWM Strings |
| Hook Double | VOCODER · BEST Robot Vox |
| Hook 8va | HOOK 8VA · FM Bell |
| Lead 8va | LEAD FM 8VA · Hard FM |
| Arp | ARP · BEST S&H Pulse |
| Choir | CHOIR · BEST PWM Choir |

**16-Bit** (Heroic) — Bass Octaves · Chords as Piano Stabs (FM keys). Drops: sub, supersaws.

| Part | Strip |
| --- | --- |
| Bass | BASS FM Slap · DX Slap |
| Chords | FM KEYS · FM Keys |
| Pad | PAD · Synth Strings |
| Hook Double | LEAD FM · Megamix Lead |
| Hook 8va | FM BELL 8VA · FM Bell |
| Lead 8va | LEAD FM 8VA · Hard FM |
| Arp | FM ARP · FM Bell |
| Choir | CHOIR · BEST PWM Choir |

**Kraftwerk** still has a recipe (`styles/kraftwerk.js`) and a sounds entry, but it is not in
the style list (`styles/index.js`), so Make a Banger does not offer it. Its recipe adds parts no
other style has: SONAR, VOCODER, VOCODER WORD, RIM CLICKS, COUNTER ARP, VOCODER THIRD.

## What a mood changes

A mood never switches a part on or off. It does three things.

### 1. One mood adds a part: Hypnotic adds a Bass Echo

Hypnotic's sequencer bass brings a **BASS ECHO** lane on the bass's own sound. This happens in
every style whose bass can move: Big-Room, Trance, Future Bass, Shibuya-Kei, Drum & Bass,
Electro and 16-Bit. Eurobeat, Chipstep and Synthwave don't get it, because their bass is
fixed.

### 2. The mood picks the bass figure

Picking a mood moves the Bass switch to the mood's figure, unless that mood is the style's own
default or the style's bass is fixed (**Eurobeat, Chipstep and Synthwave** never move).

| Figure | Moods |
| --- | --- |
| Arpeggiated | Moody, Lament |
| Reese | Dark |
| Gallop | Heroic, Boss Fight |
| Walking | Nostalgic, Lo-Fi, Lounge, Boogie |
| Funk | Funky |
| Pedal | Gothic, Dreamy |
| Octaves | Disco |
| Root–Fifth | Sunshine Pop, Doo-Wop |
| Sequencer | Hypnotic (plus the Bass Echo) |

Anthemic, Uplifting, Euphoric, Bittersweet, Wonder, Hopeful and Andalusian keep the style's own
bass.

### 3. The original nine moods re-voice some parts

These sound swaps apply in **Big-Room, Trance, Future Bass, Eurobeat, Chipstep and Synthwave**.
Shibuya-Kei, Drum & Bass, Electro and 16-Bit have no mood sounds, so they always keep
their own. The newer shared moods (Bittersweet onward) swap no sounds.

A swap is heard only if the style plays that part. Counter is on only in Eurobeat and Synthwave,
Third Below only in Chipstep, and Piano only in Trance, Future Bass and Eurobeat. Elsewhere those
swaps do nothing unless you switch the part on.

| Mood | Swaps |
| --- | --- |
| Uplifting | Arp → Acoustic Guitar *(not Trance, where Uplifting is the default)* |
| Euphoric | Choir → Vocal Oh *(not Future Bass, where Euphoric is the default)* |
| Moody | Hook 8va → Vibraphone · Counter → Muted Trumpet |
| Dark | Bass → Distorted 808 · Impact → Metal Hit |
| Heroic | Bass → Tuba · Pad → Brass Section · Choir → Choir Aah · Counter → French Horn · Impact → Timpani |
| Nostalgic | Piano → Electric Piano · Pad → Warm Strings · Hook 8va → Vibraphone · Third → DX Bell Keys · Counter → Saxophone |
| Funky | Bass → Pulled Pop (slap) · Piano → Clavinet · Arp → Wah Guitar · Third → Horn Section Stab · Counter → Voice Box 70s |
| Gothic | Sub → Pedal Organ · Pad → Full Organ · Hook 8va → Tolling Bell · Arp → Harpsichord · Choir → Choir Aah · Impact → Timpani |

There are some exceptions.

- **Eurobeat** has no sub, so Gothic's Pedal Organ doesn't sound there. Eurobeat's Nostalgic
  also keeps its own Warm Strings pad.
- **Future Bass and Chipstep**: Gothic's Pedal Organ replaces the **wobble**.
- **Chipstep** is the only style where the Third Below swaps are heard by default: DX Bell Keys
  in Nostalgic, the horn stab in Funky.
- **Eurobeat and Synthwave** are the only styles where the Counter swaps are heard by default:
  their brass stabs become muted trumpet, French horn, sax or voice box.
