// The monitor bezel bake-off (19 Oct 2026), plus two side questions Peter asked
// alongside it: whether the deck seam should run edge to edge, and what colour
// the Corporate Kombat cabinet should be instead of pink.
//
// Every bezel candidate keeps the shipped OUTER frame — the ~3.4px casing band
// round it that matches the marquee border — and changes only what happens
// inside it. A wider rim therefore means a smaller glass, and the glass is
// refitted to exactly 4:3 each time, so no candidate wins by quietly changing
// the screen shape.
import { CABINET_STYLES, cabinetPalette } from '../sprites/arcade.js';
import { rr, shape, plain, stroke } from '../sprites/props.js';
import { CABINETS } from '../data/cabinets.js';

const BASE = CABINET_STYLES.chibi;
const CW = BASE.w, CH = BASE.h;

// The largest 4:3 glass that leaves at least these rims (px) inside `bezel`.
// Whichever axis runs out first gets exactly its rim; the other axis takes the
// slack, split evenly.
function fitGlass(bezel, { side, top, bottom = top }) {
  const x0 = bezel.x0 * CW, x1 = bezel.x1 * CW, y0 = bezel.y0 * CH, y1 = bezel.y1 * CH;
  const iw = x1 - x0 - 2 * side, ih = y1 - y0 - top - bottom;
  const w = Math.min(iw, ih * 4 / 3), h = w * 3 / 4;
  const sx = x0 + side + (iw - w) / 2, sy = y0 + top + (ih - h) / 2;
  return { x0: sx / CW, x1: (sx + w) / CW, y0: sy / CH, y1: (sy + h) / CH };
}

// A ring between the bezel's outer rounded rect and the glass's, inset by `pad`
// so a fill laid over the shape() outline leaves that outline showing.
function ring(c, k, pad = 0) {
  const [bx, by, bw, bh] = k.bx('bezel'), [sx, sy, sw, sh] = k.bx('screen');
  rr(c, bx + pad, by + pad, bw - pad * 2, bh - pad * 2, Math.max(0, k.bezelRadius - pad));
  rr(c, sx, sy, sw, sh, k.screenRadius);
}

function well(ctx, k) {
  plain(ctx, k.pal.well, (c) => rr(c, ...k.bx('screen'), k.screenRadius));
}

// A vertical gradient across the rim, clipped to the ring.
function shadeRing(ctx, k, stops) {
  const [, by, , bh] = k.bx('bezel');
  const g = ctx.createLinearGradient(0, by, 0, by + bh);
  for (const [at, col] of stops) g.addColorStop(at, col);
  ctx.save();
  ctx.beginPath();
  ring(ctx, k, 0.3);
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  ctx.restore();
}

const PAINTERS = {
  // One flat band of the cabinet's dark shade — the rim that shipped until E did.
  flat(ctx, k) {
    shape(ctx, k.pal.shade, k.u, (c) => rr(c, ...k.bx('bezel'), k.bezelRadius));
    well(ctx, k);
  },
  // Raised moulding: lit along the top, falling into shadow along the bottom,
  // with a dark crease where it meets the glass.
  bevel(ctx, k) {
    const { pal, u, lighten, darken } = k;
    shape(ctx, pal.shade, u, (c) => rr(c, ...k.bx('bezel'), k.bezelRadius));
    shadeRing(ctx, k, [[0, lighten(pal.shade, 0.32)], [0.45, pal.shade], [1, darken(pal.shade, 0.3)]]);
    well(ctx, k);
    stroke(ctx, darken(pal.shade, 0.45), 0.35, (c) => rr(c, ...k.bx('screen'), k.screenRadius));
  },
  // The reverse: the glass sits back in a well, so the top of the rim is in the
  // casing's shadow and the bottom catches the light.
  recessed(ctx, k) {
    const { pal, u, lighten, darken } = k;
    shape(ctx, darken(pal.shade, 0.15), u, (c) => rr(c, ...k.bx('bezel'), k.bezelRadius));
    shadeRing(ctx, k, [[0, darken(pal.shade, 0.42)], [0.55, darken(pal.shade, 0.08)], [1, lighten(pal.shade, 0.22)]]);
    well(ctx, k);
  },
  // A shade rim with a black rubber surround between it and the glass.
  gasket(ctx, k) {
    const { pal, u, darken } = k;
    shape(ctx, pal.shade, u, (c) => rr(c, ...k.bx('bezel'), k.bezelRadius));
    const [sx, sy, sw, sh] = k.bx('screen'), g = 0.75;
    plain(ctx, darken(pal.shade, 0.7), (c) => rr(c, sx - g, sy - g, sw + g * 2, sh + g * 2, k.screenRadius + g));
    well(ctx, k);
  },
  // A television's chin: flat, heavier below, with a power light on it.
  chin(ctx, k) {
    const { pal, u, darken, w } = k;
    shape(ctx, pal.shade, u, (c) => rr(c, ...k.bx('bezel'), k.bezelRadius));
    well(ctx, k);
    const [, sy, , sh] = k.bx('screen'), [bx, by, bw, bh] = k.bx('bezel');
    const cy = (sy + sh + by + bh) / 2;
    plain(ctx, darken(pal.shade, 0.3), (c) => rr(c, bx + bw / 2 - w * 0.07, cy - 0.35, w * 0.14, 0.7, 0.35));
    plain(ctx, '#7cf29a', (c) => c.arc(bx + bw - w * 0.09, cy, 0.5, 0, Math.PI * 2));
  },
  // No frame at all: the glass is cut straight into the casing.
  flush(ctx, k) {
    const { pal, darken } = k;
    well(ctx, k);
    stroke(ctx, darken(pal.body, 0.4), 0.5, (c) => rr(c, ...k.bx('screen'), k.screenRadius));
  },
  // A soft rolled tube, the toy version: dark at both edges, lit along its crown.
  pillow(ctx, k) {
    const { pal, u, lighten, darken } = k;
    shape(ctx, darken(pal.shade, 0.22), u, (c) => rr(c, ...k.bx('bezel'), k.bezelRadius));
    const [bx, by, bw, bh] = k.bx('bezel'), [sx, sy, sw, sh] = k.bx('screen');
    const rim = (sx - bx), mid = rim / 2;
    const along = (c, lift = 0) => rr(c, bx + mid, by + mid - lift, bw - rim, bh - rim - 0, k.screenRadius + mid);
    stroke(ctx, pal.shade, rim * 0.62, (c) => along(c));
    stroke(ctx, lighten(pal.shade, 0.28), rim * 0.2, (c) => along(c, rim * 0.12));
    well(ctx, k);
  },
};

function style(box, extra = {}) {
  return {
    ...BASE,
    box,
    paint(ctx, w, h, pal, opts = {}) {
      return BASE.paint(ctx, w, h, pal, { ...opts, monitorBox: box, ...extra });
    },
  };
}

function bezelCandidate({ letter, name, note, rims, paint, shipped = false }) {
  const box = rims ? { ...BASE.box, screen: fitGlass(BASE.box.bezel, rims) } : BASE.box;
  return { letter, name, note, shipped, style: style(box, paint ? { bezel: PAINTERS[paint] } : {}) };
}

export const BEZEL_CANDIDATES = [
  bezelCandidate({ letter: 'NOW', name: 'E thinned to 1.7px', shipped: true,
    note: 'SHIPS (Peter: "I like E but would like the moulding a little thinner"): E\'s recess at 1.7px.' }),
  bezelCandidate({ letter: 'X', name: 'flat, 1.25px (shipped before E)', rims: { side: 1.25, top: 1.25 }, paint: 'flat',
    note: 'The rim before this bake-off: one flat band of the cabinet\'s dark shade.' }),
  bezelCandidate({ letter: 'A', name: 'hairline, flat', rims: { side: 0.6, top: 0.6 }, paint: 'flat',
    note: 'Half the rim: the biggest glass that fits.' }),
  bezelCandidate({ letter: 'B', name: 'medium, flat', rims: { side: 2, top: 2 }, paint: 'flat',
    note: 'A 2px band, still one flat colour.' }),
  bezelCandidate({ letter: 'C', name: 'chunky, flat', rims: { side: 3, top: 3 }, paint: 'flat',
    note: 'A 3px band: a small tube in a heavy frame.' }),
  bezelCandidate({ letter: 'D', name: 'bevelled, raised', rims: { side: 2.2, top: 2.2 }, paint: 'bevel',
    note: 'A moulding standing proud of the face: lit top, shadowed bottom, a crease at the glass.' }),
  bezelCandidate({ letter: 'E', name: 'recessed, 2.2px (picked; ships thinner as NOW)', rims: { side: 2.2, top: 2.2 }, paint: 'recessed',
    note: 'The glass sunk into the face: shadow under the top lip, light on the bottom.' }),
  bezelCandidate({ letter: 'F', name: 'rim + rubber gasket', rims: { side: 2.2, top: 2.2 }, paint: 'gasket',
    note: 'The flat shade rim with a black surround between it and the glass.' }),
  bezelCandidate({ letter: 'G', name: 'TV chin', rims: { side: 1.4, top: 1.4, bottom: 3.6 }, paint: 'chin',
    note: 'Thin top and sides, a heavy bottom with a power light: a television rather than a monitor.' }),
  bezelCandidate({ letter: 'H', name: 'flush, no frame', rims: { side: 0, top: 0 }, paint: 'flush',
    note: 'No bezel: the glass cut straight into the casing, outlined.' }),
  bezelCandidate({ letter: 'I', name: 'pillow', rims: { side: 2.6, top: 2.6 }, paint: 'pillow',
    note: 'A soft rolled tube, dark at both edges and lit along its crown.' }),
];

// The deck seam: does the groove under the monitor run to the outline?
export const SEAM_CANDIDATES = [
  { letter: 'S1', name: 'short of the edges', shipped: true, style: style(BASE.box),
    note: 'Shipped: a groove scored across one face, stopping before the outline.' },
  { letter: 'S2', name: 'full width', style: style(BASE.box, { divider: 'full' }),
    note: 'Meets the outline both sides, so the deck reads as its own panel.' },
  { letter: 'S3', name: 'none', style: style(BASE.box, { divider: 'none' }),
    note: 'No line: monitor face and deck are one surface.' },
];

// Corporate Kombat out of pink. Every colour comes from the office level's own
// palette (CABINETS office + stylePacks/officeLigne PAL); each is run through the
// real cabinetPalette() as the cabinet's `shell`, so the hood, deck and lip are
// derived exactly as they are for the one that shipped.
const OFFICE = CABINETS.find((c) => c.id === 'office');
function officePal({ body, groundDark = OFFICE.groundDark, glass = OFFICE.sky[1] }) {
  return cabinetPalette({ ...OFFICE, groundDark, shell: { body, glass } }, true);
}
export const OFFICE_COLOUR_CANDIDATES = [
  { letter: 'K0', name: 'pink (shipped before K1)', pal: officePal({ body: OFFICE.ground }),
    note: 'ground #d6a7ba — the cabinet before this bake-off.' },
  { letter: 'K1', name: 'dusty teal', shipped: true, pal: cabinetPalette(OFFICE, true),
    note: 'SHIPS: the office hills, #789da4, with the pink moved up to the marquee glass.' },
  { letter: 'K2', name: 'lilac', pal: officePal({ body: '#b9b2d2' }),
    note: 'The far towers, #b9b2d2.' },
  { letter: 'K3', name: 'mint', pal: officePal({ body: '#a3dcd5', glass: '#f5d7ed' }),
    note: 'The lobby chips\' mint, #a3dcd5, pink marquee.' },
  { letter: 'K4', name: 'butter', pal: officePal({ body: '#f0e39e' }),
    note: 'The lobby chips\' yellow, #f0e39e.' },
  { letter: 'K5', name: 'charcoal', pal: officePal({ body: '#3a3846', groundDark: '#1f1d26' }),
    note: 'The lobby\'s marble band, #3a3846, near-black bezel.' },
];
