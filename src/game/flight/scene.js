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
// THE POD (1 Nov, Peter picked C off the pod sheet): wider than the old
// bucket so it reads as a vehicle he sits in, not one he stands in, and about
// the size of Eggshell's tray (which grew too, props.js EG_TUB_SCALE). The rim is
// where the old one was, so he sits exactly as deep; the belly is rounded.
export const TUB = { halfW: 16, rimY: -9.6, bottom: 3, baseY: 3, hoverY: 7 };
const TUB_INK = '#2a2836';
const TUB_LW = 0.35;

function tubBodyPath(k) {
  k.beginPath();
  k.moveTo(-TUB.halfW, -9.6); k.lineTo(TUB.halfW, -9.6);
  k.bezierCurveTo(TUB.halfW, -0.2, 10.5, TUB.bottom, 0, TUB.bottom);
  k.bezierCurveTo(-10.5, TUB.bottom, -TUB.halfW, -0.2, -TUB.halfW, -9.6);
  k.closePath();
}

// thrust 0..1: the jet under the belly.
export function drawHeroTub(c, cx, floorY, o = {}) {
  const { u = 1, thrust = 0, t = 0 } = o;
  c.save();
  c.translate(cx, floorY);
  c.scale(u, u);
  c.lineJoin = 'round';
  // The jet first, so the belly sits over its root.
  if (thrust > 0.01) {
    const flick = 0.82 + 0.18 * Math.sin(t * 47) * Math.sin(t * 31 + 1.3);
    const len = (2.2 + 6.2 * thrust) * flick;
    const y0 = TUB.bottom - 0.6;
    const g = c.createLinearGradient(0, y0, 0, y0 + len);
    g.addColorStop(0, `rgba(236,252,255,${0.95 * Math.min(1, thrust * 1.6)})`);
    g.addColorStop(0.35, `rgba(120,226,244,${0.75 * Math.min(1, thrust * 1.4)})`);
    g.addColorStop(1, 'rgba(120,226,244,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-3.4, y0);
    c.quadraticCurveTo(0, y0 + len * 1.25, 3.4, y0);
    c.closePath();
    c.fill();
  }
  // The gun on the nose: auto-fire leaves from here, so it points the way he is chasing.
  c.fillStyle = '#586279';
  c.beginPath(); c.roundRect(TUB.halfW - 1.2, -5.6, 5, 2.6, 0.8); c.fill();
  c.strokeStyle = TUB_INK; c.lineWidth = TUB_LW; c.stroke();
  c.fillStyle = '#f2c14e';
  c.beginPath(); c.arc(TUB.halfW + 4.2, -4.3, 1.45, 0, Math.PI * 2); c.fill(); c.stroke();
  // Hull, its lower shade, the stripe and the lamps, all clipped to the hull.
  tubBodyPath(c);
  c.fillStyle = '#e9edf3'; c.fill();
  c.save();
  tubBodyPath(c); c.clip();
  c.fillStyle = '#d3dae4'; c.fillRect(-TUB.halfW - 1, -2, TUB.halfW * 2 + 2, 6);
  c.fillStyle = '#36bec8'; c.fillRect(-2.8, -10, 5.6, 14);
  c.fillStyle = '#2ea3ad'; c.fillRect(-2.8, -2, 5.6, 6);
  c.restore();
  for (const x of [-9.5, 9.5]) {
    c.fillStyle = '#68d9f0';
    c.beginPath(); c.arc(x, -5.2, 2, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#3a8fb0'; c.lineWidth = TUB_LW; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath(); c.arc(x - 0.6, -5.8, 0.55, 0, Math.PI * 2); c.fill();
  }
  tubBodyPath(c);
  c.strokeStyle = TUB_INK; c.lineWidth = TUB_LW; c.stroke();
  // The rim, a hair wider than the hull, over his waist.
  c.fillStyle = '#f8f7fa';
  c.beginPath(); c.roundRect(-TUB.halfW - 1.4, -11, TUB.halfW * 2 + 2.8, 2.7, 1.3); c.fill();
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
// 46 tall: Eggshell's ape and his tub are the measure (Peter, 1 Nov: "scale is
// off for our vehicle vs his"), and at 50 our tub out-sized his.
export const FLIGHT_HERO_H = 46;
export function flightHeroFloor(cy, scale) { return cy + 15 * scale; }

// The flight leans both vehicles forward (Peter, 1 Nov: "angling them ... so
// it looks like they're going faster"); `lean` is radians, clockwise = nose
// down, and the pod and hero turn together about the pod's middle.
export const FLIGHT_LEAN = 7 * Math.PI / 180;
export function drawFlightHero(c, heroId, cx, cy, scale, o = {}) {
  const u = FLIGHT_HERO_H * scale / 24;
  const floorY = flightHeroFloor(cy, scale) + (o.dip || 0) * u;
  const lean = o.lean ?? FLIGHT_LEAN;
  c.save();
  if (lean) { const py = floorY - 3 * u; c.translate(cx, py); c.rotate(lean); c.translate(-cx, -py); }
  drawTubbedHero(c, heroId, cx, floorY, {
    u, thrust: o.thrust ?? 0.4, t: o.t || 0,
    pose: o.pose || { kind: 'idle', grounded: true, time: o.t || 0 },
  });
  c.restore();
}

// Speed streaks trailing a vehicle: three short lines left of (x, y), moving
// with the passage's scroll so they read as air going past.
export function drawSpeedStreaks(c, x, y, s, scroll = 0, k = 1) {
  if (k <= 0.01) return;
  c.save(); c.lineCap = 'round'; c.lineWidth = 1.3 * s;
  for (let i = 0; i < 3; i++) {
    const yy = y + (i - 1) * 7 * s, len = (20 + 9 * ((i * 37) % 5) / 5) * s;
    const x0 = x - ((i * 13 + scroll * 0.35) % 22) * s;
    const g = c.createLinearGradient(x0 - len, 0, x0, 0);
    g.addColorStop(0, 'rgba(180,235,255,0)'); g.addColorStop(1, `rgba(180,235,255,${0.5 * k})`);
    c.strokeStyle = g; c.beginPath(); c.moveTo(x0 - len, yy); c.lineTo(x0, yy); c.stroke();
  }
  c.restore();
}

// Eggshell in his copter tub, painted live (his face moves). `cx, cy` is the
// centre of the art box; `size` is its side. The rotor turns once a beat and
// the headlamps blink on the song, exactly as they do in the chase.
export function drawFlightBoss(c, cx, cy, size, o = {}) {
  const { t = 0, beat = null, mood = 'flat', look = -0.75, hitT = 0, pop = 0, parts = null, lean = FLIGHT_LEAN } = o;
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
  if (lean) { c.translate(cx, cy); c.rotate(lean); c.translate(-cx, -cy); }
  c.translate(cx - size / 2, cy - size / 2);
  eggshellCopterArt(c, size, size, frame, { face, lamp, lampInk: ink, pop, parts });
  c.restore();
}
// The prototype's anchor: the art box centre sits 7 units above the model's y.
// 83 (was 72): Peter picked B of the 1 Nov scale sheet, Eggshell 15% bigger so
// he and his tub stand up to the hero and ours. The centre rises with the box
// so his tub stays on the model's y.
export function flightBossCentre(by, scale) { return by - 9 * scale; }
export const FLIGHT_BOSS_SIZE = 83;

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

// THE ENDING: the arcade's mains — a big lever on a panel on the passage wall.
// The hero lands the tub, climbs out, jumps for the grip and rides the lever
// down with his own weight (Peter, 1 Nov: "maybe we should land, jump out and
// click a switch"). Everything is in passage space at scale `s`; `P` is the
// lever's pivot, `ang` its angle (radians from pointing straight left; up is
// negative: MAINS_LEVER.off is up, .on is down).
export const MAINS_LEVER = { arm: 40, off: -0.62, on: 0.44 };
export function mainsGrip(P, s, ang) {
  // s may carry a radius fraction (the jaws sit at 0.62 of the arm).
  return { x: P.x - Math.cos(ang) * MAINS_LEVER.arm * s, y: P.y + Math.sin(ang) * MAINS_LEVER.arm * s };
}
export function drawMainsLever(c, P, s, o = {}) {
  const { ang = MAINS_LEVER.off, on = false, t = 0 } = o;
  const px = P.x - 64 * s, py = P.y - 62 * s, pw = 88 * s, ph = 118 * s;
  // Conduit up into the ceiling, and the panel's shadow on the wall.
  c.fillStyle = '#17131f'; c.fillRect(P.x - 7 * s, 0, 14 * s, py + 4 * s);
  c.fillStyle = '#2a2433'; c.fillRect(P.x - 4 * s, 0, 8 * s, py + 4 * s);
  c.fillStyle = 'rgba(6,4,12,0.45)'; c.beginPath(); c.roundRect(px + 5 * s, py + 7 * s, pw, ph, 7 * s); c.fill();
  plate(c, px, py, pw, ph, '#3a3444', 7 * s);
  c.strokeStyle = '#140f1a'; c.lineWidth = Math.max(1, 1.1 * s); c.beginPath(); c.roundRect(px, py, pw, ph, 7 * s); c.stroke();
  // Hazard stripes along the foot.
  c.save(); c.beginPath(); c.rect(px + 4 * s, py + ph - 13 * s, pw - 8 * s, 8 * s); c.clip();
  c.fillStyle = '#e8b93c'; c.fillRect(px, py + ph - 13 * s, pw, 8 * s); c.fillStyle = '#1f1a26';
  for (let x = px - 10 * s; x < px + pw; x += 10 * s) { c.beginPath(); c.moveTo(x, py + ph - 5 * s); c.lineTo(x + 5 * s, py + ph - 13 * s); c.lineTo(x + 10 * s, py + ph - 13 * s); c.lineTo(x + 5 * s, py + ph - 5 * s); c.fill(); }
  c.restore();
  for (const [sx, sy] of [[px + 8 * s, py + 8 * s], [px + pw - 8 * s, py + 8 * s]]) {
    c.fillStyle = '#7a7286'; c.beginPath(); c.arc(sx, sy, 2.2 * s, 0, Math.PI * 2); c.fill();
  }
  plate(c, px + pw / 2 - 24 * s, py + 10 * s, 48 * s, 11 * s, '#d9d6df', 2 * s);
  c.fillStyle = '#2a2132'; c.font = `bold ${Math.round(7 * s)}px system-ui`; c.textAlign = 'center';
  c.fillText('MAINS', px + pw / 2, py + 18.5 * s);
  // OFF above the pivot, ON below it: red while it waits, green once it is down.
  const lamp = (y, col, lit, label) => {
    c.fillStyle = lit ? col : '#2b2530'; c.beginPath(); c.arc(P.x + 13 * s, y, 4 * s, 0, Math.PI * 2); c.fill();
    if (lit) { const g = c.createRadialGradient(P.x + 13 * s, y, 1.5 * s, P.x + 13 * s, y, 13 * s); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.beginPath(); c.arc(P.x + 13 * s, y, 13 * s, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#b9b2c2'; c.font = `bold ${Math.round(5 * s)}px system-ui`; c.fillText(label, P.x + 13 * s, y + 11 * s);
  };
  lamp(P.y - 30 * s, '#e04848', !on && Math.floor(t * 3) % 2 === 0, 'OFF');
  lamp(P.y + 22 * s, '#7be38b', on, 'ON');
  c.textAlign = 'left';
  // The slot the arm travels in, and the copper jaws it closes into at ON.
  const R = MAINS_LEVER.arm * s;
  c.strokeStyle = '#1b1621'; c.lineWidth = 6 * s; c.lineCap = 'round';
  // (A point at lever angle a is at canvas angle PI - a.)
  c.beginPath(); c.arc(P.x, P.y, R * 0.62, Math.PI - MAINS_LEVER.off, Math.PI - MAINS_LEVER.on, true); c.stroke();
  const jaw = mainsGrip(P, s * 0.62, MAINS_LEVER.on);
  plate(c, jaw.x - 6 * s, jaw.y - 6 * s, 12 * s, 12 * s, '#c07a3c', 2.5 * s);
  c.fillStyle = '#7a4520'; c.fillRect(jaw.x - 3.5 * s, jaw.y - 1 * s, 7 * s, 2 * s);
  // The arm, its hub, and the red grip across its end.
  const g = mainsGrip(P, s, ang);
  c.strokeStyle = '#141019'; c.lineWidth = 8 * s; c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(g.x, g.y); c.stroke();
  c.strokeStyle = '#a9a4b2'; c.lineWidth = 5 * s; c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(g.x, g.y); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(P.x, P.y - 1.5 * s); c.lineTo(g.x, g.y - 1.5 * s); c.stroke();
  c.fillStyle = '#5c5766'; c.beginPath(); c.arc(P.x, P.y, 8 * s, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#141019'; c.lineWidth = Math.max(1, 1.2 * s); c.stroke();
  c.fillStyle = '#c9c4d1'; c.beginPath(); c.arc(P.x, P.y, 3 * s, 0, Math.PI * 2); c.fill();
  // A handlebar across the end, wide enough for both of his hands; it leans
  // only a little with the arm so it always reads as a bar to hang from.
  c.save(); c.translate(g.x, g.y); c.rotate(-ang * 0.3);
  c.fillStyle = '#141019'; c.beginPath(); c.roundRect(-20 * s, -4.5 * s, 40 * s, 9 * s, 4.5 * s); c.fill();
  c.fillStyle = '#d23b33'; c.beginPath(); c.roundRect(-18.7 * s, -3.2 * s, 37.4 * s, 6.4 * s, 3.2 * s); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-16 * s, -2.2 * s, 32 * s, 1.4 * s);
  c.restore();
  c.lineCap = 'butt';
}

// The spark ring and the flash where the lever closes on its jaws.
export function drawMainsSpark(c, x, y, s, k) {
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
