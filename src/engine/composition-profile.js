// AUTHORED PORTRAIT COMPOSITION, PER CABINET.
//
// scenery-layout.js owns the DEFAULT band table — the one profile every
// cabinet starts from. This module is the seam that lets a cabinet, or one
// stage inside it, say "my sky is composed differently" without a pack-local
// pixel nudge coming back. The numbers are normalized to the scenery
// rectangle (see resolveSceneryLayout), so they mean the same thing on every
// phone; only the rectangle's height changes.
//
// Three layers, most specific wins: defaults <- cabinet <- stage. A profile
// may be partial at every layer, so a cabinet that only moves its clouds says
// only that, and a reader can see at a glance what the cabinet actually
// claims. The tuner (tools/composition-tuner.js) writes the generated data
// file; nothing else should.
import { SCENERY_BANDS } from './scenery-layout.js';
import {
  PORTRAIT_GROUND_ANCHOR_RATIO, PORTRAIT_GROUND_ANCHOR_MIN_RATIO,
  PORTRAIT_GROUND_ANCHOR_MAX_RATIO,
} from './portrait-geometry.js';
import { COMPOSITION_PROFILES } from '../data/composition-profiles.js';

export const DEFAULT_COMPOSITION_PROFILE = Object.freeze({
  bands: SCENERY_BANDS,
  groundAnchorRatio: PORTRAIT_GROUND_ANCHOR_RATIO,
});

// A band narrower than this is not a composition, it is a line: art placed in
// it has nowhere to stagger, and the tuner's two handles would land on top of
// each other. The ground ratio's limits are portraitGeometry's own clamp,
// restated here so an invalid authored file is rejected at the door rather
// than silently pinned later.
export const COMPOSITION_LIMITS = Object.freeze({
  bandMin: 0,
  bandMax: 1,
  bandMinSpan: 0.04,
  groundAnchorRatio: [PORTRAIT_GROUND_ANCHOR_MIN_RATIO, PORTRAIT_GROUND_ANCHOR_MAX_RATIO],
});

export const COMPOSITION_BAND_NAMES = Object.freeze(Object.keys(SCENERY_BANDS));

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
// Two decimal places is the tuner's drag snap and the readout's precision.
// Storing more would record pointer noise as authored intent.
const round2 = (n) => Math.round(n * 100) / 100;

function finite(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

/**
 * Clamp and round one band pair. Returns null when the input is not a usable
 * pair, so a malformed entry falls through to the layer beneath it instead of
 * poisoning the resolved profile.
 */
function validateBand(raw, fallback) {
  const pair = Array.isArray(raw) ? raw : null;
  if (!pair || pair.length < 2) return null;
  const lo0 = Number(pair[0]);
  const hi0 = Number(pair[1]);
  if (!Number.isFinite(lo0) || !Number.isFinite(hi0)) return null;
  const { bandMin, bandMax, bandMinSpan } = COMPOSITION_LIMITS;
  let lo = round2(clamp(lo0, bandMin, bandMax));
  let hi = round2(clamp(hi0, bandMin, bandMax));
  if (hi < lo) [lo, hi] = [hi, lo];
  if (hi - lo < bandMinSpan) {
    // Grow the pair around its own centre rather than pushing one edge, so a
    // too-thin band stays where the author put it.
    const mid = (lo + hi) / 2;
    lo = round2(clamp(mid - bandMinSpan / 2, bandMin, bandMax - bandMinSpan));
    hi = round2(lo + bandMinSpan);
  }
  if (Array.isArray(fallback) && lo === fallback[0] && hi === fallback[1]) {
    return Object.freeze([fallback[0], fallback[1]]);
  }
  return Object.freeze([lo, hi]);
}

/**
 * Validate one authored layer. Unknown keys and unknown band names are
 * dropped: the file is generated, and a key nothing reads is a key that will
 * be wrong the first time somebody trusts it.
 */
export function validateCompositionProfile(raw, base = DEFAULT_COMPOSITION_PROFILE) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const baseBands = base?.bands || SCENERY_BANDS;
  const bands = {};
  for (const name of COMPOSITION_BAND_NAMES) {
    const authored = validateBand(source.bands?.[name], baseBands[name]);
    bands[name] = authored || Object.freeze([baseBands[name][0], baseBands[name][1]]);
  }
  const ratio = clamp(
    finite(source.groundAnchorRatio, finite(base?.groundAnchorRatio, PORTRAIT_GROUND_ANCHOR_RATIO)),
    COMPOSITION_LIMITS.groundAnchorRatio[0], COMPOSITION_LIMITS.groundAnchorRatio[1]);
  return Object.freeze({
    bands: Object.freeze(bands),
    groundAnchorRatio: Math.round(ratio * 1000) / 1000,
  });
}

// Dev overrides live beside the authored file rather than inside it: the
// tuner drags at 60fps and must never write the repo per frame. A resolved
// profile is cached by key, and the revision is what every cache downstream
// watches — the frame's own revision cannot see a band move.
const overrides = new Map();
let revision = 0;
const resolved = new Map();

export function compositionProfileRevision() { return revision; }

/**
 * Install (or clear, with null) an in-memory profile for a cabinet or stage
 * key. Dev-only: the tuner and the tests are the callers.
 */
export function setCompositionProfileOverride(key, profile) {
  if (!key) return revision;
  if (profile == null) overrides.delete(key);
  else overrides.set(key, validateCompositionProfile(profile));
  resolved.clear();
  revision += 1;
  return revision;
}

export function clearCompositionProfileOverrides() {
  if (!overrides.size) return revision;
  overrides.clear();
  resolved.clear();
  revision += 1;
  return revision;
}

export function compositionProfileOverride(key) {
  return key ? overrides.get(key) || null : null;
}

/**
 * The resolved profile for a cabinet, optionally narrowed by the stage being
 * played. Defaults <- cabinet <- cabinet.stages[stageId], with a dev override
 * able to replace either layer by its own key.
 */
export function resolveCompositionProfile(cabinetId, stageId = null) {
  const key = `${cabinetId || ''}|${stageId || ''}`;
  const cached = resolved.get(key);
  if (cached) return cached;
  const authored = cabinetId ? COMPOSITION_PROFILES[cabinetId] : null;
  let profile = DEFAULT_COMPOSITION_PROFILE;
  if (authored) profile = validateCompositionProfile(authored, profile);
  const cabinetOverride = cabinetId ? overrides.get(cabinetId) : null;
  if (cabinetOverride) profile = validateCompositionProfile(cabinetOverride, profile);
  const stageAuthored = stageId ? authored?.stages?.[stageId] : null;
  if (stageAuthored) profile = validateCompositionProfile(stageAuthored, profile);
  const stageOverride = stageId ? overrides.get(`${cabinetId}/${stageId}`) : null;
  if (stageOverride) profile = validateCompositionProfile(stageOverride, profile);
  resolved.set(key, profile);
  return profile;
}

/**
 * True when the resolved profile is the shipped default — the tuner's "this
 * cabinet has nothing authored yet" state.
 */
export function isDefaultCompositionProfile(profile) {
  if (!profile) return true;
  if (profile.groundAnchorRatio !== DEFAULT_COMPOSITION_PROFILE.groundAnchorRatio) return false;
  return COMPOSITION_BAND_NAMES.every((name) => {
    const band = profile.bands?.[name];
    const base = SCENERY_BANDS[name];
    return band && band[0] === base[0] && band[1] === base[1];
  });
}
