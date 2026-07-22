// THE LAST FUNCTIONING FOOD COURT: side-view hub + stage select,
// Repair Bench, Gary's Legally Distinct Pawn Shop, arcade corner.
import { W, H } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawText, drawTextCentered, getSprite, textWidth, platePath } from '../../engine/sprites.js';
import { drawToon } from '../../sprites/toons.js';
import { drawProp } from '../../sprites/props.js';
import {
  cabinetPalette, cabinetStyle, drawCabinetShell, drawCabinetScreen, drawDeadScreen, drawScreenSweep,
  drawDoor, DOOR_PALETTES, OVERTIME_PALETTE,
} from '../../sprites/arcade.js';
import { CABINETS, CABINET_BY_ID, HUB_THEME } from '../../data/cabinets.js';
import { STAGES, stagesForCabinet, UNLOCKS } from '../../data/stages.js';
import { HEROES, HERO_BY_ID } from '../../data/heroes.js';
import { BENCH_UPGRADES, MODS, MOD_BY_ID, REWARDS, ARCADE_PLAY_COST } from '../../data/progression.js';
import { HUB_LINES, PAWN_LINES } from '../../data/jokes.js';
import { totalPlugs, MAX_PLUGS, cabinetUnlocked, bossAvailable, finaleUnlocked, actForSlot, formatCoins } from '../progress.js';
import { drawPlugRow, PLUG_ROW_W } from '../plugs.js';
import { drawSpeech } from '../hud.js';
import { MINIGAMES, MINIGAME_NAMES } from '../minigames/index.js';
import { getStylePack } from '../../engine/stylePacks/index.js';
import { makeObstacle, OBSTACLES } from '../entities.js';
import { drawWorldEntity } from '../draw.js';

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
const HUB_FLOOR_PIN_Y = 192;
const HUB_VIEW_W = W / HUB_ZOOM;
const HUB_CAM_Y = HUB_FLOOR_PIN_Y - HUB_FLOOR_PIN_Y / HUB_ZOOM;

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
function npcChipRect(npcX, i) {
  const row = NPC_MENU.length * NPC_CHIP_W + (NPC_MENU.length - 1) * NPC_CHIP_GAP;
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

function drawNpcChips(ctx, npcX, cam, idx) {
  for (let i = 0; i < NPC_MENU.length; i++) {
    const r = npcChipRect(npcX, i);
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
    drawTextCentered(ctx, NPC_MENU[i].label, x + r.w / 2, r.y + 2.5, sel ? '#1a1028' : '#f6d33c', 0.85, 'bold');
  }
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
    // A stretch of bare wall between the way out and the first machine: the
    // exit used to sit 4px off PLUMBER PANIC's cabinet, which read as one
    // cluttered fixture rather than as a door you leave through.
    let x = 130;
    for (const cab of CABINETS) {
      const unlocked = cabinetUnlocked(slot, cab.id);
      st.push({ type: 'cabinet', cab, x, unlocked, label: cab.name });
      // 88 apart rather than the original 64. The viewport is 369 units wide,
      // so this frames about four machines at a time instead of six crowding
      // each other — room to look at each one, without the stretch of bare wall
      // between them that 110 opened up.
      x += 88;
    }
    x += 40;
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

  enter() {
    Input.setContext('default');
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
    // Give every loitering hero a tiny patch of food court to inhabit. Their
    // deterministic offsets keep return visits lively without letting anyone
    // wander into a cabinet doorway or disappear down the concourse.
    this.npcActors = HEROES.map((h, i) => {
      const home = 155 + i * 120 + (i % 3) * 26;
      const walking = i % 3 !== 0;
      return {
        id: h.id, home, x: home, facing: i % 2 ? -1 : 1,
        state: walking ? 'walk' : 'idle',
        timer: 0.75 + (i % 4) * 0.33,
        duration: 1, cycles: i,
      };
    });
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
        for (let i = 0; i < NPC_MENU.length; i++) {
          const r = npcChipRect(chipNpc.x, i);
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
      else if (tappedNpc && onSelf && Math.abs(tappedNpc.x - this.px) < 18) this.chooseNpc(tappedNpc);
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
      if (Input.pressed('jump')) { this.npcMenuIdx = (this.npcMenuIdx + NPC_MENU.length - 1) % NPC_MENU.length; Audio.sfx('ui'); }
      if (Input.pressed('duck')) { this.npcMenuIdx = (this.npcMenuIdx + 1) % NPC_MENU.length; Audio.sfx('ui'); }
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
    return this.flow.heroId();
  }

  // Whichever chip is lit.
  chooseNpc(npc) {
    if (NPC_MENU[this.npcMenuIdx || 0].id === 'swap') this.swapTo(npc);
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
    // setHero, not a bare assignment: it also points the transition cameo at
    // whoever you just became, so the shutter on the way into a cabinet shows
    // the hero you are about to play.
    this.flow.setHero(npc.id);
    const actor = (this.npcActors || []).find((a) => a.id === prev);
    if (actor) {
      actor.x = prevX;
      actor.home = prevX;
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
      if (n.state === 'walk') {
        n.x += n.facing * 10 * dt;
        if (Math.abs(n.x - n.home) >= 17) {
          n.x = n.home + Math.sign(n.x - n.home) * 17;
          n.state = 'idle'; n.timer = 0.9 + (n.cycles % 3) * 0.3;
        }
      }
      if (n.timer > 0) continue;
      n.cycles++;
      if (n.state === 'walk') {
        n.state = 'idle'; n.timer = 0.8 + (n.cycles % 4) * 0.25;
      } else if (n.state === 'hop') {
        n.state = 'idle'; n.timer = 0.7 + (n.cycles % 3) * 0.3;
      } else if (n.cycles % 4 === 0) {
        n.state = 'hop'; n.duration = 0.5; n.timer = n.duration;
      } else {
        n.state = 'walk'; n.facing = n.x > n.home + 5 ? -1 : n.x < n.home - 5 ? 1 : (n.cycles % 2 ? -1 : 1);
        n.timer = 1.1 + (n.cycles % 3) * 0.35;
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
    ctx.fillRect(0, 40, HUB_VIEW_W, 150);
    ctx.fillStyle = '#38304a';
    ctx.fillRect(0, 190, HUB_VIEW_W, 6);
    ctx.fillStyle = '#1c1626';
    ctx.fillRect(0, 196, HUB_VIEW_W, H - 196);
    // checkered food-court floor
    for (let y = 0; y < 3; y++) {
      for (let x = -((cam) % 32); x < HUB_VIEW_W; x += 32) {
        ctx.fillStyle = (Math.floor((x + cam) / 32) + y) % 2 === 0 ? '#241c30' : '#1c1626';
        ctx.fillRect(Math.round(x), 200 + y * 22, 32, 22);
      }
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
      drawCeilingLight(ctx, lx, 46, on ? lightFlicker(this.t, i, this.save.settings.reducedFlashing) : 0);
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
        // Cleared: every stage in this cabinet has its mission plug (see
        // progress.js, which gates the boss on the same flag). That is a
        // different fact from "lit", which only means unlocked — so it still
        // needs saying, but as a gold star pinned to the machine rather than as
        // the word OK floating in the air above it.
        if (slot.campaign.cleared[s.cab.id]) drawClearedStar(ctx, x + CAB_W * 0.4, CAB_Y + CAB_H * 0.05, CAB_W * 0.115);
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
        // Gary works his own doorway, at NPC scale, feet on the same floor line
        // as everyone else. He was a toonStandSprite — which caches ONE render
        // at time 0, so he was a frozen frame standing beside a concourse of
        // breathing heroes. drawToon on the hub clock costs the same and gives
        // him an idle.
        //
        // Skipped when he IS the avatar: the coupon mod makes Gary the hero you
        // drive (see avatarId()), and nothing here checked, so equipping it put
        // two Garys on screen at once.
        if (s.type === 'shop' && this.avatarId() !== 'gary') {
          ctx.fillStyle = 'rgba(4,3,9,0.28)';
          ctx.beginPath(); ctx.ellipse(x, HUB_FLOOR_PIN_Y, NPC_H * 0.37, NPC_H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
          drawToon(ctx, 'gary', {
            kind: 'idle', phase: 0, time: this.t + 1.7, grounded: true, facing: -1,
          }, x, HUB_FLOOR_PIN_Y, NPC_H);
        }
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
      ctx.beginPath(); ctx.ellipse(x, 192, NPC_H * (n.state === 'hop' ? 0.26 : 0.37), NPC_H * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      drawToon(ctx, n.id, {
        kind: n.state === 'walk' ? 'run' : n.state === 'hop' ? 'jump' : 'idle',
        phase: (this.t * 1.25 + n.cycles * 0.17) % 1,
        time: this.t + n.cycles * 0.41,
        grounded: n.state !== 'hop',
        vy: n.state === 'hop' ? -40 : 0,
        facing: n.facing || 1,
      }, x, 192 - hop, NPC_H);
    }
    // THE DUST DEVIL drifts through occasionally, cleaning something
    // impossible (varies by act). ~9s of every ~48, unannounced, then gone.
    // Nobody addresses this.
    const ddCyc = (this.t + 39) % 48; // first visit ~9s after entering
    if (ddCyc < 9) {
      // The act-2 ceiling cameo rides the same crop-safe strip as the lights
      // (y 46, see above) — there's only ~2px of margin above the crop line,
      // not enough room to place it above them and still be visible.
      const [ddY, onCeiling] = [[178, false], [48, true], [118, false]][Math.min(act - 1, 2)];
      // Screen-relative glide, right to left — whenever it visits, you see it.
      const ddX = Math.round(HUB_VIEW_W + 20 - (ddCyc / 9) * (HUB_VIEW_W + 60));
      ctx.save();
      ctx.globalAlpha = Math.min(1, ddCyc * 1.5, (9 - ddCyc) * 1.5); // slips in, slips out
      if (onCeiling) { ctx.translate(ddX + 8, ddY + 7); ctx.rotate(Math.PI); ctx.translate(-8, -7); }
      drawProp(ctx, 'dustdevil', onCeiling ? 0 : ddX, onCeiling ? 0 : ddY, 16, 14);
      ctx.restore();
    }
    // The chooser rides above whichever hero you are beside, and only when no
    // station is also in range — standing between a cabinet and a loitering
    // hero, ENTER belongs to the cabinet, so offering chips you cannot pick
    // would be a lie.
    if (this.nearNpc && !this.near) drawNpcChips(ctx, this.nearNpc.x, cam, this.npcMenuIdx || 0);
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
    ctx.beginPath(); ctx.ellipse(pxs, 192, PLAYER_H * 0.4, PLAYER_H * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    drawToon(ctx, heroId, {
      kind: moving ? 'run' : 'idle',
      phase: (this.t * 1.6) % 1,
      time: this.t,
      grounded: true,
      facing: this.facing || 1,
    }, pxs, 192, PLAYER_H);
    drawPlayerMarker(ctx, pxs, 192 - PLAYER_H - 10 + Math.sin(this.t * 2.6) * 1.3, 3.2);
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
      const label = this.near.type === 'cabinet' && !this.near.unlocked
        ? `${this.near.label} (LOCKED: ${UNLOCKS[this.near.cab.id]} PLUGS)` : this.near.label;
      const verb = this.near.type === 'exit' ? (Input.usingTouch ? 'TAP TO LEAVE' : 'ENTER TO LEAVE') : (Input.usingTouch ? 'TAP TO ENTER' : 'ENTER TO USE');
      drawTextCentered(ctx, `${label} - ${verb}`, W / 2, H - 30, '#f6d33c');
    } else if (this.nearNpc) {
      // Touch talks the same way it enters a station — tap them again once
      // you're standing alongside (update()'s tappedNpc branch); DOWN is the
      // keyboard's own way in, not something touch has a key for.
      // Just the name: the chips over their head already say what the two
      // options are, so repeating them down here would be the same sentence in
      // two places — which is exactly what the rest of this row was cut for.
      drawTextCentered(ctx, HERO_BY_ID[this.nearNpc.id].short, W / 2, H - 30, '#48e0c8');
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

// Every hub sub-menu is listMenu-driven: arrow keys or a tap-to-select,
// tap-again-to-confirm, spelled out at the bottom of the screen.
function drawMenuHint(ctx, extra) {
  const text = Input.usingTouch
    ? `TAP SELECT   TAP AGAIN ${extra || 'CONFIRM'}   ESC BACK`
    : `UP/DOWN SELECT   ENTER ${extra || 'CONFIRM'}   ESC BACK`;
  drawText(ctx, text, 12, H - 12, '#5a5a68');
}

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

export class StageSelectState {
  constructor({ save, cab, flow }) { this.save = save; this.cab = cab; this.flow = flow; this.listY = 74; this.rowH = 26; }
  // The option list always ends in a BACK row (see options() below), so the
  // floating corner ESC button would just be a second, disconnected way to do
  // the same thing — drop it and let the list carry it.
  enter() { this.idx = 0; this.corrupt = null; Input.setMenuButtons(false); }
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
      if (sel.kind === 'stage') this.flow.pickTeam(this.cab, sel.stage, this.corrupt ? [this.corrupt] : []);
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
    drawTextCentered(ctx, `${this.cab.genre} CABINET - STYLE: ${this.cab.style.toUpperCase()}`, W / 2, 44, '#8a8a98');
    const slot = this.save.slot;
    // Plugs are one-time per stage, so a running count tells you what is still
    // out there — a cleared cabinet reads 9/9 and never moves again.
    const cabStages = stagesForCabinet(this.cab.id);
    const cabGot = cabStages.reduce((n, s) => n + (slot.campaign.plugs[s.id] || []).filter(Boolean).length, 0);
    const cabMax = cabStages.length * 3;
    // Column headers sit above the list so the plug pips and the rank letter
    // read as labelled columns rather than loose glyphs at the end of a row.
    const plugX = W - 130, rankX = plugX + PLUG_ROW_W() + 4;
    // The rank letter is one glyph under a four-glyph header, so both hang off a
    // shared column centre rather than a shared left edge.
    const rankCx = rankX + textWidth('RANK') / 2;
    drawTextCentered(ctx, 'PLUGS', plugX + PLUG_ROW_W() / 2, this.listY - 12, '#5a5a68');
    drawTextCentered(ctx, 'RANK', rankCx, this.listY - 12, '#5a5a68');
    this.options().forEach((o, i) => {
      const y = this.listY + i * this.rowH;
      const sel = i === this.idx;
      const c = sel ? '#f6d33c' : '#c8c8d8';
      if (o.kind === 'stage') {
        const plugs = slot.campaign.plugs[o.stage.id] || [];
        const rank = slot.campaign.ranks[o.stage.id];
        drawText(ctx, `${sel ? '> ' : '  '}${o.stage.id.toUpperCase()}  ${o.stage.mission.type.toUpperCase()}`, 40, y, c);
        // The pip row already says how many plugs you have, so the n/3 counter
        // that used to sit here was the same fact twice.
        drawPlugRow(ctx, plugX, y - 2, plugs);
        if (rank) drawTextCentered(ctx, rank, rankCx, y, '#48e0c8');
        drawText(ctx, fitText(o.stage.mission.desc, W - 8 - 52), 52, y + 10, '#5a5a68');
      } else if (o.kind === 'boss') {
        drawText(ctx, `${sel ? '> ' : '  '}BOSS: ${this.cab.id === 'neon' ? 'THE UNDERINSURED CLOWN-COPTER' : this.cab.id === 'rhythm' ? 'DUST DEVIL 9000' : 'THE FINAL POWER STRIP'}`, 40, y, sel ? '#e04848' : '#c05050');
      } else if (o.kind === 'corrupt') {
        const m = CORRUPTED_MODIFIERS.find((mm) => mm.id === this.corrupt);
        drawText(ctx, `${sel ? '> ' : '  '}CORRUPTED MODE: ${m ? m.name : 'OFF'}`, 40, y, sel ? '#8858c8' : '#6a5a8a');
        if (m) drawText(ctx, m.desc + ' (ONE-HIT RULES)', 52, y + 10, '#5a5a68');
      } else {
        drawText(ctx, `${sel ? '> ' : '  '}BACK`, 40, y, c);
      }
    });
    // The tally is reference, not a headline: it rides the bottom status row
    // opposite the controls hint instead of crowding the title block.
    const tally = `PLUGS HERE: ${cabGot}/${cabMax}   TOTAL: ${totalPlugs(slot)}/${MAX_PLUGS}`;
    drawText(ctx, tally, W - 12 - textWidth(tally), H - 12, cabGot >= cabMax ? '#f6d33c' : '#48e0c8');
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
