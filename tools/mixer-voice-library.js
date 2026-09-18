// The preset library, as a place rather than as a choice made for a channel.
//
// Every other way into the voice editor goes through a STRIP: the ✎ on the header, the
// ✎ on the voice row, the two items on the right-click menu. That is the right way in
// while you are mixing, because the question there is what this channel should sound
// like, and the answer is heard in the mix it has to sit in.
//
// It is the wrong way in while you are working on the library itself, which is a
// different job. A preset belongs to no song — that is the whole distinction between a
// library preset and a song's own copy — so reaching one meant finding a song that
// happened to play it and borrowing its strip, and a preset nothing plays yet could not
// be reached at all. Renaming a sound meant loading a song you did not want in order to
// touch a preset that was not its.
//
// So: the catalogue with no song in front of it. Pick any preset, hear it on a bench,
// edit it with the same editor, file it with the same Save.

import { VOICES, VOICE_CATEGORIES, PERCUSSION_LANES, isKitVoice, seamFor } from '../src/data/voices.js';
import { isVoiceUsed } from '../src/data/voices-used.js';

/**
 * The mark on a button that folds a panel away.
 *
 * A DOUBLE chevron, drawn rather than typed. `›` and `⌄` are typographic characters:
 * they inherit the font's weight and its idea of a corner, which at 15px in a mono face
 * is a thin, soft, apologetic thing that reads as decoration. Two hard mitred angles at
 * 2.4px read as a control, and the doubling is what says COLLAPSE rather than "next" —
 * one chevron is a stepper, two is a panel going away.
 *
 * `dir` is where the panel goes, and the arrow points that way: the editor folds right
 * into its rail, the keyboard folds down into its own. Rotation rather than a second
 * path, so the two are provably the same shape.
 */
export function foldIcon(dir = 'right') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('class', `foldicon fold-${dir}`);
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ['M3.5 3 L8.5 8 L3.5 13', 'M9.5 3 L14.5 8 L9.5 13']) {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    svg.append(p);
  }
  return svg;
}

// ---- the bench ---------------------------------------------------------------
//
// What a library preset is heard through, since it has no channel of its own.
//
// The engine already has this path and takes it every day: `scheduleStep` reads
// `this.mixer && this.mixer.lane(key)` and falls back to the shared music bus when
// there is no mixer, which is how the headless tests and the offline renderer play.
// Borrowing that fallback for the length of one synchronous call is the whole of the
// bench. No EQ, no inserts, no sends, no fader, and nothing for mute or solo to
// silence — so there is no state anywhere on the desk that can make a preset audition
// as something it is not.
//
// Deliberately not an engine change. `previewNote` already saves and restores every
// piece of sequencer state it borrows, and `mixer` is read in exactly one place inside
// the call it makes, so the desk can borrow it the same way and src/engine/ stays a
// thing the game owns rather than a thing the tools have opinions about.

/**
 * The lane a preset is auditioned on.
 *
 * Pitched presets go through `bass`, and that is not an arbitrary pick: it is the lane
 * a melodic preset's level is measured on — see homeLane in tools/lib/measure-voice.js
 * — and a preset's gain on every lane in the game is derived from that level.
 * Auditioning on the lane the measurement was taken on is the one place where what you
 * hear and what the number claims are the same statement.
 *
 * A drum preset goes on its measured `homeLane`. A percussion lane is the only kind
 * that carries `noteKey`
 * — the pitch a drum is struck at. A kick preset on a melodic lane has no note to be
 * struck at and simply does not sound.
 *
 * `rim` is never a destination. It is the one kit lane that always taps the echo bus
 * rather than opting in — see ECHO_OPT_IN in src/engine/lanes.js — so a rim bench would
 * arrive wearing whatever delay the loaded song is set to. Every lane named here is
 * echo-opt-in and `benchBank` opts none of them in, which is what keeps the bench dry
 * without having to reach into the echo at all.
 */
const BENCH_LANES = {
  Kick: 'kick', Snare: 'snare', Hats: 'hats', Clap: 'clap', Tom: 'tom', Crash: 'crash', Perc: 'hats',
};
export const benchLane = (voice) => {
  // Drum entries carry their measured home lane, while pitched entries fall through
  // to the bass bench. Rim remains on the dry hats bench because the rim lane is
  // permanently echo-connected.
  const home = voice?.homeLane;
  const lane = !isKitVoice(voice) && PERCUSSION_LANES.includes(home)
    ? 'bass'
    : home || BENCH_LANES[voice?.category] || 'bass';
  return lane === 'rim' ? 'hats' : lane;
};
export const benchIsKit = (voice) => isKitVoice(voice);

/** A2 — the note tools/mixer.js measures a preset at, so the bench opens where it did. */
export const BENCH_NOTE = 110;

/** The note a preset is struck at with nothing pressed: its lane's own, or A2. */
export function benchRoot(voice) {
  if (!voice) return BENCH_NOTE;
  // A drum is struck at its lane's note, so the answer to "what does this kick sound
  // like" is the kick rather than a kick transposed to sit under a piano's A.
  return benchIsKit(voice) ? (seamFor(benchLane(voice)).note || BENCH_NOTE) : BENCH_NOTE;
}

/**
 * A bank with nothing in it but this preset on its bench lane.
 *
 * `soloBank` nulls every lane and writes the one note, so what this has to carry is
 * only what makes that note the right note: the tempo, because a preset's `dur` is in
 * STEPS and would otherwise last whatever length the last song implied, and the voice
 * key that opts the lane into playing a preset at all.
 *
 * No gain key. tools/mixer.js sets `bassGain: 1` when it measures, because a
 * measurement wants the synth at unity; an audition wants `voiceGain`, which is the
 * level the preset will actually play at. That is also what makes two presets
 * comparable here — both arrive scaled to the same lane target, so the one that sounds
 * louder is the one that is louder.
 */
export function benchBank(id, bpm) {
  return { bpm: bpm || 120, [seamFor(benchLane(VOICES[id])).voiceKey]: id };
}

// ---- when a bench note is allowed to sound ----------------------------------
//
// One authority, because the bench has three mouths and one throat.
//
// A preset's voices are POOLED per `lane|voiceId|echo` — see VoiceRack._pool — and for
// a single note that pool is two slots deep. Everything that sounds the bench shares
// it: the pattern player, the keyboard's keys, and the `hit` button. Tone requires each
// slot's times to be non-decreasing, so a note scheduled BEHIND one already queued on
// that slot is a thrown assert rather than a note.
//
// Which is exactly what a pattern invites. It schedules ahead — that is what makes it
// steady — so while it runs there are notes queued into the future, and a key pressed
// meanwhile asks for now-plus-twenty-milliseconds, which is behind them. Two slots is
// not enough to dodge that, and no pool size would be: the collision is about TIME, not
// about how many voices are free.
//
// So the rule lives here, in the one function all three go through, rather than in any
// of them. Ask for a time; get that time or the earliest one still legal, whichever is
// later. When nothing is queued — the ordinary case, no pattern running — the mark is
// already in the past and a note goes exactly when it was asked for, with no latency
// added to playing the keys.
const MIN_GAP = 0.001;
let benchLastAt = 0;    // ctx time of the newest note the bench has scheduled
let benchLastId = null; // ...for which preset, since a different preset is a different pool

/**
 * Sound one note of a preset on the bench.
 *
 * The mixer goes back in a `finally` for the same reason `previewNote` restores the
 * bank in one. The swap is synchronous and JavaScript is single-threaded, so nothing
 * can observe the desk without its strips — but a throw inside `scheduleStep` that left
 * `mixer` null would silently take every channel strip out of the song itself, which is
 * the kind of failure you would chase for an hour before suspecting the keyboard.
 */
export function benchPlay(Audio, id, freq, { at = 0.02, bpm = 120 } = {}) {
  const voice = VOICES[id];
  if (!Audio?.ctx || !voice) return false;
  const lane = benchLane(voice);
  // `|| 0` rather than a bare read: a context without a clock yields undefined, and
  // undefined + 0.02 is NaN — which would not throw, it would be stored as the mark and
  // silently poison every note after it. A total function beats a debuggable one.
  const now = Audio.ctx.currentTime || 0;
  // A different preset is a different pool with its own slots and its own timeline, so
  // it inherits no constraint from the one before it — and must not inherit the
  // latency either: switching preset mid-pattern would otherwise hold the new sound
  // back to just after the old one's last queued note.
  if (id !== benchLastId) { benchLastId = id; benchLastAt = 0; }
  const t = Math.max(now + at, benchLastAt + MIN_GAP);
  benchLastAt = t;
  const was = Audio.mixer;
  Audio.mixer = null;
  try {
    return Audio.previewNote(lane, freq, { bank: benchBank(id, bpm), at: t - now });
  } finally {
    Audio.mixer = was;
  }
}

/**
 * Forget what the bench has queued.
 *
 * For stopping: the notes already scheduled still sound, but nothing NEW has to queue
 * behind them once the pattern that put them there has gone — otherwise the first key
 * you press after hitting stop is held back by the tail of a figure you just stopped.
 */
export function benchReset() { benchLastAt = 0; benchLastId = null; }

// ---- scales -------------------------------------------------------------------
//
// A key to play in, for the keyboard and for the figures alike.
//
// The keyboard is chromatic and always will be — the keys are where they are on a
// piano, and moving them would make it a different instrument. A scale here is a
// FILTER on that, not a re-lettering: it says which of those keys belong, the ones that
// do not are dimmed, and the patterns land on the ones that do.
//
// Which is what makes it worth having on a preset bench at all. A pad auditioned on a
// major triad tells you what it sounds like in major; the same pad under a minor
// arpeggio is a different question, and before this the only way to ask it was to play
// the notes by hand while not touching anything else.

export const SCALES = [
  // `steps` null means every note belongs — the same behaviour as before any of this,
  // and the reason chromatic leads: it is the state you are in until you choose.
  { id: 'chromatic', label: 'Chromatic', steps: null },
  { id: 'major', label: 'Major', steps: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', label: 'Minor', steps: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'majorPent', label: 'Major pentatonic', steps: [0, 2, 4, 7, 9] },
  { id: 'minorPent', label: 'Minor pentatonic', steps: [0, 3, 5, 7, 10] },
];

export const SCALE_BY_ID = Object.fromEntries(SCALES.map((s) => [s.id, s]));
export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Does this note belong to the scale? Semitones absolute; `root` is a pitch class. */
export function inScale(midi, root, steps) {
  if (!steps) return true;
  return steps.includes((((midi - root) % 12) + 12) % 12);
}

/**
 * Move a semitone offset onto the nearest note of the scale.
 *
 * The figures are written in semitones from their root — a major triad is 0, 4, 7 — and
 * quantising rather than re-deriving them is what lets one set of cells serve every
 * scale: 0/4/7 in minor comes out 0/3/7, which is the minor triad, and `octaves` and
 * `fifths` are unmoved because 12 and 7 are in every scale here. So the cell keeps
 * meaning the shape it was written as, and the scale decides how that shape is spelled.
 *
 * Ties go DOWN. A pentatonic has a three-semitone gap, so a note landing in the middle
 * of one has two equally near answers; picking consistently is what stops the same
 * figure spelling itself differently on repeats.
 */
export function snapToScale(semi, steps) {
  if (!steps) return semi;
  const oct = Math.floor(semi / 12);
  const pc = semi - oct * 12;
  let best = steps[0];
  let bestDist = Infinity;
  for (const s of steps) {
    const d = Math.abs(s - pc);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  // The octave above's root can be nearer than anything in the list — a pc of 11 in a
  // pentatonic whose top note is 10 is one semitone from 12, two from 10.
  if (12 - pc < bestDist) return (oct + 1) * 12;
  return oct * 12 + best;
}

// ---- patterns ----------------------------------------------------------------
//
// A preset auditioned one key at a time is a preset you cannot hear while you are
// changing it: dialling a filter with one hand and holding a note with the other means
// letting go of one of them to find out what the other did.
//
// A pattern is a CELL — a short list of steps, each either a rest or the semitones to
// sound — read at a chosen rate. That factoring is what keeps the list short enough to
// read: `repeat` at a quarter is four-to-the-floor and at a sixteenth is a hat pattern;
// `off-beat` at a quarter is a backbeat and at an eighth is off-beat hats. Eight cells
// and five rates cover every figure worth auditioning against, where writing each of
// those out under its own name would be forty entries saying eight things.
//
// The pitched cells are as useful on a drum as on a synth — a tuned tom in octaves is
// exactly how you find out whether its pitch envelope holds up — so nothing is hidden
// by kind.

// A whole bar down to a sixteenth. The slow end is what the progressions are for: a
// chord that changes four times a bar is not a progression, it is a strum, and you
// cannot hear a pad's attack at all until the chord is given a bar to land in.
export const PATTERN_RATES = [
  { id: '1', label: '1/1', steps: 16 },
  { id: '2', label: '1/2', steps: 8 },
  { id: '4', label: '1/4', steps: 4 },
  { id: '8', label: '1/8', steps: 2 },
  { id: '16', label: '1/16', steps: 1 },
];

// A major triad on a scale degree, as semitones from the root. Written as a helper
// rather than typed out three times: a progression is degrees, and the arithmetic
// between a degree and the three notes that sound is not the interesting part.
const triad = (degree) => [degree, degree + 4, degree + 7];

export const PATTERNS = [
  { id: 'repeat', label: 'Repeat', cell: [[0]], title: 'The same note over and over — four to the floor at 1/4, a hat pattern at 1/16' },
  { id: 'offbeat', label: 'Off-beat', cell: [null, [0]], title: 'Every other step — a backbeat at 1/4, off-beat hats at 1/8' },
  { id: 'octaves', label: 'Octaves', cell: [[0], [12]], title: 'The note and the octave above it, alternating' },
  { id: 'fifths', label: 'Fifths', cell: [[0], [7]], title: 'The note and the fifth above it, alternating' },
  { id: 'arp', label: 'Arpeggio', cell: [
    // major, up 2 octaves and back down
    [0], [4], [7], [12], [16], [19], [24], [19], [16], [12], [7], [4],
    // minor, up 2 octaves and back down
    [0], [3], [7], [12], [15], [19], [24], [19], [15], [12], [7], [3],
    // dominant 7th, up 2 octaves and back down
    [0], [4], [7], [10], [12], [16], [19], [22], [24], [22], [19], [16], [12], [10], [7], [4],
    // major 7th, up 2 octaves and back down
    [0], [4], [7], [11], [12], [16], [19], [23], [24], [23], [19], [16], [12], [11], [7], [4],
  ], title: 'Major, minor, 7th and Maj7 arpeggios — up two octaves and back down' },
  { id: 'chord', label: 'Chord', cell: [[0, 4, 7]], title: 'A major triad, struck together' },
  // ---- progressions
  //
  // A preset that sounds right on one chord can still be wrong on three: a filter that
  // is sweet on the tonic honks on the fourth, a release that is tight on one root
  // smears the moment the harmony moves under it. One chord cannot tell you that.
  //
  // `slow` says a progression wants a bar per chord — see setPattern. Triads are all
  // major; the scale quantiser spells them into the chosen key. Repeated entries hold
  // the chord for that many bars, so a progression can breathe rather than ticking
  // through one chord per bar.
  {
    id: 'I-IV-V-IV',
    label: 'I – IV – V – IV',
    slow: true,
    cell: [triad(0), triad(0), triad(5), triad(5), triad(7), triad(7), triad(5), triad(5)],
    title: 'The four-chord rock staple, two bars each — eight bars total.',
  },
  {
    id: 'I-V-vi-IV',
    label: 'I – V – vi – IV',
    slow: true,
    cell: [triad(0), triad(0), triad(7), triad(7), triad(9), triad(9), triad(5), triad(5)],
    title: 'The pop progression, two bars each — eight bars total.',
  },
  {
    id: 'I-I-ii-iii',
    label: 'I – I – ii – iii',
    slow: true,
    cell: [triad(0), triad(0), triad(0), triad(0), triad(2), triad(2), triad(4), triad(4)],
    title: 'Four bars on the tonic, then two each walking up — 1111 1111 1111 1111 2222 2222 3333 3333.',
  },
  {
    id: 'I-V-bVII-bVII',
    label: 'I – V – ♭VII – ♭VII',
    slow: true,
    cell: [triad(0), triad(0), triad(7), triad(7), triad(10), triad(10), triad(10), triad(10)],
    title: 'The rock cadence, flat seven held for four bars — eight bars total.',
  },
  {
    id: 'ii-V-I-I',
    label: 'ii – V – I – I',
    slow: true,
    cell: [triad(2), triad(2), triad(7), triad(7), triad(0), triad(0), triad(0), triad(0)],
    title: 'The jazz turnaround — four bars on the tonic to hear the decay.',
  },
];

const PATTERN_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p.id, p]));
const RATE_BY_ID = Object.fromEntries(PATTERN_RATES.map((r) => [r.id, r]));

/**
 * The pattern player: a lookahead scheduler over the bench.
 *
 * Not a `setInterval` sounding notes as it fires. `previewNote` takes `at` — how far
 * ahead of now to schedule — so notes are placed on the audio clock rather than on the
 * timer's, and a timer that wakes four milliseconds late still puts its note exactly on
 * the beat. The timer only has to be reliably EARLY, which a 25ms tick against a 100ms
 * horizon comfortably is.
 *
 * `bpm` and `root` are read through functions rather than passed by value, because both
 * are things you change while it is running: dragging the desk tempo down to hear what
 * a release really does is most of what this is for.
 */
export function createPatternPlayer({
  Audio, bpm, root, sync = () => null, scale = () => null, onStep = () => {},
  adjustSlowRate = true,
}) {
  // How far ahead notes are queued, and how often the queue is topped up.
  //
  // The lookahead is deliberately short. It is the SAME queue the keys play into — see
  // benchPlay — so everything scheduled ahead is time a key pressed meanwhile has to
  // wait behind, and a hundred milliseconds of that is a keyboard you can feel lagging.
  // Sixty against a twenty-millisecond tick is three ticks of margin, which is enough
  // to ride out a repaint, and the catch-up in `pump` covers anything longer.
  const LOOKAHEAD = 0.06;       // seconds of audio scheduled in advance
  const TICK = 20;              // ms between top-ups

  let timer = null;
  let voiceId = null;
  let pattern = PATTERNS[0];
  // An eighth: fast enough to hear a decay, slow enough to hear a tail. Named rather
  // than indexed — the rates are ordered slowest-first for the dropdown, and a default
  // that moves whenever a rate is added to the list is a default nobody chose.
  let rate = RATE_BY_ID['8'];
  let next = 0;                 // ctx time of the next cell step
  let ix = 0;                   // which step of the cell
  // A native select can briefly take the page's event loop while its menu is open.
  // Keep the ordinary lookahead short so live keyboard notes stay responsive, but allow
  // a caller to prime a little further ahead before opening a blocking control.
  let primeUntil = 0;

  const running = () => timer != null;

  function stop() {
    if (timer != null) clearInterval(timer);
    timer = null;
    ix = 0;
    primeUntil = 0;
    silence();
    onStep(null);
  }

  // Cut notes already queued by the audition scheduler without touching its timer.
  // This is the boundary used by BASE KEY/FIGURE/RATE changes: the old phrase goes
  // quiet immediately, bench timing is rebased, and the next pump continues playing.
  function silence() {
    Audio?.stopPreview?.();
    benchReset();
  }

  function pump() {
    const ctx = Audio?.ctx;
    if (!ctx || !voiceId) { stop(); return; }
    const now = ctx.currentTime || 0;
    const horizon = Math.max(now + LOOKAHEAD, primeUntil);
    // Seconds per cell step: a 16th, times how many 16ths this rate leaves between hits.
    //
    // Taken from the SEQUENCER while a song is playing, rather than worked out from the
    // tempo readout. They agree today, but they are two answers to one question and a
    // pattern locked to the song has to move with whatever the song is actually doing —
    // including its warp multiplier, which the readout does not carry.
    const clock = sync();
    const step = (clock ? clock.spb : (60 / Math.max(20, bpm())) / 4) * rate.steps;
    while (next < horizon) {
      // A step that has fallen behind — a backgrounded tab, or the desk busy repainting
      // — is dragged up to now rather than played at its original time, which by then
      // is in the past: the rack cannot schedule backwards, so that is silence with an
      // exception behind it.
      const current = ctx.currentTime || 0;
      if (next < current) next = current + 0.02;
      const hit = pattern.cell[ix % pattern.cell.length];
      if (hit) {
        const base = root();
        const at = next - ctx.currentTime;
        // A chord is several calls at one time rather than a special case downstream:
        // each is its own note through the same seam, which is what a chord is. They
        // are asked for at the SAME instant and benchPlay spreads them — it owns the
        // rule about when a bench note may sound, because the keys and the hit button
        // land on these same pooled voices and would otherwise have to know it too.
        // Onto the scale, if one is set. The cell is written in semitones from its root,
        // so quantising here is all it takes for the same figure to be spelled in
        // whichever key is chosen — see snapToScale.
        const steps = scale()?.steps || null;
        for (const semi of hit) {
          const n = snapToScale(semi, steps);
          benchPlay(Audio, voiceId, base * 2 ** (n / 12), { at, bpm: bpm() });
        }
        onStep(ix % pattern.cell.length);
      }
      ix += 1;
      next += step;
    }
  }

  /**
   * When the first hit lands — on the song's grid if a song is playing.
   *
   * Pressed against a running song, a figure that starts the instant you click it is a
   * figure permanently off the beat: you are auditioning the preset against a phase
   * accident rather than against the music, and no amount of listening tells you which
   * of the two you are hearing. So it waits for the grid.
   *
   * Two conditions, not one. The hit has to be far enough ahead to schedule (`LEAD`),
   * and it has to be on a step the RATE actually falls on — a 1/4 figure that started on
   * step 3 would be on the beat by accident and off it for the rest of the bar. Walking
   * forward a step at a time is the honest way to satisfy both, and the walk is bounded
   * because a rate never spans more than a bar.
   *
   * With nothing playing there is no grid to join and it starts straight away, which is
   * what a bench should do when the room is quiet.
   */
  function firstHit() {
    const LEAD = 0.06;
    const now = Audio.ctx.currentTime;
    const clock = sync();
    if (!clock) return now + LEAD;
    let { time, step } = clock;
    const per = rate.steps;
    for (let guard = 0; guard < 256; guard++) {
      if (time >= now + LEAD && ((step % per) + per) % per === 0) return time;
      time += clock.spb;
      step += 1;
    }
    return now + LEAD;
  }

  function start(id) {
    if (!Audio?.ctx) return;
    voiceId = id || voiceId;
    if (!voiceId) return;
    ix = 0;
    next = firstHit();
    if (timer == null) timer = setInterval(pump, TICK);
    pump();
  }

  return {
    running,
    start,
    stop,
    silence,
    toggle: (id) => (running() ? stop() : start(id)),
    /** Point it at another preset, cutting the old bench before the next note. */
    setVoice: (id) => {
      if (id !== voiceId && running()) {
        Audio.stopPreview?.();
        benchReset();
      }
      voiceId = id;
    },
    /** Queue a little extra audio before a native control opens and pauses the page. */
    prime: (seconds = 0.75) => {
      if (!running() || !Audio?.ctx) return false;
      const now = Audio.ctx.currentTime || 0;
      primeUntil = Math.max(primeUntil, now + Math.max(LOOKAHEAD, Number(seconds) || 0));
      pump();
      return true;
    },
    get voice() { return voiceId; },
    get pattern() { return pattern; },
    get rate() { return rate; },
    /**
     * Choose a figure — and, for a progression, give it room.
     *
     * A progression read at a sixteenth is eight chords in two beats, which is not a
     * progression and is not what anyone picking one is asking for. So a `slow` pattern
     * arriving at a fast rate takes a WHOLE BAR per cell — which is what makes the
     * repeated entries mean what the titles say they mean: two cells of the same triad
     * are two bars of that chord, not two quarter notes of it. Only DOWNWARD, and only
     * past 1/2: a rate you have already set slower than that is a deliberate choice and
     * is left alone, and the dropdown visibly moves when this fires, so it is a nudge
     * rather than a rule you have to discover.
     */
    setPattern: (id) => {
      pattern = PATTERN_BY_ID[id] || pattern;
      ix = 0;
      if (adjustSlowRate && pattern.slow && rate.steps < RATE_BY_ID['2'].steps) rate = RATE_BY_ID['1'];
    },
    setRate: (id) => { rate = RATE_BY_ID[id] || rate; },
    /** Audition choices are transient and must not masquerade as song state. */
    reset() {
      stop();
      voiceId = null;
      pattern = PATTERNS[0];
      rate = RATE_BY_ID['8'];
    },
  };
}

// ---- the window --------------------------------------------------------------

/**
 * The library browser.
 *
 * Laid out like the voice picker it is a sibling of — a column per category, everything
 * visible at once — because it is the same catalogue, and learning two shapes for one
 * list is a cost with nothing on the other side of it.
 *
 * What differs is what a click MEANS. In the picker a preset is a choice being made for
 * a lane, and clicking one puts it on that lane. Here there is no lane: a click opens
 * the preset in the editor and points the bench at it, and no song changes in any way.
 * That distinction is the whole reason this is its own window rather than the picker
 * with a flag on it.
 */
export function createVoiceLibrary({
  el, Audio, bpm,
  // Open the editor on a preset with no lane behind it. Returns whether it opened: an
  // engine preset has no parameters to show and the editor refuses it, and the row
  // should say so rather than look like a button that did nothing.
  edit,
  // Ask the editor for its save sheet, which is where a name and a category are
  // committed. The library does not write voices.js itself — there is one path to that
  // file and it measures the preset on the way, which is not a thing worth having two
  // implementations of. See `commit` in mixer-voice-editor.js.
  file,
  // Which preset the editor currently has open, so the list can mark it.
  editing,
  onPick = () => {},
  onClose = () => {},
  // Called after every repaint with `{ edit, keys }` — the two empty boxes the desk
  // parks its editor and its keyboard into. A callback rather than a return value
  // because this window rebuilds itself on every filter keystroke, and anything parked
  // in it is detached each time; the desk has to be told to put them back, exactly as
  // `placeVoiceEditor` is told by every rack repaint.
  // The song's clock, or null when nothing is playing — `{ time, step, spb }`, where
  // `time` is the ctx time of the sequencer's next step. What the pattern locks to.
  sync = () => null,
  // The key the keyboard is set to — `{ root, steps }`, or null for chromatic. The
  // keyboard owns this control, because it is the thing you see it on; the bench reads
  // it so the figures land in the same key the keys do.
  scale = () => null,
  onLayout = () => {},
  // A region was folded or unfolded — `(which, isCollapsed)`. The desk needs to know
  // because what lives in these slots is the desk's, not the library's: a folded
  // keyboard must stop catching keystrokes, and an unfolded one has to be built.
  onCollapse = () => {},
  }) {
  let slots = null;
  // Put away, not shut. Closing a region here used to tear the panel down — the editor
  // forgot which preset it was on, the keyboard went back to the desk — which made the
  // ✕ a much bigger act than it looks like on a workspace you are living in. These two
  // just fold: what is in them keeps its state and comes back untouched.
  const FOLD_KEY = 'mash-mixer-voicelib-folds';
  const collapsed = { edit: false, keys: false };
  try {
    const saved = JSON.parse(localStorage.getItem(FOLD_KEY) || 'null');
    collapsed.edit = saved?.edit === true;
    collapsed.keys = saved?.keys === true;
  } catch { /* clean defaults */ }
  function setCollapsed(which, on) {
    collapsed[which] = !!on;
    try { localStorage.setItem(FOLD_KEY, JSON.stringify(collapsed)); } catch { /* no storage */ }
    build();
    onCollapse(which, collapsed[which]);
  }

  /**
   * The stub a folded region leaves behind — a labelled rail that unfolds it.
   *
   * The word, and nothing else. It carried the fold mark pointing back the way it came,
   * which is a reasonable idea and one arrow too many: the rail IS the gap the thing left
   * behind, sitting on the edge it will come back from, and the only thing you can do to
   * it is open it. An arrow saying "this way" on a control with one direction is a
   * decoration you have to read past to get to the word that already said it.
   */
  function reopenRail(label, open) {
    const rail = document.createElement('button');
    rail.className = 'vlrail';
    const text = document.createElement('span');
    text.textContent = label;
    rail.append(text);
    rail.title = `Show the ${label} again`;
    rail.onclick = open;
    return rail;
  }
  const POS_KEY = 'mash-mixer-voicelib-pos';
  const LIBRARY_OPEN_KEY = 'mash-mixer-library-open';
  let query = '';
  let kind = 'all';
  let source = 'all';
  let usage = 'all';  // 'all' | 'used' | 'unused'
  let picked = null;
  let searchInput = null;
  // `picked` is the row the user chose. A library row opens as a hidden editor draft,
  // though, and the bench must hear that draft rather than the immutable source row.
  // Keep the two ids separate so the list can still mark the source while every sound
  // path follows the thing whose controls are actually changing.
  let heard = null;
  let synth = 'any';        // which Tone class (or noise/drum construction) to show
  // Octaves away from the preset's own root. A bass auditioned where a lead sits tells
  // you nothing about either, and the note a preset was MEASURED at is the bottom of a
  // range rather than the whole of it — a pad that is lovely at A2 can be mud two
  // octaves down and glass two up, and that is a thing to find out here rather than in
  // a song. Kept across presets on purpose: comparing two basses means hearing both in
  // the same place.
  let octave = 0;
  const OCTAVE_RANGE = 3;

  /**
   * The note the bench plays from: the preset's own root, in the chosen key, moved by
   * however many octaves the bench is set to.
   *
   * The KEY moves the pitch class and nothing else. A2 is where a pitched preset was
   * measured, so its octave band is kept and only the letter changes — choose C and you
   * get the C in that band rather than a C somewhere the level was never taken at. With
   * no scale set, or on a drum, this is exactly the note it always was: a kit preset is
   * struck at its lane's own pitch, which is a property of the drum and not of any key.
   */
  const shiftedRoot = () => {
    const id = editing?.() || heard || picked;
    const v = VOICES[id] || VOICES[picked];
    let hz = benchRoot(v);
    const sc = scale();
    if (sc && sc.steps && !benchIsKit(v)) {
      const midi = Math.round(12 * Math.log2(hz / 440) + 69);
      hz = 440 * 2 ** ((Math.floor(midi / 12) * 12 + sc.root - 69) / 12);
    }
    return hz * 2 ** octave;
  };

  const player = createPatternPlayer({ Audio, bpm, sync, scale, root: shiftedRoot });

  // What that root is, as a note. `A2` says more than `+0` does — and on a drum it says
  // the thing worth knowing, which is where the preset is actually being struck.
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function noteLabel(freq) {
    if (!(freq > 0)) return '—';
    const midi = Math.round(12 * Math.log2(freq / 440) + 69);
    return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  }

  const KINDS = [
    { id: 'all', label: 'All', keep: () => true },
    { id: 'pitched', label: 'Pitched', keep: (v) => !isKitVoice(v) },
    { id: 'drums', label: 'Drums', keep: (v) => isKitVoice(v) },
  ];
  const SOURCES = [
    { id: 'all', label: 'All', keep: () => true },
    { id: 'library', label: 'Library', keep: (v) => !!v.factory },
    { id: 'user', label: 'My presets', keep: (v) => !!v.user },
  ];
  const USAGE = [
    { id: 'all', label: 'All', keep: () => true },
    { id: 'used', label: 'Used', keep: (v) => isVoiceUsed(v.id) },
    { id: 'unused', label: 'Unused', keep: (v) => !isVoiceUsed(v.id) },
  ];

  // ---- what a preset is BUILT from -------------------------------------------
  //
  // The thing the library could not tell you. Every row said what a sound is FOR — its
  // category, its description — and nothing said what it is made of, which is the
  // question you have while you are designing: an FM bell and a subtractive bell want
  // completely different edits, and until you opened one there was no way to know which
  // you were looking at. It also makes the catalogue legible as a whole — that there are
  // twenty-one FM presets and five DuoSynths is a fact about the library.
  //
  // Noise and drum presets have no Tone class: they are the rack's own constructions.
  // They answer with their kind, because "noise" is the same KIND of answer as
  // "FMSynth" — it is what the thing is built out of.
  const synthOf = (v) => v.synth || v.kind;
  // `MembraneSynth` is thirteen characters in a 150px column beside a preset name that
  // also wants reading. The suffix is on every one of them and carries nothing.
  //
  // Except on Tone's base class, which is called `Synth` outright — stripping there
  // leaves an empty string, and twelve presets in this catalogue use it. So the rule is
  // "drop the suffix unless the suffix is the whole name", which is one condition rather
  // than a special case for one class.
  // Capitalised on the way out, because two of these are kinds rather than class names:
  // `noise` and `drum` are written the way the data writes them and would otherwise be
  // the only lower-case entries in a column of FM, Mono and Membrane. The raw name stays
  // the option's value — this touches what is read, not what is filtered on.
  const shortSynth = (name) => {
    const s = name.replace(/Synth$/, '') || name;
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const synthLabel = (v) => shortSynth(synthOf(v));

  /** Every synth the catalogue actually uses, commonest first, with its tally. */
  function synthsPresent() {
    const n = {};
    for (const v of Object.values(VOICES)) {
      if (v.kind === 'engine' || v.songLocal || v.draft) continue;
      const s = synthOf(v);
      n[s] = (n[s] || 0) + 1;
    }
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  const isShown = () => el.classList.contains('show');

  /**
   * Everything the editor can open, filed by category.
   *
   * Engine presets are left out entirely, which the picker does not do. There they are
   * a real choice — a lane can play one — so hiding them would be hiding a sound. Here
   * the only thing on offer is editing, and an engine preset is a bundle of bank keys
   * rather than a synth: the editor refuses it by design, so listing one is offering a
   * row that can only ever apologise. A song's own copy is out for the same reason from
   * the other direction — it lives in one song's mix, and this is the library.
   */
  function grouped() {
    const q = query.trim().toLowerCase();
    const keep = KINDS.find((k) => k.id === kind).keep;
    const keepSource = SOURCES.find((s) => s.id === source).keep;
    const keepUsage = USAGE.find((u) => u.id === usage).keep;
    // The synth is searchable as well as filterable: typing "fm" should find the FM
    // presets, which is what anyone who knows the catalogue would expect it to do.
    const hit = (v) => !q
      || `${v.label} ${v.category} ${v.note || ''} ${synthOf(v)}`.toLowerCase().includes(q);
    const bySynth = (v) => synth === 'any' || synthOf(v) === synth;
    return VOICE_CATEGORIES
      .map((c) => [c, Object.values(VOICES).filter((v) => v.category === c
        && v.kind !== 'engine' && !v.songLocal && !v.draft && keep(v) && keepSource(v)
        && keepUsage(v) && bySynth(v) && hit(v))])
      .filter(([, list]) => list.length);
  }

  function pick(id) {
    const scrollTop = el.querySelector('.vlresults')?.scrollTop || 0;
    const opened = edit(id);
    if (!opened) return;
    picked = id;
    heard = typeof opened === 'string' ? opened : (editing?.() || id);
    // Follows without stopping. Auditioning one preset after another against the same
    // figure is how you tell two of them apart, and a player that stopped on every
    // click would make that four clicks per comparison instead of one.
    player.setVoice(heard);
    onPick(id);
    build();
    const results = el.querySelector('.vlresults');
    if (results) results.scrollTop = scrollTop;
  }

  function build() {
    if (!isShown()) return;
    el.textContent = '';

    // ---- the header, which is also the handle
    const head = document.createElement('div');
    head.className = 'vlhead';
    const title = document.createElement('span');
    title.className = 'vltitle';
    title.textContent = 'Preset library';
    title.title = 'Built-in Library presets are read-only; My presets are editable. This'
      + ' browser is not a choice for a channel — nothing here changes any song.';

    const chips = document.createElement('div');
    chips.className = 'voicekinds';
    for (const k of KINDS) {
      const c = document.createElement('button');
      c.className = 'voicekind' + (k.id === kind ? ' on' : '');
      c.textContent = k.label;
      c.title = k.id === 'all' ? 'Every preset in the library'
        : k.id === 'drums' ? 'kicks, snares, claps, hats and percussion'
          : 'Everything that plays a note';
      c.onclick = () => { kind = k.id; build(); };
      chips.append(c);
    }

    const sources = document.createElement('div');
    sources.className = 'voicesources';
    for (const s of SOURCES) {
      const c = document.createElement('button');
      c.className = 'voicekind' + (s.id === source ? ' on' : '');
      c.textContent = s.label;
      c.title = s.id === 'library'
        ? 'Built-in reference presets. They are read-only; duplicate one to edit it.'
        : s.id === 'user'
          ? 'Your editable presets'
          : 'Built-in and user presets';
      c.onclick = () => { source = s.id; build(); };
      sources.append(c);
    }

    const usageChips = document.createElement('div');
    usageChips.className = 'voiceusage';
    for (const u of USAGE) {
      const c = document.createElement('button');
      c.className = 'voicekind' + (u.id === usage ? ' on' : '');
      c.textContent = u.label;
      c.title = u.id === 'used'
        ? 'Presets referenced by cabinet songs or style-pack starters'
        : u.id === 'unused'
          ? 'Presets no cabinet song or style pack names — safe to clean up'
          : 'Every preset, regardless of usage';
      c.onclick = () => { usage = u.id; build(); };
      usageChips.append(c);
    }

    const search = document.createElement('input');
    search.className = 'voicesearch';
    search.type = 'search';
    search.placeholder = 'Search presets…';
    search.value = query;
    search.setAttribute('aria-label', 'Search presets');
    searchInput = search;
    search.addEventListener('input', () => { query = search.value; drawList(); });
    // Escape clears the filter first and closes the window only when it is already
    // empty — one key, and it never throws away a search you were still reading.
    search.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key !== 'Escape') return;
      if (search.value) { query = ''; search.value = ''; drawList(); } else show(false);
    });

    // What it is built from, as a filter. A dropdown rather than more chips: there are
    // nine of them and they are names rather than a spectrum, so a row of nine buttons
    // would be a row of nine buttons. Counted, because the tally is half the answer —
    // "MetalSynth (15)" tells you the catalogue leans on it before you click.
    const syn = document.createElement('select');
    syn.className = 'fxsel vlsynth';
    const anyOpt = document.createElement('option');
    anyOpt.value = 'any'; anyOpt.textContent = 'Any synth';
    syn.append(anyOpt);
    for (const [name, n] of synthsPresent()) {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = `${shortSynth(name)} (${n})`;
      if (name === synth) o.selected = true;
      syn.append(o);
    }
    syn.title = 'Show only presets built from one Tone class — or the rack’s own noise'
      + ' and drum constructions, which are not Tone classes at all.'
      + '\n\nAn FM bell and a subtractive bell want completely different edits.';
    syn.onchange = () => { synth = syn.value; drawList(); };

    const close = document.createElement('button');
    close.className = 'vlclose popclose';
    close.textContent = '✕';
    close.title = 'Close the library';
    close.onclick = () => show(false);

    // Keep the search with the library controls. It is the last field before the
    // close button, so the close stays at the far edge instead of looking like part
    // of the filter group.
    head.append(title, sources, usageChips, chips, syn, search, close);

    const results = document.createElement('div');
    results.className = 'vlresults';

    function drawList() {
      results.textContent = '';
      const groups = grouped();
      if (!groups.length) {
        const none = document.createElement('div');
        none.className = 'fxgroup voicesearch-none';
        // Which filter is doing the hiding, named — three of them can empty this list
        // and an empty panel that does not say which reads as a broken library.
        const why = [
          query.trim() ? `“${query.trim()}”` : null,
          synth !== 'any' ? synth : null,
          kind !== 'all' ? kind : null,
          usage !== 'all' ? usage : null,
        ].filter(Boolean);
        none.textContent = why.length
          ? `Nothing matches ${why.join(' + ')}` : 'No presets in this view';
        results.append(none);
        return;
      }
      for (const [category, list] of groups) {
        const g = document.createElement('div');
        g.className = 'vlcat';
        // A heading, not a control. The card was briefly a drawer you could shut, which
        // made the head a button with a chevron on it — the outline is what was worth
        // keeping. Every preset in the library is visible again, and the only thing that
        // scrolls is the list as a whole.
        const head = document.createElement('h5');
        head.className = 'vlcathead';
        head.textContent = category;
        g.append(head);

        const body = document.createElement('div');
        body.className = 'vlcatlist';
        for (const v of list) {
          const btn = document.createElement('button');
          btn.className = v.id === editing() || v.id === picked ? 'on' : '';
          const n = document.createElement('span');
          n.textContent = v.label;
          const origin = document.createElement('span');
          origin.className = 'vsource';
          origin.textContent = v.user ? 'User' : 'Library';
          const k = document.createElement('span');
          k.className = 'vkind';
          k.textContent = synthLabel(v);
          btn.title = `${v.label}${v.note ? ` — ${v.note}` : ''}`
            + `\n\nBuilt from: ${synthOf(v)}`
            + (v.user
              ? '\n\nClick to edit your preset.'
              : '\n\nLibrary preset — click to duplicate it before editing.')
            + '\nRight-click to rename it or file it elsewhere.';
          btn.append(n, origin, k);
          btn.onclick = (ev) => {
            // The first click can select/audition while the editor is hidden. A
            // double-click is the explicit gesture that brings that editor back.
            if (ev.detail >= 2 && collapsed.edit) setCollapsed('edit', false);
            pick(v.id);
          };
          // Rename and refile without going through the editor's controls first. It
          // still ENDS in the editor's save sheet: that is the one place a preset is
          // written to voices.js, and it measures the sound on the way, so a second
          // path here would be a second convention about what a saved preset is.
          btn.oncontextmenu = (ev) => {
            ev.preventDefault();
            pick(v.id);
            if (v.user && editing() === v.id) file();
          };
          body.append(btn);
        }
        g.append(body);
        results.append(g);
      }
    }

    drawList();

    // ---- one workspace, three regions.
    //
    // It was three windows — list, editor, keyboard — and choosing a preset meant
    // arranging furniture before you could work: three things to open, three to place,
    // and any of them able to cover another. They are one job, so they are one screen.
    //
    // The editor and the keyboard are not rebuilt here. They are the desk's own
    // elements, parked into these slots by the desk after every repaint — the editor
    // because it also docks beside a channel strip, the keyboard because it also plays
    // one, and neither can be a copy without becoming a second implementation of
    // something that already works. See `slots` and `onLayout`.
    // Two columns, not three bands. The editor runs the FULL height of the window down
    // the right, because it is the tallest thing here — a MonoSynth is sixteen pots and
    // an FMSynth more — and the keyboard goes under the LIST rather than under both, so
    // it gets the wide half to be wide in. Stacking them all horizontally instead would
    // have given the editor a third of the height and the keyboard a third of the width,
    // which is the wrong way round for each of them.
    const main = document.createElement('div');
    main.className = 'vlmain';

    const left = document.createElement('div');
    left.className = 'vlleft';
    const keySlot = document.createElement('div');
    keySlot.className = 'vlkeys';
    keySlot.classList.toggle('collapsed', collapsed.keys);
    const foot = document.createElement('div');
    foot.className = 'vlfoot';
    foot.append(buildBench(), keySlot);
    left.append(results, foot);

    const editSlot = document.createElement('div');
    editSlot.className = 'vledit';
    editSlot.classList.toggle('collapsed', collapsed.edit);
    // The way back when a panel is put away. A collapsed region leaves a rail behind
    // rather than vanishing: something you closed and cannot see how to reopen is
    // something you have lost, and both of these are one click from wanted again.
    if (collapsed.edit) editSlot.append(reopenRail('editor', () => setCollapsed('edit', false)));
    if (collapsed.keys) foot.append(reopenRail('keyboard', () => setCollapsed('keys', false)));

    main.append(left, editSlot);
    el.append(head, main);
    wireDrag(head);
    // Handed out AFTER the tree exists, so the desk parks into slots that are already
    // in the document — appending to a detached node would leave both invisible.
    slots = { edit: editSlot, keys: keySlot };
    onLayout(slots);
  }

  /**
   * The bench strip: what is being auditioned, and the figure it is auditioned with.
   *
   * It lives here rather than in the on-screen keyboard on purpose. The keyboard plays a
   * CHANNEL — it follows the selection, it names the lane, it goes amber when that lane
   * is muted — and a library preset has no channel, so putting the bench's controls
   * there would leave one window whose readout meant two different things depending on
   * what else happened to be open. The keys still play the bench while this is open;
   * what they play is stated in the keyboard's own title bar.
   */
  function buildBench() {
    const bar = document.createElement('div');
    bar.className = 'vlbench';
    const id = editing?.() || heard || picked;
    const v = VOICES[id] || VOICES[picked];

    const what = document.createElement('span');
    what.className = 'vlbenchwhat' + (v ? '' : ' none');
    what.textContent = v ? v.label : 'No preset on the bench';
    what.title = v
      ? `Heard on the ${benchLane(v)} lane with no channel strip: no EQ, no inserts, no`
        + ' sends, and nothing for mute or solo to silence. It is the same lane the'
        + ' preset’s level was measured on, so what you hear is what the level claims.'
      : 'Click a preset below to put it on the bench';

    // ---- octave, as a stepper reading the note it lands on
    //
    // `A2` rather than `+0`: the number would say how far you have moved and the note
    // says where you are, and where you are is the question — a bass preset auditioned
    // at A4 sounds broken because it is a bass at A4, not because it is broken.
    const oct = document.createElement('div');
    oct.className = 'vloct';
    const step = (delta) => {
      const b = document.createElement('button');
      b.className = 'vloctbtn';
      b.textContent = delta < 0 ? '−' : '+';
      b.disabled = !picked || Math.abs(octave + delta) > OCTAVE_RANGE;
      b.title = `${delta < 0 ? 'Down' : 'Up'} an octave`;
      // No rebuild of the whole window: the pattern reads `root` live, so a running
      // figure changes octave under you without dropping a beat — which is the only
      // way to hear whether the change was an improvement.
      b.onclick = () => {
        octave = Math.max(-OCTAVE_RANGE, Math.min(OCTAVE_RANGE, octave + delta));
        paintOctave();
      };
      return b;
    };
    const down = step(-1);
    const up = step(1);
    const reading = document.createElement('button');
    reading.className = 'vloctnow';
    reading.disabled = !picked;
    reading.onclick = () => { octave = 0; paintOctave(); };

    function paintOctave() {
      reading.textContent = picked ? noteLabel(shiftedRoot()) : '—';
      reading.title = octave
        ? `${octave > 0 ? '+' : ''}${octave} octave${Math.abs(octave) === 1 ? '' : 's'} from`
          + ` ${noteLabel(benchRoot(v))}, where the preset was measured — click to go back`
        : 'The note the preset was measured at';
      down.disabled = !picked || octave - 1 < -OCTAVE_RANGE;
      up.disabled = !picked || octave + 1 > OCTAVE_RANGE;
    }
    paintOctave();
    oct.append(down, reading, up);

    const once = document.createElement('button');
    once.className = 'vlonce';
    once.textContent = 'Hit';
    once.title = 'Sound it once';
    once.disabled = !picked;
    once.onclick = () => {
      const id = editing?.() || heard || picked;
      benchPlay(Audio, id, shiftedRoot(), { bpm: bpm() });
    };

    const play = document.createElement('button');
    play.className = 'vlplay' + (player.running() ? ' on' : '');
    play.textContent = player.running() ? '■' : '▶';
    // Says which of the two things it will do, because they feel different and you can
    // see from here which one applies: against a running song the figure waits for the
    // grid and lands on it, and a play button that visibly did nothing for half a beat
    // would otherwise read as a missed click.
    const locked = !!sync();
    play.classList.toggle('sync', locked && !player.running());
    play.title = player.running()
      ? 'Stop the pattern'
      : locked
        ? 'Play the pattern in time with the song — it waits for the next beat, and'
          + ' follows the song’s tempo from there'
        : 'Play the pattern, so the sound keeps going while you change it';
    play.disabled = !picked;
    play.onclick = () => {
      const id = editing?.() || heard || picked;
      player.toggle(id);
      build();
    };

    const pat = document.createElement('select');
    pat.className = 'fxsel vlpat';
    for (const p of PATTERNS) {
      const o = document.createElement('option');
      o.value = p.id; o.textContent = p.label;
      if (p.id === player.pattern.id) o.selected = true;
      pat.append(o);
    }
    pat.title = player.pattern.title;
    pat.onchange = () => {
      player.setPattern(pat.value);
      pat.title = player.pattern.title;
      // A progression may have taken the rate down with it — see setPattern — and the
      // dropdown has to say so, or the figure is playing at a rate the desk denies.
      rate.value = player.rate.id;
    };

    const rate = document.createElement('select');
    rate.className = 'fxsel vlrate';
    for (const r of PATTERN_RATES) {
      const o = document.createElement('option');
      o.value = r.id; o.textContent = r.label;
      if (r.id === player.rate.id) o.selected = true;
      rate.append(o);
    }
    rate.title = 'How often the pattern steps, at the desk tempo — which you can drag'
      + ' while it plays';
    rate.onchange = () => player.setRate(rate.value);

    bar.append(what, oct, once, play, pat, rate);
    return bar;
  }

  // ---- the window itself -----------------------------------------------------

  /** Move it, and keep it on the screen. The same gesture the keyboard uses. */
  function place(x, y) {
    const r = el.getBoundingClientRect();
    const left = Math.max(4, Math.min(x, Math.max(4, innerWidth - r.width - 4)));
    const top = Math.max(4, Math.min(y, Math.max(4, innerHeight - r.height - 4)));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    localStorage.setItem(POS_KEY, JSON.stringify({ x: left, y: top }));
  }

  function wireDrag(head) {
    head.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('button, input, select')) return;
      ev.preventDefault();
      const r = el.getBoundingClientRect();
      const dx = ev.clientX - r.left;
      const dy = ev.clientY - r.top;
      const move = (e) => place(e.clientX - dx, e.clientY - dy);
      const stop = () => {
        head.removeEventListener('pointermove', move);
        head.classList.remove('dragging');
      };
      head.classList.add('dragging');
      try { head.setPointerCapture(ev.pointerId); } catch { /* not a real pointer */ }
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', stop, { once: true });
      head.addEventListener('pointercancel', stop, { once: true });
    });
  }

  function show(on) {
    el.classList.toggle('show', on);
    try { localStorage.setItem(LIBRARY_OPEN_KEY, on ? '1' : ''); } catch { /* no storage */ }
    if (!on) {
      // The pattern is a sound, and a sound whose window has gone is a sound with no
      // control left to stop it.
      player.stop();
      picked = null;
      heard = null;
      onClose();
      return;
    }
    build();
    let pos = null;
    try { pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { pos = null; }
    const r = el.getBoundingClientRect();
    place(pos?.x ?? Math.max(4, (innerWidth - r.width) / 2), pos?.y ?? 70);
    requestAnimationFrame(() => {
      if (isShown()) searchInput?.focus({ preventScroll: true });
    });
  }

  /**
   * The transport moved: say whether pressing play would now join the song.
   *
   * In place rather than a repaint. Starting a song must not rebuild this window —
   * the search box is in it, and a rebuild mid-word takes the caret with it — and
   * one button's class and tooltip is the whole of what changed.
   */
  function syncChanged() {
    const btn = isShown() && el.querySelector('.vlplay');
    if (!btn) return;
    const locked = !!sync();
    btn.classList.toggle('on', player.running());
    btn.classList.toggle('sync', locked && !player.running());
    btn.textContent = player.running() ? '■' : '▶';
    btn.title = player.running()
      ? 'Stop the pattern'
      : locked
        ? 'Play the pattern in time with the song — it waits for the next beat, and'
          + ' follows the song’s tempo from there'
        : 'Play the pattern, so the sound keeps going while you change it';
  }

  return {
    show,
    isShown,
    toggle: () => show(!isShown()),
    /** Repaint: the editor renamed or refiled something and the columns have moved. */
    refresh: () => {
      if (!isShown()) return;
      // Save as New changes the editor's id from the transient draft to the persisted
      // user preset. Follow that re-key immediately or the next Hit/pattern would ask
      // VoiceRack for the draft that commit just removed.
      const live = editing?.();
      if (live && live !== heard) {
        heard = live;
        player.setVoice(live);
      }
      build();
    },
    clearPick: () => { player.stop(); picked = null; heard = null; },
    syncChanged,
    /** The two boxes the desk parks its editor and its keyboard into, or null. */
    get slots() { return isShown() ? slots : null; },
    /** Fold a region away, or bring it back. See setCollapsed. */
    collapse: (which, on) => setCollapsed(which, on),
    isCollapsed: (which) => !!collapsed[which],
    stopPattern: () => { player.stop(); syncChanged(); },
    songChanged: () => {
      player.reset();
      heard = null;
      octave = 0;
      if (isShown()) build();
    },
    /** The preset the keyboard should play instead of the selected channel, if any. */
    get picked() { return isShown() ? (editing?.() || heard || picked) : null; },
  };
}
