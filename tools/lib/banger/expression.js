// MAKE A BANGER — expression: which lead gets Auto Portamento. 4 Oct 2026.
//
// GO WILD in the Lab asks for it (`options.expression.autoPortamento`, options.js); this
// decides what that means for one take, AFTER the notes, the sounds, the lanes, the mix and
// the faders are known — it adds a setting to a finished mix and moves nothing else.
//
// WHAT IT WRITES is an ordinary lane setting, `mix.lanes[lane].noteFx.portamento`
// (src/engine/auto-portamento.js): merged into whatever Note FX the strip already has, played
// by the engine like any other lane's, and editable on the desk afterwards. There is no Lab-only
// playback path and nothing hidden: the generator only chooses where to start.
//
// WHICH LANE, in this order: the HOOK (the riff's tune, or the Written Lead that stands in for
// one), then the COUNTER-melody. Never drums, the bass, chords and pads, the piano, or an arp:
// a slide belongs on a single line of melody that holds its notes. A role earns a setting only
// if ALL of these are true, and a take that has no such role legitimately gets none — it is
// never forced:
//
//   - its lane is one a slide can sit on (`autoPortamentoLane`: not a chord lane, not a gesture
//     lane) and is not the bass, whatever role is playing on it;
//   - its SOUND takes a slide (`autoPortamentoSupport`): a sustained Tone lead or MRDR-3. A pluck,
//     a piano, TNGR-2, KNDO-5 and the rest answer no and are left exactly as they are — the sound
//     is never swapped to get one;
//   - the planner, asked with the very settings about to be written (`createLaneView` over the
//     finished bank, `plan(lane, settings)`), actually SELECTS a connection in the notes this take
//     plays. A lane can have connections that are eligible and still too weak to earn a slide at an
//     ordinary Amount, or have a budget that rounds to none at a light one: settings that would
//     select nothing are not written, because a switch that does nothing is not an effect.
//
// WHAT IS RANDOM is small: how much, and how long a slide. The first lane that is given a setting
// takes Amount 30–45 and Glide 35–50; the second, about a coin flip, a lighter Amount 15–25. Which
// CONNECTIONS slide is not drawn at all — the planner picks them from the melody, the same way
// every time. Each role has a stream of its own (`rng.stream(role)`, keyed by the role's name and
// never by a lane or a loop index) and draws the same number of values whether or not the role is
// given a setting, so a role's numbers never depend on how the other one went. The stream itself
// comes from the seed without drawing on it (src/engine/rng.js), so switching this on cannot move a
// note, a sound, a drum or a section.
//
// Browser-safe: no `node:*` imports.
import { createLaneView, autoPortamentoLane } from '../../../src/engine/lane-view.js';
import { autoPortamentoSettings, autoPortamentoSupport } from '../../../src/engine/auto-portamento.js';
import { VOICES, baseLane } from '../../../src/data/voices.js';
import { resolutionOf } from '../../../src/data/arrangements.js';

/** The roles that may take it, in priority order. */
export const EXPRESSION_ROLES = Object.freeze(['hook', 'counter']);

/** Every number the policy draws from, in one place: starting points for the ear. */
export const EXPRESSION_POLICY = Object.freeze({
  first: Object.freeze({ amount: Object.freeze([30, 35, 40, 45]), glide: Object.freeze([35, 40, 45, 50]) }),
  second: Object.freeze({ amount: Object.freeze([15, 20, 25]), glide: Object.freeze([35, 40, 45, 50]), chance: 0.5 }),
});

/** Values each role stream gives up, whatever happens: first Amount, second Amount, Glide, the coin. */
const DRAWS = 4;

const pick = (list, u) => list[Math.min(list.length - 1, Math.floor(u * list.length))];

/**
 * The sound a lane of a GENERATED mix plays, resolved the way the engine will: the song's own
 * copy of the preset (`voiceParams`) if it has one, else the library preset the lane names.
 * The generator's voices live on the mix until the engine merges them onto the bank, so this is
 * what lane-view's `voiceFor` stands in for. A preset the lane may not play (`lanes`) is no sound
 * at all, as `voiceOf` has it.
 */
export function voiceOfLane(mix, lane) {
  const key = `${lane}Voice`;
  const voice = mix?.voiceParams?.[key] || VOICES[mix?.voice?.[key]];
  if (!voice) return null;
  if (voice.lanes && !voice.lanes.includes(baseLane(lane))) return null;
  return voice;
}

/**
 * Decide, without touching anything. `laneOf` is the generator's role → lane Map (a plain object
 * does too), `bars` the song's length and `bpm` its tempo; `rng` is the `expression` stream.
 *
 * The roles are taken in priority order. A role whose lane and sound take a slide is offered the
 * settings it would be given — the main ones if no role has been given any yet, otherwise (on its
 * own coin) the lighter ones — and the planner is asked what THOSE settings select in the notes
 * this take plays. Only a role with at least one selected connection is given them. A role whose
 * settings select nothing goes without, and does not use up the main settings: the next role is
 * offered them instead.
 *
 * Returns `{ roles }`, one entry per role in EXPRESSION_ROLES, in priority order:
 *   { role, lane, sound, supported, eligible, reason, candidates, qualifying, chosen,
 *     set: { amount, glide } | null }
 *   eligible    the lane and the sound take a slide at all (and no slide was already set there)
 *   candidates  connections the planner found eligible in the notes, at any strength
 *   qualifying  of those, the ones strong enough to earn a slide at the settings offered
 *   chosen      what the planner selected at the settings offered — the role is given them if > 0
 * `reason` says why a role went without: `absent`, `bass`, `lane`, a sound's own reason
 * (`decays`, `engine`, `no-voice`, …), `already-set`, `second` (the coin said no),
 * `no-candidates` (nothing to slide), `weak` (connections, but none strong enough at that Amount)
 * or `unselected` (strong enough, but the Amount's budget chose none). The numbers are null where
 * the planner was never asked.
 */
export function planExpression({ bank, mix, laneOf, bpm, bars, rng }) {
  const laneFor = (role) => (laneOf instanceof Map ? laneOf.get(role) : laneOf?.[role]) ?? null;
  const secondsPerBeat = 60 / bpm;
  const { first: A, second: B } = EXPRESSION_POLICY;
  let view = null;
  // A copy of the bank, so the bar plan the engine would cache against the real one is never
  // built against it: the view reads the music and nothing else.
  const viewOf = () => view || (view = createLaneView({
    bank: { ...bank }, mix, resolution: resolutionOf(bank), formSteps: bars * 16,
    voiceFor: (_, lane) => voiceOfLane(mix, lane),
  }));

  const roles = [];
  let given = 0;
  for (const role of EXPRESSION_ROLES) {
    // Drawn first and always, whether or not the role is given a setting: its numbers are its own.
    const stream = rng.stream(role);
    const draws = Array.from({ length: DRAWS }, () => stream.next());
    const lane = laneFor(role);
    const entry = {
      role, lane, sound: null, supported: false, eligible: false, reason: null,
      candidates: null, qualifying: null, chosen: null, set: null,
    };
    roles.push(entry);
    if (!lane || !mix?.lanes?.[lane]) { entry.reason = 'absent'; continue; }
    if (baseLane(lane) === 'bass') { entry.reason = 'bass'; continue; }
    if (!autoPortamentoLane(lane)) { entry.reason = 'lane'; continue; }
    const voice = voiceOfLane(mix, lane);
    entry.sound = voice?.id || mix.voice?.[`${lane}Voice`] || (voice ? 'copy' : null);
    const support = autoPortamentoSupport(voice);
    entry.supported = support.supported;
    if (!support.supported) { entry.reason = support.reason; continue; }
    // A riff part that already came with its own slide setting is somebody's choice: left alone.
    if (mix.lanes[lane].noteFx?.portamento?.enabled === true) { entry.reason = 'already-set'; continue; }
    entry.eligible = true;

    const main = given === 0;
    if (!main && !(draws[3] < B.chance)) { entry.reason = 'second'; continue; }
    const set = main
      ? { amount: pick(A.amount, draws[0]), glide: pick(A.glide, draws[2]) }
      : { amount: pick(B.amount, draws[1]), glide: pick(B.glide, draws[2]) };
    // Asked with the settings about to be written, not a wider offer: what plays is what is planned.
    const planned = viewOf().plan(lane, autoPortamentoSettings({ enabled: true, ...set }), { secondsPerBeat });
    entry.candidates = planned.candidates.filter((c) => c.eligible).length;
    entry.qualifying = planned.qualifying;
    entry.chosen = planned.transitions.length;
    if (!entry.chosen) {
      entry.reason = !entry.candidates ? 'no-candidates' : !entry.qualifying ? 'weak' : 'unselected';
      continue;
    }
    entry.set = set;
    given++;
  }
  return { roles };
}

/**
 * Decide, and write it: each chosen role's lane gets `noteFx.portamento`, merged into the Note FX
 * it already has (an arp or a strum stays as it was). Returns the plan, with `applied` — the roles
 * that were given a setting. `mix` is changed in place; nothing else is.
 */
export function applyExpression(args) {
  const plan = planExpression(args);
  const applied = [];
  for (const r of plan.roles) {
    if (!r.set) continue;
    const strip = args.mix.lanes[r.lane];
    strip.noteFx = { ...(strip.noteFx || {}), portamento: autoPortamentoSettings({ enabled: true, ...r.set }) };
    applied.push(r);
  }
  return { ...plan, applied };
}
