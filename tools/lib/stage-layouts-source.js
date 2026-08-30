// src/data/stage-layouts.js as source — the writer, the snapshot, the checks.
//
// Shared by the level editor's server (tools/level-editor.js), the migration
// tool (tools/migrate-stage-layouts.js) and tests/stage-layouts.js, so the
// file the editor saves and the file the tests hold up are formatted and
// judged by exactly one piece of code.
//
// Two emit rules, one per kind of field, and the split is deliberate:
//
// OWNED fields — durationSec, speedMult, appliance, pits, rewindAt — are
// written for EVERY stage, always, even when they equal what stages.js says.
// These are the fields the layout file exists to take over: the migration
// froze them out of stages.js, and from then on this file is where they live.
// Dropping one "because it matches the legacy field" would make deleting the
// legacy field a behaviour change, which is exactly the trap the migration is
// walking the repo out of.
//
// OPTIONAL fields — checkpoints, finishDog, sections, routes — follow the
// mix-source.js rule: a value equal to its GLOBAL default is left out, and
// what is left is what somebody meant.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync, unlinkSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CHECKPOINTS, FINISH_DOG_CHANCE, patternKey } from '../../src/game/layout.js';

const REL = 'src/data/stage-layouts.js';
const HISTORY_DIR = 'work/level-history';
const HISTORY_CAP = 300;

// 6 decimals: fine enough that a rounded fraction of the longest stage moves
// the world under a hundredth of a pixel, coarse enough that no float noise
// (0.55 + 0.2 = 0.7500000000000001) ever reaches the diff.
const round6 = (v) => Math.round(v * 1e6) / 1e6;
const fmtNum = (v) => String(round6(v));
const fmtKeyName = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));

const near = (a, b) => Math.abs(a - b) < 1e-9;
const sameFracs = (a, b) => Array.isArray(a) && Array.isArray(b)
  && a.length === b.length && a.every((v, i) => near(v, b[i]));

// ---- per-piece formatters ---------------------------------------------------

function pitSource(p) {
  return p.jumps
    ? `{ at: ${fmtNum(p.at)}, jumps: ${p.jumps} }`
    : `{ at: ${fmtNum(p.at)}, w: ${fmtNum(p.w)} }`;
}

// A route's authored shape is cabinets.js's vocabulary — pass numbers and
// strings through as written, because buildRoutes is the judge of what they
// mean and this writer must not have opinions of its own about road anatomy.
function plainSource(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.map(plainSource).join(', ')}]`;
  if (typeof v === 'object') {
    const bits = Object.entries(v)
      .filter(([, x]) => x !== undefined)
      .map(([k, x]) => `${fmtKeyName(k)}: ${plainSource(x)}`);
    return `{ ${bits.join(', ')} }`;
  }
  if (typeof v === 'number') return fmtNum(v);
  return JSON.stringify(v);
}

function dripSource(d) {
  if (!d) return null;
  const bits = [];
  if (d.capsule) bits.push(`capsule: [${fmtNum(d.capsule[0])}, ${fmtNum(d.capsule[1])}]`);
  if (d.battery) bits.push(`battery: [${fmtNum(d.battery[0])}, ${fmtNum(d.battery[1])}]`);
  if (d.weights && Object.keys(d.weights).length) {
    const w = Object.entries(d.weights).map(([k, v]) => `${fmtKeyName(k)}: ${fmtNum(v)}`);
    bits.push(`weights: { ${w.join(', ')} }`);
  }
  return bits.length ? `{ ${bits.join(', ')} }` : null;
}

function sectionSource(s, indent) {
  const bits = [`to: ${fmtNum(s.to)}`];
  if (s.label) bits.push(`label: ${JSON.stringify(s.label)}`);
  if (s.density != null && !near(s.density, 1)) bits.push(`density: ${fmtNum(s.density)}`);
  if (s.tierCap != null) bits.push(`tierCap: ${s.tierCap}`);
  if (s.exclude?.length) bits.push(`exclude: ${JSON.stringify([...s.exclude])}`);
  if (s.excludePatterns?.length) bits.push(`excludePatterns: ${JSON.stringify([...s.excludePatterns])}`);
  const drip = dripSource(s.drip);
  if (drip) bits.push(`drip: ${drip}`);
  return `${indent}{ ${bits.join(', ')} },\n`;
}

/** One stage's layout entry as source lines (always non-empty: see OWNED above). */
export function layoutEntrySource(entry, cabinetId, indent = '  ') {
  const i2 = `${indent}  `;
  let body = '';
  body += `${i2}durationSec: ${fmtNum(entry.durationSec)},\n`;
  body += `${i2}speedMult: ${fmtNum(entry.speedMult ?? 1)},\n`;
  const app = entry.appliance;
  body += `${i2}appliance: { at: ${fmtNum(app.at)}, high: ${!!app.high} },\n`;
  const pits = entry.pits && entry.pits.length ? entry.pits : null;
  body += `${i2}pits: ${pits ? `[${pits.map(pitSource).join(', ')}]` : 'null'},\n`;
  body += `${i2}rewindAt: ${entry.rewindAt == null ? 'null' : fmtNum(entry.rewindAt)},\n`;

  if (entry.checkpoints && !sameFracs(entry.checkpoints, DEFAULT_CHECKPOINTS)) {
    body += `${i2}checkpoints: [${entry.checkpoints.map(fmtNum).join(', ')}],\n`;
  }
  const dogDefault = cabinetId === 'plumber' ? FINISH_DOG_CHANCE : 0;
  if (entry.finishDog !== undefined) {
    const v = entry.finishDog === false ? 0 : entry.finishDog;
    if (!near(v, dogDefault)) body += `${i2}finishDog: ${v === 0 ? 'false' : fmtNum(v)},\n`;
  }
  if (entry.routes) {
    const kinds = ['islands', 'forks', 'tunnels'].filter((k) => entry.routes[k]?.length);
    const empty = ['islands', 'forks', 'tunnels'].every((k) => !entry.routes[k]?.length);
    // An empty override is still an override: it says "no roads on this
    // stage", which is not the same as inheriting the cabinet's.
    if (kinds.length || empty) {
      const bits = kinds.map((k) => `${k}: ${plainSource(entry.routes[k])}`);
      body += `${i2}routes: { ${bits.join(', ')} },\n`;
    }
  }
  if (entry.sections?.length) {
    body += `${i2}sections: [\n`;
    for (const s of entry.sections) body += sectionSource(s, `${i2}  `);
    body += `${i2}],\n`;
  }
  return `${indent}${JSON.stringify(entry.id)}: {\n${body}${indent}},\n`;
}

/** The whole file. `layouts` is an array of entries carrying {id, cabinet, ...}. */
export function renderStageLayouts(layouts) {
  let body = '';
  for (const entry of layouts) body += layoutEntrySource(entry, entry.cabinet);
  return `// GENERATED by tools/level-editor.js. Do not edit by hand.
//
// Per-stage LAYOUT: pacing, pinned events, sections. This file is the level
// editor's output and the run's source of truth for everything about a stage
// that is not its identity — durations, speeds, checkpoints, scripted pits,
// the appliance, the rewind capsule, route overrides, and the sectioned
// curation of the random bag. Missions, challenges and dialog stay
// hand-authored in src/data/stages.js.
//
// durationSec / speedMult / appliance / pits / rewindAt appear on every stage:
// this file owns them outright (they were migrated OUT of stages.js). The
// optional fields — checkpoints, finishDog, routes, sections — appear only
// where somebody decided something; absence means the default, and the
// resolver (src/game/layout.js) says what that is.
export const STAGE_LAYOUTS = {
${body}};
`;
}

// ---- disk -------------------------------------------------------------------

/**
 * Write the file if it changed. Atomic (tmp + rename) so a crashed save never
 * leaves half a module where the game's import expects a whole one; no-op on
 * identical bytes so the watch build is not retriggered by a save that saved
 * nothing. Returns true when the file actually moved.
 */
export function writeStageLayouts(root, layouts) {
  const out = join(root, REL);
  const next = renderStageLayouts(layouts);
  if (existsSync(out) && readFileSync(out, 'utf8') === next) return false;
  const tmp = `${out}.tmp`;
  writeFileSync(tmp, next);
  renameSync(tmp, out);
  return true;
}

/**
 * Copy the current file into work/level-history/ before it is overwritten.
 * Same contract as the mixer's mix-history: the drawer is disposable, capped,
 * and the newest save of all is always still the file in src/.
 */
export function snapshotStageLayouts(root) {
  const src = join(root, REL);
  if (!existsSync(src)) return null;
  const dir = join(root, HISTORY_DIR);
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = join(dir, `stage-layouts-${stamp}.js`);
  copyFileSync(src, dest);
  const all = readdirSync(dir).filter((f) => f.startsWith('stage-layouts-')).sort();
  for (const f of all.slice(0, Math.max(0, all.length - HISTORY_CAP))) unlinkSync(join(dir, f));
  return dest;
}

// ---- validation -------------------------------------------------------------

const isFrac = (v) => typeof v === 'number' && v > 0 && v < 1;

/**
 * Everything wrong with a set of layout entries, as sentences, split into
 * errors (the save is refused) and warnings (the save lands, the editor shows
 * them). Checked when the editor saves rather than when the game boots: a
 * layout that cannot work should fail in front of the person writing it.
 *
 * `reg` carries the registries so this file never imports the game's data
 * directly: { STAGE_BY_ID, CABINET_BY_ID, OBSTACLES, PICKUPS }.
 */
export function validateLayouts(layouts, reg) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const capsuleIds = new Set(Object.entries(reg.PICKUPS)
    .filter(([, def]) => def.power || def.relayCharge).map(([id]) => id));

  for (const entry of layouts) {
    const at = `${entry.id}`;
    const stage = reg.STAGE_BY_ID[entry.id];
    if (!stage) { errors.push(`${at}: not a stage id`); continue; }
    if (seen.has(entry.id)) { errors.push(`${at}: listed twice`); continue; }
    seen.add(entry.id);
    if (entry.cabinet !== stage.cabinet) errors.push(`${at}: cabinet says ${entry.cabinet}, the stage is ${stage.cabinet}'s`);
    const cab = reg.CABINET_BY_ID[stage.cabinet];

    if (!(entry.durationSec > 0 && entry.durationSec <= 600)) errors.push(`${at}: durationSec ${entry.durationSec} is not a stage length`);
    if (!(entry.speedMult > 0 && entry.speedMult <= 3)) errors.push(`${at}: speedMult ${entry.speedMult} is out of range (0, 3]`);
    if (!entry.appliance || !isFrac(entry.appliance.at)) errors.push(`${at}: appliance.at must be a fraction of the stage`);
    if (entry.rewindAt != null && !isFrac(entry.rewindAt)) errors.push(`${at}: rewindAt must be a fraction or null`);
    for (const p of entry.pits || []) {
      if (!isFrac(p.at)) errors.push(`${at}: pit at ${p.at} is not a fraction of the stage`);
      if (p.jumps != null) {
        if (!(Number.isInteger(p.jumps) && p.jumps >= 2 && p.jumps <= 8)) errors.push(`${at}: a ${p.jumps}-jump crossing is not a crossing (2-8)`);
      } else if (!(p.w >= 24 && p.w <= 200)) {
        errors.push(`${at}: pit width ${p.w} is out of range [24, 200]`);
      }
    }
    if (entry.checkpoints) {
      let prev = 0;
      for (const c of entry.checkpoints) {
        if (!isFrac(c)) errors.push(`${at}: checkpoint at ${c} is not a fraction of the stage`);
        else if (c <= prev) errors.push(`${at}: checkpoints must be ascending (${c} after ${prev})`);
        prev = c;
      }
    }
    if (entry.finishDog !== undefined && entry.finishDog !== false
      && !(entry.finishDog >= 0 && entry.finishDog <= 1)) {
      errors.push(`${at}: finishDog ${entry.finishDog} is not a chance (0-1 or false)`);
    }

    // Sections: consecutive spans ending at 1; every named thing must exist.
    const patKeys = cab ? new Set(cab.patterns.map(patternKey)) : new Set();
    let from = 0;
    for (const [i, s] of (entry.sections || []).entries()) {
      const sAt = `${at} section ${i + 1}`;
      if (!(s.to > from && s.to <= 1)) errors.push(`${sAt}: to=${s.to} does not advance the timeline (after ${round6(from)})`);
      from = s.to ?? from;
      if (s.density != null && !(s.density > 0 && s.density <= 5)) errors.push(`${sAt}: density ${s.density} is out of range (0, 5]`);
      if (s.tierCap != null && ![0, 1, 2].includes(s.tierCap)) errors.push(`${sAt}: tierCap ${s.tierCap} is not a tier (0-2)`);
      for (const t of s.exclude || []) {
        if (!reg.OBSTACLES[t]) errors.push(`${sAt}: excluded obstacle "${t}" is not in the registry`);
      }
      for (const k of s.excludePatterns || []) {
        // Stale, not fatal: the bank was edited out from under the exclusion.
        // The spawner ignores a key that matches nothing, so the stage still
        // plays — but the person who wrote it should hear about it.
        if (!patKeys.has(k)) warnings.push(`${sAt}: excludePatterns key "${k}" matches nothing in ${stage.cabinet}'s bank (stale?)`);
      }
      const d = s.drip || {};
      for (const key of ['capsule', 'battery']) {
        const r = d[key];
        if (r != null && !(Array.isArray(r) && r.length === 2 && r[0] > 0 && r[1] >= r[0] && r[1] <= 300)) {
          errors.push(`${sAt}: drip.${key} must be [lo, hi] seconds`);
        }
      }
      if (d.weights) {
        let sum = 0;
        for (const [k, v] of Object.entries(d.weights)) {
          if (!capsuleIds.has(k)) errors.push(`${sAt}: weight for "${k}", which is not a capsule pickup`);
          if (!(v >= 0)) errors.push(`${sAt}: weight ${k}: ${v} is negative`);
          sum += Math.max(0, v);
        }
        if (!(sum > 0)) errors.push(`${sAt}: capsule weights sum to nothing — the drip would have nothing to deal`);
      }
    }
    if (entry.sections?.length && !near(entry.sections[entry.sections.length - 1].to, 1)) {
      errors.push(`${at}: the last section ends at ${entry.sections[entry.sections.length - 1].to}, not 1`);
    }

    // Routes: light shape checks only — buildRoutes is the geometry judge and
    // the editor runs it live for the real verdict.
    for (const kind of ['islands', 'forks', 'tunnels']) {
      for (const r of entry.routes?.[kind] || []) {
        if (!isFrac(r.at)) errors.push(`${at}: ${kind} road at ${r.at} is not a fraction of the stage`);
        if (!(r.dwell > 0 && r.dwell <= 30)) errors.push(`${at}: ${kind} road dwell ${r.dwell} is not a length in seconds`);
      }
    }
  }
  return { errors, warnings };
}
