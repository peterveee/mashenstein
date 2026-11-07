// CAMERA RUN HARNESS — the per-tier, per-frame measurement of where the hero sits in the
// frame, shared by the gate (tests/camera-run-offscreen.js) and the probe
// (work/local/cam-offscreen-probe.mjs). Nothing here asserts; it drives a real RunState
// headlessly and records, every frame, the screen y of the crown, feet and base lane, the
// pan/zoom/floor and what the camera says it was doing (run.camTrace, read defensively —
// the shipped camera has none, the proposed one publishes one per tick).
//
// One tier per child process: the platform is read once by run.js (window.__mash_platform
// before the import) and the frame once by the renderer, so the parent spawns itself with
// MASH_TIER set and reads one JSON line (prefixed @@CAM) back.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TICK = 1 / 60;
export const SEED = 1337;
export const DEFAULT_TEAM = ['lorenzo', 'rusty', 'clara'];
export const DEFAULT_STAGES = ['plumber-1', 'plumber-2', 'plumber-3', 'speed-3', 'frost-1', 'frost-2', 'frost-3',
  'crypt-1', 'crypt-2', 'crypt-3', 'neon-1', 'neon-2', 'surge-2'];
export const MODES = ['bot', 'upper', 'low', 'stairs'];
export const PORTRAIT_VIEWPORT = Object.freeze({
  mode: 'phone-portrait', viewportWidth: 390, viewportHeight: 844,
  safeInsets: { top: 59, right: 0, bottom: 34, left: 0 }, revision: 1,
});
export const TIERS = Object.freeze({
  desktop: { platform: { isDesktop: true } },
  close: { platform: { isDesktop: true }, zoomIn: true },
  tablet: { platform: { isDesktop: false, isIphone: false } },
  phone: { platform: { isDesktop: false, isIphone: true } },
  portrait: { platform: { isDesktop: false, isIphone: true }, portrait: true },
});
export const TIER_NAMES = Object.keys(TIERS);
export const SENTINEL = '@@CAM ';
// Scripted staircase: jump this many seconds of travel before a step's lip, hold 24 frames.
export const STAIR_LEAD = Number(process.env.CAM_LEAD || 0.45);
export const STAIR_START_BACK = 260;
export const HERO_START_X = 46;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
const list = (s, d) => (s ? String(s).split(',').map((x) => x.trim()).filter(Boolean) : d);

/** Spawn `file` once with MASH_TIER=tier and return its @@CAM payload. */
export function tierChild(file, tier, { env = {}, args = [], timeout = 20 * 60 * 1000 } = {}) {
  const r = spawnSync(process.execPath, [file, ...args], {
    cwd: ROOT, encoding: 'utf8', timeout, maxBuffer: 512 * 1024 * 1024,
    env: { ...process.env, ...env, MASH_TIER: tier },
  });
  const line = (r.stdout || '').split('\n').reverse().find((l) => l.startsWith(SENTINEL));
  let payload = null;
  if (line) { try { payload = JSON.parse(line.slice(SENTINEL.length)); } catch (e) { payload = null; } }
  const noise = (r.stdout || '').split('\n').filter((l) => l && !l.startsWith(SENTINEL)).join('\n');
  return { tier, status: r.status, payload, stderr: r.stderr || '', noise, error: r.error || null };
}

/** Boot one tier in this process: DOM stub, platform, then the game modules. Call once. */
export async function bootTier(tierName) {
  const tier = TIERS[tierName];
  if (!tier) throw new Error(`unknown tier ${tierName}`);
  const { installDom } = await import('./dom-stub.js');
  installDom();
  window.__mash_platform = tier.platform;
  const renderer = await import('../src/engine/renderer.js');
  const { frameForViewport } = await import('../src/engine/frame.js');
  const runMod = await import('../src/game/run.js');
  const { save } = await import('../src/engine/save.js');
  const { Input } = await import('../src/engine/input.js');
  const { DemoBot } = await import('../src/game/bot.js');
  const { STAGE_BY_ID } = await import('../src/data/stages.js');
  const C = await import('../src/engine/camera.js');
  let HERO_DRAW_H = 24;
  try { ({ HERO_DRAW_H } = await import('../src/game/draw.js')); } catch { /* keep 24 */ }
  save.load(); save.newSlot(0, 0);
  if (tier.zoomIn) save.settings.zoomIn = true;
  return { name: tierName, tier, renderer, frameForViewport, runMod, RunState: runMod.RunState, save, Input, DemoBot, STAGE_BY_ID, C, HERO_DRAW_H };
}

/** The zoom this tier is meant to hold on every live frame. */
export function expectedZoom(ctx, run) {
  const { runMod, tier } = ctx;
  if (tier.portrait) return num(run?.portraitConfig?.()?.worldZoom) ?? 3.5;
  if (tier.platform.isDesktop) return tier.zoomIn ? runMod.ZOOM_CLOSE : runMod.ZOOM_NORMAL;
  return tier.platform.isIphone ? runMod.ZOOM_PHONE : runMod.ZOOM_CLOSE;
}

export function applyTierFrame(ctx) {
  if (ctx.tier.portrait) ctx.renderer.setPresentationFrame(ctx.frameForViewport({ ...PORTRAIT_VIEWPORT }));
}

/** A fresh, entered run. `startX` (world px) skips ahead via devStartPercent, measured off a throwaway run. */
export function makeRun(ctx, { stageId, team = DEFAULT_TEAM, seed = SEED, startX = null } = {}) {
  const stage = ctx.STAGE_BY_ID[stageId];
  if (!stage) throw new Error(`unknown stage ${stageId}`);
  const box = { result: null };
  const opts = { stage, team, save: ctx.save, seed, difficulty: 1, skipRunIn: true, devInvuln: true, onEnd: (r) => { box.result = r; } };
  if (startX != null) {
    const probe = new ctx.RunState({ ...opts, onEnd: () => {} });
    probe.enter();
    opts.devStartPercent = Math.max(0, (startX - HERO_START_X) / probe.totalDist);
  }
  const run = new ctx.RunState(opts);
  run.enter();
  applyTierFrame(ctx); // enter() leaves the renderer on the default frame; portrait must be re-applied after it
  return { run, box };
}

export function routeLabel(r) {
  if (!r) return '-';
  if (typeof r === 'string') return r;
  return `${r.kind || '?'}${r.sky ? '/sky' : ''}${r.stack ? '@' + r.stack : ''}`;
}
export function routeRise(run, r) {
  if (!r) return 0;
  if (r.kind === 'island') return run.groundYAt(r.x + r.w / 2) - r.topY;
  return num(r.entry) ?? 0;
}

/** One frame's measurement. `prev` is the previous record (or null). */
export function measure(ctx, run, i, prev) {
  const { C, renderer, HERO_DRAW_H } = ctx;
  const p = run.player;
  const z = run.camZoom, pan = run.camPan, fl = run.camFloorY;
  const floor = run.playerGroundY();
  const feet = floor - (Number(p.y) || 0);
  const crown = C.screenYFor(feet - HERO_DRAW_H, z, pan, fl);
  const feetS = C.screenYFor(feet, z, pan, fl);
  const lane = C.screenYFor(C.GROUND_Y, z, pan, fl);
  const tr = run.camTrace || null;
  const bindFloor = !!tr && Number.isFinite(Number(tr.floorPan)) && Math.abs(Number(tr.floorPan) - pan) <= 0.5;
  const bindCap = !!tr && Number.isFinite(Number(tr.cap)) && pan >= Number(tr.cap) - 0.5 && pan > 0.5;
  const rec = {
    i, t: i * TICK, x: run.playerWorldX(), y: Number(p.y) || 0, vy: Number(p.vy) || 0,
    g: !!p.grounded || (Number(p.y) || 0) <= 0.01,
    feet, crown, feetS, lane, z, pan, fl,
    dpan: prev ? pan - prev.pan : 0,
    // The pan step net of the lockstep: whatever the anchor took over this tick
    // (moving up: negative screen px) the crane gives back in the same tick, so
    // that share of the pan's motion is invisible on the screen.
    dpanNet: prev ? (pan - prev.pan) - Math.min(0, (fl - prev.fl) * z) : 0,
    slide: prev ? (lane - prev.lane) / TICK : 0,
    own: tr ? num(tr.own) : null,
    traced: !!tr,
    bind: bindFloor || bindCap,
    fp: tr ? num(tr.floorPan) : null,
    cap: tr ? num(tr.cap) : null,
    kind: routeLabel(run.route),
    rx: run.route ? run.route.x : null,
    rise: run.route ? routeRise(run, run.route) : 0,
    ref: tr ? routeLabel(tr.refRoute) : null,
    carried: (!!tr && (num(tr.carry) > 0 || num(tr.panCarry) > 0)) || !!run.portraitFrameTransition?.active,
    pc: tr ? (num(tr.panCarry) || 0) : 0,
    H: renderer.H,
  };
  if (ctx.tier.portrait) {
    const f = renderer.presentationFrame();
    const fit = run.portraitFrameFitState;
    rec.band = { top: num(f?.safeRect?.top) ?? 0, bottom: num(f?.safeRect?.bottom) ?? renderer.H };
    rec.play = { top: num(fit?.playableTop), bottom: num(fit?.playableBottom) };
  }
  return rec;
}

/** Drive one scenario to the end of the stage (or `maxFrames`) and return its frames. */
export function runScenario(ctx, { stageId, mode, team = DEFAULT_TEAM, seed = SEED, maxFrames = 60 * 60 * 4, stack = null }) {
  const { Input, DemoBot } = ctx;
  if (mode === 'stairs') return runStairs(ctx, { stageId, team, seed, stack });
  const { run, box } = makeRun(ctx, { stageId, team, seed });
  if (mode === 'upper') run.tunnelMouthAt = () => null;
  const disarmSprings = () => {
    for (const ob of run.obstacles) if (ob.def?.isSpring) { ob.live = false; ob.used = true; }
  };
  const bot = new DemoBot(run);
  const frames = [];
  let prev = null, err = null;
  try {
    for (let i = 0; i < maxFrames && !box.result; i++) {
      if (mode === 'low') disarmSprings();
      bot.update(TICK);
      run.update(TICK); // run.update ends the input frame itself
      prev = measure(ctx, run, i, prev);
      frames.push(prev);
    }
  } catch (e) { err = String(e && e.stack || e); }
  bot.releaseAll(); Input.endFrame();
  return [{ stage: stageId, mode, label: mode, frames, ended: !!box.result, error: err, zoom: expectedZoom(ctx, run), startX: HERO_START_X }];
}

/** The scripted staircase: one scenario per `stack` label (or the one named). */
export function runStairs(ctx, { stageId, team = DEFAULT_TEAM, seed = SEED, stack = null }) {
  const { Input } = ctx;
  const { run: scout } = makeRun(ctx, { stageId, team, seed });
  const labels = [...new Set(scout.routes.filter((r) => r.stack).map((r) => r.stack))].filter((l) => !stack || l === stack);
  const out = [];
  for (const label of labels) {
    const first = scout.routes.filter((r) => r.stack === label).sort((a, b) => a.x - b.x)[0];
    const { run, box } = makeRun(ctx, { stageId, team, seed, startX: first.x - STAIR_START_BACK });
    const steps = run.routes.filter((r) => r.stack === label).sort((a, b) => a.x - b.x);
    const top = steps[steps.length - 1];
    let nextIdx = 0, hold = 0, dbl = 0, repress = false, onTopT = 0, airT = 0, reachedTop = false, prev = null, err = null;
    const frames = [];
    try {
      for (let i = 0; i < 60 * 14 && !box.result; i++) {
        run.obstacles.length = 0;
        const p = run.player, hx = run.playerWorldX(), sp = run.speed;
        const gr = !!p.grounded || (Number(p.y) || 0) <= 0.01;
        if (repress) { Input.press('jump'); repress = false; hold = 20; }
        else if (hold > 0) {
          hold--;
          if (hold === 0) Input.release('jump');
          if (dbl === 1 && p.vy <= 0 && p.jumps === 1) { Input.release('jump'); hold = 0; repress = true; dbl = 2; }
        } else if (nextIdx < steps.length && gr && hx >= steps[nextIdx].x - sp * STAIR_LEAD) {
          Input.press('jump'); hold = 24; nextIdx++;
        } else if (nextIdx === steps.length && dbl === 0 && run.route === top && gr) {
          reachedTop = true;
          onTopT += TICK;
          if (onTopT > 0.2) { run.powerups.bonusJumps = () => 1; Input.press('jump'); hold = 40; dbl = 1; }
        }
        run.update(TICK); Input.endFrame();
        prev = measure(ctx, run, i, prev);
        frames.push(prev);
        // Done 2.5 s after he is back on his feet past the top step, doubled or not (a missed
        // step lands him on the lane; the clock then runs from the moment he passes the top).
        const past = nextIdx === steps.length && hold === 0 && !repress && dbl !== 1
          && (!!run.player.grounded) && run.route !== top && run.playerWorldX() > top.x + top.w;
        if (past) { airT += TICK; if (airT > 2.5) break; }
      }
    } catch (e) { err = String(e && e.stack || e); }
    Input.release('jump'); Input.endFrame();
    out.push({ stage: stageId, mode: 'stairs', label: `stairs@${label}`, frames, ended: !!box.result, error: err,
      zoom: expectedZoom(ctx, run), startX: first.x - STAIR_START_BACK, steps: steps.map((s) => ({ x: s.x, topY: s.topY })), reachedTop, doubled: dbl === 2 });
  }
  if (!labels.length) out.push({ stage: stageId, mode: 'stairs', label: 'stairs', frames: [], skipped: 'no stacks', zoom: expectedZoom(ctx, scout) });
  return out;
}

/** Numbers the gate and the probe read, computed from one scenario's frames. */
export function summarize(sc, tierName) {
  const portrait = tierName === 'portrait';
  const F = sc.frames;
  const s = {
    tier: tierName, stage: sc.stage, mode: sc.mode, label: sc.label, zoom: sc.zoom, error: sc.error || null, skipped: sc.skipped || null,
    ended: !!sc.ended, reachedTop: sc.reachedTop, doubled: sc.doubled,
    frames: F.length, hold: 0, H: F.length ? F[F.length - 1].H : null,
    offTop: 0, offTopBound: 0, offTopUnbound: 0, offTopMaxDepth: 0, offTopMaxDepthBound: 0, offTopMaxRun: 0,
    offBottom: 0, offBottomMax: 0,
    maxDPan: 0, maxDPanFree: 0, maxDPanUncarried: 0, maxDPanCarryExcess: 0, maxOwn: null, maxOwnFree: null, maxOwnBoundExcess: 0, traced: 0, maxSlide: 0,
    minZoom: Infinity, zoomMiss: 0, zoomMissFirst: null, minFloor: Infinity, maxFloor: -Infinity,
    lastReleaseT: null, settleAfter: null, tailAfter: null, routeFrames: 0,
    panAtStart: null, minCrownVsBand: null, maxFeetOverBand: null, band: null, play: null,
    segments: [],
  };
  if (!F.length) return s;
  // The hold: frames before the hero has moved off his mark (any remaining opening).
  const x0 = F[0].x;
  let hold = 0; while (hold < F.length && Math.abs(F[hold].x - x0) < 0.01) hold++;
  if (hold >= F.length) hold = 0;
  s.hold = hold;
  s.panAtStart = F[hold].pan;
  if (portrait) { s.band = F[hold].band; s.play = F[hold].play; }
  let run = 0, seg = null, lastKey = null, lastRelease = null;
  const topEdge = (f) => (portrait ? f.band.top : 0);
  const botEdge = (f) => (portrait ? f.band.bottom : f.H);
  for (let i = hold; i < F.length; i++) {
    const f = F[i];
    const depth = topEdge(f) - f.crown;              // >0 means the crown is above the top edge
    const over = f.feetS - botEdge(f);               // >0 means the feet are below the bottom edge
    if (depth > 0) {
      s.offTop++; run++; s.offTopMaxRun = Math.max(s.offTopMaxRun, run); s.offTopMaxDepth = Math.max(s.offTopMaxDepth, depth);
      if (f.bind) { s.offTopBound++; s.offTopMaxDepthBound = Math.max(s.offTopMaxDepthBound, depth); } else s.offTopUnbound++;
    } else run = 0;
    if (over > 0) { s.offBottom++; s.offBottomMax = Math.max(s.offBottomMax, over); }
    if (portrait) {
      s.minCrownVsBand = s.minCrownVsBand == null ? -depth : Math.min(s.minCrownVsBand, -depth);
      s.maxFeetOverBand = s.maxFeetOverBand == null ? over : Math.max(s.maxFeetOverBand, over);
    }
    const ad = Math.abs(f.dpanNet);
    if (i > hold) {
      s.maxDPan = Math.max(s.maxDPan, ad);
      // Free frames: neither the crown floor binding (the crane rides the hero's
      // rise) nor the crane coming down WITH a fall (panCarry: the lane rises to
      // meet a hero who holds his place on the screen).
      if (!f.bind && !(f.pc > 0)) s.maxDPanFree = Math.max(s.maxDPanFree, ad);
      if (f.pc > 0) s.maxDPanCarryExcess = Math.max(s.maxDPanCarryExcess, ad - f.pc);
      if (!f.carried) s.maxDPanUncarried = Math.max(s.maxDPanUncarried, ad);
      s.maxSlide = Math.max(s.maxSlide, Math.abs(f.slide));
      if (f.z !== sc.zoom) { s.zoomMiss++; if (s.zoomMissFirst == null) s.zoomMissFirst = i; }
    }
    if (f.traced) {
      s.traced++;
      if (f.own != null) {
        s.maxOwn = Math.max(s.maxOwn ?? 0, Math.abs(f.own));
        if (!f.bind) s.maxOwnFree = Math.max(s.maxOwnFree ?? 0, Math.abs(f.own));
        // On a bound frame the crane rides the hero's own rise: own may exceed
        // the budget by no more than his rise on the screen this tick.
        else if (i > hold) {
          const riseScreen = Math.max(0, (F[i - 1].feet - f.feet) * f.z) / TICK;
          s.maxOwnBoundExcess = Math.max(s.maxOwnBoundExcess, Math.abs(f.own) - riseScreen);
        }
      }
    }
    s.minZoom = Math.min(s.minZoom, f.z); s.minFloor = Math.min(s.minFloor, f.fl); s.maxFloor = Math.max(s.maxFloor, f.fl);
    if (f.kind !== '-') s.routeFrames++;
    // Segments: a contiguous run on one route (identity, not just kind) or one stretch of lane.
    const key = f.kind === '-' ? '-' : `${f.kind}#${f.rx}`;
    if (key !== lastKey) {
      if (lastKey != null && lastKey !== '-' && key === '-') lastRelease = f;
      seg = { kind: f.kind, rise: f.rise, i0: i, i1: i, t0: f.t, t1: f.t, frames: 0, minCrown: Infinity, maxFeet: -Infinity, offTop: 0, offBottom: 0,
        maxSlide: 0, maxDPan: 0, maxOwn: null, worstI: i, worstCrown: Infinity, bound: 0, ref: {} };
      s.segments.push(seg); lastKey = key;
    }
    seg.frames++; seg.i1 = i; seg.t1 = f.t;
    const crownVs = f.crown - topEdge(f), feetVs = f.feetS - botEdge(f);
    seg.minCrown = Math.min(seg.minCrown, crownVs); seg.maxFeet = Math.max(seg.maxFeet, feetVs);
    if (crownVs < 0) seg.offTop++; if (feetVs > 0) seg.offBottom++;
    if (f.bind) seg.bound++;
    if (i > hold) { seg.maxSlide = Math.max(seg.maxSlide, Math.abs(f.slide)); seg.maxDPan = Math.max(seg.maxDPan, ad); }
    if (f.own != null) seg.maxOwn = Math.max(seg.maxOwn ?? 0, Math.abs(f.own));
    if (crownVs < seg.worstCrown) { seg.worstCrown = crownVs; seg.worstI = i; }
    if (f.ref) seg.ref[f.ref] = (seg.ref[f.ref] || 0) + 1;
  }
  if (lastRelease) {
    s.lastReleaseT = lastRelease.t;
    s.tailAfter = F[F.length - 1].t - lastRelease.t;
    for (let i = lastRelease.i; i < F.length; i++) if (Math.abs(F[i].fl - 232) < 2) { s.settleAfter = F[i].t - lastRelease.t; break; }
  }
  if (!Number.isFinite(s.minZoom)) s.minZoom = null;
  return s;
}

/** Child-process entry: boot the tier named by MASH_TIER, run the asked scenarios, return the payload. */
export async function childMain({ stages, modes, team, flatStage = 'plumber-1', flat = false, keepFrames = false } = {}) {
  const tierName = process.env.MASH_TIER;
  const ctx = await bootTier(tierName);
  const stageIds = list(process.env.CAM_STAGES, stages || DEFAULT_STAGES);
  const modeIds = list(process.env.CAM_MODES, modes || MODES);
  const teamIds = list(process.env.CAM_TEAM, team || DEFAULT_TEAM);
  const payload = { tier: tierName, H: ctx.renderer.H, scenarios: [], flat: null };
  for (const stageId of stageIds) for (const mode of modeIds) {
    let scs;
    try { scs = runScenario(ctx, { stageId, mode, team: teamIds }); } catch (e) { scs = [{ stage: stageId, mode, label: mode, frames: [], error: String(e && e.stack || e), zoom: null }]; }
    for (const sc of scs) {
      const sum = summarize(sc, tierName);
      if (keepFrames) sum.framesRaw = sc.frames;
      payload.scenarios.push(sum);
      if (flat && stageId === flatStage && mode === 'bot') {
        const firstRoute = Math.min(...sc.frames.filter((f) => f.rx != null).map((f) => f.rx), Infinity);
        payload.flat = sc.frames.filter((f) => f.x >= 250 && f.x <= 1000 && f.x < firstRoute)
          .map((f) => ({ i: f.i, x: f.x, pan: f.pan, fl: f.fl, z: f.z, feet: f.feet, y: f.y }));
      }
    }
  }
  payload.zoom = payload.scenarios.find((s) => s.zoom != null)?.zoom ?? null;
  // The frame height as the scenarios saw it (portrait applies its frame per run, after boot).
  payload.H = payload.scenarios.find((s) => s.H != null)?.H ?? ctx.renderer.H;
  return payload;
}

export function emit(payload) { process.stdout.write(SENTINEL + JSON.stringify(payload) + '\n'); }
