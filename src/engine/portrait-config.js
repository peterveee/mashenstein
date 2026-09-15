// Approved portrait presentation values and the small validator used by the
// standalone portrait/composition preview tools. Runtime gameplay uses the
// fixed production config; preview tools may supply a temporary override.
import {
  PORTRAIT_GROUND_ANCHOR_RATIO, PORTRAIT_GROUND_ANCHOR_MIN_RATIO,
  PORTRAIT_GROUND_ANCHOR_MAX_RATIO,
} from './portrait-geometry.js';
import { PORTRAIT_BACKGROUND_ZOOM } from './frame.js';

export const PORTRAIT_CONFIG = Object.freeze({
  version: 1,
  // The approved close portrait framing buys runway while keeping the hero
  // comfortably inside the handset's left edge.
  worldZoom: 3.5,
  heroAnchorX: 16,
  // Keep backdrop silhouettes at their landscape physical scale.
  backgroundZoom: Math.round(PORTRAIT_BACKGROUND_ZOOM * 100) / 100,
  cloudOffsetY: -100,
  sunOffsetY: -100,
  sceneryOffsetY: -90,
  groundAnchorRatio: PORTRAIT_GROUND_ANCHOR_RATIO,
});

const LIMITS = Object.freeze({
  worldZoom: [1.6, 4.5],
  heroAnchorX: [12, 72],
  backgroundZoom: [1, 2.2],
  cloudOffsetY: [-100, 60],
  sunOffsetY: [-100, 60],
  sceneryOffsetY: [-120, 40],
  groundAnchorRatio: [PORTRAIT_GROUND_ANCHOR_MIN_RATIO, PORTRAIT_GROUND_ANCHOR_MAX_RATIO],
});

const clamp = (value, [lo, hi], fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
};

const round = (name, value) => {
  if (name === 'worldZoom') return Math.round(value * 1000) / 1000;
  if (name === 'heroAnchorX') return Math.round(value);
  if (name === 'backgroundZoom') return Math.round(value * 100) / 100;
  if (name === 'sceneryOffsetY') return Math.round(value);
  if (name === 'groundAnchorRatio') return Math.round(value * 200) / 200;
  return Math.round(value);
};

export function validatePortraitConfig(raw) {
  const candidate = raw && typeof raw === 'object' ? raw : {};
  const source = candidate.version == null || Number(candidate.version) === 1 ? candidate : {};
  const worldZoom = clamp(source.worldZoom, LIMITS.worldZoom, PORTRAIT_CONFIG.worldZoom);
  return Object.freeze({
    version: 1,
    worldZoom: worldZoom === PORTRAIT_CONFIG.worldZoom ? worldZoom : round('worldZoom', worldZoom),
    heroAnchorX: round('heroAnchorX', clamp(source.heroAnchorX, LIMITS.heroAnchorX, PORTRAIT_CONFIG.heroAnchorX)),
    backgroundZoom: round('backgroundZoom', clamp(source.backgroundZoom, LIMITS.backgroundZoom, PORTRAIT_CONFIG.backgroundZoom)),
    cloudOffsetY: round('cloudOffsetY', clamp(source.cloudOffsetY, LIMITS.cloudOffsetY, PORTRAIT_CONFIG.cloudOffsetY)),
    sunOffsetY: round('sunOffsetY', clamp(source.sunOffsetY, LIMITS.sunOffsetY, PORTRAIT_CONFIG.sunOffsetY)),
    sceneryOffsetY: round('sceneryOffsetY', clamp(source.sceneryOffsetY, LIMITS.sceneryOffsetY, PORTRAIT_CONFIG.sceneryOffsetY)),
    groundAnchorRatio: round('groundAnchorRatio', clamp(source.groundAnchorRatio, LIMITS.groundAnchorRatio, PORTRAIT_CONFIG.groundAnchorRatio)),
  });
}
