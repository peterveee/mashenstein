// "We are speeding up" — candidate treatments for the boost pad's payout.
//
// BAKE-OFF, undecided. The shipped one is whichever id drawBoostFx() is
// pointed at; every other variant here is kept drawable so the gallery section
// that decides this stays honest. Same shape as HANDOFF_VARIANTS in
// credits-handoff.js, and for the same reason: the gallery must be able to
// render a candidate through the exact code that would ship it.
//
// Each variant draws into WORLD space with the hero at `x` and their feet on
// `groundY`. `q` runs 1 -> 0 across the effect's life, so 1 is the instant the
// pad fires. `drawHero()` paints the hero at their own position: a variant
// decides where in its own stack that happens, because the whole difference
// between an afterimage and a foreground streak is what order they land in.
//
// The first pass shipped RECTANGLES — a gold bar thrown along the floor and
// four pale bars beside the hero. They are cheap and they read as UI, not as
// speed: a rectangle has no direction. Everything below has a taper, a
// vanishing point, or a body attached to it.

// A tapered streak: wide at the tail, sharp at the leading tip. The taper is
// the entire trick — it is what makes a mark read as travelling rather than as
// a bar someone left on the screen.
function streak(ctx, x, y, len, thick, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);                       // tip
  ctx.lineTo(x - len, y - thick / 2);
  ctx.lineTo(x - len, y + thick / 2);
  ctx.closePath();
  ctx.fill();
}

// The floor racing backwards under the hero, plus dust off the heels.
//
// Every mark is placed against `groundDelta(dx)` — how far the terrain rises
// or falls that many pixels either side of the hero — so on a slope the
// chevrons lie IN the ground rather than on a level line drawn through it. A
// caller with no terrain (the gallery's flat strip) passes a delta of zero and
// gets the same drawing. Chevrons are also SHEARED by the local gradient, so
// each one sits on the slope it is painted on instead of standing upright on a
// hill like a row of fence posts.
function groundRush(ctx, { x, groundY, t, q, groundDelta }, taper = 0) {
  const gd = groundDelta || (() => 0);
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const p = (t * 2.6 + i / 7) % 1;
    const dx = 36 - p * 110;
    const sx = x + dx;
    const gy = groundY + gd(dx);
    // Local gradient across the chevron's own width, so it lies along the
    // ground rather than across it.
    const rise = gd(dx + 7 * (1 - taper * 0.66 * p)) - gd(dx);
    const fade = Math.sin(p * Math.PI);
    // `taper` shrinks each chevron as it falls behind. At 0 they stay the size
    // they were painted, which is what a side-on view of a flat floor actually
    // does — nothing recedes here, so a size ramp is not perspective. At 1 the
    // tail marks shrink to a third, which reads as the trail DISSIPATING
    // rather than as distance. Both are defensible; they say different things.
    const k = 1 - taper * 0.66 * p;
    const len = 7 * k, thick = k;
    const chevron = (grow) => {
      ctx.beginPath();
      ctx.moveTo(sx, gy - thick - grow);
      ctx.lineTo(sx + len + grow, gy - 3.5 * k - grow + rise);
      ctx.lineTo(sx + len + grow, gy - thick + grow + rise);
      ctx.lineTo(sx, gy + 1.5 * k + grow);
      ctx.closePath();
      ctx.fill();
    };
    // A dark pass under each chevron. Gold on the desert's tan floor is gold on
    // tan — the marks went soft in a real run on exactly the pack that has the
    // most boost pads in it. Invisible on the dark packs, same as the trick the
    // portal rings and the plug frame use.
    //
    // The outset SCALES with the chevron. Held at a fixed 0.9px it does not get
    // lost as the mark shrinks — the opposite happens, and that is the real
    // hazard with a taper: a constant dark rim around a shrinking gold shape
    // eventually has more area than the shape, so the tail of the trail turns
    // into dark smudges with a gold fleck inside. Scaling keeps the ratio, and
    // the floor stops it going sub-pixel at the very end.
    ctx.globalAlpha = q * 0.4 * fade;
    ctx.fillStyle = 'rgba(24,14,10,0.9)';
    chevron(Math.max(0.45, 0.9 * k));
    ctx.globalAlpha = q * 0.85 * fade;
    ctx.fillStyle = '#ffd447';
    chevron(0);
  }
  // Dust off the heels: rising, spreading, fading. Lifts from the ground it is
  // actually standing on, which on a downhill is well below the hero's feet.
  for (let i = 0; i < 4; i++) {
    const p = ((t * 1.9 + i * 0.27) % 1);
    const dx = -6 - p * 26;
    ctx.globalAlpha = q * 0.4 * (1 - p);
    ctx.fillStyle = '#fff6d0';
    ctx.beginPath();
    ctx.arc(x + dx, groundY + gd(dx) - 2 - p * 9, 1.4 + p * 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// The quiet half of the shipped treatment: two warm copies at a third of B's
// alpha and half its spacing, so it blurs rather than resolving into a second
// hero. Shared by both chevron variants so they differ in ONE thing.
function trailGhosts(ctx, { x, groundY, q, drawHeroAt }) {
  ctx.save();
  for (let i = 2; i >= 1; i--) {
    ctx.globalAlpha = q * 0.13 / i;
    ctx.fillStyle = '#ffd447';
    ctx.beginPath();
    ctx.ellipse(x - i * 4, groundY - 11, 8 - i, 10 - i, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (let i = 2; i >= 1; i--) drawHeroAt(x - i * 3.5, groundY, q * 0.16 / i);
}

export const BOOST_FX_VARIANTS = [
  {
    id: 'bars',
    name: 'WAS — bars',
    note: 'The control, and the thing being replaced. A gold rectangle thrown forward along the floor '
      + 'plus four pale rectangles beside the hero. No taper, no direction, no attachment to anything '
      + 'that is moving — which is why it reads as HUD that has escaped onto the field.',
    draw(ctx, { x, groundY, t, q, drawHero }) {
      ctx.save();
      ctx.fillStyle = '#f6d33c';
      ctx.globalAlpha = q * 0.7;
      ctx.fillRect(x - 4, groundY - 6, 26, 4);
      ctx.fillStyle = '#fff6d0';
      for (let i = 0; i < 4; i++) {
        const travel = ((t * (2.4 + i * 0.35) + i * 0.37) % 1);
        ctx.globalAlpha = q * 0.5 * (1 - travel);
        ctx.fillRect(x - 12 - travel * 34, groundY - 24 * (0.18 + i * 0.22), 6 + i * 3, 1);
      }
      ctx.restore();
      drawHero();
    },
  },
  {
    id: 'lines',
    name: 'A — speed lines',
    note: 'Tapered streaks at four depths, sharp end leading, sweeping past the hero and OVER them at '
      + 'the nearest depth. The oldest trick there is, and it works because the taper points: every mark '
      + 'agrees on a direction of travel. Depth is carried by length and opacity, so the near ones move '
      + 'visibly faster than the far ones.',
    draw(ctx, { x, groundY, t, q, drawHero }) {
      const lane = (i) => groundY - 4 - i * 5;
      ctx.save();
      for (let i = 0; i < 5; i++) {                     // behind the hero
        const p = (t * (3.2 + i * 0.7) + i * 0.31) % 1;
        ctx.globalAlpha = q * 0.55 * (1 - p) * (0.5 + i * 0.12);
        streak(ctx, x + 10 - p * 74, lane(i), 12 + i * 6, 1 + i * 0.35, '#fff6d0');
      }
      ctx.restore();
      drawHero();
      ctx.save();
      for (let i = 0; i < 2; i++) {                     // nearest depth, in front
        const p = (t * 5.5 + i * 0.5) % 1;
        ctx.globalAlpha = q * 0.5 * (1 - p);
        streak(ctx, x + 24 - p * 96, groundY - 8 - i * 11, 26, 2.4, '#ffffff');
      }
      ctx.restore();
    },
  },
  {
    id: 'ghosts',
    name: 'B — gold afterimages',
    note: 'Three copies of the hero trailing behind, warm-tinted and fading. The only candidate where '
      + 'the effect is attached to the CHARACTER rather than the world, so it survives a busy background '
      + 'that swallows loose marks. The risk is the one to judge: the dash already smears the hero, and '
      + 'if these read the same then two different things are saying one word.',
    draw(ctx, { x, groundY, q, drawHero, drawHeroAt }) {
      // A warm smear BEHIND the ghosts, built from soft ellipses that shrink
      // and fade with distance. The first pass used one translucent rectangle
      // and it read as a yellow pane of glass laid over the hero — the same
      // mistake as the bars, one size up.
      ctx.save();
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = q * 0.16 / i;
        ctx.fillStyle = '#ffd447';
        ctx.beginPath();
        ctx.ellipse(x - i * 7, groundY - 11, 9 - i * 1.2, 11 - i * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      for (let i = 3; i >= 1; i--) drawHeroAt(x - i * 6, groundY, q * 0.3 / i);
      drawHero();
    },
  },
  {
    id: 'ground',
    name: 'C — ground rush',
    note: 'The FLOOR moves instead of the hero: chevrons racing backwards under their feet, plus a dust '
      + 'plume kicked off the heels. Speed you feel through the soles. It is also the only candidate that '
      + 'cannot be confused with a hero ability, since nothing else in the game draws on the floor — and '
      + 'the only one that keeps working while the hero is airborne off the pad.',
    draw(ctx, o) {
      groundRush(ctx, o);
      o.drawHero();
    },
  },
  {
    id: 'tunnel',
    name: 'D — wind tunnel',
    note: 'A camera effect rather than a world one: streaks converge from the screen edges toward a '
      + 'vanishing point ahead of the hero, with the frame darkening at the corners. The strongest '
      + '"everything is rushing past" of the four and the only one that uses the whole screen — which is '
      + 'also the objection, since it competes with the HUD and with every other full-frame cue the game '
      + 'already has.',
    fullFrame: true,
    draw(ctx, { x, groundY, t, q, drawHero, w, h }) {
      drawHero();
      const vx = x + 60, vy = groundY - 30;   // vanishing point, ahead of the hero
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + 0.3;
        const p = ((t * 1.7 + i * 0.13) % 1);
        const near = 0.25 + p * 1.15;
        const far = near - 0.3;
        const rx = w * 0.62, ry = h * 0.62;
        ctx.globalAlpha = q * 0.4 * Math.sin(p * Math.PI);
        ctx.strokeStyle = '#fff6d0';
        ctx.lineWidth = 0.6 + p * 1.8;
        ctx.beginPath();
        ctx.moveTo(vx + Math.cos(a) * rx * far, vy + Math.sin(a) * ry * far);
        ctx.lineTo(vx + Math.cos(a) * rx * near, vy + Math.sin(a) * ry * near);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
];

BOOST_FX_VARIANTS.push({
  id: 'rush',
  name: 'C+B — ground rush + trail (uniform) · runner-up',
  note: 'PICKED: C carrying the message and B underlining it. The floor does the work — chevrons racing '
    + 'back under the feet and dust off the heels, every mark seated on the terrain and sheared to its '
    + 'gradient — and the hero gets a QUIETER version of B behind them than B shipped on its own: two '
    + 'copies instead of three, a third of the alpha, and half the spacing, so it is a warm blur rather '
    + 'than a legible second hero. That is the distinction from the dash. Not a big one, and it does not '
    + 'need to be: a dash and a boost are both "you got faster", so reading alike is correct — what would '
    + 'be wrong is a boost that reads as INVINCIBLE, which is the dash\'s other promise, and that comes '
    + 'from the hard-edged double the dash draws. Blur says fast; a second clear silhouette says ghost.',
  draw(ctx, o) {
    groundRush(ctx, o);
    trailGhosts(ctx, o);
    o.drawHero();
  },
});

// The same thing with the chevrons shrinking as they fall behind. This is the
// open question, and it is a question about MEANING rather than about
// correctness: a side-on view of a flat floor has no perspective in it, so a
// size ramp is not depth — it is decay. Uniform says the floor is painted with
// marks and the marks are moving. Tapering says the pad threw energy backwards
// and it is running out. Only one of those is true of a boost pad, which is
// the argument for tapering; the argument against is that shrinking marks read
// as receding, and nothing here recedes.
BOOST_FX_VARIANTS.push({
  id: 'rushTaper',
  name: 'C+B — tapering chevrons · SHIPS',
  note: 'PICKED. Each chevron shrinks to a third as it falls behind, so the trail thins out instead of '
    + 'ending at full size — uniform reads as FLOOR MARKINGS RUSHING PAST, this reads as ENERGY '
    + 'DISSIPATING, and the second is what a boost pad actually is. The dark backing pass scales with '
    + 'each mark rather than sitting at a fixed width: held constant it would eventually have more area '
    + 'than the gold shape it backs, turning the tail of the trail into dark smudges with a fleck in '
    + 'them. Old note follows. '
    + 'The shipped treatment with one change: each chevron shrinks to a third as it falls behind, so '
    + 'the trail thins out instead of ending at full size. Compare directly against the tile above — '
    + 'uniform reads as FLOOR MARKINGS RUSHING PAST, tapering reads as ENERGY DISSIPATING. Both are '
    + 'honest; they are not saying the same thing. Watch the tail end of the trail, not the near end, '
    + 'and watch it on the slope rows too — a shrinking mark on a hill has less contour to sit on.',
  draw(ctx, o) {
    groundRush(ctx, o, 1);
    trailGhosts(ctx, o);
    o.drawHero();
  },
});

export const BOOST_FX_BY_ID = Object.fromEntries(BOOST_FX_VARIANTS.map((v) => [v.id, v]));

// Which treatment ships. One edit swaps it; the losers stay drawable for the
// gallery section that decided it.
export const BOOST_FX = 'rushTaper';

export function drawBoostFx(ctx, opts) {
  const v = BOOST_FX_BY_ID[BOOST_FX];
  if (v) v.draw(ctx, opts);
  else opts.drawHero();
}
