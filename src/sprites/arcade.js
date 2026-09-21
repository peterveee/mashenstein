// Food-court furniture: the arcade cabinet fronts and the service doors that
// line THE LAST FUNCTIONING FOOD COURT. Same flat-cartoon vector language as
// sprites/props.js — whose helpers this borrows rather than forking — but with
// one difference that earns the separate module: these are PALETTED. Nine
// cabinets are one silhouette in nine colour sets, and PROP_PAINTERS' cache key
// (name + size + frame) has no room for a palette, so they would all collide on
// a single entry. Palettes are derived per cabinet and the shapes are painted
// straight into the destination (see paintInto) rather than cached as bitmaps.
//
// The cabinet silhouette is traced from a Noun Project upright by Chuck Penzone:
// marquee hood, screen housing, a control deck that flares out toward the
// player, controls and kick plate. It is redrawn single-player (see
// deckControls) rather than as the reference two-player deck. Geometry is
// normalized against that drawing's own extent (x 29.7..71, y 4.05..95), which
// is why the fractions below look arbitrary — they are measured, not invented.
import { rr, shape, plain, stroke } from './props.js';
import { drawText, textWidth } from '../engine/sprites.js';

// ------------------------------------------------------------- colour maths
// props.js hardcodes every colour; these shapes derive theirs from cabinet data
// at runtime, so they need to be able to make a highlight and a shadow out of
// whatever palette a cabinet happens to carry.
const INK_DARK = '#100c18';
function rgb(c) {
  const s = String(c).replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((k) => k + k).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
const lighten = (c, t) => mix(c, '#ffffff', t);
const darken = (c, t) => mix(c, INK_DARK, t);
// Perceptual-ish brightness, used to decide whether a screen wants dark ink or
// light ink on it. Cabinet skies run from #0a0a2a to #e8e8f0, so a fixed choice
// would be invisible on half the row.
function luma(c) { const [r, g, b] = rgb(c); return (r * 0.299 + g * 0.587 + b * 0.114) / 255; }

// A small stable number per cabinet id. Staggers the dead-screen static so nine
// unplugged machines never crackle in unison — and, because deadScreenBurst()
// does modular arithmetic on it, a missing seed is not a no-op: NaN fails every
// comparison and the burst reads as permanently on.
function idSeed(id) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) & 0xffff;
  return n;
}

// props.js scales its outline as 0.055 * max(w,h), which is tuned for 13px
// obstacles; a 90px-tall cabinet would come out with a 5px black border. These
// shapes are big, so they pass their own unit to keep the line at ~0.8px.
const olU = (w) => Math.max(10, w * 0.36);

// ============================================================== the cabinet
// Every part as a fraction of the art box. Exported because callers need the
// screen rect: the attract shimmer is drawn live over the cached sprite (it
// moves every frame and must not be baked in), and the cleared badge hangs off
// the top of the hood.
export const CABINET_BOX = {
  hood: { x0: 0, x1: 1, y0: 0, y1: 0.151 },
  glass: { x0: 0.053, x1: 0.948, y0: 0.022, y1: 0.130 },
  upper: { x0: 0.053, x1: 0.949, y0: 0.151, y1: 0.466 },
  bezel: { x0: 0.101, x1: 0.899, y0: 0.175, y1: 0.472 },
  screen: { x0: 0.186, x1: 0.821, y0: 0.184, y1: 0.410 }, screenR: 0.047,
  deck: { x0: 0, x1: 1, y0: 0.448, y1: 0.523 },
  lip: { x0: 0, x1: 1, y0: 0.523, y1: 0.565 },
  lower: { x0: 0.056, x1: 0.952, y0: 0.565, y1: 0.981 },
};

// The screen glass in absolute coordinates, given a cabinet's own box. Both the
// cached screen sprite and the live scanline are placed through this, so they
// can never drift apart.
export function cabinetScreenRect(x, y, w, h, style) {
  const s = (style ? cabinetStyle(style) : cabinetStyle()).box.screen;
  return { x: x + w * s.x0, y: y + h * s.y0, w: w * (s.x1 - s.x0), h: h * (s.y1 - s.y0) };
}

// A cabinet's colours, derived entirely from its CABINETS entry. Takes anything
// cabinet-shaped ({id, sky, ground, groundDark}) rather than importing the data
// module, which keeps sprites/ from depending on data/.
export function cabinetPalette(cab, unlocked = true) {
  if (!unlocked) {
    // Dark, dead, and unmistakably not running. Same silhouette, no glow, no
    // screen at all — which is the read the old grey #20242c rectangle had.
    return {
      id: `${cab.id}-off`, lit: false, motif: null, seed: idSeed(cab.id),
      body: '#20242c', shade: '#171a20', deck: '#272c36', lipC: '#141820',
      hood: '#252a34', glass: '#2a2e38', well: '#101018', plate: '#0e1016',
      knob: '#3a4150', button: '#3a4150', screen: '#101018', ink: '#1a1e26',
    };
  }
  const body = cab.ground;
  const shade = cab.groundDark;
  const sky = cab.sky[0];
  return {
    id: cab.id, lit: true, motif: cab.id, seed: idSeed(cab.id),
    body,
    shade,
    deck: lighten(body, 0.16),
    lipC: darken(shade, 0.25),
    hood: lighten(body, 0.08),
    glass: cab.sky[1],
    well: '#0b0b14',
    plate: '#100c18',
    knob: '#e04848',
    button: '#f6d33c',
    screen: sky,
    // Guaranteed contrast against whatever the screen is showing.
    ink: luma(sky) > 0.5 ? darken(shade, 0.45) : lighten(cab.sky[1], 0.45),
  };
}

export function cabinetBrownoutAlpha(t, seed) {
  const phase = (Math.sin(t * 2.45 + seed * 0.01) + 1) / 2;
  return 0.34 + phase * 0.22;
}

export function drawCabinetSignalInterference(ctx, scr, t, seed) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(scr.x, scr.y, scr.w, scr.h);
  ctx.clip();
  const roll = (t * 4.5) % (scr.h + 8);
  for (let i = 0; i < 4; i++) {
    const y = scr.y + ((roll + i * 9) % (scr.h + 8)) - 4;
    ctx.fillStyle = i % 2
      ? 'rgba(8,7,16,0.17)'
      : 'rgba(246,211,60,0.11)';
    ctx.fillRect(scr.x, y, scr.w, 1.5);
  }
  const noiseFrame = Math.floor(t * 10);
  for (let i = 0; i < 28; i++) {
    const noiseSeed = i * 43 + noiseFrame * 19 + seed;
    const x = scr.x + ((noiseSeed * 0.73) % scr.w + scr.w) % scr.w;
    const y = scr.y + ((noiseSeed * 0.41) % scr.h + scr.h) % scr.h;
    const width = 0.45 + (((noiseSeed % 4) + 4) % 4) * 0.35;
    ctx.fillStyle = i % 4 === 0
      ? 'rgba(246,211,60,0.24)'
      : 'rgba(235,235,245,0.18)';
    ctx.fillRect(x, y, Math.min(width, scr.x + scr.w - x), 0.7);
  }
  ctx.restore();
}

// The OVERTIME machine: the same cabinet, running something that should not be
// running. Violet chassis, a marquee that is only ever half-lit, dead screen.
export const OVERTIME_PALETTE = {
  id: 'overtime', lit: true, motif: null, seed: idSeed('overtime'), screenStatic: 0.65,
  body: '#4a2a6a', shade: '#2e1846', deck: '#5c3a80', lipC: '#22103a',
  hood: '#5a3480', glass: '#8858c8', well: '#0b0b14', plate: '#100c18',
  knob: '#e04848', button: '#8858c8', screen: '#150a22', ink: '#8858c8',
};

// ----------------------------------------------------------- genre motifs
// One per cabinet, painted inside the screen glass. Each gets a box the size of
// the glass (~24x18 logical in the hub), the contrast ink, and the screen
// colour behind it for knock-outs. At that size these have to be silhouettes:
// a shape you recognize in one glance, not an illustration.
export const GENRE_MOTIFS = {
  // PLUMBER PANIC: a pipe, and something leaping over it.
  plumber(c, w, h, ink) {
    plain(c, ink, (p) => rr(p, w * 0.14, h * 0.5, w * 0.24, h * 0.5, w * 0.04));
    plain(c, ink, (p) => rr(p, w * 0.08, h * 0.38, w * 0.36, h * 0.16, w * 0.04));
    stroke(c, ink, Math.max(0.5, h * 0.08), (p) => {
      p.moveTo(w * 0.5, h * 0.92);
      p.quadraticCurveTo(w * 0.68, h * 0.04, w * 0.94, h * 0.6);
    });
  },
  // SPEED ZONE: a checkered flag on its pole.
  speed(c, w, h, ink) {
    stroke(c, ink, Math.max(0.5, w * 0.045), (p) => { p.moveTo(w * 0.16, h * 0.08); p.lineTo(w * 0.16, h * 0.96); });
    const cw = w * 0.17, ch = h * 0.2;
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 4; col++) {
        if ((r + col) % 2) continue;
        plain(c, ink, (p) => p.rect(w * 0.2 + col * cw, h * 0.14 + r * ch, cw, ch));
      }
    }
  },
  // NEON BLASTERS: a ship and its shots.
  neon(c, w, h, ink) {
    plain(c, ink, (p) => {
      p.moveTo(w * 0.1, h * 0.14); p.lineTo(w * 0.54, h * 0.5);
      p.lineTo(w * 0.1, h * 0.86); p.lineTo(w * 0.26, h * 0.5); p.closePath();
    });
    plain(c, ink, (p) => { p.arc(w * 0.7, h * 0.5, h * 0.1, 0, Math.PI * 2); p.arc(w * 0.9, h * 0.5, h * 0.07, 0, Math.PI * 2); });
  },
  // FROST FORTRESS: a six-armed snowflake.
  frost(c, w, h, ink) {
    const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.44;
    stroke(c, ink, Math.max(0.5, R * 0.17), (p) => {
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        p.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R);
        p.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      }
    });
    stroke(c, ink, Math.max(0.45, R * 0.13), (p) => {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const tx = cx + Math.cos(a) * R * 0.62, ty = cy + Math.sin(a) * R * 0.62;
        for (const d of [0.75, -0.75]) {
          p.moveTo(tx, ty);
          p.lineTo(tx + Math.cos(a + d) * R * 0.32, ty + Math.sin(a + d) * R * 0.32);
        }
      }
    });
  },
  // CRYPT SHIFT: a headstone with a cross knocked out of it.
  crypt(c, w, h, ink, back) {
    plain(c, ink, (p) => {
      p.moveTo(w * 0.28, h * 0.96); p.lineTo(w * 0.28, h * 0.4);
      p.arc(w * 0.5, h * 0.4, w * 0.22, Math.PI, 0);
      p.lineTo(w * 0.72, h * 0.96); p.closePath();
    });
    stroke(c, back, Math.max(0.5, w * 0.06), (p) => {
      p.moveTo(w * 0.5, h * 0.28); p.lineTo(w * 0.5, h * 0.76);
      p.moveTo(w * 0.36, h * 0.46); p.lineTo(w * 0.64, h * 0.46);
    });
  },
  // RHYTHM BANKRUPTCY: an eighth note.
  rhythm(c, w, h, ink) {
    plain(c, ink, (p) => p.ellipse(w * 0.36, h * 0.74, w * 0.16, h * 0.18, -0.35, 0, Math.PI * 2));
    stroke(c, ink, Math.max(0.5, w * 0.055), (p) => { p.moveTo(w * 0.5, h * 0.74); p.lineTo(w * 0.5, h * 0.1); });
    plain(c, ink, (p) => {
      p.moveTo(w * 0.5, h * 0.1);
      p.quadraticCurveTo(w * 0.86, h * 0.26, w * 0.76, h * 0.58);
      p.quadraticCurveTo(w * 0.8, h * 0.3, w * 0.5, h * 0.32);
      p.closePath();
    });
  },
  // CARDBOARD KINGDOM: the four-inch castle from the taunt. A taped box was
  // the first draft and read as a four-pane window — the tape seams quartered
  // it — where crenellations plus a gate are unmistakable at 24x18.
  cardboard(c, w, h, ink, back) {
    plain(c, ink, (p) => p.rect(w * 0.18, h * 0.12, w * 0.64, h * 0.84));
    plain(c, back, (p) => { p.rect(w * 0.34, h * 0.08, w * 0.1, h * 0.16); p.rect(w * 0.56, h * 0.08, w * 0.1, h * 0.16); });
    plain(c, back, (p) => {
      p.moveTo(w * 0.41, h * 0.98); p.lineTo(w * 0.41, h * 0.66);
      p.arc(w * 0.5, h * 0.66, w * 0.09, Math.PI, 0);
      p.lineTo(w * 0.59, h * 0.98); p.closePath();
    });
  },
  // CORPORATE KOMBAT: a briefcase. A necktie is the more obvious office glyph
  // and it does not survive the size — knot and blade merge into one dark
  // exclamation mark. A case has a handle, which reads at any scale.
  office(c, w, h, ink, back) {
    stroke(c, ink, Math.max(0.5, h * 0.075), (p) => {
      p.moveTo(w * 0.4, h * 0.3); p.lineTo(w * 0.4, h * 0.16);
      p.lineTo(w * 0.6, h * 0.16); p.lineTo(w * 0.6, h * 0.3);
    });
    plain(c, ink, (p) => rr(p, w * 0.14, h * 0.32, w * 0.72, h * 0.56, w * 0.05));
    plain(c, back, (p) => p.rect(w * 0.14, h * 0.54, w * 0.72, h * 0.055));
    plain(c, back, (p) => p.rect(w * 0.46, h * 0.48, w * 0.08, h * 0.18));
  },
  // THE SURGE: everything at once, which is to say the plug's own bolt.
  surge(c, w, h, ink) {
    plain(c, ink, (p) => {
      p.moveTo(w * 0.64, h * 0.04); p.lineTo(w * 0.3, h * 0.52); p.lineTo(w * 0.5, h * 0.52);
      p.lineTo(w * 0.38, h * 0.96); p.lineTo(w * 0.74, h * 0.44); p.lineTo(w * 0.52, h * 0.44);
      p.closePath();
    });
  },
};

// ----------------------------------------------------------- the shell
// Everything except the screen glass. Drawn back to front: the housings first,
// then the furniture bolted onto them.
function paintCabinet(ctx, w, h, pal, opts = {}) {
  const u = olU(w);
  const X = (n) => w * n, Y = (n) => h * n;
  const B = CABINET_BOX;
  const box = (k) => [X(B[k].x0), Y(B[k].y0), X(B[k].x1 - B[k].x0), Y(B[k].y1 - B[k].y0)];

  // Screen housing — drawn down past the deck so the flare has nothing to seam
  // against, then the lower body under it.
  shape(ctx, pal.body, u, (c) => rr(c, X(B.upper.x0), Y(B.upper.y0), X(B.upper.x1 - B.upper.x0), Y(0.54 - B.upper.y0), w * 0.06));
  shape(ctx, pal.body, u, (c) => rr(c, ...box('lower'), w * 0.05));
  // The lit side: a soft highlight down the left edge and the shadow down the
  // right, which is what turns two flat rectangles into a box.
  plain(ctx, lighten(pal.body, 0.14), (c) => { c.rect(X(0.06), Y(0.16), w * 0.07, h * 0.37); c.rect(X(0.07), Y(0.58), w * 0.07, h * 0.39); });
  plain(ctx, pal.shade, (c) => { c.rect(X(0.85), Y(0.16), w * 0.09, h * 0.37); c.rect(X(0.85), Y(0.58), w * 0.09, h * 0.39); });

  // Marquee hood: the widest part of the machine, and the only thing on it that
  // is genuinely a light source.
  shape(ctx, pal.hood, u, (c) => rr(c, ...box('hood'), w * 0.07));
  plain(ctx, pal.glass, (c) => rr(c, ...box('glass'), w * 0.04));
  if (pal.lit) {
    // Marquee art: the cabinet's own genre emblem between two bars standing in
    // for a title nobody can read at this size. A blank lit panel reads as a
    // missing texture; this reads as a marquee seen from across the concourse.
    const art = GENRE_MOTIFS[pal.motif];
    const gy = Y(CABINET_BOX.glass.y0), gh = h * (CABINET_BOX.glass.y1 - CABINET_BOX.glass.y0);
    const tint = mix(pal.glass, pal.body, 0.5);
    if (art) {
      const s = gh * 0.82;
      ctx.save();
      ctx.translate(X(0.5) - s / 2, gy + (gh - s) / 2);
      art(ctx, s, s, tint, pal.glass);
      ctx.restore();
      plain(ctx, tint, (c) => {
        rr(c, X(0.13), gy + gh * 0.36, w * 0.24, gh * 0.28, gh * 0.14);
        rr(c, X(0.63), gy + gh * 0.36, w * 0.24, gh * 0.28, gh * 0.14);
      });
    }
    plain(ctx, lighten(pal.glass, 0.5), (c) => rr(c, X(0.09), Y(0.032), w * 0.82, h * 0.018, w * 0.015));
    // The pool of marquee light spilling down the front of the housing.
    const g = ctx.createLinearGradient(0, Y(0.151), 0, Y(0.3));
    g.addColorStop(0, mix(pal.glass, pal.body, 0.55));
    g.addColorStop(1, pal.body);
    plain(ctx, g, (c) => c.rect(X(0.09), Y(0.151), w * 0.82, h * 0.15));
  }

  // Screen bezel and the well behind the glass. drawCabinetScreen() fills the
  // well; an unlit cabinet just leaves it black, which is the whole tell.
  shape(ctx, pal.shade, u, (c) => rr(c, ...box('bezel'), w * 0.05));
  plain(ctx, pal.well, (c) => rr(c, ...box('screen'), w * 0.03));

  // Control deck: flares back out to the full width of the hood, with a darker
  // front lip under it so the shelf reads as jutting toward the player.
  shape(ctx, pal.deck, u, (c) => {
    c.moveTo(X(0.045), Y(B.deck.y0));
    c.lineTo(X(0.955), Y(B.deck.y0));
    c.lineTo(X(1), Y(B.deck.y1));
    c.lineTo(X(0), Y(B.deck.y1));
    c.closePath();
  });
  shape(ctx, pal.lipC, u, (c) => rr(c, ...box('lip'), w * 0.03));

  // One stick, two buttons and the coin slot — the shared deck, so the four
  // silhouettes differ in outline and nothing else. The coin door that used to
  // sit on the lower body is gone: its job moved up here.
  deckControls(ctx, w, pal, Y(0.462), 0.9, opts.stickLean, opts.buttonPress, opts.stickFwd, [Y(B.deck.y0), Y(B.deck.y1)], opts.glint);
  plain(ctx, pal.plate, (c) => c.rect(X(0.056), Y(0.925), w * 0.896, h * 0.056)); // kick plate
}

// ============================================== candidate silhouettes
// Three ways to make the machine read cuter, all sharing the hardware above so
// they can be compared on outline and proportion alone. The active one is
// CABINET_STYLE at the bottom of this block; the gallery renders all of them
// side by side under "Cabinet style bake-off".

// --- rounded: the reference upright, softened -----------------------------
// Same 0.44 aspect and same part layout as `upright`, but every corner is
// generously radiused, the glass gets a gloss sweep, the blank lower body gets
// side art, and the whole thing stands on feet.
const ROUNDED_BOX = {
  hood: { x0: 0, x1: 1, y0: 0, y1: 0.155 },
  glass: { x0: 0.06, x1: 0.94, y0: 0.026, y1: 0.132 },
  upper: { x0: 0.055, x1: 0.945, y0: 0.155, y1: 0.47 },
  bezel: { x0: 0.1, x1: 0.9, y0: 0.18, y1: 0.475 },
  screen: { x0: 0.18, x1: 0.82, y0: 0.188, y1: 0.412 }, screenR: 0.125,
  deck: { x0: 0, x1: 1, y0: 0.45, y1: 0.53 },
  lip: { x0: 0, x1: 1, y0: 0.53, y1: 0.575 },
  lower: { x0: 0.06, x1: 0.94, y0: 0.575, y1: 0.945 },
};

function paintRounded(ctx, w, h, pal, opts = {}) {
  const u = olU(w), B = ROUNDED_BOX;
  const X = (n) => w * n, Y = (n) => h * n;
  const bx = (k) => [X(B[k].x0), Y(B[k].y0), X(B[k].x1 - B[k].x0), Y(B[k].y1 - B[k].y0)];

  cabFeet(ctx, w, pal, Y(0.93), h * 0.055, 0.1);
  shape(ctx, pal.body, u, (c) => rr(c, X(0.055), Y(0.155), X(0.89), Y(0.4), w * 0.14));
  shape(ctx, pal.body, u, (c) => rr(c, ...bx('lower'), w * 0.13));
  sideArt(ctx, pal, X(0.09), Y(0.6), X(0.82), Y(0.31));
  plain(ctx, lighten(pal.body, 0.16), (c) => rr(c, X(0.075), Y(0.18), w * 0.075, h * 0.34, w * 0.04));
  plain(ctx, pal.shade, (c) => rr(c, X(0.85), Y(0.18), w * 0.085, h * 0.34, w * 0.04));

  shape(ctx, pal.hood, u, (c) => rr(c, ...bx('hood'), w * 0.16));
  plain(ctx, pal.glass, (c) => rr(c, ...bx('glass'), w * 0.09));
  if (pal.lit) {
    marqueeArt(ctx, pal, X(B.glass.x0), Y(B.glass.y0), X(B.glass.x1 - B.glass.x0), Y(B.glass.y1 - B.glass.y0));
    glassGloss(ctx, X(B.glass.x0), Y(B.glass.y0), X(B.glass.x1 - B.glass.x0), Y(B.glass.y1 - B.glass.y0), 0.14);
    const g = ctx.createLinearGradient(0, Y(0.155), 0, Y(0.31));
    g.addColorStop(0, mix(pal.glass, pal.body, 0.55));
    g.addColorStop(1, pal.body);
    plain(ctx, g, (c) => rr(c, X(0.1), Y(0.155), w * 0.8, h * 0.15, w * 0.05));
  }

  shape(ctx, pal.shade, u, (c) => rr(c, ...bx('bezel'), w * 0.12));
  plain(ctx, pal.well, (c) => rr(c, ...bx('screen'), w * 0.08));

  shape(ctx, pal.deck, u, (c) => {
    c.moveTo(X(0.06), Y(B.deck.y0));
    c.lineTo(X(0.94), Y(B.deck.y0));
    c.arcTo(X(1), Y(B.deck.y1), X(0.9), Y(B.deck.y1), w * 0.1);
    c.lineTo(X(0.1), Y(B.deck.y1));
    c.arcTo(X(0), Y(B.deck.y1), X(0.06), Y(B.deck.y0), w * 0.1);
    c.closePath();
  });
  shape(ctx, pal.lipC, u, (c) => rr(c, ...bx('lip'), w * 0.06));
  deckControls(ctx, w, pal, Y(0.462), 1, opts.stickLean, opts.buttonPress, opts.stickFwd, [Y(B.deck.y0), Y(B.deck.y1)], opts.glint);
}

// --- chibi: big head, small body ------------------------------------------
// The heroes are all big-head-small-body, and that proportion is most of why
// they read cute. This gives the cabinet the same treatment: an oversized
// marquee and screen on a short stubby chassis. Wider and shorter than the
// reference — 44x78 rather than 40x90.
const CHIBI_BOX = {
  hood: { x0: 0, x1: 1, y0: 0, y1: 0.235 },
  // Glass stops just short of the hood's bottom edge: the strip it leaves behind
  // carries the plug bulbs (hub/index.js drawPlugLights). It was cut back
  // further than this to fit oversized bulbs; they are small again, so the
  // marquee gets its height back.
  glass: { x0: 0.07, x1: 0.93, y0: 0.04, y1: 0.193 },
  upper: { x0: 0.06, x1: 0.94, y0: 0.235, y1: 0.6 },
  bezel: { x0: 0.1, x1: 0.9, y0: 0.265, y1: 0.585 },
  screen: { x0: 0.14, x1: 0.86, y0: 0.283, y1: 0.567 }, screenR: 0.111,
  deck: { x0: 0, x1: 1, y0: 0.585, y1: 0.685 },
  lip: { x0: 0, x1: 1, y0: 0.685, y1: 0.73 },
  lower: { x0: 0.1, x1: 0.9, y0: 0.73, y1: 0.945 },
};

function paintChibi(ctx, w, h, pal, opts = {}) {
  const u = olU(w), B = CHIBI_BOX;
  const X = (n) => w * n, Y = (n) => h * n;
  const bx = (k) => [X(B[k].x0), Y(B[k].y0), X(B[k].x1 - B[k].x0), Y(B[k].y1 - B[k].y0)];

  cabFeet(ctx, w, pal, Y(0.925), h * 0.07, 0.14);
  shape(ctx, pal.body, u, (c) => rr(c, X(0.06), Y(0.2), X(0.88), Y(0.45), w * 0.13));
  shape(ctx, pal.body, u, (c) => rr(c, ...bx('lower'), w * 0.11));
  sideArt(ctx, pal, X(0.13), Y(0.75), X(0.74), Y(0.17));
  plain(ctx, lighten(pal.body, 0.16), (c) => rr(c, X(0.085), Y(0.26), w * 0.07, h * 0.3, w * 0.035));
  plain(ctx, pal.shade, (c) => rr(c, X(0.855), Y(0.26), w * 0.08, h * 0.3, w * 0.035));

  // The head: a fat rounded hood carrying most of the character.
  shape(ctx, pal.hood, u, (c) => rr(c, ...bx('hood'), w * 0.17));
  plain(ctx, pal.glass, (c) => rr(c, ...bx('glass'), w * 0.1));
  if (pal.lit) {
    marqueeArt(ctx, pal, X(B.glass.x0), Y(B.glass.y0), X(B.glass.x1 - B.glass.x0), Y(B.glass.y1 - B.glass.y0));
    glassGloss(ctx, X(B.glass.x0), Y(B.glass.y0), X(B.glass.x1 - B.glass.x0), Y(B.glass.y1 - B.glass.y0), 0.14);
    const g = ctx.createLinearGradient(0, Y(0.235), 0, Y(0.4));
    g.addColorStop(0, mix(pal.glass, pal.body, 0.5));
    g.addColorStop(1, pal.body);
    plain(ctx, g, (c) => rr(c, X(0.1), Y(0.235), w * 0.8, h * 0.16, w * 0.05));
  }

  shape(ctx, pal.shade, u, (c) => rr(c, ...bx('bezel'), w * 0.12));
  plain(ctx, pal.well, (c) => rr(c, ...bx('screen'), w * 0.08));

  shape(ctx, pal.deck, u, (c) => {
    c.moveTo(X(0.07), Y(B.deck.y0));
    c.lineTo(X(0.93), Y(B.deck.y0));
    c.arcTo(X(1), Y(B.deck.y1), X(0.88), Y(B.deck.y1), w * 0.12);
    c.lineTo(X(0.12), Y(B.deck.y1));
    c.arcTo(X(0), Y(B.deck.y1), X(0.07), Y(B.deck.y0), w * 0.12);
    c.closePath();
  });
  shape(ctx, pal.lipC, u, (c) => rr(c, ...bx('lip'), w * 0.07));
  deckControls(ctx, w, pal, Y(0.6), 1.15, opts.stickLean, opts.buttonPress, opts.stickFwd, [Y(B.deck.y0), Y(B.deck.y1)], opts.glint);
}

// --- candy: the curved Japanese cab ---------------------------------------
// Shoulders sweep in one continuous curve from the marquee down into the
// control deck. Inherently soft, and a far more distinctive silhouette than a
// rectangle — the tradeoff is that it is the furthest from the reference SVG.
const CANDY_BOX = {
  hood: { x0: 0, x1: 1, y0: 0, y1: 0.2 },
  glass: { x0: 0.09, x1: 0.91, y0: 0.03, y1: 0.165 },
  upper: { x0: 0.04, x1: 0.96, y0: 0.2, y1: 0.55 },
  bezel: { x0: 0.09, x1: 0.91, y0: 0.225, y1: 0.535 },
  screen: { x0: 0.13, x1: 0.87, y0: 0.238, y1: 0.517 }, screenR: 0.135,
  deck: { x0: 0, x1: 1, y0: 0.535, y1: 0.635 },
  lip: { x0: 0, x1: 1, y0: 0.635, y1: 0.675 },
  lower: { x0: 0.08, x1: 0.92, y0: 0.675, y1: 0.945 },
};

function paintCandy(ctx, w, h, pal, opts = {}) {
  const u = olU(w), B = CANDY_BOX;
  const X = (n) => w * n, Y = (n) => h * n;
  const bx = (k) => [X(B[k].x0), Y(B[k].y0), X(B[k].x1 - B[k].x0), Y(B[k].y1 - B[k].y0)];

  cabFeet(ctx, w, pal, Y(0.925), h * 0.06, 0.12);
  // One continuous body: shoulders in at the top, bulging out through the
  // screen, tucking back in above the deck.
  shape(ctx, pal.body, u, (c) => {
    c.moveTo(X(0.12), Y(0.185));
    c.quadraticCurveTo(X(0.02), Y(0.34), X(0.04), Y(0.5));
    c.lineTo(X(0.06), Y(B.deck.y0));
    c.lineTo(X(0.94), Y(B.deck.y0));
    c.lineTo(X(0.96), Y(0.5));
    c.quadraticCurveTo(X(0.98), Y(0.34), X(0.88), Y(0.185));
    c.closePath();
  });
  shape(ctx, pal.body, u, (c) => rr(c, ...bx('lower'), w * 0.1));
  sideArt(ctx, pal, X(0.11), Y(0.7), X(0.78), Y(0.22));
  plain(ctx, lighten(pal.body, 0.16), (c) => {
    c.moveTo(X(0.13), Y(0.22)); c.quadraticCurveTo(X(0.05), Y(0.35), X(0.07), Y(0.5));
    c.lineTo(X(0.14), Y(0.5)); c.quadraticCurveTo(X(0.13), Y(0.36), X(0.2), Y(0.24));
    c.closePath();
  });
  plain(ctx, pal.shade, (c) => {
    c.moveTo(X(0.87), Y(0.22)); c.quadraticCurveTo(X(0.95), Y(0.35), X(0.93), Y(0.5));
    c.lineTo(X(0.84), Y(0.5)); c.quadraticCurveTo(X(0.86), Y(0.36), X(0.8), Y(0.24));
    c.closePath();
  });

  // Curved marquee hood, wider at the bottom than the top.
  shape(ctx, pal.hood, u, (c) => {
    c.moveTo(X(0.1), Y(0.03));
    c.quadraticCurveTo(X(0.5), Y(-0.02), X(0.9), Y(0.03));
    c.lineTo(X(1), Y(B.hood.y1));
    c.lineTo(X(0), Y(B.hood.y1));
    c.closePath();
  });
  plain(ctx, pal.glass, (c) => rr(c, ...bx('glass'), w * 0.08));
  if (pal.lit) {
    marqueeArt(ctx, pal, X(B.glass.x0), Y(B.glass.y0), X(B.glass.x1 - B.glass.x0), Y(B.glass.y1 - B.glass.y0));
    glassGloss(ctx, X(B.glass.x0), Y(B.glass.y0), X(B.glass.x1 - B.glass.x0), Y(B.glass.y1 - B.glass.y0), 0.14);
    const g = ctx.createLinearGradient(0, Y(0.2), 0, Y(0.35));
    g.addColorStop(0, mix(pal.glass, pal.body, 0.5));
    g.addColorStop(1, pal.body);
    plain(ctx, g, (c) => rr(c, X(0.1), Y(0.2), w * 0.8, h * 0.14, w * 0.05));
  }

  shape(ctx, pal.shade, u, (c) => rr(c, ...bx('bezel'), w * 0.14));
  plain(ctx, pal.well, (c) => rr(c, ...bx('screen'), w * 0.1));

  shape(ctx, pal.deck, u, (c) => {
    c.moveTo(X(0.06), Y(B.deck.y0));
    c.lineTo(X(0.94), Y(B.deck.y0));
    c.quadraticCurveTo(X(1.02), Y(B.deck.y1 - 0.02), X(0.94), Y(B.deck.y1));
    c.lineTo(X(0.06), Y(B.deck.y1));
    c.quadraticCurveTo(X(-0.02), Y(B.deck.y1 - 0.02), X(0.06), Y(B.deck.y0));
    c.closePath();
  });
  shape(ctx, pal.lipC, u, (c) => rr(c, X(0.03), Y(B.lip.y0), w * 0.94, Y(B.lip.y1 - B.lip.y0), w * 0.08));
  deckControls(ctx, w, pal, Y(0.552), 1.1, opts.stickLean, opts.buttonPress, opts.stickFwd, [Y(B.deck.y0), Y(B.deck.y1)], opts.glint);
}

// Every silhouette, with the footprint it wants to be drawn at. Callers ask for
// a style by name and take the size from here rather than hardcoding one, since
// the three are deliberately different shapes.
export const CABINET_STYLES = {
  upright: { w: 40, h: 90, box: CABINET_BOX, paint: paintCabinet },
  rounded: { w: 40, h: 90, box: ROUNDED_BOX, paint: paintRounded },
  // Scaled up from the 44x78 the bake-off ran at, keeping the same 0.565
  // aspect. At 78 tall these sat 12px lower than the 90-tall upright the hub's
  // ceiling and wall were framed around, which left the top third of the
  // concourse as empty wall. 85 puts the marquees back near that line without
  // touching the squat proportion that made this the pick.
  chibi: { w: 48, h: 85, box: CHIBI_BOX, paint: paintChibi },
  candy: { w: 42, h: 86, box: CANDY_BOX, paint: paintCandy },
};

// The style the food court actually stands up. One constant, so switching the
// whole game between candidates is a one-word edit — which is the point of
// building all four and of keeping the losers around: they are still rendered
// side by side in the gallery's "Cabinet style bake-off", so changing your mind
// later costs a word, not a redraw.
export const CABINET_STYLE = 'chibi';

export function cabinetStyle(name) { return CABINET_STYLES[name] || CABINET_STYLES[CABINET_STYLE]; }

// ------------------------------------------------- shared cabinet hardware
// The parts every silhouette needs. Three styles should differ in their
// outline and proportions, not in three copies of the same coin door — so the
// furniture bolted onto the chassis lives here and takes its placement from
// whichever box is driving.

// A diagonal highlight raked across a piece of glass. This is most of what
// separates "cute" from "technical": a flat fill reads as a hole, a fill with a
// sweep across it reads as something with a surface.
function glassGloss(ctx, x, y, gw, gh, amt = 0.1, rad = null) {
  ctx.save();
  ctx.beginPath();
  rr(ctx, x, y, gw, gh, rad == null ? Math.min(gw, gh) * 0.16 : rad);
  ctx.clip();
  // A narrow band across one corner, not a wash over the whole pane. The first
  // pass swept most of the glass at 22%, which on the dark cabinets (crypt's
  // marquee is #281830) stopped reading as a reflection and started reading as
  // a grey slab laid over the art.
  plain(ctx, `rgba(255,255,255,${amt})`, (c) => {
    c.moveTo(x, y + gh * 0.52);
    c.lineTo(x + gw * 0.36, y - gh * 0.1);
    c.lineTo(x + gw * 0.56, y - gh * 0.1);
    c.lineTo(x, y + gh * 0.98);
    c.closePath();
  });
  ctx.restore();
}

// CRT scanlines and the tube's corner falloff. These screens are ~24x18
// logical units, so the pitch is set in logical units and left to antialias:
// at the backbuffer's 2-4x device density a 1.25-unit pitch lands as a soft
// dark line every 3-5 device pixels, which is what a CRT looks like from across
// a food court. Snapping to whole device pixels would be crisper, but it needs
// the renderer's scale down here and a hard-edged comb at this size reads as
// corduroy rather than as a screen.
//
// The rolling bright bar is NOT drawn here — it lives on the caller's clock and
// belongs OVER these lines, which is the right order: a lit sweep passing
// across a scanlined tube.
const SCANLINE_PITCH = 1.25;
export function crtScanlines(ctx, x, y, w, h, amt = 0.22, rad = null) {
  ctx.save();
  ctx.beginPath();
  rr(ctx, x, y, w, h, rad == null ? Math.min(w, h) * 0.1 : rad);
  ctx.clip();
  ctx.fillStyle = `rgba(6,4,12,${amt})`;
  for (let ly = 0; ly < h; ly += SCANLINE_PITCH) ctx.fillRect(x, y + ly, w, SCANLINE_PITCH * 0.48);
  // A tube is brighter in the middle than at its corners.
  const g = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.18,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.7,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(4,2,10,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// The marquee's own art: the cabinet's genre emblem between two bars standing
// in for a title nobody can read at this size. A blank lit panel reads as a
// missing texture; this reads as a marquee seen from across the concourse.
function marqueeArt(ctx, pal, gx, gy, gw, gh) {
  const art = GENRE_MOTIFS[pal.motif];
  if (!art) return;
  const tint = mix(pal.glass, pal.body, 0.5);
  const s = gh * 0.82;
  ctx.save();
  ctx.translate(gx + gw / 2 - s / 2, gy + (gh - s) / 2);
  art(ctx, s, s, tint, pal.glass);
  ctx.restore();
  plain(ctx, tint, (c) => {
    rr(c, gx + gw * 0.04, gy + gh * 0.36, gw * 0.26, gh * 0.28, gh * 0.14);
    rr(c, gx + gw * 0.7, gy + gh * 0.36, gw * 0.26, gh * 0.28, gh * 0.14);
  });
}

// One player's controls plus the coin slot, on a deck whose top surface is at
// `cy`. `k` scales the whole cluster.
//
// Single-player and asymmetric on purpose. The reference SVG is a two-player
// machine, but MASHENSTEIN is one hero at a time — two sticks promised a local
// co-op that does not exist. And at 40px across a mirrored deck reads as
// machined hardware, where an off-centre one reads as a face, which is most of
// what "cuter" means here.
//
// The coin slot moved up here from a door on the lower body. Down there it was
// a lot of small detail in the busiest part of the silhouette; up here it sits
// in the one band that is already about touching the machine, and it leaves the
// lower body clean for side art.
//
// Layout is the classic arcade one, left to right: stick, buttons, coin slot.
// Every ball and button gets a contact shadow under it and a catch-light on it
// — flat discs read as printed decals, lit spheres read as things you can push.
//
// `lean` is -1..1, how far the stick is pushed. It is a LEAN, not a redraw: an
// arcade stick seen head-on is upright when centred and tilts left or right when
// pushed, so a stick drawn permanently sideways would read as one somebody is
// leaning on rather than one that moves.
//
// What actually says "this goes in four directions" at 48 pixels is not the stick —
// it is the GATE, the dark plate the shaft comes through. A ball on a line is a
// lollipop; a ball on a line through a plate is a control. So the plate is drawn
// whenever there is room for it, and the cross scored into it is what makes the
// four directions explicit without needing the stick to move at all.
function deckControls(ctx, w, pal, cy, k = 1, lean = 0, press = 0, fwd = 0, band = null, glint = 0) {
  // Ball and button radii started at 0.07w / 0.045w — a 16%-of-panel-width ball
  // top, about double a real one, big enough that the deck competed with the
  // screen for attention. Now 0.036w / 0.023w: present, readable, and quiet
  // enough that the eye goes to the marquee and the screen first.
  const R = w * 0.036 * k;
  const jx = 0.2;
  const baseX = w * jx;
  const baseY = cy + R * 2;               // where the shaft meets the deck: the pivot
  // THE GATE. A dark oval plate with a cross scored through it — the restrictor every
  // four-way stick sits in. It is what makes the control read as directional; the
  // ball alone never can at this size.
  const gw = R * 1.5, gh = R * 0.62;
  plain(ctx, darken(pal.shade, 0.55), (c) => c.ellipse(baseX, baseY, gw, gh, 0, 0, Math.PI * 2));
  stroke(ctx, darken(pal.shade, 0.15), Math.max(0.35, w * 0.012 * k), (c) => {
    c.moveTo(baseX - gw * 0.72, baseY); c.lineTo(baseX + gw * 0.72, baseY);
    c.moveTo(baseX, baseY - gh * 0.72); c.lineTo(baseX, baseY + gh * 0.72);
  });
  // The stick itself, pivoting at the plate. A real one tilts and also DIPS — the
  // ball travels on an arc, not along a rail — so the top drops as it goes over.
  //
  // TWO AXES, because a four-way stick has two and the deck is claiming to be one.
  // `lean` is left/right and reads as a tilt. `fwd` is AWAY FROM THE PLAYER, and a
  // front view cannot show that as a tilt — pushed away, the ball rises a little,
  // foreshortens, and shrinks. That is the whole trick: away is drawn as smaller and
  // higher, and it reads instantly because it is what looking down a shaft does.
  const push = Math.max(-1, Math.min(1, lean));
  // Signed: +1 is pushed AWAY from the player, -1 is pulled TOWARD them. Both are
  // the same projection problem and they are exact opposites of it — away rises,
  // foreshortens and shrinks; toward drops, lengthens and grows. Drawing only the
  // away half would leave the exit (which is a pull toward you) with nothing to say.
  const depth = Math.max(-1, Math.min(1, fwd));
  const tilt = push * 0.62;                       // radians at full push
  // MORE THAN IS STRICTLY TRUE, on purpose. A correctly-projected push away from
  // the viewer moves a 1.7px ball by a fraction of a pixel — geometrically right
  // and completely invisible, which is the same as not drawing it. These are the
  // honest ratios roughly doubled: the ball travels a full radius, foreshortens by
  // nearly half, and changes size by a third, so the gesture reads at the size it
  // is actually displayed rather than at the size it would need to be.
  const len = R * 2 * (1 - 0.48 * depth);
  const topX = baseX + Math.sin(tilt) * len;
  const topY = baseY - Math.cos(tilt) * len - R * 1.15 * depth;
  const ballR = R * (1 - 0.30 * depth);
  const away = Math.max(0, depth);                // the catch-light only slides away
  // A SHAFT, not a stalk. This was 0.045w — as wide as a third of the ball — which
  // at cabinet size read as a lollipop on a post. A real ball-top sits on a thin
  // chrome rod; thinner also lets the gate underneath stay visible when the stick is
  // over, which is the part doing the "four directions" work.
  stroke(ctx, darken(pal.shade, 0.3), Math.max(0.4, w * 0.026 * k), (c) => {
    c.moveTo(topX, topY + ballR * 0.2); c.lineTo(baseX, baseY);
  });
  plain(ctx, darken(pal.knob, 0.5), (c) => c.arc(topX, topY + ballR * 0.22, ballR, 0, Math.PI * 2));
  plain(ctx, pal.knob, (c) => c.arc(topX, topY, ballR, 0, Math.PI * 2));
  // WHERE THE HIGHLIGHT SITS, which is not a fixed spot on the ball. The tube is
  // overhead and it does not move, so what the reflection tracks is where the ball
  // has got to under it: pushed away, more of the lit top cap turns into view and
  // the highlight rides up over it (`away`); pushed right, the tube is now up and
  // to the LEFT of the ball, so the highlight slides the other way across its
  // face. That lateral term is the whole reason the lean does not also need a
  // flash — a ball swinging sideways is a highlight travelling, and a travelling
  // highlight is what the eye reads as a round thing moving under a fixed light.
  const clx = topX - ballR * (0.32 + 0.16 * push), cly = topY - ballR * (0.34 + 0.18 * away);
  plain(ctx, lighten(pal.knob, 0.5), (c) => c.ellipse(
    clx, cly, ballR * 0.42, ballR * 0.3, -0.5, 0, Math.PI * 2));
  // THE GLINT. Nothing about this cabinet moves and neither does the tube above
  // it, so the reason a ball top flashes is the room: somebody walks past, the
  // fluorescent flickers, and for a third of a second the specular lands square
  // on the chrome. `glint` is 0..1 from the caller's clock (stickGlint) — the
  // same arrangement as the rolling screen bar, because arcade.js has no clock.
  //
  // Two marks and no more. The catch-light already in place goes hot, which is
  // what makes it read as THAT highlight brightening rather than as a second
  // light arriving; and one thin streak crosses the ball on the highlight's own
  // axis, because a round specular pop at a 2-unit radius is a dot, where a
  // streak still reads as chrome. A four-point star was the other option and it
  // reads as a pickup twinkling, which is a promise the deck cannot keep.
  if (glint > 0 && pal.lit) {
    const g = Math.max(0, Math.min(1, glint));
    ctx.save();
    ctx.globalAlpha = g;
    plain(ctx, lighten(pal.knob, 0.86), (c) => c.ellipse(
      clx, cly, ballR * 0.46, ballR * 0.34, -0.5, 0, Math.PI * 2));
    ctx.globalAlpha = g * 0.92;
    plain(ctx, '#ffffff', (c) => c.ellipse(
      clx, cly, ballR * 0.2, ballR * 0.14, -0.5, 0, Math.PI * 2));
    // Short and thin. It wants to bloom just past the silhouette — a specular on
    // a sphere does, and one stopped dead at the edge reads as decal — but the
    // first pass ran it to 1.15R at a fifth of the ball's width, which at any
    // real zoom is a white bar lying across the ball rather than light on it.
    ctx.globalAlpha = g * 0.62;
    stroke(ctx, '#ffffff', Math.max(0.3, ballR * 0.15), (c) => {
      const dx = Math.cos(-0.5) * ballR * 0.92, dy = Math.sin(-0.5) * ballR * 0.92;
      c.moveTo(clx - dx, cly - dy); c.lineTo(clx + dx, cly + dy);
    });
    ctx.restore();
  }

  // Two buttons, staggered like a real panel rather than sat in a row.
  //
  // `press` (0..1) pushes the FIRST one — the jump button. A pressed button is not a
  // darker circle: it sits down into the deck, so it loses the gap between it and its
  // own shadow and its catch-light shrinks toward the rim. Doing it any other way
  // reads as the colour changing rather than as the thing moving.
  const br = w * 0.023 * k;
  const hit = Math.max(0, Math.min(1, press));
  // The PAIR is placed against the deck band, not hung off `cy`. `cy` is the
  // stick's pivot line and sits high in the band, so measuring the buttons from
  // it left them with about a quarter of the slack above and three quarters
  // below — the group read as pushed up against the deck's top edge.
  //
  // Centred in the band is the reference, then LIFTED off it by a tenth of the
  // band. Dead centre is correct and reads flat: the deck is a surface tilted
  // toward the player, so its far half is further away, and hardware sitting a
  // little high on it is hardware sitting further back. Slightly more slack
  // below than above is the perspective — it is the near part of the deck, and
  // the near part of a tilted plane is the part you see most of. The stagger
  // between the two caps is unchanged; only where the pair sits has moved.
  const stag = R * 0.5;                                   // low cap below high cap
  const lift = band ? (band[1] - band[0]) * 0.1 : 0;      // back into the deck
  const mid = band ? (band[0] + band[1]) / 2 - lift : cy + R * 0.75;
  for (const [bx, rel, isJump] of [[0.38, 0.5, true], [0.5, -0.5, false]]) {
    const p = isJump ? hit : 0;
    const drop = br * 0.55 * p;
    const rest = mid + stag * rel;
    const by = rest + drop;
    // The shadow stays put and the cap comes down onto it.
    plain(ctx, darken(pal.shade, 0.45), (c) => c.arc(w * bx, rest + br * 0.3, br, 0, Math.PI * 2));
    plain(ctx, p > 0 ? darken(pal.button, 0.18 * p) : pal.button, (c) => c.arc(w * bx, by, br, 0, Math.PI * 2));
    plain(ctx, lighten(pal.button, 0.6), (c) => c.ellipse(
      w * bx - br * 0.26 * (1 - p * 0.4), by - br * 0.28 * (1 - p * 0.5),
      br * 0.36 * (1 - p * 0.45), br * 0.36 * (1 - p * 0.55), 0, 0, Math.PI * 2));
  }

  // The coin slot: a dark mouth in a pale bezel — the inverse of the buttons,
  // so it can never read as a third one — with the return light under it.
  const sx = w * 0.77, sw = w * 0.12 * k, sh = R * 3.2;
  const sy = cy - R * 0.3;
  plain(ctx, darken(pal.shade, 0.4), (c) => rr(c, sx - sw / 2, sy + sh * 0.1, sw, sh, sw * 0.26));
  plain(ctx, lighten(pal.deck, 0.32), (c) => rr(c, sx - sw / 2, sy, sw, sh, sw * 0.26));
  plain(ctx, pal.plate, (c) => rr(c, sx - sw * 0.15, sy + sh * 0.15, sw * 0.3, sh * 0.46, sw * 0.12));
  plain(ctx, pal.button, (c) => c.arc(sx, sy + sh * 0.79, sw * 0.14, 0, Math.PI * 2));
}

// Stubby rounded feet. A cabinet sitting flat on the floor reads as a slab;
// lifting it a couple of pixels onto feet is most of what makes it a character.
function cabFeet(ctx, w, pal, top, fh, inset = 0.08) {
  plain(ctx, darken(pal.shade, 0.5), (c) => {
    rr(c, w * inset, top, w * 0.2, fh, fh * 0.45);
    rr(c, w * (0.8 - inset), top, w * 0.2, fh, fh * 0.45);
  });
}

// Side art: the diagonal banding every real cabinet has down its flanks, which
// is what stops the lower body reading as a blank slab.
function sideArt(ctx, pal, x, y, aw, ah) {
  ctx.save();
  ctx.beginPath();
  rr(ctx, x, y, aw, ah, aw * 0.12);
  ctx.clip();
  plain(ctx, lighten(pal.body, 0.1), (c) => {
    for (let i = -2; i < 6; i++) {
      const sx = x + aw * (i * 0.34);
      c.moveTo(sx, y + ah); c.lineTo(sx + aw * 0.17, y + ah);
      c.lineTo(sx + aw * 0.17 + ah * 0.5, y); c.lineTo(sx + ah * 0.5, y);
      c.closePath();
    }
  });
  ctx.restore();
}

// Paint a vector painter straight into the destination at logical coordinates,
// instead of rasterizing it into a cached bitmap and blitting that.
//
// This is the whole resolution story for the food-court furniture. props.js
// caches because a run has dozens of obstacles on screen; the hub has at most
// seven cabinets and four doors, so the cache buys very little — and it costs
// real sharpness. rasterize() supersamples at 8x LOGICAL size, but the
// backbuffer is allocated at up to 4x DEVICE density (renderer.js resize()),
// so blitting the cache meant a bilinear downscale from 8x to 3-4x on every
// draw. Bilinear only samples 2x2 texels, so every edge came back softened.
// Painting the paths directly lets them rasterize natively at whatever density
// the backbuffer actually has — the same reason the heroes look crisp.
function paintInto(ctx, x, y, w, h, paint, pal, opts) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  paint(ctx, w, h, pal, opts);
  ctx.restore();
}

// The cabinet body. `pal` is a cabinetPalette() / OVERTIME_PALETTE object;
// `style` names one of CABINET_STYLES, defaulting to the active one.
export function drawCabinetShell(ctx, x, y, w, h, pal, style, opts) {
  paintInto(ctx, x, y, w, h, cabinetStyle(style).paint, pal, opts);
}

// The attract screen: glass fill plus the genre motif. Takes the CABINET box
// (not the glass box) and places itself, so callers never do the arithmetic.
// The moving scanline is deliberately NOT in here — it belongs to the caller's
// clock. Painted directly, same as the shell (see paintInto).
// `art` optionally replaces the genre motif with something else painted into
// the glass — the food court passes a slice of the cabinet's real level
// background. The motif stays the marquee's job either way: a logo belongs on
// the sign, and showing the same glyph twice on one machine was the tell that
// nothing was actually running on the screen.
export function drawCabinetScreen(ctx, x, y, w, h, pal, style, art) {
  if (!pal.lit || (!pal.motif && !art)) return null;
  const r = cabinetScreenRect(x, y, w, h, style);
  const rad = r.w * (cabinetStyle(style).box.screenR ?? 0.1);
  paintInto(ctx, r.x, r.y, r.w, r.h, (c, cw, ch) => {
    // Clipped to the recess and filled edge to edge. The picture used to be
    // inset inside a slightly larger dark well, which left a black rim around
    // every screen — truer to a real bezel, worse to look at. Now the well and
    // the picture are the same rect, so the art runs right to the glass.
    c.save();
    c.beginPath();
    rr(c, 0, 0, cw, ch, rad);
    c.clip();
    plain(c, pal.screen, (p) => p.rect(0, 0, cw, ch));
    if (art) art(c, cw, ch);
    else {
      const motif = GENRE_MOTIFS[pal.motif];
      if (motif) motif(c, cw, ch, pal.ink, pal.screen);
    }
    // Scanlines go over the art but under the gloss — the reflection is on the
    // outside of the glass, the phosphor grid is behind it.
    crtScanlines(c, 0, 0, cw, ch, 0.22, rad);
    // The glass reads as a lit surface rather than a hole punched in the bezel.
    glassGloss(c, 0, 0, cw, ch, 0.12, rad);
    c.restore();
  });
  return r;
}

// How bright the glint on one cabinet's ball top is right now: 0 almost always,
// else 0..1 for about a third of a second.
//
// Only lit machines ever get called with this. A locked cabinet has no working
// tube over it — the hub only powers the fixture above a bay once its cabinet is
// unlocked — so there is nothing up there for the chrome to catch, and a dark
// machine flashing a highlight would be the one thing on it that contradicts
// the dead marquee and the dead screen.
//
// VERY occasional, and never the whole row at once. Three things keep it that
// way, and it needs all three: each cabinet has its OWN period (12–31s, from its
// seed), its own starting offset, and — the part that matters most — it skips
// most of its own turns. Period and offset alone make a metronome, so a machine
// that glinted would glint again on a schedule you could count; the per-cycle
// coin flip is what turns that into "now and then". One turn in five fires, so
// any given stick catches the light about once every hundred seconds and the
// concourse as a whole shows one somewhere every ten or so — measured, not
// guessed: work/local/glint-probe.mjs counts them over three minutes. The first
// tuning ran four times that often, which read as a row of machines twinkling.
export function stickGlint(t, seed) {
  // Same failure mode as deadScreenBurst: NaN would lose every comparison
  // below, so an unseeded caller gets no glint rather than a permanent one.
  if (!Number.isFinite(seed)) return 0;
  const period = 12 + (seed % 9) * 2.4;
  const ph = t + (seed % 89) * 1.13;
  const cycle = Math.floor(ph / period);
  const phase = ph - cycle * period;
  const dur = 0.34;
  if (phase > dur) return 0;
  // Which turns fire is a hash of the cycle index, so it is stable — the same
  // second of the same session always looks the same — without being periodic.
  // It has to be a MIXING hash, not the one-round LCG the dead screen gets away
  // with: cycle indices are small integers a few apart, and one round leaves
  // their low bits correlated, which showed up as two of the nine cabinets never
  // glinting at all across three minutes while others went twice a minute.
  let n = ((cycle * 2654435761) ^ (seed * 40503)) >>> 0;
  n = (n ^ (n >>> 15)) >>> 0; n = (n * 2246822519) >>> 0;
  n = (n ^ (n >>> 13)) >>> 0; n = (n * 3266489917) >>> 0;
  n = (n ^ (n >>> 16)) >>> 0;
  if (n / 4294967296 > 0.2) return 0;
  // Snaps on in a couple of frames, falls off over the rest. A symmetric
  // envelope reads as a lamp fading up and down; a specular arrives.
  return Math.min(1, phase * 34, (dur - phase) * 4.2);
}

// How hard a dead screen is crackling right now: 0 when quiet, else 0..1.
// A locked cabinet is unplugged, not gone — the power is off but the thing is
// still standing there with a charge in it somewhere, so every several seconds
// it coughs. Bursts are short (~0.4s) and staggered by seed, the same
// per-index-offset idiom the hub's ceiling lights flicker on.
export function deadScreenBurst(t, seed) {
  // A missing seed would make every term below NaN, and NaN loses the `> 0.42`
  // comparison — so the burst would read as permanently on, on every cabinet at
  // once, instead of never. Fail quiet rather than fail loud.
  if (!Number.isFinite(seed)) return 0;
  const period = 6.5 + (seed % 5) * 1.3;
  const phase = (t + (seed % 97) * 0.41) % period;
  if (phase > 0.42) return 0;
  return Math.min(1, phase * 14, (0.42 - phase) * 6); // snaps on, decays out
}

// The rolling bright bar: an attract-mode tube whose vertical hold never quite
// syncs. Kept out of drawCabinetScreen because it moves every frame on the
// caller's clock, and drawn OVER crtScanlines — a lit sweep passing across a
// scanlined tube, not under it.
//
// Thin on purpose. At the first pass it was 12% of the glass height, which on
// an 18-unit screen is a 2px band — that reads as a shutter closing rather than
// as a tube rolling, and it swallowed the genre motif every time it crossed.
export function drawScreenSweep(ctx, r, t, seed = 0) {
  // Staggered per cabinet. On one shared clock every tube in the row rolled in
  // lockstep, which reads as a single effect stamped across the whole bank
  // rather than as nine machines each losing vertical hold on their own. Both
  // the rate and the starting phase vary, so they never drift back into step
  // either — matching rates with different offsets would resync on every wrap.
  const rate = 2.4 + (seed % 5) * 0.4;
  const step = Math.floor(t * rate + (seed % 97) * 0.31) % 4;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(r.x, r.y + step * (r.h / 4), r.w, Math.max(0.5, r.h * 0.05));
}

// One live frame of a dead screen, painted over the dark well the shell already
// drew. `amount` normally comes from the intermittent burst clock, but a cabinet
// can supply a fixed value for continuous static. Not cached and not baked: the
// bands have to move, and at five rects a frame there is nothing to save.
function drawDeadScreenBands(ctx, x, y, w, h, t, seed, amount) {
  // Deterministic noise stepped ~18x a second, so the bands snap between
  // positions like real static instead of sliding smoothly down the glass.
  let n = (Math.floor(t * 18) * 2654435761 + seed * 40503) >>> 0;
  const rnd = () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.save();
  ctx.globalAlpha = amount * 0.5;
  for (let i = 0; i < 5; i++) {
    const by = y + rnd() * h;
    const bh = Math.max(0.7, rnd() * h * 0.16);
    ctx.fillStyle = rnd() > 0.72 ? '#c8d0e0' : '#464e60';
    ctx.fillRect(x, by, w, Math.min(bh, y + h - by));
  }
  // The spark: one bright pop at the height of the burst. This is the bit that
  // reads at a glance from across the concourse — the bands alone are too low
  // contrast to catch the eye at 24px wide.
  if (amount > 0.65) {
    ctx.globalAlpha = amount;
    ctx.fillStyle = '#e8f0ff';
    ctx.fillRect(x + rnd() * (w - 2), y + rnd() * (h - 1), 2, 1);
  }
  ctx.restore();
}

// The static can also be the picture UNDER a cabinet dive. The dive owns the
// tube clip, scanlines and glass; this only supplies the moving phosphor bands.
export function deadScreenArt(t, seed, amount = deadScreenBurst(t, seed)) {
  return (ctx, w, h) => {
    if (amount > 0) drawDeadScreenBands(ctx, 0, 0, w, h, t, seed, amount);
  };
}

export function drawDeadScreen(ctx, x, y, w, h, t, seed, style, amount = deadScreenBurst(t, seed)) {
  const amt = amount;
  if (amt <= 0) return 0;
  const r = cabinetScreenRect(x, y, w, h, style);
  drawDeadScreenBands(ctx, r.x, r.y, r.w, r.h, t, seed, amt);
  // The same tube the live screens have. Only worth drawing during a burst —
  // on the black well of a quiet dead screen there is nothing for the lines to
  // darken, so they would cost a loop and show nothing.
  crtScanlines(ctx, r.x, r.y, r.w, r.h, amt * 0.3, r.w * (cabinetStyle(style).box.screenR ?? 0.1));
  // A burst lights the glass from inside and spills past the bezel, which is
  // what sells the machine as a thing with power still in it rather than as a
  // picture of noise.
  ctx.save();
  ctx.globalAlpha = amt * 0.16;
  ctx.fillStyle = '#8fa8d8';
  ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);
  ctx.restore();
  return amt;
}

// ============================================================== the doors
// Every service station in the food court — Repair Bench, Gary's, the Arcade
// Corner, the Trophy Shelf, the Back Room, the EXIT — is a door in the same
// wall. One painter, one architecture; the lit sign above it is what tells them
// apart, since at 44px wide no legend would be legible (the station's real name
// is already in the walk-up prompt).
export const DOOR_BOX = {
  sign: { x0: 0.04, x1: 0.96, y0: 0, y1: 0.143 },
  signGlass: { x0: 0.09, x1: 0.91, y0: 0.026, y1: 0.117 },
  bracket: { x0: 0.44, x1: 0.56, y0: 0.143, y1: 0.214 },
  frame: { x0: 0, x1: 1, y0: 0.214, y1: 1 },
  well: { x0: 0.12, x1: 0.88, y0: 0.27, y1: 1 },
  leaf: { x0: 0.165, x1: 0.835, y0: 0.3, y1: 1 },
};

// Sign icons, drawn into a square the height of the sign glass. `back` is the
// sign colour, for knocking holes back out of a silhouette — at ~10 logical px
// a solid shape is all you get unless something is cut out of it.
export const DOOR_ICONS = {
  // REPAIR BENCH: a spanner. Solid heads at both ends read as a dumbbell, so the
  // open jaw is cut out of one end and the ring bored through the other — those
  // two holes are the entire difference between a wrench and a bone.
  wrench(c, s, ink, back) {
    stroke(c, ink, s * 0.16, (p) => { p.moveTo(s * 0.32, s * 0.68); p.lineTo(s * 0.72, s * 0.28); });
    plain(c, ink, (p) => p.arc(s * 0.26, s * 0.74, s * 0.22, 0, Math.PI * 2));
    plain(c, back, (p) => { // the jaw, opening down-left
      p.moveTo(s * 0.26, s * 0.74); p.lineTo(s * -0.02, s * 0.6);
      p.lineTo(s * 0.08, s * 1.02); p.closePath();
    });
    plain(c, ink, (p) => p.arc(s * 0.76, s * 0.24, s * 0.2, 0, Math.PI * 2));
    plain(c, back, (p) => p.arc(s * 0.76, s * 0.24, s * 0.09, 0, Math.PI * 2));
  },
  // GARY'S LEGAL PAWN SHOP: the pawnbroker's three balls. A price
  // tag was the first try and collapsed into an unreadable dark diamond; three
  // circles survive any size, and they are the sign every pawn shop already has.
  pawn(c, s, ink) {
    plain(c, ink, (p) => {
      for (const [bx, by] of [[0.28, 0.32], [0.72, 0.32], [0.5, 0.72]]) {
        p.moveTo(s * (bx + 0.17), s * by);
        p.arc(s * bx, s * by, s * 0.17, 0, Math.PI * 2);
      }
    });
  },
  // ARCADE CORNER: a ball-top stick, echoing the cabinets next door.
  stick(c, s, ink) {
    plain(c, ink, (p) => rr(p, s * 0.18, s * 0.76, s * 0.64, s * 0.16, s * 0.06));
    stroke(c, ink, s * 0.12, (p) => { p.moveTo(s * 0.5, s * 0.76); p.lineTo(s * 0.5, s * 0.4); });
    plain(c, ink, (p) => p.arc(s * 0.5, s * 0.28, s * 0.2, 0, Math.PI * 2));
  },
  // TROPHY SHELF: a cup.
  cup(c, s, ink) {
    plain(c, ink, (p) => {
      p.moveTo(s * 0.26, s * 0.14); p.lineTo(s * 0.74, s * 0.14);
      p.quadraticCurveTo(s * 0.7, s * 0.58, s * 0.5, s * 0.62);
      p.quadraticCurveTo(s * 0.3, s * 0.58, s * 0.26, s * 0.14);
      p.closePath();
    });
    plain(c, ink, (p) => { rr(p, s * 0.42, s * 0.6, s * 0.16, s * 0.2, s * 0.03); rr(p, s * 0.26, s * 0.8, s * 0.48, s * 0.14, s * 0.04); });
  },
  // EXIT: an arrow out. Points left, which is the way out.
  arrow(c, s, ink) {
    plain(c, ink, (p) => {
      p.moveTo(s * 0.12, s * 0.5); p.lineTo(s * 0.46, s * 0.18); p.lineTo(s * 0.46, s * 0.38);
      p.lineTo(s * 0.86, s * 0.38); p.lineTo(s * 0.86, s * 0.62); p.lineTo(s * 0.46, s * 0.62);
      p.lineTo(s * 0.46, s * 0.82); p.closePath();
    });
  },
  // THE BACK ROOM (you did not see this door): nothing at all.
  none() {},
};

// EXIT signs in a failing building do not glow steadily. Mostly on, with the
// occasional stutter and a slow underlying buzz, on its own clock so it never
// syncs with the ceiling lights.
export function signFlicker(t) {
  const phase = t % 5.3;
  if (phase < 0.14) return phase < 0.07 ? 0.25 : 0.6;
  if (phase > 3.1 && phase < 3.18) return 0.45;
  return 0.93 + 0.07 * Math.sin(t * 11);
}

// The leaf that fills the doorway. Most stations get a door; the two that have
// something to show through the wall get something else, because at this size a
// sign is a weak way to say "this is a shop" and a lit window is a strong one.
function doorLeaf(ctx, w, h, pal, box, X, Y, u, openAmt = 0, t = 0) {
  if (pal.variant === 'slide') {
    // EXIT and the Trophy Room: an automatic sliding door, won out of the door
    // bake-off as the PORTHOLE. Its whole language is round — a big chrome-ringed
    // window, a band in the station's own sign colour, corners radiused well past
    // the swinging doors either side of it. The food court is a mall, not a
    // facility, and the two doors the hero walks through are the ones that should
    // say so; the technical-looking candidates all read as somewhere you would be
    // escorted out of.
    //
    // The leaf keeps its full width and translates into a pocket as `openAmt`
    // rises, clipped to the frame so it vanishes into the wall rather than just
    // narrowing. `slideDir` picks which side it retracts toward: EXIT opens away
    // from the concourse, out toward the wall you are leaving through.
    //
    // `icon: 'none'` marks a door with nothing behind it yet — LOCKED, and the
    // back room. That is a gameplay read, not a power-supply one (these run off
    // their own batteries, like everything else still lit in here): a door the
    // player cannot use yet must not look like one they can.
    const powered = pal.icon !== 'none';
    const dir = pal.slideDir === -1 ? -1 : 1;
    const [lx, ly, lw, lh] = box('leaf');
    const [fx, fy, fw, fh] = box('frame');
    const slideX = lx + dir * openAmt * lw * 0.92;
    ctx.save();
    ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
    shape(ctx, pal.door, u, (c) => rr(c, slideX, ly, lw, lh, w * 0.13));
    // The band, off the sign colour, so each door carries a note of its own
    // signage down at hero height where the sign itself is out of frame.
    plain(ctx, mix(pal.door, pal.sign, powered ? 0.45 : 0.12), (c) => c.rect(slideX, Y(0.73), lw, h * 0.07));
    // The porthole: chrome ring, a darker seat inside it, then the glass. Two
    // rings rather than one is what keeps it from reading as a flat dark spot
    // at this size — the bright outer edge is the whole reason it looks set
    // into the door instead of printed on it.
    const cx = slideX + lw * 0.5, cy = Y(0.49), r = lw * 0.29;
    plain(ctx, lighten(pal.frame, 0.42), (c) => c.arc(cx, cy, r + w * 0.024, 0, Math.PI * 2));
    plain(ctx, darken(pal.frame, 0.25), (c) => c.arc(cx, cy, r + w * 0.009, 0, Math.PI * 2));
    plain(ctx, powered ? darken(pal.sign, 0.5) : '#0b0912', (c) => c.arc(cx, cy, r, 0, Math.PI * 2));
    glassGloss(ctx, cx - r, cy - r, r * 2, r * 2, 0.24, r);
    // The pull: a hand-sized grip, not a full-height bar. It sits in the gap
    // between the porthole and the band, which is the only place on this leaf
    // that reads as somewhere you would actually put a hand — and at that
    // length it gives the door a sense of scale instead of competing with the
    // window for the eye. A hair of shadow behind it lifts it off the face.
    const gripX = slideX + lw * 0.85, gripY = Y(0.622), gripH = h * 0.075;
    plain(ctx, darken(pal.door, 0.4), (c) => rr(c, gripX - w * 0.006, gripY + h * 0.006, w * 0.028, gripH, w * 0.014));
    plain(ctx, lighten(pal.frame, 0.34), (c) => rr(c, gripX, gripY, w * 0.028, gripH, w * 0.014));
    ctx.restore();
    // The header sensor in its housing: standby amber, green while it is holding
    // the door for someone close enough to walk through.
    const sx = X(0.5), sy = box('well')[1] - h * 0.022;
    plain(ctx, darken(pal.frame, 0.4), (c) => c.arc(sx, sy, w * 0.034, 0, Math.PI * 2));
    if (powered) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, 0.5 + 0.5 * Math.abs(Math.sin(t * 1.5)) * (1 - openAmt) + openAmt * 0.5);
      plain(ctx, mix('#c8862c', '#48e070', openAmt), (c) => c.arc(sx, sy, w * 0.018, 0, Math.PI * 2));
      ctx.restore();
    }
    return;
  }
  if (pal.variant === 'window') {
    // GARY'S: a shopfront, not a door. Warm interior light behind glass, a
    // counter across it, and glazing bars — so the pawn shop reads as somewhere
    // with stock in it rather than as a closed room.
    const glow = pal.glow || '#f8c890';
    plain(ctx, darken(glow, 0.45), (c) => rr(c, ...box('leaf'), w * 0.08));
    const g = ctx.createLinearGradient(0, Y(0.3), 0, Y(1));
    g.addColorStop(0, glow);
    g.addColorStop(1, darken(glow, 0.55));
    plain(ctx, g, (c) => rr(c, X(0.19), Y(0.33), w * 0.62, h * 0.62, w * 0.06));
    plain(ctx, darken(pal.frame, 0.35), (c) => { // glazing bars
      c.rect(X(0.49), Y(0.33), w * 0.03, h * 0.62);
      c.rect(X(0.19), Y(0.56), w * 0.62, h * 0.03);
    });
    plain(ctx, darken(pal.frame, 0.15), (c) => rr(c, X(0.17), Y(0.78), w * 0.66, h * 0.07, w * 0.02)); // counter
    return;
  }
  if (pal.variant === 'shutter') {
    // THE REPAIR BENCH: a roller shutter half up, with the box it rolls into.
    // Slats read instantly as a workshop, and the gap under it says "open".
    shape(ctx, pal.door, u, (c) => rr(c, ...box('leaf'), w * 0.08));
    plain(ctx, darken(pal.door, 0.4), (c) => {
      for (let i = 0; i < 5; i++) c.rect(X(0.185), Y(0.35 + i * 0.075), w * 0.63, h * 0.045);
    });
    plain(ctx, darken(pal.door, 0.6), (c) => rr(c, X(0.165), Y(0.72), w * 0.67, h * 0.05, w * 0.02)); // shutter lip
    plain(ctx, '#080610', (c) => c.rect(X(0.185), Y(0.77), w * 0.63, h * 0.23));           // the gap under it
    plain(ctx, lighten(pal.frame, 0.1), (c) => rr(c, X(0.15), Y(0.29), w * 0.7, h * 0.06, w * 0.02)); // roller box
    return;
  }
  // The default leaf: the Arcade Corner and the back room. These two sit in the
  // middle of the concourse and are not boundaries you cross, so they are
  // HINGED rather than automatic — no pocket, no sensor watching for somebody
  // who mostly never arrives.
  //
  // Everything else is borrowed from the porthole pair either side of them: the
  // same soft corners, the same two-ring window, the same band off the station's
  // own sign colour. The wall should read as one set of doors with two
  // mechanisms, rather than as two unrelated sets.
  //
  // `openAmt` swings it INWARD. There is no third dimension to rotate a leaf
  // in, so it foreshortens instead: the face keeps its height and loses width
  // toward the hinge, which is what a door turning away from you actually does
  // to its own silhouette. At 0 the clip is the leaf's own box and every stroke
  // below lands exactly where it did before anything could open, so a door
  // nobody is walking through is untouched by any of this.
  const powered = pal.icon !== 'none';
  const [lx, ly, lw, lh] = box('leaf');
  // THE FACE IS SQUEEZED, NOT CUT. Clipping the leaf to a narrowing rectangle
  // was the first attempt and it read as a sliding door: the face kept its own
  // proportions right up to the cut, so all the eye saw was a door leaving to
  // the left. A door that TURNS does three things a door that slides does not,
  // and it needs all three to read at 44px:
  //
  //  - its face compresses toward the hinge, so the round porthole goes
  //    elliptical — that ellipse is the single strongest rotation cue here;
  //  - its free edge is further away than its hinge edge, so the silhouette is
  //    a trapezoid rather than a rectangle;
  //  - the face turns away from the light, so it darkens as it goes.
  const openW = Math.max(lw * 0.06, lw * (1 - openAmt * 0.88));
  const inset = lh * openAmt * 0.13;
  const trapezoid = (c) => {
    c.moveTo(lx, ly);
    c.lineTo(lx + openW, ly + inset);
    c.lineTo(lx + openW, ly + lh - inset);
    c.lineTo(lx, ly + lh);
    c.closePath();
  };
  ctx.save();
  // Clip first, in unsqueezed space, so the trapezoid stays the silhouette...
  ctx.beginPath(); trapezoid(ctx); ctx.clip();
  // ...then squeeze everything drawn into it horizontally about the hinge. Every
  // stroke below is written at its closed-door position and gets foreshortened
  // for free, which is also why the porthole needs no special case to become an
  // ellipse.
  ctx.translate(lx, 0);
  ctx.scale(openW / lw, 1);
  ctx.translate(-lx, 0);
  shape(ctx, pal.door, u, (c) => rr(c, lx, ly, lw, lh, w * 0.12));
  // The band, carried at the same height as the sliding pair so the row lines up.
  plain(ctx, mix(pal.door, pal.sign, powered ? 0.45 : 0.12), (c) => c.rect(lx, Y(0.73), lw, h * 0.07));
  // The window: same construction as the porthole, set a touch smaller and
  // pushed off the hinge — a relative, not a copy.
  const cx = lx + lw * 0.56, cy = Y(0.47), r = lw * 0.25;
  plain(ctx, lighten(pal.frame, 0.42), (c) => c.arc(cx, cy, r + w * 0.022, 0, Math.PI * 2));
  plain(ctx, darken(pal.frame, 0.25), (c) => c.arc(cx, cy, r + w * 0.008, 0, Math.PI * 2));
  plain(ctx, powered ? darken(pal.sign, 0.5) : '#0b0912', (c) => c.arc(cx, cy, r, 0, Math.PI * 2));
  glassGloss(ctx, cx - r, cy - r, r * 2, r * 2, 0.24, r);
  // The knob, in the window ring's own metal rather than the old bare white —
  // one material for every piece of hardware on the wall.
  const kx = lx + lw * 0.86, ky = Y(0.612);
  plain(ctx, darken(pal.frame, 0.4), (c) => c.arc(kx, ky + h * 0.004, w * 0.042, 0, Math.PI * 2));
  plain(ctx, lighten(pal.frame, 0.42), (c) => c.arc(kx, ky, w * 0.04, 0, Math.PI * 2));
  plain(ctx, lighten(pal.frame, 0.62), (c) => c.arc(kx - w * 0.013, ky - w * 0.012, w * 0.015, 0, Math.PI * 2));
  ctx.restore();
  if (openAmt > 0.02) {
    // INWARD, and this is what says so. A door swinging OUT brings its free
    // edge toward you: that edge catches the light, and the leaf starts to
    // cover the wall around its own frame. A door swinging IN sends that edge
    // away into an unlit room, so the face has to fall off into shadow ACROSS
    // itself — brightest still at the hinge, which has barely moved, darkest at
    // the free edge, which is now deepest into the dark.
    //
    // A flat wash over the whole face was the first attempt and it read as
    // swinging out, because an evenly dimmed door is just a dimmer door facing
    // you. The gradient is the entire difference.
    const g = ctx.createLinearGradient(lx, 0, lx + openW, 0);
    g.addColorStop(0, `rgba(11,9,18,${Math.min(0.3, openAmt * 0.3)})`);
    g.addColorStop(1, `rgba(11,9,18,${Math.min(0.82, openAmt * 0.85)})`);
    plain(ctx, g, trapezoid);
    // The leaf's own edge, seen as it turns — and DARK, because on an inward
    // swing that edge is inside the doorway looking away from every light in
    // the concourse. Lit, it read as the near edge of a door opening outward.
    plain(ctx, darken(pal.door, 0.62), (c) => {
      c.moveTo(lx + openW, ly + inset);
      c.lineTo(lx + openW + w * 0.018, ly + inset * 1.5);
      c.lineTo(lx + openW + w * 0.018, ly + lh - inset * 1.5);
      c.lineTo(lx + openW, ly + lh - inset);
      c.closePath();
    });
  }
  // The hinge stile and its plates stay put, because the hinge does. Outside the
  // clip for exactly that reason — they are the part of the door that is not
  // going anywhere, and watching them swing away with the face was the tell that
  // the first version of this was a wipe.
  plain(ctx, darken(pal.door, 0.45), (c) => c.rect(lx, ly + h * 0.02, w * 0.034, lh - h * 0.04));
  plain(ctx, lighten(pal.frame, 0.34), (c) => {
    rr(c, lx - w * 0.004, Y(0.38), w * 0.05, h * 0.055, w * 0.01);
    rr(c, lx - w * 0.004, Y(0.87), w * 0.05, h * 0.055, w * 0.01);
  });
}

function paintDoor(ctx, w, h, pal, lit = 1, openAmt = 0, t = 0) {
  const u = olU(w);
  const X = (n) => w * n, Y = (n) => h * n;
  const B = DOOR_BOX;
  const box = (k) => [X(B[k].x0), Y(B[k].y0), X(B[k].x1 - B[k].x0), Y(B[k].y1 - B[k].y0)];

  // Frame first — a slab of wall with the doorway cut into it. Corners are
  // radiused hard to sit beside the chibi cabinets: a square-cornered door next
  // to a round-shouldered machine reads as two different games' art.
  shape(ctx, pal.frame, u, (c) => rr(c, ...box('frame'), w * 0.13));
  plain(ctx, darken(pal.frame, 0.3), (c) => rr(c, X(0.85), Y(0.25), w * 0.11, h * 0.72, w * 0.05));
  plain(ctx, lighten(pal.frame, 0.14), (c) => rr(c, X(0.04), Y(0.25), w * 0.07, h * 0.72, w * 0.035));
  // The recess. Genuinely dark: a door you can see into is a doorway, and a
  // doorway is what makes these read as rooms rather than as vending machines.
  //
  // `paintAperture` is the bake-off seam: a candidate palette owns everything
  // between the wall slab and the sign — recess, leaf and any chrome of its
  // own — so a proposed door can be tried whole without a fork of this file or
  // an entry in DOOR_PALETTES. Candidates live in src/dev/; nothing shipped
  // sets it. Helpers ride along so a candidate never has to reach in here for
  // the colour maths.
  if (pal.paintAperture) {
    pal.paintAperture({
      ctx, w, h, pal, box, X, Y, u, openAmt, t,
      rr, shape, plain, stroke, mix, lighten, darken, glassGloss,
    });
  } else {
    plain(ctx, '#080610', (c) => rr(c, ...box('well'), w * 0.09));
    doorLeaf(ctx, w, h, pal, box, X, Y, u, openAmt, t);
  }

  // The sign: a bracket, a lit board, and the station's icon in the middle of
  // it. `lit` dims the whole lit assembly together — glass and legend — so a
  // flickering sign browns out rather than having its parts blink independently.
  plain(ctx, darken(pal.frame, 0.4), (c) => rr(c, ...box('bracket'), w * 0.02));
  shape(ctx, darken(pal.sign, 0.55), u, (c) => rr(c, ...box('sign'), w * 0.09));
  ctx.save();
  ctx.globalAlpha = lit;
  plain(ctx, pal.sign, (c) => rr(c, ...box('signGlass'), w * 0.07));
  // A legend where there is one. The word and the arrow share the glass, so the
  // icon shifts left to make room rather than the two overlapping — this is the
  // one sign in the food court that has to be readable and not merely
  // recognizable, because it is how you leave.
  const gy = Y(B.signGlass.y0), gh = h * (B.signGlass.y1 - B.signGlass.y0);
  const icon = DOOR_ICONS[pal.icon] || DOOR_ICONS.none;
  const s = gh * 0.88;
  if (pal.label) {
    const scale = gh / 11;
    const tw = textWidth(pal.label, scale, 'bold');
    const total = s * 0.8 + w * 0.04 + tw;
    const left = X(0.5) - total / 2;
    ctx.save();
    ctx.translate(left, gy + (gh - s * 0.8) / 2);
    icon(ctx, s * 0.8, pal.ink, pal.sign);
    ctx.restore();
    drawText(ctx, pal.label, left + s * 0.8 + w * 0.04, gy + (gh - 9 * scale) / 2, pal.ink, scale, 'bold');
  } else {
    ctx.save();
    ctx.translate(X(0.5) - s / 2, gy + (gh - s) / 2);
    icon(ctx, s, pal.ink, pal.sign);
    ctx.restore();
  }
  // The same raked reflection the cabinet screens carry, so the sign reads as a
  // lit panel behind glass rather than as a flat sticker.
  glassGloss(ctx, ...box('signGlass'), 0.16, w * 0.07);
  ctx.restore();
}

// A service door. `pal` is {id, frame, door, sign, ink, icon, label?, variant?,
// flicker?}. Painted directly rather than cached, for the same sharpness reason
// as the cabinet — see paintInto(). `t` drives the sign flicker on palettes
// that have one, and the sensor pulse on the 'slide' variant; everything else
// ignores it. `openAmt` (0..1) slides that variant's leaf open — callers ease
// it up from proximity, not a clock.
/**
 * opts.steady  0..1, how far to ease a flickering sign back toward full.
 *
 * A dying EXIT sign is atmosphere in a wide shot of the concourse and a strobe
 * the moment something magnifies it. The cabinet dive does exactly that: it
 * doubles the room on the way in, the sign is the brightest thing left beside
 * the machine, and signFlicker drops it to a quarter twice every 5.3s — so for
 * most of a 2.4-second shot the corner of the frame is blinking at the player
 * while they are meant to be watching the glass. The dive feeds its own push-in
 * through here, so the building stops sputtering exactly as fast as the camera
 * closes in. 0 is the shipped flicker and every other caller gets it.
 */
export function drawDoor(ctx, x, y, w, h, pal, t = 0, openAmt = 0, { steady = 0 } = {}) {
  const raw = pal.flicker ? signFlicker(t) : 1;
  const ease = steady > 0 ? (steady > 1 ? 1 : steady) : 0;
  const lit = raw + (1 - raw) * ease;
  paintInto(ctx, x, y, w, h, (c, cw, ch, p) => paintDoor(c, cw, ch, p, lit, openAmt, t), pal);
}

// The food court's own doors. Keyed by HubState station type.
export const DOOR_PALETTES = {
  // Lifted well off the near-black these started at. A door in the same wall as
  // a lit cabinet should not read darker than the wall behind it — at the old
  // values the service end of the concourse fell into a hole every time the
  // camera left the machines.
  // EXIT and the Trophy Room are the two boundary doors the hero actually
  // walks through, which is what earns them the 'slide' variant — an
  // automatic door with its own sensor and porthole — while the food court's
  // other doors stay the plainer swinging default.
  // Retracts left, toward the wall it's set into — the door reads as opening
  // OUT of the building, not sliding into the concourse the hero is leaving.
  exit: { id: 'exit', frame: '#3c5346', door: '#2b4436', sign: '#48e070', ink: '#04140a', icon: 'arrow', label: 'EXIT', flicker: true, variant: 'slide', slideDir: -1 },
  bench: { id: 'bench', frame: '#5d7182', door: '#42576a', sign: '#48a8f0', ink: '#06121e', icon: 'wrench', variant: 'shutter' },
  shop: { id: 'shop', frame: '#7c5a7c', door: '#5d4460', sign: '#f890b8', ink: '#2a0c1c', icon: 'tag', variant: 'window', glow: '#f8c890' },
  arcade: { id: 'arcade', frame: '#46606b', door: '#334a55', sign: '#48e0c8', ink: '#04201c', icon: 'stick' },
  shelf: { id: 'shelf', frame: '#6b6350', door: '#4e4733', sign: '#f6d33c', ink: '#241c04', icon: 'cup', variant: 'slide' },
  // Present from the start, but deliberately unpowered until the player has
  // something to exhibit. Keeping the same carcass makes its later activation
  // read as this door coming online rather than a new door appearing —
  // 'icon: none' is what keeps its porthole and sensor dark until then.
  shelfLocked: { id: 'shelfLocked', frame: '#403c34', door: '#302d27', sign: '#514b3d', ink: '#b0a895', icon: 'none', label: 'LOCKED', variant: 'slide' },
  // Unmarked, unlit, and slightly ajar. The sign board is there; nothing is
  // written on it, and nothing behind it is switched on. This one stays dark on
  // purpose — it is the only door that is supposed to disappear.
  backroom: { id: 'backroom', frame: '#332e3a', door: '#221d29', sign: '#302a38', ink: '#302a38', icon: 'none' },
  // The staff door the cast comes through in the opening film. An automatic
  // door like EXIT — same slide, same retract toward the wall — but with the
  // sign board blanked the way backroom blanks it: this is the way IN to a
  // building that is closed, and a lit EXIT over it would be answering a
  // question nobody asked.
  service: { id: 'service', frame: '#3a3f4a', door: '#2a2e38', sign: '#2f333d', ink: '#2f333d', icon: 'none', variant: 'slide', slideDir: -1 },
};

// ------------------------------------------------------------ serving line
// The service end of the food court used to be a row of doors: you fixed your
// gear behind a shutter and pawned it through a second shutter, in a room whose
// wall was advertising a lunch counter that did not exist. Both are counters
// now. Nothing here was rebuilt — it was REPURPOSED, which is the room's whole
// joke and the reason the trays are still trays, the warming wells are still
// warm, and the only thing that changed about the menu is what is in the tray.
//
// Two variants off one carcass. `serving` is Dolores's steam table (tray rail,
// wells, sneeze guard, heat lamps); `pawn` is Gary's till (security grille,
// register, tagged stock on the shelf). They share a deck, a front and a back
// shelf, because they ARE the same counter — the food court only ever built one
// kind, and the pawn shop moved into a unit that already had one.
//
// Every vertical landmark is an absolute HEIGHT OFF THE FLOOR in logical px,
// not a fraction of the box. A counter is a set of heights — deck at the
// customer's chest, guard at the server's collarbone, lamps above her head —
// and while these were fractions of `h`, every attempt to move one rescaled all
// the others: raising the lamps to clear Dolores's head dragged the deck up
// with them. `k` restores proportional scaling for callers drawing at some other
// size, so at COUNTER_H the numbers below are literally pixels.
export const COUNTER_W = 118, COUNTER_H = 70;
// Deck and guard are set by what has to stay VISIBLE over them, not by what a
// counter really measures. At a true serving height (deck at the customer's
// chest, guard at the server's collarbone) both staff were a head floating on a
// slab: correct, and useless — the apron, the name tag, the arms and the whole
// reason for drawing a character were behind the furniture.
const CTR = {
  deck: 19,       // top of the serving deck
  slab: 22,       // its front lip
  railLo: 8, railHi: 14,
  shelf: 24,      // the back shelf the staff work in front of
  guard: 30,      // glass top rail, over the wells only — see COUNTER_GLASS_R
  // Just clear of DOLORES_H — below it the hood crops her head, far above it the
  // lamps stop reading as this counter's lamps and start reading as ceiling.
  lampLo: 56, lampHi: 64,
};
// A real serving line is not glazed end to end: the wells are under glass and
// the till end is open, which is where the person serving you actually stands.
// Splitting the counter that way is what finally got the staff out from behind
// their own furniture — the glass runs the left of the unit, and Dolores and
// Gary stand at the open right end with nothing but deck in front of them. The
// hub positions them off COUNTER_STAFF_X, so where they stand and where the
// glass stops can never drift apart.
const COUNTER_GLASS_L = 0.05, COUNTER_GLASS_R = 0.56;
export const COUNTER_STAFF_X = 0.73;
const COUNTER_PAL = {
  body: '#42576a', bodyLo: '#334352', deck: '#9aa8b4', rail: '#b6c2cc',
  well: '#141220', housing: '#3a4450', lamp: '#f6a83c',
};
// Gary's unit, in the pawn shop's own plum — the same family DOOR_PALETTES.shop
// used, so the station keeps its colour identity now that it has stopped being
// a door.
const PAWN_PAL = {
  body: '#5d4460', bodyLo: '#48344c', deck: '#a08aa4', rail: '#bda8bf',
  well: '#150f1c', housing: '#3e2e42', lamp: '#f890b8',
};
// The marker somebody has been correcting this place with, in the two values
// backwall.js established for it: the bright one is for dark surfaces (the
// menu board's backlit panel), the deep one for anything written on pale stock.
// A placard is cream card, so it gets the deep one — the bright teal that reads
// beautifully on a black lightbox disappears on paper.
const MARKER_ON_DARK = '#48e0c8', MARKER_ON_PALE = '#0d5f57';

// `server` is painted between the back shelf and the counter front, which is
// the only reason it is a callback rather than the caller drawing the staff
// themselves: standing behind a counter is a Z-ORDER, and the one place that
// ordering can be stated correctly is inside the thing doing the occluding.
export function drawCounter(ctx, x, y, w, h, { t = 0, server = null, variant = 'serving' } = {}) {
  const pawn = variant === 'pawn';
  const P = pawn ? PAWN_PAL : COUNTER_PAL;
  const u = olU(w);
  const X = (n) => x + w * n;
  const k = h / COUNTER_H;              // 1 at natural size; scales other callers
  const up = (px) => y + h - px * k;    // height off the floor, in logical px
  const tall = (px) => px * k;          // a vertical EXTENT in the same units
  const floor = y + h;

  // Back shelf: the run behind the counter, carrying what the unit never put
  // away. Dressed on the LEFT only — the staff stand at the right-hand end, and
  // anything shelved behind them is occluded by a person. Everything on it also
  // sits above the deck, since below that the counter's own front hides it.
  plain(ctx, P.bodyLo, (c) => c.rect(X(0.04), up(CTR.shelf), w * 0.92, tall(3.4)));
  plain(ctx, darken(P.bodyLo, 0.3), (c) => c.rect(X(0.04), up(CTR.shelf), w * 0.92, tall(1)));
  if (pawn) {
    // Stock, tagged and shelved. Nothing matches anything: a pawn shop's back
    // wall is the one place in a shop where the merchandise has no theme.
    const stock = [['#c8a03c', 0.06, 9], ['#7a8ec8', 0.15, 13], ['#c85a5a', 0.24, 7],
      ['#6fa89c', 0.33, 11], ['#c8c8d8', 0.42, 8]];
    for (const [col, fx, ht] of stock) {
      shape(ctx, col, u, (c) => rr(c, X(fx), up(CTR.shelf + ht), w * 0.062, tall(ht - 1), w * 0.008));
      plain(ctx, '#ded8c8', (c) => c.rect(X(fx + 0.011), up(CTR.shelf + ht - 1.5), w * 0.026, tall(2.2)));
    }
  } else {
    // A coffee urn nobody has emptied, its sight glass still reading full.
    shape(ctx, '#6b7684', u, (c) => rr(c, X(0.06), up(CTR.shelf + 15), w * 0.10, tall(15), w * 0.012));
    plain(ctx, '#20283a', (c) => c.rect(X(0.075), up(CTR.shelf + 11), w * 0.026, tall(5.6)));
    plain(ctx, '#8a5a3c', (c) => c.rect(X(0.079), up(CTR.shelf + 10.2), w * 0.018, tall(3.8)));
    // Trays, stacked and waiting, in the brown every cafeteria tray has ever been.
    for (let i = 0; i < 5; i++) {
      plain(ctx, i % 2 ? '#7a5a4a' : '#8a6a56',
        (c) => c.rect(X(0.21), up(CTR.shelf + 2 + i * 2.4), w * 0.13, tall(2)));
    }
  }

  if (server) server(ctx);

  // The deck and the front of the counter — the big flat plane the player walks
  // up to, carrying the thing that used to be on the door: what the station is.
  shape(ctx, P.body, u, (c) => rr(c, X(0.02), up(CTR.deck), w * 0.96, tall(CTR.deck), w * 0.010));
  plain(ctx, P.bodyLo, (c) => c.rect(X(0.02), up(7), w * 0.96, tall(7)));
  plain(ctx, P.deck, (c) => rr(c, X(0), up(CTR.slab), w, tall(CTR.slab - CTR.deck + 1), w * 0.008));
  // Tray rail, standing off the front face on two brackets. This is the single
  // detail that makes the silhouette read as a cafeteria line from across the
  // concourse, so it gets real thickness rather than a drawn-on stripe. The pawn
  // unit keeps it: it did not take the rail off, it just stopped using it.
  for (const f of [0.10, 0.88]) {
    plain(ctx, darken(P.body, 0.25), (c) => c.rect(X(f), up(CTR.railHi), w * 0.018, tall(CTR.railHi - CTR.railLo)));
  }
  shape(ctx, P.rail, Math.max(10, u * 0.7),
    (c) => rr(c, X(0.035), up(CTR.railHi), w * 0.93, tall(2.6), tall(1.3)));

  // The glass section, left end. Both variants put the same box in the same
  // band — a sneeze guard and a display case are the same object doing opposite
  // jobs, and the food court only ever built one kind of counter.
  const GL = X(COUNTER_GLASS_L), GR = X(COUNTER_GLASS_R);
  if (pawn) {
    // Small tagged valuables, sat inside the case on the deck.
    for (let i = 0; i < 5; i++) {
      plain(ctx, ['#f6d33c', '#c8c8d8', '#f890b8', '#48c0e0', '#f6d33c'][i],
        (c) => c.rect(X(0.09 + i * 0.088), up(CTR.slab + 2.6), w * 0.036, tall(2.8)));
    }
  } else {
    // Warming wells, sunk into the deck. Two empty, one holding what the counter
    // serves now — fuses and plugs, portioned into rows exactly the way the
    // nachos were. Nobody converted this; somebody put different things in the
    // tray.
    for (let i = 0; i < 3; i++) {
      const wx = X(0.08 + i * 0.163), ww = w * 0.145;
      plain(ctx, P.well, (c) => rr(c, wx, up(CTR.slab + 1.6), ww, tall(3.4), w * 0.005));
      if (i !== 1) continue;
      for (let n = 0; n < 3; n++) {
        plain(ctx, n % 2 ? '#f6d33c' : '#c8c8d8',
          (c) => c.rect(wx + ww * (0.16 + n * 0.26), up(CTR.slab + 1.2), ww * 0.15, tall(1.9)));
      }
    }
  }
  for (const gx of [GL, GR - w * 0.016]) {
    plain(ctx, pawn ? '#8a7a94' : '#6b7684', (c) => c.rect(gx, up(CTR.guard), w * 0.016, tall(CTR.guard - CTR.slab)));
  }
  ctx.save();
  ctx.globalAlpha = pawn ? 0.22 : 0.20;
  plain(ctx, pawn ? '#e8d8f0' : '#cfe4f0', (c) => c.rect(GL, up(CTR.guard), GR - GL, tall(CTR.guard - CTR.slab)));
  ctx.restore();
  stroke(ctx, pawn ? 'rgba(232,216,240,0.46)' : 'rgba(220,238,248,0.42)', Math.max(0.4, w * 0.007),
    (c) => { c.moveTo(GL, up(CTR.guard)); c.lineTo(GR, up(CTR.guard)); });

  // The till, at the open end past the glass — where you pay, and the reason the
  // staff stand where they stand. Both units have one: the pawn shop moved into a
  // unit that already had a register on it and simply kept using it.
  const rx = X(0.84), rw = w * 0.13;
  shape(ctx, pawn ? '#2e2438' : '#2a3542', u, (c) => rr(c, rx, up(CTR.deck + 9), rw, tall(9), w * 0.010));
  plain(ctx, '#48e0c8', (c) => c.rect(rx + rw * 0.14, up(CTR.deck + 7.6), rw * 0.72, tall(2.8)));
  for (let i = 0; i < 3; i++) {
    plain(ctx, '#c8c8d8', (c) => c.rect(rx + rw * (0.16 + i * 0.26), up(CTR.deck + 3.6), rw * 0.18, tall(1.5)));
  }

  // Lamps, hung clear above head height, and the only reason this end of the
  // concourse has any warm light in it at all. They are still on. Nobody turned
  // them off, because turning them off was never anybody's job.
  plain(ctx, P.housing, (c) => rr(c, X(0.12), up(CTR.lampHi), w * 0.76, tall(CTR.lampHi - CTR.lampLo), w * 0.008));
  for (const f of [0.28, 0.50, 0.72]) {
    const pulse = 0.82 + 0.18 * Math.sin(t * 1.6 + f * 9);
    ctx.save();
    ctx.globalAlpha = 0.9 * pulse;
    plain(ctx, P.lamp, (c) => c.ellipse(X(f), up(CTR.lampLo), w * 0.024, tall(1.8), 0, 0, Math.PI * 2));
    ctx.restore();
    // The pour of light onto the deck. Drawn over the glass so the pane takes the
    // glow too and the whole assembly sits in one pool, rather than the deck
    // being lit under a pane that is not.
    const g = ctx.createLinearGradient(0, up(CTR.lampLo), 0, up(CTR.slab));
    const [lr, lg, lb] = rgb(P.lamp);
    g.addColorStop(0, `rgba(${lr},${lg},${lb},${(0.18 * pulse).toFixed(3)})`);
    g.addColorStop(1, `rgba(${lr},${lg},${lb},0)`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(f) - w * 0.026, up(CTR.lampLo));
    ctx.lineTo(X(f) + w * 0.026, up(CTR.lampLo));
    ctx.lineTo(X(f) + w * 0.10, up(CTR.slab));
    ctx.lineTo(X(f) - w * 0.10, up(CTR.slab));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // The placard, taped to the front where the price list used to be, in the same
  // marker that has been correcting the menu board all along. This is the job the
  // door's icon was doing — telling you what the station is. It does it worse,
  // and by hand, which is an improvement. Deep marker rather than bright: this is
  // cream card, and backwall.js already learned that the teal which reads
  // beautifully on a black lightbox disappears on paper.
  const word = pawn ? 'PAWN' : 'REPAIRS';
  const cardW = w * 0.32, cardH = tall(10);
  const cardX = X(0.40) - cardW / 2, cardY = up(16.5);
  shape(ctx, '#ded8c8', Math.max(10, u * 0.6), (c) => rr(c, cardX, cardY, cardW, cardH, w * 0.005));
  for (const tx of [0.02, 0.80]) {
    plain(ctx, 'rgba(236,236,246,0.34)',
      (c) => c.rect(cardX + cardW * tx, cardY - cardH * 0.20, cardW * 0.18, cardH * 0.36));
  }
  const cs = Math.min(0.62, (cardW * 0.82) / Math.max(1, textWidth(word, 1, 'marker')));
  drawText(ctx, word, cardX + cardW * 0.5 - textWidth(word, cs, 'marker') / 2,
    cardY + cardH * 0.5 - cs * 4.6, MARKER_ON_PALE, cs, 'marker');

  // Floor grime along the kick plate: the strip of tile in front of a serving
  // counter is the most walked-on square metre in any food court, and it is the
  // cheapest possible way to say people used to queue here.
  ctx.save();
  ctx.globalAlpha = 0.30;
  plain(ctx, '#0e0a16', (c) => c.ellipse(X(0.5), floor + tall(1), w * 0.54, tall(3.4), 0, 0, Math.PI * 2));
  ctx.restore();
}
