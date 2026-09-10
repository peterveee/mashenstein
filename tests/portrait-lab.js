import assert from 'node:assert/strict';
import {
  PortraitLab, PORTRAIT_LAB_DEFAULTS, PORTRAIT_LAB_STORAGE_KEY, validatePortraitConfig,
} from '../src/dev/portrait-lab.js';
import { lifecyclePolicy } from '../src/engine/lifecycle.js';
import { RunState } from '../src/game/run.js';
import { defaultSettings, defaultSlot } from '../src/engine/save.js';
import { STAGE_BY_ID } from '../src/data/stages.js';
import { CABINET_BY_ID } from '../src/data/cabinets.js';

const values = new Map();
globalThis.localStorage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};

const close = (a, b, message) => assert.ok(Math.abs(a - b) < 1e-9, `${message}: ${a} ~= ${b}`);

PortraitLab.reset();
assert.deepEqual(PortraitLab.config(), PORTRAIT_LAB_DEFAULTS, 'reset writes the review defaults');
assert.equal(PortraitLab.config().worldZoom, 2.3375, 'the agreed calibration keeps four decimals');

values.set(PORTRAIT_LAB_STORAGE_KEY, '{bad json');
assert.deepEqual(PortraitLab.config(), PORTRAIT_LAB_DEFAULTS, 'corrupt storage falls back');
values.set(PORTRAIT_LAB_STORAGE_KEY, JSON.stringify({ version: 0, worldZoom: 9 }));
assert.deepEqual(PortraitLab.config(), PORTRAIT_LAB_DEFAULTS, 'old records fall back');

values.set(PORTRAIT_LAB_STORAGE_KEY, JSON.stringify({
  version: 1, worldZoom: 9, backgroundZoom: 0, cloudOffsetY: -999, sunOffsetY: 999,
  groundAnchorRatio: 2, session: true, unexpected: 'discard me',
}));
const clamped = PortraitLab.config();
assert.equal(clamped.worldZoom, 3, 'world zoom clamps');
assert.equal(clamped.backgroundZoom, 1, 'background zoom clamps');
assert.equal(clamped.cloudOffsetY, -100, 'cloud offset clamps');
assert.equal(clamped.sunOffsetY, 60, 'sun offset clamps');
assert.equal(clamped.groundAnchorRatio, 0.75, 'ground anchor clamps');
assert.deepEqual(Object.keys(clamped).sort(), ['backgroundZoom', 'cloudOffsetY', 'groundAnchorRatio', 'sunOffsetY', 'version', 'worldZoom'],
  'unknown fields are discarded');

PortraitLab.adjust('worldZoom', -99);
close(PortraitLab.config().worldZoom, 1.6, 'fine adjustments persist through the validated store');
PortraitLab.reset();
PortraitLab.setStartPercent(0.5);
PortraitLab.setInvulnerable(true);
assert.deepEqual(PortraitLab.session(), { active: false, startPercent: 0.5, invulnerable: true },
  'session inspection aids stay in memory');
assert.equal(JSON.parse(values.get(PORTRAIT_LAB_STORAGE_KEY)).startPercent, undefined,
  'session fields never persist');
const run = { stage: { id: 'plumber-1' } };
PortraitLab.launch({ run, stage: run.stage, startPercent: 0.5, invulnerable: true });
assert.equal(PortraitLab.allowsPortrait(run), true, 'active run is allowed in portrait');
const last = PortraitLab.returnToMenu('finish');
assert.equal(last.reason, 'FINISH', 'return status is normalized');
assert.equal(PortraitLab.allowsPortrait(run), false, 'return revokes portrait allowance');

assert.equal(validatePortraitConfig({ version: 1, groundAnchorRatio: 0.655 }).groundAnchorRatio, 0.655,
  'ground anchor uses its 0.005 fine step');

const regularPortrait = lifecyclePolicy({ isIphone: true, standalone: true, portrait: true });
assert.equal(regularPortrait.paused, true, 'a normal iPhone run remains behind the portrait blocker');
PortraitLab.launch({ run, stage: run.stage });
const labPortrait = lifecyclePolicy({ isIphone: true, standalone: true, portrait: true, allowPortrait: PortraitLab.allowsPortrait(run) });
assert.equal(labPortrait.paused, false, 'an active Portrait Lab run is allowed through the portrait blocker');
PortraitLab.returnToMenu('quit');

const labSave = { slot: defaultSlot(), settings: defaultSettings(), persist() {} };
const stage = STAGE_BY_ID['plumber-1'];
const snapshotSource = { ...PORTRAIT_LAB_DEFAULTS, groundAnchorRatio: 0.655, worldZoom: 2.401 };
const labRun = new RunState({
  stage, cabinet: CABINET_BY_ID[stage.cabinet], save: labSave, seed: 123,
  difficulty: 1, initialHeroId: 'lorenzo', devStartPercent: 0.5, devInvuln: true,
  portraitLabRun: true, devPortraitLab: snapshotSource, onEnd() {},
});
assert.notEqual(labRun.devPortraitLab, snapshotSource, 'a run copies its portrait config at launch');
assert(Object.isFrozen(labRun.devPortraitLab), 'the launch snapshot is frozen');
assert.equal(labRun.devPortraitLab.groundAnchorRatio, 0.655, 'the run keeps the selected ground anchor');
assert.equal(labRun.devStartPercent, 0.5, 'Portrait Lab carries its session start percentage');
assert.equal(labRun.devInvuln, true, 'Portrait Lab carries its session invulnerability');
console.log('PORTRAIT LAB CONFIG: PASSED');
