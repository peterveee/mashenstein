// NOTHING A SYNTH PLAYS STAYS WIRED (docs/AUDIO_SYNTH_AUDIT_PLAN.md, Stage 1, 21 Oct 2026).
// One preset of every synth family and two drums play the audit's phrase on eight lanes in
// headless WebKit, silently; the lanes go quiet twice, and what the browser still pulls — and
// the sources still running — must be the same both times. KNDO-5 failed this for months (Rhythm Bankruptcy's load climbed
// 12 % → 55 % over the song and tipped the iPad at bar 39): its pre-fix engine leaves 1,642 →
// 5,866 nodes wired over 90 s, the fixed one 106 → 106. A browser suite — on demand, not in
// `npm test` — and silent (tools/audio-audit.js puts a gain-0 sink before the speakers).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = spawnSync(process.execPath, [join(ROOT, 'tools/audio-audit.js'), 'leaks', '--json', '--seconds=40'],
  { cwd: ROOT, encoding: 'utf8', timeout: 20 * 60 * 1000 });
assert.equal(run.status, 0, `the audit harness failed:\n${run.stderr || run.stdout}`);
const results = JSON.parse(run.stdout.trim().split('\n').pop());
assert.ok(results.length >= 9, `every family measured (got ${results.length})`);
for (const r of results) {
  assert.deepEqual(r.errors, [], `${r.subject}: page errors`);
  assert.ok(!r.leak, `${r.subject}: ${r.wiredA} nodes still wired at the first silence, ${r.wiredB} at the second — a note left on its lane`);
  // Sources started and never ended — unwired, so little audio cost, but each one held for the
  // rest of the session, which on a phone is memory. Until 21 Oct 2026: JMJR-4's flutter,
  // vibrato and jitter (2,784 more in 40 s of an eight-lane choir — stopped after their
  // carriers), and every note of the Tone pool, CRLS-1 and RMND-2 (Tone disposed each note's
  // oscillator before its own stop; engine/tone-retire.js).
  const grew = r.live - r.liveA;
  assert.ok(grew <= 20, `${r.subject}: ${grew} more sources running at the second silence than the first — a source unplugged before it could end`);
  console.log(`ok: ${r.subject} leaves ${r.wiredB} wired both times (${r.wiredGrowth >= 0 ? '+' : ''}${r.wiredGrowth})`);
}
console.log('AUDIO LEAKS: PASSED');
