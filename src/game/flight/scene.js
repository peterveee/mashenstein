// The act-ending flight's pictures, shared by both sides of the handoff.
//
// The run draws the tub he boards, the cabinet edge the camera passes and the
// passage behind it while it is still the run; the flight draws the same tub,
// the same Eggshell and the same passage once it has taken over. One painter
// for each, so the frame the run hands over and the first frame the flight
// draws are the same picture by construction rather than by matching numbers.
import { W, H, bakeSS, presentationFrame, isPhonePortraitPresentation } from '../../engine/renderer.js';
import { drawToon } from '../../sprites/toons.js';
import { eggshellCopterArt } from '../../sprites/props.js';
import { cabinetPalette } from '../../sprites/arcade.js';
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { copterFrame, copterLamps } from '../draw.js';
import { portraitHudLayout } from '../portrait-layout.js';
import { flightLayout } from './model.js';
import { GROUND_Y } from '../../engine/camera.js';

// Where the flight's HUD plate starts: under the portrait status-bar wash
// (PORTRAIT_HUD_TOP_CLEARANCE_CSS, via the run's own layout), at the safe top
// in landscape. The run asks the same question while it hands over, so both
// sides agree on where the chase is flown.
export function flightHudTop(frame = presentationFrame()) {
  const safeTop = Number(frame?.safeRect?.top) || 0;
  if (!isPhonePortraitPresentation()) return safeTop;
  return Math.max(safeTop, portraitHudLayout(frame).statusY - 7);
}
export function currentFlightLayout(frame = presentationFrame()) {
  return flightLayout(W, H, frame?.safeRect || {}, { hudTop: flightHudTop(frame) });
}

export function plate(c, x, y, w, h, colour, r = 4) {
  c.fillStyle = colour; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
}

// ---------------------------------------------------------------- the tub
//
// Authored where the hero is 24 tall (the run's HERO_DRAW_H), with its floor —
// where his feet stand — at the origin. The run draws it at u = 1 inside its
// world transform; the flight scales u to its own hero. The front wall comes
// up to his hips, so he stands in it the way Eggshell stands in his.
export const TUB = { halfW: 13, rimY: -9.6, bottom: 4, baseY: 5.2, hoverY: 7 };
const TUB_INK = '#2a2836';
const TUB_LW = 0.35;

function tubBodyPath(k) {
  k.beginPath();
  k.roundRect(-TUB.halfW, -9, TUB.halfW * 2, 13, [2, 2, 4.5, 4.5]);
}

// thrust 0..1: the jet under the base. squash: the landing's give, 0..1.
export function drawHeroTub(c, cx, floorY, o = {}) {
  const { u = 1, thrust = 0, t = 0 } = o;
  c.save();
  c.translate(cx, floorY);
  c.scale(u, u);
  c.lineJoin = 'round';
  // The jet first, so the base sits over its root.
  if (thrust > 0.01) {
    const flick = 0.82 + 0.18 * Math.sin(t * 47) * Math.sin(t * 31 + 1.3);
    const len = (2.2 + 6.2 * thrust) * flick;
    const g = c.createLinearGradient(0, 6, 0, 6 + len);
    g.addColorStop(0, `rgba(236,252,255,${0.95 * Math.min(1, thrust * 1.6)})`);
    g.addColorStop(0.35, `rgba(120,226,244,${0.75 * Math.min(1, thrust * 1.4)})`);
    g.addColorStop(1, 'rgba(120,226,244,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-3.4, 6.2);
    c.quadraticCurveTo(0, 6.2 + len * 1.25, 3.4, 6.2);
    c.closePath();
    c.fill();
  }
  // The hover base: a squat dark dome under the hull.
  c.fillStyle = '#3a3d4a';
  c.beginPath(); c.ellipse(0, TUB.baseY, 8.5, 2.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = TUB_INK; c.lineWidth = TUB_LW; c.stroke();
  c.fillStyle = '#5b6070';
  c.beginPath(); c.ellipse(0, TUB.baseY - 0.9, 6.2, 1.1, 0, Math.PI, Math.PI * 2); c.fill();
  // The gun: auto-fire leaves from here, so it points the way he is chasing.
  c.fillStyle = '#586279';
  c.beginPath(); c.roundRect(TUB.halfW - 0.4, -5.6, 4.6, 2.6, 0.8); c.fill();
  c.strokeStyle = TUB_INK; c.stroke();
  c.fillStyle = '#f2c14e';
  c.beginPath(); c.arc(TUB.halfW + 4.6, -4.3, 1.45, 0, Math.PI * 2); c.fill(); c.stroke();
  // Hull, its lower shade, the stripe and the lamps, all clipped to the hull.
  tubBodyPath(c);
  c.fillStyle = '#e9edf3'; c.fill();
  c.save();
  tubBodyPath(c); c.clip();
  c.fillStyle = '#d3dae4'; c.fillRect(-TUB.halfW, 1.4, TUB.halfW * 2, 3);
  c.fillStyle = '#36bec8'; c.fillRect(-3, -9, 6, 13);
  c.fillStyle = '#2ea3ad'; c.fillRect(-3, 1.4, 6, 3);
  c.restore();
  for (const x of [-8.4, 8.4]) {
    c.fillStyle = '#68d9f0';
    c.beginPath(); c.arc(x, -2.2, 2.2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a8fb0'; c.lineWidth = TUB_LW; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(x - 0.7, -2.9, 0.62, 0, Math.PI * 2); c.fill();
  }
  tubBodyPath(c);
  c.strokeStyle = TUB_INK; c.lineWidth = TUB_LW; c.stroke();
  // The rim, a hair wider than the hull, over his waist.
  c.fillStyle = '#f8f7fa';
  c.beginPath(); c.roundRect(-TUB.halfW - 1, -10.4, TUB.halfW * 2 + 2, 2.6, 1.2); c.fill();
  c.stroke();
  c.restore();
}

// The tub with the hero standing in it. `pose` is the toon pose; `drawn` lets
// the run hand its own hero painter in instead (it draws him through the
// sprite path, at run size, with the overlay transform it already has).
export function drawTubbedHero(c, heroId, cx, floorY, o = {}) {
  const { u = 1, pose = { kind: 'idle', grounded: true }, drawHero = null } = o;
  if (drawHero) drawHero(c);
  else drawToon(c, heroId, pose, cx, floorY, 24 * u);
  drawHeroTub(c, cx, floorY, o);
}

// ---------------------------------------------------------------- flight scale
//
// The flight's hero is 50 tall at scale 1, which is what the prototype the
// fight was tuned on drew; `cy` is the model's hero y. The tub's floor sits so
// the gun's tip is where the model launches pellets (PELLET_MUZZLE, +7 down),
// which leaves the hit box over his chest and the rim.
export const FLIGHT_HERO_H = 50;
export function flightHeroFloor(cy, scale) { return cy + 16 * scale; }

export function drawFlightHero(c, heroId, cx, cy, scale, o = {}) {
  const u = FLIGHT_HERO_H * scale / 24;
  const floorY = flightHeroFloor(cy, scale) + (o.dip || 0) * u;
  drawTubbedHero(c, heroId, cx, floorY, {
    u, thrust: o.thrust ?? 0.4, t: o.t || 0,
    pose: { kind: 'idle', grounded: true, time: o.t || 0 },
  });
}

// Eggshell in his copter tub, painted live (his face moves). `cx, cy` is the
// centre of the art box; `size` is its side. The rotor turns once a beat and
// the headlamps blink on the song, exactly as they do in the chase.
export function drawFlightBoss(c, cx, cy, size, o = {}) {
  const { t = 0, beat = null, mood = 'flat', look = -0.75, hitT = 0, pop = 0, parts = null } = o;
  const beatPhase = Number.isFinite(beat) ? ((beat % 1) + 1) % 1 : null;
  const frame = copterFrame(t, beatPhase);
  const { lamp, ink } = copterLamps({ shieldT: 0, hitT }, beat);
  const face = {
    look: Math.max(-1, Math.min(1, look + Math.sin(t * 0.9) * 0.12)),
    mood,
    blink: t % 3.4 < 0.11 ? 1 : 0,
    twitch: [t % 5.3 < 0.22 ? 1 : 0, t % 3.9 < 0.18 ? 1 : 0],
  };
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  eggshellCopterArt(c, size, size, frame, { face, lamp, lampInk: ink, pop, parts });
  c.restore();
}
// The prototype's anchor: the art box centre sits 7 units above the model's y.
export function flightBossCentre(by, scale) { return by - 7 * scale; }
export const FLIGHT_BOSS_SIZE = 72;

// ---------------------------------------------------------------- the passage
//
// Behind the machines: rows of cabinet backs, a rail top and bottom with a
// lamp every 150px. `scroll` is how far the camera has travelled in px; the
// rails are at the camera's depth and the cabinet backs behind them at 0.45.
const TILE_W = 240, TILE_H = 200;
let tile = null, tileSS = 0;
function passageTile() {
  const ss = bakeSS();
  if (tile && tileSS === ss) return tile;
  tile = document.createElement('canvas');
  tile.width = TILE_W * ss; tile.height = TILE_H * ss; tileSS = ss;
  const c = tile.getContext('2d');
  c.scale(ss, ss);
  c.fillStyle = '#1e1929'; c.fillRect(0, 0, TILE_W, TILE_H);
  for (let i = 0; i < 3; i++) {
    const x = i * 80 + 4;
    plate(c, x, 4, 72, 192, '#302733', 5);
    plate(c, x + 7, 20, 58, 161, '#292431', 3);
    for (const y of [27, 172]) for (const dx of [13, 59]) { c.fillStyle = '#49404c'; c.fillRect(x + dx, y, 2, 2); }
    for (let v = 0; v < 5; v++) { c.fillStyle = '#171522'; c.fillRect(x + 23, 70 + v * 5, 27, 2); }
    plate(c, x + 28, 148, 15, 17, '#191724', 2);
    c.strokeStyle = '#13111d'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 35, 158); c.bezierCurveTo(x + 35, 196, x + 70, 180, x + 76, 200); c.stroke();
  }
  return tile;
}
// Warm the one baked piece before it is needed (the run calls this in enter()).
export function warmPassage() { passageTile(); }

// The rail lamps are the arcade's power banks, every third lamp one bank: an
// act's victory brings its bank on (a wave from the left at `waveX`), and the
// ones earlier acts restored stay lit when the passage is next visited.
export const PASSAGE_LAMPS = { off: '#6f8f73', on: '#fff0a5' };
const LAMP_STEP = 150;

export function drawPassage(c, o) {
  const { scroll = 0, top, bottom, banks = 0, waveBank = null, waveX = -Infinity, stealX = Infinity } = o;
  c.fillStyle = '#191523'; c.fillRect(0, 0, W, H);
  const art = passageTile();
  const offset = ((scroll * 0.45) % TILE_W + TILE_W) % TILE_W;
  c.globalAlpha = 0.75;
  for (let x = -offset; x < W; x += TILE_W) {
    for (let y = 55; y < H; y += TILE_H) c.drawImage(art, x, y, TILE_W, TILE_H);
  }
  c.globalAlpha = 1;
  c.fillStyle = '#17132166'; c.fillRect(0, top, W, bottom - top);
  const step = ((scroll % LAMP_STEP) + LAMP_STEP) % LAMP_STEP;
  const first = Math.floor(scroll / LAMP_STEP);
  for (const y of [top - 12, bottom + 12]) {
    for (let j = 0; j < 3; j++) { c.fillStyle = ['#0e0d16', '#3b3041', '#272330'][j]; c.fillRect(0, y + j * 3, W, 2); }
    for (let i = 0, x = -step; x < W; i++, x += LAMP_STEP) {
      plate(c, x, y - 8, 23, 20, '#46394b', 2);
      const bank = (((first + i) % 3) + 3) % 3;
      // `waveBank` comes on from the left up to waveX; BACKUP POWER takes the
      // lit ones back from the right, down to stealX.
      const on = (bank < banks || ((waveBank === 'all' || bank === waveBank) && x + 10 < waveX)) && x + 10 < stealX;
      c.fillStyle = on ? PASSAGE_LAMPS.on : PASSAGE_LAMPS.off; c.fillRect(x + 8, y - 3, 5, 8);
      if (on) { c.fillStyle = 'rgba(255,240,165,0.16)'; c.fillRect(x + 3, y - 7, 15, 16); }
    }
  }
}

// ---------------------------------------------------------------- the cabinet edge
//
// What the camera passes on its way out of the screen: the glass's edge, the
// recessed bezel (dark at the top, lit at the bottom, as every food-court
// cabinet wears it), the casing, its seam and screws, the moulded edge, and
// the shadow the machine throws on the passage. Opaque everywhere it is drawn:
// the run and the flight swap who is painting each actor while this is over
// him, so it must hide both pictures completely.
export function edgeBandWidth(portrait) { return portrait ? 176 : 124; }

function hexMix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}
const lighten = (c, t) => hexMix(c, '#ffffff', t);
const darken = (c, t) => hexMix(c, '#100c18', t);

export function drawCabinetEdge(c, x, w, cabId) {
  const cab = CABINET_BY_ID[cabId] || CABINET_BY_ID.rhythm;
  const pal = cabinetPalette(cab);
  const shade = pal.shade, body = pal.body;
  const glass = Math.round(w * 0.025);
  const bezel = Math.round(w * 0.17);
  const edge = Math.round(w * 0.09);
  // The shadow the machine throws on whatever is beyond it.
  const sh = c.createLinearGradient(x + w, 0, x + w + w * 0.16, 0);
  sh.addColorStop(0, 'rgba(6,4,12,0.55)');
  sh.addColorStop(1, 'rgba(6,4,12,0)');
  c.fillStyle = sh; c.fillRect(x + w, 0, w * 0.16, H);
  // Glass edge.
  c.fillStyle = darken(shade, 0.55); c.fillRect(x, 0, glass, H);
  // Recessed bezel.
  const bz = c.createLinearGradient(0, 0, 0, H);
  bz.addColorStop(0, darken(shade, 0.22));
  bz.addColorStop(0.55, darken(shade, 0.04));
  bz.addColorStop(1, lighten(shade, 0.1));
  c.fillStyle = bz; c.fillRect(x + glass, 0, bezel, H);
  c.fillStyle = 'rgba(16,12,24,0.28)'; c.fillRect(x + glass, 0, 2, H);
  // Casing.
  const cx0 = x + glass + bezel, cw = w - glass - bezel - edge;
  const cs = c.createLinearGradient(cx0, 0, cx0 + cw, 0);
  cs.addColorStop(0, pal.hood);
  cs.addColorStop(0.5, body);
  cs.addColorStop(1, darken(body, 0.14));
  c.fillStyle = cs; c.fillRect(cx0, 0, cw, H);
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(cx0, 0, 1, H);
  // The panel seam, and a screw above and below it.
  const seam = cx0 + cw * 0.58;
  c.fillStyle = darken(body, 0.38); c.fillRect(seam, 0, 1.4, H);
  c.fillStyle = lighten(body, 0.12); c.fillRect(seam + 1.4, 0, 1, H);
  const sx = cx0 + cw * 0.3, sr = Math.max(2.2, w * 0.022);
  for (const sy of [H * 0.11, H * 0.89]) {
    c.fillStyle = lighten(body, 0.24);
    c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
    c.strokeStyle = darken(body, 0.45); c.lineWidth = 1;
    c.beginPath(); c.moveTo(sx - sr * 0.62, sy + sr * 0.3); c.lineTo(sx + sr * 0.62, sy - sr * 0.3); c.stroke();
  }
  // The moulded edge, and its outline.
  const ex = cx0 + cw;
  c.fillStyle = pal.deck; c.fillRect(ex, 0, edge, H);
  c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(ex + 1, 0, Math.max(1, edge * 0.28), H);
  c.fillStyle = darken(body, 0.5); c.fillRect(x + w - 1.2, 0, 1.2, H);
}

// ---------------------------------------------------------------- Act III
//
// THE BALLOON (the 4 Sep pick, eggshellBalloonArt): Act III's ordinary chase.
// The pellets hit the envelope, so it is drawn with the envelope's middle on
// the model's hit line (by + 7); the patches go on as his health goes down.
// Authored 28x46 with the envelope centred 12.5 down; drawn 56x92 at scale 1.
import { eggshellBalloonArt as balloonArt } from '../../sprites/props.js';
// The same 28-unit ape as the copter's, so he is the same size in both: the
// balloon's box is the copter's width (FLIGHT_BOSS_SIZE) by its 46/28 height.
export const BALLOON_W = FLIGHT_BOSS_SIZE, BALLOON_H = FLIGHT_BOSS_SIZE * 46 / 28;
const BALLOON_ENV_Y = 12.5 / 46;
function balloonBox(cx, hitY, s) {
  const w = BALLOON_W * s, h = BALLOON_H * s;
  return { x: cx - w / 2, y: hitY - BALLOON_ENV_Y * h, w, h };
}
export function drawFlightBalloon(c, cx, hitY, s, o = {}) {
  const { patches = 0, t = 0, pop = 0 } = o;
  const b = balloonBox(cx, hitY, s);
  const sway = Math.sin(t * 1.3) * 0.035;
  c.save();
  c.translate(cx, b.y + b.h * 0.56);
  c.rotate(sway);
  c.translate(-cx, -(b.y + b.h * 0.56));
  c.translate(b.x, b.y);
  balloonArt(c, b.w, b.h, { pop });
  // The patches: grey tape crosses, one per quarter of his bar lost.
  const spots = [[0.32, 0.17], [0.66, 0.25], [0.45, 0.33]];
  for (let i = 0; i < Math.min(3, patches); i++) {
    const [px, py] = spots[i];
    c.save();
    c.translate(px * b.w, py * b.h);
    c.rotate(0.5 - i * 0.7);
    c.fillStyle = '#c9c4cc';
    c.fillRect(-4.2 * s, -1.3 * s, 8.4 * s, 2.6 * s);
    c.rotate(Math.PI / 2);
    c.fillRect(-4.2 * s, -1.3 * s, 8.4 * s, 2.6 * s);
    c.restore();
  }
  c.restore();
}
// He and the tub without the envelope (it has just burst): the balloon's own
// drawing below the envelope, ropes hanging.
export function drawBalloonBasket(c, cx, hitY, s, o = {}) {
  const b = balloonBox(cx, hitY, s);
  c.save();
  c.beginPath(); c.rect(b.x - 10 * s, b.y + b.h * (25.6 / 46), b.w + 20 * s, b.h); c.clip();
  c.translate(b.x, b.y);
  balloonArt(c, b.w, b.h, o);
  c.restore();
}
// The burst itself: the envelope's stripes flung out as a ring of shreds.
export function drawBalloonBurst(c, cx, hitY, s, k) {
  if (k <= 0 || k >= 1) return;
  const r = (10 + 38 * k) * s;
  c.save();
  c.globalAlpha = 1 - k;
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 + 0.3;
    c.fillStyle = i % 2 ? '#d8403a' : '#f3ead8';
    c.save();
    c.translate(cx + Math.cos(a) * r, hitY + Math.sin(a) * r);
    c.rotate(a + k * 3);
    c.fillRect(-3 * s, -1.4 * s, 6 * s, 2.8 * s);
    c.restore();
  }
  c.restore();
}

// BACKUP POWER: his own copter tub on top of a tall machine built from cabinet
// hardware — armour panels with the cabinets' red edge, a cooling fan, a cannon
// level with the core, two thrusters, and the cables he is drawing the arcade's
// power through. `coreY` is the model's by; `ms` its machine scale. `vent` 0..1
// opens the armour on the core; `charge` 0..1 lights the cannon.
export function drawBackupMachine(c, cx, coreY, ms, o = {}) {
  const { vent = 0, charge = 0, t = 0, beat = null, hit = 0, deflect = 0, broken = 0, cables = true } = o;
  const u = ms;
  const top = coreY - 34 * u, bottom = coreY + 50 * u, left = cx - 32 * u, w = 64 * u;
  const ink = '#140f1a';
  c.save();
  c.lineJoin = 'round';
  // The power it is stealing, down off the bottom of the frame.
  if (cables) {
    c.lineWidth = 3.2 * u; c.strokeStyle = '#1b1620';
    for (const dx of [-12, 12]) {
      c.beginPath(); c.moveTo(cx + dx * u, bottom - 2 * u);
      c.bezierCurveTo(cx + dx * u, bottom + 40 * u, cx + dx * 1.8 * u, H, cx + dx * 2.4 * u, H + 40);
      c.stroke();
    }
    c.lineWidth = 1.2 * u; c.strokeStyle = '#c8332c';
    c.beginPath(); c.moveTo(cx - 12 * u, bottom); c.bezierCurveTo(cx - 12 * u, bottom + 40 * u, cx - 21 * u, H, cx - 29 * u, H + 40); c.stroke();
  }
  // Thrusters and their jets.
  for (const dx of [-18, 18]) {
    const fl = 0.75 + 0.25 * Math.sin(t * 41 + dx);
    const g = c.createLinearGradient(0, bottom + 3 * u, 0, bottom + 15 * u);
    g.addColorStop(0, 'rgba(230,252,255,0.95)'); g.addColorStop(1, 'rgba(110,220,245,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(cx + dx * u - 3.4 * u, bottom + 3 * u); c.quadraticCurveTo(cx + dx * u, bottom + (6 + 12 * fl) * u, cx + dx * u + 3.4 * u, bottom + 3 * u); c.fill();
    plate(c, cx + dx * u - 4.5 * u, bottom - 1 * u, 9 * u, 5 * u, '#3a3d4a', 1.5 * u);
  }
  // The cannon, level with the core, coils lighting as it charges.
  const by = coreY - 4 * u;
  plate(c, left - 17 * u, by, 19 * u, 8 * u, '#3a3046', 2 * u);
  for (let i = 0; i < 3; i++) plate(c, left - 13 * u + i * 4.5 * u, by - 1.2 * u, 2.6 * u, 10.4 * u, charge > 0.05 ? '#ffd27a' : '#c99a3a', 1 * u);
  if (charge > 0.01) {
    const gr = c.createRadialGradient(left - 18 * u, by + 4 * u, 0, left - 18 * u, by + 4 * u, (6 + 12 * charge) * u);
    gr.addColorStop(0, `rgba(255,248,220,${0.9 * charge})`); gr.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(left - 18 * u, by + 4 * u, (6 + 12 * charge) * u, 0, Math.PI * 2); c.fill();
  }
  // The body.
  plate(c, left, top, w, bottom - top, '#2b2433', 6 * u);
  c.strokeStyle = ink; c.lineWidth = 0.8 * u; c.beginPath(); c.roundRect(left, top, w, bottom - top, 6 * u); c.stroke();
  c.fillStyle = '#c8332c'; c.fillRect(left + 2.5 * u, top + 6 * u, 2.6 * u, bottom - top - 12 * u); c.fillRect(left + w - 5.1 * u, top + 6 * u, 2.6 * u, bottom - top - 12 * u);
  for (const [sx, sy] of [[left + 8 * u, top + 6 * u], [left + w - 8 * u, top + 6 * u], [left + 8 * u, bottom - 6 * u], [left + w - 8 * u, bottom - 6 * u]]) {
    c.fillStyle = '#6b6275'; c.beginPath(); c.arc(sx, sy, 1.5 * u, 0, Math.PI * 2); c.fill();
  }
  // The core, in its well.
  c.fillStyle = '#120d16'; c.beginPath(); c.arc(cx, coreY, 15 * u, 0, Math.PI * 2); c.fill();
  const beatPulse = Number.isFinite(beat) ? 0.75 + 0.25 * Math.max(0, 1 - ((beat % 1) + 1) % 1 * 2.2) : 0.85 + 0.15 * Math.sin(t * 6);
  const live = 1 - broken;
  const cr = c.createRadialGradient(cx - 3 * u, coreY - 3 * u, 1 * u, cx, coreY, 12 * u);
  cr.addColorStop(0, live > 0.2 ? '#fff4c8' : '#6a4a3a');
  cr.addColorStop(0.45, live > 0.2 ? '#ffb347' : '#4a3430');
  cr.addColorStop(1, live > 0.2 ? '#c4500f' : '#2a1d1d');
  c.fillStyle = cr; c.beginPath(); c.arc(cx, coreY, 11.5 * u * (live > 0.2 ? beatPulse * 0.15 + 0.85 : 1), 0, Math.PI * 2); c.fill();
  if (hit > 0) { c.fillStyle = `rgba(255,255,255,${Math.min(1, hit * 8)})`; c.beginPath(); c.arc(cx, coreY, 12 * u, 0, Math.PI * 2); c.fill(); }
  // The armour over it: two doors that part to vent.
  const doorW = 24 * u, gap = vent * 21 * u;
  for (const side of [-1, 1]) {
    const dx = side < 0 ? cx - doorW - gap : cx + gap;
    plate(c, dx, coreY - 22 * u, doorW, 44 * u, '#3a3046', 3 * u);
    c.strokeStyle = ink; c.lineWidth = 0.7 * u; c.beginPath(); c.roundRect(dx, coreY - 22 * u, doorW, 44 * u, 3 * u); c.stroke();
    for (let v = 0; v < 3; v++) { c.fillStyle = '#1d1824'; c.fillRect(dx + 5 * u, coreY - 15 * u + v * 4 * u, doorW - 10 * u, 1.6 * u); }
    c.fillStyle = '#c8332c'; c.fillRect(side < 0 ? dx + 1.4 * u : dx + doorW - 3 * u, coreY - 19 * u, 1.6 * u, 38 * u);
  }
  // The turned-away pellet's spark on the armour.
  if (deflect > 0) {
    c.strokeStyle = `rgba(150,240,255,${deflect / 0.12})`; c.lineWidth = 1.2 * u;
    c.beginPath(); c.arc(left + 2 * u, coreY, 7 * u * (1.4 - deflect / 0.12 * 0.4), -1.1, 1.1); c.stroke();
  }
  // The cooling fan.
  const fy = coreY + 35 * u;
  c.fillStyle = '#1d1824'; c.beginPath(); c.arc(cx, fy, 12.5 * u, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4d4458';
  const spin = t * (live > 0.2 ? 14 : 2);
  for (let i = 0; i < 4; i++) {
    const a = spin + i * Math.PI / 2;
    c.save(); c.translate(cx, fy); c.rotate(a);
    c.beginPath(); c.ellipse(5.5 * u, 0, 6 * u, 2.6 * u, 0.35, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  c.fillStyle = '#6b6275'; c.beginPath(); c.arc(cx, fy, 2.4 * u, 0, Math.PI * 2); c.fill();
  c.restore();
}
// Where Eggshell's copter sits on the machine: its tub on the body's top.
export function backupCopterCentre(coreY, ms) { return coreY - 34 * ms - (0.94 - 0.5) * FLIGHT_BOSS_SIZE * ms; }

// The balloon at the run's size, where the chase copter would be (drawCopter's
// box is 36u with its middle 22 above ground - alt): the envelope's middle there.
export function drawRunBalloon(c, x, alt, t) {
  const w = 36, h = 59;
  const top = GROUND_Y - alt - 22 - BALLOON_ENV_Y * h;
  c.save();
  c.translate(x, top + h * 0.56); c.rotate(Math.sin(t * 1.3) * 0.035); c.translate(-x, -(top + h * 0.56));
  c.translate(x - w / 2, top);
  balloonArt(c, w, h, {});
  c.restore();
}

// ---------------------------------------------------------------- the drama
// (docs/ACT_ENDING_TRANSITION_DRAMA.md) Leaving the game: a thick slice of the
// cabinet's inside crosses the camera, then each act reveals the passage its
// own way. `rt` is the reveal clock: seconds since the screen began to leave,
// carried across the handover so both sides paint the same frame.
const ease01 = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

// The crossing: glass edge and bezel (the cabinet's), its dark insides — a
// circuit board, hanging wires — and a close brace, then the casing's back edge.
export function crossingWidth(portrait) { return portrait ? 300 : 230; }
export function drawCabinetCrossing(c, x, w, cabId) {
  const edgeW = Math.round(w * 0.36);
  // Insides first, the edge over their left side.
  const ix = x + edgeW * 0.5, iw = w - edgeW * 0.5;
  c.fillStyle = '#0d1119'; c.fillRect(ix, 0, iw, H);
  const bx = ix + iw * 0.18, bw = iw * 0.42;
  const tint = { rhythm: '#203c35', neon: '#1f2a46', surge: '#3a2633' }[cabId] || '#203c35';
  c.fillStyle = tint; c.fillRect(bx, H * 0.12, bw, H * 0.66);
  for (let j = 0; j < 6; j++) {
    c.fillStyle = '#60734d'; c.fillRect(bx + 8 + j * bw / 7, H * 0.16, 2, H * 0.56);
    c.fillStyle = '#101d21'; c.fillRect(bx + 5 + j * bw / 7, H * (0.26 + (j % 3) * 0.08), 9, H * 0.06);
  }
  c.strokeStyle = '#653b39'; c.lineWidth = 4;
  for (let j = 0; j < 4; j++) {
    const sx = ix + 10 + j * 9;
    c.beginPath(); c.moveTo(sx, 0); c.bezierCurveTo(sx + iw * 0.3, H * 0.3, sx - 10, H * 0.55, sx + 20 + j * 12, H); c.stroke();
  }
  // The close brace.
  const br = x + w - 40;
  c.fillStyle = '#080a11'; c.fillRect(br, 0, 30, H);
  c.fillStyle = '#30323a'; c.fillRect(br + 4, H * 0.07, 2, H * 0.86);
  c.fillStyle = '#858b8c'; c.fillRect(br + 6, H * 0.11, 3, 14); c.fillRect(br + 6, H * 0.83, 3, 14);
  drawCabinetEdge(c, x, edgeW, cabId);
}

// The service lamps overhead, the dark the passage starts in, the tub's
// headlight, and per act: 1 lamps come on ahead in sequence (discovery); 2 a
// low steady dark (pursuit); 3 the lamps fade out toward the balloon and come
// back slowly (he is drawing power). Local light: banks are drawn separately.
export function drawPassageReveal(c, o) {
  const { top, bottom, scroll = 0, rt = 0, act = 1, heroX = 80, heroY = 200, s = 1 } = o;
  if (rt > 9) return;
  const lampY = top - 4;
  const step = 150, first = Math.floor((scroll * 1.0) / step);
  const off = ((scroll % step) + step) % step;
  for (let i = -1, x = -off + 60; x < W + 60; i++, x += step) {
    const order = Math.max(0, x) / W;
    let lit;
    if (act === 1) lit = ease01((rt - 0.7 - order * 0.6) * 4);
    else if (act === 3) lit = Math.max(1 - 0.85 * ease01((rt - 0.7 - (1 - order) * 0.5) * 4), ease01((rt - 4.5) / 2));
    else lit = 1;
    void first;
    c.fillStyle = '#11111b'; c.fillRect(x, lampY - 3, 35, 8);
    c.fillStyle = `rgba(255,227,158,${0.1 + 0.9 * lit})`; c.fillRect(x + 4, lampY - 1, 27, 3);
    if (lit > 0.02) {
      const g = c.createLinearGradient(0, lampY, 0, bottom);
      g.addColorStop(0, `rgba(255,219,145,${lit * 0.13})`); g.addColorStop(1, 'rgba(255,219,145,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x, lampY + 5); c.lineTo(x + 35, lampY + 5); c.lineTo(x + 85, bottom); c.lineTo(x - 50, bottom); c.fill();
    }
  }
  const dark = act === 1 ? 0.8 * (1 - ease01((rt - 0.8) / 1.1))
    : act === 3 ? 0.5 * ease01((rt - 0.7) / 0.7) * (1 - ease01((rt - 4.5) / 2))
      : 0.18 * (1 - ease01((rt - 3) / 2));
  if (dark > 0.01) { c.fillStyle = `rgba(3,6,13,${dark})`; c.fillRect(0, 0, W, H); }
  // The tub's headlight, catching the passage before the lamps do.
  const beam = ease01((rt - 0.3) / 0.6) * (1 - ease01((rt - 4.2) / 1.2));
  if (beam > 0.01) {
    const g = c.createLinearGradient(heroX, 0, W - 20, 0);
    g.addColorStop(0, `rgba(194,233,235,${0.16 * beam})`); g.addColorStop(1, 'rgba(194,233,235,0)');
    c.fillStyle = g; c.beginPath();
    c.moveTo(heroX + 20 * s, heroY - 4 * s); c.lineTo(W - 20, heroY - 85 * s); c.lineTo(W - 20, heroY + 75 * s); c.closePath(); c.fill();
  }
}

// The scale cue: a mains plug the size of a cabinet, lying unplugged on the
// passage floor with its cable, at passage position `px` (scroll space).
export function drawGiantPlug(c, sx, bottom, s = 1) {
  if (sx < -120 || sx > W + 120) return;
  const y = bottom + 10 * s;
  c.strokeStyle = '#090c13'; c.lineWidth = 13 * s; c.lineCap = 'round';
  c.beginPath(); c.moveTo(sx + 25 * s, H + 20); c.bezierCurveTo(sx - 5 * s, y - 20 * s, sx + 40 * s, y + 10 * s, sx, y - 30 * s); c.stroke();
  c.fillStyle = '#12121b'; c.fillRect(sx - 17 * s, y - 60 * s, 36 * s, 42 * s);
  c.fillStyle = '#353542'; c.fillRect(sx - 12 * s, y - 56 * s, 26 * s, 31 * s);
  c.fillStyle = '#89887b'; c.fillRect(sx - 9 * s, y - 73 * s, 6 * s, 15 * s); c.fillRect(sx + 7 * s, y - 73 * s, 6 * s, 15 * s);
}

// 6-3's maintenance shutter: a slatted door dropping from the top rail to
// `drop` (screen y of its bottom edge).
export function drawShutter(c, x, top, drop, s = 1) {
  const w = 34 * s;
  c.fillStyle = '#1c1b22'; c.fillRect(x - 4 * s, 0, w + 8 * s, top);
  c.fillStyle = '#66636a'; c.fillRect(x, top, w, Math.max(0, drop - top));
  c.fillStyle = '#292c35';
  for (let y = top + 8 * s; y < drop; y += 12 * s) c.fillRect(x, y, w, 2 * s);
  c.fillStyle = '#d7af50'; c.fillRect(x, drop - 7 * s, w, 7 * s);
}

// THE ENDING: the arcade's mains, a breaker panel on the passage wall with its
// big socket, its breaker lever and its pilot lamp; and the plug, hanging off
// its cable from the top rail, that the hero pushes home. Everything here is
// in passage space at scale `s`; `t` is the victory clock.
//
// panel(c, x, y, s, { lever 0..1 (down..up), lamp 'off'|'wait'|'on', t })
export function drawBreakerPanel(c, x, y, s, o = {}) {
  const { lever = 0, lamp = 'wait', t = 0 } = o;
  const pw = 92 * s, ph = 132 * s, px = x - pw / 2, py = y - ph / 2;
  // Conduit in from above, and the panel's shadow on the wall.
  c.fillStyle = '#17131f'; c.fillRect(x - 7 * s, 0, 14 * s, py + 4 * s);
  c.fillStyle = '#2a2433'; c.fillRect(x - 4 * s, 0, 8 * s, py + 4 * s);
  c.fillStyle = 'rgba(6,4,12,0.45)'; c.beginPath(); c.roundRect(px + 5 * s, py + 7 * s, pw, ph, 7 * s); c.fill();
  plate(c, px, py, pw, ph, '#3a3444', 7 * s);
  c.strokeStyle = '#140f1a'; c.lineWidth = Math.max(1, 1.1 * s); c.beginPath(); c.roundRect(px, py, pw, ph, 7 * s); c.stroke();
  c.fillStyle = '#c8332c'; c.fillRect(px + 5 * s, py + 7 * s, 3 * s, ph - 14 * s);
  c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(px + 1.5 * s, py + 1.5 * s, pw - 3 * s, 1.5 * s);
  for (const [sx, sy] of [[px + 9 * s, py + 9 * s], [px + pw - 9 * s, py + 9 * s], [px + 9 * s, py + ph - 9 * s], [px + pw - 9 * s, py + ph - 9 * s]]) {
    c.fillStyle = '#7a7286'; c.beginPath(); c.arc(sx, sy, 2.2 * s, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#1d1824'; c.lineWidth = Math.max(1, 0.8 * s); c.beginPath(); c.moveTo(sx - 1.4 * s, sy - 1.4 * s); c.lineTo(sx + 1.4 * s, sy + 1.4 * s); c.stroke();
  }
  // The label strip.
  plate(c, x - 26 * s, py + 12 * s, 52 * s, 11 * s, '#d9d6df', 2 * s);
  c.fillStyle = '#2a2132'; c.font = `bold ${Math.round(7 * s)}px system-ui`; c.textAlign = 'center';
  c.fillText('MAINS', x, py + 20.5 * s); c.textAlign = 'left';
  // The socket: a bevelled plate with two slots and the earth hole.
  const sy0 = y - 8 * s;
  plate(c, x - 22 * s, sy0 - 22 * s, 44 * s, 44 * s, '#e6e3ea', 5 * s);
  c.strokeStyle = '#8f8a98'; c.lineWidth = Math.max(1, 1 * s); c.beginPath(); c.roundRect(x - 22 * s, sy0 - 22 * s, 44 * s, 44 * s, 5 * s); c.stroke();
  c.fillStyle = '#2a2433';
  c.fillRect(x - 12 * s, sy0 - 10 * s, 5 * s, 13 * s); c.fillRect(x + 7 * s, sy0 - 10 * s, 5 * s, 13 * s);
  c.beginPath(); c.arc(x, sy0 + 11 * s, 3.4 * s, 0, Math.PI * 2); c.fill();
  // The breaker lever, flipping up as the power comes back.
  const lx = x + 30 * s, ly = y + 36 * s;
  plate(c, lx - 9 * s, ly - 14 * s, 18 * s, 28 * s, '#221d2a', 3 * s);
  c.fillStyle = '#c8332c'; c.fillRect(lx - 6 * s, ly - 11 * s, 12 * s, 9 * s);
  c.fillStyle = '#4caf6a'; c.fillRect(lx - 6 * s, ly + 2 * s, 12 * s, 9 * s);
  const ang = (0.5 - lever) * 1.1;
  c.save(); c.translate(lx, ly); c.rotate(ang);
  plate(c, -3.5 * s, -2 * s, 7 * s, 15 * s, '#e0dde4', 2 * s);
  c.fillStyle = '#9a95a3'; c.fillRect(-2 * s, 10 * s, 4 * s, 2.5 * s);
  c.restore();
  // The pilot lamp: red blink while it waits, green when the mains is back.
  const lx2 = x - 30 * s, ly2 = y + 36 * s;
  const on = lamp === 'on', blink = lamp === 'wait' && Math.floor(t * 3) % 2 === 0;
  c.fillStyle = on ? '#7be38b' : blink ? '#e04848' : '#4a1c1c';
  c.beginPath(); c.arc(lx2, ly2, 4.5 * s, 0, Math.PI * 2); c.fill();
  if (on || blink) {
    const g = c.createRadialGradient(lx2, ly2, 2 * s, lx2, ly2, 14 * s);
    g.addColorStop(0, on ? 'rgba(123,227,139,0.5)' : 'rgba(224,72,72,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(lx2, ly2, 14 * s, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = '#1d1824'; c.lineWidth = Math.max(1, 0.9 * s); c.beginPath(); c.arc(lx2, ly2, 4.5 * s, 0, Math.PI * 2); c.stroke();
}
// Where the plug's prongs go: the socket's face, in the panel's own terms.
export function breakerSocketPoint(x, y, s) { return { x: x - 22 * s, y: y - 8 * s }; }

// The plug on its cable. `pivot` is where the cable hangs from (the top rail),
// `tip` where the prongs are, `ang` the plug's lean (0 = pointing right into
// the socket). The cable sags from the pivot to the plug's back.
export function drawHangingPlug(c, pivot, tip, ang, s, o = {}) {
  const { seated = 0, t = 0 } = o;
  const back = { x: tip.x - Math.cos(ang) * 34 * s, y: tip.y - Math.sin(ang) * 34 * s };
  const sag = Math.max(10 * s, (back.y - pivot.y) * 0.25);
  c.strokeStyle = '#090c13'; c.lineWidth = 7 * s; c.lineCap = 'round';
  c.beginPath(); c.moveTo(pivot.x, pivot.y);
  c.bezierCurveTo(pivot.x + 6 * s, pivot.y + sag, back.x - 24 * s, back.y - sag * 0.4, back.x, back.y); c.stroke();
  c.strokeStyle = '#2f2a38'; c.lineWidth = 2.2 * s;
  c.beginPath(); c.moveTo(pivot.x, pivot.y);
  c.bezierCurveTo(pivot.x + 6 * s, pivot.y + sag, back.x - 24 * s, back.y - sag * 0.4, back.x, back.y); c.stroke();
  // The clip at the top rail.
  plate(c, pivot.x - 5 * s, pivot.y - 4 * s, 10 * s, 8 * s, '#5a5564', 2 * s);
  c.save();
  c.translate(tip.x, tip.y); c.rotate(ang);
  // Strain relief, moulded body with its grip ridges, the prongs and the earth pin.
  c.fillStyle = '#2a2731'; c.beginPath(); c.roundRect(-40 * s, -5 * s, 12 * s, 10 * s, 3 * s); c.fill();
  plate(c, -32 * s, -13 * s, 32 * s, 26 * s, '#3b3745', 5 * s);
  c.strokeStyle = '#140f1a'; c.lineWidth = Math.max(1, 1 * s); c.beginPath(); c.roundRect(-32 * s, -13 * s, 32 * s, 26 * s, 5 * s); c.stroke();
  c.fillStyle = '#2a2731'; for (let i = 0; i < 3; i++) c.fillRect(-27 * s + i * 6 * s, -9 * s, 2 * s, 18 * s);
  c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(-30 * s, -11 * s, 28 * s, 2 * s);
  const prong = 11 * s * (1 - seated * 0.95);
  c.fillStyle = '#b4b0a6';
  c.fillRect(0, -9 * s, prong, 3.2 * s); c.fillRect(0, 5.8 * s, prong, 3.2 * s);
  c.fillRect(0, -1.6 * s, prong * 0.85, 3.2 * s);
  c.fillStyle = '#7d7a73'; c.fillRect(0, -9 * s, prong, 1 * s); c.fillRect(0, 5.8 * s, prong, 1 * s);
  c.restore();
  void t;
}

// The spark ring and the flash where the plug meets the socket.
export function drawPlugSpark(c, x, y, s, k) {
  if (k <= 0 || k >= 1) return;
  c.save();
  c.globalAlpha = 1 - k;
  c.strokeStyle = '#fff6c8'; c.lineWidth = 2 * s;
  c.beginPath(); c.arc(x, y, (4 + 26 * k) * s, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = '#8fe4ff'; c.lineWidth = 1.2 * s;
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7 + k * 2;
    c.beginPath(); c.moveTo(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s);
    c.lineTo(x + Math.cos(a) * (10 + 30 * k) * s, y + Math.sin(a) * (10 + 30 * k) * s); c.stroke();
  }
  c.restore();
}
