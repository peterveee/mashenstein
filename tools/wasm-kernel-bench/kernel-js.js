/*
 * Stage 1 of docs/WASM-audio-engine-plan.md: the JS side of the kernel bench.
 *
 * The same loop as kernel.c, written the way Mrdr3Core.process is written (objects with
 * plain double fields, the inner loop hoisted the same way) and built on the PRODUCTION
 * primitives — Mrdr3Biquad, mrdr3Read and mrdr3Level come straight from the source
 * strings src/engine/mrdr3/ ships. So the JS number is what the shipping JS core pays for
 * this work, not a strawman written to lose.
 *
 * A source string, like the core, so it runs unchanged in Node, a worker and a worklet.
 */
import { MRDR3_PRIMITIVES_SOURCE } from '../../src/engine/mrdr3/primitives.js';
import { MRDR3_OSC_SOURCE } from '../../src/engine/mrdr3/osc.js';
import { MRDR3_TABLE_SIZE, MRDR3_LEVELS, mrdr3Pyramid } from '../../src/engine/mrdr3/tables.js';

const KERNEL = `
function KernelJs(plan, data) {
  this.rate = plan.rate;
  this.data = data;
  this.size = ${MRDR3_TABLE_SIZE};
  this.stride = ${MRDR3_TABLE_SIZE + 1};
  this.levels = ${MRDR3_LEVELS};
  this.unison = plan.unison;
  this.outL = new Float32Array(128);
  this.outR = new Float32Array(128);
  this.groups = [];
  for (var g = 0; g < plan.groups.length; g++) {
    var s = plan.groups[g];
    var grp = {
      v: [], vibPhase: [], vibRate: [], vibRatio: [0, 0, 0, 0], vibLevel: [0, 0, 0, 0],
      vibDepth: s.vibDepth,
      lf: [new Mrdr3Biquad(plan.rate), new Mrdr3Biquad(plan.rate)],
      gf: [new Mrdr3Biquad(plan.rate), new Mrdr3Biquad(plan.rate)],
      lEnv: 1, lEnvCoef: s.lEnvCoef, lFreq: s.lFreq, lQ: s.lQ, lOct: s.lOct, lastLfq: NaN,
      gEnv: 1, gEnvCoef: s.gEnvCoef, gFreq: s.gFreq, gQ: s.gQ, gOct: s.gOct, lastGfq: NaN,
      amp: 0, ampCoef: s.ampCoef, ampSus: s.ampSus,
      vca: 0, vcaCoef: s.vcaCoef, vcaSus: s.vcaSus, gain: s.gain,
    };
    for (var u = 0; u < plan.unison; u++) {
      var w = s.voices[u];
      grp.v.push({ phase: w.phase, hzNow: w.hzNow, levelNow: w.levelNow, gain: w.gain, panL: w.panL, panR: w.panR });
      grp.vibRate.push(w.vibRate);
      grp.vibPhase.push(w.vibPhase);
    }
    this.groups.push(grp);
  }
}

KernelJs.prototype.render = function (frames) {
  var rate = this.rate, data = this.data, size = this.size, stride = this.stride;
  var nyquist = rate * 0.5;
  var topLevel = this.levels - 1;
  var groups = this.groups, nGroups = groups.length, nUnison = this.unison;
  var outL = this.outL, outR = this.outR;
  for (var n = 0; n < frames; n++) {
    var mixL = 0, mixR = 0;
    for (var g = 0; g < nGroups; g++) {
      var grp = groups[g];
      for (var i = 0; i < nUnison; i++) {
        grp.vibPhase[i] += grp.vibRate[i] / rate;
        if (grp.vibPhase[i] >= 1) grp.vibPhase[i] -= 1;
        var c = Math.sin(MRDR3_TAU * grp.vibPhase[i]) * grp.vibDepth;
        grp.vibRatio[i] = Math.pow(2, c / 1200);
        grp.vibLevel[i] = c / 1200;
      }
      var layL = 0, layR = 0;
      for (var u = 0; u < nUnison; u++) {
        var uv = grp.v[u];
        var hz = uv.hzNow * grp.vibRatio[u];
        if (hz > nyquist) hz = nyquist; else if (hz < -nyquist) hz = -nyquist;
        var inc = hz / rate;
        var level = uv.levelNow + grp.vibLevel[u];
        if (level < 0) level = 0; else if (level > topLevel) level = topLevel;
        var v = mrdr3Read(data, stride, size, level, uv.phase) * uv.gain;
        uv.phase += inc;
        if (uv.phase >= 1) uv.phase -= 1; else if (uv.phase < 0) uv.phase += 1;
        layL += v * uv.panL;
        layR += v * uv.panR;
      }
      grp.lEnv *= grp.lEnvCoef;
      var lcents = grp.lOct * 1200 * grp.lEnv;
      var lfq = grp.lFreq * Math.pow(2, lcents / 1200);
      if (lfq !== grp.lastLfq) {
        grp.lastLfq = lfq;
        grp.lf[0].setCoeffs(lfq, grp.lQ);
        grp.lf[1].setCoeffs(lfq, 0.7071);
      }
      for (var s = 0; s < 2; s++) {
        layL = grp.lf[s].stepL(layL);
        layR = grp.lf[s].stepR(layR);
      }
      grp.amp = grp.amp * grp.ampCoef + grp.ampSus * (1 - grp.ampCoef);
      var toneL = layL * grp.amp;
      var toneR = layR * grp.amp;

      grp.gEnv *= grp.gEnvCoef;
      var gcents = grp.gOct * 1200 * grp.gEnv;
      var gfq = grp.gFreq * Math.pow(2, gcents / 1200);
      if (gfq !== grp.lastGfq) {
        grp.lastGfq = gfq;
        grp.gf[0].setCoeffs(gfq, grp.gQ);
        grp.gf[1].setCoeffs(gfq, 0.7071);
      }
      for (var s2 = 0; s2 < 2; s2++) {
        toneL = grp.gf[s2].stepL(toneL);
        toneR = grp.gf[s2].stepR(toneR);
      }
      grp.vca = grp.vca * grp.vcaCoef + grp.vcaSus * (1 - grp.vcaCoef);
      toneL *= grp.vca;
      toneR *= grp.vca;
      mixL += toneL * grp.gain;
      mixR += toneR * grp.gain;
    }
    outL[n] = mixL;
    outR[n] = mixR;
  }
};
`;

/** Everything the JS kernel needs, as one evaluable string (Node, worker, worklet). */
export const KERNEL_JS_SOURCE = [
  'var MRDR3_TAU = 6.283185307179586;',
  MRDR3_PRIMITIVES_SOURCE, MRDR3_OSC_SOURCE, KERNEL,
].join('\n');

export const KERNEL_SIZE = MRDR3_TABLE_SIZE;
export const KERNEL_LEVELS = MRDR3_LEVELS;

/** The sawtooth pyramid both kernels read. */
export const kernelTable = () => mrdr3Pyramid('sawtooth');

/**
 * The shapes benched, chosen to bracket the library — the Phase 0 verdict's shapes:
 * a 6-note pad with a 4-voice unison stack (bestVowelPad-like), an 8-voice section with
 * 2 each (mrdrViolinSection-like), a 2-voice lead, and a bare mono line.
 */
export const KERNEL_SHAPES = Object.freeze([
  { name: 'pad 6x4', groups: 6, unison: 4 },
  { name: 'section 8x2', groups: 8, unison: 2 },
  { name: 'lead 1x2', groups: 1, unison: 2 },
  { name: 'mono 1x1', groups: 1, unison: 1 },
]);

/**
 * Every setup value, computed once, here, in JS, for both kernels — so the only thing
 * being compared is per-sample work. Deterministic: no Math.random.
 */
export function kernelPlan({ groups, unison, rate = 44100 }) {
  const size = MRDR3_TABLE_SIZE;
  const lowest = rate / size;
  const levelOf = (hz) => {
    if (!(hz > lowest)) return 0;
    const lv = Math.log2(hz / lowest);
    return lv < 0 ? 0 : Math.min(MRDR3_LEVELS - 1, lv);
  };
  const roots = [110, 138.59, 164.81, 220, 277.18, 329.63, 440, 554.37, 659.25, 880, 1108.73, 1318.51];
  const spread = [0, -12, 12, -7, 7];
  const plan = { rate, unison, groups: [] };
  const tc = (seconds) => Math.exp(-1 / (seconds * rate));
  for (let g = 0; g < groups; g++) {
    const base = roots[g % roots.length];
    const voices = [];
    for (let u = 0; u < unison; u++) {
      const cents = spread[u % spread.length];
      const hzNow = base * Math.pow(2, cents / 1200);
      const pan = unison > 1 ? (u / (unison - 1)) * 2 - 1 : 0;
      const x = (pan * 0.6 + 1) * 0.25 * Math.PI;
      voices.push({
        hzNow, levelNow: levelOf(hzNow), phase: ((g * 7 + u * 3) % 11) / 11,
        gain: 1 / unison, panL: Math.cos(x), panR: Math.sin(x),
        vibRate: 5 + 0.2 * u, vibPhase: u * 0.25,
      });
    }
    plan.groups.push({
      voices, vibDepth: 12,
      lFreq: 900, lQ: 4, lOct: 3, lEnvCoef: tc(0.8),
      gFreq: 2400, gQ: 1, gOct: 2, gEnvCoef: tc(1.6),
      ampCoef: tc(0.01), ampSus: 0.8, vcaCoef: tc(0.005), vcaSus: 1,
      gain: 0.3,
    });
  }
  return plan;
}

/** Load a plan into an instantiated wasm kernel. */
export function loadWasmKernel(exports, plan, table) {
  new Float32Array(exports.memory.buffer, exports.tablePtr(), table.length).set(table);
  exports.setup(plan.groups.length, plan.unison, plan.rate);
  plan.groups.forEach((s, g) => {
    exports.setGroup(g, s.vibDepth, s.lFreq, s.lQ, s.lOct, s.lEnvCoef,
      s.gFreq, s.gQ, s.gOct, s.gEnvCoef, s.ampCoef, s.ampSus, s.vcaCoef, s.vcaSus, s.gain);
    s.voices.forEach((v, u) => exports.setVoice(g, u, v.hzNow, v.levelNow, v.phase, v.gain,
      v.panL, v.panR, v.vibRate, v.vibPhase));
  });
  return {
    outL: new Float32Array(exports.memory.buffer, exports.outLPtr(), 128),
    outR: new Float32Array(exports.memory.buffer, exports.outRPtr(), 128),
  };
}
