// THE LAST FUNCTIONING FOOD COURT: side-view hub + stage select,
// Repair Bench, Gary's Legally Distinct Pawn Shop, arcade corner.
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawText, drawTextCentered, getSprite, textWidth, platePath, drawMenuRow, textYForMid } from '../../engine/sprites.js';
import { drawToon } from '../../sprites/toons.js';
import { drawProp } from '../../sprites/props.js';
import {
  cabinetPalette, cabinetStyle, drawCabinetShell, drawCabinetScreen, drawDeadScreen, drawScreenSweep,
  drawDoor, DOOR_PALETTES, OVERTIME_PALETTE,
} from '../../sprites/arcade.js';
import {
  hubWallBays, BAY_W, drawWallBay, drawPoster, wallLitFrom, POSTER_W, POSTER_H,
} from '../../sprites/backwall.js';
import { CABINETS, CABINET_BY_ID, HUB_THEME } from '../../data/cabinets.js';
import { STAGES, stagesForCabinet, UNLOCKS } from '../../data/stages.js';
import { HEROES, HERO_BY_ID } from '../../data/heroes.js';
import { BENCH_UPGRADES, MODS, MOD_BY_ID, REWARDS, ARCADE_PLAY_COST } from '../../data/progression.js';
import { HUB_LINES, PAWN_LINES } from '../../data/jokes.js';
import { totalPlugs, MAX_PLUGS, cabinetUnlocked, bossAvailable, finaleUnlocked, actForSlot, formatCoins, stageUnlocked, prevStage } from '../progress.js';
import { drawPlugRow, PLUG_ROW_W } from '../plugs.js';
import { drawSpeech } from '../hud.js';
import { MINIGAMES, MINIGAME_NAMES } from '../minigames/index.js';
import { setTransitionHero } from '../../engine/states.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { makeObstacle, OBSTACLES } from '../entities.js';
import { drawWorldEntity } from '../draw.js';
import { hashStr } from '../../engine/rng.js';

const CORRUPTED_MODIFIERS = [
  { id: 'nojump', name: 'NO JUMPING', desc: 'THE JUMP BUTTON IS ON STRIKE. CONTRACTUAL MINIMUM HOP.' },
  { id: 'maxspeed', name: 'MAXIMUM SPEED', desc: 'EVERYTHING IS FASTER. NOTHING IS CALMER.' },
  { id: 'randomswap', name: 'RANDOM SWAPS', desc: 'PORTALS ARRIVE TWICE AS OFTEN. NOBODY ASKED.' },
  { id: 'narration', name: 'INACCURATE LORE', desc: 'EGGSHELL DESCRIBES A DIFFERENT GAME.' },
];
export { CORRUPTED_MODIFIERS };

// Food-court camera: zoomed in from the old 1:1 view so the cast, stations
// and floor read bigger. The floor line (where every pair of feet stands)
// is pinned to the same screen y at every zoom, the same trick camera.js
// uses to pin GROUND_Y for the run camera — so zooming in crops the ceiling
// rather than sliding the ground out from under the player.
const HUB_ZOOM = 1.3;
// Where the floor line sits, which — because the pin maps this world y to the
// same SCREEN y — is also how the 270px frame is split between wall and floor.
// It was 192, leaving 78px of floor for a UI band that only ever uses the
// bottom ~50 (the legend at H-48, the prompt at H-30, the status row at H-11).
// The surplus was 20px of empty checkerboard bought at the wall's expense, so
// the line moved down: same UI, more room for what is actually on the wall.
const HUB_FLOOR_PIN_Y = 212;
const HUB_VIEW_W = W / HUB_ZOOM;
const HUB_CAM_Y = HUB_FLOOR_PIN_Y - HUB_FLOOR_PIN_Y / HUB_ZOOM;

// Wall band and ceiling, both derived rather than written down. Lowering the
// floor also lowers the top crop (the pin trades ceiling for floor), and a
// hardcoded fixture y is exactly how the lights ended up drawn off-screen the
// first time — so the ceiling is defined as "the first world y that is actually
// on screen", plus clearance for the housing drawCeilingLight hangs at y-4.
const HUB_WALL_Y0 = 40;
const HUB_WALL_Y1 = HUB_FLOOR_PIN_Y - 2;            // top of the skirting trim
const HUB_CEIL_Y = Math.ceil(HUB_FLOOR_PIN_Y - HUB_FLOOR_PIN_Y / HUB_ZOOM) + 6;

// Station footprints, all standing on the floor line. The cabinet takes its
// size from whichever silhouette CABINET_STYLE names rather than hardcoding
// one, so switching styles moves the concourse with it — the four candidates
// are deliberately different shapes. The door is sized to clear the ceiling
// glow that washes down to y 140. Both stay inside stations()' 22px tap radius,
// so nothing about walking up to them changes.
const CAB_W = cabinetStyle().w, CAB_H = cabinetStyle().h;
const CAB_Y = HUB_FLOOR_PIN_Y - CAB_H;
const DOOR_W = 44, DOOR_H = 84, DOOR_Y = HUB_FLOOR_PIN_Y - DOOR_H;

// How tall the cast stands in the concourse, in the same logical units the
// cabinets are measured in (drawToon's `h` is character height).
//
// These were 19 and 24 against a 90-tall cabinet — a hero came up to 28% of a
// machine, which is why the cast read as dolls parked in front of vending
// machines. A real arcade cabinet is about the height of the person playing it;
// even allowing for a cartoon world the right ratio is well over half. At 46
// the player's head lands just under the screen bezel, so the cast fills the
// control-deck band without covering the art on the screens.
//
// The NPC/player gap is kept (0.83) — the hero you are driving reads slightly
// larger than the crowd, which is how you find yourself on a busy concourse.
const NPC_H = 38, PLAYER_H = 46;
// How far a hero ranges from their spot, how much clearance a station needs
// before anyone will stop beside it, and how close to the exit anyone may get.
// ROAM is deliberately wide — a hero should cross in front of two or three
// machines on a stroll; it is only where they STOP that matters.
const NPC_ROAM = 155, NPC_LOITER_CLEAR = 30, NPC_MIN_X = 70;

// THE DUST DEVIL's cameo. It is a stick vacuum, so it has to be touching
// something: brush head down on the floor line, or brush head up on the ceiling
// with the whole machine hanging off it. What it must never be is halfway up
// the wall, which is where it spent the last few builds — its y was hardcoded
// to the OLD floor line (192), so when the floor dropped to 212 it was left
// hovering with nothing under the brush, reading as a bug rather than a
// haunting.
//
// Size comes off the cast rather than the eye: a stick vacuum reaches somewhere
// around the waist of whoever is pushing it, so ~55% of NPC_H. At the old 16x14
// it stood a third as tall as a hero — fine for a smudge floating up the wall,
// a toy once it shares a floor with them.
const DD_H = Math.round(NPC_H * 0.55), DD_W = Math.round(DD_H * 0.85);

// What it is doing on a given visit, seeded on the visit index so a pass is
// rolled once and never re-rolls mid-glide.
function dustDevilPass(visit, act) {
  const h = hashStr(`dustdevil-${visit}`);
  return {
    // Act 1 keeps its feet down (the maintenance log has it mopping the floor);
    // from act 2 on it has earned the ceiling, but only now and then — the
    // ceiling gag lands because it is the exception.
    onCeiling: act > 1 && (h >>> 3) % 3 === 0,
    dir: (h & 1) ? 1 : -1,           // which way it crosses
    depth: (h >>> 5) % 11,           // px in front of the floor line; the floor runs well past it
  };
}

// Who you are currently carrying, from a flow object. A plain function rather
// than a method on Flow: the hub is constructed with a stub flow in several
// tests, and requiring a method there would make "which hero" a thing callers
// have to implement rather than a thing derived from two fields.
export function heroIdFor(flow) {
  return (flow && flow.hubAvatar) || (flow && flow.lastTeam && flow.lastTeam[0]) || 'lorenzo';
}

// What is actually playing on a cabinet's screen: a slice of that cabinet's own
// level, panning past.
//
// The screens used to repeat the genre motif that is already on the marquee,
// which is what gave them away as decals — a machine showing its own logo is a
// machine that is switched on but not running anything. Now the marquee keeps
// the logo (a sign's job) and the screen shows the game (a screen's job).
//
// Each cabinet's scene is rendered ONCE through the real style pack — the same
// pack.bg()/pack.ground() pair the run uses, so this can never drift from what
// the stage actually looks like — into a half-size offscreen canvas, and the
// screen blits a moving window across it. Rendering the pack live per frame per
// cabinet would mean four full parallax scenes a frame for a 33x22 result.
const SCENES = new Map();
function cabinetScene(cab) {
  let c = SCENES.get(cab.id);
  if (c !== undefined) return c;
  c = null;
  try {
    c = document.createElement('canvas');
    c.width = W / 2; c.height = H / 2;
    const x = c.getContext('2d');
    x.scale(0.5, 0.5);
    const pack = getStylePack(cab.style, {});
    // The cabinet's own hazards, pulled from its own pattern bank, so each
    // screen shows the game that cabinet actually plays. Sky and ground alone
    // came out as two flat bands — an attract screen needs something in it.
    const obstacles = [];
    const seen = new Set();
    for (const pat of cab.patterns || []) {
      for (const cell of pat.cells) {
        if (seen.has(cell.t) || !OBSTACLES[cell.t]) continue;
        seen.add(cell.t);
        obstacles.push(makeObstacle(cell.t, 90 + obstacles.length * 120));
        if (obstacles.length >= 4) break;
      }
      if (obstacles.length >= 4) break;
    }
    if (pack.bg) pack.bg(x, 0, 0, cab, 1000);
    if (pack.ground) pack.ground(x, 0, cab, obstacles);
    for (const o of obstacles) drawWorldEntity(x, o, 0, 0, pack, {});
  } catch {
    c = null; // headless, or a pack that needs run state: fall back to the motif
  }
  SCENES.set(cab.id, c);
  return c;
}

// The window panned across that scene. Crops to the band around the ground line
// — the sky above it is mostly empty and at 22 units tall an empty screen reads
// as a broken one — and wraps, so every cabinet loops its own attract forever.
function cabinetScreenArt(cab, t, seed = 0) {
  const src = cabinetScene(cab);
  if (!src) return null;
  // A tight window: at 0.42 of the scene the hazards came out ~2px across on a
  // 34px screen — texture, but not readable as anything. 0.2 puts a cactus at a
  // legible 5px, which is what makes this read as a game rather than as a
  // gradient. Height follows the glass aspect so nothing is squashed.
  const winW = src.width * 0.2;
  const span = src.width - winW;
  // Ping-pong rather than jump-cut: a hard wrap on a 33px screen reads as a
  // dropped frame, where a slow reverse just looks like the demo turning round.
  // Per-cabinet rate and offset, for the same reason the sweep is staggered:
  // nine attract loops panning in unison read as one scrolling backdrop behind
  // nine windows rather than as nine machines each running their own demo.
  const cycle = (t * (0.062 + (seed % 5) * 0.007) + (seed % 97) * 0.17) % 2;
  const pan = (cycle < 1 ? cycle : 2 - cycle) * span;
  // Framed on the ground line (GROUND_Y is 232 of 270, so 0.86 of the source)
  // with headroom above it for the flyers.
  return (c, cw, ch) => c.drawImage(src, pan, src.height * 0.62, winW, winW * (ch / cw), 0, 0, cw, ch);
}

// cabinetPalette() mixes a dozen colours per call and the answer only depends
// on the cabinet and whether it is unlocked, so each one is built once.
const CAB_PALETTES = new Map();
function palFor(cab, unlocked) {
  const key = `${cab.id}|${unlocked ? 1 : 0}`;
  let p = CAB_PALETTES.get(key);
  if (!p) { p = cabinetPalette(cab, unlocked); CAB_PALETTES.set(key, p); }
  return p;
}

// The food court is falling apart, so the ceiling lights that ARE working
// sputter rather than glow steady. Each light runs on its own clock (an
// index-based offset and period keep them from all guttering in lockstep —
// see draw.js's fire licks for the same idiom) and dips to a brownout, not a
// hard blackout, matching flickerAlpha's title-sign short-out in menus.js so
// this doesn't read as a dropped frame. reducedFlashing pins every light lit.
function lightFlicker(t, i, reduced) {
  if (reduced) return 1;
  const period = 4.5 + (i % 4) * 0.9;
  const phase = (t + i * 1.87) % period;
  if (phase < 0.18) return phase < 0.09 ? 0.2 : 0.55;
  return 1;
}

// One ceiling fixture and the light coming out of it. `lit` is 0 for a dead
// tube, else the flicker level.
//
// This was a flat yellow bar with a straight-sided rectangle of gradient hanging
// under it — light as a column, which is the one thing light never looks like.
// What actually reads as a working fixture in a dark room is four separate
// things, and the beam is only one of them:
//
//   1. a housing, so the tube is mounted in something
//   2. a hot core inside the tube, brighter than the tube's own colour
//   3. a halo around the fixture, where the air right by it is lit
//   4. a beam that SPREADS as it falls, and leans away from the middle of the
//      view — a room lit from the ceiling only shows you parallel beams if you
//      are standing directly under them, and every other fixture is seen at an
//      angle. The lean is what makes eight fixtures read as a room rather than
//      as eight copies of one sprite.
const LIGHT_W = 26;
function drawCeilingLight(ctx, x, y, lit) {
  // Housing first: a dark bracket the tube hangs in, drawn whether or not the
  // tube works. A dead light is still a fixture.
  ctx.fillStyle = '#232030';
  ctx.fillRect(x - 3, y - 4, LIGHT_W + 6, 4);
  ctx.fillStyle = lit > 0 ? '#f6d33c' : '#30303f';
  ctx.fillRect(x, y, LIGHT_W, 4);
  if (lit <= 0) return;

  ctx.save();
  ctx.globalAlpha = lit;
  // The hot core — a lit tube is not one flat colour end to end.
  ctx.fillStyle = '#fff6c8';
  ctx.fillRect(x + 3, y + 1, LIGHT_W - 6, 2);

  const cx = x + LIGHT_W / 2;
  // Halo: the air immediately around the fixture.
  const halo = ctx.createRadialGradient(cx, y + 2, 1, cx, y + 2, 34);
  halo.addColorStop(0, 'rgba(246,211,60,0.22)');
  halo.addColorStop(1, 'rgba(246,211,60,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 34, y - 32, 68, 68);

  // The beam. Splayed, and sheared toward whichever side of the view this
  // fixture sits on, so the further off-centre it is the harder it rakes.
  const lean = ((cx - HUB_VIEW_W / 2) / (HUB_VIEW_W / 2)) * 26;
  const top = y + 4, bottom = 168;
  const beam = ctx.createLinearGradient(0, top, 0, bottom);
  beam.addColorStop(0, 'rgba(246,211,60,0.13)');
  beam.addColorStop(0.55, 'rgba(246,211,60,0.05)');
  beam.addColorStop(1, 'rgba(246,211,60,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(x + 1, top);
  ctx.lineTo(x + LIGHT_W - 1, top);
  ctx.lineTo(x + LIGHT_W + 20 + lean, bottom);
  ctx.lineTo(x - 20 + lean, bottom);
  ctx.closePath();
  ctx.fill();

  // A tighter, brighter core inside the beam — light has a bright middle and
  // soft edges, and a single flat wedge has neither.
  const core = ctx.createLinearGradient(0, top, 0, bottom - 40);
  core.addColorStop(0, 'rgba(255,244,200,0.12)');
  core.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.moveTo(x + 6, top);
  ctx.lineTo(x + LIGHT_W - 6, top);
  ctx.lineTo(x + LIGHT_W - 1 + lean * 0.6, bottom - 40);
  ctx.lineTo(x + 1 + lean * 0.6, bottom - 40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Walking up to a hero offers two things, and neither of them is guessable from
// the world: you can hear what they have to say, or you can BE them. So they get
// a two-item chooser floating over their head rather than being bound to keys.
//
// The alternative was mapping them to different inputs (DOWN talks, ENTER
// swaps), which reads fine in a manual and not at all on a screen — and on touch
// it would have meant "dwell to talk, tap to swap", two gestures on the same
// character telling you nothing about themselves. Two labelled chips say what
// both actions are, and are hit the same way on a phone as on a keyboard.
const NPC_MENU = [{ id: 'talk', label: 'TALK' }, { id: 'swap', label: 'SWAP' }];
// Not everyone in the concourse is a body you can wear — Gary runs the shop and
// is not in HEROES. Offering SWAP on him would be a button that silently does
// the wrong thing, so he gets a one-item chooser instead.
function npcMenuFor(npc) { return npc && npc.swappable === false ? NPC_MENU.slice(0, 1) : NPC_MENU; }
const NPC_CHIP_W = 30, NPC_CHIP_H = 12, NPC_CHIP_GAP = 3;

// World-space rect for option `i` above a hero standing at `npcX`. One function
// for both the drawing and the hit test, so a chip can never be somewhere other
// than where it looks.
//
// Side by side rather than stacked: two chips in a row is one band of chrome
// over a head instead of a column climbing toward the ceiling, and it leaves the
// pair low enough to still read as belonging to that hero. Selection stays on
// UP/DOWN even though the layout is horizontal — LEFT/RIGHT is walking, and
// with exactly two options either key is a toggle, not a direction.
function npcChipRect(npcX, i, count = NPC_MENU.length) {
  const row = count * NPC_CHIP_W + (count - 1) * NPC_CHIP_GAP;
  // Clears the player's own marker, which sits at ~132-138: you stand within 18
  // units of whoever you address, so the chips and the wedge share a column.
  const top = HUB_FLOOR_PIN_Y - NPC_H - 36;
  return {
    x: npcX - row / 2 + i * (NPC_CHIP_W + NPC_CHIP_GAP),
    y: top,
    w: NPC_CHIP_W,
    h: NPC_CHIP_H,
  };
}

function drawNpcChips(ctx, npcX, cam, idx, opts) {
  for (let i = 0; i < opts.length; i++) {
    const r = npcChipRect(npcX, i, opts.length);
    const x = Math.round(r.x - cam);
    const sel = i === idx;
    ctx.save();
    ctx.beginPath();
    platePath(ctx, x, r.y, r.w, r.h, 4);
    ctx.fillStyle = sel ? '#f6d33c' : 'rgba(18,14,28,0.86)';
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = sel ? 'rgba(26,16,40,0.5)' : 'rgba(246,211,60,0.45)';
    ctx.stroke();
    ctx.restore();
    drawTextCentered(ctx, opts[i].label, x + r.w / 2, r.y + 2.5, sel ? '#1a1028' : '#f6d33c', 0.85, 'bold');
  }
}

// A cabinet's remaining business, as nine bulbs set into its marquee.
//
// Three placements in and this is the one that holds. On the lower body they sat
// at y169..187, dead inside the y154..192 band where heroes stand, so the crowd
// hid them. Mounted on a plate above the machine they cleared the crowd but read
// as UI hovering over the scene rather than anything the cabinet owned. Here
// they are recessed into the hood just under the marquee glass — the one strip
// that is never occluded, and the one place on an arcade cabinet where a row of
// bulbs is what you would expect to find anyway. The service-door signs already
// carry bulb rows on the same idiom.
//
// Evenly spaced, full stop. An earlier pass grouped them 3-3-3 to mark which
// stage each triplet belonged to; at a 3px bulb that grouping does not read as
// grouping, it reads as a row someone spaced badly. The stage breakdown lives on
// the stage select, where there is room to say it properly.
//
// Colours are plugs.js's own BANKED/EMPTY, so a bulb here and a pip in the run
// HUD mean the same thing.
// Small. An earlier pass sized these to the largest that would still fit — r 1.9
// at pitch 5.0 — which made a progress readout the loudest thing on the machine,
// competing with the marquee art directly above it. At r 1.1 the same pitch
// leaves a 2.8 gap, so the row reads as inset bulbs rather than a bar of blobs,
// and the eye goes to the cabinet first and the tally second, which is the right
// order for something you only consult when you are deciding where to go.
// A small cluster, not a strip. Sizing these to the hood's width was the mistake
// behind every earlier pass: nine bulbs spread across 48 units need a backing
// dark enough to hold them, and that backing then reads as a black bar ruled
// across the machine with dots printed on it. Pulled into a ~20-unit huddle in
// the middle they read as one object — a little bank of indicator lamps — and
// the recess behind them is small enough to be a detail rather than a stripe.
const PLUG_LIGHT_R = 0.85, PLUG_LIGHT_PITCH = 2.5;
function drawPlugLights(ctx, slot, cabId, cx, cy, w) {
  const stages = stagesForCabinet(cabId);
  const lit = [];
  for (const st of stages) {
    const banked = slot.campaign.plugs[st.id] || [];
    for (let i = 0; i < 3; i++) lit.push(!!banked[i]);
  }
  const pitch = PLUG_LIGHT_PITCH;
  const span = pitch * (lit.length - 1);
  const x0 = cx - span / 2;
  // A shallow recess hugging the cluster. Translucent rather than a solid dark
  // fill, so it darkens whatever chassis colour is under it instead of stamping
  // the same near-black onto a white cabinet and a near-black one alike.
  ctx.save();
  ctx.beginPath();
  platePath(ctx, x0 - PLUG_LIGHT_R - 1.1, cy - PLUG_LIGHT_R - 0.8,
    span + PLUG_LIGHT_R * 2 + 2.2, PLUG_LIGHT_R * 2 + 1.6, PLUG_LIGHT_R + 0.8);
  ctx.fillStyle = 'rgba(6,4,14,0.3)';
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < lit.length; i++) {
    const px = x0 + i * pitch;
    // No bloom. Nine haloed bulbs turned the strip into a light source that
    // outshone the marquee art right above it; at this size the gold fill is
    // already unmistakably "on" against the unlit sockets beside it.
    ctx.beginPath();
    ctx.arc(px, cy, PLUG_LIGHT_R, 0, Math.PI * 2);
    ctx.fillStyle = lit[i] ? '#f6d33c' : 'rgba(10,8,18,0.55)';
    ctx.fill();
    // Unlit sockets carry a pale rim rather than leaning on their fill: at this
    // size a dark disc inside a dark recess is invisible, which turned "nine
    // sockets, three of them lit" into "three gold dots on a bar".
    ctx.lineWidth = 0.28;
    ctx.strokeStyle = lit[i] ? 'rgba(255,248,208,0.45)' : 'rgba(150,155,180,0.5)';
    ctx.stroke();
  }
}

// A boss waiting behind a cabinet is the one thing here that is genuinely NEW
// rather than merely unfinished, so it gets a colour nothing else uses and a
// pulse. Only neon/rhythm/surge ever have one.
function drawBossPip(ctx, cx, cy, r, t) {
  const pulse = 0.72 + 0.28 * Math.sin(t * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = 'rgba(224,72,72,0.35)';
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#e04848';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd0d0';
  ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// The cleared badge: a gold star on the corner of the marquee. Small, and on
// the machine rather than floating above it, because it marks a finished
// cabinet without competing with the marquee art it sits beside.
function drawClearedStar(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.44 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.lineWidth = Math.max(0.5, r * 0.2);
  ctx.strokeStyle = 'rgba(26,16,40,0.45)';
  ctx.stroke();
  ctx.restore();
}

// Full for `hold` seconds, then ramps to nothing over `fade`. Used for the bits
// of hub chrome that have something to say exactly once.
function fadeOut(t, hold, fade) {
  if (t <= hold) return 1;
  return Math.max(0, 1 - (t - hold) / fade);
}

// The "you are here" chevron. A downward wedge rather than an arrow or a ring:
// a wedge points at exactly one pair of feet with no ambiguity about which
// character it belongs to, and it stays legible at 9px across with the ceiling
// lights guttering behind it.
//
// Rounded by stroking the path with round joins before filling it, rather than
// by drawing arcs — three arcTo corners on a 9px triangle collapse into mush,
// where a fat round-joined stroke gives clean radii at any size. The dark pass
// goes down first and wider, so the outline sits outside the gold instead of
// eating into it.
function drawPlayerMarker(ctx, cx, cy, r) {
  const path = (c) => {
    c.beginPath();
    c.moveTo(cx - r * 0.78, cy - r * 0.5);
    c.lineTo(cx + r * 0.78, cy - r * 0.5);
    c.lineTo(cx, cy + r * 0.62);
    c.closePath();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path(ctx);
  ctx.strokeStyle = 'rgba(26,16,40,0.5)';
  ctx.lineWidth = r * 0.8;
  ctx.stroke();
  path(ctx);
  ctx.strokeStyle = '#f6d33c';
  ctx.lineWidth = r * 0.5;
  ctx.stroke();
  ctx.fillStyle = '#f6d33c';
  ctx.fill();
  ctx.restore();
}

export class HubState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; }

  stations() {
    const slot = this.save.slot;
    // The exit sits at the leftmost walkable point (px's own floor is 20 —
    // see update()), so walking off the left edge always lands on it.
    const st = [{ type: 'exit', x: 20, label: 'EXIT' }];
    // Enough bare wall that the exit reads as its own fixture rather than part
    // of the arcade bank — but not the corridor 130 opened up.
    let x = 96;
    for (const cab of CABINETS) {
      const unlocked = cabinetUnlocked(slot, cab.id);
      st.push({ type: 'cabinet', cab, x, unlocked, label: cab.name });
      // 88 apart rather than the original 64. The viewport is 369 units wide,
      // so this frames about four machines at a time instead of six crowding
      // each other — room to look at each one, without the stretch of bare wall
      // between them that 110 opened up.
      x += 88;
    }
    // A plaza between the machines and the service doors. The two banks used to
    // butt together with 40 units between them, which left the crowd nowhere to
    // stand but among the cabinets; this gives them somewhere to spill into.
    x += 96;
    st.push({ type: 'bench', x, label: 'REPAIR BENCH' }); x += 88;
    st.push({ type: 'shop', x, label: "GARY'S LEGALLY DISTINCT PAWN SHOP" }); x += 98;
    st.push({ type: 'arcade', x, label: 'ARCADE CORNER' }); x += 88;
    st.push({ type: 'shelf', x, label: 'TROPHY SHELF' }); x += 88;
    if (totalPlugs(slot) >= 25) { st.push({ type: 'backroom', x, label: 'THE BACK ROOM (YOU DID NOT SEE THIS DOOR)' }); x += 88; }
    if (finaleUnlocked(slot) && !slot.campaign.storyFlags.sawEnding) st.push({ type: 'socket', x, label: 'THE SOCKET' });
    if (slot.campaign.storyFlags.sawEnding) st.push({ type: 'overtime', x, label: 'OVERTIME CABINET' });
    x += 80;
    this.width = Math.max(W, x);
    return st;
  }

  // Midpoints between neighbouring cabinets — the strips of floor the crowd is
  // meant to occupy. Derived from stations() rather than hardcoded, so respacing
  // the concourse moves the crowd with it.
  npcGaps() {
    const cabs = this.stations().filter((st) => st.type === 'cabinet').map((st) => st.x);
    const gaps = [];
    for (let i = 0; i < cabs.length - 1; i++) gaps.push((cabs[i] + cabs[i + 1]) / 2);
    return gaps;
  }

  // Somewhere a hero may come to rest: clear of every station's walk-up radius,
  // and well clear of the exit.
  canLoiter(x) {
    if (x < NPC_MIN_X) return false;
    return !this.stations().some((st) => Math.abs(st.x - x) < NPC_LOITER_CLEAR);
  }

  nearestGap(x) {
    const gaps = this.npcGaps();
    if (!gaps.length) return x;
    return gaps.reduce((best, g) => (Math.abs(g - x) < Math.abs(best - x) ? g : best), gaps[0]);
  }

  enter() {
    Input.setContext('default');
    // Arriving in the food court is the moment you HAVE a hero, so it is the
    // moment transitions may start showing one. Before this — title, difficulty,
    // the intro — the shutter stays a plain sticker.
    setTransitionHero(this.avatarId());
    const returning = this.flow.hubPosition;
    this.px = this.px ?? returning?.px ?? 40;
    this.facing = this.facing ?? returning?.facing ?? 1;
    this.t = 0;
    this.talk = null;
    this.walkTarget = null;
    this.dragging = false;   // press-and-hold is steering the walk target live
    this.dwellNpcId = null;   // which hero the chooser is currently offered for
    this.npcMenuIdx = 0;
    this.npcDwell = 0;
    this.greeted = false;     // has this hero already said hello, this approach
    this.hasMoved = false;   // the controls legend retires once you have walked
    this.movedAt = 0;
    // Every loitering hero gets a gap between two cabinets to inhabit, not an
    // arbitrary stretch of concourse. Standing in front of a machine they hide
    // the screen and the plug lights, and they sit inside the cabinet's own
    // 26-unit walk-up radius — so reaching one meant threading between a hero
    // and a station that both wanted the same patch of floor. There are nine
    // cabinets and eight heroes, which is exactly eight gaps: one each.
    //
    // NPC_ROAM keeps a wander inside its gap. The gap is 88 wide with 48 of
    // cabinet on either side, so 20 units of clear floor each way; 13 leaves a
    // hero's own width of margin before they start overlapping a chassis. They
    // still clip an edge at the extremes, which is the point — they should look
    // like people milling about, not like furniture on marks.
    const gaps = this.npcGaps();
    this.npcActors = HEROES.map((h, i) => {
      const home = gaps.length ? gaps[i % gaps.length] : 155 + i * 120;
      const walking = i % 3 !== 0;
      return {
        id: h.id, home, x: home, facing: i % 2 ? -1 : 1,
        state: walking ? 'walk' : 'idle',
        timer: 0.75 + (i % 4) * 0.33,
        duration: 1, cycles: i, swappable: true, roam: NPC_ROAM,
      };
    });
    // Gary is an actor now rather than a sprite pinned to his shop front. He
    // stood dead centre of the doorway, blocking the one thing that doorway is
    // for, and being a cached toonStandSprite he never moved a muscle. He keeps
    // his own patch beside the shop instead of taking a cabinet gap, on a
    // shorter leash than the rest — he is working.
    //
    // Not swappable: he is not in HEROES, and Relay ignores an initialHeroId it
    // does not recognise, so "play as Gary" would quietly start the run as
    // somebody else. He talks, which is all he ever needed to do — HUB_LINES.gary
    // has been sitting there unreachable since it was written.
    const shop = this.stations().find((st) => st.type === 'shop');
    if (shop) {
      this.npcActors.push({
        id: 'gary', name: 'GARY', home: shop.x + 34, x: shop.x + 34, facing: -1,
        state: 'idle', timer: 1.1, duration: 1, cycles: 2,
        swappable: false, roam: 26,
      });
    }
    Audio.setBank(HUB_THEME);
    // Tapping a station both walks to it and uses it (see update()), and the
    // EXIT sign at the left of the concourse is itself a station — so unlike
    // every other screen, the hub needs no floating ESC chrome for touch.
    Input.setButtons([]);
  }
  exit() {
    this.flow.hubPosition = { px: this.px, facing: this.facing || 1 };
    Input.setButtons([]);
  }

  // Camera follows the player, clamped to the concourse — shared by update()
  // (to turn a tap's screen x back into world x) and draw() (to place it).
  camX() { return Math.max(0, Math.min(this.width - HUB_VIEW_W, this.px - HUB_VIEW_W / 2)); }

  update(dt) {
    this.t += dt;
    this.updateNpcs(dt);
    const st = this.stations();
    if (Input.held('left')) { this.px -= 90 * dt; this.facing = -1; this.walkTarget = null; }
    if (Input.held('right')) { this.px += 90 * dt; this.facing = 1; this.walkTarget = null; }
    if (!this.hasMoved && (Input.held('left') || Input.held('right') || this.walkTarget != null)) this.hasMoved = true;
    if (this.hasMoved) this.movedAt += dt;
    // Tap/click anywhere (not a virtual button) to walk there — mouse and
    // touch alike, Input.pointer fires for both. Landing on a station or NPC
    // only walks: arriving does not auto-enter/auto-talk, because a tap that
    // lands on a cabinet while you're still 200px away shouldn't commit you
    // to it sight unseen. Confirming also needs the tap to land near YOU
    // (onSelf below), not just near the station — the exit door's hit radius
    // reaches well past its own art (spawn starts right beside it), so without
    // that a tap meant to walk a few steps within that same zone would read as
    // "confirm exit" purely because the door happened to be nearby. A plain
    // tap on open floor, anywhere, always just walks to that exact spot.
    if (Input.pressed('pointer') && !Input.buttonAt(Input.pointer.x, Input.pointer.y)) {
      // A tap that lands on one of the chooser's chips takes that option and
      // nothing else — checked first, because the chips hang over open floor and
      // would otherwise read as "walk there".
      const chipNpc = this.nearNpc && !this.near ? this.nearNpc : null;
      if (chipNpc) {
        const wx = Input.pointer.x / HUB_ZOOM + this.camX();
        const wy = Input.pointer.y / HUB_ZOOM + HUB_CAM_Y;
        const chipOpts = npcMenuFor(chipNpc);
        for (let i = 0; i < chipOpts.length; i++) {
          const r = npcChipRect(chipNpc.x, i, chipOpts.length);
          if (wx >= r.x - 4 && wx <= r.x + r.w + 4 && wy >= r.y - 3 && wy <= r.y + r.h + 3) {
            this.npcMenuIdx = i;
            this.chooseNpc(chipNpc);
            Input.endFrame();
            return;
          }
        }
      }
      const worldX = Input.pointer.x / HUB_ZOOM + this.camX();
      const stationHit = st.find((s) => Math.abs(s.x - worldX) < 22);
      const npcHit = this.npcs().find((n) => Math.abs(n.x - worldX) < 14);
      // An NPC's wander can drift it right next to a station (the food court
      // is cramped); whichever is actually closer to the tap wins, so tapping
      // dead-on a loitering hero doesn't get swallowed by the counter behind them.
      const npcCloser = stationHit && npcHit && Math.abs(npcHit.x - worldX) < Math.abs(stationHit.x - worldX);
      const tappedStation = stationHit && !npcCloser ? stationHit : null;
      const tappedNpc = npcHit && (!stationHit || npcCloser) ? npcHit : null;
      const onSelf = Math.abs(worldX - this.px) < 20;
      if (tappedStation && onSelf && Math.abs(tappedStation.x - this.px) < 26) this.interact(tappedStation);
      // Tapping a hero does NOT act on them. It used to run chooseNpc, which
      // with TALK selected just replayed their line — a second, invisible way to
      // do a thing the chips already do visibly, and the only one that could
      // fire by accident while you were trying to walk. The chips are the whole
      // interface now; a tap on the hero themselves falls through and walks.
      else {
        const target = tappedStation ? tappedStation.x : tappedNpc ? tappedNpc.x : worldX;
        this.walkTarget = Math.max(20, Math.min(this.width - 20, target));
        this.dragging = true;
      }
    }
    // Press-and-hold steers live: once the initial touch-down was spent
    // walking rather than confirming (interact/talk stay one-shot, on the
    // press edge only, above), the SAME finger staying down keeps the
    // destination glued to wherever it currently is — a drag across the
    // concourse, not one fixed spot chosen the instant it landed.
    if (!Input.held('pointer')) {
      this.dragging = false;
    } else if (this.dragging && !Input.pressed('pointer')) {
      const worldX = Input.pointer.x / HUB_ZOOM + this.camX();
      this.walkTarget = Math.max(20, Math.min(this.width - 20, worldX));
    }
    if (this.walkTarget != null) {
      const d = this.walkTarget - this.px;
      if (Math.abs(d) < 3) this.walkTarget = null;
      else { this.facing = d > 0 ? 1 : -1; this.px += Math.sign(d) * Math.min(Math.abs(d), 90 * dt); }
    }
    this.px = Math.max(20, Math.min(this.width - 20, this.px));
    const near = st.find((s) => Math.abs(s.x - this.px) < 26);
    this.near = near;
    // Talk to NPC heroes: press down, or just stand alongside one for a second —
    // same line either way. The dwell timer resets whenever the adjacent NPC
    // changes (including to none), so lingering only ever fires the auto-talk
    // once per visit.
    const npc = this.npcs().find((n) => Math.abs(n.x - this.px) < 18);
    this.nearNpc = npc;
    // Declared here, ABOVE its first use in the confirm test below. It was
    // originally left further down, which put it in the temporal dead zone: the
    // `Input.pressed('jump') && !chooser` arm threw a ReferenceError on every
    // Space press, and because the throw escaped update() before
    // Input.endFrame() ran, the pressed-set was never cleared — so 'jump' stayed
    // held, the throw repeated every frame, and the whole hub went unresponsive.
    // A one-frame error became a permanent lock purely through the missed
    // endFrame().
    //
    // The chooser moves on ArrowUp/ArrowDown — which in this context are the
    // 'jump' and 'duck' actions, NOT 'up'/'down'. Input.actionForKey only mints
    // 'up'/'down' inside the 'menu' context, and the hub runs 'default'
    // (see enter()), so binding to those would have made the chips unreachable.
    const chooser = !!npc && !near;
    // Confirm is contextual: a station if you are standing at one, otherwise the
    // hero beside you. Stations win — their hit radius is wider, and "enter the
    // cabinet I am standing at" is never the surprising reading.
    // 'jump' doubles as confirm for gamepad face buttons, but while the chooser
    // is up ArrowUp is steering it — so it must not also fire the selection.
    if (Input.pressed('confirm') || (Input.pressed('jump') && !chooser)) {
      if (near) this.interact(near);
      else if (npc) this.chooseNpc(npc);
    }
    // The chooser resets to TALK whenever the hero beside you changes, so it
    // never opens already pointing at SWAP on someone you just walked up to.
    if ((npc?.id ?? null) !== this.dwellNpcId) {
      this.dwellNpcId = npc?.id ?? null;
      this.npcMenuIdx = 0;
      this.npcDwell = 0;
      this.greeted = false;
    }
    // Heroes still greet you unprompted the first time you stand with them —
    // that ambience got removed along with the old dwell-to-talk binding, which
    // it was tangled up with, and the concourse went quiet. It is not redundant
    // with the TALK chip: talkTo() walks HUB_LINES in order (slot.hub.npcSeen),
    // so the greeting is their opener and the chip is everything after it.
    if (npc) {
      this.npcDwell += dt;
      if (!this.greeted && this.npcDwell >= 0.8) { this.greeted = true; this.talkTo(npc); }
    }
    if (chooser) {
      const opts = npcMenuFor(npc);
      if (this.npcMenuIdx >= opts.length) this.npcMenuIdx = 0;
      if (opts.length > 1) {
        if (Input.pressed('jump')) { this.npcMenuIdx = (this.npcMenuIdx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
        if (Input.pressed('duck')) { this.npcMenuIdx = (this.npcMenuIdx + 1) % opts.length; Audio.sfx('ui'); }
      }
    }
    if (this.talk && (this.talk.t -= dt) <= 0) this.talk = null;
    if (Input.pressed('back')) this.flow.toTitle();
    if (Input.pressed('mute')) { this.save.settings.muted = !this.save.settings.muted; Audio.setMuted(this.save.settings.muted); }
    Input.endFrame();
  }

  interact(st) {
    Audio.sfx('uiConfirm');
    const slot = this.save.slot;
    if (st.type === 'cabinet') {
      if (!st.unlocked) {
        this.talk = { text: `NEEDS ${UNLOCKS[st.cab.id]} PLUGS. YOU HAVE ${totalPlugs(slot)}. THE MATH IS SINCERE.`, t: 3, who: null };
        return;
      }
      this.flow.openCabinet(st.cab);
    } else if (st.type === 'exit') this.flow.toTitle();
    else if (st.type === 'bench') this.flow.openBench();
    else if (st.type === 'shop') this.flow.openShop();
    else if (st.type === 'arcade') this.flow.openArcade();
    else if (st.type === 'socket') this.flow.startFinale();
    else if (st.type === 'overtime') this.flow.startOvertime();
    else if (st.type === 'backroom') this.flow.startOvertime((Date.now() & 0xfffff) ^ 0xbac);
    else if (st.type === 'shelf') {
      const toasters = Object.values(slot.campaign.plugs).filter((p) => p[2]).length;
      const sRanks = Object.values(slot.campaign.ranks).filter((r) => r === 'S' || r === 'CONCERNING').length;
      this.talk = { text: `TOASTERS: ${toasters}/27. S RANKS: ${sRanks}. DEATHS: ${slot.stats.deaths}. THE SHELF IS PROUD-ADJACENT.`, t: 4, who: null };
    }
  }

  talkTo(npc) {
    const lines = HUB_LINES[npc.id];
    const slot = this.save.slot;
    const seen = slot.hub.npcSeen[npc.id] || 0;
    this.talk = { text: lines[seen % lines.length], t: 3.2, who: npc.id };
    slot.hub.npcSeen[npc.id] = seen + 1;
    Audio.sfx('ui');
  }

  // Whoever the player is currently wearing. Gary shows up on the coupon mod;
  // otherwise it's the last team's lead, and Lorenzo before there is one.
  avatarId() {
    const slot = this.save.slot;
    if (slot.mods.equipped.includes('coupon')) return 'gary';
    // Flow.heroId() is the single source: a hub swap, else whoever finished the
    // last run, else Lorenzo. Gary is deliberately NOT pushed through it — the
    // coupon mod is a hub costume, and Relay ignores an initialHeroId that is not
    // in HEROES anyway, so a Gary run would just draw at random.
    return heroIdFor(this.flow);
  }

  // Whichever chip is lit.
  chooseNpc(npc) {
    const opts = npcMenuFor(npc);
    const pick = opts[Math.min(this.npcMenuIdx || 0, opts.length - 1)];
    if (pick.id === 'swap') this.swapTo(npc);
    else this.talkTo(npc);
  }

  // Take over the hero you are standing next to. This deliberately changes ONLY
  // who walks the concourse — the run team is still chosen at the cabinet, and
  // silently re-casting a run from the hub would be a surprise you could not see
  // coming from here.
  //
  // The two trade places rather than the crowd simply gaining a member: whoever
  // you were steps into the spot you were standing in, and you step into theirs.
  // npcs() filters the avatar out of the crowd by id, so both halves of that
  // follow from setting one field — but without moving them, the hero you left
  // would pop back to a home position several strides away.
  swapTo(npc) {
    const prev = this.avatarId();
    if (prev === npc.id) return;
    const prevX = this.px;
    this.flow.hubAvatar = npc.id;
    // Point the shutter cameo at whoever you just became, so walking into a
    // cabinet shows the hero you are about to play rather than a stranger.
    setTransitionHero(npc.id);
    const actor = (this.npcActors || []).find((a) => a.id === prev);
    if (actor) {
      // They appear exactly where you were standing, then drift to the nearest
      // gap. Handing them prevX as a permanent home meant that swapping while
      // stood at a cabinet parked someone in front of it for the rest of the
      // session — the one thing the gap placement exists to prevent.
      actor.x = prevX;
      actor.home = this.nearestGap(prevX);
      actor.state = 'idle';
      actor.timer = 1.4;
      actor.facing = npc.x < prevX ? -1 : 1;
    }
    this.px = npc.x;
    this.facing = npc.facing || 1;
    // Standing where they stood would otherwise re-trigger the dwell auto-talk
    // against whoever is now nearest, one frame after the swap.
    this.dwellNpcId = null;
    this.npcMenuIdx = 0;
    this.npcDwell = 0;
    this.greeted = true;      // you just became them; no self-greeting
    this.talk = null;
    Audio.sfx('power');
  }

  npcs() {
    // Heroes loiter in the hub; DUST DEVIL cleans impossible things. The hero
    // the player is currently wearing stays out of the crowd -- one Lorenzo.
    const actors = this.npcActors || HEROES.map((h, i) => ({ id: h.id, x: 110 + i * 90 + (i % 3) * 22, facing: 1, state: 'idle' }));
    const avatar = this.avatarId();
    return actors.filter((n) => n.id !== avatar);
  }

  updateNpcs(dt) {
    for (const n of this.npcs()) {
      // Conversation wins over wandering, and the speaker turns toward the
      // player instead of strolling away halfway through a punchline.
      if (this.talk?.who === n.id) {
        n.state = 'idle';
        n.facing = this.px < n.x ? -1 : 1;
        n.timer = Math.max(n.timer, 0.35);
        continue;
      }
      n.timer -= dt;
      const roam = n.roam || NPC_ROAM;
      if (n.state === 'walk') {
        n.x += n.facing * 10 * dt;
        // Turn around at the edge of their range instead of stopping there.
        // Stopping on the limit made the limit itself a loitering spot, which is
        // how heroes ended up parked at arbitrary points along the concourse.
        if (Math.abs(n.x - n.home) >= roam) n.facing = n.x > n.home ? -1 : 1;
        // Never drift back toward the way out. The exit's own walk-up radius
        // reaches well past its art, so a hero idling near it competes with the
        // one station you cannot afford to mis-trigger.
        if (n.x < NPC_MIN_X) { n.x = NPC_MIN_X; n.facing = 1; }
      }
      if (n.timer > 0) continue;
      n.cycles++;
      if (n.state === 'walk') {
        // Walking anywhere is fine — crossing in front of a machine is what a
        // concourse looks like. STOPPING in front of one is not: it hides the
        // screen and it sits inside the station's own walk-up radius, so
        // reaching the machine means contesting the same patch of floor. If the
        // walk ran out somewhere unsuitable, keep going rather than settle.
        if (!this.canLoiter(n.x)) { n.timer = 0.5 + (n.cycles % 3) * 0.2; continue; }
        n.state = 'idle'; n.timer = 0.8 + (n.cycles % 4) * 0.25;
      } else if (n.state === 'hop') {
        n.state = 'idle'; n.timer = 0.7 + (n.cycles % 3) * 0.3;
      } else if (n.cycles % 4 === 0) {
        n.state = 'hop'; n.duration = 0.5; n.timer = n.duration;
      } else {
        n.state = 'walk';
        // Direction: carry on, unless they are near the edge of their range.
        //
        // The old rule steered them home the moment they were FIVE units off
        // their spot, which is a homing spring — every new walk pointed back, so
        // no matter how wide their patch was nobody could actually cross it.
        // Measured over 30s, most heroes covered 64-75 units of a 124-unit
        // range, i.e. less than a single cabinet pitch, which is why they read
        // as glued to one machine.
        //
        // Now the pull only kicks in past 65% of the range, and otherwise they
        // keep whatever heading they had (with the odd about-turn), so several
        // walks chain into a real journey down the concourse.
        const off = n.x - n.home;
        if (Math.abs(off) > roam * 0.65) n.facing = off > 0 ? -1 : 1;
        else if (n.cycles % 3 === 0) n.facing = -n.facing;
        n.timer = 1.6 + (n.cycles % 4) * 0.55;
      }
    }
  }

  draw(ctx) {
    const slot = this.save.slot;
    const act = actForSlot(slot);
    const cam = this.camX();
    ctx.fillStyle = '#14101c';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.scale(HUB_ZOOM, HUB_ZOOM);
    ctx.translate(0, -HUB_CAM_Y);
    // back wall + floor
    ctx.fillStyle = '#241c30';
    ctx.fillRect(0, HUB_WALL_Y0, HUB_VIEW_W, HUB_WALL_Y1 - HUB_WALL_Y0);
    ctx.fillStyle = '#38304a';
    ctx.fillRect(0, HUB_WALL_Y1, HUB_VIEW_W, 6);
    ctx.fillStyle = '#1c1626';
    ctx.fillRect(0, HUB_WALL_Y1 + 6, HUB_VIEW_W, H - HUB_WALL_Y1 - 6);
    // checkered food-court floor
    for (let y = 0; y < 3; y++) {
      for (let x = -((cam) % 32); x < HUB_VIEW_W; x += 32) {
        ctx.fillStyle = (Math.floor((x + cam) / 32) + y) % 2 === 0 ? '#241c30' : '#1c1626';
        ctx.fillRect(Math.round(x), HUB_WALL_Y1 + 10 + y * 22, 32, 22);
      }
    }
    // Wall dressing, drawn straight onto the wall the block above just laid
    // down (hence base:false) and before the stations, so a cabinet stands in
    // front of its own poster.
    //
    // How lit any of it is falls out of which ceiling fixtures are working, in
    // SCREEN space: the lights parallax at 0.9 of the camera, so their world
    // positions drift and only where they land on screen means anything. That
    // makes the left of an early-act concourse readable and the far end fade
    // out, and it is why the dressing is worth drawing at all — the detail is
    // painted once and the lighting decides how much of it you get.
    const litXs = [];
    for (let i = 0; i < act * 3 && i < 8; i++) litXs.push(i * 130 - cam * 0.9 + 13);
    const wallLit = (sx) => wallLitFrom(sx, litXs);
    // Room furniture first (the menu board), then ONE poster per cabinet.
    for (const bay of hubWallBays(this.stations())) {
      const bx = bay.x - cam;
      if (bx + BAY_W < 0 || bx > HUB_VIEW_W) continue;
      drawWallBay(ctx, bx, HUB_WALL_Y0, BAY_W, HUB_WALL_Y1 - HUB_WALL_Y0, bay.id, {
        t: this.t, seed: bay.x, lit: wallLit, base: false,
      });
    }
    // A poster hangs above the machine it advertises, centred on it — that is
    // the whole placement rule, and it is why there is exactly one. Tiled three
    // to a span of wall they read as wallpaper; hung one per cabinet they read
    // as belonging to something. The tilt alternates off the station's own x so
    // the row is not a set of perfectly level rectangles.
    for (const s of this.stations()) {
      if (s.type !== 'cabinet') continue;
      const sx = s.x - cam;
      if (sx < -POSTER_W || sx > HUB_VIEW_W + POSTER_W) continue;
      const k = Math.round(s.x / 64);
      drawPoster(ctx, sx, CAB_Y - POSTER_H - 12, POSTER_W, POSTER_H, {
        pal: palFor(s.cab, s.unlocked),
        tilt: (k % 2 ? 1 : -1) * (0.03 + (k % 3) * 0.012),
        torn: k % 3 === 1,
        lit: wallLit(sx),
      });
    }
    // ceiling lights: on per act, flickering because the place is falling apart.
    // Drawn at y 46 rather than the ceiling's actual y 34 — HUB_ZOOM's floor pin
    // crops everything above world y ~44 off the top of the frame, so a light
    // fixture at the real ceiling height would flicker invisibly. y 46 is as
    // close to that crop line as fits; now that the status readout has moved
    // down to the floor cluster, nothing else contests the top of the screen.
    // The glow's reach is stretched to match (down to y 170, was 140) so the
    // extra headroom reads as more of the back wall getting lit, not just a
    // taller light fixture.
    for (let i = 0; i < 8; i++) {
      const lx = Math.round(i * 130 - cam * 0.9);
      const on = i < act * 3;
      drawCeilingLight(ctx, lx, HUB_CEIL_Y, on ? lightFlicker(this.t, i, this.save.settings.reducedFlashing) : 0);
    }
    // Light pooling: every lit machine throws its screen colour onto the tiles
    // in front of it. Drawn before the stations so each cabinet stands ON its
    // own pool. Nine lit cabinets over unlit floor was the single biggest
    // reason they read as pasted onto the scene rather than standing in it.
    for (const s of this.stations()) {
      if (s.type !== 'cabinet' || !s.unlocked) continue;
      const x = Math.round(s.x - cam);
      if (x < -80 || x > HUB_VIEW_W + 40) continue;
      const g = ctx.createLinearGradient(0, HUB_FLOOR_PIN_Y, 0, HUB_FLOOR_PIN_Y + 34);
      g.addColorStop(0, s.cab.sky[0]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = g;
      // Splayed: a pool of light is wider the further it falls from its source.
      ctx.beginPath();
      ctx.moveTo(x - CAB_W * 0.5, HUB_FLOOR_PIN_Y);
      ctx.lineTo(x + CAB_W * 0.5, HUB_FLOOR_PIN_Y);
      ctx.lineTo(x + CAB_W * 0.85, HUB_FLOOR_PIN_Y + 34);
      ctx.lineTo(x - CAB_W * 0.85, HUB_FLOOR_PIN_Y + 34);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // stations
    for (const s of this.stations()) {
      const x = Math.round(s.x - cam);
      if (x < -80 || x > HUB_VIEW_W + 40) continue;
      if (s.type === 'cabinet') {
        const pal = palFor(s.cab, s.unlocked);
        drawCabinetShell(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, pal);
        // The attract screen carries its own scanlines; the bright bar rolling
        // down it runs on the hub's clock, so it is drawn here, over them.
        const scr = drawCabinetScreen(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, pal, undefined, pal.lit ? cabinetScreenArt(s.cab, this.t, pal.seed) : null);
        if (scr) {
          drawScreenSweep(ctx, scr, this.t, pal.seed);
        } else {
          // Locked: the machine is unplugged rather than absent, so every few
          // seconds its dead screen crackles and throws a spark.
          drawDeadScreen(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, this.t, pal.seed, this.save.settings.reducedFlashing);
        }
        // The corner badge used to be one gold star for `cleared` — every stage's
        // MISSION plug banked. That flag is doing two unrelated jobs: on six
        // cabinets it means "missions done", and on neon/rhythm/surge it is
        // exactly what opens the boss. Worse, once the boss was beaten the flag
        // stayed true, so "a boss is waiting" and "nothing left here" drew
        // identically. Three states, three marks:
        if (s.unlocked) {
          if (bossAvailable(slot, s.cab.id)) drawBossPip(ctx, x + CAB_W * 0.4, CAB_Y + CAB_H * 0.06, CAB_W * 0.06, this.t);
          else if (slot.campaign.bossesDown[s.cab.id]) drawClearedStar(ctx, x + CAB_W * 0.4, CAB_Y + CAB_H * 0.05, CAB_W * 0.115);
          // ...and the nine lights carry "how much is left", which is the
          // question the star was being asked to answer and could not.
          drawPlugLights(ctx, slot, s.cab.id, x, CAB_Y + CAB_H * 0.215, CAB_W);
        }
      } else if (s.type === 'socket') {
        // Not a door and not a cabinet: THE SOCKET is a hole in the wall, and
        // the whole joke is that it looks like one.
        ctx.fillStyle = '#f6d33c';
        ctx.fillRect(x - 22, 130, 44, 62);
        ctx.fillStyle = '#0b0b14';
        ctx.fillRect(x - 6, 146, 4, 8); ctx.fillRect(x + 2, 146, 4, 8);
      } else if (s.type === 'overtime') {
        // Nominally a cabinet, so it gets the cabinet: same machine, violet
        // chassis, and a screen showing nothing at all.
        drawCabinetShell(ctx, x - CAB_W / 2, CAB_Y, CAB_W, CAB_H, OVERTIME_PALETTE);
      } else if (DOOR_PALETTES[s.type]) {
        drawDoor(ctx, x - DOOR_W / 2, DOOR_Y, DOOR_W, DOOR_H, DOOR_PALETTES[s.type], this.t, this.save.settings.reducedFlashing);
      }
    }
    // NPC heroes
    for (const n of this.npcs()) {
      const x = Math.round(n.x - cam);
      if (x < -20 || x > HUB_VIEW_W + 20) continue;
      // Hop height and contact shadow both ride NPC_H, so scaling the cast
      // doesn't leave them hopping a token amount over a pinprick of shade.
      const hop = n.state === 'hop' ? Math.sin(Math.PI * (1 - n.timer / n.duration)) * NPC_H * 0.26 : 0;
      ctx.fillStyle = 'rgba(4,3,9,0.28)';
      ctx.beginPath(); ctx.ellipse(x, HUB_FLOOR_PIN_Y, NPC_H * (n.state === 'hop' ? 0.26 : 0.37), NPC_H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      drawToon(ctx, n.id, {
        kind: n.state === 'walk' ? 'run' : n.state === 'hop' ? 'jump' : 'idle',
        phase: (this.t * 1.25 + n.cycles * 0.17) % 1,
        time: this.t + n.cycles * 0.41,
        grounded: n.state !== 'hop',
        vy: n.state === 'hop' ? -40 : 0,
        facing: n.facing || 1,
      }, x, HUB_FLOOR_PIN_Y - hop, NPC_H);
    }
    // THE DUST DEVIL comes through occasionally, cleaning something (which
    // surface varies). ~9s of every ~48, unannounced, then gone. Nobody
    // addresses this.
    const ddCyc = (this.t + 39) % 48; // first visit ~9s after entering
    if (ddCyc < 9) {
      const pass = dustDevilPass(Math.floor((this.t + 39) / 48), act);
      const p = ddCyc / 9;
      // Screen-relative crossing — whenever it visits, you see it — but with a
      // scrub laid over the traverse that's deep enough to briefly reverse, so
      // it works a square twice before moving on instead of gliding like a
      // cardboard cutout on a string.
      const travel = (HUB_VIEW_W + 60) * p + Math.sin(p * Math.PI * 7) * 16;
      const ddX = Math.round(pass.dir > 0 ? travel - 40 : HUB_VIEW_W + 20 - travel);
      // Brush head on a surface either way. Floor pass: the same line the cast
      // stands on. Ceiling pass: the line the light housings bolt to, which is
      // the only thing in the frame that says where the ceiling actually IS —
      // the top of the wall is a crop, not a plane, so hanging below it just
      // reads as floating again. The vertical flip puts the head at ddY and
      // leaves the handle dangling.
      const ddY = pass.onCeiling ? HUB_CEIL_Y - 4 : HUB_FLOOR_PIN_Y + pass.depth - DD_H;
      ctx.save();
      ctx.globalAlpha = Math.min(1, ddCyc * 1.5, (9 - ddCyc) * 1.5); // slips in, slips out
      if (!pass.onCeiling) {
        // Contact shadow in the cast's voice. Wider than the brush head on
        // purpose — the head is opaque and sits flat on its own shadow, so an
        // ellipse that only matched it would be a shadow nobody can see.
        ctx.fillStyle = 'rgba(4,3,9,0.28)';
        ctx.beginPath();
        ctx.ellipse(ddX + DD_W * 0.42, HUB_FLOOR_PIN_Y + pass.depth, DD_W * 0.55, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Mirrored about its own box so the cord always trails the direction of
      // travel; the ceiling pass adds the vertical flip that turns it over.
      if (pass.dir > 0 || pass.onCeiling) {
        ctx.translate(ddX + DD_W / 2, ddY + DD_H / 2);
        ctx.scale(pass.dir > 0 ? -1 : 1, pass.onCeiling ? -1 : 1);
        ctx.translate(-(ddX + DD_W / 2), -(ddY + DD_H / 2));
      }
      drawProp(ctx, 'dustdevil', ddX, ddY, DD_W, DD_H);
      ctx.restore();
    }
    // The chooser rides above whichever hero you are beside, and only when no
    // station is also in range — standing between a cabinet and a loitering
    // hero, ENTER belongs to the cabinet, so offering chips you cannot pick
    // would be a lie.
    if (this.nearNpc && !this.near) drawNpcChips(ctx, this.nearNpc.x, cam, this.npcMenuIdx || 0, npcMenuFor(this.nearNpc));
    // player walks
    const heroId = this.avatarId();
    const moving = Input.held('left') || Input.held('right') || this.walkTarget != null;
    // Which one is you. Being 8 units taller than the crowd is not an answer to
    // that question — in a concourse with three heroes loitering by the same
    // door it is invisible. So the hero you are driving gets a marker over their
    // head and a heavier contact shadow under their feet, in the same gold the
    // walk-up prompt uses, so all the "this is about you" chrome reads as one
    // voice.
    const pxs = Math.round(this.px - cam);
    ctx.fillStyle = 'rgba(4,3,9,0.4)';
    ctx.beginPath(); ctx.ellipse(pxs, HUB_FLOOR_PIN_Y, PLAYER_H * 0.4, PLAYER_H * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    drawToon(ctx, heroId, {
      kind: moving ? 'run' : 'idle',
      phase: (this.t * 1.6) % 1,
      time: this.t,
      grounded: true,
      facing: this.facing || 1,
    }, pxs, HUB_FLOOR_PIN_Y, PLAYER_H);
    drawPlayerMarker(ctx, pxs, HUB_FLOOR_PIN_Y - PLAYER_H - 10 + Math.sin(this.t * 2.6) * 1.3, 3.2);
    ctx.restore();
    // The bottom of the screen used to carry four stacked lines every frame:
    // the contextual prompt, the location name, a PLUGS/COINS/ACT readout and a
    // controls legend. Only the first of those answers a question you are
    // actually asking while you walk around.
    //
    // The other three were saying things once and then repeating them forever:
    // you learn where you are on arrival, and the legend's verbs are already in
    // the prompt ("- ENTER TO USE" IS "ENTER USE"), so restating them generically
    // was the same sentence twice. Now the name and the legend introduce
    // themselves and get out of the way, and the resources sit quietly in the
    // corner where status belongs rather than in the message stack.
    if (this.near) {
      // A locked cabinet gets no verb. "ENTER TO USE" on a machine that will
      // refuse you is an instruction that does not work — the line's whole job
      // is to say what this thing is and whether you can act on it, so a locked
      // one states its price instead, in the muted colour rather than the gold
      // the hub uses for "you can do this right now".
      const locked = this.near.type === 'cabinet' && !this.near.unlocked;
      if (locked) {
        drawTextCentered(ctx, `${this.near.label} - LOCKED: ${UNLOCKS[this.near.cab.id]} PLUGS`,
          W / 2, H - 30, '#8a8a98');
      } else {
        const verb = this.near.type === 'exit'
          ? (Input.usingTouch ? 'TAP TO LEAVE' : 'ENTER TO LEAVE')
          : (Input.usingTouch ? 'TAP TO ENTER' : 'ENTER TO USE');
        drawTextCentered(ctx, `${this.near.label} - ${verb}`, W / 2, H - 30, '#f6d33c');
      }
    } else if (this.nearNpc) {
      // Touch talks the same way it enters a station — tap them again once
      // you're standing alongside (update()'s tappedNpc branch); DOWN is the
      // keyboard's own way in, not something touch has a key for.
      // Just the name: the chips over their head already say what the two
      // options are, so repeating them down here would be the same sentence in
      // two places — which is exactly what the rest of this row was cut for.
      drawTextCentered(ctx, this.nearNpc.name || HERO_BY_ID[this.nearNpc.id].short, W / 2, H - 30, '#48e0c8');
    }
    // One status row along the very bottom: where you are on the left, what you
    // have on the right. The location name used to be a fading title card, but a
    // place label is not an announcement — it wants to just be there, quietly,
    // the way a sign on a wall is. Sitting it on the same baseline as the
    // resources turns three stacked lines into one row that reads left to right.
    drawText(ctx, 'THE LAST FUNCTIONING FOOD COURT', 8, H - 11, '#3f8a80', 0.85);
    const coins = `COINS ${formatCoins(slot.coins)}`;
    const plugs = `PLUGS ${totalPlugs(slot)}/${MAX_PLUGS}`;
    const coinsW = textWidth(coins, 0.85);
    drawText(ctx, coins, W - 8 - coinsW, H - 11, '#f6d33c', 0.85);
    drawText(ctx, plugs, W - 20 - coinsW - textWidth(plugs, 0.85), H - 11, '#48e0c8', 0.85);

    // The legend still introduces itself and leaves — it is the one thing here
    // that genuinely has nothing to say after you have read it once. It takes
    // the slot above the prompt now that the location name has moved out of it.
    const legendA = this.hasMoved ? fadeOut(this.movedAt, 0.35, 0.5) : fadeOut(this.t, 7, 1);
    if (legendA > 0) {
      ctx.save();
      ctx.globalAlpha = legendA;
      drawTextCentered(ctx, Input.usingTouch
        ? 'TAP TO WALK, TAP AGAIN TO ENTER'
        : 'LEFT/RIGHT WALK   UP/DOWN PICK   ENTER CONFIRM', W / 2, H - 48, '#8a8a98', 0.9);
      ctx.restore();
    }
    // The same speech card the stages use — portrait, name header, words —
    // rather than a "NAME: line" of centred text. Talking to a hero in the food
    // court is the same act as a hero talking mid-stage, so it gets the same
    // chrome; the null-speaker path handles the cabinet and shelf notes.
    if (this.talk) drawSpeech(ctx, this.talk, { light: true });
    // No touch buttons to draw at all: EXIT is a station like any other.
  }
}

// --------------------------------------------------------------------------
function listMenu(state, opts) {
  if (Input.pressed('down') || Input.pressed('right')) { state.idx = (state.idx + 1) % opts.length; Audio.sfx('ui'); }
  if (Input.pressed('up') || Input.pressed('left')) { state.idx = (state.idx + opts.length - 1) % opts.length; Audio.sfx('ui'); }
  if (Input.pressed('confirm')) { Audio.sfx('uiConfirm'); return opts[state.idx]; }
  if (Input.pressed('pointer')) {
    const i = Math.floor((Input.pointer.y - state.listY) / state.rowH);
    if (i >= 0 && i < opts.length) {
      if (state.idx === i) { Audio.sfx('uiConfirm'); return opts[i]; }
      state.idx = i; Audio.sfx('ui');
    }
  }
  return null;
}

// The cursor band behind the selected row, and the y its lettering sits on.
// listMenu hit-tests the whole pitch, so the band is drawn at exactly that
// pitch and the text is centred in it: what the finger finds, what the eye
// sees, and where the words are, all off the same two numbers. `lines` is how
// many lines of text the row stacks — a stage row carries its blurb underneath
// — and `dy` the gap between them, so the block centres rather than the first
// line of it. Rows reserve the space whether or not they use it, or the labels
// on the one-line rows would sit lower than the labels on their neighbours.
function drawSelRow(ctx, state, i, x0) {
  drawMenuRow(ctx, x0 - 12, state.listY + i * state.rowH + 1, W - (x0 - 12) * 2, state.rowH - 2);
}
function rowTextY(state, i, lines = 1, dy = 0) {
  return textYForMid(state.listY + i * state.rowH + state.rowH / 2) - (lines - 1) * dy / 2;
}

// Every hub sub-menu is listMenu-driven: arrow keys or a tap-to-select,
// tap-again-to-confirm, spelled out at the bottom of the screen.
function drawMenuHint(ctx, extra) {
  const text = Input.usingTouch
    ? `TAP SELECT   TAP AGAIN ${extra || 'CONFIRM'}   ESC BACK`
    : `UP/DOWN SELECT   ENTER ${extra || 'CONFIRM'}   ESC BACK`;
  drawText(ctx, text, 12, H - 13, '#5a5a68', HINT_S);
}
// The status strip along the bottom of every hub menu. Nudged up from scale 1
// because on a phone the canvas is barely 2x its 480x270 design size, and a
// 8px em there lands under 10 CSS px — legible on a monitor, guesswork in a
// hand. Everything on that strip moves together so the row stays one line.
const HINT_S = 1.1;

// Mission blurbs used to be cut at a fixed character count, which clipped the
// longer ones mid-word even when they had room left. Measure instead, and only
// trim when the string genuinely overflows.
function fitText(str, maxWidth, scale = 1, style = 'ui') {
  const s = String(str);
  if (textWidth(s, scale, style) <= maxWidth) return s;
  let out = s;
  while (out.length > 1 && textWidth(out + '...', scale, style) > maxWidth) out = out.slice(0, -1);
  return out.replace(/[\s.,]+$/, '') + '...';
}

// Stage select type sizes. This screen is the one a player reads standing up
// with a phone at arm's length, and it had the room to spare: three stages and
// a BACK row used barely half the panel, so the list was small AND surrounded
// by emptiness. Row labels and the rank letter ride the same scale so a row
// reads as one line of text with a letter parked at the end of it.
const ROW_S = 1.4, DESC_S = 1.1, PIP = 13;
// Rows grow to fill whatever the option count leaves free rather than sitting
// at a fixed pitch: three stages plus BACK get a generous 48 — which on a phone
// is a tap target around a centimetre tall, since listMenu hit-tests the whole
// pitch and not just the glyphs — and the fully loaded six-row case (boss and
// corrupted mode both unlocked) tightens to 30 rather than running off the
// bottom of the panel.
const LIST_TOP = 74, LIST_BOTTOM = 250, ROW_MIN = 28, ROW_MAX = 48;

export class StageSelectState {
  constructor({ save, cab, flow }) { this.save = save; this.cab = cab; this.flow = flow; this.listY = LIST_TOP; this.rowH = ROW_MAX; }
  // The option list always ends in a BACK row (see options() below), so the
  // floating corner ESC button would just be a second, disconnected way to do
  // the same thing — drop it and let the list carry it.
  enter() {
    this.corrupt = null;
    const opts = this.options();
    this.rowH = Math.max(ROW_MIN, Math.min(ROW_MAX, (LIST_BOTTOM - LIST_TOP) / opts.length));
    // Open on the frontier — the last stage that is actually playable — rather
    // than always on stage 1. Coming back from a clear, the thing you just
    // unlocked is the thing you came here for; replaying an earlier stage for
    // its remaining plugs is one press away either direction.
    let frontier = 0;
    opts.forEach((o, i) => { if (o.kind === 'stage' && stageUnlocked(this.save.slot, o.stage)) frontier = i; });
    this.idx = frontier;
    Input.setMenuButtons(false);
  }
  options() {
    const slot = this.save.slot;
    const opts = stagesForCabinet(this.cab.id).map((s) => ({ kind: 'stage', stage: s }));
    if (bossAvailable(slot, this.cab.id)) opts.push({ kind: 'boss' });
    if (slot.campaign.cleared[this.cab.id]) opts.push({ kind: 'corrupt' });
    opts.push({ kind: 'back' });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      // A locked stage stays selectable so you can read what is behind it and
      // what opens it — it just refuses to start.
      if (sel.kind === 'stage' && !stageUnlocked(this.save.slot, sel.stage)) Audio.sfx('uiBad');
      else if (sel.kind === 'stage') this.flow.pickTeam(this.cab, sel.stage, this.corrupt ? [this.corrupt] : []);
      else if (sel.kind === 'boss') this.flow.pickTeam(this.cab, null, [], true);
      else if (sel.kind === 'corrupt') {
        const cur = CORRUPTED_MODIFIERS.findIndex((m) => m.id === this.corrupt);
        this.corrupt = cur + 1 >= CORRUPTED_MODIFIERS.length ? null : CORRUPTED_MODIFIERS[cur + 1].id;
        if (cur === -1) this.corrupt = CORRUPTED_MODIFIERS[0].id;
      } else this.flow.toHub();
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, this.cab.name, W / 2, 20, '#f6d33c', 2, 'title');
    drawTextCentered(ctx, `${this.cab.genre} CABINET - STYLE: ${this.cab.style.toUpperCase()}`, W / 2, 44, '#8a8a98', DESC_S);
    const slot = this.save.slot;
    // Plugs are one-time per stage, so a running count tells you what is still
    // out there — a cleared cabinet reads 9/9 and never moves again.
    const cabStages = stagesForCabinet(this.cab.id);
    const cabGot = cabStages.reduce((n, s) => n + (slot.campaign.plugs[s.id] || []).filter(Boolean).length, 0);
    const cabMax = cabStages.length * 3;
    // Column headers sit above the list so the plug pips and the rank letter
    // read as labelled columns rather than loose glyphs at the end of a row.
    const plugX = W - 130, rankX = plugX + PLUG_ROW_W(PIP) + 4;
    // The rank letter is one glyph under a four-glyph header, so both hang off a
    // shared column centre rather than a shared left edge.
    const rankCx = rankX + textWidth('RANK') / 2;
    drawTextCentered(ctx, 'PLUGS', plugX + PLUG_ROW_W(PIP) / 2, this.listY - 13, '#5a5a68');
    drawTextCentered(ctx, 'RANK', rankCx, this.listY - 13, '#5a5a68');
    // Second line of a row: the mission blurb, or what it takes to open a
    // locked one. Sits clear of the pips, which ride the label line above it.
    const descY = (y) => y + 9 * ROW_S + 3;
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      const c = sel ? '#f6d33c' : '#c8c8d8';
      if (o.kind === 'stage') {
        const plugs = slot.campaign.plugs[o.stage.id] || [];
        const rank = slot.campaign.ranks[o.stage.id];
        const open = stageUnlocked(slot, o.stage);
        // A locked row keeps its name and its empty pips — it is a place you
        // are going, not a hole in the list — but drops to a colour that reads
        // as unavailable even while the cursor is sitting on it.
        drawText(ctx, `${sel ? '> ' : '  '}${o.stage.id.toUpperCase()}  ${o.stage.mission.type.toUpperCase()}`,
          40, y, open ? c : sel ? '#8a7a52' : '#54545e', ROW_S);
        // The pip row already says how many plugs you have, so the n/3 counter
        // that used to sit here was the same fact twice.
        drawPlugRow(ctx, plugX, y - 0.5, plugs, undefined, PIP);
        if (rank) drawTextCentered(ctx, rank, rankCx, y, '#48e0c8', ROW_S);
        // Naming the stage that opens it, rather than a bare LOCKED, means the
        // gate never sends anyone hunting for which of the nine cabinets it
        // meant — the answer is always the row directly above.
        const desc = open ? o.stage.mission.desc : `LOCKED - EARN A PLUG IN ${prevStage(o.stage).id.toUpperCase()}`;
        drawText(ctx, fitText(desc, W - 60, DESC_S), 52, descY(y), open ? '#5a5a68' : '#6a5a3a', DESC_S);
      } else if (o.kind === 'boss') {
        drawText(ctx, `${sel ? '> ' : '  '}BOSS: ${this.cab.id === 'neon' ? 'THE UNDERINSURED CLOWN-COPTER' : this.cab.id === 'rhythm' ? 'DUST DEVIL 9000' : 'THE FINAL POWER STRIP'}`, 40, y, sel ? '#e04848' : '#c05050', ROW_S);
      } else if (o.kind === 'corrupt') {
        const m = CORRUPTED_MODIFIERS.find((mm) => mm.id === this.corrupt);
        drawText(ctx, `${sel ? '> ' : '  '}CORRUPTED MODE: ${m ? m.name : 'OFF'}`, 40, y, sel ? '#8858c8' : '#6a5a8a', ROW_S);
        if (m) drawText(ctx, fitText(m.desc + ' (ONE-HIT RULES)', W - 60, DESC_S), 52, descY(y), '#5a5a68', DESC_S);
      } else {
        drawText(ctx, `${sel ? '> ' : '  '}BACK`, 40, y, c, ROW_S);
      }
    });
    // The tally is reference, not a headline: it rides the bottom status row
    // opposite the controls hint instead of crowding the title block.
    const tally = `PLUGS HERE: ${cabGot}/${cabMax}   TOTAL: ${totalPlugs(slot)}/${MAX_PLUGS}`;
    drawText(ctx, tally, W - 12 - textWidth(tally, HINT_S), H - 13, cabGot >= cabMax ? '#f6d33c' : '#48e0c8', HINT_S);
    drawMenuHint(ctx, 'PLAY');
  }
}


export class BenchState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 60; this.rowH = 20; }
  // options() always ends in a BACK row — the floating ESC button is redundant.
  enter() { this.idx = 0; Input.setMenuButtons(false); }
  options() {
    const slot = this.save.slot;
    const opts = BENCH_UPGRADES.map((u) => {
      const cur = slot.bench[u.id] || 0;
      // Power-up tracks start at level 1 (owned); relay tracks start at 0.
      const baseLevel = ['shield', 'magnet', 'star'].includes(u.id) ? 1 : 0;
      const lvl = Math.max(cur, baseLevel);
      const nextIdx = lvl - baseLevel;
      const cost = u.levels[nextIdx];
      const maxed = lvl >= u.max + baseLevel - (baseLevel ? 0 : 0) && nextIdx >= u.levels.length || cost === undefined;
      return { u, lvl, cost, maxed, baseLevel };
    });
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back) return this.flow.toHub();
      const slot = this.save.slot;
      if (!sel.maxed && sel.cost !== undefined && slot.coins >= sel.cost) {
        slot.coins -= sel.cost;
        slot.bench[sel.u.id] = sel.lvl + 1;
        this.save.persist();
        Audio.sfx('power');
      } else Audio.sfx('uiBad');
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'THE REPAIR BENCH', W / 2, 16, '#f6d33c', 2, 'title');
    drawTextCentered(ctx, `COINS: ${formatCoins(this.save.slot.coins)}`, W / 2, 40, '#f6d33c');
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      if (o.back) { drawText(ctx, `${sel ? '> ' : '  '}BACK`, 40, y, sel ? '#f6d33c' : '#c8c8d8'); return; }
      const c = sel ? '#f6d33c' : '#c8c8d8';
      const lvlText = 'I'.repeat(Math.max(1, o.lvl));
      drawText(ctx, `${sel ? '> ' : '  '}${o.u.name} [${lvlText}]`, 40, y, c);
      if (o.maxed || o.cost === undefined) drawText(ctx, 'MAX', W - 90, y, '#48c848');
      else drawText(ctx, `${formatCoins(o.cost)}`, W - 90, y, this.save.slot.coins >= o.cost ? '#f6d33c' : '#5a5a68');
      if (sel && !o.maxed && o.u.desc[o.lvl - o.baseLevel]) drawTextCentered(ctx, o.u.desc[o.lvl - o.baseLevel], W / 2, H - 26, '#8a8a98');
    });
    drawMenuHint(ctx, 'BUY');
  }
}

export class ShopState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 60; this.rowH = 18; }
  // options() always ends in a BACK row — the floating ESC button is redundant.
  enter() { this.idx = 0; this.line = PAWN_LINES[Math.floor(Math.random() * PAWN_LINES.length)]; Input.setMenuButtons(false); }
  options() {
    const slot = this.save.slot;
    const opts = MODS.filter((m) => m.source === 'shop' || slot.mods.found.includes(m.id)).map((m) => {
      const owned = slot.mods.found.includes(m.id) || (m.source === 'mastery' && (slot.mastery[m.hero]?.level || 0) >= 2);
      const equipped = slot.mods.equipped.includes(m.id);
      const price = m.price ? Math.round(m.price * (slot.mods.equipped.includes('coupon') ? 0.75 : 1)) : 0;
      return { m, owned, equipped, price };
    });
    // Mastery sidegrades appear once unlocked.
    for (const m of MODS.filter((mm) => mm.source === 'mastery')) {
      if ((slot.mastery[m.hero]?.level || 0) >= 2 && !opts.some((o) => o.m.id === m.id)) {
        opts.push({ m, owned: true, equipped: slot.mods.equipped.includes(m.id), price: 0 });
      }
    }
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back) return this.flow.toHub();
      const slot = this.save.slot;
      if (!sel.owned) {
        if (slot.coins >= sel.price) {
          slot.coins -= sel.price;
          slot.mods.found.push(sel.m.id);
          if (sel.m.id === 'thirdslot') slot.mods.slots = 3;
          Audio.sfx('power');
        } else Audio.sfx('uiBad');
      } else if (sel.m.id !== 'thirdslot') {
        if (sel.equipped) slot.mods.equipped = slot.mods.equipped.filter((id) => id !== sel.m.id);
        else if (slot.mods.equipped.length < slot.mods.slots) slot.mods.equipped.push(sel.m.id);
        else Audio.sfx('uiBad');
        Audio.sfx('ui');
      }
      this.save.persist();
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#100a14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, "GARY'S LEGALLY DISTINCT PAWN SHOP", W / 2, 14, '#f890b8', 1);
    drawTextCentered(ctx, this.line, W / 2, 28, '#5a5a68');
    const slot = this.save.slot;
    drawTextCentered(ctx, `COINS: ${formatCoins(slot.coins)}   EQUIPPED: ${slot.mods.equipped.length}/${slot.mods.slots}`, W / 2, 44, '#f6d33c');
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      if (o.back) { drawText(ctx, `${sel ? '> ' : '  '}BACK`, 30, y, sel ? '#f6d33c' : '#c8c8d8'); return; }
      const c = o.equipped ? '#48e0c8' : sel ? '#f6d33c' : o.owned ? '#c8c8d8' : '#8a8a98';
      drawText(ctx, `${sel ? '> ' : '  '}${o.equipped ? '[E] ' : ''}${o.m.name}`, 30, y, c);
      if (!o.owned) drawText(ctx, `${formatCoins(o.price)}`, W - 70, y, slot.coins >= o.price ? '#f6d33c' : '#5a5a68');
      if (sel) drawTextCentered(ctx, (o.m.desc || 'A MASTERY SIDEGRADE. IT KNOWS WHAT IT DID.').slice(0, 70), W / 2, H - 26, '#8a8a98');
    });
    drawMenuHint(ctx, 'BUY/EQUIP');
  }
}

export class ArcadeState {
  constructor({ save, flow }) { this.save = save; this.flow = flow; this.listY = 60; this.rowH = 18; }
  // options() always ends in a BACK row — the floating ESC button is redundant.
  enter() { this.idx = 0; Input.setMenuButtons(false); }
  options() {
    // Breaker-box games are keyboard-shaped; on touch the corner is shuttered.
    if (Input.isTouchDevice()) return [{ none: true }, { back: true }];
    // Every game is on the floor from day one — the coin slot is the only gate.
    const opts = MINIGAMES.map((m) => ({ game: m }));
    opts.push({ back: true });
    return opts;
  }
  update(dt) {
    const sel = listMenu(this, this.options());
    if (sel) {
      if (sel.back || sel.none) return this.flow.toHub();
      if (this.save.slot.coins < ARCADE_PLAY_COST) { Audio.sfx('uiBad'); }
      else this.flow.playMinigame(sel.game);
    }
    if (Input.pressed('back')) this.flow.toHub();
    Input.endFrame();
  }
  draw(ctx) {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, W, H);
    drawTextCentered(ctx, 'ARCADE CORNER', W / 2, 16, '#48e0c8', 2, 'title');
    drawTextCentered(ctx, `${ARCADE_PLAY_COST} COINS A GO. WIN: +${REWARDS.arcadeWin} AND A POWER-UP.`, W / 2, 40, '#8a8a98');
    const touch = Input.isTouchDevice();
    const broke = this.save.slot.coins < ARCADE_PLAY_COST;
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      if (o.back || o.none) {
        const label = o.back ? 'BACK' : 'OUT OF ORDER ON TOUCH. TRY A KEYBOARD.';
        drawText(ctx, `${sel ? '> ' : '  '}${label}`, 40, y, sel ? '#f6d33c' : '#c8c8d8');
        return;
      }
      const c = broke ? '#5a5a68' : sel ? '#f6d33c' : '#c8c8d8';
      drawText(ctx, `${sel ? '> ' : '  '}${MINIGAME_NAMES[o.game]}`, 40, y, c);
      drawText(ctx, `${ARCADE_PLAY_COST}`, W - 70, y, broke ? '#5a5a68' : '#f6d33c');
    });
    if (!touch && broke) drawTextCentered(ctx, 'THE COIN SLOT IS UNMOVED BY YOUR POVERTY.', W / 2, H - 26, '#8a8a98');
    drawMenuHint(ctx, 'PLAY');
  }
}
