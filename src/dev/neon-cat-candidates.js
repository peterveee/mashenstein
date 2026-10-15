// Gallery-only: THE SWIPING CAT for TERMINAL VELOCITY, a bake-off (16 Oct 2026).
//
// Peter: "i would like to bake off a new obstacle, it will be a stationary cat that would
// swipe at us in the neon level... in a similar way that the cobra strikes at us in the
// desert levels... not sure if we should go for realism or cutesy... it is a tokyo
// inspired level, lets try a few different options and see what fits".
//
// THE MECHANIC IS THE RATTLESNAKE'S, UNCHANGED (sprites/animals.js, run.js). It sits in
// the road and does not move. When the hero is SWIPE_LEAD seconds away the run starts
// its clock, and the swipe plays over SWIPE_T on the snake's own curve: wind up (0.2s),
// out fast (0.1s), held at full reach, slower back. Its box takes in the reach, so the
// answer is the jump. Every candidate here is the same rig on that same curve — the
// near forepaw drawn back by the ear, then out low across the lane at the hero's
// shins — so the sheet compares LOOKS, from a real alley cat to a lucky-cat statue.
//
// THE SLOT. Inline, because no named slot fits: an 18x11 box (the snake's 18 wide, a
// unit taller, since a sitting cat is) with the art stood 1.45 over it. Painted
// envelope 24x21 units, ground at y = h; the cat sits at the right and the swipe
// reaches the left edge, as the snake's coil and strike do.
//
// THE HAND. The neon sheet's rules (src/dev/neon-obstacle-candidates.js): flat bodies
// in one ink at one weight, one lit sliver and one shade band; light as tube (faint wide
// stroke, the colour, a white-hot core); RED is the danger light, because the backdrop
// owns cyan, magenta and the coin amber. Every body is dark enough, or inked hard
// enough, to stand off neon-1's golden paper sky as well as the night.
//
// Nothing here is registered in any gameplay registry.
import { drawCabinetLane, placeCandidate, slotEnvelope } from './obstacle-bakeoff-kit.js';
import { makeObstacle } from '../game/entities.js';
import { drawWorldEntity, HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X, PLAYER_W } from '../game/player.js';
import { GROUND_Y } from '../engine/camera.js';
// The painters live in sprites/neonCats.js since four of them shipped (16 Oct 2026).
import {
  SWIPE_T, SWIPE_LEAD, CAT_SLOT, swipeOf,
  nora, maneki, chibi, neonCat, mecha, nekomata, chonk, pythagoras,
  neonMecha, mechaTrim, mechaGun, neonBright, nekoNeon, nekoGhost, pythNeon,
} from '../sprites/neonCats.js';

export { SWIPE_T, SWIPE_LEAD, CAT_SLOT, swipeOf };

// ============================================================== the sheet
export const NEON_CAT_CANDIDATES = [
  { letter: 'A', id: 'nora', name: 'NORA — the stray', look: 'realistic', paint: nora,
    note: 'Realistic. A lean grey-brown mackerel tabby off a Shinjuku back street, notched ear, yellow-green slit eyes. Arches and hisses on the wind-up, claws out on the swipe, white swipe marks. The only neon on it is a magenta rim light off the signs.' },
  { letter: 'B', id: 'maneki', name: 'MANEKI-NEKO', look: 'cute, with a twist', paint: maneki,
    note: 'The beckoning lucky cat off every shop counter, life size in the road: white glaze, calico patches, red collar, gold bell and koban. Its raised paw beckons as you come — then stops beckoning and swipes, eyes gone to red slits, red tube slashes. A statue that has had enough.' },
  { letter: 'C', id: 'chibi', name: 'KAWAII', look: 'cutesy', paint: chibi,
    note: 'The street-fashion mascot: a round white cat that is mostly head, big shining eyes, pink cheeks, a red bow. On the wind-up its eyes go to > < and a red anger mark pops on its brow; the swipe is a mitten of a paw and cartoon swipe lines.' },
  { letter: 'D', id: 'neon', name: 'NEON CAT', look: 'the city\'s own hand', paint: neonCat,
    note: 'A black cat drawn the way the city draws itself: a dark body with a red tube round its contour and a white-hot core, like the train. Red spark eyes. The swipe leaves three red tube slashes in the air — a sign come to life.' },
  { letter: 'E', id: 'mecha', name: 'MECHA-NEKO', look: 'Akihabara robot', paint: mecha,
    note: 'A robot cat in white-and-steel panels, antenna ears, a red visor scanning where the eyes would be, a bead-chain tail with a red tip lamp. For the swipe three blades slide out of the paw.' },
  { letter: 'F', id: 'nekomata', name: 'NEKOMATA', look: 'folklore yōkai', paint: nekomata,
    note: 'The yōkai: an old black cat whose tail has split in two, each tip burning with pale ghost-fire, wide gold eyes. The shrine at the end of the alley rather than the arcade. Violet swipe marks.' },
  { letter: 'G', id: 'chonk', name: 'CHONK', look: 'comic', paint: chonk,
    note: 'The cat-café regular: an orange tabby loaf on a red zabuton, half-lidded and unimpressed. The swipe is the same speed as everyone\'s (same obstacle) but the face never wakes up — the lids come down a touch, that is all.' },
  { letter: 'H', id: 'pythagoras', name: 'PYTHAGORAS — the chocolate Burmese · SHIPPED', look: 'realistic, a breed', paint: pythagoras,
    note: 'Peter\'s chocolate Burmese, from his reference picture: a compact, muscular cat in one short glossy chocolate coat, darker over the face, ears and tail, a round head and short muzzle, wide-set rounded ears, and big gold-amber eyes under a low, unimpressed brow. Tail up in a question mark. No stripes; the pattern is the sheen.' },
  { letter: 'I', id: 'neonMecha', name: 'NEON MECHA (D × E)', look: 'round 2', paint: neonMecha,
    note: 'The robot in the city\'s hand: E\'s panels, visor, antennae and blades on a dark hull, its contour a red tube with a white-hot core, like D.' },
  { letter: 'J', id: 'mechaTrim', name: 'MECHA, NEON-TRIMMED (E) · SHIPPED', look: 'round 2', paint: mechaTrim,
    note: 'E as it was — white shell, red visor — with a red rim of light round its contour, as if it had walked out of the signs.' },
  { letter: 'K', id: 'mechaGun', name: 'MECHA, GUNMETAL (E)', look: 'round 2', paint: mechaGun,
    note: 'E in dark gunmetal with the same red LEDs: heavier and meaner, and no longer the whitest thing on the road.' },
  { letter: 'L', id: 'neonBright', name: 'NEON CAT, BRIGHTER (D) · SHIPPED', look: 'round 2', paint: neonBright,
    note: 'D with a heavier tube, a stronger throw of light and a body lifted toward violet, so the silhouette holds on the golden-hour sky as well as the night.' },
  { letter: 'M', id: 'nekoNeon', name: 'NEKOMATA IN NEON (D × F)', look: 'round 2', paint: nekoNeon,
    note: 'F unchanged, given a red neon rim round its body, tails and paw — the two-tailed yōkai with the city\'s danger light on it, so it reads on the dark.' },
  { letter: 'N', id: 'nekoGhost', name: 'NEKOMATA, GHOST-LIT (F) · SHIPPED', look: 'round 2', paint: nekoGhost,
    note: 'F lit by its own ghost-fire instead: a violet-white rim and a lighter coat, so it reads on the dark without borrowing the red.' },
  { letter: 'O', id: 'pythNeon', name: 'PYTHAGORAS IN NEON (H)', look: 'round 2', paint: pythNeon,
    note: 'Pythagoras unchanged — chocolate coat, amber scowl, question-mark tail — with a red neon rim round his body, tail and paw, so the dark Burmese reads on the night.' },
];

// What the desert deals today, for the mechanic: the real rattlesnake through the real
// run painter, its strike driven by strikeT exactly as run.js drives it.
export const NEON_CAT_NOW = { letter: 'NOW', id: 'rattlesnake', name: 'THE RATTLESNAKE (Speed Zone)',
  note: 'The shipped snake through the real run painter, for the mechanic and the size: same lead, same strike clock, same box answer (the jump). Shown on the neon road for scale only.' };

const SLOTTED = new Map();
function slotted(cand, u) {
  if (!SLOTTED.has(cand.id)) SLOTTED.set(cand.id, { slot: CAT_SLOT, paint: null, letter: cand.letter });
  const s = SLOTTED.get(cand.id);
  s.paint = (c, w, h, tt) => cand.paint(c, w, h, tt, u);
  return s;
}
export const CAT_ENVELOPE = slotEnvelope({ slot: CAT_SLOT });

const snakes = new Map();
function drawNow(c, x, t, u) {
  if (!snakes.has(x)) snakes.set(x, makeObstacle('rattlesnake', 0));
  const e = snakes.get(x);
  e.x = x;
  e.strikeT = u == null || u < 0 ? null : u;
  drawWorldEntity(c, e, 0, t, null, {});
}

// --------------------------------------------------------------- the tiles
// THE APPROACH. The lane scrolls at the sheet's 110 u/s; the cat rides in with the road
// from off the right, the swipe fires SWIPE_LEAD ahead of the hero exactly as run.js
// fires the snake's, and Lorenzo hops it — a short hop, the answer in one gesture.
const SPEED = 110;
const START = 268;
const LOOP = 3.2;
const HOP_V = 250, HOP_G = 900;
const HERO_C = PLAYER_X + PLAYER_W / 2;
export function drawNeonCatApproach(ctx, t, strips, cand) {
  const ph = ((t % LOOP) + LOOP) % LOOP;
  const x = START - SPEED * ph;
  const trig = (START - HERO_C - SPEED * SWIPE_LEAD) / SPEED;
  const u = ph - trig;
  const hop = ph - (START - HERO_C - 18) / SPEED;
  const air = hop > 0 && hop < (2 * HOP_V) / HOP_G;
  const y = air ? HOP_V * hop - 0.5 * HOP_G * hop * hop : 0;
  drawCabinetLane(ctx, t, 'neon', strips, (c, tt) => {
    if (cand.id === 'rattlesnake') drawNow(c, x, tt, u);
    else placeCandidate(c, slotted(cand, u), x, tt, 1);
    const pose = air
      ? { kind: 'jump', time: tt, vy: HOP_V - HOP_G * hop, grounded: false, facing: 1 }
      : { kind: 'run', phase: tt * 1.6 % 1, time: tt, grounded: true, facing: 1 };
    drawToon(c, 'lorenzo', pose, PLAYER_X, GROUND_Y - y, HERO_DRAW_H);
  }, { hero: null });
}

// THE LINE-UP. Everything side by side on the same 2.2s loop — a second idle, the
// swipe, a breath — lettered, the snake first for the size and the timing.
const LINEUP_LOOP = 2.2;
export function drawNeonCatLineup(ctx, t, strips, cands = NEON_CAT_CANDIDATES, withSnake = true) {
  const all = withSnake ? [NEON_CAT_NOW, ...cands] : cands;
  const span = 232, left = 6;
  const step = span / all.length;
  const u = (((t % LINEUP_LOOP) + LINEUP_LOOP) % LINEUP_LOOP) - 1.0;
  const xs = all.map((_, i) => left + step * (i + 0.5));
  drawCabinetLane(ctx, t, 'neon', strips, (c, tt) => {
    all.forEach((cand, i) => {
      const bx = xs[i] - CAT_SLOT.box[0] / 2;
      if (cand.id === 'rattlesnake') drawNow(c, bx, tt, u);
      else placeCandidate(c, slotted(cand, u), bx, tt, 1);
    });
  }, { hero: null, labels: all.map((cand, i) => [cand.letter === 'NOW' ? '·' : cand.letter, xs[i]]) });
}
