// GENER8 on the jukebox (src/game/banger/): the riff grid, the generator as the
// game calls it, what the save keeps, the maker screen, and the jukebox rows.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { save } = await import('../src/engine/save.js');
const { Audio } = await import('../src/engine/audio.js');
const riffMod = await import('../src/game/banger/riff.js');
const {
  RIFF_MODES, DEFAULT_SIMPLE, rowHz, rowName, toggleNote, riffFromNotes, normaliseNotes, simplify, expand,
  upgradeDraft, upgradeRecipeNotes, luckyNotes, hasNotes,
} = riffMod;
const DEFAULT_NOTES = DEFAULT_SIMPLE;
const { MAKER_STYLES, MAKER_MOODS, makeBanger, defaultMoodFor, hookSoundFor, RIFF_TRIM_DB, tapeStopFor, TAPE_STOP_CHANCE,
  spotFor, INTRO_LOWPASS_CHANCE, INTRO_BITCRUSH_CHANCE, UNDERWATER_CHANCE } = await import('../src/game/banger/make.js');
const { BANGER_STYLES } = await import('../tools/lib/banger/styles/index.js');
const { generateBanger } = await import('../tools/lib/banger/index.js');
const {
  bangerState, keepBanger, reviseBanger, saveDraft, bangerRow, MAX_KEPT, deleteBanger, lastPlayedBanger,
} = await import('../src/game/banger/store.js');
const { BangerMakerState, RIFF_VOICES } = await import('../src/game/banger/maker.js');
const { BANGER_VOLTAGES, voltageSettings } = await import('../src/game/banger/voltage.js');
const { SoundTestState, JUKEBOX } = await import('../src/game/menus.js');
const { BangerClubState, LED_COLS } = await import('../src/game/banger/club.js');
const { HERO_MOVES, PARTS, partOf, kikoPlan, moveSeconds, holdChain, landingFor } = await import('../src/game/banger/club-fx.js');

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
    && maker.voltage === 1, 'the maker opens on the four-step Voltage selector at Charged');
  assert(L.pickers.length === 4 && !('voltageBox' in L), 'Formula, Element, Voltage and DNA share one selector row');
  assert(!('wildBox' in L) && !('energyBox' in L) && !('effectsBox' in L), 'Go Wild, Energy and Track Effects are merged');
  const chooseVoltage = (level) => {
    const control = L.pickers[2];
    tap(maker, control.x + control.w / 2, control.y + control.h / 2);
    const { cells } = maker.chooserLayout(maker.layout());
    assert(maker.chooser?.picker === 2 && cells.length === BANGER_VOLTAGES.length, 'Voltage opens the same choice list as Formula and Element');
    tap(maker, cells[level].x + cells[level].w / 2, cells[level].y + cells[level].h / 2);
  };
  assert(maker.variation === 'some', 'DNA starts on Hybrid, not Pure');
  maker.setVariation('nonsense');
  assert(maker.variation === 'some', 'an unreadable DNA setting reads as Hybrid');
  chooseVoltage(0);
  assert(maker.voltage === 0 && maker.energy === 'lean' && maker.trackEffects === 'style' && maker.variation === 'some', 'Safe keeps the formula intact, and leaves DNA where it was');
  chooseVoltage(2);
  assert(maker.voltage === 2 && maker.energy === 'huge' && maker.trackEffects === 'adventurous' && maker.variation === 'some', 'Surge maps to high energy and bold FX, and leaves the riff\'s notes alone');
  chooseVoltage(3);
  assert(maker.voltage === 3 && maker.wild && maker.energy === 'maximum' && maker.trackEffects === 'overhaul' && maker.variation === 'some', 'Overload maps to maximum energy and full FX — DNA is its own picker');
  {
    const control = L.pickers[3];
    tap(maker, control.x + control.w / 2, control.y + control.h / 2);
    const { cells } = maker.chooserLayout(maker.layout());
    assert(maker.chooser?.picker === 3 && cells.length === 3, 'DNA opens Pure, Hybrid and Mutant');
    tap(maker, cells[1].x + cells[1].w / 2, cells[1].y + cells[1].h / 2);
    assert(maker.variation === 'some' && maker.voltage === 3 && maker.energy === 'maximum', 'choosing a DNA leaves the Voltage as it was');
    tap(maker, control.x + control.w * 0.1, control.y + control.h / 2);
    assert(maker.variation === 'faithful', 'and its left arrow steps back to Pure');
  }
  chooseVoltage(1);
  assert(maker.voltage === 1 && !maker.wild && maker.energy === 'full' && maker.trackEffects === 'subtle', 'Charged maps to medium energy and subtle FX');
  assert(maker.mode === 'simple' && maker.rows === 11 && maker.steps === 16, 'the maker opens in SIMPLE');
  assert(maker.actionWord() === 'BRING TO LIFE', 'a new banger is made with BRING TO LIFE');
  {
    // the middle of MOOD opens every mood at once; a tap on one picks it and closes
    const moodBox = L.pickers[1];
    const before = maker.mood;
    tap(maker, moodBox.x + moodBox.w / 2, moodBox.y + moodBox.h / 2);
    assert(maker.chooser?.picker === 1 && maker.chooser.items.length === MAKER_MOODS.length, 'the middle of MOOD opens every mood at once');
    const { cells } = maker.chooserLayout(maker.layout());
    const pick = MAKER_MOODS.findIndex((m) => m.id !== before);
    maker.draw(document.createElement('canvas').getContext('2d'));
    tap(maker, cells[pick].x + cells[pick].w / 2, cells[pick].y + cells[pick].h / 2);
    assert(!maker.chooser && maker.mood === MAKER_MOODS[pick].id, 'and a tap on one picks it and closes');
    tap(maker, moodBox.x + moodBox.w - 3, moodBox.y + moodBox.h / 2);
    assert(!maker.chooser && maker.mood === MAKER_MOODS[(pick + 1) % MAKER_MOODS.length].id, 'the arrow at the end still steps');
    maker.mood = before;
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
    // Landscape shows the A-to-A window at the old size and scrolls for G4 and the top B and C.
    assert(maker.visibleRows === 8 && L.grid.visible === 8 && maker.scrollRow === 2,
      'landscape shows eight rows, A4 to A5, at the size they always were');
    Input.wheelY = -WHEEL_ROWS(2);
    maker.update(1 / 60); Input.endFrame();
    assert(maker.scrollRow === 0, 'the wheel scrolls up to C6');
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + L.grid.cellH / 2);
    assert(maker.notes[2] === 10, 'and the top square is C6 now');
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + L.grid.cellH / 2);
    // drag the note names up: the grid follows, down to G4
    const nx = L.grid.labelX + 4;
    Input.pointer = { x: nx, y: L.grid.y + L.grid.cellH, down: true };
    Input.press('pointer'); maker.update(1 / 60); Input.release('pointer'); Input.endFrame();
    Input.pointer.y -= L.grid.cellH * 3; maker.update(1 / 60); Input.endFrame();
    assert(maker.scrollRow === 3 && maker.notes[0] >= 0, 'dragging the note names scrolls the grid, writing nothing');
    Input.pointer.down = false; maker.update(1 / 60); Input.endFrame();
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + 7.5 * L.grid.cellH);
    assert(maker.notes[2] === 0, 'the bottom square is G4 now');
    tap(maker, L.grid.x + L.grid.cellW * 2.5, L.grid.y + 7.5 * L.grid.cellH);
    maker.focus = { area: 'grid', col: 0, row: 3, picker: 0, button: 3 };
    frame(maker, 'up');
    assert(maker.focus.row === 2 && maker.scrollRow === 2, 'the focus walking off the top scrolls one row');
    maker.focus = { area: 'mode', col: 0, row: 0, picker: 0, button: 3 };
    frame(maker, 'down');
    assert(maker.focus.area === 'grid' && maker.focus.row === 2, 'down from SIMPLE / ADVANCED lands on the top row on show');
  }
  // Tap the top-left square: A5 at step 0.
  tap(maker, L.grid.x + L.grid.cellW / 2, L.grid.y + L.grid.cellH / 2);
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
  assert(maker.mode === 'simple' && maker.notes.join() === simplify(remembered).join(),
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
  tap(maker, L.pickers[1].x + L.pickers[1].w - 4, L.pickers[1].y + L.pickers[1].h / 2);
  assert(maker.mood !== mood0, 'tapping the MOOD picker moves to the next mood');

  // From the grid's bottom row, down reaches the selector in the same column;
  // up from the top row reaches the mode switch.
  maker.focus = { area: 'grid', col: maker.steps - 1, row: maker.rows - 1, picker: 0, button: 3 };
  frame(maker, 'down');
  assert(maker.focus.area === 'picker' && maker.focus.picker === 3, 'down from the grid reaches DNA in the same selector row');
  frame(maker, 'right'); frame(maker, 'right'); frame(maker, 'right');
  assert(maker.variation === 'wild', 'left and right step DNA, stopping at Mutant');
  maker.focus.picker = 2;
  const v1 = maker.voltage;
  frame(maker, 'right');
  assert(maker.voltage !== v1, 'left and right turn the Voltage selector');
  frame(maker, 'right');
  assert(maker.voltage === 3, 'left and right step through voltage levels');
  frame(maker, 'down');
  assert(maker.focus.area === 'button', 'down from the selectors reaches the action buttons');
  maker.focus = { area: 'grid', col: 2, row: 0, picker: 0, button: 3 };
  frame(maker, 'up');
  frame(maker, 'right');
  assert(maker.focus.area === 'mode' && maker.mode === 'advanced', 'up from the top row reaches SIMPLE / ADVANCED, and right picks ADVANCED');
  frame(maker, 'left');
  assert(maker.mode === 'simple', 'left picks SIMPLE');

  tap(maker, ...centre(L.buttons[0]));
  assert(maker.notes.every((n) => n < 0), 'CLEAR empties the grid');
  {
    const was = { style: maker.style, mood: maker.mood, voltage: maker.voltage, variation: maker.variation };
    const notes = maker.notes.join();
    let styles = 0, moods = 0;
    const voltages = new Set(), dnas = new Set();
    for (let k = 0; k < 40; k++) {
      const before = { style: maker.style, mood: maker.mood };
      tap(maker, ...centre(L.buttons[2]));
      if (maker.style !== before.style) styles++;
      if (maker.mood !== before.mood) moods++;
      voltages.add(maker.voltage); dnas.add(maker.variation);
    }
    assert(styles === 40 && moods === 40 && voltages.size === BANGER_VOLTAGES.length && dnas.size === 3
      && maker.energy === voltageSettings(maker.voltage).energy && maker.notes.join() === notes,
    'EXPERIMENT picks a new formula and element every time, any voltage and DNA, and leaves the notes alone');
    maker.setStyle(was.style); maker.mood = was.mood; maker.setVoltage(was.voltage, false); maker.setVariation(was.variation);
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
  assert(kept.expression === 3 && JSON.stringify(makeBanger(kept).mix) === JSON.stringify(made.song.mix),
    'a new recipe opts into expression version 3 (Go Wild\'s slide on the lead, the voltage rolls), and made again from the kept recipe it is the song just handed over');

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
  const club = new BangerClubState({ rec, onBack: () => { backs++; }, onEdit: (r) => { edited = r; } });
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
  const h = club.boxes.heroes[4];
  tap(club, h.x + h.w / 2, h.y + h.h / 2);
  assert(club.queued?.i === 4 && !club.acting, 'a tap on a hero queues their move for the next beat');
  for (let k = 0; k < 120 && !club.acting; k++) club.update(1 / 60);
  assert(club.acting?.i === 4 && club.caption?.i === 4, 'and on the beat they do it, their name and move on screen');
  club.draw(ctx);
  // A held move: in while the hero is held, out when let go. B-33P's 8-bit is one.
  // (a hero's box follows them, so let the walk-in finish before aiming at one)
  club.shownAt = club.t - 30; club.draw(ctx);
  const hb = club.boxes.heroes[1];
  Input.pointer = { x: hb.x + hb.w / 2, y: hb.y + hb.h / 2, down: true };
  Input.press('pointer');
  club.update(1 / 60);
  Input.endFrame();
  for (let k = 0; k < 30; k++) club.update(1 / 60);
  assert(HERO_MOVES[1].hold && club.holding?.i === 1 && club.acting?.i === 1 && club.acting.dur === Infinity,
    '8-BIT is a held move: it stays in for as long as B-33P is held');
  Input.release('pointer');
  Input.pointer.down = false;
  club.update(1 / 60);
  Input.endFrame();
  assert(!club.holding && Number.isFinite(club.acting?.dur ?? 0), 'and comes out when he is let go');
  // A tap on a held move: it still plays for half a bar.
  const g1 = club.boxes.heroes[2];                 // Ramon: a hold
  tap(club, g1.x + g1.w / 2, g1.y + g1.h / 2);
  club.update(1 / 60);
  const q = club.acting?.i === 2 ? club.acting : club.queued;
  assert(q?.i === 2 && !club.holding && Math.abs(q.dur - q.bar / 2) < 1e-6, 'a held move only tapped still plays for half a bar');
  assert(HERO_MOVES.slice(0, 4).every((m) => m.hold) && HERO_MOVES.slice(4).every((m) => !m.hold),
    'the holds come first, so they stand on the left; the one-shots on the right');
  assert(HERO_MOVES.filter((m) => m.hold).map((m) => m.hero).join() === 'lorenzo,b33p,ramon,grumpos',
    'Underwater, 8-bit, Rocket Fist and Flex are held; the rest are triggers');
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
  tap(club, 5, 5);
  assert(!club.mixerOpen, 'a tap outside the panel closes it');
  // The dancing: one hero at a time joins in, each on one of their own eight dances (and
  // Lorenzo's occasional moonwalk), and a change always picks a different one.
  club.dancers.forEach((d, k) => { d.move = null; d.joinAt = club.t + 0.05 + k * 0.1; d.changeAt = Infinity; });
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
  // Kiko's tape stop: on the 4, a beat; on the 2, two beats — one long stop or two short.
  {
    const kikoMove = HERO_MOVES.find((m) => m.hero === 'kiko');
    const four = kikoPlan({ step: 12 }), longTwo = kikoPlan({ step: 20 }, () => 0.2), twoTwos = kikoPlan({ step: 4 }, () => 0.8);
    assert(kikoMove.onTwoOrFour && four.beats === 1 && four.hits === 1
      && longTwo.beats === 2 && longTwo.hits === 1 && twoTwos.beats === 2 && twoTwos.hits === 2
      && moveSeconds(kikoMove, 0.1, longTwo) === 0.8 && moveSeconds(kikoMove, 0.1, four) === 0.4,
    'Kiko stops the tape on the 2 or the 4: a beat on the 4; on the 2, half a bar, one stop or two');
  }
  // Ramon's stutter comes in four lengths; Fernwick's riser in one, two or four bars
  {
    const ramon = HERO_MOVES.find((m) => m.hero === 'ramon');
    const slices = new Set([0, 0.3, 0.6, 0.9].map((r) => holdChain(ramon, () => r)[0].params.slice));
    const fern = HERO_MOVES.find((m) => m.hero === 'fernwick');
    assert(slices.size === 4 && [...slices].every((x) => [1, 0.5, 0.25, 0.125].includes(x)),
      'Ramon\'s stutter is quarters, eighths, sixteenths or thirty-seconds, a different one each press');
    assert(fern.barChoices.join() === '1,2,4' && moveSeconds(fern, 0.1, { bars: 4 }) === 6.4 && moveSeconds(fern, 0.1, { bars: 1 }) === 1.6,
      'Fernwick\'s riser runs one, two or four bars');
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
  for (let k = 0; k < 80; k++) { club.update(1 / 10); club.draw(ctx); }
  assert(!club.moments.some(m => [...CLUB_MOMENTS, 'smoke'].includes(m.kind)), 'the crowd moments (beach ball, confetti, glow sticks, the smoke machine) play and clear');
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
    club.t += 6; club.update(1 / 60);
    assert(!club.moments.some(m => m.ribbons), 'streamers clear after their burst');
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
    tap(club, ledX, ledY); tap(club, ledX, ledY);
    const bpmText = `${Math.round(club.song.bpm || 120)} BPM`;
    assert(club.lastLedTap === -Infinity && club.led?.text === bpmText && club.popup === null && seeks.length === 0,
      'double-clicking the red LED board shows the current track BPM and does not skip');
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
  // a tap on the mirror ball brings up the song's title for a while
  club.showTitle();
  const t0 = club.t;
  club.t = t0 + 2; club.draw(ctx);
  assert(club.titleAt === t0, 'tapping the mirror ball shows the title');
  club.t = t0 + 2.5; club.showTitle();
  assert(club.titleAt < t0 + 2.5, 'tapped again while up, the title stays up');
  club.t = t0;
  assert(backs === 1, 'BACK goes back to the Lab');
  const bank = Audio.bank;
  club.exit();
  assert(bank && Audio.bank === bank, 'leaving the club leaves the song playing');
  // back in the Lab it plays on, its row lit; choosing it again stops it
  const back = new SoundTestState({ onDone: () => {}, lab: true, initialSelect: 0, labPlaying: rec });
  back.enter();
  const row = back.tracks.findIndex((r) => r.banger === rec);
  assert(row >= 0 && back.playing === row && Audio.bank === bank && back.statusText().startsWith('NOW PLAYING'),
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
  assert(club2.savePrompt && club2.savePrompt.options.length === 2 && club2.savePrompt.sel === 1,
    'backing out of a new pending banger asks SAVE / DON\'T SAVE, DON\'T SAVE picked first');
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
  assert(club3.savePrompt && club3.savePrompt.options.map((o) => o.label).join() === "UPDATE,SAVE AS NEW,DON'T SAVE",
    'backing out of an edit asks UPDATE / SAVE AS NEW / DON\'T SAVE');
  const club4 = new BangerClubState({
    rec, pending: { kind: 'starter', song }, onBack: () => {}, onEdit: () => {},
    onSave: () => rec, onDiscard: () => {},
  });
  club4.enter();
  club4.back();
  assert(club4.savePrompt && club4.savePrompt.options.map((o) => o.label).join() === "SAVE AS NEW,DON'T SAVE",
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
  assert(rec.expression === 3, 'and an old recipe edited with the pencil opts into expression version 3');
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

if (failed) { console.error('JUKEBOX BANGER: FAILED'); process.exit(1); }
console.log('JUKEBOX BANGER: PASSED');
