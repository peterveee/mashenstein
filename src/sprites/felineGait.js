// THE FELINE PLANTED GALLOP (16 Oct 2026). Peter, of the dogs' planted gallop (sprites/
// dogs.js gallopPose): "can we fix the other feline animals also". The three running cats
// — Speed Zone's bobcat (sprites/bobcat.js), Crypt's violet panther (sprites/crypt-
// animals.js) and the fury cat (the quadruped rig in sprites/animals.js) — each keep their
// own drawing and their own legs; this is the one clock and the one set of footfalls they
// all hang those legs on, so the three run the same way and a retune has one place.
//
// THE CONTRACT IS THE DOGS'. Each foot has a STANCE, nailed to the road: from touch-down
// to lift-off it moves back relative to the body at EXACTLY the ground speed — `strideL`
// leg lengths per cycle — so it never slides. Then a SWING, a Hermite curve from lift-off
// back to the next touch-down that leaves and arrives at that same speed (eased, so the
// paw reaches past its mark and draws back onto it rather than flinging), lifted, with the
// lowest segment folding up under the leg. The ring is 16 frames, stepped by the road the
// cat has actually run (run.js gaitPh, animals.js ANIMAL_STRIDE), so the planted paw
// stays planted at any speed.
//
// WHAT MAKES IT A CAT, not a small dog:
//   - A BOUND-LIKE ROTARY GALLOP. The two hinds land close together (a cat's hinds are
//     nearly paired), then a long EXTENDED flight, then the fores one after the other,
//     then a long GATHERED flight with the hinds swung right up under the chest. Two
//     suspensions a stride, so the body still bumps twice.
//   - SHORTER STANCE. Each paw is on the road for about a fifth of the cycle (the dogs:
//     nearly a third) and covers less of it; the cat spends its stride in the air.
//   - MORE SPINE. The flex runs about twice the dogs' — the back rounds up and the spine
//     shortens hard on the gather, and stretches out long and flat on the extension.
//     The rigs read `flex` (0 extended .. 1 gathered) and each scales it its own way.
//   - THE HEAD HOLDS ITS LINE. The rigs damp the body's bump and pitch out of the head.
//
// Units: phases are fractions of the cycle; a foot's x is from its leg's REST root
// (the root's place with the spine at rest, NOT the moving root — the planted foot has to
// be still against the road, not against a shoulder that is itself flexing), in leg
// lengths, positive FORWARD (toward the nose); y is lift above the road in leg lengths.
// Angles are the dogs' lowest-segment directions, authored FACING RIGHT in degrees, canvas
// convention — fore: carpus -> paw, hind: paw -> hock; a rig that draws facing left
// mirrors them (x -> -x).

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;

// Frames in each feline's raster ring: the dogs' 16.
export const FELINE_FRAMES = 16;

// The shared footfalls. A rig spreads this and overrides what its build needs.
//   hindFar..foreFar   touch-down phase of each foot: the hinds 0.05 apart (nearly
//                      paired), the fores 0.08 apart, with the flights between
//   hindDuty/foreDuty  the stance, as a fraction of the cycle (dogs 0.30 / 0.28)
//   hindTD/foreTD      where the paw lands, ahead of its rest root, in leg lengths; the
//                      hinds land well forward, under the gathered body
//   strideL            the road passing under a planted paw in one cycle, leg lengths
//   flightE/flightG    the middles of the extended and gathered flights
//   liftF/liftH        how high the paw is carried in its swing, leg lengths
//   ease               the swing's launch/arrival speed as a fraction of the ground's
export const FELINE_GALLOP = {
  hindFar: 0.00, hindNear: 0.05, foreNear: 0.45, foreFar: 0.53,
  hindDuty: 0.22, foreDuty: 0.21,
  hindTD: 0.50, foreTD: 0.55,
  strideL: 3.4,
  flightE: 0.36, flightG: 0.87,
  liftF: 0.40, liftH: 0.34,
  ease: 0.55,
  // The lowest segment's angle through the swing (facing right): the fore's carpus folds
  // the paw up and back behind it, the hind's hock swings through and reaches.
  foreSwingA: [122, 182, 236, 240, 168, 104, 80],
  hindSwingA: [-58, -26, 16, 22, -40, -90, -108],
  // ...and through the stance: from touch-down to the push off the toes.
  foreStanceA: [80, 124],
  hindStanceA: [-108, -56],
};

// Catmull-Rom through evenly spaced keys over v in 0..1 (clamped ends).
function spline(keys, v) {
  const n = keys.length - 1;
  const x = clamp01(v) * n;
  const i = Math.min(Math.floor(x), n - 1), f = x - i;
  const k0 = keys[Math.max(i - 1, 0)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(i + 2, n)];
  return 0.5 * ((2 * k1) + (-k0 + k2) * f + (2 * k0 - 5 * k1 + 4 * k2 - k3) * f * f
    + (-k0 + 3 * k1 - 3 * k2 + k3) * f * f * f);
}
function hermite(p0, p1, m0, m1, v) {
  const v2 = v * v, v3 = v2 * v;
  return (2 * v3 - 3 * v2 + 1) * p0 + (v3 - 2 * v2 + v) * m0 + (-2 * v3 + 3 * v2) * p1 + (v3 - v2) * m1;
}

// One paw at `phase`. Returns x (forward of the rest root) and y (lift), both in leg
// lengths; `a`, the lowest segment's angle (facing right, degrees); `stance`, 0..1 through
// the stance or -1 in the air; and `fold`, 0 on the road rising to 1 mid-swing, for a rig
// that curls the paw itself.
export function felineFoot(G, phase, isFore, near) {
  const td = isFore ? (near ? G.foreNear : G.foreFar) : (near ? G.hindNear : G.hindFar);
  const duty = isFore ? G.foreDuty : G.hindDuty;
  const tdX = isFore ? G.foreTD : G.hindTD;
  const u = (((phase - td) % 1) + 1) % 1;
  // Planted: back at exactly strideL per cycle, which IS the ground speed.
  const loX = tdX - G.strideL * duty;
  if (u < duty) {
    const s = u / duty;
    const [a0, a1] = isFore ? G.foreStanceA : G.hindStanceA;
    return { x: lerp(tdX, loX, s), y: 0, a: lerp(a0, a1, s), stance: s, fold: 0 };
  }
  const v = (u - duty) / (1 - duty);
  const m = -G.strideL * (1 - duty) * G.ease;
  const sv = Math.sin(Math.PI * v);
  return {
    x: hermite(loX, tdX, m, m, v),
    y: (isFore ? G.liftF : G.liftH) * Math.pow(sv, 1.3),
    a: spline(isFore ? G.foreSwingA : G.hindSwingA, v),
    stance: -1,
    fold: sv,
  };
}

// The body's three rhythms at `phase`, each a unit shape the rig scales:
//   bump   0..1, high in BOTH flights (two a stride) — the body's rise
//   flex   0..1, 0 at the extended flight's middle, 1 at the gathered one's
//   pitch  -1..1, +1 nose-up as the hinds carry (the rig picks the sign it draws)
export function felineBody(G, phase) {
  return {
    bump: 0.5 + 0.5 * Math.cos(TAU * 2 * (phase - G.flightE)),
    flex: 0.5 + 0.5 * Math.cos(TAU * (phase - G.flightG)),
    pitch: Math.cos(TAU * (phase - (G.hindNear + G.hindDuty * 0.5))),
  };
}
