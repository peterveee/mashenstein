// Take the sounds chosen on an audition song and make them the pack's own.
//
// ---- the gap this closes -------------------------------------------------------
//
// A pack names frozen presets — `bassVoice: 'stTpBassy'` — and STARTER is deliberately
// unwritable: the editor refuses to open one, /voice-save refuses to write one, and
// the picker leaves them off the menu. That is what stops a library edit three tabs
// away from quietly changing what New Song produces (see STARTER in
// src/data/voices.js). tools/freeze-starter-voices.js put the packs into that state
// and cannot take them out of it again — it skips ids that are already frozen, so once
// a pack names `st*` the only way to change its sound was to hand-edit the table.
//
// This is the intended way out. It is not a loophole in the freeze, it is the other
// half of it: a starter sound changes when somebody types this, having listened, and
// never as a side effect of anything else.
//
// ---- what it does --------------------------------------------------------------
//
//   1. reads the mix saved on the pack's audition song — `mix.voice` is the choice you
//      made on the strips, `mix.voiceParams` a preset you dialled in there instead
//   2. freezes each newly chosen sound into STARTER, complete, the way freezing has
//      always worked: a copy, not a reference to a library entry that can move
//   3. repoints that pack's `bank` at the new ids
//   4. MEASURES the new entries and splices their levels into LEVELS/PEAKS — for the
//      same reason /voice-save measures: `voiceGain` divides a lane's target by this
//      number, so an unmeasured preset is one that is quietly the wrong loudness
//   5. re-derives the pack's `musicTrim` and `drumGain` by rendering it
//
// Step 5 is not optional either, and it is why this is one command rather than two.
// Those two numbers are measured against the sounds the pack plays: `drumGain` puts
// the kit 0.8 LU under the music, `musicTrim` puts the whole pack on -22.0 LUFS so the
// style picker does not shout at you every third choice. Change the voices and both
// are stale — the pack would sit loud or quiet against its neighbours, with a kit in
// the wrong place, and nothing would say so. The procedure in the song-styles.js
// header describes doing this by hand; this does exactly that, twice round, because
// the two interact through the sum.
//
// ---- running it ----------------------------------------------------------------
//
//     node tools/adopt-style-voices.js --style house       adopt House's audition
//     node tools/adopt-style-voices.js                     every audition with a mix
//     node tools/adopt-style-voices.js --style house --dry  the voice diff, no writes
//     node tools/adopt-style-voices.js --trims-only        re-measure trims, change no sound
//
// `--trims-only` is the one to run after the LIBRARY is re-levelled
// (tools/measure-voices.js moves every preset's gain): the packs' voices have not
// changed but what they measure has.
//
// The audition song keeps its mix afterwards, and that is correct: the mix now names
// the same sounds the pack does, so the song plays identically and the strips still
// show what you chose. `--reset` in tools/style-auditions.js is how you go back to a
// clean strip once the pack holds the choice.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { emitEntry, readVoicesSource, writeVoicesSource, setMeasured } from './lib/voices-source.js';
import { openRenderer } from './lib/render-bank-browser.js';
import { measureVoiceAt, homeLane } from './lib/measure-voice.js';
import { loudness } from './lib/loudness.js';
import { LANES } from '../src/engine/lanes.js';
import { VOICES, VOICE_LANES } from '../src/data/voices.js';
import { SONG_STYLES, STYLE_BY_ID } from './lib/song-styles.js';
import { newSongPlan } from './lib/new-song-plan.js';
import { IMPORTED_DIR } from './lib/imported-index.js';
import { auditionId, AUDITION_SEED } from './style-auditions.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES_FILE = join(ROOT, 'tools/lib/song-styles.js');
const DRY = process.argv.includes('--dry');
const TRIMS_ONLY = process.argv.includes('--trims-only');
const SKIP_TRIMS = process.argv.includes('--skip-trims');
const flag = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};

// ---- what the trims are aimed at ----------------------------------------------
//
// Both numbers restate what the song-styles.js header already says, in the form the
// solver needs. They are the pack calibration itself: change one here and every pack
// this is run on moves.

/** Where a pack LANDS. Four of the game's own cabinet songs measure here. */
const TARGET_LUFS = -22.0;

/** How far the kit sits under the music, in LU. Electropop's original balance. */
const BALANCE = -0.8;

/**
 * The packs that are aimed somewhere else, and why they are allowed to be.
 *
 * Techno's kit is MEANT to lead: sparse bleeps and one pad against relentless
 * sixteenths is techno right up to the point where the bass and the chord stop being
 * audible. Anything not named here takes the house balance.
 */
const BALANCE_BY_ID = { techno: 1.5 };

/** A pack does not go through this to make a target — see Boom Bap, which stops short. */
const PEAK_CEILING_DB = -1.0;

/** Two rounds converge, because drumGain and musicTrim interact through the sum. */
const ROUNDS = Number(flag('--rounds') ?? 2);

const dbToLin = (db) => Math.pow(10, db / 20);
const toDb = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
/** Trims are read by people in a data file; six decimals of a render is not a number. */
const trim = (x) => Number(x.toFixed(3));

// ---- the source edits ----------------------------------------------------------

/** The index just past the `}` matching the `{` at `open`. Strings and comments skipped. */
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '\'' || c === '"' || c === '`') {
      const q = c;
      for (i++; i < src.length; i++) { if (src[i] === '\\') { i++; continue; } if (src[i] === q) break; }
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 1; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) return i + 1; }
  }
  return -1;
}

/** The span of one pack's `bank: { … }` block in tools/lib/song-styles.js. */
function bankSpan(src, styleId) {
  const at = src.indexOf(`id: '${styleId}',`);
  if (at === -1) throw new Error(`no pack with id "${styleId}" in tools/lib/song-styles.js`);
  const open = src.indexOf('{', src.indexOf('bank: {', at) + 'bank: '.length);
  const end = matchBrace(src, open);
  if (end < 0) throw new Error(`${styleId}'s bank block is not closed`);
  return [open, end];
}

/**
 * Rewrite keys inside one pack's bank block, in place.
 *
 * Only keys the pack ALREADY states are touched. A key it does not name is a decision
 * it has not made — a pack with no `drumGain` is one whose kit is its instruments, and
 * writing one in because a solver had a number for it would change what the pack is.
 */
function setBankKeys(src, styleId, values) {
  const [open, end] = bankSpan(src, styleId);
  let block = src.slice(open, end);
  const missed = [];
  for (const [key, value] of Object.entries(values)) {
    const re = new RegExp(`(\\b${key}: )(?:'[^']*'|[-\\d.]+)`);
    if (!re.test(block)) { missed.push(key); continue; }
    block = block.replace(re, (_, head) => head + (typeof value === 'string' ? `'${value}'` : value));
  }
  return { src: src.slice(0, open) + block + src.slice(end), missed };
}

/** `roundMono` -> `stRoundMono`. The same rule tools/freeze-starter-voices.js uses. */
const starterId = (id) => `st${id[0].toUpperCase()}${id.slice(1)}`;
const starterLabel = (label) => (/\(starter\)$/.test(label) ? label : `${label} (starter)`);
const pascal = (s) => s[0].toUpperCase() + s.slice(1);

/**
 * The id a sound dialled in on the strip is frozen under.
 *
 * A library pick keeps the library's name, so two packs choosing the same preset share
 * one entry. A song-local edit has no library name to keep — it exists only in that
 * audition's mix — so it is named for the pack and lane that asked for it.
 */
const tweakId = (styleId, laneKey) => `st${pascal(styleId)}${pascal(laneKey)}`;

/** Add or replace one entry in the STARTER table. `kind` is stated: the table is mixed. */
function upsertStarter(src, id, preset) {
  const m = /\bconst STARTER = \{/.exec(src);
  if (!m) throw new Error('src/data/voices.js has no STARTER table to write into');
  const open = m.index + m[0].length - 1;
  const end = matchBrace(src, open);
  const body = emitEntry(id, preset, { derived: ['id', 'level', 'peak', 'cost'] });
  const existing = new RegExp(`^  ${id}: \\{`, 'm').exec(src.slice(open, end));
  if (existing) {
    const from = open + existing.index;
    let to = matchBrace(src, src.indexOf('{', from + id.length + 2));
    if (src[to] === ',') to++;
    return src.slice(0, from) + body.trimStart() + src.slice(to);
  }
  const at = src.lastIndexOf('\n', end - 2) + 1;
  return `${src.slice(0, at)}${body}\n${src.slice(at)}`;
}

// ---- reading the choice --------------------------------------------------------

const laneOfKey = Object.fromEntries(
  Object.entries(VOICE_LANES).map(([lane, seam]) => [seam.voiceKey, lane]),
);

/** The voice keys a pack states, and what they currently name. */
const packVoices = (style) => Object.fromEntries(
  Object.entries(style.bank).filter(([k]) => k.endsWith('Voice')),
);

/**
 * What one audition song asks the pack to become: `{ voiceKey: {id, preset} }`.
 *
 * `mix.voice` is a pick from the library; `mix.voiceParams` a preset edited on the
 * strip, which arrives as a COMPLETE copy rather than a diff — see registerSongVoice —
 * so it can be frozen exactly as a library entry is.
 */
function picksFrom(style, mix) {
  const current = packVoices(style);
  const out = {};
  const skipped = [];
  const keys = new Set([...Object.keys(mix?.voice || {}), ...Object.keys(mix?.voiceParams || {})]);
  for (const key of keys) {
    const lane = laneOfKey[key];
    if (!lane) { skipped.push(`${key} (not a lane)`); continue; }
    const params = mix?.voiceParams?.[key];
    if (params) {
      if (params.kind === 'engine') { skipped.push(`${key} (engine preset)`); continue; }
      const id = tweakId(style.id, lane);
      out[key] = { id, preset: { ...params, label: starterLabel(params.label || id) } };
      continue;
    }
    const picked = mix.voice[key];
    const v = VOICES[picked];
    if (!v) { skipped.push(`${key} (unknown voice "${picked}")`); continue; }
    // A pack may only name TONE, NOISE or DRUM presets: `withVoices` returns early on a
    // song with no mix, which every generated song is, so an engine preset named here
    // would silently do nothing. See the constraint at the foot of the pack notes.
    if (v.kind === 'engine') { skipped.push(`${key} (engine preset "${picked}")`); continue; }
    // Already frozen — a mix can name one even though the picker will not offer it.
    if (v.starter) { out[key] = { id: picked, preset: null }; continue; }
    out[key] = { id: starterId(picked), preset: { ...v, label: starterLabel(v.label) } };
  }
  // Only what actually MOVED, and only for lanes the pack plays.
  const changes = {};
  for (const [key, pick] of Object.entries(out)) {
    if (!(key in current)) { skipped.push(`${key} (this pack has no ${laneOfKey[key]} lane)`); continue; }
    if (current[key] === pick.id && !pick.preset) continue;
    changes[key] = pick;
  }
  return { changes, skipped, current };
}

// ---- the trims, re-derived -----------------------------------------------------

const KIT = new Set(LANES.filter((l) => l.group === 'drums').map((l) => l.key));
const MUSIC = new Set(LANES.filter((l) => l.group !== 'drums').map((l) => l.key));

/**
 * Render a pack's full-band starter and read where it lands.
 *
 * No mix and no track id — every fader at 0 dB, which is the state a new scratch song
 * is in and so the only state the pack's own numbers can be measured in.
 */
async function measurePack(render, bank, lanes) {
  const out = await render(bank, { repeat: 1, mix: null, trackId: null, ...(lanes ? { lanes } : {}) });
  const { lufs } = loudness([out.outL, out.outR]);
  return { lufs, peakDb: toDb(out.peak) };
}

/**
 * `musicTrim` and `drumGain` for one pack, by rendering it.
 *
 * `drumGain` moves by the error in kit-minus-music, `musicTrim` by the error in the
 * full mix — the procedure in the song-styles.js header, run twice because moving the
 * kit moves the sum that the other one is measuring.
 */
async function solveTrims(render, style, voices, log) {
  const { bank } = newSongPlan({
    style: style.id, template: 'full-band', bars: 8, seed: AUDITION_SEED,
  });
  const base = { ...bank, ...voices };
  const wantBalance = BALANCE_BY_ID[style.id] ?? BALANCE;
  // A pack that states no drumGain has not made that decision — leave it unmade.
  const hasDrums = 'drumGain' in style.bank
    && [...KIT].some((k) => bank.sections?.[0]?.[k] || bank[k]);
  let musicTrim = base.musicTrim ?? 1;
  let drumGain = base.drumGain ?? 1;

  let full;
  for (let round = 1; round <= ROUNDS; round++) {
    const at = { ...base, musicTrim, drumGain };
    full = await measurePack(render, at);
    if (hasDrums) {
      const kit = await measurePack(render, at, KIT);
      const music = await measurePack(render, at, MUSIC);
      const balance = kit.lufs - music.lufs;
      drumGain *= dbToLin(wantBalance - balance);
      log(`    round ${round}: ${full.lufs.toFixed(2)} LUFS, kit ${balance >= 0 ? '+' : ''}`
        + `${balance.toFixed(2)} LU vs music (want ${wantBalance >= 0 ? '+' : ''}${wantBalance.toFixed(2)})`);
    } else {
      log(`    round ${round}: ${full.lufs.toFixed(2)} LUFS, no kit to balance`);
    }
    musicTrim *= dbToLin(TARGET_LUFS - full.lufs);
  }

  // The last correction has not been heard yet — and the ceiling is read off the render
  // that includes it, because a pack does not go through -1 dBFS to make a target.
  const final = await measurePack(render, { ...base, musicTrim, drumGain });
  let capped = null;
  if (final.peakDb > PEAK_CEILING_DB) {
    musicTrim *= dbToLin(PEAK_CEILING_DB - final.peakDb);
    capped = final.peakDb;
  }
  return {
    musicTrim: trim(musicTrim),
    ...(hasDrums ? { drumGain: trim(drumGain) } : {}),
    lufs: final.lufs, peakDb: final.peakDb, capped,
  };
}

// ---- what to run over ----------------------------------------------------------

const only = flag('--style');
if (only && !STYLE_BY_ID[only]) {
  console.error(`no style "${only}" — one of: ${SONG_STYLES.map((s) => s.id).join(', ')}`);
  process.exit(1);
}
const wanted = only ? [STYLE_BY_ID[only]] : SONG_STYLES;

/** The audition song a pack's choice is read from, and the mix saved on it. */
async function auditionMix(style) {
  const id = flag('--from') || auditionId(style.id);
  const file = join(ROOT, IMPORTED_DIR, `${id}.js`);
  if (!existsSync(file)) return { id, missing: true };
  const mod = await import(`${pathToFileURL(file).href}?adopt=${Date.now()}`);
  return { id, mix: mod.mix || null };
}

const jobs = [];
for (const style of wanted) {
  if (TRIMS_ONLY) { jobs.push({ style, changes: {}, current: packVoices(style) }); continue; }
  const { id, missing, mix } = await auditionMix(style);
  if (missing) {
    if (only) {
      console.error(`no audition song for "${style.id}" — run: node tools/style-auditions.js --style ${style.id}`);
      process.exit(1);
    }
    continue;
  }
  if (!mix?.voice && !mix?.voiceParams) {
    if (only) console.log(`${style.id}: ${id} has no voice choices saved on it — nothing to adopt`);
    continue;
  }
  const { changes, skipped, current } = picksFrom(style, mix);
  jobs.push({ style, from: id, changes, skipped, current });
}

if (!jobs.length) {
  console.log('nothing to adopt: no audition song carries a voice choice.');
  console.log('  node tools/style-auditions.js      writes them');
  process.exit(0);
}

// ---- report --------------------------------------------------------------------

const fresh = new Map();          // starter id -> preset to freeze
let moves = 0;
for (const job of jobs) {
  const keys = Object.keys(job.changes);
  console.log(`\n${job.style.label} (${job.style.id})${job.from ? `  from ${job.from}` : ''}`);
  if (!keys.length) console.log('  voices: unchanged');
  for (const key of keys) {
    const pick = job.changes[key];
    console.log(`  ${key.padEnd(18)} ${job.current[key]}  ->  ${pick.id}`);
    if (pick.preset && !fresh.has(pick.id)) fresh.set(pick.id, pick.preset);
    moves++;
  }
  for (const s of job.skipped || []) console.log(`  skipped: ${s}`);
}

if (DRY) {
  console.log(`\n--dry: ${moves} voice change(s), ${fresh.size} preset(s) would be frozen.`);
  if (!TRIMS_ONLY) console.log('Trims are not measured in a dry run — they need the frozen entries on disk.');
}

// ---- write the sounds, then measure them ---------------------------------------

if (!DRY && moves) {
  let src = readVoicesSource();
  for (const [id, preset] of fresh) src = upsertStarter(src, id, preset);
  writeVoicesSource(src);

  let styles = readFileSync(STYLES_FILE, 'utf8');
  for (const job of jobs) {
    const values = Object.fromEntries(Object.entries(job.changes).map(([k, v]) => [k, v.id]));
    if (!Object.keys(values).length) continue;
    const next = setBankKeys(styles, job.style.id, values);
    for (const key of next.missed) console.log(`  ** ${job.style.id}: no ${key} in the pack to repoint`);
    styles = next.src;
  }
  writeFileSync(STYLES_FILE, styles);
  console.log(`\nwrote ${fresh.size} starter preset(s) and repointed ${moves} pack reference(s)`);
}

// A preset with no level is one `voiceGain` divides a lane's target by 0 for, and the
// measure is what /voice-save calls "not optional and not a nicety". Renderer opened
// AFTER the write, because the page bundle is built from the files as they stand.
if (!DRY && fresh.size) {
  const renderer = await openRenderer();
  try {
    const measured = await import(`${pathToFileURL(join(ROOT, 'src/data/voices.js')).href}?adopt=${Date.now()}`);
    let src = readVoicesSource();
    for (const id of fresh.keys()) {
      const v = measured.VOICES[id];
      const lane = homeLane(v);
      const { level, peak } = await measureVoiceAt(renderer.render, v, lane);
      if (!(level > 0)) {
        console.log(`  ** ${id} renders SILENT on ${lane} — left unmeasured, check it on the desk`);
        continue;
      }
      src = setMeasured(src, id, { level, peak });
      console.log(`  measured ${id.padEnd(20)} level ${level.toFixed(6)}  peak ${peak.toFixed(4)}`
        + (level < 0.0004 ? '  ** very quiet: check its envelope **' : ''));
    }
    writeVoicesSource(src);
  } finally {
    await renderer.close();
  }
}

// ---- and the trims, against the sounds that are now there ----------------------

if (SKIP_TRIMS) {
  console.log('\n--skip-trims: the packs touched here now have STALE musicTrim/drumGain.');
  console.log('Run: node tools/adopt-style-voices.js --trims-only --style <id>');
} else if (!DRY || TRIMS_ONLY) {
  const touched = jobs.filter((j) => TRIMS_ONLY || Object.keys(j.changes).length);
  if (touched.length) {
    console.log(`\nre-measuring trims for ${touched.length} pack(s) — ${TARGET_LUFS} LUFS, `
      + `kit ${BALANCE} LU under the music:`);
    // A second renderer: the first was built before the levels were spliced in, and a
    // trim measured against an unlevelled preset is measuring the wrong sound.
    const renderer = await openRenderer();
    let styles = readFileSync(STYLES_FILE, 'utf8');
    try {
      for (const job of touched) {
        console.log(`  ${job.style.label}`);
        const voices = Object.fromEntries(
          Object.entries(job.changes).map(([k, v]) => [k, v.id]),
        );
        const out = await solveTrims(renderer.render, job.style, voices, (s) => console.log(s));
        const was = { musicTrim: job.style.bank.musicTrim, drumGain: job.style.bank.drumGain };
        const parts = [`musicTrim ${was.musicTrim} -> ${out.musicTrim}`];
        if ('drumGain' in out) parts.push(`drumGain ${was.drumGain} -> ${out.drumGain}`);
        console.log(`    ${parts.join(', ')}`);
        // What the numbers being written actually measure. Printed rather than
        // trusted: two rounds converge on the packs as they stand, and a pack whose
        // sounds moved a long way is exactly the one that might need a third.
        console.log(`    lands on ${out.lufs.toFixed(2)} LUFS, peak ${out.peakDb.toFixed(2)} dBFS`);
        if (!out.capped && Math.abs(out.lufs - TARGET_LUFS) > 0.3) {
          console.log('    ** still off target — run this again for another round');
        }
        if (out.capped) {
          console.log(`    ** peak reached ${out.capped.toFixed(2)} dBFS — held at ${PEAK_CEILING_DB}, `
            + 'so this pack lands short of the target (as Boom Bap does)');
        }
        if (!DRY) {
          const next = setBankKeys(styles, job.style.id, {
            musicTrim: out.musicTrim, ...('drumGain' in out ? { drumGain: out.drumGain } : {}),
          });
          for (const key of next.missed) console.log(`    ** no ${key} in the pack to write`);
          styles = next.src;
        }
      }
      if (!DRY) writeFileSync(STYLES_FILE, styles);
    } finally {
      await renderer.close();
    }
  }
}

if (!DRY) {
  console.log('\nDone. src/data/voices.js and tools/lib/song-styles.js are rewritten;');
  console.log('play the audition again — it should sound identical, now from the pack.');
}
