// THE AUDIT HARNESS FAILS WHAT IT MUST (docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage 1b, 21 Oct 2026).
// tools/audio-audit.js plays each deliberately broken graph in tools/lib/audio-audit-fixtures.js
// and its fixed twin, and must call every one as the fixture expects: a note left wired, a
// modulator stopped after its carrier, a source wired only into an AudioParam, `disconnect(0)`
// on a node with two outputs, a song replaced with its tail left on the bus, one node every ten
// seconds, a pool, an eight-second tail, a connection that throws, a worklet that never loads
// (UNAVAILABLE, not cheap), and — in memory mode, in Chromium with a forced collection — a
// buffer kept per note. The Stage 1 harness passed the param, partial-disconnect and slow leaks
// and called the silent worklet clean. Then the KNDO-5 before/after proof, when its copy of the
// pre-fix engine is still in work/local. A browser suite (WebKit and Chromium), about 10 minutes.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const audit = (...a) => {
  const run = spawnSync(process.execPath, [join(ROOT, 'tools/audio-audit.js'), ...a, '--json'], { cwd: ROOT, encoding: 'utf8', timeout: 20 * 60 * 1000 });
  assert.equal(run.status, 0, `the audit harness failed:\n${run.stderr || run.stdout}`);
  return JSON.parse(run.stdout.trim().split('\n').pop());
};

for (const mode of [[], ['--memory']]) {
  const results = audit('fixture', 'all', ...mode);
  assert.ok(results.length >= (mode.length ? 2 : 13), `every ${mode.length ? 'memory' : 'graph'} fixture measured (got ${results.length})`);
  for (const r of results) {
    assert.deepEqual(r.errors, [], `${r.subject}: page errors`);
    assert.equal(r.status, r.expect, `${r.subject}: expected ${r.expect}, got ${r.status} — ${JSON.stringify(r.growth)}`);
    assert.ok(r.meta?.revision !== undefined && r.meta?.browserVersion, `${r.subject}: the result carries its metadata`);
    console.log(`ok: ${r.subject} → ${r.status}`);
  }
}

// KNDO-5's notes, before 20 Oct, against the same preset now.
const before = join(ROOT, 'work/local/_lab-kndo-before/src');
if (existsSync(before)) {
  const [old] = audit('synth', 'toneSquare', '--counts', '--seconds=30', `--src=${before}`);
  assert.equal(old.status, 'LEAK', `the pre-fix KNDO-5 engine must read as a leak (got ${old.status}, ${JSON.stringify(old.growth)})`);
  const [now] = audit('synth', 'toneSquare', '--counts', '--seconds=30');
  assert.equal(now.status, 'ok', `KNDO-5 now must read clean (got ${now.status}, ${JSON.stringify(now.growth)})`);
  console.log(`ok: KNDO-5 before ${old.wiredA} → ${old.wiredB} wired, now ${now.wiredA} → ${now.wiredB}`);
} else {
  console.log('SKIPPED: the KNDO-5 before/after proof — work/local/_lab-kndo-before/ is gone');
}
console.log('AUDIO AUDIT SELF-TEST: PASSED');
