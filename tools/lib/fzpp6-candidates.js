// FZPP-6's Gate A candidates: the patches the auditions render and the level test holds to
// an even loudness up the neck. Not catalogue presets yet — Stage 2 moves the picks into
// src/data/voices.js. Each is a voice-shaped object: the `fzpp6` block plus the shared
// voice-level controls (`mode`, `portamento`, `vibrato`) the SETTINGS card edits.
//
// `phrase` names what the audition plays (tools/render-fzpp6-auditions.js).

const none = { type: 'none', mix: 0 };

export const FZPP6_CANDIDATES = {
  steelAcoustic: { label: 'Steel acoustic', phrase: 'strum', fzpp6: {} },
  nylon: { label: 'Nylon classical', phrase: 'arpeggio', fzpp6: { exciter: { hardness: 0.25, position: 0.15, mix: 0.1 }, string: { decay: 3, damp: 0.15, stiffness: 0.05 }, body: { type: 'nylon', mix: 0.85 } } },
  palmMuted: { label: 'Palm-muted electric', phrase: 'chug', fzpp6: { exciter: { hardness: 0.9 }, string: { decay: 3, damp: 0.25, pickup: 'middleBridge' }, damping: { mute: 0.75 }, body: { type: 'none', mix: 0 } } },
  cleanElectric: { label: 'Clean electric', phrase: 'strum', fzpp6: { exciter: { hardness: 0.8 }, string: { decay: 4, damp: 0.3, stiffness: 0.1, pickup: 'neckMiddle' }, body: { type: 'none', mix: 0 } } },
  banjo: { label: 'Banjo', phrase: 'roll', fzpp6: { exciter: { hardness: 0.9, position: 0.1 }, string: { decay: 1.6, damp: 0.3, buzz: 0.1 }, body: { type: 'banjo', mix: 0.85 } } },
  harp: { label: 'Harp', phrase: 'arpeggio', fzpp6: { exciter: { hardness: 0.3, position: 0.3, mix: 0 }, string: { decay: 5, damp: 0.25, stiffness: 0.1, detune: 0 }, amp: { release: 3 }, body: { type: 'harp', mix: 0.8 }, strings: { tuning: 'free', tension: 3 } } },
  koto: { label: 'Koto', phrase: 'pentatonic', fzpp6: { exciter: { hardness: 0.9, position: 0.08 }, string: { decay: 2.5, damp: 0.35, buzz: 0.05 }, amp: { release: 1.5 }, body: { type: 'nylon', mix: 0.7, size: 1.3 }, strings: { tuning: 'free', tension: 25 } } },
  dulcimer: { label: 'Hammered dulcimer', phrase: 'arpeggio', fzpp6: { exciter: { type: 'impulse', hardness: 0.8, position: 0.12 }, string: { decay: 3, damp: 0.35, stiffness: 0.3, double: 'shimmer' }, amp: { release: 2 }, body: { type: 'steel', mix: 0.7, size: 0.8 }, strings: { tuning: 'free' } } },
  synthBass: { label: 'Plucked synth bass', phrase: 'bass', fzpp6: { exciter: { hardness: 0.7, mix: 0.1 }, string: { decay: 1.2, damp: 0.15, keyFollow: 0.2 }, filter: { type: 'lowpass', cutoff: 600, resonance: 2, keyTrack: 0.5 }, filterEnv: { amount: 2.5, attack: 0.001, decay: 0.25, sustain: 0 }, amp: { release: 0.12 }, body: { type: 'none', mix: 0 }, strings: { tuning: 'free', tension: 2, spread: 0 } } },
  kalimba: { label: 'Kalimba', phrase: 'pentatonic', fzpp6: { exciter: { type: 'impulse', hardness: 0.6, position: 0.3 }, string: { decay: 1.5, damp: 0.4, stiffness: 0.9, detune: 0 }, amp: { release: 1.2 }, body: { type: 'harp', mix: 0.6, size: 0.6 }, strings: { tuning: 'free', tension: 0 } } },
  filterSlam: { label: 'Filter-slam synth pluck', phrase: 'riff', fzpp6: { exciter: { type: 'noise', length: 0.01 }, string: { decay: 2, damp: 0.4 }, filter: { type: 'lowpass', cutoff: 300, resonance: 3 }, filterEnv: { amount: 5, attack: 0.001, decay: 0.18, sustain: 0 }, amp: { release: 0.2 }, body: { type: 'none', mix: 0 }, strings: { tuning: 'free', spread: 0.5 } } },
  acidPluck: { label: 'Resonant acid pluck', phrase: 'bass', fzpp6: { string: { decay: 1.5, damp: 0.3 }, filter: { type: 'lowpass', cutoff: 400, resonance: 9 }, filterEnv: { amount: 4, attack: 0.001, decay: 0.3, sustain: 0.1 }, amp: { release: 0.1 }, body: { type: 'none', mix: 0 }, strings: { tuning: 'free', spread: 0 } } },
  swelledString: { label: 'Swelled string pad', phrase: 'pad', fzpp6: { exciter: { type: 'noise', length: 0.4, position: 0.12 }, string: { decay: 6, damp: 0.4 }, amp: { attack: 0.6, decay: 1, sustain: 0.8, release: 1.2 }, body: { type: 'nylon', mix: 0.75 }, strings: { tuning: 'free' } },
  vibrato: { depth: 0.12, rate: 5, delay: 0.4 } },
  sitar: { label: 'Sitar', phrase: 'raga', mode: 'legato', portamento: 0.12, fzpp6: { exciter: { hardness: 0.9, position: 0.12 }, string: { decay: 4, damp: 0.5, buzz: 0.7 }, amp: { release: 2 }, body: { type: 'archtop', mix: 0.75, size: 1.4 }, strings: { tuning: 'free', tension: 10 } } },
  tanpura: { label: 'Tanpura drone', phrase: 'drone', fzpp6: { exciter: { hardness: 0.4, position: 0.2 }, string: { decay: 8, damp: 0.6, buzz: 0.8 }, amp: { release: 6 }, body: { type: 'archtop', mix: 0.7, size: 1.6 }, strings: { tuning: 'free', tension: 4 } } },
  twelveString: { label: '12-string', phrase: 'strum', fzpp6: { string: { double: 'octave' } } },
  mandolin: { label: 'Mandolin', phrase: 'tremolo', fzpp6: { exciter: { hardness: 0.95, position: 0.12 }, string: { decay: 1.5, damp: 0.35, double: 'shimmer', shimmer: 5 }, body: { type: 'archtop', mix: 0.8, size: 0.7 }, strings: { tuning: 'free' } } },
  electricNeck: { label: 'Electric, neck pickup', phrase: 'lick', fzpp6: { exciter: { hardness: 0.85 }, string: { decay: 4, damp: 0.3, pickup: 'neck' }, body: { type: 'none', mix: 0 } } },
  electricBridge: { label: 'Electric, bridge pickup', phrase: 'lick', fzpp6: { exciter: { hardness: 0.85 }, string: { decay: 4, damp: 0.3, pickup: 'bridge' }, body: { type: 'none', mix: 0 } } },
  bassNeck: { label: 'Bass, neck pickup', phrase: 'bass', fzpp6: { exciter: { hardness: 0.5, position: 0.15 }, string: { decay: 4, damp: 0.2, stiffness: 0.3, pickup: 'neck' }, amp: { release: 0.15 }, body: { type: 'none', mix: 0 }, strings: { tuning: 'free', spread: 0 } } },
  bassBridge: { label: 'Bass, bridge pickup', phrase: 'bass', fzpp6: { exciter: { hardness: 0.5, position: 0.15 }, string: { decay: 4, damp: 0.2, stiffness: 0.3, pickup: 'bridge' }, amp: { release: 0.15 }, body: { type: 'none', mix: 0 }, strings: { tuning: 'free', spread: 0 } } },
  funkRhythm: { label: 'Funk rhythm guitar', phrase: 'funk', fzpp6: { exciter: { hardness: 0.95, mix: 0.35, position: 0.14 }, string: { decay: 2.5, damp: 0.3, pickup: 'middleBridge' }, damping: { mutedBelow: 0.45, lift: 0.5, fret: 0.8, squeak: 0.7 }, amp: { release: 0.05 }, body: { type: 'none', mix: 0 }, strings: { tension: 4, spread: 0.35 } } },
  // Brighter: bridge pickup, the hardest pick, and highs that ring on (DAMP up).
  funkBright: { label: 'Funk rhythm guitar — bright', phrase: 'funk', fzpp6: { exciter: { hardness: 1, mix: 0.4, position: 0.1 }, string: { decay: 2.5, damp: 0.5, pickup: 'bridge' }, damping: { mutedBelow: 0.45, lift: 0.5, fret: 0.8, squeak: 0.7 }, amp: { release: 0.05 }, body: { type: 'none', mix: 0 }, strings: { tension: 4, spread: 0.35 } } },
  // Muted: palm on the strings the whole time, so even the accents are short and thick;
  // neck pickup and a softer pick for a rounder chk.
  funkMuted: { label: 'Funk rhythm guitar — muted', phrase: 'funk', fzpp6: { exciter: { hardness: 0.8, mix: 0.45, position: 0.16 }, string: { decay: 2.5, damp: 0.25, pickup: 'neckMiddle' }, damping: { mute: 0.6, mutedBelow: 0.45, lift: 0.6, fret: 0.8, squeak: 0.5 }, amp: { release: 0.04 }, body: { type: 'none', mix: 0 }, strings: { tension: 3, spread: 0.35 } } },
  slideGuitar: { label: 'Slide guitar', phrase: 'slide', mode: 'legato', portamento: 0.15, fzpp6: { exciter: { hardness: 0.8 }, string: { decay: 5, damp: 0.3, pickup: 'middle' }, amp: { release: 0.6 }, body: { type: 'none', mix: 0 }, strings: { tuning: 'free' } },
  vibrato: { depth: 0.15, rate: 5.5, delay: 0.2 } },
  // ---- Stage 3: bowed and blown (23 Oct 2026) -------------------------------------------------
  violin: { label: 'Violin', phrase: 'air', mode: 'legato', portamento: 0.06, fzpp6: {
    exciter: { type: 'bow', pressure: 0.55, speed: 0.6, noise: 0.12, position: 0.12 },
    string: { decay: 0.6, damp: 0.5 },
    amp: { attack: 0.08, release: 0.15 }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'violin', mix: 0.7 } },
  vibrato: { depth: 0.2, rate: 5.5, delay: 0.3 } },
  cello: { label: 'Cello', phrase: 'airLow', mode: 'legato', portamento: 0.08, fzpp6: {
    exciter: { type: 'bow', pressure: 0.6, speed: 0.45, noise: 0.15, position: 0.1 },
    string: { decay: 0.8, damp: 0.4 },
    amp: { attack: 0.12, release: 0.2 }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'cello', mix: 0.75 } },
  vibrato: { depth: 0.18, rate: 5, delay: 0.35 } },
  erhu: { label: 'Erhu', phrase: 'air', mode: 'legato', portamento: 0.15, fzpp6: {
    exciter: { type: 'bow', pressure: 0.7, speed: 0.5, noise: 0.2, position: 0.08 },
    string: { decay: 0.4, damp: 0.6 },
    amp: { attack: 0.05, release: 0.12 }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'violin', mix: 0.6, size: 0.8 } },
  vibrato: { depth: 0.3, rate: 6, delay: 0.15 } },
  stringSection: { label: 'String section', phrase: 'section', fzpp6: {
    exciter: { type: 'bow', pressure: 0.5, speed: 0.55, noise: 0.1, position: 0.12 },
    string: { decay: 0.7, damp: 0.45 },
    amp: { attack: 0.25, release: 0.4 }, strings: { tuning: 'free', tension: 0, spread: 0.7 },
    body: { type: 'cello', mix: 0.6, size: 1.2 } },
  vibrato: { depth: 0.15, rate: 5, delay: 0.4 } },
  clarinet: { label: 'Clarinet', phrase: 'air', mode: 'legato', fzpp6: {
    exciter: { type: 'reed', pressure: 0.55, reed: 0.5, bell: 0.5, noise: 0.08 },
    amp: { attack: 0.04, release: 0.08 }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'none', mix: 0 } } },
  saxLike: { label: 'Saxophone', phrase: 'airLow', mode: 'legato', portamento: 0.05, fzpp6: {
    exciter: { type: 'sax', pressure: 0.6, reed: 0.5, bell: 0.8, noise: 0.15 },
    amp: { attack: 0.03, release: 0.1 }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'none', mix: 0 } },
  vibrato: { depth: 0.15, rate: 5.5, delay: 0.3 } },
  flute: { label: 'Flute', phrase: 'airHigh', mode: 'legato', fzpp6: {
    exciter: { type: 'jet', pressure: 0.6, noise: 0.25 },
    amp: { attack: 0.06, release: 0.1 }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'none', mix: 0 } },
  vibrato: { depth: 0.12, rate: 5.2, delay: 0.4 } },
  panPipes: { label: 'Pan pipes', phrase: 'airHigh', fzpp6: {
    exciter: { type: 'jet', pressure: 0.45, noise: 0.6 },
    amp: { attack: 0.03, release: 0.06 }, strings: { tuning: 'free', tension: 0 },
    body: { type: 'none', mix: 0 } } },
  fretlessBass: { label: 'Fretless bass', phrase: 'bass', mode: 'legato', portamento: 0.12, fzpp6: {
    exciter: { hardness: 0.45, position: 0.2 },
    string: { decay: 4, damp: 0.2, stiffness: 0.3, pickup: 'neck' },
    amp: { release: 0.2 }, strings: { tuning: 'free', spread: 0 }, body: { type: 'none', mix: 0 } } },
  // A/B for the hand noises: the same funk part with FRET and SQUEAK off.
  funkNoHand: { label: 'Funk rhythm — FRET and SQUEAK off (A/B)', phrase: 'funk', ab: true, fzpp6: { exciter: { hardness: 0.95, mix: 0.35, position: 0.14 }, string: { decay: 2.5, damp: 0.3, pickup: 'middleBridge' }, damping: { mutedBelow: 0.45, lift: 0.5 }, amp: { release: 0.05 }, body: { type: 'none', mix: 0 }, strings: { tension: 4, spread: 0.35 } } },
  // The Gate A A/B pair on the steel acoustic.
  steelLaneBody: { label: 'Steel acoustic — 3-mode lane body (A/B)', phrase: 'strum', ab: true,
    fzpp6: { internal: { bodyMethod: 'lane', laneModes: 3 } } },
  steelCourse: { label: 'Steel acoustic — COURSE 4 cents (A/B)', phrase: 'strum', ab: true,
    fzpp6: { string: { double: 'shimmer' } } },
};
