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
export const BALLOON_W = 56, BALLOON_H = 92;
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
