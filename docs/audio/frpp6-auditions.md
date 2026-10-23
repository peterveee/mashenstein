# FRPP-6 auditions (Gate A)

FRPP-6 is the waveguide string synth. Each lane has six string slots. A pluck goes into a
delay loop one period long, and the loop loses a little treble on every trip round. The
body is folded into the pluck rather than run on the output.

The renders below come from Stage 0: the DSP core running in Node. The engine is not in
the game or on the desk yet.

```
node tools/render-frpp6-auditions.js     # → work/auditions/frpp6/*.wav (about 3 s)
node tools/bench-frpp6.js                # → work/local/frpp6-bench.txt
node tests/frpp6-dsp.js                  # tuning, decay, determinism, levels
```

Each file is normalised to a −1 dBFS peak. Compare them for sound, not for level.
Chords are strummed through the game's own Note FX processor (`src/engine/note-fx.js`).
The candidate patches are in `tools/lib/frpp6-candidates.js`. Control names are the desk's
(23 Oct): HARD, WHERE, SCRAPE; RING, HIGHS; PICKUP, DOUBLE, BUZZ, METAL, BEND; MUTE, CHUCK,
FRET, SQUEAK, LIFT.

## Decisions for Gate A

Decided 23 Oct: the body is the folded-in method (01), and shimmer goes on alternative
"· Shimmer" presets rather than on by default. Still open: which candidates become presets.


1. **Which body method to keep** (decided: 01). Compare `01-steelAcoustic` with `36-steelLaneBody`.
   - **01** folds the body into the pluck: 21 modes, and no cost per sample.
   - **36** is the method in the original spec: three SVF modes running on the lane output
     every sample.
2. **Whether the acoustic presets keep a small SHIMMER** (decided: as alternative presets). Compare `01-steelAcoustic` with
   `37-steelCourse`. **37** adds a second string 4 cents away, which gives the slow shimmer
   and two-stage decay of a real string's second polarisation. That doubles the string's
   cost.
3. **Which candidates go on to become catalogue presets** in Stage 2.

## Stage 3: bowed and blown (Gate C)

Files 26–29 are the sustained exciter: BOW keeps driving the loop for as long as the key
is down, on the AMP envelope as the player's pressure. RELEASE lifts the bow. The bowed
presets use the per-sample body (VIOLIN and CELLO). Glide and vibrato are the standard
ones.

REED, SAX and JET (clarinet, saxophone, flute, pan pipes; files 30–33) were built and
auditioned, then dropped on 23 Oct 2026: wind sounds other engines already do as well,
for a board that had stopped looking like a string's. The bow stays because it is a
string, and because a bowed section costs a tenth of MRDR-3's. Brass (LIP) was not
attempted.

## The files

| File | What it is | Exercises |
| --- | --- | --- |
| 01-steelAcoustic | Steel-string dreadnought, picked, G–C–D–Em strum | the default patch |
| 02-nylon | Classical, fingertip, arpeggios | soft HARD, NYLON body |
| 03-palmMuted | Electric power chords, palm-muted | MUTE, PICKUP |
| 04-cleanElectric | Clean electric strum, no body | PICKUP between the pickups |
| 05-banjo | Forward roll | BANJO body, a little BUZZ |
| 06-harp | Harp arpeggios, ringing past note-off | FREE tuning, long RELEASE |
| 07-koto | Pentatonic melody | heavy BEND (the pitch drops as the note fades), a hard pluck near the bridge |
| 08-dulcimer | Hammered dulcimer | STRIKE, DOUBLE: SHIMMER, METAL |
| 09-synthBass | Plucked synth bass | FILTER and FILTER ENV, KEY FOLLOW |
| 10-kalimba | Thumb piano | STRIKE, very high METAL (stretched partials) |
| 11-filterSlam | Filter-slam synth pluck | NOISE, FILTER ENV |
| 12-acidPluck | Resonant acid pluck | FILTER at RES 9 |
| 13-swelledString | Swelled string pad with vibrato | AMP attack, long NOISE burst, vibrato |
| 14-sitar | Sitar line with slides | BUZZ 0.7, LEGATO with GLIDE |
| 15-tanpura | Tanpura drone (Pa–Sa–Sa–Sa) | BUZZ 0.8, long decay |
| 16-twelveString | 12-string strum | DOUBLE: 12-STRING, the octave strings |
| 17-mandolin | Mandolin tremolo | DOUBLE: SHIMMER, 5 cents apart |
| 18-electricNeck / 19-electricBridge | The same lick on each pickup | PICKUP |
| 20-bassNeck / 21-bassBridge | The same bass line on each pickup | PICKUP on a stiff wound string |
| 22-funkRhythm | Chucking rhythm guitar: an original pattern in the Chic manner, not the record | CHUCK (the chucks), short RELEASE chops, LIFT, FRET, SQUEAK, alternate strumming |
| 23-funkBright | The funk part, brighter: bridge pickup, hardest pick, highs ringing on | PICKUP: BRIDGE, HIGHS up |
| 24-funkMuted | The funk part, palm-muted throughout: short, thick accents | MUTE 0.6, PICKUP: NECK + MIDDLE |
| 25-slideGuitar | Slide guitar | LEGATO with GLIDE, delayed vibrato |
| 26-violin | Bowed violin, legato line | BOW, PRESSURE, SPEED, the VIOLIN body, vibrato, GLIDE |
| 27-cello | Bowed cello, legato line | BOW on a long string, the CELLO body |
| 28-erhu | Erhu, with long slides | BOW with wide vibrato and GLIDE |
| 29-stringSection | Held chords, slow bows | BOW across six slots, STEREO, slow AMP attack |
| 34-fretlessBass | Fretless bass | a pluck with LEGATO and GLIDE |
| 35-funkNoHand | A/B for 22, with FRET and SQUEAK off | the hand noises |
| 36-steelLaneBody | A/B for 01, using the per-sample 3-mode body | decision 1 |
| 37-steelCourse | A/B for 01, with DOUBLE: SHIMMER (4 cents) | decision 2 |
| 38-mrdr3-acoustic-guitar | The same strum on MRDR-3's `mrdrAcousticGuitar` | the patch FRPP-6 is replacing |

## Cost

These are Node figures for the JS cores, measured on 23 Oct with the same notes through
each engine. Units are ms of render per audio second; 10 ms/s is about 1% of one core.

| Case | FRPP-6 | MRDR-3 `mrdrAcousticGuitar` | Ratio |
| --- | --- | --- | --- |
| Strum, 1 string | 1.4 | 13.5 | 0.10× |
| Strum, 6 strings | 6.3 | 45.3 | 0.14× |
| Held 6-string chord | 1.6 | 20.2 | 0.08× |
| Funk 16ths, 4 strings | 4.0 | 80.2 | 0.05× |
| 12-string (DOUBLE on) | 10.2 | 45.7 | 0.22× |
| With vibrato (moving read) | 7.7 | 45.7 | 0.17× |
| With FILTER on every string | 7.5 | 45.9 | 0.16× |

The control row, the same FRPP-6 case run against itself, reads 1.00×.

These numbers do not show live load. Gate B measures that in WebKit and Chrome once the
worklet exists.
