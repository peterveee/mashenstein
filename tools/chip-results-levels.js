// 8-BIT RESULTS — level each 8-bit part against the part it replaces. 8 Oct 2026.
//
//   node tools/chip-results-levels.js [song …]        every game song when none is named
//         --dry                                        measure and print, write nothing
//
// The results screen's switch (src/game/results-chip.js) puts every part of the level's song
// onto the 8-Bit Sound Set. The faders were set for the song's own sounds, and an 8-bit square
// through the strip a piano was balanced on is rarely the piano's loudness — so each part is
// measured both ways and the difference becomes a trim on that lane's fader, landed on the same
// beat as the switch. Level against its opposite number: the 8-bit bass sits where the bass sat.
//
// Each changed lane is rendered ON ITS OWN, through its own strip and the song's master, over
// the sixteen bars it is busiest in: once on its own sound, once on the 8-bit one. K-weighted
// loudness (tools/lib/loudness.js, the desk's bounce measure), the difference in dB, clamped.
// Renders take a machine-wide render slot and run niced, so a batch never pegs the machine.
// Writes tools/lib/chip-results-trims.js, which the 8-bit alternates are MADE from
// (tools/chip-results-alternates.js make) — once made, an alternate is Peter's to mix and this does
// not touch it. A cabinet not named keeps the trims it has.
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setPriority } from 'node:os';
import { MIX } from '../src/data/mix.js';
import { ARRANGEMENTS, applyArrangement } from '../src/data/arrangements.js';
import { chipParents } from './lib/chip-results-mixes.js';
import { deskBank, laneList, songBars } from '../src/engine/lanes.js';
import { VOICES, voiceOf, registerSongVoice, engineBankKeys, VOICE_LANES } from '../src/data/voices.js';
import { mixWithVoices } from '../src/game/banger/club-voices.js';
import { chipVoices } from '../src/game/results-chip.js';
import { openRenderer } from './lib/render-bank-browser.js';
import { loudness } from './lib/loudness.js';
import { takeRenderSlot, releaseRenderSlot } from './lib/render-slots.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'tools/lib/chip-results-trims.js');
const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const named = argv.filter((a) => !a.startsWith('--'));
const WINDOW_BARS = 16;
const TRIM_MIN = -15;
const TRIM_MAX = 12;
try { setPriority(10); } catch { /* not allowed: run at the usual priority */ }

// audio.js's withVoices, which it keeps to itself: the song's voice block and its own copies
// merged onto the bank, so chipVoices reads each lane's sound as the game plays it.
function withVoices(bank, entry, trackId) {
  if (!bank || !entry || (!entry.voice && !entry.voiceParams)) return bank;
  const out = { ...bank, ...entry.voice };
  for (const [vk, params] of Object.entries(entry.voiceParams || {})) {
    const id = registerSongVoice(vk, trackId, params);
    if (id) out[vk] = id;
  }
  for (const key of Object.keys(VOICE_LANES)) {
    const keys = engineBankKeys(voiceOf(out, key), key);
    if (keys) Object.assign(out, keys);
  }
  return out;
}

const hasNote = (v) => (Array.isArray(v) ? v.some(hasNote) : v != null && v !== false && v !== 0);
const notesInBar = (values, half) => (Array.isArray(values)
  ? values.slice(half === 1 ? 16 : 0, (half === 1 ? 16 : 0) + 16).filter(hasNote).length : 0);

/** The first bar of the WINDOW_BARS the lane plays most notes in, or null if it never plays. */
function busiestWindow(bars, lane) {
  const counts = bars.map(({ b, half }) => notesInBar(b?.[lane], half));
  if (!counts.some(Boolean)) return null;
  let best = 0; let bestAt = 0;
  for (let i = 0; i < counts.length; i++) {
    const sum = counts.slice(i, i + WINDOW_BARS).reduce((a, n) => a + n, 0);
    if (sum > best) { best = sum; bestAt = i; }
  }
  return bestAt;
}

/**
 * The bank — or a desk arrangement, whose sections carry notes of their own over the bank's —
 * with every lane's notes but `lane`'s taken out: the lane alone, on its own strip.
 */
function solo(bank, lane, laneKeys) {
  if (!bank) return bank;
  const strip = (o) => {
    if (!o || typeof o !== 'object') return o;
    const out = { ...o };
    for (const k of laneKeys) if (k !== lane) delete out[k];
    return out;
  };
  const out = strip(bank);
  if (bank.sections) out.sections = bank.sections.map(strip);
  return out;
}

async function readExisting() {
  if (!existsSync(OUT)) return {};
  try { return (await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`)).CHIP_RESULT_TRIMS || {}; } catch { return {}; }
}

const r1 = (x) => Math.round(x * 10) / 10;
const table = await readExisting();
const renderer = await openRenderer();
try {
  for (const id of chipParents()) {
    if (named.length && !named.includes(id)) continue;
    const song = await import(pathToFileURL(join(ROOT, 'src/data/songs', `${id}.js`)).href);
    const raw = song.bank;
    if (!raw) continue;
    const entry = MIX[id] ?? song.mix ?? null;
    const arrangement = ARRANGEMENTS[id] ?? song.arrangement ?? null;
    const played = withVoices(deskBank(applyArrangement(raw, id), entry), entry, id);
    const laneKeys = laneList(played).map((l) => l.key);
    const bars = songBars(played);
    const swaps = chipVoices(played);
    const trims = {};
    console.log(`${id}: ${swaps.size} parts change`);
    for (const [lane, chipId] of swaps) {
      const from = busiestWindow(bars, lane);
      if (from == null) continue;
      const range = { startStep: from * 16, endStep: Math.min(bars.length, from + WINDOW_BARS) * 16 };
      const one = async (mix) => {
        await takeRenderSlot();
        try {
          const out = await renderer.render(solo(raw, lane, laneKeys), {
            mix, trackId: id, arrangement: solo(arrangement, lane, laneKeys), range, tail: 1,
          });
          return loudness([out.outL, out.outR]).lufs;
        } finally { releaseRenderSlot(); }
      };
      const own = await one(entry);
      const chip = await one(mixWithVoices(entry, new Map([[lane, chipId]])));
      if (!Number.isFinite(own) || !Number.isFinite(chip)) {
        console.log(`  ${lane.padEnd(12)} not measurable (${own} / ${chip}), left at 0`);
        continue;
      }
      const trim = r1(Math.max(TRIM_MIN, Math.min(TRIM_MAX, own - chip)));
      const now = voiceOf(played, lane);
      console.log(`  ${lane.padEnd(12)} ${(now?.label || 'engine voice').padEnd(28)} ${r1(own)} LUFS → ${VOICES[chipId].label.padEnd(16)} ${r1(chip)} LUFS  trim ${trim > 0 ? '+' : ''}${trim} dB`);
      if (trim) trims[lane] = trim;
    }
    table[id] = trims;
  }
} finally {
  await renderer.close();
}

if (DRY) { console.log('\n--dry: nothing written'); process.exit(0); }
const lines = Object.keys(table).sort().map((id) => {
  const t = table[id];
  const body = Object.keys(t).map((lane) => `${/^[A-Za-z_$][\w$]*$/.test(lane) ? lane : JSON.stringify(lane)}: ${t[lane]}`).join(', ');
  return `  ${id}: { ${body} },`;
});
writeFileSync(OUT, `// 8-BIT RESULTS — each lane's fader trim, in dB, for its 8-bit part: the part measured against the
// one it replaces. What the 8-bit alternates are made with (tools/lib/chip-results-mixes.js).
//
// WRITTEN BY tools/chip-results-levels.js — run it again after a song's mix or the 8-Bit set
// changes, then remake an alternate with --force to start it from them. A lane not listed needs
// no trim, or was not measured.
export const CHIP_RESULT_TRIMS = {
${lines.join('\n')}
};
`);
console.log(`\nwrote ${OUT.slice(ROOT.length + 1)}`);
