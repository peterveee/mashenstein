// The authored portrait composition: resolution order, validation, and the
// promise that a repo with nothing authored draws exactly what it drew before
// the profile seam existed.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  COMPOSITION_BAND_NAMES, COMPOSITION_LIMITS, DEFAULT_COMPOSITION_PROFILE,
  clearCompositionProfileOverrides, compositionProfileRevision, isDefaultCompositionProfile,
  resolveCompositionProfile, setCompositionProfileOverride, validateCompositionProfile,
} from '../src/engine/composition-profile.js';
import { SCENERY_BANDS, resolveSceneryLayout } from '../src/engine/scenery-layout.js';
import {
  PORTRAIT_GROUND_ANCHOR_RATIO, PORTRAIT_GROUND_ANCHOR_MAX_RATIO,
} from '../src/engine/portrait-geometry.js';
import { frameForViewport, defaultFrame } from '../src/engine/frame.js';
import { portraitHudLayout } from '../src/game/portrait-layout.js';
import {
  renderCompositionProfiles, writeCompositionProfiles, snapshotCompositionProfiles,
} from '../tools/lib/composition-profiles-source.js';
import { mergeProfile } from '../tools/composition-tuner.js';

const frame = frameForViewport({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 47, right: 0, bottom: 34, left: 0 },
});
const hud = portraitHudLayout(frame);

// ---- the default is the shipped composition, byte for byte ------------------

const shipped = resolveSceneryLayout({ frame, hud, groundY: 232 });
const throughProfile = resolveSceneryLayout({
  frame, hud, groundY: 232, bands: DEFAULT_COMPOSITION_PROFILE.bands,
});
for (const name of COMPOSITION_BAND_NAMES) {
  assert.deepEqual(throughProfile.screenBands[name], shipped.screenBands[name],
    `${name} resolves identically through the default profile`);
}
assert.equal(DEFAULT_COMPOSITION_PROFILE.groundAnchorRatio, PORTRAIT_GROUND_ANCHOR_RATIO,
  'the default profile is the shipped ground anchor');
// Deliberately an id no cabinet uses: the point is that an UNAUTHORED cabinet
// falls through to the defaults. Naming a real cabinet here would make this
// assertion fail the moment somebody tunes that cabinet, which is the tool
// working rather than the seam breaking.
assert.ok(isDefaultCompositionProfile(resolveCompositionProfile('no-such-cabinet')),
  'a cabinet with nothing authored resolves to the default profile');

// A custom table actually reaches the resolved bands. Without this the seam
// would be decorative and every tuner drag a no-op.
const moved = resolveSceneryLayout({
  frame, hud, groundY: 232, bands: { ...SCENERY_BANDS, celestial: [0.50, 0.60] },
});
assert.ok(moved.screenBands.celestial.center > shipped.screenBands.celestial.center + 50,
  'a moved band moves the resolved screen position');
assert.deepEqual(Object.keys(moved.profileBands).sort(), COMPOSITION_BAND_NAMES.slice().sort(),
  'the resolved layout reports the band table it actually used');

// Landscape never sees a portrait profile: its frame has no scenery rectangle
// of its own and its packs are not given the depth context.
const landscape = defaultFrame();
assert.equal(landscape.groundScreenY, 232, 'the landscape anchor is untouched');

// ---- validation ------------------------------------------------------------

const clamped = validateCompositionProfile({
  bands: { celestial: [-4, 9], near: [0.9, 0.2] },
  groundAnchorRatio: 3,
  unexpected: 'discard me',
});
assert.deepEqual(clamped.bands.celestial, [0, 1], 'band edges clamp into the rectangle');
assert.deepEqual(clamped.bands.near, [0.2, 0.9], 'an inverted pair is put back in order');
assert.equal(clamped.groundAnchorRatio, PORTRAIT_GROUND_ANCHOR_MAX_RATIO,
  'the ground ratio clamps to portraitGeometry limits');
assert.deepEqual(Object.keys(clamped).sort(), ['bands', 'groundAnchorRatio'],
  'unknown keys are discarded');
assert.deepEqual(Object.keys(clamped.bands).sort(), COMPOSITION_BAND_NAMES.slice().sort(),
  'every band is present after validation, filled from the layer beneath');

const thin = validateCompositionProfile({ bands: { middle: [0.500, 0.505] } });
assert.ok(thin.bands.middle[1] - thin.bands.middle[0] >= COMPOSITION_LIMITS.bandMinSpan - 1e-9,
  'a band thinner than the minimum span is grown, not accepted');
assert.ok(Math.abs((thin.bands.middle[0] + thin.bands.middle[1]) / 2 - 0.5) < 0.03,
  'growing a thin band keeps it where the author put it');

const rounded = validateCompositionProfile({ bands: { birds: [0.123456, 0.654321] } });
assert.deepEqual(rounded.bands.birds, [0.12, 0.65], 'bands round to the tuner\'s 1% snap');

const garbage = validateCompositionProfile({ bands: { celestial: 'nope', near: [NaN, 1] } });
assert.deepEqual(garbage.bands.celestial, SCENERY_BANDS.celestial,
  'a malformed band falls through to the layer beneath instead of poisoning the profile');
assert.deepEqual(garbage.bands.near, SCENERY_BANDS.near, 'a non-finite edge is refused the same way');

// ---- resolution order ------------------------------------------------------

clearCompositionProfileOverrides();
const before = compositionProfileRevision();
// Overrides are exercised on the unauthored id so the assertions stay true
// whatever Peter has tuned into the data file.
const authoredNear = resolveCompositionProfile('no-such-cabinet').bands.near;
setCompositionProfileOverride('no-such-cabinet', { bands: { celestial: [0.04, 0.18] } });
assert.ok(compositionProfileRevision() > before, 'installing an override bumps the revision');
assert.deepEqual(resolveCompositionProfile('no-such-cabinet').bands.celestial, [0.04, 0.18],
  'a cabinet override wins over the default');
assert.deepEqual(resolveCompositionProfile('no-such-cabinet').bands.near, authoredNear,
  'a partial override leaves every other band where it was');
assert.deepEqual(resolveCompositionProfile('another-cabinet').bands.celestial, SCENERY_BANDS.celestial,
  'one cabinet\'s override does not reach another');

setCompositionProfileOverride('no-such-cabinet/some-stage', { bands: { celestial: [0.30, 0.40] } });
assert.deepEqual(resolveCompositionProfile('no-such-cabinet', 'some-stage').bands.celestial, [0.30, 0.40],
  'a stage override wins over its cabinet');
assert.deepEqual(resolveCompositionProfile('no-such-cabinet', 'other-stage').bands.celestial, [0.04, 0.18],
  'a sibling stage keeps the cabinet profile');
assert.deepEqual(resolveCompositionProfile('no-such-cabinet', 'some-stage').bands.near, authoredNear,
  'the stage layer merges over the cabinet rather than replacing it');

clearCompositionProfileOverrides();
assert.ok(isDefaultCompositionProfile(resolveCompositionProfile('no-such-cabinet')),
  'clearing the overrides returns every cabinet to what is authored');

// ---- the generated file ----------------------------------------------------

const full = {
  plumber: {
    bands: { ...SCENERY_BANDS, celestial: [0.03, 0.15] },
    groundAnchorRatio: 0.71,
    stages: { 'plumber-2': { bands: { ...SCENERY_BANDS, near: [0.66, 0.90] }, groundAnchorRatio: 0.71 } },
  },
};
const source = renderCompositionProfiles(full);
assert.ok(source.startsWith('// GENERATED by tools/composition-tuner.js'),
  'the generated file says so on its first line');
assert.match(source, /celestial: \[0\.03, 0\.15\]/, 'a moved band is written');
assert.ok(!/upperCloud/.test(source),
  'a band equal to the default is left out, so the file shows what somebody meant');
assert.match(source, /'plumber-2'/, 'a stage override is written under its cabinet');
assert.ok(!/groundAnchorRatio/.test(source.split("'plumber-2'")[1]),
  'a stage that matches its cabinet\'s ratio does not restate it');
assert.equal(renderCompositionProfiles(full), source, 'rendering is deterministic');

const empty = renderCompositionProfiles({ plumber: { bands: SCENERY_BANDS, groundAnchorRatio: PORTRAIT_GROUND_ANCHOR_RATIO } });
assert.match(empty, /COMPOSITION_PROFILES = \{\};/,
  'a cabinet that claims nothing is not written at all');

// Round trip: what the writer emits is what the resolver reads back.
const root = mkdtempSync(join(tmpdir(), 'mash-composition-'));
mkdirSync(join(root, 'src/data'), { recursive: true });
assert.equal(writeCompositionProfiles(root, full), true, 'the first write reports a change');
assert.equal(writeCompositionProfiles(root, full), false, 'an identical write is a no-op');
const written = readFileSync(join(root, 'src/data/composition-profiles.js'), 'utf8');
assert.equal(written, source, 'the file on disk is exactly what render produced');
const snapshot = snapshotCompositionProfiles(root);
assert.ok(snapshot && existsSync(snapshot), 'saving snapshots the previous copy');
assert.ok(readdirSync(join(root, 'work/composition-history')).length >= 1,
  'the snapshot lands in work/composition-history');

// ---- the tuner's merge -----------------------------------------------------

const mergedCabinet = mergeProfile({}, {
  cabinet: 'plumber', stage: null,
  profile: { bands: { ...SCENERY_BANDS, celestial: [0.05, 0.2] }, groundAnchorRatio: 0.72 },
});
assert.deepEqual(mergedCabinet.plumber.bands.celestial, [0.05, 0.2], 'a cabinet save lands on the cabinet');
const mergedStage = mergeProfile(mergedCabinet, {
  cabinet: 'plumber', stage: 'plumber-2',
  profile: { bands: { ...SCENERY_BANDS, near: [0.7, 0.92] }, groundAnchorRatio: 0.72 },
});
assert.deepEqual(mergedStage.plumber.bands.celestial, [0.05, 0.2],
  'saving a stage leaves the cabinet entry alone');
assert.deepEqual(mergedStage.plumber.stages['plumber-2'].bands.near, [0.7, 0.92],
  'a stage save lands under its cabinet');
assert.throws(() => mergeProfile({}, { cabinet: 'nope', profile: {} }), /unknown cabinet/,
  'an unknown cabinet is refused');
assert.throws(() => mergeProfile({}, { cabinet: 'plumber', stage: 'speed-1', profile: {} }),
  /not a plumber stage/, 'a stage from another cabinet is refused');

console.log('COMPOSITION PROFILE: PASSED');
