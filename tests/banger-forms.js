// BANGER FORMS — the shapes a banger can take beyond the Club build-and-drop: Pop Song,
// Anthem, Groove, and a form drawn in the dialog's editor.
//
// Checked as promises: every form fits every length exactly and makes a valid song in
// every style; a drawn form re-makes exactly what its template made; the Club form never
// changes by being drawn out; the song hangs together (the verse lower and sparser than
// the chorus, on other chords; the pre-chorus and the middle 8 landing on the dominant;
// the middle 8 somewhere the chorus never goes); the choruses rise and the last is lifted;
// every rise into a chorus has a run-up and no fall has a riser; a groove builds up and
// never plays a drop's impact; old recipes stay Club. And the editor's pure helpers.
import { generateBanger, normaliseBangerOptions, bangerBars, styleDefaults, classicDefaults, styleFor, parseRiff } from '../tools/lib/banger/index.js';
import { BANGER_STYLES } from '../tools/lib/banger/styles/index.js';
import { SECTION_TYPES, ROLE_TYPE, normaliseSections, isHookSection } from '../tools/lib/banger/form-types.js';
import { templateSections, FORM_TEMPLATES } from '../tools/lib/banger/templates.js';
import { buildForm, formFromList } from '../tools/lib/banger/form.js';
import { songMaterial, SECTION_HARMONY, pitchesOf } from '../tools/lib/banger/cohesion.js';
import { analyseRiff, romanChord, MODE_INFO } from '../tools/lib/banger/analyse.js';
import { hookCell } from '../tools/lib/banger/variation.js';
import { L } from '../tools/lib/banger/theory.js';
import * as edit from '../tools/lib/banger/form-edit.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
let quiet = 0;
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else quiet++;
}

const riffOf = (parts, bars = 2) => ({ version: 1, source: { id: 't', title: 'T', from: 0, to: bars - 1, bpm: 128 }, bars, grid: 16, stats: {}, parts });
const HOOK = riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 74,
  bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .', 'D5:4 . . . A4:2 . . . F5:2 . . . E5:2 . . .'] }]);
const BAND = riffOf([...HOOK.parts,
  { key: 'bass', label: 'Bass', kind: 'melodic', role: 'bass', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 40,
    bars: ['D2:2 . D3:2 . D2:2 . D3:2 . A1:2 . A2:2 . A1:2 . A2:2 .', 'F1:2 . F2:2 . F1:2 . F2:2 . C2:2 . C3:2 . C2:2 . C3:2 .'] },
  { key: 'kick', label: 'Kick', kind: 'drum', role: 'drums', voice: null, voiceParams: null, engineKeys: null, strip: null, bars: ['x...x...x...x...', 'x...x...x...x.x.'] }]);
const LENGTHS = [['short'], ['medium'], ['long'], ['custom', 24], ['custom', 40], ['custom', 256]];
const TEMPLATES = ['pop', 'anthem', 'groove'];

// ---------------------------------------------------------------- the registry
assert(Object.values(ROLE_TYPE).every((t) => SECTION_TYPES[t]), 'every Club role is a kind of section');
assert(Object.values(SECTION_TYPES).every((t) => t.label && /^#[0-9a-f]{6}$/i.test(t.colour) && t.min >= 2 && t.max >= t.min && t.energy >= 0 && t.energy <= 1),
  'every kind of section has a label, a colour, a range of bars and an energy');

// ---------------------------------------------------------------- every form, every length
for (const id of TEMPLATES) {
  for (const total of [24, 32, 40, 48, 56, 64, 80, 112, 160, 256]) {
    const list = templateSections(id, { intro: true, outro: true }, total, 5);
    const sum = list.reduce((n, s) => n + s.bars, 0);
    check(sum === total && list.every((s) => s.bars >= 2 && s.bars % 2 === 0 && SECTION_TYPES[s.type]),
      `${id} at ${total} bars is exactly ${total}, in even sections (${list.map((s) => `${s.type} ${s.bars}`).join(', ')})`);
  }
}
assert(!failed, 'every form fits every length exactly');

let made = 0;
for (const style of BANGER_STYLES) {
  for (const template of TEMPLATES) {
    for (const [length, customBars] of LENGTHS) {
      for (const [name, riff] of [['hook', HOOK], ['band', BAND]]) {
        const label = `${style.id}/${template}/${length}${customBars || ''}/${name}`;
        try {
          const out = generateBanger({ riff, options: { style: style.id, length, customBars, form: { template } }, seed: ++made });
          const want = length === 'custom' ? customBars : { short: 48, medium: 64, long: 112 }[length];
          check(out.summary.bars === want && out.form[out.form.length - 1].to === want, `${label}: ${want} bars`);
          check(out.form.some(isHookSection), `${label}: somewhere the hook plays in full`);
          check(out.form.every((f) => f.type && Number.isFinite(f.energy)), `${label}: every section has a type and an energy`);
        } catch (err) { check(false, `${label}: ${err.message}`); }
      }
    }
  }
}
assert(!failed, `${made} bangers in every form, style and length are valid songs`);

// ---------------------------------------------------------------- old recipes, defaults
{
  const old = normaliseBangerOptions({ style: 'synthwave', form: { keyLift: 'none' } }).options;
  assert(old.form.template === 'club', 'a recipe that spells out its form but names no template is the Club form, as it was made');
  const fresh = normaliseBangerOptions({ style: 'synthwave' }).options;
  assert(fresh.form.template === 'pop' && styleDefaults(styleFor('eurobeat')).form.template === 'pop'
    && styleDefaults(styleFor('trance')).form.template === 'anthem' && styleDefaults(styleFor('big-room')).form.template === 'club',
  'each style starts on a form that suits it: Synthwave and Eurobeat a Pop Song, Trance an Anthem, Big-Room the Club form');
}

// ---------------------------------------------------------------- Classic
{
  // A style's classic is its defaults without the variety: its own sounds and arp every
  // take, no bass lift, the Club form — so two seeds differ only in what the seed itself
  // rolls (the hook's variation), never in which sounds play.
  const ok = BANGER_STYLES.every((st) => {
    const c = classicDefaults(st);
    return c.parts.partSounds === 'style' && c.parts.arpPattern === 'style' && c.parts.bassLift === false
      && c.form.template === 'club' && c.mood === styleDefaults(st).mood && c.style === st.id;
  });
  assert(ok, 'Classic is each style\'s defaults with its own sounds, its own arp, no bass lift and the Club form');
  const a = generateBanger({ riff: HOOK, options: classicDefaults(styleFor('big-room')), seed: 1 });
  const b = generateBanger({ riff: HOOK, options: classicDefaults(styleFor('big-room')), seed: 2 });
  assert(JSON.stringify(a.mix.voice) === JSON.stringify(b.mix.voice) && a.form.map((f) => f.role).join() === 'intro,build,drop,breakdown,build2,drop2,drop3,outro',
    'a classic Big-Room banger is ABSOLUTE ZERO\'s form with the same sounds take after take');
}

// ---------------------------------------------------------------- drawn forms
{
  const ok = normaliseSections([{ type: 'verse', bars: 8 }, { type: 'chorus', bars: 8, label: '  Big One  ', energy: 0.9 }]);
  assert(ok.sections && ok.sections[1].label === 'Big One' && !ok.issues.length, 'a drawn form is tidied: labels trimmed');
  for (const [bad, why] of [
    [[{ type: 'verse', bars: 8 }], 'no chorus, drop or groove'],
    [[{ type: 'chorus', bars: 7 }], 'odd bars'],
    [[{ type: 'nope', bars: 8 }], 'an unknown kind'],
    [[{ type: 'chorus', bars: 8, energy: 3 }], 'energy outside 0–1'],
    [[{ type: 'intro', bars: 4, variant: 'sideways' }, { type: 'chorus', bars: 8 }], 'a variant the kind does not have'],
  ]) check(normaliseSections(bad).issues.length > 0, `a drawn form with ${why} is refused`);
  const tooShort = normaliseBangerOptions({ form: { sections: [{ type: 'chorus', bars: 8 }] } });
  assert(tooShort.issues.length > 0, 'a drawn form shorter than 24 bars is refused');
  const drawn = [{ type: 'intro', bars: 4 }, { type: 'verse', bars: 8 }, { type: 'chorus', bars: 8 }, { type: 'middle8', bars: 8 }, { type: 'chorus', bars: 12, lift: true }];
  const o = normaliseBangerOptions({ form: { sections: drawn } }).options;
  const out = generateBanger({ riff: HOOK, options: { form: { sections: drawn } }, seed: 3 });
  assert(bangerBars(o) === 40 && out.summary.bars === 40 && out.form.map((f) => f.label).join() === 'Intro,Verse,Chorus,Middle 8,Chorus 2',
    'a drawn form is the song: its own length, its own sections, numbered where they repeat');
  // A template's own form, drawn back in, is the same song — and so is the Club form.
  const same = (a, b) => JSON.stringify([a.bank, a.mix, a.arrangement]) === JSON.stringify([b.bank, b.mix, b.arrangement]);
  for (const style of BANGER_STYLES) {
    for (const template of ['club', ...TEMPLATES]) {
      for (const length of ['short', 'long']) {
        const base = { style: style.id, length, form: { template, script: false, layers: length === 'long' ? 'long' : 'off', falseEnding: length === 'long' } };
        const a = generateBanger({ riff: BAND, options: base, seed: 9 });
        const list = edit.fromForm(a.form, template === 'club');
        const b = generateBanger({ riff: BAND, options: { ...base, form: { ...base.form, sections: list } }, seed: 9 });
        check(same(a, b), `${style.id}/${template}/${length}: drawn back in, its form makes the same song`);
      }
    }
  }
  assert(!failed, 'every form drawn back into the editor makes exactly the song its template made — the Club form included');
}

// ---------------------------------------------------------------- half time is its own item
{
  const cs = generateBanger({ riff: HOOK, options: { style: 'chipstep', length: 'medium' }, seed: 4 });
  const fb = generateBanger({ riff: HOOK, options: { style: 'future-bass', length: 'medium' }, seed: 4 });
  const br = generateBanger({ riff: HOOK, options: { style: 'big-room', length: 'medium' }, seed: 4 });
  assert(cs.form.find((f) => f.role === 'drop').type === 'halfDrop' && cs.form.find((f) => f.role === 'drop2').type === 'drop'
    && fb.form.find((f) => f.role === 'drop').type === 'halfDrop' && !br.form.some((f) => f.type === 'halfDrop'),
  'a style\'s half-time drop is its own item on the strip (Chipstep\'s and Future Bass\'s first), and the full-time drops are Drops');
  // Turned into a plain Drop in the editor, it plays full time; and a Half-Time Drop drawn
  // into any style plays half time. Measured by the kick: four on the floor, or not.
  const kicks = (out, f) => {
    let n = 0;
    const lane = out.laneOf.kick;
    for (let bar = f.from; bar <= f.to; bar++) {
      const ref = out.bank.order[Math.floor((bar - 1) / 2)];
      const sec = out.bank.sections[typeof ref === 'object' ? ref.s : ref];
      const part = sec?.[lane];
      const pat = Array.isArray(part) ? part : null;
      if (pat) n += pat.slice(((bar - 1) % 2) * 16, ((bar - 1) % 2) * 16 + 16).filter(Boolean).length;
    }
    return n / f.bars;
  };
  const list = edit.fromForm(cs.form, true);
  const at = list.findIndex((s) => s.type === 'halfDrop');
  const full = generateBanger({ riff: HOOK, options: { style: 'chipstep', length: 'medium', form: { sections: edit.setSection(list, at, { type: 'drop' }) } }, seed: 4 });
  const drawnHalf = generateBanger({ riff: HOOK, options: { style: 'big-room', form: { sections: [{ type: 'intro', bars: 4 }, { type: 'halfDrop', bars: 16 }, { type: 'drop', bars: 16 }] } }, seed: 4 });
  const [h, d] = drawnHalf.form.slice(1);
  assert(full.form[at].type === 'drop' && full.form[at].role === 'drop' && kicks(full, full.form[at]) > kicks(cs, cs.form[at])
    && kicks(drawnHalf, h) < kicks(drawnHalf, d),
  `a Half-Time Drop plays half time and a Drop full time, whatever the style (kicks a bar: ${kicks(cs, cs.form[at])} → ${kicks(full, full.form[at])}; drawn ${kicks(drawnHalf, h)} against ${kicks(drawnHalf, d)})`);
}

// ---------------------------------------------------------------- the riff's own bass
{
  const roles = (out, bar) => {
    const ref = out.bank.order[Math.floor((bar - 1) / 2)];
    const sec = out.bank.sections[typeof ref === 'object' ? ref.s : ref];
    const off = ((bar - 1) % 2) * 16;
    return Object.entries(out.laneOf).filter(([, l]) => Array.isArray(sec[l]) && sec[l].slice(off, off + 16).some((v) => v != null && v !== false)).map(([r]) => r);
  };
  const make = (riffBass) => generateBanger({ riff: BAND, options: { style: 'big-room', variation: 'faithful', form: { template: 'club' }, parts: { riffBass } }, seed: 1 });
  const [rep, keep] = [make('replace'), make('keep')];
  const d = (o) => o.form.find((f) => f.role === 'drop').from + 1;
  assert(roles(rep, d(rep)).includes('bass') && !roles(rep, d(rep)).includes('riff:bass')
    && roles(keep, d(keep)).includes('riff:bass') && !roles(keep, d(keep)).includes('bass'),
  'Riff Bass: Replace plays the Bass setting\'s line in the drops; Keep plays the riff\'s own bassline there instead');
}

// ---------------------------------------------------------------- the breakdown's hook
{
  const hookIn = (out) => {
    const bd = out.form.find((f) => f.role === 'breakdown');
    const lane = out.laneOf.hook;
    let notes = 0; let longest = 0;
    for (let bar = bd.from; bar <= bd.to; bar++) {
      const ref = out.bank.order[Math.floor((bar - 1) / 2)];
      const sec = out.bank.sections[typeof ref === 'object' ? ref.s : ref];
      const hz = sec?.[lane];
      const lens = sec?.[`${lane}Len`] || [];
      if (!Array.isArray(hz)) continue;
      const off = ((bar - 1) % 2) * 16;
      for (let i = off; i < off + 16; i++) if (hz[i] != null) { notes++; longest = Math.max(longest, lens[i] ?? 1); }
    }
    return { notes, longest };
  };
  const make = (breakdownHook) => generateBanger({ riff: HOOK, options: { style: 'big-room', length: 'medium', form: { template: 'club', breakdownHook } }, seed: 4 });
  const [half, written, none] = ['half', 'written', 'none'].map((h) => hookIn(make(h)));
  assert(half.notes > 0 && written.notes > half.notes && none.notes === 0,
    `Breakdown Hook: half speed (${half.notes} notes), as written (${written.notes} — twice as many), or none (${none.notes})`);
}

// ---------------------------------------------------------------- Chord Gate and Spot FX
{
  const { laneFx, MASTER_KEY } = await import('../src/data/automation.js');
  const make = (extra) => generateBanger({ riff: HOOK, options: { style: 'big-room', length: 'medium', form: { template: 'club' }, ...extra }, seed: 3 });
  const gateOf = (o) => (o.mix.lanes[o.laneOf.saws].effects || []).find((e) => e.id === 'rhythmgate')?.params.division;
  assert(gateOf(make({})) === 1 && gateOf(make({ fx: { gate: 'sixteenths' } })) === 0.25 && gateOf(make({ fx: { gate: 'dotted' } })) === 0.75
    && gateOf(make({ fx: { gate: 'sixteenths', pump: false } })) === undefined,
  'Chord Gate sets the chords\' gate: the style\'s pump, sixteenths, dotted eighths — and nothing with Sidechain Pump off');
  const byEnergy = make({ fx: { gate: 'energy' } });
  const sections = laneFx(byEnergy.arrangement.automation, byEnergy.laneOf.saws).flatMap((x) => x.chain).filter((e) => e.id === 'rhythmgate').map((e) => e.params.division);
  assert(gateOf(byEnergy) === undefined && new Set(sections).size >= 2,
    `By Energy gates the chords section by section, at more than one rate (${[...new Set(sections)].join(', ')})`);
  const ids = (o, key) => laneFx(o.arrangement.automation, key).flatMap((x) => x.chain).map((e) => e.id);
  const repeat = make({ spot: { intoDrop: 'repeat' }, fx: { stutter: false } });
  const radio = make({ spot: { intro: 'radio' } });
  const tape = make({ spot: { ending: 'tapeStop' } });
  const under = make({ spot: { quiet: 'underwater' } });
  assert(ids(repeat, MASTER_KEY).includes('stutter') && ids(radio, MASTER_KEY).includes('filter') && !tape.arrangement.loop
    && ids(tape, MASTER_KEY).includes('stutter') && ids(under, MASTER_KEY).includes('filter'),
  'Spot FX write their effect where they say: a beat repeat into the drop, a radio intro, a tape stop that ends the loop, an underwater breakdown');
  const none = make({ spot: { intoDrop: 'none' } });
  assert(!ids(none, MASTER_KEY).includes('stutter'), 'and None takes the switches\' own away');
}

// ---------------------------------------------------------------- everything explains itself
{
  const { BANGER_GROUPS } = await import('../tools/lib/banger/options.js');
  const { ARP_FIGURES, BASS_FIGURES } = await import('../tools/lib/banger/theory.js');
  assert(Object.values(SECTION_TYPES).every((t) => t.note && t.title && (t.variants || []).every((v) => v[2])),
    'every kind of section, and everything it can play, says what it does');
  assert(BANGER_STYLES.every((st) => st.note && st.note.length <= 60 && st.title), 'every style has a one-line note for the Style list and a description for its tooltip');
  assert(BANGER_GROUPS.every((g) => g.fields.every((f) => f.title)) && ARP_FIGURES.every((f) => f.note) && BASS_FIGURES.every((f) => f.note),
    'every switch under More Options has a tooltip, and every arp and bass figure a note');
}

// ---------------------------------------------------------------- cohesion
{
  const style = styleFor('big-room');
  const options = normaliseBangerOptions({ style: 'big-room' }).options;
  const parts = parseRiff(HOOK);
  const analysis = analyseRiff(parts, options, style);
  const key = analysis.key;
  const hook = analysis.parts[0];
  const cell = hookCell(hook.parsed, 'some', analysis.tonicChord);
  const ctx = { key, style, scale: key.melodyScale, dominant: romanChord(MODE_INFO[key.mode]?.turn || 'V', key) };
  const mat = songMaterial({ ctx, cell, hookMean: hook.meanPitch, modeHarmony: null, mood: style.moods.anthemic, seed: 42 });
  const verse = mat.verseLine(mat.chordsFor('verse', 8), 0);
  const mean = (ps) => ps.reduce((a, x) => a + x, 0) / Math.max(1, ps.length);
  const hookP = cell.flatMap(pitchesOf);
  const verseP = verse.flatMap(pitchesOf);
  assert(mean(verseP) < mean(hookP), `the verse sits under the chorus (${mean(verseP).toFixed(1)} against ${mean(hookP).toFixed(1)})`);
  assert(verseP.length / verse.length < hookP.length / cell.length, 'and is sparser — the hook\'s own rhythm, thinned');
  const chorusWalk = JSON.stringify((style.progressions.anthemic.minor));
  assert(JSON.stringify(SECTION_HARMONY.verse.minor) !== chorusWalk && JSON.stringify(SECTION_HARMONY.verse.major) !== JSON.stringify(style.progressions.anthemic.major),
    'the verse walks other chords than the chorus');
  const pre = mat.chordsFor('preChorus', 4);
  const mid = mat.chordsFor('middle8', 8);
  assert(pre[pre.length - 1] === ctx.dominant && mid[mid.length - 1] === ctx.dominant, 'the pre-chorus and the middle 8 both land on the dominant');
  const chorusChords = new Set(style.progressions.anthemic[key.minor ? 'minor' : 'major'].flat().map((nm) => romanChord(nm, key)));
  assert(mid.flat().some((c) => !chorusChords.has(c)), `the middle 8 goes somewhere the chorus never does (${mid.flat().join(' ')})`);
  const bridge = mat.bridgeLine(8);
  assert(bridge[7].notes.slice(0, 12).every((v) => v == null) && bridge[7].notes.slice(12).some((v) => v != null),
    'its last bar is silent until the pickup into the chorus');
}

// ---------------------------------------------------------------- energy, joins, groove
{
  for (const style of BANGER_STYLES) {
    const pop = generateBanger({ riff: HOOK, options: { style: style.id, length: 'medium', form: { template: 'pop' } }, seed: 2 });
    const choruses = pop.form.filter((f) => f.type === 'chorus');
    check(choruses.every((c, i) => i === 0 || c.energy > choruses[i - 1].energy), `${style.id}: each chorus hits harder than the last`);
    check(choruses[choruses.length - 1].lifted, `${style.id}: the final chorus is lifted`);
    for (const t of pop.transitions) {
      const from = pop.form.find((f) => f.to === t.bar);
      const to = pop.form.find((f) => f.from === t.bar + 1);
      if (to.energy < from.energy) check(!t.moves.includes('riser'), `${style.id}: no riser into a fall (${t.from} → ${t.to})`);
    }
    for (let i = 0; i < pop.form.length - 1; i++) {
      const [a, b] = [pop.form[i], pop.form[i + 1]];
      if (b.hook && b.energy - a.energy >= 0.15 && a.type !== 'build') {
        check(pop.transitions.some((t) => t.bar === a.to && t.moves.length), `${style.id}: a run-up into ${b.label}`);
      }
    }
    const groove = generateBanger({ riff: HOOK, options: { style: style.id, length: 'long', form: { template: 'groove' } }, seed: 2 });
    const firstHalf = groove.form.filter((f) => f.to <= groove.summary.bars / 2 && f.variant !== 'dip');
    check(firstHalf.every((f, i) => i === 0 || f.energy >= firstHalf[i - 1].energy), `${style.id}: a groove only builds through its first half`);
    check(groove.form.every((f) => (f.from - 1) % 8 === 0), `${style.id}: a groove changes on the eight-bar lines`);
    check(!Object.values(groove.mix.labels).some((l) => /^IMPACT|^RISER/.test(l)), `${style.id}: a groove has no impact and no riser`);
  }
  assert(!failed, 'the choruses rise to a lifted final one, every rise into a chorus has its run-up and no fall a riser, and a groove builds without a drop\'s hits');
}

// ---------------------------------------------------------------- the editor's helpers
{
  const pop = edit.applyTemplate('pop', { intro: true, outro: true }, 64);
  assert(edit.total(pop) === 64 && pop[0].type === 'intro', 'a template fills the editor at the length asked for');
  const added = edit.addSection(pop, 2, 'middle8');
  assert(added.length === pop.length + 1 && added[3].type === 'middle8' && edit.total(added) === 64 + SECTION_TYPES.middle8.min * 2,
    'a section is added after the one chosen, at a sensible length');
  const removed = edit.removeSection(added, 3);
  assert(JSON.stringify(removed) === JSON.stringify(pop), 'and removed again');
  const moved = edit.moveSection(pop, 1, 3);
  assert(moved[3].type === 'verse' && moved.length === pop.length, 'a section moves');
  const grown = edit.resizeSection(pop, 3, 4);
  const shrunk = edit.resizeSection(pop, 2, -100);
  assert(grown[3].bars === pop[3].bars + 4 && shrunk[2].bars === SECTION_TYPES[pop[2].type].min, 'a section grows in fours and never shrinks past its kind\'s least');
  const scaled = edit.scaleTo(pop, 112);
  assert(edit.total(scaled) === 112 && scaled.length === pop.length, 'a drawn form rescales to a new length, keeping its sections');
  assert(edit.issues(pop).length === 0 && edit.issues([{ type: 'verse', bars: 8 }]).length > 0, 'the editor says what is wrong with a form before it is made');
}

console.log(`\n${quiet} quiet checks passed`);
console.log(failed ? '\nbanger-forms: FAILED' : '\nbanger-forms: all passed');
process.exit(failed ? 1 : 0);
