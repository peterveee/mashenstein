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
//           ALREADY on the 8-Bit set goes further down instead: 4-BIT, the whole mix through
//           a bit crusher on its own instruments (CRUSH). It went to the Light set until
//           8 Oct 2026.
//   MIXER   a sound button under each fader steps that part through the take's own table:
//           DRUMS through its six kits, BASS, CHORDS and LEAD through its Riff Sound lists.
//           With 8-BIT on, the buttons step through the 8-Bit set's instead. On an infused
//           take each button steps on past its own style's sounds into the other style's
//           (borrowedSounds); the DICE only rolls the part's own.
//
// Nothing is kept: leaving the floor puts the song's own sounds back (release).
//
// LEVELLED (Peter, 9 Oct 2026: "can we do it when swapping by hand also? there seems to huge
// variation even when its done with the dice"). A preset arrives at its lane's target for ONE
// note (voiceGain), but the fader under it was set by the generator for the sound the take was
// made with, playing the take's own notes — and a pad held through the bar, a pluck in sixteenths
// and a chord of four deliver very different amounts from the same note. So each swapped lane's
// fader moves by what the generator itself would have moved it for that sound (trimFor): the
// lane's own notes on its own sound against the same notes on the new one, by the level model
// (tools/lib/banger/levels.js), as a Random riff sound is levelled when a take is made. The
// buttons, the DICE and 8-BIT all go through it; the fader on the panel stays where it is.
import { BANGER_SOUNDS } from '../../../tools/lib/banger/sounds.js';
import { KITS, RANDOM_JOBS, phoneStyle, soundAllowed, soundsRow } from '../../../tools/lib/banger/sound-rules.js';
import { styleFor, withoutStyleSuffix } from '../../../tools/lib/banger/styles/index.js';
import { fusionIds } from '../../../tools/lib/banger/styles/fusion.js';
import { CREATIVE_DRUM_KITS } from '../../data/creative-drum-kits.js';
import { predictedProcessedPart, levelWindow, soundOf, LEVEL_WINDOW_BARS, MAX_LEVEL_MOVE } from '../../../tools/lib/banger/levels.js';
import { laneVoiceOf } from '../../../tools/lib/banger/riff.js';
import { nameOf, hasNotes } from '../../../tools/lib/banger/theory.js';
import { VOICES, baseLane, PERCUSSION_LANES } from '../../data/voices.js';
import { laneSettings } from '../../data/mix.js';
import { Audio } from '../../engine/audio.js';

export const CHIP_SET = 'chipstep-8bit';
/**
 * 4-BIT (Peter, 8 Oct 2026): B-33P on a take already on the 8-Bit set. "I want the user to think
 * it's even LESS than what we are claiming is 8 bit", so it is billed 4-BIT, though the desk's Bit
 * Crusher at Peter's settings — 12 bits, downsample 8, mix 1.00 — barely touches the depth: the
 * damage is the sample rate, held to an eighth of the context's. The instruments stay as they are.
 * In the club it is the mixer's treatment leg (mixer.setTreatment), which no song writes and which
 * cross-fades at an audio time, so it lands on the beat as the swap does and leaves the master's
 * sections — the heroes' moves, the song's own — free to play over it.
 */
export const CRUSH = Object.freeze({ bits: 12, downsample: 8, wet: 1 });
/** CRUSH as a chain link, fresh each time: a chain slot keeps the params it is handed. */
export const crushLink = () => ({ id: 'bitcrusher', params: { ...CRUSH } });
const isCrush = (chain) => !!chain?.some?.((link) => link?.def?.id === 'bitcrusher');
const CREATIVE_KIT_KEYS = new Set(CREATIVE_DRUM_KITS.map((k) => k.key));
const KIT_ROLES = Object.freeze(['kick', 'snare', 'clap', 'hats', 'ohats', 'crash', 'fill']);
// The game's kits are the six the desk has always had; the desk's creative kits
// (src/data/creative-drum-kits.js) stay off the floor.
const KIT_ORDER = Object.freeze(KITS.map((k) => k.key).filter((k) => !CREATIVE_KIT_KEYS.has(k)));
/**
 * The parts with a sound button, as the mixer lists them, and which Riff Sound list each walks.
 * `groove`: in a fusion the part is the GROOVE style's (styles/fusion.js BEAT_ROLES), not the SOUND's.
 */
export const SOUND_PARTS = Object.freeze({
  drums: { kit: true, groove: true },
  bass: { roles: ['bass'], list: 'bass', groove: true },
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
  const state = v.stateFor(sounds);
  const mix = v.mixFor(state);
  // 4-BIT is kept too: off the floor, with no leg to cross-fade, the crusher is the mix's first master insert
  return v.eightBit && state.swapped ? { ...mix, masterEffects: [crushLink(), ...(mix?.masterEffects || [])] } : mix;
}

/** The song's mix with `voices` (lane → preset) put on its lanes, and `trims` (lane → dB) on their faders. */
export function mixWithVoices(mix, voices, trims = null) {
  if (!voices.size) return mix;
  const out = { ...mix, voice: { ...(mix?.voice || {}) }, voiceParams: { ...(mix?.voiceParams || {}) } };
  for (const [lane, id] of voices) {
    out.voice[`${lane}Voice`] = id;
    // a song's own one-off preset would win over the swap (withVoices applies it last)
    delete out.voiceParams[`${lane}Voice`];
  }
  if (trims?.size) {
    out.lanes = { ...(mix?.lanes || {}) };
    for (const [lane, db] of trims) {
      const strip = out.lanes[lane] || {};
      out.lanes[lane] = { ...strip, gain: Math.round(((strip.gain ?? 0) + db) * 10) / 10 };
    }
  }
  return out;
}

/** The most a swap's fader comes DOWN, in dB (ClubVoices.trimFor). Up, it is MAX_LEVEL_MOVE. */
const TRIM_CUT_DB = 12;

/**
 * A lane's bars out of a song's bank, in play order, as the level model reads a part
 * (levels.js partLevel): `{ notes, lens }` by note name, or a drum row; null where it rests.
 */
export function laneBars(bank, lane) {
  const drum = PERCUSSION_LANES.includes(baseLane(lane));
  const sections = bank?.sections || [bank || {}];
  const order = bank?.order || sections.map((_, i) => i);
  const name = (v) => (typeof v === 'number' ? nameOf(Math.round(69 + 12 * Math.log2(v / 440))) : v);
  const out = [];
  for (const e of order) {
    const sec = sections[typeof e === 'number' ? e : e?.s] || {};
    const from = typeof e === 'number' ? 0 : (e?.from ?? 0);
    const count = typeof e === 'number' ? 2 : (e?.bars ?? 2);
    for (let h = from; h < from + count; h++) {
      const steps = Array.isArray(sec[lane]) ? sec[lane].slice(h * 16, h * 16 + 16) : [];
      if (!steps.some((v) => (drum ? !!v : v != null && v !== false))) { out.push(null); continue; }
      if (drum) { out.push(steps.map(Boolean)); continue; }
      const lens = Array.isArray(sec[`${lane}Len`]) ? sec[`${lane}Len`].slice(h * 16, h * 16 + 16) : [];
      out.push({
        notes: steps.map((v) => (v == null || v === false ? null : Array.isArray(v) ? v.map(name) : name(v))),
        lens: steps.map((_, i) => lens[i] ?? null),
      });
    }
  }
  return out;
}

/**
 * The bars a lane's level is read over: its window in the fullest drop (levels.js levelWindow),
 * as the generator read it — or, in a song with no form (a starter), the first eight it plays.
 */
function windowBars(song, lane) {
  const all = laneBars(song?.bank, lane);
  const plays = (b) => hasNotes(all[b]);
  let win = song?.form?.length ? levelWindow(song.form, plays) : null;
  if (!win) {
    const b = all.findIndex((_, i) => plays(i));
    if (b < 0) return null;
    win = [b, Math.min(all.length - 1, b + LEVEL_WINDOW_BARS - 1)];
  }
  return all.slice(win[0], win[1] + 1);
}

const fresh = () => ({ swapped: false, picks: { own: {}, swap: {} } });
const copy = (s) => ({ swapped: s.swapped, picks: { own: { ...s.picks.own }, swap: { ...s.picks.swap } } });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * An infused take's sounds from its OTHER style (Peter, 9 Oct 2026), part → choices: DRUMS and
 * BASS are the groove's, so they borrow the sound's; CHORDS and LEAD are the sound's, so they
 * borrow the groove's. A button steps through them after its own; the DICE never lands on them,
 * so a roll keeps the split the infusion made, and a sound from the other side is a tap away.
 * The kits are the same six in every style but STYLE, so DRUMS borrows that one kit. Each sound
 * passes the slot's rules (soundAllowed) with the take's never-use list. Empty for a plain take.
 */
function borrowedSounds(setId, row) {
  const pair = fusionIds(setId);
  if (!pair || !row) return {};
  const opts = { never: row.never || [], phone: phoneStyle(setId) };
  const out = {};
  for (const [part, p] of Object.entries(SOUND_PARTS)) {
    const otherId = p.groove ? pair.music : pair.beat;
    const other = BANGER_SOUNDS[otherId];
    if (!other) continue;
    if (p.kit) {
      const kit = other.kits?.style;
      if (!kit || Object.values(row.kits || {}).some((k) => same(k, kit))) continue;
      const name = String(styleFor(otherId)?.label || otherId).split(' · ')[0].toUpperCase();
      out[part] = [{ kit: 'style', row: other, name: `${otherId}:style`, label: `${name} KIT`, borrowed: true }];
      continue;
    }
    const job = RANDOM_JOBS.find((j) => j.key === p.list);
    out[part] = (other.random?.[p.list] || []).filter((id) => VOICES[id] && soundAllowed(id, job, opts))
      .map((id) => ({ id, label: voiceLabel(id), borrowed: true }));
  }
  return out;
}

export class ClubVoices {
  /** `song` is what the club plays (make.js makeBanger, or a starter's); `rec` its recipe. */
  constructor(song, rec = null) {
    this.song = song;
    this.style = rec?.style ?? null;
    // A fusion's row (`fusion:…`) is its two styles' put together, made once here.
    this.ownSet = soundsRow(BANGER_SOUNDS, song?.soundsId) ? song.soundsId : this.style;
    this.ownRow = soundsRow(BANGER_SOUNDS, this.ownSet) || null;
    // ...and, on an infused take, what each button borrows from the other style
    this.borrowed = borrowedSounds(this.ownSet, this.ownRow);
    // on the 8-Bit set already, B-33P crushes it (CRUSH) rather than swapping sets
    this.eightBit = this.ownSet === CHIP_SET;
    this.crushToken = 0;
    const row = this.ownRow;
    this.roles = rolesOf(song, row);
    this.kit = song?.kit || this.detectKit(row);
    this.state = fresh();      // what plays now
    this.pending = null;       // what plays from the next beat or bar line
    this.pendingAt = null;
    this.trims = new Map();    // `lane\nid` → dB (trimFor), and each lane's bars it is read on
    this.barsOf = new Map();
  }

  /**
   * How far `lane`'s fader moves with preset `id` on it, in dB: the lane's own notes on the
   * song's own sound against the same notes on `id`, each through the lane's channel (its
   * widener), by the level model the generator sets every fader with — so a swap lands as
   * loud as what it replaced. Up by no more than the generator moves a fader on a prediction
   * (MAX_LEVEL_MOVE): a guess that a sound wants MORE is the one that hurts when it is wrong.
   * Down by up to TRIM_CUT_DB, because a cut is safe. To the tenth of a dB a fader holds; 0 on
   * the lane's own sound, or where there is nothing to read.
   */
  trimFor(lane, id) {
    const key = `${lane}\n${id}`;
    if (this.trims.has(key)) return this.trims.get(key);
    let db = 0;
    const own = laneVoiceOf(this.song?.bank, this.song?.mix, lane);
    if (id && id !== own.id) {
      if (!this.barsOf.has(lane)) this.barsOf.set(lane, windowBars(this.song, lane));
      const bars = this.barsOf.get(lane);
      const bpm = this.song?.bpm || this.song?.bank?.bpm || 120;
      const strip = this.song?.mix?.lanes?.[lane];
      const level = (sound) => (bars ? predictedProcessedPart({ bars, bpm, lane, sound, strip }) : null);
      const was = level(soundOf(own));
      const now = level(soundOf({ id }));
      if (was != null && now != null) {
        db = Math.round(Math.max(-TRIM_CUT_DB, Math.min(MAX_LEVEL_MOVE, was - now)) * 10) / 10;
      }
    }
    this.trims.set(key, db);
    return db;
  }

  /** Lane → dB for lanes playing `voices` (lane → preset): each one's trimFor, the zeros left out. */
  trimsFor(voices) {
    const out = new Map();
    for (const [lane, id] of voices) {
      const db = this.trimFor(lane, id);
      if (db) out.set(lane, db);
    }
    return out;
  }

  /** The take's kit, read off its kick, for a song that does not say. */
  detectKit(row) {
    const kickLane = [...this.roles].find(([, role]) => role === 'kick')?.[0];
    const kick = kickLane && this.song?.mix?.voice?.[`${kickLane}Voice`];
    return KIT_ORDER.find((k) => kick && row?.kits?.[k]?.kick === kick) || 'style';
  }

  /** Whether B-33P's `swapped` has the band on the 8-Bit set's instruments: never on an 8-Bit take, which keeps its own. */
  onChipSet(swapped) { return !!swapped && !this.eightBit; }
  /** Which picks a state's buttons are on: the 8-Bit set's, or the take's own (in 4-BIT too). */
  pickKey(swapped) { return this.onChipSet(swapped) ? 'swap' : 'own'; }
  rowFor(swapped) { return this.onChipSet(swapped) ? BANGER_SOUNDS[CHIP_SET] || null : this.ownRow; }
  kitIn(row) { return row?.kits?.[this.kit] ? this.kit : 'style'; }

  /** The lane a part's button changes: its first lane with one of the part's jobs. */
  partLane(part) {
    const roles = SOUND_PARTS[part]?.roles || [];
    for (const role of roles) for (const [lane, r] of this.roles) if (r === role) return lane;
    return null;
  }

  /**
   * The sounds a part's button steps through, starting with the one it has now: its own, then
   * (an infused take, off the 8-Bit set) those it borrows from the other style, marked `borrowed`.
   */
  choices(part, swapped = this.target.swapped) {
    const row = this.rowFor(swapped);
    if (!row) return [];
    const borrowed = this.onChipSet(swapped) ? [] : this.borrowed[part] || [];
    if (part === 'drums') {
      const own = this.kitIn(row);
      return [own, ...KIT_ORDER.filter((k) => k !== own && row.kits?.[k])].map((kit) => ({ kit, label: kitLabel(kit) })).concat(borrowed);
    }
    const lane = this.partLane(part);
    if (!lane) return [];
    const first = this.onChipSet(swapped) ? roleVoice(row, this.kitIn(row), this.roles.get(lane), lane) : this.song?.mix?.voice?.[`${lane}Voice`];
    const list = row.random?.[SOUND_PARTS[part].list] || [];
    const own = [first, ...list.filter((id) => id !== first)].filter((id) => VOICES[id]);
    return own.map((id) => ({ id, label: voiceLabel(id) })).concat(borrowed.filter((c) => !own.includes(c.id)));
  }
  /** What the DICE rolls between: the part's own sounds, never the borrowed (they come last). */
  rollChoices(part, swapped = this.target.swapped) {
    return this.choices(part, swapped).filter((c) => !c.borrowed);
  }

  /** The state that will be playing once anything waiting has landed. */
  get target() { return this.pending || this.state; }
  /** 8-BIT (or, on an 8-Bit take, 4-BIT) is on, or about to be. */
  get swapped() { return this.target.swapped; }
  /** ...and is on now, as heard (the pixel heroes go with the sound, not the tap). */
  get swappedNow() { return this.state.swapped; }

  /** The name on a part's button: the sound it has, or is about to have. */
  label(part) {
    const s = this.target;
    const list = this.choices(part, s.swapped);
    return list[(s.picks[this.pickKey(s.swapped)][part] || 0) % Math.max(1, list.length)]?.label || '';
  }

  /** Whether a part's sound (or the whole set) is waiting for its beat or bar line. */
  waiting(part = null) {
    if (!this.pending) return false;
    if (part == null || this.pending.swapped !== this.state.swapped) return true;
    const key = this.pickKey(this.pending.swapped);
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
    const key = this.pickKey(next.swapped);
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
    const key = this.pickKey(next.swapped);
    let moved = false;
    for (const part of PART_IDS) {
      const n = this.rollChoices(part, next.swapped).length;
      const was = next.picks[key][part] || 0;
      // on a borrowed sound, any of its own; else another of its own
      if (!n || (n < 2 && was < n)) continue;
      const k = was >= n ? Math.floor(random() * n) : (was + 1 + Math.floor(random() * (n - 1))) % n;
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
    const key = this.pickKey(p.swapped);
    const parts = PART_IDS.filter((id) => (p.picks[key][id] || 0) !== (was.picks[key][id] || 0));
    const part = parts[0] || null;
    return { swapped: p.swapped, part, label: part ? this.label(part) : null, parts };
  }

  /** Lane → preset for a state: the 8-Bit set's sounds if swapped onto it, then the buttons' picks. */
  voicesFor(state) {
    const voices = new Map();
    const row = this.rowFor(state.swapped);
    if (!row) return voices;
    if (this.onChipSet(state.swapped)) {
      const kit = this.kitIn(row);
      for (const [lane, role] of this.roles) {
        const id = roleVoice(row, kit, role, lane);
        if (id && VOICES[id]) voices.set(lane, id);
      }
    }
    const picks = state.picks[this.pickKey(state.swapped)];
    for (const part of PART_IDS) {
      const k = picks[part] || 0;
      if (!k) continue;
      const choice = this.choices(part, state.swapped)[k];
      if (!choice) continue;
      if (choice.kit) {
        for (const [lane, role] of this.roles) {
          if (!KIT_ROLES.includes(role)) continue;
          const id = roleVoice(choice.row || row, choice.kit, role, lane);
          if (id && VOICES[id]) voices.set(lane, id);
        }
      } else {
        const lane = this.partLane(part);
        if (lane) voices.set(lane, choice.id);
      }
    }
    return voices;
  }

  mixFor(state) {
    const voices = this.voicesFor(state);
    return mixWithVoices(this.song?.mix, voices, this.trimsFor(voices));
  }

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
    const laneVoice = lane && (now.get(lane) ?? (this.onChipSet(s.swapped) ? null : this.song?.mix?.voice?.[`${lane}Voice`]));
    if (isClap(laneVoice)) return laneVoice;
    const row = this.rowFor(s.swapped);
    const pick = s.picks[this.pickKey(s.swapped)].drums || 0;
    const choice = pick ? this.choices('drums', s.swapped)[pick] : null;
    const kit = choice?.kit || this.kitIn(row);
    const borrowed = choice?.row && roleVoice(choice.row, kit, 'clap');
    if (isClap(borrowed)) return borrowed;
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
    const was = this.state;
    this.state = state;
    // Only onto the song this club is playing: reapplyBank on any other bank is a song change.
    if (Audio.sourceBank !== this.song?.bank || !Audio.bank) return;
    const mix = this.mixFor(state);
    try {
      Audio.reapplyBank(this.song.bank, mix);
      this.restrip(this.mixFor(was), mix);
    } catch { /* the song carries on as it was */ }
    if (this.eightBit && !!state.swapped !== !!was.swapped) this.crush(!!state.swapped);
  }

  /**
   * The faders a swap moved (trimFor), onto their strips from the step the swap lands on.
   * reapplyBank re-merges the voices and leaves every strip as it stands, so the new level is
   * put there here — read off the mix as the engine took it (its filter in), and after a song
   * change's held mix (afterMix), which would otherwise land over it.
   */
  restrip(before, after) {
    const lanes = new Set([...Object.keys(before?.lanes || {}), ...Object.keys(after?.lanes || {})]);
    const moved = [...lanes].filter((lane) => (before?.lanes?.[lane]?.gain ?? 0) !== (after?.lanes?.[lane]?.gain ?? 0));
    if (!moved.length) return;
    Audio.afterMix(() => {
      const mixer = Audio.mixer, ctx = Audio.ctx;
      if (!mixer?.lane || !ctx || Audio.sourceBank !== this.song?.bank) return;
      const when = Math.max(ctx.currentTime, Number.isFinite(Audio.nextTime) ? Audio.nextTime : 0);
      for (const lane of moved) {
        const s = laneSettings(Audio.mixEntry?.lanes?.[lane]);
        mixer.lane(lane)?.rampTo?.({ gain: s.gain, mute: s.mute }, when, 0.012);
      }
    });
  }

  /**
   * 4-BIT in or out (CRUSH) from the next step the sequencer schedules — the beat the swap lands
   * on — or at once with none. After a song change's held mix (afterMix): applying that resets the
   * treatment leg. Out, the crusher comes off the leg once it is silent, unless 4-BIT came back.
   */
  crush(on) {
    const token = ++this.crushToken;
    Audio.afterMix(() => {
      const mixer = Audio.mixer, ctx = Audio.ctx;
      if (token !== this.crushToken || !mixer?.rampTreatment || !ctx) return;
      const when = Math.max(ctx.currentTime, Number.isFinite(Audio.nextTime) ? Audio.nextTime : 0);
      if (on) {
        // still loaded from a 4-BIT just let go: it is faded back to, never rebuilt while heard
        if (!isCrush(mixer.treatment)) mixer.setTreatment([crushLink()], Audio.bpm || 120);
        mixer.rampTreatment(1, when);
        return;
      }
      mixer.rampTreatment(0, when);
      setTimeout(() => Audio.afterMix(() => {
        if (token === this.crushToken && isCrush(Audio.mixer?.treatment)) Audio.mixer.clearTreatment();
      }), Math.ceil((when - ctx.currentTime) * 1000) + 60);
    });
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
        if (c && k > 0) out[key][part] = c.name || c.kit || c.id;
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
        const k = this.choices(part, key === 'swap').findIndex((c) => (c.name || c.kit || c.id) === name);
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
