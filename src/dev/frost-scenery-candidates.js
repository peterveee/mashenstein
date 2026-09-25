// The Frost bake-off's earlier looks and the selected E production finish.
// The pack owns stage light, placement, slope, paper material and occlusion.
import { ridgeYAt } from '../engine/stylePacks/index.js';
import {
  frostPaperHillFinish, frostDeepSnowFeature, FROST_COMBINED_SCENERY_FINISH,
} from '../engine/stylePacks/frostSceneryFinish.js';

function fill(ctx, color, path) {
  ctx.fillStyle = color;
  ctx.beginPath();
  path(ctx);
  ctx.closePath();
  ctx.fill();
}
function line(ctx, color, width, path) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path(ctx);
  ctx.stroke();
}
function ridgeLine(ctx, info, offset, color, width = 1, span = null) {
  const { coverage, camX, baseY, amp, wl, factor, layer } = info;
  const left = span ? Math.max(coverage.left, span[0]) : coverage.left;
  const right = span ? Math.min(coverage.right, span[1]) : coverage.right;
  if (right <= left) return;
  line(ctx, color, width, (c) => {
    for (let x = left, i = 0; x <= right + 3; x += 3, i++) {
      const y = ridgeYAt(x, camX, baseY, amp, wl, factor,
        { coverageLeft: coverage.left }) + offset;
      if (!i) c.moveTo(x, y); else c.lineTo(x, y);
    }
  });
}

function facetHills(ctx, info) {
  const { coverage, camX, baseY, amp, wl, factor } = info;
  const period = Math.round(Math.PI * wl);
  const travel = camX * factor * 2;
  for (let k = Math.floor((travel - coverage.left) / period) - 1;
    k < Math.ceil((travel + coverage.right) / period) + 1; k++) {
    const x = coverage.left + k * period + period * 0.48 - travel;
    const crest = ridgeYAt(x, camX, baseY, amp, wl, factor,
      { coverageLeft: coverage.left });
    if (x < coverage.left - 70 || x > coverage.right + 70) continue;
    fill(ctx, 'rgba(235,249,255,0.10)', (c) => {
      c.moveTo(x - 17, crest + 22); c.lineTo(x + 1, crest + 7);
      c.lineTo(x + 8, crest + 16); c.lineTo(x + 23, crest + 31);
      c.lineTo(x - 5, crest + 38); c.lineTo(x - 11, crest + 30);
    });
    line(ctx, 'rgba(39,79,111,0.18)', 0.75, (c) => {
      c.moveTo(x + 1, crest + 7); c.lineTo(x - 5, crest + 38);
      c.moveTo(x + 1, crest + 7); c.lineTo(x + 8, crest + 16);
    });
  }
}

function softHills(ctx, info) {
  const period = Math.round(Math.PI * info.wl);
  const travel = info.camX * info.factor * 2;
  for (let k = Math.floor(travel / period) - 2;
    k < Math.ceil((travel + info.coverage.right) / period) + 2; k++) {
    const x = info.coverage.left + k * period - travel;
    ridgeLine(ctx, info, 3.5, 'rgba(250,252,255,0.54)', 2.2,
      [x + period * 0.19, x + period * 0.43]);
    ridgeLine(ctx, info, 7, 'rgba(235,244,250,0.20)', 1.6,
      [x + period * 0.59, x + period * 0.76]);
  }
}

function strataFeature(ctx, f, p) {
  switch (f.kind) {
    case 'ice-rock':
      fill(ctx, 'rgba(39,75,99,0.43)', (c) => {
        c.moveTo(-4.5, -10.6); c.lineTo(-1, -8.1); c.lineTo(-3, -2.4);
        c.lineTo(2, 1.5); c.lineTo(-3.5, 0); c.lineTo(-7.5, -3.5);
      });
      line(ctx, 'rgba(239,249,251,0.75)', 0.85, (c) => {
        c.moveTo(-10, -4.3); c.lineTo(-5, -6); c.lineTo(-1, -5.2);
        c.moveTo(3, -6.8); c.lineTo(8.8, -3.2);
      });
      break;
    case 'glacier':
      fill(ctx, 'rgba(29,65,91,0.22)', (c) => {
        c.moveTo(1, -46); c.lineTo(3, -31); c.lineTo(-5, -13);
        c.lineTo(-11, 24); c.lineTo(-1, 44); c.lineTo(7, 44); c.lineTo(6, -8);
      });
      line(ctx, 'rgba(237,249,254,0.65)', 1.25, (c) => {
        c.moveTo(1, -45); c.lineTo(-6, -17); c.lineTo(-10, 4);
        c.moveTo(15, -35); c.lineTo(12, -12); c.lineTo(17, 5);
      });
      break;
    case 'pine':
      line(ctx, 'rgba(244,251,252,0.82)', 1.15, (c) => {
        c.moveTo(-3.9, -11); c.lineTo(-0.7, -11);
        c.moveTo(-6.2, -5); c.lineTo(0.3, -5);
        c.moveTo(2, -3); c.lineTo(6.4, -3);
      });
      break;
    case 'snowbank':
      line(ctx, 'rgba(245,252,255,0.75)', 1, (c) => {
        c.moveTo(-12, -2); c.quadraticCurveTo(-6, -7, -1, -3);
        c.moveTo(4, -3); c.quadraticCurveTo(10, -6, 14, -2);
      });
      break;
  }
}

function facetFeature(ctx, f) {
  if (f.kind === 'ice-rock') {
    fill(ctx, 'rgba(226,246,255,0.62)', (c) => {
      c.moveTo(-5, -11); c.lineTo(3, -9); c.lineTo(-1, -3); c.lineTo(-4, -5);
    });
    fill(ctx, 'rgba(30,75,110,0.40)', (c) => {
      c.moveTo(3, -9); c.lineTo(10, -4); c.lineTo(5, 1); c.lineTo(-1, -3);
    });
    line(ctx, 'rgba(239,253,255,0.9)', 0.8, (c) => {
      c.moveTo(-5, -11); c.lineTo(3, -9); c.lineTo(10, -4);
    });
  } else if (f.kind === 'glacier') {
    fill(ctx, 'rgba(224,246,255,0.42)', (c) => {
      c.moveTo(-14, -30); c.lineTo(-8, -20); c.lineTo(-5, 11);
      c.lineTo(-15, 40); c.lineTo(-23, 38);
    });
    fill(ctx, 'rgba(31,78,116,0.22)', (c) => {
      c.moveTo(1, -47); c.lineTo(8, -27); c.lineTo(2, 16);
      c.lineTo(8, 43); c.lineTo(-3, 43); c.lineTo(-6, 11);
    });
    line(ctx, 'rgba(239,251,255,0.7)', 0.8, (c) => {
      c.moveTo(1, -46); c.lineTo(-6, 11); c.lineTo(-2, 31);
      c.moveTo(15, -35); c.lineTo(12, -5); c.lineTo(18, 19);
    });
  } else if (f.kind === 'pine') {
    for (const [y, w] of [[-11, 4], [-5, 5.7], [-3, 7]]) {
      fill(ctx, 'rgba(243,251,255,0.85)', (c) => {
        c.moveTo(-w, y); c.quadraticCurveTo(-1, y + 1.3, 0, y + 0.5);
        c.lineTo(w * 0.36, y + 0.5); c.lineTo(0, y - 1.4);
      });
    }
  } else if (f.kind === 'snowbank') {
    line(ctx, 'rgba(56,108,143,0.38)', 1.2, (c) => {
      c.moveTo(-11, -3); c.quadraticCurveTo(-7, -6, -2, -3);
      c.moveTo(2, -4); c.quadraticCurveTo(7, -8, 13, -2);
    });
  }
}

export const FROST_SCENERY_CANDIDATES = Object.freeze([
  { id: 'previous', letter: 'A', name: 'Previous Frost',
    note: 'The earlier scene, before E was selected. The control for every stage and camera.' },
  { id: 'strata', letter: 'B', name: 'Stratified stone',
    note: 'Snow rims and restrained rock seams give the hills, outcrops and glacier a clearer cut-paper profile.',
    study: { hill: frostPaperHillFinish, feature: strataFeature } },
  { id: 'facets', letter: 'C', name: 'Blue ice facets',
    note: 'Angular ice planes strengthen the rocks and glacier; smaller snow facets repeat on the hills and pines.',
    study: { hill: facetHills, feature: facetFeature } },
  { id: 'snow', letter: 'D', name: 'Deep snow',
    note: 'Broken snow lips soften the ridges and settle over rocks, trees and drifts.',
    study: { hill: softHills, feature: frostDeepSnowFeature } },
  { id: 'strata-snow', letter: 'E', name: 'Paper hills + deep snow',
    note: 'SHIPS: B\'s restrained hill seams with D\'s deeper snow on rocks, pines, glacier and drifts.',
    study: FROST_COMBINED_SCENERY_FINISH },
]);
