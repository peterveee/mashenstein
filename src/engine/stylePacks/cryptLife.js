// CRYPT SHIFT — the graveyard's life, as shipped. Peter picked these from the 26 Sep 2026
// bake-off (lab section crypt-ideas-bakeoff: "F1, F4, H3, N1, N2, H1, H2 … Spread these
// out... for the ghosts they can repeat a couple of times... have a variable number of
// ghosts 1-3"). The painters are the bake-off's own (./cryptLife/), so the lab and the
// run draw the same animal; this file only says where each one lives.
//
// Every entry is a study in cryptGouache.js's sense: a depth layer, a position `u` in that
// layer's own space, and a painter. The layer repeats every period, so each thing comes
// round again at its layer's rate. Positions are spread along each period so no two
// arrive together:
//   far ridge (period 2880): the belfry bats at the abbey (360), the storm behind the
//     second ruin (1900), and the level-3 zombie procession (2590, once);
//   graveyard hill (period 2560): ghosts at 505, 1440 and 2330, the cat on the domed tomb
//     (771), the will-o'-wisps among the graves at 1700, the crypt-3 cauldron (750, once),
//     and the crypt-2 pumpkin patch (2630, once);
//   near bank (3600): the owl on the first gnarled tree (48), the crows on the railing
//     left of the far gate (1984).
import { IDEAS as FAR } from './cryptLife/far.js';
import { IDEAS as MID, paintGhosts } from './cryptLife/mid.js';
import { IDEAS as FG } from './cryptLife/fg.js';
import { drawWitch, warmWitch } from './cryptLife/witch.js';
import { CLOWN, warmClown } from './cryptLife/clown.js';
import { CRYPT_ZOMBIE_PROCESSION } from './cryptLife/procession.js';
import { CRYPT_HALLOWEEN_LIFE } from './cryptLife/halloween.js';
import { screen, isPhonePortraitPresentation } from '../renderer.js';

function pick(list, id) {
  const idea = list.find((i) => i.id === id);
  if (!idea) throw new Error(`cryptLife: no idea "${id}"`);
  return idea;
}

const GHOST = pick(MID, 'mid-ghost');
// 1225 moved to 1440 on 26 Sep to leave crypt-2's opening to the balloon clown (1235).
const GHOST_AT = [505, 1440, 2330];

export const CRYPT_LIFE = Object.freeze([
  pick(FAR, 'belfry-bats'),
  pick(FAR, 'far-storm'),
  ...GHOST_AT.map((u, i) => ({
    ...GHOST, id: `mid-ghosts-${i + 1}`, u, paint: (ctx, f) => paintGhosts(ctx, f, i + 1),
  })),
  pick(MID, 'mid-cat'),
  { ...pick(MID, 'mid-wisps'), u: 1700 },
  pick(FG, 'fg-owl'),
  pick(FG, 'fg-crows'),
  // Crypt-2's opening only: a clown on the hill lets his red balloon go (Peter, 26 Sep
  // 2026). He gates himself (clown.js): stage 2, first pass of that stretch.
  CLOWN,
  CRYPT_ZOMBIE_PROCESSION,
  ...CRYPT_HALLOWEEN_LIFE,
]);

// THE WITCH (Peter, 26 Sep 2026: "a witch on a broomstick to occasionally fly across the
// sky in silhouette... also towards the end of the level, the witch should fly across the
// moon"). Two schedules, both screen-space sky visitors drawn by the backdrop in front of
// the weather:
//   now and then — a 34 s cycle, two cycles in three; a 9 s crossing at a hashed height
//     and direction;
//   the finale — once the eclipse has cleared (CRYPT_ECLIPSE ends at 0.9), from 0.905 to
//     0.965 of the stage (about two seconds of it over the moon's face) she crosses the moon right to left, larger, her path through its
//     face. The occasional crossings stand down around it.
const WITCH_CYCLE = 34;
const WITCH_FLIGHT = 9;
const WITCH_FINALE = [0.905, 0.965];
let flightKey = null;
let flightOk = true;
let flightT = 0;
const whash = (n) => { const x = Math.sin(n * 91.3 + 7.1) * 43758.5453; return x - Math.floor(x); };

export function cryptWitches(t, progress, view) {
  const out = [];
  const L = view.left - 50;
  const R = view.right + 50;
  const p = Number.isFinite(progress) ? progress : 0;
  if (p >= WITCH_FINALE[0] && p <= WITCH_FINALE[1]) {
    const u = (p - WITCH_FINALE[0]) / (WITCH_FINALE[1] - WITCH_FINALE[0]);
    // In fast, a slow glide over the moon's face (the middle 40% of the window), out fast.
    const mx = view.moon.x;
    const a = mx + 34;
    const b = mx - 34;
    const x = u < 0.3 ? R + (a - R) * (u / 0.3)
      : u < 0.7 ? a + (b - a) * ((u - 0.3) / 0.4)
        : b + (L - b) * ((u - 0.7) / 0.3);
    out.push({ x, y: view.moon.y + 0.07 * (x - view.moon.x) - 2 * Math.sin(u * Math.PI), scale: 1.4, facing: -1 });
    return out;
  }
  const cycle = Math.floor(t / WITCH_CYCLE);
  const c = t - cycle * WITCH_CYCLE;
  if (c > WITCH_FLIGHT || whash(cycle) < 0.34) return out;
  // WHETHER A FLIGHT FLIES IS DECIDED ONCE, when it starts. Checked every frame, the
  // stand-down around the finale cut a witch off in mid-sky the moment the stage crossed
  // into it (Peter: "the witch just disappeared ... without going all the way to the
  // edge"). A flight that starts always finishes, and none starts late enough to still be
  // in the air when the finale begins (a crossing is ~0.1 of a stage).
  if (flightKey !== cycle || t < flightT) {
    flightKey = cycle;
    flightOk = p < WITCH_FINALE[0] - 0.12 || p > WITCH_FINALE[1];
  }
  flightT = t;
  if (!flightOk) return out;
  const u = c / WITCH_FLIGHT;
  const facing = whash(cycle + 0.5) < 0.5 ? 1 : -1;
  const hi = Math.min(...view.cloudY);
  const lo = Math.max(...view.cloudY) + 20;
  const y0 = hi + whash(cycle + 0.25) * (lo - hi);
  const x = facing > 0 ? L + u * (R - L) : R - u * (R - L);
  out.push({ x, y: y0 - 10 * Math.sin(u * Math.PI), scale: 0.85 + 0.3 * whash(cycle + 0.75), facing });
  return out;
}

export function paintCryptWitch(ctx, t, x, y, w) {
  drawWitch(ctx, t, x, y, { scale: w.scale, facing: w.facing });
}

// Build every sprite and pose frame these animals will ask for, at the scale the run will
// draw them, by painting each one through a full cycle into a scratch canvas. A warm-up
// job per animal (game/art-warmup.js); what is not built by play simply bakes on first
// sight, as it did in the lab.
export function cryptLifeWarmJobs() {
  // The scale the frame will hand the painters: the density, times portrait's backdrop
  // magnification (each painter rounds and caps it itself).
  const scale = (Number(screen?.px) || 1) * (isPhonePortraitPresentation() ? 1.78 : 1);
  const view = { left: 0, right: 480, top: -160, bottom: 430, moon: { x: 60, y: 10 }, progress: 0 };
  const witch = () => {
    if (typeof document === 'undefined') return;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx || typeof ctx.setTransform !== 'function') return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    for (const s of [0.85, 1, 1.15, 1.4]) warmWitch(ctx, s);
    warmClown(ctx);
  };
  return [witch, ...CRYPT_LIFE.map((idea) => () => {
    if (typeof document === 'undefined') return;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (!ctx || typeof ctx.setTransform !== 'function') return;
    const ridgeY = () => 40;
    const warmView = { ...view, progress: idea.warmProgress ?? 0 };
    for (let t = 0; t < 16; t += 1 / 12) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.save();
      idea.paint(ctx, {
        x: 20, y: 40, t, camX: 0, ridgeY, view: warmView,
        stageIndex: idea.warmStageIndex ?? 1, shift: 0,
      });
      ctx.restore();
    }
  })];
}
