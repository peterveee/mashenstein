// Incremental, resumable phrase calibration. See docs/audio/banger-calibration.md.
import { readFileSync, writeFileSync, renameSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setPriority } from 'node:os';
import { createHash } from 'node:crypto';
import { discoverProfiles, scenarios, scenarioSong, scenarioPrediction, BANGER_STYLES, BANGER_COMBOS, BANGER_LEVEL_DATA } from './lib/banger-calibration.js';
import { fingerprint, referenceKey, interpolateProfile, CALIBRATION_VERSION } from './lib/banger/calibration.js';
import { soundOf, refBars } from './lib/banger/levels.js';
import { songAt, defaultBangerSong, lanePart } from './lib/banger-refs.js';
import { loudness, noteLevel } from './lib/loudness.js';
import { generateBanger } from './lib/banger/index.js';
import { riffFromNotes, DEFAULT_SIMPLE } from '../src/game/banger/riff.js';
import { BANGER_SOUNDS } from './lib/banger/sounds.js';
import { takeRenderSlot, releaseRenderSlot } from './lib/render-slots.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL = join(ROOT, 'work/local/banger-calibration');
const REPORT = join(ROOT, 'work/local/reports/banger-calibration.json');
const OUTPUT = join(ROOT, 'tools/lib/banger/calibration-data.js');
const CACHE = join(LOCAL, 'cache.json');
const LOCK = join(LOCAL, 'running');
const LAST_SUCCESS = join(LOCAL, 'last-success.json');
const readJSON = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };
export function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`; writeFileSync(tmp, text); renameSync(tmp, path);
}
function sourceStamp() {
  const files = [];
  const walk = dir => { for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const p = `${dir}/${e.name}`; if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p);
  } };
  walk('src/engine');
  files.push('tools/lib/render-bank-page.js', 'tools/lib/loudness.js',
    'tools/lib/banger/levels.js', 'tools/lib/banger/calibration.js', 'tools/lib/banger-calibration.js');
  const hash = createHash('sha256');
  // Instrument definitions are fingerprinted per profile; only shared gain logic
  // invalidates the entire cache when the voice library changes.
  const voices = readFileSync(join(ROOT, 'src/data/voices.js'), 'utf8');
  hash.update(voices.slice(0, voices.indexOf('const TONE =')));
  hash.update(readFileSync(join(ROOT, 'package-lock.json')));
  for (const p of files.sort()) hash.update(p).update(readFileSync(join(ROOT, p)));
  return hash.digest('hex');
}
function inputStamp() {
  return fingerprint(['sounds', 'channels', 'combos', 'levels-data'].map(n => readFileSync(join(ROOT, `tools/lib/banger/${n}.js`), 'utf8')));
}
function lock() {
  mkdirSync(LOCAL, { recursive: true });
  if (existsSync(LOCK)) {
    const pid = Number(readFileSync(join(LOCK, 'pid'), 'utf8'));
    let alive = true;
    try { process.kill(pid, 0); } catch (e) { if (e.code === 'ESRCH') alive = false; }
    if (alive) throw new Error(`calibration is already running (pid ${pid})`);
    rmSync(LOCK, { recursive: true });
  }
  mkdirSync(LOCK); writeFileSync(join(LOCK, 'pid'), String(process.pid));
  return () => rmSync(LOCK, { recursive: true, force: true });
}
const round = n => Math.round(n * 100) / 100;

// Calibration sometimes renders a real but very quiet phrase whose blocks all sit below
// BS.1770's -70 LUFS absolute gate (for example, a slow-attack pad on sixteenth notes).
// Preserve the normal meter whenever it has a result. If that gate alone removed every
// block, reuse the same K-weighted 400 ms blocks and relative gate without the absolute
// cutoff. Zero PCM still has no measurable level and remains an error.
function calibrationLoudness(channels) {
  const measured = loudness(channels);
  if (Number.isFinite(measured.lufs) || !Number.isFinite(measured.peakDb)) return measured;

  const sampleRate = 44100;
  const blockLen = Math.round(0.4 * sampleRate);
  const hop = Math.round(0.1 * sampleRate);
  const frames = channels[0]?.length || 0;
  const blockCount = Math.max(0, Math.floor((frames - blockLen) / hop) + 1);
  const powers = [];
  for (let b = 0; b < blockCount; b++) {
    const start = b * hop;
    const block = channels.map(channel => channel.subarray(start, start + blockLen));
    const level = noteLevel(block, sampleRate);
    if (Number.isFinite(level) && level > 0) powers.push(level * level);
  }
  if (!powers.length) return measured;

  const lufsOf = power => -0.691 + 10 * Math.log10(power);
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const relativeGate = lufsOf(mean(powers)) - 10;
  const accepted = powers.filter(power => lufsOf(power) > relativeGate);
  return { ...measured, lufs: lufsOf(mean(accepted.length ? accepted : powers)) };
}

export async function runCalibration({ command = 'refresh', styles = [], full = false, trackEffects = false, maxProfiles = Infinity, dueDays = 0, render: suppliedRender = null } = {}) {
  if (!['refresh', 'report'].includes(command)) throw new Error('command must be refresh or report');
  for (const id of styles) if (!BANGER_STYLES.some(s => s.id === id)) throw new Error(`unknown style: ${id}`);
  const selected = styles.length ? BANGER_STYLES.filter(s => styles.includes(s.id)) : BANGER_STYLES;
  const stamp = sourceStamp(), inputs = inputStamp();
  const profiles = discoverProfiles({ styles: selected, trackEffects });
  const previous = (await import(`${pathToFileURL(OUTPUT).href}?v=${Date.now()}`)).BANGER_CALIBRATION;
  const signature = fingerprint({ stamp, inputs, styles: selected.map(s => s.id), trackEffects });
  const oldReport = readJSON(REPORT, {});
  const lastSuccess = readJSON(LAST_SUCCESS, {});
  if (command === 'refresh' && dueDays && lastSuccess.signature === signature
    && Date.now() - Date.parse(lastSuccess.at) < dueDays * 86400000) {
    console.log('Calibration is current and not due yet.'); return lastSuccess;
  }
  const cache = readJSON(CACHE, { measurements: {} });
  const referenceFiles = new Map();
  const report = { at: new Date().toISOString(), signature, status: command === 'report' ? 'coverage' : 'running',
    styles: selected.map(s => s.id), trackEffects, total: profiles.length, ready: 0, measured: 0, reused: 0, rejected: [], errors: [], published: false, rows: [], mixes: [] };
  const validPrevious = previous.engine === stamp;
  const next = validPrevious ? structuredClone(previous) : { version: CALIBRATION_VERSION, profiles: {}, references: {} };
  next.engine = stamp;
  for (const p of profiles) if (validPrevious && previous.profiles[p.key]?.validated) report.ready++;
  console.log(`${profiles.length} instrument/channel profiles; ${report.ready} current. First runs are lengthy; each completed render is cached.`);
  const saveReport = () => atomicWrite(REPORT, JSON.stringify({ ...report, at: new Date().toISOString() }, null, 2) + '\n');
  if (command === 'report') { report.lastRefresh = oldReport.lastRefresh || (oldReport.status === 'complete' ? oldReport.at : null); report.lastResult = oldReport.lastResult || { status: oldReport.status, rejected: oldReport.rejected || [], errors: oldReport.errors || [] }; if (!existsSync(LOCK)) saveReport(); return report; }
  const unlock = lock();
  let renderer = null;
  const cleanup = () => { releaseRenderSlot(); unlock(); };
  const signal = () => { report.status = 'interrupted'; saveReport(); cleanup(); process.exit(130); };
  process.once('SIGINT', signal); process.once('SIGTERM', signal);
  const render = async (bank, opts) => {
    if (suppliedRender) return suppliedRender(bank, opts);
    if (!renderer) { const { openRenderer } = await import('./lib/render-bank-browser.js'); renderer = await openRenderer(); }
    await takeRenderSlot();
    try { return await renderer.render(bank, opts); } finally { releaseRenderSlot(); }
  };
  const measure = async (context, scenario) => {
    const song = scenarioSong(context, scenario);
    const key = fingerprint({ stamp, song, tail: 3 });
    if (!full && cache.measurements[key]) { report.reused++; return cache.measurements[key]; }
    const pcm = await render(song.bank, { mix: song.mix, trackId: null, arrangement: null, repeat: 1, tail: 3 });
    const channels = [pcm.outL, pcm.outR];
    const name = context.labels?.[0] || context.voice?.label || context.id || context.lane || 'Banger render';
    const pitch = scenario.features?.[0];
    const detail = `${scenario.bpm} BPM${Number.isFinite(pitch) ? `, pitch ${pitch.toFixed(1)}` : ''}`;
    if (channels.some(channel => channel.some(sample => !Number.isFinite(sample)))) {
      throw new Error(`non-finite PCM render for ${name} (${detail})`);
    }
    const level = calibrationLoudness(channels);
    if (!Number.isFinite(level.lufs) || !Number.isFinite(level.peakDb)) {
      throw new Error(`silent or non-finite render for ${name} (${detail})`);
    }
    const tailAt = Math.round(scenario.bars.length * 240 / scenario.bpm * 44100);
    let tailPeak = 0;
    for (let i = tailAt; i < pcm.outL.length; i++) tailPeak = Math.max(tailPeak, Math.abs(pcm.outL[i]), Math.abs(pcm.outR[i]));
    const value = { lufs: round(level.lufs), peakDb: round(level.peakDb), tailPeakDb: tailPeak ? round(20 * Math.log10(tailPeak)) : null };
    cache.measurements[key] = value; report.measured++;
    atomicWrite(CACHE, JSON.stringify(cache));
    return value;
  };
  try {
    saveReport();
    for (const p of profiles.slice(0, maxProfiles)) {
      const row = { label: p.labels[0], aliases: p.labels.length, key: p.key };
      if (!full && next.profiles[p.key]?.validated) { row.status = 'current'; report.rows.push(row); continue; }
      console.log(`Measuring ${p.labels[0]} (${report.rows.length + 1}/${Math.min(maxProfiles, profiles.length)})`);
      const samples = [];
      for (const s of scenarios(p)) {
        const prediction = scenarioPrediction(p, s), value = await measure(p, s);
        if (!Number.isFinite(prediction)) throw new Error(`no level prediction for ${p.id}`);
        samples.push({ features: s.features.map(round), residual: round(value.lufs - prediction), peakDb: value.peakDb, tailPeakDb: value.tailPeakDb });
      }
      const profile = { validated: true, samples };
      const errors = [];
      for (const s of scenarios(p, true)) {
        const actual = await measure(p, s);
        const estimate = interpolateProfile(profile, s.features);
        errors.push(estimate ? round(actual.lufs - scenarioPrediction(p, s) - estimate.residual) : Infinity);
      }
      row.errorDb = Math.max(...errors.map(Math.abs));
      row.peakDb = Math.max(...samples.map(s => s.peakDb));
      // A prediction with >3 dB error on an unseen phrase must not silently ship.
      if (row.errorDb > 3 || !Number.isFinite(row.errorDb)) {
        row.status = 'rejected'; report.rejected.push({ label: row.label, errorDb: Number.isFinite(row.errorDb) ? row.errorDb : null });
      } else {
        row.status = 'validated'; next.profiles[p.key] = profile;
      }
      report.rows.push(row); saveReport();
    }
    // References are real, fixed phrases from the approved mixes, measured with their
    // source channel and sends, at unity fader. They are not arbitrary LUFS targets.
    const wantedRoles = new Set(profiles.slice(0, maxProfiles).flatMap(p => p.labels.map(l => l.split('/').slice(-2)[0])));
    const refs = new Map();
    for (const style of selected) for (const source of [BANGER_LEVEL_DATA.refs[style.id], ...Object.values(BANGER_COMBOS[style.id] || {}).map(c => c.refs)]) {
      for (const [role, ref] of Object.entries(source || {})) if (wantedRoles.has(role) && !Array.isArray(refBars(ref)[0])) refs.set(referenceKey(ref), { ref, style });
    }
    for (const [key, { ref, style }] of refs) {
      if (ref.song) { const path = join(ROOT, 'src/data/imported', `${ref.song}.js`); referenceFiles.set(path, readFileSync(path, 'utf8')); }
      const song = ref.song ? await songAt(ROOT, 'src/data/imported', ref.song) : await defaultBangerSong(style, ref.variant || 0);
      const part = lanePart(song, ref.lane, ...ref.window);
      if (!part) { report.errors.push(`Reference has no part: ${ref.from}`); continue; }
      const sound = soundOf({ id: part.voice, params: part.voiceParams });
      if (!sound.voice) { report.errors.push(`Built-in reference needs a preset: ${ref.from}`); continue; }
      const context = { lane: `${ref.lane.replace(/\d+$/, '')}2`, voice: sound.voice, strip: song.mix.lanes?.[ref.lane] || {}, fx: song.mix.fx || {} };
      const scenario = { bars: refBars(ref), bpm: ref.bpm };
      const source = fingerprint({ context, scenario });
      if (!full && next.references[key]?.source === source) continue;
      const value = await measure(context, scenario);
      next.references[key] = { source, lufs: value.lufs, peakDb: value.peakDb };
    }
    // Check real generated combinations before committing the candidate table. This
    // catches a hotter summed mix even when the individual phrase fits looked good.
    const mixLevel = async (out, range) => {
      const opts = { mix: out.mix, arrangement: out.arrangement, trackId: null, range, tail: 3 };
      const key = fingerprint({ stamp, bank: out.bank, opts });
      if (!full && cache.measurements[key]) { report.reused++; return cache.measurements[key]; }
      const pcm = await render(out.bank, opts);
      const value = loudness([pcm.outL, pcm.outR]);
      if (!Number.isFinite(value.lufs) || !Number.isFinite(value.peakDb)) throw new Error('Generated validation mix is silent or invalid');
      const result = { lufs: round(value.lufs), peakDb: round(value.peakDb) };
      cache.measurements[key] = result; report.measured++;
      atomicWrite(CACHE, JSON.stringify(cache)); return result;
    };
    for (const style of selected) for (const seed of [1, 19]) for (const mode of trackEffects ? ['subtle', 'adventurous'] : ['style']) {
      const id = BANGER_SOUNDS[style.id].random.hook[0];
      const args = { riff: riffFromNotes(DEFAULT_SIMPLE, id, 'simple'), options: { style: style.id, production: { mode } }, seed };
      const candidate = generateBanger({ ...args, calibration: next });
      const changed = candidate.levels.filter(r => r.calibrated).length;
      if (!changed) { report.mixes.push({ style: style.id, seed, mode, status: 'no calibrated channels yet' }); continue; }
      const baseline = generateBanger({ ...args, calibration: { version: CALIBRATION_VERSION, profiles: {}, references: {} } });
      const section = [...candidate.form].reverse().find(f => f.role === 'drop' || f.type === 'chorus') || candidate.form.at(-1);
      const range = { startStep: (section.from - 1) * 16, endStep: Math.min(section.to, section.from + 7) * 16 };
      console.log(`Checking generated ${style.id}, seed ${seed}, ${changed} calibrated channels`);
      const before = await mixLevel(baseline, range), after = await mixLevel(candidate, range);
      const hotterClip = after.peakDb > -0.1 && after.peakDb > before.peakDb + 0.5;
      const louder = after.lufs > before.lufs + 3;
      report.mixes.push({ style: style.id, seed, mode, changed, before, after, status: hotterClip || louder ? 'rejected' : 'passed' });
      saveReport();
      if (hotterClip || louder) throw new Error(`Generated ${style.id} seed ${seed} became too loud; the previous calibration table was preserved.`);
    }
    if (sourceStamp() !== stamp || inputStamp() !== inputs || [...referenceFiles].some(([p, text]) => readFileSync(p, 'utf8') !== text)) throw new Error('Sources changed during calibration. Cached renders are safe; run refresh again. Published table was not replaced.');
    next.at = new Date().toISOString();
    // Atomic publication: generation never sees a partly-written table.
    atomicWrite(OUTPUT, '// Generated by tools/banger-calibrate.js. Only validated phrase profiles are published.\nexport const BANGER_CALIBRATION = ' + JSON.stringify(next) + ';\n');
    report.published = true;
    report.ready = profiles.filter(p => next.profiles[p.key]?.validated).length;
    report.status = maxProfiles < profiles.length ? 'partial' : report.rejected.length || report.errors.length ? 'needs-attention' : 'complete';
    report.lastRefresh = new Date().toISOString();
    if (report.status === 'complete') atomicWrite(LAST_SUCCESS, JSON.stringify({ signature, at: report.lastRefresh }));
    console.log(`${report.status}: ${report.ready}/${report.total} ready; ${report.measured} renders, ${report.reused} reused; ${report.rejected.length} rejected.`);
    saveReport(); return report;
  } catch (error) {
    report.status = 'failed'; report.errors.push(error.message); saveReport(); throw error;
  } finally {
    try { if (renderer) await renderer.close(); } finally {
      cleanup(); process.removeListener('SIGINT', signal); process.removeListener('SIGTERM', signal);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { setPriority(10); } catch { /* background priority is best effort */ }
  const args = process.argv.slice(2), command = args.shift() || 'refresh';
  const value = (flag, fallback) => Number(args.find(a => a.startsWith(`--${flag}=`))?.split('=')[1] ?? fallback);
  try {
    for (const a of args.filter(a => a.startsWith('--'))) if (!['--full', '--track-effects'].includes(a) && !/^--(max-profiles|due-days)=\d+$/.test(a)) throw new Error(`unknown option ${a}`);
    await runCalibration({ command, styles: args.filter(a => !a.startsWith('--')), full: args.includes('--full'), trackEffects: args.includes('--track-effects'), maxProfiles: value('max-profiles', Infinity), dueDays: value('due-days', 0) });
  } catch (e) { console.error(e.stack || e.message); process.exitCode = 1; }
}
