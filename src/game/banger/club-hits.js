// THE CLUB'S OWN SOUNDS — the floor pads and Fernwick's build. 5 Oct 2026.
//
// What a player plays ON TOP of the song in the club, built from plain Web Audio nodes and
// handed the song's own bus (Audio.musicBus), so it sits in the mix: under the song's trim
// and through whatever hero move has the master. Nothing here touches the song's lanes, so
// there is nothing to put back.
//
//   PADS    the dance floor, split in four across: a siren rising into the next bar line, a
//           clap, a crowd's shout and the DJ's air horn, the siren and the shout in the song's
//           key, each struck on the song's next sixteenth (club.js). The shout is a different
//           word each tap — HEY!, YEAH!, WOO!, LET'S GO!, JUMP!, AW YEAH!, PARTY!, GET DOWN!
//           (Peter, 5 Oct 2026: the siren over the crash, and more than the one phrase).
//   RISER   Fernwick's LONGBOW: a noise sweep with a tone under it, climbing for as long as
//           the bow is drawn and cut dead on the drop
//   ROLL    a snare roll under the riser, quickening bar by bar
//   TOYS    the beach ball's: a BOING in key when it is knocked back up, a CLANG when a rally
//           smashes it into the mirror ball, and a POP when it is double-tapped; and the
//           BLOOP of one of Lorenzo's fish diving through the floor
//
// Every builder takes the context, where to play and when, so the same code renders in an
// OfflineAudioContext for auditioning.

/**
 * Each hit's gain at the music bus, levelled the way the voice library levels a preset
 * (tools/measure-voices.js): one hit in a four-second window, its K-weighted RMS and its
 * peak against the lane it stands in for (LANE_TARGETS in src/data/voices.js), the gain the
 * geometric mean of the two ratios. The clap against the clap lane, a roll hit against the
 * snare; the shout against the shout lane, 5 dB over, because it is played to be heard over
 * the song; the siren against a lead note 8 dB over and the air horn 6 (Peter, 5 Oct 2026: "a
 * bit louder", then "siren can come up a bit in volume as can the voices": both 2 dB up). The clap's slaps are 3 dB over its lane, as the band's own clap is played
 * (CLAP_OVER_DB), its crowd 5 dB under them and its hall 7 — 4.4 dB over in all, and with the
 * DRUMS fader on top (club.js drumScale). (Peter, 5 Oct 2026: "the clap sounds need to be
 * louder" at the lane's level, "could be louder and a bigger clap sound" at 5 over, "too loud
 * now" at 9.4, "can come down a little" at 6.4.) The riser's is its peak at the top of the sweep. The
 * vacuum's blast is 3 dB over the speaker's boom (+8.7 dB over the kick lane to its +5.8): the
 * biggest bang in the room. Measured 5 Oct 2026 (work/local/club-hits-level.mjs,
 * club-hits-level2.mjs, club-blast-level.mjs).
 */
export const HIT_GAINS = Object.freeze({
  siren: 0.089, clap: 0.548, shout: 1.26, roll: 0.216, riser: 0.17,
  boing: 0.1, clang: 0.1, pop: 0.3, bloop: 0.12, boom: 0.3, turbo: 0.16, blast: 0.24,
});
const gainOf = (name) => HIT_GAINS[name] ?? 0;

/** The four pads, left to right across the floor. */
export const PADS = Object.freeze([
  { id: 'siren', label: 'SIREN!', col: '#ffd23f' },
  { id: 'clap', label: 'CLAP!', col: '#ff4fa3' },
  { id: 'shout', label: 'HEY!', col: '#7cff6b' },
  { id: 'horn', label: 'AIR HORN!', col: '#3fb8ff' },   // (Peter, 5 Oct 2026: "say air horn instead of horn")
]);

/**
 * THE CLAP, HELD (Peter, 5 Oct 2026): claps on the 2 and the 4 for as long as the pad is
 * held, and every two to four bars a fill in the bar's last beat in place of its clap on the
 * 4 — four sixteenths, two eighths, two sixteenths and an eighth, or an eighth and two
 * sixteenths. Steps are sixteenths of the bar, 0–15. A tap is the one clap.
 */
export const CLAP_BEATS = Object.freeze([4, 12]);
export const CLAP_FILLS = Object.freeze([[12, 13, 14, 15], [12, 14], [12, 13, 14], [12, 14, 15]]);
/** Whether a held clap claps on sixteenth `inBar` of a bar, ending in `fill` (or none). */
export const clapsAt = (inBar, fill = null) => (fill && inBar >= 12 ? fill.includes(inBar) : CLAP_BEATS.includes(inBar));

/**
 * The shout pad's words, in turn (Peter, 5 Oct 2026: LET'S GO!, JUMP!, AW YEAH!, PARTY! and GET
 * DOWN! in, OI! and HO! out). Each is one or more SYLLABLES, sung in order by the crowd's throats:
 * a breath (the H) or not; `start` and `end`, a consonant's burst of noise at the band it lives
 * in ([Hz, seconds, level] — a T's hiss, a G's knock, a P's pop); how long its vowel is; `pitch`,
 * where it sits against the others (the stressed one up); `rise`, how its pitch moves from start
 * to end, as a ratio; and its three formants' glide, [F1, F2, F3], from `from` to `to` — read as
 * the vowel moving. `gap` is the breath between it and the one before. `gain` is the word's own
 * level, against the shout lane and 3 dB over it, as HIT_GAINS (the shout's there is 1).
 */
export const SHOUTS = Object.freeze([
  { word: 'HEY!', gain: 0.29, syllables: [
    { breath: true, dur: 0.36, rise: 0.86, from: [700, 1750, 2650], to: [470, 2250, 2950] }] },
  { word: 'YEAH!', gain: 0.274, syllables: [
    { dur: 0.38, rise: 0.82, from: [320, 2100, 2800], to: [760, 1250, 2500] }] },
  { word: 'WOO!', gain: 0.227, syllables: [
    { dur: 0.42, rise: 1.3, from: [300, 640, 2300], to: [360, 820, 2400] }] },
  { word: "LET'S GO!", gain: 0.223, syllables: [
    { dur: 0.12, rise: 0.97, from: [380, 1200, 2500], to: [540, 1820, 2500], end: [5200, 0.07, 0.5] },
    { gap: 0.025, pitch: 1.12, start: [1500, 0.018, 0.35], dur: 0.36, rise: 0.84, from: [520, 900, 2400], to: [420, 760, 2350] }] },
  { word: 'JUMP!', gain: 0.357, syllables: [
    { start: [2600, 0.06, 0.6], dur: 0.24, rise: 0.9, from: [620, 1250, 2500], to: [300, 1000, 2400], end: [900, 0.03, 0.5] }] },
  { word: 'AW YEAH!', gain: 0.201, syllables: [
    { dur: 0.22, rise: 0.95, from: [640, 980, 2450], to: [570, 840, 2400] },
    { gap: 0.02, pitch: 1.12, dur: 0.36, rise: 0.82, from: [320, 2100, 2800], to: [760, 1250, 2500] }] },
  { word: 'PARTY!', gain: 0.218, syllables: [
    { start: [1200, 0.02, 0.5], pitch: 1.08, dur: 0.18, rise: 0.97, from: [730, 1100, 2450], to: [680, 1200, 2450] },
    { gap: 0.03, start: [4200, 0.025, 0.45], dur: 0.2, rise: 0.85, from: [300, 2200, 3000], to: [270, 2300, 3000] }] },
  { word: 'GET DOWN!', gain: 0.259, syllables: [
    { start: [1600, 0.018, 0.35], dur: 0.11, rise: 0.97, from: [500, 1750, 2480], to: [540, 1840, 2480], end: [4000, 0.02, 0.35] },
    { gap: 0.04, start: [3200, 0.02, 0.4], pitch: 1.1, dur: 0.38, rise: 0.8, from: [740, 1100, 2450], to: [320, 900, 2300] }] },
]);

// Two seconds of white noise per context, shared by every hit. Seeded, so a render repeats.
const NOISE = new WeakMap();
function noiseBuffer(ctx) {
  let b = NOISE.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 0x2545f491;
    for (let i = 0; i < d.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      d[i] = seed / 2147483648 - 1;
    }
    NOISE.set(ctx, b);
  }
  return b;
}

function noise(ctx, when, seconds, { loop = false, offset = 0 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx);
  s.loop = loop;
  s.start(when, offset % 1.9);
  if (Number.isFinite(seconds)) s.stop(when + seconds);
  return s;
}

function filter(ctx, type, frequency, Q = 0.7, gain = 0) {
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = frequency; f.Q.value = Q;
  if (gain) f.gain.value = gain;
  return f;
}

function osc(ctx, type, frequency, when, seconds) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(frequency, when);
  o.start(when); o.stop(when + seconds);
  return o;
}

/** A gain that is silent until `when`, then `peak` after `attack`, falling to nothing over `decay`. */
function hitEnvelope(ctx, when, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(1e-5, peak * 1e-4), when + attack + decay);
  return g;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

/** A pitch in a register: `hz` moved by octaves into [lo, hi). */
const inRange = (hz, lo, hi) => {
  let f = hz > 0 ? hz : 220;
  while (f < lo) f *= 2;
  while (f >= hi) f /= 2;
  return f;
};

// ---------------------------------------------------------------- the pads

/**
 * THE SIREN, A RISE (Peter, 5 Oct 2026: "a siren that went up in pitch, like a rise"): a
 * wind-up siren climbing two octaves from where it is struck to the bar line it is given
 * (`until`; a bar long without one), swelling as it goes and landing on the song's tonic as
 * it is cut, on the downbeat — a warble on it all the way up, and the dub echo, a dotted
 * eighth behind, carrying it on past the line.
 */
function siren(ctx, out, when, { tonic = 440, sixteenth = 0.12, until = null } = {}) {
  const s = Math.max(0.07, Math.min(0.2, sixteenth));
  const end = until != null && until > when + s * 4 ? until : when + s * 16;
  const len = end - when;
  const top = inRange(tonic, 700, 1400);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(0.3, when + 0.03);
  env.gain.exponentialRampToValueAtTime(1, end - 0.01);
  env.gain.linearRampToValueAtTime(0, end + 0.02);
  // the warble: a sine on the pitch, as deep in hertz as the pitch is high
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(5.5, when);
  lfo.frequency.linearRampToValueAtTime(8, end);
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(top / 4 * 0.025, when);
  depth.gain.exponentialRampToValueAtTime(top * 0.025, end);
  lfo.connect(depth);
  lfo.start(when); lfo.stop(end + 0.05);
  const tone = filter(ctx, 'lowpass', 1500, 0.9);
  tone.frequency.setValueAtTime(1500, when);
  tone.frequency.exponentialRampToValueAtTime(7000, end);
  for (const [type, ratio, level] of [['square', 1, 0.55], ['sawtooth', 1.003, 0.3], ['sine', 0.5, 0.5]]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(top / 4 * ratio, when);
    o.frequency.exponentialRampToValueAtTime(top * ratio, end);
    const d = ctx.createGain();
    d.gain.value = ratio;
    chain(depth, d, o.frequency);
    o.start(when); o.stop(end + 0.05);
    const g = ctx.createGain();
    g.gain.value = level;
    chain(o, g, tone);
  }
  const voice = chain(tone, filter(ctx, 'highpass', 180, 0.7), env);
  voice.connect(out);
  // the echo: three sixteenths behind, dimmer each time round, darker as it goes
  const delay = ctx.createDelay(1);
  delay.delayTime.value = s * 3;
  const fb = ctx.createGain();
  fb.gain.value = 0.42;
  const send = ctx.createGain();
  send.gain.value = 0.45;
  voice.connect(send);
  chain(send, delay, filter(ctx, 'lowpass', 2600, 0.7), fb, delay);
  fb.connect(out);
  // a loop of nodes is never let go on its own: open it once the echo has died away
  const tail = end + s * 3 * 8;
  fb.gain.setValueAtTime(0.42, tail - 0.05);
  fb.gain.linearRampToValueAtTime(0, tail);
  if (typeof setTimeout === 'function') {
    setTimeout(() => { try { fb.disconnect(); delay.disconnect(); } catch { /* gone */ } },
      Math.max(0, (tail - ctx.currentTime) * 1000 + 200));
  }
}

/** A stereo panner at `pan` (a plain gain where the context has none). */
function panner(ctx, pan) {
  const p = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : ctx.createGain();
  if (p.pan) p.pan.value = pan;
  return p;
}

/** One clap of the hands: three slaps a hair apart and a fourth with the room behind it. */
function slaps(ctx, out, when) {
  const src = chain(noise(ctx, when, 0.4, { offset: 0.37 }), filter(ctx, 'highpass', 650, 0.7), filter(ctx, 'bandpass', 1150, 1.1));
  const g = ctx.createGain();
  const p = g.gain;
  p.setValueAtTime(0, when);
  for (const o of [0, 0.0095, 0.0195]) {
    p.setValueAtTime(1, when + o);
    p.exponentialRampToValueAtTime(0.08, when + o + 0.0085);
  }
  p.setValueAtTime(1, when + 0.031);
  p.exponentialRampToValueAtTime(0.0005, when + 0.031 + 0.22);
  src.connect(g);
  g.connect(out);
}

/**
 * The crowd round the clap: [delay (s), pan, band (Hz), level] — two more pairs of hands a
 * few milliseconds behind it, out to either side, each its own pitch of slap. Then the hall
 * it is clapped in: CLAP_HALL, a tail each side, wide.
 */
const CLAP_CROWD = Object.freeze([[0.007, -0.6, 1000, 0.78], [0.016, 0.6, 1550, 0.7]]);
const CLAP_HALL = 0.226;
/**
 * How far over its lane (dB) the band's own clap is played on the pad: the library levels a
 * preset to the clap lane (voiceGain), and the pad stands this far above it — where the
 * pad's own slaps stand, HIT_GAINS.clap (club.js clapHand).
 */
export const CLAP_OVER_DB = 3;

/**
 * THE CLAP, BIGGER (Peter, 5 Oct 2026: "louder and a bigger clap sound (or a different clap
 * sound depending on the current style)"). In the middle, the band's own clap: `hand` plays
 * the kit's clap preset on the engine (club.js clapHand), so a big-room take claps its
 * big-room clap, an 808 kit its 808 clap, 8-BIT the game's own; given none, the slaps. Round
 * it a crowd and a hall (CLAP_CROWD), the same for every style.
 */
function clap(ctx, out, when, { hand = null } = {}) {
  if (!(hand && hand(out, when) !== false)) slaps(ctx, out, when);
  for (const [delay, pan, band, level] of CLAP_CROWD) {
    const t = when + delay;
    const g = ctx.createGain();
    const p = g.gain;
    p.setValueAtTime(0, t);
    for (const o of [0, 0.008]) {
      p.setValueAtTime(level, t + o);
      p.exponentialRampToValueAtTime(level * 0.08, t + o + 0.007);
    }
    p.setValueAtTime(level, t + 0.017);
    p.exponentialRampToValueAtTime(level * 5e-4, t + 0.017 + 0.13);
    chain(noise(ctx, t, 0.2, { offset: 0.61 + delay * 40 }), filter(ctx, 'highpass', 700, 0.7),
      filter(ctx, 'bandpass', band, 1.2), g, panner(ctx, pan), out);
  }
  for (const [pan, offset] of [[-0.75, 0.53], [0.75, 1.21]]) {
    const t = when + 0.018;
    chain(noise(ctx, t, 0.95, { offset }), filter(ctx, 'bandpass', 1250, 0.6), filter(ctx, 'lowpass', 6000, 0.7),
      hitEnvelope(ctx, t, CLAP_HALL, 0.014, 0.8), panner(ctx, pan), out);
  }
}

/**
 * A crowd shouting `word` (SHOUTS): four throats a few milliseconds apart, at the song's
 * tonic, an octave under it, a fifth over it and a hair sharp, so the shout is a chord in key
 * rather than a smear. Each sings the word's syllables in turn: its consonants as bursts of
 * noise (a breath for an H), and its vowel as a sawtooth through three formants gliding across
 * it, its pitch moving the way that word is shouted — falling for most, rising for a WOO!.
 */
function shout(ctx, out, when, { tonic = 220, word = SHOUTS[0] } = {}) {
  const w = typeof word === 'string' ? SHOUTS.find((x) => x.word === word) || SHOUTS[0] : word;
  const f0 = inRange(tonic, 165, 330);
  const throats = [[0, 1, -0.3], [0.008, 0.5, 0.35], [0.015, 1.498, -0.1], [0.022, 1.004, 0.25]];
  for (const [delay, ratio, pan] of throats) {
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : ctx.createGain();
    if (panner.pan) panner.pan.value = pan;
    const level = ctx.createGain();
    level.gain.value = w.gain ?? 1;
    chain(panner, level, out);
    const burst = ([hz, dur, gain], at, k) => chain(noise(ctx, at, dur + 0.04, { offset: delay * 31 + k * 0.37 }),
      filter(ctx, 'bandpass', hz, 0.9), hitEnvelope(ctx, at, gain, 0.003, dur), panner);
    let t = when + delay;
    w.syllables.forEach((syl, n) => {
      t += syl.gap || 0;
      if (syl.breath) burst([1700, 0.07, 0.22], t, n);
      if (syl.start) burst(syl.start, t, n + 0.5);
      // the vowel
      const v = t + (syl.breath ? 0.035 : syl.start ? syl.start[1] * 0.6 : 0.005);
      const end = v + syl.dur;
      const f = f0 * ratio * (syl.pitch || 1);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * (syl.rise < 1 ? 1.16 : 0.92), v);
      o.frequency.exponentialRampToValueAtTime(f, v + Math.min(0.08, syl.dur * 0.4));
      o.frequency.exponentialRampToValueAtTime(f * syl.rise, end - 0.02);
      o.start(v); o.stop(end + 0.05);
      const vg = ctx.createGain();
      vg.gain.setValueAtTime(0, v);
      vg.gain.linearRampToValueAtTime(0.9, v + Math.min(0.03, syl.dur * 0.25));
      vg.gain.setValueAtTime(0.9, Math.max(v + 0.03, end - Math.min(0.16, syl.dur * 0.45)));
      vg.gain.exponentialRampToValueAtTime(0.001, end);
      o.connect(vg);
      syl.from.forEach((a, k) => {
        const fm = filter(ctx, 'bandpass', a, [5, 9, 12][k]);
        fm.frequency.setValueAtTime(a, v + Math.min(0.05, syl.dur * 0.3));
        fm.frequency.exponentialRampToValueAtTime(syl.to[k], Math.max(v + 0.06, end - 0.04));
        const lg = ctx.createGain();
        lg.gain.value = [1, 0.6, 0.32][k];
        chain(vg, fm, lg, panner);
      });
      if (syl.end) burst(syl.end, end - 0.01, n + 0.8);
      t = end;
    });
  }
}

/**
 * THE AIR HORN, BY THE RECIPE — the dub sound system's (Peter, 5 Oct 2026, the second recipe:
 * "STILL NOT QUITE RIGHT FOR THE AIRHORN: READ THIS"). Two saws at A4, the second +15 cents, so
 * they beat like air through metal. FOUR notes (Peter: "its 4 notes and the 4th one is much
 * longer and pitches down"): three short hits, 60 ms on, on the song's sixteenths, each thrown up
 * 12 semitones and dropping to the note in 18 ms, the metallic clack; then the fourth, long — its
 * clack, and then straight down: an octave across its 0.8 s at full level, let go over 300 ms as
 * it ends. A 24 dB/oct low-pass at 3.5 kHz with a little resonance, then +6 dB
 * into a hard clipper. Then the sound system's space: a light tape echo an eighth of the song
 * behind, darker each time round (no reverb: CPU). On the song's tonic, between 347 Hz and an
 * octave up (a fifth under where it was: "a bit high"), and 35 cents sharp of it: in the song's
 * key, and a little sour.
 *
 *   A RECIPE   exactly that (the pad's: HORN_VARIANT)
 *   B SQUARE   the same with the second oscillator a square, as the recipe allows
 *   C FIRST    the first recipe, for comparison: G4, a slower 50 ms blat, vibrato, a bright room
 *
 * ?airhorn=<letter> plays one in the club (a dev build); work/local/airhorn-bakeoff.mjs renders
 * them, levelled, to work/auditions/airhorn/. Each `gain` puts it 6 dB over a lead note — A and B
 * 8 ("make a bit louder").
 */
export const HORN_VARIANT = 'A';
export const HORN_VARIANTS = Object.freeze({
  A: { name: 'RECIPE', gain: 0.116, dub: true, osc2: 'sawtooth' },
  B: { name: 'SQUARE', gain: 0.096, dub: true, osc2: 'square' },
  C: { name: 'FIRST', gain: 0.056 },
});
/** The first recipe's blasts, in sixteenths: [start, length, long]. */
export const HORN_BLASTS = Object.freeze([[0, 0.65, false], [1, 0.65, false], [2, 0.65, false], [3, 6, true]]);
const CLIPS = new Map();
/** A clipper's curve: `hard` flat at full scale past a whisker of knee, else tanh at `drive`. */
function clipCurve(drive, hard = false) {
  const key = `${drive}|${hard}`;
  let c = CLIPS.get(key);
  if (!c) {
    c = new Float32Array(1024);
    for (let i = 0; i < c.length; i++) {
      const x = (i / (c.length - 1) * 2 - 1) * drive;
      c[i] = hard ? Math.max(-1, Math.min(1, x)) * 0.98 : Math.tanh(x) / Math.tanh(drive);
    }
    CLIPS.set(key, c);
  }
  return c;
}
const ROOMS = new WeakMap();
/** A reverb's impulse, made once a context: `dark` the spring's (damped high), else a bright room. */
function roomIR(ctx, dark = false) {
  let byKind = ROOMS.get(ctx);
  if (!byKind) { byKind = {}; ROOMS.set(ctx, byKind); }
  const kind = dark ? 'dark' : 'bright';
  if (!byKind[kind]) {
    const sr = ctx.sampleRate, n = Math.ceil(sr * (dark ? 1.6 : 0.8));
    const b = ctx.createBuffer(2, n, sr);
    let seed = dark ? 0x5eed5eed : 0x1f2e3d4c;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2147483648 - 1);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const v = rnd() * Math.exp(-i / (sr * (dark ? 0.42 : 0.17))) * 0.5;
        // high damping: each sample a one-pole low-pass of the noise, darker as it goes
        if (dark) { const k = 0.18 * Math.exp(-i / (sr * 0.5)) + 0.04; lp += (v - lp) * k; d[i] = lp * 2.2; } else d[i] = v;
      }
      const refl = dark ? [[11, 0.35], [19, -0.3], [27, 0.25], [38, -0.2]] : [[7, 0.7], [13, 0.5], [23, 0.4], [31, 0.3], [44, 0.22]];
      for (const [ms, g] of refl) {
        const at = Math.floor(sr * (ms + ch * 1.7) / 1000);
        if (at < n) d[at] += g * (ch ? -1 : 1);
      }
    }
    byKind[kind] = b;
  }
  return byKind[kind];
}
/** Let `nodes` go once the sound through them has died away, at `until` (audio time). */
function letGo(ctx, nodes, until) {
  if (typeof setTimeout !== 'function') return;
  setTimeout(() => { for (const n of nodes) { try { n.disconnect(); } catch { /* gone */ } } },
    Math.max(0, (until - ctx.currentTime) * 1000 + 200));
}
/** THE RECIPE (A, B): the four hits and the long fifth into the dub space. */
function dubHorn(ctx, out, when, s, v, tonic = null) {
  // On the song's tonic, up where the recipe's A4 was taken (D5: "pitch up the airhorn overall"),
  // and a little sour: 35 cents sharp of it (Peter, 5 Oct 2026: "tune it to the song, but it
  // should be a little discordant"). D5 itself with no song to tune to.
  // ...and then down a fifth again (Peter: "horns are a bit high... maybe bring them down a 5th")
  const HZ = (tonic ? inRange(tonic, 347, 694) : 391) * 2 ** (35 / 1200);
  // FOUR notes: three short, and the fourth much longer, pitching down (Peter: "its 4 notes and
  // the 4th one is much longer and pitches down")
  const hits = [0, 1, 2].map((k) => [when + k * s, 0.06, false]);
  const longAt = when + 3 * s, longOn = 0.8;   // shorter (Peter: "the length of the last airhorn note could be lower")
  hits.push([longAt, longOn, true]);
  // the voice: 24 dB/oct low-pass at 3.5 kHz, a little resonance, then +6 dB into a hard clip
  const voice = ctx.createGain();
  voice.gain.value = 0.5;
  const drive = ctx.createGain();
  drive.gain.value = 2;    // +6 dB
  const clip = ctx.createWaveShaper();
  clip.curve = clipCurve(1, true);
  clip.oversample = '2x';
  const body = chain(voice, filter(ctx, 'lowpass', 3500, 1.0), filter(ctx, 'lowpass', 3500, 0.75), drive, clip);
  const dry = ctx.createGain();
  dry.gain.value = 1;
  chain(body, dry, out);
  // the sound system's space: a tape echo an eighth behind, darker each time — kept light, and no
  // reverb at all (Peter, 5 Oct 2026: "probably doesnt need so much echo and reverb - worried
  // about cpu"; it had a convolver, 35% wet, and the echo fed back half)
  const end = longAt + longOn + 0.4;
  const tail = end + 2 * s * 4;
  const echo = ctx.createDelay(1);
  echo.delayTime.value = Math.min(0.95, 2 * s);
  const fb = ctx.createGain();
  fb.gain.value = 0.3;
  const send = ctx.createGain();
  send.gain.value = 0.3;
  const tape = filter(ctx, 'lowpass', 2600, 0.7);
  chain(body, send, echo, tape, fb, echo);
  const echoOut = ctx.createGain();
  echoOut.gain.value = 1;
  chain(tape, echoOut, out);
  fb.gain.setValueAtTime(0.3, tail - 0.05);
  fb.gain.linearRampToValueAtTime(0, tail);
  letGo(ctx, [fb, echo, tape], tail + 0.3);
  for (const [t, on, long] of hits) {
    const off = t + on;
    // the VCA: 1 ms in; a hit shut at once; the long one full through its fall, then let go
    // over 300 ms, exponentially
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.001);
    env.gain.setValueAtTime(1, off);
    if (long) env.gain.setTargetAtTime(0, off, 0.3 / 4);
    else env.gain.linearRampToValueAtTime(0, off + 0.004);
    env.connect(voice);
    for (const [type, cents] of [['sawtooth', 0], [v.osc2 || 'sawtooth', 15]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = HZ;
      // the clack: +12 semitones falling to the note in 18 ms
      o.detune.setValueAtTime(cents + 1200, t);
      o.detune.linearRampToValueAtTime(cents, t + 0.018);
      if (long) {
        // the fall, from the moment the clack lands (Peter: "the air horn starts to pitch down
        // immediately on the last note"): an octave down across the whole note, and on down
        // through the fade
        o.detune.linearRampToValueAtTime(cents - 1200, off);
        o.detune.setTargetAtTime(cents - 1500, off, 0.15);
      }
      o.start(t); o.stop(off + (long ? 0.6 : 0.02));
      const g = ctx.createGain();
      g.gain.value = 0.5;
      chain(o, g, env);
    }
  }
}
/** THE FIRST RECIPE (C), kept to compare. */
function firstHorn(ctx, out, when, s) {
  const last = HORN_BLASTS[HORN_BLASTS.length - 1];
  const end = when + (last[0] + last[1]) * s + 0.12;
  const clip = ctx.createWaveShaper();
  clip.curve = clipCurve(4);
  clip.oversample = '4x';
  const pre = ctx.createGain();
  pre.gain.value = 0.55;
  const post = chain(pre, clip, filter(ctx, 'highpass', 250, 0.7), filter(ctx, 'lowpass', 8000, 0.5));
  post.connect(out);
  if (typeof ctx.createConvolver === 'function') {
    const room = ctx.createConvolver();
    room.buffer = roomIR(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    chain(post, room, wet, out);
    letGo(ctx, [room], end + 1);
  }
  const lfo = osc(ctx, 'sine', 6, when, end - when);
  const vib = ctx.createGain();
  vib.gain.value = 20;
  lfo.connect(vib);
  for (const [at16, len16] of HORN_BLASTS) {
    const t = when + at16 * s, stop = t + len16 * s;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.003);
    env.gain.setValueAtTime(1, stop);
    env.gain.setTargetAtTime(0, stop, 0.02);
    env.connect(pre);
    [0, 15].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 392;
      o.detune.setValueAtTime(cents + 1200, t);
      o.detune.linearRampToValueAtTime(cents, t + 0.05);
      vib.connect(o.detune);
      o.start(t); o.stop(stop + 0.12);
      const g = ctx.createGain();
      g.gain.value = 0.5;
      chain(o, g, env);
    });
  }
}
function horn(ctx, out, when, { sixteenth = 0.12, variant = null, tonic = null } = {}) {
  const v = HORN_VARIANTS[variant] || HORN_VARIANTS[HORN_VARIANT];
  const s = Math.max(0.07, Math.min(0.2, sixteenth));
  if (v.dub) dubHorn(ctx, out, when, s, v, tonic); else firstHorn(ctx, out, when, s);
}

const PAD_BUILDERS = { siren, clap, shout, horn };

// ---------------------------------------------------------------- the beach ball's

/**
 * BOING: the ball knocked back up — the slap of a hand on vinyl and a triangle at `freq` that
 * scoops down onto its note and wobbles like a spring as it settles. A rally climbs the song's
 * scale one boing at a time (club.js rallyFreq).
 */
function boing(ctx, out, when, { freq = 440 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(freq * 1.5, when);
  o.frequency.exponentialRampToValueAtTime(freq, when + 0.03);
  const wobble = ctx.createOscillator();
  wobble.type = 'sine';
  wobble.frequency.value = 16;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(freq * 0.12, when);
  depth.gain.exponentialRampToValueAtTime(freq * 0.004, when + 0.35);
  chain(wobble, depth, o.frequency);
  o.start(when); o.stop(when + 0.45);
  wobble.start(when); wobble.stop(when + 0.45);
  chain(o, hitEnvelope(ctx, when, 1, 0.003, 0.4), out);
  chain(noise(ctx, when, 0.08, { offset: 0.71 }), filter(ctx, 'bandpass', 900, 0.8), hitEnvelope(ctx, when, 0.5, 0.001, 0.05), out);
}

/** CLANG: the ball into the mirror ball — a struck bell's inharmonic partials on the tonic. */
function clang(ctx, out, when, { tonic = 440 } = {}) {
  const f = inRange(tonic, 330, 660);
  for (const [ratio, level, decay] of [[1, 0.6, 2.2], [1.5, 0.25, 1.8], [2.76, 0.35, 1.6], [5.4, 0.22, 1], [8.93, 0.12, 0.6]]) {
    chain(osc(ctx, 'sine', f * ratio, when, decay + 0.1), hitEnvelope(ctx, when, level, 0.002, decay), out);
  }
  chain(noise(ctx, when, 0.06, { offset: 1.13 }), filter(ctx, 'highpass', 2500, 0.7), hitEnvelope(ctx, when, 0.6, 0.001, 0.04), out);
}

/** POP: a crack, a thump under it, and the vinyl flapping after. */
function pop(ctx, out, when) {
  chain(noise(ctx, when, 0.1, { offset: 0.29 }), filter(ctx, 'bandpass', 1800, 0.5), hitEnvelope(ctx, when, 1, 0.001, 0.07), out);
  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(160, when);
  thump.frequency.exponentialRampToValueAtTime(55, when + 0.09);
  thump.start(when); thump.stop(when + 0.15);
  chain(thump, hitEnvelope(ctx, when, 0.7, 0.001, 0.1), out);
  chain(noise(ctx, when + 0.03, 0.3, { offset: 0.91 }), filter(ctx, 'lowpass', 1200, 0.7), hitEnvelope(ctx, when + 0.03, 0.18, 0.005, 0.25), out);
}

/** BLOOP: one of Lorenzo's fish diving through the floor — a drop of water's rising tone and a little splash. */
function bloop(ctx, out, when) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(330, when);
  o.frequency.exponentialRampToValueAtTime(1300, when + 0.075);
  o.start(when); o.stop(when + 0.16);
  chain(o, hitEnvelope(ctx, when, 1, 0.004, 0.12), out);
  chain(noise(ctx, when + 0.012, 0.14, { offset: 1.37 }), filter(ctx, 'bandpass', 2600, 0.9), hitEnvelope(ctx, when + 0.012, 0.4, 0.002, 0.1), out);
}

/**
 * BOOM: a tap on a speaker (Peter, 5 Oct 2026) — the sub dropped: a sine thrown in at 110 Hz and
 * falling to 38 over most of a second, a knock on its front so a phone speaker hears where it
 * lands, and a little drive so the fall reads as weight rather than a hum.
 */
function boom(ctx, out, when) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, when);
  o.frequency.exponentialRampToValueAtTime(38, when + 0.75);
  o.start(when); o.stop(when + 1.1);
  const sh = ctx.createWaveShaper();
  const c = new Float32Array(512);
  for (let i = 0; i < c.length; i++) { const x = i / (c.length - 1) * 2 - 1; c[i] = Math.tanh(x * 1.8) / Math.tanh(1.8); }
  sh.curve = c;
  chain(o, hitEnvelope(ctx, when, 1, 0.004, 1.0), sh, out);
  const k = ctx.createOscillator();
  k.type = 'triangle';
  k.frequency.setValueAtTime(320, when);
  k.frequency.exponentialRampToValueAtTime(140, when + 0.04);
  k.start(when); k.stop(when + 0.1);
  chain(k, hitEnvelope(ctx, when, 0.45, 0.002, 0.07), out);
}

/**
 * TURBO: the vacuum cleaner tapped (Peter, 5 Oct 2026, the turbo hoover) — its motor revving up a
 * whine for `seconds` as it tears across the floor sucking everything up, cut dead where it blows
 * up (BLAST, played on the beat it ends on: club.js tapVacuum).
 */
function turbo(ctx, out, when, { seconds = 1.5 } = {}) {
  const end = when + seconds;
  const whine = ctx.createGain();
  whine.gain.setValueAtTime(0.0001, when);
  whine.gain.exponentialRampToValueAtTime(0.5, when + 0.15);
  whine.gain.exponentialRampToValueAtTime(1, end - 0.02);
  whine.gain.linearRampToValueAtTime(0, end + 0.01);
  for (const [ratio, level] of [[1, 0.7], [2.01, 0.35]]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150 * ratio, when);
    o.frequency.exponentialRampToValueAtTime(820 * ratio, end);
    o.start(when); o.stop(end + 0.05);
    const g = ctx.createGain();
    g.gain.value = level * 0.4;
    chain(o, g, whine);
  }
  const roar = filter(ctx, 'bandpass', 900, 0.8);
  roar.frequency.setValueAtTime(700, when);
  roar.frequency.exponentialRampToValueAtTime(2600, end);
  chain(noise(ctx, when, seconds + 0.05, { offset: 0.83 }), roar, whine);
  chain(whine, filter(ctx, 'lowpass', 5000, 0.7), out);
}

/**
 * BLAST: the turbo hoover blowing up out of the far side (Peter, 5 Oct 2026: "when the vacuum
 * explodes can we have a proper explode sound in time to the music"), struck on a beat (club.js
 * tapVacuum): a crack on the front, a fireball of noise with its lowpass falling through it, a
 * sub punch dropping away under it, driven so a phone hears the weight, a rumble rolling on,
 * and the debris — the confetti — pattering down after, thinning out. No reverb: the rumble is
 * the room (the club's CPU, Peter: "worried about cpu").
 */
/** A gain up to `peak` over `attack`, held `hold`, then dying away with time constant `tau`. */
function swell(ctx, when, peak, attack, hold, tau) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(peak, when + attack);
  g.gain.setTargetAtTime(0, when + attack + hold, tau);
  return g;
}

function blast(ctx, out, when) {
  // the crack
  chain(noise(ctx, when, 0.06, { offset: 0.37 }), filter(ctx, 'highpass', 1800, 0.7), hitEnvelope(ctx, when, 1.2, 0.0005, 0.04), out);
  // the fireball
  const fire = filter(ctx, 'lowpass', 3800, 1.3);
  fire.frequency.setValueAtTime(4200, when);
  fire.frequency.exponentialRampToValueAtTime(240, when + 0.8);
  chain(noise(ctx, when, 2, { loop: true, offset: 0.59 }), fire, swell(ctx, when, 1.2, 0.004, 0.05, 0.28), out);
  // the punch
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(92, when);
  o.frequency.exponentialRampToValueAtTime(28, when + 0.7);
  o.start(when); o.stop(when + 1.5);
  const sh = ctx.createWaveShaper();
  const c = new Float32Array(512);
  for (let i = 0; i < c.length; i++) { const x = i / (c.length - 1) * 2 - 1; c[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
  sh.curve = c;
  chain(o, hitEnvelope(ctx, when, 1.2, 0.003, 1.3), sh, out);
  // the rumble
  chain(noise(ctx, when + 0.03, 3.6, { loop: true, offset: 1.07 }), filter(ctx, 'lowpass', 190, 0.9), filter(ctx, 'lowpass', 190, 0.7),
    swell(ctx, when + 0.03, 3.2, 0.08, 0.2, 0.75), out);
  // the debris
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const times = Array.from({ length: 28 }, (_, k) => 0.08 + 1.5 * (k / 28) ** 1.7 + rnd() * 0.03).sort((a, b) => a - b);
  const patter = ctx.createGain();
  patter.gain.setValueAtTime(0, when);
  times.forEach((dt, k) => {
    patter.gain.setValueAtTime((0.8 + 2.2 * rnd()) * (1 - k / 34), when + dt);
    patter.gain.setTargetAtTime(0, when + dt, 0.006);
  });
  chain(noise(ctx, when, 1.8, { loop: true, offset: 1.83 }), filter(ctx, 'bandpass', 3400, 1.2), patter, out);
}

const TOY_BUILDERS = { boing, clang, pop, bloop, boom, turbo, blast };

/** The beach ball's sounds (`id` boing, clang or pop) at audio time `when`, as playPad. */
export function playToy(ctx, out, id, when, opts = {}) {
  const build = TOY_BUILDERS[id];
  if (!ctx || !out || !build) return false;
  const level = ctx.createGain();
  level.gain.value = gainOf(id);
  level.connect(out);
  build(ctx, level, Math.max(when, ctx.currentTime), opts);
  return true;
}

/**
 * Strike pad `id` at audio time `when` into `out`. `tonic` (Hz) puts the siren, the shout and
 * the horn in the song's key; `sixteenth` (seconds) paces the siren and spaces the horn's
 * blasts on the song's grid; `word` is the shout's (SHOUTS).
 */
export function playPad(ctx, out, id, when, opts = {}) {
  const build = PAD_BUILDERS[id];
  if (!ctx || !out || !build) return false;
  const level = ctx.createGain();
  // `opts.level` scales a pad as a fader does — the clap goes with the DRUMS fader (club.js)
  level.gain.value = (id === 'horn' ? (HORN_VARIANTS[opts.variant] || HORN_VARIANTS[HORN_VARIANT]).gain : gainOf(id)) * (opts.level ?? 1);
  level.connect(out);
  build(ctx, level, Math.max(when, ctx.currentTime), opts);
  return true;
}

// ---------------------------------------------------------------- Fernwick's build

/** One hit of the roll: noise through a snare's band, with a short tone for its body. */
export function rollHit(ctx, out, when, velocity = 1) {
  if (!ctx || !out) return;
  const v = Math.max(0, Math.min(1, velocity)) * gainOf('roll');
  const snap = hitEnvelope(ctx, when, v, 0.001, 0.09);
  chain(noise(ctx, when, 0.14, { offset: (when * 7.3) % 1 }), filter(ctx, 'highpass', 700, 0.7), filter(ctx, 'bandpass', 2100, 0.7), snap, out);
  const body = hitEnvelope(ctx, when, v * 0.45, 0.001, 0.06);
  chain(osc(ctx, 'triangle', 185, when, 0.1), body, out);
}

/**
 * THE RISER, from `when`, reaching the top `seconds` later and holding there: noise swept up
 * through a band (500 Hz to 9 kHz) and a saw climbing three octaves from under the tonic,
 * both swelling. `land(at)` cuts it dead at `at` — the drop — and `stop()` fades it now.
 *
 * Every ramp is ANCHORED where it has got to before it is changed: cancelling a ramp in
 * flight throws the ramp away and leaves the param on its previous event, a jump.
 */
export function startRiser(ctx, out, when, seconds, { tonic = 220 } = {}) {
  if (!ctx || !out) return null;
  const span = Math.max(0.25, seconds);
  const level = gainOf('riser');
  const g = ctx.createGain();
  g.connect(out);
  const n = noise(ctx, when, Infinity, { loop: true });
  const band = filter(ctx, 'bandpass', 500, 0.9);
  chain(n, filter(ctx, 'highpass', 250, 0.7), band, g);
  const lo = inRange(tonic, 55, 110);
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.start(when);
  const toneLevel = ctx.createGain();
  toneLevel.gain.value = 0.16;
  chain(o, filter(ctx, 'lowpass', 2600, 0.7), toneLevel, g);
  // [param, from, to]: each glides exponentially across the span, then holds
  const ramps = [[band.frequency, 500, 9000], [o.frequency, lo, lo * 8], [g.gain, level * 0.002, level]];
  for (const [p, a, b] of ramps) { p.setValueAtTime(a, when); p.exponentialRampToValueAtTime(b, when + span); }
  const valueAt = (a, b, t) => a * (b / a) ** Math.max(0, Math.min(1, (t - when) / span));
  let done = false;
  const reanchor = (from, until) => {
    for (const [p, a, b] of ramps) {
      p.cancelScheduledValues(from);
      p.setValueAtTime(valueAt(a, b, from), from);
      if (until > from) p.exponentialRampToValueAtTime(valueAt(a, b, until), until);
    }
  };
  const end = (at, fade) => {
    if (done) return;
    done = true;
    // where the ramps have got to now — or their start, if the drop comes before it
    reanchor(Math.min(Math.max(ctx.currentTime, when), at), at);
    g.gain.linearRampToValueAtTime(0, at + fade);
    try { n.stop(at + fade + 0.02); o.stop(at + fade + 0.02); } catch { /* already stopped */ }
  };
  return {
    /** Cut at `at`: the drop. */
    land(at) { end(Math.max(ctx.currentTime, at), 0.02); },
    /** Fade out now: leaving the floor. */
    stop() { end(ctx.currentTime, 0.05); },
  };
}
