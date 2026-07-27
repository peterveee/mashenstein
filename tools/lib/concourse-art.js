// Browser-side promo art shared by the render tools.
//
// This module runs in the headless page, not in Node — it is imported by the
// esbuild entry each tool builds, so it can call straight into src/sprites and
// src/engine/stylePacks. It exists because the concourse slice (one machine, its
// poster, the floor, the falloff) is now wanted by three outputs — the lit
// cabinet stills, the locked cabinet still, and the locked cabinet video loop —
// and a painter copied into three entry strings is a painter that will disagree
// with itself within a week.
//
// Everything here draws in the game's logical units and is handed a context the
// caller has already scaled, so the same code makes a 1080px post or a 4K one.
import { W, H } from '../../src/engine/renderer.js';
import { buildAllSprites, drawWorldEntity } from '../../src/game/draw.js';
import { OBSTACLES, makeObstacle } from '../../src/game/entities.js';
import { getStylePack } from '../../src/engine/stylePacks/index.js';
import { drawToon } from '../../src/sprites/toons.js';
import { PLAYER_X } from '../../src/game/player.js';
import { ZOOM } from '../../src/engine/camera.js';
import {
  cabinetPalette, cabinetStyle, cabinetScreenRect,
  drawCabinetShell, drawCabinetScreen, drawScreenSweep, drawDeadScreen,
} from '../../src/sprites/arcade.js';
import {
  drawPoster, POSTER_W, POSTER_H, drawWallBase, shadeWall, wallLitFrom, CABINET_STAR,
} from '../../src/sprites/backwall.js';

buildAllSprites();

export const GROUND_Y = 232;        // mirrors stylePacks/index.js + run.js
export const HERO_H = 24;           // HERO_DRAW_H — the size a run draws a hero at
export const CAB = cabinetStyle();  // the silhouette the food court actually stands up

// Where the runner goes, and it is NOT the middle.
//
// A run welds the hero to a fixed world offset from the camera (PLAYER_X) and
// hands everything to the right of him to runway — that asymmetry is the whole
// look of the game, and a promo scene that centres him is a picture of a
// different game. Both numbers below come off the real constants rather than
// being dialled in, so a change to the anchor or the camera moves the promo art
// with it.
//
// HERO_SCENE_X is for a scene drawn UNZOOMED, where screen x is world minus
// camX: the same place the run's own draw puts him, +6 for the centre of his
// 12px slot (see the cx line in draw.js' drawHeroSprite). It also lands him
// clear of the obstacle run that sceneCanvas lays out, which centring did not —
// at 240 he stood inside the second crate.
//
// HERO_FRAME_FRAC is for framing a WINDOW onto that scene. A run is zoomed, so
// what a player actually sees is his drawn centre about 26% across the frame;
// reproducing the fraction is what makes a crop look like the game rather than
// like a world-space diagram of it.
export const HERO_SCENE_X = PLAYER_X + 6;
export const HERO_FRAME_FRAC = ((PLAYER_X + 6) * ZOOM) / W;

// The gallery's pose helper, unchanged — a plain pose object is all drawToon
// needs, and reproducing it keeps these tools from importing the gallery.
export function pose(kind, t, extra = {}) {
  return {
    kind, phase: (t * 1.6) % 1, time: t, vy: kind === 'jump' ? -160 : 0,
    grounded: kind !== 'jump', squash: 0, lean: 0, roll: false, float: false,
    stomp: false, headless: false, facing: 1, ...extra,
  };
}

// Which hazards a cabinet actually throws, pulled from its own pattern bank, so
// a scene is dressed with the things that cabinet's stages spawn rather than a
// fixed pair. Same scan hub/index.js' cabinetScene does.
export function obstacleTypes(cab, max) {
  const out = [];
  const seen = new Set();
  for (const pat of cab.patterns || []) {
    for (const cell of pat.cells) {
      if (seen.has(cell.t) || !OBSTACLES[cell.t]) continue;
      seen.add(cell.t);
      out.push(cell.t);
      if (out.length >= max) return out;
    }
  }
  return out;
}

// One hazard per cabinet, chosen so a set of them does not repeat.
//
// Taking each cabinet's first pattern cell is the obvious thing and it is wrong
// for a contact sheet: most banks open on a cactus, so eight of nine tiles
// advertised nine different games with the same plant in them, which is the
// exact opposite of what the sheet is for. Greedy first-unused pick instead,
// falling back to a repeat only if a cabinet has nothing else.
export function distinctHazards(cabs) {
  const used = new Set();
  const pick = new Map();
  for (const cab of cabs) {
    const types = obstacleTypes(cab, 8);
    const fresh = types.find((t) => !used.has(t));
    const chosen = fresh || types[0] || null;
    if (chosen) used.add(chosen);
    pick.set(cab.id, chosen);
  }
  return pick;
}

// A full 480x270 scene for one cabinet: sky, ground, its own hazards, and its own
// poster star running through it. Rendered at `scale` so a screen crop out of it
// stays sharp at output resolution instead of being a magnified 480px bitmap.
// Cached, because a set of images reuses one per cabinet.
const SCENES = new Map();
export function sceneCanvas(cab, scale, hero) {
  const key = `${cab.id}|${scale}|${hero}`;
  if (SCENES.has(key)) return SCENES.get(key);
  const cv = document.createElement('canvas');
  cv.width = W * scale;
  cv.height = H * scale;
  const c = cv.getContext('2d');
  c.scale(scale, scale);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const pack = getStylePack(cab.style, {});
  const camX = 140;
  const obstacles = obstacleTypes(cab, 4).map((t, i) => makeObstacle(t, camX + 120 + i * 116));
  if (pack.bg) pack.bg(c, 1.2, camX, cab, 1000);
  if (pack.ground) pack.ground(c, camX, cab, obstacles);
  for (const o of obstacles) drawWorldEntity(c, o, camX, 1.2, pack, {});
  if (hero) drawToon(c, hero, pose('run', 1.2), HERO_SCENE_X, GROUND_Y, HERO_H);
  if (pack.post) pack.post(c, 1.2);
  SCENES.set(key, cv);
  return cv;
}

// The food court's floor, as hub/index.js draws it. Copied rather than imported
// because that painter is private to the hub module and importing the module
// would drag a whole game state in behind it; if the floor is ever restyled,
// this is the one place here that has to follow.
function foodCourtFloor(ctx, floorY, x0, x1, worldOffsetX) {
  const wallY1 = floorY - 2;
  ctx.fillStyle = '#38304a';
  ctx.fillRect(x0, wallY1, x1 - x0, 6);
  ctx.fillStyle = '#1c1626';
  ctx.fillRect(x0, wallY1 + 6, x1 - x0, 400);
  for (let row = 0; row < 3; row++) {
    for (let x = x0 - (worldOffsetX % 32) - 32; x < x1; x += 32) {
      ctx.fillStyle = (Math.floor((x + worldOffsetX) / 32) + row) % 2 === 0 ? '#241c30' : '#1c1626';
      ctx.fillRect(Math.round(x), wallY1 + 10 + row * 22, 32, 22);
    }
  }
}

// A lit machine throws its screen colour onto the tiles in front of it — the
// hub's own light pooling, which is what stops a cabinet reading as pasted onto
// the scene rather than standing in it.
function lightPool(ctx, x, floorY, cab, w, alpha = 0.24) {
  const g = ctx.createLinearGradient(0, floorY, 0, floorY + 34);
  g.addColorStop(0, cab.sky[0]);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, floorY);
  ctx.lineTo(x + w * 0.5, floorY);
  ctx.lineTo(x + w * 0.85, floorY + 34);
  ctx.lineTo(x - w * 0.85, floorY + 34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------- dead-screen time
// A locked cabinet's static is a BURST, not a loop: deadScreenBurst holds it on
// for 0.42s out of a period of 6.5-11.7s depending on the cabinet's seed, so at
// an arbitrary clock the glass is simply black. Both the still and the video have
// to aim at the window rather than sample it, which means solving the phase.
//
// Mirrors deadScreenBurst in src/sprites/arcade.js. Two numbers are duplicated —
// the period formula and the 0.41 phase offset — and there is no way around it
// while the function takes only a clock; if that is ever refactored to expose its
// own timing, this should be deleted rather than kept in step.
export const BURST_WINDOW = 0.42;
export function burstPeriod(seed) { return 6.5 + (seed % 5) * 1.3; }

// The clock value at which this cabinet's burst is `phase` seconds into its
// window. phase 0 is the instant it snaps on; the amplitude plateaus at full
// between 0.071 and 0.253, and the bright spark only fires above 0.65 of it.
export function burstTime(seed, phase) {
  const period = burstPeriod(seed);
  const t = phase - (seed % 97) * 0.41;
  // Lifted a whole period so the clock stays positive: a negative phase reads as
  // quiet rather than as a burst, which would be a confusing way to fail.
  return ((t % period) + period) % period;
}

// ------------------------------------------------------------- the concourse
// A 4:5 slice of the food court at hub scale: the poster above the machine, the
// skirting and tiles below, two neighbours cropped at the frame edges, and the
// wall falling off into the dark on the game's own smoothstep — wallLitFrom with
// a single fixture over this cabinet.
//
// `locked` swaps the whole thing to the unplugged read: the dead palette, no
// screen art, no light pool, a blank poster (the locked palette carries no motif,
// so drawPoster gets no star, no wordmark and no genre badge — an unlit machine's
// advertising is illegible, which is the correct picture), and a dimmer room.
//
// The wall base, the spotlight and the vignette are framing rather than the hub's
// lighting model; everything inside the frame is the game's own painters.
// `bare` strips the room out entirely: black, and the machine. No wall, no floor,
// no fixture spill, no vignette — so the only thing in the frame that is not black
// is the cabinet and whatever its glass is doing. Worth having as its own mode
// rather than as a dark ambient, because at that point every one of those layers
// is drawing something over nothing, and the burst's own bloom is the whole
// picture. It also centres the machine vertically, since with no floor there is no
// ground line to stand it on.
// showStar draws the cabinet's own poster star running on the glass. Off gives
// the same shot with the screen showing only its background — asked for because
// the machine, its palette and its style pack are the subject of these stills,
// and a character on the screen is a second thing to look at.
export function paintConcourse(ctx, LW, LH, {
  cab, locked = false, t = 1.4, ambient = null, reduced = false, poster = true,
  groundAt = null, neighbours = 1, spacing = null, bare = false, showStar = true,
}) {
  if (bare) poster = false;
  const pal = cabinetPalette(cab, !locked);
  const dead = cabinetPalette(cab, false);
  const cx = LW / 2;
  // Stacked from the top rather than up from the floor. Poster + gap + cabinet is
  // 147 of the 180 logical units a 4:5 frame gives at hub scale, so what is left
  // over is the floor — and hanging the sheet just under the top edge is what
  // buys enough tiles to stand the machine on. Pinning the floor first instead
  // left a 15-unit strip that cropped the first tile row in half.
  //
  // Without the poster the machine gets the height back: the caller is expected
  // to pass a shorter logical frame to match, so the cabinet fills more of it
  // rather than sitting under an empty wall.
  //
  // groundAt overrides all of that, and a wide shot needs it to. The stacking
  // above is proportional to the frame, which holds only while the machine is
  // most of the picture; open the frame up to see the room and the same
  // proportions put the floor line a third of the way down and hand 60% of the
  // shot to floor tiles. Pinning the ground line instead keeps the wall above the
  // machine growing as you step back, which is what stepping back looks like.
  const posterTop = LH * 0.035;
  const floorY = groundAt !== null
    ? LH * groundAt
    : bare ? (LH + CAB.h) / 2
      : (poster ? posterTop + POSTER_H + 8 : LH * 0.10) + CAB.h;
  const cabY = floorY - CAB.h;

  // One working fixture, directly over this machine. reach is deliberately tight
  // — the whole read is that the light stops. A locked machine sits in a dimmer
  // stretch: the ceiling is still on, but nothing here is.
  const peak = ambient === null ? (locked ? 0.52 : 1) : ambient;
  const litAt = (lx) => Math.max(0.05, peak * wallLitFrom(lx, [cx], LW * 0.62));

  if (bare) {
    ctx.fillStyle = '#000';
    ctx.fillRect(-LW * 0.2, -LH * 0.2, LW * 1.4, LH * 1.4);
  } else {
    drawWallBase(ctx, -LW * 0.1, -LH * 0.2, LW * 1.2, floorY + LH * 0.2);
    shadeWall(ctx, -LW * 0.1, -LH * 0.2, LW * 1.2, floorY + LH * 0.2, litAt);

    // The fixture's own spill, above the poster.
    const spill = ctx.createRadialGradient(cx, -LH * 0.06, 0, cx, LH * 0.18, LH * 0.55);
    spill.addColorStop(0, `rgba(246,211,60,${(0.16 * peak).toFixed(3)})`);
    spill.addColorStop(1, 'rgba(246,211,60,0)');
    ctx.fillStyle = spill;
    ctx.fillRect(0, 0, LW, floorY);

    if (poster) {
      drawPoster(ctx, cx, posterTop, POSTER_W, POSTER_H, {
        pal, tilt: -0.035, torn: locked, lit: litAt(cx) * 0.92,
      });
    }

    foodCourtFloor(ctx, floorY, -LW * 0.1, LW * 1.1, 12);
    // The floor takes the same falloff as the wall. It was left at full value while
    // only the wall dimmed, which is invisible at a close framing (the light is at
    // full over the machine anyway) and wrong the moment you step back: the tiles
    // become the brightest thing in a room whose whole point is that the lights are
    // out, and the checkerboard reads as a pattern rather than as a floor. The hub
    // dims the whole concourse with one pass for exactly this reason.
    shadeWall(ctx, -LW * 0.1, floorY - 2, LW * 1.2, LH - floorY + LH * 0.2, litAt);
    if (!locked) lightPool(ctx, cx, floorY, cab, CAB.w);
  }

  // The neighbours: same silhouette, unplugged. One each side at a close framing,
  // so each is cut by the frame edge and the row reads as continuing past the shot
  // rather than as a diorama of three. A wide shot asks for more of them, at a
  // spacing that stays in hub units rather than growing with the frame — the
  // machines do not move apart because the camera stepped back.
  const step = spacing !== null ? spacing : LW * 0.54;
  for (let i = 1; i <= neighbours; i++) {
    for (const dx of [-step * i, step * i]) {
      drawCabinetShell(ctx, cx + dx - CAB.w / 2, cabY, CAB.w, CAB.h, dead);
    }
  }
  // Neighbours sit outside the light, so they take the wall's falloff too. Drawn
  // over them rather than baked into the palette, exactly as the hub does it. The
  // clip spares only the band the lit machine stands in.
  if (!bare && neighbours > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, cabY, cx - CAB.w * 0.62, CAB.h);
    ctx.rect(cx + CAB.w * 0.62, cabY, LW - cx - CAB.w * 0.62, CAB.h);
    ctx.clip();
    shadeWall(ctx, 0, cabY, LW, CAB.h, litAt);
    ctx.restore();
  }

  drawCabinetShell(ctx, cx - CAB.w / 2, cabY, CAB.w, CAB.h, pal);

  // The attract demo on the glass: the cabinet's own scene, windowed so the
  // ground line sits 72% down. The hub frames its screens off a fixed 0.62 of
  // the source, which for its aspect puts GROUND_Y below the window — fine for a
  // 34px screen in a room you are walking through, where the read is only
  // "something is moving". A still that fills a phone wants the floor the hero is
  // standing on, so this solves for the ground line instead.
  //
  // A locked palette makes drawCabinetScreen return null on its own (no art, no
  // motif, not lit), which is the same branch the hub takes to reach the dead
  // screen — so the unplugged path here is the game's, not a special case.
  let art = null;
  if (!locked) {
    const star = showStar ? CABINET_STAR[cab.id] || null : null;
    const scene = sceneCanvas(cab, 4, star);
    art = (c, cw, ch) => {
      const winW = scene.width * 0.2;
      const winH = winW * (ch / cw);
      const groundPx = (GROUND_Y / H) * scene.height;
      // Framed on the runner, not on the scene. Centring the window put him dead
      // centre of the glass with the crate he is running at directly under him;
      // solving for HERO_FRAME_FRAC instead lands him a quarter across with the
      // hazard out ahead on the right, which is the shape of a real run.
      //
      // The same window is used with the star switched off, so the empty variant
      // is the identical shot minus one character rather than a second framing.
      const sc = scene.width / W;
      const winX = HERO_SCENE_X * sc - HERO_FRAME_FRAC * winW;
      c.drawImage(scene, winX, groundPx - winH * 0.72,
        winW, winH, 0, 0, cw, ch);
    };
  }
  const scr = drawCabinetScreen(ctx, cx - CAB.w / 2, cabY, CAB.w, CAB.h, pal, undefined, art);
  const r = cabinetScreenRect(cx - CAB.w / 2, cabY, CAB.w, CAB.h);
  let burst = 0;
  if (scr) {
    drawScreenSweep(ctx, scr, t, pal.seed);
  } else {
    burst = drawDeadScreen(ctx, cx - CAB.w / 2, cabY, CAB.w, CAB.h, t, pal.seed, reduced) || 0;
  }

  // Bloom. A lit CRT is the brightest thing in a dark room; a dead one is only
  // that for the fraction of a second its burst is up, so the dead bloom rides
  // the burst amplitude and is otherwise absent entirely.
  const bloomA = scr ? 0.20 : burst * 0.34;
  if (bloomA > 0.001) {
    const g = ctx.createRadialGradient(
      r.x + r.w / 2, r.y + r.h / 2, 0, r.x + r.w / 2, r.y + r.h / 2, r.w * 1.5);
    g.addColorStop(0, scr ? cab.sky[0] : '#9fb4dc');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = bloomA;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(r.x - r.w * 1.5, r.y - r.w * 1.5, r.w * 4, r.w * 4);
    ctx.restore();
  }
  // ...and a burst throws that light down onto the tiles, the same way a running
  // machine pools its screen colour. This is the one cue that says the static is
  // happening in a room rather than on a picture of a cabinet.
  if (burst > 0.001 && !bare) {
    lightPool(ctx, cx, floorY, { sky: ['#9fb4dc'] }, CAB.w, burst * 0.20);
  }

  // No vignette on black — there is nothing to darken toward the edges, and the
  // gradient only muddies the one thing in shot.
  if (!bare) {
    const vig = ctx.createRadialGradient(cx, LH * 0.52, LH * 0.26, cx, LH * 0.52, LH * 0.78);
    vig.addColorStop(0, 'rgba(6,4,12,0)');
    vig.addColorStop(1, `rgba(6,4,12,${locked ? 0.72 : 0.62})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, LW, LH);
  }

  return burst;
}
