// Gallery-only door studies. None of these is a food-court door: the hub still
// draws DOOR_PALETTES from sprites/arcade.js, and nothing here is registered
// anywhere. Each candidate is a palette carrying a `paintAperture` hook — the
// seam paintDoor() offers — so a proposal owns the recess, the leaf and its own
// chrome while the wall slab, the sign board and the walk-up behaviour stay
// exactly as shipped. That boundary is the point: a look chosen here cannot
// quietly move a doorway the player walks through.
//
// Every candidate is driven by the same `openAmt` 0..1 the real doors ease from
// proximity, so the bake-off is judged on the whole gesture and not just the
// closed pose — a door that looks best shut and reads as nothing at all halfway
// is the wrong door.

// The aperture behind whatever is hung in it. Kept identical across candidates:
// the hole in the wall is not what is being chosen here, and a proposal that
// wins by lightening the recess would be winning the wrong argument.
function well(api, ink = '#080610') {
  const { ctx, w, box, rr, plain } = api;
  plain(ctx, ink, (c) => rr(c, ...box('well'), w * 0.09));
}

// Doors slide into pockets, and a pocket is only convincing if the leaf really
// disappears into it. Everything that travels is drawn clipped to the frame.
function inFrame(api, draw) {
  const { ctx, box } = api;
  ctx.save();
  ctx.beginPath();
  ctx.rect(...box('frame'));
  ctx.clip();
  draw();
  ctx.restore();
}

// `icon: 'none'` is how the shipped palettes already mark a door as unpowered
// (LOCKED, and the back room). Candidates honour it: an unpowered proposal
// shows its mechanism and none of its light.
const isPowered = (pal) => pal.icon !== 'none';

// A slim header strip in place of the shipped sensor dot. It grows and turns
// from standby amber to go-green as the door commits, so the header is doing
// the announcing rather than a single pixel of LED.
function ledBar(api) {
  const { ctx, w, h, pal, X, box, openAmt, t, rr, plain, darken, mix } = api;
  const barW = w * 0.46, barH = h * 0.016;
  const bx = X(0.5) - barW / 2, by = box('well')[1] - barH - h * 0.014;
  plain(ctx, darken(pal.frame, 0.45), (c) => rr(c, bx - w * 0.012, by - h * 0.006, barW + w * 0.024, barH + h * 0.012, barH));
  if (!isPowered(pal)) return;
  const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.6));
  ctx.save();
  ctx.globalAlpha = 0.3 + 0.7 * Math.max(openAmt, pulse * (1 - openAmt));
  plain(ctx, mix('#c8862c', '#48e070', openAmt), (c) => rr(c, bx, by, barW * (0.3 + 0.7 * openAmt), barH, barH));
  ctx.restore();
}

// The shipped sensor, in its round housing — kept for the candidates whose
// language is soft rather than technical.
function domeLamp(api) {
  const { ctx, w, h, X, box, pal, openAmt, t, plain, darken, mix } = api;
  const sx = X(0.5), sy = box('well')[1] - h * 0.022;
  plain(ctx, darken(pal.frame, 0.4), (c) => c.arc(sx, sy, w * 0.034, 0, Math.PI * 2));
  if (!isPowered(pal)) return;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 1.5)) * (1 - openAmt) + openAmt * 0.5;
  plain(ctx, mix('#c8862c', '#48e070', openAmt), (c) => c.arc(sx, sy, w * 0.018, 0, Math.PI * 2));
  ctx.restore();
}

// ---------------------------------------------------------------- A: BI-PART
// Two leaves parting from the centre. The centre seam is the whole idea: a
// single pocket door has to be watched to be understood, where two halves
// splitting announce themselves in one frame even at this size.
function bipart(api) {
  const { ctx, w, h, pal, box, Y, u, openAmt, rr, shape, plain, lighten, darken } = api;
  well(api);
  const [lx, ly, lw, lh] = box('leaf');
  const half = lw / 2, travel = openAmt * half * 0.96;
  inFrame(api, () => {
    for (const side of [-1, 1]) {
      const x = side < 0 ? lx - travel : lx + half + travel;
      shape(ctx, pal.door, u, (c) => rr(c, x, ly, half, lh, w * 0.045));
      plain(ctx, lighten(pal.door, 0.11), (c) => rr(c, x + half * (side < 0 ? 0.14 : 0.52), ly + h * 0.04, half * 0.34, lh * 0.82, w * 0.02));
      plain(ctx, darken(pal.door, 0.32), (c) => c.rect(x + half * 0.08, Y(0.87), half * 0.84, h * 0.085));
      // The leading edge, bright: the line the two halves make when they meet.
      const gx = side < 0 ? x + half - w * 0.024 : x;
      plain(ctx, lighten(pal.door, 0.4), (c) => c.rect(gx, ly + h * 0.015, w * 0.024, lh - h * 0.03));
    }
  });
  ledBar(api);
}

// ------------------------------------------------------------------ B: GLASS
// A real shopfront door: two metal rails, a tinted pane between them and a
// push bar across it. The pane is genuinely translucent, so the dark of the
// recess reads through the glass and the door stops being a slab.
function glassFront(api) {
  const { ctx, w, h, pal, box, Y, u, openAmt, rr, shape, plain, lighten, darken, mix, glassGloss } = api;
  well(api, '#06050d');
  const [lx, ly, lw, lh] = box('leaf');
  const x = lx + openAmt * lw * 0.92;
  const powered = isPowered(pal);
  const metal = lighten(pal.frame, powered ? 0.28 : 0.1);
  const railH = lh * 0.085;
  inFrame(api, () => {
    // Glass still reflects when nothing behind it is switched on, but it stops
    // carrying any light of its own: unpowered, the pane goes to the cold grey
    // of a dark shop after hours rather than staying lit behind a LOCKED sign.
    ctx.save();
    ctx.globalAlpha = powered ? 0.42 : 0.2;
    plain(ctx, mix(pal.door, powered ? '#a6dced' : '#2b2b36', powered ? 0.55 : 0.45), (c) => rr(c, x, ly, lw, lh, w * 0.035));
    ctx.restore();
    plain(ctx, metal, (c) => { c.rect(x, ly, w * 0.024, lh); c.rect(x + lw - w * 0.024, ly, w * 0.024, lh); });
    shape(ctx, metal, u, (c) => rr(c, x, ly, lw, railH, w * 0.028));
    plain(ctx, metal, (c) => rr(c, x, ly + lh - railH * 1.35, lw, railH * 1.35, w * 0.028));
    // Push bar: the one piece of hardware that says "shove this and it opens".
    plain(ctx, darken(metal, 0.3), (c) => rr(c, x + lw * 0.08, Y(0.64), lw * 0.84, h * 0.03, h * 0.015));
    plain(ctx, lighten(metal, 0.32), (c) => rr(c, x + lw * 0.08, Y(0.64), lw * 0.84, h * 0.013, h * 0.0065));
    glassGloss(ctx, x, ly, lw, lh, powered ? 0.2 : 0.1, w * 0.035);
    trackRail(api, x, lw, powered);
  });
}

// The overhead track, with the two trucks the leaf hangs from. They travel with
// it, which is the cheapest possible way to say "this is driven, not pushed".
function trackRail(api, leafX, leafW, powered = true) {
  const { ctx, w, h, pal, box, plain, lighten, darken } = api;
  const [wx, wy, ww] = box('well');
  const railY = wy - h * 0.03, railH = h * 0.016;
  plain(ctx, darken(pal.frame, 0.4), (c) => c.rect(wx - w * 0.03, railY, ww + w * 0.06, railH));
  plain(ctx, lighten(pal.frame, powered ? 0.22 : 0.08), (c) => c.rect(wx - w * 0.03, railY + railH * 0.36, ww + w * 0.06, railH * 0.22));
  for (const f of [0.2, 0.8]) {
    plain(ctx, lighten(pal.frame, powered ? 0.38 : 0.12), (c) => c.arc(leafX + leafW * f, railY + railH * 0.5, h * 0.0115, 0, Math.PI * 2));
  }
}

// --------------------------------------------------------------- C: CHEVRON
// The genre option: a blast door with a 45° interlocking seam and a hard bevel
// down each leading edge. The diagonal is doing the work — it is the one seam
// shape that could not be mistaken for a gap between two ordinary slabs.
function chevron(api) {
  const { ctx, w, h, pal, box, Y, u, openAmt, shape, plain, stroke, lighten, darken } = api;
  well(api, '#07060e');
  const [lx, ly, lw, lh] = box('leaf');
  const half = lw / 2, skew = lw * 0.2;
  const travel = openAmt * (half + skew) * 0.98;
  inFrame(api, () => {
    const leftX = lx - travel, rightX = lx + half + travel;
    shape(ctx, pal.door, u, (c) => {
      c.moveTo(leftX, ly); c.lineTo(leftX + half + skew, ly);
      c.lineTo(leftX + half - skew, ly + lh); c.lineTo(leftX, ly + lh); c.closePath();
    });
    shape(ctx, darken(pal.door, 0.14), u, (c) => {
      c.moveTo(rightX + skew, ly); c.lineTo(rightX + half, ly);
      c.lineTo(rightX + half, ly + lh); c.lineTo(rightX - skew, ly + lh); c.closePath();
    });
    // The bevel: a bright rake down each diagonal, which is what makes the two
    // faces read as thick steel rather than as two flat cut-outs.
    stroke(ctx, lighten(pal.door, 0.42), w * 0.022, (c) => {
      c.moveTo(leftX + half + skew, ly); c.lineTo(leftX + half - skew, ly + lh);
    });
    stroke(ctx, lighten(pal.door, 0.2), w * 0.022, (c) => {
      c.moveTo(rightX + skew, ly); c.lineTo(rightX - skew, ly + lh);
    });
    // Two hazard chevrons per leaf, pointing the way that leaf travels. Placed
    // from each leaf's own outer edge inward, so they stay on the face at every
    // point of the travel rather than sliding off it.
    for (const [x0, dir, tint] of [[leftX + half * 0.42, -1, 0.3], [rightX + half * 0.58, 1, 0.24]]) {
      plain(ctx, lighten(pal.door, tint), (c) => {
        for (const yy of [0.52, 0.68]) {
          const cx = x0, cy = Y(yy), s = lw * 0.12;
          c.moveTo(cx + dir * s, cy); c.lineTo(cx - dir * s * 0.2, cy - s * 0.85);
          c.lineTo(cx - dir * s * 0.62, cy - s * 0.85); c.lineTo(cx + dir * s * 0.38, cy);
          c.lineTo(cx - dir * s * 0.62, cy + s * 0.85); c.lineTo(cx - dir * s * 0.2, cy + s * 0.85);
          c.closePath();
        }
      });
    }
  });
  ledBar(api);
}

// -------------------------------------------------------------- D: PORTHOLE
// The warm one. Everything round: a big chrome-ringed porthole, a colour band
// off the station's own sign, and corners radiused far past the others. The
// food court is a mall, not a facility, and this is the option that remembers
// that.
function porthole(api) {
  const { ctx, w, h, pal, box, Y, u, openAmt, rr, shape, plain, lighten, darken, mix, glassGloss } = api;
  well(api);
  const [lx, ly, lw, lh] = box('leaf');
  const x = lx + openAmt * lw * 0.92;
  const powered = isPowered(pal);
  inFrame(api, () => {
    shape(ctx, pal.door, u, (c) => rr(c, x, ly, lw, lh, w * 0.13));
    plain(ctx, mix(pal.door, pal.sign, powered ? 0.45 : 0.12), (c) => c.rect(x, Y(0.73), lw, h * 0.07));
    const cx = x + lw * 0.5, cy = Y(0.49), r = lw * 0.29;
    plain(ctx, lighten(pal.frame, 0.42), (c) => c.arc(cx, cy, r + w * 0.024, 0, Math.PI * 2));
    plain(ctx, darken(pal.frame, 0.25), (c) => c.arc(cx, cy, r + w * 0.009, 0, Math.PI * 2));
    plain(ctx, powered ? darken(pal.sign, 0.5) : '#0b0912', (c) => c.arc(cx, cy, r, 0, Math.PI * 2));
    glassGloss(ctx, cx - r, cy - r, r * 2, r * 2, 0.24, r);
    plain(ctx, lighten(pal.frame, 0.34), (c) => rr(c, x + lw * 0.85, Y(0.56), w * 0.024, h * 0.15, w * 0.012));
  });
  domeLamp(api);
}

// ---------------------------------------------------------------- E: LOUVRE
// The one that does not travel at all: the leaf stays where it is and its slats
// tilt, so the door opens by turning into a grille. Worth a rung because it is
// the only candidate whose open state still fills the doorway — it never leaves
// a bare black hole in the wall.
function louvre(api) {
  const { ctx, w, h, pal, box, u, openAmt, rr, shape, plain, lighten, darken } = api;
  well(api, '#07060e');
  const [lx, ly, lw, lh] = box('leaf');
  const n = 7, pitch = lh / n;
  inFrame(api, () => {
    shape(ctx, darken(pal.door, 0.45), u, (c) => rr(c, lx, ly, lw, lh, w * 0.04));
    for (let i = 0; i < n; i++) {
      const y = ly + i * pitch + pitch * 0.06;
      const th = (pitch * 0.88) * (1 - openAmt * 0.8);
      plain(ctx, pal.door, (c) => rr(c, lx + w * 0.012, y, lw - w * 0.024, th, pitch * 0.16));
      plain(ctx, lighten(pal.door, 0.18), (c) => c.rect(lx + w * 0.012, y, lw - w * 0.024, th * 0.32));
      plain(ctx, darken(pal.door, 0.34), (c) => c.rect(lx + w * 0.012, y + th * 0.76, lw - w * 0.024, th * 0.24));
    }
    plain(ctx, darken(pal.door, 0.5), (c) => { c.rect(lx, ly, w * 0.026, lh); c.rect(lx + lw - w * 0.026, ly, w * 0.026, lh); });
  });
  ledBar(api);
}

// ------------------------------------------------------------- F: THRESHOLD
// The minimal one. Two matte slabs with no detail at all, and every bit of
// drama handed to light: a seam down each leading edge that blooms as they
// part, and a strip in the floor that lifts with them. If the others are
// competing on hardware, this one is competing on restraint.
function threshold(api) {
  const { ctx, w, h, pal, box, Y, openAmt, rr, plain, lighten, darken, mix } = api;
  well(api, '#05040b');
  const [lx, ly, lw, lh] = box('leaf');
  const half = lw / 2, travel = openAmt * half * 0.96;
  const powered = isPowered(pal);
  const glow = powered ? mix('#c8862c', pal.sign, Math.min(1, openAmt * 1.3)) : darken(pal.frame, 0.15);
  inFrame(api, () => {
    for (const side of [-1, 1]) {
      const x = side < 0 ? lx - travel : lx + half + travel;
      plain(ctx, pal.door, (c) => rr(c, x, ly, half, lh, w * 0.018));
      plain(ctx, lighten(pal.door, 0.05), (c) => c.rect(x, ly, half, lh * 0.46));
      const gx = side < 0 ? x + half - w * 0.018 : x;
      plain(ctx, glow, (c) => c.rect(gx, ly, w * 0.018, lh));
    }
    plain(ctx, darken(pal.frame, 0.5), (c) => c.rect(lx - w * 0.03, Y(0.962), lw + w * 0.06, h * 0.022));
    if (powered) {
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.78 * openAmt;
      plain(ctx, glow, (c) => c.rect(lx - w * 0.03, Y(0.966), lw + w * 0.06, h * 0.012));
      ctx.restore();
    }
  });
}

const PAINT = { bipart, glass: glassFront, chevron, porthole, louvre, threshold };

export const DOOR_CANDIDATES = [
  { id: 'control', letter: 'A', name: 'Shipped single slide', note: 'CONTROL — the door in the game now: one pocket leaf, porthole, kick plate, dot sensor on the header.' },
  { id: 'bipart', letter: 'B', name: 'Bi-part', note: 'Two leaves from the centre, bright leading edges, LED header bar. The lift-door read, legible in a single frame.' },
  { id: 'glass', letter: 'C', name: 'Glass front', note: 'Tinted pane between metal rails with a push bar, hung from a visible track on two trucks. The recess shows through it.' },
  { id: 'chevron', letter: 'D', name: 'Chevron', note: '45° interlocking seam, bevelled leading edges and hazard marks. The only seam shape that cannot read as an ordinary gap.' },
  { id: 'porthole', letter: 'E', name: 'Porthole', note: 'Round language throughout: chrome-ringed window, sign-coloured band, soft corners. Mall, not facility.' },
  { id: 'louvre', letter: 'F', name: 'Louvre', note: 'Does not travel — the slats tilt open. The one candidate whose open state still fills the doorway.' },
  { id: 'threshold', letter: 'G', name: 'Threshold', note: 'Matte slabs, no hardware; a light seam down each edge and a floor strip that lifts with them. Competing on restraint.' },
];

// Hand a candidate a real station palette and get back something drawDoor can
// paint. The base palette is untouched — the candidate only adds the seam.
export function doorCandidatePalette(id, base) {
  const paint = PAINT[id];
  return paint ? { ...base, paintAperture: paint } : base;
}
