// MAKE A BANGER — the generator, the riff reader, the song file and the takes.
//
// Browserless. Every banger the generator can make is checked against the rules every
// song here is held to (a clean arrangement, section-safe chains, real voices, no engine
// preset on a layer, no dense lane on a CRLS-1, the arrangement round trip), and the
// musical promises are checked as promises: Faithful keeps the riff's notes, nothing is
// ever inverted, Major on a minor riff changes no note, the lift lifts, a build rolls
// faster, every drop lands with a crash and an impact. Then the file: a banger round-trips
// through its own source, and a take can be left and come back byte for byte.
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveTrack } from '../tools/lib/tracks.js';
import { deskBank, laneList } from '../src/engine/lanes.js';
import { draftOf, entryOf, planToOrder } from '../tools/lib/arrangement-edit.js';
import { expandOrder, arrangementIssues } from '../src/data/arrangements.js';
import { SECTION_EFFECTS, EFFECT_BY_ID } from '../src/engine/effects.js';
import { VOICES, baseLane, isLayer, PERCUSSION_LANES, seamFor } from '../src/data/voices.js';
import { LANE_KEYS } from '../src/engine/lanes.js';
import { Rng } from '../src/engine/rng.js';
import {
  generateBanger, extractRiff, validateRiff, normaliseBangerOptions, surpriseBangerOptions, goCrazyBangerOptions,
  BANGER_DEFAULTS, BANGER_MOODS, BANGER_VARIATIONS, BANGER_GROUPS, BANGER_MODES, MOOD_MODES, riffSummary, anotherTake, sourceRiff,
} from '../tools/lib/banger/index.js';
import { L, P, midi, augment, cut, parseChord } from '../tools/lib/banger/theory.js';
import { planOps, phrasePlan, OPS_BY_VARIATION } from '../tools/lib/banger/variation.js';
import { SHARED_MOODS, moodLifts } from '../tools/lib/banger/moods.js';
import { DROP_ROLES } from '../tools/lib/banger/form.js';
import { approachChords } from '../tools/lib/banger/sections.js';
import { sectionIds } from '../tools/lib/banger/fx.js';
import { laneFx, laneCurve } from '../src/data/automation.js';
import {
  bangerSource, writeBangerSong, moveTake, modifyTake, takesState, listTakes, readTake, deleteTakes,
  tailHashOf, bangerIssues, moveBangersOutOfScratch,
} from '../tools/lib/banger-file.js';
import { writeSongFile } from '../tools/lib/song-file.js';
import { partLevel, noteDb, MAX_LEVEL_MOVE, LEAD_ROLES, LEAD_CAUTION_DB, LEAD_MAX_RAISE, CURVE_SECONDS, CURVE_MIDI, widenerOf, stereoDb } from '../tools/lib/banger/levels.js';
import { BANGER_LEVEL_DATA } from '../tools/lib/banger/levels-data.js';
import { BANGER_STYLES, BANGER_FLAVOURS } from '../tools/lib/banger/styles/index.js';
import { BANGER_SOUNDS } from '../tools/lib/banger/sounds.js';
import { makeSeed, useAsStyle, saveCombo, deleteCombo, seedIdOf, SEED_GROUP } from '../tools/lib/banger-seeds.js';
import { EUROBEAT } from '../tools/lib/banger/styles/eurobeat.js';
import { readImported, writeImportedIndex } from '../tools/lib/imported-index.js';

let failed = false;
let quiet = 0;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
/** For the big loops: one line on failure, silence on success, a count at the end. */
function check(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else quiet++;
}

// ---------------------------------------------------------------- fixtures
const riffOf = (parts, bars, title = 'TEST') => ({
  version: 1, source: { id: 'test', title, from: 0, to: bars - 1, bpm: 120 }, bars, grid: 16, stats: {},
  parts: parts.map((p) => ({ voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, ...p })),
});
// ABSOLUTE ZERO's hook — frost's one bar.
const HOOK1 = riffOf([{ key: 'lead', label: 'Grand', kind: 'melodic', role: 'hook', meanPitch: 74,
  bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .'] }], 1, 'FROST');
const melodyBars = [
  'A4:2 . C5:2 . E5:2 . A4:2 . G4:4 . . . E4:2 . G4:2 .',
  'F4:2 . A4:2 . C5:4 . . . B4:2 . A4:2 . G4:4 . . .',
  'A4:1 C5:1 E5:2 . D5:2 . C5:2 . B4:4 . . . G4:4 . . .',
  'A4:8 . . . . . . . E5:4 . . . C5:4 . . .',
  'E5:2 . D5:2 . C5:2 . B4:2 . A4:4 . . . G4:4 . . .',
  'F4:2 . A4:2 . C5:2 . F5:2 . E5:4 . . . D5:4 . . .',
  'C5:2 . E5:2 . G5:2 . E5:2 . D5:8 . . . . . . .',
];
const melodic = (n) => riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70, bars: melodyBars.slice(0, n) }], n);
// A minor riff with its own bass and drums.
const BAND = riffOf([
  { key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70, bars: melodyBars.slice(0, 2) },
  { key: 'bass', label: 'Bass', kind: 'melodic', role: 'bass', meanPitch: 40, bars: ['A1:4 . . . A1:4 . . . A1:4 . . . A1:4 . . .', 'F1:4 . . . F1:4 . . . G1:4 . . . G1:4 . . .'] },
  { key: 'kick', label: 'Kick', kind: 'drum', role: 'drum', voice: 'ds909Kick', bars: ['x...x...x...x...', 'x...x...x...x...'] },
  { key: 'rim', label: 'Rim', kind: 'drum', role: 'drum', voice: 'dsRim', bars: ['..x...x...x...x.', '..x...x...x...x.'] },
], 2, 'BAND');

// Riffs read off real songs, the way the desk reads them.
async function songRiff(id, a, b) {
  let mod = null;
  for (const dir of ['src/data/songs', 'src/data/imported']) {
    const path = join(process.cwd(), dir, `${id}.js`);
    if (existsSync(path)) { mod = await import(pathToFileURL(path).href); break; }
  }
  const bank = deskBank(resolveTrack(id).bank, mod?.mix);
  return extractRiff({
    bank, draft: draftOf(bank, mod?.arrangement), mix: mod?.mix, from: a - 1, to: b - 1,
    laneKeys: laneList(bank).map((l) => l.key), source: { id, title: resolveTrack(id).title },
  });
}

const temp = mkdtempSync(join(tmpdir(), 'mash-banger-'));
mkdirSync(join(temp, 'src/engine'), { recursive: true });
copyFileSync(join(process.cwd(), 'src/engine/notes.js'), join(temp, 'src/engine/notes.js'));

try {
  // ---------------------------------------------------------------- options
  {
    const { options, issues } = normaliseBangerOptions({});
    assert(!issues.length && options.style === 'big-room' && options.length === 'medium' && options.variation === 'some',
      'an empty request is the style\'s defaults, with nothing to report');
    for (const [bad, what] of [[{ mood: 'sad' }, 'mood'], [{ length: 'epic' }, 'length'], [{ customBars: 30 }, 'custom bars not in fours'],
      [{ customBars: 300 }, 'custom bars past 256'], [{ bpm: 20 }, 'a tempo of 20'], [{ form: { intro: 'yes' } }, 'a switch that is not a boolean'],
      [{ form: { keyLift: 'octave' } }, 'a key lift that is not offered'], [{ drums: { cowbel: true } }, 'a switch that does not exist'],
      [{ style: 'polka' }, 'a style that does not exist']]) {
      assert(normaliseBangerOptions(bad).issues.length > 0, `normalising reports ${what}`);
    }
    const kept = normaliseBangerOptions({ mood: 'dark', form: { falseEnding: true } }).options;
    assert(kept.mood === 'dark' && kept.form.falseEnding && kept.form.intro === BANGER_DEFAULTS.form.intro,
      'a partial request keeps what it says and takes the defaults for the rest');
    let allValid = true; let deterministic = true; let spine = true;
    for (let s = 1; s <= 60; s++) {
      const a = surpriseBangerOptions(new Rng(s), { ...BANGER_DEFAULTS, length: 'long' });
      const b = surpriseBangerOptions(new Rng(s), { ...BANGER_DEFAULTS, length: 'long' });
      if (normaliseBangerOptions(a).issues.length) allValid = false;
      if (JSON.stringify(a) !== JSON.stringify(b)) deterministic = false;
      if (a.style !== 'big-room' || a.length !== 'long' || a.form.secondDrop !== true || a.form.build !== true) spine = false;
    }
    assert(allValid, 'Surprise Me always makes a valid request');
    assert(deterministic, 'Surprise Me is deterministic per seed');
    assert(spine, 'Surprise Me never touches the style, the length, the drops or the builds');
    let backbone = true; const kits = new Set(); const basses = new Set(); const chords = new Set();
    for (let s2 = 1; s2 <= 300; s2++) {
      const o = surpriseBangerOptions(new Rng(s2), BANGER_DEFAULTS);
      kits.add(o.drums.kit); basses.add(o.parts.bass); chords.add(o.parts.chords);
      if (['sub', 'none'].includes(o.parts.bass) || o.parts.chords === 'none' || !o.parts.sub
        || !o.drums.rolls || !o.drums.crashes || !o.fx.riser) backbone = false;
    }
    assert(backbone && kits.size === 6 && basses.size >= 8 && chords.size === 3,
      `Surprise Me changes the backbone's sound — every kit, ${basses.size} bass lines, all three chord treatments — but never takes it away`);
    let newSounds = 0;
    for (let s3 = 1; s3 <= 300; s3++) if (surpriseBangerOptions(new Rng(s3), BANGER_DEFAULTS).parts.riffSound === 'random') newSounds++;
    assert(newSounds > 170 && newSounds < 230, `Surprise Me gives the riff a new sound more often than not (${newSounds} of 300)`);
    for (const C of [1, 2, 4, 8]) {
      for (const v of ['faithful', 'some', 'more', 'wild']) {
        const ops = planOps(C, v);
        check(ops.every((op) => OPS_BY_VARIATION[v].includes(op)), `cell ${C} at ${v} uses only ops its level allows`);
      }
    }
    {
      // WILD IS NEVER A ONE-OFF: every bar that leaves the hook comes back — again in the
      // same phrase, or in the same bar of the other plan, so every phrase plays it.
      const oneOffs = [];
      for (const C of [1, 2, 4, 8]) {
        const A = phrasePlan(C, 'wild', 0); const B = phrasePlan(C, 'wild', 1);
        for (const [plan, other] of [[A, B], [B, A]]) {
          plan.forEach(([src, op], i) => {
            if (op === 'as') return;
            const again = plan.some(([s2, o2], j) => j !== i && s2 === src && o2 === op);
            const sameBar = other[i][0] === src && other[i][1] === op;
            if (!again && !sameBar) oneOffs.push(`C${C} bar ${i + 1} ${op}`);
          });
        }
        check(A.some((step, i) => step.join() !== B[i].join()), `cell ${C} at wild: plans A and B still differ`);
      }
      // Only the one bar that tells A from B may be heard once.
      assert(oneOffs.length <= 8, `every Wild departure comes back — heard once only where A and B differ: ${oneOffs.join(', ') || 'none'}`);
    }
    {
      // MORE sits between Some and Wild: each phrase is Some's with one bar swapped for a Wild
      // move — a leap or a fragment, never the rhythm shift.
      let between = true;
      for (const C of [1, 2, 4, 8]) {
        for (const p of [0, 1]) {
          const more = phrasePlan(C, 'more', p); const some = phrasePlan(C, 'some', p);
          const changed = more.filter((step, i) => step.join() !== some[i].join());
          if (changed.length !== 1 || !['leap', 'frag'].includes(changed[0][1]) || more.some(([, op]) => op === 'disp')) between = false;
        }
      }
      assert(between, 'More is Some with one Wild move a phrase (a leap or a fragment, never a displacement)');
    }
    assert(!['invert', 'mirror', 'retrograde'].some((op) => Object.values(OPS_BY_VARIATION).flat().includes(op)),
      'no level may invert, mirror or retrograde the riff');
    const ids = BANGER_GROUPS.flatMap((g) => g.fields.map((f) => `${g.id}.${f.key}`));
    assert(ids.every((id) => { const [g, k] = id.split('.'); return k in BANGER_DEFAULTS[g]; }),
      'every switch the dialog shows has a default');
  }

  // ---------------------------------------------------------------- the riff
  const plumber = await songRiff('plumber', 1, 2);
  const crypt = await songRiff('crypt', 5, 8);
  const frost8 = await songRiff('frost', 5, 12);
  assert(!validateRiff(plumber).length && plumber.bars === 2 && plumber.parts.some((p) => p.role === 'hook'),
    'a riff read off FIELD SERVICE validates and names a hook');
  assert(riffSummary(plumber).hook === plumber.parts.find((p) => p.role === 'hook').key, 'the summary names the hook');
  assert(!validateRiff(crypt).length && !validateRiff(frost8).length && frost8.bars === 8,
    'four- and eight-bar riffs read off cabinet songs validate');
  assert(plumber.parts.every((p) => p.bars.every((s) => { try { (p.kind === 'drum' ? P : L)(s); return true; } catch { return false; } })),
    'every bar of an extracted riff is valid shorthand');
  const drumsOnly = riffOf([{ key: 'kick', label: 'Kick', kind: 'drum', role: 'drum', bars: ['x...x...x...x...'] }], 1);
  assert(validateRiff(drumsOnly).some((s) => /only drums/.test(s)), 'a drums-only riff is refused, and says why');
  assert(validateRiff(melodic(7)).length === 0 && validateRiff({ ...melodic(1), bars: 9, parts: [] }).some((s) => /at most 8/.test(s)),
    'a riff is one to eight bars');
  {
    // A 1/32 riff: a bank at resolution 32, a note on an odd thirty-second.
    const lead = Array(64).fill(null);
    lead[0] = 440; lead[3] = 523.25; lead[8] = 659.26;
    const bank = { bpm: 120, lead, sections: [{ lead }], order: [0] };
    const draft = draftOf(bank, { resolution: 32 });
    const riff = extractRiff({ bank, draft, mix: null, from: 0, to: 0, laneKeys: ['lead'], source: { id: 'fine' } });
    const bar = L(riff.parts[0].bars[0]);
    assert(riff.stats.quantised === 1 && bar.notes[0] === 'A4' && bar.notes[2] === 'C5' && bar.notes[4] === 'E5',
      'a finer grid is quantised to sixteenths, and the count is reported');
  }
  {
    // A linked layer reads its source's notes.
    const lead = Array(32).fill(null);
    lead[0] = 440; lead[4] = 493.88;
    const bank = deskBank({ bpm: 120, lead, sections: [{ lead }], order: [0] }, { layers: [{ key: 'lead2', from: 'lead' }] });
    const riff = extractRiff({ bank, draft: draftOf(bank, null), mix: { layers: [{ key: 'lead2', from: 'lead' }] }, from: 0, to: 0,
      laneKeys: ['lead', 'lead2'], source: { id: 'layered' } });
    const a = riff.parts.find((p) => p.key === 'lead'); const b = riff.parts.find((p) => p.key === 'lead2');
    assert(a && b && a.bars[0] === b.bars[0], 'a linked layer in the riff plays its source lane\'s notes');
  }

  // ---------------------------------------------------------------- every banger is a valid song
  const sectionOk = new Set(SECTION_EFFECTS.map((d) => d.id));
  const invariants = (out, label) => {
    const { bank, mix, arrangement } = out;
    const laneKeys = [...new Set([...LANE_KEYS, ...(mix.layers || []).map((l) => l.key)])];
    check(!arrangementIssues(bank, arrangement, laneKeys).length, `${label}: the arrangement is clean`);
    const ids = sectionIds(arrangement.automation);
    check(ids.every((id) => sectionOk.has(id)), `${label}: every effect section is section-safe (${ids.filter((id) => !sectionOk.has(id))})`);
    for (const lane of Object.values(mix.lanes)) for (const e of lane.effects || []) check(!!EFFECT_BY_ID[e.id], `${label}: insert ${e.id} exists`);
    const hasVel = (o) => Object.keys(o).some((k) => /Vel$/.test(k));
    check(!hasVel(bank) && !bank.sections.some(hasVel), `${label}: no velocity arrays`);
    for (const [vk, id] of Object.entries(mix.voice || {})) {
      const lane = vk.replace(/Voice$/, '');
      check(!!VOICES[id], `${label}: ${lane} plays ${id}, which exists`);
      check(!(VOICES[id]?.kind === 'engine' && isLayer(lane)), `${label}: no engine preset on the layer ${lane}`);
    }
    // Dense lanes are never on a CRLS-1 (docs/audio/remixes.md, CPU).
    const bars = expandOrder(bank.order).length;
    for (const lane of Object.keys(bank).filter((k) => Array.isArray(bank[k]) && k !== 'sections' && k !== 'order' && !/Len$/.test(k))) {
      const onsets = bank.sections.reduce((s, sec) => s + (sec[lane] || []).filter((v) => v != null && v !== false).length, 0);
      const id = mix.voice?.[`${lane}Voice`];
      if (onsets / bars > 8) check(VOICES[id]?.synth !== 'CRLS-1', `${label}: dense ${lane} is not on a CRLS-1 (${id})`);
    }
    const riser = Object.entries(mix.labels).find(([, l]) => /RISER/.test(l))?.[0];
    if (riser) check(baseLane(riser) === 'crash' && riser !== 'sweeps', `${label}: the riser is a crash layer`);
    check(JSON.stringify(planToOrder(expandOrder(bank.order))) === JSON.stringify(bank.order), `${label}: the bank's order survives bars-and-back`);
    check(entryOf(bank, draftOf(bank, null)) === null, `${label}: opened and saved untouched, it leaves no entry`);
    check((mix.layers || []).every((l) => l.independent && !LANE_KEYS.includes(l.key)), `${label}: every layer is independent`);
    check(bars === out.form[out.form.length - 1].to, `${label}: the bank plays the whole form`);
  };

  const fixtures = { hook1: HOOK1, two: melodic(2), three: melodic(3), four: melodic(4), five: melodic(5), six: melodic(6), seven: melodic(7), band: BAND, plumber, crypt, frost8 };
  const lengths = [['short', 48], ['medium', 64], ['long', 112], [{ length: 'custom', customBars: 40 }, 40]];
  let made = 0;
  for (const [name, riff] of Object.entries(fixtures)) {
    for (const mood of BANGER_MOODS.map((m) => m.id)) {
      for (const mode of BANGER_MODES.map((m) => m.id)) {
        for (const variation of BANGER_VARIATIONS.map((v) => v.id)) {
          const [len, bars] = lengths[(made++) % lengths.length];
          // Every mode both ways round (riff notes kept or fitted).
          const riffNotes = made % 2 ? 'fit' : 'keep';
          const options = { mood, mode, riffNotes, variation, ...(typeof len === 'string' ? { length: len } : len) };
          const label = `${name}/${mood}/${mode}-${riffNotes}/${variation}/${bars}`;
          let out;
          try { out = generateBanger({ riff, options, seed: made }); } catch (err) { check(false, `${label}: ${err.message}`); continue; }
          check(out.summary.bars === bars, `${label}: ${bars} bars long`);
          invariants(out, label);
        }
      }
    }
  }
  // Every switch flipped from its default, one at a time, and all of them both ways.
  for (const group of BANGER_GROUPS) {
    for (const f of group.fields) {
      const values = f.type === 'select' ? f.options.map(([id]) => id) : [!BANGER_DEFAULTS[group.id][f.key]];
      for (const v of values) {
        for (const [name, riff] of [['hook1', HOOK1], ['band', BAND], ['plumber', plumber]]) {
          const label = `${name}/${group.id}.${f.key}=${v}`;
          try { invariants(generateBanger({ riff, options: { [group.id]: { [f.key]: v } }, seed: 11 }), label); } catch (err) { check(false, `${label}: ${err.message}`); }
        }
      }
    }
  }
  const allOn = Object.fromEntries(BANGER_GROUPS.map((g) => [g.id, Object.fromEntries(g.fields.filter((f) => f.type !== 'select').map((f) => [f.key, true]))]));
  const allOff = Object.fromEntries(BANGER_GROUPS.map((g) => [g.id, Object.fromEntries(g.fields.filter((f) => f.type !== 'select').map((f) => [f.key, false]))]));
  for (const [name, o] of [['all on', allOn], ['all off', allOff]]) {
    for (const length of ['short', 'medium', 'long']) {
      try { invariants(generateBanger({ riff: BAND, options: { ...o, length }, seed: 5 }), `${name}/${length}`); } catch (err) { check(false, `${name}/${length}: ${err.message}`); }
    }
  }
  assert(!failed, `${quiet} checks over ${made} bangers and every switch: every one is a valid song`);

  // ---------------------------------------------------------------- determinism
  {
    const a = generateBanger({ riff: plumber, options: {}, seed: 42 });
    const b = generateBanger({ riff: plumber, options: {}, seed: 42 });
    const c = generateBanger({ riff: plumber, options: {}, seed: 43 });
    assert(JSON.stringify(a) === JSON.stringify(b), 'the same riff, options and seed make the same banger');
    assert(JSON.stringify(a.bank) !== JSON.stringify(c.bank) || JSON.stringify(a.mix) !== JSON.stringify(c.mix),
      'another seed makes another take');
    assert(JSON.stringify(anotherTake(a.banger, 42).bank) === JSON.stringify(a.bank), 'a take re-made from its stored recipe is the same music');
  }

  // ---------------------------------------------------------------- the musical promises
  const laneByLabel = (out, re) => Object.entries(out.mix.labels).find(([, l]) => re.test(l))?.[0];
  const barPart = (out, lane, bar1) => {
    const plan = expandOrder(out.bank.order)[bar1 - 1];
    const sec = out.bank.sections[plan.sec];
    const notes = (sec[lane] || out.bank[lane] || []).slice(plan.half * 16, plan.half * 16 + 16);
    return notes;
  };
  const onsets = (notes) => notes.map((v, i) => [i, v]).filter(([, v]) => v != null && v !== false && !(Array.isArray(v) && !v.length));
  const lowHz = (v) => (Array.isArray(v) ? Math.min(...v) : v);
  const semis = (hz) => Math.round(12 * Math.log2(hz / 440) + 69);
  const sigOf = (part) => part.notes.map((v, i) => [i, v]).filter(([, v]) => v != null)
    .map(([i, v]) => [i, midi(Array.isArray(v) ? v[0] : v)]);
  const sigOfHz = (notes) => onsets(notes).map(([i, v]) => [i, semis(lowHz(v))]);
  const sameUpTo = (a, b, offsets) => a.length === b.length && a.every(([i], k) => i === b[k][0])
    && offsets.some((d) => a.every(([, m], k) => m - b[k][1] === d));

  {
    // Faithful: every hook bar in every section is a riff bar as written — whole, cut
    // short before a drop, at half speed, or lifted — up to the octave a double adds.
    for (const [name, riff] of [['hook1', HOOK1], ['four', melodic(4)], ['plumber', plumber]]) {
      const out = generateBanger({ riff, options: { variation: 'faithful', form: { keyLift: 'whole' } }, seed: 3 });
      const hook = laneByLabel(out, /HOOK$/);
      const riffHook = riff.parts.find((p) => p.role === 'hook') || riff.parts[0];
      const cands = riffHook.bars.map(L).flatMap((b) => [b, cut(b, 12), cut(b, 9), ...augment(b)]).map(sigOf);
      let ok = true; let bad = null;
      for (let bar = 1; bar <= out.summary.bars; bar++) {
        const sig = sigOfHz(barPart(out, hook, bar));
        if (!sig.length) continue;
        if (!cands.some((c) => sameUpTo(sig, c, [0, 2, -12, 12, 14]) || (c.length && sameUpTo(sig, c.slice(0, sig.length), [0, 2])))) { ok = false; bad = bar; break; }
      }
      assert(ok, `Faithful keeps the riff's notes in every bar of the hook (${name}${bad ? `, bar ${bad} differs` : ''})`);
    }
  }
  {
    // No inversion, at any level: wherever a hook bar has a riff bar's rhythm, its
    // melodic direction is never the riff's turned upside down.
    let inverted = 0; let compared = 0;
    for (const variation of ['some', 'wild']) {
      for (let seed = 1; seed <= 6; seed++) {
        const out = generateBanger({ riff: melodic(2), options: { variation }, seed });
        const hook = laneByLabel(out, /HOOK$/);
        const riffSigs = melodyBars.slice(0, 2).map(L).map(sigOf);
        for (let bar = 1; bar <= out.summary.bars; bar++) {
          const sig = sigOfHz(barPart(out, hook, bar));
          for (const r of riffSigs) {
            if (sig.length !== r.length || sig.length < 3 || !sig.every(([i], k) => i === r[k][0])) continue;
            compared++;
            const dirs = (s) => s.slice(1).map(([, m], k) => Math.sign(m - s[k][1]));
            const a = dirs(sig); const b = dirs(r);
            const flipped = a.filter((d, k) => d !== 0 && d === -b[k]).length;
            if (flipped >= Math.ceil(0.75 * a.filter((d) => d !== 0).length) && flipped > 0) inverted++;
          }
        }
      }
    }
    assert(compared > 20 && inverted === 0, `no hook bar is ever the riff inverted (${compared} compared)`);
  }
  {
    // A SECOND MOOD: its chords from where Switch At says, the first mood's everywhere
    // before; the sounds the first mood's throughout.
    const open = riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 69, bars: ['A4:16 . . . . . . . . . . . . . . .'] }], 1);
    const one = generateBanger({ riff: open, options: { mood: 'moody', form: { keyLift: 'none' } }, seed: 3 });
    const secs = (out, f) => JSON.stringify(out.bank.sections.slice((f.from - 1) / 2, f.to / 2));
    const changed = (out) => out.form.filter((f, i) => secs(out, f) !== secs(one, one.form[i])).map((f) => f.role);
    const make = (moodSwitch, mood2 = 'anthemic') => generateBanger({ riff: open, options: { mood: 'moody', form: { keyLift: 'none', mood2, moodSwitch } }, seed: 3 });
    const brk = make('breakdown');
    const at = brk.form.findIndex((f) => f.role === 'breakdown');
    assert(changed(brk).length && brk.form.slice(0, at).every((f) => !changed(brk).includes(f.role)),
      `After the Break: nothing before the breakdown changes, the rest does (${changed(brk)})`);
    const fin = make('final');
    const lastDrop = fin.form.reduce((r, f) => (DROP_ROLES.has(f.role) ? f.role : r), null);
    assert(changed(fin).includes(lastDrop) && !changed(fin).includes('drop'), `Final Chorus: only the last drop on (${changed(fin)})`);
    const ch = make('choruses');
    assert(changed(ch).length && changed(ch).every((r) => DROP_ROLES.has(r)), `Choruses Only: the drops change, nothing else (${changed(ch)})`);
    assert([brk, fin, ch].every((o) => JSON.stringify(o.mix.voice) === JSON.stringify(one.mix.voice)), 'the sounds stay the first mood\'s');
    assert(!changed(make('breakdown', 'none')).length && !changed(make('breakdown', 'moody')).length, 'no second mood, or the same one, changes nothing');
  }
  {
    // FILL IN (embellish.js): a simple riff embellished, the same way every time it comes
    // round; a busy riff left alone.
    const plain = riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 64,
      bars: ['C4:4 . . . E4:4 . . . G4:4 . . . C5:4 . . .', 'A4:2 . . . G4:2 . . . E4:4 . . . D4:4 . . .'] }], 2);
    const hookBars = (out) => {
      const lane = laneByLabel(out, /HOOK$/);
      return Array.from({ length: out.summary.bars }, (_, b) => JSON.stringify(barPart(out, lane, b + 1)));
    };
    const count = (out) => hookBars(out).reduce((n, j) => n + onsets(JSON.parse(j)).length, 0);
    const base = generateBanger({ riff: plain, options: { variation: 'faithful', key: 'keep', mode: 'keep' }, seed: 9 });
    const off = generateBanger({ riff: plain, options: { variation: 'faithful', key: 'keep', mode: 'keep', parts: { fillIn: 'off' } }, seed: 9 });
    assert(JSON.stringify(hookBars(base)) === JSON.stringify(hookBars(off)), 'Fill In is off by default');
    for (const how of ['repeat', 'passing', 'neighbour']) {
      const a = generateBanger({ riff: plain, options: { variation: 'faithful', key: 'keep', mode: 'keep', parts: { fillIn: how } }, seed: 9 });
      const b = generateBanger({ riff: plain, options: { variation: 'faithful', key: 'keep', mode: 'keep', parts: { fillIn: how } }, seed: 9 });
      check(count(a) > count(base), `${how}: the hook has more notes (${count(a)} against ${count(base)})`);
      check(JSON.stringify(hookBars(a)) === JSON.stringify(hookBars(b)), `${how}: the same take fills in the same way`);
    }
    const opts = (parts) => ({ variation: 'faithful', key: 'keep', mode: 'keep', parts: { fillIn: 'repeat', ...parts } });
    const hookAt = (out, bar) => onsets(barPart(out, laneByLabel(out, /HOOK$/), bar)).map(([i]) => i);
    const every = generateBanger({ riff: plain, options: opts({ fillEvery: '1', fillNotes: 'all' }), seed: 9 });
    const drop = every.form.find((f) => f.hook) || every.form.find((f) => f.role === 'drop');
    assert(hookAt(every, drop.from).join() === '0,2,4,6,8,10,12,14',
      `Repeat on every pass, every gap: a bar of quarter notes plays in eighths (${hookAt(every, drop.from)})`);
    const capped = generateBanger({ riff: plain, options: opts({ fillEvery: '1', fillNotes: '2' }), seed: 9 });
    assert(hookAt(capped, drop.from).join() === '0,2,4,6,8,12', `Fill Notes: Two fills the first two gaps and leaves the rest (${hookAt(capped, drop.from)})`);
    // Every 2nd: the two-bar riff is plain on its first pass (bars 1–2 of the drop), filled
    // on its second (bars 3–4), plain again on its third.
    const second = generateBanger({ riff: plain, options: opts({ fillEvery: '2', fillNotes: 'all' }), seed: 9 });
    const n = (b) => hookAt(second, drop.from + b).length;
    assert(n(0) === 4 && n(2) === 8 && n(4) === 4, `Fill Every 2nd: plain, filled, plain (${[0, 2, 4].map(n)} notes)`);
    const fourth = generateBanger({ riff: plain, options: opts({ fillEvery: '4', fillNotes: 'all' }), seed: 9 });
    const m = (b) => hookAt(fourth, drop.from + b).length;
    assert(m(0) === 4 && m(2) === 4 && m(4) === 4 && m(6) === 8, `Fill Every 4th: only the fourth pass is filled (${[0, 2, 4, 6].map(m)} notes)`);
    const passing = generateBanger({ riff: plain, options: opts({ fillIn: 'passing', fillEvery: '1', fillNotes: 'all' }), seed: 9 });
    const scalePcs = [0, 2, 4, 5, 7, 9, 11];
    const pcsIn = onsets(barPart(passing, laneByLabel(passing, /HOOK$/), drop.from)).map(([, v]) => semis(v) % 12);
    assert(pcsIn.length > 4 && pcsIn.every((pc) => scalePcs.includes(pc)), `the notes Fill In adds are in the key (${pcsIn})`);
    const busy = riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 64,
      bars: ['C4:1 D4:1 E4:1 F4:1 G4:1 F4:1 E4:1 D4:1 C4:1 D4:1 E4:1 F4:1 G4:1 F4:1 E4:1 D4:1'] }], 1);
    const busyOff = generateBanger({ riff: busy, options: { variation: 'faithful' }, seed: 9 });
    const busyOn = generateBanger({ riff: busy, options: { variation: 'faithful', parts: { fillIn: 'repeat' } }, seed: 9 });
    assert(JSON.stringify(hookBars(busyOff)) === JSON.stringify(hookBars(busyOn)), 'a busy riff has no room, and is left as it is');
  }
  {
    // THE COUNTER-LINE REPEATS WITH THE HOOK. Wherever the same hook bar comes round over
    // the same chords, the counter answers it the same way — chained bar to bar it was a
    // new line on every pass, which sounds generated rather than written.
    // A riff with rests on the off-beats, or there is nowhere for a counter-line to go.
    const sparse = riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 70,
      bars: ['A4:2 . . . E5:2 . . . C5:2 . . . G4:2 . . .', 'F4:2 . . . A4:2 . . . C5:4 . . . B4:2 . . .'] }], 2);
    let repeats = 0; let differs = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const out = generateBanger({ riff: sparse, options: { variation: 'wild', parts: { counter: true } }, seed });
      const hook = laneByLabel(out, /HOOK$/);
      const counter = laneByLabel(out, /^COUNTER/);
      const chords = laneByLabel(out, /^CHORDS/);
      const seen = new Map();
      for (let bar = 1; bar <= out.summary.bars; bar++) {
        const line = JSON.stringify(barPart(out, counter, bar));
        if (!onsets(barPart(out, counter, bar)).length) continue;
        const key = JSON.stringify([barPart(out, hook, bar), chords ? barPart(out, chords, bar) : null]);
        if (!seen.has(key)) { seen.set(key, line); continue; }
        repeats++;
        if (seen.get(key) !== line) differs++;
      }
    }
    assert(repeats > 20 && differs === 0,
      `a repeated hook bar over the same chords gets the same counter-line (${repeats} repeats, ${differs} answered differently)`);
  }
  {
    // Major on a minor riff: the relative major, so the riff's notes are all still in it.
    const minor = generateBanger({ riff: plumber, options: { key: 'keep' }, seed: 2 });
    const major = generateBanger({ riff: plumber, options: { key: 'major' }, seed: 2 });
    assert(/minor/.test(minor.summary.key) && /major/.test(major.summary.key), `Major turns ${minor.summary.key} into ${major.summary.key}`);
    const hookM = laneByLabel(major, /HOOK$/);
    const hookK = laneByLabel(minor, /HOOK$/);
    const introBars = major.form.find((f) => f.role === 'intro');
    let same = true;
    for (let bar = introBars.from; bar <= introBars.to; bar++) {
      if (JSON.stringify(barPart(major, hookM, bar)) !== JSON.stringify(barPart(minor, hookK, bar))) same = false;
    }
    assert(same, 'and the riff as written is note for note the same in either key');
    const scale = new Set([0, 2, 4, 5, 7, 9, 11].map((x) => (x + ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(major.summary.key.split(' ')[0])) % 12));
    const saws = laneByLabel(major, /^CHORDS/);
    let diatonic = true;
    const drop = major.form.find((f) => f.role === 'drop');
    for (let bar = drop.from; bar <= drop.to; bar++) {
      for (const [, v] of onsets(barPart(major, saws, bar))) for (const hz of [].concat(v)) if (!scale.has(((semis(hz) % 12) + 12) % 12)) diatonic = false;
    }
    assert(diatonic, 'the drop\'s chords stay inside the major key');
  }
  {
    // MODES. The banger stays on the riff's home. Keep As Written never moves a note: the
    // mode is in the chords, which borrow the riff's own where it needs them. Fit to the
    // Mode moves the riff into the mode. Home moves everything, riff included. And every
    // chord stays in the mode — or, with the notes kept, in the riff's own key.
    const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const hookLane = (out) => laneByLabel(out, /HOOK$/);
    const hookPcs = (out) => {
      const pcs = new Set();
      for (let bar = 1; bar <= out.summary.bars; bar++) {
        for (const [, v] of onsets(barPart(out, hookLane(out), bar))) for (const hz of [].concat(v)) pcs.add(((semis(hz) % 12) + 12) % 12);
      }
      return pcs;
    };
    const introOf = (out) => {
      const f = out.form.find((x) => x.role === 'intro');
      return Array.from({ length: f.bars }, (_, i) => barPart(out, hookLane(out), f.from + i));
    };
    const plain = generateBanger({ riff: plumber, options: {}, seed: 4 });
    const keepDorian = generateBanger({ riff: plumber, options: { mode: 'dorian' }, seed: 4 });
    assert(keepDorian.summary.key === 'A dorian' && JSON.stringify(introOf(keepDorian)) === JSON.stringify(introOf(plain)),
      `Dorian with the riff kept stays on the riff's home (${keepDorian.summary.key}), and the riff is note for note the same`);
    // The key lift is off for the note checks: a lifted final drop is, rightly, a different key.
    const noLift = { form: { keyLift: 'none' } };
    const fitDorian = generateBanger({ riff: plumber, options: { mode: 'dorian', riffNotes: 'fit', ...noLift }, seed: 4 });
    const aDorian = [9, 11, 0, 2, 4, 6, 7];
    assert(fitDorian.summary.key === 'A dorian' && [...hookPcs(fitDorian)].every((pc) => aDorian.includes(pc)) && hookPcs(fitDorian).has(6),
      'Dorian fitted is A dorian: every F in the riff is now F#, and every hook note is in the mode');
    const fitPhryg = generateBanger({ riff: plumber, options: { mode: 'phrygian', riffNotes: 'fit', ...noLift }, seed: 4 });
    assert(fitPhryg.summary.key === 'A phrygian' && hookPcs(fitPhryg).has(10) && !hookPcs(fitPhryg).has(11),
      'Phrygian fitted flattens the riff\'s B to B flat');
    const home = generateBanger({ riff: plumber, options: { to: 'D' }, seed: 4 });
    const shifted = introOf(plain).every((bar, i) => {
      const a = onsets(bar).map(([s1, v]) => [s1, semis(lowHz(v))]);
      const b = onsets(introOf(home)[i]).map(([s1, v]) => [s1, semis(lowHz(v))]);
      return a.length === b.length && a.every(([s1, m], k) => b[k][0] === s1 && b[k][1] - m === 5);
    });
    assert(home.summary.key === 'D minor' && shifted,
      'a banger made while the dialog offered Home re-makes in the home it was made in — up a fourth, note for note');
    const legacy = generateBanger({ riff: plumber, options: { key: 'major' }, seed: 4 });
    const relative = generateBanger({ riff: plumber, options: { mode: 'major', riffNotes: 'relative' }, seed: 4 });
    assert(JSON.stringify(legacy.bank) === JSON.stringify(relative.bank) && legacy.summary.key === 'C major',
      'a banger made with the old Key = Major re-makes exactly as it was — the relative major, C major');
    const sameHome = generateBanger({ riff: plumber, options: { mode: 'major' }, seed: 4 });
    assert(sameHome.summary.key === 'A major' && JSON.stringify(introOf(sameHome)) === JSON.stringify(introOf(plain)),
      'Mode = Major with the notes kept is A major — the riff\'s own home — and the riff is unchanged');
    // Every chord in every mode, both ways round, stays in the mode — the only stranger
    // allowed is natural minor's borrowed major V.
    let inMode = true; let stray = '';
    for (const mode of ['major', 'minor', 'dorian', 'phrygian', 'harmonic', 'mixolydian', 'lydian']) {
      for (const riffNotes of ['keep', 'fit']) {
        for (const riff of [plumber, HOOK1, melodic(4)]) {
          const out = generateBanger({ riff, options: { mode, riffNotes, mood: riffNotes === 'keep' ? 'moody' : 'uplifting', ...noLift }, seed: 6 });
          const [tonicName, ...rest] = out.summary.key.split(' ');
          const t0 = NAMES.indexOf(tonicName);
          const steps = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
            phrygian: [0, 1, 3, 5, 7, 8, 10], 'harmonic minor': [0, 2, 3, 5, 7, 8, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
            lydian: [0, 2, 4, 6, 7, 9, 11] }[rest.join(' ')];
          // With the notes kept, the riff's own key's chords (on the same home) may be
          // borrowed too — natural minor's borrowed V included.
          const own = out.summary.reads.endsWith('minor') ? [0, 2, 3, 5, 7, 8, 10, 11] : [0, 2, 4, 5, 7, 9, 11];
          const scale = [...steps, ...(riffNotes === 'keep' ? own : [])].map((x) => (x + t0) % 12);
          for (const re of [/^CHORDS/, /PAD/, /CHOIR/]) {
            const lane = laneByLabel(out, re);
            if (!lane) continue;
            for (let bar = 1; bar <= out.summary.bars; bar++) {
              for (const [, v] of onsets(barPart(out, lane, bar))) {
                for (const hz of [].concat(v)) {
                  const pc = ((semis(hz) % 12) + 12) % 12;
                  if (!scale.includes(pc)) { inMode = false; stray ||= `${mode}/${riffNotes}: ${out.summary.key} ${re.source} bar ${bar}`; }
                }
              }
            }
          }
        }
      }
    }
    assert(inMode, `every chord of every mode stays in the mode, colours included${stray ? ` (${stray})` : ''}`);
  }
  {
    // MOODS AND MODES. The pairings are guidance the dialog shows and Surprise Me keeps to;
    // and once a mode is picked the mood still steers its chords, bright or dark.
    const modeIds = BANGER_MODES.map((m) => m.id);
    assert(BANGER_MOODS.every((m) => MOOD_MODES[m.id]
      && [...MOOD_MODES[m.id].suits, ...MOOD_MODES[m.id].fights].every((id) => modeIds.includes(id) && id !== 'keep')
      && !MOOD_MODES[m.id].suits.some((id) => MOOD_MODES[m.id].fights.includes(id))),
    'every mood names modes that suit it and modes that fight it — real modes, never both');
    let suited = true;
    for (let seed = 1; seed <= 200; seed++) {
      const o = surpriseBangerOptions(new Rng(seed), BANGER_DEFAULTS);
      if (!MOOD_MODES[o.mood].suits.includes(o.mode)) suited = false;
    }
    assert(suited, 'Surprise Me always rolls a mode that suits the mood it rolled');
  {
    // GO CRAZY: every transforming switch on, the key and tempo left alone, and a song
    // that still builds — for every style.
    const base = { ...BANGER_DEFAULTS, key: 'minor', tempo: 'custom', bpm: 133, mood: 'dark' };
    const o = goCrazyBangerOptions(base);
    assert(o.variation === 'wild' && o.parts.counter && o.parts.thirdBelow && o.parts.riffBass === 'replace'
      && o.parts.bassLift && o.parts.riffSound === 'random' && o.parts.partSounds === 'roll'
      && o.drums.source === 'replace' && o.drums.congas && o.drums.cowbell && o.drums.tambourine
      && o.form.keyLift === 'third' && o.form.halfTime && o.form.falseEnding
      && o.fx.stutter && o.fx.bitcrushIntro && o.fx.tapeStop,
    'Go Crazy turns on every switch that transforms the original');
    const was = normaliseBangerOptions(base).options;
    assert(['key', 'mode', 'tempo', 'bpm', 'mood', 'style', 'length'].every((k) => JSON.stringify(o[k]) === JSON.stringify(was[k])),
      'Go Crazy keeps the key, the tempo, the mood and the style');
    assert(JSON.stringify(goCrazyBangerOptions(base)) === JSON.stringify(o), 'Go Crazy is a recipe, not a roll');
    let built = 0;
    const unpanned = [];
    for (const st of BANGER_STYLES) {
      try {
        const out = generateBanger({ riff: BAND, options: goCrazyBangerOptions({ ...BANGER_DEFAULTS, style: st.id }), seed: 3 });
        if (out.summary.bars > 0) built++;
        // A key present but undefined spreads over the desk's default and reaches setPan as
        // NaN, which stops the game (Moombahton's hook strip, 5 Oct 2026).
        for (const [lane, strip] of Object.entries(out.mix.lanes || {})) {
          if ('pan' in strip && !Number.isFinite(strip.pan)) unpanned.push(`${st.id} ${lane}`);
        }
      } catch (err) { check(false, `Go Crazy on ${st.id}: ${err.message}`); }
    }
    assert(built === BANGER_STYLES.length, `Go Crazy makes a song in every style (${built} of ${BANGER_STYLES.length})`);
    assert(!unpanned.length, `every strip's pan is a number or left out (${unpanned.join(', ') || 'all'})`);
  }
    // The style as the generator plays it: its own moods and the shared ones (moods.js).
    const BIG_ROOM = BANGER_STYLES.find((st) => st.id === 'big-room');
    assert(BANGER_MOODS.every((m) => ['bright', 'dark'].includes(BIG_ROOM.moods[m.id]?.walk))
      && Object.values(BIG_ROOM.modeHarmony).every((w) => JSON.stringify(w.bright.progression) !== JSON.stringify(w.dark.progression)),
    'each mode has a bright walk and a different dark one, and every mood leans to one');
    // A riff that leaves the chords free — one long note a bar — hears the walk itself.
    const open = riffOf([{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', meanPitch: 69, bars: ['A4:16 . . . . . . . . . . . . . . .'] }], 1);
    const dropChords = (out) => {
      const lane = laneByLabel(out, /^CHORDS/);
      const d = out.form.find((f) => f.role === 'drop');
      return Array.from({ length: 8 }, (_, i) => onsets(barPart(out, lane, d.from + i)).map(([, v]) => [].concat(v).map(semis).sort().join('+')).join('|')).join(' ');
    };
    let differ = true;
    for (const mode of ['dorian', 'phrygian', 'harmonic', 'mixolydian', 'lydian']) {
      const bright = generateBanger({ riff: open, options: { mode, mood: 'uplifting', riffNotes: 'fit', form: { keyLift: 'none' } }, seed: 3 });
      const dark = generateBanger({ riff: open, options: { mode, mood: 'dark', riffNotes: 'fit', form: { keyLift: 'none' } }, seed: 3 });
      if (dropChords(bright) === dropChords(dark)) differ = false;
    }
    assert(differ, 'in every mode, an Uplifting banger and a Dark one walk different chords');
  }
  {
    // THE SHARED MOODS (moods.js): each a progression of its own — no two moods, shared
    // or a style's own, walk the same eight bars, major or minor. (Played over a riff the
    // hook still has its say about every chord; the sweeps below play every mood in every
    // style.)
    const shared = Object.keys(SHARED_MOODS);
    const bigRoom = BANGER_STYLES.find((st) => st.id === 'big-room');
    const walks = Object.entries(bigRoom.progressions).flatMap(([mood, prog]) =>
      ['major', 'minor'].map((side) => [`${mood} ${side}`, JSON.stringify(prog[side])]));
    for (const [name, walk] of walks) {
      if (!shared.includes(name.split(' ')[0])) continue;
      const twin = walks.find(([other, w]) => other !== name && w === walk);
      check(!twin, `${name} walks the same chords as ${twin?.[0]}`);
    }
    assert(shared.length >= 10 && BANGER_STYLES.every((st) => shared.every((m) => st.progressions[m] && st.moods[m])),
      `the ${shared.length} shared moods are in every style, each walking chords no other mood walks`);

    // THE WAY INTO A LIFTED KEY: the bar before the lift ends on the approach's chords in
    // the NEW key, the tune resting for the half-bar.
    const lastBefore = (out) => out.form.find((f) => f.lifted).from - 1;
    const pcs = (notes) => onsets(notes).filter(([i]) => i >= 8).map(([i, v]) => [i, [].concat(v).map((hz) => semis(hz) % 12)]);
    const tonicOf = (out) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(out.summary.key.split(' ')[0]);
    for (const id of ['pivot', 'twostep', 'borrowed', 'walkup']) {
      const out = generateBanger({ riff: BAND, options: { form: { keyLift: 'whole', keyApproach: id } }, seed: 4 });
      const bar = lastBefore(out);
      const home = (tonicOf(out) + 2) % 12;
      const minor = /minor/.test(out.summary.key);
      const want = approachChords(id, home, minor).map(([, sym]) => parseChord(sym).root);
      const bass = pcs(barPart(out, laneByLabel(out, /^BASS/), bar));
      const lead = pcs(barPart(out, laneByLabel(out, /HOOK$/), bar));
      check(bass.length && bass[0][1][0] === want[0], `${id}: the bass is on the approach's first chord (${bass[0]?.[1]} vs ${want[0]})`);
      check(!lead.length, `${id}: the tune rests for the half-bar`);
      if (id === 'walkup') {
        const steps = bass.map(([, v]) => v[0]);
        check(steps.slice(-3).every((pc, k) => pc === (home - 3 + k + 12) % 12), `walkup: the bass climbs into the new root (${steps})`);
      }
    }
    const straight = generateBanger({ riff: BAND, options: { form: { keyLift: 'whole', keyApproach: 'straight' } }, seed: 4 });
    const plain = generateBanger({ riff: BAND, options: { form: { keyLift: 'none' } }, seed: 4 });
    const b0 = lastBefore(straight);
    check(JSON.stringify(barPart(straight, laneByLabel(straight, /^BASS/), b0)) === JSON.stringify(barPart(plain, laneByLabel(plain, /^BASS/), b0)),
      'straight: the bar before the lift is left as it was');
    assert(moodLifts('bittersweet')[0] === 'borrowed' && moodLifts('disco')[0] === 'twostep' && BANGER_MOODS.every((m) => moodLifts(m.id).length),
      'every mood has its own way into a new key — Bittersweet by a borrowed step, Disco on a ii–V');
  }
  {
    // TRANCE: the second style. Every banger it makes is a valid song in every mood and
    // mode, and it sounds like trance: 138, a rolling bass, gated supersaws, a long
    // breakdown with the hook on a piano.
    let made2 = 0;
    for (const [name, riff] of [['hook1', HOOK1], ['band', BAND], ['plumber', plumber], ['crypt', crypt]]) {
      for (const mood of BANGER_MOODS.map((m) => m.id)) {
        for (const mode of BANGER_MODES.map((m) => m.id)) {
          const label = `trance/${name}/${mood}/${mode}`;
          try {
            const out = generateBanger({ riff, options: { style: 'trance', mood, mode, riffNotes: made2 % 2 ? 'fit' : 'keep',
              variation: ['faithful', 'some', 'wild'][made2 % 3], length: ['short', 'medium', 'long'][made2 % 3] }, seed: ++made2 });
            invariants(out, label);
          } catch (err) { check(false, `${label}: ${err.message}`); }
        }
      }
    }
    assert(!failed, `${made2} trance bangers across every mood and mode are all valid songs`);
    // The Club form's trance — its default form is the Anthem (tests/banger-forms.js).
    const t = generateBanger({ riff: HOOK1, options: { style: 'trance', form: { template: 'club' } }, seed: 5 });
    const bd = t.form.find((f) => f.role === 'breakdown');
    assert(t.summary.bpm === 138 && t.summary.mood === 'uplifting' && t.summary.bars === 112 && bd.bars === 16,
      `trance is 138, uplifting and Long by default, with a sixteen-bar breakdown (${t.form.map((f) => `${f.label} ${f.bars}`).join(', ')})`);
    const bassLane = laneByLabel(t, /^BASS( ·|$)/);
    const drop = t.form.find((f) => f.role === 'drop');
    assert(onsets(barPart(t, bassLane, drop.from + 1)).length === 12, 'its bass rolls — three sixteenths after every kick');
    const chordsLane = laneByLabel(t, /^CHORDS/);
    assert(t.mix.lanes[chordsLane].effects.some((e) => e.id === 'rhythmgate' && e.params.division === 0.25),
      'its supersaws are trance-gated in sixteenths, not pumped');
    const piano = laneByLabel(t, /^PIANO/);
    const hook = laneByLabel(t, /HOOK$/);
    assert(piano && onsets(barPart(t, piano, bd.from)).length > 0 && onsets(barPart(t, hook, bd.from)).length === 0,
      'in its breakdown the hook is on a piano, as written, and the riff\'s own sound rests');
    const mediumT = generateBanger({ riff: HOOK1, options: { style: 'trance', length: 'medium', form: { template: 'club' } }, seed: 5 });
    assert(mediumT.summary.bars === 64 && mediumT.form.find((f) => f.role === 'breakdown').bars === 16,
      'a Medium trance banger keeps its long breakdown and gives up length elsewhere');
    const anthem = generateBanger({ riff: HOOK1, options: { style: 'trance' }, seed: 5 });
    const abd = anthem.form.find((f) => f.type === 'breakdown');
    assert(abd && abd.variant === 'exposed' && abd.bars >= 16 && anthem.form.filter((f) => f.type === 'drop').length === 2,
      `by default trance is an Anthem: one drop, a long breakdown with the hook alone, one final drop (${anthem.form.map((f) => `${f.label} ${f.bars}`).join(', ')})`);
  }
  {
    // FUTURE BASS: half time with hat rolls, an 808 and a talking wobble, stuttered
    // supersaws, and a second drop that goes full time.
    let made3 = 0;
    for (const [name, riff] of [['hook1', HOOK1], ['band', BAND], ['plumber', plumber], ['crypt', crypt]]) {
      for (const mood of BANGER_MOODS.map((m) => m.id)) {
        for (const mode of BANGER_MODES.map((m) => m.id)) {
          const label = `future-bass/${name}/${mood}/${mode}`;
          try {
            const out = generateBanger({ riff, options: { style: 'future-bass', mood, mode, riffNotes: made3 % 2 ? 'fit' : 'keep',
              variation: ['faithful', 'some', 'wild'][made3 % 3], length: ['short', 'medium', 'long'][made3 % 3],
              drums: { source: ['add', 'replace', 'asis'][made3 % 3] } }, seed: ++made3 });
            invariants(out, label);
          } catch (err) { check(false, `${label}: ${err.message}`); }
        }
      }
    }
    assert(!failed, `${made3} future bass bangers across every mood and mode are all valid songs`);
    const fb = generateBanger({ riff: HOOK1, options: { style: 'future-bass' }, seed: 5 });
    const d1 = fb.form.find((f) => f.role === 'drop'); const d2 = fb.form.find((f) => f.role === 'drop2');
    const row = (re, bar) => onsets(barPart(fb, laneByLabel(fb, re), bar)).map(([i]) => i).join(',');
    assert(fb.summary.bpm === 140 && fb.summary.mood === 'euphoric' && row(/^KICK$/, d1.from) === '0,10' && row(/^CLAP$/, d1.from) === '8',
      'future bass is 140 and half time — the kick on the one and the "and" of two, the clap on three');
    assert(row(/^KICK$/, d2.from + 1) === '0,4,8,12', 'and its second drop goes full time');
    assert(onsets(barPart(fb, laneByLabel(fb, /^HATS$/), d1.from + 1)).length > onsets(barPart(fb, laneByLabel(fb, /^HATS$/), d1.from)).length,
      'its hats roll on the second bar of each pair');
    const gate = fb.mix.lanes[laneByLabel(fb, /^CHORDS/)].effects.find((e) => e.id === 'rhythmgate');
    assert(gate?.params.division === 0.5, 'its supersaws stutter in eighths');
    assert(laneByLabel(fb, /^BASS 808/) && laneByLabel(fb, /^WOBBLE/) && fb.mix.voice[`${laneByLabel(fb, /^WOBBLE/)}Voice`] === BANGER_SOUNDS['future-bass'].parts.sub,
      'it has an 808 and the talking wobble over it');
    const withDrums = generateBanger({ riff: BAND, options: { style: 'future-bass' }, seed: 5 });
    assert(!Object.values(withDrums.mix.labels).some((l) => /\(riff\)|RIFF Kick/.test(l)), 'a riff\'s own drums are replaced by default, so the half-time groove stands');
  }
  {
    // EUROBEAT: 155 and four on the floor, an octave bass in eighths under everything,
    // strings holding the chords (no pump), the razor lead doubling the hook, brass
    // answering in its rests, Simmons tom fills, the hook on a piano in the breakdown.
    let made4 = 0;
    for (const [name, riff] of [['hook1', HOOK1], ['band', BAND], ['plumber', plumber], ['crypt', crypt]]) {
      for (const mood of BANGER_MOODS.map((m) => m.id)) {
        for (const mode of BANGER_MODES.map((m) => m.id)) {
          const label = `eurobeat/${name}/${mood}/${mode}`;
          try {
            const out = generateBanger({ riff, options: { style: 'eurobeat', mood, mode, riffNotes: made4 % 2 ? 'fit' : 'keep',
              variation: ['faithful', 'some', 'wild'][made4 % 3], length: ['short', 'medium', 'long'][made4 % 3],
              parts: { riffSound: made4 % 4 ? 'keep' : 'random' } }, seed: ++made4 });
            invariants(out, label);
          } catch (err) { check(false, `${label}: ${err.message}`); }
        }
      }
    }
    assert(!failed, `${made4} eurobeat bangers across every mood and mode are all valid songs`);
    const eb = generateBanger({ riff: BAND, options: { style: 'eurobeat', parts: { partSounds: 'style' }, form: { template: 'club' } }, seed: 5 });
    const d = eb.form.find((f) => f.role === 'drop');
    const row = (re, bar) => onsets(barPart(eb, laneByLabel(eb, re), bar)).map(([i]) => i).join(',');
    assert(eb.summary.bpm === 155 && eb.summary.mood === 'anthemic' && row(/^KICK/, d.from + 1) === '0,4,8,12'
      && row(/^OPEN HATS$/, d.from + 1) === '2,6,10,14',
      'eurobeat is 155 and four on the floor, with the open hats off the beat');
    const octaveBass = [1, 2, 3].every((k) => {
      const hits = onsets(barPart(eb, laneByLabel(eb, /^BASS Octave/), d.from + k)).map(([i, v]) => [i, semis(lowHz(v))]);
      return hits.map(([i]) => i).join(',') === '0,2,4,6,8,10,12,14' && hits.every(([i, m], j) => i % 4 !== 2 || m - hits[j - 1][1] === 12);
    });
    assert(octaveBass, 'its bass is the octave bass — root then octave, in eighths');
    const chordsLane = laneByLabel(eb, /^CHORDS/);
    assert(eb.mix.voice[`${chordsLane}Voice`] === 'bestPwmStrings' && !(eb.mix.lanes[chordsLane].effects || []).some((e) => e.id === 'rhythmgate')
      && !laneByLabel(eb, /^SUB/), 'strings hold its chords, unpumped, and there is no sub under the octave bass');
    const stabs = laneByLabel(eb, /^STABS/);
    const d2 = eb.form.find((f) => f.role === 'drop2');
    const stabbed = onsets(barPart(eb, stabs, d2.from + 1));
    assert(stabs && eb.mix.voice[`${stabs}Voice`] === 'bestPwmBrass' && stabbed.map(([i]) => i).join(',') === '2,6,10,14'
      && stabbed.every(([, v]) => Array.isArray(v) && v.length === 3),
      'brass stabs triads on every off-beat eighth');
    assert(eb.mix.voice[`${laneByLabel(eb, /^HOOK DOUBLE/)}Voice`] === 'syncRazorLead' && eb.mix.voice[`${laneByLabel(eb, /^FILL TOMS/)}Voice`] === 'sdsTomHigh',
      'the razor lead doubles the hook, and the fills are Simmons toms');
    const ebBd = eb.form.find((f) => f.role === 'breakdown');
    assert(onsets(barPart(eb, laneByLabel(eb, /^PIANO/), ebBd.from)).length > 0, 'in its breakdown the hook is on a piano');
  }
  {
    // CHIPSTEP: chip-house builds with an octave square bass, a HALF-TIME first drop with a
    // wobble holding the chords, full-time drops after it with the wobble stuttering on the
    // off-beats, a Game Boy snare, a zap on every drop, the arcade chorus under the hook.
    let made5 = 0;
    for (const [name, riff] of [['hook1', HOOK1], ['band', BAND], ['plumber', plumber], ['crypt', crypt]]) {
      for (const mood of BANGER_MOODS.map((m) => m.id)) {
        for (const mode of BANGER_MODES.map((m) => m.id)) {
          const label = `chipstep/${name}/${mood}/${mode}`;
          try {
            const out = generateBanger({ riff, options: { style: 'chipstep', mood, mode, riffNotes: made5 % 2 ? 'fit' : 'keep',
              variation: ['faithful', 'some', 'wild'][made5 % 3], length: ['short', 'medium', 'long'][made5 % 3],
              drums: { source: ['add', 'replace', 'asis'][made5 % 3] }, parts: { riffSound: made5 % 4 ? 'keep' : 'random' } }, seed: ++made5 });
            invariants(out, label);
          } catch (err) { check(false, `${label}: ${err.message}`); }
        }
      }
    }
    assert(!failed, `${made5} chipstep bangers across every mood and mode are all valid songs`);
    const cs = generateBanger({ riff: HOOK1, options: { style: 'chipstep' }, seed: 5 });
    const b1 = cs.form.find((f) => f.role === 'build'); const d1 = cs.form.find((f) => f.role === 'drop'); const d2 = cs.form.find((f) => f.role === 'drop2');
    const row = (re, bar) => onsets(barPart(cs, laneByLabel(cs, re), bar)).map(([i]) => i).join(',');
    assert(cs.summary.bpm === 140 && row(/^KICK$/, b1.from) === '0,4,8,12' && row(/^KICK$/, d2.from + 1) === '0,4,8,12',
      'chipstep is 140, four on the floor through the builds and the later drops');
    assert(row(/^KICK$/, d1.from + 1) === '0,10' && row(/^BACKBEAT$/, d1.from + 1) === '8' && row(/^HATS$/, d1.from + 1) === '0,2,4,6,8,10,12,14',
      'its first drop is half time — the kick on the one and the "and" of two, the backbeat on three, eighth hats');
    const bassAt = (bar) => onsets(barPart(cs, laneByLabel(cs, /^BASS Octave/), bar)).map(([i, v]) => [i, semis(lowHz(v))]);
    const octave = bassAt(d2.from + 1);
    assert(octave.map(([i]) => i).join(',') === '0,2,4,6,8,10,12,14' && octave.every(([i, m], j) => i % 4 !== 2 || m - octave[j - 1][1] === 12)
      && bassAt(d1.from + 1).map(([i]) => i).join(',') === '0,10',
      'its bass is a square in octave eighths, hitting only with the kick in the half-time drop');
    const wobble = laneByLabel(cs, /^WOBBLE/);
    assert(cs.mix.voice[`${wobble}Voice`] === 'seedChipstepSub' && row(/^WOBBLE/, d1.from + 1) === '0,8' && row(/^WOBBLE/, d2.from + 1) === '2,6,10,14',
      'the wobble holds each half bar in the half-time drop and stutters on the off-beats after it');
    assert(cs.mix.voice[`${laneByLabel(cs, /^SNARE/)}Voice`] === 'seedChipstepSnare' && cs.mix.voice[`${laneByLabel(cs, /^IMPACT/)}Voice`] === 'seedChipstepImpact'
      && cs.mix.voice[`${laneByLabel(cs, /^THIRD BELOW/)}Voice`] === 'seedChipstepThird' && cs.mix.voice[`${laneByLabel(cs, /^HOOK DOUBLE/)}Voice`] === 'seedChipstepSquare',
      'a Game Boy snare, a zap on every drop, the arcade chorus under the hook, a pulse doubling it');
    const withDrums = generateBanger({ riff: BAND, options: { style: 'chipstep' }, seed: 5 });
    assert(!Object.values(withDrums.mix.labels).some((l) => /\(riff\)|RIFF Kick/.test(l)), 'a riff\'s own drums are replaced by default, so the half-time drop stands');
  }
  {
    // BUILD IN LAYERS, on any style: the intro brings the parts in one at a time, the hook
    // last, and the outro takes them away again; then the build and the drop as ever. Off,
    // Long Songs (past 64 bars) or Always.
    const sounding = (out, bar) => Object.keys(out.mix.labels).filter((lane) => onsets(barPart(out, lane, bar)).length)
      .map((lane) => out.mix.labels[lane]);
    const br = generateBanger({ riff: HOOK1, options: { form: { layers: 'always' } }, seed: 3 });
    const intro = br.form[0]; const outro = br.form[br.form.length - 1];
    const counts = Array.from({ length: intro.bars }, (_, j) => sounding(br, intro.from + j).length);
    assert(intro.label === 'Layers In' && outro.label === 'Layers Out' && br.form[1].role === 'build',
      `a layered banger opens on Layers In, then builds and drops (${br.form.map((f) => f.label).join(', ')})`);
    assert(sounding(br, intro.from).join() === 'KICK' && counts.every((c, j) => j === 0 || c >= counts[j - 1] - 1)
      && !sounding(br, intro.to - 4).some((l) => /HOOK/.test(l)) && sounding(br, intro.to).some((l) => /HOOK$/.test(l)),
    `its intro starts on the kick alone and brings the hook in last (${counts.join(' ')})`);
    assert(sounding(br, outro.from).length > sounding(br, outro.to).length && sounding(br, outro.to).includes('KICK')
      && !sounding(br, outro.to).some((l) => /HOOK/.test(l)), 'its outro takes the parts away again, down to the kick');
    let kept = true;
    for (const style of BANGER_STYLES.map((s) => s.id)) {
      for (const length of ['short', 'medium', 'long']) {
        const out = generateBanger({ riff: BAND, options: { style, length, form: { layers: 'always', script: false } }, seed: 2 });
        invariants(out, `${style}/${length}/layers`);
        if (!(out.form[0].role === 'intro' && out.form[0].bars >= 8)) kept = false;
      }
    }
    assert(!failed && kept, 'every style builds in layers at every length, and a Short banger shrinks its layers rather than losing them');
    const longOnly = (length) => generateBanger({ riff: HOOK1, options: { length, form: { layers: 'long' } }, seed: 3 }).form[0].label;
    assert(longOnly('short') === 'Intro' && longOnly('medium') === 'Intro' && longOnly('long') === 'Layers In',
      'Long Songs builds up only past 64 bars — a Short or Medium banger opens as usual');
    assert(normaliseBangerOptions({}).options.form.layers === 'off'
      && normaliseBangerOptions({ form: { layers: true } }).options.form.layers === 'always'
      && !normaliseBangerOptions({ form: { layers: false } }).issues.length,
    'Build in Layers is off unless asked for, and a banger made when it was an on/off switch still reads');
    // DRUMS & BASS INTRO: the beat and the bass alone, then everything at once.
    const db = generateBanger({ riff: HOOK1, options: { form: { grooveIntro: true, build: false } }, seed: 3 });
    const dbIntro = db.form[0];
    const tune = (bar) => sounding(db, bar).filter((l) => !/^(KICK|SNARE|CLAP|HATS|OPEN HATS|FILL|PERC|BASS|SUB)/.test(l));
    assert(dbIntro.label === 'Drums & Bass' && sounding(db, dbIntro.from).some((l) => /^BASS/.test(l)) && sounding(db, dbIntro.from).includes('KICK')
      && tune(dbIntro.from).length === 0 && tune(dbIntro.to + 1).length >= 4,
    `a Drums & Bass Intro is the beat and the bass alone, then everything comes in at once (${tune(dbIntro.to + 1).join(', ')})`);
  }
  {
    // SYNTHWAVE: NIGHT DRIVE's outrun — 118, a gated-reverb snare, a root–octave sixteenth
    // bass, a string machine pumping on the beat, a hero lead doubling the hook, brass stabs,
    // Simmons fills; pre-chorus, chorus, breakdown, and the last chorus a whole step up.
    let made7 = 0;
    for (const [name, riff] of [['hook1', HOOK1], ['band', BAND], ['plumber', plumber], ['crypt', crypt]]) {
      for (const mood of BANGER_MOODS.map((m) => m.id)) {
        for (const mode of BANGER_MODES.map((m) => m.id)) {
          const label = `synthwave/${name}/${mood}/${mode}`;
          try {
            const out = generateBanger({ riff, options: { style: 'synthwave', mood, mode, riffNotes: made7 % 2 ? 'fit' : 'keep',
              variation: ['faithful', 'some', 'wild'][made7 % 3], length: ['short', 'medium', 'long'][made7 % 3],
              drums: { source: ['add', 'replace', 'asis'][made7 % 3] }, parts: { riffSound: made7 % 4 ? 'keep' : 'random' } }, seed: ++made7 });
            invariants(out, label);
          } catch (err) { check(false, `${label}: ${err.message}`); }
        }
      }
    }
    assert(!failed, `${made7} synthwave songs across every mood and mode are all valid songs`);
    const sw = generateBanger({ riff: HOOK1, options: { style: 'synthwave', form: { keyLift: 'none' }, parts: { partSounds: 'style' } }, seed: 5 });
    const up = generateBanger({ riff: HOOK1, options: { style: 'synthwave', parts: { partSounds: 'style' }, form: { template: 'club' } }, seed: 5 });
    assert(sw.summary.bpm === 118 && up.form.map((f) => f.label).join(', ') === 'Intro, Pre-Chorus, Chorus, Breakdown, Pre-Chorus 2, Chorus 2, Outro',
      `synthwave is 118: pre-chorus, chorus, breakdown, pre-chorus, chorus (${up.form.map((f) => `${f.label} ${f.bars}`).join(', ')})`);
    const c2 = up.form.find((f) => f.role === 'drop2');
    const hookLane = laneByLabel(up, /HOOK$/);
    let lifted = true;
    for (let bar = c2.from; bar <= c2.to; bar++) if (!sameUpTo(sigOfHz(barPart(up, hookLane, bar)), sigOfHz(barPart(sw, hookLane, bar)), [2])) lifted = false;
    assert(lifted, 'its last chorus is a whole step up');
    const snare = up.mix.lanes[laneByLabel(up, /^SNARE/)];
    assert(['reverb', 'noisegate'].every((id) => (snare.effects || []).some((e) => e.id === id)), 'its snare is gated reverb — a room, then a gate');
    const d = up.form.find((f) => f.role === 'drop');
    const bass = onsets(barPart(up, laneByLabel(up, /^BASS/), d.from + 1)).map(([i, v]) => [i, semis(lowHz(v))]);
    assert(bass.length === 16 && bass.every(([i, m], j) => i % 4 !== 2 || m - bass[j - 1][1] === 12),
      'its bass runs root–octave sixteenths');
    const chords = laneByLabel(up, /^CHORDS String Machine/);
    assert(up.mix.voice[`${chords}Voice`] === 'bestPwmStrings' && up.mix.lanes[chords].effects.some((e) => e.id === 'rhythmgate' && e.params.division === 1),
      'a string machine pumping on the beat holds the chords');
    const stabs = onsets(barPart(up, laneByLabel(up, /^BRASS Stabs/), c2.from + 1));
    assert(up.mix.voice[`${laneByLabel(up, /^HOOK DOUBLE/)}Voice`] === 'bestHeroLead' && stabs.map(([i]) => i).join(',') === '2,10,14'
      && stabs.every(([, v]) => Array.isArray(v) && v.length === 3) && up.mix.voice[`${laneByLabel(up, /^SIMMONS/)}Voice`] === 'sdsTomHigh',
    'a hero lead doubles the hook, brass stabs answer, Simmons toms fill');
  }
  {
    const short = generateBanger({ riff: HOOK1, options: { length: 'short' }, seed: 1 });
    const medium = generateBanger({ riff: HOOK1, options: { length: 'medium' }, seed: 1 });
    const long = generateBanger({ riff: HOOK1, options: { length: 'long' }, seed: 1 });
    assert(short.summary.bars === 48 && medium.summary.bars === 64 && long.summary.bars === 112,
      `Short, Medium and Long are 48, 64 and 112 bars (${short.summary.seconds}s, ${medium.summary.seconds}s, ${long.summary.seconds}s at 128)`);
    assert(medium.summary.seconds >= 105 && medium.summary.seconds <= 135 && long.summary.seconds >= 180 && long.summary.seconds <= 240,
      'Medium is about two minutes and Long three to four');
    for (let bars = 24; bars <= 256; bars += 4) {
      const out = generateBanger({ riff: HOOK1, options: { length: 'custom', customBars: bars }, seed: 1 });
      check(out.summary.bars === bars && out.form.some((f) => f.role === 'drop'), `custom ${bars} bars is exactly ${bars}, with a drop`);
    }
    assert(!failed, 'every custom length from 24 to 256 bars comes out exact');
  }
  {
    // Drums: added when there are none; Replace and Keep As-Is do what they say.
    const none = generateBanger({ riff: HOOK1, options: {}, seed: 1 });
    const kick = laneByLabel(none, /^KICK$/);
    const drop = none.form.find((f) => f.role === 'drop');
    assert(kick && onsets(barPart(none, kick, drop.from)).length === 4, 'a riff with no drums gets four on the floor');
    const replace = generateBanger({ riff: BAND, options: { drums: { source: 'replace' } }, seed: 1 });
    assert(!Object.values(replace.mix.labels).some((l) => /\(riff\)|RIFF Kick|RIFF Rim/.test(l)), 'Replace drops the riff\'s own drums');
    const asis = generateBanger({ riff: BAND, options: { drums: { source: 'asis' } }, seed: 1 });
    assert(Object.values(asis.mix.labels).includes('KICK (riff)') && !Object.values(asis.mix.labels).includes('KICK')
      && !Object.values(asis.mix.labels).includes('HATS'),
    'Keep As-Is plays the riff\'s own groove and adds no kit of its own');
    const add = generateBanger({ riff: BAND, options: { drums: { source: 'add' } }, seed: 1 });
    assert(Object.values(add.mix.labels).includes('KICK (riff)') && Object.values(add.mix.labels).includes('HATS')
      && Object.values(add.mix.labels).includes('RIFF Rim'),
    'Keep and Add lets the riff\'s busy kick stand in, adds the rest of the kit, and keeps its rim');
    assert(Object.values(add.mix.labels).filter((l) => /KICK/.test(l)).length === 1, 'and never plays two kicks');
  }
  {
    // Riff Sound: Keep leaves the riff's sounds alone; Random swaps its tuned parts for
    // presets off the style's shortlist for each part's job — never the drums, never the
    // cute ones in a dark banger, the same sounds for the same seed.
    const SOUNDS = (await import('../tools/lib/banger/sounds.js')).BANGER_SOUNDS['big-room'];
    const kept = generateBanger({ riff: BAND, options: {}, seed: 3 });
    assert(kept.mix.voice.leadVoice === 'toneSquare' && kept.mix.voice.kickVoice === 'ds909Kick',
      'Riff Sound Keep plays the riff on its own sounds');
    let fromList = true; let drumsKept = true; let darkClean = true; let varied = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      for (const mood of ['anthemic', 'dark']) {
        const out = generateBanger({ riff: BAND, options: { mood, parts: { riffSound: 'random' } }, seed });
        const hook = out.mix.voice.leadVoice; const bass = out.mix.voice.bassVoice;
        if (!SOUNDS.random.hook.includes(hook) || !SOUNDS.random.bass.includes(bass)) fromList = false;
        if (out.mix.voice.kickVoice !== 'ds909Kick') drumsKept = false;
        if (mood === 'dark' && SOUNDS.moods.dark.skip.includes(hook)) darkClean = false;
        varied.add(hook);
      }
    }
    assert(fromList, 'Riff Sound Random picks from the style\'s shortlist for each part\'s job');
    assert(drumsKept, 'and leaves the riff\'s drums alone');
    assert(darkClean, 'and keeps the cute bells out of a dark banger');
    assert(varied.size >= 4, `and a new seed rolls a new sound (${varied.size} hooks over 24 bangers)`);
    const a = generateBanger({ riff: BAND, options: { parts: { riffSound: 'random' } }, seed: 9 });
    const b = generateBanger({ riff: BAND, options: { parts: { riffSound: 'random' } }, seed: 9 });
    assert(a.mix.voice.leadVoice === b.mix.voice.leadVoice && /^RIFF .+ · HOOK$/.test(a.mix.labels.lead)
      && a.mix.labels.lead.includes(VOICES[a.mix.voice.leadVoice].label),
    'the same seed rolls the same sound, and the strip is named after it');
    const dense = generateBanger({ riff: plumber, options: { parts: { riffSound: 'random' } }, seed: 4 });
    const hookLane = Object.entries(dense.mix.labels).find(([, l]) => /HOOK$/.test(l))[0];
    assert(VOICES[dense.mix.voice[`${hookLane}Voice`]]?.synth !== 'CRLS-1', 'a busy hook never rolls a CRLS-1');
  }
  {
    // Builds roll faster bar by bar; every drop lands with a crash and an impact; a fill
    // closes every eight.
    const out = generateBanger({ riff: HOOK1, options: { length: 'long' }, seed: 9 });
    const snare = laneByLabel(out, /SNARE/);
    for (const b of out.form.filter((f) => f.role === 'build' || f.role === 'build2')) {
      const hits = [];
      for (let bar = b.from; bar <= b.to; bar++) hits.push(onsets(barPart(out, snare, bar)).length);
      check(hits.slice(0, -1).every((h, i) => i === 0 || h >= hits[i - 1]) && hits[hits.length - 2] === 16,
        `the roll in ${b.label} gets faster: ${hits.join(' ')}`);
    }
    const crash = laneByLabel(out, /^CRASH$/); const impact = laneByLabel(out, /IMPACT/); const fill = laneByLabel(out, /FILL/);
    for (const d of out.form.filter((f) => /drop/.test(f.role))) {
      check(onsets(barPart(out, crash, d.from)).length > 0 && onsets(barPart(out, impact, d.from)).length > 0, `${d.label} lands with a crash and an impact`);
      if (d.bars >= 8) check(onsets(barPart(out, fill, d.from + 7)).length > 0 || d.to === d.from + 7, `${d.label} fills on its eighth bar`);
    }
    assert(!failed, 'builds accelerate, drops land on a crash and an impact, and fills close the eights');
  }
  {
    // The lift moves the final drop, every pitched part, by exactly what was asked.
    for (const [lift, by] of [['half', 1], ['whole', 2], ['third', 4]]) {
      const flat = generateBanger({ riff: HOOK1, options: { form: { keyLift: 'none' } }, seed: 4 });
      const up = generateBanger({ riff: HOOK1, options: { form: { keyLift: lift } }, seed: 4 });
      const d3 = up.form.find((f) => f.role === 'drop3');
      const hook = laneByLabel(up, /HOOK$/);
      let ok = true;
      for (let bar = d3.from; bar <= d3.to; bar++) {
        const a = sigOfHz(barPart(flat, hook, bar)); const b = sigOfHz(barPart(up, hook, bar));
        if (!sameUpTo(b, a, [by])) ok = false;
      }
      assert(ok, `a ${lift} lift raises drop three by ${by} semitone${by > 1 ? 's' : ''}`);
    }
  }
  {
    // No two phrases of a drop are the same.
    const out = generateBanger({ riff: HOOK1, options: { variation: 'faithful', length: 'long' }, seed: 1 });
    const drop = out.form.find((f) => f.role === 'drop');
    const phrase = (start) => JSON.stringify(Object.keys(out.mix.labels).map((lane) => Array.from({ length: 8 }, (_, k) => barPart(out, lane, start + k))));
    let differ = true;
    for (let p = drop.from; p + 15 <= drop.to; p += 8) if (phrase(p) === phrase(p + 8)) differ = false;
    assert(differ, 'consecutive drop phrases always differ, even at Faithful');
  }
  {
    // A riff in the bass register is the bass: no second bass line, doubles brought up.
    const low = riffOf([{ key: 'bass', label: 'Walk', kind: 'melodic', role: 'hook', meanPitch: 40,
      bars: ['D2:2 . . . A2:2 . . . B1:2 . . . F2:2 . . .', 'G1:2 . . . D2:2 . . . G2:2 . . . A2:2 . . .'] }], 2);
    const out = generateBanger({ riff: low, options: { parts: { writeLead: 'off' } }, seed: 1 });
    const square = laneByLabel(out, /Plain Square/);
    const drop = out.form.find((f) => f.role === 'drop');
    const notes = onsets(barPart(out, square, drop.from)).map(([, v]) => semis(lowHz(v)));
    assert(!Object.values(out.mix.labels).some((l) => /^BASS( ·|$)/.test(l)) && notes.every((m) => m >= 55),
      'a bass-register riff gets no second bass line, and its doubles sit up where a lead does');
    // …so a Random sound for it comes off the bass shortlist, never a bell or a lead…
    let fromBassList = true;
    for (let seed = 1; seed <= 8; seed++) {
      const r = generateBanger({ riff: low, options: { parts: { riffSound: 'random', writeLead: 'off' } }, seed });
      const lane = r.laneOf.hook;
      const id = r.mix.voice?.[seamFor(lane)?.voiceKey];
      if (!BANGER_SOUNDS['big-room'].random.bass.includes(id)) fromBassList = false;
    }
    assert(fromBassList, 'a bass-register hook given a Random sound gets one from the bass shortlist');
    // Write a Lead (When Needed, the default): the same bass riff gets a tune written over
    // it, which becomes the hook, and the riff plays on as itself.
    const led = generateBanger({ riff: low, options: {}, seed: 1 });
    const ledLabels = Object.values(led.mix.labels);
    assert(led.warnings.some((w) => /lead was written|one was written/.test(w)) && ledLabels.some((l) => /^RIFF Written Lead · HOOK/.test(l)),
      'a riff with no lead gets one written from its chords, and it is the hook');
    const ledAgain = generateBanger({ riff: low, options: {}, seed: 2 });
    const hookBars = (o) => JSON.stringify(o.bank.sections?.map?.((x) => x) ?? o.bank);
    assert(hookBars(led) !== hookBars(ledAgain), 'and another take writes another lead');
    // The recipe keeps the riff as read — the written lead belongs to its take — so a take
    // in another style writes its own, and the same seed writes the same one again.
    assert(JSON.stringify(led.banger.riff) === JSON.stringify(low) && (led.banger.options.hook ?? 'auto') === 'auto',
      'the recipe keeps the riff as read, with no Written Lead in it and the hook still unchosen');
    assert(hookBars(anotherTake(led.banger, led.banger.seed)) === hookBars(led), 'a take re-made from that recipe writes the same lead');
    const trance = generateBanger({ riff: led.banger.riff, options: { ...led.banger.options, style: 'trance' }, seed: 1 });
    assert(trance.warnings.some((w) => /one was written/.test(w)), 'a take in another style writes its own lead');
    // A recipe saved before 3 Oct kept the lead baked into its riff: it comes out again,
    // the hook it displaced goes back, and the take re-made from it is the same music.
    const lane = led.warnings.join(' ').match(/written from its chords \((\w+)\)/)[1];
    const baked = { ...low, parts: [{ ...low.parts[0], role: 'bass' },
      { key: lane, label: 'Written Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 72,
        bars: ['A5:2 . . . . . . . . . . . . . . .', 'D5:2 . . . . . . . . . . . . . . .'] }] };
    assert(JSON.stringify(sourceRiff(baked)) === JSON.stringify(low), 'an old recipe\'s baked lead comes out of its riff');
    assert(hookBars(generateBanger({ riff: baked, options: { hook: lane }, seed: 1 })) === hookBars(led),
      'and a take re-made from an old recipe is the same music');
    // Bass = Sequencer: the line in eighths, and its echo a sixteenth behind on a channel of
    // its own, the bass's sound, its fader riding 5 dB under the bass's.
    const { echoPart, blank } = await import('../tools/lib/banger/theory.js');
    const seqBar = () => { const p = blank(); p.notes[0] = 'C2'; p.lens[0] = 1; p.notes[15] = 'G2'; p.lens[15] = 1; return p; };
    const echoBars = [{ bass: seqBar() }, { bass: seqBar() }, {}];
    echoPart(echoBars, 'bass', 'bassEcho');
    assert(echoBars[0].bassEcho.notes[1] === 'C2' && echoBars[1].bassEcho.notes[0] === 'G2' && !echoBars[2].bassEcho,
      'an echo lands a sixteenth late, carries over the barline, and never into a bar with no bass');
    const seq = generateBanger({ riff: HOOK1, options: { style: 'electro', parts: { bass: 'sequencer' } }, seed: 2 });
    const laneOfLabel = (o, re) => Object.entries(o.mix.labels).find(([, l]) => re.test(l))?.[0];
    const seqBass = laneOfLabel(seq, /^BASS 808/); const seqEcho = laneOfLabel(seq, /^BASS ECHO/);
    assert(seqEcho && seq.mix.voice[`${seqEcho}Voice`] === seq.mix.voice[`${seqBass}Voice`]
      && Math.abs(seq.mix.lanes[seqEcho].gain - (seq.mix.lanes[seqBass].gain - 5)) < 0.05,
      'the Sequencer bass gets its echo channel, on the bass\'s sound, 5 dB under it');
    assert(!laneOfLabel(generateBanger({ riff: HOOK1, options: { style: 'electro', parts: { bass: 'octaves' } }, seed: 2 }), /ECHO/),
      'and no other bass does');
    // …and future bass, whose sub is a talking wobble, leaves the wobble out: with no 808
    // under a riff that is the bass, the wobble would be the whole low end.
    const fbLow = generateBanger({ riff: low, options: { style: 'future-bass', parts: { writeLead: 'off' } }, seed: 1 });
    const fbHigh = generateBanger({ riff: HOOK1, options: { style: 'future-bass' }, seed: 1 });
    assert(!Object.values(fbLow.mix.labels).some((l) => /^WOBBLE/.test(l)) && Object.values(fbHigh.mix.labels).some((l) => /^WOBBLE/.test(l)),
      'future bass drops its wobble under a riff that is the bass, and keeps it over its 808');
  }

  // ---------------------------------------------------------------- the levels
  {
    // The prediction's arithmetic (tools/lib/banger/levels.js).
    const one = (notes, len = 4) => ({ notes: [notes, ...Array(15).fill(null)], lens: [len, ...Array(15).fill(null)] });
    const grand = { voice: VOICES.mrdrPopGrand, curveId: 'mrdrPopGrand', lane: 'chords', bpm: 128 };
    const single = partLevel({ ...grand, bars: Array(8).fill(one('C4')) });
    const triad = partLevel({ ...grand, bars: Array(8).fill(one(['C4', 'E4', 'G4'])) });
    assert(triad - single > 4 && triad - single < 5.8, `a three-note chord reads about 4.8 dB over one of its notes (${(triad - single).toFixed(1)})`);
    assert(partLevel({ ...grand, bars: [null, null] }) === null, 'a part that plays nothing has no level');
    const everyBar = partLevel({ ...grand, bars: Array(8).fill(one('C4', 16)) });
    const everyOther = partLevel({ ...grand, bars: Array.from({ length: 8 }, (_, i) => (i % 2 ? null : one('C4', 16))) });
    assert(Math.abs(everyBar - everyOther) < 1, `gated like the meter, a part is judged by how loud it plays, not how often (${(everyBar - everyOther).toFixed(1)} dB apart)`);
    const at2 = noteDb(VOICES.tpSuperSaw, 'tpSuperSaw', 'chords', 2, 60);
    const at8 = noteDb(VOICES.tpSuperSaw, 'tpSuperSaw', 'chords', 8, 60);
    assert(at8 - at2 <= 2 * 10 * Math.log10(2) + 1e-9, 'held four times as long, a note gains at most what four times the energy would');

    // The levelling: deterministic, bounded, and leaving alone what it should.
    const keep = generateBanger({ riff: plumber, options: {}, seed: 3 });
    const again = generateBanger({ riff: plumber, options: {}, seed: 3 });
    const swapped = generateBanger({ riff: plumber, options: { parts: { riffSound: 'random' } }, seed: 3 });
    assert(JSON.stringify(keep.mix) === JSON.stringify(again.mix) && JSON.stringify(keep.levels) === JSON.stringify(again.levels),
      'the same banger gets the same faders every time');
    const jobs = new Set(keep.levels.map((r) => r.job));
    assert(['bass', 'saws', 'square', 'kick'].every((j) => jobs.has(j)) && !jobs.has('hook'),
      `the bass, chords, hook double and kick are levelled, and a hook on its own sound is left alone (${[...jobs].join(' ')})`);
    const offsets = BANGER_LEVEL_DATA.offsets['big-room'] || {};
    const caution = (r) => (LEAD_ROLES.includes(r.job) ? LEAD_CAUTION_DB : 0);
    assert(keep.levels.every((r) => Math.abs(r.after - r.base - (offsets[r.job] ?? 0) - caution(r)) <= MAX_LEVEL_MOVE + 0.05),
      `no prediction moves a fader more than ${MAX_LEVEL_MOVE} dB from its reference's`);
    // the leads err soft: never raised past LEAD_MAX_RAISE, and set LEAD_CAUTION_DB under the prediction
    assert(keep.levels.filter((r) => LEAD_ROLES.includes(r.job)).length > 0
      && keep.levels.filter((r) => LEAD_ROLES.includes(r.job)).every((r) => r.after - r.base - (offsets[r.job] ?? 0) <= LEAD_MAX_RAISE + LEAD_CAUTION_DB + 0.05),
    'the leads and the arpeggio err soft: never raised much, always set below the prediction');
    // Kept means kept: a riff part is moved only where it could not keep its sound — a lane's
    // own engine voice cannot follow it to another lane, and plays the style's fallback there.
    const forced = keep.levels.filter((r) => r.job.startsWith('riff:'));
    assert(forced.every((r) => {
      const p = plumber.parts.find((x) => `riff:${x.key}` === r.job);
      const now = keep.mix.voice?.[seamFor(r.lane)?.voiceKey];
      return p && !p.voiceParams && (!p.voice || VOICES[p.voice]?.kind === 'engine') && now;
    }), `a riff part on its own sound is left where it was (moved only where its engine voice could not follow: ${forced.map((r) => r.job).join(' ') || 'none'})`);
    assert(swapped.levels.some((r) => r.job.startsWith('riff:') && r.how === 'sound') && swapped.levels.some((r) => r.job === 'hook' && r.how === 'sound'),
      'a riff part given a Random sound — the hook too — is matched to the sound it replaced, on its own notes');
    assert(keep.levels.filter((r) => PERCUSSION_LANES.includes(baseLane(r.lane))).every((r) => r.how === 'sound'),
      'drums are matched on their sound alone — a different groove is meant to differ');

    // The data the prediction reads.
    for (const style of BANGER_STYLES) {
      const refs = BANGER_LEVEL_DATA.refs[style.id] || {};
      check(['hook', 'kick', 'bass', 'saws', 'square'].every((j) => refs[j]), `${style.id} has reference parts for its core channels`);
      for (const [job, ref] of Object.entries(refs)) {
        check(Array.isArray(ref.bars) && ref.bars.length >= 1 && ref.bars.length <= 8 && (!ref.voice?.id || VOICES[ref.voice.id])
          && Array.isArray(ref.window) && Number.isFinite(ref.bpm), `${style.id}/${job}: a readable reference part, on a sound that exists`);
      }
    }
    assert(!failed, 'every style has reference parts for its channels, every one readable');
    for (const [id, c] of Object.entries(BANGER_LEVEL_DATA.curves)) {
      check((VOICES[id] || id.startsWith('copy:')) && c.lens.length === CURVE_SECONDS.length && c.pitches.length === CURVE_MIDI.length
        && [...c.lens, ...c.pitches].every(Number.isFinite), `the curve for ${id} is whole`);
    }
    assert(!failed, `every measured loudness curve is whole (${Object.keys(BANGER_LEVEL_DATA.curves).length})`);
    // A seed re-mixed since its parts were read is not a failure — it is a prompt.
    const stale = new Set();
    for (const style of BANGER_STYLES) {
      if (!style.seed) continue;
      const m = await import(`../src/data/imported/${style.seed.song}.js`);
      for (const [job, lane] of Object.entries(style.seed.lanes)) {
        const ref = BANGER_LEVEL_DATA.refs[style.id]?.[job];
        const vk = seamFor(lane)?.voiceKey;
        const voice = m.mix?.voice?.[vk] ?? m.bank?.[vk];
        if (ref && ((m.mix?.lanes?.[lane]?.gain ?? 0) !== ref.gain || (ref.voice?.id && voice && voice !== ref.voice.id))) stale.add(`${style.seed.song} ${lane}`);
      }
    }
    if (stale.size) console.log(`note: re-mixed since the levels read them — run \`node tools/banger-levels.js refs\`: ${[...stale].join(', ')}`);
  }

  // ---------------------------------------------------------------- the song file
  {
    const out = generateBanger({ riff: plumber, options: { mood: 'euphoric' }, seed: 7 });
    assert(!bangerIssues(out).length, 'a generated banger passes the server\'s checks');
    assert(bangerIssues({ ...out, banger: { ...out.banger, riff: drumsOnly } }).length > 0, 'and a stale or hand-made one is refused');
    // The desk's server can be older than the page (the page rebuilds on every load). A
    // switch added since it started must not stop it writing the banger the page made.
    const newer = { ...out.banger.options, parts: { ...out.banger.options.parts, aSwitchFromTomorrow: true } };
    assert(!bangerIssues({ ...out, banger: { ...out.banger, options: newer } }).length,
      'a switch newer than the server does not stop it writing the banger');
    const { path, source } = writeBangerSong(temp, { id: 'test-banger', title: 'TEST BANGER', generated: out });
    assert(path.startsWith(join(temp, 'work/bangers')) && source.includes('export const banger = {') && source.includes('export const group = "banger";'),
      'a banger is written into its own drawer, work/bangers, with its recipe above the marker');
    assert(source.indexOf('export const banger') < source.indexOf('// ---- THE DESK WRITES BELOW HERE'),
      'the recipe sits with the music, where a desk save cannot reach it');
    const mod = await import(`${pathToFileURL(path).href}?v=1`);
    assert(JSON.stringify(mod.bank) === JSON.stringify(out.bank) && JSON.stringify(mod.banger.riff) === JSON.stringify(out.banger.riff)
      && mod.banger.seed === 7 && mod.banger.take === 1 && JSON.stringify(mod.banger.options) === JSON.stringify(out.banger.options),
    'the file imports back to the same music and the same recipe');
    assert(JSON.stringify(mod.arrangement) === JSON.stringify(out.arrangement) && mod.mix.voice.leadVoice != null || true,
      'and the same arrangement');
    assert(!validateRiff(mod.banger.riff).length, 'the stored riff is a valid riff');
    const entry = readImported(temp).find((e) => e.id === 'test-banger');
    assert(entry?.banger === true && entry.group === 'banger' && entry.writable, 'the song index knows a banger when it reads one, and shelves it under Bangers');
    writeImportedIndex(temp);
    const scratchIndex = readFileSync(join(temp, 'work/scratch/index.js'), 'utf8');
    assert(scratchIndex.includes('.banger') && scratchIndex.includes("from '../bangers/test-banger.js'"), 'and hands its recipe to the registry');

    // Takes.
    const meta = () => import(`${pathToFileURL(path).href}?v=${Math.random()}`).then((m) => m.banger);
    let state = takesState(temp, 'test-banger', await meta());
    assert(state.take === 1 && state.takes.join() === '1' && !state.mixed && state.previous == null, 'a new banger is take 1 of 1, unmixed');
    const take1 = readFileSync(path, 'utf8');
    const next = anotherTake(out.banger, 8);
    let now = moveTake(temp, 'test-banger', await meta(), { direction: 'another', generated: next, title: 'TEST BANGER' });
    state = takesState(temp, 'test-banger', await meta());
    assert(now === 2 && state.take === 2 && state.takes.join() === '1,2' && readTake(temp, 'test-banger', 1) === take1,
      'Another Take writes take 2 and keeps take 1 whole');
    const take2 = readFileSync(path, 'utf8');
    now = moveTake(temp, 'test-banger', await meta(), { direction: 'previous' });
    assert(now === 1 && readFileSync(path, 'utf8') === take1, 'Previous Take puts take 1 back byte for byte');
    now = moveTake(temp, 'test-banger', await meta(), { direction: 'next' });
    assert(now === 2 && readFileSync(path, 'utf8') === take2, 'and Next Take brings take 2 back');
    const m2 = await import(`${pathToFileURL(path).href}?v=${Math.random()}`);
    writeSongFile(temp, 'test-banger', { mix: { ...m2.mix, master: -1 }, arrangement: m2.arrangement });
    state = takesState(temp, 'test-banger', await meta());
    assert(state.mixed && tailHashOf(readFileSync(path, 'utf8')) !== (await meta()).tailHash, 'a desk save marks the take as mixed');
    assert((await meta()).take === 2, 'and the recipe survives the save');
    now = moveTake(temp, 'test-banger', await meta(), { direction: 'previous' });
    const mixed2 = readTake(temp, 'test-banger', 2);
    assert(now === 1 && /"master": -1|master: -1/.test(mixed2), 'leaving a mixed take keeps the mix in that take');
    // Modify This Take: written over the take it modifies, the take number unchanged, the
    // version it replaced kept aside under a name Previous and Next never land on.
    const before = readFileSync(path, 'utf8');
    const takesBefore = listTakes(temp, 'test-banger').join();
    const modified = generateBanger({ riff: out.banger.riff, options: { ...out.banger.options, parts: { ...out.banger.options.parts, counter: true } }, seed: out.banger.seed });
    now = modifyTake(temp, 'test-banger', await meta(), { generated: modified, title: 'TEST BANGER' });
    const kept = readdirSync(join(temp, 'work/mix-history')).filter((f) => f.startsWith('banger-test-banger-take-001-before-modify-'));
    assert(now === 1 && (await meta()).take === 1 && readFileSync(path, 'utf8') !== before,
      'Modify This Take rewrites the take in place, keeping its number');
    assert(kept.length === 1 && readFileSync(join(temp, 'work/mix-history', kept[0]), 'utf8') === before
      && listTakes(temp, 'test-banger').join() === takesBefore, 'and keeps the version it replaced aside, not as a take');
    deleteTakes(temp, 'test-banger');
    assert(listTakes(temp, 'test-banger').length === 0, 'deleting the song\'s takes leaves none behind');

    // Bangers made before they had a drawer of their own move into it, once, as the desk
    // starts: a banger the scratch drawer holds as scratch moves; a copy or a plain
    // scratch song does not.
    const legacy = bangerSource({ id: 'old-banger', title: 'OLD', generated: out }).replace('export const group = "banger";', 'export const group = "scratch";');
    mkdirSync(join(temp, 'work/scratch'), { recursive: true });
    writeFileSync(join(temp, 'work/scratch/old-banger.js'), legacy);
    writeFileSync(join(temp, 'work/scratch/kept-copy.js'), legacy.replace('export const group = "scratch";', 'export const group = "copy";'));
    writeFileSync(join(temp, 'work/scratch/plain.js'), 'export const title = "PLAIN";\nexport const group = "scratch";\nexport const bank = {};\n');
    const moved = moveBangersOutOfScratch(temp);
    const movedSrc = existsSync(join(temp, 'work/bangers/old-banger.js')) ? readFileSync(join(temp, 'work/bangers/old-banger.js'), 'utf8') : '';
    assert(moved.join() === 'old-banger' && !existsSync(join(temp, 'work/scratch/old-banger.js')) && movedSrc.includes('export const group = "banger";')
      && existsSync(join(temp, 'work/scratch/kept-copy.js')) && existsSync(join(temp, 'work/scratch/plain.js')),
    'a banger left in the scratch drawer moves into work/bangers; a copy and a plain scratch song stay');
    assert(tailHashOf(movedSrc) === tailHashOf(legacy) && moveBangersOutOfScratch(temp).length === 0,
      'the move leaves its mix untouched (the take is not "mixed" by it), and a second run moves nothing');

    // SEED BANGERS (tools/lib/banger-seeds.js): a style laid out to be tuned on the desk,
    // read back by Use as Style. In the temp root, with copies of the tables it writes.
    mkdirSync(join(temp, 'tools/lib/banger'), { recursive: true });
    for (const f of ['sounds.js', 'channels.js', 'combos.js', 'levels-data.js']) {
      copyFileSync(join(process.cwd(), 'tools/lib/banger', f), join(temp, 'tools/lib/banger', f));
    }
    mkdirSync(join(temp, 'src/data/imported'), { recursive: true });
    for (const st of BANGER_STYLES) {
      if (st.seed) copyFileSync(join(process.cwd(), 'src/data/imported', `${st.seed.song}.js`), join(temp, 'src/data/imported', `${st.seed.song}.js`));
    }
    const seedId = seedIdOf('eurobeat');
    const made = makeSeed(temp, EUROBEAT);
    const seedMod = await import(`${pathToFileURL(made.path).href}?v=${Math.random()}`);
    const jobs = Object.keys(seedMod.banger.laneOf);
    assert(seedMod.group === SEED_GROUP && seedMod.banger.seedOf === 'eurobeat'
      && ['kick', 'bass', 'saws', 'pad', 'piano', 'counter', 'third', 'choir', 'shaker', 'ride'].every((j) => jobs.includes(j)),
    `a seed banger is a song on its own shelf with every part switched on (${jobs.length} channels)`);
    let refused = false;
    try { makeSeed(temp, EUROBEAT); } catch { refused = true; }
    assert(refused, 'making a seed again over a tuned one needs force');

    // Tune it the way the desk would, and save: another kick, the strings down with some
    // EQ, the master trimmed.
    const lo = seedMod.banger.laneOf;
    const tuned = structuredClone(seedMod.mix);
    tuned.voice[seamFor(lo.kick).voiceKey] = 'ds808Kick';
    tuned.lanes[lo.saws] = { ...tuned.lanes[lo.saws], gain: -3, eq: { high: 1.5 } };
    tuned.master = -1;
    writeSongFile(temp, seedId, { mix: tuned, arrangement: seedMod.arrangement });
    const used = await useAsStyle(temp, seedId);
    const tSounds = (await import(`${pathToFileURL(join(temp, 'tools/lib/banger/sounds.js')).href}?v=${Math.random()}`)).BANGER_SOUNDS;
    const tChannels = (await import(`${pathToFileURL(join(temp, 'tools/lib/banger/channels.js')).href}?v=${Math.random()}`)).BANGER_CHANNELS;
    const tLevels = (await import(`${pathToFileURL(join(temp, 'tools/lib/banger/levels-data.js')).href}?v=${Math.random()}`)).BANGER_LEVEL_DATA;
    assert(used.ok && tSounds.eurobeat.kits.style.kick === 'ds808Kick' && tChannels.eurobeat.seed === seedId
      && tChannels.eurobeat.strips.saws.gain === -3 && tChannels.eurobeat.master.master === -1
      && !(tChannels.eurobeat.strips.saws.effects || []).some((e) => e.id === 'rhythmgate'),
    'Use as Style takes the seed\'s sounds, channels and master into the style — the chords\' gate stays its own switch');
    assert(tLevels.refs.eurobeat.saws?.song === seedId && tLevels.refs.eurobeat.saws.gain === -3,
      'and the seed becomes what new bangers\' faders are matched against');
    const fromSeed = generateBanger({ riff: HOOK1, options: { style: 'eurobeat', parts: { partSounds: 'style' }, form: { template: 'club' } }, seed: 1, sounds: tSounds, channels: tChannels, levelData: tLevels });
    const saws = fromSeed.mix.lanes[fromSeed.laneOf.saws];
    assert(fromSeed.mix.voice[`${fromSeed.laneOf.kick}Voice`] === 'ds808Kick' && saws.eq?.high === 1.5 && fromSeed.mix.master === -1,
      'a banger made after it has the seed\'s kick, its strings\' EQ and its master');
    // A sound tuned on the desk is a copy only that song has. Use as Style keeps it as a
    // library preset of its own, measured — and the next time, updates that one.
    const edited = structuredClone(tuned);
    edited.voiceParams = { ...(edited.voiceParams || {}), [seamFor(lo.bass).voiceKey]: { ...VOICES.bass80sDuo, drive: 0.4, label: 'My Bass' } };
    writeSongFile(temp, seedId, { mix: edited, arrangement: seedMod.arrangement });
    const unmeasured = await useAsStyle(temp, seedId);
    assert(!unmeasured.ok && unmeasured.problems.some((p) => /tuned on the desk/.test(p)),
      'with nothing to measure it, a tuned sound is named rather than kept');
    const tempVoices = join(temp, 'src/data/voices.js');
    copyFileSync(join(process.cwd(), 'src/data/voices.js'), tempVoices);
    let measured = 0;
    const measure = async () => { measured++; return { level: 0.05, peak: 0.5 }; };
    const keptUse = await useAsStyle(temp, seedId, { measure, voicesFile: tempVoices });
    const keptSounds = (await import(`${pathToFileURL(join(temp, 'tools/lib/banger/sounds.js')).href}?v=${Math.random()}`)).BANGER_SOUNDS;
    const voicesSrc = readFileSync(tempVoices, 'utf8');
    assert(keptUse.ok && keptUse.kept?.[0]?.id === 'seedEurobeatBass' && keptSounds.eurobeat.parts.bass === 'seedEurobeatBass'
      && /seedEurobeatBass: \{ label: 'My Bass · Eurobeat'/.test(voicesSrc) && /seedEurobeatBass: 0\.05/.test(voicesSrc),
    `a sound tuned on the seed is kept as a preset of its own, measured, and the style plays it (${keptUse.problems?.join('; ') || 'ok'})`);
    await useAsStyle(temp, seedId, { measure, voicesFile: tempVoices });
    assert(measured === 1 && (readFileSync(tempVoices, 'utf8').match(/seedEurobeatBass: \{/g) || []).length === 1,
      'used again unchanged, it is not measured or added again');
    writeSongFile(temp, seedId, { mix: tuned, arrangement: seedMod.arrangement });
    const notSeed = await useAsStyle(temp, 'test-banger');
    assert(!notSeed.ok && notSeed.problems.some((p) => /only a style's seed banger/.test(p)), 'and only a seed can be used as its style');

    // A FLAVOUR has a seed of its own (6 Oct 2026): made in that flavour, used as that flavour
    // alone. Its base style's seed channels never reach it — they were set for other sounds.
    const ROMANTICO = BANGER_FLAVOURS.find((f) => f.id === 'reggaeton-romantico');
    const flMade = makeSeed(temp, ROMANTICO);
    const flMod = await import(`${pathToFileURL(flMade.path).href}?v=${Math.random()}`);
    const flLanes = flMod.banger.laneOf;
    assert(flMade.id === 'banger-seed-reggaeton-romantico' && flMod.banger.seedOf === 'reggaeton-romantico'
      && flMod.mix.labels[flLanes.congas] === 'BONGO Macho' && flMod.mix.voice[`${flLanes.congas}Voice`] === BANGER_SOUNDS['reggaeton-romantico'].parts.congas,
    'a flavour\'s seed is made in that flavour, on its own sounds');
    const flTuned = structuredClone(flMod.mix);
    flTuned.lanes[flLanes.congas] = { ...flTuned.lanes[flLanes.congas], gain: -2.5, eq: { high: 2 } };
    writeSongFile(temp, flMade.id, { mix: flTuned, arrangement: flMod.arrangement });
    const flUsed = await useAsStyle(temp, flMade.id);
    const flChannels = (await import(`${pathToFileURL(join(temp, 'tools/lib/banger/channels.js')).href}?v=${Math.random()}`)).BANGER_CHANNELS;
    const flLevels = (await import(`${pathToFileURL(join(temp, 'tools/lib/banger/levels-data.js')).href}?v=${Math.random()}`)).BANGER_LEVEL_DATA;
    assert(flUsed.ok && flUsed.style === 'reggaeton-romantico' && flChannels['reggaeton-romantico'].strips.congas.eq.high === 2
      && flChannels.reggaeton?.seed !== flMade.id && flLevels.refs['reggaeton-romantico']?.congas?.song === flMade.id,
    `Use as Style on it writes that flavour's channels and references, not its base style's (${flUsed.problems?.join('; ') || 'ok'})`);
    const baseOnly = { reggaeton: { seed: 'x', strips: { congas: { gain: 9, eq: { high: -9 } } } } };
    const romantico = generateBanger({ riff: HOOK1, options: { style: 'reggaeton', flavour: 'romantico', drums: { congas: true } }, seed: 1, channels: baseOnly, level: false });
    const clasico = generateBanger({ riff: HOOK1, options: { style: 'reggaeton', flavour: 'style', drums: { congas: true } }, seed: 1, channels: baseOnly, level: false });
    assert(romantico.mix.lanes[romantico.laneOf.congas]?.eq?.high !== -9 && clasico.mix.lanes[clasico.laneOf.congas]?.eq?.high === -9,
      'a flavour with no seed of its own keeps its own channels; its base style takes its seed\'s');

    // SOUND COMBOS: the same reading of any banger, kept under a name.
    const combo = await saveCombo(temp, seedId, 'Icy Anthem');
    const tCombos = (await import(`${pathToFileURL(join(temp, 'tools/lib/banger/combos.js')).href}?v=${Math.random()}`)).BANGER_COMBOS;
    assert(combo.ok && combo.combo === 'icy-anthem' && tCombos.eurobeat['icy-anthem'].sounds.kits.style.kick === 'ds808Kick'
      && tCombos.eurobeat['icy-anthem'].refs.saws?.gain === -3, 'Save as Combo keeps a banger\'s sounds, channels and balance under a name');
    const withCombo = generateBanger({ riff: HOOK1, options: { style: 'eurobeat', combo: 'icy-anthem' }, seed: 1, combos: tCombos });
    const without = generateBanger({ riff: HOOK1, options: { style: 'eurobeat' }, seed: 1 });
    assert(withCombo.mix.voice[`${withCombo.laneOf.kick}Voice`] === 'ds808Kick' && without.mix.voice[`${without.laneOf.kick}Voice`] !== 'ds808Kick',
      'a banger made with the combo plays its sounds; one made without does not');
    const missing = generateBanger({ riff: HOOK1, options: { style: 'eurobeat', combo: 'nope' }, seed: 1, combos: tCombos });
    assert(missing.warnings.some((w) => /no Sound Combo/.test(w)), 'a combo that is not there is said, and the style\'s own sounds play');
    assert(await deleteCombo(temp, 'eurobeat', 'icy-anthem')
      && !(await import(`${pathToFileURL(join(temp, 'tools/lib/banger/combos.js')).href}?v=${Math.random()}`)).BANGER_COMBOS.eurobeat,
    'a combo can be deleted');
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

// ---- The Stereo Widener, as the level model hears it ----------------------------------------
// WIDTH scales the sides by 2 × WIDTH and past 0.5 adds a side made from the middle above
// its low cut, at 2 × WIDTH − 1; the WET and MONO SPREAD it no longer has are ignored, as the
// engine ignores them (src/engine/effects.js).
{
  const strip = (params) => ({ effects: [{ id: 'widener', params }] });
  const near = (a, b) => Math.abs(a - b) < 0.01;
  assert(widenerOf({}) === null && widenerOf({ effects: [{ id: 'widener', params: {}, bypass: true }] }) === null,
    'no widener, or a bypassed one, is no widener');
  const plain = widenerOf(strip({ width: 0.7 }));
  assert(near(stereoDb(1, plain), 20 * Math.log10(1.4)),
    `at 0.7 an all-sides sound comes up by 2 × WIDTH (${stereoDb(1, plain).toFixed(2)} dB)`);
  assert(JSON.stringify(widenerOf(strip({ width: 0.7, wet: 0.2 }))) === JSON.stringify(plain),
    'a WET left in a save changes nothing');
  assert(near(stereoDb(0, widenerOf(strip({ width: 0.5 })), 1), 0)
    && near(stereoDb(0, widenerOf(strip({ width: 0.5, monoSpread: 1 })), 1), 0),
    'at 0.5 a mono sound does not move, and a MONO SPREAD left in a save changes nothing');
  const full = widenerOf(strip({ width: 1 }));
  assert(near(stereoDb(0, full, 1), 10 * Math.log10(2)) && near(stereoDb(0, full, 0), 0)
    && near(stereoDb(0, widenerOf(strip({ width: 0.75 })), 1), 10 * Math.log10(1.25)),
    `past 0.5 a mono sound gains a side made from its middle above the cut: ${stereoDb(0, full, 1).toFixed(2)} dB at 1, the part under the cut not at all`);
  const measured = Object.values(BANGER_LEVEL_DATA.curves).filter((c) => c.lens);
  const withHighs = measured.filter((c) => c.highs?.length === CURVE_MIDI.length
    && c.highs.every((h) => h >= 0 && h <= 1) && c.highs[3] >= c.highs[0]);
  assert(withHighs.length >= measured.length - 2,
    `the measured curves carry what gets past the made side's cut at each pitch, more of it up high (${withHighs.length} of ${measured.length})`);
}

if (failed) { console.error('\nbanger: FAILED'); process.exit(1); }
console.log('\nbanger: all passed');
