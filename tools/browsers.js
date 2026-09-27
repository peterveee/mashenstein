// LIST (AND KILL) THE AUTOMATED CHROMIUMS on this machine — every browser that
// Playwright launched, whoever launched it.
//
// Why this exists: on 23–24 Sep 2026 two nights of song/level glitch-hunting were
// done with two stray headless Chromiums pegging the CPU, so the game in the real
// browser was fighting them for the machine. A reboot "fixed" the glitches. Nothing
// had said they were there: a headless browser has no window, and several Claude
// sessions share this machine, each able to leave one behind.
//
// WHAT IT FINDS. A Playwright browser is started with --remote-debugging-pipe (the
// render tools, the tests, the mixer's warm renderer, the Playwright MCP server), so
// that flag is the marker; your everyday Chrome never has it. CPU is summed over the
// browser's whole process tree, because the busy process is usually a renderer.
//
// WHO OWNS IT. The first non-browser ancestor. An ORPHAN (parent gone, adopted by
// launchd) is serving nobody and is always safe to kill — but it is rare: Chromium
// exits when its script dies, even to a kill -9. The usual leak is a script that
// HUNG and is still alive, holding its browser open; the owner and uptime columns
// are how you spot it. An owned one may belong to a job still running in another
// session, so kill those by pid, on purpose. The mixer (tools/mixer.js) keeps one
// warm deliberately and starts a new one if it dies.
//
//   node tools/browsers.js              list them
//   node tools/browsers.js --kill       kill the orphans
//   node tools/browsers.js --kill 1234  kill that browser (a pid from the list)
//   node tools/browsers.js --kill-all   kill every one except the mixer's
//
// Exit code 0 when nothing is left running, 1 otherwise, so a bench can refuse to
// start on a noisy machine: `node tools/browsers.js >/dev/null || echo busy`.
//
// THE DESK (tools/desk.js, :8000) shows the same list under BACKGROUND BROWSERS,
// from listBrowsers() below, with a KILL per row that goes through stopBrowser().

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function snapshot() {
  const out = execFileSync('ps', ['-Ao', 'pid=,ppid=,pcpu=,rss=,etime=,command='], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const procs = new Map();
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (m) procs.set(+m[1], { pid: +m[1], ppid: +m[2], cpu: +m[3], rssKB: +m[4], etime: m[5], cmd: m[6] });
  }
  return procs;
}

const isBrowserProc = (p) => /--remote-debugging-pipe|chrome-headless-shell|ms-playwright|playwright_chromiumdev_profile/.test(p.cmd);
const isHeadless = (cmd) => /chrome-headless-shell|--headless/.test(cmd);

function ownerKind(owner) {
  if (!owner) return 'orphan';
  if (/tools\/mixer\.js/.test(owner.cmd)) return 'mixer';
  if (/playwright[/-]mcp|@playwright\/mcp/.test(owner.cmd)) return 'mcp';
  return 'script';
}

// Repo paths relative, other absolute paths down to their last two parts, so a script
// in a scratchpad still shows its own name rather than the directory it lives in.
const shortCmd = (cmd) => cmd.replaceAll(root + '/', '')
  .replace(/\/\S*\/(\S+\/\S+)/g, '…/$1').replace(/^…\/\S*\/(node|npm|npx)\b/, '$1').slice(0, 110);

// ps etime is [[dd-]hh:]mm:ss.
function seconds(etime) {
  const [d, rest] = etime.includes('-') ? etime.split('-') : ['0', etime];
  return rest.split(':').map(Number).reduce((s, n) => s * 60 + n, 0) + Number(d) * 86400;
}
const upFor = (s) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m`
  : s < 86400 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 86400)}d ${Math.floor(s / 3600) % 24}h`);

function scan() {
  const procs = snapshot();
  const children = new Map();
  for (const p of procs.values()) (children.get(p.ppid) || children.set(p.ppid, []).get(p.ppid)).push(p);
  const tree = (pid) => [procs.get(pid), ...(children.get(pid) || []).flatMap((c) => tree(c.pid))];
  const roots = [...procs.values()].filter((p) => isBrowserProc(p) && !/--type=/.test(p.cmd)
    && !(procs.get(p.ppid) && isBrowserProc(procs.get(p.ppid))));
  return roots.map((r) => {
    const all = tree(r.pid);
    const owner = r.ppid > 1 ? procs.get(r.ppid) : null;
    const up = seconds(r.etime);
    return {
      pid: r.pid, kind: ownerKind(owner), headless: isHeadless(r.cmd),
      cpu: Math.round(all.reduce((s, p) => s + p.cpu, 0)),
      mb: Math.round(all.reduce((s, p) => s + p.rssKB, 0) / 1024),
      upSeconds: up, up: upFor(up),
      owner: owner ? { pid: owner.pid, cmd: shortCmd(owner.cmd) } : null,
      treePids: all.map((p) => p.pid),
    };
  });
}

/** Every Playwright-launched browser now, busiest first. Plain data — safe to JSON. */
export function listBrowsers() {
  return scan().sort((a, b) => b.cpu - a.cpu).map(({ treePids, ...row }) => row);
}

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

/**
 * Stop one browser by the pid listBrowsers() gave it. Refuses a pid that is not an
 * automated browser right now, so a stale list can never kill whatever reused it.
 * SIGTERM lets Chromium take its helpers down itself; anything still standing after
 * two seconds goes process by process.
 */
export async function stopBrowser(pid) {
  const b = scan().find((x) => x.pid === pid);
  if (!b) return { ok: false, error: `${pid} is not an automated browser (any more)` };
  try { process.kill(b.pid, 'SIGTERM'); } catch { /* already gone */ }
  for (let i = 0; i < 20 && alive(b.pid); i++) await new Promise((r) => setTimeout(r, 100));
  for (const p of b.treePids) if (alive(p)) try { process.kill(p, 'SIGKILL'); } catch { /* raced us */ }
  return { ok: true, kind: b.kind };
}

const asCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (asCli) {
  const args = process.argv.slice(2);
  const kill = args.includes('--kill') || args.includes('--kill-all');
  const killAll = args.includes('--kill-all');
  const killPids = args.filter((a) => /^\d+$/.test(a)).map(Number);

  let list = listBrowsers();
  if (!list.length) { console.log('no automated Chromium running'); process.exit(0); }

  for (const b of list) {
    const owner = b.owner ? `${b.kind}: pid ${b.owner.pid} ${b.owner.cmd}` : 'ORPHAN — its script is gone';
    console.log(`pid ${String(b.pid).padEnd(6)} ${b.headless ? 'headless' : 'headed  '}  cpu ${String(b.cpu).padStart(3)}%  ${String(b.mb).padStart(5)} MB  up ${b.up.padStart(7)}  ${owner}`);
  }

  if (kill || killPids.length) {
    const doomed = list.filter((b) => killPids.includes(b.pid)
      || (kill && b.kind === 'orphan')
      || (killAll && b.kind !== 'mixer'));
    const unknown = killPids.filter((pid) => !list.some((b) => b.pid === pid));
    if (unknown.length) console.log(`not an automated browser, left alone: ${unknown.join(' ')}`);
    for (const b of doomed) { await stopBrowser(b.pid); console.log(`killed ${b.pid} (${b.kind})`); }
    if (!doomed.length) console.log('nothing matched to kill');
    list = listBrowsers();
    console.log(list.length ? `${list.length} still running` : 'none left');
  }
  process.exit(list.length ? 1 : 0);
}
