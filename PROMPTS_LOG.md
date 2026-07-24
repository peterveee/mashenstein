# Prompt & Instruction Log

Detailed record of all instructions and prompts given to Claude for MASHENSTEIN game development.

---

## 2026-07-23

### Prompt 1 (Session Start)
**Time:** ~14:30  
**User Request:** "Can you compile a list of all commands i have given you for this game into a file. Numbered and dated if possible"

**What I Did:** 
- Searched for existing task/note files
- Extracted all git commits with dates
- Created COMMANDS_HISTORY.md with 50 numbered, dated entries from git log

**Result:** COMMANDS_HISTORY.md created

---

### Prompt 2
**Time:** ~14:35  
**User Request:** "you can't find individual prompts in your history?"

**Context:** User questioned whether I could retrieve earlier conversation prompts from my context.

**Clarification Provided:** Explained that I can only see current session context, not previous sessions or compressed context. Git history was the only durable record available.

---

### Prompt 3
**Time:** ~14:37  
**User Request:** "Yes please" (to maintaining a detailed prompt log going forward)

**What I'm Doing Now:**
- Creating this PROMPTS_LOG.md file
- Saving a memory note that user wants detailed prompt tracking
- Will append all future instructions to this log

---

## 2026-07-24

### Prompt 1
**User Request:** "lets fix up some of the sounds effects - familiarise your self with what we have"

**What I Did:** Surveyed the audio system — `AudioSys` in [src/engine/audio.js](src/engine/audio.js) (procedural SFX switch + music step-sequencer), the ~45 SFX cues, `SFX_TRIM`/`WEAPON_AUDIO_GAIN` loudness tables, the weapon-candidate WAVs, and the new untracked [tools/render-sfx.js](tools/render-sfx.js) + `audio/sfx-renders/`. Reported the inventory and asked which cues to work on.

---

### Prompt 2
**User Request:** "can the sound be more metallic?"

**What I Did:** Confirmed the target was the new `cash` cue. Rebuilt it from a clean harmonic chime into two struck bells on inharmonic ideal-free-bar partials (1 : 2.76 : 5.40 : 8.93) with a bright noise hammer tick per strike, added a `cash: 0.7` `SFX_TRIM` entry, mirrored the change in [tools/render-sfx.js](tools/render-sfx.js), and re-rendered the WAVs.

---

### Prompt 3
**User Request:** "when we work on a sound effect can we always rerender it as a wave file?"

**What I Did:** Agreed; saved a `feedback` memory (rerender-sfx-wav) to always re-render an edited cue to a WAV (keeping render-sfx.js in sync) so it can be auditioned.

---

### Prompt 4
**User Request:** "can we space out doloros and garys benches more"

**What I Did:** In `src/game/hub/index.js` stations(), widened the Dolores→Gary pitch from 140 to 180, opening the floor between the repair counter and the pawn shop (62 units of clear floor between the two 118-wide counters instead of 22).

---

### Prompt 5
**User Request:** "alignment is out of wack... sold out is outside the boundaries, the coins are indented too far left. The text at the bottom could move up... vertical spacing could be tidied up overall" (Dolores' Repair Counter / BenchState)

**What I Did:** In `src/game/hub/index.js` BenchState.draw(), right-aligned both the SOLD OUT tag and the price to a shared anchor inside the selection box (was overflowing at `W-12`; price was left-anchored at a fixed `W-100`). Tidied vertical spacing: extended the list (listBottom 190→200) and pulled the CURRENT/NEXT gloss up under it (H-56/H-41 → H-58/H-44). Verified in a browser screenshot.

---

### Prompt 6
**User Request:** "could we indent the menu items dramatically so that dolores can appear standing on the right in her idle pose?"

**What I Did:** In BenchState, pulled the whole list into the left column (right-align anchor at x=322, selection box 26→336, glosses centred on x=180) and drew an idle `drawToon('dolores', {kind:'idle', facing:-1})` standing on the right (cx 410, h 138) with a contact shadow. Added `this.t` idle-animation time to the constructor/enter/update. Long sold-out NOTICE gloss now wraps to 2 lines so it stays clear of her. Verified with screenshots.

---

### Prompt 7
**User Request:** "can we show the required space for the speech bubble, not default to 2 lines always. Also check that all possible text can fit within 2 lines if not, list them"

**What I Did:** Made the bench notice plate height track its wrapped line count (was fixed at 44px ≈ 2 lines), centring the face + text; a 1-line receipt is now snug, a 3-line spiel gets the room. Audited all 46 possible notice strings against the 300px bubble width using the game's real Fredoka metrics in a browser: 16 fit 1 line, 27 fit 2, and **3 need 3 lines** — all the "PAYMENT SATISFIED. PLEASE VACATE THE COUNTER AREA." success gag paired with any surcharge suffix. Those now render fully at 3 lines.

---

### Prompt 8
**User Request:** "can we make her look annoyed when you try to purchase a sold out item?"

**What I Did:** Added an `annoyed` expression to the shared toon rig (`src/sprites/toons.js`), strictly gated so only Dolores can reach it: furrowed brows, narrowed glaring eyes, downturned frown; it suppresses her idle call and blink so the glare holds. BenchState sets a 1.4s `annoyedT` timer on a SOLD OUT buy attempt and passes `annoyed` into her pose. Verified with close-up screenshots.

---

### Prompt 9
**User Request:** "lets add a few mad poses that appear at random" / "when we attempt to buy sold out"

**What I Did:** Expanded the annoyed face into 4 random `madStyle` variants — 0 stern glare (furrow + frown), 1 unimpressed (one brow up + flat line), 2 eye-roll (pupils rolled up + raised brows), 3 fed-up (steep furrow + gritted teeth). BenchState rolls `Math.floor(Math.random()*4)` on each sold-out jab. Screenshotted all four.

---

### Prompt 10
**User Request:** "can we expand her idle to have more variety?"

**What I Did:** Gave Dolores a rotating idle-beat scheduler in `expressionFor` (id-gated): her existing NEXT-call plus a glance down the empty line, a look at the counter, and a brow-raise-at-nothing, one per slot on a 4.4s cycle with plain-rest windows between; eye glances ease in/out. No other hero touched. Verified each beat.

---

### Prompt 11
**User Request:** "lets have doloros walk in from the right when it starts up"

**What I Did:** BenchState now runs an 0.8s entrance on open — she starts off-screen right, runs in (legs cycling, facing the menu) with an ease-out-cubic deceleration, then settles into her idle. Added an `enterT` clock; the contact shadow tracks her x and tightens while walking. Verified across the walk with screenshots.

---

### Prompt 12
**User Request:** "can you play back her entrance for me?"

**What I Did:** Captured the real entrance frame-by-frame in a headless browser, encoded a looping GIF with ffmpeg, and published an on-brand playback page (dark counter palette, Replay control) as an artifact so the entrance can actually be watched and replayed.

---

### Prompt 13
**User Request:** "FOR HER ENTRANCE I ACTUALLY WANT her to walk in from off screen to her final position" → then "slower" → "even slower"

**What I Did:** Fixed the entrance so she starts fully off-screen (startX = W+120, past the right edge) and strides the whole way to her spot, and slowed it in two steps to `ENTER_DUR = 3.0s` with a matching slower stride cadence (0.85×) so she walks rather than moon-walks. Drove it live in a headed Playwright browser (via the MCP) and looped the replay for viewing instead of regenerating a GIF.

---

### Prompt 14
**User Request:** "maybe dont just have eyebrows appear out of nowhere in the idle poses it looks odd"

**What I Did:** The idle brow beats (the NEXT-call and the brow-raise) were hard-cutting the hairline on/off. Added a `browEase` ramp (0→1→0 over ~0.22s) carried on the brow ink's alpha, so the brows lift in and settle out instead of snapping. Only the idle beats fade; the annoyed/focus brows are unchanged.

---

### Prompt 15
**User Request:** "what if her idle pose here had her hands on her hips" → then "should the hands be in front maybe?"

**What I Did:** Explored two gated arm poses on the shared rig — `handsOnHips` (akimbo; hands hid behind the apron, read weakly) and `handsInFront` (clasped over the apron via a `handsFront` front-pass layering path). The front clasp made the forearm loop out to the elbow and back across the bib, so it read as detached from the shoulder. Reverted the bench idle to her default arms-at-sides, which sits correctly against the apron. The `handsOnHips`/`handsInFront`/`handsFront` branches remain in the rig (gated, unused) pending a decision on whether to pursue a posed idle (e.g. hands-behind-back) or drop them.

---

### Prompt 13
**User Request:** A run of audio-architecture questions — "are we only doing retro pixel sounds?", "is one giant HTML file better than a folder?", "what are we archiving for releases?", "wait so we ARE using wav files?" — landing on: "i want all of [the weapon cues] to be procedurally played right now" (chose the render-to-buffer approach for best performance).

**What I Did:** Converted the 9 hero weapon cues (6 contact + 3 launch) from shipped `.wav` assets to procedural synthesis. Extracted the synth primitives + all 30 recipes into a shared pure-ESM module `src/engine/weapon-sfx.js` (single source of truth); refactored `tools/generate-weapon-sfx.js` to render the audition WAVs from it (verified **byte-identical** output); made `audio.js` synthesise the 9 wired cues into buffers at init (`renderWeaponBuffers`) instead of fetching/decoding; dropped the WAV copy from `build/build.js` and updated `tests/build-shell.js` to assert no audio assets ship. Verified in a real browser: 9 buffers render in the AudioContext, **0** `.wav` fetches, **0** decodes, no console errors. All 1012 test assertions pass. Production `game.js` is 511 KB (176 KB gzip). Also clarified for the user that the "3.7 MB bundle" was a dev build (2.9 MB inline sourcemap); production strips it.

---

### Prompt 16
**User Request:** "i still want her to move to hands on hips if possible... can we go from hands at sides to hands on hips periodically" → "She has arms behind her back not on her hips" → "i want her to do hands on hips NOT behind back and it should be every 15-20 seconds not every 9"

**What I Did:** Made hands-on-hips a periodic animated idle beat — a `hipsAmt` (0→1) blend in the standing arm branch that lerps the resting hands to the hip target and back, elbows staying outward so nothing flips mid-move. First cut parked the hands inboard (behind the apron) so it read as behind-the-back; pushing the hand target OUT to the hip point (`torsoHalf * 1.02`, at the body's side edge where it clears the apron) with the elbows winged wide fixed the read. BenchState drives it on a **17s** cycle (0.6s raise, 3.0s hold, 0.7s lower, smoothstepped), offset past the walk-in. Removed the rejected front-clasp/`handsFront` layering. Verified up/mid frames and live. (A spurious `dist/audio` build-shell failure was just the dev watch server writing WAVs into dist — clean build passes.)

---

### Prompt 17
**User Request:** A run refining the hands-on-hips: "elbows too high, should be like a caret" → "doesn't quite read as hands on hips" → "whats with the stitched up mouth expression? Get rid of it" → "she should put her hands on hips if you try to buy a sold out item" → layout: "center the coin count under dolores", "align the keyboard instructions with the menu text and fade it out after dolores arrives" → "the arms are in front of the bib... is the problem that the bib doesn't go over her shoulders?" → "yes i think we need to give her proper shoulder straps".

**What I Did:** Lowered the hip target so the elbows bend to a caret apex at the waist. Made the hands actually read on the hips by drawing the arm in the front pass during the beat only (`armsInFront` gated on `hipsAmt > 0.02`, so at rest the arms sit behind the bib). Added a SOLD-OUT reaction: `reactHips` snaps her hands to her hips for `BENCH_REACT_DUR` (1.8s) alongside the glare, `Math.max`'d with the periodic beat. Dropped mad style 3 (the gritted "stitched" mouth) — now 3 mad faces. Layout: centred the coin count under Dolores, aligned the control legend under the menu labels (`drawMenuHint` got an `x0` arg) and faded it out after she arrives. Root fix for the floating-bib read: replaced the single neck strap with **two pinafore shoulder straps** (`limb()` bands from the bib's top corners up over the shoulders) so the bib hangs from the shoulders — only Dolores has `apron`, so nothing else is touched. All suites pass; verified live.

---

### Prompt 18
**User Request:** "shoulder straps extend past shoulders they should be incorporated into the model and update the gallery"

**What I Did:** Iterated the pinafore straps — first as `limb()` capsule bands (floated as nubs past the shoulders / near the neck), then, on the note "was thinking like Lorenzo's suspenders", rebuilt them the way Lorenzo's braces are drawn: **strokes clipped to the torso path** (`torsoPath` clip), running from the bib's top corners up over the shoulders and stopping at the shoulder line because the clip cuts them there. That's what makes them read as integrated suspenders instead of bands sitting on top. Regenerated + archived the gallery (`npm run gallery` + `npm run archive:gallery`); HEAD had moved to `6ffd677`, so removed the superseded `af0bdc7` snapshot and re-indexed → one 2026-07-24 snapshot (30 total). Snapshots are still keyed to a HEAD that doesn't contain the (uncommitted) strap art, so an accurate archive wants the art committed first.

---

### Prompt 19
**User Request:** A run polishing Dolores' apron + celebrate: "don't love Dolores' celebrate with hands in front of the apron, do something different" (→ chose hands-on-hips) · "could her arms be out front for the idle in general, better for transitioning to hands on hips" · "outline the straps so they seem like a continuous bit of the bib" · "what's the little thing poking out from under the bib? lose it if not necessary" · "should we put a name tag on her on the bib" · "straps don't run all the way to the bib — if they did it'd look great".

**What I Did:** (1) **Celebrate** → hands-on-hips: new `hips` celebrate move (`CELEBRATE_MOVE.dolores`), a proud two-bob `celebrateMotion` case, both hands planted on the hips through the beat, kept in the `clapFront` both-arms-front path with the strap-over-arm re-stroke; verified via a standalone `drawToon` harness (hands on hips + joy grin). (2) **Idle arms always front-pass** (`armsInFront: true`) so there's no back→front layer swap into the hips beat. (3) **Straps**: outlined (dark edge under the apron-fill stroke, clipped to the torso) so they read continuous with the bib, and extended down PAST the bib top so they overlap and join it (was leaving a body-sliver gap). (4) Removed the **chest name tag** (the sliver poking out under the bib) and added a proper **name badge on the bib** (pale plate, teal header strip, scribbled name). Kept the apron pocket. All suites pass; gallery rebuilt + re-archived (`galleries/2026-07-24-6ffd677.html`).

---

### Prompt 20
**User Request:** "the outlines are all translucent so overlaps double up darker — could we make them opaque and a lighter colour, only Dolores for now" + "the inner lines closer to her face shouldn't extend quite so far down".

**What I Did:** (1) Root cause of the worst dark seams was self-inflicted — with the idle arms now always front-pass, `apronStrapOver` was re-drawing the WHOLE strap every frame, stacking a second translucent outline; fixed it to draw the straps ONCE (deferred past the arm only when an arm actually crosses them). (2) Gave **Dolores alone** an opaque, lighter outline (`DOLORES_OUTLINE = rgb(120,110,132)`) — swapped into the module `OUTLINE`/`SKIN_OUTLINE` around her `drawToon` and restored right after, so no other character changes. Opaque edges don't compound where straps/bib/arms overlap. (3) Raised the hair-set's low corner (`hy+0.18R → hy-0.12R`) so the grey hair stops at cheek level instead of sweeping down to her jaw on one side. All suites pass; gallery rebuilt + re-archived (`galleries/2026-07-24-68c49f2.html`).
---

### Prompt 21
**User Request:** A polish run on the apron/strap rendering, then "can we do a bake off in the gallery where we make dolores' body fatter and rounder?" → "i like the rounder body, we should go with that, but the bib isn't sitting nicely at the shoulders" → "the arm is clipping through the strap on the other edges".

**What I Did:**
- **Fabric shade / outline.** Root cause: the bib is an `outlined()` FILL while the straps were STROKES, and a stroke picked up a flatter shade. Made each strap its own `outlined()` fill so the cream matches and the contour runs unbroken around the band. Kept bib and straps as SEPARATE shapes — as the user pointed out, that separation is exactly what lets an arm slot in front of the bib but behind the strap. Band clipped just past the bib line (no ink running down inside the bib) and to the torso (shoulder silhouette cuts it, so it reads as passing over the shoulder).
- **Arm clipping through the strap.** The band sat at `torsoHalf*0.6`, outside the torso's flat shoulder span (the path rounds its corners from ~0.62 of the half-width), so the clip ate the strap's outer-top corner. Moved it inboard to `0.46`.
- **Girth bake-off → shipped.** Added a gallery-only `dolores-girth` bake-off in the lab cluster using a `withSpec` patch. User picked the rounder candidate, so `torsoWidth: 1.16, waistScale: 1.14` now ship in her spec; the section was rewritten as the record of the call (previous proportions + the next degree up, not taken).
- **Test guard narrowed, not deleted.** `character-rendering.js` asserted no production spec may carry gallery body dials. Shipping the girth is a deliberate exception, so the guard now allows Dolores' two dials *by name* and stays strict for every other hero — an unresolved candidate still can't silently become production.

---

## How This Works Going Forward

After each task or instruction:
1. I'll log the prompt with timestamp, context, and what was done
2. I'll append new entries to the bottom of this file
3. Organized by date with a new section for each day
4. This creates a complete record of your instructions across sessions

