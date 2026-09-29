// HOW MUCH BASS EACH CABINET SONG HAS, against the others. A report — it never
// writes a song.
//
// Why it exists: tools/song-levels.js puts every cabinet on the same loudness, and
// matched loudness is not matched balance. Measured on 27 Sep 2026 at -21 LUFS,
// Neon's 60-150Hz sat ~3dB under the rest (its top end is ~8dB brighter, and at a
// fixed loudness that brightness is spent where the bass would be) while Crypt
// carried 8-18dB more sub under 60Hz than any other song. Neither is visible on a
// loudness meter, and both change how a cue lands on that stage.
//
// WHAT IT MEASURES. Each song rendered through the game's own engine, split into
// seven bands, each band's level in dB RELATIVE TO THE SONG'S OWN LOUDNESS (LUFS,
// tools/lib/loudness.js). So the numbers do not care where a song's master sits:
// they say what share of the loudness each region of the spectrum is carrying.
// Every song is then compared with the median of the finished cabinets.
//
// WHAT TO DO WITH IT. Nothing automatic, on purpose: a master shelf moves the kick
// and the bass line together, and the right fix is usually one channel's EQ. So
// `--lanes` solos every lane of the named songs and says which of them carry the
// low end — that is the strip the Channel EQ goes on.
//
// CACHED. A song whose file, mix and arrangements have not changed is not rendered
// again: `node tools/bass-report.js neon` after a neon EQ tweak renders neon alone
// and compares it with the cached others. --fresh ignores the cache.
//
// Usage:
//   node tools/bass-report.js                    every song that ships (9 cabinets, 5 themes)
//   node tools/bass-report.js neon crypt         just those; the others keep their last rows
//   node tools/bass-report.js neon --lanes       ...and which lanes carry neon's low end
//   node tools/bass-report.js --lanes            lanes for EVERY song — hours, not minutes
//   node tools/bass-report.js --fresh            re-render everything
//   node tools/bass-report.js --repeats 2        longer renders (default 1 loop pass)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRenderer, SR } from './lib/render-bank-browser.js';
import { resolveOrExit } from './lib/tracks.js';
import { loudness } from './lib/loudness.js';
import { bandEnergies } from './lib/spectrum.js';
import { adviseSong, adviceText } from './lib/bass-advice.js';
import { activeLanes, deskBank } from '../src/engine/lanes.js';
import { MIX } from '../src/data/mix.js';
import { applyArrangement } from '../src/data/arrangements.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The reference: cabinets whose music is finished, in unlock order. Cardboard,
// Office and Surge are left out until their songs are done — an unfinished mix in
// the median would drag the line toward a song nobody has signed off. Move an id
// in here when its song is finished.
const FINISHED = ['plumber', 'speed', 'rhythm', 'frost', 'crypt', 'neon'];
// The rest of the music that ships, reported against the cabinets but never part
// of their median: between-games songs are allowed to be different, and the report
// says how different.
const THEMES = ['title', 'hub', 'shop', 'finale', 'megamix'];
// Cabinets whose songs are still being written: reported, never in the median.
const UNFINISHED = ['cardboard', 'office', 'surge'];
// Every song that ships, in the order the report lists them. The desk's BASS REPORT
// card offers exactly these as toggles (tools/desk.js), all ticked by default.
const ALL_SONGS = [...FINISHED, ...UNFINISHED, ...THEMES];

const BANDS = [
  ['sub', 20, 60],
  ['bass', 60, 150],
  ['up-bass', 150, 300],
  ['low-mid', 300, 800],
  ['mid', 800, 2500],
  ['presence', 2500, 6000],
  ['air', 6000, 16000],
];
const LOW_BANDS = 3; // sub, bass, up-bass: what --lanes breaks down
// Two dB off the median is where a band starts to be audible as a different
// balance rather than a different song.
const FLAG = 2;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const FRESH = argv.includes('--fresh');
const LANES = argv.includes('--lanes');
const repeats = Math.max(1, Number(flag('repeats', 1)) || 1);
const named = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--repeats');
// The ticked songs: what this run reports (and, with --lanes, breaks down). The
// finished cabinets are always measured as well, cached or not, because the median
// is theirs; a song not ticked keeps its last row on the report.
const ticked = named.length ? named : ALL_SONGS;
const orderOf = (id) => (ALL_SONGS.includes(id) ? ALL_SONGS.indexOf(id) : ALL_SONGS.length);
const songs = [...new Set([...FINISHED, ...ticked])].sort((a, b) => orderOf(a) - orderOf(b));

// ------------------------------------------------------------------- cache
const cacheDir = join(root, 'work/local/bass-report');
const cachePath = join(cacheDir, 'cache.json');
mkdirSync(cacheDir, { recursive: true });
const cache = !FRESH && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};

// What a render depends on that changes day to day: the song's own file, the game
// mix table and the arrangements. The engine changes too, but rarely enough that
// --fresh after an engine change is the honest answer.
function sourceHash(id) {
  const h = createHash('sha1');
  for (const rel of [`src/data/songs/${id}.js`, `src/data/imported/${id}.js`, 'src/data/mix.js', 'src/data/arrangements.js']) {
    const p = join(root, rel);
    if (existsSync(p)) h.update(readFileSync(p));
  }
  return `${h.digest('hex')}:${repeats}`;
}

// ---------------------------------------------------------------- measuring
const dB = (x) => (x > 0 ? 10 * Math.log10(x) : -Infinity);

let renderer = null;
const render = async (track, mix) => {
  renderer ||= await openRenderer();
  return renderer.render(track.bank, {
    repeat: repeats, trackId: track.id, songLoop: true, ...(mix ? { mix } : {}),
  });
};

// A lane is soloed by MUTING every other lane in a copy of the song's own mix, not
// with the renderer's `lanes` gate. The gate strips the engine's base lanes from the
// bank and nothing else, so a desk layer — `bass2`, `kick2`, every `leadN` an import
// adds — plays in every "solo" it renders. A mute is the desk's own, and a song with
// every lane muted renders true silence.
function soloMix(entry, keys, keep) {
  const mix = structuredClone(entry || {});
  mix.lanes ||= {};
  for (const k of keys) if (k !== keep) mix.lanes[k] = { ...(mix.lanes[k] || {}), mute: true };
  return mix;
}

const rows = [];
for (const id of songs) {
  const track = resolveOrExit(id);
  const hash = sourceHash(id);
  if (cache[id]?.hash === hash) {
    rows.push({ id, ...cache[id], cached: true });
    continue;
  }
  process.stderr.write(`rendering ${id}… `);
  const r = await render(track);
  const { lufs } = loudness([r.outL, r.outR], SR);
  const levels = bandEnergies([r.outL, r.outR], SR, BANDS.map(([, lo, hi]) => [lo, hi])).map((e) => dB(e) - lufs);
  cache[id] = { hash, lufs, levels, secs: r.seconds };
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  rows.push({ id, ...cache[id], cached: false });
  process.stderr.write(`${lufs.toFixed(1)} LUFS\n`);
}

// ------------------------------------------------------------------ report
const ref = rows.filter((r) => FINISHED.includes(r.id));
const median = BANDS.map((_, b) => {
  const v = ref.map((r) => r.levels[b]).sort((x, y) => x - y);
  return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
});

const W = 11;
const cell = (s) => String(s).padStart(W);
console.log(`\nband level, dB relative to each song's own loudness (${repeats} loop pass${repeats > 1 ? 'es' : ''})`);
console.log(`flagged where a band is ${FLAG}dB or more off the median of the finished cabinets\n`);
console.log('song      ' + BANDS.map(([name]) => cell(name)).join('') + '     LUFS');
console.log('          ' + BANDS.map(([, lo, hi]) => cell(`${lo < 1000 ? lo : `${lo / 1000}k`}-${hi < 1000 ? hi : `${hi / 1000}k`}`)).join(''));
for (const r of rows) {
  if (!FINISHED.includes(r.id) && r === rows.find((x) => !FINISHED.includes(x.id))) console.log('  — not in the median —');
  const cells = r.levels.map((v, b) => {
    const dev = v - median[b];
    const mark = dev >= FLAG ? `+${dev.toFixed(0)}` : dev <= -FLAG ? dev.toFixed(0) : '';
    return cell(`${v.toFixed(1)}${mark ? ` ${mark}` : '   '}`);
  });
  console.log(r.id.padEnd(10) + cells.join('') + `  ${r.lufs.toFixed(1).padStart(6)}${r.cached ? '  (cached)' : ''}`);
}
console.log('median    ' + median.map((v) => cell(`${v.toFixed(1)}   `)).join(''));
console.log('\n+N / -N: that many dB more / less of the band than the median song carries.');

// ------------------------------------------------------------------- lanes
const laneReports = {};
if (LANES) {
  const focus = ticked;
  for (const id of focus) {
    const track = resolveOrExit(id);
    const entry = MIX[track.id] || null;
    const lanes = activeLanes(deskBank(applyArrangement(track.bank, track.id), entry), repeats);
    const keys = lanes.map((l) => l.key);
    const songLufs = rows.find((r) => r.id === id).lufs;
    const lowBands = BANDS.slice(0, LOW_BANDS).map(([, lo, hi]) => [lo, hi]);
    const laneRows = [];
    for (const lane of lanes) {
      process.stderr.write(`  ${id}: ${lane.key}… `);
      const r = await render(track, soloMix(entry, keys, lane.key));
      laneRows.push({ key: lane.key, e: bandEnergies([r.outL, r.outR], SR, lowBands) });
      process.stderr.write('\n');
    }
    const totals = lowBands.map((_, b) => laneRows.reduce((a, l) => a + l.e[b], 0));
    laneRows.sort((a, b) => (b.e[0] + b.e[1]) - (a.e[0] + a.e[1]));
    console.log(`\n${id}: who carries the low end — ${lanes.length} lanes soloed; each one's level vs the song's loudness, and its share of the band`);
    console.log('lane              ' + BANDS.slice(0, LOW_BANDS).map(([name]) => `${name.padStart(8)} share`).join('  '));
    laneReports[id] = { at: new Date().toISOString(), hash: rows.find((r) => r.id === id).hash, count: lanes.length, rows: [] };
    for (const l of laneRows) {
      const shares = l.e.map((e, b) => (totals[b] > 0 ? (100 * e) / totals[b] : 0));
      if (Math.max(...shares) < 2) continue;
      laneReports[id].rows.push({ key: l.key, levels: l.e.map((e) => dB(e) - songLufs), shares });
      console.log(l.key.slice(0, 16).padEnd(18) + l.e.map((e, b) => `${(dB(e) - songLufs).toFixed(1).padStart(8)} ${`${shares[b].toFixed(0)}%`.padStart(5)}`).join('  '));
    }
    console.log('(lanes under 2% of every low band are left off. Soloed lanes hit the master compressor');
    console.log(' less than the full mix does, so on a compressed song the shares are approximate.)');
  }
}

await renderer?.close();

// THE REPORT FILE, for the desk's /reports page (tools/desk.js). Lane breakdowns are
// slow, so each song's is kept until that song is broken down again; its hash is the
// song's at the time, so the page can say when a mix has moved on since.
const reportPath = join(root, 'work/local/reports/bass-report.json');
mkdirSync(dirname(reportPath), { recursive: true });
let previousLanes = {};
try { previousLanes = JSON.parse(readFileSync(reportPath, 'utf8')).lanes || {}; } catch { /* first run */ }
const allLanes = { ...previousLanes, ...laneReports };
// Songs this run did not measure keep the row the last run gave them.
let previousRows = [];
try { previousRows = JSON.parse(readFileSync(reportPath, 'utf8')).rows || []; } catch { /* first run */ }
const shown = [
  ...rows,
  ...previousRows.filter((p) => !rows.some((r) => r.id === p.id)),
].sort((a, b) => orderOf(a.id) - orderOf(b.id));
const bandList = BANDS.map(([name, lo, hi]) => ({ name, lo, hi }));
// What it means, song by song, most out of step first — see tools/lib/bass-advice.js.
const advice = shown
  .map((r) => adviseSong(r, median, bandList, FLAG, allLanes[r.id] || null))
  .sort((a, b) => b.worst - a.worst);
writeFileSync(reportPath, JSON.stringify({
  at: new Date().toISOString(),
  repeats,
  flag: FLAG,
  finished: FINISHED,
  bands: bandList,
  lowBands: LOW_BANDS,
  median,
  rows: shown.map((r) => ({ id: r.id, lufs: r.lufs, levels: r.levels, hash: r.hash, inMedian: FINISHED.includes(r.id) })),
  lanes: allLanes,
  advice,
}, null, 2));

console.log('\nwhat it means — advice, not orders: act on what you can hear, then SONG LEVELS: APPLY\n');
for (const a of advice.filter((x) => songs.includes(x.id))) console.log(`${adviceText(a)}\n`);
