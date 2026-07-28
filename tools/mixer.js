// The song mixer workbench: `npm run mixer`.
//
// Bundles tools/mixer-entry.js into tools/mixer-shell.html the same way
// build-gallery.js does, then serves it — because unlike the gallery this tool
// writes back. "Save to game" POSTs the whole mix and this process rewrites
// src/data/mix.js, which the game and every render tool then read. Peter reviews
// and commits; nothing here touches git.
import { createServer } from 'http';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';
import { openRenderer } from './lib/render-bank-browser.js';
import { wavBuffer } from './lib/wav.js';
import { loudness, gainToTarget } from './lib/loudness.js';
import { midiBuffer } from './lib/render-midi-bank.js';
import { bankFromMidi } from './lib/midi-import.js';
import { writeImportedIndex, importId, slugFor, IMPORTED_DIR } from './lib/imported-index.js';
// Through lib/tracks.js, not src/data/tracks.js: that is what registers the songs in
// src/data/imported/ as tracks, so an import is renderable without a restart.
import { resolveTrack, listTracks, registerTrack } from './lib/tracks.js';
import { isDefaultMasterChain } from '../src/engine/effects.js';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIX_PATH = join(ROOT, 'src/data/mix.js');

const HOST = process.env.MASH_MIXER_HOST || '127.0.0.1';
const PORT = Number(process.env.MASH_MIXER_PORT) || 8010;

// Rebuilt per request so a save-and-refresh picks up engine edits without a restart.
async function buildPage() {
  // And the imported list with it. It is generated from the folder, so an import
  // writes it — but a scratch bank deleted by hand left a dead import behind, and a
  // dead import is not a missing song: esbuild cannot resolve it, so the whole desk
  // came back as a stack trace. Rebuilding it here is a directory scan against a
  // bundle, and it means the folder is what the desk shows, always.
  writeImportedIndex(ROOT);
  const out = await esbuild.build({
    entryPoints: [join(ROOT, 'tools/mixer-entry.js')],
    bundle: true, format: 'iife', target: ['es2020'],
    minify: false,               // dev tool: readable stacks beat bytes
    write: false, logLevel: 'warning',
    outdir: join(ROOT, 'dist'),
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const shell = readFileSync(join(ROOT, 'tools/mixer-shell.html'), 'utf8');
  return shell.replace('/*__BUNDLE__*/', () => js);
}

// Emitted rather than JSON.stringify'd wholesale so the file stays readable and
// reviewable in a diff — this is source that gets committed, not a blob.
// Exported so it can be round-tripped in a test without standing a server up.
export function renderMixFile(mix) {
  const header = readFileSync(MIX_PATH, 'utf8').split('export const MIX')[0];
  const ids = Object.keys(mix).sort();
  if (!ids.length) return `${header}export const MIX = {};\n${tail()}`;

  // An effect chain, written out so it stays readable in a diff. This was the one
  // part of a mix the file did not carry: a chain could be built on the desk, sound
  // right, and vanish the moment it was saved.
  // A parameter name is emitted as source, so anything that is not a bare identifier
  // has to be quoted: the nested compressors address their bands as `mid.threshold`,
  // and an unquoted dot there is a syntax error in the file the whole game reads.
  const fmtKey = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
  const fmtParams = (params = {}) => Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${fmtKey(k)}: ${typeof v === 'string' ? JSON.stringify(v) : round(v)}`)
    .join(', ');
  const fmtEffects = (list = []) => `[${list.map((e) => {
    const bits = [`id: ${JSON.stringify(e.id)}`];
    if (e.bypass) bits.push('bypass: true');
    const p = fmtParams(e.params);
    if (p) bits.push(`params: { ${p} }`);
    return `{ ${bits.join(', ')} }`;
  }).join(', ')}]`;

  const laneLine = (key, L) => {
    const parts = [];
    if (L.gain) parts.push(`gain: ${round(L.gain)}`);
    if (L.pan) parts.push(`pan: ${round(L.pan)}`);
    if (L.mute) parts.push('mute: true');
    const send = L.send || {};
    const sendParts = [];
    // Anything but zero gets written. This used to skip `delay: 1` as "the default",
    // which is exactly how a channel's echo stayed invisible: the value the engine
    // used never reached the file. Both sends default to shut now.
    if (send.delay) sendParts.push(`delay: ${round(send.delay)}`);
    if (send.reverb) sendParts.push(`reverb: ${round(send.reverb)}`);
    if (sendParts.length) parts.push(`send: { ${sendParts.join(', ')} }`);
    const eq = L.eq || {};
    const eqParts = [];
    for (const b of ['low', 'mid', 'high']) if (eq[b]) eqParts.push(`${b}: ${round(eq[b])}`);
    if (eqParts.length) parts.push(`eq: { ${eqParts.join(', ')} }`);
    if (L.effects && L.effects.length) parts.push(`effects: ${fmtEffects(L.effects)}`);
    return parts.length ? `      ${key}: { ${parts.join(', ')} },\n` : '';
  };

  let body = '';
  for (const id of ids) {
    const e = mix[id] || {};
    const lanes = Object.entries(e.lanes || {})
      .map(([k, L]) => laneLine(k, L)).filter(Boolean).join('');
    // The desk seeds the master with a bypassed bus compressor, which is a starting
    // point rather than a decision — writing it out would put a masterEffects line in
    // every song in the game for a chain nobody has touched.
    const masterFx = isDefaultMasterChain(e.masterEffects) ? null : e.masterEffects;
    // Skip tracks that carry no decisions at all, so the file only holds real edits.
    if (!lanes && !e.master && !e.limiter && !e.voice && !e.fx && !masterFx) continue;
    body += `  ${JSON.stringify(id)}: {\n`;
    if (e.master) body += `    master: ${round(e.master)},\n`;
    if (e.limiter) body += '    limiter: true,\n';
    if (masterFx && masterFx.length) {
      body += `    masterEffects: ${fmtEffects(masterFx)},\n`;
    }
    if (e.voice && Object.keys(e.voice).length) body += `    voice: ${JSON.stringify(e.voice)},\n`;
    if (e.fx && Object.keys(e.fx).length) {
      const d = e.fx.delay || {}, rv = e.fx.reverb || {};
      const dp = [];
      if (d.division != null && d.division !== 0.75) dp.push(`division: ${round(d.division)}`);
      if (d.feedback != null && d.feedback !== 0.35) dp.push(`feedback: ${round(d.feedback)}`);
      if (d.tone != null && d.tone !== 2800) dp.push(`tone: ${round(d.tone)}`);
      if (d.level != null && d.level !== 1) dp.push(`level: ${round(d.level)}`);
      if (d.pan) dp.push(`pan: ${round(d.pan)}`);
      if (d.mute) dp.push('mute: true');
      if (d.effects && d.effects.length) dp.push(`effects: ${fmtEffects(d.effects)}`);
      const rp = [];
      if (rv.decay != null && rv.decay !== 2.2) rp.push(`decay: ${round(rv.decay)}`);
      if (rv.preDelay != null && rv.preDelay !== 0.012) rp.push(`preDelay: ${round(rv.preDelay)}`);
      if (rv.level != null && rv.level !== 1) rp.push(`level: ${round(rv.level)}`);
      if (rv.pan) rp.push(`pan: ${round(rv.pan)}`);
      if (rv.mute) rp.push('mute: true');
      if (rv.effects && rv.effects.length) rp.push(`effects: ${fmtEffects(rv.effects)}`);
      const bits = [];
      if (dp.length) bits.push(`delay: { ${dp.join(', ')} }`);
      if (rp.length) bits.push(`reverb: { ${rp.join(', ')} }`);
      if (bits.length) body += `    fx: { ${bits.join(', ')} },\n`;
    }
    if (lanes) body += `    lanes: {\n${lanes}    },\n`;
    body += '  },\n';
  }
  return `${header}export const MIX = {\n${body}};\n${tail()}`;
}

const round = (n) => Math.round(n * 1000) / 1000;

function tail() {
  const src = readFileSync(MIX_PATH, 'utf8');
  const i = src.indexOf('export const LANE_DEFAULTS');
  return i >= 0 ? `\n${src.slice(i)}` : '';
}

// One Chromium, opened on first use and kept warm. A launch is ~1s and the desk
// renders repeatedly while a mix is being dialled in.
let renderer = null;
async function getRenderer() {
  if (!renderer) {
    console.log('starting the render engine (headless Chromium)...');
    renderer = await openRenderer();
  }
  return renderer;
}

const readJson = async (req) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

// Render one track through the real engine with the mix applied, and measure it.
async function renderTrack(trackId, mix, { repeat = 1, write = true } = {}) {
  const track = resolveTrack(trackId);
  if (!track) throw new Error(`unknown track ${trackId}`);
  const r = await getRenderer();
  const out = await r.render(track.bank, { repeat, mix, trackId });
  const m = loudness([out.outL, out.outR]);
  let file = null;
  if (write) {
    mkdirSync(join(ROOT, 'dist'), { recursive: true });
    // Written at unity, NOT peak-normalised: the whole point is to hear the mix as
    // balanced, and normalising would silently undo the master trim being set.
    file = join('dist', `${track.slug}-mix.wav`);
    writeFileSync(join(ROOT, file), wavBuffer([out.outL, out.outR], 1));
  }
  return {
    trackId, title: track.title, file,
    seconds: out.seconds, peak: out.peak,
    peakDb: m.peakDb, lufs: m.lufs,
    toTarget: gainToTarget(m.lufs, LOUDNESS_TARGET),
    clipping: out.peak > 1,
  };
}

// Bumped per import so a re-import of the same file is a fresh module, not the one
// node already has cached.
let importSeq = 0;

// -16 LUFS: a sensible target for game music that has to sit under effects and
// dialogue without anyone reaching for the volume between cabinets.
const LOUDNESS_TARGET = -16;

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/save') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const mix = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      writeFileSync(MIX_PATH, renderMixFile(mix));
      const n = Object.keys(mix).length;
      console.log(`saved src/data/mix.js — ${n} track${n === 1 ? '' : 's'}`);
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
      return;
    }
    if (req.method === 'POST' && req.url === '/render') {
      const { trackId, mix, repeat } = await readJson(req);
      const info = await renderTrack(trackId, mix, { repeat: repeat || 1 });
      console.log(`rendered ${info.file}  ${info.lufs.toFixed(1)} LUFS  peak ${info.peakDb.toFixed(1)} dBFS`
        + (info.clipping ? '  ** CLIPPING **' : ''));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(info));
      return;
    }

    // The same render, handed to tools/audition — the plugin host, where a real
    // AU is applied to it with its own GUI open and previewed before anything is
    // committed. The desk's effects are the game's; this is for the ones that are
    // not, and Audition's OK writes its own WAV beside this one.
    //
    // The GUI belongs to this machine, so it can only be spawned by the process
    // serving the page: a browser cannot open a plugin window, and a mixer being
    // driven from another machine over MASH_MIXER_HOST will open it on the host.
    if (req.method === 'POST' && req.url === '/audition') {
      const { trackId, mix, repeat } = await readJson(req);
      // Checked before the render rather than after: a minute of Chromium is a
      // poor way to arrive at "the venv was never created".
      if (!existsSync(join(ROOT, 'tools/.venv-audio/bin/python'))) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end('tools/audition needs its virtualenv, and there is not one here:\n\n'
          + '  python3 -m venv tools/.venv-audio\n'
          + '  tools/.venv-audio/bin/pip install pedalboard pyobjc-framework-Cocoa');
        return;
      }
      const info = await renderTrack(trackId, mix, { repeat: repeat || 1 });
      // Detached and unref'd: the plugin host outlives the request, and a mixer
      // restart must not take the window down with it.
      const child = spawn(join(ROOT, 'tools/audition'), ['--src', info.file], {
        cwd: ROOT, detached: true, stdio: 'ignore',
      });
      child.unref();
      console.log(`rendered ${info.file}  ${info.lufs.toFixed(1)} LUFS  peak ${info.peakDb.toFixed(1)} dBFS`
        + (info.clipping ? '  ** CLIPPING **' : '') + '  -> audition');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ...info, auditioning: true }));
      return;
    }

    if (req.method === 'POST' && req.url === '/measure') {
      // Measure many tracks so they can be balanced against EACH OTHER, which is
      // the half of "get the volume right" that a single-song desk cannot show.
      const { trackIds, mixes } = await readJson(req);
      const rows = [];
      for (const id of trackIds) {
        const info = await renderTrack(id, mixes?.[id], { write: false });
        rows.push(info);
        console.log(`  ${id.padEnd(28)} ${info.lufs.toFixed(1)} LUFS  peak ${info.peakDb.toFixed(1)} dBFS`
          + (info.clipping ? '  ** CLIPPING **' : ''));
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ target: LOUDNESS_TARGET, rows }));
      return;
    }

    // MIDI in: the desk posts a .mid and gets back a bank, written as source next to
    // the hand-written ones. Same conversion the CLI runs — see lib/midi-import.js.
    if (req.method === 'POST' && req.url.startsWith('/import-midi')) {
      const q = new URL(req.url, `http://${HOST}:${PORT}`).searchParams;
      const chunks = [];
      for await (const c of req) chunks.push(c);
      let out;
      try {
        out = bankFromMidi(Buffer.concat(chunks), {
          name: q.get('name') || undefined,
          bpm: q.get('bpm') || undefined,
          from: q.get('file') || 'a MIDI file',
        });
      } catch (err) {
        res.writeHead(400, { 'content-type': 'text/plain' });
        res.end(String(err.message || err));
        return;
      }
      // The filename is the track id, so importing the same file twice edits the same
      // song rather than growing a second one.
      const id = importId(ROOT, slugFor(q.get('file') || out.constName), (x) => !!resolveTrack(x));
      const dir = join(ROOT, IMPORTED_DIR);
      const existed = existsSync(join(dir, `${id}.js`));
      mkdirSync(dir, { recursive: true });
      const file = join(IMPORTED_DIR, `${id}.js`);
      writeFileSync(join(ROOT, file), out.source);

      // Load the bank we just wrote, so this process can render and export the new
      // song straight away — and so the desk gets the notes back and can switch to it
      // on the spot instead of asking for a restart. The query string is a
      // cache-buster: re-importing over a song must not get the old module back.
      //
      // Loading it is also what proves the file is good, which is why it happens
      // before the folder's index lists it: every tool imports that index, so one
      // unloadable bank in there is a mixer that will not start.
      let bank;
      try {
        bank = (await import(`${pathToFileURL(join(ROOT, file)).href}?v=${++importSeq}`))[out.constName];
        if (!bank) throw new Error(`no export const ${out.constName} in the bank it just wrote`);
      } catch (err) {
        if (!existed) rmSync(join(ROOT, file), { force: true });
        console.error(`import failed to load: ${file}\n${err.stack || err}`);
        res.writeHead(500, { 'content-type': 'text/plain' });
        res.end(`the bank written from that file will not load — this is a bug in the `
          + `importer, not in your MIDI:\n\n${err.message || err}`);
        return;
      }
      writeImportedIndex(ROOT);
      registerTrack({ id, bank, title: out.title, slug: id });
      console.log(`imported ${file} — export const ${out.constName}`
        + ` (${out.bpm}bpm, ${out.blocks} blocks -> ${out.sections} sections)`
        + `  [track: ${id}]`);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        ...out, source: undefined, file,
        track: { id, title: out.title, slug: id, bank },
      }));
      return;
    }

    // The song as MIDI, straight from the desk. The notes are the one part of a
    // song that belongs somewhere other than here — a DAW, a phone, a collaborator —
    // and tools/import-midi.js reads this format back.
    // HEAD as well as GET: a HEAD that 404s where a GET succeeds is a confusing
    // thing to meet with curl at midnight.
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url.startsWith('/midi')) {
      const q = new URL(req.url, `http://${HOST}:${PORT}`).searchParams;
      const track = resolveTrack(q.get('track'));
      if (!track) { res.writeHead(404); res.end('unknown track'); return; }
      const repeat = Math.max(1, Number(q.get('repeat')) || 1);
      // Channel 1 for everything; ?patches=1 adds the GM programs (still channel 1
      // — Logic externalizes multi-channel files), and ?gm=1 is the full per-channel
      // GM layout for hardware. See render-midi-bank.js.
      const gm = q.get('gm') === '1';
      const midi = midiBuffer(track.bank, {
        repeat, title: track.title, gmChannels: gm, patches: gm || q.get('patches') === '1',
      });
      console.log(`midi: ${track.slug}.mid — ${midi.trackNames.length} instrument tracks`);
      res.writeHead(200, {
        'content-type': 'audio/midi',
        'content-length': midi.buffer.length,
        'content-disposition': `attachment; filename="${track.slug}.mid"`,
      });
      res.end(req.method === 'HEAD' ? undefined : midi.buffer);
      return;
    }

    if (req.url === '/tracks') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(listTracks()));
      return;
    }

    if (req.url === '/' || req.url.startsWith('/?')) {
      const html = await buildPage();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    res.writeHead(404); res.end('not found');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err && err.stack ? err.stack : err));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is in use — a mixer is probably already running.`);
    console.error(`  stop it:      pkill -f 'tools/mixer.js'`);
    console.error(`  or move it:   MASH_MIXER_PORT=8011 npm run mixer\n`);
    process.exit(3);
  }
  throw err;
});

// Only when run as `npm run mixer`; importing this module (a test round-tripping
// renderMixFile, say) must not take the port.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, HOST, () => {
    console.log(`song mixer: http://${HOST}:${PORT}/`);
    console.log(`  "Save to game" writes ${MIX_PATH.replace(ROOT + '/', '')}`);
  });
}
