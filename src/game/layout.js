// The stage-layout contract: what a stage IS, resolved in one place.
//
// Three callers, none of which may drift from the others: RunState.enter()
// building a real run, the level editor drawing and editing the same stage,
// and the test suites holding both to the recording in
// tests/fixtures/layout-baseline.json. Before this module, the answers to
// "how long is this stage, how fast, where are its checkpoints, where are its
// pits" were scattered through run.js as literals — fine while run.js was the
// only reader, fatal the moment a second surface (the editor) has to agree
// with it. So the pure pacing arithmetic and the resolution of a stage's
// layout live here, DOM-free, and run.js imports them back.
//
// The fallback chain is the whole design: an edited stage reads from
// STAGE_LAYOUTS (src/data/stage-layouts.js, the editor's generated output), an
// un-edited one falls through to the legacy fields on the stage object
// (stages.js), and both land on the same defaults run.js always used. A stage
// nobody has touched must resolve to bit-for-bit today's behaviour — that is
// what tests/layout-parity.js holds this module to.
import { STAGE_LAYOUTS } from '../data/stage-layouts.js';
import { LOOP } from './loop.js';

// ---- pacing constants (moved from run.js; the tunables manifest points here) --
// The lane's cruising speed before any bonus, ramp or hero multiplier.
export const BASE_SPEED = 160;
// The run accelerates on a square root, so the early seconds gain quickly and
// the late ones barely move — a stage feels like it is building without ever
// outrunning the reaction runway the spawner guarantees. The cap is what the
// ramp is allowed to reach; overtime raises both (run.js owns that variant).
export const SPEED_RAMP_K = 0.03;
export const SPEED_RAMP_CAP = 1.6;
// The clear lane in front of the finish marker: how much empty ground the
// spawner has to leave before the flagpole. An obstacle parked against the
// pole is a hazard wearing the goal as camouflage. 160 is a little over one
// screen-second at cruising speed — enough that the last thing to leave the
// frame before the pole arrives is ground.
export const FINISH_CLEAR = 160;
// How often a plumber stage is guarded at all. Under half on purpose: the dog
// has to be a thing that MIGHT be there, so the sign is worth reading and the
// empty straights stay a relief rather than a formality.
export const FINISH_DOG_CHANCE = 0.45;

// The 5% slack between the distance the clock pays for and the distance the
// stage actually is — the only allowance between "on pace" and "out of time".
const DIST_SLACK = 1.05;

// Where the restore points sit when a layout does not say otherwise: one in
// each third, so no death replays more than a third of the stage.
export const DEFAULT_CHECKPOINTS = [1 / 3, 2 / 3];

// The capsule/battery re-arm windows the drip uses when no section speaks —
// the same numbers DripSpawner shipped with, imported by it so a layout that
// says nothing and a build that predates layouts are the same machine.
export const DEFAULT_DRIP = { capsule: [12, 18], battery: [20, 30] };

// A DISPLAY MIRROR of rollPowerPickup's ladder (src/game/powerups.js), for the
// editor's sliders only. The ladder itself stays authoritative for the default
// path — it consumes its rng draws in a shape a weight table cannot reproduce,
// and replacing it would silently move the 'drip' stream of every un-edited
// stage. A section that declares weights routes through weightedPowerPickup
// instead; a section that does not never touches this object.
export const DEFAULT_POWER_WEIGHTS = {
  capUnpeel: 10, capRewind: 10,
  capAirJump: 10, capSpeed: 10, capLowGrav: 10,
  capShield: 25, capMagnet: 25,
};

// ---- pacing arithmetic ------------------------------------------------------

// The stage's own base speed: cabinet bonus and stage multiplier, nothing
// else. run.js layers corruption and the assist setting on top of this; the
// editor forecasts from exactly this.
export function stageBaseSpeed(cabinet, speedMult = 1) {
  return BASE_SPEED * (1 + (cabinet.speedBonus || 0)) * speedMult;
}

// The in-run ramp at t seconds — the campaign flavour (overtime's steeper
// variant lives in run.js beside the mode that owns it).
export function rampAt(t) {
  return Math.min(SPEED_RAMP_CAP, 1 + SPEED_RAMP_K * Math.sqrt(Math.max(0, t)));
}

// Total stage distance for a base speed and a duration. The exact expression
// run.js has always used, in the same order.
export function totalDistFor(baseSpeed, durationSec) {
  return durationSec * baseSpeed * DIST_SLACK;
}

// The forecast twin of RunState.speedAt: how fast the lane will be moving
// `frac` of the way through, off the clock instead of off the run.
// Approximate the same way and for the same reason — see run.js's speedAt.
export function speedAtFrac(baseSpeed, durationSec, frac) {
  return baseSpeed * rampAt(Math.max(0, frac) * (durationSec || 60));
}

// ---- pattern identity -------------------------------------------------------

// A stable signature for one pattern in a cabinet's bank, so a layout can name
// patterns without depending on array order. Reordering the bank keeps every
// key; EDITING a pattern changes its key, which is the honest outcome — an
// exclusion written against the old shape should surface as stale in the
// editor rather than silently match something else.
export function patternKey(pat) {
  const cells = (pat.cells || []).map((c) => {
    if (c.t === 'coins') return `coins.${c.shape || 'arc'}@${c.dx}`;
    let k = `${c.t}@${c.dx}`;
    if (c.n > 1) k += `x${c.n}`;
    if (c.w != null) k += `~${c.w}`;
    if (c.y != null) k += `^${c.y}`;
    return k;
  });
  return `${pat.tier}:${cells.join('+')}`;
}

// ---- sections ---------------------------------------------------------------

// Sections partition the stage's timeline; each curates the bag the spawner
// deals from over its span. `null` (no sections declared) is meaningfully
// different from one full-width section: null is the contract that the
// spawner's default path runs untouched, and the parity suite leans on it.
function normalizeSections(sections) {
  if (!sections || !sections.length) return null;
  const out = [];
  let from = 0;
  for (const s of sections) {
    const to = Math.min(1, Math.max(from, s.to ?? 1));
    out.push({
      from,
      to,
      label: s.label || null,
      density: s.density ?? 1,
      tierCap: s.tierCap ?? null,
      exclude: s.exclude && s.exclude.length ? new Set(s.exclude) : null,
      excludePatterns: s.excludePatterns && s.excludePatterns.length ? new Set(s.excludePatterns) : null,
      drip: {
        capsule: s.drip?.capsule ?? null,
        battery: s.drip?.battery ?? null,
        weights: s.drip?.weights ?? null,
      },
    });
    from = to;
  }
  // The last span runs to the tape whatever its author typed.
  out[out.length - 1].to = 1;
  return out;
}

// Which section governs a point `frac` of the way through the stage.
export function sectionAt(sections, frac) {
  if (!sections) return null;
  const f = Math.min(0.9999, Math.max(0, frac));
  for (const s of sections) if (f < s.to) return s;
  return sections[sections.length - 1];
}

// ---- the resolver -----------------------------------------------------------

// The finish dog's odds for one stage, before a layout has an opinion. Kept
// out of resolveLayout only because the fallback has three cases and reads
// better named than nested.
function finishDogChanceFor(l, stage, cabinet) {
  if (l.finishDog === false) return 0;
  if (l.finishDog === true) return 1;
  if (typeof l.finishDog === 'number') return l.finishDog;
  if (cabinet.id !== 'plumber') return 0;
  return stage.id === 'plumber-1' ? 1 : FINISH_DOG_CHANCE;
}

/**
 * Resolve everything layout-shaped about one stage: layout entry first, legacy
 * stage field second, global default last. Returns null for the runs that have
 * no stage to lay out (overtime, bosses) — callers keep their own behaviour.
 *
 * Positions stay AUTHORED (fractions of the stage) rather than resolved to
 * world px: the world length depends on run-only inputs (the assist speed
 * setting, corruptions), so run.js converts, and the editor converts with its
 * own forecast base — both from the same fractions.
 */
export function resolveLayout(stage, cabinet, entry = undefined) {
  if (!stage) return null;
  // `entry` is the level editor resolving its own unsaved working copy: it
  // holds an edited layout that is not in the imported module yet, and it has
  // to be able to ask this function — the one the run asks — what that edit
  // means. Everyone else omits it and gets the shipped file.
  const l = entry ?? STAGE_LAYOUTS[stage.id] ?? {};
  return {
    durationSec: l.durationSec ?? stage.durationSec,
    speedMult: l.speedMult ?? stage.speedMult ?? 1,
    checkpoints: l.checkpoints ?? DEFAULT_CHECKPOINTS,
    // A CHANCE, with 0 and 1 as the two certainties: `false` is an authored
    // "never", `true` an authored "always", a number the odds. Absence falls
    // back to what the plumber cabinet has always done — plumber-1 guaranteed
    // because that is where the dog and its sign are taught, every stage after
    // it rolled, so the sign keeps meaning something, and nothing outside the
    // cabinet guarded at all (see run.js's finishDogPlanned).
    //
    // 1 is not "roll and always win": the run short-circuits on it and spends
    // no draw, which is what plumber-1 does today.
    finishDogChance: finishDogChanceFor(l, stage, cabinet),
    appliance: l.appliance ?? { at: stage.applianceAt, high: stage.applianceHigh },
    // `null` is an authored "none" for both of these; only absence falls back.
    rewindAt: l.rewindAt !== undefined ? l.rewindAt : (stage.rewindAt ?? null),
    pits: l.pits !== undefined ? l.pits : (stage.pits || null),
    // Route override: a stage that declares routes stops inheriting the
    // cabinet's. Omitted = the cabinet's arrays keep flowing, so a hand edit
    // to cabinets.js still reaches every un-forked stage.
    routes: l.routes ?? null,
    // The loop-de-loop, resolved the way the two other pinned rewards are: a
    // number places it, `null` is an authored "no ring on this stage", and
    // absence takes the cabinet's own answer. Only the boost cabinets have one
    // to place, and where they do it stands at LOOP.at unless a stage moved it
    // — which is why loop.js still owns that number and this only spends it.
    loopAt: cabinet?.mechanic === 'boost' ? (l.loopAt !== undefined ? l.loopAt : LOOP.at) : null,
    sections: normalizeSections(l.sections),
  };
}

// ---- editor metadata --------------------------------------------------------

// The pinned-event vocabulary, enumerated for the editor's lanes. Runtime-owned
// so a future set piece added to the resolver surfaces in the editor by being
// added HERE, next to the code that honours it, not in the editor bundle.
export const PINNED_EVENTS = [
  { id: 'pit', label: 'PIT', lane: 'hazards' },
  { id: 'crossing', label: 'SPIKE CROSSING', lane: 'hazards' },
  { id: 'appliance', label: 'GOLDEN TOASTER', lane: 'rewards' },
  { id: 'rewind', label: 'REWIND CAPSULE', lane: 'rewards' },
  { id: 'loop', label: 'LOOP-DE-LOOP', lane: 'setpieces' },
  { id: 'finishDog', label: 'FINISH DOG', lane: 'setpieces' },
  { id: 'checkpoint', label: 'CHECKPOINT', lane: 'checkpoints' },
];
