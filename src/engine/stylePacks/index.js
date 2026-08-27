// Style packs: renderer-only modules. One draw interface, zero game logic.
// Every pack draws: bg(ctx,t,camX,cab), ground(ctx,camX,cab,obstacles), post(ctx,t).
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
// What lies at the bottom of a hole, when the cabinet names one. A pack draws a
// gap by not drawing; the fill is the other half of that bargain.
import { drawPitFill } from '../../game/pitFill.js';

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
export function drawPitFills(ctx, camX, cab, obstacles, t = 0) {
  if (!cab) return;
  // TAR EVERYWHERE, until a cabinet says otherwise. An empty break is a
  // legitimate picture and it is the wrong DEFAULT: a pit is fatal now, and the
  // one thing every hole has to do is look like it will kill you. `pitFill` is
  // the per-cabinet override the bake-off exists to fill in — 'none' opts a
  // cabinet back out to open air.
  const id = cab.pitFill || 'tar';
  if (id === 'none') return;
  for (const ob of obstacles || []) {
    if (!ob.live || !ob.def || !ob.def.isGap || ob.tunnel) continue;
    const x = ob.x - camX;
    if (x + ob.w < -4 || x > W + 4) continue;
    // Phased off world x so two pits on one screen never bubble in step.
    drawPitFill(ctx, id, x, GROUND_Y, ob.w, H - GROUND_Y, t, ob.x * 0.013);
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

// Game & Watch. The whole illusion is that there is no renderer — just ink
// segments switching on and off behind a green polarizer. Tinting colored
// sprites gets you mud; the panel has to actually *convert* the frame, which
// post() does with blend modes (no per-pixel readback, so it stays cheap).
const LCD_PANEL = '#96a479';   // backlit pea-green
const LCD_INK = '#242a1a';     // switched-on segment
function lcdPack(settings) {
  const reduced = settings && settings.reducedFlashing;
  return {
    name: 'lcd',
    // The panel converts the *background* to two tones; the cast — hero,
    // hazards, pickups — draws on top of it in colour, as the lit things you
    // are meant to track.
    actorsAbovePost: true,
    // The panel does not crane with the camera. Everything bg() draws here —
    // backplate art, bezel, backlight — is printed on the glass; sliding it
    // down on a jump would move the physical handheld, not the picture.
    bgPan: 0,
    bg(ctx, t, camX, cab) {
      // Bright backlight. post() only ever darkens, so the panel has to start
      // near-white or the whole screen lands in mud.
      skyGrad(ctx, '#e8eede', '#d2dcc2');
      ctx.fillStyle = '#d2dcc2';
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      // Printed backplate art — silkscreened on the glass, so it does NOT
      // scroll. That stillness is most of what reads as "LCD handheld".
      // Kept as thin outlines: printed art must never mass up enough to be
      // mistaken for a lit segment (i.e. for something that can kill you).
      // Alphas are tuned against post()'s contrast curve: printed art has to
      // land in the greys, well clear of the black a lit segment goes to.
      ctx.strokeStyle = 'rgba(40,48,30,0.5)';
      ctx.fillStyle = 'rgba(40,48,30,0.4)';
      for (let i = 0; i < 7; i++) {
        const bx = 22 + i * 68, bh = 26 + (i % 3) * 14;
        ctx.strokeRect(bx + 0.5, GROUND_Y - bh + 0.5, 29, bh);
        for (let wy = GROUND_Y - bh + 6; wy < GROUND_Y - 6; wy += 9) ctx.fillRect(bx + 6, wy, 4, 3);
      }
      ctx.fillStyle = 'rgba(40,48,30,0.42)';
      for (let i = 0; i < 5; i++) { // cloud + sun segments, unlit
        ctx.fillRect(40 + i * 96, 26, 26, 9);
        ctx.fillRect(46 + i * 96, 21, 14, 5);
      }
      ctx.strokeStyle = 'rgba(40,48,30,0.55)';
      ctx.beginPath(); ctx.arc(W - 54, 40, 13, 0, Math.PI * 2); ctx.stroke();
      // Bezel: printed frame around the active area.
      ctx.strokeStyle = 'rgba(40,48,30,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(5, 5, W - 10, H - 10);
      ctx.lineWidth = 1;
    },
    ground(ctx, camX, cab, obstacles) {
      ctx.fillStyle = LCD_INK;
      ctx.fillRect(0, GROUND_Y, W, 3);
      // Motion has to quantize to segment pitch — smooth scroll is the one
      // thing a segment display physically cannot do.
      const PITCH = 16;
      const step = Math.round(camX / PITCH) * PITCH;
      ctx.fillStyle = 'rgba(36,42,26,0.5)';
      for (let x = -(step % PITCH); x < W; x += PITCH) ctx.fillRect(Math.round(x), GROUND_Y + 7, 8, 3);
      for (const ob of obstacles || []) {
        if (ob.live && ob.def && ob.def.isGap) {
          const x = Math.round(ob.x - camX);
          ctx.fillStyle = '#8d9b70';
          ctx.fillRect(x, GROUND_Y, ob.w, 5);
          ctx.fillStyle = LCD_INK;
          ctx.fillRect(x, GROUND_Y, 2, 16);
          ctx.fillRect(x + ob.w - 2, GROUND_Y, 2, 16);
        }
      }
    },
    post(ctx, t) {
      // The conversion. A segment is on or off, so the frame has to be pushed
      // toward two tones — a translucent tint just mutes colour into mud, it
      // never removes it.
      // 1. strip hue. This pass is non-negotiable and there is no cheap
      // substitute: multiplying by the olive panel alone leaves saturated
      // sprites saturated (a blue hero just becomes a navy hero).
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, W, H);
      // 2. crush the midtones: color-burn against a light grey plunges them
      // while leaving the backlight untouched — a segment display's S-curve.
      ctx.globalCompositeOperation = 'color-burn';
      ctx.fillStyle = '#cfcfcf';
      ctx.fillRect(0, 0, W, H);
      // 3. tint: whites become glass, blacks become ink.
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = LCD_PANEL;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      // Cell gaps: the dark lattice between liquid-crystal segments.
      bakedFill(ctx, 'lcdCells', 3, 3, (c) => {
        c.fillStyle = 'rgba(30,36,20,0.16)';
        c.fillRect(2, 0, 1, 3);
        c.fillRect(0, 2, 3, 1);
      });
      if (!reduced) {
        // 1Hz backlight flicker — tiny, but it stops the panel looking printed.
        ctx.fillStyle = `rgba(255,255,255,${0.012 + Math.sin(t * 6.3) * 0.012})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
    decorate(ctx, e, x, y) {
      // Segment ghosting: the cell the shape just left hasn't fully relaxed.
      // An outline, not a filled box — it trails, it doesn't duplicate.
      ctx.strokeStyle = 'rgba(36,42,26,0.18)';
      ctx.strokeRect(Math.round(x) - 8.5, Math.round(y) + 0.5, e.w, e.h);
    },
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
    bg(ctx, t, camX, cab, totalDist) { pick(t).bg(ctx, t, camX, cab, totalDist); },
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
