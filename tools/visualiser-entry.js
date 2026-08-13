// The jukebox presets, driven by an audio file instead of by the sequencer.
//
// In the game the analysis feed comes half from a live AnalyserNode and half from
// the sequencer, which knows exactly where every beat and kit hit is. An imported
// MP3 has no sequencer, so this page builds the whole feed up front: decode,
// measure loudness, estimate a beat grid, then run tools/lib/song-analysis.js over
// the samples to produce one analysis frame per 1/60s of the track. Playback is a
// single buffer source, and each display frame reads the table by audio clock.
//
// Precomputing rather than running a live analyser is what makes the picture
// impossible to drift: the frame that gets drawn is chosen by where the playhead
// actually is. It is also the same table tools/render-video.js replays, so the
// picture here is the picture an export would produce.
//
// A game song does not go through any of that, and must not. It PLAYS, on the
// engine's own sequencer, exactly as it does in the game — so its beat comes from
// songBeat() and its kit hits from the scheduler's own queue rather than from a
// detector, and it starts instantly instead of after a render.
//
// It also has to be live for a duller reason: `Audio` is a module singleton whose
// ensure() binds ONE context for its lifetime. Rendering a bank in this document
// would bind it to an OfflineAudioContext, and the next render would then schedule
// into the first one's finished graph and come back silent. (Measured: it does.)
// The desk solves that with a hidden iframe per render; this page has no need of a
// render at all, so it lets Audio bind its own realtime context and keeps it.
import {
  createVisualiser, VISUALISER_NAMES, createHalfPipeLab, HALF_PIPE_CONTROLS, HALF_PIPE_DEFAULTS,
  SPRITE_VISUALISERS, setExcludedVisualisers,
} from '../src/engine/visualisers.js';
import {
  analyseSong, prepareSong, retimeBeats, retimePercussion, applyDynamicsCurve,
} from './lib/song-analysis.js';
import { detectRhythmSteps, buildGrid, pickOnsets } from './lib/beat-detect.js';
import { createCustomSelect } from './lib/custom-select.js';
import { Audio } from '../src/engine/audio.js';
import { resolveTrack } from '../src/data/tracks.js';
// The saved copy is imported as a MODULE rather than looked up in the registry.
// src/data/imported/index.js forwards only { bank, title, group, writable } to
// registerTrack, so a song's own `mix` and `arrangement` never reach it — and this
// one keeps its tempo in the arrangement (80, against a bank that still says 120).
// Through the registry it played at 120 with none of its mix. Importing the file
// also keeps the other ~120 imported banks out of the bundle.
import * as WII_SHOPPING_CHANNEL from '../src/data/imported/shoppingchannel.js';
import { bpmOf } from '../src/data/arrangements.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// The analysis table is 60Hz whatever the display does. A per-machine rate would
// integrate the presets differently on a 120Hz panel than on a 60Hz one, and stop
// matching what render-video.js would draw from the same song.
const FPS = 60;
// The engine's analyser reads a 44.1kHz graph. A 48kHz context would shift every
// band's bin edges and shorten the 256-sample window from 5.80ms to 5.33ms, so the
// page would quietly stop agreeing with the renderer.
const SAMPLE_RATE = 44100;
const W = 480;
const H = 270;
// Up from black at the top of a track, and back down at the end of one. Painted
// into the CANVAS rather than done with CSS on the element, so it is part of the
// picture — a recording or a render of this frame carries the fade with it.
const FADE_IN = 1.4;
const FADE_OUT = 3.0;
// A live song loops for ever and has no end to fade into, so its fade-out is the
// one moment there IS an ending: leaving it.
const FADE_CLOSE = 0.5;
const LAB = 'HALF-PIPE HORIZON — LAB';

// This page carries no MASHENSTEIN characters: tools/build-visualiser.js resolves
// the sprite modules to a stub, so the two presets that draw the cast cannot be
// drawn here. Telling the pack means VJ MEGAMIX never deals them either — without
// this it would shuffle them into its own deck and paint an empty stage for
// sixteen bars. The pack keeps its indices; only what gets OFFERED changes.
setExcludedVisualisers(SPRITE_VISUALISERS);
// Pack indices, not positions in this list — createVisualiser addresses presets by
// index and render-video's --seed reproduces a picture from one.
const OFFERED = VISUALISER_NAMES
  .map((name, index) => ({ name, index }))
  .filter(({ name }) => !SPRITE_VISUALISERS.includes(name));
// The lab sits one past the end of the pack, the way it does on the desk.
const LAB_INDEX = VISUALISER_NAMES.length;
const OFFERED_INDICES = [...OFFERED.map((p) => p.index), LAB_INDEX];
const nameOf = (index) => (index === LAB_INDEX ? LAB : VISUALISER_NAMES[index]);
// The songs on offer, named rather than enumerated. The registry holds well over a
// hundred banks — auditions, alternates, scratch imports — and a picker that lists
// all of them is a filing cabinet, not a choice. SHOPPINGCHANNEL is a saved song
// rather than a built-in one, which is why the imported index is loaded above.
const SONGS = [
  { id: 'shoppingchannel', title: 'Wii Shopping Channel', song: WII_SHOPPING_CHANNEL },
  { id: 'megamix', title: 'MONSTER MEGAMIX' },
  { id: 'hub', title: 'THE FOOD COURT' },
  { id: 'shop', title: 'CHECKOUT PROMENADE' },
];

// What comes up first. The pipe is the one that reads as a journey rather than as
// a reaction, which is what a page you leave running wants to open on.
const DEFAULT_PRESET = Math.max(0, VISUALISER_NAMES.indexOf('HALF-PIPE HORIZON'));
const GAME_FONT_FACES = ["400 32px 'Lilita One'", "500 12px 'Fredoka'", "400 12px 'Permanent Marker'"];

// ---------------------------------------------------------------- state

// The engine's context, not one of our own: see the note at the top. ensure() is
// safe before a gesture — it builds the graph suspended and resumes on the first
// play.
// 44.1k, asked for BEFORE ensure() the way the desk does. Everything offline in
// this project renders at 44.1k, and the analyser's band edges are computed against
// the context's own Nyquist — so a 48k context would quietly shift every band and
// shorten the 256-sample window from 5.80ms to 5.33ms, and this page would stop
// agreeing with a rendered clip of the same song for no reason anyone could see.
// It is a REQUEST: a device that refuses falls back rather than losing its audio.
Audio.setSampleRate(SAMPLE_RATE);
Audio.ensure();
const ctx = Audio.ctx;
const normGain = ctx.createGain();     // the analysis gain; not a user control
const monitorGain = ctx.createGain();  // the volume knob; NOT part of the analysis
const clickGain = ctx.createGain();
normGain.connect(monitorGain).connect(ctx.destination);
clickGain.connect(ctx.destination);
clickGain.gain.value = 0.35;

const song = {
  // 'file' plays a decoded buffer against a precomputed analysis table; 'live'
  // plays the engine's sequencer and reads its analysis every frame. The two
  // differ in exactly one place — where a frame's analysis comes from — and in
  // what the transport can therefore offer.
  mode: 'file',
  name: '', buffer: null, prep: null, rhythm: null, grid: null,
  frames: null, onsets: [], duration: 0,
};
const live = { startedAt: 0 };
// Wall clock, not the audio clock: this one is a response to a button, and the
// audio clock stops the moment the context suspends.
const closing = { at: 0 };
const view = {
  preset: null, index: DEFAULT_PRESET, seed: 0, labTune: HALF_PIPE_DEFAULTS(),
  lastFrame: -1, raf: 0,
};
const transport = { source: null, startedAt: 0, offset: 0, playing: false };
const tempo = { manual: false, bpm: 120, nudge: 0, barBeats: 4, taps: [], click: false, clickAt: 0 };
const tuning = { sensitivity: 0.3, breathe: 1 };

// ---------------------------------------------------------------- loading

function setStage(text, fraction) {
  $('progress').classList.add('on');
  $('progress').querySelector('.stage').textContent = text;
  $('progress').querySelector('.bar i').style.width = `${Math.round(clamp(fraction, 0, 1) * 100)}%`;
}

// A real yield, not setTimeout(0): nested timers are clamped to 4ms, and this runs
// tens of times during a load.
function yieldToEventLoop() {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(0);
  });
}

async function loadFile(file) {
  try {
    Audio.setBank(null);   // stop a live song before a file takes the stage
    song.mode = 'file';
    song.name = file.name;
    setStage('decoding…', 0.02);
    await yieldToEventLoop();
    const bytes = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(bytes);
    song.buffer = buffer;
    song.duration = buffer.duration;

    setStage('measuring loudness…', 0.1);
    await yieldToEventLoop();
    const channels = [];
    for (let c = 0; c < buffer.numberOfChannels; c++) channels.push(buffer.getChannelData(c));
    song.prep = prepareSong({ channels, sampleRate: buffer.sampleRate });

    // Detection is the dominant cost — a 2048-point STFT across the whole file,
    // against a 256-point one for the analysis itself. Driven step by step so the
    // progress bar moves and, more to the point, so a desk playing a song on the
    // same audio service is not starved for two and a half seconds.
    const steps = detectRhythmSteps(song.prep.mono, buffer.sampleRate, { delta: tuning.sensitivity });
    let step = steps.next();
    while (!step.done) {
      setStage('finding the beat…', 0.12 + 0.6 * step.value);
      await yieldToEventLoop();
      step = steps.next();
    }
    song.rhythm = step.value;
    song.onsets = song.rhythm.percussionAt;
    tempo.bpm = song.rhythm.bpm;
    tempo.barBeats = song.rhythm.barBeats;
    tempo.manual = false;
    tempo.nudge = 0;

    await finishLoad();
  } catch (err) {
    setStage(`could not read that file — ${err.message}`, 0);
  }
}

/** Everything both sources share once there is PCM and a grid to go with it. */
async function finishLoad() {
  await fontsReady;
  if (song.mode === 'file') {
    setStage('analysing…', 0.85);
    await yieldToEventLoop();
    stop();
    rebuildGrid();
    buildFrames();
  }
  closing.at = 0;
  $('progress').classList.remove('on');
  $('drop').classList.add('gone');
  $('ui').classList.add('on');
  syncControls();
  drawWaveform();
  startPreset(view.index);
  play();
}

async function loadSong(trackId) {
  try {
    loadBank(trackId);
    await finishLoad();
  } catch (err) {
    setStage(`could not play that track — ${err.message}`, 0);
  }
}

/**
 * Play one of the game's own songs, on the engine's own sequencer.
 *
 * This is the better half of the page, not a fallback for it. An imported MP3 has
 * to have its tempo and its kit hits ESTIMATED; a bank does not. `songBeat()` is
 * the audio clock corrected for scheduler lookahead and output latency, and
 * `_readPercussion()` drains the times scheduleStep() actually queued — the same
 * ground truth the game's own jukebox reads. Nothing here is a guess, and there is
 * nothing to wait for: the song starts on the click.
 *
 * setBank(bank) with no mix or arrangement override is the ordinary game path, so
 * what plays is the song as the game plays it, looping its own form.
 */
function loadBank(trackId) {
  const entry = SONGS.find((t) => t.id === trackId);
  // A built-in song hands the engine nothing but its bank: undefined mix and
  // undefined arrangement mean "read the ones saved for this track", which is the
  // ordinary game path. A saved copy has no entry in either of those tables, so it
  // has to hand over its own or it plays at the wrong tempo with the wrong mix.
  const bank = entry.song ? entry.song.bank : resolveTrack(trackId).bank;
  const mix = entry.song ? entry.song.mix : undefined;
  const arrangement = entry.song ? entry.song.arrangement : undefined;
  song.mode = 'live';
  song.name = entry.title;
  song.buffer = null;
  song.frames = null;
  song.prep = null;
  // Endless: the form loops. Elapsed is the only honest reading, so the scrubber
  // stands down rather than lying about a position in something with no end.
  song.duration = 0;
  song.onsets = [];
  const played = bpmOf(bank, trackId, arrangement ? { [trackId]: arrangement } : undefined);
  song.rhythm = {
    bpm: played, confidence: 1, drift: 0, candidates: [], beatTimes: null,
    downbeat: 0, barBeats: 4, t0: 0, percussionAt: [], envelope: null, exact: true,
  };
  tempo.bpm = played;
  tempo.barBeats = 4;
  tempo.manual = false;
  tempo.nudge = 0;
  Audio.setBank(null);
  Audio.setBank(bank, mix, arrangement);
  live.startedAt = ctx.currentTime;
}

/** The beat clock: the tracked grid, or a constant tempo once you overrule it. */
function rebuildGrid() {
  const base = tempo.manual || !song.rhythm.beatTimes
    ? buildGrid({ bpm: tempo.bpm, barBeats: tempo.barBeats, t0: song.rhythm.t0 })
    : buildGrid({
      beatTimes: song.rhythm.beatTimes, bpm: tempo.bpm,
      downbeat: song.rhythm.downbeat, barBeats: tempo.barBeats,
    });
  // The nudge is in beats, applied to the clock rather than to the grid, so it
  // costs nothing and reads the same in both modes.
  const shift = tempo.nudge;
  song.grid = {
    ...base,
    beatAt: (t) => base.beatAt(t) + shift,
    timeAt: (beat) => base.timeAt(beat - shift),
  };
}

function buildFrames() {
  const frames = Math.max(1, Math.ceil(song.duration * FPS));
  song.frames = analyseSong(song.prep.mono, tempo.bpm, song.onsets, {
    fps: FPS,
    frames,
    sampleRate: song.buffer.sampleRate,
    gain: song.prep.gain,
    beatAt: song.grid.beatAt,
    // Two presets read the time-domain window; render-video has never produced it,
    // so it is opt-in and this is the opt.
    waveform: true,
    // 14,400 x 128 as views into one buffer, rather than as separate Arrays.
    spectrumBytes: true,
  });
  applyDynamicsCurve(song.frames, { gamma: tuning.breathe });
  normGain.gain.value = song.prep.gain;
  view.lastFrame = -1;
}

/** A tempo or grid change: no FFT, just re-derive the beat columns. */
function retime() {
  rebuildGrid();
  retimeBeats(song.frames, { fps: FPS, beatAt: song.grid.beatAt });
  scheduleClicks();
  drawWaveform();
  syncControls();
}

/**
 * Turn loudness normalisation on or off after the fact.
 *
 * Costs nothing: prepareSong already measured the LUFS, the peak and both gains
 * it could apply, so switching between them is arithmetic on numbers we have. The
 * frame table has to be rebuilt because `gain` is applied on read inside
 * analyseSong, but that is the cheap pass — a 256-point FFT, not the 2048-point
 * one detection uses.
 *
 * What this changes is the frequency bands, which map over an ABSOLUTE dB window
 * and clamp on a hot master. What it cannot change is `dynamics`: that is a ratio
 * against the song's own rolling peak, so a constant gain cancels out of it. A
 * FADE does move it — the level really is falling relative to the song's own
 * recent peak — which is why a song settles as it ends whatever this is set to.
 */
function setNormalise(on) {
  const p = song.prep;
  const appliedDb = on ? Math.min(p.wantedDb, p.headroomDb) : 0;
  p.normalised = on;
  p.appliedDb = appliedDb;
  p.gain = 10 ** (appliedDb / 20);
  p.limited = on && appliedDb < p.wantedDb - 1e-9;
  buildFrames();
  rebuildPreset();
  syncControls();
}

/** A sensitivity change: re-pick peaks off the cached envelope, nothing more. */
function reonset() {
  const env = song.rhythm.envelope;
  // A game song has no envelope because it needed no detection — its hits came from
  // the sequencer. There is nothing to be more or less sensitive about.
  if (!env) return;
  song.onsets = pickOnsets(env.percussive, env.frameRate, {
    delta: tuning.sensitivity, offset: env.offset,
  });
  retimePercussion(song.frames, song.onsets, { fps: FPS, bpm: tempo.bpm });
  drawWaveform();
  syncControls();
}

// ---------------------------------------------------------------- transport

function playhead() {
  // A live song has no end and no seekable position, only an elapsed time. The
  // engine's context freezes while suspended, so this survives a pause with no
  // bookkeeping of its own.
  if (song.mode === 'live') return Math.max(0, ctx.currentTime - live.startedAt);
  if (!transport.playing) return transport.offset;
  // currentTime is where the graph has been rendered TO, not what has reached the
  // ear. On built-in output that is a few milliseconds; on Bluetooth it is a fifth
  // of a second, and a playhead that ignores it runs visibly ahead of the music.
  // src/engine/audio.js corrects for this in songBeat() for the same reason.
  const latency = ctx.outputLatency || ctx.baseLatency || 0;
  return clamp(ctx.currentTime - latency - transport.startedAt + transport.offset, 0, song.duration);
}

function play() {
  if (song.mode === 'live') {
    if (ctx.state === 'suspended') ctx.resume();
    transport.playing = true;
    $('play').textContent = 'PAUSE';
    if (!view.raf) view.raf = requestAnimationFrame(frame);
    return;
  }
  if (!song.buffer || transport.playing) return;
  if (ctx.state === 'suspended') ctx.resume();
  const source = ctx.createBufferSource();
  source.buffer = song.buffer;
  source.connect(normGain);
  source.start(0, clamp(transport.offset, 0, Math.max(0, song.duration - 0.01)));
  source.onended = () => { if (transport.source === source && transport.playing) stop(); };
  transport.source = source;
  transport.startedAt = ctx.currentTime;
  transport.playing = true;
  $('play').textContent = 'PAUSE';
  scheduleClicks();
  if (!view.raf) view.raf = requestAnimationFrame(frame);
}

function pause() {
  if (song.mode === 'live') {
    // suspend(), not setBank(null): the song keeps its place, and currentTime
    // stops with it so the elapsed reading does too.
    ctx.suspend();
    transport.playing = false;
    $('play').textContent = 'PLAY';
    return;
  }
  if (!transport.playing) return;
  transport.offset = playhead();
  transport.playing = false;
  try { transport.source.stop(); } catch { /* already ended */ }
  transport.source = null;
  $('play').textContent = 'PLAY';
}

function stop() {
  if (song.mode === 'live') { Audio.setBank(null); transport.playing = false; return; }
  pause();
  transport.offset = 0;
  seek(0);
}

/**
 * Seeking has to replay the visualiser, not just move the audio.
 *
 * Every preset integrates forward — particle pools, `flow`, and the seeded
 * 4/8/16-beat holds ringRotationAt() generates from beat 0 — so the only way to
 * reach frame N in the state a continuous play would have been in is to run
 * update() N times. This is exactly the lead-in replay render-video.js does when
 * it splits a song across workers, and it costs about 0.01ms a frame against
 * 50-250ms to draw one.
 */
function seek(seconds) {
  // Nothing to seek to: the sequencer is where it is, and there is no analysis
  // table to replay a preset against. Rebuilding the picture at the current beat
  // is the honest version of "start again from here".
  if (song.mode === 'live') { rebuildPreset(); return; }
  const wasPlaying = transport.playing;
  pause();
  transport.offset = clamp(seconds, 0, song.duration);
  rebuildPreset();
  if (wasPlaying) play();
  else { drawFrame(); paintUi(); }
}

function scheduleClicks() {
  if (!tempo.click || !transport.playing || !song.grid) return;
  // Nothing to cancel — clicks are scheduled a couple of seconds ahead inside the
  // frame loop, so a grid change simply stops feeding the old one.
  tempo.clickAt = playhead();
}

function emitClick(at, strong) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = strong ? 1600 : 1000;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(strong ? 0.5 : 0.22, at + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
  osc.connect(gain).connect(clickGain);
  osc.start(at);
  osc.stop(at + 0.06);
}

// ---------------------------------------------------------------- the picture

function sizeCanvas() {
  const canvas = $('viscanvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(innerWidth * dpr));
  canvas.height = Math.max(1, Math.round(innerHeight * dpr));
}

/** Browse the offered list, which is the pack minus the two sprite presets. */
function stepPreset(delta) {
  const at = OFFERED_INDICES.indexOf(view.index);
  const n = OFFERED_INDICES.length;
  startPreset(OFFERED_INDICES[(((at + delta) % n) + n) % n]);
}

/** @param index a PACK index, which is not its position in the offered list. */
function startPreset(index) {
  view.index = OFFERED_INDICES.includes(index) ? index : OFFERED_INDICES[0];
  view.seed = ((Math.random() * 0xffffffff) ^ (view.index * 0x9e3779b9)) >>> 0;
  // The knob row belongs to the preset, not to the playhead, so it is torn down
  // here rather than in rebuildPreset — which a seek also calls, and which would
  // otherwise take the lab's controls away every time you moved the scrubber.
  $('viscontrols')?.remove();
  rebuildPreset();
  presetSelect.value = nameOf(view.index);
  syncControls();
}

/** Build the preset and replay it up to wherever the playhead is. */
function rebuildPreset() {
  const lab = view.index === LAB_INDEX;
  const track = { bpm: tempo.bpm };
  view.preset = lab
    ? createHalfPipeLab(view.seed, track, view.labTune)
    : createVisualiser(view.index, view.seed, track);
  view.lastFrame = -1;
  // A live song has no table to replay, so a rebuilt preset simply starts from
  // rest at the current beat. A file's does, and replaying it is the only way to
  // reach the state a continuous play would have been in — every preset is a
  // forward integration.
  if (song.mode === 'file' && song.frames) {
    const target = Math.min(song.frames.length - 1, Math.floor(playhead() * FPS));
    for (let k = 0; k <= target; k++) view.preset.update(1 / FPS, song.frames[k]);
    view.lastFrame = target;
  }
}

/** 0 = black, 1 = the picture. */
function fadeLevel() {
  const t = playhead();
  let v = clamp(t / FADE_IN, 0, 1);
  // A file has a real end to arrive at; a live form does not.
  if (song.mode === 'file' && song.duration > FADE_OUT * 2) {
    v = Math.min(v, clamp((song.duration - t) / FADE_OUT, 0, 1));
  }
  if (closing.at) v = Math.min(v, clamp(1 - (performance.now() - closing.at) / (FADE_CLOSE * 1000), 0, 1));
  return v;
}

function drawFrame() {
  const canvas = $('viscanvas');
  const c = canvas.getContext('2d');
  if (!c || !view.preset) return;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000';
  c.fillRect(0, 0, canvas.width, canvas.height);
  // Cover, not stretch: the presets are composed in a fixed 480x270 space and a
  // non-uniform scale turns every ring into an ellipse.
  const fit = Math.max(canvas.width / W, canvas.height / H);
  c.setTransform(fit, 0, 0, fit, (canvas.width - W * fit) / 2, (canvas.height - H * fit) / 2);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  view.preset.draw(c);
  const fade = fadeLevel();
  if (fade < 1) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = `rgba(0,0,0,${(1 - fade).toFixed(4)})`;
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function frame() {
  view.raf = requestAnimationFrame(frame);
  if (!view.preset) return;
  const t = playhead();

  // Live: the analysis comes from the engine every frame rather than from a table,
  // but the preset is still stepped at a fixed 1/FPS off the audio clock — never a
  // wall-clock delta. update() integrates, so pacing it by the clock the music is
  // on is what keeps the picture and the song together through a dropped frame.
  if (song.mode === 'live') {
    const target = Math.floor(t * FPS);
    if (view.lastFrame < 0) view.lastFrame = target - 1;
    const catchUp = Math.min(8, target - view.lastFrame);
    const analysis = Audio.musicAnalysis();
    for (let k = 0; k < catchUp; k++) view.preset.update(1 / FPS, analysis);
    if (target > view.lastFrame) view.lastFrame = target;
    liveAnalysis = analysis;
    drawFrame();
    paintUi();
    return;
  }

  if (!song.frames) return;
  const target = Math.min(song.frames.length - 1, Math.floor(t * FPS));

  // Advance one analysis frame at a time with a fixed dt. Never a wall-clock delta:
  // update() integrates, and every preset mixes t-driven and beat-driven motion, so
  // a variable dt would make this page look different from a video of the same
  // table for reasons nobody could debug. On a 120Hz display the loop body simply
  // does not run on the extra frames and only draw() does — 60Hz motion presented
  // at 120Hz, which is what the game and the renderer already do.
  if (target > view.lastFrame) {
    const first = view.lastFrame + 1;
    // Cap the catch-up. A GC hitch or a hidden tab would otherwise turn into a
    // visible fast-forward, and a long enough one into a spiral.
    const CATCH_UP = 8;
    if (target - first >= CATCH_UP) {
      // Jump rather than fast-forward. Almost every field is a one-pole toward an
      // analysis-driven target and self-heals within a few frames — but `hit` is
      // an impulse, so carry the strongest one across the skipped span instead of
      // letting the last frame's decayed value stand and swallowing an onset.
      let hit = 0;
      for (let k = first; k <= target; k++) if (song.frames[k].hit > hit) hit = song.frames[k].hit;
      view.preset.update(1 / FPS, { ...song.frames[target], hit });
    } else {
      for (let k = first; k <= target; k++) view.preset.update(1 / FPS, song.frames[k]);
    }
    view.lastFrame = target;
  }
  drawFrame();
  paintUi();

  if (tempo.click && transport.playing && song.grid?.beatAt) {
    const ahead = t + 1.5;
    while (tempo.clickAt < ahead && tempo.clickAt < song.duration) {
      const beat = song.grid.beatAt(tempo.clickAt);
      const next = Math.floor(beat) + 1;
      const when = beatTime(next);
      if (!Number.isFinite(when) || when <= tempo.clickAt) break;
      const at = ctx.currentTime + (when - t);
      if (at > ctx.currentTime) emitClick(at, next % tempo.barBeats === 0);
      tempo.clickAt = when;
    }
  }
}

const beatTime = (beat) => song.grid.timeAt(beat);

// ---------------------------------------------------------------- chrome

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

let liveAnalysis = null;

function paintUi() {
  const t = playhead();
  $('time').innerHTML = song.mode === 'live'
    ? `<b>${fmt(t)}</b>`
    : `<b>${fmt(t)}</b> / ${fmt(song.duration)}`;
  const a = song.mode === 'live' ? liveAnalysis : song.frames?.[view.lastFrame];
  if (a) {
    const phase = a.beatPhase;
    const lamp = $('beatlamp');
    const onBeat = phase < 0.14;
    const bar = onBeat && Math.floor(a.beat) % tempo.barBeats === 0;
    lamp.className = bar ? 'bar' : onBeat ? 'beat' : '';
  }
  const wave = $('scrubwave');
  const c = wave.getContext('2d');
  if (song.mode !== 'live' && c && wave.dataset.painted) {
    // Only the playhead moves; the waveform underneath is painted once.
    c.putImageData(wavePixels, 0, 0);
    const x = Math.round((t / song.duration) * wave.width);
    c.fillStyle = '#4ec9b0';
    c.fillRect(x, 0, Math.max(1, Math.round(devicePixelRatio || 1)), wave.height);
  }
  if ($('panel').classList.contains('on') && a) paintMeters(a);
  paintStats(performance.now());
}

let wavePixels = null;

function drawWaveform() {
  // Live has no PCM to draw and no end to draw it against.
  $('scrub').style.display = song.mode === 'live' ? 'none' : '';
  if (song.mode === 'live') return;
  const wave = $('scrubwave');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  wave.width = Math.max(1, Math.round(wave.clientWidth * dpr));
  wave.height = Math.max(1, Math.round(wave.clientHeight * dpr));
  const c = wave.getContext('2d');
  if (!c || !song.prep) return;
  c.fillStyle = '#1b2129';
  c.fillRect(0, 0, wave.width, wave.height);
  const xOf = (t) => Math.round((t / song.duration) * wave.width);

  // The grid FIRST, and only as dense as it can be drawn and still be read. A
  // four-minute track has a thousand beats in it; at a pixel and a half apart they
  // are not a grid, they are a fill, and they bury the waveform they were meant to
  // be read against. Bars survive longer than beats, so they drop out last.
  const beatPx = song.grid ? (wave.width / song.duration) * (60 / tempo.bpm) : 0;
  if (song.grid?.beatAt && beatPx > 1) {
    const showBeats = beatPx >= 14;
    const showBars = beatPx * tempo.barBeats >= 7;
    if (showBars || showBeats) {
      for (let beat = 0; beat < 20000; beat++) {
        const when = beatTime(beat);
        if (!Number.isFinite(when) || when >= song.duration) break;
        if (when <= 0) continue;
        const bar = beat % tempo.barBeats === 0;
        if (bar ? !showBars : !showBeats) continue;
        c.fillStyle = bar ? 'rgba(78,201,176,.55)' : 'rgba(121,131,154,.30)';
        c.fillRect(xOf(when), 0, 1, bar ? wave.height : wave.height / 3);
      }
    }
  }

  // Onsets as a bottom rule, again only when they are distinguishable. On a dense
  // mix there are more hits than pixels and a solid red bar says nothing.
  if (song.onsets.length && wave.width / song.onsets.length >= 3) {
    c.fillStyle = 'rgba(229,83,75,.8)';
    for (const hit of song.onsets) c.fillRect(xOf(hit), wave.height - 3, 1, 3);
  }

  // The waveform last, so it reads over the grid rather than under it.
  const mono = song.prep.mono;
  const per = mono.length / wave.width;
  c.fillStyle = 'rgba(150,161,184,.9)';
  for (let x = 0; x < wave.width; x++) {
    let peak = 0;
    const from = Math.floor(x * per);
    const to = Math.min(mono.length, Math.floor((x + 1) * per));
    for (let i = from; i < to; i += 8) { const v = Math.abs(mono[i]); if (v > peak) peak = v; }
    const h = Math.max(1, Math.min(1, peak * song.prep.gain) * (wave.height - 6));
    c.fillRect(x, (wave.height - h) / 2, 1, h);
  }
  wavePixels = c.getImageData(0, 0, wave.width, wave.height);
  wave.dataset.painted = '1';
}

/**
 * What the preset is doing, live.
 *
 * Reads the running instance's own fields rather than shadowing them, so this can
 * only ever tell the truth about what is on screen. Pipe-specific where the pipe
 * has something to say, because "how many bars until the next turn" is the whole
 * question you actually want answered while watching it.
 */
let statsAt = 0;
function paintStats(now) {
  const box = $('stats');
  if (!box.classList.contains('on') || !view.preset) return;
  if (now - statsAt < 90) return;   // ~11Hz: this is a readout, not an animation
  statsAt = now;
  const p = view.preset;
  const rows = [];
  const add = (k, v, due = false) => rows.push(
    `<u>${k}</u><span${due ? ' class="due"' : ''}>${v}</span>`);
  const meter = (v, max = 1) =>
    `<i class="bar2"><i style="width:${clamp((v / max) * 100, 0, 100).toFixed(0)}%"></i></i>`;
  const bars = (beats) => `${(Math.max(0, beats) / 4).toFixed(1)} bars`;
  const a = song.mode === 'live' ? liveAnalysis : song.frames?.[view.lastFrame];

  add('preset', nameOf(view.index));
  if (a && Number.isFinite(a.beat)) {
    add('beat', `${a.beat.toFixed(2)}   bar ${Math.floor(a.beat / tempo.barBeats) + 1}`);
  }
  add('bpm', tempo.bpm.toFixed(2));

  // The half-pipe keeps every schedule in beats on `phraseBeat`, so all of these
  // are the same subtraction.
  if (p.bankNextBeat !== undefined) {
    const till = (next) => next - p.phraseBeat;
    add('lean', `${meter(Math.abs(p.curve))}${p.curve >= 0 ? ' ' : '-'}${Math.abs(p.curve).toFixed(2)}`
      + `  \u2192 ${p.bankTarget.toFixed(2)}`);
    add('next turn', bars(till(p.bankNextBeat)), till(p.bankNextBeat) < 1);
    add('width', `${meter(p.width, p.tune.width)}${p.width.toFixed(2)} / ${p.tune.width.toFixed(2)}`);
    add('next width', bars(till(p.widthNextBeat)), till(p.widthNextBeat) < 1);
    add('roll', `${((p.roll * 180) / Math.PI).toFixed(0)}\u00b0`);
    add('corkscrew', p.spiralActive ? 'ROLLING' : bars(till(p.spiralNextBeat)),
      p.spiralActive || till(p.spiralNextBeat) < 1);
    add('next colour', bars(till(p.schemeNextBeat)), till(p.schemeNextBeat) < 1);
    add('speed', `${meter(p.rowRate, 14)}${p.rowRate.toFixed(2)} rows/s`);
    add('settle', `${meter(p.settle)}${p.settle.toFixed(2)}`);
    // The one thing that is a bug if it is ever wrong rather than a taste call.
    const v = p.rows?.[0];
    if (v) {
      const inside = v.cx >= 34 && v.cx <= 446 && v.cy >= 34 && v.cy <= 236;
      add('horizon', `${v.cx.toFixed(0)}, ${v.cy.toFixed(0)}  ${inside ? 'inside' : 'OUTSIDE'}`, !inside);
    }
  }
  if (a) {
    add('motion', `${meter(p.motion)}${p.motion.toFixed(2)}`);
    add('dynamics', `${meter(a.dynamics)}${a.dynamics.toFixed(2)}`);
  }
  box.innerHTML = '<h3>Live</h3><div class="st">' + rows.join('') + '</div>';
}

const METERS = ['bass', 'mid', 'treble', 'level', 'dynamics', 'drums', 'hit'];

function paintMeters(a) {
  const host = $('meters');
  if (!host.childElementCount) {
    host.innerHTML = METERS.map((key) => `<div class="meter" data-k="${key}">`
      + `<span>${key}</span><i><u></u></i><b></b></div>`).join('')
      + '<div class="meter"><span>drumless</span><i><span class="lamp"></span></i><b></b></div>';
  }
  for (const key of METERS) {
    const row = host.querySelector(`[data-k="${key}"]`);
    row.querySelector('u').style.width = `${clamp(a[key], 0, 1) * 100}%`;
    row.querySelector('b').textContent = a[key].toFixed(2);
  }
  host.querySelector('.lamp').className = `lamp${a.drumless ? ' on' : ''}`;
}

function syncControls() {
  // Keyed on the grid, not on the loudness measurement: a live song has a grid and
  // no measurement, and guarding on the latter left every tempo readout blank.
  if (!song.rhythm) return;
  $('bpm').value = tempo.bpm.toFixed(2);
  $('barbeats').value = tempo.barBeats;
  // The trim covers half a bar each way, so DOWNBEAT HERE can never land outside
  // the range the slider is able to show.
  $('nudge').min = -tempo.barBeats / 2;
  $('nudge').max = tempo.barBeats / 2;
  $('nudge').value = tempo.nudge;
  $('seed').value = `0x${view.seed.toString(16)}`;
  $('auto').classList.toggle('on', !tempo.manual && !!song.rhythm.beatTimes);
  $('auto').textContent = tempo.manual ? 'FIXED TEMPO' : 'AUTO GRID';
  $('click').classList.toggle('on', tempo.click);
  // A share of onset energy, not a probability the tempo is right. On a dense mix
  // it sits near 0.4 with a perfectly good grid, because most of the energy is not
  // on a beat — so this is worded as a match and only flagged when it is genuinely
  // poor. The lamp and the click track are what actually tell you. A game song
  // skips all of that: its grid came out of the sequencer, so there is nothing to
  // be confident about.
  const conf = Math.round(song.rhythm.confidence * 100);
  const drift = song.rhythm.drift * 100;
  $('tempread').innerHTML = song.rhythm.exact
    ? `grid <b>exact</b> — ${song.mode === 'live' ? 'live from the sequencer' : 'from the sequencer'}`
    : (conf < 22 ? `<span class="warn">weak grid match ${conf}%</span>` : `grid match <b>${conf}%</b>`)
      + (drift > 1 ? ` · <span class="warn">tempo moves ${drift.toFixed(1)}%</span>` : '');
  const p = song.prep;
  $('loudread').innerHTML = !p
    ? 'played live — nothing measured, nothing applied'
    : `<b>${p.lufs.toFixed(1)}</b> LUFS · peak <b>${p.peakDb.toFixed(1)}</b> dBFS<br>`
    + (p.normalised
      ? `applied <b>${p.appliedDb >= 0 ? '+' : ''}${p.appliedDb.toFixed(1)}</b> dB`
        + (p.limited
          ? `<br><span class="warn">wanted ${p.wantedDb >= 0 ? '+' : ''}${p.wantedDb.toFixed(1)} dB — `
            + 'peak-limited, so the bands will read hot</span>'
          : '')
      : 'played at <b>unity</b> — our own mix, as render-video renders it');
  $('onsetread').innerHTML = song.mode === 'live'
    ? 'read off the scheduler as they sound'
    : song.rhythm.exact
      ? `<b>${song.onsets.length}</b> kit hits, from the sequencer`
      : `<b>${song.onsets.length}</b> hits detected`;
  // Sensitivity is meaningless without an envelope to threshold.
  $('onsense').disabled = !!song.rhythm.exact;
  $('normalise').checked = !!p?.normalised;
  // A live song is the sequencer's, not ours: there is no gain to apply, no
  // envelope to threshold, and no table to reshape.
  for (const id of ['normalise', 'breathe', 'nudge', 'here', 'auto', 'bpm', 'half', 'dbl', 'tap']) {
    $(id).disabled = song.mode === 'live';
  }
  $('onsenseval').textContent = tuning.sensitivity.toFixed(2);
  $('breatheval').textContent = tuning.breathe.toFixed(1);
  if (view.index === LAB_INDEX) renderLabKnobs();
}

// ---------------------------------------------------------------- lab knobs

function renderLabKnobs() {
  if ($('viscontrols')) return;
  const bar = document.createElement('div');
  bar.className = 'row labrow';
  bar.id = 'viscontrols';
  for (const control of HALF_PIPE_CONTROLS) {
    const knob = document.createElement('div');
    knob.className = 'labknob';
    knob.innerHTML = `<span>${control.label}</span>`
      + `<input type="range" min="${control.min}" max="${control.max}" step="${control.step}">`
      + '<b></b>';
    const input = knob.querySelector('input');
    const readout = knob.querySelector('b');
    // AUTO and OFF are VALUES, not absences — see nextHold() in visualisers.js — so
    // the readout has to name them rather than print the number behind them.
    const text = (value) => {
      if (control.unit !== 'beats') return Number.isInteger(value) ? String(value) : value.toFixed(1);
      if (value < 0) return 'OFF';
      if (value === 0) return 'AUTO';
      return String(value);
    };
    input.value = view.labTune[control.key];
    readout.textContent = text(view.labTune[control.key]);
    input.oninput = () => {
      const value = Number(input.value);
      readout.textContent = text(value);
      const next = { [control.key]: value };
      view.labTune = { ...view.labTune, ...next };
      // Straight onto the running preset. Rebuilding it would restart the ride
      // every time a slider moved, which is the opposite of what a slider is for.
      view.preset?.applyTune?.(next);
    };
    bar.appendChild(knob);
  }
  $('ui').appendChild(bar);
}

// ---------------------------------------------------------------- wiring

const presetSelect = createCustomSelect({
  label: 'visualiser preset',
  idPrefix: 'vispreset',
  options: OFFERED_INDICES.map((index) => [nameOf(index), nameOf(index)]),
  value: nameOf(DEFAULT_PRESET),
  fieldClass: 'selectfield',
  menuClass: 'selectmenu',
  optionClass: 'selectoption',
});
$('presetslot').appendChild(presetSelect);
presetSelect.addEventListener('input', () => {
  startPreset(OFFERED_INDICES.find((index) => nameOf(index) === presetSelect.value));
});

const songSelect = createCustomSelect({
  label: 'song',
  idPrefix: 'vissong',
  options: SONGS.map((t) => [t.id, t.title]),
  value: SONGS[0].id,
  fieldClass: 'selectfield',
  menuClass: 'selectmenu',
  optionClass: 'selectoption',
});
$('songslot').appendChild(songSelect);
$('playsong').onclick = () => loadSong(songSelect.value);

$('open').onclick = () => {
  // Fade down before the picker arrives rather than cutting to it. The frame loop
  // keeps drawing through this, which is the only reason it can be seen at all.
  closing.at = performance.now();
  setTimeout(() => {
    pause();
    $('drop').classList.remove('gone');
    $('progress').classList.remove('on');
    closing.at = 0;
  }, FADE_CLOSE * 1000);
};

$('pick').onclick = () => $('file').click();
$('file').onchange = () => { if ($('file').files[0]) loadFile($('file').files[0]); };
for (const type of ['dragenter', 'dragover']) {
  window.addEventListener(type, (ev) => { ev.preventDefault(); $('drop').classList.add('over'); });
}
window.addEventListener('dragleave', () => $('drop').classList.remove('over'));
window.addEventListener('drop', (ev) => {
  ev.preventDefault();
  $('drop').classList.remove('over');
  const file = ev.dataTransfer?.files?.[0];
  if (file) loadFile(file);
});

$('play').onclick = () => (transport.playing ? pause() : play());
$('vol').oninput = () => {
  const v = Number($('vol').value);
  monitorGain.gain.value = v;             // the file path
  Audio.setVolumes({ music: clamp(v, 0, 1) });  // and the engine's own music bus
};
$('scrub').onpointerdown = (ev) => {
  const rect = $('scrub').getBoundingClientRect();
  seek(((ev.clientX - rect.left) / rect.width) * song.duration);
};
$('prev').onclick = () => stepPreset(-1);
$('next').onclick = () => stepPreset(1);
$('reseed').onclick = () => { startPreset(view.index); };
$('seed').onchange = () => {
  const parsed = Number($('seed').value);
  if (Number.isFinite(parsed)) { view.seed = parsed >>> 0; rebuildPreset(); }
};

$('bpm').onchange = () => {
  const next = Number($('bpm').value);
  if (!(next > 0)) return;
  tempo.bpm = next;
  tempo.manual = true;
  retime();
};
$('half').onclick = () => { tempo.bpm /= 2; tempo.manual = true; retime(); };
$('dbl').onclick = () => { tempo.bpm *= 2; tempo.manual = true; retime(); };
$('auto').onclick = () => {
  if (!song.rhythm?.beatTimes) return;
  tempo.manual = !tempo.manual;
  if (!tempo.manual) tempo.bpm = song.rhythm.bpm;
  retime();
};
$('nudge').oninput = () => { tempo.nudge = Number($('nudge').value); retime(); };
$('barbeats').onchange = () => { tempo.barBeats = clamp(Number($('barbeats').value) || 4, 2, 12); retime(); };
$('here').onclick = () => {
  // Put the nearest downbeat exactly on the playhead.
  const beat = song.grid.beatAt(playhead());
  tempo.nudge += Math.round(beat / tempo.barBeats) * tempo.barBeats - beat;
  // Fold back inside one bar. Without this the trim slider and the value it is
  // supposed to be showing drift apart the first time this button is used, and
  // the slider silently starts lying about where the grid is.
  const bar = tempo.barBeats;
  tempo.nudge = ((tempo.nudge % bar) + bar) % bar;
  if (tempo.nudge > bar / 2) tempo.nudge -= bar;
  retime();
};
$('click').onclick = () => { tempo.click = !tempo.click; scheduleClicks(); syncControls(); };
$('tap').onclick = tap;

function tap() {
  const now = performance.now() / 1000;
  if (tempo.taps.length && now - tempo.taps[tempo.taps.length - 1] > 2) tempo.taps = [];
  tempo.taps.push(now);
  if (tempo.taps.length > 9) tempo.taps.shift();
  if (tempo.taps.length < 3) return;
  const gaps = [];
  for (let i = 1; i < tempo.taps.length; i++) gaps.push(tempo.taps[i] - tempo.taps[i - 1]);
  // Throw out the wild ones before averaging, so one late tap does not move the
  // answer by five BPM.
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  const kept = gaps.filter((g) => Math.abs(g - median) < median * 0.3);
  const mean = kept.reduce((a, b) => a + b, 0) / kept.length;
  tempo.bpm = clamp(60 / mean, 20, 400);
  tempo.manual = true;
  retime();
}

$('showstats').onclick = () => {
  const on = $('stats').classList.toggle('on');
  $('showstats').classList.toggle('on', on);
};
$('showpanel').onclick = () => {
  const on = $('panel').classList.toggle('on');
  $('showpanel').classList.toggle('on', on);
};
$('full').onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
};
$('normalise').onchange = () => setNormalise($('normalise').checked);
$('onsense').oninput = () => { tuning.sensitivity = Number($('onsense').value); reonset(); };
$('breathe').oninput = () => {
  tuning.breathe = Number($('breathe').value);
  // Breathe reshapes dynamics over the finished table, so it needs the table
  // rebuilt from the unshaped values rather than compounding on itself.
  buildFrames();
  rebuildPreset();
  syncControls();
};

window.addEventListener('keydown', (ev) => {
  if (ev.target instanceof HTMLInputElement) return;
  const key = ev.key.toLowerCase();
  if (ev.key === ' ') { ev.preventDefault(); transport.playing ? pause() : play(); }
  else if (ev.key === 'ArrowLeft') seek(playhead() - 5);
  else if (ev.key === 'ArrowRight') seek(playhead() + 5);
  else if (key === '[') stepPreset(-1);
  else if (key === ']') stepPreset(1);
  else if (key === 't') tap();
  else if (key === 'r') startPreset(view.index);
  else if (key === 's') $('showstats').click();
  else if (key === 'f') $('full').click();
});

// Fade the chrome away when the mouse settles, like the desk's overlay does.
let idleTimer = 0;
function wake() {
  $('ui').classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => $('ui').classList.add('idle'), 2800);
}
window.addEventListener('pointermove', wake);
window.addEventListener('keydown', wake);

window.addEventListener('resize', () => { sizeCanvas(); if (song.prep) drawWaveform(); });
sizeCanvas();

// EMERALD CODE RAIN bakes a glyph atlas the first time it draws, so the faces have
// to be resident before any frame is rendered or the whole session keeps the
// fallback. Started here and awaited in loadFile rather than at the top level: the
// bundle is an IIFE, which has no top-level await, and nothing draws until a file
// has been picked anyway. A missing network falls back rather than failing.
const fontsReady = Promise.all(
  GAME_FONT_FACES.map((face) => document.fonts.load(face).catch(() => {})),
);
