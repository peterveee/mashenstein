// CORPORATE KOMBAT — the back of the open lift car (lab). Peter, 14 Oct 2026: "i would like
// posters in the back of open lifts (bakeoff)", and a Martian "standing in one of the open
// lifts as we pass on level 1".
//
// Round one (motivational, SYNERGY, the Founder, a directory, the paperwork, an ad, flyers)
// and round two (egg puns) were dropped; round three — the EGGCORP mark over a picture for
// each floor — and the office-hand Martian pressing the panel SHIPPED the same day, mixed one
// poster per lift bank, in engine/stylePacks/officeLigne/liftCar.js. This sheet shows those
// painters through progression.js setOfficeLiftBakeoff, so it is the shipped art.
import { paintLiftPoster, paintLiftPanel, paintLiftMartian, ligneMartian, LIFT_MARTIAN_SC } from '../engine/stylePacks/officeLigne/liftCar.js';

const poster = (name) => (g, car, { floor, t }) => { paintLiftPoster(g, car, name, floor, t); paintLiftPanel(g, car, floor); };
export const LIFT_POSTER_CANDIDATES = [
  { letter: 'A', name: 'the city at the floor’s hour', note: 'The skyline with the EGGCORP tower in front: sunrise in the lobby, noon on 23, dusk on 88 with the tower’s windows gold. Ships on 23’s second bank.', paint: poster('skyline') },
  { letter: 'B', name: 'the floor’s own pattern', note: 'The lobby’s Memphis pink, teal and squiggles; 23’s lemon grid with cobalt; 88’s black lacquer and gold. Ships on 88’s first bank.', paint: poster('memphis') },
  { letter: 'C', name: 'what the floor is about', note: 'GOOD MORNING with a turning sunburst; a bar chart with the line out of the top; gold eggs on velvet. Ships on 23’s first bank.', paint: poster('business') },
  { letter: 'D', name: 'the egg, big', note: 'One big egg in the floor’s colours, the crack across it and the word under it. Ships on 88’s second bank.', paint: poster('bigEgg') },
  { letter: 'E', name: 'the tower, YOU ARE HERE', note: 'The building in section, this floor lit. Ships in the lobby.', paint: poster('tower') },
];

const withPoster = (draw) => (g, car, o) => draw(g, car, o); // his car has no poster
export const LIFT_MARTIAN_CANDIDATES = [
  { letter: 'SHIPPED', name: 'three jabs at 23, ACK-ACK', note: 'The lobby bank’s right-hand car, pinned open for him: three impatient jabs at the button for 23 each go, the jaw chattering. Helmet top about 1.75 m (scale 1.35).', which: 1,
    paint: withPoster((g, car, { floor, t }) => paintLiftMartian(g, car, floor, t)) },
  { letter: 'before', name: 'last round’s size', note: 'The same at 1.2 — a head under a person.', which: 1,
    paint: withPoster((g, car, { floor, t }) => paintLiftMartian(g, car, floor, t, 1.2)) },
  { letter: 'L2', name: 'gun held low, no chatter', note: 'The first office-hand mock-up, at the shipped size, for comparison.', which: 1,
    paint: withPoster((g, car, { floor, t }) => { paintLiftPanel(g, car, floor); ligneMartian(g, car.x + car.w / 2, car.y + car.h - 3.4, LIFT_MARTIAN_SC, t, { glass: 'tinted' }); }) },
];
