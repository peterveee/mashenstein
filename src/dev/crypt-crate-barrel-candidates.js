// Gallery-only CRYPT SHIFT barrel: the generic platformer barrel redrawn in the
// night graveyard's gouache (15 Oct 2026). Peter: "a new box and barrel in the new
// style" — the picked grave hands, grave roses and eternal flame sit beside the
// shared saloon barrel. The crypt stages exclude the crate, so this sheet is the
// barrel alone.
//
// THE HAND is sprites/cryptProps.js, imported rather than copied: each part a
// gouache MASS — laid from its paint at the top to its dark at the foot, dabbed in
// its own tones, a moonlit rim on the edges facing the moon — inside the lane
// cast's ink. The outer silhouette takes a heavier ink than the cast's LW so it
// holds at lane size on the violet road.
//
// THE COORDINATES. The painter fills the barrel's PAINTED ENVELOPE, 17x17 world
// units (13x13 x 4/3), ground at y = h. It is drawn still, upright and centred;
// the run spins the whole drawing about its centre as it rolls, so it is a
// bellied cask nearly as wide as it is tall and reads round at every angle.
//
// Nothing here is registered in any gameplay registry.
import {
  INK, LWI, LWF, PAINT, BRASS, BRASS_LT, BRASS_DK, RED, RED_DK, HOLLOW,
  mass, rrect, fillShape, stroke, dot,
} from '../sprites/cryptProps.js';

const frameOf = (t, n, fps) => ((Math.floor(t * fps) % n) + n) % n;

const OUTLINE = 0.55; // the silhouette's ink, a step over the cast's LW

// A — AMONTILLADO CASK (barrel 17x17). A cask out of the crypt's wine vault:
// oak staves grained along their length, three brass-bound hoops catching the
// lamp, the bung sealed with red wax — the red that says avoid.
function cryptBarrel(c, w, h) {
  const cx = w / 2, Y0 = 1.2, Y1 = h - 1.2, cy = (Y0 + Y1) / 2;
  const END = 5.2, BELLY = 7.3;
  const xAt = (y) => {
    const u = (y - cy) / (cy - Y0);
    return END + (BELLY - END) * (1 - u * u);
  };
  const cask = (p) => {
    p.moveTo(cx - END, Y0);
    p.lineTo(cx + END, Y0);
    p.quadraticCurveTo(cx + BELLY * 2 - END, cy, cx + END, Y1);
    p.lineTo(cx - END, Y1);
    p.quadraticCurveTo(cx - BELLY * 2 + END, cy, cx - END, Y0);
    p.closePath();
  };
  mass(c, [cx - BELLY, Y0, BELLY * 2, Y1 - Y0], cask, { ...PAINT.oak, grain: Math.PI / 2, dabs: 0.5 }, (p) => {
    // The shade band down the side away from the moon.
    p.globalAlpha = 0.45;
    p.fillStyle = '#2a1e30';
    p.fillRect(cx + 3.8, 0, 6, h);
    p.globalAlpha = 1;
    // Stave joints, bowing with the belly.
    for (const s of [-0.6, -0.2, 0.2, 0.6]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const y = Y0 + ((Y1 - Y0) * i) / 10;
        pts.push([cx + s * xAt(y), y]);
      }
      stroke(p, pts, INK, LWF * 1.2);
    }
    // The chimes: the stave ends past the end hoops, darker.
    p.globalAlpha = 0.5;
    p.fillStyle = HOLLOW;
    p.fillRect(0, Y0, w, 0.9);
    p.fillRect(0, Y1 - 0.9, w, 0.9);
    p.globalAlpha = 1;
  }, OUTLINE);
  // The hoops: brass bands following the belly, each lit along its top edge.
  const HOOPS = [[Y0 + 1.0, 1.2], [cy - 0.7, 1.4], [Y1 - 2.2, 1.2]];
  HOOPS.forEach(([y, hh]) => {
    const xa = xAt(y) + 0.1, xb = xAt(y + hh) + 0.1;
    const band = (p) => {
      p.moveTo(cx - xa, y);
      p.lineTo(cx + xa, y);
      p.lineTo(cx + xb, y + hh);
      p.lineTo(cx - xb, y + hh);
      p.closePath();
    };
    fillShape(c, band, BRASS, INK, LWI);
    c.save();
    c.beginPath();
    band(c);
    c.clip();
    c.fillStyle = BRASS_DK;
    c.fillRect(cx + 3.8, 0, 6, h);
    c.fillStyle = BRASS_LT;
    c.fillRect(0, y, w, 0.4);
    c.restore();
    // A rivet where the hoop's ends are lapped.
    dot(c, cx - xa + 1.4, y + hh / 2, 0.22, BRASS_DK);
  });
  // The bung, sealed in red wax, between the hoops.
  fillShape(c, rrect(cx - 1.25, cy + 2.0, 2.5, 1.9, 0.7), RED, INK, LWI);
  fillShape(c, rrect(cx + 0.2, cy + 2.0, 1.05, 1.9, 0.5), RED_DK);
  dot(c, cx - 0.5, cy + 2.6, 0.28, '#ffb0b0');
  fillShape(c, rrect(cx - 1.25, cy + 2.0, 2.5, 1.9, 0.7), null, INK, LWI);
  // The silhouette's ink once more, over the hoop ends.
  c.beginPath();
  cask(c);
  c.lineJoin = 'round';
  c.strokeStyle = INK;
  c.lineWidth = OUTLINE;
  c.stroke();
}

export const CRATE_BARREL = {
  cabinet: 'crypt',
  candidates: [
    { letter: 'A', id: 'cryptBarrel', name: 'AMONTILLADO CASK', slot: 'barrel', paint: cryptBarrel,
      note: 'A cask rolled up out of the crypt\'s wine vault: gouache oak staves grained along their length with the moonlit rim, three brass hoops catching the lamp, the bung sealed in red wax. Bellied and nearly round; the run rolls it. Replaces the barrel (the crypt deals no crate).' },
  ],
};
