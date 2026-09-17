// FLOOR REFLECTIONS — one painter, both rooms.
//
// The flat-floor trick, not a ray trace: the subject drawn again, mirrored about
// the floor line, squashed, faded out, and composited once at low alpha. It was
// written for a video of the Food Court and lived inside that room's draw(); it
// is here because the Trophy Room wants the same wet floor, and a painter copied
// into two call sites disagrees with itself within a week.
//
// RENDERED OFFSCREEN AT FULL OPACITY, then composited once. The first version
// set globalAlpha on the live context and called drawToon straight into it,
// which is wrong for a figure made of dozens of shapes: every part composites
// against the ones behind it, so overlaps stack up and the silhouette breaks
// into a pile of translucent blobs — the head, the cheeks and the hands all
// readable as separate discs. One finished image at one uniform alpha has one
// silhouette.
//
// The same lesson applies one level up, between SUBJECTS, which is why the room
// paints its whole floor in one pass (see beginFloorReflectionBand): composited
// separately, two figures standing close together sum their alphas where their
// mirrors overlap and the pair reads as a bright smear instead of as one figure
// in front of another.
//
// The test of the result is that you cannot find a face in it — it should read
// as a sheen carrying the subject's colours.

export const REFLECT_SQUASH = 0.72;
// Chosen on the video, on a hero against the concourse floor. One number for
// every subject in the room: two strengths read as two effects, not as one
// floor.
export const REFLECT_ALPHA = 0.60;

// THE CAPTURE OVERRIDE, and the only switch left in this file. There is no
// feature gate: the floor reflects the way the floor has a contact shadow on it,
// and a room that can be asked to stop doing it is a room somebody will see two
// versions of. __mash_dev.floorReflection carries the alpha a video was graded
// at and turns on the softening a recording can afford, so it outranks the
// in-game strength for the duration of a take.
function videoAlpha() {
  const flag = typeof window !== 'undefined' && window.__mash_dev
    ? window.__mash_dev.floorReflection : null;
  return typeof flag === 'number' ? flag : flag ? 0.14 : 0;
}

// ONE SCRATCH SURFACE, reused by every subject in every frame — allocating an
// offscreen per hero per frame is the obvious way to make this expensive.
//
// Two of them, in fact, and only because of willReadFrequently: it makes the
// surface CPU-backed, which is what the capture path's readback needs and what
// the game path (which never reads back) does not want to pay for on its way to
// the compositor. The flag can only be chosen when the context is created, so
// the two modes cannot share one canvas.
const SCRATCH = { plain: null, read: null };
function scratch(readback, w, h) {
  const slot = readback ? 'read' : 'plain';
  let s = SCRATCH[slot];
  if (!s) {
    const canvas = document.createElement('canvas');
    s = SCRATCH[slot] = {
      canvas,
      ctx: canvas.getContext('2d', readback ? { willReadFrequently: true } : undefined),
    };
  }
  // Grows to the largest any caller has needed and never shrinks. Every fill
  // below is bounded by the region actually in use, so a surface stretched once
  // by the full-width cabinet row does not then cost a full-width clear for
  // each of nine heroes.
  if (s.canvas.width < w || s.canvas.height < h) {
    s.canvas.width = Math.max(s.canvas.width, w);
    s.canvas.height = Math.max(s.canvas.height, h);
  }
  return s;
}

// THE CALLER'S WORLD TRANSFORM, or null when there isn't a usable one.
//
// Not every context that reaches a room's draw() is a browser canvas: the
// headless harness stubs one, and a stub can carry a getTransform that answers
// with nothing. That is the difference between "has the method" and "returns a
// matrix", and this painter learned it the hard way — behind a feature gate the
// question never came up, and the first frame after the gate came out threw
// `reading 'b'` inside the hub's draw, which took the whole room down with it
// and left the concourse unable to open a cabinet. A floor that cannot work out
// where the floor is on screen simply does not reflect.
function readTransform(ctx) {
  if (!ctx || typeof ctx.getTransform !== 'function') return null;
  let m = null;
  try { m = ctx.getTransform(); } catch (e) { return null; }
  if (!m) return null;
  for (const k of ['a', 'b', 'c', 'd', 'e', 'f']) if (!Number.isFinite(m[k])) return null;
  return m;
}

// Put the subject into the scratch MIRRORED, in the caller's own world
// transform, offset so the region's top-left is the scratch's origin.
function mirrorInto(o, m, x0, y0, floorY, draw) {
  o.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
  o.translate(0, floorY);
  o.scale(1, -REFLECT_SQUASH);
  o.translate(0, -floorY);
  draw(o);
  o.setTransform(1, 0, 0, 1, 0, 0);
}

// Fade the finished mirror out down the floor and lay it down once.
//
// The falloff is punched into the scratch's own alpha (destination-out) rather
// than painted over the room, so it fades the reflection and not the floor
// underneath it. Softness comes from here and from the squash — never from a
// blur, outside a capture.
function fadeAndLay(ctx, o, off, { x0, y0, w, h, fy, span, alpha, blur }) {
  o.globalCompositeOperation = 'destination-out';
  // Nothing above the floor line: a reflection cannot climb the wall.
  if (fy > 0) { o.fillStyle = '#000'; o.fillRect(0, 0, w, Math.min(h, fy)); }
  const g = o.createLinearGradient(0, fy, 0, fy + span);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.3, 'rgba(0,0,0,0.62)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.94)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  o.fillStyle = g;
  const gy = Math.max(0, fy);
  o.fillRect(0, gy, w, h - gy);
  o.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(off, 0, 0, w, h, x0, y0, w, h);
  ctx.restore();
}

// Anything this far off the floor or less counts as standing on it.
const GROUNDED_EPS = 0.05;

/**
 * ONE PASS FOR THE WHOLE FLOOR — begin it, add every grounded subject, end it.
 *
 * Each subject draws into one shared offscreen at FULL opacity, in the order it
 * is drawn for real, and the finished picture is masked once and laid down once.
 * That is the per-shape lesson one level up: composited separately, two figures
 * standing close together SUM their alphas where their mirrors overlap, so the
 * pair reads as a bright smear instead of as one figure in front of another.
 * Drawn opaque into a shared surface the near figure simply occludes the far
 * one, exactly as it does above the floor. It also saves a composite per
 * subject.
 *
 * The price is ONE falloff for the room, since a single mask cannot have two
 * lengths. `height` is therefore the room's reference figure, not each
 * subject's: the machines are much taller than the cast, and giving them their
 * own longer falloff is what made them a second effect over the same tiles. One
 * floor, one falloff.
 *
 * Returns null only when there is no floor band to paint into at all — a
 * context with no transform to read, or a floor line already off the bottom of
 * the frame. A capture returns a passthrough instead: the video was graded on
 * per-subject composites and blur, so a take keeps them.
 */
export function beginFloorReflectionBand(ctx, floorY, { height } = {}) {
  stats.frames++;
  if (!ctx || !(height > 0) || typeof document === 'undefined') return null;
  const m = readTransform(ctx);
  if (!m) return null;
  if (videoAlpha() > 0) return { passthrough: true, ctx, floorY };
  // A band is a RECTANGLE of device pixels, which assumes the floor line is
  // horizontal on screen. Under any skew or rotation it is not, and the mask
  // would fade along the wrong axis — so hand those frames back to the
  // per-subject path, which derives its box from the transform's own corners.
  if (m.b !== 0 || m.c !== 0) return { passthrough: true, ctx, floorY };
  const dev = typeof window !== 'undefined' ? window.__mash_dev : null;
  const reach = dev && typeof dev.reflectFalloff === 'number' ? dev.reflectFalloff : 1;
  const span = Math.abs(height * REFLECT_SQUASH * m.d) * reach;
  const floorDeviceY = m.d * floorY + m.f;
  const y0 = Math.max(0, Math.floor(floorDeviceY));
  const y1 = Math.min(ctx.canvas.height, Math.ceil(floorDeviceY + span) + 1);
  const w = ctx.canvas.width, h = y1 - y0;
  if (!(w > 0 && h > 0)) return null;
  return {
    ctx, floorY, m, span, w, h, x0: 0, y0,
    fy: floorDeviceY - y0,
    n: 0,
    lifted: null,
  };
}

/**
 * Add one subject to the band. A subject that has LEFT the floor gets its own
 * pass instead: its mirror starts below the band, thinned by the distance, and
 * one mask cannot hold two anchors. Those are rare — one hero in a jump, one
 * loiterer mid-hop — so they are queued and flushed after the band.
 */
export function addFloorReflection(band, subject, opts = {}) {
  if (!band) return;
  if (band.passthrough) { drawFloorReflection(band.ctx, subject, band.floorY, opts); return; }
  const { draw, height, lift } = subject || {};
  if (typeof draw !== 'function' || !(height > 0)) return;
  if (!Number.isFinite(lift) || lift > GROUNDED_EPS) {
    (band.lifted || (band.lifted = [])).push([subject, opts]);
    return;
  }
  const t0 = clock();
  const { ctx: o } = scratch(false, band.w, band.h);
  if (band.n === 0) { o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, band.w, band.h); }
  mirrorInto(o, band.m, band.x0, band.y0, band.floorY, draw);
  band.n++;
  stats.ms += clock() - t0;
}

/** Mask the band once, lay it down once, then flush the airborne strays. */
export function endFloorReflectionBand(band) {
  if (!band || band.passthrough) return;
  const t0 = clock();
  if (band.n > 0) {
    const { canvas: off, ctx: o } = scratch(false, band.w, band.h);
    fadeAndLay(band.ctx, o, off, {
      x0: band.x0, y0: band.y0, w: band.w, h: band.h,
      fy: band.fy, span: band.span, alpha: REFLECT_ALPHA, blur: 0,
    });
    stats.subjects += band.n;
    stats.px += band.w * band.h;
    stats.passes++;
  }
  // After the band, so an airborne mirror lies over the floor it left rather
  // than under it.
  stats.ms += clock() - t0;
  if (band.lifted) {
    for (const [subject, opts] of band.lifted) drawFloorReflection(band.ctx, subject, band.floorY, opts);
    band.lifted = null;
  }
  band.n = 0;
}

/**
 * Paint `subject` mirrored in the floor at `floorY`, in the caller's current
 * world transform.
 *
 * subject.draw(ctx)  paints the subject exactly as it is painted for real
 * subject.height     its height in world units — sizes the falloff and the box
 * subject.anchorX    where it stands, in world units
 * subject.wide       span the whole view instead of hugging one anchor, for a
 *                    row of things with no single centre (the cabinets)
 * subject.lift       how far its feet are ABOVE the floor, in world units. The
 *                    honest answer to the tracking scan — see below.
 *
 * opts.track         permit the pixel scan when `lift` is unknown (capture only)
 */
export function drawFloorReflection(ctx, subject, floorY, opts = {}) {
  const clockedAt = clock();
  const { draw, height, anchorX, wide = 0 } = subject || {};
  if (!ctx || typeof draw !== 'function' || !(height > 0)) return;
  if (typeof document === 'undefined') return;
  const m = readTransform(ctx);
  if (!m) return;
  const vid = videoAlpha();
  const alpha = vid || REFLECT_ALPHA;
  const toDeviceY = (wy, wx) => m.b * wx + m.d * wy + m.f;
  const toDeviceX = (wx, wy) => m.a * wx + m.c * wy + m.e;
  const dev = typeof window !== 'undefined' ? window.__mash_dev : null;
  // __mash_dev.reflectFalloff: how far down the floor it reaches, as a multiple
  // of the mirrored figure's own height. 1 dies inside the top third; higher
  // lets it run further before it goes.
  const reach = dev && typeof dev.reflectFalloff === 'number' ? dev.reflectFalloff : 1;
  const span = Math.abs(height * REFLECT_SQUASH * m.d) * reach;
  // NO PER-FRAME CANVAS BLUR IN THE GAME. ctx.filter = 'blur()' is the single
  // most expensive thing this painter could do, it scales with the area it
  // covers, and the softness it buys is already there in the squash and the
  // gradient. A capture, which renders at its leisure, still gets it.
  const blur = vid ? Math.max(1, Math.round(height * Math.abs(m.d) * 0.025)) : 0;
  const pad = blur * 3;

  // WHERE THE MIRROR STARTS. A subject standing on the floor starts at the floor
  // line; one in the air starts as far below it as the subject is above it,
  // squashed — which is the whole reason the reflection sells a leap.
  //
  // The capture path found this by reading the rendered surface back and
  // scanning for the first painted row, because the dive's draw never exposes a
  // height. At capture resolution that readback measured FOUR FIFTHS of the
  // frame budget (12.3fps with it, 58.9 without) before it was narrowed to the
  // rows and columns the scan actually walks. The game does not need it at all:
  // the hub knows exactly how far off the ground its heroes are, so `lift` is
  // arithmetic where the scan was a GPU stall. It also sizes the box: without a
  // lift the box has to reach 2.2 heights below the floor in case the subject is
  // airborne, and for a standing hero that is three times the pixels his mirror
  // can possibly occupy.
  //
  // A stated lift wins over the scan in EVERY mode, capture included. It used to
  // be ignored for a capture so a graded shot came back identical, and that was
  // the wrong trade once the whole cast reflects: the scan is per subject, so a
  // concourse full of loiterers would hand a recording eight readbacks a frame.
  // The shots it could change are a capture of an AIRBORNE avatar outside a dive,
  // and the teaser's leap is the dive — which states no height and still scans.
  const lift = Number.isFinite(subject.lift) ? Math.max(0, subject.lift) : null;
  const topW = lift == null ? floorY - 1 : floorY + lift * REFLECT_SQUASH;
  const botW = lift == null ? floorY + height * 2.2
    : Math.min(floorY + (lift + height) * REFLECT_SQUASH,
      topW + height * REFLECT_SQUASH * reach);

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const halfW = wide ? wide : height;
  for (const wx of [anchorX - halfW, anchorX + halfW]) {
    for (const wy of [topW, botW]) {
      const dx = toDeviceX(wx, wy), dy = toDeviceY(wy, wx);
      x0 = Math.min(x0, dx); x1 = Math.max(x1, dx);
      y0 = Math.min(y0, dy); y1 = Math.max(y1, dy);
    }
  }
  const cw = ctx.canvas.width, chh = ctx.canvas.height;
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
  x1 = Math.min(cw, Math.ceil(x1 + pad)); y1 = Math.min(chh, Math.ceil(y1 + pad));
  const w = x1 - x0, h = y1 - y0;
  if (!(w > 0 && h > 0)) return;

  // THE ONLY READBACK IN THIS FILE, and it is capture-only: it needs the video
  // flag, __mash_dev.reflectTrack, and a caller that did not opt out. The game
  // path cannot reach it — no window flag, no scan, no getImageData, at any
  // crowd size. Something bolted to the floor opts out anyway, because its
  // mirror's first row IS the floor line and the scan can only ever hand back
  // what it was given.
  const track = !!vid && lift == null && opts.track !== false && !!(dev && dev.reflectTrack);
  const { canvas: off, ctx: o } = scratch(track, w, h);
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, w, h);
  mirrorInto(o, m, x0, y0, floorY, draw);

  let fy = toDeviceY(topW, anchorX) - y0;
  // How much the distance from the floor costs it. A reflection thins as its
  // subject leaves the surface; pinning the fade to the floor line instead makes
  // it VANISH the instant a hero jumps, which is the one thing it must not do.
  let fade = lift == null ? 1 : 1 / (1 + (lift / Math.max(1e-6, height * reach)) * 1.7);
  if (track) {
    try {
      // Only the rows the scan walks, and only as wide as the subject.
      const sy = Math.max(0, Math.floor(fy));
      const sh = Math.max(1, Math.min(h - sy, h - sy));
      const px = o.getImageData(0, sy, w, sh).data;
      const stride = w * 4;
      outer: for (let ry = 0; ry < sh; ry += 2) {
        for (let rx = 0; rx < w; rx += 4) {
          if (px[ry * stride + rx * 4 + 3] > 8) {
            const gap = Math.max(0, sy + ry - fy);
            fade = 1 / (1 + (gap / Math.max(1, span)) * 1.7);
            fy = sy + ry;
            break outer;
          }
        }
      }
    } catch (e) { /* tainted or unavailable: keep the floor anchor */ }
  }
  fadeAndLay(ctx, o, off, { x0, y0, w, h, fy, span, alpha: alpha * fade, blur });
  stats.subjects++;
  stats.px += w * h;
  stats.passes++;
  stats.ms += clock() - clockedAt;
}

// What a frame actually paid, for the bench to read rather than assume: how many
// subjects were mirrored and how many device pixels that covered. A bench that
// cannot see the crowd was reflected is measuring an empty room.
const stats = { subjects: 0, px: 0, passes: 0, ms: 0, frames: 0 };
export function floorReflectionStats() { return { ...stats }; }
export function resetFloorReflectionStats() {
  stats.subjects = 0; stats.px = 0; stats.passes = 0; stats.ms = 0; stats.frames = 0;
}

// `ms` is the wall clock spent INSIDE this file, mirror draws included, because
// there is no longer an off switch to difference against — and differencing two
// browser sessions was the noisiest part of the old measurement anyway: the
// baseline drifted further between runs than the effect costs. Timed here, one
// run answers "the room's draw took X, of which the floor was Y".
function clock() {
  return typeof performance !== 'undefined' ? performance.now() : 0;
}
