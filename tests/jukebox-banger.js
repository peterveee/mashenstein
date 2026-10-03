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
const { generateBanger } = await import('../tools/lib/banger/index.js');
const { bangerState, keepBanger, saveDraft, bangerRow, MAX_KEPT, deleteBanger } = await import('../src/game/banger/store.js');
const { BangerMakerState, RIFF_VOICES } = await import('../src/game/banger/maker.js');
const { SoundTestState, JUKEBOX } = await import('../src/game/menus.js');
const { BangerClubState } = await import('../src/game/banger/club.js');
const { HERO_MOVES, PARTS, partOf, kikoPlan, moveSeconds, holdChain, landingFor } = await import('../src/game/banger/club-fx.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---------------------------------------------------------------- the grid
{
  const S = RIFF_MODES.simple; const A = RIFF_MODES.advanced;
  assert(S.steps === 16 && S.semis.length === 8 && S.len === 2, 'SIMPLE is eighth notes on the eight notes of A minor');
  assert(A.steps === 32 && A.semis.length === 13 && A.len === 1, 'ADVANCED is sixteenth notes on all thirteen semitones');
  assert(Math.abs(rowHz('advanced', 0) - 440) < 1e-9 && Math.abs(rowHz('advanced', 12) - 880) < 1e-9
    && Math.abs(rowHz('simple', 7) - 880) < 1e-9 && rowName('advanced', 1) === 'A#' && rowName('simple', 1) === 'B',
  'both span A4 to A5');
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
  const adv = riffFromNotes([0, 1, -1, 4], 'simpleSquare', 'advanced').parts[0].bars[0].split(' ');
  assert(adv[0] === 'A4:1' && adv[1] === 'A#4:1' && adv[3] === 'C#5:1', 'an ADVANCED step is a sixteenth, sharps included');
}
{
  // ADVANCED → SIMPLE: first note in each eighth, to the nearest scale note (a tie goes down).
  const adv = normaliseNotes(null, 'advanced');
  adv[0] = 0; adv[1] = 5;          // A then D in the first eighth: A wins
  adv[3] = 4;                       // C# on the off-sixteenth of the second eighth → C (tie goes down)
  adv[4] = 9;                       // F# → F
  const simple = simplify(adv);
  assert(simple[0] === 0 && simple[1] === 2 && simple[2] === 5 && simple.length === 16,
    'converting down keeps the first note of each eighth, moved to the nearest scale note');
  const up = expand(simple);
  assert(up[0] === 0 && up[2] === 3 && up[4] === 8 && up[1] === -1 && up.length === 32,
    'converting up puts each eighth on its first sixteenth');
}
{
  const random = (() => { let x = 7; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
  for (const mode of ['simple', 'advanced']) {
    let ok = true;
    for (let k = 0; k < 50; k++) {
      const n = luckyNotes(mode, random);
      const m = RIFF_MODES[mode];
      const onScale = n.every((r) => r < 0 || (mode === 'simple' ? r < 8 : [0, 2, 3, 5, 7, 8, 10, 12].includes(r)));
      if (n.length !== m.steps || n[0] < 0 || !onScale || n.filter((r) => r >= 0).length < 4) ok = false;
    }
    assert(ok, `ZAP writes a ${mode} riff: starts on the beat, stays in the scale, has a tune in it`);
  }
}
{
  assert(upgradeDraft({ notes: [0, 1, 7] }).mode === 'simple' && upgradeDraft({ notes: [0, 1, 7] }).simple[2] === 7,
    'a draft from the first day (scale notes) opens as SIMPLE');
  const v2 = upgradeDraft({ v: 2, notes: [0, 1, 12] });
  assert(v2.mode === 'advanced' && v2.advanced[2] === 1 && v2.advanced[4] === 12, 'a semitone draft from this afternoon opens as ADVANCED');
  assert(upgradeRecipeNotes({ notes: [3] }).mode === 'simple' && upgradeRecipeNotes({ v: 2, notes: [3] }).notes[0] === 3,
    'kept songs from before are read in today\'s shape');
}

// ---------------------------------------------------------------- the generator
assert(!MAKER_STYLES.some((s) => ['synthwave', 'chipstep', 'kraftwerk'].includes(s.id)),
  'synthwave and chipstep are held back until they are phone-safe, and Kraftwerk is out');
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
    && share('megadrive', (x) => x.intro === 'bitcrush') > 0, 'the bitcrush only in Mega Drive and Electro');
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
  for (let k = 0; k < MAX_KEPT + 3; k++) keepBanger({ notes: DEFAULT_NOTES, style: 'trance', mood: k % 2 ? 'dark' : 'heroic', seed: 10 + k, bpm: 138 }, fake);
  assert(bangerState(fake).kept.length === MAX_KEPT && bangerState(fake).kept.at(-1).seed === 10 + MAX_KEPT + 2,
    `past ${MAX_KEPT} songs the oldest goes`);
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
  assert(row.name === 'PINK SCOOTER (MEGA DRIVE/HEROIC)' && row.bpm === 150 && typeof desc.get === 'function',
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

// ---------------------------------------------------------------- the maker
{
  let made = null;
  let backs = 0;
  const maker = new BangerMakerState({ onDone: () => { backs++; }, onMade: (rec, song) => { made = { rec, song }; } });
  maker.enter();
  let L = maker.layout();
  assert(maker.mode === 'simple' && maker.rows === 8 && maker.steps === 16, 'the maker opens in SIMPLE');
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
  // Tap the top-left square: A5 at step 0.
  tap(maker, L.grid.x + L.grid.cellW / 2, L.grid.y + L.grid.cellH / 2);
  assert(maker.notes[0] === 7, 'tapping a square writes that note');

  // SIMPLE → ADVANCED after an edit in SIMPLE: ADVANCED is SIMPLE converted up.
  tap(maker, L.modeBox.x + L.modeBox.w * 0.75, L.modeBox.y + L.modeBox.h / 2);
  L = maker.layout();
  assert(maker.mode === 'advanced' && maker.rows === 13 && maker.steps === 32 && maker.notes[0] === 12,
    'ADVANCED shows SIMPLE converted up');
  // Write a sharp on an off-sixteenth: only ADVANCED can hold it.
  const sharpRow = 12 - 1;                       // A#, one row up from the bottom
  tap(maker, L.grid.x + 1.5 * L.grid.cellW, L.grid.y + (sharpRow + 0.5) * L.grid.cellH);
  assert(maker.advanced[1] === 1, 'ADVANCED takes a sharp on a sixteenth');
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
  tap(maker, L.pickers[0].x + L.pickers[0].w - 4, L.pickers[0].y + L.pickers[0].h / 2);
  assert(maker.style !== style0, 'tapping the STYLE picker moves to the next style');
  tap(maker, L.pickers[0].x + 4, L.pickers[0].y + L.pickers[0].h / 2);
  assert(maker.style === style0, 'and its left end goes back');
  const mood0 = maker.mood;
  tap(maker, L.pickers[1].x + L.pickers[1].w - 4, L.pickers[1].y + L.pickers[1].h / 2);
  assert(maker.mood !== mood0, 'tapping the MOOD picker moves to the next mood');

  // Keyboard: from the grid's bottom row, down reaches the pickers, then the buttons;
  // up from the top row reaches the mode switch.
  maker.focus = { area: 'grid', col: 2, row: maker.rows - 1, picker: 0, button: 3 };
  frame(maker, 'down');
  assert(maker.focus.area === 'picker' && maker.focus.picker === 0, 'down from the grid reaches the pickers');
  const s1 = maker.style;
  frame(maker, 'right');
  assert(maker.style !== s1, 'left and right turn a picker');
  frame(maker, 'down');
  assert(maker.focus.area === 'button', 'down again reaches the buttons');
  maker.focus = { area: 'grid', col: 2, row: 0, picker: 0, button: 3 };
  frame(maker, 'up');
  frame(maker, 'right');
  assert(maker.focus.area === 'mode' && maker.mode === 'advanced', 'up from the top row reaches SIMPLE / ADVANCED, and right picks ADVANCED');
  frame(maker, 'left');
  assert(maker.mode === 'simple', 'left picks SIMPLE');

  tap(maker, ...centre(L.buttons[1]));
  assert(maker.notes.every((n) => n < 0), 'CLEAR empties the grid');
  tap(maker, ...centre(L.buttons[2]));
  assert(hasNotes(maker.notes) && maker.notes.length === 16, 'ZAP writes a riff into the grid on show');
  const lucky = [...maker.notes];

  tap(maker, ...centre(L.buttons[3]));
  assert(maker.making > 0 && !made, 'GENER8 shows GENER8ING... for a frame before the work');
  frame(maker); frame(maker);
  assert(made && made.song.bank && made.rec.style === maker.style && made.rec.mood === maker.mood
    && made.rec.mode === 'simple' && made.rec.notes.join() === lucky.join(),
  'GENER8 makes the song from the grid on show, its mode, style and mood, and hands it over');
  assert(bangerState().kept[0] === made.rec && save.data.bangers.draft.simple.join() === lucky.join(), 'the banger is kept and the grid is remembered');

  tap(maker, ...centre(L.buttons[1]));
  made = null;
  tap(maker, ...centre(L.buttons[3]));
  frame(maker); frame(maker);
  assert(!made && maker.messageT > 0, 'GENER8 on an empty grid says so and makes nothing');
  tap(maker, ...centre(L.buttons[0]));
  assert(backs === 1, 'BACK goes back');
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
    && lab.rowText(0, mine) === `1. ${mine.name}` && / \([A-Z-]+(?: AND [A-Z]+)?\/[A-Z -]+\)$/.test(mine.name),
  'THE LAB lists the made songs from 1, each titled NAME (STYLE/MOOD)');
  let opened = null;
  lab.openClub = (rec) => { opened = rec; };
  lab.idx = 0;
  frame(lab, 'confirm');
  assert(opened === mine.banger && lab.playing === -1, 'choosing a song opens it in the club, not in the list');
  lab.draw(document.createElement('canvas').getContext('2d'));
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
  // The dancing: one hero at a time joins in, each on one of their own three dances, and
  // a change always picks a different one.
  club.dancers.forEach((d, k) => { d.move = null; d.joinAt = club.t + 0.05 + k * 0.1; d.changeAt = Infinity; });
  club.update(1 / 60);
  const firstIn = club.dancers.filter((d) => d.move).length;
  for (let k = 0; k < 60; k++) club.update(1 / 60);
  const grumposAt = HERO_MOVES.findIndex((m) => m.hero === 'grumpos');
  assert(firstIn < HERO_MOVES.length && club.dancers.every((d, i) => (i === grumposAt ? d.resting && !d.move : d.move && d.move.hero === HERO_MOVES[i].hero) && d.moves.length === 5),
    'the heroes join the dancing one at a time, each on one of their own five dances (the gallery\'s lab set) — Grumpos joins in just standing there');
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
        if (before.scroll && 54 - before.dur * 22 + (before.text.length * 6 - 1) > 0.01) complete = false;
      }
      if (club.led !== before) { seen.push(club.led.text); if (club.led.scroll) scrolled = true; }
      if (!club.led.scroll && (a.offset < 0 || a.offset + club.led.text.length * 6 - 1 > 54)) complete = false;
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
    const wide = HERO_DANCE_CANDIDATES.find((d) => d.hero === 'kiko' && d.move === 'shuffle') || HERO_DANCE_CANDIDATES.find((d) => d.hero === 'kiko');
    const kiko = club.dancers[HERO_MOVES.findIndex((m) => m.hero === 'kiko')];
    assert(kiko.skirted && !club.dancers[0].skirted, 'Kiko dances in a skirt; Lorenzo does not');
    let ok = true, tapped = false, hopped = false;
    for (let b = 0; b < 8; b += 0.125) {
      for (const legs of SKIRT_LEGS) {
        const pose = club.constructor.tameSkirtForTest(heroDancePose(wide, b), legs, b);
        const feet = pose.dance.feet;
        // standing and hopping hand the painter no feet: it stands them as at idle
        if (legs === 'hop' && pose.bounce > 0.03) hopped = true;
        if (legs !== 'tap') { if (feet) ok = false; continue; }
        const planted = feet.filter((f) => Math.abs(Math.abs(f[0]) - 0.085) < 1e-9 && f[1] === 0).length;
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
  assert(club.moments.length === 0, 'the crowd moments (beach ball, confetti, glow sticks, the smoke machine) play and clear');
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
  const fresh = made?.r;
  assert(fresh && fresh !== st && st.preset === 'neon-orbit' && st.mood === STARTERS['neon-orbit'].recipe.mood && fresh.mood === 'heroic' && !fresh.preset
    && bangerState().kept.at(-1) === fresh && bangerState().kept.length === before + 1 && songFor(fresh).bank !== STARTERS['neon-orbit'].song().bank,
    'editing the starter never overwrites it: it keeps a new song, made by the plain recipe');
}

// ---------------------------------------------------------------- THE PENCIL: edit and remake
{
  const rec = bangerState().kept.at(-1);
  const { name, n } = rec;
  const count = bangerState().kept.length;
  const draftBefore = JSON.stringify(bangerState().draft);
  let made = null;
  const maker = new BangerMakerState({ from: rec, onDone: () => {}, onMade: (r) => { made = r; }, random: () => 0 });
  maker.enter();
  assert(maker.style === rec.style && maker.mood === rec.mood && maker.mode === rec.mode && maker.notes.join() === rec.notes.join(),
    'the pencil opens the grid on the song\'s own riff, style and mood');
  const other = ['trance', 'dnb', 'electro'].find((id) => id !== rec.style);
  maker.style = other;
  maker.make();
  maker.exit();
  assert(made === rec && rec.style === other && rec.name === name && rec.n === n && bangerState().kept.length === count,
    'BRING TO LIFE remakes that song in place: same name and number, the new style, no new song');
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
