// Gallery-only: THE ANIMALS AT LOWER RESOLUTION — an A/B (16 Oct 2026).
//
// The planted gallop doubled every running animal's ring to 16 frames, and with it the
// canvas cache (Crypt ~+5MB, Speed's bobcat ~+3MB). The cheap way back is a lower
// ANIMAL_DETAIL — Peter: "a/b the lower res in gallery for one or 2". Each tile draws the
// SAME animal three times through the prop raster's own arithmetic (sprites/props.js
// propSprite: a canvas of def box x detail x SS 8, drawn back over the def box x 4/3 x
// ANIMAL_VISUAL), at detail 2 (shipped), 1.5 and 1, in its own lane.
//
// The tile renders at 8 device pixels per world unit: the most any player sees an
// animal at (desktop ZOOM 1.6 x the top density rung, 5). A phone at ZOOM 2.2 is under
// that at every rung but the top one. So if there is no difference here, there is none.
import { ANIMAL_PAINTERS, ANIMAL_TALL, ANIMAL_VISUAL, ANIMAL_FPS, ANIMAL_FRAMES } from '../sprites/animals.js';
import { OBSTACLES } from '../game/entities.js';
import { drawCabinetLane } from './obstacle-bakeoff-kit.js';
import { GROUND_Y } from '../engine/camera.js';

const SS = 8;
export const DETAIL_AB_LEVELS = [2, 1.5, 1];
export const DETAIL_AB_RS = 4; // x the lane's world x2 = 8 device px per world unit

const cache = new Map();
function raster(name, detail, frame) {
  const key = `${name}|${detail}|${frame}`;
  if (cache.has(key)) return cache.get(key);
  const def = OBSTACLES[name];
  const rw = def.w * detail, rh = def.h * ANIMAL_TALL[name] * detail;
  const c = document.createElement('canvas');
  c.width = Math.round(rw * SS); c.height = Math.round(rh * SS);
  const x = c.getContext('2d');
  x.scale(SS, SS); x.lineJoin = 'round'; x.lineCap = 'round';
  ANIMAL_PAINTERS[name](x, rw, rh, frame);
  cache.set(key, c);
  return c;
}

// The memory a ring costs at a detail: frames x the raster.
export function ringMB(name, detail) {
  const def = OBSTACLES[name];
  const px = Math.round(def.w * detail * SS) * Math.round(def.h * ANIMAL_TALL[name] * detail * SS);
  return (px * 4 * ANIMAL_FRAMES[name]) / 1e6;
}

export function drawDetailAB(ctx, t, name, cabId, strip) {
  const def = OBSTACLES[name];
  const frames = ANIMAL_FRAMES[name];
  const frame = Math.floor(t * ANIMAL_FPS[name]) % frames;
  const w0 = def.w * 4 / 3 * ANIMAL_VISUAL[name];
  const h0 = def.h * 4 / 3 * ANIMAL_TALL[name] * ANIMAL_VISUAL[name];
  const xs = [52, 120, 188].map((x) => x - def.w / 2);
  drawCabinetLane(ctx, t, cabId, [strip], (c) => {
    DETAIL_AB_LEVELS.forEach((d, i) => {
      const bx = xs[i];
      c.imageSmoothingEnabled = true;
      c.drawImage(raster(name, d, frame), bx - (w0 - def.w) / 2, GROUND_Y - h0, w0, h0);
      c.save();
      c.font = '700 4px ui-monospace, Menlo, monospace'; c.textAlign = 'center';
      const label = `${d === 2 ? '2 (now)' : d} · ${ringMB(name, d).toFixed(1)}MB`;
      c.fillStyle = 'rgba(16,14,22,0.8)'; c.fillRect(bx + def.w / 2 - 22, GROUND_Y + 3, 44, 6);
      c.fillStyle = '#f6d33c'; c.fillText(label, bx + def.w / 2, GROUND_Y + 7.4);
      c.restore();
    });
  }, { hero: null });
}
