// THE LEVEL EDITOR, in the browser.
//
// What a level contains, laid out on a timeline you can drag: the sections
// that curate its random bag, the set pieces pinned into it, its checkpoints,
// its clock and its speed. Saving writes src/data/stage-layouts.js, which the
// next build reads as the truth about every stage.
//
// It imports the GAME's own modules — the cabinets, the stages, the obstacle
// and pickup registries, the real Spawner, the real buildRoutes — and never a
// copy of any of them. That is the whole design: a palette built from
// OBSTACLES gains a new obstacle the day somebody adds one, a forecast run
// through the real Spawner is the deal the game will make, and a validator
// importing pitClearance is checking the number the run actually enforces.
// Nothing here is allowed to restate a rule that lives in src/.
import { CABINETS, CABINET_BY_ID } from '../src/data/cabinets.js';
import { STAGES, STAGE_BY_ID } from '../src/data/stages.js';
import { STAGE_LAYOUTS } from '../src/data/stage-layouts.js';
import { OBSTACLES, PICKUPS } from '../src/game/entities.js';
import { POWER_DEFS } from '../src/game/powerups.js';
import { Spawner, DripSpawner, REACT_FLOOR, REACT_FLOOR_MAX, pitClearance } from '../src/game/spawner.js';
import { buildRoutes, crossingLayout } from '../src/game/routes.js';
import { LOOP } from '../src/game/loop.js';
import { Rng } from '../src/engine/rng.js';
import {
  resolveLayout, patternKey, sectionAt, stageBaseSpeed, totalDistFor, speedAtFrac,
  DEFAULT_DRIP, DEFAULT_POWER_WEIGHTS, FINISH_CLEAR,
} from '../src/game/layout.js';

// Where PLAY sends the browser — the game's own dev server, substituted at
// bundle time by tools/level-editor.js.
const GAME_URL = typeof __GAME_URL__ === 'string' ? __GAME_URL__ : 'http://localhost:8001';

// The ground line the run draws roads against. Imported as a number rather
// than from engine/camera.js because that module reaches for the DOM, and this
// page only needs it to shape a schematic ribbon.
const GROUND_Y = 232;

// ---------------------------------------------------------------- state ----

// One working copy of every stage's layout, deep-cloned so an edit is a draft
// until SAVE. Every stage is materialised — the file already carries all 27,
// and an editor that showed some stages as "absent" would be describing its
// own storage rather than the game.
const state = {
  layouts: JSON.parse(JSON.stringify(STAGE_LAYOUTS)),
  stageId: STAGES[0].id,
  seed: 1234,
  sel: null,          // {kind:'section'|'pit'|'checkpoint'|'appliance'|'rewind', i}
  dirty: false,
  message: null,      // {kind:'warn'|'err', lines:[]}
  openCabs: new Set([STAGES[0].cabinet]),
};

const stage = () => STAGE_BY_ID[state.stageId];
const cabinet = () => CABINET_BY_ID[stage().cabinet];
const entry = () => state.layouts[state.stageId];
// The working copy, through the same resolver the run uses.
const resolved = () => resolveLayout(stage(), cabinet(), entry());

// A rhythm stage's lane comes from a beat chart, not from the bag (see
// RunState's beatLock). Its pacing and pins are still ours; its obstacle
// forecast is not, and the page says so rather than drawing a fiction.
const isBeatCharted = (s) => /^rhythm-[123]$/.test(s.id) && CABINET_BY_ID[s.cabinet].mechanic === 'beat';

const markDirty = () => { state.dirty = true; };
const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;

// --------------------------------------------------------- derived model ----

// Everything the lanes need about the selected stage, computed the way the run
// computes it: base speed off the cabinet and the stage's own multiplier,
// distance off the clock, set-piece geometry off the speed the hero will
// actually be doing when he arrives.
function model() {
  const st = stage();
  const cab = cabinet();
  const L = resolved();
  const base = stageBaseSpeed(cab, L.speedMult);
  const totalDist = totalDistFor(base, L.durationSec);
  const speedAt = (frac) => speedAtFrac(base, L.durationSec, frac);

  const crossings = [];
  const pits = (L.pits || []).map((p, i) => {
    const x = p.at * totalDist;
    if (!p.jumps) return { ...p, i, x, w: p.w, crossing: null };
    const c = crossingLayout(x, p.jumps, speedAt(p.at));
    crossings.push(c);
    return { ...p, i, x, w: c.w, crossing: c };
  });

  let routes = [];
  let routeError = null;
  try {
    routes = buildRoutes(L.routes ? { ...cab, ...L.routes } : cab, {
      totalDist,
      speed: base,
      groundYAt: () => GROUND_Y,
      crossings,
    });
  } catch (err) {
    routeError = err.message;
  }

  const loopAt = (cab.mechanic === 'boost') ? LOOP.at : null;

  return { st, cab, L, base, totalDist, speedAt, pits, routes, routeError, loopAt };
}

// ------------------------------------------------------------- forecast ----

// ONE CONCRETE DEAL, from the real Spawner on a chosen seed.
//
// The streams are taken exactly as RunState.enter takes them — `spawn` and
// `drip` off the run seed — and the spawner is built with the same tierMax
// formula, so the SEQUENCE this produces is the sequence the game produces.
// Positions drift a little: the live lane carries a hero's speed multiplier,
// boosts, and whatever the player does, none of which a forecast can know.
// The lane label says so, because a preview that quietly lies about where
// things land is worse than no preview.
function forecast(m, seed) {
  if (isBeatCharted(m.st)) return null;
  const rng = new Rng(seed >>> 0);
  const react = REACT_FLOOR;
  const spawner = new Spawner({
    cabinet: m.cab,
    rng: rng.stream('spawn'),
    tierMax: Math.min(2, (m.st.index - 1) + (m.cab.act - 1)),
    react,
    iceSlide: m.cab.mechanic === 'ice' ? 14 : 0,
    sections: m.L.sections || null,
    totalDist: m.totalDist,
  });
  spawner.nextX = 300;
  const drip = new DripSpawner(rng.stream('drip'), {}, {
    sections: m.L.sections || null,
    totalDist: m.totalDist,
  });

  const obstacles = [], pickups = [];
  const stopX = m.totalDist - FINISH_CLEAR;
  let clock = 0;
  for (let x = 0; x < m.totalDist; x += 480) {
    const sp = m.speedAt(x / m.totalDist);
    spawner.fill(x, sp, obstacles, pickups, () => 45, stopX);
    drip.update(480 / sp, x, pickups, false, false, stopX, true, null);
    clock += 480 / sp;
  }
  return { obstacles, pickups, seconds: clock };
}

// ------------------------------------------------------------ registries ----

// The palette, derived from the registry's own flags. No list of obstacle
// names lives in this file, and none may: a new entry in OBSTACLES has to turn
// up here by itself or the editor starts describing a game that has moved on.
function classify(type) {
  const def = OBSTACLES[type];
  if (!def) return 'other';
  if (def.isGap) return 'pits';
  if (def.isSpring) return 'springs';
  if (def.isBoost || def.isLoop || def.isSwitch) return 'pads';
  if (def.animal) return 'animals';
  if (def.sign) return 'signs';
  if (def.shoots || def.falls) return 'threats';
  if (!def.ground) return 'flyers';
  if (def.vx) return 'movers';
  if (def.breakable) return 'breakables';
  return 'standing';
}

const GROUP_ORDER = ['animals', 'pits', 'standing', 'breakables', 'movers', 'flyers', 'threats', 'springs', 'pads', 'signs', 'other'];
const GROUP_LABEL = {
  animals: 'DOGS & CATS', pits: 'PITS', standing: 'STANDING HAZARDS',
  breakables: 'BREAKABLES', movers: 'MOVING', flyers: 'AIRBORNE',
  threats: 'SHOOTERS & FALLERS', springs: 'SPRINGS', pads: 'PADS',
  signs: 'SIGNS', other: 'OTHER',
};

// Which obstacle types this cabinet's bag can actually deal. Anything outside
// it is placed by the run itself (signs, spring pads, the finish dog), so the
// palette shows it greyed rather than offering an exclusion that would do
// nothing.
function bagTypes(cab) {
  const set = new Set();
  for (const p of cab.patterns) for (const c of p.cells) if (c.t !== 'coins') set.add(c.t);
  return set;
}

// The capsules, from PICKUPS' own flags — a new capsule appears in the weight
// editor the day it is registered.
const capsuleTypes = () => Object.entries(PICKUPS)
  .filter(([, def]) => def.power || def.relayCharge)
  .map(([id]) => id);

const capsuleLabel = (id) => {
  const def = PICKUPS[id];
  if (def?.relayCharge) return 'RELAY CHARGE';
  return POWER_DEFS[def?.power]?.name || id;
};

// ------------------------------------------------------------ validation ----

// What is wrong with this stage, in sentences, checked against the run's own
// constants rather than against numbers restated here. Warnings, not errors:
// the save's hard refusals live in tools/lib/stage-layouts-source.js, and
// these are the design problems a schema cannot see — a pit landing on a
// checkpoint is perfectly valid data and a bad level.
function warnings(m) {
  const out = [];
  const at = (frac) => `${Math.round(frac * 100)}%`;

  // A hole owns the lane either side of itself, by the same rule the spawner
  // sweeps with (spawner.js's pitClearance).
  for (const p of m.pits) {
    const clear = pitClearance(REACT_FLOOR, m.speedAt(p.at));
    for (const q of m.pits) {
      if (q.i <= p.i) continue;
      if (q.x < p.x + p.w + clear && p.x < q.x + q.w + clear) {
        out.push(`pits at ${at(p.at)} and ${at(q.at)} are inside each other's run-up`);
      }
    }
    // The finishing straight is swept clear; a pit placed into it is silently
    // dropped by the run, which looks like the editor lying.
    if (p.x + p.w + 200 > m.totalDist - FINISH_CLEAR) {
      out.push(`the pit at ${at(p.at)} is in the finishing straight and would not be placed`);
    }
    for (const cp of m.L.checkpoints) {
      const cx = cp * m.totalDist;
      if (cx > p.x - clear && cx < p.x + p.w + clear) {
        out.push(`the checkpoint at ${at(cp)} lands in the pit at ${at(p.at)} — a restore would drop the hero into it`);
      }
    }
    for (const r of m.routes) {
      if (p.x < r.x + r.w && r.x < p.x + p.w) {
        out.push(`the pit at ${at(p.at)} overlaps the ${r.kind} at ${at(r.x / m.totalDist)}`);
      }
    }
    if (m.loopAt != null && Math.abs(p.at - m.loopAt) < 0.08) {
      out.push(`the pit at ${at(p.at)} is on top of the loop-de-loop at ${at(m.loopAt)}`);
    }
  }

  // The two pinned rewards, against the same wall.
  const wall = m.totalDist - FINISH_CLEAR;
  if (m.L.appliance.at * m.totalDist > wall) out.push('the appliance is inside the finishing straight');
  if (m.L.rewindAt != null && m.L.rewindAt * m.totalDist > wall) out.push('the rewind capsule is inside the finishing straight');

  // Sections: a bag emptied by its own exclusions leaves bare ground.
  for (const [i, s] of (m.L.sections || []).entries()) {
    const probe = new Spawner({
      cabinet: m.cab, rng: new Rng(1), tierMax: 2, react: REACT_FLOOR,
      sections: [{ ...s, from: 0, to: 1 }], totalDist: m.totalDist,
    });
    probe.nextX = 0;
    if (!probe.pickPattern()) out.push(`section ${i + 1} excludes everything its bag had — that stretch would be empty ground`);
    for (const k of (entry().sections?.[i]?.excludePatterns) || []) {
      if (!m.cab.patterns.some((p) => patternKey(p) === k)) {
        out.push(`section ${i + 1} excludes a pattern that no longer exists (${k})`);
      }
    }
    // A capsule cadence tighter than the screen rule cannot be honoured.
    const cap = s.drip?.capsule || DEFAULT_DRIP.capsule;
    if (cap[0] * m.base < 480) out.push(`section ${i + 1} asks for a capsule every ${cap[0]}s, closer than the one-screen rule allows at this speed`);
  }

  if (m.routeError) out.push(`the roads do not build: ${m.routeError}`);
  return out;
}

// ---------------------------------------------------------------- lanes ----

// The timeline is drawn rather than laid out in DOM: it is one shared x-axis
// across half a dozen rows, and pixel agreement between them is the whole
// point of looking at it.
const LANES = [
  { id: 'sections', label: 'SECTIONS — the curated bag', h: 34 },
  { id: 'setpieces', label: 'SET PIECES — pinned, drag to move', h: 44 },
  { id: 'routes', label: 'ROADS — islands, forks, tunnels', h: 40 },
  { id: 'checkpoints', label: 'CHECKPOINTS', h: 24 },
  { id: 'forecast', label: 'FORECAST — this seed. Sequence exact, positions approximate', h: 46 },
  { id: 'rewards', label: 'REWARDS — capsules and cells this seed drips', h: 30 },
];

const PAD = 8;
function xOf(canvas, frac) { return PAD + frac * (canvas.width / dpr() - PAD * 2); }
function fracOf(canvas, px) {
  const w = canvas.width / dpr() - PAD * 2;
  return Math.max(0, Math.min(1, (px - PAD) / w));
}
const dpr = () => Math.min(2, window.devicePixelRatio || 1);

function fitCanvas(c, cssH) {
  const cssW = c.parentElement.clientWidth;
  const r = dpr();
  c.width = Math.max(1, Math.round(cssW * r));
  c.height = Math.round(cssH * r);
  c.style.height = `${cssH}px`;
  const ctx = c.getContext('2d');
  ctx.setTransform(r, 0, 0, r, 0, 0);
  return ctx;
}

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function drawRuler(ctx, c, m) {
  const w = c.width / dpr(), h = c.height / dpr();
  ctx.strokeStyle = '#2a2436'; ctx.lineWidth = 1;
  ctx.fillStyle = css('--dimmer'); ctx.font = '9px ui-monospace, monospace';
  for (let f = 0; f <= 1.0001; f += 0.1) {
    const x = Math.round(xOf(c, f)) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  return { w, h };
}

function drawLane(id, c, m, fc) {
  const ctx = fitCanvas(c, LANES.find((l) => l.id === id).h);
  const { w, h } = drawRuler(ctx, c, m);
  const X = (f) => xOf(c, f);

  if (id === 'sections') {
    const secs = m.L.sections;
    if (!secs || !secs.length) {
      ctx.fillStyle = '#1a1724';
      ctx.fillRect(PAD, 4, w - PAD * 2, h - 8);
      ctx.fillStyle = css('--dimmer'); ctx.font = '10px ui-monospace, monospace';
      ctx.fillText('one bag, whole stage — press + SECTION to cut it up', PAD + 8, h / 2 + 3);
    } else {
      secs.forEach((s, i) => {
        const x0 = X(s.from), x1 = X(s.to);
        const selected = state.sel?.kind === 'section' && state.sel.i === i;
        ctx.fillStyle = i % 2 ? '#241f31' : '#2b2539';
        ctx.fillRect(x0, 4, x1 - x0, h - 8);
        if (selected) { ctx.strokeStyle = css('--hot'); ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, 5, x1 - x0 - 2, h - 10); }
        ctx.fillStyle = css('--ink'); ctx.font = '10px ui-monospace, monospace';
        const bits = [s.label || `SECTION ${i + 1}`];
        if (s.density !== 1) bits.push(`x${s.density}`);
        if (s.tierCap != null) bits.push(`T${s.tierCap}`);
        if (s.exclude?.size) bits.push(`-${s.exclude.size}`);
        const txt = bits.join('  ');
        if (x1 - x0 > ctx.measureText(txt).width + 12) ctx.fillText(txt, x0 + 6, h / 2 + 3);
      });
    }
    return;
  }

  if (id === 'setpieces') {
    const mid = h / 2;
    // pits and crossings
    for (const p of m.pits) {
      const x0 = X(p.x / m.totalDist), x1 = X((p.x + p.w) / m.totalDist);
      ctx.fillStyle = p.crossing ? css('--hazard') : '#7a3030';
      ctx.fillRect(x0, mid - 8, Math.max(2, x1 - x0), 16);
      if (state.sel?.kind === 'pit' && state.sel.i === p.i) {
        ctx.strokeStyle = css('--hot'); ctx.lineWidth = 2;
        ctx.strokeRect(x0 - 1, mid - 10, Math.max(4, x1 - x0) + 2, 20);
      }
      if (p.crossing) {
        ctx.fillStyle = '#1a1018'; ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(`${p.jumps}`, x0 + 3, mid + 3);
      }
    }
    const pin = (frac, color, label, sel) => {
      const x = X(frac);
      ctx.strokeStyle = color; ctx.lineWidth = sel ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, h - 12); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, 6, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '9px ui-monospace, monospace';
      // Flipped to the left of its own pin near the tape, where the dog lives:
      // a label that runs off the edge is the one the finishing straight
      // always produced.
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, x + 5 + tw > w - PAD ? x - 5 - tw : x + 5, h - 3);
    };
    pin(m.L.appliance.at, css('--hot'), m.L.appliance.high ? 'TOASTER^' : 'TOASTER',
      state.sel?.kind === 'appliance');
    if (m.L.rewindAt != null) pin(m.L.rewindAt, css('--reward'), 'REWIND', state.sel?.kind === 'rewind');
    if (m.loopAt != null) pin(m.loopAt, css('--setpiece'), 'LOOP', false);
    if (m.L.finishDogChance > 0) {
      const pct = Math.round(m.L.finishDogChance * 100);
      pin(0.97, css('--hazard'), pct >= 100 ? 'DOG' : `DOG ${pct}%`, false);
    }
    return;
  }

  if (id === 'routes') {
    if (!m.routes.length) {
      ctx.fillStyle = css('--dimmer'); ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(m.L.routes ? 'no roads on this stage' : `inherited from ${m.cab.id} — none`, PAD + 4, h / 2 + 3);
      return;
    }
    for (const r of m.routes) {
      const x0 = X(r.x / m.totalDist), x1 = X((r.x + r.w) / m.totalDist);
      const down = r.kind === 'tunnel';
      const top = down ? h / 2 + 2 : 6;
      const ht = Math.max(6, Math.min(14, (r.rise || 14) / 3 + 6));
      ctx.fillStyle = down ? '#2a4a58' : (r.sky ? '#3c5f70' : css('--route'));
      ctx.globalAlpha = down ? 1 : 0.55;
      ctx.fillRect(x0, down ? top : h / 2 - ht - 2, Math.max(2, x1 - x0), ht);
      ctx.globalAlpha = 1;
      // Labelled only where the label FITS INSIDE its own ribbon. Two roads a
      // few percent apart otherwise write over each other, and an overlapping
      // pair of words is worse than an unlabelled block whose shape already
      // says which kind it is.
      ctx.fillStyle = css('--dimmer'); ctx.font = '9px ui-monospace, monospace';
      const tag = `${r.kind}${r.spring ? '+spring' : ''}${r.sky ? '+sky' : ''}`;
      if (x1 - x0 > ctx.measureText(tag).width + 8) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, h); ctx.clip();
        ctx.fillText(tag, x0 + 3, down ? Math.min(h - 2, top + ht + 8) : Math.max(8, h / 2 - ht - 5));
        ctx.restore();
      }
    }
    if (!m.L.routes) {
      ctx.fillStyle = css('--dimmer'); ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('inherited', w - 60, 10);
    }
    return;
  }

  if (id === 'checkpoints') {
    for (const [i, cp] of m.L.checkpoints.entries()) {
      const x = X(cp);
      const sel = state.sel?.kind === 'checkpoint' && state.sel.i === i;
      ctx.strokeStyle = css('--check'); ctx.lineWidth = sel ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(x, 3); ctx.lineTo(x, h - 8); ctx.stroke();
      ctx.fillStyle = css('--check'); ctx.font = '9px ui-monospace, monospace';
      ctx.fillText(`${Math.round(cp * 100)}%`, x + 4, h - 1);
    }
    return;
  }

  if (id === 'forecast') {
    if (!fc) {
      ctx.fillStyle = css('--dimmer'); ctx.font = '10px ui-monospace, monospace';
      ctx.fillText('this stage is beat-charted — its lane comes from the chart, not the bag', PAD + 4, h / 2 + 3);
      return;
    }
    for (const o of fc.obstacles) {
      const x = X(o.x / m.totalDist);
      const kind = classify(o.type);
      const col = kind === 'pits' ? css('--hazard')
        : kind === 'animals' ? '#e8a04a'
        : o.def.action === 'duck' ? '#8fb8ff'
        : o.def.action === 'jump' ? '#c8c2d8' : '#5c5470';
      const ht = o.def.action === 'none' ? 5 : (o.def.ground ? 12 : 8);
      const y = o.def.ground ? h - 12 - ht : 8;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, Math.max(1.5, (o.w / m.totalDist) * (w - PAD * 2)), ht);
    }
    ctx.fillStyle = '#2a2436';
    ctx.fillRect(PAD, h - 12, w - PAD * 2, 1);
    return;
  }

  if (id === 'rewards') {
    if (!fc) return;
    for (const p of fc.pickups) {
      if (p.def.coin) continue;              // coins are the lane's texture, not an event
      const x = X(p.x / m.totalDist);
      const col = p.def.heal ? css('--reward')
        : p.def.relayCharge ? css('--check')
        : POWER_DEFS[p.def.power]?.color || css('--dim');
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, h / 2, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ------------------------------------------------------------------ DOM ----

const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : String(k));
  return n;
};

const app = document.getElementById('app');

function render() {
  const m = model();
  const fc = forecast(m, state.seed);
  const warns = warnings(m);
  app.replaceChildren(
    header(m, warns),
    el('main', {},
      leftRail(),
      center(m, fc, warns),
      rightRail(m, fc)),
  );
  // Canvases have to be in the document before they can be sized to it.
  requestAnimationFrame(() => {
    for (const lane of LANES) {
      const c = document.getElementById(`lane-${lane.id}`);
      if (c) drawLane(lane.id, c, m, fc);
    }
  });
}

function header(m, warns) {
  const badge = state.message
    ? el('span', { class: `badge ${state.message.kind}` }, state.message.lines[0])
    : warns.length
      ? el('span', { class: 'badge warn', title: warns.join('\n') }, `${warns.length} warning${warns.length > 1 ? 's' : ''}`)
      : el('span', { class: 'badge ok' }, 'clean');

  return el('header', {},
    el('h1', {}, 'MASHENSTEIN LEVEL EDITOR'),
    el('span', { class: 'badge' }, `${m.st.id}`),
    badge,
    state.dirty ? el('span', { class: 'badge dirty' }, 'unsaved') : null,
    el('span', { class: 'grow' }),
    el('label', { class: 'field' }, 'seed',
      el('input', {
        type: 'number', value: state.seed,
        oninput: (e) => { state.seed = parseInt(e.target.value, 10) || 0; render(); },
      })),
    el('button', {
      class: 'btn ghost', title: 'a different deal from the same level',
      onclick: () => { state.seed = (Math.random() * 1e6) | 0; render(); },
    }, 'ROLL'),
    el('button', {
      class: 'btn', title: `opens ${GAME_URL} at this stage and seed`,
      onclick: () => window.open(
        `${GAME_URL}/?goto=stage&cab=${m.cab.id}&stage=${m.st.id}&seed=${state.seed}`, '_blank'),
    }, 'PLAY'),
    el('button', { class: 'btn primary', disabled: !state.dirty, onclick: save }, 'SAVE'),
  );
}

function leftRail() {
  const rail = el('div', { class: 'rail left' });
  for (const cab of CABINETS) {
    const stages = STAGES.filter((s) => s.cabinet === cab.id);
    const open = state.openCabs.has(cab.id);
    const tiers = [0, 1, 2].map((t) => cab.patterns.filter((p) => p.tier === t).length);
    rail.append(el('div', { class: 'cab' },
      el('div', {
        class: 'cabhead',
        onclick: () => { open ? state.openCabs.delete(cab.id) : state.openCabs.add(cab.id); render(); },
      },
        el('span', { class: 'name' }, `${open ? '▾' : '▸'} ${cab.name}`),
        el('span', { class: 'meta' }, `act ${cab.act}`)),
      open ? el('div', { class: 'meta', style: 'padding:0 10px 6px 18px;color:var(--dimmer);font-size:10px' },
        `${cab.mechanic} · bag ${tiers.join('/')} · +${Math.round((cab.speedBonus || 0) * 100)}% speed`) : null,
      open ? stages.map((s) => el('div', {
        class: `stage${s.id === state.stageId ? ' sel' : ''}`,
        onclick: () => { state.stageId = s.id; state.sel = null; state.message = null; render(); },
      },
        el('span', {}, s.id),
        el('span', { class: 'tag' }, `${state.layouts[s.id].durationSec}s`))) : null));
  }
  return rail;
}

function center(m, fc, warns) {
  const wrap = el('div', { class: 'center' });

  // The stage's card: what it is, read-only where the editor does not own it.
  wrap.append(el('div', { class: 'card' },
    el('h2', {}, 'THIS LEVEL'),
    el('dl', { class: 'kv' },
      el('dt', {}, 'cabinet'), el('dd', {}, `${m.cab.name} — ${m.cab.mechanic}`),
      el('dt', {}, 'clock'), el('dd', {}, `${m.L.durationSec}s over ${Math.round(m.totalDist)}px`),
      el('dt', {}, 'speed'), el('dd', {}, `${Math.round(m.base)}px/s base, ${Math.round(m.speedAt(1))}px/s at the tape`),
      el('dt', {}, 'bag'), el('dd', {}, `${m.cab.patterns.length} patterns, tier ≤ ${Math.min(2, (m.st.index - 1) + (m.cab.act - 1))}`),
      fc ? el('dt', {}, 'this deal') : null,
      fc ? el('dd', {}, `${fc.obstacles.length} obstacles, ${fc.pickups.filter((p) => !p.def.coin).length} rewards`) : null),
    el('div', { class: 'mission' }, `MISSION  ${m.st.mission.desc}`),
    m.st.challenge ? el('div', { class: 'mission' }, `CHALLENGE  ${m.st.challenge.desc}`) : null));

  for (const lane of LANES) {
    wrap.append(el('div', { class: 'lanewrap' },
      el('div', { class: 'lanelabel' },
        el('span', {}, lane.label),
        lane.id === 'sections'
          ? el('button', { class: 'btn ghost', style: 'padding:1px 8px;font-size:10px', onclick: addSection }, '+ SECTION')
          : lane.id === 'setpieces'
            ? el('button', { class: 'btn ghost', style: 'padding:1px 8px;font-size:10px', onclick: addPit }, '+ PIT')
            : lane.id === 'checkpoints'
              ? el('button', { class: 'btn ghost', style: 'padding:1px 8px;font-size:10px', onclick: addCheckpoint }, '+ CHECKPOINT')
              : null),
      el('canvas', {
        class: 'lane', id: `lane-${lane.id}`,
        onclick: (e) => onLaneClick(lane.id, e, m),
      })));
  }

  if (warns.length) {
    wrap.append(el('div', { class: 'card' },
      el('h2', {}, 'WORTH A LOOK'),
      warns.map((w) => el('div', { class: 'msg warn' }, w))));
  }
  return wrap;
}

// -------------------------------------------------------------- inspector ----

function rightRail(m, fc) {
  const rail = el('div', { class: 'rail right' });
  const box = el('div', { class: 'insp' });
  rail.append(box);
  const sel = state.sel;

  if (sel?.kind === 'section') return sectionInspector(box, rail, m, sel.i);
  if (sel?.kind === 'pit') return pitInspector(box, rail, m, sel.i);
  if (sel?.kind === 'checkpoint') return checkpointInspector(box, rail, m, sel.i);
  if (sel?.kind === 'appliance' || sel?.kind === 'rewind') return pinInspector(box, rail, m, sel.kind);

  // Nothing selected: the stage itself.
  box.append(el('h2', {}, 'STAGE'),
    numRow('duration', entry().durationSec, 10, 600, 5, (v) => { entry().durationSec = v; markDirty(); }),
    numRow('speed ×', entry().speedMult, 0.5, 2, 0.05, (v) => { entry().speedMult = round(v); markDirty(); }),
    el('div', { class: 'grouphead' }, 'FINISH DOG'),
    el('div', { class: 'row' },
      el('span', { class: 'lbl' }, 'chance'),
      el('input', {
        type: 'range', min: 0, max: 100, step: 5,
        value: Math.round(m.L.finishDogChance * 100),
        oninput: (e) => {
          const v = parseInt(e.target.value, 10) / 100;
          entry().finishDog = v === 0 ? false : v;
          markDirty(); render();
        },
      }),
      el('span', {}, `${Math.round(m.L.finishDogChance * 100)}%`)),
    el('div', { class: 'grouphead' }, 'ROADS'),
    el('div', { class: 'hint' }, m.L.routes
      ? 'this stage carries its own roads; the cabinet’s no longer reach it.'
      : `inherited from ${m.cab.id} (${['islands', 'forks', 'tunnels'].map((k) => `${(m.cab[k] || []).length} ${k}`).join(', ')}).`),
    el('button', {
      class: 'btn ghost', style: 'margin-top:6px',
      onclick: () => {
        if (m.L.routes) { delete entry().routes; } else {
          entry().routes = {
            islands: JSON.parse(JSON.stringify(m.cab.islands || [])),
            forks: JSON.parse(JSON.stringify(m.cab.forks || [])),
            tunnels: JSON.parse(JSON.stringify(m.cab.tunnels || [])),
          };
        }
        markDirty(); render();
      },
    }, m.L.routes ? 'BACK TO INHERITED' : 'FORK FROM CABINET'),
    el('div', { class: 'hint' },
      'Click anything on the timeline to edit it. Sections curate the random bag; '
      + 'set pieces are placed exactly. The dice still deal inside a section.'));
  return rail;
}

function numRow(label, value, min, max, step, set) {
  return el('div', { class: 'row' },
    el('span', { class: 'lbl' }, label),
    el('input', {
      type: 'number', value, min, max, step,
      oninput: (e) => {
        const v = parseFloat(e.target.value);
        if (Number.isFinite(v)) { set(Math.max(min, Math.min(max, v))); render(); }
      },
    }));
}

function pctRow(label, frac, set, onDelete) {
  return el('div', { class: 'row' },
    el('span', { class: 'lbl' }, label),
    el('input', {
      type: 'range', min: 1, max: 99, step: 1, value: Math.round(frac * 100),
      oninput: (e) => { set(parseInt(e.target.value, 10) / 100); render(); },
    }),
    el('span', {}, `${Math.round(frac * 100)}%`),
    onDelete ? el('button', { class: 'del', title: 'remove', onclick: onDelete }, '✕') : null);
}

function pitInspector(box, rail, m, i) {
  const p = entry().pits[i];
  box.append(el('h2', {}, p.jumps ? 'SPIKE CROSSING' : 'PIT'),
    pctRow('at', p.at, (v) => { p.at = v; markDirty(); },
      () => { entry().pits.splice(i, 1); if (!entry().pits.length) entry().pits = null; state.sel = null; markDirty(); render(); }),
    p.jumps
      ? numRow('jumps', p.jumps, 2, 8, 1, (v) => { p.jumps = Math.round(v); markDirty(); })
      : numRow('width', p.w, 24, 200, 2, (v) => { p.w = Math.round(v); markDirty(); }),
    el('button', {
      class: 'btn ghost', style: 'margin-top:8px',
      onclick: () => {
        if (p.jumps) { delete p.jumps; p.w = 56; } else { delete p.w; p.jumps = 4; }
        markDirty(); render();
      },
    }, p.jumps ? 'MAKE IT AN ORDINARY PIT' : 'MAKE IT A SPIKE CROSSING'),
    el('div', { class: 'hint' }, p.jumps
      ? 'A crossing is too wide to clear: stepping stones over spikes, taken in that many jumps. '
        + 'Its width is derived from the speed the hero will be doing here, not authored.'
      : `${Math.round(m.pits[i].w)}px of hole, filled with ${m.cab.pitFill || 'tar'}.`));
  return rail;
}

function checkpointInspector(box, rail, m, i) {
  box.append(el('h2', {}, `CHECKPOINT ${i + 1}`),
    pctRow('at', entry().checkpoints ? entry().checkpoints[i] : m.L.checkpoints[i], (v) => {
      if (!entry().checkpoints) entry().checkpoints = [...m.L.checkpoints];
      entry().checkpoints[i] = v;
      entry().checkpoints.sort((a, b) => a - b);
      markDirty();
    }, () => {
      if (!entry().checkpoints) entry().checkpoints = [...m.L.checkpoints];
      entry().checkpoints.splice(i, 1);
      state.sel = null; markDirty(); render();
    }),
    el('div', { class: 'hint' },
      'A death restores here. Two thirds is the shipped shape, so no death replays '
      + 'more than a third of a stage.'));
  return rail;
}

function pinInspector(box, rail, m, kind) {
  if (kind === 'appliance') {
    box.append(el('h2', {}, 'GOLDEN TOASTER'),
      pctRow('at', entry().appliance.at, (v) => { entry().appliance.at = v; markDirty(); }),
      el('label', { class: 'chk' },
        el('input', {
          type: 'checkbox', checked: !!entry().appliance.high,
          onchange: (e) => { entry().appliance.high = e.target.checked; markDirty(); render(); },
        }), 'up high (needs a jump)'),
      el('div', { class: 'hint' }, 'One per stage, in a fixed spot so memory and guides work.'));
  } else {
    box.append(el('h2', {}, 'REWIND CAPSULE'),
      entry().rewindAt == null
        ? el('button', {
          class: 'btn', onclick: () => { entry().rewindAt = 0.15; state.sel = { kind: 'rewind' }; markDirty(); render(); },
        }, 'PLACE ONE')
        : pctRow('at', entry().rewindAt, (v) => { entry().rewindAt = v; markDirty(); },
          () => { entry().rewindAt = null; state.sel = null; markDirty(); render(); }),
      el('div', { class: 'hint' }, 'The banked one-shot, guaranteed on this stage. The drip can still deal one anywhere.'));
  }
  return rail;
}

function sectionInspector(box, rail, m, i) {
  const secs = entry().sections;
  const s = secs[i];
  const bag = bagTypes(m.cab);
  const excluded = new Set(s.exclude || []);

  box.append(el('h2', {}, `SECTION ${i + 1}`),
    el('div', { class: 'row' },
      el('span', { class: 'lbl' }, 'label'),
      el('input', {
        type: 'text', value: s.label || '', placeholder: `SECTION ${i + 1}`,
        oninput: (e) => { s.label = e.target.value || undefined; markDirty(); },
      })),
    pctRow('ends at', s.to, (v) => {
      const lo = i === 0 ? 0.02 : secs[i - 1].to + 0.02;
      const hi = i === secs.length - 1 ? 1 : secs[i + 1].to - 0.02;
      s.to = Math.max(lo, Math.min(hi, v));
      if (i === secs.length - 1) s.to = 1;
      markDirty();
    }, secs.length > 1 ? () => {
      secs.splice(i, 1);
      if (secs.length) secs[secs.length - 1].to = 1; else delete entry().sections;
      state.sel = null; markDirty(); render();
    } : null),
    el('div', { class: 'row' },
      el('span', { class: 'lbl' }, 'density'),
      el('input', {
        type: 'range', min: 50, max: 250, step: 5, value: Math.round((s.density ?? 1) * 100),
        oninput: (e) => { s.density = round(parseInt(e.target.value, 10) / 100, 2); markDirty(); render(); },
      }),
      el('span', {}, `×${round(s.density ?? 1, 2)}`)),
    el('div', { class: 'row' },
      el('span', { class: 'lbl' }, 'tier cap'),
      el('select', {
        onchange: (e) => { s.tierCap = e.target.value === '' ? undefined : parseInt(e.target.value, 10); markDirty(); render(); },
      },
        ['', '0', '1', '2'].map((v) => el('option', {
          value: v, selected: String(s.tierCap ?? '') === v,
        }, v === '' ? 'stage default' : `tier ${v} and below`)))),
  );

  // ---- the bag, grouped by what the registry says each obstacle IS --------
  box.append(el('div', { class: 'grouphead' }, 'WHAT THIS STRETCH MAY DEAL'));
  const groups = new Map();
  for (const type of Object.keys(OBSTACLES)) {
    const g = classify(type);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(type);
  }
  const scroll = el('div', { class: 'scroll' });
  for (const g of GROUP_ORDER) {
    const types = (groups.get(g) || []).filter((t) => bag.has(t));
    if (!types.length) continue;
    scroll.append(el('div', { class: 'grouphead' }, GROUP_LABEL[g] || g));
    for (const t of types) {
      const on = !excluded.has(t);
      scroll.append(el('label', { class: `chk${on ? '' : ' off'}` },
        el('input', {
          type: 'checkbox', checked: on,
          onchange: (e) => {
            const next = new Set(excluded);
            if (e.target.checked) next.delete(t); else next.add(t);
            s.exclude = next.size ? [...next] : undefined;
            markDirty(); render();
          },
        }), t));
    }
  }
  // Everything the run places itself, shown but not offered.
  const outside = Object.keys(OBSTACLES).filter((t) => !bag.has(t));
  if (outside.length) {
    scroll.append(el('div', { class: 'grouphead' }, 'PLACED BY THE RUN — NOT FROM THE BAG'));
    scroll.append(el('div', {}, outside.map((t) => el('span', { class: 'pill' }, t))));
  }
  box.append(scroll);

  // ---- rewards -----------------------------------------------------------
  const drip = s.drip || {};
  const cap = drip.capsule || DEFAULT_DRIP.capsule;
  const bat = drip.battery || DEFAULT_DRIP.battery;
  const setDrip = (k, v) => { s.drip = { ...(s.drip || {}), [k]: v }; markDirty(); render(); };
  box.append(el('div', { class: 'grouphead' }, 'REWARD RATES'),
    el('div', { class: 'row' },
      el('span', { class: 'lbl' }, 'capsule'),
      el('input', { type: 'number', value: cap[0], min: 1, max: 300, step: 1, style: 'width:56px',
        oninput: (e) => setDrip('capsule', [parseFloat(e.target.value) || 1, cap[1]]) }),
      el('span', {}, '–'),
      el('input', { type: 'number', value: cap[1], min: 1, max: 300, step: 1, style: 'width:56px',
        oninput: (e) => setDrip('capsule', [cap[0], parseFloat(e.target.value) || 1]) }),
      el('span', {}, 's')),
    el('div', { class: 'row' },
      el('span', { class: 'lbl' }, 'battery'),
      el('input', { type: 'number', value: bat[0], min: 1, max: 300, step: 1, style: 'width:56px',
        oninput: (e) => setDrip('battery', [parseFloat(e.target.value) || 1, bat[1]]) }),
      el('span', {}, '–'),
      el('input', { type: 'number', value: bat[1], min: 1, max: 300, step: 1, style: 'width:56px',
        oninput: (e) => setDrip('battery', [bat[0], parseFloat(e.target.value) || 1]) }),
      el('span', {}, 's')));

  const weights = drip.weights || null;
  box.append(el('div', { class: 'grouphead' }, 'WHICH CAPSULES'),
    el('label', { class: 'chk' },
      el('input', {
        type: 'checkbox', checked: !!weights,
        onchange: (e) => {
          setDrip('weights', e.target.checked ? { ...DEFAULT_POWER_WEIGHTS } : undefined);
        },
      }), weights ? 'this stretch picks its own' : 'the game’s own odds'));
  if (weights) {
    const total = Object.values(weights).reduce((a, b) => a + Math.max(0, b), 0) || 1;
    for (const id of capsuleTypes()) {
      const w = weights[id] ?? 0;
      box.append(el('div', { class: 'row' },
        el('span', { class: 'lbl', title: id }, capsuleLabel(id).slice(0, 11)),
        el('input', {
          type: 'range', min: 0, max: 50, step: 1, value: w,
          oninput: (e) => {
            const next = { ...weights, [id]: parseInt(e.target.value, 10) };
            setDrip('weights', next);
          },
        }),
        el('span', {}, `${Math.round((Math.max(0, w) / total) * 100)}%`)));
    }
  }
  return rail;
}

// ---------------------------------------------------------- interaction ----

// Clicking a lane selects whatever is under the pointer. Hit tests are done in
// timeline fractions rather than pixels so they hold at any window width.
function onLaneClick(id, e, m) {
  const c = e.currentTarget;
  const rect = c.getBoundingClientRect();
  const f = fracOf(c, e.clientX - rect.left);
  const near = (a, b, tol = 0.02) => Math.abs(a - b) < tol;

  if (id === 'sections' && m.L.sections) {
    const i = m.L.sections.findIndex((s) => f >= s.from && f < s.to);
    state.sel = i >= 0 ? { kind: 'section', i } : null;
  } else if (id === 'setpieces') {
    const pit = m.pits.find((p) => f >= p.x / m.totalDist - 0.005 && f <= (p.x + p.w) / m.totalDist + 0.005);
    if (pit) state.sel = { kind: 'pit', i: pit.i };
    else if (near(f, m.L.appliance.at)) state.sel = { kind: 'appliance' };
    else if (m.L.rewindAt != null && near(f, m.L.rewindAt)) state.sel = { kind: 'rewind' };
    else state.sel = { kind: 'rewind' };            // the empty slot offers itself
  } else if (id === 'checkpoints') {
    const i = m.L.checkpoints.findIndex((cp) => near(f, cp, 0.03));
    state.sel = i >= 0 ? { kind: 'checkpoint', i } : null;
  } else {
    state.sel = null;
  }
  state.message = null;
  render();
}

function addSection() {
  const m = model();
  const secs = entry().sections;
  if (!secs || !secs.length) {
    // The first cut: two halves, so what a section IS is visible immediately.
    entry().sections = [{ to: 0.5 }, { to: 1 }];
  } else {
    // Split the last section in half rather than guessing where the author
    // wants a boundary — dragging it is one gesture, undoing a wrong guess is
    // more than one.
    const last = secs[secs.length - 1];
    const prev = secs.length > 1 ? secs[secs.length - 2].to : 0;
    secs.splice(secs.length - 1, 0, { to: round((prev + last.to) / 2, 3) });
  }
  state.sel = { kind: 'section', i: (entry().sections.length - 1) };
  markDirty(); render();
}

function addPit() {
  const e = entry();
  if (!e.pits) e.pits = [];
  // Dropped into the largest empty stretch rather than at a fixed fraction:
  // a new pit landing on top of an existing one is a warning the author then
  // has to clear by hand, for nothing.
  const taken = [...e.pits.map((p) => p.at), e.appliance.at, ...(e.rewindAt != null ? [e.rewindAt] : [])].sort((a, b) => a - b);
  let best = 0.5, bestGap = -1, prev = 0.08;
  for (const t of [...taken, 0.92]) {
    if (t - prev > bestGap) { bestGap = t - prev; best = (t + prev) / 2; }
    prev = t;
  }
  e.pits.push({ at: round(best, 3), w: 56 });
  e.pits.sort((a, b) => a.at - b.at);
  state.sel = { kind: 'pit', i: e.pits.findIndex((p) => p.at === round(best, 3)) };
  markDirty(); render();
}

function addCheckpoint() {
  const m = model();
  const e = entry();
  if (!e.checkpoints) e.checkpoints = [...m.L.checkpoints];
  const n = e.checkpoints.length + 1;
  e.checkpoints = Array.from({ length: n }, (_, i) => round((i + 1) / (n + 1), 3));
  markDirty(); render();
}

// ----------------------------------------------------------------- save ----

async function save() {
  // Only decisions travel: the server's writer re-derives the file, and a
  // payload carrying editor bookkeeping would put it in the diff.
  const payload = { layouts: state.layouts };
  try {
    const res = await fetch('/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!body.ok) {
      state.message = { kind: 'err', lines: [`refused: ${body.errors[0]}`] };
    } else {
      state.dirty = false;
      state.message = {
        kind: 'ok',
        lines: [body.changed ? 'saved — the next build reads it' : 'nothing changed'],
      };
      if (body.warnings?.length) state.message = { kind: 'warn', lines: [body.warnings[0]] };
    }
  } catch (err) {
    state.message = { kind: 'err', lines: [`could not reach the editor server: ${err.message}`] };
  }
  render();
}

// ----------------------------------------------------------------- boot ----

window.addEventListener('resize', () => render());
// A save is the one thing worth a keystroke: this page is used with the game
// open in the next tab, and reaching for the mouse to commit an edit you have
// already decided on is the friction that makes people stop tweaking.
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (state.dirty) save(); }
});
render();
