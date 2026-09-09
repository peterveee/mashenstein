// Flat-cartoon vector heroes: one painter for every hero render site.
// Soft dark outlines, flat colors, procedural animation. Resolution
// independent — drawn at device resolution in-run (via pushOverlayDraw)
// and cached/supersampled for tiny static sites (HUD faces, hub NPCs).
// Colors come from HERO_SPRITES palettes so pixel and toon stay in sync.
import { HERO_SPRITES } from './heroes.js';
import { bakeSS, screen, W, H } from '../engine/renderer.js';
// The thrown cane's painter, reused for the one he carries: same object, so it
// gets the same marks and the same proportions rather than a second set that
// drifts. sprites.js does not import this file, so the direction is safe.
import { drawBambooShoot } from '../engine/sprites.js';

const OUTLINE_A = 0.32, SKIN_OUTLINE_A = 0.2;
let OUTLINE = `rgba(26,16,40,${OUTLINE_A})`;
// Softer contour for BARE SKIN — the standard weight reads harsher against
// grumpos's pale hide than it does against clothing and hair.
let SKIN_OUTLINE = `rgba(26,16,40,${SKIN_OUTLINE_A})`;
// Dolores' APRON pieces (bib, straps, pocket, name tag, tie) draw with this
// OPAQUE, lighter outline instead of the translucent one. The layered apron —
// straps over bib, and the whole thing under a front-pass arm — stacked the
// translucent edges into dark seams wherever they overlapped; an opaque line in
// a colour that mimics the translucent look keeps overlaps from compounding.
// Scoped to the apron only, so her face, hair and body keep the normal edge.
const APRON_OUTLINE = 'rgb(120,110,132)';

// ---------------------------------------------------------------- ink weight
// Three independent dials on how heavy the linework reads. All three are 1 in
// production; the gallery's bake-off drives them to compare candidate weights
// without keeping a second copy of the rig around.
//
//   body  — scales `ow`, the contour every silhouette path and limb strokes at.
//   face  — scales the small-feature strokes (eyes, brows, mouths, mustache).
//   alpha — scales the outline colors' opacity. Softens without thinning.
//
// The face strokes used to run HEAVIER than the body contour they sat inside —
// a 0.020u eye ring against a 0.016u contour, on a feature a twentieth the size
// of the torso. Sliced across, the ring came out wider than the sclera it
// enclosed, and the eye read as a grey donut rather than an eye. They are now
// ~0.55x their old values (ring 0.020u -> 0.011u), which seats every face line
// at or just under the contour. Widths below are the SHIPPED numbers; INK is a
// dial on top of them, not the correction itself.
//
// face/body stay keyed to `u` rather than to each other on purpose: `ow` is not
// the same fraction of `u` in the body rig as it is in the face crops, so an
// ow-relative eye would silently double in weight on the HUD cells.
//
// The floors those widths carry used to be absolute, so at the in-run u=24 they
// bound and handed back a heavier-than-proportional line — the frown landing
// ~3x its intended width, and worse the further the camera pushed in. They are
// now scale-aware: see hair() below. The widths themselves are unchanged, and
// at 1:1 so is every number they produce.
// ------------------------------------------------------------------ the brows
// Declared above INK because INK defaults to them.
//
// Width: back at the 0.018u the thin-face pass cut it from. That pass was aimed
// at the eye RING — a ring drawn wider than the sclera it encloses reads as a
// grey donut — and swept the brows along with it on the shared `face` dial. A
// bold brow was never the defect: it is the mark the expression hangs on, and on
// the scowling half of the cast it is most of the characterisation.
//
// BROW_MIN is a floor on the FINISHED image, not on the world width — it keeps
// the hairline from disappearing on a HUD cell and steps out of the way once
// the camera is pushed in (see hair() below). BROW_W * u clears it above u=21
// at 1:1: the 60u menus and cast parade draw the full 1.08, the ~34u HUD cell
// 0.61, and the 24u in-run sprite 0.43 rather than the 0.38 the floor used to
// hold it at.
const BROW_W = 0.018, BROW_MIN = 0.38;
// Tone. The brow is the only face mark drawn at FULL palette ink (`p.e`, the
// same near-black as the pupils) at the heaviest face width, so the restored
// 0.018u put the most mass in the face on the stroke least able to carry it —
// a scowl reading as a bar rather than a brow. BROW_L lightens the ink toward
// white and BROW_A sets how solid it lands; see the INK comment below for why
// it takes both and not opacity alone.
const BROW_L = 0.3, BROW_A = 0.92;
// Per-hero scale on the lighten, because BROW_L lightens toward WHITE and white
// is not a neutral direction for a coloured ink. Most of the cast draws `p.e` as
// a near-black (grumpos #17131a, dolores, raymn), where lightening only lowers
// the tone and the hue has nothing to lose. Gary's is #d83030 — he is a zombie
// and his brows are meant to read as the same red as his pupils — and pushing
// THAT toward white desaturates before it darkens: at the full 0.3 he lands on
// rgb(228,110,110), which is salmon, not red. Scaled to 0.4 he sits at
// rgb(221,73,73), still unmistakably his own colour.
//
// A scale rather than an absolute so a future BROW_L move carries him with it,
// and he is measured as the LOWEST-contrast brow in the cast either way (see the
// brow bake-off) — so this both keeps his hue and buys back a little presence.
// Kiko is here for the same reason Gary is: BROW_L lightens toward WHITE, and a
// brow that is already a mid-brown rather than near-black goes chalky at the full
// 0.3. Hers is scaled harder than his because her ink is browner still.
const BROW_L_SCALE = { gary: 0.4, kiko: 0.3 };

//   brow  — scales the eyebrow hairline's WIDTH alone, on top of `face`.
//   browA — the brow ink's OPACITY, absolute (not a multiplier). See BROW_A.
//   browL — how far the brow ink is LIGHTENED, absolute. See BROW_L.
//
// The brows get their own dials because the thin-face pass was aimed at the eye
// RING and took them along with it. A ring wider than the sclera it encloses is
// a defect; a bold brow is not — it is the mark the whole expression hangs on,
// and the only one asked to read at HUD size.
//
// Three dials and not one because a brow's presence is width TIMES tone, and
// none of the three substitutes for another. Width is SHAPE: what survives the
// downscale to a HUD cell, and what makes an angry brow read as angry. Lightness
// is TONE: how loud the mark is. Opacity is SOLIDITY: whether it reads as a
// drawn mark or as something showing through. Those last two both darken a brow
// on the way down, which is why the first attempt at toning it down used opacity
// alone — and why that was wrong. Alpha low enough to soften the tone also makes
// the stroke translucent, so the war-paint stripe and the shaded skull beneath
// start showing through it and the brow goes muddy at exactly the sizes it most
// needs to read. Lighten the ink and keep it near-opaque instead: same softened
// tone, still a crisp mark.
//
// browA/browL are absolute overrides rather than multipliers because both are
// already fractions with a meaningful zero, and a multiplier on a fraction is a
// number nobody can picture.
export const INK = { body: 1, face: 1, alpha: 1, brow: 1, browA: BROW_A, browL: BROW_L };

export function setInk({
  body = 1, face = 1, alpha = 1, brow = 1, browA = BROW_A, browL = BROW_L,
} = {}) {
  INK.body = body; INK.face = face; INK.alpha = alpha;
  INK.brow = brow; INK.browA = browA; INK.browL = browL;
  OUTLINE = `rgba(26,16,40,${+Math.min(1, OUTLINE_A * alpha).toFixed(3)})`;
  SKIN_OUTLINE = `rgba(26,16,40,${+Math.min(1, SKIN_OUTLINE_A * alpha).toFixed(3)})`;
}

// ---------------------------------------------------- scale-aware ink floors
// Every stroke width in this file is written `hair(px, w)`: `w` is the width
// the drawing actually wants, in u-relative world units, and `px` is the floor
// that keeps the mark from vanishing at a near-1:1 render. The floor used to be
// absolute, which made it a floor on the WORLD width — so it stopped being a
// hairline guarantee and became a minimum thickness that grew with the camera.
// At the tutorial's 5.5x push-in every small mark was pinned to its floor and
// the whole cast came back inked like a colouring book: the mouth ~3x its
// intended width, the eye rings and face lines heavier than the body contour
// enclosing them (the defect the thin-face pass was supposed to have fixed).
//
// The floor is now stated in LOGICAL 480x270 pixels and converted into world
// units against the live draw scale, which is what it always meant. At scale 1
// — HUD cells, menus, cast parade, every baked face crop — hair() returns
// exactly what Math.max returned before, so nothing outside a zoomed camera
// moves. Past that the floor gets out of the way and the art stays
// proportional: at 5.5x a 0.55px floor is 0.1u, so the ink the widths ask for
// is the ink that lands.
let inkScale = 1;       // logical px per world unit at the current draw scale
let inkBake = 0;        // supersample factor while painting into a cache bake
const hair = (px, w) => Math.max(px / inkScale, w);

// HOW HEAVY THE RING ROUND A HAND IS. A hand is the smallest enclosed shape on
// the rig — a disc a fifth of a head across — and it took the same contour a
// torso does, so the ink was a third of the mark and every hero read as wearing
// a bangle. These two are that line, thinned as a pair so the cuff and the hand
// inside it stay in proportion to each other; everything else about the hands
// is unchanged. `hair`'s first argument is the finished-image floor, so both
// halves come down together or the thinning stops at small sizes.
const handInk = (ow, outer = true) => (outer ? hair(0.38, ow * 0.42) : hair(0.34, ow * 0.36));

// EVERY HAND ON THE RIG PAINTS THROUGH paintHand — the plumber glove, Kiko's
// bracer, Clara's fingerless glove, Fernwick's bracelet, Grumpos's gauntlet and
// the bare p.hand hand, standing and sliding. Two seams ride it for the hand
// bake-offs (9 Sep 2026); unset, both fall back to exactly what shipped.
//
// HAND_RING is the cuff band's width, ONE figure for the whole cast. Until
// 9 Sep 2026 every cuff carried its own — gauntlet 0.030u, glove 0.018u,
// bracer 0.45 armW (0.031u), fingerless 0.24 armW (0.018u), bracelet 0.18 armW
// (0.0135u) — which is why the ring read as a different weight on every hero.
// The bake-off ran 0.012 / 0.017 / 0.022 / 0.028 against those five and
// SETTLED on the hairline: 0.012u, a band and not a bangle. The cuff's OUTER
// edge is unchanged on every hero, so what the width sets is how much skin
// shows inside it. `spec.handRing` overrides it for a bake-off.
export const HAND_RING = 0.012;
//
// `spec.handShape` swaps the skin disc for a hand with fingers. 'disc' is
// what ships; 'fist' and 'relaxed' are the two hands a runner has, and 'auto'
// picks by pose — a fist on the move, a relaxed hand standing. The cuff is
// unchanged by the shape: it stays the shipped disc at the wrist, and the hand
// lies over it with its wrist end on the cuff, so a bracer is still a bracer
// round a hand rather than a second hand drawn in gold.
//
// A shaped hand is ONE silhouette. Its pieces — a palm ellipse, finger and
// thumb capsules — go into a single path and the contour is stroked UNDER the
// fill, so only the outer half of the stroke survives and no piece's edge
// crosses another. That was the first cut's mistake: each piece outlined on
// its own, and a hand a fifth of a head across came out as a bundle of
// outlined sausages. What is left inside is a crease or two in the contour
// ink, drawn last, and `spec.handCreases: false` drops even those.
export const HAND_SHAPES = ['disc', 'auto', 'fist', 'relaxed'];
// Pieces in units of r, the skin disc's radius: `a` along the arm (+ toward
// the fingertips), `s` across it (+ toward the thumb side). An ellipse has
// rx/ry (long axis along the arm); a capsule has len, r and rot, its angle off
// the arm, + toward the thumb.
const HAND_PIECES = {
  // The running fist, side on: the knuckle row is the flat front, the thumb
  // lies along the top. A touch longer than it is tall, like a fist is.
  fist: [
    { a: 0.12, s: -0.02, rx: 0.9, ry: 0.84 },
    { a: 0.72, s: -0.05, len: 1.15, r: 0.36, rot: Math.PI / 2 },
    { a: 0.32, s: 0.7, len: 0.8, r: 0.26, rot: 0.12 },
  ],
  // A hand at rest: fingers hang a little curled, the thumb lies alongside.
  relaxed: [
    { a: 0.08, s: 0, rx: 0.78, ry: 0.84 },
    { a: 0.82, s: 0.48, len: 0.72, r: 0.27, rot: -0.3 },
    { a: 0.88, s: 0, len: 0.78, r: 0.27, rot: -0.3 },
    { a: 0.8, s: -0.48, len: 0.7, r: 0.27, rot: -0.3 },
    { a: 0.22, s: 0.76, len: 0.62, r: 0.24, rot: 0.55 },
  ],
};
// Creases, [a0, s0, a1, s1] in r, stroked last: the knuckles on the fist, the
// gaps between fingers on the open hand. Short, and never all the way through.
const HAND_CREASES = {
  fist: [[0.72, 0.3, 1.02, 0.32], [0.72, -0.12, 1.02, -0.14]],
  relaxed: [[0.78, 0.25, 1.12, 0.2], [0.78, -0.24, 1.1, -0.3]],
};

// Which hand a pose wears when the spec says 'auto'.
function handShapeFor(spec, kind) {
  const s = spec.handShape;
  if (!s || s === 'disc') return null;
  if (s !== 'auto') return HAND_PIECES[s] ? s : null;
  return kind === 'run' || kind === 'jump' || kind === 'slide' ? 'fist' : 'relaxed';
}

// The hand's frame: fingers along `ang`, thumb on the perpendicular that
// points screen-up — or forward, on a hand hanging straight down.
function handFrame(x, y, ang) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let px = -sa, py = ca;
  if (py > 0.001 || (Math.abs(py) <= 0.001 && px < 0)) { px = -px; py = -py; }
  return { x, y, ang, ca, sa, px, py };
}
const handAt = (f, a, s, r) => [f.x + f.ca * a * r + f.px * s * r, f.y + f.sa * a * r + f.py * s * r];

// One piece's subpath. Arcs and lines only: boundsOf's recorder knows no
// transforms. Every arc sweeps the same way so the union fills nonzero.
function handPiecePath(c, f, piece, r) {
  const [cx, cy] = handAt(f, piece.a, piece.s, r);
  if (piece.rx) {
    c.moveTo(cx + Math.cos(f.ang) * piece.rx * r, cy + Math.sin(f.ang) * piece.rx * r);
    c.ellipse(cx, cy, piece.rx * r, piece.ry * r, f.ang, 0, Math.PI * 2);
  } else {
    const cr = Math.cos(piece.rot), sr = Math.sin(piece.rot);
    const dx = f.ca * cr + f.px * sr, dy = f.sa * cr + f.py * sr;
    const th = Math.atan2(dy, dx), half = piece.len * r / 2, R = piece.r * r;
    c.moveTo(cx - dx * half + Math.cos(th + Math.PI / 2) * R, cy - dy * half + Math.sin(th + Math.PI / 2) * R);
    c.arc(cx - dx * half, cy - dy * half, R, th + Math.PI / 2, th + Math.PI * 1.5);
    c.arc(cx + dx * half, cy + dy * half, R, th - Math.PI / 2, th + Math.PI / 2);
    c.closePath();
  }
}

// `outer` is the cuff's radius (the bare hand's own when there is no cuff) —
// the one number a cuff still owns, since the band inside it is cast-wide now.
// `cuff` null means a bare hand. `ang` is the
// forearm's direction, null when the caller had none; the fingers then point
// down, the hanging default. `skinInk` false paints the disc as a plain fill,
// the way Grumpos's gauntlet always has. `kind` is the pose, for 'auto'.
function paintHand(ctx, spec, u, ow, x, y, outer, cuff, skin, ang, skinInk = true, kind = null) {
  let r = outer;
  if (cuff != null) {
    const band = (spec.handRing ?? HAND_RING) * u;
    r = Math.max(outer * 0.34, outer - band);
    outlined(ctx, cuff, handInk(ow), (c) => c.arc(x, y, outer, 0, Math.PI * 2));
  }
  const shape = handShapeFor(spec, kind);
  if (!shape) {
    if (skinInk) outlined(ctx, skin, handInk(ow, false), (c) => c.arc(x, y, r, 0, Math.PI * 2));
    else dot(ctx, x, y, r, skin);
    return;
  }
  // The wrist end of the palm sits on the cuff's centre: the hand starts
  // where the arm ends and the cuff shows behind it as the band it is.
  const f = handFrame(x, y, ang == null ? Math.PI / 2 : ang);
  const fwd = cuff != null ? (outer - r) * 0.5 : 0;
  f.x += f.ca * fwd; f.y += f.sa * fwd;
  const ink = handInk(ow, false);
  ctx.beginPath();
  for (const piece of HAND_PIECES[shape]) handPiecePath(ctx, f, piece, r);
  // Contour under the fill: doubled, because the fill takes the inner half.
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = ink * 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.fill();
  if (spec.handCreases === false || !HAND_CREASES[shape]) return;
  ctx.lineWidth = ink;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [a0, s0, a1, s1] of HAND_CREASES[shape]) {
    ctx.moveTo(...handAt(f, a0, s0, r));
    ctx.lineTo(...handAt(f, a1, s1, r));
  }
  ctx.stroke();
}

// The context arrives pre-scaled by device density (screen.px) or, inside a
// bake, by the supersample factor — neither of which is a change in how big the
// figure is drawn, so both are divided back out. What's left is camera zoom and
// any explicit sprite scaling, which are.
//
// The one target that is NOT density-scaled is the WebGL upload canvas, which
// stays exactly the logical frame and is stretched to the display afterwards —
// so a canvas measuring 480x270 on the nose is taken at face value. Offscreen
// canvases owned by the tools (gallery cells, the mixer) never resize the game,
// so screen.px is 1 there and their own transform is the whole answer.
// A gallery cell that MAGNIFIES a hero to make a stroke legible is not showing
// a camera push-in, and must not be inked like one: the ink bake-off blows the
// 24u in-run sprite up ~5x purely so the eye can see it. Pin the scale to the
// zoom being simulated (1 for a menu, 2 for a run) and the cell reports the ink
// the game actually draws, at whatever size it is displayed. null = measure it.
let inkScaleLock = null;
export function setInkScale(n = null) { inkScaleLock = n; }
// The same escape hatch for RESOLUTION: the gallery paints every tile through a
// supersampling transform the way cached() does, and that extra density is not
// a bigger drawing. Tools say so once, around the paint, and every tile's world
// zoom then reads true. 0 = measure it.
export function setInkDensity(n = 0) { inkBake = n; }
function drawScale(ctx) {
  if (inkScaleLock != null) return inkScaleLock;
  const m = ctx.getTransform ? ctx.getTransform() : null;
  if (!m) return 1;
  const s = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  const logicalFrame = ctx.canvas && ctx.canvas.width === W && ctx.canvas.height === H;
  const dev = inkBake || (logicalFrame ? 1 : screen.px) || 1;
  return s > 0 && dev > 0 ? s / dev : 1;
}

// ------------------------------------------------------------- contour taper
// The body contour is the one width in the file that is NOT a floor: it is a
// flat fraction of u, so it scales with the figure and stays exactly as heavy,
// proportionally, at every camera. That is the correct default and it is what
// keeps a 34px HUD cell readable — but at the tutorial's 5.5x push-in it means
// ~2 logical px of dark on each edge of every limb, and with the floored marks
// now behaving it is the heaviest thing left in the frame.
//
// So the contour thins as the figure grows, the way inked art does: a drawing
// blown up to a poster is not re-inked with a 5x pen. `taper` is the exponent
// on that trade — 0 is the old flat-fraction contour and 1 is a contour of
// constant FINISHED width, which is a wire and loses the silhouette against a
// dark room. The shipped half is the square root: the contour grows with the
// square root of the zoom rather than with the zoom, so at 2x the in-run figure
// goes 0.384u -> 0.27u and at the intro's 5.5x, 0.384u -> 0.16u. Picked off the
// contour bake-off against 0.25 and 0.33, which both still read inked at 5.5x.
// Never applied below 1:1, where the contour is already fighting for its life
// and hair()'s floor is carrying it.
const CONTOUR_TAPER = 0.5;
// The dial, defaulted to the shipped value, for the gallery's contour bake-off.
export const CONTOUR = { taper: CONTOUR_TAPER };
export function setContour({ taper = CONTOUR_TAPER } = {}) { CONTOUR.taper = taper; }
const contour = (w) => (inkScale > 1 && CONTOUR.taper > 0
  ? w / Math.pow(inkScale, CONTOUR.taper) : w);

// ------------------------------------------------------- face-crop contour
// A face crop draws the SAME head drawToon does, and it has always taken its
// contour at twice drawToon's weight and twice its floor (see paintFace). That
// doubling is aimed at the cells too small to hold a hairline at all — the 9px
// speech portrait, the 12px badge — and there it is the difference between a
// head and a smudge. The 22px hero disc is not one of those: at that size the
// doubled line is a fat edge around the eyes and mouth it is meant to enclose,
// and the plate stops looking like the face the run draws.
//
// So the extra weight is spent where it is needed and faded out where it is
// not, across the sizes in between rather than at a cliff. `h` is the crop's
// own box height; the result is a multiple of the body rule, so 1 is exactly
// what drawToon lays down.
const faceContourW = (h) => (FACE_CONTOUR.w != null ? FACE_CONTOUR.w
  : 1 + Math.max(0, Math.min(1, (18 - h) / 9)));
// The override, for a bake-off that wants to see both ends. null = measure it.
export const FACE_CONTOUR = { w: null };
export function setFaceContour(w = null) { FACE_CONTOUR.w = w; }

// The eyebrow hairline. Split out of the inline literal it used to be so the
// floor is nameable — it is the interesting half.
//
// The width is back at the 0.018u the thin-face pass cut it from. That pass was
// aimed at the eye RING — a ring drawn wider than the sclera it encloses reads
// as a grey donut — and swept the brows along with it on the shared `face`
// dial. A bold brow was never the defect: it is the mark the expression hangs
// on, and on the scowling half of the cast it is most of the characterisation.
//
// The floor is a finished-image floor, not a world one — see BROW_MIN's note
// above and hair() below. BROW_W * u clears it above u=21 at 1:1, so the 60u
// menus and cast parade draw the full 1.08 and the 24u in-run sprite 0.43.
// p.e arrives as a palette hex: lighten it toward white by `l`, then lay it
// down at opacity `a`. Lightening rides on the ink itself so it works the same
// over every ground the brow crosses — pale hide on grumpos, a dark blue head
// on gnash, a cap on lorenzo — where a fixed paler hex would have to be chosen
// against one of them and be wrong on the rest. parseHex is defined further
// down; this only runs at draw time, long after the module has evaluated.
const browInk = (hex, a, l) => {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const lit = l > 0 ? rgb.map((v) => Math.round(v + (255 - v) * l)) : rgb;
  return a >= 1
    ? `rgb(${lit[0]},${lit[1]},${lit[2]})`
    : `rgba(${lit[0]},${lit[1]},${lit[2]},${+a.toFixed(3)})`;
};

// ------------------------------------------------------ trouser colour dial
// `p.p` is ONE garment: legs, trouser front and braces all read from it, so a
// candidate has to be judged as the whole lower body rather than as a swatch.
// Blue is the shipped colour and also the most recognisable borrowed note in
// the design — cap plus mustache plus blue trousers is a silhouette everyone
// already knows — so the alternatives are here to be looked at, not argued
// about. The gallery drives this; production leaves it null.
export const LORENZO_PANTS = [
  { id: 'blue', label: 'blue (now)', hex: '#22608c', note: 'shipped — reads everywhere, and is the borrowed note' },
  { id: 'olive', label: 'olive drab', hex: '#57632f', note: 'workwear; the only candidate that holds on all three backdrops' },
  { id: 'plum', label: 'plum', hex: '#4a2f6b', note: 'ties the lower body to the cap — one palette, purple-heavy' },
  { id: 'tan', label: 'canvas tan', hex: '#9a6b3a', note: 'warm canvas; competes with the brown boots, belt and mustache' },
  { id: 'charcoal', label: 'charcoal', hex: '#3a3f4d', note: 'workwear slate — but it sinks into the hub wall, see the top row' },
  { id: 'teal', label: 'deep teal', hex: '#1d6f6b', note: 'tonal with the shirt: a coverall, but the waist stops reading' },
];
const PANTS = { hex: null };
export function setLorenzoPants(hex = null) { PANTS.hex = hex; }

const pal = (id) => (id === 'lorenzo' && PANTS.hex
  ? { ...HERO_SPRITES[id].pal, p: PANTS.hex }
  : HERO_SPRITES[id].pal);

// rig: humanoid | blob | disc. head/back/etc select per-hero decorations.
// armDepth: root the arms by DEPTH rather than by mirrored left/right — see
// drawHumanoid. Grumpos's near arm crosses his back-slung axe on the forward
// half of the cycle; the axe wants re-staging to clear the swing, but the arm
// sides are right as they stand.
// limbStyle: which entry of LOCO drives the knee fold, the foot roll and the
// hip depth. It is a per-hero dial on ONE shared painter, not a per-hero rig:
// `snap` is the reviewed reference, and the two retreats from it exist because
// a tunic and a battle skirt each have something hanging over the leg that the
// full-amplitude version puts a knee through. Anyone without the field renders
// exactly as they did before the styles landed.
export const TOON_SPECS = {
  // The near-arm SMOOTH SHOULDER JOIN shipped 9 Sep 2026 and is on by default
  // for every rig supportsShoulderJoinPreview accepts (Lorenzo, Gnash, Gary,
  // Dolores, Fernwick, and candidates): a fillet crown from the torso's corner
  // to the arm, the notch bridged in body colour, both trimmed to it. Set
  // `shoulderJoinPreview: 'cap'` to opt a rig out — dist/shoulder-preview.html
  // does that for its OLD CAP column. The key name is the bake-off's; rename
  // when that page retires.
  lorenzo: { rig: 'humanoid', head: 'cap', nose: true, mustache: true, straps: true, plumber: true, stout: true, armDepth: true, pants: true, limbStyle: 'snap' },
  gnash: { rig: 'humanoid', head: 'jackal', mouth: 'smirk', tail: true, armDepth: true, limbStyle: 'snap' },
  // `tunic` is the SHIPPED leg swing plus the new foot and jump — his gait was
  // judged better before the port and reverted, and the rest of it kept. Not a
  // cloth problem: the tunic escape measured 0.003u either way. His legs simply
  // read better on the old swing.
  //
  // `ears` at Lorenzo's own numbers, chosen out of the ear bake-off — the same
  // piece Kiko opted into, not a third drawing. He pays more for it than anyone:
  // his blond mass paints AFTER the skull and stands 1.027R proud at ear-top
  // height, so the upper half of the ear is behind hair and what shows is the
  // lobe below his sideburn end. That is the read that was wanted.
  // SHIPPED 6 Sep 2026: the LONGBOW replaced the shield roll (bake-off B2,
  // see ranged-move-bakeoff). Quiver on his back, bow worn across it.
  // FERNWICK is a princess. The redesign that ran through 2026-09-06/07 is the
  // shipped hero now, not a candidate: the head study (G1) settled the swept
  // bangs, the kicked tufts and the angular green ties that join them, and the
  // body bake-off settled a gored green gown over green tights with a green
  // gem headband in place of the floppy cap. The `head: 'floppy'` and the cap
  // dials below are inert while `princessWear` is a headband — they are left
  // in place because the face and skull they describe are still hers, and
  // because the cap is one spec key away if it is ever wanted back.
  //
  // `tunic: true` is NOT the garment any more; it is the LEG SWING. The tunic
  // rig's shortened bones and its foot are what her gait is built on, and the
  // gown is drawn by princessCostume instead (see PRINCESS_COSTUMES).
  fernwick: {
    rig: 'humanoid', head: 'floppy', mouth: 'smile', back: 'quiver', ranged: 'bow',
    bowStyle: 'high', tunic: true, rollTuck: true, slim: true, armDepth: true,
    hands: true, limbStyle: 'tunic', ears: true,
    // The head, off the G1 study.
    faceLike: 'fernwick', referenceHair: 'kicked', lockLift: 0.14, joinedLocks: true,
    fineTies: true, tuftBounce: true, tieAngle: 0.9, tieStyle: 'band', tieSize: 1.16,
    elfEars: 1.24,
    // The headband: green cloth with the ruby in it. The capFold/capBand/
    // setting* dials belong to the retired cap and do nothing under it.
    princessWear: 'headband', capFold: 0.5, capBand: 'wrap', bandHalf: 0.08,
    bandLift: 0.09, goldFinish: true, settingTilt: -5, settingLift: 0.15,
    settingWidth: 0.94, settingOffset: 0.04,
    // The body: the gored gown, a slim build with a real waist, a shade under
    // Kiko's height, and long sleeves that ARE the arms (bareArms false).
    princessCostume: 'gown', torsoWidth: 0.94, taper: 0.7, tall: 0.95,
    armOut: 0.03, puffs: false, bareArms: false,
    // And then shortened a little further. Dropping handsFront (below) put her
    // arm back on the cast's 0.200u, but `tall: 0.95` gives her the LOWEST
    // shoulder in the cast — 0.400u above the feet against everyone else's
    // 0.443u — so a cast-length arm still hung her hand 0.04u lower than
    // anyone's. `armLength` is the only dial that touches the arm without
    // touching her height: 0.88 lands the hand at 0.223u against the cast's
    // 0.240u. Not all the way — 0.82 matches exactly and reads stubby, and the
    // point is that she is a shorter hero, not that she has short arms.
    armLength: 0.88,
    // NO `handsFront` (removed 8 Sep 2026): it was Kiko's, and on Fernwick it
    // made her arms the longest in the cast by a wide margin. Measured, fitting
    // hand height against armLength so the slope is the arm and the intercept
    // is the shoulder: the cast's arm is 0.200u and lands the hand 0.240u above
    // the feet; hers came out 0.295u, landing at 0.128u — half everyone's
    // ground clearance, hands hanging past the hem to mid-thigh.
    //
    // Nothing in her spec said "long arms". `handsFront` solves the rest pose
    // through reach() at 0.84 of arm length, which is FULL extension — the
    // shared rest deliberately hangs at 0.78 of a 1.1 reach so the elbow keeps
    // a visible bend. Kiko survives that because her shoulder is the highest in
    // the cast (0.515u); `tall: 0.95` gives Fernwick the LOWEST (0.422u), so
    // she starts lowest and then reaches furthest. Two dials, neither hers
    // alone, compounding.
    //
    // She does not need it either way: handsFront exists to keep hands down the
    // front of a skirt instead of elbows out, and that was Kiko's split dress.
    // The necklace is the THREE-STONE collar, chosen 7 Sep 2026 over a plain
    // pendant, a teardrop, a layered pair, a choker and a gold torc. It and
    // the torc were the only two that still read as jewellery at lane size,
    // where a chain is about a pixel wide.
    goldCuffs: true, necklace: true, necklaceStyle: 'trio',
    neckStyle: 'scoop', neckWide: 0.5, neckDeep: 0.5,
    quiverTuck: 0.09, quiverStrap: true,
    // Approved B sling: 20% thinner than the study baseline, 85% opacity.
    quiverMount: 'loop', quiverStrapWidth: 0.024, quiverStrapOpacity: 0.85,
    runArmSeatIn: 0.0285, runArmSeatDown: 0.01,
    // The slide's own tuning. Every one of these is hers alone — the cast's
    // shared slide geometry is untouched by all of them.
    slideBootCover: true, slideNearOut: 0.04, slideNearLegLen: 0.86,
    slideRearBack: 0.03, slideNeckFollow: 0.2,
    // The lead knee sits lower in the air than the cast's, so it tucks under
    // the gown's waistband instead of coming up through it.
    jumpKneeDrop: 0.16, celebTuck: 0.3,
  },
  // armLen 1.3: his arm IS his weapon, and at the stock 0.26u reach the barrel
  // died right on his own silhouette edge with no gun sticking out of him. The
  // longer bones also cure the stubbiness — the upper arm goes from 1.9x its
  // own width to 2.5x. Held short of 1.4, where the reach starts to read lanky
  // against his short legs.
  b33p: { rig: 'humanoid', head: 'dome', mouth: 'grille', cannon: true, armDepth: true, hands: true, armLen: 1.3, limbStyle: 'snap' },
  mochi: { rig: 'pika' },
  chompo: { rig: 'disc' },
  // Kiko, straight off candidate N. The split skirt is `dress: 'split'` — one
  // panel longer than a flare with a single slit up the travel side, so it opens
  // toward the direction she runs. `taper: 0.8` is tighter than the rest of the
  // cast because the qipao has to hang off a waist rather than a box.
  // `tall` is the whole-figure height dial: it lifts head, shoulders and torso
  // top and lengthens the legs TOGETHER, and the head's own RADIUS is not in it
  // — so the figure grows without the face growing, which is what reads as a
  // taller person rather than a bigger drawing. 1.02 stands her crown at 1.006
  // of the draw height, measured rather than guessed: a little under B-33P's
  // dome (1.094) and a little under Lorenzo (1.025), which is where she was
  // asked to land. She was 0.91 — the shortest thing in the lane, which is not
  // what a martial artist should be — and B-33P height (1.13) overshot it.
  //
  // `legLength` is the split between torso and leg WITHIN that height. It moves
  // the hip only: the crown does not move a pixel between 1.0 and 1.12, which
  // is why lengthening legs alone never made her taller. Just over 1 keeps a
  // little of the leggy line a fighter wants without spending the torso on it.
  // Her head was reworked off four references after she shipped: hair cut to the
  // jaw, a W cut into the hairline with hair piled on the crown, two ribbon ends
  // per bun beside the long tails, a gold band on the bun/hair join, and ears.
  // docs/notes/kiko-persona.md records what each of those beat and why.
  kiko: { rig: 'humanoid', tall: 1.02, legLength: 1.06, headScale: 0.88, mouthLift: 0.014, eyeLift: 0.008, head: 'buns', mouth: 'smile', slim: true, taper: 0.8, armLift: 0.014, armOut: 0.03, armDepth: true, limbStyle: 'snap', bareArms: true, puffs: true, dress: 'split', waistRise: 0.035, bracers: true, boots: 0.52, kiblast: true, handsFront: true, jumpKneeDrop: 0.14, celebTuck: 0.48,
    hairCut: 'jaw', fringe: 'twin-pile', bunStubs: 'pair', bunJoin: 'band', ears: true, earStud: true },
  // Clara Vault, straight off raider candidate A3 with the two-wisp hairline —
  // the whole bake-off record is in docs/notes/clara-persona.md. Olive tank
  // with a V throat, hip belt (`beltDrop`) opening a sliver of midriff under
  // the cropped hem, waist taken in to `taper: 0.78`, khaki into boots, TWIN
  // thigh rig with a pistol in each hand on the power move — the strongest
  // single read the reference had, and the pair her double-tap shot (see
  // `shotBurst` on the hero row) is drawn from. Her hair is the pulled-tight
  // cut with the hairline swept back and one wisp escaping in front of each
  // ear — the plait falls to her waist and bounds on the stride clock. She wears
  // the shared `ears` piece — the third head to opt in after Fernwick and Kiko
  // rather than a fourth drawing — set slightly in at `earOut: 0.91`. Her cut
  // is what makes it land: `pulled` brings the hair rim in to a 0.35 flare, so
  // at ear height the rim stands only ~1.09R proud, and the ear clears it
  // rather than sitting on it. 0.91 shows a 0.11R crescent against the stock
  // 0.95's 0.15R — about three quarters of it, which is the difference between
  // an ear she has and an ear she is wearing. Out at 0.98 and 1.02 the lobe
  // stands clear of the skull and reads as a stuck-on part; in at Grumpos's
  // tucked 0.88 it falls back inside the hair rim and reads as a bump. No
  // `earStud`: the gold is Kiko's piping, and Clara's kit is olive and khaki.
  // It also settles the wisps — the fringe pair is described as escaping in
  // front of each ear, and until now there was no ear for them to fall past.
  // `shoulderSoft: 0.75` rounds the shoulder corner off the cast default of
  // 0.5. She is the hero who needs it: her top has no sleeve, so nothing
  // breaks the corner and the shirt's own edge IS the shoulder — at 0.5 that
  // came out square, a box with a head on it. She is opted in alone; Kiko and
  // Grumpos share the taper path and keep the shipped corner.
  clara: { rig: 'humanoid', armLift: 0.014, tall: 1.07, head: 'braid', hairCut: 'pulled', fringe: 'swept-wisps', mouth: 'smile', slim: true, taper: 0.78, shoulderSoft: 0.75,
    armDepth: true, hands: true, limbStyle: 'snap', pants: true,
    bareArms: true, tank: true, crop: 0.78, beltDrop: 0.035, gloves: true,
    gearBelt: true, holster: 'thigh', boots: 0.5, pistol: 'twin', ears: true, earOut: 0.91 },
  gary: { rig: 'humanoid', head: 'paperhat', mouth: 'flat', nameTag: true, armDepth: true, hands: true, limbStyle: 'snap' },
  // The serving line's own staff. Stout and short-armed on purpose: she is only
  // ever seen from the deck up, framed by a sneeze guard, so the silhouette that
  // has to work is shoulders-bun-apron and nothing below it. `flat` mouth is the
  // whole performance — she is not pleased to see you and she is not displeased.
  dolores: { rig: 'humanoid', head: 'hairnet', mouth: 'flat', apron: true, stout: true, armDepth: true, hands: true, limbStyle: 'snap' },
  raymn: { rig: 'ray', limbStyle: 'float' },
  // tatSide +1 puts the war paint on the screen-RIGHT: the depth rig swings his
  // near arm up the screen-left side, which sat over the old stripe half the
  // cycle. Face streak and torso stripe are one marking and share the sign.
  //
  // `earOut: 0.88` is the TUCKED ear, chosen out of the bake-off over the stock
  // 0.95 every other eared hero wears. He is the head a stock ear shouts on, for
  // reasons that are all measured: he is bald, so nothing beside his head
  // competes; his R is 0.22u against everyone else's 0.21u, so the same ellipse
  // is 5% bigger before anything is chosen; and his block head is at its widest
  // exactly where the ear sits, 0.993R, then tapers to 0.937R only 0.2R lower,
  // handing the ear's bottom half more clear air than a round skull would.
  // Sliding it in to 0.88R takes the visible crescent from 0.157R to 0.087R —
  // a little over half — while leaving the ear itself full size, so what shows
  // is full height and reads as an ear mostly behind a head rather than as a
  // smaller ear. His beard roots at 0.94R and paints after, landing flush with
  // the jaw line rather than over the ear, so it takes nothing back.
  grumpos: { rig: 'humanoid', heavy: true, head: 'bald', beard: true, back: 'axe', shoulders: 1.08, taper: 0.58, pecs: true, armDepth: true, tatSide: 1, limbStyle: 'heavy', ears: true, earOut: 0.88, jumpKneeDrop: 0.12, celebTuck: 0.52,
    // `headAngle: -57` is SOLVED, not eyeballed. The blade's socket edge runs
    // from (-0.27,-0.04) to (-0.24,-0.25) in the art's own coordinates, so its
    // axis — square to that edge — bears -171.9 degrees, while the haft bears
    // -138.7. Perpendicular means the axis at haft-90 = -228.7, which is 56.8
    // degrees of rotation. Guessing got to -38 and left it visibly off.
    //
    // The axe keeps the angle and the shoulder position it has always had —
    // that part of it was never the problem. What changed (9 Sep 2026) is the
    // HEAD: 15% smaller, and a steel that sits below his skin instead of above
    // it. In the shipped ice blue the blade was lighter than he is and the eye
    // reached the axe before the face; it is his weapon, not his focal point.
    axeArt: { blade: 0.74, headSlide: 0.06, headAngle: -57, steel: '#8fa9bd', sheen: '#cfe2ef' } },
};

// ---------------------------------------------------------------- helpers
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
// Half-width of roundRectPath at a given y — the plain-torso twin of
// taperHalfAt, and needed for the same reason: anything that has to hide
// INSIDE the body near the shoulder line is up in the corner arc, where the
// silhouette is a long way in from the nominal half-width.
function roundHalfAt(y, top, bot, half, r) {
  const rr = Math.min(r, half, (bot - top) / 2);
  const dy = y <= top + rr ? top + rr - y : y >= bot - rr ? y - (bot - rr) : 0;
  if (dy >= rr) return half - rr;                 // past the cap: the corner's own inset
  return half - rr + Math.sqrt(rr * rr - dy * dy);
}
// A torso that narrows from shoulders to waist: rounded shoulder corners, a
// lat sweep down each side, rounded hips. With halfTop > halfBot the sweep is
// the inverted taper of a lifted upper body.
// How early the sides start pulling in, as a fraction of the total narrowing
// already spent at the curve's control point. At 0 the control sits out at the
// shoulder and the body stays wide most of the way down — a barrel that only
// tucks at the last moment. Raising it drags the narrowing up into the ribs,
// which is the difference between "heavyset" and "athletic".
const TAPER_LEAD = 0.55;
// How round the SHOULDER CORNER is, as a fraction of the shoulder's own
// half-width. 0.5 leaves a flat top half as wide as the body with a corner
// either side of it — the shipped shape, and squared-off enough to read as a
// box on a hero whose top has no sleeve to break the corner. It is a per-spec
// dial (`shoulderSoft`) rather than a global because it is a silhouette
// change: every hero on the taper path wears it, and only the one asking for
// it should. Past ~0.9 the flat top vanishes entirely and the torso becomes a
// bell — the shoulder line goes with it, and the figure reads as hunched.
const TAPER_SHOULDER = 0.5;
function taperCtl(top, bot, halfTop, halfBot, soft = TAPER_SHOULDER) {
  return {
    rT: halfTop * soft,
    rB: halfBot * 0.62,
    midY: top + (bot - top) * 0.55,
    ctlX: halfTop + (halfBot - halfTop) * TAPER_LEAD,
  };
}
// Half-width of taperTorsoPath at a given y: invert the side's y(t) for t,
// then read its x(t). Belts and hems measure themselves against this —
// assuming a straight box leaves body slivers beside a band meant to sit
// flush, and the curve is not a straight line between the two ends.
function taperHalfAt(y, top, bot, halfTop, halfBot, soft) {
  const { rT, rB, midY, ctlX } = taperCtl(top, bot, halfTop, halfBot, soft);
  const y0 = top + rT, y1 = bot - rB;
  if (y <= y0) return halfTop;
  if (y >= y1) return halfBot;
  const a = y1 - 2 * midY + y0, b = 2 * (midY - y0), c = y0 - y;
  let t;
  if (Math.abs(a) < 1e-9) {
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return halfBot;
    const r = Math.sqrt(disc);
    t = (-b + r) / (2 * a);
    if (t < 0 || t > 1) t = (-b - r) / (2 * a);
  }
  t = Math.max(0, Math.min(1, t));
  const it = 1 - t;
  return it * it * halfTop + 2 * t * it * ctlX + t * t * halfBot;
}
function taperTorsoPath(c, cx, top, bot, halfTop, halfBot, soft) {
  const { rT, rB, midY, ctlX } = taperCtl(top, bot, halfTop, halfBot, soft);
  c.moveTo(cx - halfTop + rT, top);
  c.lineTo(cx + halfTop - rT, top);
  c.quadraticCurveTo(cx + halfTop, top, cx + halfTop, top + rT);
  c.quadraticCurveTo(cx + ctlX, midY, cx + halfBot, bot - rB);
  c.quadraticCurveTo(cx + halfBot, bot, cx + halfBot - rB, bot);
  c.lineTo(cx - halfBot + rB, bot);
  c.quadraticCurveTo(cx - halfBot, bot, cx - halfBot, bot - rB);
  c.quadraticCurveTo(cx - ctlX, midY, cx - halfTop, top + rT);
  c.quadraticCurveTo(cx - halfTop, top, cx - halfTop + rT, top);
  c.closePath();
}

// Asymmetric torso for a real three-quarter view. Positive yaw exposes the
// screen-left side: its shoulder/rib edge stays broad and close, while the
// screen-right edge recedes and the shoulder line slopes into depth.
function turnedTorsoPath(c, cx, top, bot, halfTop, halfBot, yaw) {
  const d = Math.abs(yaw);
  const nearLeft = yaw >= 0;
  const leftTop = halfTop * (nearLeft ? 1.1 : 0.84);
  const rightTop = halfTop * (nearLeft ? 0.84 : 1.1);
  const leftBot = halfBot * (nearLeft ? 1.02 : 0.86);
  const rightBot = halfBot * (nearLeft ? 0.86 : 1.02);
  const leftTopY = top + (nearLeft ? halfTop * 0.28 * d : 0);
  const rightTopY = top + (nearLeft ? 0 : halfTop * 0.28 * d);
  const shoulderRound = halfTop * 0.38;
  const hipRound = Math.max(halfBot * 0.32, halfTop * 0.12);

  c.moveTo(cx - leftTop + shoulderRound, leftTopY);
  c.lineTo(cx + rightTop - shoulderRound, rightTopY);
  c.quadraticCurveTo(cx + rightTop, rightTopY, cx + rightTop, rightTopY + shoulderRound);
  c.quadraticCurveTo(cx + rightTop * 0.82, top + (bot - top) * 0.58, cx + rightBot, bot - hipRound);
  c.quadraticCurveTo(cx + rightBot, bot, cx + rightBot - hipRound, bot);
  c.lineTo(cx - leftBot + hipRound, bot);
  c.quadraticCurveTo(cx - leftBot, bot, cx - leftBot, bot - hipRound);
  c.quadraticCurveTo(cx - leftTop * 0.88, top + (bot - top) * 0.58, cx - leftTop, leftTopY + shoulderRound);
  c.quadraticCurveTo(cx - leftTop, leftTopY, cx - leftTop + shoulderRound, leftTopY);
  c.closePath();
}
// ------------------------------------------------------------- key light
// Flat fills are what made the cast read as stickers laid on the background:
// every form was one solid colour inside a contour, with nothing saying which
// way was up. This is a single key light for the whole cast, and the whole of
// it is gradient re-fills of paths the rig has ALREADY built — no blur, no
// shadow passes, no offscreen buffers. The player's hero repaints every frame
// at full device resolution on a phone, so the shading budget is whatever the
// rasterizer does for free.
//
// Two cues here, plus a third next door:
//   FORM   a light-to-shadow ramp, so a head reads as a ball and a torso as a
//          barrel instead of as two stickers.
//   RIM    a warm lit-side contour, which is what lifts a figure off whatever
//          is behind it.
//   DEPTH  a flat push-back on the receding-side limbs — see `recede` and
//          drawHumanoid's farShade. The turned rig was BUILT for that cue and
//          then lit as if both sides were the same distance away.
//
// ONE FIELD, NOT ONE RAMP PER SHAPE. This is the whole design, and it is worth
// being blunt about because the obvious implementation is the wrong one: fit
// each shape's ramp to its own bounding box and every shape is lit correctly
// in isolation and wrongly against its neighbours. This rig builds masses out
// of overlapping pieces that must not show a seam — the shoulder cap exists
// purely to bury an arm's root in the torso, the pelvis bridges two thighs,
// the battle skirt is four leather panels over an under-layer — and per-shape
// ramps put a different gradient on each piece. The cap turned into a pauldron
// bolted to the shoulder, and every skirt panel put its own highlight at its
// own top edge, banding the waist until the leather looked see-through.
//
// A single field evaluated in FIGURE space has no such failure mode: any two
// shapes meeting at a point get the same value there, so every blend the rig
// relies on stays invisible and shapes may overlap freely. Figure space is
// origin at the feet, -y up. drawToon re-signs the x component against the
// facing flip, so the key stays put in the WORLD when a hero turns around
// rather than sliding across their body with them.
const LIGHT_X = -0.45, LIGHT_Y = -1;
const LIGHT_LEN = Math.hypot(LIGHT_X, LIGHT_Y);
// Where the field's ramp is anchored, in u: the figure's rough centre, and how
// far out along the key its lit and shadow ends sit. Sized to the standing
// silhouette so heads land near the lit end and feet near the shadow end.
const FIELD_CY = -0.5, FIELD_R = 0.72;
// ...which is why a hero who LIES DOWN reads a step darker in every colour he
// wears. A slide lays the crown from 0.96-1.23u (standing, measured across the
// cast) down to 0.74-0.86u, so the shirt, the skin and the cap all land further
// along the same ramp than they do upright, and the whole figure dims for the
// duration of the slide. It is not modelling — the light did not move and
// neither did the garment — it is the field being sized to a silhouette the
// pose no longer has.
//
// So the field goes down WITH him: centre and radius both scale, which is the
// only way the pose keeps the same value AND the same amount of modelling. (The
// centre alone slides a shorter figure up the ramp and flattens it; the radius
// alone leaves it anchored too high.)
//
// The crown ratio measures 0.64-0.80 across the cast (work/local/_pose-height.mjs);
// 0.70 is the value inside that range which best equalises the key's measured
// effect on the garments themselves, swept in work/local/_slide-lum-cast.mjs.
// That probe labels each pixel with its UNLIT fill and reports how far the key
// drove it, which is the only pose-proof way to ask this — mean luminance and
// fill-matching both end up measuring the slide showing more trouser than shirt.
// Cast mean gap between standing and sliding: 4.6% before, 2.1% after; worst
// case 10.4% (grumpos) down to 5.0%. What is left is the slide's mass lying
// AHEAD of the origin, along the key's x, which a scale about the feet cannot
// reach; it is well under the threshold this started at and not worth an fx dial.
const SLIDE_FIELD_K = 0.70;
// A head's own offset from that centre, for callers who draw a head and no
// figure. See paintFace, which is the only one.
const FIELD_HEAD_DY = 0.26;
// The shadow tint is OUTLINE's ink: contour and shading stay one colour
// family, so a shaded form looks lit rather than dirty.
const SHADOW_INK = '26,16,40';
const HILITE_INK = '255,246,232';
// HOW HARD THE FIELD DRIVES, and where along its length it starts driving.
// Settled 9 Sep 2026, after the same complaint arrived three ways in one
// sitting: a hero's shirt was darker sliding than standing, Clara's bare arms
// were darker than her face, Fernwick's hands were darker than hers. All three
// are the same fact — the ramp runs lit crown to shadowed feet, so a garment's
// value depends on how high up the body it happens to sit, and the eye reads
// that as two different paints rather than as one paint modelled.
//
// The bake-off (work/local/_field-options.mjs, four columns on five heroes,
// standing beside sliding) put a weaker shadow, a later terminator and both
// together against the shipped field. Peter took BOTH: the ramp keeps its shape
// but barely tints, and it does not begin until past the middle of the figure.
// Measured across the cast: the face-to-hand skin gap goes 6.4% -> 4.0% (worst
// hero 11.3% -> 5.8%) and the standing-to-sliding gap 2.0% -> 0.8%.
//
// What this spends: the field was never what rounded a form on its own — that
// is the per-shape highlight blob below (SPEC_A), which is untouched — so the
// cast keeps its volume where it reads and loses the body-length gradient that
// was being mistaken for a colour.
const FORM_A = 0.18;   // shadow alpha at the shadow end of the figure
const HILITE_A = 0.09; // highlight alpha at the lit end
// Where along the ramp each cue starts. Both begin later than they did (0.46
// and 0.4): the shadow now waits until past the hips and the highlight is a
// crown note rather than the top half of the body.
const CORE_STOP_A = 0.55, CORE_STOP_B = 0.80, LIT_STOP = 0.30;
// A field alone cannot round a single form: it varies with POSITION, and every
// point where two shapes meet has one value, which is exactly why it never
// seams — and also why a head lit by it reads as "the top of the figure is
// brighter" rather than as a ball. The volume comes back as a soft highlight
// blob per form, sized to the form and held well inside it. Anything that
// reaches zero before the contour cannot disagree with a neighbour at the
// contour, so this buys back per-form roundness under the same no-seam rule
// the field is built on.
const SPEC_A = 0.2;    // peak alpha at the blob's centre
const SPEC_OFF = 0.36; // how far toward the key it sits, as a fraction of the form
const SPEC_R = 0.78;   // and its radius, against the form's SHORT half-axis
// How dark a figure standing in an unlit room goes. The concourse already dims
// its wall and its dressings by where the working ceiling lights are (see
// backwall's wallLitFrom); until now the cast was exempt from it and stood at
// full daylight in front of a near-black bay, which is the surest way to read
// as a sticker laid on a scene rather than a body standing in it.
//
// Losing the key does two things at once, and doing only the first is what
// makes dimmed art look like it is behind smoked glass: the figure gets DARKER,
// and it gets FLATTER, because the modelling was the key light's doing. So this
// deepens the shadow floor and fades the highlight and blob together.
//
// Held well short of the wall's own 0.88: the cast is what you are looking at,
// and a silhouette you cannot read is not atmosphere.
const AMBIENT_A = 0.62;
// The rim rides OVER the contour but stops well short of erasing it: at full
// weight the key simply deleted the outline down the lit side, and heroes lost
// the border on their leading shoulder mid-walk. It thins and warms that edge
// instead.
//
// It used to ride ACROSS the contour — a stroke centred on the same path at
// RIM_W of its width, on the theory that dark then survives on both sides of
// it. That is true of the INK and false of the PICTURE, and it is why the pale
// heads read as embossed rather than outlined. A canvas stroke straddles its
// path, so the contour's outer half lands on the BACKGROUND: against the
// concourse wall the dark ink moves it four levels out of 255, which is to say
// not at all, while the same ink over grumpos's #ded9d2 hide costs 67. Measured
// across his skull at the in-run 24u, wall 31 and skin 225, the old centred rim
// read
//
//     31 -> 27 -> [99] -> 187 -> [158] -> 225
//      wall  ink   RIM     ink    ink     skin
//
// — a +68 band OUTSIDE the silhouette against a -67 band inside it. Near
// symmetric, which is a bevel, not a contour. Every hero but chompo carried
// one (halo means of 20-36); grumpos only shows it worst because his fill is
// the palest in the cast and gives the inner half the most to bite on.
//
// So the rim is CLIPPED to the shape it belongs to. It can only warm the fill
// now, never spill past the edge. RIM_W halves to match: a clipped stroke
// throws away its outer half, so 0.3 clipped covers the same skin 0.6 centred
// did, and leaves the inner dark line at exactly the 158 it always had. The
// halo goes; the contour, the ramps and the blob do not move.
const EDGE_A = 0.34, RIM_W = 0.3, RIM_INSIDE = true;
// ------------------------------------------------------------------ rim dial
// The levers on all of the above, defaulted to the shipped values; the
// gallery's rim bake-off drives them, including the old centred `was` column.
// `a` scales EDGE_A — note INK.alpha does NOT reach the rim, so softening the
// contour alone shifts the balance toward the light half.
export const RIM = { w: RIM_W, a: 1, inside: RIM_INSIDE };
export function setRim({ w = RIM_W, a = 1, inside = RIM_INSIDE } = {}) {
  RIM.w = w; RIM.a = a; RIM.inside = inside;
}
// Marks, not volumes: eyes, pupils, buttons and teeth. A ramp across a
// three-pixel pupil is mud, and a rim around one is a smudge.
const SHADE_MIN = 0.1;

// Live light state, set per figure by armLight. Rendering here is synchronous
// and single-threaded, so this is threaded the same way ctx state is. `g`
// caches the figure's three gradients: they are identical for every shape, so
// they are built once on first use rather than ~90 times per frame.
const shade = { on: false, lx: 0, ly: -1, u: 1, lit: 1, fx: 0, fy: FIELD_CY, fr: FIELD_R, g: null };

// Arm the key for one figure. `xSign` is the net horizontal sign the caller
// has already pushed onto the context (facing flip, celebrate spin); negating
// lx against it is what keeps the light in world space. `lit` is 0..1 room
// brightness where this figure is standing — 1 everywhere that has no opinion,
// which is every caller except the concourse. Returns the previous state —
// paintFace nests a whole drawToon inside its own render.
//
// `fx`/`fy` are where the ramp is ANCHORED, in the caller's own space. drawToon
// translates to the feet before it arms, so it takes the default and the field
// lands on the figure's centre as FIELD_CY says. A face crop has no figure and
// no such translate — see paintFace, which anchors the field on the head.
function armLight(u, xSign, on, lit = 1, fx = 0, fy = null, fr = null) {
  const prev = {
    on: shade.on, lx: shade.lx, ly: shade.ly, u: shade.u, lit: shade.lit,
    fx: shade.fx, fy: shade.fy, fr: shade.fr, g: shade.g,
  };
  shade.on = !!on;
  shade.u = u;
  shade.lx = (LIGHT_X / LIGHT_LEN) * (xSign < 0 ? -1 : 1);
  shade.ly = LIGHT_Y / LIGHT_LEN;
  shade.lit = Math.max(0, Math.min(1, lit));
  shade.fx = fx;
  shade.fy = fy == null ? FIELD_CY * u : fy;
  shade.fr = fr == null ? FIELD_R * u : fr;
  shade.g = null;
  return prev;
}
function disarmLight(prev) {
  shade.on = prev.on; shade.lx = prev.lx; shade.ly = prev.ly;
  shade.u = prev.u; shade.lit = prev.lit;
  shade.fx = prev.fx; shade.fy = prev.fy; shade.fr = prev.fr; shade.g = prev.g;
}

// Bounding box of a path function without rasterizing it. The rig's path
// builders only ever call these eleven methods, so replaying one against a
// recorder yields its extent for the cost of the arithmetic — no second
// canvas, no getImageData. Curve control points count as corners, which
// overstates the tightest arcs by a few percent; a lighting ramp cannot see
// the difference.
const TAU = Math.PI * 2;
function arcCovers(a0, a1, ccw, a) {
  if (Math.abs(a1 - a0) >= TAU) return true;
  const norm = (v) => ((v % TAU) + TAU) % TAU;
  const span = ccw ? norm(a0 - a1) : norm(a1 - a0);
  const at = ccw ? norm(a0 - a) : norm(a - a0);
  return at <= span;
}
function boundsOf(pathFn) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const put = (x, y) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  const rec = {
    beginPath() {}, closePath() {},
    moveTo: put, lineTo: put,
    quadraticCurveTo(cx, cy, x, y) { put(cx, cy); put(x, y); },
    bezierCurveTo(ax, ay, bx, by, x, y) { put(ax, ay); put(bx, by); put(x, y); },
    arcTo(ax, ay, x, y) { put(ax, ay); put(x, y); },
    rect(x, y, w, h) { put(x, y); put(x + w, y + h); },
    roundRect(x, y, w, h) { put(x, y); put(x + w, y + h); },
    // A partial arc that only sweeps the top of a circle must not report the
    // bottom: half-dome hat brims are drawn exactly that way, and boxing them
    // as full circles drops the ramp's centre a quarter of a head too low.
    arc(x, y, r, a0, a1, ccw) {
      if (a0 == null) { put(x - r, y - r); put(x + r, y + r); return; }
      put(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
      put(x + Math.cos(a1) * r, y + Math.sin(a1) * r);
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        if (arcCovers(a0, a1, !!ccw, a)) put(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
    },
    // Every ellipse in the rig is a full one; the rotated extent is exact.
    ellipse(x, y, rx, ry, rot) {
      const c = Math.abs(Math.cos(rot || 0)), s = Math.abs(Math.sin(rot || 0));
      const ex = Math.hypot(rx * c, ry * s), ey = Math.hypot(rx * s, ry * c);
      put(x - ex, y - ey); put(x + ex, y + ey);
    },
  };
  pathFn(rec);
  return x1 >= x0 ? { x0, y0, x1, y1 } : null;
}

// The figure's three gradients, along the key axis through figure space. Built
// once per figure and handed to every shape, which is what makes the field a
// field. Canvas resolves gradient coordinates against the transform in force
// when they are PAINTED, so a cached object and a freshly built one behave
// identically inside the rig's few nested transforms — the cache is pure
// savings, not a change in result.
function fieldRamps(ctx) {
  if (!shade.on) return null;
  if (shade.g) return shade.g;
  const cx = shade.fx, cy = shade.fy, r = shade.fr;
  const ax = cx + shade.lx * r, ay = cy + shade.ly * r;   // lit end
  const bx = cx - shade.lx * r, by = cy - shade.ly * r;   // shadow end
  // Room brightness rides the SAME gradients rather than a separate pass over
  // the figure: a flat wash drawn per shape would stack wherever the rig
  // overlaps pieces, which is the seam this whole design exists to avoid.
  // `dark` is the shadow floor the ambient adds everywhere; `key` is how much
  // of the directional modelling survives.
  const key = shade.lit;
  const dark = (1 - shade.lit) * AMBIENT_A;
  const sh = (a) => Math.min(1, dark + a * key).toFixed(3);
  const hi = (a) => (a * key).toFixed(3);
  const core = ctx.createLinearGradient(ax, ay, bx, by);
  // Nothing happens through the lit half. A terminator that starts at the
  // highlight and runs the entire figure is a gradient, not a lit form.
  core.addColorStop(0, `rgba(${SHADOW_INK},${sh(0)})`);
  core.addColorStop(CORE_STOP_A, `rgba(${SHADOW_INK},${sh(0)})`);
  core.addColorStop(CORE_STOP_B, `rgba(${SHADOW_INK},${sh(FORM_A * 0.38)})`);
  core.addColorStop(1, `rgba(${SHADOW_INK},${sh(FORM_A)})`);
  const lit = ctx.createLinearGradient(ax, ay, bx, by);
  lit.addColorStop(0, `rgba(${HILITE_INK},${hi(HILITE_A)})`);
  lit.addColorStop(LIT_STOP, `rgba(${HILITE_INK},0)`);
  lit.addColorStop(1, `rgba(${HILITE_INK},0)`);
  const edge = ctx.createLinearGradient(ax, ay, bx, by);
  edge.addColorStop(0, `rgba(${HILITE_INK},${hi(EDGE_A * RIM.a)})`);
  edge.addColorStop(0.5, `rgba(${HILITE_INK},0)`);
  edge.addColorStop(1, `rgba(${HILITE_INK},0)`);
  shade.g = { core, lit, edge };
  return shade.g;
}

// The field plus this form's own highlight blob. The bounds pass earns its
// keep twice over: it tells a volume from a mark, and it sizes the blob.
function formRamps(ctx, pathFn) {
  if (!shade.on) return null;
  const b = boundsOf(pathFn);
  if (!b) return null;
  const hw = (b.x1 - b.x0) / 2, hh = (b.y1 - b.y0) / 2;
  if (Math.max(hw, hh) * 2 < SHADE_MIN * shade.u) return null;
  const g = fieldRamps(ctx);
  if (!g) return null;
  const short = Math.min(hw, hh);
  // Under a couple of device pixels a blob is a smudge, not a highlight. In an
  // unlit bay there is no key to put one there at all — the blob fades out with
  // the rest of the modelling rather than floating on a darkened figure.
  const peak = SPEC_A * shade.lit;
  if (short < 0.03 * shade.u || peak < 0.01) return g;
  const cx = (b.x0 + b.x1) / 2 + shade.lx * hw * SPEC_OFF;
  const cy = (b.y0 + b.y1) / 2 + shade.ly * hh * SPEC_OFF;
  const r = short * SPEC_R;
  const spec = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  spec.addColorStop(0, `rgba(${HILITE_INK},${peak.toFixed(3)})`);
  spec.addColorStop(0.55, `rgba(${HILITE_INK},${(peak * 0.34).toFixed(3)})`);
  spec.addColorStop(1, `rgba(${HILITE_INK},0)`);
  return { core: g.core, lit: g.lit, edge: g.edge, spec };
}

// Push a colour back into depth for a receding-side limb. It loses value and
// a little saturation together — darkening alone reads as a limb painted in a
// second colour, where losing both reads as the same paint further away.
const SHADOW_RGB = [26, 16, 40];
function parseHex(hex) {
  if (typeof hex !== 'string' || hex[0] !== '#') return null;
  if (hex.length === 7) return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  if (hex.length === 4) return [17 * parseInt(hex[1], 16), 17 * parseInt(hex[2], 16), 17 * parseInt(hex[3], 16)];
  return null;
}
function recede(col, t) {
  if (!t || !shade.on) return col;
  const rgb = parseHex(col);
  if (!rgb) return col;                     // rgba()/named: leave it alone
  const grey = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const out = rgb.map((v, i) => {
    const flat = v + (grey - v) * t * 0.45;  // saturation goes with the light
    return Math.round(flat + (SHADOW_RGB[i] - flat) * t);
  });
  return `rgb(${out[0]},${out[1]},${out[2]})`;
}

function outlined(ctx, fill, ow, pathFn, stroke = OUTLINE) {
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  // Canvas keeps the current path after a fill or a stroke, so every pass
  // below reuses it: the shading costs rasterizer time and not path building.
  const g = formRamps(ctx, pathFn);
  if (g) {
    ctx.fillStyle = g.core; ctx.fill();
    ctx.fillStyle = g.lit; ctx.fill();
    if (g.spec) { ctx.fillStyle = g.spec; ctx.fill(); }
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = ow;
  ctx.stroke();
  // Rim last, clipped to the shape so it warms the lit side of the fill and
  // never reaches past the contour — see RIM above for why that clip is the
  // whole point. Half of every stroke is thrown away by it, hence the doubled
  // width: RIM.w is quoted as the band that SURVIVES, not the one laid down.
  if (g && RIM.w > 0) {
    ctx.strokeStyle = g.edge;
    if (RIM.inside) {
      ctx.save();
      ctx.clip();
      ctx.lineWidth = ow * RIM.w * 2;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.lineWidth = ow * RIM.w;
      ctx.stroke();
    }
  }
}
// two-pass round-cap stroke: fat outline pass, then the fill pass inside
function limb(ctx, x1, y1, x2, y2, w, fill, ow) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + ow * 2;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
  const g = fieldRamps(ctx);
  if (g) {
    ctx.strokeStyle = g.core; ctx.stroke();
    ctx.strokeStyle = g.lit; ctx.stroke();
  }
}

// Lorenzo's working wrench, anchored at the glove rather than flashed in
// screen space. The open jaw and inset handle survive the 24-unit run rig;
// a tiny rectangle on a yellow stroke did not.
function drawWrench(ctx, x, y, angle, u, ow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const steel = '#a8b0b8', steelHi = '#e5edf2';
  outlined(ctx, steel, hair(0.5, ow * 0.65), (c) =>
    roundRectPath(c, -0.055 * u, -0.026 * u, 0.31 * u, 0.052 * u, 0.022 * u));
  // Open-ended head: two jaws with a clear V-shaped bite between them.
  outlined(ctx, steel, hair(0.5, ow * 0.65), (c) => {
    c.moveTo(0.205 * u, -0.05 * u);
    c.lineTo(0.315 * u, -0.13 * u);
    c.lineTo(0.405 * u, -0.075 * u);
    c.lineTo(0.32 * u, -0.012 * u);
    c.lineTo(0.405 * u, 0.075 * u);
    c.lineTo(0.315 * u, 0.13 * u);
    c.lineTo(0.205 * u, 0.05 * u);
    c.closePath();
  });
  ctx.strokeStyle = steelHi;
  ctx.lineWidth = hair(0.45, ow * 0.45);
  ctx.beginPath();
  ctx.moveTo(0.01 * u, -0.009 * u);
  ctx.lineTo(0.235 * u, -0.009 * u);
  ctx.stroke();
  ctx.restore();
}
// A sidearm held in a hand, anchored at the GRIP the way drawWrench anchors at
// the handle — the hand is the pivot, so the gun can never drift off it when
// the arm re-poses. Drawn as three marks and no more: a grip below the hand, a
// slide running forward from it, and the trigger guard between them. At the
// size a hero is actually seen the guard is the only thing that says "pistol"
// rather than "block", which is why it survives the detail cut and the sight
// does not.
// The carried BAMBOO STICK. Rusty's ranged move is thrown and caught rather
// than fired, so unlike a pistol the prop is not a holstered thing that appears
// for the shot — it is in his hand every frame he is not mid-throw, which is
// what answers "where does the ammunition come from": there is one stick and
// he owns it.
//
// ONE painter for the cane wherever it is: this calls the projectile painter
// rather than redrawing it, so the cut ends, the bore, the node bands and the
// proportions are shared by construction. Written by hand it had drifted to
// 7.4:1 against the thrown version's 2.4:1 — the same prop reading as two
// different objects depending on whether it was in the air.
function drawHeldStick(ctx, x, y, angle, u, ow, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Scaled off `u` (which is the hero's height) so it holds at any render size.
  // u/26 was a quarterstaff and u/30 still read heavy; u/36 is the cane. The
  // projectile must be drawn at the SAME h/36 when the ability is wired, or
  // held and thrown drift apart again.
  //
  // GRIPPED NEAR THE BASE, not the middle: centred on the fist the glove sat
  // over the centre node and covered the very marks that identify the thing.
  // The offset is in the cane's OWN axis (applied after the rotate), so it
  // slides along the stick however the hand is angled. 0.58 rather than 0.72,
  // because at 0.72 the butt end sat closer to the grip than the glove's own
  // radius and the fist swallowed it — this leaves a stub showing above the
  // hand, so it reads as GRIPPED rather than balanced on the knuckles.
  const size = u / 36;
  // `scale` is the long/short alternation from the pouch (caneScale), so the
  // cane in his hand is the one he just pulled and not a generic one.
  drawBambooShoot(ctx, 5.8 * size * 0.58, 0, { size: size * scale });
  ctx.restore();
}

function drawPistol(ctx, x, y, angle, u, ow, p, back = 0) {
  const steel = recede(p.gunmetal || '#4c5360', back);
  const grip = recede(p.gunGrip || p.w || '#6b4324', back);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // The gun has to be TALLER than the arm holding it, or an extended arm and a
  // level barrel are one horizontal bar of similar width and the whole pose
  // reads as a hero holding a stick. A slim arm is 0.068u; grip-plus-slide
  // spans 0.165u here, which is the separation that makes it a held object.
  //
  // Grip: raked back under the hand, the way a pistol grip actually sits.
  outlined(ctx, grip, hair(0.5, ow * 0.6), (c) => {
    c.moveTo(-0.048 * u, -0.008 * u);
    c.lineTo(0.032 * u, -0.008 * u);
    c.lineTo(0.016 * u, 0.095 * u);
    c.lineTo(-0.08 * u, 0.095 * u);
    c.closePath();
  });
  // Slide, running forward over the hand. Its muzzle end is the point every
  // caller wants, so it is stated here as one length rather than dialled twice.
  outlined(ctx, steel, hair(0.5, ow * 0.6), (c) =>
    roundRectPath(c, -0.055 * u, -0.072 * u, 0.245 * u, 0.066 * u, 0.015 * u));
  if (!lodPistol(u)) {
    // Trigger guard: a loop under the slide, ahead of the grip.
    ctx.strokeStyle = steel;
    ctx.lineWidth = hair(0.42, ow * 0.55);
    ctx.beginPath();
    ctx.arc(0.048 * u, 0.008 * u, 0.028 * u, -0.4, Math.PI * 0.95);
    ctx.stroke();
    // Bore: the same translucent ink B-33P's cannon uses, so both barrels on
    // the roster read as the same material.
    dot(ctx, 0.174 * u, -0.04 * u, 0.015 * u, OUTLINE);
  }
  ctx.restore();
}
// The pistol is 0.215u long against a 24u hero — about two pixels in a run.
// Below the size where its guard would be sub-pixel it drops to the solid
// silhouette, which is the same bargain every `lod` branch in this file makes.
const lodPistol = (u) => u < 40;
function dot(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
// analytic 2-bone joint: where the knee/elbow sits between (x1,y1)-(x2,y2);
// dir=+1 bends toward +x, -1 toward -x. Straightens naturally when the
// target is at full reach.
function joint(x1, y1, x2, y2, seg, dir, seg2 = seg) {
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.hypot(dx, dy) || 1e-6;
  // Unequal bones: the joint sits `seg` from the root, `seg2` from the end.
  // `a` is its along-axis distance from the root (law of cosines); equal
  // segments collapse it back to the old midpoint.
  const a = Math.min(seg, Math.max(-seg, (d * d + seg * seg - seg2 * seg2) / (2 * d)));
  const h = Math.sqrt(Math.max(0, seg * seg - a * a));
  return [x1 + (dx / d) * a + (dy / d) * h * dir, y1 + (dy / d) * a + (-dx / d) * h * dir];
}
// two-segment limb (thigh+shin / upper+forearm) with a soft joint bend
// `w2` is the far segment's width, defaulting to `w`. Each pass strokes BOTH
// segments before the color changes, or the second segment's fat outline
// pass paints over the first one's fill. Round caps (set once in drawToon)
// blend the two widths at the joint.
function limb2(ctx, x1, y1, x2, y2, seg, dir, w, fill, ow, w2 = w, flushRoot = false, seg2 = seg, ramps = null, lightOffset = null) {
  const [jx, jy] = joint(x1, y1, x2, y2, seg, dir, seg2);
  // Round caps bulge HALF A STROKE WIDTH past the point they are drawn from.
  // At the wrist and the elbow that is the point — it rounds the hand and
  // blends the two bone widths. At the shoulder it is a ball of limb sticking
  // out beyond the joint, which reads as a stuck-on ball joint the moment the
  // arm roots near the body edge (arms flung out sideways, worst of all).
  // `flushRoot` starts each pass half its OWN width in, so the cap crowns
  // exactly on the root instead of overshooting it. The drawn arm is the same
  // length either way; it just stops overrunning its socket.
  // The OUTLINE pass stops a further `pad` short. Crowned level with the fill
  // it is the wider stroke, so its cap wrapped the root as a dark crescent — a
  // seam across the top of the arm right where the limb should be melting into
  // the shoulder. Inset, the fill's end is left un-outlined and reads as the
  // arm continuing into the body, while the rim still runs the limb's sides.
  const ux = jx - x1, uy = jy - y1, ul = Math.hypot(ux, uy) || 1;
  for (const [pad, col] of [[ow * 2, OUTLINE], [0, fill]]) {
    const back = flushRoot ? (w + pad) / 2 + pad : 0;
    const rx = x1 + (ux / ul) * back, ry = y1 + (uy / ul) * back;
    ctx.strokeStyle = col;
    ctx.lineWidth = w + pad;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    ctx.lineWidth = w2 + pad;
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  const g = ramps || fieldRamps(ctx);
  if (g) {
    // Both bones as ONE path. Stroked segment-by-segment like the passes
    // above, the ramps are translucent and stack where the round caps overlap
    // at the elbow — a dark bead printed on every joint in the cast.
    const back = flushRoot ? w / 2 : 0;
    ctx.beginPath();
    ctx.moveTo(x1 + (ux / ul) * back, y1 + (uy / ul) * back);
    ctx.lineTo(jx, jy);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = (w + w2) / 2;
    // The path already contains the arm's seat transform. Undo that offset
    // only while applying the torso-space light, not while building geometry.
    if (lightOffset) { ctx.save(); ctx.translate(-lightOffset[0], -lightOffset[1]); }
    ctx.strokeStyle = g.core; ctx.stroke();
    ctx.strokeStyle = g.lit; ctx.stroke();
    if (g.spec) { ctx.strokeStyle = g.spec; ctx.stroke(); }
    if (lightOffset) ctx.restore();
  }
}
// Anatomy-styled two-bone arm for the heavy rig. The bones are two-radius
// capsules that PINCH at the elbow and wrist, and the muscle lives in bulge
// ellipses laid over them — a bicep in the middle of the upper arm, a
// forearm swell just past the elbow — instead of in uniformly fat bones,
// which read as sausages. Two color passes (fat outline, then fill) merge
// bones and bulges into one silhouette, the same trick limb2 uses.
function muscleLimb(ctx, x1, y1, x2, y2, segU, segF, dir, fill, ow, d) {
  const [jx, jy] = joint(x1, y1, x2, y2, segU, dir, segF);
  const thU = Math.atan2(jy - y1, jx - x1), thF = Math.atan2(y2 - jy, x2 - jx);
  // Bones and bulges append SUBPATHS and each pass fills once at the end:
  // OUTLINE is translucent, and filling four overlapping shapes one at a
  // time stacks its alpha wherever they overlap — a blotchy, darker rim on
  // the arms than the single-stroke limbs get. One nonzero-winding fill
  // covers every overlap exactly once.
  const cap = (ax, ay, bx, by, ra, rb, th) => {
    ctx.moveTo(ax + Math.cos(th + Math.PI / 2) * ra, ay + Math.sin(th + Math.PI / 2) * ra);
    ctx.arc(ax, ay, ra, th + Math.PI / 2, th - Math.PI / 2);
    ctx.arc(bx, by, rb, th - Math.PI / 2, th + Math.PI / 2);
    ctx.closePath();
  };
  const blob = (bx, by, rl, rc, th) => {
    ctx.moveTo(bx + Math.cos(th) * rl, by + Math.sin(th) * rl);
    ctx.ellipse(bx, by, rl, rc, th, 0, Math.PI * 2);
  };
  // The bulges sit on ONE side of each bone — the side away from the elbow,
  // where the bicep and forearm mass actually live — with their far half
  // buried in the bone so the underside of the arm stays a clean line. A
  // bulge centered on the bone inflates both edges and reads as a lollipop.
  const pxn = -Math.sin(thU), pyn = Math.cos(thU);
  const cmx = (x1 + x2) / 2, cmy = (y1 + y2) / 2;
  const side = pxn * (jx - cmx) + pyn * (jy - cmy);
  // A straight arm puts the elbow ON the chord, so `side` collapses to FP
  // noise and the bulge would re-pick its side every frame — a bicep that
  // flickers top-to-bottom mid-spread. Under a small threshold it defaults
  // to world-UP, where the bicep belongs on an outstretched arm.
  const sgn = Math.abs(side) < segU * 0.08
    ? (pyn > 0 ? -1 : 1)
    : (side > 0 ? -1 : 1);
  const fxn = -Math.sin(thF) * sgn, fyn = Math.cos(thF) * sgn;
  // The shading rides along as two more passes of the same four subpaths: one
  // nonzero fill each, so the bones and their bulges take the ramp exactly
  // once wherever they overlap — the same reason the outline pass is built
  // this way and not stacked shape by shape.
  const g = fieldRamps(ctx);
  const passes = [[ow, SKIN_OUTLINE], [0, fill]];
  if (g) passes.push([0, g.core], [0, g.lit]);
  for (const [pad, col] of passes) {
    ctx.fillStyle = col;
    ctx.beginPath();
    cap(x1, y1, jx, jy, d.shoulderW / 2 + pad, d.elbowW / 2 + pad, thU);
    blob(x1 + (jx - x1) * 0.48 + pxn * sgn * d.bicepR * 0.38,
      y1 + (jy - y1) * 0.48 + pyn * sgn * d.bicepR * 0.38,
      segU * 0.54 + pad, d.bicepR + pad, thU);
    cap(jx, jy, x2, y2, d.elbowW / 2 + pad, d.wristW / 2 + pad, thF);
    blob(jx + (x2 - jx) * 0.34 + fxn * d.foreR * 0.34,
      jy + (y2 - jy) * 0.34 + fyn * d.foreR * 0.34,
      segF * 0.44 + pad, d.foreR + pad, thF);
    ctx.fill();
  }
  if (d.separate > 0.01 && d.shoulderW > 2.6) {
    // Re-establish the forearm as the nearer form during the acute curl. This
    // reuses the exact same geometry — no silhouette or proportion change —
    // but gives that segment its own restrained outline and a small depth step.
    // Without it, the union-fill above necessarily turns the folded arm into
    // one uninterrupted skin island, exactly as the gallery screenshot showed.
    ctx.save();
    ctx.globalAlpha *= d.separate;
    for (const [pad, col] of [
      [ow * 0.72, SKIN_OUTLINE],
      [0, recede(fill, 0.075)],
    ]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      cap(jx, jy, x2, y2, d.elbowW / 2 + pad, d.wristW / 2 + pad, thF);
      blob(jx + (x2 - jx) * 0.34 + fxn * d.foreR * 0.34,
        jy + (y2 - jy) * 0.34 + fyn * d.foreR * 0.34,
        segF * 0.44 + pad, d.foreR + pad, thF);
      ctx.fill();
    }
    ctx.restore();
  }
  if (d.crease > 0.01 && d.shoulderW > 2.6) {
    // A short anatomical separation on the exposed bicep side. In a hard curl
    // the forearm overlaps the bulge's outer silhouette, and because all four
    // muscle shapes union-fill above there is otherwise no boundary left to
    // describe the contraction. Keep it off the 18u minimum, where this would
    // collapse into a dark pixel rather than a crease.
    const ax = x1 + (jx - x1) * 0.56 + pxn * sgn * d.bicepR * 0.28;
    const ay = y1 + (jy - y1) * 0.56 + pyn * sgn * d.bicepR * 0.28;
    const bx = x1 + (jx - x1) * 0.77 + pxn * sgn * d.elbowW * 0.12;
    const by = y1 + (jy - y1) * 0.77 + pyn * sgn * d.elbowW * 0.12;
    ctx.save();
    ctx.globalAlpha *= 0.42 * d.crease;
    ctx.strokeStyle = SKIN_OUTLINE;
    ctx.lineWidth = hair(0.45, ow * 0.52);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(
      (ax + bx) / 2 + pxn * sgn * d.bicepR * 0.14,
      (ay + by) / 2 + pyn * sgn * d.bicepR * 0.14,
      bx, by,
    );
    ctx.stroke();
    ctx.restore();
  }
}
// running foot path: backward along the ground during stance, lifting
// forward during swing (p in cycles; returns [x, y] with ground at y=0)
function gaitFoot(p, stride, lift) {
  const th = p * Math.PI * 2;
  return [Math.cos(th) * stride, -Math.max(0, -Math.sin(th)) * lift];
}

// Softer variant for Ray M'N's disconnected shoes. Squaring the lift curve
// gives it zero velocity at takeoff/landing, avoiding a visible pop.
function floatingFoot(p, stride, lift) {
  const th = p * Math.PI * 2;
  const airborne = Math.max(0, -Math.sin(th));
  return [Math.cos(th) * stride, -(airborne * airborne) * lift];
}

// The styled foot path (see LOCO). gaitFoot runs the foot on a symmetric
// ellipse, so its lift peaks mid-air at full leg extension — the leg scissors
// instead of the knee coming up. This splits the cycle into a CONTACT pass,
// sole flat on the ground for `contact` of the cycle, and a RECOVERY arc whose
// lift is skewed EARLY so the knee folds up under the hip. That skew is the
// single change that makes the cycle read as a run rather than a stride.
//
// Third return value is ANKLE ROTATION, which gaitFoot has no concept of: the
// shoes were un-rotated ellipses, so there was neither a heel strike nor a
// toe-off. The (1 - e*e) on the toe term HOLDS the toe-off angle through early
// recovery instead of unwinding it linearly, so the shoe stays angled back and
// down as it leaves the ground.
// The ankle's own curve, split out from the path the foot travels because a
// hero can want one without the other: fernwick keeps her shipped leg swing
// and takes only the heel strike and the toe-off. `contact` lines the roll up
// with whichever path is underneath — 0.5 matches gaitFoot's stance, which
// runs from q 0 to 0.5 with the sole flat.
function ankleRoll(p, L) {
  const q = (p % 1 + 1) % 1;
  if (q < L.contact) {
    const t = q / L.contact;
    return -L.heel * (1 - t) + L.toe * t * t;
  }
  const t = (q - L.contact) / (1 - L.contact);
  const e = t * t * (3 - 2 * t);
  return L.toe * (1 - e * e) - L.heel * e * e;
}
function locoFoot(p, stride, lift, L) {
  const q = (p % 1 + 1) % 1;
  const cf = L.contact;
  if (q < cf) return [stride * (1 - 2 * (q / cf)), 0, ankleRoll(q, L)];
  const t = (q - cf) / (1 - cf);
  const e = t * t * (3 - 2 * t);
  return [
    -stride + 2 * stride * e,
    -Math.sin(Math.pow(t, L.skew) * Math.PI) * lift,
    ankleRoll(q, L),
  ];
}

// ---------------------------------------------------------------- faces
const FACE_SEED = { lorenzo: 0.2, gnash: 1.1, fernwick: 2.4, b33p: 3.2, mochi: 4.1, chompo: 5.3, gary: 0.8, raymn: 2.9, grumpos: 4.7, dolores: 1.7, kiko: 1.9, clara: 2.7 };

// ------------------------------------------------------ victory routines
// The results screen holds for a while, so a single looping wiggle reads as a
// freeze-frame. Every hero runs a two-beat routine instead: their own bouncy
// signature, then a bigger move (hop / turn / bow / shimmy). Cycles are offset
// per hero by the face seed so the line-up looks like a crowd rather than one
// animation played nine times.
const CELEBRATE_MOVE = {
  lorenzo: 'hop', gnash: 'spin', fernwick: 'spin', b33p: 'shimmy', mochi: 'hop',
  chompo: 'spin', gary: 'bow', raymn: 'shimmy', grumpos: 'flex', dolores: 'hips',
  // Kiko does not celebrate, she stands down. `bow` is the only move in the set
  // that is a held posture rather than a wiggle, which is the whole reading:
  // everyone else is delighted and she is filing it.
  kiko: 'bow',
  // Clara celebrates the way her serial would print it: the triumphant leap.
  // (Legacy only — the reworked routine gives her a 'twostep' instead, see
  // proposedMove in celebrateMotion. The leap was fine; the arms it came with
  // were not, and a hop with the fists overhead is exactly the shape her head
  // cannot carry.)
  clara: 'hop',
};
// How high the signature bounce carries each hero. The light ones leave the
// floor; Grumpos and the robot mostly rock in place.
// (default 0.055). Kiko sits under it deliberately: she is athletic enough to
// leave the floor and the point is that she does not.
// Clara sits near the top on purpose: the cliffhanger jump is her whole
// passive, so her victory bounce actually leaves the floor.
const CELEBRATE_BOUNCE = { mochi: 0.15, chompo: 0.11, clara: 0.12, lorenzo: 0.09, raymn: 0.07, grumpos: 0.03, b33p: 0.035, kiko: 0.04 };
const CEL_CYCLE = 2.6, CEL_SIG = 0.6; // seconds per loop; fraction on the signature
// One-switch rollback for the shipped celebration redesign. Callers normally
// omit celebrateStyle and inherit this value; the gallery's before column asks
// for `legacy` explicitly so the approved A/B remains available for reference.
export const ACTIVE_CELEBRATION_STYLE = 'reworked';
const usesReworkedCelebration = (pose) =>
  (pose && pose.celebrateStyle ? pose.celebrateStyle : ACTIVE_CELEBRATION_STYLE) === 'reworked';

// Jump/slide motion has the same one-switch escape hatch as celebrations. The
// gallery requests `legacy` explicitly for its A/B; ordinary callers omit the
// field and receive the approved motion. Geometry and standing proportions are
// untouched — this only changes pose targets while airborne or crouching.
export const ACTIVE_LOCOMOTION_STYLE = 'enhanced';
const usesEnhancedLocomotion = (pose) =>
  (pose && pose.motionStyle ? pose.motionStyle : ACTIVE_LOCOMOTION_STYLE) === 'enhanced';

// ---- gait ---------------------------------------------------------------
// How far each foot travels along the ground and how high it clears it, both
// as fractions of leg length so a short hero and a tall one walk the same
// walk. The heavy variants are Grumpos: he plants rather than reaches, and a
// full-length stride on that mass reads as a scurry.
const STRIDE_RUN = 0.55;
const STRIDE_RUN_HEAVY = 0.36;
const LIFT_RUN = 0.5;
const LIFT_RUN_HEAVY = 0.3;

// ---- limb style ---------------------------------------------------------
// The gait above says how FAR a foot travels. This says how it travels, and
// it is the one place the shared humanoid painter is allowed to differ per
// hero: knee fold, foot roll, hip depth, the shape of the bob. Every value is
// a multiplier on, or an addition to, the shipped rig — a hero with no style
// resolves to null and renders bit-identical to the old painter.
//
// Same one-switch rollback as the celebration and locomotion styles above:
// set this to 'legacy' and the whole cast reverts, while the gallery can still
// ask for a named style (or 'legacy') per pose for its A/B columns.
export const ACTIVE_LIMB_STYLE = 'snap';
const LOCO = {
  // Lorenzo's, and the reference every other entry is a retreat from. These
  // thirteen numbers are the reviewed spec verbatim; armLag / jumpSeg / ankle
  // are the same spec's implicit values pulled out so the tiers below have
  // somewhere to sit, and at these settings they reproduce it exactly.
  snap: {
    stride: 1.15, lift: 1, contact: 0.46, skew: 0.58, toe: 0.84, heel: 0.28,
    seg: 1, hold: 0.66, holdAt: 0.35, bob: 1.15, bobShape: 1.5, knee: 1, legLen: 1, hipSplit: 0.035,
    // thigh 0.46: chosen BY EYE against the bake-off strip, overruling the
    // anatomical rung (0.54) the chair metric preferred. The short thigh keeps
    // the visible upper-leg segment compact — the very first note against this
    // port was the thigh reading long — and its high peak (111deg vs 97
    // shipped) lands in the TUCK, where the shin trails back and the pose
    // reads as knee-lift, not lap; the chair count itself stays on shipped's
    // own 8/32. It is also the cleanest rung on the knee-under-shoe artifact:
    // 1 frame at a third of shipped's depth. Push it no lower — 0.42 measured
    // 10/32 with the thigh whipping to 126deg.
    // stance 1.085 / extend 0.97: the run rode LOW — mean leg extension had
    // fallen to 0.537 against shipped's 0.620, so the knee was folded through
    // the whole cycle and the near hip sat 0.012u under shipped's besides.
    // Raising the hip lengthens the hip-to-ankle span against unchanged bones,
    // which straightens the leg and lifts the body in one move. `extend` had
    // to come up with it: at 0.9 the guard simply GREW the bones to hold
    // extension where it was, cancelling the lift — it was doing its job and
    // defeating the point. At 0.97 the hip clears shipped's own height and
    // mean extension lands on 0.602 against 0.620. The cost is a torso 0.021u
    // shorter, since the shoulders do not move when the hip rises: this rig
    // buys leg from body, and that trade is the whole reason the dial is
    // narrow. Do not push past ~1.10.
    armLag: 0.125, jumpSeg: 0.46, ankle: 1, extend: 0.97, hipDepth: 2, thigh: 0.46, stance: 1.085,
  },
  // The first cut of the port, kept ONLY so the gallery can show what the
  // geometry change fixed. Its stride, lift and leg length ran 34/38/12 percent
  // over shipped while seg took 24 percent off the bones, so the extension cap
  // had to lengthen the thigh 17.5% to stop the shin stretching — and a long
  // thigh plus a wide hip split swung it past horizontal for six frames of
  // eight, with the knee above the hip at 6/8. That is a figure sitting down.
  snapWide: {
    stride: 1.34, lift: 1.38, contact: 0.46, skew: 0.58, toe: 0.84, heel: 0.28,
    seg: 0.76, hold: 0.66, bob: 1.15, bobShape: 1.5, knee: 1, legLen: 1.12, hipSplit: 0.052,
    armLag: 0.125, jumpSeg: 0.46, ankle: 1, extend: 0.9, hipDepth: 1,
  },
  // Fernwick: the shipped leg swing, and only the shipped leg swing. Every
  // gait term below is neutral, `path` sends her back down gaitFoot, and what
  // she keeps from the port is the FOOT — a real heel strike and toe-off in
  // place of a flat oval — plus the rebuilt jump and the arm timing, neither
  // of which is a leg. contact 0.5 because that is where gaitFoot's stance
  // ends; at the spec's 0.46 the roll would unwind against her own footfall.
  tunic: {
    stride: 1, lift: 1, contact: 0.6, skew: 0.58, toe: 0.72, heel: 0.24,
    seg: 1, hold: 1, bob: 1, bobShape: 1, knee: 1, legLen: 1, hipSplit: 0,
    armLag: 0.125, jumpSeg: 0.44, ankle: 1, extend: 1, hipDepth: 0, path: 'gait',
  },
  // Grumpos, and the measurement that decided it: his battle-skirt hem sits at
  // -0.1800u and his shipped knee's lowest point across the cycle is -0.1800u.
  // The leather was cut to that knee. Any change to his leg geometry either
  // lengthens the bone and puts the joint THROUGH the hem — the exact failure
  // his own skirt comment warns about — or keeps the bone short and stretches
  // the shin instead. There is no third option and no room to trade, so he
  // takes the same deal fernwick does: shipped legs, new foot, new jump. The
  // roll is damped hardest of anyone because his boots are a slab, not a shoe.
  heavy: {
    stride: 1, lift: 1, contact: 0.6, skew: 0.7, toe: 0.46, heel: 0.2,
    seg: 1, hold: 1, bob: 1, bobShape: 1, knee: 1, legLen: 1, hipSplit: 0,
    armLag: 0.125, jumpSeg: 0.42, ankle: 0.66, extend: 1, hipDepth: 0, path: 'gait',
  },
  // Damped hard against the humanoids' 0.84: his shoe is nearly twice as long
  // as theirs and floats free, so the same angle swings its far edge a
  // measured 0.029u below the standing sole — a shoe cutting into the floor
  // with no leg to explain why. At 0.42 the deepest frame sits within 0.008u
  // of where he already stands.
  float: {
    contact: 0.46, skew: 0.58, toe: 0.42, heel: 0.18, ankle: 0.82,
  },
};
// Every style is completed against a neutral before anything reads it. `float`
// carries only the four terms a legless rig can consume, and limbStyle is a
// POSE field as well as a spec one — so a gallery column, or any future caller,
// can hand a partial style to the humanoid painter. A missing key there is not
// a fallback, it is `legL * undefined`: NaN geometry, silently, on one hero.
// The neutral is the shipped rig, so completing an entry can never move it.
const LOCO_NEUTRAL = {
  stride: 1, lift: 1, contact: 0.5, skew: 1, toe: 0, heel: 0,
  seg: 1, hold: 1, bob: 1, bobShape: 1, knee: 1, legLen: 1, hipSplit: 0,
  armLag: 0, jumpSeg: 0.46, ankle: 1, extend: 1, hipDepth: 0, lean: 1, holdAt: 0, thigh: 0.5, stance: 1, path: 'loco',
};
for (const key of Object.keys(LOCO)) LOCO[key] = Object.freeze({ ...LOCO_NEUTRAL, ...LOCO[key] });
// null for anyone without a style, which is what gates every branch below.
// The pose wins over the spec so a gallery column can ask for 'legacy'.
const locoStyle = (spec, pose) => {
  const key = (pose && pose.limbStyle)
    || (ACTIVE_LIMB_STYLE === 'legacy' ? null : (spec && spec.limbStyle));
  return (key && LOCO[key]) || null;
};
// Odd-symmetric power curve. k < 1 pushes a value toward its extremes, so a
// clock shaped by it lingers at the ends and snaps through the middle.
const shaped = (v, k) => (k === 1 ? v : (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), k));
// The styled gait clock. `hold` shapes the cycle about its midpoint, so the
// foot sits at the front of the stride and whips through the swing rather than
// sweeping round at a constant rate. Both legs go through the same map, so
// they stay exact half-cycle copies of each other.
const gaitPhase = (p, L) => {
  if (!L || L.hold === 1) return p;
  // holdAt rotates WHERE the clock lingers. The power curve dwells at its two
  // extremes and whips through its middle, and with no offset the dwell lands
  // on the contact onset — which is the one pose in the cycle where the thigh
  // is up with the shin plumb under it, i.e. a figure in a chair. Anchored at
  // 0.25 the dwell moves to mid-stance and the mid-recovery tuck, both real
  // running shapes, and the snap happens THROUGH the plant instead of on it.
  const a = L.holdAt || 0;
  const q = ((p - a) % 1 + 1) % 1;
  return ((shaped(q * 2 - 1, L.hold) + 1) / 2 + a) % 1;
};

// ---- squash and stretch -------------------------------------------------
// Velocity stretches the moving figure, but much less than the legacy 18%
// pull: the limbs carry the jump's story, so the whole body should only
// breathe with their momentum rather than turn rubbery in free fall. The
// reference is the speed at which the stretch reaches full — it wants to be
// near player.js's terminal fall so a long drop arrives at the maximum.
const AIR_STRETCH_Y = 0.095;
const AIR_STRETCH_X = 0.052;
const AIR_STRETCH_VY_REF = 520;
// Landing squash: the arrival flattens and widens for the length of the
// controller's landing timer.
const LAND_SQUASH_Y = 0.28;
const LAND_SQUASH_X = 0.32;
// Must equal LANDED_T in src/game/player.js, which is what actually counts the
// timer down. Deliberately NOT imported: src/sprites does not reach into
// src/game. If they drift, the squash blend runs past the end of its clock —
// tests/tunables.js asserts the two literals agree.
const SQUASH_T = 0.12;

// Title-parade personality beats are a public rendering contract, just like
// gameplay poses. Keeping their pose inputs here lets the title and gallery use
// the exact same choreography instead of maintaining two lookalike lists.
export const TITLE_PARADE_ACTIONS = Object.freeze({
  lorenzo: 'compact wave',
  gnash: 'running hop',
  fernwick: 'longbow draw',
  b33p: 'cannon aim',
  mochi: 'float and squish',
  raymn: 'rocket-fist toss',
  grumpos: 'menu flex',
  kiko: 'warning shot',
  clara: 'pistol draw',
});

export function titleParadeAction(id, time, progress) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const lift = Math.sin(p * Math.PI);
  const patch = {};
  let feetLift = 0; // fraction of the toon draw height
  if (id === 'lorenzo') { patch.menuAction = 'wave'; feetLift = lift * 3 / 26; }
  if (id === 'gnash') {
    patch.kind = 'jump'; patch.grounded = false;
    feetLift = Math.abs(Math.sin(p * Math.PI * 2)) * 7 / 26;
  }
  // Held at full draw — the frame of the bow that reads.
  if (id === 'fernwick') { patch.menuAction = 'aim'; patch.actionTime = BOW_REACH_T + 0.13; }
  if (id === 'b33p') { patch.squash = lift * 0.35; patch.menuAction = 'aim'; }
  if (id === 'mochi') {
    patch.float = true;
    patch.squash = Math.max(0, Math.sin(p * Math.PI * 2)) * 0.22;
    feetLift = lift * 8 / 26;
  }
  if (id === 'chompo') { patch.menuAction = 'chomp'; feetLift = lift * 2 / 26; }
  if (id === 'raymn') {
    patch.headless = p > 0.18 && p < 0.78;
    // Ray's detached glove orbits because this is a menu pose. It is a
    // rocket-fist toss, not a wave; the old unused `menuAction = wave` label
    // made the title choreography sound like something it never rendered.
  }
  if (id === 'grumpos') { patch.menuAction = 'flex'; patch.squash = lift * 0.12; }
  // `aim` on a kiblast spec is her own palms-forward stance, not B-33P's cannon
  // (see the kiblast branch in drawArms). She plants rather than bounces: a
  // shallow squash and no feetLift, where B-33P's is 0.35 and Gnash leaves the
  // floor entirely.
  if (id === 'kiko') { patch.menuAction = 'aim'; patch.squash = lift * 0.1; }
  // `aim` on a pistol spec draws the gun from the thigh rig (drawArms' pistol
  // branch). A small hop under it: the pose her serial's cover would print —
  // airborne, pistol out — at a fraction of Gnash's height so the beat reads
  // as a draw with flair rather than a second jumping hero.
  if (id === 'clara') { patch.menuAction = 'aim'; feetLift = lift * 4 / 26; }
  return { pose: patch, feetLift };
}

export function transitionCameoAction(id) {
  const patch = {};
  if (id === 'lorenzo' || id === 'fernwick') patch.menuAction = 'wave';
  if (id === 'gnash') { patch.kind = 'jump'; patch.grounded = false; }
  if (id === 'b33p') patch.menuAction = 'aim';
  if (id === 'mochi') patch.float = true;
  if (id === 'chompo') patch.menuAction = 'chomp';
  if (id === 'grumpos') patch.menuAction = 'flex';
  if (id === 'kiko') patch.menuAction = 'aim';
  if (id === 'clara') patch.menuAction = 'aim';
  return patch;
}

export const B33P_TITLE_WINDUP_T = 0.18;
export function b33pTitleShotPose(age) {
  const t = Math.max(0, Number(age) || 0);
  const raw = Math.max(0, Math.min(1, t / B33P_TITLE_WINDUP_T));
  const aimAmount = raw * raw * (3 - 2 * raw);
  const shotFired = t >= B33P_TITLE_WINDUP_T;
  return {
    menuAction: 'aim',
    aimAmount,
    shotFired,
    actionTime: shotFired ? t - B33P_TITLE_WINDUP_T : 0,
    squash: Math.sin(Math.min(1, t / 0.4) * Math.PI) * 0.35,
  };
}

// ------------------------------------------------------------------- clinging
//
// The pole ride at the end of a stage. Before this the descent borrowed the JUMP
// pose, which is a hero with nothing to hold: he read as falling past the pole
// rather than coming down it, and the one moment the whole finish marker was
// built around was the one moment the hero was not acting on it.
//
// A cling is THE IDLE POSE with one arm extended to the pole, and a smile. That
// is the whole specification, and it is short on purpose: three earlier cuts of
// this pose each invented their own body — a tuck, a lean, a bowed knee, a
// stance, a dangling counterweight arm, bones stretched to 2.4x — and every
// invention was a way of not being the pose it claimed to be quoting. The
// hero's idle is already a finished, front-on, legible drawing that the player
// has watched for hours. It does not need help; it needs one arm moved.
//
// Which arm: the one on the pole's side, the BACK one at this rig's default
// yaw. It reaches OUT and slightly up, at the end of a real unstretched arm,
// and lands on the column. Nothing else in the figure changes — not the other
// arm, not the legs, not the breathing.
//
// The single knob:
//   gripUp  0..1 of the height available to a straight arm once the run out to
//           the pole is paid for. 1 is as high as he can reach with the elbow
//           locked; lower values bend the elbow and slide the hand down the
//           pole. The hand is always ON the pole — its x is not negotiable —
//           so this is the only choice the pose has left to make.
//
// PLAYABLE HEROES ONLY. Gary and Dolores work the shop and the serving line —
// neither of them will ever run a stage, so neither will ever touch a finish
// marker, and a bespoke pole ride for them would be a tuning pass nobody can
// reach. They fall through to the default.
const CLING_DEFAULT = { gripUp: 0.9 };
const CLING = {
  // A plumber's commute: he has done this before and he is not thinking about
  // it, so he reaches without straightening the elbow.
  lorenzo: { gripUp: 0.86 },
  // Showing off — the highest reach in the cast, arm locked out.
  gnash:   { gripUp: 1.0 },
  // Terrified and tidy: holding the pole rather than riding it, so the hand
  // comes in low and the elbow stays folded.
  fernwick:{ gripUp: 0.62 },
  // A machine on a rail. Straight arm, level as a gantry.
  b33p:    { gripUp: 0.95 },
  // The heavy rig's arm is half again as long and cannot reach as high
  // proportionally; a bear's grab, not a gymnast's.
  grumpos: { gripUp: 0.72 },
};
// How bent the legs are on the ride, as the celebrate hop's `air` term (1 is
// the hop's full mid-air tuck). TOP is the catch — barely off the idle hang, a
// hero who has just taken hold — and the bend deepens to CLING_TUCK as the cap
// comes up, which is a person gathering their legs to meet the ground. Shared
// across the cast: the ride's character lives in the grip (CLING) and the
// smile, not in eight different knee angles nobody could tell apart at 24px.
const CLING_TUCK_TOP = 0.15;
const CLING_TUCK = 0.6;
// The exotic rigs have no hands to grip with, so their cling is a whole-body
// answer, applied in drawToon and read again inside each painter:
//   squeeze  vertical stretch, as a fraction — the body elongates along the pole
//   grab     0..1 of "limbs up and gathered at the top", whatever that rig's
//            limbs happen to be (Mochi's nubs, Raymn's fins)
//   tilt     radians of lean, for the rigs that ride the pole side-on
const CLING_RIG = {
  // Mochi is not here either. She has no ARMS, but she has hands — the two nubs
  // are hands, and a hand with no arm behind it can still close on a pole; it
  // just cannot bend an elbow on the way, which is a constraint on the PATH and
  // not on the grip. So she reaches like the cast does, one nub out to the
  // column. See drawPika.
  //
  // No arms and no legs — he has teeth. Chompo bites the pole and rides down
  // hanging off his own jaw, which is the only cling in the cast that is also
  // a threat. Tilted, because a disc gripping with its mouth cannot be level.
  chompo: { squeeze: 0.06, grab: 0, tilt: -0.22 },
  // Raymn is NOT here, and that is the point. His gloves float, but a floating
  // glove is still a hand: it can close on a pole exactly like the rest of the
  // cast's, and his body can hang off it in the same place, over the cap. He
  // therefore takes the humanoid grip — one hand out to the column, everything
  // else left alone — rather than the whole-body squeeze the genuinely handless
  // rigs need. See drawRay.
};
// How much of the pole ride the run has asked for, 0..1.
function clingAmount(pose) {
  return Math.max(0, Math.min(1, Number(pose && pose.cling) || 0));
}
// How far into it the FIGURE is. The BODY is a switch, not a blend — he is
// either standing beside the pole or he is airborne, and a body halfway between
// a jump pose and an idle is neither of them — so it cuts at the ramp's
// midpoint, which is the frame he catches. Everything that has to TRAVEL (the
// step aside, the arm going out to the pole) runs on the half of the ramp after
// that cut, so the reach is a gesture the eye can follow rather than a hand
// teleporting onto a stick.
function clingSettle(pose) {
  return Math.max(0, Math.min(1, (clingAmount(pose) - 0.5) / 0.25));
}
// Where the pole stands in the hero's own space while he is on it, as a
// fraction of draw height. He does NOT ride it down the middle: centred, the
// arm runs up the centre line and crosses his own face, and a body-coloured
// limb over a 6px head merges into a slab with a hat on it — the pose loses its
// face, which is the most expressive thing the rig has. Beside it, the face is
// clear, the arm is out in silhouette against open sky, and the shape reads as
// a hero holding something at arm's length above him.
//
// Sized to a REAL ARM, which is the only thing that sets it now that the pose
// is the idle plus a reach. The light rigs socket the shoulder about 0.12u out
// and own 0.286u of arm; leaving 0.21u of that to the horizontal run puts the
// column here and keeps two thirds of the reach available as height, so the arm
// goes out AND up and the elbow still has something to bend. Pushed further out
// — 0.42 was tried — the horizontal run eats the whole arm, the solver has no
// vertical left to give, and every hero reaches the pole along a dead-flat bar
// with the elbow locked, which is the one shape an arm cannot make.
//
// THE POLE MOVES, NOT THE HERO. The first cut had it the other way round — a
// drawing offset that stepped the figure aside for the ride — and the cost only
// showed at the end of it: the plunger is what he lands on, the plunger was
// centred on the pole, so a hero who rode down beside the pole had to slide
// back across onto the cap before he could celebrate. The marker wears the
// offset instead: its mast stands this far RIGHT of its plunger, which puts the
// hero on the cap he is going to land on for the whole descent, already centred
// and already facing front when the celebration takes over. See POLE_STANDOFF
// in finishMarker.js, which is this number in the marker's own pixels.
//
// 7/24 rather than a round decimal, because 24 is the hero's draw height and 7
// is where the plunger's right anchor bolt sits: at exactly this reach the mast
// comes down through its own rivet and the pole and the base read as one bolted
// assembly instead of two objects standing near each other. It was 0.33, which
// landed the mast a pixel outboard of the bolt and hard against the edge of the
// flange — close enough to look like a mistake rather than a join. The bolt is
// drawn AT the mast (see plunger()), so the two cannot drift apart again; this
// fraction is what decides where both of them go.
export const CLING_POLE_X = 7 / 24;
// Half the idle stance: how far out from centre a standing foot plants, as a
// fraction of draw height. The cling measures its own stance against this, so
// "how far apart are his feet on the pole" is answered in the units of the pose
// everyone already knows the hero by.
const STAND_FOOT_X = 0.105;
// How far the airborne lead foot sits below the shipped tuck, in leg-lengths,
// for a hero whose spec does not set `jumpKneeDrop` itself. See the jump branch
// of the leg solve for why zero read as a thigh from the groin.
const JUMP_KNEE_DROP = 0.14;

// `moveOverride` lets a SPEC name its move. Until now the move came only from
// the id tables, which is fine for the cast and useless for a candidate — an
// unregistered id fell through to 'hop' with no way to ask for anything else.
function celebrateMotion(id, t, reworked = false, moveOverride = null) {
  const seed = FACE_SEED[id] || 0;
  // Grumpos's three-pose routine needs room for two equal hero holds. Every
  // other celebration retains the shared 2.6s cadence.
  const cycleLength = reworked && id === 'grumpos' ? 3.4 : CEL_CYCLE;
  const c = ((t + seed * 0.4) % cycleLength) / cycleLength;
  const amp = CELEBRATE_BOUNCE[id] != null ? CELEBRATE_BOUNCE[id] : 0.055;
  const m = { lift: 0, x: 0, tilt: 0, spin: 1, squash: 0, hunch: 0, peak: false, move: null, q: 0, cycle: c };
  // Full-cycle reworked routines. Mochi's body/ears/face share these two
  // hop arcs; Chompo gets two staged bites without ever flattening into the
  // generic card-spin. The gallery can still request the legacy path above.
  if (reworked && id === 'mochi') {
    const arc = Math.abs(Math.sin(c * Math.PI * 2));
    m.move = 'synchop'; m.q = c; m.lift = arc * 0.15;
    m.squash = Math.max(0, 0.22 - arc) * 0.8; m.peak = arc > 0.72;
    return m;
  }
  if (reworked && id === 'chompo') {
    const bite = biteWave(c * 2);
    const phase = (c * 2) % 1;
    const smooth = (v) => {
      const n = Math.max(0, Math.min(1, v));
      return n * n * (3 - 2 * n);
    };
    // Pull away from the mouth direction, lunge through the open bite, then
    // recoil to centre. The old candidate changed only the jaw and looked idle
    // under her hair; this gives the bite a readable whole-body verb.
    const pull = phase < 0.2 ? smooth(phase / 0.2)
      : phase < 0.34 ? 1 - smooth((phase - 0.2) / 0.14) : 0;
    const lunge = phase < 0.2 ? 0
      : phase < 0.48 ? smooth((phase - 0.2) / 0.28)
        : phase < 0.76 ? 1 - smooth((phase - 0.48) / 0.28) : 0;
    const satisfied = phase > 0.73 && phase < 0.98
      ? Math.sin((phase - 0.73) / 0.25 * Math.PI) : 0;
    m.move = 'bite'; m.q = c;
    m.x = -pull * 0.07 + lunge * 0.09;
    m.lift = bite * 0.025 + satisfied * 0.1;
    m.squash = pull * 0.18 + (1 - bite) * 0.06;
    m.tilt = -pull * 0.06 + lunge * 0.045;
    m.peak = bite > 0.82 || satisfied > 0.7;
    return m;
  }
  if (reworked && id === 'raymn') {
    // His detached gloves carry the whole routine: rise, high-five, separate,
    // then hold one clean victory fist. A tiny body lift lands on the impact.
    const impact = c >= 0.18 && c < 0.36
      ? Math.sin((c - 0.18) / 0.18 * Math.PI) : 0;
    m.move = 'gloves'; m.q = c;
    m.lift = impact * 0.055;
    m.squash = Math.max(0, 0.12 - impact) * 0.45;
    m.peak = impact > 0.65 || (c >= 0.5 && c < 0.82);
    return m;
  }
  if (c < CEL_SIG) {
    const b = Math.sin(c * cycleLength * 6);
    m.lift = Math.abs(b) * amp;
    m.tilt = Math.sin(c * cycleLength * 3) * 0.06;
    m.squash = Math.max(0, -b) * 0.25;      // land into a knee-bend, then spring
    m.peak = b > 0.3;
    return m;
  }
  const q = (c - CEL_SIG) / (1 - CEL_SIG);  // 0..1 through the big move
  const proposedMove = reworked ? {
    gnash: 'stepturn', fernwick: 'present', b33p: 'salute', clara: 'twostep',
  }[id] : null;
  // `present` IS the shield plant — the raised disc comes down and is planted
  // in front of her. With a quiver on her back there is no disc, so the move
  // was miming a prop she does not carry: both hands closing on nothing at
  // chest height. An archer takes the two-step instead, which is arms-out and
  // needs no prop at all.
  const shieldless = id === 'fernwick' && TOON_SPECS[id]?.back !== 'shield';
  const move = moveOverride || (shieldless && proposedMove === 'present' ? 'twostep' : proposedMove) || CELEBRATE_MOVE[id] || 'hop';
  m.move = move; m.q = q;
  if (move === 'spin') {
    m.lift = Math.sin(q * Math.PI) * 0.17;
    m.spin = Math.cos(q * Math.PI * 2);     // squeeze through zero: a flat turn
    m.peak = true;
  } else if (move === 'hips') {
    // Hands planted on the hips, proud: two small satisfied bobs — a downward
    // press and a slight nod — rather than a bounce. No lift; her weight stays
    // on the counter side of things. Peaks on the presses so the grin lands then.
    const hit = Math.abs(Math.sin(q * Math.PI * 2));
    m.squash = hit * 0.07; m.tilt = Math.sin(q * Math.PI * 2) * 0.045;
    m.lift = 0; m.peak = hit > 0.62;
  } else if (move === 'bow') {
    const d = Math.sin(q * Math.PI);
    m.tilt = d * 0.26; m.x = d * 0.05; m.squash = d * 0.3; m.peak = d < 0.5;
  } else if (move === 'shimmy') {
    const w = Math.sin(q * Math.PI * 8);
    m.x = w * 0.06; m.tilt = Math.sin(q * Math.PI * 8 + 1) * 0.1;
    m.lift = Math.abs(w) * 0.05; m.peak = true;
  } else if (move === 'flex') {
    // Posing, not dancing: two hits, each dropping into its stance and held.
    // No lift — feet stay planted, which is what sells it as a pose routine.
    const hit = Math.abs(Math.sin(q * Math.PI * 2));
    m.squash = Math.max(0, 0.4 - hit) * 0.8;
    m.tilt = (q < 0.5 ? -1 : 1) * 0.05 * Math.min(1, hit * 3);
    m.peak = hit > 0.82;                      // only while a pose is held
  } else if (move === 'stepturn') {
    // A planted cocky step rather than the shared paper-thin spin. The actual
    // torso yaw is consumed by drawHumanoid; this supplies the weight shift.
    const step = Math.sin(q * Math.PI * 2);
    m.x = step * 0.055; m.tilt = -step * 0.07;
    m.lift = Math.sin(q * Math.PI) * 0.045; m.peak = q > 0.38 && q < 0.7;
  } else if (move === 'present') {
    const hit = Math.sin(q * Math.PI);
    m.x = hit * 0.025; m.tilt = -hit * 0.045;
    m.squash = (1 - hit) * 0.08; m.peak = q > 0.32 && q < 0.78;
  } else if (move === 'salute') {
    const hit = Math.sin(q * Math.PI);
    m.lift = hit * 0.025; m.tilt = Math.sin(q * Math.PI * 2) * 0.025;
    m.peak = q > 0.18 && q < 0.86;
  } else if (move === 'twostep') {
    // A LITTLE DANCE, not a second hop. Two steps side to side: the weight
    // goes out, the body tips INTO the step, and a small bob per half-step
    // keeps it from reading as a slide. The sway is the verb here, so the
    // amplitudes sit the other way round from `hop` — wide and low, not
    // narrow and airborne.
    const sway = Math.sin(q * Math.PI * 2);
    const bob = Math.abs(Math.sin(q * Math.PI * 4));
    m.x = sway * 0.08; m.tilt = sway * 0.07;
    m.lift = bob * 0.06; m.squash = Math.max(0, 0.3 - bob) * 0.35;
    m.peak = true;
  } else if (move === 'gloves') {
    const hit = Math.sin(q * Math.PI);
    m.lift = hit * 0.035; m.tilt = -Math.sin(q * Math.PI * 2) * 0.025;
    m.peak = q > 0.24 && q < 0.82;
  } else {                                   // hop: two big airborne bounds
    const arc = Math.abs(Math.sin(q * Math.PI * 2));
    m.lift = arc * 0.26; m.tilt = Math.sin(q * Math.PI * 2) * 0.09;
    m.squash = Math.max(0, 0.3 - arc) * 0.8; m.peak = arc > 0.4;
  }
  if (reworked && id === 'grumpos') {
    // The final most-muscular hit hinges forward: ease in after the horizontal
    // double-biceps, hold through the front squeeze, then recover before the
    // loop returns overhead. drawHumanoid turns this envelope into separate
    // pelvis/shoulder/head offsets rather than flattening the whole sprite.
    const smooth = (v) => {
      const n = Math.max(0, Math.min(1, v));
      return n * n * (3 - 2 * n);
    };
    m.hunch = c < 0.547 ? 0
      : c < 0.604 ? smooth((c - 0.547) / 0.057)
        : c < 0.956 ? 1
          : 1 - smooth((c - 0.956) / 0.044);
  }
  return m;
}

// ------------------------------------------------------------- the death face
// A run ends on a held PORTRAIT: the world stops and the last silhouette is
// frozen for the whole death hold (see tests/death-pose.js, which pins the
// body). Until this seam existed that portrait wore the hero's last LIVING
// face — a determined runner's brow, held for half a second on somebody who
// has just been killed by a filing cabinet.
//
// `pose.deathFace` is SECONDS SINCE THE KILLING FRAME rather than a flag,
// because the face is an animation and a boolean has no beats:
//
//   0     -> SHUT    the open eyes squeeze shut, white and pupil going down
//                    WITH the lid, so the last thing the hero does is close
//                    his eyes rather than cut to a mark
//   SHUT  -> BLANK   the closed lids hold, then go. The empty face is the
//                    whole trick: it makes the mark a REPLACEMENT for the eye
//                    rather than a scribble drawn over one
//   BLANK -> POP     the marks wind in, over-scale, and settle
//   after POP        held, dead still, for as long as the hold lasts
//
// It is over in 0.27s, inside even the 0.5s hit hold (run.js deadHold), so the
// shortest death in the game still shows all of it.
const DEATH_FACE = {
  SHUT: 0.08,   // lids fully down
  BLANK: 0.19,  // ...held closed to here, then gone: an empty face
  POP: 0.27,    // marks arrived and settled
};
export const DEATH_FACE_TIMING = DEATH_FACE;

// What replaces the eyes. THE SPIRAL SHIPS - it won the bake-off on the BEAT
// rather than on the still: an X arrives as a finished stamp, while the spiral
// is a mark still winding as it lands, which is the read this moment wants. The
// other two stay drawable behind the same seam, and a pose picks one with
// `deathStyle` exactly the way a slide picks `slideStyle`.
export const DEATH_EYE_STYLE = 'spiral';

// A MOUTH UNDER A MUSTACHE. Lorenzo is the one face whose death mouth has to be
// found rather than just drawn: he has no mouth at all outside the celebration
// grin, and a dark hole opened under a dark brown mustache simply joins it -
// the two read as one shape. These are the ways out, picked with `deathMouth`.
// TEETH SHIP. The problem was never where the mouth sat, it was VALUE: a
// near-black hole against dark brown is one shape at any size. Moving the
// mustache (B) and ringing the hole in skin (C) both work at portrait size and
// both close up again at 4.8x, the smallest desktop presentation there is. The
// white band is the one value neither the mustache nor the hole has, so it is
// the one that survives the whole way down - and it is not an invention, it is
// the treatment his celebration grin already uses.
export const DEATH_MOUTH_STYLE = 'teeth';
export const DEATH_MOUTH_STYLES = [
  { id: 'teeth', name: 'D - TEETH', note: 'a white band inside the hole, quoting the grin\'s own teeth - SHIPS' },
  { id: 'plain', name: 'A - PLAIN', note: 'the dark hole on its own - the one that blends' },
  { id: 'lift', name: 'B - MUSTACHE UP', note: 'the lobes ride up, leaving a band of skin above the mouth' },
  { id: 'rim', name: 'C - LIP RIM', note: 'a skin-coloured ring around the hole, separating it from the brown' },
];
export const DEATH_EYE_STYLES = [
  { id: 'spiral', name: 'C - SPIRAL', note: 'the dizzy KO spiral - SHIPS' },
  { id: 'x', name: 'A - X', note: 'two crossed strokes where the eye was' },
  { id: 'stitch', name: 'B - CROSSED OUT', note: 'the eye white stays; the X is struck through it' },
];

// 0 at the start, 1 at the end, overshooting about a tenth on the way - the
// standard back-out. The mark is driven by SCALE and not by alpha because a
// mark that fades up reads as a ghost, and one that snaps reads as drawn.
function backOutEase(q) {
  const b = q - 1;
  return 1 + b * b * (2.7 * b + 1.7);
}

// null while alive. Everything downstream keys off this one object, so a face
// is dead in exactly one place.
function deathFaceState(pose) {
  const raw = pose.deathFace;
  if (raw == null || raw === false) return null;
  const s = Math.max(0, Number(raw) || 0);
  const x = s <= DEATH_FACE.BLANK ? 0
    : Math.min(1, (s - DEATH_FACE.BLANK) / (DEATH_FACE.POP - DEATH_FACE.BLANK));
  return {
    t: s,
    shut: Math.min(1, s / DEATH_FACE.SHUT),  // 0 open, 1 lids down
    lid: s < DEATH_FACE.BLANK,               // the closed lid is still on the face
    x,                                       // 0..1 presence of the mark
    pop: x > 0 ? backOutEase(x) : 0,         // ...and its scale, overshoot included
    style: pose.deathStyle || DEATH_EYE_STYLE,
    mouth: pose.deathMouth || DEATH_MOUTH_STYLE,
  };
}

// The mood table, lifted out of expressionFor's return so the death face can
// reach it too: the rig dialect outlives the expression, and b33p's LED panels
// die in their own language.
const FACE_MOODS = {
  gnash: 'cocky', raymn: 'cocky', fernwick: 'bright', b33p: 'robot',
  grumpos: 'gruff', lorenzo: 'worried',
};
const moodFor = (id) => FACE_MOODS[id] || 'soft';

function expressionFor(id, pose = {}, spec = null) {
  const t = pose.time || 0;
  // A dead face does none of a living face's work - no idle blink, no focus
  // brow, no jump mood, no celebration - so it leaves HERE rather than being
  // ANDed into every term below. Only the rig dialect travels with it.
  const death = deathFaceState(pose);
  if (death) return { id, mood: moodFor(id), death, blink: false, browEase: 1, joyAmt: 1 };
  // The seed staggers the blink so the cast never blinks in unison, and it is
  // keyed by id — which leaves anyone NOT on the roster on seed 0, and seed 0
  // blinks at t = 0. Every portrait crop in the game is drawn at t = 0, so a
  // cast candidate came out of drawToonFace with its eyes shut. `spec.faceSeed`
  // is how a rig that has no id in the table brings its own.
  const seed = FACE_SEED[id] ?? (spec && spec.faceSeed) ?? 0;
  // Two quick frames roughly every four seconds, offset per hero so the cast
  // never blinks in eerie unison. Action faces override the idle blink.
  const blinkGap = pose.menu ? 1.8 + seed * 0.08 : 3.6 + seed * 0.11;
  const blinkPhase = (t + seed) % blinkGap;
  // `faceSurprised` counts as an action face: a hero who has just run off a
  // ledge is drawn RUNNING until the fall catches up with him (poseFromPlayer's
  // bigFall), so without it the idle blink can shut his eyes on the one beat
  // they are meant to be wide open.
  const active = pose.kind === 'jump' || pose.kind === 'slide' || pose.kind === 'celebrate'
    || pose.stomp || pose.roll || pose.float || !!pose.faceSurprised;
  // The pole ride is the moment the stage is WON, and the face is the only part
  // of the hero that can say so — the body is busy holding on. It borrows the
  // JUMP pose to hang off, though, and an ordinary jump wears one of a handful
  // of jump faces (see the `jf` lookup below). Clinging overrides all of that
  // with the celebration face instead, held for the length of the slide.
  const clinging = clingAmount(pose) > 0.35;
  // FALLING IS NOT JUMPING.
  //
  // The jump face is rolled once at launch and held for the whole hang time —
  // `kind` stays 'jump' for every airborne frame, which is the whole reason the
  // roll is held (see the `jf` lookup below). The cost was that the delighted
  // one stayed on all the way down too, including the drop off a platform the
  // player has just missed, where a grin reads as the hero enjoying their
  // mistake.
  //
  // Past -60 (the variable-jump cut, so the same speed the engine already treats
  // as the end of a hop's rise) the hero is properly on the way down and the
  // excited face simply drops out — the smile going is enough, and anything
  // stronger would fire on the descent of every ordinary hop, which is most of
  // the time anyone spends in the air.
  //
  // ALARM is not a speed. It used to be a second threshold here, -240, on the
  // reasoning that a jump could not reach it coming back down from its own
  // apex — but it can, and does: launch at BASE_JUMP_V 320 and you cross the
  // takeoff line at exactly -320, so the last four frames of every held jump
  // wore the startled face on the way into a landing the player had judged
  // perfectly. Speed cannot tell a fall from the end of a hop, because the end
  // of a hop IS a fall. Only the geometry can — how far below the floor he left
  // he has got to — and RunState.updateFallFace is where that is measured.
  //
  // A stomp is exempt and so is a float: both are descents the player ASKED
  // for, and `effort` already owns the stomp's face.
  const dropping = pose.kind === 'jump' && !pose.stomp && !pose.float && !clinging;
  const falling = dropping && (pose.vy || 0) < -60;
  // Face-only moods let a running cameo react without switching its body into
  // a celebration animation. Production poses do not set these flags.
  // jumpFace 1 ("excited") also lands here — see the `jf` variant lookup below.
  const joy = pose.kind === 'celebrate' || !!pose.faceJoy || clinging
    || (pose.kind === 'jump' && !pose.stomp && !clinging && !falling && (pose.jumpFace | 0) === 1);
  // Celebrating faces ride the routine: at the top of a bounce the grin opens
  // into a full cheer, and between beats the eyes squeeze shut, delighted.
  const reworkedCelebration = joy && usesReworkedCelebration(pose);
  const cm = joy ? celebrateMotion(id, t, reworkedCelebration, spec?.celebrate) : null;
  // Clinging cheers throughout. Squeezed-shut ^ ^ eyes are the between-beats
  // half of the celebration, and a hero who slides the whole pole with his eyes
  // closed reads as asleep on it; `cheer` is the open-eyed, open-mouthed half,
  // which is the "wheeee" this pose wants and keeps the eyes in the face.
  const cheer = clinging || !!(cm && cm.peak);
  // How MUCH of the grin, 0..1. A celebration owns the full thing; the pole
  // ride grows into it — he catches with a smile and the whoop opens as the
  // ground comes up (clingRide is descent progress, see run.js). The joy-mouth
  // painters lerp their modest-smile → full-cheer sizes on this, so the face
  // develops down the pole rather than switching on whole at the catch.
  const joyAmt = clinging
    ? 0.35 + 0.65 * Math.max(0, Math.min(1, pose.clingRide || 0))
    : 1;
  // Dolores never breaks posture — no wave, no lean — so all her idle life has
  // to carry on the face. She rotates through a handful of micro-beats on a slot
  // cycle: a call to a queue that has not existed in years (brows up, eyes past
  // you, mouth open on the word); a glance down the empty line; a look at the
  // counter in front of her; a brow-raise at nothing. Only one runs per window
  // and most windows are a plain rest, so it reads as a bored server, not a
  // twitch. The eye glances ease in and out; the call and brow-raise hard-cut,
  // matching the old call. Strictly id-gated — no other hero can reach any of it.
  //
  // Watching somebody cross the room overrides all of it. `gazeAmt` is a 0..1
  // blend the caller ramps, not a flag, and the idle beats are weighted by what
  // is left of it: a face that is tracking a customer half-way must not also be
  // half-way through a glance down the empty line. The two hard-cut beats (the
  // call and the brow-raise) drop out entirely once the gaze has taken over,
  // since neither has a partial state to fade through.
  let calling = false, glanceX = 0, glanceY = 0, hmph = false, browEase = 1;
  const gazeAmt = Math.max(0, Math.min(1, +pose.gazeAmt || 0));
  if (id === 'dolores' && !active && !joy && !pose.annoyed) {
    const cyc = 4.4, ph = (t + seed) % cyc, win = 0.9;
    const slotN = Math.floor((t + seed) / cyc) % 7;
    // Ramp the beat in over ~0.22s and back out, so nothing pops. The brow beats
    // carry this on their ink alpha (browEase) — a hairline that snaps into
    // existence reads as a glitch; one that lifts in reads as a brow.
    const ease = ph < win ? Math.min(1, Math.min(ph, win - ph) / 0.22) : 0;
    if (ph < win) {
      if (slotN === 0) { calling = true; browEase = ease; }
      else if (slotN === 2) glanceX = -0.032 * ease; // down the (empty) line
      else if (slotN === 3) glanceY = 0.022 * ease;  // at the counter in front of her
      else if (slotN === 4) glanceX = 0.032 * ease;
      else if (slotN === 5) { hmph = true; browEase = ease; } // a brow-raise at nothing
      // slots 1 & 6: a plain rest face, so the beats never crowd each other.
    }
  }
  // AIRBORNE THE EYES LOOK WHERE THE BODY IS GOING. The jump already rolls a
  // face — the startled one among them — but whichever it rolls is then held
  // rigid from launch to landing, so the one pose with real acceleration in it
  // is the one pose with a frozen expression. The pupils now ride the vertical
  // speed: up on the climb, down as she drops toward the ground she is about
  // to land on. It is signed off `vy`, so it reverses at the apex by itself,
  // and it is small — this is a glance, not a cartoon take.
  if (pose.kind === 'jump' && !gazeAmt) {
    const airLook = Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160));
    glanceY += airLook * 0.02;
  }
  if (gazeAmt > 0) {
    glanceX = glanceX * (1 - gazeAmt) + (+pose.gazeX || 0) * gazeAmt;
    glanceY = glanceY * (1 - gazeAmt) + (+pose.gazeY || 0) * gazeAmt;
    if (gazeAmt > 0.35) { calling = false; hmph = false; browEase = 1; }
  }
  // Set briefly when someone jabs the button on a SOLD OUT tier: brows furrow,
  // eyes narrow to a glare, mouth turns down. She never breaks posture, so — as
  // with the call — the whole "no" reads on the face. Suppresses the call and
  // the idle blink for its duration so the glare holds steady.
  //
  // `pose.annoyed` is a 0..1 RAMP, not a flag: the mad brows carry it on their
  // ink alpha so they lift in and settle out like the idle beats, instead of a
  // hairline snapping into existence mid-glare.
  const annoyedAmt = Math.max(0, Math.min(1, +pose.annoyed || 0));
  const annoyed = annoyedAmt > 0.02;
  if (annoyed) browEase = annoyedAmt;
  // Which jump face: 0 surprised, 1 excited, 2 determined, 3 startled. (A 5th,
  // neutral, was cut for reading too close to determined.) The caller rolls
  // one per hop so the same jump doesn't always land on the same face — see
  // run.js's rollJumpFace. Excluded on the ground, mid-stomp, and while
  // clinging (the pole ride keeps its own joyful face below).
  const jf = (pose.kind === 'jump' && !pose.stomp && !clinging) ? (pose.jumpFace | 0) : -1;
  return {
    // `brow` opts a face out of the shipped ink hairlines, and it has to come
    // from the SPEC to be usable: drawEyes gates on ex.brow, but the only thing
    // that ever set it was Lorenzo's cap variant, so a spec asking for
    // `brow: 'none'` was silently ignored and the ink pair drew anyway. That is
    // wrong for any hero who carries his own brow marks — Rusty's white spots
    // ARE his eyebrows, and the ink stroke landed on top of them.
    brow: spec?.brow,
    // A blink through the call or the glare would eat it, so those win.
    blink: !active && !calling && !annoyed && blinkPhase < (pose.menu ? 0.2 : 0.13),
    calling,
    annoyed,
    joyAmt,
    glanceX,
    glanceY,
    hmph,
    browEase,
    // Which flavour of mad — 0 glare, 1 one-brow-up, 2 eye-roll, 3 fed-up. The
    // caller rolls it so the same jab twice doesn't give the same face.
    madStyle: pose.madStyle | 0,
    // Carried so downstream marks can be keyed to the hero, not just the mood —
    // BROW_L_SCALE is the one that needs it.
    id,
    focus: pose.kind === 'run' || pose.kind === 'slide' || pose.roll || jf === 2,
    surprise: !clinging && (jf === 0 || jf === 3 || !!pose.faceSurprised),
    // Startled brow: opt-in via pose.browRaise (a cameo can force it), or the
    // jump face rolled the startled variant; see the branch it unlocks in
    // drawEyes for why the surprise face needed its own shape.
    browRaise: !!pose.browRaise || jf === 3,
    joy,
    cheer,
    // The narrowest window in the routine: a hit of the BIG move, held. The
    // signature bounce peaks constantly, so anything keyed to `cheer` reads as
    // a permanent expression — this is for faces that should barely crack.
    // The Grumpos gallery routine has long held poses. Letting `beam` follow
    // the old short peak window swaps his pale beard-mouth between two shapes
    // mid-hold, which reads as the mouth blinking out. Keep his stern mouth
    // registered throughout the study; production retains the rare grin.
    // Clinging is the one held pose that wants the grin ON for its whole
    // length: Grumpos's mouth is a gap in a beard with three states, and the
    // stern one under a pair of delighted eyes reads as a glitch rather than as
    // stoicism. Everywhere else the rare-grin rule stands.
    // Clinging beams once the ride is properly under way, not from the first
    // frame of the grip. Grumpos's grin is a fixed path with no size to lerp,
    // so his version of "the smile develops" is that it STARTS partway down —
    // the same threshold the sized mouths pass through joyAmt.
    beam: clinging
      ? (pose.clingRide || 0) > 0.35
      : id === 'grumpos' && reworkedCelebration
        ? false
        : !!(cm && cm.peak && cm.move),
    effort: !!(pose.stomp || pose.roll || pose.headless),
    // Even Grumpos's scowl unclenches now and then: mid-run the face drops
    // to neutral for a couple of seconds out of every eight or so, seeded so
    // the lull lands at different beats per hero clock. Permanent anger reads
    // as a mask; the occasional slack face is what makes the scowl register
    // as a mood. Downstream this suppresses the focus brows and flattens his
    // mouth, so it needs its own flag — mood alone can't unclench a running
    // face, because ex.focus forces the brows on.
    relaxed: id === 'grumpos' && pose.kind === 'run' && (t + seed * 1.7) % 8.3 < 2.2,
    mood: moodFor(id),
  };
}

// BEAT ONE AND TWO: the eye going out. The white and the pupil are squeezed to
// nothing against the lid line rather than fading in place - an eye that
// dissolves reads as the whole hero fading, an eye that closes reads as a man
// shutting his eyes, which is the one thing this beat has to say. The lid is
// the blink's own arc, brought up as the eye disappears under it and taken away
// whole at BLANK, leaving a bare face for the mark to arrive onto.
function drawDyingEye(ctx, p, u, x, y, d) {
  const left = 1 - d.shut;
  if (left > 0.02) {
    outlined(ctx, '#fff', hair(0.4, 0.011 * u) * INK.face,
      (c) => c.ellipse(x, y, 0.055 * u, 0.065 * u * left, 0, 0, Math.PI * 2));
    dot(ctx, x, y, 0.026 * u * left, p.e);
  }
  if (d.lid) shutLid(ctx, p, u, x, y, d);
}

// The closed lid: the blink's own arc, brought up as the eye disappears under
// it. Every rig that owns a blink shape draws its own instead (Mochi's heavier
// line, Chompo's lash-and-tips); this is the shared one.
function shutLid(ctx, p, u, x, y, d, half = 0.035 * u, w = null) {
  ctx.save();
  ctx.globalAlpha *= Math.min(1, d.shut * 1.6);
  ctx.strokeStyle = p.e;
  ctx.lineWidth = w || hair(0.44, 0.014 * u) * INK.face;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.quadraticCurveTo(x, y + half * 0.51, x + half, y);
  ctx.stroke();
  ctx.restore();
}

// BEAT THREE: the mark that replaces it. `tilt` is a few degrees of lean the
// caller sets per side, so a pair never reads as a typed letter; `ink` lets the
// robot stamp its marks in LED white instead of eye ink.
function drawDeadEyeMark(ctx, p, u, x, y, d, { tilt = 0, ink = null, panel = false, scale = 1 } = {}) {
  const s = d.pop * scale;
  if (s <= 0) return;
  const col = ink || p.e;
  ctx.save();
  ctx.lineCap = 'round';
  if (d.style === 'stitch') {
    // The eye is still there; it has just been crossed out. Panelled rigs keep
    // their bar rather than growing a white a robot has never had.
    if (panel) {
      outlined(ctx, col, hair(0.28, 0.008 * u) * INK.face,
        (c) => roundRectPath(c, x - 0.045 * u, y - 0.05 * u, 0.09 * u, 0.1 * u, 0.03 * u));
    } else {
      outlined(ctx, '#fff', hair(0.4, 0.011 * u) * INK.face,
        (c) => c.ellipse(x, y, 0.055 * u, 0.065 * u, 0, 0, Math.PI * 2));
    }
  }
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(tilt);
  ctx.strokeStyle = col;
  ctx.lineWidth = hair(0.5, 0.016 * u) * INK.face / Math.max(0.35, s);
  ctx.beginPath();
  if (d.style === 'spiral') {
    // Dizzy rather than dead: two and a quarter turns wound out from the middle,
    // filling the same box the eye did.
    const turns = 2.25, steps = 30;
    for (let i = 0; i <= steps; i++) {
      const q = i / steps, a = q * turns * Math.PI * 2, r = 0.058 * u * q;
      const px = Math.cos(a) * r, py = Math.sin(a) * r * 0.94;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  } else {
    const rx = 0.05 * u, ry = 0.058 * u;
    ctx.moveTo(-rx, -ry); ctx.lineTo(rx, ry);
    ctx.moveTo(rx, -ry); ctx.lineTo(-rx, ry);
  }
  ctx.stroke();
  ctx.restore();
}

function drawEyes(ctx, p, u, cx, cy, lod, ex = {}) {
  const sep = 0.075 * u;
  const turnLimit = Math.PI * 5 / 12;
  const turnRad = Math.max(-turnLimit, Math.min(turnLimit, (Number(ex.turn) || 0) * Math.PI / 180));
  const turnYaw = Math.sin(turnRad);
  const turnDepth = Math.abs(turnYaw);
  const nearSide = turnRad < 0 ? 1 : -1;
  const turned = Math.abs(turnRad) > 0.001;
  // Foreshortening grows with the requested angle. The first version used one
  // fixed 0.82 multiplier for every non-zero value, making 12/20/28 identical.
  const eyeX = (side) => cx + side * sep * (turned && side !== nearSide ? 1 - 0.42 * turnDepth : 1);
  if (ex.mood === 'robot') {
    // LED eyes on the faceplate: glowing bars, no whites or pupils. They
    // squash to slits for a blink and stretch tall in surprise.
    if (ex.death) {
      // The same three beats in the LED dialect: the panel narrows to a slit
      // and goes out, the faceplate is blank, then the mark comes up in the
      // panel's own light. Nothing here borrows the skin-and-pupil eye.
      const d = ex.death;
      const lw = 0.045 * u;
      for (const sx of [-1, 1]) {
        if (d.lid) {
          const lh = (0.05 - 0.044 * d.shut) * u;
          outlined(ctx, p.w, hair(0.28, 0.008 * u) * INK.face, (c) =>
            roundRectPath(c, eyeX(sx) - lw, cy - lh, lw * 2, lh * 2, Math.min(lw, lh) * 0.8));
        }
        drawDeadEyeMark(ctx, p, u, eyeX(sx), cy, d, { tilt: sx * 0.1, ink: p.w, panel: true });
      }
      return;
    }
    if (ex.joy && !ex.cheer) {
      // delight, robot dialect: the LEDs bend into little ^ arcs
      ctx.strokeStyle = p.w;
      ctx.lineWidth = hair(0.55, 0.017 * u) * INK.face;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(eyeX(sx) - 0.04 * u, cy + 0.02 * u);
        ctx.quadraticCurveTo(eyeX(sx), cy - 0.05 * u, eyeX(sx) + 0.04 * u, cy + 0.02 * u);
        ctx.stroke();
      }
      return;
    }
    const lw = 0.045 * u;
    const lh = ex.blink ? 0.011 * u : ex.surprise || ex.cheer ? 0.068 * u : 0.05 * u;
    // A robot's eye panels belong to the visor rather than floating over skin:
    // keep their shared center registered and let far-panel narrowing carry
    // the tiny directional cue.
    const lookX = (ex.focus ? 0.012 : 0) * u;
    for (const sx of [-1, 1]) {
      outlined(ctx, p.w, hair(0.28, 0.008 * u) * INK.face, (c) =>
        roundRectPath(c, eyeX(sx) + lookX - lw, cy - lh, lw * 2, lh * 2, Math.min(lw, lh) * 0.8));
    }
    return;
  }
  // The death face outranks every living one, including the lod shortcut below:
  // the marks are the whole read of the beat, and a distant death that keeps
  // its pupils is a hero standing there thinking about it.
  if (ex.death) {
    for (const sx of [-1, 1]) {
      drawDyingEye(ctx, p, u, eyeX(sx), cy, ex.death);
      drawDeadEyeMark(ctx, p, u, eyeX(sx), cy, ex.death, { tilt: sx * 0.12 });
    }
    return;
  }
  if (ex.blink) {
    ctx.strokeStyle = p.e;
    ctx.lineWidth = hair(0.44, 0.014 * u) * INK.face;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(eyeX(sx) - 0.035 * u, cy);
      ctx.quadraticCurveTo(eyeX(sx), cy + 0.018 * u, eyeX(sx) + 0.035 * u, cy);
      ctx.stroke();
    }
    return;
  }
  // Happy-arc eyes: squeezed shut between cheers, the classic ^ ^ of delight.
  if (ex.joy && !ex.cheer) {
    ctx.strokeStyle = p.e;
    ctx.lineWidth = hair(0.5, 0.015 * u) * INK.face;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(eyeX(sx) - 0.04 * u, cy + 0.02 * u);
      ctx.quadraticCurveTo(eyeX(sx), cy - 0.055 * u, eyeX(sx) + 0.04 * u, cy + 0.02 * u);
      ctx.stroke();
    }
    return;
  }
  if (lod) {
    dot(ctx, eyeX(-1), cy, 0.032 * u, p.e);
    dot(ctx, eyeX(1), cy, 0.032 * u, p.e);
    return;
  }
  for (const sx of [-1, 1]) {
    // Annoyed narrows the eye to a glare — the white squashes and the pupil
    // stares straight out. Style 2 rolls the pupils up; style 3 squeezes to
    // slits. Style 1 keeps them wide but half-lidded.
    const rollUp = ex.annoyed && ex.madStyle === 2;
    const eyeRy = (ex.annoyed
      ? (ex.madStyle === 2 ? 0.062 : ex.madStyle === 1 ? 0.05 : 0.046)
      : 0.065) * u;
    outlined(ctx, '#fff', hair(0.4, 0.011 * u) * INK.face, (c) => c.ellipse(eyeX(sx), cy, 0.055 * u, eyeRy, 0, 0, Math.PI * 2));
    // Calling looks further off than focus does — past you, at the head of the
    // queue — and level rather than down.
    const lookX = ((ex.calling ? 0.026 : ex.focus ? 0.012 : rollUp ? 0.018 : 0) + (ex.glanceX || 0)) * u + turnYaw * 0.032 * u;
    const lookY = ex.surprise || ex.cheer || ex.calling ? -0.005 * u : rollUp ? -0.03 * u : ex.annoyed ? 0 : (0.012 + (ex.glanceY || 0)) * u;
    // A pupil stays IN its eye. The offsets above stack — a base look, a
    // glance, and a whole-body turn's yaw — and nothing was stopping the sum
    // walking the pupil off the white: the power slide's counter-gaze alone
    // put it 0.001u past the lower rim, and a kick reaction on top of that
    // hung it in mid-air outside the eye entirely.
    //
    // Clamped as a VECTOR against the white's own ellipse, inset by the
    // pupil's radius and a hair of margin, so a look that would overshoot is
    // shortened along the direction it was already pointing rather than
    // squared off against one axis. Every caller is protected, including ones
    // that do not exist yet — this is a mark that must never leave its shape,
    // like a button on a coat.
    const pupR = 0.026 * u, rim = 0.004 * u;
    const maxX = Math.max(0, 0.055 * u - pupR - rim);
    const maxY = Math.max(0, eyeRy - pupR - rim);
    const over = maxX > 0 && maxY > 0
      ? Math.hypot(lookX / maxX, lookY / maxY) : 0;
    const fit = over > 1 ? 1 / over : 1;
    dot(ctx, eyeX(sx) + lookX * fit, cy + lookY * fit, pupR, p.e);
  }
  // `brow` opts a face out of the shipped hairlines: 'none' draws nothing,
  // 'bushy' means drawHead paints hair brows over the top instead.
  if (!lod && !ex.brow && !ex.death && ex.mood !== 'bright' && !ex.relaxed && (ex.annoyed || ex.calling || ex.hmph || ex.focus || ex.browRaise || ex.mood === 'cocky' || ex.mood === 'gruff')) {
    // Fernwick (mood 'bright') draws NO brows — a bare, open brow keeps her
    // sweet and lets his blond bangs frame the eyes while running.
    // `browCol` lets a palette take its brows off the full face ink. Kiko's are
    // her own dark hair rather than her eye ink: a black brow under a brown fringe
    // reads as a third colour on a head that only has two, and hers is the only
    // face on the roster where the fringe comes down far enough for the two to be
    // read against each other.
    ctx.strokeStyle = browInk(p.browCol || p.e,
      INK.browA * (ex.browEase ?? 1), INK.browL * (BROW_L_SCALE[ex.id] ?? 1));
    ctx.lineWidth = hair(BROW_MIN, BROW_W * u) * INK.face * INK.brow;
    ctx.beginPath();
    if (ex.annoyed && ex.madStyle === 1) {
      // One brow up: her left held flat and high (skeptical), the other lowered
      // and angled in. Asymmetry is what reads as "unimpressed".
      const hi = cy - 0.096 * u;
      ctx.moveTo(eyeX(-1) - 0.05 * u, hi);
      ctx.lineTo(eyeX(-1) + 0.05 * u, hi + 0.004 * u);
      ctx.moveTo(eyeX(1) - 0.05 * u, cy - 0.05 * u);
      ctx.lineTo(eyeX(1) + 0.052 * u, cy - 0.092 * u);
    } else if (ex.annoyed && ex.madStyle === 2) {
      // Eye-roll: both brows lifted and arched — the "give me a break" hoist.
      const hi = cy - 0.104 * u;
      ctx.moveTo(eyeX(-1) - 0.05 * u, hi + 0.01 * u);
      ctx.lineTo(eyeX(-1) + 0.048 * u, hi);
      ctx.moveTo(eyeX(1) - 0.048 * u, hi);
      ctx.lineTo(eyeX(1) + 0.05 * u, hi + 0.01 * u);
    } else if (ex.annoyed) {
      // The angry furrow: inner ends driven down toward the nose bridge, outer
      // ends held high, so the two brows make a steep \ / over the glare.
      const inY = cy - 0.042 * u, outY = cy - 0.098 * u;
      ctx.moveTo(eyeX(-1) - 0.052 * u, outY);
      ctx.lineTo(eyeX(-1) + 0.05 * u, inY);
      ctx.moveTo(eyeX(1) - 0.05 * u, inY);
      ctx.lineTo(eyeX(1) + 0.052 * u, outY);
    } else if (ex.browRaise) {
      // Both brows lifted straight up and held level: the startled brow.
      //
      // Opt-in via pose.browRaise and nothing in the game sets it — it exists
      // because the surprise face (pose.faceSurprised) had no brow it could
      // reach. Every other shape here belongs to a mood that fights it: the
      // annoyed shapes win the mouth chain outright and take the round shocked
      // mouth with them, the focus shape drives the inner ends DOWN and reads as
      // a glare, and the counter-staff raise below is gated to Dolores. So a face
      // could be surprised or it could have eyebrows, and not both.
      //
      // Lifted further than the counter-staff brow (0.104u against 0.092u) on
      // that branch's own evidence: its comment records 0.104u as the point where
      // the lift crowds the hairline and the face reads as startled, which is
      // exactly the read it did not want and this one does.
      const by = cy - 0.104 * u;
      ctx.moveTo(eyeX(-1) - 0.05 * u, by + 0.004 * u);
      ctx.lineTo(eyeX(-1) + 0.045 * u, by);
      ctx.moveTo(eyeX(1) - 0.045 * u, by);
      ctx.lineTo(eyeX(1) + 0.05 * u, by + 0.004 * u);
    } else if (ex.calling || ex.hmph) {
      // Raised and near-level: the counter-staff "next in line" brow, also used
      // for the idle brow-raise-at-nothing (hmph). Angling them would read as a
      // mood, and she does not have one about this. The lift is deliberately
      // small — measured at 0.104u the brows crowd the hairnet and the face
      // reads as startled, which is the one thing she never is.
      const by = cy - 0.092 * u;
      ctx.moveTo(eyeX(-1) - 0.05 * u, by);
      ctx.lineTo(eyeX(-1) + 0.045 * u, by + 0.006 * u);
      ctx.moveTo(eyeX(1) - 0.045 * u, by + 0.006 * u);
      ctx.lineTo(eyeX(1) + 0.05 * u, by);
    } else {
      ctx.moveTo(eyeX(-1) - 0.05 * u, cy - 0.08 * u);
      ctx.lineTo(eyeX(-1) + 0.045 * u, cy - (ex.mood === 'worried' ? 0.055 : 0.045) * u);
      ctx.moveTo(eyeX(1) - 0.045 * u, cy - 0.045 * u);
      ctx.lineTo(eyeX(1) + 0.05 * u, cy - 0.08 * u);
    }
    ctx.stroke();
  }
}
function drawMouth(ctx, spec, p, u, cx, cy, ow, ex = {}) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = hair(0.55, ow * 0.4) * INK.face;
  ctx.beginPath();
  if (ex.death) {
    // THE MOUTH FALLS OPEN. It was a shallow slack CURVE first, and that was
    // wrong in the one way this face cannot afford: a line whose middle dips
    // below its ends is the shape of a SMILE, so half the cast died grinning.
    // Curves are ambiguous at the size this plays at; a hole is not. It opens
    // on `shut`, with the eyes, because the gasp and the eyes closing are one
    // reaction and not two.
    //
    // B-33P is the single exemption, and not for want of a mouth: his is a
    // speaker grille, and a speaker does not gasp. It goes dark.
    if (spec.mouth === 'grille') { ctx.stroke(); return; }
    ctx.stroke();
    const a = ex.death.shut;
    outlined(ctx, p.m || p.e, hair(0.28, ow * 0.25) * INK.face, (c) =>
      c.ellipse(cx, cy + 0.004 * u, (0.02 + 0.015 * a) * u, (0.005 + 0.04 * a) * u, 0, 0, Math.PI * 2));
    return;
  }
  if (ex.joy) {
    // An actual smile: a filled D-grin that widens into a whoop on the peaks.
    // joyAmt lerps the modest smile toward the full cheer — on the pole ride it
    // tracks the descent, so the grin OPENS on the way down instead of arriving
    // at whoop size the frame the hero takes the grip.
    const amt = ex.cheer ? (ex.joyAmt == null ? 1 : ex.joyAmt) : 0;
    const w = (0.065 + 0.02 * amt) * u, d = (0.038 + 0.037 * amt) * u;
    ctx.stroke();
    outlined(ctx, p.m || p.e, hair(0.28, ow * 0.25) * INK.face, (c) => {
      c.moveTo(cx - w, cy - 0.012 * u);
      c.quadraticCurveTo(cx, cy + d * 1.9, cx + w, cy - 0.012 * u);
      c.closePath();
    });
    return;
  }
  if (ex.calling) {
    // Mid-word: open, clearly wider than tall. She is projecting across a
    // counter, not shouting — a rounder mouth reads as a gasp, which is the
    // surprise face, not this one.
    ctx.stroke();
    outlined(ctx, p.m || p.e, hair(0.28, ow * 0.25) * INK.face, (c) => c.ellipse(cx, cy + 0.008 * u, 0.042 * u, 0.025 * u, 0, 0, Math.PI * 2));
    return;
  }
  if (ex.annoyed) {
    if (ex.madStyle === 1 || ex.madStyle === 2) {
      // Tight-lipped: a flat line pressed low, the wordless "no".
      ctx.moveTo(cx - 0.052 * u, cy + 0.016 * u);
      ctx.lineTo(cx + 0.052 * u, cy + 0.016 * u);
      ctx.stroke();
      return;
    }
    // Style 0 — corners pulled down, middle held up: the flat "no" become a frown.
    ctx.moveTo(cx - 0.05 * u, cy + 0.024 * u);
    ctx.quadraticCurveTo(cx, cy - 0.016 * u, cx + 0.05 * u, cy + 0.024 * u);
    ctx.stroke();
    return;
  }
  if (ex.surprise) {
    ctx.stroke();
    outlined(ctx, p.m || p.e, hair(0.28, ow * 0.25) * INK.face, (c) => c.ellipse(cx, cy, 0.035 * u, 0.045 * u, 0, 0, Math.PI * 2));
    return;
  } else if (ex.effort) {
    ctx.moveTo(cx - 0.05 * u, cy + 0.015 * u); ctx.lineTo(cx + 0.055 * u, cy - 0.005 * u);
  } else if (spec.mouth === 'smile') ctx.arc(cx, cy - 0.02 * u, 0.06 * u, 0.25 * Math.PI, 0.75 * Math.PI);
  else if (spec.mouth === 'smirk') { ctx.moveTo(cx, cy + 0.01 * u); ctx.quadraticCurveTo(cx + 0.05 * u, cy + 0.02 * u, cx + 0.08 * u, cy - 0.02 * u); }
  else if (spec.mouth === 'line') { ctx.moveTo(cx - 0.045 * u, cy); ctx.lineTo(cx + 0.045 * u, cy); }
  else if (spec.mouth === 'grille') {
    // speaker grille: three glowing ticks instead of lips
    ctx.strokeStyle = p.w;
    ctx.lineWidth = hair(0.38, ow * 0.28) * INK.face;
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(cx + i * 0.034 * u, cy - 0.018 * u);
      ctx.lineTo(cx + i * 0.034 * u, cy + 0.018 * u);
    }
  }
  else if (spec.mouth === 'flat') { ctx.moveTo(cx - 0.05 * u, cy + 0.01 * u); ctx.lineTo(cx + 0.05 * u, cy + 0.01 * u); }
  else { ctx.stroke(); return; }
  ctx.stroke();
}

// A spike from base corners A and B up to tip T, but with the apex rounded off
// rather than drawn to a sharp point. `round` is how far back down each edge the
// rounding starts (0 = sharp, ~0.3 = soft nub).
function bluntSpike(c, ax, ay, tx, ty, bx, by, round = 0.18) {
  const p1x = ax + (tx - ax) * (1 - round), p1y = ay + (ty - ay) * (1 - round);
  const p2x = bx + (tx - bx) * (1 - round), p2y = by + (ty - by) * (1 - round);
  c.moveTo(ax, ay);
  c.lineTo(p1x, p1y);
  c.quadraticCurveTo(tx, ty, p2x, p2y);
  c.lineTo(bx, by);
  c.closePath();
}

// ------------------------------------------------------- animal head kinds
// GALLERY CANDIDATES. Nothing in TOON_SPECS names these yet — they exist for
// the hero bake-off in src/dev/hero-candidates.js, which is looking for an
// animal to take the speedster slot. `jackal` (Gnash, shipped) is deliberately
// NOT in this table: he keeps his own hand-tuned branches below so the bake-off
// can show him unchanged beside the proposals.
//
// One table and one painter rather than four branches. An ear here is an
// ellipse leaned outboard off the crown with a lighter inner ellipse, and that
// one construction covers a red panda's round ear, a fennec's oversized fan and
// a hare's long blade by moving three numbers — which is the point: a species
// bake-off can only answer "which animal" if the answer is not also
// contaminated by "which ear painter".
//
// The ears are drawn deliberately LARGER than life, the lesson BREEDS in
// sprites/animals.js paid for (see its `head()`): at 16px a correctly
// proportioned ear is one pixel and the pair stops reading as a pair at all.
//
//   earOut/earUp  ear centre, in R, from the head centre — outboard and up
//   earRx/earRy   ear radii in R. earRy >> earRx is a blade, equal is a disc
//   earLean       outboard rotation in radians, so the pair splays off the crown
//   inner         inner-ear ellipse as a fraction of the outer
//   muzzle        [rx, ry, dy] of the snout ellipse, in R
//   ruff          cheek fur: 'scallop' (panda), 'wisp' (fox), null (none)
//   mask          face marking: 'panda' (white brow spots + cheek patches),
//                 'bandit' (dark band across the eyes), null
const ANIMAL_HEADS = {
  // Round, wide-set, and big. The ear and the ruff are the whole silhouette —
  // there is no crown spike, which is the most Sonic-specific thing on Gnash.
  redpanda: {
    earOut: 0.80, earUp: 0.60, earRx: 0.46, earRy: 0.42, earLean: 0.30,
    inner: 0.52, muzzle: [0.60, 0.40, 0.44], ruff: 'scallop', mask: 'panda',
  },
  // The ears ARE the character: oversized enough to carry the whole read at
  // hero size, which is the one thing a small face cannot do.
  fennec: {
    earOut: 0.70, earUp: 1.00, earRx: 0.40, earRy: 0.84, earLean: 0.42,
    inner: 0.58, muzzle: [0.52, 0.34, 0.46], ruff: 'wisp', mask: null,
  },
  // Long upright blades, barely splayed. The only species in the row whose
  // anatomy is itself the speed read.
  hare: {
    earOut: 0.40, earUp: 1.16, earRx: 0.20, earRy: 0.90, earLean: 0.14,
    inner: 0.50, muzzle: [0.52, 0.38, 0.44], ruff: null, mask: null,
  },
  // Small and close to the skull, with the dark bandit band. The fast-end
  // control: a stoat's charm is a long low body this rig cannot do, so what
  // this cut measures is the ceiling, not a winner.
  stoat: {
    earOut: 0.76, earUp: 0.44, earRx: 0.32, earRy: 0.30, earLean: 0.24,
    inner: 0.46, muzzle: [0.56, 0.34, 0.44], ruff: null, mask: 'bandit',
  },
};

// An ellipse leaned outboard, with its lighter inner. Drawn BEHIND the skull in
// drawHead's first pass, exactly where the jackal's ears go, so the skull's own
// fill crops the base and the ear reads as growing out of the head rather than
// stuck on it.
function animalEar(ctx, p, ow, hx, hy, R, side, A, shape, size = 1, angle, width = 1) {
  if (shape === 'point') {
    // The pointed ear: a wide-based soft triangle with the lighter inner
    // filling most of it, the way a real red panda's white ear-fluff does.
    //
    // ROOTED ON THE SKULL, not beside it. The first cut placed the three
    // corners by hand and put the outer base corner at 1.06R — OUTBOARD of the
    // head — so nothing cropped it and the ear read as stuck on rather than
    // grown out; `earSize` then scaled that corner further out and made it
    // worse. Now the base is built FROM the skull: its midpoint sits on a
    // circle of radius `rootR` and its corners run along that circle's own
    // tangent, which puts both at sqrt(rootR^2 + halfW^2) — comfortably inside
    // R at every size, so the head fill always crops the base.
    //
    // ANGLED OUT for free. The ear points RADIALLY outward from where it
    // roots, plus a small extra lean: a triangle whose axis is the skull's own
    // normal cannot read as "straight up", which is what the hand-placed
    // corners did (their outer edge ran x 1.0 -> 0.94, dead vertical).
    //
    // `earAngle` is where on the crown it roots, in radians from vertical.
    // The half-width grows as sqrt(size) rather than with it, so a big ear
    // gets taller without its base swallowing the whole side of the head.
    // `width` widens the BASE without lengthening the ear — the two were one
    // dial (`size` drove both) and a red panda's ear is broad-based and
    // stubby, where a fox's is narrow-based and long. That distinction is the
    // whole difference between the two species at this scale, so it gets its
    // own control.
    //
    // A wide base cannot simply be wider: the corners sit at
    // sqrt(rootR^2 + halfW^2), and past 0.6 halfW that escapes R and the ear
    // detaches again exactly the way the hand-placed version did. So the ear
    // ROOTS DEEPER as it widens — rootR is solved to hold the corners on a
    // 0.95R circle, always inside the skull. A broad ear sitting lower on the
    // head is also what the reference shows, so the constraint and the drawing
    // want the same thing.
    const a = angle ?? 0.62;              // root bearing, radians off vertical
    const lean = 0.14;                    // extra outward lean of the tip
    const halfW = 0.4 * Math.sqrt(size) * width;
    const rootR = Math.min(0.8, Math.sqrt(Math.max(0.04, 0.9025 - halfW * halfW)));
    const len = 0.82 * size;
    const px = (br, d) => hx + side * R * br * Math.sin(d);
    const py = (br, d) => hy - R * br * Math.cos(d);
    const bcx = px(rootR, a), bcy = py(rootR, a);           // base midpoint, ON the skull
    const tanx = side * R * halfW * Math.cos(a), tany = R * halfW * Math.sin(a);
    const bx1 = bcx - tanx, by1 = bcy - tany;               // inner base corner
    const bx2 = bcx + tanx, by2 = bcy + tany;               // outer base corner
    const tx = bcx + side * R * len * Math.sin(a + lean);   // tip
    const ty = bcy - R * len * Math.cos(a + lean);
    outlined(ctx, p.h, ow, (c) => bluntSpike(c, bx1, by1, tx, ty, bx2, by2, 0.3));
    // Inner: the same triangle shrunk toward its own centroid, so the rim of
    // coat colour stays an even width up both edges.
    const gx = (bx1 + bx2 + tx) / 3, gy = (by1 + by2 + ty) / 3, k = 0.58;
    outlined(ctx, p.ear || p.s, hair(0.5, ow * 0.6), (c) => bluntSpike(c,
      gx + (bx1 - gx) * k, gy + (by1 - gy) * k,
      gx + (tx - gx) * k, gy + (ty - gy) * k,
      gx + (bx2 - gx) * k, gy + (by2 - gy) * k, 0.3));
    return;
  }
  const cx = hx + side * R * A.earOut, cy = hy - R * A.earUp;
  const rot = side * A.earLean;
  outlined(ctx, p.h, ow, (c) =>
    c.ellipse(cx, cy, R * A.earRx * size, R * A.earRy * size, rot, 0, Math.PI * 2));
  // The inner sits low in the ear — the outer third nearest the crown is the
  // part the skull and the ruff crop, so an inner centred in the ellipse spends
  // half its area somewhere nothing can see it.
  outlined(ctx, p.ear || p.s, hair(0.5, ow * 0.6), (c) =>
    c.ellipse(cx, cy + R * A.earRy * size * 0.16, R * A.earRx * A.inner * size,
      R * A.earRy * A.inner * size, rot, 0, Math.PI * 2));
}

// ------------------------------------------------------------ Lorenzo's cap
// The shipped cap used to be a semicircle closed by a FLAT chord at -0.12R,
// while his eyes top out at -0.38R and the focus brows run -0.45R..-0.29R. So
// the hem crossed 42% of the way down the eye, and both brow strokes were drawn
// inside the hat — they showed at all only because the face paints after the
// hat, which is also why it survived so long: it reads as "low brim" until you
// notice the eyebrows are sitting ON the purple.
//
// What ships now, arrived at by bake-off (see the gallery's was/is pair, driven
// through this same code path by setLorenzoFace):
//   - the band is flat across the brows and drops to the ears only at the
//     temples, so it clears the brow line without becoming all forehead;
//   - the sides slope inward off the band (`hug`), so the cap follows the skull
//     instead of resting on it like a dome on a sphere;
//   - the whole hat rocks back 12 deg about the HEAD CENTER — the one pivot
//     that leaves every point of it the same distance from the skull, so the
//     raised side cannot lift away — while the oval bill's own rotation cancels
//     that, holding it level;
//   - brown caterpillar brows in the mustache colour replace the ink hairlines,
//     and they move with the mood: up and arched for joy, down for effort;
//   - a tufted fringe shows under the band, deepest at the temples and
//     shallowest at the nose, because that is where the brows are;
//   - the face mask sits 0.067R lower, which is what opens the forehead the
//     fringe hangs into. Half that shift stretched the skull into an egg when it
//     arrived with a taller crown and tapered sides; on its own it does not.
//
// Cap fields are in head radii R measured from the head CENTER, positive up:
//   hem      front-center hem height        hemSide  hem height at the temples
//   width    half-width at the temples      crown    height of the dome top
//   hemPow   how the band falls to the       hug      how hard the sides slope
//            temples (2 = parabola)                   in off the band (1 = not)
//   emblem   height of the tool badge       faceDy   face mask shift, in u
//   tilt     degrees the whole hat is rocked back (bill lifting)
//   billOval [x, aboveHem, rx, ry] of the visor; `bill` is the legacy free
//            ellipse, kept only by the `was` row
//   hair     tufted fringe under the hem    hairLock how far its locks hang
//   brow     unset = the old ink hairlines | 'bushy' | 'none'
export const LORENZO_FACES = [
  { id: 'shipped', label: 'is', note: 'band arched clear of the brows, hat rocked back 12 deg, tufted fringe, oval bill, face down 0.038R',
    // width is not a free number: the hem corner sits at r = hypot(width,
    // hemSide) from the head centre, and at 1.02 that put it 5.3% OUTSIDE the
    // 1.0R skull. The cap edge then CROSSES the head outline rather than
    // meeting it, and that step is exactly what reads as a hat resting on top
    // of a head instead of being worn on one. sqrt(1 - 0.26^2) = 0.966 lands
    // the corner on the silhouette; 0.97 leaves a hair of fabric proud of it.
    hem: 0.78, hemSide: 0.26, hemPow: 3, width: 0.97, crown: 1.26, hug: 0.94, tilt: 12,
    // Bill reaches 1.60R from the head centre, 0.6R clear of the skull. Its
    // inner end still sits at 0.16R, buried under the dome — that overlap is
    // the whole attachment, so the visor can be lengthened from the outside
    // without ever loosening the join.
    // Two things this went through. The wedge of hair that used to show between
    // bill and dome was a THICKNESS problem, not a height one: at ry 0.19 the
    // bill did not span the gap between the dome's edge and the band, so raising
    // it far enough to cover that span parked it up on the dome's shoulder. A
    // taller bill closes the same gap sitting low, where a bill belongs.
    //
    // Then the shape: a level, symmetric, round-ended lozenge sticking straight
    // out from a sphere does not read as a bill, and reads as other things. The
    // fix is not a tapered outline — a drawn wedge comes out a thin flap with
    // less mass than the ellipse — it is ANGLE. Tipped 9 deg down the same oval
    // reads as a visor shading the eyes. Reach is unchanged at 1.56R.
    // 1.56R and 3.1:1. Extending it was tried and reverted — 1.74R is simply too
    // much bill for the head, whether or not the depth is raised to hold the
    // aspect ratio. Worth knowing if it comes up again: length ALONE is not an
    // option, since it takes the ratio to 3.7:1 and elongation is exactly what
    // made the pre-angle version read wrong.
    billOval: [0.84, 0.16, 0.72, 0.23], billDown: 9,
    // faceDy is a lift from the 0.014 the bake-off settled on: the mask sits
    // 0.038R below where it always did rather than 0.067R. That costs the
    // fringe 0.029R of the gap it hangs into, so the longest centre lock now
    // ends about level with the brow instead of 0.065R clear of it. Deliberate
    // — they are both `p.m` brown and a little contact reads as hair meeting
    // brow, which is what hair under a cap does.
    hair: true, hairLock: 0.62, faceDy: 0.008, brow: 'bushy' },
  // Kept, and only kept, so the gallery can show the two side by side. This is
  // the geometry every screenshot before 2026-07-23 has: a flat chord at -0.12R
  // crossing 42% of the way down the eye, with both brow strokes drawn inside
  // the hat and showing only because the face paints after it.
  { id: 'was', label: 'was', note: 'pre-2026-07-23 — flat hem at -0.12R, cutting the eyes, brows on the cap',
    hem: 0.12, width: 1.02, crown: 1.14, bill: [0.8, 0.28, 0.5, 0.16], emblem: 0.75 },
];
const LORENZO_FACE = { variant: 'shipped' };
// Dev-only dial, for the gallery's was/is pair. Production never calls it.
export function setLorenzoFace(variant = 'shipped') {
  LORENZO_FACE.variant = variant;
}
const lorenzoFace = () => LORENZO_FACES.find((v) => v.id === LORENZO_FACE.variant) || LORENZO_FACES[0];

// The hem as a function of x, so hair, bills and seams can be hung off the band
// instead of guessed at. `hemPow` shapes the fall from the center height to the
// temples: 2 is exactly the quadratic the first pass drew as a bezier (that
// curve's x is linear in t, so its y works out to hem - xn^2*(hem - hemSide)),
// and higher powers hold the band flat across the face before dropping hard at
// the sides. That distinction matters: the brows reach out to x ~0.6, and a
// parabola is already halfway down by there, so the arch that cleared them at
// the nose was cutting into them at their outer ends.
function hemYAt(hx, hy, R, v, xn) {
  const side = v.hemSide != null ? v.hemSide : v.hem;
  const k = Math.pow(Math.min(1, Math.abs(xn)), v.hemPow != null ? v.hemPow : 2);
  return hy - R * (v.hem * (1 - k) + side * k);
}

// Dome + hem as one closed path. K is the circle-to-cubic constant, so a flat
// hem with width == crown - hem and hug == 1 gives a true semicircle.
//
// `hug` is what makes a raised cap sit ON the skull rather than hover over it.
// At hug 1 the side control points sit directly above the hem corners, so the
// cap leaves the hem vertically and bulges outboard of a head that is already
// curving inward at that height — a dome resting on top of a sphere. Pulling
// the controls in (hug < 1) starts the sides sloping inward straight off the
// band, the way fabric stretched over a skull does.
function capPath(c, hx, hy, R, v) {
  const K = 0.5523;
  const hemS = hemYAt(hx, hy, R, v, 1);
  const w = R * v.width;
  const hug = v.hug != null ? v.hug : 1;
  const top = hy - R * v.crown;
  const dh = hemS - top;
  c.moveTo(hx - w, hemS);
  c.bezierCurveTo(hx - w * hug, hemS - dh * K, hx - w * K, top, hx, top);
  c.bezierCurveTo(hx + w * K, top, hx + w * hug, hemS - dh * K, hx + w, hemS);
  // Front hem back to the left temple, sampled off hemYAt so band, bill seam
  // and fringe cannot disagree. A flat hem samples to a straight chord, which
  // is what `current` needs to stay byte-for-byte the shipped shape.
  for (let i = 15; i >= 0; i--) {
    const xn = -1 + (2 * i) / 16;
    c.lineTo(hx + w * xn, hemYAt(hx, hy, R, v, xn));
  }
  c.closePath();
}

// The hair's hidden top: the SKULL, not a guess at one. It used to be a
// quadratic aimed at 0.86 of the crown height — but a quadratic only reaches a
// QUARTER of the way to its control point (apex = (P0+2P1+P2)/4), so it topped
// out at -0.607R while the cap's front hem sat at -0.66R. The hair stopped
// below the hem: a brown blob parked under the cap rather than a head of hair
// the cap is covering. Riding the head's own circle, it cannot fall short at
// any hem, and since the tilt pivots on the head center this arc maps onto the
// skull exactly even when the hat is rocked.
function hairCrown(c, hx, hy, R, v) {
  const w = R * v.width;
  const ly = hemYAt(hx, hy, R, v, -1), ry = hemYAt(hx, hy, R, v, 1);
  c.moveTo(hx - w, ly);
  // Canvas y grows downward, so sweeping clockwise from the left hem angle to
  // the right one passes over the CROWN, not under the chin.
  c.arc(hx, hy, R * 0.99, Math.atan2(ly - hy, -w), Math.atan2(ry - hy, w), false);
  c.lineTo(hx + w, ry);
}

// Tufted alternative to the scalloped fringe: a handful of distinct locks
// poking out along the band instead of one continuous mass. Leans with travel.
// Each lock is a bluntSpike rooted on two hem points — same band-relative
// construction as the band itself, so it follows whatever curve the hem has.
function capTufts(c, hx, hy, R, v) {
  const w = R * v.width;
  const drop = R * (v.hairLock != null ? v.hairLock : 0.16);
  // The band under the hat: crown over the top, then back along the HEM. It
  // used to close with a straight lineTo between the two hem corners — but the
  // hem is high in the middle and low at the temples, so that chord ran 0.42R
  // BELOW the hem across the centre and dumped a brown mass over his forehead.
  // Only the locks below are supposed to show.
  hairCrown(c, hx, hy, R, v);
  for (let i = 16; i >= 0; i--) {
    const xn = -1 + (2 * i) / 16;
    c.lineTo(hx + w * xn, hemYAt(hx, hy, R, v, xn));
  }
  c.closePath();
  // The last span reaches the band's own corner. It used to stop at 0.9, and
  // with the hat rocked back that left the stretch between there and the corner
  // bare — right above the right ear, where the bill already hides the lock
  // inboard of it, so that side read as shaved. The third number scales that
  // lock's reach: at the corner the band is at its lowest, so a lock the same
  // length as its neighbours hangs to the jaw and reads as a sideburn. Half
  // length is a wisp escaping the band, which is all that gap needs.
  for (const [a, b, scale = 1] of [
    [-0.88, -0.52], [-0.52, -0.16], [-0.16, 0.2], [0.2, 0.56], [0.56, 0.86], [0.86, 1.0, 0.5],
  ]) {
    const mid = (a + b) / 2;
    // Locks hang deeper the further out they sit. Not a stylistic flourish: the
    // brows live under the middle of the band and top out at -0.469R, so a lock
    // long enough to read at the temple lands in his eyebrow at the nose. Out
    // past the brows there is nothing to collide with, which is also where hair
    // under a tilted cap actually escapes.
    // |mid| is clamped before it drives the reach: the new outermost lock sits
    // at 0.93, and ungoverned that profile would hang it to the jaw as a
    // sideburn rather than a bit of hair escaping the band.
    const reach = drop * scale * (0.5 + 0.5 * Math.pow(Math.min(Math.abs(mid), 0.78), 1.2));
    bluntSpike(c,
      hx + w * a, hemYAt(hx, hy, R, v, a),
      hx + w * (mid + 0.06), hemYAt(hx, hy, R, v, mid) + reach,   // tip, leaning with travel
      hx + w * b, hemYAt(hx, hy, R, v, b), 0.3);
  }
}

// Caterpillar brows: hair rather than expression, so unlike the ink hairlines
// they stay on the face through blinks and cheers. Thick at the outer end,
// tapering toward the nose, and they steepen when he is concentrating.
function bushyBrows(ctx, p, u, cx, cy, ex, ow) {
  const sep = 0.075 * u;
  const drop = ex.focus ? 0.012 * u : ex.surprise || ex.cheer ? -0.014 * u : 0;
  // Celebrating, the eyes squeeze into delighted ^ ^ arcs — and a brow that
  // holds its scowl through that reads as a face wearing two expressions at
  // once. Hair brows have to move with the mood the way the ink ones do by
  // being switched off. So: both ends ride up, and the INNER end lifts further,
  // which is what flattens the caterpillar's angry slant into a happy arch.
  // 0.016u, not more: at the arched bands these sit ~0.05R under the hem, and
  // a bigger lift parks his eyebrows inside his hat.
  const lift = ex.joy ? 0.016 * u : 0;
  const arch = ex.joy ? 0.01 * u : 0;
  for (const sx of [-1, 1]) {
    const ox = cx + sx * (sep + 0.045 * u), oy = cy - 0.086 * u - lift;   // outer, over the temple
    const ix = cx + sx * (sep - 0.052 * u), iy = cy - 0.05 * u + drop - lift - arch; // inner, toward the nose
    outlined(ctx, p.m, hair(0.3, ow * 0.3) * INK.face, (c) => {
      c.moveTo(ox, oy + 0.015 * u);
      c.quadraticCurveTo(cx + sx * sep, oy - 0.016 * u, ix, iy - 0.009 * u);
      c.lineTo(ix, iy + 0.009 * u);
      c.quadraticCurveTo(cx + sx * sep, oy + 0.02 * u, ox, oy + 0.015 * u);
      c.closePath();
    });
  }
}

// How much hair a long-hair cut actually hangs, as two multipliers on the one
// rim shape every one of those cuts shares (see drawHead's `longHair` block).
// `long` is the shipped read for all four heads that use it and is exactly the
// identity — nothing changes for braid, pony or bun by this table existing.
//
// `fall` is how far below the head's centre the hair reaches and `flare` how far it
// stands proud of the skull. Two shorter cuts were built and lost: `crop` (to the
// ear) and `up` (nothing at the nape), both of which also carried two loose temple
// wisps to keep a bare nape reading as hair. Gone rather than parked — the record
// is in docs/notes/kiko-persona.md.
const HAIR_CUTS = {
  long: { fall: 1, flare: 1 },
  // Cut level just above the jaw — KIKO. Nothing reaches the shoulder, so her
  // qipao keeps its collar and yoke, which is the whole reason the length moved.
  jaw: { fall: 0.6, flare: 0.9 },
  // Pulled TIGHT to the skull — the raider. Worn with a plait or a tail, the
  // full rim read as a second hairstyle: a bob at the sides AND a rope down the
  // back. Gathered hair hugs the head, so the flare comes down hard (the
  // proudness of the rim is exactly the "bob" part of the read) and the side
  // falls stop at the cheek, behind the ears, instead of past the jaw — the
  // length this head has to show lives entirely in what hangs off the back.
  // First pass sat at 0.5/0.55 and still carried a hint of bob; it came in
  // again. 0.35 flare is near the floor — below that the crescent outside the
  // skull is too thin to say "hair" at all and the head reads shaved.
  pulled: { fall: 0.42, flare: 0.35 },
};

// Short ribbon ends fanning out of each bun's wrap, as [angle°, length, width].
// 0° points straight outboard and negative is up; length and width are both in
// bun radii. ADDITIVE — the long hanging tails are untouched by every entry
// here, including the empty default: the tie's streamer and the tie's cut ends
// are two different pieces of the same ribbon and the reference has both.
//
// Only reachable through drawToon's `opts.spec` seam for now, i.e. from a
// gallery lab section. Kept short in every style for the reason the call site
// spells out: past about one bun radius a stub stops reading as a cut end and
// starts competing with the tail for the silhouette.
// Angles are kept LOW and lengths long enough to droop. The first pass fanned
// four short ends steeply upward off each bun and the result was unmistakable
// and wrong: a pair of white spikes, or a crab claw. Cloth ends are heavy — they
// leave the knot roughly sideways and fall — so nothing here points above about
// 50° and every entry is long enough that its own bow can sag. They came back in
// size after that: at a full bun radius they were the largest thing on her head
// and the bun they are tied to was reading as their hub. Then back OUT again by
// about a fifth, which is where they sit now — the droop and the hard taper are
// what let a stub be long without reading as a flag, and neither existed when
// length was first tried.
//
// The WIDTHS then came down by half, separately from the lengths, and the lengths
// went up again with them. Those two dials pull in opposite directions and the
// ratio is what matters: length was never what made a stub heavy — a long thin cut
// end is ribbon, a short fat one is a paddle. They are now the finest and longest
// they have been, which is the same shape read at a different weight.
const BUN_STUBS = {
  // Two ends, one just above horizontal and one below, straddling the long tail's
  // root. Chosen over two longer ones and over three staggered at mixed lengths: it
  // says "tied" and costs almost no head width, where three long marks stop a bun
  // reading as one shape. The losers are gone, not parked — see the persona note.
  pair: [[-28, 1.25, 0.16], [22, 1.12, 0.14]],
};

// The fringe, as a shape plus two independent modifiers. `sweep` is the shipped
// read for every long-hair head and is the identity — no lift, no locks.
//
//   shape     'sweep', a side part across the brow. The only shape there is:
//             'parted' (a centre part meeting in a point between the brows) and
//             'choppy' (a row of pointed clumps at alternating depths) were both
//             built, both lost the bake-off, and both came out — each was a
//             second copy of the fringe path and would now need a second copy of
//             the tuft rooting as well. docs/notes/kiko-persona.md has the record.
//   back      how far the fringe's LOWER EDGE lifts off the brow, in R. This is
//             the hairline: the temple ends stay put, so what opens up is a band
//             of forehead rather than a shorter fringe. The brow's own top is at
//             -0.633R, which is what caps this at about 0.2.
//   tendrils  the loose locks that fall out of a fringe onto the forehead.
//   twin      the W: three teeth cut into the hairline instead of one lock.
// The W's shape has five more numbers, all left at their defaults in the painter
// because only one combination survived: `wMid` (the root shared by the front and
// middle teeth, which is what puts the W right of centre), `wBack` (the middle
// tooth's outer root — how wide its base is), `midDrop` (how far its point comes
// down; with wBack this is what POINTINESS is, being the ratio of the two and not
// either alone), and `tailDrop` / `tailW` for the fine stray behind it.
//   pile      lifts the CROWN — of the fringe and of the mass behind the skull
//             together — so more hair sits on top. Length is untouched.
//
// `choppy` carries no `back` because its clump tips and notches are already
// measured against the brow — the setback is in the points themselves.
const FRINGES = {
  // The default for every long-hair head but Kiko's, and the identity: no setback,
  // no pile, no locks.
  sweep: { shape: 'sweep' },
  // KIKO. Hairline back 0.15R off the brow, 0.09R of hair piled on the crown, and
  // the W cut into the hairline — a wide shallow front slope, a pointed middle
  // tooth on a 0.33R base against a 0.26R drop, and a fine stray behind it.
  'twin-pile': { shape: 'sweep', back: 0.15, tendrils: true, twin: true, pile: 0.09 },
  // The raider. Hair gathered into a plait pulls the fringe with it, so the
  // hairline sits back 0.16R off the brow and the forehead shows — a fringe
  // down on the brow under a pulled-tight cut read as two decisions on one
  // head. No pile: gathered hair is flat on the crown, not stacked.
  'swept-back': { shape: 'sweep', back: 0.16 },
  // swept-back with hair coming loose at the temples. The numeric tendril
  // counts are wisps ONLY — the central forelock was tried on this head and
  // cut ("don't like the forelock"), so the escape happens at the sides where
  // gathered hair actually loses strands. 2 is one pair in front of the ears;
  // 4 and 6 add inboard, shallower pairs — see WISP_PAIRS.
  'swept-wisps': { shape: 'sweep', back: 0.16, tendrils: 2 },
  'swept-wisps-4': { shape: 'sweep', back: 0.16, tendrils: 4 },
  'swept-wisps-6': { shape: 'sweep', back: 0.16, tendrils: 6 },
};

// Head + hat + face, anchored at head center (hx, hy). Shared by the body
// rig and the face-crop sprites.
// ------------------------------------------------ gold in Fernwick's hair
// A BAKE-OFF SEAM. `spec.hairStreaks` names a highlight style, and nothing
// but this block reads it: unset — which is every shipped hero, Fernwick
// included until one of these wins — the hair fills flat the way it always
// has and not one drawing call changes. The candidates live in
// src/dev/fernwick-hair-candidates.js and reach the painter through
// drawToon's `opts.spec` seam, the same way every hero candidate does.
//
// The marks are painted INSIDE the hair's own path, clipped to it, right
// after the fill and before the headband goes over the top: a strand drawn
// free-hand at these sizes lands half on the hair and half on her cheek.
// Two regions carry them — the swept bangs on the skull and the kicked cheek
// tufts — and each hands this its own coordinate mappers, so a style
// describes its strands once in hair space and both regions place them.
//
// Every tone is derived FROM THE PALETTE's own hair colour rather than
// written as a second hex, so a candidate that recolours her hair keeps its
// highlights: the pale end runs toward bleached gold, the dark end toward
// warm honey, and neither goes to white or to grey, which is what separates
// blonde hair from a metal helmet.
const HAIR_PALE_RGB = [255, 243, 198];
const HAIR_DEEP_RGB = [138, 88, 30];
function hairTone(hex, t) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const to = t >= 0 ? HAIR_PALE_RGB : HAIR_DEEP_RGB;
  const k = Math.min(1, Math.abs(t));
  const out = rgb.map((v, i) => Math.round(v + (to[i] - v) * k));
  return `rgb(${out[0]},${out[1]},${out[2]})`;
}
// The four tones a style draws from. A palette may name any of them itself
// (`hairLight`, `hairPale`, `hairDark`) — Chompo's already carries two — and
// what it does not name is mixed off the base.
function hairTones(p) {
  const base = p.hair || p.a;
  return {
    base,
    lit: p.hairLight || hairTone(base, 0.4),
    pale: p.hairPale || hairTone(base, 0.72),
    deep: p.hairDark || hairTone(base, -0.45),
  };
}
// Strand skeletons, one table per region: [x0,y0, cx,cy, x1,y1] quadratics in
// that region's own space, ordered outer-then-inner down each side with the
// crown pair last. A style takes a subset by index, so "two strands" and "six
// strands" are the same curves at different densities rather than two
// different hairstyles.
//
// WHERE THE HAIR ACTUALLY IS. The first set of these was drawn down the head
// as though the whole skull were hair, and most of it clipped away: under a
// headband the visible hair is two NARROW side bands — about 0.2R wide at the
// jaw, 0.32R at the eye line — plus the strip of crown above the band. A
// strand at 0.6R from centre is inside her face at that height, not in her
// hair, and the clip ate it. Every curve below lives inside one of those.
const HAIR_STRANDS = {
  bangs: [
    [-0.55, -1.18, -1.08, -0.70, -1.05, 0.45],
    [-0.70, -1.05, -0.92, -0.50, -0.90, 0.48],
    [-0.15, -1.30, -0.55, -1.20, -0.80, -0.92],
    [0.45, -1.20, 1.05, -0.72, 1.03, 0.45],
    [0.62, -1.05, 0.90, -0.50, 0.90, 0.48],
    [0.12, -1.32, 0.55, -1.20, 0.86, -0.85],
  ],
  lock: [
    [1.06, 0.78, 1.36, 0.62, 1.60, 0.66],
    [1.02, 0.88, 1.36, 1.02, 1.60, 1.16],
    [0.98, 0.96, 1.14, 1.20, 1.31, 1.36],
  ],
};
// `geom` is the region's own mapper pair plus the head radius: X/Y take hair
// space to the canvas, and everything below is written in hair space.
function drawHairStreaks(ctx, spec, p, ow, pathFn, geom) {
  const style = spec.hairStreaks;
  if (!style) return;
  const { X, Y, R, region } = geom;
  const t = hairTones(p);
  const S = HAIR_STRANDS[region] || [];
  const bangs = region === 'bangs';
  const rgba = (hex, a) => browInk(hex, a, 0);
  ctx.save();
  ctx.beginPath();
  pathFn(ctx);
  ctx.clip();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The clip is the only thing bounding a gradient or a half-plane fill, so
  // both are laid down over a box that is certain to cover the whole region.
  // The mappers are affine, so three radii out in hair space is past any
  // corner of it whichever way round the side flips them.
  const cx0 = Math.min(X(-3), X(3)), cx1 = Math.max(X(-3), X(3));
  const cy0 = Math.min(Y(-3), Y(3)), cy1 = Math.max(Y(-3), Y(3));
  const coverAll = () => ctx.fillRect(cx0, cy0, cx1 - cx0, cy1 - cy0);
  const strand = (s, col, w, a = 1, dash = null) => {
    ctx.save();
    ctx.globalAlpha *= a;
    if (dash) { ctx.setLineDash(dash.map((d) => R * d)); ctx.lineCap = 'butt'; }
    ctx.strokeStyle = col;
    ctx.lineWidth = hair(0.5, R * w);
    ctx.beginPath();
    ctx.moveTo(X(s[0]), Y(s[1]));
    ctx.quadraticCurveTo(X(s[2]), Y(s[3]), X(s[4]), Y(s[5]));
    ctx.stroke();
    ctx.restore();
  };
  // A gradient down the fall: `y0`/`y1` are hair-space heights, the stops are
  // [offset, colour, alpha].
  const ramp = (y0, y1, stops) => {
    const g = ctx.createLinearGradient(X(0), Y(y0), X(0), Y(y1));
    for (const [at, col, a] of stops) g.addColorStop(at, rgba(col, a));
    ctx.save();
    ctx.fillStyle = g;
    coverAll();
    ctx.restore();
  };
  // A band that follows the head's own curve: a fat circle stroked about the
  // head centre and cut to the hair. Used where a section has to hug the
  // silhouette rather than run straight across it.
  const ring = (r, w, col, a = 1) => {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.strokeStyle = col;
    ctx.lineWidth = R * w;
    ctx.beginPath();
    ctx.arc(X(0), Y(0), R * r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  // A straight band in hair space, given as a thick line between two points.
  const band = (x0, y0, x1, y1, w, col, a = 1, butt = true) => {
    ctx.save();
    ctx.globalAlpha *= a;
    if (butt) ctx.lineCap = 'butt';
    ctx.strokeStyle = col;
    ctx.lineWidth = R * w;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(y0));
    ctx.lineTo(X(x1), Y(y1));
    ctx.stroke();
    ctx.restore();
  };

  // ROUND TWO. The first round narrowed to the ombré and the lowlights, and
  // the note on the ombré was that it reads too light — so the two stopped
  // being separate options and became one dial pair, given as an object
  // instead of a name: how far the fall lifts, and how much honey runs
  // through it. Every remix below is those two numbers, which is why they can
  // be mixed at all. The named styles under this are the first round's
  // vocabulary and stay reachable.
  if (style && typeof style === 'object') {
    const { ombre, low } = style;
    if (ombre) {
      // `tone` picks what the fall runs TOWARD: 'pale' is the bleached end
      // that read too light on its own, 'lit' a warm gold that deepens the
      // colour instead of washing it out.
      const end = ombre.tone === 'lit' ? t.lit : t.pale;
      const peak = ombre.peak ?? 0.9;
      const start = ombre.start ?? 0.45;
      ramp(bangs ? -1.05 : 0.6, bangs ? 0.7 : 1.45,
        [[0, t.base, 0], [start, t.lit, peak * 0.37], [1, end, peak]]);
    }
    if (low) {
      const idx = bangs ? (low.idx || [1, 2, 4, 5]) : [0, 2];
      for (const i of idx) strand(S[i], t.deep, low.w ?? 0.14, low.alpha ?? 0.65);
    }
    ctx.restore();
    return;
  }
  if (style === 'pair') {
    // A — TWO STRANDS. The least that still reads: one lit strand per side,
    // placed where the sweep is widest.
    for (const i of bangs ? [0, 3] : [1]) strand(S[i], t.pale, 0.12, 0.85);
  } else if (style === 'fine') {
    // B — SIX FINE STRANDS. Highlight and lowlight alternating, hair-width
    // marks: from a distance it is one richer gold, up close it is strands.
    S.forEach((s, i) => strand(s, i % 2 ? t.deep : t.pale, 0.08, i % 2 ? 0.55 : 0.9));
  } else if (style === 'money') {
    // C — THE MONEY PIECE. One broad pale panel down the front of the sweep
    // on each side, framing the face. Chunky, opaque, modern.
    // The panel is CUT, not blended: a honey hairline down its inboard side
    // is what makes a wide pale stroke read as a section of hair rather than
    // as a light left on her head.
    for (const i of bangs ? [1, 4] : [2]) {
      strand(S[i], t.pale, 0.26, 1);
      strand(S[i], t.deep, 0.05, 0.5);
    }
  } else if (style === 'ombre') {
    // D — OMBRE TIPS. Base at the crown running to bleached at the ends.
    ramp(bangs ? -1.05 : 0.6, bangs ? 0.7 : 1.45,
      [[0, t.base, 0], [0.45, t.lit, 0.35], [1, t.pale, 0.95]]);
  } else if (style === 'roots') {
    // E — DEEP ROOTS. The reverse: honey at the parting, gold below it. Warm
    // rather than bright, and the one option that darkens more than it lifts.
    ramp(bangs ? -1.25 : 0.55, bangs ? 0.5 : 1.4,
      [[0, t.deep, 0.85], [0.4, t.deep, 0.22], [0.75, t.pale, 0.3], [1, t.pale, 0.7]]);
  } else if (style === 'sections') {
    // F — THREE FLAT SECTIONS. No blend anywhere: a pale band along the
    // silhouette, the base gold through the middle, honey where the hair
    // meets the face. Hard edges, the way the rest of the cast is painted.
    if (bangs) {
      ring(1.14, 0.34, t.pale);
      ring(0.84, 0.3, t.deep, 0.9);
    } else {
      band(1.62, 0.5, 1.62, 1.5, 0.4, t.pale);
      band(1.02, 0.5, 1.02, 1.5, 0.3, t.deep, 0.9);
    }
  } else if (style === 'ribbon') {
    // G — ONE SOFT RIBBON. A wide, low-contrast sheen down each fall with a
    // brighter core, so it reads as light ON the hair rather than as painted
    // strands in it.
    for (const i of bangs ? [0, 3] : [1]) {
      strand(S[i], t.lit, 0.28, 0.6);
      strand(S[i], t.pale, 0.11, 0.9);
    }
  } else if (style === 'woven') {
    // H — WOVEN CHUNKS. Every strand broken into hard-ended sections that
    // step down the fall, alternating tone: the plaited, sectioned look.
    S.forEach((s, i) => strand(s, i % 2 ? t.lit : t.pale, 0.22,
      i % 2 ? 0.9 : 1, [0.3, 0.18]));
  } else if (style === 'split') {
    // I — SPLIT. One hard line across the hair with a different gold on each
    // side of it and a honey seam on the join. The boldest, and the only one
    // that changes the shape's read at lane size.
    ctx.save();
    ctx.fillStyle = rgba(t.pale, 0.9);
    ctx.beginPath();
    if (bangs) {
      ctx.moveTo(X(-1.4), Y(-0.35));
      ctx.lineTo(X(1.4), Y(0.25));
      ctx.lineTo(X(1.4), Y(1.4));
      ctx.lineTo(X(-1.4), Y(1.4));
    } else {
      ctx.moveTo(X(0.6), Y(1.02));
      ctx.lineTo(X(2.1), Y(0.86));
      ctx.lineTo(X(2.1), Y(1.8));
      ctx.lineTo(X(0.6), Y(1.8));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (bangs) band(-1.4, -0.35, 1.4, 0.25, 0.09, t.deep, 0.75);
    else band(0.6, 1.02, 2.1, 0.86, 0.08, t.deep, 0.75);
  } else if (style === 'lowlight') {
    // J — LOWLIGHTS ONLY. Nothing pale at all: three honey strands under the
    // gold. Depth without raising the hair's brightness, which is the one
    // thing that competes with her face.
    for (const i of bangs ? [1, 2, 4, 5] : [0, 2]) strand(S[i], t.deep, 0.14, 0.65);
  }
  ctx.restore();
}

function drawHead(ctx, id, spec, p, u, ow, hx, hy, lod, pose = {}) {
  id = spec.faceLike || id;
  const turnLimit = Math.PI * 5 / 12;
  // `turn` moves the whole humanoid rig. `headTurn` is an independent,
  // gallery-only FACIAL experiment: production poses never set it, and it must
  // not squeeze the skull, hat, hair or ears. Whole-body turn keeps its existing
  // head transform; a headTurn candidate only feeds the directional face below.
  const bodyTurn = Number(pose.turn) || 0;
  const requestedHeadTurn = Number(pose.headTurn ?? bodyTurn) || 0;
  // B-33P's eyes are panels mounted inside a rigid visor. A full facial shift
  // reads as bad registration, not anatomy, so he gets only a trace of far-eye
  // foreshortening and no mask translation.
  const headTurn = id === 'b33p' ? requestedHeadTurn * 0.5 : requestedHeadTurn;
  const outlineTurn = pose.headTurn == null ? bodyTurn : 0;
  const outlineRad = Math.max(-turnLimit, Math.min(turnLimit, outlineTurn * Math.PI / 180));
  const outlineYaw = Math.sin(outlineRad);
  const outlineDepth = Math.abs(outlineYaw);
  const faceRad = Math.max(-turnLimit, Math.min(turnLimit, headTurn * Math.PI / 180));
  const faceYaw = Math.sin(faceRad);
  const faceDepth = Math.abs(faceYaw);
  if (outlineDepth > 0.001) {
    // A turned head is not just a squeezed front-facing face: the near cheek
    // advances and the far side foreshortens, carrying the eye spacing with it.
    const nearShift = -outlineYaw * 0.025 * u;
    ctx.save();
    ctx.translate(hx + nearShift, hy);
    ctx.scale(1 - 0.08 * outlineDepth, 1);
    ctx.translate(-hx, -hy);
  }
  const R = (spec.heavy ? 0.22 : 0.21) * u * (spec.headScale || 1);
  // The bun geometry, named once because TWO passes need it: the behind-head pass
  // paints the buns, their wrap and their ribbon, and the very last pass paints
  // the gold beads on top of the finished head. See BUN_BEAD_ARC.
  // Named oxR/oxY/oxX rather than bun*: the half-up cut further down has its own
  // `bunX`/`bunY` for the knot at its nape, and one pair of names meaning two
  // different buns in one function is a trap for whoever moves code next.
  const oxR = R * 0.46, oxY = hy - R * 0.82, oxX = (sx) => hx + sx * R * 1.02;
  // The three long-hair cuts share a head: one mass behind the skull, one
  // fringe on it, and only what hangs off the back changes. Named once here
  // because both halves of drawHead ask for it and they sit either side of the
  // skull's own fill.
  const longHair = spec.head === 'braid' || spec.head === 'pony' || spec.head === 'bun'
    || spec.head === 'buns' || spec.head === 'loose';
  const compactFloppy = spec.head === 'floppy' && spec.floppyHat === 'compact';
  // Looked up out here rather than beside the fringe it mostly describes,
  // because `pile` belongs to BOTH halves of the hair: the mass behind the skull
  // and the fringe on it have to rise together or the extra volume is a fringe
  // sitting proud of its own hairline.
  const fr = FRINGES[spec.fringe] || FRINGES.sweep;
  // Set by the reference-hair pass below and read by the headband, which clips
  // to it. Null on every head that has no swept bangs.
  let bangPath = null;
  // hair/hat layers that sit BEHIND the head
  if (spec.head === 'jackal') {
    // A matched pair of tall ears, near-symmetric with just a touch of lean so
    // Gnash still reads jackal-like without looking ragged.
    for (const [side, lean, height] of [[-1, -0.05, 1.52], [1, 0.05, 1.44]]) {
      outlined(ctx, p.h, ow, (c) => bluntSpike(c,
        hx + side * R * 0.72, hy - R * 0.32,
        hx + side * R * (0.5 + lean), hy - R * height,
        hx - side * R * 0.02, hy - R * 0.74));
    }
    // A tall central spike crowns the head between the ears.
    outlined(ctx, p.h, ow, (c) => bluntSpike(c,
      hx - R * 0.4, hy - R * 0.58,
      hx + R * 0.02, hy - R * 1.6,
      hx + R * 0.42, hy - R * 0.58));
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.8, hy + R * 0.05);
      c.lineTo(hx - R * 1.22, hy + R * 0.38);
      c.lineTo(hx - R * 0.66, hy + R * 0.52);
      c.closePath();
    });
  }
  // The bake-off species. Ears first and the cheek ruff under them, both behind
  // the skull — the ruff has to be cropped by the head or it reads as a collar.
  const ex = expressionFor(id, pose, spec);
  // Set by the animal face block; the mouth is clamped against it below.
  let animalNoseBottom = null;
  // How far the jaw dropped this frame, published for the same reason.
  let animalJaw = 0;
  const animal = ANIMAL_HEADS[spec.head];
  if (animal) {
    // The ruff goes down FIRST so the ears overlap it: fur tucks under an ear,
    // never over it. Swept DOWN and OUT, which is the single biggest lever
    // between "adorable" and "attitude" — the same fan swept up and back is
    // Gnash's quills.
    // `spec.ruff` overrides the table for the cheek-treatment round: 'none'
    // deletes the side fur, 'tuft' swaps the sideways scallop for a pair of
    // short DOWN-swept tufts at the jaw. Down matters: the sideways fan is
    // what kept reading as Gnash's quills however round its lobes got.
    const ruffKind = spec.ruff !== undefined ? spec.ruff : animal.ruff;
    if (ruffKind && ruffKind !== 'none' && !lod) {
      const ruffCol = p.furDark || p.p || p.h;
      for (const side of [-1, 1]) {
        if (ruffKind === 'tuft') {
          // Two soft tufts per side, rooted at the jaw and falling down-and-out
          // past the chin line — neck fluff, not a quill fan. Reach follows the
          // scallop's lesson: everything inboard of the skull silhouette is
          // painted over, and the wide-cheek head shape pushes that line to
          // ~1.24R at exactly this height, so the tips run well past it.
          // The tufts come in WITH the cheeks. Trimmed on their own the
          // silhouette narrows but the fluff still hangs out past it, which
          // reads as a slim face wearing the old face's sideburns.
          // The tufts come in with BOTH dials. On a tapered head they also sit
          // HIGHER, because the jaw they hang off has moved up and in — left at
          // the old height they hung past the chin of a face that no longer
          // reaches them.
          const tuftTaper = Math.max(0, Math.min(1, spec.faceTaper || 0));
          const tuftIn = (1 - 0.22 * Math.max(0, Math.min(1, spec.faceTrim || 0)))
            * (1 - 0.26 * tuftTaper);
          const tuftUp = 0.16 * tuftTaper;
          for (const [rootX, rootY, tipX0, tipY, w] of [
            [0.5, 0.5, 1.42, 0.92, 0.44],
            [0.3, 0.68, 1.0, 1.24, 0.38],
          ]) {
            const tipX = tipX0 * tuftIn;
            // The tufts hang off the jaw, so they lean with it — the same
            // face lead the skull's lower half takes, at the same depth ramp.
            // Left on hx they would pull the near-side fluff back off a chin
            // that had moved out from under them.
            const tuftLead = 0.01 * u * 0.7;
            outlined(ctx, p.h, ow, (c) => bluntSpike(c,
              hx + side * R * rootX + tuftLead, hy + R * (rootY - tuftUp - w * 0.5),
              hx + side * R * tipX + tuftLead, hy + R * (tipY - tuftUp),
              hx + side * R * rootX + tuftLead, hy + R * (rootY - tuftUp + w * 0.5), 0.6));
          }
        } else if (ruffKind === 'scallop') {
          // Three lobes down the cheek, each a blunt spike rooted on the skull
          // and falling outward. Widest in the middle, so the outline is a
          // scallop rather than a fringe.
          //
          // Two numbers matter here and both were wrong first time.
          //
          // REACH: the ruff is drawn BEHIND the skull, so everything inboard of
          // 1.0R is painted over by the head's own fill and the only ruff
          // anyone sees is what projects PAST the silhouette. Rooted at 0.66R
          // with tips at 1.2-1.44R that left three nubs at the jaw; the tips
          // run to 1.7R now, so there is an actual crescent of fur out there.
          //
          // ROUNDNESS: at 0.42 they read as three SPIKES, which is the Gnash
          // silhouette this cut exists to get away from. But 0.8 eats the lobe
          // — the straight run collapses to a fifth of its length and the shape
          // shrinks back to a nub whatever its reach. 0.55 is the setting that
          // is fur rather than quills and still arrives somewhere.
          for (const [rootY, outX, tipY, w] of [
            [-0.24, 1.52, 0.02, 0.46],
            [0.14, 1.70, 0.44, 0.52],
            [0.52, 1.44, 0.88, 0.42],
          ]) {
            outlined(ctx, p.h, ow, (c) => bluntSpike(c,
              hx + side * R * 0.6, hy + R * (rootY - w * 0.5),
              hx + side * R * outX, hy + R * tipY,
              hx + side * R * 0.6, hy + R * (rootY + w * 0.5), 0.55));
          }
          // A darker note tucked at the jaw so the ruff has a shadow side and
          // does not read as one flat paddle of fur.
          outlined(ctx, ruffCol, hair(0.5, ow * 0.6), (c) => bluntSpike(c,
            hx + side * R * 0.7, hy + R * 0.44,
            hx + side * R * 1.36, hy + R * 0.74,
            hx + side * R * 0.72, hy + R * 0.82, 0.5));
        } else {
          // The fox's lighter wisp: one swept tuft per cheek, no lobes. Same
          // reach lesson as the scallop above — it has to clear 1.0R to exist.
          outlined(ctx, p.h, ow, (c) => bluntSpike(c,
            hx + side * R * 0.64, hy - R * 0.04,
            hx + side * R * 1.46, hy + R * 0.42,
            hx + side * R * 0.62, hy + R * 0.54, 0.5));
        }
      }
    }
    for (const side of [-1, 1]) animalEar(ctx, p, ow, hx, hy, R, side, animal, spec.earShape || animal.earShape, spec.earSize ?? 1, spec.earAngle, spec.earWidth ?? 1);
  }
  if (spec.head === 'floppy' && !spec.princessWear) {
    // A single long pointed tail streams behind from the back of the bandana,
    // tapering to a tip that lags and bobs with motion. Drawn BEHIND the head
    // so it reads as gathered at the back and trailing out to the side.
    const motion = pose.kind === 'run' || pose.kind === 'jump';
    const wave = motion ? Math.sin((pose.time || 0) * 7) * R * 0.2 : 0;
    // At rest the long tail drapes down his back under its own weight; running
    // and jumping fling it out behind him.
    const tipX = hx - R * (motion ? (compactFloppy ? 1.18 : 1.86) : (compactFloppy ? 0.74 : 0.98));
    const tipY = hy + R * (motion ? (compactFloppy ? 0.12 : 0.52) : (compactFloppy ? 0.7 : 1.06))
      + wave * (compactFloppy ? 0.45 : 1);
    outlined(ctx, p.h, ow, (c) => {
      const rootY = compactFloppy ? -0.58 : -0.8;
      const outerX = compactFloppy ? 0.98 : (motion ? 1.4 : 1.26);
      const outerY = compactFloppy ? -0.28 : (motion ? -0.14 : 0.22);
      const innerX = compactFloppy ? 0.82 : (motion ? 1.24 : 0.68);
      const innerY = compactFloppy ? 0.22 : (motion ? 0.44 : 0.62);
      c.moveTo(hx - R * 0.66, hy + R * rootY);                                 // short root at the back of the compact cap
      c.quadraticCurveTo(hx - R * outerX, hy + R * outerY + wave * (compactFloppy ? 0.5 : 1), tipX, tipY); // small floppy point
      c.quadraticCurveTo(hx - R * innerX, hy + R * innerY + wave * (compactFloppy ? 0.35 : 1), hx - R * 0.42, hy - R * 0.16); // back to the cap
      c.closePath();
    });
    if (!lod) dot(ctx, tipX, tipY, R * 0.12, p.a);
  }
  // Gallery-only princess studies. These are deliberately an overlay on the
  // shipped floppy-cap head rather than a new head rig: the question is whether
  // a small amount of hair and one headpiece can make Fernwick read as a
  // princess while the existing face, cap and silhouette stay hers. Production
  // Fernwick has no `pigtails` or `princessHeadpiece` fields, so this branch is
  // inert outside a candidate passed through opts.spec.
  if (spec.referenceHair && !lod) {
    // Short gathered tufts below the ears: a pinched tie, then three broad
    // tapered locks. The connecting temple hair is painted over the skull.
    const kicked = spec.referenceHair === 'kicked';
    // Keep the ties and tufts attached to the cheek locks. The head's parent
    // transform supplies their movement along with the fringe, ears and cap.
    for (const side of [-1, 1]) {
      // `lockIn` pulls the whole lock toward the face, in head radii — hair
      // that sits ON the shoulders rather than standing off them. It moves the
      // lock, not its shape, so the silhouette is the same one moved inboard.
      const X = (x) => hx + side * R * (0.97 + (x - 0.97) * (spec.lockWidth ?? 1) - (spec.lockIn || 0));
      // The tufts bounce on the STRIDE while she runs and on her VERTICAL
      // SPEED while she is in the air — gated to the run alone they were dead
      // still in the jump, on the most visible head in the cast, while her
      // skirt and her quiver both moved. Rising lifts them, falling drops
      // them, which is the lag hair has on a body that has just left the
      // ground.
      const airT = pose.kind === 'jump'
        ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160)) : 0;
      const bounce = !spec.tuftBounce ? 0
        : pose.kind === 'run'
          ? Math.sin((pose.phase || 0) * Math.PI * 4 + side * 0.25) * 0.055
          : pose.kind === 'jump'
            ? -airT * 0.075 + Math.sin((pose.time || 0) * 5 + side * 0.4) * 0.018
            : 0;
      const Y = (y) => hy + R * (0.76 + (y - 0.76) * (spec.lockLength ?? 1)
        - (spec.lockLift || 0) + bounce * Math.max(0, (y - 0.87) / 0.73));
      const rootY = spec.joinedLocks ? 0.71 : 0.67;
      const rootX = spec.joinedLocks ? 1.03 : 0.91;
      if (spec.referenceHair === 'flow') {
        // ONE SMOOTH LOCK, one point. The kicked and soft cuts are the same
        // polygon with two steps cut into the outer edge, and at this size the
        // pair of steps reads as a notch — a paddle with a bite out of it
        // rather than as hair. This is the same lock drawn as two curves and a
        // tip: it bulges below the tie, tapers, and ends in a single point.
        // `lockWave` bends the taper into an S; 0 hangs straight.
        const w = spec.lockWave ?? 0;
        // FULLNESS IS THICKNESS, NOT REACH. The shared X() widens a lock about
        // the head's own edge, so asking for more hair pushed the outer
        // boundary further and further outboard — past a certain width the
        // locks stood out like wings and covered the sleeves instead of
        // hanging. This mapper scales the lock about ITS OWN centre line, so
        // more hair gets thicker where it hangs and the outer edge barely
        // moves. The tip stays near the body whatever the length, because hair
        // this long hangs down rather than out.
        // Thickness grows INBOARD. The outer edge is the silhouette and the
        // one thing that must not keep marching outboard — past about 1.5R the
        // locks stand off her shoulders like wings and cover the sleeves — so
        // it takes less than half the extra width, and the rest is taken on the
        // inner edge, which is behind her face and free.
        const LC = 1.12, th = spec.lockWidth ?? 1;
        const outFac = 1 + (th - 1) * 0.4;
        const XT = (x) => hx + side * R * (LC + (x - LC) * (x >= LC ? outFac : th));
        // Long hair hangs DOWN, not out: the further the lock falls the closer
        // its tip sits to the body, or the pair reads as a cape held open.
        const len = spec.lockLength ?? 1;
        const inPull = Math.max(0, Math.min(0.45, (len - 1.3) * 0.3));
        const XP = (x) => hx + side * R * ((LC + (x - LC) * (x >= LC ? outFac : th)) * (1 - inPull));
        // FULLNESS without anything behind her: a second, shorter lock tucked
        // just inboard of the main one on each side. Drawn first, so the main
        // lock laps it and the pair reads as one thick fall broken into two
        // pieces — which is what hair does — rather than as two pigtails.
        // Rear falls were tried for this and rejected; the volume has to be
        // in the locks beside her face.
        if (spec.lockPair) {
          const q = spec.pairSize ?? 1;
          outlined(ctx, p.hair || p.a, ow, (c) => {
            c.moveTo(X(rootX - 0.06), Y(rootY));
            c.quadraticCurveTo(XT(1.22 * q), Y(0.86), XT(1.16 * q - w * 0.12), Y(1.06));
            c.quadraticCurveTo(XP(1.14 * q - w * 0.24), Y(1.3), XP(0.94 + w * 0.24), Y(1.44));
            c.quadraticCurveTo(XT(0.96), Y(1.18), X(0.84), Y(0.98));
            c.closePath();
          });
        }
        outlined(ctx, p.hair || p.a, ow, (c) => {
          c.moveTo(X(rootX), Y(rootY));
          c.quadraticCurveTo(XT(1.42), Y(0.82), XT(1.34 - w * 0.18), Y(1.14));
          c.quadraticCurveTo(XP(1.3 - w * 0.34), Y(1.44), XP(1.02 + w * 0.36), Y(1.66));
          c.quadraticCurveTo(XP(1.02 - w * 0.1), Y(1.3), XT(0.86), Y(1.02));
          c.quadraticCurveTo(X(0.8), Y(0.94), X(0.9), Y(0.91));
          c.closePath();
        });
        if (!lod) {
          // One strand down the lock, same mark the back falls carry.
          ctx.save();
          ctx.globalAlpha *= 0.45;
          ctx.strokeStyle = p.hairDark || p.f;
          ctx.lineWidth = hair(0.45, ow * 0.7);
          ctx.beginPath();
          ctx.moveTo(XT(1.06), Y(0.92));
          ctx.quadraticCurveTo(XT(1.22 - w * 0.2), Y(1.24), XP(1.04 + w * 0.28), Y(1.56));
          ctx.stroke();
          ctx.restore();
        }
        continue;
      }
      // Named, because the highlight pass clips to this exact tuft — see
      // drawHairStreaks. The path itself is unchanged.
      const lockPath = (c) => {
        c.moveTo(X(rootX), Y(rootY));
        c.quadraticCurveTo(X(1.24), Y(kicked ? 0.48 : 0.7), X(kicked ? 1.7 : 1.38), Y(kicked ? 0.62 : 1.0));
        c.lineTo(X(kicked ? 1.45 : 1.24), Y(kicked ? 0.79 : 1.02));
        c.quadraticCurveTo(X(kicked ? 1.78 : 1.51), Y(0.93), X(kicked ? 1.72 : 1.36), Y(kicked ? 1.26 : 1.5));
        c.lineTo(X(kicked ? 1.46 : 1.18), Y(kicked ? 1.12 : 1.28));
        c.lineTo(X(kicked ? 1.38 : 1.08), Y(kicked ? 1.42 : 1.6));
        c.quadraticCurveTo(X(0.78), Y(1.3), X(spec.joinedLocks ? 0.9 : 0.88), Y(spec.joinedLocks ? 0.91 : 0.87));
        c.closePath();
      };
      outlined(ctx, p.hair || p.a, ow, lockPath);
      drawHairStreaks(ctx, spec, p, ow, lockPath, { region: "lock", R, X, Y });
      if (!spec.joinedLocks) outlined(ctx, p.h, ow * 0.65, (c) =>
        c.ellipse(X(0.97), Y(0.76), R * 0.12, R * 0.19, side * -0.35, 0, Math.PI * 2));
    }
  }
  if (spec.pigtailShape && !lod) {
    // Broad, closed locks with a narrow tied neck and a rounded belly. Most
    // of their area lies outside the skull, so the face cannot swallow them.
    const { width: pw, length: pl, lift = 0.2, flare = 0.15, split = false } = spec.pigtailShape;
    const moving = pose.kind === 'run' || pose.kind === 'jump';
    const sway = Math.sin((pose.time || 0) * (moving ? 7 : 2)) * (moving ? 0.09 : 0.02);
    for (const side of [-1, 1]) {
      const X = (x) => hx + R * (side * x - sway);
      const Y = (y) => hy + R * y;
      const top = lift, end = top + pl;
      outlined(ctx, p.hair || p.a, ow, (c) => {
        c.moveTo(X(0.91), Y(top - 0.16));
        c.quadraticCurveTo(X(1.22 + pw), Y(top + pl * 0.18), X(1.12 + pw + flare), Y(top + pl * 0.65));
        if (split) {
          c.lineTo(X(1.25 + flare), Y(end));
          c.lineTo(X(1.22 + flare), Y(end - 0.2));
          c.lineTo(X(0.99 + flare), Y(end + 0.08));
        } else {
          c.quadraticCurveTo(X(1.38 + pw + flare), Y(end + 0.18), X(1.02 + flare), Y(end));
        }
        c.quadraticCurveTo(X(0.88), Y(top + pl * 0.66), X(0.91), Y(top - 0.16));
        c.closePath();
      });
      outlined(ctx, p.ribbon || p.h, ow * 0.65, (c) =>
        c.ellipse(X(1.03), Y(top), R * 0.2, R * 0.14, side * 0.2, 0, Math.PI * 2));
    }
  }
  if (spec.pigtails && !spec.pigtailShape && !lod) {
    const hairCol = p.hair || p.a;
    const hairDark = p.hairDark || p.f || p.h;
    const ribbon = p.ribbon || p.h;
    const short = spec.pigtails === 'short';
    const tieY = hy + R * (compactFloppy ? (short ? 0.34 : 0.44) : (short ? 0.32 : 0.48));
    const tipY = hy + R * (compactFloppy ? (short ? 1.08 : 1.3) : (short ? 1.02 : 1.36));
    const reach = compactFloppy ? (short ? 1.38 : 1.48) : (short ? 1.17 : 1.2);
    const half = compactFloppy ? (short ? 0.36 : 0.4) : (short ? 0.31 : 0.34);
    for (const side of [-1, 1]) {
      const bx = hx + side * R * 0.94;
      const tipX = hx + side * R * reach;
      outlined(ctx, hairCol, ow, (c) => {
        c.moveTo(bx - side * R * half * 0.6, tieY - R * half * 0.55);
        c.quadraticCurveTo(
          hx + side * R * (short ? 1.3 : 1.42),
          hy + R * (short ? 0.6 : 0.84),
          tipX - side * R * half * 0.15,
          tipY,
        );
        c.quadraticCurveTo(
          hx + side * R * (short ? 1.1 : 1.3),
          hy + R * (short ? 1.16 : 1.54),
          bx + side * R * half * 0.52,
          tieY + R * half * 0.58,
        );
        c.quadraticCurveTo(bx - side * R * 0.06, tieY, bx - side * R * half * 0.6, tieY - R * half * 0.55);
        c.closePath();
      });
      // One dark interior sweep keeps the lock from becoming a flat gold blob
      // at study scale, while the silhouette remains a single simple shape.
      ctx.strokeStyle = hairDark;
      ctx.lineWidth = hair(0.42, ow * 0.68);
      ctx.beginPath();
      ctx.moveTo(bx, tieY + R * 0.02);
      ctx.quadraticCurveTo(
        hx + side * R * (short ? 1.28 : 1.36),
        hy + R * (short ? 0.76 : 1.02),
        tipX - side * R * 0.08,
        tipY - R * 0.08,
      );
      ctx.stroke();
      outlined(ctx, ribbon, hair(0.45, ow * 0.58), (c) =>
        c.ellipse(bx + side * R * 0.02, tieY, R * 0.13, R * 0.11, 0, 0, Math.PI * 2));
    }
  }
  if (longHair) {
    // Everything BEHIND the skull. The shared piece is a rim of hair standing
    // proud of the head all the way round and falling past the jaw at the
    // temples — that rim IS the read at 24px, and it is the same shape for all
    // three cuts, so what the bake-off is judging is the thing hanging off the
    // back of it and not three unrelated heads.
    //
    // Drawn before the skull, like every other hair in this file, so its inner
    // half is covered by the face and only the outboard hair shows. A mass
    // painted ON the head instead reads as a helmet: the giveaway is the hard
    // edge where it meets the cheek, which the skull's own fill hides here.
    const motion = pose.kind === 'run' || pose.kind === 'jump';
    const tucked = pose.kind === 'slide';
    // THE SLIDE IS NOT THE CROUCH, and long hair is where the two part
    // company. A crouch folds the hero up and lifts the head; a slide lays
    // her out with her head barely half a unit off the deck and her back
    // along it. The tuck below was measured for the crouch — worn into the
    // slide it cropped the plait to a stub beside her jaw, which is the one
    // thing this cut cannot afford: the length past her outline IS the
    // silhouette. Only the braid reads this; the other cuts keep the tuck.
    const sliding = tucked && pose.slideStyle === 'kick';
    // Cropped to a face cell the hanging hair is cut to just past the jaw: long
    // enough to break the head's outline and say which cut this is, short
    // enough that the crop is still a face. See paintFace.
    const portrait = !!pose.portrait;
    // Hair lags the head it hangs off. Running it swings on a stride-rate
    // clock; standing it drifts on the same slow 2.0 cadence as the idle bob,
    // so a hero holding still is not holding a photograph.
    const wave = Math.sin((pose.time || 0) * (motion ? 7 : 2)) * R * (motion ? 0.18 : 0.05);
    const dark = p.hairDark || p.hair;
    // How far past the skull the hair stands, and how far below the jaw it
    // falls. Both are bigger than they look like they should be: at 1.2R and
    // jaw level the result reads as a bowl cut, because the only hair the
    // viewer can see is the crescent OUTSIDE the head — the rest is behind the
    // face. Length has to be spent where it shows, which is at the sides and
    // below the chin, and 1.45R/1.3R is where it stops being a cut and starts
    // being hair. It falls onto the shoulders on purpose: drawHead runs last,
    // so the hair paints over the torso the way real hair sits on a collar.
    // It ends level with the CHIN, not on the collarbone. Longer than this and
    // the fall blankets both shoulders, which costs the top garment the only
    // part of itself the viewer can see — and the top is half of what a look
    // bake-off is asking about. The length that reads as "long hair" is bought
    // at the sides and by the plait; the fall only has to clear the jaw.
    //
    // A SHORTER cut is that same rim re-measured, not a different head. Two
    // numbers do it, and `cut.fall === 1 && cut.flare === 1` — every cut but
    // the ones a lab section hands in — leaves the path below byte-identical:
    //
    //   fall  scales everything BELOW the head's centre, which is where the
    //         length lives. The crown control points are above it and never
    //         move, so shortening the hair never flattens the skull.
    //   pile  lifts everything ABOVE the head's centre — the crown, and only the
    //         crown. This is "more hair piled on top": it buys height in the
    //         silhouette without touching the length, which is the one thing on
    //         this head that is already settled.
    //   flare scales only the part of x that stands PROUD of the skull (|mx|>1),
    //         because inboard of that the rim is behind the face and invisible.
    //         Scaling raw x instead would pull the rim inside the head and the
    //         hair would vanish rather than tighten.
    const cut = HAIR_CUTS[spec.hairCut] || HAIR_CUTS.long;
    // Positive `my` is BELOW the head centre — the path's own sign convention
    // is mixed, so the mapper takes one direction and the call sites read it.
    // Both mappers short-circuit at 1 rather than multiplying by it, so the
    // shipped cut comes out of the arithmetic bit-identical instead of merely
    // very close — `1 + (1.2 - 1) * 1` is not 1.2 in floating point.
    const HX = (mx) => hx + R * (cut.flare === 1 || Math.abs(mx) <= 1
      ? mx : Math.sign(mx) * (1 + (Math.abs(mx) - 1) * cut.flare));
    const HY = (my) => hy + R * (my <= 0 ? my - (fr.pile || 0)
      : cut.fall === 1 ? my : my * cut.fall);
    outlined(ctx, p.hair, ow, (c) => {
      c.moveTo(HX(-1.2), HY(0.72));                                    // left fall, past the jaw
      c.quadraticCurveTo(HX(-1.46), HY(-0.44), HX(-0.46), HY(-1.16));
      c.quadraticCurveTo(HX(0.5), HY(-1.38), HX(1.2), HY(-0.44));      // over the crown
      c.quadraticCurveTo(HX(1.42), HY(0.24), HX(1.12), HY(0.78));      // right fall
      c.quadraticCurveTo(HX(0.92), HY(1.06), HX(0.52), HY(0.96));      // tapering under the ear
      c.quadraticCurveTo(HX(0), HY(0.78), HX(-0.54), HY(0.98));        // the inner edge is behind the face
      c.quadraticCurveTo(HX(-0.94), HY(1.08), HX(-1.2), HY(0.72));
      c.closePath();
    });
    // Where the hanging hair roots and how it swings. The hero travels +x, so
    // their back — and everything trailing off it — is at -x, the same
    // convention Fernwick's ribbon and Gnash's cheek tuft already follow.
    // A curve through three points, and the tangent along it. Every hanging
    // piece below is built on one of these rather than on hand-placed control
    // points, so a lock and the marks on it can never drift apart when it
    // swings.
    const qp = (a, b, c2, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c2;
    const sampler = (rx, ry, cx2, cy2, tx, ty) => (t) => {
      const px = qp(rx, cx2, tx, t), py = qp(ry, cy2, ty, t);
      const t2 = Math.min(1, t + 0.02);
      return [px, py, Math.atan2(qp(ry, cy2, ty, t2) - py, qp(rx, cx2, tx, t2) - px)];
    };
    if (spec.head === 'loose') {
      // LOOSE: the rim and nothing gathered. Everything below this head's
      // shoulders is the back-pass mass (see paintFlowHair), which is a
      // different piece drawn behind the body — a plait or a tail here would
      // be a second hairstyle on top of it.
    } else if (spec.head === 'braid') {
      // A PLAIT, and the difference from a rope is entirely in the EDGE. Drawn
      // as one smooth tapered capsule with a rounded end and a bobble on it —
      // which is what the first cut did — the silhouette is unmistakably not
      // hair, and no amount of cross-hatching on top rescues it. So it is built
      // as a chain of overlapping lozenges along the centre line instead, each
      // rotated onto the tangent: the outline scallops in and out at every
      // crossing the way a real plait does, and it ends in a loose tuft rather
      // than a stump. outlined() merges the chain into one shape — the fat
      // outline pass runs first and the fill covers every internal seam, the
      // same trick the heavy rig's muscle bulges use.
      //
      // Long enough to reach her waist: a plait cropped at the shoulder is
      // indistinguishable from the hair it grows out of, and the length past
      // the body's outline is the whole silhouette this cut is buying.
      //
      // Crouching it does NOT hang: at rest the tip sits 2.6R below the head,
      // and the crouch lifts the head to -0.42u while leaving that drop alone,
      // which put the tie on the floor and then through it. Tucked over the
      // shoulder instead, which is where a real one goes when you fold up.
      // Running it does NOT fly out level. A plait held horizontal behind the
      // head is a stiff bar pointing at the camera-left edge of the frame — the
      // pose reads as a prop, not as hair — and it is the single worst thing
      // this shape can do. It hangs down her back the whole time and gets
      // LONGER in motion (the run stretches it out behind her, it does not
      // levitate it), leaning back a little and BOUNDING on the stride clock.
      // `wave` is the bound, and it is worth twice as much here as anywhere
      // else in this file: a heavy rope on a running body has real travel.
      // Held CLOSE to her back rather than swung out beside her. The torso's
      // own edge is at 0.7R on the slim rig, so a tip at ~1.05R runs the plait
      // down just outside her own outline — near enough to read as lying
      // against her, far enough that it never disappears into the arm. Out at
      // 1.34R it was a separate object hanging in the air next to the hero.
      // The bound used to be worth 2.1x the shared wave, and the running tip
      // was also placed further from the root than the standing one — 2.7R
      // against 2.32R, plus up to another 0.38R of bound. The plait was
      // physically LONGER in the run than at rest, by as much as a third. A
      // rope does not do that: it swings and it lags, but its length is the
      // one thing about it that cannot change.
      const bound = motion ? wave * 1.15 : wave;
      // SLIDING IT KEEPS ITS LENGTH AND SPENDS IT BACKWARD. The head is
      // canted -0.28 rad and rides at 0.50u, so 2.24R below its centre IS
      // the deck: the tip is placed to land just short of it and the rest of
      // the rope goes out behind her, sagging onto the floor she is sliding
      // on. Total run is ~2.9R, the same length the run stretches it to —
      // she has not lost half her hair on the way down, which is exactly
      // what the crouch tuck read as. Numbers are pre-rotation, because the
      // whole head turns under them.
      // THE RUN SWINGS THE TIP ON A FIXED RADIUS. Every other pose places the
      // tip at an x and a y, which is fine while those are constants — but in
      // motion the bound was ADDED to y, so the faster she ran the longer her
      // hair got. Here the tip is polar instead: one length off the root, and
      // the stride moves the ANGLE. The plait swings and lags exactly as it did
      // and its length cannot change, because length is no longer a sum of
      // terms that the animation contributes to.
      //
      // `PLAIT_L` is the standing rope: root (-0.92R, +0.3R) to tip
      // (-1.05R, +2.62R) is 2.32R, and that is now the length in every moving
      // pose too.
      const rootPX = hx - R * 0.92, rootPY = hy + R * 0.3;
      const PLAIT_L = R * 2.32;
      let tipX, tipY, ctlX, ctlY;
      if (motion) {
        // Radians off straight-down, positive swinging the tip BACKWARD. The
        // constant is the lean a rope takes on a body that is travelling; the
        // wave term is the stride, and 0.5 of it lands the same visible throw
        // the old vertical bound gave without touching the length.
        // In the AIR the stride clock is the wrong driver — there are no
        // strides — so the jump adds its own term off the pose's vertical
        // speed: the rope trails further back as she rises and swings forward
        // as she falls, which is the lag a heavy plait actually has. Without
        // it the jump ran on the same 7rad/s wave as the run and read as
        // hanging dead straight down.
        const air = pose.kind === 'jump' ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160)) : 0;
        const a = 0.16 + (wave / R) * 0.5 - air * 0.3;
        tipX = rootPX - Math.sin(a) * PLAIT_L;
        tipY = rootPY + Math.cos(a) * PLAIT_L;
        // The control point rides the same swing at half the length and less
        // of the angle, which is what curves the rope instead of hinging it.
        const ca = a * 0.55;
        ctlX = rootPX - Math.sin(ca) * PLAIT_L * 0.52;
        ctlY = rootPY + Math.cos(ca) * PLAIT_L * 0.52;
      } else {
        tipX = hx - R * (portrait ? 1.32 : sliding ? 2.46 : tucked ? 1.42 : 1.05);
        tipY = hy + R * (portrait ? 1.34 : sliding ? 1.53 : tucked ? 1.08 : 2.62) + bound;
        ctlX = hx - R * (portrait ? 1.22 : sliding ? 1.5 : tucked ? 1.16 : 1.02);
        ctlY = hy + R * (portrait ? 0.62 : sliding ? 1.55 : tucked ? 0.5 : 1.4) + bound * 0.4;
      }
      const at = sampler(hx - R * 0.92, hy + R * 0.3, ctlX, ctlY, tipX, tipY);
      // Half-width down the plait. Thin — a plait is a rope of three thin
      // strands, and the first cut's girth was most of why the shape read the
      // way it did. It also tapers hard: one that keeps its width to the tip is
      // a tail, and the taper is most of what says which.
      const halfAt = (t) => R * (0.185 - 0.1 * t);
      // More crossings than the fat version had: on a thin rope the scallops are
      // small, and too few of them over this length reads as a smooth cord.
      const CROSSINGS = 8;
      const TUFT_AT = 0.86;
      outlined(ctx, p.hair, ow, (c) => {
        for (let i = 0; i < CROSSINGS; i++) {
          const t = (i / (CROSSINGS - 1)) * TUFT_AT;
          const [px, py, ang] = at(t);
          const rw = halfAt(t);
          // moveTo first: ellipse() would otherwise draw a connecting line from
          // wherever the previous subpath ended, and that line strokes.
          c.moveTo(px + Math.cos(ang) * rw * 1.24, py + Math.sin(ang) * rw * 1.24);
          c.ellipse(px, py, rw * 1.24, rw, ang, 0, Math.PI * 2);
        }
        // The tuft: hair leaves a plait as a spray of ends, not a cap.
        const [ex, ey, eang] = at(TUFT_AT);
        const [fx, fy] = at(1);
        const nx = -Math.sin(eang), ny = Math.cos(eang);
        const tw = halfAt(TUFT_AT);
        c.moveTo(ex + nx * tw, ey + ny * tw);
        c.lineTo(fx + nx * tw * 0.42, fy + ny * tw * 0.42);
        c.lineTo(fx - nx * tw * 0.2, fy - ny * tw * 0.2);
        c.lineTo(ex - nx * tw, ey - ny * tw);
        c.closePath();
      });
      if (!lod) {
        // The crossings themselves — short diagonals alternating in direction,
        // which is what a plait's weave actually looks like. Straight rungs
        // read as a rope ladder.
        ctx.strokeStyle = dark;
        ctx.lineWidth = hair(0.42, ow * 0.8);
        ctx.lineCap = 'butt';
        ctx.beginPath();
        for (let i = 1; i < CROSSINGS - 1; i++) {
          const t = (i / (CROSSINGS - 1)) * TUFT_AT;
          const [px, py, ang] = at(t);
          const lean = (i % 2 ? 0.5 : -0.5);
          const nx = -Math.sin(ang + lean), ny = Math.cos(ang + lean);
          const half = halfAt(t) * 0.92;
          ctx.moveTo(px + nx * half, py + ny * half);
          ctx.lineTo(px - nx * half, py - ny * half);
        }
        ctx.stroke();
        ctx.lineCap = 'round';
      }
      // The tie sits ABOVE the tuft, where a tie goes. On the end it was a
      // bobble capping the rope, which was half of what made the old shape read
      // the way it did.
      {
        const [bx, by, bang] = at(TUFT_AT - 0.03);
        ctx.strokeStyle = p.a;
        ctx.lineWidth = hair(0.5, R * 0.11);
        ctx.lineCap = 'butt';
        ctx.beginPath();
        const nx = -Math.sin(bang), ny = Math.cos(bang);
        const half = halfAt(TUFT_AT) * 1.05;
        ctx.moveTo(bx + nx * half, by + ny * half);
        ctx.lineTo(bx - nx * half, by - ny * half);
        ctx.stroke();
        ctx.lineCap = 'round';
      }
    } else if (spec.head === 'pony') {
      // Gathered high and thrown back, then DOWN HER BACK — the tail hangs to
      // the small of her back at rest and only streams out level when she is
      // moving. Held up at shoulder height standing, it read as a tail stuck
      // out sideways rather than as long hair that happens to be tied.
      const gatherX = hx - R * 0.86, gatherY = hy - R * 0.72;
      // Same finding as the plait: it hangs and bounds rather than streaming out
      // level. A tail lifts more than a plait does — it is lighter and it is
      // tied higher — so it carries a real backward lean where the plait barely
      // leaves the vertical, but it still ends up BELOW the shoulder.
      const bound = motion ? wave * 1.8 : wave;
      const tipX = hx - R * (portrait ? 1.62 : motion ? 2.24 : tucked ? 1.74 : 1.5);
      const tipY = hy + R * (portrait ? 0.24 : motion ? 1.34 : tucked ? 0.42 : 2.3) + bound;
      const ctlX = hx - R * (portrait ? 1.5 : motion ? 2.0 : 1.86);
      const ctlY = hy - R * (portrait ? 0.66 : motion ? 0.66 : 0.5) + bound * 0.5;
      const at = sampler(gatherX, gatherY, ctlX, ctlY, tipX, tipY);
      const halfAt = (t) => R * (0.3 - 0.13 * t);
      outlined(ctx, p.hair, ow, (c) => {
        // One sweep out to the tip and back, so the tail keeps a clean edge —
        // the loose-hair read comes from the SPLIT at the end, not from a
        // scalloped side.
        const [ax, ay] = at(0);
        const [mx, my, mang] = at(0.5);
        const [ex, ey, eang] = at(1);
        const mn = [-Math.sin(mang), Math.cos(mang)];
        const en = [-Math.sin(eang), Math.cos(eang)];
        c.moveTo(ax + mn[0] * halfAt(0) * 0.4 + R * 0.24, ay - R * 0.26);
        c.quadraticCurveTo(mx + mn[0] * halfAt(0.5) * 1.3, my + mn[1] * halfAt(0.5) * 1.3,
          ex + en[0] * halfAt(1), ey + en[1] * halfAt(1));
        // The split between the two locks the tail breaks into.
        c.lineTo(ex + en[0] * halfAt(1) * 0.1 + Math.cos(eang) * R * 0.2,
          ey + en[1] * halfAt(1) * 0.1 + Math.sin(eang) * R * 0.2);
        c.lineTo(ex - en[0] * halfAt(1), ey - en[1] * halfAt(1));
        c.quadraticCurveTo(mx - mn[0] * halfAt(0.5) * 1.1, my - mn[1] * halfAt(0.5) * 1.1,
          ax + R * 0.2, ay + R * 0.32);
        c.closePath();
      });
      if (!lod) {
        // One strand line down the length: hair falls in locks, and a single
        // flat colour this long reads as a ribbon.
        ctx.strokeStyle = dark;
        ctx.lineWidth = hair(0.4, ow * 0.7);
        ctx.beginPath();
        const [mx, my] = at(0.45);
        const [ex, ey] = at(0.95);
        ctx.moveTo(gatherX, gatherY);
        ctx.quadraticCurveTo(mx + R * 0.12, my + R * 0.06, ex + R * 0.1, ey);
        ctx.stroke();
      }
      outlined(ctx, p.a, hair(0.4, ow * 0.5), (c) =>
        c.ellipse(gatherX + R * 0.18, gatherY + R * 0.02, R * 0.1, R * 0.15, -0.5, 0, Math.PI * 2));
    } else if (spec.head === 'buns') {
      // Ox horns: a bun over each ear, wrapped in ribbon, with the tails
      // trailing. The PAIR is the whole silhouette — it is the one hairstyle on
      // the roster that is symmetric and outboard, so it survives being two
      // pixels wide in a way a single tail never does, and it is the reason
      // this character is recognisable from across a lane.
      //
      // Drawn in the behind-head pass so the skull crops their inner edge and
      // they read as sitting ON the head rather than floating beside it.
      const ribbon = p.ribbon || p.w;
      for (const sx of [-1, 1]) {
        const bx = oxX(sx);
        // The tails. The far one is shorter and pushed back — matched, the two
        // read as one wide ribbon behind her head rather than as a pair.
        const near = sx < 0;                       // -x is her back, as everywhere else
        // The far ribbon is shorter, which is the only depth cue a pair of
        // symmetric streamers gets front-on.
        const len = near ? 1 : 0.66;
        // They HANG, always, and running only leans them back. Two things were
        // wrong with the version that swept them out level: a pair of arcs
        // rising symmetrically off both sides of the head is the silhouette of
        // a cornette, not of hair ribbons — and the shape changed so much
        // between standing and running that the two poses did not read as the
        // same object. So the tip stays well below the bun in both states and
        // motion adds one thing only: a backward lean, the SAME direction on
        // both sides, because they are being blown by her own travel rather
        // than flung outward by nothing.
        //
        // The width offsets below are horizontal, which is the other half of
        // it: they set a sensible width on a ribbon that hangs and a thin blade
        // on one that lies level. Keeping it vertical keeps it a ribbon.
        // The BOW is what keeps it cloth. With the control point in line
        // between root and tip the ribbon draws as a straight bar — two of them
        // read as crossed swords, which is a different wrong answer from the
        // wings but no better. Putting the control further OUT than the tip
        // bows it away from the head and back in, and running the flutter
        // through control and tip in OPPOSITE directions makes that bow
        // undulate instead of swinging as one rigid piece.
        // Running, it tucks IN toward the head rather than swinging wide: the
        // bow closes up and the backward lean is small. A ribbon streaming out
        // on a long arc is the thing that kept turning into a wing, and the
        // cure is the same at every length — keep it near her.
        // AIRBORNE the lean is not a constant. Running, `trail` is one fixed
        // pull backward and the flutter runs on a plain clock, so the jump —
        // which shares `motion` with the run — held the ribbons at the same
        // angle from launch to landing. They now take a term off vertical
        // speed: pulled further back and lifted as she rises, falling forward
        // and hanging as she drops. A ribbon is the lightest thing she owns
        // and should be the first thing the air moves.
        const airT = pose.kind === 'jump'
          ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160)) : 0;
        const trail = motion ? -R * (0.46 + airT * 0.34) * len : 0;
        const lift = -airT * R * 0.3 * len;
        const tipX = bx + sx * R * 0.4 * len + trail + wave * 0.45;
        const tipY = hy + R * (motion ? 1.62 : 1.85) * len + wave * (near ? 0.45 : 0.28) + lift;
        const ctlX = bx + sx * R * (motion ? 0.62 : 0.9) * len + trail * 0.3 - wave * 0.38;
        const ctlY = hy + R * (motion ? 0.76 : 0.82) * len + lift * 0.45;
        // Ribbon width, as a fraction of the head. One number for the whole
        // shape so the root, the waist and the fork stay in proportion when it
        // moves — a ribbon that tapers at a different rate than it narrows
        // reads as a leaf. These LONG tails keep their width and their swing —
        // thinning and calming was tried here and it was the wrong piece: it is the
        // short cut ends that were too heavy and too busy, not the streamers.
        const rw = 0.62;
        // The tails are NOT measured when a face cell is being fitted. They hang
        // most of a head below the chin, and measured as part of the face they
        // shrank the whole head to a third of the cell — her portrait read small
        // beside every other hero's. They still DRAW at full length in the cell
        // and run off its bottom edge, which is what a portrait crop does with
        // long hair. See paintFace's `forFit` and drawToonFace's clip.
        if (!pose.portraitFit) outlined(ctx, ribbon, hair(0.5, ow * 0.75), (c) => {
          c.moveTo(bx + sx * R * 0.12 * rw, oxY + R * 0.2);
          c.quadraticCurveTo(ctlX - sx * R * 0.16 * rw, ctlY, tipX - sx * R * 0.02 * rw, tipY);
          // A forked end: a ribbon is cut, not rounded off.
          c.lineTo(tipX + sx * R * 0.2 * rw, tipY - R * 0.12 * rw);
          c.lineTo(tipX + sx * R * 0.16 * rw, tipY + R * 0.16 * rw);
          c.quadraticCurveTo(ctlX + sx * R * 0.22 * rw, ctlY + R * 0.16 * rw,
            bx + sx * R * 0.34 * rw, oxY + R * 0.3);
          c.closePath();
        });
        // SHORT ribbon ends sticking out of the wrap, IN ADDITION to the long
        // tails above — off the chibi reference, where each bun has a couple of
        // cut ends fanning off it as well as the streamer hanging past the ear.
        // They are the tie's other half: a ribbon wrapped round a bun has to
        // end somewhere, and until now it ended nowhere.
        //
        // Drawn between the tails and the bun on purpose. The bun's own two
        // circles land on top and swallow every root, so each stub reads as
        // coming out from UNDER the wrap — which is the whole difference
        // between a ribbon end and a spike glued to the side of her head.
        // They are short by design: at hero size anything longer stops reading
        // as a cut end and starts competing with the tail for the silhouette,
        // and the tail is the one that should win.
        for (const [deg, slen, sw] of BUN_STUBS[spec.bunStubs] || []) {
          // Mirrored: 0° is straight outboard, negative is up. The far bun's
          // stubs are shorter with its tail, so the pair keeps its depth cue.
          const a = deg * Math.PI / 180;
          const dx = Math.cos(a) * sx, dy = Math.sin(a);      // sx mirrors the fan; up stays up
          // Measured from the bun's CENTRE, and it has to clear the bun's own
          // hair circle at 1.06 oxR before any of it is visible at all — the
          // first version reached 1.06 exactly and drew four identical columns
          // of nothing. So the 1.0 is not a taste number: it is the wrap, and
          // `slen` is the part that sticks out past it.
          const reach = oxR * (1.0 + slen * (near ? 1 : 0.82));
          // A cut end flutters at the tip and not at the root, which is under
          // the wrap and cannot move — so the wave is applied to the tip alone,
          // and only a tenth of it. A stub is SHORT: the same figure that reads as
          // a gentle sway on a streamer hanging past her collarbone reads as a
          // twitch on something this size, which is why the two pieces of the same
          // ribbon do not share one number.
          const rx0 = bx + dx * oxR * 0.34, ry0 = oxY + dy * oxR * 0.34;
          // The tip DROOPS, and by MORE the longer the stub is: cloth is heavy, so
          // a long end sags further than a short one, and a fixed sag across a set
          // of mixed lengths reads as a fan of straight spokes instead. A flat
          // blade at a fixed angle was the first version of this and read as a
          // paper tag pinned to the bun.
          const tx0 = bx + dx * reach + wave * 0.1;
          const ty0 = oxY + dy * reach + oxR * 0.1 * (1 + slen);
          const nx = -dy, ny = dx;                            // normal to the blade
          const w0 = oxR * sw, w1 = w0 * 0.56;               // tapers hard toward the cut
          outlined(ctx, ribbon, hair(0.45, ow * 0.7), (c) => {
            c.moveTo(rx0 + nx * w0, ry0 + ny * w0);
            // Bowed away from the head, so a stub is cloth rather than a lath.
            c.quadraticCurveTo((rx0 + tx0) / 2 + nx * w0 * 1.5, (ry0 + ty0) / 2 + ny * w0 * 1.5,
              tx0 + nx * w1, ty0 + ny * w1);
            // A shallow V. Cut deep, on a piece this short, it stops being a
            // cut end and becomes a fork — which is what read as a claw.
            c.lineTo(tx0 - dx * oxR * 0.09, ty0 - dy * oxR * 0.09);
            c.lineTo(tx0 - nx * w1, ty0 - ny * w1);
            c.quadraticCurveTo((rx0 + tx0) / 2 - nx * w0 * 0.6, (ry0 + ty0) / 2 - ny * w0 * 0.6,
              rx0 - nx * w0, ry0 - ny * w0);
            c.closePath();
          });
        }
        // Hair under the wrap, and the wrap OFF-CENTRE on it — up and outboard,
        // so brown shows along the inner and lower edge of each bun. Two
        // concentric circles instead read as a pair of pale ears, which is a
        // different animal entirely.
        outlined(ctx, p.hair, ow, (c) => c.arc(bx, oxY + R * 0.14, oxR * 1.06, 0, Math.PI * 2));
        outlined(ctx, ribbon, ow, (c) =>
          c.arc(bx + sx * oxR * 0.26, oxY - oxR * 0.12, oxR * 0.82, 0, Math.PI * 2));
        if (!lod) {
          // The gathered band at the base, in the accent — the mark that says
          // the ribbon is tied round something.
          outlined(ctx, p.a, hair(0.4, ow * 0.5), (c) =>
            c.ellipse(bx - sx * R * 0.08, oxY + R * 0.4, oxR * 0.42, oxR * 0.26, sx * 0.5, 0, Math.PI * 2));
          ctx.save();
          ctx.beginPath();
          ctx.arc(bx, oxY, oxR, 0, Math.PI * 2);
          ctx.clip();
          ctx.globalAlpha *= 0.45;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = hair(0.4, ow * 0.6);
          ctx.beginPath();
          ctx.arc(bx + sx * oxR * 0.5, oxY + oxR * 0.5, oxR * 0.8, -Math.PI, Math.PI * 0.2);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else {
      // A knot at the nape, plus the two strands that always work loose out of
      // one. The bun sits LOW and BACK: worn on the crown it silhouettes as a
      // topknot, which is a different character.
      const bunX = hx - R * 1.16, bunY = hy - R * 0.66;
      // The length. A knot on its own is a short cut, and this hero's hair is
      // long — so it is a HALF-up: gathered at the crown, with the rest left to
      // fall down her back past the shoulder blades. That fall is what carries
      // the length, and the knot is what says it has been dealt with.
      const fallTipX = hx - R * (portrait ? 1.16 : motion ? 1.62 : tucked ? 1.34 : 1.16);
      const fallTipY = hy + R * (portrait ? 1.1 : motion ? 2.3 : tucked ? 0.92 : 2.14) + wave * 2;
      const fallCtlX = hx - R * (motion ? 1.5 : 1.42);
      const fallCtlY = hy + R * (motion ? 1.1 : 1.05) + wave * 0.8;
      const fall = sampler(hx - R * 0.86, hy + R * 0.06, fallCtlX, fallCtlY, fallTipX, fallTipY);
      const fallHalf = (t) => R * (0.34 - 0.19 * t);
      outlined(ctx, p.hair, ow, (c) => {
        const [ax, ay, aang] = fall(0);
        const [mx, my, mang] = fall(0.52);
        const [ex, ey, eang] = fall(1);
        const an = [-Math.sin(aang), Math.cos(aang)];
        const mn = [-Math.sin(mang), Math.cos(mang)];
        const en = [-Math.sin(eang), Math.cos(eang)];
        c.moveTo(ax + an[0] * fallHalf(0), ay + an[1] * fallHalf(0));
        c.quadraticCurveTo(mx + mn[0] * fallHalf(0.52) * 1.25, my + mn[1] * fallHalf(0.52) * 1.25,
          ex + en[0] * fallHalf(1), ey + en[1] * fallHalf(1));
        // A soft point rather than a cap: loose hair thins out at the ends.
        c.lineTo(ex + Math.cos(eang) * R * 0.24, ey + Math.sin(eang) * R * 0.24);
        c.lineTo(ex - en[0] * fallHalf(1), ey - en[1] * fallHalf(1));
        c.quadraticCurveTo(mx - mn[0] * fallHalf(0.52) * 1.05, my - mn[1] * fallHalf(0.52) * 1.05,
          ax - an[0] * fallHalf(0) * 0.4, ay - an[1] * fallHalf(0) * 0.4);
        c.closePath();
      });
      if (!lod) {
        // Two lock lines down the fall, so a long flat shape reads as hair
        // rather than as a cape.
        ctx.strokeStyle = dark;
        ctx.lineWidth = hair(0.4, ow * 0.65);
        ctx.beginPath();
        for (const off of [-0.34, 0.24]) {
          const [sx, sy, sang] = fall(0.14);
          const [mx, my, mang] = fall(0.6);
          const [ex, ey] = fall(0.94);
          const sn = [-Math.sin(sang), Math.cos(sang)], mn = [-Math.sin(mang), Math.cos(mang)];
          ctx.moveTo(sx + sn[0] * fallHalf(0.14) * off, sy + sn[1] * fallHalf(0.14) * off);
          ctx.quadraticCurveTo(mx + mn[0] * fallHalf(0.6) * off, my + mn[1] * fallHalf(0.6) * off, ex, ey);
        }
        ctx.stroke();
      }
      // The knot lands ON the fall, last: painted under it, the fall's own
      // outline runs straight across the front of the bun.
      outlined(ctx, p.hair, ow, (c) => c.arc(bunX, bunY, R * 0.52, 0, Math.PI * 2));
      if (!lod) {
        // Two wraps across the knot, so it reads as coiled hair and not a ball
        // stuck on the back of her head.
        ctx.save();
        ctx.beginPath();
        ctx.arc(bunX, bunY, R * 0.44, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = dark;
        ctx.lineWidth = hair(0.42, ow * 0.8);
        ctx.beginPath();
        ctx.moveTo(bunX - R * 0.6, bunY + R * 0.14); ctx.lineTo(bunX + R * 0.6, bunY - R * 0.24);
        ctx.moveTo(bunX - R * 0.52, bunY + R * 0.48); ctx.lineTo(bunX + R * 0.6, bunY + R * 0.1);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  if (spec.elfEars) {
    for (const side of [-1, 1]) {
      const reach = spec.elfEars;
      const X = (x) => hx + side * R * x;
      // The tip is ROUNDED, not a spike. The two curves used to meet at a
      // single point, which at this ink weight comes out as a needle — sharper
      // than anything else on a cast drawn entirely in soft shapes, and the
      // first thing the eye finds on her face. A short arc across the end
      // keeps the ear unmistakably pointed while giving it the same rounded
      // finish every other tip in the sprite has.
      const tipR = 0.09;
      outlined(ctx, p.s, ow, (c) => {
        c.moveTo(X(0.85), hy - R * 0.12);
        c.quadraticCurveTo(X(1.13), hy - R * 0.2, X(reach - tipR * 0.62), hy - R * (0.39 - tipR * 0.34));
        c.quadraticCurveTo(X(reach + tipR * 0.16), hy - R * (0.39 + tipR * 0.22),
          X(reach - tipR * 0.1), hy - R * (0.39 - tipR * 0.86));
        c.quadraticCurveTo(X(reach - 0.1), hy + R * 0.18, X(0.94), hy + R * 0.43);
        c.closePath();
      });
      ctx.strokeStyle = '#bc805f'; ctx.lineWidth = ow * 0.65;
      ctx.beginPath(); ctx.moveTo(X(1.02), hy + R * 0.15);
      ctx.quadraticCurveTo(X(1.16), hy - R * 0.02, X(reach - 0.17), hy - R * 0.2);
      ctx.stroke();
    }
  } else if (spec.plumber || spec.ears) {
    // Ears go BEHIND the head, so the skull's own fill cuts them off and only
    // the outboard lobe shows. Drawn on top they were two blobs sitting ON the
    // face, and the separate sideburn strips that came with them read as hair
    // stuck to a cheek — worst on the right, where the cap rocks UP and left a
    // gap of bare head between band and strip with nothing bridging it. The
    // strips are gone entirely: the tufted fringe already hangs past ear level
    // at the temples, which is the job they were doing before he had hair.
    //
    // The right ear rides higher, following the hat. Not anatomy — the tilt
    // opens more bare head on that side, and an ear sitting at the same height
    // as its partner leaves that space looking empty. Lorenzo's cap only.
    //
    // `spec.ears` opts any other head into the SAME piece rather than a second
    // one: an ear is an ear, and a hero who grows one should grow the one this
    // file already draws. It sits clear of the buns by measurement — the bun's
    // hair circle bottoms out at -0.19R and the ear's top is -0.22R — so the two
    // stack up the side of her head instead of colliding.
    //
    // It stays AFTER the behind-head hair and before the skull, which is where
    // Lorenzo's has always been. Moved earlier, so that a long cut would cover
    // an ear the way real hair does, it vanished entirely: her hair rim stands
    // 1.16R proud even CROPPED and the ear spans 0.75R..1.15R, so every cut
    // swallowed it whole. In front of the hair and cropped by the skull is also
    // what the chibi references draw.
    //
    // Three dials, defaulted to the shipped piece so nobody without them moves.
    // They exist because "behind the skull" means the only ear anyone can see is
    // the crescent OUTBOARD of the silhouette, and that crescent is small: a
    // round head's half-width at ear height is 0.997R, so the stock ear's outer
    // edge at 1.15R shows 0.15R of itself and no more. `earOut` slides the ear
    // sideways, which buys visible ear without redrawing it; `earSize` scales
    // the whole ellipse, which buys visible ear AND a bigger one; `earY` moves
    // it up or down past whatever the hero has hanging beside their head. What
    // that costs is the answer the ear bake-off is looking for.
    const earOut = spec.earOut ?? 0.95;
    const earY = spec.earY ?? 0.08;
    const earSize = spec.earSize ?? 1;
    for (const sx of [-1, 1]) {
      const lift = sx > 0 && spec.head === 'cap' && lorenzoFace().tilt ? R * 0.12 : 0;
      outlined(ctx, p.s, hair(0.6, ow * 0.7), (c) =>
        c.ellipse(hx + sx * R * earOut, hy + R * earY - lift,
          R * 0.2 * earSize, R * 0.28 * earSize, 0, 0, Math.PI * 2));
      if (!lod && spec.earStud) {
        // A stud in the lobe, in her piping gold. The lobe is the BOTTOM of the
        // ear and the bottom is the only part of it fully outboard of the skull,
        // so this is the one spot on an ear a mark can be seen at all. It rides
        // the dials with the ear rather than sitting at a fixed offset, or a
        // scaled ear would wear its stud somewhere up the middle.
        dot(ctx, hx + sx * R * (earOut + 0.05 * earSize),
          hy + R * (earY + 0.2 * earSize) - lift, R * 0.06, p.a);
      }
    }
  }
  // Grumpos gets a broad chibi block-head; the softer cast keeps round heads.
  // The cranium stays fully round — only the jaw is faceted, tapering on hard
  // straight lines from the cheekbones to a narrow chin. That reads tougher
  // than a round chin AND keeps the whole lower face inside the beard, instead
  // of leaving slivers of jaw poking out past it. The path is a named fn so
  // the war paint below can clip to the silhouette.
  const blockHead = (c) => {
    c.moveTo(hx - R, hy + R * 0.06);                                            // left cheekbone — widest point
    c.quadraticCurveTo(hx - R * 1.02, hy - R * 0.66, hx - R * 0.46, hy - R * 0.98);
    c.quadraticCurveTo(hx, hy - R * 1.22, hx + R * 0.46, hy - R * 0.98);        // round crown
    c.quadraticCurveTo(hx + R * 1.02, hy - R * 0.66, hx + R, hy + R * 0.06);    // right cheekbone
    c.quadraticCurveTo(hx + R * 0.92, hy + R * 0.3, hx + R * 0.64, hy + R * 0.6); // jaw: still a hard taper, but eased off the cheekbone
    c.quadraticCurveTo(hx + R * 0.5, hy + R * 0.86, hx + R * 0.3, hy + R * 0.92); // chin corner, knocked off rather than pointed
    c.lineTo(hx - R * 0.3, hy + R * 0.92);
    c.quadraticCurveTo(hx - R * 0.5, hy + R * 0.86, hx - R * 0.64, hy + R * 0.6);
    c.quadraticCurveTo(hx - R * 0.92, hy + R * 0.3, hx - R, hy + R * 0.06);
    c.closePath();
  };
  if (id === 'grumpos') {
    outlined(ctx, p.s, ow, blockHead);
  } else {
    // A furred head fills with the coat colour, not with skin. Miss this and an
    // animal comes out wearing a human face inside its own ears.
    const furred = spec.head === 'dome' || spec.head === 'jackal' || !!ANIMAL_HEADS[spec.head];
    if (ANIMAL_HEADS[spec.head] && spec.headShape === 'cheeks') {
      // The wide-cheek skull, from the head-shape round: fluff built INTO the
      // head instead of stuck onto it. A round crown that flares at the
      // cheekbones — widest well below the eye line — then tucks to a soft
      // chin. The point of baking it into the silhouette is that a bulge in
      // the head's own outline reads as a fluffy face, where the same area
      // added as separate lobes reads as quills — which is the Gnash problem
      // this shape exists to solve. Same named-path precedent as Grumpos's
      // blockHead above.
      // `faceTrim` narrows the whole lower face: 0 is the shape as settled, 1
      // pulls the cheek flare in to barely past the crown. TWO things move
      // together, because trimming only one leaves the other looking wrong —
      // the flare's control point (the widest part of the silhouette) and the
      // jaw corner it runs to. The crown, the chin height and the eye line are
      // all untouched, so this narrows him without shortening or shrinking him.
      const trim = Math.max(0, Math.min(1, spec.faceTrim || 0));
      // `faceTaper` makes the head TRIANGULAR, which `faceTrim` alone cannot:
      // trim scales the whole flare in and keeps its shape, so a trimmed head
      // is just a smaller version of the same round one. A triangle is about
      // WHERE the width sits — high at the temples, falling away to a narrow
      // jaw — so the taper raises the widest point toward the eye line and
      // pulls the jaw corner and the chin in behind it. The crown is untouched:
      // the top of the triangle is the ears, and they already flare.
      const taper = Math.max(0, Math.min(1, spec.faceTaper || 0));
      const flareX = 1.24 - 0.3 * trim;      // widest point, in R
      const flareY = 0.52 - 0.34 * taper;    // and how far DOWN it sits
      const jawX = 0.6 - 0.12 * trim - 0.3 * taper;  // where the flare lands on the jaw
      const chinX = 0.3 - 0.17 * taper;      // chin corner, in behind the jaw
      // The chin follows the FACE, not the skull. The rig centres the face on
      // `faceCx` = hx + 0.01u — a hair right of the head — while the skull, the
      // ears and the ruff stay on hx. A round jaw hid that: its lowest point is
      // a broad arc, and a 1%-of-height offset is invisible under one. Taper it
      // to a point and the point is measurably left of the nose above it, which
      // reads as a crooked chin rather than as a shifted face.
      // So the lower skull leans over to meet the face, ramped by depth: 0 at
      // the temples, where the ears root and must stay on the head's own axis,
      // and full at the chin apex. Same constant as `faceCx`, not a new one —
      // two numbers here would drift apart the first time either moved.
      const faceLead = 0.01 * u;
      outlined(ctx, p.h, ow, (c) => {
        c.moveTo(hx - R, hy);                                                     // left temple
        c.arc(hx, hy, R, Math.PI, 0);                                             // round crown
        c.quadraticCurveTo(hx + R * flareX + faceLead * 0.35, hy + R * flareY,
          hx + R * jawX + faceLead * 0.7, hy + R * 0.88);                         // cheek flare
        c.quadraticCurveTo(hx + R * chinX + faceLead, hy + R * 1.06,
          hx + faceLead, hy + R * 1.04);                                          // soft chin
        c.quadraticCurveTo(hx - R * chinX + faceLead, hy + R * 1.06,
          hx - R * jawX + faceLead * 0.7, hy + R * 0.88);
        c.quadraticCurveTo(hx - R * flareX + faceLead * 0.35, hy + R * flareY, hx - R, hy);
        c.closePath();
      });
    } else {
      outlined(ctx, furred ? p.h : p.s, ow, (c) => c.arc(hx, hy, R, 0, Math.PI * 2));
    }
  }
  // hats / hair ON the head
  if (spec.head === 'cap') {
    const cap = lorenzoFace();
    // A cap worn back on the head. In a flat front view there is no axis to
    // rotate "backward" around, so the 2D read of that is the whole hat group
    // rocked so the bill lifts — pivoting at the back of the band, where a real
    // one pivots when you shove it. The emblem and bill ride the same transform
    // rather than being re-placed by hand, which is the only way they stay put
    // relative to the dome.
    // Pivot on the HEAD CENTER, which is the whole trick: a rotation about the
    // center leaves every point of the hat the same distance from the skull it
    // sits on, so the band cannot lift away anywhere. Pivoting at the back of
    // the band instead — the obvious-looking choice, since that is where a real
    // cap hinges — swings the front corner from 1.03R out to 1.15R, and that
    // 12% is a visible gap of bare head under the raised side.
    const tilt = cap.tilt ? (cap.tilt * Math.PI) / 180 : 0;
    if (tilt) {
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(-tilt);
      ctx.translate(-hx, -hy);
    }
    // Hair rides inside the same transform: only its bottom edge is visible, and
    // hanging off a tilted hem is what keeps it parallel to the band instead of
    // opening a wedge of scalp on the high side.
    if (cap.hair) outlined(ctx, p.m, ow, (c) => capTufts(c, hx, hy, R, cap));
    outlined(ctx, p.h, ow, (c) => capPath(c, hx, hy, R, cap));
    if (cap.billOval) {
      // An oval, but seated: centred a touch ABOVE the local hem so most of it
      // is buried in the cap and only the part past the skull reads as bill.
      // Attachment by overlap, which is how the legacy `was` ellipse gets away
      // with it too — that one just sits too high on the dome to look joined.
      // Held LEVEL through the tilt by its own rotation cancelling the group's,
      // which is the difference between a cap tipped back and a cap whose bill
      // points at the ceiling.
      const [bx, above, brx, bry] = cap.billOval;
      const by = hemYAt(hx, hy, R, cap, (R * bx) / (R * cap.width)) - R * above;
      // `billDown` tips the far end DOWN, in degrees. A bill angled down reads
      // as a visor shading the eyes; a level, symmetric, round-ended lozenge
      // sticking straight out from a sphere reads as almost anything else.
      const down = ((cap.billDown || 0) * Math.PI) / 180;
      outlined(ctx, p.h, ow, (c) => c.ellipse(hx + R * bx, by, R * brx, R * bry, tilt + down, 0, Math.PI * 2));
    } else if (cap.bill) {
      const [bx, by, brx, bry] = cap.bill;
      outlined(ctx, p.h, ow, (c) => c.ellipse(hx + R * bx, hy - R * by, R * brx, R * bry, 0, 0, Math.PI * 2));
    }
    if (!lod && cap.emblem != null) {
      // Center the gold backing on the raised crossed-tool mark. Off on the
      // shipped cap: a circular badge on the front of a cap is structurally the
      // same mark as the one worn by the plumber this design keeps being
      // compared to, so dropping it buys more distance than any recolour of it
      // could. `was` keeps its badge, being the historical record.
      const ey = hy - R * cap.emblem;
      outlined(ctx, p.a, hair(0.6, ow * 0.6), (c) => c.arc(hx + R * 0.12, ey, R * 0.22, 0, Math.PI * 2));
      // Tiny crossed-tool mark instead of a familiar letter emblem.
      ctx.strokeStyle = p.h; ctx.lineWidth = hair(0.6, ow * 0.55);
      ctx.beginPath();
      ctx.moveTo(hx + R * 0.02, ey - R * 0.1); ctx.lineTo(hx + R * 0.22, ey + R * 0.1);
      ctx.moveTo(hx + R * 0.22, ey - R * 0.1); ctx.lineTo(hx + R * 0.02, ey + R * 0.1);
      ctx.stroke();
    }
    if (tilt) ctx.restore();
  } else if (spec.head === 'jackal') {
    // A small windswept brow tuft, not a bank of rear-facing spines.
    outlined(ctx, p.h, ow, (c) => bluntSpike(c,
      hx - R * 0.52, hy - R * 0.74,
      hx - R * 0.05, hy - R * 1.2,
      hx + R * 0.24, hy - R * 0.78));
    // A fan of quills on each side, swept up-and-out to tuck below the ear and
    // fill the crown into one clean silhouette. Two tiers for a fuller set.
    for (const side of [-1, 1]) {
      for (const [bx, by, tx, ty, ex, ey] of [
        [0.6, 0.68, 1.18, 0.88, 0.82, 0.16],    // upper quill
        [0.74, 0.26, 1.2, 0.34, 0.86, -0.24],   // lower quill
      ]) {
        outlined(ctx, p.h, ow, (c) => bluntSpike(c,
          hx + side * R * bx, hy - R * by,
          hx + side * R * tx, hy - R * ty,
          hx + side * R * ex, hy - R * ey));
      }
    }
  } else if (spec.head === 'floppy') {
    // Blond hair: a rounded mass whose crown is hidden under the bandana
    // (drawn next); it shows as a jagged fringe of bangs at the forehead and
    // as sideburns framing the temples.
    if (spec.referenceHair) {
      const joinY = (spec.joinedLocks ? 0.67 : 0.76) - (spec.lockLift || 0);
      // The cheek locks END where the tuft BEGINS, so they have to move with
      // it: `lockIn` pulls the tuft toward the face, and left out of these two
      // ends the cheek hair stopped at the old position and the tuft started
      // at the new one — two pieces of hair with a gap between them.
      const lin = spec.lockIn || 0;
      const endX = (spec.joinedLocks ? 1.07 : 0.96) - lin;
      const endXR = (spec.joinedLocks ? 1.07 : 0.97) - lin;
      const inX = (spec.joinedLocks ? 0.87 : 0.78) - lin;
      const inXL = (spec.joinedLocks ? 0.87 : 0.79) - lin;
      // Two substantial swept bangs, with slim cheek locks connecting to the
      // low ties. No sawtooth bowl fringe across the forehead.
      //
      // Kept as a named path, not an inline one: the headband clips to this
      // exact silhouette so it can end ON the hair's edge rather than short of
      // it or past it. Two rounds were spent guessing a width; the shape
      // itself is the only thing that knows where the edge is.
      bangPath = (c) => {
        c.moveTo(hx - R * endX, hy + R * (spec.joinedLocks ? joinY + 0.04 : 0.76));
        c.quadraticCurveTo(hx - R * 1.16, hy - R * 0.46, hx - R * 0.65, hy - R * 0.94);
        c.quadraticCurveTo(hx + R * 0.2, hy - R * 1.28, hx + R * 0.82, hy - R * 0.78);
        c.quadraticCurveTo(hx + R * 1.12, hy - R * 0.34, hx + R * endXR, hy + R * (spec.joinedLocks ? joinY + 0.04 : 0.78));
        c.lineTo(hx + R * inX, hy + R * (spec.joinedLocks ? joinY + 0.04 : 0.63));
        c.lineTo(hx + R * 0.78, hy - R * 0.12);
        c.quadraticCurveTo(hx + R * 0.48, hy - R * 0.24, hx + R * 0.26, hy - R * 0.65);
        c.quadraticCurveTo(hx + R * 0.14, hy - R * 0.29, hx - R * 0.24, hy - R * 0.14);
        c.lineTo(hx - R * 0.12, hy - R * 0.4);
        c.quadraticCurveTo(hx - R * 0.44, hy - R * 0.12, hx - R * 0.8, hy - R * 0.05);
        c.lineTo(hx - R * inXL, hy + R * (spec.joinedLocks ? joinY + 0.04 : 0.69));
        c.closePath();
      };
      outlined(ctx, p.hair || p.a, ow, bangPath);
      if (!lod) drawHairStreaks(ctx, spec, p, ow, bangPath, {
        region: 'bangs', R, X: (x) => hx + R * x, Y: (y) => hy + R * y });
    } else outlined(ctx, p.a, ow, (c) => {
      c.moveTo(hx - R * 0.96, hy + R * 0.06);            // left temple / sideburn
      c.quadraticCurveTo(hx - R * 1.1, hy - R * 0.74, hx - R * 0.3, hy - R * 1.04);
      c.quadraticCurveTo(hx + R * 0.42, hy - R * 1.26, hx + R * 1.0, hy - R * 0.6);
      c.quadraticCurveTo(hx + R * 1.12, hy - R * 0.28, hx + R * 0.92, hy + R * 0.06); // right temple / sideburn
      // jagged fringe of bangs across the forehead, tips clear of the eyes
      c.lineTo(hx + R * 0.74, hy - R * 0.3);
      c.lineTo(hx + R * 0.58, hy - R * 0.06);
      c.lineTo(hx + R * 0.42, hy - R * 0.32);
      c.lineTo(hx + R * 0.26, hy - R * 0.06);
      c.lineTo(hx + R * 0.08, hy - R * 0.34);
      c.lineTo(hx - R * 0.1, hy - R * 0.06);
      c.lineTo(hx - R * 0.28, hy - R * 0.34);
      c.lineTo(hx - R * 0.46, hy - R * 0.06);
      c.lineTo(hx - R * 0.64, hy - R * 0.3);
      c.lineTo(hx - R * 0.82, hy - R * 0.06);
      c.closePath();
    });
    // The compact princess cut is a little cap that sits on the crown rather
    // than a full do-rag. That leaves the side locks outside the hat silhouette
    // at 24u, which is the read the concept study was buying. The shipped cut
    // stays byte-for-byte on its original path below.
    if (!spec.princessWear) outlined(ctx, p.h, ow, (c) => {
      if (compactFloppy) {
        c.moveTo(hx - R * 0.7, hy - R * 0.42);
        c.quadraticCurveTo(hx - R * 0.05, hy - R * 1.08, hx + R * 0.68, hy - R * 0.44);
        c.quadraticCurveTo(hx + R * 0.78, hy - R * 0.62, hx + R * 0.48, hy - R * 0.86);
        c.quadraticCurveTo(hx, hy - R * 1.16, hx - R * 0.48, hy - R * 0.86);
        c.quadraticCurveTo(hx - R * 0.8, hy - R * 0.62, hx - R * 0.7, hy - R * 0.42);
      } else {
        c.moveTo(hx - R * 1.02, hy - R * 0.22);
        c.quadraticCurveTo(hx, hy - R * 1.18, hx + R * 1.02, hy - R * 0.22);        // front hem: very high center (lots of bangs), arcing down and just past each side
        c.quadraticCurveTo(hx + R * 1.16, hy - R * 0.72, hx + R * 0.48, hy - R * 1.16); // over the crown, right side
        c.quadraticCurveTo(hx, hy - R * 1.36, hx - R * 0.48, hy - R * 1.16);        // crown top
        c.quadraticCurveTo(hx - R * 1.16, hy - R * 0.72, hx - R * 1.02, hy - R * 0.22); // down the left side
      }
      c.closePath();
    });
  } else if (spec.head === 'dome') {
    // antenna: a stalk off the dome with a light that blinks in run cadence
    const tipY = hy - R * 1.5;
    const tipX = hx + R * 0.14;
    limb(ctx, hx + R * 0.05, hy - R * 0.8, tipX, tipY, 0.028 * u, p.p, Math.max(0.6, ow * 0.6));
    if (pose.kind === 'celebrate' && !lod) {
      // Victory broadcast: signal rings pulsing off the antenna. Three of them,
      // evenly staggered through one shared life cycle, so there is always one
      // leaving the tip while another is fading out at full spread — a single
      // ring reads as a blink, and two leave a dead gap between pulses. Radius
      // and alpha both ride `q`, so each ring thins and fades as it expands
      // instead of popping out of existence at the edge. Drawn BEFORE the lamp
      // below, letting the lamp cap the point they emanate from.
      const rt = pose.time || 0;
      ctx.save();
      ctx.strokeStyle = p.e;
      for (let i = 0; i < 3; i++) {
        const q = (rt * 0.8 + i / 3) % 1;
        ctx.globalAlpha = (1 - q) * 0.7;
        ctx.lineWidth = hair(0.5, ow * (1 - q * 0.55));
        ctx.beginPath();
        ctx.arc(tipX, tipY, R * (0.2 + q * 0.95), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    dot(ctx, tipX, tipY, R * 0.13, Math.sin((pose.time || 0) * 6) > 0 ? p.a : p.w);
    // faceplate: a dark screen, not a face — the LED eyes live on it
    outlined(ctx, p.s, hair(0.6, ow * 0.7), (c) => roundRectPath(c, hx - R * 0.62, hy - R * 0.28, R * 1.24, R * 0.95, R * 0.3));
    if (!lod) {
      dot(ctx, hx - R * 0.3, hy - R * 0.68, R * 0.1, p.w);
      dot(ctx, hx + R * 0.3, hy - R * 0.68, R * 0.1, p.w);
      // bolt "ears" pin the dome together at the temples
      outlined(ctx, p.p, hair(0.5, ow * 0.5), (c) => c.arc(hx - R * 0.98, hy + R * 0.12, R * 0.16, 0, Math.PI * 2));
      outlined(ctx, p.p, hair(0.5, ow * 0.5), (c) => c.arc(hx + R * 0.98, hy + R * 0.12, R * 0.16, 0, Math.PI * 2));
      // specular gloss: a crescent on the upper-left of the dome plus a glint
      // dot — silver only reads as polished metal once light lands on it
      ctx.save();
      ctx.strokeStyle = '#f8fbff';
      ctx.lineCap = 'round';
      ctx.lineWidth = R * 0.19;
      ctx.beginPath();
      ctx.arc(hx, hy, R * 0.68, -2.9, -2.25);
      ctx.stroke();
      ctx.restore();
      dot(ctx, hx + R * 0.5, hy - R * 0.42, R * 0.085, '#f8fbff');
    }
  } else if (spec.head === 'paperhat') {
    // Shaggy green mop under the cap: bulges past the skull at the sides so it
    // pokes out from under the paper, hangs down into bangs at the temples, and
    // comes back across the brow as a jagged fringe. The fringe only drops low
    // outboard of x = ±0.68R — inside that it stays above the eyes and brows,
    // since hair sitting over a brow just reads as a shadow.
    outlined(ctx, p.hair || p.m, ow, (c) => {
      c.moveTo(hx - R * 1.0, hy + R * 0.3);                                          // left bang, hanging past the temple
      c.quadraticCurveTo(hx - R * 1.2, hy - R * 0.5, hx - R * 0.6, hy - R * 1.02);   // up the left side, bulging out past the head
      c.quadraticCurveTo(hx, hy - R * 1.24, hx + R * 0.62, hy - R * 0.98);           // over the crown (the cap covers this)
      c.quadraticCurveTo(hx + R * 1.16, hy - R * 0.5, hx + R * 0.98, hy + R * 0.26); // down the right side
      c.lineTo(hx + R * 0.86, hy + R * 0.02);                                         // right bang
      c.lineTo(hx + R * 0.7, hy - R * 0.52);                                          // rises sharply clear of the brow
      c.lineTo(hx + R * 0.5, hy - R * 0.66);
      c.lineTo(hx + R * 0.34, hy - R * 0.5);
      c.lineTo(hx + R * 0.14, hy - R * 0.68);
      c.lineTo(hx - R * 0.06, hy - R * 0.5);
      c.lineTo(hx - R * 0.26, hy - R * 0.68);
      c.lineTo(hx - R * 0.46, hy - R * 0.52);
      c.lineTo(hx - R * 0.66, hy - R * 0.66);
      c.lineTo(hx - R * 0.82, hy - R * 0.06);                                         // left bang
      c.closePath();
    });
    // Fast-food paper cap. The old version was a small tilted quad that read as
    // a stray napkin: too narrow to sit ON anything, and no landmark saying
    // "hat". This is the soda-jerk shape instead — a flat top FLARED WIDER than
    // the head, sitting on a folded band that wraps the skull. The flare is
    // what sells it: a hat brim reads because it overhangs what it rests on.
    const capY = hy - R * 0.7;                                                        // where the band sits on the head
    outlined(ctx, p.a, ow, (c) => {
      c.moveTo(hx - R * 0.92, capY);
      c.quadraticCurveTo(hx - R * 1.1, hy - R * 1.02, hx - R * 1.0, hy - R * 1.32);   // flares up and out on the left
      c.quadraticCurveTo(hx, hy - R * 1.52, hx + R * 1.02, hy - R * 1.26);            // softly domed flat top
      c.quadraticCurveTo(hx + R * 1.08, hy - R * 0.98, hx + R * 0.9, capY + R * 0.04); // back down to the band
      c.closePath();
    });
    // The folded band along the bottom, a shade darker than the crown. Traced
    // just inside the hat's own bottom edge so it never spills past the paper.
    outlined(ctx, '#c8c8dc', hair(0.5, ow * 0.6), (c) => {
      c.moveTo(hx - R * 0.92, capY);
      c.lineTo(hx + R * 0.9, capY + R * 0.04);
      c.lineTo(hx + R * 0.96, capY - R * 0.3);
      c.quadraticCurveTo(hx, capY - R * 0.46, hx - R * 0.97, capY - R * 0.26);
      c.closePath();
    });
  } else if (spec.head === 'hairnet') {
    // Grey set hair under a net, with the bun at the BACK of the skull. Two
    // landmarks carry this at hub scale and the rest is texture: the bun's
    // silhouette breaking the head's circle, and the elastic band running
    // across the brow. A net drawn as mesh alone samples down to a grey smear
    // — the band is the line that says "food service" rather than "old lady".
    const bunX = hx - R * 0.92, bunY = hy - R * 0.5;
    outlined(ctx, p.hair, ow, (c) => c.arc(bunX, bunY, R * 0.46, 0, Math.PI * 2));
    // The set itself: a helmet of hair sitting proud of the skull all round,
    // swept back into the bun rather than hanging in bangs — this is hair that
    // has been dealt with, which is the opposite of Gary's mop.
    outlined(ctx, p.hair, ow, (c) => {
      c.moveTo(hx - R * 0.98, hy - R * 0.12);
      c.quadraticCurveTo(hx - R * 1.14, hy - R * 0.72, hx - R * 0.34, hy - R * 1.1);
      c.quadraticCurveTo(hx + R * 0.5, hy - R * 1.26, hx + R * 0.98, hy - R * 0.66);
      c.quadraticCurveTo(hx + R * 1.1, hy - R * 0.42, hx + R * 0.96, hy - R * 0.24);
      c.quadraticCurveTo(hx + R * 0.3, hy - R * 0.62, hx - R * 0.5, hy - R * 0.5);
      c.closePath();
    });
    if (!lod) {
      // The net: a couple of arcs following the crown, and the elastic across
      // the forehead. Kept to three strokes — at this size any more mesh fills
      // in solid and the hair loses its own colour.
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.strokeStyle = p.w;
      ctx.lineWidth = hair(0.4, ow * 0.5);
      for (const k of [0.6, 0.86]) {
        ctx.beginPath();
        ctx.arc(hx, hy, R * k, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
      ctx.restore();
      // An even-width elastic rather than one that flares at the temples: the
      // old ends were twice the depth of the middle and ran down the sides of
      // her face like sideburns. Same band, same line, just cut level.
      outlined(ctx, p.a, hair(0.4, ow * 0.5), (c) => {
        c.moveTo(hx - R * 1.0, hy - R * 0.46);
        c.quadraticCurveTo(hx, hy - R * 0.74, hx + R * 0.98, hy - R * 0.38);
        c.lineTo(hx + R * 0.98, hy - R * 0.25);
        c.quadraticCurveTo(hx, hy - R * 0.6, hx - R * 1.0, hy - R * 0.33);
        c.closePath();
      });
    }
  } else if (longHair) {
    // The hair ON the head: a side part swept across the brow. Its lower edge
    // is the whole constraint — the eyes sit at -0.07R and the brows reach
    // -0.57R, so the fringe holds at -0.62R across the middle and only falls
    // past the eye line OUTBOARD of the temples, where there is no face under
    // it. Hair over a brow does not read as a fringe at this size, it reads as
    // a shadow, which is the same finding Gary's mop is built around.
    const dark = p.hairDark || p.hair;
    // HAIRLINE. `fr.back` lifts the fringe's lower edge — and ONLY its lower
    // edge — off the brow, opening a band of forehead that the shipped sweep
    // covers completely. The temple ends do not move with it: hair still comes
    // down in front of each ear, which is what makes the result read as a
    // hairline set back rather than as a fringe that got shorter. The measured
    // ceiling on it is the brow at -0.633R, so a lift of 0.2R leaves about
    // 0.15R of clear forehead and is as far as this can usefully go.
    const back = -R * (fr.back || 0);
    // PILE. The same lift the rim's crown gets, applied to the fringe's crown so
    // the two rise as one shape — see the rim's HY. Only the points ABOVE the
    // head move, so more hair on top never costs any length.
    const pile = R * (fr.pile || 0);
    // The fringe's LOWER EDGE, as a curve that can be sampled. It is two
    // quadratics — right temple to just past the centre, then on to the left
    // temple — and it is written out here as data rather than inline in the path
    // because the TUFTS have to root ON it. That is the whole difference between
    // a tuft and a sideburn: a lock whose base is a pair of points on this curve
    // is part of the fringe, and a lock placed at hand-chosen coordinates near it
    // is a wedge of hair floating on her cheek, which is exactly how the first
    // version read.
    //
    // `s` runs 0..2 across both halves. Positive x is her front, so s = 0 is the
    // temple on that side and s = 2 the one at her back.
    const EDGE = [[0.8, -0.2], [0.46, -0.68], [-0.14, -0.62], [-0.58, -0.56], [-0.8, -0.16]];
    const edgeAt = (s) => {
      const [a, c2, b] = s <= 1 ? [EDGE[0], EDGE[1], EDGE[2]] : [EDGE[2], EDGE[3], EDGE[4]];
      const t = s <= 1 ? s : s - 1, k = 1 - t;
      return [hx + R * (k * k * a[0] + 2 * k * t * c2[0] + t * t * b[0]),
        hy + R * (k * k * a[1] + 2 * k * t * c2[1] + t * t * b[1]) + back];
    };
    // TUFTS: the loose hair on her forehead, built the way Lorenzo's locks poke
    // out from under his cap — a blunt spike rooted on TWO points of the
    // hairline, wide at the base and converging to a soft point. Not the thin
    // near-vertical strips this started as: one narrow lock down the middle reads
    // as a mark ON her forehead, and two of them read as scratches.
    //
    // Drawn in the SAME path as the fringe, which is the other half of the fix.
    // outlined() runs one fat stroke pass and then fills, so every subpath handed
    // to it merges into a single shape with no internal seam — the same trick the
    // plait's chain of lozenges uses. A tuft cannot come adrift from a fringe it
    // is literally part of.
    //
    //   [root s, root s, drop, bias]
    // Roots are two positions along the hairline; the tip hangs `drop` below the
    // lower of them, biased `bias` along x. Everything is RELATIVE to the roots
    // rather than placed absolutely, which means a lock's length is measured from
    // the hairline: it does not stretch when the hairline lifts, and lifting the
    // hairline carries the whole lock up with it. That is the only way to raise a
    // tooth without flattening it, since its depth and its height on the head are
    // two different numbers.
    //
    // The pair sits well apart, one either side of the parting, with the one on
    // the heavy side reaching a little lower: that side's hairline is already the
    // lower of the two, so the fringe and the tuft agree rather than argue.
    // The twin pair is one W, not two teeth. They SHARE their middle root, so the
    // hairline runs down-up-down as a single zigzag — drawn as two separate spikes
    // with a gap of plain hairline between them, they read as a pair of little
    // triangular teeth instead.
    //
    // It is solved against the brow rather than placed by eye, and the solution is
    // what makes it wide: a brow spans |x| = 0.14R..0.68R with its TOP at -0.633R,
    // so there are two ways past it and the W uses both. Its three ROOTS sit high
    // on the hairline, at -0.656R..-0.747R — above the brow top — so the W can be
    // as wide as it likes and reach out over a brow's inner half without touching
    // it. Its two TIPS then converge INWARD to |x| ≈ 0.12R, inside the 0.27R
    // channel between the brows, which is the only place a lock may hang below
    // brow level with nothing under it. Wide where it is high, narrow where it is
    // low.
    //
    // The W is deliberately LOPSIDED. Its two halves matched, it read as a piece
    // of trim rather than as hair — hair does not fall symmetrically, and a
    // symmetric zigzag on a head that already has a symmetric pair of buns is one
    // symmetry too many. So the front half is the wide shallow one and the back
    // half the narrow deep one:
    //
    //   part    base                 tip      what it is
    //   front   +0.54R..+0.13R       -0.58R   a wide shallow slope, barely dropped
    //   middle  +0.13R..-0.20R       -0.51R   the POINT: 0.33R base against a 0.26R drop
    //   tail    -0.20R..-0.30R       -0.63R   the fine lock behind it, 0.10R of base
    //
    // POINTINESS IS THE RATIO of base to drop, not size — so a sharper point is a
    // narrower base AND a deeper drop, and doing only the first shrinks the tooth
    // instead of sharpening it. That is why `wBack` and `midDrop` are separate
    // knobs and why the sharper variants move both.
    //
    // Four numbers place the whole thing, and every tip is derived from its own
    // base rather than hand-placed, so moving a root drags its tip along and
    // nothing has to be re-tuned:
    //   wMid     the root shared by front and middle — slide it to move the middle
    //            tooth and the tail rightward together
    //   wBack    the middle tooth's outer root, i.e. how wide its base is
    //   midDrop  how far the point comes down
    //   tailDrop how far the tail does. It needs a real figure to exist at all:
    //            at 0.045R it was flat enough to vanish, which is why the left
    //            tendril went missing.
    //   tailW    the tail's own base width, in `s` — it is the FINE one of the
    //            three and reads as a stray rather than as a third point.
    const wMid = fr.wMid || 0.76, wBack = fr.wBack || 1.06;
    const WROOTS = [0.34, wMid, wBack, wBack + (fr.tailW || 0.12)];
    const WTIPS = [[-0.21, 0.035], [0.02, fr.midDrop || 0.26], [0, fr.tailDrop || 0.12]];
    // The single-lock control keeps the one-spike form, which is what it is for.
    const TUFTS = fr.twin ? [] : [[0.78, 1.12, 0.32, 0.0]];
    // The wisps in front of each ear. Rooted on the same curve, at its ends,
    // where the hairline is at its lowest and there is no face underneath — so
    // these are the two locks that may fall past the eye entirely, and the only
    // ones that hang below the jaw.
    const WISPS = [[0.02, 0.2, 0.42, 0.08], [1.82, 1.99, 0.46, -0.1]];
    // Every lock is CUT INTO the fringe's lower edge rather than glued on below
    // it, as one boundary walk: [root s, root s, tip bias, drop]. Two separate
    // attempts failed before this and both failures were instructive.
    //
    // Added as extra subpaths inside the fringe's own outlined() call, narrow
    // locks came out HOLLOW — filled, but then swallowed by the shading. Every
    // shape this file draws gets a rim stroked just INSIDE its contour, and on a
    // spike 0.2R wide by 0.26R deep that band covers nearly the whole tooth: what
    // is left reads as a pale outline of a lock rather than a lock. The temple
    // wisps survived it only because they are longer and fatter.
    //
    // Walked as one polygon that ran out along the teeth and back along the
    // hairline, it came out a SCRIBBLE: the return leg was sampled at arbitrary
    // `s` values that missed the roots the outbound leg had used, so the two legs
    // genuinely crossed, and a nonzero fill cancelled the lobes.
    //
    // So: one path, one form, no self-intersection. The teeth are part of the
    // fringe's silhouette, get the fringe's own fill and shading, and cannot come
    // adrift from it — the same construction as Lorenzo's cap tufts, which build
    // the band and all its locks in a single path for exactly this reason.
    // The temple wisps, outermost pair FIRST. `tendrils: true` is the shipped
    // read — one central lock plus the outer pair. A NUMBER instead asks for
    // that many wisps (2/4/6 = one/two/three pairs) and no central lock at
    // all: on a pulled-back head the wisps say "coming loose", and a lock in
    // the middle of the forehead reads as a separate decision (it was tried,
    // as the raider's forelock, and cut).
    //
    // Each pair steps INBOARD along the hairline and gets SHALLOWER as it
    // goes, and the two move together for the same reason the W is wide where
    // it is high: inboard of the temples the hairline runs over the brows
    // (|x| = 0.14R..0.68R, top at -0.633R), so a lock there has to stay above
    // them — only the outermost pair hangs in front of the ears, where there
    // is no face underneath and a lock may fall past the eye.
    const WISP_PAIRS = [
      [[0.02, 0.2, 0.08, 0.42], [1.82, 1.99, -0.1, 0.46]],
      [[0.26, 0.4, 0.05, 0.17], [1.56, 1.7, -0.06, 0.2]],
      [[0.48, 0.6, 0.03, 0.11], [1.3, 1.42, -0.03, 0.13]],
    ];
    const wisps = typeof fr.tendrils === 'number'
      ? WISP_PAIRS.slice(0, Math.max(1, Math.min(WISP_PAIRS.length, Math.round(fr.tendrils / 2))))
      : WISP_PAIRS.slice(0, 1);
    // LOCKS is consumed in hairline order, so: front wisps outboard-in, the
    // central lock (or the W), then the back wisps inboard-out.
    const LOCKS = !fr.tendrils ? [] : [
      ...wisps.map((pr) => pr[0]),
      ...(typeof fr.tendrils === 'number' ? []
        : fr.twin
          ? WTIPS.map(([bias, drop], k) => [WROOTS[k], WROOTS[k + 1], bias, drop])
          : [[0.78, 1.12, 0.0, 0.32]]),
      ...wisps.map((pr) => pr[1]).reverse(),
    ];
    // Enough samples that the edge still reads as the curve it is; the locks are
    // spliced in at their exact roots rather than at sample boundaries.
    const EDGE_N = 26;
    const soft = (from, tip) => [from[0] + (tip[0] - from[0]) * 0.7,
      from[1] + (tip[1] - from[1]) * 0.7];
    outlined(ctx, p.hair, ow, (c) => {
      c.moveTo(hx - R * 1.04, hy + R * 0.04);                                       // left temple, falling past the eye line
      c.quadraticCurveTo(hx - R * 1.2, hy - R * 0.7 - pile, hx - R * 0.4, hy - R * 1.08 - pile);
      c.quadraticCurveTo(hx + R * 0.48, hy - R * 1.3 - pile, hx + R * 1.04, hy - R * 0.5);  // over the crown, piled
      c.quadraticCurveTo(hx + R * 1.16, hy - R * 0.24, hx + R * 0.96, hy + R * 0.06); // right temple
      c.lineTo(...edgeAt(0));                                                        // down onto the hairline
      let li = 0, done = 0;
      for (let i = 1; i <= EDGE_N; i++) {
        const sAt = (i / EDGE_N) * 2;
        while (li < LOCKS.length && LOCKS[li][0] <= sAt) {
          const [sa, sb, bias, drop] = LOCKS[li];
          const ra = edgeAt(sa), rb = edgeAt(sb);
          const tip = [(ra[0] + rb[0]) / 2 + R * bias, Math.max(ra[1], rb[1]) + R * drop];
          c.lineTo(...ra);
          c.lineTo(...soft(ra, tip));
          c.quadraticCurveTo(tip[0], tip[1], ...soft(rb, tip));  // a blunt point, not a needle
          c.lineTo(...rb);
          done = sb;
          li++;
        }
        if (sAt > done) c.lineTo(...edgeAt(sAt));
      }
      c.lineTo(...edgeAt(2));
      c.closePath();
    });
    if (!lod) {
      // The parting itself: one stroke from the crown down the sweep. Without
      // it the fringe is a single flat colour and reads as a cap.
      ctx.strokeStyle = dark;
      ctx.lineWidth = hair(0.4, ow * 0.7);
      ctx.beginPath();
      ctx.moveTo(hx - R * 0.3, hy - R * 1.08 - pile);
      ctx.quadraticCurveTo(hx + R * 0.2, hy - R * 0.9 + back, hx + R * 0.62, hy - R * 0.4 + back);
      ctx.stroke();
    }
    if (spec.headband) {
      // Worn at the HAIRLINE, not on the forehead: between fringe and brow
      // there is 0.05R of face, so a band down there lands on an eyebrow. Up
      // on the hair it reads as a band pushed back to keep the fringe out of
      // her eyes, which is what it is for.
      outlined(ctx, p.a, hair(0.45, ow * 0.55), (c) => {
        c.moveTo(hx - R * 1.06, hy - R * 0.5);
        c.quadraticCurveTo(hx, hy - R * 1.24, hx + R * 1.04, hy - R * 0.44);
        c.lineTo(hx + R * 1.02, hy - R * 0.3);
        c.quadraticCurveTo(hx, hy - R * 1.0, hx - R * 1.04, hy - R * 0.36);
        c.closePath();
      });
    }
    if (spec.head === 'buns' && spec.bunJoin && !lod) {
      // The JOIN dressing: the arc where each bun meets the top of the head,
      // picked out in her own piping gold. The palette calls `a` "gold piping,
      // and the bands at the buns", so this is the colour already reserved for
      // exactly this.
      //
      // Painted HERE, dead last, and that is the whole reason this block is not
      // beside the buns it belongs to. The join is on the INBOARD side of each
      // bun, which is behind both the skull and the fringe — drawn with the buns
      // in the behind-head pass the row was painted and then buried, and only
      // the one or two marks that happened to fall outside the fringe survived.
      // Jewellery sits on top of the hair; so does this.
      //
      // Two dressings, one arc. `band` is a thin ribbon following the join and is
      // the quiet answer; `beads` is a row of five, off the chibi reference, and
      // is busier — five discs each carrying their own outline is a lot of marks
      // for an arc this short.
      //
      // Neither is visible at hero size and neither pretends to be: both are
      // well under a pixel at 24px and `!lod` excludes them there. This is detail
      // for the hub, the menus and the HUD portrait, where her head is big enough
      // to have jewellery at all.
      //
      // 4 o'clock on her right bun and 8 on her left — down and INBOARD, the half
      // of the bun that faces the crown. In this sx-mirrored frame 0° is straight
      // outboard and positive is down, so 104°..168° is that arc on both sides.
      // An earlier pass ran on round to 242°, which carried it up past horizontal
      // and put most of the gold on TOP of the bun: the wrong half of the join.
      // JR is the wrap circle's OWN radius, so the band is centred exactly on the
      // join — the visible boundary between white ribbon and brown hair IS that
      // circle's edge, and half the band's width falls either side of it. 0.86
      // sat it just outboard of the line, on white.
      const A0 = 104, A1 = 168, JR = oxR * 0.82;
      for (const sx of [-1, 1]) {
        const wcx = oxX(sx) + sx * oxR * 0.26, wcy = oxY - oxR * 0.12;
        const at = (t, r) => {
          const a2 = (A0 + (A1 - A0) * t) * Math.PI / 180;
          return [wcx + Math.cos(a2) * sx * r, wcy + Math.sin(a2) * r];
        };
        if (spec.bunJoin === 'beads') {
          for (let i = 0; i < 4; i++) dot(ctx, ...at(i / 3, JR), oxR * 0.17, p.a);
        } else {
          // Sampled out along one edge and back along the other rather than
          // stroked: an outlined fill is what every other mark on this head is,
          // and it keeps the band's ends cut square instead of round.
          const hw = oxR * 0.14, N = 8;
          outlined(ctx, p.a, hair(0.4, ow * 0.5), (c) => {
            for (let i = 0; i <= N; i++) {
              const [x, y] = at(i / N, JR + hw);
              if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
            }
            for (let i = N; i >= 0; i--) c.lineTo(...at(i / N, JR - hw));
            c.closePath();
          });
        }
      }
    }
  } else if (spec.head === 'bald') {
    // Intentionally bare: Grumpos's asymmetric war-paint streak is drawn
    // below. A curved crown stripe reads too easily as a hat at tiny scale.
  }
  if (spec.referenceHair && spec.joinedLocks && !lod) {
    // The bands wrap the shared neck of cheek lock and tuft, above both hair
    // passes. A horizontal wrap reads as a tie rather than a hanging ornament.
    const tieSize = spec.tieSize ?? 1;
    for (const side of [-1, 1]) {
      // The band wraps the JOIN, so it moves with it — see lockIn above.
      const tx = hx + side * R * ((spec.joinedLocks ? 1.03 : 0.98) - (spec.lockIn || 0));
      const ty = hy + R * (0.71 - (spec.lockLift || 0));
      const angle = -side * (spec.tieAngle ?? 0.16);
      if (spec.tieStyle === 'band') {
        const half = R * 0.15 * tieSize;
        const thick = R * 0.085 * tieSize;
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(angle);
        outlined(ctx, p.h, ow * 0.5, (c) => {
          c.moveTo(-half, -thick * 0.55);
          c.lineTo(-half * 0.72, -thick);
          c.lineTo(half * 0.88, -thick * 0.72);
          c.lineTo(half, thick * 0.55);
          c.lineTo(half * 0.72, thick);
          c.lineTo(-half * 0.88, thick * 0.72);
          c.closePath();
        });
        ctx.restore();
      } else {
        outlined(ctx, p.h, ow * (spec.fineTies ? 0.35 : 0.65), (c) => c.ellipse(
          tx, ty,
          R * (spec.fineTies ? 0.135 : 0.2) * tieSize,
          R * (spec.fineTies ? 0.055 : 0.115) * tieSize,
          angle, 0, Math.PI * 2));
      }
    }
  }
  if (spec.princessWear && !lod) {
    const wear = spec.princessWear;
    const gold = p.crown || p.a;
    // A single outline per piece keeps the small gold silhouette clean.
    if (wear === 'reference') {
      const capNarrow = spec.capNarrow ?? 1;
      const capShort = spec.capShort ?? 1;
      const capPointLift = spec.capPointLift ?? 0;
      // Shorten the crown toward its lower edge while keeping the folded point
      // attached to the same cap line. The default path remains unchanged.
      const capX = (x) => hx + R * x * capNarrow;
      const capY = (y) => hy + R * (y < -0.2 ? -0.2 + (y + 0.2) * capShort : y);
      const capPointY = (y) => capY(y) - R * capPointLift;
      outlined(ctx, p.h, ow, (c) => {
        c.moveTo(capX(-1.02), capY(-0.32));
        c.quadraticCurveTo(capX(-1.13), capY(-0.88), capX(-0.4), capY(-1.44));
        c.quadraticCurveTo(capX(0), capY(-1.76), capX(0.52), capY(-1.36));
        c.quadraticCurveTo(capX(0.96), capY(-1.32), capX(1.02), capY(-0.7));
        c.lineTo(capX(1.27), capPointY(-0.12));
        c.quadraticCurveTo(capX(1.04), capPointY(-0.06), capX(0.96), capPointY(-0.2));
        c.quadraticCurveTo(capX(0.85), capY(-0.84), capX(0.16), capY(-0.82));
        c.quadraticCurveTo(capX(-0.54), capY(-0.83), capX(-1.02), capY(-0.32));
        c.closePath();
      });
      if (spec.capFold) {
        outlined(ctx, p.hatDark || '#497e32', ow * 0.6, (c) => {
          c.moveTo(capX(0.35), capY(-1.35));
          c.quadraticCurveTo(capX(0.73 + spec.capFold * 0.1), capY(-1.14), capX(0.91), capY(-0.55));
          c.quadraticCurveTo(capX(0.77), capY(-1.21), capX(0.35), capY(-1.35));
          c.closePath();
        });
      }
      ctx.save();
      // Position the entire setting and jewel together on the cap's plane.
      if (spec.capBand) {
        // Sample the actual asymmetric cap hem. The full band terminates at
        // its side edges; the short cut stops well before the temples.
        const at = (t) => {
          const q = Math.abs(t), v = 1 - q;
          const x = t < 0 ? v*v*0.16 + 2*v*q*-0.54 + q*q*-1.02
            : v*v*0.16 + 2*v*q*0.85 + q*q*0.96;
          const y = t < 0 ? v*v*-0.82 + 2*v*q*-0.83 + q*q*-0.32
            : v*v*-0.82 + 2*v*q*-0.84 + q*q*-0.2;
          return [capX(x), capY(y - 0.075 - (spec.bandLift || 0))];
        };
        const end = spec.capBand === 'wrap' ? 1 : 0.57;
        const bandHalf = spec.bandHalf ?? 0.045;
        outlined(ctx, gold, ow * 0.55, (c) => {
          for (let i = 0; i <= 24; i++) {
            const [x,y] = at(-end + 2*end*i/24);
            if (!i) c.moveTo(x,y-R*bandHalf); else c.lineTo(x,y-R*bandHalf);
          }
          for (let i = 24; i >= 0; i--) {
            const [x,y] = at(-end + 2*end*i/24); c.lineTo(x,y+R*bandHalf);
          }
          c.closePath();
        });
        if (spec.goldFinish) {
          // Two narrow edge tones describe metal without sharing the hair fill.
          for (const [offset, color] of [[-0.6, '#fff2aa'], [0.65, '#ad681b']]) {
            ctx.strokeStyle = color; ctx.lineWidth = R * bandHalf * 0.4;
            ctx.beginPath();
            for (let i = 0; i <= 24; i++) {
              const [x,y] = at(-end + 2*end*i/24);
              if (!i) ctx.moveTo(x,y+R*bandHalf*offset); else ctx.lineTo(x,y+R*bandHalf*offset);
            }
            ctx.stroke();
          }
        }
      }
      const settingY = hy - R * (0.96 + (spec.settingLift || 0));
      ctx.translate(hx + R * (spec.settingOffset || 0), settingY);
      ctx.rotate((spec.settingTilt || 0) * Math.PI / 180);
      ctx.transform(spec.settingWidth ?? 1, spec.settingSlant || 0, 0, 1, 0, 0);
      ctx.translate(-hx, -(hy - R * 0.96));
      outlined(ctx, gold, ow * 0.75, (c) => {
        if (spec.capBand) {
          c.moveTo(hx, hy-R*1.32); c.lineTo(hx+R*0.2, hy-R*0.96);
          c.lineTo(hx, hy-R*0.7); c.lineTo(hx-R*0.2, hy-R*0.96);
          c.closePath(); return;
        }
        if (spec.curvedSetting) {
          c.moveTo(hx - R * 0.97, hy - R * 0.55);
          c.quadraticCurveTo(hx - R * 0.71, hy - R * 0.94, hx - R * 0.2, hy - R * 0.96);
          c.lineTo(hx, hy - R * 1.32);
          c.lineTo(hx + R * 0.2, hy - R * 0.96);
          c.quadraticCurveTo(hx + R * 0.71, hy - R * 0.94, hx + R * 0.97, hy - R * 0.55);
          c.quadraticCurveTo(hx + R * 0.67, hy - R * 0.78, hx + R * 0.17, hy - R * 0.83);
          c.lineTo(hx, hy - R * 0.7);
          c.lineTo(hx - R * 0.17, hy - R * 0.83);
          c.quadraticCurveTo(hx - R * 0.67, hy - R * 0.78, hx - R * 0.97, hy - R * 0.55);
          c.closePath();
          return;
        }
        c.moveTo(hx - R * 0.58, hy - R * 0.9);
        c.lineTo(hx - R * 0.2, hy - R * 0.96);
        c.lineTo(hx, hy - R * 1.32);
        c.lineTo(hx + R * 0.2, hy - R * 0.96);
        c.lineTo(hx + R * 0.58, hy - R * 0.9);
        c.lineTo(hx + R * 0.53, hy - R * 0.78);
        c.lineTo(hx + R * 0.17, hy - R * 0.83);
        c.lineTo(hx, hy - R * 0.7);
        c.lineTo(hx - R * 0.17, hy - R * 0.83);
        c.lineTo(hx - R * 0.53, hy - R * 0.78);
        c.closePath();
      });
      outlined(ctx, p.gem || p.h, ow * 0.5, (c) => {
        c.moveTo(hx, hy - R * 1.14); c.lineTo(hx + R * 0.08, hy - R * 0.96);
        c.lineTo(hx, hy - R * 0.84); c.lineTo(hx - R * 0.08, hy - R * 0.96); c.closePath();
      });
      ctx.restore();
    }
    if (wear === 'cap' || wear === 'beret') {
      outlined(ctx, p.h, ow, (c) => {
        c.moveTo(hx - R * 0.76, hy - R * 0.79);
        c.quadraticCurveTo(hx - R * (wear === 'beret' ? 1.26 : 0.94), hy - R * 1.5,
          hx + R * (wear === 'beret' ? 0.18 : -0.1), hy - R * 1.45);
        c.quadraticCurveTo(hx + R * 0.87, hy - R * 1.44, hx + R * 0.76, hy - R * 0.79);
        c.quadraticCurveTo(hx, hy - R * 0.63, hx - R * 0.76, hy - R * 0.79);
        c.closePath();
      });
    }
    if (wear.startsWith('headband')) {
      // A GREEN headband with the gem in it, not a crown: the band is cloth in
      // the cap's own colour, so she keeps the green above the eyes that the
      // cap used to give her, and the gem stays the one bright mark. Cut as a
      // curved strip following the skull rather than a straight bar, which at
      // this size reads as a stripe painted across her forehead.
      const by = hy - R * 0.76;
      // The band WRAPS THE HAIR, so it runs to the hair's edge — not the
      // skull's. Two wrong versions came before this one: at a flat 0.95R the
      // ends stopped in open air short of the hair and the band read as a strip
      // laid across her fringe, and solving it against the SKULL's half-width
      // pulled the ends in further still and made it a short bar. The hair
      // stands proud of the skull at the temple, so that is the width to meet.
      //
      // And the ends DROP as they go, following the curve round the back of the
      // head. A band whose ends stop level with its middle is a straight strip
      // in front of her; one whose ends fall away reads as continuing behind.
      // Run WIDE and clipped to the hair itself (see bangPath): guessing a
      // half-width put the ends either past the silhouette or short of it, and
      // the shape is the only thing that knows where its own edge is. Cut
      // against the hair, the band meets the outline exactly.
      const halfW = R * 1.25;
      const endDrop = R * 0.1;
      const thick = R * 0.16 * (spec.bandThick ?? 1);
      // Tilted in motion, with the face. Level on a running figure the band is
      // the one horizontal line on a body that is leaning, and it reads as
      // pasted on; tipping the leading end down puts it on the same axis as
      // the head it is worn on.
      // Tilted with the LEADING side high. The first pass had the sign the
      // wrong way round and dipped the leading end, which reads as the band
      // sliding down her face rather than as the head tipping into the run.
      const moving = pose.kind === 'run' || pose.kind === 'jump';
      const bandTilt = pose.kind === 'run' ? -0.085 : pose.kind === 'jump' ? -0.055 : 0;
      ctx.save();
      if (bangPath) { ctx.beginPath(); bangPath(ctx); ctx.clip(); }
      // Pivoted on the BAND's own centre, not the head's. Rotating about the
      // head centre swings every point on the band sideways by its distance
      // above that centre — including the middle, which carries the jewel with
      // it, so the gem sat off her centre line in every pose but the idle.
      // About its own midpoint the band tips and the jewel stays put.
      if (moving) { ctx.translate(hx, by); ctx.rotate(bandTilt); ctx.translate(-hx, -by); }
      outlined(ctx, p.h, ow * 0.7, (c) => {
        c.moveTo(hx - halfW, by + thick * 0.5 + endDrop);
        c.quadraticCurveTo(hx, by - thick * 0.95, hx + halfW, by + thick * 0.5 + endDrop);
        c.lineTo(hx + halfW, by + thick * 1.7 + endDrop);
        c.quadraticCurveTo(hx, by + thick * 0.25, hx - halfW, by + thick * 1.7 + endDrop);
        c.closePath();
      });
      if (wear === 'headbandGold') {
        // Two hairlines of gold along the band's edges — the trim the cap's
        // wrap used to carry, at a fraction of its weight.
        for (const off of [0.15, 1.35]) {
          ctx.strokeStyle = gold;
          ctx.lineWidth = hair(0.4, R * 0.028);
          ctx.beginPath();
          ctx.moveTo(hx - halfW * 0.97, by + thick * off + endDrop);
          ctx.quadraticCurveTo(hx, by + thick * (off - 1.2), hx + halfW * 0.97, by + thick * off + endDrop);
          ctx.stroke();
        }
      }
      if (wear === 'headbandKnot') {
        // Tied at the side, with two short tails: the band explains how it
        // stays on, which is the same argument the G1 hair ties won on.
        // Inboard of the silhouette edge, with the tails hanging DOWN behind
        // the ear. Sat out at 0.82R the knot straddled the contour and read as
        // a chip out of her head rather than as a tie.
        const kx = hx + R * 0.66, ky = by + thick * 1.25;
        outlined(ctx, p.h, ow * 0.55, (c) => c.ellipse(kx, ky, R * 0.115, R * 0.09, 0.35, 0, Math.PI * 2));
        for (const [dx, dy] of [[0.16, 0.44], [0.3, 0.3]]) {
          outlined(ctx, p.h, ow * 0.5, (c) => {
            c.moveTo(kx, ky);
            c.quadraticCurveTo(kx + R * dx * 0.8, ky + R * dy * 0.5, kx + R * dx, ky + R * dy);
            c.lineTo(kx + R * dx * 0.86, ky + R * (dy - 0.12));
            c.closePath();
          });
        }
      }
      // The gem, in the centre of the band and set in gold — the same diamond
      // the cap's setting carries, so the two headpieces share one jewel.
      const gy = by + thick * 0.45;
      outlined(ctx, gold, ow * 0.5, (c) => c.arc(hx, gy, R * 0.145, 0, Math.PI * 2));
      outlined(ctx, p.gem || p.h, ow * 0.45, (c) => {
        c.moveTo(hx, gy - R * 0.115); c.lineTo(hx + R * 0.085, gy);
        c.lineTo(hx, gy + R * 0.115); c.lineTo(hx - R * 0.085, gy); c.closePath();
      });
      ctx.restore();
    }
    const y = hy - R * (wear === 'circlet' ? 0.72 : 0.92);
    // 'bare' is hair and nothing else — the control in the headwear row, and
    // the only way to ask whether the cap is carrying the character.
    const band = wear !== 'reference' && wear !== 'bare' && !wear.startsWith('headband');
    if (band) outlined(ctx, gold, ow * 0.8, (c) => {
      c.moveTo(hx - R * 0.63, y + R * 0.13);
      if (wear === 'crown') {
        c.lineTo(hx - R * 0.7, y - R * 0.45);
        c.lineTo(hx - R * 0.28, y - R * 0.2);
        c.lineTo(hx, y - R * 0.65);
        c.lineTo(hx + R * 0.28, y - R * 0.2);
        c.lineTo(hx + R * 0.7, y - R * 0.45);
      } else if (wear === 'tiara') {
        c.quadraticCurveTo(hx - R * 0.3, y - R * 0.02, hx, y - R * 0.5);
        c.quadraticCurveTo(hx + R * 0.3, y - R * 0.02, hx + R * 0.63, y - R * 0.08);
      } else {
        c.lineTo(hx - R * 0.63, y - R * 0.08);
        c.quadraticCurveTo(hx, y + R * 0.02, hx + R * 0.63, y - R * 0.08);
      }
      c.lineTo(hx + R * 0.63, y + R * 0.13);
      c.quadraticCurveTo(hx, y + R * 0.26, hx - R * 0.63, y + R * 0.13);
      c.closePath();
    });
    if (band) dot(ctx, hx, y - R * (wear === 'crown' ? 0.18 : wear === 'tiara' ? 0.1 : -0.07), R * 0.13, p.gem);
  }
  if (spec.princessHeadpiece && !spec.princessWear && !lod) {
    const crown = p.crown || p.a;
    const gem = p.gem || p.w || p.a;
    const bandY = hy - R * 0.96;
    const style = spec.princessHeadpiece;
    // Both cuts use a narrow, low piece that sits on the existing cap. The
    // first is a quiet tiara; the second is a single pointed crest that should
    // survive the 24u run sprite if either one can.
    outlined(ctx, crown, hair(0.45, ow * 0.58), (c) => {
      c.moveTo(hx - R * 0.54, bandY + R * 0.06);
      c.quadraticCurveTo(hx, bandY + R * 0.18, hx + R * 0.54, bandY + R * 0.06);
      c.lineTo(hx + R * 0.51, bandY - R * 0.08);
      c.quadraticCurveTo(hx, bandY + R * 0.05, hx - R * 0.51, bandY - R * 0.08);
      c.closePath();
    });
    if (style === 'tiara') {
      outlined(ctx, crown, hair(0.45, ow * 0.58), (c) => {
        c.moveTo(hx - R * 0.19, bandY + R * 0.1);
        c.lineTo(hx, bandY - R * 0.23);
        c.lineTo(hx + R * 0.19, bandY + R * 0.1);
        c.closePath();
      });
      dot(ctx, hx, bandY - R * 0.09, R * 0.075, gem);
    } else {
      outlined(ctx, crown, hair(0.45, ow * 0.58), (c) => {
        c.moveTo(hx - R * 0.24, bandY + R * 0.1);
        c.lineTo(hx, bandY - R * 0.34);
        c.lineTo(hx + R * 0.24, bandY + R * 0.1);
        c.lineTo(hx + R * 0.12, bandY + R * 0.02);
        c.lineTo(hx, bandY - R * 0.12);
        c.lineTo(hx - R * 0.12, bandY + R * 0.02);
        c.closePath();
      });
      dot(ctx, hx, bandY - R * 0.14, R * 0.08, gem);
    }
  }
  if (spec.head === 'jackal') {
    // Front-facing muzzle matches the paired eyes; the ears, cheek tuft and
    // tail carry the animal silhouette without mixing profile/front views.
    outlined(ctx, p.s, hair(0.6, ow * 0.7), (c) => c.ellipse(hx + R * 0.08, hy + R * 0.4, R * 0.7, R * 0.46, 0, 0, Math.PI * 2));
    dot(ctx, hx + R * 0.08, hy + R * 0.16, R * 0.17, p.e);
  }
  // The bake-off species' snout and face markings. Centred rather than offset:
  // the jackal's muzzle sits at +0.08R because his whole face is nudged that
  // way, and a candidate row is easier to read down when every nose is on the
  // same vertical.
  if (animal) {
    // Face dials, for the face bake-off. The whole animal mask — markings,
    // muzzle, nose, the lot — rides `eyeLift` exactly the way the eyes and
    // mouth do (see eyeY below), so dropping the features onto a bigger
    // forehead moves them as ONE face and not as parts sliding past each
    // other. `muzzleScale` shrinks the snout about its own top edge (where the
    // nose sits) rather than its centre, so a smaller muzzle stays under the
    // nose instead of leaving it floating.
    // The expression is read HERE rather than at the face block below, because
    // an animal's brow marks ARE his eyebrows (see browTilt) and they are drawn
    // under the eyes, which is above where `ex` used to be built. Hoisting it
    // is safe: nothing between the two points touches pose or spec.
    // THE FACE CENTRE LINE. drawEyes and drawMouth are both called at
    // `hx + 0.01 * u`, not at hx — the rig carries the whole face a hair ahead
    // of the skull so a runner reads as looking where he is going. The animal
    // marks were built on plain hx, which put the muzzle, the nose and the mask
    // about 0.048R to the LEFT of the eyes and mouth they belong to; at hero
    // size that is a couple of pixels of off-centre nose, and it is exactly the
    // kind of error that is invisible in isolation and obvious once seen.
    //
    // The SKULL, the ears and the ruff stay on hx, because they are the head
    // rather than the face — the same split the rig already makes.
    const faceCx = hx + 0.01 * u;
    const fdy = -(spec.eyeLift || 0) * u;
    const mScale = spec.muzzleScale || 1;
    const [mrx0, mry, mdy] = animal.muzzle;
    // The snout narrows with `faceTaper` too. Left at full width it overhangs
    // the jaw the taper just pulled in — the cream muzzle ends up the widest
    // thing on the lower face, which is the opposite of a triangle. Gently,
    // though: the muzzle is the cute part, and it is the one piece the taper
    // must not turn into a snout.
    const mrx = mrx0 * (1 - 0.16 * Math.max(0, Math.min(1, spec.faceTaper || 0)));
    // The snout is anchored by its TOP edge, where the nose sits by default.
    // `noseTuck` (0..1) slides the nose down INTO the muzzle toward its
    // centre — the reference-art read, where nose and mouth pack together low
    // on a small snout — while the muzzle itself stays put; the nose also
    // scales with the muzzle so a button snout gets a button nose.
    const mTopY = hy + fdy + R * (mdy - mry * 0.62);
    const noseY = mTopY + (spec.noseTuck || 0) * R * mry * mScale;
    // Published for the mouth below, which has to stay clear of it.
    animalNoseBottom = noseY + R * 0.13 * mScale;
    // The mask goes UNDER the muzzle and the eyes both, so the snout crops it
    // and the eyes sit on it — the layering Grumpos' war paint below documents.
    // Painted the other way round, a brow spot reads as a second eyebrow and a
    // cheek patch reads as a bald spot.
    if (animal.mask === 'panda' && !lod) {
      const markCol = p.mask || p.w || '#fff';
      // The face marks are three independent pieces, because the reference art
      // separates them and the first cut did not: a wide cheek patch sitting
      // right under the eye MERGES with the brow spot above it, and the pair
      // reads as one white field with an eye floating in it rather than as a
      // brow and a cheek. Splitting them is the whole point of these dials.
      //   browMark   'teardrop' (as cut) | 'spot' | 'bar' | 'arc' | 'none'
      //   cheekPatch 'wide' (as cut) | 'low' (dropped clear of the eye) | 'none'
      //   eyePatch   a dark ring around the eye, under everything — the
      //              reference's construction, where the DARK is the mask and
      //              the white marks read against it instead of against fur.
      const browMark = spec.browMark || 'teardrop';
      const cheekPatch = spec.cheekPatch || 'wide';
      // Worked out ONCE, above the loop, because the eye patch is drawn first
      // and has to size itself against where the brow will end up. Computed
      // inside the brow branch (where it started) these are in the temporal
      // dead zone for the patch, which is a crash rather than a wrong picture.
      //
      // The OPEN moods (surprise, joy and their variants) share one pair of
      // dials, because they are the same gesture at two strengths and tuning
      // them apart is how a face ends up with two unrelated happy expressions.
      // `browOpenTilt` and `browOpenRise` override both; the furrow moods keep
      // their own numbers.
      const openMood = ex.surprise || ex.browRaise || ex.joy || ex.cheer;
      const openTilt = spec.browOpenTilt;
      // ANGLED PER EMOTION, and consistently with the sign this file worked out
      // by rendering: NEGATIVE lifts the outer ends and drops the inner ones
      // toward the nose — stern; POSITIVE lifts the inner ends — soft, open,
      // surprised. The furrow moods were carrying POSITIVE, i.e. the soft
      // direction, which is how an annoyed face ended up wearing a pleading
      // brow. Level open moods were the other half of the problem: a raised
      // pair with no angle reads as a marking that moved rather than as an
      // expression.
      //
      //   annoyed / hmph / gruff  -0.34  the furrow
      //   focus                   -0.18  a light furrow: concentrating
      //   surprise / browRaise    +0.34  the open "oh"
      //   joy / cheer             +0.20  softer than surprise, still open
      const browMood = spec.browExpressive === false ? 0
        : ex.annoyed || ex.hmph || ex.mood === 'gruff' ? -0.34
          : ex.focus ? -0.18
            : ex.surprise || ex.browRaise ? (openTilt == null ? 0.34 : openTilt)
              : ex.joy || ex.cheer ? (openTilt == null ? 0.2 : openTilt * 0.73)
                : 0;
      // The mark RISES on the open moods and drops on the furrow, so the pair
      // is not merely rotating in place — a brow that only spins reads as a
      // dial rather than a face. The rise is also what carries an open mood
      // when the tilt is ZERO: a level brow lifted straight up is still a
      // legible "oh", so the two dials are not redundant.
      // 0.16R, not 0.06R. The first value was about 3% of the head — a raise
      // nobody could see, and invisible for a second reason once the eye patch
      // started growing to contain the brow: the mask rises with the mark, so
      // the brow keeps its position WITHIN the patch and the only cue left is
      // its distance from the eye, which 0.06R barely changes. 0.16R opens that
      // gap enough to read. The open moods are LEVEL by default (see the tilt
      // above): the answer to "in or out" turned out to be neither — they just
      // go up.
      // BIG. 0.06R was invisible and 0.16R was polite; an open mood on a face
      // this simple has three marks to work with and the brow is the only one
      // free to travel, so it travels. 0.34R puts the pair up near the crown —
      // roughly two thirds of the way from the resting line to the top of the
      // skull — which is cartoon shorthand rather than anatomy, and reads
      // instantly at 24px, which anatomy would not.
      //
      // It stays legible because the dark patch grows to follow it (below), so
      // the brow never strands itself on bare fur however far it goes.
      // 0.30, UNDER the skull clamp's ceiling — and that is the whole reason
      // the rise now varies at all. The clamp below pins any brow whose top
      // edge would leave the head onto the same circle, so at 0.42 every open
      // mood asked for a position past the ceiling and every one of them landed
      // in the identical place. Scaling a request that is going to be clamped
      // anyway changes nothing, which is why the first attempt at a continuous
      // rise measured exactly as fixed as the step it replaced.
      // 0.22. Two reasons, and the second is why this number rather than any
      // other under 0.30: at full strength 0.30 put the pair up on the crown,
      // which read as too high on the jump — and it was still ABOVE the skull
      // clamp's ceiling, so the top of the range spent its travel pinned. At
      // 0.22 the request clears the ceiling by a hair at maximum, so no mood is
      // clamped and the whole 0.38-to-1.0 swing is real movement.
      // 0.16, down from 0.22: with the pair ANGLED the height needs less work,
      // and the lower seat keeps them on the forehead where a brow belongs
      // rather than climbing the crown. Comfortably under the skull clamp's
      // ceiling too, so every mood's rise reads at its own strength.
      const openRise = spec.browOpenRise == null ? 0.16 : spec.browOpenRise;
      // SIGN: browDy is added INSIDE an already-negated term further down —
      // `hy - R * (0.52 + browDy)` — so a POSITIVE browDy moves the mark UP and
      // a negative one moves it toward the eye. It was written the other way
      // round, which meant every "rise" was a drop and the furrow's "drop" was
      // a lift; at 0.06R that was small enough to pass as no effect at all,
      // which is how it survived being looked at several times.
      // A CONTINUOUS AMOUNT, not a step. This was a boolean — any open mood
      // snapped the brows to full height and held them there, so a celebration
      // that bounces, peaks and settles played under one frozen face. Measured:
      // the brow-to-eye gap read 33px on EVERY frame of the routine against 24
      // idle, so they were raised and then completely still. "Fixed" was exact.
      //
      // The rise now scales with how strong the mood actually is, off terms the
      // rig already tracks:
      //   cheer   joyAmt — the celebration's own 0..1, peaking on the hops and
      //           easing between them, so the brows pump with the body.
      //   surprise/browRaise  full: a gasp has no half measure.
      //   joy     0.72 — the signature half of the routine: delighted, but not
      //           yet the big beat, so the peak still has somewhere to go.
      // Driven off the CELEBRATION'S OWN MOTION, not off joyAmt. joyAmt is
      // null or pinned at 1 for most of the routine, so scaling by it measured
      // as flat as the boolean it replaced — the brow-to-eye gap held 32px on
      // every frame. celebrateMotion is the thing that actually bounces, and
      // asking it here for the same beat the body is riding is what makes the
      // brows move WITH the hop rather than sit above it.
      //
      // 0.55 at the bottom of a bound, full at the top: the pair lifts on each
      // peak and settles between, which is the difference between a face that
      // is happy and a face that is celebrating.
      const celBeat = pose.kind === 'celebrate'
        ? celebrateMotion(id, pose.time || 0, usesReworkedCelebration(pose), spec.celebrate)
        : null;
      const openAmt = celBeat
        // A WIDE swing, 0.38 to 1.0. The top of the range is clamped by the
        // skull anyway, so a narrow band spent most of its travel against the
        // ceiling and read as motionless; pulling the floor down is what buys
        // the visible dip between bounds.
        ? 0.38 + 0.62 * Math.max(0, Math.min(1, (celBeat.lift || 0) / 0.2 + (celBeat.peak ? 0.45 : 0)))
        : ex.surprise || ex.browRaise ? 1
          : ex.joy || ex.cheer ? 0.78
            : 0;
      const browDy = spec.browExpressive === false ? 0
        : openMood ? openRise * openAmt
          : browMood > 0 ? -0.05
            : 0;
      for (const side of [-1, 1]) {
        // Dark eye patch FIRST: it is the ground the white marks sit on, so
        // anything drawn before it is buried and anything after reads against it.
        if (spec.eyePatch) {
          // THE PATCH HOLDS THE EYES AND NOTHING ELSE. It was briefly grown
          // upward to swallow the brow marks; that is the wrong read — the
          // brows belong ABOVE the mask, on the fur, where the reference art
          // puts them. A mask that reaches up to meet them turns three marks
          // into one blob and throws away the contrast the white spots get from
          // sitting on rust.
          //
          // So it is a fixed ellipse around the eye, and it stays put however
          // far the brow travels. The brow's own rise is what carries the
          // expression; the gap between the two is what makes the rise visible.
          outlined(ctx, p.furDark || p.p || p.h, hair(0.5, ow * 0.5), (c) =>
            c.ellipse(faceCx + side * R * 0.4, hy + fdy - R * 0.04, R * 0.44, R * 0.42,
              side * 0.2, 0, Math.PI * 2));
        }
        // Cheek patch. 'low' drops it clear of the eye and pulls it inboard so
        // it stops ringing the socket; 'wide' is the original.
        if (cheekPatch === 'wide') {
          outlined(ctx, markCol, hair(0.5, ow * 0.55), (c) =>
            c.ellipse(faceCx + side * R * 0.62, hy + fdy + R * 0.26, R * 0.34, R * 0.30,
              side * 0.3, 0, Math.PI * 2));
        } else if (cheekPatch === 'low') {
          // `cheekScale` shrinks the white patch and, on a tapered head, walks
          // it inboard and up — the patch sits on the cheek, and a narrower
          // cheek cannot carry the same mark in the same place without it
          // hanging off the jaw line.
          const cs = spec.cheekScale ?? 1;
          const ct = Math.max(0, Math.min(1, spec.faceTaper || 0));
          outlined(ctx, markCol, hair(0.5, ow * 0.55), (c) =>
            c.ellipse(faceCx + side * R * (0.66 - 0.14 * ct), hy + fdy + R * (0.46 - 0.12 * ct),
              R * 0.3 * cs, R * 0.24 * cs, side * 0.34, 0, Math.PI * 2));
        }
        // Brow mark, ON TOP and clearly its own shape.
        if (browMark === 'teardrop') {
          outlined(ctx, markCol, hair(0.5, ow * 0.55), (c) =>
            c.ellipse(faceCx + side * R * 0.42, hy + fdy - R * 0.30, R * 0.26, R * 0.20,
              side * -0.45, 0, Math.PI * 2));
        } else if (browMark === 'spot') {
          // The reference's mark: a small round dot, high and well clear of the
          // eye. Small is the point — it only reads as a BROW while there is
          // fur visible between it and the socket.
          // A brow is WIDER THAN TALL. At 0.17 x 0.15R this was 1.13:1 — a dot,
          // and it read as one. `browSquash` multiplies the ry, and the rx
          // grows as it flattens so squashing does not also shrink the mark
          // into invisibility. `browTilt` drops the inner end toward the nose,
          // which turns a marking into an expression — off by default, because
          // a permanently sceptical face fights every pose he is in.
          const bq = spec.browSquash ?? 1;
          const bw = 0.17 * (1 + (1 - bq) * 0.55);
          // THESE MARKS ARE HIS EYEBROWS. Every other hero gets a hairline ink
          // stroke painted over the brow when the mood calls for one; on a face
          // that already carries two white marks in exactly that place, a third
          // horizontal line is one brow too many. So the marks themselves take
          // the expression — they tilt, and `brow: 'none'` in his spec stops
          // drawEyes from drawing the ink pair at all.
          //
          // Direction is the whole vocabulary, and it is not symmetric in
          // feeling: inner ends UP (a negative tilt here) is the soft read —
          // open, appealing, a little worried — and inner ends DOWN is the
          // furrow. Cuddly lives on the up side, so neutral-to-up is his
          // resting range and down is reserved for the moods that earn it.
          // The OPEN moods (surprise, joy and their variants) share one pair of
          // dials, because they are the same gesture at two strengths and
          // tuning them apart is how a face ends up with two unrelated happy
          // expressions. `browOpenTilt` and `browOpenRise` override both; the
          // furrow moods keep their own numbers.
          const tilt = (spec.browTilt || 0) + browMood;
          // The mark also RISES on the open moods and drops on the furrow, so
          // the pair is not merely rotating in place — a brow that only spins
          // reads as a dial rather than a face. Note the rise is what carries
          // an open mood when the tilt is ZERO: a level brow lifted straight up
          // is still a legible "oh", so the two dials are not redundant.
          // A BROW CANNOT GO STRAIGHT UP FOREVER. Held at x = 0.4R the skull's
          // own curve caps the rise at 0.226R — past that the mark's top edge
          // is outside the head and it paints over the outline into the
          // background. The first big-rise cut sat at 0.34R and was doing
          // exactly that.
          //
          // So a rising brow moves INWARD as well as up, riding the crown
          // rather than climbing off the side of it. That is also what a big
          // cartoon surprise looks like — the pair converges as it lifts — so
          // the constraint and the drawing want the same thing again.
          //
          // Then a hard clamp, because the pull-in alone still cannot satisfy
          // every rise anyone might dial: the mark's centre is pushed back onto
          // a circle sized so its TOP edge lands just inside the skull. Beyond
          // that the request is simply unachievable, and the clamp puts it as
          // high as the head allows instead of letting it escape.
          const ryR = 0.15 * bq;
          // 0.6, not 1.15. The clamp below already pulls the pair inward as it
          // pushes them onto the skull's curve, so a strong explicit pull-in
          // stacks on top of it and the two marks MEET: at 1.15 they overlapped
          // by 0.037R and read as one bar across the forehead. 0.6 leaves a
          // 0.110R gap at full rise and lets the clamp do most of the work.
          let bxR = 0.4 * (1 - Math.max(0, browDy) * 0.6);
          let byR = -(0.52 + browDy);
          const maxR = 0.94 - ryR;
          const dR = Math.hypot(bxR, byR);
          if (dR > maxR) { const k = maxR / dR; bxR *= k; byR *= k; }
          outlined(ctx, markCol, hair(0.5, ow * 0.5), (c) =>
            c.ellipse(faceCx + side * R * bxR, hy + fdy + R * byR, R * bw, R * ryR,
              side * tilt, 0, Math.PI * 2));
        } else if (browMark === 'bar') {
          // A short angled bar — the most eyebrow-like, and the only mark here
          // that can carry an expression by its slope.
          outlined(ctx, markCol, hair(0.5, ow * 0.5), (c) => bluntSpike(c,
            faceCx + side * R * 0.16, hy + fdy - R * 0.46,
            faceCx + side * R * 0.68, hy + fdy - R * 0.6,
            faceCx + side * R * 0.2, hy + fdy - R * 0.62, 0.5));
        } else if (browMark === 'arc') {
          // A crescent following the top of the socket: the eye's own rim
          // marked out, rather than a separate object above it.
          ctx.strokeStyle = markCol;
          ctx.lineWidth = hair(0.8, ow * 1.3);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(faceCx + side * R * 0.4, hy + fdy - R * 0.06, R * 0.46,
            Math.PI * 1.18, Math.PI * 1.86);
          ctx.stroke();
        }
        // Tear tracks: the real animal's rust streak from the inner eye down
        // across the white cheek — the marking everyone forgets red pandas
        // have. Drawn on the patch and under the eyes, angled off vertical so
        // the pair follows the muzzle's sides rather than hanging like bars.
        if (spec.tearTracks) {
          ctx.strokeStyle = p.furDark || p.h;
          ctx.lineWidth = hair(0.6, ow * 1.1);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(faceCx + side * R * 0.3, hy + fdy - R * 0.02);
          ctx.quadraticCurveTo(faceCx + side * R * 0.44, hy + fdy + R * 0.3,
            faceCx + side * R * 0.4, hy + fdy + R * 0.52);
          ctx.stroke();
        }
        // Blush: Mochi's pink cheek dot, outboard of the muzzle where the
        // patch meets the ruff.
        if (spec.blush) {
          dot(ctx, faceCx + side * R * 0.66, hy + fdy + R * 0.34, R * 0.13,
            p.cheek || '#f2a2b0');
        }
      }
    }
    if (animal.mask === 'bandit' && !lod) {
      // One band straight across both eyes, in the coat's dark. It has to clear
      // the muzzle top or it merges with the snout into a single dark blob.
      outlined(ctx, p.furDark || p.p || p.e, hair(0.5, ow * 0.55), (c) =>
        c.ellipse(faceCx, hy + fdy - R * 0.12, R * 0.86, R * 0.26, 0, 0, Math.PI * 2));
    }
    // THE JAW DROPS ON A DEEP SMILE. A grin this wide is a jaw opening, and a
    // jaw opening lengthens the snout DOWNWARD — the nose does not travel with
    // it, because the nose sits on the upper snout which is fixed to the skull.
    //
    // So the muzzle grows rather than moves: the same amount is added to both
    // the ellipse's centre and its ry, which leaves the TOP edge exactly where
    // it was (top = centre - ry, and the two additions cancel) while the bottom
    // drops by twice nothing — by the amount itself. Shifting the whole ellipse
    // instead would carry the nose off the snout or leave it floating above it.
    //
    // Scaled by joyAmt where there is one, so the snout lengthens WITH the grin
    // opening rather than snapping to full length on the first frame of it —
    // the same lerp the mouth's own D-grin uses.
    // SURPRISE DROPS THE JAW TOO. A gasp is an open mouth exactly as a grin is,
    // so it gets the same lengthening — it just does not go as far as a full
    // whoop. Leaving it out was an omission rather than a decision: the mouth
    // opened and the snout stayed the length of a closed one.
    //
    // Note this does NOT replace the clamp above. The snout grows DOWNWARD
    // while the gasp's ellipse grows UPWARD off the mouth line, so a longer
    // snout gives the mouth somewhere to sit but never stops it climbing into
    // the nose. The two fixes solve opposite ends of the same mouth.
    //
    // 0.07R rather than the 0.10R first tried: at a tenth of the head radius
    // the snout stretched past "jaw open" and into a different animal.
    const jawAmt = ex.cheer ? (ex.joyAmt == null ? 1 : ex.joyAmt)
      : ex.joy ? 0.5
        : ex.surprise ? 0.6
          : 0;
    const jaw = jawAmt * 0.07 * R;
    animalJaw = jaw;
    outlined(ctx, p.s, hair(0.6, ow * 0.7), (c) =>
      c.ellipse(faceCx, mTopY + R * mry * mScale * 0.62 + jaw,
        R * mrx * mScale, R * mry * mScale + jaw, 0, 0, Math.PI * 2));
    // A rounded animal nose, wider than tall.
    outlined(ctx, p.e, hair(0.5, ow * 0.5), (c) =>
      c.ellipse(faceCx, noseY, R * 0.17 * mScale, R * 0.13 * mScale, 0, 0, Math.PI * 2));
  }
  if (id === 'grumpos') {
    // Thick war paint, bent like a '>' with the notch at the nose: down from
    // the crown to a vertex just under the brow, then back out to die in the
    // beard. Drawn BEFORE beard, brows and eyes, so all three occlude it —
    // the paint runs UNDER the eyeball, not over it. The vertex is solved,
    // not styled: vertex (-0.18R), eye center (-0.351R, -0.081R) and the
    // beard end (-0.66R) are collinear, so the slivers visible above and
    // below the eye line up dead through its middle.
    ctx.save();
    ctx.beginPath();
    blockHead(ctx);
    ctx.clip();
    ctx.strokeStyle = p.a; ctx.lineWidth = hair(1.2, R * 0.22);
    ctx.beginPath();
    // The vertex slides UP the same solved line (it stays collinear with eye
    // center and beard end, so the angle through the eye is untouched) to sit
    // clear above the eyebrow; the scalp start shifts right to meet it.
    const ts = spec.tatSide ?? -1;
    // The tattoo is facial registration, not a backdrop mark. Directional
    // treatment moves Grumpos's eye mask across the fixed skull, so carry the
    // paint by that same offset or its solved line misses the eye it belongs to.
    ctx.translate(faceYaw * 0.11 * u, 0);
    ctx.moveTo(hx + ts * R * 0.52, hy - R * 0.98);
    ctx.lineTo(hx + ts * R * 0.11, hy - R * 0.55);
    ctx.lineTo(hx + ts * R * 0.66, hy + R * 0.52);
    ctx.stroke();
    ctx.restore();
  }
  if (spec.beard) {
    // Follows the same taper as the jaw beneath it — rooted just outside the
    // cheekbones and always a hair wider than the chin, so no sliver of face
    // can show between beard and silhouette. The corners are eased rather
    // than pointed: hair, even a stern slab of it, doesn't come to a spike.
    outlined(ctx, p.m, ow, (c) => {
      c.moveTo(hx - R * 0.94, hy + R * 0.2);                                         // left cheek root
      c.quadraticCurveTo(hx - R * 0.86, hy + R * 0.66, hx - R * 0.7, hy + R * 0.9);   // side, gently bowed over the jaw
      c.quadraticCurveTo(hx - R * 0.56, hy + R * 1.16, hx - R * 0.3, hy + R * 1.26);  // bottom corner, knocked off
      c.lineTo(hx + R * 0.3, hy + R * 1.26);                                          // broad, blunt bottom
      c.quadraticCurveTo(hx + R * 0.56, hy + R * 1.16, hx + R * 0.7, hy + R * 0.9);
      c.quadraticCurveTo(hx + R * 0.86, hy + R * 0.66, hx + R * 0.94, hy + R * 0.2);  // right cheek root
      c.lineTo(hx, hy + R * 0.6);                                                     // top edge dips under the mouth
      c.closePath();
    });
  }

  // face
  const faceEx = headTurn ? { ...ex, turn: headTurn } : ex;
  // Cap variants that reshape Lorenzo's brow line also move the face mask under
  // it and choose how the brows are drawn. Everyone else is untouched.
  const capV = spec.head === 'cap' ? lorenzoFace() : null;
  if (capV && capV.brow) faceEx.brow = capV.brow;
  // Move the facial mask toward the direction the head is looking. Merely
  // squeezing a centred pair of eyes leaves a front-facing mask on an oval.
  // Hair, beard and cheek paint remain anchored to the skull, so this shift
  // creates a broad near cheek and a compressed receding cheek.
  if (faceDepth > 0.001) {
    ctx.save();
    ctx.translate(faceYaw * (id === 'b33p' ? 0 : 0.11) * u, 0);
  }
  // The mask — eyes, nose, mustache, mouth — slides as one. Ear, sideburn and
  // hat stay bolted to the skull above.
  const faceDy = capV && capV.faceDy ? capV.faceDy * u : 0;
  if (faceDy) {
    ctx.save();
    ctx.translate(0, faceDy);
  }
  // Fernwick's eyes sit a touch lower, giving her a taller, more childlike brow.
  // `eyeLift` is the same dial pointing the other way, and a spec field rather
  // than a hero id because it belongs to a FACE rather than to a name — it moves
  // the whole mask (brows ride the same line), so eyes and mouth can be set
  // against each other rather than each against the skull.
  const eyeY = hy - (id === 'fernwick' ? -0.018 : 0.015) * u - (spec.eyeLift || 0) * u;
  // `eyeStyle: 'pika'` swaps the white-and-pupil eye for Mochi's — the solid
  // dark oval with a glint, the biggest and most anime eye the cast owns. A
  // FLAG to her painter rather than a copy of it, so there is exactly one
  // saucer eye in the file and her death/blink/joy dialects come along free.
  // Note what also comes along: pikaEyes draws no brows (Mochi has none, and
  // per Fernwick a bare brow reads sweet), and its sep is wider than the
  // standard eye's, which on a masked face is most of the "plush toy" read.
  if (spec.eyeStyle === 'pika') pikaEyes(ctx, p, u, hx + 0.01 * u, eyeY, lod, faceEx);
  else drawEyes(ctx, p, u, hx + 0.01 * u, eyeY, lod, faceEx);
  if (faceEx.brow === 'bushy' && !lod) bushyBrows(ctx, p, u, hx + 0.01 * u, eyeY, ex, ow);
  if (spec.nose) outlined(ctx, p.n, hair(0.6, ow * 0.7), (c) => c.arc(hx + 0.02 * u, hy + 0.055 * u, 0.055 * u, 0, Math.PI * 2));
  if (spec.mustache && !lod && ex.joy) {
    // Celebration only: the one time Lorenzo's mouth is visible at all. A wide
    // open grin with the top row of teeth showing, drawn BEFORE the mustache so
    // the lobes cover its upper rim and read as the lip above it. Widens into a
    // full whoop on the peaks of the hop, same beat as everyone else's cheer.
    // Sized on joyAmt where the plain mouths lerp on it: down the pole the grin
    // opens with the descent instead of arriving at whoop size on the catch.
    const gAmt = ex.cheer ? (ex.joyAmt == null ? 1 : ex.joyAmt) : 0;
    const mx = hx + 0.015 * u;
    const w = (0.072 + 0.016 * gAmt) * u;
    const top = hy + 0.108 * u;
    const d = (0.052 + 0.026 * gAmt) * u;
    const grin = (c) => {
      c.moveTo(mx - w, top);
      c.quadraticCurveTo(mx, top + d * 1.9, mx + w, top);
      c.closePath();
    };
    outlined(ctx, '#5d1a26', hair(0.5, ow * 0.5), grin);
    // Teeth: a white band hugging the upper lip, clipped to the mouth so it can
    // never spill past the corners at any scale.
    ctx.save();
    ctx.beginPath();
    grin(ctx);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - w, top - 0.02 * u, w * 2, d * 0.42 + 0.02 * u);
    ctx.restore();
  }
  if (spec.mustache && !lod && ex.death) {
    // The one other time his mouth shows: outside this and the celebration
    // grin, a mustached face draws no mouth at all, so without this a dead
    // Lorenzo is the only hero with nothing below the nose. Drawn BEFORE the
    // mustache, like the grin, so whatever the treatment the lobes own the top
    // edge. See DEATH_MOUTH_STYLES for what each one is fighting.
    const a = ex.death.shut;
    const style = ex.death.mouth;
    const mx = hx + 0.015 * u;
    const my = hy + (style === 'lift' ? 0.172 : 0.145) * u;
    const rx = (0.038 + 0.022 * a) * u, ry = (0.01 + 0.032 * a) * u;
    const hole = (c) => c.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
    // The rim is a second, larger ellipse in SKIN behind the hole: the value
    // step from brown to skin to near-black is what separates the mouth from
    // the mustache, where brown against near-black alone does not.
    if (style === 'rim') {
      outlined(ctx, p.s, hair(0.4, ow * 0.4) * INK.face, (c) =>
        c.ellipse(mx, my, rx + 0.016 * u, ry + 0.013 * u, 0, 0, Math.PI * 2));
    }
    outlined(ctx, '#48141f', hair(0.5, ow * 0.5) * INK.face, hole);
    if (style === 'teeth' && a > 0.25) {
      // The grin's own trick: a white band hugging the upper lip, clipped to
      // the mouth so it can never spill past the corners at any scale.
      ctx.save();
      ctx.beginPath(); hole(ctx); ctx.clip();
      ctx.fillStyle = '#fff';
      ctx.fillRect(mx - rx, my - ry, rx * 2, ry * 0.72);
      ctx.restore();
    }
  }
  if (spec.mustache && !lod) {
    // Two buoyant lobes give Lorenzo a readable expression instead of a flat
    // strip pasted beneath the nose. Mid-celebration the grin under them pushes
    // the whole thing up and flicks the tips higher, the way a real smile does.
    // The lobes ride the same joyAmt as the grin under them, so the mustache
    // lifts in step with the smile it is framing.
    const mAmt = ex.joy ? (ex.cheer ? (ex.joyAmt == null ? 1 : ex.joyAmt) : 0) : 0;
    // Style B lifts the whole mustache off the mouth the same way the grin
    // does, on the same dial - the lobes are the thing in the way, so moving
    // them is the most honest fix available to this face.
    const deathLift = ex.death && ex.death.mouth === 'lift' ? 0.026 * u * ex.death.shut : 0;
    const lift = ex.joy ? (0.012 + 0.01 * mAmt) * u : deathLift;
    const tip = ex.joy ? (0.014 + 0.012 * mAmt) * u : deathLift * 0.5;
    outlined(ctx, p.m, hair(0.33, ow * 0.33) * INK.face, (c) => {
      c.moveTo(hx + 0.015 * u, hy + 0.075 * u - lift);
      c.quadraticCurveTo(hx - 0.035 * u, hy + 0.035 * u - lift, hx - 0.13 * u, hy + 0.105 * u - lift - tip);
      // The notch between the lobes has to clear the NOSE, which is a circle
      // reaching +0.110u. At +0.100u the mustache stopped 0.010u short and a
      // sliver of nose showed through the gap — small, but centred right where
      // a mouth would be, so it read as one. Nothing else is drawn down there:
      // drawMouth is gated on !spec.mustache, so a mustached face has no mouth
      // at all outside the celebrate grin.
      c.quadraticCurveTo(hx - 0.05 * u, hy + 0.13 * u - lift, hx + 0.015 * u, hy + 0.118 * u - lift);
      c.quadraticCurveTo(hx + 0.08 * u, hy + 0.13 * u - lift, hx + 0.145 * u, hy + 0.09 * u - lift - tip);
      c.quadraticCurveTo(hx + 0.06 * u, hy + 0.035 * u - lift, hx + 0.015 * u, hy + 0.075 * u - lift);
      c.closePath();
    });
  }
  if (id === 'grumpos' && !lod) {
    // A pale mouth gap cut into the dark beard keeps the face readable. It
    // opens during surprise and tightens into a stern Dad-of-War frown.
    const mouthY = hy + R * 0.58;
    if (ex.death) {
      // The gap falls open. His default IS a frown, which would have been an
      // honest death mouth - but a stern man holding his stern face through it
      // reads as unimpressed rather than as beaten, and the cast opens.
      const a = ex.death.shut;
      outlined(ctx, p.s, hair(0.3, ow * 0.3) * INK.face, (c) =>
        c.ellipse(hx, mouthY, R * (0.17 + 0.06 * a), R * (0.06 + 0.21 * a), 0, 0, Math.PI * 2));
      // The dark of the open mouth, the same way his surprise face gets it:
      // the pale gap alone is a shape cut in a beard, not a hole in a head.
      if (a > 0.2) dot(ctx, hx, mouthY + R * 0.04, R * 0.11 * a, p.e);
    } else if (ex.surprise) {
      outlined(ctx, p.s, hair(0.3, ow * 0.3) * INK.face, (c) => c.ellipse(hx, mouthY, R * 0.22, R * 0.27, 0, 0, Math.PI * 2));
      dot(ctx, hx, mouthY + R * 0.04, R * 0.11, p.e);
    } else if (ex.beam) {
      // The one beat he lets it show: on a held pose of the victory flex the
      // stern gap opens into a broad grin, then shuts again. Keyed to `beam`,
      // not `cheer` — cheer covers half the routine, and a Grumpos who grins
      // for half his victory dance isn't Grumpos.
      outlined(ctx, p.s, hair(0.3, ow * 0.3) * INK.face, (c) => {
        c.moveTo(hx - R * 0.34, mouthY - R * 0.09);
        c.quadraticCurveTo(hx, mouthY + R * 0.36, hx + R * 0.34, mouthY - R * 0.09);
        c.closePath();
      });
    } else {
      outlined(ctx, p.s, hair(0.3, ow * 0.3) * INK.face, (c) => roundRectPath(c, hx - R * 0.3, mouthY - R * 0.12, R * 0.6, R * 0.25, R * 0.1));
      ctx.strokeStyle = p.e; ctx.lineWidth = hair(0.41, ow * 0.36) * INK.face;
      ctx.beginPath();
      // Relaxed, the stern arc irons out flat — the frown is the default,
      // not the only setting.
      ctx.moveTo(hx - R * 0.2, mouthY + (ex.effort ? R * 0.04 : 0));
      ctx.quadraticCurveTo(hx, mouthY - (ex.relaxed ? 0 : R * 0.08), hx + R * 0.2, mouthY + (ex.effort ? R * 0.04 : 0));
      ctx.stroke();
    }
  }
  // The mouth hangs off the SKULL, not off the draw height. 0.11u is a little
  // over half a default head radius below centre; left absolute it stays 0.11u
  // on a smaller skull too, which is most of the way to the chin — the reason
  // Kiko's sat low and the face read bottom-heavy. Scaling by `headScale` is
  // the same offset measured in heads instead of in units, and it is exactly
  // neutral for the rest of the cast, none of whom set the dial. (Grumpos's
  // beard-gap mouth above was already placed off R, which is this rule.)
  // `mouthLift` is the per-face nudge on top of that rule, in u: the skull ratio
  // says where the mouth belongs on a head of this size, and this says where it
  // belongs on this FACE. Kiko's is set because a short lower face is the read
  // her reference has — the distance from eyes to mouth is what makes a chibi
  // look young, and hers was a rig default rather than a decision.
  if (!spec.beard && !spec.mustache && !lod) {
    let mouthY = hy + 0.11 * u * (spec.headScale || 1) - (spec.mouthLift || 0) * u;
    // A LIFT TUNED ON A CLOSED MOUTH IS WRONG FOR AN OPEN ONE. Most mouths sit
    // on the mouth line or hang below it, but the gasp is an ellipse centred ON
    // it — 0.045u of mouth ABOVE the line — and the dying mouth is the same
    // shape. Raise the line far enough to seat a smile nicely under a snout and
    // those two climb into the nose.
    //
    // Solved rather than dialled: the mouth's own upward reach is known per
    // expression, so the line is pushed down only as far as it takes to keep
    // the top edge clear of the nose. A closed mouth asks for nothing and keeps
    // its full lift; only the frames that would actually collide move, and they
    // move by exactly the overlap. Animal heads only — no shipped hero has a
    // muzzle for a mouth to collide with.
    if (animalNoseBottom != null) {
      const reachUp = ex.surprise || ex.death ? 0.045 : ex.calling ? 0.017 : 0;
      if (reachUp) mouthY = Math.max(mouthY, animalNoseBottom + (reachUp + 0.012) * u);
      // THE GRIN RIDES THE JAW DOWN. A deep smile lengthens the snout (see the
      // jaw drop above), and a mouth that stays on its old line ends up sitting
      // high in a muzzle that has grown beneath it. It follows by a FRACTION of
      // the drop rather than all of it: the whole snout lengthens, but the
      // mouth sits nearer the top of it than the bottom, so travelling the full
      // distance would push it out of the face it belongs to.
      //
      // Joy only. Surprise gets the same jaw drop but its mouth is already
      // held down by the clamp above, and moving it again would undo a read
      // that is settled.
      if (ex.joy || ex.cheer) mouthY += animalJaw * 0.45;
    }
    drawMouth(ctx, spec, p, u, hx + 0.01 * u, mouthY, ow, ex);
  }
  if (faceDy) ctx.restore();
  if (faceDepth > 0.001) ctx.restore();
  if (outlineDepth > 0.001) ctx.restore();
}

// ----------------------------------------------------------- tail
// ONE tail painter, called from every pose that has a hip. It lived inline in
// drawHumanoid, which is why the power slide had no tail: the slide is its own
// painter and returns before drawHumanoid ever reaches the "back accessories"
// block — so Gnash slid tailless from the day the slide shipped, and Rusty
// inherited the gap (the gallery's own TODO named it). Lifting the block out
// means the slide draws the same tail the run does, off the same clock.
//
// `torsoHalf` and `hipY` are the caller's hip frame; `run` picks the wag rate.
function drawTail(ctx, spec, p, pose, u, ow, lod, torsoHalf, hipY, run) {
  if (spec.tail) {
    // `tail: true` is Gnash's tapered blade and stays byte-for-byte what it
    // was; the string kinds are the bake-off's. Widening the flag rather than
    // adding a second one keeps ONE tail seam — a hero has a tail or does not,
    // and which tail is a property of that tail.
    const tailKind = spec.tail === true ? 'taper' : spec.tail;
    const wag = Math.sin((pose.time || 0) * (run ? 8 : 2.6)) * 0.045 * u;
    const baseX = -torsoHalf * 0.65, baseY = hipY - 0.02 * u;
    if (tailKind === 'taper') {
      const tipX = -0.4 * u, tipY = hipY - 0.28 * u + wag;
      outlined(ctx, p.h, ow, (c) => {
        c.moveTo(baseX, baseY - 0.065 * u);
        c.quadraticCurveTo(-0.39 * u, hipY + 0.02 * u + wag * 0.35, tipX, tipY);
        c.quadraticCurveTo(-0.32 * u, hipY - 0.15 * u + wag * 0.4, baseX, baseY + 0.065 * u);
        c.closePath();
      });
      // A small cream tip helps the tapered tail read separately from the body.
      outlined(ctx, p.s, hair(0.5, ow * 0.65), (c) => {
        c.moveTo(tipX, tipY);
        c.lineTo(tipX + 0.075 * u, tipY + 0.09 * u);
        c.lineTo(tipX + 0.095 * u, tipY + 0.025 * u);
        c.closePath();
      });
    } else if (tailKind === 'stub') {
      // A hare's puff: a disc at the hip, no sweep, riding the wag so it is not
      // the one dead thing on a running figure.
      outlined(ctx, p.s, ow, (c) =>
        c.ellipse(baseX - 0.105 * u, baseY - 0.01 * u + wag * 0.5,
          0.085 * u, 0.075 * u, 0, 0, Math.PI * 2));
    } else {
      // BUSHY (red panda) and BRUSH (fox): a plume carried up and back rather
      // than a blade slung down. Both are the same path with different girth,
      // because the thing being judged between them is volume.
      //
      // Built as a named path fn so the rings below can clip to the exact
      // silhouette. The centre curve is stated separately and the outline is
      // walked out from it, which is what lets the rings sit square across the
      // tail instead of square to the screen.
      const bushy = tailKind === 'bushy';
      // `tailRoot` narrows the plume WHERE IT MEETS THE BODY, without touching
      // the belly girth below — which is the shape a real red panda has, and
      // which buys room at the hip for the belt to sit lower. The two numbers
      // are separate for exactly this reason: the volume that makes the tail
      // read is `w1`, further out, so the root can come in without the plume
      // getting thinner.
      const w0 = (bushy ? 0.085 : 0.062) * u * (spec.tailRoot ?? 1);  // girth at the root
      const w1 = (bushy ? 0.115 : 0.078) * u;      // girth at the belly
      // CARRIED BACK, not up. The first cut ran the tip to hipY - 0.44u, a 47
      // degree climb, and at that angle a thick plume rooted near the waist
      // reads as a RAISED ARM — the eye takes the nearest limb-shaped mass off
      // a shoulder as a limb. The control point sits BELOW the hip so the tail
      // drops out of the body first and lifts only at the end, which is both
      // the real carry and the shape that cannot be mistaken for an arm.
      const tipX = -(bushy ? 0.54 : 0.5) * u;
      const tipY = hipY - (bushy ? 0.2 : 0.15) * u + wag;
      const ctlX = -(bushy ? 0.3 : 0.28) * u, ctlY = hipY + 0.1 * u + wag * 0.3;
      const path = (c) => {
        c.moveTo(baseX, baseY - w0);
        c.quadraticCurveTo(ctlX, ctlY - w1, tipX, tipY);
        // Round the tip rather than pointing it — a plume ends in a mass.
        c.quadraticCurveTo(tipX - w1 * 0.9, tipY + w1 * 0.9, tipX + w1 * 0.35, tipY + w1 * 1.15);
        c.quadraticCurveTo(ctlX, ctlY + w1, baseX, baseY + w0);
        c.closePath();
      };
      outlined(ctx, p.h, ow, path);
      // RINGS. The one mark that makes a red panda unmistakable at 24u, and on
      // a run it doubles as a motion trail for free. Clipped to the tail and
      // stroked ACROSS the centre curve's normal, so they stay square to the
      // tail through the whole wag.
      if (bushy && !lod) {
        ctx.save();
        ctx.beginPath(); path(ctx); ctx.clip();
        ctx.strokeStyle = p.furDark || p.p || p.h;
        ctx.lineWidth = w1 * 0.62;
        ctx.lineCap = 'butt';
        // Quadratic point and tangent at s, off the centre curve (base -> ctl -> tip).
        for (const s of [0.34, 0.58, 0.82]) {
          const mx = (1 - s) * (1 - s) * baseX + 2 * (1 - s) * s * ctlX + s * s * tipX;
          const my = (1 - s) * (1 - s) * baseY + 2 * (1 - s) * s * ctlY + s * s * tipY;
          const dx = 2 * ((1 - s) * (ctlX - baseX) + s * (tipX - ctlX));
          const dy = 2 * ((1 - s) * (ctlY - baseY) + s * (tipY - ctlY));
          const d = Math.hypot(dx, dy) || 1e-6;
          const nx = -dy / d, ny = dx / d;
          ctx.beginPath();
          ctx.moveTo(mx - nx * w1 * 1.4, my - ny * w1 * 1.4);
          ctx.lineTo(mx + nx * w1 * 1.4, my + ny * w1 * 1.4);
          ctx.stroke();
        }
        ctx.restore();
        // The clip painted over the inner half of the contour, so it goes back
        // on top. Cheaper than masking the bands off the edge by hand.
        ctx.strokeStyle = OUTLINE; ctx.lineWidth = ow;
        ctx.beginPath(); path(ctx); ctx.stroke();
      }
      // A pale tip on both, which is what separates a plume from the body when
      // the tail swings across the torso mid-stride. Kept well under the tail's
      // own girth: sized to match it, the tip stopped reading as the END of the
      // tail and started reading as a ball on the end of one.
      outlined(ctx, p.s, hair(0.5, ow * 0.65), (c) =>
        c.ellipse(tipX + w1 * 0.16, tipY + w1 * 0.5, w1 * 0.54, w1 * 0.48, 0, 0, Math.PI * 2));
    }
  }
}

// ---------------------------------------------------------------- rigs
// ---- PRINCESS COSTUMES -----------------------------------------------------
// Reached through drawToon's spec seam (`spec.princessCostume`). Fernwick is
// the only hero wearing one; the table is a table because the bake-off that
// chose her gown compared six of them, and the losers came out.
// The table is STRUCTURE — how long the skirt hangs, what sits on the chest,
// whether a cape rides behind — and every colour comes from the candidate's
// palette (bodice, skirt, panel, under, cape, cowl, sash, gem), falling back
// to the shipped Fernwick keys. Built the way the tunic and the qipao are:
// cloth over the thighs is drawn AFTER the legs so it drapes over the roots,
// the belt hides the top seam, and the torso keeps its silhouette — a bodice
// in another colour is paint clipped to torsoPath, never a second shape.
const PRINCESS_COSTUMES = {
  // The tunic, lengthened a touch and given the tabard that says "royal"
  // rather than "ranger": one hanging front panel with the ruby on it.
  tabard: { skirt: { len: 0.44, flare: 1.42, split: 1, splitHigh: 0.3 }, panel: { from: 'belt', half: 0.4, emblem: true }, belt: 'gold', neck: 'v' },
  // The classic: a long pale gown, a purple tabard from the chest to the hem,
  // gold pauldrons. The most Zelda; the least Fernwick below the neck.
  // Waist LOW and hem LONG, settled off the waist x length matrix: the high
  // waist cropped her torso and the short hems made the legs the subject.
  gown: { rise: 0.01, skirt: { len: 0.36, flare: 1.18, slideFlare: 1.85, split: 1, splitHigh: 0.12, panels: 5, loose: true, fineSeams: true }, belt: 'gold', beltH: 0.036, bodice: true, neck: 'round', clasp: true },
  // The adventurer's dress: a sleeveless green bodice laced down the front
  // over a cream blouse (the candidate adds `puffs`), a knee skirt with the
  // cream underskirt showing at the hem.
  corset: { skirt: { len: 0.5, flare: 1.5, under: 0.08 }, lacing: true, belt: 'leather', bodice: true, midriff: 0.5, neck: 'v' },
  // The ranger: the tunic cut as a battle skirt, split on the trailing side
  // over the leggings, with a short dark cape clasped at the throat.
  cloak: { skirt: { len: 0.4, flare: 1.36, split: -1, splitHigh: 0.4 }, cape: true, clasp: true, belt: 'leather', neck: 'v' },
  // The storybook princess: a long rose dress under a cream cowl across the
  // shoulders, tied with a sash rather than belted.
  shawl: { skirt: { len: 0.78, flare: 1.7, split: 1, splitHigh: 0.1, panels: 5 }, belt: 'sash', bodice: true, neck: 'v', clasp: true },
  // The royal tunic: no skirt at all — a hip-length blue tunic with gold
  // embroidery at the yoke over white sleeves and the shipped leggings. The
  // "field" princess, and the cut closest to the running shape that ships.
  royal: { skirt: { len: 0.34, flare: 1.18 }, yoke: true, belt: 'leather', bodice: true, neck: 'v' },
};

// FLOWING BACK HAIR — gallery only, the ethereal-princess study.
// Drawn in the BACK pass, so it hangs behind the torso the way the cape does
// and the quiver still sits on top of it. This is a different piece from the
// side locks the G1 head paints: those live on the head and frame the face,
// this is the mass down her back, and a cut can have either, both or neither.
//
// Built as one sheet plus a few locks rather than as N separate ropes: at hero
// size a fan of individual strands closes into a solid blob anyway, so the
// sheet carries the silhouette and the locks only cut its lower edge into
// points. Every lock hangs from the SAME root and swings on the same clock at
// staggered phase, which is what stops the mass reading as a board.
// `flowHair` is { len, wide, locks, wave, side, flare }: `len` is where the hem
// sits, measured off the HIP in leg-lengths and signed — negative is above the
// hip, which is where hair that matches the front falls actually ends. Then
// width in head radii, how many points the hem breaks into, how far they
// swing, how far the mass trails, and how much it narrows toward the hem.
//
// It NARROWS. The first cut flared toward the hem like a skirt and read as a
// cape rather than as hair — hair hangs off a head, so the widest part is at
// the shoulders and everything below gathers.
function paintFlowHair(ctx, spec, p, u, ow, lod, g) {
  const k = spec.flowHair;
  if (!k) return;
  const { px, headY, shoulderY, hipY, legL, bob, run, jump, t } = g;
  const R = 0.21 * u * (spec.headScale || 1);
  const hairCol = p.hair || p.a;
  const dark = p.hairDark || p.f;
  // Rooted at the back of the SKULL, not at the shoulder: hair that starts at
  // the shoulder line reads as a shawl, and the gap it leaves at the nape is
  // the first thing that looks wrong.
  const rootY = headY - R * 0.15;
  const rootHalf = R * 1.02;
  const trail = (run ? -0.5 : jump ? -0.34 : -0.16) * (k.side ?? 1) * u * 0.32;
  const hemY = hipY + legL * k.len + bob * 0.5;
  const drop = hemY - rootY;
  const count = k.locks ?? 3;
  const wide = k.wide ?? 1;
  const spread = R * 1.05 * wide;
  const swing = run ? Math.sin((g.phase || 0) * Math.PI * 2) * 0.05 * u : 0;
  const drift = (run ? 0.15 : jump ? 0.1 : 0.04) * u * (k.wave ?? 1);
  // Painted BACK TO FRONT — the outermost locks first — so each contour laps
  // the one beside it and the mass reads as several pieces of hair rather than
  // as one board with lines scored into it.
  const order = [];
  for (let i = 0; i < count; i++) order.push(i);
  order.sort((a, b) => Math.abs(b - (count - 1) / 2) - Math.abs(a - (count - 1) / 2));
  for (const i of order) {
    const f = count === 1 ? 0 : -1 + (2 * i) / (count - 1);
    const ph = (run ? t * 6.5 : t * 1.5) + i * 1.15;
    // The MIDDLE lock is the longest and the outer ones fall short, which is
    // what a head of hair does and what a cut hem does not. Without it the
    // tips line up and the row of points reads as a pinked edge on one sheet.
    const shorten = 1 - Math.abs(f) * 0.22;
    const tipY = rootY + drop * shorten + Math.cos(ph * 0.8) * drift * 0.4;
    const tipX = px + f * spread * 0.72 + trail + swing + Math.sin(ph) * drift;
    const rx = px + f * rootHalf * 0.82;
    // Each fall is the front lock's own silhouette: a broad shoulder just
    // below the root, a long taper, and a POINT — the tip is what makes it a
    // lock, and a rounded end reads as a rope.
    const halfW = R * (0.46 - Math.abs(f) * 0.08) * wide;
    const belly = rootY + drop * 0.34;
    const bx = px + f * spread + trail * 0.5 + Math.sin(ph) * drift * 0.5;
    outlined(ctx, hairCol, ow, (c) => {
      c.moveTo(rx - rootHalf * 0.42, rootY);
      c.quadraticCurveTo(bx - halfW * 1.25, belly, tipX - halfW * 0.34, tipY - halfW * 0.5);
      c.lineTo(tipX + halfW * 0.1, tipY);
      c.lineTo(tipX + halfW * 0.72, tipY - halfW * 0.9);
      c.quadraticCurveTo(bx + halfW * 1.1, belly, rx + rootHalf * 0.5, rootY);
      c.closePath();
    });
    if (lod) continue;
    // One strand down each fall, in the hair's own shade: a lock this long in
    // one flat colour reads as a ribbon. Same mark the shipped plait carries.
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = dark;
    ctx.lineWidth = hair(0.45, ow * 0.7);
    ctx.beginPath();
    ctx.moveTo(rx, rootY + R * 0.3);
    ctx.quadraticCurveTo(bx + halfW * 0.1, belly, tipX + halfW * 0.15, tipY - halfW * 1.1);
    ctx.stroke();
    ctx.restore();
  }
}

// The cape, from the BACK pass: behind the torso, ahead of the quiver, so
// the archer's kit still sits on top of it.
function paintPrincessCape(ctx, spec, p, u, ow, g) {
  const k = PRINCESS_COSTUMES[spec.princessCostume];
  if (!k || !k.cape) return;
  const { px, shoulderY, hipY, legL, bob, run, jump, t } = g;
  const top = shoulderY - 0.02 * u;
  const hem = hipY + legL * 0.64 + bob * 0.5;
  // Trails behind (screen -x) and flutters on its own clock in the run; a
  // real trail at rest too, because the quiver sits exactly where a cape
  // hanging straight would show — behind the drawing shoulder — and a cape
  // that only appears when she runs reads as a glitch, not a garment.
  const trail = (run ? -0.18 : jump ? -0.12 : -0.1) * u + (run ? Math.sin(t * 11) * 0.025 * u : 0);
  const half = g.torsoHalf;
  outlined(ctx, p.cape || p.f, ow, (c) => {
    c.moveTo(px - half * 0.9, top);
    c.lineTo(px + half * 0.9, top);
    c.lineTo(px + half * 1.1 + trail * 0.3, hem);
    c.quadraticCurveTo(px - half * 0.4 + trail * 0.7, hem + 0.05 * u, px - half * 1.9 + trail, hem - (run ? 0.05 : 0.01) * u);
    c.closePath();
  });
}

// THE QUIVER'S SLING, as one ribbon: a narrow start over the shoulder widening
// to the strap's full width, down the chest and back up under the arm. Every
// pose gets the same one — see the caller for why a shortened running version
// was wrong — and the caller clips it: to the torso, to the shoulder socket,
// and to the smooth join's crown where that is the contour.
function paintQuiverSling(ctx, spec, p, u, x, torsoTop, returnY) {
    const halfStrip = (spec.quiverStrapWidth ?? 0.030) * u / 2;
    const outerX = x - 0.018 * u + halfStrip;
    const innerX = x - 0.018 * u - halfStrip;
      ctx.save(); ctx.fillStyle = p.f; ctx.globalAlpha *= spec.quiverStrapOpacity ?? 0.85;
      // One filled ribbon: a narrow shoulder start widens smoothly to 0.03u.
      ctx.beginPath();
      ctx.moveTo(x - 0.060 * u, torsoTop + 0.012 * u);
      ctx.bezierCurveTo(x - 0.030 * u, torsoTop - 0.004 * u,
        outerX, torsoTop - 0.001 * u, outerX, torsoTop + 0.025 * u);
      if (spec.quiverAngular) {
        ctx.lineTo(outerX, returnY - 0.009 * u);
        ctx.lineTo(x - 0.078 * u, returnY + 0.014 * u);
        ctx.lineTo(x - 0.086 * u, returnY - 0.014 * u);
        ctx.lineTo(innerX, returnY - 0.031 * u);
        ctx.lineTo(innerX, torsoTop + 0.025 * u);
      } else {
        ctx.bezierCurveTo(outerX, torsoTop + 0.09 * u,
          x - 0.004 * u + halfStrip, returnY + halfStrip, x - 0.082 * u, returnY + halfStrip);
        ctx.lineTo(x - 0.082 * u, returnY - halfStrip);
        ctx.bezierCurveTo(x - 0.004 * u - halfStrip, returnY - halfStrip,
          innerX, torsoTop + 0.09 * u, innerX, torsoTop + 0.025 * u);
      }
      ctx.quadraticCurveTo(innerX - 0.001 * u, torsoTop + 0.018 * u,
        x - 0.060 * u, torsoTop + 0.018 * u);
      ctx.closePath(); ctx.fill(); ctx.restore();
}

function paintPrincessCostume(ctx, spec, p, u, ow, lod, g) {
  const k = PRINCESS_COSTUMES[spec.princessCostume];
  if (!k) return;
  const { px, torsoTop, torsoBot, torsoHalf, torsoPath, hipY, legL, bob, run, jump, frontLegs, hipAt, footB, t } = g;
  // Widths measured AT THEIR OWN HEIGHT on a tapered build, the way every
  // band on the qipao is: a skirt or belt sized off the shoulders overhangs
  // a real waist on both sides.
  const halfAt = (y) => (spec.taper
    ? taperHalfAt(y, torsoTop, torsoBot, torsoHalf, g.waistHalf, g.shoulderSoft)
    : torsoHalf);
  const gold = p.a, gem = p.gem || '#e3657c';
  const drag = (v, max) => Math.max(-max, Math.min(max, v));
  const goldLine = (path, w = 0.022) => {
    if (lod) return;
    ctx.strokeStyle = gold;
    ctx.lineWidth = hair(0.5, w * u);
    ctx.lineCap = 'round';
    ctx.beginPath(); path(ctx); ctx.stroke();
  };
  // Bodice: the torso repainted in its own colour, clipped to the silhouette
  // the shirt was filled with, then the rim re-inked so the clip's half-stroke
  // does not leave a green hairline inside the outline.
  // The bodice repaint used to live here. It is a torso-clipped fill, and this
  // pass runs AFTER both arms — so it painted over the puffed sleeves, which
  // sit mostly inside the torso silhouette at the shoulder. Both sleeves
  // simply vanished under it. It now runs with the torso itself, before any
  // arm is drawn: see the princessCostume repaint beside the torso fill.
  // Neckline and midriff are PAINT clipped to the torso, the bargain the
  // tank top and the crop make: skin over the bodice, silhouette untouched.
  // Done here rather than through `tank`/`crop` because the bodice fill above
  // would have covered them.
  const beltYc = hipY - (0.05 + (spec.dressRise ?? k.rise ?? 0)) * u + bob;
  if (k.neck || k.midriff) {
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.fillStyle = p.s;
    const skinEdge = (path) => {
      ctx.beginPath(); path(ctx); ctx.fill();
      if (lod) return;
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.45, ow * 0.6);
      ctx.beginPath(); path(ctx); ctx.stroke();
      ctx.restore();
    };
    // `neckStyle` lets a cut override the costume's own neckline, which is
    // what the neckline bake-off varies. Every shape here is the same bargain
    // as the V: skin painted over the bodice and clipped to the torso, so the
    // silhouette never moves and only the colour map does.
    const nk = spec.neckStyle ?? k.neck;
    if (nk && nk !== 'v') {
      const nx = px + (run || jump ? 0.01 * u : 0);
      const nHalf = torsoHalf * (spec.neckWide ?? k.neckWide ?? 0.42);
      const nDepth = torsoTop + (torsoBot - torsoTop) * (spec.neckDeep ?? k.neckDeep ?? 0.2);
      const ntop = torsoTop - 0.03 * u;
      const shapes = {
        // One arc. The quiet one.
        round: (c) => {
          c.moveTo(nx - nHalf, ntop);
          c.bezierCurveTo(nx - nHalf, nDepth, nx + nHalf, nDepth, nx + nHalf, ntop);
        },
        // A straight cut with vertical sides and the corners barely eased —
        // square is the shape, and rounding it off is how it stops being one.
        square: (c) => {
          const r = nHalf * 0.16;
          c.moveTo(nx - nHalf, ntop);
          c.lineTo(nx - nHalf, nDepth - r);
          c.quadraticCurveTo(nx - nHalf, nDepth, nx - nHalf + r, nDepth);
          c.lineTo(nx + nHalf - r, nDepth);
          c.quadraticCurveTo(nx + nHalf, nDepth, nx + nHalf, nDepth - r);
          c.lineTo(nx + nHalf, ntop);
        },
        // Wider and deeper than round: the most skin of the set without
        // taking the shoulders off, which is the line Peter drew.
        scoop: (c) => {
          c.moveTo(nx - nHalf, ntop);
          c.bezierCurveTo(nx - nHalf * 1.05, nDepth * 0.9 + torsoTop * 0.1,
            nx + nHalf * 1.05, nDepth * 0.9 + torsoTop * 0.1, nx + nHalf, ntop);
        },
        // Two lobes meeting in a shallow dip — the storybook one.
        sweetheart: (c) => {
          const mid = ntop + (nDepth - ntop) * 0.62;
          c.moveTo(nx - nHalf, ntop);
          c.quadraticCurveTo(nx - nHalf, nDepth, nx - nHalf * 0.36, nDepth);
          c.quadraticCurveTo(nx, nDepth * 0.5 + mid * 0.5, nx, mid);
          c.quadraticCurveTo(nx, nDepth * 0.5 + mid * 0.5, nx + nHalf * 0.36, nDepth);
          c.quadraticCurveTo(nx + nHalf, nDepth, nx + nHalf, ntop);
        },
        // Wide and very shallow, running toward the shoulders: collarbone
        // rather than chest, which is a different kind of formal.
        boat: (c) => {
          c.moveTo(nx - nHalf * 1.28, ntop);
          c.quadraticCurveTo(nx, nDepth, nx + nHalf * 1.28, ntop);
        },
      };
      skinEdge(shapes[nk] || shapes.round);
      if (spec.necklace) {
        // A NECKLACE, which is the whole reason for cutting a neckline this
        // shape. The chain goes ROUND HER NECK — up over the collarbones to the
        // sides of her throat — rather than sitting as an arc across her chest,
        // and it is drawn as fine as the ink allows. Everything hangs off two
        // measurements so a style can be swapped without re-deriving them:
        // `chainY` is where the chain's lowest point sits and `cw` is how wide
        // it runs. `necklaceStyle` picks the piece; the default is one pendant.
        const style = spec.necklaceStyle || 'pendant';
        const gemCol = p.gem || '#e3657c';
        const chainY = ntop + (nDepth - ntop) * 0.34;
        const cw = nHalf * 0.66;
        // A chain at a given depth and width. Its own path, because every
        // style below is one or two of these plus what hangs on them.
        const chain = (depth, wide, w = 0.007) => {
          ctx.save();
          ctx.strokeStyle = p.a;
          ctx.lineWidth = hair(0.25, w * u);
          ctx.beginPath();
          ctx.moveTo(nx - wide, ntop - 0.01 * u);
          ctx.quadraticCurveTo(nx, depth + 0.018 * u, nx + wide, ntop - 0.01 * u);
          ctx.stroke();
          ctx.restore();
        };
        // Where a chain of the given depth/width actually passes, at a
        // fraction t across it — so a bead sits ON the chain rather than near
        // it, whatever the chain is doing.
        const onChain = (depth, wide, t) => {
          const q = (1 - t) * (1 - t), r = 2 * (1 - t) * t, k = t * t;
          return [q * (nx - wide) + r * nx + k * (nx + wide),
            q * (ntop - 0.01 * u) + r * (depth + 0.018 * u) + k * (ntop - 0.01 * u)];
        };
        const setGem = (x, y, rr, shape) => {
          outlined(ctx, p.a, hair(0.35, ow * 0.4), (c) => {
            if (shape === 'drop') {
              c.moveTo(x, y - rr * 1.5);
              c.bezierCurveTo(x + rr, y - rr * 0.5, x + rr, y + rr, x, y + rr * 1.15);
              c.bezierCurveTo(x - rr, y + rr, x - rr, y - rr * 0.5, x, y - rr * 1.5);
            } else c.arc(x, y, rr, 0, Math.PI * 2);
          });
          dot(ctx, x, y + (shape === 'drop' ? rr * 0.05 : 0), rr * 0.46, gemCol);
        };
        if (style === 'choker') {
          // A BAND at the throat, high and tight, with the stone set in it.
          // No drop at all — the piece is the band.
          const by2 = ntop + (nDepth - ntop) * 0.12;
          outlined(ctx, p.a, hair(0.3, ow * 0.35), (c) => {
            c.moveTo(nx - nHalf * 0.72, by2 - 0.012 * u);
            c.quadraticCurveTo(nx, by2 + 0.03 * u, nx + nHalf * 0.72, by2 - 0.012 * u);
            c.lineTo(nx + nHalf * 0.72, by2 + 0.008 * u);
            c.quadraticCurveTo(nx, by2 + 0.05 * u, nx - nHalf * 0.72, by2 + 0.008 * u);
            c.closePath();
          });
          setGem(nx, by2 + 0.032 * u, 0.021 * u);
        } else if (style === 'trio') {
          // Three stones graduated along the chain, the middle one largest —
          // a collar rather than a pendant, and the only style here that puts
          // anything out toward the collarbones.
          //
          // It gets its OWN chain: the default one climbs to the torso's top
          // edge at both ends, so stones spaced along it either bunched in the
          // middle or landed on the clip and vanished. This one runs low and
          // nearly flat, which is what a collar of stones does anyway.
          const cy2 = chainY + 0.03 * u;
          const cwT = nHalf * 0.86;
          ctx.save();
          ctx.strokeStyle = p.a;
          ctx.lineWidth = hair(0.25, 0.007 * u);
          ctx.beginPath();
          ctx.moveTo(nx - cwT, cy2 - 0.03 * u);
          ctx.quadraticCurveTo(nx, cy2 + 0.026 * u, nx + cwT, cy2 - 0.03 * u);
          ctx.stroke();
          ctx.restore();
          for (const [fx, rr, dy] of [[-0.62, 0.013, -0.004], [0, 0.021, 0.014], [0.62, 0.013, -0.004]]) {
            setGem(nx + fx * cwT, cy2 + dy * u, rr * u);
          }
        } else if (style === 'layered') {
          // Two chains at different depths, the shorter one bare and the
          // longer carrying the drop. Reads as jewellery rather than as one
          // ornament, and it is the busiest thing that still stays quiet.
          chain(chainY * 0.55 + ntop * 0.45, cw * 0.78, 0.006);
          chain(chainY + 0.022 * u, cw, 0.007);
          setGem(nx, chainY + 0.058 * u, 0.02 * u, 'drop');
        } else if (style === 'teardrop') {
          // One stone, cut as a drop instead of a disc, on the same chain.
          // The quietest change from what she wears now.
          chain(chainY, cw);
          setGem(nx, chainY + 0.042 * u, 0.023 * u, 'drop');
        } else if (style === 'torc') {
          // A solid gold collar sitting ON the collarbones with a gap at the
          // front and a stone between its ends — metal, not chain. The most
          // formal, and the one that reads at the smallest size.
          const ty2 = ntop + (nDepth - ntop) * 0.3;
          for (const sgn of [-1, 1]) {
            outlined(ctx, p.a, hair(0.3, ow * 0.4), (c) => {
              c.moveTo(nx + sgn * nHalf * 0.78, ntop - 0.01 * u);
              c.quadraticCurveTo(nx + sgn * nHalf * 0.62, ty2 + 0.016 * u, nx + sgn * 0.026 * u, ty2 + 0.022 * u);
              c.lineTo(nx + sgn * 0.026 * u, ty2 + 0.004 * u);
              c.quadraticCurveTo(nx + sgn * nHalf * 0.5, ty2 - 0.004 * u, nx + sgn * nHalf * 0.62, ntop - 0.01 * u);
              c.closePath();
            });
          }
          setGem(nx, ty2 + 0.018 * u, 0.019 * u);
        } else {
          chain(chainY, cw);
          setGem(nx, chainY + 0.03 * u, 0.024 * u);
        }
      }
    } else if (nk === 'v') {
      // A deep soft-shouldered V, cut a shade deeper than the tank's.
      //
      // It follows the CHIN, not the torso's centre line. drawHead offsets the
      // head by 0.01u off torsoCx in every pose but the stand, so a neckline
      // pinned to the body's true centre hangs visibly left of her face the
      // moment she moves — and the thing a viewer checks a neckline against is
      // the face above it, not the ribs behind it. Being a shade off-centre on
      // the torso is the price and it is the cheaper of the two.
      const nx = px + (run || jump ? 0.01 * u : 0);
      const vHalf = torsoHalf * (k.neckWide || 0.46), vDepth = torsoTop + (torsoBot - torsoTop) * (k.neckDeep || 0.46), ntop = torsoTop - 0.03 * u;
      skinEdge((c) => {
        c.moveTo(nx - vHalf, ntop);
        c.quadraticCurveTo(nx - vHalf * 0.4, vDepth * 0.5 + torsoTop * 0.5, nx, vDepth);
        c.quadraticCurveTo(nx + vHalf * 0.4, vDepth * 0.5 + torsoTop * 0.5, nx + vHalf, ntop);
      });
    }
    // REJECTED (6 Sep 2026): a strapless 'off' neckline — skin across the
    // shoulders and the top of the chest. Peter: "not off the shoulder, no
    // flesh-coloured thing". The V is as low as a neckline goes here.
    if (k.midriff) {
      const hemB = torsoTop + (beltYc - torsoTop) * k.midriff;
      skinEdge((c) => {
        c.moveTo(px - torsoHalf * 1.3, hemB);
        c.lineTo(px + torsoHalf * 1.3, hemB);
        c.lineTo(px + torsoHalf * 1.3, beltYc + 0.1 * u);
        c.lineTo(px - torsoHalf * 1.3, beltYc + 0.1 * u);
      });
    }
    ctx.restore();
  }
  if (spec.quiverMount === 'loop') {
    // Plain case-colour strip, ending at the shoulder with a shorter jump return.
    // `slingFit` moves it inboard by exactly what the smooth shoulder join
    // moved the socket, so strap and arm keep the relationship they have
    // without the join. REJECTED (9 Sep 2026): parking it further inboard and
    // drawing it under the arm — her socket sits so close to the neckline that
    // there is no shoulder inboard of the arm for a strap to go over, and it
    // died against the arm's inner edge instead.
    // FITTED RIG (the smooth shoulder join, which pulls her near socket into
    // the gown): Peter wants the strap OUTBOARD of the neckline (9 Sep 2026).
    // Her socket sits so close to the neckline that the shoulder there is the
    // arm's own cap, so the strip goes to 0.55 of the half-width and its
    // shoulder crossing is painted over the arm's cap down to the socket's
    // height — a straight cut where the upper arm's cylinder begins, not the
    // disc's curved edge, which read as the arm clipping the strap.
    // ONE SCHEME FOR EVERY POSE. `slingFit` slides the strip inboard with the
    // socket when the smooth join fits that socket into the gown; nothing else
    // about the strap changes with the pose. Cutting it short for the moving
    // poses — under the arm, or stopped at the socket — is what made it vanish
    // while she ran: the sling is a thing she is wearing, and it reads the same
    // standing and running or it reads as appearing when she stops.
    const x = px - torsoHalf * 0.48 + (g.slingFit || 0);
    const returnY = torsoTop + (jump ? 0.13 : 0.16) * u;
    const paintStrip = () => paintQuiverSling(ctx, spec, p, u, x, torsoTop, returnY);
    {
    // The overlay includes the shoulder crown above the socket, preventing
    // the jumping sleeve from punching a gap through the tapered start.
    const socketMask = () => {
      const r = g.slingSocketR;
      ctx.moveTo(g.slingSocketX - r, torsoTop - u);
      ctx.lineTo(g.slingSocketX + r, torsoTop - u);
      ctx.lineTo(g.slingSocketX + r, g.slingSocketY);
      ctx.arc(g.slingSocketX, g.slingSocketY, r, 0, Math.PI);
      ctx.closePath();
    };
    ctx.save(); ctx.beginPath();
    ctx.rect(px - 2 * u, torsoTop - 2 * u, 4 * u, 4 * u);
    socketMask(); ctx.clip('evenodd'); paintStrip(); ctx.restore();
    if (g.setSlingOverArm) g.setSlingOverArm(() => {
      ctx.save();
      // Under the smooth join the shoulder's contour up there is the CROWN,
      // not the torso's own corner, so the recovered crossing is trimmed to it
      // — otherwise the strap's tapered start hangs outside the silhouette.
      if (g.slingTrim) {
        ctx.beginPath(); ctx.rect(px - 2 * u, torsoTop - 2 * u, 4 * u, 4 * u);
        g.slingTrim(ctx); ctx.clip('evenodd');
      }
      ctx.beginPath(); socketMask();
      ctx.clip(); paintStrip(); ctx.restore();
    });
    }
  } else if (spec.quiverMount && spec.quiverMount !== 'belt') {
    const compact = spec.quiverMount === 'loop';
    const x = px - torsoHalf * (compact ? 0.67 : 0.59);
    const endY = torsoTop + (compact ? 0.105 : 0.12) * u;
    // The body-side length is underneath the animated sleeve. Only the tiny
    // crown is recovered over the socket; never repaint the underarm return.
    const paintSling = (shoulderOnly = false) => {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(x - 0.018 * u, torsoTop + 0.014 * u);
        ctx.bezierCurveTo(x - 0.012 * u, torsoTop + 0.001 * u,
          x + 0.003 * u, torsoTop + 0.004 * u, x + 0.003 * u, torsoTop + 0.032 * u);
        if (!shoulderOnly) {
          ctx.bezierCurveTo(x + 0.004 * u, endY - 0.035 * u,
            x - 0.002 * u, endY - 0.012 * u, x - 0.025 * u, endY - 0.004 * u);
          ctx.quadraticCurveTo(x - 0.041 * u, endY + 0.001 * u,
            px - halfAt(endY) - 0.012 * u, endY);
        }
      };
      path(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.033 * u; ctx.stroke();
      path(); ctx.strokeStyle = '#875b36'; ctx.lineWidth = 0.025 * u; ctx.stroke();
      ctx.restore();
    };
    if (g.setSlingOverArm) g.setSlingOverArm(() => paintSling(true));
    paintSling();
  } else if (spec.quiverStrap && !spec.quiverMount) {
    // THE QUIVER'S SLING. Not a bandolier: the case hangs off ONE shoulder and
    // the strap goes over that shoulder and down under the same armpit, so
    // from the front all you should see is a short brown band at the shoulder
    // on the quiver's own side. Nothing crosses the chest.
    //
    // Every diagonal version of this was wrong for the same reason — a strap
    // drawn from shoulder to opposite hip IS a bandolier, and it cut the
    // neckline, the necklace and the bodice on its way past. The sling says
    // the same thing (the case is held on) with a tenth of the ink.
    //
    // Drawn AFTER the neckline so the bare skin cannot erase it, and clipped
    // to the torso: it starts above the shoulder line so the contour cuts it
    // along the shoulder's own curve, and ends inside the torso where a real
    // strap disappears under the arm.
    // Inboard of the shoulder's outer edge, not on it. At 0.82 of the
    // half-width the sling sat where the ARM SOCKET is drawn and the limb's
    // own root covered most of it — a strap you can see a third of does not
    // read as a strap. 0.55 puts it on open cloth between the socket and the
    // neckline, which is the only band of torso that is actually visible from
    // the front on this rig.
    const sxq = px - torsoHalf * 0.55;
    const halfS = 0.021 * u;
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    outlined(ctx, p.w, hair(0.4, ow * 0.5), (c) => {
      c.moveTo(sxq - halfS, torsoTop - 0.2 * u);
      c.lineTo(sxq + halfS, torsoTop - 0.2 * u);
      c.lineTo(sxq + halfS * 1.15, torsoTop + (beltYc - torsoTop) * 0.52);
      c.lineTo(sxq - halfS * 1.15, torsoTop + (beltYc - torsoTop) * 0.52);
      c.closePath();
    });
    ctx.restore();
  }
  // Skirt — the tunic's construction at any length. Long skirts inherit a
  // little of the trailing leg's swing so the cloth moves with the stride
  // rather than hanging as a board around it.
  // `rise` lifts the whole waist — belt, skirt top and the gore seams with it.
  // An empire-ish waist reads as a dress rather than a tunic, and it is one
  // number because every one of those pieces has to move together or the belt
  // stops sitting on the seam it exists to hide.
  // `dressRise` and `skirtLen` are per-CUT overrides of the table's own
  // numbers — the waist height and the hem are the two things still being
  // judged, and a bake-off needs to vary them without forking the costume.
  const rise = spec.dressRise ?? k.rise ?? 0;
  const beltY = hipY - (0.05 + rise) * u + bob;
  const top = beltY + 0.02 * u;
  const s = k.skirt;
  const hemAt = (len) => hipY + legL * len + bob * 0.5;
  const hemY = hemAt(spec.skirtLen ?? s.len);
  const beltHalf = halfAt(beltY);
  const wTop = beltHalf * 0.98;
  // A skirt SPREADS when its wearer leaves the floor — the hem is the free
  // edge and the air gets under it. Without this the knees came up inside a
  // hem that stayed exactly as wide as it is standing, so they broke out of
  // the sides; the other half of that fix is the shallower `celebTuck`.
  const celebUp = Math.min(1, (g.celebLift || 0) / 0.09);
  const airUp = jump ? Math.max(0, -Math.min(1, (Number(g.vy) || 0) / 160)) : celebUp;
  const wHem = torsoHalf * s.flare * (frontLegs && s.flare > 1.3 ? 1.06 : 1)
    * (1 + airUp * 0.16);
  const long = s.len > 0.6;
  const sway = (jump ? 0.02 : 0) * u
    + (run ? drag((footB[0] - hipAt(-1)) * (long ? 0.3 : 0.15), 0.045 * u) : 0)
    + (run && long ? Math.sin(t * 12) * 0.008 * u : 0);
  const dip = 0.045 * u * (s.flare / 1.3);
  // THE SLIT CLOSES FOR THE CELEBRATION. It is cut over the stepping thigh,
  // which is exactly right while she is walking or running — the leg it shows
  // is a leg in motion. Standing on both feet with them apart, the same
  // opening just shows a bare leg on one side and nothing on the other, which
  // is what read as her knee escaping the skirt on the left only.
  const skirtSplit = g.celebrating ? 0 : (s.split || 0);
  const skirtPath = (hy, wh, split) => (c) => {
    // An inverted V cut into one side, the leg showing through it. On the
    // trailing side (-1) it is a battle skirt; on the leading side (+1) it is
    // the slit a gown opens over the stepping thigh. `splitHigh` is where the
    // apex sits as a fraction of the drop from the waist — small is high.
    const apexY = top + (hy - top) * (s.splitHigh || 0.42);
    c.moveTo(px - wTop, top);
    c.lineTo(px + wTop, top);
    if (split > 0) {
      c.lineTo(px + wh + sway, hy);
      c.quadraticCurveTo(px + wh * 0.9 + sway, hy + dip * 0.3, px + wh * 0.68 + sway, hy);
      c.lineTo(px + wTop * 0.42 + sway * 0.5, apexY);
      c.lineTo(px + wh * 0.22 + sway, hy);
      c.quadraticCurveTo(px - sway * 0.3, hy + dip, px - wh + sway, hy);
    } else if (split < 0) {
      c.lineTo(px + wh + sway, hy);
      c.quadraticCurveTo(px + sway * 0.6, hy + dip, px - wh * 0.2 + sway, hy);
      c.lineTo(px - wTop * 0.4 + sway * 0.5, apexY);
      c.lineTo(px - wh * 0.62 + sway, hy);
      c.quadraticCurveTo(px - wh * 0.82 + sway, hy + dip * 0.35, px - wh + sway, hy);
    } else {
      c.lineTo(px + wh + sway, hy);
      c.quadraticCurveTo(px + sway, hy + dip, px - wh + sway, hy);
    }
    c.closePath();
  };
  if (s.under) {
    outlined(ctx, p.under || p.w, ow, skirtPath(hemAt((spec.skirtLen ?? s.len) + s.under), wHem * 1.03, 0));
  }
  const skirtFill = p.skirt || p.b;
  const wash = (a) => (a < 0 ? `rgba(0,0,0,${(-a).toFixed(3)})` : `rgba(255,255,255,${a.toFixed(3)})`);
  const WASH = [-0.11, 0.08, -0.05, 0.11, -0.08, 0.05, -0.1, 0.07];
  if (s.panels && s.loose && !lod) {
    // LOOSE PANELS. The washes alone are paint on one sheet, and paint cannot
    // move — so the skirt is cut into real gores instead: each is its own quad,
    // pinned at the waist and free at the hem, riding its own clock. Same
    // construction Grumpos's pteruges and Kiko's split qipao use, and for the
    // same reason: a one-piece skirt is a board however it is shaded.
    //
    // A shorter base sheet goes underneath first. The gores swing apart, and
    // without something behind them the gaps would show her legs through the
    // middle of the dress rather than at the split where it is intended.
    // The base sheet now carries the SILHOUETTE at full ink weight, at the
    // panels' own length and very nearly their width — so the skirt's outer
    // contour is the same weight as the rest of her, and the panel seams on
    // top of it can be hairlines. Cut short and narrow, as it was, the full
    // weight landed on every panel edge instead and the skirt came out drawn
    // in heavier line than the body wearing it.
    outlined(ctx, skirtFill, ow, skirtPath(hemY, wHem * 0.97, 0));
    // `fineSeams` is what makes the difference: interior folds are creases in
    // cloth, not edges of it, and at this scale a crease drawn at contour
    // weight reads as the skirt being cut into separate straps.
    const seamOw = s.fineSeams ? ow * 0.4 : ow;
    const n = s.panels;
    for (let i = 0; i < n; i++) {
      const f0 = -1 + (2 * i) / n, f1 = -1 + (2 * (i + 1)) / n;
      const fc = (f0 + f1) / 2;
      // Each hem swings on its own phase, and the outermost panels swing
      // hardest — they are the free edges, the middle of a skirt is held in by
      // the ones either side of it.
      const ph = (run ? t * 5.5 : t * 1.3) + i * 1.05;
      // Calmer than it was. At 0.05u the hems threw far enough that the skirt
      // read as caught in a wind rather than as cloth moving with her stride.
      const amp = (run ? 0.022 : 0.012) * u * (0.55 + Math.abs(fc) * 0.75);
      // AIRBORNE, and in the celebration hop, the hem needs a driver the pose
      // actually has: the panels' own drift is an idle stir, while a jump wants
      // them to trail and lift. Signed, so it reverses at the apex by itself,
      // and the outer panels take more of it than the middle ones.
      //
      // Both terms are HANDED IN — `vy` and `celebLift` — rather than read off
      // a local. This is the costume painter; the pose and the hop's motion
      // belong to the body painter. An earlier version of this reached for
      // `pose` and `cm` directly and threw on every hero wearing the gown.
      const airG = jump
        ? Math.max(-1, Math.min(1, (Number(g.vy) || 0) / 160))
        : -Math.min(1, (g.celebLift || 0) / 0.09);
      const dx = Math.sin(ph) * amp + sway - airG * 0.05 * u * (0.45 + Math.abs(fc));
      const dy = Math.cos(ph * 1.3) * amp * 0.32 - airG * 0.035 * u * (0.4 + Math.abs(fc));
      // Overlapped a few percent so no gap can open between neighbours at the
      // waist, where they are pinned and must read as one garment.
      const o = 0.04;
      const panelPath = (c) => {
        c.moveTo(px + (f0 - o) * wTop, top);
        c.lineTo(px + (f1 + o) * wTop, top);
        c.lineTo(px + (f1 + o) * wHem + dx, hemY + dy);
        c.quadraticCurveTo(px + fc * wHem + dx, hemY + dy + dip * 0.5,
          px + (f0 - o) * wHem + dx, hemY + dy);
        c.closePath();
      };
      outlined(ctx, skirtFill, seamOw, panelPath);
      ctx.save();
      ctx.beginPath(); panelPath(ctx); ctx.clip();
      ctx.fillStyle = wash(WASH[i % WASH.length]);
      ctx.fillRect(px - wHem * 2, top - 0.05 * u, wHem * 4, (hemY - top) + 0.2 * u);
      ctx.restore();
    }
  } else {
  outlined(ctx, skirtFill, ow, skirtPath(hemY, wHem, skirtSplit));
  if (s.panels && !lod) {
    // GORES. A skirt cut from several panels catches the light differently on
    // each one, and that is the whole effect here: the fill is untouched and
    // every panel is a wash of black or white over it at a few percent, so the
    // greens stay one family instead of becoming a stripe pattern. Clipped to
    // the skirt, so no wash can escape the cloth.
    //
    // The shades do NOT alternate light-dark-light. A regular alternation reads
    // as a beach ball; an irregular walk reads as folded cloth, which is what
    // this is imitating.
    ctx.save();
    ctx.beginPath(); skirtPath(hemY, wHem, skirtSplit)(ctx); ctx.clip();
    const n = s.panels;
    for (let i = 0; i < n; i++) {
      const a = WASH[i % WASH.length];
      // Each gore is a quad, narrow at the waist and wide at the hem, so the
      // seams FAN the way a real panelled skirt does rather than running as
      // parallel vertical stripes.
      const f0 = -1 + (2 * i) / n, f1 = -1 + (2 * (i + 1)) / n;
      ctx.fillStyle = wash(a);
      ctx.beginPath();
      ctx.moveTo(px + f0 * wTop, top - 0.02 * u);
      ctx.lineTo(px + f1 * wTop, top - 0.02 * u);
      ctx.lineTo(px + f1 * wHem + sway, hemY + dip);
      ctx.lineTo(px + f0 * wHem + sway, hemY + dip);
      ctx.closePath();
      ctx.fill();
    }
    // The seams themselves: one hairline per join, at the ink's own colour and
    // very low alpha. Without them the washes read as lighting on one cone
    // rather than as separate pieces of cloth sewn together.
    ctx.globalAlpha *= 0.3;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = hair(0.4, ow * 0.5);
    for (let i = 1; i < n; i++) {
      const f = -1 + (2 * i) / n;
      ctx.beginPath();
      ctx.moveTo(px + f * wTop, top);
      ctx.lineTo(px + f * wHem + sway, hemY + dip);
      ctx.stroke();
    }
    ctx.restore();
  }
  }
  if (!lod && !s.split) {
    // The tunic's centre seam — one flat panel is a bib — and the gold hem
    // piping, traced inside the hem so it never spills past the cloth.
    ctx.save();
    ctx.globalAlpha *= 0.45;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = hair(0.5, ow * 0.4);
    ctx.beginPath();
    ctx.moveTo(px + sway * 0.5, top + 0.03 * u);
    ctx.lineTo(px + sway, hemY - 0.01 * u);
    ctx.stroke();
    ctx.restore();
    if (k.hemTrim !== false) {
      ctx.save();
      ctx.beginPath(); skirtPath(hemY, wHem, 0)(ctx); ctx.clip();
      goldLine((c) => {
        c.moveTo(px - wHem + sway, hemY - 0.012 * u);
        c.quadraticCurveTo(px + sway, hemY + dip - 0.008 * u, px + wHem + sway, hemY - 0.012 * u);
      }, 0.02);
      ctx.restore();
    }
  }
  // Tabard: one panel hanging down the centre, pointed at the hem, gold-edged,
  // the ruby a third of the way down. From the belt it is a tunic detail;
  // from the chest it is the whole gown's front.
  if (k.panel) {
    const pn = k.panel;
    // A chest-mounted tabard starts BELOW the neckline, not at the collar: run
    // to the collar it covers the V it is supposed to sit under, and the whole
    // point of widening the V was to see it.
    const pTop = pn.from === 'chest'
      ? torsoTop + (torsoBot - torsoTop) * (k.neck === 'v' ? (k.neckDeep || 0.46) * 0.92 : 0.12)
      : beltY;
    const pHem = hemY - 0.03 * u;
    const hT = torsoHalf * pn.half, hB = hT * 1.22;
    const bx = px + sway * 0.85;
    const panel = (c) => {
      c.moveTo(px - hT, pTop);
      c.lineTo(px + hT, pTop);
      c.lineTo(bx + hB, pHem - 0.015 * u);
      c.lineTo(bx, pHem + 0.022 * u);
      c.lineTo(bx - hB, pHem - 0.015 * u);
      c.closePath();
    };
    outlined(ctx, p.panel || p.f, ow, panel);
    if (!lod) {
      ctx.save();
      ctx.beginPath(); panel(ctx); ctx.clip();
      goldLine((c) => {
        c.moveTo(px - hT, pTop);
        c.lineTo(bx - hB, pHem - 0.015 * u);
        c.lineTo(bx, pHem + 0.022 * u);
        c.lineTo(bx + hB, pHem - 0.015 * u);
        c.lineTo(px + hT, pTop);
      }, 0.018);
      ctx.restore();
    }
    if (pn.emblem) {
      const ey = pTop + (pHem - pTop) * (pn.from === 'chest' ? 0.42 : 0.36), r = 0.036 * u;
      outlined(ctx, gem, hair(0.45, ow * 0.5), (c) => {
        c.moveTo(px, ey - r); c.lineTo(px + r * 0.75, ey); c.lineTo(px, ey + r); c.lineTo(px - r * 0.75, ey); c.closePath();
      });
    }
  }
  // Waist. Every band is sized at the waist and hides the skirt's top seam.
  if (k.belt === 'gold') {
    // `beltH` is the band's height in u; the tunic's 0.058 is a leather belt
    // and on a gown it read as a cummerbund. The buckle gem scales with it.
    const bh = k.beltH ?? 0.058;
    outlined(ctx, gold, hair(0.5, ow * 0.6), (c) => roundRectPath(c, px - beltHalf * 1.02, beltY - bh * 0.5 * u, beltHalf * 2.04, bh * u, Math.min(0.02, bh * 0.35) * u));
    outlined(ctx, gem, hair(0.5, ow * 0.5), (c) => c.arc(px, beltY + 0.002 * u, Math.min(0.026, bh * 0.44) * u, 0, Math.PI * 2));
  } else if (k.belt === 'leather') {
    outlined(ctx, p.p, hair(0.5, ow * 0.6), (c) => roundRectPath(c, px - beltHalf * 1.02, beltY - 0.028 * u, beltHalf * 2.04, 0.058 * u, 0.02 * u));
    outlined(ctx, gold, hair(0.5, ow * 0.5), (c) => c.arc(px, beltY + 0.002 * u, 0.028 * u, 0, Math.PI * 2));
  } else if (k.belt === 'sash') {
    const sash = p.sash || p.w;
    outlined(ctx, sash, hair(0.5, ow * 0.6), (c) => roundRectPath(c, px - beltHalf * 1.06, beltY - 0.034 * u, beltHalf * 2.12, 0.068 * u, 0.018 * u));
    if (!lod) {
      ctx.strokeStyle = sash; ctx.lineWidth = 0.03 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - torsoHalf * 0.55, beltY + 0.01 * u); ctx.lineTo(px - torsoHalf * 0.85, beltY + 0.11 * u); ctx.stroke();
      outlined(ctx, sash, hair(0.4, ow * 0.5), (c) => c.arc(px - torsoHalf * 0.55, beltY + 0.006 * u, 0.03 * u, 0, Math.PI * 2));
    }
  }
  // Chest dressings, last, over the bodice and whatever hangs from it.
  if (k.pauldrons) {
    for (const sgn of [-1, 1]) {
      outlined(ctx, gold, hair(0.5, ow * 0.7), (c) => {
        c.arc(px + sgn * torsoHalf * 0.9, torsoTop + 0.04 * u, torsoHalf * 0.36, Math.PI, Math.PI * 2);
        c.closePath();
      });
    }
  }
  if (k.cowl) {
    // A cowl laid across the shoulders, hanging to a point on the chest.
    const cw = torsoHalf * 1.18, cy = torsoTop - 0.005 * u;
    outlined(ctx, p.cowl || p.w, ow, (c) => {
      c.moveTo(px - cw, cy);
      c.lineTo(px + cw, cy);
      c.quadraticCurveTo(px + cw * 0.55, cy + 0.06 * u, px, cy + 0.14 * u);
      c.quadraticCurveTo(px - cw * 0.55, cy + 0.06 * u, px - cw, cy);
      c.closePath();
    });
    outlined(ctx, gold, hair(0.4, ow * 0.5), (c) => c.arc(px, cy + 0.05 * u, 0.024 * u, 0, Math.PI * 2));
  }
  if (k.lacing && !lod) {
    // Three cross-laces down the bodice, and nothing more: a fourth is speckle.
    for (let i = 0; i < 3; i++) {
      const y = torsoTop + 0.09 * u + i * 0.052 * u, w = 0.045 * u, h = 0.032 * u;
      goldLine((c) => { c.moveTo(px - w, y); c.lineTo(px + w, y + h); c.moveTo(px + w, y); c.lineTo(px - w, y + h); }, 0.016);
    }
  }
  if (k.yoke) {
    // Gold embroidery at the yoke: two curves from the shoulders meeting on
    // the chest, the ruby where they meet.
    for (const sgn of [-1, 1]) {
      goldLine((c) => {
        c.moveTo(px + sgn * torsoHalf * 0.8, torsoTop + 0.012 * u);
        c.quadraticCurveTo(px + sgn * 0.035 * u, torsoTop + 0.045 * u, px, torsoTop + 0.125 * u);
      }, 0.02);
    }
    outlined(ctx, gem, hair(0.45, ow * 0.5), (c) => c.arc(px, torsoTop + 0.135 * u, 0.026 * u, 0, Math.PI * 2));
  }
  // The throat clasp and the necklace are the SAME mark in two places, and a
  // cut wearing both had two gold medallions stacked under her chin. The
  // necklace wins where there is one, since it is the piece the neckline was
  // opened up to show.
  if (k.clasp && !spec.necklace) {
    // Rides with the neckline it closes, or it sits off the V it belongs to.
    const cx = px + (run || jump ? 0.01 * u : 0);
    outlined(ctx, gold, hair(0.45, ow * 0.5), (c) => c.arc(cx, torsoTop + 0.02 * u, 0.032 * u, 0, Math.PI * 2));
    dot(ctx, cx, torsoTop + 0.02 * u, 0.014 * u, gem);
  }
}

// Preview-only fade layers, reused per destination context. The full-strength
// join and all production callers draw directly without allocating a layer.
const shoulderPreviewLayers = new WeakMap();
export function supportsShoulderJoinPreview(spec) {
  const fernwickGown = spec?.princessCostume === 'gown' && spec.back === 'quiver';
  return spec?.rig === 'humanoid' && (!spec.taper || fernwickGown) && !spec.puffs
    && !spec.bareArms && !spec.cannon && !spec.heavy;
}
function drawHumanoid(ctx, id, spec, p, pose, u, ow, lod) {
  if (pose.kind === 'slide' && pose.roll) return drawRoll(ctx, spec, p, pose, u, ow);
  if (pose.kind === 'slide' && SLIDE_STYLE_DRAWS[pose.slideStyle]) {
    ctx.save();
    // The slide owns its arrival (a tip-back onto the grounded hip); the
    // other styles take the generic height blend.
    if (pose.slideStyle !== 'kick') slideStyleEntry(ctx, pose);
    SLIDE_STYLE_DRAWS[pose.slideStyle](ctx, id, spec, p, pose, u, ow, lod);
    ctx.restore();
    return;
  }
  const heavy = !!spec.heavy;
  // This hero's limb style, or null for the shipped painter. Resolved up here
  // rather than beside the gait because legL reads it, and legL is a body
  // proportion that every pose is measured against — not a run-only term.
  // pose.gaitTune lets the gallery sweep any single dial over the resolved
  // style. Only keys the style already owns are taken, coerced through Number
  // and dropped when non-finite — a garbage override must degrade to the
  // table's own value, never reach the IK as NaN.
  const L = (() => {
    const base = locoStyle(spec, pose);
    if (!base || !pose.gaitTune || typeof pose.gaitTune !== 'object') return base;
    const t = { ...base };
    for (const k of Object.keys(base)) {
      if (pose.gaitTune[k] == null || typeof base[k] !== 'number') continue;
      const v = Number(pose.gaitTune[k]);
      if (Number.isFinite(v)) t[k] = v;
    }
    return t;
  })();
  const cling = clingSettle(pose), clingStyle = CLING[id] || CLING_DEFAULT;
  const cm = pose.kind === 'celebrate'
    ? celebrateMotion(id, pose.time || 0, usesReworkedCelebration(pose), spec.celebrate)
    : null;
  const turnLimit = Math.PI * 5 / 12;
  // Gallery Gnash turns his actual rig through a modest three-quarter pose;
  // the shipped spin remains untouched. sin(pi*q) returns him front-on at both
  // ends, avoiding the old flat scale-through-zero trick.
  const celebrateTurn = cm && cm.move === 'stepturn' ? Math.sin(cm.q * Math.PI) * 42 : 0;
  const turnRad = Math.max(-turnLimit, Math.min(turnLimit,
    ((Number(pose.turn) || 0) + celebrateTurn) * Math.PI / 180));
  const turnYaw = Math.sin(turnRad);
  const turnDepth = Math.abs(turnYaw);
  const turned = turnDepth > 0.001;
  // Positive gallery yaw exposes the screen-left side to camera.
  const nearSign = turnYaw < 0 ? 1 : -1;
  // Travelling left-to-right, a hero shows their RIGHT side to the lens, so the
  // near arm belongs on screen-LEFT and the far one recedes to screen-right —
  // which is exactly what nearSign already gives the turned rig. Front-on the
  // rig used to root them the other way round, so the arms swapped sides the
  // moment `turn` went nonzero (the far shoulder jumped from -6 to +19 between
  // 0 deg and 1 deg). `armDepth` opts a hero into the one convention; without
  // it sideF is 1 and every offset below collapses to the legacy geometry.
  const depthArms = !!spec.armDepth;
  const sideF = depthArms ? nearSign : 1;   // outward direction, near arm
  const sideB = -sideF;                     // outward direction, far arm
  // How far the receding side is pushed back. A depth-rigged hero carries a
  // little of this even front-on — the far arm is behind the ribs whether or
  // not the body has turned — and the rest arrives with the turn. The turned
  // TORSO has had a receding-side shade since the 3/4 rig landed; this is the
  // same cue finally reaching the limbs that hang off it, which is why the arms
  // used to read as pasted on at the same distance as the near ones.
  const farShade = depthArms ? 0.1 + 0.18 * turnDepth : 0.22 * turnDepth;
  // A slightly smaller head is the strongest lever on perceived height: it
  // also keeps the taller heavy rig inside the 24px draw box.
  // `headScale` sizes the skull independently of the body. It exists because
  // `tall` deliberately does NOT touch the head — that is what makes a 7% dial
  // read as more than 7% on the raider, since the eye measures height by the
  // head it is given. The same property inverts below 1: shrinking Kiko's body
  // with `tall` left the same skull on a smaller frame, so she came out
  // top-heavy beside Lorenzo. This is the counterweight, and it is a separate
  // dial rather than folded into `tall` precisely so each can be aimed.
  const headR = (heavy ? 0.185 : 0.21) * u * (spec.headScale || 1);
  // The final multipliers are intentionally absent from every production
  // spec. They are narrow gallery dials for comparing the body-proportion
  // study without cloning this rig or moving any head/face geometry.
  const torsoBaseHalf = (heavy ? 0.23 : spec.stout ? 0.2 : spec.slim ? 0.148 : 0.17)
    * u * (spec.shoulders || 1) * (spec.torsoWidth || 1);
  // Keep most of the chibi barrel width through the turn. The asymmetric
  // silhouette and overlap carry the depth; projection only trims it lightly.
  const torsoHalf = torsoBaseHalf * (1 - 0.1 * turnDepth);
  // Shoulder-to-waist taper. torsoHalf is the shoulder line; `taper` is the
  // waist as a fraction of it, so <1 is the inverted taper that reads as
  // muscle where a straight barrel reads as belly.
  const waistHalf = torsoHalf * (spec.taper || 1) * (spec.waistScale || 1);
  // legLen is the one styled term that is NOT gated on the run: a hero's legs
  // are the same length standing, sliding and airborne, so lengthening them
  // for the gait alone would change his proportions the moment he stopped.
  const legL = (heavy ? 0.4 : spec.stout ? 0.27 : 0.3) * u
    * (spec.legLength || 1) * (spec.tall || 1) * (L ? L.legLen : 1);
  // Front-on hip half-separation, and how far outboard of it the crouch plants
  // its feet. Both in u; the crouch's leg length is solved against them.
  const HIP_HALF = 0.095;
  const SLIDE_SPREAD = 0.215;
  // The heavy rig's arm is LONG. Its shoulder sits far higher than everyone
  // else's (-0.708u vs -0.5u) while the old length hung the running hand a
  // full 0.095u above its own belt — the light rigs land theirs right on it —
  // so the arms read as held up near the chest on the one character whose
  // reach should be his most imposing feature.
  const armL = (heavy ? 0.38 : 0.26) * u * (spec.armLength || 1);
  const legW = (heavy ? 0.11 : spec.slim ? 0.082 : 0.09) * u * (spec.legWidth || 1);
  // Heavy base width is sized so the arm's PINCH points (elbow 0.72x, wrist
  // 0.62x — see armDims) still match a normal hero's full 0.075u arm: the
  // muscle profile narrows in places, and sized equal at the base those
  // narrows made the strongest hero read thinner-armed than anyone.
  const armW = (heavy ? 0.118 : spec.slim ? 0.068 : 0.075) * u * (spec.armWidth || 1);
  // What an arm is made of. Everyone shipped so far wears sleeves, so the limb
  // takes the torso colour and the hand is the only skin on it; `bareArms` is
  // for a sleeveless top, where the whole limb is skin and the SHOULDER is the
  // hem. Nothing else moves — the shoulder cap stays body-coloured, because its
  // job is burying the arm's root inside the torso and the torso is still cloth.
  const armFill = spec.bareArms ? p.s : p.b;
  // The heavy rig's arms carry a bicep — upper segment fatter than the
  // forearm. Everyone else strokes a uniform limb.
  // Heavy-arm anatomy kit: bones pinch at the elbow and wrist, and the
  // muscle mass rides in bulges (see muscleLimb). Flexing for a crowd the
  // BICEP bulge swells, throbbing on the same clock as the pose's arm pump
  // so the swell and the squeeze land together; the bones don't inflate,
  // which is what kept the old fat-bone version reading as sausages.
  const reworkedCelebration = pose.kind === 'celebrate' && usesReworkedCelebration(pose);
  const studyCurl = heavy && cm && reworkedCelebration
    ? cm.cycle < 0.058 ? 0
      : cm.cycle < 0.138 ? (cm.cycle - 0.058) / 0.08
        : cm.cycle < 0.49 ? 1
          : cm.cycle < 0.547 ? 1 - (cm.cycle - 0.49) / 0.057 : 0
    : 0;
  const flexT = heavy && (pose.kind === 'celebrate' || pose.menuAction === 'flex')
    ? reworkedCelebration
      // The gallery curl now contracts ON the pose instead of breathing on an
      // unrelated sine clock and occasionally going slack during its hold.
      ? 1.08 + 0.14 * studyCurl
      : 1.06 + 0.12 * Math.abs(Math.sin((pose.time || 0) * 6))
    : 1;
  const armDims = heavy ? {
    shoulderW: armW * 1.12, elbowW: armW * 0.72, wristW: armW * 0.62,
    bicepR: armW * 0.5 * flexT, foreR: armW * 0.44,
    crease: studyCurl, separate: studyCurl,
  } : null;
  // The near arm carries more of the silhouette; the far arm is narrower and
  // pulled toward the torso. This is the depth cue the old front-on rig lacked.
  // Clinging thins them. Two body-coloured arms at full width, run up the
  // centre line and crossing the face, merge into ONE mass — the hero reads as
  // hiding behind a slab rather than holding a pole. Thinner, they stay two
  // limbs with the face between them, which is the whole silhouette.
  const clingThin = 1 - 0.28 * cling;
  const armWF = armW * (1 + 0.1 * turnDepth) * clingThin;
  const armWB = armW * (1 - 0.14 * turnDepth) * clingThin;
  const armDimsF = armDims && turned ? {
    ...armDims,
    shoulderW: armDims.shoulderW * (1 + 0.1 * turnDepth),
    elbowW: armDims.elbowW * (1 + 0.06 * turnDepth),
    wristW: armDims.wristW * (1 + 0.04 * turnDepth),
    bicepR: armDims.bicepR * (1 + 0.08 * turnDepth),
    foreR: armDims.foreR * (1 + 0.06 * turnDepth),
  } : armDims;
  const armDimsB = armDims && turned ? {
    ...armDims,
    shoulderW: armDims.shoulderW * (1 - 0.14 * turnDepth),
    elbowW: armDims.elbowW * (1 - 0.1 * turnDepth),
    wristW: armDims.wristW * (1 - 0.08 * turnDepth),
    bicepR: armDims.bicepR * (1 - 0.12 * turnDepth),
    foreR: armDims.foreR * (1 - 0.1 * turnDepth),
  } : armDims;
  const legWF = legW * (1 + 0.06 * turnDepth);
  const legWB = legW * (1 - 0.12 * turnDepth);
  // Clinging IS the idle pose. Not a variation on it, not the airborne pose
  // eased toward it — the same body, standing, with one thing changed: the
  // arm on the pole side reaches out and takes the pole. Every previous cut of
  // this invented its own legs (a tuck, a lean, a bow, a stance) on top of the
  // JUMP pose the slide arrives in, and every invention was a way of not being
  // the pose it was supposed to be quoting. So the kind is overridden here,
  // once, at the top: from this line down the whole painter believes he is
  // standing, which is the only way "exactly the idle" can survive a hundred
  // downstream branches asking `jump ?` for themselves.
  const clung = clingAmount(pose) > 0.5;
  const run = !clung && pose.kind === 'run';
  const walk = run && !!pose.walk;
  // A WALK is not a slow run: it keeps a foot on the ground at all times, and
  // locoFoot's recovery arc is a flight phase. The spec is a run spec, and the
  // one caller that sets the flag — the grumpos walk study — has named beats
  // (contact / down / pass / up) that a re-shaped clock would slide off. So
  // the gait terms below leave walks exactly as they were; only legLen, which
  // is a body proportion rather than a gait, still applies.
  const styledGait = !!L && run && !walk;
  const jump = !clung && pose.kind === 'jump';
  const slide = !clung && pose.kind === 'slide';
  const enhancedMotion = usesEnhancedLocomotion(pose);
  const airV = jump ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 460)) : 0;
  // Player physics uses positive Y/velocity upward and negative downward.
  const airRise = Math.max(0, airV), airFall = Math.max(0, -airV);
  const airApex = jump ? 1 - Math.abs(airV) : 0;
  const ph = (pose.phase || 0) * Math.PI * 2;
  const s = Math.sin(ph);
  // The victory hop itself is applied to the whole rig in drawToon; here the
  // torso only lags a beat behind it, so the head trails the body.
  // Standing still — and the victory dance — are genuinely FRONT-ON poses,
  // not becalmed walk frames: legs hang from separate left/right hip points,
  // and the feet draw as symmetric front-facing ovals instead of profile
  // shoes. Rooted at a shared center hip, the IK flares the front thigh up
  // over the torso while the back one hides behind it — a lopsided can-can.
  const stand = !run && !jump && !slide;
  // Poses whose legs are genuinely symmetric about the body: each leg roots at
  // its own hip and the shoes read as front-facing ovals. The crouch belongs
  // here with standing and the victory hop — only running and jumping are
  // profile gaits with one leg crossing the body.
  const frontLegs = stand || slide;
  // A pure sine spends as long at the top of the bob as at the bottom, which
  // is a float, not a footfall. bobShape > 1 sharpens the dip so the body
  // drops onto each contact and rides up between them.
  const bob = run ? -shaped(Math.abs(Math.cos(ph)), styledGait ? L.bobShape : 1) * (walk ? 0.014 : 0.03) * u * (styledGait ? L.bob : 1)
    : cm ? Math.sin((pose.time || 0) * 6 + 1.2) * 0.016 * u
    : pose.kind === 'idle' ? Math.sin((pose.time || 0) * 2) * 0.012 * u : 0;

  // 0.92 of a leg length: the knees carry a slight standing bend. `stance`
  // raises that toward a straighter leg for the styled run only, which does
  // two things at once and is why it is one dial rather than two — the body
  // rides higher off the ground, AND the hip-to-ankle span grows against
  // unchanged bones, so the knee bends less to cover it. Left at 1 the whole
  // cast stands exactly where it always did.
  // `tall` raises the whole figure off the feet: every vertical landmark and
  // the legs together, so the proportions hold and only the HEIGHT changes.
  // The head is deliberately NOT in it — headR stays 0.21u — which is the
  // strongest lever there is on perceived height, and the reason a 7% dial
  // reads as more than 7%: the same head on a longer body is what the eye
  // actually measures. Applied to the crouch's own landmarks too, so a taller
  // hero gives up the same FRACTION of her height sliding that everyone else
  // does rather than folding to a shared absolute.
  const tall = spec.tall || 1;
  let hipY = -legL * 0.92 * (styledGait ? L.stance : 1);
  const headBase = -(heavy ? 0.978 : 0.76) * u;
  // The head's lift, as an ABSOLUTE distance rather than a scale — and the neck
  // and shoulders take the SAME lift, not their own proportional one.
  //
  // This is the join: the skull's radius is deliberately outside `tall` (see
  // above), so the head's bottom edge rises by the head's full lift while a
  // torso top that merely scaled rose by less. The difference is a gap at the
  // neck that opens the further the dial goes — at 1.13 it was a third of a
  // head, and she read as a portrait floating over a dress. Lifting all three
  // landmarks by the head's own shift keeps the neck exactly as tight as it is
  // at 1.0, which is also why this cannot disturb the shipped cast: every hero
  // at tall = 1 has a lift of zero and lands on the identical numbers.
  const tallLift = headBase * (tall - 1);
  // The other half of the same join, and the one that survived the first fix:
  // `headScale` shrinks the skull about its CENTRE, so a smaller head lifts its
  // own bottom edge by the radius it gave up while the collar stays put. On
  // Kiko's 0.88 skull that is 0.025u of daylight under her chin — small in the
  // spec, a visible gap on screen, and nothing to do with how tall she is: it
  // was there at 0.91 too. The neck follows the head's LOWER EDGE, so the two
  // dials can be aimed independently and the join holds under either.
  const skullLift = headR - (heavy ? 0.185 : 0.21) * u;
  const upper = tallLift + skullLift + bob;
  let torsoTop = -(heavy ? 0.768 : 0.56) * u + upper;
  let headY = headBase + tallLift + bob;
  let shoulderY = -(heavy ? 0.708 : 0.5) * u + upper;
  if (slide) {
    // The crouch used to drop every hero to the same flat height, which is not
    // the same thing as every hero crouching by the same amount: grumpos stands
    // a head taller than the rest (-0.978u vs -0.76u), so landing on a shared
    // -0.42u folded him to 43% of his standing height where the stout heroes
    // only gave up 45%. He read as a boulder with a face on it. The heavy rig
    // crouches to the same FRACTION of its OWN height instead, so he stays
    // visibly the biggest hero on the screen even sliding.
    // 1.36 is solved, not eyeballed: it puts his crouched crown at the same
    // fraction of his standing crown (0.65) that the stout heroes fold to, so
    // he gives up exactly as much height as everyone else and no more.
    const crouch = (heavy ? 1.36 : 1) * tall;
    hipY = -0.16 * u * crouch; torsoTop = -0.32 * u * crouch;
    headY = -0.42 * u * crouch; shoulderY = -0.27 * u * crouch;
    if (enhancedMotion) {
      // Let the shoulders and head settle a fraction farther than the pelvis:
      // a braced squat, rather than the entire figure shrinking as one block.
      torsoTop += 0.012 * u * crouch;
      shoulderY += 0.018 * u * crouch;
      headY += 0.024 * u * crouch;
    }
  }
  if (heavy && cm && cm.hunch) {
    // Front-on shorthand for a forward waist hinge: the knees and pelvis give
    // slightly, the shoulder girdle rolls farther down, and the head tucks the
    // farthest toward the chest. Different offsets preserve his mass; a single
    // y-scale would merely make the whole character look squashed.
    hipY += cm.hunch * 0.018 * u;
    torsoTop += cm.hunch * 0.025 * u;
    shoulderY += cm.hunch * 0.045 * u;
    headY += cm.hunch * 0.07 * u;
  }
  // Bottom of the torso. Declared up here with the rest of the body landmarks
  // rather than beside the torso path it feeds: shoulderCap measures the body's
  // half-width against it, and the STANDING pose draws its front arm in the
  // back-limb pass, before the torso is painted. Left at the path it sat in the
  // temporal dead zone for that one pose.
  const torsoBot = hipY + 0.05 * u;
  // Declared up here rather than beside the torso paint it feeds: the shoulder
  // and hip caps borrow this shape's own light ramp so they can vanish into
  // it, and the standing pose draws its near arm BEFORE the torso is painted.
  // Every measurement taken against the taper silhouette has to be taken with
  // the SAME corner, or a belt sized off the default sits a sliver in from a
  // body drawn with a softer one. It is threaded through each taperHalfAt call
  // below for exactly that reason.
  const shoulderSoft = spec.shoulderSoft;
  const torsoPath = turned
    ? (c) => turnedTorsoPath(c, torsoCx, torsoTop, torsoBot, torsoHalf, waistHalf, turnYaw)
    : spec.taper
      ? (c) => taperTorsoPath(c, torsoCx, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
      : (c) => roundRectPath(c, -torsoHalf + torsoCx, torsoTop, torsoHalf * 2, torsoBot - torsoTop, torsoHalf * 0.7);
  // Where the ARMS socket, as opposed to where the shoulder line sits. The axe
  // and shield stay pinned to shoulderY; only the limbs seat lower.
  // `armLift` raises where the arms socket, in u — higher on the shoulder
  // rather than slung under it. A per-spec dial and not a global change: armY
  // is the root every pose in this file measures its hands from, so moving it
  // for everyone would re-pose the entire shipped cast, and this is a request
  // about the candidates.
  const armY = shoulderY + (heavy ? 0.03 : 0) * u - (spec.armLift || 0) * u;
  // Running, the NEAR arm rides a little higher in its socket than the far one:
  // it is the arm carrying the silhouette, and seated at the same depth as the
  // receding one it read as slung off the bottom of the shoulder. Run only —
  // the standing pose's deltoid is already the shape the others are chasing.
  // ...and AIRBORNE too, not just running. This lift is the reason the run's
  // near shoulder reads as a deltoid rather than as a socket slung off the
  // bottom of the shoulder line — and the jump had never been given it, so
  // every hero's near arm dropped 0.03u the moment they left the ground. Beside
  // its own run, that is a shoulder that has come loose.
  // Airborne it lifts a shade FURTHER than the run does. On the ground the run
  // is the reference and 0.03u is its tuned value; in the air the shoulder
  // girdle rides up with the body and the extra 0.008u is what keeps the near
  // arm from reading as hanging off a static socket while everything else is
  // moving.
  const armYF = armY - (depthArms && (run || jump) && !turned
    ? (heavy ? 0.018 : 0.03) + (jump ? (heavy ? 0.006 : 0.008) : 0) : 0) * u;
  const leanX = run ? (walk ? 0.018 : 0.05) * u * (styledGait ? L.lean : 1)
    : slide && enhancedMotion ? 0.025 * u : 0; // crouch puts weight over the toes
  // A yawed torso has a small shoulder-to-hip offset; the top of the body is
  // no longer a perfectly flat front-facing slab over the feet.
  const torsoCx = leanX * 0.5 + nearSign * turnDepth * 0.04 * u;

  // The leg aims 0.02u ABOVE the foot point so its round end cap — including
  // the fat outline pass, which reaches legW/2 + ow past the endpoint — is
  // buried inside the shoe instead of poking out under the sole. Declared up
  // here because the standing IK has to size itself against the same target.
  const ankleLift = 0.02 * u;
  // feet: gait path while running, direct targets otherwise; knees via IK
  // The heavy rig runs on a shorter, straighter stride: less knee bend and a
  // lower foot lift keep the joint high under the battle skirt, so the hem can
  // sit well above the shin without a knee crossing it. It also reads as the
  // planted, choppy gait of someone twice everyone else's mass.
  // The tunic rig borrows the same idea for the same reason: the knee's bulge
  // is the IK slack, sqrt(seg^2 - (d/2)^2), thrown out PERPENDICULAR to the
  // thigh — and a near-vertical thigh throws it almost straight forward. At the
  // full 0.56 bone that put fernwick's lifted thigh 0.067u past the edge of her
  // tunic mid-swing, a brown wedge apparently floating outside the cloth. A
  // shorter bone is the only lever that touches it: stride and foot lift barely
  // move the bulge, because it points across the leg rather than along it.
  let legSeg = (slide ? 0.2 : heavy ? 0.42 : spec.tunic ? 0.44 : 0.56) * legL + 0.02 * u;
  if (walk && heavy) legSeg = 0.4 * legL + 0.005 * u;
  const stride = legL * (walk ? (heavy ? 0.23 : 0.32) : heavy ? STRIDE_RUN_HEAVY : STRIDE_RUN)
    * (styledGait ? L.stride : 1);
  const lift = legL * (walk ? (heavy ? 0.15 : 0.22) : heavy ? LIFT_RUN_HEAVY : LIFT_RUN)
    * (styledGait ? L.lift : 1);
  let footF, footB, kneeF = 1, kneeB = 1;
  // Ankle rotation, in radians, positive = toe down. The shoes were un-rotated
  // ellipses before the styles landed, so a hero without one keeps 0 here and
  // draws exactly the same flat oval he always did.
  let ankleF = 0, ankleB = 0;
  if (run) {
    if (styledGait) {
      // Shorter bones. The IK's knee bulge is the slack it has to throw out
      // sideways, so a leg solved on two long segments hinges in the middle
      // instead of folding — the joint has to read as a KNEE at 70px, and it
      // only does that if there is a real angle at it.
      legSeg *= L.seg;
      kneeF = L.knee; kneeB = L.knee;
      const pF = pose.phase || 0, pB = pF + 0.5;
      if (L.path === 'gait') {
        // Shipped swing, new foot. gaitFoot's stance runs q 0 to 0.5 with the
        // sole flat, which is why this style's `contact` is 0.5: the roll has
        // to unwind against the footfall it is actually standing on.
        footF = gaitFoot(pF, stride, lift);
        footB = gaitFoot(pB, stride, lift);
        ankleF = ankleRoll(pF, L) * L.ankle;
        ankleB = ankleRoll(pB, L) * L.ankle;
      } else {
        const fF = locoFoot(gaitPhase(pF, L), stride, lift, L);
        const fB = locoFoot(gaitPhase(pB, L), stride, lift, L);
        footF = [fF[0], fF[1]]; ankleF = fF[2] * L.ankle;
        footB = [fB[0], fB[1]]; ankleB = fB[2] * L.ankle;
      }
    } else {
      footF = gaitFoot(pose.phase || 0, stride, lift);
      footB = gaitFoot((pose.phase || 0) + 0.5, stride, lift);
    }
  } else if (jump) {
    if (pose.stomp) { footF = [0.06 * u, hipY + legL * 0.95]; footB = [-0.06 * u, hipY + legL * 0.95]; kneeB = -1; }
    else if (L) {
      // The shipped jump holds ONE symmetric pose for the whole arc, which at
      // any speed reads as a cut-out being lifted. Driven off the same
      // rise/apex/fall terms it gets three beats instead: rise puts the front
      // knee up with the rear leg extended back and the toe pointed, the apex
      // tucks both, and the fall reaches the front leg down and forward with
      // the heel dropping to meet the ground.
      // A SCISSOR, not a double tuck. Both feet used to fold well short of full
      // extension — the front to 42% of the leg and the trailing one to 75% at
      // a typical airborne velocity — so the figure read as sitting down in the
      // air rather than leaping, which is what makes every jump look low beside
      // its own run. Measured, the jump silhouette is only 1-2% shorter than
      // the run's, so it was never a HEIGHT problem: it is that neither leg
      // extends, and a leap is legs doing opposite things.
      //
      // So the trailing leg now reaches near-straight down and back (89% at the
      // same velocity) while the lead knee stays up. The apex still tucks both,
      // harder on the trailing leg than before, so the gather at the top of the
      // arc survives — it is only the rest of the arc that stops crouching.
      // `jumpKneeDrop` lowers the lead foot in the air, in leg-lengths, which
      // lowers the KNEE with it. It is a per-hero dial because it only matters
      // to a hero in a skirt: the lead knee tucks to just under the waist, and
      // on a bare-legged rig that is the pose, while under a skirt it comes up
      // THROUGH the waistband where no cloth can cover it — the garment is
      // drawn after the legs, but nothing is drawn above its own top edge.
      // ...and it turned out to matter to everyone. At zero the lead foot sits
      // 0.42 of the leg below the hip on the rise, which folds the knee up to
      // WAIST height: the thigh leaves the pelvis horizontally, from a root
      // at the belt line, and reads as growing out of the groin — the run's
      // thigh never shows this because it angles down and the trousers bury
      // its root. 0.14 (Lorenzo, judged against his own run at the same size;
      // 0.08 still floated, 0.2 lost the knee-up) drops the knee to just under
      // the belt where the run's thigh leaves, and the leap survives — the
      // fall still reaches, the trailing leg still extends. Skirted heroes
      // keep their own tuned values.
      const kneeDrop = legL * (spec.jumpKneeDrop ?? JUMP_KNEE_DROP);
      footF = [
        (0.1 + 0.05 * airApex + 0.05 * airFall) * u,
        hipY + legL * (0.32 + 0.1 * airRise - 0.06 * airApex + 0.46 * airFall) + kneeDrop,
      ];
      footB = [
        (-0.2 - 0.04 * airApex + 0.04 * airFall) * u,
        hipY + legL * (1.02 + 0.08 * airRise - 0.22 * airApex + 0.04 * airFall),
      ];
      ankleF = (0.5 * airRise + 0.4 * airApex - 0.55 * airFall) * L.ankle;
      ankleB = (0.3 + 0.25 * airApex) * L.ankle;
      // Short enough that the tuck FOLDS rather than hinging.
      legSeg = L.jumpSeg * legL + 0.02 * u;
    } else if (enhancedMotion) {
      // Launch trails one leg, the apex tucks both knees, and descent opens the
      // feet into a landing stance. The targets interpolate continuously from
      // velocity, so reversing at the apex cannot pop a knee between sides.
      footF = [
        (0.15 + 0.035 * airApex + 0.02 * airFall) * u,
        hipY + legL * (0.48 - 0.17 * airApex + 0.24 * airFall),
      ];
      footB = [
        (-0.12 - 0.03 * airApex - 0.015 * airFall) * u,
        hipY + legL * (0.82 - 0.38 * airApex - 0.12 * airFall - 0.05 * airRise),
      ];
    } else { footF = [0.15 * u, hipY + legL * 0.5]; footB = [-0.12 * u, hipY + legL * 0.85]; }
  } else if (slide) {
    // A crouch is a FRONT-ON pose, like standing and the victory hop — not a
    // profile one. Rooted at a shared center hip (the profile rig) the two legs
    // left that point as straight diagonals to feet 0.19u either side: a hard X
    // under the body that reads as crossed legs, because at this scale a
    // straight limb carries no knee to say otherwise. Each leg now hangs off
    // its OWN hip (see frontLegs) with the feet planted just outboard of it.
    footF = [SLIDE_SPREAD * u, 0]; footB = [-SLIDE_SPREAD * u, 0]; kneeB = -1;
    // Sized off the real hip-to-ankle run, then let out ~30% so the crouch
    // actually folds: the slack becomes the sideways bow of the knee, which is
    // the whole silhouette of a squat. Locked to the old flat 0.2*legL the leg
    // couldn't even reach the foot and straightened out again.
    legSeg = Math.hypot(SLIDE_SPREAD * u - HIP_HALF * u, Math.abs(hipY) - ankleLift) / 2 * 1.3;
  } else if (cm || cling > 0) {
    // Feet mirror under their own hips and share one tuck height — uneven
    // lifts read as a one-legged kick, not a hop.
    //
    // The pole ride borrows this branch, and the borrowing is the point: a
    // person sliding a pole toward the ground bends their knees to meet it, and
    // the bent-knee shape this game already owns is the celebration hop's. The
    // slide rides down IN the pose it is about to land in, so ride → land →
    // celebrate is one continuous motion instead of three poses taking turns.
    // The bend is not constant: he catches with his legs near the idle hang
    // (CLING_TUCK_TOP) and draws them up as the cap approaches (clingRide → 1,
    // see run.js), topping out at CLING_TUCK — still short of the hop's full
    // tuck. The whole term is scaled by `cling`, which the run ramps out over
    // the last of the ride, so the knees extend into the touchdown and the
    // celebration's grounded beats pick up from the same near-straight legs.
    const ride = Math.max(0, Math.min(1, pose.clingRide || 0));
    const air = cm ? Math.min(1, cm.lift / 0.1)
      : (CLING_TUCK_TOP + (CLING_TUCK - CLING_TUCK_TOP) * ride) * cling;
    // `celebTuck` scales how far the hop draws the knees up, per hero. A full
    // tuck folds the leg hard, and a hard fold pushes the KNEE outward — the
    // IK's bend has to go somewhere — which on a hero in a skirt puts both
    // knees out through the sides of the leather. Skirted heroes take a
    // shallower tuck: still clearly airborne, without the leg leaving the
    // garment. Bare-legged heroes keep the full hop, where the deep fold is
    // the whole shape of it.
    const tuck = air * (spec.celebTuck ?? 1);
    footF = [(0.1 + 0.07 * tuck) * u, -tuck * 0.4 * legL];
    footB = [-(0.1 + 0.07 * tuck) * u, -tuck * 0.4 * legL];
    kneeB = -1;
    // Grounded beats keep the stand's near-straight hang; the segment eases
    // back to full length as the feet tuck so the knees get room to bend.
    // Blended on the SCALED tuck, not the raw hop. `celebTuck` shortens how far
    // the knees draw up, but this line kept handing the leg its full slack —
    // and a two-bone leg with slack it does not need spends it SIDEWAYS: the
    // IK's lateral bulge grows as the square root of the slack, which is what
    // put the knees out through the sides of the skirt however small the tuck
    // got. Scaled together, a shallow tuck also means a taut leg.
    legSeg = legSeg * tuck + (Math.hypot(0.01 * u, Math.abs(hipY) - ankleLift) / 2 + 0.001 * u) * (1 - tuck);
  } else {
    // Stand: each foot directly under its own hip, legs hanging near-straight.
    // The segment is measured against the REAL hip-to-target distance — the
    // leg aims ankleLift above the foot, and the hip sits 0.095u out — with
    // only a hair of slack. Sizing it off |hipY|/2 quietly doubles that slack,
    // and the IK's sideways bulge grows as sqrt(slack), so the thighs bow out
    // past the leather either side of him.
    footF = [STAND_FOOT_X * u, 0]; footB = [-STAND_FOOT_X * u, 0]; kneeB = -1;
    legSeg = Math.hypot(0.01 * u, Math.abs(hipY) - ankleLift) / 2 + 0.001 * u;
  }
  // `clung` sent the whole painter down the STAND path above — same hip roots,
  // same front-facing shoes as idling — and the ride's legs live in the
  // celebrate branch it shares, where they bend progressively toward the hop's
  // shape as the cap comes up. There is nothing else for a cling to adjust.

  // In motion the near leg keeps a longer, clearer stride while the far leg
  // tucks behind the body. Their hip roots are separated instead of sharing
  // one front-on center line.
  // The pelvis belongs to the turned torso, not the old front-on run axis.
  // Keeping it on leanX while torsoCx shifted in yaw made both thighs appear
  // to enter the body from in front of the waist.
  // Second half of the tunic fix: pull the leg roots back a touch. The feet are
  // absolute gait targets, so only the hips move — the stride lands in exactly
  // the same place and just leaves from further back, which rakes the thighs
  // and buys the swing a little more cloth to travel under. On its own it isn't
  // enough (it can't cover more than a third of the escape without visibly
  // dragging the legs behind him); paired with the shorter bone above, the
  // worst-case escape across the whole cycle goes to zero.
  const tunicRake = spec.tunic && (run || jump) ? 0.03 * u : 0;
  const hipRun = (turned ? torsoCx : leanX * 0.3) - tunicRake;
  const hipSeparation = (walk ? 0.065 : 0.07) * u * turnDepth;
  // Splitting the hip roots gives the pelvis mass the shipped rig lacks, where
  // both thighs root on one centre line. But this is x, and in a PROFILE run x
  // is the direction of travel — so the split puts one hip in FRONT of the
  // other rather than out to the side, and past a point it drags the thigh
  // toward horizontal and the figure reads as sitting. Measured on lorenzo the
  // limit is real: the spec's 0.052 reads as sitting. 0.035 is where it landed,
  // judged against renders — below it the leg roots too near the centre line to
  // read as hanging off a hip, which is the whole reason the dial exists. What
  // makes 0.035 affordable is the pair it ships with: the dwell anchored at
  // 0.35 and the lift back at shipped's own 1.0 take the chair count BELOW
  // shipped (6/32 vs 8/32) and the knee-under-shoe artifact to a third of
  // shipped's depth, so the wider root spends its budget where it shows. See
  // the pelvis bake-off in the gallery for the rungs either side.
  // Both pelvis terms take a POSE override, same as armLag, so the gallery can
  // sweep them without cloning the style table five times over.
  const hipSplitAmt = pose.hipSplit == null ? L && L.hipSplit : Number(pose.hipSplit) || 0;
  const hipDepthAmt = pose.hipDepth == null ? L && L.hipDepth : Number(pose.hipDepth) || 0;
  // THE JUMP SHARES THE RUN'S PELVIS. Every term below used to be gated on
  // `run` alone, so the moment a hero left the ground both thighs snapped back
  // to one root on the centre line at waist height — and with the lead knee
  // drawn up, that thigh read as leaving from the groin rather than a hip.
  // The same pelvis the run was tuned with (split, depth, the lowered root)
  // now carries through the whole arc; only the symmetric air stomp keeps the
  // centre root, since its feet are a front-on pair like the stand's.
  const styledJump = !!L && jump && !pose.stomp;
  const styledPelvis = styledGait || styledJump;
  const hipSplit = styledPelvis ? hipSplitAmt * u : 0;
  const hipNearX = hipRun + nearSign * hipSeparation + sideF * hipSplit;
  const hipFarX = hipRun - nearSign * hipSeparation + sideB * hipSplit;
  // Running thighs leave from the underside of the pelvis. Starting them at
  // hipY put their round caps over the belly, creating the giant crotch ball
  // exposed by the no-skirt anatomy view.
  const legRootY = turned && (run || styledJump) ? hipY + 0.052 * u : hipY;
  // ...and the pelvis has DEPTH as well as width: the near hip sits a little
  // low and forward of the far one, which is the same receding-side cue the
  // arms and torso already carry, finally reaching the legs.
  const legRootYF = legRootY + (styledPelvis ? 0.006 * u * hipDepthAmt : 0);
  const legRootYB = legRootY + (styledPelvis ? -0.014 * u * hipDepthAmt : 0);
  if (turned && styledJump) {
    // The jump's feet are fixed offsets rather than a stride, so they move
    // with their hip roots unscaled: the pose keeps its shape and simply
    // hangs off the turned pelvis instead of the front-on centre line.
    footF = [hipNearX + footF[0], footF[1]];
    footB = [hipFarX + footB[0], footB[1]];
  } else if (turned && run) {
    const footSpread = nearSign * turnDepth * (walk ? 0.006 : 0.04) * u;
    footF = [hipNearX + footF[0] * (walk ? 0.92 : 0.84) + footSpread, footF[1]];
    footB = [hipFarX + footB[0] * (walk ? 0.82 : 0.62) - footSpread, footB[1]];
    // Both knees hinge toward the direction of travel. Opposite bend signs
    // made one leg bow sideways merely because it was the receding leg.
    kneeF = 1;
    kneeB = 1;
  }

  // A running leg may straighten. It may not run out of leg.
  //
  // Past full extension the solver does not merely straighten: joint() clamps
  // its along-axis term at `seg`, so the thigh holds its length and the SHIN
  // stretches to cover the rest. The first cut of this port asked for 8% more
  // span than two segments could reach and got exactly that — a rubber leg,
  // dead straight, on three frames of eight.
  //
  // The amplitudes have since been pulled back to where the shipped bones can
  // span them, so at the tabled values this never fires. It stays as the guard
  // that made the diagnosis: raise `stride`, `lift` or `legLen` again and the
  // bone grows to match instead of the shin quietly tearing. Sampled across the
  // WHOLE cycle rather than this frame, or the correction would itself pump the
  // bone longer and shorter as the leg swung.
  if (styledGait && L.extend < 1) {
    const span = (foot, hx, hy) => Math.hypot(foot[0] - hx, (foot[1] - ankleLift) - hy);
    let worst = 0;
    for (let i = 0; i < 16; i++) {
      const q = i / 16;
      const a = L.path === 'gait' ? gaitFoot(q, stride, lift) : locoFoot(gaitPhase(q, L), stride, lift, L);
      worst = Math.max(worst, span(a, hipNearX, legRootYF), span(a, hipFarX, legRootYB));
    }
    legSeg = Math.max(legSeg, worst / (2 * L.extend));
  }

  // arms: bent at the elbow, counter-swinging the legs while running
  // Bones split evenly. The heavy rig used to carry a SHORT bicep with the
  // forearm taking the slack, which reads fine on a straight arm but wrecks the
  // solver on a bent one: whenever the hand target came nearer than the forearm
  // is long, the elbow swung up BEHIND the shoulder — 0.046u above it just
  // standing, and it only got worse as the arm lengthened. An even split keeps
  // the joint under the shoulder in every pose.
  let armSeg = armL * 0.55;
  let armSegF = armL * 1.1 - armSeg;
  // Nothing stretches for the cling. An earlier cut lengthened the bones by up
  // to 2.4x to put a fist above the crown on a pole he was hanging from; the
  // pose is not a hang any more, it is a hero standing beside a pole with a
  // hand ON it, and a hand at the end of a real arm is the whole reason the
  // step-aside below is sized the way it is.
  // Celebrating is front-on, so the arms root at the torso's shoulder
  // corners; at the run cycle's mid-chest attach, the front arm draws over
  // the torso and reads as growing out of the chest. The heavy rig roots at
  // the shoulder's edge in EVERY pose: its anatomy arm starts with a visible
  // shoulder cap that the old blended strokes never showed, and parked at
  // mid-chest that cap reads as an arm growing out of his sternum.
  // Celebrate used to root the arms at 0.92 of the half-width — nearly on the
  // rib edge, and far wider than any other pose sockets them. Both arms paid
  // for it: the near one hung its shoulder cap off the silhouette, and the far
  // one, drawn behind the torso, had almost nothing buried to attach to, so it
  // read as a tube laid against the body rather than an arm coming out of it.
  // The routine's spread lives in the HAND targets, not in the sockets, so the
  // pose loses nothing by rooting arms where every other pose roots them.
  const shSpread = turned ? (heavy ? 0.9 : 0.84) : heavy ? 0.84 : 0.55;
  const shoulderCx = turned ? torsoCx : leanX;
  // Running, the depth rig pushes the NEAR shoulder out past the ribs. Arm and
  // torso share p.b, so an arm crossing the chest is teal on teal and reads as
  // nothing but a stray glove; rooted wide, the near arm clears the body edge
  // and reads as an arm. The far shoulder keeps its symmetric root — buried
  // deeper it disappeared for the whole cycle and he looked one-armed.
  // Only the run: the standing and celebrating poses are genuinely symmetric,
  // and pushing one shoulder out there just cants him to one side.
  // ...but never past ~0.69 of the half-width, and never INWARD from the rig's
  // own spread. The push exists to compensate for the narrow 0.55 shoulder the
  // light rigs use; the heavy rig already roots at 0.84, and a blind 25% on top
  // of that hangs its shoulder clean off the ribs.
  const depthRun = depthArms && run && !turned;
  // The heavy rig gets its own pair: its shoulder is broad enough already that
  // the light rigs' cap would pull it IN, and its far shoulder sits barely
  // 0.015u inside the rib edge, so the deltoid showed on the receding side.
  const nearSpread = depthRun ? (heavy ? 1.12 : 1) : 1;
  const farSpread = depthRun && heavy ? 0.7 : 1;
  // Running, a light rig roots its near arm FLUSH with the torso edge: its
  // outer edge lands exactly on the silhouette. Rooted inboard of that — the
  // old mid-chest attach — a strip of body is left outside the arm, and once
  // the arm crosses the chest diagonally that strip is cut off from the rest of
  // the torso and reads as a lump sitting above the shoulder. Flush, there is
  // nothing left out there to orphan. The heavy rig keeps its own root: its
  // deltoid cap covers the join, so it can sit proud of the edge.
  // Flush against the body edge — but measured at the ARM'S OWN HEIGHT rather
  // than at the shoulder line, once the socket has been raised. This is the
  // "dislocated shoulder" fault: a rounded shoulder corner is a long way
  // inboard of torsoHalf up there, so a root placed at torsoHalf sits OUTSIDE
  // the body, the shoulder cap that exists to bury it finds no room and bails
  // (see its `r <= 0` return), and what is left on screen is the arm's own bare
  // round end cap perched on the corner with no body under it. Raising the
  // socket is what exposed it — at the shipped height the root is far enough
  // down the side that torsoHalf is honest.
  //
  // Gated on armLift so the shipped cast keeps the geometry it was tuned with:
  // nobody without a raised socket has the problem, and moving every hero's
  // arms to fix a candidate's would be the wrong trade.
  const nearFlushHalf = spec.armLift
    ? (spec.taper
      ? taperHalfAt(armYF, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
      : roundHalfAt(armYF, torsoTop, torsoBot, torsoHalf, torsoHalf * 0.7))
    : torsoHalf;
  const nearFlush = torsoCx + sideF * (nearFlushHalf - armWF / 2);
  // `armOut` pushes both sockets outboard, in u. A wide sleeve needs it: the
  // puffed sleeve is roughly twice the arm's width across, so an arm rooted
  // where a BARE limb would sit puts the sleeve's inboard edge up against the
  // neck. Applied to both shoulders rather than only the near one — front-on
  // the two are a mirrored pair, and moving one of them alone makes a standing
  // hero lopsided.
  const armOut = (spec.armOut || 0) * u;
  let shF = (turned
    ? shoulderCx + nearSign * (torsoHalf * shSpread * (1 + 0.14 * turnDepth) + turnDepth * 0.025 * u)
    : depthRun && !heavy
      ? nearFlush
      : shoulderCx + sideF * torsoHalf * shSpread * nearSpread) + sideF * armOut;
  const shB = (turned
    ? shoulderCx - nearSign * (torsoHalf * shSpread * (1 - 0.26 * turnDepth) + turnDepth * 0.018 * u)
    : shoulderCx + sideB * torsoHalf * shSpread * farSpread) + sideB * armOut;
  // Slide a hand target out to full arm reach along its own direction, so the
  // IK draws the arm straight: arms-out poses with a mid-reach target crook
  // the elbow into a chicken wing.
  const reach = (sx, sy, [tx, ty]) => {
    const dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1;
    return [sx + (dx / d) * (armSeg + armSegF), sy + (dy / d) * (armSeg + armSegF)];
  };
  let handF, handB, elbF = -1, elbB = -1;  // elbows trail behind by default
  // Set by a STANDING pose that pushes both arms out in front of the body — the
  // one case the back-pass rule below gets wrong (see armsInFront).
  let armsReachFront = false;
  let wrenchAngle = null;
  // Set by a pose whose near hand goes ABOVE the head (a throw cocked
  // overhead): the front arm is normally painted before the head, so up there
  // it — and whatever it is holding — vanishes behind the face. Same rule
  // Grumpos's flex takes via clapFront, as a per-frame flag.
  let armOverHead = false;
  // The held prop alone paints after the head: a drawn bow's arrow crosses
  // the neck on the high frames of the draw, and under the head it looked
  // threaded through it. The arm itself keeps its ordinary depth.
  let propOverHead = false;
  // The bow arm crosses the body to reach the grip, so it belongs IN FRONT of
  // the torso like the drawing arm. Behind it, all you saw at the grip was the
  // gold wrap — a round, hand-sized blob with no arm attached to it, which is
  // the "second hand" the bake-off kept reporting.
  let bowArmFront = false;
  // The held bow is behind the body (reach and sling): paint it in the back
  // pass rather than over the head.
  let propBehind = false;
  // The angle the worn wrench is lying at, while the reach still has hold of
  // it. The held prop turns FROM this to the throw's own line: without it the
  // tool snapped to the arm's angle on the first frame of the fetch and, on the
  // back-hip carry, snapped straight into the body and vanished behind it.
  let wrenchCarryAng = null;
  // The sidearm's angle while it is OUT of the holster, or null while it is in
  // one. Same arrangement as wrenchAngle: the prop rides the hand, and this is
  // the only thing the pose has to say about it. `pistolAngleB` is the off
  // hand's, for a hero who carries two — it is a separate variable rather than
  // a flag because the two hands are drawn in different PASSES (the far arm
  // goes down behind the torso, the near one over it), so each has to be able
  // to arm its own prop where its own limb lands.
  let pistolAngle = null, pistolAngleB = null;
  // RUSTY'S THROW — the one and only. Four beats over the 0.3s ability window
  // (`throwQ` is actionTime / 0.3; an unclocked caller such as the title parade
  // gets the READ frame, mid-whip, rather than frame zero of a reach):
  //   REACH    0.00-0.30  near hand from wherever the gait had it to the pouch
  //   PULL     0.30-0.50  cane out, hand up to the cock beside the head
  //   WHIP     0.50-0.66  forward across the face; RELEASE at 0.66
  //   THROUGH  0.66-1.00  arm settles down-forward and rejoins the gait
  // The cane is IN HAND from the pull to the release and nowhere else. After
  // release `pose.axeThrown` (run.js's flag for the returning weapon) is the
  // authority for the empty hand and the empty pouch slot, because the flight
  // outlasts this window by a second. run.js should spawn the projectile at
  // the release — 0.2s into the pose — not on the frame the ability fires.
  const throwQ = spec.bundle && pose.menuAction === 'aim'
    ? (pose.actionTime == null ? 0.6 : Math.max(0, Math.min(1, Number(pose.actionTime) / 0.3)))
    : -1;
  const T_REACH = 0.3, T_PULL = 0.5, T_RELEASE = 0.66;
  const caneInHand = throwQ >= T_REACH && throwQ < T_RELEASE && !pose.axeThrown;
  // The carried-cane hero (`stick`, no bundle) only ever loses it to the air.
  const stickThrown = spec.stick && pose.axeThrown;
  // Legacy alias for the carried stick's swing; the bundle throw has its own.
  const stickQ = throwQ < 0 ? 0 : throwQ;
  // The cane's angle in the hand through the throw: pulled up out of the pouch
  // roughly vertical, laid back over the shoulder at the cock, then swung to
  // the throw line by release — so it leaves along the arm rather than across
  // it. One smooth curve, sampled by the same beats the arm uses.
  const throwStickAngle = throwQ < T_PULL
    ? -0.5 - 0.9 * Math.max(0, (throwQ - T_REACH) / (T_PULL - T_REACH))   // -0.5 -> -1.4
    : -1.4 + 1.9 * Math.min(1, (throwQ - T_PULL) / (T_RELEASE - T_PULL)); // -1.4 -> +0.5
  // CARRIED DOWN AT HIS SIDE, like a relay baton, and swung UP to the throw
  // line as the arm comes through. Down is not a style choice: a STANDING pose
  // draws the front arm BEHIND the torso, so anything angled up or across from
  // that hand is inside the body. Measured over a sweep of rest angles on the
  // idle pose, visible cane pixels ran 23 at -0.35 and 54 at -0.85 against ~200
  // pointing down — a green sliver at the hip versus a stick you can see him
  // carrying.
  //
  // CELEBRATION RAISES IT. The spread arms go up and out, and a cane still at
  // the carry angle points at the floor off an arm reaching for the ceiling —
  // the prop contradicting the pose. Held aloft it continues the arm's line.
  const stickCarry = spec.stickRest == null ? 1.05 : spec.stickRest;
  const stickAngle = pose.kind === 'celebrate' ? -0.95 : stickCarry - stickQ * 1.5;
  // Where the ki ball sits and how far into its throw it is, as [x, y, grow, q],
  // or null when she is not throwing one.
  let kiBlast = null;
  // Where Fernwick's shield rides while the victory routine has it off her
  // back, as [x, y]. Null the rest of the time, which is also the flag the
  // back-slung disc and the draw order below both test.
  let celShield = null;
  if (pose.kind === 'celebrate') {
    // Victory choreography, one flavor per hero.
    const ct = pose.time || 0;
    const pump = Math.sin(ct * 6) * 0.05 * u;
    // A hand at FULL reach on a line `deg` above horizontal, thrown outward
    // from its own shoulder. reach() does the same job from an x/y target, but
    // a pose written as "arms out at this angle" says so directly, and the
    // angle is the thing being animated in the arms-out routines below.
    const armSpoke = (sh, side, deg) => {
      const a = deg * Math.PI / 180, r = armSeg + armSegF;
      return [sh + side * Math.cos(a) * r, armY - Math.sin(a) * r];
    };
    // Reworked raised-arm routines for the two characters whose hands crowded
    // the head. `legacy` remains selectable in the gallery through the shared
    // celebration-style switch above.
    const raisedArmStudy = reworkedCelebration;
    if (id === 'fernwick' && raisedArmStudy) {
      // SHIELD UP. The "champion's clasp" this replaces met both hands at
      // x = ±0.05u and 0.95 of the arm overhead, which on this rig is dead
      // centre of her own face: the shoulder sits at -0.5u with 0.286u of
      // reach, so a hand tops out at -0.786u while her crown is at -0.97u.
      // NO overhead clasp can clear the head here — it was never a matter of
      // dialling the target — and both forearms crossed her eyes for the
      // 1.56s the signature holds. So the near arm throws the SHIELD up and
      // out at full extension instead, where the whole disc reads against the
      // background, and the far fist pumps outboard of the cap.
      // GATED ON THE HERO, NOT ON THE PROP. This used to require
      // `spec.back === 'shield'`, and her bow rework changed that back to a
      // QUIVER — so the whole reworked routine switched itself off and she
      // silently fell through to the legacy champion's clasp below, which is
      // the exact pose this branch was written to replace. Both elbows bend
      // INWARD there (elbF = sideF), which on a target this close to overhead
      // folds the joints in on themselves over her own face: the "elbows going
      // in on themselves" read, held for the 1.56s the signature lasts.
      //
      // The arms-out solution never depended on the shield; only the prop
      // hand-off did, and that is now conditional.
      handF = reach(shF, armY, [shF + sideF * 0.3 * u, armY - armL * 0.72 + pump]);
      elbF = -sideF;
      handB = reach(shB, armY, [shB + sideB * 0.26 * u, armY - armL * 0.62 - pump * 0.5]);
      elbB = -sideB;
      if (spec.back === 'shield') {
        // The prop rides the gripping hand, so it can never drift off it — but
        // a LITTLE past the fist, along the arm's own axis. Centred exactly on
        // the hand a 0.15u disc swallows the whole forearm, and what is left
        // reads as a gong hanging in the air beside her rather than a shield
        // she is holding.
        const gripX = handF[0] - shF, gripY = handF[1] - armY;
        const gripLen = Math.hypot(gripX, gripY) || 1;
        celShield = [
          handF[0] + (gripX / gripLen) * 0.055 * u,
          handF[1] + (gripY / gripLen) * 0.055 * u,
        ];
      }
    } else if (id === 'gnash' && raisedArmStudy) {
      // The point throws OUT as well as up. Aimed 0.12u out and 0.98 of the
      // arm up, his fist landed at |x| = 0.21u — exactly his own head radius —
      // so the entire raised arm hid behind the skull and only a blue nub
      // cleared the quills: a shoulder with nothing on the end of it. Taken to
      // full reach on a line 55 degrees off horizontal the fist sits 0.04u
      // outboard of the head and the limb reads as one straight point.
      handF = reach(shF, armY, [shF + sideF * 0.16 * u, armY - armL * 0.91 + pump]);
      elbF = -sideF;
      // ...and the free hand HANGS AT HIS SIDE, on Gary's target rather than a
      // hand-on-hip. The hip version parked the upper arm flat across the
      // shoulder girdle, which is the pose that put a joint on show up there —
      // a limb doubled back over its own socket is the hardest thing on this
      // rig to make read, and the easiest fix is not to ask it to. Gary's
      // overhead wave has always had the quieter free arm; borrowing it makes
      // the two celebrations rhyme, which is what Peter asked for.
      handB = [shB + sideB * 0.04 * u, armY + armL * 0.5]; elbB = sideB;
    } else if (id === 'gnash') {
      // one cool point at the sky, the other hand on the hip
      handF = [shF + sideF * 0.12 * u, armY - armL * 0.98 + pump]; elbF = sideF;
      handB = [shB + sideB * 0.13 * u, armY + armL * 0.4]; elbB = sideB;
    } else if (id === 'grumpos') {
      // Arms flung out wide and dead STRAIGHT — a strongman's "behold" spread,
      // rising and settling on the pump. Straight matters: bent, the inverted
      // elbows this pose used to carry read as arms broken backwards at menu
      // scale. The reach() targets sit at full extension so the IK never puts
      // a visible joint in either arm; the flex big-move still bends them.
      handF = reach(shF, armY, [shF + sideF * 0.3 * u, armY - armL * 0.3 + pump]); elbF = sideF;
      handB = reach(shB, armY, [shB + sideB * 0.3 * u, armY - armL * 0.3 - pump]); elbB = sideB;
    } else if (id === 'gary') {
      // a big overhead wave; the other hand stays professionally at his side
      if (raisedArmStudy) {
        // Keep the shoulder quiet and describe a small arc with the hand. The
        // outward elbow gives the raised arm a readable gap beside the head;
        // the old target swept 0.22u sideways and pulled the whole limb across
        // Gary's face like a windscreen wiper.
        const wave = Math.sin(ct * 8);
        handF = [shF + sideF * (0.22 + wave * 0.025) * u,
          armY - armL * (0.8 + wave * 0.055)]; elbF = -sideF;
      } else {
        handF = [shF + sideF * (0.08 * u + Math.sin(ct * 8) * 0.11 * u), armY - armL * 0.95]; elbF = sideF;
      }
      handB = [shB + sideB * 0.04 * u, armY + armL * 0.5]; elbB = sideB;
    } else if (id === 'dolores' && raisedArmStudy) {
      // Her signature stance, made celebratory: both hands planted on the hips,
      // elbows winged, with a small proud press on the pump. The 'hips' big move
      // holds the same shape, so it reads as a satisfied "there" throughout.
      const hipX = torsoHalf * 0.95, hipY = armY + armL * 0.70 - Math.abs(pump) * 0.5;
      handF = [shoulderCx + sideF * hipX, hipY]; elbF = sideF;
      handB = [shoulderCx + sideB * hipX, hipY]; elbB = sideB;
    } else if (id === 'lorenzo' && raisedArmStudy) {
      // Separate the fists from the cap and bend the elbows OUTWARD. Besides
      // preserving the face silhouette, the wider targets stop the elbows
      // folding inward as the hop squashes the body underneath them.
      handF = [shF + sideF * 0.2 * u, armY - armL * 0.8 + pump * 0.45]; elbF = -sideF;
      handB = [shB + sideB * 0.2 * u, armY - armL * 0.8 - pump * 0.45]; elbB = -sideB;
    } else if (id === 'clara' && raisedArmStudy) {
      // ARMS OUT, NOT BEHIND THE HEAD. She was falling through to the shared
      // double fist pump below, which throws both hands to |x| = 0.15u at 0.9
      // of the arm overhead. On this rig that is INSIDE her own silhouette —
      // the skull is wider than the target and the braid widens it again — so
      // both arms disappeared behind the head and the celebration played with
      // no arms in it at all. Same fault Kiko's salute was written to fix, and
      // it is not a matter of dialling the target: nothing overhead clears
      // this head. So the arms go OUT instead, at full reach on a line about
      // 40 degrees above horizontal, where both hands clear the head either
      // side and the whole limb reads against the background. The pump
      // alternates them, so the signature is already half a dance before the
      // big move takes over.
      //
      // Aimed by ANGLE rather than by an x/y target, because everything about
      // this routine is the ANGLE the arm makes: her reach is 0.26u and her
      // head is wider than that, so a target written in u has almost no
      // vertical range left once it is pushed far enough out to clear the
      // skull, and the swing below flattens to nothing. A spoke at full reach
      // has the whole quadrant to move in.
      const swing = pump / (0.05 * u);          // -1..1, the shared pump beat
      handF = armSpoke(shF, sideF, 42 + swing * 9); elbF = -sideF;
      handB = armSpoke(shB, sideB, 42 - swing * 9); elbB = -sideB;
    } else if (id === 'kiko') {
      // THE SALUTE. Both hands come together in front of the chest — a closed
      // hand met by an open one, elbows winged out — and hold there, breathing
      // on the pump. This is a martial artist's courtesy at the end of a bout,
      // and it is the only celebration in the set that is a POSTURE rather than
      // a wiggle, which is the whole point of her: everyone else is delighted
      // and she is signing off.
      //
      // It replaces the generic double fist pump she was falling through to,
      // which threw both fists up beside her head — and on a hero whose head
      // already carries two outboard buns and two ribbons, arms up there is the
      // one place they cannot go. It read as hands stuck behind her head.
      const meetY = armY + armL * (0.34 - 0.03 * (pump / (0.05 * u)));
      handF = [shoulderCx + 0.055 * u, meetY]; elbF = sideF;
      handB = [shoulderCx - 0.02 * u, meetY + 0.012 * u]; elbB = sideB;
    } else if (spec.celebrate === 'spread') {
      // Gated on the SPEC, not on cm.move: during the signature half of the
      // cycle celebrateMotion has not chosen a move yet (cm.move is null until
      // the big beat), so a cm.move test here never fired and the pump ran
      // anyway — the exact case this branch exists to replace.
      // SPREAD OWNS THE WHOLE CYCLE, not just the big beat. The generic
      // signature below is a double fist pump — hands up beside the ears —
      // and it runs for the first half of every celebration before the move
      // takes over, which left a hero who asked for wide arms with wide arms
      // less than half the time. Same spoke as the big-beat branch, alternating
      // on the shared pump so the pair rocks rather than freezes.
      const swing = pump / (0.05 * u);
      handF = armSpoke(shF, sideF, 24 + swing * 8); elbF = -sideF;
      handB = armSpoke(shB, sideB, 24 - swing * 8); elbB = -sideB;
    } else {
      // double fist pump, alternating (lorenzo mid-hop, b33p's free arm)
      handF = [shF + sideF * 0.15 * u, armY - armL * 0.9 + pump]; elbF = sideF;
      handB = [shB + sideB * 0.15 * u, armY - armL * 0.9 - pump]; elbB = sideB;
    }
    // On the big beat the signature gives way to the move: arms fly out for a
    // turn, sweep low for a bow, swing loose for a shimmy, punch up on a hop.
    if (cm.move === 'spin') {
      handF = [shF + sideF * 0.3 * u, armY - armL * 0.25]; elbF = sideF;
      handB = [shB + sideB * 0.3 * u, armY - armL * 0.25]; elbB = sideB;
    } else if (cm.move === 'hips') {
      const hipX = torsoHalf * 0.95, hipY = armY + armL * 0.70;
      handF = [shoulderCx + sideF * hipX, hipY]; elbF = sideF;
      handB = [shoulderCx + sideB * hipX, hipY]; elbB = sideB;
    } else if (cm.move === 'bow' && id === 'kiko') {
      // Her bow keeps the salute: the hands stay met and travel DOWN with the
      // body rather than sweeping out to the sides. A bow that opens its arms
      // is a stage bow; this one is the courtesy she started in.
      const bowY = armY + armL * (0.34 + 0.16 * (cm.squash || 0) * 3);
      handF = [shoulderCx + 0.055 * u, bowY]; elbF = sideF;
      handB = [shoulderCx - 0.02 * u, bowY + 0.012 * u]; elbB = sideB;
    } else if (cm.move === 'bow') {
      handF = [shF + sideF * 0.18 * u, armY + armL * 0.75]; elbF = sideF;
      handB = [shB + sideB * 0.22 * u, armY + armL * 0.55]; elbB = sideB;
    } else if (cm.move === 'shimmy') {
      const sw = Math.sin(cm.q * Math.PI * 8) * 0.14 * u * sideF;
      handF = [shF + sideF * 0.14 * u + sw, armY - armL * 0.55]; elbF = sideF;
      handB = [shB + sideB * 0.14 * u + sw, armY - armL * 0.55]; elbB = sideB;
    } else if (cm.move === 'hop') {
      if (id === 'lorenzo' && raisedArmStudy) {
        // The big hop keeps the same wider silhouette as the signature pumps,
        // rather than snapping both fists back above the crown on its last beat.
        handF = [shF + sideF * 0.21 * u, armY - armL * 0.86]; elbF = -sideF;
        handB = [shB + sideB * 0.21 * u, armY - armL * 0.86]; elbB = -sideB;
      } else {
        handF = [shF + sideF * 0.1 * u, armY - armL * 1.05]; elbF = sideF;
        handB = [shB + sideB * 0.1 * u, armY - armL * 1.05]; elbB = sideB;
      }
    } else if (cm.move === 'present') {
      // The raised shield comes DOWN and is planted in front of him. Blended
      // in over the first third of the beat and back out over the last sixth,
      // so the disc travels an arc between the two halves of the routine
      // instead of teleporting: the first pass cut straight to a static hold
      // with both hands parked near his hips, which is why the prop read as a
      // dinner plate glued to his tunic rather than as something he is holding.
      const ease = (v) => { const n = Math.max(0, Math.min(1, v)); return n * n * (3 - 2 * n); };
      const down = ease(cm.q / 0.34) * (1 - ease((cm.q - 0.72) / 0.28));
      const toward = (from, to) => [
        from[0] + (to[0] - from[0]) * down,
        from[1] + (to[1] - from[1]) * down,
      ];
      // A shallow settle as the arms take the weight, then it rises into the
      // hold — the beat that stops the plant reading as a hard cut.
      const settle = Math.sin(Math.min(1, cm.q / 0.34) * Math.PI) * 0.025 * u;
      // Held over the CHEST, not the belt: the first pass planted it at
      // shoulderY + 0.2u, which hung the bottom half of the disc below his
      // tunic hem and read as a shield slung on his hip.
      const shieldAt = [sideF * 0.02 * u, shoulderY + 0.16 * u + settle];
      // The grip sits out at the RIM rather than at the boss. Gripped dead
      // centre, a 0.15u disc covers the entire near arm — shoulder, elbow and
      // all — and the shield reads as stuck to his chest with nothing holding
      // it. Out here the elbow clears the rim and there is a visible arm.
      const plantF = [sideF * 0.15 * u, shoulderY + 0.19 * u + settle];
      // The free arm punches UP rather than joining the shield. Both hands on
      // the disc cannot work on this rig: the far shoulder sits barely 0.03u
      // off the rim at chest height, so any rim target folds that arm shut and
      // lays the forearm flat across the shield face.
      const plantB = reach(shB, armY, [shB + sideB * 0.22 * u, armY - armL * 0.8]);
      if (celShield) celShield = toward(celShield, shieldAt);
      handF = toward(handF, plantF);
      handB = toward(handB, plantB);
      // The near arm swaps to the downward bend convention, which it can do
      // without a pop because the raised target it leaves is at full extension
      // — straight, so the sign is invisible there. The raised arm keeps its
      // own sign the whole way through.
      elbF = sideF;
    } else if (cm.move === 'stepturn') {
      // The turn used to carry NO arm choreography — both arms simply held
      // their signature targets while the body yawed, so the step read as the
      // rig being rotated rather than as him swinging round. The raised arm
      // sweeps down and out through the turn and comes back up out of it,
      // while the planted hand stays on the hip: that contrast is what sells a
      // step-turn instead of a spin. Both ends of the sweep are at full reach,
      // so the arm stays straight and needs no elbow-sign change.
      const sweep = Math.sin(cm.q * Math.PI);
      const low = reach(shF, armY, [shF + sideF * 0.34 * u, armY + armL * 0.22]);
      handF = [handF[0] + (low[0] - handF[0]) * sweep, handF[1] + (low[1] - handF[1]) * sweep];
    } else if (cm.move === 'spread') {
      // ARMS FLUNG WIDE — the star. Both at full reach on armSpoke, about 50
      // degrees above the shoulder line, which is high enough to read as
      // triumph and low enough that neither hand crosses the head (the fault
      // that sank Clara's overhead hop). They pump on the hop's own bounce so
      // the reach breathes with the body instead of freezing while it bounds.
      // Elbows bent OUTWARD, as twostep's are, so nothing folds across the face.
      // 22-36 degrees, not 50-64: armSpoke measures from the shoulder LINE,
      // so 50 was already most of the way to overhead and the pair read as
      // "up", not "out". Wide lives just above horizontal.
      const bounce = Math.abs(Math.sin(cm.q * Math.PI * 2));
      handF = armSpoke(shF, sideF, 22 + bounce * 14); elbF = -sideF;
      handB = armSpoke(shB, sideB, 22 + bounce * 14); elbB = -sideB;
    } else if (cm.move === 'twostep') {
      // The arms ride the sway: one goes up and out as the other drops, then
      // they swap on the return step. Both stay outboard at full reach for the
      // whole beat — the point of her routine is that a hand never goes back
      // over the head — so the swing is entirely in HEIGHT, and the elbows
      // keep the signature's outward bend so nothing folds across her face.
      const sway = Math.sin(cm.q * Math.PI * 2);
      handF = armSpoke(shF, sideF, 40 + sway * 20); elbF = -sideF;
      handB = armSpoke(shB, sideB, 40 - sway * 20); elbB = -sideB;
    } else if (cm.move === 'salute') {
      // B-33P's cannon owns the near arm; park the free fist high and still so
      // the upward barrel and antenna broadcast are the animation, not a shimmy.
      handB = [shB + sideB * 0.12 * u, armY - armL * 0.52]; elbB = -sideB;
    } else if (cm.move === 'flex') {
      // Two poses hit and held: a wider double-biceps, then most-muscular
      // with the fists dragged low and together in front.
      if (cm.q < 0.5) {
        // Fists up just inside the shoulders, elbows bent OUTWARD (-/+).
        // joint()'s "dir +1 bends toward +x" only holds for a limb pointing
        // DOWN; the bend axis flips with the limb, so on a target this close
        // to overhead the +/- pair folds both joints IN — elbows meeting on
        // his sternum with the forearms crossed over his own beard, which is
        // a flinch, not a pose. Negated, they swing wide of the fists and the
        // arms frame the head: the double-biceps shape this beat is after.
        // Same convention, same reason, as the menu 'flex' curl below.
        handF = [shF - sideF * 0.04 * u, armY - armL * 0.72]; elbF = -sideF;
        handB = [shB - sideB * 0.04 * u, armY - armL * 0.72]; elbB = -sideB;
      } else {
        handF = [sideF * 0.07 * u, armY + armL * 0.52]; elbF = sideF;
        handB = [sideB * 0.07 * u, armY + armL * 0.52]; elbB = sideB;
      }
    }

    if (id === 'grumpos' && raisedArmStudy) {
      // Three-beat candidate across the FULL celebration cycle, not crammed
      // into the final 1.04s big-move window: overhead flex, classic horizontal
      // double-biceps, then the compact most-muscular squeeze in front. The
      // middle pose gets the longest hold. Each elbow-direction change happens
      // only while the arm is at full reach, where the two-bone solution is
      // straight and the sign cannot create a visible pop.
      const mix = (a, b, v) => a + (b - a) * v;
      const smooth = (v) => {
        const n = Math.max(0, Math.min(1, v));
        return n * n * (3 - 2 * n);
      };
      const between = (a, b, v) => [mix(a[0], b[0], v), mix(a[1], b[1], v)];
      const curve = (a, control, b, v) => {
        const iv = 1 - v;
        return [
          iv * iv * a[0] + 2 * iv * v * control[0] + v * v * b[0],
          iv * iv * a[1] + 2 * iv * v * control[1] + v * v * b[1],
        ];
      };
      const wideF = reach(shF, armY, [shF + sideF * 0.3 * u, armY - armL * 0.3]);
      const wideB = reach(shB, armY, [shB + sideB * 0.3 * u, armY - armL * 0.3]);
      const overheadF = [shF - sideF * 0.04 * u, armY - armL * 0.72];
      const overheadB = [shB - sideB * 0.04 * u, armY - armL * 0.72];
      // Keep the upper arms level but pull the fists back toward the temples.
      // At the old 0.20u-out / 0.45-arm-up target the two bones met at almost
      // exactly 90 degrees — two sideways Ls. The shorter shoulder-to-fist
      // chord below closes the elbow into a visibly harder, acute contraction.
      const levelF = [shF + sideF * 0.09 * u, armY - armL * 0.36];
      const levelB = [shB + sideB * 0.09 * u, armY - armL * 0.36];
      // Opening the fists slightly outward on the way down lets the shoulders
      // unfold before the hard curl. A direct line from overhead to level made
      // the IK elbow scissor inward, then reverse at the last instant.
      const curlArcF = [shF + sideF * 0.19 * u, armY - armL * 0.58];
      const curlArcB = [shB + sideB * 0.19 * u, armY - armL * 0.58];
      const resetF = reach(shF, armY, [shF + sideF * 0.32 * u, armY + armL * 0.04]);
      const resetB = reach(shB, armY, [shB + sideB * 0.32 * u, armY + armL * 0.04]);
      const frontF = [sideF * 0.07 * u, armY + armL * 0.52];
      const frontB = [sideB * 0.07 * u, armY + armL * 0.52];
      const c = cm.cycle;
      if (c < 0.031) {
        // The overhead shape is a quick opening accent, not the pose to read.
        const v = smooth(c / 0.031);
        handF = between(wideF, overheadF, v); handB = between(wideB, overheadB, v);
        elbF = -sideF; elbB = -sideB;
      } else if (c < 0.058) {
        handF = overheadF; handB = overheadB; elbF = -sideF; elbB = -sideB;
      } else if (c < 0.138) {
        const v = smooth((c - 0.058) / 0.08);
        handF = curve(overheadF, curlArcF, levelF, v);
        handB = curve(overheadB, curlArcB, levelB, v);
        elbF = -sideF; elbB = -sideB;
      } else if (c < 0.49) {
        // 0.352 of the 3.4s candidate cycle = ~1.2s. The final front flex gets
        // the exact same span below, so neither hero pose is treated as filler.
        handF = levelF; handB = levelB; elbF = -sideF; elbB = -sideB;
      } else if (c < 0.547) {
        const v = smooth((c - 0.49) / 0.057);
        handF = between(levelF, resetF, v); handB = between(levelB, resetB, v);
        elbF = -sideF; elbB = -sideB;
      } else if (c < 0.604) {
        const v = smooth((c - 0.547) / 0.057);
        handF = between(resetF, frontF, v); handB = between(resetB, frontB, v);
        elbF = sideF; elbB = sideB;
      } else if (c < 0.956) {
        // Same ~1.2s hold as the horizontal double-biceps pose above.
        handF = frontF; handB = frontB; elbF = sideF; elbB = sideB;
      } else {
        const v = smooth((c - 0.956) / 0.044);
        handF = between(frontF, wideF, v); handB = between(frontB, wideB, v);
        elbF = sideF; elbB = sideB;
      }
    }
  } else if (pose.menuAction === 'wave') {
    // Compact title/cameo wave, matched to Gary's approved celebration wave.
    // A small wrist arc and outward elbow leave a clean gap beside the head;
    // the former fully-extended sweep read as a stiff semaphore at 36px.
    const wvt = Math.sin((pose.time || 0) * 8);
    handF = [shF + sideF * (0.22 + 0.025 * wvt) * u,
      armY - armL * (0.8 + 0.055 * wvt)]; elbF = -sideF;
    handB = [shB + sideB * 0.03 * u, armY + armL * 0.8]; elbB = sideB;
  } else if (pose.menuAction === 'flex') {
    // Posing reps on a loop: arms flung out dead straight, held — then the
    // fists snap up into the curl, held — then back out. The two ends are the
    // interesting shapes, so the clock spends its time AT them (fw is a
    // plateaued wave, not a sine): a continuous swing reads as jumping jacks,
    // not posing. Elbows bend DOWNWARD in the curl (front -1, back +1); for
    // an up-out target the IK's bend axis tilts, and +/- dirs would throw the
    // joints up-inward — the backwards-elbow look. At full spread the arms
    // are straight, so the dirs never show there.
    // flexHold pins the rep at the curl and never opens it. The spread half of
    // the cycle throws his fists a full body-width out to either side, which is
    // fine alone on a menu and impossible in a line-up: in the intro row it put
    // one blade through raymn and the other off the side of the screen. The
    // curl is the half that reads as flexing anyway — arms out straight is just
    // a man measuring a fish.
    const fx = ((pose.time || 0) * 0.8) % 1;
    const fw = pose.flexHold ? 1
      : fx < 0.4 ? 0 : fx < 0.5 ? (fx - 0.4) * 10 : fx < 0.9 ? 1 : 1 - (fx - 0.9) * 10;
    const sF = reach(shF, armY, [shF + sideF * 0.3 * u, armY - armL * 0.25]);
    const sB = reach(shB, armY, [shB + sideB * 0.3 * u, armY - armL * 0.25]);
    handF = [sF[0] + (shF + sideF * 0.2 * u - sF[0]) * fw, sF[1] + (armY - armL * 0.45 - sF[1]) * fw]; elbF = -sideF;
    handB = [sB[0] + (shB + sideB * 0.2 * u - sB[0]) * fw, sB[1] + (armY - armL * 0.45 - sB[1]) * fw]; elbB = -sideB;
  } else if (id === 'lorenzo' && pose.menuAction === 'smash') {
    // A compact three-beat working swing: pull the tool up, snap it through the
    // target, then settle. `actionTime` starts at zero when useAbility fires,
    // so this is deterministic and completes inside its 0.3s pose budget.
    const q = Math.max(0, Math.min(1, (pose.actionTime || 0) / 0.3));
    const ease = (v) => v * v * (3 - 2 * v);
    const mix = (a, b, v) => a + (b - a) * v;
    const rest = [shF + 0.02 * u, armY + 0.48 * armL];
    const wind = [shF - 0.07 * u, armY - 0.9 * armL];
    const hit = [shF + 0.24 * u, armY + 0.62 * armL];
    if (q < 0.3) {
      const v = ease(q / 0.3);
      handF = [mix(rest[0], wind[0], v), mix(rest[1], wind[1], v)];
      wrenchAngle = mix(0.2, -1.72, v);
    } else if (q < 0.66) {
      const v = ease((q - 0.3) / 0.36);
      handF = [mix(wind[0], hit[0], v), mix(wind[1], hit[1], v)];
      wrenchAngle = mix(-1.72, 0.58, v);
    } else {
      const v = ease((q - 0.66) / 0.34);
      handF = [mix(hit[0], rest[0], v), mix(hit[1], rest[1], v)];
      wrenchAngle = mix(0.58, 0.2, v);
    }
    elbF = sideF;
    // The free hand braces across the body instead of continuing its run pump.
    handB = [shB - sideB * 0.03 * u, armY + armL * 0.42]; elbB = sideB;
  } else if (spec.kiblast && pose.menuAction === 'aim') {
    // KIKOKEN. A projectile like B-33P's, so it lands on the same `shoot`
    // ability and the same 0.3s pose budget — but the weapon is her, so the
    // whole beat is in the ARMS rather than in a prop: chamber at the hip,
    // thrust, and the ball leaves the palms.
    //
    // Three beats inside the 0.3s, because a thrust with no wind-up is just an
    // arm that teleported forward. The chamber is short and the thrust is
    // fast; the rest of the window is the hold, which is the frame that reads.
    // No `actionTime` means "show me the move", not "show me frame zero of it".
    // The title parade and the transition cameo both ask for `aim` and neither
    // runs a clock, so `|| 0` froze her at the CHAMBER — hands still down at the
    // hip, no orb — and the far arm reached across her body to get there, which
    // is what read as her rear arm pointing the wrong way. B-33P's cannon
    // already takes this convention for the same reason (see `aimAmount`).
    const q = pose.actionTime == null
      ? 1
      : Math.max(0, Math.min(1, Number(pose.actionTime) / 0.3));
    const ease = (v) => v * v * (3 - 2 * v);
    const chamber = [shF - 0.09 * u, armY + armL * 0.62];
    // Pressed to the END of the arm, not to a point 0.28u away. Standing, both
    // arms paint behind the torso, so the only part of this pose a player ever
    // sees is whatever clears the silhouette — and 0.28u was inside her reach,
    // so the IK spent the remainder on a bent elbow and kept the hand tucked
    // near the dress. Straight and fully extended is the most forearm this rig
    // can put outside her, which is what the transition cameo (holding the
    // finished press, `actionTime` unset) needs to read as arms at all.
    const thrust = reach(shF, armY, [shF + 0.3 * u, armY + 0.05 * u]);
    const v = q < 0.3 ? 0 : q < 0.52 ? ease((q - 0.3) / 0.22) : 1;
    // Both palms travel together and land a hair apart — the two-handed press
    // is the signature, and hands at different heights read as a punch.
    handF = [chamber[0] + (thrust[0] - chamber[0]) * v, chamber[1] + (thrust[1] - chamber[1]) * v];
    handB = [handF[0] - 0.05 * u, handF[1] + 0.06 * u];
    elbF = -1; elbB = -1;
    // The NEAR arm paints in front of the torso; the far one stays behind it,
    // which is the ordinary depth split every running frame already uses. A
    // standing pose normally puts BOTH arms behind — right for arms at rest, and
    // impossible here: her whole reach is barely longer than the dress is wide,
    // so the press showed one glove at the hem and a ball of light with nothing
    // holding it, which is the transition cameo's "where are her arms" read.
    // Both in front is the other wrong answer — two limbs laid over the dress
    // with no depth between them, and one of her two puffed sleeves stranded on
    // her chest. One in front, one behind is what a body doing this looks like.
    armsReachFront = true;
    // The orb is born at the palms and swells as they arrive, so the energy
    // reads as pushed out of her rather than as an object she was holding.
    //
    // Seated BEYOND the palms rather than on them. Its body disc alone is 0.17u
    // across at full size, so centred 0.05u off the hand it swallowed both the
    // glove and most of the forearm — the arm was drawn, and then the light was
    // painted over it. Pushed out by its own radius the hands sit at its inboard
    // edge, which is also the truer read: she is pressing the thing, not holding
    // it. Scaled by `grow` so the orb still hatches AT the palms and travels out
    // as it swells, instead of starting a fifth of a unit away from her hands.
    if (v > 0.02) kiBlast = [handF[0] + (0.05 + 0.13 * v) * u, handF[1] - 0.01 * u, v, q];
  } else if (spec.pistol && pose.menuAction === 'aim') {
    // The shot. B-33P's version of this is a whole articulated gun-ARM, which
    // is his character; hers is a hand holding a thing, so it is posed the way
    // the wrench swing is — hand targets on the shared IK, prop angle beside
    // them — and never as a special-cased limb.
    //
    // The arm goes out along the direction of TRAVEL rather than out to the
    // near side. A runner shoots at what is coming, and +x is the only forward
    // this rig has: aimed off sideF the muzzle points at whichever shoulder the
    // depth rig happened to put in front, which is a different pose on every
    // frame the body turns.
    const q = Math.max(0, Math.min(1, (pose.actionTime || 0) / 0.3));
    // Recoil, on the same 0.3s budget useAbility() gives the pose. It kicks the
    // muzzle up and the hand back and recovers over the first third — the shot
    // has already left by then, so what is left to read is the arm settling.
    const kick = Math.max(0, 1 - q / 0.34);
    // In and DOWN from the shoulder line. Reaching dead level at full stretch,
    // arm and barrel lie on one axis and the elbow disappears — the pose loses
    // the bend that says a person is holding this.
    handF = [shF + (0.27 - 0.04 * kick) * u, armY + (0.055 + 0.035 * kick) * u];
    // Elbow DOWN, not up: for a level reach along +x the IK's other solution
    // puts the joint above the shoulder, which is the chicken wing.
    elbF = -1;
    pistolAngle = -0.1 - 0.42 * kick;
    if (spec.pistol === 'twin') {
      // Both barrels. The off hand reaches SHORTER and lower — matched, the two
      // arms overlap into one thick limb with two guns growing out of the end
      // of it, and the whole point of carrying two is that you can see two.
      // It also recoils on its own beat, a hair behind the near one, so the
      // pair reads as two shots rather than one wide one.
      const kickB = Math.max(0, 1 - Math.max(0, q - 0.08) / 0.34);
      handB = [shB + (0.2 - 0.035 * kickB) * u, armY + (0.14 + 0.03 * kickB) * u];
      elbB = -1;
      pistolAngleB = -0.06 - 0.38 * kickB;
    } else {
      // The free hand comes across the body to brace, rather than carrying on
      // with its half of the run pump. Two arms doing unrelated things is what
      // made every early cut of this read as "jogging while holding a gun".
      handB = [shB + 0.12 * u, armY + armL * 0.34]; elbB = sideB;
    }
    // Same call Kiko's ki-press makes above, and for the same reason: a
    // STANDING pose puts both arms behind the body, which is right for arms at
    // rest and wrong for a draw. On the transition cameo it hid both of them —
    // she stood there with two pistols and no visible arms, the guns floating
    // clear of a silhouette they were not attached to. `armsReachFront` is the
    // ordinary depth split, not both arms forward: the far arm stays behind the
    // torso and the near one comes over it, so the pair still reads as two arms
    // at two depths. Running, this is already what happens and the flag is
    // ignored — only `stand` consults it.
    armsReachFront = true;
  } else if ((RANGED_GESTURES[spec.ranged] || spec.throwStyle) && pose.menuAction === 'aim') {
    // RANGED BAKE-OFF (lab). The gestures no shipped hero has: a bow draw (and
    // the slingshot's), a hose braced in both hands, and — round 2 — the
    // wrench throw in four styles, because the shipped overarm pitch cocks
    // the hand BEHIND the head, where it and the tool disappear. Same 0.3s
    // budget and the same `actionTime == null` convention as every other aim.
    // A CARRIED wrench costs a reach before any of this starts, exactly as the
    // bow does, so the whole 0.3s gesture slides back by it. Every hero without
    // `wrenchCarry` (Fernwick included) gets reachT 0 and the identical clock.
    const carried = !!spec.wrenchCarry;
    const reachT = carried ? WRENCH_REACH_T : 0;
    const q = pose.actionTime == null ? 0.62
      : Math.max(0, Math.min(1, (Number(pose.actionTime) - reachT) / 0.3));
    const ease = (v) => v * v * (3 - 2 * v);
    const lerp2 = (a, b, v) => [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v];
    const g = spec.throwStyle ? 'throw' : RANGED_GESTURES[spec.ranged];
    if (g === 'draw') {
      // THE DRAW. Bow hand (far) out along +x at shoulder height, string hand
      // (near) from the grip back to the anchor under the jaw, let go at the
      // style's release, then a small recoil: the string hand flicks back and
      // the bow hand rocks forward. Anchor at the JAW: a draw to the chest is
      // a pull-up, and at hero size the hand has to clear the head's outline
      // to be seen at all. Styles differ in where the bow hand starts, how far
      // the string comes back, and how fast.
      const st = BOW_STYLES[spec.bowStyle] || BOW_STYLES.level;
      const rel = st.release;
      const qd = bowDrawQ(pose);
      const pull = qd < rel ? ease(Math.min(1, qd / (rel * st.pullFrac))) : 1;
      const let_ = qd < rel ? 0 : ease(Math.min(1, (qd - rel) / 0.2));
      const bowRest = st.bowRest ? [shB + st.bowRest[0] * u, armY + st.bowRest[1] * u] : [shB + 0.36 * u, armY - 0.02 * u];
      const bowFrom = st.bowFrom ? [shB + st.bowFrom[0] * u, armY + st.bowFrom[1] * u] : bowRest;
      const bowAt = lerp2(bowFrom, bowRest, pull);
      handB = reach(shB, armY, [bowAt[0] + 0.02 * u * let_, bowAt[1]]);
      elbB = -1;
      bowArmFront = true;
      const grip = [shF + 0.3 * u, bowRest[1]];
      const anchor = [shF + st.anchor[0] * u, armY + st.anchor[1] * u];
      const loose = [anchor[0] - 0.1 * u, anchor[1] + 0.03 * u];
      const drawn = lerp2(grip, anchor, pull);
      handF = lerp2(drawn, loose, let_);
      // Elbow BACK, the archer's line. +1 put the joint FORWARD of the hand,
      // pointing at the bow — a pull that read as pushing.
      elbF = -1;
      propOverHead = true;
      // THE LOWER. After the aim window both arms ease down to a carry — bow
      // hand low and forward, string hand at the side — with the bow still in
      // the far hand (drawRangedHeld tilts it upright as it comes down).
      const lower = ease(bowLowerQ(pose));
      if (lower > 0) {
        handB = lerp2(handB, [shB + 0.14 * u, armY + armL * 0.82], lower);
        handF = lerp2(handF, [shF - 0.02 * u, armY + armL * 0.86], lower);
        if (lower > 0.5) elbF = sideF;
      }
      // THE SLING: the bow hand swings up and back over the shoulder to the
      // worn bow's spot. Elbow flips out so the arm folds over the shoulder
      // rather than through the chest.
      const sling = ease(bowSlingQ(pose));
      if (sling > 0) {
        handB = lerp2(handB, bowSlungAt(torsoHalf, shoulderY, u), sling);
        if (sling > 0.4) elbB = 1;
      }
      // THE REACH, first of all: the far hand starts on the worn bow behind
      // him and brings it round to where the draw begins; the near hand
      // waits low and forward and rises to meet the string as it arrives.
      const reachQ = ease(bowReachQ(pose));
      if (reachQ < 1) {
        handB = lerp2(bowSlungAt(torsoHalf, shoulderY, u), handB, reachQ);
        handF = lerp2([shF + 0.06 * u, armY + armL * 0.55], handF, reachQ);
        if (reachQ < 0.5) elbB = 1;
      }
      // DEPTH follows the PHASE, not the hand: the bow (and the arm fetching
      // it) stays behind his body and face for the whole reach, is in front
      // only while it is in position — the draw and the lower — and goes back
      // behind him the moment the sling starts. Keyed on the hand's x it came
      // round across his chest, one frame in front of everything.
      propBehind = bowReachQ(pose) < 1 || bowSlingQ(pose) > 0;
      bowArmFront = !propBehind;
    } else if (g === 'throw') {
      // THE WRENCH THROW, four ways. Every one keeps the hand FORWARD of the
      // head or level with the shoulder, never behind it — behind is where a
      // real pitcher's hand goes and it is invisible at hero size. Release is
      // at RANGED_RELEASE_AT.toss for all four, so the flight code does not
      // have to know which won.
      const wind = q < 0.34 ? ease(q / 0.34) : 1;
      const whip = q < 0.34 ? 0 : q < 0.56 ? ease((q - 0.34) / 0.22) : 1;
      const settle = q < 0.56 ? 0 : ease((q - 0.56) / 0.44);
      const start = [shF + 0.04 * u, armY + armL * 0.34];
      const released = [shF + 0.46 * u, armY - 0.1 * u];
      const through = [shF + 0.3 * u, armY + armL * 0.6];
      if (spec.throwStyle === 'high') {
        // OVERHEAD, IN FRONT. Cocked straight up and a little forward of the
        // face, elbow up; the hand and the tool sit over the hat brim where
        // nothing occludes them.
        const cocked = [shF + 0.1 * u, armY - 0.58 * u];
        handF = whip > 0 ? lerp2(lerp2(cocked, released, whip), through, settle * 0.7) : lerp2(start, cocked, wind);
        elbF = whip > 0.5 ? -1 : 1;
        armOverHead = q < 0.5;
        handB = [shB + (0.06 + 0.2 * whip) * u, armY + armL * (0.44 - 0.24 * whip)];
        elbB = sideB;
      } else if (spec.throwStyle === 'sidearm') {
        // SIDEARM. Cocked level with the shoulder, back across the chest, and
        // whipped through flat — the arm crosses the torso, so it is painted
        // over it and stays visible the whole way.
        const cocked = [shF - 0.22 * u, armY - 0.02 * u];
        handF = whip > 0 ? lerp2(lerp2(cocked, [shF + 0.46 * u, armY + 0.0 * u], whip), [shF + 0.34 * u, armY + armL * 0.45], settle * 0.7)
          : lerp2(start, cocked, wind);
        elbF = whip > 0.5 ? -1 : 1;
        handB = [shB - (0.04 + 0.18 * whip) * u, armY + armL * (0.5 + 0.1 * whip)];
        elbB = sideB;
      } else if (spec.throwStyle === 'windmill') {
        // WINDMILL. One full turn of the straight arm about the shoulder —
        // down, back, over the top, forward — releasing at the front. The
        // most MOTION of the four, and the tool leads the whole way, so the
        // swing reads as a spin even at three frames.
        const r = armSeg + armSegF - 0.01 * u;
        const turn = q < 0.56 ? ease(q / 0.56) : 1;
        const th = Math.PI / 2 + turn * Math.PI * 1.5; // below -> behind -> above -> forward
        const onCircle = [shF + Math.cos(th) * r, armY + Math.sin(th) * r];
        handF = settle > 0 ? lerp2(onCircle, through, settle * 0.7) : onCircle;
        elbF = Math.sin(th) < 0 ? 1 : -1;
        armOverHead = q < 0.56 && Math.sin(th) < -0.25;
        handB = [shB - 0.06 * u, armY + armL * 0.55];
        elbB = sideB;
      } else {
        // TWO-HAND HEAVE. Both hands on the wrench, raised overhead in front,
        // brought down and forward together like a hammer. Heavy — the throw
        // of a stout man with a big tool — and both arms come over the head.
        const cocked = [shF + 0.08 * u, armY - 0.56 * u];
        handF = whip > 0 ? lerp2(lerp2(cocked, [shF + 0.44 * u, armY - 0.02 * u], whip), through, settle * 0.7) : lerp2(start, cocked, wind);
        elbF = whip > 0.5 ? -1 : 1;
        handB = [handF[0] - 0.06 * u, handF[1] + 0.05 * u];
        elbB = elbF;
        armOverHead = q < 0.5 ? 2 : 0;
      }
      // THE REACH, before all four of them. The near hand starts ON the worn
      // wrench and travels to wherever the chosen throw begins; the tool rides
      // the hand from the first frame, so what you see is him pulling it out
      // rather than it appearing in a fist. Same shape as the bow's reach, and
      // the depth flip is the same too: a wrench worn behind him is painted
      // behind him until the hand has brought it round.
      if (carried) {
        const rq = ease(wrenchReachQ(pose));
        if (rq < 1) {
          const at = wrenchCarryAt(spec, u, { torsoCx, torsoHalf, torsoTop, hipY, bob, run, phase: pose.phase });
          // ON THE HANDLE, not on the butt. drawWrench's origin is the far end
          // of the grip, and a hand sent there closes on air a hand's width
          // below the tool — and, on the back-hip carry, low enough that the
          // near leg covers the first frame of the fetch entirely.
          const grip = 0.12 * u * at.scale;
          handF = lerp2([at.x + Math.cos(at.ang) * grip, at.y + Math.sin(at.ang) * grip], handF, rq);
          wrenchCarryAng = { ang: at.ang, q: rq };
          // Elbow OUT while the hand is down at the belt: tucked in, the
          // two-bone solver folds the joint through the ribs on the way up.
          if (rq < 0.6) elbF = 1;
          armOverHead = false;
          propBehind = at.behind && rq < 0.85;
        }
      }
    } else {
      // THE HOSE. Both hands on the nozzle out front, the near one ahead.
      // The kick is the nozzle bucking as the water arrives — recoil, but on a
      // rubber pipe, so it is a wobble rather than a snap.
      const kick = q < 0.12 ? 0 : Math.sin((q - 0.12) * 19) * Math.max(0, 1 - q) * 0.03;
      handF = [shF + 0.27 * u, armY + (0.07 - kick) * u];
      handB = [shB + 0.15 * u, armY + (0.12 - kick * 0.6) * u];
      elbF = -1; elbB = -1;
    }
    armsReachFront = true;
  } else if (pose.headless || pose.stomp) {
    handF = reach(shF, armY, [shF + sideF * 0.16 * u, armY - armL * 0.5]); elbF = sideF;
    handB = reach(shB, armY, [shB + sideB * 0.16 * u, armY - armL * 0.5]); elbB = sideB;
  } else if (run) {
    // Opposite phase to the legs — but only roughly, and that is the point.
    // The arms sample -sin(ph) while the foot's contact pass starts at
    // +stride, a cosine, which leaves them a quarter cycle apart. armLag
    // shifts the arm sample back toward opposition: 0 reproduces the shipped
    // timing exactly, 0.25 is locked opposition, and an eighth lands close to
    // it without the arms hitting the beat mechanically.
    const armLag = styledGait ? (pose.armLag == null ? Number(L.armLag) || 0 : Number(pose.armLag) || 0) : 0;
    const sw = armLag ? -Math.sin(ph - armLag * Math.PI * 2) : -s;
    // REMOVED (9 Sep 2026): `openF`, a raised-cosine "reach a little further"
    // patch on the 3/8 frame, where the near arm's elbow sat more bent than on
    // either neighbour. It was treating the symptom — the front-on run now
    // swings the arm on a CONSTANT chord (below), so the elbow cannot vary
    // from frame to frame and there is nothing left to correct.
    if (turned) {
      // A three-quarter runner swings along the direction of travel, not out
      // sideways from a front-facing chest. Keep each hand inside the arm's
      // real reach and flip the elbow behind the swing so IK cannot invert.
      // gaitFoot's forward/back position is COSINE, so armSwing must oppose
      // cosine too. Using sine here put the arms a quarter-cycle out of phase.
      const armSwing = -Math.cos(ph);
      const totalArm = armSeg + armSegF;
      const nearAngle = 0.12 + armSwing * (walk ? 0.38 : 0.72);
      const farAngle = -0.04 - armSwing * (walk ? 0.22 : 0.46);
      const nearReach = totalArm * (walk ? 0.72 : 0.78);
      // Keep the receding arm nearly extended. A target at 58% reach forced
      // the two-bone solver into a deep fold and threw its elbow outside the
      // silhouette even though the hand itself stayed behind the torso.
      const farReach = totalArm * (walk ? 0.86 : 0.78);
      handF = [
        shF + Math.sin(nearAngle) * nearReach,
        armY + Math.cos(nearAngle) * nearReach,
      ];
      handB = [
        shB + Math.sin(farAngle) * farReach,
        armY + Math.cos(farAngle) * farReach,
      ];
      // Elbows stay on their anatomical outside for the entire cycle. Flipping
      // this sign at mid-swing makes the joint teleport through a 180° arc.
      elbF = nearSign;
      // The far elbow folds inward behind the ribcage; bending it toward the
      // far silhouette is what made it flare out as a separate appendage.
      elbB = nearSign;
    } else {
      // Both offsets here run along the TRAVEL axis, not out to the side, so
      // they never take sideF — only the shoulders they hang from move.
      // The legacy rig leads the near hand FORWARD of its shoulder, which was
      // right when that shoulder sat on the trailing side. Rooted at the near
      // shoulder the same lead drags the hand into the middle of his belly and
      // folds the elbow into a chicken wing on every backswing; a small negative
      // lead keeps the swing centred on the arm's own side of the body.
      const lead = (depthRun ? -0.04 * u : 0.05 * u) * (spec.armLength || 1);
      // NOTE: `walk` stops at the waist on this branch. The turned three-quarter
      // arms above scale their swing by it; these front-on ones do not, because
      // the only caller that has ever set the flag (the grumpos walk study in
      // tools/gallery-entry.js) is turned and never reaches here. Any future
      // front-on `walk` caller has to scale `swing` and `farSwing` — roughly the
      // 0.5 the turned branch chose — or it gets half-length strides under a
      // full sprint arm pump.
      // How far below the shoulder the hand rides. The heavy rig hangs DEEPER.
      // At 0.5 its hand sat only 0.15u under the shoulder while swinging 0.17u
      // behind it, so the shoulder-to-hand chord ran at 45 degrees — and a
      // two-bone solver puts the elbow perpendicular to that chord, which left
      // it nowhere to go but UP. The joint cleared the shoulder by 0.057u at
      // the top of the backswing, throwing the whole arm into a high chicken
      // wing. A steeper chord turns that perpendicular outward instead, and the
      // elbow stays under the shoulder for the entire cycle.
      const hang = depthArms ? 0.72 : 0.5;
      // THE ARM SWINGS AS ONE PIECE, FROM THE SHOULDER. A two-bone solver reads
      // the elbow off the shoulder-to-hand CHORD and nothing else, so a hand
      // target that moves nearer and further through the cycle bends and
      // straightens the elbow with it — the arm working like a piston instead
      // of swinging. Placed in POLAR terms — a constant chord, swept through an
      // angle — the elbow is constant by construction, every hero, every frame.
      const drop = armL * hang;
      const chordF = Math.hypot(lead, drop);
      // The swing is an ARC, and the arc is measured off the CAST'S arm rather
      // than this hero's. A shorter-armed hero (Fernwick, armLength 0.88) then
      // sweeps the same angle through a shorter distance; asked for the cast's
      // distance instead, her hand outran her arm at both ends of the swing and
      // the solver locked the elbow straight for a third of the cycle.
      const swingArc = Math.atan2((depthRun ? 0.13 : 0.15) * u,
        (armL / (spec.armLength || 1)) * hang);
      const thF = Math.atan2(drop, lead) - swingArc * sw;
      handF = [shF + Math.cos(thF) * chordF, armY + Math.sin(thF) * chordF];
      // The back arm swings shallower than the front: it lives behind the torso,
      // so its only visible contribution is the hand clearing the body's back
      // edge on the deep swing — which reads as a lump stuck to his back, not as
      // an arm, since the limb connecting it is hidden.
      // On the depth rig the far arm has moved to the LEADING side, and it is
      // the ONLY thing keeping him from reading as one-armed: the near arm is
      // drawn over the torso, so when it swings forward there is nothing else
      // in the silhouette. Dropping the forward bias and shortening the throw
      // parks the swing so the glove surfaces past the leading edge on the
      // counter-beat — visible exactly when the near arm is back — and sinks
      // behind the body the rest of the cycle. Any more and it detaches into a
      // glove floating clear of his chest.
      const farLead = depthRun ? 0 : 0.05 * u;
      // The far throw scales with the ARM, not the sprite: at a flat 0.11u it
      // stayed put when the heavy rig's arm grew, so his longer reach never
      // showed on the side where the hand is the only thing visible. At 0.42
      // of arm length the light rigs land on the same 0.11u they already had.
      const farSwing = depthRun ? armL * 0.42 : 0.11 * u;
      handB = [shB + farLead - farSwing * sw, armY + armL * hang - 0.04 * u * Math.abs(sw)];
    }
  } else if (jump) {
    if (L && !pose.stomp) {
      // Asymmetric and keyed to the arc, like the legs: the forward-side arm
      // drives up and the trailing one folds back as its counterweight.
      // Anchored off sideF/sideB rather than raw screen angles — signed the
      // wrong way this mirrors the whole pose and parks the raised hand on his
      // own belly.
      const total = (armSeg + armSegF) * (0.9 - 0.05 * airApex);
      handB = [
        shB + sideB * total * (0.72 + 0.1 * airApex - 0.24 * airFall),
        armY - total * (0.56 + 0.25 * airApex - 0.95 * airFall),
      ];
      elbB = -sideB;
      // The near arm is the one carrying the silhouette, and it was folded to
      // about three quarters of its reach — an elbow that bent read as the arm
      // being tucked in rather than swung down, which is the other half of why
      // an airborne hero looked gathered up. Straightened to ~0.92 of full
      // extension along the same down-and-out line it already travelled: stated
      // as a NORMALIZED direction times a reach, so the extension is a number
      // that can be reasoned about rather than whatever falls out of two
      // independent offsets.
      const nearReach = (armSeg + armSegF) * (0.92 - 0.05 * airApex);
      // `nearDown` against `nearOut` is the arm's ANGLE — lowering it swings the
      // straightened arm up without shortening it, which is the difference
      // between raising the arm and bending it.
      const nearOut = 0.44 + 0.12 * airFall, nearDown = 0.8;
      const nearLen = Math.hypot(nearOut, nearDown);
      handF = [
        shF + sideF * nearReach * (nearOut / nearLen),
        armYF + nearReach * (nearDown / nearLen),
      ];
      elbF = sideF;
    } else if (enhancedMotion && !pose.stomp) {
      // Arms counter the legs on launch, float higher through the apex, then
      // widen for balance on descent instead of freezing in one cheer pose.
      handF = reach(shF, armY, [
        shF + sideF * (0.16 + 0.035 * airApex + 0.02 * airFall) * u,
        armY - armL * (0.42 + 0.28 * airApex - 0.13 * airFall),
      ]); elbF = sideF;
      handB = reach(shB, armY, [
        shB + sideB * (0.13 + 0.04 * airApex + 0.035 * airFall) * u,
        armY - armL * (0.12 + 0.32 * airApex - 0.2 * airFall),
      ]); elbB = sideB;
    } else {
      handF = reach(shF, armY, [shF + sideF * 0.18 * u, armY - armL * 0.4]); elbF = sideF;
      handB = reach(shB, armY, [shB + sideB * 0.18 * u, armY - armL * 0.4]); elbB = sideB;
    }
  } else if (slide) {
    // Braced out at a fixed 0.2u the crouch folded the heavy rig's longer arm
    // to 56% of its reach where the light rigs sit at 82% — his crouch read
    // stubby-armed. Scaled off armL every rig folds by the same amount, and
    // 0.77/0.46 land the light rigs on the exact 0.2u/0.12u they already had.
    // Elbows keep the usual OUTWARD bend. Pointing them down instead splays
    // every hero's arms flat to the floor like a crab — the joints only used to
    // ride high here because the heavy rig's bones were unevenly split.
    const out = enhancedMotion ? 0.62 : 0.77;
    const down = enhancedMotion ? 0.64 : 0.46;
    handF = [shF + sideF * armL * out, armY + armL * down]; elbF = sideF;
    handB = [shB + sideB * armL * out, armY + armL * down]; elbB = sideB;
  } else {
    // Arms hang at the sides, elbows ghosting outward — front-on, at ease.
    //
    // Standing draws BOTH arms in the back pass (see the back-limb section
    // below), so an arm is only visible where it clears the torso silhouette:
    // arm and torso share p.b, and whatever is buried is buried in its own
    // colour. The light rigs socket their shoulders at 0.55 of the half-width,
    // and a hand only 0.07u out from there lands INSIDE a 0.17u torso — the
    // entire limb painted under the body, nothing showing but a sliver of
    // hand. Only the heavy rig's wide 0.84 socket already cleared the edge,
    // which is why grumpos read fine while the rest looked armless and tucked.
    //
    // So: park the hand far enough out that the arm's OUTER edge clears the
    // ribs, and hang it at 0.78 of arm length instead of 0.95 (of a 1.1 total
    // reach) so the elbow keeps a visible bend instead of dropping to near
    // full stretch. The heavy rig is deliberately left on its own numbers —
    // its arm is half again as thick, so a shared clearance formula would
    // shove it out to a scarecrow splay to satisfy the thinner rigs.
    const standOut = heavy
      ? Math.abs(shF - shoulderCx) + 0.07 * u
      : Math.max(Math.abs(shF - shoulderCx) + 0.07 * u, torsoHalf + armW * 0.5 + 0.015 * u);
    const standHang = heavy ? 0.95 : 0.78;
    // Breathing, arms: they drift a hair out and back on the same 2.0 cadence
    // as the idle bob, but lagging it — settling weight, not a pump in time
    // with the chest. Both arms take the same signed offset so they open and
    // close together rather than scissoring. The hands lift very slightly as
    // they swing out, which is simply what an arm on a fixed shoulder does.
    const sway = Math.sin((pose.time || 0) * 2 - 0.7) * 0.014 * u;
    const outX = standOut + sway;
    const hangY = armY + armL * standHang - sway * 0.32;
    handF = [shoulderCx + sideF * outX, hangY]; elbF = sideF;
    handB = [shoulderCx + sideB * outX, hangY]; elbB = sideB;
    // `handsFront`: the same rest pose with the splay taken out of it — arms
    // closer to vertical, hands down on the front of the skirt instead of held
    // out at the hips.
    //
    // The clearance above is measured against the RIBS, which is the widest the
    // body ever gets and a long way from where a resting hand actually sits. On
    // a tapered rig that difference is the whole angle: the socket sits at 0.55
    // of the half-width, the hand at a full half-width plus an arm, so the limb
    // has to travel outward as far as it travels down and every idle frame
    // reads as elbows-out. Measured against the WAIST instead — the half-width
    // the hand is actually level with — the arm has only its own gauge to clear
    // and hangs almost straight, which is the note.
    //
    // Not solved by moving the arms in front of the body. Both standing arms
    // paint in the back pass on purpose (see drawPuff): a puffed sleeve pushed
    // over the chest reads as holding your elbows out, which is the exact fault
    // being fixed here. So the hands hang down beside the skirt instead of
    // folding across it — the only place a hand can rest that low while its arm
    // stays outside the silhouette.
    //
    // And taken to FULL REACH along that line, which is what straightens it: the
    // shared rest hangs at 0.78 of a 1.1 reach precisely so the elbow keeps a
    // visible bend, and on a bare arm that bend is a crook at the hip rather
    // than the soft curve it reads as through a sleeve. reach() is the same
    // helper the arms-out poses use for the same reason — put the target at the
    // end of the limb and the IK has no bend left to make.
    if (spec.handsFront) {
      const foldOut = waistHalf + armW * 0.5 + 0.035 * u + sway;
      const aimY = armY + armL * 0.84 - sway * 0.2;
      handF = reach(shF, armY, [shoulderCx + sideF * foldOut, aimY]);
      handB = reach(shB, armY, [shoulderCx + sideB * foldOut, aimY]);
      elbF = sideF; elbB = sideB;
    }
    // Periodic hands-on-hips. As hipsAmt rises the resting hands ride UP to the
    // waist and OUT to the hip points — parked right at the body's side edge so
    // the hand clears the apron and reads as planted on the hip, not tucked
    // behind it — while the elbows wing outward past the silhouette. Driven by
    // the caller (the counter idle).
    const hipsAmt = Math.max(0, Math.min(1, pose.hipsAmt || 0));
    if (hipsAmt > 0) {
      const hipX = torsoHalf * 0.95;
      const hipY = armY + armL * 0.70 + sway * 0.5; // raised a touch so the upper arm crosses under the strap, not the bib corner
      handF = [handF[0] + (shoulderCx + sideF * hipX - handF[0]) * hipsAmt, handF[1] + (hipY - handF[1]) * hipsAmt];
      handB = [handB[0] + (shoulderCx + sideB * hipX - handB[0]) * hipsAmt, handB[1] + (hipY - handB[1]) * hipsAmt];
    }
  }

  // THE ONE CHANGE THE CLING MAKES. Everything above ran as a stand, so what is
  // in handF/handB right now is the idle's own pair of arms, breathing and all.
  // The pole-side one reaches out and takes the pole; the other is not touched,
  // and neither is anything else in the figure.
  //
  // Solved, not posed: the hand goes ON the column, so its x is fixed and the
  // only free choice is height — and the most height available is whatever
  // vertical is left in a real, unstretched arm once the horizontal run out to
  // the pole has been paid for. `gripUp` spends a fraction of that, so a low
  // value bends the elbow rather than pulling the hand off the stick.
  if (cling > 0) {
    const dx = CLING_POLE_X * u - shB;
    const total = armSeg + armSegF;
    const lift = Math.sqrt(Math.max(0, total * total - dx * dx)) * clingStyle.gripUp;
    const grip = [CLING_POLE_X * u, armY - lift];
    handB = [handB[0] + (grip[0] - handB[0]) * cling, handB[1] + (grip[1] - handB[1]) * cling];
    // Elbow BELOW the shoulder-to-hand line. Above it is the only other option
    // and it puts the joint over the hero's own shoulder, which reads as a
    // wing rather than as an arm reaching for something.
    elbB = -sideB;
  }

  // A puffed sleeve, seated on the UPPER ARM and rotated onto its axis, so it
  // travels with the limb the way a sleeve does. Drawn AFTER the arm and before
  // the hand: cloth sits over the arm it is on, and a puff under the limb is
  // just a lump behind it.
  // Standing, BOTH arms draw in the back pass — before the torso — so both
  // sleeves sit behind her body, which is the read the idle wants: arms at rest
  // hang behind the silhouette, and a sleeve pushed in front of the chest makes
  // her look like she is holding her elbows out. Nothing defers: a sleeve draws
  // with the arm it is on, in whichever pass that arm belongs to.
  const drawPuff = (sx, sy, hand, seg, dir, seg2, shade = 0) => {
    if (!spec.puffs) return;
    const [ex, ey] = joint(sx, sy, hand[0], hand[1], seg, dir, seg2);
    // Seated over the SOCKET and the top of the upper arm, not clear of it. A
    // real puffed sleeve covers the shoulder joint — and here it also has to,
    // because it is what closes that joint now: with the sleeve parked further
    // down the arm the shoulderCap behind it (the disc that buries the arm's
    // root in body colour) was left uncovered, and it re-takes the light on a
    // different ramp than the torso it sits on, so it showed as a faint circle
    // behind the sleeve. That dot is what read as the arm socketing far forward
    // of where it should. See the `puffs` early-out in shoulderCap.
    //
    // Still ON THE ARM and rotating with it, which is the whole point — it is
    // seated at the top of the limb rather than mounted on the body.
    // ON the socket, near enough. This is the answer to a circle that kept
    // reappearing at her shoulder however the cap was handled: with the sleeve
    // seated down the arm, the joint at the shoulder is LEFT OF IT whenever the
    // arm reaches forward, so whatever is there — the cap, or the limb's own
    // round end cap when the cap is suppressed — is exposed beside the sleeve.
    // Nothing about the lighting: it survives the key light being switched off,
    // which is how it was diagnosed.
    //
    // A real puffed sleeve covers the shoulder joint, so covering it is both
    // correct and the fix. It still rotates onto the arm's axis and travels
    // with the limb, which is what "attached to the upper arm" was asking for.
    const t = 0.06;
    const cx2 = sx + (ex - sx) * t, cy2 = sy + (ey - sy) * t;
    const ang = Math.atan2(ey - sy, ex - sx);
    if (spec.shortSleeve) {
      // A PLAIN SHORT SLEEVE instead of the puff: a straight cuff of cloth
      // capping the top of the upper arm, hemmed in gold. It still covers the
      // shoulder joint for the same reason the puff does — that is what buries
      // the arm's root — but it does not bell, so it reads as a sleeve on a
      // dress rather than as court costume.
      const len = Math.hypot(ex - sx, ey - sy) * (spec.sleeveLen ?? 0.42);
      // HALF the arm's width, because that is what armW is: limb2 takes it as
      // the stroke's LINE WIDTH, so the drawn arm's half-width is armW/2. Sized
      // against the full armW the sleeve came out nearly twice the arm — which
      // is why it still read as chunky after being 'slimmed' three times.
      const half = armW * 0.5 * (spec.sleeveWide ?? 1.15);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // Rooted slightly BEHIND the socket so the shoulder is covered, not
      // merely met: a sleeve that starts exactly at the joint leaves the round
      // end cap of the limb showing above it.
      // Barely behind the socket. At 0.55 of the sleeve's own width the root
      // cap stood proud above the shoulder and added a shoulder-pad of bulk
      // that had nothing to do with the sleeve's width.
      const rx = sx - ca * half * 0.22, ry = sy - sa * half * 0.22;
      const hx2 = sx + ca * len, hy2 = sy + sa * len;
      const nx = -sa, ny = ca;
      // Sides PARALLEL to the limb. The first cut belled the root and the hem
      // outward, and a sleeve that is wider than the arm at both ends is a cuff
      // hanging off her rather than cloth lying on her.
      outlined(ctx, recede(p.b, shade), ow * 0.7, (c) => {
        c.moveTo(rx + nx * half, ry + ny * half);
        c.quadraticCurveTo(rx - ca * half * 0.32, ry - sa * half * 0.32,
          rx - nx * half, ry - ny * half);
        c.lineTo(hx2 - nx * half, hy2 - ny * half);
        c.quadraticCurveTo(hx2 + ca * half * 0.14, hy2 + sa * half * 0.14,
          hx2 + nx * half, hy2 + ny * half);
        c.closePath();
      });
      if (!lod) {
        // The gold hem, on the cuff's own curve so it sits in the cloth.
        ctx.strokeStyle = recede(p.a, shade);
        ctx.lineWidth = hair(0.45, ow * 0.85);
        ctx.beginPath();
        ctx.moveTo(hx2 - nx * half * 0.94, hy2 - ny * half * 0.94);
        ctx.quadraticCurveTo(hx2 + ca * half * 0.12, hy2 + sa * half * 0.12,
          hx2 + nx * half * 0.94, hy2 + ny * half * 0.94);
        ctx.stroke();
      }
      return;
    }
    // `puffSize` scales the sleeve. Kiko's 0.56 is a big puff on a bare arm;
    // a smaller one reads as a princess sleeve rather than a pauldron.
    const pr = torsoHalf * 0.56 * (spec.puffSize ?? 1);
    // Longer ACROSS the arm than along it — a puff bells outward from the limb,
    // and a circle on a limb reads as a ball joint.
    outlined(ctx, recede(p.b, shade), ow * 0.85, (c) =>
      c.ellipse(cx2, cy2, pr * 0.86, pr, ang, 0, Math.PI * 2));
    if (!lod) {
      // The cuff, on the elbow side: one gold arc across the sleeve's lower
      // edge, which is where a puffed sleeve is gathered.
      ctx.strokeStyle = recede(p.a, shade);
      ctx.lineWidth = hair(0.45, ow * 0.9);
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, pr * 0.7, pr * 0.84, ang, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
    }
  };

  // Hand decorations (grumpos bracers, plumber gloves, bare hands) draw with
  // their own arm, not as a final pass: the back hand must occlude behind the
  // torso like the rest of the back arm, or a run cycle reads as two clapping.
  // `back` recedes the hand with the arm it terminates: an un-pushed glove on
  // a pushed-back arm reads as a bright bead floating off the far wrist.
  // `shX/shY` is the shoulder and `dir` the elbow's bend, as limb2 had them:
  // the same joint() puts the elbow where the arm was drawn with it, and the
  // forearm from there is the direction a shaped hand points its fingers.
  const handDeco = (x, y, back = 0, shX = null, shY = null, dir = 1) => {
    let ang = null;
    if (shX != null) {
      const [ex, ey] = joint(shX, shY, x, y, armSeg, dir);
      ang = Math.atan2(y - ey, x - ex);
    }
    const kind = pose.kind;
    if (id === 'grumpos') {
      paintHand(ctx, spec, u, ow, x, y, 0.058 * u, recede(p.g, back), recede(p.s, back), ang, false, kind);
    } else if (spec.plumber) {
      // A HAND IN A CUFF, not a white ball. The plumber's glove was one solid
      // disc of p.w, which is the only hand in the cast with no skin in it —
      // at size it reads as a mitten, and next to anyone else's ringed hand it
      // reads as a different kind of character. Same two concentric discs the
      // gloves and bracer branches use: the white stays as the ring round it.
      paintHand(ctx, spec, u, ow, x, y, 0.058 * u, recede(p.w, back), recede(p.hand || p.s, back), ang, true, kind);
    } else if (spec.bracers) {
      // A wide studded cuff with the hand small inside it. The spikes are three
      // stubs and no more: at hero size a full ring of them fills in solid and
      // the bracer goes back to being a disc.
      const br = armW * 0.95;
      if (!lod) {
        ctx.fillStyle = recede(p.a, back);
        for (const a of [-0.9, 0, 0.9]) {
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * br, y + Math.sin(a) * br);
          ctx.lineTo(x + Math.cos(a - 0.3) * br * 0.8, y + Math.sin(a - 0.3) * br * 0.8);
          ctx.lineTo(x + Math.cos(a + 0.3) * br * 0.8, y + Math.sin(a + 0.3) * br * 0.8);
          ctx.closePath();
          ctx.fill();
        }
      }
      paintHand(ctx, spec, u, ow, x, y, br, recede(p.ribbon || p.w, back), recede(p.hand || p.s, back), ang, true, kind);
    } else if (spec.gloves) {
      // Fingerless gloves: a leather cuff with the hand still skin on top of
      // it. Drawn as two concentric discs rather than as a band across the
      // wrist, because handDeco is handed a POINT and not a direction — a
      // directional band would need the forearm's angle threaded through every
      // caller, and a ring reads the same at every one of them.
      paintHand(ctx, spec, u, ow, x, y, armW * 0.8, recede(p.w, back), recede(p.hand || p.s, back), ang, true, kind);
    } else if (spec.goldCuffs) {
      // A BRACELET: one gold ring at the wrist with the bare hand over it, so
      // the band reads as a strip of metal round the arm and not as a glove.
      // It is the same gold as the belt and the pendant — one metal on her.
      paintHand(ctx, spec, u, ow, x, y, armW * 0.8, recede(p.crown || p.a, back), recede(p.hand || p.s, back), ang, true, kind);
    } else if (spec.hands) {
      // Bare hands in the face's own color. Without them the sleeve simply
      // stops: the arm is one flat slab of tunic from shoulder to fingertip,
      // and at this scale a limb ending in a blunt cap reads as unfinished.
      // Sized off armW rather than fixed, so the slim rig gets a hand in
      // proportion to the arm it terminates instead of a mitt on a twig.
      // `p.hand` opts a palette out of the face-colour default — see b33p,
      // whose face is a near-black plate that reads as a hole on a grey arm.
      paintHand(ctx, spec, u, ow, x, y, armW * 0.62, null, recede(p.hand || p.s, back), ang, true, kind);
    }
  };
  // The depth rig gets this front-on too. Rooted at the near shoulder the arm
  // otherwise starts as a bare round limb cap sitting on the body edge — a ball
  // joint stuck to the ribs. It is only visible work on a bare-skinned rig like
  // grumpos; on the clothed heroes the cap is body-coloured and lands inside
  // the torso, so it costs them nothing.
  // The cap works by being the SAME colour as the limb it buries — that is the
  // whole trick, and it is why it vanishes on a normal arm. Callers whose limb
  // is not body-coloured have to say so: `fill` is an argument rather than a
  // lookup here precisely because guessing it from `id` is how this last went
  // wrong, painting a body-grey disc onto B33P's differently-coloured arm.
  // A tank's arm root is BARE, so the cap that buries it has to be skin. Left at
  // the shirt colour it painted an olive disc onto her shoulder every frame the
  // near arm drew in front — which is exactly the "cap intersecting the upper
  // arm" you can see in a run: the cap works by being invisible against what it
  // sits on, and it can only do that if it is the same colour as what it sits
  // on. It is also the only thing left drawing her armhole now that the top
  // covers the shoulder — see `spec.tank` below — so it is doing double duty:
  // the skin lobe it lays over the shirt IS where the sleeveless top stops.
  const shoulderCap = (x, y, fill = spec.tank ? p.s : id === 'grumpos' ? p.s : p.b, ramps = null, lightOffset = null) => {
    // A SLEEVELESS SHOULDER has no cap front-on: the shirt covers the shoulder
    // and the ARM'S OWN ROOT is the armhole (see `spec.tank` below), so there
    // is no seam left for a cap to bury — only one for it to break. Whatever
    // colour it was given it straddled the boundary and printed the wrong half
    // onto the other side: in skin, a bare lobe rising out of the shirt over
    // her shoulder; in the shirt's olive, a green bite out of the top of her
    // arm. The limb's own round cap already closes the root at exactly the
    // right gauge, and against a covered shoulder that IS the armhole's edge.
    // TURNED is exempt: there the cap is stroked and IS the shoulder's
    // contour, a different job entirely.
    if (spec.tank && !turned) return;
    if (!turned && !depthArms) return;
    // Front-on the cap has to fit UNDER the torso's shoulder line. The turned
    // torso raises and broadens its near shoulder, so the cap tucks into that
    // slope; on the symmetric front-on torso there is nothing above it, and at
    // its turned size it cleared the shoulder by 0.014u and stood 1.36x the
    // arm's own root radius — the detached ball joint exactly.
    const capFit = (y - torsoTop) / 0.82;
    // Front-on the heavy cap is SMALLER than the turned one. Turned, it has a
    // broadened shoulder line to fill and reads as the deltoid; front-on that
    // same radius is 1.33x the arm's own root and sits on it as a distinct
    // ball. Just over the arm's width instead, it reads as a swell continuous
    // with the limb.
    // ...but only FRONT-ON, where the cap is never stroked and exists purely to
    // bury the arm's round root cap and its outline in body colour. Sized to
    // cover them, and no larger.
    const capBase = heavy ? 0.072 : 0.065;
    // TURNED, the cap IS the shoulder's silhouette — the outer arc below is
    // stroked and becomes the contour — so it has to stand proud of the arm it
    // crowns. HOW FAR proud is a property of that arm, not of the sprite. As a
    // fixed slab of u it was tuned against the heavy rig's 0.118u limb, and the
    // clothed heroes, whose arms are barely half that, wore the same ball at
    // 1.8-2.0x their own root radius where the heavy rig sits at 1.4 — a
    // pauldron bolted to the sleeve rather than a shoulder. Measured instead
    // against the arm's OUTLINED root (w/2 + ow, the silhouette the cap
    // actually has to clear), every rig swells past its own limb by the same
    // fraction, and the heavy rig keeps the radius it was tuned to.
    const rootHalf = (armDimsF ? armDimsF.shoulderW : armWF) / 2 + ow;
    // Front-on it also has to fit inside the torso HORIZONTALLY. The cap is an
    // unoutlined body-coloured ellipse whose entire job is to vanish against
    // the chest, so any part of it past the silhouette edge is a smooth lobe
    // hanging off the body with no contour of its own — it cannot read as
    // anything but a swelling. The celebrate pose is where this showed: rooting
    // the arms at 0.92 of the half-width left a 0.065u cap overhanging the edge
    // by 0.049u, a teal blister on the shoulder. Clamped to the room actually
    // left between the root and the body's edge at this height, the cap can
    // only ever bury the arm — never add to the silhouette. Turned is exempt:
    // there the cap is stroked and IS the shoulder's contour by design.
    // The room is measured over the cap's whole SPAN, not just along its
    // centre line. A plain rounded-rect torso is still turning its shoulder
    // corner at arm height, so an ellipse that fits exactly at its own centre
    // hangs its upper half outside the corner — a small unstroked teal lobe
    // riding on the shoulder, which is precisely the blister the clamp is here
    // to prevent. Solved in two passes because the span depends on the radius:
    // the first sizes the cap at its root, the second shrinks it to whatever
    // the body still offers at its top edge. Shrinking only ever lowers that
    // edge into wider body, so one correction is enough.
    const bodyRoom = (yy) => (spec.taper
      ? taperHalfAt(yy, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
      : roundHalfAt(yy, torsoTop, torsoBot, torsoHalf, torsoHalf * 0.7)
    ) - Math.abs(x - torsoCx);
    // REJECTED EXPERIMENT (2026-07-24): giving the front-on depth run a proud,
    // outer-arc-stroked cap (the turned treatment) to close the near-shoulder
    // seam. On a front-facing torso it reads as a bulge bolted to the shoulder,
    // not a deltoid — Peter vetoed it on sight. The run's flush-rooted arm keeps
    // its plain clamped cap; do not re-try the proud cap outside `turned`.
    let r = turned ? rootHalf * 1.138 : Math.min(capBase * u, capFit, bodyRoom(y));
    if (!turned) r = Math.min(r, bodyRoom(y - r * 0.82));
    // No room at all means the arm roots outside the body: there is nothing to
    // bury it in, and a cap here would be pure addition to the silhouette.
    if (r <= 0) return;
    // The TORSO's own ramp, not the bare field. formRamps() is fieldRamps() plus
    // a specular blob fitted to the shape's bounds — so a cap re-lit on the
    // plain field reproduces the torso's core and lit passes but NOT its
    // highlight, and where it lands on that highlight it wipes it and repaints
    // without it. That difference IS the disc: a sphere apparently growing out
    // of the shoulder, worst on a hero whose celebration parks the arm right
    // where the torso's specular sits. Given the torso's ramp the cap paints
    // the torso's exact shading into itself and the upper arm connects
    // invisibly, which is the whole job the cap was written for.
    const g = ramps || formRamps(ctx, torsoPath);
    // Solid fill masks the arm's round root cap and the torso edge beneath it,
    // merging both shapes. Stroke only the OUTER half; a complete oval creates
    // an internal seam and reads as a separate shoulder object.
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    // The cap's opaque fill wipes the shaded arm and torso underneath it, so it
    // has to re-take the light or it stops burying anything and becomes the
    // very ball joint it exists to hide. Same field as its neighbours, so it
    // lands on the values they already carry and stays invisible.
    if (lightOffset) { ctx.save(); ctx.translate(-lightOffset[0], -lightOffset[1]); }
    if (g) { ctx.fillStyle = g.core; ctx.fill(); ctx.fillStyle = g.lit; ctx.fill(); }
    if (ramps?.spec) { ctx.fillStyle = ramps.spec; ctx.fill(); }
    if (lightOffset) ctx.restore();
    // Turned, that outer half coincides with the shoulder's silhouette edge and
    // draws the contour. Front-on the arm roots INSIDE the torso, so the same
    // arc lands in open chest and reads as a ring painted on him. Here the fill
    // alone does the work it is there for: it buries the arm's own root cap and
    // outline, merging limb into shoulder with no seam of any kind.
    if (!turned) return;
    ctx.strokeStyle = id === 'grumpos' ? SKIN_OUTLINE : OUTLINE;
    ctx.lineWidth = hair(0.55, ow * 0.7);
    ctx.beginPath();
    if (nearSign < 0) ctx.ellipse(x, y, r, r * 0.82, 0, Math.PI / 2, Math.PI * 1.5);
    else ctx.ellipse(x, y, r, r * 0.82, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  };

  // back accessories
  drawTail(ctx, spec, p, pose, u, ow, lod, torsoHalf, hipY, run);
  // Grumpos wears plain leather shoes cut from the same hide as his panels —
  // just the foot shape in that color, with no cuff or strap work above it, so
  // the bare leg above reads as long as it is.
  const footFill = id === 'grumpos' ? p.w : p.f;

  // Standing, legs root at their own hips and feet face the camera; in
  // motion they share the center hip and the feet read as profile shoes.
  // Clinging comes through here as standing, so it takes the front-on branch
  // for free — which is also what the celebration it hands off to uses, so the
  // hero does not change bodies on the last frame of the slide.
  // hipNearX/hipFarX both collapse to hipRun when neither the turn nor a limb
  // style has separated them, so the unstyled front-on rig lands on exactly
  // the shared centre line it always used.
  const hipAt = (side) => (frontLegs
    ? side * HIP_HALF * u
    : side > 0 ? hipNearX : hipFarX);
  // In profile the shoe shifts toe-ward so the ankle sits back near the heel.
  const footDx = frontLegs ? 0 : 0.025 * u;
  // Shoe proportions: clearly longer than tall so it reads as a shoe, not a
  // circle. Radii derive from legW — the shoe must swallow the leg's round
  // end cap (legW / 2 past the ankle point) on the wider-legged rigs too.
  const capR = legW * 0.5;
  const footRx = Math.max(frontLegs ? 0.075 * u : 0.095 * u, capR * 1.5);
  const footRy = capR + 0.008 * u;
  // The rolled shoe is a RIGID FOOT: it pivots about the ankle the way a real
  // shoe does, so the shoe's offset from the leg's endpoint rotates with it
  // and the leg's round end cap stays buried at every angle — burial is the
  // same geometric relationship the unrotated design always had. (Rotating
  // the ellipse in place about its own centre uncovered the cap at the heel:
  // a rotated ellipse's lower edge climbs on the ankle side, which is what
  // put a leg-coloured blob under the shoe on the toe-off frames.)
  //
  // The ground CLAMP then keeps the pivoted shoe's lowest point from passing
  // the line the flat sole sat on — a toe-down roll on the planted foot would
  // otherwise drive the toe through the floor. A clamp and not a lift: it
  // engages only when the rolled shoe would actually cross the sole line, so
  // a foot in the air is left exactly on its authored path. (Lifting every
  // rolled foot unconditionally pushed the tucked swing foot 0.04u closer to
  // its own hip, handed the IK that much more slack, and swung the KNEE down
  // below the lifted shoe — a leg-coloured blob under the heel, worst on the
  // toe-off frames.) Zero at rot 0, so the unstyled cast renders untouched.
  const shoeGeom = (rot) => {
    const c = Math.cos(rot), sn = Math.sin(rot);
    return {
      dx: footDx * c - 0.01 * u * sn,
      dy: footDx * sn + 0.01 * u * c,
      hyp: Math.hypot(footRx * sn, footRy * c),
    };
  };
  const shoeF = shoeGeom(ankleF), shoeB = shoeGeom(ankleB);
  footF[1] = Math.min(footF[1], 0.01 * u + footRy - shoeF.dy - shoeF.hyp);
  footB[1] = Math.min(footB[1], 0.01 * u + footRy - shoeB.dy - shoeB.hyp);
  // Unequal leg bones for the styled gait: `thigh` is the thigh's share of
  // the two-bone leg, 0.5 the shipped 1:1 split. The TOTAL is held constant,
  // so the extension guard's reach arithmetic still stands; only where the
  // knee sits along the leg moves. Run and the styled jump only — the crouch
  // and stand solve their own segment against their own geometry.
  const legBias = L && (styledGait || (jump && !pose.stomp)) ? L.thigh : 0.5;
  const thighSeg = legSeg * 2 * legBias;
  const shinSeg = legSeg * 2 - thighSeg;

  // ---- leg-mounted gear ---------------------------------------------------
  // Both pieces below sample the SAME two-bone solution the leg is drawn with,
  // rather than being placed against the hip and hoping. A boot dialled to look
  // right while standing slides up the shin the moment the knee folds, and a
  // holster pinned to a fixed offset swings off the thigh entirely at the top
  // of a stride — that is why neither of them is authored in body coordinates.
  const kneeAt = (hipX, rootY, foot, kneeDir) =>
    joint(hipX, rootY, foot[0], foot[1] - ankleLift, thighSeg, kneeDir, shinSeg);
  // What a LEG is made of, and where the garment on it stops. Trousers are the
  // default — the limb is drawn in p.p from hip to ankle and that is the whole
  // lower body. `shorts` is the other build: the limb is drawn in SKIN, and a
  // short second stroke down the top of the thigh puts the garment back on.
  // Same arrangement as the boot at the other end, and for the same reason —
  // the clothing is the limb in a different colour rather than a shape laid
  // over it, so it cannot slide off the leg when the knee folds.
  const legFill = spec.shorts ? p.s : p.p;
  const shortsLeg = (hipX, rootY, foot, kneeDir, w, fill) => {
    if (!spec.shorts) return;
    const [kx, ky] = kneeAt(hipX, rootY, foot, kneeDir);
    const t = Math.max(0, Math.min(1, spec.shorts));
    // A touch wider than the leg: shorts hang off a thigh rather than shrink-
    // wrapping it, and the flare is what stops the hem reading as a knee-sock.
    limb(ctx, hipX, rootY, hipX + (kx - hipX) * t, rootY + (ky - rootY) * t, w * 1.12, fill, ow);
  };
  // `boots` is how much of the SHIN the leather covers, as a fraction. The
  // shaft is the same limb stroke in the shoe's own colour, so boot and shoe
  // read as one object and the shaft can never part company with the leg.
  const bootShaft = (hipX, rootY, foot, kneeDir, w, fill) => {
    if (!spec.boots) return;
    const [kx, ky] = kneeAt(hipX, rootY, foot, kneeDir);
    const ax = foot[0], ay = foot[1] - ankleLift;
    const t = 1 - Math.max(0, Math.min(1, spec.boots));
    const sx = kx + (ax - kx) * t, sy = ky + (ay - ky) * t;
    limb(ctx, sx, sy, ax, ay, w, fill, ow);
    if (!lod) {
      // The cuff: one band across the top of the shaft. Without it a dark boot
      // on dark trousers is just a leg, and the whole point of a boot at this
      // size is the horizontal line that says where it ends.
      const dx = ax - sx, dy = ay - sy, d = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = p.w;
      ctx.lineWidth = hair(0.5, w * 0.3);
      ctx.beginPath();
      ctx.moveTo(sx + (dy / d) * w * 0.5, sy - (dx / d) * w * 0.5);
      ctx.lineTo(sx - (dy / d) * w * 0.5, sy + (dx / d) * w * 0.5);
      ctx.stroke();
    }
  };
  // Thigh holster. The geometry lives at module scope (thighHolsterAt) because
  // the reclined poses need it too and have no access to this closure — the
  // slide and the dive draw their own legs, and a holster that only exists in
  // the standing rig is a holster that vanishes the moment she goes to ground.
  const thighHolster = (hipX, rootY, foot, kneeDir, w, shadeAmt, drawn) => {
    const [kx, ky] = kneeAt(hipX, rootY, foot, kneeDir);
    thighHolsterAt(ctx, p, u, ow, lod, hipX, rootY, kx, ky, w, shadeAmt, drawn);
  };
  const holsterDrawn = pistolAngle != null;

  // THE THROW, applied OVER the gait rather than instead of it. `handF`
  // already holds wherever the run (or the stand) put the near hand, and every
  // beat below is a blend from THAT — the arm leaves the walk and rejoins it,
  // instead of teleporting onto targets of its own. The far arm is never
  // touched: reaching to your own hip and throwing are one-armed, and driving
  // the off arm made the whole body take part in a gesture that needs a hand.
  if (throwQ >= 0) {
    const ez = (v) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
    const lerp2 = (a, b, v) => [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v];
    const gait = handF;                                             // where the walk had it
    const atPouch = [hipAt(-1) - 0.02 * u, hipY + 0.02 * u];       // the canister, left hip
    // Cocked HIGH beside the head, barely back: behind the shoulder is where a
    // real pitcher's hand goes and it is invisible here, occluded by the torso.
    const cocked = [shF - 0.04 * u, armY - 0.5 * u];
    const released = [shF + 0.44 * u, armY - 0.1 * u];             // full reach, head height
    const through = [shF + 0.28 * u, armY + armL * 0.55];           // settled low and forward
    if (throwQ < T_REACH) {
      handF = lerp2(gait, atPouch, ez(throwQ / T_REACH));
      elbF = -1;
    } else if (throwQ < T_PULL) {
      handF = lerp2(atPouch, cocked, ez((throwQ - T_REACH) / (T_PULL - T_REACH)));
      elbF = 1;                                                     // elbow up while cocked
    } else if (throwQ < T_RELEASE) {
      handF = lerp2(cocked, released, ez((throwQ - T_PULL) / (T_RELEASE - T_PULL)));
      elbF = -1;
    } else {
      // Follow through, then ease back onto the gait so the last frame of the
      // window and the first frame after it are the same arm.
      const f = ez((throwQ - T_RELEASE) / (1 - T_RELEASE));
      handF = lerp2(lerp2(released, through, Math.min(1, f * 1.6)), gait, Math.max(0, (f - 0.5) * 2));
      elbF = -1;
    }
    // In FRONT of the body for the whole window: a standing pose paints both
    // arms behind the torso, which hides a hand crossing to the hip. And OVER
    // the head from the cock through the whip — the hand sits beside the ear
    // and then crosses the face, and the head is painted after the arm unless
    // this flag defers it (the same late draw Grumpos's flex uses). Held past
    // release rather than cut mid-whip, so the arm cannot pop from over the
    // face to behind it in a single frame.
    armsReachFront = true;
    armOverHead = throwQ >= T_REACH && throwQ < 0.85;
  }

  const drawFrontLeg = () => {
    const hipX = hipAt(1);
    limb2(ctx, hipX, legRootYF, footF[0], footF[1] - ankleLift, thighSeg, kneeF, legWF, legFill, ow, legWF, false, shinSeg);
    shortsLeg(hipX, legRootYF, footF, kneeF, legWF, p.p);
    bootShaft(hipX, legRootYF, footF, kneeF, legWF, footFill);
    if (turned && id !== 'grumpos') {
      const rx = legWF * 0.72, ry = legWF * 0.58;
      ctx.fillStyle = p.p;
      ctx.beginPath();
      ctx.ellipse(hipX, legRootY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Same reason as shoulderCap, and the same ramp: this buries the thigh's
      // root, and an opaque fill over shaded pixels has to re-take the light on
      // the ramp its neighbours were painted with or it becomes the disc it
      // exists to hide.
      const g = formRamps(ctx, torsoPath);
      if (g) { ctx.fillStyle = g.core; ctx.fill(); ctx.fillStyle = g.lit; ctx.fill(); }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.5, ow * 0.65);
      ctx.beginPath();
      if (nearSign < 0) ctx.ellipse(hipX, legRootY, rx, ry, 0, Math.PI / 2, Math.PI * 1.5);
      else ctx.ellipse(hipX, legRootY, rx, ry, 0, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    outlined(ctx, footFill, hair(0.6, ow * 0.8), (c) => c.ellipse(footF[0] + shoeF.dx, footF[1] - ankleLift + shoeF.dy, footRx, footRy, ankleF, 0, Math.PI * 2));
    // Near-leg holster last: it sits ON the thigh, so it has to land after the
    // limb it is strapped to. This is also the side the gun is drawn from.
    if (spec.holster === 'thigh') thighHolster(hipX, legRootYF, footF, kneeF, legWF, 0, holsterDrawn);
  };
  // THE TOOL BELT is its own pass, not part of drawFrontLeg, because that
  // closure is called at two DIFFERENT points: at 8781 for a front-on stance,
  // which is BEFORE the torso, and later for a profile run, which is after.
  // Riding inside it the pouch was therefore behind the body when standing and
  // in front of it when running — present in the run tiles and missing from
  // idle, which is exactly how it looked.
  //
  // Called once, from a point that is after the torso in both paths and before
  // either arm: body / legs / POUCH / arm / hand.
  // THE POUCH BOBS. Everything positioning it is a CONSTANT — hipAt(-1) and
  // hipY do not move over the gait — so it was welded to the frame and sat dead
  // still on a running body.
  //
  // It bobs and does NOTHING ELSE. The first pass gave it a lateral swing and a
  // tilt off the stride, which was the wrong model: this hangs from the BELT,
  // on the torso, not from the leg — so it takes the body's bounce and has no
  // business tracking which foot is down. A sideways swing read as the bag
  // being dragged around by the near thigh.
  //
  // The body bounces TWICE per stride (once per footfall), hence 2*ph, and the
  // bag lags that bounce slightly — it is still settling as the body starts to
  // rise, which is the whole of what makes a hung thing read as hung.
  // Deliberately small: a stiff canister on a tight belt is weight, not flap.
  const kitBob = run ? Math.cos(2 * ph - 0.7) : Math.sin((pose.time || 0) * 1.6) * 0.4;
  const hipKit = (parts) => {
    if (!['belt', 'tilt', 'dispenser'].includes(spec.bundle) || lod) return;
    paintBambooBundle(ctx, spec, p, u, ow, lod, {
      parts,
      // Sized on the WAIST (the rig's own taper), not on torsoHalf, which is
      // the shoulder line and hangs a band off a tapered body on both sides.
      half: waistHalf,
      // The torso's own outline, so the band ends where the body does.
      clip: torsoPath,
      // SLUNG: the belt is on the WAIST, the canister hangs BELOW and OUTBOARD
      // of it, on the hip. They were being placed at one height, which is what
      // made the pouch read as threaded onto the band rather than hung from
      // it — a belt holds a thing up, so the thing has to sit lower than the
      // belt does.
      //
      // `bx`/`by` move the canister only; the band keeps its own placement (see
      // the belt block, which measures off `by` before this offset is applied).
      // STANDING, IT SITS IN A LITTLE. `hipAt(-1)` is where the near thigh
      // roots, and in the run the leg swings out under the canister and carries
      // the eye with it; standing there is no swing, and the same offset left
      // the bag hanging off his side rather than on his hip. `pouchIdleIn` is
      // the nudge back toward the body, applied only when he is not running.
      bx: hipAt(-1) - 0.055 * u + (run ? 0 : (spec.pouchIdleIn ?? 0) * u),
      // UP ONTO THE WAIST. It sat at legRootYF, which is where the thighs
      // root — below the torso, across the top of the legs. That reads as a
      // belt slipping off, and it is also why the band overhung him: `half` is
      // waistHalf, the body's width AT THE WAIST, and the body is narrower
      // than that further down. Raised to the waist the same number now
      // matches the silhouette it is drawn across, so the belt ends where he
      // does.
      // 0.005u, down from 0.013u. At the larger travel the pouch moved far
      // enough against the torso that the two read as separate masses — the
      // belly appearing to bounce inside the belt. A worn thing should shift
      // by a hair and no more: enough to say it is hung rather than painted
      // on, not enough to look detached from the body carrying it.
      // THE BELT DOES NOT MOVE. It is strapped tight to the waist; only the
      // thing hanging off it swings. Bobbing both made the whole assembly
      // float against the torso, which is what read as the belly bouncing.
      by: hipY - 0.05 * u + (parts === 'belt' ? 0 : kitBob * 0.005 * u),
      // How far the canister is slung below the band, in u. Kept separate from
      // `by` so the belt stays exactly where it was while the pouch drops.
      sling: 0.055,
      lean: spec.bundle === 'dispenser' ? 0.4 : spec.bundle === 'tilt' ? 0.2 : 0,
      // THE FAR SIDE RISES IN MOTION. The rig fakes a three-quarter turn when
      // he runs — `turnDepth`, the arm depth and the head's lead all say the
      // body has come round — and a band going ROUND a turned body shows its
      // far side higher, because that side sits further along the ellipse.
      // Standing front-on there is no turn to read and the belt is level;
      // `beltSlantRun` is the lift the far end takes once there is one.
      //
      // Subtracted because `beltSlant` measures how much LOWER the right end
      // finishes than the left. The SLIDE deliberately has none of this: a
      // reclined body is not turned, it is tipped, and the band there is
      // already square to its own axis.
      slant: (spec.beltSlant ?? 0) - (run ? (spec.beltSlantRun ?? 0) : 0),
      belt: true,
      canes: { ...(spec.canes || {}), parity: pose.stickParity | 0 },
      thrown: !!pose.axeThrown,
    });
  };

  // How far the near arm seats INBOARD and BELOW the raw shoulder point. It is
  // applied as a translate around the whole limb — root, hand, glove and
  // shoulder cap move as one piece — rather than by nudging shF/armYF, which
  // would leave the hand targets behind and pivot the arm about the wrist
  // instead of shifting it.
  // Signed off sideF (the near arm's outward direction), not off screen x, so
  // it stays inboard when a negative yaw mirrors the rig.
  const ARM_SEAT_IN = spec.armSeatIn ?? (pose.kind === 'run' ? spec.runArmSeatIn : undefined) ?? 0.022;
  const ARM_SEAT_DOWN = spec.armSeatDown ?? (pose.kind === 'run' ? spec.runArmSeatDown : undefined) ?? 0.02;
  const nearArmSeated = pose.kind !== 'celebrate' && !(frontLegs && !turned);
  // Fernwick's old outward socket made room for her sling. Fit only the
  // preview's near socket back into the gown, after solving the hand targets:
  // the bow grip and reach stay put, and the sling follows the fitted socket.
  const socketFit = id === 'fernwick' && spec.shoulderJoinPreview !== 'cap' && supportsShoulderJoinPreview(spec)
      && nearArmSeated && !turned && !slide ? sideF * 0.02 * u : 0;
  shF -= socketFit;
  // Gallery opt-in only. Keep the shipped capsule/cap treatment until the
  // cast comparison is approved. Only the near arm in locomotion or
  // an action receives it; resting pairs and celebrations retain their joins.
  // SHIPPED 9 Sep 2026: on by default for every rig supportsShoulderJoinPreview
  // accepts (candidates in src/dev included); `shoulderJoinPreview: 'cap'` is
  // the opt-out the preview page uses for its OLD CAP column.
  const smoothShoulderPreview = spec.shoulderJoinPreview !== 'cap'
    && supportsShoulderJoinPreview(spec)
    && pose.kind !== 'celebrate' && (nearArmSeated || armsReachFront)
    && !turned;
  let shoulderJoinRamps = null;
  const shoulderLightOffset = smoothShoulderPreview && nearArmSeated
    ? [-sideF * ARM_SEAT_IN * u, ARM_SEAT_DOWN * u] : null;
  const shoulderJoin = (() => {
    if (!smoothShoulderPreview) return;
    const side = sideF;
    const seatX = nearArmSeated ? side * ARM_SEAT_IN * u : 0;
    const seatY = nearArmSeated ? ARM_SEAT_DOWN * u : 0;
    const sx = shF - seatX, sy = armYF + seatY;
    const hx = handF[0] - seatX, hy = handF[1] + seatY;
    // Read the same IK and seat as limb2; the bones and hand do not move.
    const [ex, ey] = joint(sx, sy, hx, hy, armSeg, elbF);
    const length = Math.hypot(ex - sx, ey - sy);
    if (length < 1e-6) return;
    const dx = (ex - sx) / length, dy = (ey - sy) / length;
    // The join used to fade out by bone angle as the arm folded forward,
    // because the curve of the day — leaving the top of the shoulder corner —
    // traced a second ridge behind the upper arm there. That fade handed the
    // forward-swing frames back to the old ball-joint notch, which is the very
    // dip this is for. The crown is now a fillet that starts on the corner arc
    // just before the notch (below), so it blends that case too and no longer
    // fades; `joinAmount` stays as the machinery for a future fade, at 1.
    const joinAmount = 1;
    const radius = armWF / 2;
    const nx = side * dy, ny = -side * dx;
    // limb2's outline extends a full ow beyond its fill, whereas the crown
    // stroke extends half ow. Match their OUTER edges at the tangent point;
    // joining at the fill radius leaves a half-outline-width step here.
    const joinRadius = radius + ow * 0.5;
    // The plain torso is roundRectPath, which clamps its corner to half the
    // body's height; on a short torso that is less than 0.7 of the half-width,
    // and a crown built on the unclamped circle started INSIDE the drawn edge
    // — a half-outline step at T, read as a blurry nub on the contour.
    const shoulderRadius = spec.taper
      ? taperCtl(torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft).rT
      : Math.min(torsoHalf * 0.7, torsoHalf, (torsoBot - torsoTop) / 2);
    const R = shoulderRadius;
    const cxC = torsoCx + side * (torsoHalf - R), cyC = torsoTop + R;
    // WHERE THE CROWN MEETS THE ARM. 0.65 of the upper arm when the arm swings
    // back; when it hangs, no lower than the height where the torso's corner
    // arc ends. A hanging arm's edge runs just outside the flank, and a curve
    // from the top of the corner down to a point far below the corner has to
    // be nearly two straight tangents to clear the arc between — the shoulder
    // came out boxy. Ending level with the corner's end makes the tangents'
    // triangle the corner's own box pushed out to the arm, and a round curve
    // (the quarter-circle's own lam ≈ 0.55) fits it. Continuous in the arm
    // angle: the height cap only bites once the arm is steep enough.
    let tB = length * 0.65;
    if (dy > 1e-3) tB = Math.max(length * 0.3, Math.min(tB, (cyC - sy - ny * joinRadius) / dy));
    const bx = sx + dx * tB + nx * joinRadius;
    const by = sy + dy * tB + ny * joinRadius;
    // A limb crossing the chest has no exposed shoulder notch to bridge.
    const half = spec.taper
      ? (by < torsoTop + shoulderRadius
        ? torsoHalf - shoulderRadius * (1 - Math.sqrt(Math.max(0, (by - torsoTop) / shoulderRadius))) ** 2
        : taperHalfAt(by, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft))
      : roundHalfAt(by, torsoTop, torsoBot, torsoHalf, shoulderRadius);
    if (by >= torsoTop && side * (bx - torsoCx) <= half) return;
    // THE CROWN IS A FILLET, not a free curve. The torso and the arm are both
    // trimmed to it, so wherever it passes INSIDE either of them the silhouette
    // is cut down and the shoulder reads with a dip — and a curve that leaves
    // the top of the shoulder corner cannot avoid that whenever the arm hangs
    // close: its outer edge line enters the rounded corner, and no curve
    // tangent to both can pass outside the corner it starts on top of. So:
    // the corner is a circle of radius shoulderRadius centred at C; the arm's
    // outer edge is the line L through b along the bone. Where L enters the
    // circle (I), the crown starts part-way round the arc BEFORE I, at T, and
    // ends on L at b. Between them it is a cubic inside the triangle made by
    // the tangent at T and L (meeting at Q); a curve inside that triangle is
    // convex and tangent-continuous at both ends. How far it bulges toward Q
    // (`lam`) is the smallest that clears both shapes, checked by sampling —
    // straight tangents (lam = 1) always clear, a rounder curve can cut the
    // arc between T and I. When L misses the corner the arc's top is T.
    // WHERE THE FILLET LEAVES THE CORNER. Not always at its top: a curve from
    // up there that is tangent to the arm's edge at b has to clear the whole
    // corner arc between, and when b sits beside the corner (the arm hanging)
    // only a near-straight pair of tangents does — the shoulder went boxy.
    // The tangent from b to the corner circle touches the arc at Tb; the
    // fillet starts halfway between the top and Tb. When the arm swings back,
    // b is far out at shoulder height, Tb is near the top and so is T; when
    // the arm hangs, Tb is down the flank and T sits mid-corner, leaving the
    // torso's own arc to draw the upper shoulder and the fillet a compact,
    // round blend. Where the arm's edge cuts INTO the circle its tangent point
    // always precedes the entry point, so this covers that case too. T moves
    // continuously with the arm: no pops.
    let phiT = 0;
    {
      const mX = bx - cxC, mY = by - cyC, dist = Math.hypot(mX, mY);
      if (dist > R + 1e-6) {
        const beta = Math.acos(R / dist), base = Math.atan2(mY, mX);
        let best = Infinity;
        for (const ang of [base - beta, base + beta]) {
          const phi = Math.atan2(side * Math.cos(ang), -Math.sin(ang));
          if (phi >= -1e-6 && phi < best) best = phi;
        }
        if (best !== Infinity) phiT = 0.5 * Math.min(Math.PI / 2, best);
      }
    }
    phiT = Math.max(0, Math.min(Math.PI / 2, phiT));
    const ax = cxC + side * R * Math.sin(phiT), ay = cyC - R * Math.cos(phiT);
    const tTx = side * Math.cos(phiT), tTy = Math.sin(phiT);
    const tnx = side * Math.sin(phiT), tny = -Math.cos(phiT);
    // Q: where the tangent at T meets L. Must lie ahead of T and behind b.
    const cr = tTx * dy - tTy * dx;
    let qx, qy, lam = 1;
    const sQ = ((bx - ax) * dy - (by - ay) * dx) / (cr || 1e-9);
    const tQ = ((bx - ax) * tTy - (by - ay) * tTx) / (cr || 1e-9);
    const tangentsMeet = Math.abs(cr) > 1e-3 && sQ > 0 && tQ < 0;
    if (tangentsMeet) {
      qx = ax + tTx * sQ; qy = ay + tTy * sQ;
      const inside = (px, py) => {
        // Penetration into the SILHOUETTE: the torso's rounded top and flank,
        // and the arm's straight part where it is outside the torso. Not the
        // arm's root cap (t < radius) — cutting that is the point — and not
        // the arm where it lies inside the torso, which is not an edge at
        // all: counting it there kept every rounder curve from passing and
        // left the shoulder boxy.
        let pen = 0;
        if (py > torsoTop && py < torsoBot) {
          if (py >= cyC || side * (px - cxC) <= 0) pen = torsoHalf - side * (px - torsoCx);
          else pen = R - Math.hypot(px - cxC, py - cyC);
        }
        if (pen > 0) return pen;
        const t = (px - sx) * dx + (py - sy) * dy;
        if (t > radius && t < length) return Math.max(0, radius - Math.abs((px - sx) * dy - (py - sy) * dx));
        return 0;
      };
      for (const l of [0.55, 0.65, 0.75, 0.85, 0.95, 1]) {
        const p1x = ax + l * (qx - ax), p1y = ay + l * (qy - ay);
        const p2x = bx + l * (qx - bx), p2y = by + l * (qy - by);
        let worst = 0;
        for (let k = 1; k < 24; k++) {
          const w = k / 24, v = 1 - w;
          const px = v * v * v * ax + 3 * v * v * w * p1x + 3 * v * w * w * p2x + w * w * w * bx;
          const py = v * v * v * ay + 3 * v * v * w * p1y + 3 * v * w * w * p2y + w * w * w * by;
          worst = Math.max(worst, inside(px, py));
        }
        lam = l;
        // Near zero, not a tenth of an outline: the torso and arm are trimmed
        // to this curve, so any tolerated dip is silhouette cut away, and at T
        // a dip of a tenth already showed as a step against the torso's line.
        if (worst <= ow * 0.02) break;
      }
    }
    const curve = (c, offset = 0, offsetB = offset) => {
      // Parallel offset of the fillet: move each end along its own normal and
      // Q along the bisector, so the offset curve keeps both tangencies. The
      // two ends may take different offsets (see bridgePath).
      const ax2 = ax + tnx * offset, ay2 = ay + tny * offset;
      const bx2 = bx + nx * offsetB, by2 = by + ny * offsetB;
      c.moveTo(ax2, ay2);
      if (tangentsMeet) {
        const dotN = 1 + (tnx * nx + tny * ny), offQ = (offset + offsetB) / 2;
        const qx2 = qx + (dotN > 0.05 ? offQ * (tnx + nx) / dotN : offQ * nx);
        const qy2 = qy + (dotN > 0.05 ? offQ * (tny + ny) / dotN : offQ * ny);
        c.bezierCurveTo(ax2 + lam * (qx2 - ax2), ay2 + lam * (qy2 - ay2),
          bx2 + lam * (qx2 - bx2), by2 + lam * (qy2 - by2), bx2, by2);
      } else {
        // Tangents do not meet usefully (arm near-parallel to the corner's
        // tangent): a plain blend, ends still on their normals.
        const reach = Math.hypot(bx - ax, by - ay);
        c.bezierCurveTo(ax2 + tTx * reach * 0.45, ay2 + tTy * reach * 0.45,
          bx2 - dx * reach * 0.35, by2 - dy * reach * 0.35, bx2, by2);
      }
    };
    // THE BRIDGE: the region the crown spans. Under the crown's inner edge,
    // down into the arm (deep, for the fill — the arm paints over it) or to
    // the arm's fill edge (shallow, for the arm's clip), across the notch to
    // the torso's flank and back up the corner arc, both inset half an
    // outline: that is where the torso's own outline band under the crown
    // ends, so filling to it hides that band and nothing deeper. It is FILLED
    // before the torso's decorations and the arm, so a strap drawn over the
    // shoulder still reaches the contour, and the arm is CLIPPED to it
    // instead of painted over, so its outline never stacks under the crown.
    const thetaAt = (phi) => Math.atan2(-Math.cos(phi), side * Math.sin(phi));
    const bridgePath = (c, deep) => {
      // TWO OUTLINE CONVENTIONS meet on this crown. The torso's outline is
      // centred on its edge with body fill under the inner half of the line;
      // limb2's outline sits wholly OUTSIDE the arm's fill. The crown is one
      // stroke, so what lies under it has to change along its length: body
      // colour up to the stroke's centreline at T, where it continues the
      // torso's line, tapering to the stroke's inner edge at b, where it
      // continues the arm's. Filled to the inner edge throughout, the crown's
      // inner half sat over nothing at the torso end and read as a lighter,
      // blurred nub on the contour.
      curve(c, 0, -ow * 0.5);
      if (!deep) {
        // The arm's clip: the band between the arm's fill edge and the crown.
        c.lineTo(sx + nx * radius, sy + ny * radius);
      } else {
        // The fill: everything under the crown out to well INSIDE the arm and
        // the torso. Its inner boundary hugs the arm (0.8 radius past the
        // bone, root-ward) and then sits deep in the torso, so it never crosses
        // either silhouette — an earlier version ran out to the flank and
        // crossed the corner arc when the root sat inside the torso, and the
        // self-intersection left the torso's outline band showing under the
        // crown as a dark wedge. Covering interior is harmless: it is drawn
        // before anything worn, in the same colour and the same light.
        const inX = torsoCx + side * torsoHalf * 0.4;
        c.lineTo(bx - nx * radius * 1.8, by - ny * radius * 1.8);
        const prY = sy - ny * radius * 0.8;
        c.lineTo(sx - nx * radius * 0.8, prY);
        c.lineTo(inX, Math.max(prY, ay));
        c.lineTo(inX, ay);
      }
      c.closePath();
    };
    return { curve, bridgePath, ax, ay, bx, by, sx, sy, ex, ey, dx, dy, nx, ny, tnx, tny, radius, side, joinAmount,
      corner: { cx: cxC, cy: cyC, r: R, phiT, thetaAt },
      lam, phiT, tangentsMeet, trim: dy > 0 };
  })();
  // THE CAP: everything outside the crown between its end normals, as a closed
  // path. Back over the top: the fillet starts part-way round the corner, and
  // the arm's round root cap can poke above the torso's OWN contour on the
  // stretch of corner before T. So the region does not close along T's normal
  // but runs up to the corner's top and back down its outer outline edge (the
  // arc, half an outline out) to T, then in across the crown's butt end.
  // Shared by the trims here and handed to the costume for the quiver sling.
  const crownCapPath = (c, pad) => {
    const { curve, bx, by, nx, ny, corner } = shoulderJoin;
    const extent = 8 * u;
    curve(c, pad);
    c.lineTo(bx + nx * (extent + pad), by + ny * (extent + pad));
    const { cx: ccx, cy: ccy, r: cr, phiT: cphi, thetaAt } = corner;
    c.lineTo(ccx + sideF * extent, -extent);
    c.lineTo(ccx, -extent);
    c.lineTo(ccx, ccy - cr - ow * 0.5);
    c.arc(ccx, ccy, cr + ow * 0.5, thetaAt(0), thetaAt(cphi), sideF < 0);
    c.closePath();
  };
  const clipShoulderCrown = (seated = true, inverse = false, withBridge = false) => {
    if (!shoulderJoin?.trim) return;
    const { curve, ax, ay, bx, by, nx, ny, tnx, tny, bridgePath, corner, side } = shoulderJoin;
    // The old round cap can project ABOVE the connecting curve. Clip the
    // painted arm to that same crown, instead of leaving a second little bump
    // behind it. The cut sits on the crown stroke's INNER edge: OUTLINE is
    // translucent, so any of the arm's own outline left under the crown
    // stroke stacks with it into a darker band — and at the tangent point the
    // two coincide, so the stack ran the whole tangent and read as a dark
    // crescent at the junction. Cut here, the arm's band is gone wherever the
    // crown paints and the crown alone is the contour up to the handover.
    //
    // Built as EXCLUDED regions against a covering rect, even-odd: the cap
    // (everything outside the crown between its two end normals, so nothing
    // before T or past b is touched), and with `withBridge` the bridge region
    // too, so the arm's band cannot show under the crown. `inverse` keeps
    // only the excluded regions — see withCrownTrim.
    const pad = -ow * 0.5;
    const extent = 8 * u;
    const [ox, oy] = (seated && shoulderLightOffset) || [0, 0];
    ctx.translate(-ox, -oy);
    ctx.beginPath();
    if (!inverse) ctx.rect(torsoCx - extent * 2, -extent * 2, extent * 4, extent * 4);
    crownCapPath(ctx, pad);
    if (withBridge) bridgePath(ctx, false);
    ctx.clip('evenodd');
    ctx.translate(ox, oy);
  };
  // Draw something the crown trims. At full join strength the part above the
  // crown is simply cut away. While the join is FADING (joinAmount < 1, the
  // arm folding inward) the crown is drawn at partial alpha, and a cut made at
  // full strength under a half-drawn crown left a notch in the contour for the
  // whole fade window: the old cap gone, the new crown not yet there. So the
  // trimmed-off part is drawn back at the complementary alpha — the old
  // contour crossfades out exactly as the new one fades in.
  const withCrownTrim = (seated, draw, withBridge = false) => {
    if (!shoulderJoin?.trim) { draw(); return; }
    ctx.save(); clipShoulderCrown(seated, false, withBridge); draw(); ctx.restore();
    if (shoulderJoin.joinAmount < 1) {
      ctx.save(); clipShoulderCrown(seated, true, withBridge);
      ctx.globalAlpha *= 1 - shoulderJoin.joinAmount;
      draw(); ctx.restore();
    }
  };
  // Paint part of the join, faded as ONE layer when joinAmount < 1. Fading
  // fill and lighting separately shades the existing shoulder twice and
  // leaves a dark patch.
  const withJoinLayer = (paint) => {
    const { joinAmount } = shoulderJoin;
    let c = ctx;
    if (joinAmount < 1) {
      let layer = shoulderPreviewLayers.get(ctx);
      if (!layer) {
        const canvas = document.createElement('canvas');
        layer = canvas.getContext('2d');
        shoulderPreviewLayers.set(ctx, layer);
      }
      if (layer.canvas.width !== ctx.canvas.width) layer.canvas.width = ctx.canvas.width;
      if (layer.canvas.height !== ctx.canvas.height) layer.canvas.height = ctx.canvas.height;
      layer.setTransform(1, 0, 0, 1, 0, 0);
      layer.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      layer.setTransform(ctx.getTransform());
      layer.lineCap = ctx.lineCap; layer.lineJoin = ctx.lineJoin;
      c = layer;
    }
    paint(c);
    if (c !== ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha *= joinAmount;
      ctx.drawImage(c.canvas, 0, 0);
      ctx.restore();
    }
  };
  // THE BRIDGE FILL. Drawn straight after the torso and BEFORE anything worn
  // on it: body colour in the torso's own light across the notch and the
  // torso's outline band under the crown, and deep into where the arm will
  // paint over it. Nothing drawn later is covered by it — a strap over the
  // shoulder reaches the contour, the arm's fill meets it seamlessly because
  // it is the same colour in the same light underneath.
  const drawShoulderBridge = () => {
    if (!shoulderJoin) return;
    withJoinLayer((c) => {
      c.save();
      c.beginPath(); shoulderJoin.bridgePath(c, true);
      c.fillStyle = p.b; c.fill();
      const g = formRamps(ctx, torsoPath);
      if (g) {
        c.fillStyle = g.core; c.fill();
        c.fillStyle = g.lit; c.fill();
        if (g.spec) { c.fillStyle = g.spec; c.fill(); }
      }
      c.restore();
    });
  };
  // THE CROWN STROKE, last of all: the contour from T to the handover at b.
  const drawShoulderJoin = () => {
    if (!shoulderJoin) return;
    const { curve } = shoulderJoin;
    withJoinLayer((c) => {
      c.save();
      // BUTT cap. The arm's own outline resumes exactly at the handover point
      // (clipShoulderCrown cuts it at this stroke's inner edge before that point
      // and leaves it whole after), so the crown must stop dead there too: a
      // round cap would reach ow/2 past it, onto the arm's band, and OUTLINE
      // being translucent that overlap prints as a dark half-disc. The same
      // holds at T against the torso's own outline.
      c.beginPath(); curve(c);
      c.lineCap = 'butt';
      c.lineWidth = ow; c.strokeStyle = OUTLINE; c.stroke();
      c.restore();
    });
  };
  const drawFrontArm = () => {
    // Build the shared light in torso space BEFORE seating the arm. The arm,
    // cap and connecting curve must carry the same chest highlight; otherwise
    // the round arm root erases that highlight and reads as a darker disc.
    shoulderJoinRamps = smoothShoulderPreview ? formRamps(ctx, torsoPath) : null;
    // The victory routine is choreographed as a mirrored PAIR — fernwick's
    // hands clasp overhead, grumpos claps — so seating one arm of it breaks
    // the join. Left alone there.
    // Front-on stand and slide are mirrored pairs for the same reason: both
    // arms hang off the same hand targets, reflected about the body, and both
    // draw at the same depth. Seating one of them there drops the near hand
    // 0.02u below its twin and pulls it 0.022u inboard — every hero standing
    // with one arm visibly lower than the other. The seat is a NEAR-arm cue,
    // so it needs the arm to actually be staged in front: a turn, or a gait
    // that paints it over the torso.
    const seat = nearArmSeated;
    ctx.save();
    // The cannon takes the inboard seat but NOT the drop. The drop exists so a
    // normal shoulder does not pin to the torso's top corner, and a fleshy arm
    // fills the gap it leaves; the gun-arm is a bare pin that just hung below
    // the shoulder line instead. It sets its own joint height below.
    if (seat) ctx.translate(-sideF * ARM_SEAT_IN * u, (spec.cannon ? 0 : ARM_SEAT_DOWN) * u);
    if (spec.cannon) {
      // Only the FOREARM is ordnance. Run from the shoulder, the barrel was one
      // unbroken bar leaving the neckline — he had no arm at all, just a yellow
      // rod growing out of the chest panel, and recolouring the joint can't fix
      // a limb with no upper segment. So an ordinary upper arm hangs off the
      // shoulder in body grey and the gun hinges at the ELBOW.
      // It mounts on the NEAR (front) shoulder — the left one front-on. That is
      // the arm that already paints over the torso, so a barrel carried across
      // the chest reads as a limb held in FRONT of the body rather than one
      // buried in it, and the far shoulder is left free for an ordinary arm
      // drawn behind. The elbow is pushed forward below to keep the muzzle
      // clear of his own silhouette rather than lying flat on the status panel.
      const gunX = shF;
      // Both segments carry the SAME width — they are one limb. A 0.12u barrel
      // on a 0.075u upper arm read as a prop he was holding rather than as the
      // forearm itself. Declared up here because the joint height measures
      // itself against the limb's own gauge.
      const gunW = armW;
      // The joint sits against the SHOULDER LINE — the torso's own top edge —
      // rather than at armY, which is 0.06u under it before the near-arm seat
      // drops it another 0.02u. That left 0.043u of bare torso above a limb
      // only 0.075u thick, so the gun read as strapped to his ribs rather than
      // hung off his shoulder. Measured off torsoTop so it holds through every
      // pose's bob and the crouch's raised torso, and off gunW so it tracks the
      // gauge: 0.6 of a width down sits the joint just proud of the top edge
      // instead of pinned to the corner.
      const gunY = torsoTop + gunW * 0.6;
      const cheer = pose.kind === 'celebrate';
      const gt = pose.time || 0;
      const aiming = pose.menuAction === 'aim';
      const aimAmount = aiming
        ? Math.max(0, Math.min(1, pose.aimAmount == null ? 1 : Number(pose.aimAmount)))
        : 0;
      const shotFired = pose.shotFired !== false;
      const shotT = aiming ? Math.max(0, Math.min(0.3, Number(pose.actionTime) || 0)) : 0;
      // The projectile fires at t=0. Pull the barrel back sharply, then let it
      // recover over the same authored 0.3s window instead of using the global
      // run clock (which made recoil start at an arbitrary phase).
      const recoil = aiming && shotFired ? Math.max(0, 1 - shotT / 0.22) * 0.05 * u : 0;
      // Elbow: hanging at his side normally, lifted to shoulder height for the
      // victory routine so the salute fires over his head instead of out of his
      // hip. The barrel pivots about THIS point rather than the shoulder, which
      // is the whole reason the mount reads as an arm now.
      // Kept BELOW the shoulder in both, celebrate included: parked level with
      // it, the upper arm vanished behind the head and the barrel read as
      // growing out of his cheek. Dropped, the grey segment is visible and the
      // gun clearly hinges off the end of it.
      // Resting, it swings FORWARD across the body (the near arm draws over the
      // torso, so this reads as carried in front) and far enough that the
      // muzzle clears his other edge instead of resting on the status panel.
      // Celebrating, it swings OUTWARD off the shoulder so the raised gun ends
      // up beside the dome rather than across his own face.
      // Both offsets are sized to the arm's OWN bone (armSeg = 0.143u) rather
      // than dialled by eye. Resting: 0.085 forward by 0.115 down. Celebrating:
      // 0.06 out by 0.13 UP, so the upper arm lifts and the gun salutes off the
      // end of it. The old celebrate offset was 0.072u long on a 0.075u-wide
      // limb — shorter than its own width, so it drew as a bare disc at the
      // shoulder with no segment visible at all.
      // Written as armSeg times a UNIT direction, not as raw offsets: the
      // length then comes from the bone itself, so it can never drift off it
      // again, and it follows spec.armLen for free.
      // Resting direction pulled back from (0.59, 0.80) to (0.42, 0.91): the
      // upper arm hangs closer to vertical and the elbow sits further behind
      // the muzzle. Both components move together because this is a UNIT vector
      // scaled by armSeg — drop the forward term alone and the bone shortens
      // instead of rotating. The muzzle still clears his far edge by 0.06u.
      // Standing and airborne, the gun hangs down his OWN side instead — the
      // same arm-at-rest the free arm takes. The level carry below is rooted
      // on the near shoulder with the barrel aimed at +x, so the whole limb
      // lies diagonally across the torso: fine mid-run or crouched, where the
      // body's motion justifies the arm being brought up and across, but at
      // rest it read as an arm folded over his belly rather than ordnance
      // hanging off a shoulder.
      const hangGun = !cheer && (stand || jump);
      // 0.45 of the bone lands the elbow ON the rib edge, so the hanging gun
      // sits outside the status panel rather than lying across its corner, and
      // the muzzle ends up at the same width the free arm's hand hangs at —
      // the two arms then read as a matched pair at rest.
      // Actively aiming (the menu "aim" beat, and now the poke that fires it):
      // the elbow lifts to shoulder height and pushes out, so the level barrel
      // reads as raised and sighted rather than the same low, at-rest carry
      // the run cycle already uses — 'aim' used to only add a tiny recoil, so
      // firing looked identical to just standing there with the gun hanging.
      let elbowX, elbowY, aim;
      // The barrel IS his forearm, so it scales with the arm rather than
      // sitting at a fixed length: 0.73 * armL reproduces the tuned 0.19u at
      // the default reach and grows with spec.armLen.
      const barrel = armL * 0.73 - recoil;
      if (hangGun) {
        // Hanging at rest, reach for the EXACT point the plain arm's hand
        // settles at in its own "stand" branch above — same target, same
        // idle breathing sway — solved through the SAME joint() two-bone
        // solver every other limb in this rig bends through, so it hangs and
        // moves like his actual arm rather than a separately dialled prop.
        // Now that it draws in the same early pass as everyone else's front
        // arm (see the back-limb section below), the torso hides most of it
        // just like theirs — only the tip needs to land in the right place.
        let targetX, targetY;
        if (stand) {
          const standOut = heavy
            ? Math.abs(shF - shoulderCx) + 0.07 * u
            : Math.max(Math.abs(shF - shoulderCx) + 0.07 * u, torsoHalf + armW * 0.5 + 0.015 * u);
          const standHang = heavy ? 0.95 : 0.78;
          const sway = Math.sin((pose.time || 0) * 2 - 0.7) * 0.014 * u;
          targetX = shoulderCx + sideF * (standOut + sway);
          targetY = armY + armL * standHang - sway * 0.32;
        } else {
          // Airborne: the same hip-height reach as before — jump still draws
          // this in front (see drawFrontArm's call sites), so it isn't hidden
          // the way standing now is.
          targetX = shoulderCx + sideF * (torsoHalf + armW * 0.5 + 0.01 * u);
          targetY = hipY - 0.02 * u;
        }
        [elbowX, elbowY] = joint(gunX, gunY, targetX, targetY, armSeg, sideF, barrel);
        aim = Math.atan2(targetY - elbowY, targetX - elbowX);
      } else {
        const elbowOut = cheer ? sideF * 0.42
          : sideF * (0.42 + (0.52 - 0.42) * aimAmount);
        const elbowDown = cheer ? -0.91 : 0.91 + (-0.08 - 0.91) * aimAmount;
        elbowX = gunX + armSeg * elbowOut;
        elbowY = gunY + armSeg * elbowDown;
        // Celebrating, the cannon used to hold ONE welded aim for the whole
        // 2.6s routine while his free arm did every bit of the dancing — the
        // only hero whose victory read as a freeze-frame with a blinking
        // light on it. It now pivots at constant barrel length: rotation,
        // not a drifting endpoint, or the barrel telescopes as it swings.
        // Wide on the shimmy beat (his big move, so the gun dances with the
        // body), tighter on the signature bounce.
        const salutePreview = cm && cm.move === 'salute';
        const sweep = salutePreview
          ? Math.sin(cm.q * Math.PI * 4) * 0.09
          : cm && cm.move === 'shimmy'
            ? Math.sin(cm.q * Math.PI * 8) * 0.5
            : Math.sin(gt * 4.2) * 0.26;
        // Resting, the barrel sits level down the TRAVEL axis — always
        // forward, whichever shoulder carries it. Celebrating, it salutes
        // from straight up (-PI/2) canted OUTBOARD onto the gun's own side.
        // Stated as an offset from vertical rather than an atan2 of two magic
        // components because the sweep has to be reasoned about in the same
        // units: at 0.55 out, even the sweep's full +0.5 swing inboard stops
        // a hair past vertical instead of carrying the barrel across his own
        // face.
        aim = cheer ? -Math.PI / 2 + sideF * (salutePreview ? 0.24 : 0.55) + sweep : 0;
      }
      const muzzleX = elbowX + Math.cos(aim) * barrel;
      const muzzleY = elbowY + Math.sin(aim) * barrel;
      // The WHOLE limb is the weapon: one articulated gun-arm hinged at the
      // elbow, rather than an arm that turns into a gun partway down. Grey over
      // yellow gave the eye no edge to read the joint by on a limb of constant
      // width — it blurred into a two-tone smear over the chest. The upper
      // segment now takes p.arm, one step down from the barrel's p.a: enough
      // separation to tell the segments apart, close enough that they stay one
      // object. Falls back to p.a for any palette without the key.
      limb(ctx, gunX, gunY, elbowX, elbowY, gunW, p.arm || p.a, ow);
      limb(ctx, elbowX, elbowY, muzzleX, muzzleY, gunW, p.a, ow);
      if (!lod) {
        // Banding down the barrel, in the same translucent ink as the bore and
        // the hinge so every mechanical mark on him is one material. The bands
        // need no clip: the barrel is a STROKED line, so its shaft is exactly
        // gunW across, and a perpendicular chord of that length sits flush
        // inside its edges. Butt caps for the same reason — round ones would
        // add half a lineWidth at each end and poke out both sides. Kept off
        // the ends, clear of the muzzle bore and the elbow's round cap.
        const nx = Math.cos(aim), ny = Math.sin(aim);
        const half = gunW * 0.49;
        ctx.save();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = hair(0.6, ow * 1.3);
        ctx.beginPath();
        for (const f of [0.42, 0.6, 0.78]) {
          const bx = elbowX + nx * barrel * f, by = elbowY + ny * barrel * f;
          ctx.moveTo(bx + ny * half, by - nx * half);
          ctx.lineTo(bx - ny * half, by + nx * half);
        }
        ctx.stroke();
        ctx.restore();
      }
      // Hinge pin: the one mark that says the bend is a joint and not a kink in
      // a bent pipe. Same translucent ink as the bore, so they read as a set.
      if (!lod) outlined(ctx, OUTLINE, hair(0.5, ow * 0.4), (c) => c.arc(elbowX, elbowY, gunW * 0.34, 0, Math.PI * 2));
      // Bore sized off the barrel, not a fixed 0.045u — at the slimmer gauge a
      // fixed bore stood proud of the barrel it is supposed to be a hole in.
      outlined(ctx, OUTLINE, hair(0.6, ow * 0.5), (c) => c.arc(muzzleX, muzzleY, gunW * 0.5, 0, Math.PI * 2));
      if (cheer && !lod) {
        // Victory salute: he empties a few rounds into the sky. The pellets are
        // derived from the clock rather than tracked as state — three in flight
        // at once, each a third of a cycle behind the last, so one leaves the
        // muzzle every ~0.19s and they climb evenly spaced. Each shrinks and
        // fades as it travels, which is what sells distance at this scale.
        // They fly along the CURRENT aim rather than the angle they were fired
        // at: the sweep moves slowly enough that the two differ by well under a
        // pixel at hero size, and honouring per-shot angles would mean redoing
        // the whole rig transform (hop, tilt, spin) once per pellet.
        const SHOT = 0.56;
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const q = (gt / SHOT + i / 3) % 1;
          const d = (0.07 + q * 0.5) * u;
          ctx.globalAlpha = Math.max(0, 1 - q * 1.2);
          dot(ctx, muzzleX + Math.cos(aim) * d, muzzleY + Math.sin(aim) * d, 0.03 * u * (1 - q * 0.4), p.w);
        }
        ctx.restore();
        // Flash on the shot itself rather than a free-running blink, so the
        // muzzle lights exactly when a round leaves it. It also rides the sweep
        // instead of the fixed offset that only lined up with the old aim.
        if ((gt / SHOT * 3) % 1 < 0.3) {
          dot(ctx, muzzleX + Math.cos(aim) * 0.07 * u, muzzleY + Math.sin(aim) * 0.07 * u, 0.05 * u, p.a);
        }
      } else if (aiming && shotFired && shotT < 0.09) {
        // This is the real articulated endpoint; it cannot drift away from the
        // cannon when the shoulder, elbow or barrel length changes.
        dot(ctx, muzzleX + Math.cos(aim) * 0.07 * u, muzzleY + Math.sin(aim) * 0.07 * u, 0.05 * u, p.w);
        dot(ctx, muzzleX + Math.cos(aim) * 0.055 * u, muzzleY + Math.sin(aim) * 0.055 * u, 0.025 * u, p.a);
      }
      // NO shoulder cap on the gun-arm. The cap is a 0.065u ellipse sized for a
      // normal arm — 1.73x this limb's own half-width — and it only disappears
      // on body-coloured arms, where it lands inside the torso. In the gun's
      // yellow it was simply a ball stuck on his shoulder, wider than the arm
      // hanging off it. The limb's own round cap already closes the root at
      // exactly the right gauge, which on a robot reads as the shoulder joint.
    } else {
      if (armDimsF) muscleLimb(ctx, shF, armYF, handF[0], handF[1], armSeg, armSegF, elbF, p.s, ow, armDimsF);
      else {
        withCrownTrim(true, () => limb2(ctx, shF, armYF, handF[0], handF[1], armSeg, elbF, armWF, armFill, ow, armWF, true, armSeg, shoulderJoinRamps, shoulderLightOffset), true);
      }
      // For a SLEEVED hero the cap goes first and the sleeve covers it. In the
      // shipped order — cap last, after everything — it painted on top of the
      // puff, and a disc lit on the torso's ramp sitting on a sleeve lit on its
      // own is a visible circle on her shoulder. Order is the whole fix: the
      // cap buries the arm's root, the sleeve covers the shoulder, and they
      // have to happen in that order for both to disappear. Everyone else keeps
      // the shipped order exactly (see the call at the end of this block).
      // A SLIM sleeve gets no shoulder cap. The cap is a disc a third wider
      // than the arm, painted in the sleeve's own colour — under a puff it
      // disappears, but under a sleeve cut to the arm's width it is the widest
      // thing on the shoulder and it is what still read as chunky after the
      // sleeve itself had been slimmed twice. The limb's own round root closes
      // the joint at exactly the arm's gauge, which is all a slim sleeve wants.
      if (spec.puffs && !spec.shortSleeve) shoulderCap(shF, armYF);
      drawPuff(shF, armYF, handF, armSeg, elbF, armSegF);
      if (wrenchAngle != null) drawWrench(ctx, handF[0], handF[1], wrenchAngle, u, ow);
      // Gun under the hand, flash over it. The prop goes down first so the
      // glove covers the top of the grip and reads as holding it; the flash is
      // the last mark on the figure because it is light, not an object.
      if (pistolAngle != null) drawPistol(ctx, handF[0], handF[1], pistolAngle, u, ow, p);
      // The carried stick, under the glove for the same reason the gun is: the
      // hand has to close over it or it reads as floating alongside.
      if (spec.stick && !stickThrown) drawHeldStick(ctx, handF[0], handF[1], stickAngle, u, ow);
      // Drawn from the bundle: in hand only between the pull and the release.
      else if (caneInHand) drawHeldStick(ctx, handF[0], handF[1], throwStickAngle, u, ow, caneScale(pose.stickParity));
      if (spec.ranged && pose.menuAction === 'aim' && !propOverHead && !propBehind) drawRangedHeld(ctx, spec, handF, handB, shF, armY, pose, u, ow, p, wrenchCarryAng);
      handDeco(handF[0], handF[1], 0, shF, armYF, elbF);
      if (pistolAngle != null && !lod) {
        const shotT = Math.max(0, Math.min(0.3, Number(pose.actionTime) || 0));
        if (shotT < 0.09) {
          // Measured off drawPistol's own bore, transformed by the same angle
          // the prop was drawn at — the flash cannot drift off the muzzle when
          // the recoil rotates the gun, which is the failure the cannon's
          // comment records from its own fixed-offset version.
          const ca = Math.cos(pistolAngle), sa = Math.sin(pistolAngle);
          const mx = handF[0] + ca * 0.174 * u + sa * 0.04 * u;
          const my = handF[1] + sa * 0.174 * u - ca * 0.04 * u;
          dot(ctx, mx + ca * 0.055 * u, my + sa * 0.055 * u, 0.05 * u, p.w);
          dot(ctx, mx + ca * 0.04 * u, my + sa * 0.04 * u, 0.025 * u, p.a);
        }
      }
      if (kiBlast) {
        // Concentric and additive: a hot white core, a saturated body, and a
        // soft corona that carries most of the size. One flat disc reads as a
        // ball she is holding; the falloff is what makes it light.
        const [kx, ky, grow, kq] = kiBlast;
        const r = (0.07 + 0.075 * grow) * u;
        const core = p.ki || '#bfefff';
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.34 * grow * (1 - kq * 0.35);
        dot(ctx, kx, ky, r * 1.9, core);
        ctx.globalAlpha = 0.7 * grow;
        dot(ctx, kx, ky, r * 1.15, core);
        ctx.globalAlpha = 0.95 * grow;
        dot(ctx, kx, ky, r * 0.6, '#ffffff');
        ctx.restore();
        // NO trailing motes. There were two, to say the ball was travelling —
        // and they were the circle on her shoulder: additive cyan dots walking
        // BACKWARD from the orb, which on this pose means straight across her
        // body, lifting the blue underneath into a pale disc. Pulling them in
        // and down only moved the disc from her shoulder to her chest, because
        // the orb sits in front of her sternum and everything "behind" it is
        // her. They also had the physics backwards: the ball is still on her
        // palms, being pushed — it has no wake yet. The corona already says
        // "energy", and it says it without printing on the costume.
        //
        // Diagnosis worth keeping: this survived the key light being switched
        // off, which ruled out the specular, and a pixel scan across the
        // shoulder found the body's #2f6fd0 lifted to #5fa9e7 exactly where the
        // mote landed. Three separate geometry fixes had been aimed at it
        // first, none of which could have worked.
      }
      if (!spec.puffs) {
        withCrownTrim(true, () => shoulderCap(shF, armYF, undefined, shoulderJoinRamps, shoulderLightOffset), true);
      }
    }
    ctx.restore();
    drawShoulderJoin();
  };

  // The axe is the DEEPEST layer — slung flat on his back, so every limb
  // draws over it: mid-celebrate and mid-jump the arms swing up across the
  // blade, and hidden behind it they read as amputated at the shoulder.
  // `axeReady` is opt-OUT, not opt-in: the axe is part of him, and only the run
  // has any reason to take it off his back (thrown, or still recharging). Every
  // other draw site — the concourse, credits, the tutorial — was silently
  // shipping a Grumpos with no axe simply by not knowing the flag existed.
  if (spec.back === 'axe' && !pose.axeThrown && pose.axeReady !== false) {
    // Anchored to the SHOULDER, not the head: the blade peeks over the
    // deltoid beside the beard. Head-anchored, the handle vanished behind
    // the skull and the blade sat at crown height — an axe growing out of
    // his head. The whole thing shifts forward with the airborne/running
    // body (the run lean moves the torso by leanX * 0.5, and the jump pose
    // throws the shoulders forward the same way); pinned to center-frame x,
    // the root slides off the shoulder in both.
    // `axeArt.out` slides the axe outboard, in u — away from the shoulder it is
    // pinned to, so more of the shaft clears his body instead of being buried
    // in it. A third judgement, separate from the haft's angle and the axe's
    // height: those turn and raise it, this moves it clear.
    const axx = (run || jump ? 0.025 : 0) * u - ((spec.axeArt && spec.axeArt.out) || 0) * u;
    // Lifted clear of the near arm: on the depth rig that arm swings up the
    // same screen-left side the axe is slung on, and at the top of the upswing
    // the elbow was grazing the haft.
    // `axeArt.lift` raises where the axe is pinned, in u — it rides UP the
    // shoulder toward the head rather than changing its angle. Angle and
    // height are different judgements: a steeper haft turns the axe, a lift
    // moves the whole thing, and the row that chose the angle could not have
    // told them apart while both were baked into one anchor.
    const axy = shoulderY - (0.05 + ((spec.axeArt && spec.axeArt.lift) || 0)) * u;
    paintBackAxe(ctx, p, u, ow, lod, axx, axy, spec.axeArt);
  }

  // The pack is slung on his back, so like the axe it belongs UNDER every
  // limb. Drawn after the arms (where it used to sit) it only looked right in
  // the poses whose near arm paints in the front pass — run and jump. Standing
  // and celebrating put both arms in the back pass below, and the pack landed
  // on top of the arm it should be hanging behind.
  // The shield is off his back for the WHOLE reworked victory routine, not
  // just its second beat: swapping it between back and hands at the seam
  // between the two halves popped it across the body in a single frame.
  if (spec.back === 'pack') {
    // A day pack, slung so only its outboard half clears the body. Drawn wide
    // enough to show either side of a 0.3u torso it stops being luggage and
    // becomes a second body, so it is deliberately narrow and offset — the
    // silhouette gains a hump on her back and nothing else.
    // Measured off torsoTop and a bobbing hip line, so it rides the run with
    // the body it is strapped to rather than hanging in frame behind her.
    const packX = torsoCx - torsoHalf * 0.5;
    const packTop = torsoTop + 0.045 * u;
    const packBot = hipY - 0.03 * u + bob;
    outlined(ctx, p.w, ow, (c) =>
      roundRectPath(c, packX - 0.23 * u, packTop, 0.26 * u, packBot - packTop, 0.055 * u));
    if (!lod) {
      // Lid and buckle. Two marks: at hero size a third is speckle.
      outlined(ctx, p.p, hair(0.5, ow * 0.6), (c) =>
        roundRectPath(c, packX - 0.23 * u, packTop, 0.26 * u, 0.085 * u, 0.03 * u));
      dot(ctx, packX - 0.1 * u, packTop + 0.105 * u, 0.022 * u, p.a);
    }
  }
  // THE WORN WRENCH (lab). Worn unless it is in his hand: the throw takes it on
  // the first frame of the reach, and the melee swing takes it outright. `twin`
  // is the exception — he carries a spare, so the belt keeps one either way.
  const wrenchAt = spec.wrenchCarry && !lod && !slide
    ? wrenchCarryAt(spec, u, { torsoCx, torsoHalf, torsoTop, hipY, bob, run, phase: pose.phase })
    : null;
  const wrenchThrowing = pose.menuAction === 'aim'
    && (spec.throwStyle || RANGED_GESTURES[spec.ranged] === 'throw');
  const wrenchWorn = !!wrenchAt
    && (spec.wrenchCarry === 'twin' || !(wrenchThrowing || wrenchAngle != null));
  if (wrenchAt && wrenchAt.behind) {
    // A back-hip carry is a back-pass piece, under every limb, for the reason
    // the pack above records: painted after the arms it lands on top of the one
    // it is meant to hang behind.
    if (wrenchWorn) drawWornWrench(ctx, spec, p, u, ow, wrenchAt);
    // ...and the held wrench while the reach still has it behind the body, so
    // it crosses from back to front on the hand rather than on one frame.
    if (propBehind && wrenchThrowing) drawRangedHeld(ctx, spec, handF, handB, shF, armY, pose, u, ow, p, wrenchCarryAng);
  }
  if (spec.princessCostume) {
    paintPrincessCape(ctx, spec, p, u, ow, { px: torsoCx, torsoHalf, shoulderY, hipY, legL, bob, run, jump, t: pose.time || 0 });
  }
  if (spec.flowHair && !slide) {
    paintFlowHair(ctx, spec, p, u, ow, lod, { px: torsoCx, headY, shoulderY, hipY, legL, bob,
      run, jump, t: pose.time || 0, phase: pose.phase || 0 });
  }
  if (spec.back === 'quiver') {
    // A QUIVER instead of the round shield, for the archer. The shield was a
    // 0.11u disc sitting just behind his drawing shoulder, and at full draw it
    // landed beside the hand on the string and read as a second hand; a tall
    // case is the opposite shape in exactly that spot, and it is also the
    // answer to where the arrows come from. The kit itself is paintQuiverKit,
    // shared with the slide so he never loses it mid-move.
    const aiming = spec.ranged === 'bow' && pose.menuAction === 'aim';
    // The held bow while it is behind him (reach and sling), under the case.
    if (propBehind && aiming) drawRangedHeld(ctx, spec, handF, handB, shF, armY, pose, u, ow, p);
    // FRONT-ON the whole kit tucks in behind the torso. Standing, the case
    // and the slung bow sat a full 0.07u proud of her side and were the
    // biggest things on the silhouette after the hair — in a pose where they
    // are meant to be on her back. Pulled in, only a strip of case and the
    // bow's tips show past her, which is what a thing worn behind you looks
    // like from the front. The run keeps its position: turned, her back is a
    // real edge for it to sit on. `quiverTuck` is the standing pull, in u.
    // Half the tuck running: turned, her back is a real edge for the kit to
    // sit on, but it still stood further off her than a worn thing should.
    const tuck = (spec.quiverTuck ?? 0) * u * (stand ? 1 : 0.5);
    const slung = bowSlungAt(torsoHalf, shoulderY, u);
    const quiverLift = spec.quiverMount === 'loop' ? 0.035 * u : 0;
    paintQuiverKit(ctx, spec, p, u, ow, lod, {
      qx: -torsoHalf - 0.07 * u + tuck, qTop: shoulderY - 0.06 * u - quiverLift, qBot: shoulderY + 0.3 * u - quiverLift,
      bow: aiming ? null : [slung[0] + tuck, slung[1]],
    });
    if (spec.quiverMount === 'loop' && !slide) {
      // Join the actual case to the body-side strip in the back pass. Both
      // ends share the front strip's coordinates, so no loose anchor floats
      // beside the shoulder as the sleeve moves.
      const qx = -torsoHalf - 0.07 * u + tuck;
      const sx = torsoCx - torsoHalf * 0.48;
      ctx.save();
      ctx.strokeStyle = p.f; ctx.globalAlpha *= spec.quiverStrapOpacity ?? 0.85;
      ctx.lineWidth = (spec.quiverStrapWidth ?? 0.030) * u;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(qx + 0.045 * u, torsoTop + 0.016 * u);
      ctx.lineTo(sx - 0.052 * u, torsoTop + 0.016 * u);
      // Short lower attachment at the underarm return's own height.
      // No length runs down the face of the quiver.
      ctx.moveTo(qx + 0.065 * u, torsoTop + (jump ? 0.13 : 0.16) * u);
      ctx.lineTo(sx - 0.082 * u, torsoTop + (jump ? 0.13 : 0.16) * u);
      ctx.stroke(); ctx.restore();
    }
  }
  if (spec.bundle) {
    // WHERE IT SITS is the bake-off. `back` puts it high behind the shoulder
    // like Fernwick's case; `hip` rides the back of the belt; `sling` hangs it
    // low on a cross-strap. All three are back-pass pieces, so the torso and
    // the near arm paint over them and the bundle reads as worn rather than
    // held in front. The front-on tuck is the quiver's own trick: standing, a
    // worn thing that stands proud of the silhouette reads as carried.
    // Measured INWARD from the torso edge, not outward: a worn thing sits
    // against the body. Front-on it tucks further still, the quiver's own trick
    // — standing, anything proud of the silhouette reads as carried.
    // HEIGHTS quoted from the rig's own landmarks. The belt was placed at
    // `shoulderY + 0.44u`, which lands at -0.06u — well BELOW hipY (-0.276u)
    // and most of the way to the floor, so the band drew across his shins. The
    // waist is hipY; there is no reason to arrive at it by adding to the
    // shoulder.
    //
    // OUTBOARD by a hair, not inboard. Tucked inside the torso edge the bag was
    // simply behind him and invisible; Fernwick's quiver sits at
    // -torsoHalf - 0.07u for exactly this reason. This is half that — near the
    // body as asked, but still clearing the silhouette.
    const btuck = (spec.bundleTuck ?? 0.03) * u * (stand ? 1 : 0.4);
    const at = {
      // QUIVER: high behind the shoulder, upright, canes standing above it.
      quiver: { bx: -torsoHalf - 0.03 * u + btuck, by: shoulderY + 0.1 * u, lean: 0, belt: false },
      // The HIP kinds are not here: they hang on the FRONT hip and draw in the
      // front pass (see below). Placed back here they sat on his backside,
      // because this whole cast faces +x and -torsoHalf is behind him.
      // BACKPACK: a bigger body sat square on his back, canes standing out of
      // the top. Its shoulder straps are NOT drawn here — they cross the chest,
      // so they belong to the front pass (see spec.bundle === 'backpack'
      // below). A pack whose straps are behind the torso is a box floating
      // behind a hero.
      backpack: { bx: -torsoHalf - 0.02 * u + btuck, by: shoulderY + 0.18 * u, lean: 0, belt: false, pack: true },
    }[spec.bundle];
    // One cane leaves the bundle while it is in the air, which is the same
    // bookkeeping the held stick does — the supply is visibly finite.
    if (at) paintBambooBundle(ctx, spec, p, u, ow, lod, { ...at, count: pose.axeThrown ? 2 : 3 });
  }
  if (spec.back === 'shield' && !celShield && !pose.shieldThrown
    && !(spec.ranged === 'shield' && pose.menuAction === 'aim')) {
    outlined(ctx, p.w, ow, (c) => c.arc(-torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.11 * u, 0, Math.PI * 2));
    dot(ctx, -torsoHalf - 0.08 * u, shoulderY + 0.06 * u, 0.035 * u, OUTLINE);
  }

  // back limbs — and, front-on, the front-side pair too: a front limb painted
  // over the torso roots visibly on the chest while its mirror hides behind
  // the body, so a symmetric pose reads lopsided. Exception: grumpos's
  // celebrate clap, whose arms BOTH draw in the front pass — an arm back here
  // reads as clapping from behind his back.
  // Cling deliberately does NOT join this group, though it was drawn here for a
  // while. Both arms in front puts the far one straight across the eyes on the
  // way to a pole that stands off to the side. Left in the ordinary split — far
  // arm in the back pass, near arm in front — the crossing limb passes BEHIND
  // the head and only the near arm shows, which is what a body turned toward
  // something it is holding actually looks like.
  // Celebrations whose arms belong IN FRONT of the body. Standing poses draw
  // both arms in the back pass, which is right for arms at rest — but a
  // celebration that MEETS its hands in front of the chest (Grumpos's clap,
  // Kiko's salute) puts them behind the torso and shows nothing at all.
  const clapFront = (pose.kind === 'celebrate' && (
    id === 'grumpos'
    || id === 'kiko'
    || (reworkedCelebration && (id === 'dolores' || id === 'fernwick'))
  ));
  const raisedArmStudyFront = pose.kind === 'celebrate'
    && reworkedCelebration
    && (id === 'lorenzo' || id === 'gary');
  // Dolores' counter idle draws both arms in the FRONT pass (over the apron)
  // so the hips-beat hands read on the bib — the reference-approved look.
  const armsInFront = stand && !!pose.armsInFront;
  if (!clapFront && !armsInFront && !bowArmFront) {
    // B33P needs no special case here any more. With the cannon moved onto the
    // NEAR shoulder it is simply the front arm, drawn in the front pass like
    // everyone else's; his far shoulder carries an ordinary arm on the ordinary
    // target. The old arrangement — gun on the far shoulder but painted in
    // front — forced the free arm to be re-rooted onto the near side with a
    // borrowed swing, which is the tangle this replaces.
    if (armDimsB) muscleLimb(ctx, shB, armY, handB[0], handB[1], armSeg, armSegF, elbB, recede(p.s, farShade), ow, armDimsB);
    else limb2(ctx, shB, armY, handB[0], handB[1], armSeg, elbB, armWB, recede(armFill, farShade), ow, armWB, true);
    drawPuff(shB, armY, handB, armSeg, elbB, armSegF, farShade);
    if (pistolAngleB != null) drawPistol(ctx, handB[0], handB[1], pistolAngleB, u, ow, p, farShade);
    handDeco(handB[0], handB[1], farShade, shB, armY, elbB);
    // Standing, the cannon now hides behind the torso here same as every
    // other hero's front arm does — only the hip-height muzzle tip clears the
    // silhouette, matching how a plain hand peeks out at rest. It used to be
    // exempted and always drawn in front instead, which is what read as a
    // separate prop bolted to his chest rather than an arm attached to him.
    // `armsReachFront` is the ordinary split, not both arms in front: the far
    // arm has already gone down above, behind the torso, and the near one is
    // held back for the front pass below. Standing normally paints both here
    // because arms at rest are behind the body — a reach is not at rest.
    if (stand && !raisedArmStudyFront && !armsReachFront) drawFrontArm();
  }
  limb2(ctx, hipAt(-1), legRootYB, footB[0], footB[1] - ankleLift, thighSeg, kneeB, legWB, recede(legFill, farShade), ow, legWB, false, shinSeg);
  shortsLeg(hipAt(-1), legRootYB, footB, kneeB, legWB, recede(p.p, farShade));
  bootShaft(hipAt(-1), legRootYB, footB, kneeB, legWB, recede(footFill, farShade));
  outlined(ctx, recede(footFill, farShade), hair(0.6, ow * 0.8), (c) => c.ellipse(footB[0] + shoeB.dx, footB[1] - ankleLift + shoeB.dy, footRx, footRy, ankleB, 0, Math.PI * 2));
  // The far holster recedes with the leg it is on, like every other far-side
  // piece — an un-pushed one reads as a bright tag floating off the back thigh.
  if (spec.holster === 'thigh') thighHolster(hipAt(-1), legRootYB, footB, kneeB, legWB, farShade, false);
  if (frontLegs) drawFrontLeg();

  // Grumpos needs an actual pelvis between torso and thighs. Previously each
  // leg simply ended at an independent point inside the belly; the skirt hid
  // that missing anatomical bridge. The pelvis sits over the far thigh and
  // under the torso/near thigh, giving both legs a continuous socket mass.
  if (id === 'grumpos' && turned && !slide) {
    const pelvisCx = (hipAt(1) + hipAt(-1)) * 0.5;
    const pelvisRx = Math.max(waistHalf * 0.94, legW);
    const pelvisRy = 0.075 * u;
    const pelvisY = legRootY - 0.012 * u;
    ctx.fillStyle = p.p;
    ctx.beginPath();
    ctx.ellipse(pelvisCx, pelvisY, pelvisRx, pelvisRy, 0, 0, Math.PI * 2);
    ctx.fill();
    // Another opaque bridge piece over shaded neighbours — same rule as the
    // shoulder and hip caps.
    const gp = fieldRamps(ctx);
    if (gp) { ctx.fillStyle = gp.core; ctx.fill(); ctx.fillStyle = gp.lit; ctx.fill(); }
    // Only the exposed lower rim gets an outline. A full oval would draw a
    // seam across the abdomen and make the pelvis another stuck-on object.
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = hair(0.55, ow * 0.7);
    ctx.beginPath();
    ctx.ellipse(pelvisCx, pelvisY, pelvisRx, pelvisRy, 0, 0, Math.PI);
    ctx.stroke();
  }

  // torso
  // Deltoid caps go UNDER the torso so only their outer arcs clear it: they
  // broaden the shoulder line without drawing a seam across the chest.
  if (spec.delts) {
    const dr = torsoHalf * 0.44;
    for (const sgn of [-1, 1]) {
      outlined(ctx, p.b, ow * 0.65, (c) => c.arc(torsoCx + sgn * torsoHalf * 0.86, torsoTop + dr * 0.75, dr, 0, Math.PI * 2), 'rgba(26,16,40,0.15)');
    }
  }
  // The puffed sleeve used to be drawn here, as a disc bolted to the torso at
  // each shoulder. It is a GARMENT ON THE ARM, so it now rides the arm — see
  // drawPuff, called from each arm pass. Mounted on the body it stayed put
  // while the limb swung out from under it, which is exactly why it read as
  // part of her shoulder rather than as a sleeve.
  // The heavy torso is bare skin: thinner and fainter still than the arms'
  // SKIN_OUTLINE — it is the biggest uninterrupted shape on him, and at full
  // weight its rim dominates the sprite the way no limb's can.
  // Both overlapping forms must stop at the shared crown. Trimming only the
  // arm leaves the rounded torso corner poking above it on inward frames.
  withCrownTrim(false, () => outlined(ctx, p.b, heavy ? ow * 0.65 : ow, torsoPath, heavy ? 'rgba(26,16,40,0.15)' : OUTLINE));
  drawShoulderBridge();
  // A princess costume whose bodice is not the sleeve colour repaints the
  // torso HERE, with the torso and before either arm, so a puffed sleeve
  // drawn later sits on top of it instead of underneath.
  if (spec.princessCostume && p.bodice && p.bodice !== p.b && !slide) {
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.fillStyle = p.bodice;
    ctx.fillRect(torsoCx - torsoHalf * 1.6, torsoTop - 0.06 * u, torsoHalf * 3.2, torsoBot - torsoTop + 0.12 * u);
    ctx.restore();
    // The BODICE stays one flat green. The gores used to run the whole dress,
    // and above the waist the washes read as a stripe pattern on her chest
    // rather than as panels — there is no drape up there for them to describe.
    // The skirt keeps them, where the cloth actually moves.
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = ow;
    ctx.beginPath(); torsoPath(ctx); ctx.stroke();
  }
  // Where the waist is, for anyone who needs it. The belt rides the run bob
  // like the torso does — pinned to a static hipY it detaches from a bobbing
  // body — so trousers and belt have to share one number or the colour seam
  // and the strap that is meant to cover it drift apart mid-stride.
  // `beltDrop` lowers it, in u. A belt worn on the hips rather than the waist
  // is what opens a sliver of midriff under a top that has not moved — and it
  // moves the TROUSER FILL with it, because they are one seam: the belt exists
  // to sit on that colour change and hide it, so anything that separates the
  // two puts a line of shirt colour under the leather.
  const beltY = beltLineY(spec, hipY, bob, u);
  if (spec.tank) {
    // A SLEEVELESS TOP: the shoulder is WHOLE, and the only cut in it is the V
    // at the throat. What used to be here was a singlet — two narrow straps
    // with an armhole scooped out around each one — and the straps were the
    // problem. The torso is 0.3u across, so a strap with skin either side of it
    // is one or two pixels of each: at every size that ships, the strap lost
    // and the skin won, and what was left was a pale wedge over each shoulder
    // that changed shape with the arm. Worst on the far side, where the arm
    // swings away and the wedge is attached to nothing, and worst of all in the
    // air — a bite out of her top rather than a bare shoulder.
    //
    // The fix is to stop drawing the armhole and let the ARM be it. Her arms
    // are already bare skin rooted at the shoulder, so a shirt that runs to the
    // shoulder's edge meets them exactly where a real armhole would, and the
    // boundary is a limb's contour instead of a cut that has to be redrawn
    // every pose. The front-on shoulderCap is skipped for exactly this reason
    // (see above) — the arm's own round root is the armhole's edge, and a cap
    // straddling it can only print skin onto the shirt or shirt onto the skin.
    //
    // Painted as skin over the shirt and clipped to the torso, like the trouser
    // fill and the midriff: the silhouette never moves, only the colour map.
    //
    // REJECTED (2026-08-31): keeping a shallow, wide-strapped armhole that only
    // nipped the outer corner. Cleaner than the singlet and all but identical
    // to this at lane size, but the nip left a small chip in the shirt's
    // shoulder on the run and the celebrate, and it bought nothing the arm's
    // own edge was not already saying. Do not re-cut the armhole.
    // The V is cut on the torso's centre line, which is right at rest and WRONG
    // in a run — not because it moves, but because the shirt around it does.
    // The depth rig roots the near arm wide and swings it across her chest, so
    // most of the shirt's left half is behind an arm for most of the cycle:
    // what is left to read is the strip from the arm's edge to the right
    // shoulder, and a V on the true centre sits near the LEFT edge of it and
    // looks hung off-square. So the run fakes it — 0.02u toward the side that
    // is still showing, which lands the V near the middle of the visible olive
    // without letting it drift far enough from centre to read as a mistake at
    // rest. Only the run: standing, the whole shirt is visible and the true
    // centre is the right one.
    //
    // Retuned from 0.02u once the cast-wide head nudge came out (see drawHead's
    // call below). That nudge had every face sitting 0.01u right of its body,
    // so half of what the V was chasing was the HEAD being off, not the shirt —
    // with the face back on centre the same 0.02u overshoots and the V reads
    // right of her chin on the phases where the arm swings low and uncovers the
    // chest. 0.015u is what is left once the real offset is gone.
    const px = torsoCx + (run && !turned ? 0.015 * u : 0);
    const top = torsoTop - 0.02 * u;
    const vHalf = torsoHalf * 0.32;
    const vDepth = torsoTop + (torsoBot - torsoTop) * 0.32;
    // The neckline — deep, and cut as a soft-shouldered V rather than a hard
    // wedge: straight walls to a point put a spike in the middle of her chest.
    const throat = (c) => {
      c.moveTo(px - vHalf, top);
      c.quadraticCurveTo(px - vHalf * 0.42, vDepth * 0.55 + torsoTop * 0.45, px, vDepth);
      c.quadraticCurveTo(px + vHalf * 0.42, vDepth * 0.55 + torsoTop * 0.45, px + vHalf, top);
    };
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.fillStyle = p.s;
    ctx.beginPath();
    throat(ctx);
    ctx.lineTo(px - vHalf, top);
    ctx.closePath();
    ctx.fill();
    if (!lod) {
      // Skin against a mid-value top is a weak edge — the same problem the crop
      // hem has — so the cut gets a hairline or the garment's shape is left to
      // be inferred.
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.45, ow * 0.6);
      ctx.beginPath();
      throat(ctx);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (spec.crop) {
    // A cropped top: bare midriff between the hem and the waistband. Painted
    // as skin over the torso and then overwritten from the belt down by the
    // trouser fill below, so the three bands come out of two fills and the
    // silhouette never moves. `crop` is where the hem sits between the
    // shoulders and the belt — 0.6 is a short top, 0.85 a sliver.
    //
    // Two colours meeting with no line between them is the whole risk here: at
    // hero size a skin-to-khaki seam has barely a value step across it, so the
    // hem gets a hairline of its own or the top just fades into the shorts.
    const hemY = torsoTop + (beltY - torsoTop) * Math.max(0, Math.min(1, spec.crop));
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.fillStyle = p.s;
    ctx.fillRect(torsoCx - torsoHalf * 1.2, hemY, torsoHalf * 2.4, torsoBot - hemY + 0.1 * u);
    if (!lod) {
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.45, ow * 0.6);
      ctx.beginPath();
      ctx.moveTo(torsoCx - torsoHalf, hemY);
      ctx.lineTo(torsoCx + torsoHalf, hemY);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (spec.pants) {
    // Below the waist in the LEG colour, so the lower body reads as trousers
    // rather than as a shirt worn long. Clipped to the torso, so the silhouette
    // is untouched — this is paint, not geometry — and drawn before the belt,
    // which then sits on the seam and hides it. It runs past torsoBot on
    // purpose: the pelvis and leg roots are drawn under the torso and the fill
    // has to reach them, or a sliver of shirt colour survives at the crotch.
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.fillStyle = p.p;
    ctx.fillRect(torsoCx - torsoHalf * 1.2, beltY, torsoHalf * 2.4, torsoBot - beltY + 0.1 * u);
    ctx.restore();
  }
  if (turned && !slide) {
    // Shade the receding far side. Grumpos's body and skin share a colour, so
    // using skin here was invisible and left his torso reading front-on.
    const side = -nearSign;
    const sideFill = p.p;
    const sideWidth = torsoHalf * (0.2 + 0.16 * turnDepth);
    const edge = torsoCx + side * torsoHalf * 0.9;
    const inner = edge - side * sideWidth;
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.globalAlpha *= 0.42;
    ctx.fillStyle = sideFill;
    ctx.beginPath();
    ctx.moveTo(inner, torsoTop + torsoHalf * 0.22);
    ctx.lineTo(edge, torsoTop + torsoHalf * 0.3);
    ctx.lineTo(edge, torsoBot - torsoHalf * 0.18);
    ctx.lineTo(inner, torsoBot - torsoHalf * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // A `bust` block used to sit here — two soft crescents at whisper weight. It
  // is gone at Peter's call, not softened again: the figure already reads
  // female from the waist taper, the hair and the silhouette, and a chest line
  // was the one mark of the set that had to keep being argued about. The pecs
  // block below is the same technique if anything ever needs it back.
  if (spec.pecs && !lod) {
    // Chest shading: a pec shelf and a short sternum line. Any more detail
    // than this turns into speckle once the sprite is back at game scale.
    const px = torsoCx;
    const pecY = torsoTop + (torsoBot - torsoTop) * 0.38;
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.globalAlpha *= 0.22;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = hair(0.6, ow * 0.75);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - torsoHalf * 0.82, pecY - 0.045 * u);
    ctx.quadraticCurveTo(px - torsoHalf * 0.5, pecY + 0.03 * u, px, pecY);
    ctx.quadraticCurveTo(px + torsoHalf * 0.5, pecY + 0.03 * u, px + torsoHalf * 0.82, pecY - 0.045 * u);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, torsoTop + 0.03 * u);
    ctx.lineTo(px, pecY);
    ctx.stroke();
    // A four-pack below the shelf: the sternum seam carries on down the
    // belly and two short rungs cross it. Same whisper-weight as the pecs —
    // more detail than this speckles once the sprite is back at game scale.
    const absBot = hipY - 0.11 * u + bob;
    ctx.beginPath();
    ctx.moveTo(px, pecY + 0.02 * u);
    ctx.lineTo(px, absBot);
    ctx.stroke();
    ctx.beginPath();
    for (const f of [0.42, 0.78]) {
      const ay = pecY + (absBot - pecY) * f;
      ctx.moveTo(px - torsoHalf * 0.26, ay);
      ctx.lineTo(px + torsoHalf * 0.26, ay);
    }
    ctx.stroke();
    ctx.restore();
  }
  if (id === 'grumpos' && !slide) {
    // The war paint carries on down his body: one stripe on the same side as
    // the face streak, running from the shoulder to just off-center at the
    // belt line, where the belt (drawn later) covers its end. A shade heavier
    // than the face stroke — it crosses far more body, and matched exactly it
    // reads thinner than the mark it is continuing.
    // Clipped to the torso: the root sits up in the rounded shoulder corner,
    // where a fat stroke otherwise hangs off the side of his body. It rides
    // the run lean (leanX * 0.5) like the torso itself.
    const px = torsoCx;
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    // Original production-model stripe: a single broad cubic stroke rooted
    // at the tattooed shoulder and returning to that side at the waist.
    ctx.strokeStyle = p.a;
    ctx.lineWidth = hair(1.4, headR * 0.29);
    // Same side as the face streak — they are one continuous marking.
    const ts = spec.tatSide ?? -1;
    // Paint is on the skin, so every point of the stripe rides the run bob as
    // one piece. torsoTop already carries it; hipY does not, so measure the
    // lower half against a bobbed hip line (same trick as the belt and hem
    // below). Rooted at bobbing torsoTop with a tail pinned to static hipY the
    // stroke stretched a tenth of its length each stride and its gap to the
    // belt pumped open and shut — the mark appeared to bounce on his ribs.
    const hipYb = hipY + bob;
    ctx.beginPath();
    ctx.moveTo(px + ts * torsoHalf * 0.78, torsoTop);
    // Ends CLEAR of the belt, not tucked behind it. At 0.12 the stroke's lower
    // edge crossed the belt's top rim by 0.01u, so the paint appeared to run
    // under the leather instead of stopping on the ribs above it.
    const paintEndY = hipYb - 0.16 * u;
    const paintEndX = px + ts * 1.02 * (spec.taper
      ? taperHalfAt(paintEndY, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
      : torsoHalf);
    ctx.bezierCurveTo(
      px - ts * torsoHalf * 0.12, torsoTop + (hipYb - torsoTop) * 0.3,
      px - ts * torsoHalf * 0.02, torsoTop + (hipYb - torsoTop) * 0.7,
      paintEndX, paintEndY);
    ctx.stroke();
    ctx.restore();
    // Belt and buckle are drawn later, after the legs and loincloth: painted
    // here they sit under the front leg, whose thigh crosses the belt line.
  }
  if (id === 'b33p' && !slide) {
    // Chest screen with alternating status lights, plus a hull seam at the
    // waist — the torso reads as plated machine, not a onesie.
    const px = torsoCx;
    outlined(ctx, p.s, hair(0.5, ow * 0.55), (c) =>
      roundRectPath(c, px - torsoHalf * 0.52, torsoTop + 0.045 * u, torsoHalf * 1.04, 0.1 * u, 0.02 * u));
    const beat = Math.sin((pose.time || 0) * 5) > 0;
    dot(ctx, px - torsoHalf * 0.24, torsoTop + 0.095 * u, 0.018 * u, beat ? p.a : p.w);
    dot(ctx, px + torsoHalf * 0.24, torsoTop + 0.095 * u, 0.018 * u, beat ? p.w : p.a);
    // The waist seam spans the UNSQUASHED torso, not `torsoHalf`. A hull seam
    // is a join in metal: the plating can flex around it — his celebration
    // squashes the whole torso, and that is fine — but the seam itself is a
    // fixed piece of hardware and cannot get shorter. Tied to torsoHalf it
    // shrank on every turn and squash, and a short line centred under a face
    // stops reading as a seam and starts reading as a MOUTH.
    //
    // Run wider too, for the same reason: a seam that reaches the hull's edges
    // is structure, one that stops short of them is a feature drawn on him.
    ctx.strokeStyle = p.p;
    ctx.lineWidth = hair(0.6, ow * 0.5);
    ctx.beginPath();
    ctx.moveTo(px - torsoBaseHalf * 0.95, hipY - 0.055 * u);
    ctx.lineTo(px + torsoBaseHalf * 0.95, hipY - 0.055 * u);
    ctx.stroke();
    // No hull sheen. A soft diagonal streak used to run down the plating beside
    // the chest panel to sell it as curved metal; at the size he is actually
    // seen it never read as a highlight, only as a stray light line ruled from
    // his shoulder to his waist, and the eye kept going to it instead of to the
    // chest screen it was sitting next to. The plating already reads as metal
    // from the panel, the waist seam and the palette — it did not need the
    // specular, and a mark that has to be explained is not doing its job.
  }
  // Filled in by the straps block below when the near arm roots on top of the
  // near suspender; run after drawFrontArm() so the strap crosses the shoulder.
  let strapOverArm = null;
  let slingOverArm = null;
  // Same idea for the apron's pinafore straps: during a hands-on-hip beat the
  // arm draws in front and would bury them, so this re-strokes the straps over
  // that arm the way a suspender crosses the shoulder.
  let apronStrapOver = null;
  // BACKPACK STRAPS, over the chest. The pack itself is a back-pass piece; its
  // straps have to be here or the thing reads as a box behind him rather than
  // as something he is wearing. Two bands from the shoulders down to the lower
  // chest, clipped to the torso so they cannot run off his sides, plus the
  // sternum strap that is the detail which actually says "pack" rather than
  // "braces".
  if (spec.bundle === 'backpack' && !lod && !slide) {
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.strokeStyle = p.f;
    ctx.lineWidth = 0.05 * u;
    ctx.lineCap = 'round';
    for (const sg of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sg * torsoHalf * 0.62, torsoTop + 0.01 * u);
      ctx.lineTo(sg * torsoHalf * 0.46, torsoTop + 0.3 * u);
      ctx.stroke();
    }
    ctx.lineWidth = 0.028 * u;
    ctx.beginPath();
    ctx.moveTo(-torsoHalf * 0.54, torsoTop + 0.17 * u);
    ctx.lineTo(torsoHalf * 0.54, torsoTop + 0.17 * u);
    ctx.stroke();
    ctx.restore();
  }
  if (spec.straps && !lod && !slide) {
    // Straps and belt track the torso's run-lean shift (leanX * 0.5), else
    // they drift off-center whenever the body leans forward.
    const px = torsoCx;
    // Tool belt and brass buckle anchor the overalls at tiny scale. The belt
    // stops just shy of the torso edge, so it reads as wrapping the body
    // without poking past the silhouette. Its height comes from the shared
    // `beltY` above, which the trouser fill also uses — the belt has to land ON
    // that colour seam to cover it.
    // Suspenders run the full bib: shoulder down to the belt, angling slightly
    // inward. Stubs that stop at the collarbone read as epaulettes, not straps.
    // Clipped to the torso — the shoulder ends land in the rounded corners,
    // where the stroke would otherwise hang off the side of the body.
    // `bib` is off: braces on a shirt sit further from the obvious plumber than
  // overalls do, and the teal torso staying dominant is the most un-Mario thing
  // about him. Kept as a flag, not deleted, because it is a real alternative and
  // one word flips it back.
  //
  // The BIB is what makes these overalls rather than braces on a shirt: the
    // trouser front carried up the chest as a panel, with the straps running
    // off its top corners. Widening the straps alone would only ever read as
    // wide suspenders. This is also what the pixel grid has always described —
    // its torso rows put a band of trouser blue up the middle of the teal body
    // (`.bsbppppbs..`, commented "overall straps") — so the toon was the one
    // that had drifted. Same p.p as the trousers and rooted at the same beltY,
    // so bib and legs are visibly one garment; clipped to the torso, so like
    // the trousers this is paint and the silhouette never moves.
    const bib = !!spec.bib;
    const bibHalf = torsoHalf * 0.46;
    const bibTopY = torsoTop + (beltY - torsoTop) * 0.42;
    if (bib) {
      ctx.save();
      ctx.beginPath(); torsoPath(ctx); ctx.clip();
      ctx.fillStyle = p.p;
      ctx.beginPath();
      roundRectPath(ctx, px - bibHalf, bibTopY, bibHalf * 2, beltY - bibTopY + 0.02 * u, bibHalf * 0.3);
      ctx.fill();
      ctx.restore();
    }
    // Straps land ON the bib's top corners and splay outward going up, the way
    // a strap crosses a shoulder. The old pair angled the other way — inward as
    // they descended, to a point narrower than the bib now is — which is the
    // braces read, not the overalls one.
    // With a bib the straps land ON its top corners and splay outward going up,
    // the way a strap crosses a shoulder. Without one they run all the way to
    // the belt and angle inward as they descend — braces on a shirt, which is
    // the geometry this carried before the bib and a visibly different garment.
    const strapEndY = bib ? bibTopY : beltY;
    const strapTopY = torsoTop + 0.01 * u;
    const strapTopX = (s) => px + s * torsoHalf * (bib ? 0.62 : 0.5);
    const strapBotX = (s) => px + s * (bib ? bibHalf : torsoHalf * 0.34);
    const strapStroke = (s, endY, clipOverride = null, topY = strapTopY) => {
      const paint = (clipPath) => {
        ctx.save();
        ctx.beginPath(); clipPath(ctx); ctx.clip();
        ctx.strokeStyle = p.p;
        ctx.lineWidth = (bib ? 0.055 : 0.045) * u;
        ctx.beginPath();
        for (const sg of s) {
          const t = (endY - strapTopY) / (strapEndY - strapTopY);
          ctx.moveTo(strapTopX(sg), topY);
          ctx.lineTo(strapTopX(sg) + (strapBotX(sg) - strapTopX(sg)) * t, endY);
        }
        ctx.stroke();
        ctx.restore();
      };
      if (clipOverride) { paint(clipOverride); return; }
      paint(torsoPath);
      // Under the smooth shoulder crown the near shoulder is the BRIDGE, not
      // the torso's rounded corner: clipped to the corner alone the strap
      // stopped at the arc and hung a hair short of the new contour. A second
      // pass clipped to the bridge runs it on to the crown's inner edge. Two
      // passes rather than one union clip: the two regions overlap and their
      // windings are not guaranteed to agree, and the stroke is opaque anyway.
      if (shoulderJoin) paint((c) => shoulderJoin.bridgePath(c, false));
    };
    strapStroke([-1, 1], strapEndY);
    // CELEBRATING, the arms are up: the near upper arm leaves the shoulder
    // right where the strap's top meets the torso's edge, so the strap ended
    // dead against the arm's underside and read as passing under it. The
    // strap's axis never actually crosses the raised arm (the socket sits below
    // the torso's top), so the fix is a BEND: from its top the strap turns and
    // runs a short way up the arm along the bone, clipped to the upper arm's
    // capsule — a strap going over the shoulder and onto a raised deltoid.
    // Through the strapOverArm hook, because the celebration paints its arm
    // AFTER the costume (the raised-arm front pass).
    if (cm) strapOverArm = () => {
      const [ex, ey] = joint(shF, armY, handF[0], handF[1], armSeg, elbF, armSegF);
      const bl = Math.hypot(ex - shF, ey - armY) || 1;
      const bx = (ex - shF) / bl, byy = (ey - armY) / bl;
      const r = armWF * 0.5 + ow * 0.5, th = Math.atan2(ey - armY, ex - shF);
      // The bend starts ON the strap's own axis, not on a vertical dropped from
      // its top corner. With a bib the strap leans inward as it descends, so a
      // vertical stub sat a half-width outboard of the line it was supposed to
      // continue and the near brace read as TWO pieces — a short tab on the
      // shoulder and a strap starting under it. Same lerp strapStroke uses.
      const x0 = strapTopX(sideF), y0 = torsoTop + 0.004 * u;
      const yLo = armY + 0.05 * u;
      const xLo = x0 + (strapBotX(sideF) - x0) * ((yLo - strapTopY) / (strapEndY - strapTopY));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(shF + Math.cos(th + Math.PI / 2) * r, armY + Math.sin(th + Math.PI / 2) * r);
      ctx.arc(shF, armY, r, th + Math.PI / 2, th + Math.PI * 1.5);
      ctx.arc(ex, ey, r, th - Math.PI / 2, th + Math.PI / 2);
      ctx.closePath(); ctx.clip();
      ctx.strokeStyle = p.p; ctx.lineWidth = (bib ? 0.055 : 0.045) * u; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(xLo, yLo);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + bx * 0.09 * u, y0 + byy * 0.09 * u);
      ctx.stroke();
      ctx.restore();
    };
    // One pocket with a tool head in it, and nothing else on the bib. The bib
    // is the piece that pulls this silhouette toward the obvious plumber — cap
    // plus mustache plus overalls IS that formula — so the panel earns its keep
    // by saying handyman instead of mascot. What is deliberately NOT here: two
    // round buttons at the strap joins. On a blue bib that is the single most
    // recognisable mark of the character we are steering around, and it would
    // undo every other difference in one stroke.
    if (bib) {
    const pocketH = (beltY - bibTopY) * 0.44;
    // Chest height, not waist height: down by the hem the gold tool head stacked
    // directly above the gold belt buckle, and two gold marks that close read as
    // one cluttered smudge at any size that matters.
    const pocketY = bibTopY + (beltY - bibTopY) * 0.3;
    const pocketHalf = bibHalf * 0.62;
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = hair(0.4, ow * 0.5);
    ctx.beginPath();
    roundRectPath(ctx, px - pocketHalf, pocketY, pocketHalf * 2, pocketH, pocketH * 0.22);
    ctx.stroke();
    // Tool head poking out of it, in the cap-badge gold so the two read as the
    // same trade. Short: anything longer becomes a stripe at 24px.
    ctx.strokeStyle = p.m;
    ctx.lineWidth = hair(0.5, 0.014 * u);
    ctx.beginPath();
    ctx.moveTo(px + pocketHalf * 0.42, pocketY + pocketH * 0.5);
    ctx.lineTo(px + pocketHalf * 0.42, pocketY - pocketH * 0.34);
    ctx.stroke();
    outlined(ctx, p.a, hair(0.4, ow * 0.4), (c) =>
      roundRectPath(c, px + pocketHalf * 0.18, pocketY - pocketH * 0.62, pocketHalf * 0.48, pocketH * 0.4, pocketH * 0.12));
    ctx.restore();
    }
    // A suspender passes OVER the shoulder — the arm hangs outboard of it. The
    // profile gaits root the near arm at ~0.69 of the half-width, and a 0.075u
    // bone plus its outline reaches back in past 0.5, so the shoulder cap lands
    // square on the near strap's top end and swallows it: he ran the whole
    // cycle with one suspender that started at the ribs. Re-stroke just that
    // end after the arm is painted, down to where the cap stops (armY + a
    // shoulder's worth). Below that the bicep genuinely IS in front of the bib
    // and still occludes, which is what a strap under a swinging arm should do.
    if (!stand) strapOverArm = () => strapStroke([sideF], armY + 0.05 * u);
    // TUCKED means the belt is ON TOP of the shaft, so the front carries paint
    // UNDER the leather and the hanging one paints over it. That order is the
    // whole difference between a tool through the belt and a tool beside it.
    if (wrenchWorn && !wrenchAt.behind && !wrenchAt.loop) drawWornWrench(ctx, spec, p, u, ow, wrenchAt);
    ctx.strokeStyle = p.m; ctx.lineWidth = 0.055 * u;
    ctx.beginPath(); ctx.moveTo(px - torsoHalf * 0.88, beltY); ctx.lineTo(px + torsoHalf * 0.88, beltY); ctx.stroke();
    outlined(ctx, p.a, hair(0.5, ow * 0.5), (c) => roundRectPath(c, px - 0.035 * u, beltY - 0.033 * u, 0.07 * u, 0.06 * u, 0.012 * u));
    if (wrenchWorn && wrenchAt.loop) drawWornWrench(ctx, spec, p, u, ow, wrenchAt);
  }
  if (spec.nameTag && !lod && !slide) {
    outlined(ctx, p.w, hair(0.6, ow * 0.5), (c) => roundRectPath(c, torsoHalf * 0.15, torsoTop + 0.05 * u, 0.09 * u, 0.06 * u, 0.01 * u));
  }

  // ---- field gear ---------------------------------------------------------
  // Everything in this block except the belt is PAINT, clipped to the same
  // torsoPath the shirt is filled with, so a hero can carry three pieces of it
  // without the silhouette moving a pixel. That is the same bargain the
  // trouser fill, the bib and the war-paint stripe already make, and it is what
  // lets gear be judged as gear rather than as girth.
  const gearX = torsoCx;
  const onTorso = (paint) => {
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    paint();
    ctx.restore();
  };
  if (spec.jacket && !slide) {
    // An open jacket: two panels down the sides with the shirt showing between
    // them. A CLOSED coat on this rig is indistinguishable from recolouring the
    // torso — the strip of shirt down the middle is the entire second garment.
    const coat = p.coat || p.w;
    onTorso(() => {
      ctx.fillStyle = coat;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(gearX + sgn * torsoHalf * 1.2, torsoTop - 0.02 * u);
        ctx.lineTo(gearX + sgn * torsoHalf * 0.34, torsoTop - 0.02 * u);   // collar edge
        // The front edge falls away from the sternum, so the opening is a V
        // rather than a slot — a parallel gap reads as a stripe painted on her.
        ctx.quadraticCurveTo(gearX + sgn * torsoHalf * 0.6, torsoTop + (torsoBot - torsoTop) * 0.5,
          gearX + sgn * torsoHalf * 0.52, torsoBot + 0.04 * u);
        ctx.lineTo(gearX + sgn * torsoHalf * 1.2, torsoBot + 0.04 * u);
        ctx.closePath();
        ctx.fill();
      }
    });
  }
  if (spec.harness && !slide) {
    // Climbing harness: two shoulder straps and the sternum strap joining
    // them. Straight lines over a curved body, which is what webbing does.
    const sternumY = torsoTop + (beltY - torsoTop) * 0.36;
    onTorso(() => {
      ctx.strokeStyle = p.w;
      ctx.lineWidth = 0.036 * u;
      ctx.beginPath();
      for (const sgn of [-1, 1]) {
        ctx.moveTo(gearX + sgn * torsoHalf * 0.66, torsoTop - 0.01 * u);
        ctx.lineTo(gearX + sgn * torsoHalf * 0.36, beltY);
      }
      ctx.moveTo(gearX - torsoHalf * 0.56, sternumY);
      ctx.lineTo(gearX + torsoHalf * 0.56, sternumY);
      ctx.stroke();
    });
    if (!lod) outlined(ctx, p.a, hair(0.4, ow * 0.45), (c) => c.arc(gearX, sternumY, 0.025 * u, 0, Math.PI * 2));
  }
  if (spec.bandolier && !slide) {
    // One strap, near shoulder to far hip. Signed off sideF rather than screen
    // x so it crosses the chest the same way whichever shoulder the depth rig
    // has put in front.
    // 'cross' is the pair of harness straps the 2D reference wears — an X over
    // the chest — rather than one ammunition belt. Same stroke, mirrored, and
    // no cartridges on it: rounds on both straps is a bandolier costume, and
    // the X is a harness.
    const crossed = spec.bandolier === 'cross';
    const y0 = torsoTop - 0.01 * u;
    onTorso(() => {
      ctx.strokeStyle = p.w;
      ctx.lineWidth = (crossed ? 0.042 : 0.05) * u;
      for (const sgn of crossed ? [1, -1] : [sideF]) {
        const x0 = gearX + sgn * torsoHalf * 0.8;
        const x1 = gearX - sgn * torsoHalf * 0.88;
        ctx.beginPath();
        ctx.moveTo(x0, y0); ctx.lineTo(x1, beltY);
        ctx.stroke();
        // Three rounds, not a full row: a real bandolier's worth samples down
        // to a dotted line and then to a smear.
        if (!lod && !crossed) {
          for (const t of [0.3, 0.5, 0.7]) dot(ctx, x0 + (x1 - x0) * t, y0 + (beltY - y0) * t, 0.017 * u, p.a);
        }
      }
    });
    // The buckle where they cross, which is the mark that says harness.
    if (crossed && !lod) {
      outlined(ctx, p.a, hair(0.4, ow * 0.45), (c) =>
        roundRectPath(c, gearX - 0.026 * u, torsoTop + (beltY - torsoTop) * 0.42 - 0.02 * u,
          0.052 * u, 0.04 * u, 0.01 * u));
    }
  }
  if (spec.gearBelt) {
    // The belt everything else hangs off. Stroked to just inside the body edge
    // — a band drawn out to the silhouette adds a corner where the contour is
    // already turning — and landing on the shared beltY, so it covers the
    // trouser colour seam instead of sitting near it.
    //
    // Measured at its OWN height, not off the shoulder line. A tapered torso is
    // narrower at the waist than at the shoulders by exactly `taper`, so a belt
    // sized off torsoHalf hangs past the body on both sides — and the harder
    // the waist is nipped in, the further it overhangs. Grumpos's belt has
    // always done this; hers had not, and it only showed up once a cut with a
    // real waist existed to show it.
    const beltHalf = (spec.taper
      ? taperHalfAt(beltY, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
      : roundHalfAt(beltY, torsoTop, torsoBot, torsoHalf, torsoHalf * 0.7));
    // 0.84 of the body's half-width AT THE BELT, and a slightly finer band than
    // it started at. Run out to the silhouette on a nipped waist the leather
    // becomes the widest thing on the figure, which reads as a belt she has
    // borrowed rather than one that fits.
    ctx.strokeStyle = p.w;
    ctx.lineWidth = 0.046 * u;
    ctx.beginPath();
    ctx.moveTo(gearX - beltHalf * 0.84, beltY);
    ctx.lineTo(gearX + beltHalf * 0.84, beltY);
    ctx.stroke();
    // `buckle` scales it. The 3D reference's whole waist is one big brass
    // plate, and at hero size that plate is the only thing separating a bare
    // midriff from bare thighs — without it the figure has a continuous column
    // of skin down its middle.
    const bk = spec.buckle || 1;
    outlined(ctx, p.a, hair(0.5, ow * 0.5), (c) =>
      roundRectPath(c, gearX - 0.031 * u * bk, beltY - 0.029 * u * bk,
        0.062 * u * bk, 0.055 * u * bk, 0.012 * u * bk));
    if (!lod) {
      // One pouch. Two is clutter at 24px and three is a tool belt, which is
      // Lorenzo's read and not hers.
      outlined(ctx, p.w, hair(0.45, ow * 0.5), (c) =>
        roundRectPath(c, gearX - beltHalf * 0.88, beltY - 0.008 * u, 0.07 * u, 0.075 * u, 0.018 * u));
    }
    // A hip rig instead of a thigh pair: same holster, worn at the belt on the
    // near side, and emptied by the same flag when the gun is in her hand.
    if (spec.holster === 'hip' && !holsterDrawn) {
      const hx0 = gearX + beltHalf * 0.78;
      outlined(ctx, p.gunGrip || p.w, hair(0.45, ow * 0.5), (c) =>
        roundRectPath(c, hx0 - 0.026 * u, beltY - 0.075 * u, 0.052 * u, 0.08 * u, 0.012 * u));
      outlined(ctx, p.w, hair(0.5, ow * 0.6), (c) =>
        roundRectPath(c, hx0 - 0.036 * u, beltY - 0.02 * u, 0.072 * u, 0.115 * u, 0.02 * u));
    }
  }

  // front limbs — in profile (run/jump) the near leg and arm cross the body, so
  // they paint over the torso; front-on they already drew behind it
  // The BAND first, so a raised thigh crosses in front of it — a belt goes
  // round the body and behind the leg lifted over it. The POUCH after the leg,
  // because it hangs outboard and sits on the thigh. Drawn as one pass they
  // could only be both-in-front or both-behind, and in the jump that put the
  // band over the knee.
  hipKit('belt');
  if (!frontLegs) drawFrontLeg();
  hipKit('pouch');
  // THE NEAR HAND GOES BACK ON TOP OF THE CANISTER, standing only. At rest both
  // arms paint in the BACK pass — that is what keeps a resting arm behind the
  // body rather than folded across it — so the hand ended up behind a bag worn
  // on the hip it hangs beside. Running and jumping the near arm already paints
  // in the front pass and crosses the kit correctly.
  //
  // Only the HAND is repainted, not the arm: putting the whole limb in front
  // would fold it across the torso, which is the exact read the back pass
  // exists to avoid. The hand is one disc, it lands where it already was, and
  // it is the only part of the arm the canister reaches.
  if (stand && spec.bundle && !lod && !pose.axeThrown) handDeco(handF[0], handF[1], 0, shF, armYF, elbF);
  if (id === 'grumpos' && !pose.hideSkirt) {
    // Battle skirt (pteruges): belt-width at the waist, flaring OUT to a
    // wider hem, split into hanging panels by strip lines. The hem is driven
    // by the legs underneath (see hemX/hemY) rather than wagging as one board
    // at stride frequency, which at this scale just read as jitter.
    // Belt and skirt-top measure the torso at their OWN height via
    // taperHalfAt: the body is widest at the shoulders and narrowest at the
    // hem, so a band sized off either end shows body slivers beside it or
    // overhangs the silhouette.
    // Both follow the run bob (the hem at half strength, so the cloth lags a
    // beat like fabric); pinned to static hipY they detach from the body.
    // px: the torso is drawn shifted forward by the run lean — belt and
    // skirt center on that same offset, or the belly peeks out in front and
    // the band overhangs his back.
    // In MOTION the whole skirt shifts a touch toward the leading side. The
    // run and the jump turn the body a few degrees into travel — it is why the
    // head is offset in those poses too — and a skirt centred on the torso's
    // own axis reads as hanging square while the body under it does not. The
    // shift lands the cloth over the leg that is coming forward, which is the
    // leg whose knee was showing.
    const facingShift = (run || jump) ? 0.014 * u : 0;
    const px = torsoCx + facingShift;
    const sway = jump ? 0.02 * u : 0;
    // Belt sits high on the waist: a low band leaves a long round belly above
    // it and reads chubby rather than barrel-chested.
    const beltY = hipY - 0.075 * u + bob;
    const top = beltY + 0.025 * u;
    // Panels stop just past the knee — a joint crossing the hem reads as the
    // leather riding up, so only the shin below carries the gait. The heavy
    // rig's shallow stride is what lets them sit this short. Crouching they
    // shorten again, or the tucked legs and feet vanish under them.
    const tipY = hipY + legL * (slide ? 0.35 : 0.47) + bob * 0.5;
    // Body half-width where the belt sits and where the skirt hangs from.
    //
    // The sample is CLAMPED INSIDE the torso's own span. Airborne the body
    // bobs and the belt line can fall below `torsoBot`, where taperHalfAt has
    // nothing left to interpolate and returns the narrowest width it knows —
    // so the belt and the skirt top pinched in on the jump and only on the
    // jump. Clamped, they measure the bottom of the torso instead, which is
    // the widest the leather is ever asked to span.
    const halfAt = (y0) => (spec.taper
      ? taperHalfAt(Math.min(y0, torsoBot - 0.005 * u),
        torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
      : torsoHalf);
    // A HAIR WIDER THAN THE TAPER SAYS. `halfAt` returns the torso's half-width
    // at the belt's own height, which is the right measurement for a band that
    // has to sit ON the body — but the belt is drawn as a rounded rect and its
    // corners pull in from that width, while the body beside it is a straight
    // edge at this height. Sized exactly, the band came up short of his sides
    // and left a sliver of skin either side of it: the belt read as floating in
    // front of him rather than fastened round him. The same 1.06 goes on the
    // skirt top below, so the leather still hangs off the belt's own line.
    const beltHalf = halfAt(beltY) * 1.06;
    // Panels span the body's edge at the belt, then splay outward — sized off
    // the shoulder line they'd hang past the hips and re-read as belly.
    const wTop = halfAt(top) * 1.04;
    // The splay has to clear the thighs, and front-on they root wide (±0.095u,
    // half a legW each side) instead of stacking on one center hip — so the
    // standing and celebrating poses need a real A-line or his legs show past
    // the leather. In profile the legs are behind it and a tighter hang reads
    // better. Fanned wider than this the straps stop overlapping.
    const flare = frontLegs || cm ? 1.5 : 1.18;
    // Spreads with the hop and the jump, like every hem on the roster: the
    // straps are free at the bottom and the air opens them.
    // Spreads as she leaves the floor — the straps are free at the bottom and
    // the air opens them. Written out here rather than reusing `airHem` below:
    // that is declared further down the block, and hoisting it to reach this
    // line is the kind of move that has already cost this file once today.
    const upNow = Math.max(0, jump
      ? -Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160))
      : Math.min(1, ((cm && cm.lift) || 0) / 0.09));
    const wHem = wTop * flare * (1 + upNow * 0.14);
    // How far each leg has swung from its OWN hip — not from the body center,
    // which reads as a permanent outward pull when the legs stand apart and
    // parts the straps down the middle even at rest.
    const swingF = footF[0] - hipAt(1), swingB = footB[0] - hipAt(-1);
    // The CELEBRATION is airborne too — it is a hop — and its lift is the same
    // kind of signal as a jump's vertical speed, so the hems take it the same
    // way: they trail and lift as she leaves the floor and settle as she comes
    // back down. Without it the skirt is the one dead thing in a pose whose
    // whole job is looking pleased.
    const airHem = jump
      ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160))
      : cm ? -Math.min(1, (cm.lift || 0) / 0.09) : 0;
    // Four separate straps of leather hung off the belt, NOT one skirt: each
    // is its own quad, pinned at the belt and free at the bottom, so it swings
    // on the leg beneath it while its neighbours hang. `gain` is how much of
    // that leg each one inherits — the two facing the camera-forward leg ride
    // it hard, the back pair barely stir, which is what keeps the stack from
    // moving as one board. `f` is the panel's center as a fraction of wTop.
    const PANELS = [
      { f: -0.75, gain: 0.25 },
      { f: -0.25, gain: 0.4 },
      { f: 0.25, gain: 0.95 },
      { f: 0.75, gain: 1 },
    ];
    const pTopHalf = wTop * 0.3;    // 4 panels across 2*wTop, overlapping
    // Leather on a belt loop can only travel so far. Poses that tuck the legs
    // right up — the victory routine, a jump — would otherwise fling the
    // panels clear of the body, so the drag is capped, not scaled.
    const drag = (v, max) => Math.max(-max, Math.min(max, v));
    const skirtSlope = turned ? turnDepth * 0.025 * u : 0;
    const waistBow = turned ? turnDepth * 0.022 * u : 0;
    const depthScaleAt = (f) => turned ? (f * nearSign > 0 ? 1.08 : 0.78) : 1;
    // The roots sit on the bowed front edge of a cylindrical waist. A linear
    // edge makes the whole garment look pasted onto a flat board.
    const topYAt = (f) => top + f * nearSign * skirtSlope + (1 - f * f) * waistBow;
    const tipYAt = (f) => tipY + f * nearSign * skirtSlope * 1.35;
    // An under-layer behind the straps in the same leather, a touch shorter
    // than they are. The straps swing independently, so whatever gap opens
    // between two of them lands on this instead of on his lower abdomen —
    // and matching their color makes it read as depth, not a second garment.
    // It follows the flare, or the A-line opens past its edges.
    const wUnder = wTop * flare * 0.92;
    outlined(ctx, p.w, hair(0.5, ow * 0.5), (c) => {
      c.moveTo(px - wTop * 0.96 * depthScaleAt(-1), topYAt(-1));
      c.lineTo(px + wTop * 0.96 * depthScaleAt(1), topYAt(1));
      c.lineTo(px + wUnder * depthScaleAt(1) + sway, tipYAt(1) - 0.022 * u);
      c.lineTo(px - wUnder * depthScaleAt(-1) + sway, tipYAt(-1) - 0.022 * u);
      c.closePath();
    });
    // Paint the far half first so the screen-left foreground straps occlude it.
    const panelOrder = turned && nearSign < 0 ? [...PANELS].reverse() : PANELS;
    for (const { f, gain } of panelOrder) {
      // The turned rig puts footF under the screen-left foreground half.
      // Drive each leather panel from the thigh actually beneath it.
      const followsFront = turned ? (nearSign < 0 ? f < 0 : f > 0) : f > 0;
      const drivenGain = turned
        ? followsFront ? (Math.abs(f) > 0.5 ? 1 : 0.95) : (Math.abs(f) > 0.5 ? 0.25 : 0.4)
        : gain;
      const depthScale = depthScaleAt(f);
      const panelHalf = pTopHalf * depthScale;
      const lead = followsFront ? swingF : swingB;
      const rise = followsFront ? footF[1] : footB[1];
      const topX = px + f * wTop * depthScale;
      // Airborne, `lead` and `rise` are frozen, so the strap's own share of
      // the air is added here: pulled back and lifted while she climbs,
      // hanging as she falls. The outer straps take more of it than the
      // inner ones, which is what keeps the fan from moving as one board.
      const airX = -airHem * 0.05 * u * (0.5 + Math.abs(f));
      const airY = -airHem * 0.045 * u * (0.5 + Math.abs(f));
      const bx = px + f * wHem * depthScale + sway
        + drag(drivenGain * 0.45 * lead, 0.055 * u) + airX;
      const by = tipYAt(f) + drag(drivenGain * 0.45 * rise, 0.045 * u) + airY;
      outlined(ctx, p.w, hair(0.6, ow * 0.7), (c) => {
        c.moveTo(topX - panelHalf, topYAt(f));
        c.lineTo(topX + panelHalf, topYAt(f));
        // Each strap widens toward its tip in step with the flare — held to a
        // constant width, an A-line just opens gaps between them.
        c.lineTo(bx + panelHalf * (1 + (flare - 1) * 0.85), by);
        c.lineTo(bx - panelHalf * (1 + (flare - 1) * 0.85), by);
        c.closePath();
      });
    }
    // Belt over everything at the waist, so the thigh roots vanish beneath
    // it. Flush with the torso edges: narrower leaves belly/back slivers,
    // wider overhangs the silhouette — its outline covers the seam.
    if (turned) {
      const beltSlope = turnDepth * 0.018 * u;
      const leftY = beltY - nearSign * beltSlope;
      const rightY = beltY + nearSign * beltSlope;
      const leftHalf = beltHalf * depthScaleAt(-1);
      const rightHalf = beltHalf * depthScaleAt(1);
      const bandTop = 0.028 * u;
      const bandBottom = 0.035 * u;
      // Curved upper and lower rims turn the belt into a band around a barrel,
      // while the shortened far edge shows it disappearing around his side.
      outlined(ctx, p.g, hair(0.5, ow * 0.55), (c) => {
        c.moveTo(px - leftHalf, leftY - bandTop);
        c.quadraticCurveTo(px, beltY - bandTop + waistBow, px + rightHalf, rightY - bandTop);
        c.lineTo(px + rightHalf, rightY + bandBottom);
        c.quadraticCurveTo(px, beltY + bandBottom + waistBow * 1.25, px - leftHalf, leftY + bandBottom);
        c.closePath();
      });
      // A darker far-side turnover keeps the band visibly attached as it
      // rounds away rather than ending in a flat vertical cut.
      const farX = px - nearSign * (nearSign < 0 ? rightHalf : leftHalf);
      const farY = nearSign < 0 ? rightY : leftY;
      ctx.save();
      ctx.globalAlpha *= 0.34;
      ctx.fillStyle = OUTLINE;
      ctx.beginPath();
      ctx.ellipse(farX, farY + 0.003 * u, 0.018 * u, bandBottom + bandTop, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      dot(ctx, px + nearSign * beltHalf * 0.08, beltY + waistBow + nearSign * beltSlope * 0.08, 0.034 * u, p.w);
    } else {
      outlined(ctx, p.g, hair(0.5, ow * 0.55), (c) => roundRectPath(c, px - beltHalf, beltY - 0.03 * u, beltHalf * 2, 0.065 * u, 0.02 * u));
      dot(ctx, px, beltY + 0.002 * u, 0.034 * u, p.w);
    }
  }
  if (spec.princessCostume && !slide) {
    paintPrincessCostume(ctx, spec, p, u, ow, lod, { px: torsoCx, torsoTop, torsoBot, torsoHalf, torsoPath, hipY, legL, bob, run, jump, frontLegs, hipAt, footB, waistHalf, shoulderSoft, t: pose.time || 0, slingSocketX: shF - (nearArmSeated ? sideF * ARM_SEAT_IN * u : 0),
      slingSocketY: armY + (nearArmSeated ? ARM_SEAT_DOWN * u : 0),
      slingSocketR: armWF * 0.52,
      // The sling strip sits a fixed way inboard of the socket; when the
      // socket is fitted into the gown the strip moves with it, or its
      // shoulder start pokes out past the arm's root.
      slingFit: -socketFit,
      // The crown's cap region (what the join trims away), so the strip's
      // tapered start is cut along the shoulder's own contour like everything
      // else there, instead of poking into the air above the crown.
      slingTrim: shoulderJoin?.trim ? (c) => crownCapPath(c, -ow * 0.5) : null,
      // The celebration hop's lift, handed over rather than reached for: the
      // hop belongs to this painter and the skirt is drawn by another one.
      celebLift: cm ? cm.lift || 0 : 0, vy: pose.vy || 0, celebrating: pose.kind === 'celebrate',
      setSlingOverArm: (paint) => { slingOverArm = paint; } });
  } else if (spec.tunic && !slide) {
    // Green tunic: the torso's flat hem flares into a short skirt over the
    // thighs, cinched by a belt. Drawn after the legs so it drapes over the
    // thigh roots (like grumpos's skirt); the belt hides the top seam. Kept
    // upper-thigh short so the gait still reads.
    // In MOTION the whole skirt shifts a touch toward the leading side. The
    // run and the jump turn the body a few degrees into travel — it is why the
    // head is offset in those poses too — and a skirt centred on the torso's
    // own axis reads as hanging square while the body under it does not. The
    // shift lands the cloth over the leg that is coming forward, which is the
    // leg whose knee was showing.
    const facingShift = (run || jump) ? 0.014 * u : 0;
    const px = torsoCx + facingShift;
    const sway = jump ? 0.02 * u : 0;
    const beltY = hipY - 0.05 * u + bob;
    const top = beltY + 0.02 * u;
    const hemY = hipY + legL * 0.36 + bob * 0.5;
    const wTop = torsoHalf * 0.96;
    const wHem = torsoHalf * 1.3;
    outlined(ctx, p.b, ow, (c) => {
      c.moveTo(px - wTop, top);
      c.lineTo(px + wTop, top);
      c.lineTo(px + wHem + sway, hemY);
      c.quadraticCurveTo(px + sway, hemY + 0.045 * u, px - wHem + sway, hemY);
      c.closePath();
    });
    if (!lod) {
      // a soft center seam sells the drape of cloth
      ctx.save();
      ctx.globalAlpha *= 0.45;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.5, ow * 0.4);
      ctx.beginPath();
      ctx.moveTo(px + sway * 0.5, top + 0.03 * u);
      ctx.lineTo(px + sway, hemY - 0.01 * u);
      ctx.stroke();
      ctx.restore();
    }
    // belt over the waist, covering the skirt's top seam; gold buckle
    outlined(ctx, p.p, hair(0.5, ow * 0.6), (c) => roundRectPath(c, px - torsoHalf, beltY - 0.028 * u, torsoHalf * 2, 0.058 * u, 0.02 * u));
    outlined(ctx, p.a, hair(0.5, ow * 0.5), (c) => c.arc(px, beltY + 0.002 * u, 0.028 * u, 0, Math.PI * 2));
  }
  if (spec.dress && !slide) {
    // A qipao, in two builds. Both are constructed the way Fernwick's tunic is
    // — the torso's flat hem carries on into cloth over the thighs, drawn after
    // the legs so it drapes over the thigh roots — and both carry the three
    // marks that make it this garment: gold piping, a sash at the waist in its
    // own colour, and a split.
    //
    // 'split' is the reference's own cut: a short centre panel with a long
    // panel hanging at each side and the LEG showing in the two gaps between
    // them. That is a very different silhouette from the plain flare — it is
    // vertical rather than triangular, and it puts two hard gold edges down the
    // figure where the flare has one soft hem.
    const split = spec.dress === 'split';
    // In MOTION the whole skirt shifts a touch toward the leading side. The
    // run and the jump turn the body a few degrees into travel — it is why the
    // head is offset in those poses too — and a skirt centred on the torso's
    // own axis reads as hanging square while the body under it does not. The
    // shift lands the cloth over the leg that is coming forward, which is the
    // leg whose knee was showing.
    const facingShift = (run || jump) ? 0.014 * u : 0;
    const px = torsoCx + facingShift;
    // Airborne the skirt used to be pushed a flat 0.02u to one side, on top of
    // whatever its panels were already doing — a constant shove that read as
    // the whole garment hanging off-centre on her body rather than as cloth
    // reacting. Half of it, and the panels' own per-leg drag carries the rest.
    const sway = jump ? 0.01 * u : 0;
    // `waistRise` lifts the sash, in u. It is a per-cut dial rather than a
    // global move because where the waist sits IS the garment's design: the
    // split build wears it high, which is what lets its skirt be short without
    // the panels looking cropped.
    const dressBeltY = hipY - (0.05 + (spec.waistRise || 0)) * u + bob;
    const top = dressBeltY + 0.02 * u;
    const hemY = hipY + legL * 0.42 + bob * 0.5;
    const wTop = torsoHalf * 0.98;
    // Flares wider than the tunic: front-on the legs root at ±0.095u and this
    // hem has to clear both of them, or the thighs show past the cloth.
    const wHem = torsoHalf * (frontLegs ? 1.52 : 1.34);
    const gold = (path) => {
      if (lod) return;
      ctx.strokeStyle = p.a;
      ctx.lineWidth = hair(0.5, 0.022 * u);
      ctx.beginPath();
      path(ctx);
      ctx.stroke();
    };
    if (split) {
      // THREE HANGING PANELS, cut and driven the way Grumpos's battle skirt is
      // — because the problem with a one-piece skirt on this rig is not its
      // shape, it is that it is a board. His pteruges solved that years ago:
      // each panel is its own quad, pinned at the waist and free at the hem,
      // and it inherits the swing of the LEG BENEATH IT rather than wagging as
      // one slab at stride frequency. Three instead of his four, because this
      // is a dress panel rather than armour strapping and four at her width
      // comes out as fringe.
      //
      // The SPLIT is the gap the panels leave on one side, and it is on the
      // screen-left (trailing) side here. What shows through it is the legging,
      // which is already drawn — the skirt simply is not there.
      const splitSide = -1;
      const hemLow = hipY + legL * (slide ? 0.24 : 0.36) + bob * 0.5;
      const halfAtY = (y) => (spec.taper
        ? taperHalfAt(y, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
        : torsoHalf);
      const wTopS = halfAtY(top) * 0.98;
      // Front-on the legs root wide, so the hem needs a real A-line or the
      // thighs show past the cloth on both sides instead of only in the split.
      // Flares harder than it did. A short skirt hanging near-straight reads as
      // a tube; the A-line is most of what says "skirt" once there is not much
      // length left to say it with, and the panels have to clear thighs that
      // root wide front-on.
      const flare = frontLegs ? 1.72 : 1.44;
      // Same spread as the pteruges: the panels open as she leaves the floor.
      // Same spread as the pteruges: the panels open as she leaves the floor.
      const upNowK = Math.max(0, jump
        ? -Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160))
        : Math.min(1, ((cm && cm.lift) || 0) / 0.09));
      const wHemS = wTopS * flare * (1 + upNowK * 0.14);
      // How far each leg has swung from its OWN hip, not from the body centre:
      // measured from centre, legs that merely stand apart read as a permanent
      // outward pull and part the panels down the middle at rest.
      const swingF = footF[0] - hipAt(1), swingB = footB[0] - hipAt(-1);
      // Same in the celebration hop as in the jump — see the pteruges above.
      const airHem = jump
        ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 160))
        : cm ? -Math.min(1, (cm.lift || 0) / 0.09) : 0;
      const drag = (v, max) => Math.max(-max, Math.min(max, v));
      // `f` is the panel's centre as a fraction of wTop; `gain` how much of its
      // leg it inherits. The panel over the split side is pulled in and barely
      // stirs — it is the edge of the opening, and an edge that swings as hard
      // as the middle closes the split it is supposed to be making.
      // Equal lengths. A staggered hem — centre panel dropped, the two beside
      // it lifted — was tried and lost: it made the skirt look damaged rather
      // than cut.
      const PANELS = [
        { f: splitSide * 0.72, half: 0.3, gain: 0.25 },
        { f: 0, half: 0.46, gain: 0.85 },
        { f: -splitSide * 0.66, half: 0.42, gain: 1 },
      ];
      // A base across the CLOSED side — centre panel to the far edge, stopping
      // short of the split so the opening stays open. It carries the skirt's
      // outer contour at full ink weight, which lets the panel seams on top of
      // it be hairlines: at contour weight every fold read as the edge of a
      // separate strap, and this is one skirt with one cut in it.
      outlined(ctx, p.b, ow, (c) => {
        c.moveTo(px - splitSide * wTopS * 0.06, top);
        c.lineTo(px - splitSide * wTopS, top);
        c.lineTo(px - splitSide * wHemS + sway, hemLow);
        c.quadraticCurveTo(px - splitSide * wHemS * 0.5 + sway, hemLow + 0.026 * u,
          px - splitSide * wHemS * 0.06 + sway, hemLow);
        c.closePath();
      });
      for (const { f, half, gain } of PANELS) {
        const followsFront = f * splitSide < 0;
        const lead = followsFront ? swingF : swingB;
        const rise = followsFront ? footF[1] : footB[1];
        const topX = px + f * wTopS;
        // The same airborne share as Grumpos's straps: the legs hold still in
        // the jump, so without this the panels are rigid exactly when the
        // dress should be moving most.
        const airX = -airHem * 0.045 * u * (0.5 + Math.abs(f));
        const airY = -airHem * 0.04 * u * (0.5 + Math.abs(f));
        const bx = px + f * wHemS + sway + drag(gain * 0.4 * lead, 0.05 * u) + airX;
        // The hem follows a foot DOWN much further than it follows one UP.
        // `rise` is the foot's own height, so a lifted knee was pulling the
        // panel over it up with it — the fabric behaving like it was pinned to
        // the ankle — and that is what exposed the knee on the run, the jump
        // and the slide. Cloth drapes OVER a raised knee: it barely moves, and
        // what movement is left reads as the skirt riding the leg rather than
        // hanging off it. Falling with the foot is still the full travel,
        // which is what keeps the hem on the leg through the stride's descent.
        const riseTerm = gain * 0.4 * rise;
        const by = hemLow + (riseTerm < 0
          ? Math.max(riseTerm, -0.012 * u)
          : drag(riseTerm, 0.04 * u)) + airY;
        const topHalf = wTopS * half;
        const botHalf = topHalf * (1 + (flare - 1) * 0.9);
        const panel = (c) => {
          c.moveTo(topX - topHalf, top);
          c.lineTo(topX + topHalf, top);
          c.lineTo(bx + botHalf, by);
          c.quadraticCurveTo(bx, by + 0.026 * u, bx - botHalf, by);
          c.closePath();
        };
        // Hairline seams; the base above owns the silhouette.
        outlined(ctx, p.b, ow * 0.4, panel);
        // Piping round each panel's own hem: on a cut skirt the hem edge is the
        // detail, and three panels sharing one traced line would weld them back
        // into the board this is here to avoid.
        gold((c) => {
          c.moveTo(bx - botHalf * 0.94, by - 0.012 * u);
          c.quadraticCurveTo(bx, by + 0.014 * u, bx + botHalf * 0.94, by - 0.012 * u);
        });
      }
    } else {
      const skirt = (c) => {
        c.moveTo(px - wTop, top);
        c.lineTo(px + wTop, top);
        c.lineTo(px + wHem + sway, hemY);
        c.quadraticCurveTo(px + sway, hemY + 0.05 * u, px - wHem + sway, hemY);
        c.closePath();
      };
      outlined(ctx, p.b, ow, skirt);
      if (!lod) {
        // Gold piping, traced just inside the hem so it can never spill past
        // the silhouette, and the slit running up from it.
        ctx.save();
        ctx.beginPath(); skirt(ctx); ctx.clip();
        gold((c) => {
          c.moveTo(px - wHem + sway, hemY - 0.012 * u);
          c.quadraticCurveTo(px + sway, hemY + 0.038 * u, px + wHem + sway, hemY - 0.012 * u);
        });
        ctx.strokeStyle = OUTLINE;
        ctx.globalAlpha *= 0.5;
        ctx.lineWidth = hair(0.45, ow * 0.7);
        ctx.beginPath();
        ctx.moveTo(px + wHem * 0.44 + sway, hemY);
        ctx.lineTo(px + wTop * 0.34, top + 0.02 * u);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Sash over the waist, covering the top seam of whichever skirt this is.
    // Its own colour: a sash in the dress colour is a fold, and in the trim
    // colour it is a belt.
    // Measured at its OWN height, like every other band on this rig. Sized off
    // the shoulder line it overhangs a tapered waist on both sides — the same
    // fault the gear belt had, and one that only shows once a cut has a real
    // waist to show it on.
    const sashHalf = (spec.taper
      ? taperHalfAt(dressBeltY, torsoTop, torsoBot, torsoHalf, waistHalf, shoulderSoft)
      : torsoHalf) * 1.04;
    outlined(ctx, p.sash || p.p, hair(0.5, ow * 0.6), (c) =>
      roundRectPath(c, px - sashHalf, dressBeltY - 0.032 * u, sashHalf * 2, 0.066 * u, 0.018 * u));
    if (!lod) {
      // The knot, off-centre, with a short tail — a sash tied rather than a
      // band pulled on.
      outlined(ctx, p.sash || p.p, hair(0.4, ow * 0.5), (c) =>
        c.ellipse(px - sashHalf * 0.36, dressBeltY + 0.004 * u, 0.032 * u, 0.026 * u, 0, 0, Math.PI * 2));
    }
  }
  if (spec.apron && !slide) {
    // A bib apron, which is one shape and not two: bib, waist and skirt are cut
    // as a single panel so the join never shows a seam of uniform through it at
    // small sizes. Narrower at the chest than at the hem, the way an apron
    // actually hangs — a straight rectangle read as a sandwich board.
    const px = torsoCx;
    const bibTop = torsoTop + 0.075 * u;
    const waistY = hipY - 0.04 * u + bob;
    const hemY = hipY + legL * 0.42 + bob * 0.5;
    // The band's BOTTOM outer edge is pinned to the bib's top corner, so the two
    // meet exactly and the contour runs straight from the bib's side up the
    // outside of the strap. Sized independently they drifted and the bib grew a
    // shelf outboard of each strap.
    const strapHalf = 0.027 * u;
    const wBib = torsoHalf * 0.62, wWaist = torsoHalf * 0.88, wHem = torsoHalf * 1.12;
    // Bib and straps stay SEPARATE shapes on purpose: that is the only way an arm
    // can slot BETWEEN them — in front of the bib, behind the strap — which is
    // what a pinafore actually does when you put your hands on your hips. Both
    // are outlined() FILLS, though, never strokes: a stroked band picked up a
    // flatter shade than the filled panel beside it, which is what made the strap
    // fabric read as a different cream from the bib.
    const apronPanel = (c) => {
      c.moveTo(px - wBib, bibTop);
      c.lineTo(px + wBib, bibTop);
      c.lineTo(px + wWaist, waistY);
      c.lineTo(px + wHem, hemY);
      c.quadraticCurveTo(px, hemY + 0.04 * u, px - wHem, hemY);
      c.lineTo(px - wWaist, waistY);
      c.closePath();
    };
    outlined(ctx, p.a, ow, apronPanel, APRON_OUTLINE);
    if (!lod) {
      // The reference-approved straps: outlined-fill quads from the bib's top
      // corners splaying up to 0.6·torsoHalf, run PAST the torso top and cut by
      // the TORSO SILHOUETTE clip. 0.6 keeps the whole band inside the torso's
      // flat top span (the corner rounding starts at ~0.62 of the half-width),
      // so the silhouette cut is a clean straight top: no notch, no drawn top
      // border, and the tops vanish under the chin — the head paints after the
      // apron, so the visible strap ends at the neckline the way a real
      // pinafore strap disappears over the shoulder.
      const sTopX = (s) => px + s * torsoHalf * 0.6;
      const sBotX = (s) => px + s * (wBib - strapHalf);
      const drawStraps = () => {
        ctx.save();
        ctx.beginPath(); torsoPath(ctx); ctx.clip();
        // Second clip: nothing below the bib line, so no strap ink runs down
        // inside the bib.
        ctx.beginPath();
        const clipTop = torsoTop - 0.2 * u;
        ctx.rect(px - torsoHalf * 3, clipTop, torsoHalf * 6, (bibTop + ow * 1.6) - clipTop);
        ctx.clip();
        for (const s of [-1, 1]) {
          // Hairline: the straps lie ON the bib, and at contour weight the two
          // read as separate pieces of cloth stitched together rather than as
          // one pinafore. The bib itself keeps the full weight — that edge is
          // the garment against her body.
          outlined(ctx, p.a, ow * 0.45, (c) => {
            c.moveTo(sTopX(s) - s * strapHalf, torsoTop - 0.05 * u);
            c.lineTo(sTopX(s) + s * strapHalf, torsoTop - 0.05 * u);
            c.lineTo(sBotX(s) + s * strapHalf, bibTop + 0.06 * u);
            c.lineTo(sBotX(s) - s * strapHalf, bibTop + 0.06 * u);
            c.closePath();
          }, APRON_OUTLINE);
        }
        ctx.restore();
      };
      // The bib's upper band — from just under the strap tails down to the
      // armpit line — re-covers whatever arm crossed it, so the upper arm tucks
      // behind the bib while the forearm/hand lower down stay on top of it.
      // Fill and edge both re-lay; the edge ink is opaque, so the repaint can't
      // darken the panel's outline where it doubles.
      const recoverBibBand = () => {
        ctx.save();
        ctx.beginPath();
        const bandTop = bibTop + ow * 1.6;
        ctx.rect(px - torsoHalf * 3, bandTop, torsoHalf * 6, (armY + armL * 0.38) - bandTop);
        ctx.clip();
        outlined(ctx, p.a, ow, apronPanel, APRON_OUTLINE);
        ctx.restore();
      };
      // Name tag pinned HIGH on the bib — just under the strap tails, the way
      // one actually sits on a chest, not down by the waist tie. That puts it
      // inside the band recoverBibBand() re-lays, so it has to paint after that
      // pass or the run/jump poses would wipe it; hence the closure.
      const drawNameTag = () => {
        // A pale badge with a coloured header strip and a scribble of a name:
        // small enough to read as a badge, not a sign, and it holds down to the
        // counter size.
        const tagW = 0.12 * u, tagH = 0.066 * u;
        const tagX = px - tagW / 2, tagY = bibTop + 0.028 * u;
        outlined(ctx, p.w, hair(0.4, ow * 0.5), (c) => roundRectPath(c, tagX, tagY, tagW, tagH, 0.014 * u), APRON_OUTLINE);
        ctx.save();
        ctx.beginPath(); roundRectPath(ctx, tagX, tagY, tagW, tagH, 0.014 * u); ctx.clip();
        ctx.fillStyle = p.b; ctx.fillRect(tagX, tagY, tagW, tagH * 0.42);
        ctx.restore();
        ctx.strokeStyle = '#5a5546'; ctx.lineWidth = hair(0.32, ow * 0.32);
        ctx.beginPath();
        ctx.moveTo(tagX + tagW * 0.24, tagY + tagH * 0.74);
        ctx.lineTo(tagX + tagW * 0.76, tagY + tagH * 0.74);
        ctx.stroke();
      };
      // Draw once, on the correct side of the arm: after it whenever the front
      // arm paints over the apron, otherwise here.
      const frontArmOverApron = armsInFront || clapFront || !stand;
      if (!frontArmOverApron) drawStraps();
      apronStrapOver = frontArmOverApron
        ? () => { drawStraps(); recoverBibBand(); drawNameTag(); }
        : null;
      ctx.save();
      ctx.globalAlpha *= 0.5;
      ctx.strokeStyle = APRON_OUTLINE;
      ctx.lineWidth = hair(0.4, ow * 0.45);
      ctx.beginPath();
      ctx.moveTo(px - wWaist, waistY);
      ctx.lineTo(px + wWaist, waistY);
      ctx.stroke();
      ctx.restore();
      // A pocket, because every apron in every cafeteria has exactly one and it
      // always has a pen in it.
      outlined(ctx, p.b, hair(0.4, ow * 0.45),
        (c) => roundRectPath(c, px + wWaist * 0.06, waistY + 0.045 * u, 0.1 * u, 0.075 * u, 0.014 * u), APRON_OUTLINE);
      // ...and in the standing pose nothing repaints the bib after this, so the
      // tag lands here — expected on a counter server.
      if (!frontArmOverApron) drawNameTag();
    }
  }
  // Defined here rather than beside drawCelShield below: the DRAW pose paints
  // the bow arm in this same front pass (see bowArmFront), which is earlier
  // than the celebrate routines that also use it.
  const drawFarArm = () => {
    if (armDimsB) muscleLimb(ctx, shB, armY, handB[0], handB[1], armSeg, armSegF, elbB, p.s, ow, armDimsB);
    else limb2(ctx, shB, armY, handB[0], handB[1], armSeg, elbB, armWB, recede(armFill, farShade), ow, armWB, true);
    drawPuff(shB, armY, handB, armSeg, elbB, armSegF, farShade);
    if (pistolAngleB != null) drawPistol(ctx, handB[0], handB[1], pistolAngleB, u, ow, p, farShade);
    handDeco(handB[0], handB[1], 0, shB, armY, elbB);
  };
  if (!clapFront && !armOverHead && (!stand || raisedArmStudyFront || armsReachFront)) {
    if (bowArmFront) drawFarArm();
    drawFrontArm();
    if (strapOverArm) strapOverArm();
    if (slingOverArm) slingOverArm();
    if (apronStrapOver) apronStrapOver(); // strap passes over the near arm in the run/jump/slide cycle
  }

  // Idle drew its arm before the costume, so finish the reserved socket pass
  // here; moving poses already finish it immediately after their front arm.
  if (stand && !raisedArmStudyFront && !armsReachFront && !clapFront
      && !armOverHead && !armsInFront && slingOverArm) {
    // The arm must occlude the lower return before recovering the shoulder.
    drawFrontArm();
    slingOverArm();
  }

  // head (or the stump of one)
  if (pose.headless) {
    outlined(ctx, p.s, hair(0.6, ow * 0.8), (c) => c.ellipse(torsoCx, torsoTop, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  } else {
    // Head rides the SAME half-lean as the torso (leanX * 0.5). Given the full
    // leanX it sits a half-lean ahead of the body, and the torso's back edge
    // juts out behind the neck — a hump, most visible on a tapered torso.
    //
    // ...and it LEADS the body by a hair while she is moving. This used to be a
    // flat `0.01 * u +`, applied to every humanoid in every pose with nothing
    // saying why, and it was doing two jobs at once. Standing, it was simply an
    // error: every face in the cast sat a little right of the body under it —
    // Lorenzo's moustache, Gnash's nose, Clara's neckline, all off their own
    // centre line at rest, forever. Under a pixel in a lane, which is how it
    // survived, and plain at portrait and gallery scale.
    //
    // Moving, it was doing real work. The whole cast is drawn facing +x, and a
    // head carried a touch ahead of the shoulders is what looking where you are
    // going looks like; centred, a runner's face reads planted on the body and
    // the perspective goes flat. So the offset stays for exactly the poses that
    // travel — `stand` is the rig's own name for at-rest — and the resting poses
    // get the centre they should always have had. Same 0.01u it always was;
    // only the poses that get it changed. The yaw term beside it is untouched:
    // that is a real three-quarter offset, not a nudge.
    drawHead(ctx, id, spec, p, u, ow, (stand ? 0 : 0.01 * u) + torsoCx + nearSign * turnDepth * 0.015 * u, headY, lod, pose);
  }

  // The same round shield he normally carries on his back, riding whichever
  // hand target the routine put it on.
  const drawCelShield = () => {
    const [sx, sy] = celShield;
    outlined(ctx, p.w, ow, (c) => c.arc(sx, sy, 0.15 * u, 0, Math.PI * 2));
    outlined(ctx, p.a, hair(0.5, ow * 0.65), (c) => c.arc(sx, sy, 0.095 * u, 0, Math.PI * 2));
    dot(ctx, sx, sy, 0.035 * u, OUTLINE);
  };


  // A throw cocked overhead: the near arm (both arms, for the two-hand heave)
  // paints over the head, the way Grumpos's flex does below.
  if (armOverHead) {
    if (armOverHead === 2) drawFarArm();
    drawFrontArm();
    if (strapOverArm) strapOverArm();
    if (slingOverArm) slingOverArm();
  }
  if (propOverHead && !propBehind && spec.ranged && pose.menuAction === 'aim') {
    // THE DOUBLE HAND, finally. drawFrontArm paints the near arm — and its
    // hand — under a small SEAT translate (ARM_SEAT_IN inboard, ARM_SEAT_DOWN
    // down), and this block ran outside it: the bow's string went to the
    // unseated hand target, and the hand re-drawn over the nock landed
    // 0.03u away from the one the arm had already painted. Two hands, one
    // over the arrow and one under it. Seat the string hand the same way the
    // arm does, so the string, the nock and the one visible hand agree.
    const seated = pose.kind !== 'celebrate' && !(frontLegs && !turned);
    const seatF = seated ? [handF[0] - sideF * ARM_SEAT_IN * u, handF[1] + ARM_SEAT_DOWN * u] : handF;
    drawRangedHeld(ctx, spec, seatF, handB, shF, armY, pose, u, ow, p);
    // ...and the string hand goes back on top of it, at the SEATED spot: the
    // prop has to paint after the head (the shaft crosses his neck), which
    // also put it over the glove.
    handDeco(seatF[0], seatF[1], 0, shF, armYF, elbF);
    // The BOW hand too, over the grip: painted under the bow it looked like the
    // limb was growing out of his wrist. The far arm carries no seat.
    if (RANGED_GESTURES[spec.ranged] === 'draw') handDeco(handB[0], handB[1], 0, shB, armY, elbB);
  }
  // Grumpos's celebrate arms draw dead LAST, after the head: the flex brings
  // both fists up beside the face, and drawn before the head they slide
  // behind the beard — hands vanishing behind his own neck mid-pose.
  if (clapFront) {
    if (celShield) {
      // Near arm, then the shield over the hand gripping it — the disc is
      // strapped to the back of that hand, so covering it is what reads as a
      // grip — then the far arm on top, so the hand it rests on the rim with
      // stays visible instead of disappearing behind the shield.
      drawFrontArm();
      drawCelShield();
      drawFarArm();
    } else {
      drawFarArm();
      drawFrontArm();
    }
    if (slingOverArm) slingOverArm();
    if (apronStrapOver) apronStrapOver(); // straps cross OVER the arms (Dolores' hips celebrate)
  }
  // Front-pass standing idle (see armsInFront): far arm then near arm, both over
  // the apron, then the straps back over the arms at the shoulder.
  if (armsInFront) {
    if (armDimsB) muscleLimb(ctx, shB, armY, handB[0], handB[1], armSeg, armSegF, elbB, recede(p.s, farShade), ow, armDimsB);
    else limb2(ctx, shB, armY, handB[0], handB[1], armSeg, elbB, armWB, recede(armFill, farShade), ow, armWB, true);
    drawPuff(shB, armY, handB, armSeg, elbB, armSegF, farShade);
    handDeco(handB[0], handB[1], farShade, shB, armY, elbB);
    drawFrontArm();
    if (slingOverArm) slingOverArm();
    if (apronStrapOver) apronStrapOver();
  }
}

function drawRoll(ctx, spec, p, pose, u, ow) {
  const r = 0.26 * u;
  const band = p.p === p.b ? p.h : p.p; // contrast stripe in the hero's palette
  ctx.save();
  ctx.translate(0, -r - 0.01 * u);
  ctx.rotate((pose.time || 0) * 14);
  outlined(ctx, p.b, ow, (c) => c.arc(0, 0, r, 0, Math.PI * 2));
  ctx.strokeStyle = band;
  ctx.lineWidth = 0.07 * u;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, 0); ctx.lineTo(r * 0.8, 0);
  ctx.moveTo(0, -r * 0.8); ctx.lineTo(0, r * 0.8);
  ctx.stroke();
  ctx.restore();
  // speed arcs trailing behind
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = hair(1, ow * 0.6);
  ctx.globalAlpha *= 0.45;
  ctx.beginPath(); ctx.arc(-r * 1.5, -r, r * 0.45, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(-r * 1.9, -r, r * 0.3, -0.6, 0.6); ctx.stroke();
  ctx.globalAlpha /= 0.45;
}

// ------------------------------------------- slide replacement candidates (lab)
// GALLERY ONLY. The slide is the one pose the hero HOLDS while the world streams
// past, and a front-on crouch gliding sideways is the read the bake-off exists
// to fix. `pose.slideStyle` names a candidate below; no production pose sets it,
// so the shipped crouch (and every slide test) is untouched. The winner wires
// into poseFromPlayer and this table comes out — see the gallery section.
//
// All three draw feet-at-origin facing +x (travel), inside the slide's own
// height envelope: the shipped crouch crowns at ~0.66u, and the gallery draws
// its clearance bar there.
// The near-arm extension bake-off used to sit here — five candidates for how
// straight the trailing arm comes out in the held slide, and the pose seam they
// read. SETTLED 8 Sep 2026 at A2: the hand is solved for 0.96 of the whole arm,
// cast-wide, at the shared deck height. See the rule and the measured spread it
// replaced in drawSlideKick.
const SLIDE_ROLL_R = 0.30;   // tuck ball radius, in u
const SLIDE_ROLL_SPIN = 13;  // rad/s — ~2 rev/s; rim speed 3.9u/s, see gallery

// The shipped crouch folds a standing figure by scaling 1.7 -> 1.0 over the
// 0.14s slideAmount blend. The candidates own their whole geometry, so they
// take the same trick at the dispatch: taller and slightly narrower while
// still folding, settled at 1:1.
function slideStyleEntry(ctx, pose) {
  const raw = pose.slideAmount == null ? 1
    : Math.max(0, Math.min(1, Number(pose.slideAmount) || 0));
  const e = raw * raw * (3 - 2 * raw);
  if (e < 1) ctx.scale(0.92 + 0.08 * e, 1.55 - 0.55 * e);
}

// Thigh holster, laid ALONG the thigh: the context rotates so local +y runs
// down the bone, and every offset below is read in that frame. `drawn` empties
// it — the gun cannot be in her hand and in the holster at the same time.
// Takes the KNEE as a point rather than solving for it, so a caller that has
// already run the IK (the standing rig) and one that has not (the reclined
// poses, which hand it the joint they drew their own limb around) can share it.
// How much of the way the neckline travels from the trunk's centre line toward
// the head. Not all of it: the head is a long way off the axis in these poses,
// and following it the whole way puts the collar out on her flank with the cut
// running down toward the belt. Half lands it under the middle of the face,
// which is where a neckline looks like it belongs, while the shape it is cut
// into is still recognisably the front of a chest.
const V_FOLLOWS_FACE = 0.5;

// How far a world point sits ACROSS a capsule's axis, in the capsule's own
// local frame — the frame slideTorsoCapsule paints in, where +x runs hip to
// shoulder and +y is a quarter turn on from it. The reclined poses use it to
// tell the capsule where their head landed.
function axisOffset(hipX, hipY, shX, shY, px, py) {
  const ax = shX - hipX, ay = shY - hipY;
  const L = Math.hypot(ax, ay) || 1;
  return ((px - hipX) * -ay + (py - hipY) * ax) / L;
}

// drawToon's own LOD threshold, so the capsule's detail drops out at exactly
// the size the standing rig's does instead of guessing a second number.
// Where the head SEATS on the reclined body, in u forward of the shoulder.
//
// This was 0.08u, and it was wrong for the whole cast. Fernwick carried a
// `slideHeadBack: 0.07` to undo almost all of it — a per-hero dial for "her
// head reads thrust forward" — and she was the only slide anyone thought
// looked right. Swept across the cast at 0, 0.04, 0.07 and 0.1 back, every
// hero told the same story hers did: at the old seat the skull stands off the
// shoulders with the neck showing, and at 0.07 back it sits down into them.
// One hero needing a correction is a dial; nine needing the same one is the
// default being wrong, so the default moved and her dial came off.
//
// It is not zero. A head seated dead on the shoulder axis parks the face on
// the near shoulder — the failure the comment at the head placement below
// still records — so the seat keeps a little forward lead, just a tenth of
// what it had.
const SLIDE_HEAD_SEAT = 0.01;

// The slung axe, in ONE place. It used to live inline in the standing pass,
// which is why the slide had no axe at all: the slide is its own painter and
// re-implements every worn thing, so anything left inline in drawHumanoid is
// something the slide silently goes without. `tests/slide-kit.js` found this.
// (x, y) is the shoulder anchor — the blade peeks over the deltoid beside the
// beard, never off the head.
// The shipped axe, plus three dials for the bake-off. The ART IS UNCHANGED —
// the same absolute path that has always been here — and every variant is a
// transform applied around it: `angle` rotates the whole axe about the point
// it is pinned to the shoulder, `blade` scales the head about its own centre,
// and `steel`/`sheen` restate its two values. Passing nothing draws exactly
// what shipped, which is the only way a bake-off row can honestly include the
// current art as its reference.
//
// Rotating rather than re-pointing matters: written as absolute points the
// angle and the size could not be changed independently, because every point
// carried both.
function paintBackAxe(ctx, p, u, ow, lod, x, y, o = {}) {
  const SHIPPED_DEG = 41.3;
  const steel = o.steel || '#b8d8f0';
  const sheen = o.sheen || '#eaf8ff';
  const blade = o.blade ?? 1;
  ctx.save();
  if (o.angle != null && o.angle !== SHIPPED_DEG) {
    // Pivot on the haft's butt — where the axe meets him. Turning it about any
    // other point slides the whole thing off the shoulder as well as rotating
    // it, and then the row is comparing two changes at once.
    const rx = x + 0.08 * u, ry = y + 0.12 * u;
    ctx.translate(rx, ry);
    // POSITIVE ANGLE RAISES THE BLADE. The haft's head end is up and to his
    // left, so a positive rotation in canvas (y down) was swinging it further
    // round and DOWN toward his hip — the opposite of "more vertical". The
    // sign is flipped so `angle` reads the way it is named: 90 stands the
    // shaft straight up with the head beside his own.
    ctx.rotate((o.angle - SHIPPED_DEG) * Math.PI / 180);
    ctx.translate(-rx, -ry);
  }
  limb(ctx, x + 0.08 * u, y + 0.12 * u, x - 0.33 * u, y - 0.24 * u, 0.06 * u, p.w, ow);
  ctx.save();
  // The HEAD turns independently of the haft. Rotating the whole axe moves the
  // blade's own bearing with it, so a steeper haft also tips the cutting edge
  // over — and the haft's position and the head's attitude are two different
  // judgements. `headAngle` is degrees applied to the head alone, positive
  // bringing the edge toward vertical; both it and the blade scale pivot on the
  // head's own centre, so a smaller or turned head stays on the end of the
  // haft instead of drifting off it.
  const headTurn = o.headAngle || 0;
  // `headSlide` walks the head DOWN the shaft, in u — positive toward the butt.
  // Along the haft's own axis, not the screen's, so it stays on the shaft
  // whatever angle the axe is set to. The shipped haft bears up and to his
  // left, so down the shaft is the opposite of that.
  const slide = o.headSlide || 0;
  const HX = 0.752, HY = 0.660;   // unit vector up the shipped haft
  if (blade !== 1 || headTurn || slide) {
    const cx = x - 0.37 * u + slide * HX * u, cy = y - 0.14 * u + slide * HY * u;
    ctx.translate(cx, cy);
    if (headTurn) ctx.rotate(headTurn * Math.PI / 180);
    if (blade !== 1) ctx.scale(blade, blade);
    // Back to the head's own drawn position, then along the shaft: the scale
    // and the turn happen about where the head ENDS UP, so sliding it does not
    // also swing it.
    ctx.translate(-(x - 0.37 * u), -(y - 0.14 * u));
  }
  // The blade, as ONE path used three times: the fill, then a shaded band and a
  // bright edge clipped inside it. Metal is not a colour, it is a value JUMP —
  // a flat fill with one streak on it reads as painted card whatever hue it is
  // given. What says steel here is that the socket half sits in shadow, the
  // cutting edge carries a hard bright rim, and the step between them is
  // abrupt rather than blended.
  const bladePath = (c) => {
    c.moveTo(x - 0.34 * u, y - 0.3 * u);
    c.quadraticCurveTo(x - 0.54 * u, y - 0.16 * u, x - 0.41 * u, y + 0.03 * u);
    c.lineTo(x - 0.27 * u, y - 0.04 * u);
    c.lineTo(x - 0.24 * u, y - 0.25 * u);
    c.closePath();
  };
  outlined(ctx, steel, ow, bladePath);
  if (!lod) {
    ctx.save();
    ctx.beginPath(); bladePath(ctx); ctx.clip();
    // The BACK half, in shadow. Cut as a straight band across the blade rather
    // than a soft gradient: a hard boundary is what reads as a ground bevel,
    // and a gradient at this size is just a smudge.
    ctx.fillStyle = 'rgba(20,32,48,0.3)';
    ctx.beginPath();
    ctx.moveTo(x - 0.2 * u, y - 0.34 * u);
    ctx.lineTo(x - 0.36 * u, y - 0.02 * u);
    ctx.lineTo(x - 0.2 * u, y + 0.08 * u);
    ctx.lineTo(x - 0.14 * u, y - 0.3 * u);
    ctx.closePath();
    ctx.fill();
    // The CUTTING EDGE, bright and hard against it, traced along the outer
    // curve just inside the silhouette so it can never spill past the rim.
    ctx.strokeStyle = sheen;
    ctx.lineWidth = hair(0.7, ow * 1.05);
    ctx.beginPath();
    ctx.moveTo(x - 0.335 * u, y - 0.288 * u);
    ctx.quadraticCurveTo(x - 0.525 * u, y - 0.155 * u, x - 0.405 * u, y + 0.022 * u);
    ctx.stroke();
    // One narrow highlight across the face, at a different angle from the
    // bevel — two marks crossing is what stops the blade reading as flat.
    ctx.globalAlpha *= 0.75;
    ctx.lineWidth = hair(0.5, ow * 0.5);
    ctx.beginPath();
    ctx.moveTo(x - 0.44 * u, y - 0.16 * u);
    ctx.lineTo(x - 0.28 * u, y - 0.115 * u);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

const lodCapsule = (u) => u < 16;
function thighHolsterAt(ctx, p, u, ow, lod, rootX, rootY, kx, ky, w, shadeAmt, drawn, t = 0.74) {
  // Low on the thigh, near the knee. Up at the hip — where the first cut put
  // it — the pouch, the belt and the belt's own pouch stack into one band of
  // leather across the waist and the character loses her whole midsection to
  // it. A thigh rig hangs where it does for the same reason: so the hand can
  // reach it past the belt, not through it.
  //
  // `t` is a fraction of the THIGH, and the reclined poses pass a smaller one.
  // Standing, the thigh is long and 0.74 lands in clear leather; folded under a
  // slide it is barely a holster deep, and the same fraction parks the pouch
  // squarely on the kneecap, where it stops reading as a holster and starts
  // reading as a knee pad.
  const ang = Math.atan2(ky - rootY, kx - rootX);
  ctx.save();
  ctx.translate(rootX + (kx - rootX) * t, rootY + (ky - rootY) * t);
  ctx.rotate(ang - Math.PI / 2);
  const half = w * 0.66;
  // Grip first, so the pouch covers where it enters — that overlap is the
  // only thing that says the gun is IN the holster rather than beside it.
  if (!drawn) {
    outlined(ctx, recede(p.gunGrip || p.w, shadeAmt), hair(0.45, ow * 0.5), (c) =>
      roundRectPath(c, -half * 0.5, -0.075 * u, half, 0.1 * u, 0.012 * u));
  }
  outlined(ctx, recede(p.w, shadeAmt), hair(0.5, ow * 0.6), (c) =>
    roundRectPath(c, -half, -0.02 * u, half * 2, 0.135 * u, 0.022 * u));
  if (!lod) {
    // The thigh strap that holds it on. One line: two read as a costume.
    ctx.strokeStyle = recede(p.w, shadeAmt);
    ctx.lineWidth = hair(0.45, 0.02 * u);
    ctx.beginPath();
    ctx.moveTo(-half * 1.15, -0.045 * u);
    ctx.lineTo(half * 1.15, -0.045 * u);
    ctx.stroke();
  }
  ctx.restore();
}

// A reclined torso capsule dressed the way the STANDING rig dresses it: shirt
// colour dominant, trouser colour only below a belt near the hip end, the
// brown belt riding the colour seam and thin suspender straps over the shirt
// (spec.straps). The slide and the dive both recline the torso, and both got
// this wrong twice by inventing a dressing instead of quoting the rig's own.
// Hand treatment for the slide's arm ends, quoting the rig's handDeco
// branches: Grumpos's gold gauntlets, the plumber glove, Kiko's bracers,
// fingerless gloves, bare p.hand hands — and NOTHING for the heroes whose
// walking arms end in a plain limb cap. Inventing skin circles for those gave
// Gnash hands he has never had.
// `fromX/fromY` is the shoulder, as in handDeco: the arm's direction, for the
// shaped hands to point along.
function slideHand(ctx, id, spec, p, u, ow, armW, x, y, lod, shX = null, shY = null, seg = 0, dir = -1) {
  let ang = null;
  if (shX != null) {
    const [ex, ey] = joint(shX, shY, x, y, seg, dir);
    ang = Math.atan2(y - ey, x - ex);
  }
  if (id === 'grumpos') {
    paintHand(ctx, spec, u, ow, x, y, 0.058 * u, p.g, p.s, ang, false, 'slide');
  } else if (spec.plumber) {
    paintHand(ctx, spec, u, ow, x, y, 0.058 * u, p.w, p.hand || p.s, ang, true, 'slide');
  } else if (spec.bracers) {
    const br = armW * 0.95;
    if (!lod) {
      ctx.fillStyle = p.a;
      for (const a of [-0.9, 0, 0.9]) {
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * br, y + Math.sin(a) * br);
        ctx.lineTo(x + Math.cos(a - 0.3) * br * 0.8, y + Math.sin(a - 0.3) * br * 0.8);
        ctx.lineTo(x + Math.cos(a + 0.3) * br * 0.8, y + Math.sin(a + 0.3) * br * 0.8);
        ctx.closePath();
        ctx.fill();
      }
    }
    paintHand(ctx, spec, u, ow, x, y, br, p.ribbon || p.w, p.hand || p.s, ang, true, 'slide');
  } else if (spec.gloves) {
    paintHand(ctx, spec, u, ow, x, y, armW * 0.8, p.w, p.hand || p.s, ang, true, 'slide');
  } else if (spec.goldCuffs) {
    // The bracelet, sliding: the standing hand has had one since it shipped
    // and this pose did not, so she took her jewellery off to power-slide.
    paintHand(ctx, spec, u, ow, x, y, armW * 0.8, p.crown || p.a, p.hand || p.s, ang, true, 'slide');
  } else if (spec.hands) {
    paintHand(ctx, spec, u, ow, x, y, armW * 0.62, null, p.hand || p.s, ang, true, 'slide');
  }
}

function slideTorsoCapsule(ctx, id, spec, p, t, u, ow, hipX, hipY, shX, shY, w, flatSh = false, strapReach = 0, throatY = 0) {
  const ax = shX - hipX, ay = shY - hipY;
  const L = Math.hypot(ax, ay) || 1;
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(Math.atan2(ay, ax));
  // The capsule as a real PATH, not a fat stroke: the seat below needs a clip
  // to end square at the belt. Drawn as a stroke, the trouser colour's round
  // line-cap bulged half a torso-width past the belt line — an oval hanging
  // off the belt, not trousers ending at one.
  // `taper` narrows the hip end the way the standing rig narrows the waist —
  // Grumpos is broad at the shoulders and 0.58 of that at the belt, and a
  // constant-width tube read as a different body entirely.
  const taper = spec.taper || 1;
  const rHip = (w / 2) * taper, rSh = w / 2;
  const capsule = taper === 1
    ? (c) => roundRectPath(c, -w / 2, -w / 2, L + w, w, w / 2)
    : (c) => {
      c.arc(0, 0, rHip, Math.PI / 2, Math.PI * 1.5);
      c.lineTo(L, -rSh);
      if (flatSh) c.lineTo(L, rSh);
      else c.arc(L, 0, rSh, -Math.PI / 2, Math.PI / 2);
      c.closePath();
    };
  outlined(ctx, p.b, ow, capsule);
  const beltX = L * 0.24;
  // The colour bands, hip end first, each one painted over the last exactly the
  // way the standing rig stacks them: shirt, then bare midriff from the cropped
  // hem down, then trousers from the belt down. Clipped to the capsule so the
  // silhouette never moves — only the colour map — which is the same rule the
  // standing torso paints under.
  ctx.save();
  ctx.beginPath(); capsule(ctx); ctx.clip();
  // `crop` is where the hem sits between the shoulders and the belt, and it
  // reads the same on a body lying down: the axis runs hip(0) to shoulder(L),
  // so the standing fraction maps straight onto it.
  const hemX = spec.crop ? L - (L - beltX) * Math.max(0, Math.min(1, spec.crop)) : null;
  if (hemX != null) {
    ctx.fillStyle = p.s;
    ctx.fillRect(-w, -w, hemX + w, w * 2);
  }
  // trouser seat: everything hipward of the belt — paint with a straight edge
  // at the seam, exactly like the standing rig's below-the-belt fill
  ctx.fillStyle = p.p;
  ctx.fillRect(-w, -w, beltX + w, w * 2);
  if (hemX != null && !lodCapsule(u)) {
    // Skin against a mid-value top is a weak edge, same as standing: the hem
    // gets a hairline or the top just fades into the midriff.
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = hair(0.45, ow * 0.6);
    ctx.beginPath();
    ctx.moveTo(hemX, -w); ctx.lineTo(hemX, w);
    ctx.stroke();
    ctx.restore();
  }
  // The V throat, at the shoulder end and pointing back down the chest. Same
  // proportions as the standing cut — 0.32 of the half-width across, a soft
  // shouldered curve rather than a spike — read along the capsule's axis.
  if (spec.quiverStrap && spec.quiverMount !== 'loop') {
    // The strap, on the reclined trunk. The standing figure has worn one since
    // the case stopped floating; this pose did not, so the quiver came off its
    // strap the moment she went down on her hip. Local x runs hip(0) to
    // shoulder(L) and y across the trunk, so the band runs from the shoulder
    // end on her BACK side down to the belt on the front — the same diagonal,
    // read through this frame.
    ctx.save();
    ctx.beginPath(); capsule(ctx); ctx.clip();
    ctx.strokeStyle = p.w;
    ctx.lineWidth = 0.026 * u;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    // Both ends INSIDE the trunk's half-width. The capsule spans ±w/2 and the
    // first cut ran from -0.62w to +0.5w, so the clip ate nearly all of it and
    // the slide looked strapless.
    // The same SLING, in this frame: a short band at the shoulder end on the
    // case's own side, not a diagonal across the trunk.
    ctx.moveTo(L * 1.0, -w * 0.34);
    ctx.lineTo(L * 0.58, -w * 0.34);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.restore();
  }
  if (spec.princessCostume && spec.neckStyle && spec.neckStyle !== 'v') {
    // The gown's neckline, on the reclined trunk: the same scoop the standing
    // cut wears, sized up the way the tank's V is below and for the same
    // reason — a foreshortened trunk needs a bigger mark to read at all. One
    // arc from the shoulder end, centred on `throatY` where the chin is, and
    // the necklace lying in it with the pendant at the lowest point.
    // Deep enough to show PAST the chin: the head sits on the shoulder end
    // of this trunk and covers the first stretch of any neckline, so the cut
    // runs further down the chest than its standing proportion would.
    const nHalf = w * (spec.neckWide ?? 0.46) * 0.6, nLen = L * (spec.neckDeep ?? 0.42) * 1.05;
    const vy = throatY;
    const scoop = (c) => {
      c.moveTo(L + w * 0.5, vy - nHalf);
      c.bezierCurveTo(L - nLen, vy - nHalf, L - nLen, vy + nHalf, L + w * 0.5, vy + nHalf);
    };
    ctx.fillStyle = p.s;
    ctx.beginPath(); scoop(ctx); ctx.closePath(); ctx.fill();
    if (!lodCapsule(u)) {
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.45, ow * 0.6);
      ctx.beginPath(); scoop(ctx); ctx.stroke();
      ctx.restore();
      if (spec.necklace) {
        const cx = L - nLen * 0.72;
        ctx.strokeStyle = p.a;
        ctx.lineWidth = hair(0.25, 0.007 * u);
        ctx.beginPath();
        ctx.moveTo(L + w * 0.3, vy - nHalf * 0.75);
        ctx.quadraticCurveTo(cx - 0.02 * u, vy, L + w * 0.3, vy + nHalf * 0.75);
        ctx.stroke();
        outlined(ctx, p.a, hair(0.35, ow * 0.4), (c) => c.arc(cx + 0.012 * u, vy, 0.024 * u, 0, Math.PI * 2));
        dot(ctx, cx + 0.012 * u, vy, 0.011 * u, p.gem || '#e3657c');
      }
    }
  } else if (spec.tank) {
    // Deliberately BIGGER than the standing cut (0.16w across, 0.3L deep). Two
    // reasons, both about this pose rather than about the garment. The capsule
    // is a foreshortened trunk, so a neckline drawn at its true proportion is
    // reading across the short axis of the shape and comes out a hint rather
    // than a mark. And the chest is the only part of her the reclined poses
    // show at any size — the shoulders are under the head, the arms are out on
    // their own — so the V is carrying the whole "this is the tank top" read on
    // its own and has to be legible at lane size doing it.
    const vHalf = w * 0.26, vLen = L * 0.42;
    // `throatY` slides the whole cut across the trunk. The chest's true centre
    // is the capsule's axis, but the HEAD is not on it — the reclined poses set
    // it off to one side — and a neckline lands under a chin or it does not
    // read as a neckline at all. The caller measures where its own head
    // projects onto this axis and hands the answer over; nothing here has to
    // know where the head went.
    const vy = throatY;
    const throat = (c) => {
      c.moveTo(L + w * 0.5, vy - vHalf);
      c.quadraticCurveTo(L - vLen * 0.45, vy - vHalf * 0.42, L - vLen, vy);
      c.quadraticCurveTo(L - vLen * 0.45, vy + vHalf * 0.42, L + w * 0.5, vy + vHalf);
    };
    ctx.fillStyle = p.s;
    ctx.beginPath();
    throat(ctx);
    ctx.closePath();
    ctx.fill();
    if (!lodCapsule(u)) {
      ctx.save();
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.45, ow * 0.6);
      ctx.beginPath();
      throat(ctx);
      ctx.stroke();
      ctx.restore();
    }
  }
  // The quiver sling is HANDED BACK rather than painted here, because when it
  // paints is the whole question. Drawn at this point it goes on before the
  // garments, and the slide paints its skirt and belt over the torso further
  // down — so the strap crossed her chest and was then buried under her own
  // tunic. Standing, the same strap runs OVER the garment; it is the thing
  // holding the quiver on, and nothing is worn on top of it.
  //
  // Every caller draws it in this frame; they differ only in where in their
  // own order it belongs.
  const sling = spec.quiverMount === 'loop' ? () => {
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(Math.atan2(ay, ax));
    // At FULL scale, and on the standing strap's own numbers. This used to
    // draw at 0.6u with a return at 0.13 of that — a ribbon a twelfth of a unit
    // long, which is a stub, not a sling. It got away with it because the
    // garment painted over it afterwards and only a corner ever showed; drawn
    // on top it has to be the strap it is standing up.
    //
    // Standing: x = -torsoHalf * 0.48 across the chest, running 0.16u down from
    // the shoulder. `w` here is the FULL torso width, so its half-width is
    // w * 0.5 and the same lateral seat is w * 0.24. The trim the capsule takes
    // back off the shoulder is added on, or the strap starts a third of a torso
    // width down her chest instead of on the joint.
    // The strap's END is measured against the BELT, not in u. Standing it dies
    // partway down the chest with clear cloth between it and the waistband;
    // 0.16u from the shoulder happens to land exactly ON the slide's belt,
    // because the reclined torso between shoulder and waistband is shorter
    // than the standing one. `L - beltX` is that run in this pose, so a
    // fraction of it holds the standing relationship at any build.
    ctx.translate(L + strapReach, 0); ctx.rotate(Math.PI / 2);
    paintQuiverSling(ctx, spec, p, u, -w * 0.24, 0, (L - beltX) * (spec.slideSlingEnd ?? 0.5));
    ctx.restore();
  } : null;
  ctx.restore();
  // The belt on the colour seam, leather with a brass buckle — the standing
  // rig's own band and weights. It used to live inside the `spec.straps` branch
  // below, which made it Lorenzo's alone: every other hero who wears a belt
  // standing up lost it the moment they went to ground, and on a hero whose
  // waist is the seam between three colours that is the mark the whole midriff
  // hangs off. BUTT caps, like the suspender version: round ones bulge half a
  // stroke past each end and read as a belt hanging out past the waist.
  if (spec.gearBelt) {
    // Full width, CLIPPED to the capsule. Sized off rHip it stopped well short
    // of the sides: the belt does not sit at the hip end, it sits a quarter of
    // the way up a capsule that widens from rHip to rSh, so the body under it
    // is wider than the number it was measured against and the leather ended
    // in mid-air either side. Clipping is what lets it simply run past both
    // edges and be cut by the contour, which is also the truer read — a belt
    // seen on a body lying down wraps out of sight rather than stopping.
    ctx.save();
    ctx.beginPath(); capsule(ctx); ctx.clip();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = p.w;
    ctx.lineWidth = 0.046 * u;
    ctx.beginPath();
    ctx.moveTo(beltX, -w);
    ctx.lineTo(beltX, w);
    ctx.stroke();
    ctx.restore();
    const bk = spec.buckle || 1;
    outlined(ctx, p.a, hair(0.5, ow * 0.5), (c) =>
      roundRectPath(c, beltX - 0.029 * u * bk, -0.031 * u * bk,
        0.055 * u * bk, 0.062 * u * bk, 0.012 * u * bk));
  }
  if (spec.tatSide) {
    // Grumpos's war paint, clipped to the body like the standing stripe: a
    // red sweep off the shoulder-side chest down toward the belt.
    ctx.save();
    ctx.beginPath(); capsule(ctx); ctx.clip();
    ctx.strokeStyle = p.a;
    ctx.lineWidth = 0.075 * u;
    ctx.beginPath();
    ctx.moveTo(L * 0.98, -w * 0.3);
    ctx.quadraticCurveTo(L * 0.58, -w * 0.02, L * 0.34, w * 0.3);
    ctx.stroke();
    ctx.restore();
  }
  if (id === 'b33p') {
    // The chest screen with its alternating status lights and the hull seam
    // at the waist — the plating details that make the torso a machine.
    outlined(ctx, p.s, hair(0.5, ow * 0.55), (c) =>
      roundRectPath(c, L * 0.56, -w * 0.27, 0.105 * u, w * 0.54, 0.02 * u));
    const beat = Math.sin((t || 0) * 5) > 0;
    dot(ctx, L * 0.61, -w * 0.125, 0.018 * u, beat ? p.a : p.w);
    dot(ctx, L * 0.61, w * 0.125, 0.018 * u, beat ? p.w : p.a);
    ctx.strokeStyle = p.p;
    ctx.lineWidth = hair(0.6, ow * 0.5);
    ctx.beginPath();
    ctx.moveTo(beltX + 0.03 * u, -w * 0.42);
    ctx.lineTo(beltX + 0.03 * u, w * 0.42);
    ctx.stroke();
  }
  if (spec.straps) {
    // Suspenders, then the belt on the seam with its brass buckle — same
    // colours and weights as standing.
    // The belt stroke takes BUTT caps: round ones bulged half a stroke past
    // each end of the band, a belt hanging out past the waist.
    //
    // Two things the first cut of this got wrong, and they compounded:
    //
    // The straps ran wide at the belt and CONVERGED going up (0.08u -> 0.05u),
    // which is the opposite of the pair he wears standing — those leave the
    // belt narrow and splay out to the shoulders, because that is where a
    // suspender goes. Pointing them at each other instead made a V aimed at
    // his neck, and on a torso this foreshortened the V is most of what you
    // see. The offsets are also measured off the capsule now rather than in
    // flat u, so they hold the same fractions of the chest they hold standing
    // (0.34 of the half-width at the belt, 0.5 at the shoulder) on any build.
    //
    // And they STOPPED at L, the trimmed shoulder — which is a third of a
    // torso-width short of the real one, in open shirt, with a round cap on
    // the end. Two blunt stubs floating on the chest, the far one cut shorter
    // still by the jaw above it. They run PAST the cap now and are clipped to
    // the capsule, so each one dies on the shoulder's curve and goes under the
    // head the way the standing pair go under the arm.
    // A suspender ends AT the shoulder, and on this pose the shoulder is not
    // where the capsule stops: the capsule is trimmed back under the jaw (see
    // the caller), so a strap run to its cap ends in open shirt a third of a
    // torso-width short of the joint. On the head's side that never showed —
    // the jaw covers it — but the far strap ended mid-chest with the far arm's
    // sleeve carrying the same teal straight on past it, so there was not even
    // a silhouette edge to explain the stop. A cut strap floating on the chest.
    // `strapReach` is the trim the caller took back, so the pair runs to the
    // TRUE shoulder and dies in the arm root, clipped to a capsule extended by
    // the same amount so it can still never leave the body.
    const strapEndX = L + strapReach;
    const strapClip = (c) => {
      c.arc(0, 0, rHip, Math.PI / 2, Math.PI * 1.5);
      c.lineTo(strapEndX, -rSh);
      c.arc(strapEndX, 0, rSh, -Math.PI / 2, Math.PI / 2);
      c.closePath();
    };
    ctx.save();
    ctx.beginPath(); strapClip(ctx); ctx.clip();
    ctx.strokeStyle = p.p;
    ctx.lineWidth = 0.045 * u;
    // The pair is NOT symmetric, and that is the recline: the near shoulder is
    // turned toward camera and its strap runs almost up the spine, while the
    // FAR one has to reach a shoulder the pose has swung out and away, so it
    // has to open out to get there. Run at the near strap's angle it stayed
    // beside the spine and read as a second near strap that happened to stop
    // early. 0.8 of the half-width is as far out as it goes with a margin of
    // shirt still outboard of it — at 0.95 it lands on the silhouette and
    // stops being a strap at all, just a lighter edge on the shoulder.
    ctx.beginPath();
    for (const sgn of [-1, 1]) {
      ctx.moveTo(beltX, sgn * rSh * 0.34);
      ctx.lineTo(strapEndX, sgn * rSh * (sgn > 0 ? 0.8 : 0.5));
    }
    ctx.stroke();
    ctx.restore();
    // FULL WIDTH, CLIPPED — the same bargain the gear-belt branch above makes,
    // and for the same reason. Sized by hand at 0.47 of the torso width it fell
    // short of both edges: the belt does not sit at the hip end of the capsule,
    // it sits a quarter of the way up one that widens from rHip to rSh, so the
    // body under it is wider than the number the leather was cut to. Running it
    // past both edges and letting the contour cut it is also the truer read — a
    // belt seen on a body lying down wraps out of sight rather than stopping.
    ctx.save();
    ctx.beginPath(); capsule(ctx); ctx.clip();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = p.m;
    ctx.lineWidth = 0.05 * u;
    ctx.beginPath();
    ctx.moveTo(beltX, -w);
    ctx.lineTo(beltX, w);
    ctx.stroke();
    ctx.restore();
    ctx.lineCap = 'round';
    // The SAME buckle the gear-belt branch draws, and the same one he wears
    // standing: a rounded square. This branch had a disc, so the one hero whose
    // buckle is his most recognisable mark swapped shape the moment he went to
    // ground — and it is the only pose where it did.
    const bk = spec.buckle || 1;
    outlined(ctx, p.a, hair(0.5, ow * 0.5), (c) =>
      roundRectPath(c, beltX - 0.029 * u * bk, -0.031 * u * bk,
        0.055 * u * bk, 0.062 * u * bk, 0.012 * u * bk));
  }
  ctx.restore();
  // Handed back so anything WORN on this torso can use the body's own frame
  // rather than deriving a second, slightly different one. The tool belt did
  // exactly that and drifted: its own hand-placed centre put the band a
  // twentieth of a unit off the hips, so it ran out before reaching his left
  // waist. `capsule` is the silhouette to clip to — the same clip that makes
  // the standing band reach exactly as far as he does — `beltX` is where this
  // rig already puts a waistband, and `angle` runs hip -> shoulder.
  return { hipX, hipY, angle: Math.atan2(ay, ax), capsule, L, beltX, w, sling };
}

// B — TUCK ROLL: a somersault, not Fernwick's ability ball. The hero stays a
// FIGURE — cap, mustache, boots — curled and tumbling, so the cast's identity
// survives the pose the way it does not in drawRoll's striped sphere.
function drawSlideTuckRoll(ctx, id, spec, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const R = SLIDE_ROLL_R * u;
  const headPose = { kind: 'slide', roll: true, time: t };
  // speed arcs trailing behind, in ground space
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = hair(1, ow * 0.6);
  ctx.globalAlpha *= 0.4;
  ctx.beginPath(); ctx.arc(-R * 1.6, -R, R * 0.5, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(-R * 2.0, -R, R * 0.34, -0.6, 0.6); ctx.stroke();
  ctx.globalAlpha /= 0.4;
  ctx.save();
  ctx.translate(0, -R - 0.01 * u);
  ctx.rotate(t * SLIDE_ROLL_SPIN); // travelling +x, so the tumble is clockwise
  // ONE clean circle is the whole read at speed: earlier cuts that let the
  // head or legs break the circle read as tumbling laundry, not a roll. The
  // ball shows his BACK — shirt colour, like the standing torso — and the
  // trouser blue arrives only as the folded legs across the front, painted
  // under a clip so the silhouette never moves (the standing rig's own
  // below-the-belt bargain).
  outlined(ctx, p.b, ow, (c) => c.arc(0, 0, R, 0, Math.PI * 2));
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = p.p;
  ctx.beginPath(); ctx.ellipse(0.16 * u, 0.11 * u, 0.23 * u, 0.20 * u, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // re-ink the rim over the paint seam
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = ow;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  // teal shirt arms hugging the ball across its front-bottom
  for (const [pad, col] of [[ow * 2, OUTLINE], [0, p.b]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.095 * u + pad;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.70, 0.5, 1.8); ctx.stroke();
  }
  // boots tucked at the front rim just past the grip — inside the ball they
  // are brown on dark blue and simply vanish
  outlined(ctx, p.f, hair(0.6, ow * 0.8), (c) =>
    c.ellipse(0.235 * u, 0.015 * u, 0.07 * u, 0.05 * u, 1.25, 0, Math.PI * 2));
  outlined(ctx, p.f, hair(0.6, ow * 0.8), (c) =>
    c.ellipse(0.225 * u, 0.115 * u, 0.07 * u, 0.05 * u, 1.05, 0, Math.PI * 2));
  // ...and the hand gripping the shins, over the boot it holds
  outlined(ctx, p.s, hair(0.5, ow * 0.7), (c) =>
    c.arc(Math.cos(0.55) * R * 0.68, Math.sin(0.55) * R * 0.68, 0.048 * u, 0, Math.PI * 2));
  // the head, small and tucked chin-down inside the circle — cap and face
  // carry the identity; sized any bigger they carry the whole ball away
  ctx.save();
  ctx.translate(0.085 * u, -0.125 * u);
  ctx.rotate(0.6);
  drawHead(ctx, id, spec, p, u * 0.62, ow, 0, 0, lod, headPose);
  ctx.restore();
  ctx.restore();
}

// C — POWER SLIDE: the runner-genre answer to "under, while moving" — leaned
// back on the grounded hip, near leg bent in front, trailing arm up off the
// deck. The head stays upright and camera-facing, which is what the crouch
// never manages: this pose only makes sense IN motion.
function drawSlideKick(ctx, id, spec, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const jig = Math.sin(t * 34) * 0.006 * u; // ground rumble through the pose
  // The held slide stays ALIVE: the feet work back and forth along the ground
  // on two slow, out-of-phase clocks, the trailing arm rides its own, and the
  // balance fist corrects on a third. The knees are not animated directly —
  // the feet move and the two-bone IK flexes each knee to reach them, which
  // is what keeps the bends looking loaded rather than waggled.
  const swayA = Math.sin(t * 3.1), swayB = Math.sin(t * 4.3 + 1.7);
  // Two per-spec dials on the feet, in u, on top of the cast's shared reaches.
  // `slideNearOut` pushes the planted near foot further AHEAD — which also
  // drops its knee, since the two-bone leg flattens as the foot goes out —
  // and `slideRearBack` pulls the folded rear foot back under her. Opposite
  // directions on purpose: pulling both back together read as crossed legs,
  // and pulling the near one back alone laid its shin across the rear foot.
  // Opening the stride is what separates the two legs, and the lower front
  // knee is what stops the skirt standing up on it.
  const footRearX = 0.11 * u + 0.02 * u * swayB - (spec.slideRearBack || 0) * u;
  const footNearX = (0.30 * u + 0.025 * u * swayA + (spec.slideNearOut || 0) * u) * (spec.slideNearLegLen || 1);
  // The rear (far) arm holds its balance fist forward-up — that one was
  // always right. The NEAR arm is the one that hangs: relaxed off the
  // reclined shoulder, hand swinging just clear of the deck. Raised it read
  // as jazz hands; planted it read as an arm too long. Gravity is the pose.
  const fistX = 0.10 * u + 0.022 * u * Math.sin(t * 2.6 + 0.8);
  const fistY = -0.40 * u + 0.016 * u * Math.sin(t * 3.7 + 2.1);
  // Further out and lower than the first cut (-0.33u, -0.09u). The near arm
  // is nearly at full reach here, so the elbow only softens instead of
  // cranking into the hard angle a shorter reach forced — and the hand rides
  // just off the deck, which is the whole point of a trailing arm. Checked
  // against the ground line at the low end of its sway, on every build: the
  // heavy gauntlet is the closest and still clears.
  const trailX = -0.37 * u + 0.02 * u * swayB;
  const trailY = -0.055 * u - 0.015 * u * swayA;
  // One skeleton, every build: widths and colours quote the rig's own
  // formulas — a heavy or slim hero slides with their own limbs, B-33P with
  // his gold arm segments and machine hands, not Lorenzo's teal and skin.
  const heavy = !!spec.heavy;
  const legW = (heavy ? 0.11 : spec.slim ? 0.082 : 0.09) * u * (spec.legWidth || 1);
  const armW = (heavy ? 0.118 : spec.slim ? 0.068 : 0.075) * u * (spec.armWidth || 1);
  const armFill = p.arm || (spec.bareArms ? p.s : p.b);
  // limb2's `seg` is the UPPER bone; the forearm is whatever reach is left
  // over to the hand. Lengthening the upper bone therefore shortens the
  // forearm without moving the hand or the shoulder — which is the only dial
  // here that shortens a forearm and leaves the pose alone. Kiko's bare
  // forearms run visibly long against her sleeved upper arm in the recline;
  // she is the only build that reads that way, and this is slide-only, so her
  // aim pose keeps the reach it was drawn for.
  // Kiko's arms run long in the recline — both bones, not just the forearm,
  // which is why biasing the upper bone alone only moved the elbow and left
  // the reach where it was. `armReach` pulls the HAND targets in toward the
  // socket, which shortens the whole limb; `upperBias` then trims the upper
  // bone inside that shorter reach. Slide-only: her aim pose is drawn to a
  // reach of its own and must not move.
  // Kiko's arms run long in the recline — both bones, which is why biasing the
  // upper bone alone only moved the elbow and left the reach where it was.
  // `armReach` pulls the HAND targets in toward the socket, shortening the
  // whole limb without moving the shoulder or the pose; `upperBias` then
  // trims the upper bone inside that shorter reach, sliding the elbow out.
  // 0.74 / 0.85 won the bake-off (2026-08) over three shorter-limb candidates.
  //
  // Slide-only, deliberately: `armLength` on her spec would shorten the arm
  // she AIMS with, and her jump and shooting poses are drawn to that reach.
  const armReach = id === 'kiko' ? 0.74 : 1;
  const upperBias = id === 'kiko' ? 0.85 : 1;
  const footFill = id === 'grumpos' ? p.w : p.f;
  // The chest is the standing chest, quoted from drawHumanoid's own formula
  // rather than invented here. The slide used to carry three flat numbers
  // (0.37 heavy / 0.26 slim / 0.30) that ignored `shoulders`, `stout` and
  // `torsoWidth` — so Grumpos, whose spec buys him 0.23u of half-torso and
  // another 8% of shoulders on top, slid narrower than he stands and read as
  // a slim rectangle instead of a broad chest tapering to the belt.
  //
  // 0.88 of it, though, and that is not a fudge: a standing torso has both
  // its edges half-covered by the arms hanging beside it, while a reclined
  // one turns its full barrel to camera. Matched number for number the slide
  // reads fatter than the same hero standing. The factor is also what keeps
  // this honest against what shipped — it lands the plain and slim builds
  // back on their shipped 0.30u and 0.26u exactly, and spends the whole
  // change on the specs that were being ignored.
  // The heavy build divides its `shoulders` back out: the slide already
  // scales his whole figure by 1.08 (the heavy crouch rule above), and the
  // standing formula multiplies the same 1.08 in as `shoulders` — quoted
  // straight, he slid 8% wider than he actually stands and the barrel
  // swallowed the recline.
  const torsoW = 2 * (heavy ? 0.23 : spec.stout ? 0.2 : spec.slim ? 0.148 : 0.17)
    * u * ((spec.shoulders || 1) / (heavy ? 1.08 : 1)) * (spec.torsoWidth || 1) * 0.88;
  // No pose.roll in the head's pose: the effort expression it forces owns the
  // mouth slot, and it cost B-33P his grille and Gnash his smirk. The slide
  // kind alone keeps the focused eyes.
  // The head is in a SLIDE, not a crouch, and it has to say so: drawHead's
  // long-hair block poses off the pose it is handed, and a bare 'slide' asked
  // it for the crouch's shoulder tuck. See the braid's own note there.
  const headPose = { kind: 'slide', slideStyle: 'kick', time: t };
  ctx.save();
  ctx.translate(0, jig);
  // Arrival: instead of the generic height blend, the slide TIPS BACK onto
  // the grounded hip over the slide blend — at slideAmount 0 the figure is
  // rotated up near standing, and it falls into the recline as the blend
  // completes, pivoting on the buttock that never leaves the ground.
  const raw = pose.slideAmount == null ? 1
    : Math.max(0, Math.min(1, Number(pose.slideAmount) || 0));
  const e = raw * raw * (3 - 2 * raw);
  if (e < 1) {
    // Upright is PLUS rotation here (the first cut tipped him flatter), and
    // the figure rides higher while upright so the extended foot stays on the
    // ground instead of swinging through it.
    ctx.translate(0, -0.18 * u * (1 - e));
    ctx.translate(-0.05 * u, -0.04 * u);
    ctx.rotate(0.5 * (1 - e));
    ctx.translate(0.05 * u, 0.04 * u);
  }
  // The tallest walker stays the biggest slider: the heavy rig follows its
  // own crouch rule — fold by a fraction of YOUR height, never to a shared
  // line — so the whole slide scales up instead of folding him to size.
  if (heavy) ctx.scale(1.08, 1.08);
  const hipX = -0.02 * u, hipY = -0.15 * u;
  // THE TAIL, and it goes down FIRST. The slide returns out of drawHumanoid
  // before the back-accessories block, so until now a tailed hero slid
  // without one. Drawn here, inside the recline transform so it tips back
  // with the hip, and before the far arm so every limb and the torso paint
  // over its root. torsoW is the slide's own chest width, already the 0.88
  // recline factor of the standing one; halved, it is the same torsoHalf the
  // standing tail roots off. `run` is false: a held slide wags at idle rate.
  ctx.save();
  ctx.translate(hipX, 0);
  drawTail(ctx, spec, p, pose, u, ow, lod, torsoW / 2, hipY, false);
  ctx.restore();
  // The heavy torso is genuinely LONGER, not only wider (torsoTop -0.768u vs
  // -0.56u standing): the shoulder rides farther up the recline, and the head
  // follows it, or he slides as a bearded ball with no chest. 1.18, not the
  // full standing ratio — paired with the head lift below it sets his slide
  // crown; see that comment.
  const stretch = heavy ? 1.18 : 1;
  // The balance fist is an ABSOLUTE height, and the heavy rig's shoulder is
  // not: `stretch` lifts his socket by 0.23u * 0.28 that nobody else gets, so
  // the fist everyone else holds just above their shoulder hung below
  // Grumpos's — a balance arm drooping instead of held. Give it back exactly
  // the height the stretch took, and it reads the same on both builds.
  const fistLift = (stretch - 1) * 0.23 * u;
  const shX = hipX - 0.22 * u * stretch, shY = hipY - 0.23 * u * stretch;
  if (spec.rig === 'ray') {
    // Ray M'n slides the way he does everything: in pieces. Same skeleton,
    // no limbs — his shoes float where the feet go, his gloves where the
    // hands go, and the scarf streams off the recline.
    ctx.save();
    ctx.translate(-0.115 * u, -0.245 * u);
    ctx.rotate(-0.76); // torso slab laid along the slide axis
    // scarf pennant streaming up and back off the collar
    ctx.fillStyle = p.m;
    ctx.beginPath();
    ctx.moveTo(-0.13 * u, -0.23 * u);
    ctx.quadraticCurveTo(-0.32 * u, -0.29 * u + swayB * 0.02 * u, -0.42 * u, -0.2 * u + swayA * 0.02 * u);
    ctx.lineTo(-0.13 * u, -0.12 * u);
    ctx.fill();
    outlined(ctx, p.b, ow, (c) => roundRectPath(c, -0.15 * u, -0.19 * u, 0.3 * u, 0.38 * u, 0.09 * u));
    outlined(ctx, p.m, ow, (c) => roundRectPath(c, -0.18 * u, -0.215 * u, 0.36 * u, 0.065 * u, 0.028 * u));
    ctx.restore();
    // floating shoes at the planted feet, his own two-ellipse build
    for (const [fx, tilt] of [[footRearX, 0.3], [footNearX + 0.03 * u, -0.08]]) {
      outlined(ctx, p.f, ow, (c) => c.ellipse(fx, -0.063 * u, 0.125 * u, 0.063 * u, tilt, 0, Math.PI * 2));
      outlined(ctx, p.w, hair(0.5, ow * 0.55), (c) => c.ellipse(fx - 0.015 * u, -0.103 * u, 0.07 * u, 0.04 * u, tilt, 0, Math.PI * 2));
    }
    // floating gloves: balance fist forward, trailing glove back and up
    outlined(ctx, p.w, ow, (c) => c.arc(fistX, fistY, 0.068 * u, 0, Math.PI * 2));
    outlined(ctx, p.w, ow, (c) => c.arc(trailX, trailY - 0.04 * u, 0.068 * u, 0, Math.PI * 2));
    // his own head painter — at absolute coordinates, same lighting rule as
    // the humanoid head: a translated frame lands the face in the ramp's
    // shadow end
    drawRayHead(ctx, id, p, headPose, u, ow, -0.24 * u, -0.5 * u, lod, false);
    ctx.restore();
    if (pose.grounded) slideDust(ctx, u, ow, t, -0.26 * u, -0.02 * u);
    return;
  }
  // Kiko's arms leave from LOWER on the recline than everyone else's. The
  // reclined head covers the shoulder socket the whole cast shares — fine for
  // a bare shoulder, which just reads as an arm coming out from behind a jaw,
  // and fatal for a sleeved one: the puff belongs ON the socket, and that
  // socket is inside the skull. So the socket moves instead of the head.
  //
  // This is the slide's version of `armOut`, which the standing rig already
  // spends on her for the same reason — a puffed sleeve is about twice the
  // arm's width, so it needs its root further out than a bare limb does.
  // Here "out" is DOWN THE SPINE, by 0.10u — the distance that carries the
  // joint past the skull's edge, so the puff seats on the socket in the open
  // and the arm visibly leaves the puff. Perpendicular was tried instead and
  // is wrong: it walks the sleeve onto her chest. Everyone else keeps the
  // shipped socket exactly; the test is spec.puffs, which is Kiko alone.
  let armX = shX, armY = shY;
  if (spec.puffs) {
    const sL = Math.hypot(shX - hipX, shY - hipY) || 1;
    const upX = (shX - hipX) / sL, upY = (shY - hipY) / sL;
    armX = shX - upX * 0.10 * u;
    armY = shY - upY * 0.10 * u;
  }
  // Puffed sleeve over an arm root (spec.puffs): bells across the limb, gold
  // cuff on the elbow side — seated on the socket the way the standing sleeve
  // is, travelling with whichever way this arm points.
  const slidePuff = (hx2, hy2, along = 0.11 * u, ox = 0, oy = 0) => {
    if (!spec.puffs) return;
    const ang = Math.atan2(hy2 - armY, hx2 - armX);
    // Seated ON the socket, the way the standing sleeve is — which the dropped
    // arm root above is what makes possible. Ridden down the limb instead, as
    // the first cut of this did to dodge the head, it stops being a shoulder
    // at all: it reads as a ball strapped to her chest.
    //
    // The default is the FAR arm's seat, and that one cannot sit on its
    // socket: the far arm passes BEHIND the torso capsule, whose cap covers
    // everything within torsoW/2 of the root, so a sleeve any closer in is
    // painted and then buried. 0.11u is where the gold cuff clears the dress
    // and caps the arm root instead of vanishing under it.
    const pcx = armX + Math.cos(ang) * along + ox, pcy = armY + Math.sin(ang) * along + oy;
    const pr = torsoW * 0.28;
    outlined(ctx, p.b, ow * 0.85, (c) => c.ellipse(pcx, pcy, pr * 0.86, pr, ang, 0, Math.PI * 2));
    if (!lod) {
      ctx.strokeStyle = p.a;
      ctx.lineWidth = hair(0.45, ow * 0.9);
      ctx.beginPath();
      ctx.ellipse(pcx, pcy, pr * 0.7, pr * 0.84, ang, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();
    }
  };
  // far (balance) arm first, behind the torso — held forward for balance, the
  // elbow only slightly soft so the fist reads as the end of an arm.
  const fx = armX + (fistX - armX) * armReach;
  const fy2 = armY + (fistY - fistLift - armY) * armReach;
  limb2(ctx, armX, armY, fx, fy2, 0.185 * u * upperBias, -1, armW * 0.95, armFill, ow, armW * 0.88, true);
  slidePuff(fx, fy2);
  slideHand(ctx, id, spec, p, u, ow, armW, fx, fy2, lod, armX, armY, 0.185 * u * upperBias, -1);
  // far leg: folded under, BEHIND the body — knee dropped well clear of the
  // torso; folded any tighter the blue thigh lies along the blue bib and
  // reads as trousers riding up the chest
  limb2(ctx, hipX, hipY, footRearX, -0.045 * u, 0.17 * u, 1, legW, p.p, ow, legW * 0.94);
  // `slideBootCover` grows each boot a little and seats it back over the
  // shin's end. The boots are offset 0.03u past the point the leg is drawn
  // to, and the leg's round end cap pokes out from under them — invisible on
  // every hero whose trousers and boots are the same brown, and the first
  // thing you see once the leg is a different colour. Per-spec, so the
  // shipped cast keeps its exact boots.
  const bc = spec.slideBootCover ? 1 : 0;
  outlined(ctx, footFill, hair(0.6, ow * 0.8), (c) =>
    c.ellipse(footRearX + (0.03 - 0.012 * bc) * u, -0.055 * u, (0.08 + 0.012 * bc) * u, (0.05 + 0.01 * bc) * u, 0.35, 0, Math.PI * 2));
  // torso reclined hip -> shoulder, dressed exactly like the standing rig
  // The capsule stops a third of a torso-width SHORT of the shoulder. Its top
  // is a round cap of torsoW/2, which the head used to cover completely; with
  // the head moved forward that cap stood proud behind the near shoulder as a
  // smooth shirt-coloured lump — the hump. Ending the capsule early tucks it
  // back under the jaw. Measured in torso widths, not in u, because the cap
  // that has to disappear IS a torso width: a flat number left the broad
  // builds humped and the slim ones over-trimmed. The arms still root at the
  // true shoulder above it, and their own root caps close the join.
  //
  // The HEAVY build cannot solve it with distance: his head rides 0.24u off
  // the shoulder, so no trim tucks a 0.21u-radius arc behind the beard — the
  // hump just slid down the spine. He gets a FLAT shoulder end instead (the
  // flatSh flag below) and a short 0.16 trim to pull the cut edge under the
  // jaw, which keeps his chest long where the big shared trim collapsed it.
  const capL = Math.hypot(shX - hipX, shY - hipY) || 1;
  const capTrim = (heavy ? 0.16 : 0.33) * torsoW;
  const capSx = shX - (shX - hipX) / capL * capTrim, capSy = shY - (shY - hipY) / capL * capTrim;
  // Where the HEAD sits across the capsule's own axis, so the neckline can be
  // cut under her chin instead of down the trunk's centre line. Measured off
  // the head this pose actually draws (hxx/hyy below) rather than assumed:
  // change where the head goes and the collar follows it.
  // HIS KIT SLIDES WITH HIM. The quiver and the worn bow are back-pass pieces
  // of the standing rig, and this painter is its own rig, so they vanished the
  // moment he dropped into a slide and came back when he stood — the bow was
  // blinking out of existence on every crate. Same painter, rotated onto the
  // back of the reclined torso: local -y runs hip-to-shoulder, and the case
  // sits the same distance off the spine it does standing, so what shows is
  // the strip along the back edge and the bow's tips past shoulder and hip.
  if (spec.back === 'axe' && !pose.axeThrown && pose.axeReady !== false) {
    // Slung on the reclined back, from the same painter the standing pose uses.
    // Grumpos simply had no axe in this pose — the standing pass drew it inline
    // and the slide, being its own painter, went without. The anchor is his
    // shoulder either way; here it is pushed out along the back normal so the
    // haft lies against the spine rather than through the torso, and turned
    // with the recline so the blade still reads over the deltoid.
    const dx = shX - hipX, dy = shY - hipY, L = Math.hypot(dx, dy) || 1;
    const ax = dx / L, ay = dy / L;          // hip -> shoulder
    const nx = ay, ny = -ax;                  // down-back
    // Rotated the way the QUIVER is, not by the body angle: the standing axe is
    // drawn with its haft running up the spine, so its local "up" (-y) has to
    // land on the hip->shoulder axis. atan2(ax, -ay) is that rotation, and it
    // is the same one the quiver beside this uses for the same reason. Turned
    // by the plain body angle instead, the axe's up became the recline's
    // down-left and the blade ended up beside his hip.
    ctx.save();
    ctx.translate(shX + nx * torsoW * 0.34, shY + ny * torsoW * 0.34);
    ctx.rotate(Math.atan2(ax, -ay));
    paintBackAxe(ctx, p, u, ow, lod, 0.16 * u, 0.1 * u);
    ctx.restore();
  }
  if (spec.back === 'quiver') {
    const dx = shX - hipX, dy = shY - hipY, L = Math.hypot(dx, dy) || 1;
    const ax = dx / L, ay = dy / L;          // hip -> shoulder
    const nx = ay, ny = -ax;                  // down-back: where his back is
    // `quiverTuck` pulls the kit toward the spine here too, at half strength
    // like the run: the back edge is real in this pose, the kit just rides it
    // closer.
    const off = torsoW / 2 + 0.07 * u - (spec.quiverTuck ?? 0) * 0.5 * u;
    const cx = shX - ax * 0.12 * u + nx * off, cy = shY - ay * 0.12 * u + ny * off;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(ax, -ay));
    // The slung bow rides UP the case here. Standing, its lower limb hangs
    // past the hip into empty air; laid out on her hip that same limb reaches
    // through her own legs and out through the deck — a bow apparently planted
    // in the ground she is sliding along. Shifted toward the shoulder, both
    // tips stay inside the figure and it still reads as a bow worn on her back.
    const kitLift = spec.quiverMount === 'loop' ? 0.035 * u : 0;
    paintQuiverKit(ctx, spec, p, u, ow, lod, { qx: 0, qTop: -0.18 * u - kitLift, qBot: 0.18 * u - kitLift, bow: [0.05 * u, -0.13 * u] });
    if (spec.quiverMount === 'loop') {
      ctx.save(); ctx.strokeStyle = p.f;
      ctx.globalAlpha *= spec.quiverStrapOpacity ?? 0.85;
      ctx.lineWidth = (spec.quiverStrapWidth ?? 0.030) * u;
      ctx.beginPath();
      for (const y of [-0.12, 0.015]) {
        ctx.moveTo(0.055 * u, y * u); ctx.lineTo(0.16 * u, y * u);
      }
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  const torso = slideTorsoCapsule(ctx, id, spec, p, t, u, ow, hipX, hipY,
    capSx, capSy, torsoW, heavy, capTrim,
    // Measured from where the head ACTUALLY sits, `slideHeadBack` included —
    // the neckline lands under the chin or it does not read as a neckline.
    // `slideNeckFollow` overrides how far the neckline follows the face here.
    // The shared half was tuned for a V, whose point can sit a little inboard
    // of the chin and still read; a pendant on a chain either hangs from the
    // chin or looks pinned to her shoulder, so the gown follows nearly all the
    // way.
    axisOffset(hipX, hipY, capSx, capSy, shX + SLIDE_HEAD_SEAT * u - (spec.slideHeadBack || 0) * u, shY - (heavy ? 0.15 : 0.12) * u)
      * (spec.slideNeckFollow ?? V_FOLLOWS_FACE));
  // near leg: bent like the rear one — knee up, foot planted ahead — and OVER
  // the body: a slide crosses the near leg in front of the reclined torso, so
  // its thigh paints on top of the seat. The root is the GROUNDED hip: he is
  // sliding on the left buttock, so the thigh leaves from the seat's lower
  // edge down by the ground line. The depth is measured from THIS hero's
  // seat, not Lorenzo's: on a slim capsule a fixed offset put the root cap
  // outside the body.
  //
  // And the seat is the WAIST, not the shoulders. This measured torsoW/2 —
  // the chest — while slideTorsoCapsule tapers its hip end to spec.taper of
  // that. On Grumpos, whose taper is 0.58, the two disagree by most of a
  // thigh: his leg rooted below the bottom of his own seat and hung there
  // attached to nothing, which is the same 0.58 the standing rig spends on
  // making him broad. Quote the tapered end and the root is back inside the
  // body on every build.
  const rootD = (torsoW / 2) * (spec.taper || 1) - legW * 0.55;
  // `pose.slideKick` (0..1) drives the near leg from its tucked slide into a
  // KICK: the foot leaves along the deck, rises off it, and the knee
  // straightens as the upper bone lengthens toward the reach. Player owns the
  // timer, so both a crate contact and the universal mid-air landing use the
  // same leg arc.
  //
  // Three terms, because a kick is not just a longer leg. The foot travels
  // (0.22u), it lifts (the sole comes up off the deck as the shin swings
  // through), and the bone ratio opens so the knee reads as locking rather
  // than the thigh simply stretching. Drop any one and it reads as the leg
  // being pulled on a string.
  const kick = Math.max(0, Math.min(1, Number(pose.slideKick) || 0));
  const kickX = footNearX + 0.22 * u * kick;
  const kickY = -0.05 * u - 0.085 * u * kick;
  const slideRootX = hipX - 0.263 * rootD, slideRootY = hipY + 0.965 * rootD;
  // `slideNearLegLen` scales the near leg's bones, per spec. Shortened, the
  // foot target comes in with it (see slideNearOut below) or the leg simply
  // straightens to reach the same spot and reads longer, not shorter.
  const slideSeg = (0.24 + 0.07 * kick) * u * (spec.slideNearLegLen || 1);
  limb2(ctx, slideRootX, slideRootY, kickX, kickY, slideSeg, 1, legW, p.p, ow, legW * 0.94);
  if (spec.holster === 'thigh') {
    // Her thigh rig, on the leg that is on top. The knee comes from the same
    // solver limb2 just used, so the holster cannot drift off the bone the
    // slide actually drew — quoting the IK rather than guessing a point along
    // the root-to-foot line, which on a folded knee is not on the thigh at all.
    const [kx, ky] = joint(slideRootX, slideRootY, kickX, kickY, slideSeg, 1, slideSeg);
    // `slideHolsterT` is dialled because 0.55 folds the rig up ONTO the belt in
    // this pose: the thigh comes up to meet the waist, so a holster halfway
    // along it lands across the band and leaves the buckle stranded near one
    // end of the only part of the belt you can still see. The buckle itself is
    // on her centre line and always was.
    //
    // 0.76, not the standing 0.74 and not the old 0.55: far enough down the
    // folded thigh to clear the band with belt showing either side of the
    // buckle, and short of 0.86, where it climbs onto the kneecap and reads as
    // a knee pad — which is the failure the 0.55 was reaching for in the first
    // place, overcorrected.
    thighHolsterAt(ctx, p, u, ow, lod, slideRootX, slideRootY, kx, ky, legW, 0, false,
      spec.slideHolsterT ?? 0.76);
  }
  outlined(ctx, footFill, hair(0.6, ow * 0.8), (c) =>
    c.ellipse(kickX + (0.03 - 0.012 * bc) * u, kickY - 0.01 * u, (0.085 + 0.012 * bc) * u, (0.055 + 0.01 * bc) * u, -0.1 - 0.5 * kick, 0, Math.PI * 2));
  // THE TOOL BELT AND POUCH, in the slide. This pose is its own painter and
  // returns before drawHumanoid's kit passes ever run — the same structural gap
  // that left it tailless, then stickless — so everything worn has to be drawn
  // again here.
  //
  // Everything about the placement comes from `torso`, the capsule this pose
  // already drew, rather than from numbers dialled against one frame of one
  // build. `beltX` is where this rig already puts a waistband, which is up the
  // belly and clear of the folded thighs by construction; clipping to `capsule`
  // makes the silhouette decide the length, the way the standing band clips to
  // torsoPath, so `half` only has to be generous rather than right.
  if (spec.bundle === 'belt' || spec.bundle === 'tilt' || spec.bundle === 'dispenser') {
    // How much of the recline the CANISTER takes. The belt is worn round him
    // and takes all of it — that is what makes it a belt — but the canes read
    // as sticks standing in a tube, and a tube rotated with a body lying at 44
    // degrees points them backwards over his shoulder. 0 hangs them exactly as
    // they hang standing, 1 welds them to the body.
    const recline = spec.slideKitRecline ?? 0.25;
    const frameTurn = torso.angle + Math.PI / 2;
    const kit = {
      half: torsoW * 0.42,
      bx: 0, by: 0, beltCx: 0,
      lean: spec.bundle === 'dispenser' ? 0.4 : spec.bundle === 'tilt' ? 0.2 : 0,
      belt: true,
      canes: { ...(spec.canes || {}), parity: pose.stickParity | 0 },
      thrown: !!pose.axeThrown,
    };
    ctx.save();
    ctx.translate(torso.hipX, torso.hipY);
    ctx.rotate(torso.angle);
    ctx.beginPath(); torso.capsule(ctx); ctx.clip();
    // Up the axis to the waistband, then a quarter turn so the band painter's
    // local +x runs ACROSS the body. paintBambooBundle draws a near-level band
    // about x = 0 — right for a standing figure, and right here too once the
    // frame it is handed is the body's rather than the screen's.
    ctx.translate(torso.beltX, 0);
    ctx.rotate(Math.PI / 2);
    paintBambooBundle(ctx, spec, p, u, ow, lod, { ...kit, parts: 'belt' });
    ctx.restore();
    // THE CANISTER hangs off that same band, so it is placed from it too — on
    // the waistband, a little to the near side. Drawn outside the clip: the
    // pouch is worn ON him and overhangs his edge, which is the whole reason it
    // reads as a pouch rather than as a panel painted on his belly.
    ctx.save();
    ctx.translate(torso.hipX, torso.hipY);
    ctx.rotate(torso.angle);
    // ALONG THE BAND, toward his far side. On the belt line alone the canister
    // sat over the near hip where the thigh folds up to meet it; a nudge across
    // puts it on open belly, which is where it is reachable and where it reads.
    ctx.translate(torso.beltX, -(spec.slideKitShift ?? 0.09) * u);
    ctx.rotate(Math.PI / 2);
    // Take back all but `recline` of the body's turn, so the canes hang the way
    // they hang standing instead of pointing back over his shoulder.
    ctx.rotate(-frameTurn * (1 - recline));
    paintBambooBundle(ctx, spec, p, u, ow, lod, { ...kit, parts: 'pouch' });
    ctx.restore();
  }

  // Garments that hang over the thighs come WITH the hero — drawn after the
  // legs, exactly the layering the standing rig uses for all of them.
  // `pose.hideSkirt` strips every hanging garment off the slide — the same
  // anatomy-view flag Grumpos's standing skirt already honours — so the legs
  // can be judged with nothing over them.
  if ((spec.tunic || spec.dress || id === 'grumpos') && !pose.hideSkirt) {
    const ax = shX - hipX, ay = shY - hipY;
    const aL = Math.hypot(ax, ay) || 1;
    ctx.save();
    ctx.translate(hipX, hipY);
    ctx.rotate(Math.atan2(ay, ax));
    const beltX = aL * 0.24;
    // Past the seat, over the thigh roots — scaled back on the heavy rig,
    // where the same margins over a 0.37u capsule came out as one
    // knee-to-chest board of leather.
    // Garment LENGTH is not the chest's business. It used to be measured off
    // torsoW, so widening the chest to the standing build lengthened every
    // skirt with it — Grumpos's pteruges grew far enough down the recline to
    // blanket his own legs. This is the width the hem was tuned against,
    // before the chest went its own way.
    // How far the garment hangs PAST THE BELT, per garment, matched to the
    // drop each one has standing. It used to be measured off torsoW, which is
    // the chest — so widening the chest to the standing build lengthened every
    // skirt with it, and Grumpos's pteruges grew far enough down the recline
    // to blanket his own legs. A hem is not the chest's business, and these
    // are the standing silhouettes: Fernwick's tunic is upper-thigh short.
    // The two SEGMENTED garments run longer than their standing drop on
    // purpose — the straps are the thing you look at on those two, and short
    // ones read as a frill. They stop where the legs start to matter.
    // The princess gown is a SEGMENTED garment here too. Sliding, the shipped
    // code fell through to the tunic branch and painted the male Fernwick's
    // one flared panel with its brown belt — the wrong garment entirely on a
    // hero wearing a gored dress.
    const gown = spec.princessCostume && PRINCESS_COSTUMES[spec.princessCostume];
    const gownPanels = gown && gown.skirt && gown.skirt.panels;
    // The gown's drop matches its STANDING drop: belt to hem standing is
    // 0.06u above the hip to `skirtLen` leg-lengths below it, and 0.24u here
    // was a good deal more than that — the slide wore a longer skirt than the
    // run, and it showed the moment the two were side by side.
    const gownDrop = gownPanels
      ? 0.06 + 0.3 * ((spec.skirtLen ?? gown.skirt.len) || 0.36) * (spec.legLength || 1)
      : 0;
    // Grumpos's straps run LONGER here than the old 0.27u. Standing, his
    // pteruges were cut to his own knee — his skirt comment records the hem at
    // -0.1800u against a knee whose lowest point is -0.1800u — and at 0.27u
    // sliding they stopped short of it and left the joint bare, which is the
    // one thing that hem was measured to cover.
    const hemX = beltX - (gownPanels ? gownDrop : spec.tunic ? 0.16 : spec.dress ? 0.26 : 0.33) * u;
    // Waist bands and panel roots measure the body AT THE WAIST, which on a
    // tapered build is far inside the shoulder width — a belt sized off the
    // full torso overhung Grumpos's narrow middle on both sides.
    const taper = spec.taper || 1;
    const waistHalf = torsoW * 0.5 * (taper + (1 - taper) * 0.24);
    // The gown flares MORE sliding than standing. Matched to its standing
    // flare it came out as a tube lying along her thighs, which is not what a
    // skirt does when its wearer is on her hip: the cloth falls toward the
    // deck and spreads. `slideFlare` is the gown's own number for it.
    // A SPLIT QIPAO is cut wider than this frame's defaults. The slide sizes
    // every garment off its own reclined waist, which is narrower than the
    // standing one, and then flares it 1.33 where the standing skirt flares
    // 1.44 side-on and 1.72 front-on — so Kiko's skirt came out around 60% of
    // its standing width, with the sash short and pulled inboard to match. It
    // read as the whole garment having scrunched down and sideways. Both
    // numbers now come back toward the standing cut.
    const dressWide = spec.dress ? 1.16 : 1;
    const wTop = waistHalf * 1.05 * dressWide;
    const wHem = wTop * (heavy ? 1.25 : gownPanels ? (gown.skirt.slideFlare ?? 1.7) : spec.dress ? 1.5 : 1.33);
    // The gown is NOT segmented here. Standing and running its panels are
    // separate quads that swing on their own clocks, and sliding that came out
    // as a fan of straps falling open with her leg showing between them — a
    // skirt is not a skirt once you can see through it. Laid out on her hip it
    // is one piece of cloth with pleats scored into it: the same garment, read
    // the way a pleated skirt reads when it is not moving.
    const segs = id === 'grumpos' ? 4 : (spec.dress === 'split' ? 3 : 0);
    if (segs) {
      // Hanging PANELS, never one board: Grumpos's pteruges and Kiko's split
      // qipao are segmented garments when they walk, so they stay segmented
      // sliding — each panel its own quad, pinned at the waist, free at the
      // hem, with the gaps between them doing the talking.
      const fill = id === 'grumpos' ? p.w : gownPanels ? (p.skirt || p.b) : p.b;
      // Each strap ends where the DECK is, not where the others end. Every
      // panel used to stop at the same local hemX, and a constant x in a frame
      // raked over at the recline angle is a straight diagonal cut across all
      // four — the boxy edge, hanging through the ground on the low side
      // because nothing in the frame knew where the ground was.
      //
      // Now the ground comes back into the frame: world y = 0 (less the jig
      // this figure is riding) solved for the local LATERAL offset a strap's
      // tip may reach at its own length. A tip below that is swung up to it,
      // and the straps stack along the deck instead of through it.
      // The deck, back in this raked frame. A strap is pinned at the waist and
      // free at the tip, so when the tip would go through the floor the strap
      // SWINGS on its pin — it does not get sawn off. Cutting the length was
      // the first fix and it left the ground-side strap (leftmost on screen,
      // lying lowest) a stub beside three long ones; swinging keeps every
      // strap its full length and lays the low ones along the deck, which is
      // what leather does when the man wearing it is sliding on his hip.
      //
      // The swing angle is solved, not searched: with the tip at (tx, ty) off
      // its pin, world y is A·cosφ + B·sinφ + py, so the φ that puts the tip
      // exactly on the deck falls out of one atan2 and one acos. No solution
      // means the pin itself is at or under the deck — nothing to swing to —
      // and the strap is left where it is.
      const cosT = ax / aL, sinT = ay / aL;
      const deck = -0.02 * u - jig;
      const swingToDeck = (px, py, tx, ty) => {
        const wy = (py + tx * sinT + ty * cosT);
        if (wy <= deck) return 0;
        const A = tx * sinT + ty * cosT;
        const B = tx * cosT - ty * sinT;
        const C = deck - py;
        const r = Math.hypot(A, B);
        if (r < 1e-6 || Math.abs(C) > r) return 0;
        const base = Math.atan2(B, A), off = Math.acos(C / r);
        const c1 = base + off, c2 = base - off;
        const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
        const n1 = norm(c1), n2 = norm(c2);
        return Math.abs(n1) < Math.abs(n2) ? n1 : n2;
      };
      for (let i = 0; i < segs; i++) {
        const f = -1 + (2 * i + 1) / segs;
        const halfT = (wTop / segs) * 0.96, halfH = (wHem / segs) * 1.02;
        // Each panel is pinned at the waist and FREE at the hem, and each hem
        // rides its own clock: the ground-side panels inherit the near leg's
        // sway, the far side the rear leg's — the way the standing pteruges
        // inherit the leg beneath them — plus a flutter of their own, so the
        // stack never moves as one board.
        const legSway = f > 0 ? swayA : swayB;
        const flap = (Math.sin(t * 4.6 + i * 1.9) * 0.55 + legSway * 0.45) * 0.022 * u;
        const hx = hemX - Math.abs(flap) * 0.4;
        const yA = f * wHem - halfH + flap, yB = f * wHem + halfH + flap;
        // A leather strap has a rounded tongue, not a mitre. Cheap to add now
        // the hem is per-strap, and it is what stops four quads reading as one
        // sawn board.
        const pinY = f * wTop;
        // Swing, but only a little. A strap free to rotate all the way to the
        // deck lifts so far it lies on top of its neighbours and the fan
        // collapses into one bundle; capped, the low straps rake along the
        // ground and the fan survives. Whatever the cap does not fix, the
        // length clamp below finishes.
        // Capped tighter than it was. The swing exists so a panel whose tip
        // would go through the deck rakes ALONG it instead, but at 0.2 rad the
        // ground-side panel visibly rose off the leg it is supposed to be
        // hanging over — the bottom of the fan lifting rather than lying down,
        // on Kiko and on Grumpos both. 0.11 still lays the low panels on the
        // deck; the length clamp below takes whatever the smaller angle leaves.
        const SWING_CAP = 0.11;
        const swing = Math.max(-SWING_CAP, Math.min(SWING_CAP,
          swingToDeck(beltX, hipY + beltX * sinT + pinY * cosT,
            hx - beltX, Math.max(yA, yB) - pinY)));
        // Length clamp, measured on the SWUNG strap: rotate the tip by the
        // swing and ask the deck where it may reach.
        const cs = Math.cos(swing), sn = Math.sin(swing);
        const reach = (lx, ly) => {
          const rx = beltX + (lx - beltX) * cs - (ly - pinY) * sn;
          const ry = pinY + (lx - beltX) * sn + (ly - pinY) * cs;
          return hipY + rx * sinT + ry * cosT;
        };
        // The clamp lets a panel LIE ON the deck rather than stopping dead at
        // it. Trimmed to the deck line exactly, the ground-side panels came
        // out visibly shorter than their neighbours and left the leg under
        // them bare — the fan looked pulled up on that side. Cloth on the
        // floor overlaps the floor, so the tip may pass the deck by `LIE`
        // before anything is cut, and the panels keep their length.
        const LIE = 0.055 * u;
        let cut = 0;
        for (const ly of [yA, yB]) {
          while (reach(hx + cut, ly) > deck + LIE && cut < beltX - hx) cut += 0.004 * u;
        }
        const hxc = hx + cut;
        const tip = Math.min(halfH * 0.45, (beltX - hxc) * 0.45);
        ctx.save();
        ctx.translate(beltX, pinY);
        ctx.rotate(swing);
        ctx.translate(-beltX, -pinY);
        outlined(ctx, fill, hair(0.6, ow * 0.8), (c) => {
          c.moveTo(beltX, pinY - halfT);
          c.lineTo(beltX, pinY + halfT);
          c.lineTo(hxc + tip, yB);
          c.quadraticCurveTo(hxc, yB, hxc, (yA + yB) / 2);
          c.quadraticCurveTo(hxc, yA, hxc + tip, yA);
          c.closePath();
        });
        if (!lod && (spec.dress || gownPanels)) {
          // the qipao's gold piping, on every panel hem, riding its flap —
          // traced along the SAME rounded tongue the panel is cut to, or it
          // hangs off the corners as a pair of gold whiskers past the cloth
          ctx.strokeStyle = p.a;
          ctx.lineWidth = hair(0.5, 0.02 * u);
          ctx.beginPath();
          ctx.moveTo(hxc + tip, yA);
          ctx.quadraticCurveTo(hxc, yA, hxc, (yA + yB) / 2);
          ctx.quadraticCurveTo(hxc, yB, hxc + tip, yB);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (gownPanels) {
      // THE STANDING SKIRT, LAID DOWN. The first slide cut was one wedge with
      // faint lines scored on it, and it read as a different garment from the
      // one she runs in — the standing skirt is five separately OUTLINED
      // panels, each with its own rounded hem and its own wash, and that is
      // what the eye remembers. So it is built the same way here: a solid base
      // first, then the same panels over it, pinned at the waist and not
      // swinging. Pleated, not fanned: nothing opens, no leg shows.
      const skirtFill = p.skirt || p.b;
      outlined(ctx, skirtFill, ow, (c) => {
        c.moveTo(beltX, -wTop);
        c.lineTo(beltX, wTop);
        c.lineTo(hemX + 0.03 * u, wHem * 0.94);
        c.quadraticCurveTo(hemX, 0, hemX + 0.03 * u, -wHem * 0.94);
        c.closePath();
      });
      const W = [-0.11, 0.08, -0.05, 0.11, -0.08, 0.05, -0.1, 0.07];
      const o = 0.04;
      // Outer panels first so the middle ones lap them, the same order the
      // standing loose skirt paints in.
      const order = [];
      for (let i = 0; i < gownPanels; i++) order.push(i);
      order.sort((a, b) => Math.abs(b - (gownPanels - 1) / 2) - Math.abs(a - (gownPanels - 1) / 2));
      for (const i of order) {
        const f0 = -1 + (2 * i) / gownPanels, f1 = -1 + (2 * (i + 1)) / gownPanels;
        const fc = (f0 + f1) / 2;
        // A LITTLE MOVEMENT, at the hem only. Each panel's free end drifts out
        // from the body on its own phase — cloth settling on a figure that is
        // travelling, not the fan that let her leg show. Two things keep it
        // safe: the drift is lateral (it opens the skirt's outer edge, it does
        // not lift the hem off the legs), and the panel's waist end is pinned,
        // so no gap can open between neighbours where they overlap.
        const ph = t * 3.2 + i * 1.15;
        // A slide is never airborne and never a celebration hop, so the hem's
        // air share is zero here. (The standing gown's copy of this term reads
        // `jump` and `cm`, which drawHumanoid defines and this painter does
        // not — copied verbatim it threw ReferenceError on every gown slide.)
        const airG = 0;
        const drift = Math.sin(ph) * 0.02 * u * (0.5 + Math.abs(fc))
          - airG * 0.05 * u * (0.45 + Math.abs(fc));
        const lift = Math.cos(ph * 0.9) * 0.008 * u - airG * 0.035 * u * (0.4 + Math.abs(fc));
        const panel = (c) => {
          c.moveTo(beltX, (f0 - o) * wTop);
          c.lineTo(beltX, (f1 + o) * wTop);
          c.lineTo(hemX + lift, (f1 + o) * wHem + drift);
          // The rounded hem the standing panel has, in this frame: the bulge is
          // along -x (down the figure), so the panel ends in a tongue rather
          // than a straight cut.
          c.quadraticCurveTo(hemX - 0.032 * u + lift, fc * wHem + drift,
            hemX + lift, (f0 - o) * wHem + drift);
          c.closePath();
        };
        // Fine seams here too, so the slide is drawn in the same weights as the
        // run — the base below carries the silhouette.
        outlined(ctx, skirtFill, gown.skirt.fineSeams ? ow * 0.4 : ow, panel);
        if (!lod) {
          const a = W[i % W.length];
          ctx.save();
          ctx.beginPath(); panel(ctx); ctx.clip();
          ctx.fillStyle = a < 0 ? `rgba(0,0,0,${(-a).toFixed(3)})` : `rgba(255,255,255,${a.toFixed(3)})`;
          ctx.fillRect(hemX - 0.1 * u, -wHem * 2, beltX - hemX + 0.2 * u, wHem * 4);
          ctx.restore();
        }
      }
    } else if (spec.tunic && !gownPanels) {
      // the tunic: one flared panel, the way it hangs standing
      outlined(ctx, p.b, ow, (c) => {
        c.moveTo(beltX, -wTop);
        c.lineTo(beltX, wTop);
        c.lineTo(hemX, wHem);
        c.quadraticCurveTo(hemX - 0.045 * u, 0, hemX, -wHem);
        c.closePath();
      });
      if (!lod) {
        // The centre seam the standing tunic has, and for the same reason:
        // one flat green panel is a bib, and the seam is what makes it cloth
        // hanging in two folds. Same faint ink and the same inset off both
        // ends as the standing draw.
        ctx.save();
        ctx.globalAlpha *= 0.45;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = hair(0.5, ow * 0.4);
        ctx.beginPath();
        ctx.moveTo(beltX - 0.03 * u, 0);
        ctx.lineTo(hemX + 0.01 * u, 0);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Waist bands end ON the waist: BUTT caps, because the round default
    // bulged half a stroke past each edge and every belt hung out past the
    // body.
    if (spec.dress) {
      // the sash in its own colour, with the off-centre knot and tail the
      // standing qipao ties
      // Run past both sides and CLIPPED to the body, like every other band on
      // this pose. Cut to 0.94 of the garment's own waist it overhung her
      // silhouette on the side — the sash is sized to the SKIRT, which is
      // wider than the torso it is tied round, so any fraction of it is the
      // wrong yardstick. The contour is the only thing that knows where she
      // ends.
      ctx.save();
      ctx.beginPath(); torso.capsule(ctx); ctx.clip();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = p.sash || p.p;
      ctx.lineWidth = 0.06 * u;
      ctx.beginPath(); ctx.moveTo(beltX, -wTop * 1.3); ctx.lineTo(beltX, wTop * 1.3); ctx.stroke();
      ctx.restore();
      ctx.lineCap = 'round';
      ctx.strokeStyle = p.sash || p.p;
      ctx.lineWidth = 0.03 * u;
      // The knot ties on the side she ties it on STANDING. Local +y here runs
      // across the body toward her far side once the frame is raked, so a knot
      // at +0.4 came out on the opposite hip from the standing qipao's — the
      // same tie, mirrored, on the one pose that rotates the frame.
      //
      // NO TAIL. The standing tie has a short one falling from the knot, which
      // works because it hangs DOWN the skirt. Rotated into the recline the
      // same stroke points off across her hip into open air, with nothing under
      // it to fall against — a stray blue stub hanging off the belt rather than
      // a length of sash. The knot alone carries the tie here.
      outlined(ctx, p.sash || p.p, hair(0.4, ow * 0.5), (c) => c.arc(beltX, -wTop * 0.4, 0.032 * u, 0, Math.PI * 2));
    }
    if (id === 'grumpos') {
      // his belt is the GOLD band with the pale disc buckle, same as standing
      // — dark leather on dark leather was an invisible belt
      ctx.lineCap = 'butt';
      ctx.strokeStyle = p.g;
      ctx.lineWidth = 0.065 * u;
      ctx.beginPath(); ctx.moveTo(beltX, -wTop * 0.98); ctx.lineTo(beltX, wTop * 0.98); ctx.stroke();
      ctx.lineCap = 'round';
      dot(ctx, beltX, 0, 0.034 * u, p.w);
    }
    if (gownPanels) {
      // The gown's gold belt, the band the standing cut wears, in the raked
      // frame — not the tunic's brown leather.
      ctx.lineCap = 'butt';
      const bh = gown.beltH ?? 0.055;
      ctx.strokeStyle = p.a;
      ctx.lineWidth = bh * u;
      ctx.beginPath(); ctx.moveTo(beltX, -wTop * 0.96); ctx.lineTo(beltX, wTop * 0.96); ctx.stroke();
      ctx.lineCap = 'round';
      outlined(ctx, p.gem || p.h, hair(0.5, ow * 0.5), (c) => c.arc(beltX, 0, Math.min(0.026, bh * 0.44) * u, 0, Math.PI * 2));
    } else if (spec.tunic) {
      // the tunic's own belt riding the skirt's top seam, gold buckle on it
      ctx.lineCap = 'butt';
      ctx.strokeStyle = p.p;
      ctx.lineWidth = 0.055 * u;
      ctx.beginPath(); ctx.moveTo(beltX, -wTop * 0.96); ctx.lineTo(beltX, wTop * 0.96); ctx.stroke();
      ctx.lineCap = 'round';
      outlined(ctx, p.a, hair(0.5, ow * 0.5), (c) => c.arc(beltX, 0, 0.028 * u, 0, Math.PI * 2));
    }
    ctx.restore();
  }
  // The quiver sling goes on LAST of the worn things, over the garment and its
  // belt — a strap is what holds the quiver on, so nothing is worn on top of
  // it. Painted inside the capsule (where it used to be) the skirt and belt
  // below went on after it and buried it: on Fernwick the strap crossed her
  // chest and then her own tunic covered it, so the quiver on her back had
  // visibly nothing holding it there.
  torso.sling?.();
  // near arm: hangs down off the shoulder, hand trailing just clear of the
  // ground, elbow soft and back.
  //
  // A SLEEVED near shoulder sits up and left of the shared socket — 0.08u out
  // and 0.06u up, plus 0.05u down the limb — which is where the puff has to
  // be to read as a shoulder rather than a ball under her chin, on a figure
  // leaning back this far. The ARM roots there too, not at the shared socket:
  // seated apart, the limb's own round root cap stood proud of the sleeve and
  // the top of her arm poked through it. Rooted together, the arm starts
  // inside the puff and the puff is the only thing you see of the joint.
  let nearX = armX, nearY = armY;
  if (spec.puffs) {
    const na = Math.atan2(trailY - armY, trailX - armX);
    nearX = armX + Math.cos(na) * 0.05 * u - 0.08 * u;
    nearY = armY + Math.sin(na) * 0.05 * u - 0.06 * u;
  }
  const nearSeg = 0.19 * u * upperBias;
  // HOW STRAIGHT THIS ARM IS, is a decision — it used to be a side effect. The
  // hand target is a fixed point in the figure's frame and the shoulder socket
  // is not, so every build that moved its socket got a different elbow out of
  // the same two numbers: measured at rest, the plain and slim rigs reached 92%
  // of the arm, Grumpos 99% (his `stretch` carries the socket back up the
  // recline) and Kiko 66% (the dropped puff socket plus her 0.74 armReach).
  // Only Grumpos read right, and by accident — an arm folded to two thirds
  // reads as a hero riding his own hip, and the near arm is the one thing in
  // this pose that says he is on the ground under control.
  //
  // So the hand is SOLVED for an extension instead of accepting one. 0.96 of
  // the whole two-bone arm, cast-wide (bake-off, 2026-09-08, A2 of five): a
  // hair straighter than any rig shipped, with enough bend left that the elbow
  // still takes the pose's sway instead of locking. armReach is deliberately
  // out of it now — it shortens Kiko's LIMB, which is its job, and pulling the
  // target in was only ever a proxy for that.
  const NEAR_EXT = 0.96;
  const want = 2 * nearSeg * NEAR_EXT;
  // The height is the cast's SHARED one and only the x is solved: the hand
  // riding just off the deck is the whole point of a trailing arm, so the extra
  // reach is spent going further back rather than swinging the arm down through
  // the floor. Kiko is why this is not her own hand height — armReach pulls her
  // target up as well as back, and preserving that straightened her into a
  // hover.
  const ty2 = trailY;
  const dy = ty2 - nearY;
  const dx2 = want * want - dy * dy;
  // Out of reach at that height — a short arm on a socket sat high. Fall back
  // to the most extension there is: straight down the line to the hand.
  const nearDir = Math.hypot(trailX - nearX, dy) || 1e-6;
  const tx2 = dx2 > 0 ? nearX - Math.sqrt(dx2) : nearX + (trailX - nearX) / nearDir * want;
  limb2(ctx, nearX, nearY, tx2, ty2, nearSeg, -1, armW, armFill, ow, armW * 0.93, true);
  // The sleeve goes on over it — under the hand, and UNDER the head that
  // follows, so the jaw crops whatever of it still laps behind her. It was
  // drawn dead last, after the head, which is how a sleeve ends up painted
  // across a face.
  slidePuff(tx2, ty2, 0.05 * u, -0.08 * u, -0.06 * u);
  // The carried stick. The slide is its own painter and never reaches
  // drawHumanoid's arm props, which is the same gap that left this pose
  // tailless. Angled along the recline so it lies with the trailing arm, and
  // drawn BEFORE slideHand so the glove closes over it exactly as it does
  // standing.
  if (spec.stick) drawHeldStick(ctx, tx2, ty2, -0.35, u, ow);
  slideHand(ctx, id, spec, p, u, ow, armW, tx2, ty2, lod, nearX, nearY, nearSeg, -1);
  // head up and back, riding the shoulder wherever the build put it. Drawn at
  // ABSOLUTE figure coordinates, untilted: the light field's gradients
  // resolve against the transform in force when they are painted, so a head
  // drawn inside a translated frame was shaded as if it sat at the FEET —
  // the shadow end of the ramp, and the dark face every slider wore.
  // The head rides the shoulder wherever the build put it, 0.10u further
  // along the recline than it used to (it was -0.02u): forward over the chest
  // rather than back over the shoulder, which is where a slider's head goes
  // and which uncovers the shoulder region behind it — far enough that Kiko's
  // sleeve, seated on the socket below, clears her chin.
  //
  // The HEAVY rig lifts a little further off the shoulder — his skull is the
  // biggest on the roster, and at the shared 0.12u the beard sank into his
  // own chest. 0.15u, WITH the stretch relaxed to 1.18 above, clears the sash
  // while landing his crown at 0.89u — the shipped slide's own height, a head
  // over the cast the way his standing sprite is. The first cut fixed the
  // beard with lift alone (0.24u) and sent him sliding at 1.01u, taller than
  // half the cast stands.
  //
  // Moving it the other way was tried and is much worse — a neck up the spine
  // lifts every crown, and laying it back parks the head on the near shoulder.
  // `slideHeadBack` pulls the head back along the axis, in u — a per-spec dial
  // for a head that reads as thrust forward off the reclined body.
  const hxx = shX + SLIDE_HEAD_SEAT * u - (spec.slideHeadBack || 0) * u, hyy = shY - (heavy ? 0.15 : 0.12) * u;
  // Canted back into the slide. Rotated about the head's OWN centre, so it
  // costs no height and no reach — the crown lays back the way a slider's
  // does instead of sitting bolt upright on a reclined body. About the
  // centre also keeps the light field honest: the ramps resolve against the
  // transform at paint time, and a rotation around the thing being lit turns
  // the key with the face rather than sliding the face down the ramp.
  // The whole skull tips BACK, and the eyes do not go with it. Rotating the
  // head alone points the face at the sky, which is not what a slider does —
  // he lies back and keeps watching the track. So the rotation is paired with
  // a counter-gaze: the pupils ride forward and down inside the eye by the
  // same angle the skull gave up, and the hero stays looking where he is
  // going however far the head is laid back.
  //
  // -0.10 and -0.04 per radian are measured, not derived: they are what put
  // Lorenzo's pupils back on the level at the 0.34 rad end of the sweep. The
  // gaze dial is in u, so they hold at every draw size.
  //
  // 0.28 rad, picked in the bake-off (2026-08) over 0.18, 0.38 and 0.50 and a
  // no-cant control. The counter-gaze above is what makes this angle spendable
  // at all: laid this far back without it he is looking at the ceiling.
  //
  // The head reacts to the kick — EYES AND CHIN, picked in the bake-off
  // (2026-08) over eyes alone, chin alone, and both plus a contact expression.
  // The expression lost on cost: it rides browRaise/faceSurprised, and those
  // open Gnash's smirk into a surprise mouth and re-shape B-33P's visor, which
  // is the same tax the note above records pose.roll charging.
  //
  // Both ride the leg's own `kick` 0..1, so nothing here has a clock of its
  // own and the face cannot drift out of step with the swing. The chin comes
  // down 0.09 rad off the cant as he commits; the eyes go onto the crate below.
  const headTilt = -0.28 + 0.09 * kick;
  headPose.gazeAmt = 1;
  // The counter-gaze, plus the kick's own glance ON TOP of it: the pupils go
  // forward and further down, onto the box the foot is about to reach. It adds
  // rather than replaces, or the eyes would snap back to the tilt's neutral
  // mid-swing and read as a flinch away from the thing he is kicking.
  //
  // -0.07 per radian, not the -0.10 the tilt shipped with. That figure put the
  // resting pupil 0.001u PAST the lower rim of its own eye — drawEyes clamps
  // that now, but a look pinned against the clamp is a look that cannot move,
  // and the kick's whole job here is to move it. -0.07 still reads level (it
  // was swept against the un-countered eye) and leaves the headroom the flick
  // is spent from. The adds are sized to that headroom at the braced angle.
  headPose.gazeX = headTilt * -0.07 + 0.009 * kick;
  headPose.gazeY = headTilt * -0.07 + 0.012 * kick;
  ctx.save();
  ctx.translate(hxx, hyy);
  ctx.rotate(headTilt);
  ctx.translate(-hxx, -hyy);
  // The heavy skull draws at 0.88 of the figure's u. Everything else in this
  // pose is inside his 1.08 figure scale, which is right for a body and wrong
  // for a head that is already the roster's biggest at 0.22u — and it got
  // worse when the stretch came back to 1.18 and shortened the torso under
  // it. 0.88 cancels that scale and a little more, landing him just above
  // Lorenzo's head-to-body ratio, which is where the big hero belongs.
  drawHead(ctx, id, spec, p, u * (heavy ? 0.88 : 1), ow, hxx, hyy, lod, headPose);
  ctx.restore();
  ctx.restore();
  // dust ground off the SEAT — that is what touches the deck now
  if (pose.grounded) slideDust(ctx, u, ow, t, -0.24 * u, -0.02 * u);
}

// D — BELLY DIVE: prone, arms ahead, chin up — the lowest silhouette of the
// three, with a light flutter kick so the held pose stays alive.
function drawSlideDive(ctx, id, spec, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const flut = Math.sin(t * 9) * 0.025 * u;
  const chestX = 0.16 * u, chestY = -0.17 * u;
  const hipX = -0.14 * u, hipY = -0.15 * u;
  // far arm and far leg first, behind the body
  limb2(ctx, chestX + 0.03 * u, chestY - 0.03 * u, 0.52 * u, -0.09 * u, 0.22 * u, -1, 0.065 * u, recede(p.b, 0.3), ow, 0.06 * u, true);
  outlined(ctx, recede(p.s, 0.3), hair(0.5, ow * 0.7), (c) => c.arc(0.52 * u, -0.09 * u, 0.04 * u, 0, Math.PI * 2));
  limb2(ctx, hipX, hipY, -0.44 * u, -0.10 * u - flut * 0.8, 0.24 * u, -1, 0.08 * u, recede(p.p, 0.3), ow, 0.075 * u);
  outlined(ctx, recede(p.f, 0.3), hair(0.6, ow * 0.8), (c) =>
    c.ellipse(-0.47 * u, -0.105 * u - flut * 0.8, 0.075 * u, 0.05 * u, 0.25, 0, Math.PI * 2));
  // torso: near-horizontal capsule chest -> hips, dressed like the standing rig
  const diveTorso = slideTorsoCapsule(ctx, id, spec, p, t, u, ow, hipX, hipY, chestX, chestY, 0.28 * u, false, 0,
    axisOffset(hipX, hipY, chestX, chestY, 0.33 * u, -0.29 * u) * V_FOLLOWS_FACE);
  // Straight after the capsule, which is where it painted before the sling was
  // handed back — the dive wears nothing over the chest, so nothing buries it.
  diveTorso.sling?.();
  // near leg trailing, knee soft, boot toe pointed back
  limb2(ctx, hipX, hipY - 0.01 * u, -0.50 * u, -0.07 * u + flut, 0.24 * u, -1, 0.09 * u, p.p, ow, 0.085 * u);
  if (spec.holster === 'thigh') {
    const [kx, ky] = joint(hipX, hipY - 0.01 * u, -0.50 * u, -0.07 * u + flut, 0.24 * u, -1, 0.24 * u);
    thighHolsterAt(ctx, p, u, ow, lod, hipX, hipY - 0.01 * u, kx, ky, 0.09 * u, 0, false, 0.55);
  }
  outlined(ctx, p.f, hair(0.6, ow * 0.8), (c) =>
    c.ellipse(-0.53 * u, -0.075 * u + flut, 0.08 * u, 0.05 * u, 0.2, 0, Math.PI * 2));
  // near arm reaching ahead, palm skimming the ground
  limb2(ctx, chestX, chestY, 0.56 * u, -0.055 * u, 0.24 * u, -1, 0.075 * u, p.b, ow, 0.07 * u, true);
  outlined(ctx, p.s, hair(0.5, ow * 0.7), (c) => c.arc(0.56 * u, -0.055 * u, 0.045 * u, 0, Math.PI * 2));
  // head at the front, chin held up off the deck
  ctx.save();
  ctx.translate(0.33 * u, -0.29 * u);
  ctx.rotate(-0.24);
  drawHead(ctx, id, spec, p, u * 0.92, ow, 0, 0, lod, { kind: 'slide', roll: true, time: t });
  ctx.restore();
  // dust off the chest contact
  if (pose.grounded) slideDust(ctx, u, ow, t, -0.30 * u, -0.04 * u);
}

// Two little contact puffs, pulsing on their own clock so a held slide keeps
// visibly grinding. Drawn in ground space, always behind the figure.
function slideDust(ctx, u, ow, t, x, y) {
  const q = (t * 7) % 1;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = hair(0.8, ow * 0.5);
  ctx.globalAlpha *= 0.35 * (1 - q * 0.6);
  ctx.beginPath(); ctx.arc(x - q * 0.10 * u, y - 0.03 * u - q * 0.05 * u, (0.035 + q * 0.03) * u, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - 0.09 * u - q * 0.14 * u, y - 0.015 * u - q * 0.03 * u, (0.024 + q * 0.02) * u, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha /= 0.35 * (1 - q * 0.6);
}

const SLIDE_STYLE_DRAWS = {
  tuck: drawSlideTuckRoll, kick: drawSlideKick, dive: drawSlideDive,
};

// What the gallery bake-off enumerates. Ids are pose.slideStyle values.
export const SLIDE_STYLE_CANDIDATES = [
  { id: 'tuck', name: 'B — TUCK ROLL' },
  { id: 'kick', name: 'C — POWER SLIDE' },
  { id: 'dive', name: 'D — BELLY DIVE' },
];

function drawBlob(ctx, id, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const ph = (pose.phase || 0) * Math.PI * 2;
  const slide = pose.kind === 'slide';
  let rx = 0.36 * u, ry = 0.34 * u, cy = -0.4 * u;
  if (slide && pose.roll) {
    ctx.save();
    ctx.translate(0, -0.27 * u);
    ctx.rotate((t || 0) * 12);
    outlined(ctx, p.b, ow, (c) => c.arc(0, 0, 0.29 * u, 0, Math.PI * 2));
    outlined(ctx, p.a, hair(0.6, ow * 0.8), (c) => c.arc(-0.29 * u, 0, 0.06 * u, 0, Math.PI * 2));
    outlined(ctx, p.a, hair(0.6, ow * 0.8), (c) => c.arc(0.29 * u, 0, 0.06 * u, 0, Math.PI * 2));
    drawEyes(ctx, p, u, 0, -0.05 * u, lod, expressionFor(id, { ...pose, effort: true }));
    outlined(ctx, p.m, hair(0.6, ow * 0.5), (c) => c.ellipse(0, 0.09 * u, 0.05 * u, 0.035 * u, 0, 0, Math.PI * 2));
    ctx.restore();
    return;
  }
  if (slide) { rx = 0.4 * u; ry = 0.22 * u; cy = -0.25 * u; }
  if (pose.kind === 'run') { const b = Math.sin(2 * ph) * 0.03 * u; ry += b; rx -= b * 0.7; }
  // celebrate: a joyful squash-and-stretch jiggle, arms up like the float pose
  if (pose.kind === 'celebrate') { const b = Math.sin(t * 7); ry *= 1 + 0.1 * b; rx *= 1 - 0.08 * b; cy -= 0.03 * u * Math.max(0, b); }
  ctx.save();
  if (pose.float) {
    ctx.rotate(0.08 * Math.sin(t * 5));
    cy -= 0.03 * u * (1 + Math.sin(t * 9)) * 0.5;
  }
  // feet stubs peeking below
  const step = pose.kind === 'run' ? Math.sin(ph) * 0.06 * u : 0;
  outlined(ctx, p.f, hair(0.6, ow * 0.8), (c) => c.ellipse(-0.13 * u + step, -0.035 * u, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  outlined(ctx, p.f, hair(0.6, ow * 0.8), (c) => c.ellipse(0.13 * u - step, -0.035 * u, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  // body
  outlined(ctx, p.b, ow, (c) => c.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2));
  // arm nubs (rotate up while floating)
  const nubY = pose.float || pose.kind === 'celebrate' ? cy - ry * 0.55 : cy + ry * 0.15;
  outlined(ctx, p.a, hair(0.6, ow * 0.8), (c) => c.arc(-rx - 0.01 * u, nubY, 0.07 * u, 0, Math.PI * 2));
  outlined(ctx, p.a, hair(0.6, ow * 0.8), (c) => c.arc(rx + 0.01 * u, nubY, 0.07 * u, 0, Math.PI * 2));
  // face lives on the body
  const ex = expressionFor(id, pose);
  drawEyes(ctx, p, u, 0.01 * u, cy - ry * 0.15, lod, ex);
  if (ex.joy) {
    // Mochi grins with her whole face; the grin widens on every peak — and on
    // the pole ride it opens with the descent, same joyAmt as the humanoids.
    const amt = ex.cheer ? (ex.joyAmt == null ? 1 : ex.joyAmt) : 0;
    const w = (0.06 + 0.025 * amt) * u, d = (0.04 + 0.04 * amt) * u;
    outlined(ctx, p.m, hair(0.6, ow * 0.5), (c) => {
      c.moveTo(0.01 * u - w, cy + ry * 0.28);
      c.quadraticCurveTo(0.01 * u, cy + ry * 0.28 + d * 1.9, 0.01 * u + w, cy + ry * 0.28);
      c.closePath();
    });
  } else if (ex.surprise || pose.float) {
    outlined(ctx, p.m, hair(0.6, ow * 0.5), (c) => c.ellipse(0.01 * u, cy + ry * 0.3, 0.045 * u, 0.055 * u, 0, 0, Math.PI * 2));
  } else if (ex.blink) {
    ctx.strokeStyle = p.m; ctx.lineWidth = hair(0.8, ow * 0.65);
    ctx.beginPath(); ctx.arc(0.01 * u, cy + ry * 0.25, 0.05 * u, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  } else {
    outlined(ctx, p.m, hair(0.6, ow * 0.5), (c) => c.ellipse(0.01 * u, cy + ry * 0.3, 0.05 * u, 0.035 * u, 0, 0, Math.PI * 2));
  }
  ctx.restore();
}

// Poyo's rig: the same round squishy silhouette as the blob, re-skinned as a
// coral electric-mascot — rounded purple-tipped ears, a small purple cowlick, a
// star-tipped tail that trails behind, and pink cheeks that bob + squash on the
// run. Palette pulls body/belly/ear/cheek/star from HERO_SPRITES.mochi.pal.
function pikaEyes(ctx, p, u, cx, cy, lod, ex) {
  const sep = 0.11 * u;
  if (ex.death) {
    // Mochi's eye is a solid dark oval with a glint in it, not a white with a
    // pupil, so the shut squeezes the WHOLE eye down onto the lid line and the
    // glint goes out with it. Her marks run a size up on everyone else's: her
    // eyes are the biggest on the cast and her sep the widest, and a standard
    // X between them read as two specks on a very large face.
    const d = ex.death;
    const left = 1 - d.shut;
    for (const sx of [-1, 1]) {
      const x = cx + sx * sep;
      if (left > 0.02) {
        outlined(ctx, p.e, hair(0.5, 0.012 * u), (c) => c.ellipse(x, cy, 0.05 * u, 0.07 * u * left, 0, 0, Math.PI * 2));
        if (left > 0.3) dot(ctx, x - 0.016 * u, cy - 0.022 * u * left, 0.02 * u * left, p.w);
      }
      if (d.lid) shutLid(ctx, p, u, x, cy, d, 0.04 * u, hair(0.9, 0.025 * u));
      drawDeadEyeMark(ctx, p, u, x, cy, d, { tilt: sx * 0.12, scale: 1.25 });
    }
    return;
  }
  if (lod) { dot(ctx, cx - sep, cy, 0.045 * u, p.e); dot(ctx, cx + sep, cy, 0.045 * u, p.e); return; }
  if (ex.blink) {
    ctx.strokeStyle = p.e; ctx.lineWidth = hair(0.9, 0.025 * u); ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.04 * u, cy);
      ctx.quadraticCurveTo(cx + sx * sep, cy + 0.02 * u, cx + sx * sep + 0.04 * u, cy);
      ctx.stroke();
    }
    return;
  }
  if (ex.joy && !ex.cheer) { // ^ ^ delight
    ctx.strokeStyle = p.e; ctx.lineWidth = hair(1, 0.03 * u); ctx.lineCap = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * sep - 0.045 * u, cy + 0.02 * u);
      ctx.quadraticCurveTo(cx + sx * sep, cy - 0.06 * u, cx + sx * sep + 0.045 * u, cy + 0.02 * u);
      ctx.stroke();
    }
    return;
  }
  if (ex.cross) {
    // goofy face: eyes stay dark, but they draw a little closer together and
    // the white glints swing to the inner edge — on a solid eye the glint is
    // what reads as gaze, so both aiming at the nose reads cross-eyed.
    const csep = sep * 0.86;
    for (const sx of [-1, 1]) {
      outlined(ctx, p.e, hair(0.5, 0.012 * u), (c) => c.ellipse(cx + sx * csep, cy, 0.05 * u, 0.07 * u, 0, 0, Math.PI * 2));
      dot(ctx, cx + sx * (csep - 0.022 * u), cy - 0.012 * u, 0.024 * u, p.w);
    }
    return;
  }
  const rY = ex.surprise || ex.cheer ? 0.085 : 0.07;
  for (const sx of [-1, 1]) {
    outlined(ctx, p.e, hair(0.5, 0.012 * u), (c) => c.ellipse(cx + sx * sep, cy, 0.05 * u, rY * u, 0, 0, Math.PI * 2));
    dot(ctx, cx + sx * sep - 0.016 * u, cy - 0.022 * u, 0.02 * u, p.w);
  }
}

function drawPika(ctx, id, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const ph = (pose.phase || 0) * Math.PI * 2;
  const kind = pose.kind;
  const slide = kind === 'slide';
  const enhancedSlide = slide && usesEnhancedLocomotion(pose);
  const enhancedJump = kind === 'jump' && usesEnhancedLocomotion(pose);
  const airV = enhancedJump ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 460)) : 0;
  const airApex = enhancedJump ? 1 - Math.abs(airV) : 0;
  const airRise = Math.max(0, airV);
  const celebrate = kind === 'celebrate';
  const celebrateSync = celebrate && usesReworkedCelebration(pose)
    ? celebrateMotion(id, t, true)
    : null;
  const acc = p.ear || p.a;          // purple accent (ears + cowlick)
  const star = p.star || acc;        // tail star
  const belly = p.belly || p.a;
  const cheek = p.cheek || p.m;

  let rx = 0.34 * u, ry = 0.35 * u, cy = -0.4 * u;
  if (slide) { rx = 0.4 * u; ry = 0.22 * u; cy = -0.25 * u; }
  else if (kind === 'run') { const b = Math.sin(2 * ph) * 0.03 * u; ry += b; rx -= b * 0.7; }
  else if (kind === 'idle') { cy -= 0.012 * u * (1 + Math.sin(t * 3)) * 0.5; }
  else if (enhancedJump) {
    // Mochi tucks into a soft ball at the apex and lengthens slightly while
    // travelling. This is local deformation of the squishy rig, not a change
    // to her standing body proportions.
    rx *= 1 + 0.055 * airApex;
    ry *= 1 - 0.045 * airApex;
    cy -= 0.035 * u * airApex;
  }
  if (celebrate) {
    const b = celebrateSync ? celebrateSync.lift / 0.15 : Math.sin(t * 7);
    ry *= 1 + 0.1 * b; rx *= 1 - 0.08 * b; cy -= 0.03 * u * Math.max(0, b);
  }

  ctx.save();
  // Ears make the silhouette taller than the rest of the cast; scale the whole
  // rig down a touch (about the feet baseline at y=0) so Poyo's total height
  // sits in line with the other heroes.
  ctx.scale(0.9, 0.9);
  if (pose.float) {
    ctx.rotate(0.06 * Math.sin(t * 5));
    cy -= 0.03 * u * (1 + Math.sin(t * 9)) * 0.5;
  }
  // Clinging, both nubs go over the top of her and stay there: she has hauled
  // herself onto the pole and is riding it as one squeezed handful. The body
  // stretch itself comes from drawToon; what belongs here is where the nubs go
  // and the wobble of a soft thing hanging by two of them.
  // Clinging: one nub goes to the pole and the rest of her is left alone — the
  // same change the humanoids make, and for the same reason. She used to be in
  // CLING_RIG, squeezed tall and rocking, with both nubs thrown over the top:
  // that is a body wrapped round a pole, and it was written when the assumption
  // was that she had nothing to hold on with. She has two hands. The lift is
  // gone with the rest of it; a hero holding a pole hangs, she does not float.
  const clingPika = clingAmount(pose);
  // NOT armsUp. That throws BOTH nubs over the top, which is the old whole-body
  // answer — only the pole-side one is going anywhere now.
  const armsUp = pose.float || celebrate || enhancedJump;

  // tail: star-tipped stalk, drawn on the LEFT in rig space so it trails behind
  // (the drawToon wrapper mirrors the whole rig with facing, keeping it correct).
  if (!slide) {
    const wag = Math.sin(t * 4 + (kind === 'run' ? ph : 0)) * 0.05;
    ctx.save();
    ctx.translate(-rx * 0.7, cy + ry * 0.35);
    ctx.scale(-1, 1);
    const s = u;
    ctx.strokeStyle = OUTLINE; ctx.lineCap = 'round';
    ctx.lineWidth = 0.1 * s + ow * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0.02 * s);
    ctx.quadraticCurveTo(0.16 * s, -0.02 * s, 0.2 * s, -0.2 * s + wag * s);
    ctx.stroke();
    ctx.strokeStyle = p.b; ctx.lineWidth = 0.1 * s; ctx.stroke();
    const tx = 0.2 * s, ty = -0.24 * s + wag * s, R = 0.1 * s, r2 = 0.04 * s;
    outlined(ctx, star, ow * 0.9, (c) => {
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 ? r2 : R;
        const px = tx + Math.cos(ang) * rad, py = ty + Math.sin(ang) * rad;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
    });
    ctx.restore();
  }

  // ears: rounded purple-tipped, splayed outward. They stay UP while sliding
  // (just a little shorter), poking above the flattened head — drawn before the
  // body, so the wide slide body would otherwise swallow anything drooped down.
  {
    const baseY = cy - ry * 0.78;
    const earLen = (slide ? 0.22 : 0.3) * u;
    for (const side of [-1, 1]) {
      const baseX = side * rx * 0.5;
      const lean = side * 0.12 * u;
      const wob = celebrate
        ? 0.03 * u * Math.max(0, celebrateSync ? celebrateSync.lift / 0.15 : Math.sin(t * 7))
        : 0;
      const tipX = baseX + lean + side * (0.06 + airApex * 0.025 + (enhancedSlide ? 0.025 : 0)) * u;
      // The ears trail a rising body, then splay back open at the apex.
      const tipY = baseY - earLen - wob + airRise * 0.055 * u - airApex * 0.025 * u
        + (enhancedSlide ? 0.025 * u : 0);
      const halfBase = 0.11 * u, halfTip = 0.075 * u;
      // The base corners have to meet a DOME, not a flat line. Both used to sit
      // at one shared y: fine for the inner corner, which lands well inside the
      // head, but the outer one is a whole halfBase further out, where the
      // ellipse has already fallen away — it hung ~0.054u clear of the skull, so
      // the ear's own bottom outline drew across open air and the whole ear read
      // as floating beside the head. Each corner now sinks to whichever is
      // deeper: the old flat base, or the head's edge at that x plus a bite of
      // overlap. The body paints over the ears, so the joint closes invisibly.
      const headTopAt = (x) => cy - ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
      const rootY = (x) => Math.max(baseY + 0.02 * u, headTopAt(x) + 0.035 * u);
      const innerX = baseX - side * halfBase, outerX = baseX + side * halfBase;
      const earPath = (c) => {
        c.moveTo(innerX, rootY(innerX));
        c.quadraticCurveTo(baseX + lean * 0.3 - side * halfTip, (baseY + tipY) / 2, tipX - side * halfTip, tipY + 0.03 * u);
        c.quadraticCurveTo(tipX + side * 0.005 * u, tipY - 0.07 * u, tipX + side * halfTip, tipY + 0.03 * u);
        c.quadraticCurveTo(baseX + lean * 0.5 + side * halfTip, (baseY + tipY) / 2, outerX, rootY(outerX));
        c.closePath();
      };
      outlined(ctx, p.b, ow, earPath);
      // purple cap over the top ~third around the tip
      ctx.save();
      ctx.beginPath(); earPath(ctx); ctx.clip();
      ctx.fillStyle = acc;
      ctx.beginPath(); ctx.rect(tipX - 0.2 * u, tipY - 0.1 * u, 0.4 * u, 0.26 * u); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = ow;
      ctx.beginPath(); earPath(ctx); ctx.stroke();
    }
    // small purple cowlick curl between the ears — kept upright in every pose
    const tuftY = cy - ry * 0.86;
    const sway = Math.sin(t * 3 + 1) * 0.02 * u + (kind === 'run' ? Math.sin(ph) * 0.012 * u : 0);
    outlined(ctx, acc, ow * 0.9, (c) => {
      c.moveTo(-0.055 * u, tuftY + 0.04 * u);
      c.quadraticCurveTo(-0.075 * u, tuftY - 0.1 * u, 0.01 * u + sway, tuftY - 0.15 * u);
      c.quadraticCurveTo(0.065 * u + sway, tuftY - 0.17 * u, 0.055 * u + sway * 0.6, tuftY - 0.1 * u);
      c.quadraticCurveTo(0.03 * u, tuftY - 0.1 * u, 0.04 * u, tuftY - 0.04 * u);
      c.quadraticCurveTo(0.05 * u, tuftY + 0.01 * u, 0.055 * u, tuftY + 0.04 * u);
      c.closePath();
    });
  }

  // feet stubs
  const step = kind === 'run' ? Math.sin(ph) * 0.06 * u : 0;
  const slideSpread = enhancedSlide ? 0.025 * u : 0;
  const footIn = enhancedJump ? airApex * 0.035 * u : -slideSpread;
  const footUp = enhancedJump ? (0.055 + airApex * 0.055) * u : 0;
  outlined(ctx, p.b, ow, (c) => c.ellipse(-0.14 * u + step + footIn, -0.03 * u - footUp, 0.08 * u, 0.05 * u, 0, 0, Math.PI * 2));
  outlined(ctx, p.b, ow, (c) => c.ellipse(0.14 * u - step - footIn, -0.03 * u - footUp, 0.08 * u, 0.05 * u, 0, 0, Math.PI * 2));

  // body + lighter belly
  outlined(ctx, p.b, ow, (c) => c.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2));
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = belly;
  ctx.beginPath(); ctx.ellipse(0, cy + ry * 0.42, rx * 0.72, ry * 0.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // arm nubs (rotate up while floating / celebrating)
  const nubY = armsUp ? cy - ry * 0.5 : cy + ry * (enhancedSlide ? 0.42 : 0.2);
  const nubR = 0.08 * u;
  // The pole-side nub's target. Divided by the 0.9 the whole rig is scaled by
  // above, so it lands on the column in WORLD space — where the mast actually
  // is — rather than 10% short of it in her own.
  const gripX = (CLING_POLE_X * u) / 0.9;
  // Just clear of the crown, which is as far as a hand with no arm can
  // plausibly be: her reach is the length of her own body, not of a limb.
  const gripY = cy - ry * 1.02;
  const nx = (rx + 0.005 * u) + (gripX - (rx + 0.005 * u)) * clingPika;
  const ny = nubY + (gripY - nubY) * clingPika;
  outlined(ctx, p.b, hair(0.6, ow * 0.9), (c) => c.arc(-rx - 0.005 * u, nubY, nubR, 0, Math.PI * 2));
  outlined(ctx, p.b, hair(0.6, ow * 0.9), (c) => c.arc(nx, ny, nubR, 0, Math.PI * 2));

  // face — rides a small bounce on the run; cheeks lag + squash for a jiggle.
  // Kept subtle: the body already squashes at the same frequency, so a large
  // face offset on top reads as the features sliding around the head.
  const ex = expressionFor(id, pose);
  // Now and then on the run he pulls a goofy face: tongue lolling out (drawn
  // with the mouth below) and eyes crossed. Off far longer than it is on, and
  // offset by the face seed so it never lands in step with the blink.
  const loll = kind === 'run' && !ex.joy && !ex.surprise && ((t + (FACE_SEED[id] || 0)) % 5.4) < 1.5;
  ex.cross = loll;
  const faceBob = kind === 'run' ? Math.sin(2 * ph) * 0.012 * u : 0;
  const faceY = cy - ry * 0.08 + faceBob;
  // Gallery-only directional look. Poyo has no separate head to rotate, so the
  // facial mask shifts across the fixed body and compresses slightly instead.
  const faceYaw = Math.sin(Math.max(-65, Math.min(65, Number(pose.headTurn) || 0)) * Math.PI / 180);
  ctx.save();
  ctx.translate(faceYaw * 0.11 * u, 0);
  ctx.scale(1 - Math.abs(faceYaw) * 0.16, 1);
  pikaEyes(ctx, p, u, 0, faceY, lod, ex);
  const jig = kind === 'run' ? Math.sin(2 * ph - 0.7) : 0;
  const cheekY = faceY + 0.11 * u + jig * 0.018 * u;
  const cheekRx = 0.05 * u * (1 + jig * 0.1);
  const cheekRy = 0.05 * u * (1 - jig * 0.1);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 0.24 * u, cheekY, cheekRx, cheekRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = cheek; ctx.fill();
  }
  if (!lod) dot(ctx, 0, faceY + 0.08 * u, 0.012 * u, p.e);
  if (ex.death) {
    // Her resting mouth is a two-bump `w` - a smile by any reading - and the
    // goofy tongue lives in the same branch, so a dead Poyo could roll her own
    // tongue out. Both are replaced by the open O.
    const a = ex.death.shut;
    outlined(ctx, p.m, hair(0.6, 0.014 * u), (c) =>
      c.ellipse(0, faceY + 0.15 * u, (0.03 + 0.02 * a) * u, (0.008 + 0.037 * a) * u, 0, 0, Math.PI * 2));
  } else if (ex.joy || ex.surprise) {
    // The open O rides joyAmt on the pole so it grows with the descent.
    const amt = ex.cheer ? (ex.joyAmt == null ? 1 : ex.joyAmt) : 0;
    outlined(ctx, p.m, hair(0.6, 0.014 * u), (c) => c.ellipse(0, faceY + 0.15 * u, 0.05 * u, (0.04 + 0.02 * amt) * u, 0, 0, Math.PI * 2));
  } else {
    // the goofy-face tongue, flapping with the stride (see `loll` above)
    if (loll && !lod) {
      const flap = Math.sin(2 * ph) * 0.012 * u;
      const tx = 0.03 * u, ty = faceY + 0.13 * u;
      outlined(ctx, cheek, hair(0.6, ow * 0.8), (c) => {
        c.moveTo(tx - 0.025 * u, ty);
        c.quadraticCurveTo(tx - 0.032 * u, ty + 0.06 * u + flap, tx, ty + 0.062 * u + flap);
        c.quadraticCurveTo(tx + 0.032 * u, ty + 0.06 * u + flap, tx + 0.025 * u, ty);
        c.closePath();
      });
    }
    ctx.strokeStyle = p.m; ctx.lineWidth = hair(0.8, 0.02 * u); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.05 * u, faceY + 0.12 * u);
    ctx.quadraticCurveTo(-0.025 * u, faceY + 0.16 * u, 0, faceY + 0.13 * u);
    ctx.quadraticCurveTo(0.025 * u, faceY + 0.16 * u, 0.05 * u, faceY + 0.12 * u);
    ctx.stroke();
  }

  ctx.restore();

  ctx.restore();
}

// ------------------------------------------------- Miss Chomp (v8a spec)
// Flat-illustration vector look authored as SVG path data in a 240x340 space
// (body centre (120,148), R=96), replayed through canvas. Long red flow hair
// with a translucent sheet draped over her back, two lashed eyes (no brows),
// pink bow. Legs/feet are excluded from the spec and keep the rig's gait.
const CHOMPO_PATHS = {
  hairA: 'M158,54 C126,14 58,14 30,50 C0,82 -6,156 8,232 C18,264 40,282 62,274 C46,230 44,150 60,98 C38,114 28,74 50,50 C80,16 130,18 158,54 Z',
  hairB: 'M152,58 C124,22 58,22 34,54 C6,84 0,152 16,226 C26,258 44,276 62,268 C50,226 48,150 62,100 C42,114 34,76 54,54 C82,22 126,24 152,58 Z',
  hairC: 'M120,40 C78,44 42,68 28,150',
  hairOver: 'M108,98 C50,118 16,178 24,250 C42,224 66,216 92,222 C74,182 74,140 94,110 C84,128 92,110 108,98 Z',
  hairOverHi: 'M98,116 C56,140 38,190 40,244',
  hairFront: 'M136,54 C108,46 78,58 64,92 C56,140 62,210 80,258 C74,206 78,138 96,94 C112,68 126,60 136,54 Z',
  hairFrontHi: 'M120,66 C96,74 82,104 78,170',
  bowL: 'M130,42 C104,20 96,42 100,52 C108,64 126,52 130,46 Z',
  bowR: 'M130,42 C156,20 164,42 160,52 C152,64 134,52 130,46 Z',
  bowShade: 'M130,42 C104,26 100,40 102,50 C112,42 122,44 130,46 Z',
};
// Eye groups, each uniformly scaled about its own centre (far = left, near =
// right). Lid is body-coloured for the half-lidded look; brows intentionally
// omitted per spec.
const CHOMPO_EYES = [
  { cx: 112, cy: 110, k: 0.95, rx: 19, ry: 23, pupil: [120, 115, 10], glint: [116, 111, 3.4],
    lid: 'M93,110 Q112,88 133,108 Q134,100 112,95 Q93,98 93,110 Z',
    lash: 'M92,106 Q112,84 134,104', lashW: 4,
    tips: 'M132,100 L142,95 M128,92 L136,84', tipW: 2.6 },
  { cx: 162, cy: 98, k: 0.72, rx: 25, ry: 30, pupil: [170, 104, 13], glint: [165, 99, 4.5],
    lid: 'M137,98 Q162,74 187,96 Q188,86 162,80 Q137,84 137,98 Z',
    lash: 'M136,94 Q162,68 189,92', lashW: 5,
    tips: 'M188,90 L200,84 M184,80 L194,71 M176,73 L182,62', tipW: 3 },
];

// Minimal absolute-command SVG path replayer (M/L/C/Q/Z — all the spec uses).
function specPath(ctx, d) {
  ctx.beginPath();
  const re = /([MLCQZ])([^MLCQZ]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?[\d.]+/g) || []).map(Number);
    if (m[1] === 'M') ctx.moveTo(n[0], n[1]);
    else if (m[1] === 'L') for (let i = 0; i < n.length; i += 2) ctx.lineTo(n[i], n[i + 1]);
    else if (m[1] === 'C') for (let i = 0; i < n.length; i += 6) ctx.bezierCurveTo(n[i], n[i + 1], n[i + 2], n[i + 3], n[i + 4], n[i + 5]);
    else if (m[1] === 'Q') for (let i = 0; i < n.length; i += 4) ctx.quadraticCurveTo(n[i], n[i + 1], n[i + 2], n[i + 3]);
    else ctx.closePath();
  }
}
function specFill(ctx, d, fill, alpha = 1) {
  specPath(ctx, d);
  ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1;
}
function specStroke(ctx, d, stroke, w, alpha = 1) {
  specPath(ctx, d);
  ctx.globalAlpha = alpha; ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
}
// Body pie wedge: mouth opens right; arc runs the long way round (spec:
// A96,96 0 1 0). Upper and lower lip angles are independent so the jaw can
// chomp Pac-Man-style while the top lip stays put. When the jaw meets the top
// lip the wedge vanishes and she is a full circle — a true Pac-Man shut.
function chompoBodyPath(ctx, thetaUp, thetaLo) {
  ctx.beginPath();
  if (thetaUp + thetaLo < 0.02) {
    ctx.arc(120, 148, 96, 0, Math.PI * 2);
    ctx.closePath();
    return;
  }
  ctx.moveTo(120, 148);
  ctx.arc(120, 148, 96, -thetaUp, thetaLo, true);
  ctx.closePath();
}

// Her special-move bite: one deliberate, dramatic CHOMP per cycle — a fast gape,
// a beat held wide, then a hard SNAP shut and a rest closed. Reads as a bite
// rather than the steady sinusoid of the run chomp. Returns open amount 0..1.
function biteWave(cyc) {
  const q = cyc - Math.floor(cyc);
  if (q < 0.34) { const a = q / 0.34; return 1 - (1 - a) * (1 - a); }  // slow gape open (ease-out)
  if (q < 0.66) return 1;                                              // long dramatic hold wide
  if (q < 0.73) { const a = (0.73 - q) / 0.07; return a * a; }         // hard SNAP shut
  return 0;                                                            // hold shut
}
// Spec radial gradient (38%/32%, r 75% of the 192px body box); flat fallback
// for contexts without gradients (Node test stub) and tiny LOD renders.
function chompoBodyFill(ctx, p, lod) {
  if (lod || !ctx.createRadialGradient) return p.b;
  const g = ctx.createRadialGradient(96.96, 113.44, 0, 96.96, 113.44, 144);
  g.addColorStop(0, p.hi); g.addColorStop(0.58, p.b); g.addColorStop(1, p.sh);
  return g;
}
// Chompo's face is drawn in SPEC space - the 240-unit coordinate system her
// paths were authored in, mapped onto the body by drawDisc - so the shared
// death mark, which measures itself in `u`, needs the u of THAT space: the
// body is r = 0.34u wide and 96 spec units, so one u is 96/0.34 of them.
const CHOMPO_SPEC_U = 96 / 0.34;

function chompoEye(ctx, p, e, bodyFill, lod, blink, gaze = 0, death = null) {
  ctx.save();
  ctx.translate(e.cx, e.cy); ctx.scale(e.k, e.k); ctx.translate(-e.cx, -e.cy);
  if (death) {
    // The three beats in her dialect. Beat one squeezes the whole eye - white,
    // pupil, glint and half-lid together - down onto the lash line, which is
    // the closed shape she already owns; beat two takes the lashes away; the
    // mark lands where the eye was, at her own eye's scale rather than the
    // face's, because her two eyes are deliberately different sizes.
    const left = 1 - death.shut;
    if (left > 0.02) {
      ctx.save();
      ctx.translate(e.cx, e.cy); ctx.scale(1, left); ctx.translate(-e.cx, -e.cy);
      ctx.beginPath(); ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.w; ctx.fill();
      dot(ctx, e.pupil[0] + gaze, e.pupil[1], e.pupil[2], p.e);
      if (left > 0.3) dot(ctx, e.glint[0] + gaze, e.glint[1], e.glint[2], p.w);
      if (!lod) specFill(ctx, e.lid, bodyFill);
      ctx.restore();
    }
    if (death.lid) {
      // specStroke owns globalAlpha outright, so the fade goes THROUGH it
      // rather than around it - setting it on the context here would be
      // overwritten by the first stroke.
      const fade = Math.min(1, death.shut * 1.6);
      specStroke(ctx, e.lash, p.e, e.lashW, fade);
      if (!lod) specStroke(ctx, e.tips, p.e, e.tipW, fade);
    }
    drawDeadEyeMark(ctx, p, CHOMPO_SPEC_U, e.cx, e.cy, death,
      { tilt: (e.cx < 130 ? -1 : 1) * 0.12, scale: e.ry / 26 });
    ctx.restore();
    return;
  }
  if (blink) { // closed: the lash line arc plus her lash tips, so a blink still reads glam
    specStroke(ctx, e.lash, p.e, e.lashW);
    if (!lod) specStroke(ctx, e.tips, p.e, e.tipW);
    ctx.restore();
    return;
  }
  ctx.beginPath(); ctx.ellipse(e.cx, e.cy, e.rx, e.ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = p.w; ctx.fill();
  ctx.globalAlpha = 0.5; ctx.strokeStyle = p.sh; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
  dot(ctx, e.pupil[0] + gaze, e.pupil[1], e.pupil[2], p.e);
  dot(ctx, e.glint[0] + gaze, e.glint[1], e.glint[2], p.w);
  if (!lod) {
    specFill(ctx, e.lid, bodyFill);        // half-lidded, body-coloured
    specStroke(ctx, e.lash, p.e, e.lashW);
    specStroke(ctx, e.tips, p.e, e.tipW);
  }
  ctx.restore();
}

function drawDisc(ctx, id, p, pose, u, ow, lod) {
  const ph = (pose.phase || 0) * Math.PI * 2;
  const slide = pose.kind === 'slide';
  const enhancedMotion = usesEnhancedLocomotion(pose);
  const enhancedJump = pose.kind === 'jump' && enhancedMotion;
  const airV = enhancedJump ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 460)) : 0;
  const airApex = enhancedJump ? 1 - Math.abs(airV) : 0;
  const r = (slide ? 0.3 : 0.34) * u;
  const cy = slide ? -0.31 * u : -0.44 * u;
  if (slide && pose.roll) {
    ctx.save();
    ctx.translate(0, cy);
    ctx.rotate((pose.time || 0) * 13);
    const half = 0.16 * Math.PI;
    outlined(ctx, p.b, ow, (c) => {
      c.arc(0, 0, r, half, Math.PI * 2 - half);
      c.lineTo(0, 0);
      c.closePath();
    });
    dot(ctx, r * 0.35, -r * 0.45, 0.035 * u, p.e);
    if (id === 'chompo') {
      outlined(ctx, p.a, ow, (c) => c.ellipse(-0.13 * u, -r * 0.75, 0.1 * u, 0.06 * u, -0.5, 0, Math.PI * 2));
      outlined(ctx, p.a, ow, (c) => c.ellipse(0.02 * u, -r * 0.82, 0.1 * u, 0.06 * u, 0.5, 0, Math.PI * 2));
    }
    ctx.restore();
    return;
  }
  const ex = expressionFor(id, pose);
  const reworkedCelebrate = pose.kind === 'celebrate' && usesReworkedCelebration(pose)
    ? celebrateMotion(id, pose.time || 0, true)
    : null;
  // Pac-Man mouth with a fixed TOP lip: the upper angle holds the spec's idle
  // 15° while only the jaw (lower lip) swings. The jaw travels from -15° (flush
  // against the top lip — mouth FULLY closed, she becomes a circle) down to a
  // wide bite, twice a stride. Idle matches the spec's static 15/15 look.
  const upDeg = slide ? 10 : 15;
  let loDeg = slide ? 10 : 15;
  const mt = pose.time || 0;
  // Special move (HAZARD BITE): one deliberate CHOMP per ~0.6s — a wide gape,
  // a held beat, then a hard SNAP shut. The hold + snap read nothing like the
  // run's gentle steady chew. Both are paced by TIME (not stride) so the
  // speed is controllable and never frantic.
  if (pose.menuAction === 'chomp') loDeg = -upDeg + 57 * biteWave(mt * 1.7); // wide bite, just short of exposing a leg — snappy, ~0.6s a cycle
  else if (pose.kind === 'run') loDeg = -upDeg + 40 * (0.5 - 0.5 * Math.cos(mt * 11)); // gentle chew, ~1.75/s
  else if (pose.kind === 'celebrate') loDeg = -upDeg + 50 * (reworkedCelebrate
    ? biteWave(reworkedCelebrate.cycle * 2)
    : Math.abs(Math.sin(mt * 6))); // shipped two-stage bite; legacy keeps the air-chomp
  else if (pose.kind === 'jump') loDeg = 32;
  // Clinging: the jaw clamps. Chompo has no hands, so she rides the pole by
  // biting it, and the mouth has to be OPEN — but held, not chewing — with the
  // pole notionally filling the wedge. A shallow gape with a small strain
  // tremor on it; a wide one reads as a yawn on the way down.
  const clingDisc = clingAmount(pose);
  if (clingDisc > 0) {
    const bite = 26 + Math.sin((pose.time || 0) * 14) * 2.5;
    loDeg += (bite - loDeg) * clingDisc;
  }
  const thetaUp = upDeg * Math.PI / 180, thetaLo = loDeg * Math.PI / 180;

  // Walk: the head/body/hair bob up and down with each step (feet stay planted,
  // the legs stretch), and squash-and-stretch in sync — tall at footfall, fat at
  // mid-stride — so she reads as a character walking, not a disc vibrating in
  // place. Matches the humanoid cast's -|cos| bob for a consistent gait.
  const bob = pose.kind === 'run' ? -Math.abs(Math.cos(ph)) * 0.03 * u
    : pose.kind === 'idle' ? Math.sin((pose.time || 0) * 2) * 0.008 * u
      : enhancedJump ? -airApex * 0.03 * u : 0;
  const squash = pose.kind === 'run' ? (0.5 - Math.abs(Math.cos(ph))) * 0.06
    : slide && enhancedMotion ? 0.115
      : enhancedJump ? airApex * 0.035
        : Math.sin((pose.time || 0) * 2.2) * 0.012;
  const pivotY = cy + r * 0.9;
  ctx.save();
  ctx.translate(0, pivotY); ctx.scale(1 + squash, 1 - squash); ctx.translate(0, -pivotY);

  // local -> spec space: spec body centre (120,148) R=96 maps onto (0,cy) r
  const s = r / 96;
  const spec = (fn) => {
    ctx.save();
    ctx.translate(0, cy); ctx.scale(s, s); ctx.translate(-120, -148);
    fn();
    ctx.restore();
  };

  // Hair bounce: the masses ride the stride with follow-through — they lag the
  // body squash and the back mass swings farther than the front lock (spec px).
  const t0 = pose.time || 0;
  const hairBack = pose.kind === 'run' ? Math.sin(ph - 1.1) * 9 : Math.sin(t0 * 2.2 - 0.6) * 2.5;
  const hairFrontB = pose.kind === 'run' ? Math.sin(ph - 0.7) * 4.5 : Math.sin(t0 * 2.2 - 0.3) * 1.5;

  // 1. hair behind the body (spec draw order). Widened for volume but SHORTENED
  // vertically (y<1) so the back mass doesn't hang past her body. Rides the bob.
  ctx.save();
  ctx.translate(0, bob);
  spec(() => {
    ctx.translate(0, hairBack);
    ctx.translate(94, 40); ctx.scale(1.2, 0.95); ctx.translate(-94, -40);
    specFill(ctx, CHOMPO_PATHS.hairA, p.hairShade);
    specFill(ctx, CHOMPO_PATHS.hairB, p.hair);
    if (!lod) specStroke(ctx, CHOMPO_PATHS.hairC, p.hairLight, 4, 0.6);
  });
  ctx.restore();

  if (reworkedCelebrate) {
    // A tiny golden snack makes the verb unmistakable: it arcs from outside
    // the silhouette into the transparent mouth wedge, shrinks on the snap,
    // and is gone before the satisfied bounce. Painted before the body so the
    // closed jaw naturally masks it instead of requiring a separate clip.
    const phase = (reworkedCelebrate.cycle * 2) % 1;
    if (phase >= 0.08 && phase < 0.74) {
      const raw = Math.max(0, Math.min(1, (phase - 0.08) / 0.66));
      const travel = raw * raw * (3 - 2 * raw);
      const snackX = (0.62 - travel * 0.31) * u;
      const snackY = cy - Math.sin(travel * Math.PI) * 0.09 * u;
      const snackR = (0.062 - travel * 0.035) * u;
      ctx.save();
      ctx.translate(snackX, snackY);
      ctx.rotate(travel * 1.8);
      outlined(ctx, '#f6d33c', hair(0.5, ow * 0.65), (c) => {
        c.moveTo(0, -snackR);
        c.lineTo(snackR, 0);
        c.lineTo(0, snackR);
        c.lineTo(-snackR, 0);
        c.closePath();
      });
      if (!lod) {
        dot(ctx, -snackR * 0.22, -snackR * 0.08, snackR * 0.12, '#9a6515');
        dot(ctx, snackR * 0.25, snackR * 0.2, snackR * 0.1, '#9a6515');
      }
      ctx.restore();
    }
  }

  // 2. legs — excluded from the spec; the rig's own gait. Sized against the
  // humanoid cast (legW 0.09u): a touch slimmer at 0.07u, and reaching a
  // lower ankle so the pumps plant as deep as everyone else's soles — at the
  // old 0.055u / -0.05u ankle she read as hovering above the ground line.
  const p01 = pose.phase || 0;
  let gF = pose.kind === 'run' ? gaitFoot(p01, 0.08 * u, 0.06 * u) : [0, 0];
  let gB = pose.kind === 'run' ? gaitFoot(p01 + 0.5, 0.08 * u, 0.06 * u) : [0, 0];
  if (enhancedJump) {
    gF = [(0.035 + 0.025 * airApex) * u, 0];
    gB = [(-0.025 - 0.02 * airApex) * u, 0.035 * (1 - airApex) * u];
  }
  // legs stop at the ANKLE so the shoe, drawn on top, meets them cleanly
  // instead of the leg poking through it
  const ankleY = enhancedJump ? (-0.11 - 0.055 * airApex) * u : -0.03 * u;
  const hipY = cy + r * 0.6 + bob;   // hips ride the bob; feet stay planted, so legs stretch
  limb(ctx, -0.1 * u, hipY, -0.1 * u + gB[0], ankleY + gB[1], 0.07 * u, p.p, ow);
  limb(ctx, 0.1 * u, hipY, 0.1 * u + gF[0], ankleY + gF[1], 0.07 * u, p.p, ow);
  // high-heel pumps drawn BELOW the ankle (over the leg ends): pointed toe up
  // front, a lifted arch, and a thin stiletto heel planting on the ground
  // (y~0). Scaled up ~15% about the ankle to stay in proportion with the
  // thicker legs.
  const heel = (ax, ay) => {
    const gy = ay + 0.065 * u; // sole plants slightly into the ground line (y=0)
    ctx.save();
    ctx.translate(ax, ay); ctx.scale(1.15, 1.15); ctx.translate(-ax, -ay);
    outlined(ctx, p.f, hair(0.6, ow * 0.8), (c) => {
      c.moveTo(ax - 0.03 * u, ay + 0.004 * u);                                          // heel top, back of the ankle
      c.quadraticCurveTo(ax + 0.016 * u, ay - 0.014 * u, ax + 0.05 * u, ay + 0.012 * u); // vamp over the instep
      c.lineTo(ax + 0.094 * u, gy - 0.004 * u);                                         // pointed toe at the ground
      c.lineTo(ax + 0.032 * u, gy);                                                     // ball of the foot
      c.quadraticCurveTo(ax - 0.004 * u, gy - 0.03 * u, ax - 0.026 * u, gy);            // arch lifts to the heel tip
      c.lineTo(ax - 0.036 * u, gy);                                                     // stiletto base (thin)
      c.closePath();                                                                    // heel column up to the ankle
    });
    ctx.restore();
  };
  heel(-0.1 * u + gB[0], ankleY + gB[1]);
  heel(0.1 * u + gF[0], ankleY + gF[1]);

  ctx.save();
  ctx.translate(0, bob);
  spec(() => {
    const bodyFill = chompoBodyFill(ctx, p, lod);
    // 3. body + clipped belly shadow and top-left sheen
    chompoBodyPath(ctx, thetaUp, thetaLo);
    ctx.fillStyle = bodyFill;
    ctx.fill();
    if (!lod) {
      ctx.save();
      chompoBodyPath(ctx, thetaUp, thetaLo);
      ctx.clip();
      ctx.globalAlpha = 0.35; ctx.fillStyle = p.sh;
      ctx.beginPath(); ctx.ellipse(120, 235, 120, 80, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.22; ctx.fillStyle = p.w;
      ctx.beginPath(); ctx.ellipse(72, 92, 46, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // Red lips framing the mouth: a cupid's-bow upper lip (two peaks + a central
    // dip) and a fuller lower lip, filled between the mouth line and a bulged
    // face-side profile along each wedge edge. They run all the way to the rim
    // (r=96) and stay put when the mouth snaps fully shut — both wedge edges
    // then coincide, so the two lips stack into one closed red mouth line.
    if (!lod) {
      const LIP = p.lip || '#d0202e', LIPSH = p.lipShade || p.aDark;
      // prof = [radius, face-side offset]; the mouth-side edge sits at offset 0.
      // The face-side profile is smoothed through segment midpoints (the raw
      // points become curve controls) so the cupid's bow arcs instead of kinking.
      const lip = (ang, perp, prof) => {
        const c = Math.cos(ang), s = Math.sin(ang), px = Math.cos(perp), py = Math.sin(perp);
        const pt = (rad, off) => [120 + c * rad + px * off, 148 + s * rad + py * off];
        const face = prof.map(([rad, off]) => pt(rad, off)).reverse(); // rim -> inner
        ctx.beginPath();
        let a = pt(prof[0][0], 0); ctx.moveTo(a[0], a[1]);             // inner, on the mouth line
        a = pt(prof[prof.length - 1][0], 0); ctx.lineTo(a[0], a[1]);   // out to the rim
        ctx.lineTo(face[0][0], face[0][1]);
        for (let i = 1; i < face.length - 1; i++) {
          ctx.quadraticCurveTo(face[i][0], face[i][1], (face[i][0] + face[i + 1][0]) / 2, (face[i][1] + face[i + 1][1]) / 2);
        }
        ctx.lineTo(face[face.length - 1][0], face[face.length - 1][1]);
        ctx.closePath();
        ctx.fillStyle = LIP; ctx.fill();
        ctx.strokeStyle = LIPSH; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.globalAlpha = 1;
      };
      ctx.save(); ctx.lineJoin = 'round';
      lip(-thetaUp, -thetaUp - Math.PI / 2, [[58, 2], [69, 14], [76, 4], [83, 14], [96, 2]]); // cupid's-bow upper lip
      lip(thetaLo, thetaLo + Math.PI / 2, [[58, 2], [74, 11], [96, 2]]);                       // fuller lower lip
      ctx.restore();
    }
    // 4-5. hair in front: translucent sheet over her back, then the face lock
    // (bouncing gentler than the back mass — follow-through, not lockstep)
    ctx.save();
    ctx.translate(0, hairFrontB);
    specFill(ctx, CHOMPO_PATHS.hairOver, p.hair, 0.5);
    if (!lod) specStroke(ctx, CHOMPO_PATHS.hairOverHi, p.hairLight, 3.5, 0.5);
    specFill(ctx, CHOMPO_PATHS.hairFront, p.hair);
    if (!lod) specStroke(ctx, CHOMPO_PATHS.hairFrontHi, p.hairLight, 4, 0.55);
    ctx.restore();
    // 6. eyes (far then near), on top of the hair. Miss Chomp's whole body is
    // her head, so the gallery-only yaw candidate moves and foreshortens the
    // eye mask while leaving the wedge, hair and bow silhouette untouched.
    const faceYaw = Math.sin(Math.max(-65, Math.min(65, Number(pose.headTurn) || 0)) * Math.PI / 180);
    ctx.save();
    ctx.translate(faceYaw * 36, 0);
    ctx.translate(120, 0); ctx.scale(1 - Math.abs(faceYaw) * 0.16, 1); ctx.translate(-120, 0);
    for (const e of CHOMPO_EYES) chompoEye(ctx, p, e, bodyFill, lod, ex.blink, faceYaw * 8, ex.death || null);
    ctx.restore();
    // 7. bow (spec rotate(-8°) plus a small flutter so it isn't frozen)
    const flutter = (pose.kind === 'run' ? Math.sin(2 * ph) : Math.sin((pose.time || 0) * 2)) * 0.05;
    ctx.save();
    ctx.translate(130, 40); ctx.rotate(-8 * Math.PI / 180 + flutter); ctx.translate(-130, -40);
    specFill(ctx, CHOMPO_PATHS.bowL, p.a);
    specFill(ctx, CHOMPO_PATHS.bowR, p.a);
    specFill(ctx, CHOMPO_PATHS.bowShade, p.aDark, 0.4);
    dot(ctx, 130, 45, 9, p.aDark);
    ctx.restore();
  });
  ctx.restore(); // end walk bob

  ctx.restore(); // end squash-and-stretch
}

// Raymn's head, drawn about (hx, hy): an oversized, windswept parody quiff.
// Its broad silhouette is intentional — it must remain recognizable even in
// the menu parade. Split out of drawRay so face crops can show the head alone.
function drawRayHead(ctx, id, p, pose, u, ow, hx, hy, lod, run) {
  const hairFlop = Math.sin((pose.time || 0) * (run ? 8 : 2.5)) * 0.025 * u;
  outlined(ctx, p.s, ow, (c) => c.arc(hx, hy, 0.17 * u, 0, Math.PI * 2));
  outlined(ctx, p.a, ow, (c) => {
    c.moveTo(hx - 0.17 * u, hy - 0.02 * u);
    c.quadraticCurveTo(hx - 0.31 * u, hy - 0.09 * u, hx - 0.28 * u, hy + 0.13 * u + hairFlop);
    c.quadraticCurveTo(hx - 0.21 * u, hy + 0.03 * u + hairFlop, hx - 0.09 * u, hy - 0.34 * u);
    c.quadraticCurveTo(hx - 0.05 * u, hy - 0.38 * u, hx - 0.015 * u, hy - 0.17 * u);
    c.quadraticCurveTo(hx + 0.08 * u, hy - 0.31 * u, hx + 0.21 * u, hy - 0.29 * u);
    c.quadraticCurveTo(hx + 0.23 * u, hy - 0.23 * u, hx + 0.14 * u, hy - 0.16 * u);
    c.quadraticCurveTo(hx + 0.23 * u, hy - 0.1 * u, hx + 0.19 * u, hy - 0.025 * u + hairFlop * 0.3);
    c.quadraticCurveTo(hx + 0.02 * u, hy - 0.15 * u, hx - 0.18 * u, hy - 0.07 * u);
    c.closePath();
  });
  const ex = expressionFor(id, pose);
  const faceYaw = Math.sin(Math.max(-65, Math.min(65, Number(pose.headTurn) || 0)) * Math.PI / 180);
  const faceX = hx + (0.02 + faceYaw * 0.11) * u;
  ctx.save();
  ctx.translate(faceX, 0); ctx.scale(1 - Math.abs(faceYaw) * 0.16, 1); ctx.translate(-faceX, 0);
  drawEyes(ctx, p, u, faceX, hy - 0.01 * u, lod, ex);
  if (!lod) drawMouth(ctx, { mouth: 'smirk' }, p, u, faceX, hy + 0.08 * u, ow, ex);
  ctx.restore();
}

function drawRay(ctx, id, p, pose, u, ow, lod) {
  // The ray rig slides with the same POWER SLIDE the humanoids ship — the
  // slide painter has a floating-limb branch for him. Ability rolls do not
  // exist on this rig, so the slideStyle check is the whole dispatch.
  if (pose.kind === 'slide' && SLIDE_STYLE_DRAWS[pose.slideStyle]) {
    ctx.save();
    if (pose.slideStyle !== 'kick') slideStyleEntry(ctx, pose);
    SLIDE_STYLE_DRAWS[pose.slideStyle](ctx, id, TOON_SPECS[id] || {}, p, pose, u, ow, lod);
    ctx.restore();
    return;
  }
  const ph = (pose.phase || 0) * Math.PI * 2;
  const run = pose.kind === 'run';
  const slide = pose.kind === 'slide';
  const enhancedMotion = usesEnhancedLocomotion(pose);
  const jump = pose.kind === 'jump' && enhancedMotion;
  const airV = jump ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 460)) : 0;
  const airApex = jump ? 1 - Math.abs(airV) : 0;
  // Two distinct footfalls per cycle: each shoe travels backward along the
  // floor, then lifts and swings forward. The torso settles on contact.
  const footF = run ? floatingFoot(pose.phase || 0, 0.115 * u, 0.082 * u) : [0, 0];
  const footB = run ? floatingFoot((pose.phase || 0) + 0.5, 0.115 * u, 0.082 * u) : [0, 0];
  const bob = run ? -Math.abs(Math.sin(ph)) * 0.028 * u : 0;
  const cy = (slide ? -0.3 : -0.5) * u + bob - airApex * 0.03 * u;
  const handSwing = run ? Math.cos(ph) * 0.075 * u : jump ? 0.055 * u : 0;
  const handLift = run ? Math.sin(ph) * 0.035 * u : jump ? (0.045 + 0.035 * airApex) * u : 0;
  // Floating shoes—no connecting legs.
  const shoeSpread = slide && enhancedMotion ? 0.165 : 0.13;
  // Clinging: Raymn has no arms and no legs, so his grip is the gloves gathered
  // over the top of him and the shoes drawn up underneath — a swimmer's shape
  // with a pole through it. The body's own stretch and cant come from drawToon.
  const clingRay = clingAmount(pose);
  const shoeLift = (jump ? (0.09 + 0.07 * airApex) * u : 0) + clingRay * 0.13 * u;
  const clingSpread = 1 - 0.45 * clingRay;   // ankles draw together on the pole
  const backShoeX = -shoeSpread * clingSpread * u + footB[0], backShoeY = -0.04 * u + footB[1] - shoeLift;
  const frontShoeX = shoeSpread * clingSpread * u + footF[0], frontShoeY = -0.04 * u + footF[1] - shoeLift;
  // The one line of the humanoid limb spec that transfers to a rig with no
  // legs. Raymn cannot fold a knee, split a pelvis or lengthen a thigh, but he
  // already tilts his shoes — so that tilt becomes a real heel-strike and
  // toe-off curve instead of a raw sine, which is the same read the rest of
  // the cast now gets from locoFoot's third return. The PATH stays
  // floatingFoot: locoFoot changes speed abruptly at the toe-off, and on a
  // shoe with nothing attached to it that is a visible hitch.
  const rayL = run ? locoStyle(TOON_SPECS[id], pose) : null;
  // Each shoe rolls off its OWN phase here, where the shipped pair shared one
  // sine mirrored between them — two shoes half a cycle apart in space but
  // tilting as each other's reflection.
  const shoeRoll = (phase) => {
    const q = (phase % 1 + 1) % 1;
    if (q < rayL.contact) {
      const t = q / rayL.contact;
      return (-rayL.heel * (1 - t) + rayL.toe * t * t) * rayL.ankle;
    }
    const t = (q - rayL.contact) / (1 - rayL.contact);
    const e = t * t * (3 - 2 * t);
    return (rayL.toe * (1 - e * e) - rayL.heel * e * e) * rayL.ankle;
  };
  const backTilt = -0.08 + (rayL ? shoeRoll((pose.phase || 0) + 0.5) : -(run ? Math.sin(ph) * 0.1 : 0));
  const frontTilt = 0.08 + (rayL ? shoeRoll(pose.phase || 0) : (run ? Math.sin(ph) * 0.1 : 0));
  outlined(ctx, p.w, hair(0.5, ow * 0.55), (c) => c.ellipse(backShoeX - 0.015 * u, backShoeY - 0.04 * u, 0.07 * u, 0.04 * u, backTilt, 0, Math.PI * 2));
  outlined(ctx, p.f, ow, (c) => c.ellipse(backShoeX, backShoeY, 0.125 * u, 0.063 * u, backTilt, 0, Math.PI * 2));
  outlined(ctx, p.w, hair(0.5, ow * 0.55), (c) => c.ellipse(frontShoeX - 0.015 * u, frontShoeY - 0.04 * u, 0.07 * u, 0.04 * u, frontTilt, 0, Math.PI * 2));
  outlined(ctx, p.f, ow, (c) => c.ellipse(frontShoeX, frontShoeY, 0.125 * u, 0.063 * u, frontTilt, 0, Math.PI * 2));
  // Torso and scarf.
  outlined(ctx, p.b, ow, (c) => roundRectPath(c, -0.165 * u, cy - 0.2 * u, 0.33 * u, 0.4 * u, 0.09 * u));
  // Collar sits flush with the torso top — dropped even slightly, a band of
  // bare body shows above it and the scarf reads as a stripe, not a collar.
  outlined(ctx, p.m, ow, (c) => roundRectPath(c, -0.195 * u, cy - 0.225 * u, 0.39 * u, 0.07 * u, 0.03 * u));
  const scarfLag = run ? Math.sin(ph + 0.7) * 0.035 * u : 0;
  // Scarf tail: a pennant trailing back from the collar band. It has to stay
  // up at collar height and taper to a point — hung lower and blunt it reads
  // as a red sleeve reaching for the glove, and Raymn has no arms.
  ctx.fillStyle = p.m; ctx.beginPath(); ctx.moveTo(-0.14 * u, cy - 0.245 * u); ctx.quadraticCurveTo(-0.3 * u, cy - 0.225 * u + scarfLag, -0.37 * u, cy - 0.17 * u + scarfLag); ctx.lineTo(-0.14 * u, cy - 0.14 * u); ctx.fill();
  drawRayHead(ctx, id, p, pose, u, ow, 0, cy - 0.35 * u, lod, run);
  // Floating gloves—hide the throwing glove until it returns.
  const handY = cy + (slide && enhancedMotion ? 0.085 : jump ? -0.11 : 0.02) * u;
  const handOut = slide && enhancedMotion ? 0.34 : 0.29;
  const cheer = pose.kind === 'celebrate';
  const gloveStudy = cheer && usesReworkedCelebration(pose);
  if (gloveStudy) {
    const gm = celebrateMotion(id, pose.time || 0, true);
    const smooth = (v) => {
      const n = Math.max(0, Math.min(1, v));
      return n * n * (3 - 2 * n);
    };
    const blend = (a, b, v) => a.map((n, i) => n + (b[i] - n) * v);
    const restL = [-0.29 * u, cy - 0.24 * u, -0.12];
    const restR = [0.29 * u, cy - 0.24 * u, 0.12];
    // Centres sit just under one glove-width apart, so the palms visibly meet
    // without becoming one white blob.
    const meetL = [-0.095 * u, cy - 0.69 * u, 0.48];
    const meetR = [0.095 * u, cy - 0.69 * u, -0.48];
    const finishL = [-0.27 * u, cy - 0.63 * u, -0.12];
    const finishR = [0.3 * u, cy - 0.18 * u, 0.12];
    const c = gm.cycle;
    let left, right;
    if (c < 0.18) {
      const v = smooth(c / 0.18);
      left = blend(restL, meetL, v); right = blend(restR, meetR, v);
    } else if (c < 0.36) {
      left = meetL; right = meetR;
    } else if (c < 0.5) {
      const v = smooth((c - 0.36) / 0.14);
      left = blend(meetL, finishL, v); right = blend(meetR, finishR, v);
    } else if (c < 0.82) {
      left = finishL; right = finishR;
    } else {
      const v = smooth((c - 0.82) / 0.18);
      left = blend(finishL, restL, v); right = blend(finishR, restR, v);
    }
    outlined(ctx, p.w, ow, (path) => path.ellipse(left[0], left[1], 0.105 * u, 0.095 * u, left[2], 0, Math.PI * 2));
    outlined(ctx, p.w, ow, (path) => path.ellipse(right[0], right[1], 0.105 * u, 0.095 * u, right[2], 0, Math.PI * 2));
    const impact = Math.max(0, 1 - Math.abs(c - 0.27) / 0.09);
    if (impact > 0 && !lod) {
      const iy = cy - 0.69 * u;
      ctx.save();
      ctx.globalAlpha *= impact;
      ctx.strokeStyle = '#f6d33c'; ctx.lineWidth = hair(0.6, ow * 0.8);
      ctx.beginPath();
      for (const a of [-Math.PI / 2, -0.35, Math.PI + 0.35]) {
        ctx.moveTo(Math.cos(a) * 0.03 * u, iy + Math.sin(a) * 0.03 * u);
        ctx.lineTo(Math.cos(a) * 0.1 * u, iy + Math.sin(a) * 0.1 * u);
      }
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // Shipped celebration: both gloves rise and the front one waves.
    const backHandY = cheer ? cy - 0.5 * u : handY + handLift;
    // THE GRIP, and it is the humanoid's, not a special case: the pole-side
    // glove goes out and closes on the column while the other hand and the rest
    // of the figure carry on exactly as they were. An unattached hand is still a
    // hand — it can take hold of a stick, and once it has, the body hanging
    // under it reads the same way everyone else's does. What he cannot do is
    // bend an elbow, so the only thing to decide is where the glove lands: on
    // the column, a little above his own head, which is where an arm at
    // comfortable reach would put it.
    if (clingRay > 0 && !cheer && !pose.headless) {
      const gripX = CLING_POLE_X * u, gripY = cy - 0.58 * u;
      const fx = handOut * u + handSwing, fy = handY - handLift;
      outlined(ctx, p.w, ow, (c) => c.ellipse(-handOut * u - handSwing, backHandY, 0.105 * u, 0.095 * u, -0.12, 0, Math.PI * 2));
      outlined(ctx, p.w, ow, (c) => c.ellipse(
        fx + (gripX - fx) * clingRay, fy + (gripY - fy) * clingRay,
        0.105 * u, 0.095 * u, 0.12, 0, Math.PI * 2));
    } else {
    outlined(ctx, p.w, ow, (c) => c.ellipse(-handOut * u - handSwing, backHandY, 0.105 * u, 0.095 * u, -0.12, 0, Math.PI * 2));
    if (cheer) {
      const waveX = Math.sin((pose.time || 0) * 8) * 0.1 * u;
      outlined(ctx, p.w, ow, (c) => c.ellipse(0.28 * u + waveX, cy - 0.62 * u, 0.105 * u, 0.095 * u, 0.12, 0, Math.PI * 2));
    } else if (!pose.headless) outlined(ctx, p.w, ow, (c) => c.ellipse(handOut * u + handSwing, handY - handLift, 0.105 * u, 0.095 * u, 0.12, 0, Math.PI * 2));
    else if (pose.menu && !pose.fistThrown) {
      const orbit = (pose.time || 0) * 8;
      outlined(ctx, p.w, ow, (c) => c.arc(0.5 * u + Math.sin(orbit) * 0.08 * u, handY - 0.16 * u - Math.abs(Math.cos(orbit)) * 0.08 * u, 0.105 * u, 0, Math.PI * 2));
    }
    }
  }
}

// ------------------------------------------------- thrown-ability projectiles
// The in-flight fist and axe reuse the on-body art — same palette, same
// two-pass outline — so the weapon stays the same object once it leaves the
// hero instead of morphing into a generic projectile.
export function drawRocketFist(ctx, x, y, t, returning = false, scale = 1) {
  const p = pal('raymn');
  const u = 40 * scale;
  const prevInkScale = inkScale;
  inkScale = drawScale(ctx);
  const ow = hair(0.5, contour(0.016 * u));
  ctx.save();
  ctx.translate(x, y);
  if (returning) ctx.scale(-1, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // a flicker of rocket exhaust off the wrist
  const flick = 1 + 0.35 * Math.sin((t || 0) * 40);
  outlined(ctx, p.f, hair(0.4, ow * 0.5), (c) => {
    c.moveTo(-0.09 * u, -0.045 * u);
    c.lineTo(-0.2 * u * flick, 0);
    c.lineTo(-0.09 * u, 0.045 * u);
    c.closePath();
  });
  // the glove itself: the same ellipse the ray rig wears on the body
  outlined(ctx, p.w, ow, (c) => c.ellipse(0, 0, 0.105 * u, 0.095 * u, 0.12, 0, Math.PI * 2));
  ctx.restore();
  inkScale = prevInkScale;
}

export function drawThrownAxe(ctx, x, y, rot, scale = 1) {
  const p = pal('grumpos');
  const u = 24 * scale;
  const prevInkScale = inkScale;
  inkScale = drawScale(ctx);
  const ow = hair(0.5, contour(0.03 * u));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot || 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // the shoulder axe's handle and blade, re-centered on its spin axis
  limb(ctx, 0.26 * u, 0.41 * u, -0.13 * u, -0.24 * u, 0.06 * u, p.w, ow);
  outlined(ctx, '#b8d8f0', ow, (c) => {
    c.moveTo(-0.14 * u, -0.36 * u);
    c.quadraticCurveTo(-0.34 * u, -0.22 * u, -0.21 * u, -0.03 * u);
    c.lineTo(-0.07 * u, -0.1 * u);
    c.lineTo(-0.04 * u, -0.31 * u);
    c.closePath();
  });
  ctx.strokeStyle = '#eaf8ff';
  ctx.lineWidth = hair(0.6, ow * 0.55);
  ctx.beginPath();
  ctx.moveTo(-0.24 * u, -0.22 * u);
  ctx.lineTo(-0.1 * u, -0.16 * u);
  ctx.stroke();
  ctx.restore();
  inkScale = prevInkScale;
}

// ------------------------------------------- ranged moves (bow shipped; rest lab)
// `spec.ranged` names the prop. FERNWICK'S BOW SHIPPED 6 Sep 2026 and is set
// on her TOON_SPECS row; the other props are still candidates that the
// gallery hands in through drawToon's opts.spec seam the way hero candidates
// do (see src/dev/ranged-candidates.js). Each candidate is one PROP drawn at the hand
// while the hero aims, and the SAME prop as a projectile once it has left,
// so held and thrown are one object by construction (the lesson the bamboo
// stick recorded). Gestures: 'draw' (bow, slingshot), 'hose'; everything
// else throws with the shipped overarm / flick and only adds the prop.
//
// The winner wires into HEROES (ability type), run.js (flight), poseFromPlayer
// and this file's production branches; the table comes out with the section.
const RANGED_GESTURES = { bow: 'draw', sling: 'draw', hose: 'hose' };
// Where in the 0.3s aim the projectile leaves. Throws release at the end of
// the shipped whip (0.56); the draw lets go a hair earlier, and the hose is a
// stream, so it never "releases" at all.
const RANGED_RELEASE = 0.5;
// Round 2 — the draw, four ways. `anchor` is the string hand at full draw in
// u off the near shoulder; `bowFrom` is where the bow hand starts (null =
// already out); `pullFrac` is how much of the pre-release window the pull
// itself takes, the rest being the hold at full draw that reads as aiming.
const BOW_STYLES = {
  level: { release: 0.5, pullFrac: 0.8, anchor: [-0.04, -0.08], bowFrom: null, cant: 0 },
  // B2 anchors at MID CHEST, not the jaw (Peter: "it is coming from his
  // chin"), and the bow hand settles level with that anchor so the arrow
  // stays flat; it starts high and scissors down onto the line.
  // Anchor a hair BEHIND the shoulder line: with the hand forward of it the
  // two-bone IK's back solution drops the elbow to the hip; behind, it comes
  // up level, which is where a drawing elbow is.
  // The bow hand rests HIGHER than the anchor, so the shaft points slightly
  // up rather than dead level — a flat arrow reads as a stick laid across him,
  // and a real shot at any range leaves on a rise. The anchor also drops: at
  // shoulder height the elbow came out above the hand, which is the pose of
  // someone shrugging rather than pulling.
  // `release` 0.33 of the 0.3s draw, not 0.5: the loose lands 0.10s in
  // rather than 0.15s, which is the other half of the timing trim. pullFrac 1
  // still spends the whole pre-release window pulling, so the draw is
  // continuous — it is a SHORTER draw, not a rushed one with a hold on it.
  high: { release: 0.33, pullFrac: 1, anchor: [-0.09, 0.072], bowRest: [0.37, -0.005], bowFrom: [0.27, -0.24], cant: 0 },
  canted: { release: 0.5, pullFrac: 0.8, anchor: [-0.02, -0.04], bowFrom: null, cant: 0.45 },
  snap: { release: 0.36, pullFrac: 0.9, anchor: [0.1, -0.06], bowFrom: null, cant: 0.15 },
};
export const RANGED_RELEASE_AT = { draw: 0.5, toss: 0.56, hose: 0.12 };
// The draw's 0.3s aim is followed by a LOWER: the bow stays in his hand and
// both arms ease down to a carry over this long. Without it the bow vanished
// on the frame the aim ended, which is the one thing a held object cannot do.
// A hero row for the bow sets powerPoseT to 0.3 + this.
// THE ARROW'S ARC, in world px and seconds after release: a short rise, over
// the top, then down — alt = a*t - b*t^2 on top of the release height, at a
// relative speed of v. Flat from a chest-high release it sailed over a 10px
// box without touching it. Shared by run.js and the gallery lane.
// b was 175: that grounded the arrow at 0.44s, a hair before the beat
// cabinet's box at the fastest lane. 150 keeps it up to 0.50s and still puts
// it in a 10px crate 96px out (see the gallery lane).
export const ARROW_ARC = { a: 52.5, b: 150, v: 240 };
// ON A BEAT CABINET THE ARROW HURRIES. It leaves 0.3s after the press, and at
// its ordinary 240px/s that plus the flight to a card box 1.5 beats out is
// 0.89 of a beat at the fastest lane — over the line with a late press, and
// into the ground first. At this relative speed it is 0.76 (0.94 pressed
// late), inside the beat, and still in the air when it gets there. Same
// device as BOX_SHOT_MIN_SPEED for Kiko's shot: the round is quicker there,
// and nothing else about it changes.
export const ARROW_BOX_SPEED = 400;
export const BOW_LOWER_T = 0.35;
// ...and then a SLING: the bow hand swings the bow up and back over the
// shoulder onto the spot the slung bow occupies, so the moment it stops being
// held and starts being worn is a small step, not a cut. Before this the bow
// vanished from his hand and appeared on his back on one frame.
export const BOW_SLING_T = 0.25;
// ...and before all of it a REACH: the far hand goes back behind the body to
// where the bow is worn, takes it, and brings it round. The bow is painted
// BEHIND the torso while the hand is behind the body and in front once it
// has come round (see propBehind), so it never pops from one depth to the
// other. The whole thing is one continuous handling of one object.
// 0.08, not the 0.15 it was drawn at. The reach plus the first half of the
// draw is DEAD TIME the player pays before anything leaves, and at 0.15 the
// arrow reached a target 160px out in 0.58s — a tenth of a second slower than
// the slowest weapon in the cast (Kiko), which is a lot of lead to ask for on
// a free-running stage. Trimmed here and at the release below it comes to
// 0.46s, between the fist and the warning shot. Everything about the pose
// survives: the reach is a snatch rather than a lift, and the draw's own
// clock is untouched.
export const BOW_REACH_T = 0.08;
export const BOW_AIM_T = BOW_REACH_T + 0.3 + BOW_LOWER_T + BOW_SLING_T;
const bowReachQ = (pose) => (pose.actionTime == null ? 1
  : Math.max(0, Math.min(1, Number(pose.actionTime) / BOW_REACH_T)));
// The 0.3s draw clock, offset by the reach.
const bowDrawQ = (pose) => (pose.actionTime == null ? 0.62
  : Math.max(0, Math.min(1, (Number(pose.actionTime) - BOW_REACH_T) / 0.3)));
const bowLowerQ = (pose) => (pose.actionTime == null ? 0
  : Math.max(0, Math.min(1, (Number(pose.actionTime) - BOW_REACH_T - 0.3) / BOW_LOWER_T)));
const bowSlingQ = (pose) => (pose.actionTime == null ? 0
  : Math.max(0, Math.min(1, (Number(pose.actionTime) - BOW_REACH_T - 0.3 - BOW_LOWER_T) / BOW_SLING_T)));
// Where the slung bow sits, relative to the torso: shared by the back-pass
// painter and the sling's hand target, so the swing ends exactly where the
// worn bow begins.
const BOW_SLUNG_AXIS = Math.PI + 0.38;
const bowSlungAt = (torsoHalf, shoulderY, u) => [-torsoHalf - 0.02 * u, shoulderY + 0.1 * u];
export const BOW_RELEASE_AT = (style) => (BOW_STYLES[style] || BOW_STYLES.level).release;

// ---- THE WORN WRENCH (lab) ------------------------------------------------
// Where Lorenzo's wrench lives when he is not using it. Today it does not live
// anywhere: it is painted only while the arm is swinging it (wrenchAngle) or
// while the throw holds it, so it flashes into an empty hand and out again —
// the one thing a real object cannot do, and the same fault the bow had before
// its reach landed. `spec.wrenchCarry` is that fix, built the way the bow's
// was: a WORN piece on the body, a REACH that takes it, and a depth flip so it
// never pops from one side of the torso to the other.
//
// Five carries, and the question each asks:
//   hip      near hip, head up out of the belt — cheapest; the near arm swings
//            past it every stride, which is the risk
//   backHip  behind him on the far hip, a back-pass piece under every limb —
//            the fetch has real travel, the way the bow's does
//   bib      chest pocket — most visible at hero size, shortest fetch, and the
//            least plumberly place to keep a pipe wrench
//   loop     hanging head-down off a belt loop, swinging on the stride clock
//   twin     `hip`, but he carries two: the belt keeps one while one is in the
//            air, so the silhouette never loses the tool
export const WRENCH_CARRIES = ['hip', 'backHip', 'bib', 'loop', 'twin'];
// The same snatch the bow pays (BOW_REACH_T) — dead time before anything
// leaves his hand, and the reason that number is 0.08 and not 0.15 is written
// up there. The stow is the catch at the far end of the return flight.
export const WRENCH_REACH_T = 0.08;
export const WRENCH_STOW_T = 0.22;
const wrenchReachQ = (pose) => (pose.actionTime == null ? 1
  : Math.max(0, Math.min(1, Number(pose.actionTime) / WRENCH_REACH_T)));
// ONE belt line, quoted once. The field-gear block and the carry anchor below
// both need it and they are 400 lines apart; two copies of this expression is
// how a tucked tool ends up floating a hair off the leather it is tucked into.
const beltLineY = (spec, hipY, bob, u) => hipY - (0.085 - (spec.beltDrop || 0)) * u + bob;
// Where the worn wrench sits, in the torso's own frame — bowSlungAt, for a
// belt. Shared by the painter and by the reach's hand target, so the hand
// arrives exactly where the tool is rather than near it.
// The rig faces +x and wears its kit at -x (see the quiver and the slung bow),
// so `back` here is -x and `front` is +x. drawWrench's origin is the handle
// butt with the head out along +x, hence an angle near -PI/2 for head-up.
function wrenchCarryAt(spec, u, g) {
  const { torsoCx, torsoHalf, torsoTop, hipY, bob, run, phase } = g;
  const beltY = beltLineY(spec, hipY, bob, u);
  // ONE SIZE. The worn wrench is drawn at very nearly the size of the thrown
  // one, because it is the same object — at 0.6 it popped to full scale on the
  // frame his hand closed on it, which is the pop this whole seam exists to
  // remove. A torso is only ~0.23u from collar to belt and the tool is 0.34u,
  // so it does not FIT standing on the body: the tucked carries hide the
  // difference the way a real tuck does, by clipping everything below the belt
  // (or the pocket) away. `clipBelow` is that cut, and the belt is re-stroked
  // over it so the cut lands under leather.
  const SC = 0.85;
  switch (spec.wrenchCarry) {
    case 'bib': {
      // Low on the chest, not high: a pocket at collar height puts the jaw over
      // his shoulder line, where it fights the cap and the mustache for the
      // only part of the silhouette that carries his read.
      // ...and this is the ONE cut that cannot keep SC. The jaw is 0.22u across
      // at full size and the whole chest is 0.4u: worn there at the size he
      // throws it, the tool is a grey slab from strap to strap. Shrunk to 0.55
      // it reads as a wrench in a pocket and pops when he grabs it — which is
      // the trade this option is actually offering, so it is drawn honestly
      // rather than hidden.
      const pocketY = beltY - 0.075 * u;
      return { x: torsoCx + torsoHalf * 0.34, y: pocketY + 0.115 * u, ang: -1.5,
        scale: 0.55, behind: false, pocket: pocketY, clipBelow: pocketY + 0.008 * u };
    }
    case 'backHip':
      // Proud of his back the way the quiver is proud of Fernwick's: worn kit
      // that never clears the silhouette is not worn, it is printed on. Nothing
      // is clipped — behind him the whole tool is the point.
      return { x: torsoCx - torsoHalf, y: beltY + 0.14 * u, ang: -1.95,
        scale: SC, behind: true };
    case 'loop': {
      // A hanging tool is a pendulum, and the stride is what swings it. Off the
      // run's own phase rather than a free clock, so it is in time with the
      // legs that are throwing it about.
      const swing = run ? Math.sin((phase || 0) * Math.PI * 2 - 0.6) * 0.17 : 0;
      return { x: torsoCx - torsoHalf * 0.86, y: beltY + 0.02 * u, ang: 1.5 + swing,
        scale: 0.75, behind: false, loop: true };
    }
    default: // 'hip' and 'twin'
      // Nearly upright, butt well below the belt and cut off at it: what shows
      // is the jaw and a hand's width of shaft, which is what a tucked tool
      // shows. The belt paints over the cut, so the crossing IS the tuck.
      return { x: torsoCx - torsoHalf * 0.78, y: beltY + 0.245 * u, ang: -1.36,
        scale: SC, behind: false, clipBelow: beltY + 0.02 * u };
  }
}
// The worn wrench and its mount. The tool is drawWrench at a smaller u — the
// same steel and the same jaw, so what is on the belt is visibly the thing he
// throws — plus whatever holds it there.
function drawWornWrench(ctx, spec, p, u, ow, at) {
  // The tool first, cut off at whatever it is tucked into — then the mount over
  // the cut, so the join is covered rather than drawn.
  ctx.save();
  if (at.clipBelow != null) {
    ctx.beginPath();
    ctx.rect(at.x - 0.6 * u, at.y - 1.2 * u, 1.2 * u, at.clipBelow - (at.y - 1.2 * u));
    ctx.clip();
  }
  drawWrench(ctx, at.x, at.y, at.ang, u * at.scale, ow * at.scale);
  ctx.restore();
  if (at.pocket != null) {
    // A breast pocket in the trouser blue, so pocket and overalls are one
    // garment the way the bib is. Drawn AFTER the tool: the pocket is in front
    // of what is in it.
    const w = 0.15 * u, h = 0.09 * u;
    ctx.save();
    ctx.fillStyle = p.p;
    ctx.beginPath(); roundRectPath(ctx, at.x - w * 0.5, at.pocket, w, h, h * 0.22); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = hair(0.4, ow * 0.5); ctx.stroke();
    ctx.restore();
  }
  if (at.loop) {
    // The loop itself, over the shaft — otherwise the wrench reads as stuck
    // through the trouser rather than hung off the belt.
    ctx.save();
    ctx.strokeStyle = p.m; ctx.lineWidth = hair(0.6, 0.02 * u); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(at.x, at.y, 0.035 * u, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  }
}

// Every prop is drawn in its OWN frame: origin at the hand (or the flight
// centre), +x forward along travel, in u. `p` is the hero's palette so the
// wood and brass come off the costume, never a hex invented for the prop.
const WOOD = '#8a5a2c', WOOD_HI = '#c8925a', STEEL = '#a8b0b8', STEEL_HI = '#e5edf2';
// The gold is DEEPER than his hair (p.a #e8bc46) on purpose: at the first
// pass's lemon the wraps read as a blond streak lying across the bow, because
// they were within a few points of the fringe right beside them. An amber gold
// with a brown lean is still obviously gold and is nobody's hair.
const BOW_WOOD = '#e08a3c', BOW_HI = '#f0a75a', BOW_INK = '#6a3a18', BOW_GOLD = '#cf8f1e', BOW_STRING = '#8fd0ee';
// The vanes and head are a DARK variant of his tunic green (#65b83f), which
// is what keeps them his without vanishing into the sleeve they cross.
const ARROW_DRAW_LEN = 0.727;
const ARROW_SHAFT = '#e8b856', ARROW_FLETCH = '#3a8a2b', ARROW_HEAD = '#65b83f', ARROW_RIB = '#cdeba4', ARROW_NOCK = '#24501c';
// Where the last drawn bow would loose its arrow, in the toon's own frame
// (feet at the origin, pixels): the gallery reads it after drawing the hero,
// so a released arrow starts in front of the bow rather than at a guess.
export const RANGED_RELEASE_POINT = { x: 0, y: 0, ang: 0, set: false };
function rangedArt(ctx, kind, u, ow, p, o = {}) {
  const q = o.q == null ? 1 : o.q;
  switch (kind) {
    case 'bow': {
      // The bow is drawn in the DRAW LINE's frame: +x runs from the bow hand
      // toward the string hand (o.pull), so the arrow lies along x and the bow
      // stands across it; `o.cant` then leans the whole thing. Gripped on the
      // BELLY — the arc passes through the origin — rather than held off to
      // one side, which read as a hoop hanging from his wrist.
      //
      // COLOURS are the reference's, not the costume's: an orange bow with
      // gold wraps, a pale string. The first cut used his belt leather and
      // the tunic green for the fletching, and both vanished into him.
      const pull = o.pull || [-0.3 * u, 0];
      // `o.axis` is the direction the string hand WOULD be in, for a bow that
      // is not being drawn (carried, or slung on the back): it replaces the
      // draw line, which has no meaning without a hand on the string.
      const dAng = o.axis != null ? o.axis : Math.atan2(pull[1], pull[0]);
      const dist = Math.hypot(pull[0], pull[1]);
      ctx.save();
      ctx.rotate(dAng + Math.PI); // +x now points AWAY from the string hand
      ctx.rotate(o.cant || 0);
      // THE THREE DIALS the size bake-off turns: the limb's gauge, the head's
      // scale and the vanes'. Each defaults to 1, so a production caller that
      // passes none draws exactly the shipped bow.
      const gauge = o.gauge || 1;
      const half = 0.3 * u;    // half the bow's height
      const belly = 0.13 * u;  // how far the grip stands proud of the tip line
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // ONE SIMPLE ARC, not a recurve. The reference bow is a single C with
      // the grip at its apex and the tips swept back toward the archer; the
      // recurve's hooked ends were four changes of direction inside fourteen
      // pixels and came out as a squiggle.
      //
      // Drawn as a FILLED taper rather than a stroke, because the arc's whole
      // character is that it is stout at the grip and slim at the tips — a
      // constant-width stroke reads as bent wire. The curve is sampled, each
      // sample offset along its own normal by a half-width that falls off
      // toward the ends, and the two sides joined into one closed shape.
      const tipX = -belly, ctlX = belly; // apex of the quadratic lands at x=0
      const at = (t) => {
        const mt = 1 - t;
        return [mt * mt * tipX + 2 * mt * t * ctlX + t * t * tipX,
          mt * mt * -half + t * t * half];
      };
      const N = 14;
      // 0.85 of the first pass, chosen in the size bake-off. Baked in rather
      // than left as a multiplier so the dial still means "1 = what ships".
      const halfW = (t) => (0.017 + 0.0212 * Math.sin(Math.PI * t)) * u * gauge; // slim ends, stout middle
      const side = (sign) => (c) => {
        for (let i = 0; i <= N; i++) {
          const t = i / N, [x, y] = at(t);
          const [x2, y2] = at(Math.min(1, t + 0.001));
          const [x0, y0] = at(Math.max(0, t - 0.001));
          const dx = x2 - x0, dy = y2 - y0, d = Math.hypot(dx, dy) || 1;
          const px = x + sign * (dy / d) * halfW(t), py = y - sign * (dx / d) * halfW(t);
          c[i ? 'lineTo' : 'moveTo'](px, py);
        }
      };
      outlined(ctx, BOW_WOOD, hair(0.5, ow * 0.8), (c) => {
        side(1)(c);
        for (let i = N; i >= 0; i--) {
          const t = i / N, [x, y] = at(t);
          const [x2, y2] = at(Math.min(1, t + 0.001));
          const [x0, y0] = at(Math.max(0, t - 0.001));
          const dx = x2 - x0, dy = y2 - y0, d = Math.hypot(dx, dy) || 1;
          c.lineTo(x - (dy / d) * halfW(t), y + (dx / d) * halfW(t));
        }
        c.closePath();
      }, BOW_INK);
      // The lit edge runs along the BACK of the arc (the target side), which
      // is the one face a light above and in front of him actually reaches.
      ctx.strokeStyle = BOW_HI; ctx.lineWidth = 0.016 * u;
      ctx.beginPath();
      for (let i = 2; i <= N - 2; i++) {
        const t = i / N, [x, y] = at(t);
        const [x2, y2] = at(Math.min(1, t + 0.001));
        const [x0, y0] = at(Math.max(0, t - 0.001));
        const dx = x2 - x0, dy = y2 - y0, d = Math.hypot(dx, dy) || 1;
        const px = x + (dy / d) * halfW(t) * 0.45, py = y - (dx / d) * halfW(t) * 0.45;
        ctx[i === 2 ? 'moveTo' : 'lineTo'](px, py);
      }
      ctx.stroke();
      // NO grip wrap. It sat at the apex, which is exactly where the bow hand
      // is, so the two stacked into one hand-sized round — the "second hand"
      // again, in its last hiding place. The hand alone says where he holds it.
      // The limb bands stay: they are the reference's, and they are nowhere
      // near anything else.
      ctx.strokeStyle = BOW_GOLD;
      ctx.lineWidth = 0.0145 * u * gauge;
      for (const sg of [-1, 1]) {
        const t = sg < 0 ? 0.14 : 0.86, [bx, by] = at(t);
        const [x2, y2] = at(t + 0.001), [x0, y0] = at(t - 0.001);
        const dx = x2 - x0, dy = y2 - y0, d = Math.hypot(dx, dy) || 1;
        const w = halfW(t) * 0.95; // inside the limb, never poking past its edge
        ctx.beginPath();
        ctx.moveTo(bx + (dy / d) * w, by - (dx / d) * w);
        ctx.lineTo(bx - (dy / d) * w, by + (dx / d) * w);
        ctx.stroke();
      }
      // String: tip to tip, through the string hand when there is one.
      const tipY = half;
      // TAUT AGAIN THE MOMENT HE LOOSES. The string was drawn to the string
      // hand no matter what, so after the release it stayed bent around a hand
      // that was no longer holding it — the bow read as still drawn while the
      // arrow was already gone. Only a NOCKED string follows the hand.
      ctx.strokeStyle = BOW_STRING; ctx.lineWidth = hair(0.7, 0.018 * u);
      ctx.beginPath(); ctx.moveTo(tipX, -tipY);
      if (o.pull && o.nocked) ctx.lineTo(-dist * (o.cant ? Math.cos(o.cant) : 1), dist * Math.sin(o.cant || 0));
      else ctx.lineTo(tipX * 0.6, 0);
      ctx.lineTo(tipX, tipY); ctx.stroke();
      // Nocks: a gold cap at each tip.
      dot(ctx, tipX, -tipY, 0.0205 * u * gauge, BOW_GOLD);
      dot(ctx, tipX, tipY, 0.0205 * u * gauge, BOW_GOLD);
      ctx.restore();
      if (o.pull && o.nocked) {
        // The arrow, nock at the string hand, along the draw line, its head
        // clear past the bow.
        ctx.save();
        ctx.translate(pull[0], pull[1]);
        ctx.rotate(dAng + Math.PI);
        // BEHIND the hand, not starting at it: the string hand grips the shaft
        // just ahead of the nock, so drawn from the hand the vanes landed on
        // top of the glove and the arrow looked stuck to it.
        // Just INSIDE the hand's edge (the glove is ~0.042u across), so the
        // fingers read as pinching the nock rather than a fist wrapped round
        // the shaft with the feathers sticking out the back.
        const behind = 0.03 * u;
        ctx.translate(-behind, 0);
        // AN ARROW IS A FIXED LENGTH. Drawn as `dist + a margin` it grew as he
        // pulled — the head stayed a constant distance past the bow and the
        // shaft stretched, which is the one thing a stick cannot do. Held
        // constant, the nock rides the string hand and the HEAD travels back
        // toward the bow as the draw deepens, which is what a draw looks like.
        // The value is measured: the pull runs 0.24u to 0.60u (see the style
        // table), so this puts the point a little past the bow at full draw
        // and well out in front of it at the nock.
        rangedArt(ctx, 'arrow', u, ow, p, { len: ARROW_DRAW_LEN * u, headScale: o.headScale, vaneScale: o.vaneScale });
        ctx.restore();
      }
      return;
    }
    case 'arrow': {
      // Gold shaft, DARK GREEN vanes and head off his tunic's own family, and
      // a leaf for a point — the hero of thyme's arrow. Dark rather than the
      // tunic's mid green: at the same value the fletching disappeared into
      // his sleeve, which is the note that started this round.
      const L = o.len || 0.44 * u;
      const vs = o.vaneScale || 1;
      const xB = 0.004 * u, xF = 0.15 * u * vs, vw = 0.06 * u * vs;
      // The shaft ENDS where the feathers do. It used to start at the arrow's
      // origin with a round cap, so a stub of bare gold poked out behind the
      // fletch — a nock that is not there any more. Butt cap, started on the
      // fletch's own back edge, and the two finish flush.
      // ONE fletch, notched at the back and SPLIT down the middle by the
      // shaft showing through it. Three loose carets read as three pieces; two
      // separate vanes read as two. A single shape with a line through it is
      // the one arrangement that is unmistakably one object with two halves,
      // which is what fletching looks like from the side.
      outlined(ctx, ARROW_FLETCH, hair(0.4, ow * 0.45), (c) => {
        c.moveTo(xF, 0);
        c.lineTo(xF - 0.055 * u * vs, -vw);
        c.lineTo(xB, -vw);
        c.lineTo(xB + 0.045 * u * vs, 0);
        c.lineTo(xB, vw);
        c.lineTo(xF - 0.055 * u * vs, vw);
        c.closePath();
      });
      // THE SHAFT RUNS THROUGH THE FEATHERS. Painted after the fletch, at
      // full width, from the fletch's back edge to the head — so it is also
      // the line that splits the feather in two, rather than a thinner second
      // stroke pretending to be the shaft. Butt cap at the back, flush with
      // the feathers.
      ctx.lineCap = 'butt';
      limb(ctx, xB, 0, L, 0, 0.03 * u, ARROW_SHAFT, ow * 0.6);
      ctx.lineCap = 'round';
      // NO nock stub. A cross-piece on the string side was one more small
      // mark in the busiest part of the drawing, and at size it read as an
      // unexplained green tick rather than as the end of an arrow.
      // A LEAF for a head, near equilateral — as wide as it is long. The first
      // cut was a long thin blade and read as a dart.
      // WIDER than it is long. It sits out past the bow with nothing of his
      // body behind it, so it can take the tunic's own green — the value that
      // was unusable on the vanes, which cross his sleeve.
      // 1.2 of the sweep's middle, chosen off the size bake-off, baked in so
      // the dial keeps meaning "1 = what ships".
      const hs = o.headScale || 1;
      const hx0 = L - 0.03 * u * hs, hx1 = L + 0.168 * u * hs, lw = 0.126 * u * hs;
      // POINTIER: a cubic whose second control sits close to the axis just
      // short of the tip, so the belly stays full and the point comes to an
      // angle. The quadratic's tip was as round as its shoulders.
      outlined(ctx, ARROW_HEAD, hair(0.4, ow * 0.5), (c) => {
        c.moveTo(hx0, 0);
        c.bezierCurveTo(hx0 + 0.03 * u * hs, -lw, hx1 - 0.045 * u * hs, -lw * 0.42, hx1, 0);
        c.bezierCurveTo(hx1 - 0.045 * u * hs, lw * 0.42, hx0 + 0.03 * u * hs, lw, hx0, 0);
        c.closePath();
      });
      ctx.strokeStyle = ARROW_RIB; ctx.lineWidth = hair(0.5, 0.013 * u);
      ctx.beginPath(); ctx.moveTo(hx0 + 0.025 * u * hs, 0); ctx.lineTo(hx1 - 0.035 * u * hs, 0); ctx.stroke();
      return;
    }
    case 'boomerang': {
      // A bent wing, gold-tipped: two round-capped strokes off one elbow.
      const a = 0.21 * u;
      for (const [w, col] of [[0.075 * u + ow * 2, OUTLINE], [0.075 * u, WOOD]]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-a * 0.9, a * 0.55); ctx.lineTo(0, 0); ctx.lineTo(a, 0.1 * a); ctx.stroke();
      }
      ctx.fillStyle = p.a || '#e8bc46';
      dot(ctx, -a * 0.9, a * 0.55, 0.045 * u, p.a || '#e8bc46');
      dot(ctx, a, 0.1 * a, 0.045 * u, p.a || '#e8bc46');
      return;
    }
    case 'shield': {
      // The same round shield he carries on his back (see drawCelShield).
      outlined(ctx, p.w, ow, (c) => c.arc(0, 0, 0.15 * u, 0, Math.PI * 2));
      outlined(ctx, p.a, hair(0.5, ow * 0.65), (c) => c.arc(0, 0, 0.095 * u, 0, Math.PI * 2));
      dot(ctx, 0, 0, 0.035 * u, OUTLINE);
      return;
    }
    case 'sling': {
      // Y-fork: handle down, two prongs up, band to the pouch when pulled.
      const h = 0.14 * u;
      limb(ctx, 0, 0.02 * u, 0, -h, 0.05 * u, WOOD, ow * 0.7);
      limb(ctx, 0, -h, -0.07 * u, -h - 0.13 * u, 0.045 * u, WOOD, ow * 0.7);
      limb(ctx, 0, -h, 0.07 * u, -h - 0.13 * u, 0.045 * u, WOOD, ow * 0.7);
      ctx.strokeStyle = '#3a2a2a'; ctx.lineWidth = hair(0.6, 0.02 * u);
      ctx.beginPath();
      ctx.moveTo(-0.07 * u, -h - 0.13 * u);
      if (o.pull) ctx.lineTo(o.pull[0], o.pull[1]); else ctx.lineTo(0, -h - 0.08 * u);
      ctx.lineTo(0.07 * u, -h - 0.13 * u); ctx.stroke();
      if (o.pull && o.nocked) dot(ctx, o.pull[0], o.pull[1], 0.045 * u, '#6d5a4a');
      return;
    }
    case 'seed': outlined(ctx, '#a88a66', hair(0.5, ow * 0.6), (c) => c.arc(0, 0, 0.07 * u, 0, Math.PI * 2)); dot(ctx, -0.02 * u, -0.02 * u, 0.02 * u, '#e8d8c0'); return;
    case 'bomb': {
      // Round bomb with a sprig of THYME for a fuse — the hero of thyme's
      // one ranged joke. Spark on the tip.
      outlined(ctx, '#2c2a3a', ow, (c) => c.arc(0, 0.02 * u, 0.11 * u, 0, Math.PI * 2));
      dot(ctx, -0.035 * u, -0.02 * u, 0.03 * u, '#5a5670');
      ctx.strokeStyle = '#4c8c2c'; ctx.lineWidth = hair(0.6, 0.02 * u); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0.02 * u, -0.08 * u); ctx.quadraticCurveTo(0.06 * u, -0.16 * u, 0.04 * u, -0.22 * u); ctx.stroke();
      for (const [dx, dy] of [[0.04, -0.12], [0.08, -0.16], [0.045, -0.19]]) dot(ctx, dx * u, dy * u, 0.022 * u, '#7cc44c');
      if (q > 0) dot(ctx, 0.04 * u, -0.22 * u, 0.03 * u * (0.7 + 0.5 * Math.sin((o.t || 0) * 40)), p.a || '#f6d33c');
      return;
    }
    case 'receipt': {
      // The sacred grocery receipt, folded into a dart. Long, white, printed.
      outlined(ctx, '#f7f4ea', hair(0.5, ow * 0.7), (c) => {
        c.moveTo(0.22 * u, 0); c.lineTo(-0.14 * u, -0.07 * u); c.lineTo(-0.08 * u, 0); c.lineTo(-0.14 * u, 0.07 * u); c.closePath();
      });
      ctx.strokeStyle = '#9a96a6'; ctx.lineWidth = hair(0.5, 0.012 * u);
      ctx.beginPath(); ctx.moveTo(0.22 * u, 0); ctx.lineTo(-0.08 * u, 0); ctx.stroke();
      ctx.strokeStyle = '#6e6a7a';
      ctx.beginPath();
      for (const f of [-0.02, 0.04, 0.1]) { ctx.moveTo(f * u, -0.028 * u); ctx.lineTo(f * u + 0.04 * u, -0.014 * u); }
      ctx.stroke();
      return;
    }
    case 'wrench':
      // Spun about its middle in flight; the hand anchors the handle end.
      if (o.flying) ctx.translate(-0.17 * u, 0);
      drawWrench(ctx, 0, 0, 0, u, ow); return;
    case 'plunger': {
      // Wooden handle, red rubber cup — cup forward, the business end.
      limb(ctx, -0.24 * u, 0, 0.06 * u, 0, 0.045 * u, WOOD_HI, ow * 0.7);
      outlined(ctx, '#d83a44', ow, (c) => {
        c.moveTo(0.04 * u, -0.12 * u); c.quadraticCurveTo(0.24 * u, -0.12 * u, 0.24 * u, 0);
        c.quadraticCurveTo(0.24 * u, 0.12 * u, 0.04 * u, 0.12 * u); c.closePath();
      });
      return;
    }
    case 'pipe': {
      // A U-bend: two stubs off one elbow, flanged, in steel.
      const w = 0.085 * u;
      ctx.lineCap = 'butt';
      for (const [lw, col] of [[w + ow * 2, OUTLINE], [w, STEEL]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(-0.16 * u, -0.1 * u); ctx.lineTo(-0.16 * u, 0.06 * u);
        ctx.quadraticCurveTo(-0.16 * u, 0.16 * u, 0, 0.16 * u); ctx.quadraticCurveTo(0.16 * u, 0.16 * u, 0.16 * u, 0.06 * u); ctx.lineTo(0.16 * u, -0.1 * u); ctx.stroke();
      }
      ctx.fillStyle = STEEL_HI;
      ctx.fillRect(-0.16 * u - w * 0.7, -0.12 * u, w * 1.4, 0.04 * u);
      ctx.fillRect(0.16 * u - w * 0.7, -0.12 * u, w * 1.4, 0.04 * u);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = hair(0.5, ow * 0.7);
      ctx.strokeRect(-0.16 * u - w * 0.7, -0.12 * u, w * 1.4, 0.04 * u);
      ctx.strokeRect(0.16 * u - w * 0.7, -0.12 * u, w * 1.4, 0.04 * u);
      return;
    }
    case 'bucket': {
      // Galvanised pail, handle up. The water inside is its own projectile.
      outlined(ctx, '#8c96a4', ow, (c) => {
        c.moveTo(-0.12 * u, -0.09 * u); c.lineTo(0.12 * u, -0.09 * u); c.lineTo(0.09 * u, 0.12 * u); c.lineTo(-0.09 * u, 0.12 * u); c.closePath();
      });
      ctx.fillStyle = '#5fc0e8'; ctx.fillRect(-0.105 * u, -0.08 * u, 0.21 * u, 0.035 * u);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = hair(0.6, 0.02 * u);
      ctx.beginPath(); ctx.arc(0, -0.09 * u, 0.12 * u, Math.PI, 0); ctx.stroke();
      return;
    }
    case 'splash': {
      // A slug of scalding water with steam coming off it.
      const r = 0.1 * u;
      outlined(ctx, '#5fc0e8', hair(0.5, ow * 0.7), (c) => c.ellipse(0, 0, r * 1.3, r, 0, 0, Math.PI * 2));
      dot(ctx, -r * 0.3, -r * 0.3, r * 0.35, '#d8f4ff');
      ctx.globalAlpha *= 0.55;
      for (const [dx, dy, rr] of [[-0.4, -1.3, 0.55], [0.5, -1.6, 0.4], [0.1, -2.0, 0.3]]) dot(ctx, dx * r + Math.sin((o.t || 0) * 9 + dx) * r * 0.2, dy * r, rr * r, '#ffffff');
      ctx.globalAlpha /= 0.55;
      return;
    }
    case 'hose': {
      // Brass nozzle with the black hose trailing off the back of it.
      ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 0.05 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-0.02 * u, 0); ctx.quadraticCurveTo(-0.18 * u, 0.02 * u, -0.26 * u, 0.2 * u); ctx.stroke();
      outlined(ctx, p.a || '#f6d33c', hair(0.5, ow * 0.65), (c) => roundRectPath(c, -0.04 * u, -0.035 * u, 0.2 * u, 0.07 * u, 0.02 * u));
      outlined(ctx, STEEL, hair(0.5, ow * 0.65), (c) => roundRectPath(c, 0.14 * u, -0.045 * u, 0.06 * u, 0.09 * u, 0.015 * u));
      return;
    }
    case 'jet': {
      // The stream: a band that tapers and breaks up, `len` in u.
      const len = (o.len || 0.6) * u;
      if (len <= 0) return;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3f9ad0'; ctx.lineWidth = 0.09 * u;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.strokeStyle = '#8fdcff'; ctx.lineWidth = 0.05 * u;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len * 0.9, -0.005 * u); ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const f = ((o.t || 0) * 3 + i / 5) % 1;
        dot(ctx, len * (0.5 + f * 0.6), (i % 2 ? -1 : 1) * (0.05 + f * 0.08) * u, 0.025 * u, '#d8f4ff');
      }
      return;
    }
    case 'nut': {
      const r = 0.08 * u;
      outlined(ctx, STEEL_HI, hair(0.5, ow * 0.6), (c) => {
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + (o.rot || 0); c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath();
      });
      dot(ctx, 0, 0, r * 0.4, OUTLINE);
      return;
    }
    case 'nuts': {
      // A fistful: three, overlapping, before the throw fans them out.
      for (const [dx, dy] of [[-0.05, 0.03], [0.06, -0.01], [0.0, -0.09]]) {
        ctx.save(); ctx.translate(dx * u, dy * u); rangedArt(ctx, 'nut', u, ow, p); ctx.restore();
      }
      return;
    }
    default: return;
  }
}

// THE QUIVER AND THE WORN BOW, in a frame where local -y runs up his back:
// the standing rig calls this in body space, the slide calls it rotated onto
// the reclined torso's back. `bow` is where the worn bow sits, or null while
// it is in his hand. Case in dark belt leather (tan sat a few points off his
// skin and read as a hand), bands in his trouser brown, three arrows fanned
// out of the mouth with each fletch turned with its own shaft.
// RUSTY'S BAMBOO BUNDLE — the quiver's answer to the same question, and built
// to the same rule: a ranged hero needs somewhere the ammunition visibly comes
// from, or the supply reads as conjured. Fernwick's case is a tall shape behind
// the drawing shoulder; this is a stubbier one, because bamboo canes are short,
// thick and carried in a bunch rather than nocked.
//
// Three ideas, the projectile's own budget applied to a worn prop:
//   - a SLEEVE, rounded and strapped, in the boot leather so it reads as kit
//     rather than as part of him.
//   - CANES standing proud of the mouth, drawn with the projectile's own
//     painter so the thing he pulls out is visibly the thing he throws.
//   - a STRAP, one band, which is what turns a tube into something worn.
//
// `count` drops as he throws: the bundle is not decorative, it is the supply.
// The SHORT cane as a fraction of the long one. One number, read by the pouch,
// the held stick and (via caneScale) the projectile, so the piece in the air
// is the same piece that left the pouch.
const CANE_SHORT = 0.78;
// Which length he is throwing THIS time: the right-hand slot holds the long
// cane on even throws and the short one on odd. Exported through the pose so
// run.js can size the projectile to match.
export function caneScale(parity) { return (parity | 0) ? CANE_SHORT : 1; }

function paintBambooBundle(ctx, spec, p, u, ow, lod,
  { bx, by, beltCx = 0, thrown = false, belt = false, lean = 0, pack = false, half = 0, clip = null, sling = 0, canes = null, parts = 'both' }) {
  // CANES STAND UP. The first cut rotated the whole bundle and let the canes
  // lean off it, which put them somewhere between vertical and horizontal and
  // read as a handful of sticks falling out of a bag. A quiver works because
  // its arrows are UPRIGHT — the mouth of the tube is the line they all cross,
  // and that shared line is what makes a bunch read as stowed rather than
  // spilled. So the canes are drawn vertically in the figure's own frame, and
  // only the tube may cant.
  //
  // AND IT HUGS HIM. The bag was standing a tenth of a unit off his side, which
  // is a satchel swinging, not kit worn. Everything here is measured from the
  // torso edge inward.
  // BELT AND POUCH ARE DRAWN SEPARATELY. They need different z-order — the
  // band goes round the body and a raised thigh must occlude it, while the
  // pouch hangs outboard and sits ON the leg — and different motion: the belt
  // is strapped tight and does not move, only the thing hanging off it does.
  // `parts` lets one painter serve both passes.
  if (belt && parts !== 'pouch') {
    // The tool belt: one band across the hips, which is what a pouch needs to
    // hang from before it reads as worn rather than stuck on.
    // In the BOOT leather, not p.w: `w` is the white/highlight slot on this
    // palette, and a white band across the hips read as a bandage.
    // A BELT GOES ROUND HIM. Measured off the body's own half-width and drawn
    // across the WHOLE waist, not as a strip hanging off the pouch: sized
    // relative to the tube it read as a tab stuck to his side, which is the one
    // thing a belt must not look like — the pouch needs something holding it
    // up, and that something has to visibly continue past it.
    // A BELT GOES ROUND A BODY, so it is a CURVE. Drawn as a straight bar it
    // read as a plank laid across him — nothing about it said the far side
    // continues behind. A shallow downward bow is what a band round a barrel
    // looks like from the front, and it is the whole difference between worn
    // and stuck on.
    //
    // The LEFT end also lifts and stops short, to finish ABOVE the tail: the
    // plume roots at the hip on that side, and a band running level into it
    // read as passing through the tail rather than around the body under it.
    // `beltH` widens the band. It is the other half of the same complaint: a
    // thin strap in the same value as the canister reads as one more dark line
    // beside the leg rather than as the thing the canister hangs from.
    const bandH = (spec.beltH ?? 0.05) * u;
    // DRAWN WIDE AND CLIPPED TO THE BODY. Sizing the band by hand could not
    // win: `half` is the width at the WAIST, and the belt rides a little above
    // it where the torso is still wider, so a band cut to waistHalf fell short
    // of the right edge while a wider one overhung the left. Clipping to the
    // torso's own path makes the silhouette decide — it reaches exactly as far
    // as he does on both sides, at any build, in any pose.
    //
    // The band still LIFTS on the tail side and bows in the middle: the lift
    // finishes it above the plume, and the bow is what a band round a barrel
    // looks like from the front.
    // Centred on `beltCx`, NOT on the caller's origin. Standing, the two are
    // the same point and this reads as 0; in the slide they are not — the hips
    // sit a twentieth of a unit back along the recline from the frame origin,
    // so a band about x = 0 hung off his right side and stopped short of his
    // left waist. The band belongs on the HIPS wherever the pose puts them.
    const xL = beltCx - half * 1.6, xR = beltCx + half * 1.6;
    // `beltLift` is how high the tail-side end finishes, in u. It has to land
    // just ABOVE the plume: the tail roots at this hip, so a band that arrives
    // level reads as passing through it, and one that arrives too high reads as
    // a sash sliding off. Dialled rather than fixed because where the plume
    // roots is a per-hero thing.
    const yL = by - (spec.beltLift ?? 0.052) * u;   // high on the tail side
    // LEVEL with the left end. `beltSlant` is how much LOWER the right end
    // finishes, in u, and it was effectively 0.028 — the empty side hanging
    // below the loaded one, which is backwards for what this belt carries. The
    // canister is on the LEFT; a belt sits lower where the weight is. 0 reads
    // as worn; a negative tips it the physical way, loaded side lowest.
    //
    // NOT `beltDrop` — that name is taken, by Clara's dial for wearing her belt
    // on the hips instead of the waist. Two unrelated things, one word, and the
    // collision would have moved her midriff every time this band tilted.
    const yR = yL + (spec.beltSlant ?? 0) * u;
    const bow = 0.028 * u;                  // sag at the centre
    const band = (c) => {
      c.moveTo(xL, yL);
      c.quadraticCurveTo(beltCx, yL + bow, xR, yR);
      c.lineTo(xR, yR + bandH);
      c.quadraticCurveTo(beltCx, yL + bow + bandH, xL, yL + bandH);
      c.closePath();
    };
    if (clip) {
      ctx.save();
      ctx.beginPath(); clip(ctx); ctx.clip();
      outlined(ctx, p.f, hair(0.6, ow * 0.8), band);
      ctx.restore();
    } else {
      outlined(ctx, p.f, hair(0.6, ow * 0.8), band);
    }
  }
  // A pack is a bigger, squarer body than a tube; a quiver is a tube.
  if (parts === 'belt') return;
  const w = (pack ? 0.19 : 0.1) * u, h = (pack ? 0.22 : 0.17) * u;
  ctx.save();
  // The canister hangs `sling` below THE BAND WHERE IT ACTUALLY IS, not below
  // `by`. The two used to be the same thing; they stopped being the same the
  // moment the band's tail-side end lifted, because the canister hangs near
  // that end — so raising the belt left the bag behind and the two read as
  // separate pieces rather than as one hung off the other.
  //
  // So the band's own curve is evaluated at the canister's x. Same three points
  // the belt block draws through (the lifted left end, the sagging middle, the
  // right end), so this cannot drift from it: change the band and the bag
  // follows for free.
  const bandTop = (() => {
    if (!belt) return by;
    const xL = beltCx - half * 1.6, xR = beltCx + half * 1.6;
    const yL = by - (spec.beltLift ?? 0.052) * u;
    // LEVEL with the left end. `beltSlant` is how much LOWER the right end
    // finishes, in u, and it was effectively 0.028 — the empty side hanging
    // below the loaded one, which is backwards for what this belt carries. The
    // canister is on the LEFT; a belt sits lower where the weight is. 0 reads
    // as worn; a negative tips it the physical way, loaded side lowest.
    //
    // NOT `beltDrop` — that name is taken, by Clara's dial for wearing her belt
    // on the hips instead of the waist. Two unrelated things, one word, and the
    // collision would have moved her midriff every time this band tilted.
    const yR = yL + (spec.beltSlant ?? 0) * u;
    const cY = yL + 0.028 * u;
    const q = Math.max(0, Math.min(1, (bx - xL) / ((xR - xL) || 1)));
    // the quadratic the band is drawn as, at the canister's own x
    return (1 - q) * (1 - q) * yL + 2 * (1 - q) * q * cY + q * q * yR;
  })();
  ctx.translate(bx, bandTop + sling * u);
  if (lean) ctx.rotate(lean);
  // Canes first so the tube's mouth crops their butts and they sit IN it.
  // TWO canes, and they lie along the BAG'S OWN AXIS. Three at slightly
  // different angles read as a bunch — a clump with no direction, which is the
  // one thing that does not say "sticks". Two, parallel, sharing the tube's
  // angle, read as two lengths of cane stowed in a thing: the shared line is
  // what does the work, exactly as it does in a quiver.
  //
  // The cant is NOT undone here any more. Standing them upright inside a
  // canted tube was right when the tube was vertical and wrong the moment it
  // was not — the canes leaned one way and the sleeve the other, so nothing
  // lined up with anything.
  // HOW THE CANES SIT IN THE MOUTH is its own question, dialled from the spec
  // (see spec.canes) because the default read as ONE THICK CANE: two shafts
  // 0.032u apart, each about 0.03u wide, touch along their whole length and
  // merge. What separates two sticks into two is any of — a GAP of tube
  // showing between them, a STAGGER so the tops do not line up, a SPLAY so
  // the tips part while the bases stay bunched, or simply being THINNER.
  //   n        how many
  //   gap      centre-to-centre spacing, in u
  //   stagger  alternating height offset, in u (+ lifts odd canes)
  //   splay    fan, radians per cane off the tube's axis, about the base
  //   size     cane scale, as a fraction of u
  const cl = canes || {};
  const n = cl.n ?? 2;
  const gap = (cl.gap ?? (pack ? 0.05 : 0.032)) * u;
  const stagger = (cl.stagger ?? 0) * u;
  const splay = cl.splay ?? 0;
  const size = u / (cl.size ?? 52);
  // THE CANES ALTERNATE. Two slots, one LONG cane and one SHORT, and which is
  // which swaps every throw: [short, long] -> he pulls the long -> the pouch
  // refills [long, short] -> he pulls the short -> [short, long] again. The
  // rule underneath is simpler than it sounds — he always draws from the
  // RIGHT-hand slot, the one nearest his hand, and that slot's length is what
  // alternates. `parity` is the throw count's low bit, kept by the run.
  //
  // The point is that the pouch becomes STATEFUL: it visibly changes after
  // every throw, so the supply reads as a real thing being used rather than a
  // decoration that never runs down.
  const parity = cl.parity | 0;
  const longIdx = parity ? 0 : n - 1;         // long cane: right slot on even throws
  const drawIdx = n - 1;                      // he always pulls the right-hand slot
  if (!lod) {
    for (let i = 0; i < n; i++) {
      // The slot he drew from is EMPTY while the cane is out — that is the
      // whole bookkeeping, and it is what count used to approximate.
      if (thrown && i === drawIdx) continue;
      const isLong = i === longIdx;
      const c = i - (n - 1) / 2;               // centred: -0.5, 0.5 / -1, 0, 1
      ctx.save();
      // Rotate about the BASE (the mouth of the tube), not the cane's centre,
      // so a splay fans the tips and leaves the bases bunched in the sleeve.
      ctx.translate(c * gap, -h * 0.34);
      ctx.rotate(c * splay);
      // The long cane is both LONGER (a bigger painter scale) and raised by the
      // stagger; the short one is shorter and sits low. Length, not just
      // height — the ask was that the piece he throws is visibly the piece he
      // pulled, and that only holds if the two are actually different sizes.
      ctx.translate(0, -h * 0.16 - (isLong ? stagger : 0));
      ctx.rotate(Math.PI / 2);                 // along the tube, not across it
      drawBambooShoot(ctx, 0.05 * u, 0, { size: size * (isLong ? 1 : CANE_SHORT) });
      ctx.restore();
    }
  }
  // The canister has its OWN colour slot, falling back to the belt leather.
  // On Rusty those were the same navy as his boots and the pair merged into one
  // dark mass against his legs — the bag stopped reading as a bag worn on him
  // and became part of the trouser. `pouch` is the seam for pulling it off that.
  outlined(ctx, p.pouch || p.f, ow, (c) => roundRectPath(c, -w / 2, -h * 0.4, w, h, 0.035 * u));
  if (!lod) {
    // The band round the canister. It was 0.018u of the trouser colour — a dark
    // line on a dark tube, which is why the canister read as one solid lump.
    ctx.strokeStyle = p.pouchLine || p.p;
    ctx.lineWidth = hair(0.6, (spec.pouchLineW ?? 0.018) * u);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.4 + h * 0.45);
    ctx.lineTo(w / 2, -h * 0.4 + h * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

function paintQuiverKit(ctx, spec, p, u, ow, lod, { qx, qTop, qBot, bow }) {
  const wornBow = () => {
    if (!bow) return;
    ctx.save();
    ctx.translate(bow[0], bow[1]);
    rangedArt(ctx, 'bow', u, ow, p, { axis: BOW_SLUNG_AXIS, gauge: spec.bowGauge });
    ctx.restore();
  };
  // `bowSling: 'front'` wears it OVER the case (a bake-off option); the
  // default is behind, where only the tips and string show past it.
  if (spec.bowSling !== 'front') wornBow();
  if (!lod) {
    for (const [dx, a] of [[-0.02, -0.5], [0.0, -0.08], [0.02, 0.36]]) {
      ctx.save();
      ctx.translate(qx + dx * u, qTop + 0.02 * u);
      ctx.rotate(a);
      limb(ctx, 0, 0.08 * u, 0, -0.13 * u, 0.022 * u, ARROW_SHAFT, ow * 0.5);
      outlined(ctx, ARROW_FLETCH, hair(0.4, ow * 0.4), (c) => {
        c.moveTo(0, -0.17 * u);
        c.lineTo(-0.035 * u, -0.09 * u);
        c.lineTo(0.035 * u, -0.09 * u);
        c.closePath();
      });
      ctx.restore();
    }
  }
  outlined(ctx, p.f, ow, (c) => roundRectPath(c, qx - 0.075 * u, qTop, 0.15 * u, qBot - qTop, 0.05 * u));
  if (!lod) {
    ctx.strokeStyle = p.p; ctx.lineWidth = hair(0.6, 0.022 * u);
    for (const f of [0.26, 0.68]) {
      const y = qTop + (qBot - qTop) * f;
      ctx.beginPath(); ctx.moveTo(qx - 0.075 * u, y); ctx.lineTo(qx + 0.075 * u, y); ctx.stroke();
    }
  }
  if (spec.quiverMount && spec.quiverMount !== 'loop') {
    // Actual case anchors; the torso occludes the return lengths naturally.
    const belt = spec.quiverMount === 'belt';
    const ys = belt ? [qBot - 0.07 * u, qBot - 0.015 * u] : [qTop + 0.04 * u, qBot - 0.04 * u];
    ctx.save();
    ctx.lineCap = 'round';
    for (const y of ys) {
      const path = () => {
        ctx.beginPath(); ctx.moveTo(qx + 0.045 * u, y);
        ctx.quadraticCurveTo(qx + 0.10 * u, y - (belt ? 0 : 0.055 * u), qx + 0.20 * u, y - (belt ? 0 : 0.045 * u));
      };
      if (spec.quiverMount !== 'loop') {
        path(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.047 * u; ctx.stroke();
      }
      path(); ctx.strokeStyle = spec.quiverMount === 'loop' ? '#956b46' : '#875b36';
      ctx.lineWidth = 0.035 * u; ctx.stroke();
    }
    ctx.restore();
  }
  if (spec.bowSling === 'front') wornBow();
}

// What the hero holds while aiming. Throws hold the prop until the whip
// releases it and the arm carries it along its own line; the draw gestures
// hold the launcher in the far hand and pull the string to the near one.
function drawRangedHeld(ctx, spec, handF, handB, shF, armY, pose, u, ow, p, carryAng = null) {
  const kind = spec.ranged;
  // Same clock the pose runs on, reach offset included — held on a different
  // one, the prop let go of the hand a reach's worth before the arm did.
  const reachT = spec.wrenchCarry ? WRENCH_REACH_T : 0;
  const q = pose.actionTime == null ? 0.62
    : Math.max(0, Math.min(1, (Number(pose.actionTime) - reachT) / 0.3));
  const g = RANGED_GESTURES[kind];
  ctx.save();
  if (g === 'draw') {
    // Launcher on the far hand, drawn HERE (over the near arm) because the
    // string crosses the torso to reach the jaw and behind the body it would
    // vanish. Nocked until release; empty-stringed after.
    const st = kind === 'bow' ? (BOW_STYLES[spec.bowStyle] || BOW_STYLES.level) : null;
    const qd = bowDrawQ(pose), reachQ = bowReachQ(pose);
    // Nocked once the bow has come round (not while it is still being fetched
    // from his back) and until the release.
    const nocked = reachQ >= 0.8 && qd < (st ? st.release : RANGED_RELEASE);
    // The release point is reported only while the arrow is still NOCKED, so
    // it freezes where the arrow actually left. Updated every frame it drifted
    // with the recoil and the lower, and a shot already in flight moved with it.
    if (nocked) {
      const dx = handB[0] - handF[0], dy = handB[1] - handF[1], d = Math.hypot(dx, dy) || 1;
      RANGED_RELEASE_POINT.x = handB[0] + (dx / d) * 0.2 * u;
      RANGED_RELEASE_POINT.y = handB[1] + (dy / d) * 0.2 * u;
      RANGED_RELEASE_POINT.ang = Math.atan2(dy, dx);
      RANGED_RELEASE_POINT.set = true;
      RANGED_RELEASE_POINT.dist = d;
    }
    // On the way down the string hand is no longer on the draw line, so the
    // bow's frame cannot come from it: blend the draw-line angle toward an
    // upright carry, tips up and down, a little forward of the hand.
    const lower = bowLowerQ(pose), sling = bowSlingQ(pose);
    const drawAng = Math.atan2(handF[1] - handB[1], handF[0] - handB[0]);
    const carryAng = Math.PI + 0.28; // upright at his side, belly forward, a touch of lean
    const el = lower * lower * (3 - 2 * lower), es = sling * sling * (3 - 2 * sling);
    let axis = lower > 0 ? drawAng + (carryAng - drawAng) * el : null;
    // ...and on to the worn angle as it goes over the shoulder.
    if (sling > 0) axis = carryAng + (BOW_SLUNG_AXIS - carryAng) * es;
    // Coming OFF the back it turns from the worn angle to the draw line.
    if (reachQ < 1) { const er = reachQ * reachQ * (3 - 2 * reachQ); axis = BOW_SLUNG_AXIS + (drawAng - BOW_SLUNG_AXIS) * er; }
    ctx.translate(handB[0], handB[1]);
    rangedArt(ctx, kind, u, ow, p, {
      q: qd, pull: [handF[0] - handB[0], handF[1] - handB[1]], axis,
      nocked, cant: st ? st.cant : 0,
      gauge: spec.bowGauge, headScale: spec.arrowHead, vaneScale: spec.arrowVane,
    });
  } else if (g === 'hose') {
    ctx.translate(handF[0], handF[1]);
    rangedArt(ctx, 'hose', u, ow, p, { q });
  } else if (q < RANGED_RELEASE_AT.toss) {
    // The thrown thing, along the arm's line so it swings with the wind-up.
    ctx.translate(handF[0], handF[1]);
    const ang = Math.atan2(handF[1] - armY, handF[0] - shF);
    // Across the palm through the wind-up, coming round to point ALONG the
    // throw as the whip runs — released still square to the arm it looked
    // detached from the hand on the frame it left.
    const whip = Math.max(0, Math.min(1, (q - 0.34) / 0.22));
    let held = ang + (RANGED_HELD_TILT[kind] || 0) * (1 - 0.85 * whip);
    // COMING OFF THE BELT it turns from the angle it was worn at to the angle
    // it is held at, the same blend the bow's `axis` makes coming off the back.
    if (carryAng) held = carryAng.ang + (held - carryAng.ang) * carryAng.q;
    ctx.rotate(held);
    rangedArt(ctx, RANGED_HELD_ART[kind] || kind, u, ow, p, { q, t: pose.time });
  }
  ctx.restore();
}
// A thrown prop sits across the palm, not along the forearm: the tilt is
// what makes a wrench read as gripped rather than as a splint.
const RANGED_HELD_TILT = { wrench: -1.4, plunger: -1.2, pipe: -0.6, boomerang: -1.6, shield: 0, bomb: 0, receipt: -0.3, bucket: 0 };
const RANGED_HELD_ART = { nuts: 'nuts' };

// The same prop in flight, for the gallery's lanes and studies (and for
// run.js once one is chosen). `scale` 1 is the 24u hero, like drawThrownAxe.
export function drawRangedProjectile(ctx, kind, x, y, opts = {}) {
  const scale = opts.scale || 1;
  const u = 24 * scale;
  const p = pal(opts.hero || 'fernwick');
  const prevInkScale = inkScale;
  inkScale = drawScale(ctx);
  const ow = hair(0.5, contour(0.03 * u));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opts.rot || 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  rangedArt(ctx, kind, u, ow, p, opts);
  ctx.restore();
  inkScale = prevInkScale;
}

// ---------------------------------------------------------------- API
export function drawToon(ctx, heroId, pose = {}, cx, feetY, h, opts = {}) {
  // `opts.spec` / `opts.pal` let a CANDIDATE — a character still being designed,
  // with no entry in TOON_SPECS or HERO_SPRITES — ride this painter without
  // being registered as cast. That distinction is the point: the roster is what
  // every production section of the gallery, the hub wall and the handoff tool
  // all enumerate, so a look that has not been chosen yet must not appear in
  // it. Production callers pass neither and nothing about them changes.
  const spec = opts.spec || TOON_SPECS[heroId];
  if (!spec) return;
  const p = opts.pal || pal(heroId);
  const u = h;
  const prevInkScale = inkScale;
  inkScale = drawScale(ctx);
  const ow = hair(0.3, contour(0.016 * h)) * INK.body; // whisper-light contour
  const lod = h < 16;
  let sx = 1, sy = 1;
  if (!pose.grounded && pose.kind === 'jump') {
    if (usesEnhancedLocomotion(pose) && !pose.stomp) {
      const speed = Math.min(1, Math.abs(Number(pose.vy) || 0) / AIR_STRETCH_VY_REF);
      sy = 1 + AIR_STRETCH_Y * speed;
      sx = 1 - AIR_STRETCH_X * speed;
    } else {
      const st = pose.stomp ? 0.25 : Math.min(0.18, Math.abs(pose.vy || 0) / 700);
      sy = 1 + st;
      sx = 1 - 0.6 * st;
    }
  }
  if (pose.kind === 'slide' && usesEnhancedLocomotion(pose) && !pose.roll
    && !SLIDE_STYLE_DRAWS[pose.slideStyle]) {
    const raw = pose.slideAmount == null ? 1
      : Math.max(0, Math.min(1, Number(pose.slideAmount) || 0));
    let crouch = raw * raw * (3 - 2 * raw);
    // On entry, dip just past the held pose and rebound during the final third.
    // It is deliberately tiny: enough to show weight arriving, not enough to
    // pulse the hitbox or make the hero look rubbery.
    if (pose.slideDirection > 0 && raw > 0.68 && raw < 1) {
      crouch += Math.sin((raw - 0.68) / 0.32 * Math.PI) * 0.055;
    }
    const startTall = spec.rig === 'disc' ? 1.28
      : spec.rig === 'pika' || spec.rig === 'blob' ? 1.45
        : spec.rig === 'ray' ? 1.25 : 1.7;
    sy *= startTall + (1 - startTall) * crouch;
    sx *= 0.9 + 0.1 * crouch;
  }
  const q = pose.squash || 0;
  if (q > 0) { sy *= 1 - LAND_SQUASH_Y * q; sx *= 1 + LAND_SQUASH_X * q; }
  // The armless rigs cling with their whole body, so their version of the pose
  // is a scale and a tilt rather than a limb arrangement — applied here, where
  // the figure transform already lives, and read again inside each painter for
  // the parts that are theirs (Mochi's nubs, Raymn's fins, Chompo's jaw).
  const clingAmt = clingAmount(pose);
  const rigCling = clingAmt > 0 ? CLING_RIG[heroId] : null;
  if (rigCling) {
    sy *= 1 + rigCling.squeeze * clingAmt;
    sx *= 1 - rigCling.squeeze * 0.75 * clingAmt;
  }
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.translate(cx, feetY);
  // The victory routine drives the whole rig — hop, sway, turn and squash —
  // so humanoid, blob, disc and ray all dance off the same clock.
  const cm = pose.kind === 'celebrate'
    ? celebrateMotion(heroId, pose.time || 0, usesReworkedCelebration(pose), spec.celebrate)
    : null;
  if (cm) ctx.translate(cm.x * u, -cm.lift * u);
  if (pose.facing === -1) ctx.scale(-1, 1);
  // Blob/disc/floating rigs do not have separable torso and limb dimensions.
  // These optional spec values therefore scale their complete figure about
  // the feet. No production spec sets them; the gallery applies and restores
  // them around a single comparison draw.
  if (spec.figureScaleX || spec.figureScaleY) {
    ctx.scale(spec.figureScaleX || 1, spec.figureScaleY || 1);
  }
  if (pose.lean) ctx.rotate(pose.lean);
  // Chompo hangs off his own jaw and Raymn streams off the pole at an angle;
  // both need the whole figure canted, and neither has a joint to do it with.
  if (rigCling && rigCling.tilt) ctx.rotate(rigCling.tilt * clingAmt);
  if (cm) {
    if (cm.tilt) ctx.rotate(cm.tilt);
    // a flat turn-around: squeeze the sprite through zero width and back
    if (cm.spin !== 1) sx *= (cm.spin < 0 ? -1 : 1) * Math.max(0.12, Math.abs(cm.spin));
    if (cm.squash) { sy *= 1 - 0.24 * cm.squash; sx *= 1 + 0.2 * cm.squash; }
  }
  ctx.scale(sx, sy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Key light on, in world space: the facing flip and the celebrate spin both
  // mirror x, and the light has to sit still through either. Off below the LOD
  // cut — at 16px a form is two pixels of ramp and reads as dirt, and the tiny
  // sites (HUD faces, hub NPCs) are cached anyway, so nothing is saved by it.
  //
  // `opts.lit` is room brightness at this figure's position, for callers that
  // have a lighting model of their own to answer to — in practice the hub,
  // whose ceiling fixtures already dim its wall and dressings. Defaulting to 1
  // leaves the runner alone on purpose: a hero flickering past light sources at
  // running speed is a distraction, not atmosphere.
  const xSign = (pose.facing === -1 ? -1 : 1) * (sx < 0 ? -1 : 1);
  // The field goes down with a slider — see SLIDE_FIELD_K. Eased on the same
  // smoothstep of slideAmount the crouch uses, so the value shifts with the
  // body going down rather than snapping the whole hero a shade darker on the
  // frame `kind` flips to 'slide'.
  const slideK = (() => {
    if (pose.kind !== 'slide') return 1;
    const raw = pose.slideAmount == null ? 1
      : Math.max(0, Math.min(1, Number(pose.slideAmount) || 0));
    return 1 - (1 - SLIDE_FIELD_K) * (raw * raw * (3 - 2 * raw));
  })();
  const prevLight = armLight(u, xSign, !lod && opts.light !== false, opts.lit == null ? 1 : opts.lit,
    0, FIELD_CY * u * slideK, FIELD_R * u * slideK);
  // No sidestep for anyone with arms. The hero stands exactly where the sim put
  // him for the whole ride — which is over the plunger — and the marker's mast
  // is what stands off to the right, by CLING_POLE_X of this same draw height.
  // He is centred on the cap he is about to land on from the first frame of the
  // slide, so the handoff to the celebration moves nothing.
  //
  // The armless rigs are the exception, and have to be: they cling with their
  // whole BODY, so the body has to be on the column, and the column is now the
  // thing that moved. They step out to meet it and step back as they let go —
  // which is the shuffle the whole cast used to do, kept for the three heroes
  // who have no other way to hold anything.
  const clingStep = clingSettle(pose);
  if (clingStep > 0 && CLING_RIG[heroId]) {
    ctx.translate(CLING_POLE_X * u * clingStep, 0);
  }
  if (spec.rig === 'pika') drawPika(ctx, heroId, p, pose, u, ow, lod);
  else if (spec.rig === 'blob') drawBlob(ctx, heroId, p, pose, u, ow, lod);
  else if (spec.rig === 'disc') drawDisc(ctx, heroId, p, pose, u, ow, lod);
  else if (spec.rig === 'ray') drawRay(ctx, heroId, p, pose, u, ow, lod);
  else drawHumanoid(ctx, heroId, spec, p, pose, u, ow, lod);
  disarmLight(prevLight);
  ctx.restore();
  inkScale = prevInkScale;
}

// The raw face paint: nominal framing per rig. Extents vary a lot between
// heroes (hats, ears, whiskers), so drawToonFace measures this and refits.
// `forFit` is the MEASURING pass. A face cell is fitted to the ink it contains,
// so anything drawn here competes with the face for the box — and a trailing
// accessory that is allowed to be cropped should not be measured at all. Cuts
// that already answer `portrait` shorten themselves; this is for the ones that
// keep their full length and get clipped to the cell instead (see drawToonFace).
// `facePose` is a pose PATCH, not a pose: a face crop has no body and no clock,
// so it carries only the terms the expression reads (`deathFace` and friends).
// It is deliberately absent from the fit measurement below - a crossed-out eye
// lands inside the same box an open one did, and letting it move the fit would
// resize a hero's whole head at the moment he dies.
function paintFace(ctx, heroId, spec, x, y, w, h, light = true, palette = null, forFit = false,
  facePose = null) {
  const p = palette || pal(heroId);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // head+hat spans ~0.5u; fit that span to the box height
  const u = (h * 0.92) / 0.5;
  const cw = faceContourW(h);
  const ow = hair(0.3 * cw, contour(0.016 * cw * (h * 2))) * INK.body;
  // Face crops are supersampled and cached, so the light is worth arming even
  // for a HUD cell — but only once the head is big enough to hold a ramp. The
  // blob/disc branch nests a whole drawToon, which arms its own.
  //
  // ANCHOR THE FIELD ON THE HEAD. FIELD_CY/FIELD_R describe a whole STANDING
  // FIGURE — the ramp is 1.44u long and starts half a unit above the feet — and
  // armLight's default lands it on the origin of whatever space the caller is
  // in. drawToon has translated to the feet by then, so that is right there and
  // heads come out near the LIT end. A face crop never translates: the head is
  // passed to drawHead as a coordinate, so the field was being pinned to the
  // top-left corner of the crop box and the head landed PAST the shadow end —
  // every portrait painted under a flat 42% of SHADOW_INK, with no highlight
  // and no rim, because both ramps are spent by half way. That is what made
  // the HUD face plates read dim and flat beside the same head in the run.
  //
  // FIELD_HEAD_DY is where the figure's centre sits relative to its head in the
  // rig: headBase is -0.76u over a field centre at -0.5u. One number for the
  // whole cast rather than the heavy rigs' own -0.978u, because a portrait is a
  // crop and not a figure — every hero's face should be lit the same way.
  const hx = x + w / 2, hy = y + h * 0.62;
  const prevLight = armLight(u, 1, light && h >= 24, 1, hx, hy + FIELD_HEAD_DY * u);
  if (spec.rig === 'humanoid') {
    // `portrait` tells the head it is being cropped to a face cell. Only the
    // long-hair cuts read it, and they need to: faceFit measures the ink and
    // fits it to the box, so a waist-length plait is measured as part of the
    // FACE and the whole head shrinks to make room for it — the same reason no
    // back accessory is drawn here either.
    drawHead(ctx, heroId, spec, p, u, ow, hx, hy, false,
      { portrait: true, portraitFit: forFit, ...(facePose || {}) });
  } else if (spec.rig === 'ray') {
    // ray has a real head on a floating body — crop to the head like a humanoid
    drawRayHead(ctx, heroId, p, { kind: 'idle', time: 0, ...(facePose || {}) }, u, ow,
      hx, hy, false, false);
  } else {
    // blob/disc/pika: the body IS the face — draw the whole toon fitted.
    // FACE_BODY_FEET/FACE_BODY_H are named beside faceHeadAnchor, which has to
    // undo this placement to say where the face lands.
    drawToon(ctx, heroId, { kind: 'idle', time: 0, ...(facePose || {}) },
      x + w / 2, y + h * FACE_BODY_FEET, h * FACE_BODY_H,
      palette ? { spec, pal: palette } : {});
  }
  disarmLight(prevLight);
}

// Where the ink actually lands, in pixels, for a paint call on a square scratch
// canvas. Null when nothing was drawn or the pixels can't be read (headless
// stubs), so every caller keeps a nominal fallback.
function inkBounds(size, paint) {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    x.save();
    // Measured at a pinned 1:1 ink scale: this result is cached per hero for
    // the life of the page, so it must not depend on whichever camera happened
    // to trigger the first measurement.
    const prevInkScale = inkScale, prevBake = inkBake;
    inkScale = 1; inkBake = 1;
    paint(x);
    inkScale = prevInkScale; inkBake = prevBake;
    x.restore();
    const { data } = x.getImageData(0, 0, size, size);
    if (data.length !== size * size * 4) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        if (data[(py * size + px) * 4 + 3] < 8) continue; // ignore AA dust
        if (px < x0) x0 = px;
        if (px > x1) x1 = px;
        if (py < y0) y0 = py;
        if (py > y1) y1 = py;
      }
    }
    return x1 >= x0 ? { x0, y0, x1, y1 } : null;
  } catch { return null; }
}

// Ink bounds of paintFace, in fractions of its own w-by-h box. Measured once
// per hero and ink treatment on an oversized scratch canvas (so anything
// spilling past the box still registers) and cached; falls back to the nominal
// box if pixels can't be read (headless stubs).
const FACE_FIT = new Map();
const FIT_R = 64; // nominal box size used for the measurement render
// `cw` is the contour weight the real paint will use — the measurement runs at
// FIT_R, which is nowhere near the crop's own size, so the size-derived weight
// has to be carried in rather than re-derived here or the fit measures a
// thinner outline than the one that lands.
function faceFit(heroId, spec, light = true, palette = null, cw = 1) {
  const key = `${heroId}|${light ? 'lit' : 'flat'}|${INK.body}|${INK.face}|${INK.alpha}|${INK.brow}|${INK.browA}|${INK.browL}|${cw}`;
  if (FACE_FIT.has(key)) return FACE_FIT.get(key);
  let fit = { x: 0, y: 0, w: 1, h: 1 }; // nominal framing, if nothing measures
  const prevCw = FACE_CONTOUR.w;
  FACE_CONTOUR.w = cw;
  const b = inkBounds(FIT_R * 3, (x) => paintFace(x, heroId, spec, FIT_R, FIT_R, FIT_R, FIT_R, light, palette, true));
  FACE_CONTOUR.w = prevCw;
  if (b) {
    fit = {
      x: (b.x0 - FIT_R) / FIT_R,
      y: (b.y0 - FIT_R) / FIT_R,
      w: (b.x1 - b.x0 + 1) / FIT_R,
      h: (b.y1 - b.y0 + 1) / FIT_R,
    };
  }
  FACE_FIT.set(key, fit);
  return fit;
}

// How far a hero's ink reaches above their own feet, as a multiple of the
// height they were drawn at. Nothing about the rig predicts this: the `h` a
// caller passes drawToon sizes the BODY, and then a crest, ears, a hat or a
// shouldered axe carry on past it by a different amount for every hero. So
// anything that has to sit above a head — the hub's "this is you" marker —
// measures instead of assuming, or it lands on the tall ones.
//
// The walk cycle is stamped over the idle at four phases on one scratch canvas,
// which makes the single measurement the union of every pose a hub hero holds.
// The marker then clears the tallest moment of the walk and stays put, rather
// than riding up and down as an arm swings through it.
const STAND_TOP = new Map();
const TOP_R = 64;                    // height the measurement is drawn at
const TOP_FEET = TOP_R * 2.75;       // feet line on the TOP_R * 3 canvas
export function toonInkTop(heroId) {
  if (STAND_TOP.has(heroId)) return STAND_TOP.get(heroId);
  let top = 1; // nominal: the drawn height, which is what callers assumed
  const b = inkBounds(TOP_R * 3, (x) => {
    const poses = [{ kind: 'idle', phase: 0 }, ...[0, 0.25, 0.5, 0.75].map((phase) => ({ kind: 'run', phase }))];
    for (const pose of poses) {
      drawToon(x, heroId, { ...pose, time: 0, grounded: true, facing: 1 },
        TOP_R * 1.5, TOP_FEET, TOP_R, { light: false });
    }
  });
  if (b) top = (TOP_FEET - b.y0) / TOP_R;
  STAND_TOP.set(heroId, top);
  return top;
}

// Stable glass-effect envelope for each toon. The shield used to be one ellipse
// centered on the nominal 24px body box, which meant ears, hats, axes and wide
// action poses poked straight through it. A dynamic per-frame fit fixes the
// containment but makes the glass visibly breathe with every footfall, so this
// measures the UNION of ordinary gameplay poses once and fits one ellipse that
// stays put for the whole time a hero carries a shield.
//
// Values are normalized to drawToon's `h`: cx/cy offset from the feet anchor,
// rx/ry radii. Headless/thrown-weapon states are deliberately absent because
// they only remove ink; victory and cast-roll choreography are not gameplay.
const EFFECT_ELLIPSE = new Map();
const EFFECT_R = 96;
const EFFECT_PAD = 0.055;
const EFFECT_FALLBACK = {
  lorenzo:  { cx: 0, cy: -0.5,  rx: 0.58, ry: 0.68 },
  gnash:    { cx: 0, cy: -0.53, rx: 0.62, ry: 0.72 },
  fernwick: { cx: 0, cy: -0.52, rx: 0.62, ry: 0.72 },
  b33p:     { cx: 0.04, cy: -0.52, rx: 0.72, ry: 0.72 },
  mochi:    { cx: 0, cy: -0.58, rx: 0.64, ry: 0.88 },
  chompo:   { cx: -0.02, cy: -0.5, rx: 0.66, ry: 0.72 },
  gary:     { cx: 0, cy: -0.5, rx: 0.58, ry: 0.68 },
  dolores:  { cx: 0, cy: -0.5, rx: 0.6, ry: 0.7 },
  raymn:    { cx: -0.02, cy: -0.5, rx: 0.7, ry: 0.78 },
  grumpos:  { cx: 0, cy: -0.62, rx: 0.72, ry: 0.94 },
  // Slim like Fernwick, but a shade wider and taller in the envelope: the buns
  // sit outboard of the skull and the skirt flares past the hips.
  kiko:     { cx: 0, cy: -0.52, rx: 0.64, ry: 0.74 },
};

function effectPoses(heroId) {
  const poses = [0, 0.25, 0.5, 0.75].map((phase) =>
    ({ kind: 'run', phase, time: phase, grounded: true, facing: 1 }));
  poses.push(
    { kind: 'jump', phase: 0.25, time: 0.25, grounded: false, facing: 1, vy: 280 },
    { kind: 'slide', phase: 0.5, time: 0.5, grounded: true, facing: 1 },
  );
  const special = {
    lorenzo: { kind: 'jump', phase: 0.5, time: 0.2, grounded: false, facing: 1, stomp: true, vy: -240 },
    gnash: { kind: 'run', phase: 0.25, time: 0.25, grounded: true, facing: 1, lean: 0.26 },
    fernwick: { kind: 'slide', phase: 0.5, time: 0.3, grounded: true, facing: 1, roll: true },
    b33p: { kind: 'run', phase: 0.25, time: 0.2, grounded: true, facing: 1, menuAction: 'aim' },
    mochi: { kind: 'slide', phase: 0.5, time: 0.2, grounded: true, facing: 1, squash: 1 },
    chompo: { kind: 'run', phase: 0.25, time: 0.22, grounded: true, facing: 1, menuAction: 'chomp' },
    kiko: { kind: 'run', phase: 0.25, time: 0.2, grounded: true, facing: 1, menuAction: 'aim' },
  }[heroId];
  if (special) poses.push(special);
  if (heroId === 'lorenzo') poses.push({
    kind: 'run', phase: 0.25, time: 0.18, grounded: true, facing: 1,
    menuAction: 'smash', actionTime: 0.18,
  });
  return poses;
}

function effectInk(heroId) {
  try {
    const size = EFFECT_R * 4;
    const anchorX = EFFECT_R * 2, feetY = EFFECT_R * 2.5;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    for (const pose of effectPoses(heroId)) {
      drawToon(x, heroId, pose, anchorX, feetY, EFFECT_R, { light: false });
    }
    const { data } = x.getImageData(0, 0, size, size);
    if (data.length !== size * size * 4) return null;
    const points = [];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        if (data[(py * size + px) * 4 + 3] < 8) continue;
        points.push([px, py]);
        if (px < x0) x0 = px; if (px > x1) x1 = px;
        if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
    }
    if (!points.length) return null;
    return { points, x0, y0, x1, y1, anchorX, feetY };
  } catch { return null; }
}

export function toonEffectEllipse(heroId) {
  if (EFFECT_ELLIPSE.has(heroId)) return EFFECT_ELLIPSE.get(heroId);
  const ink = effectInk(heroId);
  let fit = EFFECT_FALLBACK[heroId] || { cx: 0, cy: -0.5, rx: 0.62, ry: 0.72 };
  if (ink) {
    const mx = (ink.x0 + ink.x1) / 2, my = (ink.y0 + ink.y1) / 2;
    const bx = Math.max(1, (ink.x1 - ink.x0 + 1) / 2);
    const by = Math.max(1, (ink.y1 - ink.y0 + 1) / 2);
    // A bounding box alone does not imply a containing ellipse: ink near a
    // corner can sit outside it. Inflate both axes by the largest normalized
    // radius actually occupied, then add a small glass-to-ink air gap.
    let radial = 1;
    for (const [px, py] of ink.points) {
      radial = Math.max(radial, Math.hypot((px - mx) / bx, (py - my) / by));
    }
    fit = Object.freeze({
      cx: (mx - ink.anchorX) / EFFECT_R,
      cy: (my - ink.feetY) / EFFECT_R,
      rx: bx * radial / EFFECT_R + EFFECT_PAD,
      ry: by * radial / EFFECT_R + EFFECT_PAD,
    });
  } else fit = Object.freeze({ ...fit });
  EFFECT_ELLIPSE.set(heroId, fit);
  return fit;
}

// Head-and-face render fitted to a w-by-h box (HUD cells, portal crops).
// Every hero is scaled and centered so its whole silhouette lands inside the
// box with a hair of breathing room — no clipped hats, ears, or chins.
// ---------------------------------------------------------- the crop's dials
// HOW FAR THE FIT MAY RESCALE A HEAD, and how much air it leaves around it.
//
// The fit normalizes the whole SILHOUETTE into the box — hair, hat, ears and
// all. That is right for a lone portrait and wrong for a ROW of them: a hero
// with spiked hair or side buns has his skull shrunk to make room for them,
// while a bald one is inflated until his head fills the cell, and a HUD strip
// of faces ends up with no consistent scale in it at all. The heads are the
// subject; the hair is not.
//
// So the rescale is CLAMPED. Inside the range every hero is fitted exactly as
// before; at the ends a large silhouette stops shrinking its head and a small
// one stops inflating it, and whatever falls outside the box is cropped —
// which is what a face crop is for, and what the callers' own clips already
// do. `s` is measured against paintFace's own sizing, so 1 is "no rescale".
//
// `pad` is the air. A face crop is fitted to a SQUARE and most of them are
// shown through a CIRCLE — the HUD disc, the portal — so ink fitted flush to
// the box corners lands flush against the rim. The pad is what buys the head
// its clearance there; it is not a margin anybody sees on a square cell.
// The range is narrow on purpose: at 22px what the eye reads is HEAD SIZE, and
// a row of portraits where one skull is a third bigger than the next reads as a
// mistake before it reads as a bald man. Nearly every hero is clamped rather
// than fitted, so the fit's remaining job is the small cells and the wide
// (20x15) crops, where the box is not square and the head has room to breathe.
const CROP_MIN = 0.88, CROP_MAX = 0.94, CROP_PAD = 0.14;
export const FACE_CROP = { min: CROP_MIN, max: CROP_MAX, pad: CROP_PAD };
export function setFaceCrop({ min = CROP_MIN, max = CROP_MAX, pad = CROP_PAD } = {}) {
  FACE_CROP.min = min; FACE_CROP.max = max; FACE_CROP.pad = pad;
}
// --------------------------------------------------------- where the face sits
// THE CROP IS CENTRED ON THE HEAD, NOT ON THE SILHOUETTE. The fit above
// measures every pixel a hero paints — cap brim, plait, ears, hat — and used to
// put the middle of THAT box in the middle of the cell, which centres a
// bounding box rather than a face. Anything hanging off one side dragged the
// face the other way: Lorenzo's cap brim reaches left, so his nose sat right of
// the disc's centre and low in it, and every hero with a tall hat or a fringe
// rode low. In a ROW of round badges that reads as sloppy registration, because
// the circle is the one thing every cell shares.
//
// The head does not have to be measured. paintFace draws it at a KNOWN place —
// the box's centre line, 0.62 of the way down, with a skull radius fixed by the
// rig — so the anchor is arithmetic, not a second fit. The silhouette is still
// what sets the SCALE; it just no longer gets a vote on the centre.
// (Peter, 4 Sep 2026, off a four-way bake-off: skull centre, features centre,
// and features centre with one head size for the whole cast. The skull won —
// the features line sat the face visibly low, and one head size undid Raymn's
// smaller skull and Kiko's headScale, magnifying both.)
//
// Mochi and Chompo have no skull — they are a body with a face on it, drawn by
// a whole nested toon — so their anchor is that body's face line instead. Same
// rule, read off a different painter: the silhouette never gets the vote.
//
// Where paintFace stands a whole-body rig: feet this far down the box, drawn
// this many box-heights tall. Named because faceHeadAnchor has to undo it.
const FACE_BODY_FEET = 1.18, FACE_BODY_H = 1.45;
// WHERE THE FACE IS, in units of box height measured down from the top of the
// box. Horizontally there is nothing to say — paintFace draws every rig on
// x + w / 2, which is the whole point: the centre line is already right, and
// only the silhouette's vote was moving faces off it.
//
// Every number here is read off the painter that uses it rather than dialled by
// eye, so a hero who moves his own head moves this with him.
export function faceHeadAnchor(spec) {
  if (!spec) return null;
  // Humanoid and ray heads are drawn AS heads, at paintFace's own head line.
  if (spec.rig === 'humanoid' || spec.rig === 'ray') return 0.62;
  // The rest are a body with a face on it, drawn by a whole nested drawToon —
  // so their anchor is that body's face line, converted out of drawToon's
  // feet-anchored space. Mochi's face rides 8% of the body height above a
  // centre that sits at -0.4u plus an idle bob, under a 0.9 rig scale taken
  // about her feet (drawPika); the blob rig is the same shape of answer without
  // the scale. Chompo IS the disc and the disc is the face, so hers is the
  // body's own centre (drawDisc).
  if (spec.rig === 'pika') return FACE_BODY_FEET - 0.9 * (0.406 + 0.35 * 0.08) * FACE_BODY_H;
  if (spec.rig === 'blob') return FACE_BODY_FEET - (0.4 + 0.34 * 0.15) * FACE_BODY_H;
  if (spec.rig === 'disc') return FACE_BODY_FEET - 0.44 * FACE_BODY_H;
  return null;
}
export function drawToonFace(ctx, heroId, x, y, w, h, opts = {}) {
  // Same candidate seam as drawToon's: a proposal can be cropped to a HUD cell
  // without being on the roster. The fit cache is keyed by heroId, and a
  // candidate's id is its own, so a candidate measures once like anyone else.
  const spec = opts.spec || TOON_SPECS[heroId];
  if (!spec) return;
  const light = opts.light !== false;
  const fit = faceFit(heroId, spec, light, opts.pal || null, faceContourW(h));
  // paintFace scales everything off h and centers on w/2, so the ink lands at
  // this size and offset regardless of how wide the box is.
  const inkW = fit.w * h, inkH = fit.h * h;
  const air = 1 - FACE_CROP.pad * 2;
  // The silhouette's own answer, which is the shipped one and the fallback for
  // every rig with no skull to anchor on.
  let cx = w / 2 + (fit.x + fit.w / 2 - 0.5) * h;
  let cy = (fit.y + fit.h / 2) * h;
  let s = Math.max(FACE_CROP.min,
    Math.min(FACE_CROP.max, air * w / inkW, air * h / inkH));
  // ...and the head's, which overrides it wherever there is a head. The
  // horizontal anchor is the box's own centre line — paintFace draws every head
  // on it — so this is what takes the cap brim, the ponytail and the axe handle
  // out of the centring. The SCALE above is left alone: the silhouette still
  // says how big the crop is, it just no longer says where it points.
  const anchor = faceHeadAnchor(spec);
  if (anchor != null) {
    cx = w / 2;
    cy = anchor * h;
  }
  ctx.save();
  // Anything the fit deliberately did not measure (see paintFace's `forFit`)
  // now hangs past the box, so the box is also the crop. Every caller already
  // hands this function a cell it owns outright — a HUD slot, a portal crop —
  // so clipping to it can only remove ink that was never promised.
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  // put the measured ink center on the box center, then scale it to fit
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  // Read the scale AFTER the fit, so the floors answer to the size the face
  // actually lands at rather than to the box it was asked for.
  const prevInkScale = inkScale;
  inkScale = drawScale(ctx);
  paintFace(ctx, heroId, spec, 0, 0, w, h, light, opts.pal || null, false, opts.pose || null);
  inkScale = prevInkScale;
  ctx.restore();
}

// Cached supersampled canvases for static small sites. The factor follows the
// render density rather than sitting at a constant 6: a 4K desktop renders at
// 8x, where a fixed 6 would magnify every cached face by a third.
const toonCache = new Map();
let toonCacheSS = 0;
function cached(key, w, h, paint) {
  const SS = bakeSS();
  if (SS !== toonCacheSS) { toonCache.clear(); toonCacheSS = SS; }
  if (toonCache.has(key)) return toonCache.get(key);
  const c = document.createElement('canvas');
  c.width = Math.max(1, w * SS);
  c.height = Math.max(1, h * SS);
  const x = c.getContext('2d');
  x.scale(SS, SS);
  // The bake is blitted back at its logical size, so SS is resolution, not
  // size: the ink floors have to be measured against the logical space here,
  // not against the supersampled one.
  const prevBake = inkBake;
  inkBake = SS;
  paint(x);
  inkBake = prevBake;
  toonCache.set(key, c);
  return c;
}
// `opts` is drawToonFace's own options object, plus a `key` that names the
// variant for the cache. Without the key a second expression would come back as
// whichever of the two was baked first — the cache is keyed on the crop, and the
// crop does not know what face is inside it.
export function toonFaceSprite(heroId, w, h, opts = null) {
  const key = `${heroId}|face|${w}x${h}${opts?.key ? `|${opts.key}` : ''}`;
  return cached(key, w, h, (x) => drawToonFace(x, heroId, 0, 0, w, h, opts || {}));
}
export function toonStandSprite(heroId, w, h) {
  return cached(`${heroId}|stand|${w}x${h}`, w, h, (x) => drawToon(x, heroId, { kind: 'idle', time: 0, grounded: true }, w / 2, h - 0.5, h * 0.96));
}

// Derive a draw pose from the shared Player controller.
// Mirrors run.js useAbility()'s powerPoseT budget for 'eat' — the bite needs
// a full gape/hold/snap (~0.4s via biteWave) to read as an actual bite rather
// than a twitch, longer than the flat 0.3s every other ability flourish gets.
const EAT_POWER_POSE_T = 0.5;
// One kill switch for the production directional-face treatment. This affects
// only ordinary grounded running; set to 0 to restore the previous front-facing
// run faces without touching idle/menu/HUD/cast poses or gallery candidates.
export const RUN_HEAD_TURN = 12;

export function poseFromPlayer(player, t) {
  const hero = player.hero || {};
  const firing = player.powerPoseT > 0;
  const eating = firing && player.powerType === 'eat';
  const flurrying = (player.spannerFlurryT || 0) > 0;
  const smashing = (firing && player.powerType === 'stomp' && player.grounded) || flurrying;
  const airSlideKick = !!player.slideSlamming;
  const forcedSlide = player.rolling || player.compressT > 0;
  const recoveringSlide = player.grounded && (player.slideAmount || 0) > 0;
  // AIRBORNE IS NOT THE SAME AS JUMPING.
  //
  // `kind` was `!grounded ? 'jump' : 'run'`, so the instant you stepped off the
  // end of an island you were drawn tucked with your arms up — the silhouette of
  // someone who has just launched. It reads as a hop, and players reported it as
  // one; there is no hop, the pose was the whole of it.
  //
  // A hero who has spent no jump and was not thrown by a spring did not jump: he
  // ran off an edge. `fell` is that, and it is passed through so a rig can do
  // better with it later.
  const fell = !player.grounded && (player.jumps || 0) === 0 && !player.launched;
  // THE FACE OF SOMEONE WHO DID NOT PLAN THIS. Not derived here — it is a
  // question about where the FLOOR is, and the floor is the run's to know. See
  // RunState.updateFallFace for what it is and what it deliberately excludes
  // (a ramp going down under his feet, a hole he aimed at, a stomp).
  const fallFace = !!player.fallFace;
  // HOW BIG THE FALL IS DECIDES THE POSE, and how fast he is going is how the
  // pose finds out.
  //
  // Stepping off the end of the road above a tunnel is a 47px drop and stepping
  // off an island is 33; drawn tucked with his arms up, either one reads as a
  // hop he never took, which is what got reported as a bug. Falling off the top
  // of a four-step stack is 128px and coming off the end of the sky road is 96,
  // and there the running legs are the wrong picture — that IS a fall.
  //
  // Speed is the measure because it is the one the pose already has, and
  // because it is self-correcting: a short drop never builds any, so he runs the
  // whole way down and lands still running. A long one builds it as he goes, so
  // he runs off the edge and the fall catches up with him a beat later — which
  // is both the truth and the funnier picture. -340 is 64px of fall: clear of
  // the 47 above a tunnel and clear of the 96 off a cloud.
  const FALL_POSE_VY = -340;
  const bigFall = fell && (Number(player.vy) || 0) < FALL_POSE_VY;
  const kind = (airSlideKick || player.sliding || forcedSlide || recoveringSlide) ? 'slide'
    : (!player.grounded && (!fell || bigFall)) ? 'jump' : 'run';
  return {
    kind,
    fell,
    bigFall,
    // An unplanned fall owns the full startled face, not just its wide eyes
    // and open mouth. `expressionFor` already treats faceSurprised as an
    // action face; the raised brow is the extra beat that makes the alarm read
    // clearly while a pit carries the hero down through a dark, busy opening.
    // Rigs without brows still use their own surprise eyes/mouth treatment.
    faceSurprised: fallFace && !airSlideKick,
    browRaise: fallFace && !airSlideKick,
    // The death face, once the run has started its clock. It outranks every
    // expression above - including the startled fall face, which is exactly
    // what the pit's late start is protecting. See Player.deathT.
    deathFace: player.deathT,
    phase: player.anim % 1,
    // The bite's clock has to start at 0 the instant the ability fires, not
    // wherever the run's absolute clock happens to be, or biteWave() opens
    // the mouth mid-cycle instead of from closed.
    time: eating ? (EAT_POWER_POSE_T - player.powerPoseT) : t,
    vy: player.vy,
    grounded: player.grounded,
    // Rolls and Mochi's compression remain immediate ability silhouettes.
    // Ordinary input uses the controller's entry/exit blend.
    // The aerial move is visual-only until contact: force the slide silhouette
    // without changing Player.hitH, so an airborne hero keeps the standing
    // collision box and cannot slide through a hazard for free.
    slideAmount: airSlideKick || forcedSlide ? 1 : Math.max(0, Math.min(1, player.slideAmount || 0)),
    slideDirection: forcedSlide ? 0 : (player.slideDirection || 0),
    // The shipped slide on the humanoid and ray rigs is the POWER SLIDE
    // (bake-off, 2026-08). Ability rolls keep priority — drawHumanoid checks
    // pose.roll first — and the blob/pika/disc rigs never read slideStyle, so
    // they keep their crouch and its whole-figure squash.
    // 'kick' is a KEY IN SLIDE_STYLE_DRAWS, and the two live in different files.
    // Miss the match and the lookup returns undefined, the humanoid falls
    // through to the generic crouch, and the old ducking animation is back in
    // gameplay with every test still green — which is exactly what the
    // duck->slide rename did here. tests/slide-kit.js now asserts the pair.
    slideStyle: kind === 'slide' && !player.rolling
      && ['humanoid', 'ray'].includes(TOON_SPECS[hero.id]?.rig) ? 'kick' : undefined,
    // The contact kick, already shaped into the 0..1 the painter poses from.
    // The player owns the timer and its curve; this side only reads it, the
    // same bargain every other term here keeps.
    slideKick: Math.max(0, Math.min(1, Number(player.slideKick) || 0)),
    airSlideKick,
    squash: Math.max(0, Math.min(1, (player.landedT || 0) / SQUASH_T)),
    // Whichever is stronger. A dash is a hard 0.26; a boost pad is a shallower
    // 0.17 that holds a beat longer, so the two do not read as the same move.
    lean: Math.max(
      player.dashT > 0 ? 0.26 * Math.min(1, player.dashT / 0.2) : 0,
      player.boostT > 0 ? 0.17 * Math.min(1, player.boostT / 0.28) : 0,
    ),
    roll: !!player.rolling,
    // The pole ride. A blend, not a flag: the run hands over how much of the
    // grip has been taken so the arms travel into it — and, separately, how far
    // down the pole he is, so the pose can DEVELOP over the descent (knees
    // bending as the cap comes up, the grin opening) instead of arriving whole.
    cling: Math.max(0, Math.min(1, player.cling || 0)),
    clingRide: Math.max(0, Math.min(1, player.clingRide || 0)),
    float: !!player.floating,
    stomp: !!player.stomping,
    // Which jump face — rolled once per hop by run.js's rollJumpFace and held
    // on the player for the whole hang time, since `kind` stays 'jump' for
    // every frame this pose is airborne. See expressionFor's `jf` lookup.
    jumpFace: player.jumpFace | 0,
    headless: player.headless > 0 || player.fistThrown,
    axeThrown: !!player.axeThrown,
    axeReady: player.abilityCd <= 0,
    // The wide hazard-bite gape and the raised, sighted cannon arm both used
    // to be menu-only flourishes — a real bite or a real shot looked no
    // different from an idle chew or an at-rest carry.
    menuAction: eating ? 'chomp' : (firing && (player.powerType === 'shoot' || player.powerType === 'bow')) ? 'aim' : smashing ? 'smash' : undefined,
    // The bow's handling is BOW_AIM_T long (reach, draw, lower, sling), so its
    // clock runs off that budget rather than the 0.3s every other aim gets.
    actionTime: firing && !eating ? (player.powerType === 'bow' ? BOW_AIM_T : 0.3) - player.powerPoseT : 0,
    headTurn: kind === 'run' ? RUN_HEAD_TURN : 0,
    facing: 1,
  };
}
