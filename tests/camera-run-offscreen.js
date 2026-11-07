// THE HERO STAYS IN THE FRAME — the camera gate, measured on the real RunState headlessly
// per tier (desktop 1.6, close 2.0, tablet 2.0, phone 2.2, portrait 3.5) on plumber-1,
// plumber-2, crypt-2 and frost-1, driven by the DemoBot (bot), never taking a tunnel
// (upper), with spring pads disarmed (low), and up every staircase with a double on top
// (stairs). tests/camera-run-harness.js does the driving and the measuring.
//
// Landscape, per tier and scenario:
//   G1 the feet never leave the bottom of the frame; the crown goes above the top only on
//      frames where the camera's own crown floor or cap binds (run.camTrace), by <= 14 px,
//      on <= 15 frames per scenario. On the phone (2.2) a double from a raised step is the
//      ground-wins trade (10 Oct): the floor he left stays in shot and the crown clears the
//      top by up to 22 px for up to 24 frames, under the marker (drawHeroAboveMarker).
//   G0 run.camTrace is present on every live frame (the bound/carry exemptions below depend on it).
//   G2 the camera's own slide (run.camTrace.own) <= 380 px/s on every frame where the crown
//      floor is not binding; on a binding frame the crane rides the hero's own rise (a double
//      pressed late outruns GUARD_SPEED for a few frames), so own may exceed his rise on the
//      screen by at most 380.
//   G3 camZoom is the tier's zoom on every frame after the opening hold.
//   G4 |Δpan| <= 6.4 px/frame outside crown-floor frames and pan-carry frames (the crane
//      coming down with a fall at the hero's own rate, run.camTrace.panCarry); on a pan-carry
//      frame the step may exceed the carry by <= 6.4.
//   G5 camFloorY is back within 2 px of 232 within 3 s of leaving the last route.
// Portrait: crown >= safe band top + 6, feet <= safe band bottom, |Δpan| <= 15.5 except on
// carried frames (a portrait transition or a camTrace carry), pan 0 at the stage start.
//
// STRICT: every failed check is printed and the process exits 1 (CAM_GATE_STRICT=0 reports only).
// A child that cannot run at all is always a failure. Runs from tests/run-all.js.
import { fileURLToPath } from 'node:url';
import { TIER_NAMES, tierChild, childMain, emit } from './camera-run-harness.js';

const STAGES = ['plumber-1', 'plumber-2', 'crypt-2', 'frost-1'];
const MODES = ['bot', 'upper', 'low', 'stairs'];
const G = Object.freeze({
  crownBoundMax: 14, offTopFramesMax: 15, ownMax: 380, ownBoundExcessMax: 380, dPanMax: 6.4, settleS: 3, floorTol: 2,
  phoneCrownBoundMax: 22, phoneOffTopFramesMax: 24,
  portraitCrownMargin: 6, portraitDPanMax: 15.5,
});

if (process.env.MASH_TIER) {
  emit(await childMain({ stages: STAGES, modes: MODES }));
  process.exit(0);
}

const SELF = fileURLToPath(import.meta.url);
const strict = process.env.CAM_GATE_STRICT !== '0';
const failures = [];
let checks = 0, hard = 0;
function check(name, ok, detail = '') {
  checks++;
  if (!ok) failures.push({ name, detail });
  return ok;
}

for (const tier of TIER_NAMES) {
  const before = failures.length;
  const child = tierChild(SELF, tier);
  if (!child.payload) {
    hard++;
    check(`${tier}: child ran`, false, `status ${child.status} ${child.error || ''} ${child.stderr.slice(-1500)}`);
    console.log(`${tier}: CHILD FAILED`);
    continue;
  }
  const P = child.payload;
  const portrait = tier === 'portrait';
  let ran = 0, skipped = 0;
  for (const s of P.scenarios) {
    const id = `${tier} ${s.stage} ${s.label}`;
    if (s.skipped) { skipped++; continue; }
    if (s.error) { hard++; check(`${id}: scenario ran`, false, s.error.split('\n').slice(0, 3).join(' | ')); continue; }
    ran++;
    if (s.mode === 'stairs') check(`${id}: the script reached the top step`, s.reachedTop === true, `steps ${JSON.stringify(s.steps)}`);
    if (portrait) {
      check(`${id} P1 crown >= band.top+${G.portraitCrownMargin}`, s.minCrownVsBand >= G.portraitCrownMargin, `min crown-band.top ${s.minCrownVsBand.toFixed(1)} (band ${s.band.top.toFixed(1)}..${s.band.bottom.toFixed(1)})`);
      check(`${id} P2 feet <= band.bottom`, s.maxFeetOverBand <= 0, `max feet-band.bottom ${s.maxFeetOverBand.toFixed(1)}`);
      check(`${id} P3 |dPan| <= ${G.portraitDPanMax} uncarried`, s.maxDPanUncarried <= G.portraitDPanMax, `max ${s.maxDPanUncarried.toFixed(2)} (carried max ${s.maxDPan.toFixed(2)})`);
      check(`${id} P4 pan 0 at start`, Math.abs(s.panAtStart) < 1e-6, `pan ${s.panAtStart}`);
      continue;
    }
    check(`${id} G1 feet never below H`, s.offBottom === 0, `${s.offBottom} frames, worst ${s.offBottomMax.toFixed(1)} px`);
    check(`${id} G1 crown above the top only while bound`, s.offTopUnbound === 0, `${s.offTopUnbound} unbound of ${s.offTop} off-top frames${s.traced ? '' : ' (no camTrace: nothing can count as bound)'}`);
    const phone = s.zoom >= 2.2 - 1e-9;
    const crownMax = phone ? G.phoneCrownBoundMax : G.crownBoundMax;
    const offTopMax = phone ? G.phoneOffTopFramesMax : G.offTopFramesMax;
    check(`${id} G1 crown <= ${crownMax} px above the top`, s.offTopMaxDepth <= crownMax, `worst ${s.offTopMaxDepth.toFixed(1)} px`);
    check(`${id} G1 <= ${offTopMax} off-top frames`, s.offTop <= offTopMax, `${s.offTop} frames (longest run ${s.offTopMaxRun})`);
    check(`${id} G0 camTrace on every live frame`, s.traced === s.frames - s.hold, `${s.traced} traced of ${s.frames - s.hold} live frames`);
    if (s.traced) {
      check(`${id} G2 own slide <= ${G.ownMax} outside crown-floor frames`, (s.maxOwnFree ?? 0) <= G.ownMax + 1e-6, `max ${(s.maxOwnFree ?? 0).toFixed(1)} px/s (bound max ${s.maxOwn.toFixed(1)})`);
      check(`${id} G2 crown-floor frames: own <= hero rise + ${G.ownBoundExcessMax}`, s.maxOwnBoundExcess <= G.ownBoundExcessMax + 1e-6, `max excess ${s.maxOwnBoundExcess.toFixed(1)} px/s (bound max ${s.maxOwn.toFixed(1)})`);
    }
    check(`${id} G3 zoom ${s.zoom} every live frame`, s.zoomMiss === 0, `${s.zoomMiss} frames off (first at frame ${s.zoomMissFirst}), min ${s.minZoom}`);
    check(`${id} G4 |dPan| <= ${G.dPanMax} outside crown-floor and pan-carry frames`, s.maxDPanFree <= G.dPanMax, `max ${s.maxDPanFree.toFixed(2)} px/frame (all-frames max ${s.maxDPan.toFixed(2)})`);
    check(`${id} G4 pan-carry frames step <= carry + ${G.dPanMax}`, s.maxDPanCarryExcess <= G.dPanMax, `max excess ${s.maxDPanCarryExcess.toFixed(2)} px/frame`);
    const settled = s.lastReleaseT == null || (s.settleAfter != null && s.settleAfter <= G.settleS) || (s.settleAfter == null && s.tailAfter < G.settleS);
    check(`${id} G5 floor back to 232±${G.floorTol} within ${G.settleS} s of the last route`, settled, `settled after ${s.settleAfter == null ? 'never' : s.settleAfter.toFixed(2) + ' s'} (tail ${s.tailAfter?.toFixed(1)} s, floor ${s.minFloor.toFixed(1)}..${s.maxFloor.toFixed(1)})`);
  }
  const n = failures.length - before;
  const byGate = {};
  for (const f of failures.slice(before)) { const g = f.name.match(/ (G\d|P\d)\b/)?.[1] || 'other'; byGate[g] = (byGate[g] || 0) + 1; }
  console.log(`${tier}: zoom ${P.zoom} H ${P.H}: ${ran} scenarios run, ${skipped} skipped, ${n} failed checks${n ? ' (' + Object.entries(byGate).map(([g, c]) => `${g} ${c}`).join(', ') + ')' : ''}`);
}

for (const f of failures) console.log(`FAIL: ${f.name} — ${f.detail}`);
const gateFails = failures.length - hard;
console.log(`\n${checks} checks, ${failures.length} failed (${hard} harness, ${gateFails} gate)${strict ? '' : ' — gate is NON-STRICT (set CAM_GATE_STRICT=1 to enforce)'}`);
const red = hard > 0 || (strict && failures.length > 0);
console.log(red ? 'CAMERA RUN OFFSCREEN: FAILED' : (failures.length ? 'CAMERA RUN OFFSCREEN: GATE NOT MET (reported, non-strict)' : 'CAMERA RUN OFFSCREEN: PASSED'));
process.exit(red ? 1 : 0);
