// The level editor's writer: what it puts on disk, and what it refuses.
//
// src/data/stage-layouts.js is written by a tool and read by the game, so the
// two claims worth pinning are that a save is IDEMPOTENT — saving a file that
// came out of the writer produces the same bytes, or every session's first
// save is a diff nobody made — and that the validator refuses the shapes the
// run cannot honour, in front of the person writing them.
//
// Browserless: the writer is a pure function of the entries it is handed, and
// running the real editor page to test it would test the page instead.
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STAGE_BY_ID } from '../src/data/stages.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';
import { OBSTACLES, PICKUPS } from '../src/game/entities.js';
import {
  renderStageLayouts, writeStageLayouts, snapshotStageLayouts, validateLayouts,
} from '../tools/lib/stage-layouts-source.js';

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`ok: ${msg}`);
  else { console.error(`FAIL: ${msg}`); failures++; }
}

const reg = { STAGE_BY_ID, CABINET_BY_ID, OBSTACLES, PICKUPS };
const base = () => ([{
  id: 'plumber-3', cabinet: 'plumber',
  durationSec: 60, speedMult: 1,
  appliance: { at: 0.55, high: false },
  pits: [{ at: 0.12, w: 52 }, { at: 0.7, jumps: 4 }],
  rewindAt: null,
}]);

// ---- 1. the shape of what is written ---------------------------------------
{
  const src = renderStageLayouts(base());
  ok(src.startsWith('// GENERATED'), 'the file says it is generated');
  ok(/Do not edit/.test(src), 'and tells a reader not to hand-edit it');
  ok(/export const STAGE_LAYOUTS = \{/.test(src), 'it exports STAGE_LAYOUTS');
  ok(/"plumber-3"/.test(src), 'keyed by stage id');
  ok(/\{ at: 0\.7, jumps: 4 \}/.test(src), 'a crossing keeps its jump count, not a width');
  // Optional fields equal to their defaults stay out, or every stage in the
  // file grows a checkpoints line nobody chose. Checked against the BODY: the
  // header comment names these fields to explain them, and matching that
  // would be the test reading the documentation rather than the data.
  const body = src.slice(src.indexOf('export const STAGE_LAYOUTS'));
  ok(!/checkpoints/.test(body), 'default checkpoints are not written');
  ok(!/finishDog/.test(body), 'a default finish-dog chance is not written');
  ok(!/sections/.test(body), 'a stage with no sections has no sections key');
}

// ---- 2. round-trip: the writer's output re-renders to itself ----------------
{
  const once = renderStageLayouts(base());
  const twice = renderStageLayouts(base());
  ok(once === twice, 'rendering is deterministic');

  // And through the module loader: what it writes is valid JS that parses back
  // to the same decisions.
  const dir = mkdtempSync(join(tmpdir(), 'mash-layouts-'));
  const file = join(dir, 'stage-layouts.js');
  writeFileSync(file, once);
  const mod = await import(pathToFileURL(file).href);
  const back = Object.entries(mod.STAGE_LAYOUTS).map(([id, v]) => ({ id, cabinet: STAGE_BY_ID[id].cabinet, ...v }));
  ok(renderStageLayouts(back) === once, 'a file that came out of the writer goes back in unchanged');
}

// ---- 3. write-if-changed, and the history snapshot -------------------------
{
  const root = mkdtempSync(join(tmpdir(), 'mash-root-'));
  mkdirSync(join(root, 'src/data'), { recursive: true });
  ok(writeStageLayouts(root, base()) === true, 'the first write lands');
  ok(writeStageLayouts(root, base()) === false,
    'an identical save writes nothing — rewriting the same bytes still moves mtime and retriggers the watch build');
  const edited = base();
  edited[0].durationSec = 75;
  ok(writeStageLayouts(root, edited) === true, 'a changed save lands');
  ok(/durationSec: 75/.test(readFileSync(join(root, 'src/data/stage-layouts.js'), 'utf8')),
    'and the change is in the file');

  const snap = snapshotStageLayouts(root);
  ok(!!snap && existsSync(snap), 'the old copy is snapshotted before it is replaced');
  ok(readdirSync(join(root, 'work/level-history')).length === 1, 'into work/level-history, the disposable drawer');
}

// ---- 4. what the validator refuses ----------------------------------------
const refuses = (mutate, why) => {
  const entries = base();
  mutate(entries[0]);
  const { errors } = validateLayouts(entries, reg);
  ok(errors.length > 0, `refused: ${why}`);
};
const accepts = (mutate, why) => {
  const entries = base();
  mutate(entries[0]);
  const { errors } = validateLayouts(entries, reg);
  ok(errors.length === 0, `accepted: ${why}${errors.length ? ` (got ${errors[0]})` : ''}`);
};

ok(validateLayouts(base(), reg).errors.length === 0, 'a plain entry validates');
refuses((e) => { e.id = 'nosuch-9'; }, 'a stage id that does not exist');
refuses((e) => { e.durationSec = 0; }, 'a stage with no length');
refuses((e) => { e.speedMult = 0; }, 'a stage that does not move');
refuses((e) => { e.pits[0].at = 1.4; }, 'a pit past the end of the stage');
refuses((e) => { e.pits[0].w = 900; }, 'a pit wider than any jump');
refuses((e) => { e.pits[1].jumps = 99; }, 'a crossing of ninety-nine jumps');
refuses((e) => { e.checkpoints = [0.7, 0.3]; }, 'checkpoints that run backwards');
refuses((e) => { e.sections = [{ to: 0.5 }, { to: 0.4 }, { to: 1 }]; }, 'sections that do not advance');
refuses((e) => { e.sections = [{ to: 0.6 }]; }, 'sections that stop before the tape');
refuses((e) => { e.sections = [{ to: 1, exclude: ['notAnObstacle'] }]; }, 'excluding an obstacle that is not in the registry');
refuses((e) => { e.sections = [{ to: 1, tierCap: 7 }]; }, 'a tier that does not exist');
refuses((e) => { e.sections = [{ to: 1, drip: { weights: { capShield: 0, capMagnet: 0 } } }]; },
  'capsule weights that sum to nothing');
refuses((e) => { e.sections = [{ to: 1, drip: { weights: { notACapsule: 5 } } }]; },
  'a weight for something that is not a capsule');
accepts((e) => { e.sections = [{ to: 0.4, density: 1.5, exclude: ['cactus'] }, { to: 1 }]; },
  'a curated two-section stage');
accepts((e) => { e.finishDog = false; }, 'a stage that bans the dog outright');

// A stale pattern key WARNS rather than refuses: the bank moved under an
// exclusion that still parses, and the stage still plays.
{
  const entries = base();
  entries[0].sections = [{ to: 1, excludePatterns: ['9:notAPattern@0'] }];
  const { errors, warnings } = validateLayouts(entries, reg);
  ok(errors.length === 0 && warnings.length > 0, 'a stale pattern key warns rather than refusing the save');
}

console.log(failures ? 'LEVEL EDITOR: FAILED' : 'LEVEL EDITOR: PASSED');
process.exit(failures ? 1 : 0);
