// THE SFX DESK: `npm run sfx`.
//
// The cue sheet (work/local/sfx-inventory.html) says how loud every cue measures.
// This is where you find out whether that is RIGHT — a cue is only ever too loud
// or too quiet against something, and the something is the song the player will
// be hearing it over. A blizzard hides a tick; a sparse verse leaves one
// shouting; the meter knows about neither.
//
// So the desk plays a real song through the real engine, gives every in-lane cue
// a fader and a play button, and walks the whole list on a timer when you press
// AUTO — which is how a levelling pass actually goes: listen for the one that
// jumps out, catch it with the fader under it, carry on.
//
// A fader moves SFX_TRIM live (audio.js exports it for exactly this), so there
// is no rebuild between a nudge and hearing it. Nothing is written until Save,
// and Save rewrites the numbers in src/engine/audio.js — the same bargain the
// song mixer offers. Peter reviews and commits; nothing here touches git.
//
// Ports: 8001 is the dev server and 8010 is the song mixer, so this takes 8020.
import { createServer } from 'http';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(root, 'src/engine/audio.js');
const PORT = Number(process.env.SFX_DESK_PORT || 8020);

// ------------------------------------------------------------------- bundle
// Rebuilt on every page load rather than watched: a levelling session reloads
// perhaps a dozen times, and a fresh 200ms bundle is simpler than a watcher that
// can go stale against a Save this very process just wrote.
function bundle() {
  const esbuild = require('esbuild');
  const out = esbuild.buildSync({
    entryPoints: [join(root, 'tools/sfx-desk-entry.js')],
    bundle: true,
    format: 'iife',
    write: false,
    logLevel: 'warning',
    define: { __MASH_BUILD__: '"sfx-desk"' },
  });
  return out.outputFiles[0].text;
}

// -------------------------------------------------------------------- write
// Only the numbers move. Each trim is matched inside the SFX_TRIM block and
// nowhere else — `boom: 0.36` is a plausible line in half a dozen other tables
// in this file, and rewriting one of those would be a silent, ugly bug.
//
// A cue whose value is an expression rather than a literal (`contact:
// ATTACK_MASTER_TRIM`) is refused rather than flattened: that constant is shared
// by the whole weapon family on purpose, and turning it into a number here would
// quietly unhook the family from it.
const ok = (v) => Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) <= 8;

// One pass over the file for all three tables, so a Save is one write and a
// half-applied save is not a state the desk can leave behind.
function writeAll({ trims = {}, weapons = {}, attack = null }) {
  let src = readFileSync(AUDIO, 'utf8');
  const written = [], refused = [];

  // Replace `key: <number>` inside ONE named block. `boom: 0.36` is a plausible
  // line in half a dozen other tables in this file, so the search is bounded to
  // the block that owns the key rather than run over the whole source.
  const inBlock = (opener, key, value, label) => {
    const start = src.indexOf(opener);
    if (start < 0) { refused.push(`${label}: ${opener.trim()} not found`); return false; }
    const end = src.indexOf('\n};', start) + 3;
    const block = src.slice(start, end);
    const re = new RegExp(`(?<![\\w.])${key}: (-?[\\d.]+)`);
    if (!re.test(block)) {
      refused.push(`${label}: ${block.includes(`${key}:`) ? 'not a plain number' : 'not in the table'}`);
      return false;
    }
    src = src.slice(0, start) + block.replace(re, `${key}: ${Number(Number(value).toFixed(3))}`) + src.slice(end);
    return true;
  };

  for (const [cue, value] of Object.entries(trims)) {
    if (!ok(value)) { refused.push(`${cue}: out of range`); continue; }
    if (inBlock('export const SFX_TRIM = {', cue, value, cue)) written.push(cue);
  }

  // A hero's own place in the weapon family. The two kinds are nested tables on
  // one line each inside WEAPON_AUDIO_GAIN, so the block is the LINE.
  for (const kind of ['launch', 'contact']) {
    for (const [hero, value] of Object.entries(weapons[kind] || {})) {
      const label = `${kind}:${hero}`;
      if (!ok(value)) { refused.push(`${label}: out of range`); continue; }
      const start = src.indexOf('export const WEAPON_AUDIO_GAIN = {');
      if (start < 0) { refused.push(`${label}: WEAPON_AUDIO_GAIN not found`); continue; }
      const end = src.indexOf('\n};', start) + 3;
      const block = src.slice(start, end);
      const line = new RegExp(`(\\n  ${kind}: \\{[^}]*\\})`);
      const m = block.match(line);
      if (!m) { refused.push(`${label}: no ${kind} table`); continue; }
      const re = new RegExp(`(?<![\\w.])${hero}: (-?[\\d.]+)`);
      if (!re.test(m[1])) { refused.push(`${label}: hero not in the table`); continue; }
      const fixed = m[1].replace(re, `${hero}: ${Number(Number(value).toFixed(3))}`);
      src = src.slice(0, start) + block.replace(m[1], fixed) + src.slice(end);
      written.push(label);
    }
  }

  // The family trim is a bare constant, not a table entry.
  if (attack != null) {
    if (!ok(attack)) refused.push('attack: out of range');
    else {
      const re = /export const ATTACK_MASTER_TRIM = (-?[\d.]+);/;
      if (!re.test(src)) refused.push('attack: ATTACK_MASTER_TRIM not found');
      else {
        src = src.replace(re, `export const ATTACK_MASTER_TRIM = ${Number(Number(attack).toFixed(3))};`);
        written.push('ATTACK_MASTER_TRIM');
      }
    }
  }

  if (written.length) writeFileSync(AUDIO, src);
  return { written, refused };
}

// ------------------------------------------------------------------- server
const send = (res, code, type, body) => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const out = writeAll(JSON.parse(body || '{}'));
        console.log(`saved ${out.written.length}: ${out.written.join(', ') || '—'}`);
        if (out.refused.length) console.warn(`refused: ${out.refused.join('; ')}`);
        send(res, 200, 'application/json', JSON.stringify({ written: out.written.length, refused: out.refused }));
      } catch (err) {
        send(res, 500, 'application/json', JSON.stringify({ error: String(err.message || err) }));
      }
    });
    return;
  }
  if (req.url === '/sfx-desk-bundle.js') {
    try { return send(res, 200, 'application/javascript', bundle()); } catch (err) {
      return send(res, 500, 'application/javascript', `document.body.textContent = ${JSON.stringify('bundle failed: ' + err.message)};`);
    }
  }
  const shell = join(root, 'tools/sfx-desk-shell.html');
  if (!existsSync(shell)) return send(res, 500, 'text/plain', 'shell missing');
  return send(res, 200, 'text/html', readFileSync(shell));
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`SFX desk on ${url}`);
  console.log('  pick a bed, press Auto, and catch whatever jumps out with the fader under it.');
  console.log('  Save rewrites SFX_TRIM in src/engine/audio.js. Ctrl-C to stop.');
  if (!process.env.SFX_DESK_NO_OPEN) spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
});
