// BANGER SOUNDS — the sounds table, its rulebook, its file, and the page that edits it.
//
// The table (tools/lib/banger/sounds.js) is what every banger is made with, so it is held
// to the same rulebook the page uses (tools/lib/banger/sound-rules.js) — a hand edit that
// breaks a rule is a red suite, not a banger with a silent part. Then: each rule blocks
// what it says it blocks and nothing else; the file round-trips through its one
// serialiser; Save refuses a rule-breaking table and a stale page; and the generator
// really plays what the table says, per mood, minus the never-use list.
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { VOICES } from '../src/data/voices.js';
import { BANGER_SOUNDS } from '../tools/lib/banger/sounds.js';
import {
  PART_SLOTS, KIT_ROLES, KITS, RANDOM_JOBS, soundIssues, soundAllowed, slotChoices, tableIssues, resolveSounds, slotsFor,
} from '../tools/lib/banger/sound-rules.js';
import { soundsSource, tidyTable } from '../tools/lib/banger/sounds-source.js';
import { generateBanger } from '../tools/lib/banger/index.js';
import { saveTable } from '../tools/banger-sounds.js';
import { BANGER_LEVEL_DATA } from '../tools/lib/banger/levels-data.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const clone = (v) => JSON.parse(JSON.stringify(v));
const part = (k) => PART_SLOTS.find((p) => p.key === k);
const job = (k) => RANDOM_JOBS.find((j) => j.key === k);
const kitRole = (k) => KIT_ROLES.find((r) => r.key === k);

// ---------------------------------------------------------------- the shipped table
const shipped = tableIssues(BANGER_SOUNDS);
assert(!shipped.length, `the shipped sounds table breaks no rule${shipped.length ? `: ${shipped.map((i) => `${i.where} ${i.id}: ${i.reason}`).join('; ')}` : ''}`);
const br = BANGER_SOUNDS['big-room'];
const { BANGER_STYLES } = await import('../tools/lib/banger/styles/index.js');
assert(BANGER_STYLES.every((st) => BANGER_SOUNDS[st.id]), `every style has its sounds (${BANGER_STYLES.map((st) => st.id).join(', ')})`);
for (const [id, s] of Object.entries(BANGER_SOUNDS)) {
  assert(slotsFor(id).every((p) => VOICES[s.parts[p.key]]), `every part ${id} writes has a sound`);
  assert(KIT_ROLES.every((r) => VOICES[s.kits.style[r.key]]) && KITS.every((k) => s.kits[k.key]),
    `${id}'s style kit names every drum, and every kit the Kit switch offers exists`);
  assert(RANDOM_JOBS.every((j) => s.random[j.key]?.length >= 4), `every Random job in ${id} has a shortlist to pick from`);
}

// ---------------------------------------------------------------- the rules
const blocked = (id, slot, opts) => soundIssues(id, slot, opts).blocked;
assert(blocked('engSquare', part('square')).some((r) => /engine preset/.test(r)), 'an engine preset is shut out of every slot');
assert(blocked('ds909KickPunch', part('bass')).some((r) => /drum on a tuned part/.test(r)), 'a drum cannot be a tuned part');
assert(blocked('mrdrElectricGrand', kitRole('kick')).some((r) => /tuned sound on a drum part/.test(r)), 'a tuned sound cannot be a drum');
assert(blocked('roundMono', part('bass')).some((r) => /CRLS-1 on a busy part/.test(r)), 'a CRLS-1 cannot play a busy part');
assert(soundAllowed('roundMono', part('sub')), 'a CRLS-1 may play a part that is never busy');
assert(soundAllowed('roundMono2', job('hook')) && soundIssues('roundMono2', job('hook')).warnings.some((w) => /busy/.test(w)),
  'a CRLS-1 on a Random list is allowed, with a warning that a busy part skips it');
assert(blocked('jmjrDoowop', job('hook')).some((r) => /speech synth/.test(r)), 'a speech synth never comes up at random');
assert(soundAllowed('jmjrChoirAah', part('choir')), 'a JMJR-4 voice may still be a fixed part (the remixes used one as a choir)');
assert(soundAllowed('stSubSine', part('sub')), 'a frozen starter is allowed — it is a library sound nobody can edit under it');
assert(blocked('detuneBass', part('bass'), { never: ['detuneBass'] }).some((r) => /never-use/.test(r)), 'the never-use list blocks a sound everywhere');
assert(!blocked('mrdrElectricGrand', part('bass')).length, 'a keys sound is a legal bass — categories order a list, they do not rule it');
assert(['wubClassic', 'wubGlassYoi', 'fmGrowl', 'bestPwmGrowlBass'].every((id) => blocked(id, part('bass')).some((r) => /wobble or growl/.test(r))
  && blocked(id, job('bass')).some((r) => /wobble or growl/.test(r))), 'a wobble or a growl is never the main bass, chosen or Random');
assert(soundAllowed('wubGlassYoi', part('sub')), 'but it can still be a layer — future bass\'s WOBBLE');
const bassList = slotChoices(part('bass'));
assert(bassList[0].category === 'Bass' && bassList.findIndex((c) => c.blocked.length) > bassList.findIndex((c) => c.category !== 'Bass'),
  'a slot lists its usual category first, everything allowed next, and the shut ones last');
assert(slotChoices(kitRole('kick')).every((c) => VOICES[c.id].kind === 'drum'), 'a drum slot only ever lists drums');

// ---------------------------------------------------------------- whole-table checks
const t = () => clone(BANGER_SOUNDS);
const issuesOf = (table) => tableIssues(table).map((i) => `${i.where}: ${i.reason}`);
{
  const a = t(); delete a['big-room'].parts.bass;
  assert(issuesOf(a).some((s) => /parts\.bass: no sound chosen/.test(s)), 'a part with no sound is a problem');
  const b = t(); b['big-room'].parts.wobble = 'detuneBass';
  assert(issuesOf(b).some((s) => /parts\.wobble: not a part/.test(s)), 'a part the generator does not have is a problem');
  const c = t(); c['big-room'].random.hook = [];
  assert(issuesOf(c).some((s) => /random\.hook: the list is empty/.test(s)), 'an empty Random list is a problem');
  const d = t(); d['big-room'].random.bass.push(d['big-room'].random.bass[0]);
  assert(issuesOf(d).some((s) => /listed twice/.test(s)), 'a sound listed twice is a problem');
  const e = t(); e['big-room'].never = [e['big-room'].parts.bass];
  assert(issuesOf(e).some((s) => /parts\.bass: on the never-use list/.test(s)), 'never-using a sound a part plays is a problem until the part changes');
  const f = t(); f['big-room'].moods.grumpy = { parts: {}, skip: [] };
  assert(issuesOf(f).some((s) => /moods\.grumpy: not a mood/.test(s)), 'a mood that does not exist is a problem');
  const g = t(); delete g['big-room'].kits.style.clap;
  assert(issuesOf(g).some((s) => /kits\.style\.clap: no sound chosen/.test(s)), 'the style kit must name every drum');
  const h = t(); delete h['big-room'].kits['909'].clap;
  assert(!issuesOf(h).length, 'any other kit may leave a drum out — the style kit\'s plays there');
  const i = t(); i['big-room'].moods.dark.parts = { bass: 'engSaw' };
  assert(issuesOf(i).some((s) => /moods\.dark\.parts\.bass: an engine preset/.test(s)), 'a mood\'s override is held to the same rules');
}

// ---------------------------------------------------------------- resolving
{
  const table = t();
  table['big-room'].moods.dark.parts = { bass: 'bestReeseBass' };
  table['big-room'].never = ['tngrIceBell'];
  const dark = resolveSounds(table, 'big-room', 'dark');
  const anthemic = resolveSounds(table, 'big-room', 'anthemic');
  assert(dark.parts.bass === 'bestReeseBass' && anthemic.parts.bass === BANGER_SOUNDS['big-room'].parts.bass,
    'a mood override replaces that part in that mood only');
  assert(!dark.random.hook.includes('tngrIceBell') && !anthemic.random.counter.includes('tngrIceBell'),
    'the never-use list comes out of every Random list');
  assert(!dark.random.counter.includes('musicBox') && anthemic.random.counter.includes('musicBox'),
    'a mood\'s skips come out of its Random lists only');
}

// ---------------------------------------------------------------- the generator plays the table
{
  const riff = {
    version: 1, source: { id: 't', title: 'T', from: 0, to: 0, bpm: 128 }, bars: 1, grid: 16, stats: {},
    parts: [{ key: 'lead', label: 'Lead', kind: 'melodic', role: 'hook', voice: 'toneSquare', voiceParams: null, engineKeys: null, strip: null, meanPitch: 74,
      bars: ['D5:2 . F5:2 . A5:2 . F5:2 . D5:3 . . . C5:2 . E5:2 .'] }],
  };
  const laneOfLabel = (out, re) => Object.entries(out.mix.labels).find(([, l]) => re.test(l))?.[0];
  const table = t();
  table['big-room'].parts.saws = 'bestPwmStrings';
  table['big-room'].kits.style.kick = 'ds909Kick';
  table['big-room'].moods.dark.parts = { bass: 'bestReeseBass' };
  const plain = generateBanger({ riff, options: { parts: { partSounds: 'style' } }, seed: 2, sounds: table });
  const dark = generateBanger({ riff, options: { mood: 'dark', parts: { partSounds: 'style' } }, seed: 2, sounds: table });
  assert(plain.mix.voice[`${laneOfLabel(plain, /^CHORDS/)}Voice`] === 'bestPwmStrings'
    && plain.mix.voice[`${laneOfLabel(plain, /^KICK$/)}Voice`] === 'ds909Kick',
  'a banger plays the parts and the kit the table names');
  assert(dark.mix.voice[`${laneOfLabel(dark, /^BASS( ·|$)/)}Voice`] === 'bestReeseBass'
    && plain.mix.voice[`${laneOfLabel(plain, /^BASS( ·|$)/)}Voice`] === BANGER_SOUNDS['big-room'].parts.bass,
  'and a mood\'s override only in that mood');
  const only = t();
  const keep = 'bestHeroLead';
  // Bar every other hook sound that no part, kit, mood or shortlist plays, and take the ones a part does
  // play off the list — so the Hook list's only allowed sound is `keep`.
  const used = (id) => Object.values(only['big-room'].parts).includes(id)
    || Object.values(only['big-room'].kits).some((k) => Object.values(k).includes(id))
    || Object.values(only['big-room'].moods).some((m) => Object.values(m.parts).includes(id))
    || Object.values(only['big-room'].choices || {}).some((list) => list.includes(id));
  only['big-room'].never = only['big-room'].random.hook.filter((id) => id !== keep && !used(id));
  only['big-room'].random.hook = only['big-room'].random.hook.filter((id) => !used(id));
  assert(!tableIssues(only).length, 'barring sounds that sit on Random lists leaves a legal table — never-use wins there');
  let always = true;
  for (let seed = 1; seed <= 10; seed++) {
    const out = generateBanger({ riff, options: { parts: { riffSound: 'random' } }, seed, sounds: only });
    if (!/Hero Lead/.test(out.mix.labels.lead) && out.mix.voice.leadVoice !== keep) always = false;
    if (only['big-room'].never.includes(out.mix.voice.leadVoice)) always = false;
  }
  assert(always, 'Random never picks a never-use sound — with all but one hook sound barred, it is that one every time');
}

// ---------------------------------------------------------------- the file and Save
const dir = mkdtempSync(join(tmpdir(), 'mash-banger-sounds-'));
try {
  const file = join(dir, 'sounds.js');
  const src = soundsSource(tidyTable(BANGER_SOUNDS));
  writeFileSync(file, src);
  const back = (await import(`${pathToFileURL(file).href}?v=1`)).BANGER_SOUNDS;
  assert(JSON.stringify(back) === JSON.stringify(tidyTable(BANGER_SOUNDS)), 'the file round-trips through its serialiser');
  assert(soundsSource(tidyTable(back)) === src, 'and writing it again changes nothing');
  assert(readFileSync(join(process.cwd(), 'tools/lib/banger/sounds.js'), 'utf8') === src,
    'the shipped file is exactly what the page would write — a Save diffs as the choices it changed');

  const hashOf = (text) => (createRequire(import.meta.url))('node:crypto').createHash('sha256').update(text).digest('hex').slice(0, 16);
  const changed = t(); changed['big-room'].parts.bass = 'bestReeseBass';
  let out = saveTable(changed, 'not-the-hash', file);
  assert(out.status === 409 && readFileSync(file, 'utf8') === src, 'Save refuses a page that loaded before the file last changed, and writes nothing');
  const bad = t(); bad['big-room'].parts.bass = 'engSaw';
  out = saveTable(bad, hashOf(src), file);
  assert(out.status === 422 && out.body.issues.length && readFileSync(file, 'utf8') === src, 'Save refuses a table that breaks the rules, and writes nothing');
  out = saveTable(changed, hashOf(src), file);
  const saved = (await import(`${pathToFileURL(file).href}?v=2`)).BANGER_SOUNDS;
  assert(out.status === 200 && saved['big-room'].parts.bass === 'bestReeseBass' && out.body.hash === hashOf(readFileSync(file, 'utf8')),
    'Save writes a good table and hands back the new hash for the next Save');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------- the page builds
{
  const esbuild = createRequire(import.meta.url)('esbuild');
  let ok = true;
  try {
    esbuild.buildSync({ entryPoints: ['tools/banger-sounds-entry.js'], bundle: true, format: 'iife', write: false, logLevel: 'silent',
      define: { __MASH_BUILD__: '"banger-sounds"' } });
  } catch { ok = false; }
  const shell = readFileSync('tools/banger-sounds-shell.html', 'utf8');
  assert(ok && shell.includes('/banger-sounds-bundle.js') && !/<select/i.test(shell), 'the page bundles, and draws no native dropdown');
}

// ---------------------------------------------------------------- the levels know every sound
{
  // A sound the faders have no loudness curve for is levelled from its one catalogue note —
  // not wrong, but rougher. A prompt, not a failure: the Banger Sounds page adds sounds.
  const tones = new Set();
  for (const st of Object.values(BANGER_SOUNDS)) {
    for (const id of [...Object.values(st.parts || {}), ...Object.values(st.random || {}).flat()]) {
      if (VOICES[id] && ['tone', 'noise'].includes(VOICES[id].kind)) tones.add(id);
    }
  }
  const missing = [...tones].filter((id) => !BANGER_LEVEL_DATA.curves[id]).sort();
  if (missing.length) console.log(`note: no loudness curve yet for ${missing.join(', ')} — run \`node tools/banger-levels.js curves\``);
}

if (failed) { console.error('\nbanger-sounds: FAILED'); process.exit(1); }
console.log('\nbanger-sounds: all passed');
