import { pythagoras, pythagorasWhipTail, CAT_FPS } from '../sprites/neonCats.js';

const TAU = Math.PI * 2;
export const PYTHAGORAS_TAIL_CANDIDATES = [
  { id: '0', name: 'Previous swish', note: 'The earlier gentler idle tail, for comparison.', motion: () => ({}) },
  { id: 'A', name: 'Whip crack · SHIPPED', note: 'Selected 18 Oct 2026. Hard reversals, a lagging middle and a sharp tip snap.', motion: pythagorasWhipTail },
  { id: 'B', name: 'Low angry lash', note: 'A broad sideways lash, with the tip dipping toward the floor.', motion(t) {
    const a = t * TAU;
    return { sweep: 7 * Math.sin(a), lift: 4 + 2 * Math.sin(2 * a + 0.4),
      flick: 1.8 * Math.sin(3 * a), bend: -2 * Math.sin(a - 0.7), stretch: 1.12 };
  } },
  { id: 'C', name: 'Double snap', note: 'Fast alternating flicks, with a second little recoil after every snap.', motion(t) {
    const a = t * TAU;
    return { sweep: 4.5 * Math.sin(2 * a) + 1.5 * Math.sin(4 * a + 0.5),
      lift: -1 + 1.2 * Math.sin(2 * a), flick: 2 * Math.sin(3 * a),
      bend: 2.5 * Math.sin(2 * a - 0.8), stretch: 1.08 + 0.1 * Math.sin(2 * a) ** 2 };
  } },
  { id: 'D', name: 'Huge furious sweep', note: 'The biggest swing: an exaggerated arc across his back and far beyond his rump.', motion(t) {
    const a = t * TAU;
    return { sweep: 9 * Math.sin(a), lift: 1.5 - 2.4 * Math.cos(a),
      flick: 1.8 * Math.sin(2 * a + 0.5), bend: -2 * Math.sin(a - 0.4), stretch: 1.2 };
  } },
  { id: 'E', name: 'Tantrum bursts', note: 'A brief gathering pause, then a burst of violent, rapid thrashing.', motion(t) {
    const a = t * TAU * 0.5;
    const burst = 0.12 + 0.88 * ((1 - Math.cos(a)) / 2) ** 2;
    return { sweep: 6.8 * burst * Math.sin(6 * a), lift: 1 - 2 * burst * Math.sin(3 * a),
      flick: 2.2 * burst * Math.sin(10 * a), bend: 2 * burst * Math.sin(6 * a - 0.9),
      stretch: 1 + 0.23 * burst };
  } },
];

export function drawPythagorasTailStudy(ctx, t, candidate, W = 640, H = 360, { smooth = false } = {}) {
  const clock = smooth ? t : Math.floor((t + 1e-8) * CAT_FPS) / CAT_FPS;
  ctx.fillStyle = '#dedde6'; ctx.fillRect(0, 0, W, H);
  const scale = Math.min(W / 46, H / 31);
  const ground = H - 30;
  ctx.fillStyle = '#c4c0cd'; ctx.fillRect(0, ground, W, H - ground);
  ctx.fillStyle = '#b3acbd'; ctx.fillRect(0, ground, W, 1);
  ctx.save();
  ctx.translate(W * 0.15, ground - 21 * scale); ctx.scale(scale, scale);
  pythagoras(ctx, 24, 21, clock, -1, { tailMotion: candidate.motion });
  ctx.restore();
}
