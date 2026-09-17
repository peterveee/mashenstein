// THE DESK: one page that knows where every tool lives, and starts it for you.
//
// The tools are separate servers on purpose — the mixer wants a whole core to
// itself, and a level editor that crashed inside the same process would take a
// mix down with it. So this is a launcher, not a merger: it holds the PORT MAP,
// spawns a tool when you ask for one, and gets out of the way. No tool knows it
// exists, and every one of them still runs standalone from its own npm script.
//
// Two rules it will not break:
//
//   ADOPT, NEVER KILL. A port that is already answering belongs to somebody
//   else — most likely Peter's live mixer on 8010, mid-song. The desk links to
//   it, shows it as running, and refuses to stop it. Only a process this desk
//   started is one this desk will stop.
//
//   THE DIRECT URLS STILL WORK. 8010 is the mixer, 8020 is the SFX desk, 8001
//   is the game, as they always were. Nothing here is in the way of typing them.
//   /mixer is a shortcut ON TOP of that, not a replacement for it: it starts the
//   desk if it is cold and sends you there either way.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.MASH_DESK_HOST || '127.0.0.1';
const PORT = Number(process.env.MASH_DESK_PORT) || 8000;

// The map. Each tool reads its port from an env var already, so the desk hands
// it one and nothing else has to change. The numbers below ARE the defaults
// those tools ship with — the desk does not move anything under you.
const TOOLS = [
  {
    id: 'game', label: 'THE GAME', port: 8001,
    script: 'build/dev.js', portEnv: 'MASH_DEV_PORT', npm: 'npm run dev',
    blurb: 'the game itself, rebuilt as you save. Also what the level editor’s PLAY button opens.',
  },
  {
    id: 'mixer', label: 'MIXER', port: 8010,
    script: 'tools/mixer.js', portEnv: 'MASH_MIXER_PORT', npm: 'npm run mixer',
    blurb: 'the song desk: lanes, voices, effects, the piano roll. Writes src/data/songs/.',
  },
  {
    id: 'sfx', label: 'SFX DESK', port: 8020,
    script: 'tools/sfx-desk.js', portEnv: 'SFX_DESK_PORT', npm: 'npm run sfx',
    blurb: 'a fader per cue over a real song. Auto walks the list; Save writes SFX_TRIM.',
  },
  {
    id: 'levels', label: 'LEVEL EDITOR', port: 8021,
    script: 'tools/level-editor.js', portEnv: 'MASH_LEVELS_PORT', npm: 'npm run levels',
    blurb: 'the timeline of a stage: sections, set pieces, checkpoints, clock. Writes src/data/stage-layouts.js.',
  },
  {
    id: 'characters', label: 'CHARACTER EDITOR', port: 8030,
    script: 'tools/character-editor.js', portEnv: 'MASH_CHARACTERS_PORT', npm: 'npm run characters',
    blurb: 'a hero’s body dials. Applies to the hand-authored spec files only when you say so.',
  },
  {
    id: 'composition', label: 'COMPOSITION TUNER', port: 8031,
    script: 'tools/composition-tuner.js', portEnv: 'MASH_COMPOSITION_PORT', npm: 'npm run composition',
    blurb: 'where the scenery bands sit behind a level. Writes src/data/composition-profiles.js.',
  },
];
const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

// --------------------------------------------------------------- children ----

// Only what this process started. Anything else on a port is somebody's, and
// the difference between the two is the whole safety story.
const mine = new Map();   // id -> { child, log: string[] }

const LOG_KEEP = 40;

function start(tool) {
  // `mine` keeps the entry after a child dies, so its last words survive to be
  // shown. So the question is not whether we have an entry — it is whether that
  // entry still has a process. Asking the wrong one leaves a tool that crashed
  // unable to be started again, with a START button that quietly does nothing.
  const existing = mine.get(tool.id);
  if (existing?.child) return existing;
  const entry = existing ?? { child: null, log: [] };
  const keep = (buf) => {
    for (const line of String(buf).split('\n')) if (line.trim()) entry.log.push(line);
    while (entry.log.length > LOG_KEEP) entry.log.shift();
  };
  const child = spawn(process.execPath, [join(root, tool.script)], {
    cwd: root,
    env: { ...process.env, [tool.portEnv]: String(tool.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  child.on('exit', (code, signal) => {
    keep(`— exited (${signal || `code ${code}`}) —`);
    entry.child = null;
  });
  // An unlistened 'error' is a throw, and a desk that dies because one tool's
  // script moved would take every other tool down on its way out.
  child.on('error', (err) => {
    keep(`— could not start: ${err.message} —`);
    entry.child = null;
  });
  entry.child = child;
  mine.set(tool.id, entry);
  console.log(`  started ${tool.id} on ${tool.port} (pid ${child.pid})`);
  return entry;
}

function stop(tool) {
  const entry = mine.get(tool.id);
  if (!entry?.child) return false;
  entry.child.kill('SIGTERM');
  mine.delete(tool.id);
  console.log(`  stopped ${tool.id}`);
  return true;
}

// A port answers or it does not. Cheaper and more honest than tracking state:
// it is true of a tool started by hand in another terminal too.
const probe = (port) => new Promise((resolve) => {
  const sock = connect({ host: '127.0.0.1', port });
  const done = (live) => { sock.destroy(); resolve(live); };
  sock.setTimeout(400);
  sock.once('connect', () => done(true));
  sock.once('timeout', () => done(false));
  sock.once('error', () => done(false));
});

async function statusOf(tool) {
  const entry = mine.get(tool.id);
  return {
    id: tool.id,
    label: tool.label,
    port: tool.port,
    blurb: tool.blurb,
    npm: tool.npm,
    live: await probe(tool.port),
    mine: !!entry?.child,          // ours to stop; anything else is adopted
    pid: entry?.child?.pid ?? null,
    log: entry?.log.slice(-6) ?? [],
  };
}

// Wait for the port to answer. Bundling tools take a second or two on a cold
// start and the mixer takes longer than the rest, hence the patience — but a
// tool that has already exited is never going to answer, so the wait ends with
// the process rather than running the clock down on a corpse.
async function waitLive(tool, ms = 30000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await probe(tool.port)) return true;
    if (mine.has(tool.id) && !mine.get(tool.id).child) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

// ------------------------------------------------------------------ serve ----

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

// Redirect to the hostname the request arrived on, so the desk reached as
// MBP14.local sends you to MBP14.local and not to a loopback address the phone
// cannot open.
const hostnameOf = (req) => {
  const raw = req.headers.host || `${HOST}:${PORT}`;
  const m = /^(\[[^\]]+\]|[^:]+)/.exec(raw);
  return m ? m[1] : HOST;
};

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/') {
    const html = readFileSync(join(root, 'tools/desk-shell.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (url.pathname === '/api/status') {
    return json(res, 200, { tools: await Promise.all(TOOLS.map(statusOf)) });
  }

  const act = /^\/api\/(start|stop)\/([a-z]+)$/.exec(url.pathname);
  if (act && req.method === 'POST') {
    const tool = TOOL_BY_ID[act[2]];
    if (!tool) return json(res, 404, { ok: false, error: 'no such tool' });
    if (act[1] === 'start') {
      if (await probe(tool.port)) return json(res, 200, { ok: true, adopted: true });
      start(tool);
      return json(res, 200, { ok: true, adopted: false });
    }
    // Refusing to stop what we did not start is the point, not a limitation.
    if (!mine.get(tool.id)?.child) {
      return json(res, 409, { ok: false, error: `${tool.id} on ${tool.port} is not this desk’s to stop` });
    }
    stop(tool);
    return json(res, 200, { ok: true });
  }

  // The shortcut: /mixer, /levels, /sfx … Warm, you are redirected straight
  // away. Cold, the tool is started and the REQUEST is held until its port
  // answers — the browser shows its own loading state, which is a truer
  // progress bar than anything served here, and the redirect lands the moment
  // the tool is ready. A tool that dies on the way up says so instead, with the
  // last thing it printed.
  const tool = TOOL_BY_ID[url.pathname.slice(1)];
  if (tool && req.method === 'GET') {
    const to = `http://${hostnameOf(req)}:${tool.port}/`;
    if (await probe(tool.port)) {
      res.writeHead(302, { Location: to });
      return res.end();
    }
    start(tool);
    const live = await waitLive(tool);
    if (live) {
      res.writeHead(302, { Location: to });
      return res.end();
    }
    const log = mine.get(tool.id)?.log || [];
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(`${tool.label} did not come up on ${tool.port}.\n\n`
      + `${log.length ? log.join('\n') : '(it printed nothing)'}\n\n`
      + `Start it by hand to see more:  ${tool.npm}\n`);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
}

// Imported for the map alone — by tests/desk.js — this file must not take a
// port. Everything below the guard is the running desk; everything above it is
// data about where the tools live.
const asServer = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

export { TOOLS, probe };

if (asServer) startDesk();

function startDesk() {
const server = createServer((req, res) => handle(req, res).catch((err) => {
  console.error(err);
  if (!res.headersSent) json(res, 500, { ok: false, error: err.message });
}));

// Nothing this desk started outlives it. What it adopted is untouched.
const shutdown = () => {
  for (const [id, entry] of mine) if (entry.child) { entry.child.kill('SIGTERM'); console.log(`  stopped ${id}`); }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is in use — a desk is probably already running.`);
    console.error(`  open it:   http://localhost:${PORT}/`);
    console.error(`  or move it: MASH_DESK_PORT=8002 npm run desk\n`);
    process.exit(3);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  console.log(`THE DESK  http://${HOST}:${PORT}`);
  console.log('  straight to a tool:');
  for (const t of TOOLS) console.log(`    http://${HOST}:${PORT}/${t.id}`.padEnd(38) + `→ :${t.port}  ${t.label}`);
  console.log('  ^C stops only what this desk started.');
});
}
