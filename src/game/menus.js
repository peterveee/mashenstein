// Title, slot select, difficulty select (the joke), intro cutscene, results,
// finale, settings. All keyboard + touch navigable.
import { W, H, setFancyFx, setSceneGlow, setSkyFx, pushOverlayDraw } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawText, drawTextCentered, textWidth, getSprite, wrapText } from '../engine/sprites.js';
import { drawToon } from '../sprites/toons.js';
import { drawProp, hasProp, glowSprite } from '../sprites/props.js';
import { burst, spawnShard, updateParticles, drawParticles, clearParticles } from '../engine/particles.js';

// Field-guide icon sizes (logical px) for vector props.
const GUIDE_ICON_SIZES = {
  cactus: [13, 19], crate: [12, 11], barrel: [13, 13], chair: [12, 10],
  tombstone: [11, 8], zombieWalk: [10, 14], resident: [10, 12], drone: [13, 8], buzzbird: [13, 8],
  icicle: [8, 10], cardboardMonster: [12, 9], printer: [12, 8], capStar: [9, 9],
  battery: [8, 9], boostPad: [14, 5], coin: [8, 8], capShield: [9, 9],
  capMagnet: [9, 9], capAirJump: [9, 9], capSpeed: [9, 9], capLowGrav: [9, 9], capUnpeel: [9, 9], capRelay: [9, 9], appliance: [12, 9], fuse: [9, 7],
  eggshell: [24, 20], target: [9, 9],
};
import { DIFFICULTIES, INTRO_PANELS, FINALE_BEATS, RANK_LINES } from '../data/jokes.js';
import { BRIEFINGS, BRIEFING_PROMPTS } from '../data/briefings.js';
import { CABINETS, HUB_THEME, TITLE_THEME } from '../data/cabinets.js';
import { totalPlugs, MAX_PLUGS, formatCoins } from './progress.js';

function menuNav(input, idx, len) {
  if (input.pressed('down') || input.pressed('right')) { Audio.sfx('ui'); return (idx + 1) % len; }
  if (input.pressed('up') || input.pressed('left')) { Audio.sfx('ui'); return (idx + len - 1) % len; }
  return idx;
}

const TAGLINES = [
  'NOW WITH 40% MORE UNPLUGGING',
  'THE ARCADE SMELLS LIKE VICTORY AND OLD NACHOS',
  'NO REFUNDS. THE MACHINE ATE YOUR QUARTER HONESTLY',
  'RATED E FOR EGGSHELL',
  'CONTAINS TRACE AMOUNTS OF PLUMBER',
  'THE TOASTER IS NOT A METAPHOR',
  'A HEDGEHOG LAWYER REVIEWED THIS TITLE SCREEN',
  'BATTERIES NOT INCLUDED. BATTERIES ARE THE PLOT',
  'THE CLOUD IS LAUGHING AT YOU SPECIFICALLY',
  'ESTABLISHED 198X. RENOVATED NEVER',
  'FLOOR MOPPED HOURLY BY A HAUNTED VACUUM',
  'EVERY PIXEL LOVINGLY REPLACED WITH MATH',
];

let titleGrad = null;
function drawParadeAccent(ctx, id, x, feetY, p) {
  const fade = Math.sin(p * Math.PI);
  if (fade <= 0) return;
  ctx.save();
  ctx.globalAlpha *= fade * 0.9;
  if (id === 'lorenzo') {
    ctx.fillStyle = '#f6d33c';
    ctx.fillRect(x + 8, feetY - 24, 2, 5); ctx.fillRect(x + 6, feetY - 22, 6, 2);
  } else if (id === 'gnash') {
    ctx.strokeStyle = '#9ca8ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 12, feetY - 8); ctx.lineTo(x - 5, feetY - 8); ctx.moveTo(x - 10, feetY - 12); ctx.lineTo(x - 4, feetY - 12); ctx.stroke();
  } else if (id === 'fernwick') {
    ctx.fillStyle = '#d7ff83';
    ctx.fillRect(x - 11, feetY - 5, 3, 2); ctx.fillRect(x - 14, feetY - 3, 2, 2);
  } else if (id === 'b33p') {
    ctx.fillStyle = '#e8f8ff';
    ctx.fillRect(x + 10, feetY - 16, 5, 1); ctx.fillRect(x + 12, feetY - 18, 1, 5);
  } else if (id === 'mochi') {
    const yy = feetY - 27 - p * 5;
    ctx.fillStyle = '#edb8ff';
    ctx.fillRect(x - 4, yy, 2, 2); ctx.fillRect(x, yy, 2, 2);
    ctx.fillRect(x - 3, yy + 2, 4, 2); ctx.fillRect(x - 2, yy + 4, 2, 2);
  } else if (id === 'chompo') {
    ctx.fillStyle = '#ffd184';
    ctx.fillRect(x + 11, feetY - 13, 2, 2); ctx.fillRect(x + 15, feetY - 17, 2, 2);
  } else if (id === 'raymn') {
    ctx.strokeStyle = '#f6d33c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 14, feetY - 18, 5, -1.1, 0.8); ctx.stroke();
  } else if (id === 'grumpos') {
    ctx.strokeStyle = '#f4d08a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 10, feetY - 23); ctx.lineTo(x - 14, feetY - 27);
    ctx.moveTo(x + 10, feetY - 23); ctx.lineTo(x + 14, feetY - 27); ctx.stroke();
  }
  ctx.restore();
}
// A space-invader wanders across the sky every so often, waggling its legs in
// the classic two-frame march. It is not part of any joke; it is just up there.
const INVADER_FRAMES = [
  ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.',
   '###########', '#.#######.#', '#.#.....#.#', '...##.##...'],
  ['..#.....#..', '#..#...#..#', '#.#######.#', '###.###.###',
   '###########', '.#########.', '..#.....#..', '.#.......#.'],
];
// It keeps to the very top of the sky, well clear of the logo, and on every
// other pass it drops a bolt on whoever happens to be walking underneath.
// Everything below is a pure function of the clock: no state to keep in sync.
const INV_FIRST = 24;      // the sky stays empty for the first half-minute
const INV_PERIOD = 46;     // ...and between fly-bys after that
const INV_CROSS = 9;       // seconds to cross
const INV_DROP_P = 0.42;   // fly-by progress at which the bolt is released
const INV_SPAN = W + 44;
const BOLT_G = 260;        // px/s^2
const BOLT_HEAD_Y = 238;   // where the parade's heads are
const KNOCK_T = 1.9;       // how long a clobbered hero stays airborne

const invX = (trip, p) => (trip % 2 === 0 ? -22 + p * INV_SPAN : W + 22 - p * INV_SPAN);
const invY = (trip, t) => 7 + (trip % 3) * 4 + Math.sin(t * 2.3) * 1.6;
const heroX = (i, t) => ((t * 42 + i * 66) % (W + 140)) - 70;

// Rare, legally-distinct maze-wisp cameos. They share the heroes' floor line
// but are visitors rather than roster members: a small gang crosses once, then
// leaves the parade alone for long enough that the next appearance surprises.
const PARADE_SPEED = 42;
const PARADE_SPAN = W + 140;
// Start when Lorenzo is 30px ahead of the left edge, then repeat only every
// third parade lap. This aligns the guests with the reserved tail behind him.
const WISP_FIRST = PARADE_SPAN / PARADE_SPEED + 76 / PARADE_SPEED;
const WISP_PERIOD = (PARADE_SPAN / PARADE_SPEED) * 3;
const WISP_COLORS = ['#f06c88', '#66cbe8', '#f2a45f', '#ad82e8', '#79d48d'];

function mazeWispPass(t) {
  if (t < WISP_FIRST) return null;
  const elapsed = t - WISP_FIRST;
  const trip = Math.floor(elapsed / WISP_PERIOD);
  const local = elapsed % WISP_PERIOD;
  const count = 2 + (trip % 3);
  // From the lead wisp touching the left edge until the final trailing wisp
  // has completely cleared the right. No alpha fade and no mid-screen cutoff.
  const cross = (W + 48 + (count - 1) * 26) / PARADE_SPEED;
  if (local > cross) return null;
  return { trip, local, count };
}

function drawMazeWisp(ctx, x, feetY, color, phase, mood) {
  const bob = Math.sin(phase * Math.PI * 2) * 1.3;
  const swish = Math.sin(phase * Math.PI * 1.35 + mood) * 1.2;
  const face = (Math.floor(phase * 0.42) + mood) % 4;
  const blinkClock = ((phase + mood * 1.31) % 6 + 6) % 6;
  const blinking = blinkClock > 5.68;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(feetY + bob));
  ctx.scale(0.68, 0.68);
  ctx.lineJoin = 'round';
  // Rounded hood, tapered sides and three uneven little skirt points make a
  // soft floating mascot rather than a literal arcade-ghost sprite.
  ctx.beginPath();
  ctx.moveTo(-9, 0); ctx.lineTo(-9, -16);
  ctx.bezierCurveTo(-9, -23, -4, -27, 0, -27);
  ctx.bezierCurveTo(5, -27, 9, -22, 9, -16);
  ctx.lineTo(9, swish * 0.35); ctx.lineTo(5, -4 - swish); ctx.lineTo(1, swish * 0.45);
  ctx.lineTo(-3, -4 + swish); ctx.lineTo(-7, -swish * 0.25); ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(25,16,40,0.42)'; ctx.lineWidth = 1; ctx.stroke();
  // Each visitor scans the room on its own rhythm; the small vertical glance
  // keeps the pupils from looking like they merely slide on rails.
  const glanceX = Math.sin(phase * 0.83 + mood * 2.1) * 1.25;
  const glanceY = Math.cos(phase * 0.57 + mood) * 0.65;
  ctx.fillStyle = '#fff8e8';
  if (blinking) {
    ctx.strokeStyle = '#30204a'; ctx.lineWidth = 1.2; ctx.beginPath();
    ctx.moveTo(-5.8, -16); ctx.quadraticCurveTo(-3.3, -14.8, -0.8, -16);
    ctx.moveTo(0.8, -16); ctx.quadraticCurveTo(3.3, -14.8, 5.8, -16); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.ellipse(-3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.3, -16, 2.7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#30204a';
    ctx.beginPath(); ctx.arc(-3.3 + glanceX, -16 + glanceY, 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.3 + glanceX, -16 + glanceY, 1.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-3.65 + glanceX, -16.35 + glanceY, 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.95 + glanceX, -16.35 + glanceY, 0.32, 0, Math.PI * 2); ctx.fill();
  }
  // Expressions turn over at a leisurely pace rather than flickering with the
  // walk cycle: happy, surprised, doubtful, then determined.
  ctx.strokeStyle = '#6f3555'; ctx.lineWidth = 0.9; ctx.beginPath();
  if (face === 0) { ctx.arc(0, -11, 2.5, 0.15, Math.PI - 0.15); ctx.stroke(); }
  else if (face === 1) { ctx.ellipse(0, -9.5, 1.55, 2, 0, 0, Math.PI * 2); ctx.fillStyle = '#6f3555'; ctx.fill(); }
  else if (face === 2) { ctx.arc(0, -8, 2.3, Math.PI + 0.2, Math.PI * 2 - 0.2); ctx.stroke(); }
  else { ctx.moveTo(-2.3, -10); ctx.lineTo(2.3, -10.5); ctx.stroke(); }
  ctx.restore();
}

function drawMazeWispCameo(ctx, t, reduced) {
  if (reduced) return;
  const pass = mazeWispPass(t);
  if (!pass) return;
  // All visitors share the parade's exact speed. Starting this traversal at
  // the aligned WISP_FIRST time places the leader 30px behind Lorenzo; the
  // remaining guests follow in the rest of the cast's reserved tail space.
  for (let i = 0; i < pass.count; i++) {
    const x = -24 + pass.local * PARADE_SPEED - i * 26;
    if (x < -24 || x > W + 24) continue;
    ctx.fillStyle = 'rgba(4,3,9,0.25)';
    ctx.beginPath(); ctx.ellipse(x, 268, 5.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    drawMazeWisp(ctx, x, 267, WISP_COLORS[(pass.trip + i) % WISP_COLORS.length], t * 1.8 + i * 0.24, (pass.trip + i) % 3);
  }
}

// Which fly-by (if any) is on screen right now.
function invaderPass(t) {
  if (t < INV_FIRST) return null;
  const e = t - INV_FIRST;
  const trip = Math.floor(e / INV_PERIOD);
  const p = (e % INV_PERIOD) / INV_CROSS;
  return p <= 1 ? { trip, p } : null;
}

// The bolt for the current pass, plus who it lands on. Every other trip only,
// so the gag stays rare enough to be a surprise.
function invaderStrike(t) {
  const pass = invaderPass(t);
  if (!pass || pass.trip % 2 !== 0) return null;
  const tDrop = INV_FIRST + pass.trip * INV_PERIOD + INV_DROP_P * INV_CROSS;
  if (t < tDrop) return null;
  const x = invX(pass.trip, INV_DROP_P) + 5;
  const y0 = invY(pass.trip, tDrop) + 8;
  const tHit = tDrop + Math.sqrt((2 * (BOLT_HEAD_Y - y0)) / BOLT_G);
  if (t < tHit) return { x, y: y0 + 0.5 * BOLT_G * (t - tDrop) * (t - tDrop), tHit };
  // landed: nearest hero within arm's reach takes it, otherwise it just fizzles
  let victim = -1, best = 26;
  for (let i = 0; i < HERO_PARADE.length; i++) {
    const d = Math.abs(heroX(i, tHit) - x);
    if (d < best) { best = d; victim = i; }
  }
  return { x, y: BOLT_HEAD_Y, tHit, kt: t - tHit, victim, dir: pass.trip % 2 === 0 ? 1 : -1 };
}

function drawInvader(ctx, t) {
  const pass = invaderPass(t);
  if (!pass) return;
  const x = invX(pass.trip, pass.p), y = invY(pass.trip, t);
  const rows = INVADER_FRAMES[Math.floor(t * 3.5) % 2];
  ctx.fillStyle = '#a8ffc0';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '#') ctx.fillRect(Math.round(x) + c, Math.round(y) + r, 1, 1);
    }
  }
}

// The bolt itself: the classic wiggling bar, then a flat little starburst
// where it lands.
function drawBolt(ctx, t, strike) {
  if (!strike) return;
  if (strike.kt === undefined) {
    ctx.fillStyle = '#fff6a8';
    for (let r = 0; r < 5; r++) {
      ctx.fillRect(Math.round(strike.x + Math.sin(t * 22 + r * 1.6)), Math.round(strike.y) + r, 1, 1);
    }
    return;
  }
  if (strike.kt > 0.32) return;
  const p = strike.kt / 0.32;
  ctx.globalAlpha = 1 - p;
  ctx.fillStyle = '#fff6a8';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.fillRect(Math.round(strike.x + Math.cos(a) * (3 + p * 12)), Math.round(strike.y + Math.sin(a) * (2 + p * 8)), 2, 2);
  }
  ctx.globalAlpha = 1;
}

function titleScene(ctx, t, reduced) {
  // night sky over the last functioning food court
  if (!titleGrad) {
    titleGrad = ctx.createLinearGradient(0, 0, 0, H);
    titleGrad.addColorStop(0, '#07070f');
    titleGrad.addColorStop(0.65, '#141026');
    titleGrad.addColorStop(1, '#1c1430');
  }
  // Under WebGL the sky is generated on the GPU — gradient, drifting nebula,
  // parallax twinkle and the odd shooting star — so we leave a transparent
  // hole for it. Reduced flashing freezes its clock instead of animating.
  // Without WebGL, the old hand-drawn sky stands in.
  const gpuSky = setSkyFx(true, reduced ? 0 : t);
  ctx.clearRect(0, 0, W, H);
  if (!gpuSky) {
    ctx.fillStyle = titleGrad;
    ctx.fillRect(0, 0, W, H);
    // twinkling stars (the bright ones catch the bloom)
    for (let i = 0; i < 26; i++) {
      const sx = (i * 97 + 23) % W;
      const sy = (i * 53 + 11) % 110;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.1 + (i % 5) * 0.3) + i));
      ctx.globalAlpha = tw;
      ctx.fillStyle = i % 4 === 0 ? '#fff' : '#b8c8e8';
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }
  if (!reduced) drawInvader(ctx, t);

  // the cabinet row: nine machines humming their own colors in the dark
  CABINETS.forEach((cab, i) => {
    const x = 22 + i * 49;
    ctx.fillStyle = '#100c18';
    ctx.fillRect(x, 128, 42, 76);
    ctx.fillStyle = cab.ground;
    ctx.fillRect(x, 124, 42, 7); // marquee
    // glowing screen with a lazy attract shimmer
    const flick = reduced ? 1 : 0.82 + 0.18 * Math.sin(t * (2 + i * 0.7) + i * 9);
    ctx.globalAlpha = flick;
    ctx.fillStyle = cab.sky[0];
    ctx.fillRect(x + 5, 136, 32, 38);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x + 5, 136 + (Math.floor(t * 2.4 + i) % 5) * 8, 32, 2);
    // light pooling on the floor below each screen
    ctx.globalAlpha = 0.12 * flick;
    ctx.fillStyle = cab.sky[0];
    ctx.fillRect(x - 2, 204, 46, 20);
    ctx.globalAlpha = 1;
  });

  // checkered floor
  ctx.fillStyle = '#171222';
  ctx.fillRect(0, 204, W, H - 204);
  for (let row = 0; row < 3; row++) {
    for (let x = -32; x < W; x += 32) {
      if ((Math.floor(x / 32) + row) % 2 === 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x, 208 + row * 21, 32, 21);
    }
  }

  // The cast still crosses the arcade, but each hero occasionally breaks into
  // a small personality beat. Cycles are offset so the parade stays readable.
  const strike = reduced ? null : invaderStrike(t);
  drawBolt(ctx, t, strike);
  drawMazeWispCameo(ctx, t, reduced);
  for (let i = 0; i < HERO_PARADE.length; i++) {
    const hx = heroX(i, t);
    const id = HERO_PARADE[i];
    // Clobbered: launched into a spin and tumbled off the side of the screen,
    // fading out before the parade loop would have wrapped them around.
    if (strike && strike.victim === i && strike.kt < KNOCK_T) {
      const kt = strike.kt;
      const kx = heroX(i, strike.tHit) + strike.dir * kt * 165;
      const ky = 268 - (kt * 190 - 0.5 * 150 * kt * kt);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (KNOCK_T - kt) / 0.5);
      ctx.translate(kx, ky - 13);
      ctx.rotate(strike.dir * kt * 7);
      drawToon(ctx, id, { kind: 'jump', grounded: false, time: t, menu: true, phase: 0.5 }, 0, 13, 26);
      ctx.restore();
      continue;
    }
    const actionLength = 1.35;
    const beat = (t + i * 0.71) % 4.9;
    const acting = !reduced && beat < actionLength;
    const actionP = acting ? beat / actionLength : 0;
    const lift = acting ? Math.sin(actionP * Math.PI) : 0;
    const pose = {
      kind: 'run', grounded: true, time: t, menu: true,
      phase: (t * 1.5 + i * 0.37) % 1,
    };
    let feetY = 268;
    if (acting && id === 'lorenzo') { pose.menuAction = 'wave'; feetY -= lift * 3; }
    if (acting && id === 'gnash') { pose.kind = 'jump'; pose.grounded = false; feetY -= Math.abs(Math.sin(actionP * Math.PI * 2)) * 7; }
    if (acting && id === 'fernwick') { pose.kind = 'duck'; pose.roll = true; }
    if (acting && id === 'b33p') { pose.squash = lift * 0.35; pose.menuAction = 'aim'; }
    if (acting && id === 'mochi') { pose.float = true; pose.squash = Math.max(0, Math.sin(actionP * Math.PI * 2)) * 0.22; feetY -= lift * 8; }
    if (acting && id === 'chompo') { pose.menuAction = 'chomp'; feetY -= lift * 2; }
    if (acting && id === 'raymn') { pose.headless = actionP > 0.18 && actionP < 0.78; pose.menuAction = 'wave'; }
    if (acting && id === 'grumpos') { pose.menuAction = 'flex'; pose.squash = lift * 0.12; }
    drawToon(ctx, id, pose, hx, feetY, 26);
    if (acting) drawParadeAccent(ctx, id, hx, feetY, actionP);
  }

  // The marquee: MASHENSTEIN in warm cartoon gold, outlined, stitched together
  // out of parts, and wired to a sign that has seen better decades. It stutters
  // twice in quick succession, then holds steady for a few seconds before the
  // next fit — a constant strobe reads as broken rather than characterful.
  ctx.globalAlpha = flickerAlpha(t, reduced);
  drawTextCentered(ctx, 'MASHENSTEIN', W / 2 + 1.5, TITLE_MARQUEE_Y + 1.5, '#a8791f', TITLE_SCALE, 'marquee');
  drawTextCentered(ctx, 'MASHENSTEIN', W / 2, TITLE_MARQUEE_Y, '#ffcf33', TITLE_SCALE, 'marquee');
  // The seams: six stitched joins where the letters were sewn back together.
  // Spread across the measured width of the logo rather than a fixed span, so
  // they stay on the lettering instead of dangling off the ends.
  ctx.strokeStyle = 'rgba(42,30,5,0.85)';
  ctx.lineWidth = 1.4;
  const logoW = textWidth('MASHENSTEIN', TITLE_SCALE, 'marquee');
  const seamK = TITLE_SCALE / 4;   // seam band tracks the logo's size
  const seamTop = TITLE_MARQUEE_Y + 4 * seamK, seamBot = TITLE_MARQUEE_Y + 22 * seamK;
  for (let i = 0; i < 6; i++) {
    const sx = W / 2 - logoW / 2 + (logoW * (i + 0.5)) / 6 - 4;
    ctx.beginPath(); ctx.moveTo(sx, seamTop); ctx.lineTo(sx + 8, seamBot); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx + 8, seamTop); ctx.lineTo(sx, seamBot); ctx.stroke();
  }
  drawTextCentered(ctx, 'THE UNPLUGGENING', W / 2, TITLE_SUBTITLE_Y, '#5fd6c8', 1, 'subtitle');
  ctx.globalAlpha = 1;

  // A live power cord dangles off the logo, swinging, occasionally sparking.
  // The anchor tracks the measured width so the cord stays bolted to the last
  // letter — hardcoding it left the cord dangling in mid air once the marquee's
  // letter-spacing changed and the lettering shrank away from under it.
  // It hangs straight down from the corner of the sign and swings as one piece.
  // Anchoring the top to the letter while leaving the bottom where it used to be
  // turned the cord into a permanent diagonal, which read as a mistake.
  // The anchor sits INSIDE the last letter's ink, near its foot: the measured
  // advance includes the N's right side bearing, so parking the cord at the raw
  // logoW edge floated it in the gap beside the letter, and starting it halfway
  // up the letterform read as a wire crossing the sign rather than leaving it.
  const ax = W / 2 + logoW / 2 - 5 * seamK, ay = TITLE_MARQUEE_Y + 24 * seamK;
  const sway = reduced ? 0 : Math.sin(t * 1.15) * 9;
  // Stops short of the panel so the plug swings in open air at any phase of the
  // swing, instead of disappearing behind the menu at one end of its arc.
  const px2 = ax + sway, py2 = TITLE_PANEL_Y - 16;
  ctx.strokeStyle = '#241c30';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + sway * 0.4, (ay + py2) / 2 + 8, px2, py2);
  ctx.stroke();
  // A grommet where the cord leaves the sign, so the join reads as deliberate
  // hardware instead of a line that happens to end on a letter.
  ctx.fillStyle = '#241c30';
  ctx.beginPath();
  ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3a48';
  ctx.fillRect(px2 - 3, py2, 6, 8);
  ctx.fillStyle = '#8a8a98';
  ctx.fillRect(px2 - 2, py2 + 8, 1.6, 3);
  ctx.fillRect(px2 + 0.6, py2 + 8, 1.6, 3);
  if (flickerDark(t, reduced)) {
    // Zap: sparks plus the same cached radial glow the power capsules use. A
    // flat translucent rectangle read as a yellow card sitting behind the plug
    // — a radial falloff has no edge to mistake for a background.
    const glow = glowSprite('rgba(246,211,60,0.3)', 6);
    ctx.drawImage(glow, px2 - 7, py2 + 2, 14, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(px2 - 4 + ((i * 37 + Math.floor(t * 60)) % 8), py2 + 9 + (i % 3) * 2, 1.6, 1.6);
    }
  }
}
const HERO_PARADE = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'raymn', 'grumpos'];

// Title menu geometry, shared by the renderer and the touch hit-test so a tap
// always lands on the row it looks like it lands on.
// The stack is tight: marquee, subtitle, panel, then the two footer lines, all
// of which have to finish above the cast's heads at y=233.
const TITLE_SCALE = 4.4;        // sized so the logo spans about the panel's width
// Set by build.js ahead of the bundle, and only for `npm run dev` — the
// published build never defines it, so this is '' and the title draws no stamp.
const BUILD_STAMP = (typeof window !== 'undefined' && window.__MASH_BUILD__) || '';
const TITLE_MARQUEE_Y = 30;     // a little top margin so the logo isn't on the edge
const TITLE_SUBTITLE_Y = 71;
const TITLE_PANEL_Y = 92;
const TITLE_PANEL_PAD = 10;     // panel height beyond the rows themselves
const TITLE_ROW_H = 14;
const TITLE_ROW_INSET = 7;      // first row's offset inside the panel
// The footer hangs off the bottom of the panel rather than sitting at a fixed
// y, because the panel grows with the number of save files — pinning it would
// leave the gap different on a 7-row menu than an 8-row one. The gap matches
// the one above the panel, so the subtitle and the footer frame it evenly.
const TITLE_FOOTER_GAP = 12;
const TITLE_FOOTER_LINE_H = 11;
// Unlocking OVERTIME adds an eighth row, and at full row height that pushes the
// footer down into the cast. Rather than let the text collide, the rows tighten
// just enough to keep the whole stack clear. Both the renderer and the touch
// hit-test read this, so a tap always lands on the row it looks like it does.
const TITLE_PANEL_MAX_BOTTOM = 202;
function titleRowH(count) {
  const fits = Math.floor((TITLE_PANEL_MAX_BOTTOM - TITLE_PANEL_Y - TITLE_PANEL_PAD) / count);
  return Math.min(TITLE_ROW_H, fits);
}

// JavaScript twin of the starfield shader's hash21. This lets the audio fire
// only on 6.5-second cycles where the shader actually draws a shooting star.
function shaderHash21(x, y) {
  let px = ((x * 123.34) % 1 + 1) % 1;
  let py = ((y * 456.21) % 1 + 1) % 1;
  const d = px * (px + 45.32) + py * (py + 45.32);
  px += d; py += d;
  const v = px * py;
  return v - Math.floor(v);
}

// A tired neon sign: two fast blinks, then it holds steady until the next
// short-out. reducedFlashing pins it fully lit.
//
// The stutter runs on the SONG's clock, not a wall clock — one short-out on the
// downbeat of every two-bar block, blinking on 32nds. A sign shorting out in
// time with the music reads as part of the arcade rather than a loose timer
// ticking over the top of it, and locking to the block means it lands where the
// bank's own phrase turns over. Audio.songBeat() is null before the context
// exists (or in headless tests), so the old free-running period is the fallback.
const FLICKER_BEATS = 4;      // one short-out per bar
const FLICKER_SLOT = 0.25;    // blink slot, in beats
const FLICKER_DARK_BEATS = 0.125;
const FLICKER_PERIOD = 4.5;   // fallback wall clock, matched to the musical rate
const FLICKER_BLINK = 0.21;
const FLICKER_DARK = 0.09;
// The sign doesn't stutter on its own — the cord shorting out is what does it.
// Both the marquee and the plug read this one phase, so the spark lands on the
// exact frames the lettering drops out and the two read as cause and effect.
// On their own clocks they drifted, and the sign looked merely broken.
function flickerDark(t, reduced) {
  if (reduced) return false;
  const beat = Audio.songBeat();
  if (beat == null) {
    const phase = t % FLICKER_PERIOD;
    if (phase >= FLICKER_BLINK * 2) return false;
    return (phase % FLICKER_BLINK) < FLICKER_DARK;
  }
  const phase = ((beat % FLICKER_BEATS) + FLICKER_BEATS) % FLICKER_BEATS;
  if (phase >= FLICKER_SLOT * 2) return false;
  return (phase % FLICKER_SLOT) < FLICKER_DARK_BEATS;
}
// Softer than a full dropout: the sign browns out and recovers, rather than
// switching off. A hard blink at this size read as a fault in the renderer.
// But 0.62 over ~8 frames was below the threshold of noticing — against the
// bloom pass, which smears the dip further, the sign just looked lit. This is
// the deepest brownout that still reads as a sag rather than a dropped frame.
function flickerAlpha(t, reduced) {
  return flickerDark(t, reduced) ? 0.45 : 1;
}
// Which two-bar block we're in, off whichever clock flickerDark is using. The
// audible short-out is gated per block, so it has to be counted on the same
// clock as the blinks or the gate lands between them.
function flickerBlock(t) {
  const beat = Audio.songBeat();
  if (beat == null) return Math.floor(t / FLICKER_PERIOD);
  return Math.floor(beat / FLICKER_BEATS);
}

// Built by hand rather than via ctx.roundRect, which the headless test stub
// and older canvas implementations don't provide.
function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export class TitleState {
  constructor({ save, onSlotChosen, onOvertime, onSettings, onHowTo, onGuide, onSoundTest, onAttract, attractDelay, attractLabel }) {
    this.save = save; this.onSlotChosen = onSlotChosen; this.onOvertime = onOvertime; this.onSettings = onSettings;
    this.onHowTo = onHowTo; this.onGuide = onGuide; this.onSoundTest = onSoundTest;
    this.onAttract = onAttract; this.attractDelay = attractDelay ?? 60;
    this.attractLabel = attractLabel || 'DEMO';
  }
  enter() {
    this.idx = 0;
    this.erase = null;
    this.t = 0;
    this.idleT = 0;
    this.lastCometCycle = -1;
    this.wasDark = false;
    this.lastBuzzCycle = -1;
    this.actTok = Input.activity;
    this.tagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
    Audio.setBank(TITLE_THEME);
    Input.setMenuButtons();
    setSceneGlow(true); // the marquee and cabinet screens get to glow
  }
  exit() { setSceneGlow(false); setSkyFx(false); }
  options() {
    const opts = [];
    this.save.data.slots.forEach((s, i) => {
      opts.push({
        id: 'slot' + i,
        label: s ? `FILE ${i + 1}: ${totalPlugs(s)}/${MAX_PLUGS} PLUGS, ${formatCoins(s.coins)} COINS` : `FILE ${i + 1}: NEW GAME`,
        act: () => this.onSlotChosen(i, !s),
      });
    });
    const anyOvertime = this.save.data.slots.some((s) => s && s.campaign.storyFlags.sawEnding);
    if (anyOvertime) opts.push({ id: 'overtime', label: 'OVERTIME (ENDLESS)', act: () => this.onOvertime() });
    opts.push({ id: 'howto', label: 'HOW TO PLAY', act: () => this.onHowTo() });
    opts.push({ id: 'guide', label: 'FIELD GUIDE (WHAT IS WHAT)', act: () => this.onGuide() });
    opts.push({ id: 'soundtest', label: 'SOUND TEST (JUKEBOX)', act: () => this.onSoundTest() });
    if (this.save.data.slots.some(Boolean)) opts.push({ id: 'erase', label: 'ERASE A FILE', act: () => this.beginErase() });
    opts.push({ id: 'settings', label: 'SETTINGS', act: () => this.onSettings() });
    return opts;
  }
  beginErase() {
    const slots = this.save.data.slots.map((slot, i) => slot ? i : -1).filter((i) => i >= 0);
    if (!slots.length) return;
    this.erase = { step: 'choose', slots, idx: 0, slot: null };
  }
  eraseChoices() {
    if (this.erase.step === 'choose') {
      return [
        ...this.erase.slots.map((i) => ({ label: `FILE ${i + 1}: ${totalPlugs(this.save.data.slots[i])}/${MAX_PLUGS} PLUGS, ${formatCoins(this.save.data.slots[i].coins)} COINS`, slot: i })),
        { label: 'CANCEL', cancel: true },
      ];
    }
    return this.erase.step === 'confirm'
      ? [{ label: 'NO, KEEP IT', cancel: true }, { label: 'YES, CONTINUE' }]
      : [{ label: 'NO, GO BACK', cancel: true }, { label: 'ERASE IT' }];
  }
  updateErase() {
    const choices = this.eraseChoices();
    if (Input.pressed('down') || Input.pressed('right')) { this.erase.idx = (this.erase.idx + 1) % choices.length; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.erase.idx = (this.erase.idx + choices.length - 1) % choices.length; Audio.sfx('ui'); }
    if (Input.pressed('back')) { this.erase = null; Audio.sfx('ui'); return; }
    let chosen = Input.pressed('confirm') ? this.erase.idx : -1;
    if (Input.pressed('pointer')) {
      const p = Input.pointer;
      const firstY = 124;
      const i = Math.floor((p.y - (firstY - 4)) / 15);
      if (p.x >= 100 && p.x <= W - 100 && i >= 0 && i < choices.length) chosen = i;
    }
    if (chosen < 0) return;
    this.erase.idx = chosen;
    const choice = choices[chosen];
    if (choice.cancel) { this.erase = null; Audio.sfx('ui'); return; }
    if (this.erase.step === 'choose') {
      this.erase = { step: 'confirm', slots: this.erase.slots, slot: choice.slot, idx: 0 };
      Audio.sfx('uiBad');
    } else if (this.erase.step === 'confirm') {
      this.erase = { ...this.erase, step: 'final', idx: 0 };
      Audio.sfx('uiBad');
    } else {
      const erased = this.erase.slot;
      this.save.eraseSlot(erased);
      const next = this.save.data.slots.findIndex(Boolean);
      this.save.selectSlot(next >= 0 ? next : 0);
      this.erase = null;
      this.idx = Math.min(this.idx, this.options().length - 1);
      Audio.sfx('uiConfirm');
    }
  }
  update(dt) {
    this.t += dt;
    const cometCycle = Math.floor(this.t / 6.5);
    const cometPhase = this.t - cometCycle * 6.5;
    if (!this.save.settings.reducedFlashing && cometPhase >= 0.4 && this.lastCometCycle !== cometCycle && shaderHash21(cometCycle, 3) >= 0.55) {
      this.lastCometCycle = cometCycle;
      Audio.sfx('comet');
    }
    // The buzz reads off the same phase as the dropout and the spark, so it
    // lands on the same frame. Edge-triggered: the dark window spans several
    // frames and re-firing every one of them stacks into a rasp.
    //
    // It deliberately does NOT follow every blink. At most one buzz per block
    // (the first blink only — the second is close enough to overlap its tail),
    // and only on blocks the hash picks out, so the sign mostly stutters in
    // silence and every so often you actually hear it go. A sound tied 1:1 to a
    // repeating animation stops being ambience and turns into a metronome; the
    // hash keeps the gaps uneven, which reads as a fault rather than a rhythm.
    const dark = flickerDark(this.t, this.save.settings.reducedFlashing);
    const block = flickerBlock(this.t);
    if (dark && !this.wasDark && this.lastBuzzCycle !== block && shaderHash21(block, 11) >= 0.72) {
      this.lastBuzzCycle = block;
      Audio.sfx('neonBuzz');
    }
    this.wasDark = dark;
    // Attract mode: fire after attractDelay seconds of zero HUMAN input.
    if (Input.activity !== this.actTok) { this.actTok = Input.activity; this.idleT = 0; this.attractDelay = 60; }
    if (this.erase) {
      this.idleT = 0;
      this.updateErase();
      Input.endFrame();
      return;
    }
    this.idleT += dt;
    if (this.onAttract && this.idleT >= this.attractDelay) { this.onAttract(); return; }
    const opts = this.options();
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); opts[this.idx].act(); }
    if (Input.pressed('pointer')) {
      const p = Input.pointer;
      const rowH = titleRowH(opts.length);
      const i = Math.floor((p.y - (TITLE_PANEL_Y + TITLE_ROW_INSET - 4)) / rowH);
      if (i >= 0 && i < opts.length) { this.idx = i; Audio.sfx('uiConfirm'); opts[i].act(); }
    }
    Input.endFrame();
  }
  draw(ctx) {
    titleScene(ctx, this.t, this.save.settings.reducedFlashing);
    const opts = this.options();
    const ui = (d) => {
      // The cast owns the bottom strip, so every line of text sits above it:
      // panel under the logo, then the controls and the flavour line as a footer.
      const panelW = 220, panelX = W / 2 - panelW / 2;
      const rowH = titleRowH(opts.length);
      const panelY = TITLE_PANEL_Y, panelH = opts.length * rowH + TITLE_PANEL_PAD;
      // solid backing so the crates behind don't bleed through the list
      d.fillStyle = 'rgba(8,10,20,0.86)';
      roundRect(d, panelX, panelY, panelW, panelH, 3);
      d.fill();
      d.strokeStyle = '#2f6f68';
      d.lineWidth = 1;
      roundRect(d, panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1, 3);
      d.stroke();
      opts.forEach((o, i) => {
        const sel = i === this.idx;
        const rowY = panelY + TITLE_ROW_INSET + i * rowH;
        if (sel) {
          // Centred on the lettering's optical middle, not the glyph box: the
          // box carries ascender leading above the caps, so matching it hangs
          // the highlight low. Ink sits between rowY+0.7 and rowY+7.7.
          d.fillStyle = 'rgba(255,207,51,0.12)';
          roundRect(d, panelX + 4, rowY - 1.5, panelW - 8, 11, 3);
          d.fill();
        }
        drawTextCentered(d, (sel ? '> ' : '') + o.label + (sel ? ' <' : ''), W / 2, rowY, sel ? '#ffcf33' : '#c3cede', 1, sel ? 'bold' : 'ui');
      });
      const controlsY = panelY + panelH + TITLE_FOOTER_GAP;
      const flavorY = controlsY + TITLE_FOOTER_LINE_H;
      drawTextCentered(d, 'ARROWS/TAP: CHOOSE   ENTER/TAP: CONFIRM', W / 2, controlsY, '#6b7d95');
      d.globalAlpha = 0.85;
      if (this.onAttract && this.attractDelay <= 10) {
        drawTextCentered(d, `NEXT ${this.attractLabel} IN ${Math.max(1, Math.ceil(this.attractDelay - this.idleT))} - ANY KEY CANCELS`, W / 2, flavorY, '#8858c8', 0.875);
      } else {
        drawTextCentered(d, this.tagline, W / 2, flavorY, '#55647a', 0.875);
      }
      d.globalAlpha = 1;
      if (BUILD_STAMP) {
        d.globalAlpha = 0.55;
        drawText(d, `BUILD ${BUILD_STAMP}`, 4, 4, '#55647a', 0.75);
        d.globalAlpha = 1;
      }
      if (this.erase) this.drawEraseModal(d);
    };
    if (!pushOverlayDraw(ui)) ui(ctx);
  }
  drawEraseModal(d) {
    const choices = this.eraseChoices();
    d.fillStyle = 'rgba(2,3,10,0.78)';
    d.fillRect(0, 0, W, H);
    const x = 88, y = 82, w = W - 176, h = 92;
    d.fillStyle = 'rgba(11,10,20,0.98)';
    roundRect(d, x, y, w, h, 4); d.fill();
    d.strokeStyle = '#e05a62'; d.lineWidth = 1;
    roundRect(d, x + 0.5, y + 0.5, w - 1, h - 1, 4); d.stroke();
    let title = 'ERASE WHICH FILE?';
    let warning = 'CHOOSE CAREFULLY. BACK CANCELS.';
    if (this.erase.step === 'confirm') {
      title = `ERASE FILE ${this.erase.slot + 1}?`;
      warning = 'ALL PROGRESS IN THIS FILE WILL BE LOST.';
    } else if (this.erase.step === 'final') {
      title = `FINAL WARNING: ERASE FILE ${this.erase.slot + 1}?`;
      warning = 'THIS CANNOT BE UNDONE.';
    }
    drawTextCentered(d, title, W / 2, 94, '#ff727c', 1.25, 'bold');
    drawTextCentered(d, warning, W / 2, 110, '#aab4c6', 0.875);
    choices.forEach((choice, i) => {
      const selected = i === this.erase.idx;
      const rowY = 124 + i * 15;
      if (selected) {
        d.fillStyle = 'rgba(255,207,51,0.12)';
        roundRect(d, x + 7, rowY - 2, w - 14, 12, 3); d.fill();
      }
      drawTextCentered(d, `${selected ? '> ' : ''}${choice.label}${selected ? ' <' : ''}`, W / 2, rowY, selected ? '#ffcf33' : '#d3d9e5', 1, selected ? 'bold' : 'ui');
    });
  }
}

export class DifficultyState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() { this.idx = 0; this.confirming = false; Input.setMenuButtons(); }
  update(dt) {
    const n = DIFFICULTIES.length;
    if (this.confirming) {
      if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); this.commit(5); }
      if (Input.pressed('back') || Input.pressed('duck')) { this.confirming = false; Audio.sfx('ui'); }
      Input.endFrame();
      return;
    }
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - 90) / 24);
      if (i >= 0 && i < n) {
        if (this.idx === i) this.select(); else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('confirm')) this.select();
    Input.endFrame();
  }
  select() {
    const d = DIFFICULTIES[this.idx];
    if (d.id === 5) { this.confirming = true; Audio.sfx('uiBad'); return; }
    Audio.sfx('uiConfirm');
    this.commit(d.id);
  }
  commit(id) {
    this.save.slot.difficulty = id;
    this.save.persist();
    this.onDone();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SELECT DIFFICULTY', W / 2, 40, '#fff', 2, 'title');
    drawTextCentered(ctx, '(THE PAUSE MENU WILL ALWAYS TELL YOU THE TRUTH)', W / 2, 64, '#5a5a68');
    DIFFICULTIES.forEach((d, i) => {
      const sel = i === this.idx;
      const danger = d.id === 5;
      let label = d.name;
      if (d.id === 2) label += ' '.repeat(0);
      const color = danger ? '#e04848' : sel ? '#f6d33c' : '#c8c8d8';
      drawTextCentered(ctx, (sel ? '> ' : '') + label + (sel ? ' <' : ''), W / 2, 90 + i * 24, color, d.id === 2 ? 1 : 1);
      drawTextCentered(ctx, d.desc, W / 2, 100 + i * 24, '#5a5a68');
      if (d.id === 3 && sel) drawText(ctx, ':)', W / 2 + textWidth(label) / 2 + 18, 90 + i * 24, '#8a8a98'); // the skull is smiling
    });
    if (this.confirming) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(40, 90, W - 80, 80);
      ctx.strokeStyle = '#e04848';
      ctx.strokeRect(40.5, 90.5, W - 81, 80);
      drawTextCentered(ctx, 'ARE YOU SURE?', W / 2, 108, '#e04848', 2);
      drawTextCentered(ctx, '(WE ARE NOT.)', W / 2, 132, '#8a8a98');
      drawTextCentered(ctx, 'ENTER: YES   ESC: WISDOM', W / 2, 150, '#c8c8d8');
    }
  }
}

export class IntroState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.panel = 0; this.chars = 0; Input.setMenuButtons(); }
  update(dt) {
    if (this.panel >= INTRO_PANELS.length) { Input.endFrame(); return; }
    this.chars += dt * 40;
    const text = INTRO_PANELS[this.panel].text;
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      if (this.chars < text.length) this.chars = text.length;
      else { this.panel++; this.chars = 0; Audio.sfx('ui'); if (this.panel >= INTRO_PANELS.length) { this.onDone(); } }
    }
    if (Input.pressed('back')) this.onDone();
    Input.endFrame();
  }
  draw(ctx) {
    if (this.panel >= INTRO_PANELS.length) return;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    // panel art: minimal pixel scenes
    ctx.strokeStyle = '#30303f';
    ctx.strokeRect(60.5, 30.5, W - 121, 120);
    if (this.panel === 1) drawProp(ctx, 'eggshell', W / 2 - 24, 60, 48, 40);
    if (this.panel === 0) {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = ['#3a9c48', '#c88848', '#282858', '#c8e0f0', '#3a3048', '#c8a068'][i];
        ctx.fillRect(80 + i * 55, 60, 40, 60);
        ctx.fillStyle = '#181820';
        ctx.fillRect(84 + i * 55, 66, 32, 40);
      }
    }
    if (this.panel === 2 || this.panel === 3) {
      const heroes = ['lorenzo', 'gnash', 'fernwick', 'b33p', 'mochi', 'chompo', 'raymn', 'grumpos'];
      heroes.forEach((h, i) => {
        drawToon(ctx, h, { kind: 'idle', time: this.chars * 0.05 + i * 0.8, grounded: true }, 90 + i * 38 + 9, 108, 24);
      });
    }
    const text = INTRO_PANELS[this.panel].text;
    const shown = text.slice(0, Math.floor(this.chars));
    // simple two-line wrap
    const mid = shown.length > 60 ? shown.lastIndexOf(' ', 60) : shown.length;
    drawTextCentered(ctx, shown.slice(0, mid), W / 2, 170, '#e8e8f0');
    if (mid < shown.length) drawTextCentered(ctx, shown.slice(mid + 1), W / 2, 184, '#e8e8f0');
    drawTextCentered(ctx, `${this.panel + 1}/4  (TAP/ENTER)`, W / 2, H - 20, '#5a5a68');
  }
}

// THE BRIEFING MANIFEST: a full-black establishment screen before every
// stage. The MISSION line carries the real information; the memo blocks are
// letterhead comedy. One input completes the typewriter, a second proceeds.
export class BriefingState {
  constructor({ cab, stage, onDone }) { this.cab = cab; this.stage = stage; this.onDone = onDone; }
  enter() {
    this.chars = 0;
    this.t = 0;
    Input.setMenuButtons();
    this.pieces = [
      { head: null, text: `MISSION: ${this.stage.mission.desc}` },
      ...(BRIEFINGS[this.stage.id] || []),
    ];
    this.total = this.pieces.reduce((n, p) => n + p.text.length, 0);
  }
  update(dt) {
    this.t += dt;
    this.chars += dt * 70; // brisker than the finale's 34 — this screen is read often
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      if (this.chars < this.total) { this.chars = this.total; Audio.sfx('ui'); }
      else { Audio.sfx('uiConfirm'); this.onDone(); }
    }
    if (Input.pressed('back')) { Audio.sfx('uiConfirm'); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const cabNo = CABINETS.findIndex((c) => c.id === this.cab.id) + 1;
    drawTextCentered(ctx, `STAGE ${cabNo}-${this.stage.index} BRIEFING`, W / 2, 26, '#e8e8f0', 2, 'title');
    let budget = Math.floor(this.chars);
    let y = 58;
    for (const piece of this.pieces) {
      if (budget <= 0) break;
      // Letterhead pops in whole the moment its memo starts typing.
      if (piece.head) {
        const isEgg = piece.head.startsWith('INTERRUPTION');
        wrapText(piece.head, W - 64, 1, 2).forEach((line) => {
          drawTextCentered(ctx, line, W / 2, y, isEgg ? '#f0a0a0' : '#48e0c8');
          y += 11;
        });
        y += 1;
      }
      const shown = piece.text.slice(0, budget);
      budget -= piece.text.length;
      wrapText(shown, W - 64, 1, 8).forEach((line) => {
        drawTextCentered(ctx, line, W / 2, y, piece.head ? '#c8c8d8' : '#f6d33c');
        y += 11;
      });
      y += 8;
    }
    const done = this.chars >= this.total;
    if (!done || Math.floor(this.t * 2) % 2 === 0) {
      drawTextCentered(ctx, `${Input.usingTouch ? '[TAP]' : '[ENTER]'}: ${BRIEFING_PROMPTS[this.cab.id] || 'PROCEED'}`,
        W / 2, H - 20, done ? '#c8c8d8' : '#5a5a68');
    }
  }
}

// Party colors for the results screen: the game's own gold/teal/pink/purple,
// so the confetti reads as MASHENSTEIN and not as generic stock celebration.
const PARTY_COLORS = ['#f6d33c', '#48e0c8', '#f890b8', '#8858c8', '#48c848', '#ffffff'];

// The results screen is the one place we admit where the game physically is:
// inside the tube. Act III says so literally, so the frame here is the CRT
// itself seen from within — the rounded corners of the glass, the dark mask
// where the tube stops, and the phosphor glow banked at the bottom.
//
// The renderer already supplies the optics — glfx applies vignette and
// chromatic aberration to the whole canvas — so what was missing was never a
// filter, it was the *shape*. Rounded corners are what makes a screen read as
// a CRT rather than as a rectangle that happens to be dark.
//
// Deliberately static. The screen already carries dense text, up to eight hero
// sprites, fireworks and falling streamers; a fifth moving layer behind the
// most information-dense part of the frame is exactly what a starfield would
// have been, and it would fight the burst shrapnel dot for dot.
const TUBE_INSET = 5;    // mask thickness where the glass stops
const TUBE_R = 34;       // generous: a shallow curve reads as a rounded box
let tubeGlow = null;
let tubeWash = null;

// Traced by hand rather than roundRect() — the corner is a quadratic through
// the actual corner point, which gives the slightly-inflated curve of real
// tube glass instead of a perfect quarter circle.
function tubePath(ctx) {
  const x0 = TUBE_INSET, y0 = TUBE_INSET, x1 = W - TUBE_INSET, y1 = H - TUBE_INSET;
  ctx.beginPath();
  ctx.moveTo(x0 + TUBE_R, y0);
  ctx.lineTo(x1 - TUBE_R, y0);
  ctx.quadraticCurveTo(x1, y0, x1, y0 + TUBE_R);
  ctx.lineTo(x1, y1 - TUBE_R);
  ctx.quadraticCurveTo(x1, y1, x1 - TUBE_R, y1);
  ctx.lineTo(x0 + TUBE_R, y1);
  ctx.quadraticCurveTo(x0, y1, x0, y1 - TUBE_R);
  ctx.lineTo(x0, y0 + TUBE_R);
  ctx.quadraticCurveTo(x0, y0, x0 + TUBE_R, y0);
  ctx.closePath();
}

// Speckle: fixed positions, so it reads as grain in the glass rather than as
// a sixth animated layer. Seeded by index — no Math.random, so the pattern is
// identical every visit and never crawls between frames.
const TUBE_SPECKLE = Array.from({ length: 520 }, (_, i) => {
  const r = Math.sin(i * 12.9898) * 43758.5453;
  const s = Math.sin(i * 78.233) * 24634.6345;
  return { x: Math.abs(r) % W | 0, y: Math.abs(s) % H | 0, a: 0.03 + (Math.abs(r * 3) % 1) * 0.05 };
});

function drawTubeFace(ctx) {
  ctx.fillStyle = '#07070c';           // the dark beyond the glass
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  tubePath(ctx);
  ctx.clip();
  ctx.fillStyle = '#0b0b14';
  ctx.fillRect(0, 0, W, H);
  // The tube has to actually EMIT before any of the texture below can read.
  // Scanlines and speckle are modulation — they need luminance to modulate,
  // and dark lines over a near-black field are simply invisible. This wash is
  // what everything else is drawn against.
  if (!tubeWash) {
    tubeWash = ctx.createRadialGradient(W / 2, H * 0.40, 8, W / 2, H * 0.40, W * 0.60);
    tubeWash.addColorStop(0, 'rgba(104,132,214,0.30)');
    tubeWash.addColorStop(0.55, 'rgba(78,96,168,0.14)');
    tubeWash.addColorStop(1, 'rgba(60,70,140,0)');
  }
  ctx.fillStyle = tubeWash;
  ctx.fillRect(0, 0, W, H);
  // Phosphor banked along the bottom of the tube, warm where the beam has
  // been working hardest. Lands under the hero row, so the curtain call reads
  // as standing in the glow rather than floating on black.
  if (!tubeGlow) {
    tubeGlow = ctx.createLinearGradient(0, H, 0, H - 110);
    tubeGlow.addColorStop(0, 'rgba(255,168,88,0.22)');
    tubeGlow.addColorStop(1, 'rgba(255,168,88,0)');
  }
  ctx.fillStyle = tubeGlow;
  ctx.fillRect(0, H - 110, W, 110);
  ctx.restore();
}

// Draws AFTER the party, so streamers tumble away behind the curve instead of
// running off a square edge. That occlusion is most of what sells the glass.
function drawTubeGlass(ctx) {
  ctx.save();
  // Mask: everything outside the tube. evenodd against a full-screen rect.
  ctx.fillStyle = '#07070c';
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  tubePath(ctx);
  ctx.fill('evenodd');
  // Scanlines and speckle, only on the glass. Now that the face is lit these
  // have something to cut into; at 0.09 over bare #0b0b14 they were invisible.
  ctx.save();
  tubePath(ctx);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  // Every third line gets a lit companion — the beam edge. Bright-on-dark is
  // what reads as a scanline; dark-on-dark just dims the screen.
  ctx.fillStyle = 'rgba(150,180,255,0.05)';
  for (let y = 1; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  for (const s of TUBE_SPECKLE) {
    ctx.fillStyle = `rgba(190,205,255,${s.a})`;
    ctx.fillRect(s.x, s.y, 1, 1);
  }
  ctx.restore();
  // The lit edge of the glass, brightest along the top where a tube catches
  // the room. lineWidth is set explicitly: it persists across frames.
  ctx.lineWidth = 1;
  tubePath(ctx);
  ctx.strokeStyle = 'rgba(150,190,255,0.10)';
  ctx.stroke();
  ctx.restore();
}

export class ResultsState {
  constructor({ result, gains, save, onDone }) {
    this.result = result; this.gains = gains; this.save = save; this.onDone = onDone;
  }
  enter() {
    this.t = 0; this.shown = 0;
    this.shells = [];       // rising mortars; they burst at the top of their arc
    this.shellT = 0.25;     // first one goes up almost immediately
    this.streamerT = 0;
    clearParticles();
    Input.setMenuButtons();
    Audio.sfx(this.result.success ? 'win' : 'lose');
  }
  // Fireworks over the celebration row, plus streamers tumbling down the
  // frame. Losses get neither — a quiet screen is part of the joke.
  updateParty(dt) {
    if (!this.result.success || this.save.settings.reducedMotion) return;
    this.shellT -= dt;
    if (this.shellT <= 0) {
      this.shellT = 0.55 + Math.random() * 0.7;
      const x = 40 + Math.random() * (W - 80);
      this.shells.push({
        x, y: H + 6, vx: (Math.random() - 0.5) * 24, vy: -(230 + Math.random() * 50),
        fuse: 0.85 + Math.random() * 0.3, color: PARTY_COLORS[(Math.random() * PARTY_COLORS.length) | 0],
      });
      Audio.sfx('ui');
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.fuse -= dt; s.vy += 120 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      // a thin trail of sparks so the shell reads as climbing, not floating
      if (Math.random() < 0.5) burst(s.x, s.y, 1, 12, 0.28, s.color, 1.1, 40);
      if (s.fuse <= 0) {
        // low gravity on the shrapnel: the ring hangs, then drifts down
        burst(s.x, s.y, 26, 115, 1.3, s.color, 4.5, 30);
        burst(s.x, s.y, 6, 40, 0.3, '#ffffff', 3, 18); // white core flash
        this.shells.splice(i, 1);
        Audio.sfx('coin');
      }
    }
    // Streamers: paper ribbons that fall past the whole screen, spinning.
    this.streamerT -= dt;
    if (this.streamerT <= 0) {
      this.streamerT = 0.12 + Math.random() * 0.1;
      spawnShard(
        Math.random() * W, -6,
        (Math.random() - 0.5) * 30, 26 + Math.random() * 34,
        4.5, PARTY_COLORS[(Math.random() * PARTY_COLORS.length) | 0],
        2 + Math.random() * 2, 5 + Math.random() * 4,
        (Math.random() - 0.5) * 9, 14,
      );
    }
  }
  update(dt) {
    this.t += dt;
    this.updateParty(dt);
    updateParticles(dt);
    this.shown = Math.min(this.result.score, this.shown + dt * Math.max(500, this.result.score));
    // Short enough to only swallow a stray input carried in from the run; the
    // screen is fully drawn on frame one, so a longer lock just reads as stuck.
    if ((Input.pressed('confirm') || Input.pressed('pointer') || Input.pressed('jump')) && this.t > 0.15) {
      Audio.sfx('uiConfirm');
      this.onDone();
    }
    Input.endFrame();
  }
  draw(ctx) {
    drawTubeFace(ctx);
    // Party behind the text: sparks never fight the score for legibility.
    drawParticles(ctx);
    for (const s of this.shells) {
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 3);
    }
    drawTubeGlass(ctx);
    const r = this.result;
    drawTextCentered(ctx, r.success ? (r.boss ? 'BOSS DEFEATED' : 'STAGE COMPLETE') : (r.failMsg || 'UNPLUGGED'), W / 2, 34, r.success ? '#48c848' : '#e04848', 2, 'title');
    drawTextCentered(ctx, `SCORE: ${Math.floor(this.shown)}`, W / 2, 70, '#fff', 1);
    let y = 90;
    const line = (t, c) => { drawTextCentered(ctx, t, W / 2, y, c || '#c8c8d8'); y += 13; };
    line(`COINS BANKED: +${this.gains.coins}`, '#f6d33c');
    if (r.stage) {
      const plugs = this.save.slot.campaign.plugs[r.stage.id] || [];
      line(`PLUGS: ${['MISSION', 'CHALLENGE', 'TOASTER'].map((n, i) => `${n} ${plugs[i] ? 'X' : '-'}`).join('  ')}`, '#48e0c8');
      if (this.gains.plugsNew > 0) line(`+${this.gains.plugsNew} NEW PLUG${this.gains.plugsNew > 1 ? 'S' : ''}`, '#48e0c8');
      if (r.rank) {
        const osha = this.save.slot.mods.equipped.includes('osha');
        line(`RANK: ${r.rank}${osha ? '*' : ''}`, r.rank === 'S' || r.rank === 'CONCERNING' ? '#f6d33c' : '#c8c8d8');
        line(RANK_LINES[r.rank] || '', '#8a8a98');
        if (osha) line('* THE BINDER IS DISAPPOINTED.', '#5a5a68');
      }
    }
    // Two named mastery-ups, then a summary — a full-cast run would otherwise
    // stack eight lines straight through the celebration row below.
    const mastery = this.gains.mastery || [];
    mastery.slice(0, 2).forEach((m) => line(`${m.heroId.toUpperCase()} MASTERY LEVEL ${m.level}!`, '#f890b8'));
    if (mastery.length > 2) line(`+${mastery.length - 2} MORE MASTERY-UPS. THE BENCH IS IMPRESSED.`, '#f890b8');
    if (r.success && r.team && r.team.length) {
      // The relay team takes a bow — each hero in their own celebrate pose,
      // slightly out of phase so the line reads as a crowd, not a metronome.
      // Only one hero is ever inside a level at a time, but the cast all exist
      // together OUTSIDE the cabinets (the food court, the hub), so a curtain
      // call after the stage clears is the one moment they can share a frame.
      r.team.forEach((id, i) => drawToon(ctx, id,
        { kind: 'celebrate', grounded: true, menu: true, time: this.t + i * 0.35 },
        W / 2 + (i - (r.team.length - 1) / 2) * 48, 226, 32));
    }
    drawTextCentered(ctx, 'TAP/ENTER: CONTINUE', W / 2, H - 20, '#5a5a68');
  }
}

export class FinaleState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() { this.beat = 0; this.chars = 0; Input.setMenuButtons(); Audio.setBank(null); }
  update(dt) {
    if (this.beat >= FINALE_BEATS.length) { Input.endFrame(); return; }
    this.chars += dt * 34;
    const text = FINALE_BEATS[this.beat];
    if (Input.pressed('confirm') || Input.pressed('jump') || Input.pressed('pointer')) {
      if (this.chars < text.length) this.chars = text.length;
      else {
        this.beat++; this.chars = 0; Audio.sfx('ui');
        if (this.beat >= FINALE_BEATS.length) {
          this.save.slot.campaign.storyFlags.sawEnding = true;
          this.save.persist();
          this.onDone();
        }
      }
    }
    Input.endFrame();
  }
  draw(ctx) {
    if (this.beat >= FINALE_BEATS.length) return;
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    if (this.beat >= 1 && this.beat <= 5) drawProp(ctx, 'eggshell', W / 2 - 24, 60, 48, 40);
    if (this.beat === 6) drawProp(ctx, 'dustdevil', W / 2 - 12, 60, 24, 20);
    if (this.beat === 8) drawTextCentered(ctx, 'OVERTIME UNLOCKED', W / 2, 70, '#8858c8', 2, 'title');
    const text = FINALE_BEATS[this.beat];
    const shown = text.slice(0, Math.floor(this.chars));
    const mid = shown.length > 58 ? shown.lastIndexOf(' ', 58) : shown.length;
    drawTextCentered(ctx, shown.slice(0, mid), W / 2, 150, '#e8e8f0');
    if (mid < shown.length) drawTextCentered(ctx, shown.slice(mid + 1), W / 2, 164, '#e8e8f0');
    drawTextCentered(ctx, `${this.beat + 1}/${FINALE_BEATS.length}`, W / 2, H - 20, '#5a5a68');
  }
}

// FIELD GUIDE: every enemy, object, and pickup with its sprite and one line
// of truth. Color legend: red = avoid, teal = touch it, gold = collect.
const GUIDE_PAGES = [
  {
    title: 'HAZARDS: GROUND FLOOR', color: '#e04848', hint: 'RED = AVOID. JUMP THESE.',
    rows: [
      { s: 'cactus', name: 'THORN CACTUS', desc: 'RED AND PRICKLY. JUMP IT. BREAKABLE.' },
      { s: 'crate', name: 'CRATE', desc: 'WOOD. SOMETIMES STACKED. JUMP OR SMASH IT.' },
      { s: '_pipe', name: 'PIPE', desc: 'TALL AND SMUG. JUMP IT.' },
      { s: 'barrel', name: 'BARREL', desc: 'ROLLS AT YOU. JUMP IT.' },
      { s: 'chair', name: 'OFFICE CHAIR', desc: 'ALSO ROLLS AT YOU. FASTER. JUMP IT.' },
      { s: '_gap', name: 'PIT', desc: 'A HOLE WHERE FLOOR SHOULD BE. JUMP IT.' },
      { s: 'tombstone', name: 'TOMBSTONE', desc: 'JUMP IT. RESPECTFULLY.' },
      { s: 'zombieWalk', name: 'ZOMBIE', desc: 'SHAMBLES TOWARD YOU. JUMP IT.' },
    ],
  },
  {
    title: 'HAZARDS: AIRBORNE + WEIRD', color: '#e04848', hint: 'RED = AVOID. DUCK OR DODGE THESE.',
    rows: [
      { s: 'drone', name: 'DRONE', desc: 'FLIES LOW. DUCK; FERNWICK CAN SHIELD-ROLL.' },
      { s: 'drone', name: 'SHOOTER DRONE', desc: 'STAYS HIGH. DODGE ITS SHOTS INSTEAD.' },
      { s: '_shot', name: 'ENEMY SHOT', desc: 'RED MEANS DODGE. YELLOW MEANS ABOUT TO FIRE.' },
      { s: 'buzzbird', name: 'BUZZBIRD', desc: 'MID-AIR MENACE. DO NOT JUMP INTO IT.' },
      { s: 'icicle', name: 'ICICLE', desc: 'FALLS WHEN YOU GET CLOSE. WATCH ITS SHADOW.' },
      { s: '_beatBar', name: 'BEAT BAR', desc: 'POPS UP ON THE BEAT. JUMP ON TIME.' },
      { s: '_paper', name: 'PAPERWORK', desc: 'FLIES LOW. DUCK. DO NOT SIGN IT.' },
      { s: 'cardboardMonster', name: 'BOX MONSTER', desc: 'CARDBOARD. STILL COUNTS. JUMP IT.' },
    ],
  },
  {
    title: 'TOUCH THESE ON PURPOSE', color: '#48e0c8', hint: 'TEAL = RUN INTO IT. IT IS FINE.',
    rows: [
      { s: '_qcrate', name: '?-CRATE', desc: 'FLOATS. TOUCH TO BREAK. DROPS COINS.' },
      { s: 'target', name: 'TARGET', desc: 'FLOATING TARGET. TOUCH TO DESTROY.' },
      { s: 'printer', name: 'PRINTER', desc: 'SHOOTS PAPER. RAM IT TO BREAK IT.' },
      { s: 'battery', name: 'FROZEN SWITCH', desc: 'TOUCH TO EXTEND A BRIDGE OVER THE NEXT PIT.' },
      { s: 'boostPad', name: 'BOOST PAD', desc: 'RUN OVER IT. GO UNREASONABLY FAST.' },
      { s: '_portal', name: 'HERO PORTAL', desc: 'RUN THROUGH TO CHANGE HERO. 3RD SWITCH = BLAST.' },
      { s: 'eggshell', name: 'CLOWN-COPTER', desc: 'CATCH IT WHEN IT SWOOPS LOW. CHASE MISSIONS.' },
    ],
  },
  {
    title: 'PICKUPS: ESSENTIALS', color: '#f6d33c', hint: 'GOLD = COLLECT. NO DOWNSIDES. PROBABLY.',
    rows: [
      { s: 'coin', name: 'COIN', desc: 'MONEY. THE ARCADE RUNS ON IT.' },
      { s: 'battery', name: 'BATTERY', desc: '+1 BATTERY CELL. HEALTH, BASICALLY.' },
      { s: 'capShield', name: 'SHIELD CAPSULE', desc: 'ABSORBS ONE HIT. POLITELY.' },
      { s: 'capMagnet', name: 'MAGNET CAPSULE', desc: 'PULLS NEARBY COINS TO YOU.' },
      { s: 'capStar', name: 'STAR CAPSULE', desc: 'SCORE MULTIPLIER. YES, IT LOOKS LIKE A TARGET.' },
      { s: 'capUnpeel', name: 'UNPEELABLE CAPSULE', desc: 'RARE. HITS BOUNCE OFF. PITS STILL DO NOT CARE.' },
      { s: 'capRelay', name: 'RELAY BATON', desc: 'VERY RARE. BANKS ONE SUPERCHARGED POWER. SPEND IT WELL.' },
    ],
  },
  {
    title: 'PICKUPS: HERO TRAITS', color: '#72d8f0', hint: 'BORROW A PASSIVE. KEEP THE SPECIAL MOVE TO YOURSELF.',
    rows: [
      { s: 'capAirJump', name: 'AIR JUMP CAPSULE', desc: 'ONE EXTRA AIR-JUMP. STACKS WITH MOCHI AND THE CAPE.' },
      { s: 'capSpeed', name: 'SPEED BURST CAPSULE', desc: 'RUNS FASTER. THE SCENERY OBJECTS.' },
      { s: 'capLowGrav', name: 'LOW GRAVITY CAPSULE', desc: 'YOUR JUMPS GET BIGGER. PHYSICS FILES A COMPLAINT.' },
      { s: 'appliance', name: 'GOLDEN TOASTER', desc: 'THE THIRD PLUG. GRAB IT MID-STAGE.' },
      { s: 'fuse', name: 'CORD PIECE', desc: 'MISSION PICKUP. COLLECT ALL THE PIECES.' },
      { s: 'resident', name: 'RESIDENT', desc: 'ALIVE. WAVES. FOLLOWS YOU. ESCORT THEM TO THE FINISH.' },
    ],
  },
];

export class FieldGuideState {
  constructor({ onDone, settings }) { this.onDone = onDone; this.settings = settings || {}; }
  enter() { this.page = 0; this.t = 0; Input.setMenuButtons(); }
  update(dt) {
    this.t += dt;
    const n = GUIDE_PAGES.length;
    if (Input.pressed('right') || Input.pressed('down')) { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('left') || Input.pressed('up')) { this.page = (this.page + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('pointer') && this.t > 0.3) {
      if (Input.pointer.x < W / 3) { this.page = (this.page + n - 1) % n; Audio.sfx('ui'); }
      else { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    }
    if (Input.pressed('confirm') && this.t > 0.3) { this.page = (this.page + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('back')) { Audio.sfx('ui'); this.onDone(); }
    Input.endFrame();
  }
  // yMid is the row text's optical centre. Icons are centred on it rather than
  // sharing one bottom edge — bottom-aligning left the short ones (boost pad,
  // coin, fuse) sitting entirely below their own label.
  drawIcon(ctx, key, cx, yMid) {
    const top = (h) => Math.round(yMid - h / 2);
    // custom composites for things without a single sprite
    if (key === '_gap') {
      const t0 = top(8);
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 10, t0 + 2, 20, 6);
      ctx.fillStyle = '#30303f'; ctx.fillRect(cx - 12, t0, 3, 8); ctx.fillRect(cx + 9, t0, 3, 8);
      return;
    }
    if (key === '_beatBar') {
      const t0 = top(10);
      ctx.fillStyle = '#e04898'; ctx.fillRect(cx - 4, t0, 8, 10);
      ctx.fillStyle = '#f890c8'; ctx.fillRect(cx - 4, t0, 8, 2);
      return;
    }
    if (key === '_paper') {
      const t0 = top(8);
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 5, t0, 10, 8);
      ctx.fillStyle = '#f0f0f8'; ctx.fillRect(cx - 4, t0 + 1, 8, 6);
      ctx.fillStyle = '#8a8a98'; ctx.fillRect(cx - 3, t0 + 3, 6, 1);
      return;
    }
    if (key === '_shot') {
      const t0 = top(6);
      ctx.fillStyle = '#101018'; ctx.fillRect(cx - 3, t0, 6, 6);
      ctx.fillStyle = '#e04848'; ctx.fillRect(cx - 2, t0 + 1, 4, 4);
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, t0 + 2, 2, 2);
      return;
    }
    if (key === '_portal') {
      const pulse = Math.round(Math.sin(this.t * 5) * 2);
      const h = 20 + pulse;
      drawProp(ctx, 'portal', cx - 6, top(h), 12, h);
      return;
    }
    if (key === '_pipe') { drawProp(ctx, 'pipe', cx - 7, top(18), 14, 18); return; }
    if (key === '_qcrate') {
      const bob = Math.round(Math.sin(this.t * 3) * 2);
      drawProp(ctx, 'qcrate', cx - 6, top(11) + bob, 12, 11);
      return;
    }
    if (hasProp(key)) {
      const d = GUIDE_ICON_SIZES[key] || [12, 11];
      // Animated props (fire) keep flickering in the guide — a still frame of
      // something the player only ever sees moving is a worse likeness.
      const frame = this.settings.reducedMotion ? 0 : Math.floor(this.t * 11);
      drawProp(ctx, key, cx - d[0] / 2, top(d[1]), d[0], d[1], frame);
      return;
    }
    const spr = getSprite(key);
    if (spr) ctx.drawImage(spr, cx - Math.floor(spr.width / 2), top(spr.height));
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    const p = GUIDE_PAGES[this.page];
    drawTextCentered(ctx, 'FIELD GUIDE', W / 2, 14, '#fff', 2, 'title');
    drawTextCentered(ctx, p.title, W / 2, 36, p.color, 1);
    drawTextCentered(ctx, p.hint, W / 2, 48, '#5a5a68');
    const rh = p.rows.length > 9 ? 18 : p.rows.length > 8 ? 20 : 22; // long pages tighten up a touch
    p.rows.forEach((r, i) => {
      const y = 62 + i * rh;
      this.drawIcon(ctx, r.s, 44, y + 9);
      drawText(ctx, r.name, 70, y + 6, p.color);
      drawText(ctx, r.desc, 190, y + 6, '#c8c8d8');
    });
    drawTextCentered(ctx, `< PREV   PAGE ${this.page + 1}/${GUIDE_PAGES.length}   NEXT >   ESC: BACK`, W / 2, H - 14, '#5a5a68');
  }
}

// SOUND TEST: the classic arcade jukebox. Every cabinet track + the hub theme.
const JUKEBOX = [
  { name: 'EMPTY ARCADE (TITLE THEME)', bank: TITLE_THEME },
  { name: 'THE FOOD COURT (HUB THEME)', bank: HUB_THEME },
  ...CABINETS.map((c) => ({ name: `${c.name} (${c.genre})`, bank: c.music })),
];
// Track list sits above the visualizer bars so the two never collide.
const JUKEBOX_TOP = 58;
const JUKEBOX_ROW = 14;

export class SoundTestState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.idx = 0; this.playing = -1; this.t = 0; Audio.setBank(null); Input.setMenuButtons(); }
  exit() { Audio.setBank(null); }
  play(i) {
    this.playing = i;
    Audio.setBank(JUKEBOX[i].bank);
    Audio.sfx('uiConfirm');
  }
  update(dt) {
    this.t += dt;
    const n = JUKEBOX.length;
    if (Input.pressed('down') || Input.pressed('right')) { this.idx = (this.idx + 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('up') || Input.pressed('left')) { this.idx = (this.idx + n - 1) % n; Audio.sfx('ui'); }
    if (Input.pressed('confirm')) this.play(this.idx);
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - JUKEBOX_TOP) / JUKEBOX_ROW);
      if (i >= 0 && i < n) {
        if (this.idx === i) this.play(i); else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('back')) { Audio.setBank(null); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SOUND TEST', W / 2, 16, '#fff', 2, 'title');
    drawTextCentered(ctx, 'ALL CHIPTUNES ARE PLAYED LIVE BY A VERY SMALL ORCHESTRA.', W / 2, 40, '#5a5a68');
    JUKEBOX.forEach((tr, i) => {
      const sel = i === this.idx;
      const on = i === this.playing;
      const label = `${on ? '* ' : ''}${tr.name}  (${tr.bank.bpm} BPM)`;
      drawTextCentered(ctx, (sel ? '> ' : '') + label + (sel ? ' <' : ''), W / 2, JUKEBOX_TOP + i * JUKEBOX_ROW, on ? '#48e0c8' : sel ? '#f6d33c' : '#c8c8d8');
    });
    if (this.playing >= 0) {
      const bars = 12;
      for (let i = 0; i < bars; i++) {
        const hgt = 3 + Math.abs(Math.sin(this.t * 6 + i * 0.9)) * 10;
        ctx.fillStyle = '#48e0c8';
        ctx.fillRect(W / 2 - bars * 5 + i * 10, H - 24 - hgt, 6, hgt);
      }
    }
    drawTextCentered(ctx, 'ENTER/TAP: PLAY   ESC: BACK', W / 2, H - 14, '#5a5a68');
  }
}

export class HowToPlayState {
  constructor({ onDone }) { this.onDone = onDone; }
  enter() { this.t = 0; Input.setMenuButtons(); }
  update(dt) {
    this.t += dt;
    if (this.t > 0.3 && (Input.pressed('confirm') || Input.pressed('back') || Input.pressed('pointer'))) {
      Audio.sfx('ui');
      this.onDone();
    }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'HOW TO PLAY', W / 2, 22, '#fff', 2, 'title');
    drawTextCentered(ctx, 'ONE HERO RENDERS AT A TIME. BUDGET CUTS. RUN ANYWAY.', W / 2, 44, '#8a8a98');
    let y = 64;
    const line = (a, b, c) => {
      drawText(ctx, a, 46, y, c || '#f6d33c');
      drawText(ctx, b, 170, y, '#c8c8d8');
      y += 15;
    };
    line('JUMP', 'SPACE / W / UP -- TAP. HOLD FOR HIGHER.');
    line('DUCK', 'S / DOWN (HOLD) -- SWIPE DOWN.');
    line('HERO POWER', 'RIGHT / D -- PWR. X / SHIFT ALSO WORK.');
    line('PORTALS', 'RUN THROUGH TO BECOME THE PREVIEWED HERO.', '#48e0c8');
    line('RELAY BLAST', 'EVERY 3RD SWITCH AUTO-CLEARS NEARBY HAZARDS.', '#48e0c8');
    y += 4;
    line('MISSION', 'FINISH IT TO WIN THE STAGE. EARNS A PLUG.', '#f890b8');
    line('CHALLENGE', 'OPTIONAL. ANOTHER PLUG. NO PRESSURE. SOME PRESSURE.', '#f890b8');
    line('TOASTER', 'GRAB THE FLOATING APPLIANCE MID-STAGE. THIRD PLUG.', '#f890b8');
    line('PLUGS', 'ONE-TIME EACH. UNLOCK CABINETS. COINS BUY UPGRADES.', '#f890b8');
    line('BREAKER BOX', 'WIN IT: BONUS POWERUP. ESC OR SKIP TO BAIL OUT.', '#f890b8');
    y += 4;
    line('PAUSE / MUTE', 'P OR ESC / M. ESC AGAIN QUITS.');
    drawTextCentered(ctx, 'JUMP THE RED CACTI. DUCK THE DRONES. MIND THE GAPS.', W / 2, y + 6, '#d84828');
    drawTextCentered(ctx, 'TAP/ENTER: BACK', W / 2, H - 16, '#5a5a68');
  }
}

export class SettingsState {
  constructor({ save, onDone }) { this.save = save; this.onDone = onDone; }
  enter() { this.idx = 0; Input.setMenuButtons(); }
  volumeOption(key, name) {
    const s = this.save.settings;
    const adjust = (dir) => {
      const current = Number.isFinite(s.volumes[key]) ? s.volumes[key] : (key === 'music' ? 0.7 : 0.9);
      s.volumes[key] = Math.max(0, Math.min(1, Math.round((current + dir * 0.1) * 10) / 10));
      Audio.setVolumes(s.volumes);
    };
    const value = Number.isFinite(s.volumes[key]) ? s.volumes[key] : 1;
    const filled = Math.round(value * 10);
    return {
      label: `${name}: ${Math.round(value * 100)}%  [${'|'.repeat(filled)}${'.'.repeat(10 - filled)}]`,
      act: () => adjust(value >= 1 ? -10 : 1),
      adjust,
    };
  }
  options() {
    const s = this.save.settings;
    return [
      { label: `MUTE: ${s.muted ? 'ON' : 'OFF'}`, act: () => { s.muted = !s.muted; Audio.setMuted(s.muted); } },
      this.volumeOption('music', 'MUSIC VOLUME'),
      this.volumeOption('sfx', 'SFX VOLUME'),
      { label: `REDUCED MOTION: ${s.reducedMotion ? 'ON' : 'OFF'}`, act: () => { s.reducedMotion = !s.reducedMotion; } },
      { label: `REDUCED FLASHING: ${s.reducedFlashing ? 'ON' : 'OFF'}`, act: () => { s.reducedFlashing = !s.reducedFlashing; } },
      { label: `SCREEN SHAKE: ${Math.round(s.screenShake * 100)}%`, act: () => { s.screenShake = s.screenShake >= 1 ? 0 : s.screenShake + 0.5; } },
      { label: `HIGH CONTRAST OUTLINES: ${s.highContrast ? 'ON' : 'OFF'}`, act: () => { s.highContrast = !s.highContrast; } },
      { label: `GLOW EFFECTS: ${s.fancyFx ? 'ON' : 'OFF'}`, act: () => { s.fancyFx = !s.fancyFx; setFancyFx(s.fancyFx); } },
      { label: `ASSIST SPEED: ${s.assistSpeed}%`, act: () => { s.assistSpeed = s.assistSpeed === 100 ? 80 : s.assistSpeed + 10; } },
      { label: 'DONE', act: () => { this.save.persist(); this.onDone(); } },
    ];
  }
  update(dt) {
    const opts = this.options();
    if (Input.pressed('down')) { this.idx = (this.idx + 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('up')) { this.idx = (this.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
    if (Input.pressed('left')) { if (opts[this.idx].adjust) opts[this.idx].adjust(-1); else opts[this.idx].act(); Audio.sfx('ui'); }
    if (Input.pressed('right')) { if (opts[this.idx].adjust) opts[this.idx].adjust(1); else opts[this.idx].act(); Audio.sfx('ui'); }
    if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); opts[this.idx].act(); }
    if (Input.pressed('pointer')) {
      const i = Math.floor((Input.pointer.y - 70) / 18);
      if (i >= 0 && i < opts.length) {
        if (this.idx === i) { Audio.sfx('uiConfirm'); opts[i].act(); } else { this.idx = i; Audio.sfx('ui'); }
      }
    }
    if (Input.pressed('back')) { this.save.persist(); this.onDone(); }
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'SETTINGS', W / 2, 30, '#fff', 2, 'title');
    drawTextCentered(ctx, 'ALL OF THESE DO EXACTLY WHAT THEY SAY.', W / 2, 52, '#5a5a68');
    this.options().forEach((o, i) => {
      const sel = i === this.idx;
      drawTextCentered(ctx, (sel ? '> ' : '') + o.label, W / 2, 70 + i * 18, sel ? '#f6d33c' : '#c8c8d8');
    });
    drawTextCentered(ctx, 'LEFT/RIGHT: ADJUST   ENTER: CHANGE', W / 2, H - 14, '#5a5a68', 0.875);
  }
}
