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
// silhouette. (Two SUBJECTS still stack against each other where their mirrors
// overlap. The concourse crowd stands metres apart, so in practice they don't;
// if a scene ever packs them shoulder to shoulder, batch that scene's grounded
// subjects into one call rather than reaching for per-shape alpha again.)
//
// The test of the result is that you cannot find a face in it — it should read
// as a sheen carrying the subject's colours.

export const REFLECT_SQUASH = 0.72;
// Chosen on the video, on a hero against the concourse floor. One number for
// every subject in the room: two strengths read as two effects, not as one
// floor.
export const REFLECT_ALPHA = 0.60;

// WHICH SUBJECTS REFLECT. Heroes shipped first and cabinets are a separate
// question — a tall machine's mirror runs the height of the frame and is a
// legibility argument, not a performance one — so they are listed separately
// rather than folded into one boolean that would answer both at once.
const KINDS = { hero: true, cabinets: false };

// The feature gate. Off by default: this is a real path, not a dev flag, but it
// is not enabled-by-default until the look is signed off.
//
//   ?reflections=1     heroes (whatever KINDS says ships)
//   ?reflections=all   every subject that has a call site, cabinets included
//   ?reflections=0     off
let forced = null;      // set by setFloorReflections()
let forcedAll = false;

// Pin the feature from code, exactly as ?reflections= does. Pass null to hand
// the decision back to the query string and the default.
export function setFloorReflections(on) {
  if (on == null) { forced = null; forcedAll = false; return; }
  forced = !!on;
  forcedAll = on === 'all';
}

let queried;  // read once; the query string cannot change under us
function requested() {
  if (queried !== undefined) return queried;
  queried = null;
  if (typeof window !== 'undefined' && window.location && typeof URLSearchParams !== 'undefined') {
    const raw = new URLSearchParams(window.location.search).get('reflections');
    if (raw != null) queried = raw === '0' || raw === 'off' ? false : raw === 'all' ? 'all' : true;
  }
  return queried;
}

// The capture path. __mash_dev.floorReflection carries the alpha the video was
// graded at and turns on the softening a recording can afford; it outranks the
// feature gate so a take looks the same whether or not the feature has shipped.
function videoAlpha() {
  const flag = typeof window !== 'undefined' && window.__mash_dev
    ? window.__mash_dev.floorReflection : null;
  return typeof flag === 'number' ? flag : flag ? 0.14 : 0;
}

function gate() {
  if (forced != null) return forcedAll ? 'all' : forced;
  const q = requested();
  if (q != null) return q;
  return false;
}

/**
 * Whether `kind` ('hero' | 'cabinets') will paint anything this frame. Callers
 * use it to skip BUILDING a subject — a draw closure per loitering hero, every
 * frame — not just to skip painting one.
 */
export function floorReflectionsOn(kind = 'hero') {
  if (videoAlpha() > 0) return true;
  const g = gate();
  if (!g) return false;
  return g === 'all' ? true : !!KINDS[kind];
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
 * opts.kind          'hero' | 'cabinets' — which gate decides this one
 * opts.track         permit the pixel scan when `lift` is unknown (capture only)
 */
export function drawFloorReflection(ctx, subject, floorY, opts = {}) {
  const { draw, height, anchorX, wide = 0 } = subject || {};
  if (!ctx || typeof draw !== 'function' || !(height > 0)) return;
  if (typeof ctx.getTransform !== 'function' || typeof document === 'undefined') return;
  const vid = videoAlpha();
  if (!vid && !floorReflectionsOn(opts.kind || 'hero')) return;
  const alpha = vid || REFLECT_ALPHA;
  const m = ctx.getTransform();
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

  // The scan only ever runs for a capture of a subject whose height nobody can
  // state — never for a hero, who has a `lift`, and never for something bolted
  // to the floor, whose mirror's first row IS the floor line by definition.
  const track = lift == null && opts.track !== false && !!(dev && dev.reflectTrack);
  const { canvas: off, ctx: o } = scratch(track, w, h);
  o.setTransform(1, 0, 0, 1, 0, 0);
  o.clearRect(0, 0, w, h);
  o.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
  o.translate(0, floorY);
  o.scale(1, -REFLECT_SQUASH);
  o.translate(0, -floorY);
  draw(o);
  o.setTransform(1, 0, 0, 1, 0, 0);

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
  ctx.globalAlpha = alpha * fade;
  if (blur) ctx.filter = `blur(${blur}px)`;
  ctx.drawImage(off, 0, 0, w, h, x0, y0, w, h);
  ctx.restore();
  stats.subjects++;
  stats.px += w * h;
}

// What a frame actually paid, for the bench to read rather than assume: how many
// subjects were mirrored and how many device pixels that covered. A bench that
// cannot see the crowd was reflected is measuring an empty room.
const stats = { subjects: 0, px: 0 };
export function floorReflectionStats() { return { ...stats }; }
export function resetFloorReflectionStats() { stats.subjects = 0; stats.px = 0; }
