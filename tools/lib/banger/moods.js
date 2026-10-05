// MAKE A BANGER — the moods every style shares. 3 Oct 2026.
//
// A mood is, first of all, a CHORD PROGRESSION you could pick out blindfold. The first
// nine moods were written into each style's recipe one by one; these are written once,
// here, and every style plays them — a style that wants its own take on one overrides it
// in its recipe (`progressions[id]`, `moods[id]`), exactly as it already does for the
// nine. Each progression is eight bars of numerals, major and minor: a bar is one chord
// or two half-bar ones, and a quality on a numeral (`IVmaj7`, `II7`) is part of the
// mood's sound rather than a colour laid over it.
//
// Every mood also says how it CHANGES KEY (`lifts`, see LIFT_APPROACHES): the first is
// its own, the rest the ones that go with it. Bittersweet climbs in by a borrowed step;
// Disco slides in on a ii–V.
//
// Browser-safe: no `node:*` imports.

/**
 * How a key lift arrives. Applied to the last half-bar before a lifted section, in the
 * NEW key: the chord parts keep their rhythm and register and move to the nearest notes
 * of the approach chords, the bass to their roots, and the tune rests for that half-bar
 * so nothing clashes. Straight is the old jump: no approach at all.
 */
export const LIFT_APPROACHES = Object.freeze([
  { id: 'straight', label: 'Straight', note: 'Up with no warning — the plain jump' },
  { id: 'pivot', label: 'Pivot', note: 'The new key\'s V7 on the last two beats — the ear hears it coming' },
  { id: 'twostep', label: 'Two-Step', note: 'ii7 then V7 of the new key — a jazzy slide in' },
  { id: 'borrowed', label: 'Borrowed Step', note: 'The new key\'s ♭VI then ♭VII — the floor drops, then lifts' },
  { id: 'walkup', label: 'Walk-Up', note: 'The bass climbs a semitone at a time into the new root' },
]);

/** The new moods. `mood` is what a style's `moods[id]` holds (see big-room.js). */
export const SHARED_MOODS = Object.freeze({
  // The major IV turning minor, a secondary dominant leaning on the IV, and a suspended V
  // that takes its time to resolve.
  bittersweet: {
    label: 'Bittersweet', title: 'Aching and tender: the IV turning minor, a D7 leaning on the next chord, a suspended ending — end-credits feeling',
    major: [['I'], ['IVmaj7'], ['iv'], ['I'], ['vi7'], ['II7'], ['IVmaj7'], ['Vsus4', 'V']],
    minor: [['i'], ['VImaj7'], ['iv'], ['i'], ['III'], ['V7'], ['VImaj7'], ['iv', 'V']],
    mood: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'lydian'], fights: ['phrygian', 'harmonic'] },
    lifts: ['borrowed', 'pivot'],
  },
  // A minor-seventh vamp on a MAJOR IV7 — the dorian sixth in the middle of it.
  disco: {
    label: 'Disco', title: 'A minor-seventh vamp on a major IV7, turned round at the end — octave bass',
    minor: [['i7'], ['IV7'], ['i7'], ['IV7'], ['i7'], ['IV7'], ['VImaj7'], ['V7']],
    major: [['ii7'], ['V7'], ['ii7'], ['V7'], ['ii7'], ['V7'], ['IVmaj7'], ['V7']],
    mood: { colour: { '': '', m: 'm7' }, exciter: true, high: 2, preferMinor: true, walk: 'bright' },
    modes: { suits: ['minor', 'dorian'], fights: ['phrygian', 'lydian'] },
    bass: 'octaves',
    lifts: ['twostep', 'walkup'],
  },
  // Major sevenths in the sun, a II7 lift, and home by the borrowed flat seven.
  sunshine: {
    label: 'Sunshine Pop', title: 'Bright major sevenths, a II7 lift, and home by a borrowed ♭VII',
    major: [['Imaj7'], ['iii7'], ['IVmaj7'], ['V'], ['Imaj7'], ['II7'], ['IVmaj7'], ['bVII', 'IV']],
    minor: [['III'], ['VII'], ['VI'], ['VII'], ['III'], ['VII'], ['iv'], ['V']],
    mood: { colour: { '': 'add9', m: 'm7' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'mixolydian'], fights: ['phrygian', 'harmonic'] },
    bass: 'rootFifth',
    lifts: ['pivot', 'borrowed'],
  },
  doowop: {
    label: 'Doo-Wop', title: 'The fifties progression, I–vi–IV–V — sweet and innocent',
    major: [['I'], ['vi'], ['IV'], ['V'], ['I'], ['vi'], ['IV'], ['V']],
    minor: [['III'], ['i'], ['VI'], ['VII'], ['III'], ['i'], ['VI'], ['VII']],
    mood: { colour: { '': '', m: 'm' }, exciter: false, high: 1.5, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major'], fights: ['phrygian', 'harmonic', 'dorian'] },
    bass: 'rootFifth',
    lifts: ['pivot', 'twostep'],
  },
  // The falling circle of fifths, home by the big major V. Not Gothic's descent: that
  // steps down the scale; this falls by fifths.
  lament: {
    label: 'Lament', title: 'The falling circle of fifths, home by the big V — sad and inevitable',
    minor: [['i'], ['iv'], ['VII'], ['III'], ['VI'], ['iv'], ['V'], ['i']],
    major: [['vi'], ['ii'], ['V'], ['I'], ['IV'], ['ii'], ['III'], ['vi']],
    mood: { colour: { '': '', m: 'm' }, exciter: false, high: 0.5, preferMinor: true, walk: 'dark' },
    modes: { suits: ['minor', 'harmonic'], fights: ['major', 'lydian', 'mixolydian'] },
    bass: 'arpeggiated',
    lifts: ['pivot', 'walkup'],
  },
  lofi: {
    label: 'Lo-Fi', title: 'Sevenths walking down a step at a time — mellow and late-night',
    major: [['IVmaj7'], ['iii7'], ['ii7'], ['Imaj7'], ['IVmaj7'], ['iii7'], ['ii7'], ['Imaj7']],
    minor: [['VImaj7'], ['v7'], ['iv7'], ['i7'], ['VImaj7'], ['v7'], ['iv7'], ['i7']],
    mood: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 0, preferMinor: false, walk: 'dark' },
    modes: { suits: ['major', 'dorian'], fights: ['phrygian', 'harmonic'] },
    bass: 'walking',
    lifts: ['twostep', 'pivot'],
  },
  // Rocking between I and a major II — the lydian raised fourth, never landing.
  dreamy: {
    label: 'Dreamy', title: 'Rocking between I and a major II — floating, never landing',
    major: [['Imaj7'], ['II'], ['Imaj7'], ['II'], ['Imaj7'], ['II'], ['vi7'], ['II']],
    minor: [['VImaj7'], ['VII'], ['VImaj7'], ['VII'], ['VImaj7'], ['VII'], ['i7'], ['VII']],
    mood: { colour: { '': 'maj7', m: 'm9' }, exciter: false, high: 1, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'lydian'], fights: ['phrygian'] },
    bass: 'pedal',
    lifts: ['borrowed', 'pivot'],
  },
  // Chords from far keys a third away — the film-score sense of awe. Heroic borrows only
  // the closing climb; this one keeps leaving.
  wonder: {
    label: 'Wonder', title: 'Chords from far keys a third away — I, ♭VI, ♭III — a film-score sense of awe',
    major: [['I'], ['bVI'], ['I'], ['bIII'], ['IV'], ['bVI'], ['bVII'], ['I']],
    minor: [['i'], ['VI'], ['III'], ['bII'], ['iv'], ['VI'], ['VII'], ['I']],
    mood: { colour: { '': 'add9', m: 'm' }, exciter: true, high: 2.6, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'mixolydian'], fights: ['phrygian'] },
    lifts: ['borrowed', 'walkup'],
  },
  // A jazz turnaround with a chromatic slide back to the top: the lounge, the cocktail
  // bar, Shibuya-Kei's own (styles/shibuya.js starts on it). Not Lo-Fi's walk-down: this
  // one turns on dominant sevenths and slides by semitones.
  lounge: {
    label: 'Lounge', title: 'A jazz turnaround — Imaj7–VI7–ii7–V7 — then sliding down by semitones back to the top',
    major: [['Imaj7'], ['VI7'], ['ii7'], ['V7'], ['iii7'], ['bIII7'], ['ii7'], ['bII7']],
    minor: [['i7'], ['i7'], ['iv7'], ['iv7'], ['IIm7b5'], ['V7'], ['i7'], ['bII7']],
    mood: { colour: { '': 'maj7', m: 'm7' }, exciter: false, high: 1.5, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'dorian'], fights: ['phrygian', 'harmonic'] },
    bass: 'walking',
    lifts: ['twostep', 'pivot'],
  },
  boogie: {
    label: 'Boogie', title: 'The blues in eight bars, in sevenths — swaggering',
    major: [['I7'], ['I7'], ['IV7'], ['I7'], ['V7'], ['IV7'], ['I7'], ['V7']],
    minor: [['i7'], ['i7'], ['iv7'], ['i7'], ['v7'], ['iv7'], ['i7'], ['V7']],
    mood: { colour: { '': '7', m: 'm7' }, exciter: true, high: 2, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'mixolydian'], fights: ['harmonic', 'lydian'] },
    bass: 'walking',
    lifts: ['walkup', 'twostep'],
  },
  // vi–IV–I–V, starting in the minor and leaning bright — but where Moody (big-room's
  // major walk is the same four chords) goes round for ever, this one gets home: a
  // suspended V, then the I it was reaching for. 3 Oct 2026.
  hopeful: {
    label: 'Hopeful', title: 'vi–IV–I–V, starting in the shadow and leaning into the light — a suspended V, then home at last',
    major: [['vi'], ['IV'], ['I'], ['V'], ['vi'], ['IV'], ['Vsus4', 'V'], ['I']],
    minor: [['i'], ['VI'], ['III'], ['VII'], ['i'], ['VI'], ['VIIsus4', 'VII'], ['III']],
    mood: { colour: { '': 'add9', m: 'm7' }, exciter: true, high: 2.2, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'mixolydian', 'dorian'], fights: ['phrygian', 'harmonic'] },
    lifts: ['pivot', 'borrowed'],
  },
  // The tonic and the flat two a half-bar each, over and over — the menace of a boss
  // stage — turning on the big V. Dark leans on the flat two once a phrase; this one
  // never lets go of it. 3 Oct 2026.
  boss: {
    label: 'Boss Fight', title: 'The tonic and the flat two, a half-bar each, never letting go — turning on the big V',
    minor: [['i', 'bII'], ['i', 'bII'], ['i', 'bII'], ['VI', 'V'], ['i', 'bII'], ['i', 'bII'], ['iv', 'bII'], ['V']],
    major: [['I', 'bII'], ['I', 'bII'], ['I', 'bII'], ['bVI', 'V'], ['I', 'bII'], ['I', 'bII'], ['iv', 'bII'], ['V']],
    mood: { colour: { '': '', m: 'm' }, exciter: true, high: 2, preferMinor: true, walk: 'dark' },
    modes: { suits: ['harmonic', 'phrygian', 'minor'], fights: ['major', 'lydian', 'mixolydian'] },
    bass: 'gallop',
    lifts: ['walkup', 'pivot'],
  },
  // The Andalusian cadence, i–VII–VI–V, two chords a bar and round again, resting on the
  // big V at the end. Gothic opens with the same descent a chord a bar and then turns to
  // the church (a plagal iv, organ and bells); this one is the flamenco guitar's. 3 Oct 2026.
  andalusian: {
    label: 'Andalusian', title: 'The flamenco descent, i–VII–VI–V, two chords a bar — resting on the big V',
    minor: [['i', 'VII'], ['VI', 'V'], ['i', 'VII'], ['VI', 'V'], ['i', 'VII'], ['VI', 'V'], ['iv', 'VI'], ['V']],
    major: [['vi', 'V'], ['IV', 'III'], ['vi', 'V'], ['IV', 'III'], ['vi', 'V'], ['IV', 'III'], ['ii', 'IV'], ['III']],
    mood: { colour: { '': '', m: 'm' }, exciter: false, high: 1.5, preferMinor: true, walk: 'dark' },
    modes: { suits: ['harmonic', 'phrygian', 'minor'], fights: ['major', 'lydian', 'mixolydian'] },
    lifts: ['pivot', 'walkup'],
  },
  // I–♭III–IV–V: one chord for a long stretch over a sequencer bass going round and
  // round, then the whole thing shifting up in blocks. Its own lift is the plain jump — the song
  // moves in blocks, never by a lead-in. 3 Oct 2026.
  hypnotic: {
    label: 'Hypnotic', title: 'One chord for a long stretch over a sequencer bass, then shifting up in blocks — I–♭III–IV–V',
    major: [['I'], ['I'], ['I'], ['I'], ['bIII'], ['bIII'], ['IV'], ['V']],
    minor: [['i'], ['i'], ['i'], ['i'], ['III'], ['III'], ['IV'], ['V']],
    mood: { colour: { '': '', m: 'm' }, exciter: true, high: 2, preferMinor: false, walk: 'bright' },
    modes: { suits: ['mixolydian', 'major', 'dorian'], fights: ['phrygian', 'harmonic'] },
    bass: 'sequencer',
    lifts: ['straight', 'walkup'],
  },
  // The Latin party (5 Oct 2026, with Merenhouse). Major is merengue and cumbia's: the tonic
  // and its dominant seventh, the IV once, in plain triads. Minor is the son montuno vamp,
  // i–iv–V7 going round. Not the Andalusian descent, which is its own mood. Written from
  // the general idea of the music, not checked against the records.
  fiesta: {
    label: 'Fiesta', title: 'The Latin party: merengue\'s tonic and dominant seventh in major, the montuno vamp i–iv–V7 in minor',
    major: [['I'], ['V7'], ['V7'], ['I'], ['I'], ['IV'], ['V7'], ['I']],
    minor: [['i'], ['iv'], ['V7'], ['iv'], ['i'], ['iv'], ['V7'], ['i']],
    mood: { colour: { '': '', m: 'm' }, exciter: true, high: 2, preferMinor: false, walk: 'bright' },
    modes: { suits: ['major', 'minor', 'mixolydian'], fights: ['phrygian', 'lydian'] },
    bass: 'rootFifth',
    lifts: ['pivot', 'walkup'],
  },
});

/** How the first nine moods change key. */
const OWN_LIFTS = {
  anthemic: ['pivot', 'walkup'], uplifting: ['pivot', 'borrowed'], euphoric: ['borrowed', 'pivot'],
  moody: ['twostep', 'pivot'], dark: ['walkup', 'pivot'], gothic: ['pivot', 'walkup'],
  heroic: ['borrowed', 'pivot'], nostalgic: ['twostep', 'borrowed'], funky: ['twostep', 'walkup'],
};

/** The approaches a mood changes key by, its own first. */
export const moodLifts = (mood) => SHARED_MOODS[mood]?.lifts || OWN_LIFTS[mood] || ['pivot'];

/** A style with the shared moods filled in wherever it has none of its own. */
export function withSharedMoods(style) {
  const progressions = { ...style.progressions };
  const moods = { ...style.moods };
  for (const [id, m] of Object.entries(SHARED_MOODS)) {
    progressions[id] ||= { major: m.major, minor: m.minor };
    moods[id] ||= m.mood;
  }
  return { ...style, progressions, moods };
}
