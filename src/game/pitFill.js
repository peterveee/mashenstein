// What lies at the bottom of a hole in the floor.
//
// A `gap` obstacle carves the ground away and the style packs draw the hole by
// NOT drawing — so the sky, the hills and any road below all show straight
// through it (see drawGapsAwareGround). That is the right picture for a hole
// and it is not, on its own, a picture of a FATAL hole: a break with nothing in
// it is only distinguishable from the lane either side by the ground stopping,
// which is the least a pit can say for itself now that falling in ends the run.
//
// This is the other half. A cabinet names a fill (`pitFill` in data/cabinets.js)
// and every pit on it gets that material lying on the FLOOR of the break — not
// plugging it. The break stays open above the material, which is the whole
// finding of the bake-off (src/dev/pit-candidates.js): the top of a hole is for
// seeing through, and the bottom of it is for the thing that kills you.
//
// Painters draw into a local box: x from 0 to w, y from 0 at the groundline
// down to y = d at the bottom of the apron. They may not paint above y = 0 and
// they may not paint across the open part of the break.

// Where the material's surface sits, as a fraction of the apron.
//
// AND THE APRON IS TWICE AS DEEP AS IT LOOKS. `H - GROUND_Y` is 38 WORLD px, and
// the camera magnifies the world band by ZOOM — so 38 world px of apron is 76
// screen px against a frame with only 38 below the groundline. The bottom half
// of every pit in this game is off the bottom of the screen, and the camera only
// reaches it when the crane lifts for a jump.
//
// So "at the bottom" has to mean the bottom of what is VISIBLE, not the bottom
// of what is modelled. 0.32 puts the surface 12 world px down, leaving about
// seven of tar between it and the fold at 19 — a band you can see from the road,
// standing still, without jumping. At 0.72 (which is where this started, and
// where the bake-off sheet drew it) the material was 27 world px down: correct
// on a card that shows the whole shaft, and invisible in the game.
//
// Kept in step with PIT_SURFACE_Y in game/run.js, which is what a falling hero
// stops at. The number the death lands on and the number the art draws to have
// to be the same one, or he sinks into thin air.
export const PIT_FLOOR = 0.32;

// HOW HIGH THE TEETH REACH, as a fraction of the apron — measured from the
// groundline down, so a SMALLER number is a taller spike.
//
// Just under the lip, and deliberately not level with it. Tips flush with the
// road would be a line, and a line is what the broken edge of the ground
// already draws; a hand's breadth of shadow above them is what says these are
// standing IN a hole rather than lying on a floor. It is also the altitude a
// falling hero stops at (SPIKE_SURFACE_Y in game/run.js), which is the other
// reason it cannot drift: he lands on the tips the art draws, or on nothing.
export const SPIKE_TIPS = 0.13;
// The same measurement for the works: where the top of the wheels comes to.
//
// Deeper than the teeth, because a gear is a body rather than a point — its
// widest part is well below whatever the lip can see, and bringing the rim up
// to spike height would put half a wheel above the ground line with nothing to
// turn in. A fifth of the apron leaves the top third of the wheel visible from
// the road standing still, which is all it needs: what says GEAR is the turning,
// and the turning is at the rim.
export const GEAR_TOPS = 0.2;

const TAU = Math.PI * 2;

function ellipse(ctx, cx, cy, rx, ry, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.2, rx), Math.max(0.15, ry), 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// BOILING TAR — candidate C. Black, unlit, and the cheapest fill on the sheet:
// no gradient, no particles, four bubbles and a sheen.
//
// The sheen is not decoration. Tar is black and the bottom of a hole is dark,
// so without a highlight the material is indistinguishable from shadow and the
// pit is back to being empty. One pale ellipse is the entire difference between
// a liquid and a hole that happens to be darker at the bottom.
function tar(ctx, w, d, t) {
  const surf = d * PIT_FLOOR;
  ctx.fillStyle = '#141019';
  ctx.beginPath();
  ctx.moveTo(0, surf);
  ctx.quadraticCurveTo(w * 0.28, surf - d * 0.025, w * 0.52, surf);
  ctx.quadraticCurveTo(w * 0.78, surf + d * 0.02, w, surf - d * 0.012);
  ctx.lineTo(w, d); ctx.lineTo(0, d); ctx.closePath();
  ctx.fill();
  ellipse(ctx, w * 0.4, surf + d * 0.09, w * 0.26, d * 0.035, '#6b5c80', 0.32);
  ellipse(ctx, w * 0.76, surf + d * 0.15, w * 0.13, d * 0.025, '#8a7f99', 0.16);
  // Bubbles inflate above the surface, then pop into a ring. Phased off the
  // pit's own x so two holes on one screen are never in step — the give-away
  // that a hazard is a stamp rather than a place.
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.26) % 1;
    const x = w * (0.14 + i * 0.24);
    const rMax = d * (i % 2 === 0 ? 0.09 : 0.055);
    if (p < 0.74) {
      const r = rMax * (0.25 + p);
      ctx.fillStyle = '#1d1826';
      ctx.beginPath(); ctx.arc(x, surf - r * 0.5, Math.max(0.2, r), 0, TAU); ctx.fill();
      ctx.strokeStyle = '#08060c';
      ctx.lineWidth = Math.max(0.3, w * 0.008);
      ctx.stroke();
      ellipse(ctx, x - r * 0.32, surf - r * 0.9, r * 0.24, r * 0.24, '#7a6b8f');
    } else {
      const k = (p - 0.74) / 0.26;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#5b4d6e';
      ctx.lineWidth = Math.max(0.35, w * 0.01);
      ctx.beginPath();
      ctx.arc(x, surf - rMax * 0.35, Math.max(0.2, rMax * (0.45 + k * 0.45)), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Shared bits for the ported bake-off painters. `poly` is the sheet's `path`
// helper trimmed to what these three use; the glow and ember helpers keep the
// sheet's shapes but everything above the groundline is gone — drawPitFill
// clips at y = 0, so the sheet's SPILL device (light thrown onto the road)
// cannot survive the port and is dropped rather than half-drawn.
function poly(ctx, fill, stroke, width, fn) {
  ctx.beginPath();
  fn(ctx);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
}
function glowUp(ctx, w, surf, span, color, alpha) {
  const top = Math.max(0, surf - span);
  if (surf <= top) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, surf, 0, top);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, surf - top);
  ctx.restore();
}

// OPEN AIR — candidate A, and free. Nothing but grit falling off the broken
// edges: the minimum motion that says the hole is real and still coming apart.
// Cardboard's pick on purpose — a kingdom whose castle is four inches tall gets
// a hole that is honestly just a hole cut out of the set.
function voidFill(ctx, w, d, t) {
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.5 + i * 0.29) % 1;
    const x = w * (i % 2 ? 0.08 : 0.9) + Math.sin(i * 3) * w * 0.02;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - p * 0.7);
    ctx.fillStyle = '#2a2c36';
    ctx.fillRect(x, d * 0.05 + p * d * 0.9, Math.max(0.25, w * 0.012), Math.max(0.25, w * 0.022));
    ctx.restore();
  }
}

// MOLTEN CHANNEL — candidate B, ported for Speed's collapsing road. The one
// fill that throws light: the glow climbs the break toward the groundline, so
// the mouth reads hot even while the material sits below the fold. Two value
// steps instead of a gradient (a gradient collapses into one beige band at
// lane size), crust plates so it is a material and not a lamp. The sheet's
// road-spill and haze do not survive the y=0 clip and are dropped.
function lava(ctx, w, d, t) {
  const surf = d * PIT_FLOOR;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, surf - d * 0.06, w, d - surf + d * 0.06); ctx.clip();
  poly(ctx, '#f2621d', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 8; i++) p.lineTo(w * (i / 8), surf + Math.sin(t * 1.6 + i * 0.9) * d * 0.018);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  ctx.save(); ctx.globalAlpha = 0.8;
  for (let i = 0; i < 4; i++) {
    const k = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.6);
    ctx.fillStyle = k > 0.6 ? '#ffef9e' : '#ffb02e';
    ctx.beginPath();
    ctx.ellipse(w * (0.16 + i * 0.23), surf + d * (0.13 + 0.04 * k), w * 0.1, d * 0.055 * (0.6 + k), 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const x = ((t * 3.5 + i * w * 0.42) % (w * 1.3)) - w * 0.15;
    poly(ctx, '#40201a', '#6d2410', Math.max(0.12, w * 0.008), (p) => {
      p.moveTo(x, surf + d * 0.03); p.lineTo(x + w * 0.16, surf + d * 0.01);
      p.lineTo(x + w * 0.2, surf + d * 0.09); p.lineTo(x + w * 0.03, surf + d * 0.1); p.closePath();
    });
  }
  ctx.restore();
  glowUp(ctx, w, surf, d * 0.38, 'rgba(255,120,30,1)', 0.34);
  // Embers off the melt. They rise past the groundline and the clip eats them
  // there, which is fine — they have faded to nearly nothing by then anyway.
  for (let i = 0; i < 5; i++) {
    const p = (t * 0.4 + i / 5) % 1;
    const ex = w * (0.12 + ((i * 0.37) % 0.76)) + Math.sin(i * 2.1 + p * 4.6) * w * 0.05;
    const er = w * 0.016 * (1 - p * 0.5);
    ellipse(ctx, ex, d * 0.4 - p * d * 0.8, er, er, '#ffca55', Math.max(0, 1 - p) * 0.85);
  }
}

// BLACK SLUSH — candidate H, Frost's. Black water, pale floes with dark
// undersides at the waterline, and cold vapour that DRIFTS rather than rises —
// the frost cabinet's whole idiom is slow, and a fast plume would read as
// steam and therefore hot.
function slush(ctx, w, d, t) {
  const surf = d * PIT_FLOOR;
  poly(ctx, '#0d2334', null, 0, (p) => {
    p.moveTo(0, surf);
    for (let i = 0; i <= 6; i++) p.lineTo(w * (i / 6), surf + Math.sin(t * 1.1 + i * 1.2) * d * 0.01);
    p.lineTo(w, d); p.lineTo(0, d); p.closePath();
  });
  ellipse(ctx, w * 0.46, surf + d * 0.09, w * 0.28, d * 0.03, '#79b6d8', 0.22);
  for (let i = 0; i < 3; i++) {
    const x = ((t * 1.6 + i * w * 0.4) % (w * 1.2)) - w * 0.12;
    poly(ctx, '#2b5b74', null, 0, (p) => {
      p.moveTo(x, surf + d * 0.02); p.lineTo(x + w * 0.17, surf + d * 0.005);
      p.lineTo(x + w * 0.15, surf + d * 0.07); p.lineTo(x + w * 0.02, surf + d * 0.075); p.closePath();
    });
    poly(ctx, '#cfe9f5', '#7ba8c0', Math.max(0.1, w * 0.007), (p) => {
      p.moveTo(x, surf + d * 0.02); p.lineTo(x + w * 0.16, surf - d * 0.005);
      p.lineTo(x + w * 0.17, surf + d * 0.005); p.lineTo(x + w * 0.005, surf + d * 0.03); p.closePath();
    });
  }
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.22 + i * 0.34) % 1;
    const vr = w * (0.05 + 0.1 * p);
    ellipse(ctx, w * (0.25 + i * 0.26) + p * w * 0.1, Math.max(0, surf - p * d * 0.3),
      vr, vr, '#cfe9f5', 0.2 * (1 - p));
  }
}

// IRON TEETH — the crossing's material, and the only fill in the set that is
// not a liquid.
//
// The other three are things you sink into, which is why they are painted as a
// surface with weather on it. A spike bed has no surface: it is a row of
// objects, and everything it has to say it says with silhouette — which is
// lucky, because it says it at lane size, from the road, standing still, with
// no glow and no animation to lean on. A player who has never seen this hole
// before has to know from one glance that it is not a hole to land in.
//
// Fixed PITCH rather than a fixed count. A crossing is several hundred pixels
// wide and an ordinary pit is sixty, and teeth that divided the width would be
// railings on one and a comb on the other. Nine pixels puts a tooth roughly
// every hero-width, so the bed reads the same in both.
function spikes(ctx, w, d, t, lift = 0) {
  // The plate they come out of, and NOTHING ELSE behind them.
  //
  // This had a dark shaft, and then a softer wash of one, and both were the
  // same mistake: a hole in this game is SEEN THROUGH — the sky, the hills and
  // the parallax all read straight down it, which is what says the ground has
  // been removed rather than painted over. Anything laid across the break to
  // make the teeth read is paid for with the scenery behind them, and the
  // scenery is the picture. So the fill is the teeth and the plate under them,
  // and the depth comes from the ROAD standing up either side (see
  // CROSSING_ROAD_RISE in game/run.js).
  const plate = d * 0.5;
  basePlate(ctx, w, d, plate, lift);
  // THE SAME TOOTH THE LANE USES. `popSpikes` in sprites/props.js is the spike
  // hazard a player already knows — narrow, inked, alternating pale and grey —
  // and a pit full of some other spike would be a second vocabulary for one
  // idea. Copied in proportion rather than shared as code: that painter draws
  // into a prop's box with a plate and a chevron stripe, and this draws into a
  // hole, but the tooth itself is its tooth.
  const pitch = 9;
  const n = Math.max(2, Math.round(w / pitch));
  const step = w / n;
  const half = Math.max(0.5, step * 0.2);
  for (let i = 0; i < n; i++) {
    const cx = step * (i + 0.5);
    // THE ROW BREATHES, and as a wave rather than in unison — the same argument
    // popSpikes makes: always out, always lethal, still moving. A hazard that
    // is perfectly still on a scrolling screen falls out of the eye, and one
    // that retracts far enough to be safe is a timing puzzle nobody was told
    // about, so the travel is a fifth and it never reaches the plate. One sine
    // across the whole row would be a bed inflating; a fifth of a cycle between
    // neighbours is a ripple running along it.
    const pump = 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.62));
    const full = plate - (i % 2 === 0 ? d * SPIKE_TIPS : d * SPIKE_TIPS + d * 0.11);
    // The ink is scaled to the TOOTH, not to the hole. Off the hole's width it
    // was two world pixels of outline round a three-pixel triangle — the row
    // went solid black and the teeth stopped having a shape at all.
    hzTooth(ctx, cx, plate, half, full * pump,
      i % 2 ? '#e4eaf1' : '#b9c4d0', Math.max(0.1, half * 0.16));
  }
  glint(ctx, w, d, t, d * SPIKE_TIPS);
}

// One tooth of the lane's own spike plate: a narrow triangle with an ink line
// round it. The ink is what makes it read at four pixels against sky.
function hzTooth(ctx, cx, base, half, height, fill, lw) {
  ctx.beginPath();
  ctx.moveTo(cx - half, base);
  ctx.lineTo(cx, base - height);
  ctx.lineTo(cx + half, base);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#232a34';
  ctx.lineWidth = lw;
  ctx.stroke();
}

// THE PLATE the teeth stand on, and the whole of what a hard fill paints
// besides the hazard itself.
//
// It is a floor rather than a fill: three pixels of dark at the foot of the
// teeth and solid below that, where the frame has already run out. Everything
// above it is the break, and the break is transparent — see the note in
// spikes(). `lift` is how far the road stands above the flat groundline over
// this hole (game/terrain.js), and it is the only reason a painter may paint
// above y = 0; drawPitFill's clip is what bounds it.
function basePlate(ctx, w, d, y, lift = 0) {
  ctx.fillStyle = '#232a34';
  ctx.fillRect(0, y, w, Math.max(2, d * 0.06));
  ctx.fillStyle = '#171522';
  ctx.fillRect(0, y + Math.max(2, d * 0.06), w, d - y);
}

// ONE glint, travelling. A machine of teeth is otherwise still, and stillness on
// a scrolling screen falls out of the eye — but steel does not bubble or
// flicker, so what moves is the LIGHT on it: once across the row, slowly, the
// way a highlight crosses a knife.
function glint(ctx, w, d, t, y) {
  const p = (t * 0.22) % 1.6;
  const gx = -w * 0.1 + p * w * 0.75;
  if (gx <= -w * 0.05 || gx >= w * 1.05) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5;
  ellipse(ctx, gx, y + d * 0.04, Math.max(0.5, w * 0.012), d * 0.06, '#ffffff');
  ctx.restore();
}

// THE WORKS — cogs turning in the floor, and the plumber cabinet's answer to a
// bed of teeth.
//
// Same job as the spikes and a different sentence: teeth are a trap somebody
// SET, and a gear train is machinery that was here first and does not know you
// are standing over it. That is the joke the arcade is built on, so the fill a
// stage names is a tone choice as much as a hazard one.
//
// Drawn as a train rather than as scattered wheels: neighbouring cogs turn
// OPPOSITE ways and their pitch circles touch, which is the one thing that
// makes a row of toothed circles read as connected rather than as decoration.
// The top of the tooth circle is the surface a falling hero comes to rest on
// (GEAR_TOPS), so what he lands on is what the eye was measuring.
function gears(ctx, w, d, t, lift = 0) {
  const top = d * GEAR_TOPS;
  // A TRAIN, not a row: big wheel, small wheel, big wheel, with their pitch
  // circles touching and every neighbour turning the other way. Alternating the
  // size is what stops nine identical circles reading as a texture — a machine
  // is made of parts that are not each other — and it is also the cheapest way
  // to show engagement, since the eye reads the small one as being DRIVEN.
  //
  // Sized off the hero rather than off the break: twenty-six pixels of pitch is
  // about three hero-widths, so an ordinary sixty-pixel pit gets two wheels and
  // a crossing gets a line of them, at the same scale in both.
  const pitch = 26;
  const n = Math.max(2, Math.round(w / pitch));
  const step = w / n;
  const big = Math.min(step * 0.52, d * 0.26);
  for (let i = 0; i < n; i++) {
    const small = i % 2 === 1;
    const r = small ? big * 0.66 : big;
    const cx = step * (i + 0.5);
    // Every wheel's TOP sits on the same line — the line a falling hero comes
    // to rest on — so the small ones ride higher on their axles rather than
    // being sunk to a common centre. A gear train's job here is to be a floor
    // you cannot stand on, and a floor has one height.
    const cy = top + r;
    const dir = small ? -1 : 1;
    const a0 = t * (small ? 2.3 : 1.5) * dir + i * 0.5;
    const teeth = small ? 8 : 11;
    ctx.fillStyle = '#3f454e';
    ctx.beginPath();
    for (let k = 0; k < teeth; k++) {
      const a = a0 + (k / teeth) * TAU;
      const wide = (TAU / teeth) * 0.26;
      ctx.lineTo(cx + Math.cos(a - wide) * r, cy + Math.sin(a - wide) * r);
      ctx.lineTo(cx + Math.cos(a - wide * 0.55) * r * 1.15, cy + Math.sin(a - wide * 0.55) * r * 1.15);
      ctx.lineTo(cx + Math.cos(a + wide * 0.55) * r * 1.15, cy + Math.sin(a + wide * 0.55) * r * 1.15);
      ctx.lineTo(cx + Math.cos(a + wide) * r, cy + Math.sin(a + wide) * r);
    }
    ctx.closePath();
    ctx.fill();
    // Iron, lit from above: the body a step up from the teeth, a crescent of
    // highlight across the top of it, and a dark bore at the centre. Three
    // values and no gradient — at this size a gradient is one flat grey.
    ellipse(ctx, cx, cy, r * 0.88, r * 0.88, '#6e7681');
    ellipse(ctx, cx, cy - r * 0.16, r * 0.66, r * 0.62, '#8b949f');
    ellipse(ctx, cx, cy, r * 0.3, r * 0.3, '#2b3038');
    // ONE spoke, and it is what makes the wheel visibly turn: a bare disc is
    // the same picture every frame however fast it is spinning. Brass, because
    // this is a plumber's gearbox and the one warm thing in the hole should be
    // the moving part.
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = Math.max(0.35, r * 0.15);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * r * 0.22, cy + Math.sin(a0) * r * 0.22);
    ctx.lineTo(cx + Math.cos(a0) * r * 0.8, cy + Math.sin(a0) * r * 0.8);
    ctx.stroke();
  }
  glint(ctx, w, d, t, top);
}

const FILLS = { tar, void: voidFill, lava, slush, spikes, gears };

/**
 * WHAT A FALLING HERO MEETS, per material — and whether it takes him.
 *
 * A liquid has a surface he goes UNDER, which is what PIT_FLOOR describes and
 * what every fill here used to be. The two hard fills stop him on top of
 * themselves instead, and where they stop him is the height their art actually
 * reaches: the tips of the teeth, the top of the wheels. One number each, read
 * by game/run.js for the death and by the painters for the drawing, or he is
 * impaled on air.
 *
 * `hard` is the rest of the beat: no plunge, no sink, and the harder cue.
 */
export const FILL_SURFACE = {
  spikes: { at: SPIKE_TIPS, hard: true },
  gears: { at: GEAR_TOPS, hard: true },
};
export function fillSurface(id) { return FILL_SURFACE[id] || { at: PIT_FLOOR, hard: false }; }

/**
 * Paint one pit's material. `x`/`y0` are the screen position of the break's
 * top-left — its left lip on the groundline — and `d` is the apron depth below
 * that. `phase` shifts the animation so neighbouring pits are out of step.
 *
 * Clipped to the break, so a fill can never bleed onto the road either side:
 * the ground has already been drawn by the time this runs, and a material that
 * painted over it would be reporting a hole wider than the one you fall into.
 */
export function drawPitFill(ctx, id, x, y0, w, d, t = 0, phase = 0, lift = 0) {
  const paint = FILLS[id];
  if (!paint || w <= 0 || d <= 0) return;
  ctx.save();
  ctx.beginPath();
  // `lift` opens the clip UPWARD by however far the ground rises above the flat
  // line over this break — see shaft(). Zero everywhere the lane is flat, which
  // is most cabinets, and the only reason a painter may put anything above y=0.
  ctx.rect(x, y0 - lift, w, d + lift);
  ctx.clip();
  ctx.translate(x, y0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  paint(ctx, w, d, t + phase, lift);
  ctx.restore();
}

export function hasPitFill(id) { return !!FILLS[id]; }
