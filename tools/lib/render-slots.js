// Machine-wide render slots: at most RENDER_SLOTS headless renders at once, across every
// process — so a batch (an audition sweep, a levels check) never pegs the machine somebody
// is listening on. A slot is a directory under work/local/_render-slots holding the pid
// that took it; a slot whose pid has died is taken back. The same slots
// work/local/_remix-bounce.mjs takes.
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SLOTS = Number(process.env.RENDER_SLOTS || 3);
const SLOT_DIR = join(ROOT, 'work/local/_render-slots');
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let held = null;

/** Wait for a free slot and take it. One at a time per process: take, render, release. */
export async function takeRenderSlot() {
  mkdirSync(SLOT_DIR, { recursive: true });
  let announced = false;
  for (;;) {
    for (let i = 0; i < SLOTS; i++) {
      const dir = join(SLOT_DIR, `slot-${i}`);
      try {
        mkdirSync(dir);
        writeFileSync(join(dir, 'pid'), String(process.pid));
        held = dir;
        return dir;
      } catch {
        try {
          const pid = Number(readFileSync(join(dir, 'pid'), 'utf8'));
          if (pid && !alive(pid)) rmSync(dir, { recursive: true, force: true });
        } catch { /* being written */ }
      }
    }
    if (!announced) { process.stderr.write(`(waiting for a render slot — ${SLOTS} in use)\n`); announced = true; }
    await sleep(2000);
  }
}

/** Give the slot back. Safe to call when none is held. */
export function releaseRenderSlot() {
  if (held) rmSync(held, { recursive: true, force: true });
  held = null;
}

process.on('exit', releaseRenderSlot);
process.on('SIGINT', () => { releaseRenderSlot(); process.exit(130); });
