// Keeps the dev server up.
//
// `npm run dev` runs THIS, which supervises `build/build.js --watch`. If the
// watcher dies for any reason — a crash, an OOM, a stray kill, a port that was
// still being released — it comes straight back, so a phone left on a tab or a
// browser left open does not quietly go stale.
//
// What it deliberately does NOT do is fight you. Ctrl-C, or any signal sent to
// the supervisor, stops both and stays stopped; only the CHILD dying triggers a
// restart. To stop everything from a script:
//
//     pkill -f 'build/dev.js'
//
// Killing just the child (`pkill -f 'build/build.js --watch'`) is what a restart
// looks like from the outside — the supervisor will put it straight back.
//
// Run the watcher unsupervised with `npm run dev:once` when you want a crash to
// actually stop and be read.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'build', 'build.js');

// An exit sooner than this means it never really came up — a build error, a
// busy port, a bad config. Those get an increasing backoff instead of a tight
// spin, and eventually give up so the reason stays on screen to be read.
const RAPID_MS = 6000;
const MAX_RAPID = 6;
// Exit code build.js uses for "the port is already in use", which is worth
// retrying: the usual cause is the previous server still letting go of it.
const EXIT_PORT_BUSY = 3;

let child = null;
let stopping = false;
let rapid = 0;

const backoff = () => Math.min(20000, 400 * 2 ** Math.max(0, rapid - 1));

function start() {
  const startedAt = Date.now();
  child = spawn(process.execPath, [target, '--watch'], { stdio: 'inherit' });

  child.on('error', (err) => {
    console.error(`dev supervisor: could not launch the watcher — ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) return;

    const lived = Date.now() - startedAt;
    if (lived < RAPID_MS) rapid += 1; else rapid = 0;

    if (rapid > MAX_RAPID) {
      console.error(`\ndev supervisor: the watcher has failed ${rapid} times in a row without`);
      console.error('  staying up. Leaving it down so the error above stays readable.');
      console.error('  Fix it, then run: npm run dev\n');
      process.exit(1);
    }

    const why = signal ? `signal ${signal}`
      : code === EXIT_PORT_BUSY ? 'port busy'
        : `exit code ${code}`;
    const wait = lived < RAPID_MS ? backoff() : 300;
    console.log(`\ndev server stopped (${why}) — restarting in ${(wait / 1000).toFixed(1)}s`);
    setTimeout(start, wait);
  });
}

// A signal aimed at the supervisor is a deliberate stop: take the child with us
// and do not come back. Without this, Ctrl-C would kill the watcher and the
// supervisor would helpfully restart the thing you were trying to quit.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    stopping = true;
    if (child) child.kill(sig);
    process.exit(0);
  });
}
// Belt and braces: never leave an orphaned watcher holding the port.
process.on('exit', () => { if (child) child.kill('SIGTERM'); });

start();
