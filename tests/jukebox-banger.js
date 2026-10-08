// GENER8 on the jukebox (src/game/banger/): the riff grid, the generator as the
// game calls it, what the save keeps, the maker screen, and the jukebox rows.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { save } = await import('../src/engine/save.js');
const { Audio } = await import('../src/engine/audio.js');
const riffMod = await import('../src/game/banger/riff.js');
const {
  RIFF_MODES, DEFAULT_SIMPLE, rowHz, rowName, toggleNote, riffFromNotes, normaliseNotes, normaliseLengths, simplify, expand,
  upgradeDraft, upgradeRecipeNotes, luckyNotes, hasNotes,
} = riffMod;
const DEFAULT_NOTES = DEFAULT_SIMPLE;
const { MAKER_STYLES, MAKER_MOODS, makeBanger, defaultMoodFor, hookSoundFor, RIFF_TRIM_DB, tapeStopFor, TAPE_STOP_CHANCE,
  spotFor, INTRO_LOWPASS_CHANCE, INTRO_BITCRUSH_CHANCE, UNDERWATER_CHANCE, formulaLabel } = await import('../src/game/banger/make.js');
const { BANGER_STYLES } = await import('../tools/lib/banger/styles/index.js');
const { generateBanger } = await import('../tools/lib/banger/index.js');
const {
  bangerState, keepBanger, reviseBanger, saveDraft, bangerRow, MAX_KEPT, deleteBanger, lastPlayedBanger,
} = await import('../src/game/banger/store.js');
const { BangerMakerState, RIFF_VOICES, MAKER_VARIATIONS, MUTATION_LADDER } = await import('../src/game/banger/maker.js');
const { BANGER_VOLTAGES, voltageSettings } = await import('../src/game/banger/voltage.js');
const { SoundTestState, JUKEBOX } = await import('../src/game/menus.js');
const { BangerClubState, LED_COLS, DICE_LINES } = await import('../src/game/banger/club.js');
const { HERO_MOVES, PARTS, partOf, kikoPlan, moveSeconds, holdChain, landingFor, dragValue, echoLevel, drainSeconds, nextStopStep,
  nowAt, nextSixteenthAt } = await import('../src/game/banger/club-fx.js');
const { cleanerWalk, doloresDancePose, DOLORES_DANCE_BEATS, DOLORES_FLING_BEATS, DOLORES_RUN_BEATS, makeScrap, drawScraps } = await import('../src/game/banger/club-party.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---------------------------------------------------------------- the grid
{
  const S = RIFF_MODES.simple; const A = RIFF_MODES.advanced;
  assert(S.steps === 16 && S.semis.length === 11 && S.len === 2, 'SIMPLE is eighth notes on the eleven notes of A minor from G4 to C6');
  assert(A.steps === 32 && A.semis.length === 18 && A.len === 1, 'ADVANCED is sixteenth notes on all eighteen semitones from G4 to C6');
  assert(Math.abs(rowHz('advanced', 2) - 440) < 1e-9 && Math.abs(rowHz('advanced', 14) - 880) < 1e-9
    && Math.abs(rowHz('simple', 1) - 440) < 1e-9 && Math.abs(rowHz('simple', 8) - 880) < 1e-9
    && rowName('advanced', 0) === 'G' && rowName('advanced', 3) === 'A#' && rowName('advanced', 17) === 'C'
    && rowName('simple', 0) === 'G' && rowName('simple', 2) === 'B' && rowName('simple', 10) === 'C',
  'both span G4 to C6, A4 a row or two up');
}
{
  let n = normaliseNotes(null);
  n = toggleNote(n, 3, 2);
  assert(n[3] === 2, 'a tap puts a note in');
  n = toggleNote(n, 3, 5);
  assert(n[3] === 5 && n.filter((r) => r >= 0).length === 1, 'a tap elsewhere in the column moves the note: one note per column');
  n = toggleNote(n, 3, 5);
  assert(n[3] === -1, 'the same square again takes it out');
}
{
  const riff = riffFromNotes(DEFAULT_NOTES);
  const tokens = riff.parts[0].bars.map((b) => b.split(' '));
  assert(riff.bars === 2 && riff.grid === 16 && tokens.every((t) => t.length === 16),
    'the riff is two bars of sixteen sixteenths, the shape the desk reads off a song');
  assert(tokens[0][0] === 'A4:2' && tokens[0][1] === '.' && tokens[0][4] === 'C5:2', 'a SIMPLE step is an eighth note of the scale');
  const adv = riffFromNotes([2, 3, -1, 6, 0, 17], 'simpleSquare', 'advanced').parts[0].bars[0].split(' ');
  assert(adv[0] === 'A4:1' && adv[1] === 'A#4:1' && adv[3] === 'C#5:1' && adv[4] === 'G4:1' && adv[5] === 'C6:1',
    'an ADVANCED step is a sixteenth, sharps included, G4 to C6');
}
{
  // ADVANCED → SIMPLE: first note in each eighth, to the nearest scale note (a tie goes down).
  const adv = normaliseNotes(null, 'advanced');
  adv[0] = 2; adv[1] = 7;          // A then D in the first eighth: A wins
  adv[3] = 6;                       // C# on the off-sixteenth of the second eighth → C (tie goes down)
  adv[4] = 11;                      // F# → F
  adv[6] = 1;                       // G#4 → G4 (tie goes down)
  const simple = simplify(adv);
  assert(simple[0] === 1 && simple[1] === 3 && simple[2] === 6 && simple[3] === 0 && simple.length === 16,
    'converting down keeps the first note of each eighth, moved to the nearest scale note');
  const up = expand(simple);
  assert(up[0] === 2 && up[2] === 5 && up[4] === 10 && up[6] === 0 && up[1] === -1 && up.length === 32,
    'converting up puts each eighth on its first sixteenth');
}
{
  const random = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  for (const mode of ['simple', 'advanced']) {
    let ok = true;
    for (let k = 0; k < 50; k++) {
      const n = luckyNotes(mode, random);
      const m = RIFF_MODES[mode];
      const onScale = n.every((r) => r < 0 || (mode === 'simple' ? r < 11 : [0, 2, 4, 5, 7, 9, 10, 12, 14, 16, 17].includes(r)));
      if (n.length !== m.steps || n[0] < 0 || !onScale || n.filter((r) => r >= 0).length < 4) ok = false;
    }
    assert(ok, `ZAP writes a ${mode} riff: starts on the beat, stays in the scale, has a tune in it`);
  }
}
{
  assert(upgradeDraft({ notes: [0, 1, 7] }).mode === 'simple' && upgradeDraft({ notes: [0, 1, 7] }).simple[2] === 8,
    'a draft from the first day (scale notes) opens as SIMPLE, on the same notes');
  const v2 = upgradeDraft({ v: 2, notes: [0, 1, 12] });
  assert(v2.mode === 'advanced' && v2.advanced[2] === 3 && v2.advanced[4] === 14, 'a semitone draft from 3 Oct opens as ADVANCED');
  assert(upgradeRecipeNotes({ notes: [3] }).mode === 'simple' && upgradeRecipeNotes({ notes: [3] }).notes[0] === 4
    && upgradeRecipeNotes({ v: 2, notes: [3] }).notes[0] === 5,
    'kept songs from before are read in today\'s shape');
  const v3 = upgradeDraft({ v: 3, mode: 'advanced', simple: [0, 7, -1], advanced: [0, 12, -1], simpleLengths: [2, 4], advancedLengths: [1, 3] });
  const v3r = upgradeRecipeNotes({ v: 3, mode: 'advanced', notes: [0, 12, -1], lengths: [1, 3] });
  assert(v3.mode === 'advanced' && v3.simple[0] === 1 && v3.simple[1] === 8 && v3.advanced[0] === 2 && v3.advanced[1] === 14
    && v3.advancedLengths[1] === 3 && v3.simpleLengths[1] === 4 && v3r.notes[0] === 2 && v3r.notes[1] === 14 && v3r.notes[2] === -1 && v3r.lengths[1] === 3,
  'an A-to-A grid (version 3) opens on the G-to-C grid with every note and length where it was');
  const rec = { v: 3, mode: 'advanced', notes: [0, 12, 3] };
  const before = riffFromNotes(rec.notes, 'simpleSquare', 'advanced');   // read as today's rows, it would be wrong
  const after = riffFromNotes(upgradeRecipeNotes(rec).notes, 'simpleSquare', 'advanced');
  assert(after.parts[0].bars[0].startsWith('A4:1 A5:1 C5:1') && !before.parts[0].bars[0].startsWith('A4'),
    'so a kept song plays the pitches it was made with');
}

// ---------------------------------------------------------------- the generator
assert(!MAKER_STYLES.some((s) => s.id === 'kraftwerk'), 'Kraftwerk is out');
// Boogie is hidden in the Lab, not the desk (7 Oct 2026), so the Lab offers a multiple of four;
// a song kept on it still reads as BOOGIE.
assert(!MAKER_STYLES.some((s) => s.id === 'electro-funk') && BANGER_STYLES.some((s) => s.id === 'electro-funk')
  && MAKER_STYLES.length % 4 === 0 && formulaLabel('electro-funk') === 'BOOGIE',
  `Boogie is out of the Lab but still on the desk, and the Lab offers ${MAKER_STYLES.length} styles`);
// Chipstep and synthwave play on their LIGHT Sound Set (5 Oct 2026): no MRDR-3, no JMJR-4 —
// and chipstep, as CHIPTUNE, comes out on 8-Bit blips now and then, by its seed — more often the
// higher the voltage (1 in 6 at Safe up to 1 in 2 at Overload).
{
  const { labSoundSet, makeBanger: make } = await import('../src/game/banger/make.js');
  const { VOICES: V } = await import('../src/data/voices.js');
  const seeds = [...Array(200)].map((_, i) => i + 1);
  const eightBit = [0, 1, 2, 3].map((v) => seeds.filter((seed) => labSoundSet('chipstep', seed, v) === '8bit').length);
  assert(MAKER_STYLES.find((s) => s.id === 'chipstep')?.label === 'CHIPTUNE' && MAKER_STYLES.some((s) => s.id === 'synthwave')
    && seeds.every((seed) => [0, 3].every((v) => labSoundSet('synthwave', seed, v) === 'light' && labSoundSet('big-room', seed, v) === 'style'))
    && eightBit[0] > 10 && eightBit.every((n, i) => !i || n > eightBit[i - 1]) && eightBit[3] < 140
    && seeds.every((seed) => labSoundSet('chipstep', seed, 0) !== '8bit' || labSoundSet('chipstep', seed, 3) === '8bit'),
  `chipstep (as CHIPTUNE) and synthwave are in the Lab on their Light set; chiptune comes out 8-Bit at every voltage, more often the higher it is (${eightBit.join(', ')} of 200, Safe to Overload)`);
  const heavy = (song) => Object.values(song.mix.voice).filter((id) => ['MRDR-3', 'JMJR-4'].includes(V[id]?.synth));
  const light = [1, 2, 3, 4, 5, 6].flatMap((seed) => ['chipstep', 'synthwave'].flatMap((style) => heavy(make({ notes: DEFAULT_NOTES, style, mood: 'anthemic', seed, expression: 2, voltage: 3 }))));
  assert(!light.length, `a Lab take in chipstep or synthwave plays no MRDR-3 or JMJR-4, even at full voltage${light.length ? ` (${light.join(', ')})` : ''}`);
}
assert(MAKER_STYLES.every((s) => /^[A-Z0-9 .,:!?'\-/]+$/.test(s.label)) && MAKER_MOODS.every((m) => /^[A-Z0-9 .,:!?'\-/]+$/.test(m.label)),
  'every style and mood label is in the game font\'s character set');
for (const style of MAKER_STYLES) {
  let song = null;
  try { song = makeBanger({ notes: DEFAULT_NOTES, style: style.id, mood: defaultMoodFor(style.id), seed: 3 }); } catch (e) { console.error(e); }
  assert(song && song.bank && song.mix && song.arrangement && song.bpm > 0, `${style.id} makes a whole song from the default grid`);
}
{
  const a = makeBanger({ notes: DEFAULT_NOTES, style: 'trance', mood: 'dark', seed: 99 });
  const b = makeBanger({ notes: DEFAULT_NOTES, style: 'trance', mood: 'dark', seed: 99 });
  assert(JSON.stringify(a.bank) === JSON.stringify(b.bank), 'the same recipe makes the same song, so a recipe is enough to keep');
}
{
  const style = 'trance'; const mood = 'uplifting';
  const song = makeBanger({ notes: DEFAULT_NOTES, style, mood, seed: 12 });
  assert(song.mix.voice.leadVoice === hookSoundFor(style, mood) && hookSoundFor(style, mood) !== 'simpleSquare',
    'the riff plays on the style\'s own hook sound, not the grid\'s preview square');
  const plain = generateBanger({ riff: riffFromNotes(DEFAULT_NOTES, hookSoundFor(style, mood)), options: { style, mood }, seed: 12 });
  assert(Math.abs(song.mix.lanes.lead.gain - ((plain.mix.lanes.lead.gain ?? 0) + RIFF_TRIM_DB)) < 0.05,
    'the riff channel sits RIFF_TRIM_DB under the hook fader');
}
{
  const song = makeBanger({ notes: luckyNotes('advanced'), mode: 'advanced', style: 'dnb', mood: 'dark', seed: 8 });
  assert(song && song.bank && song.bpm > 0, 'an ADVANCED grid makes a song');
}
{
  // Tape stops: now and then, in the styles they fit, read off the seed.
  const share = (style) => { let n = 0; for (let seed = 1; seed <= 300; seed++) if (tapeStopFor(style, seed)) n++; return n / 300; };
  assert(Math.abs(share('dnb') - TAPE_STOP_CHANCE) < 0.08 && share('trance') === 0 && share('eurobeat') === 0 && share('kraftwerk') === 0,
    'a tape stop comes up in about one take in three where it fits, and never in Trance, Eurobeat or Kraftwerk');
  const stopsOf = (song) => (song.arrangement.automation?.__master?.fx || [])
    .filter((x) => x.chain.some((c) => c.id === 'stutter' && c.params.stop > 0 && c.params.stop < 8));
  const yes = [...Array(60)].map((_, i) => i + 1).find((seed) => tapeStopFor('electro', seed));
  const no = [...Array(60)].map((_, i) => i + 1).find((seed) => !tapeStopFor('electro', seed));
  const withStop = stopsOf(makeBanger({ notes: DEFAULT_NOTES, style: 'electro', mood: 'dark', seed: yes }));
  assert(withStop.length > 0 && withStop.every((x) => x.to[1] === 0 && x.chain[0].params.stop === 1),
    'a take that gets one winds the last beat before each drop down onto the bar line');
  assert(stopsOf(makeBanger({ notes: DEFAULT_NOTES, style: 'electro', mood: 'dark', seed: no })).length === 0, 'a take that does not, has none');
  const dnb = [...Array(60)].map((_, i) => i + 1).find((seed) => tapeStopFor('dnb', seed));
  assert(stopsOf(makeBanger({ notes: DEFAULT_NOTES, style: 'dnb', mood: 'moody', seed: dnb })).every((x) => x.chain[0].params.stop === 2),
    'at Drum & Bass tempo the stop takes two beats');
}
{
  // The other Spot FX: a low-pass intro, a bitcrushed one where it belongs, an underwater
  // breakdown — each now and then, each read off the seed apart from the others.
  const N = 600;
  const share = (style, test) => { let n = 0; for (let seed = 1; seed <= N; seed++) if (test(spotFor(style, seed))) n++; return n / N; };
  assert(Math.abs(share('trance', (x) => x.intro === 'lowpass') - INTRO_LOWPASS_CHANCE) < 0.06
    && Math.abs(share('electro', (x) => x.intro === 'bitcrush') - INTRO_BITCRUSH_CHANCE) < 0.06
    && Math.abs(share('big-room', (x) => x.quiet === 'underwater') - UNDERWATER_CHANCE) < 0.06,
    'a low-pass intro one take in four, a bitcrushed one in five, an underwater breakdown in six');
  assert(['big-room', 'trance', 'future-bass', 'eurobeat', 'shibuya', 'dnb'].every((st) => share(st, (x) => x.intro === 'bitcrush') === 0)
    && share('megadrive', (x) => x.intro === 'bitcrush') > 0, 'the bitcrush only in 16-Bit and Electro');
  assert(JSON.stringify(spotFor('electro', 77)) === JSON.stringify(spotFor('electro', 77)), 'the same seed gets the same effects');
  const chainIds = (song) => (song.arrangement.automation?.__master?.fx || []).flatMap((x) => x.chain.map((c) => c.id));
  const crushed = [...Array(80)].map((_, i) => i + 1).find((seed) => spotFor('megadrive', seed).intro === 'bitcrush');
  const plain = [...Array(80)].map((_, i) => i + 1).find((seed) => !spotFor('megadrive', seed).intro);
  assert(chainIds(makeBanger({ notes: DEFAULT_NOTES, style: 'megadrive', mood: 'heroic', seed: crushed })).includes('bitcrusher')
    && !chainIds(makeBanger({ notes: DEFAULT_NOTES, style: 'megadrive', mood: 'heroic', seed: plain })).includes('bitcrusher'),
    'a take that rolls the bitcrush gets it on the master over the intro; one that does not, has none');
}
let threw = false;
try { makeBanger({ notes: normaliseNotes(null), style: 'trance', mood: 'dark', seed: 1 }); } catch { threw = true; }
assert(threw, 'an empty grid is refused');

// ---------------------------------------------------------------- the save
{
  const fake = { data: { settings: {}, slots: [] }, writes: 0, persist() { this.writes++; } };
  const b = bangerState(fake);
  assert(b.draft.style === MAKER_STYLES[0].id && b.draft.mode === 'simple' && b.draft.simple.join() === DEFAULT_NOTES.join(),
    'a new save starts from the default SIMPLE grid in the first style');
  // THE STARTER: a first-time Lab holds NEON ORBIT, played exactly as saved on the desk
  {
    const { STARTERS } = await import('../src/game/banger/starters.js');
    const { songFor, bangerTitle } = await import('../src/game/banger/store.js');
    const NEON = await import('../src/data/bangers/neon-orbit-banger.js');
    const st = b.kept[0];
    const song = st && songFor(st);
    assert(b.kept.length === 1 && st.preset === 'neon-orbit' && st.n === 1 && bangerTitle(st) === `NEON ORBIT (BIG-ROOM HOUSE/${NEON.banger.options.mood.toUpperCase()})`
      && song.bank === NEON.bank && song.mix === NEON.mix && song.form.length >= 7 && song.form[0].from === 1 && song.form.every((f, i) => !i || f.from === song.form[i - 1].to + 1),
    'a first-time Lab opens on NEON ORBIT, the desk song exactly as saved');
    assert(st.mode === 'advanced' && st.notes.length === 32 && st.notes.filter((n) => n >= 0).length === 9 && !st.options,
      'and it carries its riff on the ADVANCED grid, for the pencil');
    deleteBanger(st, fake);
    assert(bangerState(fake).kept.length === 0, 'deleted, the starter does not come back');
    // a Lab that already has songs gets it too, at the end; once gone, gone
    const old = { data: { settings: {}, slots: [], bangers: { kept: [{ v: 3, n: 1, name: 'OLD ONE', mode: 'simple', notes: DEFAULT_NOTES, style: 'trance', mood: 'dark', seed: 4, bpm: 138 }], next: 2 } }, persist() {} };
    const ob = bangerState(old);
    assert(ob.kept.length === 2 && ob.kept[0].name === 'OLD ONE' && ob.kept[1].preset === 'neon-orbit' && ob.kept[1].n === 2,
      'a Lab that already has songs gets the starter after them');
    // a starter kept under an older take follows the file's current one
    ob.kept[1].mood = 'hypnotic'; ob.kept[1].seed = 1;
    const re = bangerState(old).kept[1];
    assert(re.mood === STARTERS['neon-orbit'].recipe.mood && re.seed === STARTERS['neon-orbit'].recipe.seed, 'a kept starter follows its song file when the take is replaced');
    deleteBanger(ob.kept[1], old);
    assert(bangerState(old).kept.length === 1 && bangerState(old).kept.length === 1, 'and once deleted there, it is gone for good');
  }
  const advanced = toggleNote(expand(DEFAULT_NOTES), 1, 1, 'advanced');
  fake.writes = 0;
  saveDraft({ mode: 'advanced', simple: DEFAULT_NOTES, advanced, simpleEdited: false, style: 'dnb', mood: 'funky' }, fake);
  const d = bangerState(fake).draft;
  assert(d.style === 'dnb' && d.mode === 'advanced' && d.advanced[1] === 1 && fake.writes === 1,
    'the draft is saved, both grids and the mode');
  const first = keepBanger({ notes: DEFAULT_NOTES, mode: 'simple', style: 'trance', mood: 'dark', seed: 1, bpm: 138 }, fake);
  assert(/^[A-Z]+ [A-Z]+$/.test(first.name), `a banger gets a name from the new-song names (${first.name})`);
  {
    const { MOOD_WORDS, MOOD_NOUNS, moodNameCount, moodSongName } = await import('../src/game/banger/mood-names.js');
    const { BANGER_MOODS } = await import('../tools/lib/banger/options.js');
    assert(MOOD_WORDS.dark.includes(first.name.split(' ')[0]) && MOOD_NOUNS.includes(first.name.split(' ')[1]),
      `a banger is named for its mood: a dark one gets a dark word (${first.name})`);
    const plain = (w) => /^[A-Z]+$/.test(w);
    assert(BANGER_MOODS.every((m) => MOOD_WORDS[m.id]?.length >= 20 && moodNameCount(m.id) >= 2000)
      && Object.values(MOOD_WORDS).flat().concat(MOOD_NOUNS).every(plain),
    'every mood has its own words, a couple of thousand names each, all plain one-word pairs');
    const taken = [];
    for (let k = 0; k < 300; k++) taken.push(moodSongName({ mood: 'bittersweet', taken }));
    assert(new Set(taken).size === 300 && taken.every((n) => MOOD_WORDS.bittersweet.includes(n.split(' ')[0])),
      'three hundred bittersweet songs, three hundred different bittersweet names');
  }
  const again = keepBanger({ notes: DEFAULT_NOTES, mode: 'simple', style: 'trance', mood: 'dark', seed: 9, bpm: 140 }, fake);
  assert(again === first && bangerState(fake).kept.length === 1 && first.seed === 9 && first.bpm === 140 && first.n === 2,
    'GENER8 again with the same riff, style and mood is a new take of that song: same name and number, new seed');
  const second = keepBanger({ notes: DEFAULT_NOTES, style: 'trance', mood: 'moody', seed: 2, bpm: 138 }, fake, () => 0);
  const kept = bangerState(fake).kept;
  assert(kept.length === 2 && kept[0] === first && kept[1] === second,
    'a changed mood is a new song, added at the end so the ones before keep their numbers');
  const third = keepBanger({ notes: DEFAULT_NOTES, style: 'dnb', mood: 'moody', seed: 3, bpm: 174 }, fake, () => 0);
  assert(new Set(bangerState(fake).kept.map((r) => r.name)).size === 3, 'and no two kept songs share a name');
  assert(deleteBanger(second, fake) && bangerState(fake).kept.join() === [first, third].join() && !deleteBanger(second, fake),
    'deleting a song takes it out and the ones after move up; deleting it twice does nothing');
  // The list is full at MAX_KEPT: a further save is refused, and the oldest is never dropped.
  let k = 0;
  while (bangerState(fake).kept.length < MAX_KEPT) {
    keepBanger({ notes: DEFAULT_NOTES, style: 'trance', mood: k % 2 ? 'dark' : 'heroic', seed: 10 + k, bpm: 138 }, fake);
    k++;
  }
  const oldest = bangerState(fake).kept[0];
  const refused = keepBanger({ notes: DEFAULT_NOTES, style: 'dnb', mood: 'moody', seed: 999999, bpm: 174 }, fake);
  assert(refused === null && bangerState(fake).kept.length === MAX_KEPT && bangerState(fake).kept[0] === oldest,
    `at ${MAX_KEPT} songs a new save is refused and the oldest is never dropped`);
  fake.data.bangers.draft.style = 'nonsense';
  fake.data.bangers.kept.push({ junk: true });
  const repaired = bangerState(fake);
  assert(repaired.draft.style === MAKER_STYLES[0].id && repaired.kept.length === MAX_KEPT, 'a damaged corner of the save is repaired, not thrown');
  assert('bangers' in fake.data && !('bangers' in fake.data.settings), 'bangers sit beside the settings, out of RESET TO DEFAULTS\' reach');
}
{
  const rec = { n: 1, name: 'PINK SCOOTER', notes: DEFAULT_NOTES, style: 'megadrive', mood: 'heroic', seed: 5, bpm: 150 };
  const row = bangerRow(rec);
  const desc = Object.getOwnPropertyDescriptor(row, 'bank');
  assert(row.name === 'PINK SCOOTER (16-BIT/HEROIC)' && row.bpm === 150 && typeof desc.get === 'function',
    'a kept row is listed from its recipe; the song is made only when it is played');
  assert(row.bank && row.bank === row.bank && row.mix && row.arrangement, 'and made once');
}

Input.usingTouch = false;
function frame(state, ...actions) {
  for (const a of actions) Input.press(a);
  state.update(1 / 60);
  for (const a of actions) Input.release(a);
  Input.endFrame();
}
function tap(state, x, y) {
  Input.pointer = { x, y, down: true };
  Input.press('pointer');
  state.update(1 / 60);
  Input.release('pointer');
  Input.pointer.down = false;
  Input.endFrame();
}
const centre = (r) => [r.x + r.w / 2, r.y + r.h / 2];
const WHEEL_ROWS = (n) => n * 40;

// ---------------------------------------------------------------- the jukebox and THE LAB, before
// (a Lab that has had its starter, and deleted it)
save.data = { settings: {}, slots: [null, null, null], bangers: { startersGiven: ['neon-orbit'] } };
{
  const jb = new SoundTestState({ onDone: () => {} });
  jb.enter();
  const n = JUKEBOX.length;
  const { back, gen, del } = jb.backPlates();
  assert(jb.tracks.length === n && !gen && !del && jb.pointerIndex(jb.backY + jb.backH / 2, back.x + back.w - 4) === n,
    'the jukebox lists only the shipped songs, with BACK alone under them');
  const labHalf = new SoundTestState({ onDone: () => {}, lab: true }).backPlates().back;
  assert(back.x === labHalf.x && jb.pointerIndex(jb.backY + jb.backH / 2, back.x + back.w + 4) === -1,
    'the jukebox\'s BACK sits on the left, as the Lab\'s does, the gap after it no button');
  jb.draw(document.createElement('canvas').getContext('2d'));
  const lab = new SoundTestState({ onDone: () => {}, lab: true });
  lab.enter();
  const p = lab.backPlates();
  const midY = lab.backY + lab.backH / 2;
  assert(lab.tracks.length === 0 && p.gen.x > p.back.x + p.back.w && lab.pointerIndex(midY, p.gen.x + 4) === 1,
    'THE LAB starts empty, NEW BANGER to the right of BACK');
  lab.idx = 0;
  frame(lab, 'right');
  assert(lab.idx === 1, 'from BACK, right reaches NEW BANGER');
  lab.draw(document.createElement('canvas').getContext('2d'));
  assert(true, 'both draw');
}

{
  const recipe = { notes: DEFAULT_NOTES, style: 'trance', mood: 'dark', seed: 99 };
  const wild = makeBanger({ ...recipe, wild: true });
  const voltageBpms = [0, 1, 2, 3].map((voltage) => makeBanger({ ...recipe, voltage }).bpm);
  assert(voltageBpms.join() === '138,138,138,140', 'only Overload lifts tempo, capped by Trance\'s range');
  const expected = generateBanger({ riff: riffFromNotes(recipe.notes, hookSoundFor(recipe.style, recipe.mood)),
    options: { style: recipe.style, mood: recipe.mood, variation: 'wild', spot: spotFor(recipe.style, recipe.seed) }, seed: recipe.seed });
  assert(JSON.stringify(wild.bank) === JSON.stringify(expected.bank), 'Go wild uses the generator Wild variation');
  assert(JSON.stringify(wild.bank) !== JSON.stringify(makeBanger(recipe).bank), 'Go wild changes the generated music');
}

// ---------------------------------------------------------------- the maker
{
  let made = null;
  let backs = 0;
  const maker = new BangerMakerState({ onDone: () => { backs++; }, onMade: (rec, song, from, recharging) => { made = { rec, song, from, recharging }; } });
  maker.enter();
  let L = maker.layout();
  assert(BANGER_VOLTAGES.map((preset) => preset.label).join() === 'Safe,Charged,Surge,Overload'
    && maker.voltage === 1 && maker.mutationLabel() === 'CHARGED · HYBRID', 'the maker opens on MUTATION at Charged · Hybrid');
  assert(L.pickers.length === 4 && !('voltageBox' in L), 'Formula, Infusion, Element and Mutation share one selector row');
  assert(!('wildBox' in L) && !('energyBox' in L) && !('effectsBox' in L), 'Go Wild, Energy and Track Effects are merged');
  // MUTATION is Voltage and DNA in one selector: a 4×4 grid, Voltage down the side, DNA across.
  const chooseMutation = (level, dna) => {
    const control = L.pickers[3];
    tap(maker, control.x + control.w / 2, control.y + control.h / 2);
    const { cells, grid } = maker.chooserLayout(maker.layout());
    assert(maker.chooser?.picker === 3 && cells.length === 16 && grid, 'MUTATION opens a grid of all sixteen');
    maker.draw(document.createElement('canvas').getContext('2d'));
    const k = level * 4 + MAKER_VARIATIONS.findIndex((v) => v.id === dna);
    tap(maker, cells[k].x + cells[k].w / 2, cells[k].y + cells[k].h / 2);
  };
  assert(maker.variation === 'some', 'DNA starts on Hybrid, not Pure');
  maker.setVariation('nonsense');
  assert(maker.variation === 'some', 'an unreadable DNA setting reads as Hybrid');
  chooseMutation(0, 'some');
  assert(!maker.chooser && maker.voltage === 0 && maker.energy === 'lean' && maker.trackEffects === 'style' && maker.variation === 'some', 'Safe · Hybrid keeps the formula intact and sequences the riff, and a tap closes the grid');
  chooseMutation(2, 'some');
  assert(maker.voltage === 2 && maker.energy === 'huge' && maker.trackEffects === 'adventurous' && maker.variation === 'some', 'Surge maps to high energy and bold FX');
  chooseMutation(3, 'some');
  assert(maker.voltage === 3 && maker.wild && maker.energy === 'maximum' && maker.trackEffects === 'overhaul' && maker.variation === 'some', 'Overload maps to maximum energy and full FX');
  chooseMutation(3, 'faithful');
  assert(maker.voltage === 3 && maker.energy === 'maximum' && maker.variation === 'faithful', 'Overload · Pure: everything flat out, the riff as written — every pairing is still there');
  {
    const control = L.pickers[3];
    assert(MUTATION_LADDER.join() === '0,4,5,10,12,15', 'its arrows step six: Safe·Pure, Charged·Pure, Charged·Hybrid, Surge·Spliced, Overload·Pure, Overload·Mutant');
    maker.setMutation(6);
    tap(maker, control.x + control.w * 0.1, control.y + control.h / 2);
    assert(maker.mutation === 5, 'from off the ladder, the left arrow steps down to the next step below');
    tap(maker, control.x + control.w - 3, control.y + control.h / 2);
    assert(maker.mutation === 10 && maker.voltage === 2 && maker.variation === 'more', 'and the right arrow up to Surge · Spliced');
  }
  chooseMutation(1, 'some');
  assert(maker.voltage === 1 && !maker.wild && maker.energy === 'full' && maker.trackEffects === 'subtle', 'Charged maps to medium energy and subtle FX');
  assert(maker.mode === 'simple' && maker.rows === 11 && maker.steps === 16, 'the maker opens in SIMPLE');
  assert(maker.actionWord() === 'BRING TO LIFE', 'a new banger is made with BRING TO LIFE');
  {
    // the middle of MOOD opens every mood at once; a tap on one picks it and closes
    const moodBox = L.pickers[2];
    const before = maker.mood;
    tap(maker, moodBox.x + moodBox.w / 2, moodBox.y + moodBox.h / 2);
    assert(maker.chooser?.picker === 2 && maker.chooser.items.length === MAKER_MOODS.length, 'the middle of MOOD opens every mood at once');
    const { cells } = maker.chooserLayout(maker.layout());
    const pick = MAKER_MOODS.findIndex((m) => m.id !== before);
    maker.draw(document.createElement('canvas').getContext('2d'));
    tap(maker, cells[pick].x + cells[pick].w / 2, cells[pick].y + cells[pick].h / 2);
    assert(!maker.chooser && maker.mood === MAKER_MOODS[pick].id, 'and a tap on one picks it and closes');
    tap(maker, moodBox.x + moodBox.w - 3, moodBox.y + moodBox.h / 2);
    assert(!maker.chooser && maker.mood === MAKER_MOODS[(pick + 1) % MAKER_MOODS.length].id, 'the arrow at the end still steps');
    maker.mood = before;
    // BACK at the top of every chooser closes it with nothing changed, by tap or by keys
    for (let p = 0; p < 4; p++) {
      const box = L.pickers[p];
      const was = maker.pickerValue(p);
      tap(maker, box.x + box.w / 2, box.y + box.h / 2);
      const { back, cells: list } = maker.chooserLayout(maker.layout());
      assert(maker.chooser?.picker === p && back.y + back.h <= list[0].y, `chooser ${p} has BACK above its choices`);
      tap(maker, back.cx, back.cy);
      assert(!maker.chooser && maker.pickerValue(p) === was, `chooser ${p}: BACK closes it and changes nothing`);
    }
    tap(maker, moodBox.x + moodBox.w / 2, moodBox.y + moodBox.h / 2);
    maker.chooser.sel = 0;
    frame(maker, 'up');
    assert(maker.chooser.sel === -1, 'up from the top row reaches BACK');
    frame(maker, 'confirm');
    assert(!maker.chooser && maker.mood === before, 'and confirm on it closes with nothing changed');
  }
  {
    // The style and mood are remembered; the grid's preview sound changes every visit.
    const left = { style: MAKER_STYLES[MAKER_STYLES.length - 1].id, mood: MAKER_MOODS[MAKER_MOODS.length - 1].id };
    saveDraft({ ...bangerState().draft, ...left });
    const voices = new Set();
    let kept = true;
    let repeats = 0;
    let last = null;
    for (let k = 0; k < 30; k++) {
      const m = new BangerMakerState({ onDone: () => {}, onMade: () => {} });
      m.enter();
      if (m.style !== left.style || m.mood !== left.mood) kept = false;
      if (m.riffVoice === last) repeats++;
      voices.add(m.riffVoice);
      last = m.riffVoice;
      m.exit();
    }
    assert(kept, 'each visit opens on the style and mood it was left on');
    assert(voices.size >= 6 && repeats === 0 && [...voices].every((id) => RIFF_VOICES.includes(id)),
      `and plays the grid on a different soft preset each visit, never last visit's (${voices.size} heard in 30)`);
  }
  {
    // Landscape SIMPLE shows all eleven rows, G4 to C6, and does not scroll (Peter, 5 Oct 2026).
    assert(maker.visibleRows === 11 && L.grid.visible === 11 && maker.scrollRow === 0,
      'landscape SIMPLE shows every row, G4 to C6');
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + L.grid.cellH / 2);
    assert(maker.notes[2] === 10, 'the top square is C6');
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + L.grid.cellH / 2);
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + 10.5 * L.grid.cellH);
    assert(maker.notes[2] === 0, 'and the bottom square G4');
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + 10.5 * L.grid.cellH);
    Input.wheelY = -WHEEL_ROWS(2);
    maker.update(1 / 60); Input.endFrame();
    assert(maker.scrollRow === 0, 'and the wheel has nothing to scroll');
  }
  {
    // ADVANCED shows the A-to-A grid's thirteen rows at their size and scrolls for the rest.
    maker.setMode('advanced');
    const A = maker.layout().grid;
    assert(maker.visibleRows === 13 && A.visible === 13, 'landscape ADVANCED shows thirteen rows and scrolls');
    maker.scrollRow = 2;
    Input.wheelY = -WHEEL_ROWS(2);
    maker.update(1 / 60); Input.endFrame();
    assert(maker.scrollRow === 0, 'the wheel scrolls up to C6');
    tap(maker, A.x + A.cellW * 2.5, A.y + A.cellH / 2);
    assert(maker.notes[2] === 17, 'and the top square is C6 now');
    tap(maker, A.x + A.cellW * 2.5, A.y + A.cellH / 2);
    // drag the note names up: the grid follows, down to G4
    const nx = A.labelX + 4;
    Input.pointer = { x: nx, y: A.y + A.cellH, down: true };
    Input.press('pointer'); maker.update(1 / 60); Input.release('pointer'); Input.endFrame();
    Input.pointer.y -= A.cellH * 5; maker.update(1 / 60); Input.endFrame();
    assert(maker.scrollRow === 5, 'dragging the note names scrolls the grid, writing nothing');
    Input.pointer.down = false; maker.update(1 / 60); Input.endFrame();
    tap(maker, A.x + A.cellW * 2.5, A.y + 12.5 * A.cellH);
    assert(maker.notes[2] === 0, 'the bottom square is G4 now');
    tap(maker, A.x + A.cellW * 2.5, A.y + 12.5 * A.cellH);
    // a tap on the names, not a drag, is an arrow: one row each way (it lands on the release)
    const tapNames = (y) => { tap(maker, nx, y); maker.update(1 / 60); Input.endFrame(); };
    tapNames(A.y + A.cellH);
    assert(maker.scrollRow === 4, 'a tap on the top half of the names scrolls up one row');
    tapNames(A.y + A.h - A.cellH);
    assert(maker.scrollRow === 5, 'and on the bottom half, down one');
    maker.scrollRow = 3;
    maker.focus = { area: 'grid', col: 0, row: 3, picker: 0, button: 3 };
    frame(maker, 'up');
    assert(maker.focus.row === 2 && maker.scrollRow === 2, 'the focus walking off the top scrolls one row');
    maker.focus = { area: 'mode', col: 0, row: 0, picker: 0, button: 3 };
    frame(maker, 'down');
    assert(maker.focus.area === 'bars', 'down from SIMPLE / ADVANCED reaches the + at the end of the bar numbers');
    frame(maker, 'down');
    assert(maker.focus.area === 'grid' && maker.focus.row === 2, 'and down again lands on the top row on show');
    maker.setMode('simple');
    L = maker.layout();
  }
  {
    // A note dragged out is as long as the drag, however slowly (Peter, 5 Oct 2026: "it draws
    // past the end"); held still, it is as long as it was held.
    const notes = maker.notes, lengths = maker.lengths;
    const per = 32 / maker.steps, y = L.grid.y + 4.5 * L.grid.cellH, x = L.grid.x + L.grid.cellW * 4.5;
    const press = (dx) => {
      maker.notes = maker.notes.map((n, c) => (c === 4 ? -1 : n));
      Input.pointer = { x, y, down: true };
      Input.press('pointer'); maker.update(1 / 60); Input.endFrame();
      Input.pointer.x += dx; maker.update(1 / 60); Input.endFrame();
      if (maker.pointerNote) maker.pointerNote.at -= 3000;   // three seconds down
      Input.release('pointer'); Input.pointer.down = false; maker.update(1 / 60); Input.endFrame();
      return maker.lengths[4];
    };
    const dragged = press(L.grid.cellW * 2);
    const still = press(0);
    maker.notes = notes; maker.lengths = lengths;
    assert(dragged === 3 * per && still > 3 * per, `a slow drag ends where it stopped (${dragged}); a note held still runs on (${still})`);
  }
  // Tap A5 at step 0, the third row down.
  tap(maker, L.grid.x + L.grid.cellW / 2, L.grid.y + 2.5 * L.grid.cellH);
  assert(maker.notes[0] === 8, 'tapping a square writes that note');

  // SIMPLE → ADVANCED after an edit in SIMPLE: ADVANCED is SIMPLE converted up.
  tap(maker, L.modeBox.x + L.modeBox.w * 0.75, L.modeBox.y + L.modeBox.h / 2);
  L = maker.layout();
  assert(maker.mode === 'advanced' && maker.rows === 18 && maker.visibleRows === 13 && maker.steps === 32 && maker.notes[0] === 14,
    'ADVANCED shows SIMPLE converted up');
  // Write a sharp on an off-sixteenth: only ADVANCED can hold it.
  const sharpRow = 12 - 1;                       // A#4, one row up from the bottom of the window
  tap(maker, L.grid.x + 1.5 * L.grid.cellW, L.grid.y + (sharpRow + 0.5) * L.grid.cellH);
  assert(maker.advanced[1] === 3, 'ADVANCED takes a sharp on a sixteenth');
  const remembered = [...maker.advanced];
  tap(maker, L.modeBox.x + L.modeBox.w * 0.25, L.modeBox.y + L.modeBox.h / 2);
  assert(maker.mode === 'simple' && maker.notes.join() === simplify(remembered).slice(0, maker.steps).join(),
    'ADVANCED → SIMPLE shows the riff converted to scale notes and eighths');
  tap(maker, L.modeBox.x + L.modeBox.w * 0.75, L.modeBox.y + L.modeBox.h / 2);
  assert(maker.mode === 'advanced' && maker.advanced.join() === remembered.join(),
    'and back again, untouched, ADVANCED is exactly as it was');
  maker.setMode('simple');
  L = maker.layout();
  tap(maker, L.grid.x + 15.5 * L.grid.cellW, L.grid.y + 0.5 * L.grid.cellH);
  maker.setMode('advanced');
  assert(maker.advanced.join() === expand(maker.simple).join() && maker.advanced[1] === -1,
    'but once SIMPLE has been written in, going up converts SIMPLE');
  maker.setMode('simple');
  L = maker.layout();

  const style0 = maker.style;
  maker.loopT0 = 1; maker.scheduled = 9; maker.playStep = 4;
  tap(maker, L.pickers[0].x + L.pickers[0].w - 4, L.pickers[0].y + L.pickers[0].h / 2);
  const pickedStyle = BANGER_STYLES.find((style) => style.id === maker.style);
  assert(maker.style !== style0 && maker.previewBpm === (pickedStyle.tempoRange?.[0] ?? pickedStyle.bpm) - 4
    && maker.loopT0 === null && maker.scheduled === -1 && maker.playStep === -1,
  'tapping the STYLE picker moves the preview to four BPM below the style limit and restarts its beat clock');
  tap(maker, L.pickers[0].x + 4, L.pickers[0].y + L.pickers[0].h / 2);
  assert(maker.style === style0
    && maker.previewBpm === (BANGER_STYLES.find((style) => style.id === style0).tempoRange?.[0]
      ?? BANGER_STYLES.find((style) => style.id === style0).bpm) - 4,
  'and its left end restores the previous style at four BPM below the limit');
  const allStylePreviewsSlow = BANGER_STYLES.every((style) => {
    maker.setStyle(style.id);
    return maker.previewBpm === (style.tempoRange?.[0] ?? style.bpm) - 4;
  });
  maker.setStyle(style0);
  assert(allStylePreviewsSlow, 'every style preview is four BPM below its lower tempo limit');
  const mood0 = maker.mood;
  tap(maker, L.pickers[2].x + L.pickers[2].w - 4, L.pickers[2].y + L.pickers[2].h / 2);
  assert(maker.mood !== mood0, 'tapping the MOOD picker moves to the next mood');

  // From the grid's bottom row, down reaches the selector in the same column;
  // up from the top row reaches the mode switch.
  maker.focus = { area: 'grid', col: maker.steps - 1, row: maker.rows - 1, picker: 0, button: 3 };
  frame(maker, 'down');
  assert(maker.focus.area === 'picker' && maker.focus.picker === 3, 'down from the grid reaches MUTATION in the same selector row');
  maker.setMutation(0);
  frame(maker, 'right');
  assert(maker.voltage === 1 && maker.variation === 'faithful', 'right steps MUTATION from Safe · Pure to Charged · Pure');
  frame(maker, 'right');
  assert(maker.variation === 'some', 'then Charged · Hybrid');
  frame(maker, 'right'); frame(maker, 'right'); frame(maker, 'right'); frame(maker, 'right');
  assert(maker.voltage === 3 && maker.variation === 'wild', 'left and right step the ladder, stopping at Overload · Mutant');
  maker.focus.picker = 1;
  frame(maker, 'right');
  assert(maker.infusion && maker.infusion !== maker.style, 'right turns INFUSION from NONE to another formula');
  frame(maker, 'left');
  assert(maker.infusion === null, 'and left back to NONE');
  frame(maker, 'down');
  assert(maker.focus.area === 'button', 'down from the selectors reaches the action buttons');
  maker.focus = { area: 'grid', col: 2, row: 0, picker: 0, button: 3 };
  frame(maker, 'up');
  assert(maker.focus.area === 'bars', 'up from the top row reaches the + at the end of the bar numbers');
  frame(maker, 'up');
  frame(maker, 'right');
  assert(maker.focus.area === 'mode' && maker.mode === 'advanced', 'up again reaches SIMPLE / ADVANCED, and right picks ADVANCED');
  frame(maker, 'left');
  assert(maker.mode === 'simple', 'left picks SIMPLE');

  tap(maker, ...centre(L.buttons[0]));
  assert(maker.notes.every((n) => n < 0), 'CLEAR empties the grid');
  {
    const was = { style: maker.style, mood: maker.mood, voltage: maker.voltage, variation: maker.variation };
    const notes = maker.notes.join();
    let styles = 0, moods = 0, infused = 0;
    const voltages = new Set(), dnas = new Set();
    for (let k = 0; k < 40; k++) {
      const before = { style: maker.style, mood: maker.mood };
      tap(maker, ...centre(L.buttons[2]));
      if (maker.style !== before.style) styles++;
      if (maker.mood !== before.mood) moods++;
      if (maker.infusion) infused++;
      voltages.add(maker.voltage); dnas.add(maker.variation);
    }
    assert(styles === 40 && moods === 40 && voltages.size === BANGER_VOLTAGES.length && dnas.size === 3 && !dnas.has('faithful')
      && maker.energy === voltageSettings(maker.voltage).energy && maker.notes.join() === notes,
    'EXPERIMENT picks a new formula and element every time, any voltage, DNA Hybrid, Spliced or Mutant (never Pure), and leaves the notes alone');
    assert(infused > 4 && infused < 30, 'and an INFUSION now and then, NONE the rest');
    maker.setStyle(was.style); maker.setInfusion(null); maker.mood = was.mood; maker.setVoltage(was.voltage, false); maker.setVariation(was.variation);
  }
  tap(maker, ...centre(L.buttons[1]));
  assert(hasNotes(maker.notes) && maker.notes.length === 16, 'ZAP writes a riff into the grid on show');
  const lucky = [...maker.notes];

  tap(maker, ...centre(L.buttons[3]));
  assert(maker.making > 0 && !made, 'GENER8 shows GENER8ING... for a frame before the work');
  frame(maker); frame(maker);
  assert(made && made.song.bank && made.rec.style === maker.style && made.rec.mood === maker.mood
    && made.recharging === false
    && made.rec.voltage === 3 && made.rec.variation === 'wild' && made.rec.energy === 'maximum'
    && save.data.bangers.draft.voltage === 3 && save.data.bangers.draft.energy === 'maximum'
    && made.rec.production.mode === 'overhaul' && made.rec.wild && save.data.bangers.draft.wild
    && made.rec.mode === 'simple' && made.rec.notes.join() === lucky.join(),
  'GENER8 makes the song from the grid on show, its mode, style and mood, and hands it over');
  assert(!bangerState().kept.includes(made.rec) && save.data.bangers.draft.simple.join() === lucky.join(),
    'the banger is not kept yet — saving is the player\'s call — but the grid is remembered');
  assert(typeof made.rec.name === 'string' && made.rec.name.length > 0, 'the pending preview is titled before it is kept');
  const kept = keepBanger({ ...made.rec, fresh: false, name: made.rec.name });
  assert(kept === bangerState().kept.at(-1) && bangerState().kept.includes(kept), 'saving the pending recipe keeps the song');
  assert(kept.expression === 4 && JSON.stringify(makeBanger(kept).mix) === JSON.stringify(made.song.mix),
    'a new recipe opts into expression version 4 (Go Wild\'s slide on the lead, the voltage rolls, the form roll), and made again from the kept recipe it is the song just handed over');

  tap(maker, ...centre(L.buttons[0]));
  made = null;
  tap(maker, ...centre(L.buttons[3]));
  frame(maker); frame(maker);
  assert(!made && maker.messageT > 0, 'GENER8 on an empty grid says so and makes nothing');
  assert(L.backBox.x + L.backBox.w < L.modeBox.x && L.backBox.cy === L.modeBox.y + L.modeBox.h / 2,
    'BACK is a round arrow at the left of the title row, level with SIMPLE / ADVANCED');
  tap(maker, ...centre(L.backBox));
  assert(backs === 1, 'BACK goes back');
  maker.focus = { area: 'mode', col: 0, row: 0, picker: 0, button: 3 };
  frame(maker, 'left');
  assert(maker.focus.area === 'back' && maker.mode === 'simple', 'left past SIMPLE reaches the BACK arrow');
  frame(maker, 'confirm');
  assert(backs === 2, 'and confirm on it goes back');
  backs = 1;
  frame(maker, 'back');
  assert(backs === 2, 'so does the back gesture');
  const ctx = document.createElement('canvas').getContext('2d');
  maker.draw(ctx);
  maker.setMode('advanced');
  maker.draw(ctx);
  assert(true, 'the maker draws in both modes');
}

// ---------------------------------------------------------------- two bars or four: + and − (Peter, 6 Oct 2026)
{
  const { settleBars, barsOf, stepsOf } = riffMod;
  const random = (() => { let x = 19; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  // ZAP's four bars: a question and its answer.
  let shaped = true;
  for (let k = 0; k < 60; k++) {
    for (const mode of ['simple', 'advanced']) {
      const n = luckyNotes(mode, random, 4);
      const half = stepsOf(mode, 2), bar = half / 2;
      const rhythm = (b) => n.slice(b * bar, (b + 1) * bar).map((r) => (r >= 0 ? 'x' : '.')).join('');
      const last = n.findLast((r) => r >= 0);
      const home = mode === 'simple' ? [1, 8] : [2, 14];
      if (n.length !== 2 * half || rhythm(2) !== rhythm(0) || n.slice(2 * bar, 3 * bar).join() === n.slice(0, bar).join()
        || !home.includes(last) || n[3 * bar] < 0) shaped = false;
    }
  }
  assert(shaped, 'ZAP at four bars: bar 3 is bar 1\'s rhythm on other notes, bar 4 comes home to A');
  const two = luckyNotes('simple', random);
  const copy = [...two, ...two];
  const copyL = normaliseLengths(null, copy, 'simple');
  assert(barsOf(copy, 'simple') === 4 && barsOf(two, 'simple') === 2 && normaliseNotes(two, 'simple', 4).length === 32
    && normaliseNotes(two, 'simple', 4).slice(16).every((r) => r < 0), 'a grid\'s bars are its length; a two-bar grid asked for four gets two bars of rest');
  const settled = settleBars(copy, copyL, 'simple');
  const real = [...two, ...luckyNotes('simple', random)];
  assert(settled.notes.join() === two.join() && settled.lengths.length === 16 && settleBars(real, null, 'simple').notes.length === 32,
    'four bars that are still the copy go to the generator as two; four of their own stay four');
  const riff = riffFromNotes(real);
  assert(riff.bars === 4 && riff.source.to === 3 && riff.parts[0].bars.length === 4 && riff.parts[0].bars.every((b) => b.split(' ').length === 16),
    'a four-bar grid is a four-bar riff, the shape the desk reads off a song');
  const song4 = makeBanger({ notes: real, style: 'eurodance', mood: defaultMoodFor('eurodance'), seed: 3 });
  assert(song4.bank && makeBanger({ notes: real, style: 'eurodance', mood: defaultMoodFor('eurodance'), seed: 3 }).bank, 'and makes a song');
}
{
  let made = null;
  saveDraft({ mode: 'simple', simple: DEFAULT_NOTES, advanced: expand(DEFAULT_NOTES), simpleEdited: true, style: 'eurodance', mood: defaultMoodFor('eurodance') });
  const maker = new BangerMakerState({ onDone: () => {}, onMade: (rec, song) => { made = { rec, song }; }, random: () => 0 });
  maker.enter();
  let L = maker.layout();
  const g0 = L.grid;
  assert(maker.bars === 2 && maker.steps === 16 && maker.notes.join() === DEFAULT_NOTES.join() && L.grids.length === 1
    && L.barsBox.y >= g0.rulerY && L.barsBox.y + L.barsBox.h <= g0.y && Math.abs(L.barsBox.x + L.barsBox.w - (g0.x + g0.w)) < 0.01
    && L.barsBox.y > L.modeBox.y + L.modeBox.h,
  'the grid opens on two bars, its bar numbers along the top and the + at their end, out of the title row');
  tap(maker, ...centre(L.barsBox));
  L = maker.layout();
  assert(maker.bars === 4 && maker.steps === 32 && maker.notes.join() === [...DEFAULT_NOTES, ...DEFAULT_NOTES].join() && maker.repeats()
    && L.grids.length === 1 && L.grid.cols === 32 && maker.message === 'BARS 3-4 ADDED',
  '+ brings bars 3–4 in as a repeat of 1–2, says so, and landscape shows all four bars on one line');
  // a note written in bar 1 is followed in bar 3 while 3–4 are still the repeat
  maker.toggle(2, maker.rows - 1 - 6);
  assert(maker.notes[2] === 6 && maker.notes[18] === 6 && maker.repeats(), 'an edit in bars 1–2 is followed by the repeat');
  const followed = [...maker.notes];
  frame(maker); frame(maker);
  tap(maker, ...centre(L.buttons[3]));
  frame(maker); frame(maker);
  assert(made && made.rec.notes.join() === followed.slice(0, 16).join() && made.rec.lengths.length === 16,
    'still the repeat, BRING TO LIFE makes the two-bar song');
  // write in bar 3: the top square of its first column
  tap(maker, L.grid.startX(32) + 1, L.grid.y + L.grid.cellH / 2);
  assert(maker.notes[16] === 10 && maker.simple[16] === 10 && !maker.repeats(), 'a note written in bar 3 makes bars 3–4 the riff\'s own');
  maker.toggle(3, maker.rows - 1 - 4);
  assert(maker.notes[3] === 4 && maker.notes[19] !== 4, 'and bars 1–2 are no longer followed');
  const four = [...maker.notes];
  made = null;
  tap(maker, ...centre(L.buttons[3]));
  frame(maker); frame(maker);
  assert(made && made.rec.notes.join() === four.join() && made.song.bank, 'bars 3–4 of their own make a four-bar song');
  assert(bangerState().draft.bars === 4 && bangerState().draft.simple.length === 32, 'and the draft remembers four bars');
  tap(maker, ...centre(L.barsBox));
  assert(maker.bars === 2 && maker.message === 'BACK TO 2 BARS' && maker.notes.join() === four.slice(0, 16).join()
    && maker.simple.slice(16).join() === four.slice(16).join(), '− goes back to two bars, says so, and keeps bars 3–4');
  maker.setBars(4);
  assert(maker.notes.join() === four.join(), 'and + brings them back as they were');
  // ADVANCED's four bars on one line in landscape; in portrait, two lines, bars 3–4 under 1–2
  tap(maker, L.modeBox.x + L.modeBox.w * 0.75, L.modeBox.y + L.modeBox.h / 2);
  L = maker.layout();
  assert(maker.mode === 'advanced' && maker.steps === 64 && L.grids.length === 1 && L.grid.cols === 64,
    'ADVANCED\'s four bars are one line of sixty-four columns in landscape');
  {
    // a phone held upright: a real portrait frame, 393 by 852
    const { setPresentationFrame } = await import('../src/engine/renderer.js');
    const { frameForViewport, defaultFrame, PHONE_PORTRAIT } = await import('../src/engine/frame.js');
    setPresentationFrame(frameForViewport({ mode: PHONE_PORTRAIT, viewportWidth: 393, viewportHeight: 852 }));
    try {
      const P2 = maker.layout();
      const [a, b] = P2.grids;
      assert(P2.grids.length === 2 && a.cols === 32 && b.cols === 32 && b.firstCol === 32 && b.bar0 === 2 && a.bar0 === 0
        && b.rulerY >= a.y + a.h && b.y === b.rulerY + b.rulerH && P2.barsBox.y >= b.rulerY && P2.barsBox.y + P2.barsBox.h <= b.y,
      'portrait stacks four bars two over two, each line under its own bar numbers, the − at the end of the second');
      const before = maker.notes[33];
      assert(before < 0, 'bar 3\'s second sixteenth starts empty');
      tap(maker, b.startX(1) + b.cellW / 2, b.y + b.cellH / 2);
      assert(maker.notes[33] >= 0, 'a tap on the second line writes in bar 3');
      maker.draw(document.createElement('canvas').getContext('2d'));
    } finally { setPresentationFrame(defaultFrame()); }
  }
  maker.setMode('simple');
  // the keyboard: + / − sits between SIMPLE / ADVANCED and the grid, and confirm on it says what it did
  maker.focus = { area: 'mode', col: 0, row: 0, picker: 0, button: 3 };
  frame(maker, 'down');
  frame(maker, 'confirm');
  assert(maker.focus.area === 'bars' && maker.bars === 2 && maker.message === 'BACK TO 2 BARS', 'confirm on − goes back to two bars');
  frame(maker, 'confirm');
  assert(maker.bars === 4 && maker.message === 'BARS 3-4 ADDED', 'and on + brings four back');
  // a mouse resting on + / − gets a tooltip
  Input.usingTouch = false;
  L = maker.layout();
  Input.pointer = { x: L.barsBox.x + 2, y: L.barsBox.y + 2, down: false };
  maker.draw(document.createElement('canvas').getContext('2d'));
  // ZAP at four bars writes four: a cabinet's own phrase (this maker's random is 0), or one of its own
  tap(maker, ...centre(L.buttons[1]));
  assert(maker.notes.length === 32 && hasNotes(maker.notes.slice(16)), 'ZAP at four bars writes four bars');
  tap(maker, ...centre(L.buttons[0]));
  maker.setBars(2);
  maker.setBars(4);
  assert(maker.notes.every((n) => n < 0), 'CLEAR takes bars 3–4 with it');
  maker.draw(document.createElement('canvas').getContext('2d'));
  maker.exit();
}

// ---------------------------------------------------------------- THE LAB, after
{
  const jb = new SoundTestState({ onDone: () => {} });
  jb.enter();
  assert(jb.tracks.length === JUKEBOX.length, 'a made banger stays out of the jukebox');
  const lab = new SoundTestState({ onDone: () => {}, lab: true });
  lab.enter();
  const mine = lab.tracks[0];
  assert(lab.tracks.length === bangerState().kept.length && mine.banger === bangerState().kept[0]
    && lab.rowText(0, mine) === `1. ${mine.name}` && / \([A-Z0-9][A-Z0-9 -]*\/[A-Z -]+\)$/.test(mine.name),
  'THE LAB lists the made songs from 1, each titled NAME (STYLE/MOOD)');
  let opened = null;
  lab.openClub = (rec) => { opened = rec; };
  lab.idx = 0;
  frame(lab, 'confirm');
  assert(opened === mine.banger && lab.playing === -1, 'choosing a song opens it in the club, not in the list');
  lab.draw(document.createElement('canvas').getContext('2d'));

  const visiting = new SoundTestState({ onDone: () => {}, lab: true });
  visiting.enter();
  const played = visiting.tracks.at(-1).banger;
  visiting.openClub(played);
  const returned = new SoundTestState({ onDone: () => {}, lab: true });
  returned.enter();
  assert(lastPlayedBanger() === played && returned.tracks[returned.idx]?.banger === played && returned.playing === -1,
    're-entering THE LAB selects the last club track without starting it again');
}
{
  // DELETE: up while the selected song is one of theirs; ARE YOU SURE?, NO first; the songs
  // after it move up a number.
  keepBanger({ notes: DEFAULT_NOTES, style: 'trance', mood: 'dark', seed: 21, bpm: 138 });
  keepBanger({ notes: DEFAULT_NOTES, style: 'dnb', mood: 'moody', seed: 22, bpm: 174 });
  const [a, b, c] = bangerState().kept.slice(-3);
  const lab = new SoundTestState({ onDone: () => {}, lab: true });
  lab.enter();
  const at = lab.tracks.length - 3;                 // a's row; b is at + 1, c at + 2
  lab.idx = at + 1; frame(lab);
  const { back, del, gen } = lab.backPlates();
  assert(del && del.x > back.x + back.w && gen.x > del.x + del.w, 'a song selected: DELETE comes up between BACK and NEW BANGER');
  const B = lab.tracks.length;                      // BACK; NEW BANGER is B + 1, DELETE B + 2
  lab.idx = B; frame(lab, 'right');
  assert(lab.idx === B + 2 && lab.deletable().banger === b, 'right from BACK reaches DELETE, still meaning the song last selected');
  frame(lab, 'right');
  assert(lab.idx === B + 1, 'and right again NEW BANGER');
  lab.idx = B + 2; frame(lab, 'confirm');
  assert(lab.confirmDelete && lab.confirmDelete.rec === b && !lab.confirmDelete.yes, 'DELETE asks ARE YOU SURE? about the selected song, with NO picked');
  lab.draw(document.createElement('canvas').getContext('2d'));
  frame(lab, 'confirm');
  assert(!lab.confirmDelete && bangerState().kept.includes(b), 'ENTER on NO keeps the song');
  frame(lab, 'confirm');
  frame(lab, 'back');
  assert(!lab.confirmDelete && bangerState().kept.includes(b), 'so does BACK');
  frame(lab, 'confirm'); frame(lab, 'left'); frame(lab, 'confirm');
  const after = bangerState().kept;
  assert(!after.includes(b) && after.at(-2) === a && after.at(-1) === c, 'YES takes it out');
  assert(lab.tracks[at + 1].banger === c && lab.rowText(at + 1, lab.tracks[at + 1]).startsWith(`${at + 2}. ${c.name}`) && lab.idx === at + 1,
    'the song after it moves up a number, and the cursor lands on it');
  const g = lab.backPlates();
  tap(lab, g.del.x + g.del.w / 2, lab.backY + lab.backH / 2);
  assert(lab.confirmDelete?.rec === c, 'a tap on DELETE asks too');
}

// ---------------------------------------------------------------- the club
{
  const rec = bangerState().kept.at(-1);
  let backs = 0;
  let edited = null;
  let leftRoom = null;
  const club = new BangerClubState({ rec, onBack: () => { backs++; }, onEdit: (r, p, room) => { edited = r; leftRoom = room; } });
  club.enter();
  const ctx = document.createElement('canvas').getContext('2d');
  club.draw(ctx);
  assert(club.boxes.heroes.length === HERO_MOVES.length && club.boxes.mixer && !club.mixerOpen && club.boxes.back,
    'the club puts every hero on the floor, the mixer icon and a back button on screen');
  {
    const e = club.boxes.edit;
    assert(e && e.x < 60 && e.y > club.boxes.heroes[0].y, 'the pencil sits in the bottom-left corner');
    tap(club, e.x + e.w / 2, e.y + e.h / 2);
    assert(edited === rec, 'the pencil opens this song to edit');
  }
  // (a hero's box follows them, so let the walk-in finish before aiming at one)
  club.shownAt = club.t - 30; club.draw(ctx);
  // Back from the riff grid — a RECHARGE or its BACK — the room is as the pencil left it: every
  // hero on their spot from the first frame, the ball hung, and only the NOW PLAYING card, not
  // the walk-in and the welcome (Peter, 6 Oct 2026).
  {
    const again = new BangerClubState({ rec, onBack: () => {}, onEdit: () => {}, room: leftRoom });
    again.enter();
    again.update(1 / 60);
    again.draw(ctx);
    assert(leftRoom && again.shownAt != null && again.boxes.heroes.every((b, i) => Math.abs(b.x - club.boxes.heroes[i].x) < 1),
      'back from the pencil, every hero is already standing where they stood');
    assert(again.titleAt === again.shownAt && again.t - again.ballAt > again.barSeconds() && again.ballScale === club.ballScale,
      'and the ball already hangs, with the NOW PLAYING card up');
  }
  const at = (hero) => HERO_MOVES.findIndex((m) => m.hero === hero);
  const kikoAt = at('kiko');
  const h = club.boxes.heroes[kikoAt];
  tap(club, h.x + h.w / 2, h.y + h.h / 2);
  assert(club.queued?.i === kikoAt && !club.acting, 'a tap on a hero queues their move for the next beat');
  for (let k = 0; k < 120 && !club.acting; k++) club.update(1 / 60);
  assert(club.acting?.i === kikoAt && club.caption?.i === kikoAt, 'and on the beat they do it, their name and move on screen');
  club.draw(ctx);
  // A held move: in while the hero is held, out when let go. Lorenzo's UNDERWATER is one.
  const lorenzoAt = at('lorenzo');
  const hb = club.boxes.heroes[lorenzoAt];
  Input.pointer = { x: hb.x + hb.w / 2, y: hb.y + hb.h / 2, down: true };
  Input.press('pointer');
  club.update(1 / 60);
  Input.endFrame();
  for (let k = 0; k < 30; k++) club.update(1 / 60);
  assert(HERO_MOVES[lorenzoAt].hold && club.holding?.i === lorenzoAt && club.acting?.i === lorenzoAt && club.acting.dur === Infinity,
    'UNDERWATER is a held move: it stays in for as long as Lorenzo is held');
  // ...and PLAYED while held (Peter, 5 Oct 2026): the drag follows the finger, a whole drag
  // DRAG_SPAN hero heights from where it went down
  Input.pointer.y = hb.y + hb.h / 2 - club.layout.toonH * 1.6;
  club.update(1 / 60);
  const up = club.holding?.delta;
  Input.pointer.y = hb.y + hb.h / 2 + club.layout.toonH * 0.8;
  club.update(1 / 60);
  assert(up === 1 && Math.abs(club.holding?.delta + 0.5) < 1e-9, 'a held hero dragged up plays the move up, and down plays it down');
  assert(dragValue(HERO_MOVES[lorenzoAt], HERO_MOVES[lorenzoAt].drag.start) === 420 && dragValue(HERO_MOVES[lorenzoAt], 0) === 140
    && dragValue(HERO_MOVES[lorenzoAt], 1) === 3200, 'Lorenzo\'s water: 420 Hz where he goes down, 140 Hz at the bottom, 3.2 kHz at the surface');
  Input.release('pointer');
  Input.pointer.down = false;
  club.update(1 / 60);
  Input.endFrame();
  assert(!club.holding && Number.isFinite(club.acting?.dur ?? 0), 'and comes out when he is let go');
  // A tap on a held move: it still plays for half a bar.
  const ramonAt = at('ramon');
  const g1 = club.boxes.heroes[ramonAt];
  tap(club, g1.x + g1.w / 2, g1.y + g1.h / 2);
  club.update(1 / 60);
  const q = club.acting?.i === ramonAt ? club.acting : club.queued;
  assert(q?.i === ramonAt && !club.holding && Math.abs(q.dur - q.bar / 2) < 1e-6, 'a held move only tapped still plays for half a bar');
  assert(HERO_MOVES.filter((m) => m.hold).map((m) => m.hero).join() === 'lorenzo,ramon,grumpos,kiko,clara,fernwick,rusty'
    && HERO_MOVES[at('b33p')].toggle && !HERO_MOVES.some((m) => m.move === 'FLEX'),
  'every move is held but B-33P’s, which toggles 8-bit; Flex is retired');
  // CLARA, held: drums only where she goes down; the drag lets the band back, or the drums go too
  {
    club.draw(ctx);
    const cb = club.boxes.heroes[at('clara')];
    Input.pointer = { x: cb.x + cb.w / 2, y: cb.y + cb.h / 2, down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    const holes = HERO_MOVES[at('clara')].holes;
    const start = holes[club.holding?.held?.hole]?.join();
    Input.pointer.y += club.layout.toonH * 1.6; club.update(1 / 60);
    const bottom = holes[club.holding?.held?.hole]?.join();
    Input.pointer.y -= club.layout.toonH * 3.2; club.update(1 / 60);
    const top = holes[club.holding?.held?.hole]?.join();
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    assert(start === 'drums' && bottom === 'kick' && top === 'drums,bass,chords' && !club.holding,
      'Plot Hole held: drums only, dragged down to the kick alone, up to all but the tune, and out on release');
  }
  // GRUMPOS, held (Peter, 5 Oct 2026): a throw on every 2 and 4 while held, the drag riding the echoes.
  {
    club.draw(ctx);
    const gi = at('grumpos');
    const gb = club.boxes.heroes[gi];
    Input.pointer = { x: gb.x + gb.w / 2, y: gb.y + gb.h / 2, down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    const throwing = club.throwing?.i === gi && club.holding?.i === gi;
    const as = echoLevel(club.holding?.held);
    Input.pointer.y -= club.layout.toonH * 1.6; club.update(1 / 60);
    const loud = echoLevel(club.holding?.held);
    Input.pointer.y += club.layout.toonH * 3.2; club.update(1 / 60);
    const soft = echoLevel(club.holding?.held);
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    assert(throwing && Math.abs(as.wet - 0.35) < 1e-9 && Math.abs(as.feedback - 0.5) < 1e-9 && loud.wet > 0.55 && loud.feedback > 0.65
      && soft.wet < 0.15 && soft.feedback < 0.35 && !club.holding && !(club.throwing && club.throwing.until === Infinity),
      'Boomerang held: thrown on the 2s and 4s at the old echo level, dragged up louder, down softer, done on release');
    club.throwing = null; club.queued = club.acting = null;
  }
  // KIKO, held (Peter, 5 Oct 2026: "stop every bar"): the tape stops on the 2s and 4s; the
  // drag picks every beat (up) or one long wind-down a bar (down).
  {
    club.draw(ctx);
    const ki = at('kiko'), kiko = HERO_MOVES[ki];
    const kb = club.boxes.heroes[ki];
    Input.pointer = { x: kb.x + kb.w / 2, y: kb.y + kb.h / 2, down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    const pick = () => kiko.stops[club.holding?.held?.stop]?.join();
    const start = pick();
    Input.pointer.y -= club.layout.toonH * 1.6; club.update(1 / 60);
    const up = pick();
    Input.pointer.y += club.layout.toonH * 3.2; club.update(1 / 60);
    const down = pick();
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    const steps = [nextStopStep(13, [8, 4, 1]), nextStopStep(4, [8, 4, 1]), nextStopStep(1, [16, 8, 2]), nextStopStep(9, [4, 0, 0.5])].join();
    assert(start === '8,4,1' && up === '4,0,0.5' && down === '16,8,2' && !club.holding && !club.stopping && steps === '20,4,8,12',
      `Power Down held: stops on the 2s and 4s, dragged up a half-beat stop every beat, down one long wind-down a bar (${start} / ${up} / ${down}, ${steps}${club.stopping ? ', still stopping' : ''}${club.holding ? ', still held' : ''})`);
    club.queued = club.acting = null;
  }
  // LORENZO: held two bars a fish swims past; let go, the water drains for two bars (the cutoff
  // glides open, club-fx.js endHold) and the fish dives through the floor before it goes.
  {
    const li = at('lorenzo'), move = HERO_MOVES[li];
    const beatS = club.barSeconds() / 4, t0 = club.t;
    // the first fish set off as his card starts to fade, 2.8 beats in — not before
    const heldFor = (beats) => {
      club.fish = [];
      club.acting = { i: li, when: club.heardNow() - beats * beatS, bar: club.barSeconds(), dur: Infinity };
      club.fishOn();
      return club.fish.length;
    };
    assert(heldFor(2.7) === 0 && heldFor(2.9) > 0, 'Lorenzo\'s first fish set off as his card starts to fade');
    club.fish = [];
    club.acting = { i: li, when: club.heardNow() - 8 * beatS - 0.01, bar: club.barSeconds(), dur: Infinity };
    club.fishOn();
    // under water nothing is thrown about: no beach ball, confetti or streamers
    const moments0 = club.moments;
    club.moments = [{ kind: 'ball', t0: club.t, life: 9, balls: 1, paths: [[]] }];
    const dry = !club.startMoment('ball') && !club.startMoment('confetti') && !club.startMoment('streamers');
    club.update(0); const washed = !club.moments.some((m) => m.kind === 'ball');
    club.moments = moments0;
    assert(dry && washed, 'under water no beach ball, confetti or streamers start, and the water washes them away');
    // a shoal of one to three of the seven, the first in the room now and the rest a beat or so
    // behind — and the party shark's baby after it
    const grown = club.fish.filter((f) => !f.baby);
    const swims = grown.length >= 1 && grown.length <= 3 && club.fish.every((f) => !f.dive && f.kind >= 0 && f.kind < 7)
      && new Set(grown.map((f) => f.kind)).size === grown.length && club.fish[0].born <= club.heardNow();
    club.acting.drain = { from: club.heardNow(), until: club.heardNow() + 2 * club.barSeconds(), level: move.drag.start };
    club.acting.dur = club.acting.drain.until - club.acting.when;
    club.fishOn();
    // the ones not in yet never come; the one in the room dives
    const dives = club.fish.length === 1 && !!club.fish[0].dive;
    const dive = club.fish[0]?.dive, drainS = club.acting.drain.until - club.acting.drain.from;
    // ...not at once: it swims on till the falling surface is about a quarter of the stage over it
    // (the drawn water falls on a smoothstep), then dives quickly and is through the floor before
    // the water is gone
    const fy = 0.22 + 0.33 * club.fish[0].h, out = (dive.at - club.fish[0].lag - club.acting.drain.from) / drainS;
    const surface = out * out * (3 - 2 * out);
    const unhurried = dive && Math.abs(surface - Math.max(0, fy - 0.24)) < 1e-6 && dive.dur < drainS * 0.3
      && dive.at - club.acting.drain.from + dive.dur < drainS;
    club.draw(ctx);
    // (no audio here: heardNow is the club's own clock)
    club.t = dive.at + dive.dur * 0.6; club.fishOn();
    const stillDiving = club.fish[0]?.dive && club.fish[0].sunk == null;
    club.draw(ctx);
    club.t = dive.at + dive.dur + 0.02; club.fishOn();
    const sunk = club.fish[0]?.sunk != null;
    club.draw(ctx);
    club.t += 0.5; club.fishOn();
    const bubbling = club.fish.length === 1;
    club.draw(ctx);
    club.t += 1.2; club.fishOn();
    const gone = club.fish.length === 0;
    club.t = t0; club.acting = null;
    assert(Math.abs(drainSeconds(move, 0.1) - 3.2) < 1e-9 && swims && dives && unhurried && stillDiving && sunk && bubbling && gone,
      `Underwater: a fish swims past once he is held two bars; let go, the water drains for two bars and the fish waits for the water, then dives through the floor, bubbles rising after it (${[swims, dives, unhurried, stillDiving, sunk, bubbling, gone]})`);
    // the party shark never swims alone: its baby follows it, the same way, a little behind
    const { FISHES } = await import('../src/game/banger/club-fish.js');
    // ...and the puffer dawdles: still crossing after the others have gone
    {
      const puffer = FISHES.findIndex((f) => f.name === 'PUFFER'), googly = FISHES.findIndex((f) => f.name === 'GOOGLY');
      club.acting = { i: li, when: club.heardNow() - 100 * beatS, bar: club.barSeconds(), dur: Infinity, fishN: 999 };
      club.fish = [puffer, googly].map((kind) => ({ kind, born: club.heardNow() - 7 * beatS, dir: 1, h: 0.5, lag: 0, dive: null, sunk: null }));
      club.fishOn();
      const kinds = club.fish.map((f) => f.kind);
      club.fish = []; club.acting = null;
      assert(FISHES.filter((f) => (f.pace ?? 1) > 1).length === 1 && kinds.join() === String(puffer),
        'one fish, the puffer, swims across slower than the rest');
    }
    const shark = FISHES.findIndex((f) => f.name === 'PARTY SHARK');
    const seq = [0.1, (shark + 0.5) / FISHES.length, 0.3, 0.5, 0.5];
    let n = 0;
    club.fish = []; club.lastFish = -1;
    club.shoal(club.heardNow(), beatS, () => seq[n++ % seq.length]);
    const [mum, baby] = club.fish;
    club.acting = { i: li, when: club.heardNow() - 9 * beatS, bar: club.barSeconds(), dur: Infinity };
    club.draw(ctx);
    club.acting = null; club.fish = [];
    assert(FISHES.length === 7 && !FISHES.some((f) => f.name === 'FISHBOWL') && mum?.kind === shark && baby?.baby && baby.kind === shark
      && baby.dir === mum.dir && baby.born > mum.born && club.led?.text === 'DOO DOO DOO',
      'seven fish (the fishbowl is out), and the party shark\'s baby follows it across');
  }
  // DOLORES (Peter, 5 Oct 2026): tapped while she sweeps, she flings the broom away, dances for a
  // while and then runs off — and what she hadn't swept stays on the floor.
  {
    club.moments = []; club.partyNextBeat = Infinity;
    club.floorConfetti = [makeScrap(10, 0.5, '#ff4fa3', 0), makeScrap(470, 0.5, '#3fb8ff', 0)];
    const started = club.startMoment('cleaner');
    const m = club.moments.find((x) => x.kind === 'cleaner');
    if (m) m.beat0 = club.beat() - 8;   // halfway across
    club.draw(ctx); club.updateParty();
    const s = club.doloresSpot;
    const before = m && cleanerWalk(m, club.beat()).progress;
    if (s) tap(club, s.x, s.floor - s.h * 0.5);
    const beat = club.beat();
    const flings = m && cleanerWalk(m, beat).flinging != null && club.led?.text === 'DOLORES IS ON BREAK';
    const dancing = m && cleanerWalk(m, beat + DOLORES_FLING_BEATS + 4).dancing;
    const waits = m && Math.abs(cleanerWalk(m, beat + 4).progress - before) < 0.02;
    const runs = m && cleanerWalk(m, beat + DOLORES_FLING_BEATS + DOLORES_DANCE_BEATS + 1).running > 0;
    const ends = m && m.quit && m.beats === m.quit.from + DOLORES_FLING_BEATS + DOLORES_DANCE_BEATS + DOLORES_RUN_BEATS;
    const realBeat = club.beat;
    for (const b of [0.5, 3, DOLORES_FLING_BEATS + DOLORES_DANCE_BEATS + 1]) { club.beat = () => beat + b; club.draw(ctx); }
    club.updateParty();
    const told = club.led?.text === 'DOLORES HAS LEFT THE BUILDING';
    club.beat = realBeat;
    // her moment over, the confetti she never got to is still there
    club.moments = []; club.updateParty();
    const ahead = m && m.dir > 0 ? 470 : 10;
    const left = club.floorConfetti.length === 1 && club.floorConfetti[0].x === ahead;
    assert(started && s && flings && dancing && waits && runs && ends && told && left,
      `Dolores tapped mid-sweep flings the broom, dances where she stands, then runs off, leaving the rest of the confetti (${[started, !!s, flings, dancing, waits, runs, ends, told, left]})`);
    club.moments = []; club.floorConfetti = [];
  }
  // ...and she has two moves (Peter, 6 Oct 2026): the groove on her spot, and every other bar a
  // side shuffle towards the middle of the floor and back, only ever whole bars of it.
  {
    const m = { kind: 'cleaner', beat0: 0, beats: 99, dir: 1, quit: { from: 6.3, dance: DOLORES_DANCE_BEATS, out: 1, sweptTo: 0 } };
    const start = 6.3 + DOLORES_FLING_BEATS, end = start + DOLORES_DANCE_BEATS;
    const at = [];
    for (let b = start; b < end; b += 1 / 16) at.push([b, doloresDancePose(m, b).shift || 0]);
    const away = at.filter(([, s]) => Math.abs(s) > 0.01);
    const bars = new Set(away.map(([b]) => Math.floor(b / 4)));
    const whole = [...bars].every((bar) => bar * 4 >= start && bar * 4 + 4 <= end);
    const towardMiddle = away.every(([, s]) => s < 0);   // thrown off the right, facing right: the middle is behind her
    const home = [8, 12, 16, 20].every((b) => Math.abs(doloresDancePose(m, b).shift || 0) < 1e-9);
    assert(bars.size === 2 && whole && towardMiddle && home,
      `Dolores dances the groove, and whole bars of a side shuffle to the middle of the floor and back (${[bars.size, whole, towardMiddle, home]})`);
  }
  // THE TURBO HOOVER (Peter, 5 Oct 2026): the vacuum tapped tears off, sucks up the beach ball,
  // and blows up out of the far side on a beat — KABOOM, the room jolts, a confetti fountain.
  {
    club.moments = []; club.partyNextBeat = Infinity;
    const started = club.startMoment('vacuum');
    const m = club.moments.find((x) => x.kind === 'vacuum');
    if (m) m.beat0 = club.beat() - 6;
    club.moments.push({ kind: 'ball', t0: club.t, life: 30, balls: 1, dir: 1, paths: [BangerClubState.ballHops(8)] });
    club.draw(ctx);
    const v = club.vacuumSpot;
    if (v) tap(club, v.x, v.floor - v.h * 0.5);
    const turbo = !!m?.turbo && club.led?.text === 'TURBO!';
    const sucked = club.moments.some((x) => x.kind === 'ball' && x.sucked);
    const realBeat = club.beat, b0 = club.beat(), runs = m?.turbo?.beats;
    club.beat = () => b0 + runs - 0.1;
    club.vacuumOn();
    const early = !club.moments.some((x) => x.kind === 'fountain');
    club.boomAt = -Infinity;
    club.beat = () => b0 + runs + 0.05;
    club.vacuumOn();
    const fountain = early && runs > 2.999 && runs < 4 && club.moments.some((x) => x.kind === 'fountain')
      && club.led?.text === 'KABOOM!' && club.boomAt > -Infinity;
    // the vacuum gone, the confetti it blew back out still lands (it was wiped with the floor)
    club.updateParty(); club.moments = club.moments.filter((x) => x !== m); club.updateParty();
    const relands = club.floorConfetti.length >= 40 && club.floorConfetti.every((sc) => sc.at > club.t);
    club.draw(ctx);
    club.beat = realBeat; club.boomAt = -Infinity;
    assert(started && v && turbo && sucked && fountain && relands,
      `a tap on the vacuum: turbo, the beach ball sucked in, and KABOOM out of the far side on the beat it runs to, its fountain landing after (${[started, !!v, turbo, sucked, fountain, relands]})`);
    club.moments = [];
  }
  // THE CLAP PAD plays the band's own clap (club-voices.js clapVoice).
  {
    const { ClubVoices } = await import('../src/game/banger/club-voices.js');
    const { VOICES } = await import('../src/data/voices.js');
    const song = (soundsId, clap) => ({ soundsId, laneOf: {}, bank: {}, mix: { order: ['kick', 'clap'], voice: { clapVoice: clap } } });
    const big = new ClubVoices(song('big-room', 'bigRoomClap'), { style: 'big-room' }).clapVoice();
    const chip = new ClubVoices(song('chipstep-8bit', 'snareEngine'), { style: 'chipstep' }).clapVoice();
    const nu = new ClubVoices(song('nu-disco', 'ds909Snare'), { style: 'nu-disco' }).clapVoice();
    const v = new ClubVoices(song('big-room', 'bigRoomClap'), { style: 'big-room' });
    v.state = { swapped: true, picks: { own: {}, swap: {} } };
    assert(big === 'bigRoomClap' && chip === 'clapEngine' && VOICES[nu]?.category === 'Clap' && v.clapVoice() === 'clapEngine',
      "the clap pad claps the band's own: big room's for big room, a real clap where the kit's is a snare, the game's own on 8-BIT");
  }
  // Anyone stands anywhere (Peter, 5 Oct 2026): where each hero stands is drawn afresh every
  // visit, holds and taps mixed.
  {
    const orders = new Set();
    let mixed = false, whole = true;
    for (let n = 0; n < 24; n++) {
      const c = new BangerClubState({ rec, onBack: () => {} });
      c.enter();
      orders.add(c.formationOrder.join());
      if ([...c.formationOrder].sort((a, b) => a - b).join() !== HERO_MOVES.map((_, i) => i).join()) whole = false;
      if (!c.formationOrder.slice(0, 4).every((i) => HERO_MOVES[i].hold)) mixed = true;
      c.exit();
    }
    Audio.setBank(club.song.bank, club.song.mix, club.song.arrangement, { startAtBeginning: true });
    assert(whole && mixed && orders.size > 10, 'every hero stands somewhere, holds and taps mixed, in a new order each visit');
  }
  // ...and in portrait nobody changes places; in landscape any two may swap, however far apart.
  {
    const { screen } = await import('../src/engine/renderer.js');
    const mode = screen.presentationMode;
    const realBeat = club.beat;
    club.beat = () => 400;
    screen.presentationMode = 'phone-portrait';
    club.formationSwap = null; club.formationShuffleAt = -1; club.queued = club.acting = null;
    club.updateFormation();
    const still = club.formationSwap === null && club.formationShuffleAt > 400;
    screen.presentationMode = mode;
    const gaps = new Set();
    let paired = true;
    for (let n = 0; n < 60; n++) {
      club.formationSwap = null; club.formationShuffleAt = -1; club.turns = club.turns.map(() => null);
      club.updateFormation();
      const swap = club.formationSwap;
      if (!swap || swap.slotA === swap.slotB || club.formationOrder[swap.slotA] !== swap.heroA || club.formationOrder[swap.slotB] !== swap.heroB) paired = false;
      else gaps.add(Math.abs(swap.slotA - swap.slotB));
    }
    assert(still && paired && [...gaps].some((g) => g > 1), 'in portrait nobody changes places; in landscape any two may, neighbours or not');
    // Once swapped they face each other: each hops round from the way it walked to the other.
    {
      const swap = club.formationSwap;
      const { heroA, heroB, slotA, slotB } = swap;
      club.beat = () => 400 + swap.beats;
      club.updateFormation();
      const a = club.turns[heroA], b = club.turns[heroB];
      const facingEach = a && b && a.to === Math.sign(slotA - slotB) && b.to === -a.to
        && club.facing[heroA] === -a.to && club.facing[heroB] === -b.to;
      club.beat = () => 400 + swap.beats + 1;
      club.updateFormation();
      assert(facingEach && club.facingOf(heroA) === Math.sign(slotA - slotB) && club.facingOf(heroB) === Math.sign(slotB - slotA),
        'two who have changed places turn round to face each other');
    }
    // ...walking there in time (Peter, 6 Oct 2026): off on the beat, in double time — two steps a
    // beat, every one on an eighth — each step about as long as their own walk's, so the planted
    // foot hardly slips
    {
      const { toonWalkStep } = await import('../src/sprites/toons.js');
      club.draw(ctx);
      club.beat = () => 600.1;
      club.formationSwap = null; club.formationShuffleAt = -1; club.turns = club.turns.map(() => null);
      club.updateFormation();
      const sw = club.formationSwap, lay = club.layout;
      const walked = Math.abs(sw.slotA - sw.slotB) * lay.cellW / (sw.beats * 2) / lay.toonH;
      const slips = [sw.heroA, sw.heroB].map((h) => Math.abs(walked / toonWalkStep(HERO_MOVES[h].hero) - 1));
      assert(sw.beat0 === 600 && sw.beats >= 1 && Number.isInteger(sw.beats * 2) && slips.every((x) => x < 0.25),
        `two changing places set off on the beat and take two steps a beat, the length of their walk's (slip ${slips.map((x) => x.toFixed(2))})`);
      // ...and so for every pair at every distance, not just the one the dice gave: each pair put
      // `d` slots apart and Math.random steered to pick them (Ramon's long stride slid a neighbour 29%)
      const rnd = Math.random, order = [...club.formationOrder], turnAt = [...club.turnAt], n = HERO_MOVES.length;
      club.turnAt = club.turnAt.map(() => Infinity);   // nobody turning round, so every slot is free
      let worst = { slip: 0 };
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let d = 1; d < n; d++) {
        const rest = HERO_MOVES.map((_, k) => k).filter((k) => k !== i && k !== j);
        club.formationOrder = [i, ...rest.slice(0, d - 1), j, ...rest.slice(d - 1)];
        const picks = [0, (d - 0.5) / (n - 1)];
        Math.random = () => (picks.length ? picks.shift() : rnd());
        club.formationSwap = null; club.formationShuffleAt = -1; club.turns = club.turns.map(() => null);
        try { club.updateFormation(); } finally { Math.random = rnd; }
        const s = club.formationSwap;
        if (!s || s.heroA !== i || s.heroB !== j) { worst = { slip: Infinity, pair: `${i}+${j}`, d }; continue; }
        const w = d * lay.cellW / (s.beats * 2) / lay.toonH;
        for (const h of [i, j]) {
          const slip = Math.abs(w / toonWalkStep(HERO_MOVES[h].hero) - 1);
          if (slip > worst.slip) worst = { slip, pair: `${HERO_MOVES[i].hero}+${HERO_MOVES[j].hero}`, d };
        }
      }
      club.formationOrder = order; club.turnAt = turnAt; club.formationSwap = null;
      assert(worst.slip < 0.25, `every pair at every distance walks within a quarter of its own stride (worst ${worst.pair} ${worst.d} apart: ${worst.slip.toFixed(3)})`);
    }
    // On their spots the heroes now and then turn round: one at most a beat, never mid-move.
    {
      club.formationSwap = null; club.formationShuffleAt = Infinity;
      club.turns = club.turns.map(() => null); club.facing = club.facing.map(() => null);
      club.turnAt = club.turnAt.map(() => 0); club.lastTurnBeat = -Infinity; club.crowd = null;
      club.acting = { i: 0 };
      club.beat = () => 500;
      const was = HERO_MOVES.map((_, i) => club.facingOf(i));
      club.updateFormation();
      const turning = club.turns.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
      // mostly facing right, as drawn: one turned left turns back within TURN_BACK_BARS (2–6)
      const backSoon = club.turns[turning[0]]?.to > 0 || club.turnAt[turning[0]] <= 500 + 4 * 6 + 3;
      club.updateFormation();
      const once = club.turns.filter(Boolean).length === 1;
      club.beat = () => 501;
      club.updateFormation();
      const landed = HERO_MOVES.map((_, i) => club.facingOf(i));
      club.acting = null;
      assert(turning.length === 1 && turning[0] !== 0 && once && landed[turning[0]] === -was[turning[0]] && backSoon,
        'a hero on their spot turns round now and then — one a beat, not one playing their move, and back right soon');
    }
    club.beat = realBeat; club.formationSwap = null; club.formationShuffleAt = Infinity;
    club.turns = club.turns.map(() => null); club.turnAt = club.turnAt.map(() => Infinity);
  }
  // B-33P: the whole band onto the 8-Bit Sound Set from the next beat, back at a second tap.
  {
    const { BANGER_SOUNDS } = await import('../tools/lib/banger/sounds.js');
    const realRe = Audio.reapplyBank, realSource = Audio.sourceBank, realBank = Audio.bank;
    const mixes = [];
    Audio.reapplyBank = (bank, mix) => { mixes.push(mix); };
    Audio.sourceBank = club.song.bank; Audio.bank = realBank || club.song.bank;
    // a take already on the 8-Bit set goes to 4-BIT instead, on its own instruments (below)
    const eightBit = club.voices.eightBit;
    const set = BANGER_SOUNDS['chipstep-8bit'];
    const ids = new Set([...Object.values(set.parts), ...Object.values(set.kits).flatMap((k) => Object.values(k))]);
    club.draw(ctx);
    const bb = club.boxes.heroes[at('b33p')];
    tap(club, bb.x + bb.w / 2, bb.y + bb.h / 2);
    assert(club.queued?.i === at('b33p') && club.queued.title === (eightBit ? '4-BIT' : '8-BIT') && club.voices.swapped && !club.voices.swappedNow,
      'a tap on B-33P queues the swap for the next beat');
    club.update(1 / 60);
    const swappedLanes = Object.entries(mixes.at(-1)?.voice || {}).filter(([k, id]) => id !== club.song.mix.voice[k]);
    assert(club.voices.swappedNow && (eightBit ? !swappedLanes.length : swappedLanes.length > 5 && swappedLanes.every(([, id]) => ids.has(id))),
      eightBit ? 'on the beat an 8-Bit take keeps its own sounds: 4-BIT crushes them' : 'on the beat every part goes onto the set\'s own sounds, the drums and all');
    assert(club.led?.text === (eightBit ? '4-BIT MODE' : '8-BIT MODE'), 'and the LED board says so');
    club.draw(ctx);
    tap(club, bb.x + bb.w / 2, bb.y + bb.h / 2);
    club.update(1 / 60);
    assert(!club.voices.swappedNow && mixes.at(-1) === club.song.mix && club.led?.text === (eightBit ? '8-BIT MODE' : 'HI-FI MODE'),
      'a second tap puts the band\'s own sounds back');
    Audio.reapplyBank = realRe; Audio.sourceBank = realSource; Audio.bank = realBank;
  }
  // 4-BIT (Peter, 8 Oct 2026): B-33P on a take already on the 8-Bit set keeps its instruments
  // and puts the whole mix through the Bit Crusher at his settings — 12 bits, downsample 8, mix
  // 1.00 — on the mixer's treatment leg, from the beat; and back off it on the next tap.
  {
    const { ClubVoices, mixWithKept } = await import('../src/game/banger/club-voices.js');
    const real = { re: Audio.reapplyBank, source: Audio.sourceBank, bank: Audio.bank, ctx: Audio.ctx, next: Audio.nextTime,
      tick: Audio._tick, mixer: Audio._mixer, timeout: globalThis.setTimeout };
    const calls = [], mixes = [], timers = [];
    let chain = [];
    Audio.mixer = {
      get treatment() { return chain; },
      setTreatment(list) { calls.push(['set', list]); chain = list.map((l) => ({ def: { id: l.id } })); },
      rampTreatment(w, when) { calls.push(['ramp', w, when]); },
      clearTreatment() { calls.push(['clear']); chain = []; },
    };
    globalThis.setTimeout = (fn) => { timers.push(fn); return 0; };
    const song = { ...club.song, soundsId: 'chipstep-8bit' };
    Audio.reapplyBank = (bank, mix) => { mixes.push(mix); };
    Audio.sourceBank = song.bank; Audio.bank = real.bank || song.bank;
    Audio.ctx = { currentTime: 0 }; Audio.nextTime = 0.25;
    const stepTo = (step) => { Audio._tick = step * Audio.transportResolution / 16; };
    const v = new ClubVoices(song, club.rec);
    // a sound picked first, to see the button keep it through 4-BIT
    const part = ['bass', 'chords', 'lead', 'drums'].find((p) => v.choices(p).length > 1);
    stepTo(31); v.next(part); stepTo(32); v.update();
    const picked = v.label(part), before = mixes.at(-1);
    stepTo(33); v.toggle(); stepTo(36);
    const on = v.update();
    const sets = calls.filter((c) => c[0] === 'set');
    const crusher = JSON.stringify(sets[0]?.[1]) === JSON.stringify([{ id: 'bitcrusher', params: { bits: 12, downsample: 8, wet: 1 } }]);
    const onRamp = calls.at(-1);
    const ownSounds = JSON.stringify(mixes.at(-1)?.voice) === JSON.stringify(before?.voice) && v.label(part) === picked;
    stepTo(37); v.toggle(); stepTo(40);
    const off = v.update();
    const offRamp = calls.at(-1);
    // straight back in before the leg is cleared: faded back to, not rebuilt
    stepTo(41); v.toggle(); stepTo(44); v.update();
    timers.splice(0).forEach((fn) => fn());
    const reused = calls.filter((c) => c[0] === 'set').length === 1 && calls.at(-1)?.[1] === 1 && !calls.some((c) => c[0] === 'clear');
    stepTo(45); v.toggle(); stepTo(48); v.update();
    timers.splice(0).forEach((fn) => fn());
    const cleared = calls.at(-1)?.[0] === 'clear';
    assert(v.eightBit && on?.swapped && crusher && onRamp?.[1] === 1 && onRamp?.[2] === 0.25 && ownSounds
      && off && !off.swapped && offRamp?.[1] === 0 && reused && cleared,
      `4-BIT: an 8-Bit take keeps its own sounds and goes through the Bit Crusher (12 bits, downsample 8) from the beat, off at the next tap and cleared once silent (${[v.eightBit, !!on?.swapped, crusher, onRamp, ownSounds, !!off, offRamp, reused, cleared]})`);
    const keptOn = mixWithKept(song, club.rec, { own: {}, swap: {}, swapped: true });
    const keptOff = mixWithKept(song, club.rec, { own: {}, swap: {}, swapped: false });
    assert(keptOn.masterEffects?.[0]?.id === 'bitcrusher' && keptOn.masterEffects[0].params.downsample === 8
      && !keptOff.masterEffects?.some?.((l) => l.id === 'bitcrusher'),
      'a kept 8-Bit take left in 4-BIT plays crushed in the Lab and on the jukebox: the crusher first on its master');
    // ...and seen (Peter's pick of the bake-off, 8 Oct 2026: D): the room on a cruder tube than 8-BIT's
    const { EIGHT_BIT_TUBE, FOUR_BIT_TUBE } = await import('../src/game/banger/club-crt.js');
    const realVoices = club.voices;
    const tubes = [false, true].map((eightBit) => [false, true].map((swappedNow) => { club.voices = { eightBit, swappedNow }; return club.tubeLook(); }));
    club.voices = realVoices;
    assert(tubes[0][0] === null && tubes[1][0] === null && tubes[0][1] === EIGHT_BIT_TUBE && tubes[1][1] === FOUR_BIT_TUBE
      && FOUR_BIT_TUBE.rows === 10 && FOUR_BIT_TUBE.inks.length === 16 && EIGHT_BIT_TUBE.rows > FOUR_BIT_TUBE.rows,
      'the room goes on the tube with the sound: 8-BIT’s for a take swapped onto the 8-Bit set, 4-BIT’s — a hero 10 cells tall, 16 inks — for one already on it');
    Audio.reapplyBank = real.re; Audio.sourceBank = real.source; Audio.bank = real.bank;
    Audio.ctx = real.ctx; Audio.nextTime = real.next; Audio._tick = real.tick; Audio.mixer = real.mixer;
    globalThis.setTimeout = real.timeout;
  }
  // ...on the grid, with a song running: B-33P's swap (both ways) on the next beat, a sound
  // button's on the next bar line (Peter, 7 Oct 2026: a bar was too long to wait for B-33P).
  {
    const { ClubVoices } = await import('../src/game/banger/club-voices.js');
    const real = { re: Audio.reapplyBank, source: Audio.sourceBank, bank: Audio.bank, ctx: Audio.ctx, next: Audio.nextTime, tick: Audio._tick };
    Audio.reapplyBank = () => {};
    Audio.sourceBank = club.song.bank; Audio.bank = real.bank || club.song.bank;
    Audio.ctx = { currentTime: 0 }; Audio.nextTime = 0;
    const stepTo = (step) => { Audio._tick = step * Audio.transportResolution / 16; };
    const v = new ClubVoices(club.song, club.rec);
    stepTo(17); v.toggle();
    const offBeat = v.update();
    stepTo(20);
    const on = v.update();
    stepTo(21); v.toggle();
    const offBeatBack = v.update();
    stepTo(24);
    const back = v.update();
    const part = ['bass', 'chords', 'lead', 'drums'].find((p) => v.next(p));
    stepTo(28);
    const beatOnly = v.update();
    stepTo(32);
    const bar = v.update();
    assert(!offBeat && on?.swapped && !offBeatBack && back && !back.swapped && part && !beatOnly && bar?.part === part,
      'B-33P\'s swap lands on the next beat, going and coming back; a sound button still waits for the bar line');
    Audio.reapplyBank = real.re; Audio.sourceBank = real.source; Audio.bank = real.bank;
    Audio.ctx = real.ctx; Audio.nextTime = real.next; Audio._tick = real.tick;
  }
  // RUSTY: held, the song runs 15% fast in its own key; dragged down, through its own speed to
  // half-speed slow-mo; let go, back to its own speed on the beat.
  {
    club.draw(ctx);
    const rb = club.boxes.heroes[at('rusty')];
    Input.pointer = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2, down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    const fast = Audio.tempo;
    Input.pointer.y += club.layout.toonH * 1.6; club.update(1 / 60);
    const slow = Audio.tempo;
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    club.update(1 / 60);
    assert(Math.abs(fast - 1.15) < 1e-9 && Math.abs(slow - 0.5) < 1e-9 && Audio.tempo === 1 && Audio.detune === 1,
      'Rusty runs the song 15% fast, drags down to half-speed slow-mo in the same key, and lets it go');
  }
  // FERNWICK: held, the bow is drawn and the crowd sinks; let go, the drop lands on the song's
  // next drop or chorus, with confetti and streamers.
  {
    const form = club.song.form;
    club.moments = [];
    club.draw(ctx);
    const fb = club.boxes.heroes[at('fernwick')];
    Input.pointer = { x: fb.x + fb.w / 2, y: fb.y + fb.h / 2, down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    for (let k = 0; k < 20; k++) club.update(1 / 60);
    const crouching = club.crowdMotion();
    club.draw(ctx);
    const target = club.dropTarget();
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    const landing = club.landing;
    for (let k = 0; k < 20 && club.landing; k++) club.update(1 / 60);
    assert(crouching?.age > 0 && landing?.section === target && club.bow === null
      && ['drop', 'drop2', 'drop3', 'reprise', 'chorus'].includes(form[target].role),
    'Fernwick draws the bow, the crowd crouching, and lets go onto the song\'s next drop');
    assert(club.moments.some((m) => m.kind === 'confetti' && m.ribbons), 'and the drop lands with confetti and streamers');
    club.moments = [];
  }
  // THE FLOOR PADS: a tap on the dance floor strikes its quarter's pad and wakes the bottom
  // buttons; on a desktop the pointer over the floor wakes them too (Peter, 5 Oct 2026).
  {
    club.draw(ctx);
    const fl = club.boxes.floor;
    club.padHits = []; club.buttonsAt = -Infinity;
    const y = fl.y + fl.h * 0.75;
    tap(club, fl.x + fl.w * 0.6, y);
    assert(club.padHits.length === 1 && club.padHits[0].pad === 'shout' && club.padHits[0].label === 'HEY!' && club.buttonsAt === club.t,
      'a tap on the dance floor strikes its pad (the third quarter: the shout, HEY!) and wakes the bottom buttons');
    tap(club, fl.x + fl.w * 0.6, y);
    tap(club, fl.x + fl.w * 0.1, y);
    assert(club.padHits.map((p) => p.label).join() === 'HEY!,YEAH!,SIREN!',
      'the shout is a different word each tap (HEY!, then YEAH!), and the first quarter is the siren');
    club.draw(ctx);
    const touch = Input.usingTouch;
    Input.usingTouch = false; club.buttonsAt = -Infinity;
    Input.pointer = { x: fl.x + fl.w * 0.3, y, down: false };
    club.update(1 / 60);
    const hovered = club.buttonsAt === club.t;
    Input.pointer = { x: fl.x + fl.w * 0.3, y: fl.y - 60, down: false };
    const was = club.buttonsAt;
    club.update(1 / 60);
    assert(hovered && club.buttonsAt === was, 'a mouse over the floor wakes them; off it, they are let sleep');
    Input.usingTouch = touch;
  }
  // THE BEACH BALL (Peter, 5 Oct 2026): a tap knocks it back up, the rally counting; the
  // rally's eighth knock is into the mirror ball; a double tap pops it.
  {
    const clock = club.t;                          // the song's position goes with the club's clock here
    club.moments = [];
    club.startMoment('ball');
    const m = club.moments.find((mm) => mm.kind === 'ball');
    const firstHead = club.ballPath(m, 0, 10).find((p) => p.head);
    club.t = m.t0 + firstHead.at * club.barSeconds() / 4 - club.barSeconds() / 8;   // half a beat before it lands on a head
    club.draw(ctx);
    const spot = club.ballSpots.find((sp) => sp.n === 0);
    tap(club, spot.x, spot.y);
    const knocked = club.ballPath(m, 0, 10);
    assert(club.rally === 1 && m.points?.[0] && knocked.some((p) => p.hit) && knocked.find((p) => p.at > (club.t - m.t0) / (club.barSeconds() / 4))?.h >= 1.35,
      'a tap on the beach ball knocks it back up, high: the rally is one');
    club.t += 0.1; club.draw(ctx);
    const again = club.ballSpots.find((sp) => sp.n === 0);
    tap(club, again.x, again.y);
    assert(m.popped?.[0] && club.moments.some((mm) => mm.kind === 'pop') && club.rally === 0 && club.flinch,
      'a second tap straight after pops it: its colours burst, the hero under it flinches');
    club.draw(ctx);
    club.moments = []; club.rally = 0; club.lastBallTap = null;
    // the smash: the rally's eighth knock goes to the mirror ball
    club.startMoment('ball');
    const m2 = club.moments.find((mm) => mm.kind === 'ball');
    club.t = m2.t0 + club.ballPath(m2, 0, 10).find((p) => p.head).at * club.barSeconds() / 4 - club.barSeconds() / 8;
    club.draw(ctx);
    club.rally = 7;
    const sp2 = club.ballSpots.find((sp) => sp.n === 0);
    club.volley(sp2);
    const toMirror = club.ballPath(m2, 0, 10).find((p) => p.clang);
    assert(toMirror && Math.abs(toMirror.x - club.boxes.ball.x) < 1e-6 && club.smash && club.rally === 0,
      'the eighth knock in a rally sends it up into the mirror ball');
    club.t = club.smash.t + 0.01; club.update(1 / 60);
    assert(!club.smash && club.spinV > 0 && club.led?.text === 'SMASH!' && club.moments.some((mm) => mm.kind === 'confetti'),
      'and there it clangs: the mirror ball spins and flares, confetti, SMASH! on the board');
    club.draw(ctx);
    club.moments = []; club.spinV = 0; club.t = clock; club.update(1 / 60);
  }
  // THE CLAP, HELD: a tap is one clap; held, claps on the 2 and the 4 with a fill now and then.
  {
    const { clapsAt, CLAP_FILLS } = await import('../src/game/banger/club-hits.js');
    assert(clapsAt(4) && clapsAt(12) && !clapsAt(0) && !clapsAt(8) && !clapsAt(13)
      && CLAP_FILLS.every((f) => f.every((s) => s >= 12) && clapsAt(4, f) && f.every((s) => clapsAt(s, f))),
    'a held clap plays the 2 and the 4, and a fill only ever in the last beat');
    club.draw(ctx);
    const fl = club.boxes.floor;
    Input.pointer = { x: fl.x + fl.w * 0.375, y: fl.y + fl.h * 0.75, down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    const held = club.clapHold;
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    assert(held && club.padHits.at(-1)?.pad === 'clap' && !club.clapHold, 'the clap pad held starts its pattern, and letting go stops it');
  }
  // Every move draws its room.
  {
    for (let i = 0; i < HERO_MOVES.length; i++) {
      club.acting = { i, when: club.heardNow() - 0.1, bar: club.barSeconds(), dur: club.barSeconds(), plan: { beats: 2, hits: 2 } };
      club.punch = { grab: club.beat() - 0.3, slice: 0.25 };
      club.echoes = [{ when: club.heardNow() - 0.4, wet: 0.35, feedback: 0.5 }];
      club.draw(ctx);
    }
    club.acting = null; club.punch = null; club.echoes = [];
    assert(true, 'every move draws what it does to the room');
  }
  // The mixer: a small icon that opens a panel of faders, one a part.
  const mxb = club.boxes.mixer;
  tap(club, mxb.x + mxb.w / 2, mxb.y + mxb.h / 2);
  club.draw(ctx);
  assert(club.mixerOpen && club.boxes.faders.length === PARTS.length, 'the mixer icon opens a fader for each part');
  const f = club.boxes.faders[0];
  tap(club, f.x + f.w / 2, f.bot);
  assert(club.levels.drums === 0 && !club.parts.has('drums') && club.popup?.text === 'NO DRUMS', 'the drum fader pulled to the bottom: NO DRUMS');
  tap(club, f.x + f.w / 2, (f.top + f.bot) / 2);
  assert(club.levels.drums > 0.4 && club.levels.drums < 0.6 && club.popup?.text === 'YES DRUMS', 'and halfway up: YES DRUMS, at half');
  // ...and under each fader the part's sound: a tap is its next one, from the next bar line,
  // and the LED board names it
  {
    club.draw(ctx);
    const before = club.voices.label('drums');
    const realRe = Audio.reapplyBank;
    Audio.reapplyBank = () => {};
    assert(club.boxes.sounds.length === PARTS.length && before.endsWith('KIT'), 'under each fader, the part\'s sound');
    tap(club, ...centre(club.boxes.sounds[0]));
    club.update(1 / 60);
    assert(club.voices.label('drums') !== before && club.voices.label('drums').endsWith('KIT') && club.led?.text.startsWith('DRUMS: '),
      'a tap on DRUMS swaps the kit, and the LED board says which');
    // ...and the mixer is kept with the song (Peter, 5 Oct 2026): opened again, it is as it was left
    club.update(1 / 60);
    const kept = club.rec.mixer;
    const again = new BangerClubState({ rec: club.rec, onBack: () => {} });
    again.enter();
    const back = Math.abs(again.levels.drums - club.levels.drums) < 1e-9 && again.voices.label('drums') === club.voices.label('drums');
    again.exit();
    Audio.setBank(club.song.bank, club.song.mix, club.song.arrangement, { startAtBeginning: true });
    assert(kept && kept.levels.drums === club.levels.drums && kept.sounds.own.drums && back,
      `the mixer is kept with the song — faders and sounds — and back when it is opened again (${JSON.stringify(kept)})`);
    // ...and the song plays with those sounds out of the club too: the Lab's row carries them
    {
      const { bangerRow } = await import('../src/game/banger/store.js');
      const row = bangerRow(club.rec);
      const lane = Object.keys(row.mix.voice || {}).find((k) => row.mix.voice[k] !== club.song.mix.voice?.[k]);
      assert(!!lane, `the Lab plays a kept song with the sounds it was left with (${lane})`);
    }
    // ...and RESET on the panel puts it all back (Peter, 5 Oct 2026): every fader up, every
    // sound the song's own, and nothing kept on the record
    club.draw(ctx);
    assert(club.boxes.reset && !club.mixerPlain, 'the panel has a RESET tab, lit while there is something to reset');
    tap(club, ...centre(club.boxes.reset));
    assert(club.mixerPlain && PARTS.every((p) => club.levels[p.id] === 1) && club.voices.own && !club.rec.mixer
      && club.popup?.text === 'MIXER RESET',
    `RESET: every fader up, every sound the song's own, the kept mixer dropped (${JSON.stringify(club.rec.mixer)})`);
    // ...and the DICE beside it (Peter, 6 Oct 2026): every part onto another sound at once,
    // a floatie said, the LED board naming them when they land
    club.draw(ctx);
    const was = PARTS.map((p) => club.voices.label(p.id));
    const rolls = PARTS.filter((p) => club.voices.choices(p.id).length > 1).map((p) => p.id);
    {
      // RESET and DICE at the panel's two top corners, in as far as each other (Peter, 8 Oct 2026)
      const { reset, dice, panel } = club.boxes;
      assert(dice && Math.abs((reset.x - panel.x) - (panel.x + panel.w - dice.x - dice.w)) < 1e-6 && reset.y === dice.y && dice.y < panel.y,
        'a DICE tab at the panel\'s top right, RESET\'s mirror image');
    }
    tap(club, ...centre(club.boxes.dice));
    const said = DICE_LINES.includes(club.popup?.text) && DICE_LINES.every((l) => !l.startsWith('NO'));
    club.update(1 / 60);
    const now = PARTS.map((p) => club.voices.label(p.id));
    assert(said && rolls.length > 1 && PARTS.every((p, k) => rolls.includes(p.id) === (now[k] !== was[k]))
      && rolls.every((id) => club.led?.text.includes(`${PARTS.find((p) => p.id === id).label}: `)),
    `DICE: every part with a choice on another sound, a floatie, the LED board names them (${was} -> ${now}; ${club.led?.text})`);
    // ...and while it rolls each sound button spins through its sounds, the reels stopping
    // left to right on the new one (Peter, 6 Oct 2026)
    {
      const t0 = club.t, at = (s) => { club.t = club.diceAt + s; };
      const k = PARTS.findIndex((p) => rolls.includes(p.id));
      const names = new Set();
      for (let s = 0; s < 0.8; s += 0.01) { at(s); names.add(club.reelFor(k, now[k])?.name); }
      at(0.3);
      const early = PARTS.map((p, j) => club.reelFor(j, now[j]));
      at(0.8 - 0.001);
      const landing = club.reelFor(k, now[k]);
      at(0.8 + 0.14 * 3 + 0.01);
      const done = PARTS.every((p, j) => !club.reelFor(j, now[j]));
      club.draw(ctx);
      club.t = t0;
      assert(names.size > 2 && [...names].every((n) => club.voices.choices(PARTS[k].id).some((c) => c.label === n))
        && PARTS.every((p, j) => !!early[j] === rolls.includes(p.id)) && landing?.name === now[k] && done,
      `DICE: the sound buttons roll through their sounds and land on the new one (${[...names].join(', ')})`);
    }
    club.draw(ctx);
    tap(club, ...centre(club.boxes.reset));
    assert(club.voices.own, 'and RESET puts the dice back too');
    Audio.reapplyBank = realRe;
    club.draw(ctx);
  }
  // MUTE and SOLO over each fader (Peter, 6 Oct 2026): a muted part plays nothing with its fader
  // where it was; a solo quiets every other part; RESET clears both
  {
    assert(club.boxes.mutes.length === PARTS.length && club.boxes.solos.length === PARTS.length,
      'every strip has a MUTE and a SOLO');
    const hi = (b) => b.y + b.h / 2;
    assert(hi(club.boxes.mutes[0]) < club.boxes.faders[0].top, 'MUTE and SOLO sit over the fader');
    tap(club, ...centre(club.boxes.mutes[1]));
    assert(club.levels.bass === 1 && club.heard.bass === 0 && !club.parts.has('bass') && club.popup?.text === 'NO BASS',
      'MUTE: the bass out, its fader left where it was');
    tap(club, ...centre(club.boxes.mutes[1]));
    assert(club.heard.bass === 1 && club.popup?.text === 'YES BASS', 'and MUTE again brings it back');
    tap(club, ...centre(club.boxes.solos[0]));
    assert(club.heard.drums === 1 && PARTS.filter((p) => p.id !== 'drums').every((p) => club.heard[p.id] === 0) && !club.mixerPlain,
      'SOLO DRUMS: only the drums play');
    tap(club, ...centre(club.boxes.solos[3]));
    assert(club.heard.drums === 1 && club.heard.lead === 1 && club.heard.bass === 0, 'a second SOLO adds its part');
    tap(club, ...centre(club.boxes.mutes[2]));
    club.draw(ctx);
    tap(club, ...centre(club.boxes.reset));
    assert(!club.muted.size && !club.soloed.size && PARTS.every((p) => club.heard[p.id] === 1) && club.mixerPlain,
      'RESET clears every mute and solo');
    club.draw(ctx);
  }
  // THE PITCH fader beside the parts (Peter, 6 Oct 2026: "like you can on a technics 1200"): the
  // tempo ±8% on the transport's warp, the key left alone; a drag moves it, a tap does not; a
  // click at the middle; Rusty's speed rides on it; kept with the song; RESET and its readout
  // put it back
  {
    const { PITCH_RANGE, setSpeed } = await import('../src/game/banger/club-fx.js');
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    const drag = (x, y0, y1) => {
      Input.pointer = { x, y: y0, down: true };
      Input.press('pointer');
      club.update(1 / 60);
      Input.pointer = { x, y: y1, down: true };
      club.update(1 / 60);
      Input.release('pointer');
      Input.pointer.down = false;
      club.update(1 / 60);
      Input.endFrame();
      club.update(1 / 60);   // the finger is off: the mixer is kept on the frame after
    };
    const f = club.boxes.pitch, last = club.boxes.faders[PARTS.length - 1];
    const mid = (f.top + f.bot) / 2, half = (f.bot - f.top) / 2, x = f.x + f.w / 2;
    assert(PITCH_RANGE === 0.08 && f && club.boxes.pitchZero && f.x >= last.x + last.w - 1 && club.pitch === 0
      && near(Audio.tempo, 1) && club.playedBpm === club.song.bpm,
    'a PITCH strip right of the faders, ±8% like a Technics, at the song\'s own tempo');
    tap(club, x, f.top + 2);
    club.update(1 / 60);
    assert(club.pitch === 0 && near(Audio.tempo, 1), 'a tap on the pitch slot does not throw the tempo');
    drag(x, mid, mid - half / 2);
    assert(near(club.pitch, 0.04) && near(Audio.tempo, 1.04) && Audio.detune === 1 && near(club.playedBpm, club.song.bpm * 1.04)
      && club.rec.mixer?.pitch === club.pitch && !club.mixerPlain,
    `dragged halfway up: 4% faster, the key unmoved, kept with the song (${club.pitch}, ${Audio.tempo}, ${JSON.stringify(club.rec.mixer)})`);
    setSpeed(0.5);
    const slow = Audio.tempo;
    setSpeed(1);
    assert(near(slow, 0.52) && near(Audio.tempo, 1.04), `Rusty's speed rides on the pitch, and lets go back to it (${slow})`);
    drag(x, mid, f.top - half);
    assert(near(club.pitch, PITCH_RANGE) && near(Audio.tempo, 1 + PITCH_RANGE), 'and no further than 8%');
    club.setPitch(0.003);
    assert(club.pitch === 0, 'a click at the middle: within 0.4% is the written tempo');
    club.setPitch(-0.03);
    club.update(1 / 60);
    const again = new BangerClubState({ rec: club.rec, onBack: () => {} });
    again.enter();
    const back = again.pitch === -0.03 && near(Audio.tempo, 0.97);
    again.exit();
    assert(back && near(Audio.tempo, 1), `the pitch is back when the song is opened again, and gone when it is left (${again.pitch})`);
    Audio.setBank(club.song.bank, club.song.mix, club.song.arrangement, { startAtBeginning: true });
    club.draw(ctx);
    tap(club, ...centre(club.boxes.pitchZero));
    club.update(1 / 60);
    assert(club.pitch === 0 && near(Audio.tempo, 1) && club.mixerPlain && !club.rec.mixer,
      'its readout is a tap back to the written tempo');
    club.setPitch(0.05);
    club.draw(ctx);
    tap(club, ...centre(club.boxes.reset));
    assert(club.pitch === 0 && near(Audio.tempo, 1) && club.mixerPlain, 'and RESET puts the pitch back too');
    club.draw(ctx);
  }
  for (let k = 0; k < 600; k++) club.update(1 / 60);
  assert(club.mixerOpen, 'the panel stays open, untouched, until it is closed — ten seconds and still there');
  tap(club, 5, 5);
  assert(!club.mixerOpen, 'a tap outside the panel closes it');
  // The dancing: one hero at a time joins in, each on one of their own eight dances (and
  // Lorenzo's occasional moonwalk), and a change always picks a different one.
  // `resting` too: a hero caught sitting a few bars out (REST_CHANCE) when this resets would
  // otherwise never rejoin — the check failed about one run in four on the dice.
  club.dancers.forEach((d, k) => { d.move = null; d.resting = false; d.joinAt = club.t + 0.05 + k * 0.1; d.changeAt = Infinity; });
  club.update(1 / 60);
  const firstIn = club.dancers.filter((d) => d.move).length;
  for (let k = 0; k < 60; k++) club.update(1 / 60);
  const grumposAt = HERO_MOVES.findIndex((m) => m.hero === 'grumpos');
  assert(firstIn < HERO_MOVES.length && club.dancers.every((d, i) => (i === grumposAt ? d.resting && !d.move : d.move && d.move.hero === HERO_MOVES[i].hero) && d.moves.filter((m) => m.move !== 'moonwalk').length === 8),
    'the heroes join the dancing one at a time, each on one of their own eight dances (the gallery\'s lab set) — Grumpos joins in just standing there');
  {
    // mostly standing and bopping, dancing now and then
    const g = club.dancers[grumposAt];
    let resting = 0, n = 0;
    for (let k = 0; k < 4000; k++) { g.changeAt = -1; club.updateDancers(); n++; if (g.resting) resting++; }
    assert(resting / n > 0.5 && resting < n, 'Grumpos mostly stands bopping and only dances now and then');
  }
  const was = club.dancers[0].move;
  club.dancers[0].changeAt = club.t;
  const rnd0 = Math.random;
  Math.random = () => 0.99;                         // a change, not a rest
  club.update(1 / 60);
  Math.random = rnd0;
  assert(club.dancers[0].move !== was && club.dancers[0].moves.includes(club.dancers[0].move), 'and change to another of theirs at random');
  club.draw(ctx);
  // A rest: a hero drops back to the idle bob for a few bars, then dances again.
  {
    const d = club.dancers[3];
    const rnd = Math.random;
    Math.random = () => 0;                          // the rest comes up
    d.changeAt = club.t; club.update(1 / 60);
    const rested = d.resting && d.move == null;
    Math.random = () => 0.99;                       // and back to dancing, something new
    d.changeAt = club.t; club.update(1 / 60);
    Math.random = rnd;
    assert(rested && !d.resting && d.move && d.move !== d.last, 'a hero sits a few bars out on the idle bob, then dances something new');
  }
  // A held move (or a speaker) let go comes out at once: on the audio clock, not the next
  // sixteenth the sequencer has yet to queue, a whole lookahead ahead (Peter, 6 Oct 2026).
  {
    const keep = { ctx: Audio.ctx, bank: Audio.bank, mixer: Audio.mixer, nextTime: Audio.nextTime, step: Audio.step, bpm: Audio.bpm, tempo: Audio.tempo };
    Object.assign(Audio, { ctx: { currentTime: 10 }, bank: {}, mixer: {}, nextTime: 10.3, step: 403, bpm: 120, tempo: 1 });
    const out = nowAt(), grid = nextSixteenthAt();
    Object.assign(Audio, keep);
    assert(out && out.when - 10 <= 0.02 && grid.when - 10 >= 0.25 && out.step === 400,
      `a let-go is heard ${Math.round((out?.when - 10) * 1000)} ms after the clock, not ${Math.round((grid?.when - 10) * 1000)} ms on the next sixteenth`);
    const once = HERO_MOVES.filter((m) => m.atOnce).map((m) => m.hero).sort().join();
    assert(once === 'clara,lorenzo', `the filter and the gates go in at the press too; the stutter, the bow, the speed, the throws and the stops wait for their grid (${once})`);
  }
  // Kiko's tape stop: on the 4, a beat; on the 2, two beats — one long stop or two short.
  {
    const kikoMove = HERO_MOVES.find((m) => m.hero === 'kiko');
    const four = kikoPlan({ step: 12 }), longTwo = kikoPlan({ step: 20 }, () => 0.2), twoTwos = kikoPlan({ step: 4 }, () => 0.8);
    assert(kikoMove.onTwoOrFour && four.beats === 1 && four.hits === 1
      && longTwo.beats === 2 && longTwo.hits === 1 && twoTwos.beats === 2 && twoTwos.hits === 2
      && moveSeconds(kikoMove, 0.1, longTwo) === 0.8 && moveSeconds(kikoMove, 0.1, four) === 0.4,
    'Kiko stops the tape on the 2 or the 4: a beat on the 4; on the 2, half a bar, one stop or two');
  }
  // Ramon's stutter comes in four lengths; Grumpos throws the beat into a ping-pong echo
  {
    const ramon = HERO_MOVES.find((m) => m.hero === 'ramon');
    const slices = new Set([0, 0.3, 0.6, 0.9].map((r) => holdChain(ramon, () => r)[0].params.slice));
    assert(slices.size === 4 && [...slices].every((x) => [1, 0.5, 0.25, 0.125].includes(x)),
      'Ramon\'s stutter is quarters, eighths, sixteenths or thirty-seconds, a different one each press');
    // ...and the floor's kick from it is gentler than it was, harder the higher he is dragged
    {
      const realActing = club.acting, realPunch = club.punch;
      club.acting = { i: HERO_MOVES.indexOf(ramon), when: 0, bar: 2, dur: Infinity };
      const amps = ramon.slices.map((slice) => { club.punch = { grab: 0, slice }; return club.stutterJolt(0.01).amp; });
      // how far through the dance one repeat goes, just before it snaps back
      const spans = ramon.slices.map((slice) => { club.punch = { grab: 0, slice }; return club.danceBeat(slice * 0.999); });
      club.acting = realActing; club.punch = realPunch;
      assert(amps.every((a, k) => a < 1 && (k === 0 || a > amps[k - 1])), `Ramon's stutter kicks the dancers harder the higher it is dragged, never as hard as it was (${amps})`);
      assert(spans.every((x, k) => x < 0.5 && (k === 0 || x > spans[k - 1])),
        `...and each repeat goes less far through the dance than it did, a little further the higher it is dragged (${spans.map((x) => x.toFixed(2))})`);
    }
    const grumpos = HERO_MOVES.find((m) => m.hero === 'grumpos');
    assert(grumpos.backbeat && grumpos.chain.some((fx) => fx.id === 'pingpong') && moveSeconds(grumpos, 0.1) === 0.4,
      'Grumpos throws a beat — the 2 or the 4 — into a ping-pong echo: his boomerang');
  }
  // the LED board: random lines, held a few bars or scrolled all the way off, style lines mixed in
  {
    const { LED_SLOGANS, LED_SCROLLS, LED_STYLE_LINES, fillLed } = await import('../src/game/banger/led-slogans.js');
    const realT = club.t, realRec = club.rec;
    club.rec = { ...realRec, style: 'shibuya' };
    club.led = null; club.ledRecent = [];
    const seen = [];
    let complete = true, scrolled = false;
    for (let t = 0; t < 600; t += 0.1) {
      club.t = t;
      const before = club.led;
      const a = club.ledText();
      if (club.led !== before && before) {
        // the line that just ended had its whole run: a scroll had left the board
        if (before.scroll && LED_COLS - before.dur * 22 + (before.text.length * 6 - 1) > 0.01) complete = false;
      }
      if (club.led !== before) { seen.push(club.led.text); if (club.led.scroll) scrolled = true; }
      if (!club.led.scroll && (a.offset < 0 || a.offset + club.led.text.length * 6 - 1 > LED_COLS)) complete = false;
    }
    club.t = realT; club.rec = realRec; club.led = null;
    const order2 = [];
    club.ledRecent = [];
    for (let k = 0; k < 10; k++) order2.push(club.nextLed(0).text);
    assert(complete && scrolled, 'every line fits or scrolls all the way off before the next comes on');
    assert(seen.includes('KAWAII') || seen.includes('ARIGATO') || seen.includes('SO KAWAII'), 'a Shibuya-Kei song gets its own lines: KAWAII, ARIGATO');
    assert(seen.slice(0, 10).join() !== order2.join(), 'the board picks at random, not in a set order');
    const removed = ['TAKE A NO', 'BIG TUNE', 'NOT TOO', 'STAY UP', 'SWEAT', 'NO SKIPS', 'TUNE!', 'COMBO!', 'FREE PLAY'];
    const all = [...LED_SLOGANS, ...LED_SCROLLS, ...Object.values(LED_STYLE_LINES).flatMap((l) => [...l.hold, ...l.scroll])];
    assert(removed.every((r) => !all.includes(r)), 'the lines Peter cut are gone');
    assert(all.every((t) => /^[A-Z0-9 !?\-.':()\/{}]+$/.test(t)), 'every line is in the board\'s font');
    // every line comes on moving: a short one pushed in from the top or the bottom a row at a time,
    // shoving the old one off the other edge a row behind it; a scroller carries the old one off left
    club.t = 1000; club.led = null;
    club.showLed('OPEN LATE');
    club.t = 1010;
    club.showLed('TURBO!');
    const first = club.ledText();
    const dir = club.led.dir;
    let pushed = Math.abs(first.dy) === 8 && first.from?.text === 'OPEN LATE' && first.from.dy === 0, steps = new Set();
    for (let t = 1010; t < 1011; t += 0.01) {
      club.t = t;
      const l = club.ledText();
      steps.add(l.dy);
      if (l.dy !== 0 && (!l.from || l.from.dy !== l.dy - dir * 8 || Math.sign(l.dy) !== dir)) pushed = false;
      if (l.dy === 0 && l.from) pushed = false;
    }
    assert(pushed && steps.size === 9 && [...steps].every(Number.isInteger),
      'a short line is pushed on from the top or the bottom a dot row at a time, shoving the old one off the other edge');
    club.t = 1012;
    club.showLed('DOLORES HAS LEFT THE BUILDING');
    const s0 = club.ledText();
    club.t = 1013;
    const s1 = club.ledText();
    assert(s0.from?.text === 'TURBO!' && s1.from && s1.from.offset === s0.from.offset - (s0.offset - s1.offset)
      && s1.from.cut === s1.offset - 1 && s1.dy === 0, 'a scroller shoves the old line off to the left as it comes on');
    club.t = realT; club.led = null;
  }
  // Skirts: no footwork — tap one foot, stand, or hop on the spot; Grumpos only stands.
  {
    const { heroDancePose, HERO_DANCE_CANDIDATES } = await import('../src/dev/hero-dance-candidates.js');
    const { SKIRT_LEGS } = await import('../src/game/banger/club.js');
    const { groundDanceFeet } = await import('../src/game/banger/dance-legs.js');
    const wide = HERO_DANCE_CANDIDATES.find((d) => d.hero === 'kiko' && d.move === 'shuffle') || HERO_DANCE_CANDIDATES.find((d) => d.hero === 'kiko');
    const kiko = club.dancers[HERO_MOVES.findIndex((m) => m.hero === 'kiko')];
    assert(kiko.skirted && !club.dancers[0].skirted, 'Kiko dances in a skirt; Lorenzo does not');
    assert(HERO_DANCE_CANDIDATES.every((move) => heroDancePose(move, 1).dance.legFlex === 0.48),
      'dance poses keep every hero in a compact knee bend');
    const grounded = groundDanceFeet({
      bounce: 0.03, tilt: -0.04, dance: { feet: [[0.17, 0], [-0.17, 0]] },
    });
    assert(grounded.dance.feet.every(([x, y]) => Math.abs(-grounded.bounce
      + x * Math.sin(grounded.tilt) + y * Math.cos(grounded.tilt)) < 1e-9),
    'planted dance shoes stay on the floor through body bounce and sway');
    let ok = true, tapped = false, hopped = false;
    for (let b = 0; b < 8; b += 0.125) {
      for (const legs of SKIRT_LEGS) {
        const pose = club.constructor.tameSkirtForTest(heroDancePose(wide, b), legs, b);
        const feet = pose.dance.feet;
        // standing hands the painter no feet: it stands them as at idle
        if (legs === 'hop' && pose.bounce > 0.03) hopped = true;
        if (legs === 'stand' && (pose.bounce !== 0 || pose.tilt !== 0)) ok = false;
        if (legs === 'stand') { if (feet) ok = false; continue; }
        // a hop gathers its feet under the hem: a shallow tuck and at most a hair wider (dance-legs.js)
        if (legs === 'hop') { if (!feet || Math.max(...feet.map((f) => Math.abs(f[0]))) > 0.11) ok = false; continue; }
        const tilt = pose.tilt || 0;
        const planted = feet.filter((f) => Math.abs(Math.abs(f[0]) - 0.085) < 1e-9
          && Math.abs(-pose.bounce + f[0] * Math.sin(tilt) + f[1] * Math.cos(tilt)) < 1e-9).length;
        if (Math.max(...feet.map((f) => Math.abs(f[0]))) > 0.1 || planted < 1) ok = false;
        if (legs === 'tap' && planted === 1) tapped = true;
        if (legs === 'hop' && pose.bounce > 0.03) hopped = true;
      }
    }
    assert(ok && tapped && hopped, 'a skirted hero taps one foot, stands, or hops — never spreads their feet');
    const grumpos = club.dancers[HERO_MOVES.findIndex((m) => m.hero === 'grumpos')];
    const real = Math.random;
    let stood = true;
    for (let n = 0; n < 30; n++) {
      Math.random = () => (n % 10) / 10;
      grumpos.move = grumpos.moves[0]; grumpos.resting = false; grumpos.changeAt = -1; grumpos.joinAt = -1;
      club.updateDancers();
      if (grumpos.move && grumpos.legs !== 'stand') stood = false;
    }
    Math.random = real;
    assert(stood, 'Grumpos only ever stands and dances with his arms');
  }
  // A section change brings a moment: into the drop, confetti.
  {
    const form = club.song.form;
    const drop = form.find((f) => f.role === 'drop');
    assert(form.length > 3 && drop && drop.from > 1, 'the club knows the song\'s sections');
    club.momentAt = Infinity; club.moments = []; club.shownAt = club.shownAt ?? 0;
    const realBeat = club.beat;
    club.beat = () => (drop.from - 2) * 4 + 0.5;      // the bar before the drop
    club.update(1 / 60);
    club.beat = () => (drop.from - 1) * 4 + 0.1;      // the drop's downbeat
    club.update(1 / 60);
    assert(club.moments.some((m) => m.kind === 'confetti'), 'into the drop: confetti');
    club.beat = realBeat;
    club.moments = [];
  }
  // The crowd moments: each one draws, and goes when its time is up.
  const { CLUB_MOMENTS } = await import('../src/game/banger/club.js');
  club.momentAt = Infinity;                         // no new ones while these play out
  club.smokeAt = Infinity;
  for (const kind of [...CLUB_MOMENTS, 'smoke']) club.startMoment(kind);
  {
    // The song held where it is for these eight seconds: a section change heard while they play
    // out brings a new moment of its own, and the check failed whenever the song crossed one.
    const realBeat = club.beat;
    const held = club.beat();
    club.beat = () => held;
    for (let k = 0; k < 80; k++) { club.update(1 / 10); club.draw(ctx); }
    club.beat = realBeat;
  }
  assert(!club.moments.some(m => [...CLUB_MOMENTS, 'smoke'].includes(m.kind)), 'the crowd moments (beach ball, confetti, glow sticks, the smoke machine) play and clear');
  // THE FLYING TOASTER: never under water, and a tap sends it round a loop-the-loop
  {
    club.moments = [];
    const realUnder = club.underwater;
    club.underwater = () => true;
    const dry = !club.startMoment('toaster');
    club.underwater = realUnder;
    assert(dry && club.startMoment('toaster'), 'the flying toaster never comes while the room is under water');
    const m = club.moments.find((x) => x.kind === 'toaster');
    club.t += 2; club.draw(ctx);
    const s = club.toasterSpot, life = m.life;
    const took = s && club.tapToaster(s.x, s.y);
    assert(took && m.loops.length === 1 && Math.abs(m.life - life - m.loops[0].dur) < 1e-9 && m.loops[0].dur > 0.5,
      'a tap on it sends it round a loop, and its crossing lasts that much longer');
    club.t += m.loops[0].dur * 0.5; club.draw(ctx);
    const top = club.toasterSpot;
    assert(club.tapToaster(top.x, top.y) && m.loops.length === 1 && top.y < s.y - m.loops[0].r, '...up and over, once round at a time');
    club.t += m.loops[0].dur * 0.5 + 1e-6; club.draw(ctx);
    assert(Math.hypot(club.toasterSpot.x - s.x, club.toasterSpot.y - s.y) < 1, '...and back where it started, to carry on across');
    club.t += m.life; club.update(1 / 60);
    assert(!club.moments.includes(m), 'and it is gone once across');
  }
  // Grumpos's non-flexing dance phases retain his native standing arms.
  {
    const { HERO_DANCE_LAB_CANDIDATES, heroDancePose } = await import('../src/dev/hero-dance-candidates.js');
    const moves = HERO_DANCE_LAB_CANDIDATES.filter(m => m.hero === 'grumpos');
    assert(moves.filter(m => ['B', 'D', 'E'].includes(m.letter)).every(m => heroDancePose(m, 1).dance.restArms),
      'Grumpos quiet taps keep his normal arms at his sides');
    const flex = moves.find(m => m.letter === 'C');
    assert(heroDancePose(flex, 6).dance.restArms && !heroDancePose(flex, 6).armsInFront
      && !heroDancePose(flex, 2).dance.restArms && heroDancePose(flex, 2).armsInFront,
      'Grumpos returns to his normal standing arms between double-biceps holds');
  }
  // The strobe follows heard beats across a four-bar burst, then rests.
  {
    const { strobePulse } = await import('../src/game/banger/club.js');
    assert(strobePulse(31.9, 32) === 0 && strobePulse(48, 32) === 0,
      'strobe stays off before its downbeat and ends after four bars');
    assert(strobePulse(32, 32) === 1 && strobePulse(32.5, 32) === 1
      && strobePulse(32.25, 32) === 0 && strobePulse(47.5, 32) === 1,
      'strobe flashes twice per heard beat throughout the burst');
    assert(strobePulse(32, 32, true) === 0 && strobePulse(32, -Infinity) === 0,
      'reduced motion and an unscheduled strobe never flash');
    const realBeat = club.beat;
    const reduced = club.reduceMotion;
    const next = club.strobeNextBeat;
    const start = club.strobeBeat;
    club.reduceMotion = false; club.strobeNextBeat = 200;
    club.beat = () => 200.1; club.update(1 / 60);
    assert(club.strobeBeat === 200 && club.strobeNextBeat >= 264 && club.strobeNextBeat <= 280
      && club.strobeNextBeat % 4 === 0, 'strobe starts on a downbeat and leaves 12–16 quiet bars after its four bars');
    club.draw(ctx);
    club.reduceMotion = true; club.beat = () => 300; club.update(1 / 60);
    assert(club.strobeBeat === 200, 'reduced motion prevents new strobe bursts');
    club.beat = realBeat; club.reduceMotion = reduced;
    club.strobeNextBeat = next; club.strobeBeat = start;
  }
  // Paper streamers can fly alone or share a confetti burst.
  {
    club.moments = [];
    const scraps = club.floorConfetti.length;
    club.startMoment('streamers');
    const ribbons = club.moments.at(-1);
    assert(ribbons.ribbons.length >= 12 && !ribbons.bits && club.floorConfetti.length === scraps,
      'standalone streamers carry curled ribbons without generating confetti');
    club.t += 1; club.draw(ctx);
    club.startMoment('confetti', { streamers: true });
    assert(club.moments.at(-1).bits.length === 72 && club.moments.at(-1).ribbons.length >= 12,
      'a combined confetti burst carries both paper pieces and streamers');
    club.t += 1; club.draw(ctx);
    club.startMoment('confetti', { streamers: false });
    assert(!club.moments.at(-1).ribbons, 'confetti alone remains available');
    // streamers do not fade: they stay until they have fallen out of the bottom of the picture
    club.t += 4; club.draw(ctx); club.update(1 / 60);
    const falling = club.moments.some((m) => m.ribbons);
    club.t += 8; club.draw(ctx); club.update(1 / 60);
    assert(falling && !club.moments.some(m => m.ribbons), 'streamers stay till they fall out of the picture, then clear');
  }
  // New party events use heard beats, keep the controls untouched, and do not
  // stack two major moments. A confetti event queues its cleanup separately.
  {
    const realBeat = club.beat;
    let beat = 200;
    club.beat = () => beat;
    club.moments = [];
    club.startMoment('spotlight');
    assert(club.moments[0].beats === 8 && club.moments[0].hero >= 0, 'spotlight selects one hero for two bars');
    assert(club.startMoment('bubbles') === false, 'major party moments do not stack');
    for (const kind of ['spotlight', 'bubbles', 'cleaner', 'drop-jump']) {
      club.moments = []; club.startMoment(kind);
      const moment = club.moments[0];
      for (const age of [0.1, 1, 3.9, 4.5]) { beat = moment.beat0 + age; club.draw(ctx); }
      const { partyAlive } = await import('../src/game/banger/club-party.js');
      assert(!partyAlive(moment, moment.beat0 + moment.beats), `${kind} ends on its heard-beat boundary`);
    }
    const { dropMotion } = await import('../src/game/banger/club-party.js');
    assert(dropMotion(3.9).crouch > 0.9 && dropMotion(4.5).jump === 1 && dropMotion(5).jump === 0,
      'crowd crouches before the drop, jumps on it, then lands');
    const song = club.song, shown = club.shownAt;
    club.song = { ...song, form: [{ from: 1, to: 4, role: 'build' }, { from: 5, to: 8, role: 'drop' }] };
    club.shownAt = club.t - 20; beat = 13; club.moments = []; club.lastDropCue = null; club.dropJumpNext = true;
    club.updateParty(); club.updateParty();
    assert(club.moments.length === 1 && club.moments[0].kind === 'drop-jump' && club.moments[0].jumpAt === 3,
      'upcoming drop schedules one crouch, aligned to its exact downbeat');
    club.song = song; club.shownAt = shown;
    club.moments = []; club.cleanerCooldown = -Infinity;
    club.startMoment('confetti');
    assert(club.cleanerBeat > beat, 'confetti schedules a later cleaner visit');
    club.moments = []; club.cleanerBeat = Infinity; club.partyNextBeat = Infinity;
    club.beat = realBeat;
  }
  // THE MOONWALK: one hero's at a time — and now and then (GROUP_MOONWALK_CHANCE) all the
  // moonwalkers at once, from a bar line, in step and facing the same way
  {
    const { MOONWALKERS } = await import('../src/dev/hero-dance-candidates.js');
    const { partyHero, partyAlive } = await import('../src/game/banger/club-party.js');
    const realBeat = club.beat, rnd0 = Math.random, song = club.song, shown = club.shownAt;
    const saved = club.dancers.map((d) => ({ ...d })), facing = [...club.facing], turns = [...club.turns], turnAt = [...club.turnAt];
    let beat = 400;
    club.beat = () => beat;
    const walkers = HERO_MOVES.map((_, i) => i).filter((i) => MOONWALKERS.has(HERO_MOVES[i].hero));
    assert(walkers.map((i) => HERO_MOVES[i].hero).sort().join() === 'b33p,lorenzo,rusty'
      && walkers.every((i) => club.dancers[i].moves.filter((m) => m.move === 'moonwalk').length === 1),
      'Lorenzo, B-33P and Rusty each have the moonwalk');
    const [a, b] = walkers;
    const moonwalk = (i) => club.dancers[i].moves.find((m) => m.move === 'moonwalk');
    const changes = () => {
      let n = 0;
      for (let k = 0; k < 300; k++) {
        club.dancers.forEach((d, i) => { d.changeAt = i === b ? -Infinity : Infinity; d.joinAt = -Infinity; });
        club.dancers[b].move = club.dancers[b].moves[0]; club.dancers[b].resting = false;
        club.updateDancers();
        if (club.dancers[b].move === moonwalk(b)) n++;
      }
      return n;
    };
    // everyone but b on some other dance first: the room's own dancing can have left the third
    // moonwalker on it (or due to join and free to pick it), which holds it from b all along
    club.dancers.forEach((d, i) => { if (i !== b && d.moves.length) { d.move = d.moves.find((m) => m.move !== 'moonwalk'); d.resting = false; } });
    club.dancers[a].move = moonwalk(a);
    const whileTaken = changes();
    club.dancers[a].move = club.dancers[a].moves[0];
    assert(whileTaken === 0 && changes() > 0, 'nobody takes up the moonwalk while another hero is on it');
    club.moments = []; club.formationSwap = null; club.acting = null; club.queued = null; club.holding = null;
    club.turns = club.turns.map(() => null);
    walkers.forEach((i, k) => { club.facing[i] = k < 2 ? 1 : -1; });
    assert(club.startMoment('moonwalk'), 'THE GROUP MOONWALK starts');
    const mw = club.moments.find((m) => m.kind === 'moonwalk');
    assert(mw.beats === 16 && mw.who.length === 3 && walkers.every((i) => mw.who.includes(i)) && mw.dir === 1
      && club.turns[walkers[2]]?.to === 1 && !club.turns[a] && !club.turns[b],
      'all three are in it, facing the way most of them do: the odd one out hops round to join them');
    const poses = walkers.map((i) => partyHero(mw, mw.beat0 + 2.5, HERO_MOVES[i].hero, i, { kind: 'idle' }).pose);
    assert(poses.every((p) => p.kind === 'run' && p.walk && p.shift < 0 && p.shift === poses[0].shift), 'and they glide back in step');
    const other = HERO_MOVES.findIndex((m) => !MOONWALKERS.has(m.hero)), idle = { kind: 'idle' };
    assert(partyHero(mw, mw.beat0 + 2.5, HERO_MOVES[other].hero, other, idle).pose === idle, 'the rest dance on');
    for (const age of [0.1, 0.4, 3, 7, 12]) { beat = mw.beat0 + age; club.draw(ctx); }
    beat = mw.beat0 + 4; club.lastTurnBeat = -Infinity; club.turnAt[other] = beat;
    club.updateFacing(beat);
    assert(club.facing[walkers[2]] === 1 && !club.turns[other], 'nobody turns round while it is on');
    assert(!partyAlive(mw, mw.beat0 + 16), 'it lasts two glides, four bars');
    // the party slot: rolled once, and the group moonwalk waits for a bar line
    club.song = { ...song, form: [] }; club.shownAt = club.t - 20; club.cleanerBeat = Infinity;
    club.moments = []; club.partyNextBeat = 0; club.groupMoonwalkNext = null;
    beat = 401; Math.random = () => 0.01;
    club.updateParty();
    const waited = !club.moments.length && club.groupMoonwalkNext === true;
    Math.random = () => 0.99; beat = 402; club.updateParty();
    const held = !club.moments.length;
    beat = 404; club.updateParty();
    assert(waited && held && club.moments[0]?.kind === 'moonwalk' && club.groupMoonwalkNext === null,
      'a party slot that rolls the group moonwalk waits for the bar line, and goes on it');
    club.moments = []; club.partyNextBeat = 0; beat = 409; club.updateParty();
    assert(club.moments.length === 1 && club.moments[0].kind !== 'moonwalk', 'otherwise the slot is one of the usual moments');
    Math.random = rnd0; club.beat = realBeat; club.song = song; club.shownAt = shown;
    club.moments = []; club.partyNextBeat = Infinity;
    saved.forEach((d, i) => Object.assign(club.dancers[i], d));
    club.facing = facing; club.turns = turns; club.turnAt = turnAt;
  }
  {
    const build = window.__MASH_BUILD__;
    club.draw(ctx);
    const sign = club.boxes.sign, led = club.boxes.led;
    const signX = sign.x + sign.w / 2, signY = sign.y + sign.h / 2;
    const ledX = led.x + led.w / 2, ledY = led.y + led.h / 2;
    club.moments = []; club.popup = null; club.led = null;
    club.lastSignTap = -Infinity; club.lastLedTap = -Infinity; club.skipTo = null;
    const form = club.song.form;
    const realSeek = Audio.setStepAtBoundary;
    const seeks = [];
    Audio.setStepAtBoundary = (step) => seeks.push(step);
    const realBeat = club.beat;
    const inSection = (i) => { club.beat = () => (form[i].from - 1) * 4 + 1; };   // the heard beat, a beat into section i
    for (const mode of [null, 'test']) {
      window.__MASH_BUILD__ = mode;
      seeks.length = 0; club.skipTo = null; club.lastSignTap = -Infinity; inSection(0); club.update(1 / 60);
      tap(club, signX, signY);
      assert(seeks.length === 0, 'one club-name sign tap does not skip');
      tap(club, signX, signY);
      assert(seeks.length === 1 && seeks[0] === (form[1].from - 1) * 16 && club.skipTo === 1,
        'double-tapping the club-name sign queues a seek to the next section' + (mode ? ' (dev build)' : ''));
      tap(club, signX, signY); tap(club, signX, signY);
      assert(seeks[1] === (form[2].from - 1) * 16, 'another double-tap before it lands steps on from the queued section');
      club.skipTo = null; club.lastSignTap = -Infinity; inSection(form.length - 1); club.update(1 / 60);
      tap(club, signX, signY); tap(club, signX, signY);
      assert(seeks[2] === 0, 'the last section skips round to the first');
    }
    Audio.setStepAtBoundary = realSeek; club.beat = realBeat; club.skipTo = null; seeks.length = 0;
    tap(club, ledX, ledY);
    club.draw(ctx);
    const eqOn = club.led?.eq === true;
    tap(club, ledX, ledY);
    club.draw(ctx);
    assert(eqOn && !club.led?.eq && club.popup === null && seeks.length === 0,
      'a tap on the red LED board turns it into a graphic equaliser, another puts its words back, and neither skips');
    window.__MASH_BUILD__ = build; club.moments = [];
  }
  // The subwoofers pump on the song's own kick.
  {
    const realBeat = club.beat;
    const b = club.song.bank;
    const per = b.sections[0].kick.length;
    let step = -1;
    for (let s0 = 0; s0 < b.order.length * per && step < 0; s0++) if (b.sections[b.order[Math.floor(s0 / per)]].kick[s0 % per]) step = s0;
    club.beat = () => step / 4;
    const on = club.kickThump();
    club.beat = () => (step + 2.5) / 4;
    const after = club.kickThump();
    club.beat = realBeat;
    assert(step >= 0 && on > 0.99 && after < 0.2, 'the subwoofers punch on a kick and fall back after it');
  }
  assert(partOf('kick') === 'drums' && partOf('bass2') === 'bass' && partOf('chords3') === 'chords' && partOf('lead5') === 'lead',
    'lanes sort into their parts by family');
  club.draw(ctx);
  frame(club, 'back');
  // the count-in reads a negative beat: every colour the room draws must still be a colour
  {
    const realBeat = club.beat;
    const strict = document.createElement('canvas').getContext('2d');
    const grad = strict.createLinearGradient.bind(strict);
    let bad = 0;
    const check = (g) => { const add = g.addColorStop?.bind(g); if (add) g.addColorStop = (o, c) => { if (typeof c !== 'string' || c.includes('undefined')) bad++; add(o, c); }; return g; };
    strict.createLinearGradient = (...a) => check(grad(...a));
    const rad = strict.createRadialGradient.bind(strict);
    strict.createRadialGradient = (...a) => check(rad(...a));
    for (const b of [-3.5, -0.5, 16.5, 33.5]) { club.beat = () => b; club.draw(strict); }
    club.beat = realBeat;
    assert(bad === 0, 'the room draws in real colours even on the count-in\'s negative beats');
  }
  // confetti pools on the floor drop on drop (up to a limit) until Dolores or the vacuum cleaner comes
  {
    const { CLEANERS, scrapY, cleanerFloor } = await import('../src/game/banger/club-party.js');
    club.moments = []; club.floorConfetti = []; club.cleanerBeat = Infinity; club.cleanerCooldown = Infinity;
    for (let k = 0; k < 8; k++) { club.moments = []; club.startMoment('confetti'); }
    assert(club.floorConfetti.length > 26 && club.floorConfetti.length <= 130 && club.cleanerBeat === Infinity,
      'confetti pools on the floor from drop to drop, and not every drop sends a cleaner');
    assert(CLEANERS.join() === 'cleaner,vacuum' && club.startMoment('vacuum') !== undefined, 'Dolores and the vacuum cleaner both come for it');
    club.moments = []; club.startMoment('vacuum'); club.draw(ctx); club.moments = [];
    assert(cleanerFloor(100, 60, 270, 1) > 100 + 60 * 0.5 && scrapY(100, 60, 270, 1, 1) <= 267,
      'the cleaners and the scraps lie lower on the floor, clear of the heroes, and inside the screen');
    club.floorConfetti = []; club.cleanerCooldown = -Infinity;
  }
  // a slow device gets the lighter room, and goes back to the full one when it recovers
  {
    const real = club.shownAt;
    club.lite = false; club.frameMs = 16;
    for (let k = 0; k < 120; k++) club.update(0.05);
    const slow = club.lite;
    for (let k = 0; k < 200; k++) club.update(1 / 60);
    assert(slow && !club.lite, 'a slow device gets the lighter room, and the full one back when it keeps up');
    club.draw(ctx); club.lite = true; club.draw(ctx); club.lite = false;
    club.shownAt = real;
  }
  // the glow sticks: every one has somewhere to be (a stick with no sideways speed drew nowhere)
  {
    club.moments = [];
    club.startMoment('sticks');
    const m = club.moments.at(-1);
    assert(m.sticks.every((st) => Number.isFinite(st.vx) && Number.isFinite(st.spin) && Number.isFinite(st.vy)),
      'every glow stick is thrown with a direction and a spin');
    club.moments = [];
  }
  // the song looping back starts a Mexican wave across the floor
  {
    const realBeat = club.beat;
    const bars = club.song.form.at(-1).to;
    club.lastBeat = bars * 4 - 0.5; club.beat = () => bars * 4 + 0.3;   // the engine counts on past the end
    club.update(1 / 60);
    const started = club.waveAt === club.t;
    club.beat = realBeat;
    club.draw(ctx);
    assert(started, 'when the song loops, the heroes start a Mexican wave');
    club.waveAt = -Infinity;
  }
  // a skip lands mid-moment: Dolores keeps sweeping, the same beats in, and what is due next
  // stays as far off (club.followSeek)
  {
    const realSongBeat = Audio.songBeat, realBeat = club.beat, wasPaused = club.paused;
    let heard = 40;
    Audio.songBeat = () => heard; club.beat = () => heard; club.paused = false;
    club.moments = []; club.partyNextBeat = Infinity; club.momentAt = Infinity;
    club.update(1 / 60);
    club.startMoment('cleaner');
    const m = club.moments.find((x) => x.kind === 'cleaner');
    m.beat0 = heard - 3;
    club.partyNextBeat = heard + 40;
    for (const jump of [64, -60]) {
      heard += jump; club.update(1 / 60);
      // (the next party moment, not the next cleaner: a section's confetti may book a cleaner afresh)
      assert(club.moments.includes(m) && Math.abs(heard - m.beat0 - 3) < 0.1 && Math.abs(club.partyNextBeat - heard - 40) < 0.1,
        `a skip ${jump > 0 ? 'forward' : 'back'} leaves Dolores sweeping where she was, and the next party moment as far off`);
    }
    Audio.songBeat = realSongBeat; club.beat = realBeat; club.paused = wasPaused;
    club.moments = []; club.cleanerBeat = Infinity; club.partyNextBeat = Infinity; club.seekBeat = null;
  }
  // a tap on the club sign brings up the song's title for a while (it was the mirror ball's)
  club.draw(ctx);
  const sb = club.boxes.sign;
  club.lastSignTap = -Infinity;
  tap(club, sb.x + sb.w / 2, sb.y + sb.h / 2);
  const t0 = club.t;
  club.t = t0 + 2; club.draw(ctx);
  assert(club.titleAt === t0, 'tapping the club sign shows the title');
  club.t = t0 + 2.5; club.showTitle();
  assert(club.titleAt < t0 + 2.5, 'tapped again while up, the title stays up');
  club.t = t0;
  // THE SPEAKERS, THE RIG AND THE LASERS (Peter, 5 Oct 2026): a speaker tapped BOOMs, held boosts
  // the bass; a par can tapped lights the room in its colour; a tap up in the room sweeps the lasers.
  {
    club.draw(ctx);
    const sp = club.boxes.speakers[0], can = club.boxes.cans[2];
    const spot = [sp.x + sp.w / 2, sp.y + sp.h * 0.15];
    club.boomAt = -Infinity;
    tap(club, ...spot);
    club.update(1 / 60);
    const boomed = club.boomAt > -Infinity && !club.speakerHold;
    // ...and the tap throws the heroes up with its BOOM: knees in just before, up, bouncing to a stop
    {
      const realHeard = club.heardNow, at = club.speakerBoomAt;
      const hop = (dt) => { club.heardNow = () => at + dt; return club.boostHop(); };
      const crouch = hop(-0.05), up = hop(0.15), down = hop(0.32), second = hop(0.45), still = hop(1.2);
      club.heardNow = realHeard;
      assert(at === club.boomAt && crouch?.lift === 0 && crouch.squash > 0 && up.lift > 0.07 && down.squash > 0
        && second.lift > 0 && second.lift < up.lift * 0.5 && still === null,
      'a speaker tapped throws the heroes up with its BOOM, bouncing to a stop');
    }
    Input.pointer = { x: spot[0], y: spot[1], down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    club.t += 0.4; club.update(1 / 60);
    const boosting = !!club.boost && club.speakerHold?.boosted;
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    const ended = !club.boost && !club.speakerHold;
    tap(club, can.x + can.w / 2, can.y + can.h / 2);
    const lit = club.lightShow?.col === can.col;
    club.draw(ctx);
    const heads = Math.min(...club.boxes.heroes.map((b) => b.y));
    tap(club, 480 * 0.3, (club.layout.stageTop + heads) / 2 + 20);
    const swept = !!club.laserSweep;
    club.draw(ctx);
    // ...two patterns a tap, one after the other (Peter: "double or repeat or cycle")
    const L = club.laserSweep, beatS = club.barSeconds() / 4;
    const cycles = L && L.kinds.length === 2 && L.kinds[0] !== L.kinds[1]
      && club.laserState(L.at + beatS)?.kind === L.kinds[0] && club.laserState(L.at + 9 * beatS)?.kind === L.kinds[1]
      && club.laserState(L.at + 9 * beatS)?.col !== club.laserState(L.at + beatS)?.col;
    assert(boomed && boosting && ended && lit && swept && cycles,
      `a speaker tapped booms, held boosts the bass till let go; a par can lights the room in its colour; up top sweeps the lasers, two patterns a tap (${[boomed, boosting, ended, lit, swept, cycles]})`);
    // a laser that meets the mirror ball stops on it and lights it up (Peter: "those lights don't
    // seem to reflect in the disco ball. can they?")
    {
      const realBall = club.ballAt;
      club.ballAt = -1e9; club.draw(ctx);
      const b = club.boxes.ball;
      const meets = club.laserMeetsBall(b.x, b.y - b.r * 3, 0, 1, 1000), misses = club.laserMeetsBall(b.x + b.r * 2, b.y - b.r * 3, 0, 1, 1000);
      club.laserSweep = { kinds: ['tunnel', 'sheet'], cols: ['#3dff6e', '#ff3355'], at: club.heardNow() - 1.5 * beatS, dir: 1 };
      club.draw(ctx);
      const caught = club.ballHits.some((h) => h.colour === '#3dff6e');
      club.ballAt = realBall;
      assert(Math.abs(meets - b.r * 2) < 1e-6 && misses == null && caught,
        `the tapped lasers land on the mirror ball and light it up (${[meets, misses, caught]})`);
    }
    club.lightShow = null; club.laserSweep = null; club.boomAt = -Infinity;
  }
  // the confetti on the floor: little paper shapes lying at their own angles, a fill a colour
  {
    let fills = 0;
    const counting = new Proxy(ctx, {
      get: (o, k) => (k === 'fill' ? () => { fills++; } : typeof o[k] === 'function' ? o[k].bind(o) : o[k]),
      set: (o, k, v) => { o[k] = v; return true; },
    });
    const scraps = Array.from({ length: 130 }, (_, k) => makeScrap(k * 3.5, (k % 10) / 10, ['#ff4fa3', '#ffd23f', '#3fb8ff', '#7cff6b', '#b06bff'][k % 5], 0));
    drawScraps(counting, scraps.map((sc) => ({ sc, x: sc.x, y: 200 })), 1, { glint: 1 });
    const old = { x: 50, dy: 0.3, colour: '#ff4fa3', at: 0 };   // dropped before scraps had a look
    drawScraps(ctx, [{ sc: old, x: 50, y: 200 }], 1);
    assert(fills > 0 && fills <= 24 && new Set(scraps.map((sc) => sc.shape)).size >= 3 && old.shape && Number.isFinite(old.a),
      `the floor's confetti is paper shapes at their own angles, a fill a colour (${fills} fills for 130 scraps)`);
    // ...and it bounces when a speaker BOOMs or the bass is boosted (Peter, 5 Oct 2026)
    const still = club.scrapHop(1);
    club.boomAt = club.heardNow() - 0.1;
    const boomed = club.scrapHop(1);
    const lifts = scraps.slice(0, 20).map((sc) => boomed(sc)[0]);
    club.boomAt = -Infinity;
    club.boost = { lanes: [], wobbling: true, amount: 0.8 };
    const wobbling = club.scrapHop(1);
    club.boost = null;
    drawScraps(ctx, scraps.map((sc) => ({ sc, x: sc.x, y: 200 })), 1, { hop: boomed });
    assert(still === null && lifts.every((l) => l > 0) && new Set(lifts.map((l) => l.toFixed(2))).size > 10 && typeof wobbling === 'function',
      'the floor\'s confetti bounces on a BOOM, each scrap its own height, and with the bass boosted; still otherwise');
  }
  // ...and the mirror ball is grabbed: dragged out on its wire and spun, it swings back when let go
  {
    club.draw(ctx);
    const mb = club.boxes.ball, phase0 = club.spinPhase, title0 = club.titleAt;
    Input.pointer = { x: mb.x, y: mb.y, down: true };
    Input.press('pointer'); club.update(1 / 60); Input.endFrame();
    Input.pointer.x += 30; club.update(1 / 60); Input.endFrame();
    const swung = club.ballSwing.a, spun = club.spinPhase - phase0;
    Input.release('pointer'); Input.pointer.down = false; club.update(1 / 60); Input.endFrame();
    const spinning = club.spinV;
    for (let k = 0; k < 400; k++) club.ballOn(1 / 60);
    assert(club.titleAt === title0 && swung > 0.2 && spun > 1 && spinning > 1 && Math.abs(club.ballSwing.a) < 0.02,
      `the mirror ball dragged swings out on its wire and spins, and swings back when let go (${swung.toFixed(2)} rad, ${spun.toFixed(1)} turned, spinning ${spinning.toFixed(1)})`);
    club.spinV = 0; club.spinPhase = 0;
  }
  assert(backs === 1, 'BACK goes back to the Lab');
  // The same SONG plays on (Audio.sourceBank, the bank as it was handed in): a sound swapped
  // on the mixer is put back on the way out, which re-merges the bank the sequencer reads.
  const bank = Audio.sourceBank;
  club.exit();
  assert(bank && Audio.sourceBank === bank && Audio.bank, 'leaving the club leaves the song playing');
  // back in the Lab it plays on, its row lit; choosing it again stops it
  const back = new SoundTestState({ onDone: () => {}, lab: true, initialSelect: 0, labPlaying: rec });
  back.enter();
  const row = back.tracks.findIndex((r) => r.banger === rec);
  assert(row >= 0 && back.playing === row && Audio.sourceBank === bank && back.statusText().startsWith('NOW PLAYING'),
    'back in the Lab the song plays on, shown as playing');
  let reopened = false;
  back.openClub = () => { reopened = true; };
  back.toggle(row);
  assert(!reopened && back.playing === -1 && !Audio.bank, 'choosing the playing song in the Lab stops it');
}

// ---------------------------------------------------------------- the pending club
{
  const rec = bangerState().kept.at(-1);
  const song = makeBanger(rec);
  const ctx = document.createElement('canvas').getContext('2d');
  let saved = null, discarded = 0;
  const club = new BangerClubState({
    rec, pending: { kind: 'new', song }, onBack: () => {}, onEdit: () => {},
    onSave: (asNew) => { saved = asNew ? 'new' : 'save'; return rec; },
    onDiscard: () => { discarded++; },
  });
  club.enter();
  club.draw(ctx);
  assert(club.boxes.save && club.boxes.edit, 'a pending banger shows the SAVE button beside the pencil');
  assert(club.boxes.save.x > club.boxes.edit.x, 'SAVE sits next to the pencil, to its right');
  tap(club, ...centre(club.boxes.save));
  assert(saved === 'save' && !club.pending && club.popup?.text === 'SAVED', 'the SAVE button keeps the song right here and says SAVED');

  const club2 = new BangerClubState({
    rec, pending: { kind: 'new', song }, onBack: () => {}, onEdit: () => {},
    onSave: () => rec, onDiscard: () => { discarded++; },
  });
  club2.enter();
  club2.back();
  assert(club2.savePrompt && club2.savePrompt.options.map((o) => o.label).join() === "SAVE,DON'T SAVE,CANCEL" && club2.savePrompt.sel === 1,
    'backing out of a new pending banger asks SAVE / DON\'T SAVE / CANCEL, DON\'T SAVE picked first');
  club2.draw(ctx);
  assert(club2.savePrompt, 'the save prompt draws over the room');
  club2.answerSavePrompt(club2.savePrompt.options[club2.savePrompt.sel]);
  assert(discarded === 1, 'DON\'T SAVE discards it');

  const club3 = new BangerClubState({
    rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => {},
    onSave: () => rec, onDiscard: () => {},
  });
  club3.enter();
  club3.back();
  assert(club3.savePrompt && club3.savePrompt.options.map((o) => o.label).join() === "UPDATE,SAVE AS NEW,DON'T SAVE,CANCEL",
    'backing out of an edit asks UPDATE / SAVE AS NEW / DON\'T SAVE / CANCEL');
  assert(club3.savePrompt.options[club3.savePrompt.sel].label === "DON'T SAVE", 'DON\'T SAVE is still the one picked');
  club3.draw(ctx);
  const cancelAt = club3.savePromptLayout();
  assert(cancelAt.x >= 0 && cancelAt.x + cancelAt.w <= 480, 'four answers still fit across the screen');
  tap(club3, ...centre(cancelAt.buttons[3]));
  assert(!club3.savePrompt && club3.pending, 'CANCEL on the way out stays in the club, the song still pending');
  const club4 = new BangerClubState({
    rec, pending: { kind: 'starter', song }, onBack: () => {}, onEdit: () => {},
    onSave: () => rec, onDiscard: () => {},
  });
  club4.enter();
  club4.back();
  assert(club4.savePrompt && club4.savePrompt.options.map((o) => o.label).join() === "SAVE AS NEW,DON'T SAVE,CANCEL",
    'a starter edit only offers SAVE AS NEW, never UPDATE');

  for (const [label, asNew] of [['UPDATE', false], ['SAVE AS NEW', true]]) {
    const savedRec = asNew ? { ...rec, n: rec.n + 100, name: 'A NEW COPY' } : rec;
    let savedAs = null, exitedWith = null;
    const closingClub = new BangerClubState({
      rec, pending: { kind: 'edit', song }, onBack: (r) => { exitedWith = r; }, onEdit: () => {},
      onSave: (newSong) => { savedAs = newSong; return savedRec; }, onDiscard: () => {},
    });
    closingClub.enter();
    closingClub.back();
    assert(closingClub.savePrompt?.closing && exitedWith === null,
      `${label} is offered by Back, which waits for the choice`);
    closingClub.draw(ctx);
    const button = closingClub.savePrompt.options.findIndex((o) => o.label === label);
    tap(closingClub, ...centre(closingClub.savePromptLayout().buttons[button]));
    assert(savedAs === asNew && exitedWith === savedRec && !closingClub.pending && !closingClub.savePrompt,
      `${label} while backing out saves the selected song and exits the club`);
  }

  let edited = false;
  const club5 = new BangerClubState({
    rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => {},
    onSave: () => { edited = true; return rec; }, onDiscard: () => {},
  });
  club5.enter();
  club5.draw(ctx);
  tap(club5, ...centre(club5.boxes.save));
  assert(!edited && club5.savePrompt && club5.savePrompt.options.map((o) => o.label).join() === 'UPDATE,SAVE AS NEW,CANCEL',
    'SAVE on an edit asks UPDATE / SAVE AS NEW / CANCEL rather than overwriting');
  tap(club5, ...centre(club5.savePromptLayout().buttons[2]));
  assert(!club5.savePrompt && !edited && club5.pending,
    'CANCEL just hides the box: the song stays pending and nothing was saved');
  const club6 = new BangerClubState({
    rec, pending: { kind: 'starter', song }, onBack: () => {}, onEdit: () => {},
    onSave: () => { edited = true; return rec; }, onDiscard: () => {},
  });
  club6.enter();
  club6.draw(ctx);
  tap(club6, ...centre(club6.boxes.save));
  assert(!edited && club6.savePrompt && club6.savePrompt.options.map((o) => o.label).join() === 'SAVE AS NEW,CANCEL',
    'and SAVE on a starter edit asks SAVE AS NEW / CANCEL');
}

// ---------------------------------------------------------------- THE PENCIL on the starter
{
  const { STARTERS } = await import('../src/game/banger/starters.js');
  const { songFor } = await import('../src/game/banger/store.js');
  const st = { n: 99, name: 'NEON ORBIT', ...STARTERS['neon-orbit'].recipe, notes: [...STARTERS['neon-orbit'].recipe.notes], preset: 'neon-orbit' };
  const before = bangerState().kept.length;
  let made = null;
  const maker = new BangerMakerState({ from: st, onDone: () => {}, onMade: (r, song) => { made = { r, song }; }, random: () => 0 });
  maker.enter();
  assert(maker.mode === 'advanced' && maker.notes.join() === st.notes.join() && maker.style === 'big-room' && maker.mood === STARTERS['neon-orbit'].recipe.mood,
    'the pencil opens the starter in ADVANCED mode on its riff, style and mood');
  assert(maker.variation === 'some', 'with DNA on Hybrid, what the starter was made with');
  maker.mood = 'heroic';
  maker.make();
  maker.exit();
  const pending = made?.r;
  assert(pending && pending !== st && st.preset === 'neon-orbit' && st.mood === STARTERS['neon-orbit'].recipe.mood && pending.mood === 'heroic' && !pending.preset
    && !bangerState().kept.includes(pending) && bangerState().kept.length === before,
    'editing the starter does not overwrite it or keep anything yet: the preview carries the edit');
  const fresh = keepBanger({ ...pending, fresh: true, name: null });
  assert(fresh && fresh !== st && fresh.name !== st.name && bangerState().kept.at(-1) === fresh && bangerState().kept.length === before + 1
    && songFor(fresh).bank !== STARTERS['neon-orbit'].song().bank,
    'and saving the starter edit keeps a new song under a new name, made by the plain recipe');
}

// ---------------------------------------------------------------- THE BOLT: reroll on the floor
{
  const { rerollRecipe, rerollTake } = await import('../src/game/banger/maker.js');
  const { screen } = await import('../src/engine/renderer.js');
  const rec = bangerState().kept.at(-1);
  const ctx = document.createElement('canvas').getContext('2d');
  // the recipe is RECHARGE's with nothing changed, on a new seed, the flavour kept
  let recharged = null;
  const maker = new BangerMakerState({ from: rec, onDone: () => {}, onMade: (r) => { recharged = r; }, random: () => 0 });
  maker.enter();
  maker.make();
  maker.exit();
  const rolled = rerollRecipe(rec, 12345);
  const same = ['notes', 'lengths', 'mode', 'style', 'mood', 'voltage', 'variation', 'wild', 'energy', 'expression', 'production'];
  const differ = same.filter((k) => JSON.stringify(rolled[k]) !== JSON.stringify(recharged[k]));
  assert(!differ.length && rolled.seed === 12345, `a reroll is RECHARGE with nothing changed, on a new seed (differs: ${differ.join()})`);
  const flavoured = { ...rec, flavour: 'tech' };
  assert(rerollRecipe(flavoured).flavour === 'tech', 'a reroll keeps the flavour the song plays');
  // a kept song comes back pending as an update to itself; a pending new one keeps its name
  const kept = rerollTake(rec, rec);
  assert(kept && kept.rec.n === rec.n && kept.rec.name === rec.name && kept.rec.seed !== rec.seed && kept.song?.bank,
    'rerolling a kept song makes a new take of it, pending, under its own name and number');
  const fresh = rerollTake({ ...rec, n: 0, name: 'FRESH ONE' }, null);
  assert(fresh && fresh.rec.name === 'FRESH ONE', 'rerolling a new banger not kept yet keeps the name it was shown under');

  // the club: the bolt between the pencil and SAVE in landscape; a tap makes it on a later frame, once
  const song = makeBanger(rec);
  const calls = [];
  const club = new BangerClubState({
    rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => {},
    onReroll: (r, p) => { const call = { r, p, room: null }; calls.push(call); return { commit: (room) => { call.room = room; } }; },
    onSave: () => rec, onDiscard: () => {},
  });
  club.enter();
  club.draw(ctx);
  {
    // in landscape too the bolt hangs top right, the back button's mirror image, and the LED board
    // the club sign's: [back][sign] ... [LED][bolt]
    const z = club.boxes.reroll, b = club.boxes.back, led = club.boxes.led, sign = club.boxes.sign;
    const overlaps = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
    assert(z && Math.abs((z.y + z.h / 2) - (b.y + b.h / 2)) < 1 && Math.abs(z.w - b.w) < 1e-6
      && Math.abs((480 - (z.x + z.w)) - b.x) < 1e-6, 'in landscape the bolt sits top right, the back button mirrored');
    assert(Math.abs((480 - (led.x + led.w)) - sign.x) < 1e-6 && Math.abs((led.y + led.h / 2) - (sign.y + sign.h / 2)) < 1e-6,
      'and the LED board mirrors the club sign');
    assert(!overlaps(z, led) && led.x + led.w <= z.x, 'the LED board on the bolt\'s left, clear of it');
    club.openMixer(true); club.draw(ctx);
    const under = club.boxes.reroll;
    club.openMixer(false); club.draw(ctx);
    assert(!under && club.boxes.reroll, 'the open mixer\'s panel lies over that corner: the bolt steps out until it shuts');
    assert(club.boxes.save.x > club.boxes.edit.x && club.boxes.save.x - club.boxes.edit.x < club.boxes.edit.w * 1.5,
      'SAVE sits right beside the pencil');
  }
  assert(club.boxes.save.x + club.boxes.save.w <= club.boxes.transport[0].x, 'and SAVE still clears the transport');
  const step = (c, n) => { for (let k = 0; k < n; k++) { c.update(1 / 60); Input.endFrame(); } };
  tap(club, ...centre(club.boxes.reroll));
  assert(calls.length === 0 && club.spinV >= 10 && club.mirrorFlashAt === club.t,
    'the press is answered at once - the ball kicked faster and flaring - before the make\'s frame');
  {
    const tips = [], drawTip = club.drawTip;
    club.drawTip = (c, box, text, o) => { tips.push({ box, text, dots: o?.dots }); return drawTip.call(club, c, box, text, o); };
    club.draw(ctx);
    club.drawTip = drawTip;
    assert(tips.some((tp) => tp.box === club.boxes.reroll && tp.text === 'CHARGING' && tp.dots),
      '...and the bolt says it is on it, from the press: CHARGING...');
  }
  step(club, 1);
  club.draw(ctx);
  assert(calls.length === 1 && calls[0].r === rec && calls[0].p === club.pending && !calls[0].room && club.strikeTargets.length >= 3,
    'the take is made on the charge\'s first frame, its arcs\' targets picked, nothing swapped yet');
  const spin0 = club.spinV;
  step(club, Math.floor(club.rerolling * 0.6));
  club.draw(ctx);
  assert(!calls[0].room && club.spinV > spin0 + 5, 'the mirror ball spins up');
  const flashBefore = club.mirrorFlashAt;
  step(club, club.rerolling - 2);
  club.draw(ctx);
  assert(!calls[0].room && club.mirrorFlashAt > flashBefore && club.spinV > 20, 'then discharges - the ball flares, the arcs out - still spinning hard');
  step(club, 2);
  assert(calls[0].room?.formationOrder?.length, 'and under the flash the new take swaps in, handed the room as the pencil does');
  const targets = calls[0].room.strike?.targets;
  assert(calls[0].room.strike.spin > 20, '...and the spin, so the ball spins down in the new take\'s club');
  assert(targets?.length >= 3 && targets.length <= 5 && targets.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    '...marked with where the arcs landed, so it comes up under them');
  {
    const spots = new Set();
    for (let k = 0; k < 8; k++) spots.add(club.pickStrikeTargets().map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
    assert(spots.size === 8, 'the arcs land somewhere different each time');
  }
  {
    const struck = new BangerClubState({ rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => {}, onReroll: () => true,
      room: calls[0].room });
    struck.enter();
    assert(struck.spinV === calls[0].room.strike.spin, 'the new club\'s ball carries the spin on');
    struck.update(1 / 60); Input.endFrame();
    const tips = [], drawTip = struck.drawTip;
    struck.drawTip = (c, box, text, o) => { tips.push({ box, text }); return drawTip.call(struck, c, box, text, o); };
    struck.draw(ctx);
    assert(struck.shownAt != null && struck.titleAt === -Infinity && struck.strikeAt === 0 && struck.strikeTargets === targets && struck.mirrorFlashAt === 0,
      'the struck club comes up with the flash fading off it, and no NOW PLAYING card');
    assert(struck.strikeDone && tips.some((tp) => tp.box === struck.boxes.reroll && tp.text === struck.strikeDone),
      `...and the bolt says it is done: ${struck.strikeDone}`);
    for (let k = 0; k < 120; k++) { struck.update(1 / 60); Input.endFrame(); }
    tips.length = 0;
    struck.draw(ctx);
    struck.drawTip = drawTip;
    assert(!tips.some((tp) => tp.text === struck.strikeDone), '...for a moment, then it goes');
    const again = new BangerClubState({ rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => {}, onReroll: () => true,
      room: calls[0].room });
    again.enter();
    assert(again.strikeDone && again.strikeDone !== struck.strikeDone, 'and the next take\'s line is a different one');
  }
  tap(club, ...centre(club.boxes.reroll));
  step(club, 200);
  assert(calls.length === 1, 'a second tap while it goes makes nothing more');
  const failing = new BangerClubState({ rec, onBack: () => {}, onEdit: () => {}, onReroll: () => null });
  failing.enter();
  failing.reroll();
  step(failing, 1);
  assert(failing.popup?.text.includes('WOULD NOT MAKE') && !failing.rerolling && !failing.rerolled, 'a take that would not make says so at once, and the bolt works again');
  {
    // the pencil, SAVE and back wait while it goes
    let edits = 0;
    const busy = new BangerClubState({ rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => { edits++; }, onSave: () => rec,
      onReroll: () => ({ commit: () => {} }) });
    busy.enter();
    busy.reroll();
    step(busy, 5);
    busy.edit(); busy.back(); busy.savePressed();
    assert(!edits && !busy.savePrompt, 'the pencil, back and SAVE wait while the bolt goes');
  }
  {
    // on the glass it asks first: one tap arms it and says so, a second (not a bounce) lets it go
    const real = Input.usingTouch;
    Input.usingTouch = true;
    try {
      let made = 0;
      const glass = new BangerClubState({ rec, onBack: () => {}, onEdit: () => {}, onReroll: () => { made++; return { commit: () => {} }; } });
      glass.enter();
      glass.draw(ctx);
      tap(glass, ...centre(glass.boxes.reroll));
      step(glass, 2);
      assert(!made && !glass.rerolling && glass.rerollArmed(), 'on the glass the first tap only arms the bolt');
      tap(glass, ...centre(glass.boxes.reroll));
      assert(!glass.rerolling, 'a second tap straight after is a bounce, not a yes');
      step(glass, 20);
      tap(glass, ...centre(glass.boxes.reroll));
      step(glass, 1);
      assert(made === 1 && glass.rerolling > 0, 'a second tap makes the new take');
      const other = new BangerClubState({ rec, onBack: () => {}, onEdit: () => {}, onReroll: () => { made++; return { commit: () => {} }; } });
      other.enter();
      other.draw(ctx);
      tap(other, ...centre(other.boxes.reroll));
      tap(other, 240, 60);
      assert(!other.rerollArmed(), 'a tap anywhere else stands it down');
      tap(other, ...centre(other.boxes.reroll));
      step(other, 60 * 3 + 5);
      assert(!other.rerollArmed(), 'and it stands down by itself after a while');
    } finally {
      Input.usingTouch = real;
    }
  }
  {
    // on a mouse the bottom row has tooltips, after a moment's hover
    const hover = new BangerClubState({ rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => {}, onSave: () => rec,
      onReroll: () => ({ commit: () => {} }) });
    hover.enter();
    hover.draw(ctx);
    const seen = [];
    for (const key of ['edit', 'reroll', 'save', 'mixer']) {
      Input.pointer = { x: centre(hover.boxes[key])[0], y: centre(hover.boxes[key])[1], down: false };
      step(hover, 30);
      seen.push(hover.tip?.key === key && hover.tipText(key));
    }
    Input.pointer = { x: centre(hover.boxes.transport[1])[0], y: centre(hover.boxes.transport[1])[1], down: false };
    step(hover, 30);
    seen.push(hover.tip?.key === 'transport1' && hover.tipText('transport1'));
    hover.draw(ctx);
    assert(seen.join() === 'EDIT RIFF / STYLE,NEW TAKE,SAVE,MIXER,PAUSE', `the bottom row's tooltips say what each button does (${seen.join()})`);
    Input.pointer = { x: 240, y: 135, down: false };
    step(hover, 1);
    assert(!hover.tip, 'and go when the pointer leaves');
  }
  {
    // the whole strike draws, charge to burst, and the burst over the new take
    const c = new BangerClubState({ rec, onBack: () => {}, onEdit: () => {}, onReroll: () => ({ commit: () => {} }) });
    c.enter();
    c.draw(ctx);
    c.reroll();
    const frames = c.rerolling;
    while (c.rerolling > 0) { step(c, 1); c.draw(ctx); }
    for (const since of [0.05, 0.15, 0.3, 0.6]) { c.rerolled = false; c.strikeAt = c.t - since; c.draw(ctx); }
    assert(frames >= 100, `the ball spins up and charges for a good while before it bursts (${frames} frames)`);
  }
  {
    // with a song playing THE BOLT goes on the beat: it bursts on a bar's last beat at least two
    // seconds off, and the new take is booked to start on the bar line after it
    const c = new BangerClubState({ rec, onBack: () => {}, onEdit: () => {}, onReroll: () => ({ commit: () => {} }) });
    c.enter();
    const keys = ['ctx', 'bank', 'nextTime', 'step', 'bpm', 'tempo', 'heardLatencySec'];
    const real = Object.fromEntries(keys.map((k) => [k, Audio[k]]));
    let plans;
    try {
      Object.assign(Audio, { ctx: { currentTime: 10 }, bank: real.bank || {}, nextTime: 10.05, step: 6, bpm: 120, tempo: 1, heardLatencySec: () => 0.02 });
      plans = [6, 9, 15].map((st) => { Audio.step = st; return { ...c.strikePlan(), st }; });
    } finally { Object.assign(Audio, real); }
    // in sixteenths from the song's step 0, on the grid the sequencer is writing
    const spb = 60 / 120 / 4, grid = (t, st) => Math.round((t - (10.05 - st * spb)) / spb * 1e6) / 1e6;
    assert(plans.every((p) => p.downbeat && grid(p.downbeat, p.st) % 16 === 0 && grid(p.discharge, p.st) % 4 === 0
      && p.downbeat - p.discharge >= 0.5 - 1e-9 && p.discharge - 9.98 >= 2 && p.discharge - 9.98 < 2 + 2.5 && Math.abs(p.frames - (p.discharge - 9.98) * 60) <= 1),
    'THE BOLT bursts on the beat, a beat or more before the bar line the new take starts on, the charge stretched to reach it');
  }
  const plain = new BangerClubState({ rec, onBack: () => {}, onEdit: () => {} });
  plain.enter();
  plain.draw(ctx);
  assert(!plain.boxes.reroll, 'no bolt without a reroll to do');

  // in portrait the bolt hangs top right as well, level with back, clear of the LED board below it
  const mode = screen.presentationMode;
  screen.presentationMode = 'phone-portrait';
  try {
    const tall = new BangerClubState({ rec, pending: { kind: 'edit', song }, onBack: () => {}, onEdit: () => {}, onReroll: () => true, onSave: () => rec });
    tall.enter();
    tall.draw(ctx);
    const z = tall.boxes.reroll, b = tall.boxes.back, led = tall.boxes.led, sign = tall.boxes.sign;
    const overlaps = (a, c) => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
    assert(z && Math.abs((z.y + z.h / 2) - (b.y + b.h / 2)) < 1 && z.x > b.x && z.x + z.w <= 480,
      'in portrait the bolt sits top right, level with the back button');
    assert(!overlaps(z, led) && !overlaps(z, sign), 'clear of the club sign and the LED board');
    assert(tall.boxes.save.x + tall.boxes.save.w <= tall.boxes.transport[0].x, 'and the bottom row is as it was');
    // the bottom row is seven even slots, pencil to mixer, one spare between SAVE and the transport
    const mid = (bx) => bx.x + bx.w / 2;
    const row = [tall.boxes.edit, tall.boxes.save, null, ...tall.boxes.transport, tall.boxes.mixer];
    const slot = (mid(tall.boxes.mixer) - mid(tall.boxes.edit)) / 6;
    assert(row.every((bx, i) => !bx || Math.abs(mid(bx) - (mid(tall.boxes.edit) + i * slot)) < 1e-6),
      'in portrait the bottom row sits on seven even slots, room for one more button');
    assert(row.filter(Boolean).every((bx, i, a) => i === 0 || a[i - 1].x + a[i - 1].w <= bx.x + 1e-6), 'its tap boxes never overlap');
    tall.exit?.();
  } finally {
    screen.presentationMode = mode;
  }
  Audio.setBank(null);
}

// ---------------------------------------------------------------- THE PENCIL: edit and remake
{
  const rec = bangerState().kept.at(-1);
  const { name, n } = rec;
  const count = bangerState().kept.length;
  const draftBefore = JSON.stringify(bangerState().draft);
  let made = null;
  let remadeWithRecharge = false;
  const maker = new BangerMakerState({ from: rec, onDone: () => {}, onMade: (r, song, from, recharging) => { made = r; remadeWithRecharge = recharging; }, random: () => 0 });
  maker.enter();
  assert(maker.style === rec.style && maker.mood === rec.mood && maker.mode === rec.mode && maker.notes.join() === rec.notes.join(),
    'the pencil opens the grid on the song\'s own riff, style and mood');
  assert(maker.actionWord() === 'RECHARGE', 'editing a kept banger remakes it with RECHARGE');
  const pendingSeed = { ...rec, n: rec.n + 1, name: `${rec.name} PENDING` };
  let pendingRechargeFlag = false;
  const pendingMaker = new BangerMakerState({
    seed: pendingSeed, onDone: () => {}, onMade: (r, song, from, recharging) => { pendingRechargeFlag = recharging; }, random: () => 0,
  });
  pendingMaker.enter();
  assert(!pendingMaker.from && pendingMaker.actionWord() === 'RECHARGE',
    'the pencil on a not-yet-saved preview also says RECHARGE');
  pendingMaker.make();
  assert(pendingRechargeFlag === true, 'a pencil recharge is marked so it skips the birth animation');
  pendingMaker.exit();
  assert(JSON.stringify(bangerState().draft) === draftBefore,
    'recharging a pending preview leaves the NEW BANGER draft alone');
  const other = ['trance', 'dnb', 'electro'].find((id) => id !== rec.style);
  maker.style = other;
  delete rec.expression;                              // a recipe saved before expression existed
  maker.make();
  maker.exit();
  assert(made !== rec && remadeWithRecharge === true && rec.style !== other && made.style === other && rec.name === name && rec.n === n && bangerState().kept.length === count,
    'RECHARGE previews the edit in place of keeping it: the original is untouched, the pending carries the new style');
  const revised = reviseBanger(rec, made);
  assert(revised === rec && rec.style === other && rec.name === name && rec.n === n && bangerState().kept.length === count,
    'and saving the edit remakes that song in place: same name and number, the new style, no new song');
  assert(rec.expression === 4, 'and an old recipe edited with the pencil opts into expression version 4');
  assert(JSON.stringify(bangerState().draft) === draftBefore, 'editing a song leaves the NEW BANGER draft alone');
}

// ---------------------------------------------------------------- IT'S ALIVE!
{
  const { BangerBirthState, FLASH_AT, BIRTH_S, SWITCH_AT } = await import('../src/game/banger/birth.js');
  const rec = bangerState().kept.at(-1);
  let opened = 0;
  const birth = new BangerBirthState({ rec, onDone: () => { opened++; } });
  birth.enter();
  {
    // Gary holds the switch up through the steps and has it thrown on the flash
    birth.t = 0; const up = birth.switchAngle();
    birth.t = SWITCH_AT; const down = birth.switchAngle();
    birth.t = SWITCH_AT - 0.1; const mid = birth.switchAngle();
    assert(up < 0 && down > 0 && mid > up && mid < down && SWITCH_AT < FLASH_AT - 1, 'Gary throws the switch first, and that starts it all');
    birth.t = 0;
  }
  const ctx = document.createElement('canvas').getContext('2d');
  for (let k = 0; k < Math.ceil(FLASH_AT * 60) - 2; k++) { birth.update(1 / 60); if (k % 10 === 0) birth.draw(ctx); }
  assert(!birth.flashed && birth.step === 3 && opened === 0, 'BRING TO LIFE ticks through its four steps before the lightning');
  for (let k = 0; k < 6; k++) birth.update(1 / 60);
  birth.draw(ctx);
  assert(birth.flashed && opened === 0, "then the flash: IT'S ALIVE!");
  for (let k = 0; k < Math.ceil((BIRTH_S - FLASH_AT) * 60) + 2; k++) birth.update(1 / 60);
  assert(opened === 1, 'and the club opens on its own');
  const skip = new BangerBirthState({ rec, onDone: () => { opened++; } });
  skip.enter();
  tap(skip, 10, 10);
  assert(skip.t >= FLASH_AT && opened === 1, 'a tap skips straight to the flash');
  tap(skip, 10, 10);
  assert(opened === 2, 'and another goes on into the club');
}

{
  // The lock screen's next in the Lab: a song carried on from the club, then the next of the
  // player's own, played in the list.
  const list = new SoundTestState({ onDone: () => {}, lab: true });
  list.enter();
  const first = list.tracks[0];
  Audio.setBank(first.bank, first.mix, first.arrangement);
  const carried = new SoundTestState({ onDone: () => {}, lab: true, labPlaying: first.banger });
  carried.enter();
  assert(carried.tracks.length > 1 && carried.playing === 0 && carried.nowPlaying()?.album === 'THE LAB'
    && carried.nowPlaying().title === first.name && carried.nowPlaying().skips,
    'a song carried on into THE LAB is named in full on the lock screen, with previous/next');
  const before = Audio.sourceBank;
  carried.mediaSkip(1);
  const next = carried.tracks[1];
  assert(carried.playing === 1 && carried.idx === 1 && carried.labPlaying === next.banger
    && lastPlayedBanger() === next.banger && Audio.sourceBank && Audio.sourceBank !== before
    && carried.statusText() === `NOW PLAYING: ${next.name}`,
    'next plays the next of their songs in the list, the cursor with it');
  carried.exit();
}

if (failed) { console.error('JUKEBOX BANGER: FAILED'); process.exit(1); }
console.log('JUKEBOX BANGER: PASSED');
