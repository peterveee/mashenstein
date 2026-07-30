// Scratch-song creation: starter patterns, source ownership, and the writable path.
// These tests use a throwaway song root so saving and history exercise the same
// serializers as the desk without touching the checked-in catalogue.
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  NEW_SONG_DEFAULTS, NEW_SONG_LIMITS, buildNewSongBank, newScratchSong,
  normalizeSeed, slugFor, validateNewSong,
} from '../tools/lib/new-song.js';
// The generated songs' musical vocabulary, one pack per style — see song-styles.js.
import { SONG_STYLES, STYLE_BY_ID, MODES } from '../tools/lib/song-styles.js';
import { laneSource } from '../tools/lib/song-source.js';
import { PERCUSSION_LANES, VOICES, seamFor, voiceOf, defaultVoiceOf } from '../src/data/voices.js';
import { readImported, writeImportedIndex } from '../tools/lib/imported-index.js';
import {
  readSongFile, snapshotSongFile, writableSongPath, writeSongFile,
} from '../tools/lib/song-file.js';
import {
  SONG_ADJECTIVES, SONG_NOUNS, SONG_NAME_COUNT, randomSongName, songNameAt,
} from '../tools/lib/song-names.js';
import {
  readHistoryVersion, readSongStateDir, newScratchId, newScratchName,
} from '../tools/mixer.js';
import { expandOrder } from '../src/data/arrangements.js';
import { activeLanes } from '../src/engine/lanes.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const json = (value) => JSON.stringify(value);
const temp = mkdtempSync(join(tmpdir(), 'mash-new-song-'));
const imported = join(temp, 'src/data/imported');
mkdirSync(imported, { recursive: true });
// Generated song modules deliberately use the repository's tiny note helper. Copying
// that one dependency into the temporary root makes the source genuinely importable.
mkdirSync(join(temp, 'src/engine'), { recursive: true });
copyFileSync(join(process.cwd(), 'src/engine/notes.js'), join(temp, 'src/engine/notes.js'));

try {
  const defaults = validateNewSong({});
  assert(defaults.bpm === NEW_SONG_DEFAULTS.bpm && defaults.bars === NEW_SONG_DEFAULTS.bars
    && defaults.template === NEW_SONG_DEFAULTS.template,
  'New Song validation supplies the requested BPM, bars, and blank template defaults');
  assert(!('title' in NEW_SONG_DEFAULTS) && /^[A-Z]+ [A-Z]+$/.test(defaults.title)
    && SONG_ADJECTIVES.includes(defaults.title.split(' ')[0])
    && SONG_NOUNS.includes(defaults.title.split(' ')[1]),
  'an untitled New Song is named from the adjective and noun vocabularies, never numbered');
  assert(NEW_SONG_LIMITS.minBpm === 40 && NEW_SONG_LIMITS.maxBpm === 220
    && NEW_SONG_LIMITS.minBars === 1 && NEW_SONG_LIMITS.maxBars === 64,
  'New Song limits are 40–220 BPM and 1–64 bars');
  for (const bad of [{ bpm: 39 }, { bpm: 221 }, { bars: 0 }, { bars: 65 }, { bars: 1.5 }, { template: 'nope' }]) {
    let threw = false;
    try { validateNewSong(bad); } catch { threw = true; }
    assert(threw, `invalid New Song input is rejected (${JSON.stringify(bad)})`);
  }

  const banks = {};
  for (const template of ['blank', 'beat', 'full-band']) {
    const bank = buildNewSongBank({ title: 'starter', bpm: 123, bars: 7, template });
    banks[template] = bank;
    assert(expandOrder(bank.order, true).length === 7,
      `${template} template expands to exactly the requested bar count`);
    assert(Array.isArray(bank.starterLanes) && bank.starterLanes.length > 0,
      `${template} template declares visible starter lanes explicitly`);
  }
  assert(banks.blank.starterLanes.length === 1 && banks.blank.starterLanes[0] === 'lead'
    && banks.blank.sections[0].lead.every((v) => v == null)
    && activeLanes(banks.blank).some((lane) => lane.key === 'lead'),
  'Blank exposes a silent lead lane without planting a fake note');
  assert(json(banks.beat.sections[0].kick.map(Boolean).map(Number))
    === json(Array.from({ length: 32 }, (_, i) => i % 4 === 0 ? 1 : 0)),
  'Beat kick is a quarter-note pattern');
  assert([4, 12, 20, 28].every((i) => banks.beat.sections[0].snare[i])
    && banks.beat.sections[0].hats.filter(Boolean).length === 16,
  'Beat has the backbeat snare and eighth-note closed hats');
  assert(['bass', 'chords', 'lead'].every((key) => banks['full-band'].sections[0][key]?.some(Boolean)),
    'Full Band adds bass, chords, and an original A-minor lead progression');
  const beatSeedA = buildNewSongBank({ title: 'starter', bpm: 123, bars: 8, template: 'beat', seed: 17 });
  const beatSeedB = buildNewSongBank({ title: 'starter', bpm: 123, bars: 8, template: 'beat', seed: 17 });
  const beatSeedOther = buildNewSongBank({ title: 'starter', bpm: 123, bars: 8, template: 'beat', seed: 18 });
  const bandSeedA = buildNewSongBank({ title: 'starter', bpm: 123, bars: 8, template: 'full-band', seed: 17 });
  const bandSeedOther = buildNewSongBank({ title: 'starter', bpm: 123, bars: 8, template: 'full-band', seed: 18 });
  assert(normalizeSeed(-1) === 0xffffffff && json(beatSeedA) === json(beatSeedB),
    'starter variation uses a stable unsigned seed and repeats exactly');
  assert(json(beatSeedA) !== json(beatSeedOther) && json(bandSeedA) !== json(bandSeedOther),
    'Beat and Full Band seeds choose different musical vocabularies');
  const seededSource = newScratchSong({ id: 'seeded', title: 'Seeded', template: 'full-band', seed: 17 });
  assert(seededSource.seed === 17 && seededSource.source.includes('export const seed = 17;'),
    'scratch source records the seed used to generate its starter');

  // ---- style packs ----------------------------------------------------------
  //
  // The packs are the answer to every generated song sounding like the same poppy
  // electropop: one vocabulary in one key at one tempo on the engine's default
  // voices. These assertions hold the packs to being genuinely different from each
  // other, and hold the generator to writing songs a person can read.
  const laneVoiceKey = (lane) => seamFor(lane)?.voiceKey;
  // The register each pitched lane is allowed to land in, whatever the key. See the
  // note over the per-lane check below for where these numbers come from.
  const LANE_RANGE = {
    bass: [60, 330], chords: [125, 500], organChords: [125, 500],
    lead: [310, 1250], twinkle: [660, 2500],
  };
  for (const style of SONG_STYLES) {
    const band = buildNewSongBank({ title: 'style', bars: 8, template: 'full-band', style: style.id, seed: 4242 });
    const beat = buildNewSongBank({ title: 'style', bars: 8, template: 'beat', style: style.id, seed: 4242 });
    const section = band.sections[0];
    assert(style.lanes.band.every((lane) => Array.isArray(section[lane]) && section[lane].some(Boolean))
      && style.lanes.beat.every((lane) => beat.sections[0][lane]?.some(Boolean)),
    `${style.label} fills every lane its Beat and Full Band starters declare`);
    assert(style.lanes.beat.some((lane) => PERCUSSION_LANES.includes(lane))
      && style.lanes.band.some((lane) => !PERCUSSION_LANES.includes(lane)),
    `${style.label} has a kit for its Beat and something pitched in its Full Band`);
    // A voice named on a lane the starter does not play is a bank key describing an
    // instrument you cannot hear; a voice the catalogue refuses on that lane is worse.
    for (const [key, value] of Object.entries(band)) {
      if (!key.endsWith('Voice')) continue;
      const lane = style.lanes.band.find((l) => laneVoiceKey(l) === key);
      assert(!!lane && voiceOf(band, lane)?.id === value,
        `${style.label} names ${value} on a lane it plays, and the catalogue allows it there`);
    }
    // Two bars a person can read. Anything the note-name serialiser cannot spell falls
    // back to a raw array of frequencies, which is how the chord lanes used to read.
    assert(style.lanes.band.every((lane) => /^(seq|chordSeq)\(/.test(laneSource(section[lane]))),
      `${style.label} writes every lane as seq/chordSeq shorthand`);
    // The unbroken eighth-note melody was the loudest cue that two songs were one
    // song, so every pack has to own at least one rhythm that is not that grid.
    const eighthGrid = (r) => r.length === 16 && r.every((s, i) => s === i * 2);
    assert(style.melodies.every((m) => m.rhythms.some((r) => !eighthGrid(r))
      && m.rhythms.every((r) => r.every((s) => s >= 0 && s < 32))
      && m.contours.every((c) => c.every((d) => d >= 0 && d <= 2 * MODES[style.mode].steps.length))),
    `${style.label} melodies rest somewhere, stay on the grid and stay in the mode`);
    assert(style.progressions.every((p) => 32 % p.length === 0
      && style.chordHits.some((hits) => hits.every((h) => h < 32 / p.length))),
    `${style.label} progressions divide the loop and can all be struck`);
  }
  const styleBanks = SONG_STYLES.map((s) => buildNewSongBank({
    title: 'style', bars: 8, template: 'full-band', style: s.id, seed: 4242,
  }));
  assert(new Set(styleBanks.map((b) => b.bpm)).size >= 7
    && new Set(SONG_STYLES.map((s) => s.mode)).size >= 4
    && new Set(styleBanks.map((b) => json(b.starterLanes))).size >= 5,
  'the packs disagree about tempo, mode and which lanes a full band even has');
  assert(SONG_STYLES[0].id === 'electropop' && json(SONG_STYLES[0].bank) === json({ musicTrim: 0.7 })
    && !Object.keys(banks['full-band']).some((k) => k.endsWith('Voice')),
  'the first pack is the engine\'s own sound, so seed 0 stays the canonical starter');
  assert(SONG_STYLES.slice(1).every((s) => s.lanes.band.every((lane) => s.bank[laneVoiceKey(lane)])),
    'every other pack gives each of its Full Band lanes a voice of its own');
  // An ENGINE preset is a bundle of bank keys that only `withVoices` expands, and that
  // returns early on a song with no mix — which every generated song is. Named in a
  // pack it would be a lane claiming a filtered saw and playing the default instead.
  assert(SONG_STYLES.every((s) => Object.entries(s.bank)
    .filter(([key]) => key.endsWith('Voice'))
    .every(([, id]) => VOICES[id] && VOICES[id].kind !== 'engine')),
  'no pack names an engine preset, which would expand to nothing without a mix');
  // The kit/instrument balance itself is measured through the render pipeline rather
  // than asserted here — see the note in song-styles.js — but the two keys that carry
  // it have to stay sane: a `drumGain` only means anything beside a kit, and the pair
  // is a correction of a few dB, not a rescue.
  assert(SONG_STYLES.every((s) => {
    const g = s.bank.drumGain;
    if (g == null) return true;
    return g >= 0.5 && g <= 2.5 && s.lanes.band.some((lane) => PERCUSSION_LANES.includes(lane));
  }), 'every stated drumGain is a few dB of correction on a pack that has a kit');
  assert(SONG_STYLES.every((s) => s.bank.musicTrim > 0.4 && s.bank.musicTrim < 1.7),
    'every pack states a song trim inside the range the catalogue uses');
  assert(SONG_STYLES.every((s) => s.lanes.band.every((lane) => {
    const seam = seamFor(lane);
    // Naming a melodic lane's gain key would replace the derived preset level with a
    // hand-picked absolute — the balance has to be carried by the two trims instead.
    return PERCUSSION_LANES.includes(lane) || !seam?.gainKey || s.bank[seam.gainKey] == null;
  })), 'no pack overrides a melodic lane gain, so preset normalisation keeps applying');

  const dirge = buildNewSongBank({ title: 'dirge', bars: 8, template: 'full-band', style: 'dirge' });
  assert(dirge.bpm === STYLE_BY_ID.dirge.bpm
    && buildNewSongBank({ title: 'dirge', bars: 8, bpm: 145, style: 'dirge' }).bpm === 145,
  'an empty BPM takes the style\'s own tempo and a supplied one still wins');
  assert(defaultVoiceOf(dirge, 'lead')?.id === dirge.leadVoice,
    'the desk reads a bank-named voice back, so a styled strip is not labelled ENGINE');
  let badStyle = false;
  try { validateNewSong({ style: 'nope' }); } catch { badStyle = true; }
  assert(badStyle && validateNewSong({}).style === 'auto',
    'an unknown style is rejected and the default leaves the choice to the seed');
  const autoRoots = new Set();
  const autoStyles = new Set();
  for (let seed = 1; seed <= 24; seed++) {
    const spec = newScratchSong({ id: 'auto', title: 'Auto', template: 'full-band', seed });
    autoStyles.add(spec.style);
    autoRoots.add(spec.key);
    const notes = spec.bank.sections[0];
    // Per LANE, not one range for the lot. Transposition is what puts a generated song
    // outside A minor and the register rules are what keep it from arriving an octave
    // out — but a single 55–2400 Hz band would pass a bass sitting at 1 kHz, which is
    // exactly the failure worth catching. Each bound is the measured range of all
    // eleven packs over 300 seeds, plus a semitone or two of headroom: bass C2–D#4,
    // chords C3–A#4, lead E4–D6, and a bell line an octave over the melody F5–D7.
    for (const [lane, arr] of Object.entries(notes)) {
      if (PERCUSSION_LANES.includes(lane)) continue;
      const [lo, hi] = LANE_RANGE[lane] || LANE_RANGE.lead;
      const hz = arr.flatMap((v) => (Array.isArray(v) ? v : [v])).filter((v) => typeof v === 'number');
      assert(hz.every((v) => v >= lo && v <= hi),
        `seed ${seed} keeps ${spec.style}'s ${lane} inside its own register `
        + `(${Math.round(Math.min(...hz, Infinity))}–${Math.round(Math.max(...hz, 0))} Hz in ${lo}–${hi})`);
    }
  }
  assert(autoStyles.size >= 6 && autoRoots.size >= 8,
    'auto styling spreads twenty-four seeds over most of the packs and many keys');

  const first = newScratchSong({ id: 'scratch-roundtrip', title: 'Round Trip', bpm: 100, bars: 3, template: 'beat' });
  writeFileSync(join(imported, `${first.id}.js`), first.source);
  // A marker-less legacy import remains visible but is intentionally not writable.
  writeFileSync(join(imported, 'legacy.mid.js'), '// LEGACY — imported from legacy.mid\nexport const LEGACY = { bpm: 120 };\n');
  const entries = readImported(temp);
  const scratchEntry = entries.find((entry) => entry.id === first.id);
  const legacyEntry = entries.find((entry) => entry.id === 'legacy.mid');
  assert(scratchEntry?.group === 'scratch' && scratchEntry.writable === true
    && scratchEntry.bankExport === 'bank',
  'mixed imported indexing distinguishes a writable scratch module from a legacy MIDI module');
  assert(legacyEntry?.group === 'imported' && legacyEntry.writable === false
    && legacyEntry.constName === 'LEGACY',
  'legacy marker-less MIDI imports stay read-only and keep their named bank export');
  const indexSource = writeImportedIndex(temp) && readFileSync(join(imported, 'index.js'), 'utf8');
  assert(indexSource.includes(`import * as SCRATCH_ROUNDTRIP from './${first.id}.js';`)
    && indexSource.includes('group: "scratch"') && indexSource.includes('writable: true'),
  'generated imported index namespace-imports scratch metadata and registers its group');

  assert(writableSongPath(temp, first.id) === join(imported, `${first.id}.js`)
    && writableSongPath(temp, 'legacy.mid') === null,
  'writable path resolution accepts scratch sources and refuses marker-less MIDI');
  assert(readSongFile(temp, first.id).includes('export const bank')
    && readSongFile(temp, 'legacy.mid') === null,
  'source reading resolves scratch files while leaving legacy MIDI without desk state');
  const mix = { master: -2, lanes: { kick: { gain: -3 } } };
  const arrangement = { order: [{ s: 0, bars: 1 }], sections: [] };
  writeSongFile(temp, first.id, { mix, arrangement });
  const readback = await import(`${pathToFileURL(join(imported, `${first.id}.js`)).href}?saved=1`);
  assert(json(readback.mix) === json(mix) && json(readback.arrangement) === json(arrangement),
    'scratch mix and arrangement save round-trip through the source module');
  const state = await readSongStateDir(imported, 'mix');
  assert(json(state[first.id]) === json(mix), 'scratch saved mix is found by the desk state reader');

  const draftMix = { [first.id]: { master: -9 } };
  const draftArrangements = { [first.id]: { order: [0] } };
  // Discard is deliberately a draft operation: the file remains the saved version.
  delete draftMix[first.id];
  delete draftArrangements[first.id];
  const afterDiscard = await import(`${pathToFileURL(join(imported, `${first.id}.js`)).href}?discard=1`);
  assert(json(afterDiscard.mix) === json(mix) && json(afterDiscard.arrangement) === json(arrangement),
    'discarding scratch drafts leaves the source-backed saved version untouched');

  const historyDir = join(temp, '.mix-history');
  const snapshot = snapshotSongFile(temp, first.id, historyDir, '2026-07-30T123456');
  const version = await readHistoryVersion(snapshot, historyDir);
  assert(snapshot === 'song-2026-07-30T123456-scratch-roundtrip.js'
    && json(version.mix[first.id]) === json(mix)
    && json(version.arrangements[first.id]) === json(arrangement),
  'scratch history snapshots restore both mix and arrangement data');

  // Starter names: unique, pronounceable, and never a numbered draft.
  const everyName = new Set(Array.from({ length: SONG_NAME_COUNT }, (_, i) => songNameAt(i)));
  assert(SONG_NAME_COUNT === SONG_ADJECTIVES.length * SONG_NOUNS.length
    && everyName.size === SONG_NAME_COUNT && SONG_NAME_COUNT >= 1000,
  'the adjective and noun grid yields a thousand-plus distinct names with no duplicate pair');
  assert(songNameAt(SONG_NAME_COUNT + 3) === songNameAt(3) && songNameAt(-1) === songNameAt(SONG_NAME_COUNT - 1),
    'name lookup wraps the grid in both directions');
  assert(randomSongName({ random: () => 0 }) === songNameAt(0)
    && randomSongName({ taken: [songNameAt(0).toLowerCase(), ' ' + songNameAt(1) + ' '], random: () => 0 })
      === songNameAt(2),
  'a taken name is stepped past, matching case-insensitively and ignoring surrounding space');
  assert(!everyName.has(randomSongName({ isTaken: () => true, random: () => 0 })),
    'exhausting every pair still returns a name rather than throwing');

  const collisionRoot = mkdtempSync(join(tmpdir(), 'mash-new-song-id-'));
  mkdirSync(join(collisionRoot, 'src/data/imported'), { recursive: true });
  mkdirSync(join(collisionRoot, 'src/data/songs'), { recursive: true });
  writeFileSync(join(collisionRoot, 'src/data/imported/happy-dolphin.js'), '');
  writeFileSync(join(collisionRoot, 'src/data/songs/happy-dolphin-2.js'), '');
  assert(newScratchId('HAPPY DOLPHIN', collisionRoot, () => null) === 'happy-dolphin-3',
    'scratch IDs skip collisions across imported and catalogue files');
  // The first pick is already used as a file, so the picker must move on rather than
  // hand back a name whose id would come out numbered.
  const freshName = newScratchName(collisionRoot, () => null);
  assert(freshName !== 'HAPPY DOLPHIN' && everyName.has(freshName)
    && newScratchId(freshName, collisionRoot, () => null) === slugFor(freshName),
  'an auto-named scratch song takes a name whose file does not exist yet');
  rmSync(collisionRoot, { recursive: true, force: true });
} finally {
  rmSync(temp, { recursive: true, force: true });
}

if (!failed) console.log('NEW SONG: PASSED');
process.exit(failed ? 1 : 0);
