// Ranged-move candidates — a bake-off, not cast. Nothing in a build imports
// this file; the gallery does. Each candidate is the SHIPPED hero (his own
// TOON_SPECS row, his own palette) plus the lab flags the painter reads:
// `ranged` names the prop and, for a two-handed launcher, the gesture;
// `toss` picks which shipped throw carries it (see toons.js, the
// RANGED_GESTURES block). `flight` is how the gallery flies the projectile —
// the shape of the move as gameplay, which is the half of the question the
// pose alone cannot answer.
//
// When one wins: HEROES gets the ability row, run.js the flight, poseFromPlayer
// the pose, and the prop's production branch loses its `spec.ranged` gate.
// Then this file's list for that hero comes out, and so does the section.
import { TOON_SPECS } from '../sprites/toons.js';

const L = TOON_SPECS.lorenzo;

// FERNWICK'S LONGBOW SHIPPED (6 Sep 2026): her six cuts and the B2 draw styles
// came out of here — TOON_SPECS.fernwick carries ranged/bowStyle/back now, and
// HEROES has the 'bow' row. Only Lorenzo's question is still open.
// LORENZO — the ask is the wrench; the rest are the toolbag.
export const LORENZO_RANGED_CANDIDATES = [
  {
    id: 'wrench', name: 'L1 — WRENCH THROW', prop: 'wrench', flight: 'return',
    note: 'The ask. The same wrench he swings, thrown overarm, spinning, and it comes back. The prop '
      + 'already exists and already reads at size; returning is the axe\'s flight. Cheapest cut here.',
    spec: { ...L, ranged: 'wrench', toss: 'overarm' },
  },
  {
    id: 'plunger', name: 'L2 — PLUNGER', prop: 'plunger', flight: 'stick',
    note: 'Thrown overarm cup-first; it sticks where it lands. A one-way throw with a punchline at the '
      + 'far end, and the red cup is the most readable mark on this list.',
    spec: { ...L, ranged: 'plunger', toss: 'overarm' },
  },
  {
    id: 'pipe', name: 'L3 — U-BEND', prop: 'pipe', flight: 'tumble',
    note: 'A length of pipe, thrown overarm, tumbling end over end and dropping. Heavy and dumb in a '
      + 'good way; the two flanges are what keep it reading as plumbing while it spins.',
    spec: { ...L, ranged: 'pipe', toss: 'overarm' },
  },
  {
    id: 'bucket', name: 'L4 — SCALDING SLOSH', prop: 'splash', flight: 'bounce',
    note: 'Underarm flick of a bucket; a slug of hot water bounces down the lane with steam coming off '
      + 'it. The bouncing fireball, in plumbing — a flight no one else has, and a joke about his '
      + 'trade rather than his tools.',
    spec: { ...L, ranged: 'bucket', toss: 'flick' },
  },
  {
    id: 'hose', name: 'L5 — PRESSURE HOSE', prop: 'jet', flight: 'stream', gesture: 'hose',
    note: 'Both hands on a brass nozzle; a jet reaches out and holds for a beat. Not a projectile at all — '
      + 'a short beam — so it needs its own flight in run.js, but it is instant and it reads at any '
      + 'size, because it is a line.',
    spec: { ...L, ranged: 'hose' },
  },
  {
    id: 'nuts', name: 'L6 — LOOSE HARDWARE', prop: 'nut', flight: 'burst',
    note: 'A fistful of nuts thrown overarm, fanning into three. Clara\'s double-tap shape (shotBurst) '
      + 'with a spread, so gameplay is a row in HEROES. Small, fast, and it costs him nothing he has '
      + 'to get back.',
    spec: { ...L, ranged: 'nuts', toss: 'overarm' },
  },
];

// ---------------------------------------------------------------------------
// ROUND 2 (6 Sep 2026). F1 and L1 were picked and both need finessing: the
// shipped overarm pitch cocked Lorenzo's hand behind his head, and the bow
// hung off the wrong side of the hand with the arrow nowhere near the draw
// line. Round 1's other cuts stay in their sections for the record.
// B2 WON (6 Sep 2026) — "this is the right direction, ditch the other
// options". The level/canted/snap styles stay in BOW_STYLES for the record;
// only the high draw is enumerated now, and it is being finessed in place.
export const WRENCH_CANDIDATES = [
  {
    id: 'wrench-high', name: 'W1 — OVERHEAD, IN FRONT', throwStyle: 'high',
    note: 'The pitch, moved: cocked straight up and a little FORWARD of the face, elbow up, and the '
      + 'arm paints over the head while it is up there, so the wrench sits over the hat brim where '
      + 'nothing hides it. Whip through, follow down and across.',
  },
  {
    id: 'wrench-sidearm', name: 'W2 — SIDEARM', throwStyle: 'sidearm',
    note: 'Cocked level with the shoulder, back across the chest, whipped through flat. The arm crosses '
      + 'the torso and is painted over it, so hand and tool are visible the whole way; the flattest, '
      + 'most "skimmed" throw.',
  },
  {
    id: 'wrench-windmill', name: 'W3 — WINDMILL', throwStyle: 'windmill',
    note: 'One full turn of the straight arm about the shoulder — down, back, over the top, forward — '
      + 'releasing at the front. The most motion of the four and the tool leads the whole way, so '
      + 'the swing reads as a spin even at three frames.',
  },
  {
    id: 'wrench-heave', name: 'W4 — TWO-HAND HEAVE', throwStyle: 'heave',
    note: 'Both hands on the wrench, raised overhead in front, brought down and forward together like a '
      + 'hammer. Heavy — the throw of a stout man with a big tool — and both arms come over the head.',
  },
].map((c) => ({ ...c, prop: 'wrench', flight: 'return', gesture: 'throw', spec: { ...L, ranged: 'wrench', throwStyle: c.throwStyle } }));

// ---------------------------------------------------------------------------
// ROUND 3 (9 Sep 2026) — WHERE THE WRENCH LIVES. Round 2 asked what the throw
// looks like; this asks where the tool is the rest of the time. Today it is
// nowhere: painted only while it is being swung or thrown, so it flashes into
// an empty hand. Every cut below wears it, and every cut pays the same 0.08s
// reach to get it (WRENCH_REACH_T, the bow's number), so the question is only
// the CARRY — is it readable worn, does it survive the run, and does the fetch
// read as taking it out.
//
// C4 PICKED (9 Sep 2026, Peter: "C4 is the preferred walking / standing version",
// then "i only want c4"). C1 near hip / C2 far hip / C3 chest pocket / C5 two
// wrenches are retired — the `wrenchCarry` painter still takes all five, the
// same way BOW_STYLES kept the draws that lost, so any of them can be put back
// by adding a row here. The throw is held at W1 throughout: one variable at a
// time. When this settles into the cast it becomes TOON_SPECS.lorenzo's
// `wrenchCarry` and the section comes out.
export const WRENCH_CARRY_CANDIDATES = [
  {
    id: 'carry-loop', name: 'C4 — HEAD UP IN A BELT LOOP', wrenchCarry: 'loop',
    note: 'Shaft through a loop on the belt over the NEAR leg, HEAD UP, jaw turned inboard. Head down '
      + '(the first cut) was a spade — a heavy blade at the bottom of a stick is a digging tool whatever '
      + 'colour the stick is — and it put the only steel on him down by his knee. Inverted, the jaw '
      + 'stands where the eye already is and the red runs down the thigh. It sits inboard of where the '
      + 'near hand hangs, and the jaw faces AWAY from that arm, so the swing passes outside it. Sways on '
      + 'the stride, half as far as a free-hanging tool: it is held in a loop, so it does not flap.',
  },
].map((c) => ({ ...c, prop: 'wrench', flight: 'return', gesture: 'throw',
  spec: { ...L, ranged: 'wrench', throwStyle: 'high', wrenchCarry: c.wrenchCarry } }));
