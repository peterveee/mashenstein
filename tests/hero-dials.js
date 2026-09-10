import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BODY_GROUPS, BODY_SHAPES, HERO_DIALS, CAST, clampDial, dialByKey, bodyShapeOf, dialApplicability } from '../tools/lib/hero-dials.js';
import { renderHeroDials } from '../tools/lib/toon-specs-source.js';
import { SPEC_HOMES } from '../tools/lib/hero-dials.js';
import { readHeroDials, writeHeroDials } from '../tools/lib/toon-specs-source.js';

const src = readFileSync(new URL('../src/sprites/toons.js', import.meta.url), 'utf8');
const ok = (condition, message) => { if (!condition) throw new Error(message); };

for (const row of HERO_DIALS) {
  ok(dialByKey(row.key) === row, `manifest lookup failed for ${row.key}`);
  if (row.kind === 'number') ok(row.default === null || (row.default >= row.min && row.default <= row.max), `${row.key} default outside range`);
  ok(row.kind === 'enum' || row.step > 0, `${row.key} has no step`);
  ok(typeof row.help === 'string' && row.help.length > 20, `${row.key} has no useful tooltip help`);
}
ok(new Set(HERO_DIALS.map((row) => row.key)).size === HERO_DIALS.length, 'dial keys are not unique');
ok(BODY_GROUPS.map((group) => group.key).join(',') === 'scale,torso,arms,hip,legs', 'body groups are out of order');
ok(BODY_SHAPES.map((shape) => shape.value).join(',') === 'round,tapered', 'body shape selector changed');
ok(HERO_DIALS.some((row) => row.key === 'armLength' && row.group === 'arms'), 'arm length is not grouped under arms');
ok(HERO_DIALS.some((row) => row.key === 'armWidth' && row.group === 'arms'), 'arm width is not grouped under arms');
ok(!HERO_DIALS.some((row) => row.key === 'armLen'), 'dead armLen renderer key was exposed');
ok(bodyShapeOf({ taper: 0.8 }) === 'tapered' && bodyShapeOf({}) === 'round', 'body shape detection is wrong');
ok(!dialApplicability(dialByKey('waistScale'), {}, { mode: 'run' }).active, 'waist control is active on round body');
ok(dialApplicability(dialByKey('waistScale'), { taper: 0.8 }, { mode: 'run' }).active, 'waist control is inactive on tapered body');
ok(!dialApplicability(dialByKey('hipUnderside'), { hipJoin: 'now' }, { mode: 'run' }).active, 'flush-only control is active on now join');
for (const row of HERO_DIALS) ok(src.includes(`spec.${row.key}`), `${row.key} has no renderer read`);
ok(clampDial(dialByKey('tall'), 1.034) === 1.03, 'numbers snap to step');
ok(clampDial(dialByKey('hipJoin'), 'flush') === 'flush', 'enum accepts flush');
let rejected = false; try { clampDial(dialByKey('hipJoin'), 'sideways'); } catch { rejected = true; }
ok(rejected, 'off-enum value was accepted');

const rendered = renderHeroDials(src, SPEC_HOMES['*'], 'lorenzo', { tall: 1.03, hipJoin: 'flush', legShiftFoot: -0.09 });
ok(rendered.changed.length === 3, 'writer did not report three changes');
ok(rendered.next.includes('EDITOR_BLOCK_HEADER') === false, 'writer emitted a placeholder rather than its marker');
ok(rendered.next.includes('proportions — written by the character editor'), 'writer marker missing');
ok(rendered.next.includes("limbStyle: 'snap',"), 'writer did not preserve separator');
const again = renderHeroDials(rendered.next, SPEC_HOMES['*'], 'lorenzo', { tall: 1.03, hipJoin: 'flush', legShiftFoot: -0.09 });
ok(again.changed.length === 0, 'same values are not idempotent');
const arms = renderHeroDials(src, SPEC_HOMES['*'], 'lorenzo', { armLength: 1.1, armWidth: 1.1, armLift: 0.01, armOut: 0.02 });
ok(arms.changed.length === 4, 'writer did not report all four arm changes');
ok(arms.next.includes('armLength: 1.1') && arms.next.includes('armWidth: 1.1'), 'arm values were not written');
const armsAgain = renderHeroDials(arms.next, SPEC_HOMES['*'], 'lorenzo', { armLength: 1.1, armWidth: 1.1, armLift: 0.01, armOut: 0.02 });
ok(armsAgain.changed.length === 0, 'arm values are not idempotent');
const reset = renderHeroDials(rendered.next, SPEC_HOMES['*'], 'lorenzo', { tall: { op: 'inherit' }, hipJoin: { op: 'inherit' }, legShiftFoot: { op: 'inherit' } });
ok(!reset.next.includes('proportions — written by the character editor'), 'empty editor block was not removed');
let transientRejected = false;
try { renderHeroDials(src, SPEC_HOMES['*'], 'lorenzo', { hideSkirt: true }); } catch { transientRejected = true; }
ok(transientRejected, 'transient hide-skirts flag entered the source writer');

// Exercise the actual child-process import and atomic writer in a disposable tree.
// The live checkout is never modified by this test.
const fixture = mkdtempSync(join(tmpdir(), 'mash-character-editor-'));
try {
  cpSync(new URL('../src', import.meta.url), join(fixture, 'src'), { recursive: true });
  cpSync(new URL('../tests', import.meta.url), join(fixture, 'tests'), { recursive: true });
  cpSync(new URL('../tools', import.meta.url), join(fixture, 'tools'), { recursive: true });
  const saved = writeHeroDials(fixture, 'lorenzo', { tall: 1.03, hipJoin: 'flush', legShiftFoot: -0.09 });
  ok(saved.ok && saved.changed.length === 3, 'atomic writer did not save the fixture');
  const loaded = readHeroDials(fixture, 'lorenzo');
  ok(loaded.dials.tall === 1.03 && loaded.dials.hipJoin === 'flush', 'fixture did not reload authoritative values');
  const noOp = writeHeroDials(fixture, 'lorenzo', { tall: 1.03, hipJoin: 'flush', legShiftFoot: -0.09 }, { baseRevision: loaded.revision });
  ok(noOp.ok && noOp.changed.length === 0 && noOp.snapshot === null, 'identical save was not a no-op');
  const conflict = writeHeroDials(fixture, 'lorenzo', { tall: 1.04 }, { baseRevision: 'stale' });
  ok(conflict.conflict && !conflict.ok, 'stale revision was not refused');
  const rusty = writeHeroDials(fixture, 'rusty', { tall: 1.05 });
  ok(rusty.ok, 'Rusty spread-backed save failed');
} finally { rmSync(fixture, { recursive: true, force: true }); }
console.log('HERO DIALS: PASSED');
