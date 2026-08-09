// Arcade Corner changes the Food Court's instrument bank without changing its clock.
import { installDom } from './dom-stub.js';
installDom();

const { Audio } = await import('../src/engine/audio.js');
const { MusicDirector } = await import('../src/engine/music-director.js');
const { defaultSlot } = await import('../src/engine/save.js');
const { HUB_THEME } = await import('../src/data/cabinets.js');
const { mix: HUB_MIX, arrangement: HUB_ARRANGEMENT } = await import('../src/data/songs/hub.js');
const ARCADE_THEME_SONG = await import('../src/data/imported/arcade-theme.js');
const { ArcadeState } = await import('../src/game/hub/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const save = { slot: defaultSlot(), persist() {} };
let entered = null;
let requested = null;
const oldPlayPresentation = MusicDirector.playPresentation;
const oldRequest = MusicDirector.request;
const oldSourceBank = Audio.sourceBank;
const oldBank = Audio.bank;
const oldCtx = Audio.ctx;
const oldMixer = Audio.mixer;
MusicDirector.playPresentation = (...args) => { entered = args; };
MusicDirector.request = (...args) => { requested = args; };
Audio.sourceBank = HUB_THEME;
Audio.bank = { bpm: 90 };
const treatmentCalls = [];
Audio.ctx = { currentTime: 1, startRendering() {} };
Audio.mixer = {
  setTreatment(list, bpm) { treatmentCalls.push({ type: 'set', list, bpm }); },
  rampTreatment(wet, when, seconds) { treatmentCalls.push({ type: 'ramp', wet, when, seconds }); },
  clearTreatment() { treatmentCalls.push({ type: 'clear' }); },
};

const arcade = new ArcadeState({
  save,
  flow: { gameSongFor: () => ({ bank: HUB_THEME, arrangement: HUB_ARRANGEMENT }), toHub() {} },
});
arcade.enter();
const variant = entered?.[3]?.variants?.arcade?.[0];
assert(entered?.[0] === HUB_THEME && entered?.[1] === 'arcade',
  'Arcade Corner requests the Food Court presentation variant');
assert(variant?.patch?.voice?.bassVoice && variant.patch.voice.chordsVoice
  && variant.patch.voice.kickVoice && variant.patch.voiceParams?.chordsVoice?.mode === 'mono'
  && Object.values(variant.patch.voiceParams).every((voice) =>
    !Object.prototype.hasOwnProperty.call(voice, 'fixedLength')),
  'the arcade variant uses mono chip voices without forcibly chopping note lengths');
assert(variant.patch.voiceParams.leadVoice.trim === 0
  && variant.patch.voiceParams.leadVoice.options.oscillator.type === 'triangle'
  && variant.patch.voiceParams.bassVoice.transpose === 12
  && variant.patch.voiceParams.bassVoice.trim === -6
  && variant.patch.voiceParams.leadVoice.transpose === 12
  && !variant.patch.voiceParams.leadHarmVoice.transpose
  && variant.patch.voiceParams.leadVoice.dur === 0.5
  && variant.patch.voiceParams.leadVoice.options.envelope.attack >= 0.006
  && variant.patch.voiceParams.leadVoice.options.envelope.decay >= 0.065
  && variant.patch.voiceParams.leadVoice.options.envelope.release >= 0.024
  && variant.patch.master === -3,
  'the arcade chip voices have longer tails and a slightly lower master level');
const arcadeArrangement = entered?.[3]?.arrangementOverride;
const firstBassClone = (arcadeArrangement?.sections?.length || 0) - (HUB_THEME.sections?.length || 0);
const arcadeBass = arcadeArrangement?.sections?.[firstBassClone]?.bass;
assert(arcadeBass?.[0] === HUB_THEME.bass?.[0]
  && arcadeBass?.[2] === HUB_THEME.bass?.[0] * 2
  && arcadeBass?.[4] === HUB_THEME.bass?.[4]
  && arcadeBass?.[6] === HUB_THEME.bass?.[4] * 2,
  'the Arcade bass alternates each authored note with an octave-up eighth-note');
assert(requested?.[0] === 'arcade'
  && requested?.[1]?.quantize === 'immediate'
  && requested[1].crossfadeBars === 0,
  'entering Arcade commits the new sound during the covered screen transition');
assert(variant.patch.fx?.reverb?.level === 0
  && Object.values(variant.patch.lanes || {}).every((lane) => lane.send?.reverb === 0)
  && variant.patch.lanes.bass?.send?.delay === 0
  && variant.patch.lanes.lead?.gain === 6
  && variant.patch.lanes.chords.effects?.[1]?.id === 'reverb'
  && variant.patch.lanes.chords.effects[1].params.wet === 0,
  'the arcade presentation removes all Food Court reverb sends and wet return');
const arcadeTreatment = treatmentCalls.find((call) => call.type === 'set');
assert(variant.exit?.quantize === 'immediate'
  && arcadeTreatment?.list?.length === 1
  && arcadeTreatment.list[0].id === 'filter'
  && arcadeTreatment.list[0].params.type === 'highpass'
  && arcadeTreatment.list[0].params.frequency === 420,
  'Arcade Corner uses a tinny-speaker whole-mix high-pass treatment');
const arcadeDrumKeys = ['kickVoice', 'snareVoice', 'clapVoice', 'hatsVoice', 'ohatsVoice',
  'rimVoice', 'tomVoice', 'crashVoice'];
const arcadeToneDrumKeys = arcadeDrumKeys.filter((key) => key !== 'snareVoice');
assert(arcadeToneDrumKeys.every((key) => {
  const voice = variant.patch.voiceParams[key];
  return voice?.kind === 'tone' && voice.synth === 'Synth'
    && voice.mode === 'mono' && voice.monoGroup === 'arcadeDrums'
    && ['square', 'sawtooth', 'triangle'].includes(voice.options?.oscillator?.type);
}), 'the arcade non-snare drums are simple one-channel square/saw/triangle voices');
assert(variant.patch.voiceParams.snareVoice?.kind === 'noise'
  && variant.patch.voiceParams.snareVoice.monoGroup === 'arcadeDrums'
  && variant.patch.voiceParams.snareVoice.noise?.type === 'bandpass'
  && variant.patch.voiceParams.snareVoice.trim === 3
  && variant.patch.voiceParams.snareVoice.noise.decay >= 0.075,
  'the Arcade backbeat uses a short band-passed noise snare');
const kickOnBeats = [0, 4, 8, 12, 16, 20, 24, 28];
const snareOnBackbeat = [4, 12, 20, 28];
assert(kickOnBeats.every((step) => HUB_THEME.kick?.[step] === true)
  && snareOnBackbeat.every((step) => HUB_THEME.snare?.[step] === true),
  'the Food Court drum pattern is kick-snare-kick-snare from the opening bars');

arcade.exit();
assert(requested?.[0] === null && requested?.[1]?.quantize === 'immediate'
  && requested[1].crossfadeBars === 0,
  'leaving Arcade Corner restores the regular Food Court palette immediately');

entered = null;
requested = null;
const savedArcade = new ArcadeState({
  save,
  flow: { gameSongFor: () => null, toHub() {} },
});
savedArcade.enter();
assert(savedArcade.usesSavedArcadeMix
  && entered?.[0] === HUB_THEME
  && entered?.[1] === null
  && entered?.[3]?.mixOverride === ARCADE_THEME_SONG.mix
  && entered?.[3]?.arrangementOverride === ARCADE_THEME_SONG.arrangement,
  'the default Arcade Corner plays the saved Song Mixer alternate directly');
assert(requested?.[0] === null
  && requested?.[1]?.quantize === 'immediate'
  && requested[1].crossfadeBars === 0,
  'the saved Arcade Theme lands immediately during entry');
savedArcade.exit();
assert(entered?.[0] === HUB_THEME
  && entered?.[3]?.mixOverride === HUB_MIX
  && entered?.[3]?.arrangementOverride === HUB_ARRANGEMENT,
  'leaving the saved Arcade Theme restores the normal Food Court mix');

MusicDirector.playPresentation = oldPlayPresentation;
MusicDirector.request = oldRequest;
Audio.sourceBank = oldSourceBank;
Audio.bank = oldBank;
Audio.ctx = oldCtx;
Audio.mixer = oldMixer;
console.log(failed ? 'ARCADE MUSIC: FAILED' : 'ARCADE MUSIC: PASSED');
process.exit(failed ? 1 : 0);
