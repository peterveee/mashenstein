// BANGER FUSIONS — one style's SOUND over another style's GROOVE, `music` and `beat` in the code (tools/lib/banger/styles/fusion.js,
// 7 Oct 2026). Held here: every recipe key has an owner; every pair of styles makes a song; each part
// plays the sound, the channel and the fader reference of the style it came from; the song is at the
// beat's tempo; a take with no fusion is exactly what it was; and the Lab offers it as INFUSION, the
// selector beside FORMULA: NONE, or another formula's sound over FORMULA's groove.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { BANGER_SOUNDS } = await import('../tools/lib/banger/sounds.js');
const { BANGER_CHANNELS } = await import('../tools/lib/banger/channels.js');
const { generateBanger } = await import('../tools/lib/banger/index.js');
const { BANGER_STYLES, BANGER_SOUND_SETS, BANGER_FLAVOURS, styleFor, fusionOf } = await import('../tools/lib/banger/styles/index.js');
const { FUSION_KEYS, BEAT_RHYTHMS, MUSIC_RHYTHMS, BEAT_ROLES, isBeatRole, fuseChannels, fusionIds } = await import('../tools/lib/banger/styles/fusion.js');
const { resolveSounds, soundsRow, PART_SLOTS } = await import('../tools/lib/banger/sound-rules.js');
const { styleDefaults } = await import('../tools/lib/banger/options.js');
const { riffFromNotes } = await import('../src/game/banger/riff.js');
const { makeBanger, labInfusion, infusionStyle, formulaLabel, upgradeFusionRecipe, MAKER_STYLES } = await import('../src/game/banger/make.js');
const { keepBanger, bangerState, bangerRow, saveDraft } = await import('../src/game/banger/store.js');
const { BangerMakerState } = await import('../src/game/banger/maker.js');
const { ClubVoices } = await import('../src/game/banger/club-voices.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const NOTES = [7, -1, 5, -1, 4, -1, 2, -1, 0, -1, 2, -1, 4, -1, 5, -1];
const riff = riffFromNotes(NOTES, 'simpleSquare', 'simple');
const make = (options, seed = 7) => generateBanger({ riff, options, seed });
const same = (a, b) => JSON.stringify([a.bank, a.mix, a.arrangement]) === JSON.stringify([b.bank, b.mix, b.arrangement]);

// ---------------------------------------------------------------- every key has an owner
{
  const lists = Object.values(FUSION_KEYS).flat();
  assert(lists.length === new Set(lists).size, 'no recipe key is claimed by two owners');
  const recipes = [...BANGER_STYLES, ...BANGER_SOUND_SETS, ...BANGER_FLAVOURS];
  const unplaced = [...new Set(recipes.flatMap((r) => Object.keys(r)))].filter((k) => !lists.includes(k));
  assert(!unplaced.length, `every key any style, Sound Set or flavour holds is the beat's, the music's, shared out, or the fusion's own${unplaced.length ? ` — not placed: ${unplaced.join(', ')}` : ''}`);
  const rhythms = [...new Set(recipes.flatMap((r) => Object.keys(r.rhythms || {})))];
  const loose = rhythms.filter((k) => !BEAT_RHYTHMS.includes(k) && !MUSIC_RHYTHMS.includes(k));
  assert(!loose.length, `every rhythm is the bass line's or the music's${loose.length ? ` — not placed: ${loose.join(', ')}` : ''}`);
}

// ---------------------------------------------------------------- the recipe
{
  const trance = styleFor('trance');
  const reggaeton = styleFor('reggaeton');
  const f = fusionOf('trance', 'reggaeton');
  assert(f && f.id === 'fusion:trance+reggaeton' && f.label === 'Trance × Reggaeton' && styleFor(f.id) === f && fusionOf(trance, reggaeton) === f,
    'a fusion is a recipe named fusion:<music>+<beat>, made once and found again by that name');
  assert(f.bpm === reggaeton.bpm && JSON.stringify(f.tempoRange) === JSON.stringify(reggaeton.tempoRange) && f.drums === reggaeton.drums && f.pump === reggaeton.pump,
    'the beat brings its tempo, its drums and its pump');
  assert(f.progressions === trance.progressions && f.moods === trance.moods && f.master === trance.master && f.breakdown === trance.breakdown,
    'the music brings its chords, its moods, its breakdown and its master');
  assert(f.rhythms.offbeat === reggaeton.rhythms.offbeat && f.rhythms.arp === trance.rhythms.arp && f.centres.bassFloor === reggaeton.centres.bassFloor
    && f.centres.saws === trance.centres.saws, 'the bass line\'s rhythm and register are the beat\'s, the arp\'s the music\'s');
  assert(f.strips.kick === reggaeton.strips.kick && f.strips.bass === reggaeton.strips.bass && f.strips.hook === trance.strips.hook && f.strips.pad === trance.strips.pad,
    'each strip is its part\'s owner\'s');
  const d = styleDefaults(f);
  const dr = styleDefaults(reggaeton);
  const dt = styleDefaults(trance);
  assert(d.style === 'trance' && d.fusion === 'reggaeton' && JSON.stringify(d.drums) === JSON.stringify(dr.drums) && d.parts.bass === dr.parts.bass
    && d.fx.pump === dr.fx.pump && d.mood === dt.mood && d.parts.chords === dt.parts.chords && d.form.template === dt.form.template,
  'its defaults: the beat\'s drum switches, bass and pump, the music\'s mood, chords and form — asked for as trance over reggaeton');
  assert(!fusionOf('trance', 'trance') && !fusionOf('reggaeton', 'reggaeton-romantico') && !fusionOf(f, 'dnb') && !fusionOf('trance', 'nonsense'),
    'never a style over itself or its own flavour, never a fusion of a fusion, never an unknown style');
  assert(JSON.stringify(fusionIds('fusion:synthwave-lite+reggaeton-romantico')) === '{"music":"synthwave-lite","beat":"reggaeton-romantico"}' && !fusionIds('trance'),
    'a fusion\'s name says its two recipes');
}

// ---------------------------------------------------------------- sounds, slot by slot
{
  const row = soundsRow(BANGER_SOUNDS, 'fusion:trance+reggaeton');
  const t = BANGER_SOUNDS.trance;
  const r = BANGER_SOUNDS.reggaeton;
  const beatSlot = (k) => ['Bass', 'Percussion'].includes(PART_SLOTS.find((p) => p.key === k)?.group);
  assert(row && row.kits === r.kits && row.random.bass === r.random.bass && row.random.hook === t.random.hook,
    'a fusion plays the beat\'s kits and Random bass list, the music\'s hook list');
  assert(Object.entries(row.parts).every(([k, v]) => v === (beatSlot(k) ? r.parts[k] : t.parts[k])),
    'every part slot is its owner\'s: bass, sub and percussion the beat\'s, the rest the music\'s');
  const sounds = resolveSounds(BANGER_SOUNDS, 'fusion:trance+reggaeton', 'dreamy');
  assert(sounds.parts.bass && sounds.parts.square, 'and resolves like any style\'s row');
  assert(BANGER_SOUNDS['fusion:trance+reggaeton'] === undefined, 'nothing is written into the sounds table');
}

// ---------------------------------------------------------------- channels, role by role
{
  const m = { strips: { kick: { gain: 1 }, hook: { gain: 2 } }, master: { gain: 3 }, pump: 'mp', exciter: 'mx',
    sectionFx: { version: 1, rules: [{ role: 'hook' }, { role: 'bass' }] } };
  const b = { strips: { kick: { gain: 4 }, hook: { gain: 5 } }, master: { gain: 6 }, pump: 'bp', exciter: 'bx',
    sectionFx: { version: 1, rules: [{ role: 'hook' }, { role: 'bass' }, { role: 'kick' }] } };
  const c = fuseChannels(m, b);
  assert(c.strips.kick.gain === 4 && c.strips.hook.gain === 2 && c.master.gain === 3 && c.pump === 'bp' && c.exciter === 'mx',
    'two seeds\' channels: the kit\'s strips and pump from the beat\'s seed, the rest and the master from the music\'s');
  assert(c.sectionFx.rules.map((x) => x.role).join() === 'hook,bass,kick', 'and each section-FX rule from the seed whose part it moves');
  assert(BEAT_ROLES.every(isBeatRole) && !isBeatRole('hook') && !isBeatRole('riser') && !isBeatRole('pad'), 'the riser and the pad are the music\'s');
}

// ---------------------------------------------------------------- the song
{
  const plain = make({ style: 'trance', mood: 'dreamy' });
  assert(same(plain, make({ style: 'trance', mood: 'dreamy', fusion: 'none' })) && !plain.banger.fusion,
    'Groove = Its Own is the style\'s own song, note for note');
  const out = make({ style: 'trance', mood: 'dreamy', fusion: 'reggaeton' });
  assert(out.bank.bpm === styleFor('reggaeton').bpm && out.banger.style === 'fusion:trance+reggaeton'
    && JSON.stringify(out.banger.fusion) === '{"music":"trance","beat":"reggaeton"}' && out.banger.options.style === 'trance' && out.banger.options.fusion === 'reggaeton',
  'trance over reggaeton plays at reggaeton\'s tempo, and the take says what it was made of');
  assert(same(out, make({ style: 'trance', mood: 'dreamy', fusion: 'reggaeton' })), 'the same seed makes the same fusion');
  assert(!same(out, plain), 'and it is a different song from the style\'s own');
  const row = soundsRow(BANGER_SOUNDS, out.banger.style);
  const kit = out.banger.options.drums.kit;
  const voiceOf = (role) => out.mix.voice?.[`${out.laneOf[role]}Voice`];
  assert(voiceOf('kick') === (row.kits[kit]?.kick ?? row.kits.style.kick) && voiceOf('bass') === resolveSounds(BANGER_SOUNDS, 'reggaeton', 'dreamy').parts.bass,
    'its kick and bass are on reggaeton\'s sounds');
  const sq = out.laneOf.square;
  assert(!sq || voiceOf('square') === resolveSounds(BANGER_SOUNDS, 'trance', 'dreamy').parts.square, 'its hook doubles on trance\'s');
  const from = (job) => out.levels.find((x) => x.job === job)?.from || '';
  assert(/reggaeton/i.test(from('kick')) && (!out.laneOf.square || /trance/i.test(from('square'))),
    'each fader is matched to the seed its part came from');
  assert(!out.warnings.some((w) => /cannot play|no other style/.test(w)), 'with nothing to warn about');

  const own = make({ style: 'trance', fusion: 'trance' });
  assert(same(own, make({ style: 'trance' })) && !own.banger.fusion, 'a style over its own beat is just the style');
  const unknown = make({ style: 'trance', fusion: 'polka' });
  assert(same(unknown, make({ style: 'trance' })) && unknown.warnings.some((w) => /no style called "polka"/.test(w)),
    'an unknown beat plays the style\'s own, and says so');
  const romantico = make({ style: 'trance', mood: 'dreamy', fusion: 'reggaeton-romantico' });
  assert(romantico.bank.bpm === styleFor('reggaeton-romantico').bpm && romantico.banger.style === 'fusion:trance+reggaeton-romantico',
    'a flavour is a beat of its own, at its own tempo');
  const light = make({ style: 'trance', fusion: 'synthwave', parts: { soundSet: 'light' } });
  assert(light.banger.style === 'fusion:trance+synthwave-lite', 'Sound Set = Light puts a beat that has a Light set on it');
  // The desk's INFUSION asks for the same fusion from the groove's side: the style is the groove.
  const infused = make({ style: 'reggaeton', mood: 'anthemic', infusion: 'trance' });
  assert(infused.banger.style === 'fusion:trance+reggaeton' && infused.bank.bpm === styleFor('reggaeton').bpm
    && infused.banger.options.style === 'reggaeton' && infused.banger.options.infusion === 'trance' && !('fusion' in infused.banger.options)
    && same(infused, make({ style: 'trance', mood: 'anthemic', fusion: 'reggaeton' })),
  'Style reggaeton with Infusion trance is trance over reggaeton\'s groove, and the take keeps it as asked');
  const romanticoGroove = make({ style: 'reggaeton', mood: 'dreamy', infusion: 'trance' });
  assert(romanticoGroove.banger.style === 'fusion:trance+reggaeton-romantico' && romanticoGroove.bank.bpm === styleFor('reggaeton-romantico').bpm,
    'and the groove is the style as it would play alone: Dreamy picks Romántico');
  assert(same(make({ style: 'trance', infusion: 'none' }), make({ style: 'trance' })), 'Infusion = None is the style\'s own song');
  const combo = make({ style: 'big-room', fusion: 'dnb', combo: 'anything' });
  assert(combo.warnings.some((w) => /Sound Combo does not go over a fusion/.test(w)), 'a Sound Combo does not go over a fusion');
}
{
  // Every ordered pair of styles makes a song, at its beat's tempo.
  let bad = [];
  for (const m of BANGER_STYLES) {
    for (const b of BANGER_STYLES) {
      if (m === b) continue;
      try {
        const out = make({ style: m.id, fusion: b.id }, 3);
        if (out.bank.bpm !== b.bpm) bad.push(`${m.id}+${b.id}: ${out.bank.bpm} BPM`);
      } catch (e) { bad.push(`${m.id}+${b.id}: ${e.message}`); }
    }
  }
  assert(!bad.length, `every ordered pair of the ${BANGER_STYLES.length} styles makes a song at its beat's tempo${bad.length ? ` — ${bad.slice(0, 5).join('; ')}` : ''}`);
}

// ---------------------------------------------------------------- the Lab: INFUSION
{
  assert(labInfusion('reggaeton', 'dreamy') === 'reggaeton-romantico' && labInfusion('reggaeton', 'anthemic') === 'reggaeton' && labInfusion('trance', 'dark') === 'trance',
    'a kept INFUSION is the flavour its mood picks, or the style');
  assert(infusionStyle('reggaeton-romantico') === 'reggaeton' && infusionStyle('trance') === 'trance' && infusionStyle(null) === null
    && infusionStyle('nonsense') === null && infusionStyle('synthwave-lite') === null, 'and is read back as its style');
  assert(formulaLabel('reggaeton', 'trance') === 'REGGAETON × TRANCE' && formulaLabel('trance') === 'TRANCE' && formulaLabel('trance', 'trance') === 'TRANCE',
    'a kept song is REGGAETON × TRANCE: FORMULA, then INFUSION');
  // FORMULA is the groove, INFUSION the sound.
  // (its own flavour, kept: a take may otherwise roll another — labFlavour)
  const rec = { notes: NOTES, mode: 'simple', style: 'reggaeton', mood: 'anthemic', seed: 11, voltage: 1, expression: 3, flavour: styleFor('reggaeton').flavours[0].id };
  const plain = makeBanger(rec);
  const infused = makeBanger({ ...rec, infusion: 'trance' });
  assert(infused.bpm === plain.bpm && infused.bpm === styleFor('reggaeton').bpm && /^fusion:trance\+reggaeton/.test(infused.soundsId) && plain.soundsId === 'reggaeton',
    'REGGAETON infused with TRANCE plays at reggaeton\'s tempo, on trance\'s sounds over reggaeton\'s groove');
  assert(makeBanger({ ...rec, infusion: 'reggaeton' }).soundsId === 'reggaeton' && JSON.stringify(makeBanger({ ...rec, infusion: null }).bank) === JSON.stringify(plain.bank),
    'an INFUSION of itself, or NONE, is the formula\'s own song');
  const over = makeBanger({ ...rec, voltage: 3, infusion: 'trance' });
  const range = styleFor('reggaeton').tempoRange;
  assert(over.bpm > styleFor('reggaeton').bpm && over.bpm <= range[1], 'Overload\'s boost is on the groove\'s tempo, inside its range');
  const flavoured = makeBanger({ ...rec, flavour: 'romantico', infusion: 'trance' });
  assert(flavoured.bpm === styleFor('reggaeton-romantico').bpm && flavoured.soundsId === 'fusion:trance+reggaeton-romantico',
    'FORMULA\'s flavour is the groove\'s');
  const lite = makeBanger({ ...rec, infusion: 'synthwave' });
  assert(lite.soundsId === 'fusion:synthwave-lite+reggaeton', 'an INFUSION with a Lab Sound Set plays on it, as the formula alone would');
  // An INFUSION is always the Club form (8 Oct 2026): never the pop-song form of either formula.
  const roles = (t) => t.form.map((f) => f.role).join(',');
  const isClub = (t) => /\bbuild\b/.test(roles(t)) && !/verse|preChorus|middle8/.test(roles(t));
  assert(!isClub(plain) && isClub(makeBanger({ ...rec, infusion: 'eurobeat' })),
    'REGGAETON (a pop song) infused with EUROBEAT (a pop song) plays the Club form, not a song');
  const wild = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => makeBanger({ ...rec, seed, voltage: 3, infusion: 'eurobeat' }));
  assert(wild.every(isClub), 'Overload\'s form roll never turns an infusion into another form');
  assert(isClub(makeBanger({ ...rec, mood: 'breakthrough', infusion: 'eurobeat' })), 'a MOOD PAIR over an infusion keeps the Club form');
  const chip = makeBanger({ ...rec, style: 'trance', infusion: null, flavour: null });
  assert(chip.soundsId === 'trance', 'and a plain take is unchanged');
  const asGroove = makeBanger({ ...rec, style: 'chipstep', infusion: 'trance' });
  assert(/^fusion:trance\+chipstep-(lite|8bit)$/.test(asGroove.soundsId), 'FORMULA on a Lab Sound Set keeps it as the groove');
  const voices = new ClubVoices(flavoured, { ...rec, flavour: 'romantico', infusion: 'trance' });
  assert(voices.ownRow?.kits === BANGER_SOUNDS['reggaeton-romantico'].kits && voices.choices('drums').length > 0,
    'the club swaps an infused take\'s drums among its groove\'s kits');
  // A song kept in the first hour of fusions (sound in `style`, groove in `fusion`) is made exactly as it was.
  const first = { notes: NOTES, mode: 'simple', style: 'trance', mood: 'dreamy', seed: 5, voltage: 1, expression: 3, fusion: 'reggaeton-romantico' };
  const upgraded = upgradeFusionRecipe({ ...first });
  assert(upgraded.style === 'reggaeton' && upgraded.flavour === 'romantico' && upgraded.infusion === 'trance' && !('fusion' in upgraded),
    'a first-hour fusion song becomes FORMULA reggaeton (romántico) infused with trance');
  assert(makeBanger(upgraded).soundsId === 'fusion:trance+reggaeton-romantico', 'and plays the same pair');
}
{
  const save = { data: {}, persist() {} };
  const base = { notes: NOTES, mode: 'simple', style: 'reggaeton', mood: 'dreamy', seed: 1, bpm: 96 };
  const a = keepBanger({ ...base, infusion: 'trance' }, save, () => 0);
  assert(a.infusion === 'trance', 'a kept take keeps its INFUSION');
  const b = keepBanger({ ...base, infusion: 'dnb', seed: 2 }, save, () => 0);
  assert(b !== a && b.infusion === 'dnb', 'the same riff with another INFUSION is another song');
  const c = keepBanger({ ...base, infusion: 'dnb', seed: 3 }, save, () => 0);
  assert(c === b && c.seed === 3, 'with the same one it is a new take of that song');
  const d = keepBanger({ ...base, seed: 4 }, save, () => 0);
  assert(d !== c && !('infusion' in d), 'and with NONE, a song of its own');
  assert(/\(REGGAETON × TRANCE\/DREAMY\)$/.test(bangerRow(a).name), 'its jukebox row names both formulas');
  saveDraft({ ...bangerState(save).draft, style: 'reggaeton', infusion: 'trance' }, save);
  assert(bangerState(save).draft.infusion === 'trance', 'the NEW BANGER draft keeps the INFUSION');
  saveDraft({ ...bangerState(save).draft, style: 'dnb', infusion: 'dnb' }, save);
  assert(!('infusion' in bangerState(save).draft), 'but never a formula infused with itself');
  save.data.bangers.draft.infusion = 'polka';
  assert(!('infusion' in bangerState(save).draft), 'nor one the Lab does not have');
  save.data.bangers.draft = { ...save.data.bangers.draft, style: 'trance', fusion: 'reggaeton' };
  const moved = bangerState(save).draft;
  assert(moved.style === 'reggaeton' && moved.infusion === 'trance' && !('fusion' in moved), 'a first-hour fusion draft becomes FORMULA + INFUSION');
  save.data.bangers.kept.push({ v: a.v, n: 99, name: 'OLD', notes: NOTES, mode: 'simple', style: 'trance', mood: 'dreamy', seed: 5, bpm: 92, fusion: 'reggaeton-romantico' });
  const old = bangerState(save).kept.find((r) => r.n === 99);
  assert(old.style === 'reggaeton' && old.infusion === 'trance' && !('fusion' in old), 'and so does a first-hour fusion song');
}

// ---------------------------------------------------------------- the selectors
Input.usingTouch = false;
function tap(state, r) {
  Input.pointer = { x: r.x + r.w / 2, y: r.y + r.h / 2, down: true };
  Input.press('pointer');
  state.update(1 / 60);
  Input.release('pointer');
  Input.pointer.down = false;
  Input.endFrame();
}
{
  let made = null;
  const maker = new BangerMakerState({ onDone: () => {}, onMade: (rec) => { made = rec; } });
  maker.enter();
  maker.setInfusion(null);
  maker.setStyle('reggaeton');
  const ctx = document.createElement('canvas').getContext('2d');
  const L = maker.layout();
  const lay = () => maker.chooserLayout(maker.layout());
  tap(maker, L.pickers[0]);
  assert(maker.chooser?.picker === 0 && !lay().footer && !maker.chooser.grid && maker.chooser.items.length === MAKER_STYLES.length,
    'FORMULA is a plain list again: no box, no OK or CANCEL');
  tap(maker, lay().cells[MAKER_STYLES.findIndex((s) => s.id === 'dnb')]);
  assert(!maker.chooser && maker.style === 'dnb', 'a tap picks a formula and closes');
  tap(maker, L.pickers[1]);
  const items = maker.chooser.items;
  assert(maker.chooser.picker === 1 && items[0].id === 'none' && items.length === MAKER_STYLES.length && !items.some((it) => it.id === 'dnb'),
    'INFUSION lists NONE, then every formula but FORMULA itself');
  maker.draw(ctx);
  tap(maker, lay().cells[items.findIndex((it) => it.id === 'trance')]);
  assert(!maker.chooser && maker.style === 'dnb' && maker.infusion === 'trance', 'a tap infuses FORMULA with another formula\'s sound, and closes');
  assert(Math.round(maker.previewBpm) === (styleFor('dnb').tempoRange?.[0] ?? styleFor('dnb').bpm) - 4, 'the loop keeps FORMULA\'s tempo: the groove is FORMULA\'s');
  maker.setStyle('trance');
  assert(maker.style === 'trance' && !maker.infusion, 'FORMULA onto its own INFUSION drops it back to NONE');
  maker.setStyle('reggaeton');
  maker.setInfusion('trance');
  maker.mood = 'dreamy';
  maker.make();
  assert(made?.style === 'reggaeton' && made.infusion === 'trance' && (made.flavour == null || typeof made.flavour === 'string'),
    'BRING TO LIFE keeps FORMULA, its flavour and the INFUSION');
  assert(maker.draft().infusion === 'trance', 'and the draft remembers the INFUSION');
  const edit = new BangerMakerState({ onDone: () => {}, onMade: () => {}, from: { ...made, infusion: 'synthwave-outrun', n: 1, name: 'X' } });
  edit.enter();
  assert(edit.style === 'reggaeton' && edit.infusion === 'synthwave', 'a kept infusion opens on its style');
}

if (failed) { console.error('BANGER FUSION: FAILED'); process.exit(1); }
console.log('BANGER FUSION: PASSED');
