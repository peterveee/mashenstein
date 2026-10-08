// 8-BIT RESULTS — the level's song goes 8-bit while the results are up. 8 Oct 2026.
//
// Peter, 8 Oct 2026: "possibly we switch over to the 8 bit sounds when we finish a level while
// showing the results page". Field Service opens as an 8-bit arcade world that powers down into
// paper as the hero jumps into the cabinet (src/engine/arcadeIntro.js); this is the way back out.
// The results screen keeps the level's song playing on purpose (run.js exit), so on the next beat
// every part goes onto the 8-Bit Sound Set, the way B-33P's 8-BIT moves the club's band
// (banger/club-voices.js), through Audio.reapplyBank: only the lanes whose sound changed are
// rebuilt, and a note already sounding rings out on the old one. The screen comes up ON that beat
// (resultsOnTheBeat): the run holds its last frame until the first 8-bit note is heard. No chip
// gate on the way in (Peter, 8 Oct 2026: "it is too much to change the palette and stutter") —
// the change of sound is the whole event. Leaving the screen puts the song's own sounds back if it
// is still the one playing.
//
// THE MIX. Each cabinet's 8-bit mix is a desk alternate, `<id>-8bit` (Peter, 8 Oct 2026: "save
// the 8bit mixes as a set of alternates so I can tweak those levels") — made with every lane on
// the set and every fader where tools/chip-results-levels.js measured the 8-bit part should sit
// against the one it replaces, then mixed by ear. The game ships how each differs from its level
// (results-chip-mixes.js, exported by tools/lib/chip-results-mixes.js) and lays that over the
// level's mix on the beat, the way a cabinet treatment arrives (MusicDirector._fire): sounds
// through reapplyBank, strips through rampMix. A song with no alternate (a game alternate, an
// imported song) has its lanes switched by chipVoices, unlevelled.
//
// A cabinet song is not a banger and does not say which lane plays which part, so each lane's
// job is read off the lane and the sound on it (chipRole). Left alone: the robot voice (JMJR-4 —
// its words are the point), and risers and sweeps (a crash hit on every note of a riser is not
// 8-bit, it is broken). An engine lane the 8-Bit set has no part for keeps its own voice — those
// are the game's original arcade sounds already.
//
// On for every results screen — stage, boss and overtime, every cabinet (Peter, 8 Oct 2026:
// "turn on the 8 bit effect for real on every cabinet"). Dev menu ▸ RUN ▸ 8-BIT RESULTS turns it
// off in one browser, to hear the screen the old way.
import { Audio } from '../engine/audio.js';
import { TRANSITION_CLOSE_S } from '../engine/states.js';
import { trackIdOf } from '../data/tracks.js';
import { CHIP_RESULT_MIXES } from './results-chip-mixes.js';
import { laneList } from '../engine/lanes.js';
import { VOICES, voiceOf, baseLane, PERCUSSION_LANES } from '../data/voices.js';
import { BANGER_SOUNDS } from '../../tools/lib/banger/sounds.js';
import { CHIP_SET, guessRole, roleVoice, mixWithVoices } from './banger/club-voices.js';

const KEY = 'mash-dev-chip-results';
/** On, unless the dev menu has turned it off in this browser. */
export const chipResults = {
  get on() { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } },
  set on(v) { try { if (v) localStorage.removeItem(KEY); else localStorage.setItem(KEY, '0'); } catch { /* not remembered */ } },
};

// On a layer, a sound's category says more about its job than the lane's name does: Field
// Service's harp sits on a chords layer, its flutes and choir on lead layers. The tune itself
// (the `lead` lane) is always the square, and the bass lanes stay bass, whatever plays them.
const KEEP_CATEGORIES = new Set(['FX', 'Sweep']);
const ROLE_BY_CATEGORY = Object.freeze({
  Pad: 'pad', Orch: 'pad', Keys: 'piano', Organ: 'piano', Bells: 'bell', Pluck: 'bell', Bass: 'bass',
});

/** The 8-Bit set's part for `lane`, playing `voice` (null: an engine voice). Null: leave it be. */
export function chipRole(lane, voice) {
  if (voice?.synth === 'JMJR-4' || KEEP_CATEGORIES.has(voice?.category)) return null;
  const base = baseLane(lane);
  const fixed = lane === 'lead' || base === 'bass' || PERCUSSION_LANES.includes(base) || voice?.kind === 'drum';
  if (!fixed && ROLE_BY_CATEGORY[voice?.category]) return ROLE_BY_CATEGORY[voice.category];
  return guessRole(lane, null, null);
}

const sixteenth = () => 60 / ((Audio.bpm || 120) * (Audio.tempo || 1)) / 4;
const heardNow = () => Audio.ctx.currentTime - Audio.heardLatencySec();

/** Every lane of the live song that changes, lane → the 8-Bit set's preset. */
export function chipVoices(bank = Audio.bank) {
  const row = BANGER_SOUNDS[CHIP_SET];
  const voices = new Map();
  if (!bank || !row) return voices;
  for (const { key: lane } of laneList(bank)) {
    const now = voiceOf(bank, lane);
    if (now?.kind === 'engine' && !guessRole(lane, null, null)) continue;
    const id = roleVoice(row, 'style', chipRole(lane, now?.kind === 'engine' ? null : now), lane);
    if (id && VOICES[id] && id !== now?.id) voices.set(lane, id);
  }
  return voices;
}

// ---- a mix as a patch on another --------------------------------------------------
// Keys sorted, so two mixes that say the same thing compare the same whatever order wrote them.
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
const same = (a, b) => canon(a ?? null) === canon(b ?? null);
// An empty block and no block say the same thing (the desk's file writer drops the empty one).
const empty = (x) => x == null || (typeof x === 'object' && !Array.isArray(x) && !Object.keys(x).length);
const BY_ENTRY = new Set(['voice', 'voiceParams']);

/**
 * How mix `alt` differs from mix `base`: lanes field by field, the voice block and the song's own
 * presets entry by entry, anything else whole. Null marks what `alt` does not have.
 */
export function mixPatch(base, alt) {
  const patch = {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(alt || {})]);
  for (const k of keys) {
    const b = base?.[k]; const a = alt?.[k];
    if (same(b, a) || (empty(b) && empty(a))) continue;
    if (k === 'lanes' || BY_ENTRY.has(k)) {
      const out = {};
      for (const e of new Set([...Object.keys(b || {}), ...Object.keys(a || {})])) {
        if (same(b?.[e], a?.[e])) continue;
        if (k !== 'lanes' || !a?.[e] || !b?.[e]) { out[e] = a?.[e] ?? null; continue; }
        const fields = {};
        for (const f of new Set([...Object.keys(b[e]), ...Object.keys(a[e])])) {
          if (!same(b[e][f], a[e][f])) fields[f] = a[e][f] ?? null;
        }
        out[e] = fields;
      }
      patch[k] = out;
    } else patch[k] = a ?? null;
  }
  return patch;
}

/** `base` with `patch` (mixPatch) laid over it — a whole mix, as rampMix wants one. */
export function patchMix(base, patch) {
  if (!patch) return base;
  const out = { ...(base || {}) };
  const drop = (o) => { for (const k of Object.keys(o)) if (o[k] === null) delete o[k]; return o; };
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'lanes') {
      out.lanes = { ...(base?.lanes || {}) };
      for (const [lane, fields] of Object.entries(v || {})) {
        if (fields === null) { delete out.lanes[lane]; continue; }
        out.lanes[lane] = drop({ ...(out.lanes[lane] || {}), ...fields });
      }
    } else if (BY_ENTRY.has(k)) {
      out[k] = drop({ ...(base?.[k] || {}), ...(v || {}) });
    } else if (v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

// The strips move over this long from the beat rather than stepping on it: a fader or a send
// that jumps under a held note clicks.
const HANDOVER_RAMP_S = 0.025;

/**
 * Hand the song that is playing over to `mix` at `at`, as a cabinet treatment arrives
 * (MusicDirector._fire): the sounds through reapplyBank, the strips through rampMix — and where
 * the two mixes disagree on the shape of an effect chain, which rampMix refuses, the chains
 * rebuilt by applyMix, which leaves the clock alone but cuts every tail. The 8-bit alternates
 * keep their chains' shape and settings (a reverb insert is muted, not removed) so it is not
 * needed — unless a mix on the desk changes one.
 */
export function handOver(bank, mix, at) {
  Audio.reapplyBank(bank, mix);
  try { Audio.rampMix(mix, at, HANDOVER_RAMP_S); } catch {
    try { Audio.bank = Audio.applyMix(bank, mix); } catch { /* the sounds changed; the strips stay */ }
  }
}

// ---- THE SOUNDTRACK setting: every song in its 8-bit version ----------------------
//
// Peter, 8 Oct 2026: "Build the settings" — SETTINGS ▸ SOUNDTRACK: ORIGINAL / 8-BIT, and the
// jukebox's 8-BIT is the same switch. With 8-BIT on, every song the game plays that has an
// 8-bit alternate (the cabinets and the theme songs — tools/lib/chip-results-mixes.js) plays
// it, everywhere: the engine runs every mix it is handed through a filter (Audio.setMixFilter)
// that lays the song's 8-bit mix over it. Lighter to play, too — the 8-Bit set's synths and no
// reverb cost a phone a quarter to two-fifths less audio load (8 Oct 2026). The results
// screens then have nothing to switch, and come straight up.
let soundtrackSave = null;
/** Whether the SOUNDTRACK setting is 8-BIT. */
export const soundtrack8bit = () => soundtrackSave?.settings?.soundtrack === '8bit';
/** Whether song `bank` plays its 8-bit version: the setting is on and the song has one. */
export const playsEightBit = (bank) => soundtrack8bit() && !!(bank && CHIP_RESULT_MIXES[trackIdOf(bank)]);
/** `entry`, song `bank`'s mix, with the song's 8-bit alternate laid over it — or as it is. */
export function eightBitOf(bank, entry) {
  const patch = bank ? CHIP_RESULT_MIXES[trackIdOf(bank)] : null;
  return patch ? patchMix(entry, patch) : entry;
}
/** Boot: the setting read off `save` from now on, through the engine's mix filter. */
export function installSoundtrack(save) {
  soundtrackSave = save;
  Audio.setMixFilter((bank, entry) => (soundtrack8bit() ? eightBitOf(bank, entry) : entry));
}
/** Change the setting; a song playing goes over to the other soundtrack on its next beat. */
export function setSoundtrack8bit(on) {
  if (!soundtrackSave?.settings || soundtrack8bit() === !!on) return;
  soundtrackSave.settings.soundtrack = on ? '8bit' : 'original';
  try { soundtrackSave.persist?.(); } catch { /* kept for this session */ }
  retuneOnTheBeat();
}
/**
 * The song playing, sent through the filter again on its next beat — its own mix as it was
 * handed in (Audio.mixSource), so the filter decides afresh which soundtrack it is.
 */
export function retuneOnTheBeat() {
  const bank = Audio.sourceBank;
  if (!bank || !Audio.bank || !Audio.ctx) return;
  const mix = Audio.mixSource;
  const giveUp = performance.now() + 3000;
  const poll = () => {
    if (Audio.sourceBank !== bank || !Audio.bank) return;
    if (Number.isFinite(Audio.nextTime) && Audio.step % 4 === 0) {
      try { handOver(bank, mix, Audio.nextTime); } catch { /* plays on as it was */ }
      return;
    }
    if (performance.now() < giveUp) requestAnimationFrame(poll);
    else { try { handOver(bank, mix, Audio.ctx.currentTime); } catch { /* as it was */ } }
  };
  requestAnimationFrame(poll);
}

/**
 * One results screen's switch: `start()`, then `tick()` every frame, `stop()` on leaving. The swap
 * waits for the frame in which a beat is the next step the sequencer schedules — the Lab's grid
 * for B-33P (club-voices.js) — so the first note on the new sounds is on the beat, at `at`. Given
 * `target` (an audio time), it waits for the beat there rather than the first one it sees.
 */
export class ChipResults {
  constructor() { this.phase = 'off'; }

  start(target = null) {
    this.phase = 'off';
    this.target = target;
    // Already on the 8-bit soundtrack: nothing to switch.
    if (!chipResults.on || soundtrack8bit() || !Audio.ctx || !Audio.bank || !Audio.sourceBank) return;
    this.bank = Audio.sourceBank;
    // The cabinet's 8-bit alternate, as exported; any other song, its lanes onto the set.
    this.patch = CHIP_RESULT_MIXES[trackIdOf(this.bank)] || null;
    this.voices = this.patch
      ? new Map(Object.entries(this.patch.voice || {}).filter(([, v]) => v).map(([vk, v]) => [vk.replace(/Voice$/, ''), v]))
      : chipVoices();
    if (!this.patch && !this.voices.size) return;
    // Worklet instruments build their node ahead of their first note — here, before the beat.
    const rack = Audio.voices;
    for (const [lane, id] of this.voices) {
      try { rack?.warmWorkletLane?.(VOICES[id], lane)?.catch?.(() => {}); } catch { /* nothing to warm */ }
    }
    this.phase = 'wait';
  }

  tick() {
    if (this.phase !== 'wait') return;
    // The song moved out from under the screen — nothing of it to change.
    if (Audio.sourceBank !== this.bank || !Audio.bank) { this.phase = 'off'; return; }
    if (!Number.isFinite(Audio.nextTime) || Audio.step % 4 !== 0) return;
    if (this.target != null && Audio.nextTime < this.target - sixteenth() / 2) return;
    this.at = Audio.nextTime;
    this.entry = Audio.mixEntry;
    try {
      handOver(this.bank, this.patch ? patchMix(this.entry, this.patch) : mixWithVoices(this.entry, this.voices), this.at);
      this.chipEntry = Audio.mixEntry;
      this.phase = 'chip';
    } catch { this.phase = 'off'; }
  }

  stop() {
    const was = this.phase;
    this.phase = 'off';
    if (was !== 'chip') return;
    // After the next screen has entered: if it changed the song there is nothing to put back,
    // and if the song is still on the 8-bit mix, its own sounds go back on.
    const { bank, entry, chipEntry } = this;
    queueMicrotask(() => {
      if (Audio.sourceBank !== bank || Audio.mixEntry !== chipEntry) return;
      try { handOver(bank, entry, Audio.ctx.currentTime); } catch { /* the next song replaces it anyway */ }
    });
  }
}

/**
 * Bring the results up on the beat the song goes 8-bit (Peter, 8 Oct 2026: "delay the results
 * appearing until we can switch at the same time … they can come in on a beat, not bar, like the
 * lab does"). `show(chip)` makes the results screen (setStateNoCameo) and hands it this switch.
 *
 * The run-to-results hand-off is the shutter (states.js): it closes over the run, the results
 * screen enters behind it, and it opens. So the cut is the moment it is shut, and that is what
 * lands on the beat: the first beat at least a shutter's close away is picked, the shutter is
 * started that long before it is HEARD (the latency counted), and the switch is scheduled on it —
 * the old sound plays under the closing shutter and the results open on the 8-bit one. The run
 * holds its last frame for under a beat, after the finish pad's own wait, or on a fail or an EXIT,
 * which have none. A win (`bar`) waits for the next bar line instead. With the option off, or
 * nothing in the song to switch, it is called at once.
 */
export function resultsOnTheBeat(show, { bar = false } = {}) {
  const chip = new ChipResults();
  chip.start();
  if (chip.phase !== 'wait' || !Number.isFinite(Audio.nextTime)) { show(chip); return; }
  const s16 = sixteenth();
  // A win waits for a new bar (Peter, 8 Oct 2026: "when we reach the finish line I am happy to
  // wait a little extra time so the results starts on a new bar"); a fail or an EXIT, the beat.
  const grid = bar ? 16 : 4;
  let t = Audio.nextTime + ((grid - (Audio.step % grid)) % grid) * s16;
  // a frame's grace, so the shutter is never started late for its beat
  while (t - TRANSITION_CLOSE_S < heardNow() + 0.02) t += grid * s16;
  chip.target = t;
  // Never held for long: a song that is not moving (a suspended context) gets its screen anyway,
  // and the switch is made on the next beat it does play.
  const giveUp = performance.now() + 1000 * (t - heardNow() + 0.5);
  let shown = false;
  const poll = () => {
    chip.tick();
    if (!shown && (heardNow() >= t - TRANSITION_CLOSE_S || chip.phase === 'off' || performance.now() > giveUp)) {
      shown = true;
      show(chip);
    }
    // Nothing updates a screen while the shutter is moving, so the switch is ticked here until
    // made — and it is often made first: the sequencer schedules further ahead than the shutter.
    if ((!shown || chip.phase === 'wait') && performance.now() < giveUp + 2000) requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}
