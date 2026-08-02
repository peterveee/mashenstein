import {
  baseLane, isLayer, seamFor, PERCUSSION_LANES, CHORD_LANES,
  DEFAULT_ADDED_PERCUSSION_VOICE,
} from '../data/voices.js';
import { expandOrder, orderOf, resolveSection } from '../data/arrangements.js';

// The sequencer's lane list, in mix order.
//
// This used to live in tools/lib/render-bank.js, where only the offline renderer
// could see it. The mixing desk needs the same list at runtime — one channel strip
// per lane — so it belongs in the engine, with the tools importing it from here.
// `label` names a stem file; `group` is for display and printed summaries.
export const LANES = [
  { key: 'bass', label: 'bass', group: 'melodic' },
  { key: 'lead', label: 'lead', group: 'melodic' },
  { key: 'leadHarm', label: 'lead-harmony', group: 'melodic' },
  { key: 'twinkle', label: 'twinkle', group: 'melodic' },
  { key: 'chords', label: 'chords', group: 'melodic' },
  { key: 'organChords', label: 'organ', group: 'melodic' },
  { key: 'organGliss', label: 'organ-gliss', group: 'fx' },
  { key: 'organSwoop', label: 'organ-swoop', group: 'fx' },
  { key: 'keyGliss', label: 'key-gliss', group: 'fx' },
  { key: 'gliss', label: 'gliss', group: 'fx' },
  { key: 'electroFx', label: 'electro-fx', group: 'fx' },
  { key: 'sweeps', label: 'sweeps', group: 'fx' },
  { key: 'vox', label: 'vox', group: 'vocal' },
  { key: 'shout', label: 'shout', group: 'vocal' },
  { key: 'kick', label: 'kick', group: 'drums' },
  { key: 'snare', label: 'snare', group: 'drums' },
  { key: 'clap', label: 'clap', group: 'drums' },
  { key: 'rim', label: 'rim', group: 'drums' },
  { key: 'hats', label: 'hats-closed', group: 'drums' },
  { key: 'ohats', label: 'hats-open', group: 'drums' },
  { key: 'crash', label: 'crash', group: 'drums' },
  { key: 'tom', label: 'tom', group: 'drums' },
];

export const LANE_KEYS = LANES.map((l) => l.key);

/**
 * ---- per-note lengths --------------------------------------------------------
 *
 * A lane may carry a parallel array under `${lane}Len`: how long the note on each
 * step sounds, in STEPS, and ABSOLUTE rather than a multiple of the lane's own
 * `*Dur`. The piano roll's resize handle is what writes it, and absolute is what
 * makes the rectangle the roll draws true — as a multiplier, a one-step note on a
 * bass whose `bassDur` is 1.8 would sound for nearly two steps and the drawing
 * would be a lie.
 *
 * Absent is the ordinary case, and the cheap one: no bank in the game holds a Len
 * array, `??` falls straight through to the lane's own length key, and the number
 * that reaches an oscillator is the one that always did. That is what keeps
 * tests/null-test.js sample-exact — so an all-null array is DELETED rather than
 * written, and `withLengths` in tools/lib/arrangement-edit.js is where that happens.
 *
 * The key is spelled off the LANE, never off the lane's `*Dur` key: the seams
 * disagree with the lane names (`chords` → `chordDur`, `leadHarm` → `harmDur`), and
 * a `chordLen` sitting beside `chords` would be one letter away from the wrong
 * array for ever.
 */
export const lenKey = (laneKey) => `${laneKey}Len`;

/** Is this bank key a lane's lengths? Nothing else in a bank ends in `Len`. */
export const isLenKey = (key) => typeof key === 'string' && /Len$/.test(key);

/** A length is a real, positive number of steps. Anything else is not a length. */
export const validLen = (v) => Number.isFinite(v) && v > 0;

/**
 * What a lane says about the length of the note on `step`: a number, an ARRAY of
 * them on a chord lane — one per tone, aligned with the frequencies on that step —
 * or null where it says nothing and the lane's own length stands.
 */
export function stepLen(bank, laneKey, step) {
  const arr = bank?.[lenKey(laneKey)];
  if (!Array.isArray(arr)) return null;
  const at = arr[step];
  if (Array.isArray(at)) return at;
  return validLen(at) ? at : null;
}

/**
 * One note's length in steps, out of whatever `stepLen` returned.
 *
 * `i` indexes the tone within a chord. A scalar covers the whole chord, which is
 * what a hand-written `chordsLen: [4, ...]` plainly means by it; the roll writes
 * per-tone arrays, because it draws a rectangle per tone and one length for three
 * of them would restretch the two you were not dragging.
 */
export function toneLen(len, fallback, i = 0) {
  const one = Array.isArray(len) ? len[i] : len;
  return validLen(one) ? one : fallback;
}

// Desk order: the order the channel strips appear on the mixing desk, which is not
// the same as the order the renderer walks. A desk reads kit first — kick, snare,
// claps, hats, then the rest of the percussion — then bass, then everything
// pitched. You balance a song from the bottom up, so the bottom lives on the left.
//
// LANES itself is left alone: it numbers the stem files, and renaming those to suit
// a UI layout would be the tail wagging the dog.
const DESK_ORDER = [
  'kick', 'snare', 'clap', 'hats', 'ohats', 'rim', 'crash', 'tom',
  'bass',
];

/**
 * ---- Layers ----------------------------------------------------------------
 *
 * A layer is a duplicated track: the same note arrays under a second lane key, so it
 * can carry its own voice, fader, EQ, sends and effects. Everything downstream —
 * `activeLanes`, `laneActivity`, the strips, the arrangement grid, the stem renderer
 * — sees an ordinary lane, because by the time they look at the bank that is what it
 * is. The only code that knows layers exist is here, `deskBank` below, and the one
 * loop in `scheduleStep` that plays them.
 *
 * Layers are declared in the MIX (`entry.layers`), not in the song: the desk has
 * never rewritten a composition file and this does not start. `deskBank` is what
 * turns the declaration into lanes, and deleting the mix entry reverts the song
 * exactly.
 */

/** The lane definitions a bank's layers stand for — LANES-shaped, so they mix in. */
export function layerLanes(bank) {
  const src = new Map(LANES.map((l) => [l.key, l]));
  return (bank?.__layers || []).map(({ key, from, label, independent }) => {
    const base = src.get(from);
    return {
      key,
      label: label || `${base?.label || from} ${key.slice(from.length)}`,
      group: base?.group || 'melodic',
      layerOf: from,
      independent: !!independent,
    };
  }).filter((l) => src.has(l.layerOf));
}

/** Every lane this bank can play: the engine's own, plus any layers laid over it. */
export function laneList(bank) {
  const layers = layerLanes(bank);
  return layers.length ? [...LANES, ...layers] : LANES;
}

/**
 * The bank the desk, the game and the renderers should actually play, given a mix.
 *
 * Two things a mix entry can say about the SHAPE of a song rather than its balance:
 * `off` drops a lane out of it entirely (the desk's Delete track), and `layers` adds
 * a copy of one (Duplicate track). Both are applied here, once, so there is a single
 * answer to "what lanes does this song have" no matter who is asking.
 *
 * Returns the bank UNTOUCHED — the same object, not a copy — when the mix says
 * neither, which is every song in the game today. That identity is what keeps
 * tests/null-test.js sample-exact: nothing is cloned, re-keyed or re-ordered on the
 * path that existed before layers did.
 *
 * The lane arrays are shared by reference into the layer, deliberately: they are read
 * by the sequencer and never written, and one bank in the game has a single array on
 * seven sections at once. A copy per layer would be megabytes for nothing.
 */
export function deskBank(bank, entry) {
  if (!bank) return bank;
  const off = (entry?.off || []).filter((k) => LANE_KEYS.includes(k));
  // A layer whose source is gone — deleted, or renamed out of the engine — is not a
  // lane, it is a row that plays nothing. Dropped here rather than half-built.
  const layers = (entry?.layers || [])
    .filter((l) => l && l.key && LANE_KEYS.includes(l.from) && !off.includes(l.from)
      && !LANE_KEYS.includes(l.key) && seamFor(l.key));
  if (!off.length && !layers.length) return bank;

  const shape = (block) => {
    const out = { ...block };
    // The lengths go with the lane. Left behind they are harmless while the lane is
    // gone and wrong the moment it comes back — a re-added bass would inherit the
    // lengths of notes that no longer exist.
    for (const key of off) { delete out[key]; delete out[lenKey(key)]; }
    // Scratch templates name silent lanes here so the Blank template can show an
    // editable track without planting a fake note. Once that track is deleted, the
    // marker must go with it: activeLanes intentionally trusts starterLanes, so
    // leaving the key here would recreate the strip and arrangement row even though
    // the lane data above was correctly removed.
    if (Array.isArray(out.starterLanes)) {
      out.starterLanes = out.starterLanes.filter((key) => !off.includes(key));
      if (!out.starterLanes.length) delete out.starterLanes;
    }
    for (const { key, from, independent } of layers) {
      // Ordinary layers are doubles: same notes, separate voice and strip. Pattern-
      // editor instruments are independent layers: a real silent lane until notes
      // are painted into it. Percussion lanes start as booleans (the step grid
      // toggles hits on/off); pitched lanes start as nulls (the piano roll writes
      // frequencies). Preserve an arrangement delta that already names the layer;
      // otherwise materialise 32 rests so it still gets a row and strip.
      if (out[key] != null) continue;
      if (independent) {
        const length = Object.values(out).find((v) => Array.isArray(v))?.length || 32;
        const isDrum = PERCUSSION_LANES.includes(baseLane(from)) || PERCUSSION_LANES.includes(from);
        out[key] = new Array(length).fill(isDrum ? false : null);
      } else if (out[from]) {
        out[key] = out[from];
        // A double plays the same notes AT THE SAME LENGTHS. Without this the layer
        // falls back to its own `*Dur` and a duplicated bass plays the part with
        // every hand-drawn length thrown away, which reads as the copy being wrong
        // rather than as a missing key.
        if (out[lenKey(from)]) out[lenKey(key)] = out[lenKey(from)];
      }
    }
    return out;
  };
  const out = shape(bank);
  // Sections are partial banks spread over the whole at schedule time, so a lane
  // deleted from the top and left in a section would come back in that section, and a
  // layer would fall back to the top-level part instead of following the section's.
  if (Array.isArray(bank.sections)) out.sections = bank.sections.map(shape);
  // Earlier builds created an independent lane with notes but no voice. The layer
  // loop quite correctly skipped it, producing the particularly confusing state of
  // a lit step and a percussion tally with no audio. Give only those independent
  // lanes the same Tom preset new channels now receive explicitly. A chosen library
  // or song-local voice is merged afterwards and still wins.
  for (const { key, independent } of layers) {
    if (!independent) continue;
    const seam = seamFor(key);
    // Only percussion layers can use the generic Tom starter. Melodic lanes need
    // an explicit library voice; assigning a drum preset here makes a new bass or
    // lead row appear to be configured while silently routing it through noise.
    if (!seam || !PERCUSSION_LANES.includes(baseLane(key))) continue;
    if (!seam || entry?.voice?.[seam.voiceKey] || entry?.voiceParams?.[seam.voiceKey]) continue;
    if (out[seam.voiceKey] == null) out[seam.voiceKey] = DEFAULT_ADDED_PERCUSSION_VOICE;
  }
  out.__layers = layers.map(({ key, from, independent, label }) => ({
    key, from, ...(independent ? { independent: true } : {}), ...(label ? { label } : {}),
  }));
  return out;
}

/**
 * The same song with one lane left in it, sounding one note, once.
 *
 * This is what the desk's on-screen keyboard plays. Pressing a key has to sound the
 * SELECTED CHANNEL — its voice, its gain, its note length, its tone-shaping, through
 * its own strip — and a second synthesiser built to do that would have to know
 * everything scheduleStep knows and would drift from it the first time either
 * changed. So the sequencer plays it instead, handed a bank with nothing in it but
 * the note: every other lane blanked, and the one lane holding a single step.
 *
 * Sections go, because a preview happens at no point in the song's form: left in,
 * they would spread over the bank at schedule time and blank the lane again or
 * re-voice it half way. `bpm` and every tone-shaping key stay exactly as they are —
 * the note has to sound like the song, not like a default.
 *
 * `value` is a frequency. What a lane's step actually HOLDS is not always one — a
 * percussion lane holds a boolean and carries its pitch as a bank key, a chord lane
 * holds an array — so the three shapes are applied here, at the one place that knows
 * which lane is which.
 *
 * `step` is which of the 32 it lands on, and it is not 0 on purpose: the sequencer
 * fires its beat listeners on every fourth step, and a preview is not a beat.
 */
export function soloBank(bank, laneKey, value, step = 1) {
  if (!bank || !laneKey) return null;
  const base = baseLane(laneKey);
  const perc = PERCUSSION_LANES.includes(base);
  const out = { ...bank };
  delete out.sections;
  delete out.order;
  // The lengths go too. A preview happens at no step of the song, so a per-note
  // length has nothing to be the length of — left in, the key you pressed would
  // sound for however long the note that happens to live on step 1 does.
  for (const { key } of laneList(bank)) { out[key] = null; delete out[lenKey(key)]; }
  // Only the layer being played. The loop at the end of scheduleStep walks them all,
  // and a layer still holding its notes would sound underneath the preview.
  out.__layers = (bank.__layers || []).filter((L) => L.key === laneKey);
  const hit = perc ? true : (CHORD_LANES.includes(base) ? [value] : value);
  out[laneKey] = Array.from({ length: 32 }, (_, i) => (i === step ? hit : (perc ? false : null)));
  // A preset kit is struck at the lane's own note, so the key you pressed becomes
  // that note and the drum is tuned by the keyboard. The hand-written kit has its
  // pitch drawn into it and ignores this, which is why every key sounds the same
  // kick there — that is the sound, not a bug in the preview.
  const seam = perc ? seamFor(laneKey) : null;
  if (seam?.noteKey && value > 0) out[seam.noteKey] = value;
  return out;
}

/** Active lanes, ordered for the desk. Anything unlisted keeps its LANES order. */
export function deskLanes(bank, repeat = 1) {
  const rank = (key) => {
    // A layer sits immediately after the lane it copies — it is the same part, and a
    // "bass 2" three strips away from the bass is a strip you have to go looking for.
    // The tenth of a rank is the ordinal, so bass2 comes before bass3.
    const base = baseLane(key);
    const nudge = isLayer(key) ? (parseInt(key.slice(base.length), 10) || 0) / 100 : 0;
    const i = DESK_ORDER.indexOf(base);
    return (i === -1 ? DESK_ORDER.length + LANE_KEYS.indexOf(base) : i) + nudge;
  };
  return activeLanes(bank, repeat).slice().sort((a, b) => rank(a.key) - rank(b.key));
}

// Bar plans, per bank and repeat count. The sequencer asks for one every sixteenth
// and the desk asks for one every time it redraws, so expanding an order forty times
// a second would be forty expansions a second.
//
// Keyed on the bank OBJECT, which is also the invalidation: applying an arrangement
// returns a new bank, so an edited song is a cache miss rather than a stale plan.
// `invalidateBarPlan` is for the desk pushing an edit onto the bank it is playing.
const BAR_PLANS = new WeakMap();

/**
 * The song as BARS — `[{ sec, half, off }]`, one entry each.
 *
 * `order` has always been a list of two-bar blocks, which is why every build-up in
 * the game is hand-typed: you cannot say "these two bars again, without the snare"
 * in a list whose unit is the phrase. A bar plan is that list at half the grain, and
 * a legacy numeric order expands to exactly what it always meant — section n, both
 * its bars — so this is a finer ruler, not a different song. See
 * `src/data/arrangements.js` for the format and `tests/arrangement.js` for the proof
 * (it walks every step of every song against what scheduleStep computes itself).
 */
export function barPlan(bank, repeat = 1) {
  let byRepeat = BAR_PLANS.get(bank);
  if (!byRepeat) { byRepeat = new Map(); BAR_PLANS.set(bank, byRepeat); }
  const hit = byRepeat.get(repeat);
  if (hit) return hit;
  const one = expandOrder(orderOf(bank), !!(bank.sections && bank.sections.length));
  const plan = [];
  for (let r = 0; r < repeat; r++) plan.push(...one);
  byRepeat.set(repeat, plan);
  return plan;
}

/** Drop a bank's memoised plan — for the desk editing the arrangement in place. */
export function invalidateBarPlan(bank) { BAR_PLANS.delete(bank); }

/**
 * Each bar as the partial bank it plays: `[{ b, half, off, delete }]`.
 *
 * `b` is the section merged over the bank, exactly as `scheduleStep` merges it, and
 * `half` says which sixteen of its thirty-two steps this bar is. The mute mask is
 * handed back rather than applied — "does this song contain a crash" and "is the
 * crash silenced in bar 7" are different questions, and a lane muted everywhere must
 * still get a strip or there is nothing to unmute it with.
 */
export function songBars(bank, repeat = 1) {
  const has = !!(bank.sections && bank.sections.length);
  return barPlan(bank, repeat).map((bar) => {
    let b = bank;
    if (has && bar.sec != null) {
      // Modulo, as the sequencer has always done it (audio.js): an order entry past
      // the end of the section list wraps rather than falling back to the bare bank.
      // Nothing in the game is out of range — tests/arrangement.js asserts it — but
      // matching the engine exactly is what makes this swap inaudible.
      const sec = resolveSection(bank, bar.sec % bank.sections.length);
      if (sec) b = { ...bank, ...sec };
    }
    return { b, half: bar.half, off: bar.off || null, delete: bar.delete || null };
  });
}

/**
 * Expand sections/order into the flat block list the sequencer walks.
 *
 * Two bars to a block, as it always was, built on the bar plan so that everything
 * downstream sees the same song. Callers that count blocks to size a render, or walk
 * them to write a MIDI file, are asking a two-bar question; a mute mask is a per-bar
 * answer and does not survive the trip.
 */
export function songBlocks(bank, repeat = 1) {
  const bars = songBars(bank, repeat);
  const blocks = [];
  for (let i = 0; i < bars.length; i += 2) blocks.push(bars[i].b);
  return blocks;
}

/**
 * Which lanes actually fire anywhere in the song form. The desk shows a strip per
 * active lane, so a bank that declares a lane but never plays it does not clutter
 * the rack; the stem renderer uses it to skip writing silent files.
 */
export function activeLanes(bank, repeat = 1) {
  // Bars, not blocks, so a lane that only plays in the second half of one section is
  // seen — and deliberately blind to the mute mask, which is an arrangement decision
  // about a bar rather than a statement about what the song is made of.
  const bars = songBars(bank, repeat);
  const independent = new Set((bank?.__layers || [])
    .filter((l) => l.independent).map((l) => l.key));
  // Scratch-song templates can deliberately expose a silent lane (the Blank
  // template's lead) without planting a fake note just to make the strip appear.
  // Hand-authored songs do not carry this marker, so their existing activity rule
  // remains unchanged.
  const starter = new Set(Array.isArray(bank?.starterLanes) ? bank.starterLanes : []);
  return laneList(bank).filter(({ key }) => independent.has(key)
    || starter.has(key)
    || bars.some(({ b }) => b[key] && b[key].some(Boolean)));
}

/**
 * Where each lane actually plays, bar by bar.
 *
 * A song is a list of two-bar blocks, so "does the crash sound anywhere" is not
 * something you can read off the bank — the crash might only appear in section 3.
 * This returns, per lane, a density per bar: 0 for silent, up to 1 for a step on
 * every sixteenth. The desk shades a grid with it so you can see where a sound
 * lives and jump straight to it, which is otherwise a matter of listening through
 * the whole song and hoping.
 *
 * `steps` carries the raw values behind each cell in the same order, so the desk
 * can also say WHAT is played there and not only how much of it. Values are
 * whatever the bank holds: true for a percussion hit, a frequency, or an array of
 * them for a chord.
 */
export function laneActivity(bank, repeat = 1, cellsPerBar = 4) {
  const bars = songBars(bank, repeat);
  // A bar is 16 sixteenths, so a beat is 4 of them.
  const stepsPerCell = 16 / cellsPerBar;
  const cells = bars.length * cellsPerBar;
  return activeLanes(bank, repeat).map((lane) => {
    const density = new Array(cells).fill(0);
    const steps = Array.from({ length: cells }, () => []);
    bars.forEach((bar, bi) => {
      const arr = bar.b[lane.key];
      // A lane silenced in this bar reads exactly like a lane that plays nothing
      // there, which is what the grid should shade: what you would HEAR. Which of the
      // two it is belongs to the arrangement, and the desk draws that from the plan.
      if (!arr || (bar.off && bar.off.includes(lane.key))
        || (bar.delete && bar.delete.includes(lane.key))) return;
      for (let c = 0; c < cellsPerBar; c++) {
        let hits = 0;
        const cell = bi * cellsPerBar + c;
        const from = bar.half * 16 + c * stepsPerCell;
        for (let i = from; i < from + stepsPerCell; i++) {
          const v = arr[i];
          // Percussion lanes are booleans, melodic ones are Hz or an array of Hz.
          if (v === true || (typeof v === 'number' && v > 0) || (Array.isArray(v) && v.length)) hits++;
          steps[cell].push(v ?? null);
        }
        density[cell] = hits / stepsPerCell;
      }
    });
    return { ...lane, density, steps, cellsPerBar };
  });
}

// Lanes whose voices are dry unless the bank opts them in. The melodic and fx
// lanes call play() with echo defaulting to true; percussion and the vocal
// one-shots stay out of the repeats whatever echoLevel says, which is what keeps
// the delay from turning into a wash. Mirrors the connect decisions in
// AudioSys.scheduleStep — if those change, change these.
const ECHO_OPT_IN = {
  bass: (b) => !!b.bassEcho || !!b.echoEverything,
  vox: (b) => !!b.echoEverything,
  shout: (b) => !!b.echoEverything,
  kick: (b) => !!b.echoEverything,
  snare: (b) => !!b.echoEverything,
  clap: (b) => !!b.echoEverything,
  hats: (b) => !!b.echoEverything,
  ohats: (b) => !!b.echoEverything,
  crash: (b) => !!b.crashEcho || !!b.echoEverything,
  tom: (b) => !!b.echoEverything,
  // `rim` is deliberately absent: it always taps the echo bus through its own
  // rimEcho send, unlike the rest of the kit.
};

/**
 * Does this lane's own per-voice echo flag opt it in anywhere in the song?
 *
 * It no longer decides anything about routing: every channel taps its whole lane into
 * the delay send, so what reaches the bus is the send and nothing else — see makeStrip.
 * This survives as a reading of what the BANK asks for, which is what the bench uses to
 * check a lane renders dry, and what the arrangement tests hold the old shape against.
 */
export function laneUsesEcho(bank, key, repeat = 1) {
  // A layer answers the same question its source does: it is that part, and having
  // the copy echo where the original is dry would be a difference nothing asked for.
  const test = ECHO_OPT_IN[baseLane(key)];
  if (!test) return true; // melodic + fx lanes echo by default
  // Per bar: the flags it reads (`bassEcho`, `echoEverything`) are section-level, and
  // a section can turn one on for one bar of a payoff.
  return songBars(bank, repeat).some(({ b }) => test(b));
}

/**
 * Does this lane reach the delay in THIS block? The per-song answer above is what the
 * desk greys a send out on; the sequencer needs it per step, because a section can
 * turn `echoEverything` on for the payoff and off again after it.
 */
export function laneEchoesIn(block, key) {
  const test = ECHO_OPT_IN[baseLane(key)];
  return test ? !!test(block) : true;
}
