// SPEED ZONE — a cute set piece at the end of speed-3 (mock-up, 16 Oct 2026).
//
// Peter, after the neon kaiju and the gravity Martian: "any other ideas for cute end
// set pieces for level 3s of cabinets?" -> "speed zone mock up". Four gags for the
// finish, drawn flat in the cabinet's own hand (ink line, tomato / mustard / teal /
// cream, the key plate slipped up and right) and put through the REAL speed-3 backdrop,
// road and hero. Nothing is wired into the run; this sheet is the whole of it.
//
// A: GRANDMA'S SCOOTER   B: THE TOW   C: THE TORTOISE   D: JUST MARRIED
// The slowest thing on the Speed Zone road, one each. They share a timeline: the run
// scrolls at the stage's pace, the camera PARKS for the finish at PARK (as it does for
// the howler and the kaiju) and the hero runs on the spot while the gag crawls through
// the frame at its own pace — the joke being that it is going nowhere fast. Each has
// one beat as it draws level with the hero.
import { GROUND_Y, ZOOM, VIEW_W, applyWorld } from '../engine/camera.js';
import { getStylePack } from '../engine/stylePacks/index.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { HERO_DRAW_H } from '../game/draw.js';
import { drawToon } from '../sprites/toons.js';
import { PLAYER_X } from '../game/player.js';

export const SPEED_FINISH_LOOP = 9;
const RUN = 180;                       // the stage's run pace, world u/s
const BEAT_AT = 4.2;                   // seconds in: each gag is a beat's distance ahead of the hero
const PARK = [1.6, 2.8];               // the camera eases to a stop over this span
const INK = '#2a1d1e';
const TOMATO = '#e2412c', TOMATO_DK = '#a8291f';
const MUSTARD = '#f0b12a', MUSTARD_DK = '#b97d14', MUSTARD_LT = '#ffe08a';
const CREAM = '#fbf1d6', CREAM_DK = '#dcc79d';
const TEAL = '#23928e', TEAL_DK = '#17605f', GLASS = '#8fe1d6';
const CHROME = '#dfe7e2', CHROME_DK = '#98aaa6';
const BLACK = '#2c2627';
const SKIN = '#e8b48c', SKIN_DK = '#c48a66';
const LILAC = '#b79ad8', LILAC_DK = '#8467ad';
const TAU = Math.PI * 2;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const k = clamp01((v - a) / (b - a)); return k * k * (3 - 2 * k); };

// ------------------------------------------------------------------ flat-plate helpers
// Everything below is authored in world units with the ground at y = 0, facing LEFT
// (the gags come at us), then the caller flips it if it ever needs to.
const LW = 0.8;
function poly(ctx, pts, fill, stroke = INK) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = LW; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function rrect(ctx, x, y, w, h, r, fill, stroke = INK) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = LW; ctx.stroke(); }
}
function disc(ctx, x, y, r, fill, stroke = INK) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = LW; ctx.stroke(); }
}
function line(ctx, pts, color = INK, w = LW) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}
function wheel(ctx, x, y, r, t, spin = 1, hub = CHROME) {
  disc(ctx, x, y, r, BLACK);
  disc(ctx, x, y, r * 0.52, hub, null);
  const a = t * spin;
  line(ctx, [[x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5], [x - Math.cos(a) * r * 0.5, y - Math.sin(a) * r * 0.5]], CHROME_DK, 0.5);
  disc(ctx, x, y, r * 0.12, INK, null);
}
function shadow(ctx, x, w) {
  ctx.fillStyle = 'rgba(42,29,30,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, 0.4, w / 2, 1.6, 0, 0, TAU);
  ctx.fill();
}
// A hand wave: the arm from (x,y) swinging by `k` -1..1.
function arm(ctx, x, y, ang, len, sleeve, hand = SKIN) {
  const hx = x + Math.cos(ang) * len, hy = y + Math.sin(ang) * len;
  line(ctx, [[x, y], [hx, hy]], INK, 3.0);
  line(ctx, [[x, y], [hx, hy]], sleeve, 1.8);
  disc(ctx, hx, hy, 1.5, hand);
}
function blink(t, period = 3.1) { return (t % period) > period - 0.14; }

// ------------------------------------------------------------------ A: GRANDMA'S SCOOTER
// A mobility scooter in tomato, a basket on the front with a loaf in it, a flag on a
// whip, BABY ON BOARD hung off the back, and a granny in lilac with a bun. She is
// headed left (toward us) at a stately crawl. As she draws level with the hero she
// waves and the flag whips; her bell goes.
function paintScooter(ctx, t, u, near) {
  const bob = Math.sin(t * 7) * 0.25;
  shadow(ctx, 0, 34);
  ctx.save(); ctx.translate(0, bob);
  // rear wheel + body
  wheel(ctx, 9, -4.2, 4.2, -t * 5, 1);
  wheel(ctx, -11, -3.2, 3.2, -t * 6, 1);
  // deck and rear cowl
  poly(ctx, [[-12, -6], [-6, -9], [12, -9], [14, -5], [12, -3], [-10, -3]], TOMATO);
  poly(ctx, [[2, -9], [13, -9], [14, -5], [4, -5]], TOMATO_DK);
  // seat post + cushion
  line(ctx, [[3, -9], [3, -13]], INK, 1.2);
  rrect(ctx, -2, -15, 11, 3.2, 1.4, CREAM_DK);
  // front stem to the tiller
  line(ctx, [[-9, -6], [-8, -18]], INK, 1.2);
  line(ctx, [[-10.5, -18.5], [-5.5, -18.5]], INK, 1.2);
  // basket + loaf
  rrect(ctx, -17, -14, 8, 5.4, 1, MUSTARD_LT);
  for (let i = 0; i < 3; i++) line(ctx, [[-15.5 + i * 2.6, -13.4], [-15.5 + i * 2.6, -9.6]], MUSTARD_DK, 0.4);
  ctx.save(); ctx.beginPath(); ctx.ellipse(-12.5, -15.4, 4.2, 1.9, -0.25, 0, TAU);
  ctx.fillStyle = '#d9954a'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke(); ctx.restore();
  // BABY ON BOARD: a mustard diamond hanging off the back
  line(ctx, [[14, -8], [16, -8], [16, -6]], INK, 0.4);
  poly(ctx, [[16, -6], [19.2, -3.2], [16, -0.4], [12.8, -3.2]], MUSTARD);
  line(ctx, [[14.6, -3.2], [17.4, -3.2]], INK, 0.5);
  // flag on a whip: sways, whips harder as she's level with the hero
  const whip = 1 + near * 2.2;
  const fx = 12.5, fy = -14;
  const wave = (k) => Math.sin(t * 9 * whip + k) * (0.6 + near * 1.4);
  line(ctx, [[fx, fy], [fx + 0.8 + wave(0) * 0.2, fy - 9], [fx + 1.6 + wave(1) * 0.5, fy - 17]], INK, 0.6);
  poly(ctx, [[fx + 1.6 + wave(1) * 0.5, fy - 17], [fx + 9 + wave(2), fy - 15 + wave(3) * 0.5], [fx + 1.8 + wave(1) * 0.5, fy - 12.5]], TOMATO);
  // the granny: lilac cardigan, a skirt over the seat, a bun, specs
  poly(ctx, [[-1, -14], [9, -14], [10, -9.5], [-2, -9.5]], LILAC_DK);           // skirt
  poly(ctx, [[0, -14], [-1, -23], [6, -24], [8, -14]], LILAC);                    // cardigan
  line(ctx, [[3.5, -23.4], [3.5, -14.4]], LILAC_DK, 0.5);
  disc(ctx, 2, -17.5, 0.5, MUSTARD, null); disc(ctx, 2, -20, 0.5, MUSTARD, null);
  // far arm to the tiller
  arm(ctx, 0.5, -21, 3.0, 5.6, LILAC_DK);
  // legs: little shoes on the deck
  rrect(ctx, -8, -9.2, 4.8, 2.2, 1, '#6a4a6a');
  // head
  disc(ctx, 3.4, -28, 4.1, SKIN);
  disc(ctx, 4.2, -33.6, 2.3, '#e8e8f0');                                           // bun
  ctx.beginPath(); ctx.arc(3.4, -29, 4.2, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fillStyle = '#e8e8f0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
  // face (looking left, a little toward us when she's level)
  const lookX = -1.2 - near * 0.6;
  const bl = blink(t);
  ctx.strokeStyle = INK; ctx.lineWidth = 0.6;
  if (bl) { line(ctx, [[lookX + 0.4, -28.2], [lookX + 2.1, -28.2]], INK, 0.5); }
  else { disc(ctx, lookX + 1.4, -28.2, 0.55, INK, null); }
  ctx.beginPath(); ctx.arc(lookX + 1.4, -28.2, 1.5, 0, TAU); ctx.strokeStyle = INK; ctx.lineWidth = 0.4; ctx.stroke(); // spectacles
  line(ctx, [[lookX - 0.1, -28], [lookX - 2.5, -27.6]], INK, 0.4);
  disc(ctx, lookX - 1.2, -25.8, 0.55, '#e88a8a', null);                              // blush
  ctx.beginPath(); ctx.arc(lookX + 0.6, -26.4, 1.0, 0.15, Math.PI - 0.15); ctx.strokeStyle = INK; ctx.lineWidth = 0.45; ctx.stroke(); // smile
  // near arm: the wave when level, otherwise the tiller
  const ang = near > 0.02 ? -2.2 - Math.sin(t * 11) * 0.45 * near : 2.7;
  arm(ctx, 4.5, -21.5, ang, near > 0.02 ? 6.5 : 5.4, LILAC);
  // headscarf knot
  poly(ctx, [[5.5, -30.5], [9.5, -32], [8, -28.5]], TEAL);
  ctx.restore();
  // bell: tiny ring marks when level
  if (near > 0.2) {
    ctx.save(); ctx.globalAlpha = near;
    for (const s of [-1, 1]) line(ctx, [[-8 + s * 4.5, -22], [-8 + s * 6.2, -23.4]], INK, 0.5);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ B: THE TOW
// A small teal tow truck on a long hook hauling a MUCH bigger mustard tow truck, whose
// driver hangs out of the window to wave. Both have amber beacons; the little one's
// strains (cab dips, exhaust puffs), the big one just rides along with its hook up.
function paintTruckSmall(ctx, t, strain) {
  const dip = Math.sin(t * 13) * 0.3 * strain;
  shadow(ctx, 0, 28);
  ctx.save(); ctx.translate(0, dip);
  wheel(ctx, -9, -3.6, 3.6, -t * 7);
  wheel(ctx, 8, -3.6, 3.6, -t * 7);
  // flatbed bit and boom
  poly(ctx, [[-14, -7], [-14, -11], [-1, -11], [-1, -7]], TEAL_DK);
  line(ctx, [[-13, -11], [-18, -18]], INK, 1.2);                                      // boom
  line(ctx, [[-18, -18], [-20, -8]], INK, 0.5);                                       // cable
  // cab
  poly(ctx, [[-1, -7], [-1, -17], [5, -17], [8, -12], [14, -11], [14, -7]], TEAL);
  poly(ctx, [[1, -16], [4.6, -16], [6.8, -12.4], [1, -12.4]], GLASS);
  disc(ctx, 11.5, -9, 0.9, MUSTARD_LT);
  // beacon on the roof, blinking amber
  const on = Math.floor(t * 4) % 2 === 0;
  rrect(ctx, 0.5, -19.2, 3.4, 2.2, 1, on ? MUSTARD : MUSTARD_DK);
  if (on) { ctx.save(); ctx.globalAlpha = 0.35; disc(ctx, 2.2, -18.1, 4.4, MUSTARD_LT, null); ctx.restore(); }
  // driver: a mustachioed little fellow in a cap
  disc(ctx, 2.8, -14.3, 1.5, SKIN);
  rrect(ctx, 1.2, -16.6, 3.6, 1.2, 0.5, TOMATO);
  line(ctx, [[1.6, -13.4], [4, -13.4]], INK, 0.5);
  // exhaust puffs from a stack
  line(ctx, [[-2, -17], [-2, -21]], INK, 1);
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.9 + i / 3) % 1);
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.6;
    disc(ctx, -2 + k * 6, -22 - k * 8, 1.4 + k * 2.2, CREAM, null);
    ctx.restore();
  }
  ctx.restore();
}
function paintTruckBig(ctx, t, level) {
  shadow(ctx, 0, 52);
  wheel(ctx, -16, -5.6, 5.6, -t * 5);
  wheel(ctx, -4, -5.6, 5.6, -t * 5);
  wheel(ctx, 20, -5.6, 5.6, -t * 5);
  // long bed with a hoist
  poly(ctx, [[-24, -11], [-24, -17], [4, -17], [4, -11]], MUSTARD_DK);
  poly(ctx, [[-24, -17], [-24, -19], [4, -19], [4, -17]], MUSTARD);
  line(ctx, [[-20, -19], [-20, -30], [-6, -30]], INK, 1.6);                           // gantry
  line(ctx, [[-6, -30], [-6, -22]], INK, 0.5);
  poly(ctx, [[-8, -22], [-4, -22], [-6, -19.4]], TOMATO);                             // hook block
  // cab: tall and square, a big grille
  poly(ctx, [[4, -11], [4, -31], [18, -31], [20, -25], [30, -24], [30, -11]], MUSTARD);
  poly(ctx, [[7, -29], [17, -29], [18.4, -25], [7, -25]], GLASS);
  poly(ctx, [[24, -23], [30, -23], [30, -11], [24, -11]], MUSTARD_LT);
  for (let i = 0; i < 4; i++) line(ctx, [[25, -21.4 + i * 2.8], [29.4, -21.4 + i * 2.8]], INK, 0.4);
  disc(ctx, 28.4, -12.4, 1.2, TOMATO);
  // beacon pair
  const on = Math.floor(t * 4 + 1) % 2 === 0;
  rrect(ctx, 8, -33.4, 3.4, 2.4, 1, on ? TOMATO : TOMATO_DK);
  rrect(ctx, 13, -33.4, 3.4, 2.4, 1, on ? TOMATO_DK : TOMATO);
  // the driver, waving a big mitt out of the side window once level
  const wave = level > 0.02;
  disc(ctx, 11, -26.5, 2.2, SKIN);
  rrect(ctx, 8.5, -30.4, 5.6, 1.8, 0.7, TEAL);                                         // cap
  line(ctx, [[9.4, -25], [12.4, -25]], INK, 0.5);
  if (wave) arm(ctx, 14, -22, -1.0 - Math.sin(t * 12) * 0.5 * level, 6.5, MUSTARD_DK);
  // number on the door and a stripe
  line(ctx, [[5, -15], [29, -15]], TOMATO, 1.2);
  // a bumper sticker: HONK
  rrect(ctx, -23, -16, 8, 3.4, 0.6, CREAM);
  line(ctx, [[-22, -14.3], [-16.5, -14.3]], INK, 0.7);
}
function paintTow(ctx, t, u, near) {
  // The little truck leads (left), the big one behind it on a taut tow-bar.
  ctx.save(); ctx.translate(-30, 0); paintTruckSmall(ctx, t, 1); ctx.restore();
  ctx.save(); ctx.translate(30, 0); paintTruckBig(ctx, t, near); ctx.restore();
  // tow bar: from the little one's boom tail across to the big one's front... bar to the big truck's grille
  line(ctx, [[-20, -9], [-20, -6], [4, -6]], INK, 0.9);
}

// ------------------------------------------------------------------ C: THE TORTOISE
// A tortoise in a racing helmet with a number 1 on a shell the colour of a tyre. He
// plods across at the finish, impossibly smug, blinking slowly; a tiny chequered flag
// on a stick trails from the shell. When he draws level with the hero he raises one
// foot — the finish line is his, he got there first.
function paintTortoise(ctx, t, u, near) {
  const step = t * 1.6;
  shadow(ctx, 0, 22);
  // legs: four stubby pads, alternating
  for (const [x, ph] of [[-7.5, 0], [-2.5, 0.5], [3.5, 0.5], [8, 0]]) {
    const lift = Math.max(0, Math.sin((step + ph) * TAU)) * 1.8;
    rrect(ctx, x - 1.6, -3.2 - lift, 3.2, 3.4, 1.2, '#7aa65a');
  }
  // tail
  poly(ctx, [[10.5, -5], [14, -3.6], [10.5, -3]], '#7aa65a');
  // shell dome in racing livery: cream with a tomato stripe
  ctx.beginPath(); ctx.ellipse(1, -7.5, 11.5, 7.8, 0, Math.PI, 0);
  ctx.closePath(); ctx.fillStyle = CREAM; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.ellipse(1, -7.5, 11.5, 7.8, 0, Math.PI, 0); ctx.clip();
  ctx.fillStyle = TOMATO; ctx.fillRect(-12, -10.2, 26, 2.2);
  ctx.fillStyle = TOMATO; ctx.fillRect(-12, -12.4, 26, 0.0);
  ctx.restore();
  rrect(ctx, -10.5, -3.9, 22, 2.2, 1, TEAL_DK);                                        // rim of the shell
  // number plate
  disc(ctx, 1, -9, 3.1, CREAM, INK);
  line(ctx, [[0.2, -10.6], [1.6, -11.2], [1.6, -6.8]], INK, 0.9);                      // a "1"
  // flag on a stick, standing off the shell
  line(ctx, [[8, -12], [9.5, -21]], INK, 0.5);
  const fl = Math.sin(t * 5) * 0.7;
  const fc = (i, j) => ((i + j) % 2 ? INK : CREAM);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    rrect(ctx, 9.5 + i * 1.6, -21 + j * 1.6 + fl * i * 0.3, 1.6, 1.6, 0, fc(i, j), null);
  }
  // head: a long neck forward (left) with a helmet
  const nod = Math.sin(step * TAU) * 0.35;
  poly(ctx, [[-9, -6.4], [-13.5, -8.8 + nod], [-13.5, -4.6 + nod], [-9, -4]], '#7aa65a');
  disc(ctx, -15, -8.6 + nod, 3.5, '#7aa65a');
  // the helmet: a tomato dome with a visor and a chinstrap
  ctx.beginPath(); ctx.arc(-15, -9.6 + nod, 3.9, Math.PI * 0.92, Math.PI * 2.04);
  ctx.closePath(); ctx.fillStyle = TOMATO; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
  line(ctx, [[-16.4, -12.4 + nod], [-13.6, -13 + nod]], CREAM, 0.7);                   // stripe on the helmet
  poly(ctx, [[-19, -9.6 + nod], [-16.6, -9.8 + nod], [-17, -8.4 + nod]], GLASS);        // the visor
  // face: heavy lids over a calm eye, a very small smile
  const bl = blink(t, 2.4);
  if (bl) line(ctx, [[-16.9, -7.9 + nod], [-15.1, -7.9 + nod]], INK, 0.5);
  else {
    disc(ctx, -16, -7.8 + nod, 0.8, INK, null);
    line(ctx, [[-17.2, -8.7 + nod], [-14.8, -8.7 + nod]], INK, 0.7);                 // the lid
  }
  ctx.beginPath(); ctx.arc(-17.4, -5.8 + nod, 1.1, 0.2, Math.PI - 0.2); ctx.strokeStyle = INK; ctx.lineWidth = 0.45; ctx.stroke();
  // victory: a foot raised when level
  if (near > 0.05) {
    const k = near;
    rrect(ctx, -4.5, -6 - k * 4.8, 3.0, 3.6, 1.2, '#7aa65a');
  }
}

// ------------------------------------------------------------------ D: JUST MARRIED
// An open-top 1959 convertible in turquoise, doing four miles an hour: a couple in the
// back, a dog on the front seat with its head out and its ears flapping, JUST MARRIED
// in lipstick across the boot and a string of tin cans clanking along behind.
function paintConvertible(ctx, t, u, near) {
  const bob = Math.sin(t * 6) * 0.3;
  shadow(ctx, 0, 52);
  ctx.save(); ctx.translate(0, bob);
  wheel(ctx, 17, -5.4, 5.4, -t * 3, 1, CREAM);
  wheel(ctx, -17, -5.4, 5.4, -t * 3, 1, CREAM);
  // long body with a tail fin on the right (rear), bonnet on the left (front)
  poly(ctx, [[-26, -7], [-26, -12], [-14, -14], [-2, -14], [8, -14], [22, -15], [25, -23], [22, -22], [20, -12], [25, -8], [25, -3.5], [-24, -3.5]], TEAL);
  poly(ctx, [[-26, -9], [-20, -10], [22, -10], [25, -8], [25, -3.5], [-24, -3.5], [-26, -4]], TEAL_DK);
  line(ctx, [[-25, -10], [22, -10]], CHROME, 0.9);                                       // chrome side flash
  disc(ctx, -24.5, -8.4, 1.3, MUSTARD_LT);                                             // headlamp
  poly(ctx, [[-26, -7.5], [-27.2, -6], [-26, -4.5]], CHROME);                           // bumper
  // windscreen
  line(ctx, [[-7, -14], [-9, -21], [-6.4, -21]], CHROME, 0.9);
  // interior: the seat backs
  rrect(ctx, 8, -19, 5, 5.5, 1, TOMATO);
  rrect(ctx, -2, -17.5, 4, 4, 1, TOMATO);
  // the couple in the back seat: bodies above the door line, heads leaning together
  // for the kiss when the beat plays
  const lean = near * 1.5;
  const wind = Math.sin(t * 9);
  // the bride: a cream gown, a brown bun, and a veil streaming back on the wind
  poly(ctx, [[12.4, -14], [12.8, -19.6], [17.6, -19.6], [18.4, -14]], CREAM, INK);
  const bx = 15.2 - lean;
  poly(ctx, [[bx + 1, -26.4], [bx + 9 + wind * 1.2, -25.4 + wind * 0.6], [bx + 11 + wind * 1.6, -22.4], [bx + 3, -22.2]], '#fffaf0');
  disc(ctx, bx, -23.2, 2.7, SKIN);
  ctx.beginPath(); ctx.arc(bx + 0.4, -23.8, 2.8, Math.PI * 0.9, Math.PI * 2.0); ctx.fillStyle = '#6a3a2a'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
  disc(ctx, bx - 2.4, -26.2, 1.3, '#6a3a2a');                                           // bun
  disc(ctx, bx - 1.1, -23.1, 0.5, INK, null);                                           // eye
  ctx.beginPath(); ctx.arc(bx - 1.4, -21.9, 0.9, 0.2, Math.PI - 0.2); ctx.strokeStyle = TOMATO; ctx.lineWidth = 0.5; ctx.stroke();
  // the groom: a black tux, a bow tie, a top hat, a moustache
  poly(ctx, [[5.6, -14], [6, -19.6], [11, -19.6], [11.4, -14]], BLACK, INK);
  poly(ctx, [[7.6, -19.6], [9.4, -19.6], [8.5, -16.4]], CREAM, null);
  const gx = 8.6 + lean;
  disc(ctx, gx, -23.2, 2.7, SKIN);
  rrect(ctx, gx - 4.6, -25.9, 9.2, 1.0, 0.5, BLACK);                                    // hat brim
  rrect(ctx, gx - 2.7, -31.4, 5.4, 5.8, 0.8, BLACK);                                    // hat crown
  line(ctx, [[gx - 2.7, -27.6], [gx + 2.7, -27.6]], TOMATO, 0.9);                       // hat band
  disc(ctx, gx + 1.1, -23.3, 0.5, INK, null);                                           // eye
  line(ctx, [[gx + 0.3, -21.3], [gx + 2.5, -21.5]], INK, 0.55);                         // moustache
  if (near > 0.15) {
    for (let k = 0; k < 3; k++) {
      const hk = ((t * 0.9 + k / 3) % 1);
      ctx.save(); ctx.globalAlpha = near * (1 - hk);
      const hx = 12 + Math.sin(hk * 7 + k) * 2.2, hy = -30 - hk * 10;
      disc(ctx, hx - 0.7, hy, 0.9, TOMATO, null); disc(ctx, hx + 0.7, hy, 0.9, TOMATO, null);
      poly(ctx, [[hx - 1.5, hy + 0.3], [hx + 1.5, hy + 0.3], [hx, hy + 2]], TOMATO, null);
      ctx.restore();
    }
  }
  // the dog on the front seat, head out over the door, ears flapping
  rrect(ctx, -2.4, -18, 6, 4.4, 1.4, '#c2905a');
  disc(ctx, 0.6, -20.8, 3.4, '#c2905a');
  const ear = Math.sin(t * 14);
  poly(ctx, [[1.8, -21.6], [5.6 + ear * 1.4, -21 + ear * 1.8], [3.2, -18.6]], '#8a5e34');
  poly(ctx, [[-1.6, -21.6], [-5.6 - ear * 0.4, -20 + ear * 0.8], [-3, -18.4]], '#8a5e34');
  disc(ctx, -3.6, -18.6, 1.5, '#e8d0a6');                                                // muzzle
  disc(ctx, -4.6, -19.1, 0.55, INK, null);
  disc(ctx, -0.4, -21.8, 0.55, INK, null);
  if (Math.floor(t * 3) % 3 !== 0) { poly(ctx, [[-4.2, -17.2], [-2.6, -17.2], [-3.4, -14.9]], '#f08a96'); }  // the tongue
  // JUST MARRIED, rear deck
  rrect(ctx, 12, -13.8, 12, 3.6, 0.5, CREAM);
  line(ctx, [[13.2, -12.7], [22.8, -12.7]], TOMATO, 0.8);
  line(ctx, [[13.2, -11.2], [20, -11.2]], TOMATO, 0.6);
  // tin cans on strings, clanking along behind
  for (let i = 0; i < 4; i++) {
    const sx = 25, sy = -5;
    const len = 6 + i * 5;
    const sw = Math.sin(t * 8 + i * 1.7) * 1.6;
    const cx = sx + len + sw, cy = -2.2 - Math.abs(Math.sin(t * 7 + i * 2.3)) * 1.8;
    line(ctx, [[sx, sy], [(sx + cx) / 2, (sy + cy) / 2 - 1], [cx, cy - 1]], INK, 0.35);
    rrect(ctx, cx - 1.4, cy - 1.8, 2.8, 3.2, 0.5, CHROME, INK);
  }
  // a 'just married' bunting from the fin
  ctx.restore();
}

// ------------------------------------------------------------------ the candidates
// `u` is seconds into the loop. `rel` is the gag's world x ahead of the hero (+ is
// ahead); `level` runs 0..1..0 as it draws level with the hero. `speed` the gag's own
// pace left across the world (u/s); `lane` how far back from the hero's line it runs.
export const SPEED_FINISH_CANDIDATES = Object.freeze([
  {
    letter: 'A', name: 'GRANDMA’S SCOOTER', paint: paintScooter, speed: 34, lane: 2, span: 30,
    note: 'A mobility scooter in tomato doing about four miles an hour: a basket with a loaf, BABY ON BOARD, a whip flag. She waves as we draw level and her flag whips.',
  },
  {
    letter: 'B', name: 'THE TOW', paint: paintTow, speed: 26, lane: 2, span: 64,
    note: 'A little teal tow truck hauling a MUCH bigger mustard tow truck, amber beacons blinking, exhaust puffing. The big one’s driver waves a mitt as we pass.',
  },
  {
    letter: 'C', name: 'THE TORTOISE', paint: paintTortoise, speed: 9, lane: 2, span: 20,
    note: 'A tortoise in a racing helmet, number 1 on his shell, a chequered flag on a stick. He plods to the line, heavy-lidded and smug, and raises one foot as we draw level.',
  },
  {
    letter: 'D', name: 'JUST MARRIED', paint: paintConvertible, speed: 30, lane: 2, span: 56,
    note: 'A 1959 convertible crawling along with a dog on the front seat, ears flapping, a bride and groom in the back, JUST MARRIED on the boot and tin cans clanking behind. They kiss as we pass.',
  },
]);

// ------------------------------------------------------------------ the scene
const packs = new Map();
export function drawSpeedFinishScene(ctx, t, cand, { stageIndex = 3 } = {}) {
  const cab = CABINET_BY_ID.speed;
  // One pack per card: the pack latches landmarks and wildlife as the camera moves, so
  // tiles on different clocks must not share one.
  const key = `${cand.letter}:${stageIndex}`;
  const fresh = !packs.has(key);
  if (fresh) packs.set(key, getStylePack(cab.style, { stageIndex }));
  const pack = packs.get(key);
  const u = ((t % SPEED_FINISH_LOOP) + SPEED_FINISH_LOOP) % SPEED_FINISH_LOOP;
  // The camera: the run's pace until PARK[0], easing to a stop by PARK[1].
  const park = smooth(PARK[0], PARK[1], u);
  const pace = RUN * (1 - park);
  // Distance travelled: full pace to PARK[0], a linear ease-down to PARK[1], then nothing.
  const camX = 2400 + (u < PARK[0] ? u * RUN
    : u < PARK[1] ? PARK[0] * RUN + (u - PARK[0]) * (pace + RUN) / 2
      : PARK[0] * RUN + (PARK[1] - PARK[0]) * RUN / 2);
  // The gag's world x: it creeps left at its own pace and is `hold` ahead of the hero (its
  // middle on PLAYER_X + hold, the beat's spot) at BEAT_AT seconds, after the camera has parked.
  const parkedX = 2400 + PARK[0] * RUN + (PARK[1] - PARK[0]) * RUN / 2;
  const hold = cand.span * 0.5 + 38;
  const gx = parkedX + PLAYER_X + hold - cand.speed * (u - BEAT_AT);
  const sx = gx - camX;                        // world x within the frame
  // The beat: the hero is drawn in front of the gag, so it plays as the gag closes on him
  // (its middle `ahead` of PLAYER_X): ramping in, held until he is nearly on it, then out.
  const ahead = sx - PLAYER_X;
  const level = (u > PARK[0] ? 1 : 0)
    * smooth(hold + 40, hold + 10, ahead) * (1 - smooth(8, -14, ahead));

  // The pack's landmark and wildlife latch as the first loop plays (the dish and its birds
  // arrive ~5 s in), so a card's first frames would show a different scene to every later
  // loop: play the backdrop once at a late clock before the first real frame.
  if (fresh) pack.bg?.(ctx, 30, camX, cab, 6000, null, 0, { stageIndex, progress: 0.97 });
  ctx.save();
  pack.bg?.(ctx, t, camX, cab, 6000, null, 0, { stageIndex, progress: 0.97 });
  ctx.save();
  applyWorld(ctx, ZOOM, 0, GROUND_Y);
  pack.ground?.(ctx, camX, cab, [], [], t * 60, VIEW_W);
  // The gag, on the road's back edge, behind the hero.
  ctx.save();
  ctx.translate(sx, GROUND_Y - cand.lane);
  cand.paint(ctx, t, u, level);
  ctx.restore();
  drawToon(ctx, 'lorenzo', { kind: 'run', phase: (t * 1.6) % 1, time: t, vy: 0, grounded: true, squash: 0, lean: 0, roll: false, float: false, stomp: false, headless: false, facing: 1 }, PLAYER_X, GROUND_Y, HERO_DRAW_H);
  ctx.restore();
  pack.post?.(ctx, t);
  ctx.restore();
}
