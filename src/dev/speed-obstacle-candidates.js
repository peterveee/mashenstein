// Gallery-only SPEED ZONE OBSTACLE concepts — ten things that stand, roll, burn,
// lie or fly in the lane of the mid-century road, drawn in the backdrop's own hand.
//
// THE COMPLAINT (12 Oct 2026). Peter, after the office sheet: "can you examine
// obstacles in other cabinets … and recommend new items or replacements that fit
// in more with their style". Speed Zone has shipped in mid-century modern since
// 28 Sep (stylePacks/speedMcm.js): the Road Runner desert as the 1950s layout men
// painted it — flat colour plates, banded mesas, capsule saguaros, starburst
// agaves, boomerang vultures, atomic-age signs, a test range on the mesas, and a
// loose ink line printed out of register over all of it. What stands in front of
// it was drawn for every cabinet at once, in the props hand (soft gloss, hairline
// contour, a shared hazard rim):
//
//   * the red cartoon CACTUS and its big brother are saguaros — the one plant the
//     backdrop already stands on every near dune, in sage capsules — redrawn red
//     and spiny in another hand. The thing behind the lane is in front of it too;
//   * the wooden CRATE and wooden BARREL are warehouse and saloon stock, the oil-
//     drum FIRE BARREL is a city alley, the floor SAW and the spike PLATE are a
//     factory floor, the RAZOR HURDLE is a prison fence. None of them is a road;
//   * the SONGBIRD and the purple quad-rotor DRONE are this century's sky, on a
//     test range whose sky is jets, rockets and a radio telescope listening for
//     saucers.
//
//   What fits: the TRAFFIC CONE (the most-dealt hazard here, and road furniture),
//   the CAMPFIRE (the backdrop's own smoke rises from one behind the dunes), and
//   the rattlesnake and bobcat, which are animals and have their own bake-offs.
//
// THE BRIEF. Ten objects of the 1950s desert road — roadworks, a lost wheel, the
// coyote's dynamite, the cactus that is NOT a saguaro, the test range's visitors
// — each assigned to a slot the lane already deals, so a winner is a swap rather
// than a new mechanic. Every slot keeps its box and its answer; only the drawing
// is on trial. Two candidates share the cactus slot (A, B) so the sheet can choose
// between a plant and a gag for the most-dealt standing jump.
//
// NOT ON THIS SHEET, because the backdrop already owns them (Peter's office rule:
// an obstacle must not be something the scenery shows): saguaros, agave, yucca,
// rocks, tumbleweeds, vultures, road signs of every kind, telegraph poles, the
// police cruiser and its camera, pumpjacks, the water tower, the wind pump, the
// rocket and the jet.
//
// THE HAND. speedMcmCoyote.js's print, at lane scale: every silhouette part is
// first printed in ink a hair larger than itself and slipped up and right (the
// KEY PLATE), then the flat colour plates are laid over it — so the outline is
// the misregistered key that only shows along the figure's own edge, heavier on
// the top and right, and every hazard is self-outlined against both the dunes
// and the road. Flat fills; one hard-edged shade band on the LEFT, because the
// backdrop's sun is on the right (the saguaros split the same way); one lit
// sliver on the right; a whisper of the backdrop's own dry-brush bake in the
// big fields; starbursts wherever something sparks, glints or blinks. Interior
// lines are the backdrop's loose slipped rule. Colours are the period's hazard
// set — tomato, mustard, cream, chrome, teal, black — saturated where the
// afternoon is dusty, so one skin holds from the turquoise midday of speed-1
// through the golden hour to the violet dusk at speed-3's finish (hazards are
// not tinted by laneTint; the road and the hero are).
//
// THE COORDINATES. Each painter fills its PAINTED ENVELOPE in world units — box
// x 4/3, height x PROP_TALL (x PROP_VISUAL_SCALE for the fliers) — with the
// ground at y = h; obstacle-bakeoff-kit.js's slotEnvelope() derives it, and art
// outside it does not exist in the game. Bedded plates (H) sink 2u, so nothing
// that must show sits below h - 2. `t` is quantised to each candidate's own frame
// ring (frameOf), as the shipped prop ring would be.
//
// PORTING. Copy a painter into sprites/props.js under ctx.scale(w / W, h / H)
// (props.js painters receive the box-x-tall size and the run stretches by 4/3),
// add it to SELF_OUTLINED_PROPS (it carries its own key plate) and PROP_DETAIL_SCALE
// 2, give it PROP_FRAMES / PROP_FPS from its ring, DEBRIS colours from its plates,
// and deal it from Speed's pattern bank in place of the prop it replaces (the
// shared BASE_PATTERNS cactus and crate become a Speed-only skin, the way Frost
// swaps cactus for snowman). The dry-brush grain comes from the pack's baked
// textures (MCM_KIT.pats), so a port keeps the import. D is the one roller: the
// barrel's roll branch turns the whole drawing, which a wheel is the one object
// it is right for — a port drops the painter's own spin.
//
// Nothing here is registered in any gameplay registry.
import { frameOf } from './obstacle-bakeoff-kit.js';
import { MCM_KIT, MCM_PALETTES, arcPalette, actU } from '../engine/stylePacks/speedMcm.js';

import {
  saucer, burst, TAU, INK, TOMATO, TOMATO_DK, TOMATO_LT, MUSTARD, MUSTARD_DK, MUSTARD_LT, CREAM, CREAM_DK, SPARK, CHROME, CHROME_DK, CHROME_LT, REFLECT, TEAL, TEAL_DK, GLASS, GLASS_DK, BLACK, BLACK_LT, BLACK_DK, CACTUS, CACTUS_DK, CACTUS_LT, FRUIT, FRUIT_DK, FRUIT_LT, FLAME, FUSE, SLIP_X, SLIP_Y, GROW, LWI, REG_IN, oval, rect, rrect, poly, keyAt, key, keyFine, plate, fill, grain, rule, contour, rim, glint, PEAR_PADS, AREOLES, pricklyPear, STICKS, STICK_W, dynamite, RIBS, barrelBody, barrelCactus, WICK_H, WICK_SWAY, LICK_L, LICK_R, wickFlame, smudgePot, sawhorse,
} from '../sprites/speedProps.js';

// D — WHITEWALL TYRE, off something fast and rolling at you (barrel 17x17). Black
// rubber, a cream whitewall, a chrome cap with the sky in it and a tomato boss.
function whitewall(c, w, h, t) {
  const f = frameOf(t, 8, 16), g = h - 0.2;
  const R = 8.0, cx = 8.5, cy = g - R;
  // Rolling LEFT, so it turns anticlockwise. A quarter turn per ring: the 16
  // treads, 8 slots and 8-ray star all land back on themselves.
  const a = -(f / 8) * (TAU / 4);
  key(c, oval(cx, cy, R, R));
  plate(c, oval(cx, cy, R, R), BLACK, (p) => {
    // The lit sidewall: a crescent on the sun's side.
    p.fillStyle = BLACK_LT;
    p.fillRect(0, 0, w, h);
    fill(p, oval(cx - 0.9, cy, R - 0.2, R - 0.2), BLACK);
    // Treads: notches in the shoulder, turning.
    for (let k = 0; k < 16; k++) {
      const q = a + (k / 16) * TAU;
      p.save();
      p.translate(cx + Math.cos(q) * (R - 0.45), cy + Math.sin(q) * (R - 0.45));
      p.rotate(q);
      p.fillStyle = BLACK_DK;
      p.fillRect(-0.55, -0.45, 1.1, 0.9);
      p.restore();
    }
  });
  // The whitewall, its shade crescent on the left.
  plate(c, oval(cx, cy, 5.8, 5.8), CREAM_DK, (p) => fill(p, oval(cx + 0.7, cy, 5.6, 5.6), CREAM));
  // The cap: chrome, shade on the left, the sky's flat turquoise band across it.
  plate(c, oval(cx, cy, 4.3, 4.3), CHROME, (p) => {
    fill(p, poly([cx - 6, cy + 0.6, cx + 6, cy - 2.8, cx + 6, cy - 1.2, cx - 6, cy + 2.2]), REFLECT);
    p.fillStyle = CHROME_DK;
    p.fillRect(cx - 5, cy - 5, 2.0, 10);
  });
  contour(c, oval(cx, cy, 4.3, 4.3), 0.3, 0.9);
  for (let k = 0; k < 8; k++) {
    const q = a + (k / 8) * TAU;
    c.save();
    c.translate(cx, cy);
    c.rotate(q);
    fill(c, rrect(2.2, -0.42, 1.7, 0.84, 0.4), BLACK_LT);
    c.restore();
  }
  fill(c, oval(cx, cy, 1.75, 1.75), TOMATO);
  burst(c, cx, cy, 1.55, a, CREAM, 0.28, 8);
  fill(c, oval(cx, cy, 0.4, 0.4), CREAM);
  if (f === 2 || f === 3) glint(c, cx + 2.6, cy - 2.6, f === 2 ? 1.6 : 2.2);
}

// E — JERRY CANS, two high (stack 16x15). Tomato steel, the pressed X, three
// handles and a mustard cap; the petrol shimmers off the spout.
function jerryCan(c, w, h, t) {
  const f = frameOf(t, 8, 8), g = h - 0.2;
  const BX = 1.2, BY = 3.6, BW = 12.2, BH = g - BY;
  const body = rrect(BX, BY, BW, BH, 1.1);
  const HANDLE_BAR = rect(2.4, 0.9, 7.4, 0.95);
  const posts = [2.4, 4.6, 6.8, 9.0].map((x) => rect(x, 0.9, 0.8, 2.9));
  const cap = rrect(10.6, 0.7, 2.7, 3.2, 0.55);
  key(c, body, HANDLE_BAR, ...posts, cap);
  for (const post of posts) plate(c, post, TOMATO_DK);
  plate(c, HANDLE_BAR, TOMATO);
  plate(c, cap, MUSTARD, (p) => {
    p.fillStyle = MUSTARD_DK;
    p.fillRect(10.6, 0, 0.9, 5);
    p.fillStyle = MUSTARD_LT;
    p.fillRect(12.4, 1.2, 0.4, 2.2);
  });
  rule(c, [11.0, 2.4, 9.8, 3.4], 0.45, INK, 0.9, [0, 0]);
  plate(c, body, TOMATO, (p) => {
    p.fillStyle = TOMATO_DK;
    p.fillRect(BX, BY, 1.7, BH);
    p.fillStyle = TOMATO_LT;
    p.fillRect(BX + BW - 1.15, BY + 1.0, 0.45, BH - 2.0);
    grain(p, 0.16);
  });
  // The pressed X and the frame round it: a shade line with a lit one beside it.
  const X0 = BX + 1.9, X1 = BX + BW - 1.9, Y0 = BY + 1.6, Y1 = g - 1.6;
  rule(c, [X0, Y0, X1, Y1], 0.85, TOMATO_DK, 1, [0, 0]);
  rule(c, [X1, Y0, X0, Y1], 0.85, TOMATO_DK, 1, [0, 0]);
  rule(c, [X0 + 0.35, Y0 - 0.3, X1 + 0.35, Y1 - 0.3], 0.3, TOMATO_LT, 1, [0, 0]);
  rule(c, [X1 + 0.35, Y0 - 0.3, X0 + 0.35, Y1 - 0.3], 0.3, TOMATO_LT, 1, [0, 0]);
  c.beginPath();
  c.roundRect(BX + 0.9, BY + 0.9, BW - 1.8, BH - 1.8, 0.6);
  c.strokeStyle = TOMATO_DK;
  c.lineWidth = 0.35;
  c.stroke();
  // Fumes: two cartoon wiggles rising off the cap, chasing.
  for (let i = 0; i < 2; i++) {
    const ph = ((f + i * 4) % 8) / 8;
    const x0 = 13.9 + i * 1.2;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const y = 3.4 - k * 0.55 - ph * 0.6;
      pts.push(x0 + Math.sin(k * 1.4 + ph * TAU) * 0.45, y);
    }
    rule(c, pts, 0.28, INK, 0.55 * (1 - ph * 0.6), [0, 0]);
  }
  if (f === 5) glint(c, 12.6, 1.4, 1.5);
}

// H — SPIKE STRIP across the road (floor 20x16, bedded). A tomato-and-cream
// chevron bar laid on the kerb line, a row of raked steel spikes, a glint
// running along the points.
function spikeStrip(c, w, h, t) {
  // Bedded: the run sinks the art 2u and the road cuts it there.
  const f = frameOf(t, 10, 9), g = h - 2.0;
  const BAR_T = g - 2.8;
  const bar = rrect(0.4, BAR_T, 19.2, 3.2, 1.0);
  // Six stubby steel teeth, raked toward the hero, split light and shade like the
  // mesas' faces.
  const SPIKES = [7.0, 7.8, 7.2, 7.9, 7.1, 7.6].map((L, i) => {
    const x = 2.4 + i * 3.04;
    return { x, tip: [x - 0.7, BAR_T - L], path: poly([x - 1.25, BAR_T + 0.2, x + 1.25, BAR_T + 0.2, x - 0.7, BAR_T - L]) };
  });
  key(c, bar);
  keyFine(c, ...SPIKES.map((s) => s.path));
  for (const s of SPIKES) {
    plate(c, s.path, CHROME, (p) => {
      fill(p, poly([s.x - 1.4, BAR_T + 0.4, s.x - 0.1, BAR_T + 0.4, s.tip[0], s.tip[1]]), CHROME_DK);
      fill(p, poly([s.x + 0.45, BAR_T, s.x + 0.85, BAR_T, s.tip[0] + 0.1, s.tip[1] + 1.2]), CHROME_LT);
    });
  }
  plate(c, bar, CREAM, (p) => {
    p.beginPath();
    for (let x = -2; x < 22; x += 3.0) {
      p.moveTo(x, BAR_T);
      p.lineTo(x + 1.5, BAR_T);
      p.lineTo(x + 2.6, g + 0.4);
      p.lineTo(x + 1.1, g + 0.4);
      p.closePath();
    }
    p.fillStyle = TOMATO;
    p.fill();
    p.fillStyle = 'rgba(80,20,20,0.25)';
    p.fillRect(0, BAR_T + 2.0, w, 2);
  });
  // The collars the spikes sit in.
  for (const s of SPIKES) fill(c, oval(s.x, BAR_T + 0.1, 1.45, 0.45), BLACK);
  if (f < SPIKES.length) {
    const [tx, ty] = SPIKES[f].tip;
    glint(c, tx, ty + 0.4, 1.8);
  }
}


// J — HUBCAP, spun off and skimming at slide height (low 22x13). Chrome face-on,
// eight slots and a tomato boss turning, wobbling on its axis, speed lines behind.
function hubcap(c, w, h, t) {
  const f = frameOf(t, 8, 16);
  const a = -(f / 8) * (TAU / 4);
  const sx = 0.84 + 0.16 * Math.cos((f / 8) * TAU);
  const cx = 9.6, cy = 6.5, R = 6.1;
  for (let i = 0; i < 3; i++) {
    const k = ((f + i * 3) % 8) / 8;
    const y = 3.6 + i * 3.0;
    rule(c, [15.6 + k * 2.4, y, 18.6 + k * 2.4, y], 0.36, INK, 0.6, [0, 0]);
  }
  c.save();
  c.translate(cx, cy);
  c.scale(sx, 1);
  const face = oval(0, 0, R, R);
  key(c, face);
  plate(c, face, CHROME, (p) => {
    fill(p, poly([-7, 2.0, 7, -2.6, 7, -0.6, -7, 4.0]), REFLECT);
    p.fillStyle = CHROME_DK;
    p.fillRect(-7, -7, 2.7, 14);
    grain(p, 0.1);
  });
  // The rolled lip, then the slots and the boss, turning.
  c.beginPath();
  c.arc(0, 0, R - 0.9, 0, TAU);
  c.strokeStyle = CHROME_DK;
  c.lineWidth = 0.4;
  c.stroke();
  for (let k = 0; k < 8; k++) {
    c.save();
    c.rotate(a + (k / 8) * TAU);
    fill(c, rrect(2.5, -0.55, 2.3, 1.1, 0.55), BLACK);
    c.restore();
  }
  fill(c, oval(0, 0, 2.3, 2.3), TOMATO);
  burst(c, 0, 0, 2.0, a, CREAM, 0.32, 8);
  fill(c, oval(0, 0, 0.5, 0.5), CREAM);
  c.restore();
  if (f === 1 || f === 2) glint(c, cx + 2.8 * sx, cy - 3.2, f === 1 ? 1.7 : 2.4);
}

// ============================================================== the sheet
// The detail panels are the near dunes behind the lane at three points of the
// act's one afternoon (arcPalette), the kerb's yellow line, and the road.
const swatchAt = (stage, p) => ({ sky: arcPalette(actU(stage, p)).near.fill, ground: '#f6d33c', under: '#c4865b' });

export const BAKEOFF = {
  cabinet: 'speed',
  title: 'SPEED ZONE — obstacles for the mid-century road (bake-off)',
  note: 'Most of what Speed deals was drawn for every cabinet in the props hand: a red saguaro in front of the backdrop’s own sage ones, '
    + 'a warehouse crate and saloon barrel, an alley’s oil drum, a factory’s floor saw and spike plate, a prison-fence hurdle, a songbird and a '
    + 'quad-rotor drone over a 1950s test range. The cone and the campfire fit and stay. Ten replacements from the desert road of the period — '
    + 'a prickly pear or the coyote’s dynamite for the cactus, a barrel cactus, a whitewall tyre, jerry cans, a smudge pot, a sawhorse '
    + 'barricade, a spike strip, a flying saucer and a hubcap — printed as the backdrop is, flat plates over a slipped ink key. Pick letters.',
  // Three strips of the real frame, one per palette the act's afternoon runs through.
  strips: [
    { label: 'SPEED ZONE 1 · MIDDAY', stageIndex: 1, camX: 600, bc: { progress: 0.1 } },
    { label: 'SPEED ZONE 2 · GOLDEN HOUR', stageIndex: 2, camX: 1500, bc: { progress: 0.92 } },
    { label: 'SPEED ZONE 3 · DUSK', stageIndex: 3, camX: 2300, bc: { progress: 0.97 } },
  ],
  // The detail row's panels: the dunes behind the lane, the kerb line, the road.
  swatches: [swatchAt(1, 0.1), swatchAt(2, 0.92), swatchAt(3, 0.97)],
  // What the cabinet deals today, through the real run painter: [type, x].
  control: [
    ['trafficCone', 4], ['cactus', 22], ['crate', 80], ['barrel', 98], ['fireBarrel', 117], ['cactusBig', 136],
    ['campfire', 156], ['boomBarrier', 176], ['popSpikes', 199], ['floorSaw', 220], ['drone', 86], ['buzzbird', 190],
  ],
  candidates: [
    { letter: 'A', id: 'pricklyPear', name: 'PRICKLY PEAR', slot: 'stand', paint: pricklyPear,
      note: 'The desert’s other cactus — the one the backdrop does not already stand on every dune. Green paddles split light and shade like the saguaros behind, cream areoles that catch the sun one at a time, tomato-magenta fruit along the top. Replaces the red cactus.' },
    { letter: 'B', id: 'dynamite', name: 'DYNAMITE', slot: 'stand', paint: dynamite,
      note: 'The coyote’s bundle, left in the road: five tomato sticks in black tape, the fuse looping up to a fizzing starburst throwing embers. The same jump as the cactus; a boot snuffs it, it never goes off. Generic sticks, no brand on them.' },
    { letter: 'C', id: 'barrelCactus', name: 'BARREL CACTUS', slot: 'big', paint: barrelCactus,
      note: 'A fishhook barrel and its pup: the ribs are the mesas’ bands stood on end, every rib studded with red hooked spines in starbursts, a mustard crown on top. Red where it hurts. Replaces the big red cactus.' },
    { letter: 'D', id: 'whitewall', name: 'WHITEWALL TYRE', slot: 'barrel', paint: whitewall,
      note: 'A wheel off something fast, rolling at you: black rubber with treads, a cream whitewall, chrome cap with the sky in it and a tomato boss. The barrel’s roll branch spins the whole drawing — the one object that should spin. Replaces the wooden barrel.' },
    { letter: 'E', id: 'jerryCans', name: 'JERRY CANS', slot: 'stack', paint: jerryCan,
      note: 'Tomato steel cans with the pressed X, three handles and a mustard cap, petrol fumes wiggling off the spout; single and stacked two high. Replaces the wooden crate.' },
    { letter: 'F', id: 'smudgePot', name: 'SMUDGE POT', slot: 'fire', paint: smudgePot,
      note: 'The roadworks flare of the period: a black kerosene bomb on its foot ring, wick tube, a flat tomato-and-mustard flame licking up out of it. The warm one, from a road rather than an alley. Replaces the oil-drum fire barrel.' },
    { letter: 'G', id: 'sawhorse', name: 'SAWHORSE BARRICADE', slot: 'hurdle', tall: 1.5, paint: sawhorse,
      note: 'Two cream A-frames and a tomato-striped rail, an amber flasher blinking a starburst on the left post. Roadworks hurdle in place of the razor fence. Proposes PROP_TALL 1.5 for the lamp; the box is still the 16x9 rail.' },
    { letter: 'H', id: 'spikeStrip', name: 'SPIKE STRIP', slot: 'floor', paint: spikeStrip,
      note: 'The speed trap’s answer to the cabinet: a tomato-and-cream chevron bar across the kerb, seven raked steel spikes, a glint running along the points. Always armed (a port drops popSpikes’ lurk). Replaces the spike plate and the floor saw both.' },
    { letter: 'I', id: 'saucer', name: 'FLYING SAUCER', slot: 'high', paint: saucer,
      note: 'Something the radio telescope heard: a chrome saucer with a glass dome, a tomato rim whose lights chase, wobbling at head height. Replaces the songbird; still punishes the jump.' },
    { letter: 'J', id: 'hubcap', name: 'HUBCAP', slot: 'low', paint: hubcap,
      note: 'Spun off the tyre in D and skimming at slide height like a thrown blade: chrome face, eight slots and a tomato boss turning, wobbling on its axis, speed lines behind. Slide under. Replaces the rotor drone.' },
  ],
};

export { frameOf };
