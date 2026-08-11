import { Audio } from '../src/engine/audio.js';
import { VOICES } from '../src/data/voices.js';
import { offeredByEngine } from '../src/data/voices-in-play.js';
import { benchPlay, benchLane, createPatternPlayer } from './mixer-voice-library.js';
import { createVoiceEditor, measureRaw } from './mixer-voice-editor.js';
import { createSynthFull } from './mixer-synth-full.js';
import { createWebMidiRouter } from './mixer-synth-keyboard.js';
import { createKnob } from './mrdr3-knob.js';
import { createPerformancePanel } from './mrdr3-performance.js';
import { createMasterMeter } from './mrdr3-master-meter.js';
import { createEffect } from '../src/engine/effects.js';
import { encodePatch, decodePatch } from './mrdr3-patch.js';

const $ = (id) => document.getElementById(id);
const DEFAULT_PRESET = 'bestChoirAah';
const midi = createWebMidiRouter({ storageKey: 'mash-mrdr3-midi-on' });
const masterMeter = createMasterMeter({ Audio, storageKey: 'mash-mrdr3-master-db' });
let basePresetId = DEFAULT_PRESET;
let performancePanel;
let patternPlayer;
let previewFx = null;
let previewFxState = null;
let loadSerial = 0;
// Was a figure playing when the current preset change began? See loadPreset.
let resumeAuto = false;
// The pending impulse-response rebuild — see setPreviewEffect. Up here with the rest of
// the module's state because disposePreviewFx clears it, and that runs before anything
// below it has been reached.
let irTimer = 0;
let irPending = null;

function toast(message, ms = 2600) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  if (ms) toast.timer = setTimeout(() => el.classList.remove('show'), ms);
}

function ask(title, body, okLabel = 'Discard') {
  return new Promise((resolve) => {
    const modal = $('ask');
    $('asktitle').textContent = title;
    $('askbody').textContent = body.replace(/<[^>]+>/g, '');
    $('askok').textContent = okLabel;
    modal.classList.add('show');
    const done = (answer) => {
      modal.classList.remove('show');
      $('askok').onclick = null; $('askcancel').onclick = null;
      modal.onpointerdown = null; window.removeEventListener('keydown', onKey, true);
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); done(false); }
      if (event.key === 'Enter') { event.preventDefault(); done(true); }
    };
    $('askok').onclick = () => done(true);
    $('askcancel').onclick = () => done(false);
    modal.onpointerdown = (event) => { if (event.target === modal) done(false); };
    window.addEventListener('keydown', onKey, true);
  });
}

function disposePreviewFx() {
  clearTimeout(irTimer); irTimer = 0; irPending = null;
  if (!previewFx) return;
  for (const effect of previewFx.effects || []) {
    try { effect.node?.dispose?.(); } catch { /* best effort: the context owns the nodes */ }
  }
  try { previewFx.input?.disconnect(); } catch { /* already disconnected */ }
  previewFx = null;
}

// The reverb's DECAY and PRE-DELAY are the only audition controls whose change is not a
// number but a whole new impulse response — up to eight seconds of stereo noise under an
// exponential, generated in a loop, which measures 12 ms typical and 18 ms worst at
// 48 kHz. One of those per pointer-move is a dropped frame per pixel and about 400 ms of
// main thread for one drag across the range. So they land on a timer instead: at most one
// room per 80 ms while the knob is moving, and the last value always arrives. A reverb
// tail that follows the hand by a frame is not a thing anyone can hear; a UI that stutters
// while you set it is.
const IR_KEYS = ['decay', 'preDelay'];
const IR_COALESCE_MS = 80;

function setPreviewEffect(name, params, bpm) {
  const effect = previewFx?.byName[name];
  if (!effect) return;
  if (name !== 'reverb') { effect.set(params, bpm); return; }
  // Everything except the room itself goes through immediately — MIX is a pair of gains
  // and has no business waiting behind an impulse response.
  const cheap = { ...params };
  for (const key of IR_KEYS) delete cheap[key];
  effect.set(cheap, bpm);
  irPending = { ...params };
  if (irTimer) return;
  irTimer = setTimeout(() => {
    irTimer = 0;
    const pending = irPending; irPending = null;
    if (pending) previewFx?.byName.reverb?.set(pending, bpm);
  }, IR_COALESCE_MS);
}

/**
 * Build the temporary audition chain from the same native effect definitions used by
 * Song Mixer inserts. The chain ends at musicBus, so the normal music fader and master
 * still apply; only bench notes are redirected into its input by setPreviewOutput().
 */
function applyPreviewEffects(next = {}, { rebuild = false } = {}) {
  previewFxState = next;
  if (!Audio.ctx || !Audio.musicBus) return;
  const active = [
    ['reverb', 'reverb'],
    ['delay', 'chandelay'],
  ].filter(([name]) => next[name]?.enabled);
  const bpm = performancePanel?.state?.().bpm || 120;
  const signature = active.map(([name]) => name).join('+');

  // A knob is not a new chain. Turning one changes a number inside the effect that is
  // already running: both of these are native effects with a live `set`, the reverb
  // regenerates its impulse response only when the decay or the pre-delay actually
  // moved, and its wet/dry is an equal-power pair of gains. Rebuilding instead — which
  // is what this did on every `input` event — stopped every sounding note, threw away
  // the convolver mid-tail and regenerated up to three quarters of a million samples,
  // per pixel of the drag.
  if (!rebuild && previewFx && previewFx.signature === signature) {
    for (const [name] of active) setPreviewEffect(name, next[name].params || {}, bpm);
    return;
  }

  Audio.setPreviewOutput(null);
  disposePreviewFx();
  if (!active.length) return;
  const input = Audio.ctx.createGain();
  let tail = input;
  const effects = [];
  const byName = {};
  for (const [name, id] of active) {
    const made = createEffect(id, next[name].params || {}, Audio.ctx, bpm);
    if (!made?.node) continue;
    tail.connect(made.node.input);
    tail = made.node;
    effects.push(made);
    byName[name] = made;
  }
  if (!effects.length) { try { input.disconnect(); } catch {} return; }
  tail.connect(Audio.musicBus);
  previewFx = { input, effects, byName, signature };
  Audio.setPreviewOutput({ input });
}

function ensurePreviewAudio() {
  const hadContext = !!Audio.ctx;
  // No rewind here either, so no rewind recorder — the same tap the desk turns off in
  // mixer-entry.js, for the same reason. `captureEnabled` defaults to true and only a
  // caller that knows it does not need it says otherwise, so a window that stayed quiet
  // got a ScriptProcessorNode on its master output: a main-thread callback every 2048
  // samples, feeding a ring buffer nothing in this playground reads. Main-thread work in
  // the audio path is what turns a busy moment into a crackle, and a synth you are
  // playing live is the last place to spend it.
  //
  // Inside the function rather than at the top of the module because this is the only
  // door to `ensure()` and the tap is built behind it. Free to repeat: setCaptureEnabled
  // returns at once when the value is unchanged, and tears an existing tap down when it
  // is not — so a context built before this line is also covered.
  Audio.setCaptureEnabled(false);
  Audio.ensure();
  // The standalone playground always has a speaker-safety ceiling. With that limiter
  // in the final output path, rewriting voice.level after every edit only creates the
  // distracting loud/quiet pumping the editor is meant to help avoid.
  if (Audio.mixer && !Audio.mixer.limiterOn) Audio.mixer.setLimiter(true);
  // A keyboard gesture may be the first thing that creates Audio. Build a pending
  // effects chain once for that new context, but never rebuild it for every keydown —
  // doing so would cut a reverb/delay tail on a held chord.
  if (Audio.ctx && !hadContext) {
    // A fresh context owns none of the nodes the old chain was built from, so this one
    // genuinely has to be rebuilt rather than re-set.
    if (previewFxState) applyPreviewEffects(previewFxState, { rebuild: true });
    masterMeter.applyStored();
  }
  return !!Audio.ctx;
}

function eligible(id) {
  return offeredByEngine('MRDR-3').some((voice) => voice.id === id) ? id : DEFAULT_PRESET;
}

function patchSource(patch, baseId = DEFAULT_PRESET) {
  if (!patch) return null;
  const id = `__mrdr3_link_${Date.now().toString(36)}`;
  const base = VOICES[eligible(baseId)] || VOICES[DEFAULT_PRESET];
  VOICES[id] = {
    ...JSON.parse(JSON.stringify(patch)), id, kind: 'tone', user: true,
    // Measurements are intentionally omitted from the share payload. Seed the fresh
    // session copy with the selected base preset's measured loudness until the editor's
    // own estimate can refine it; a placeholder level of 1 makes a normal MRDR-3 voice
    // roughly 30–40 dB too quiet and makes a valid shared link sound dead.
    level: base?.level ?? 1, peak: base?.peak ?? 1,
    label: patch.label || base?.label || 'Shared MRDR-3 patch',
    category: patch.category || base?.category || 'Synth',
  };
  return id;
}

/**
 * Share payloads intentionally omit catalogue measurements. Recreate their relative
 * loudness from the actual editable sound before opening it: the base preset's stored
 * level is only a valid answer when none of its envelopes, gains or filters changed.
 */
async function normalizeSharedMeasurements(sourceId, baseId) {
  const patchVoice = VOICES[sourceId];
  const base = VOICES[eligible(baseId)] || VOICES[DEFAULT_PRESET];
  if (!patchVoice || !base || !base.level || !base.peak) return;
  try {
    const sampleRate = Audio.ctx?.sampleRate || 44100;
    const noise = Audio.noiseBuf;
    const baseRaw = await measureRaw(base.id, noise, sampleRate);
    const patchRaw = await measureRaw(sourceId, noise, sampleRate);
    if (baseRaw?.level > 0 && patchRaw?.level > 0) {
      patchVoice.level = base.level * (patchRaw.level / baseRaw.level);
    }
    if (baseRaw?.peak > 0 && patchRaw?.peak > 0) {
      patchVoice.peak = base.peak * (patchRaw.peak / baseRaw.peak);
    }
  } catch {
    // The base measurements remain a safe fallback if OfflineAudioContext is unavailable.
  }
}

let voiceEditor;
function removeSession() {
  const old = voiceEditor?.editing;
  voiceEditor?.forget();
  if (old && VOICES[old]?.draft) delete VOICES[old];
}

async function loadPreset(id, patch = null) {
  const serial = ++loadSerial;
  const sourceId = patchSource(patch, id) || eligible(id);
  basePresetId = eligible(id);
  // A patch swap under a running figure is a hard boundary — the old sound's queued
  // notes have to go before the new one's arrive — but stopping is not what was ASKED
  // for: comparing two presets means hearing the second one play. So the figure stops,
  // the patch changes, and it starts again on the new sound.
  //
  // The intent is kept out here rather than in a local, because a shared-link load
  // awaits a measurement in the middle: a second load starting inside that window would
  // find an already-stopped player, read "was not playing", and lose the figure for good.
  resumeAuto = resumeAuto || !!patternPlayer?.running();
  patternPlayer?.stop();
  performancePanel?.setPlaying(false);
  if (patch) {
    $('mrdr3status').textContent = 'MEASURING SHARED PATCH…';
    await normalizeSharedMeasurements(sourceId, basePresetId);
    // Only now is this load still the current one. Tearing the session down before the
    // measurement would leave the editor blank for the length of it, and would leave a
    // superseded load having destroyed a session it is about to walk away from.
    if (serial !== loadSerial) {
      delete VOICES[sourceId];
      return;
    }
  }
  removeSession();
  const opened = voiceEditor.open(sourceId, { isNew: true });
  if (!opened) {
    toast('That MRDR-3 preset could not be opened');
    // Nothing opened, so there is nothing to play: the figure stays stopped rather than
    // starting on whatever the editor was left pointing at.
    resumeAuto = false;
    // The shared link's temporary source is this function's own, so it goes on the
    // failure path too — nothing else will ever collect it, since it carries no
    // `draft` marker for the editor's sweep to find.
    if (patch) delete VOICES[sourceId];
    return;
  }
  if (patch) delete VOICES[sourceId];
  // `open(..., { isNew: true })` creates the live session draft. A shared link's
  // temporary source is removed above, so autoplay must follow the draft rather than
  // retaining an id that no longer exists in VOICES.
  patternPlayer?.setVoice(opened);
  voiceEditor.openFull();
  $('mrdr3status').textContent = patch ? 'SHARED PATCH · SESSION ONLY' : 'SESSION ONLY';
  if (resumeAuto) {
    resumeAuto = false;
    // Audio existed a moment ago — the figure was playing — but a load can be the first
    // thing that happens in a session, and asking is cheaper than a silent AUTO PLAY.
    if (ensurePreviewAudio()) {
      patternPlayer.start(opened);
      performancePanel.setPlaying(true);
    }
  }
}

performancePanel = createPerformancePanel({
  onBpm: () => applyPreviewEffects(previewFxState || {}),
  onRoot: () => patternPlayer?.silence?.(),
  onPattern: (id) => {
    // A figure change is a hard audition boundary: clear old queued notes while the
    // scheduler keeps running, so AUTO PLAY continues with the new phrase.
    patternPlayer?.silence?.();
    patternPlayer?.setPattern(id);
  },
  onRate: (id) => { patternPlayer?.silence?.(); patternPlayer?.setRate(id); },
  onGate: (percent) => patternPlayer?.setGate(percent),
  onAutoPlay: (on) => {
    if (!patternPlayer) return;
    if (!on) { patternPlayer.stop(); return; }
    if (!ensurePreviewAudio()) {
      performancePanel.setPlaying(false);
      toast('Audio is unavailable in this browser');
      return;
    }
    patternPlayer.setVoice(voiceEditor?.editing);
    patternPlayer.start(voiceEditor?.editing);
  },
  onEffects: (effects) => {
    if (!ensurePreviewAudio()) return;
    applyPreviewEffects(effects);
  },
  toast,
});

patternPlayer = createPatternPlayer({
  Audio,
  bpm: () => performancePanel.state().bpm,
  root: () => 440 * 2 ** ((performancePanel.state().rootMidi - 69) / 12),
  // Keep the standalone RATE exactly as selected. The Song Mixer bench may nudge very
  // slow progressions to a whole-bar rate, but that hidden change is confusing here.
  adjustSlowRate: false,
});
patternPlayer.setPattern(performancePanel.state().pattern);
patternPlayer.setRate(performancePanel.state().rate);
patternPlayer.setGate(performancePanel.state().gate);

async function copyShareLink({ voice }) {
  if (!voice) return;
  try {
    const payload = encodePatch(voice);
    const url = `${location.origin}${location.pathname}?preset=${encodeURIComponent(basePresetId)}#patch=${payload}`;
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
    else {
      const input = document.createElement('textarea');
      input.value = url; input.style.position = 'fixed'; input.style.opacity = '0';
      document.body.append(input); input.select(); document.execCommand('copy'); input.remove();
    }
    toast('MRDR-3 patch link copied');
  } catch (error) {
    toast(`Could not copy link: ${error.message || error}`);
  }
}

voiceEditor = createVoiceEditor({
  el: $('voiceedit'),
  knob: createKnob,
  toast,
  ask,
  isDevUser: () => false,
  canFile: () => false,
  onChanged: () => {},
  onBlank: () => {},
  assign: () => {},
  onEdit: () => {},
  onDirty: () => {},
  refresh: (id) => Audio.refreshVoice(id),
  // Standalone audition stays at the authored/session gain. The safety limiter is
  // permanent, so live re-measuring would only make parameter edits pump in level.
  liveCompensation: false,
  noiseBuf: () => Audio.noiseBuf,
  sampleRate: () => Audio.ctx?.sampleRate || 44100,
  // Layer solo lives on the engine rather than on the panel, exactly as it does on the
  // desk: the panel forgets everything when it closes, and a solo that outlived it
  // would be a stack playing with a layer missing and nothing on screen saying so.
  // A null id clears the lot.
  setLayerSolo: (id, key, on) => {
    if (!id) Audio.clearLayerSolo();
    else Audio.setLayerSolo(id, key, on);
  },
  listPresets: () => offeredByEngine('MRDR-3'),
  selectPreset: (id) => loadPreset(id),
  sharePreset: copyShareLink,
  midiAdapter: midi,
  auditionNote: (midiNote) => {
    if (!ensurePreviewAudio()) return;
    const id = voiceEditor.editing;
    if (!id || !Audio.ctx) return;
    benchPlay(Audio, id, 440 * 2 ** ((midiNote - 69) / 12));
  },
  releaseAudition: ({ midi: midiNote }) => {
    const id = voiceEditor.editing;
    const voice = id && VOICES[id];
    if (voice && Audio.ctx) Audio.releasePreviewNote(benchLane(voice), 440 * 2 ** ((midiNote - 69) / 12));
  },
  // Optional filter/VCA switches rebuild the native graph on the next note. Drop
  // already-scheduled audition nodes so that next note is an immediate, clear A/B of
  // the bypassed section while the auto-play timer itself keeps running.
  onSectionChange: () => {
    // A topology change is an audition boundary too: clear both the currently
    // sounding preview nodes and the bench scheduler's last-note mark, so the next
    // hit is built from the bypassed graph rather than waiting behind the old one.
    patternPlayer?.silence?.();
    Audio.stopPreview?.();
    // Reverb and delay are deliberately outside the voice graph. Rebuild their small
    // preview-only chain at the same boundary so a filtered note already in an effect
    // tail cannot make an OFF filter sound as though it is still active.
    if (previewFxState && Audio.ctx) applyPreviewEffects(previewFxState, { rebuild: true });
  },
  panicAudition: () => { patternPlayer?.stop(); performancePanel?.setPlaying(false); Audio.voices?.stopPreview?.(); Audio.panic(); },
  midiState: () => midi.state(),
  toggleMidi: (on) => midi.setEnabled(on),
  createFull: ({ kit }) => createSynthFull({
    kit, el: $('synthfull'), backdrop: $('synthfullback'),
    // Seven visible octaves use the full panel width; the narrower percentage keys
    // still retain the shared pointer/computer/MIDI behavior. The whole board is on
    // screen, so C2 is where it sits rather than where it starts.
    keyboard: { octaves: 7, initialOctave: 2 },
    performance: performancePanel,
    headExtra: () => masterMeter.root,
  }),
});

const params = new URLSearchParams(location.search);
const requested = eligible(params.get('preset') || DEFAULT_PRESET);
const patch = decodePatch(location.hash.startsWith('#patch=') ? location.hash.slice(7) : '');
if (params.get('preset') && params.get('preset') !== requested) toast('Unknown preset — opened BEST Choir Aah');
if (location.hash && !patch && location.hash.startsWith('#patch=')) toast('Invalid patch link — opened the base preset');
loadPreset(requested, patch);

window.addEventListener('beforeunload', (event) => {
  if (voiceEditor?.dirty) {
    event.preventDefault();
    // Browsers intentionally replace custom text with their own safety wording, but
    // setting returnValue is still required to request the native reload confirmation.
    event.returnValue = '';
  }
  midi.setEnabled(false).catch(() => {});
});
