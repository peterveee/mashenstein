// THE DESK's port map: the one place that claims to know where every tool
// lives, checked against the tools themselves.
//
// The map is the whole value of the launcher, and it is the kind of fact that
// rots silently — a tool moves its default port, the desk keeps sending you to
// the old one, and the failure looks like "the level editor is broken" rather
// than "a number in another file is stale". So every claim in TOOLS is checked
// against the file it is about: the script exists, the env var it says it will
// hand a port to is the one that file reads, that file's own default IS that
// port, and no two tools want the same slot.
//
// Browserless: the map is data, and booting six servers to read six numbers
// would be a slower way of learning less.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOOLS, ACTIONS } from '../tools/desk.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`ok: ${msg}`);
  else { console.error(`FAIL: ${msg}`); failures++; }
}

// Where each tool's port number is actually written down. The game's dev server
// is the odd one: build/dev.js is a supervisor, and the listen is in build.js.
const PORT_SOURCE = { game: 'build/build.js' };

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

ok(TOOLS.length > 0, `the desk knows about ${TOOLS.length} tools`);

const seen = new Map();
for (const t of TOOLS) {
  ok(existsSync(join(root, t.script)), `${t.id}: ${t.script} exists`);

  const clash = seen.get(t.port);
  ok(!clash, `${t.id}: :${t.port} is its own slot${clash ? ` — shared with ${clash}` : ''}`);
  seen.set(t.port, t.id);

  const src = readFileSync(join(root, PORT_SOURCE[t.id] || t.script), 'utf8');
  ok(src.includes(`process.env.${t.portEnv}`),
    `${t.id}: reads ${t.portEnv}, so the desk can hand it a port`);
  ok(new RegExp(`(^|[^\\d])${t.port}([^\\d]|$)`, 'm').test(src),
    `${t.id}: its own default really is ${t.port} — run it by hand and you land in the same place`);

  // The npm script is the promise that the tool still runs standalone.
  const name = t.npm.replace(/^npm run /, '');
  ok(pkg.scripts[name]?.includes(t.script),
    `${t.id}: \`${t.npm}\` still starts it without the desk`);
}

// The doc is a port map too, and a port map in prose rots the same way one in
// code does — with the difference that nobody finds out until they follow it.
const doc = readFileSync(join(root, 'docs/the-desk.md'), 'utf8');
for (const t of TOOLS) {
  const row = doc.split('\n').find((l) => l.includes(`\`${t.npm}\``));
  ok(row?.includes(`| ${t.port} |`),
    `${t.id}: docs/the-desk.md sends you to ${t.port}${row ? '' : ' — no row for it at all'}`);
}

// The desk's own script, and the page it serves.
ok(pkg.scripts.desk === 'node tools/desk.js', '`npm run desk` starts the launcher');
const shell = readFileSync(join(root, 'tools/desk-shell.html'), 'utf8');
ok(shell.includes('/api/status') && shell.includes('data-tool'),
  'the page asks the desk for status and tags each row with its tool id');

ok(shell.includes('/api/browsers/kill/') && shell.includes('data-browser'),
  'the page lists background browsers and can kill one');

// AUDIO REPORTS: each RUN spawns a real tool, and /reports reads the file that tool
// writes. Both halves are checked, because a renamed report file fails as an empty
// page that says "not run yet" forever, which reads as nothing being wrong.
const audio = ACTIONS.filter((a) => a.group === 'audio');
ok(audio.length > 0, `the desk runs ${audio.length} audio reports`);
const deskSrc = readFileSync(join(root, 'tools/desk.js'), 'utf8');
for (const a of audio) {
  const steps = typeof a.steps === 'function' ? a.steps({ ids: ['neon'] }) : a.steps;
  for (const [, args] of steps) {
    const script = args.find((x) => /^tools\/.*\.js$/.test(x));
    ok(script && existsSync(join(root, script)), `${a.id}: runs ${script}, which exists`);
    const file = script && deskSrc.match(new RegExp(`'([a-z-]+\\.json)'`, 'g'));
    const writes = script && readFileSync(join(root, script), 'utf8');
    ok(file?.some((f) => writes.includes(`work/local/reports/${f.slice(1, -1)}`)),
      `${a.id}: ${script} writes a report file the desk reads`);
  }
}
const reports = readFileSync(join(root, 'tools/desk-reports.html'), 'utf8');
ok(reports.includes('/api/reports') && reports.includes('id="levels"') && reports.includes('id="bass"'),
  'the reports page reads /api/reports and has the #levels and #bass anchors the OPEN buttons use');

console.log(failures ? 'DESK: FAILED' : 'DESK: PASSED');
process.exit(failures ? 1 : 0);
