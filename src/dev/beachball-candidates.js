// BEACH BALL BAKE-OFF — candidate looks for the Lab club's beach ball. 4 Oct 2026.
//
// Peter: "make a better looking beach ball in the lab dancefloor - bake off". Today's ball
// (club.js drawMoments, kind 'ball') is six pie wedges out from the centre with a white dot
// and a gradient laid over: it reads as a flat disc spinning in the picture plane, a
// pinwheel, not a ball. A beach ball is GORES — panels running pole to pole — so from almost
// any angle its stripes curve round the sphere and meet at a white cap. Every candidate
// here draws the gores on a real sphere (each seam projected, the far side folded out past
// the outline and clipped) and spins it about a leaning axis, so the panels sweep round in
// depth as it flies.
//
// SETTLED 4 Oct 2026: E VINYL is the club's ball (src/game/banger/beachball.js, which also
// holds the sphere and gore geometry every candidate here shares). Each is
// (ctx, x, y, r, { t, spin, dir, squash, accent }) — the ball alone, centre (x, y), radius r;
// `spin` its turn so far (radians), `dir` ±1 the way it travels, `squash` 0 in the air
// rising to 1 at the instant it lands on a head. The floor shadow stays the club's.

import {
  TAU, INK, orient, onSphere, gores, softShade, gloss, outline, clipBall, drawBeachBall,
} from '../game/banger/beachball.js';

const CLASSIC = ['#ee2b3b', '#ffffff', '#ffcf24', '#ffffff', '#2f8cf0', '#ffffff'];

export const BEACHBALL_CANDIDATES = Object.freeze([
  {
    letter: 'A', name: 'CLASSIC',
    description: 'Red, yellow and blue gores with white between, on a turning sphere. Soft gloss, thin ink edge.',
    paint(ctx, x, y, r, { spin, dir }) {
      const M = orient(spin, dir);
      ctx.save(); clipBall(ctx, x, y, r);
      gores(ctx, M, x, y, r, CLASSIC, { seam: 'rgba(0,0,0,0.12)' });
      softShade(ctx, x, y, r);
      gloss(ctx, x, y, r);
      ctx.restore();
      outline(ctx, x, y, r, Math.max(1, r * 0.04));
    },
  },
  {
    letter: 'B', name: 'CEL',
    description: 'The cast’s look: flat colour, one hard shadow crescent, a hard white shine and the cast’s contour ink.',
    paint(ctx, x, y, r, { spin, dir }) {
      const M = orient(spin, dir);
      ctx.save(); clipBall(ctx, x, y, r);
      gores(ctx, M, x, y, r, ['#ff3d4f', '#fff8ec', '#ffd23f', '#fff8ec', '#38a8ff', '#fff8ec'], { cap: '#fff8ec', seam: INK, seamW: 0.035 });
      // the shadow side: the ball less a circle nudged toward the light
      ctx.fillStyle = 'rgba(40,20,80,0.32)';
      ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0, TAU);
      ctx.arc(x - r * 0.2, y - r * 0.22, r * 0.98, 0, TAU, true); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(x - r * 0.42, y - r * 0.42, r * 0.2, r * 0.11, -0.75, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x - r * 0.12, y - r * 0.62, r * 0.06, 0, TAU); ctx.fill();
      ctx.restore();
      outline(ctx, x, y, r, Math.max(1.2, r * 0.08));
    },
  },
  {
    letter: 'C', name: 'RAINBOW',
    description: 'Six colours, no white panels — the brightest thing in the room. Gloss and a thin ink edge.',
    paint(ctx, x, y, r, { spin, dir }) {
      const M = orient(spin, dir);
      ctx.save(); clipBall(ctx, x, y, r);
      gores(ctx, M, x, y, r, ['#ff3b4e', '#ff8c2a', '#ffd93a', '#4fd25a', '#2f8cf0', '#a35cf0'], { seam: 'rgba(255,255,255,0.35)', capSize: 0.26 });
      softShade(ctx, x, y, r);
      gloss(ctx, x, y, r);
      ctx.restore();
      outline(ctx, x, y, r, Math.max(1, r * 0.04));
    },
  },
  {
    letter: 'D', name: 'CLUB-LIT',
    description: 'The classic ball dimmed to the room, then lit by it: a magenta rim one side, the accent colour the other, swelling on the beat.',
    paint(ctx, x, y, r, { t, spin, dir, accent = '#3fe0ff' }) {
      const M = orient(spin, dir);
      const pulse = 0.5 + 0.5 * Math.cos(t * TAU * 128 / 60);
      ctx.save(); clipBall(ctx, x, y, r);
      gores(ctx, M, x, y, r, CLASSIC, { seam: 'rgba(0,0,0,0.15)' });
      // the room is dark: the ball takes its tone from it, deepest at the bottom
      const dim = ctx.createLinearGradient(x, y - r, x, y + r);
      dim.addColorStop(0, 'rgba(24,10,48,0.18)'); dim.addColorStop(1, 'rgba(24,10,48,0.62)');
      ctx.fillStyle = dim; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      // two rims from the stage lights, crescents hugging the edge
      ctx.globalCompositeOperation = 'lighter';
      for (const [side, col] of [[-1, '#ff3fb4'], [1, accent]]) {
        const g = ctx.createRadialGradient(x - side * r * 0.45, y, r * 0.75, x - side * r * 0.2, y, r * 1.25);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col);
        ctx.globalAlpha = 0.55 + 0.35 * pulse;
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      gloss(ctx, x, y, r, 0.8);
      ctx.restore();
      outline(ctx, x, y, r, Math.max(1, r * 0.04));
    },
  },
  {
    letter: 'E', name: 'VINYL',
    description: 'An inflatable: welded seams, a valve, a window reflection across the top — and it squashes when it lands on a head.',
    paint(ctx, x, y, r, state) { drawBeachBall(ctx, x, y, r, state); },
  },
  {
    letter: 'F', name: 'UV GLOW',
    description: 'A blacklight ball: dark panels between fluorescent pink, lime and cyan that glow into the room.',
    paint(ctx, x, y, r, { t, spin, dir }) {
      const M = orient(spin, dir);
      const pulse = 0.5 + 0.5 * Math.cos(t * TAU * 128 / 60);
      ctx.save();
      // the glow round it first, so the ball sits in its own light
      const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
      halo.addColorStop(0, `rgba(190,90,255,${0.28 + 0.15 * pulse})`); halo.addColorStop(1, 'rgba(190,90,255,0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
      ctx.save(); clipBall(ctx, x, y, r);
      gores(ctx, M, x, y, r, ['#ff2fa8', '#1a1430', '#b6ff2e', '#1a1430', '#2ff0ff', '#1a1430'], { cap: '#f4f0ff', seam: 'rgba(255,255,255,0.18)' });
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.2 * pulse;
      gores(ctx, M, x, y, r, ['#ff2fa8', 'rgba(0,0,0,0)', '#b6ff2e', 'rgba(0,0,0,0)', '#2ff0ff', 'rgba(0,0,0,0)'], { cap: 'rgba(0,0,0,0)' });
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      softShade(ctx, x, y, r, 'rgba(10,0,30,0.55)');
      gloss(ctx, x, y, r, 0.6);
      ctx.restore();
      outline(ctx, x, y, r, Math.max(1, r * 0.04), '#0a0614');
      ctx.restore();
    },
  },
]);
