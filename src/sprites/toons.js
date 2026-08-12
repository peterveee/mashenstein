// Flat-cartoon vector heroes: one painter for every hero render site.
// Soft dark outlines, flat colors, procedural animation. Resolution
// independent — drawn at device resolution in-run (via pushOverlayDraw)
// and cached/supersampled for tiny static sites (HUD faces, hub NPCs).
// Colors come from HERO_SPRITES palettes so pixel and toon stay in sync.
import { HERO_SPRITES } from './heroes.js';
import { bakeSS, screen, W, H } from '../engine/renderer.js';

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
  fernwick: { rig: 'humanoid', head: 'floppy', mouth: 'smile', back: 'shield', tunic: true, rollDuck: true, slim: true, armDepth: true, hands: true, limbStyle: 'tunic', ears: true },
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
  kiko: { rig: 'humanoid', tall: 1.02, legLength: 1.06, headScale: 0.88, mouthLift: 0.014, eyeLift: 0.008, head: 'buns', mouth: 'smile', slim: true, taper: 0.8, armLift: 0.014, armOut: 0.03, armDepth: true, limbStyle: 'snap', bareArms: true, puffs: true, dress: 'split', waistRise: 0.035, bracers: true, boots: 0.52, kiblast: true, handsFront: true,
    hairCut: 'jaw', fringe: 'twin-pile', bunStubs: 'pair', bunJoin: 'band', ears: true, earStud: true },
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
  grumpos: { rig: 'humanoid', heavy: true, head: 'bald', beard: true, back: 'axe', shoulders: 1.08, taper: 0.58, pecs: true, armDepth: true, tatSide: 1, limbStyle: 'heavy', ears: true, earOut: 0.88 },
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
function taperCtl(top, bot, halfTop, halfBot) {
  return {
    rT: halfTop * 0.5,
    rB: halfBot * 0.62,
    midY: top + (bot - top) * 0.55,
    ctlX: halfTop + (halfBot - halfTop) * TAPER_LEAD,
  };
}
// Half-width of taperTorsoPath at a given y: invert the side's y(t) for t,
// then read its x(t). Belts and hems measure themselves against this —
// assuming a straight box leaves body slivers beside a band meant to sit
// flush, and the curve is not a straight line between the two ends.
function taperHalfAt(y, top, bot, halfTop, halfBot) {
  const { rT, rB, midY, ctlX } = taperCtl(top, bot, halfTop, halfBot);
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
function taperTorsoPath(c, cx, top, bot, halfTop, halfBot) {
  const { rT, rB, midY, ctlX } = taperCtl(top, bot, halfTop, halfBot);
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
// The shadow tint is OUTLINE's ink: contour and shading stay one colour
// family, so a shaded form looks lit rather than dirty.
const SHADOW_INK = '26,16,40';
const HILITE_INK = '255,246,232';
const FORM_A = 0.42;   // shadow alpha at the shadow end of the figure
const HILITE_A = 0.2;  // highlight alpha at the lit end
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
const shade = { on: false, lx: 0, ly: -1, u: 1, lit: 1, g: null };

// Arm the key for one figure. `xSign` is the net horizontal sign the caller
// has already pushed onto the context (facing flip, celebrate spin); negating
// lx against it is what keeps the light in world space. `lit` is 0..1 room
// brightness where this figure is standing — 1 everywhere that has no opinion,
// which is every caller except the concourse. Returns the previous state —
// paintFace nests a whole drawToon inside its own render.
function armLight(u, xSign, on, lit = 1) {
  const prev = { on: shade.on, lx: shade.lx, ly: shade.ly, u: shade.u, lit: shade.lit, g: shade.g };
  shade.on = !!on;
  shade.u = u;
  shade.lx = (LIGHT_X / LIGHT_LEN) * (xSign < 0 ? -1 : 1);
  shade.ly = LIGHT_Y / LIGHT_LEN;
  shade.lit = Math.max(0, Math.min(1, lit));
  shade.g = null;
  return prev;
}
function disarmLight(prev) {
  shade.on = prev.on; shade.lx = prev.lx; shade.ly = prev.ly;
  shade.u = prev.u; shade.lit = prev.lit; shade.g = prev.g;
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
  const u = shade.u;
  const cx = 0, cy = FIELD_CY * u, r = FIELD_R * u;
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
  core.addColorStop(0.46, `rgba(${SHADOW_INK},${sh(0)})`);
  core.addColorStop(0.74, `rgba(${SHADOW_INK},${sh(FORM_A * 0.38)})`);
  core.addColorStop(1, `rgba(${SHADOW_INK},${sh(FORM_A)})`);
  const lit = ctx.createLinearGradient(ax, ay, bx, by);
  lit.addColorStop(0, `rgba(${HILITE_INK},${hi(HILITE_A)})`);
  lit.addColorStop(0.4, `rgba(${HILITE_INK},0)`);
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
function limb2(ctx, x1, y1, x2, y2, seg, dir, w, fill, ow, w2 = w, flushRoot = false, seg2 = seg) {
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
  const g = fieldRamps(ctx);
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
    ctx.strokeStyle = g.core; ctx.stroke();
    ctx.strokeStyle = g.lit; ctx.stroke();
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
// hero can want one without the other: fernwick keeps his shipped leg swing
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
const FACE_SEED = { lorenzo: 0.2, gnash: 1.1, fernwick: 2.4, b33p: 3.2, mochi: 4.1, chompo: 5.3, gary: 0.8, raymn: 2.9, grumpos: 4.7, dolores: 1.7, kiko: 1.9 };

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
};
// How high the signature bounce carries each hero. The light ones leave the
// floor; Grumpos and the robot mostly rock in place.
// (default 0.055). Kiko sits under it deliberately: she is athletic enough to
// leave the floor and the point is that she does not.
const CELEBRATE_BOUNCE = { mochi: 0.15, chompo: 0.11, lorenzo: 0.09, raymn: 0.07, grumpos: 0.03, b33p: 0.035, kiko: 0.04 };
const CEL_CYCLE = 2.6, CEL_SIG = 0.6; // seconds per loop; fraction on the signature
// One-switch rollback for the shipped celebration redesign. Callers normally
// omit celebrateStyle and inherit this value; the gallery's before column asks
// for `legacy` explicitly so the approved A/B remains available for reference.
export const ACTIVE_CELEBRATION_STYLE = 'reworked';
const usesReworkedCelebration = (pose) =>
  (pose && pose.celebrateStyle ? pose.celebrateStyle : ACTIVE_CELEBRATION_STYLE) === 'reworked';

// Jump/duck motion has the same one-switch escape hatch as celebrations. The
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
  // gait term below is neutral, `path` sends him back down gaitFoot, and what
  // he keeps from the port is the FOOT — a real heel strike and toe-off in
  // place of a flat oval — plus the rebuilt jump and the arm timing, neither
  // of which is a leg. contact 0.5 because that is where gaitFoot's stance
  // ends; at the spec's 0.46 the roll would unwind against his own footfall.
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
  fernwick: 'shield roll',
  b33p: 'cannon aim',
  mochi: 'float and squish',
  raymn: 'rocket-fist toss',
  grumpos: 'menu flex',
  kiko: 'warning shot',
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
  if (id === 'fernwick') { patch.kind = 'duck'; patch.roll = true; }
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

function celebrateMotion(id, t, reworked = false) {
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
    gnash: 'stepturn', fernwick: 'present', b33p: 'salute',
  }[id] : null;
  const move = proposedMove || CELEBRATE_MOVE[id] || 'hop';
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

function expressionFor(id, pose = {}, spec = null) {
  const t = pose.time || 0;
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
  const active = pose.kind === 'jump' || pose.kind === 'duck' || pose.kind === 'celebrate' || pose.stomp || pose.roll || pose.float;
  // The pole ride is the moment the stage is WON, and the face is the only part
  // of the hero that can say so — the body is busy holding on. It borrows the
  // JUMP pose to hang off, though, and an ordinary jump wears one of a handful
  // of jump faces (see the `jf` lookup below). Clinging overrides all of that
  // with the celebration face instead, held for the length of the slide.
  const clinging = clingAmount(pose) > 0.35;
  // Face-only moods let a running cameo react without switching its body into
  // a celebration animation. Production poses do not set these flags.
  // jumpFace 1 ("excited") also lands here — see the `jf` variant lookup below.
  const joy = pose.kind === 'celebrate' || !!pose.faceJoy || clinging
    || (pose.kind === 'jump' && !pose.stomp && !clinging && (pose.jumpFace | 0) === 1);
  // Celebrating faces ride the routine: at the top of a bounce the grin opens
  // into a full cheer, and between beats the eyes squeeze shut, delighted.
  const reworkedCelebration = joy && usesReworkedCelebration(pose);
  const cm = joy ? celebrateMotion(id, t, reworkedCelebration) : null;
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
    focus: pose.kind === 'run' || pose.kind === 'duck' || pose.roll || jf === 2,
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
    mood: id === 'gnash' || id === 'raymn' ? 'cocky'
      : id === 'fernwick' ? 'bright'
      : id === 'b33p' ? 'robot'
      : id === 'grumpos' ? 'gruff'
      : id === 'lorenzo' ? 'worried' : 'soft',
  };
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
    dot(ctx, eyeX(sx) + lookX, cy + lookY, 0.026 * u, p.e);
  }
  // `brow` opts a face out of the shipped hairlines: 'none' draws nothing,
  // 'bushy' means drawHead paints hair brows over the top instead.
  if (!lod && !ex.brow && ex.mood !== 'bright' && !ex.relaxed && (ex.annoyed || ex.calling || ex.hmph || ex.focus || ex.browRaise || ex.mood === 'cocky' || ex.mood === 'gruff')) {
    // Fernwick (mood 'bright') draws NO brows — a bare, open brow keeps him
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
};

// Head + hat + face, anchored at head center (hx, hy). Shared by the body
// rig and the face-crop sprites.
function drawHead(ctx, id, spec, p, u, ow, hx, hy, lod, pose = {}) {
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
    || spec.head === 'buns';
  // Looked up out here rather than beside the fringe it mostly describes,
  // because `pile` belongs to BOTH halves of the hair: the mass behind the skull
  // and the fringe on it have to rise together or the extra volume is a fringe
  // sitting proud of its own hairline.
  const fr = FRINGES[spec.fringe] || FRINGES.sweep;
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
  if (spec.head === 'floppy') {
    // A single long pointed tail streams behind from the back of the bandana,
    // tapering to a tip that lags and bobs with motion. Drawn BEHIND the head
    // so it reads as gathered at the back and trailing out to the side.
    const motion = pose.kind === 'run' || pose.kind === 'jump';
    const wave = motion ? Math.sin((pose.time || 0) * 7) * R * 0.2 : 0;
    // At rest the long tail drapes down his back under its own weight; running
    // and jumping fling it out behind him.
    const tipX = hx - R * (motion ? 1.86 : 0.98);
    const tipY = hy + R * (motion ? 0.52 : 1.06) + wave;
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 0.66, hy - R * 0.8);                                 // wide root at the back of the bandana
      c.quadraticCurveTo(hx - R * (motion ? 1.4 : 1.26), hy + R * (motion ? -0.14 : 0.22) + wave, tipX, tipY); // outer edge draping down to the point
      c.quadraticCurveTo(hx - R * (motion ? 1.24 : 0.68), hy + R * (motion ? 0.44 : 0.62) + wave, hx - R * 0.42, hy - R * 0.16); // fuller inner edge back to the bandana
      c.closePath();
    });
    if (!lod) dot(ctx, tipX, tipY, R * 0.12, p.a);
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
    const tucked = pose.kind === 'duck';
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
    if (spec.head === 'braid') {
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
      const bound = motion ? wave * 2.1 : wave;
      const tipX = hx - R * (portrait ? 1.32 : motion ? 1.3 : tucked ? 1.42 : 1.05);
      const tipY = hy + R * (portrait ? 1.34 : motion ? 3.0 : tucked ? 1.08 : 2.62) + bound;
      const ctlX = hx - R * (portrait ? 1.22 : motion ? 1.3 : tucked ? 1.16 : 1.02);
      const ctlY = hy + R * (portrait ? 0.62 : motion ? 1.5 : tucked ? 0.5 : 1.4) + bound * 0.4;
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
        const trail = motion ? -R * 0.46 * len : 0;
        const tipX = bx + sx * R * 0.4 * len + trail + wave * 0.45;
        const tipY = hy + R * (motion ? 1.62 : 1.85) * len + wave * (near ? 0.45 : 0.28);
        const ctlX = bx + sx * R * (motion ? 0.62 : 0.9) * len + trail * 0.3 - wave * 0.38;
        const ctlY = hy + R * (motion ? 0.76 : 0.82) * len;
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
  if (spec.plumber || spec.ears) {
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
    outlined(ctx, spec.head === 'dome' || spec.head === 'jackal' ? p.h : p.s, ow, (c) => c.arc(hx, hy, R, 0, Math.PI * 2));
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
    outlined(ctx, p.a, ow, (c) => {
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
    // green bandana covering the crown like a do-rag; its front hem rides high
    // over the middle so plenty of blond bangs show, then arcs down on either
    // side toward the temples. Ribbon ends trail behind (drawn above).
    outlined(ctx, p.h, ow, (c) => {
      c.moveTo(hx - R * 1.02, hy - R * 0.22);
      c.quadraticCurveTo(hx, hy - R * 1.18, hx + R * 1.02, hy - R * 0.22);        // front hem: very high center (lots of bangs), arcing down and just past each side
      c.quadraticCurveTo(hx + R * 1.16, hy - R * 0.72, hx + R * 0.48, hy - R * 1.16); // over the crown, right side
      c.quadraticCurveTo(hx, hy - R * 1.36, hx - R * 0.48, hy - R * 1.16);        // crown top
      c.quadraticCurveTo(hx - R * 1.16, hy - R * 0.72, hx - R * 1.02, hy - R * 0.22); // down the left side
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
    const LOCKS = !fr.tendrils ? [] : [
      // In front of the far ear, where the hairline is lowest and there is no face
      // underneath: the only locks that may fall past the eye.
      [0.02, 0.2, 0.08, 0.42],
      ...(fr.twin
        ? WTIPS.map(([bias, drop], k) => [WROOTS[k], WROOTS[k + 1], bias, drop])
        : [[0.78, 1.12, 0.0, 0.32]]),
      [1.82, 1.99, -0.1, 0.46],
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
  if (spec.head === 'jackal') {
    // Front-facing muzzle matches the paired eyes; the ears, cheek tuft and
    // tail carry the animal silhouette without mixing profile/front views.
    outlined(ctx, p.s, hair(0.6, ow * 0.7), (c) => c.ellipse(hx + R * 0.08, hy + R * 0.4, R * 0.7, R * 0.46, 0, 0, Math.PI * 2));
    dot(ctx, hx + R * 0.08, hy + R * 0.16, R * 0.17, p.e);
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
  const ex = expressionFor(id, pose, spec);
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
  // Fernwick's eyes sit a touch lower, giving him a taller, more childlike brow.
  // `eyeLift` is the same dial pointing the other way, and a spec field rather
  // than a hero id because it belongs to a FACE rather than to a name — it moves
  // the whole mask (brows ride the same line), so eyes and mouth can be set
  // against each other rather than each against the skull.
  const eyeY = hy - (id === 'fernwick' ? -0.018 : 0.015) * u - (spec.eyeLift || 0) * u;
  drawEyes(ctx, p, u, hx + 0.01 * u, eyeY, lod, faceEx);
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
  if (spec.mustache && !lod) {
    // Two buoyant lobes give Lorenzo a readable expression instead of a flat
    // strip pasted beneath the nose. Mid-celebration the grin under them pushes
    // the whole thing up and flicks the tips higher, the way a real smile does.
    // The lobes ride the same joyAmt as the grin under them, so the mustache
    // lifts in step with the smile it is framing.
    const mAmt = ex.joy ? (ex.cheer ? (ex.joyAmt == null ? 1 : ex.joyAmt) : 0) : 0;
    const lift = ex.joy ? (0.012 + 0.01 * mAmt) * u : 0;
    const tip = ex.joy ? (0.014 + 0.012 * mAmt) * u : 0;
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
    if (ex.surprise) {
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
    const mouthY = hy + 0.11 * u * (spec.headScale || 1) - (spec.mouthLift || 0) * u;
    drawMouth(ctx, spec, p, u, hx + 0.01 * u, mouthY, ow, ex);
  }
  if (faceDy) ctx.restore();
  if (faceDepth > 0.001) ctx.restore();
  if (outlineDepth > 0.001) ctx.restore();
}

// ---------------------------------------------------------------- rigs
function drawHumanoid(ctx, id, spec, p, pose, u, ow, lod) {
  if (pose.kind === 'duck' && pose.roll) return drawRoll(ctx, spec, p, pose, u, ow);
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
    ? celebrateMotion(id, pose.time || 0, usesReworkedCelebration(pose))
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
  // are the same length standing, ducking and airborne, so lengthening them
  // for the gait alone would change his proportions the moment he stopped.
  const legL = (heavy ? 0.4 : spec.stout ? 0.27 : 0.3) * u
    * (spec.legLength || 1) * (spec.tall || 1) * (L ? L.legLen : 1);
  // Front-on hip half-separation, and how far outboard of it the crouch plants
  // its feet. Both in u; the crouch's leg length is solved against them.
  const HIP_HALF = 0.095;
  const DUCK_SPREAD = 0.215;
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
  const duck = !clung && pose.kind === 'duck';
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
  const stand = !run && !jump && !duck;
  // Poses whose legs are genuinely symmetric about the body: each leg roots at
  // its own hip and the shoes read as front-facing ovals. The crouch belongs
  // here with standing and the victory hop — only running and jumping are
  // profile gaits with one leg crossing the body.
  const frontLegs = stand || duck;
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
  // hero gives up the same FRACTION of her height ducking that everyone else
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
  if (duck) {
    // The crouch used to drop every hero to the same flat height, which is not
    // the same thing as every hero crouching by the same amount: grumpos stands
    // a head taller than the rest (-0.978u vs -0.76u), so landing on a shared
    // -0.42u folded him to 43% of his standing height where the stout heroes
    // only gave up 45%. He read as a boulder with a face on it. The heavy rig
    // crouches to the same FRACTION of its OWN height instead, so he stays
    // visibly the biggest hero on the screen even ducking.
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
  const torsoPath = turned
    ? (c) => turnedTorsoPath(c, torsoCx, torsoTop, torsoBot, torsoHalf, waistHalf, turnYaw)
    : spec.taper
      ? (c) => taperTorsoPath(c, torsoCx, torsoTop, torsoBot, torsoHalf, waistHalf)
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
    : duck && enhancedMotion ? 0.025 * u : 0; // crouch puts weight over the toes
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
  // full 0.56 bone that put fernwick's lifted thigh 0.067u past the edge of his
  // tunic mid-swing, a brown wedge apparently floating outside the cloth. A
  // shorter bone is the only lever that touches it: stride and foot lift barely
  // move the bulge, because it points across the leg rather than along it.
  let legSeg = (duck ? 0.2 : heavy ? 0.42 : spec.tunic ? 0.44 : 0.56) * legL + 0.02 * u;
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
      footF = [
        (0.1 + 0.05 * airApex + 0.05 * airFall) * u,
        hipY + legL * (0.32 + 0.1 * airRise - 0.06 * airApex + 0.46 * airFall),
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
  } else if (duck) {
    // A crouch is a FRONT-ON pose, like standing and the victory hop — not a
    // profile one. Rooted at a shared center hip (the profile rig) the two legs
    // left that point as straight diagonals to feet 0.19u either side: a hard X
    // under the body that reads as crossed legs, because at this scale a
    // straight limb carries no knee to say otherwise. Each leg now hangs off
    // its OWN hip (see frontLegs) with the feet planted just outboard of it.
    footF = [DUCK_SPREAD * u, 0]; footB = [-DUCK_SPREAD * u, 0]; kneeB = -1;
    // Sized off the real hip-to-ankle run, then let out ~30% so the crouch
    // actually folds: the slack becomes the sideways bow of the knee, which is
    // the whole silhouette of a squat. Locked to the old flat 0.2*legL the leg
    // couldn't even reach the foot and straightened out again.
    legSeg = Math.hypot(DUCK_SPREAD * u - HIP_HALF * u, Math.abs(hipY) - ankleLift) / 2 * 1.3;
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
    footF = [(0.1 + 0.07 * air) * u, -air * 0.4 * legL];
    footB = [-(0.1 + 0.07 * air) * u, -air * 0.4 * legL];
    kneeB = -1;
    // Grounded beats keep the stand's near-straight hang; the segment eases
    // back to full length as the feet tuck so the knees get room to bend.
    legSeg = legSeg * air + (Math.hypot(0.01 * u, Math.abs(hipY) - ankleLift) / 2 + 0.001 * u) * (1 - air);
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
  const hipSplit = styledGait ? hipSplitAmt * u : 0;
  const hipNearX = hipRun + nearSign * hipSeparation + sideF * hipSplit;
  const hipFarX = hipRun - nearSign * hipSeparation + sideB * hipSplit;
  // Running thighs leave from the underside of the pelvis. Starting them at
  // hipY put their round caps over the belly, creating the giant crotch ball
  // exposed by the no-skirt anatomy view.
  const legRootY = turned && run ? hipY + 0.052 * u : hipY;
  // ...and the pelvis has DEPTH as well as width: the near hip sits a little
  // low and forward of the far one, which is the same receding-side cue the
  // arms and torso already carry, finally reaching the legs.
  const legRootYF = legRootY + (styledGait ? 0.006 * u * hipDepthAmt : 0);
  const legRootYB = legRootY + (styledGait ? -0.014 * u * hipDepthAmt : 0);
  if (turned && run) {
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
      ? taperHalfAt(armYF, torsoTop, torsoBot, torsoHalf, waistHalf)
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
  const shF = (turned
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
  // The sidearm's angle while it is OUT of the holster, or null while it is in
  // one. Same arrangement as wrenchAngle: the prop rides the hand, and this is
  // the only thing the pose has to say about it. `pistolAngleB` is the off
  // hand's, for a hero who carries two — it is a separate variable rather than
  // a flag because the two hands are drawn in different PASSES (the far arm
  // goes down behind the torso, the near one over it), so each has to be able
  // to arm its own prop where its own limb lands.
  let pistolAngle = null, pistolAngleB = null;
  // Where the ki ball sits and how far into its throw it is, as [x, y, grow, q],
  // or null when she is not throwing one.
  let kiBlast = null;
  // Where Fernwick's shield rides while the victory routine has it off his
  // back, as [x, y]. Null the rest of the time, which is also the flag the
  // back-slung disc and the draw order below both test.
  let celShield = null;
  if (pose.kind === 'celebrate') {
    // Victory choreography, one flavor per hero.
    const ct = pose.time || 0;
    const pump = Math.sin(ct * 6) * 0.05 * u;
    // Reworked raised-arm routines for the two characters whose hands crowded
    // the head. `legacy` remains selectable in the gallery through the shared
    // celebration-style switch above.
    const raisedArmStudy = reworkedCelebration;
    if (id === 'fernwick' && raisedArmStudy) {
      // SHIELD UP. The "champion's clasp" this replaces met both hands at
      // x = ±0.05u and 0.95 of the arm overhead, which on this rig is dead
      // centre of his own face: the shoulder sits at -0.5u with 0.286u of
      // reach, so a hand tops out at -0.786u while his crown is at -0.97u.
      // NO overhead clasp can clear the head here — it was never a matter of
      // dialling the target — and both forearms crossed his eyes for the
      // 1.56s the signature holds. So the near arm throws the SHIELD up and
      // out at full extension instead, where the whole disc reads against the
      // background, and the far fist pumps outboard of the cap.
      handF = reach(shF, armY, [shF + sideF * 0.3 * u, armY - armL * 0.72 + pump]);
      elbF = -sideF;
      handB = reach(shB, armY, [shB + sideB * 0.26 * u, armY - armL * 0.62 - pump * 0.5]);
      elbB = -sideB;
      // The prop rides the gripping hand, so it can never drift off it — but a
      // LITTLE past the fist, along the arm's own axis. Centred exactly on the
      // hand a 0.15u disc swallows the whole forearm, and what is left reads as
      // a gong hanging in the air beside him rather than a shield he is holding.
      const gripX = handF[0] - shF, gripY = handF[1] - armY;
      const gripLen = Math.hypot(gripX, gripY) || 1;
      celShield = [
        handF[0] + (gripX / gripLen) * 0.055 * u,
        handF[1] + (gripY / gripLen) * 0.055 * u,
      ];
    } else if (id === 'fernwick') {
      // champion's clasp: both hands meet overhead
      handF = [sideF * 0.05 * u, armY - armL * 0.95 + pump]; elbF = sideF;
      handB = [sideB * 0.05 * u, armY - armL * 0.95 + pump]; elbB = sideB;
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
    // One frame of the eight — 3/8, the deepest part of the near arm's
    // backswing — sat with the elbow more bent than either neighbour. Reaching
    // a little further from the shoulder opens the joint. The window is a
    // raised cosine two frames wide either side, so 2/8 and 4/8 take half the
    // correction and nothing pops on the frames outside it.
    let openF = 0;
    if (styledGait) {
      let dp = ((pose.phase || 0) - 0.375) % 1;
      if (dp > 0.5) dp -= 1;
      if (dp < -0.5) dp += 1;
      if (Math.abs(dp) < 0.25) openF = 0.5 + 0.5 * Math.cos(dp * Math.PI * 4);
    }
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
      const lead = depthRun ? -0.04 * u : 0.05 * u;
      // NOTE: `walk` stops at the waist on this branch. The turned three-quarter
      // arms above scale their swing by it; these front-on ones do not, because
      // the only caller that has ever set the flag (the grumpos walk study in
      // tools/gallery-entry.js) is turned and never reaches here. Any future
      // front-on `walk` caller has to scale `swing` and `farSwing` — roughly the
      // 0.5 the turned branch chose — or it gets half-length strides under a
      // full sprint arm pump.
      const swing = (depthRun ? 0.13 : 0.15) * u;
      // How far below the shoulder the hand rides. The heavy rig hangs DEEPER.
      // At 0.5 its hand sat only 0.15u under the shoulder while swinging 0.17u
      // behind it, so the shoulder-to-hand chord ran at 45 degrees — and a
      // two-bone solver puts the elbow perpendicular to that chord, which left
      // it nowhere to go but UP. The joint cleared the shoulder by 0.057u at
      // the top of the backswing, throwing the whole arm into a high chicken
      // wing. A steeper chord turns that perpendicular outward instead, and the
      // elbow stays under the shoulder for the entire cycle.
      const hang = depthArms ? 0.72 : 0.5;
      handF = [shF + lead + swing * sw, armY + armL * (hang + 0.075 * openF) - 0.04 * u * Math.abs(sw)];
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
  } else if (duck) {
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
    const pr = torsoHalf * 0.56;
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
  const handDeco = (x, y, back = 0) => {
    if (id === 'grumpos') {
      outlined(ctx, recede(p.g, back), hair(0.5, ow * 0.55), (c) => c.arc(x, y, 0.058 * u, 0, Math.PI * 2));
      dot(ctx, x, y, 0.028 * u, recede(p.s, back));
    } else if (spec.plumber) {
      outlined(ctx, recede(p.w, back), hair(0.5, ow * 0.6), (c) => c.arc(x, y, 0.052 * u, 0, Math.PI * 2));
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
      outlined(ctx, recede(p.ribbon || p.w, back), hair(0.5, ow * 0.6), (c) => c.arc(x, y, br, 0, Math.PI * 2));
      outlined(ctx, recede(p.hand || p.s, back), hair(0.45, ow * 0.5), (c) => c.arc(x, y, armW * 0.5, 0, Math.PI * 2));
    } else if (spec.gloves) {
      // Fingerless gloves: a leather cuff with the hand still skin on top of
      // it. Drawn as two concentric discs rather than as a band across the
      // wrist, because handDeco is handed a POINT and not a direction — a
      // directional band would need the forearm's angle threaded through every
      // caller, and a ring reads the same at every one of them.
      outlined(ctx, recede(p.w, back), hair(0.5, ow * 0.6), (c) => c.arc(x, y, armW * 0.8, 0, Math.PI * 2));
      outlined(ctx, recede(p.hand || p.s, back), hair(0.45, ow * 0.5), (c) => c.arc(x, y, armW * 0.56, 0, Math.PI * 2));
    } else if (spec.hands) {
      // Bare hands in the face's own color. Without them the sleeve simply
      // stops: the arm is one flat slab of tunic from shoulder to fingertip,
      // and at this scale a limb ending in a blunt cap reads as unfinished.
      // Sized off armW rather than fixed, so the slim rig gets a hand in
      // proportion to the arm it terminates instead of a mitt on a twig.
      // `p.hand` opts a palette out of the face-colour default — see b33p,
      // whose face is a near-black plate that reads as a hole on a grey arm.
      outlined(ctx, recede(p.hand || p.s, back), hair(0.5, ow * 0.6), (c) => c.arc(x, y, armW * 0.62, 0, Math.PI * 2));
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
  // A singlet's shoulder is BARE, so the cap that buries the arm root there has
  // to be skin. Left at the shirt colour it painted an olive disc onto her
  // shoulder every frame the near arm drew in front — which is exactly the
  // "cap intersecting the upper arm" you can see in a run: the cap works by
  // being invisible against what it sits on, and it can only do that if it is
  // the same colour as what it sits on. It lands above the armpit line, inside
  // the cut, so with a tank it is always in bare skin.
  const shoulderCap = (x, y, fill = spec.tank ? p.s : id === 'grumpos' ? p.s : p.b) => {
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
      ? taperHalfAt(yy, torsoTop, torsoBot, torsoHalf, waistHalf)
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
    const g = formRamps(ctx, torsoPath);
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
    if (g) { ctx.fillStyle = g.core; ctx.fill(); ctx.fillStyle = g.lit; ctx.fill(); }
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
  if (spec.tail) {
    const wag = Math.sin((pose.time || 0) * (run ? 8 : 2.6)) * 0.045 * u;
    const baseX = -torsoHalf * 0.65, baseY = hipY - 0.02 * u;
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
  }
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
  // Thigh holster, laid ALONG the thigh: the context rotates so local +y runs
  // down the bone, and every offset below is read in that frame. `drawn` empties
  // it — the gun cannot be in her hand and in the holster at the same time.
  const thighHolster = (hipX, rootY, foot, kneeDir, w, shadeAmt, drawn) => {
    const [kx, ky] = kneeAt(hipX, rootY, foot, kneeDir);
    // Low on the thigh, near the knee. Up at the hip — where the first cut put
    // it — the pouch, the belt and the belt's own pouch stack into one band of
    // leather across the waist and the character loses her whole midsection to
    // it. A thigh rig hangs where it does for the same reason: so the hand can
    // reach it past the belt, not through it.
    const t = 0.74;
    const ang = Math.atan2(ky - rootY, kx - hipX);
    ctx.save();
    ctx.translate(hipX + (kx - hipX) * t, rootY + (ky - rootY) * t);
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
  };
  const holsterDrawn = pistolAngle != null;

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
  // How far the near arm seats INBOARD and BELOW the raw shoulder point. It is
  // applied as a translate around the whole limb — root, hand, glove and
  // shoulder cap move as one piece — rather than by nudging shF/armYF, which
  // would leave the hand targets behind and pivot the arm about the wrist
  // instead of shifting it.
  // Signed off sideF (the near arm's outward direction), not off screen x, so
  // it stays inboard when a negative yaw mirrors the rig.
  const ARM_SEAT_IN = 0.022, ARM_SEAT_DOWN = 0.02;
  const drawFrontArm = () => {
    // The victory routine is choreographed as a mirrored PAIR — fernwick's
    // hands clasp overhead, grumpos claps — so seating one arm of it breaks
    // the join. Left alone there.
    // Front-on stand and duck are mirrored pairs for the same reason: both
    // arms hang off the same hand targets, reflected about the body, and both
    // draw at the same depth. Seating one of them there drops the near hand
    // 0.02u below its twin and pulls it 0.022u inboard — every hero standing
    // with one arm visibly lower than the other. The seat is a NEAR-arm cue,
    // so it needs the arm to actually be staged in front: a turn, or a gait
    // that paints it over the torso.
    const seat = pose.kind !== 'celebrate' && !(frontLegs && !turned);
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
      else limb2(ctx, shF, armYF, handF[0], handF[1], armSeg, elbF, armWF, armFill, ow, armWF, true);
      // For a SLEEVED hero the cap goes first and the sleeve covers it. In the
      // shipped order — cap last, after everything — it painted on top of the
      // puff, and a disc lit on the torso's ramp sitting on a sleeve lit on its
      // own is a visible circle on her shoulder. Order is the whole fix: the
      // cap buries the arm's root, the sleeve covers the shoulder, and they
      // have to happen in that order for both to disappear. Everyone else keeps
      // the shipped order exactly (see the call at the end of this block).
      if (spec.puffs) shoulderCap(shF, armYF);
      drawPuff(shF, armYF, handF, armSeg, elbF, armSegF);
      if (wrenchAngle != null) drawWrench(ctx, handF[0], handF[1], wrenchAngle, u, ow);
      // Gun under the hand, flash over it. The prop goes down first so the
      // glove covers the top of the grip and reads as holding it; the flash is
      // the last mark on the figure because it is light, not an object.
      if (pistolAngle != null) drawPistol(ctx, handF[0], handF[1], pistolAngle, u, ow, p);
      handDeco(handF[0], handF[1]);
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
      if (!spec.puffs) shoulderCap(shF, armYF);
    }
    ctx.restore();
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
    const axx = run || jump ? 0.025 * u : 0;
    // Lifted clear of the near arm: on the depth rig that arm swings up the
    // same screen-left side the axe is slung on, and at the top of the upswing
    // the elbow was grazing the haft.
    const axy = shoulderY - 0.05 * u;
    limb(ctx, axx + 0.08 * u, axy + 0.12 * u, axx - 0.33 * u, axy - 0.24 * u, 0.06 * u, p.w, ow);
    outlined(ctx, '#b8d8f0', ow, (c) => {
      c.moveTo(axx - 0.34 * u, axy - 0.3 * u);
      c.quadraticCurveTo(axx - 0.54 * u, axy - 0.16 * u, axx - 0.41 * u, axy + 0.03 * u);
      c.lineTo(axx - 0.27 * u, axy - 0.04 * u);
      c.lineTo(axx - 0.24 * u, axy - 0.25 * u);
      c.closePath();
    });
    if (!lod) {
      ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = hair(0.6, ow * 0.55);
      ctx.beginPath(); ctx.moveTo(axx - 0.44 * u, axy - 0.16 * u); ctx.lineTo(axx - 0.3 * u, axy - 0.1 * u); ctx.stroke();
    }
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
  if (spec.back === 'shield' && !celShield) {
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
  if (!clapFront && !armsInFront) {
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
    handDeco(handB[0], handB[1], farShade);
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
  if (id === 'grumpos' && turned && !duck) {
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
  outlined(ctx, p.b, heavy ? ow * 0.65 : ow, torsoPath, heavy ? 'rgba(26,16,40,0.15)' : OUTLINE);
  // Where the waist is, for anyone who needs it. The belt rides the run bob
  // like the torso does — pinned to a static hipY it detaches from a bobbing
  // body — so trousers and belt have to share one number or the colour seam
  // and the strap that is meant to cover it drift apart mid-stride.
  // `beltDrop` lowers it, in u. A belt worn on the hips rather than the waist
  // is what opens a sliver of midriff under a top that has not moved — and it
  // moves the TROUSER FILL with it, because they are one seam: the belt exists
  // to sit on that colour change and hide it, so anything that separates the
  // two puts a line of shirt colour under the leather.
  const beltY = hipY - (0.085 - (spec.beltDrop || 0)) * u + bob;
  if (spec.tank && !duck) {
    // A SINGLET: two narrow straps over bare shoulders and a deep V. Three cuts
    // do it — the neckline, and one armhole per side that takes the whole
    // shoulder corner out — and the straps are what is left between them.
    //
    // The constraint worth stating, because it sets every number here: the
    // torso is 0.3u across. A strap with skin either side of it is one to two
    // pixels of each at hero size, so this reads as a drawn garment at study
    // scale and as a suggestion of one in a lane. The straps are therefore as
    // narrow as they can be while still being a band rather than a line, and
    // the armhole is cut deep — the DIAGONAL is what carries the read, not the
    // sliver of skin outboard of the strap.
    //
    // Painted as skin over the shirt and clipped to the torso, like the trouser
    // fill and the midriff: the silhouette never moves, only the colour map.
    // And the bare shoulder runs straight into the bare arm on purpose — they
    // are the same skin, so the strap reads as a band laid over one continuous
    // shoulder instead of as a shape butted against a sleeve.
    const px = torsoCx;
    const top = torsoTop - 0.02 * u;
    // How deep the armhole goes, and this is the number the jump pose polices.
    // The cut is STATIC — it is a hole in the shirt, and it has to be, because
    // a shoulder does not move much whatever the forearm does. But cut too deep
    // it stops describing a shoulder and starts describing ribs, and the moment
    // the arm swings away from the body (a jump throws it up and forward) what
    // is left behind is a large skin-coloured wedge attached to nothing: a bite
    // out of her top rather than a bare shoulder.
    //
    // The arm sockets at 0.18 of the torso's height, so the bare region belongs
    // in the top third and no lower. ARM showing is bought from the STRAP being
    // narrow, not from the armhole being deep — that was the wrong lever, and
    // 0.5 was deep enough to leave the hole visible in every airborne frame.
    const armpitY = torsoTop + (torsoBot - torsoTop) * 0.27;
    const vHalf = torsoHalf * 0.32;
    const vDepth = torsoTop + (torsoBot - torsoTop) * 0.32;
    const strapOuter = torsoHalf * 0.66;
    const seams = [];
    const cuts = [];
    // The neckline — deep, and cut as a soft-shouldered V rather than a hard
    // wedge: straight walls to a point put a spike in the middle of her chest.
    cuts.push((c) => {
      c.moveTo(px - vHalf, top);
      c.lineTo(px + vHalf, top);
      c.quadraticCurveTo(px + vHalf * 0.42, vDepth * 0.55 + torsoTop * 0.45, px, vDepth);
      c.quadraticCurveTo(px - vHalf * 0.42, vDepth * 0.55 + torsoTop * 0.45, px - vHalf, top);
      c.closePath();
    });
    seams.push((c) => {
      c.moveTo(px - vHalf, top);
      c.quadraticCurveTo(px - vHalf * 0.42, vDepth * 0.55 + torsoTop * 0.45, px, vDepth);
      c.quadraticCurveTo(px + vHalf * 0.42, vDepth * 0.55 + torsoTop * 0.45, px + vHalf, top);
    });
    // The armholes: from the strap's outer edge, bulging outward and down past
    // the body's edge, so the whole shoulder corner comes out.
    for (const sgn of [-1, 1]) {
      const arc = (c) => {
        c.moveTo(px + sgn * strapOuter, top);
        // A SCOOP, concave toward the body — the sports-bra armhole rather than
        // a corner sliced off on a diagonal. The straight/outboard version left
        // a hard edge running across exactly the space the upper arm occupies,
        // which is what read as the shirt cutting through her arm: a garment
        // edge that crosses a limb has to be a curve leaving it, not a chord
        // through it. Curving inboard also narrows the strap toward the
        // shoulder the way a real one tapers, so the strap and the scoop are
        // one shape instead of two decisions.
        c.quadraticCurveTo(px + sgn * torsoHalf * 0.8, torsoTop + (armpitY - torsoTop) * 0.72,
          px + sgn * torsoHalf * 1.3, armpitY);
      };
      cuts.push((c) => {
        arc(c);
        c.lineTo(px + sgn * torsoHalf * 1.3, top);
        c.closePath();
      });
      seams.push(arc);
    }
    ctx.save();
    ctx.beginPath(); torsoPath(ctx); ctx.clip();
    ctx.fillStyle = p.s;
    for (const cut of cuts) { ctx.beginPath(); cut(ctx); ctx.fill(); }
    if (!lod) {
      // Skin against a mid-value top is a weak edge — the same problem the crop
      // hem has — so every cut gets a hairline or the garment's shape is left
      // to be inferred.
      ctx.globalAlpha *= 0.35;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = hair(0.45, ow * 0.6);
      ctx.beginPath();
      for (const seam of seams) seam(ctx);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (spec.crop && !duck) {
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
  if (turned && !duck) {
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
  if (id === 'grumpos' && !duck) {
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
      ? taperHalfAt(paintEndY, torsoTop, torsoBot, torsoHalf, waistHalf)
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
  if (id === 'b33p' && !duck) {
    // Chest screen with alternating status lights, plus a hull seam at the
    // waist — the torso reads as plated machine, not a onesie.
    const px = torsoCx;
    outlined(ctx, p.s, hair(0.5, ow * 0.55), (c) =>
      roundRectPath(c, px - torsoHalf * 0.52, torsoTop + 0.045 * u, torsoHalf * 1.04, 0.1 * u, 0.02 * u));
    const beat = Math.sin((pose.time || 0) * 5) > 0;
    dot(ctx, px - torsoHalf * 0.24, torsoTop + 0.095 * u, 0.018 * u, beat ? p.a : p.w);
    dot(ctx, px + torsoHalf * 0.24, torsoTop + 0.095 * u, 0.018 * u, beat ? p.w : p.a);
    ctx.strokeStyle = p.p;
    ctx.lineWidth = hair(0.6, ow * 0.5);
    ctx.beginPath();
    ctx.moveTo(px - torsoHalf * 0.85, hipY - 0.055 * u);
    ctx.lineTo(px + torsoHalf * 0.85, hipY - 0.055 * u);
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
  // Same idea for the apron's pinafore straps: during a hands-on-hip beat the
  // arm draws in front and would bury them, so this re-strokes the straps over
  // that arm the way a suspender crosses the shoulder.
  let apronStrapOver = null;
  if (spec.straps && !lod && !duck) {
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
    const strapStroke = (s, endY) => {
      ctx.save();
      ctx.beginPath(); torsoPath(ctx); ctx.clip();
      ctx.strokeStyle = p.p;
      ctx.lineWidth = (bib ? 0.055 : 0.045) * u;
      ctx.beginPath();
      for (const sg of s) {
        const t = (endY - strapTopY) / (strapEndY - strapTopY);
        ctx.moveTo(strapTopX(sg), strapTopY);
        ctx.lineTo(strapTopX(sg) + (strapBotX(sg) - strapTopX(sg)) * t, endY);
      }
      ctx.stroke();
      ctx.restore();
    };
    strapStroke([-1, 1], strapEndY);
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
    ctx.strokeStyle = p.m; ctx.lineWidth = 0.055 * u;
    ctx.beginPath(); ctx.moveTo(px - torsoHalf * 0.88, beltY); ctx.lineTo(px + torsoHalf * 0.88, beltY); ctx.stroke();
    outlined(ctx, p.a, hair(0.5, ow * 0.5), (c) => roundRectPath(c, px - 0.035 * u, beltY - 0.033 * u, 0.07 * u, 0.06 * u, 0.012 * u));
  }
  if (spec.nameTag && !lod && !duck) {
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
  if (spec.jacket && !duck) {
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
  if (spec.harness && !duck) {
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
  if (spec.bandolier && !duck) {
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
  if (spec.gearBelt && !duck) {
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
      ? taperHalfAt(beltY, torsoTop, torsoBot, torsoHalf, waistHalf)
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
  if (!frontLegs) drawFrontLeg();
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
    const px = torsoCx;
    const sway = jump ? 0.02 * u : 0;
    // Belt sits high on the waist: a low band leaves a long round belly above
    // it and reads chubby rather than barrel-chested.
    const beltY = hipY - 0.075 * u + bob;
    const top = beltY + 0.025 * u;
    // Panels stop just past the knee — a joint crossing the hem reads as the
    // leather riding up, so only the shin below carries the gait. The heavy
    // rig's shallow stride is what lets them sit this short. Crouching they
    // shorten again, or the tucked legs and feet vanish under them.
    const tipY = hipY + legL * (duck ? 0.35 : 0.47) + bob * 0.5;
    // Body half-width where the belt sits and where the skirt hangs from.
    const halfAt = (y) => (spec.taper
      ? taperHalfAt(y, torsoTop, torsoBot, torsoHalf, waistHalf)
      : torsoHalf);
    const beltHalf = halfAt(beltY);
    // Panels span the body's edge at the belt, then splay outward — sized off
    // the shoulder line they'd hang past the hips and re-read as belly.
    const wTop = halfAt(top) * 0.98;
    // The splay has to clear the thighs, and front-on they root wide (±0.095u,
    // half a legW each side) instead of stacking on one center hip — so the
    // standing and celebrating poses need a real A-line or his legs show past
    // the leather. In profile the legs are behind it and a tighter hang reads
    // better. Fanned wider than this the straps stop overlapping.
    const flare = frontLegs || cm ? 1.5 : 1.18;
    const wHem = wTop * flare;
    // How far each leg has swung from its OWN hip — not from the body center,
    // which reads as a permanent outward pull when the legs stand apart and
    // parts the straps down the middle even at rest.
    const swingF = footF[0] - hipAt(1), swingB = footB[0] - hipAt(-1);
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
      const bx = px + f * wHem * depthScale + sway + drag(drivenGain * 0.45 * lead, 0.055 * u);
      const by = tipYAt(f) + drag(drivenGain * 0.45 * rise, 0.045 * u);
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
  if (spec.tunic && !duck) {
    // Green tunic: the torso's flat hem flares into a short skirt over the
    // thighs, cinched by a belt. Drawn after the legs so it drapes over the
    // thigh roots (like grumpos's skirt); the belt hides the top seam. Kept
    // upper-thigh short so the gait still reads.
    const px = torsoCx;
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
  if (spec.dress && !duck) {
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
    const px = torsoCx;
    const sway = jump ? 0.02 * u : 0;
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
      const hemLow = hipY + legL * (duck ? 0.24 : 0.36) + bob * 0.5;
      const halfAtY = (y) => (spec.taper
        ? taperHalfAt(y, torsoTop, torsoBot, torsoHalf, waistHalf)
        : torsoHalf);
      const wTopS = halfAtY(top) * 0.98;
      // Front-on the legs root wide, so the hem needs a real A-line or the
      // thighs show past the cloth on both sides instead of only in the split.
      // Flares harder than it did. A short skirt hanging near-straight reads as
      // a tube; the A-line is most of what says "skirt" once there is not much
      // length left to say it with, and the panels have to clear thighs that
      // root wide front-on.
      const flare = frontLegs ? 1.72 : 1.44;
      const wHemS = wTopS * flare;
      // How far each leg has swung from its OWN hip, not from the body centre:
      // measured from centre, legs that merely stand apart read as a permanent
      // outward pull and part the panels down the middle at rest.
      const swingF = footF[0] - hipAt(1), swingB = footB[0] - hipAt(-1);
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
      for (const { f, half, gain } of PANELS) {
        const followsFront = f * splitSide < 0;
        const lead = followsFront ? swingF : swingB;
        const rise = followsFront ? footF[1] : footB[1];
        const topX = px + f * wTopS;
        const bx = px + f * wHemS + sway + drag(gain * 0.4 * lead, 0.05 * u);
        const by = hemLow + drag(gain * 0.4 * rise, 0.04 * u);
        const topHalf = wTopS * half;
        const botHalf = topHalf * (1 + (flare - 1) * 0.9);
        const panel = (c) => {
          c.moveTo(topX - topHalf, top);
          c.lineTo(topX + topHalf, top);
          c.lineTo(bx + botHalf, by);
          c.quadraticCurveTo(bx, by + 0.026 * u, bx - botHalf, by);
          c.closePath();
        };
        outlined(ctx, p.b, ow, panel);
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
      ? taperHalfAt(dressBeltY, torsoTop, torsoBot, torsoHalf, waistHalf)
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
  if (spec.apron && !duck) {
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
          outlined(ctx, p.a, ow, (c) => {
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
  if (!clapFront && (!stand || raisedArmStudyFront || armsReachFront)) {
    drawFrontArm();
    if (strapOverArm) strapOverArm();
    if (apronStrapOver) apronStrapOver(); // strap passes over the near arm in the run/jump/duck cycle
  }

  // head (or the stump of one)
  if (pose.headless) {
    outlined(ctx, p.s, hair(0.6, ow * 0.8), (c) => c.ellipse(torsoCx, torsoTop, 0.07 * u, 0.045 * u, 0, 0, Math.PI * 2));
  } else {
    // Head rides the SAME half-lean as the torso (leanX * 0.5). Given the full
    // leanX it sits a half-lean ahead of the body, and the torso's back edge
    // juts out behind the neck — a hump, most visible on a tapered torso.
    drawHead(ctx, id, spec, p, u, ow, 0.01 * u + torsoCx + nearSign * turnDepth * 0.015 * u, headY, lod, pose);
  }

  // The same round shield he normally carries on his back, riding whichever
  // hand target the routine put it on.
  const drawCelShield = () => {
    const [sx, sy] = celShield;
    outlined(ctx, p.w, ow, (c) => c.arc(sx, sy, 0.15 * u, 0, Math.PI * 2));
    outlined(ctx, p.a, hair(0.5, ow * 0.65), (c) => c.arc(sx, sy, 0.095 * u, 0, Math.PI * 2));
    dot(ctx, sx, sy, 0.035 * u, OUTLINE);
  };
  const drawFarArm = () => {
    if (armDimsB) muscleLimb(ctx, shB, armY, handB[0], handB[1], armSeg, armSegF, elbB, p.s, ow, armDimsB);
    else limb2(ctx, shB, armY, handB[0], handB[1], armSeg, elbB, armWB, recede(armFill, farShade), ow, armWB, true);
    drawPuff(shB, armY, handB, armSeg, elbB, armSegF, farShade);
    if (pistolAngleB != null) drawPistol(ctx, handB[0], handB[1], pistolAngleB, u, ow, p, farShade);
    handDeco(handB[0], handB[1]);
  };

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
    if (apronStrapOver) apronStrapOver(); // straps cross OVER the arms (Dolores' hips celebrate)
  }
  // Front-pass standing idle (see armsInFront): far arm then near arm, both over
  // the apron, then the straps back over the arms at the shoulder.
  if (armsInFront) {
    if (armDimsB) muscleLimb(ctx, shB, armY, handB[0], handB[1], armSeg, armSegF, elbB, recede(p.s, farShade), ow, armDimsB);
    else limb2(ctx, shB, armY, handB[0], handB[1], armSeg, elbB, armWB, recede(armFill, farShade), ow, armWB, true);
    drawPuff(shB, armY, handB, armSeg, elbB, armSegF, farShade);
    handDeco(handB[0], handB[1], farShade);
    drawFrontArm();
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

function drawBlob(ctx, id, p, pose, u, ow, lod) {
  const t = pose.time || 0;
  const ph = (pose.phase || 0) * Math.PI * 2;
  const duck = pose.kind === 'duck';
  let rx = 0.36 * u, ry = 0.34 * u, cy = -0.4 * u;
  if (duck && pose.roll) {
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
  if (duck) { rx = 0.4 * u; ry = 0.22 * u; cy = -0.25 * u; }
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
  const duck = kind === 'duck';
  const enhancedDuck = duck && usesEnhancedLocomotion(pose);
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
  if (duck) { rx = 0.4 * u; ry = 0.22 * u; cy = -0.25 * u; }
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
  if (!duck) {
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

  // ears: rounded purple-tipped, splayed outward. They stay UP while ducking
  // (just a little shorter), poking above the flattened head — drawn before the
  // body, so the wide duck body would otherwise swallow anything drooped down.
  {
    const baseY = cy - ry * 0.78;
    const earLen = (duck ? 0.22 : 0.3) * u;
    for (const side of [-1, 1]) {
      const baseX = side * rx * 0.5;
      const lean = side * 0.12 * u;
      const wob = celebrate
        ? 0.03 * u * Math.max(0, celebrateSync ? celebrateSync.lift / 0.15 : Math.sin(t * 7))
        : 0;
      const tipX = baseX + lean + side * (0.06 + airApex * 0.025 + (enhancedDuck ? 0.025 : 0)) * u;
      // The ears trail a rising body, then splay back open at the apex.
      const tipY = baseY - earLen - wob + airRise * 0.055 * u - airApex * 0.025 * u
        + (enhancedDuck ? 0.025 * u : 0);
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
  const duckSpread = enhancedDuck ? 0.025 * u : 0;
  const footIn = enhancedJump ? airApex * 0.035 * u : -duckSpread;
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
  const nubY = armsUp ? cy - ry * 0.5 : cy + ry * (enhancedDuck ? 0.42 : 0.2);
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
  if (ex.joy || ex.surprise) {
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
function chompoEye(ctx, p, e, bodyFill, lod, blink, gaze = 0) {
  ctx.save();
  ctx.translate(e.cx, e.cy); ctx.scale(e.k, e.k); ctx.translate(-e.cx, -e.cy);
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
  const duck = pose.kind === 'duck';
  const enhancedMotion = usesEnhancedLocomotion(pose);
  const enhancedJump = pose.kind === 'jump' && enhancedMotion;
  const airV = enhancedJump ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 460)) : 0;
  const airApex = enhancedJump ? 1 - Math.abs(airV) : 0;
  const r = (duck ? 0.3 : 0.34) * u;
  const cy = duck ? -0.31 * u : -0.44 * u;
  if (duck && pose.roll) {
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
  const upDeg = duck ? 10 : 15;
  let loDeg = duck ? 10 : 15;
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
    : duck && enhancedMotion ? 0.115
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
    for (const e of CHOMPO_EYES) chompoEye(ctx, p, e, bodyFill, lod, ex.blink, faceYaw * 8);
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
  const ph = (pose.phase || 0) * Math.PI * 2;
  const run = pose.kind === 'run';
  const duck = pose.kind === 'duck';
  const enhancedMotion = usesEnhancedLocomotion(pose);
  const jump = pose.kind === 'jump' && enhancedMotion;
  const airV = jump ? Math.max(-1, Math.min(1, (Number(pose.vy) || 0) / 460)) : 0;
  const airApex = jump ? 1 - Math.abs(airV) : 0;
  // Two distinct footfalls per cycle: each shoe travels backward along the
  // floor, then lifts and swings forward. The torso settles on contact.
  const footF = run ? floatingFoot(pose.phase || 0, 0.115 * u, 0.082 * u) : [0, 0];
  const footB = run ? floatingFoot((pose.phase || 0) + 0.5, 0.115 * u, 0.082 * u) : [0, 0];
  const bob = run ? -Math.abs(Math.sin(ph)) * 0.028 * u : 0;
  const cy = (duck ? -0.3 : -0.5) * u + bob - airApex * 0.03 * u;
  const handSwing = run ? Math.cos(ph) * 0.075 * u : jump ? 0.055 * u : 0;
  const handLift = run ? Math.sin(ph) * 0.035 * u : jump ? (0.045 + 0.035 * airApex) * u : 0;
  // Floating shoes—no connecting legs.
  const shoeSpread = duck && enhancedMotion ? 0.165 : 0.13;
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
  const handY = cy + (duck && enhancedMotion ? 0.085 : jump ? -0.11 : 0.02) * u;
  const handOut = duck && enhancedMotion ? 0.34 : 0.29;
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
  if (pose.kind === 'duck' && usesEnhancedLocomotion(pose) && !pose.roll) {
    const raw = pose.duckAmount == null ? 1
      : Math.max(0, Math.min(1, Number(pose.duckAmount) || 0));
    let crouch = raw * raw * (3 - 2 * raw);
    // On entry, dip just past the held pose and rebound during the final third.
    // It is deliberately tiny: enough to show weight arriving, not enough to
    // pulse the hitbox or make the hero look rubbery.
    if (pose.duckDirection > 0 && raw > 0.68 && raw < 1) {
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
    ? celebrateMotion(heroId, pose.time || 0, usesReworkedCelebration(pose))
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
  const prevLight = armLight(u, xSign, !lod && opts.light !== false, opts.lit == null ? 1 : opts.lit);
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
function paintFace(ctx, heroId, spec, x, y, w, h, light = true, palette = null, forFit = false) {
  const p = palette || pal(heroId);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // head+hat spans ~0.5u; fit that span to the box height
  const u = (h * 0.92) / 0.5;
  const ow = hair(0.6, contour(0.032 * (h * 2))) * INK.body;
  // Face crops are supersampled and cached, so the light is worth arming even
  // for a HUD cell — but only once the head is big enough to hold a ramp. The
  // blob/disc branch nests a whole drawToon, which arms its own.
  const prevLight = armLight(u, 1, light && h >= 24);
  if (spec.rig === 'humanoid') {
    // `portrait` tells the head it is being cropped to a face cell. Only the
    // long-hair cuts read it, and they need to: faceFit measures the ink and
    // fits it to the box, so a waist-length plait is measured as part of the
    // FACE and the whole head shrinks to make room for it — the same reason no
    // back accessory is drawn here either.
    drawHead(ctx, heroId, spec, p, u, ow, x + w / 2, y + h * 0.62, false, { portrait: true, portraitFit: forFit });
  } else if (spec.rig === 'ray') {
    // ray has a real head on a floating body — crop to the head like a humanoid
    drawRayHead(ctx, heroId, p, { kind: 'idle', time: 0 }, u, ow, x + w / 2, y + h * 0.62, false, false);
  } else {
    // blob/disc: the body IS the face — draw the whole toon fitted
    drawToon(ctx, heroId, { kind: 'idle', time: 0 }, x + w / 2, y + h * 1.18, h * 1.45,
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
// per hero on an oversized scratch canvas (so anything spilling past the box
// still registers) and cached; falls back to the nominal box if pixels can't
// be read (headless stubs).
const FACE_FIT = new Map();
const FIT_R = 64; // nominal box size used for the measurement render
function faceFit(heroId, spec, light = true, palette = null) {
  const key = `${heroId}|${light ? 'lit' : 'flat'}`;
  if (FACE_FIT.has(key)) return FACE_FIT.get(key);
  let fit = { x: 0, y: 0, w: 1, h: 1 }; // nominal framing, if nothing measures
  const b = inkBounds(FIT_R * 3, (x) => paintFace(x, heroId, spec, FIT_R, FIT_R, FIT_R, FIT_R, light, palette, true));
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
    { kind: 'duck', phase: 0.5, time: 0.5, grounded: true, facing: 1 },
  );
  const special = {
    lorenzo: { kind: 'jump', phase: 0.5, time: 0.2, grounded: false, facing: 1, stomp: true, vy: -240 },
    gnash: { kind: 'run', phase: 0.25, time: 0.25, grounded: true, facing: 1, lean: 0.26 },
    fernwick: { kind: 'duck', phase: 0.5, time: 0.3, grounded: true, facing: 1, roll: true },
    b33p: { kind: 'run', phase: 0.25, time: 0.2, grounded: true, facing: 1, menuAction: 'aim' },
    mochi: { kind: 'duck', phase: 0.5, time: 0.2, grounded: true, facing: 1, squash: 1 },
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
const FACE_PAD = 0.04; // fraction of the box left empty on each side
export function drawToonFace(ctx, heroId, x, y, w, h, opts = {}) {
  // Same candidate seam as drawToon's: a proposal can be cropped to a HUD cell
  // without being on the roster. The fit cache is keyed by heroId, and a
  // candidate's id is its own, so a candidate measures once like anyone else.
  const spec = opts.spec || TOON_SPECS[heroId];
  if (!spec) return;
  const light = opts.light !== false;
  const fit = faceFit(heroId, spec, light, opts.pal || null);
  // paintFace scales everything off h and centers on w/2, so the ink lands at
  // this size and offset regardless of how wide the box is.
  const inkW = fit.w * h, inkH = fit.h * h;
  const cx = w / 2 + (fit.x + fit.w / 2 - 0.5) * h;
  const cy = (fit.y + fit.h / 2) * h;
  const s = Math.min((1 - FACE_PAD * 2) * w / inkW, (1 - FACE_PAD * 2) * h / inkH);
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
  paintFace(ctx, heroId, spec, 0, 0, w, h, light, opts.pal || null);
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
export function toonFaceSprite(heroId, w, h) {
  return cached(`${heroId}|face|${w}x${h}`, w, h, (x) => drawToonFace(x, heroId, 0, 0, w, h));
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
  const forcedDuck = player.rolling || player.compressT > 0;
  const recoveringDuck = player.grounded && (player.duckAmount || 0) > 0;
  const kind = (player.ducking || forcedDuck || recoveringDuck) ? 'duck' : (!player.grounded ? 'jump' : 'run');
  return {
    kind,
    phase: player.anim % 1,
    // The bite's clock has to start at 0 the instant the ability fires, not
    // wherever the run's absolute clock happens to be, or biteWave() opens
    // the mouth mid-cycle instead of from closed.
    time: eating ? (EAT_POWER_POSE_T - player.powerPoseT) : t,
    vy: player.vy,
    grounded: player.grounded,
    // Rolls and Mochi's compression remain immediate ability silhouettes.
    // Ordinary input uses the controller's entry/exit blend.
    duckAmount: forcedDuck ? 1 : Math.max(0, Math.min(1, player.duckAmount || 0)),
    duckDirection: forcedDuck ? 0 : (player.duckDirection || 0),
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
    menuAction: eating ? 'chomp' : (firing && player.powerType === 'shoot') ? 'aim' : smashing ? 'smash' : undefined,
    actionTime: firing && !eating ? 0.3 - player.powerPoseT : 0,
    headTurn: kind === 'run' ? RUN_HEAD_TURN : 0,
    facing: 1,
  };
}
