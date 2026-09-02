// Style packs: renderer-only modules. One draw interface, zero game logic.
// Every pack draws: bg(ctx,t,camX,cab,totalDist,scene),
// ground(ctx,camX,cab,obstacles), post(ctx,t). `scene` is optional renderer
// context: most packs ignore it, while LCD reads the rhythm stage and heard
// beat without importing game or audio state into this renderer-only module.
// Hitboxes/timings are style-independent; reduced motion/flashing tame effects.
//
// `lightBg: true` opts a pack out of the GPU scene bloom. The bloom bright-pass
// (glfx.js FS_BRIGHT) keeps anything above ~0.8 luma, and the final composite
// adds it back at 0.45 — so a pale sky or paper background qualifies almost
// everywhere, gets ~1.4x its own value, and clips to flat white, erasing the
// linework and parallax layers drawn on it. Bloom cannot be threshold-tuned out
// of this: a coin (#f6d33c) sits at 0.80 luma, BELOW a pastel sky at 0.92, so no
// cutoff separates "bright detail" from "bright background". Light packs opt out
// wholesale instead; their art carries its own drawn highlights.
import { W, H, bakeSS } from '../renderer.js';
import { GROUND_Y, ZOOM, PAN_MAX } from '../camera.js';
import { glowSprite } from '../../sprites/props.js';
// The 5x7 pixel font's raw rows. The LCD panel lays its own cells, so it takes
// the letterforms and not the blitter — see lcdSkyBanner.
import { pixelGlyph } from '../sprites.js';
// What lies at the bottom of a hole, when the cabinet names one. A pack draws a
// gap by not drawing; the fill is the other half of that bargain.
import { drawPitFill } from '../../game/pitFill.js';
import { terrainGroundY } from '../../game/terrain.js';

// Every layer back here scrolls a FRACTION of the foreground, and the camera now
// magnifies that foreground — so each parallax factor is scaled by the same
// amount to keep the depth ratio the run was tuned with. Without it the world
// races past a backdrop that has effectively frozen. Layer sizes are untouched:
// the groundline these layers hang off does not move at any zoom.
const PLX = ZOOM;

// Camera-derived positions in here are deliberately NOT rounded to whole
// pixels. Rounding looks harmless per frame and is a stutter in motion: the
// world scrolls a fractional number of pixels per tick (2.54 at a typical
// speed), so a snapped element steps 3, then 2, then 3 while everything drawn
// through drawWorldEntity glides. The ground draws inside the world transform
// at ZOOM 2, so one world pixel of snap is two canvas pixels — about twenty
// device pixels on a 5K panel — and it lands on the repeating ground pattern,
// which is the worst possible carrier for it. A row of identical marks all
// jumping together is read as flicker rather than as motion.
//
// Two places still round on purpose and must stay that way: the LCD pack
// quantizes to its segment pitch because a segment display cannot scroll
// smoothly, and the half-pixel strokeRect offsets exist to keep a 1px line
// crisp rather than to position anything.
// The solid stretches of road on screen, in SCREEN x, with every gap taken out
// of them. Two packs need this and they draw their ground nothing like each
// other — one lays a flat apron, one lays a five-row checkered perspective road
// — so what they share is the arithmetic of where the road ISN'T.

function solidRuns(camX, obstacles) {
  const cuts = [];
  for (const ob of obstacles || []) {
    if (ob.live && ob.def && ob.def.isGap) cuts.push([ob.x - camX, ob.x - camX + ob.w]);
  }
  cuts.sort((a, b) => a[0] - b[0]);
  const runs = [];
  let open = 0;
  for (const [a, b] of cuts) {
    if (a > open) runs.push([open, Math.min(a, W)]);
    open = Math.max(open, b);
  }
  if (open < W) runs.push([open, W]);
  return runs.filter(([a, b]) => b > a);
}

function drawGapsAwareGround(ctx, camX, cab, obstacles, colTop, colBody, overhangs = [], t = 0) {
  // A gap is drawn by NOT drawing, rather than by painting a black rectangle
  // over ground that has already been laid.
  //
  // The old way put `#08060c` down every hole in the game, which is a colour
  // that belongs to nothing else on screen — and once a lower route existed it
  // was actively wrong, because looking down a hole should show you what is
  // under it: the sky, the hills, and the ground of the area below. A hole you
  // can see through is the whole difference between a level with two heights in
  // it and a level with a black rectangle in it.
  const runs = solidRuns(camX, obstacles);
  // `overhangs` are WORLD-x spans with a second area running under them. The
  // apron below the line is 38px of body colour painted clean across the frame
  // with no idea of that, so over a chamber it is left hanging in mid-air with
  // a flat bottom edge — the one shape in the picture that cannot be ground.
  // The lane's lit surface still gets drawn there: you run along it. What stops
  // is the fill UNDER it, which belongs to the tunnel's roof slab instead.
  const cut = (overhangs || []).map((sp) => [sp.x - camX, sp.x + sp.w - camX]);
  for (const [a, b] of runs) {
    if (b <= a) continue;
    let body = [[a, b]];
    for (const [ca, cb] of cut) {
      const next = [];
      for (const [p, q] of body) {
        if (ca > p) next.push([p, Math.min(q, ca)]);
        if (cb < q) next.push([Math.max(p, cb), q]);
      }
      body = next.filter(([p, q]) => q > p);
    }
    // The cap goes with the body. It is drawn at the FLAT groundline while the
    // terrain rolls above it, so over a chamber — where the body it belongs to
    // has been cut away — it is left as a green bar hanging in the air under
    // the island. What the lane's surface is up there is the island's own cap.
    ctx.fillStyle = colTop;
    for (const [p, q] of body) {
      ctx.fillStyle = colBody;
      ctx.fillRect(p, GROUND_Y, q - p, H - GROUND_Y);
      ctx.fillStyle = colTop;
      ctx.fillRect(p, GROUND_Y, q - p, 3);
    }
  }
  // ...and what is in the holes. After the ground, because the fill is clipped
  // to its own break and would otherwise be painted over by the apron either
  // side of it. Nothing is drawn if the cabinet names no material: an open
  // break is a legitimate answer and it is what eight of the nine still use.
  drawPitFills(ctx, camX, cab, obstacles, t);
}

// One material per cabinet, in every hole on it. Split out so the packs that
// draw their ground some other way — the checkered road, the neon grid — can
// call it without also inheriting drawGapsAwareGround's idea of what a road is.
export function drawPitFills(ctx, camX, cab, obstacles, t = 0, ownOnly = false, liftOf = null) {
  if (!cab) return;
  // TAR EVERYWHERE, until a cabinet says otherwise. An empty break is a
  // legitimate picture and it is the wrong DEFAULT: a pit is fatal now, and the
  // one thing every hole has to do is look like it will kill you. `pitFill` is
  // the per-cabinet override the bake-off exists to fill in — 'none' opts a
  // cabinet back out to open air.
  const cabId = cab.pitFill || 'tar';
  for (const ob of obstacles || []) {
    if (!ob.live || !ob.def || !ob.def.isGap || ob.tunnel) continue;
    // A HOLE MAY NAME ITS OWN MATERIAL, and one does: a stepping-stone crossing
    // is spiked whatever the cabinet is filled with, because the fill is the
    // only thing that says the sequence is fatal before the first hop. Read off
    // the obstacle first and the cabinet second — the cabinet is the default,
    // not the authority.
    // TWO PASSES, and every hole is painted by exactly one of them. A hole that
    // names its own material is drawn by the run itself (see RunState.draw), so
    // that a crossing's spikes do not depend on which of the nine packs happens
    // to call this function — three of them draw their ground themselves and
    // never do. Everything else is the cabinet's, and is drawn from here.
    if (!!ob.fill !== ownOnly) continue;
    const id = ob.fill || cabId;
    if (id === 'none') continue;
    const x = ob.x - camX;
    if (x + ob.w < -4 || x > W + 4) continue;
    // Phased off world x so two pits on one screen never bubble in step.
    // How far the ground stands above the flat line over this break, so a fill
    // that draws a floor can reach up behind a raised lip instead of leaving a
    // seam of sky under it. Only the run knows (the rise is its own), so it is
    // handed in rather than looked up.
    drawPitFill(ctx, id, x, GROUND_Y, ob.w, H - GROUND_Y, t, ob.x * 0.013,
      liftOf ? liftOf(ob) : 0);
  }
}

// Hills render ONCE into a seamlessly-tiling strip (|sin| has period pi*wl),
// then scroll as GPU texture blits instead of re-tracing a 60-segment path
// on the CPU every frame.
const hillCache = new Map();
// Tiles are baked at the render density, so a density change (rotation, a
// window resize, an adaptive step) invalidates every one of them. Tracking the
// factor the cache was built at is cheaper than baking it into each key, and it
// drops the stale canvases instead of leaving both generations resident.
let hillCacheSS = 0;
// `opts.peak` swaps the rounded |sin| ridge for a triangular one with a lower
// shoulder — hills become mountains. `opts.rock` and `opts.snow` then band them:
// each fills everything above its own altitude line, clipped to the ridge
// silhouette, so only crests rising through a line pick up that color (the
// shoulders reach rock but not snow). Both lines wobble at integer multiples of
// the tile period, so they meet themselves at the seam.
//
// OVER (below) is why there is no seam line: a path edge landing exactly on
// x=0/x=period antialiases into a half-covered column, and two abutting tiles
// put two of those together — a translucent gap showing sky. Overdrawing past
// both edges (the fill clips to the canvas) keeps the edge columns fully
// opaque. Rounded hills never showed it because ridge(0) sits at ground level,
// hidden behind the near layer; a triangular shoulder crest lands at the tile
// edge and lifts that seam into open sky.
// Blits at a fractional x antialias their own dest-rect edge against the sky,
// and two abutting tiles composite that boundary pixel twice at partial alpha
// (0.5 over sky, then 0.5 over that = 0.75) — a fine translucent seam that
// appears only at some scroll offsets. So the tile carries MARGIN px of its
// neighbours' content on each side and blits MARGIN wider on both sides: the
// ridge is periodic, so the overlap agrees exactly and covers the boundary
// with opaque pixels instead of blending toward it. OVER (the path overdraw)
// must stay clear of the margin so those columns are solid too.
const MARGIN = 2;
const OVER = MARGIN + 4;
const TREE_MAX = 18; // tallest crown, reserved as tile headroom
// Slower than the far hill layer's 0.15: the volcano sits behind that range,
// so it must drift more slowly than the crests occluding it.
const VOLCANO_PLX = 0.09 * PLX;
// How far a hill's body is baked BELOW the bottom of the frame.
//
// A hill tile used to stop at `H`, which is right for as long as the background
// only ever moves down. Going below the lane moves the whole background UP, and
// then everything under the ridge simply ran out — leaving a straight-edged
// strip of nothing where the hills should have carried on. Patching that strip
// with a flat fill at the caller only moved the problem: a solid colour butted
// against a shaded tile is a seam in a different place. The body is a fill, so
// baking more of it costs one taller canvas per hill layer and nothing per
// frame.
const HILL_UNDERFILL = 220;

// The ridge line itself, factored out of the tile bake so that anything which
// has to STAND on a crest reads the same curve the tile was cut from.
//
// This existed twice for one afternoon — once here and once in the caller that
// puts cacti on the desert ridge — and the copy was wrong in a way that only
// showed up after a few thousand pixels of scroll. `period` is ROUNDED to a
// whole pixel (163 where pi*wl is 163.363), so a caller that reconstructs the
// phase from raw camX drifts against the baked tile by a third of a pixel per
// period and the cacti slowly lift off the hills. Sampling the same function
// through the same modulo is the only version of this that cannot drift.
function ridgeProfile(px, yBase, amp, wl, period, peak, mesa, dunes) {
  if (!peak && !mesa && !dunes) return yBase - Math.abs(Math.sin(px / wl)) * amp;
  const u = (((px % period) + period) % period) / period; // px may go negative
  if (dunes) {
    // A plain |sin| ridge makes every hill exactly the same height, and a row
    // of identical humps reads as a pattern rather than as country. Dunes are
    // three humps of stated width and height inside one period — varied, and
    // still seamless because the variation IS the period.
    // Read from DESERT_DUNES so the cacti can be planted on the peaks by name
    // rather than by guessing at an x — see the note there.
    let top = 0;
    for (const d of DESERT_DUNES) {
      const dist = Math.abs(((u - d.at + 1.5) % 1) - 0.5);   // wrapped distance
      const half = d.w / 2;
      if (dist >= half) continue;
      top = Math.max(top, d.h * (0.5 + 0.5 * Math.cos((dist / half) * Math.PI)));
    }
    return yBase - top * amp;
  }
  const main = 1 - Math.abs(u * 2 - 1);               // /\ centered in the tile
  const v = (u * 2 + 0.5) % 1;
  const side = (1 - Math.abs(v * 2 - 1)) * 0.55;      // smaller shoulder peaks
  if (!mesa) return yBase - Math.max(main, side) * amp;
  // A MESA is a trapezoid: steep sides, a dead-flat cap, and FLAT GROUND
  // between one and the next. A rounded sine ridge could be any landscape on
  // earth; a cut-off cap can only be desert.
  //
  // The first cut got this by clamping a triangle — min(1, main * 2.2) — and
  // it was wrong in a way that only showed once the near ridge and the haze
  // were drawn under it. Clamping ties the cap width to the slope angle: the
  // multiplier that made the sides steep also made the flat top 55% of the
  // period, so at the far layer's 110 wavelength the ridge became one
  // continuous plateau running the width of the screen — a wall, not a
  // country. Stating the two independently is the whole fix.
  const shelf = (centre, width, slope, height) => {
    const d = Math.abs(((u - centre + 1.5) % 1) - 0.5);   // wrapped distance
    const half = width / 2;
    if (d <= half) return height;
    if (d >= half + slope) return 0;
    return height * (1 - (d - half) / slope);
  };
  // A big one and a smaller sibling at a distance that is not half a period,
  // so the tile reads as country rather than as an obvious repeat.
  return yBase - Math.max(
    shelf(0.5, 0.24, 0.085, 1),
    shelf(0.08, 0.13, 0.06, 0.56),
  ) * amp;
}

// Screen y of a hill layer's crest at screen x, for the same (amp, wl, factor)
// that layer was drawn with. This is how you plant something on a ridge: the
// offset is reconstructed exactly as the blit loop below computes it, so the
// answer is the pixel the tile actually put there.
export function ridgeYAt(screenX, camX, yBase, amp, wl, factor, opts) {
  const period = Math.max(16, Math.round(Math.PI * wl));
  const off = ((camX * factor * PLX) % period + period) % period;
  const px = ((screenX + off) % period + period) % period;
  return ridgeProfile(px, yBase, amp, wl, period,
    !!(opts && opts.peak), !!(opts && opts.mesa), !!(opts && opts.dunes));
}

function parallaxHills(ctx, camX, color, yBase, amp, wl, factor, opts) {
  const period = Math.max(16, Math.round(Math.PI * wl));
  const top = yBase - amp;
  const peak = !!(opts && opts.peak);
  const mesa = !!(opts && opts.mesa);
  const dunes = !!(opts && opts.dunes);
  const snow = (opts && opts.snow) || null;
  const rock = (opts && opts.rock) || null;
  const trees = (opts && opts.trees) || null;
  // A tree standing on a crest has its base at `top`, so its crown would reach
  // above the tile and get sliced flat by the canvas edge. Give the tile that
  // much headroom and blit from there.
  const tileTop = top - (trees ? TREE_MAX : 0);
  const key = `${color}|${yBase}|${amp}|${wl}|${peak ? 1 : 0}|${mesa ? 1 : 0}|${dunes ? 1 : 0}|${rock || ''}|${snow || ''}|`
    + (trees ? trees.leaf + trees.trunk : '');
  const SS = bakeSS();
  if (SS !== hillCacheSS) { hillCache.clear(); hillCacheSS = SS; }
  let tile = hillCache.get(key);
  if (!tile) {
    tile = document.createElement('canvas');
    tile.width = (period + MARGIN * 2) * SS;
    tile.height = Math.max(1, (H - tileTop + HILL_UNDERFILL) * SS);
    const x = tile.getContext('2d');
    x.scale(SS, SS);
    x.translate(MARGIN, -tileTop); // tile-local 0 is ridge x 0; the margin sits left of it
    const ridge = (px) => ridgeProfile(px, yBase, amp, wl, period, peak, mesa, dunes);
    const ridgePath = () => {
      x.beginPath();
      x.moveTo(-OVER, H + HILL_UNDERFILL);
      for (let px = -OVER; px <= period + OVER; px += 2) x.lineTo(px, ridge(px));
      x.lineTo(period + OVER, H + HILL_UNDERFILL);
      x.closePath();
    };
    ridgePath();
    x.fillStyle = color;
    x.fill();
    // Altitude bands, low to high. Each re-traces the ridge to clip against:
    // restore() rolls back the clip but NOT the current path, so a second band
    // would otherwise clip itself to the first band's polygon.
    const band = (col, frac, h1, a1, h2, a2) => {
      const lineY = yBase - amp * frac;
      x.save();
      ridgePath();
      x.clip();
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(-OVER, top);
      x.lineTo(period + OVER, top);
      for (let px = period + OVER; px >= -OVER; px -= 2) {
        const a = (px / period) * Math.PI * 2;
        x.lineTo(px, lineY + Math.sin(a * h1) * a1 + Math.sin(a * h2) * a2);
      }
      x.closePath();
      x.fill();
      x.restore();
    };
    if (rock) band(rock, 0.46, 2, 3.5, 5, 2);
    if (snow) band(snow, 0.62, 3, 2.5, 5, 1.5);
    // Trunk-and-crown trees along the ridge, baked in so they cost nothing per
    // frame. Each is drawn at tx-period and tx+period too: the ridge is
    // periodic, so one straddling the tile edge shows its other half on the
    // neighbouring copy. The crown is three overlapping circles rather than one
    // — a lone circle reads as a lollipop at this size.
    if (trees) {
      const n = Math.max(2, Math.round(period / 38));
      for (let i = 0; i < n; i++) {
        const j = Math.sin(i * 12.9898) * 43758.5453;
        const f = j - Math.floor(j);                    // stable 0..1 per index
        const k = Math.sin(i * 78.233 + 1.7) * 24634.6345;
        const g = k - Math.floor(k);                    // second stream: type + jitter
        const tx = ((i + 0.2 + g * 0.6) / n) * period;
        const th = 9 + f * 5;
        const by = ridge(tx) + 1;                       // bite into the hill
        for (const dx of [-period, 0, period]) {
          const cx = tx + dx;
          x.fillStyle = trees.trunk;
          x.fillRect(cx - th * 0.07, by - th * 0.55, th * 0.14, th * 0.55);
          x.fillStyle = trees.leaf;
          if (g < 0.45) {
            // pine: two stacked tiers, narrowing to a point
            const w = th * 0.34;
            x.beginPath();
            x.moveTo(cx, by - th);
            x.lineTo(cx + w * 0.72, by - th * 0.52);
            x.lineTo(cx - w * 0.72, by - th * 0.52);
            x.closePath();
            x.fill();
            x.beginPath();
            x.moveTo(cx, by - th * 0.78);
            x.lineTo(cx + w, by - th * 0.22);
            x.lineTo(cx - w, by - th * 0.22);
            x.closePath();
            x.fill();
          } else {
            // broadleaf: three overlapping circles — one alone reads as a lollipop
            const r = th * 0.30;
            x.beginPath();
            x.arc(cx, by - th * 0.72, r, 0, Math.PI * 2);
            x.arc(cx - r * 0.85, by - th * 0.52, r * 0.78, 0, Math.PI * 2);
            x.arc(cx + r * 0.85, by - th * 0.52, r * 0.78, 0, Math.PI * 2);
            x.fill();
          }
        }
      }
    }
    hillCache.set(key, tile);
  }
  const off = ((camX * factor * PLX) % period + period) % period;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  for (let x0 = -off; x0 < W; x0 += period) {
    ctx.drawImage(tile, x0 - MARGIN, tileTop,
      period + MARGIN * 2, H - tileTop + HILL_UNDERFILL);
  }
  ctx.imageSmoothingEnabled = prev;
}

// A single volcano, pinned to one spot in the level rather than tiled: it lives
// in the background parallax, so its screen x is chosen to put it at centre
// exactly when the camera reaches `atCam`.
//
// It sits BEHIND the far hill range — drawn before that layer, so the range's
// crests cut across its flanks and only the summit clears the ridgeline. That
// occlusion is the depth cue doing the work; scale alone cannot sell distance
// against flat silhouettes. Two things follow from being back there:
//
//   - Its height is set against its occluder, not chosen freely: the far crests
//     reach ~96px, so the cone must clear that to exist at all, but only by
//     enough to show its molten cap. Overshoot it and the volcano towers over
//     the range instead of standing behind it, which reads as foreground again.
//   - It parallaxes SLOWER than the far layer, so it drifts behind the range
//     as the camera moves rather than travelling locked to it.
//
// It is drawn in the same flat-cartoon language as the props (sprites/props.js):
// flat fills, one dark outline, no gradients — a mauve-slate cone with a lit
// face and a shadow face, a molten cap that has overflowed the crater and
// congealed in drips down the upper slopes, flows running the rest of the way,
// and billowing smoke off the summit.
//
// Distance here is carried ENTIRELY by occlusion, scale and parallax — not by
// haze. An earlier pass also desaturated the palette and thinned the outline,
// which is the usual way to push something back, but it made the volcano read
// as atmosphere rather than as art: the whole point is that it is a drawn
// cartoon object in the reference's style, and bold linework is what says so.
// So the ink and fills stay at reference weight even back here.
//
// Palette note: the lava yellow tops out around 0.75 luma, under the glfx.js
// bloom bright-pass cutoff (~0.8). Pushing it to a true cartoon #ffd400 (0.84)
// makes the summit clip to flat white through the bloom composite.
const V_ROCK = '#7a6b76';        // lit face
const V_ROCK_DK = '#5f515f';     // shadow face
// Lava ramp, hottest first. Index 0 sits at the crater mouth and the ramp
// cools outward down the cap, so the vent reads as the source. Note this is
// upside down physically — real lava is yellow-white at the vent and reddens
// as it cools — but red-at-the-mouth is the cartoon convention the reference
// and every arcade volcano use, and it is what makes the crater legible.
const V_LAVA = ['#b8352a', '#c8452a', '#d55b2c', '#de742f', '#e58c34', '#e5a23c'];
const V_INK = 'rgba(22,14,30,0.72)';
// Opaque twin of V_INK, for the smoke layer: that puff is composited solid and
// faded once at the blit, so an alpha ink there would double up.
const V_INK_SOLID = '#3a3040';
// Depth of field. The volcano is flattened and blurred ONCE, as a single image,
// which is the one distance cue that does not fight the bold reference palette:
// it recedes without desaturating anything. Blurring each shape as it is drawn
// would be wrong — every internal edge would soften separately and the overlaps
// would go muddy.
//
// Held to the point where the cap's scalloped drips still read as separate
// tongues. That fringe is the most recognisable thing in the silhouette, and it
// is only ~40px tall on screen, so it is the first detail the blur eats: at the
// 1.15 this used to sit at, the tongues smeared into one soft band and the cap
// stopped looking poured. Anything below ~0.3 loses the recession entirely and
// the ink outline starts to alias against the sky.
//
// ctx.filter is unsupported in a few older engines; there it silently no-ops
// and the volcano simply draws sharp, which is a fine degradation.
const V_BLUR = 0.6;
// Plume shape: `sc` scales the puffs, `rise` how far the column climbs. Kept
// module-level because the composite layer must reserve headroom for whatever
// they add up to — a hardcoded margin silently crops the plume the moment
// either is raised.
const V_SMOKE_SC = 0.85, V_SMOKE_RISE = 1.6;
// tallest puff centre above the vent, plus its own radius, plus slack
const V_SMOKE_TOP = Math.ceil((8 + 92 * V_SMOKE_RISE + 28) * V_SMOKE_SC) + 16;
const V_SS = 2;

// The volcano is expensive to draw and almost entirely STATIC. Every path in
// it — the cone, the shadow faces, the scalloped lava fringe, the crater
// crescent — is fixed geometry, and horizontal parallax is pure translation:
// it changes where the layer lands on screen, not one pixel of what is inside
// it. Rebuilding all of that per frame cost ~1.1ms of the ~2.3ms this function
// used to spend, for an image identical to the previous frame's.
//
// So the fixed stack is rasterised ONCE into bake canvases, and the layer is
// composed at a FIXED subpixel phase (`CXB`) instead of at the live `cx`. The
// fractional parallax offset moves to the final blit — which is where it
// already was — so motion is unchanged; only the interior stops being rebuilt.
// A side benefit: the interior no longer re-rasterises at a different subpixel
// phase every frame, which is what made the ink edges shimmer as it drifted.
//
// TWO bakes rather than one, because the animated highlight sweep composites
// in the MIDDLE of the stack: over the lava gradient, under the cap's ink
// outline and the crater crescent. `under` is everything below the sweep,
// `over` everything above it.

// ---- fixed geometry (none of it depends on camera position) ----
// Proportioned against the far range rather than as a standalone cone: those
// crests are ~96 tall over a ~141 half-width (ratio ~0.7), so a tall narrow
// spire reads as a different kind of landform sitting among them. The flanks
// also follow a power curve instead of a straight line — `flankX` widens
// fastest near the summit, which blunts the apex the way a real massif is
// blunt. A straight-sided triangle is what made it read as pointy.
const V_HGT = 82, V_HALF_BASE = 104, V_NOTCH = 15;
// GROUNDED: the volcano stands on the same groundline as everything else.
//
// An earlier version lifted its base toward the horizon so it could be shrunk
// and still clear the 96px range in front of it. That bought smallness at the
// cost of looking unanchored, and it made the cone read as pointy — with the
// summit only just clearing the crests, the sole visible part was the steep
// tip, whatever the overall ratio said.
//
// Standing on the groundline means it CANNOT out-rise the range at this size,
// and that is the accepted trade: the peaks hide it, it shows through the
// valleys between them, and the plume carries it the rest of the time. Size
// is therefore chosen against the range's SHOULDER peaks (~0.55 * 96 = 53)
// rather than its main crests — high enough to clear the shoulders, low
// enough that the main peaks still cut across it.
const V_BASE_Y = GROUND_Y;
const V_APEX = V_BASE_Y - V_HGT;
const vFlankX = (f) => V_HALF_BASE * Math.pow(f, 0.72); // f: 0 at apex, 1 at base
// The silhouette does NOT stop at V_HALF_BASE. `V_BASE_Y` only sets
// proportions — the cone keeps descending to GROUND_Y, so the flanks are
// extrapolated past f=1 and the true half-width at the groundline is
// vFlankX(V_F_BASE), which is wider than V_HALF_BASE and grows every time the
// base is lifted. Sizing the layer or the cull off V_HALF_BASE slices that
// skirt off at a hard vertical edge, so both use the real extent.
const V_F_BASE = (GROUND_Y - V_APEX) / V_HGT;
const V_MAX_HALF = vFlankX(V_F_BASE);
// Layer bounds. The plume climbs well above the summit and is part of the same
// image, so it has to fit inside the blurred layer too — clipping it at the
// summit would leave a hard cut where the smoke crosses the edge.
const V_PAD = 6;
const V_LY = V_APEX - V_SMOKE_TOP;                                  // layer top, absolute y
const V_LW = Math.ceil(V_MAX_HALF * 2 + V_PAD * 2);
const V_LH = Math.ceil(GROUND_Y + 2 - V_LY);
// Where the summit sits inside the layer. Everything below is drawn against
// this instead of the live `cx`, which is what makes the bake reusable.
const CXB = V_MAX_HALF + V_PAD;
// The cone is TRUNCATED: `V_NOTCH` is wide enough (~1/4 of the base) that the
// flanks stop well short of `V_APEX` and the top is cut off, leaving a real
// rim-to-rim crater. Earlier passes kept a near-pointed peak and took a small
// nick out of it, and no depth of nick ever read as a volcano — a pointed
// mountain with a dent is still a pointed mountain. Widening the mouth is
// what does the work; the dish between the rims can then stay very shallow.
//
// `V_APEX` is therefore virtual — the tip the flanks are aimed at, not a place
// on the silhouette. `V_RIM_Y` is the real summit, so everything that used to
// hang off the apex (lava gradient, smoke origin) hangs off the rim instead.
const V_F_T = Math.pow(V_NOTCH / V_HALF_BASE, 1 / 0.72); // where the flank meets the rim
const V_RIM_Y = V_APEX + V_HGT * V_F_T;
const V_CRATER_D = 1.9;  // shallow dish across a wide rim, not a notch in a point
// The cap has to END ABOVE the far range's crests (~96) or the drips — the
// most recognisable part of the silhouette — sit behind the ridgeline and
// never show. That is what pins this fraction, not the look of the cone.
const V_CAP_BOT = V_BASE_Y - V_HGT * 0.70;
const V_LAVA_BOT = V_CAP_BOT + 10;

// The crater is a dip in the SILHOUETTE rather than a shape painted on top: an
// ellipse drawn on a convex outline always reads as a disc resting on the
// mountain, because nothing occludes it. A quadratic's midpoint sits halfway
// to its control point, so the control goes 2x the wanted depth down.
//
// `V_BASE_Y` sets the volcano's PROPORTIONS, but the silhouette still runs all
// the way down to GROUND_Y. Ending the polygon at V_BASE_Y left a flat cut
// edge hanging in mid-air wherever the range dipped below it — the cone has to
// keep descending until something covers it. So the flanks are extrapolated
// past f=1 to whatever fraction lands on the groundline; that extra skirt is
// always hidden behind the hills.
function vConePath() {
  const p = new Path2D();
  p.moveTo(CXB - vFlankX(V_F_BASE), GROUND_Y);
  for (let f = V_F_BASE; f >= V_F_T; f -= 0.03) p.lineTo(CXB - vFlankX(f), V_APEX + V_HGT * f);
  p.quadraticCurveTo(CXB, V_RIM_Y + V_CRATER_D * 2, CXB + V_NOTCH, V_RIM_Y);
  for (let f = V_F_T; f <= V_F_BASE; f += 0.03) p.lineTo(CXB + vFlankX(f), V_APEX + V_HGT * f);
  p.lineTo(CXB + vFlankX(V_F_BASE), GROUND_Y);
  p.closePath();
  return p;
}
// Molten cap: the lava has overflowed and set into a scalloped fringe of drips
// over the upper third, exactly as in the reference. The fringe is one path —
// a sine-scalloped lower edge whose scallop depth varies per lobe, so it reads
// as poured rather than as a cut band.
//
// `envelope` is what stops the fringe reading as a scalloped ribbon: it makes
// a few lobes run much longer than their neighbours, so the edge is a row of
// uneven tongues (the reference's silhouette) rather than even scallops.
//
// The drip waves are keyed to PIXELS, not to px/V_HALF_BASE. At the cap's
// altitude the cone is only ~43px half-wide, so a wave with a period in
// base-widths spans a third of a cycle across everything visible and the
// fringe flattens into a straight band. Pixel frequencies put ~5 tongues
// across the width that is actually on-cone.
function vCapPath() {
  const p = new Path2D();
  p.moveTo(CXB - V_HALF_BASE, V_APEX - 6);
  p.lineTo(CXB + V_HALF_BASE, V_APEX - 6);
  for (let px = V_HALF_BASE; px >= -V_HALF_BASE; px -= 1.5) {
    // Raised cosine, not |sin|: |sin| has a cusp at every zero, which turns
    // the fringe into a row of sawteeth. (1-cos)/2 is smooth at both ends, so
    // each lobe is a rounded tongue with a rounded notch beside it.
    const envelope = 0.4 + 0.6 * (0.5 - 0.5 * Math.cos(px * 0.16 + 0.7));
    const drip = (0.5 - 0.5 * Math.cos(px * 0.38)) * 10 * envelope
      + (0.5 - 0.5 * Math.cos(px * 0.8 + 1.4)) * 2.5;
    p.lineTo(CXB + px, V_CAP_BOT + drip);
  }
  p.closePath();
  return p;
}

// `cone` and `cap` are kept for the per-frame highlight clip — it needs BOTH,
// see the note where it is drawn. `under`/`over` are the baked halves of the
// static stack.
const volcBake = { under: null, over: null, cone: null, cap: null, ss: 0 };
// Layer-local drawing happens in ABSOLUTE y and CXB-relative x, so every
// context that touches the volcano wants the same transform.
function volcCtx(canvas, ss) {
  const g = canvas.getContext('2d');
  g.setTransform(ss, 0, 0, ss, 0, -V_LY * ss);
  return g;
}
// Rasterise `paint` into a supersampled full-layer scratch, then resolve the
// band [y0, y1) down to 1x THROUGH the depth-of-field blur.
//
// Baking the blur is the point. The volcano used to composite into a layer and
// blit it back under `ctx.filter = blur(...)` every frame, and that one
// filtered, downscaling blit was the single most expensive thing in the whole
// background — more than every path in the cone put together. A filter on a
// static image is a constant, so it belongs in the bake; the per-frame blit is
// then an ordinary unfiltered one.
//
// The band is tight in Y for the same reason: `under` only needs the cone's
// own ~94 rows, `over` only the ~40 around the cap. Blitting the full layer
// height would drag the plume's 172 rows of empty headroom along with it.
// `out` is the density the slice RESOLVES to. It used to resolve to 1x logical,
// which was invisible while the world rendered at 2-3x and glaring at 5.69x,
// where the cone was being blown up almost six-fold from its own raster. The
// callers still blit at logical size, so only the texel count changes.
//
// Both the source supersample and the blur radius have to follow `out`: the
// blur is specified in the destination canvas's own pixels, so leaving it at
// V_BLUR would shrink the depth-of-field softening to a sixth of its intent.
function bakeSlice(paint, y0, y1, out) {
  const ss = Math.max(V_SS, out);
  const sc = document.createElement('canvas');
  sc.width = V_LW * ss;
  sc.height = V_LH * ss;
  paint(volcCtx(sc, ss));
  const h = Math.ceil(y1 - y0);
  const c = document.createElement('canvas');
  c.width = V_LW * out;
  c.height = h * out;
  const g = c.getContext('2d');
  g.filter = `blur(${V_BLUR * out}px)`;
  g.drawImage(sc, 0, (y0 - V_LY) * ss, V_LW * ss, h * ss, 0, 0, V_LW * out, h * out);
  return { c, y: y0, h };
}
function bakeVolcano() {
  const out = bakeSS();
  // A density change makes the existing bakes the wrong resolution, not merely
  // stale — hold the factor they were built at rather than re-baking blindly.
  if (volcBake.under && volcBake.ss === out) return;
  volcBake.ss = out;
  const cone = vConePath(), cap = vCapPath();
  volcBake.cone = cone;
  volcBake.cap = cap;

  // ---- under: rock, ink outline, shadow faces, lava gradient ----
  volcBake.under = bakeSlice((g) => {
  g.fillStyle = V_ROCK;
  g.fill(cone);
  g.strokeStyle = V_INK;
  g.lineWidth = 1.4;
  g.stroke(cone);
  // Shadow face: the right flank plus a wedge down the middle, which is what
  // gives the reference cone its two-plane look at a glance.
  g.save();
  g.clip(cone);
  g.fillStyle = V_ROCK_DK;
  g.beginPath();
  g.moveTo(CXB + V_NOTCH * 0.3, V_APEX);
  g.lineTo(CXB + V_HALF_BASE * 1.4, GROUND_Y);
  g.lineTo(CXB + V_HALF_BASE * 0.28, GROUND_Y);
  g.lineTo(CXB + V_NOTCH * 0.1, V_BASE_Y - V_HGT * 0.44);
  g.closePath();
  g.fill();
  g.beginPath();                             // small gully on the lit face
  g.moveTo(CXB - V_NOTCH * 0.5, V_APEX + 6);
  g.lineTo(CXB - V_HALF_BASE * 0.46, GROUND_Y);
  g.lineTo(CXB - V_HALF_BASE * 0.74, GROUND_Y);
  g.closePath();
  g.fill();
  g.restore();
  // The lava is ONE continuous gradient, reddest at the crater mouth and
  // cooling to orange down the fringe. An earlier pass stacked discrete flat
  // fills instead and stepped visibly — at this size the cap is only ~40px
  // tall, so any band count coarse enough to animate is also coarse enough to
  // read as stripes. A gradient sidesteps the tradeoff entirely.
  g.save();
  g.clip(cone);
  const grad = g.createLinearGradient(0, V_RIM_Y - 2, 0, V_LAVA_BOT);
  for (let i = 0; i < V_LAVA.length; i++) {
    grad.addColorStop(i / (V_LAVA.length - 1), V_LAVA[i]);
  }
  g.fillStyle = grad;
  g.fill(cap);
  g.restore();
  // The cone's own band: the ink stroke's half-width above the summit, down to
  // just past the groundline. Everything above is plume, which is drawn live.
  }, V_RIM_Y - 2, GROUND_Y + 2, out);

  // ---- over: the cap's ink outline and the crater's inner wall ----
  volcBake.over = bakeSlice((h) => {
  h.save();
  h.clip(cone);
  h.strokeStyle = V_INK;
  h.lineWidth = 1.1;
  h.stroke(cap);
  // Inner wall: a crescent hugging the underside of the crater dip, which is
  // the far wall of the bowl seen from slightly below. Two arcs of the same
  // span, the lower one deeper, filled between. This is all the crater needs
  // now that the silhouette carries it — an opaque shape here would put the
  // disc back.
  h.beginPath();
  h.moveTo(CXB - V_NOTCH, V_RIM_Y);
  h.quadraticCurveTo(CXB, V_RIM_Y + V_CRATER_D * 2, CXB + V_NOTCH, V_RIM_Y);
  h.quadraticCurveTo(CXB, V_RIM_Y + (V_CRATER_D + 1.1) * 2, CXB - V_NOTCH, V_RIM_Y);
  h.closePath();
  h.fillStyle = 'rgba(58,32,38,0.24)';
  h.fill();
  h.restore();
  // Rim to the bottom of the longest drip, plus slack for the blur.
  }, V_RIM_Y - 3, V_CAP_BOT + 18, out);
}

function drawVolcano(ctx, t, camX, atCam, reduced) {
  const cx = W / 2 + (atCam - camX) * VOLCANO_PLX;
  if (cx + V_MAX_HALF < -40 || cx - V_MAX_HALF > W + 40) return; // off screen
  bakeVolcano();
  // Straight onto the scene, no intermediate layer: the bakes already carry the
  // depth blur, so there is nothing left that has to be flattened before it can
  // be filtered. `translate` puts the parallax offset on the context, which
  // means the cached cone/cap paths keep working as clips without rebuilding.
  ctx.save();
  ctx.translate(cx - CXB, 0);

  // Smoke goes down first so the plume passes BEHIND the summit — puffs that
  // overlap the crater lip read as sitting on top of it otherwise.
  drawVolcanoSmoke(ctx, t, CXB, V_RIM_Y + V_CRATER_D, reduced, V_SMOKE_SC, V_SMOKE_RISE);
  const under = volcBake.under;
  ctx.drawImage(under.c, 0, under.y, V_LW, under.h);
  // Motion comes from a soft highlight travelling down the slope instead of
  // from moving the colour fronts. Its alpha follows sin(pi*u), so it fades in
  // at the mouth and out at the fringe rather than popping when it wraps.
  if (!reduced) {
    const u = (t * 0.15) % 1;
    const hy = V_RIM_Y + (V_LAVA_BOT - V_RIM_Y) * u;
    const band = 13;
    const hg = ctx.createLinearGradient(0, hy - band, 0, hy + band);
    const a = 0.3 * Math.sin(Math.PI * u);
    hg.addColorStop(0, 'rgba(255,198,96,0)');
    hg.addColorStop(0.5, `rgba(255,198,96,${a})`);
    hg.addColorStop(1, 'rgba(255,198,96,0)');
    ctx.save();
    // BOTH clips, in this order. The cap path spans the full base width, but at
    // the cap's altitude the cone is only ~43px half-wide — the cone clip is
    // what trims the fringe back to the silhouette. Clipping to the cap alone
    // lets the sweep run out into open sky as a warm smear either side of the
    // summit, which is exactly what it did until this line was fixed.
    ctx.clip(volcBake.cone);
    ctx.clip(volcBake.cap);
    ctx.fillStyle = hg;
    ctx.fillRect(CXB - V_HALF_BASE, hy - band, V_HALF_BASE * 2, band * 2);
    ctx.restore();
  }
  const over = volcBake.over;
  ctx.drawImage(over.c, 0, over.y, V_LW, over.h);
  ctx.restore();
}

// Billowing cartoon smoke off the summit: each puff is a cluster of lobes (a
// single circle reads as a bubble, not smoke) that rises, expands and fades on
// its own phase of a shared cycle, so the column is continuous rather than
// pulsing in lockstep. Lobe offsets come from index hashes, not RNG, so the
// plume is identical frame to frame at a given `t` — nothing here is stateful.
const V_PUFFS = 5;
function drawVolcanoSmoke(ctx, t, cx, apex, reduced, sc = 1, rise = 1) {
  if (reduced) {
    // Reduced motion still gets a plume, just a static one: the summit reads as
    // wrong without it, and a frozen cloud is not a motion trigger.
    for (let i = 0; i < 3; i++) {
      const p = 0.2 + i * 0.3;
      smokePuff(ctx, cx + Math.sin(i * 2.1) * 12 * sc * p, apex - (8 + p * 64 * rise) * sc,
        (6 + p * 18) * sc, (1 - p * 0.55) * 0.6, i);
    }
    return;
  }
  for (let i = 0; i < V_PUFFS; i++) {
    const p = (t * 0.13 + i / V_PUFFS) % 1;
    // Drift widens as it climbs, and each puff leans a different way, so the
    // column spreads into a head instead of rising as a straight pipe.
    const lean = Math.sin(i * 2.7) * 0.9 + 0.35;
    const x = cx + (lean * 34 * Math.pow(p, 1.3) + Math.sin(t * 0.6 + i) * 3 * p) * sc;
    const y = apex - (8 + (p * 74 + Math.pow(p, 2) * 18) * rise) * sc;
    const r = (6 + p * 22) * sc;
    // Fade in fast off the crater, out slowly at the top.
    const a = Math.min(1, p * 6) * (1 - p * 0.85) * 0.8;
    smokePuff(ctx, x, y, r, a, i);
  }
}
// One baked sprite per puff seed, drawn once and then scaled.
//
// A puff's cluster is SELF-SIMILAR in `r` — the lobe offsets and radii are all
// fractions of it, and the seed only picks lobe angles — so the shape a puff
// has at r=28 is the shape it has at r=8, scaled. Compositing it from arcs on
// every frame (which is what this used to do, five times a frame) rebuilds an
// image that differs from the baked one only by a scale factor.
//
// The one term that is NOT proportional is the outline width's `max(0.9, …)`
// floor, which only bites below r≈10.6 — the freshly-emerged puffs at the vent,
// still fading in, under a 1.15px blur. Their ink runs a hair thinner than it
// used to; nothing else changes.
const SMOKE_SS = 2; // supersample, so the blit is not soft at device res
// Bake radius. Set to the largest a puff actually reaches — (6 + 22) * V_SMOKE_SC
// — so sprites are only ever scaled DOWN (never blown up past their raster) and
// the biggest, most visible puffs draw at ~1:1, where the baked blur is exactly
// the blur they would have got. Overshooting this shrinks every puff's effective
// blur for nothing.
const PUFF_R0 = Math.ceil((6 + 22) * V_SMOKE_SC);
const puffSprites = [];
let puffOutSS = 0;   // bake factor the cached puffs were resolved at

// The outline is a DILATED SILHOUETTE, not a stroke. Stroking the cluster path
// would trace every circle in full, including the arcs buried inside the union,
// so the puff would read as a clump of bubbles instead of one cloud. Filling
// the same cluster at radius+ow in ink and then the normal radii on top leaves
// exactly the union's outer ring showing.
//
// That requires the body fill to be OPAQUE — a translucent body would let the
// ink layer beneath it darken the whole interior. So the puff is composited
// opaque into a scratch layer and the fade is applied once, at the blit. Doing
// it per-fill instead is what produced the previous soft-blob look.
function puffCluster(g, cx, cy, r, seed, grow) {
  g.beginPath();
  g.arc(cx, cy, r + grow, 0, Math.PI * 2);
  for (let k = 0; k < 4; k++) {
    const a = seed * 1.9 + k * 1.7;
    const lx = cx + Math.cos(a) * r * 0.8, ly = cy + Math.sin(a) * r * 0.55;
    const lr = r * 0.62 + grow;
    g.moveTo(lx + lr, ly);
    g.arc(lx, ly, lr, 0, Math.PI * 2);
  }
}
function puffSprite(seed) {
  // Same story as the volcano slices: the resolve target was 1x logical, so at
  // native density every puff was magnified from its own raster. Keyed on the
  // bake factor so a density change rebuilds rather than reusing the wrong one.
  const out = bakeSS();
  if (puffOutSS !== out) { puffSprites.length = 0; puffOutSS = out; }
  let s = puffSprites[seed];
  if (s) return s;
  const r = PUFF_R0;
  const ow = Math.max(0.9, r * 0.085);
  const half = Math.ceil(r * 1.55 + ow + 2);
  const size = half * 2;
  const ss = Math.max(SMOKE_SS, out);
  const sc = document.createElement('canvas');
  sc.width = sc.height = size * ss;
  const g = sc.getContext('2d');
  g.setTransform(ss, 0, 0, ss, 0, 0);
  const m = size / 2;
  puffCluster(g, m, m, r, seed, ow);
  g.fillStyle = V_INK_SOLID;
  g.fill();
  puffCluster(g, m, m, r, seed, 0);
  g.fillStyle = '#b9bcc6';
  g.fill();
  // Lighter cap on the upper lobes so the cloud is shaded rather than flat —
  // clipped to the cluster, or it spills past the outline.
  g.save();
  puffCluster(g, m, m, r, seed, 0);
  g.clip();
  g.fillStyle = '#d4d6de';
  g.beginPath();
  g.arc(m - r * 0.3, m - r * 0.5, r * 0.72, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // Resolve to 1x through the same depth blur the cone is baked with, so the
  // plume still recedes with the rest of the volcano now that nothing is
  // filtered at draw time. The blur is baked at the sprite's full size and
  // therefore shrinks with it — a puff at the vent ends up crisper than one at
  // the top of the column. Under a translucent grey cloud that reads as the
  // near end of the plume being slightly sharper, which is not wrong.
  const c = document.createElement('canvas');
  c.width = c.height = size * out;
  const o = c.getContext('2d');
  o.filter = `blur(${V_BLUR * out}px)`;
  o.drawImage(sc, 0, 0, size * ss, size * ss, 0, 0, size * out, size * out);
  s = { c, half };
  puffSprites[seed] = s;
  return s;
}
function smokePuff(ctx, x, y, r, alpha, seed) {
  if (alpha <= 0.01) return;
  const s = puffSprite(seed);
  const half = s.half * (r / PUFF_R0);
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha;
  ctx.drawImage(s.c, x - half, y - half, half * 2, half * 2);
  ctx.globalAlpha = prev;
}

// Per-frame gradient construction is surprisingly costly at device res —
// cache gradients by their color stops (they are reusable frame to frame).
const gradCache = new Map();
function skyGrad(ctx, c0, c1) {
  const key = c0 + '|' + c1;
  let g = gradCache.get(key);
  if (!g) {
    g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    gradCache.set(key, g);
  }
  ctx.fillStyle = g;
  // Up to PAN_MAX above the frame as well: the camera cranes the whole
  // background down on a tall jump, and without that headroom the strip it
  // opens at the top of the screen is whatever was in the backbuffer. The
  // gradient itself still runs 0..GROUND_Y as authored — a canvas gradient
  // clamps outside its stops, so the extra rows are flat sky, not a stretch.
  ctx.fillRect(0, -PAN_MAX, W, GROUND_Y + PAN_MAX);
}

// Full-screen textures (scanlines, dot lattices) as tiny repeating patterns:
// one GPU-tiled fill instead of thousands of per-frame fillRects.
const patCache = new Map();
function patternFill(ctx, key, tw, th, paint) {
  let pat = patCache.get(key);
  if (!pat) {
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    paint(c.getContext('2d'));
    pat = ctx.createPattern(c, 'repeat');
    patCache.set(key, pat);
  }
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
  }
}

// A repeating texture that covers the WHOLE screen every frame is cheaper
// baked once into a backbuffer-sized layer and blitted than re-tiled by the
// rasterizer each frame (measured: 3.3ms -> 0.4ms per fill). Re-bakes only
// when the backbuffer is resized.
const bakeCache = new Map();
function bakedFill(ctx, key, tw, th, paint) {
  const cv = ctx.canvas;
  let baked = bakeCache.get(key);
  if (!baked || baked.width !== cv.width || baked.height !== cv.height) {
    baked = document.createElement('canvas');
    baked.width = cv.width;
    baked.height = cv.height;
    const c = baked.getContext('2d');
    c.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    const tile = document.createElement('canvas');
    tile.width = tw;
    tile.height = th;
    paint(tile.getContext('2d'));
    const pat = c.createPattern(tile, 'repeat');
    if (!pat) return;
    c.fillStyle = pat;
    c.fillRect(0, 0, W, H);
    bakeCache.set(key, baked);
  }
  ctx.drawImage(baked, 0, 0, W, H);
}

// THE CITY ITSELF, baked. This panel is beat-driven rather than time-driven —
// lcdSceneFrame floors the HEARD beat — so at 124 BPM the picture changes about
// twice a second while the frame is redrawn sixty times a second, and most of
// what it redraws (facades, line art, unlit windows) is identical between those
// changes. That share is painted once into a backbuffer-sized layer and
// blitted, exactly as bakedFill does for a tiling texture; only the parts a
// beat can actually move are still drawn per frame.
//
// TRANSPARENT, and deliberately not carrying the sky. The commuter train runs
// on a viaduct BEHIND the skyline, so it has to be painted between the sky and
// the facades — a bake that owned the sky as well would have to cover it. The
// sky is two fills; leaving them live costs nothing and keeps the paint order
// exactly what it has always been.
//
// ONE canvas, not a map. The key carries `phase`, which steps four times in a
// run (LCD_PHASES), and the stage — twelve combinations, and a map of them
// would hold ~56MB of canvas at 3x where one slot holds ~4.7MB. Repaints land
// on a phase change, a stage change and a resize: about four in a run.
//
// Headless it draws STRAIGHT THROUGH, which is what keeps the op-sequence
// recorder in tests/lcd-background.js seeing every fill this painter has always
// issued. THE createImageData PROBE IS THE WHOLE POINT AND MUST NOT BE SOFTENED
// TO A typeof CHECK — under tests/dom-stub.js the context is a proxy that
// answers every unknown property with a no-op, so a typeof asks "is there a
// real canvas here?" and is always told yes. Same probe, and the same reason,
// as makeSurface in visualisers.js.
let cityBake = null;
function lcdBakeSurface(w, h, reuse) {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = reuse || document.createElement('canvas');
    // Assigning either dimension clears the backing store, which is the reset
    // this needs anyway when only the key changed.
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const probe = ctx.createImageData?.(2, 2);
    if (!probe?.data || probe.data.length !== 16) return null;
    return { canvas, ctx };
  } catch { return null; }
}
function bakedCity(ctx, key, paint, slices = null) {
  const cv = ctx.canvas;
  if (!cv || !cv.width || !cv.height) { paint(ctx); return; }
  const sized = cityBake && cityBake.c.width === cv.width && cityBake.c.height === cv.height;
  if (!sized || cityBake.key !== key) {
    const made = lcdBakeSurface(cv.width, cv.height, sized ? cityBake.c : null);
    if (!made) { cityBake = null; paint(ctx); return; }
    made.ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    paint(made.ctx);
    cityBake = { key, c: made.canvas };
  }
  // ONE BLIT, unless the city is still arriving. `slices` is the assembly's
  // whole cost on this path: a list of {x, w, dy} column windows onto the SAME
  // bake, each drawn at its own vertical offset, so a skyline that walks into
  // place still pays for exactly one baked surface. Rebaking per structure —
  // or dropping the bake for the opening bars — would have made the eight
  // beats nobody sees twice the most expensive in the stage.
  //
  // A column is safe to slice because this skyline is authored with air in it:
  // the structures sit ~12px apart, so a window one pixel proud of a facade on
  // each side carries its line art and nothing of its neighbour's.
  if (!slices) { ctx.drawImage(cityBake.c, 0, 0, W, H); return; }
  const sx = cityBake.c.width / W;
  const sy = cityBake.c.height / H;
  for (const { x, w, dy } of slices) {
    ctx.drawImage(cityBake.c, x * sx, 0, w * sx, cityBake.c.height, x, dy, w, H);
  }
}

// --- level-1 sky pals: a plain, dignified sun (suns don't bop) and a nosy
// cartoon cloud that wanders the whole sky, drifts in and out of view, looks
// around with big eyes, and reacts to hero hits — gasping in sympathy or,
// just as often, laughing. Game code pings sunShock() from takeHit.
let cloudShockT = 0, cloudLaughT = 0, cloudLastT = 0;
const PAL_S = 1.4; // the pal outsizes every plain cloud so the face reads first
export function sunShock() {
  if (Math.random() < 0.55) cloudLaughT = 1.7;
  else cloudShockT = 1.4;
}

function drawStaticSun(ctx, t) {
  // Animated but dignified: it slowly arcs across the sky like a day passing,
  // its rays rotate and breathe, and its halo pulses. It does not bop.
  const sx = (t * 3.2) % (W + 150);
  const x = W + 60 - sx;                              // drifts right to left
  const u = (x - W / 2) / (W / 2);
  // Base sits below the HUD pill row (~y 23) plus the halo/ray radius (~30),
  // so the sun never hides behind the score furniture at the apex of its arc.
  const y = 58 + 26 * u * u;                          // shallow day-arc
  const breathe = 1 + 0.06 * Math.sin(t * 1.1);
  ctx.save();
  ctx.translate(x, y);
  // halo
  ctx.beginPath();
  ctx.arc(0, 0, 30 * breathe, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(248,200,64,${0.14 + 0.05 * Math.sin(t * 1.7)})`;
  ctx.fill();
  // rays: slow rotation, alternating lengths that shimmer
  ctx.fillStyle = '#f8c840';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.18;
    const r2 = (23 + (i % 2) * 4 + 1.6 * Math.sin(t * 2.3 + i)) * breathe;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - 0.1) * 17, Math.sin(a - 0.1) * 17);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.lineTo(Math.cos(a + 0.1) * 17, Math.sin(a + 0.1) * 17);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 15 * breathe, 0, Math.PI * 2);
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,16,40,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// The one puffy silhouette every sky cloud shares — the cloud pal wears it
// with a face, the background clouds wear it plain. Draw at origin; callers
// translate/scale first.
function drawCloudBody(ctx, fill) {
  ctx.beginPath();
  for (const [px, py, rx, ry] of [[-15, 3, 10, 8], [0, -5, 13, 10], [15, 3, 10, 8], [0, 4, 17, 9]]) {
    ctx.moveTo(px + rx, py);
    ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
  }
  // Stroke BEFORE fill: the fill then covers every stroke segment inside the
  // union, leaving only the outer silhouette outlined — otherwise each lobe's
  // full ellipse shows and the puff reads as a clump of bubbles on any fill
  // that isn't washed out by bloom. Double width because fill eats the inner
  // half of the stroke.
  ctx.strokeStyle = 'rgba(26,16,40,0.2)';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCloudPal(ctx, t, reduced) {
  if (t < cloudLastT) { cloudShockT = 0; cloudLaughT = 0; } // new run: compose yourself
  const dt = Math.max(0, Math.min(0.1, t - cloudLastT));
  cloudLastT = t;
  if (cloudShockT > 0) cloudShockT -= dt;
  if (cloudLaughT > 0) cloudLaughT -= dt;
  const laughing = cloudLaughT > 0;
  const shocked = !laughing && cloudShockT > 0;

  // Wandering path: crosses the whole sky slowly, then exits and stays gone
  // for a stretch before floating back in from the left.
  const x = ((t * 13) % (W + 190)) - 95;
  if (x < -45 || x > W + 45) return; // off having a private moment
  // Sits just under the HUD, not down in the middle of the sky: at PAL_S the
  // silhouette reaches ~21px above its origin and the pill row owns everything
  // down to y 23, so the top of the bob is tuned to land at y ~28 — as high as
  // the pal can ride while its face still clears the score.
  let y = 61 + Math.sin(t * 0.33) * 9.5 + Math.sin(t * 0.9) * 2.5;
  let jx = 0;
  if (!reduced && laughing) { y -= Math.abs(Math.sin(t * 15)) * 3; jx = Math.sin(t * 21) * 1.2; }
  if (!reduced && shocked) jx = Math.sin(t * 26) * 1.2;

  ctx.save();
  ctx.translate(x + jx, y);
  ctx.scale(PAL_S, PAL_S); // the pal is the big one; the flock stays smaller
  drawCloudBody(ctx, '#f8f8ff');

  // idle micro-expressions: every ~8s slot, briefly giggle or doze
  const slot = Math.floor(t / 8);
  const hash = Math.abs(Math.sin(slot * 127.13));
  const inSlot = t - slot * 8 < 1.6;
  const idle = (!laughing && !shocked && inSlot) ? (hash < 0.25 ? 'giggle' : hash < 0.45 ? 'sleepy' : 'normal') : 'normal';

  // eyes
  ctx.lineCap = 'round';
  const gx = shocked || laughing ? 0 : Math.sin(t * 0.6) * 1.7 - 1.1;
  const gy = shocked || laughing ? 0 : Math.cos(t * 0.45) * 1.3 + 1.0;
  const blink = !laughing && !shocked && idle === 'normal' && Math.sin(t * 1.3) > 0.995;
  for (const sx of [-1, 1]) {
    const ex = sx * 6.5, ey = -4;
    if (laughing) {
      // happy closed arcs: ^ ^
      ctx.strokeStyle = '#1a1028';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, ey + 2, 3.4, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      continue;
    }
    const er = shocked ? 5.4 : 4.2;
    ctx.beginPath();
    ctx.ellipse(ex, ey, er * 0.85, blink ? 0.8 : idle === 'sleepy' ? er * 0.55 : er, 0, 0, Math.PI * 2);
    // white-on-white-cloud: the eye whites need a REAL outline or only the
    // pupils read and the gaze looks unmoored
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(26,16,40,0.85)';
    ctx.lineWidth = 1.25;
    ctx.stroke();
    if (!blink) {
      ctx.beginPath();
      ctx.arc(ex + gx, ey + gy + (idle === 'sleepy' ? 1.2 : 0), shocked ? 1.1 : 2, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1028';
      ctx.fill();
    }
    if (idle === 'sleepy') { // heavy lid
      ctx.beginPath();
      ctx.ellipse(ex, ey - er * 0.45, er * 0.9, er * 0.45, 0, Math.PI, 0);
      ctx.fillStyle = '#f8f8ff';
      ctx.fill();
    }
  }
  // brows
  if (shocked) {
    ctx.strokeStyle = '#1a1028';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, -11); ctx.lineTo(-4, -13.5);
    ctx.moveTo(10, -11); ctx.lineTo(4, -13.5);
    ctx.stroke();
  }
  // mouth
  if (laughing) {
    // wide-open cackle + tongue + a squeezed-out tear
    ctx.beginPath();
    ctx.ellipse(0, 4.5, 4.6, 4 + Math.abs(Math.sin(t * 15)) * 1.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 6.8, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f890b8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-10.5, -1 + Math.sin(t * 7) * 1.2, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#8ac8f0';
    ctx.fill();
  } else if (shocked) {
    ctx.beginPath();
    ctx.ellipse(0, 5.5, 3.4, 4.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
  } else if (idle === 'giggle') {
    ctx.beginPath();
    ctx.ellipse(0, 4, 3.2, 2.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a3020';
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 2.5, 6.5, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.strokeStyle = '#1a1028';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(248,120,80,0.3)';
    ctx.beginPath();
    ctx.ellipse(-9.5, 2, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.ellipse(9.5, 2, 2.4, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------- SPEED ZONE
//
// The desert cabinet's background. It was the plainest in the game and the
// reason was measurable rather than a matter of taste: faux3d drew a sky, a
// fixed sun blob, ONE ridge and two loop wireframes, it never touched `t` — the
// only pack whose background had no motion of its own — and it never drew
// `cab.hills`, a colour the cabinet defines and paid for.
//
// Everything below is gated on `cab.id === 'speed'` at the call site, exactly
// as the plumber cabinet's sun, volcano and clouds are: faux3d is not
// SPEED ZONE's alone. THE SURGE cycles all eight packs, and the hub cabinet
// screens, the gallery and the social renderers all instantiate it too.

// Nearest silhouettes and their hazed cousins. Warm browns, never neutral or
// black — the sky is #f08048 to #f8c060 and a black bird against that is a
// hole punched in it rather than a bird.
const TAU_BG = Math.PI * 2;
const DESERT_INK = '#4a2a1c';
const DESERT_INK_FAR = '#7a4a32';
const DESERT_ROCK = '#a8683a';
const DESERT_ROCK_LIT = '#c88a52';
const DESERT_ROCK_DARK = '#7c4526';
// The near ridge's own numbers, in one place because THREE things read them:
// the layer itself, the cacti standing on its crest, and the haze that has to
// know where the horizon is.
// THREE ranges, not two. Far mesas, a middle range, then the dune line the
// cacti stand on. The middle one is what turns two bands into distance: with
// only a far and a near layer the eye reads a backdrop and a foreground, and
// there is nothing in between for them to be far from.
//
// `dunes` on the two nearer ranges so the hills vary in size — a plain |sin|
// ridge makes every hump identical, which is the thing that reads as wallpaper.
//
// Raised about half again from the amplitudes they were first cut at (50 / 42
// / 34). The ground line sits at 232 of a 270 frame, so at those numbers the
// tallest thing on the horizon reached a fifth of the way up the sky and the
// whole country hugged the road — the layers were there, and the picture was
// still mostly empty orange. The RATIO between the three is what carries the
// depth, so all three go up together and the far range stays the tallest.
// Sized against PLUMBER PANIC, which is the cabinet that gets this right: its
// far range runs amp 96 at wl 90, so the mountains fill a good third of the
// frame and the near hills sit low in front of them. The desert was drawing
// everything much flatter and reading as a strip of country along the bottom.
// SHALLOW. The heights are roughly where they were, but the wavelengths are
// nearly doubled, and that ratio is the whole look: a hump 88 tall over 150px
// of ground is a cone, and the same hump over 350px is a hill. Plumber's near
// range runs amp 34 at wl 50 — its slopes are gentle, and the desert's were
// climbing about twice as steeply for the same reason its hills read as
// pointy. Height alone was never the problem.
const DESERT_FAR = { amp: 100, wl: 230, factor: 0.12 };
const DESERT_MID = { amp: 78, wl: 200, factor: 0.22, color: '#c0884c' };
const DESERT_RIDGE = { amp: 52, wl: 150, factor: 0.35 };

// Where the dunes are, as fractions of one tile. `ridgeProfile`'s dune mode
// builds each ridge from exactly these three humps, so anything that needs to
// stand ON a dune — the cacti — can be placed at a peak rather than dropped at
// an arbitrary x and left wherever the curve happens to be. That was the bug
// in the first cut: fixed x positions land in a TROUGH about as often as on a
// crest, and a cactus standing in a valley between two dunes reads as floating
// in front of the hills rather than growing out of them.
// The widths OVERLAP — they sum to well over one period — and that is the
// whole difference between a range of hills and a row of cones. Cut narrow
// (0.36 / 0.25 / 0.30) each hump stood alone with flat ground either side, so
// every one ran up to a point and down again; widened until neighbours meet,
// the max() between them fills the troughs and what is left is a rolling ridge
// with rounded tops.
//
// Each summit still clears its neighbours' reach, so a peak is a real peak and
// the cacti planted on them are not standing on the shoulder of a bigger hump.
const DESERT_DUNES = [
  { at: 0.17, w: 0.56, h: 1 },
  { at: 0.52, w: 0.40, h: 0.6 },
  { at: 0.81, w: 0.48, h: 0.84 },
];

// One vulture, wingspan `s`, centred on the origin.
//
// The silhouette has one requirement above looking nice: it must not read as a
// HAZARD. The lane already teaches that a thing in the sky is a buzzbird or a
// drone — something to duck — and buzzbird is drawn in hazard orange with a
// fast six-frame flap. So this is its opposite on every axis carrying that
// meaning: warm dark with no hazard colour anywhere, wings in the flat
// dihedral V of a soaring bird, and a flap that is mostly absent.
function drawVulture(ctx, s, flap, ink) {
  const half = s / 2;
  // The V. Even at rest the tips sit above the body, and that dihedral is the
  // single most recognisable thing about a vulture at distance — drawn with
  // flat wings it reads as a gull.
  const rise = s * (0.13 + flap * 0.1);
  const tail = s * 0.055;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-half, -rise);
  ctx.quadraticCurveTo(-half * 0.42, -s * 0.055, -s * 0.05, -s * 0.012);
  ctx.lineTo(s * 0.05, -s * 0.012);
  ctx.quadraticCurveTo(half * 0.42, -s * 0.055, half, -rise);
  ctx.quadraticCurveTo(half * 0.46, tail * 0.6, s * 0.06, tail);
  ctx.lineTo(-s * 0.06, tail);
  ctx.quadraticCurveTo(-half * 0.46, tail * 0.6, -half, -rise);
  ctx.closePath();
  ctx.fill();
  // Head and tail nubs — two or three pixels each, and what stops the shape
  // reading as a boomerang.
  ctx.fillRect(-s * 0.03, -s * 0.075, s * 0.06, s * 0.06);
  ctx.fillRect(-s * 0.045, tail * 0.7, s * 0.09, s * 0.06);
}

// Thermals, not flight paths. A bird crossing the lane horizontally is exactly
// what a flyer hazard does; one going round a slow circle cannot be mistaken
// for one, and it is also what vultures actually do.
//
// The ellipse is a circle in perspective — wide in x, shallow in y — and each
// bird scales with its phase so the near side is bigger, which is what sells
// it as a ring in the air rather than an oval on the glass.
const DESERT_THERMALS = [
  { x: 118, y: 60, rx: 48, ry: 11, n: 3, s: 21, rate: 0.40, plx: 0.17, ink: DESERT_INK },
  { x: 352, y: 40, rx: 31, ry: 7, n: 2, s: 13, rate: 0.55, plx: 0.09, ink: DESERT_INK_FAR },
];

function drawVultures(ctx, t, camX, reduced) {
  const span = W + 160;
  for (const th of DESERT_THERMALS) {
    for (let i = 0; i < th.n; i++) {
      // Reduced motion freezes the wheel rather than emptying the sky — the
      // volcano plume's rule: a frozen cloud is not a motion trigger, and an
      // empty sky reads as wrong rather than as calm.
      const a = (reduced ? 0 : t * th.rate) + (i * TAU_BG) / th.n;
      const drift = camX * th.plx * PLX;
      const x = ((th.x + Math.cos(a) * th.rx - drift) % span + span) % span - 80;
      const y = th.y + Math.sin(a) * th.ry;
      // Nearer on the front of the circle. The size difference is small on
      // purpose: enough to give the ring depth, not enough to read as a bird
      // approaching the camera, which would be a hazard again.
      const depth = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(a));
      // Mostly zero. The subtraction clips the sine so a flap is a brief event
      // between long glides — the cadence that separates soaring from
      // flapping, where buzzbird runs a continuous six-frame cycle at 16fps.
      const flap = reduced ? 0 : Math.max(0, Math.sin(t * 1.7 + i * 2.3) - 0.8) * 4.4;
      // Banking into the turn: cos(a) is the x velocity, so the roll follows
      // the direction of travel and the bird leans the way it is going.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.sin(a) * 0.22);
      drawVulture(ctx, th.s * depth, flap, th.ink);
      ctx.restore();
    }
  }
}

// Saguaros standing on the near ridge — the pixel pack's trees-on-crests idea
// in desert form, drawn as their own pass rather than through parallaxHills'
// `trees` option because a saguaro is not a tree shape and that option bakes
// one crown.
//
// FEW and BIG. A first pass put eight 9-to-20px cacti up there and produced
// eight little glyphs: at that size an arm is three pixels of elbow and the
// whole thing reads as a digit rather than a plant.
//
// The arms are STROKED CURVES, and that is the whole difference between a
// cactus and a numeral. Built from rectangles — out along a bar, then up a
// column — every arm meets the trunk at a hard right angle, and a vertical
// stem with a right-angled arm at half height is a drawn 4. Nothing about the
// colour or the size fixes that; the corner has to go. A quadratic whose
// control point sits AT the corner sweeps the elbow into the arc a saguaro
// actually grows, and round caps finish the tips without a separate dome.
//
// Nothing in the set is a bare vertical either, for the same reason: an
// armless column is a line, and a line on a hill is a fence post. Every entry
// has at least one arm, and variety comes from HEIGHT, arm count and which
// side the arm is on rather than from different species. Two other species
// were tried at this size and both failed: a barrel cactus is a squat ellipse,
// which at eleven pixels is a dark egg sitting on a hill, and a prickly pear's
// pads collapse into a paw print. A silhouette that has to be explained is
// worse than a fourth saguaro.
function drawSaguaros(ctx, camX) {
  const { amp, wl, factor } = DESERT_RIDGE;
  const period = Math.max(16, Math.round(Math.PI * wl));
  const off = ((camX * factor * PLX) % period + period) % period;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Tinted toward the layer it stands on rather than drawn in the nearest ink.
  // At full DESERT_INK they read as foreground objects that happen to overlap a
  // hill; a step back toward the ridge's own value puts them IN that layer.
  ctx.strokeStyle = '#5e361f';
  // One cactus per DUNE, planted on the peak, rather than five at fixed x
  // offsets. Fixed offsets land in a trough as often as on a crest, and a
  // cactus in a valley reads as floating in front of the hills — which is
  // exactly what it was doing.
  //
  // Size follows the dune's own height, so the tall dune gets the tall cactus
  // and the low one gets a short one. That is the relationship a real skyline
  // has and it is free here, since the profile already states both.
  // Height is a FRACTION OF THE DUNE, not a fixed number. Stated absolutely it
  // has to be re-tuned every time the ranges move, and it was wrong in both
  // directions within a day: too small against a 34-amplitude ridge, then 46px
  // tall on a 58px dune — a saguaro four-fifths the height of the hill it grows
  // on, which is why it read as HUGE and could not look planted whatever the
  // burial. Nothing on a horizon is anywhere near the size of the land under
  // it. Tied to the dune, the relationship survives the next resize.
  const PLANT = [{ arms: 2 }, { arms: 1 }, { arms: 1 }];
  // Smaller again. Against a shallow ridge a cactus at 0.42 of the dune reads
  // as a landmark rather than as vegetation — these are meant to be distant
  // plants, not the subject of the frame.
  const CACTUS_OF_DUNE = 0.3;
  // Which ABSOLUTE tile the loop starts from. This is the whole fix for the
  // cacti popping in and out mid-screen.
  //
  // `k` is a loop counter measured from the current scroll offset, so the same
  // physical dune is k one frame and k+1 the frame after `off` wraps past the
  // period. Every decision keyed off k therefore flipped as you drove: the
  // every-third-bare rule turned a cactus on and off, and the mirror flipped it
  // left-to-right, both in the middle of the screen where you cannot miss it.
  // `tile` is derived from the scroll distance itself, so it names the same
  // dune for as long as that dune exists and every choice below is stable.
  const base = Math.floor((camX * factor * PLX) / period);
  const first = Math.floor((-off - period) / period);
  const last = Math.ceil((W + period) / period);
  for (let k = first; k <= last; k++) {
    const tile = base + k;
    for (let i = 0; i < DESERT_DUNES.length; i++) {
      // Every third dune is left bare. A cactus on every peak is an orchard;
      // the gaps are what make it desert.
      if (((tile + i) % 3 + 3) % 3 === 2) continue;
      const dune = DESERT_DUNES[i];
      const spec = PLANT[i];
      const parity = (((tile + i) % 2) + 2) % 2;
      // Slightly off the summit — dead centre on every peak is a pattern.
      // Nudge measured in PIXELS, not as a fraction of the dune. As a fraction
      // it scaled with the dune's width, so widening the humps slid every
      // cactus further down the slope away from its summit — which is a good
      // part of why they read as stuck on rather than planted.
      const nudge = (parity ? 3 : -4) / period;
      const x = k * period - off + (dune.at + nudge) * period;
      // Margin covers the widest a cactus can reach from its trunk, so one
      // never blinks into existence at the frame edge either.
      if (x < -70 || x > W + 70) continue;
      const h = Math.max(12, dune.h * amp * CACTUS_OF_DUNE);
      const flip = parity ? 1 : -1;
      // The crest under this cactus, sampled from the same function the tile
      // was cut from — see ridgeProfile — so it cannot drift as the stage
      // scrolls. BURIED a third of its height, not balanced on top: a
      // silhouette whose base exactly meets the ridge always leaves a hairline
      // of sky where the two curves disagree, and the eye reads that hairline
      // as "in front of" rather than "on".
      const crest = ridgeYAt(x, camX, GROUND_Y, amp, wl, factor, { dunes: true });
      // Buried nearly HALF its height, up from a third. The base is drawn over
      // the hill's own body, so the deeper it sits the more the plant reads as
      // emerging from the ground rather than resting on the line of it — and
      // a shallow ridge curves away slowly enough that a deep base still sits
      // under the summit rather than out on the face.
      const y = crest + h * 0.46;
      const wdt = Math.max(3, h * 0.19);
      ctx.lineWidth = wdt;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - h + wdt * 0.5);
      ctx.stroke();
      // Out, then up, in one sweep. The control point is the corner an earlier
      // version drew literally — as rectangles it met the trunk at a right
      // angle and the whole thing read as a drawn 4. As a quadratic the corner
      // becomes the bend a saguaro actually grows.
      const arm = (dir, atFrac, reach, rise) => {
        const ay = y - h * atFrac;
        ctx.lineWidth = wdt * 0.82;
        ctx.beginPath();
        ctx.moveTo(x, ay);
        ctx.quadraticCurveTo(x + dir * reach, ay, x + dir * reach, ay - rise);
        ctx.stroke();
      };
      arm(-flip, 0.56, h * 0.28, h * 0.42);
      if (spec.arms > 1) arm(flip, 0.38, h * 0.24, h * 0.34);
    }
  }
  ctx.restore();
}

// Dust devils: thin ochre columns wandering the middle distance.
//
// Peter asked about tornadoes and these are the desert version of that idea,
// deliberately. A tornado implies a STORM — dark base, heavy sky, something
// arriving — and this cabinet is a clear orange sunset that would be arguing
// with it. It also implies threat, which is the trap the vultures had: anything
// that looks like weather coming for you is something the player expects to
// matter. A dust devil is the opposite on both counts. It is small, dry,
// harmless, and it is what actually happens on a hot flat afternoon.
//
// Ochre, never grey — grey is storm colour and would punch a hole in the
// palette the same way a black bird would.
//
// They live on the MIDDLE range's parallax and are drawn behind the near ridge,
// so they can never be mistaken for something standing in the lane.
// Tall enough to CLEAR the near ridge, which is the whole trick. The foot
// stands on the middle distance and is hidden behind the near dunes — correct,
// and what puts them out on the plain rather than in the lane — so everything
// the player actually sees is the upper column. Cut at the height they were
// first drawn (54) the entire devil sat below the near crest and the effect was
// invisible on every frame.
const DUST_DEVILS = [
  // `lean` roughly halved. At 0.16 over a 172px column the top ended up some
  // 27px downwind of the foot, and a pale streak at that angle stops reading as
  // a column of dust and starts reading as a shaft of light. Near-upright with
  // just enough tilt to say the air is moving.
  { x: 90, h: 172, w: 12, rate: 0.55, drift: 5.5, plx: 0.19, lean: 0.08, alpha: 0.72 },
  { x: 760, h: 132, w: 9, rate: 0.8, drift: 3.5, plx: 0.15, lean: -0.1, alpha: 0.6 },
];

function drawDustDevils(ctx, t, camX, reduced) {
  // A wrap span far wider than the screen, so most of the time you are looking
  // at one devil or none. At W + 220 both were on screen almost always, which
  // turned a thing you notice into weather — and a plain with a dust devil on
  // it every few seconds is not a still afternoon.
  const span = W * 4;
  ctx.save();
  // LIGHTER than the country behind it. The first cut used #c99a63, which is
  // within a few points of the middle range's own #c0884c — a dust column the
  // same value as the hills it stands on is invisible however well it is
  // shaped. Dust catches the light; it reads pale against the ground and only
  // gets subtle where it thins out against the bright sky, which is exactly
  // where it should be disappearing anyway.
  ctx.fillStyle = '#e9c894';
  for (const d of DUST_DEVILS) {
    // Its OWN drift on top of the parallax, so it crosses the plain even when
    // the camera is still — the cloud flock's trick. Frozen under reduced
    // motion rather than removed: the column is still a thing standing there.
    const wander = reduced ? 0 : t * d.drift;
    const x = ((d.x - camX * d.plx * PLX - wander) % span + span) % span - 110;
    if (x < -60 || x > W + 60) continue;
    // Base sits on the middle range's ground line, not on the frame's — a
    // column whose foot floats above the country is a smudge on the glass.
    const base = GROUND_Y - 4;
    // A STACK OF PUFFS, not a polygon. The first cut drew the funnel as one
    // filled path and it read as a flat translucent slab leaning over the
    // hills — hard edges, one flat alpha, and a taper too gradual to be a
    // funnel at all. Dust has no outline. Overlapping ellipses that widen and
    // thin out as they rise give the soft edge and the density falloff for
    // free, which between them are most of what says "dust" rather than
    // "shape".
    // Dense enough that consecutive puffs OVERLAP everywhere. At 16 the
    // spacing exceeded the radius down at the foot, where the column is
    // narrowest, and the whole thing read as a string of beads rather than as
    // dust. Per-puff alpha comes down as the count goes up so the accumulated
    // density stays where it was.
    const N = 34;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      // The lean grows with the square of the height, so the column bends
      // rather than tilting — and the waver is what says air instead of
      // object. A dust devil that held its shape would be a traffic cone.
      const wob = reduced ? 0 : Math.sin(t * d.rate * 1.7 + u * 4.2 + d.x) * u * 3.4;
      const cx = x + d.lean * d.h * u * u + wob;
      const cy = base - d.h * u;
      const r = d.w * (0.44 + u * 0.9);
      // Thinning out toward the top, where it is losing its grip on the dust.
      ctx.globalAlpha = d.alpha * (1 - u * 0.72) * 0.34;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, TAU_BG);
      ctx.fill();
    }
    // No scuff at the foot any more. It was drawn when these sat in front of
    // the middle range and their feet showed; behind it the foot is buried, and
    // a scuff would be a smear of dust hanging on the hillside with nothing
    // under it.
  }
  ctx.restore();
}

// A landmark pinned to a WORLD position, the way the plumber cabinet's volcano
// is. It parallaxes slower than the far ridge (0.09 against 0.12) so it drifts
// behind it and reads as genuinely distant rather than as another hill.
//
// The point of a landmark is not decoration: it is that the run acquires a
// destination. A stage with one thing on the horizon that slowly gets closer is
// a journey; a stage with a repeating ridge is a treadmill.
function drawButte(ctx, camX, atCam) {
  const cx = W / 2 + (atCam - camX) * 0.09 * PLX;
  const halfW = 74;
  if (cx + halfW + 70 < -40 || cx - halfW > W + 40) return;
  const baseY = GROUND_Y - 4;
  // Raised with the ranges. The landmark only works if it stands clearly over
  // the far mesas, and at the old 96 it was level with them once they went up.
  const capY = baseY - 128;
  ctx.save();
  ctx.translate(cx, 0);
  // Talus slope out to a flat cap: steep sides, dead-flat top, the same
  // silhouette logic as the mesa ridge at a size that can carry strata.
  const body = (c) => {
    c.beginPath();
    c.moveTo(-halfW, baseY);
    c.lineTo(-halfW * 0.62, capY + 14);
    c.lineTo(-halfW * 0.52, capY);
    c.lineTo(halfW * 0.5, capY);
    c.lineTo(halfW * 0.6, capY + 12);
    c.lineTo(halfW, baseY);
    c.closePath();
  };
  // The smaller sibling goes down FIRST and to the left, so the main butte
  // overlaps it. One butte on an empty horizon reads as a prop; two at
  // different distances read as country.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = DESERT_ROCK_DARK;
  ctx.beginPath();
  ctx.moveTo(-halfW - 66, baseY);
  ctx.lineTo(-halfW - 44, capY + 52);
  ctx.lineTo(-halfW - 12, capY + 52);
  ctx.lineTo(-halfW - 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  body(ctx);
  ctx.fillStyle = DESERT_ROCK;
  ctx.fill();
  // Strata, clipped to the silhouette so the bands stop at the cut faces
  // rather than running out into the sky.
  ctx.save();
  body(ctx);
  ctx.clip();
  for (const [y, h, col] of [
    [capY, 7, DESERT_ROCK_LIT], [capY + 22, 5, DESERT_ROCK_DARK],
    [capY + 44, 9, DESERT_ROCK_DARK], [capY + 68, 6, DESERT_ROCK_LIT],
  ]) {
    ctx.fillStyle = col;
    ctx.fillRect(-halfW, y, halfW * 2, h);
  }
  ctx.restore();
  ctx.restore();
}

// Heat haze at the horizon lived here and has been cut. It was auditioned on
// its own, where it read as heat, and it survived one round at reduced
// strength — but with three hill ranges under it the softest version that did
// anything was still the first thing your eye went to, and a background whose
// most noticeable element is a wash over the horizon is a background arguing
// with the road. The depth it was faking is now done properly by the middle
// range instead.

// ---------------------------------------------------------------------------
function pixelPack(settings) {
  return {
    name: 'pixel',
    bg(ctx, t, camX, cab, totalDist) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      if (cab.id === 'plumber') {
        drawStaticSun(ctx, t);
      }
      // PLUMBER PANIC's far layer is a snow-capped range; the near green hills
      // stay rounded so the two layers read as distance, not repetition. It gets
      // extra amplitude because the near layer eats the bottom third of it —
      // at the shared amp of 60 the caps barely cleared the green.
      // The volcano goes down BEFORE the far range, so those crests overlap its
      // flanks and it reads as standing behind them.
      // Overtime runs have no midpoint (totalDist is Infinity), so no volcano.
      if (cab.id === 'plumber' && Number.isFinite(totalDist) && totalDist > 0) {
        drawVolcano(ctx, t, camX, totalDist * 0.5, settings && settings.reducedMotion);
      }
      // Clouds go down AFTER the volcano so they drift in front of its smoke —
      // the plume is far-off background, the clouds are nearer sky. Still before
      // the hill layers, so the ranges keep occluding them as they always did.
      if (cab.id === 'plumber') {
        // Faceless cousins of the cloud pal: identical silhouette so the sky
        // reads as one weather system, parallax-scrolled at varied sizes —
        // a few bigger than the pal, a few small and distant. Greys mixed in
        // so the flock isn't a stamp sheet. Drawn BEFORE the pal so it always
        // floats in front of its plain cousins.
        for (const [off, cy, s, tint] of [
          [30, 34, 0.8, '#f8f8ff'],
          [110, 20, 1.15, '#f8f8ff'],
          [180, 68, 0.55, '#c9cfda'],
          [255, 44, 0.95, '#dde1ea'],
          [305, 26, 0.65, '#f8f8ff'],
          [390, 78, 1.1, '#f8f8ff'],
          [430, 58, 0.7, '#dde1ea'],
          [510, 36, 0.6, '#c9cfda'],
        ]) {
          const span = W + 130;
          const cx = ((off - camX * 0.2 * PLX - t * 4) % span + span) % span - 65;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(s, s);
          drawCloudBody(ctx, tint);
          ctx.restore();
        }
        drawCloudPal(ctx, t, settings && settings.reducedMotion);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 5; i++) {
          const cx = ((i * 137 - camX * 0.2 * PLX) % (W + 60)) - 30;
          const cy = 30 + (i * 37) % 60;
          ctx.fillRect(cx, cy, 34, 8);
          ctx.fillRect(cx + 6, cy - 5, 20, 5);
        }
      }
      if (cab.id === 'plumber') {
        // Rock and snow are haze-desaturated toward the sky rather than true
        // brown/white: distance reads better, and it keeps the cap under the
        // bloom bright-pass. Pure white snow (#eef6ff, luma .96) sailed past
        // the smoothstep(0.8, 0.97) cutoff in glfx.js and glowed like neon.
        parallaxHills(ctx, camX, cab.far, GROUND_Y, 96, 90, 0.15,
          { peak: true, rock: '#5e6e7c', snow: '#b9c8d8' });
      } else {
        parallaxHills(ctx, camX, cab.far, GROUND_Y, 60, 90, 0.15);
      }
      parallaxHills(ctx, camX, cab.hills, GROUND_Y, 34, 50, 0.35,
        cab.id === 'plumber' ? { trees: { leaf: '#3c8c4c', trunk: '#6b4a30' } } : null);
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0) {
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark, overhangs, t);
      // Scrolling ground ticks — a texture ON the apron, so they stop where the
      // apron does. Left to run they hang in open air: under a road that has a
      // chamber below it, and — until now — straight across every hole in the
      // floor, where a row of dashes marching over the void was the one mark on
      // screen insisting there was still ground there.
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      const skip = (overhangs || []).map((sp) => [sp.x - camX, sp.x + sp.w - camX]);
      const solid = solidRuns(camX, obstacles);
      for (let x = -(camX % 24); x < W; x += 24) {
        if (skip.some(([a, b]) => x + 10 > a && x < b)) continue;
        // Whole ticks only. Clipping one to a lip would leave a two-pixel stub
        // hanging off the edge, which reads as debris rather than as texture.
        if (!solid.some(([a, b]) => x >= a && x + 10 <= b)) continue;
        ctx.fillRect(x, GROUND_Y + 8, 10, 2);
      }
    },
    post() {},
  };
}

function faux3dPack(settings) {
  return {
    name: 'faux3d',
    bg(ctx, t, camX, cab, totalDist) {
      // Read through at draw time rather than captured when the pack is built,
      // so a mid-session toggle takes effect — the pixelPack idiom, not
      // cardboardPack's.
      const reduced = !!(settings && settings.reducedMotion);
      // SPEED ZONE only. faux3d also renders in THE SURGE's cycle, the hub
      // cabinet screens, the gallery and the social renderers, and none of
      // those are the desert.
      const desert = cab.id === 'speed';
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      // chunky "pre-rendered" sun with gradient shading
      const g = ctx.createRadialGradient(380, 60, 6, 380, 60, 30);
      g.addColorStop(0, '#fff0c0'); g.addColorStop(1, 'rgba(248,192,96,0)');
      ctx.fillStyle = g; ctx.fillRect(340, 20, 80, 80);
      // Draw order is depth order. The butte goes down BEFORE the far range so
      // those crests overlap its flanks and it sits behind them — the same
      // reason the volcano precedes plumber's hills. Overtime has no midpoint
      // (totalDist is Infinity), so it gets no landmark, exactly as plumber
      // gets no volcano there.
      if (desert && Number.isFinite(totalDist) && totalDist > 0) {
        drawButte(ctx, camX, totalDist * 0.55);
      }
      // Mesas rather than rounded sine hills on the desert: a cut-off cap is
      // the one silhouette that can only be desert.
      parallaxHills(ctx, camX, cab.far, GROUND_Y,
        desert ? DESERT_FAR.amp : 50, desert ? DESERT_FAR.wl : 110,
        desert ? DESERT_FAR.factor : 0.12,
        desert ? { mesa: true } : null);
      // Birds after the far range and before the near one: they fly in front
      // of the distance and behind anything close.
      if (desert) drawVultures(ctx, t, camX, reduced);
      if (desert) {
        // The middle range — the layer that makes the other two read as far
        // and near rather than as backdrop and foreground.
        // Dust devils go BEHIND the middle range, not in front of it. Drawn
        // after it, their feet stood on the frame's ground line and you could
        // see the bottom of a column that is supposed to be miles away — which
        // is exactly what gives a distant object away as a sticker. Behind, the
        // middle hills cut the foot off and each devil rises out of the country
        // rather than standing on top of it. The base still sits at the ground
        // line; it is simply never visible, which is the point.
        drawDustDevils(ctx, t, camX, reduced);
        const m = DESERT_MID;
        parallaxHills(ctx, camX, m.color, GROUND_Y, m.amp, m.wl, m.factor, { dunes: true });
        // The layer the cabinet always defined and this pack never drew.
        const { amp, wl, factor } = DESERT_RIDGE;
        parallaxHills(ctx, camX, cab.hills, GROUND_Y, amp, wl, factor, { dunes: true });
        drawSaguaros(ctx, camX);
      }
      // loop-de-loop background props
      ctx.strokeStyle = 'rgba(160,104,48,0.5)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 2; i++) {
        const lx = ((i * 340 - camX * 0.3 * PLX) % (W + 160)) - 80;
        ctx.beginPath(); ctx.arc(lx, GROUND_Y - 40, 28, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.lineWidth = 1;
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0) {
      // pseudo-3D checkered road
      // A HOLE IS DRAWN BY NOT DRAWING, here as everywhere else. This pack used
      // to lay the whole checkered road and then punch `#08060c` down every gap
      // in it — a colour belonging to nothing else on screen, and a lie besides:
      // looking down a hole should show you what is under it. So the road is
      // clipped to the solid runs instead, and what shows through the break is
      // the sky and the mesas the background painter already put there.
      const runs = solidRuns(camX, obstacles);
      for (const [ra, rb] of runs) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ra, GROUND_Y, rb - ra, H - GROUND_Y);
        ctx.clip();
        ctx.fillStyle = cab.groundDark;
        ctx.fillRect(ra, GROUND_Y, rb - ra, H - GROUND_Y);
        for (let row = 0; row < 5; row++) {
          const y = GROUND_Y + row * 8;
          const size = 16 + row * 8;
          const off = (camX * (1 + row * 0.25)) % (size * 2);
          for (let x = -off; x < W; x += size * 2) {
            ctx.fillStyle = row % 2 === 0 ? cab.ground : cab.groundDark;
            ctx.fillRect(x, y, size, 8);
          }
        }
        // The lane's yellow edge stops at the lip with everything else. Run
        // across the break it is a tightrope drawn over a hole.
        ctx.fillStyle = '#f6d33c';
        ctx.fillRect(ra, GROUND_Y, rb - ra, 2);
        ctx.restore();
      }
      drawPitFills(ctx, camX, cab, obstacles, t);
    },
    post(ctx, t) {
      // soft vertical sheen, very "rendered in 1994"
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(255,255,255,0.05)');
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // fake drop shadow = instant pre-rendered look. Not on the boost pad:
      // that one is a trench cut into the floor, and a bar of shadow under it
      // puts it back in FRONT of the ground, which is the whole thing the
      // sunken art is trying not to do.
      if (e.def && !e.def.isBoost && (e.def.ground || e.alt < 20)) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 2, GROUND_Y + 2, e.w, 3);
      }
    },
  };
}

function neonPack(settings) {
  return {
    name: 'neon',
    dark: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      // starfield
      ctx.fillStyle = '#8888c8';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 - camX * 0.05 * PLX) % W;
        const sy = (i * 61) % (GROUND_Y - 60);
        ctx.fillRect(Math.round(sx < 0 ? sx + W : sx), sy, 1, 1);
      }
      // wireframe skyline
      ctx.strokeStyle = '#e838f8';
      for (let i = 0; i < 8; i++) {
        const bx = ((i * 90 - camX * 0.25 * PLX) % (W + 100)) - 50;
        const bh = 40 + (i * 53) % 70;
        ctx.strokeRect(Math.round(bx) + 0.5, GROUND_Y - bh + 0.5, 36, bh);
        ctx.strokeStyle = i % 2 ? '#38d8f8' : '#e838f8';
      }
      // horizon grid
      ctx.strokeStyle = 'rgba(56,216,248,0.4)';
      for (let i = 0; i < 6; i++) {
        const y = GROUND_Y - 4 - i * 3;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    },
    ground(ctx, camX, cab, obstacles) {
      ctx.fillStyle = '#0c0c20';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.strokeStyle = '#38d8f8';
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 0.5); ctx.lineTo(W, GROUND_Y + 0.5); ctx.stroke();
      for (let x = -(camX % 40); x < W; x += 40) {
        ctx.strokeStyle = 'rgba(56,216,248,0.35)';
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x - 20, H); ctx.stroke();
      }
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          ctx.fillStyle = '#000';
          ctx.fillRect(ob.x - camX, GROUND_Y, ob.w, H - GROUND_Y);
        }
      }
    },
    post(ctx, t) {
      ctx.fillStyle = 'rgba(56,16,88,0.1)';
      ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // Additive bloom around the art rather than a rectangle around the
      // hitbox — round props stay round, and the light still reads as neon.
      const color = e.kind === 'pickup' ? 'rgba(246,211,60,0.5)' : 'rgba(232,56,248,0.45)';
      const r = Math.max(e.w, e.h) * 0.85 + 5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(glowSprite(color, r), x + e.w / 2 - r, y + e.h / 2 - r, r * 2, r * 2);
      ctx.restore();
    },
  };
}

function watercolorPack(settings) {
  return {
    name: 'watercolor',
    lightBg: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      // soft wash blobs
      for (let i = 0; i < 6; i++) {
        const bx = ((i * 120 - camX * 0.1 * PLX) % (W + 120)) - 60;
        const by = 30 + (i * 47) % 80;
        const g = ctx.createRadialGradient(bx, by, 4, bx, by, 40);
        g.addColorStop(0, 'rgba(255,255,255,0.25)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(bx - 40, by - 40, 80, 80);
      }
      // blotchy hills with irregular edges
      for (const [color, yb, amp, wl, f] of [[cab.far, GROUND_Y, 66, 130, 0.12], [cab.hills, GROUND_Y, 40, 70, 0.3]]) {
        ctx.globalAlpha = 0.7;
        parallaxHills(ctx, camX, color, yb, amp, wl, f);
        ctx.globalAlpha = 0.4;
        parallaxHills(ctx, camX + 13, color, yb + 4, amp, wl * 1.1, f);
        ctx.globalAlpha = 1;
      }
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0) {
      ctx.globalAlpha = 0.85;
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark, overhangs, t);
      ctx.globalAlpha = 1;
    },
    post(ctx, t) {
      // paper grain: sparse dot lattice (tiled pattern — one fill)
      patternFill(ctx, 'paperGrain', 6, 8, (c) => {
        c.fillStyle = 'rgba(120,100,80,0.06)';
        c.fillRect(0, 0, 1, 1);
        c.fillRect(2, 4, 1, 1);
      });
      ctx.fillStyle = 'rgba(255,250,240,0.05)';
      ctx.fillRect(0, 0, W, H);
    },
  };
}

function vhsPack(settings) {
  const reduced = settings && settings.reducedFlashing;
  return {
    name: 'vhs',
    dark: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      parallaxHills(ctx, camX, cab.far, GROUND_Y, 55, 100, 0.15);
      parallaxHills(ctx, camX, cab.hills, GROUND_Y, 32, 56, 0.35);
      // fog
      ctx.fillStyle = 'rgba(140,120,160,0.12)';
      ctx.fillRect(0, GROUND_Y - 40, W, 40);
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0) {
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark, overhangs, t);
    },
    post(ctx, t) {
      // scanlines (tiled pattern — one fill)
      patternFill(ctx, 'vhsScan', 1, 3, (c) => {
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(0, 0, 1, 1);
      });
      // chroma edges
      ctx.fillStyle = 'rgba(255,0,80,0.05)';
      ctx.fillRect(1, 0, W, H);
      ctx.fillStyle = 'rgba(0,255,240,0.05)';
      ctx.fillRect(-1, 0, W, H);
      // tracking wobble band (disabled under reduced flashing)
      if (!reduced) {
        const y = (t * 40) % (H + 30) - 15;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, y, W, 8);
      }
      ctx.fillStyle = '#e8e8f0';
      ctx.fillRect(W - 46, H - 14, 4, 6); // "PLAY ▶" glyph-ish
      ctx.beginPath();
      ctx.moveTo(W - 38, H - 14); ctx.lineTo(W - 38, H - 8); ctx.lineTo(W - 32, H - 11);
      ctx.closePath(); ctx.fill();
    },
  };
}

// Game Boy Color as remembered rather than photographed: a reflective
// yellow-green screen, dark blue-green linework and a tiny handful of crude
// spot colours. The art stays vector-authored and finely described; the
// limitation is the palette, not the geometry.
// HOW THICK THE ROAD'S EDGE IS, in WORLD px — and thinner than every other
// pack's, on purpose.
//
// Eight packs cap their apron with 3px of their own ground colour, and on those
// it is a lit surface: near in value to the body under it, so it reads as a
// highlight along the lip. This one is INK on a pale panel — the hardest edge
// on the screen — and at the same 3 it stopped being an edge and became a bar.
//
// The number is bigger here than it looks, because the road is drawn INSIDE the
// world transform and the camera multiplies it. At the resting ZOOM of 2, 3px is
// 6 backbuffer px; on a phone, where the zoom tier goes higher, nearer 7 — a
// quarter of the 24px hero standing on it. At 1 the contrast still carries it at
// every zoom, which is the whole reason this pack can afford to go thinner than
// the others: none of them could.
export const LCD_ROAD_INK = 1;

const LCD_PANEL = '#a8c66c';
const LCD_INK = '#26355d';
// The screen colour as it reaches the lane. A hole clearing its own mouth has
// to restore this exact value or the break reads as a lit strip.
const LCD_PANEL_LIT = '#dce49a';

// THREE SCENES, not one city with its gain turned up. These are the authored
// backdrops for RHYTHM BANKRUPTCY's three stages; only the cells inside and
// above them switch. Coordinates are screen-space because this cabinet keeps
// its skyline fixed to the display while the lane runs underneath it.
// EVERY HEIGHT IN THIS TABLE WENT UP 8 WHEN GROUND_Y CAME DOWN 8, and that is
// the rule rather than a coincidence to be tidied away. A roof is
// `GROUND_Y - h`, so raising both by the same number leaves every roof on the
// exact screen y it was authored at — the gorilla, his barrel, the plane's lane
// under the beat ribbon, the clock bay, the masts the crossing is measured
// against: the whole pinned stack above the skyline comes out byte-identical.
// What changed is the BOTTOM. The eight pixels the camera took off the apron
// went into the FACADES, so the city stands eight deeper into the frame instead
// of the road's dirt doing nothing with them, which is the entire reason the
// groundline moved at all. Move GROUND_Y again and these move with it, or the
// skyline slides down the panel and takes every authored contact above it.
const LCD_CITY_SCENES = [
  null,
  {
    // Reading order, left to right: the clock tower opens the scene, three
    // buildings walk up to the invader billboard, THEN the DONKEY KONG tower,
    // and the skyline continues past it.
    //
    // 114 TALL, AND THE CRASH STILL SETS IT — but it is no longer a ceiling.
    // Everything above this roof is one rigid stack: his skull tops out at
    // roof-42, the barrel rests on his raised hands at roof-43 and reaches
    // roof-57. While the plane's lane was pinned hard under the beat ribbon's
    // band the contact depth was simply 119 - roof, so every pixel of tower
    // drove the aircraft further down the barrel and closer to his scalp: at
    // 118 the barrel's top was ON the ribbon line and the belly passed two
    // pixels off his hair, which read as landing on the gorilla, and 110 (118
    // in today's numbers, after GROUND_Y) was as tall as he could stand.
    //
    // THE THINNER RIBBON ENDED THAT ARGUMENT, and the stack is now solved the
    // other way round. The band ends well short of 49 now, so the lane is off
    // the ceiling and the tower can come DOWN instead: four off the building,
    // four off the striking crossing with it (plane.to 51 -> 55), and the
    // contact is the same picture it always was — barrel top 61, plane belly
    // 68, through the top of the barrel. What those four pixels buy is
    // daylight for the crossings that MISS, which fly their own lane now and
    // clear his skull by eighteen instead of eight. See LCD_PLANE_MISS_LIFT.
    // He still tops the skyline; it is the roof that moved, not him.
    // EIGHT structures, evenly spaced (~12px of air between neighbours and at
    // both edges), and the DONKEY KONG tower is the fifth: clock, chart,
    // transmitter, invader, TOWER, the smoke stacks, burger, cassette.
    // THE SIXTH ROOF CARRIES THE CHIMNEY AND NOTHING ELSE. It used to be a
    // water tower with the stack bolted on beside it, which put two unrelated
    // silhouettes — a capped drum on legs and a smoking chimney — on one 46px
    // roof, and the smoke came out of the middle of the pair. `office` is the
    // plain banded facade with no crown of its own, so the stack is the only
    // thing standing up there and the plume plainly belongs to it.
    buildings: [
      [12, 42, 148, 'clockworks'], [66, 36, 76, 'storefront'], [114, 48, 124, 'deco'],
      [174, 38, 96, 'fire-escape'],
      [324, 46, 112, 'office'], [382, 36, 74, 'storefront'], [431, 34, 88, 'workshop'],
    ],
    clouds: [[28, 52], [184, 42], [346, 58]],
    // THE CLOCK IS THE BUILDING. [building index, dial radius] — the dial is
    // SET INTO the tower's own facade, in a clock stage with a lintel over it
    // and a sill under it, not stood on the roof on braced feet.
    //
    // Which is why the spec stopped being screen-space. A rooftop case had to
    // name its own y and then be kept in step with a roof it merely rested on,
    // and every change to the tower's height was two edits that had to agree.
    // The stage is a course of the shaft now, so it is solved from the building
    // (see lcdClockBay) and there is nothing left to drift.
    //
    // AND THE TOWER GREW INTO THE ROOM THAT FREED UP — twice over, because the
    // case was costing sky at both ends. It stood 8px above the roof, and it
    // was also the thing the plane's ENTRY altitude was set to duck under: 101
    // -> 140, with `plane.from` lifted 78 -> 68 to match, which is the one
    // number that was only ever low because something stood on this roof.
    // The binding case is the plane's first two steps, still climbing over this
    // end of the skyline; at 140 its belly clears the tower's crown blocks by
    // five and everything downstream of that by more. Nothing else moved — the
    // lane still levels at 55 and tops out at 56, well under the beat ribbon's
    // band, and the gorilla still tops the skyline at y 76.
    clock: [0, 16],
    // The DONKEY KONG tower: open girder floors zigzagging down its whole
    // face, the big rooftop gorilla on top and a little runner two floors
    // below him. [x, w, h]. The gorilla lives HERE now, so this scene sets no
    // rooftopGorilla of its own.
    gameWatch: [224, 88, 114],
    // Beat-stepped rooftop furniture: pixel billboards on the buildings at
    // these indices, a transmitter mast whose signal rings walk outward a
    // step per beat, chimneys whose puff columns live on the beat, and a
    // pixel plane that crosses the sky once every sixteen bars. Billboards
    // and the mast suppress their building's own crown; a chimney shares its
    // roof with whatever crown is already there.
    // THE SHARE PRICE SITS SECOND FROM THE LEFT, not last. The hero runs at
    // screen x 56, so the board that answers to the run belongs on the roof
    // he is under — out at 431 it was the one sign nobody reading the lane
    // ever looked at. The cassette takes the far roof instead: it is authored,
    // it says nothing about the run, and the far edge is where it can say it.
    //
    // AND THE SHOP UNDER IT SITS BELOW THE CLOCK. The clock tower opens the
    // scene and the share price answers the run; level with each other they
    // read as a pair of equal signs rather than a landmark and a readout. The
    // shop's height is therefore solved against the dial and not chosen: at 68
    // the board's top edge is y 124 and the dial's bottom is 121, so the clock
    // finishes three pixels before the billboard starts and the eye takes them
    // in that order. Raising the tower is what buys the shop its height back —
    // every pixel of clock is a pixel this roof can have.
    billboards: [[1, 'chart'], [3, 'invader'], [5, 'burger'], [6, 'cassette']],
    transmitter: 2,
    // dx 20, not 6: with the water tower gone the stack bank owns this roof, so
    // it stands on its middle and the plume leans off its own building rather
    // than immediately out over the gap beside it. The dx is the TALL stack's
    // left edge; the two short ones are placed either side of it.
    smokestacks: [[4, 20]],
    // In low at 78 over the left-hand roofs — which now clear the clock case
    // by 5px and the near billboards by a good 40 — level at 55 by the
    // tower's centre line (224 + 88/2). Snapped to the 2px grid that is y 56,
    // so the belly runs at 68: through the top of the raised barrel (top 61)
    // and eight clear of the gorilla's skull (top 76).
    //
    // THAT IS THE LANE OF THE CROSSING THAT HITS THE BARREL. The two that miss
    // it fly ten higher — belly 58, eighteen over his skull — and the gorilla
    // came down four to pay for it. See LCD_PLANE_MISS_LIFT.
    // ...AND IT ALWAYS TOWS SOMETHING. A banner plane with a blank banner is
    // the one prop on this skyline that is drawn and says nothing — it used to
    // trail a single unlettered pixel, which reads as a flag nobody finished.
    //
    // `tow` is the rotation, one line per crossing, so the sky is a different
    // sentence every sixteen bars rather than the same advert on a timer. Short
    // and long on purpose: a two-letter banner and an eleven-letter one are
    // different SHAPES at a distance, which is what stops the rotation reading
    // as one prop with the text swapped.
    //
    // `banner` is the one pass that carries something else — the KEY CHANGE
    // announcement, in front of the modulation at bar 61 (the +4 the whole band
    // takes in rhythm.js's arrangement and keeps to the end of the form). One
    // authored bar, because that arrangement moves its transpose eight times
    // and only this one is the modulation — the rest are two-bar lifts.
    // tests/lcd-background.js checks the bar names a real one.
    plane: {
      from: 68, to: 55, level: 268,
      tow: ['INSERT COIN', 'GG', '♥♥♥'],
      banner: { text: 'KEY CHANGE', bar: 61 },
    },
  },
  {
    // EIGHT structures with even air, like the other two scenes.
    buildings: [
      [16, 42, 64, 'speaker'], [74, 36, 136, 'deco'], [126, 48, 80, 'music-hall'],
      [190, 38, 156, 'spire'], [244, 52, 58, 'speaker'], [312, 40, 146, 'deco'],
      [368, 46, 74, 'music-hall'], [430, 36, 150, 'spire'],
    ],
    clouds: [[22, 54], [236, 44], [396, 62]],
    // Stage 2 was the one panel with no sky or rooftop life at all — windows,
    // equalizers and clouds and nothing else. It gets the working city: a
    // searchlight sweeping off the music hall, a commuter train on a viaduct
    // behind the skyline, a window washer who is having a day, and the
    // repossession helicopter that arrives in the second half and leaves with
    // whatever it can lift.
    // NO PLANE ON THIS PANEL. It used to tow a line through y 62-74, which is
    // the same band the viaduct's service runs in and the band both billboards
    // hang their boards over — three things crossing one lane, and the sky read
    // as traffic rather than as a city. Stage 2 is the panel with the most
    // going on at roof height already: a searchlight, a train, a washer and the
    // chopper. The crossing belongs to stages 1 and 3, which have the air for
    // it; here the train IS the thing that crosses.
    searchlight: [2, 24],
    // THE LANE, and the four pixels matter. At 62 the girder landed exactly on
    // building 3's roof (76) — a horizontal line tangent to a roof edge, which
    // reads as a mistake — and the cars sat in the plane's own band. At 66 the
    // girder (78) passes BEHIND building 3 and clears building 5's roof cap by
    // six, so the rail visibly goes behind the tallest tower and the two
    // billboards keep their air. `fromPhase` gates the SERVICE only; the
    // viaduct itself is baked in with the facades and stands from beat one.
    train: { y: 66, cars: 4, fromPhase: 1 },
    washer: [5, 20],
    chopper: { fromPhase: 2, takes: 0 },
    // Same swap as stage 1, for the same reason: the chart near the hero,
    // the cassette out at the edge.
    // The far roof runs the maze game's attract screen — see lcdChaseGrid. It
    // took the cassette's berth: a cassette is a still life, and this end of
    // the skyline is the one that had nothing moving on it.
    billboards: [[1, 'chart'], [7, 'chase']],
  },
  {
    // EIGHT structures with even air between them, like stage 1. The
    // gorilla's deco is capped at 118 so the crossing clears his raised barrel
    // rather than being eclipsed by it (see `plane` below), and his thrown
    // barrels fall down a ghosted chute beside his building (barrelDrop).
    //
    // HE STANDS ON SIX NOW, NOT FOUR, and the swap is the lane's doing rather
    // than the skyline's. The barrels he drops are real hazards on this stage:
    // one comes down the chute, reaches the street and then comes FORWARD out
    // of the backdrop into the road, and the road it has to cross to get there
    // is the whole of the effect. From building 4 the chute stood at screen
    // 292, which is barely two beats of travel from the hero and gave the
    // barrel no room to arrive from anywhere — it simply appeared beside him.
    // Building 6 puts the chute at 408, a dozen pixels from where a lane
    // barrel first crosses into frame, so the thing that lands at the foot of
    // the chute and the thing that rolls at you are in the same place at the
    // same moment and read as one object.
    //
    // Only the height and the style move; the x/w grid and its even air are
    // untouched. Four takes six's relay-126 (its mast still tops out at 79,
    // the number the plane's lane is measured against) and six takes the
    // gorilla's capped deco.
    buildings: [
      [19, 34, 66, 'ducts'], [72, 42, 116, 'relay'], [133, 34, 52, 'workshop'],
      [186, 46, 126, 'industrial'], [251, 32, 134, 'relay'], [302, 44, 70, 'ducts'],
      [365, 34, 118, 'deco'], [418, 42, 76, 'industrial'],
    ],
    clouds: [[18, 46], [264, 52], [398, 40]],
    // THE HIGH LANE, AND ON THIS PANEL IT CLEARS HIM. Stage 1 owns the gag
    // where the plane flies into the barrel; stage 3 has no barrel to take, so
    // its crossing has to read as a plain miss — and it did not. Levelling at
    // 54 put the belly at 66 against a skull topping out at 58, so the aircraft
    // went behind his face for four beats, disappeared whole for one, and came
    // back out through his raised arm. Drawn-behind is not the same as missed:
    // he is opaque and he is drawn after the plane, so all the eclipse bought
    // was a clean edge on a picture of a collision.
    //
    // So the lane goes up and the tower comes down, and it takes both. Up:
    // BEAT_RIBBON_BOTTOM is 40 and the plane is twelve, so 42 is as high as the
    // sky goes — belly 54, two clear of the strip. Down: the crossing also has
    // to clear the BARREL, which he raises once a bar to roof-57, and no
    // altitude under the ribbon missed that at the old height. Six is the
    // slowest number here: banner bottom 54 (the rig is 11 tall and hangs from
    // the fuselage), barrel top must sit under it, so roof >= 112 and the
    // building is 118 rather than 132.
    //
    // What that leaves, with his roof at 114: eighteen pixels over his skull
    // (72) — the same daylight stage 1's missing crossings fly with — twenty
    // five over the tallest mast the lane clears (building 4's relay, top 79),
    // and three between the towed banner and the raised barrel on the one beat
    // of the bar they share a column. He is fourteen shorter and still the
    // tallest thing on this skyline by seven.
    plane: { from: 66, to: 42, level: 200, tow: ['HIGH SCORE', 'ONE MORE GO', 'PRESS START'] },
    // THE SHARE PRICE FOLLOWS THE PLAYER INTO THE LAST STAGE. Stages 1 and 2
    // both hang the chart on their second building, over the roof the hero at
    // screen x 56 is actually under, and stage 3 was the one panel that lost
    // it — so the board that answers to the run went dark exactly where the
    // run gets hard, and the cheer thumb had nowhere to appear. Same berth as
    // the other two: building 1, roof 116, so the board's top lands at 84.
    // The crossing is still climbing over this column — belly 58 — and the beat
    // ribbon's band ends at 40, so it slots under one and over the other with
    // room either side, and the building's own relay mast and lamp cap step
    // aside for the board (see crowned).
    billboards: [[1, 'chart']],
    rooftopGorilla: 6,
    barrelDrop: true,
  },
];

const LCD_GBC_PALETTES = [
  null,
  {
    sky: ['#e7e7a3', '#a8cf8a'],
    buildings: ['rgba(70,121,137,0.24)', 'rgba(211,139,66,0.22)', 'rgba(104,94,142,0.18)'],
    cloud: 'rgba(54,102,123,0.64)',
  },
  {
    sky: ['#e7dfa2', '#91c2a8'],
    buildings: ['rgba(79,111,153,0.24)', 'rgba(136,89,139,0.22)', 'rgba(218,117,76,0.18)'],
    cloud: 'rgba(83,83,139,0.62)',
  },
  {
    sky: ['#dad98d', '#88ae91'],
    buildings: ['rgba(64,102,123,0.28)', 'rgba(117,78,119,0.24)', 'rgba(186,102,66,0.20)'],
    cloud: 'rgba(45,81,112,0.66)',
  },
];

// THE LIGHT SHIFTS A LITTLE. One authored sky pair per phase per stage, and
// phase 0 is the pair each stage has always opened on, so nothing about a
// run's first twenty-odd seconds changes.
//
// It USED to run the whole way to dusk — a full morning-haze-to-evening ramp
// over ninety seconds — and the end of a run went gloomy for it. What the sky
// is actually here to do is give the windows something to come on against, and
// that needs a hint of evening, not the whole of it: these pairs walk 45% of
// the distance the old ones did, so the last phase is a warmer afternoon
// rather than a sunset. The rest of "the stage gets later" is unchanged and
// does the real work — window rows lighting floor by floor, the transmitter
// tipping, stage 2's train and its repossession chopper arriving on phase.
const LCD_SKY_PHASES = [
  null,
  [['#e7e7a3', '#a8cf8a'], ['#e6e29e', '#a4cc86'], ['#e3dc97', '#9fc685'], ['#ded090', '#96bd84']],
  [['#e7dfa2', '#91c2a8'], ['#e5db9e', '#8cbea5'], ['#e1d397', '#86b7a3'], ['#dac68f', '#7dae9d']],
  [['#dad98d', '#88ae91'], ['#d8d488', '#84aa8e'], ['#d3cc83', '#7da38b'], ['#cbbd7b', '#759a84']],
];

const LCD_EQ_LEVELS = [2, 4, 3, 6, 4, 5, 2, 4, 6, 3, 5, 4, 2, 5, 3, 6];
// Cloud wind, in whole px per heard beat, one pace per cloud slot — the spread
// is what gives the flat sky a hint of depth. And a one-pixel bob per bar,
// stepped through a fixed four-bar figure rather than eased, because nothing
// on this screen eases.
const LCD_CLOUD_DRIFT = [2, 1, 3];
const LCD_CLOUD_BOB = [0, 1, 0, -1];
const LCD_WINDOW_OFF = 'rgba(53,83,101,0.24)';
const LCD_MOTION_GHOST = 'rgba(53,83,101,0.12)';
const LCD_WINDOW_ON = 'rgba(211,91,67,0.82)';
const LCD_PRINT = 'rgba(38,53,93,0.72)';
const LCD_PRINT_SOFT = 'rgba(53,83,101,0.48)';
const lcdMod = (n, d) => ((n % d) + d) % d;

// HOW MANY PHASES A STAGE PASSES THROUGH. The panel changes over a run — the
// sky gets later, more windows come on, actors arrive — but it STEPS between
// four states rather than drifting through them, because nothing on this
// screen eases. Four is one change every twenty-odd seconds: often enough to
// notice on a first run, rare enough that each one is an event.
const LCD_PHASES = 4;

// rhythm-1's own maximum: CROSSING_ROAD_RISE (7) + STAGE_WAVES['rhythm-1'].amp
// (4). It is the largest of the three stages, so a caller that does not know
// which stage it is drawing is safe with it. tests/lcd-background.js pins this
// against the real terrain constants so the two cannot drift apart.
export const LCD_DEFAULT_ROAD_RISE = 11;

function lcdSceneFrame(scene, reducedMotion) {
  const stageIndex = Math.max(1, Math.min(3, Math.trunc(scene?.stageIndex) || 1));
  const live = !reducedMotion && Number.isFinite(scene?.beat);
  const beat = live ? Math.floor(scene.beat) : 0;
  const p = Number.isFinite(scene?.progress) ? Math.max(0, Math.min(1, scene.progress)) : 0;
  // ONE scan of the sixteen bins, not four. `spectrum` and `audio` ride the same
  // gate — see the note on each below — and asking twice per field meant this
  // ran four times a frame between bg() and drawLCDCity.
  const heard = reducedMotion ? null : lcdHeardSpectrum(scene?.audio);
  return {
    stageIndex,
    live,
    step: lcdMod(beat, 16),
    beat4: lcdMod(beat, 4),
    beatAbs: beat,
    bar: Math.floor(beat / 4),
    phrase: Math.floor(beat / 16),
    phase: Math.min(LCD_PHASES - 1, Math.floor(p * LCD_PHASES)),
    // What the player is hearing, or null. NULL UNDER REDUCED MOTION, which is
    // the whole accessibility contract for the reactive layer: a frozen panel
    // must not be animated by the music behind the player's back. Also null in
    // the hub, the gallery and the tests, where every painter falls back to the
    // beat-driven behaviour it has always had — that fallback is not a
    // degradation, it is the authored panel.
    // ONE GATE FOR THE WHOLE REACTIVE LAYER. The vetted spectrum decides
    // whether there is an analyser here at all, and `audio` rides with it:
    // without a real one the deterministic fallback reports fixed constants,
    // which is not a quiet room, it is a permanent bias on every meter. No
    // analyser means the panel lights itself the authored way, exactly as it
    // did before any of this — the same path the hub, the gallery and the
    // tests take, and the same one reduced motion takes by choice.
    spectrum: heard,
    audio: heard ? scene.audio : null,
    // HOW THE RUN IS GOING, and the one crack in "no gameplay reaches this
    // painter". It is deliberately narrow: a single 0..1 scalar the run keeps
    // (RunState.rhythmForm) and a boolean for the streak reward — no chart
    // events, no obstacles, no player position. The share-price billboard
    // spends both; nothing else on the panel reads them. Null and false under
    // reduced motion for the same reason `audio` is: a frozen panel must not
    // be animated behind the player's back, and the authored flat trace is
    // exactly what every non-run caller has always drawn.
    form: reducedMotion || !Number.isFinite(scene?.form) ? null
      : Math.max(0, Math.min(1, scene.form)),
    cheer: !reducedMotion && !!scene?.cheer,
    // WHEN THE NEXT BARREL REACHES THE FOOT OF THE CHUTE, as an absolute beat,
    // or null. The second crack in "no gameplay reaches this painter" and it is
    // narrower than the first: not a position, not an event, one beat number
    // that says a thing the player can already see coming is coming.
    //
    // It exists because stage 3's barrels are no longer scenery. A barrel in
    // the lane IS one of the ones the gorilla drops, and the only way the two
    // can be the same object is for the chute to deliver when the lane says so
    // rather than on a clock of its own. Without it the chute ran every bar
    // whether or not a barrel was coming, which is precisely what made the
    // thing on the roof and the thing in the road read as unrelated.
    //
    // Null under reduced motion, in the hub, in the gallery and in the tests,
    // exactly like `form` — and there the chute falls back to the authored
    // four-beat cycle it has always run, which is not a degradation, it is the
    // panel as a picture rather than as a lane.
    barrelBeat: reducedMotion || !Number.isFinite(scene?.barrelBeat) ? null
      : scene.barrelBeat,
    // WHICH FACE THE GORILLA WEARS, or null for the authored smile. DEV ONLY:
    // no run sets it — the gallery's bake-off does, so the candidates can be
    // judged on the real panel by the real painter rather than in a copy of
    // him. It never overrides the startle; see lcdRooftopGorilla.
    gorillaExpr: typeof scene?.gorillaExpr === 'string' ? scene.gorillaExpr : null,
    // And which BROW treatment, same deal: null means the one the panel ships.
    gorillaBrow: typeof scene?.gorillaBrow === 'string' ? scene.gorillaBrow : null,
    // WHICH PLUMBER the tower's little man is drawn as, or null for the one it
    // ships. DEV ONLY, same deal as the two above: see LCD_RUNNER_STYLES and
    // the gallery's `plumber-bakeoff`.
    runnerStyle: typeof scene?.runnerStyle === 'string' ? scene.runnerStyle : null,
    // THE OPENING, or null — and null is the normal state of this panel.
    //
    // The third and last crack in "no gameplay reaches this painter", and the
    // narrowest of them: a line of text and the colours its picture cells are
    // drawn in. No events, no positions, and NO TIMING — the city assembles
    // against the beat this frame already carries and the legend rides the
    // plane's own pass zero, so the run says WHAT is announced and the panel
    // keeps deciding when.
    //
    // The LINE is passed rather than authored because only the run knows it.
    // rhythm-1's chart contains no duck at all and its card box is laid only
    // for a hero who can answer it (BeatSpawner.canShoot), so a fixed
    // three-verb legend would spend most of its banner naming things that
    // stage never asks of that hero. See RunState.rhythmLegend.
    //
    // Null under reduced motion, in the hub, in the gallery and in the tests,
    // exactly like `form` and `barrelBeat` — and there the city is simply
    // standing when the panel opens and the opening crossing flies clean, which
    // is the authored picture every caller outside a run has always drawn.
    intro: reducedMotion || !scene?.intro ? null : {
      legend: scene.intro.legend?.text
        ? { text: String(scene.intro.legend.text), ink: scene.intro.legend.ink || null }
        : null,
    },
    // The highest the lane can climb on this stage — see lcdLightFloor. A run
    // knows it exactly; every other caller draws no road and keeps rhythm-1's.
    maxRoadRise: Number.isFinite(scene?.maxRoadRise)
      ? Math.max(0, scene.maxRoadRise) : LCD_DEFAULT_ROAD_RISE,
  };
}

// ONE BAND OF THE SPECTRUM, quantised to whole cells.
//
// The analyser publishes 128 bins of a 256-point FFT, and almost all the music
// lives in the bottom third of them — so this walks a SKEWED range (the square
// of the band's position) rather than a linear slice, or twenty of twenty-four
// bars would sit dead all song. Returns 0..steps, already rounded: this panel
// lights whole cells, so the rounding belongs here rather than at each caller.
// A SILENT SPECTRUM IS NOT A QUIET ONE. Offline renders, the browserless
// tests and any device without an AnalyserNode publish 128 zeroes while
// bass/mid/level still report from the deterministic fallback — and a meter
// that believes them switches every window in the city off. The bottom bins
// carry the whole kit: all zero means there is no analyser here, only the
// fallback, and the panel should light itself the authored way instead.
function lcdHeardSpectrum(audio) {
  const spec = audio?.spectrum;
  if (!spec || spec.length < 16) return null;
  for (let i = 0; i < 16; i++) if (spec[i]) return spec;
  return null;
}

function lcdBandLevel(spec, band, bands, steps) {
  if (!spec) return null;
  const lo = Math.floor((band / bands) ** 1.7 * 96);
  const hi = Math.max(lo + 1, Math.floor(((band + 1) / bands) ** 1.7 * 96));
  let sum = 0;
  for (let i = lo; i < hi && i < spec.length; i++) sum += spec[i];
  const avg = sum / Math.max(1, hi - lo) / 255;
  // A gentle knee: the raw average sits low even in a loud bar, and a meter
  // that never leaves its bottom two cells is not a meter.
  return Math.max(0, Math.min(steps, Math.round(avg ** 0.7 * steps * 1.35)));
}

// ---- the skyline equalizer ----------------------------------------------
//
// The visualiser layer, and it is the SKYLINE ITSELF: twenty-four bars rising
// out of the ground behind the buildings, so the city stands in front of its
// own meter and occludes the feet of every bar. Drawn straight after the sky
// and before the first facade.
//
// Deliberately quiet. This is behind the lane the player is reading, so the
// lit cells are ghost ink rather than the coral every foreground cell uses —
// present at a glance, never competing with a hazard. And it is cells, not a
// curve: whole 2px blocks on the billboards' own grid.
//
// With no analyser (the hub, the gallery, a test, reduced motion) it falls
// back to the authored LCD_EQ_LEVELS table walked by the beat, which is the
// same still meter stage 2's rooftop banks have always shown.
const LCD_EQ_BARS = 16;
const LCD_EQ_CELL = 3;                    // 2px block + 1px gap, vertically
const LCD_EQ_TOP = 44;                    // never into the beat ribbon's band

// THE SILHOUETTE, AS A FUNCTION. A meter drawn through a facade turns the
// building into glass — the planes are 0.18–0.28 alpha, so every hidden cell
// showed through as grey striping AND was paid for. Roughly seven cells in ten
// were behind a building. Derived from the scene's own data and memoised per
// stage: static in, static out, so it can never disagree with what is drawn.
const lcdSkyFloors = [];
function lcdSkyFloor(stageIndex) {
  if (lcdSkyFloors[stageIndex]) return lcdSkyFloors[stageIndex];
  const art = LCD_CITY_SCENES[stageIndex];
  const spans = art.buildings.map(([x, w, h]) => [x, x + w, GROUND_Y - h]);
  if (art.gameWatch) {
    const [gx, gw, gh] = art.gameWatch;
    spans.push([gx, gx + gw, GROUND_Y - gh]);
  }
  lcdSkyFloors[stageIndex] = spans;
  return spans;
}

// NOT IN THE GAME, and that is a decision rather than an oversight.
//
// Clipped behind the skyline you never see a whole bar — only the fragments
// standing in the gaps between buildings — so in a run it read as vertical
// banding in the sky rather than as an instrument, in the one band the plane,
// the clouds and the smoke already live in. The city meters the song five
// other ways that ARE legible (windows, the rooftop banks, billboards on the
// drum, the plume, the transmitter's reach), so the sky is better left alone.
//
// The jukebox is the opposite case: the sky IS the show there and nobody is
// reading a lane through it, so the preset asks for the bars and a run does
// not.
//
// NO TIPS. Each bar used to wear a bright coral cell on its top block, on the
// argument that it was what turned a column of ghost ink into a reading. On a
// meter that is CLIPPED BY A SKYLINE it does the opposite: a bar's visible top
// is wherever the roof in front of it happens to end, not where the band
// actually peaked, so sixteen bright cells were sixteen confident readings of
// the buildings rather than of the song. Left as plain columns the layer says
// what it honestly knows — how much is lit — and stays the quiet thing behind
// the city that it is.
function lcdSkylineEq(ctx, frame) {
  const rows = Math.floor((GROUND_Y - LCD_EQ_TOP) / LCD_EQ_CELL);
  const barW = Math.floor(W / LCD_EQ_BARS);
  const spans = lcdSkyFloor(frame.stageIndex);
  for (let b = 0; b < LCD_EQ_BARS; b++) {
    const live = lcdBandLevel(frame.spectrum, b, LCD_EQ_BARS, rows);
    const n = live == null
      ? Math.round(LCD_EQ_LEVELS[lcdMod(frame.step + b * 3, LCD_EQ_LEVELS.length)] * rows / 8)
      : live;
    const x = b * barW + 1;
    // Where this bar meets the city. Everything below it is behind a facade.
    let floorY = GROUND_Y;
    for (const [sx, ex, top] of spans) {
      if (x + barW - 2 > sx && x < ex && top < floorY) floorY = top;
    }
    ctx.fillStyle = 'rgba(53,83,101,0.10)';
    for (let i = 0; i < n; i++) {
      const y = GROUND_Y - 2 - i * LCD_EQ_CELL;
      if (y + 2 > floorY) continue;
      ctx.fillRect(x, y, barW - 2, 2);
    }
  }
}

// HOW FAR DOWN A FACADE MAY LIGHT, and why it is not a free choice.
//
// The road RISES above the groundline — terrainGroundY is GROUND_Y minus the
// terrain height — so the lane climbs over the bottom of the city, and a lit
// window under it is swallowed as the lane rolls past and flickers at the edge
// while it does. The lowest lightable row is therefore the lowest one whose
// whole tile still clears the highest the road can ever reach on this stage.
//
// That is the whole content of the constant this replaces. It was written
// `y <= GROUND_Y - 28` with no note, and 28 was exactly rhythm-1's two rise
// sources plus a tile: CROSSING_ROAD_RISE + the stage wave's amp + 6. Both
// sources came down to give the city back its feet, so the floor followed them
// without a line changing here — which is the point of deriving it.
// Stated that way it is also stage-specific, which the constant was not —
// rhythm-2 and rhythm-3 declare no stage wave, so their road only ever climbs
// 10 and a flat 28 was costing them twelve pixels of city for a roll that
// cannot happen there. That band is the part of the panel closest to the lane,
// which is the part a player on a phone is actually looking at.
//
// `maxRoadRise` rides on the scene frame. Callers outside a run — the hub's
// attract screens, the jukebox preset, the tests — draw no road at all and pass
// nothing, and default to rhythm-1's 22 so the panel they have always drawn is
// the panel they still draw.
const LCD_WINDOW_H = 6;
const lcdLightFloor = (maxRoadRise) => GROUND_Y - (maxRoadRise + LCD_WINDOW_H);

// THE GRID IS PURE GEOMETRY — a building's authored [x, w, h, style] and
// nothing else — so it is built once per building instead of 182-223 plain
// objects and a fresh array on every frame. Keyed on the authored array's own
// identity, which LCD_CITY_SCENES hands back unchanged every time.
const lcdCellCache = new WeakMap();
// WHERE THE CLOCK STAGE SITS IN THE TOWER, solved from the building it is part
// of. The scene names a building index and a dial radius and nothing else, so
// raising the tower carries the dial up with it — the one failure the old
// rooftop case invited, where a screen-space y and a roof height had to be kept
// in agreement by hand.
//
// A clock stage is a COURSE of the shaft: no windows in it, a lintel over and a
// sill under, the dial centred between them. `left`/`right` stop short of the
// facade's corner masonry so the two pilasters frame the dial rather than being
// swallowed by it.
// EQUIDISTANT FROM THE TOP AND BOTH SIDES, which is one number rather than
// three: the dial is centred across the shaft, so its side margins are both
// w/2 - r, and dropping its centre by exactly w/2 makes the margin over it the
// same. Nothing to author and nothing to keep in agreement — the dial sits in
// the corner of the tower the way a stone would be set, and a change to either
// the width or the height moves it correctly on its own.
const LCD_CLOCK_MARGIN = 2;   // clear wall kept around the dial, drawn on by nothing
function lcdClockBay(art) {
  if (!art || !art.clock) return null;
  const [index, r] = art.clock;
  const [x, w, h] = art.buildings[index];
  const roof = GROUND_Y - h;
  const cy = roof + Math.round(w / 2);
  return {
    index, r, cx: Math.round(x + w / 2), cy,
    // FULL WIDTH, because the clock stage is a storey of the tower and not a
    // panel hung on it. Half-width left the cornice and the two corner
    // pilasters running past the dial with a pixel or two of air, and at this
    // pitch that pair of verticals under a horizontal is a frame — the exact
    // thing that had to go. Above the sill the shaft is plain wall.
    left: x, right: x + w,
    top: cy - r - LCD_CLOCK_MARGIN,
    bottom: cy + r + LCD_CLOCK_MARGIN,
  };
}
const lcdBayHits = (bay, x, y, w, h) => !!bay
  && x + w > bay.left && x < bay.right && y + h > bay.top && y < bay.bottom;

function lcdWindowCells(building, bay = null) {
  const hit = lcdCellCache.get(building);
  if (hit) return hit;
  const [x, w, h, style] = building;
  const top = GROUND_Y - h;
  const cols = Math.max(2, Math.floor((w - 12) / (style === 'deco' ? 12 : 11)));
  const activeRows = Math.max(2, Math.floor((h - 22) / 11));
  const rows = Math.max(activeRows, Math.floor((H - top - 8) / 11));
  const cells = [];
  for (let row = 0; row < rows; row++) {
    const y = top + 10 + row * 11;
    if (y + 6 > H) continue;
    for (let col = 0; col < cols; col++) {
      const cx = x + 7 + col * ((w - 14) / Math.max(1, cols - 1));
      const cellX = Math.round(cx - 3);
      // The clock stage has no windows in it. Dropped at BUILD time rather than
      // masked at draw time, so the lit half cannot light a cell the dial is
      // standing on — and so the baked layer and the live one agree by
      // construction instead of by both remembering to check.
      if (lcdBayHits(bay, cellX, y, 7, 6)) continue;
      cells.push({ row, col, x: cellX, y });
    }
  }
  const built = { cells, cols, activeRows };
  lcdCellCache.set(building, built);
  return built;
}

// THE UNLIT HALF, which is about nine tenths of this painter's fills and the
// same on every frame whatever the beat is doing. It goes into the baked city
// layer; see bakedCity.
//
// Big, solid colour tiles: closer to a GBC game's readable window blocks
// than the old fine H-shaped LCD segments. A tiny highlight gives each tile
// glass without cutting its silhouette into panes.
function lcdWindowGridBase(ctx, building, bay) {
  const { cells } = lcdWindowCells(building, bay);
  ctx.fillStyle = LCD_WINDOW_OFF;
  for (const cell of cells) ctx.fillRect(cell.x, cell.y, 7, 6);
  ctx.fillStyle = 'rgba(220,225,151,0.34)';
  for (const cell of cells) {
    ctx.fillRect(cell.x + 1, cell.y + 1, 5, 2);
  }
}

// THE LIT HALF, and the only part of the grid a beat can move.
function lcdWindowGridLit(ctx, building, index, frame, bay) {
  const { cells, cols, activeRows } = lcdWindowCells(building, bay);
  const floorY = lcdLightFloor(frame.maxRoadRise);
  const lightable = (cell) => cell.row < activeRows && cell.y <= floorY;
  const active = [];
  // THE BUILDING HEARS ITS OWN BAND. Each facade is assigned one slice of the
  // spectrum, and that slice decides how many rows light from the bottom —
  // the block becomes a VU meter standing on end, which is what a lit office
  // tower already looks like. The authored beat cycle still picks which
  // COLUMN, so the choreography that was here survives underneath the level.
  //
  // Rows fill from the bottom because that is how a meter reads and how a
  // building fills up in the evening; `phase` adds a floor, so the city has
  // more lights on at the end of a run than at the start.
  // ADDITIVE, not a replacement. The level says HOW MANY cells; the authored
  // per-stage cycle still says WHICH — so CLOCK-IN CITY still walks its single
  // cell, CHORUS DISTRICT still alternates its column parity and OVERDRAFT
  // SKYLINE still runs two cells in opposite directions. Replacing those
  // branches outright made all three stages the same city the moment music
  // played, which is the one thing this panel's variety cannot afford. And
  // `phase` raises the floor with or without an analyser, so the city wakes up
  // in the hub and under reduced motion too.
  const heard = lcdBandLevel(frame.spectrum, index, 8, activeRows) ?? 0;
  const floor = Math.min(activeRows, frame.phase + heard);
  if (frame.stageIndex === 1) {
    const row = lcdMod(frame.step + index, activeRows);
    const col = lcdMod(Math.floor(frame.step / 4) + index, cols);
    active.push(...cells.filter((cell) => lightable(cell) && cell.row === row && cell.col === col));
  } else if (frame.stageIndex === 2) {
    const parity = frame.beat4 === 1 || frame.beat4 === 3 ? 1 : 0;
    const row = lcdMod(Math.floor(frame.step / 2) + index, activeRows);
    active.push(...cells.filter((cell) => lightable(cell) && cell.row === row && cell.col % 2 === parity));
  } else {
    const dir = (index + frame.phrase) % 2 === 0 ? 1 : -1;
    const rowA = lcdMod(frame.step * dir + index, activeRows);
    const rowB = lcdMod(rowA + Math.max(1, Math.floor(activeRows / 2)), activeRows);
    const colA = lcdMod(frame.step + index, cols);
    const colB = lcdMod(cols - 1 - colA, cols);
    active.push(...cells.filter((cell) => lightable(cell) && ((cell.row === rowA && cell.col === colA)
      || (cell.row === rowB && cell.col === colB))));
  }
  if (floor > 0) {
    const col = lcdMod(Math.floor(frame.step / 2) + index, cols);
    active.push(...cells.filter((cell) => lightable(cell) && cell.col === col
      && cell.row >= activeRows - floor));
  }
  ctx.fillStyle = LCD_WINDOW_ON;
  for (const cell of active) {
    ctx.fillRect(cell.x, cell.y, 7, 6);
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(cell.x + 1, cell.y + 4, 5, 1);
    ctx.fillStyle = LCD_WINDOW_ON;
  }
}

function lcdStrokePath(ctx, points, close = false) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  if (close) ctx.closePath();
  ctx.stroke();
}

function gbcBuildingLineArt(ctx, building, crowned, bay = null) {
  const [x, w, h, style] = building;
  const top = GROUND_Y - h;
  const detailBottom = GROUND_Y - 27;
  const cx = Math.round(x + w / 2);

  ctx.strokeStyle = LCD_PRINT;
  // `crowned` MEANS THE ROOF IS SPOKEN FOR — by the gorilla, a billboard or the
  // transmitter — and every style that draws a rooftop crown has to honour it.
  // Half of them did not: storefront, clockworks, relay, speaker and music-hall
  // painted their crown box
  // unconditionally, which is invisible until something stands on that roof and
  // then shows as a parapet cage in the gap between a billboard's legs. Nothing
  // stage 1's share price and its burger have stood on storefront roofs all
  // along with the shop's own parapet cage showing between their legs.
  // The facade continues to the bottom of the display. The road apron masks
  // this lower portion everywhere except a pit, where it becomes the actual
  // background seen through the opening.
  ctx.strokeRect(x + 0.5, top + 0.5, w, H - top);
  // Cornice, sill and corner masonry give the facades a designed scale. The
  // lower 27px remain quiet so this never becomes false lane furniture.
  ctx.fillStyle = LCD_PRINT_SOFT;
  // A clock stage takes the whole storey, cornice and corner masonry included:
  // the facade begins under the dial's sill. Everything here is measured from
  // `courseTop` rather than the roof so the pilasters cannot start above it.
  const courseTop = bay ? bay.bottom : top + 7;
  if (!bay) ctx.fillRect(x + 2, top + 4, w - 4, 1);
  ctx.fillRect(x + 3, courseTop, 1, Math.max(1, detailBottom - courseTop));
  ctx.fillRect(x + w - 4, courseTop, 1, Math.max(1, detailBottom - courseTop));

  if (style === 'storefront') {
    if (!crowned) {
      ctx.strokeRect(x + 5.5, top - 5.5, w - 11, 5);
      ctx.fillRect(x + 8, top - 3, w - 16, 1);
    }
    ctx.fillRect(x + 5, top + 8, w - 10, 2);
    for (let sx = x + 7; sx < x + w - 6; sx += 6) ctx.fillRect(sx, top + 10, 3, 2);
  } else if (style === 'clockworks') {
    if (!crowned) { ctx.fillRect(x + 5, top - 3, 7, 3); ctx.fillRect(x + w - 12, top - 3, 7, 3); }
    // THE SHAFT STOPS AT THE CLOCK STAGE and picks up again under its sill.
    // The spine and the banded courses run the whole height of this facade,
    // which is fine on a plain tower and is a cage drawn across a dial the
    // moment one is set into it — the same thing the rooftop kit was doing
    // behind the billboards. What the wall carries here is the clock.
    const spineTop = bay ? bay.bottom : top + 7;
    ctx.fillRect(cx - 1, spineTop, 2, Math.max(4, detailBottom - spineTop - 2));
    for (let y = top + 18; y < detailBottom; y += 20) {
      if (lcdBayHits(bay, x + 5, y, w - 10, 1)) continue;
      ctx.fillRect(x + 5, y, w - 10, 1);
    }
  } else if (style === 'workshop') {
    if (!crowned) {
      lcdStrokePath(ctx, [[x + 1, top], [x + 8, top - 6], [x + 15, top],
        [x + 22, top - 6], [x + w - 1, top]]);
    }
    ctx.fillRect(x + 5, top + 7, w - 10, 1);
    ctx.strokeRect(x + 6.5, top + 13.5, Math.max(8, w - 13), 8);
  } else if (style === 'deco') {
    if (!crowned) {
      ctx.strokeRect(cx - 9.5, top - 5.5, 19, 5);
      ctx.strokeRect(cx - 5.5, top - 10.5, 11, 5);
      ctx.fillRect(cx - 1, top - 14, 2, 4);
    }
    ctx.fillRect(cx - 1, top + 4, 2, Math.max(5, detailBottom - top - 4));
    ctx.fillRect(x + 7, top + 6, 1, Math.max(4, detailBottom - top - 8));
    ctx.fillRect(x + w - 8, top + 6, 1, Math.max(4, detailBottom - top - 8));
  } else if (style === 'fire-escape') {
    const side = x + w - 12;
    for (let y = top + 15; y < detailBottom - 3; y += 20) {
      ctx.fillRect(side, y, 9, 1);
      ctx.fillRect(side, y - 4, 1, 5); ctx.fillRect(side + 8, y - 4, 1, 5);
      lcdStrokePath(ctx, [[side + 1, y], [side + 7, y + 8], [side + 1, y + 16]]);
    }
  } else if (style === 'water-tower') {
    if (!crowned) {
      // A TANK ON LEGS, and it has to say so from the lane. The old crown was
      // a 15x7 outlined box on two stubs with a diagonal across it, which at
      // this size is not a water tower, it is a road sign with a slash through
      // it — the one rooftop on this skyline nobody could name. What reads as
      // a water tower is the silhouette, and it is three things: a CONICAL CAP
      // with a finial, a DRUM that tapers toward its base, and FOUR SPLAYED
      // LEGS with bracing between them. Drawn tall enough to be those three
      // things separately rather than one small box.
      const ty = top - 17;             // where the drum meets the cap
      const tb = top - 8;              // where the drum meets the legs
      lcdStrokePath(ctx, [[cx - 8, ty], [cx, ty - 4], [cx + 8, ty]]);
      ctx.fillRect(cx, ty - 6, 1, 3);
      lcdStrokePath(ctx, [[cx - 8, ty], [cx - 7, tb], [cx + 7, tb], [cx + 8, ty]]);
      // One hoop around the staves. Soft, so it bands the drum without
      // cutting the silhouette in half the way the old inner line did.
      ctx.fillRect(cx - 7, ty + 4, 14, 1);
      // The legs: an outer pair splaying past the drum's width and an inner
      // pair dropping nearly straight, cross-braced at the halfway point.
      lcdStrokePath(ctx, [[cx - 6, tb], [cx - 8, top]]);
      lcdStrokePath(ctx, [[cx + 6, tb], [cx + 8, top]]);
      lcdStrokePath(ctx, [[cx - 2, tb], [cx - 3, top]]);
      lcdStrokePath(ctx, [[cx + 2, tb], [cx + 3, top]]);
      ctx.fillRect(cx - 7, tb + 5, 5, 1);
      ctx.fillRect(cx + 3, tb + 5, 5, 1);
    }
    for (let y = top + 16; y < detailBottom; y += 20) ctx.fillRect(x + 6, y, w - 12, 1);
  } else if (style === 'office') {
    ctx.fillRect(x + 6, top + 7, 2, Math.max(4, detailBottom - top - 8));
    ctx.fillRect(x + w - 8, top + 7, 2, Math.max(4, detailBottom - top - 8));
    for (let y = top + 18; y < detailBottom; y += 20) ctx.fillRect(x + 5, y, w - 10, 1);
  } else if (style === 'speaker') {
    if (!crowned) ctx.strokeRect(cx - 9.5, top - 5.5, 19, 5);
    for (const [cy, r] of [[top + 15, 5], [top + 29, 7]]) {
      if (cy + r >= detailBottom) continue;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r - 3), 0, Math.PI * 2); ctx.stroke();
    }
  } else if (style === 'music-hall') {
    if (!crowned) {
      ctx.strokeRect(cx - 11.5, top - 5.5, 23, 5);
      ctx.fillRect(cx - 8, top - 3, 16, 1);
    }
    ctx.strokeRect(x + 6.5, top + 8.5, w - 13, 9);
    ctx.fillRect(x + 9, top + 12, w - 18, 1);
  } else if (style === 'spire') {
    if (!crowned) {
      lcdStrokePath(ctx, [[cx - 10, top], [cx - 6, top - 6], [cx - 3, top - 6],
        [cx, top - 15], [cx + 3, top - 6], [cx + 6, top - 6], [cx + 10, top]]);
      ctx.fillRect(cx, top - 21, 1, 7);
    }
    ctx.fillRect(cx - 1, top + 4, 2, Math.max(4, detailBottom - top - 6));
  } else if (style === 'ducts') {
    if (!crowned) {
      ctx.strokeRect(x + 6.5, top - 6.5, 7, 6);
      ctx.fillRect(x + 8, top - 10, 3, 4);
      lcdStrokePath(ctx, [[x + w - 15, top], [x + w - 15, top - 8],
        [x + w - 7, top - 8], [x + w - 7, top]]);
    }
    ctx.fillRect(x + 6, top + 8, w - 12, 1);
  } else if (style === 'relay') {
    if (!crowned) {
      ctx.strokeRect(cx - 9.5, top - 4.5, 19, 4);
      ctx.fillRect(cx - 6, top - 2, 12, 1);
    }
    for (let y = top + 17; y < detailBottom; y += 18) ctx.fillRect(x + 5, y, w - 10, 1);
  } else if (style === 'industrial') {
    if (!crowned) {
      ctx.strokeRect(x + 5.5, top - 5.5, 8, 5);
      ctx.strokeRect(x + w - 13.5, top - 8.5, 8, 8);
      ctx.fillRect(x + w - 11, top - 12, 3, 4);
    }
    lcdStrokePath(ctx, [[x + 5, top + 9], [x + w - 5, top + 18],
      [x + 5, top + 27], [x + w - 5, top + 36]]);
  }
}

function lcdCloud(ctx, x, y, pose, color) {
  const a = [[0, 8], [3, 4], [8, 4], [11, 0], [19, 0], [23, 5], [29, 5], [34, 9], [31, 12], [3, 12]];
  const b = [[2, 7], [5, 3], [11, 3], [14, 0], [21, 1], [24, 5], [31, 5], [36, 9], [33, 12], [5, 12]];
  ctx.strokeStyle = LCD_WINDOW_OFF;
  lcdStrokePath(ctx, a.map(([px, py]) => [x + px, y + py]), true);
  lcdStrokePath(ctx, b.map(([px, py]) => [x + px, y + py]), true);
  ctx.strokeStyle = color;
  lcdStrokePath(ctx, (pose ? b : a).map(([px, py]) => [x + px, y + py]), true);
  const wisps = pose
    ? [[x + 10, y + 7, 8, 1], [x + 21, y + 9, 9, 1], [x + 16, y + 4, 4, 1]]
    : [[x + 7, y + 8, 9, 1], [x + 19, y + 6, 8, 1], [x + 13, y + 3, 5, 1]];
  ctx.fillStyle = LCD_WINDOW_OFF;
  ctx.fillRect(x + 5, y + 7, 25, 3);
  ctx.fillStyle = color;
  for (const cell of wisps) ctx.fillRect(...cell);
}

// ---- the chase ----------------------------------------------------------
//
// A maze-game attract screen on a rooftop: three ghosts running, a few pellets
// left in the corridor behind them, and the round one coming up on those.
// Everything steps ONE CELL PER HEARD BEAT and he chomps on the same beat,
// which is the only clock anything on this panel keeps — so the chase is
// quarter notes, and a player watching the board is watching the tempo.
//
// Built as a STRIP that the board is a window onto, rather than as a list of
// authored frames: the cast is forty cells long against a thirteen-cell board,
// so frames would be forty near-identical pictures. A strip says it once and
// the window does the walking. Forty cells is ten bars, so the chase comes
// round on a bar line rather than mid-phrase.
//
// THE GAPS ARE THE PICTURE. Four sprites at an even pitch is a queue, not a
// chase — what says one thing is after another is the DISTANCE between them,
// and what says he is gaining is the row of pellets lying in it. The ghosts run
// nose to tail; eleven cells of corridor and three dots separate the last of
// them from him, and the SAME again separates him from the pack coming round.
// Without that second gap the strip's wrap put him nose to tail with the ghost
// he is chasing, which is the one arrangement that says he has caught them.
const LCD_CHASE_W = 13;
const LCD_CHASE_H = 7;
const LCD_CHASE_LEN = 48;
// Where each of them stands on the strip, in cells. Left to right is the order
// they are seen in, and they all travel left, so the ones in front are the ones
// being chased.
const LCD_CHASE_CAST = [
  { at: 0, ghost: 'A' }, { at: 7, ghost: 'B' }, { at: 14, ghost: 'C' },
  { at: 31, ghost: null },
];
const LCD_CHASE_PELLETS = [22, 25, 28];
// A ghost: domed head, scalloped skirt, and eyes with WHITES and pupils rather
// than holes punched in the body. The holes were the cheap version and they
// read as a mask — an eye is a light thing with a dark thing in it, and the
// pupils sit to the left of their whites because that is the way he is running.
const lcdGhostCells = (k, pose) => [
  '..XX..',
  '.XXXX.',
  'XXXXXX',
  'WWXWWX',
  'pWXpWX',
  'XXXXXX',
  pose ? 'X.XX.X' : '.XX.XX',
].map((row) => row.replaceAll('X', k));
// ...and the round one, facing the way he is travelling, chomping on the beat,
// WITH AN EYE. Without it he is a pie chart.
//
// SEVEN BY SEVEN, because he is a circle and a circle needs a square to stand
// in. At six wide against seven tall the closed pose was an egg on its end —
// the one sprite in the game whose whole identity is that it is round, drawn
// out of round. The mouth is a wedge cut from the leading edge to the middle,
// so it opens where he is going.
const lcdPacCells = (pose) => [
  '..PPP..',
  '.PPPePP',
  pose ? 'PPPPPPP' : '..PPPPP',
  pose ? 'PPPPPPP' : '...PPPP',
  pose ? 'PPPPPPP' : '..PPPPP',
  '.PPPPP.',
  '..PPP..',
];
function lcdChaseStrip(pose) {
  const cells = [];
  for (let r = 0; r < LCD_CHASE_H; r++) cells.push(new Array(LCD_CHASE_LEN).fill('.'));
  for (const m of LCD_CHASE_CAST) {
    const art = m.ghost ? lcdGhostCells(m.ghost, pose) : lcdPacCells(pose);
    for (let r = 0; r < LCD_CHASE_H; r++) {
      for (let c = 0; c < art[r].length; c++) {
        if (art[r][c] !== '.') cells[r][(m.at + c) % LCD_CHASE_LEN] = art[r][c];
      }
    }
  }
  // On the corridor's centreline, which is where a maze game puts its dots and
  // is the row his mouth is open on.
  for (const at of LCD_CHASE_PELLETS) cells[3][at % LCD_CHASE_LEN] = 'd';
  return cells.map((row) => row.join(''));
}
const LCD_CHASE_STRIPS = [lcdChaseStrip(0), lcdChaseStrip(1)];
function lcdChaseGrid(frame) {
  const strip = LCD_CHASE_STRIPS[frame.beat4 % 2];
  const off = lcdMod(frame.bar * 4 + frame.beat4, LCD_CHASE_LEN);
  return strip.map((row) => {
    let out = '';
    for (let c = 0; c < LCD_CHASE_W; c++) out += row[(off + c) % LCD_CHASE_LEN];
    return out;
  });
}

// ---- rooftop billboards -------------------------------------------------
//
// Big framed panels on legs, with COARSE PIXEL images — 2px cells lit against
// a dark board the way window cells are lit against a facade. The old rooftop
// crowns were 5px frames with nothing on them; these are signs you can read
// from the lane. The invader does its classic two-frame dance on the bar.
const LCD_BILLBOARD_ART = {
  invader: {
    // Half tempo: the dance lands on beats 1 and 3, not on every quarter.
    rate: 2,
    ink: { X: '#b9cf79' },
    frames: [[
      '..X.....X..',
      '...X...X...',
      '..XXXXXXX..',
      '.XX.XXX.XX.',
      'XXXXXXXXXXX',
      'X.XXXXXXX.X',
      'X.X.....X.X',
      '...XX.XX...',
    ], [
      '..X.....X..',
      'X..X...X..X',
      'X.XXXXXXX.X',
      'XXX.XXX.XXX',
      'XXXXXXXXXXX',
      '.XXXXXXXXX.',
      '..X.....X..',
      '.X.......X.',
    ]],
  },
  burger: {
    ink: { B: '#d4a35e', K: LCD_WINDOW_ON, L: '#b9cf79', P: '#8a5a35' },
    frames: [[
      '...BBBBB...',
      '..BBBBBBB..',
      '.BBBBBBBBB.',
      '.KKKKKKKKK.',
      '.LLLLLLLLL.',
      '.PPPPPPPPP.',
      '.BBBBBBBBB.',
      '..BBBBBBB..',
    ]],
  },
  // RHYTHM BANKRUPTCY's own joke: the share price, going where the cabinet's
  // name says it goes. It is the one sign on this skyline that is NOT purely
  // authored — the trace tilts with how the run is going (see lcdChartGrid),
  // and a long enough clean streak replaces the whole board with a thumb.
  chart: {
    ink: { X: LCD_WINDOW_ON, '!': '#f6d33c', g: LCD_WINDOW_OFF, O: LCD_PRINT, T: '#b9cf79' },
    grid: (frame) => (frame.cheer ? LCD_THUMBS_UP : lcdChartGrid(frame.form)),
    frames: [[
      'X..........',
      '.XX........',
      '...X..X...!',
      '....XX.X..!',
      '........X.!',
      '.........X.',
      '..........!',
      '...........',
    ]],
  },
  // A cassette for the rhythm cabinet: solid shell, cream label with a red
  // stripe, round-ish reel hubs joined by the tape through the window, and a
  // chamfered base. The first draft's two big square reels on an empty shell
  // read as a robot's eyes; the label band and the tape line are what say
  // CASSETTE at this resolution.
  // Three ghosts and the round one behind them, walking a cell a beat. The
  // picture is generated (see lcdChaseGrid); `frames` is here to size the
  // board and to be what a caller with no clock draws.
  chase: {
    ink: {
      A: '#b9cf79', B: LCD_WINDOW_ON, C: '#d4a35e', P: '#f6d33c',
      W: '#e1d68c', p: LCD_PRINT, e: LCD_PRINT, d: '#e1d68c',
    },
    grid: lcdChaseGrid,
    frames: [lcdChaseGrid({ bar: 0, beat4: 0 })],
  },
  cassette: {
    ink: { S: '#b9cf79', L: '#e1d68c', K: LCD_WINDOW_ON, O: LCD_PRINT, T: '#8a5a35' },
    frames: [[
      'SSSSSSSSSSSSS',
      'SLLLLLLLLLLLS',
      'SKKKKKKKKKKKS',
      'SSSOSSSSSOSSS',
      'SSOOOTTTOOOSS',
      'SSSOSSSSSOSSS',
      'SSSSSSSSSSSSS',
      '.SSSSSSSSSSS.',
    ]],
  },
};

// THE SHARE PRICE, drawn from how the run is actually going.
//
// `form` is the one gameplay number this city is allowed to see: 0.5 at the
// start of a stage, climbing a step per on-beat jump or duck, dropping on a
// missed beat and dropping hard on a hit. Everything else about the trace is
// authored — a fixed wobble so the line reads as a market rather than a ramp —
// and the form only sets where the RIGHT-HAND end of it lands. Null form (the
// hub, the gallery, reduced motion, any cabinet that is not a live run) draws
// the flat mid-board trace, which is the authored sign it has always been.
//
// THE BOARD IS DRAWN AS A CHART, not as a shape that happens to slope. The
// first pass filled every riser between two neighbouring points, which at two
// pixels a cell welded the whole line into one fat diagonal worm — legible as
// a blob and nothing else. Two things fix it and both are what a chart has:
// ONE CELL PER COLUMN (neighbouring cells touch at the corner, which is how a
// line reads at this pitch), and RULINGS — an unlit axis up the left edge and
// along the bottom — so the eye has something for the trace to be high or low
// against. The slope is clamped to a cell per column for the same reason: a
// two-cell step is a wall, and a wall is a blob again.
const LCD_CHART_WOBBLE = [0, 0.7, -0.5, 0.6, -0.4, 0.7, -0.6, 0.4, -0.5, 0];
const LCD_CHART_COLS = 10;   // plotted columns; column 0 of the board is the axis
const LCD_CHART_FLOOR = 6;   // lowest plotted row; row 7 is the baseline
function lcdChartGrid(form) {
  const f = Number.isFinite(form) ? Math.max(0, Math.min(1, form)) : 0.5;
  const rows = [];
  for (let r = 0; r < 8; r++) rows.push('...........'.split(''));
  // The rulings first, so a trace cell always wins the square it shares.
  for (let c = 0; c < 11; c++) rows[7][c] = 'g';
  for (let r = 0; r < 8; r++) rows[r][0] = 'g';
  // Row 0 is the TOP of the board, so a good run has to walk the trace UP the
  // array. Mid-board is 3; a perfect form reaches row 0, a ruined one row 6.
  const end = 3 - (f - 0.5) * 6;
  // The wobble fades toward the right so the last cells say the score rather
  // than the noise.
  const at = (c) => {
    const t = c / (LCD_CHART_COLS - 1);
    return Math.max(0, Math.min(LCD_CHART_FLOOR,
      Math.round(3 + (end - 3) * t + LCD_CHART_WOBBLE[c] * (1 - t * 0.35))));
  };
  let prev = at(0);
  for (let c = 0; c < LCD_CHART_COLS; c++) {
    // Where the run is NOW gets the gold, which is the only cell on this sign
    // anybody reads in the half second it is on screen.
    const r = Math.max(prev - 1, Math.min(prev + 1, at(c)));
    rows[r][c + 1] = c === LCD_CHART_COLS - 1 ? '!' : 'X';
    prev = r;
  }
  return rows.map((r) => r.join(''));
}

// The reward for a clean run of beats: the board drops the market and puts up
// a thumb. Solid like the invader — outlines vanish at this cell size — with
// two dark creases doing the work of curled fingers.
const LCD_THUMBS_UP = [
  '..TT.......',
  '..TT.......',
  '..TTT......',
  '.TTTTTTTTT.',
  'TTTTOOOOOTT',
  'TTTTTTTTTTT',
  'TTTTOOOOOTT',
  '.TTTTTTTTT.',
];

function lcdBillboard(ctx, building, artName, frame, reducedFlashing) {
  const art = LCD_BILLBOARD_ART[artName];
  if (!art) return;
  // A sign on a drum. `hit` is 1 on the frame a kit piece is actually heard
  // and decays from there, so the board's dark panel washes pale on the snare
  // and settles between hits — the one place the city answers a single sound
  // rather than the beat grid. Reduced flashing keeps the sign printed.
  const strike = !reducedFlashing && (frame.audio?.hit || 0) > 0.55;
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const roof = GROUND_Y - h;
  // A sign may generate its picture instead of stepping authored frames — the
  // chart does, because what it says is the run's own business.
  const live = art.grid ? art.grid(frame) : null;
  const rows = (live || art.frames[0]).length, cols = (live || art.frames[0])[0].length;
  const pw = cols * 2 + 8, ph = rows * 2 + 8;
  const left = cx - Math.round(pw / 2), top = roof - 8 - ph;
  // Legs with a cross-brace, then the board: dark panel, thin lit inner rim.
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(cx - 9, roof - 8, 2, 8);
  ctx.fillRect(cx + 7, roof - 8, 2, 8);
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(cx - 7, roof - 4, 14, 1);
  ctx.fillStyle = strike ? 'rgba(120,140,110,0.85)' : LCD_PRINT;
  ctx.fillRect(left, top, pw, ph);
  ctx.strokeStyle = 'rgba(220,228,154,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 1.5, top + 1.5, pw - 3, ph - 3);
  // The image steps a frame every `rate` heard beats (default every beat) —
  // a one-frame sign simply stands lit.
  const step = Math.floor((frame.bar * 4 + frame.beat4) / (art.rate || 1));
  const grid = live || art.frames[lcdMod(step, art.frames.length)];
  const ox = left + 4, oy = top + 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inkColor = art.ink[grid[r][c]];
      if (!inkColor) continue;
      ctx.fillStyle = inkColor;
      ctx.fillRect(ox + c * 2, oy + r * 2, 2, 2);
    }
  }
}

// ---- the smoke stacks ---------------------------------------------------
//
// A BANK OF THREE, not one chimney. A single stack on a roof is a domestic
// thing — a house has one — and this roof is the industry in a skyline whose
// other buildings are a clock works, a broadcast mast and a record shop. Three
// stacks of stepped heights, shoulder to shoulder, read as a plant from across
// the panel, and they give the plume a reason: the tall one is working, and the
// short one beside it is idling out a wisp.
//
// THEY ARE OUTLINED, NOT SOLID. Every other thing standing on this skyline is
// linework — the facades, the crowns, the mast, the billboards are all stroked
// boxes over the panel — and the chimney was the one filled slab among them,
// which at this size read as a domino someone had left on the roof. Two
// mullions and a capped mouth say stack with the panel showing through, and
// they say it in the same hand as the building underneath.
//
// AND THEY STAND ON A BOILER HOUSE, TAPERED. Outlined parallel-sided tubes on
// a bare roof are three table legs standing in a row — nothing joins them and
// nothing holds them up. A low outlined shed under all three, and a shaft that
// steps out one pixel a side into a footing, is what turns the bank into a
// plant: the stacks come out of a building of their own, and each one widens
// where it meets it the way a chimney does.
//
// ONLY THE TALL ONE MAKES THE PLUME. Three columns of smoke over one 46px roof
// is a grey wash, not a bank of stacks — so the tall stack carries the authored
// plume and the left-hand stub carries two small puffs that die at the height
// the plume is only starting from. The heights are what say the rest.
//
// THE PLUME IS SEPARATE PUFFS, not a column. The first draft ran seven cells
// six pixels apart while the cells themselves were eight to ten tall, so they
// overlapped into one continuous grey stripe leaning off the roof — which is
// what a smear of exhaust looks like, not what smoke looks like. Five cells
// with real air between them, each one wider, fainter and further downwind
// than the last, so the plume comes APART as it climbs. The lowest still sits
// close enough to the mouth to be read as coming out of it (three pixels of
// air, not nineteen — that gap was the first draft's other mistake), and the
// top cell holds under the plane's cruising lane.
//
// The puffs are PIXEL blobs on the same 2px grid the billboards use — soft
// ellipses floated like production smoke against a coarse-pixel skyline. The
// cells are fixed; the beat gives them life: each puff drifts on its own cycle
// and the higher ones come and go. Reduced motion (beat 0 forever) leaves a
// composed still plume with every puff present.
const LCD_PUFFS = [
  ['.XX.',
   'XOOX',
   'XOOX',
   '.XX.'],
  ['..XX..',
   '.XOOX.',
   'XOOOOX',
   '.XXOX.',
   '..XX..'],
  ['..XXX...',
   '.XOOOX.X',
   'XOOOX.XX',
   '.XOX..X.',
   '..X.....'],
  ['.XXX..XX..',
   'XOOX..XOX.',
   '.XX....XX.',
   '..X.......'],
];
// The idling stub's wisp: a puff and a torn one, and that is the whole of it.
const LCD_WISPS = [['XX', 'OO', 'XX'], ['X.X', '.XX', 'X..']];
function lcdSmokestack(ctx, building, dx, frame) {
  const [x, bw, h] = building;
  const roof = GROUND_Y - h;
  const sx = Math.round(x + dx);
  // THE PLANT OWNS THE WHOLE ROOF. The bank used to stand in the middle third
  // of a 46px roof in one-pixel line, three slim tubes with air either side,
  // and at desktop magnification that is a set of railings — the roof read as
  // empty with something small on it. So the boiler house runs the full width
  // of the building it stands on, bar a two-pixel margin, and the stacks are
  // spread across it rather than huddled at its centre.
  const shedTop = roof - 6;
  const shedL = x + 2, shedR = x + bw - 2;
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(shedL, shedTop, shedR - shedL, 2);
  ctx.fillRect(shedL, shedTop + 2, 2, roof - shedTop - 2);
  ctx.fillRect(shedR - 2, shedTop + 2, 2, roof - shedTop - 2);
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(shedL + 5, shedTop + 3, 4, 1);
  ctx.fillRect(shedR - 9, shedTop + 3, 4, 1);
  // TWO PIXELS, NOT ONE, AND WIDE SHAFTS. The one-pixel rule was borrowed from
  // the facades, and it was the wrong loan: a facade is a big shape whose line
  // only has to bound it, while a stack IS its line — take the outline down to
  // a hairline and there is no chimney left, just two threads and a tick. At
  // 9/7/6 wide with 2px walls each shaft has real mass, the panel still shows
  // through the middle so it stays linework rather than a slab, and the bank
  // now carries the same visual weight as the billboards beside it.
  //
  // The lip overhangs by ONE pixel, not two: a wide cap on a nine-pixel shaft
  // is a mushroom, and three mushrooms on a roof is a garden. `top` is the lip,
  // so the height step between the three is what the eye is given — 20, 16, 12
  // — and each shaft steps out a pixel a side at its shoulder into a footing,
  // which is what a chimney does where it meets the house.
  const stack = (lx, top, w) => {
    const jog = shedTop - Math.max(3, Math.round((shedTop - top) * 0.28));
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(lx - 1, top, w + 2, 2);                      // the cap
    ctx.fillRect(lx, top + 2, 2, jog - top - 2);              // upper walls
    ctx.fillRect(lx + w - 2, top + 2, 2, jog - top - 2);
    ctx.fillRect(lx - 1, jog, 3, shedTop - jog);              // the footing
    ctx.fillRect(lx + w - 2, jog, 3, shedTop - jog);
    ctx.fillStyle = LCD_PRINT_SOFT;
    ctx.fillRect(lx + 2, top + 4, w - 4, 1);                  // rim band
    if (top + 9 < jog) ctx.fillRect(lx + 2, top + 9, w - 4, 1);
  };
  const stubTop = roof - 12;
  const stubX = sx - 14;
  stack(stubX, stubTop, 6);          // the idling stub, left
  stack(sx + 13, roof - 16, 7);      // its taller twin, right
  stack(sx, roof - 20, 9);           // the working stack
  // Offsets from the ROOF, so raising the stack raises nothing else: the first
  // puff clears the working lip by a pixel and the rest are spaced off the
  // building. The lean grows with height, so the column bends downwind rather
  // than sliding sideways as a whole, and the gaps widen as it goes — the plume
  // is coming apart, not marching. Each x is the grid's LEFT edge, walked left
  // as the puffs widen so the column's centre line is what leans. The top cell
  // stops short of the plane's cruising lane (belly y 62 over this end of the
  // skyline; the top puff tops out at 65).
  const cells = [[0, -29], [-5, -38], [-14, -47], [-26, -55]];
  // The plume breathes with the mix: a quiet bar is three puffs, a loud one
  // carries the whole column. Quantised to whole puffs, like everything here.
  // THREE IS THE FLOOR, not two: two cells on a stack this size is a plant
  // that has just been lit, and the roof spent most of a quiet bar looking
  // switched off.
  const heard = frame.audio ? frame.audio.level : null;
  const puffs = heard == null ? cells.length
    : Math.max(3, Math.min(cells.length, 3 + Math.round(heard * (cells.length - 3))));
  for (let i = 0; i < puffs; i++) {
    // SPORADIC, AND MORE SO WITH HEIGHT. The lowest puff is always there —
    // smoke leaving a stack does not stutter at the mouth — and above it the
    // chance of a cell sitting the beat out grows one eighth per step, so the
    // crown of the plume is in pieces most bars and whole occasionally. It is
    // a beat-stepped pattern rather than a random one: same beat, same sky.
    if (i > 0 && (frame.beat4 * 3 + i * 5) % 8 < i) continue;
    const [px, py] = cells[i];
    // Each puff drifts on its own three-beat cycle, so they pull apart from
    // one another instead of shimmying in step.
    const wob = (((frame.beat4 + i) % 3) - 1) * 2;
    lcdPuffGrid(ctx, LCD_PUFFS[i], sx + px + wob, roof + py, 0.4 - i * 0.06);
  }
  // The stub only shows it is lit when the plant is working — under four
  // puffs on the tall stack the roof falls quiet but for the one column.
  if (puffs < 4) return;
  for (let k = 0; k < LCD_WISPS.length; k++) {
    if ((frame.beat4 * 5 + k * 3) % 4 === 1) continue;
    lcdPuffGrid(ctx, LCD_WISPS[k], stubX + (k === 0 ? -1 : -5) + (frame.beat4 % 2) * 2,
      stubTop - 1 + (k === 0 ? -6 : -14), 0.28 - k * 0.08);
  }
}

// SMOKE HAS A CORE. A puff painted at one alpha is a grey rectangle with a
// ragged edge — the eye reads a smudge, not a volume — so the grids carry two
// inks: `X` is the fringe and `O` the thicker middle, half again as dense. Two
// passes rather than two colours, so the puffs still sit on the panel's own
// blue-grey and still stack correctly where they overlap.
function lcdPuffGrid(ctx, grid, x, y, alpha) {
  for (const [mark, weight] of [['X', 1], ['O', 1.55]]) {
    ctx.fillStyle = `rgba(53,83,101,${Math.min(0.75, alpha * weight).toFixed(2)})`;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === mark) ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
      }
    }
  }
}

// ---- the pixel plane ----------------------------------------------------
//
// An 11x6 coarse-pixel aeroplane that crosses the sky once every sixteen
// bars, 14px per heard beat, flying INTO the cloud wind so the sky has two
// speeds. The propeller is a two-cell blur alternating on the beat, and the
// tail wears the panel's one red. Idle and reduced-motion frames sit at beat
// 0, where the plane is still off-screen — a parked sky stays parked.
//
// The ALTITUDE is scene data, because the one thing a flight lane has to clear
// is whatever the scene put on its tallest roof. A NUMBER is a level crossing
// at that y. An OBJECT — { from, to, level } — is a CLIMB: the plane enters
// low at `from`, gains height as it crosses, and is level at `to` by the time
// it reaches screen x `level`.
//
// Stage 1 climbs, and the beat ribbon is why. The strip used to end at y 38
// and the plane flew along that line, in the last of the sky above it. The
// ribbon is twice the size now and ends at 49, so that lane is inside the
// strip — and the only clear air left on this panel is the slot BELOW the
// ribbon and ABOVE the skyline. That slot is 15px tall at the one place it
// matters (the ribbon at 49, the gorilla's head topping out at 64) and the
// plane's body is 12, so a level crossing at that height would spend the whole
// left half of the panel ploughing through roofs to earn three spare pixels
// over the gorilla. Climbing spends the room where there is room: in low over
// the short buildings on the left, up over the transmitter mast, level from
// the tower onward with its belly just clear of the gorilla's head.
//
// That is the lane the crossing that TAKES THE BARREL flies. A crossing that
// misses climbs higher over the same skyline — see LCD_PLANE_MISS_LIFT.
const LCD_PLANE = [
  '.X.........',
  '.XX........',
  '.XXXXXXXX..',
  'XXXOXOXOXX.',
  '.XXXXXXXXX.',
  '....XX.....',
];
const LCD_PLANE_Y = 46;
// The climb, as a fraction of the way from the entry x to the levelling-off x.
// Eased rather than linear so the plane rotates out of the climb instead of
// hitting its cruise height and stopping dead on one beat — the panel steps
// every cell it draws, and a corner in a flight path reads as a mistake where a
// corner in a walk cycle reads as the toy working.
// Snapped to the panel's 2px grid by its caller, like every other cell it
// draws: the plane is beat-stepped rather than continuous, so that is one fixed
// altitude per step and not a rounding that judders under a moving camera.
function planeClimb({ from, to, level }, x) {
  const k = Math.max(0, Math.min(1, (x - LCD_PLANE_X0) / (level - LCD_PLANE_X0)));
  return from + (to - from) * k * (2 - k);
}
// Where the plane enters, how far it moves per heard beat, how long it is on
// screen, and how big its body is. Named because three things now measure
// against them: the crossing, the climb, and the barrel it is going to hit.
const LCD_PLANE_X0 = -30, LCD_PLANE_STEP = 14, LCD_PLANE_BEATS = 44;
const LCD_PLANE_W = 22, LCD_PLANE_H = 12;

// Where the plane is on a given step of its crossing, or null once it has gone.
// The one place the flight path is solved, so the barrel's fate and the plane's
// own draw cannot disagree about where it was.
function lcdPlaneAt(cyc, altitude) {
  if (cyc >= LCD_PLANE_BEATS) return null;
  const x = LCD_PLANE_X0 + cyc * LCD_PLANE_STEP;
  const y = typeof altitude === 'number' ? altitude
    : 2 * Math.round(planeClimb(altitude, x) / 2);
  return { x, y };
}
// ---- the banner pass ------------------------------------------------------
//
// A plane over a city tows an advert, and this one tows the only announcement
// a rhythm cabinet could make: the song is about to change key. The bar it
// changes on is AUTHORED, in the scene's own `plane.banner`, and it has to be:
// this arrangement moves its transpose eight times in seventy-six bars, most of
// them two-bar colour shifts, and which of those is THE modulation is a
// musical judgement rather than a fact the data states. tests/lcd-background.js
// keeps the authored bar standing on a transpose the song really makes.
//
// The pass is aimed so the rig is DEAD CENTRE on the downbeat it announces —
// the words at their most readable on the bar they are about it. It flew a full
// crossing earlier at first, clearing the frame as the key landed, and that was
// the wrong instinct: an announcement that has left before the thing happens is
// a thing nobody read. `lcdBannerStart` solves the step from the rig's own
// length, so a shorter line still lands mid-screen on the beat.
const LCD_PLANE_CYCLE = 64;
// One panel pixel per glyph cell, not two. Every other mark on this panel is a
// 2px cell, and at that size ten letters would be a hundred and twenty pixels
// of banner on a four-hundred-and-eighty pixel sky — a quarter of the display,
// and taller than the aircraft towing it. The plane's own tail tick is already
// 1px, so the fine grid is not new here; it is what letters need.
const LCD_BANNER_PAD = 1;
const LCD_BANNER_GAP = 6;     // tow line, plane tail to banner
// A BANNER MAY CARRY A PICTURE INSTEAD OF A LETTER, and one does. The font's
// own heart is a battery cell — a small solid blob at five wide — and what was
// asked for is the OTHER heart, the seven-by-seven container off an adventure
// game's status bar, which is a different shape and is red rather than ink.
// Keyed by the character that stands for it in a tow line, so the data stays a
// plain string and the rotation stays a list of them.
// THE THREE VERBS, as the same shapes the ribbon and the road already draw.
//
// A up-arrow to jump, a down-arrow to duck, a ring for the hero's power — and
// they are here rather than composed from the letters because the whole point
// of the legend is the SHAPE beside the WORD. The player is going to meet these
// three marks on the beat ribbon four and a half beats before every ask and
// again on the road under their feet, both built on the law that the direction
// is read off the shape and the colour only confirms which object is arriving
// (beatground.js). Nothing on this cabinet ever states that law. One crossing
// does, once, and then the sky is a sky again.
//
// SEVEN CELLS, like the heart and unlike the letters' five: these are pictures,
// and a triangle drawn five wide next to a five-wide K is a letterform. The
// extra two are what make the eye take it as a sign rather than a glyph.
//
// Their INK comes from the run, not from here — see lcdBannerMark. The ribbon
// and the road read one list of action colours and this is the third surface
// on it; a fourth copy of those four values in the engine is how they start
// disagreeing about what colour a jump is.
const LCD_BANNER_ART = {
  '▲': {
    ink: LCD_PRINT,
    cells: [
      '...X...',
      '..XXX..',
      '..XXX..',
      '.XXXXX.',
      '.XXXXX.',
      'XXXXXXX',
      'XXXXXXX',
    ],
  },
  '▼': {
    ink: LCD_PRINT,
    cells: [
      'XXXXXXX',
      'XXXXXXX',
      '.XXXXX.',
      '.XXXXX.',
      '..XXX..',
      '..XXX..',
      '...X...',
    ],
  },
  '○': {
    ink: LCD_PRINT,
    cells: [
      '..XXX..',
      '.X...X.',
      'X.....X',
      'X.....X',
      'X.....X',
      '.X...X.',
      '..XXX..',
    ],
  },
  '♥': {
    ink: LCD_WINDOW_ON,
    cells: [
      '.XX.XX.',
      'XXXXXXX',
      'XXXXXXX',
      'XXXXXXX',
      '.XXXXX.',
      '..XXX..',
      '...X...',
    ],
  },
};
const LCD_BANNER_TRACK = 1;
/**
 * Which character stands for which verb in a tow line.
 *
 * Exported so the run can compose the legend without hardcoding the marks, and
 * so the SHAPES stay the panel's business while WHICH VERBS and WHAT THEY ARE
 * CALLED stay the game's. Neither side can drift: a verb with no entry here
 * cannot be announced, and an entry with no cells cannot be drawn.
 */
export const LCD_ACTION_GLYPH = { jump: '▲', duck: '▼', ability: '○' };
// `ink` is the run's own action-colour map, keyed by the same character the tow
// line carries, or null. It overrides a PICTURE cell's authored colour and
// never a letter's: the words on a banner are printed matter and print on this
// panel is one colour, but the three verb marks have to agree with the two
// surfaces that will draw them again.
function lcdBannerMark(ch, ink = null) {
  const art = LCD_BANNER_ART[ch];
  if (art) return { rows: art.cells, w: art.cells[0].length, ink: ink?.[ch] || art.ink, on: 'X' };
  const rows = ch === ' ' ? null : pixelGlyph(ch);
  return { rows, w: 5, ink: LCD_PRINT, on: '1' };
}
function lcdBannerBox(text) {
  let w = LCD_BANNER_PAD * 2 + 2;
  for (const ch of text) w += lcdBannerMark(ch).w + LCD_BANNER_TRACK;
  return { w: w - LCD_BANNER_TRACK, h: 7 + LCD_BANNER_PAD * 2 + 2 };
}
function lcdSkyBanner(ctx, rightX, midY, text, ink = null) {
  const { w, h } = lcdBannerBox(text);
  const x = Math.round(rightX - w);
  const y = Math.round(midY - h / 2);
  ctx.fillStyle = LCD_PANEL_LIT;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  let cx = x + 1 + LCD_BANNER_PAD;
  const cy = y + 1 + LCD_BANNER_PAD;
  for (const ch of text) {
    const mark = lcdBannerMark(ch, ink);
    if (mark.rows) {
      ctx.fillStyle = mark.ink;
      for (let r = 0; r < mark.rows.length; r++) {
        for (let c = 0; c < mark.w; c++) {
          if (mark.rows[r][c] === mark.on) ctx.fillRect(cx + c, cy + r, 1, 1);
        }
      }
    }
    cx += mark.w + LCD_BANNER_TRACK;
  }
}

// WHERE THE ANNOUNCEMENT'S PASS STARTS, so the rig is mid-screen on the beat it
// announces. Solved from the geometry rather than set by hand: the rig runs from
// the banner's left edge to the plane's nose, and the step of the crossing that
// puts the middle of THAT on the middle of the display depends on how long the
// words are. A shorter banner is a shorter rig and starts a beat later.
function lcdBannerStart(keyBeat, text) {
  const rigLeft = -LCD_BANNER_GAP - lcdBannerBox(text).w;
  const centreOff = (rigLeft + LCD_PLANE_W) / 2;
  const cyc = Math.round((W / 2 - centreOff - LCD_PLANE_X0) / LCD_PLANE_STEP);
  return keyBeat - Math.max(0, Math.min(LCD_PLANE_BEATS - 1, cyc));
}

// Whether an ordinary crossing takes off at all.
//
// ONE crossing gives way to the announcement, not two, and the difference is a
// dead line in the rotation. Grounding everything that overlaps the banner pass
// grounds the crossing before it AND the one after — and this song's form loops
// bars 21 to 76, which is three and a half crossings long, so with two of them
// grounded the sky only ever had room for two of the three lines and the third
// was never once flown.
//
// So what gives way is the crossing that would still be MID-SKY when the
// announcement opens. One starting after it is a plane entering at the left
// while the banner leaves at the right, which is a busy sky rather than a
// broken one — the thing that cannot happen is two rigs crossing each other.
const LCD_PLANE_SHARE_CLEAR = 30;
function lcdFreePassFlies(pass, start) {
  if (start == null) return true;
  const from = pass * LCD_PLANE_CYCLE;
  if (from < start) return from + LCD_PLANE_BEATS <= start;
  return from >= start + LCD_PLANE_SHARE_CLEAR;
}

/**
 * Which line THIS crossing tows.
 *
 * Counted in crossings FLOWN, not in slots of the clock, and that distinction is
 * the whole of this function. Off the raw pass number the grounded crossing
 * still consumes a line — with three lines and the third pass grounded, the
 * fourth comes back round to the first and the third line is never once in the
 * sky. Counting what actually flew hands every line its turn.
 *
 * The first crossing of the song flies CLEAN, which is why the count is offset
 * by one: a panel whose every plane tows a sign has no plane in it, only signs.
 * That opener establishes what the thing is — tail wagging, nothing behind it —
 * and every crossing after it is the same aircraft having been sold advertising.
 * The song's own loop starts at bar 21, so pass zero happens once and never
 * again.
 */
// How many free crossings actually got off the ground before this one.
function lcdFlownBefore(passNo, start) {
  let flown = 0;
  for (let p = 0; p < passNo; p++) if (lcdFreePassFlies(p, start)) flown++;
  return flown;
}

function lcdTowLine(towList, passNo, start) {
  if (!towList || !towList.length || passNo <= 0) return null;
  const flown = lcdFlownBefore(passNo, start);
  return flown > 0 ? towList[lcdMod(flown - 1, towList.length)] : null;
}

// HOW MANY BEATS LATE THIS CROSSING TAKES OFF, one entry per crossing flown.
//
// It is the whole of "the plane only sometimes gets the barrel", and it works
// horizontally because vertically there is nothing to work with: the slot
// between the beat ribbon's band and the gorilla's skull is twelve pixels, the
// plane is twelve pixels, and the raised barrel is inside it — there is no
// altitude that misses, which is why the panel never tried one.
//
// So the plane is somewhere else instead. The barrel is only up on beat one,
// the crossing steps 14px a beat, and the overlap window either side of the
// gorilla is 19px — so the barrel-up beats land the plane at 56px intervals and
// only some of those intervals fall on him. Taking off ONE beat late moves
// every barrel-up beat of the crossing 14px along and the whole pass misses;
// two late, likewise; three late brings the next barrel-up beat back onto him.
// [0, 1, 2] is therefore one strike in three, and the strike is still the same
// authored moment of the crossing it always was — the gag did not become a
// collision, it became occasional.
const LCD_PLANE_DODGE = [0, 1, 2];

// AND A PASS WITH NO BARREL TO TAKE FLIES OVER HIM, not past his ear.
//
// The dodge above is horizontal because vertically there was nothing to spend:
// the slot between the ribbon's band and the skull was twelve pixels and the
// plane is twelve. The strip gave six of those back when it thinned
// (BEAT_RIBBON_BOTTOM was 49), and this is what that room is for. The STRIKING crossing still flies the
// authored lane — the gag is the plane in the barrel and it cannot be flown any
// other way — and the two that miss climb clear of it. Which is the difference
// between a plane that missed and a plane that nearly didn't; at eight pixels a
// miss read as a near miss every time, and a gag that always looks like it
// half-connected has no clean pass to be measured against.
//
// TEN, AND THE GORILLA PAID FOR FOUR OF THEM. Six is what the ribbon freed, and
// spending only that put the lane hard under the strip — a plane touching the
// thing above it is the same crowded reading at the other end. So the tower lost
// four as well (gameWatch 118 -> 114) and the striking lane came down four with
// it, which leaves the contact identical and moves the gorilla out from under
// the miss instead. Cruise top 56 -> 46: clear air under the strip above it, and
// eighteen over his skull instead of eight.
const LCD_PLANE_MISS_LIFT = 10;
// The lane THIS crossing flies. Lifted only where the scene stages the strike
// at all (stage 3's plane passes BEHIND its gorilla and has no barrel to meet)
// and only on the phases that miss — and the lift cannot turn a miss into a
// hit, because it only ever moves the plane further from the barrel, so the
// strike is still solved once off the authored lane and nothing downstream of
// it has to know this happened.
const lcdLiftedLane = new WeakMap();

/**
 * The step of this crossing on which the plane meets the barrel, or -1.
 *
 * A PASS TOWING INSTRUCTIONS NEVER STRIKES, and that is the only thing this
 * adds over lcdBarrelStrike. rhythm-1's opening crossing is the one that flies
 * into the gorilla's raised barrel — it connects on beat 20 of the song, which
 * is the middle of the legend's own sky time. Left alone, the one crossing the
 * player is being asked to READ is also the one that detonates a barrel over
 * their head, throws a star and twelve beats of missing chain, and puts the
 * words inside the wreck. The gag is good and it is not what the top of the
 * stage is for; it still runs twice later in the song, at 240 and 276.
 *
 * Returning -1 does the whole job rather than half of it, because everything
 * about the strike hangs off this one number: lcdPassAltitude lifts a
 * non-striking pass into the miss lane (ten pixels of clear air over his skull
 * instead of eight), lcdBurstPhase draws no wreck, lcdVanishedBarrelCell leaves
 * the girder chain whole, and lcdBarrelStrikeAt fires no cue. So the legend
 * crossing does not merely fail to destroy the barrel — it flies the lane of a
 * plane that was never going to.
 */
function lcdPassStrike(art, pass) {
  return pass.legend ? -1 : lcdBarrelStrike(art, pass.phase);
}
function lcdPassAltitude(art, pass, altitude) {
  if (!art.gameWatch || lcdPassStrike(art, pass) >= 0) return altitude;
  if (typeof altitude === 'number') return altitude - LCD_PLANE_MISS_LIFT;
  let lifted = lcdLiftedLane.get(altitude);
  if (!lifted) {
    lifted = {
      from: altitude.from - LCD_PLANE_MISS_LIFT,
      to: altitude.to - LCD_PLANE_MISS_LIFT,
      level: altitude.level,
    };
    lcdLiftedLane.set(altitude, lifted);
  }
  return lifted;
}

/**
 * WHICH PASS THE PLANE IS ON, or null while the sky is its own.
 *
 * One answer for the draw and for the barrel it is going to hit, because the
 * gag is authored against the step of the crossing and the two may not disagree
 * about which step that is.
 *
 * Ordinarily the crossing free-runs every sixteen bars. When the scene names a
 * banner bar, one pass is nailed to it instead — and the free-running one is
 * suppressed anywhere it would still be in the air when the announcement is
 * due, because a plane that vanished mid-sky to let another one in is two
 * planes, and this panel only ever has one of anything.
 */
function lcdPlaneCyc(art, frame) {
  const beat = frame.bar * 4 + frame.beat4;
  const plane = art && art.plane;
  const banner = plane && plane.banner;
  const cyc = lcdMod(beat, LCD_PLANE_CYCLE);
  // Which line this crossing is carrying. Off the pass NUMBER, not off the beat
  // inside it, or the banner would change words halfway across the sky.
  //
  // THE FIRST CROSSING OF THE SONG FLIES CLEAN, and that is the whole reason
  // the plain aircraft is still worth drawing. A panel whose every plane tows a
  // sign has no plane in it, only signs — the first pass establishes what the
  // thing IS, tail wagging and nothing behind it, and every one after it is
  // that same aircraft having been sold advertising. The song's own loop starts
  // at bar 21, so pass zero happens once, at the top, and never again.
  const towList = plane && plane.tow
    ? (Array.isArray(plane.tow) ? plane.tow : [plane.tow]) : null;
  const passNo = Math.floor(beat / LCD_PLANE_CYCLE);
  // Authored bars are 1-based, the way the desk counts them; the panel's beat
  // clock starts at zero.
  const keyBeat = banner && Number.isFinite(banner.bar) ? (banner.bar - 1) * 4 : null;
  const start = keyBeat == null ? null : lcdBannerStart(keyBeat, banner.text);
  if (start != null) {
    // The announcement pass is NOT dodged. It is aimed so the words are dead
    // centre on the downbeat they are about, and a beat of delay is the one
    // thing that would take them off it. Its phase is wherever that aim put it.
    if (beat >= start && beat < start + LCD_PLANE_BEATS) {
      return { cyc: beat - start, banner: banner.text, phase: lcdMod(start, 4) };
    }
    if (cyc >= LCD_PLANE_BEATS) return null;
    if (!lcdFreePassFlies(passNo, start)) return null;
  } else if (cyc >= LCD_PLANE_BEATS) return null;
  // A free crossing takes off late by its turn in the dodge rotation. The
  // rotation is indexed by crossings FLOWN, the same count the tow lines use,
  // so a line and the dodge it flies with travel together — and a grounded
  // crossing consumes neither.
  const flown = lcdFlownBefore(passNo, start);
  const dodge = LCD_PLANE_DODGE[lcdMod(flown, LCD_PLANE_DODGE.length)];
  if (cyc < dodge || cyc - dodge >= LCD_PLANE_BEATS) return null;
  // AND THE CLEAN CROSSING IS THE ONE THAT CARRIES THE LEGEND, on the stages
  // and runs that have one to carry.
  //
  // Pass zero was kept empty so the panel would have a plane in it and not only
  // signs — it happens once, at the top, and never again. That is exactly the
  // shape of the thing a legend is: said once, at the top, and never again. So
  // the establishing pass is not spent, it is given a job, and the fifteen
  // crossings after it still do the establishing work by rotation.
  //
  // `legend` rides on the pass rather than being inferred from the text,
  // because everything downstream that has to treat this crossing differently
  // is asking a question about the PASS — see lcdPassStrike.
  const legend = passNo === 0 ? frame.intro?.legend : null;
  // The cycle is a multiple of four, so the crossing's phase in the bar IS its
  // dodge.
  if (legend) return { cyc: cyc - dodge, banner: legend.text, ink: legend.ink, legend: true, phase: lcdMod(dodge, 4) };
  return { cyc: cyc - dodge, banner: lcdTowLine(towList, passNo, start), phase: lcdMod(dodge, 4) };
}

function lcdPlane(ctx, art, frame, altitude = LCD_PLANE_Y) {
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return;
  const pos = lcdPlaneAt(pass.cyc, lcdPassAltitude(art, pass, altitude));
  if (!pos) return;
  const { x, y } = pos;
  // The banner first, so the tow line runs under the tail rather than over it.
  if (pass.banner) {
    // A towed banner sags and lifts; one pixel on the off beats is the whole of
    // it, and it is the same tick the tail already wags on.
    const sag = frame.beat4 % 2 === 0 ? 0 : 1;
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(x - LCD_BANNER_GAP, y + 6, LCD_BANNER_GAP, 1);
    lcdSkyBanner(ctx, x - LCD_BANNER_GAP, y + 6 + sag, pass.banner, pass.ink);
  }
  for (let r = 0; r < LCD_PLANE.length; r++) {
    for (let c = 0; c < LCD_PLANE[r].length; c++) {
      const cell = LCD_PLANE[r][c];
      if (cell === '.') continue;
      ctx.fillStyle = cell === 'O' ? LCD_PANEL_LIT : LCD_PRINT;
      ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
    }
  }
  ctx.fillStyle = LCD_WINDOW_ON;
  ctx.fillRect(x + 2, y, 2, 2);
  // The tail's own wag, and only when there is no banner: with one on the tow
  // line this reads as a second, blank flag flying off the nose.
  if (pass.banner) return;
  ctx.fillStyle = LCD_PRINT_SOFT;
  if (frame.beat4 % 2 === 0) ctx.fillRect(x + 22, y + 3, 1, 8);
  else ctx.fillRect(x + 22, y + 5, 1, 4);
}

// ---- the barrel the plane takes out ---------------------------------------
//
// The plane's lane runs between the beat ribbon's band and the gorilla's skull
// (see the flight lane above), and the barrel he holds over his head is inside
// that gap. There is no altitude that misses it. So it does not miss it: once
// every sixteen bars the plane flies into the barrel and the barrel goes.
//
// This is AUTHORED, not a collision. Both bodies step on the heard beat off
// fixed numbers, so the step they meet on is solved once from the scene and is
// the same every cycle — and it lands on a downbeat, because the barrel is only
// up on beat one. A Game & Watch panel does not do physics; it does the same
// gag at the same moment of the loop forever, and the player learns to watch
// for it. Two cells: the strike, then the staves flung out and already ghosting.
const LCD_BARREL_UP_BEAT = 0, LCD_BARREL_UP_DY = -50;
const LCD_BARREL_RX = 8, LCD_BARREL_RY = 7;
// Offsets in 2px cells from the barrel's centre.
const LCD_BURST_STAR = [
  [0, -3], [0, -2], [0, 2], [0, 3], [-3, 0], [-2, 0], [2, 0], [3, 0],
  [-2, -2], [2, -2], [-2, 2], [2, 2], [-1, -1], [1, -1], [-1, 1], [1, 1],
];
const LCD_BURST_DEBRIS = [
  [-6, -4], [-5, -5], [6, -4], [5, -5], [-6, 4], [-5, 5], [6, 4], [5, 5],
  [0, -6], [0, 6],
];

// Which step of the crossing puts the plane inside the raised barrel, or -1 if
// the two never meet. Solved by walking the flight path rather than tested per
// frame: both sides are authored constants, so the answer is a property of the
// scene and is cached on it.
// `phase` is where the crossing's own step 0 falls in the bar — 0 for a pass
// that took off on a downbeat, 1 for one a beat late, and so on. It is what
// makes the gag occasional: the barrel is up on beat one of the bar and the
// plane's position is counted from take-off, so a crossing that started late
// arrives at every barrel-up beat somewhere else. Solved per phase, and cached
// per phase, because it is still a property of the scene and not of a frame.
const lcdStrikeCache = new WeakMap();
function lcdBarrelStrike(art, phase = 0) {
  let byPhase = lcdStrikeCache.get(art);
  if (!byPhase) lcdStrikeCache.set(art, byPhase = new Map());
  const key = lcdMod(phase, 4);
  if (byPhase.has(key)) return byPhase.get(key);
  let strike = -1;
  if (art.plane && art.gameWatch) {
    const [gx, gw, gh] = art.gameWatch;
    const bx = Math.round(gx + gw / 2), by = GROUND_Y - gh + LCD_BARREL_UP_DY;
    for (let cyc = 0; cyc < LCD_PLANE_BEATS && strike < 0; cyc++) {
      if (lcdMod(cyc + key, 4) !== LCD_BARREL_UP_BEAT) continue;
      const p = lcdPlaneAt(cyc, art.plane);
      if (p && Math.abs(bx - (p.x + LCD_PLANE_W / 2)) < LCD_PLANE_W / 2 + LCD_BARREL_RX
        && Math.abs(by - (p.y + LCD_PLANE_H / 2)) < LCD_PLANE_H / 2 + LCD_BARREL_RY) strike = cyc;
    }
  }
  byPhase.set(key, strike);
  return strike;
}

// 0 on the beat of the strike, 1 on the beat after, -1 the rest of the time.
function lcdBurstPhase(art, frame) {
  // Off the pass the plane is ACTUALLY on. The gag is solved in steps of the
  // crossing, and a banner pass is a crossing like any other — read against the
  // free-running clock instead, the barrel would burst on a beat with nothing
  // in the sky to burst it.
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return -1;
  const strike = lcdPassStrike(art, pass);
  if (strike < 0) return -1;
  const phase = pass.cyc - strike;
  return phase === 0 || phase === 1 ? phase : -1;
}

// AND THE THROW THAT NEVER HAPPENS. `lcdBurstPhase` covers the two beats of
// wreckage over the gorilla's head; this covers the twelve after it. The barrel
// the plane destroyed is the one he was about to send down the tower, so it is
// missing from the girder chain for the whole descent it would have made —
// cell index 0 on the beat of the strike, 1 on the next, and so on. Returns the
// cell the chain is short of, or -1. Without this he is empty-handed on the
// roof while the barrel he is not holding rolls down the face underneath him.
// THE ONE THING THE CITY TELLS THE RUN. Everything else here flows the other
// way — the panel is told the beat and paints itself — but the crash is a
// sound as well as a picture, and only this file knows which beat of the loop
// the plane and the barrel meet on. Given a stage and an absolute beat, is
// this the beat the barrel goes? The run asks once per beat and fires the cue;
// nothing about the drawing depends on the answer.
/**
 * Where the barrel chute stands on the panel, in screen px, or null on a stage
 * that has no chute.
 *
 * The run needs it to work out WHEN a lane barrel is at the foot of the chute,
 * and it is derived from the same building the painter uses rather than written
 * down twice — move the gorilla and both ends move together, which is the whole
 * reason this is a function and not a constant in run.js.
 */
export function lcdChuteScreenX(stageIndex) {
  const art = LCD_CITY_SCENES[Math.max(1, Math.min(3, Math.trunc(stageIndex) || 1))];
  if (!art?.barrelDrop || !Number.isInteger(art.rooftopGorilla)) return null;
  const [gx, gw] = art.buildings[art.rooftopGorilla];
  return gx + gw + 9;
}

/**
 * Where the rooftop gorilla's HEAD sits on the panel, in screen px, or null on
 * a stage without one. The gallery crops his face out of the real panel with
 * it rather than writing his address down a second time.
 */
export function lcdGorillaHeadPos(stageIndex) {
  const art = LCD_CITY_SCENES[Math.max(1, Math.min(3, Math.trunc(stageIndex) || 1))];
  // Stage 1 stands him on the DONKEY KONG tower, stage 3 on a plain rooftop —
  // same painter, two addresses, and the caller should not have to know which.
  const spec = Number.isInteger(art?.rooftopGorilla)
    ? art.buildings[art.rooftopGorilla] : art?.gameWatch;
  if (!spec) return null;
  const [gx, gw, gh] = spec;
  return { x: Math.round(gx + gw / 2), y: GROUND_Y - gh - 31 };
}

// How many cells the barrel chute has, and so how many beats early the lane has
// to name a barrel for the drop to be drawn whole. Four cells is a bar, and the
// delivery — top cell to street — is the three steps between them.
const LCD_CHUTE_CELLS = 4;
/** How many heard beats the chute takes to deliver, top cell to street. */
export const LCD_CHUTE_BEATS = LCD_CHUTE_CELLS - 1;

/**
 * Does the plane meet the barrel on this beat?
 *
 * `intro` is the run's scene intro, or null — the same object the panel is
 * drawing with. It has to be handed over rather than assumed, because the
 * opening crossing is precisely the one that strikes on rhythm-1 and it is also
 * the one that tows the legend: the cue and the picture have to agree about
 * whether that plane connected, and a caller that only knew the beat would fire
 * a barrel burst over a sky with no wreck in it.
 */
export function lcdBarrelStrikeAt(stageIndex, beat, intro = null) {
  if (!Number.isFinite(beat)) return false;
  const art = LCD_CITY_SCENES[Math.max(1, Math.min(3, Math.trunc(stageIndex) || 1))];
  if (!art) return false;
  // Asked of the same crossing the picture is drawing, so the cue cannot fire
  // on a pass where nothing was destroyed. lcdPlaneCyc reads only these three
  // fields of a frame.
  const b = Math.floor(beat);
  const pass = lcdPlaneCyc(art, { bar: Math.floor(b / 4), beat4: lcdMod(b, 4), intro });
  if (!pass) return false;
  const strike = lcdPassStrike(art, pass);
  return strike >= 0 && pass.cyc === strike;
}

function lcdVanishedBarrelCell(art, frame) {
  // Counted within the crossing that did the destroying, not against a
  // free-running clock: on a pass that missed there is no wreck and no gap in
  // the chain, and the twelve beats are the twelve after THIS plane's strike.
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return -1;
  const strike = lcdPassStrike(art, pass);
  if (strike < 0) return -1;
  const since = pass.cyc - strike;
  return since >= 0 && since < 12 ? since : -1;
}

function lcdBarrelBurst(ctx, bx, by, phase, reducedFlashing) {
  const x = Math.round(bx), y = Math.round(by);
  // The staves go out in PRINT_SOFT, not the motion ghost. A ghost cell on this
  // panel means "a position this thing also occupies" — the off frames of a
  // cycle — and the wreck is not that: it is the one beat of debris, receding
  // but real, and at ghost alpha it was not there at all.
  ctx.fillStyle = phase === 0
    ? (reducedFlashing ? LCD_PRINT : LCD_WINDOW_ON) : LCD_PRINT_SOFT;
  for (const [cx, cy] of phase === 0 ? LCD_BURST_STAR : LCD_BURST_DEBRIS) {
    ctx.fillRect(x + cx * 2 - 1, y + cy * 2 - 1, 2, 2);
  }
  if (phase !== 0) return;
  // The one gold cell the barrel wore, thrown clear of its own wreck.
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(x - 1, y - 9, 2, 2);
}

// ---- the searchlight ----------------------------------------------------
//
// A rooftop lamp sweeping the sky in eight authored angles, one per heard
// beat, bouncing at the ends rather than snapping back — a lamp that jumped
// from one end to the other would read as two lamps. The beam is a wedge of
// 2px cells stepping outward from the lens, ghosted at the angles it is not
// on, exactly like the transmitter's rings.
const LCD_BEAM_ANGLES = [-1.22, -1.05, -0.88, -0.71, -0.54, -0.71, -0.88, -1.05];
function lcdSearchlight(ctx, building, dx, frame, reducedFlashing) {
  const [x, , h] = building;
  const roof = GROUND_Y - h;
  const sx = Math.round(x + dx);
  // The housing: a squat box on a swivel, the lens end lit on the downbeat.
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(sx - 4, roof - 5, 8, 5);
  ctx.fillRect(sx - 1, roof - 8, 2, 3);
  ctx.fillStyle = !reducedFlashing && frame.beat4 === 0 ? LCD_WINDOW_ON : LCD_WINDOW_OFF;
  ctx.fillRect(sx - 2, roof - 10, 4, 3);
  const a = LCD_BEAM_ANGLES[lcdMod(frame.bar * 4 + frame.beat4, LCD_BEAM_ANGLES.length)];
  const ca = Math.cos(a), sa = Math.sin(a);
  // Cells marching up the beam, widening as they go: near cells are bright,
  // far ones fade into the sky the way a real beam loses itself.
  for (let d = 6; d < 86; d += 4) {
    const bx = sx + ca * d;
    const by = roof - 9 + sa * d;
    if (by < 10) break;
    const spread = Math.max(3, Math.round(d / 9)) * 2;
    ctx.fillStyle = `rgba(232,238,176,${(0.62 - d * 0.0058).toFixed(3)})`;
    ctx.fillRect(Math.round(bx - spread / 2), Math.round(by), spread, 4);
  }
}

// ---- the elevated train -------------------------------------------------
//
// A commuter service on a viaduct behind the skyline: one car-length per
// heard beat, right to left, windows lit like a facade's. It runs BEHIND the
// buildings (drawn before them would hide it entirely, so it goes after the
// skyline but sits high enough to read over the low roofs), and it is the one
// piece of this city that is unambiguously still working.
//
// THE RAIL AND THE TRAIN ARE TWO DIFFERENT THINGS, and they used to be one
// function that drew both or neither. The viaduct is masonry: it stands from
// the first frame of the stage whether or not anything is running on it, so it
// is baked in with the facades (lcdViaduct). Only the cars answer to the beat,
// and they are an EVENT — see the lap below.
const LCD_TRAIN_CAR = 26;
// A crossing takes twenty-two beats; the lap is forty-eight. The old lap was
// exactly the crossing, so there was a train on the panel about ninety percent
// of a run and four cars sat permanently across the billboards and the rooftop
// meters — the viaduct read as a smear rather than as a line something
// occasionally runs along. Half the bars go back to the skyline, and a train
// arriving is something you can notice arriving.
const LCD_TRAIN_LAP = 48;

// The viaduct: a girder with piers, printed soft so it reads as distance.
// Static, so it lives in the baked city layer, painted before the facades —
// every building in front of it then occludes it for free.
//
// THE PIERS STAND IN THE GAPS, not on the roofs. A pier is a leg of the far
// structure; drawn over a near roof it stopped being far away — over a
// billboard it came up between the sign's own legs and read as a third one,
// and over a tower whose roof is inside the pier's span it read as one more
// piece of rooftop kit. Both cases are skipped; what is left falls in open
// sky above the short roofs, which is where a distant viaduct's legs belong.
const LCD_PIER_DROP = 10;
function lcdPierClear(art, px) {
  const foot = art.train.y + 14 + LCD_PIER_DROP;
  for (let i = 0; i < art.buildings.length; i++) {
    const [x, w, h] = art.buildings[i];
    if (px + 2 <= x - 2 || px >= x + w + 2) continue;
    if (lcdCrowned(art, i)) return false;
    const roof = GROUND_Y - h;
    if (roof <= foot) return false;
  }
  return true;
}
function lcdViaduct(ctx, art) {
  const y = art.train.y;
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(0, y + 12, W, 2);
  for (let px = 8; px < W; px += 34) {
    if (lcdPierClear(art, px)) ctx.fillRect(px, y + 14, 2, LCD_PIER_DROP);
  }
}

function lcdTrain(ctx, spec, frame) {
  const { y, cars = 4 } = spec;
  const span = W + cars * LCD_TRAIN_CAR + 40;
  // Stepped off the LAP rather than off the span, which is what turns a
  // continuous belt of carriages into a service with a timetable: past the
  // crossing the head keeps walking left, every car culls, and the rail is
  // empty until the lap comes round.
  const head = span - lcdMod(frame.beatAbs, LCD_TRAIN_LAP) * LCD_TRAIN_CAR;
  for (let c = 0; c < cars; c++) {
    const cx = Math.round(head + c * LCD_TRAIN_CAR);
    if (cx > W + 4 || cx + LCD_TRAIN_CAR < -4) continue;
    ctx.fillStyle = 'rgba(70,121,137,0.5)';
    ctx.fillRect(cx, y, LCD_TRAIN_CAR - 4, 12);
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(cx, y + 11, LCD_TRAIN_CAR - 4, 2);
    // Four lit windows a car, and the front car wears a headlamp.
    ctx.fillStyle = 'rgba(220,228,154,0.7)';
    for (let wdw = 0; wdw < 4; wdw++) ctx.fillRect(cx + 3 + wdw * 5, y + 3, 3, 4);
    if (c === 0) { ctx.fillStyle = LCD_WINDOW_ON; ctx.fillRect(cx - 2, y + 5, 2, 3); }
  }
}

// ---- the window washer --------------------------------------------------
//
// A cradle winching up a facade, one authored stop per beat, with the little
// figure's squeegee arm swapping sides as he works. He gets four stops up the
// building and then, in the last phase of the run, the cradle tips and he
// hangs off one end — the city cannot afford the other cable either.
function lcdWasher(ctx, building, dx, frame) {
  const [x, , h] = building;
  const roof = GROUND_Y - h;
  const cx = Math.round(x + dx);
  const stops = [roof + 96, roof + 74, roof + 52, roof + 30];
  const stop = lcdMod(Math.floor((frame.bar * 4 + frame.beat4) / 2), stops.length);
  const y = stops[stop];
  const tipped = frame.phase >= 3;
  // Two cables from the roof down to the cradle.
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(cx - 7, roof, 1, y - roof);
  ctx.fillRect(cx + 7, roof, 1, y - roof + (tipped ? 9 : 0));
  ctx.fillStyle = LCD_PRINT;
  if (tipped) {
    // The cradle hangs by one end; he is holding on to the high corner.
    ctx.fillRect(cx - 8, y, 9, 2);
    ctx.fillRect(cx + 1, y + 5, 8, 2);
    ctx.fillStyle = '#22608c';
    ctx.fillRect(cx - 6, y + 2, 3, 6);
    ctx.fillStyle = '#f2c9a0';
    ctx.fillRect(cx - 6, y - 2, 3, 3);
    return;
  }
  ctx.fillRect(cx - 8, y, 17, 2);
  ctx.fillRect(cx - 8, y - 3, 1, 3);
  ctx.fillRect(cx + 8, y - 3, 1, 3);
  // The man: overalls, a face, and an arm that changes sides on the beat.
  ctx.fillStyle = '#22608c';
  ctx.fillRect(cx - 2, y - 6, 4, 6);
  ctx.fillStyle = '#f2c9a0';
  ctx.fillRect(cx - 2, y - 10, 4, 4);
  ctx.fillStyle = LCD_PRINT;
  const arm = frame.beat4 % 2 === 0 ? cx + 2 : cx - 5;
  ctx.fillRect(arm, y - 9, 3, 2);
}

// ---- the repossession helicopter ----------------------------------------
//
// The joke the cabinet is named for. A chopper crosses the sky on a cable,
// and the billboard it passes over LEAVES WITH IT: `art.billboards` is
// filtered against the chopper's take, so the sign that was on that roof is
// simply gone for the rest of the run. It arrives in the second half —
// nobody repossesses anything in the first twenty seconds.
const LCD_CHOPPER = [
  '..X.......',
  'XXXXXXXX..',
  '..XXXXXXX.',
  '.XXXXX....',
  '...X......',
];
function lcdChopperX(frame) {
  // Same movement arithmetic the plane uses: a cell per beat across a cycle
  // wider than the display, so it is off-screen most of the time.
  const cyc = lcdMod(frame.bar * 4 + frame.beat4, 40);
  return cyc >= 30 ? null : W + 20 - cyc * 18;
}
function lcdChopper(ctx, frame, taken) {
  const x = lcdChopperX(frame);
  if (x == null) return;
  const y = 30;
  for (let r = 0; r < LCD_CHOPPER.length; r++) {
    for (let c = 0; c < LCD_CHOPPER[r].length; c++) {
      if (LCD_CHOPPER[r][c] === '.') continue;
      ctx.fillStyle = LCD_PRINT;
      ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
    }
  }
  // Rotor: a two-cell blur alternating on the beat, and a tail rotor.
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(x + (frame.beat4 % 2 ? 0 : 4), y - 3, 14, 1);
  ctx.fillRect(x + 16, y + 1, 1, 5);
  // The cable, and whatever is on the end of it.
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(x + 5, y + 10, 1, 16);
  if (taken) {
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(x - 4, y + 26, 20, 12);
    ctx.fillStyle = 'rgba(220,228,154,0.45)';
    ctx.fillRect(x - 2, y + 28, 16, 8);
  }
}

// ---- the transmitter mast -----------------------------------------------
//
// A lattice radio mast on one rooftop, beaming ON the beat: four authored
// signal rings stand in the sky above the beacon, all four printed as faint
// off-cells, and the one the beat is on lit — so the broadcast walks outward
// a step per beat and snaps home on the downbeat, exactly like the window
// cells. Reduced flashing keeps the mast and the printed rings but leaves the
// beacon and the lit ring in their composed state.
// The four authored ring sizes, widest last, each an upper arc in 2px cells.
const LCD_RINGS = [
  ['.XXX.', 'X...X'],
  ['..XXXXX..', '.X.....X.', 'X.......X'],
  ['...XXXXXXX...', '..X.......X..', '.X.........X.', 'X...........X'],
  ['....XXXXXXXXX....', '..XX.........XX..', '.X.............X.', 'X...............X'],
];
function lcdTransmitter(ctx, building, frame, reducedFlashing) {
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const roof = GROUND_Y - h;
  const top = roof - 24;
  ctx.fillStyle = LCD_PRINT_SOFT;
  for (const [lx, ly, lw, lh] of [
    [cx - 4, roof - 6, 9, 1], [cx - 3, roof - 13, 7, 1], [cx - 2, roof - 19, 5, 1],
  ]) ctx.fillRect(lx, ly, lw, lh);
  ctx.strokeStyle = LCD_PRINT_SOFT;
  ctx.lineWidth = 1;
  lcdStrokePath(ctx, [[cx - 5, roof], [cx - 1, top]]);
  lcdStrokePath(ctx, [[cx + 5, roof], [cx + 1, top]]);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(cx - 1, top - 3, 2, 4);
  // The beacon, lit on the downbeat.
  ctx.fillStyle = !reducedFlashing && frame.beat4 === 0 ? LCD_WINDOW_ON : LCD_WINDOW_OFF;
  ctx.fillRect(cx - 2, top - 7, 4, 4);
  // PIXEL rings on the billboards' own 2px grid — authored arc blobs, not
  // stroked curves, so the broadcast wears the same resolution as the signs.
  const cy = top - 5;
  for (let i = 0; i < LCD_RINGS.length; i++) {
    const grid = LCD_RINGS[i];
    // The live ring still steps on the beat; how far the broadcast CARRIES is
    // the treble's business, so a bright bar pushes a second ring out behind
    // the first and a dull one keeps it close to the mast.
    const reach = frame.audio ? Math.round((frame.audio.treble || 0) * 2.2) : 0;
    const carried = i > frame.beat4 && i <= frame.beat4 + reach;
    ctx.fillStyle = i === frame.beat4
      ? (reducedFlashing ? LCD_PRINT_SOFT : LCD_WINDOW_ON)
      : carried ? 'rgba(53,83,101,0.3)' : LCD_MOTION_GHOST;
    const ox = cx - grid[0].length;
    const oy = cy - [9, 15, 21, 27][i];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 'X') ctx.fillRect(ox + c * 2, oy + r * 2, 2, 2);
      }
    }
  }
}

// One cogwheel of the machinery a pit opens onto: eight square teeth on a dark
// disc, with a printed hub so the wheel reads as a part and not a blot. Drawn
// in INK — the same weight the spikes it replaced carried, because it is the
// same message.
function lcdGear(ctx, cx, cy, r, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = LCD_INK;
  ctx.beginPath(); ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-1.5, -r, 3, 3.5);
  }
  ctx.fillStyle = 'rgba(220,228,154,0.55)';
  ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = LCD_INK;
  ctx.fillRect(-0.5, -0.5, 1, 1);
  ctx.restore();
}

// THE CLOCK STAGE, and everything in it a beat cannot move: the lintel and sill
// that say the dial is a course of the tower rather than a thing standing on
// it, the bezel, the hour marks and the four unlit hand slots.
//
// It used to be a rooftop case on braced feet, and as furniture it was the one
// piece of this skyline you could have lifted off and set down on any other
// roof. A clock TOWER is a different building: the shaft carries the dial, the
// masonry courses break for it and resume under it, and the roofline above is
// unbroken. That is also what bought the tower its height — see the scene's
// `clock` note.
function lcdClockCase(ctx, bay) {
  const { cx, cy, r } = bay;
  // NO FRAME. The bay had a lintel and a sill, and with the dial moved up to
  // sit equidistant from the roofline and both walls there is barely a pixel
  // between the circle and them — the pair stopped reading as masonry courses
  // and started reading as a box drawn round the clock. What says the dial is
  // set INTO the tower is the wall it is set into: the facade's own linework
  // and window rows break for it and pick up underneath, and nothing is drawn
  // around it at all.
  ctx.strokeStyle = LCD_PRINT;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = LCD_PRINT_SOFT;
  for (let n = 0; n < 12; n++) {
    const a = n * Math.PI / 6;
    const tx = Math.round(cx + Math.sin(a) * (r - 5));
    const ty = Math.round(cy - Math.cos(a) * (r - 5));
    ctx.fillRect(tx - (n % 3 === 0 ? 1 : 0), ty - 1, n % 3 === 0 ? 3 : 1, 2);
  }
  ctx.fillStyle = LCD_WINDOW_OFF;
  for (const slot of lcdClockSlots(bay)) ctx.fillRect(...slot);
}

// The four cardinal slots, in beat order. One list, so the printed slots and
// the lit one cannot disagree about where a hand goes.
function lcdClockSlots({ cx, cy, r }) {
  return [
    [cx - 1, cy - r + 4, 3, r - 3],
    [cx + 2, cy - 1, r - 3, 3],
    [cx - 1, cy + 2, 3, r - 3],
    [cx - r + 4, cy - 1, r - 3, 3],
  ];
}

// The hand, which is the only part of the clock a beat moves.
function lcdClockHand(ctx, bay, beat4) {
  ctx.fillStyle = LCD_WINDOW_ON;
  ctx.fillRect(...lcdClockSlots(bay)[lcdMod(beat4, 4)]);
  ctx.fillRect(bay.cx - 1, bay.cy - 1, 3, 3);
}

function lcdEqualizer(ctx, building, index, frame) {
  const [x, w, h] = building;
  const top = GROUND_Y - h;
  const max = 6;
  const cols = w >= 44 ? 3 : 2;
  const bankW = cols * 5 - 2;
  const left = Math.round(x + w / 2 - bankW / 2);
  ctx.strokeStyle = LCD_PRINT_SOFT;
  ctx.strokeRect(left - 2.5, top - 37.5, bankW + 5, 37);
  for (let col = 0; col < cols; col++) {
    const cx = left + col * 5;
    // This painter was always a meter; it just had no source. The authored
    // table stands in whenever the analyser is absent.
    const band = index * cols + col;
    const heard = lcdBandLevel(frame.spectrum, band, 24, max);
    const level = heard != null ? heard
      : LCD_EQ_LEVELS[lcdMod(frame.step + index * 2 + col * 5, LCD_EQ_LEVELS.length)];
    ctx.fillStyle = LCD_WINDOW_OFF;
    for (let n = 0; n < max; n++) ctx.fillRect(cx, top - 5 - n * 5, 3, 3);
    ctx.fillStyle = LCD_WINDOW_ON;
    for (let n = 0; n < level; n++) ctx.fillRect(cx, top - 5 - n * 5, 3, 3);
  }
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(left - 1, top - 2, bankW + 2, 2);
}

function lcdAntenna(ctx, building, index, frame) {
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const top = GROUND_Y - h;
  const tall = 13 + index % 3 * 3;
  ctx.strokeStyle = LCD_PRINT_SOFT;
  if (index % 3 === 0) {
    lcdStrokePath(ctx, [[cx - 5, top], [cx, top - tall], [cx + 5, top], [cx - 3, top - 5],
      [cx + 3, top - 5], [cx - 2, top - 9], [cx + 2, top - 9]]);
  } else if (index % 3 === 1) {
    ctx.fillStyle = LCD_PRINT_SOFT;
    ctx.fillRect(cx, top - tall, 1, tall);
    ctx.beginPath(); ctx.arc(cx + 4, top - tall + 6, 5, Math.PI * 0.65, Math.PI * 1.35); ctx.stroke();
    ctx.fillRect(cx + 1, top - tall + 5, 5, 1);
  } else {
    ctx.fillStyle = LCD_PRINT_SOFT;
    ctx.fillRect(cx - 2, top - tall + 4, 1, tall - 4);
    ctx.fillRect(cx + 2, top - tall + 4, 1, tall - 4);
    for (let y = top - tall + 6; y < top; y += 4) ctx.fillRect(cx - 2, y, 5, 1);
    ctx.fillRect(cx, top - tall, 1, 5);
  }
  ctx.fillStyle = LCD_WINDOW_OFF;
  ctx.fillRect(cx - 2, top - tall - 3, 5, 4);
  if (lcdMod(frame.step + frame.phrase - index, 5) === 0) {
    ctx.fillStyle = LCD_WINDOW_ON;
    ctx.fillRect(cx - 2, top - tall - 3, 2, 2);
    ctx.fillRect(cx + 1, top - tall - 3, 2, 2);
  }
}

function gbcEllipse(ctx, x, y, rx, ry, fill, stroke = null, lineWidth = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
}

function gbcGorillaLimb(ctx, points, color, width, highlight = null) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  lcdStrokePath(ctx, points);
  if (highlight) {
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(1, width - 4);
    lcdStrokePath(ctx, points);
  }
}

// A BARREL rolling at us side-on: wood-tan body, VERTICAL end hoops and
// horizontal plank seams. The old version — round, orange, with two
// horizontal hoop curves — read as a basketball from three buildings away;
// a rolling barrel's hoops stand upright near its ends, and its planks run
// the way it rolls.
// `live` is the one Kong is dropping into the LANE — see the chute in
// drawLCDCity. He handles a barrel on every beat of his cycle and most of them
// are theatre, so the one that is about to become a hazard has to be findable
// at a glance: it wears the panel's own lit colour on its hoops and a gold pip,
// which is the same vocabulary every other live cell on this screen uses (a
// window that is on, the clock's cardinal hand, the share price's last cell).
// Not a new idiom, just this panel's existing one pointed at the right barrel.
function gbcGorillaBarrel(ctx, x, y, ghost = false, live = false) {
  gbcEllipse(ctx, x, y, 8, 7, ghost ? LCD_MOTION_GHOST : '#d4a35e',
    ghost ? LCD_MOTION_GHOST : LCD_PRINT, 1);
  if (ghost) return;
  if (live) {
    ctx.strokeStyle = LCD_WINDOW_ON;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 9, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = 1.25;
  ctx.beginPath(); ctx.ellipse(x - 4, y, 1.8, 5.8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + 4, y, 1.8, 5.8, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8a5a35';
  ctx.fillRect(x - 6, y - 3, 12, 1);
  ctx.fillRect(x - 7, y, 14, 1);
  ctx.fillRect(x - 6, y + 3, 12, 1);
  ctx.fillStyle = 'rgba(239,180,83,0.75)';
  ctx.fillRect(x - 1, y - 5, 2, 2);
}

// The cells his shock radiates. OUTSIDE the head AND outside the arms, which
// is the whole difficulty: on the beat this fires his arms are up over his
// head, so a tick at any comfortable radius lands on a forearm and reads as
// nothing. These sit past the elbow (x 18 from centre, 7 wide) at head height,
// and stay BELOW the wreck, which is already occupying the cells above him. In
// print, not the soft ink: they have the sky behind them and nothing else.
const LCD_STARTLE_MARKS = [
  [-13, -4], [-14, -1], [-13, 2], [-12, 5],
  [13, -4], [14, -1], [13, 2], [12, 5],
];

// ---- HIS FACE, AND THE HANDFUL OF THINGS IT SAYS ---------------------------
//
// The head is drawn once and the FACE is a spec, so the panel can vary his read
// without a second gorilla existing anywhere in this file. Every expression is
// built from the parts already on his head — two brows, two eyes, a muzzle —
// because a new mark on a 22px face at a building's remove is not an
// expression, it is a smudge.
//
//   brow   arch  the authored pair, raised in the middle
//          flat  two level strokes: nothing is happening
//          vee   inner ends dropped onto the eyes: the angry brow
//          cock  one up, one down
//   eye    open | narrow (lidded) | wide | shut (two curves, no whites)
//   mouth  smile | line | frown | snarl | hoot | smirk | oh
//   look   which way the pupils sit, -1 left, +1 right (0 = straight at you)
//
// `smile` and `startled` are the two the panel has always drawn and are exact:
// nothing below moves a pixel of either. The rest are bake-off candidates —
// see the gallery's `gorilla-face-bakeoff` — and reach the painter only through
// the dev-only `gorillaExpr` on the scene, so a run still shows the authored
// face until one of them is chosen.
const LCD_GORILLA_FACES = {
  smile: { brow: 'arch', browDy: 0, eye: 'open', mouth: 'smile' },
  neutral: { brow: 'flat', browDy: 1, eye: 'open', mouth: 'line' },
  // The angry read with the ANGLE TAKEN OFF: flat brows over the same lidded
  // eyes and turned-down mouth. The slanted pair was the loudest mark on the
  // face and it made him a villain; level, the same mouth lands somewhere
  // sadder — and a gorilla who is a bit put out is cuter company on a skyline
  // for four beats than one who is furious.
  sad: { brow: 'flat', browDy: 0, eye: 'narrow', mouth: 'frown' },
  snarl: { brow: 'vee', browDy: 0, eye: 'narrow', mouth: 'snarl' },
  effort: { brow: 'arch', browDy: -1, eye: 'shut', mouth: 'hoot' },
  sly: { brow: 'cock', browDy: 1, eye: 'open', mouth: 'smirk', look: 1 },
  startled: { brow: 'arch', browDy: -1, eye: 'wide', mouth: 'oh', shock: true },
};

/** The bake-off's running order, with what each read is FOR. */
export const LCD_GORILLA_EXPRESSIONS = [
  { id: 'smile', name: 'SMILE', note: 'the authored face — the control. Nothing about it changes.' },
  { id: 'neutral', name: 'NEUTRAL', note: 'brows level, mouth a flat line: a machine between throws.' },
  { id: 'sad', name: 'SAD', note: 'level brows over lidded eyes and a turned-down mouth — put out rather than furious.' },
  { id: 'snarl', name: 'SNARL', note: 'the one angled brow left on the panel, over an open dark mouth with two teeth in it. Unused.' },
  { id: 'effort', name: 'EFFORT', note: 'eyes squeezed shut, brows up, mouth a small O: the throw grunt.' },
  { id: 'sly', name: 'SLY', note: 'a cocked brow and a lopsided smirk, both pupils looking away.' },
  { id: 'startled', name: 'STARTLED', note: 'the crash face, unchanged: shock ticks, sweat bead, small O.' },
];

// ---- AND THE BROWS, WHICH ARE THE OTHER HALF OF EVERY ONE OF THEM ----------
//
// The SHAPE of a brow is the expression (arch, flat, vee, cock, above); its
// WEIGHT AND SPAN are a separate question, and the answer applies to all of
// them at once — including the startle, which has worn the heavy pair since it
// was drawn. So the two axes are separate here: pick a shape per face, pick a
// treatment once for the whole gorilla.
//
// Every style is measured on the head it sits on: the eyes are 4.8px across and
// their outer edges are 5.9px from centre, so a 14px brow at 1.5px thick is
// wider than the eye AND as heavy as the muzzle line under it. That is the
// thing being judged.
//
//   w     stroke weight
//   span  how far from centre the outer end reaches (the eye ends at 5.9)
//   dy    pushed DOWN toward the eye from the authored roof-35
//   lift  how much an arch rises in the middle
//   drop  how far a vee's inner end falls onto the eye
//   inner where the inner end starts (a tuft leaves the inner half bare)
//   cells 2px grid squares instead of a stroke — the panel's own pixel idiom
// WHICH TREATMENT THE PANEL WEARS. One constant for the whole gorilla, every
// stage, every expression — the bake-off exists to change this line and nothing
// else. It was `heavy` — 14px of 1.5px ink up on the forehead — until the
// bake-off showed that at that height the brow is drawn on his SKULL, dark on
// dark, and reads as a lump rather than a brow. `short` sits it down on the
// pale face plane, no wider than the eyes under it.
const LCD_GORILLA_BROW = 'short';

const LCD_GORILLA_BROWS = {
  heavy: { w: 1.5, span: 7, dy: 0, lift: 2, drop: 3.5, inner: 0 },
  thin: { w: 1, span: 6.5, dy: 0.5, lift: 2, drop: 3, inner: 1 },
  short: { w: 1.25, span: 5.5, dy: 1.5, lift: 1.5, drop: 2.5, inner: 1.5 },
  tuft: { w: 1.75, span: 7, dy: 0.5, lift: 1.5, drop: 2.5, inner: 3.5 },
  soft: { w: 1.25, span: 6.5, dy: 0.5, lift: 2, drop: 3, inner: 1, ink: LCD_PRINT_SOFT },
  cells: { cells: true, span: 6.5, dy: 0, lift: 2, drop: 3, inner: 1.5 },
  // THE THING THE FIRST SHEET ACTUALLY SHOWED. At the authored height the brow
  // is drawn on the SKULL — dark ink on the dark plane — so it reads as a lump
  // on his forehead rather than as a brow, and every treatment that stayed up
  // there lost for the same reason. The pale face plane is only 13px across at
  // that height; a brow has to be short enough and low enough to sit ON it.
  lowcells: { cells: true, span: 5.5, dy: 2, lift: 1.5, drop: 2.5, inner: 1.5 },
  arc: { w: 1.25, span: 6, dy: 2.5, lift: 1.5, drop: 2.5, inner: 1.5 },
};

/** The brow treatments, in bake-off order. `heavy` is what ships today. */
export const LCD_GORILLA_BROW_STYLES = [
  { id: 'heavy', name: 'HEAVY', note: '1.5px, 14px wide, up on the forehead — the control, and the one called too much.' },
  { id: 'thin', name: 'THIN', note: 'same shapes at 1px and a half-pixel lower: the drawing, not the marker.' },
  { id: 'short', name: 'SHORT', note: '1.25px, no wider than the eyes and sat down on them — a brow, not a banner.' },
  { id: 'tuft', name: 'TUFT', note: 'the outer half only, thicker: a ridge over the eye with the inner end bare.' },
  { id: 'soft', name: 'SOFT', note: 'thin, in the soft ink the fur strokes use, so the brow is quieter than the mouth.' },
  { id: 'cells', name: 'CELLS', note: 'three 2px squares a side on the panel grid — the billboards\' own idiom.' },
  { id: 'lowcells', name: 'LOW CELLS', note: 'the same 2px squares, short and sat on the pale plane where they can be seen.' },
  { id: 'arc', name: 'ARC', note: 'a thin curve low over the eyes, fully inside the face plane: the quietest of them.' },
];

// One brow. Drawn as its own path so an asymmetric pair costs no extra code.
// `b` is the treatment; `kind` is the shape the expression asked for.
function lcdGorillaBrow(ctx, cx, y0, side, kind, b) {
  const y = y0 + b.dy;
  const inner = cx + side * b.inner, outer = cx + side * b.span;
  const mid = cx + side * (b.inner + b.span) / 2;
  // The four shapes, as three heights: where the inner end sits, where the
  // middle sits, where the outer end sits. Every treatment reads the same three.
  let iy = y, my = y - b.lift, oy = y;
  if (kind === 'flat') { my = y; }
  else if (kind === 'vee') { iy = y + b.drop; my = y + b.drop / 2 - 0.5; oy = y - 1; }
  else if (kind === 'cock') {
    if (side < 0) { iy = y - 1.5; my = y - b.lift - 1; oy = y - 1; }
    else { iy = y + 1.5; my = y + 1.2; oy = y + 1; }
  } else if (side < 0) { iy = y + 1; my = y - b.lift; oy = y; }
  else { iy = y + 1; my = y - b.lift; oy = y; }

  if (b.cells) {
    // Squares on the 2px grid, snapped the way every other pixel cell on this
    // panel is: three per brow, at the three heights.
    ctx.fillStyle = LCD_PRINT;
    for (const [px, py] of [[inner, iy], [mid, my], [outer, oy]]) {
      ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
    }
    return;
  }
  ctx.strokeStyle = b.ink || LCD_PRINT;
  ctx.lineWidth = b.w;
  ctx.beginPath();
  ctx.moveTo(inner, iy);
  // A vee is a straight slash and everything else is a curve: bending the angry
  // brow rounds off the one mark that has to stay hard.
  if (kind === 'vee') ctx.lineTo(outer, oy);
  else ctx.quadraticCurveTo(mid, my, outer, oy);
  ctx.stroke();
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = 1.5;
}

// The face, centred on the head at (cx, roof - 31). Draws in the order it
// always has — whites, pupils, brows, nostrils, mouth — because the head plane
// is already down and every one of these sits on top of the one before it.
function lcdGorillaFace(ctx, cx, roof, exprId, browStyle) {
  const f = LCD_GORILLA_FACES[exprId] || LCD_GORILLA_FACES.smile;
  const brow = LCD_GORILLA_BROWS[browStyle] || LCD_GORILLA_BROWS[LCD_GORILLA_BROW];
  const eyeY = roof - 31;
  if (f.eye === 'shut') {
    // No whites at all: two lines that curve the way a squeezed eye does.
    ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * 6, eyeY + 0.5);
      ctx.quadraticCurveTo(cx + side * 3.5, eyeY - 3, cx + side * 1, eyeY + 0.5);
      ctx.stroke();
    }
  } else {
    const eyeR = f.eye === 'wide' ? 2.7 : 2.4;
    const eyeH = f.eye === 'wide' ? 3.1 : f.eye === 'narrow' ? 2 : 2.8;
    gbcEllipse(ctx, cx - 3.5, eyeY, eyeR, eyeH, '#f3edb1');
    gbcEllipse(ctx, cx + 3.5, eyeY, eyeR, eyeH, '#f3edb1');
    const px = (f.look || 0) * 1.4;
    gbcEllipse(ctx, cx - 3 + px, eyeY + 0.5, 1.1, 1.4, LCD_PRINT);
    gbcEllipse(ctx, cx + 3 + px, eyeY + 0.5, 1.1, 1.4, LCD_PRINT);
    // A lidded eye is a white with its top bitten off, not a smaller white:
    // the lid is where the glare lives.
    if (f.eye === 'narrow') {
      ctx.fillStyle = LCD_PRINT;
      ctx.fillRect(cx - 6, eyeY - 2.4, 5, 1.4);
      ctx.fillRect(cx + 1, eyeY - 2.4, 5, 1.4);
    }
  }
  ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = 1.5;
  const browY = roof - 35 + (f.browDy || 0);
  lcdGorillaBrow(ctx, cx, browY, -1, f.brow, brow);
  lcdGorillaBrow(ctx, cx, browY, 1, f.brow, brow);
  gbcEllipse(ctx, cx - 2.5, roof - 26, 1, 0.8, LCD_PRINT);
  gbcEllipse(ctx, cx + 2.5, roof - 26, 1, 0.8, LCD_PRINT);
  const m = f.mouth;
  if (m === 'oh') {
    gbcEllipse(ctx, cx, roof - 23, 2, 2.4, LCD_PRINT);
  } else if (m === 'hoot') {
    gbcEllipse(ctx, cx, roof - 23, 2.6, 3.2, LCD_PRINT);
  } else if (m === 'line') {
    ctx.beginPath(); ctx.moveTo(cx - 4, roof - 22.8); ctx.lineTo(cx + 4, roof - 22.8); ctx.stroke();
  } else if (m === 'frown') {
    // Seated INSIDE the muzzle, which is the whole difficulty: the muzzle is an
    // ellipse, so its floor climbs as you go out, and a turned-down mouth puts
    // its two lowest points exactly where the room runs out. At the authored
    // half-width of 4 the muzzle's edge is at roof - 21.3 and the corners' own
    // stroke reached roof - 21.25 — they hit the rim. Pulled in to 3.5 and up
    // to roof - 22.7, the corners clear the tan by most of a pixel, and the
    // shallower drop keeps the arc off the nostrils above it.
    ctx.beginPath(); ctx.moveTo(cx - 3.5, roof - 22.7); ctx.quadraticCurveTo(cx, roof - 25.9, cx + 3.5, roof - 22.7); ctx.stroke();
  } else if (m === 'smirk') {
    ctx.beginPath(); ctx.moveTo(cx - 4.5, roof - 22.6); ctx.quadraticCurveTo(cx + 0.5, roof - 21.2, cx + 5, roof - 24.6); ctx.stroke();
  } else if (m === 'snarl') {
    // An OPEN mouth is a filled plane, not a thicker line — the muzzle is tan
    // and the hole in it has to be print for the teeth to be anything.
    ctx.beginPath();
    ctx.moveTo(cx - 5, roof - 24.5);
    ctx.quadraticCurveTo(cx, roof - 19.5, cx + 5, roof - 24.5);
    ctx.closePath();
    ctx.fillStyle = LCD_PRINT; ctx.fill();
    ctx.fillStyle = '#f3edb1';
    ctx.fillRect(cx - 3, roof - 24.5, 2, 1.8); ctx.fillRect(cx + 1, roof - 24.5, 2, 1.8);
  } else {
    ctx.beginPath(); ctx.moveTo(cx - 4, roof - 23.5); ctx.quadraticCurveTo(cx, roof - 21.5, cx + 4, roof - 23.5); ctx.stroke();
  }
  if (f.shock) {
    ctx.fillStyle = LCD_PRINT;
    for (const [mx, my] of LCD_STARTLE_MARKS) {
      ctx.fillRect(cx + mx * 2, roof - 31 + my * 2, 2, 2);
    }
    ctx.fillStyle = '#b9cf79';
    ctx.fillRect(cx + 12, roof - 36, 2, 2);
    ctx.fillRect(cx + 12, roof - 33, 2, 3);
  }
}

// WHICH FACE, BEAT BY BEAT — and the rule is that he changes at most once a
// BAR, never once a beat. A face that moves every beat is a face the eye keeps
// going back to, and every one of those beats is a beat spent off the lane. So
// the smile is his resting face and everything else is rationed.
//
// Two things spend the ration. The first is the LOOP COUNTER: one bar of one
// borrowed expression per 16-beat loop, cycling through six loops so the same
// variation never lands twice running and a player who watches him for a
// minute sees the whole set. The second is the PLUMBER, and that one is not a
// clock at all — see the journey in lcdGameWatch, where the beats the little
// man is up on the gorilla's own girder carry the face to wear on them. He is
// ANGRY while the man is close, SMIRKING on the beat the barrel gets him, and
// back to the smile immediately: the toy does not gloat any longer than it
// sulks.
//
// Nothing here is random. This panel does the same thing at the same moment of
// the loop forever, and the player gets to learn it.
const LCD_GORILLA_LOOP_MOODS = [
  null,           // a loop he just smiles through, so the change is felt
  [1, 'neutral'],
  [0, 'sly'],     // bar 0, as far from the plumber's bar 3 as the loop allows:
                  // next door to it he smirks, drops to sad, then smirks again,
                  // and the gag reads as fidgeting rather than as a reaction.
  null,
  [0, 'neutral'],
  [2, 'effort'],  // a bar of hooting with his eyes shut
];
// SAD IS NOT IN HERE ON PURPOSE. It is the only face on the panel that is
// about something — the little man arriving on his girder — and a face that
// also turns up on a timer stops being about anything. The smirk is in the
// rotation and still lands on the hit, and that is the other way round for the
// same reason: he is a gorilla who smirks, and one of the things he smirks at
// is a plumber getting flattened.
// Bar 3 is never authored here: those four beats belong to the plumber.
function lcdGorillaMood(frame, hint = null) {
  if (frame.gorillaExpr) return frame.gorillaExpr;
  if (hint) return hint;
  const loop = LCD_GORILLA_LOOP_MOODS[lcdMod(frame.phrase, LCD_GORILLA_LOOP_MOODS.length)];
  return loop && loop[0] === Math.floor(frame.step / 4) ? loop[1] : 'smile';
}

// `burst` is the phase from lcdBurstPhase, or -1: on those two beats the barrel
// he is holding is not there to be drawn, because the plane just removed it.
function lcdRooftopGorilla(ctx, building, frame, burst = -1, reducedFlashing = false, mood = null) {
  const [x, w, h] = building;
  const cx = Math.round(x + w / 2);
  const roof = GROUND_Y - h;
  const poses = [
    {
      arms: [
        [[cx - 12, roof - 19], [cx - 18, roof - 31], [cx - 8, roof - 43]],
        [[cx + 12, roof - 19], [cx + 18, roof - 31], [cx + 8, roof - 43]],
      ], hands: [[cx - 8, roof - 43], [cx + 8, roof - 43]], barrel: [cx, roof + LCD_BARREL_UP_DY],
    },
    {
      arms: [
        [[cx - 12, roof - 18], [cx - 18, roof - 10], [cx - 18, roof - 4]],
        [[cx + 12, roof - 19], [cx + 18, roof - 29], [cx + 12, roof - 36]],
      ], hands: [[cx - 18, roof - 4], [cx + 12, roof - 36]], barrel: [cx + 20, roof - 36],
    },
    {
      arms: [
        [[cx - 12, roof - 18], [cx - 18, roof - 10], [cx - 18, roof - 4]],
        [[cx + 12, roof - 18], [cx + 18, roof - 10], [cx + 14, roof - 7]],
      ], hands: [[cx - 18, roof - 4], [cx + 14, roof - 7]], barrel: [cx + 22, roof - 7],
    },
    {
      arms: [
        [[cx - 12, roof - 19], [cx - 18, roof - 13], [cx - 18, roof - 7]],
        [[cx + 12, roof - 20], [cx + 18, roof - 26], [cx + 10, roof - 31]],
      ], hands: [[cx - 18, roof - 7], [cx + 10, roof - 31]], barrel: [cx + 18, roof - 31],
    },
  ];

  // The slow GBC panel remembers the other three arm/barrel positions, but
  // only as a faint contour. The active pose below is proper vector anatomy,
  // not a pile of rectangular segments.
  for (const ghost of poses) {
    for (const arm of ghost.arms) gbcGorillaLimb(ctx, arm, LCD_MOTION_GHOST, 5);
    gbcGorillaBarrel(ctx, ghost.barrel[0], ghost.barrel[1], true);
  }
  const pose = poses[frame.beat4];
  for (const arm of pose.arms) {
    gbcGorillaLimb(ctx, arm, LCD_PRINT, 7, 'rgba(70,121,137,0.72)');
  }

  // Broad shoulders, tapered belly, bent knees and planted feet create a
  // gorilla silhouette before any facial detail is read.
  gbcEllipse(ctx, cx - 11, roof - 18, 6, 7, LCD_PRINT);
  gbcEllipse(ctx, cx + 11, roof - 18, 6, 7, LCD_PRINT);
  ctx.beginPath();
  ctx.moveTo(cx - 13, roof - 20);
  ctx.quadraticCurveTo(cx - 15, roof - 8, cx - 8, roof - 2);
  ctx.quadraticCurveTo(cx, roof + 1, cx + 8, roof - 2);
  ctx.quadraticCurveTo(cx + 15, roof - 8, cx + 13, roof - 20);
  ctx.quadraticCurveTo(cx, roof - 25, cx - 13, roof - 20);
  ctx.closePath(); ctx.fillStyle = LCD_PRINT; ctx.fill();
  gbcEllipse(ctx, cx - 7, roof - 5, 5, 7, LCD_PRINT);
  gbcEllipse(ctx, cx + 7, roof - 5, 5, 7, LCD_PRINT);
  gbcEllipse(ctx, cx - 9, roof - 1, 8, 3, LCD_PRINT);
  gbcEllipse(ctx, cx + 9, roof - 1, 8, 3, LCD_PRINT);

  // Head, ears and a projecting muzzle. Curves and overlapping colour planes
  // keep him expressive at 1.4x while the GBC palette keeps him in-world.
  gbcEllipse(ctx, cx - 11, roof - 30, 4, 5, LCD_PRINT);
  gbcEllipse(ctx, cx + 11, roof - 30, 4, 5, LCD_PRINT);
  gbcEllipse(ctx, cx - 11, roof - 30, 2, 3, '#d4a35e');
  gbcEllipse(ctx, cx + 11, roof - 30, 2, 3, '#d4a35e');
  gbcEllipse(ctx, cx, roof - 31, 12, 11, LCD_PRINT);
  gbcEllipse(ctx, cx, roof - 29, 8.5, 7, '#e1d68c');
  gbcEllipse(ctx, cx, roof - 25, 7, 4.5, '#d4a35e');
  // WHAT HIS FACE DOES WHEN THE PLANE TAKES THE BARREL. Five reads of this were
  // drawn and compared; the one that won says it AROUND the head rather than on
  // it. His face barely moves — whites a shade wider, brows up one, the smile
  // shrunk to a small O — and the PANEL does the shouting: shock ticks
  // radiating off him on the 2px grid the billboards use, plus a sweat bead at
  // the temple. That is this toy's own idiom, and it beat the louder faces
  // (bulging eyes, a dropped jaw, vanished pupils) for the same reason it
  // exists: those four beats of a gorilla mugging on the skyline are four
  // beats the player is not reading the lane. He is back to the authored face
  // on the third beat, because the toy does not sulk.
  //
  // THE CRASH ALWAYS WINS. `frame.gorillaExpr` is the bake-off seam and it
  // cannot override the startle: whatever face is being tried, the two beats
  // the wreck is over his head are the wreck's.
  lcdGorillaFace(ctx, cx, roof, burst >= 0 ? 'startled' : lcdGorillaMood(frame, mood),
    frame.gorillaBrow);

  // Chest plane, collar shadow and sparse fur strokes.
  gbcEllipse(ctx, cx, roof - 11, 7, 8, '#b9cf79');
  ctx.strokeStyle = LCD_PRINT_SOFT; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 5, roof - 15); ctx.quadraticCurveTo(cx, roof - 12, cx + 5, roof - 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 5, roof - 11); ctx.quadraticCurveTo(cx, roof - 8, cx + 5, roof - 11); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 12, roof - 19); ctx.lineTo(cx - 8, roof - 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 12, roof - 19); ctx.lineTo(cx + 8, roof - 16); ctx.stroke();

  // Hands sit above the arm strokes, with individual finger cuts visible.
  for (const [hx, hy] of pose.hands) {
    gbcEllipse(ctx, hx, hy, 3.5, 3, '#d4a35e', LCD_PRINT, 1);
    ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = 0.75;
    for (let finger = -1; finger <= 1; finger++) {
      ctx.beginPath(); ctx.moveTo(hx + finger * 1.5, hy - 1); ctx.lineTo(hx + finger * 1.5, hy + 1.5); ctx.stroke();
    }
  }
  // The wreck stays where the barrel WAS — over his head, poses[0] — for both
  // beats of it. Drawing it at `pose.barrel` would walk the explosion down his
  // arm on the second beat, following a barrel that no longer exists.
  // The barrel in his HANDS is lit on the bar he is about to send a real one
  // down the chute, so the warning starts before the drop does rather than
  // landing with it. `barrelBeat` is only ever set while one is genuinely due
  // (run.js updateBarrelArrivals), so he cannot cry wolf with it.
  if (burst < 0) {
    const due = frame.barrelBeat != null ? frame.barrelBeat - frame.beatAbs : null;
    gbcGorillaBarrel(ctx, pose.barrel[0], pose.barrel[1], false,
      due != null && due >= 0 && due <= LCD_CHUTE_BEATS + 1);
  }
  else lcdBarrelBurst(ctx, poses[LCD_BARREL_UP_BEAT].barrel[0],
    poses[LCD_BARREL_UP_BEAT].barrel[1], burst, reducedFlashing);
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
}

// ---- the DONKEY KONG tower ---------------------------------------------
//
// Stage 1's landmark: a construction-tower BUILDING in the skyline — not a
// handheld — wearing the Game & Watch's playfield on its face. The big
// rooftop gorilla (the same painter stages 1 and 3 have always used) stands
// on its roof lobbing barrels; open girder floors zigzag down the facade with
// ladders between them, and a blocky moustachioed runner two floors down hops
// the barrels in time. It plays by this panel's one law — every cell steps on
// the heard musical beat and nothing else. A barrel lives in eight authored
// cells (four per girder); the off cells stay ghosted the way the gorilla's
// spare arms do, and the two lit cells walk the cycle a step per beat, so a
// throw lands top-left on the downbeat and the runner clears the last cell on
// beat four.

function lcdMiniBarrel(ctx, bx, by, ghost = false) {
  if (ghost) {
    gbcEllipse(ctx, bx, by, 4.5, 4, null, LCD_MOTION_GHOST, 1);
    return;
  }
  gbcEllipse(ctx, bx, by, 4.5, 4, '#d4a35e', LCD_PRINT, 1);
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(bx - 2, by, 1, 3.4, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(bx + 2, by, 1, 3.4, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#8a5a35';
  ctx.fillRect(Math.round(bx) - 3, by, 7, 1);
  ctx.fillStyle = 'rgba(239,180,83,0.75)';
  ctx.fillRect(Math.round(bx) - 1, by - 3, 2, 1);
}

// ---- THE PLUMBER, AND THE FOUR THINGS THAT MIGHT MAKE HIM READ BETTER ------
//
// He is eight pixels across and sixteen tall, on a tower on the far side of a
// street, and every one of the candidates below is a two-or-three-pixel change.
// That is on purpose: this is not a redesign, it is the question "what is the
// smallest edit that makes him read as a PLUMBER rather than as a man-shaped
// smudge climbing some girders?" — so each flag is one answer, they compose,
// and SHIPPED is in the list as the control.
//
// Flags reach the painter only through the dev-only `runnerStyle` on the
// scene, exactly the way the gorilla's face bake-off works. A run, the hub,
// the jukebox and every test pass null and get the figure that has always been
// drawn, pixel for pixel.
//
//   bib     the two loose strap ticks joined into an overall bib, buttons on it
//   boots   brown feet under the legs, a skin pixel at the end of each arm
//   cap     a row more crown and a pixel more brim
//   stride  two walk cells instead of a step and a stand, arm swinging with them
const LCD_RUNNER_PLAIN = { bib: false, boots: false, cap: false, stride: false };

/** The bake-off's running order, with what each candidate is FOR. */
export const LCD_RUNNER_STYLES = [
  { id: 'shipped', name: 'SHIPPED', style: {},
    note: 'the figure as drawn today — the control. Nothing about it changes.' },
  { id: 'bib', name: 'BIB', style: { bib: true },
    note: 'the two strap pixels joined into an overall bib with gold buttons: the teal becomes sleeves either side of it, which is the whole plumber read in two pixels.' },
  { id: 'boots', name: 'BOOTS & HANDS', style: { boots: true },
    note: 'a brown boot row under each leg, poking a pixel past the toe, and a skin pixel where each arm ends — the jump already has both and the other fifteen cells do not.' },
  { id: 'cap', name: 'CAP', style: { cap: true },
    note: 'three rows of crown instead of two and a brim a pixel longer. The cap is what says which way he is walking at a tower’s remove; today it is the same height as the brim.' },
  { id: 'stride', name: 'STRIDE', style: { stride: true },
    note: 'the walk gets a second leg cell instead of standing to attention every other beat, and the arm swings against it. Same silhouette, opposite phase.' },
  { id: 'full', name: 'THE LOT', style: { bib: true, boots: true, cap: true, stride: true },
    note: 'all four at once — the composite, and the one to beat SHIPPED if any of this is worth doing.' },
];

const LCD_RUNNER_BY_ID = new Map(LCD_RUNNER_STYLES.map(
  (s) => [s.id, { ...LCD_RUNNER_PLAIN, ...s.style }]));
/** null for the shipped figure; a flag set for a bake-off candidate. */
function lcdRunnerStyle(id) {
  return (id && LCD_RUNNER_BY_ID.get(id)) || null;
}

// The runner. Deliberately BLOCKY — rectangles, not curves — because he is a
// toy inside a toy, and he wears LORENZO'S colours (heroes.js lorenzo.pal):
// purple cap with the gold emblem, teal shirt, blue overalls, brown
// moustache. `mode` is one of:
//   { kind: 'run', stride, dir }  — walking a girder, facing dir (+1 right)
//   { kind: 'climb', arms }       — on a ladder from behind, arms alternating
//   { kind: 'hit' }               — clipped by a barrel: arms up, cap popped
//   { kind: 'jump', dir }         — the split, over a barrel
// `style` is the bake-off seam above: null draws him exactly as he ships.
function lcdRunnerFigure(ctx, rx, footY, mode, style = null) {
  const st = style || LCD_RUNNER_PLAIN;
  let y = footY;
  // Mirror helper for the few side-specific cells when he faces left.
  const dir = mode.dir || 1;
  const M = (o, w) => (dir === 1 ? o : 1 - o - w);
  // A boot is the bottom row of a leg in Lorenzo's brown, poking one pixel
  // past the toe — the same trick the jump's split already uses, where the
  // toe is the whole of what says it is a split. Leaves the fill blue, which
  // is what every caller here wants next.
  const boot = (bx, bw, by = y - 1) => {
    ctx.fillStyle = '#5a3212';
    ctx.fillRect(dir === 1 ? bx : bx - 1, by, bw + 1, 1);
    ctx.fillStyle = '#22608c';
  };
  const hand = (hx, hy) => { ctx.fillStyle = '#f2c9a0'; ctx.fillRect(hx, hy, 1, 1); };
  if (mode.kind === 'climb') {
    ctx.fillStyle = '#22608c';
    ctx.fillRect(rx - 3, y - 4, 3, 4);
    ctx.fillRect(rx + 1, y - 4, 3, 4);
    if (st.boots) { boot(rx - 3, 3); boot(rx + 1, 3); }
    ctx.fillRect(rx - 3, y - 7, 8, 3);
    ctx.fillStyle = '#2ea8a0';
    ctx.fillRect(rx - 3, y - 10, 8, 3);
    // One arm reaching, one at the rail, swapping as he climbs.
    const upX = mode.arms ? rx - 5 : rx + 4;
    const dnX = mode.arms ? rx + 4 : rx - 5;
    ctx.fillRect(upX, y - 13, 2, 4);
    ctx.fillRect(dnX, y - 9, 2, 4);
    if (st.bib) {
      // From behind the bib is a back panel between the straps — the same two
      // pixels the front pose spends, seen the other way round.
      ctx.fillStyle = '#22608c';
      ctx.fillRect(rx - 2, y - 9, 6, 2);
    }
    if (st.boots) {
      // The reaching hand is at the top of its arm, the resting one at the
      // bottom of its.
      hand(upX + (mode.arms ? 0 : 1), y - 13);
      hand(dnX + (mode.arms ? 1 : 0), y - 6);
    }
    // The back of his head is all cap.
    ctx.fillStyle = '#7b4bd0';
    if (st.cap) ctx.fillRect(rx - 3, y - 16, 7, 6);
    else ctx.fillRect(rx - 3, y - 15, 7, 5);
    return;
  }
  const hit = mode.kind === 'hit';
  const air = mode.kind === 'jump';
  if (air) y -= 11;
  ctx.fillStyle = '#22608c';
  if (air) {
    // A SPLIT, both legs out sideways at hip level with the feet ticking UP
    // at the tips — toes to the sky, the way a jumped leg reads. One cell, no
    // in-between — the toy has exactly two leg drawings, walking and this. Symmetric about the body's centre at rx+1.
    //
    // AT THE SAME SCALE AS THE REST OF HIM, which is the whole of what this
    // number is for. It was 7 a side: a 22px span on an 8px torso, so the one
    // frame in sixteen where he leaves the girder was nearly three times as
    // wide as the fifteen either side of it, and at a tower's remove it read as
    // a table rather than as a man. Four a side is a whole leg out and still
    // inside the silhouette the other fifteen cells established — a 16px span
    // on an 8px torso, half what the first draft asked for.
    const SPLIT = 4;
    ctx.fillRect(rx - 3 - SPLIT, y - 7, SPLIT, 3);
    ctx.fillRect(rx + 5, y - 7, SPLIT, 3);
    // The boots are Lorenzo's brown (heroes.js lorenzo.pal.f), not the
    // overalls' blue: at 2px a foot the same colour as the leg is just a
    // longer leg, and the toe is the whole of what says this is a split.
    ctx.fillStyle = '#5a3212';
    ctx.fillRect(rx - 3 - SPLIT, y - 9, 2, 2);
    ctx.fillRect(rx + 3 + SPLIT, y - 9, 2, 2);
    ctx.fillStyle = '#22608c';
  } else if (mode.kind === 'run' && st.stride) {
    // TWO WALK CELLS, not a step and a stand. The shipped pair spends one of
    // its two frames with the feet together and square, so half the walk is a
    // man standing still being carried along the girder; this is the same
    // silhouette in the opposite phase, so the legs alternate the whole way.
    if (mode.stride) {
      // The cell as authored: back foot planted, leading foot out in front and
      // a row off the steel.
      ctx.fillRect(rx + M(-4, 3), y - 4, 3, 4);
      ctx.fillRect(rx + M(1, 4), y - 3, 4, 3);
      if (st.boots) { boot(rx + M(-4, 3), 3); boot(rx + M(1, 4), 4); }
    } else {
      // And the other half of the step, which is where the shipped pair stands
      // to attention instead: the FRONT foot has landed and the back one is
      // trailing with the heel up. It stays welded to the hips — a lifted leg
      // that also leaves a row of daylight under the overalls is a detached
      // blue box at this size, not a leg.
      ctx.fillRect(rx + M(1, 3), y - 4, 3, 4);
      ctx.fillRect(rx + M(-5, 4), y - 4, 4, 3);
      if (st.boots) { boot(rx + M(1, 3), 3); boot(rx + M(-5, 4), 4, y - 2); }
    }
  } else if (mode.kind === 'run' && mode.stride) {
    ctx.fillRect(rx + M(-4, 3), y - 4, 3, 4);
    ctx.fillRect(rx + M(1, 4), y - 3, 4, 3);
    if (st.boots) { boot(rx + M(-4, 3), 3); boot(rx + M(1, 4), 4); }
  } else {
    ctx.fillRect(rx - 3, y - 4, 3, 4);
    ctx.fillRect(rx + 1, y - 4, 3, 4);
    if (st.boots) { boot(rx - 3, 3); boot(rx + 1, 3); }
  }
  ctx.fillRect(rx - 3, y - 7, 8, 3);
  ctx.fillStyle = '#2ea8a0';
  ctx.fillRect(rx - 3, y - 10, 8, 3);
  if (hit) {
    ctx.fillRect(rx - 5, y - 13, 2, 4);
    ctx.fillRect(rx + 4, y - 13, 2, 4);
    if (st.boots) { hand(rx - 5, y - 13); hand(rx + 5, y - 13); }
  } else if (st.stride && mode.kind === 'run') {
    // The arm swings against the legs: forward and up on the striding cell,
    // back and low on the other one.
    const ax = rx + M(mode.stride ? 4 : -5, 2);
    const ay = mode.stride ? y - 11 : y - 9;
    ctx.fillRect(ax, ay, 2, 3);
    if (st.boots) hand(dir === 1 ? ax + 1 : ax, mode.stride ? ay : ay + 2);
  } else {
    const ax = rx + M(3, 2);
    ctx.fillRect(ax, y - 10, 2, 3);
    if (st.boots) hand(dir === 1 ? ax + 1 : ax, y - 8);
  }
  ctx.fillStyle = '#22608c';
  if (st.bib) {
    // The two loose strap ticks joined into an actual bib, with the buttons on
    // it. The teal survives as a sleeve either side, which is the difference
    // between a man in a teal shirt and a man in overalls.
    ctx.fillRect(rx - 1, y - 9, 4, 2);
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(rx - 1, y - 9, 1, 1);
    ctx.fillRect(rx + 2, y - 9, 1, 1);
  } else {
    ctx.fillRect(rx - 1, y - 9, 1, 2);
    ctx.fillRect(rx + 2, y - 9, 1, 2);
  }
  ctx.fillStyle = '#f2c9a0';
  ctx.fillRect(rx - 2, y - 14, 6, 4);
  ctx.fillStyle = '#5a3212';
  ctx.fillRect(rx + M(1, 3), y - 11, 3, 1);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(rx + M(1, 1), y - 13, 1, 1);
  ctx.fillStyle = '#7b4bd0';
  const capLift = hit ? 3 : 0;
  const capTop = y - (st.cap ? 17 : 16) - capLift;
  ctx.fillRect(rx - 3, capTop, 7, st.cap ? 3 : 2);
  if (!hit) ctx.fillRect(rx + M(3, st.cap ? 4 : 3), y - 15, st.cap ? 4 : 3, 1);
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(rx - 1, capTop, 1, 1);
  if (hit) {
    // Two gold sparks where his composure was.
    ctx.fillRect(rx - 5, y - 17, 2, 2);
    ctx.fillRect(rx + 5, y - 16, 2, 2);
  }
}

// `burst` rides through to the gorilla on his roof — see lcdBurstPhase. The
// tower is the only thing between the scene, which knows where the plane is,
// and the gorilla, who is holding what it hits. `vanished` is the girder cell
// that hit takes out of the chain — see lcdVanishedBarrelCell.
function lcdGameWatch(ctx, spec, frame, burst = -1, reducedFlashing = false, vanished = -1) {
  const [x, w, h] = spec;
  const top = GROUND_Y - h;
  const span = w - 10;
  // The facade obeys every rule the other buildings do: a colour plane, a
  // print outline running to the bottom of the display (so a pit in front of
  // it exposes real tower, not a void), a cornice, corner masonry, and a
  // quiet lower 27px that never becomes false lane furniture.
  ctx.fillStyle = 'rgba(211,139,66,0.26)';
  ctx.fillRect(x + 1, top + 1, w - 1, H - top - 1);
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, top + 0.5, w, H - top);
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(x + 2, top + 4, w - 4, 1);
  const detailBottom = GROUND_Y - 27;
  ctx.fillRect(x + 3, top + 7, 1, Math.max(1, detailBottom - top - 7));
  ctx.fillRect(x + w - 4, top + 7, 1, Math.max(1, detailBottom - top - 7));

  // GIRDER FLOORS zigzagging down the WHOLE face, each tipped 4px the other
  // way — the Game & Watch playfield worn as architecture. They run past the
  // lane band and off the bottom of the display the same way every other
  // facade's window rows do: the road apron masks that stretch, and a pit
  // opening in front of the tower exposes girders, not blank wall. The girder
  // y at a given x is shared with the barrel cells and the runner, so
  // everything stands ON the steel rather than near it.
  const floors = [];
  for (let fy = top + 28; fy < H - 6; fy += 32) floors.push(fy);
  // Slope parity is set by the RUNNER's route: he travels right on even
  // floors and left on odd ones, and every girder RISES the way he walks —
  // uphill all the way, like the arcade. The barrels roll the other way,
  // downhill, which is what makes meeting one a jump.
  const floorY = (i, cx) => {
    const t = (cx - x - 5) / span;
    return floors[i] + 4 * (i % 2 === 0 ? 1 - t : t);
  };
  ctx.strokeStyle = LCD_PRINT;
  ctx.lineWidth = 2;
  for (let i = 0; i < floors.length; i++) {
    lcdStrokePath(ctx, [[x + 5, floorY(i, x + 5)], [x + w - 5, floorY(i, x + w - 5)]]);
  }
  ctx.lineWidth = 1;
  // Rivet ticks under each girder, and a ladder between each pair of floors,
  // swapping sides as they descend.
  ctx.fillStyle = LCD_PRINT_SOFT;
  for (let i = 0; i < floors.length; i++) {
    for (let px = x + 9; px < x + w - 7; px += 9) ctx.fillRect(px, Math.round(floorY(i, px)) + 1, 1, 3);
  }
  for (let i = 0; i + 1 < floors.length; i++) {
    const lx = i % 2 === 0 ? x + 26 : x + 56;
    const t = Math.round(floorY(i, lx)) + 2;
    const b = Math.round(floorY(i + 1, lx)) - 1;
    ctx.fillRect(lx, t, 1, b - t);
    ctx.fillRect(lx + 6, t, 1, b - t);
    for (let ry = t + 3; ry < b - 1; ry += 4) ctx.fillRect(lx + 1, ry, 5, 1);
  }
  // And one ladder from the top girder to the ROOF itself — past the spot
  // where the barrel always gets him, so the way up visibly exists and he
  // visibly never takes it. That is the whole tragedy of the toy.
  {
    const t = top + 2;
    const b = Math.round(floorY(0, x + 73)) - 1;
    ctx.fillRect(x + 70, t, 1, b - t);
    ctx.fillRect(x + 76, t, 1, b - t);
    for (let ry = t + 3; ry < b - 1; ry += 4) ctx.fillRect(x + 71, ry, 5, 1);
  }

  // The barrel's twelve authored cells snake down the top three floors —
  // right, then left past the runner, then right again — so a throw rides the
  // tower ALL the way down. Ghost the whole path, light the three cells the
  // cycle is on (one per floor, four beats apart). Two ghost-only cells on
  // the fourth floor carry the path below the road, where only a pit ever
  // shows them.
  const cells = [
    [x + 70, 0], [x + 54, 0], [x + 38, 0], [x + 22, 0],
    [x + 18, 1], [x + 34, 1], [x + 50, 1], [x + 66, 1],
    [x + 68, 2], [x + 52, 2], [x + 36, 2], [x + 20, 2],
  ].map(([cx, floor]) => [cx, Math.round(floorY(floor, cx) - 5)]);
  for (const [bx, by] of cells) lcdMiniBarrel(ctx, bx, by, true);
  if (floors.length > 3) {
    lcdMiniBarrel(ctx, x + 24, Math.round(floorY(3, x + 24) - 5), true);
    lcdMiniBarrel(ctx, x + 44, Math.round(floorY(3, x + 44) - 5), true);
  }
  for (let p = frame.beat4; p < cells.length; p += 4) {
    // The exploded throw leaves a gap in the chain rather than a ghost: a
    // ghost cell means "a position this thing also occupies", and this barrel
    // does not exist to occupy one.
    if (p === vanished) continue;
    lcdMiniBarrel(ctx, cells[p][0], cells[p][1]);
  }

  // THE RUNNER'S WHOLE CLIMB, one cell per heard beat — and it takes EIGHT
  // bars, not four, because a toy that does exactly the same sixteen cells
  // forever is a clock rather than a character. The first loop is the route he
  // has always run: along the bottom girder, up the right ladder, back along
  // the middle one, up the left ladder, and out along the top, where the live
  // barrel rolling past x+56 clips him (cap popped, sparks) and the empty cell
  // after it says "respawning". The second loop climbs the same zigzag and
  // then DOES NOT WALK INTO IT: he scrambles back the way he came as the top
  // girder's barrel sweeps through, and it goes past him. Same barrel cells,
  // same beats, two endings — so the hit is an event again instead of a tick.
  //
  // Every barrel here is the authored one on that beat (cells[], above): a
  // barrel is at x+70, x+54, x+38, x+22 on the top girder on beats 0-3 of any
  // bar, and each cell below is placed against the one that is actually there.
  //
  // `mood` is what the gorilla wears on that beat — the only thing on this
  // panel he reacts to. See lcdGorillaMood.
  const ladA = x + 26, ladB = x + 56;
  const climbY = (lx, topF, botF, frac) => {
    const a = floorY(topF, lx + 3), b2 = floorY(botF, lx + 3);
    return b2 - (b2 - a) * frac;
  };
  const at = (floor, rx, m, mood) => ({ rx, fy: floorY(floor, rx), m, mood });
  const onLadder = (lad, topF, botF, frac, arms, mood) => ({
    rx: lad + 3, fy: climbY(lad, topF, botF, frac), m: { kind: 'climb', arms }, mood,
  });
  // Coming up from the street: the ladder below the bottom girder, six tenths
  // of the way out of it, so his head is over the steel and his feet are still
  // on the rungs. floors[] is solved from the building's height, so a tower
  // ever too short to have a floor under the road falls back to the standing
  // start this replaced rather than climbing a ladder that isn't there.
  const fromStreet = (arms) => (floors.length > 3
    ? onLadder(ladA, 2, 3, 0.6, arms)
    : at(2, x + 16, { kind: 'run', stride: arms, dir: 1 }));
  const journey = [
    // HE COMES UP OUT OF THE STREET, and that is where every run of the tower
    // starts. He used to be simply THERE on the bottom girder on the downbeat,
    // which is the one moment of the loop that has to say "again": a figure
    // that appears is a figure being redrawn, and a figure climbing out of the
    // bottom ladder is the same man having walked back round. The tower already
    // has the ladder — the girders run past the lane band and off the bottom of
    // the display, and this is the pair of rails below the bottom floor — so
    // the trip he makes off-panel is the one the panel implies anyway.
    fromStreet(0),
    at(2, x + 30, { kind: 'run', stride: 1, dir: 1 }),
    // The floor-two barrel crosses him between these beats — he is airborne
    // as it passes underneath.
    at(2, x + 44, { kind: 'jump', dir: 1 }),
    at(2, x + 58, { kind: 'run', stride: 1, dir: 1 }),
    onLadder(ladB, 1, 2, 0.38, 0),
    onLadder(ladB, 1, 2, 0.8, 1),
    // The floor-one barrel's live cell IS x+50 on this beat: straight over it.
    at(1, x + 50, { kind: 'jump', dir: -1 }),
    at(1, x + 40, { kind: 'run', stride: 1, dir: -1 }),
    at(1, x + 32, { kind: 'run', stride: 0, dir: -1 }),
    at(1, x + 27, { kind: 'run', stride: 1, dir: -1 }),
    onLadder(ladA, 0, 1, 0.38, 0),
    onLadder(ladA, 0, 1, 0.8, 1),
    // Out onto the gorilla's own girder, with a barrel already sweeping down
    // it from the right — which is the whole of why his face falls up here.
    at(0, x + 32, { kind: 'run', stride: 0, dir: 1 }, 'sad'),
    at(0, x + 44, { kind: 'run', stride: 1, dir: 1 }, 'sad'),
    // The one he doesn't clear: the live cell rolls through x+38 right as he
    // arrives beside it. He knew — see the smirk.
    { rx: x + 44, fy: floorY(0, x + 44), m: { kind: 'hit' }, mood: 'sly' },
    null,
    // ---- and the loop where he lives ---------------------------------------
    // Same climb out of the street, opposite arm — the two loops read as the
    // same man twice rather than as one animation played again.
    fromStreet(1),
    at(2, x + 30, { kind: 'run', stride: 0, dir: 1 }),
    at(2, x + 44, { kind: 'jump', dir: 1 }),
    at(2, x + 58, { kind: 'run', stride: 0, dir: 1 }),
    onLadder(ladB, 1, 2, 0.38, 1),
    onLadder(ladB, 1, 2, 0.8, 0),
    at(1, x + 50, { kind: 'jump', dir: -1 }),
    at(1, x + 40, { kind: 'run', stride: 0, dir: -1 }),
    at(1, x + 32, { kind: 'run', stride: 1, dir: -1 }),
    at(1, x + 27, { kind: 'run', stride: 0, dir: -1 }),
    onLadder(ladA, 0, 1, 0.38, 1),
    onLadder(ladA, 0, 1, 0.8, 0),
    at(0, x + 32, { kind: 'run', stride: 1, dir: 1 }, 'sad'),
    at(0, x + 40, { kind: 'run', stride: 0, dir: 1 }, 'sad'),
    // THE BACK-OFF, and it is a back-off DOWN. Backing along the girder buys
    // him nothing — every barrel on this panel comes at him head-on, and the
    // top one sweeps the whole floor from x+70 to x+22 in four beats, so there
    // is no cell on it to retreat to. The ladder he came up is the only way
    // off the steel: he bails onto it and drops below the girder line while
    // the barrel rolls through the cell he was standing in.
    onLadder(ladA, 0, 1, 0.6, 0, 'sad'),
    // Past him and rolling away to the left. He climbs back out, looking after
    // it, and the next downbeat starts him at the bottom of the tower.
    at(0, x + 34, { kind: 'run', stride: 0, dir: -1 }, 'neutral'),
  ];
  // EIGHT bars of journey against a four-bar `step`, so this counts its own.
  const leg = journey[lcdMod(frame.bar * 4 + frame.beat4, journey.length)];
  if (leg) lcdRunnerFigure(ctx, leg.rx, Math.round(leg.fy), leg.m, lcdRunnerStyle(frame.runnerStyle));

  // And the thrower himself: the SAME big gorilla painter the other scenes
  // put on a rooftop, standing on this one. His authored poses land the
  // downbeat throw right where the top girder's first cell lights.
  lcdRooftopGorilla(ctx, [x, w, h], frame, burst, reducedFlashing, leg?.mood || null);
}

/**
 * THE WHOLE PANEL, sky and all — the one entry point anything outside a run
 * uses to draw this city.
 *
 * It exists because the jukebox plays the city as a visualiser preset, and the
 * alternative was a second copy of the scene that would drift from this one
 * the first time a billboard moved. The pack's own bg() and the preset now
 * paint the SAME city from the same data; the only difference between them is
 * who supplies the clock.
 *
 * `scene` is the same optional context bg() takes — { stageIndex, beat,
 * progress, audio } — and every field is optional.
 */
export function drawLCDPanel(ctx, scene, settings = {}) {
  // `skyMeter` on: the jukebox wants the analyser in the sky.
  drawLCDCity(ctx, scene, !!settings.reducedMotion, !!settings.reducedFlashing,
    settings.skyMeter !== false);
}

/** The screen treatment on its own: the soft-light wash and the cell lattice. */
export function lcdScreenFinish(ctx, t = 0, reducedFlashing = false) {
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(168,198,108,0.22)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  bakedFill(ctx, 'gbcCells', 3, 3, (c) => {
    c.fillStyle = 'rgba(30,43,72,0.11)';
    c.fillRect(2, 0, 1, 3);
    c.fillRect(0, 2, 3, 1);
  });
  if (!reducedFlashing) {
    ctx.fillStyle = `rgba(255,244,180,${0.008 + Math.sin(t * 6.3) * 0.008})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// A building whose roof carries scene furniture — the gorilla, a billboard, the
// transmitter — skips its own crown so the two never interleave. Static: it
// reads the authored scene and never the frame, which is what lets the crowns
// and the roof caps live in the baked layer alongside the facades.
// The stages whose own rooftop kit stands on every plain roof — stage 2's
// equalizer bank. Listed rather than inferred because it is a fact about the
// authored panel, not about the painters: a stage could hang its kit on two
// roofs out of eight and still want the other six crowned.
const LCD_STAGE_ROOF_KIT = new Set([2]);
function lcdCrowned(art, i) {
  return i === art.rooftopGorilla || i === art.transmitter
    || (art.billboards || []).some(([bi]) => bi === i);
}

// EVERYTHING ON THIS PANEL A BEAT CANNOT MOVE. Painted once into the baked city
// layer per (stage, phase) — see bakedCity — and blitted every frame after.
// Carries no sky: the train runs behind the skyline and has to be painted
// between the two.
function paintLCDStaticCity(ctx, stageIndex) {
  const art = LCD_CITY_SCENES[stageIndex];
  const palette = LCD_GBC_PALETTES[stageIndex];
  ctx.lineWidth = 1;
  // The rail first, so every facade paints over it. It is masonry and it never
  // moves, so it is here rather than in the live pass: a viaduct that appeared
  // with its first service was the panel saying the city built the line in the
  // second phase of the song.
  if (art.train) lcdViaduct(ctx, art);
  const clockBay = lcdClockBay(art);
  for (let i = 0; i < art.buildings.length; i++) {
    const building = art.buildings[i];
    const [x, w, h] = building;
    const crowned = lcdCrowned(art, i);
    // Broad, low-contrast colour planes are the GBC contribution. Fine dark
    // linework sits over them, so added colour never weakens the silhouette.
    ctx.fillStyle = palette.buildings[i % palette.buildings.length];
    const top = GROUND_Y - h;
    ctx.fillRect(x + 1, top + 1, w - 1, H - top - 1);
    // A STAGE THAT HANGS KIT ON EVERY PLAIN ROOF LEAVES NO PLAIN ROOF. Stage 2
    // puts an equalizer bank on every building a billboard is not already
    // standing on, and every crown this skyline uses — speaker's parapet,
    // deco's stack, music-hall's box, spire's pediment and finial — is centred
    // and between 5 and 21 tall, which is to say all of them were drawn INSIDE
    // the bank's 37px cabinet. On the spires it was unreadable: the pediment
    // and its mast fanned out beneath the lit cells and the pair read as one
    // object, a meter on a launch gantry, which is nothing this city contains.
    // `crowned` already means the roof is spoken for, and a meter speaks for a
    // roof as surely as a billboard does. The roof carries one thing.
    const bay = clockBay && clockBay.index === i ? clockBay : null;
    gbcBuildingLineArt(ctx, building, crowned || LCD_STAGE_ROOF_KIT.has(stageIndex), bay);
    lcdWindowGridBase(ctx, building, bay);
    // The roof cap's plate is static; only its three lamps carry the offbeat,
    // and those stay live below.
    if (bay) lcdClockCase(ctx, bay);
    if (stageIndex === 3 && !crowned) {
      ctx.fillStyle = LCD_WINDOW_OFF;
      ctx.fillRect(x + 5, GROUND_Y - h - 5, Math.max(5, w - 10), 3);
    }
  }
}

// ---- the opening bars -----------------------------------------------------
//
// THE CITY IS NOT THERE WHEN THE SONG STARTS, and it walks on in reading order.
//
// This is the one animation on the panel that happens once. Everything else
// here loops — the chase comes round every ten bars, the chute runs whenever a
// barrel is coming, the clouds wrap — because a panel is a picture that repeats.
// The assembly is the exception, and it earns it by being the thing that says
// the song has begun: the first downbeat has a skyline arriving on it, so the
// player's first reading of the tempo is a structure landing rather than a
// number on a strip.
//
// IT STEPS. It does not slide, ease or tween, and the difference matters more
// here than the word "slide" suggests: this panel's whole grammar is that the
// beat advances things and nothing else does — the clouds drift in whole pixels
// on the heard beat, the mast's rings walk a step per beat, the chase moves one
// cell. A structure gliding smoothly into place would be the only continuously
// animated object on a Game & Watch and it would read as a different, later
// machine. Four authored positions, one per beat, is a slide in this cabinet's
// own language, and it is also what a segment display can actually do.
const LCD_ARRIVE = [30, 13, 4, 0];
// One structure per beat, so the eight in this skyline are all standing by the
// eleventh — LCD_ARRIVE.length - 1 beats after the last one starts.
const LCD_ARRIVE_STEP = 1;

/**
 * The scene's structures in READING ORDER, left to right, with the column of
 * the bake each one occupies.
 *
 * Sorted by x rather than authored in order, because the two lists this walks
 * are authored for different reasons: `buildings` is the facade table and
 * `gameWatch` is a single named tower that happens to stand fifth. Reading
 * order is a fact about where they are, so it is solved from x and cannot drift
 * when a building is inserted.
 */
function lcdStructures(art) {
  const out = art.buildings.map((b, i) => ({ kind: 'building', i, x: b[0], w: b[1] }));
  if (art.gameWatch) out.push({ kind: 'gameWatch', i: -1, x: art.gameWatch[0], w: art.gameWatch[1] });
  out.sort((a, b) => a.x - b.x);
  return out;
}

/**
 * How far below home each structure is drawn this beat, or null once the whole
 * skyline has landed.
 *
 * Returns a map keyed the way drawLCDCity asks: `b<index>` for a facade and
 * `gameWatch` for the tower. A structure whose beat has not come yet is absent
 * from the map entirely, which is the difference that matters — absent means
 * DO NOT DRAW, and 0 means standing. The two must not be the same value or a
 * building that has not arrived yet paints itself at home on beat zero.
 */
function lcdArrival(art, frame) {
  // NO INTRO MEANS A CITY THAT IS SIMPLY THERE — the hub, the gallery, reduced
  // motion and every test. And the beat is the SONG's, not a window the run
  // opened: a stage restarted from a death re-anchors to a clock that is four
  // hundred beats in, so a retry walks past this on its own and needs no flag
  // to be told the city has already been built once.
  if (!frame.intro) return null;
  const order = lcdStructures(art);
  const last = (order.length - 1) * LCD_ARRIVE_STEP + LCD_ARRIVE.length - 1;
  if (frame.beatAbs > last) return null;
  const at = new Map();
  for (let k = 0; k < order.length; k++) {
    const step = frame.beatAbs - k * LCD_ARRIVE_STEP;
    if (step < 0) continue;
    const s = order[k];
    at.set(s.kind === 'gameWatch' ? 'gameWatch' : `b${s.i}`,
      { dy: LCD_ARRIVE[Math.min(step, LCD_ARRIVE.length - 1)], x: s.x, w: s.w });
  }
  return at;
}

function drawLCDCity(ctx, scene, reducedMotion, reducedFlashing, skyMeter = false) {
  const frame = lcdSceneFrame(scene, reducedMotion);
  const art = LCD_CITY_SCENES[frame.stageIndex];
  const palette = LCD_GBC_PALETTES[frame.stageIndex];
  // The sky is painted HERE rather than by each caller, so the scene frame is
  // derived once per frame instead of once by bg() and again on the way in.
  // Below the groundline: the sky's own bottom colour, NOT LCD_PANEL_LIT. The
  // band a pit exposes has to be the same green the backdrop meets the ground
  // with — a flat panel-lit slab down there made every hole open onto a
  // different, yellower screen than the one above it. The road apron is
  // ground()'s business and stays panel-lit.
  const sky = LCD_SKY_PHASES[frame.stageIndex][frame.phase] || palette.sky;
  skyGrad(ctx, sky[0], sky[1]);
  ctx.fillStyle = sky[1];
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.lineWidth = 1;
  if (skyMeter) lcdSkylineEq(ctx, frame);
  // WHICH STRUCTURES ARE STILL WALKING ON, or null once the skyline is standing
  // — which is every frame of every stage but the first eleven beats of a run,
  // and every frame of the hub, the gallery and the tests. See lcdArrival.
  const arrive = lcdArrival(art, frame);
  // How far below home one structure is drawn, or NULL for one whose beat has
  // not come. Null means draw nothing at all: a building that has not arrived
  // has no lit windows, no billboard and no chimney, because it is not there.
  const riseOf = (key) => {
    if (!arrive) return 0;
    const a = arrive.get(key);
    return a ? a.dy : null;
  };
  // The cars only — the rail they run on is already in the baked layer below.
  if (art.train && frame.phase >= (art.train.fromPhase ?? 0)) lcdTrain(ctx, art.train, frame);
  // The facades, their line art and every unlit window, in one blit — or, while
  // the city is arriving, one column window per structure at its own offset.
  bakedCity(ctx, `${frame.stageIndex}|${frame.phase}`,
    (c) => paintLCDStaticCity(c, frame.stageIndex),
    arrive
      ? [...arrive.entries()].filter(([k]) => k !== 'gameWatch')
        .map(([, a]) => ({ x: a.x - 1, w: a.w + 3, dy: a.dy }))
      : null);
  ctx.lineWidth = 1;
  const clockBay = lcdClockBay(art);
  for (let i = 0; i < art.buildings.length; i++) {
    const rise = riseOf(`b${i}`);
    if (rise === null) continue;
    const building = art.buildings[i];
    const [x, w, h] = building;
    const crowned = lcdCrowned(art, i);
    if (rise) ctx.save();
    if (rise) ctx.translate(0, rise);
    lcdWindowGridLit(ctx, building, i, frame, clockBay && clockBay.index === i ? clockBay : null);
    // AND `crowned` GOVERNS THE ROOFTOP KIT TOO, not just the crown. Each
    // stage hangs its own hardware off every roof — stage 2's equalizer bank,
    // stage 3's antenna and lamp cap — and all of it is drawn from the roof
    // UPWARD into exactly the airspace a billboard's legs and board occupy.
    // A board covers most of a 37px bank, so what was left was the bank's
    // frame poking out over the top edge and its bottom row of cells lit in
    // the 8px gap between the legs: a sign with scaffolding behind it. The
    // roof carries one thing.
    if (frame.stageIndex === 2 && !crowned) lcdEqualizer(ctx, building, i, frame);
    if (frame.stageIndex === 3) {
      if (!crowned) lcdAntenna(ctx, building, i, frame);
      if (!crowned) {
        // The plate itself is in the baked layer; these are its three lamps,
        // which carry the offbeat change. Reduced flashing keeps the roof
        // hardware but leaves it in a composed printed state.
        const capY = GROUND_Y - h - 5;
        if (!reducedFlashing && (i + frame.beat4) % 2 === 0) {
          ctx.fillStyle = LCD_WINDOW_ON;
          const span = Math.max(1, w - 16);
          for (let lamp = 0; lamp < 3; lamp++) {
            ctx.fillRect(Math.round(x + 7 + span * lamp / 2), capY, 2, 2);
          }
        }
      }
    }
    if (rise) ctx.restore();
  }
  // The sky was the one part of the panel that never moved. Each cloud now
  // drifts leftward in whole-pixel steps on the heard beat — a different pace
  // per cloud so the layer has depth — wrapping off one edge of the display
  // and back on the other, with a one-pixel bob on the bar. Quantized like
  // everything else here: the beat advances it, nothing else does, and reduced
  // motion (beat 0 forever) gets a parked sky.
  const beatAbs = frame.bar * 4 + frame.beat4;
  const span = W + 72;
  for (let i = 0; i < art.clouds.length; i++) {
    const [cx0, cy0] = art.clouds[i];
    const x = lcdMod(cx0 + 36 - beatAbs * LCD_CLOUD_DRIFT[i % LCD_CLOUD_DRIFT.length], span) - 36;
    const y = cy0 + LCD_CLOUD_BOB[lcdMod(frame.bar + i, LCD_CLOUD_BOB.length)];
    lcdCloud(ctx, x, y, lcdMod(frame.bar + frame.phrase + i, 2), palette.cloud);
  }
  const towerRise = riseOf('gameWatch');
  if (art.gameWatch && towerRise !== null) {
    if (towerRise) ctx.save();
    if (towerRise) ctx.translate(0, towerRise);
    lcdGameWatch(ctx, art.gameWatch, frame, lcdBurstPhase(art, frame), reducedFlashing,
      lcdVanishedBarrelCell(art, frame));
    if (towerRise) ctx.restore();
  }
  // The chopper's take: while it is crossing, the billboard it came for is
  // gone from its roof. Derived from the frame rather than stored, so a
  // restarted run rebuilds exactly the same city.
  const chopper = art.chopper;
  const repossessing = chopper && frame.phase >= (chopper.fromPhase ?? 2);
  const lifted = repossessing && lcdChopperX(frame) != null ? chopper.takes : -1;
  // EVERY ROOF FURNISHING BELONGS TO A ROOF, so each one is drawn through its
  // own building's arrival: absent while that building is, and riding its
  // offset while it climbs. A billboard standing at its authored height over a
  // facade still two beats below it is the one way an assembling skyline comes
  // apart, and it comes apart badly — the sign reads as the thing the city is
  // being built underneath.
  const onRoof = (bi, paint) => {
    const rise = riseOf(`b${bi}`);
    if (rise === null) return;
    if (rise) ctx.save();
    if (rise) ctx.translate(0, rise);
    paint();
    if (rise) ctx.restore();
  };
  for (const [bi, artName] of art.billboards || []) {
    if (bi === lifted) continue;
    onRoof(bi, () => lcdBillboard(ctx, art.buildings[bi], artName, frame, reducedFlashing));
  }
  if (art.searchlight) {
    onRoof(art.searchlight[0], () => lcdSearchlight(ctx, art.buildings[art.searchlight[0]],
      art.searchlight[1], frame, reducedFlashing));
  }
  if (art.washer) {
    onRoof(art.washer[0], () => lcdWasher(ctx, art.buildings[art.washer[0]], art.washer[1], frame));
  }
  if (repossessing) lcdChopper(ctx, frame, true);
  if (Number.isInteger(art.transmitter)) {
    onRoof(art.transmitter, () => lcdTransmitter(ctx, art.buildings[art.transmitter],
      frame, reducedFlashing));
  }
  for (const [bi, dx] of art.smokestacks || []) {
    onRoof(bi, () => lcdSmokestack(ctx, art.buildings[bi], dx, frame));
  }
  if (art.plane) lcdPlane(ctx, art, frame, art.plane);
  // THE GORILLA IS IN FRONT OF THE SKY, and that is what buys stage 3 a plane
  // at all. He stands on a roof at y 100 and his raised barrel reaches the beat
  // ribbon's band, so there is no altitude over that column a plane could take:
  // every lane that clears the antennae goes straight through him. Drawn after
  // the crossing he simply eclipses it — the aircraft goes behind the ape and
  // comes out the other side, which is what a panel with two opaque layers does
  // and what stage 1 could not do (its gorilla is inside the tower, drawn long
  // before this, which is why THAT plane has to hit the barrel instead).
  //
  // Nothing else moves: scene 3 declares no billboard, mast, chimney or
  // chopper, so this block has only the plane and the clock to be reordered
  // against, and the two scenes that own those furnishings own no gorilla.
  const gorillaRise = Number.isInteger(art.rooftopGorilla)
    ? riseOf(`b${art.rooftopGorilla}`) : null;
  if (Number.isInteger(art.rooftopGorilla) && gorillaRise !== null) {
    // He and his chute ride his own roof up, for the reason every roof
    // furnishing does — see onRoof above. The chute is authored FROM the roof
    // (`GROUND_Y - gh`), so the whole rig moves as one under the offset.
    if (gorillaRise) ctx.save();
    if (gorillaRise) ctx.translate(0, gorillaRise);
    // The barrel chute: four authored cells falling down the side of the
    // gorilla's building, ghosted like every off cell on this panel, with
    // the live one stepping a cell per heard beat — thrown at the roof on
    // the downbeat, at the street on beat four. Drawn BEFORE the gorilla so
    // his own held barrel stays the scene's front-most one.
    if (art.barrelDrop) {
      const [gx, gw, gh] = art.buildings[art.rooftopGorilla];
      const roof = GROUND_Y - gh;
      const dropX = gx + gw + 9;
      const chute = [roof - 4, roof + 30, roof + 64, roof + 98];
      for (const cy of chute) gbcGorillaBarrel(ctx, dropX, cy, true);
      // WHICH CELL IS LIT, and it is the one place on this panel where the lane
      // gets a say. In a run, `barrelBeat` is the beat a real barrel reaches the
      // foot of this chute (see lcdSceneFrame), so the drop is counted BACKWARD
      // from it — cell three on that beat, two the beat before, and so on — and
      // nothing falls at all on the bars where nothing is coming. That is the
      // whole of the effect: the barrel that lands here is the barrel that then
      // rolls at you, so the chute has to be silent when the road is.
      //
      // Everywhere else — hub, gallery, reduced motion, the tests — there is no
      // lane to ask, and it runs the authored four-beat cycle it always has.
      const laneDriven = frame.barrelBeat != null;
      const cue = laneDriven
        ? LCD_CHUTE_CELLS - 1 - Math.round(frame.barrelBeat - frame.beatAbs)
        : frame.beat4;
      // AND THE LAST CELL IS THE LANE'S. When a real barrel is coming, it is
      // standing at the foot of this chute on the delivery beat — so drawing
      // the bottom cell as well puts two barrels in one place and the handoff
      // reads as a doubling instead of a hand-off. The chute delivers to the
      // cell above and the road takes it from there, which is exactly what the
      // picture is meant to say. With no lane to ask, all four cells are the
      // chute's own and it runs the authored cycle.
      const last = laneDriven ? LCD_CHUTE_CELLS - 1 : LCD_CHUTE_CELLS;
      // Lit when it is a real one. The chute already only runs for a barrel the
      // lane is about to be handed, but the player has no way to know that from
      // one bar — a gorilla dropping barrels is what a gorilla does. The lit
      // rim is the promise made explicit: this is the one that is coming for
      // you, and it is the same wood the ribbon's arrow is now drawn in.
      if (cue >= 0 && cue < last) gbcGorillaBarrel(ctx, dropX, chute[cue], false, laneDriven);
    }
    lcdRooftopGorilla(ctx, art.buildings[art.rooftopGorilla], frame);
    if (gorillaRise) ctx.restore();
  }
  // The case is in the baked layer with the rest of the facade; only the hand
  // is redrawn, and it is drawn LAST so nothing on this end of the skyline
  // crosses the one mark the player reads the beat off.
  if (clockBay) {
    const bayRise = riseOf(`b${clockBay.index}`);
    if (bayRise !== null) {
      if (bayRise) ctx.save();
      if (bayRise) ctx.translate(0, bayRise);
      lcdClockHand(ctx, clockBay, frame.beat4);
      if (bayRise) ctx.restore();
    }
  }
}

function lcdPack(settings) {
  const reduced = settings && settings.reducedFlashing;
  const reducedMotion = settings && settings.reducedMotion;
  return {
    name: 'lcd',
    // The screen treatment belongs to the scenery. The cast — hero, hazards,
    // pickups — draws on top in its production colours, as the things the
    // player is meant to track.
    actorsAbovePost: true,
    // THIS PACK FILLS EVERY HOLE ITSELF, and it fills them all with the same
    // thing. ground() cuts cogwheels into the bedrock under any break it draws,
    // so the run's own pass for a hole that names its own material (a
    // crossing's spikes) would lay a bed of teeth over the works — one pit with
    // two fatal materials in it, while the hole ten paces back had one. A
    // cabinet may have exactly one answer to "what is at the bottom", and on
    // this one the answer is the machinery.
    ownPitFills: true,
    // ...and its own SURFACE, walked off terrainGroundY column by column. So
    // drawTerrain has nothing to add over a crossing's road rise: painting the
    // rise a second time stepped the ink line where its clipped run began and
    // repainted the apron over the road dashes, which is why they stopped
    // following the lane exactly where it climbed. Same argument as the stage
    // wave, which that painter already declines for the same reason.
    ownSurface: true,
    // The panel does not crane with the camera. Everything bg() draws here —
    // backplate art, bezel, screen plate — is fixed to the display; sliding it
    // down on a jump would move the physical handheld, not the picture.
    bgPan: 0,
    bg(ctx, t, camX, cab, totalDist, scene = null) {
      // Sky and all — drawLCDPanel above is the same call, for callers outside
      // a run. The city is alive, but the glass still does not travel. It
      // changes by switching cells between fixed authored poses on heard
      // musical beats; neither camX nor gameplay chart data enters the painter.
      drawLCDCity(ctx, scene, reducedMotion, reduced);
      // No hardware frame around the screen any more: the bezel cost more
      // than it said (it doubled against facades, and its restore pass caused
      // the phantom-line saga), and the city reads as a place, not a toy.
    },
    // `viewW` is how much world this frame actually shows — W / z, taken from
    // the frame's own interpolated zoom. It matters here more than anywhere
    // else in the pack: this road is a column walk, and walking a fixed 480
    // inside the world transform painted ~45% of its columns off the right edge
    // on a phone (218 world px visible at the 2.2 tier), each one paying a
    // terrainGroundY — two Math.sin and a pair of smoothsteps — and a linear
    // scan of the cut list before it was thrown away. Defaults to W so every
    // other caller, and every other pack, is unchanged.
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W) {
      const right = Math.max(0, viewW);
      const pits = [];
      for (const ob of obstacles || []) {
        if (!ob.live || !ob.def || !ob.def.isGap || ob.tunnel) continue;
        const x = Math.round(ob.x - camX);
        const w = Math.round(ob.w);
        if (x + w < -4 || x > right + 4) continue;
        pits.push({ x, w, wx: ob.x });
      }
      // Merge the visible openings into a mask. The city has already been
      // drawn all the way down; this apron covers it everywhere except here.
      const cuts = pits
        .map(({ x, w }) => ({ from: Math.max(0, x), to: Math.min(right, x + w) }))
        .filter((cut) => cut.to > cut.from)
        .sort((a, b) => a.from - b.from)
        .reduce((merged, cut) => {
          const last = merged[merged.length - 1];
          if (last && cut.from <= last.to) last.to = Math.max(last.to, cut.to);
          else merged.push({ ...cut });
          return merged;
        }, []);
      // Opaque foreground road, walked in world-snapped columns that FOLLOW
      // THE SURFACE — terrainGroundY is the one definition of it, so where
      // rhythm-1's rolling window lifts the lane the panel body, the ink line
      // and the dashes all ride the same curve, exactly like every other
      // cabinet's road. (drawTerrain deliberately does not paint a flat
      // cabinet's stage wave; this pack owns its whole road.) Because it is
      // drawn in columns clipped at the cuts rather than painted and then
      // erased, a pit keeps the true city pixels behind it.
      const inCut = (a, b) => cuts.some((cut) => b > cut.from && a < cut.to);
      const STEP = 2;
      for (let wx = Math.floor(camX / STEP) * STEP; wx < camX + right + STEP; wx += STEP) {
        const sx = wx - camX;
        if (inCut(sx, sx + STEP)) continue;
        const y = terrainGroundY(cab, wx);
        ctx.fillStyle = LCD_PANEL_LIT;
        ctx.fillRect(sx, y, STEP, H - y);
        ctx.fillStyle = LCD_INK;
        ctx.fillRect(sx, y, STEP, LCD_ROAD_INK);
      }
      // The dashes scroll smoothly but at HALF the lane speed — full speed
      // strobed at this pitch. They are read as texture, not as a distance
      // reference, so the softer drift wins. Each dash sits DASH_DROP under the
      // surface at its own SCREEN position, so the line stays parallel to the
      // road through the rolls.
      //
      // THE DASHES BELONG ON THE LIP, level with the road's own markings. At 7
      // they sat below the tip of every beatground glyph — a second band of
      // road texture further down the face, with a strip of blank panel between
      // it and the arrows, which made the lane read as two lanes. Derived from
      // the same gauge the glyphs sink by: beatground sinks a glyph LCD_ROAD_INK
      // + 1 and draws it GLYPH_H (5.5) tall, so its waist is a shade under
      // LCD_ROAD_INK + 4, and a 3px dash starting two under the ink straddles
      // exactly that. Thin the road's cap and both move together.
      // Fractional x AND y on purpose: the backbuffer is scaled up, so a
      // whole-pixel round here becomes a conspicuous multi-screen-pixel hop
      // as the lane rolls — the same lesson the beat ribbon's offset learned.
      const PITCH = 16, DASH_DROP = LCD_ROAD_INK + 2;
      ctx.fillStyle = 'rgba(38,53,93,0.14)';
      for (let x = -((camX * 0.5) % PITCH); x < right; x += PITCH) {
        if (inCut(x, x + 8)) continue;
        ctx.fillRect(x, terrainGroundY(cab, camX + x + 4) + DASH_DROP, 8, 3);
      }
      // The exposed city makes the opening honest; dark-blue GEARS keep the
      // mechanical danger unequivocal without painting over that background.
      // Cogwheels, not spikes: this city is clockworks and relays, and a hole
      // in its road opens onto the machinery underneath. Adjacent wheels
      // counter-rotate like a real train, and the rotation is quantized to the
      // same 16px world pitch the road dashes step at — the works ratchet past
      // as the panel scrolls, and hold still when it does.
      const GEAR_R = 9;
      // The wheels live at the BOTTOM of the shaft — cut into the flat
      // bedrock the hole opens onto, not hanging at the mouth. The camera
      // shows the top of them from the road and the rest as the crane lifts.
      const GEAR_CY = GROUND_Y + 16;
      // The daylight the train keeps off the shaft walls. The walls themselves
      // are LCD_ROAD_INK thick — see below — so the clearance is measured from
      // that and moves with it.
      const GEAR_PITCH = GEAR_R * 2 - 2;
      const GEAR_CLEAR = 3;

      const ratchet = Math.round(camX / PITCH) * (Math.PI / 8);
      for (const { x, w, wx } of pits) {
        // The cut edges, full depth — from the LOCAL surface, not from the
        // flat groundline, so a rolled lip and its wall meet exactly. Wall
        // thickness is the road's own ink line, LCD_ROAD_INK, so the hole's
        // frame and the surface it is cut into read as ONE gauge of steel
        // meeting at the lip. A wall heavier than the road it is cut into is
        // two gauges at a corner, and the corner is where that shows worst.
        //
        // A held-back 2px floor was tried here and rejected on sight: the
        // argument for it — that a hole is read down INTO, so a hairline stops
        // reading as a shaft — is real but loses to the joint. The mouth still
        // reads as an opening because of the FULL-DEPTH ink either side and the
        // works at the bottom of it, neither of which is the wall's thickness.
        ctx.fillStyle = LCD_INK;
        const topL = terrainGroundY(cab, wx);
        const topR = terrainGroundY(cab, wx + w);
        ctx.fillRect(x, topL, LCD_ROAD_INK, H - topL);
        ctx.fillRect(x + w - LCD_ROAD_INK, topR, LCD_ROAD_INK, H - topR);
        // Mitred lips: the surface line turns the corner into the wall as one
        // continuous piece — the column walk alone leaves a stepped joint.
        ctx.fillRect(x - LCD_ROAD_INK, topL, LCD_ROAD_INK * 2, LCD_ROAD_INK);
        ctx.fillRect(x + w - LCD_ROAD_INK, topR, LCD_ROAD_INK * 2, LCD_ROAD_INK);
        // Wheels meshed across the opening, centres pitched a hair under two
        // radii so the teeth interleave. Anchored to the pit (world space), so
        // the train stands still in the hole as the panel steps past it.
        //
        // CENTRED at a fixed pitch, not stretched to the opening. Dividing the
        // width by a wheel count made one number do two jobs and did both
        // badly: it set the mesh, so the teeth interleaved by a different
        // amount in every hole, and it pinned the outer wheels to the walls —
        // a tooth tip overlapped the ink by one to three pixels at EVERY
        // authored width, so no hole could be widened out of it. The works
        // read as jammed into the shaft rather than running through it.
        // Now the pitch alone sets the mesh, the count is however many wheels
        // fit clear of both walls, and the slack is split as daylight.
        const inner = w - 2 * (LCD_ROAD_INK + GEAR_CLEAR);
        const n = Math.max(1, Math.floor((inner - GEAR_R * 2) / GEAR_PITCH) + 1);
        const first = x + w / 2 - ((n - 1) * GEAR_PITCH) / 2;
        for (let i = 0; i < n; i++) {
          const cx = first + GEAR_PITCH * i;
          const dir = i % 2 === 0 ? 1 : -1;
          lcdGear(ctx, cx, GEAR_CY, GEAR_R, dir * ratchet + (i % 2) * (Math.PI / 8));
        }
      }
      // NO frame restore here. ground() runs inside the world transform, so a
      // strokeRect(5,5,…) lands at WORLD x5 and the camera magnifies its left
      // edge into a phantom full-height line beside the real bezel — it hid
      // behind a facade for as long as one happened to stand at x12. The
      // hardware is restored in post(), which draws in screen space.
    },
    post(ctx, t) {
      // A light reflective wash ties the tiny spot palette together without
      // erasing it. The old saturation/color-burn conversion made every scene
      // pea green; a remembered GBC screen should keep crude colour families.
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(168,198,108,0.22)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      // Fine colour-screen pixel lattice. It is texture rather than the
      // drawing grid: contours and facial detail remain sub-cell vector art.
      bakedFill(ctx, 'gbcCells', 3, 3, (c) => {
        c.fillStyle = 'rgba(30,43,72,0.11)';
        c.fillRect(2, 0, 1, 3);
        c.fillRect(0, 2, 3, 1);
      });
      if (!reduced) {
        // A tiny reflective-screen shimmer, not a broad white flash.
        ctx.fillStyle = `rgba(255,244,180,${0.008 + Math.sin(t * 6.3) * 0.008})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
    // No decorate. The old segment-ghost outline — a faint square trailing
    // every entity — read as a rendering bug beside the toaster and the
    // capsules, not as LCD relaxation. Legibility wins; the ghosting idea
    // lives on only where cells are authored for it (the city, the tower).
  };
}

function cardboardPack(settings) {
  const reducedMotion = settings && settings.reducedMotion;
  return {
    name: 'cardboard',
    lightBg: true,
    bg(ctx, t, camX, cab) {
      skyGrad(ctx, cab.sky[0], cab.sky[1]);
      const wob = reducedMotion ? 0 : Math.sin(t * 2) * 1.5;
      // cardboard cutout hills with corrugation ticks
      parallaxHills(ctx, camX, cab.far, GROUND_Y + wob, 56, 120, 0.15);
      ctx.fillStyle = 'rgba(90,64,32,0.3)';
      for (let x = 0; x < W; x += 10) ctx.fillRect(x, GROUND_Y - 60 + Math.round(wob), 2, 6);
      parallaxHills(ctx, camX, cab.hills, GROUND_Y - wob, 34, 60, 0.35);
      // a "distant" castle that is obviously four inches tall, on a stick
      const cx = ((300 - camX * 0.4 * PLX) % (W + 200)) - 100;
      ctx.fillStyle = '#b89058';
      ctx.fillRect(cx, GROUND_Y - 40, 24, 20);
      ctx.fillRect(cx + 2, GROUND_Y - 46, 5, 6);
      ctx.fillRect(cx + 17, GROUND_Y - 46, 5, 6);
      ctx.fillStyle = '#8a6a4a';
      ctx.fillRect(cx + 11, GROUND_Y - 20, 3, 20); // the visible stick
    },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0) {
      drawGapsAwareGround(ctx, camX, cab, obstacles, cab.ground, cab.groundDark, overhangs, t);
      // Corrugation ON the apron, and only where there is apron — the same rule
      // the pixel pack's ticks follow. Cardboard has pits from its first stage,
      // so a run of ticks across a hole is not a hypothetical here.
      ctx.fillStyle = 'rgba(90,64,32,0.4)';
      const solid = solidRuns(camX, obstacles);
      for (let x = -(camX % 10); x < W; x += 10) {
        if (!solid.some(([a, b]) => x >= a && x + 2 <= b)) continue;
        ctx.fillRect(x, GROUND_Y + 4, 2, 5);
      }
    },
    post(ctx, t) {
      ctx.fillStyle = 'rgba(200,160,104,0.05)';
      ctx.fillRect(0, 0, W, H);
    },
    decorate(ctx, e, x, y) {
      // visible tape corner
      ctx.fillStyle = 'rgba(232,232,240,0.5)';
      ctx.fillRect(x - 1, y - 1, 4, 3);
    },
  };
}

// A dried coffee ring. The previous attempt stroked an uneven circle, which
// still read as a drawn O — because a stain has no edges at all. What actually
// identifies one:
//   - it is SOAKED IN, so it multiplies the page rather than covering it, and
//     the rules stay visible through it, darkened;
//   - the rim is a soft band, not a line — liquid wicks into paper fibre, so
//     both sides of it fade out;
//   - the mug got set down more than once.
// So it is built from soft radial-gradient annuli instead of strokes. Three
// near-coincident passes make the rim uneven where they overlap, which beats
// any deliberate wobble, and a fourth offset pass is the second placement.
function coffeeRing(ctx, cx, cy, r, a2) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const blot = (x, y, rr, a, squash) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash); // a mug is never set down square on
    const R = rr * 1.18;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0.00, `rgba(158,112,64,${(a * 0.05).toFixed(3)})`); // barely-tinted centre
    g.addColorStop(0.60, `rgba(150,104,58,${(a * 0.12).toFixed(3)})`);
    g.addColorStop(0.82, `rgba(132,88,46,${(a * 0.45).toFixed(3)})`);
    g.addColorStop(0.90, `rgba(112,72,34,${a.toFixed(3)})`);          // solids pile up here
    g.addColorStop(0.97, `rgba(126,84,42,${(a * 0.22).toFixed(3)})`); // wicked into the fibre
    g.addColorStop(1.00, 'rgba(126,84,42,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  blot(cx, cy, r, 0.30, 0.94);
  blot(cx + r * 0.05, cy - r * 0.03, r * 0.98, 0.24, 0.96);
  blot(cx - r * 0.04, cy + r * 0.05, r * 1.03, 0.20, 0.92);
  // The mug was set down, lifted, and put back a little off its own print —
  // so the second ring nearly covers the first and is much fainter, being one
  // pass of liquid rather than the pile-up of the cup that sat there.
  const d = r * 0.36;
  blot(cx + Math.cos(a2) * d, cy + Math.sin(a2) * d * 0.9, r * 0.95, 0.10, 0.95);
  ctx.restore();
}

function doodlePack(settings) {
  // Which way the mug shifted when it was put back down. Rolled once here, in
  // the factory — getStylePack() runs on run entry, so this is fixed for the
  // whole run (the sheet cannot change while you are looking at it) and fresh
  // on the next one. Cosmetic only, so it takes Math.random rather than the
  // seeded gameplay rng; nothing about the run may depend on it.
  const a2 = Math.random() * Math.PI * 2;
  return {
    name: 'doodle',
    lightBg: true,
    // The sheet IS the screen: one page, held still, with the action drawn on
    // it like a flipbook. So NOTHING in the paper layer takes camX — not the
    // rules, not the margin, not the stain, not the punches. A scrolling grid
    // under a fixed margin line reads as two sheets sliding over each other,
    // and the punches made that contradiction impossible to miss. Speed is
    // carried by the terrain and obstacles, which are the ink, not the paper.
    // The camera's crane is the same argument in y: the sheet is held still and
    // the ink is redrawn higher up it, so the page does not travel either.
    bgPan: 0,
    bg(ctx, t, camX, cab) {
      // graph paper — a warm off-white, not near-#fff, so blue ink reads
      ctx.fillStyle = '#eceadf';
      ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 1;
      // Minor cells, then a heavier rule every 4th to give the page structure.
      for (let x = 0, i = 0; x < W; x += 16, i++) {
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(88,132,200,0.55)' : 'rgba(88,132,200,0.3)';
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
      }
      for (let y = 0, i = 0; y < H; y += 16, i++) {
        ctx.strokeStyle = i % 4 === 0 ? 'rgba(88,132,200,0.55)' : 'rgba(88,132,200,0.3)';
        ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
      }
      // margin line + coffee ring
      ctx.strokeStyle = 'rgba(210,70,70,0.55)';
      ctx.beginPath(); ctx.moveTo(30.5, 0); ctx.lineTo(30.5, H); ctx.stroke();
      // Loose-leaf punches: the page came out of a binder.
      // Spaced down the band between the HUD's left column (which runs to ~y80)
      // and the highest the terrain crest reaches, so nothing is ever drawn on
      // top of a hole — ink over a punch would give the illusion away.
      // Solid, not translucent: a punch is an absence of page, so no rule line
      // may show through it.
      ctx.fillStyle = '#000';
      for (const hy of [110, 170]) {
        ctx.beginPath(); ctx.arc(15, hy, 4.6, 0, Math.PI * 2); ctx.fill();
      }
      // Parked upper-right, clear of the HUD's left column and the name plate.
      coffeeRing(ctx, 392, 76, 28, a2);
    },
    ground(ctx, camX, cab, obstacles) {
      // wobbly ballpoint ground line, re-jittered at ~3fps
      const jitterSeed = Math.floor(performance.now() / 333);
      ctx.strokeStyle = '#3a3a58';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) {
        const j = Math.sin((x + jitterSeed * 77) * 12.9898) * 1.5;
        if (x === 0) ctx.moveTo(x, GROUND_Y + j); else ctx.lineTo(x, GROUND_Y + j);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          const x = ob.x - camX;
          ctx.fillStyle = '#eceadf';
          ctx.fillRect(x, GROUND_Y - 4, ob.w, 10);
          ctx.strokeStyle = '#3a3a58';
          ctx.strokeRect(x + 0.5, GROUND_Y + 2.5, ob.w, 20); // a pit, annotated
        }
      }
    },
    post(ctx, t) {},
    decorate(ctx, e, x, y) {
      // A biro underline instead of a box: still reads as margin-doodle
      // annotation, but never cages the art. Jitter is per-entity, so it
      // sits still instead of twitching every frame.
      const j = Math.sin(e.id * 12.9898) * 1.2;
      const by = y + e.h + 2;
      ctx.strokeStyle = 'rgba(58,58,88,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 1, by + j * 0.3);
      ctx.quadraticCurveTo(x + e.w / 2, by + 2.5 - j, x + e.w + 1, by + j * 0.3);
      ctx.stroke();
    },
  };
}

function surgePack(settings) {
  // Cycles through the other packs with glitch cuts (crossfades under reduced flashing).
  const packs = [pixelPack(settings), faux3dPack(settings), neonPack(settings), watercolorPack(settings), vhsPack(settings), lcdPack(settings), cardboardPack(settings), doodlePack(settings)];
  const reduced = settings && settings.reducedFlashing;
  const period = 7; // seconds per style
  function pick(t) { return packs[Math.floor(t / period) % packs.length]; }
  return {
    name: 'surge',
    dark: true,
    // Read fresh each frame by the run's draw, so the cast is held back past
    // post() only while the cycle is sitting on a pack that converts the frame.
    get actorsAbovePost() { return pick(this._t || 0).actorsAbovePost === true; },
    // Same deal for the bloom gate: the cycle passes through the light packs,
    // and their backgrounds clip just as hard here as they do standalone.
    get lightBg() { return pick(this._t || 0).lightBg === true; },
    // ...and for the crane: the cycle passes through lcd and doodle, whose
    // backgrounds are screen furniture and must stay put while it is on them.
    get bgPan() { return pick(this._t || 0).bgPan ?? 1; },
    // ...and for the two claims a pack can make on the ground: whether it fills
    // its own holes and whether it walks its own surface. Both are true only
    // while the cycle is sitting on the LCD pack, and both are read fresh by
    // the run's draw for exactly that reason.
    get ownPitFills() { return pick(this._t || 0).ownPitFills === true; },
    get ownSurface() { return pick(this._t || 0).ownSurface === true; },
    bg(ctx, t, camX, cab, totalDist, scene = null) { pick(t).bg(ctx, t, camX, cab, totalDist, scene); },
    ground(ctx, camX, cab, obstacles, overhangs, t = 0, viewW = W) { pick(this._t || 0).ground(ctx, camX, cab, obstacles, overhangs, t, viewW); },
    post(ctx, t) {
      this._t = t;
      pick(t).post(ctx, t);
      const phase = (t % period) / period;
      if (!reduced && phase > 0.96) {
        // glitch cut: horizontal slice offsets
        ctx.fillStyle = 'rgba(232,56,248,0.15)';
        for (let i = 0; i < 5; i++) ctx.fillRect(0, (i * 61 + t * 200) % H, W, 3);
      }
    },
    decorate(ctx, e, x, y) {
      const p = pick(this._t || 0);
      if (p.decorate) p.decorate(ctx, e, x, y);
    },
  };
}

const FACTORIES = {
  pixel: pixelPack, faux3d: faux3dPack, neon: neonPack, watercolor: watercolorPack,
  vhs: vhsPack, lcd: lcdPack, cardboard: cardboardPack, doodle: doodlePack, surge: surgePack,
};

export function getStylePack(name, settings) {
  const f = FACTORIES[name] || FACTORIES.pixel;
  const pack = f(settings || {});
  if (!pack.decorate) pack.decorate = null;
  return pack;
}
