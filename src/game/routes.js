// Raised routes: the geometry of a road that leaves the lane.
//
// Split out of RunState for one reason above all others — the asset gallery has
// to be able to build the SAME roads the run builds and draw them through the
// SAME painters, or the page that is supposed to be the reference for this art
// is quietly its own second implementation. Nothing here touches run state; it
// is a pure function of a cabinet's data and one stage's length and speed.
import { PLAYER_W } from './player.js';
import { worstJumpApex } from './spawner.js';

// How high a floating island may sit, in px above the ground under it.
//
// Derived rather than chosen: `worstJumpApex()` is ~37px for the pessimistic
// worst hero (and 45.5 for the real one, Grumpos), and a slab you can only just
// touch at the very top of a perfect jump is one you miss constantly. 80% of
// that leaves the margin the landing actually needs.
export const MAX_ISLAND_RISE = Math.floor(worstJumpApex() * 0.8);

// How wide a tunnel's two kinds of opening are, both in hero-widths.
//
// The ENTRANCE is the decision — it has to be seen coming and cleared on
// purpose, so it is wide enough to be a real gap in the lane and still well
// inside a jump's 114px span at the slowest stage.
//
// A MID-SPAN hole is a second chance, not a second decision. Three hero-widths:
// step into it if you fancy it, and if you never noticed it you were running
// fast enough to be over it. It used to be a ninth of the whole span — 155px on
// the plumber tunnel — which is not a hole, it is a missing lane.
export const TUNNEL_MOUTH_W = PLAYER_W * 7;
export const TUNNEL_HOLE_W = PLAYER_W * 3;

// Clear lane between one road ending and the next beginning, in SECONDS — the
// same unit the roads themselves are authored in, so the breathing space scales
// with the stage's speed exactly as their spans do.
export const ROUTE_CLEAR = 2.2;

/**
 * How far a road sits above the ground at this x. SIGNED: positive is a high
 * road, negative is a tunnel under the lane. One profile describes both.
 *
 *   entry ──lip──┐
 *                └──climb──┐ peak ──hold── ┐
 *                                          └──merge── 0
 *
 * **The mouth is a LEDGE, not a slope.** `entry` is in force from the moment
 * the span opens and holds through `lip`. A road that rose gradually out of
 * the floor would collect a hero who simply kept running, and then it would
 * not be a choice at all — you take it deliberately or you do not take it.
 * The lip is the landing: it is the stretch a spring's arc comes down on, and
 * making it flat is what lets one pad serve heroes with different gravity.
 *
 * **Then it CLIMBS, and that is what makes the choice binding.** `entry` is
 * within reach of a jump or a pad; `peak` is not, and by the time the road
 * gets there the low lane is far enough below that neither road can reach the
 * other. Before this the two roads sat 29px apart — one hop — so missing the
 * turn cost nothing and taking it committed you to nothing.
 *
 * **And then it STOPS, in the air.** `end` is the height the descent settles
 * at before the span closes, and it is not zero for anything you can fall
 * off. A road that eased all the way down to meet the lane had no ending —
 * you walked back onto the ground and the whole excursion finished with a
 * shrug. Stopping at height finishes it with a drop, which costs nothing (a
 * fall does not injure anyone here) and is the only moment of the ride the
 * player does not choose the timing of.
 *
 * `end: 0` is still available and is what a TUNNEL uses, because you cannot
 * fall off the bottom of one — a low road has to climb back out, and that
 * easing IS the convergence: by the time the span closes, road and ground are
 * the same line and the route drops away with nothing to fall.
 */
/** Whether a road exists at this x at all — false inside one of its breaks. */
export function roadAt(worldX, f) {
  for (const g of f.gaps || []) {
    if (worldX >= g.x && worldX <= g.x + g.w) return false;
  }
  return true;
}

export function routeRise(worldX, f) {
  const t = (worldX - f.x) / f.w;
  // `t < 0`, not `t <= 0`: the mouth itself is already at entry height.
  // Letting the very first column sit at ground level draws a vertical wall
  // from the floor up to the road, which reads as something the hero will run
  // into rather than a ledge he can jump to.
  if (t < 0 || t >= 1) return 0;
  if (t < f.lip) return f.entry;
  if (t < f.lip + f.climb) {
    const k = (t - f.lip) / f.climb;
    return f.entry + (f.peak - f.entry) * (k * k * (3 - 2 * k));
  }
  // `hold` is the absolute fraction at which the descent BEGINS, not a length
  // — which is what it has always meant in the cabinet data, and what makes a
  // road easy to author: lip, climb and hold read straight off as the three
  // places along the span where it changes what it is doing.
  if (t < f.hold) return f.peak;
  const k = (t - f.hold) / (1 - f.hold);
  return f.end + (f.peak - f.end) * (1 - k * k * (3 - 2 * k));
}



/**
 * Every road a cabinet declares, laid out along one stage.
 *
 * `groundYAt` is passed in rather than imported because an island's flat top is
 * fixed from the terrain under its middle, and the terrain is the run's to know.
 */
export function buildRoutes(cabinet, { totalDist, speed, groundYAt }) {
  const mk = (kind) => (d) => {
    const x = d.at * totalDist;
    const w = (d.dwell ?? 0.7) * speed;
    const down = kind === 'tunnel';
    // Both openings are sized off the HERO rather than off the span: a hole
    // is something you step into or step over, and the size that reads as
    // either is the size of the man doing it. Off the span they also grew
    // with the stage's speed while he stayed exactly as big as ever.
    const mouthW = down ? (d.mouth ? d.mouth * w : TUNNEL_MOUTH_W) : w;
    // The mouth height — what the hero has to reach to take this road at all.
    //
    // Capped at the reachable ceiling ONLY when he gets there under his own
    // power. A SPRUNG road is entered by catapult, so the cap does not apply
    // to it and it is free to start well above jump range; that is the whole
    // reason the pad exists. A tunnel is entered by falling, so its mouth is
    // not a reach at all — it is a hole, and it is as deep as it likes.
    const climbTo = d.peak ?? d.rise ?? 30;
    // A STACKED island is exempt too, and for the same reason a sprung road
    // is: the cap asks "can he reach this from the floor below it", and the
    // floor below step three is step two. `stairs` has already capped each
    // step's own increment, which is the height that actually has to be
    // jumped.
    const entry = down ? -(d.entry ?? d.depth ?? 46)
      : (d.spring || d.stacked) ? (d.entry ?? d.rise ?? 30)
        : Math.min(d.entry ?? d.rise ?? 30, MAX_ISLAND_RISE);
    const peak = kind === 'island' ? entry : down ? -(d.depth ?? 46) : Math.max(entry, climbTo);
    // Where the road stops being flat, stops climbing, and starts coming back
    // down. An island is flat for its whole length and then simply stops, so
    // it is all lip and nothing else.
    const lip = kind === 'island' ? 1 : (d.lip ?? (d.spring ? 0.2 : 0.08));
    const climb = kind === 'island' ? 0 : (d.climb ?? (peak === entry ? 0 : 0.3));
    const hold = kind === 'island' ? 1 : Math.max(lip + climb, d.hold ?? 0.6);
    // Where the descent settles before the span closes. A tunnel has to come
    // back to the lane — there is no falling off the bottom of one — and an
    // island is its own height all the way to its lip. Everything else ends
    // in the air unless the data says otherwise.
    const end = down ? 0 : kind === 'island' ? entry : Math.min(d.end ?? 0, peak);
    return {
      kind, x, w, entry, peak, lip, climb, hold, end,
      // A tunnel that starts LEVEL with the lane is a ramp, not a hole: the
      // ground peels away downward and you ride it, and the way to refuse is to
      // jump the mouth and land back on the lane past it. Nothing is cut out of
      // the lane for one, because there is nothing to fall through — which is
      // also why it needs no gap obstacle and no opening in the roof.
      ramp: down && entry === 0,
      // BREAKS IN THE ROAD. Stretches of the span where there is simply nothing
      // to stand on, so a road you are locked onto still asks something of you
      // between its ends. Authored as fractions along the span with a width in
      // SECONDS, like everything else here — a fixed pixel gap would be a real
      // jump at the start of the game and a stride by UNPLUGGED, because the
      // jump grows with the stage's speed and a pixel does not.
      //
      // Never inside the lip (that is where a spring puts you down) and never
      // at the very end (the drop off the lip is already the ending), so a gap
      // is always somewhere you arrive at running.
      gaps: (d.gaps || []).map((at) => ({
        x: x + w * Math.max(lip + 0.04, Math.min(0.92, at)),
        w: (d.gapSec ?? 0.3) * speed,
      })),
      // Which staircase this step belongs to, if any — the overlap guard lets
      // members of one sit close, because that gap is the jump.
      stack: d.stack || null,
      // What the road is furnished with. Types out of the ordinary obstacle
      // registry, laid by populateRoute — a branch has the same vocabulary
      // the lane has, it just has it somewhere else.
      hazards: d.hazards || null,
      // One power-up somewhere along it, on top of whatever `prize` pays.
      // A road with real hazards on it has earned more than a coin run.
      bonus: d.bonus || null,
      // The tallest thing about the road, unsigned — the height a hero has to
      // fall when one stops dead under him.
      rise: Math.abs(peak),
      // Islands get a FLAT top, fixed here from the ground under the slab's
      // middle rather than evaluated per column. A floating slab is a flat
      // thing; letting it ride the hills underneath would tilt the floor the
      // hero stands on and hand `groundDelta` a slope the art would lean the
      // dust and boost effects into. A fork's road is not floating — it is a
      // road — so it keeps the terrain's own shape and only rises off it.
      topY: kind === 'island' ? groundYAt(x + w / 2) - entry : 0,
      // How wide the hole in the lane is. Sized off the HERO, not off the
      // span, and small — about two of him. A hole is something you step into
      // or step over, and at a third of a jump's span it had stopped being
      // either: it read as a pit, it wanted a committed jump to clear, and
      // committing to a jump is the opposite of the shrug the low road is
      // meant to be. A fraction of the span was wrong twice over, since it
      // also grew with the stage's speed while the hero stayed the same size.
      mouthW: down ? mouthW : w,
      // A SECOND way in, partway along.
      //
      // With only the entrance to fall through, the choice was made once and
      // the rest of the tunnel was scenery — a hero who ran past the mouth
      // could see the place underneath him for the whole span and never get
      // to it. A hole in the middle of the lane is a second chance at it, and
      // it reads the way a gap always reads because it IS a gap: the same
      // obstacle, carved by the same renderers, telegraphed the same way.
      //
      // Never within a mouth-width of either end. Too near the entrance and
      // the two holes read as one ragged one; too near the exit and the hero
      // drops in with no tunnel left to run, which is a fall into a wall.
      // `holes` is a list because the shape of this wants to grow — two on a
      // long tunnel — and a list costs nothing extra to draw or to sweep.
      // Narrower than the entrance, and deliberately so. The entrance is the
      // one you have to make a decision about — it wants to be seen coming
      // and cleared on purpose. A hole in the middle of the span is a second
      // chance rather than a second decision, so it is a stride wide: you
      // step in if you fancy it, and if you did not notice it you were
      // already running fast enough to be over it.
      holes: down && w > mouthW * 8
        ? [{ x: x + w * (0.44 + ((d.holeAt ?? 0.5) - 0.5) * 0.3),
          w: d.holeW ? d.holeW * w : TUNNEL_HOLE_W }]
        : [],
      // Sky roads are drawn as cloud where they get high enough, and the
      // hero's own dust and landings go white up there with them.
      sky: !!d.sky,
      // A pad on the ground at the mouth, placed by spawnRouteEntries. Data
      // asks for one; where it goes is arithmetic, not authoring.
      spring: !!d.spring,
      prize: d.prize || 'coins',
      lowPrize: d.lowPrize || null,
    };
  };
  // "Routes never overlap" is load-bearing — routeAt returns the FIRST match
  // and updateRoute holds the hero until his x leaves the span — but it used
  // to be a hope rather than a rule. It cannot be checked in the data either:
  // `at` is a fraction of the stage and `dwell` is SECONDS, so a span's width
  // grows with the stage's base speed while its start does not, and a layout
  // that is comfortably spaced in world 1 can collide on UNPLUGGED. A twelve
  // second underground section makes that a real distance rather than a
  // rounding error, so the later road is dropped rather than left to produce
  // a hero standing on two floors.
  // A STAIRCASE: one island entry expanded into several, each a step higher
  // than the last.
  //
  // The point is that a slab you can reach in one hop is a slab you are barely
  // above — the lane is right there under your feet and being up on it does
  // not feel like anything. Height has to be CLIMBED, and the cap that keeps a
  // road reachable is a cap on each STEP rather than on where you end up,
  // because step three is a jump from step two and not from the ground. Three
  // steps of 27 puts the top at 83, which is past a double jump from the lane
  // and reached by three ordinary ones.
  //
  // Nothing is lost by missing a step. There is no fall damage anywhere in
  // this game, so a stack is a climb you may simply fail at, and the cost of
  // failing is the reward on top, which is the only thing it should be.
  const stairs = (d, i) => {
    const n = Math.max(1, d.steps ?? 1);
    const base = Math.min(d.rise ?? 30, MAX_ISLAND_RISE);
    if (n === 1) return [d];
    const step = Math.min(d.step ?? 27, MAX_ISLAND_RISE);
    // Treads GROW as the climb does. The bottom one is a foothold — a stride
    // and you are off it — and each one above is longer, so the run you
    // actually spend time on is the high one with the reward on it.
    //
    // Equal treads were the complaint: a low slab the length of a high one is
    // a long island running just above the lane, which is neither a platform
    // nor a road. Nobody wants to be down there; the low step exists to get
    // you off the ground, not to be somewhere.
    const weight = (k) => 0.7 + k * 0.45;
    const total = Array.from({ length: n }, (_, k) => weight(k)).reduce((a, b) => a + b, 0);
    const runs = Array.from({ length: n }, (_, k) => ((d.dwell ?? 0.7) * weight(k)) / total);
    const startOf = (k) => runs.slice(0, k).reduce((a, b) => a + b, 0);
    return Array.from({ length: n }, (_, k) => ({
      ...d,
      at: d.at + (startOf(k) * speed) / totalDist,
      // A share of the tread is the GAP you jump across, so the climb is two
      // problems at once — up and along — rather than a lift with landings.
      dwell: runs[k] * 0.7,
      rise: base + k * step,
      stacked: true,
      stack: `s${i}`,
      // The top of a climb is the one place a reward belongs. Everything below
      // it is on the way, and paying out on the way removes the reason to keep
      // going up.
      prize: k === n - 1 ? (d.topPrize ?? d.prize ?? 'coins') : (d.prize ?? 'coins'),
    }));
  };
  const laid = [];
  for (const r of [
    ...(cabinet.islands || []).flatMap(stairs).map(mk('island')),
    ...(cabinet.forks || []).map(mk('fork')),
    ...(cabinet.tunnels || []).map(mk('tunnel')),
  ].sort((a, b) => a.x - b.x)) {
    const prev = laid[laid.length - 1];
    // Steps of the same staircase are meant to be close — that gap is the
    // jump. Everything else owes the full clear lane between it and whatever
    // came before, so you land one road, take a breath, and read the next.
    const clear = prev && prev.stack && prev.stack === r.stack ? 0 : ROUTE_CLEAR * speed;
    if (prev && r.x < prev.x + prev.w + clear) continue;
    laid.push(r);
  }
  return laid;
}
