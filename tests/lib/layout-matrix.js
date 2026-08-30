// The (stage × seed) matrix the layout parity fixture is captured over — one
// module so the capture tool and the parity test cannot drift apart.
//
// Six stages, chosen for what they exercise rather than spread evenly:
//   plumber-2   the scripted rewind capsule (rewindAt)
//   plumber-3   scripted pits + a spike crossing + islands/fork/tunnel routes
//               + the finish-dog cabinet
//   speed-2     the loop set piece + scripted pits + a chase mission's copter
//   frost-2     ice (iceSlide spacing) + frost's island and fork
//   crypt-2     a tunnel cabinet in act II (90s duration, higher tier ramp)
//   cardboard-2 act III: 120s, tier 2 from the start, cardboard's islands
//
// Three seeds each: enough that a stream disturbance cannot hide behind one
// lucky deal, cheap enough (~1s a run) that the suite stays in the fast gate.
export const MATRIX = [
  { stage: 'plumber-2', seeds: [101, 202, 303] },
  { stage: 'plumber-3', seeds: [101, 202, 303] },
  { stage: 'speed-2', seeds: [101, 202, 303] },
  { stage: 'frost-2', seeds: [101, 202, 303] },
  { stage: 'crypt-2', seeds: [101, 202, 303] },
  { stage: 'cardboard-2', seeds: [101, 202, 303] },
];

export const FIXTURE_PATH = 'tests/fixtures/layout-baseline.json';
