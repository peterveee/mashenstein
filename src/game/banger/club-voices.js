// THE CLUB'S SOUND SWAPS — B-33P's 8-BIT and the mixer's sound buttons. 5 Oct 2026.
//
// The same song on other instruments, live: every note stays where it is and only the
// presets change, through Audio.reapplyBank — the desk's own way of changing a sound while
// a song plays (only the lanes whose voice changed are rebuilt, and a note already sounding
// rings out on the old one). Each change waits for the grid and lands ON it — B-33P's swap on
// the next beat (Peter, 7 Oct 2026: a bar was too long to wait for a tap), a sound button's on
// the next bar line: it is made in the frame where the sequencer's next step to schedule is a
// beat (`Audio.step % 4 === 0`) or a downbeat (`% 16`), so that is the first note on the new sound.
//
//   B-33P   8-BIT: every part at once onto the 8-Bit Sound Set (tools/lib/banger/sounds.js,
//           'chipstep-8bit'), drums and all, and back at a second tap. A take that is
//           ALREADY on the 8-Bit set goes the other way, onto the Light set ('chipstep-lite').
//   MIXER   a sound button under each fader steps that part through the take's own table:
//           DRUMS through its six kits, BASS, CHORDS and LEAD through its Riff Sound lists.
//           With 8-BIT on, the buttons step through the 8-Bit set's instead.
//
// Nothing is kept: leaving the floor puts the song's own sounds back (release).
import { BANGER_SOUNDS } from '../../../tools/lib/banger/sounds.js';
import { KITS, soundsRow } from '../../../tools/lib/banger/sound-rules.js';
import { withoutStyleSuffix } from '../../../tools/lib/banger/styles/index.js';
import { CREATIVE_DRUM_KITS } from '../../data/creative-drum-kits.js';
import { VOICES, baseLane, PERCUSSION_LANES } from '../../data/voices.js';
import { Audio } from '../../engine/audio.js';

export const CHIP_SET = 'chipstep-8bit';
export const HIFI_SET = 'chipstep-lite';
const CREATIVE_KIT_KEYS = new Set(CREATIVE_DRUM_KITS.map((k) => k.key));
const KIT_ROLES = Object.freeze(['kick', 'snare', 'clap', 'hats', 'ohats', 'crash', 'fill']);
// The game's kits are the six the desk has always had; the desk's creative kits
// (src/data/creative-drum-kits.js) stay off the floor.
const KIT_ORDER = Object.freeze(KITS.map((k) => k.key).filter((k) => !CREATIVE_KIT_KEYS.has(k)));
/** The parts with a sound button, as the mixer lists them, and which Riff Sound list each walks. */
export const SOUND_PARTS = Object.freeze({
  drums: { kit: true },
  bass: { roles: ['bass'], list: 'bass' },
  chords: { roles: ['saws', 'piano', 'pad'], list: 'chords' },
  lead: { roles: ['hook'], list: 'hook' },
});
const PART_IDS = Object.keys(SOUND_PARTS);

/**
 * A preset's name as a button says it: the library's label in capitals, without the desk's
 * markers — the kit `=`, `(starter)`, and the style a seed's sound was kept for (every sound on
 * the floor is the take's own style, so `· BIG-ROOM HOUSE` only made the button longer).
 */
export const voiceLabel = (id) => withoutStyleSuffix(VOICES[id]?.label || id || '')
  .replace(/^=\s*/, '').replace(/\s*\(starter\)/i, '').toUpperCase();
/** A kit's name as a button says it: 909 KIT, CR-78 KIT, STYLE KIT. */
export const kitLabel = (key) => `${String(KITS.find((k) => k.key === key)?.label || key).replace(/ kit$/i, '').toUpperCase()} KIT`;

/**
 * A lane's job, for a song that does not say (the starter is a desk file, with no `laneOf`):
 * the part its sound was chosen for in the style's own table, else what its lane is for.
 */
export function guessRole(lane, voiceId, row) {
  if (voiceId) {
    for (const [role, id] of Object.entries(row?.parts || {})) if (id === voiceId && role !== 'fallbackMelodic') return role;
    for (const kit of Object.values(row?.kits || {})) for (const [role, id] of Object.entries(kit)) if (id === voiceId) return role;
  }
  const base = baseLane(lane);
  if (KIT_ROLES.includes(base)) return base;
  if (base === 'tom') return 'fill';
  if (base === 'rim') return 'shaker';
  if (base === 'bass') return lane === 'bass' ? 'bass' : 'sub';
  if (base === 'chords') return 'saws';
  if (base === 'lead') return lane === 'lead' ? 'hook' : 'counter';
  return null;
}

/** Every lane's job, lane → role: the generator's own answer where the song carries one. */
export function rolesOf(song, row) {
  const roles = new Map();
  for (const [role, lane] of Object.entries(song?.laneOf || {})) if (lane && !roles.has(lane)) roles.set(lane, role);
  for (const lane of song?.mix?.order || []) {
    if (roles.has(lane)) continue;
    const role = guessRole(lane, song.mix?.voice?.[`${lane}Voice`], row);
    if (role) roles.set(lane, role);
  }
  return roles;
}

/** What `role` plays in a row of the sounds table, the drums from kit `kit`. Null: leave it be. */
export function roleVoice(row, kit, role, lane = '') {
  if (!row || !role) return null;
  if (role.startsWith('riff:')) {
    // a riff's own extra part: a drum one by its lane, a tuned one on the row's fallback
    const base = baseLane(lane);
    if (PERCUSSION_LANES.includes(base)) return roleVoice(row, kit, base === 'tom' ? 'fill' : base === 'rim' ? 'shaker' : base, lane);
    return row.parts?.fallbackMelodic ?? null;
  }
  if (KIT_ROLES.includes(role)) return row.kits?.[kit]?.[role] ?? row.kits?.style?.[role] ?? null;
  if (role === 'hook') return row.parts?.square ?? row.parts?.fallbackMelodic ?? null;
  return row.parts?.[role] ?? null;
}

/**
 * A kept song's mix with the sounds it was left with in the club (`sounds`, picksNamed) — what
 * the Lab and the jukebox play it with, so a song keeps its presets wherever it plays (Peter,
 * 5 Oct 2026: "can we also save the presets"). `rec` is its recipe.
 */
export function mixWithKept(song, rec, sounds) {
  if (!sounds) return song?.mix;
  const v = new ClubVoices(song, rec);
  return v.mixFor(v.stateFor(sounds));
}

/** The song's mix with `voices` (lane → preset) put on its lanes. */
export function mixWithVoices(mix, voices) {
  if (!voices.size) return mix;
  const out = { ...mix, voice: { ...(mix?.voice || {}) }, voiceParams: { ...(mix?.voiceParams || {}) } };
  for (const [lane, id] of voices) {
    out.voice[`${lane}Voice`] = id;
    // a song's own one-off preset would win over the swap (withVoices applies it last)
    delete out.voiceParams[`${lane}Voice`];
  }
  return out;
}

const fresh = () => ({ swapped: false, picks: { own: {}, swap: {} } });
const copy = (s) => ({ swapped: s.swapped, picks: { own: { ...s.picks.own }, swap: { ...s.picks.swap } } });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export class ClubVoices {
  /** `song` is what the club plays (make.js makeBanger, or a starter's); `rec` its recipe. */
  constructor(song, rec = null) {
    this.song = song;
    this.style = rec?.style ?? null;
    // A fusion's row (`fusion:…`) is its two styles' put together, made once here.
    this.ownSet = soundsRow(BANGER_SOUNDS, song?.soundsId) ? song.soundsId : this.style;
    this.ownRow = soundsRow(BANGER_SOUNDS, this.ownSet) || null;
    this.eightBit = this.ownSet === CHIP_SET;
    this.swapSet = this.eightBit ? HIFI_SET : CHIP_SET;
    const row = this.ownRow;
    this.roles = rolesOf(song, row);
    this.kit = song?.kit || this.detectKit(row);
    this.state = fresh();      // what plays now
    this.pending = null;       // what plays from the next beat or bar line
    this.pendingAt = null;
  }

  /** The take's kit, read off its kick, for a song that does not say. */
  detectKit(row) {
    const kickLane = [...this.roles].find(([, role]) => role === 'kick')?.[0];
    const kick = kickLane && this.song?.mix?.voice?.[`${kickLane}Voice`];
    return KIT_ORDER.find((k) => kick && row?.kits?.[k]?.kick === kick) || 'style';
  }

  rowFor(swapped) { return swapped ? BANGER_SOUNDS[this.swapSet] || null : this.ownRow; }
  kitIn(row) { return row?.kits?.[this.kit] ? this.kit : 'style'; }

  /** The lane a part's button changes: its first lane with one of the part's jobs. */
  partLane(part) {
    const roles = SOUND_PARTS[part]?.roles || [];
    for (const role of roles) for (const [lane, r] of this.roles) if (r === role) return lane;
    return null;
  }

  /** The sounds a part's button steps through, starting with the one it has now. */
  choices(part, swapped = this.target.swapped) {
    const row = this.rowFor(swapped);
    if (!row) return [];
    if (part === 'drums') {
      const own = this.kitIn(row);
      return [own, ...KIT_ORDER.filter((k) => k !== own && row.kits?.[k])].map((kit) => ({ kit, label: kitLabel(kit) }));
    }
    const lane = this.partLane(part);
    if (!lane) return [];
    const first = swapped ? roleVoice(row, this.kitIn(row), this.roles.get(lane), lane) : this.song?.mix?.voice?.[`${lane}Voice`];
    const list = row.random?.[SOUND_PARTS[part].list] || [];
    return [first, ...list.filter((id) => id !== first)].filter((id) => VOICES[id]).map((id) => ({ id, label: voiceLabel(id) }));
  }

  /** The state that will be playing once anything waiting has landed. */
  get target() { return this.pending || this.state; }
  /** 8-BIT (or, on an 8-Bit take, the Light set) is on, or about to be. */
  get swapped() { return this.target.swapped; }
  /** ...and is on now, as heard (the pixel heroes go with the sound, not the tap). */
  get swappedNow() { return this.state.swapped; }

  /** The name on a part's button: the sound it has, or is about to have. */
  label(part) {
    const s = this.target;
    const list = this.choices(part, s.swapped);
    return list[(s.picks[s.swapped ? 'swap' : 'own'][part] || 0) % Math.max(1, list.length)]?.label || '';
  }

  /** Whether a part's sound (or the whole set) is waiting for its beat or bar line. */
  waiting(part = null) {
    if (!this.pending) return false;
    if (part == null || this.pending.swapped !== this.state.swapped) return true;
    const key = this.pending.swapped ? 'swap' : 'own';
    return (this.pending.picks[key][part] || 0) !== (this.state.picks[key][part] || 0);
  }

  /** B-33P: the whole band onto the other set, or back. True when that is where it is going. */
  toggle() {
    const next = copy(this.target);
    next.swapped = !next.swapped;
    this.queue(next);
    return next.swapped;
  }

  /** A sound button: the part's next sound. False when it has no other. */
  next(part) {
    const next = copy(this.target);
    const n = this.choices(part, next.swapped).length;
    if (n < 2) return false;
    const key = next.swapped ? 'swap' : 'own';
    next.picks[key][part] = ((next.picks[key][part] || 0) + 1) % n;
    if (!next.picks[key][part]) delete next.picks[key][part];
    this.queue(next);
    return true;
  }

  /**
   * The mixer's DICE (Peter, 6 Oct 2026: "randomise all the instrument choices"): every part
   * with a choice onto another of its sounds, at random, from the next bar line — on whichever
   * set the band is on. False when no part has another sound.
   */
  shuffle(random = Math.random) {
    const next = copy(this.target);
    const key = next.swapped ? 'swap' : 'own';
    let moved = false;
    for (const part of PART_IDS) {
      const n = this.choices(part, next.swapped).length;
      if (n < 2) continue;
      const was = next.picks[key][part] || 0;
      const k = (was + 1 + Math.floor(random() * (n - 1))) % n;
      if (k) next.picks[key][part] = k; else delete next.picks[key][part];
      moved = true;
    }
    if (moved) this.queue(next);
    return moved;
  }

  queue(next) {
    this.pending = same(next, this.state) ? null : next;
    this.pendingAt = Audio.ctx ? Audio.ctx.currentTime : 0;
    if (this.pending) this.warm(this.voicesFor(this.pending));
  }

  /**
   * Once a frame: a change waiting for the grid goes in when the next step the sequencer
   * schedules is on it — a beat for the whole set (B-33P), a downbeat for a sound button — or
   * straight away with no song running, or if a long frame stepped over the window. Returns
   * what landed ({ swapped, part, label, parts }) or null.
   */
  update() {
    const p = this.pending;
    if (!p) return null;
    const ctx = Audio.ctx;
    const playing = ctx && Audio.bank && Audio.sourceBank === this.song?.bank && Number.isFinite(Audio.nextTime);
    if (playing) {
      const sixteenth = 60 / ((Audio.bpm || 120) * (Audio.tempo || 1)) / 4;
      const grid = p.swapped !== this.state.swapped ? 4 : 16;
      if (Audio.step % grid !== 0 && ctx.currentTime - this.pendingAt < grid * sixteenth + 0.3) return null;
    }
    const was = this.state;
    this.apply(p);
    this.pending = null;
    if (p.swapped !== was.swapped) return { swapped: p.swapped, part: null, label: null };
    const key = p.swapped ? 'swap' : 'own';
    const parts = PART_IDS.filter((id) => (p.picks[key][id] || 0) !== (was.picks[key][id] || 0));
    const part = parts[0] || null;
    return { swapped: p.swapped, part, label: part ? this.label(part) : null, parts };
  }

  /** Lane → preset for a state: the other set's sounds if swapped, then the buttons' picks. */
  voicesFor(state) {
    const voices = new Map();
    const row = this.rowFor(state.swapped);
    if (!row) return voices;
    if (state.swapped) {
      const kit = this.kitIn(row);
      for (const [lane, role] of this.roles) {
        const id = roleVoice(row, kit, role, lane);
        if (id && VOICES[id]) voices.set(lane, id);
      }
    }
    const picks = state.picks[state.swapped ? 'swap' : 'own'];
    for (const part of PART_IDS) {
      const k = picks[part] || 0;
      if (!k) continue;
      const choice = this.choices(part, state.swapped)[k];
      if (!choice) continue;
      if (choice.kit) {
        for (const [lane, role] of this.roles) {
          if (!KIT_ROLES.includes(role)) continue;
          const id = roleVoice(row, choice.kit, role, lane);
          if (id && VOICES[id]) voices.set(lane, id);
        }
      } else {
        const lane = this.partLane(part);
        if (lane) voices.set(lane, choice.id);
      }
    }
    return voices;
  }

  mixFor(state) { return mixWithVoices(this.song?.mix, this.voicesFor(state)); }

  /**
   * The clap the floor's CLAP pad plays (club-hits.js): the band's own, as heard — the clap
   * lane's sound, else the kit's — so it changes with the style, the DRUMS button and 8-BIT.
   * Where that "clap" is a snare or a rim, the first real clap in the same set's other kits;
   * where the set has none (the 8-Bit set), the game's own.
   */
  clapVoice() {
    const s = this.state;
    const isClap = (id) => VOICES[id]?.kind === 'drum' && VOICES[id].category === 'Clap';
    const lane = [...this.roles].find(([, role]) => role === 'clap')?.[0];
    const now = this.voicesFor(s);
    const laneVoice = lane && (now.get(lane) ?? (s.swapped ? null : this.song?.mix?.voice?.[`${lane}Voice`]));
    if (isClap(laneVoice)) return laneVoice;
    const row = this.rowFor(s.swapped);
    const pick = s.picks[s.swapped ? 'swap' : 'own'].drums || 0;
    const kit = (pick && this.choices('drums', s.swapped)[pick]?.kit) || this.kitIn(row);
    for (const k of [kit, ...KIT_ORDER.filter((x) => x !== kit)]) {
      const id = roleVoice(row, k, 'clap');
      if (isClap(id)) return id;
    }
    return 'clapEngine';
  }

  /** Worklet instruments build their node ahead of their first note, so it is not late. */
  warm(voices) {
    const rack = Audio.voices;
    if (!rack?.warmWorkletLane) return;
    for (const [lane, id] of voices) {
      try { const p = rack.warmWorkletLane(VOICES[id], lane); p?.catch?.(() => {}); } catch { /* nothing to warm */ }
    }
  }

  apply(state) {
    this.state = state;
    // Only onto the song this club is playing: reapplyBank on any other bank is a song change.
    if (Audio.sourceBank !== this.song?.bank || !Audio.bank) return;
    try { Audio.reapplyBank(this.song.bank, this.mixFor(state)); } catch { /* the song carries on as it was */ }
  }

  /**
   * The band's sounds as they stand, by name, to keep (store.js keepMixer): each part's sound
   * button — a kit's key or a preset's id — and whether B-33P has the band on the other set.
   */
  picksNamed(state = this.target) {
    const out = { own: {}, swap: {}, swapped: !!state.swapped };
    for (const key of ['own', 'swap']) {
      for (const [part, k] of Object.entries(state.picks[key])) {
        const c = this.choices(part, key === 'swap')[k];
        if (c && k > 0) out[key][part] = c.kit || c.id;
      }
    }
    return out;
  }

  /** The state sounds kept by name (picksNamed) describe; a sound no longer offered is let go. */
  stateFor(named) {
    const state = fresh();
    state.swapped = !!named?.swapped;
    for (const key of ['own', 'swap']) {
      for (const [part, name] of Object.entries(named?.[key] || {})) {
        const k = this.choices(part, key === 'swap').findIndex((c) => (c.kit || c.id) === name);
        if (k > 0) state.picks[key][part] = k;
      }
    }
    return state;
  }

  /** Sounds kept by name back on the band, heard at once. */
  restorePicks(named) {
    const state = this.stateFor(named);
    if (same(state, this.state)) return false;
    this.pending = null;
    this.apply(state);
    return true;
  }

  /** Every part on the song's own sound, and the band on its own set — nothing to reset. */
  get own() { return same(this.target, fresh()); }

  /** The mixer's RESET: the song's own sounds back on every part, heard at once. */
  reset() {
    this.pending = null;
    if (same(this.state, fresh())) return false;
    this.apply(fresh());
    return true;
  }

  /** Leaving the floor: the song's own sounds back, now. */
  release() {
    this.pending = null;
    if (same(this.state, fresh())) return;
    this.apply(fresh());
  }
}
