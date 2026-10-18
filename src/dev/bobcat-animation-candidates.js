// Speed Zone animation studies, 18 Oct 2026. Same animal, palette and production fit.
// Explicit gape repairs the missing value in gallopPose's return for the studies.
import {
  BOBCAT_BUILD, BOBCAT_GALLOP, BOBCAT_LEGACY_BUILD, BOBCAT_LEGACY_GALLOP, BOBCAT_MOUTH, BOBCAT_RIG, BOBCAT_VISUAL,
  bobcatStride, paintBobcatStudy,
} from '../sprites/bobcat.js';

const baseStride = bobcatStride(29, BOBCAT_VISUAL);
const make = (id, name, note, build, gait, mouth) => ({
  id, name, note, build: { ...BOBCAT_LEGACY_BUILD, hindSegments: [.46, .42, .20], foreSegments: [.48, .46, .17], pawCurl: .8, ...build },
  gait: { ...BOBCAT_LEGACY_GALLOP, ...gait }, mouth,
});
export const BOBCAT_ANIMATION_CANDIDATES = [
  { id: '0', name: 'Previous gait', note: 'The earlier low gallop, kept for comparison.', control: true, build: BOBCAT_LEGACY_BUILD, gait: BOBCAT_LEGACY_GALLOP, mouth: [0,0,0,0,0,0,0,0] },
  make('A', 'Fluid gallop', 'A longer stretch and gather, soft landings, steady head and a jaw that opens on the reach.',
    { flexK: 0.29, flexArch: 1.7 },
    { strideL: 3.05, bob: 0.14, pitch: 0.075, headHold: 0.82, liftF: 0.39, liftH: 0.34,
      foreNear: 0.44, foreFar: 0.51, foreDuty: 0.23, hindDuty: 0.24, flightE: 0.36, flightG: 0.86 },
    [0.32, 0.58, 0.94, 0.82, 0.42, 0.10, 0.04, 0.12]),
  { id: 'B', name: 'Power bound · SHIPPED', note: 'Selected 18 Oct 2026. The production animation, with staggered footfalls, attached markings and articulated paws.',
    build: BOBCAT_BUILD, gait: BOBCAT_GALLOP, mouth: BOBCAT_MOUTH, shipped: true },
  make('C', 'Low pursuit', 'A smooth, low reaching run: less bounce, a flexible back and a smaller rhythmic pant.',
    { flexK: 0.25, flexArch: 1.35, low: 0.18, neckAng: -9 },
    { strideL: 3.15, bob: 0.065, pitch: 0.035, headHold: 0.9, liftF: 0.30, liftH: 0.28,
      foreNear: 0.43, foreFar: 0.52, foreDuty: 0.26, hindDuty: 0.26, flightE: 0.35, flightG: 0.85 },
    [0.20, 0.38, 0.68, 0.62, 0.36, 0.11, 0.03, 0.08]),
];

export function studyPose(cand, phase) {
  const P = BOBCAT_RIG.gallopPose(cand.build, phase, cand.gait);
  P.gape = Math.max(0, Math.min(1, BOBCAT_RIG.cyc(cand.mouth, phase)));
  return P;
}
export function studyStride(cand) {
  return baseStride * cand.gait.strideL / BOBCAT_GALLOP.strideL;
}
// Paint the source paths directly into the desktop canvas at its display density.
// No intermediate sprite cache: eyes, jaw, coat and joints retain their authored detail.
export function drawBobcatAnimationStudy(ctx, t, cand, W = 640, H = 360, phase = null) {
  const p = phase ?? (t * 38 / studyStride(cand)) % 1;
  const artW = W * 0.88, artH = artW * 14 / 32;
  const roadY = H - 38;
  ctx.fillStyle = '#f1dfb8'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#75634b'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('DESKTOP DETAIL', 18, 25);
  ctx.fillStyle = '#d4ad70'; ctx.fillRect(0, roadY, W, H - roadY);
  ctx.fillStyle = '#a47f4f'; ctx.fillRect(0, roadY, W, 2);
  const distance = phase == null ? t * 38 : p * studyStride(cand);
  const roadScale = artW / 32;
  ctx.fillStyle = '#b78c56';
  for (let i = -2; i < W / 90 + 2; i++) {
    const x = i * 90 + (distance * roadScale) % 90;
    ctx.fillRect(x, roadY + 16, 24, 2);
  }
  ctx.fillStyle = '#80613c22'; ctx.beginPath();
  ctx.ellipse(W / 2, roadY, artW * .32, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate((W - artW) / 2, roadY - artH);
  const posePhase = cand.control ? Math.floor(p * 16) / 16 : ((p % 1) + 1) % 1;
  paintBobcatStudy(ctx, artW, artH, cand.build, studyPose(cand, posePhase));
  ctx.restore();
  ctx.fillStyle = '#75634b'; ctx.font = '11px system-ui'; ctx.textAlign = 'right';
  ctx.fillText(`STRIDE ${Math.round((((p % 1) + 1) % 1) * 100)}%`, W - 18, 25);
}
