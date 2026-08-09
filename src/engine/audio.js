// Web Audio: procedural SFX + a lookahead step-sequencer with per-cabinet
// pattern banks. Lazy init on first user gesture; ctx.resume() on every gesture (iOS).
import { renderCue, CONTACT_CUE, LAUNCH_CUE } from './weapon-sfx.js';
import { createMixer, dbToGain, AUX_DEFAULTS } from './mixer.js';
import { MAX_DELAY_SECONDS, makeReverb } from './effects.js';
import {
  laneList, laneEchoesIn, deskBank, soloBank, barPlan, invalidateBarPlan,
  LANE_KEYS, stepLen, toneLen, effectiveStepLen, effectiveToneLength,
} from './lanes.js';
import { VoiceRack, pulseTable } from './voices.js';
import { MIX, laneSettings } from '../data/mix.js';
import { VOICE_LANES, PERCUSSION_LANES, voiceOf, voiceGain, laneTrim, engineBankKeys, registerSongVoice, seamFor, baseLane } from '../data/voices.js';
import { trackIdOf } from '../data/tracks.js';
import {
  applyArrangement, resolveSection, loopOf, loopSteps, SWING_STRAIGHT, SWING_MAX,
} from '../data/arrangements.js';

// The scheduler runs on the main thread, alongside panel builds and layout work. A
// quarter-second of queued audio gives those unavoidable UI tasks room to finish
// without reaching the audible edge; scheduled timestamps do not move, and preview
// notes use their separate path below.
const SEQUENCER_LOOKAHEAD = 0.25;

/**
 * How much louder the melodic voices play than they were authored.
 *
 * The kit and the music were never written to a common level. Measured at unity
 * through the render pipeline — LANE_TARGETS in src/data/voices.js — one kick note
 * peaks at −9.6 dBFS where a lead note reaches −28.9 and an organ note −40.3. That
 * gap is not a balance anybody chose, and everything downstream was paying for it:
 *
 *   · every song's peak was one or two drum hits with the music 20 dB underneath,
 *     which is why the catalogue measured 25 dB of crest against a normal 13;
 *   · no song could be turned up, because the kick reached the ceiling first — all
 *     34 sat around −25 LUFS against a −16 target, and two clipped outright;
 *   · every channel on the desk read soft, because they were: the meters were
 *     telling the truth;
 *   · and per-song `musicTrim` reached 3.33 on the ONE song with no drums in it,
 *     which is the by-ear system compensating for exactly this.
 *
 * So the melodic voices are lifted to meet the kit once, here, instead of as a lane
 * gain on all 34 songs and every song written after them. One factor for all of them,
 * so the balance BETWEEN melodic parts — tuned by ear, song by song — is untouched;
 * the kit stays where it is, because it was never the odd one out.
 *
 * It multiplies the resolved gain, so a bank's own `bassGain` keeps its meaning
 * relative to its neighbours. LANE_TARGETS is measured from these voices, so after
 * changing this run `node tools/measure-voices.js` — the preset library normalises
 * against these numbers and would otherwise sit 10.9 dB below them.
 */
const MELODIC_TRIM = 3.5;                  // +10.9 dB

/**
 * How long one note sounds, in seconds, for the voice rack.
 *
 * `len` is what `stepLen` said about this step: nothing, a number of steps, or one
 * per chord tone. An array in gives an array out — the rack hands each tone of a
 * chord its own length — and everything else stays a scalar, so a melodic lane's
 * path through here is one multiply, in the order it was always written:
 * `spb * dur * durScale`. That grouping is deliberate. Reassociating it would be
 * a legal transformation of the arithmetic and an illegal one of the output, and
 * tests/null-test.js compares samples.
 */
const noteSeconds = (len, fallback, spb, durScale = 1, fixedLength = 0) => {
  const one = (i) => {
    // fixedLength is an absolute duration in seconds — a sound-design choice
    // that overrides everything else. Zero or omission means not set.
    if (fixedLength > 0) return fixedLength;
    const requested = toneLen(len, fallback, i);
    return spb * requested * durScale;
  };
  return Array.isArray(len) ? len.map((_, i) => one(i)) : one(0);
};

/**
 * A mix's voice block, merged onto the bank the sequencer will play.
 *
 * The voice block first, because it is bank keys and it merges as bank keys. Then the
 * song's OWN copies of presets, which take over the same keys — see registerSongVoice
 * for why a copy is put in the catalogue rather than handled as a second kind of
 * voice. Then any ENGINE preset still named after all that is expanded into the keys
 * it stands for — `{ bassVoice: 'engFilteredSaw' }` becomes `{ bassFilteredSaw: true }`
 * — so the hand-written voice in scheduleStep reads what it always read and there is
 * no second code path anywhere in the engine. A preset named on a lane it does not
 * apply to expands to nothing rather than to a surprise.
 *
 * Copies last of the two, deliberately: `voice` says which preset the lane is on and
 * `voiceParams` says what this song did to it, so the copy is the more specific answer
 * and has to win. A song can also carry a copy with no `voice` entry at all — a sound
 * that exists nowhere but in that song, which is what a preset saved to the song and
 * never to the library is.
 *
 * Hands back the same object when there is nothing to merge, which is every song that
 * has not been through the desk: the null path allocates nothing and changes nothing.
 */
function withVoices(bank, entry, trackId = null) {
  if (!bank || !entry || (!entry.voice && !entry.voiceParams)) return bank;
  const out = { ...bank, ...entry.voice };
  for (const [voiceKey, params] of Object.entries(entry.voiceParams || {})) {
    const id = registerSongVoice(voiceKey, trackId, params);
    if (id) out[voiceKey] = id;
  }
  for (const key of Object.keys(VOICE_LANES)) {
    const keys = engineBankKeys(voiceOf(out, key), key);
    if (keys) Object.assign(out, keys);
  }
  return out;
}

/**
 * Which of a bank's 32 steps a previewed note lands on (previewNote).
 *
 * Any step would sound the same. Not a multiple of four, though: the sequencer hands
 * every fourth step to its beat listeners, and a key pressed on the desk is not a
 * beat of the song — the visualisers would flash to it.
 */
const PREVIEW_STEP = 1;

// How long the audition bench takes to go quiet when a preview is stopped. See
// `_cutBenchGates`: short enough to read as a stop, long enough not to click.
const BENCH_FADE = 0.015;

// Layered and harmonically dense cues sum much louder than a single oscillator
// at the same nominal gain. These trims keep their perceived peaks close to the
// everyday jump/coin/UI family while preserving their internal balance.
// Weapon launch/contact assets get their own lower bus trim; regular SFX keep
// their established level and balance.
const ATTACK_MASTER_TRIM = 0.25;
// How far into the 'portal' cue its flash lands — the rest of the cue is the
// approach leading up to it and the exit falling away after.
//
// Exported because it is a LEAD TIME for the caller, not a private detail: a
// screen that wants the flash to coincide with something on-screen has to fire
// the cue this many seconds early. Firing it on the crossing instead put the
// rising half over the outgoing hero's exit, which reads as a beat late.
export const PORTAL_CUE_FLASH_AT = 0.20;
/**
 * The relay swoosh: what a hero being swapped out for another one sounds like.
 *
 * Two legs crossing in stereo, one going out and one coming in, and nothing at the seam
 * — no flash and no thump. The low sine the cue carries by default lands square in the
 * middle of the swoosh, which is where a swoosh wants nothing to happen; without it the
 * gesture is the whole sound. `swell` is load-bearing: the incoming leg was written as a
 * departure and attacks in 4% of its length, which dragged forward by `overlap` arrives
 * with nothing in front of it and reads as a drum hit. Measured, that is a 79ms rise
 * against 188ms for the cue this replaced; at 0.5 it is 316ms and unmistakably a build.
 *
 * Picked by ear from renders — `node tools/render-cues.js portal:wired@9`.
 */
export const PORTAL_RELAY = {
  stretch: 2.4, thump: 0, flash: 0, pan: 1, overlap: 0.18,
  q: 0.8, spread: 1.6, wet: 1.4, swell: 0.5, body: 1,
};

/**
 * How loud to fire it. RMS -33 dBFS, which is where `tag` sits — the cue that fires
 * alongside it on a swap — with peak still under `boom` (-11.7), the loudest thing the
 * game already plays.
 *
 * Came down twice as the cue grew its low end, and for two different reasons. First from
 * 9 to 7, because `body` put 2.3dB of RMS on it for free and took it past that ceiling —
 * MORE SUBSTANCE IS NOT MORE LEVEL. Then from 7 to 5.5 by ear, because weight reads as
 * loudness: a cue with bottom end in it does not need as much of everything else to be
 * heard, and the number that was right without one is too much with one.
 */
export const PORTAL_RELAY_GAIN = 5.5;

/**
 * The two halves, fired at the two moments that are actually knowable.
 *
 * A player can jump as late as 0.162s before a portal and still clear it — measured from
 * BASE_JUMP_V and GRAVITY against the portal's 40-unit height — while the whole cue needs
 * 0.488s of lead for its loudest moment to land on the crossing. Three times longer than
 * the window in which the outcome is decided, so no amount of prediction can tell you in
 * time whether the portal is being taken. It was tried; it fired on every late jump.
 *
 * Split, neither half has to know. IN is the rise, and it plays because a portal is there
 * — take it or jump it, all it ever says is "doorway". OUT is the fall, fired on the
 * crossing itself, which needs no lead at all because it has already happened.
 *
 * OUT drops the swell: that floor exists because the fall, dragged under an approach,
 * arrived with nothing in front of it and read as a drum hit. Here there IS something in
 * front of it — the rise, still ringing — so it can attack the way it was written to.
 */
export const PORTAL_RELAY_IN = { ...PORTAL_RELAY, legs: 'in', stretch: 1.2 };
export const PORTAL_RELAY_OUT = { ...PORTAL_RELAY, legs: 'out', swell: 0 };

/**
 * The rise is the quiet half, and deliberately.
 *
 * It plays on approach whether or not the portal is taken, so it has to be able to be
 * wrong without being annoying — and keeping it under the fall is what makes going
 * through pay off. Arriving at a doorway and going through one should not be the same
 * size of event.
 */
export const PORTAL_RELAY_IN_GAIN = 4;

/**
 * The credits' version: the same gesture, given room to breathe.
 *
 * In a run the rise has to be short because nobody has decided yet whether they are
 * taking the portal, and a long approach is a long chance to be wrong. The credits have
 * no such problem — the four hand-offs are on a schedule computed at load, tens of
 * seconds apart, each with about 4.8s of runway before its swap. Nothing to predict and
 * nothing to collide with, so the swoosh can take its time.
 *
 * The lead follows automatically: portalCueFlashAt scales with `stretch`, and the credits
 * subtract exactly that from each swap time.
 */
export const PORTAL_RELAY_CREDITS = { ...PORTAL_RELAY, stretch: 3 };

/** Where the flash lands for a given portalSwoosh `stretch` — what a caller must lead by. */
export const portalCueFlashAt = (shape) => PORTAL_CUE_FLASH_AT * (shape?.stretch ?? 1);

// The portal's room. Decay is deliberately longer than the cue itself (~0.5s):
// the tail outlasting the swoosh is what sells the doorway as opening onto
// somewhere, rather than as a noise that happens near a prop. It still clears
// well before the next hand-off, which is ~19s away at the crawl's speed.
const PORTAL_VERB_DECAY = 1.6;
// Master depth for that room — the one number to move if the whole cue wants to
// be wetter or drier. Per-layer amounts in portalSwoosh() scale against it, so
// their balance survives a change here.
// Scaled against Blink's fixed 0.00125/rms ConvolverNode normalisation, which is
// a deep enough cut that useful values here sit near 1 rather than well under it.
// Walked back from 1.5: that read as a bigger room than the moment wants — this
// is a doorway in a credits crawl, not a cathedral. The tail is still clearly
// there, it just sits under the cue instead of beside it.
const PORTAL_VERB_SEND = 0.9;

const SFX_TRIM = {
  blockBreak: 0.58, coinSpray: 0.7, hit: 0.74,
  // 0.25, not the 1.08 this carried, which was a trap rather than a bug: nothing calls
  // `sfx('impact')`, so the number never ran. impactCrash is reached in play only as
  // playContact's fallback — gnash and mochi have no baked contact cue — and that path
  // sets cueGain from ATTACK_MASTER_TRIM instead, landing at -11.8 dBFS peak / -33.8
  // RMS, alongside `hit`. Through the dead door it summed its three layers to +0.8
  // dBFS: clipping on its own, before any music was under it. Matched to the live
  // path so the two ways into the same cue cannot disagree.
  impact: ATTACK_MASTER_TRIM,
  contact: ATTACK_MASTER_TRIM, launch: 0.92 * ATTACK_MASTER_TRIM,
  shield: 0.78, star: 0.72, win: 0.76, power: 0.84,
  crunch: 0.84, chomp: 0.84, tag: 0.9, perfect: 0.88,
  // A latch clack plus a bell on inharmonic partials sums hotter at the strike
  // than the clean chime this replaced; trim it back into the coin/purchase
  // family instead of letting the clang jump the mix.
  cash: 0.7,
  // A tail layer, not an event: it should colour the break, never top it.
  debris: 0.65,
  // Fireworks. These layer UNDER 'ui' and 'coin' rather than replacing them,
  // so they are the body of the sound while those two carry the tone. First
  // pass was mixed as background texture and read as too faint.
  fizzUp: 0.75, popSmall: 0.95, popBig: 0.9, crackle: 0.85,
  // The title asteroid's blast needs room for the music: heavy underneath,
  // but not a peak that dominates the menu.
  boom: 0.36,
  // Miss Chomp's coin bite. Measured against 'coin': it peaks ~5dB hotter at
  // the same nominal gain (the resonant lowpass), but the real problem was
  // sustain — it holds its peak where 'coin' is a fast-decaying blip, putting
  // it ~23dB up on total energy. Trim plus a shorter hold (see the cue) lands
  // it just under 'coin' on peak and a few dB over on energy.
  waka: 0.45,
  // Half a second of continuous swept noise carries far more energy than the
  // one-shot blips around it, and it plays UNDER the credits megamix rather than
  // over silence. Trimmed hard for both reasons: the hand-off is punctuation in
  // a crawl you are reading, and at 0.5 it was announcing itself. Note this trim
  // scales the reverb too — every layer's envelope is trimmed before it reaches
  // the send — so lowering it here quiets the room by the same amount.
  portal: 0.34,
  // Eleven pulse-wave sweeps back to back is a lot of continuous energy next to
  // the one-shot blips it follows. Trimmed into the 'lose'/'uiBad' family so it
  // lands as a punchline rather than a level jump.
  pacDeath: 0.62,
};

// The weapon cues used to ship as .wav assets fetched at runtime. They are now
// synthesised into buffers at init from src/engine/weapon-sfx.js — the same
// recipes, so the sound is unchanged, but nothing is downloaded. The hero->cue
// maps live there; audio.js only needs to know which buffers to render.

// The cues share a peak ceiling (weapon-sfx normalises each to ~0.88), but
// their timbres have different perceived loudness. These restrained trims bring
// the family together without boosting any cue above its authored level.
const WEAPON_AUDIO_GAIN = {
  // B-33P is intentionally much lower: the orb's bright upper partials read
  // louder than its waveform peak, especially on laptop and phone speakers.
  contact: { b33p: 0.45, grumpos: 0.94, lorenzo: 0.95, raymn: 0.76, fernwick: 0.98, chompo: 0.9 },
  launch: { b33p: 0.42, raymn: 0.95, grumpos: 0.82 },
};

// Timbres for the 'debris' cue — what the chunks sound like hitting the floor.
// Exported so the obstacle table's `mat` values can be checked against it.
export const DEBRIS_MATS = {
  wood:  { type: 'bandpass', freq: 1100, gain: 0.10, ticks: 4, dur: 0.045 },
  stone: { type: 'bandpass', freq: 2300, gain: 0.09, ticks: 4, dur: 0.03 },
  metal: { type: 'highpass', freq: 3800, gain: 0.07, ticks: 3, dur: 0.035, ping: [1860, 2490] },
  soft:  { type: 'lowpass',  freq: 520,  gain: 0.11, ticks: 3, dur: 0.06 },
  // The !-box: a light tinkle that sits *under* the coinSpray already firing
  // over it, rather than competing with it for the same ear.
  gold:  { type: 'highpass', freq: 5200, gain: 0.05, ticks: 3, dur: 0.025, ping: [2637, 3136] },
};

class AudioSys {
  constructor() {
    this.ctx = null;
    this.offline = false;  // true when driven by an OfflineAudioContext (render tools)
    this.noiseSeed = null; // set for offline renders; null = Math.random()
    // Shared delay, as it has always been tuned: dotted eighth, 0.35 feedback,
    // 2800Hz damping. How MUCH of a channel reaches it is the channel's send and
    // nothing else — see the echo bus in ensure().
    // Loop region, in absolute 16th-steps. null = play the whole song form.
    this.loopStart = null;
    this.loopEnd = null;
    this.pendingLoop = null;
    this.pendingStep = null;
    // A locator loop can be armed while the transport is still playing the intro.
    // Keep songBeat() on that intro until the scheduler has actually wrapped once.
    this.loopHasWrapped = false;
    // Whether the armed region is the SONG's own — its `arrangement.loop` — rather
    // than a locator range or a cabinet treatment's. What is armed looks identical
    // either way, and the difference decides who is allowed to re-arm it: a bar edit
    // must refresh the song's loop and must not touch a range somebody selected.
    this.formLoopArmed = false;
    this.delayDivision = 0.75;
    this.delayFeedback = 0.35;
    this.delayTone = 2800;
    this.master = null; this.sfxGain = null; this.musicGain = null;
    // Built on the first portal cue and never rebuilt — see portalVerbSend().
    this.portalSend = null; this.portalVerb = null;
    // Built on the first note a lane with a Tone voice plays, and only then — see
    // playVoice. A game whose songs name no voices never constructs one.
    this.voices = null;
    // Which layers of which MRDR-3 preset are soloed on the desk — `voiceId → Set`.
    //
    // It lives HERE rather than on the rack because the rack does not survive: it is
    // disposed with the context and rebuilt on demand, and solo held there would quietly
    // empty itself while the desk still showed lit buttons. This object outlives every
    // rack, and each new rack is handed a reference to it.
    //
    // Monitoring only. It is not part of any preset, so nothing here is ever saved to the
    // library, written into a song, or seen by the offline measurement — which builds its
    // own AudioSys-less rack. See VoiceRack.soloLayers.
    this.soloLayers = new Map();
    // One pair of gain nodes per lane, standing between everything a song schedules
    // and the channel strip it plays through — see _laneGate. They exist so a song
    // can be STOPPED rather than merely muted: a source node is fire-and-forget once
    // it is started, so the only handle on a note that is still ringing is the node
    // it is connected to. Cleared and re-made per song by setBank.
    this._laneGates = new Map();
    // Preset-bench notes get their own gates so changing an audition never cuts a
    // song lane. They belong to this context just like the song gates do.
    this._benchGates = new Map();
    // Optional destination used by session-only audition surfaces (the standalone
    // MRDR-3 playground). Song lanes never set this, so the ordinary bench path keeps
    // its music/echo buses and the mixer remains untouched.
    this._previewOutput = null;
    this.songTrim = null;
    this.musicTrim = 1;
    this.pendingStartDelay = 0;
    this.songAnalyser = null;
    // Browserless/headless fallback buffers keep the public shape stable even
    // when Web Audio is unavailable; a live analyser replaces them at ensure().
    this._analysisSpectrum = new Uint8Array(128);
    this._analysisWaveform = new Uint8Array(256);
    this._analysis = {
      spectrum: this._analysisSpectrum,
      waveform: this._analysisWaveform,
      bass: 0,
      mid: 0,
      treble: 0,
      // Broadband loudness of the mix right now, and that loudness measured
      // against how loud this song has recently been. See musicAnalysis().
      level: 0,
      dynamics: 1,
      beat: null,
      beatPhase: 0,
      beatPulse: 0,
      // How much kit is under the music. Counted off the sequencer rather than
      // sniffed out of the spectrum — see scheduleStep's percussion tally.
      drums: 0,
      drumless: false,
      // A single kit ONSET, spiking to 1 on the frame a hit is actually heard.
      // `drums` is a four-beat density and `beatPulse` is a procedural ramp that
      // ticks whether or not anything played it; neither can tell a preset "a
      // drum just landed, now". This can, exactly, because the sequencer knows.
      hit: 0,
    };
    // Rolling loudness reference for `dynamics`, reset per song by setBank().
    this._analysisPeak = 0;
    // Percussion hits scheduleStep() has queued into the lookahead but that have
    // not sounded yet, and the audio times of the ones that have. Also per song.
    this._percPending = [];
    this._percHeard = [];
    this.muted = false;
    this.levels = { master: 1, music: 0.7, sfx: 0.9 };
    this.cueGain = 1;
    this.noiseBuf = null;
    this.contactBuffers = {};
    this.launchBuffers = {};
    // sequencer
    this.bpm = 112;
    this.swing = 0;        // 0 or 50 = straight; see the swing term in scheduleStep
    // A groove change waiting for a bar line, and the ramp into it. See setSwing.
    this.pendingSwing = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.bank = null;      // current pattern bank
    this.tempo = 1;        // song speed multiplier (slow-mo drags it down)
    this.detune = 1;       // song pitch multiplier
    this.starMode = false; // invincibility layer on/off
    this.starRoot = 110;   // last bass note the song played (arpeggio follows it)
    this.beatListeners = [];
    this.songTime = 0;
    this.lifecyclePaused = false;
    // Reversed-audio capture: a ring buffer tapped off the master output
    // so we can play it backwards during rewind.
    this._capBuf = null;     // Float32Array ring buffer (~4s)
    this._capPos = 0;        // write cursor
    this._capNode = null;    // ScriptProcessorNode
    this._capGain = null;    // zero-gain sink
    this.captureEnabled = true;
    this._revTimer = null;   // interval for reverse-chunk scheduling
    this._revSources = [];   // active reversed BufferSources
    // A mixer panic is a momentary emergency cut, not a saved mute. The next
    // deliberate play/preview/SFX action opens the buses again.
    this.panicked = false;
  }

  // `ctxOverride` lets the offline render tools hand in an OfflineAudioContext so
  // WAVs, stems and videos are produced by THIS engine rather than a reimplementation
  // of it (see tools/lib/render-bank-browser.js). An offline context has no running
  // clock and no speakers, so the realtime-only machinery — the lookahead interval
  // and the rewind capture recorder — stays off; the caller drives scheduleStep()
  // itself and calls startRendering().
  ensure(ctxOverride = null) {
    if (this.ctx) {
      if (!this.lifecyclePaused && this.ctx.state !== 'running') this.resumeContext();
      return;
    }
    if (ctxOverride) {
      this.ctx = ctxOverride;
      this.offline = true;
    } else {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    // Some engines create a suspended context even when autoplay is allowed,
    // and require an explicit resume request. Try immediately; browsers with
    // a gesture requirement reject/hold it harmlessly, then the existing
    // gesture path calls ensure() again and resumes for real.
    if (!this.offline && !this.lifecyclePaused && this.ctx.state === 'suspended') {
      const resumed = this.ctx.resume();
      if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.levels.master;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.levels.sfx; this.sfxGain.connect(this.master);
    this.portalSend = null; this.portalVerb = null;   // belong to the old ctx
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.levels.music; this.musicGain.connect(this.master);
    // The song proper rides on musicBus; the invincibility arpeggio rides on
    // starBus. Two buses so the theme can duck under the star layer without
    // the star layer ducking itself. Both feed musicGain (and so the echo).
    this.songTrim = this.ctx.createGain();
    this.songTrim.gain.value = this.bank ? 0.0001 : 0;
    // The analyser sits on the song lane, before the user music fader, so it
    // hears the procedural song (including its echo) but none of the UI/SFX
    // bus. Keeping it pre-fader also means a muted jukebox can still animate
    // its screensaver rather than freezing on a black frame.
    if (this.ctx.createAnalyser) {
      this.songAnalyser = this.ctx.createAnalyser();
      this.songAnalyser.fftSize = 256;
      this.songAnalyser.smoothingTimeConstant = 0.72;
      this._analysisSpectrum = new Uint8Array(this.songAnalyser.frequencyBinCount);
      this._analysisWaveform = new Uint8Array(this.songAnalyser.fftSize);
      this.songTrim.connect(this.songAnalyser);
      this.songAnalyser.connect(this.musicGain);
      this._analysis.spectrum = this._analysisSpectrum;
      this._analysis.waveform = this._analysisWaveform;
    } else {
      this.songTrim.connect(this.musicGain);
    }
    if (this.bank) this.songTrim.gain.setTargetAtTime(this.musicTrim, this.ctx.currentTime + 0.5, 0.01);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 1; this.musicBus.connect(this.songTrim);
    // Lane gates belong to the context that made them; a rebuilt graph starts with none.
    this._laneGates.clear();
    this._benchGates.clear();
    this._previewOutput = null;
    this.starBus = this.ctx.createGain(); this.starBus.gain.value = 0; this.starBus.connect(this.musicGain);
    // YMCK-style space: tempo-synced dotted-eighth echo. echoBus is a parallel
    // wet send, and every channel reaches it through its own DELAY send on the
    // mixer — nothing else decides how much goes.
    //
    // It used to be scaled here, twice over: the bus sat at 0.28 and every
    // scheduled step re-aimed it at the playing section's `echoLevel`. That made a
    // channel's send a RELATIVE control over a number the desk never showed — a
    // section saying `echoLevel: 0` swallowed the send whole, and the same send
    // was worth 4x more in one section of a song than another. Measured on
    // plumber: kick at DELAY SEND 2.00 rendered 3.9e-8 through its opening section
    // and 3.3e-3 through its last. So the bus is unity and the send is the whole
    // truth: full send on the kick is full send on the lead, in every bar.
    //
    // The highpass below stays. It is not a level control — it keeps stray low end
    // out of the repeats so the echo does not muddy the mix.
    //
    // Gain staging: the send used to tap musicGain (post-fader), so echo was
    // implicitly scaled by the music volume. echoBus taps the lane gains
    // pre-fader instead, so the return runs back through musicGain rather
    // than straight to master — same net level as before, and the echo still
    // follows the music volume setting. (No cycle: musicGain doesn't feed
    // echoBus.)
    this.echoBus = this.ctx.createGain(); this.echoBus.gain.value = 1;
    this.echoSend = this.ctx.createGain(); this.echoSend.gain.value = 1;
    this.echoHp = this.ctx.createBiquadFilter(); this.echoHp.type = 'highpass'; this.echoHp.frequency.value = 500;
    // One second, and deliberately not more — see growDelayLine, which is where a
    // longer division gets the buffer it needs.
    this.delay = this.ctx.createDelay(1.0); this.delay.delayTime.value = 0.32;
    this.delayLp = this.ctx.createBiquadFilter(); this.delayLp.type = 'lowpass'; this.delayLp.frequency.value = 4500;
    this.delayFb = this.ctx.createGain(); this.delayFb.gain.value = 0.35;
    this.echoBus.connect(this.echoSend);
    this.echoSend.connect(this.echoHp);
    this.echoHp.connect(this.delay);
    this.delay.connect(this.delayLp);
    this.delayLp.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    this.delayLp.connect(this.songTrim);
    // Per-lane channel strips. The mixer owns the song-side master chain, so pass it
    // the music bus and return that chain into the shared global master. SFX stays
    // directly on the global master; a song's -19dB title trim must not attenuate UI
    // cues or tutorial feedback.
    this.mixer = createMixer(this.ctx, {
      musicBus: this.musicBus, echoBus: this.echoBus,
      master: this.musicGain, destination: this.master,
      // The original echo's return leg: the mixer splices its EQ and level in
      // between these two, so Delay 1 gets the same controls as the new auxes.
      songTrim: this.songTrim, delayLp: this.delayLp,
    });
    // Offline renders seed the noise so a lane rendered on its own gets exactly the
    // noise it had inside the full mix — that is what lets stems sum back to the
    // mix. Live playback keeps Math.random(): a fresh noise floor every session is
    // free variety, and nothing downstream depends on it repeating.
    const rnd = this._noiseRandom();
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
    // Crashes outlast the 0.5s one-shot buffer, and looping it drops a seam
    // partway through the hit — an audible bump at a fixed 0.5s offset that
    // has nothing to do with the tempo, so it reads as out of time. A longer
    // dedicated buffer lets a crash play straight through, seam-free.
    const clen = Math.floor(this.ctx.sampleRate * 2.5);
    this.crashBuf = this.ctx.createBuffer(1, clen, this.ctx.sampleRate);
    const cd = this.crashBuf.getChannelData(0);
    for (let i = 0; i < clen; i++) cd[i] = rnd() * 2 - 1;
    this.renderWeaponBuffers();
    if (this.offline) return; // the caller drives scheduleStep() and startRendering()
    this.startSequencer();
    if (this.captureEnabled) this._startCapture();
    // Separate output for reversed audio — bypasses the capture node to
    // prevent a feedback loop (reversed audio → capture → reversed again).
    this._rewindOut = this.ctx.createGain();
    this._rewindOut.gain.value = this.levels.master;
    this._rewindOut.connect(this.ctx.destination);
    if (this.lifecyclePaused && this.ctx.state === 'running') this.suspendContext();
  }

  // Deterministic noise for offline renders. Call before ensure() — the buffers are
  // filled once there and never refilled.
  setNoiseSeed(seed) { this.noiseSeed = seed; }

  /**
   * Loop a step range instead of the whole song form. Wrapping happens inside
   * scheduleStep, at the point the step counter advances, so the loop is seamless
   * rather than a jump applied a frame late from the UI.
   * Pass no arguments to clear it.
   */
  setLoop(startStep = null, endStep = null, { jump = true } = {}) {
    this.pendingLoop = null;
    this.pendingStep = null;
    // Whatever is armed after this call, it is not the song's own markers unless
    // armLoop says so — it is the only thing that sets the flag.
    this.formLoopArmed = false;
    if (startStep == null || endStep == null || endStep <= startStep) {
      this.loopStart = this.loopEnd = null;
      this.loopHasWrapped = false;
      return;
    }
    this.loopStart = Math.max(0, Math.floor(startStep));
    this.loopEnd = Math.floor(endStep);
    this.loopHasWrapped = false;
    // Drop straight into the region if the playhead is outside it, so arming a loop
    // takes effect on this pass rather than after the song wanders back round.
    //
    // `jump: false` is how a song keeps an intro: the region is armed while the
    // playhead is still short of it, the bars before it play once on the way in, and
    // the wrap at the end of scheduleStep does the rest. Everything that arms a loop
    // from the UI wants the jump; everything that arms a song's own markers does not.
    if (jump && (this.step < this.loopStart || this.step >= this.loopEnd)) this.step = this.loopStart;
  }

  /** Markers as steps, against the form THIS engine is playing. See loopSteps. */
  loopSteps(loop) {
    if (!this.bank) return null;
    return loopSteps(loop, barPlan(this.bank).length);
  }

  /**
   * The markers the CURRENT song carries — the desk's unsaved arrangement when there
   * is one, the file's otherwise. Same seam as applyMix reads the arrangement through,
   * for the same reason: on the desk the draft is what you are listening to.
   */
  songLoop() {
    if (!this.bank) return null;
    const id = trackIdOf(this.sourceBank || this.bank);
    if (!id) return null;
    return loopOf(this.bank, id,
      this.arrangement !== undefined ? { [id]: this.arrangement } : undefined);
  }

  /**
   * Arm a song's markers: play from its start bar, then repeat its region for ever.
   *
   * `seek` moves the playhead to the start bar, and is for arriving at a song — only
   * setBank passes it. Re-arming under a song that is already playing must never move
   * the playhead, or every bar edit on the desk would jump the music.
   */
  armLoop(loop, { seek = false } = {}) {
    const r = this.loopSteps(loop);
    if (!r) { this.setLoop(); return false; }
    if (seek) this.step = r.start;
    if (!r.loop) { this.setLoop(); return false; }
    this.setLoop(r.loop.start, r.loop.end, { jump: false });
    return true;
  }

  /**
   * The same, for the song's OWN markers — and the only thing that raises the flag
   * saying so. A cabinet treatment's loop goes through armLoop and leaves the flag
   * down, because a bar edit under an auditioned treatment must not quietly replace it
   * with the song's.
   */
  armSongLoop({ seek = false } = {}) {
    const armed = this.armLoop(this.songLoop(), { seek });
    this.formLoopArmed = armed;
    return armed;
  }

  /**
   * Change an armed loop without interrupting the bar that is already playing.
   * The scheduler swaps these bounds at the next bar boundary, or at the current
   * loop's end when that comes first.
   */
  setLoopAtBoundary(startStep = null, endStep = null) {
    this.pendingStep = null;
    if (startStep == null || endStep == null || endStep <= startStep
      || this.loopStart == null || this.loopEnd == null) {
      this.setLoop(startStep, endStep);
      return;
    }
    const nextBar = this.step % 16 === 0 ? this.step : (Math.floor(this.step / 16) + 1) * 16;
    const boundary = Math.min(this.loopEnd, nextBar);
    const pendingBoundary = this.pendingLoop && this.pendingLoop.boundary > this.step
      ? this.pendingLoop.boundary : boundary;
    this.pendingLoop = {
      start: Math.max(0, Math.floor(startStep)),
      end: Math.floor(endStep),
      boundary: pendingBoundary,
    };
  }

  applyPendingLoop() {
    if (!this.pendingLoop || this.step < this.pendingLoop.boundary) return false;
    this.loopStart = this.pendingLoop.start;
    this.loopEnd = this.pendingLoop.end;
    this.pendingLoop = null;
    this.step = this.loopStart;
    this.loopHasWrapped = true;
    return true;
  }

  /** Queue a playing seek for the next bar boundary instead of cutting the bar. */
  setStepAtBoundary(step) {
    this.pendingLoop = null;
    const target = Math.max(0, Math.floor(step));
    const nextBar = this.step % 16 === 0 ? this.step : (Math.floor(this.step / 16) + 1) * 16;
    const boundary = this.loopEnd == null ? nextBar : Math.min(this.loopEnd, nextBar);
    const inLoop = this.loopStart != null && this.loopEnd != null
      && (target < this.loopStart || target >= this.loopEnd);
    this.pendingStep = {
      step: inLoop ? this.loopStart : target,
      boundary,
    };
  }

  applyPendingStep() {
    if (!this.pendingStep || this.step < this.pendingStep.boundary) return false;
    this.step = this.pendingStep.step;
    this.pendingStep = null;
    this.loopHasWrapped = false;
    return true;
  }

  // ---- swing ----------------------------------------------------------------

  /**
   * Change the GROOVE of the song that is playing, on a boundary, without a seam.
   *
   * The cheapest transition in the engine, and worth saying why: `this.swing` is one
   * scalar that `scheduleStep` re-reads every sixteenth, applied as an offset on the
   * NOTE and never on the clock. Nothing is disposed, nothing is rebuilt, no gain is
   * moved and `nextTime` does not budge — so a held note rings out straight and the
   * next one is swung, with no discontinuity anywhere in the graph. Compare `setBank`,
   * which is the other way to hear a song differently and costs a half-second gap.
   *
   * `quantize` names the boundary, in MusicDirector's vocabulary — 'immediate',
   * 'beat', 'bar', 'phrase', or a NUMBER OF BARS. The default is the bar line.
   *
   * `overBars` leans INTO the groove instead of flipping to it: the swing is
   * interpolated a step at a time across that many bars, which is what a drummer
   * settling into a pocket sounds like. Zero is the flip. Free, because the value is
   * read per step anyway.
   *
   * One caveat that belongs here rather than in a comment nobody reads: the
   * tempo-synced delay CANNOT follow a swing (see the note in scheduleStep). Divisions
   * of an even number of sixteenths inherit it for nothing; the default dotted eighth
   * is three sixteenths, and will flam against a swung song by up to a third of a
   * sixteenth. Move the division to 1/8 or 1/4 for a swung section, or take the flam.
   */
  setSwing(pct, { quantize = 'bar', overBars = 0 } = {}) {
    // The same clamp, spelling and range as the desk's own `setSwing` in
    // tools/lib/arrangement-edit.js — one control, one meaning, both ends of the wire.
    // `null` there is "no swing entry", which is this engine's 0.
    //
    // 0 and 50 both mean straight and both are exact (see the swing term in
    // scheduleStep), and 0 is what a straight song is stored as, so that is what a
    // request for straight lands on. Normalising it to 50 would change what reaches
    // `scheduleEffects` for a song nobody has swung, and the null test compares those
    // renders sample for sample.
    const to = pct ? Math.min(SWING_MAX, Math.max(SWING_STRAIGHT, Math.round(pct))) : 0;
    const steps = Math.max(0, Math.round((overBars || 0) * 16));
    if (quantize === 'immediate' && steps === 0) {
      this.pendingSwing = null;
      this.swing = to;
      return;
    }
    // Latest request wins, and it replaces a ramp already under way rather than
    // queueing behind it: two grooves arriving at once is one groove, the newer.
    this.pendingSwing = { to, steps, quantize, started: false, from: 0, done: 0 };
  }

  /** Is `step` the boundary a pending swing asked for? Mirrors MusicDirector._boundary. */
  _swingBoundary(q, step) {
    if (q === 'immediate') return true;
    if (q === 'beat') return step % 4 === 0;
    if (q === 'phrase' || (typeof q === 'number' && q > 0)) {
      // From the MUSICAL ANCHOR, not from zero: a loop over bars 2-5 begins at step 16,
      // and counting phrases from the top of the song steps over every boundary it has.
      const anchor = this.loopStart ?? 0;
      const len = typeof q === 'number'
        ? Math.round(q * 16)
        : ((this.loopEnd != null && this.loopStart != null) ? this.loopEnd - this.loopStart : 64);
      if (!(len > 0)) return false;
      return (((step - anchor) % len) + len) % len === 0;
    }
    return step % 16 === 0;
  }

  /**
   * Move a pending swing along. Called at the top of scheduleStep, so `this.step` is
   * the step ABOUT to be scheduled and the boundary tested is the one whose notes are
   * next out of the door.
   *
   * A bar line cannot be missed, and it is worth knowing why nothing here has to race:
   * the boundary that matters is an EVEN step, and even steps never swing. Landing on
   * the downbeat and landing just after it are the same sound; the first note the
   * change can touch is step 1, the first odd sixteenth of the bar.
   *
   * The ramp counts its own steps rather than measuring `this.step` against a start,
   * because `step` is not monotonic — a loop wrap or a queued seek moves it backwards,
   * and a ramp reading the difference would run backwards with it.
   */
  _applyPendingSwing() {
    const p = this.pendingSwing;
    if (!p) return;
    if (!p.started) {
      if (!this._swingBoundary(p.quantize, this.step)) return;
      p.started = true;
      if (p.steps === 0) { this.swing = p.to; this.pendingSwing = null; return; }
      // Straight is 50 for the arithmetic whichever way it was spelled, so a ramp
      // from an unswung song does not start by leaping from 0 to 50.
      p.from = this.swing || SWING_STRAIGHT;
    }
    p.done++;
    const t = Math.min(1, p.done / p.steps);
    // The TARGET the same way. Landing is a plain assignment of what was asked for, so
    // a ramp down to straight ends at 0 if that is what it was given, not at 50.
    this.swing = p.from + ((p.to || SWING_STRAIGHT) - p.from) * t;
    if (t >= 1) { this.swing = p.to; this.pendingSwing = null; }
  }

  // ---- shared delay controls ------------------------------------------------
  // The tempo-synced echo is the game's only "space", and until the desk existed it
  // was fixed: a dotted eighth, 0.35 feedback, 2800Hz damping. Those remain the
  // defaults; a song's mix can move them.
  //
  // No `level` here any more. It scaled the echo BUS, on top of the section's own
  // `echoLevel` — two hidden multipliers between a send and what you heard. How loud
  // the delay comes back is the aux return's level on the desk, and how much goes in
  // is the channel's send: one control each, both visible.
  setDelay({ division, feedback, tone } = {}) {
    if (division != null) this.delayDivision = division;
    if (feedback != null) this.delayFeedback = Math.max(0, Math.min(0.95, feedback));
    if (tone != null) this.delayTone = Math.max(200, Math.min(this.ctx.sampleRate / 2, tone));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.delay) {
      const secs = this.delayTimeSeconds();
      this.growDelayLine(secs).delayTime.setTargetAtTime(secs, t, 0.05);
    }
    if (this.delayFb) this.delayFb.gain.setTargetAtTime(this.delayFeedback, t, 0.05);
    if (this.delayLp) this.delayLp.frequency.setTargetAtTime(this.delayTone, t, 0.05);
  }

  delayTimeSeconds() {
    const beats = this.delayDivision ?? 0.75;   // dotted eighth
    // The WARPED clock, not the bank's own. A song under a speed burst or a star is
    // playing faster than it was written, and a division left at the written tempo is
    // no longer that division: at a 1.12 warp the first repeat lands a third of a 16th
    // late and every repeat after it compounds, which is heard as the echo flamming
    // against the kit rather than as a delay.
    //
    // Bounded by what a delay line can hold at all — an eight-bar division at a slow
    // tempo asks for more than the longest buffer this engine will allocate.
    return Math.min(MAX_DELAY_SECONDS, (60 / ((this.bpm || 120) * (this.tempo || 1))) * beats);
  }

  /**
   * Swap in a longer delay line when a division needs one.
   *
   * A DelayNode's buffer is allocated at construction and never grows, so bar-length
   * echoes need a new node. The obvious move — build the line at its maximum from
   * the start — is wrong here: a DelayNode with a large maxDelayTime does NOT render
   * the same samples as a small one at the same delay time. Measured at 1.7e-4 on
   * Speed Zone against the engine baselines, which is the null test failing and
   * every song's echo quietly moving. So the default line stays exactly the one
   * ounce the songs were balanced against, and only a deliberately long division
   * ever builds a bigger one.
   */
  growDelayLine(secs) {
    if (!this.ctx || !this.delay || secs <= this.delay.maxDelayTime - 0.01) return this.delay;
    const next = this.ctx.createDelay(Math.min(MAX_DELAY_SECONDS, Math.ceil(secs) + 1));
    next.delayTime.value = this.delay.delayTime.value;
    for (const [from, node] of [[this.echoHp, this.delay], [this.delayFb, this.delay]]) {
      try { from.disconnect(node); } catch { /* not wired */ }
    }
    try { this.delay.disconnect(this.delayLp); } catch { /* not wired */ }
    this.echoHp.connect(next);
    this.delayFb.connect(next);
    next.connect(this.delayLp);
    this.delay = next;
    return next;
  }

  // mulberry32: seeded so an offline render repeats exactly — see setNoiseSeed.
  _noiseRandom() {
    if (this.noiseSeed == null) return Math.random;
    let a = this.noiseSeed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  settleContext(promise) {
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }

  suspendContext() {
    if (!this.ctx || typeof this.ctx.suspend !== 'function' || this.ctx.state === 'suspended') return;
    try { this.settleContext(this.ctx.suspend()); } catch (e) { /* platform owns lifecycle */ }
  }

  resumeContext() {
    if (!this.ctx || typeof this.ctx.resume !== 'function' || this.lifecyclePaused) return;
    try { this.settleContext(this.ctx.resume()); } catch (e) { /* next gesture retries */ }
  }

  setLifecyclePaused(paused) {
    paused = !!paused;
    if (paused === this.lifecyclePaused) return;
    this.lifecyclePaused = paused;
    if (paused) this.suspendContext();
    else this.resumeContext();
  }

  // Rewind is unavailable on touch screens, so their audio must not pay for
  // the continuously-running master-output recorder. Configure this before
  // ensure(); changing it later also tears down an already-created recorder.
  setCaptureEnabled(enabled) {
    enabled = !!enabled;
    if (enabled === this.captureEnabled) return;
    this.captureEnabled = enabled;
    if (!this.ctx) return;
    if (enabled) this._startCapture();
    else this._stopCapture();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.levels.master, this.ctx.currentTime, 0.02);
  }

  /**
   * Cut every live output immediately.
   *
   * This is intentionally stronger than muting the master: the desk can have
   * long notes, preview envelopes, echo tails and a MIDI key whose note-off
   * never arrived. Lane gates and the preset rack are dropped so music cannot
   * keep scheduling or resume from an old held voice, while the buses stay in
   * place for the next explicit sound the user asks for.
   */
  panic() {
    this.panicked = true;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const cut = (node) => {
      if (!node?.gain) return;
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(0, t);
    };
    cut(this.master);
    cut(this.musicGain);
    cut(this.sfxGain);
    cut(this.musicBus);
    cut(this.starBus);
    cut(this.songTrim);
    cut(this._rewindOut);
    this._cutLaneGates();
    if (this.voices) { this.voices.dispose(); this.voices = null; }
    this._percPending.length = 0;
    this._percHeard.length = 0;
    if (this._revTimer) { clearInterval(this._revTimer); this._revTimer = null; }
    this._revSources = [];
    // The realtime scheduler must not recreate gates after the cut. `setBank`
    // will force a clean re-bank because sourceBank is cleared as well.
    this.bank = null;
    this.sourceBank = null;
    this.nextTime = t + 0.1;
  }

  /** Re-open buses after a panic when a new deliberate sound is requested. */
  resumeAfterPanic() {
    if (!this.panicked) return;
    this.panicked = false;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const restore = (node, value) => {
      if (!node?.gain) return;
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(value, t);
    };
    restore(this.master, this.muted ? 0 : this.levels.master);
    restore(this.musicGain, this.levels.music);
    restore(this.sfxGain, this.levels.sfx);
    restore(this.musicBus, this.rewindMode ? 0.0001 : (this.starMode ? 0.32 : 1));
    restore(this.starBus, this.starMode ? 1.5 : 0);
    if (this._rewindOut) restore(this._rewindOut, this.muted ? 0 : this.levels.master);
  }

  setVolumes(volumes = {}) {
    for (const key of ['master', 'music', 'sfx']) {
      if (Number.isFinite(volumes[key])) this.levels[key] = Math.max(0, Math.min(1, volumes[key]));
    }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.levels.master, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.levels.music, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.levels.sfx, t, 0.02);
    if (this._rewindOut) this._rewindOut.gain.setTargetAtTime(this.muted ? 0 : this.levels.master, t, 0.02);
  }

  // Synthesise the weapon cues into buffers, once, at init. A few ms of math at
  // the context's own sample rate replaces fetching and decoding nine WAVs;
  // every shot then plays a cheap buffer source, exactly as before. Rendering
  // is synchronous and cannot half-fail the way a network fetch could, so the
  // procedural fallbacks in playContact/playLaunch now only guard a missing ctx.
  renderWeaponBuffers() {
    const SR = this.ctx.sampleRate;
    const bake = (cueMap, buffers) => {
      for (const [hero, name] of Object.entries(cueMap)) {
        try {
          const samples = renderCue(name, SR);
          const buf = this.ctx.createBuffer(1, samples.length, SR);
          buf.getChannelData(0).set(samples); // Float64 -> Float32 on copy
          buffers[hero] = buf;
        } catch (err) {
          console.warn(`weapon cue ${name} failed to render; using procedural fallback.`, err);
        }
      }
    };
    bake(CONTACT_CUE, this.contactBuffers);
    bake(LAUNCH_CUE, this.launchBuffers);
  }

  // ---- SFX ------------------------------------------------------------------
  // dest overrides where the tone lands. Everything in the game wants the SFX
  // bus and says nothing; a cue routing itself through its own send (the portal
  // swoosh and its reverb) passes one in.
  // `hold` is the fraction of `dur` spent at full level before the decay
  // starts. It defaults to 0, which is this cue set's house envelope: attack in
  // 8ms, then decay exponentially across the whole length. That is right for
  // every blip, bonk and ping here — and wrong for anything meant to SUSTAIN.
  // An exponential run from full to silence is 13dB down a fifth of the way in,
  // so a one-second tone asked to hold is inaudible for most of its own
  // duration. The slide whistle is the first cue that has to last as long as
  // the thing it describes, and this is what lets it.
  osc(type, f0, f1, dur, gain = 0.2, when = 0, dest = null, hold = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const sustain = Math.max(0.008, Math.min(0.95, hold) * dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.cueGain, t + 0.008);
    if (sustain > 0.008) g.gain.setValueAtTime(gain * this.cueGain, t + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // Same `hold` as osc() above, for the same reason: a breath layer under a
  // sustained tone has to sustain with it or the tone goes bare halfway through.
  noise(dur, gain = 0.2, filterType = 'lowpass', freq = 800, when = 0, hold = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq;
    const g = this.ctx.createGain();
    const sustain = Math.max(0.008, Math.min(0.95, hold) * dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.cueGain, t + 0.008);
    if (sustain > 0.008) g.gain.setValueAtTime(gain * this.cueGain, t + sustain);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  explosion() {
    if (!this.ctx || !this.crashBuf) return;
    const t = this.ctx.currentTime;
    const q = this.cueGain;
    // Use the dedicated long noise buffer so the blast has a continuous body,
    // rather than looping the short SFX buffer and sounding like a snare roll.
    const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(7200, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + 1.45);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.36 * q, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.17 * q, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.08 * q, t + 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    g.gain.linearRampToValueAtTime(0, t + 1.55 - 0.005);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    // A quiet send into the arcade echo makes the blast occupy the room, while
    // the dry SFX path stays restrained enough not to jump over the title music.
    // 0.039 is the 0.14 this was tuned at, times the 0.28 the echo bus used to sit
    // at: the bus is unity now, and this is the one send into it that is not a
    // channel on the desk, so it carries its own trim to sound exactly as it did.
    const echo = this.ctx.createGain(); echo.gain.value = 0.039;
    g.connect(echo); echo.connect(this.echoBus);
    src.start(t); src.stop(t + 1.55);

    // The front edge is bright and sharp; the long filtered buffer carries the
    // expanding cloud while these layers provide the punch and falling rumble.
    this.noise(0.16, 0.26, 'highpass', 2400);
    this.osc('sine', 125, 22, 1.4, 0.42, 0.02);
    this.osc('triangle', 68, 26, 1.2, 0.25, 0.05);
    this.noise(1.05, 0.14, 'lowpass', 240, 0.04);
    for (const [when, freq, gain] of [[0.18, 1800, 0.13], [0.38, 1250, 0.1], [0.64, 820, 0.075], [0.91, 520, 0.05]]) {
      this.noise(0.16, gain, 'bandpass', freq, when);
    }
  }

  // A compact impact crash. This uses the long noise buffer rather than a
  // handful of tiny filtered pings, so the sound has an audible noisy body and
  // a real tail instead of collapsing into a pitched bonk.
  impactCrash(pitch = 1) {
    if (!this.ctx || !this.crashBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 95;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(6200 * pitch, t);
    lp.frequency.exponentialRampToValueAtTime(260 * pitch, t + 0.62);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.62 * this.cueGain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.28 * this.cueGain, t + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.72);
    g.gain.linearRampToValueAtTime(0, t + 0.78 - 0.005);
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.78);

    // The noise is the body; these two layers make its front edge read on
    // laptop speakers without turning the whole cue back into a beep.
    this.noise(0.045, 0.46, 'highpass', 3600 * pitch);
    this.osc('sine', 145 * pitch, 38 * pitch, 0.3, 0.34);
  }

  playContact(hero, pitch = 1) {
    const buffer = this.contactBuffers[hero];
    if (!buffer) { this.impactCrash(pitch); return; }
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    src.playbackRate.value = pitch;
    const trim = WEAPON_AUDIO_GAIN.contact[hero] ?? 1;
    const g = this.ctx.createGain(); g.gain.value = this.cueGain * trim;
    src.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  playLaunch(hero, pitch = 1) {
    const buffer = this.launchBuffers[hero];
    if (!buffer) {
      if (hero === 'b33p') this.sfx('shoot', { pitch });
      else if (hero === 'raymn') this.sfx('plop', { pitch });
      else if (hero === 'grumpos') this.sfx('axe', { pitch });
      return;
    }
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = buffer;
    src.playbackRate.value = pitch;
    const trim = WEAPON_AUDIO_GAIN.launch[hero] ?? 1;
    const g = this.ctx.createGain(); g.gain.value = this.cueGain * trim;
    src.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  // The title sign shorting out.
  //
  // Runs on the SFX bus, NOT the music bus, and that routing is the whole point
  // of where it sits: the echo send is fed from musicGain, so anything on the
  // music bus is echoed whether it wants to be or not. A buzzing sign is a
  // physical object a few feet away, not something ringing around the arcade,
  // so it has to bypass that send entirely. sfxGain connects straight to master.
  //
  // Three things make this read as a BUZZ rather than the thud it used to be:
  // it lasts long enough to hear (a 0.1s blip is a click, the ear needs a few
  // cycles of stutter to call something a buzz); the tone keeps its harmonics
  // instead of being lowpassed down to a bare sine; and the whole thing is
  // chopped by a stutter gate, which is the actual sound of a contact
  // chattering rather than a tube humming.
  //
  // Level: deliberately way down at the threshold of hearing. This is a room
  // detail — the sign you only notice once you have stopped reading the menu —
  // not a cue, and it repeats forever on the title screen, so anything that
  // announces itself becomes a tic. Scale the whole thing from `q` rather than
  // editing four envelope points to change how loud it is.
  //
  // Unlike osc()/noise(), this authors its own nodes, so it has to apply
  // cueGain itself or an SFX_TRIM entry for it would silently do nothing.
  neonBuzz() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const DUR = 0.34;
    const q = this.cueGain * 0.4;   // master level for the whole buzz

    // The stutter gate everything runs through: the contact chattering, slowing
    // down as the arc gives up. Multiplies rather than replaces the envelopes,
    // so the buzz and its crackle break up together.
    const gate = this.ctx.createGain(); gate.gain.value = 0.6;
    const lfo = this.ctx.createOscillator(); lfo.type = 'square';
    lfo.frequency.setValueAtTime(46, t);
    lfo.frequency.linearRampToValueAtTime(29, t + DUR);
    const lfoDepth = this.ctx.createGain(); lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth); lfoDepth.connect(gate.gain);
    gate.connect(this.sfxGain);

    // Pitched up near the sixth harmonic of mains: the low version sat in the
    // theme's bass and read as a thump, and even at the third it still had body.
    // A tiny failing tube sings high and thin, so it can sit quietly on top of
    // the music instead of competing with it.
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(720, t);
    o.frequency.linearRampToValueAtTime(676, t + DUR);   // sags as it dies
    // A detuned partial roughly an octave up beats against the fundamental,
    // which is what sours a clean hum into a rasp.
    const o2 = this.ctx.createOscillator(); o2.type = 'square';
    o2.frequency.setValueAtTime(1455, t);
    const o2g = this.ctx.createGain(); o2g.gain.value = 0.24;
    // Highpassed as well as lowpassed now: with the fundamental this high, what
    // little bottom the saw has left is all thump and no sizzle.
    const ohp = this.ctx.createBiquadFilter(); ohp.type = 'highpass';
    ohp.frequency.value = 520;
    const of = this.ctx.createBiquadFilter(); of.type = 'lowpass';
    of.frequency.value = 5200; of.Q.value = 0.9;
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.006 * q, t + 0.014);
    og.gain.exponentialRampToValueAtTime(0.0034 * q, t + 0.16);
    og.gain.exponentialRampToValueAtTime(0.0001, t + DUR);
    og.gain.linearRampToValueAtTime(0, t + DUR + 0.02 - 0.005);
    o.connect(ohp); o2.connect(o2g); o2g.connect(ohp);
    ohp.connect(of); of.connect(og); og.connect(gate);
    o.start(t); o.stop(t + DUR + 0.02);
    o2.start(t); o2.stop(t + DUR + 0.02);
    lfo.start(t); lfo.stop(t + DUR + 0.02);

    // The arc itself: a thin band of noise up where the spark lives, riding on
    // through the buzz rather than snapping shut after one frame.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const nf = this.ctx.createBiquadFilter();
    nf.type = 'bandpass'; nf.frequency.value = 4600; nf.Q.value = 1.2;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.003 * q, t + 0.008);
    ng.gain.exponentialRampToValueAtTime(0.0009 * q, t + 0.13);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + DUR * 0.85);
    ng.gain.linearRampToValueAtTime(0, t + DUR - 0.005);
    src.connect(nf); nf.connect(ng); ng.connect(gate);
    src.start(t); src.stop(t + DUR);
  }

  // A breathy shooting-star gesture routed through the music bus, so it sits
  // inside the title theme's echo and volume rather than behaving like an SFX.
  cometSwoop() {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(920, t + 0.52);
    o.frequency.exponentialRampToValueAtTime(610, t + 1.25);
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.026, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.013, t + 0.72);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    g.gain.linearRampToValueAtTime(0, t + 1.34 - 0.005);
    o.connect(f); f.connect(g);
    if (this.ctx.createStereoPanner) {
      const pan = this.ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.65, t); pan.pan.linearRampToValueAtTime(0.55, t + 1.2);
      g.connect(pan); pan.connect(this.musicBus);
    } else g.connect(this.musicBus);
    o.start(t); o.stop(t + 1.34);
  }

  // A jump you can actually hear rising: one square wave gliding up over two
  // and a half octaves, with the envelope HELD through the climb so the sweep
  // is still loud when it reaches the top. A plain decaying osc() swallows the
  // top of the glide, which is what made the old one feel flat.
  jumpTone(when = 0, pitch = 1, gain = 0.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const dur = 0.17;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'square';
    // A bare square puts harmonics at 3.4k/5.7k by the top of the sweep —
    // right where the ear is most sensitive — so this read as louder than
    // cues sitting at the same gain. Roll them off instead of only pulling
    // the level down. Non-resonant, so the shape of the sweep is untouched.
    f.type = 'lowpass';
    f.Q.value = 0.7;
    f.frequency.setValueAtTime(2200 * pitch, t);
    o.frequency.setValueAtTime(200 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(1150 * pitch, t + dur * 0.82);
    g.gain.setValueAtTime(0.0001, t);
    const peak = gain * this.cueGain;
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.setValueAtTime(peak, t + dur * 0.45); // shorter hold: a blip, not a blast
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.05 - 0.005);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // One PAC-style bite: pitch and filter glide down as the mouth closes and
  // back up as it opens. The glide is what makes it read as "waka" rather
  // than a beep — a square through a resonant lowpass keeps the mouthy timbre.
  // `hold` is the fraction of the note spent at full level before the release.
  // The coin bite uses a shorter one than the hazard chomp: it fires on every
  // pickup, and it's the sustain — not the peak — that made it wearing.
  waka(when = 0, pitch = 1, gain = 0.13, hold = 0.75) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const dur = 0.12;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'square';
    f.type = 'lowpass';
    f.Q.value = 6;
    o.frequency.setValueAtTime(1000 * pitch, t);
    o.frequency.linearRampToValueAtTime(280 * pitch, t + dur * 0.5);
    o.frequency.linearRampToValueAtTime(940 * pitch, t + dur);
    f.frequency.setValueAtTime(2600 * pitch, t);
    f.frequency.linearRampToValueAtTime(700 * pitch, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(2400 * pitch, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    const peak = gain * this.cueGain;
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.setValueAtTime(peak, t + dur * hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.03 - 0.005);
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // A 25% duty-cycle pulse — the classic arcade PSG timbre, hollow and reedy
  // where a square is fat. Built from the exact Fourier series for the duty
  // (b_n = 2/(nπ)·sin(nπd)) rather than a hand-picked pair of partials, and
  // cached because a PeriodicWave is immutable and not cheap to build.
  pulseWave(duty = 0.25, harmonics = 24) {
    if (!this.ctx) return null;
    // One implementation, in src/engine/voices.js, shared with the layer synth's `pulse`
    // waveform. `sine: true` and 24 harmonics are what this cue was built on, and keeping
    // both is what makes its render bit-identical to every WAV already on disk.
    return pulseTable(this.ctx, duty, { harmonics, sine: true });
  }

  // The arcade death jingle: eleven rapid downward sweeps that each start and
  // end lower than the last, then a two-tone drop where the sprite blinks out.
  //
  // Three things make it read as THE sound rather than "a descending beep":
  //   * the sweep is STEPPED, not glided. The original PSG walked its frequency
  //     register in discrete increments and the staircase is audible — it's the
  //     buzz inside the fall. A smooth exponentialRamp sounds like a slide
  //     whistle instead.
  //   * every sweep re-articulates. The level jumps back up at the top of each
  //     cycle and sags across it, which is what gives the pulsing "wobble".
  //   * it slows down as it goes. Cycles lengthen and quieten toward the end,
  //     so the thing runs out of life instead of stopping.
  // Then the tail: ~145Hz for 80ms and a final ~110Hz pluck that collapses to
  // nothing — the "bloop-bloop" as the sprite folds up and vanishes.
  pacDeath(when = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const wave = this.pulseWave(0.25);
    const q = this.cueGain;

    const CYCLES = 11;
    const STEPS = 14;          // frequency staircase per sweep
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    // Non-resonant roll-off: a 25% pulse puts real energy up at the 5th and 7th
    // harmonic, and at the top of the first sweeps that lands in the ear's
    // sorest band. Track it down with the pitch so the fall gets duller as it
    // gets lower, the way the cabinet's little speaker did it for free.
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(6200, t0);
    if (wave) o.setPeriodicWave(wave); else o.type = 'square';

    const peak0 = 0.15 * q;
    g.gain.setValueAtTime(0.0001, t0);
    let t = t0;
    for (let i = 0; i < CYCLES; i++) {
      const k = i / (CYCLES - 1);
      const top = 1560 * Math.pow(0.943, i);   // ~1560Hz down to ~840Hz
      const bot = 470 * Math.pow(0.962, i);    // ~470Hz down to ~310Hz
      const dur = 0.082 + 0.042 * k;           // 82ms at full pelt, 124ms by the end
      for (let s = 0; s < STEPS; s++) {
        const f = top * Math.pow(bot / top, s / (STEPS - 1));
        o.frequency.setValueAtTime(f, t + dur * (s / STEPS));
      }
      const peak = peak0 * (1 - 0.4 * k);
      // First cycle fades in over 5ms so the pulse doesn't start on a click;
      // the rest snap back to full at the top of their sweep.
      if (i === 0) g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      else g.gain.setValueAtTime(peak, t);
      g.gain.linearRampToValueAtTime(peak * 0.5, t + dur * 0.93);
      t += dur;
    }
    lp.frequency.exponentialRampToValueAtTime(2400, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    g.gain.linearRampToValueAtTime(0, t + 0.05 - 0.005);
    o.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    o.start(t0); o.stop(t + 0.05);

    // ---- the tail: sprite folds up, sprite is gone ----------------------
    const drop = (f0, f1, at, dur, gain, sub = 0) => {
      const to = this.ctx.createOscillator();
      const tg = this.ctx.createGain();
      const tf = this.ctx.createBiquadFilter();
      tf.type = 'lowpass'; tf.Q.value = 0.9; tf.frequency.value = 1800;
      if (wave) to.setPeriodicWave(wave); else to.type = 'square';
      to.frequency.setValueAtTime(f0, at);
      to.frequency.exponentialRampToValueAtTime(f1, at + dur);
      tg.gain.setValueAtTime(0.0001, at);
      tg.gain.exponentialRampToValueAtTime(gain, at + 0.006);
      tg.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      tg.gain.linearRampToValueAtTime(0, at + dur + 0.02 - 0.005);
      to.connect(tf); tf.connect(tg); tg.connect(this.sfxGain);
      to.start(at); to.stop(at + dur + 0.02);
      // A sine an octave under the final pluck: the pulse alone is all buzz and
      // no weight, and on laptop speakers the last note has to land.
      if (sub > 0) {
        const so = this.ctx.createOscillator(); so.type = 'sine';
        const sg = this.ctx.createGain();
        so.frequency.setValueAtTime(f0 * 0.5, at);
        so.frequency.exponentialRampToValueAtTime(Math.max(24, f1 * 0.5), at + dur);
        sg.gain.setValueAtTime(0.0001, at);
        sg.gain.exponentialRampToValueAtTime(sub, at + 0.008);
        sg.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        sg.gain.linearRampToValueAtTime(0, at + dur + 0.02 - 0.005);
        so.connect(sg); sg.connect(this.sfxGain);
        so.start(at); so.stop(at + dur + 0.02);
      }
    };
    // A breath between the sweeps and the tail — the pause is half the gag.
    const tailAt = t + 0.07;
    drop(190, 132, tailAt, 0.085, 0.2 * q);
    drop(118, 38, tailAt + 0.095, 0.15, 0.22 * q, 0.16 * q);
  }

  // The portal's room, built once on first use and kept.
  //
  // A SEND owned by this one cue, not reverb on the SFX bus. sfxGain carries
  // every jump, coin and footstep in the game, and those are all sounds made
  // inches from the player — wetting them is a whole-game art decision, not a
  // credits tweak. This way exactly one cue is in a room.
  //
  // makeReverb is the desk's convolution reverb from effects.js (seeded impulse
  // response — see the note there on why it is ours and not Tone's), which is
  // plain Web Audio underneath and so drops onto the SFX side unchanged.
  portalVerbSend() {
    if (this.portalSend) return this.portalSend;
    const send = this.ctx.createGain();
    send.gain.value = 1;
    // Filter the SEND, not the cue: the dry swoosh keeps its full top end while
    // the tail loses it, which is what puts the room behind the sound rather
    // than on top of it. The highpass matters just as much — the cue's 95→42Hz
    // thump convolved into a second-and-a-half tail is mud, not weight.
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 240;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3600;
    // Fully wet: the dry path is the cue's own direct connection, so anything
    // less here would just double the dry signal at the wrong level.
    const verb = makeReverb(this.ctx, { decay: PORTAL_VERB_DECAY, preDelay: 0.018, wet: 1 });
    send.connect(hp); hp.connect(lp); lp.connect(verb.input);
    verb.output.connect(this.sfxGain);
    this.portalVerb = verb;
    this.portalSend = send;
    return send;
  }

  // A hero crossing the portal in the credits hand-off: rush IN, flash, rush
  // OUT. Deliberately three parts rather than one burst — the art either side
  // of the swap is two different heroes running two different directions, and a
  // single symmetrical whoosh would sit on top of that instead of describing it.
  //
  // The cue is ~0.5s and the transit's ACTIVE window is ~4s, so this punctuates
  // the crossing; it does not score it.
  //
  // NOTE the cue does NOT start at the crossing — its flash is
  // PORTAL_CUE_FLASH_AT into it, so the caller has to fire it that far ahead or
  // the rise lands on the wrong hero. See CreditsState.enter().
  /**
   * @param {object} shape  How long and how wide, with 1 meaning exactly as authored.
   *   stretch — scales the sweeps AND the seam, so the flash stays at the joint
   *   q       — resonance of the swept bands: up is whistly, down is airy hiss
   *   spread  — how far the bands travel, which is how much movement you hear
   *   wet     — how much of it goes into the room
   *   thump   — the low sine under the seam. 0 takes it out entirely.
   *   flash   — the two-partial discharge at the seam. 0 takes it out entirely.
   *   pan     — how far the two legs travel across the stereo field. 0 is centred.
   *   overlap — seconds of the exit pulled back UNDER the approach, so the leg going
   *             out and the leg coming in cross rather than queue.
   *   legs    — 'both', or one half of the gesture on its own. The two legs of this cue
   *             answer different questions and can be fired at different moments: 'in'
   *             is a hero arriving at a doorway, 'out' is one going through it. Split,
   *             the rise can play on approach — whether or not the portal is taken —
   *             and the fall can wait for the crossing, which is the only moment that is
   *             actually knowable. See RunState.updatePortal.
   *   body    — bottom end under the gesture. 0 is none.
   *   swell   — a FLOOR under each leg's attack, as a fraction of its own length. The
   *             exit leg attacks in 4% of its duration by design, because it was written
   *             as a departure that starts bright and falls away; dragged forward by
   *             `overlap` that same attack arrives with nothing in front of it and reads
   *             as a drum hit. Raising the floor makes it swell in instead.
   * Defaults reproduce the original cue sample for sample; the credits rely on that.
   */
  // The speed ramp's payout. It used to borrow 'dash' — one bandpassed noise
  // swish at 0.18 — which is a body moving, not a machine firing, and at that
  // gain it sat under the music where the thing it reports is the single most
  // generous event in the lane.
  //
  // NO LOW SINE. The first pass opened with a 190->58Hz kick for "the shove in
  // the legs", and a descending sine under a transient is the exact recipe for
  // a kick drum — it read as percussion, which put the cue on the beat grid
  // instead of on the event. Everything here now RISES, because the one thing
  // the cue has to say is that you got faster.
  //
  // A short high click for the attack (an edge, not a thump), a sawtooth sweep
  // as the body, a detuned square above it for fizz, two noise bands for air —
  // the live filter cannot sweep, so two overlapping bursts fake the rise —
  // and a bright tail that resolves upward instead of just stopping.
  // Roughly twice the level of the first pass, and half again as long. The
  // reason it went unnoticed was not only gain: it was 0.16s of mostly HIGH
  // noise, and high noise is the first thing a busy mix masks — every cabinet's
  // music has hats and the arcade room tone sits right on top of it. The sweep
  // now starts down at 200Hz where nothing else in the cue lives, and holds
  // long enough (0.3s) to register as an event rather than a tick.
  // Fourth pass, on the note that the payout still felt weak next to its own
  // telegraph. Two things were wrong and neither was the top end. The cue had
  // no WEIGHT — everything lived at 200Hz and up, so it was bright and thin
  // where the thing it describes is the hero being shoved — and it was short
  // where the tick run leading into it had been getting steadily longer. So: a
  // saw an octave below the sweep for body, everything up a few dB, and the
  // upward resolve held longer so the cue ENDS on the rise rather than getting
  // out of the way of it. Still nothing descending anywhere — a falling layer
  // auditioned as a kick drum, and that is what got the first pass thrown out.
  //
  // Fifth pass: LENGTH. Everything above was about level and weight, and the
  // cue still ran out before the event did — the hero is visibly still being
  // carried when the sound has already finished, and a payout that stops early
  // reports a smaller thing than happened. Layer durations are up ~1.8x, to
  // about 0.6s. Only the durations: the sweep travels the same 200->1500Hz, it
  // just takes longer to get there, so the cue is a shove rather than a snap.
  // The attack edge does NOT stretch — a transient that lengthens stops being
  // a transient — and the rising layers are staggered further apart so the
  // second half of the cue is still climbing rather than merely ringing out.
  boostWhoosh() {
    if (!this.ctx) return;
    this.noise(0.035, 0.26, 'highpass', 4500);          // attack edge
    this.osc('sawtooth', 100, 750, 0.6, 0.24);          // body, an octave down
    this.osc('sawtooth', 200, 1500, 0.55, 0.38);        // the sweep, body
    this.osc('square', 300, 2200, 0.42, 0.2, 0.01);     // fizz above it
    this.noise(0.3, 0.3, 'bandpass', 900);              // air, low band
    this.noise(0.5, 0.34, 'bandpass', 2800, 0.06);      // air, rising
    this.osc('triangle', 1568, 2350, 0.34, 0.26, 0.22); // resolves up, late
  }

  // The approach tick. Deliberately tiny — it fires several times as the hero
  // closes on a pad and the pads are common, so anything with a body would
  // become the loudest repeated thing in a run. Pitch rises with the arm, so
  // the sequence itself is the telegraph rather than any single blip.
  boostTick(pitch = 1) {
    if (!this.ctx) return;
    // Third pass on the level. The first two treated this as a click; the
    // problem is that a click has almost no ENERGY however loud you make its
    // peak — the ear integrates over roughly 50ms, so a 30ms blip at 0.12 is
    // quieter to listen to than a 60ms tone at 0.12 even though a meter says
    // otherwise. It is now long enough to be heard rather than merely detected,
    // and the sine under it carries a pitch the square alone does not.
    // Trimmed about 3dB off that pass. The length is what made it audible, so
    // the length stays and only the level comes down — a run of seven or eight
    // of these was sitting on top of the music rather than under it.
    this.osc('square', 1500 * pitch, 1500 * pitch, 0.06, 0.14);
    this.osc('sine', 750 * pitch, 750 * pitch, 0.085, 0.11);
  }

  portalSwoosh({
    stretch = 1, q: qMul = 1, spread = 1, wet: wetMul = 1,
    thump = 1, flash = 1, pan: panSpread = 0, overlap = 0, swell = 0, legs = 'both',
    body = 0,
  } = {}) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const q = this.cueGain;

    // A per-layer tap into the shared room. Each layer gets its OWN send amount
    // rather than the cue going in at one level, because they want different
    // distances: the approach is a hero still on this side of the doorway and
    // stays fairly dry, the flash is the portal itself and is the wettest thing
    // in the cue, and the exit trails away into the tail.
    // No cueGain here: every layer's own envelope is already trimmed by it, so
    // scaling the tap too would trim the room twice and leave it dry.
    const send = this.portalVerbSend();
    const wetTap = (amount) => {
      const w = this.ctx.createGain();
      w.gain.value = amount * PORTAL_VERB_SEND;
      w.connect(send);
      return w;
    };
    // osc() connects to a single destination, so layers built with it get a
    // splitter that feeds the dry bus and the room together.
    const dryWet = (amount) => {
      const n = this.ctx.createGain();
      n.connect(this.sfxGain);
      if (amount > 0) n.connect(wetTap(amount));
      return n;
    };

    // One noise source through a SWEPT bandpass. A fixed band is just a hiss —
    // it is the band's movement that reads as something travelling past. peakAt
    // places the loudest moment within the sweep, which is what separates an
    // approach (loudest as it arrives) from a departure (loudest as it leaves).
    const sweep = (at, dur, f0, f1, gain, Q, peakAt, wet = 0, panFrom = 0, panTo = 0) => {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = Q * qMul;
      bp.frequency.setValueAtTime(f0, at);
      bp.frequency.exponentialRampToValueAtTime(f1, at + dur);
      const g = this.ctx.createGain();
      const peak = gain * q;
      const hold = Math.max(0.006, dur * Math.max(peakAt, swell));
      // LINEAR attack, unlike every other cue in here. Those all attack in 8ms,
      // where the curve is inaudible; a swoosh crescendos over a fifth of a
      // second, and an exponential ramp across that long spends most of it near
      // silence and then leaps — which reads as a swell with a click on it, not
      // as something approaching. Measured: exponential put the approach 32dB
      // down at its own halfway point.
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + hold);
      // Decay in two stages for the same reason in reverse. A single
      // exponential to the floor is 20dB down by a third of the way through, so
      // a 0.3s tail was audible for 0.08s of it. Gliding to -30dB across the
      // whole window and only then dropping out spreads the fall over the time
      // the hero is actually still travelling.
      const rel = Math.min(0.03, (dur - hold) * 0.25);
      g.gain.exponentialRampToValueAtTime(peak * 0.03, at + dur - rel);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      g.gain.linearRampToValueAtTime(0, at + dur + 0.02 - 0.005);
      src.connect(bp); bp.connect(g);
      // A MOVING pan, not a placed one: something that passes you crosses the field
      // while it goes, and that movement is most of what reads as travel. Skipped
      // entirely at pan 0, so the centred cue is the same graph it always was.
      let out = g;
      if (panSpread > 0 && this.ctx.createStereoPanner) {
        const pn = this.ctx.createStereoPanner();
        pn.pan.setValueAtTime(panFrom * panSpread, at);
        pn.pan.linearRampToValueAtTime(panTo * panSpread, at + dur);
        g.connect(pn); out = pn;
      }
      out.connect(this.sfxGain);
      if (wet > 0) out.connect(wetTap(wet * wetMul));
      src.start(at); src.stop(at + dur + 0.02);
    };

    // The seam moves with the sweeps, or a stretched cue would flash a fifth of a
    // second in with half a second of approach still to run. Callers that fire this
    // ahead of a crossing have to lead by the same amount — see portalCueFlashAt.
    const SWAP = PORTAL_CUE_FLASH_AT * stretch;
    // Widening pushes each band's ENDS apart rather than sliding the whole range, so a
    // wider sweep travels further in the same direction rather than becoming a different
    // sound. `up`/`dn` because the approach climbs and the exit falls.
    const up = (f0, f1) => [f0 / spread, f1 * spread];
    const dn = (f0, f1) => [f0 * spread, f1 / spread];
    // Fired on its own, the fall IS the cue: it starts when it is asked to, because
    // there is no approach in front of it to wait for and its seam is its own beginning.
    const seam = legs === 'out' ? 0 : SWAP;

    // Approach: band climbing, level climbing, loudest at the doorway. Rising pitch is
    // the whole tell that this hero is going somewhere, not just running — the same
    // reason the animation accelerates into the portal. Driest layer in the cue: this
    // hero is still on THIS side of the doorway, and a wet approach makes the room
    // arrive before the portal does.
    if (legs !== 'out') sweep(t, 0.24 * stretch, ...up(240, 2800), 0.17, 1.6, 0.86, 0.3, -1, 0);

    // Exit: the mirror. Starts bright and open at full level, falls away dark. Longer
    // than the approach so the tail carries past the seam, matching the exit leg being
    // the longer of the two on screen. Wet — by now the room is open and the hero is
    // leaving through it. `overlap` slides it back under the approach, which is the
    // difference between a relay and a queue.
    if (legs !== 'in') {
      sweep(t + (legs === 'out' ? 0 : SWAP + 0.01 - overlap * stretch), 0.32 * stretch,
        ...dn(2600, 170), 0.14, 1.4, 0.04, 0.85, 0, 1);
    }

    // Bottom end that SWELLS rather than knocks.
    //
    // The cue used to get its weight from a 95Hz sine dropped under the seam, and that
    // WAS the knock: a transient in the middle of a swoosh, in the one place a swoosh
    // wants nothing to happen. This does the same job by the same means as everything
    // else in here — a second swept band, well below the first, on the same envelope —
    // so the weight arrives with the gesture instead of interrupting it.
    //
    // Broad Q, because this is a bed and not a note, and nearly dry: the send's highpass
    // would eat most of it anyway, and low end in a tail is the fastest way to turn a
    // room into mud. Louder than the bands above it because it is doing its work an
    // octave and a half down, where the ear needs more of it to hear the same amount.
    if (body > 0) {
      if (legs !== 'out') {
        sweep(t, 0.24 * stretch, ...up(70, 240), 0.20 * body, 0.7, 0.86, 0.08, -0.6, 0);
      }
      if (legs !== 'in') {
        sweep(t + (legs === 'out' ? 0 : SWAP + 0.01 - overlap * stretch), 0.32 * stretch,
          ...dn(260, 55), 0.22 * body, 0.7, 0.04, 0.15, 0, 0.6);
      }
    }

    // The flash at the seam. Teal energy rather than a bell: two partials a
    // fifth apart bending UP and out, which reads as a discharge instead of a
    // chime, and stays clear of the coin/cash family's ringing metal.
    // (osc() applies cueGain itself; only the hand-built sweeps above have to.)
    //
    // Fully into the room. This is the portal, and the tail it throws is what
    // makes the doorway sound like it opens onto somewhere much bigger than the
    // corridor the crawl is scrolling through.
    if (flash > 0) {
      this.osc('triangle', 700, 1500, 0.13, 0.085 * flash, Math.max(0, seam - 0.02), dryWet(1));
      this.osc('sine', 1050, 2250, 0.10, 0.05 * flash, Math.max(0, seam - 0.02), dryWet(1));
    }
    // ...and a short thump under it. Noise sweeps alone have no bottom, and on
    // laptop speakers the hand-off has to feel like something happened. Kept
    // nearly dry — the send's highpass would eat most of it anyway, and low end
    // in a tail is the fastest way to turn a room into mud.
    // THE KNOCK. Deliberate — noise sweeps have no bottom and this gives the handoff a
    // body on laptop speakers — but it is the loudest single element in the cue and it
    // lands square in the middle of the swoosh, which is exactly where a swoosh wants
    // nothing to happen. `thump: 0` takes it out; expect a thinner cue on small speakers.
    if (thump > 0) this.osc('sine', 95, 42, 0.16, 0.16 * thump, Math.max(0, seam - 0.01), dryWet(0.12));
  }

  sfx(name, opt = {}) {
    this.resumeAfterPanic();
    if (!this.ctx) return;
    // `opt.gain` scales this ONE firing, on top of the cue's own trim. For a cue used in
    // two places that want it at two strengths — the portal swoosh is a background swap
    // in the credits and the thing that announces a level starting — which is otherwise
    // a choice between changing it for both or copying it into a second name.
    this.cueGain = (SFX_TRIM[name] ?? 1) * (opt.gain ?? 1);
    const combo = opt.combo || 0;
    // opt.pitch is the direct form, for cues that want spread rather than a
    // combo ladder — the fireworks detune every shot so no two bursts twin.
    const pitch = opt.pitch ?? Math.pow(1.06, combo);
    switch (name) {
      // Quieter than 'coin' on purpose: it's a square wave (loud for its
      // amplitude) and it fires more often than any other cue in the game.
      case 'jump': this.jumpTone(0, 1, 0.055); break;
      case 'jump2': this.jumpTone(0, 1.5, 0.045); break; // double jump: same shape, a fifth up
      case 'land': this.noise(0.06, 0.15, 'lowpass', 400); break;
      case 'coin': this.osc('square', 988 * pitch, 988 * pitch, 0.06, 0.12); this.osc('square', 1319 * pitch, 1319 * pitch, 0.07, 0.12, 0.06); break;
      // A cash-register cha-CHING. What sells it is the CONTRAST between the
      // two halves — make them the same and it just reads as a two-note
      // doorbell. So:
      //   "cha"  — the drawer latch: a short, dull mechanical clack, all noise
      //            and a woody thunk, no ring.
      //   "ching"— the register bell: bright INHARMONIC partials that ring out.
      //            Metal reads as metal because it resonates at non-integer
      //            ratios; these are the modes of an ideal free bar
      //            (1 : 2.76 : 5.40 : 8.93, the glockenspiel), struck by a
      //            bright noise transient. This half is the whole gesture, so
      //            it lands higher, louder and long.
      case 'cash': {
        const barModes = [[1, 0.5], [2.76, 0.34], [5.40, 0.2], [8.93, 0.12]];
        // "cha": the drawer latch snapping open — a chunky mechanical clack
        // with real body, not a soft thud. A bright click transient, a midrange
        // mechanical rasp for meat, a square thunk for weight, and a short
        // DAMPED metallic ring on the same bar modes as the bell (choked off
        // fast, so the two halves share a metal but stay clearly distinct).
        this.noise(0.035, 0.14, 'highpass', 3200);   // latch click
        this.noise(0.05, 0.13, 'bandpass', 1800);    // mechanical rasp — mid body
        this.osc('square', 300, 175, 0.07, 0.11);    // woody thunk with harmonics
        for (const [ratio, amp] of barModes.slice(0, 3)) {
          this.osc('sine', 330 * ratio, 330 * ratio, 0.09 * (ratio < 3 ? 1 : 0.6), 0.12 * amp);
        }
        // "ching": the register bell, a beat later — the payoff, higher and
        // ringing out. Bright INHARMONIC free-bar partials struck by a noise
        // transient; upper modes decay faster, the way a real bar rings out.
        const bell = 0.14;
        this.noise(0.012, 0.13, 'highpass', 7000, bell);   // striker on the bell
        for (const [ratio, amp] of barModes) {
          this.osc('sine', 784 * ratio, 784 * ratio, 0.62 * (ratio < 3 ? 1 : 0.55), 0.18 * amp, bell);
        }
        break;
      }
      case 'power': [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.09, 0.15, i * 0.07)); break;
      case 'shield': this.noise(0.2, 0.2, 'highpass', 2000); this.osc('sawtooth', 220, 80, 0.25, 0.18); break;
      // Invincibility on: a fast rising run that lands on an octave shimmer.
      case 'star': [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.osc('square', f, f, 0.07, 0.13, i * 0.045)); break;
      // ...and off: the same run walking back down, quieter.
      case 'starEnd': [1568, 1319, 1047, 784].forEach((f, i) => this.osc('triangle', f, f, 0.09, 0.1, i * 0.06)); break;
      case 'hit': this.osc('sawtooth', 200, 40, 0.4, 0.25); this.noise(0.15, 0.2, 'lowpass', 900); break;
      // Shared attack contact: a noisy crash, not a pitched little bonk. The
      // wide noise layers carry on small speakers; the low layer gives it the
      // physical hit; the bright transient makes the contact unmistakable.
      // This is separate from 'crunch' (a prop breaking) and 'hit' (the player
      // taking damage), so weapon contact reads before the target reacts.
      case 'impact':
        this.impactCrash(pitch);
        break;
      case 'contact': this.playContact(opt.hero, pitch); break;
      case 'launch': this.playLaunch(opt.hero, pitch); break;
      case 'die': [330, 262, 220, 165].forEach((f, i) => this.osc('triangle', f, f, 0.14, 0.18, i * 0.15)); break;
      case 'dash': this.noise(0.3, 0.18, 'bandpass', 1800); break;
      case 'boost': this.boostWhoosh(); break;
      case 'boostTick': this.boostTick(pitch); break;
      case 'portal': this.portalSwoosh(opt.shape); break;
      case 'shoot': this.osc('square', 900, 500, 0.08, 0.14); break;
      case 'axe': this.noise(0.25, 0.12, 'bandpass', 900); this.osc('square', 300, 500, 0.2, 0.08); break;
      case 'crunch': this.noise(0.1, 0.22, 'lowpass', 600); this.osc('sine', 150, 60, 0.12, 0.2); break;
      // The chunks landing, a beat after the thing came apart. Deliberately a
      // separate cue from the break itself: it starts ~0.1s late (roughly the
      // shards' flight time) and thins out, so a break reads as impact-then-
      // scatter instead of one flat noise burst. Material picks the timbre.
      case 'debris': {
        const m = DEBRIS_MATS[opt.mat] || DEBRIS_MATS.wood;
        for (let i = 0; i < m.ticks; i++) {
          // uneven spacing — evenly spaced ticks read as a machine, not rubble
          const when = 0.1 + i * 0.062 + (i % 2) * 0.021;
          this.noise(m.dur, m.gain * (1 - i * 0.22), m.type, m.freq * (1 - i * 0.12), when);
        }
        if (m.ping) m.ping.forEach((f, i) => this.osc('triangle', f, f * 0.94, 0.07, 0.035, 0.12 + i * 0.08));
        break;
      }
      // A !-box giving way overhead: a hard ceramic crack on top of a gut
      // thump, then splinters raining down. 'crunch' was too polite for a hit
      // you are meant to go out of your way to land.
      case 'blockBreak':
        this.noise(0.05, 0.34, 'highpass', 3200);        // the crack
        this.noise(0.22, 0.26, 'bandpass', 950);         // the body letting go
        this.osc('sine', 190, 45, 0.2, 0.32);            // thump
        this.osc('square', 620, 300, 0.09, 0.12, 0.01);  // splintering edge
        [0.07, 0.13, 0.19].forEach((d, i) => this.noise(0.05, 0.11 - i * 0.03, 'bandpass', 2400 - i * 500, d));
        break;
      // Coins spilling out of it: one blip per coin, staggered and climbing,
      // with a shimmer over the top so a big payout sounds like a big payout.
      case 'coinSpray': {
        const nCoins = Math.max(1, Math.min(10, opt.count || 3));
        for (let i = 0; i < nCoins; i++) {
          const p = Math.pow(1.07, i);
          const when = 0.045 + i * 0.055;
          const g = 0.13 - i * 0.006;
          this.osc('square', 988 * p, 988 * p, 0.05, g, when);
          this.osc('square', 1319 * p, 1319 * p, 0.07, g, when + 0.045);
        }
        this.noise(0.3, 0.06, 'highpass', 6500, 0.05);
        break;
      }
      case 'tag': this.osc('sine', 500, 1000, 0.12, 0.16); this.osc('sine', 750, 1500, 0.12, 0.1, 0.03); break;
      case 'perfect': [660, 880, 1320].forEach((f, i) => this.osc('sine', f, f, 0.08, 0.14, i * 0.05)); break;
      case 'ui': this.osc('sine', 1200, 1200, 0.05, 0.1); break;
      case 'uiConfirm': this.osc('sine', 900, 900, 0.05, 0.1); this.osc('sine', 1350, 1350, 0.06, 0.1, 0.05); break;
      case 'uiBad': this.osc('square', 200, 150, 0.15, 0.12); break;
      // One bite per coin, exactly like eating dots; combos ride the pitch up.
      case 'waka': this.waka(0, pitch, 0.13, 0.4); break;
      // The hazard bite gets the full waka-waka plus something giving way.
      case 'chomp':
        this.waka(0, 0.92, 0.15);
        this.waka(0.135, 0.84, 0.15);
        this.noise(0.06, 0.10, 'lowpass', 520, 0.25);
        break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.osc('square', f, f, 0.11, 0.14, i * 0.09)); break;
      case 'lose': [400, 350, 300, 200].forEach((f, i) => this.osc('sawtooth', f, f * 0.9, 0.16, 0.12, i * 0.12)); break;
      case 'pacDeath': this.pacDeath(); break;
      case 'checkpoint': this.osc('triangle', 700, 1400, 0.15, 0.14); break;
      // The plunger bottoming out. A latch, not a beep: a hard tick of noise for
      // the contact faces meeting, a short woody knock under it for the mass
      // behind them, and one high pip that decays instantly so the cue has an
      // edge at lane volume. `when` lets the caller line it up with the frame
      // the cap actually lands on — the sound is the bottom of the stroke, not
      // the start of it, and the two are a sixth of a second apart.
      case 'clickHard': {
        const w = Math.max(0, opt.when || 0);
        this.noise(0.02, 0.5, 'highpass', 3400, w);
        this.osc('square', 220 * pitch, 90 * pitch, 0.055, 0.16, w);
        this.osc('sine', 1650 * pitch, 1650 * pitch, 0.022, 0.12, w);
        break;
      }
      case 'boom': this.explosion(); break;
      // ---- Fireworks. Three burst shapes so a long results screen never
      // repeats the same crack twice in a row; the caller also detunes each.
      // The mortar going up: air, not tone. Rising sine underneath it only to
      // give the ear something to track to the top of the arc.
      // The pole ride. A slide whistle is a GLISS with a breath under it: a
      // sine sweeping down over the whole descent, a second one a hair detuned
      // so it beats rather than sitting dead still, and a thin band of noise for
      // the air in the tube. `dur` is passed in because the slide's length is
      // the grade — a high catch is a longer ride and has to be a longer whistle
      // or the sound stops describing what is happening on screen.
      //
      // Down, not up: the hero is descending. An upward gliss here read as a
      // question being asked at the exact moment the stage answers one.
      case 'slideWhistle': {
        // Ceiling raised with the pole ride itself: the descent now runs up to
        // ~1.1s and a whistle that stopped at 0.9 left the last stretch silent,
        // which reads as the sound being cut off rather than the slide ending.
        const d = Math.max(0.18, Math.min(1.5, opt.dur || 0.4));
        // `when` delays the whole cue. The walk-up path hops before it slides,
        // and a downward gliss that starts on the way UP describes the wrong
        // half of the move — so the caller hands us the length of the rise and
        // the whistle waits it out.
        const w = Math.max(0, Math.min(1, opt.when || 0));
        // Loud enough to be the sound of the moment. At 0.09 it was mixed like
        // background texture and lost under the landing thump and the payoff
        // chain that follow it — it is a gag, and a gag you have to strain for
        // is not one. The detuned twin carries most of the lift: two sines a
        // few cents apart beat against each other and the wobble is what makes
        // it read as a slide whistle rather than a tone sweep.
        // Held flat until the very end. A slide whistle is one continuous tone
        // for as long as the hand is moving — the level must not tell a story
        // the pitch is not telling, and a whistle that ebbs while the hero is
        // still coming down reads as the sound losing interest in him. HOLD is
        // the last fraction of the cue given over to the release, and it is
        // barely more than a stop: the tone lands, then it is gone.
        const HOLD = 0.92;
        this.osc('sine', 1500 * pitch, 420 * pitch, d, 0.17, w, null, HOLD);
        this.osc('sine', 1508 * pitch, 424 * pitch, d, 0.11, w, null, HOLD);
        this.noise(d, 0.05, 'bandpass', 1800, w, HOLD);
        break;
      }
      case 'fizzUp':
        this.noise(0.3, 0.09, 'bandpass', 1500);
        this.osc('sine', 260 * pitch, 880 * pitch, 0.3, 0.045);
        break;
      case 'popSmall':
        this.noise(0.09, 0.22, 'highpass', 2200);
        this.osc('triangle', 820 * pitch, 190 * pitch, 0.1, 0.09);
        break;
      case 'popBig':
        this.noise(0.32, 0.24, 'lowpass', 760);
        this.osc('sine', 190 * pitch, 48 * pitch, 0.3, 0.15);
        break;
      // The one with a tail: a crack, then glitter falling out of it.
      case 'crackle':
        this.noise(0.08, 0.2, 'highpass', 1800);
        for (let i = 1; i < 6; i++) this.noise(0.04, 0.1, 'highpass', 3200, 0.05 + i * 0.055);
        break;
      case 'plop': this.osc('sine', 300, 120, 0.15, 0.2); break;
      case 'type': this.osc('square', 800, 800, 0.02, 0.05); break;
      case 'comet': this.cometSwoop(); break;
      case 'neonBuzz': this.neonBuzz(); break;
    }
  }

  // ---- Music sequencer ------------------------------------------------------
  // Bank: {bpm, bass:[...], lead:[...], hats:[...], kick:[...], snare:[...],
  // clap:[...]} arrays of 32 steps (2 bars of 16ths); melodic values are
  // frequency or null, percussion is boolean. Loops with A/B lead.
  // `mixOverride` plays a mix that is not (yet) in src/data/mix.js — the desk
  // auditioning unsaved edits. Pass null for "no mix at all", undefined for "look
  // it up". `arrangementOverride` is the desk's current pattern/order state: giving
  // it here makes the first scheduled bank agree with the grid after a reload.
  // Level, pan, EQ and send edits go straight to the strips and need no re-bank;
  // only a voice change has to come back through here.
  /**
   * The gate one lane's notes play through, for as long as this song is the song.
   *
   * A scheduled source is fire-and-forget: `o.start(t); o.stop(t + dur)` and the note
   * belongs to the graph, not to us. That was fine while every lane's length was a
   * fraction of a step — setBank's half-second mute outlasted anything still ringing,
   * so a song change sounded like a stop. The piano roll's per-note lengths broke that
   * assumption: a drawn note can be bars long, and so can a sweep, a crash or the
   * sustained organ. Those notes carried on into the next song, and the mute lifting
   * after half a second is what handed them back — the old song, audibly playing
   * underneath the new one.
   *
   * So everything the sequencer schedules is connected through this pair instead of
   * straight to the strip. Disconnecting the pair stops the notes hanging off it dead,
   * whatever their stop times said, and the next song builds its own.
   *
   * Keyed by lane rather than by strip, and re-pointed rather than replaced when a
   * lane's strip changes underneath it (a layer arriving mid-song), so a Tone pool
   * that connected to this gate when it was built stays connected to it.
   */
  _laneGate(key, dryDest, wetDest) {
    if (!this.ctx || !dryDest || !wetDest) return null;
    let gate = this._laneGates.get(key);
    if (!gate) {
      const dry = this.ctx.createGain(); dry.gain.value = 1; dry.connect(dryDest);
      const wet = this.ctx.createGain(); wet.gain.value = 1; wet.connect(wetDest);
      gate = { dry, wet, dryDest, wetDest };
      this._laneGates.set(key, gate);
      return gate;
    }
    if (gate.dryDest !== dryDest) {
      try { gate.dry.disconnect(gate.dryDest); } catch { /* already gone */ }
      gate.dry.connect(dryDest); gate.dryDest = dryDest;
    }
    if (gate.wetDest !== wetDest) {
      try { gate.wet.disconnect(gate.wetDest); } catch { /* already gone */ }
      gate.wet.connect(wetDest); gate.wetDest = wetDest;
    }
    return gate;
  }

  /** The dry/wet gates used only by the preset library's bench. */
  _benchGate(key) {
    if (!this.ctx || !this.musicBus || !this.echoBus) return null;
    let gate = this._benchGates.get(key);
    if (gate) return gate;
    const output = this._previewOutput;
    const dryDest = output?.dry || output?.input || this.musicBus;
    const wetDest = output?.wet || output?.input || this.echoBus;
    const dry = this.ctx.createGain(); dry.gain.value = 1; dry.connect(dryDest);
    const wet = this.ctx.createGain(); wet.gain.value = 1; wet.connect(wetDest);
    gate = { dry, wet };
    this._benchGates.set(key, gate);
    return gate;
  }

  /**
   * Route future preset-bench notes through an optional audition-only output.
   *
   * The destination is deliberately a pair of Web Audio nodes rather than a mixer
   * insert: a standalone playground can put both preview sends through its temporary
   * effect chain without changing a song's strips, while the normal `null` route keeps
   * the historical music/echo buses. Existing bench gates are cut and rebuilt so a
   * destination change cannot leave one preset half on the old graph.
   */
  setPreviewOutput(output = null) {
    this.stopPreview();
    this._previewOutput = output && (output.dry || output.wet || output.input) ? output : null;
    return this._previewOutput;
  }

  /**
   * Stop every note this song still has sounding. The other half of setBank's mute.
   *
   * Silent by construction rather than by ramp: the trim is being slammed to 0.0001
   * in the same call, at the same `now`, so there is nothing audible left for a
   * disconnect to click on. What is left ringing after this is only what is already
   * past the strips — the reverb and echo returns, which decay on their own with
   * nothing left feeding them.
   */
  _cutLaneGates() {
    for (const gate of this._laneGates.values()) {
      gate.dry.gain.value = 0;
      gate.wet.gain.value = 0;
      try { gate.dry.disconnect(); } catch { /* already gone */ }
      try { gate.wet.disconnect(); } catch { /* already gone */ }
    }
    this._laneGates.clear();
  }

  /**
   * The same for the audition bench — but FADED, where the lane version slams.
   *
   * `_cutLaneGates` can be instant because the master trim is going to zero in the same
   * call: there is nothing audible for it to click on. Nothing covers this one. It runs
   * when a preview is stopped — a preset picked while the last one is still ringing, a
   * panel closed mid-note — and a gain set to zero under a sounding note is a step from
   * wherever the waveform happened to be to silence, which is exactly the click the ear
   * is best at hearing.
   *
   * Fifteen milliseconds, then the disconnect, which is soon enough to still read as
   * "stopped" and long enough that there is no edge in it.
   */
  _cutBenchGates() {
    const gates = [...this._benchGates.values()];
    this._benchGates.clear();
    if (!gates.length) return;
    const now = this.ctx?.currentTime ?? 0;
    const drop = (param) => {
      try {
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.linearRampToValueAtTime(0, now + BENCH_FADE);
      } catch { param.value = 0; }
    };
    const cut = () => {
      for (const gate of gates) {
        try { gate.dry.disconnect(); } catch { /* already gone */ }
        try { gate.wet.disconnect(); } catch { /* already gone */ }
      }
    };
    for (const gate of gates) { drop(gate.dry.gain); drop(gate.wet.gain); }
    // An offline render has no wall clock to wait on, and nothing is listening to it:
    // the fade is scheduled, and the graph comes apart at once.
    if (typeof this.ctx?.startRendering === 'function') cut();
    else setTimeout(cut, Math.ceil(BENCH_FADE * 1000) + 5);
  }

  /** Stop the preset-library audition without touching the song or its strips. */
  stopPreview() {
    this._cutBenchGates();
    this.voices?.stopPreview?.();
  }

  // `gap` is the silence this opens before the new song starts, and half a second is
  // what every caller wants: long enough that the old song's tail cannot run into the
  // new downbeat, short enough to read as a cut rather than a stop. It is a parameter
  // because the cabinet screen has a shutter closing over it — about 0.29s of it — and
  // whether the remainder is heard as a beat of silence or as a mistake is a thing to
  // decide by ear rather than by argument. See MusicDirector.play.
  setBank(bank, mixOverride = undefined, arrangementOverride = undefined, { gap = 0.5, formLoop = true } = {}) {
    // Re-selecting the current bank is common when returning to a menu. Keep
    // its phase intact; only a real bank change should restart the sequencer.
    // Compared against the bank as PASSED IN: applyMix may hand back a copy with
    // the saved voice overrides merged, and comparing against that copy would make
    // every re-selection look like a change.
    if (this.sourceBank === bank && mixOverride === undefined && arrangementOverride === undefined) return;
    this.resumeAfterPanic();
    this.stopPreview();
    this.sourceBank = bank;
    // A new song has its own arrangement, or none. `undefined` means the ordinary
    // game path should read the arrangement file; the desk passes its draft (or an
    // explicit null) so applyMix builds the live bank from exactly what its grid is
    // drawing. Setting it BEFORE applyMix is load-bearing — restoring it afterwards
    // changes the flag but not the bank the scheduler has already received.
    this.arrangement = arrangementOverride;
    // The voice rack is per song: a new bank, or the same bank with a different voice
    // chosen on the desk, wants its own synths. Nothing outlives this call, so
    // auditioning voices cannot silt the graph up with the ones you rejected. Safe to
    // do here because setBank already opens the new song after a clean half-second
    // gap — there is no tail to cut off.
    if (this.voices) { this.voices.dispose(); this.voices = null; }
    // And the same for the notes the rack does NOT play: the hand-written voices are
    // plain source nodes with their own stop times, and a drawn length, a sweep or a
    // crash can be longer than the gap this call opens. Only when a song was actually
    // sounding — at the top of an offline render there is nothing to cut, and cutting
    // there would put a node change into a render that has to stay sample-exact.
    if (this.bank) this._cutLaneGates();
    bank = this.applyMix(bank, mixOverride);
    this.bank = bank;
    this.musicTrim = bank?.musicTrim ?? 1;
    this.pendingStartDelay = bank ? gap : 0;
    if (this.songTrim) {
      const now = this.ctx.currentTime;
      this.songTrim.gain.cancelScheduledValues(now);
      if (bank) {
        // Mute any notes left in the old lookahead window, then open the new
        // bank after a clean gap.
        this.songTrim.gain.setValueAtTime(0.0001, now);
        this.songTrim.gain.setTargetAtTime(this.musicTrim, now + gap, 0.01);
        this.nextTime = now + gap;
      } else {
        this.songTrim.gain.setValueAtTime(0.0001, now);
      }
    }
    // `dynamics` is relative to the song playing and the kit tally belongs to its
    // arrangement, so both start over with it. Carrying a loud song's peak into a
    // quiet one would leave the visualizers stalled for the first half-minute of
    // the new track, and carrying its hits over would credit it with a kit.
    this._analysisPeak = 0;
    this._analysis.level = 0;
    this._analysis.dynamics = 1;
    this._analysis.drums = 0;
    this._analysis.drumless = false;
    this._percPending.length = 0;
    this._percHeard.length = 0;
    // A loop belongs to the song that armed it. Nothing cleared it here while only the
    // desk ever looped — the desk arms its range after selecting a track, so it never
    // noticed. The cabinet screen loops too now, and without this, backing out of one
    // to the food court left the HUB THEME playing the cabinet's four bars over and over.
    // Takes the early branch in setLoop and returns without touching `step`.
    this.setLoop();
    this.step = 0; // songs start from the top (section order matters now)
    // …unless the song says otherwise. `arrangement.loop` names the bar it starts on
    // and the bars it repeats, and this is the one call every playback path in the
    // game goes through — the title screen, the hub, a level, the jukebox and
    // MusicDirector alike — so arming it here is what makes an intro work everywhere
    // without a single call site knowing about it. `formLoop: false` is for the one
    // screen that must not loop: the credits roll and then end.
    if (formLoop) this.armSongLoop({ seek: true });
    if (bank && bank.bpm) {
      this.bpm = bank.bpm;
      // follows delayDivision, and grows the line if this bpm makes it a long one
      if (this.delay) this.growDelayLine(this.delayTimeSeconds()).delayTime.value = this.delayTimeSeconds();
    }
    // Unconditional, unlike the tempo above: a song with no swing has to REPLACE the
    // swing of whatever was playing before it, and `0` would fail a truthiness guard and
    // leave the shuffle on. Nothing tempo-synced follows it, so there is nothing to rebuild.
    this.swing = bank?.swing || 0;
    // A groove change belongs to the song that asked for it. Left standing, a swing
    // queued in the last bar of one song would land on the downbeat of the next.
    this.pendingSwing = null;
  }

  /**
   * The same merge as setBank, on the song that is already playing, without the gap.
   *
   * setBank exists to CHANGE songs, and half of what it does is about that: it mutes
   * for half a second so the old song's tail cannot run into the new one's downbeat,
   * moves the scheduler past the gap, and sends the sequencer back to the top. Choosing
   * a preset on the desk went through the same door and got the same treatment — the
   * song stopped dead for half a second and resumed, which is the wrong answer to
   * "what does this bass sound like here", because the answer is in the bar you were
   * listening to.
   *
   * So: re-merge the bank, push the mix back onto the strips, and leave the transport
   * exactly where it is. `step` is not reset, `nextTime` is not moved, and songTrim is
   * not touched — the notes already in the quarter-second lookahead play on their old voice and
   * everything after them is the new one.
   *
   * Falls back to setBank when the bank is not the one already up: that is a song
   * change whatever it was called, and it wants its gap.
   */
  reapplyBank(bank, mixOverride = undefined, arrangementOverride = undefined) {
    if (!bank || this.sourceBank !== bank || !this.bank) {
      return this.setBank(bank, mixOverride, arrangementOverride);
    }
    if (arrangementOverride !== undefined) this.arrangement = arrangementOverride;
    const entry = mixOverride !== undefined ? mixOverride : MIX[trackIdOf(bank)];
    // The MERGE only — not applyMix. The strips already hold this mix: a fader, a pan,
    // an EQ or a send edited on the desk goes straight to the channel and never comes
    // back through here. Running the whole of applyMix would reset all forty strips to
    // unity and re-push them, which drops any solo you were listening through and
    // rebuilds every effect chain — a lot of disturbance to answer a question about
    // one lane's timbre.
    // `trackIdOf` on the bank as PASSED IN, not on the patched one: it is object-identity
    // based, and deskBank hands back a new object with no id. The song's own preset
    // copies are scoped by it — see registerSongVoice.
    const id = trackIdOf(bank);
    this.mixEntry = entry || null;
    const arrangementId = id || '__explicit__';
    const arranged = this.arrangement !== undefined
      ? applyArrangement(bank, arrangementId, { [arrangementId]: this.arrangement })
      : applyArrangement(bank, id);
    const merged = withVoices(deskBank(arranged, entry), entry, id);
    this.bank = merged;
    // Only the lanes whose voice actually changed lose their synths. Disposing the
    // whole rack here — what setBank does — would cut every ringing Tone note on every
    // other channel because you moved the bass. See VoiceRack.prune.
    this.voices?.prune((laneKey) => voiceOf(merged, laneKey)?.id ?? null);
    return undefined;
  }

  /**
   * Change WHAT PLAYS WHEN, without stopping the song.
   *
   * The desk's bar grid edits an arrangement live: repeat these two bars, drop the
   * kit out of the repeats, cut that section. All of that is `order` and `sections`,
   * both of which `scheduleStep` reads fresh every sixteenth — so the edit is a swap
   * of two properties and an invalidated memo, and the next step scheduled is simply
   * in the new song. `step` and `nextTime` are left alone, exactly as `reapplyBank`
   * leaves them: you are listening to bar 12 and you should still be listening to
   * bar 12 afterwards.
   *
   * The memo is the whole reason this exists rather than being an assignment at the
   * call site. `barPlan` is keyed on the bank OBJECT, so mutating that object's order
   * in place would leave the plan it already computed standing — the song would keep
   * playing the old arrangement and nothing would say why.
   *
   * `patch` is `{ order, sections, bpm }`, the same shape src/data/arrangements.js
   * holds. Passing nothing puts the song back to what its bank was composed as —
   * including its composed tempo.
   */
  setArrangement(patch = null) {
    // Remembered as well as applied. Everything that re-applies a mix rebuilds the
    // bank from the song, so an arrangement that lived only in `this.bank` survived
    // exactly until the next fader move — see applyMix.
    this.arrangement = patch || null;
    if (!this.bank) return;
    // A NEW object every time, never a write into the one being played.
    //
    // When a song has no layers and no voice overrides, `applyMix` hands the
    // sequencer the module's own bank object back — so mutating `this.bank.order`
    // would edit the song itself, for every later play of it in this session, with
    // nothing on screen saying the composition had changed. Copying also means the
    // bar plan needs no invalidation: the memo is keyed on the bank object, and this
    // is a different one.
    //
    // `sourceBank` is the pristine song, which is what "no arrangement" goes back to
    // — its own order, and only its own sections, since layer sections belong to the
    // arrangement that declared them.
    const source = this.sourceBank || this.bank;
    const next = { ...this.bank };
    if (patch?.order?.length) next.order = [...patch.order];
    else if (source.order) next.order = [...source.order];
    else delete next.order;
    // SHAPED, not spliced raw. A duplicated lane and a deleted one are per-SECTION
    // decisions — `deskBank` writes the layer's notes into every section that has the
    // part and takes the deleted lane out of every one of them — and the bank being
    // played has already had that done to it. Concatenating the song's own sections
    // back in undid it for every section except the ones the edit itself wrote: a
    // duplicated drum track went silent in every bar but the bar you had just drawn
    // in (the grid went on drawing the beats, because it reads the shaped bank), and a
    // deleted track came back and played. Both fixed themselves the moment anything
    // touched a fader, because that path rebuilds through `applyMix`, which is the
    // shape of the bug: this was the one door into the bank that skipped the shaping.
    const list = patch?.sections?.length
      ? [...(source.sections || []), ...patch.sections]
      : (source.sections ? [...source.sections] : null);
    if (list) next.sections = deskBank({ ...source, sections: list }, this.mixEntry).sections;
    else delete next.sections;
    // The tempo, the same way round: the arrangement's while it names one, the song's
    // own again the moment it stops. `this.bpm` is what scheduleStep divides by, so it
    // moves with the bank or the edit is inaudible; the delay line follows because it
    // is tempo-synced and a slower song wants a longer one.
    const bpm = patch?.bpm ?? source.bpm;
    if (bpm) {
      next.bpm = bpm;
      if (bpm !== this.bpm) {
        this.bpm = bpm;
        if (this.delay) this.growDelayLine(this.delayTimeSeconds()).delayTime.value = this.delayTimeSeconds();
      }
    }
    // The swing the same way round, and the `??` matters as much as it does above: a
    // patch that drops its swing key is a song dragged back to straight, and it has to
    // fall through to the song's own rather than keep the last shuffle set on the desk.
    // Seamless by construction — nothing here is tempo-synced and `step` and `nextTime`
    // are untouched, so a drag across the range re-feels the music without a seam in it.
    const swing = patch?.swing ?? source.swing ?? 0;
    if (swing) next.swing = swing; else delete next.swing;
    this.swing = swing;
    // The desk setting a swing outright is an answer to the same question a queued one
    // was asked, and it arrives later — so it wins, rather than being overwritten a bar
    // afterwards by a change nothing on screen still refers to.
    this.pendingSwing = null;
    this.bank = next;
    // A step past the end of a shortened song would keep playing past it until the
    // modulo caught up. Wrapped here so a delete never leaves the playhead adrift.
    const steps = barPlan(next).length * 16;
    if (steps > 0 && this.step >= steps) this.step %= steps;
    // And the song's own loop with it, for the same reason: an edit that shortens the
    // form can leave the region hanging off the end of it, and `loopSteps` clamps
    // against the plan this call has just changed. Only when the song's markers are
    // what is armed — a range somebody selected on the desk is theirs, not ours — and
    // never with a seek, because an edit must not jump the music.
    if (this.formLoopArmed) this.armSongLoop();
  }

  // Push a song's saved mix onto the channel strips, and merge any voice overrides
  // into the bank. Returns the bank the sequencer should actually play — the same
  // object when there is nothing to merge, so the common case allocates nothing.
  //
  // Voice keys merge UNDER sections (`{...bank, ...voice}` then sections spread over
  // that at schedule time), so a section that sets the same key still wins. Lane
  // trims are relative and live on the strips, so per-section variation survives.
  applyMix(bank, mix = undefined) {
    const entry = mix !== undefined ? mix : (bank ? MIX[trackIdOf(bank)] : null);
    // Remembered for `setArrangement`, which has to re-shape the song's sections
    // without coming back through here — see the note there. A mix override is not
    // otherwise recoverable: the desk's unsaved edits are in no file to look up.
    this.mixEntry = entry || null;
    // The song's FORM, before anything else touches the bank: which bars play, in
    // which order, with which lanes dropped out of them. Read here because this is
    // already the one place a bank gets patched on its way to the sequencer — and
    // after the `trackIdOf` lookup above, because that is object-identity based and a
    // patched bank is a new object with no id.
    //
    // Hands back the same object for a song with no arrangement entry, which today is
    // every song: an empty layer is not merely harmless, it is nothing at all.
    //
    // `this.arrangement` is the DESK's unsaved arrangement, and it wins over the file
    // while it is set — `null` meaning "this song plays as composed", which is a
    // different answer from "look it up". Without this, every path that re-applies a
    // mix — a fader, a mute, a solo, an effect, a rebuild — rebuilt the bank from the
    // file and quietly threw the edit away: the grid went on drawing bars that the
    // sequencer had stopped playing.
    const id = bank ? trackIdOf(bank) : null;
    // A game alternate is deliberately not in the main track registry: it is a
    // candidate song object passed directly by the game. Its explicit arrangement
    // still has to apply, though — notably `arrangement.swing` — so give an
    // arrangement override its own lookup key when there is no track id.
    const arrangementId = id || '__explicit__';
    bank = this.arrangement !== undefined
      ? applyArrangement(bank, arrangementId, { [arrangementId]: this.arrangement })
      : applyArrangement(bank, id);
    // Then the song's SHAPE, before anything is pointed at a strip: a mix can add a
    // duplicated lane or take one out entirely, and both change which channels exist.
    // Hands back the same object when the mix says neither, which is every song that
    // has not been through the desk's Duplicate or Delete — see deskBank.
    bank = deskBank(bank, entry);
    if (this.mixer) {
      this.mixer.reset();
      // No family rule any more. A lane used to be on the delay because of what KIND
      // of lane it was — melodic and fx echoed by default, percussion opted in — so a
      // channel's echo answered to nothing you could point at, and turning one down
      // left the rest of the family echoing in the same rhythm. Every send now starts
      // at zero and comes from the mix, one channel at a time. The songs' echoes were
      // written into src/data/mix.js as ordinary sends when this changed, so they
      // sound exactly as they did and are editable where you can see them.
      //
      // Nor is there a rule about where the signal is TAPPED any more: the send takes
      // the whole lane on every strip (see makeStrip), so a channel reaches the delay
      // because its send is up and for no other reason. It used to tap only the voices
      // that set their own echo flag, which made the knob dead on a dry lane and dead
      // on any preset that declares itself dry — a control that silently does nothing.
      // laneList, not LANES: a layer needs a strip of its own, and it arrives with the
      // mix rather than with the engine, so this is the first moment it can be built.
      for (const { key } of laneList(bank)) {
        const strip = this.mixer.ensureLane(key);
        if (!strip) continue;
        strip.setSend({ delay: 0 });
      }
      // The rack is already back at defaults from reset() above; retune the
      // tempo-synced ones for this song's bpm, then lay the saved settings over.
      this.setDelay({ division: 0.75, feedback: 0.35, tone: 2800 });
      this.mixer.retune(bank?.bpm || this.bpm);
      if (entry) {
        this.mixer.setMasterTrim(entry.master || 0);
        this.mixer.setMasterPan(entry.masterPan || 0);
        this.mixer.setLimiter(!!entry.limiter);
        if (entry.masterEffects) this.mixer.setMasterEffects(entry.masterEffects, bank?.bpm || this.bpm);
        for (const [id, patch] of Object.entries(entry.fx || {})) {
          // Delay 1 is the engine's own echo; its time, feedback and damping live
          // on the AudioSys nodes, so those params route there. Its EQ and return
          // level are the mixer's, like every other aux.
          if (id === 'delay') {
            const { eq, level, pan, mute, effects, ...engineParams } = patch;
            this.setDelay(engineParams);
            this.mixer.setAux('delay', { eq, level, pan, mute }, bank?.bpm || this.bpm);
          } else {
            this.mixer.setAux(id, patch, bank?.bpm || this.bpm);
          }
          if (patch.effects) this.mixer.setAuxEffects(id, patch.effects, bank?.bpm || this.bpm);
        }
        for (const [key, raw] of Object.entries(entry.lanes || {})) {
          const strip = this.mixer.lane(key);
          if (!strip) continue;
          const s = laneSettings(raw);
          strip.setGain(s.gain);
          strip.setPan(s.pan);
          strip.setWidth(s.width ?? 1);
          strip.setMute(s.mute);
          strip.setEQ(s.eq);
          // Every aux, not just the two that existed first — naming them here is
          // how delay2/reverb2 got silently dropped. Nothing falls back to a family
          // default now: a send that is not in the mix is a send at zero.
          strip.setSend(s.send);
          // The channel delay used to be a bespoke insert here; it is an ordinary
          // entry in the effect chain now, so old mixes carrying `insert` are
          // migrated rather than silently dropped.
          const chain = raw?.effects ? [...raw.effects] : [];
          if (raw?.insert && (raw.insert.mix ?? 0) > 0) chain.unshift({ id: 'chandelay', params: raw.insert });
          if (chain.length) strip.setEffects(chain, bank?.bpm || this.bpm);
        }
      }
    }
    // Sends are final by here, so anything unused can be dropped from the graph.
    if (this.mixer) this.mixer.pruneAuxes();

    // `id` was read from the bank as passed in, above, before applyArrangement and
    // deskBank patched it — which is exactly what the song's preset copies need to be
    // scoped by. See registerSongVoice.
    return withVoices(bank, entry, id);
  }

  /**
   * Move the strips to another mix AT AN AUDIO TIME, without touching the transport.
   *
   * applyMix is the other half of setBank and behaves like it: `mixer.reset()` puts all
   * forty strips back to unity and every effect chain is rebuilt from scratch. That is
   * right for loading a song and wrong for changing how the one that is playing is
   * presented — it cuts every reverb tail, drops any solo you were listening through,
   * and none of it can be aimed at a bar line the sequencer handed to the audio thread a
   * quarter of a second ago. This walks the same fields and writes them as ramps.
   *
   * `step`, `nextTime`, `bpm`, `songTrim` and the voice rack are untouched, so the notes
   * already inside the lookahead ring straight through the change.
   *
   * The two mixes may differ on the NUMBERS in an effect chain and not on its SHAPE: a
   * link added, removed or reordered disposes the whole slot, and there is no audio time
   * you can schedule a graph edit for. Such a pair is rejected — and rejected BEFORE
   * anything moves, so a refused transition leaves the desk exactly as it was rather
   * than half-applied.
   *
   * `mix` must be a whole resolved mix, not a patch. `mixEntry` is what setArrangement
   * re-shapes the song's sections through, and `deskBank`/`withVoices` read `layers`,
   * `off` and `voice` off it; a partial handed in here would quietly delete a duplicated
   * lane the next time the arrangement changed.
   *
   * Returns the time the move completes.
   */
  rampMix(mix, when = this.ctx ? this.ctx.currentTime : 0, seconds = 0) {
    if (!this.mixer) return when;
    const entry = mix || null;
    const bpm = this.bank?.bpm || this.bpm;

    // Every lane the song has, not only the ones the target names. A lane the target
    // leaves out goes back to its defaults — what mixer.reset() would have done for it,
    // and the only reading under which a variant can TAKE SOMETHING AWAY rather than
    // only add to what is already up.
    const keys = new Set(laneList(this.bank).map((l) => l.key));
    for (const k of Object.keys(entry?.lanes || {})) keys.add(k);

    // Validate every chain first. Nothing below this point may throw.
    const chains = [['__master', this.mixer.masterEffects, entry?.masterEffects || []]];
    for (const def of this.mixer.auxes) {
      chains.push([`__aux:${def.id}`, this.mixer.auxEffects(def.id), entry?.fx?.[def.id]?.effects || []]);
    }
    for (const key of keys) {
      const strip = this.mixer.lane(key);
      if (strip) chains.push([key, strip.effects, entry?.lanes?.[key]?.effects || []]);
    }
    for (const [target, live, want] of chains) {
      if (live.length !== want.length) {
        throw new Error(`rampMix: ${target} has ${live.length} effects and the target has ${want.length}`
          + ' — a chain can be re-tuned at a bar line but not rebuilt at one');
      }
      for (let i = 0; i < want.length; i++) {
        if (live[i].def.id !== want[i].id) {
          throw new Error(`rampMix: ${target}[${i}] is "${live[i].def.id}" and the target is "${want[i].id}"`
            + ' — both sides of a transition must agree on the shape of their chains');
        }
        if (!!live[i].bypassed !== !!want[i].bypass) {
          throw new Error(`rampMix: ${target}[${i}] changes its bypass, which re-wires the chain`);
        }
      }
    }

    for (const key of keys) {
      const strip = this.mixer.lane(key);
      if (!strip) continue;
      const s = laneSettings(entry?.lanes?.[key]);
      strip.rampTo({
        gain: s.gain, mute: s.mute, pan: s.pan, width: s.width ?? 1, eq: s.eq, send: s.send,
      }, when, seconds);
    }

    // Level, balance and EQ per aux — never decay, preDelay or the delay's own timing.
    // Those rebuild a buffer or retune a live delay line, which are node changes, and a
    // variant is not allowed to ask for one. See the aux notes in mixer.rampAux.
    for (const def of this.mixer.auxes) {
      const patch = entry?.fx?.[def.id];
      const d = AUX_DEFAULTS[def.id];
      this.mixer.rampAux(def.id, {
        level: patch?.level ?? d.level,
        pan: patch?.pan ?? d.pan,
        eq: { ...d.eq, ...(patch?.eq || {}) },
      }, when, seconds);
    }

    this.mixer.rampMaster({ master: entry?.master || 0, masterPan: entry?.masterPan || 0 }, when, seconds);

    for (const [target, , want] of chains) {
      for (let i = 0; i < want.length; i++) {
        if (want[i].params) this.mixer.rampEffectParams(target, i, want[i].params, when, seconds, bpm);
      }
    }

    // No pruneAuxes. Raising a send wakes its return from setSend (see wakeAux), which
    // is the urgent direction; an aux left connected and silent costs a little CPU and
    // never costs a sound, and disconnecting one at a bar line would cut its tail.
    this.mixEntry = entry;
    return when + seconds;
  }

  // Tempo and pitch warp independently: slow-mo drags the tempo without
  // dropping the key, invincibility winds both up a whole tone.
  setWarp(tempo, pitch = tempo) {
    const moved = tempo !== this.tempo;
    this.tempo = tempo;
    this.detune = pitch;
    // The run loop calls this every frame with whatever the powerups currently say,
    // so the retime has to be gated on an actual change — a mixer retune per frame
    // would be hundreds of Web Audio parameter writes a second for nothing.
    if (moved) this.retimeSync();
  }
  setDetune(d) { this.setWarp(d, d); }

  /**
   * Re-derive every tempo-synced time in the mix against the warped clock.
   *
   * Tempo-synced times are stored as note divisions but written to the graph as plain
   * seconds, once, when the bank loads. Warping the transport afterwards leaves those
   * seconds describing a tempo nothing is playing at any more. This is the same work
   * setBank does on a bank change, pointed at `bpm * tempo`.
   *
   * The delay line slides rather than jumps: a delayTime step resamples whatever is
   * still ringing in the buffer, and 50ms of glide turns a click into the tape-style
   * pitch slur you would want from a gear change anyway.
   *
   * What this does NOT reach: tempo-synced effects sitting on a channel STRIP, which
   * are baked by strip.setEffects at bank load. No cabinet song currently uses one —
   * the drift-prone sends are all on the shared echo and the aux returns — but a song
   * that grows a synced strip tremolo will need it, and the retune belongs there too.
   */
  retimeSync() {
    if (!this.ctx) return;
    const secs = this.delayTimeSeconds();
    if (this.delay) {
      this.growDelayLine(secs).delayTime.setTargetAtTime(secs, this.ctx.currentTime, 0.05);
    }
    if (this.mixer) this.mixer.retune((this.bpm || 120) * (this.tempo || 1));
  }

  // Invincibility: duck the theme and bring up the star arpeggio over it, so
  // it still reads as the same song — just electrified.
  setInvincible(on) {
    on = !!on;
    if (on === this.starMode) return;
    this.starMode = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(on ? 0.32 : 1, t, 0.08);
    this.starBus.gain.setTargetAtTime(on ? 1.5 : 0, t, 0.08);
  }

  // Rewind mode: mutes the music bus, ducks SFX, and plays the capture buffer
  // backwards in overlapping chunks — every sound reversed, like a tape rewinding.
  setRewinding(on) {
    on = !!on;
    if (on === this.rewindMode) return;
    this.rewindMode = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Mute the forward music bus so only the reversed audio is heard.
    this.musicBus.gain.setTargetAtTime(on ? 0.0001 : 1, t, on ? 0.04 : 0.35);
    // Duck SFX heavily so forward sounds don't break the reverse illusion.
    this.sfxGain.gain.setTargetAtTime(on ? 0.10 : this.levels.sfx, t, 0.04);
    if (on) {
      this._startReversePlayback();
    } else {
      this._stopReversePlayback();
    }
  }

  // Continuously record the master output into a ring buffer. A zero-gain
  // ScriptProcessorNode taps the signal without affecting the live mix.
  _startCapture() {
    if (!this.captureEnabled || this._capNode) return;
    const SR = this.ctx.sampleRate;
    const CAPTURE_SEC = 4;
    this._capBuf = new Float32Array(Math.floor(SR * CAPTURE_SEC));
    this._capPos = 0;
    this._capNode = this.ctx.createScriptProcessor(2048, 1, 1);
    this._capNode.onaudioprocess = (e) => {
      if (!this._capBuf || this.lifecyclePaused) return;
      const input = e.inputBuffer.getChannelData(0);
      const buf = this._capBuf;
      let pos = this._capPos;
      const len = buf.length;
      for (let i = 0; i < input.length; i++) {
        buf[pos] = input[i];
        pos = (pos + 1) % len;
      }
      this._capPos = pos;
    };
    // Tap master without doubling the output: route through capNode into a
    // zero-gain sink so the onaudioprocess fires but nothing reaches the speakers.
    this.master.connect(this._capNode);
    this._capGain = this.ctx.createGain();
    this._capGain.gain.value = 0;
    this._capNode.connect(this._capGain);
    this._capGain.connect(this.ctx.destination);
  }

  _stopCapture() {
    if (this._capNode && typeof this._capNode.disconnect === 'function') this._capNode.disconnect();
    if (this._capGain && typeof this._capGain.disconnect === 'function') this._capGain.disconnect();
    this._capNode = null;
    this._capGain = null;
    this._capBuf = null;
    this._capPos = 0;
  }

  // Start playing the capture buffer backwards in overlapping chunks. Each
  // chunk is ~0.7s of audio reversed; a new one fires every 0.35s so they
  // crossfade and the reversed stream is continuous.
  _startReversePlayback() {
    if (this._revTimer || !this._capBuf) return;
    // Prime the pump immediately, then schedule every 350ms.
    this._scheduleReverseChunk();
    this._revTimer = setInterval(() => this._scheduleReverseChunk(), 350);
  }

  _stopReversePlayback() {
    if (this._revTimer) { clearInterval(this._revTimer); this._revTimer = null; }
    // Schedule one final chunk that decelerates to a stop over ~0.5s — like a
    // tape reel braking, not an abrupt cut. The music bus fades back in over
    // the same period (see setRewinding), so the two cross over smoothly.
    this._scheduleTapeStop();
  }

  // Multi-phase tape-stop-and-spin-up on a reversed chunk. Simulates a tape
  // transport braking to a halt, pausing briefly, then accelerating back.
  //
  // Envelope phases (total ~0.55s):
  //   A  0.00–0.24  decelerate  1.0 → 0.0  (squared curve)
  //   B  0.24–0.28  hold        0.0
  //   C  0.28–0.55  accelerate  0.0 → 1.0  (squared curve)
  //
  // Envelope phases (total ~0.55s):
  //   A  0.00–0.24  decelerate  1.0 → 0.0  (squared curve)
  //   B  0.24–0.28  hold        0.0
  //   C  0.28–0.55  accelerate  0.0 → 1.0  (squared curve)
  //
  // A dynamic low-pass filter tracks playback rate (cutoff ∝ rate^1.5) so the
  // sound darkens as it slows, and a +3dB gain bump below 0.4× compensates for
  // the perceived loss of high-frequency energy.
  _scheduleTapeStop() {
    if (!this._capBuf || !this.ctx) return;
    const SR = this.ctx.sampleRate;
    const bufLen = this._capBuf.length;
    const totalDur = 0.55;
    const len = Math.floor(SR * totalDur);
    if (len > bufLen) return;

    // Build reversed buffer from the ring.
    const pos = this._rewindStartPos != null ? this._rewindStartPos : this._capPos;
    const reversed = this.ctx.createBuffer(1, len, SR);
    const data = reversed.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = this._capBuf[(pos - i - 1 + bufLen) % bufLen];
    }

    const t = this.ctx.currentTime;
    const T_A = 0.24, T_B = 0.04, T_C = 0.27;

    // Pre-compute playback-rate curve (256 samples, ~3ms steps).
    const N = 256;
    const rateCurve = new Float32Array(N);
    const lpfCurve = new Float32Array(N);
    const gainCurve = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const phase = (i / (N - 1)) * totalDur;
      let rate;
      if (phase < T_A) {
        rate = (1 - phase / T_A) ** 2;
      } else if (phase < T_B + T_A) {
        rate = 0;
      } else {
        rate = ((phase - (T_A + T_B)) / T_C) ** 2;
      }
      rateCurve[i] = Math.max(0.001, rate);
      lpfCurve[i] = Math.max(60, 20000 * (rate ** 1.5));
      const comp = rate < 0.4 ? 1.41 : rate < 0.8 ? 1.41 - (1.41 - 1.0) * ((rate - 0.4) / 0.4) : 1.0;
      gainCurve[i] = comp;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = reversed;
    src.playbackRate.setValueCurveAtTime(rateCurve, t, totalDur);

    const g = this.ctx.createGain();
    const gc = this.ctx.createGain();
    gc.gain.setValueCurveAtTime(gainCurve, t, totalDur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85, t + 0.015);
    g.gain.setValueAtTime(0.85, t + totalDur - 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + totalDur);
    g.gain.linearRampToValueAtTime(0, t + totalDur + 0.05 - 0.005);

    src.connect(g);
    g.connect(gc);
    gc.connect(this._rewindOut);
    src.start(t);
    src.stop(t + totalDur + 0.05);
  }

  // Read a 0.7s slice from the ring buffer backwards, create a BufferSource
  // with a quick fade-in/out envelope, and send it to master.
  _scheduleReverseChunk() {
    if (!this._capBuf || !this.ctx) return;
    const SR = this.ctx.sampleRate;
    const bufLen = this._capBuf.length;
    const chunkSec = 0.7;
    const chunkLen = Math.floor(SR * chunkSec);
    if (chunkLen > bufLen) return;
    const pos = this._capPos;
    // Build a reversed buffer: walk backwards from the current write position.
    const reversed = this.ctx.createBuffer(1, chunkLen, SR);
    const data = reversed.getChannelData(0);
    for (let i = 0; i < chunkLen; i++) {
      data[i] = this._capBuf[(pos - i - 1 + bufLen) % bufLen];
    }
    const src = this.ctx.createBufferSource();
    src.buffer = reversed;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    // Quick attack, steady body, quick release — overlapping chunks crossfade
    // without audible seams.
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.025);
    g.gain.setValueAtTime(1.0, t + chunkSec - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + chunkSec);
    g.gain.linearRampToValueAtTime(0, t + chunkSec + 0.03 - 0.005);
    src.connect(g);
    g.connect(this._rewindOut);
    src.start(t);
    src.stop(t + chunkSec + 0.03);
    // Track for debugging; Web Audio cleans up stopped sources automatically.
    this._revSources = this._revSources.filter((s) => s.endTime > t - 0.5);
    this._revSources.push({ endTime: t + chunkSec });
  }

  // Save the current capture position for the tape-stop effect. Called from
  // run.js on the release edge so the decelerating audio is the sound that was
  // playing at the moment the player let go.
  setRewindPos() { this._rewindStartPos = this._capPos; }

  onBeat(fn) { this.beatListeners.push(fn); }

  startSequencer() {
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + (this.bank ? 0.5 : 0.1);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    if (!this.ctx || !this.bank) return;
    while (this.nextTime < this.ctx.currentTime + SEQUENCER_LOOKAHEAD) this.scheduleStep();
  }

  /**
   * Forget the synths built for one preset, so the next note builds it as it is now.
   *
   * For the mixing desk's preset editor, and for nothing in the game: a song never
   * edits a voice mid-play. It exists because the alternative was a re-bank, and
   * `setBank` opens with a deliberate half-second gap — right for changing songs, and
   * half a second of silence between every pixel when what you are doing is dragging
   * a filter. See `VoiceRack.refresh`.
   */
  refreshVoice(voiceId) {
    this.voices?.refresh(voiceId);
  }

  /**
   * Play one lane through the Tone voice its bank names, if it names one.
   *
   * Returns true when the voice owns the lane — including on a rest, where there is
   * nothing to play but the hand-rolled branch must still not run. Returns FALSE
   * before touching anything at all when the lane has no voice, which is every lane
   * of every song in the game today: no rack is built, no Tone class is constructed,
   * and scheduleStep runs the oscillator code it always did, sample for sample. That
   * is what keeps tests/null-test.js green, and it is the reason this is a guard
   * clause rather than a rewrite of the lane blocks.
   *
   * `spb` is seconds per 16th, so a voice's `dur` is in steps like every other lane
   * length in a bank. `delay`, `durScale` and `gainScale` exist for the written-in
   * repeats (bassRepeat), which are a second, softer statement of the same note.
   */
  playVoice(key, b, value, { spb, dry, wet, echo = true, delay = 0, durScale = 1, gainScale = 1, len = null }) {
    const seam = seamFor(key);
    const v = seam && voiceOf(b, key);
    // An ENGINE preset is not played here at all: it is a bundle of the bank keys the
    // hand-written voice already reads, merged onto the bank back in applyMix. By the
    // time the sequencer runs there is nothing left to distinguish it from a bank
    // that had been typed that way, which is the whole point — no second code path.
    //
    // Everything else — `tone` and `noise` alike — is played by the rack. Testing for
    // `!== 'tone'` here is what silently rejected every noise preset and let the
    // hand-written voice play instead, which looks exactly like a preset that does
    // nothing. Name the kind that is handled elsewhere, not the ones that are not.
    if (!v || v.kind === 'engine') return false;
    // Percussion holds booleans: the bank says a hit happens, and the lane's own note
    // is what a synth gets struck at.
    const freq = value === true ? (b[seam.noteKey] ?? seam.note) : value;
    if (freq != null) {
      if (!this.voices) {
        this.voices = new VoiceRack(this.ctx, this.noiseBuf, this.crashBuf);
        // The map, by reference — so a rack rebuilt after a context teardown comes back
        // agreeing with the buttons the desk is still showing.
        this.voices.soloLayers = this.soloLayers;
      }
      this.voices.play(key, v.id, freq, {
        time: this.nextTime + delay,
        // A bank's own length key still wins over the preset's — a song that has been
        // dialled in keeps its numbers when it changes voice — and a note that was
        // drawn a length in the roll wins over both, because that is the most specific
        // thing anybody has said about it. `len` is a number, or one per chord tone;
        // the rack takes the array as it takes the chord. Absent, this is the
        // expression that was always here.
        //
        dur: noteSeconds(len, b[seam.durKey] ?? v.dur, spb, durScale, v.fixedLength),
        // Derived, never hand-set: every synth peaks somewhere different, so the
        // level is the lane's own target scaled by this preset's measured peak. A
        // bank that states the lane's gain still wins — that is a song's own decision,
        // and it is also what lets tools/measure-voices.js render a preset at unity
        // to find its peak in the first place.
        //
        // `laneTrim` is the drum lanes' version of that same "a song's own decision":
        // they have no single gain key, so the kit trims the hand-written voices
        // multiply in (drumGain, kickGain, …) have to be applied here or a preset
        // ignores the song's balance entirely and arrives at full reference level.
        // It is 1 on every melodic lane and on any bank that names no trims.
        gain: (b[seam.gainKey] ?? voiceGain(v, key) * laneTrim(b, key)) * gainScale * dbToGain(v.trim ?? 0),
        detune: this.detune,
        spb,
        dry,
        wet,
        echo,
        // Its own synths while the song keeps its own — see previewNote.
        preview: !!this._previewing,
      });
    }
    return true;
  }

  /** Release a note sounded by previewNote — the note-off half of a key press. */
  releasePreviewNote(laneKey, freq) {
    if (this.voices) this.voices.releasePreview(laneKey, freq);
  }

  /**
   * Solo one layer of a stack — the same idea as a channel's S, one level down.
   *
   * Three layers summed into one output is exactly the sound you cannot take apart by
   * ear, so the panel needs a way to hear one at a time. Soloing several is additive,
   * as it is on the strips: two lit buttons means those two, together.
   *
   * MONITORING, and monitoring is never saved. Nothing here touches the preset, so a
   * solo cannot be written to the library, cannot reach a song, and cannot move a
   * measured level. It is also not persisted anywhere: reopen the desk and it is gone,
   * which is the correct behaviour for a switch you are meant to leave on for a minute.
   */
  setLayerSolo(voiceId, layerKey, on) {
    if (!voiceId || !layerKey) return;
    let set = this.soloLayers.get(voiceId);
    if (on) {
      if (!set) { set = new Set(); this.soloLayers.set(voiceId, set); }
      set.add(layerKey);
    } else if (set) {
      set.delete(layerKey);
      // An empty set removed rather than left behind, so the common case — nothing
      // soloed anywhere — is a `get` that returns undefined and a play path that does
      // no work at all.
      if (!set.size) this.soloLayers.delete(voiceId);
    }
  }

  /** Drop every layer solo, or one preset's. What closing the panel does. */
  clearLayerSolo(voiceId = null) {
    if (voiceId) this.soloLayers.delete(voiceId);
    else this.soloLayers.clear();
  }

  /**
   * Sound one lane, once, now — the mixing desk's on-screen keyboard.
   *
   * Not a second synthesiser. The sequencer plays the note, handed a bank with
   * nothing in it but that note (soloBank), at a time of this call's choosing rather
   * than the song's: the lane goes through `lane()` onto its own channel strip, so a
   * pressed key is heard through the fader, pan, EQ, sends and effects it is being
   * mixed with, played by whatever the channel is played by — a library preset or the
   * hand-written voice. There is nothing here for those two to disagree about,
   * because neither of them is written here.
   *
   * Safe to call while the song is playing. The swap is synchronous and JavaScript is
   * single-threaded, so the 25 ms sequencer interval cannot land inside it; `bank`,
   * `step`, `nextTime` and `bpm` are all put back before anything else can look.
   *
   * `bank` is for a stopped desk, where the engine is holding none — pass the one the
   * mix applies to. `at` is how far ahead of now to schedule it: far enough that the
   * note is not already late, short enough that the key feels connected.
   *
   * A null `freq` asks for the lane's OWN note, which only a percussion lane has —
   * that is a drum pad, where the answer to "what does this kick sound like" is the
   * kick the song plays rather than one tuned to whatever key was under the finger.
   * On a melodic lane it is a rest, and nothing sounds.
   */
  previewNote(laneKey, freq, { bank = null, at = 0.02 } = {}) {
    this.resumeAfterPanic();
    const src = bank || this.bank;
    if (!this.ctx || !src || !laneKey) return false;
    const one = soloBank(src, laneKey, freq, PREVIEW_STEP);
    if (!one) return false;
    const wasBank = this.bank;
    const wasStep = this.step;
    const wasNext = this.nextTime;
    const wasBpm = this.bpm;
    const wasSend = this.echoSend;
    this.bank = one;
    this.step = PREVIEW_STEP;
    this.nextTime = this.ctx.currentTime + at;
    // Open the song bus, if stopping the desk closed it.
    //
    // setBank(null) pulls songTrim down to 0.0001 — that is how stopping kills
    // whatever the sequencer had already queued into the lookahead, and it stays down
    // because the thing that reopens it is starting a song. A preview goes through
    // that same bus on purpose: it is the master's path and the meters' path, and a
    // note that skipped it would be a note you cannot hear in the mix you are making.
    // So with no song loaded the trim has to be opened here, or every key lands 80dB
    // down — which is not silence, and is exactly what it sounds like.
    //
    // Only when there is no bank. A song CHANGE mutes for half a second on purpose so
    // the old song's tail cannot run into the new one's downbeat, and a key pressed in
    // that gap is not a reason to hand the tail back. Nothing else closes it: choosing
    // or editing a preset goes through reapplyBank, which leaves the trim alone.
    //
    // At the song's own trim rather than at unity: musicTrim resets to 1 when the bank
    // goes, and a preview of a song that plays at 2.4 is not that song.
    if (this.songTrim && !wasBank) {
      const t = this.nextTime;
      this.songTrim.gain.cancelScheduledValues(t);
      this.songTrim.gain.setValueAtTime(one.musicTrim ?? this.musicTrim ?? 1, t);
    }
    // A stopped desk keeps whatever bpm the last song set, and note LENGTHS are in
    // steps — so a preview at the wrong tempo is a preview of the wrong sound.
    if (one.bpm) this.bpm = one.bpm;
    // scheduleStep pushes the song's echo send level at nextTime. A preview must not
    // reach into an automation the song is in the middle of, so the send is taken out
    // of view for the one call. Each lane's own send is on its strip and untouched.
    this.echoSend = null;
    // A preview gets its own synths, and this is the flag that says so — read in
    // `playVoice`, which is the only place that reaches the rack.
    //
    // The reason is Tone's, and it is a hard rule rather than a preference: an
    // instrument's oscillator keeps a state timeline, and a state may not be added
    // BEFORE one already on it. The sequencer schedules a playing song a quarter-second into the
    // future; a preview lands at `currentTime + 0.02`, which is in the middle of that.
    // Sharing the pool therefore threw — "the time must be greater than or equal to the
    // last scheduled time" — and took the desk's script with it, in the one situation
    // where previews matter most: editing notes while the song plays.
    //
    // A separate pool costs a handful of nodes per lane you preview, and `_retire`
    // clears them like any other. It is the whole fix: the song's timeline is never
    // written to out of order, because nothing else writes to it.
    this._previewing = true;
    try {
      this.scheduleStep();
    } finally {
      this._previewing = false;
      this.bank = wasBank;
      this.step = wasStep;
      this.nextTime = wasNext;
      this.bpm = wasBpm;
      this.echoSend = wasSend;
    }
    return true;
  }

  // One 16th step, scheduled at this.nextTime. Split out of schedule() so an
  // offline render can walk the whole song up front: an OfflineAudioContext has no
  // running clock, so every node must be scheduled before startRendering().
  //
  // The body is wrapped in a bare block purely to keep its original indentation.
  // This was the inside of schedule()'s while-loop; re-indenting 560 lines of voice
  // code would bury any real change in a diff nobody could review.
  scheduleStep() {
    {
      if (!this.applyPendingStep()) this.applyPendingLoop();
      // After those two, which can both move `this.step` — the boundary a pending
      // groove change is waiting for is the step actually about to be scheduled.
      this._applyPendingSwing();
      const spb = (60 / (this.bpm * this.tempo)) / 4; // seconds per 16th step
      // SWING. The song is written on the grid; this is how hard it is PLAYED off it.
      // The number is the on-grid sixteenth's share of its pair, as a percentage: 50 is
      // straight, ~58 is where most funk and hip-hop actually sits, 66.7 is the triplet
      // shuffle (exactly 2:1), 75 the dotted one. A pair lasts 2*spb, so the second note
      // of it lands at 2*spb*(pct/100) instead of at spb — a shift of spb*(pct-50)/50.
      //
      // Only the ODD sixteenth moves. The on-grid note stays exactly where it always
      // was, which is the whole reason one number can be applied to every lane at once:
      // downbeats, bar lines and any pad or chord sitting on a beat do not shift at all,
      // and the groove is entirely in the notes between them.
      //
      // This is an offset on the NOTE, never on the clock. `nextTime` at the bottom of
      // this method still advances by a flat spb, because the loop wrap, the bar plan,
      // songBeat(), the beat listeners and the desk's playhead all count steps off it —
      // a sequencer that swung its own clock would drag every one of them along with it,
      // and the song would come apart rather than groove.
      //
      // `this.step` rather than `s`: swing follows the transport, not whichever half of
      // whichever section this bar happens to name. The two agree — the section index
      // differs from the transport by a multiple of 16 — but the transport means it.
      //
      // Zero when off, and zero is exact: `x + 0` is x for every finite float, so a song
      // nobody has swung renders the samples it always did. tests/null-test.js checks
      // that claim by comparing renders sample for sample.
      const swingOffset = this.swing && (this.step % 2)
        ? spb * (this.swing - 50) / 50
        : 0;
      // Rhythmic insert effects share the sequencer's clock. Schedule their gain
      // envelopes before the notes for this sixteenth, using the same audio timestamp
      // that every voice below receives. This keeps straight, dotted and triplet gates
      // aligned in offline renders and after live loop/jump changes.
      //
      // The swing goes with it, and `nextTime` stays unswung on purpose: this hook hands
      // over the STEP and the edge of it, and an effect on the grid works out its own
      // pulses from there. A gate at a division of an odd number of sixteenths lands on
      // the off-beat every other pulse, and those pulses are late with the song — see
      // the parity note in makeRhythmicGate.
      //
      // The tempo-synced delay (delayTimeSeconds) is the one that CANNOT follow: it is a
      // fixed interval applied to whatever arrives, and the interval a swung note wants
      // depends on which side of the beat it came from. Divisions of an even number of
      // sixteenths (1/8, 1/4, 1/4 dotted, a bar) map on-beat to on-beat and inherit the
      // swing for nothing; odd or triplet ones flam against it, by a third of a
      // sixteenth at a full shuffle. That is a real limit, not an oversight.
      this.mixer?.scheduleEffects?.(this.step, this.nextTime, spb, this.bpm * this.tempo, this.swing);
      // Song form: bank.sections is a list of partial banks (lane overrides) and
      // bank.order the sequence to play them in — so a track can progress
      // verse/lift/bridge instead of looping one 2-bar phrase.
      //
      // Read a BAR at a time rather than a two-bar block. A plain number in `order`
      // still means what it always meant — section n, both its bars — and expands to
      // the same two numbers this used to compute for itself: `bar.sec` is
      // `order[floor(step/32)]` and `s` is `step % 32`. What the finer grain buys is
      // a bar that can name one half of a section and carry a mute mask, which is
      // the whole of arranging: the same phrase again with the kit out of it. See
      // src/data/arrangements.js.
      const plan = barPlan(this.bank);
      const bar = plan[Math.floor(this.step / 16) % plan.length];
      const s = (this.step % 16) + bar.half * 16;   // index into the section's 32 steps
      let b = this.bank;
      if (b.sections && b.sections.length && bar.sec != null) {
        const sec = resolveSection(b, bar.sec % b.sections.length);
        if (sec) b = { ...this.bank, ...sec };
      }
      // Lanes this bar does not pass on. Nulled rather than emptied: every lane block
      // below already reads `b.lane && b.lane[s]`, so a null lane is a lane that does
      // not play, on the one path the whole engine already takes for a silent one.
      if (bar.off || bar.delete) {
        b = { ...b };
        for (const k of [...(bar.off || []), ...(bar.delete || [])]) b[k] = null;
      }
      // Arrangement edits stay on the bar, so the authored section is never
      // rewritten. Frequencies are shifted here after the section delta resolves;
      // chords and layer lanes use the same recursive conversion as single notes.
      const barValue = (map, key, fallback = 0) =>
        typeof map === 'number' ? map : (Number.isFinite(map?.[key]) ? map[key] : fallback);
      const semitone = (key) => barValue(bar.transpose, key);
      const shift = (v, n) => Array.isArray(v)
        ? v.map((x) => shift(x, n))
        : typeof v === 'number' && v > 0 ? v * 2 ** (n / 12) : v;
      // A number means "everything", and everything has to mean the LANES: this used
      // to take every non-percussion key of the bank and map `shift` over any array it
      // found, which reached `order` (numbers, but harmlessly — `barPlan` reads
      // `this.bank`, so the shifted copy is discarded) and `sections`/`__layers`
      // (objects, returned unchanged). A `bassLen` array is the first thing it would
      // genuinely corrupt: it would multiply note LENGTHS by 2^(n/12) and transposing
      // a bar down would shorten every note in it.
      const transposeKeys = new Set([
        ...Object.keys(typeof bar.transpose === 'object' ? bar.transpose || {} : {}),
        ...(typeof bar.transpose === 'number'
          ? [...LANE_KEYS, ...(b.__layers || []).map((L) => L.key)]
            .filter((k) => !PERCUSSION_LANES.includes(baseLane(k)))
          : []),
      ]);
      if (transposeKeys.size) {
        b = { ...b };
        for (const key of transposeKeys) {
          const n = semitone(key);
          if (n && Array.isArray(b[key])) b[key] = b[key].map((v) => shift(v, n));
        }
      }
      // Kit tally for the visualizers. `b` is fully resolved by this point —
      // section overrides merged, this bar's mute mask nulled out, and any lane
      // the desk deleted already gone with it — so this is the arrangement's own
      // answer to "is there a kit here", not a guess at transients in the
      // spectrum. A bar that arranges the drums out reads as drumless on the
      // exact step it does. A strip muted on the desk still counts, and should:
      // that mute is monitoring, a state of the person listening rather than of
      // the song, and it is the song the picture is supposed to be following.
      // Queued at `nextTime` and only tallied once that time has passed, since
      // this runs inside the lookahead window rather than at the audible edge.
      const percussionKeys = [
        ...PERCUSSION_LANES,
        ...(b.__layers || []).filter((L) => PERCUSSION_LANES.includes(baseLane(L.key)))
          .map((L) => L.key),
      ];
      if (percussionKeys.some((key) => b[key] && b[key][s])) {
        // Swung, so a shuffled hat FLASHES shuffled rather than on a grid the song is
        // no longer playing to. The lane's own `offset` nudge is deliberately left out:
        // this queue is one time for the whole kit, and swing is the only part of the
        // answer that every percussion lane shares.
        this._percPending.push(this.nextTime + swingOffset);
        // Only _readPercussion drains this, and it only runs while the jukebox
        // visualizer is up — where the sequencer runs for the whole game. Aged
        // out by playhead rather than capped by count, so gameplay stays bounded
        // at a few seconds of sixteenths while an offline render, whose clock
        // never advances past zero, keeps the song's entire kit timeline.
        if (this._percPending.length > 128) {
          const stale = this.ctx ? this.ctx.currentTime - 8 : -Infinity;
          let drop = 0;
          while (drop < this._percPending.length && this._percPending[drop] < stale) drop++;
          if (drop) this._percPending.splice(0, drop);
        }
      }
      // Where this lane's voices land. `lane()` is called at the top of each lane
      // block below and repoints dry/wet at that lane's channel strip, so every
      // voice created after it lands on its own fader, pan, EQ and sends. Without
      // a mixer (headless tests, or before ensure()) both fall back to the shared
      // buses and the graph is exactly what it was.
      let dry = this.musicBus, wet = this.echoBus;
      let laneOffset = 0;
      const offsetFor = (key) => barValue(bar.offset, key) * spb / 2;
      const scheduleAt = (delta = 0) => this.nextTime + laneOffset + swingOffset + delta;
      // The same instant, as an OFFSET from the step edge rather than an absolute time —
      // `playVoice` adds it to `nextTime` itself, so it is the one path into the rack
      // that does not come through `scheduleAt`.
      //
      // It exists so the two cannot drift apart. Every lane below is written twice: a
      // hand-rolled body that goes through `play`/`scheduleAt`, and a `voiced` call that
      // hands the same note to a library voice instead. When only the first of those
      // knew about swing, a lane played it straight or shuffled depending on whether
      // somebody had assigned it a voice on the desk — hats on sixteenths being exactly
      // the case where that is loudest.
      const voiceDelay = (delta = 0) => laneOffset + swingOffset + delta;
      const lane = (key) => {
        // Preview notes use their own synth timeline, but they still belong to the
        // selected channel. Keep them on that channel's live strip so its inserts,
        // EQ, fader, and both sends are the same ones shown in the desk.
        const strip = this.mixer && this.mixer.lane(key);
        const gate = this._previewing && !strip
          ? this._benchGate(key)
          : this._laneGate(key, strip ? strip.dry : this.musicBus,
            strip ? strip.wet : this.echoBus);
        const baseDry = gate ? gate.dry : (strip ? strip.dry : this.musicBus);
        const baseWet = gate ? gate.wet : (strip ? strip.wet : this.echoBus);
        laneOffset = offsetFor(key);
        const db = barValue(bar.gain, key);
        const scale = 10 ** (db / 20);
        if (scale === 1) {
          dry = baseDry; wet = baseWet;
        } else {
          // A short-lived per-bar bus keeps the adjustment on every voice shape,
          // including hand-rolled percussion and Tone presets, without duplicating
          // the many envelope implementations below.
          const dg = this.ctx.createGain(); const wg = this.ctx.createGain();
          dg.gain.value = scale; wg.gain.value = scale;
          dg.connect(baseDry); wg.connect(baseWet);
          dry = dg; wet = wg;
        }
      };
      // Point a lane at its strip and offer it to the voice library, in that order —
      // playVoice needs `dry`/`wet` to be this lane's, and `lane()` is what sets them.
      //
      // Every lane below reads `&& !voiced(...)`: true means a Tone preset owns the
      // lane and has already scheduled the note, so the hand-written body is skipped.
      // A lane naming no preset returns false having touched nothing, which is why
      // this is a guard rather than a rewrite — and why the null test stays green.
      // What the roll drew on this step of this lane, if anything: a length in steps,
      // or one per chord tone. Read once per lane and passed down, so a preset voice
      // and the hand-written body below it always agree about how long a note is —
      // they are two ways of playing the same drawn rectangle, not two lanes.
      const lenOf = (key) => effectiveStepLen(b, key, s);
      const toneLenOf = (key, i = 0) => effectiveToneLength(b, key, s, i);
      const voiced = (key, value, opts = {}) => {
        lane(key);
        return this.playVoice(key, b, value,
          { spb, dry, wet, delay: voiceDelay(), len: lenOf(key), ...opts });
      };
      // Every oscillator voice on the desk goes through here — bass, lead, harmony,
      // twinkle, chords, both organs and electroFx — so MELODIC_TRIM lands on all of
      // them at once, bank overrides included. The lanes that build their own nodes
      // (sweeps, gliss, keyGliss, organSwoop, vox, shout) apply it themselves.
      /**
       * One step's worth of frequencies, whether it holds a note or a chord.
       *
       * The hand-written pitched bodies below were each written for ONE frequency, and
       * that — not the synthesis — is the only reason a `lead` could not hold a chord
       * while `chords` could. `play()` builds its own oscillator per call, so running a
       * body once per tone costs nothing and is exactly what the chord lanes already do.
       * `twinkle` has always called `play` twice for a single note, which is the same
       * fact from the other side: polyphony here is a loop, not a capability.
       *
       * A scalar yields one element, so every bank in the game takes the identical path
       * it always did — see tests/null-test.js, which is what that claim is worth.
       */
      const tonesOf = (v) => (Array.isArray(v)
        ? v.filter((f) => typeof f === 'number' && f > 0)
        : (v == null ? [] : [v]));

      const play = (freq, type, dur, gain, attack = 0.01, echo = true, delay = 0) => {
        if (freq == null) return;
        const t = scheduleAt(delay);
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq * this.detune, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain * MELODIC_TRIM, t + Math.min(attack, dur * 0.45));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        // ...and then to actual zero, before the oscillator is stopped.
        //
        // An exponential ramp cannot reach zero, so it is aimed at an ABSOLUTE 0.0001
        // and the note is left sounding at that level until `stop()` cuts it — a step
        // straight to silence, which is a click. It goes unnoticed on a loud lane,
        // where 1e-4 is 80dB down; on a quiet one it is not far below the note itself.
        // megamix's chord stabs (chordGain 0.045) clicked once a second for this,
        // 120 times a song, each one repeated by the echo they send to.
        //
        // The 20ms between the envelope ending and the oscillator stopping was already
        // there and doing nothing, so the fade costs no time and no nodes.
        g.gain.linearRampToValueAtTime(0, t + dur + 0.015);
        o.connect(g); g.connect(dry);
        if (echo) g.connect(wet);
        o.start(t); o.stop(t + dur + 0.02);
      };
      // The echo bus is not touched per bar any more. A section used to push it with
      // its own `echoLevel`, which is why a mix's delay sends were only ever worth
      // what the section said — see the note over echoBus in ensure(). `echoLevel`
      // survives in the banks as inert song data; the sends carry the same shape,
      // where the desk can see them.
      if (b.bass) {
        lane('bass');
        // Dry by default (the highpass strips most bass fundamentals anyway,
        // so echo there is usually just wasted CPU) — a bank can opt in with
        // bassEcho: true to catch the sawtooth/square harmonics in the echo,
        // or echoEverything: true to send every lane (percussion included).
        // Every body below derives from this one number — the filtered saw's filter
        // ramp, the 80s bass's three stacked oscillators, the ghost repeat — so the
        // drawn length reaches all of them by being read here and nowhere else.
        const bassLen = lenOf('bass');
        const bassDur = spb * toneLenOf('bass');
        const bassGain = b.bassGain ?? 0.1;
        const bassEcho = !!b.bassEcho || !!b.echoEverything;
        // A Tone voice, if the bank names one, takes the lane whole — the three
        // hand-rolled bodies below are alternatives to it, not layers under it. The
        // note is already scheduled by the time this returns; the empty branch is
        // deliberate, and it is here rather than wrapping the three bodies in an `if`
        // so that this stays a one-line diff against code nobody wants re-indented.
        const bassByVoice = voiced('bass', b.bass[s], { echo: bassEcho });
        if (bassByVoice) {
          // nothing further: the voice is the whole bass
        } else if (b.bassFilteredSaw && b.bass[s] != null) {
          // Resonant low-pass saw bass: harmonic enough to survive small
          // speakers, but with the bright edge closing quickly into a round
          // sustained body. A quiet sine sub keeps the bottom anchored.
          //
          // Each tone gets its own saw, its own filter and its own sub: a chord here is
          // three of this bass, not one of it with three pitches, and a shared filter
          // would be a different instrument.
          for (const note of tonesOf(b.bass[s])) {
            const t = scheduleAt();
            const f = note * this.detune;
            const o = this.ctx.createOscillator(); o.type = 'sawtooth';
            o.frequency.setValueAtTime(f, t);
            const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass';
            filter.Q.value = b.bassFilterQ ?? 1.15;
            filter.frequency.setValueAtTime(b.bassFilterOpen ?? 1150, t);
            filter.frequency.exponentialRampToValueAtTime(b.bassFilterClose ?? 320, t + bassDur);
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(bassGain, t + (b.bassAttack || 0.006));
            g.gain.exponentialRampToValueAtTime(0.0001, t + bassDur);
            g.gain.linearRampToValueAtTime(0, t + bassDur + 0.02 - 0.005);
            o.connect(filter); filter.connect(g); g.connect(dry);
            if (bassEcho) g.connect(wet);
            o.start(t); o.stop(t + bassDur + 0.02);
            play(note * 0.5, 'sine', bassDur * 1.05,
              bassGain * (b.bassFilteredSawSubGain ?? 0.22), 0.008, false);
          }
        } else if (b.bass80s && b.bass[s] != null) {
          // Compact 1980s-style synth bass: a square body for definition, a
          // rounded sine sub beneath it, and a very short octave tick on the
          // attack. No filterless saw drone and no compulsory ghost repeat.
          for (const f of tonesOf(b.bass[s])) {
            play(f, b.bass80sBodyType || 'square', bassDur,
              bassGain * (b.bass80sBodyGain ?? 0.78), b.bassAttack || 0.004, bassEcho);
            play(f * 0.5, 'sine', bassDur * 1.08,
              bassGain * (b.bass80sSubGain ?? 0.34), 0.006, false);
            // A real low-mid octave layer rather than a near-inaudible click: it
            // carries the bass identity on phone speakers that cannot reproduce
            // the sub fundamental.
            play(f * 2, 'triangle', bassDur * 0.62,
              bassGain * (b.bass80sOctaveGain ?? 0.34), 0.003, false);
          }
        } else {
          for (const f of tonesOf(b.bass[s])) {
            play(f, b.bassType || 'square', bassDur, bassGain, b.bassAttack || 0.01, bassEcho);
          }
        }
        // bassRepeat: one softer restatement of the note N steps later — a
        // written-in slapback, not a delay tap, so it has no feedback tail and
        // stays locked to the grid. Always dry: echoing a ghost note doubles it.
        if (b.bassRepeat) {
          if (bassByVoice) {
            // The ghost is the same voice, quieter and shorter. Restating it on the
            // hand-rolled square instead would put two different basses in one lane.
            this.playVoice('bass', b, b.bass[s], {
              spb, dry, wet, echo: false, delay: voiceDelay(spb * b.bassRepeat),
              durScale: b.bassRepeatDur ?? 0.8, gainScale: b.bassRepeatGain ?? 0.4,
              len: bassLen,
            });
          } else {
            for (const f of tonesOf(b.bass[s])) {
              play(f, b.bassType || 'square', bassDur * (b.bassRepeatDur ?? 0.8),
                bassGain * (b.bassRepeatGain ?? 0.4), b.bassAttack || 0.01, false, spb * b.bassRepeat);
            }
          }
        }
        // The star arpeggio follows the song's key, and it wants a NOTE. A chord's
        // lowest tone is its root, and tonesOf sorts nothing — but noteCell writes the
        // array ascending, so [0] is the bottom of what was played.
        const bassRoot = tonesOf(b.bass[s])[0];
        if (bassRoot != null) this.starRoot = bassRoot;
      }
      if (b.lead) {
        lane('lead');
        const leadDur = spb * toneLenOf('lead');
        const leadGain = b.leadGain ?? 0.06;
        // leadBright is an octave sine sitting ON the square lead — part of what the
        // hand-rolled lead IS, so it goes with it rather than doubling a Tone voice
        // that has its own harmonics.
        if (!voiced('lead', b.lead[s])) {
          // Once per tone. One note is one pass, which is the path every existing bank
          // takes; a recorded chord is three, each with its own oscillator and its own
          // bright octave over it.
          for (const f of tonesOf(b.lead[s])) {
            play(f, b.leadType || 'square', leadDur, leadGain, b.leadAttack || 0.01);
            if (b.leadBright) {
              play(f * 2, 'sine', leadDur * 0.68,
                leadGain * (b.leadBrightGain ?? 0.16), 0.004, false);
            }
          }
        }
      }
      // parallel-3rds partner voice
      if (b.leadHarm) {
        lane('leadHarm');
        if (!voiced('leadHarm', b.leadHarm[s])) {
          for (const f of tonesOf(b.leadHarm[s])) {
            play(f, b.harmType || b.leadType || 'square', spb * toneLenOf('leadHarm'), b.harmGain ?? 0.04, b.harmAttack || b.leadAttack || 0.01);
          }
        }
      }
      if (b.twinkle && b.twinkle[s] && !voiced('twinkle', b.twinkle[s])) {
        lane('twinkle');
        const twinkleDur = spb * toneLenOf('twinkle');
        for (const f of tonesOf(b.twinkle[s])) {
          play(f, 'sine', twinkleDur, b.twinkleGain ?? 0.014, b.twinkleAttack || 0.035);
          play(f * 2, 'sine', twinkleDur * 0.65, (b.twinkleGain ?? 0.014) * 0.28, 0.02);
        }
      }
      // `!voiced(...)` first, as every lane above reads: true means a preset owns the
      // lane and has already scheduled the note, so the hand-written body is skipped. A
      // song naming no preset returns false having touched nothing, which is why this is
      // a guard rather than a rewrite — and why the null test stays green.
      if (b.electroFx && b.electroFx[s] && !voiced('electroFx', b.electroFx[s])) {
        lane('electroFx');
        // Sparse deterministic "random" shop-machine flourishes. The grid
        // position selects one of three tiny electronic gestures, so offline
        // auditions and live playback stay identical on every loop.
        const t = scheduleAt();
        const f = b.electroFx[s] * this.detune;
        const gain = b.electroFxGain ?? 0.012;
        const dur = spb * (b.electroFxDur || 0.86);
        const kind = s % 3;
        if (kind === 2) {
          play(f, 'sine', dur, gain, 0.002, true);
          play(f * 2.01, 'sine', dur * 0.62, gain * 0.42, 0.002, false);
        } else {
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type = kind === 0 ? 'square' : 'triangle';
          const from = kind === 0 ? f * 0.72 : f * 1.8;
          const to = kind === 0 ? f * 1.45 : f * 0.68;
          o.frequency.setValueAtTime(from, t);
          o.frequency.exponentialRampToValueAtTime(to, t + dur);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
          o.connect(g); g.connect(dry); g.connect(wet);
          o.start(t); o.stop(t + dur + 0.02);
        }
      }
      // `sweeps` holds a marker rather than a pitch, so the seam supplies the note a
      // synth is struck at — the same arrangement the kit uses. The `noiseBuf` guard
      // stays on the hand-written body, which is the only half that needs one.
      if (b.sweeps && b.sweeps[s] && !voiced('sweeps', b.sweeps[s]) && this.noiseBuf) {
        lane('sweeps');
        // Heavily filtered air: a narrow band slowly opens and closes beneath
        // a low-pass ceiling. It should be felt as motion, not heard as hiss.
        const t = scheduleAt();
        const dur = spb * (b.sweepDur || 10);
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        const band = this.ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = 1.45;
        band.frequency.setValueAtTime(340, t);
        band.frequency.exponentialRampToValueAtTime(1350, t + dur * 0.55);
        band.frequency.exponentialRampToValueAtTime(460, t + dur);
        const low = this.ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 1800; low.Q.value = 0.5;
        const g = this.ctx.createGain();
        const gain = (b.sweepGain ?? 0.013) * MELODIC_TRIM;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.32);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.03 - 0.005);
        src.connect(band); band.connect(low); low.connect(g);
        if (this.ctx.createStereoPanner) {
          const pan = this.ctx.createStereoPanner();
          const from = s % 2 ? 0.35 : -0.35;
          pan.pan.setValueAtTime(from, t); pan.pan.linearRampToValueAtTime(-from, t + dur);
          g.connect(pan); pan.connect(dry);
        } else g.connect(dry);
        src.start(t); src.stop(t + dur + 0.03);
      }
      if (b.keyGliss && b.keyGliss[s]) {
        lane('keyGliss');
        // keyboard-sweep glissando: discrete scale notes (a hand dragged up
        // the white keys) running an octave up into the target, cresc. slightly
        const fT = b.keyGliss[s] * this.detune;
        const steps = [-12, -10, -9, -7, -5, -4, -2, 0]; // natural-minor run
        const dt = (spb * 3) / steps.length;
        const gv = (b.keyGlissGain != null ? b.keyGlissGain : 0.035) * MELODIC_TRIM;
        // A run is ONE gesture rather than eight notes to pick eight sounds for, so a
        // preset is played eight times at rising offsets — which is exactly what
        // `bassRepeat` does with its ghost note, on the `delay` playVoice has always
        // taken. `map` rather than `some`: `some` stops at the first truthy return and
        // would schedule the first note of the run and none of the other seven.
        //
        // Undetuned, because the rack applies the song warp itself; the crescendo rides
        // `gainScale`; and dry, because the hand-written body below is dry.
        const runByVoice = steps.map((semi, i) => this.playVoice('keyGliss', b,
          b.keyGliss[s] * Math.pow(2, semi / 12),
          {
            spb, dry, wet, echo: false, delay: voiceDelay(i * dt),
            gainScale: 0.6 + 0.4 * ((i + 1) / steps.length),
          }))[0];
        if (!runByVoice) steps.forEach((semi, i) => {
          const t = scheduleAt(i * dt);
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type = b.leadType || 'square';
          o.frequency.setValueAtTime(fT * Math.pow(2, semi / 12), t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gv * (0.6 + 0.4 * ((i + 1) / steps.length)), t + 0.006);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dt * 1.7);
          g.gain.linearRampToValueAtTime(0, t + dt * 1.7 + 0.02 - 0.005);
          o.connect(g); g.connect(dry);
          o.start(t); o.stop(t + dt * 1.7 + 0.02);
        });
      }
      // Echo left at the default rather than off: the hand-written body builds its own
      // panned taps below, and the song's delay send is the closest a preset gets to
      // them. A dry preset here would be the one swap that sounds like a mistake.
      if (b.gliss && b.gliss[s] && !voiced('gliss', b.gliss[s])) {
        lane('gliss');
        // glissando: sweep up from an octave below into the target note,
        // with echo taps panned left -> center -> right across the field
        const t = scheduleAt();
        const fT = b.gliss[s] * this.detune;
        const o = this.ctx.createOscillator();
        o.type = b.leadType || 'square';
        o.frequency.setValueAtTime(fT * 0.5, t);
        o.frequency.exponentialRampToValueAtTime(fT, t + spb * 3);
        const g = this.ctx.createGain();
        const gv = (b.glissGain != null ? b.glissGain : 0.03) * MELODIC_TRIM;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gv, t + 0.02);
        g.gain.setValueAtTime(gv, t + spb * 3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 4);
        o.connect(g); g.connect(dry);
        const pans = [-0.8, 0.1, 0.8];
        pans.forEach((pv, e) => {
          const d = this.ctx.createDelay(2); d.delayTime.value = spb * 2 * (e + 1);
          const eg = this.ctx.createGain(); eg.gain.value = 0.5 * Math.pow(0.6, e);
          g.connect(d); d.connect(eg);
          if (this.ctx.createStereoPanner) {
            const p = this.ctx.createStereoPanner(); p.pan.value = pv;
            eg.connect(p); p.connect(dry);
          } else {
            eg.connect(dry);
          }
        });
        o.start(t); o.stop(t + spb * 4 + 0.02);
      }
      if (b.chords && b.chords[s]) {
        lane('chords');
        // A chord arrives as an array, and the rack takes it as one: it hands each
        // note its own slot out of the voice's pool, which is what `poly` is for.
        if (!voiced('chords', b.chords[s])) {
          // stab: all chord tones at once, short and punchy — and each as long as it
          // was drawn, which is why the length is read per tone rather than per step.
          const len = lenOf('chords');
          b.chords[s].forEach((cf, i) => play(cf, b.chordType || 'square', spb * toneLen(len, toneLenOf('chords', i), i), b.chordGain ?? 0.05, b.chordAttack || 0.01));
        }
      }
      if (b.organChords && b.organChords[s] && !voiced('organChords', b.organChords[s], { echo: b.organEcho !== false })) {
        lane('organChords');
        // Drawbar-style organ bed: sine partials at the common 8', 4', 2 2/3',
        // 2' and 1 1/3' relationships. It is a separate sustained lane, not a
        // replacement for the short keyboard stabs, so an arrangement can let
        // the organ hold the harmony while the original comping plays along.
        const organLen = lenOf('organChords');
        const gain = b.organGain ?? 0.009;
        const attack = b.organAttack || 0.035;
        const echo = b.organEcho !== false;
        const drawbars = b.organBright
          ? [[1, 1], [2, 0.78], [3, 0.48], [4, 0.3], [6, 0.16]]
          : [[1, 1], [2, 0.62], [3, 0.32], [4, 0.2], [6, 0.1]];
        b.organChords[s].forEach((cf, i) => {
          // Per tone: a drawn length belongs to the note, and all five drawbars of one
          // note are that note. The pip below is an attack transient, not a length.
          const dur = spb * toneLen(organLen, toneLenOf('organChords', i), i);
          for (const [ratio, level] of drawbars) play(cf * ratio, 'sine', dur, gain * level, attack, echo);
          // Hammond-style percussion: a short third-harmonic pip on the key
          // attack. Kept dry so repeated off-beat stabs stay crisp.
          if (b.organPercussion) {
            play(cf * 3, 'sine', spb * (b.organPercussionDur || 0.62),
              gain * (b.organPercussionGain || 0.72), 0.002, false);
          }
        });
      }
      if (b.organGliss && b.organGliss[s]) {
        lane('organGliss');
        // A quick drawbar-organ slide played as discrete scale notes, like a
        // palm skimming the keys. This lane has its own timbre so the main
        // melody does not need to become square/organ-like just to host it.
        const target = b.organGliss[s] * this.detune;
        const steps = [-12, -10, -9, -7, -5, -4, -2, 0];
        const dt = (spb * (b.organGlissSpan || 2.7)) / steps.length;
        const gain = b.organGlissGain ?? 0.012;
        const partials = b.organBright
          ? [[1, 1], [2, 0.7], [3, 0.4], [4, 0.22]]
          : [[1, 1], [2, 0.55], [3, 0.25]];
        // Eight offsets, one preset — see the note on keyGliss above for why this is
        // `map` and not `some`. A preset replaces the whole run including its drawbars:
        // an additive stack is the obvious thing to put here, and it brings its own
        // partials rather than borrowing the three below.
        const runByVoice = steps.map((semi, i) => this.playVoice('organGliss', b,
          b.organGliss[s] * Math.pow(2, semi / 12),
          { spb, dry, wet, echo: false, delay: voiceDelay(i * dt) }))[0];
        if (!runByVoice) steps.forEach((semi, i) => {
          const note = target * Math.pow(2, semi / 12);
          for (const [ratio, level] of partials) {
            play(note * ratio, 'sine', dt * 1.35, gain * level,
              b.organGlissAttack || 0.003, false, i * dt);
          }
        });
      }
      if (b.organSwoop && b.organSwoop[s] && !voiced('organSwoop', b.organSwoop[s])) {
        lane('organSwoop');
        // Continuous drawbar-organ pitch glide: unlike organGliss's discrete
        // palm-run notes, every partial bends smoothly from one pitch into the
        // target for a clean dance-mix transition.
        const t = scheduleAt();
        const target = b.organSwoop[s] * this.detune;
        const from = target * Math.pow(2, (b.organSwoopFromSemitones ?? -5) / 12);
        const dur = spb * (b.organSwoopDur || 3.2);
        const gain = (b.organSwoopGain ?? 0.012) * MELODIC_TRIM;
        const partials = b.organBright
          ? [[1, 1], [2, 0.66], [3, 0.34], [4, 0.18]]
          : [[1, 1], [2, 0.5], [3, 0.22]];
        for (const [ratio, level] of partials) {
          const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(from * ratio, t);
          o.frequency.exponentialRampToValueAtTime(target * ratio, t + dur);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(gain * level, t + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          g.gain.linearRampToValueAtTime(0, t + dur + 0.02 - 0.005);
          o.connect(g); g.connect(dry); g.connect(wet);
          o.start(t); o.stop(t + dur + 0.02);
        }
      }
      if (b.kick && b.kick[s] && !voiced('kick', b.kick[s], { echo: !!b.echoEverything })) {
        lane('kick');
        // 808 kick: a long sine "boooom" that pitch-drops into a sub
        // fundamental for the thump, with a short noise click on the front so
        // it still reads as a hit on small speakers where the sub is felt more
        // than heard. Body + click, the way an 808 actually stacks — nothing
        // in between. crashDur-style bank overrides (kickGain/kickTail) let a
        // sparser track lean on the boom or a busy one tighten it up.
        const t = scheduleAt();
        const kg = (b.kickGain ?? 1) * (b.drumGain ?? 1);
        const tail = b.kickTail ?? 0.2;      // how long the sub rings out
        // Body: near-instant punch, pitch envelope from a snappy attack pitch
        // down to ~48Hz, then a long amplitude decay. The short gain ramp (vs
        // the old hard setValueAtTime) keeps the envelope itself from clicking —
        // the click is authored separately below, so it can be shaped on its own.
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(165, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.05);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.42 * kg, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, t + tail);
        o.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        o.start(t); o.stop(t + tail + 0.04);
        // Click: a couple of ms of high-passed noise — the beater attack. Kept
        // very short and quiet so it's a transient "tk", not a hat on top.
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const cf = this.ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 1900;
        const cg = this.ctx.createGain();
        cg.gain.setValueAtTime(0.13 * kg, t);
        cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        src.connect(cf); cf.connect(cg); cg.connect(dry);
        if (b.echoEverything) cg.connect(wet);
        src.start(t); src.stop(t + 0.03);
        // Knock: a short mid punch (~200-300Hz) between the click and the sub.
        // The bass owns the low fundamentals and the sub boom competes with it
        // there; this transient lives in a band the bass mostly leaves open, so
        // it gives the kick a defined attack that cuts through the low end
        // instead of masking into it. kickKnock scales it per-track (0 = off).
        const knock = b.kickKnock ?? 1;
        if (knock > 0) {
          const k = this.ctx.createOscillator(); const kgn = this.ctx.createGain();
          k.type = 'triangle';
          k.frequency.setValueAtTime(300, t);
          k.frequency.exponentialRampToValueAtTime(180, t + 0.04);
          kgn.gain.setValueAtTime(0.0001, t);
          kgn.gain.exponentialRampToValueAtTime(0.17 * kg * knock, t + 0.004);
          kgn.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          k.connect(kgn); kgn.connect(dry);
          if (b.echoEverything) kgn.connect(wet);
          k.start(t); k.stop(t + 0.07);
        }
      }
      if (b.hats && b.hats[s] && !voiced('hats', b.hats[s], { echo: !!b.echoEverything })) {
        lane('hats');
        const t = scheduleAt();
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.14 * (b.drumGain ?? 1), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        src.connect(f); f.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + 0.07);
      }
      if (b.vox && b.vox[s] && !voiced('vox', b.vox[s])) {
        lane('vox');
        // Vocal hit ("hey!"): sawtooth glottal buzz with a falling pitch bend,
        // shaped by two parallel bandpass formants; vowel alternates per slot.
        const t = scheduleAt();
        const f0 = b.vox[s];
        const [fm1, fm2] = (s % 8 < 4) ? [750, 1150] : [600, 2000]; // "ah" / "ay"
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * 1.3 * this.detune, t);
        o.frequency.exponentialRampToValueAtTime(f0 * this.detune, t + 0.07);
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        env.gain.linearRampToValueAtTime(0, t + 0.2 - 0.005);
        const mix = this.ctx.createGain(); mix.gain.value = 0.55 * MELODIC_TRIM;
        const fa = this.ctx.createBiquadFilter(); fa.type = 'bandpass'; fa.frequency.value = fm1; fa.Q.value = 5;
        const fb2 = this.ctx.createBiquadFilter(); fb2.type = 'bandpass'; fb2.frequency.value = fm2; fb2.Q.value = 8;
        o.connect(env); env.connect(fa); env.connect(fb2);
        fa.connect(mix); fb2.connect(mix); mix.connect(dry);
        if (b.echoEverything) mix.connect(wet);
        o.start(t); o.stop(t + 0.2);
      }
      if (b.shout && b.shout[s] && !voiced('shout', b.shout[s])) {
        lane('shout');
        // Vocal shout ("yeah!" / "alright!"): sawtooth voice through MOVING
        // formant filters — gliding vowels read as a word, not just a hit.
        const t = scheduleAt();
        const f0 = b.shout[s] * this.detune;
        const word = (Math.floor(this.step / 32) + s) % 2 === 0 ? 'yeah' : 'alright';
        const dur = word === 'yeah' ? 0.32 : 0.46;
        const traj = word === 'yeah'
          ? [[0, 320, 2100], [0.08, 560, 1800], [0.28, 760, 1250]]
          : [[0, 520, 950], [0.16, 700, 1300], [0.22, 640, 1100], [0.3, 720, 1350], [0.44, 400, 2000]];
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        if (word === 'yeah') {
          o.frequency.setValueAtTime(f0 * 1.25, t);
          o.frequency.exponentialRampToValueAtTime(f0 * 0.9, t + dur);
        } else {
          o.frequency.setValueAtTime(f0, t);
          o.frequency.setValueAtTime(f0, t + 0.2);
          o.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + 0.28); // "al-RIGHT"
          o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
        }
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
        if (word === 'alright') {
          env.gain.exponentialRampToValueAtTime(0.2, t + 0.2); // syllable gap
          env.gain.exponentialRampToValueAtTime(0.5, t + 0.26);
        }
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const mix = this.ctx.createGain(); mix.gain.value = (b.shoutGain != null ? b.shoutGain : 0.5) * MELODIC_TRIM;
        const fa = this.ctx.createBiquadFilter(); fa.type = 'bandpass'; fa.Q.value = 5;
        const fb2 = this.ctx.createBiquadFilter(); fb2.type = 'bandpass'; fb2.Q.value = 8;
        fa.frequency.setValueAtTime(traj[0][1], t);
        fb2.frequency.setValueAtTime(traj[0][2], t);
        for (const [tt, F1, F2] of traj.slice(1)) {
          fa.frequency.linearRampToValueAtTime(F1, t + tt);
          fb2.frequency.linearRampToValueAtTime(F2, t + tt);
        }
        o.connect(env); env.connect(fa); env.connect(fb2);
        fa.connect(mix); fb2.connect(mix); mix.connect(dry);
        if (b.echoEverything) mix.connect(wet);
        o.start(t); o.stop(t + dur + 0.02);
      }
      if (b.ohats && b.ohats[s] && !voiced('ohats', b.ohats[s], { echo: !!b.echoEverything })) {
        lane('ohats');
        // open hat: same noise, lower cutoff, long sizzle tail
        const t = scheduleAt();
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.12 * (b.drumGain ?? 1), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        src.connect(f); f.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + 0.24);
      }
      if (b.snare && b.snare[s] && !voiced('snare', b.snare[s], { echo: !!b.echoEverything })) {
        lane('snare');
        // crisp crack: brighter noise band, short decay, just a hint of body
        const t = scheduleAt();
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.32 * (b.drumGain ?? 1), t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        src.connect(f); f.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + 0.11);
        const o = this.ctx.createOscillator(); const og = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(210, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.05);
        og.gain.setValueAtTime(0.12 * (b.drumGain ?? 1), t);
        og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(og); og.connect(dry); if (b.echoEverything) og.connect(wet); o.start(t); o.stop(t + 0.08);
      }
      if (b.crash && b.crash[s] && !voiced('crash', b.crash[s], { echo: !!b.crashEcho || !!b.echoEverything })) {
        lane('crash');
        // Filtered crash: looped noise, bright on the transient and darkening
        // as it falls away — a lowpass envelope closes from crashOpen down to
        // crashClose across the hit, which is what makes it read as a cymbal
        // decaying rather than a burst of static. The fixed highpass keeps the
        // low end out so it stays snarey and thin. Longer than the snare's
        // 90ms crack, short enough not to wash over the downbeat it leads to.
        const t = scheduleAt();
        const dur = spb * (b.crashDur || 5);
        const src = this.ctx.createBufferSource(); src.buffer = this.crashBuf;
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
        lp.frequency.setValueAtTime(b.crashOpen ?? 9000, t);
        lp.frequency.exponentialRampToValueAtTime(b.crashClose ?? 1100, t + dur);
        const g = this.ctx.createGain();
        const gain = (b.crashGain ?? 0.15) * (b.drumGain ?? 1);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.005); // near-instant transient so it reads as on the beat
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.03 - 0.005);
        src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dry);
        // Percussion is dry on the echo bus by default; crashEcho opts this
        // lane in on its own, so a crash can trail off into the delay without
        // dragging the rest of the kit in with it.
        if (b.crashEcho || b.echoEverything) g.connect(wet);
        src.start(t); src.stop(t + dur + 0.03);
      }
      if (b.tom && b.tom[s] && !voiced('tom', b.tom[s], { echo: !!b.echoEverything })) {
        lane('tom');
        // Tuned tom: a rounded membrane-like pitch drop with just enough triangle
        // edge to read above the bass. It is the eighth engine kit voice; choosing
        // the catalogue's Tom or DS Tom replaces this through the same seam.
        const t = scheduleAt();
        const base = b.tomNote ?? 130;
        const dur = b.tomDur ?? 0.28;
        const level = 0.27 * (b.drumGain ?? 1);
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(base * 1.8, t);
        o.frequency.exponentialRampToValueAtTime(base, t + Math.min(0.08, dur * 0.4));
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(level, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(dry);
        if (b.echoEverything) g.connect(wet);
        o.start(t); o.stop(t + dur + 0.03);
      }
      if (b.rim && b.rim[s] && !voiced('rim', b.rim[s])) {
        lane('rim');
        // Rimshot: a stick cracking off the rim. The old version was two square
        // tones dead in 40ms — a bare click. This stacks three layers so it
        // reads as a struck object with a little tail: a noise SNAP for the
        // stick attack, a cluster of detuned square partials for the metallic
        // RING (pitch sagging slightly as it decays), and a low woody TONK
        // underneath for body. Two-stage decay out to ~75ms — a fast transient
        // then a brief ring, instead of one flat drop to silence.
        const t = scheduleAt();
        const lvl = (b.rimGain ?? 0.21) * (b.drumGain ?? 1);
        // Metallic ring: three inharmonic partials through a narrow bandpass.
        const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1750; f.Q.value = 3.6;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(lvl, t);
        g.gain.exponentialRampToValueAtTime(lvl * 0.16, t + 0.02); // fast initial transient
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);     // short ring-out tail
        for (const fr of [1720, 2630, 3350]) {
          const o = this.ctx.createOscillator();
          o.type = 'square';
          o.frequency.setValueAtTime(fr, t);
          o.frequency.exponentialRampToValueAtTime(fr * 0.94, t + 0.06); // slight pitch sag as it rings
          o.connect(f);
          o.start(t); o.stop(t + 0.09);
        }
        f.connect(g); g.connect(dry);
        // Only the ring trails into the echo, and softly — a dedicated low-gain
        // send taps it below the melodic lanes' level so it's a faint repeat,
        // not a wash. rimEcho scales it per-track (0 = dry); the snap and tonk
        // stay dry so the echo doesn't smear their transients.
        const re = this.ctx.createGain(); re.gain.value = b.rimEcho ?? 0.3;
        g.connect(re); re.connect(wet);
        // Stick snap: a few ms of high-passed noise — the attack transient that
        // gives the click its bite before the ring takes over.
        const sn = this.ctx.createBufferSource(); sn.buffer = this.noiseBuf;
        const nf = this.ctx.createBiquadFilter(); nf.type = 'highpass'; nf.frequency.value = 3200;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(lvl * 0.45, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        sn.connect(nf); nf.connect(ng); ng.connect(dry);
        if (b.echoEverything) ng.connect(wet);
        sn.start(t); sn.stop(t + 0.03);
        // Woody body: a low resonant "tonk" the click sits on, so the rimshot
        // has some weight instead of being pure top end.
        const bo = this.ctx.createOscillator(); const bg = this.ctx.createGain();
        bo.type = 'triangle';
        bo.frequency.setValueAtTime(430, t);
        bo.frequency.exponentialRampToValueAtTime(300, t + 0.05);
        bg.gain.setValueAtTime(lvl * 0.38, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        bo.connect(bg); bg.connect(dry);
        if (b.echoEverything) bg.connect(wet);
        bo.start(t); bo.stop(t + 0.08);
      }
      if (b.clap && b.clap[s] && !voiced('clap', b.clap[s], { echo: !!b.echoEverything })) {
        lane('clap');
        // three staggered high-passed bursts read as a clap
        for (let ci = 0; ci < 3; ci++) {
          const t = scheduleAt(ci * 0.012);
          const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
          const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime((ci === 2 ? 0.26 : 0.16)
            * (b.drumGain ?? 1) * (b.clapGain ?? 1), t);
          g.gain.exponentialRampToValueAtTime(0.001, t + (ci === 2 ? 0.12 : 0.03));
          src.connect(f); f.connect(g); g.connect(dry);
          if (b.echoEverything) g.connect(wet);
          src.start(t); src.stop(t + 0.15);
        }
      }
      // Layers — a track duplicated on the mixing desk. The same steps as the lane it
      // copies, on their own strip, played by a preset from the voice library.
      //
      // One loop rather than twenty-one more lane blocks, because a layer has no
      // hand-written body of its own: it is a preset and nothing else, which is the
      // point of it. Two lanes sounding the same notes with the same voice would be
      // the original 6dB louder, not a layer, so a layer with no voice chosen makes
      // no sound at all and the desk says so on the strip rather than here.
      for (const L of b.__layers || []) {
        const arr = b[L.key];
        // Rests are skipped before the rack is asked for anything, the way every lane
        // block above tests its own step: a percussion rest is `false`, which is not
        // a frequency, and building a synth pool to play it is work for silence.
        if (!arr || !arr[s]) continue;
        voiced(L.key, arr[s], { echo: laneEchoesIn(b, L.key) });
      }
      // Invincibility layer: a relentless 16th-note arpeggio over the ducked
      // theme, plus a ride tick on the offbeats. The notes are root/fifth/
      // octave/twelfth off whatever bass note the song last played, so it sits
      // in key over any cabinet's bank instead of needing a fixed-key bank.
      if (this.starMode && this.starBus) {
        const t = scheduleAt();
        const ratios = [1, 1.5, 2, 3];
        const f = this.starRoot * 4 * ratios[s % ratios.length] * this.detune;
        const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(f, t);
        const peak = s % 4 === 0 ? 0.14 : 0.09; // accent the downbeat of each group
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + spb * 0.9);
        g.gain.linearRampToValueAtTime(0, t + spb + 0.02 - 0.005);
        o.connect(g); g.connect(this.starBus);
        o.start(t); o.stop(t + spb + 0.02);
        if (s % 2 === 1) {
          const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
          const hf = this.ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7000;
          const hg = this.ctx.createGain();
          hg.gain.setValueAtTime(0.11, t);
          hg.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          src.connect(hf); hf.connect(hg); hg.connect(this.starBus);
          src.start(t); src.stop(t + 0.06);
        }
      }
      if (s % 4 === 0) {
        const beatIdx = Math.floor(this.step / 4);
        const when = this.nextTime;
        // `step` as well as the beat index, and `when` read BEFORE the increment below,
        // so a listener gets the absolute position and the exact audio time it will
        // sound at. A musical transition needs both: `step % 16` is the bar line and
        // `when` is the only clock precise enough to schedule automation against — a
        // frame callback is a quarter of a second adrift by the time it runs. beatIdx
        // alone is not enough, because it stops being a bar count the moment a loop
        // wraps to a start that is not on a bar.
        for (const fn of this.beatListeners) fn(beatIdx, when, this.step);
      }
      this.nextTime += spb;
      this.step++;
      if (this.applyPendingStep() || this.applyPendingLoop()) {
        // The selected range changed on this bar line; the new range owns the next
        // scheduled step, so do not run the old loop's wrap after it.
      } else if (this.loopEnd != null && this.step >= this.loopEnd) {
        this.step = this.loopStart;
        this.loopHasWrapped = true;
      }
    }
  }

  // Fractional beat position of what is being HEARD right now, counted from
  // the top of the bank (setBank resets step to 0, so beat 0 is the downbeat).
  // The sequencer schedules ahead of the playhead, so `step` is the future —
  // back it off by the outstanding lookahead or visuals sync to notes that
  // have not sounded yet. Returns null when there is no song to lock to, so
  // callers can fall back to a wall clock.
  songBeat() {
    if (!this.ctx || !this.bank) return null;
    const spb = (60 / (this.bpm * this.tempo)) / 4;
    // currentTime is where the graph has been rendered TO, not what has reached the
    // ear: everything after it still has to cross the output buffer and the device.
    // On built-in output that is a few milliseconds; on Bluetooth it is a fifth of a
    // second, and a playhead that ignores it runs visibly ahead of the music. Offline
    // renders report neither latency, so they are unaffected.
    const out = this.ctx.outputLatency || this.ctx.baseLatency || 0;
    const ahead = (this.nextTime - (this.ctx.currentTime - out)) / spb;
    let heardStep = this.step - ahead;
    // The scheduler wraps `step` at the selected loop boundary, but the transport
    // readout used to modulo against the whole song. A one-bar loop in a two-bar song
    // could therefore flash the end of bar 2 before returning to beat 1. Keep the
    // fractional clock inside the same range as the audio loop; the rest of the desk
    // can still modulo it against the full song when drawing the timeline.
    if (this.loopStart != null && this.loopEnd != null && this.loopEnd > this.loopStart
      && (this.loopStart === 0 || this.loopHasWrapped)) {
      const span = this.loopEnd - this.loopStart;
      heardStep = this.loopStart + ((heardStep - this.loopStart) % span + span) % span;
    }
    return heardStep / 4;
  }

  // Beat phase for rhythm cabinet: 0..1 within the current beat.
  beatPhase() {
    if (!this.ctx || !this.bank) return 0;
    const spb = (60 / (this.bpm * this.tempo));
    return ((this.ctx.currentTime % spb) / spb);
  }

  _analysisBand(lo, hi) {
    const nyquist = (this.ctx?.sampleRate || 44100) / 2;
    const a = Math.max(0, Math.floor(lo / nyquist * this._analysisSpectrum.length));
    const b = Math.min(this._analysisSpectrum.length, Math.max(a + 1,
      Math.ceil(hi / nyquist * this._analysisSpectrum.length)));
    let sum = 0;
    for (let i = a; i < b; i++) sum += this._analysisSpectrum[i];
    return sum / ((b - a) * 255);
  }

  /**
   * Kit presence, from the sequencer's own tally rather than from the spectrum.
   *
   * scheduleStep() queues each percussion step at the audio time it will sound,
   * up to a quarter-second ahead of the playhead; this drains that queue as those times
   * pass, so what gets reported is what has been HEARD and not what is about to
   * be. That is the whole reason to count it here instead of guessing at
   * transients: the arrangement already knows, exactly, on the bar it happens.
   *
   * Density over a bar, rather than time-since-last-hit. A backbeat and a
   * sixteenth-note hat pattern are both plainly "drums", but the gap between
   * their hits differs fourfold, and any gap threshold loose enough to keep a
   * sparse kick alive is also loose enough to call the tail of a fill drumless.
   */
  _readPercussion(out) {
    if (!this.ctx) {
      // No clock to age hits against. Fall back to whether the bank has a kit at
      // all, which is the honest answer for the browserless path.
      const extraPercussion = (this.bank?.__layers || [])
        .filter((L) => PERCUSSION_LANES.includes(baseLane(L.key))).map((L) => L.key);
      const kit = !!this.bank && (PERCUSSION_LANES.some((key) => this.bank[key])
        || extraPercussion.some((key) => this.bank[key]?.some(Boolean)));
      out.drums = kit ? 1 : 0;
      out.drumless = !kit;
      // No times to compare, so no onset can be identified. Zero, not 1: a
      // preset that gates on `hit` should read "no hit information here" rather
      // than a phantom drum on every browserless frame.
      out.hit = 0;
      return;
    }
    const now = this.ctx.currentTime;
    // Whether the drain below moved anything is the onset: those are precisely
    // the hits whose scheduled time passed during this frame.
    const before = this._percHeard.length;
    while (this._percPending.length && this._percPending[0] <= now) {
      this._percHeard.push(this._percPending.shift());
    }
    // Full on the frame it lands, then a fast fall. Presets that want the bare
    // event test it near 1; presets that want a short flare ride the decay.
    out.hit = this._percHeard.length > before ? 1 : out.hit * 0.55;
    const beatSeconds = 60 / (this.bpm * this.tempo);
    const oldest = now - beatSeconds * 4;
    while (this._percHeard.length && this._percHeard[0] < oldest) this._percHeard.shift();
    // Four hits a bar — a plain kick and backbeat — counts as a full kit. A
    // busier pattern cannot read as more than that, and a kick alone on 1 and 3
    // lands at half, which is honest: there is a pulse, but there is no groove.
    const density = Math.min(1, this._percHeard.length / 4);
    out.drums += (density - out.drums) * 0.08;
    // Deliberately raw where `drums` is smoothed: "this section has no kit in
    // it" is a fact about the arrangement, and a preset that switches behaviour
    // on it wants the switch to land on the bar line, not to fade across it.
    // The list is in schedule order, so the most recent hit is the last one.
    const last = this._percHeard[this._percHeard.length - 1];
    out.drumless = !(last >= now - beatSeconds * 2);
  }

  // Stable, allocation-free readout for the jukebox visualizer. The returned
  // object and typed arrays are owned by Audio and reused every frame. The
  // analyser values provide the organic response; songBeat() supplies the
  // exact procedural clock so kicks and phrase geometry never drift from the
  // notes the sequencer actually scheduled.
  musicAnalysis() {
    const out = this._analysis;
    if (this.songAnalyser && this._analysisSpectrum && this._analysisWaveform) {
      this.songAnalyser.getByteFrequencyData(this._analysisSpectrum);
      this.songAnalyser.getByteTimeDomainData(this._analysisWaveform);
      // Smooth once more at the feature level. This keeps a single sharp FFT
      // bin from making the large visual shapes twitch while preserving beat
      // transients in beatPulse below.
      out.bass += (this._analysisBand(55, 240) - out.bass) * 0.34;
      out.mid += (this._analysisBand(240, 2200) - out.mid) * 0.30;
      out.treble += (this._analysisBand(2200, 9000) - out.treble) * 0.38;
      // Overall loudness, from the time-domain window rather than the FFT: RMS
      // is a true amplitude read, where averaging frequency bins is dB-shaped
      // and lets one bright partial stand in for the whole mix. Attack is quick
      // so a drop lands on time; release is slow so `level` describes the
      // section being played instead of flickering between transients.
      let sum = 0;
      for (let i = 0; i < this._analysisWaveform.length; i++) {
        const s = (this._analysisWaveform[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / this._analysisWaveform.length);
      out.level += (rms - out.level) * (rms > out.level ? 0.45 : 0.12);
    } else {
      // Browserless tests and old Web Audio implementations still receive a
      // deterministic fallback driven by the sequencer clock.
      out.bass += ((this.bank ? 0.42 : 0) - out.bass) * 0.12;
      out.mid += ((this.bank ? 0.28 : 0) - out.mid) * 0.10;
      out.treble += ((this.bank ? 0.20 : 0) - out.treble) * 0.14;
      out.level += ((this.bank ? 0.30 : 0) - out.level) * 0.12;
    }
    // Quiet has to mean quiet *for this song*, not quiet in dBFS: a gently
    // mastered track would otherwise read as one long lull and never move. The
    // reference jumps to any new peak and decays over roughly half a minute, so
    // an intro or a breakdown still sits below the chorus it neighbours rather
    // than renormalising itself back up to full within a bar.
    if (out.level > this._analysisPeak) this._analysisPeak = out.level;
    else this._analysisPeak += (out.level - this._analysisPeak) * 0.0006;
    // The square root is perceptual headroom: a passage 12dB down is a quarter
    // of the amplitude but nothing like a quarter as loud, and a linear ratio
    // there reads as the visualizer having simply stopped.
    out.dynamics = this._analysisPeak > 0.01
      ? Math.max(0, Math.min(1, Math.sqrt(out.level / this._analysisPeak)))
      : 0;
    this._readPercussion(out);
    out.beat = this.songBeat();
    if (out.beat == null) {
      out.beatPhase = 0;
      out.beatPulse = 0;
    } else {
      out.beatPhase = ((out.beat % 1) + 1) % 1;
      out.beatPulse = Math.pow(1 - out.beatPhase, 5);
    }
    return out;
  }
}

export const Audio = new AudioSys();

// Re-exported for compatibility: these moved to ./notes.js to break the
// audio -> tracks -> cabinets -> audio import cycle. New code should import
// them from './notes.js' directly.
export { n, chordSeq, seq } from './notes.js';
