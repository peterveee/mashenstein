// MAKE A BANGER — what the levels are predicted from, and how well they land. 2 Oct 2026.
//
// tools/lib/banger/levels.js sets every banger channel's fader as the banger is made, from
// a prediction: what the part plays, on what sound, against the part the channel's settings
// were set for. This writes what that prediction reads (tools/lib/banger/levels-data.js)
// and checks it against real renders.
//
//   node tools/banger-levels.js refs              the part every style's every channel was set
//                                                 for, read out of the seed remixes and the
//                                                 styles' own default bangers. No rendering.
//   node tools/banger-levels.js curves            how loud one note of each banger sound is at
//                                                 three lengths and four pitches. Renders; a
//                                                 measured preset is skipped until it changes.
//         --all                                   every tone preset in the library
//         --fresh                                 measure again even if unchanged
//         --highs                                 only add what gets past the widener's low cut
//                                                 to the curves there are (four renders each)
//   node tools/banger-levels.js check [style …]   render the reference parts and a few test
//                                                 bangers part by part: how far each part
//                                                 landed from its reference, before levelling
//                                                 and after. Report-only. A style here is any
//                                                 recipe — a flavour or Sound Set too, which
//                                                 is matched to its base's references unless
//                                                 it has its own.
//         --bangers=N                             test bangers per style (default 2)
//         --riff=song:a-b                         make them from these bars instead (e.g. crypt:5-8)
//         --fit                                   and fold each channel's average miss into
//                                                 `offsets`
//
// Renders take a machine-wide render slot (tools/lib/render-slots.js) and run niced, so a
// batch never pegs the machine somebody is listening on. The check's result is also written
// to work/local/reports/banger-levels.json.
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { setPriority } from 'node:os';
import { laneList } from '../src/engine/lanes.js';
import { VOICES, VOICE_LANES, voiceGain, PERCUSSION_LANES, seamFor } from '../src/data/voices.js';
import { resolveTrack } from './lib/tracks.js';
import { extractRiff } from './lib/banger/riff.js';
import { generateBanger } from './lib/banger/index.js';
import { BANGER_STYLES, BANGER_RECIPES } from './lib/banger/styles/index.js';
import { BANGER_SOUNDS } from './lib/banger/sounds.js';
import { BANGER_COMBOS } from './lib/banger/combos.js';
import { libraryCurveId, copyCurveKey, CURVE_SECONDS, CURVE_MIDI, CURVE_PITCH_SECONDS } from './lib/banger/levels.js';
import {
  readLevelData, writeLevelData, songFrom, songAt, buildAllRefs, defaultBangerSong, LEVEL_DATA_FILE, CHANNELS_FILE,
} from './lib/banger-refs.js';
import { oneNote, homeLane } from './lib/measure-voice.js';
import { noteLevel, loudness } from './lib/loudness.js';
import { MADE_SIDE } from '../src/engine/effects.js';
import { takeRenderSlot, releaseRenderSlot } from './lib/render-slots.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(ROOT, LEVEL_DATA_FILE);
const REPORT = join(ROOT, 'work/local/reports/banger-levels.json');
const argv = process.argv.slice(2);
const command = argv[0];
const has = (name) => argv.includes(`--${name}`);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const named = argv.slice(1).filter((a) => !a.startsWith('--'));
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------- the data file
const readData = () => readLevelData(ROOT);
const writeData = (d) => writeLevelData(ROOT, d);
const seedSong = (id) => songAt(ROOT, 'src/data/imported', id);

// ---------------------------------------------------------------- refs
async function buildRefs() {
  const data = await readData();
  const { BANGER_CHANNELS } = await import(`${pathToFileURL(join(ROOT, CHANNELS_FILE)).href}?v=${Date.now()}`);
  let last = null;
  data.refs = await buildAllRefs(ROOT, {
    channels: BANGER_CHANNELS,
    log: (style, job, why, ref) => {
      if (style !== last) { console.log(`\n${style.label}`); last = style; }
      const strip = style.strips[job]?.gain ?? 0;
      const gain = Number.isFinite(ref.gain) ? ref.gain : strip;
      const note = Number.isFinite(ref.gain) && ref.gain !== strip ? `   (the recipe says ${strip})` : '';
      console.log(`  ${job.padEnd(10)} ${why.padEnd(12)} ${String(gain).padStart(6)} dB  ${ref.from}${note}`);
    },
  });
  writeData(data);
  console.log(`\nwrote the reference parts into ${LEVEL_DATA_FILE}`);
}

// ---------------------------------------------------------------- curves
let renderer = null;
const render = async (bank, opts) => {
  if (!renderer) {
    const { openRenderer } = await import('./lib/render-bank-browser.js');
    renderer = await openRenderer();
  }
  await takeRenderSlot();
  try { return await renderer.render(bank, opts); } finally { releaseRenderSlot(); }
};

const defHash = (v) => createHash('sha1').update(JSON.stringify({ ...v, level: undefined, peak: undefined })).digest('hex').slice(0, 12);
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

/**
 * One note of `v` at unity: `steps` long (at 120 BPM) at `hz` — the catalogue's bench and
 * arithmetic (tools/lib/measure-voice.js). A song's copy is played the way that bench plays
 * one: from the mix's voiceParams. `db` is its level; `high` how much of its middle gets
 * past the Stereo Widener's low cut (see highPast).
 */
async function noteOut(v, lane, steps, hz, copy = false) {
  const seam = VOICE_LANES[lane];
  const bank = copy ? oneNote(lane, v) : { ...oneNote(lane, v), [seam.voiceKey]: v.id };
  if (seam.durKey) bank[seam.durKey] = steps;
  bank[lane] = bank[lane].slice();
  bank[lane][0] = Array.isArray(bank[lane][0]) ? [hz] : hz;
  const out = await render(bank, { repeat: 1, mix: copy ? { voiceParams: { [seam.voiceKey]: v } } : null, trackId: null });
  const applied = voiceGain(v, lane) * 10 ** ((v.trim ?? 0) / 20);
  const level = noteLevel([out.outL, out.outR]) / applied;
  return { db: level > 0 ? 20 * Math.log10(level) : null, high: highPast(out.outL, out.outR) };
}
const noteAt = async (...args) => (await noteOut(...args)).db;

/**
 * How much of a render's middle, as energy, gets past the low cut on the side the Stereo
 * Widener makes past WIDTH 0.5: the cut the engine builds (MADE_SIDE in
 * src/engine/effects.js), the same biquad — Web Audio's
 * highpass, Robert Bristow-Johnson's — run here over the middle. Its delay moves nothing's
 * energy, so it is left out.
 */
function highPast(outL, outR, sr = 44100) {
  const w0 = (2 * Math.PI * MADE_SIDE.lowCutHz) / sr;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * MADE_SIDE.lowCutQ);
  const a0 = 1 + alpha;
  const b0 = (1 + cos) / 2 / a0; const b1 = -(1 + cos) / a0; const b2 = b0;
  const a1 = (-2 * cos) / a0; const a2 = (1 - alpha) / a0;
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0; let all = 0; let past = 0;
  for (let i = 0; i < outL.length; i++) {
    const x = (outL[i] + outR[i]) / 2;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    all += x * x; past += y * y;
  }
  return all > 0 ? past / all : 0;
}

/** How much of one note's energy is in the sides — what a channel's widener acts on (0 mono, 1 all sides). */
async function sideAt(v, lane, copy = false) {
  const seam = VOICE_LANES[lane];
  const bank = copy ? oneNote(lane, v) : { ...oneNote(lane, v), [seam.voiceKey]: v.id };
  if (seam.durKey) bank[seam.durKey] = CURVE_PITCH_SECONDS / 0.125;
  const out = await render(bank, { repeat: 1, mix: copy ? { voiceParams: { [seam.voiceKey]: v } } : null, trackId: null });
  let m = 0; let s = 0;
  for (let i = 0; i < out.outL.length; i++) {
    const mid = (out.outL[i] + out.outR[i]) / 2;
    const side = (out.outL[i] - out.outR[i]) / 2;
    m += mid * mid; s += side * side;
  }
  return m + s > 0 ? s / (m + s) : 0;
}

async function measureCurves() {
  const data = await readData();
  const ids = new Set();
  const add = (id) => { if (id && VOICES[id] && ['tone', 'noise'].includes(VOICES[id].kind)) ids.add(id); };
  if (has('all')) Object.keys(VOICES).forEach(add);
  for (const st of Object.values(BANGER_SOUNDS)) {
    Object.values(st.parts || {}).forEach(add);
    Object.values(st.random || {}).flat().forEach(add);
    Object.values(st.choices || {}).flat().forEach(add);
    for (const m of Object.values(st.moods || {})) Object.values(m.parts || {}).forEach(add);
  }
  for (const combos of Object.values(BANGER_COMBOS)) for (const combo of Object.values(combos)) Object.values(combo.sounds?.parts || {}).forEach(add);
  for (const st of Object.values(data.refs)) for (const ref of Object.values(st)) { add(ref.voice?.id); add(ref.voice?.copyOf); }
  // The songs' own EDITED copies of presets — what a riff from a cabinet is usually played
  // on — keyed by their sound. The game's songs and the seeds always; every imported song
  // and remix with --songs=all.
  const copies = new Map();
  const songDirs = has('songs=all') || flag('songs') === 'all' ? ['src/data/songs', 'src/data/imported'] : ['src/data/songs'];
  const files = [];
  for (const dir of songDirs) for (const f of readdirSync(join(ROOT, dir))) if (f.endsWith('.js') && f !== 'index.js') files.push(join(dir, f));
  for (const style of BANGER_STYLES) if (style.seed) files.push(`src/data/imported/${style.seed.song}.js`);
  for (const rel of [...new Set(files)]) {
    let m;
    try { m = await import(pathToFileURL(join(ROOT, rel)).href); } catch { continue; }
    for (const [vk, p] of Object.entries(m.mix?.voiceParams || {})) {
      if (!p || !['tone', 'noise', undefined].includes(p.kind) || libraryCurveId(p)) continue;
      if (PERCUSSION_LANES.includes(homeLane(p))) continue;
      const key = copyCurveKey(p);
      if (!copies.has(key)) copies.set(key, { p, from: `${rel.split('/').pop().slice(0, -3)} ${vk}` });
    }
  }
  const todo = [...ids].sort().filter((id) => has('fresh') || data.curves[id]?.def !== defHash(VOICES[id])
    || data.curves[id]?.lens?.length !== CURVE_SECONDS.length);
  const copyTodo = [...copies.keys()].filter((k) => has('fresh') || data.curves[k]?.lens?.length !== CURVE_SECONDS.length);
  // A curve measured before it carried its stereo width only needs that one render.
  const sideTodo = [...ids, ...copies.keys()].filter((k) => data.curves[k] && !todo.includes(k) && !copyTodo.includes(k)
    && !Number.isFinite(data.curves[k].side));
  try {
    for (const k of sideTodo) {
      const copy = copies.get(k) || null;
      const v = copy ? copy.p : VOICES[k];
      const lane = homeLane(v);
      if (PERCUSSION_LANES.includes(lane)) continue;
      data.curves[k].side = r2(await sideAt(v, lane, !!copy));
    }
    if (sideTodo.length) { writeData(data); console.log(`added the stereo width to ${sideTodo.length} curves`); }
    // And one measured before the widener made sides (2 Oct 2026) needs its four pitches again for what
    // gets past its low cut — a beat each, as the pitches are measured.
    const highTodo = [...ids, ...copies.keys()].filter((k) => data.curves[k] && !todo.includes(k) && !copyTodo.includes(k)
      && data.curves[k].highs?.length !== CURVE_MIDI.length);
    let h = 0;
    for (const k of highTodo) {
      const copy = copies.get(k) || null;
      const v = copy ? copy.p : VOICES[k];
      const lane = homeLane(v);
      if (PERCUSSION_LANES.includes(lane)) continue;
      const highs = [];
      for (const m of CURVE_MIDI) highs.push(r2((await noteOut(v, lane, CURVE_PITCH_SECONDS / 0.125, midiHz(m), !!copy)).high));
      data.curves[k].highs = highs;
      if (++h % 10 === 0) writeData(data);
    }
    if (highTodo.length) { writeData(data); console.log(`added what gets past the widener's low cut to ${h} curves`); }
  } catch (err) {
    if (renderer) await renderer.close();
    throw err;
  }
  // --highs: only that, on the curves there are, and nothing measured afresh.
  if (has('highs')) {
    if (renderer) await renderer.close();
    return;
  }
  console.log(`${ids.size} sounds and ${copies.size} edited song copies; ${todo.length + copyTodo.length} to measure`
    + ` (${CURVE_SECONDS.length} lengths, ${CURVE_MIDI.length} pitches each)`);
  let n = 0;
  try {
    for (const id of [...todo, ...copyTodo]) {
      const copy = copies.get(id) || null;
      const v = copy ? copy.p : VOICES[id];
      const lane = homeLane(v);
      if (PERCUSSION_LANES.includes(lane)) continue;
      const A2 = midiHz(CURVE_MIDI[1]);
      const lens = [];
      let beatHigh = null;
      for (const s of CURVE_SECONDS) {
        const o = await noteOut(v, lane, s / 0.125, A2, !!copy);
        lens.push(o.db);
        if (s === CURVE_PITCH_SECONDS) beatHigh = o.high;
      }
      const beat = lens[CURVE_SECONDS.indexOf(CURVE_PITCH_SECONDS)];
      const pitches = [];
      const highs = [];
      for (const m of CURVE_MIDI) {
        const o = m === CURVE_MIDI[1] ? { db: beat, high: beatHigh } : await noteOut(v, lane, CURVE_PITCH_SECONDS / 0.125, midiHz(m), !!copy);
        pitches.push(o.db);
        highs.push(r2(o.high));
      }
      n++;
      if ([...lens, ...pitches].some((x) => x == null)) {
        console.log(`  ${(copy ? copy.from : id).padEnd(22)} SILENT somewhere — not kept`);
        continue;
      }
      const side = r2(await sideAt(v, lane, !!copy));
      data.curves[id] = copy
        ? { lens: lens.map(r2), pitches: pitches.map(r2), side, highs, def: id, label: v.label || null, from: copy.from }
        : { lens: lens.map(r2), pitches: pitches.map(r2), side, highs, def: defHash(v) };
      const catalogue = v.level > 0 ? 20 * Math.log10(v.level) : null;
      console.log(`  ${(copy ? `${copy.from} (${v.label || 'copy'})` : id).padEnd(22)} length ${lens.map((x) => x.toFixed(1).padStart(6)).join('')}   pitch ${pitches.map((x) => (x - beat).toFixed(1).padStart(6)).join('')}`
        + `${catalogue != null ? `   catalogue ${catalogue.toFixed(1)}` : ''}`);
      // Kept as it goes: a long batch stopped half way keeps what it measured.
      if (n % 10 === 0) writeData(data);
    }
  } finally {
    writeData(data);
    if (renderer) await renderer.close();
  }
  console.log(`\nmeasured ${n}; wrote ${DATA_FILE.slice(ROOT.length + 1)}`);
}

// ---------------------------------------------------------------- check
// The riffs the test bangers are made from — a one-bar hook, a two-bar band, a four-bar
// tune — every other one with Riff Sound on Random.
const TEST_RIFFS = [['frost', 1, 1], ['plumber', 1, 2], ['neon', 9, 12]];

async function riffFrom(songId, a, b) {
  const track = resolveTrack(songId);
  if (!track) throw new Error(`no song called ${songId}`);
  let mod = { bank: track.bank, mix: null, arrangement: null };
  for (const dir of ['src/data/songs', 'src/data/imported', 'work/scratch', 'work/bangers']) {
    try {
      const m = await import(pathToFileURL(join(ROOT, dir, `${songId}.js`)).href);
      mod = { bank: track.bank, mix: m.mix ?? null, arrangement: m.arrangement ?? null };
      break;
    } catch { /* not in this drawer */ }
  }
  const song = await songFrom(mod, songId);
  return extractRiff({
    bank: song.bank, draft: song.draft, mix: song.mix, from: a - 1, to: b - 1,
    laneKeys: laneList(song.bank).map((l) => l.key), source: { id: songId, title: track.title },
  });
}

/** Every lane a song has, so all but one can be muted. */
const lanesOf = (song) => [...new Set([
  ...laneList(song.bank).map((l) => l.key), ...(song.mix.layers || []).map((l) => l.key), ...Object.keys(song.mix.lanes || {}),
])];

/**
 * The bank with every lane but `lane` taken out — and the lane a linked layer reads its
 * notes from, which stays, muted in the mix. Taken out rather than muted: a muted lane is
 * still scheduled, and a solo of a full banger then costs as much as the whole song.
 */
function soloBank(song, lane) {
  const layer = (song.mix.layers || []).find((l) => l.key === lane);
  const keep = new Set([lane, layer && !layer.independent ? layer.from : null].filter(Boolean));
  const drop = lanesOf(song).filter((k) => !keep.has(k));
  const strip = (o) => {
    const out = { ...o };
    for (const k of drop) { delete out[k]; delete out[`${k}Len`]; }
    return out;
  };
  const bank = strip(song.raw.bank);
  if (song.raw.bank.sections) bank.sections = song.raw.bank.sections.map(strip);
  return bank;
}

/**
 * How loud one lane plays over bars `w` (0-based, inclusive), alone, through no master
 * processing and none of the song's automation: LUFS, with the song's own trim taken back
 * out so songs compare. `patch` edits the solo mix (another sound, another fader).
 */
async function soloLevel(song, lane, w, patch = null) {
  const mix = structuredClone(song.mix || {});
  mix.lanes ||= {};
  for (const k of lanesOf(song)) if (k !== lane) mix.lanes[k] = { ...(mix.lanes[k] || {}), mute: true };
  mix.lanes[lane] = { ...(mix.lanes[lane] || {}), mute: false, solo: false };
  mix.masterEffects = [];
  mix.master = 0;
  if (patch) patch(mix);
  const arrangement = { ...(song.arrangement || {}) };
  delete arrangement.automation;
  const r = await render(soloBank(song, lane), {
    mix, trackId: song.id, arrangement, range: { startStep: w[0] * 16, endStep: (w[1] + 1) * 16 }, tail: 1,
  });
  const { lufs } = loudness([r.outL, r.outR]);
  return lufs - 20 * Math.log10(song.raw.bank.musicTrim ?? 1);
}

/** Put a sound on a lane of a mix: a song copy, or a library preset — and never leave the other behind, since a copy wins. */
function setSound(mix, vk, { voice = null, voiceParams = null } = {}) {
  mix.voice = { ...(mix.voice || {}) };
  mix.voiceParams = { ...(mix.voiceParams || {}) };
  delete mix.voice[vk];
  delete mix.voiceParams[vk];
  if (voiceParams) mix.voiceParams[vk] = voiceParams;
  else if (voice) mix.voice[vk] = voice;
}

async function check() {
  const data = await readData();
  for (const id of named) if (!BANGER_RECIPES.some((s) => s.id === id)) throw new Error(`no style, flavour or Sound Set called ${id}`);
  const styles = named.length ? BANGER_RECIPES.filter((s) => named.includes(s.id)) : BANGER_RECIPES;
  // What levels.js matches a recipe to: its own references and offsets, else its base's.
  const refsOf = (style) => data.refs[style.id] || data.refs[style.base] || {};
  const baseOf = new Map(styles.map((s) => [s.id, s.base]));
  const count = Math.max(1, Number(flag('bangers') || 2));
  const report = { at: new Date().toISOString(), styles: {} };
  const refLevels = new Map();   // ref.from -> measured LUFS
  const seeds = new Map();
  const defaults = new Map();
  /** A reference part's measured level, rendered in the song it was read from. */
  const refLevel = async (ref) => {
    if (refLevels.has(ref.from)) return refLevels.get(ref.from);
    let song;
    if (ref.song) {
      if (!seeds.has(ref.song)) seeds.set(ref.song, await seedSong(ref.song));
      song = seeds.get(ref.song);
    } else {
      const owner = BANGER_STYLES.find((s) => s.id === ref.style);
      if (!owner) return null;
      const key = `${owner.id}:${ref.variant ?? 0}`;
      if (!defaults.has(key)) defaults.set(key, defaultBangerSong(owner, ref.variant ?? 0));
      song = defaults.get(key);
    }
    const level = await soloLevel(song, ref.lane, ref.window);
    refLevels.set(ref.from, level);
    return level;
  };

  const misses = {};   // style -> job -> [miss after]
  try {
    for (const style of styles) {
      const rows = [];
      console.log(`\n${style.label.toUpperCase()}`);
      for (let i = 0; i < count; i++) {
        const pick = /^([\w-]+):(\d+)-(\d+)$/.exec(flag('riff') || '');
        const [songId, a, b] = pick ? [pick[1], Number(pick[2]), Number(pick[3])] : TEST_RIFFS[i % TEST_RIFFS.length];
        const riffSound = i % 2 ? 'random' : 'keep';
        const riff = await riffFrom(songId, a, b);
        const out = generateBanger({ riff, options: { style: style.id, parts: { riffSound } }, seed: 1 + i });
        const song = await songFrom({ bank: out.bank, mix: out.mix, arrangement: out.arrangement, title: out.title }, `levels-check-${style.id}-${i}`);
        console.log(`  ${out.title} (${songId} ${a}–${b}, Riff Sound ${riffSound}, seed ${1 + i}) — ${out.levels.length} channels levelled`);
        for (const row of out.levels) {
          const w = row.window;
          const vk = seamFor(row.lane)?.voiceKey || `${row.lane}Voice`;
          const measured = await soloLevel(song, row.lane, w);
          let target = null;
          if (row.job.startsWith('riff:')) {
            // The riff's own sound, on the same notes, at the fader it had before.
            const p = riff.parts.find((x) => `riff:${x.key}` === row.job);
            target = await soloLevel(song, row.lane, w, (mix) => {
              setSound(mix, vk, p);
              mix.lanes[row.lane].gain = row.before;
            });
          } else if (row.how === 'part') {
            const ref = refsOf(style)[row.job];
            target = ref ? await refLevel(ref) : null;
          } else {
            // A drum on another kit: the banger's pattern on the reference's sound and fader.
            const ref = refsOf(style)[row.job];
            if (!ref?.voice?.id || (ref.voice.id === out.mix.voice?.[vk] && !out.mix.voiceParams?.[vk])) continue;
            target = await soloLevel(song, row.lane, w, (mix) => {
              setSound(mix, vk, { voice: ref.voice.id });
              mix.lanes[row.lane].gain = Number.isFinite(ref.gain) ? ref.gain : row.before;
            });
          }
          if (target == null || !Number.isFinite(measured)) continue;
          const after = measured - target;
          const before = after - row.move;
          rows.push({ banger: i, ...row, measured: r1(measured), target: r1(target), missBefore: r1(before), missAfter: r1(after) });
          ((misses[style.id] ||= {})[row.job.startsWith('riff:') ? 'riff' : row.job] ||= []).push(after);
          console.log(`    ${row.job.padEnd(14)} ${row.how.padEnd(5)} fader ${String(row.before).padStart(6)} → ${String(row.after).padStart(6)}`
            + `   off its reference by ${before >= 0 ? '+' : ''}${before.toFixed(1)} before, ${after >= 0 ? '+' : ''}${after.toFixed(1)} after`);
        }
      }
      const mean = (xs) => xs.reduce((s, x) => s + Math.abs(x), 0) / (xs.length || 1);
      const summary = { before: r1(mean(rows.map((r) => r.missBefore))), after: r1(mean(rows.map((r) => r.missAfter))), rows: rows.length };
      console.log(`  mean miss: ${summary.before} dB before levelling, ${summary.after} dB after (${rows.length} channels)`);
      report.styles[style.id] = { summary, rows };
    }
  } finally {
    if (renderer) await renderer.close();
  }
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, JSON.stringify(report, null, 1));
  console.log(`\nreport: ${REPORT.slice(ROOT.length + 1)}`);

  if (has('fit')) {
    for (const [st, jobs] of Object.entries(misses)) {
      // A flavour's own offsets replace its base's whole (levels.js), so it starts from them.
      const offsets = { ...(data.offsets[st] || data.offsets[baseOf.get(st)] || {}) };
      for (const [job, xs] of Object.entries(jobs)) {
        // The riff's own parts, the hook among them, are matched sound for sound — no offset.
        if (job === 'riff' || job === 'hook') continue;
        const sorted = [...xs].sort((x, y) => x - y);
        const median = sorted[Math.floor(sorted.length / 2)];
        if (Math.abs(median) < 0.5) continue;
        offsets[job] = r1(Math.max(-4, Math.min(4, (offsets[job] ?? 0) - median)));
      }
      data.offsets[st] = offsets;
    }
    writeData(data);
    console.log(`folded the misses into the offsets in ${DATA_FILE.slice(ROOT.length + 1)}`);
  }
}

// ---------------------------------------------------------------- go
try { setPriority(10); } catch { /* not allowed here; run as it is */ }
if (command === 'refs') await buildRefs();
else if (command === 'curves') await measureCurves();
else if (command === 'check') await check();
else {
  console.error('usage: node tools/banger-levels.js refs | curves [--all] [--fresh] [--highs] [--songs=all] | check [style …] [--bangers=N] [--fit]');
  process.exit(1);
}
