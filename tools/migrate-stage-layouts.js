// Materialise the 27 stages' layout fields into src/data/stage-layouts.js.
//
// The one-time move that makes the level editor the owner of a stage's pacing:
// every stage's durationSec, speedMult, appliance placement, scripted pits and
// rewind capsule are read out of src/data/stages.js and written explicitly
// into the layouts file. Values are copied, never invented — after this runs,
// resolveLayout answers from the layouts file with the same numbers it used to
// take from the stage object, and tests/layout-parity.js is the proof.
//
// Also the freeze: stages.js computes applianceAt from a formula (S(), line
// ~19). The migration writes the computed value per stage, which is the point
// — a formula cannot be dragged in an editor, twenty-seven numbers can.
//
// Idempotent and safe to re-run: it reads stages.js, not the layouts file, so
// re-running discards ANY edits made in the layouts file since. That is what
// work/level-history/ is for; the editor snapshots before every save, and this
// tool snapshots before it writes too.
//
// Usage: node tools/migrate-stage-layouts.js
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STAGES } from '../src/data/stages.js';
import { writeStageLayouts, snapshotStageLayouts } from './lib/stage-layouts-source.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function migratedLayouts() {
  return STAGES.map((s) => ({
    id: s.id,
    cabinet: s.cabinet,
    durationSec: s.durationSec,
    speedMult: s.speedMult ?? 1,
    appliance: { at: s.applianceAt, high: !!s.applianceHigh },
    pits: s.pits ? s.pits.map((p) => (p.jumps ? { at: p.at, jumps: p.jumps } : { at: p.at, w: p.w })) : null,
    rewindAt: s.rewindAt ?? null,
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const snap = snapshotStageLayouts(root);
  if (snap) console.log(`snapshotted current file to ${snap}`);
  const changed = writeStageLayouts(root, migratedLayouts());
  console.log(changed
    ? `wrote ${STAGES.length} stage layouts to src/data/stage-layouts.js`
    : 'src/data/stage-layouts.js already carries exactly this — nothing written');
}
