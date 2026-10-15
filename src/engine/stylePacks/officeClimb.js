// CORPORATE KOMBAT — the backdrop style bake-off's shared composition (Peter, 10 Oct 2026:
// "not totally happy with the corporate kombat cabinet... it's extremely basic and the graph
// paper background is very boring... do a bake off with some significantly more elaborate
// backgrounds with paralax ... it's the 2nd last level - it needs to be fancier... the whole
// working your way through an office building").
//
// THE CLIMB. The cabinet's three stages become three floors of one tower, each higher than
// the last, and the view out of the window is what tells you you have climbed:
//   lobby — the ground floor at nine in the morning; the street at eye level through a
//           double-height glass front, lift banks, the company logo, reception.
//   open  — floor 23 at noon; the open-plan cubicle farm under fluorescent tubes, ribbon
//           windows with blinds, rooftops and water towers across the street.
//   exec  — floor 88 at dusk; glass walls, wood panelling, the founder's portrait, the
//           boardroom where the mandatory meeting is, the city a carpet of lights far below.
//
// Every style paints THIS plan, so the cards differ in how a thing is drawn and never in
// what is there or where it stands (the crypt bake-off's method, src/dev/crypt-styles/).
// The plan fixes content, depth layers, parallax rates and animation; a style decides
// colour, line, texture and shape language. Hazards and the hero go on top in scene.js.
//
// Frame: 480x270 logical px. The lane's top edge is screen y 232 (GROUND_Y at the resting
// zoom). Unlike the crypt card a style ALSO paints the floor slab under the lane (232..270):
// the shipped doodle ground is a biro line that only makes sense on graph paper, so there is
// no neutral lane slab to borrow. The slab scrolls with the lane (frame.slab.shift).
//
// DEPTH, back to front. Positions are authored in each layer's own u and scroll at
// factor * ZOOM of the camera, wrapping every `period` px (the shipped packs' rate):
//   outside   — sky, city far (0.01) and near (~0.027), clouds and traffic: seen ONLY through
//               the glass. A style clips it to the glass bays (frame.wall.bays type 'glass').
//   wall      — the back wall at 0.16: the lobby's solid bays and columns; upper floors use
//               broad glass runs with narrow gaps. Wall-mounted details live on this layer.
//   lights    — ceiling fixtures at the mid rate.
//   mid       — furniture standing on the floor in front of the wall at 0.43: cubicles,
//               reception, the boardroom, plants. Its feet are on frame.midBase.
//   floor     — the floor plane between the wall's foot (204) and the lane (232). Its joints
//               shear: a joint is at x - shiftTop on the wall line and x - shiftBottom on
//               the lane line, which is what sells the depth.
//   slab      — the floor's cut face under the lane, at the lane's own rate.
//   front     — painted AFTER the lane, at 1: lobby pillars and plants / chair backs can poke
//               up from the bottom edge. Optional (STYLE.paintFront); keep it dark, soft and
//               rare, never a wall over the hero. Upper floors have no front pillars.
//
// The heights obey one rule of thumb: parallax is linear in screen y below a horizon at
// ~199, so wall foot 204 = 0.16, mid feet 213 = 0.43, lane 232 = 1.
// Production furniture is further back at y 208, with factor 0.28.
// Authored pixels are independent of the live phone/resting zoom.
export const OFFICE_ZOOM = 2;
const ZOOM = OFFICE_ZOOM;

export const FRAME_W = 480;
export const FRAME_H = 270;
export const LANE_TOP = 232;
export const WALL_BASE = 204;
export const MID_BASE = 213;
export const FRONT_BASE = 250;

const WALL_FACTOR = 0.16;
export const OFFICE_HORIZON = WALL_BASE - WALL_FACTOR * (LANE_TOP - WALL_BASE) / (1 - WALL_FACTOR);
export const FACTORS = Object.freeze({
  cityFar: 0.01, cityNear: 0.04 * 2 / 3, cloud: 0.025 * 2 / 3,
  wall: WALL_FACTOR, mid: (MID_BASE - OFFICE_HORIZON) / (LANE_TOP - OFFICE_HORIZON), front: 1,
});

const TAU = Math.PI * 2;

function seeded(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A skyline run: buildings shoulder to shoulder across one period, seeded so every style
// gets the same city. `tops` is the [lo, hi] range of roof y; `base` the y they stand on.
function skyline(seed, period, { w: [w0, w1], gap: [g0, g1], tops: [t0, t1], base, roofs, shops = false, litRange = [0, 0] }) {
  const r = rng(seed);
  const shopOffset = Math.floor(seeded(seed) * 4);
  const out = [];
  let u = 0;
  let i = 0;
  let shopIndex = 0;
  while (u < period - w0) {
    const w = Math.min(Math.round(w0 + r() * (w1 - w0)), period - u);
    const top = Math.round(t0 + r() * (t1 - t0));
    const buildingIndex = i++;
    const hasShop = shops && (buildingIndex + shopOffset) % 4 === 0;
    out.push({
      u, w, top, base,
      roof: roofs[Math.floor(r() * roofs.length)],
      // Window grid: a style may draw it any way it likes, but this is the building's
      // own rhythm, so a tower stays the same tower in every hand.
      cols: Math.max(2, Math.round(w / (7 + r() * 5))),
      floorH: 6 + Math.round(r() * 4),
      lit: litRange[0] + r() * (litRange[1] - litRange[0]),
      tone: Math.floor(r() * 3), // 0..2, which of the style's three facade colours
      // A single marked storefront every four buildings leaves about one sign
      // in each broad lobby window instead of turning the whole street into ads.
      shop: hasShop ? Math.floor(seeded(seed + buildingIndex * 17.3) * 4) : null,
      shopNameIndex: hasShop ? shopIndex++ : null,
      i: buildingIndex,
    });
    u += w + Math.round(g0 + r() * (g1 - g0));
  }
  return out;
}

// ------------------------------------------------------------------ the floors
export const OFFICE_FLOORS = Object.freeze({
  lobby: {
    id: 'lobby', label: 'G', stage: 1, name: 'the lobby',
    time: 'morning', clock: [9, 4],
    ceilingY: 14,
    glass: { variant: 'curtain', top: 22, bottom: WALL_BASE, transom: 96, mullion: 36 },
    outside: {
      // The buildings across the street are close, so they slide faster than the
      // skyline over their roofs; up the tower everything outside is far away.
      nearFactor: 0.1,
      nearPeriod: 3600,
      street: { far: 186, near: 202 }, // the road band, far kerb to near kerb
      far: skyline(101, 1400, { w: [34, 70], gap: [0, 10], tops: [28, 96], base: 186, roofs: ['flat', 'spire', 'stepped', 'antenna'] }),
      near: skyline(102, 3600, { w: [56, 124], gap: [0, 8], tops: [4, 128], base: 186, roofs: ['flat', 'cornice', 'tank', 'flat'], shops: true }),
      trees: [60, 250, 430, 610, 820, 990, 1150].map((u, i) => ({ u, s: 0.85 + seeded(i + 40) * 0.3 })),
      lamps: [150, 520, 900].map((u) => ({ u })),
      cars: [
        { kind: 'cab', lane: 0, speed: 46, u: 40 },
        { kind: 'bus', lane: 1, speed: -30, u: 300 },
        { kind: 'car', lane: 0, speed: 58, u: 520 },
        { kind: 'cab', lane: 1, speed: -40, u: 760 },
      ],
      clouds: [{ u: 60, y: 30, w: 110, h: 14 }, { u: 420, y: 50, w: 80, h: 10 }, { u: 700, y: 22, w: 140, h: 16 }],
      flyer: { kind: 'birds', u: 200, y: 64, speed: 18 },
      sun: { x: 90, y: 40, r: 14 },
      horizon: 186,
    },
    wall: {
      period: 1440,
      bays: [
        { type: 'wall', u: 0, u1: 110 },
        { type: 'glass', u: 124, u1: 404, revolvingDoor: 264 },
        { type: 'wall', u: 418, u1: 640 },
        { type: 'glass', u: 654, u1: 934 },
        { type: 'wall', u: 948, u1: 1150 },
        { type: 'glass', u: 1164, u1: 1426 },
      ],
      columns: [{ u: 110, w: 14 }, { u: 404, w: 14 }, { u: 640, w: 14 }, { u: 934, w: 14 }, { u: 1150, w: 14 }, { u: 1426, w: 14 }],
      hangs: [
        { kind: 'lift', u: 18, w: 36, h: 82, label: 'G' },
        { kind: 'lift', u: 62, w: 36, h: 82, label: 'G' },
        { kind: 'logo', u: 454, y: 26, w: 150, h: 56, label: 'EGGCORP' },
        { kind: 'clock', u: 529, y: 123, r: 10 }, // a hand's width below the glass-block band
        { kind: 'lift', u: 966, w: 36, h: 82, label: 'G' },
        { kind: 'lift', u: 1012, w: 36, h: 82, label: 'G' },
        { kind: 'lift', u: 1058, w: 36, h: 82, label: 'G' },
        { kind: 'painting', u: 1088, y: 58, w: 68, h: 88, variant: 1 },
      ],
      cradle: null,
    },
    lights: { variant: 'globe', period: 1200, us: [80, 320, 560, 800, 1040], flicker: -1, drop: 52 },
    mid: {
      period: 1200,
      items: [
        { kind: 'plant', u: 30, variant: 'ficus' },
        { kind: 'reception', u: 120, w: 124 },
        { kind: 'plant', u: 286, variant: 'palm' },
        { kind: 'turnstiles', u: 360, w: 96 },
        { kind: 'sofa', u: 540, w: 72 },
        { kind: 'sofa', u: 626, w: 30, seat: 'single', tone: 1 },
        { kind: 'plant', u: 668, variant: 'snake' },
        { kind: 'sculpture', u: 720 },
        { kind: 'plant', u: 840, variant: 'ficus' },
        { kind: 'sofa', u: 900, w: 30, seat: 'single', tone: 2 },
        { kind: 'sofa', u: 944, w: 30, seat: 'single', tone: 2 },
        { kind: 'turnstiles', u: 1040, w: 96 },
        { kind: 'plant', u: 1170, variant: 'palm' },
      ],
    },
    front: {
      period: 2400,
      items: [
        { kind: 'pillar', u: 760, w: 44 },
        { kind: 'plant', u: 1500 },
        { kind: 'pillar', u: 1980, w: 44 },
      ],
    },
    floor: 'marble', // polished stone, the lobby's columns reflected in it
  },

  open: {
    id: 'open', label: '23', stage: 2, name: 'the open-plan floor',
    time: 'noon', clock: [12, 21],
    ceilingY: 34,
    glass: { variant: 'ribbon', top: 58, bottom: 150, mullion: 44 },
    outside: {
      street: null,
      far: skyline(201, 1400, { w: [30, 64], gap: [0, 12], tops: [44, 118], base: 150, roofs: ['flat', 'spire', 'stepped', 'antenna'] }),
      near: skyline(202, 1200, { w: [60, 130], gap: [4, 20], tops: [72, 142], base: 170, roofs: ['tank', 'flat', 'billboard', 'tank', 'cornice', 'flat'] }),
      trees: [], lamps: [], cars: [],
      clouds: [{ u: 30, y: 70, w: 120, h: 16 }, { u: 330, y: 92, w: 90, h: 12 }, { u: 620, y: 64, w: 150, h: 18 }, { u: 900, y: 100, w: 70, h: 10 }],
      flyer: { kind: 'blimp', u: 300, y: 76, speed: -6, label: 'EGGCORP', slogan: 'WE ARE FAMILY. TERMS APPLY.' },
      sun: null,
      horizon: 150,
    },
    wall: {
      period: 1440,
      bays: [
        // Broad window runs and plain stretches of wall, every edge on the 60px panel
        // grid (floor 88's wainscot; floor 23's ceiling and trim repeat on it too).
        { type: 'glass', u: 0, u1: 300, blinds: 0.35 },
        { type: 'wall', u: 300, u1: 480 },
        { type: 'glass', u: 480, u1: 780, blinds: 0 },
        { type: 'wall', u: 780, u1: 960 },
        { type: 'glass', u: 960, u1: 1260, blinds: 0.15 },
        { type: 'wall', u: 1260, u1: 1440 },
      ],
      columns: [],
      // The motivational posters hang between the windows with the other prints (artwork.js).
      hangs: [
        { kind: 'extinguisher', u: 940, y: 166, w: 8, h: 18 },
      ],
      // A window cleaner's gondola hanging outside the glass, in the wall's own u (it is
      // right against the building, so it moves with the wall, not the city).
      cradle: { u: 420, y: 92, w: 52 },
    },
    lights: { variant: 'tube', period: 1200, us: [60, 200, 340, 480, 620, 760, 900, 1040, 1180], flicker: 3, drop: 0 },
    mid: {
      period: 1200,
      items: [
        { kind: 'cubicles', u: 20, u1: 260, heads: [1, 3, 4], pop: 2, peek: [4] },
        { kind: 'cooler', u: 296 },
        { kind: 'copier', u: 344, w: 40 },
        { kind: 'cubicles', u: 420, u1: 660, heads: [0, 2, 5], pop: -1, peek: [2, 5] },
        { kind: 'plant', u: 696, variant: 'ficus' },
        { kind: 'cabinet', u: 736 },
        { kind: 'cabinet', u: 758 },
        { kind: 'cubicles', u: 806, u1: 1086, heads: [1, 2, 4, 6], pop: 5, peek: [2] },
        { kind: 'plant', u: 1120, variant: 'snake' },
        { kind: 'cooler', u: 1160 },
      ],
    },
    front: {
      period: 2400,
      items: [
        { kind: 'chair', u: 1400 },
        { kind: 'plant', u: 1760 },
      ],
    },
    floor: 'carpet', // grey-blue carpet tiles
  },

  exec: {
    id: 'exec', label: '88', stage: 3, name: 'the executive floor',
    time: 'dusk', clock: [18, 42],
    ceilingY: 24,
    glass: { variant: 'full', top: 30, bottom: 200, mullion: 46 },
    outside: {
      street: null,
      // Far below: a carpet of low blocks under the horizon haze, and the city's tallest
      // towers rising through it toward you.
      far: skyline(301, 1400, { w: [10, 26], gap: [0, 4], tops: [166, 178], base: 200, roofs: ['flat', 'flat', 'antenna'], litRange: [0.3, 0.8] }),
      near: skyline(302, 1200, { w: [26, 50], gap: [90, 220], tops: [62, 136], base: 210, roofs: ['spire', 'antenna', 'stepped', 'spire'], litRange: [0.25, 0.6] }),
      trees: [], lamps: [], cars: [],
      clouds: [{ u: 20, y: 120, w: 160, h: 18 }, { u: 300, y: 96, w: 110, h: 12 }, { u: 560, y: 140, w: 180, h: 20 }, { u: 860, y: 110, w: 120, h: 14 }],
      flyer: { kind: 'heli', u: 140, y: 98, speed: 12, slogan: 'EGGCORP: TOO BIG TO FRY' },
      sun: { x: 150, y: 164, r: 16 },
      horizon: 178,
    },
    wall: {
      period: 1440,
      bays: [
        { type: 'glass', u: 0, u1: 360 },
        { type: 'wall', u: 360, u1: 480 },
        { type: 'glass', u: 480, u1: 840 },
        { type: 'wall', u: 840, u1: 960 },
        { type: 'glass', u: 960, u1: 1320 },
        { type: 'wall', u: 1320, u1: 1440 },
      ],
      columns: [],
      hangs: [],
      cradle: null,
    },
    lights: { variant: 'pendant', period: 1200, us: [100, 300, 500, 700, 900, 1100], flicker: -1, drop: 84, downs: { period: 1440, us: [[45, 'd'], [225, 'd'], [525, 'd'], [705, 'd'], [1005, 'd'], [1185, 'd']] } },
    mid: {
      period: 1200,
      items: [
        // The mandatory meeting: residents round the table, nodding off.
        { kind: 'boardroom', u: 40, u1: 320, seats: 8, sitters: [0, 1, 3, 4, 6, 7], easel: true },
        { kind: 'plant', u: 380, variant: 'bonsai' },
        { kind: 'desk', u: 446, w: 112 },
        { kind: 'globe', u: 596 },
        { kind: 'sofa', u: 664, w: 80 },
        { kind: 'plant', u: 780, variant: 'palm' },
        { kind: 'tallclock', u: 860 },
        // a pair of Grand Confort armchairs either side of a side table
        { kind: 'sofa', u: 916, w: 34, seat: 'single' },
        { kind: 'sidetable', u: 958, w: 18 },
        { kind: 'sofa', u: 984, w: 34, seat: 'single' },
        { kind: 'plant', u: 1050, variant: 'ficus' },
        { kind: 'globe', u: 1120 },
      ],
    },
    front: {
      period: 2400,
      items: [
        { kind: 'armchair', u: 1700 },
        { kind: 'plant', u: 2200 },
      ],
    },
    floor: 'parquet', // herringbone wood, with a rug
  },
});

// Which kinds exist and how big each is in screen px. A style may draw a thing its own way
// but should keep it about this size, so the composition survives the change of hand.
export const OFFICE_KINDS = Object.freeze({
  // outside
  building: 'a facade standing on `base` with its roof at `top` (top < glass.top means it runs off the top of the window). roof: flat | cornice | tank (rooftop water tower) | billboard | spire | stepped (deco setbacks) | antenna. cols / floorH = its window grid; lit = fraction of windows lit (dusk); tone 0..2; shop (lobby, street level) = an awning colour index or null',
  street: 'lobby only: the road between y street.far and street.near, a far pavement above it with trees (~38 tall) and lamp posts (~44 tall) standing on street.far',
  car: 'lobby traffic on the road: cab ~30x12 (yellow), car ~28x11, bus ~64x22; dir is +1 or -1; y is the wheel line',
  cloud: 'a cloud, w x h; drifts',
  flyer: 'birds: a small flock (lobby); blimp: ~60x20 with a label (open); heli: ~26x12 with a spinning rotor, phase 0..1 (exec)',
  sun: 'lobby: morning sun high left; exec: the setting sun low, half behind the cloud bank',
  // wall
  glassBay: 'a span of glazing x0..x1 between glass.top and glass.bottom. curtain (lobby): big panes, a transom bar at glass.transom, a revolving door at revolvingDoor (~44 wide, drum glass with 4 wings, frame.revolving 0..1 spin); ribbon (open): a sill at glass.bottom with an HVAC/radiator strip below it to the floor, venetian blinds lowered by `blinds` 0..1 of the glass height; full (exec): floor-to-ceiling, slim mullions every glass.mullion px',
  wallBay: 'solid wall x0..x1 from ceilingY to wallBase: lobby marble/stone, open painted plaster with a skirting, exec wood panelling',
  column: 'structural column, w wide, ceilingY..wallBase, between bays',
  lift: 'lift doors w x h standing on wallBase, a floor indicator over the doors showing `label`, doors open by `open` 0..1 (the car inside is lit)',
  logo: 'the company sign EGGCORP, w x h, centred on (x + w/2, y + h/2); the lobby centrepiece (an egg mark is fair game)',
  clock: 'wall clock, radius r, centre (x, y); hands from frame.clock (hourA, minuteA, secondA in radians, 0 = 12 o\'clock)',
  poster: 'motivational poster w x h with `label` (SYNERGY / HANG IN THERE (a kitten on a branch) / TEAMWORK)',
  whiteboard: 'whiteboard w x h with a scrawled rising chart and a tray of markers',
  painting: 'framed art w x h: variant 0 abstract, 1 a city view',
  portrait: 'gilt-framed oil portrait of the FOUNDER — Don K. Eggshell PhD: an egg-shaped ape, magnificent red moustache, tiny goggles; a brass plate with `label`',
  door: 'office door w x h standing on wallBase with a name plate `label` (MEETING 4B has a red IN USE light)',
  extinguisher: 'red fire extinguisher on a bracket, w x h',
  trophyCase: 'glass-fronted trophy cabinet w x h standing on wallBase, three shelves of cups and plaques, lit inside',
  bookshelf: 'floor-to-ceiling-ish bookshelf w x h standing on wallBase, leather spines, a few ornaments',
  cradle: 'window-cleaner gondola outside the glass, w wide, hanging on two ropes from above the frame; a cleaner swipes a squeegee (swipe 0..1)',
  // lights
  light: 'ceiling fixture: globe (lobby pendant globe on a cord, bottom at y), tube (open: a flush fluorescent troffer ~44x4 at the ceiling line; `on` 0..1 for the flickering one), pendant (exec: conical shade on a cord, warm pool of light)',
  // mid (feet on midBase)
  cubicles: 'a run of cubicles x0..x1: partitions ~34 tall, one desk per 40 px; desks[] carry the occupant: head (dy is the bob, pop raises head+shoulders up to 12 px — the prairie-dog peek) or empty (a monitor glow and a mug)',
  reception: 'curved reception desk w wide, ~34 tall, a receptionist\'s head and shoulders behind it, a bell and a monitor',
  turnstiles: 'security gates across w: 4 waist-high posts ~26 tall with glass flaps',
  sofa: 'low lounge sofa w x ~26',
  sidetable: 'smoked-glass disc on a chrome pedestal, ~16 tall',
  sculpture: 'an abstract lobby sculpture ~40x60 on a plinth (corporate modern: a twisted ribbon / an egg on a stand)',
  plant: 'potted plant: ficus ~30x60, palm ~40x70, snake ~16x34, bonsai ~18x20 on a stand',
  cooler: 'water cooler ~14x44 with a big bottle on top; bubble 0..1 = a glug rising in the bottle (-1 none)',
  copier: 'photocopier ~40x30; scan 0..1 = the light bar sweeping under the lid (-1 idle)',
  cabinet: 'four-drawer filing cabinet ~20x44',
  boardroom: 'the long boardroom table x0..x1 (~26 high) with high-back chairs (top ~46 above midBase); chairs[] have a sitter (head, nod 0..1 = dozing) or not; easel = a flip chart at the end with a falling-then-rising chart',
  desk: 'executive desk w x ~30, a green banker\'s lamp (warm glow), a high-back leather chair behind it',
  globe: 'library globe on a wooden stand ~18x34',
  tallclock: 'grandfather clock ~20x70, swing -1..1 = the pendulum',
  // front (painted after the lane)
  pillar: 'a big column passing close to camera, w wide, the full frame height. Keep it dark/soft/translucent enough that the hero still reads through it, or skip',
  frontPlant: 'plant fronds rising from the bottom edge to ~y 236',
  frontChair: 'chair / armchair back rising from the bottom edge to ~y 240',
});

// --------------------------------------------------------------- resolving
function instances(u, shift, period, margin = 140, coverage = { left: 0, right: FRAME_W }) {
  const x0 = (((u - shift) % period) + period) % period;
  const out = [];
  for (let n = Math.ceil((coverage.left - margin - x0) / period); n <= Math.floor((coverage.right + margin - x0) / period); n++) {
    out.push(x0 + n * period);
  }
  return out;
}

function spans(u, u1, shift, period, coverage) {
  const w = u1 - u;
  return instances(u, shift, period, w + 40, coverage).map((x0) => [x0, x0 + w]).filter(([a, b]) => b > coverage.left - 40 && a < coverage.right + 40);
}

// Lift doors: closed, open, closed, on a 7 s cycle with a per-lift phase.
function liftOpen(t, i) {
  const c = ((t + i * 2.3) % 7 + 7) % 7;
  if (c < 3) return 0;
  if (c < 3.6) return (c - 3) / 0.6;
  if (c < 5.4) return 1;
  if (c < 6) return 1 - (c - 5.4) / 0.6;
  return 0;
}

// The prairie dog: up, look about, down, every 6 s.
// A pop-up, every 7 s: up over the partition in 0.3 s, a 2.4 s look round, down again. The look
// goes one way, the other, and back (Peter, 15 Oct 2026: "more cubicle workers to stick their
// heads up and look around"); `side` is which way it starts.
const POP_PERIOD = 7, POP_UP = 3.6, POP_HOLD = 2.4;
function popAt(t, i) {
  const c = ((t + i * 1.7) % POP_PERIOD + POP_PERIOD) % POP_PERIOD;
  if (c < POP_UP) return 0;
  if (c < POP_UP + 0.3) return (c - POP_UP) / 0.3;
  if (c < POP_UP + 0.3 + POP_HOLD) return 1;
  if (c < POP_UP + 0.6 + POP_HOLD) return 1 - (c - POP_UP - 0.3 - POP_HOLD) / 0.3;
  return 0;
}
function popLook(t, i, side) {
  const c = ((t + i * 1.7) % POP_PERIOD + POP_PERIOD) % POP_PERIOD - POP_UP - 0.3;
  return Math.floor(Math.max(0, Math.min(2, c / (POP_HOLD / 3)))) === 1 ? -side : side;
}

function flickerAt(t) {
  // Mostly on, with a stutter of drop-outs every few seconds.
  const c = (t % 4.2 + 4.2) % 4.2;
  if (c > 3.2 && c < 3.75) return seeded(Math.floor(t * 20)) > 0.45 ? 1 : 0.15;
  return 1;
}

function resolveWall(F, camX, t, coverage) {
  const W = F.wall;
  const shift = camX * (W.factor ?? FACTORS.wall) * ZOOM;
  const P = W.period;
  const bays = [];
  W.bays.forEach((b, i) => {
    for (const [x0, x1] of spans(b.u, b.u1, shift, P, coverage)) {
      bays.push({
        type: b.type, i, x0, x1,
        blinds: b.blinds ?? 0,
        revolvingDoor: b.revolvingDoor == null ? null : x0 + (b.revolvingDoor - b.u),
      });
    }
  });
  const columns = [];
  W.columns.forEach((c, i) => {
    for (const x of instances(c.u, shift, P, c.w + 10, coverage)) columns.push({ i, x, w: c.w });
  });
  const hangs = [];
  W.hangs.forEach((h, i) => {
    for (const x of instances(h.u, shift, P, (h.w || h.r * 2 || 40) + 20, coverage)) {
      const y = h.y ?? WALL_BASE - h.h; // floor-standing things (lifts, doors, cases) stand on the wall's foot
      const out = { kind: h.kind, i, x, y, w: h.w ?? 0, h: h.h ?? 0, label: h.label ?? '', variant: h.variant ?? 0 };
      if (h.kind === 'clock') { out.r = h.r; out.cx = x; out.cy = h.y; }
      if (h.kind === 'lift') out.open = liftOpen(t, i);
      hangs.push(out);
    }
  });
  let cradle = null;
  if (W.cradle) {
    const [x] = instances(W.cradle.u, shift, P, W.cradle.w + 20, coverage);
    if (x != null) {
      cradle = {
        x, w: W.cradle.w,
        y: W.cradle.y + 6 * Math.sin(t * 0.35),
        swipe: 0.5 + 0.5 * Math.sin(t * 2.4),
      };
    }
  }
  return { shift, period: P, bays, columns, hangs, cradle, def: W };
}

function resolveMid(F, camX, t, coverage) {
  const M = F.mid;
  const shift = camX * (M.factor ?? FACTORS.mid) * ZOOM;
  const P = M.period;
  const items = [];
  M.items.forEach((it, i) => {
    if (it.kind === 'cubicles') {
      for (const [x0, x1] of spans(it.u, it.u1, shift, P, coverage)) {
        const n = Math.round((x1 - x0) / 40);
        const desks = [];
        for (let d = 0; d < n; d++) {
          const seated = it.heads.includes(d);
          // `pop` is the empty desk whose worker stands up; `peek`, seated heads that do it too
          const isPop = d === it.pop || (it.peek || []).includes(d);
          desks.push({
            x: x0 + d * 40, w: 40,
            occupied: seated || isPop,
            // the bob is a pixel or so; the pop raises head and shoulders up to 12 px
            dy: seated ? Math.sin(t * (1.1 + d * 0.13) + d * 2.1) * 0.8 : 0,
            pop: isPop ? popAt(t, i * 7 + d) : 0,
            look: isPop ? popLook(t, i * 7 + d, d % 2 ? 1 : -1) : 1,
            seed: i * 31 + d,
          });
        }
        items.push({ kind: 'cubicles', i, x0, x1, base: MID_BASE, desks });
      }
      return;
    }
    if (it.kind === 'boardroom') {
      for (const [x0, x1] of spans(it.u, it.u1, shift, P, coverage)) {
        const chairs = [];
        const pitch = (x1 - x0) / it.seats;
        for (let s = 0; s < it.seats; s++) {
          chairs.push({
            x: x0 + pitch * (s + 0.5),
            sitter: it.sitters.includes(s),
            // dozing: the head sinks slowly and jerks back up
            nod: (() => { const c = ((t * 0.31 + s * 0.27) % 1 + 1) % 1; return c < 0.85 ? c / 0.85 : 1 - (c - 0.85) / 0.15; })(),
            seed: i * 17 + s,
          });
        }
        items.push({ kind: 'boardroom', i, x0, x1, base: MID_BASE, chairs, easel: !!it.easel });
      }
      return;
    }
    const w = it.w ?? 0;
    for (const x of instances(it.u, shift, P, w + 60, coverage)) {
      const out = { kind: it.kind, i, x, w, base: MID_BASE, variant: it.variant ?? 0 };
      if (it.kind === 'cooler') { const c = ((t * 0.45 + i * 0.3) % 1 + 1) % 1; out.bubble = c < 0.35 ? c / 0.35 : -1; }
      if (it.kind === 'copier') { const c = ((t * 0.4 + i * 0.2) % 1 + 1) % 1; out.scan = c < 0.5 ? c / 0.5 : -1; }
      if (it.kind === 'tallclock') out.swing = Math.sin(t * Math.PI);
      if (it.kind === 'reception') out.dy = Math.sin(t * 1.3) * 0.6;
      items.push(out);
    }
  });
  return { shift, period: P, items };
}

function resolveOutside(F, camX, t, coverage) {
  const O = F.outside;
  const farShift = camX * FACTORS.cityFar * ZOOM;
  const nearShift = camX * (O.nearFactor ?? FACTORS.cityNear) * ZOOM;
  const cloudShift = camX * FACTORS.cloud * ZOOM;
  const place = (list, shift, period) => list.flatMap((b) => instances(b.u, shift, period, b.w + 10, coverage)
    .map((x) => ({ ...b, x })));
  const cars = O.cars.flatMap((c, i) => {
    // traffic has its own speed on top of the near parallax; period 900 so it comes round
    const shift = nearShift - t * c.speed;
    const w = { cab: 30, car: 28, bus: 64 }[c.kind];
    return instances(c.u, shift, 900, w + 10, coverage).map((x) => ({
      i, kind: c.kind, x, w, dir: Math.sign(c.speed) || 1,
      y: O.street ? (c.lane === 0 ? O.street.near - 2 : O.street.far + 10) : 0,
    }));
  });
  const clouds = O.clouds.flatMap((c, i) => instances(c.u, cloudShift + t * 2.5, 1000, c.w, coverage)
    .map((x) => ({ i, x, y: c.y, w: c.w, h: c.h })));
  let flyer = null;
  if (O.flyer) {
    const f = O.flyer;
    const [x] = instances(f.u, nearShift - t * f.speed, 1100, 80, coverage);
    if (x != null) flyer = { kind: f.kind, x, y: f.y + Math.sin(t * 0.7) * 2, label: f.label ?? '', slogan: f.slogan ?? '', phase: (t * 9) % 1, dir: Math.sign(f.speed) || 1 };
  }
  return {
    time: F.time,
    horizon: O.horizon,
    sun: O.sun ? { ...O.sun } : null,
    street: O.street ? { ...O.street } : null,
    far: place(O.far, farShift, 1400),
    near: place(O.near, nearShift, O.nearPeriod ?? 1200),
    trees: O.trees.flatMap((tr, i) => instances(tr.u, nearShift, 1200, 30, coverage).map((x) => ({ i, x, y: O.street.far, s: tr.s }))),
    lamps: O.lamps.flatMap((l, i) => instances(l.u, nearShift, 1200, 20, coverage).map((x) => ({ i, x, y: O.street.far }))),
    cars, clouds, flyer,
    // exec: the city's lights under the horizon haze, and the first stars
    cityLights: F.id === 'exec' && (coverage.left < 0 || coverage.right > FRAME_W) ? CITY_LIGHTS.flatMap(p => instances(p.u - 20, farShift, 520, 4, coverage).map(x => ({ x, y: p.y, a: 0.5 + 0.5 * Math.sin(t * p.rate + p.phase), s: p.s }))) : F.id === 'exec' ? CITY_LIGHTS.map((p) => ({ x: ((p.u - farShift) % 520 + 520) % 520 - 20, y: p.y, a: 0.5 + 0.5 * Math.sin(t * p.rate + p.phase), s: p.s })) : [],
    stars: F.id === 'exec' && (coverage.left < 0 || coverage.right > FRAME_W) ? STARS.flatMap(s => instances(s.x, 0, FRAME_W, 4, coverage).map(x => ({ ...s, x, twinkle: 0.6 + 0.4 * Math.sin(t * 1.5 + s.phase) }))) : F.id === 'exec' ? STARS.map((s) => ({ ...s, twinkle: 0.6 + 0.4 * Math.sin(t * 1.5 + s.phase) })) : [],
  };
}

const CITY_LIGHTS = Array.from({ length: 150 }, (_, i) => ({
  u: seeded(i + 500) * 520, y: 180 + seeded(i + 600) * 20, s: 0.5 + seeded(i + 700) * 0.8,
  rate: 0.8 + seeded(i + 800) * 2, phase: seeded(i + 900) * TAU,
}));
const STARS = Array.from({ length: 24 }, (_, i) => ({
  x: seeded(i + 100) * FRAME_W, y: 34 + seeded(i + 200) * 46, s: 0.5 + seeded(i + 300) * 0.8, phase: seeded(i + 400) * TAU,
}));

// The resolved frame a style paints from. `floorId` is lobby | open | exec, `t` seconds,
// `camX` the lane camera in world px. Everything is in screen px of the 480x270 frame.
export function officeFrame(floorId, camX, t, coverage = { left: 0, right: FRAME_W }, definition = OFFICE_FLOORS[floorId]) {
  const F = definition;
  const [hh, mm] = F.clock;
  const secs = t % 60;
  const minutes = mm + secs / 60;
  const lightsShift = camX * (F.mid.factor ?? FACTORS.mid) * ZOOM;
  const L = F.lights;
  const frontShift = camX * FACTORS.front * ZOOM;
  return {
    t, camX, W: Math.max(FRAME_W, coverage.right), H: FRAME_H, coverage,
    floor: F.id, label: F.label, stage: F.stage, name: F.name, time: F.time,
    laneTop: LANE_TOP, wallBase: WALL_BASE, midBase: MID_BASE, frontBase: FRONT_BASE,
    ceilingY: F.ceilingY,
    glass: { ...F.glass },
    clock: {
      hourA: TAU * (((hh % 12) + minutes / 60) / 12),
      minuteA: TAU * (minutes / 60),
      secondA: TAU * (secs / 60),
    },
    revolving: (t * 0.25) % 1,
    outside: resolveOutside(F, camX, t, coverage),
    wall: resolveWall(F, camX, t, coverage),
    lights: L.us.flatMap((u, i) => instances(u, lightsShift, L.period, 40, coverage).map((x) => ({
      i, x, variant: L.variant, y: F.ceilingY + L.drop, on: i === L.flicker ? flickerAt(t) : 1,
    }))),
    // recessed ceiling downlights, between the main fittings, at the same rate
    downs: L.downs || null,
    wallShift: camX * (F.wall.factor ?? FACTORS.wall) * ZOOM,
    mid: resolveMid(F, camX, t, coverage),
    front: F.front.items.flatMap((it, i) => instances(it.u, frontShift, F.front.period, (it.w || 60) + 20, coverage)
      .map((x) => ({ i, kind: it.kind, x, w: it.w ?? 0 }))),
    floorPlane: {
      variant: F.floor, top: WALL_BASE, bottom: LANE_TOP,
      shiftTop: camX * (F.wall.factor ?? FACTORS.wall) * ZOOM, shiftBottom: camX * ZOOM,
    },
    slab: { variant: F.floor, top: LANE_TOP, shift: camX * ZOOM },
  };
}
