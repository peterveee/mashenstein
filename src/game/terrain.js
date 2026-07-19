// Broad, deterministic foreground hills for selected cabinets. Heights stay
// modest so obstacle spacing and jump timing remain familiar.
import { W } from '../engine/renderer.js';

const PROFILES = {
  plumber:   { amp: 16, period: 430, phase: 0 },
  speed:     { amp: 10, period: 560, phase: 120 },
  frost:     { amp: 14, period: 500, phase: 250 },
  cardboard: { amp: 18, period: 460, phase: 80 },
  office:    { amp: 9, period: 620, phase: 310 },
};

export function terrainHeight(cabinet, worldX) {
  const p = cabinet && PROFILES[cabinet.id];
  if (!p) return 0;
  const wave = (Math.sin(((worldX + p.phase) / p.period) * Math.PI * 2 - Math.PI / 2) + 1) / 2;
  const rounded = wave * wave * (3 - 2 * wave);
  const intro = Math.min(1, Math.max(0, worldX / 280));
  return p.amp * rounded * intro;
}

export function terrainGroundY(cabinet, worldX, baseY = 232) {
  return baseY - terrainHeight(cabinet, worldX);
}

export function drawTerrain(ctx, camX, cabinet, obstacles, baseY = 232) {
  if (!PROFILES[cabinet && cabinet.id]) return;
  const gaps = (obstacles || []).filter((ob) => ob.live && ob.def && ob.def.isGap);
  const inGap = (worldX) => gaps.some((g) => worldX >= g.x && worldX <= g.x + g.w);

  ctx.fillStyle = cabinet.groundDark;
  for (let x = 0; x <= W; x += 2) {
    const worldX = camX + x;
    if (inGap(worldX)) continue;
    const y = terrainGroundY(cabinet, worldX, baseY);
    ctx.fillRect(x, y, 3, baseY - y + 4);
  }

  ctx.strokeStyle = cabinet.ground;
  ctx.lineWidth = 2;
  ctx.beginPath();
  let drawing = false;
  for (let x = 0; x <= W; x += 2) {
    const worldX = camX + x;
    if (inGap(worldX)) { drawing = false; continue; }
    const y = terrainGroundY(cabinet, worldX, baseY);
    if (!drawing) { ctx.moveTo(x, y); drawing = true; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
}
