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
const LCD_PANEL = '#a8c66c';
const LCD_INK = '#26355d';
// The screen colour as it reaches the lane. A hole clearing its own mouth has
// to restore this exact value or the break reads as a lit strip.
const LCD_PANEL_LIT = '#dce49a';

// THREE SCENES, not one city with its gain turned up. These are the authored
// backdrops for RHYTHM BANKRUPTCY's three stages; only the cells inside and
// above them switch. Coordinates are screen-space because this cabinet keeps
// its skyline fixed to the display while the lane runs underneath it.
const LCD_CITY_SCENES = [
  null,
  {
    // Reading order, left to right: the clock tower opens the scene, three
    // buildings walk up to the invader billboard, THEN the DONKEY KONG tower,
    // and the skyline continues past it.
    //
    // 110 TALL, AND THAT IS THE CEILING — the crash sets it, not taste.
    // Everything above this roof is one rigid stack: his skull tops out at
    // roof-42, the barrel rests on his raised hands at roof-43 and reaches
    // roof-57, and the plane's lane is pinned under the beat ribbon's band
    // (bottom y 49), which on the 2px grid puts its belly at y 62 and nowhere
    // else. So the contact depth is just 119 - roof: every pixel of tower
    // drives the plane further down the barrel and closer to his scalp, and
    // there is no slack anywhere in the stack to trade back — the barrel
    // already sits one pixel above his crown. At 118 the barrel's top was ON
    // the ribbon line, the plane went through its middle and its belly passed
    // two pixels off his hair, which read as landing on the gorilla. At 110:
    // barrel top 57, plane belly 62, so it clips the top third of the barrel
    // and clears his head by ten. Two more pixels of building and the contact
    // is at the barrel's waist again. He still tops the skyline either way; it
    // is the roof that moved, not him.
    // EIGHT structures, evenly spaced (~12px of air between neighbours and at
    // both edges), and the DONKEY KONG tower is the fifth: clock, chart,
    // transmitter, invader, TOWER, smoking water-tower, burger, cassette.
    buildings: [
      [12, 42, 104, 'clockworks'], [66, 36, 74, 'storefront'], [114, 48, 116, 'deco'],
      [174, 38, 88, 'fire-escape'],
      [324, 46, 104, 'water-tower'], [382, 36, 66, 'storefront'], [431, 34, 80, 'workshop'],
    ],
    clouds: [[28, 52], [184, 42], [346, 58]],
    // The dial STANDS ON the clockworks roof (its feet and brace are drawn
    // under it), so this y moves with that building's height, not apart from
    // it — roof 120, case bottom 116. 8px is the whole of the room there is:
    // the plane enters low over this end of the skyline and its belly steps
    // through y 78-82 across x 12..49, and the dial's top edge is y 87.
    clock: [36, 100, 13],
    // The DONKEY KONG tower: open girder floors zigzagging down its whole
    // face, the big rooftop gorilla on top and a little runner two floors
    // below him. [x, w, h]. The gorilla lives HERE now, so this scene sets no
    // rooftopGorilla of its own.
    gameWatch: [224, 88, 110],
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
    billboards: [[1, 'chart'], [3, 'invader'], [5, 'burger'], [6, 'cassette']],
    transmitter: 2,
    smokestacks: [[4, 6]],
    // In low at 78 over the left-hand roofs — which now clear the clock case
    // by 5px and the near billboards by a good 40 — level at 51 by the
    // tower's centre line (224 + 88/2). Snapped to the 2px grid that is y 50,
    // so the belly runs at 62: through the top third of the raised barrel
    // (top 57) and ten clear of the gorilla's skull (top 72).
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
      from: 78, to: 51, level: 268,
      tow: ['INSERT COIN', 'GG', '♥♥♥'],
      banner: { text: 'KEY CHANGE', bar: 61 },
    },
  },
  {
    // EIGHT structures with even air, like the other two scenes.
    buildings: [
      [16, 42, 56, 'speaker'], [74, 36, 128, 'deco'], [126, 48, 72, 'music-hall'],
      [190, 38, 148, 'spire'], [244, 52, 50, 'speaker'], [312, 40, 138, 'deco'],
      [368, 46, 66, 'music-hall'], [430, 36, 142, 'spire'],
    ],
    clouds: [[22, 54], [236, 44], [396, 62]],
    // Stage 2 was the one panel with no sky or rooftop life at all — windows,
    // equalizers and clouds and nothing else. It gets the working city: a
    // searchlight sweeping off the music hall, a commuter train on a viaduct
    // behind the skyline, a window washer who is having a day, and the
    // repossession helicopter that arrives in the second half and leaves with
    // whatever it can lift.
    // A banner plane here too, in the one lane this skyline leaves: under the
    // billboards and the viaduct, over the tallest roof (building 3, top y 76).
    // It enters low at the left end, where the roofs are short, and settles at
    // 62 by the middle — twelve pixels of aircraft with room either side of it.
    plane: { from: 70, to: 62, level: 240, tow: ['FREE PLAY', '8BIT4EVA', 'NO REFUNDS', 'PLAYER 2?'] },
    searchlight: [2, 24],
    train: { y: 62, cars: 4, fromPhase: 1 },
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
    // gorilla's deco is capped at 124 so his raised barrel stays under the
    // beat ribbon's band, and his thrown barrels now fall down a ghosted
    // chute beside his building — one cell per heard beat, street level on
    // beat four (barrelDrop below).
    buildings: [
      [19, 34, 58, 'ducts'], [72, 42, 108, 'relay'], [133, 34, 44, 'workshop'],
      [186, 46, 118, 'industrial'], [251, 32, 124, 'deco'], [302, 44, 62, 'ducts'],
      [365, 34, 126, 'relay'], [418, 42, 68, 'industrial'],
    ],
    clouds: [[18, 46], [264, 52], [398, 40]],
    // The high lane: every mast on this skyline tops out at y 79 (building 6's,
    // the tallest) and the beat ribbon's band ends at 49, so the crossing sits
    // between them and levels off before it reaches the gorilla — who is drawn
    // after it and eclipses it as it passes. See drawLCDCity.
    plane: { from: 66, to: 54, level: 200, tow: ['HIGH SCORE', 'ONE MORE GO', 'PRESS START'] },
    rooftopGorilla: 4,
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

function lcdSceneFrame(scene, reducedMotion) {
  const stageIndex = Math.max(1, Math.min(3, Math.trunc(scene?.stageIndex) || 1));
  const live = !reducedMotion && Number.isFinite(scene?.beat);
  const beat = live ? Math.floor(scene.beat) : 0;
  const p = Number.isFinite(scene?.progress) ? Math.max(0, Math.min(1, scene.progress)) : 0;
  return {
    stageIndex,
    live,
    step: lcdMod(beat, 16),
    beat4: lcdMod(beat, 4),
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
    spectrum: reducedMotion ? null : lcdHeardSpectrum(scene?.audio),
    audio: reducedMotion || !lcdHeardSpectrum(scene?.audio) ? null : scene.audio,
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

function lcdWindowGrid(ctx, building, index, frame) {
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
      cells.push({ row, col, x: Math.round(cx - 3), y, active: row < activeRows && y <= GROUND_Y - 28 });
    }
  }
  // Big, solid colour tiles: closer to a GBC game's readable window blocks
  // than the old fine H-shaped LCD segments. A tiny highlight gives each tile
  // glass without cutting its silhouette into panes.
  ctx.fillStyle = LCD_WINDOW_OFF;
  for (const cell of cells) ctx.fillRect(cell.x, cell.y, 7, 6);
  ctx.fillStyle = 'rgba(220,225,151,0.34)';
  for (const cell of cells) {
    ctx.fillRect(cell.x + 1, cell.y + 1, 5, 2);
  }

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
    active.push(...cells.filter((cell) => cell.active && cell.row === row && cell.col === col));
  } else if (frame.stageIndex === 2) {
    const parity = frame.beat4 === 1 || frame.beat4 === 3 ? 1 : 0;
    const row = lcdMod(Math.floor(frame.step / 2) + index, activeRows);
    active.push(...cells.filter((cell) => cell.active && cell.row === row && cell.col % 2 === parity));
  } else {
    const dir = (index + frame.phrase) % 2 === 0 ? 1 : -1;
    const rowA = lcdMod(frame.step * dir + index, activeRows);
    const rowB = lcdMod(rowA + Math.max(1, Math.floor(activeRows / 2)), activeRows);
    const colA = lcdMod(frame.step + index, cols);
    const colB = lcdMod(cols - 1 - colA, cols);
    active.push(...cells.filter((cell) => cell.active && ((cell.row === rowA && cell.col === colA)
      || (cell.row === rowB && cell.col === colB))));
  }
  if (floor > 0) {
    const col = lcdMod(Math.floor(frame.step / 2) + index, cols);
    active.push(...cells.filter((cell) => cell.active && cell.col === col
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

function gbcBuildingLineArt(ctx, building, isGorilla) {
  const [x, w, h, style] = building;
  const top = GROUND_Y - h;
  const detailBottom = GROUND_Y - 27;
  const cx = Math.round(x + w / 2);

  ctx.strokeStyle = LCD_PRINT;
  // The facade continues to the bottom of the display. The road apron masks
  // this lower portion everywhere except a pit, where it becomes the actual
  // background seen through the opening.
  ctx.strokeRect(x + 0.5, top + 0.5, w, H - top);
  // Cornice, sill and corner masonry give the facades a designed scale. The
  // lower 27px remain quiet so this never becomes false lane furniture.
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(x + 2, top + 4, w - 4, 1);
  ctx.fillRect(x + 3, top + 7, 1, Math.max(1, detailBottom - top - 7));
  ctx.fillRect(x + w - 4, top + 7, 1, Math.max(1, detailBottom - top - 7));

  if (style === 'storefront') {
    ctx.strokeRect(x + 5.5, top - 5.5, w - 11, 5);
    ctx.fillRect(x + 8, top - 3, w - 16, 1);
    ctx.fillRect(x + 5, top + 8, w - 10, 2);
    for (let sx = x + 7; sx < x + w - 6; sx += 6) ctx.fillRect(sx, top + 10, 3, 2);
  } else if (style === 'clockworks') {
    ctx.fillRect(x + 5, top - 3, 7, 3); ctx.fillRect(x + w - 12, top - 3, 7, 3);
    ctx.fillRect(cx - 1, top + 7, 2, Math.max(4, detailBottom - top - 9));
    for (let y = top + 18; y < detailBottom; y += 20) ctx.fillRect(x + 5, y, w - 10, 1);
  } else if (style === 'workshop') {
    if (!isGorilla) {
      lcdStrokePath(ctx, [[x + 1, top], [x + 8, top - 6], [x + 15, top],
        [x + 22, top - 6], [x + w - 1, top]]);
    }
    ctx.fillRect(x + 5, top + 7, w - 10, 1);
    ctx.strokeRect(x + 6.5, top + 13.5, Math.max(8, w - 13), 8);
  } else if (style === 'deco') {
    if (!isGorilla) {
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
    if (!isGorilla) {
      ctx.fillRect(cx - 8, top - 11, 16, 1);
      ctx.strokeRect(cx - 7.5, top - 10.5, 15, 7);
      ctx.fillRect(cx - 6, top - 8, 12, 1);
      ctx.fillRect(cx - 6, top - 3, 1, 3); ctx.fillRect(cx + 5, top - 3, 1, 3);
      lcdStrokePath(ctx, [[cx - 5, top], [cx + 5, top - 3], [cx + 5, top]]);
    }
    for (let y = top + 16; y < detailBottom; y += 20) ctx.fillRect(x + 6, y, w - 12, 1);
  } else if (style === 'office') {
    ctx.fillRect(x + 6, top + 7, 2, Math.max(4, detailBottom - top - 8));
    ctx.fillRect(x + w - 8, top + 7, 2, Math.max(4, detailBottom - top - 8));
    for (let y = top + 18; y < detailBottom; y += 20) ctx.fillRect(x + 5, y, w - 10, 1);
  } else if (style === 'speaker') {
    ctx.strokeRect(cx - 9.5, top - 5.5, 19, 5);
    for (const [cy, r] of [[top + 15, 5], [top + 29, 7]]) {
      if (cy + r >= detailBottom) continue;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, r - 3), 0, Math.PI * 2); ctx.stroke();
    }
  } else if (style === 'music-hall') {
    ctx.strokeRect(cx - 11.5, top - 5.5, 23, 5);
    ctx.fillRect(cx - 8, top - 3, 16, 1);
    ctx.strokeRect(x + 6.5, top + 8.5, w - 13, 9);
    ctx.fillRect(x + 9, top + 12, w - 18, 1);
  } else if (style === 'spire') {
    if (!isGorilla) {
      lcdStrokePath(ctx, [[cx - 10, top], [cx - 6, top - 6], [cx - 3, top - 6],
        [cx, top - 15], [cx + 3, top - 6], [cx + 6, top - 6], [cx + 10, top]]);
      ctx.fillRect(cx, top - 21, 1, 7);
    }
    ctx.fillRect(cx - 1, top + 4, 2, Math.max(4, detailBottom - top - 6));
  } else if (style === 'ducts') {
    if (!isGorilla) {
      ctx.strokeRect(x + 6.5, top - 6.5, 7, 6);
      ctx.fillRect(x + 8, top - 10, 3, 4);
      lcdStrokePath(ctx, [[x + w - 15, top], [x + w - 15, top - 8],
        [x + w - 7, top - 8], [x + w - 7, top]]);
    }
    ctx.fillRect(x + 6, top + 8, w - 12, 1);
  } else if (style === 'relay') {
    ctx.strokeRect(cx - 9.5, top - 4.5, 19, 4);
    ctx.fillRect(cx - 6, top - 2, 12, 1);
    for (let y = top + 17; y < detailBottom; y += 18) ctx.fillRect(x + 5, y, w - 10, 1);
  } else if (style === 'industrial') {
    if (!isGorilla) {
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
// A maze-game attract screen on a rooftop: three ghosts running, and the round
// one behind them eating his way along the corridor. It steps ONE CELL PER
// HEARD BEAT and chomps on the same beat, which is the only clock anything on
// this panel keeps — so the chase is quarter notes, and a player watching the
// board is watching the tempo.
//
// Built as a STRIP that the board is a window onto, rather than as a list of
// authored frames. Four sprites at a six-cell pitch is twenty-four cells and
// the board is thirteen wide, so frames would be thirty-two near-identical
// pictures; a strip says the same thing once and the window does the walking.
// Thirty-two cells is eight bars, so the chase leaves at one edge and comes
// round at the other on a bar line rather than mid-phrase.
const LCD_CHASE_W = 13;
const LCD_CHASE_LEN = 32;
const LCD_CHASE_PITCH = 6;
// A ghost, five by five, with its eyes and its skirt punched out of the body —
// on a dark board an unlit cell IS the hole, so the eyes cost nothing.
const lcdGhostCells = (k, pose) => [
  '.XXX.',
  'XXXXX',
  'X.X.X',
  'XXXXX',
  pose ? 'X.X.X' : '.X.X.',
].map((row) => row.replaceAll('X', k));
// ...and the round one, facing the way he is travelling, chomping on the beat.
const lcdPacCells = (pose) => (pose ? [
  '.PPP.',
  'PPPPP',
  'PPPPP',
  'PPPPP',
  '.PPP.',
] : [
  '.PPP.',
  'PPPPP',
  '..PPP',
  'PPPPP',
  '.PPP.',
]);
function lcdChaseStrip(pose) {
  const rows = ['', '', '', '', '', '', '', ''];
  const cast = [lcdGhostCells('A', pose), lcdGhostCells('B', pose), lcdGhostCells('C', pose),
    lcdPacCells(pose)];
  // Row 0 is air over their heads, rows 1..5 the cast, row 6 air, row 7 the
  // corridor's pellets — which do NOT scroll with the strip, because the dots
  // are the place and the chase is what is moving through it.
  for (let c = 0; c < LCD_CHASE_LEN; c++) {
    const who = Math.floor(c / LCD_CHASE_PITCH);
    const col = c % LCD_CHASE_PITCH;
    const sprite = who < cast.length && col < 5 ? cast[who] : null;
    rows[0] += '.';
    for (let r = 0; r < 5; r++) rows[r + 1] += sprite ? sprite[r][col] : '.';
    rows[6] += '.';
    rows[7] += '.';
  }
  return rows;
}
const LCD_CHASE_STRIPS = [lcdChaseStrip(0), lcdChaseStrip(1)];
function lcdChaseGrid(frame) {
  const strip = LCD_CHASE_STRIPS[frame.beat4 % 2];
  const off = lcdMod(frame.bar * 4 + frame.beat4, LCD_CHASE_LEN);
  return strip.map((row, r) => {
    let out = '';
    for (let c = 0; c < LCD_CHASE_W; c++) {
      // The pellet row is fixed to the BOARD, not to the strip: every other
      // cell, lit, the corridor they are all running down.
      out += r === 7 ? (c % 2 === 0 ? 'd' : '.') : row[(off + c) % LCD_CHASE_LEN];
    }
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
    ink: { A: '#b9cf79', B: LCD_WINDOW_ON, C: '#d4a35e', P: '#f6d33c', d: LCD_WINDOW_OFF },
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

// ---- chimney smoke ------------------------------------------------------
//
// A rooftop stack with four authored puff cells stepping up and downwind —
// the same leftward wind the clouds ride. The cells are fixed (a rising,
// swelling, fading column); the beat gives them life: each puff shimmies a
// pixel on its own parity and the top wisp only holds together every other
// beat. Reduced motion (beat 0 forever) leaves a composed still column.
// The puffs are PIXEL blobs on the same 2px grid the billboards use — soft
// ellipses floated like production smoke against a coarse-pixel skyline.
const LCD_PUFFS = [
  ['XX', 'XX'],
  ['.XX.', 'XXXX', '.XX.'],
  ['.XXX.', 'XXXXX', 'XX.XX'],
  ['XX.XX', '.XXX.'],
];
function lcdSmokestack(ctx, building, dx, frame) {
  const [x, , h] = building;
  const roof = GROUND_Y - h;
  const sx = Math.round(x + dx);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(sx, roof - 9, 5, 9);
  ctx.fillRect(sx - 1, roof - 11, 7, 3);
  const cells = [[1, -19], [-1, -26], [-5, -34], [-10, -41]];
  // The column breathes with the mix: a quiet bar is two puffs, a loud one
  // carries the whole plume. Quantised to whole puffs, like everything here.
  const heard = frame.audio ? frame.audio.level : null;
  const puffs = heard == null ? cells.length
    : Math.max(2, Math.min(cells.length, 2 + Math.round(heard * 2.6)));
  for (let i = 0; i < puffs; i++) {
    if (i === cells.length - 1 && heard == null && frame.beat4 % 2 === 1) continue;
    const [px, py] = cells[i];
    const wob = (frame.beat4 + i) % 2 === 0 ? 0 : 2;
    ctx.fillStyle = `rgba(53,83,101,${(0.4 - i * 0.08).toFixed(2)})`;
    const grid = LCD_PUFFS[i];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === 'X') ctx.fillRect(sx + px + wob + c * 2, roof - 11 + py + r * 2, 2, 2);
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
const LCD_BANNER_ART = {
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
function lcdBannerMark(ch) {
  const art = LCD_BANNER_ART[ch];
  if (art) return { rows: art.cells, w: art.cells[0].length, ink: art.ink, on: 'X' };
  const rows = ch === ' ' ? null : pixelGlyph(ch);
  return { rows, w: 5, ink: LCD_PRINT, on: '1' };
}
function lcdBannerBox(text) {
  let w = LCD_BANNER_PAD * 2 + 2;
  for (const ch of text) w += lcdBannerMark(ch).w + LCD_BANNER_TRACK;
  return { w: w - LCD_BANNER_TRACK, h: 7 + LCD_BANNER_PAD * 2 + 2 };
}
function lcdSkyBanner(ctx, rightX, midY, text) {
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
    const mark = lcdBannerMark(ch);
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
function lcdTowLine(towList, passNo, start) {
  if (!towList || !towList.length || passNo <= 0) return null;
  let flown = 0;
  for (let p = 0; p < passNo; p++) if (lcdFreePassFlies(p, start)) flown++;
  return flown > 0 ? towList[lcdMod(flown - 1, towList.length)] : null;
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
    if (beat >= start && beat < start + LCD_PLANE_BEATS) {
      return { cyc: beat - start, banner: banner.text };
    }
    if (cyc >= LCD_PLANE_BEATS) return null;
    if (!lcdFreePassFlies(passNo, start)) return null;
  } else if (cyc >= LCD_PLANE_BEATS) return null;
  return { cyc, banner: lcdTowLine(towList, passNo, start) };
}

function lcdPlane(ctx, art, frame, altitude = LCD_PLANE_Y) {
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return;
  const pos = lcdPlaneAt(pass.cyc, altitude);
  if (!pos) return;
  const { x, y } = pos;
  // The banner first, so the tow line runs under the tail rather than over it.
  if (pass.banner) {
    // A towed banner sags and lifts; one pixel on the off beats is the whole of
    // it, and it is the same tick the tail already wags on.
    const sag = frame.beat4 % 2 === 0 ? 0 : 1;
    ctx.fillStyle = LCD_PRINT;
    ctx.fillRect(x - LCD_BANNER_GAP, y + 6, LCD_BANNER_GAP, 1);
    lcdSkyBanner(ctx, x - LCD_BANNER_GAP, y + 6 + sag, pass.banner);
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
const lcdStrikeCache = new WeakMap();
function lcdBarrelStrike(art) {
  if (lcdStrikeCache.has(art)) return lcdStrikeCache.get(art);
  let strike = -1;
  if (art.plane && art.gameWatch) {
    const [gx, gw, gh] = art.gameWatch;
    const bx = Math.round(gx + gw / 2), by = GROUND_Y - gh + LCD_BARREL_UP_DY;
    for (let cyc = 0; cyc < LCD_PLANE_BEATS && strike < 0; cyc++) {
      if (lcdMod(cyc, 4) !== LCD_BARREL_UP_BEAT) continue;
      const p = lcdPlaneAt(cyc, art.plane);
      if (p && Math.abs(bx - (p.x + LCD_PLANE_W / 2)) < LCD_PLANE_W / 2 + LCD_BARREL_RX
        && Math.abs(by - (p.y + LCD_PLANE_H / 2)) < LCD_PLANE_H / 2 + LCD_BARREL_RY) strike = cyc;
    }
  }
  lcdStrikeCache.set(art, strike);
  return strike;
}

// 0 on the beat of the strike, 1 on the beat after, -1 the rest of the time.
function lcdBurstPhase(art, frame) {
  const strike = lcdBarrelStrike(art);
  if (strike < 0) return -1;
  // Off the pass the plane is ACTUALLY on. The gag is solved in steps of the
  // crossing, and a banner pass is a crossing like any other — read against the
  // free-running clock instead, the barrel would burst on a beat with nothing
  // in the sky to burst it.
  const pass = lcdPlaneCyc(art, frame);
  if (!pass) return -1;
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
export function lcdBarrelStrikeAt(stageIndex, beat) {
  if (!Number.isFinite(beat)) return false;
  const art = LCD_CITY_SCENES[Math.max(1, Math.min(3, Math.trunc(stageIndex) || 1))];
  if (!art) return false;
  const strike = lcdBarrelStrike(art);
  return strike >= 0 && lcdMod(Math.floor(beat), 64) === strike;
}

function lcdVanishedBarrelCell(art, frame) {
  const strike = lcdBarrelStrike(art);
  if (strike < 0) return -1;
  const since = lcdMod(frame.bar * 4 + frame.beat4 - strike, 64);
  return since < 12 ? since : -1;
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
const LCD_TRAIN_CAR = 26;
function lcdTrain(ctx, spec, frame) {
  const { y, cars = 4 } = spec;
  // The viaduct: a girder with piers, printed soft so it reads as distance.
  ctx.fillStyle = LCD_PRINT_SOFT;
  ctx.fillRect(0, y + 12, W, 2);
  for (let px = 8; px < W; px += 34) ctx.fillRect(px, y + 14, 2, 10);
  const span = W + cars * LCD_TRAIN_CAR + 40;
  const head = span - lcdMod((frame.bar * 4 + frame.beat4) * LCD_TRAIN_CAR, span);
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

function lcdClock(ctx, spec, beat4) {
  const [x, y, r] = spec;
  ctx.strokeStyle = LCD_PRINT;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r - 3, 0, Math.PI * 2); ctx.stroke();
  // A proper rooftop case, hour marks and braced feet make this read as a
  // clock before its cardinal hand starts stepping around the dial.
  ctx.fillStyle = LCD_PRINT_SOFT;
  for (let n = 0; n < 12; n++) {
    const a = n * Math.PI / 6;
    const tx = Math.round(x + Math.sin(a) * (r - 5));
    const ty = Math.round(y - Math.cos(a) * (r - 5));
    ctx.fillRect(tx - (n % 3 === 0 ? 1 : 0), ty - 1, n % 3 === 0 ? 3 : 1, 2);
  }
  ctx.fillRect(x - r + 3, y + r + 2, 4, 4);
  ctx.fillRect(x + r - 7, y + r + 2, 4, 4);
  lcdStrokePath(ctx, [[x - r + 4, y + r + 6], [x - 5, y + r], [x + 5, y + r], [x + r - 4, y + r + 6]]);
  ctx.fillStyle = LCD_WINDOW_OFF;
  ctx.fillRect(x - 1, y - r + 4, 3, r - 3);
  ctx.fillRect(x + 2, y - 1, r - 3, 3);
  ctx.fillRect(x - 1, y + 2, 3, r - 3);
  ctx.fillRect(x - r + 4, y - 1, r - 3, 3);
  ctx.fillStyle = LCD_WINDOW_ON;
  if (beat4 === 0) ctx.fillRect(x - 1, y - r + 4, 3, r - 3);
  else if (beat4 === 1) ctx.fillRect(x + 2, y - 1, r - 3, 3);
  else if (beat4 === 2) ctx.fillRect(x - 1, y + 2, 3, r - 3);
  else ctx.fillRect(x - r + 4, y - 1, r - 3, 3);
  ctx.fillRect(x - 1, y - 1, 3, 3);
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
function gbcGorillaBarrel(ctx, x, y, ghost = false) {
  gbcEllipse(ctx, x, y, 8, 7, ghost ? LCD_MOTION_GHOST : '#d4a35e',
    ghost ? LCD_MOTION_GHOST : LCD_PRINT, 1);
  if (ghost) return;
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

// `burst` is the phase from lcdBurstPhase, or -1: on those two beats the barrel
// he is holding is not there to be drawn, because the plane just removed it.
function lcdRooftopGorilla(ctx, building, frame, burst = -1, reducedFlashing = false) {
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
  const startled = burst >= 0;
  const eyeR = startled ? 2.7 : 2.4, eyeH = startled ? 3.1 : 2.8;
  gbcEllipse(ctx, cx - 3.5, roof - 31, eyeR, eyeH, '#f3edb1');
  gbcEllipse(ctx, cx + 3.5, roof - 31, eyeR, eyeH, '#f3edb1');
  gbcEllipse(ctx, cx - 3, roof - 30.5, 1.1, 1.4, LCD_PRINT);
  gbcEllipse(ctx, cx + 3, roof - 30.5, 1.1, 1.4, LCD_PRINT);
  ctx.strokeStyle = LCD_PRINT; ctx.lineWidth = 1.5;
  const browY = startled ? roof - 36 : roof - 35;
  ctx.beginPath(); ctx.moveTo(cx - 7, browY); ctx.quadraticCurveTo(cx - 3, browY - 2, cx, browY + 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, browY + 1); ctx.quadraticCurveTo(cx + 3, browY - 2, cx + 7, browY); ctx.stroke();
  gbcEllipse(ctx, cx - 2.5, roof - 26, 1, 0.8, LCD_PRINT);
  gbcEllipse(ctx, cx + 2.5, roof - 26, 1, 0.8, LCD_PRINT);
  if (startled) {
    gbcEllipse(ctx, cx, roof - 23, 2, 2.4, LCD_PRINT);
    ctx.fillStyle = LCD_PRINT;
    for (const [mx, my] of LCD_STARTLE_MARKS) {
      ctx.fillRect(cx + mx * 2, roof - 31 + my * 2, 2, 2);
    }
    ctx.fillStyle = '#b9cf79';
    ctx.fillRect(cx + 12, roof - 36, 2, 2);
    ctx.fillRect(cx + 12, roof - 33, 2, 3);
  } else {
    ctx.beginPath(); ctx.moveTo(cx - 4, roof - 23.5); ctx.quadraticCurveTo(cx, roof - 21.5, cx + 4, roof - 23.5); ctx.stroke();
  }

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
  if (burst < 0) gbcGorillaBarrel(ctx, pose.barrel[0], pose.barrel[1]);
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

// The runner. Deliberately BLOCKY — rectangles, not curves — because he is a
// toy inside a toy, and he wears LORENZO'S colours (heroes.js lorenzo.pal):
// purple cap with the gold emblem, teal shirt, blue overalls, brown
// moustache. `mode` is one of:
//   { kind: 'run', stride, dir }  — walking a girder, facing dir (+1 right)
//   { kind: 'climb', arms }       — on a ladder from behind, arms alternating
//   { kind: 'hit' }               — clipped by a barrel: arms up, cap popped
function lcdRunnerFigure(ctx, rx, footY, mode) {
  let y = footY;
  // Mirror helper for the few side-specific cells when he faces left.
  const dir = mode.dir || 1;
  const M = (o, w) => (dir === 1 ? o : 1 - o - w);
  if (mode.kind === 'climb') {
    ctx.fillStyle = '#22608c';
    ctx.fillRect(rx - 3, y - 4, 3, 4);
    ctx.fillRect(rx + 1, y - 4, 3, 4);
    ctx.fillRect(rx - 3, y - 7, 8, 3);
    ctx.fillStyle = '#2ea8a0';
    ctx.fillRect(rx - 3, y - 10, 8, 3);
    // One arm reaching, one at the rail, swapping as he climbs.
    ctx.fillRect(mode.arms ? rx - 5 : rx + 4, y - 13, 2, 4);
    ctx.fillRect(mode.arms ? rx + 4 : rx - 5, y - 9, 2, 4);
    // The back of his head is all cap.
    ctx.fillStyle = '#7b4bd0';
    ctx.fillRect(rx - 3, y - 15, 7, 5);
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
  } else if (mode.kind === 'run' && mode.stride) {
    ctx.fillRect(rx + M(-4, 3), y - 4, 3, 4);
    ctx.fillRect(rx + M(1, 4), y - 3, 4, 3);
  } else {
    ctx.fillRect(rx - 3, y - 4, 3, 4);
    ctx.fillRect(rx + 1, y - 4, 3, 4);
  }
  ctx.fillRect(rx - 3, y - 7, 8, 3);
  ctx.fillStyle = '#2ea8a0';
  ctx.fillRect(rx - 3, y - 10, 8, 3);
  if (hit) {
    ctx.fillRect(rx - 5, y - 13, 2, 4);
    ctx.fillRect(rx + 4, y - 13, 2, 4);
  } else {
    ctx.fillRect(rx + M(3, 2), y - 10, 2, 3);
  }
  ctx.fillStyle = '#22608c';
  ctx.fillRect(rx - 1, y - 9, 1, 2);
  ctx.fillRect(rx + 2, y - 9, 1, 2);
  ctx.fillStyle = '#f2c9a0';
  ctx.fillRect(rx - 2, y - 14, 6, 4);
  ctx.fillStyle = '#5a3212';
  ctx.fillRect(rx + M(1, 3), y - 11, 3, 1);
  ctx.fillStyle = LCD_PRINT;
  ctx.fillRect(rx + M(1, 1), y - 13, 1, 1);
  ctx.fillStyle = '#7b4bd0';
  const capLift = hit ? 3 : 0;
  ctx.fillRect(rx - 3, y - 16 - capLift, 7, 2);
  if (!hit) ctx.fillRect(rx + M(3, 3), y - 15, 3, 1);
  ctx.fillStyle = '#f6d33c';
  ctx.fillRect(rx - 1, y - 16 - capLift, 1, 1);
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

  // THE RUNNER'S WHOLE CLIMB, one cell per heard beat across a four-bar loop:
  // along the bottom girder, up the right ladder, back along the middle one,
  // up the left ladder, and out along the top — where the live barrel cell
  // rolling right past x+56 clips him (cap popped, sparks), and the next
  // downbeat finds him back at the bottom. Beat 15 is the empty cell: he is
  // nowhere, which is how a toy says "respawning".
  const ladA = x + 26, ladB = x + 56;
  const climbY = (lx, topF, botF, frac) => {
    const a = floorY(topF, lx + 3), b2 = floorY(botF, lx + 3);
    return b2 - (b2 - a) * frac;
  };
  const journey = [
    { rx: x + 16, fy: floorY(2, x + 16), m: { kind: 'run', stride: 0, dir: 1 } },
    { rx: x + 30, fy: floorY(2, x + 30), m: { kind: 'run', stride: 1, dir: 1 } },
    // The floor-two barrel crosses him between these beats — he is airborne
    // as it passes underneath.
    { rx: x + 44, fy: floorY(2, x + 44), m: { kind: 'jump', dir: 1 } },
    { rx: x + 58, fy: floorY(2, x + 58), m: { kind: 'run', stride: 1, dir: 1 } },
    { rx: ladB + 3, fy: climbY(ladB, 1, 2, 0.38), m: { kind: 'climb', arms: 0 } },
    { rx: ladB + 3, fy: climbY(ladB, 1, 2, 0.8), m: { kind: 'climb', arms: 1 } },
    // The floor-one barrel's live cell IS x+50 on this beat: straight over it.
    { rx: x + 50, fy: floorY(1, x + 50), m: { kind: 'jump', dir: -1 } },
    { rx: x + 40, fy: floorY(1, x + 40), m: { kind: 'run', stride: 1, dir: -1 } },
    { rx: x + 32, fy: floorY(1, x + 32), m: { kind: 'run', stride: 0, dir: -1 } },
    { rx: x + 27, fy: floorY(1, x + 27), m: { kind: 'run', stride: 1, dir: -1 } },
    { rx: ladA + 3, fy: climbY(ladA, 0, 1, 0.38), m: { kind: 'climb', arms: 0 } },
    { rx: ladA + 3, fy: climbY(ladA, 0, 1, 0.8), m: { kind: 'climb', arms: 1 } },
    { rx: x + 32, fy: floorY(0, x + 32), m: { kind: 'run', stride: 0, dir: 1 } },
    { rx: x + 44, fy: floorY(0, x + 44), m: { kind: 'run', stride: 1, dir: 1 } },
    // The one he doesn't clear: the live cell rolls through x+38 right as he
    // arrives beside it.
    { rx: x + 44, fy: floorY(0, x + 44), m: { kind: 'hit' } },
    null,
  ];
  const leg = journey[frame.step];
  if (leg) lcdRunnerFigure(ctx, leg.rx, Math.round(leg.fy), leg.m);

  // And the thrower himself: the SAME big gorilla painter the other scenes
  // put on a rooftop, standing on this one. His authored poses land the
  // downbeat throw right where the top girder's first cell lights.
  lcdRooftopGorilla(ctx, [x, w, h], frame, burst, reducedFlashing);
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
  const reducedMotion = !!settings.reducedMotion;
  const frame = lcdSceneFrame(scene, reducedMotion);
  const palette = LCD_GBC_PALETTES[frame.stageIndex];
  const sky = LCD_SKY_PHASES[frame.stageIndex][frame.phase] || palette.sky;
  skyGrad(ctx, sky[0], sky[1]);
  ctx.fillStyle = sky[1];
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  // `skyMeter` on: the jukebox wants the analyser in the sky.
  drawLCDCity(ctx, scene, reducedMotion, !!settings.reducedFlashing, settings.skyMeter !== false);
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

function drawLCDCity(ctx, scene, reducedMotion, reducedFlashing, skyMeter = false) {
  const frame = lcdSceneFrame(scene, reducedMotion);
  const art = LCD_CITY_SCENES[frame.stageIndex];
  const palette = LCD_GBC_PALETTES[frame.stageIndex];
  ctx.lineWidth = 1;
  if (skyMeter) lcdSkylineEq(ctx, frame);
  if (art.train && frame.phase >= (art.train.fromPhase ?? 0)) lcdTrain(ctx, art.train, frame);
  for (let i = 0; i < art.buildings.length; i++) {
    const building = art.buildings[i];
    const [x, w, h] = building;
    const isGorilla = i === art.rooftopGorilla;
    // A building whose roof carries scene furniture — the gorilla, a
    // billboard, the transmitter — skips its own crown so the two never
    // interleave.
    const crowned = isGorilla || i === art.transmitter
      || (art.billboards || []).some(([bi]) => bi === i);
    // Broad, low-contrast colour planes are the GBC contribution. Fine dark
    // linework sits over them, so added colour never weakens the silhouette.
    ctx.fillStyle = palette.buildings[i % palette.buildings.length];
    const top = GROUND_Y - h;
    ctx.fillRect(x + 1, top + 1, w - 1, H - top - 1);
    gbcBuildingLineArt(ctx, building, crowned);
    lcdWindowGrid(ctx, building, i, frame);
    if (frame.stageIndex === 2) lcdEqualizer(ctx, building, i, frame);
    if (frame.stageIndex === 3) {
      if (!isGorilla) lcdAntenna(ctx, building, i, frame);
      if (!isGorilla) {
        const capY = GROUND_Y - h - 5;
        ctx.fillStyle = LCD_WINDOW_OFF;
        ctx.fillRect(x + 5, capY, Math.max(5, w - 10), 3);
        // Three small lamps carry the offbeat change. Reduced flashing keeps
        // the roof hardware but leaves it in a composed printed state.
        if (!reducedFlashing && (i + frame.beat4) % 2 === 0) {
          ctx.fillStyle = LCD_WINDOW_ON;
          const span = Math.max(1, w - 16);
          for (let lamp = 0; lamp < 3; lamp++) {
            ctx.fillRect(Math.round(x + 7 + span * lamp / 2), capY, 2, 2);
          }
        }
      }
    }
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
  if (art.gameWatch) {
    lcdGameWatch(ctx, art.gameWatch, frame, lcdBurstPhase(art, frame), reducedFlashing,
      lcdVanishedBarrelCell(art, frame));
  }
  // The chopper's take: while it is crossing, the billboard it came for is
  // gone from its roof. Derived from the frame rather than stored, so a
  // restarted run rebuilds exactly the same city.
  const chopper = art.chopper;
  const repossessing = chopper && frame.phase >= (chopper.fromPhase ?? 2);
  const lifted = repossessing && lcdChopperX(frame) != null ? chopper.takes : -1;
  for (const [bi, artName] of art.billboards || []) {
    if (bi === lifted) continue;
    lcdBillboard(ctx, art.buildings[bi], artName, frame, reducedFlashing);
  }
  if (art.searchlight) {
    lcdSearchlight(ctx, art.buildings[art.searchlight[0]], art.searchlight[1],
      frame, reducedFlashing);
  }
  if (art.washer) lcdWasher(ctx, art.buildings[art.washer[0]], art.washer[1], frame);
  if (repossessing) lcdChopper(ctx, frame, true);
  if (Number.isInteger(art.transmitter)) {
    lcdTransmitter(ctx, art.buildings[art.transmitter], frame, reducedFlashing);
  }
  for (const [bi, dx] of art.smokestacks || []) {
    lcdSmokestack(ctx, art.buildings[bi], dx, frame);
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
  if (Number.isInteger(art.rooftopGorilla)) {
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
      gbcGorillaBarrel(ctx, dropX, chute[frame.beat4]);
    }
    lcdRooftopGorilla(ctx, art.buildings[art.rooftopGorilla], frame);
  }
  if (art.clock) lcdClock(ctx, art.clock, frame.beat4);
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
      const frame = lcdSceneFrame(scene, reducedMotion);
      const palette = LCD_GBC_PALETTES[frame.stageIndex];
      const sky = LCD_SKY_PHASES[frame.stageIndex][frame.phase] || palette.sky;
      skyGrad(ctx, sky[0], sky[1]);
      // (drawLCDPanel above is this same sequence, for callers outside a run.)
      // Below the groundline: the sky's own bottom colour, NOT LCD_PANEL_LIT.
      // The band a pit exposes has to be the same green the backdrop meets the
      // ground with — a flat panel-lit slab down there made every hole open
      // onto a different, yellower screen than the one above it. The road
      // apron is ground()'s business and stays panel-lit.
      ctx.fillStyle = sky[1];
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      // The city is alive, but the glass still does not travel. It changes by
      // switching cells between fixed authored poses on heard musical beats;
      // neither camX nor gameplay chart data enters the painter.
      drawLCDCity(ctx, scene, reducedMotion, reduced);
      // No hardware frame around the screen any more: the bezel cost more
      // than it said (it doubled against facades, and its restore pass caused
      // the phantom-line saga), and the city reads as a place, not a toy.
    },
    ground(ctx, camX, cab, obstacles) {
      const pits = [];
      for (const ob of obstacles || []) {
        if (!ob.live || !ob.def || !ob.def.isGap || ob.tunnel) continue;
        const x = Math.round(ob.x - camX);
        const w = Math.round(ob.w);
        if (x + w < -4 || x > W + 4) continue;
        pits.push({ x, w, wx: ob.x });
      }
      // Merge the visible openings into a mask. The city has already been
      // drawn all the way down; this apron covers it everywhere except here.
      const cuts = pits
        .map(({ x, w }) => ({ from: Math.max(0, x), to: Math.min(W, x + w) }))
        .filter((cut) => cut.to > cut.from)
        .sort((a, b) => a.from - b.from)
        .reduce((merged, cut) => {
          const last = merged[merged.length - 1];
          if (last && cut.from <= last.to) last.to = Math.max(last.to, cut.to);
          else merged.push({ ...cut });
          return merged;
        }, []);
      const spans = [];
      let cursor = 0;
      for (const cut of cuts) {
        if (cut.from > cursor) spans.push({ x: cursor, w: cut.from - cursor });
        cursor = Math.max(cursor, cut.to);
      }
      if (cursor < W) spans.push({ x: cursor, w: W - cursor });

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
      for (let wx = Math.floor(camX / STEP) * STEP; wx < camX + W + STEP; wx += STEP) {
        const sx = wx - camX;
        if (inCut(sx, sx + STEP)) continue;
        const y = terrainGroundY(cab, wx);
        ctx.fillStyle = LCD_PANEL_LIT;
        ctx.fillRect(sx, y, STEP, H - y);
        ctx.fillStyle = LCD_INK;
        ctx.fillRect(sx, y, STEP, 3);
      }
      // The dashes scroll smoothly but at HALF the lane speed — full speed
      // strobed at this pitch. They are read as texture, not as a distance
      // reference, so the softer drift wins. Each dash still sits 7px under
      // the surface at its own SCREEN position, so the line stays parallel
      // to the road through the rolls.
      // Fractional x AND y on purpose: the backbuffer is scaled up, so a
      // whole-pixel round here becomes a conspicuous multi-screen-pixel hop
      // as the lane rolls — the same lesson the beat ribbon's offset learned.
      const PITCH = 16;
      ctx.fillStyle = 'rgba(38,53,93,0.14)';
      for (let x = -((camX * 0.5) % PITCH); x < W; x += PITCH) {
        if (inCut(x, x + 8)) continue;
        ctx.fillRect(x, terrainGroundY(cab, camX + x + 4) + 7, 8, 3);
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
      // Meshing pitch and the daylight the train keeps off the shaft walls.
      // GEAR_WALL is the ink wall's own thickness, below.
      const GEAR_PITCH = GEAR_R * 2 - 2;
      const GEAR_WALL = 3, GEAR_CLEAR = 3;
      const ratchet = Math.round(camX / PITCH) * (Math.PI / 8);
      for (const { x, w, wx } of pits) {
        // The cut edges, full depth — from the LOCAL surface, not from the
        // flat groundline, so a rolled lip and its wall meet exactly. Wall
        // thickness matches the road's own ink line height (3px), so the
        // hole's frame and the surface it is cut into read as one gauge of
        // steel meeting at the lip.
        ctx.fillStyle = LCD_INK;
        const topL = terrainGroundY(cab, wx);
        const topR = terrainGroundY(cab, wx + w);
        ctx.fillRect(x, topL, 3, H - topL);
        ctx.fillRect(x + w - 3, topR, 3, H - topR);
        // Mitred lips: the surface line turns the corner into the wall as one
        // continuous piece — the column walk alone leaves a stepped joint.
        ctx.fillRect(x - 3, topL, 6, 3);
        ctx.fillRect(x + w - 3, topR, 6, 3);
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
        const inner = w - 2 * (GEAR_WALL + GEAR_CLEAR);
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
    ground(ctx, camX, cab, obstacles, overhangs, t = 0) { pick(this._t || 0).ground(ctx, camX, cab, obstacles, overhangs, t); },
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
