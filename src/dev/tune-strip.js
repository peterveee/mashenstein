// The tuning strip: move a physics or gait constant while the game is running.
//
// The dev MENU freezes the frame underneath it, which is right for inspecting
// state and wrong for judging motion. You cannot tell whether a stride reads
// well by alternating between a still menu and a running game — you have to
// watch it move while your hand is on the number. So this is not a menu: it
// draws over the live frame from Dev.drawStatusStrip, and Dev.update returns
// false while it is up, so the run keeps ticking under it.
//
// Keys are claimed only while tune mode is on, because ArrowLeft/ArrowRight are
// the ability during a run and the section-skip in the dev key branch.
import { drawText, drawPanel } from '../engine/sprites.js';
import { H, W } from '../engine/renderer.js';
import { TUNABLES, GROUPS, byGroup } from '../../tools/lib/tunables.js';
import { readOne, defaultOf, knows, tuningAvailable, changed } from './tunables.js';
import { nudge, revertTuning } from './tune-store.js';
import { jumpHeightFor, airtimeFor } from '../game/player.js';
import { worstAirtime } from '../game/spawner.js';
import { framingFor, PAN_MAX, VIEW_W, ZOOM } from '../engine/camera.js';
import { HERO_BY_ID } from '../data/heroes.js';
import { PLAYER_X } from '../game/player.js';

const INK = '#f6d33c';
const DIM = '#8a8a9e';
const HOT = '#ff6b5e';
const SEL = '#ffffff';

export const TuneStrip = {
  on: false,
  group: 0,
  idx: 0,
  // Highest altitude the hero has reached. The camera readout needs the peak
  // the run ACTUALLY produced — a modelled double jump would depend on when the
  // second press lands, which nothing here can know.
  //
  // `lastPeak` holds it after touchdown. Zeroing on landing meant the figure
  // only existed while airborne, which is precisely when you are busy playing
  // and not reading the strip.
  peakY: 0,
  lastPeak: 0,

  rows() { return byGroup(GROUPS[this.group]).filter((r) => knows(r.name)); },
  current() { return this.rows()[this.idx] || null; },

  toggle() {
    this.on = !this.on;
    if (this.on) this.clampIdx();
    return this.on;
  },

  clampIdx() {
    const n = this.rows().length;
    this.idx = n ? Math.max(0, Math.min(n - 1, this.idx)) : 0;
  },

  cycleGroup(d) {
    this.group = (this.group + d + GROUPS.length) % GROUPS.length;
    this.idx = 0;
  },

  move(d) {
    const n = this.rows().length;
    if (n) this.idx = (this.idx + d + n) % n;
  },

  /** One arrow press. `coarse` is the shift modifier. */
  adjust(dir, coarse, run) {
    const row = this.current();
    if (!row) return null;
    const v = nudge(row.name, dir * (coarse ? row.coarse : row.step), run);
    return v == null ? null : `${row.short} ${fmt(row, v)}`;
  },

  /** Track the arc's high-water mark; bank it at touchdown. */
  observe(run) {
    const p = run && run.player;
    if (!p) return;
    if (p.grounded) {
      if (this.peakY > 0) { this.lastPeak = this.peakY; this.peakY = 0; }
    } else if (p.y > this.peakY) this.peakY = p.y;
  },

  /** The peak worth reporting: this jump if airborne, otherwise the last one. */
  shownPeak() { return this.peakY > 0 ? this.peakY : this.lastPeak; },
};

const fmt = (row, v) => (row.fmt > 0 ? v.toFixed(row.fmt) : String(Math.round(v)));

/**
 * The derived block: what the numbers you are moving actually cost.
 *
 * Every figure comes from the real exported helper rather than from arithmetic
 * copied out of it, so a readout cannot quietly disagree with the game. Each
 * one names the live profile — hero, mods, current speed — because "jump
 * height" is meaningless without saying whose.
 */
export function derived(run) {
  const heroId = run && run.relay ? run.relay.current : null;
  const hero = heroId ? HERO_BY_ID[heroId] : null;
  const speed = run ? run.speed : 0;
  const out = { hero: heroId || '—', warn: [] };

  if (hero) {
    out.jump = jumpHeightFor(hero);
    out.air = airtimeFor(hero);
    out.jumpMult = hero.jumpMult;
    out.maxJumps = run.player ? run.player.maxJumps : hero.maxJumps;
  }
  out.speed = speed;
  out.worst = worstAirtime();

  // The fairness floor is a single declared number; the cast is nine heroes.
  // Reported, but deliberately NOT a warning: worstAirtime() is
  // (2·BASE_JUMP_V·0.9)/(GRAVITY·1.25), so the ratio between it and the cast
  // maximum is invariant to every constant on this strip — it would be red on
  // every frame of every session and tell you nothing about what you just
  // moved. It is a standing fact about the spawner, so it lives in the menu's
  // derived block where there is room to state both numbers.
  let castMax = 0;
  for (const h of Object.values(HERO_BY_ID)) castMax = Math.max(castMax, airtimeFor(h));
  out.castMax = castMax;
  out.airtimeUnderstated = out.worst < castMax;

  // The spacing the spawner will use for the worst transition it can lay down:
  // a jump obstacle followed by a duck obstacle, which cannot be ducked while
  // still in the air. Read off the LIVE spawner so a shadowed react floor shows
  // up here rather than hiding.
  const sp = run && run.spawner;
  if (sp && speed) {
    out.react = sp.react;
    out.gap = sp.fairGap ? sp.fairGap(speed, 'jump', 'duck') : null;
    out.runway = (VIEW_W - PLAYER_X) / speed;
    out.margin = out.runway - (sp.react + out.worst);
    if (out.margin < 0) out.warn.push('no runway');
  }

  // What the crane has left. framingFor spends pan to its limit before it
  // touches zoom, so pan === PAN_MAX is the moment every jump this high starts
  // pulling the whole frame back.
  const peak = TuneStrip.shownPeak();
  if (peak > 0) {
    const f = framingFor(peak);
    out.pan = f.pan;
    out.zoom = f.zoom;
    out.peak = peak;
    if (f.pan >= PAN_MAX - 0.01) out.warn.push('crane maxed');
  }

  // The landing squash blend divides by SQUASH_T while the controller counts
  // LANDED_T down. Drift and the squash either ends early or never completes.
  const landed = knows('LANDED_T') ? readOne('LANDED_T') : null;
  const squash = knows('SQUASH_T') ? readOne('SQUASH_T') : null;
  if (landed != null && squash != null && Math.abs(landed - squash) > 1e-9) {
    out.warn.push(`LANDED_T ${landed} != SQUASH_T ${squash}`);
  }
  return out;
}

function derivedLine(d) {
  const bits = [];
  bits.push(`${d.hero}${d.maxJumps > 1 ? `x${d.maxJumps}` : ''}`);
  if (d.jump != null) bits.push(`jmp ${d.jump.toFixed(1)}`);
  if (d.air != null) bits.push(`air ${d.air.toFixed(3)}`);
  if (d.speed) bits.push(`spd ${Math.round(d.speed)}`);
  if (d.gap != null) bits.push(`gap ${Math.round(d.gap)}`);
  if (d.margin != null) bits.push(`mgn ${d.margin.toFixed(2)}`);
  if (d.pan != null) bits.push(`cam ${Math.round(d.pan)}/${Math.round(PAN_MAX)} z${d.zoom.toFixed(2)}`);
  return bits.join(' ');
}

/**
 * Draw the strip. Sits above the status strip's own row, which keeps the very
 * bottom-left free for the game's location label.
 */
export function drawTuneStrip(ctx, dev) {
  if (!TuneStrip.on) return 0;
  const rows = TuneStrip.rows();
  if (!tuningAvailable() || !rows.length) {
    const msg = 'TUNE: no tunables registered (not a watch build?)';
    drawPanel(ctx, 2, H - 44, 8 + msg.length * 4, 11, 2, 'rgba(11,11,20,0.86)');
    drawText(ctx, msg, 6, H - 41, HOT, 0.75);
    return 12;
  }

  const run = dev.run();
  const d = derived(run);
  const moved = changed().length;

  // Row 1: a window of constants centred on the selected one, so a long group
  // still shows its neighbours without the strip running off the frame.
  const SHOW = 5;
  const half = Math.floor(SHOW / 2);
  let from = Math.max(0, Math.min(rows.length - SHOW, TuneStrip.idx - half));
  if (from < 0) from = 0;
  const window = rows.slice(from, from + SHOW);

  // The header states what the strip has taken over, because both are silent
  // otherwise: arrows no longer reach the hero, and hits no longer count.
  const head = `TUNE ${GROUPS[TuneStrip.group]}${moved ? ` (${moved} moved)` : ''}`
    + '  ·  arrows=tuner (jump SPACE/W · duck S · rewind A · ability X/D)'
    + `${run && run.devInvuln ? '  ·  INVULN' : ''}`;
  const consts = window.map((r) => {
    const v = readOne(r.name);
    const sel = r === TuneStrip.current();
    return {
      text: sel ? `[${r.short} ${fmt(r, v)}]` : ` ${r.short} ${fmt(r, v)} `,
      color: sel ? SEL : v !== defaultOf(r.name) ? INK : DIM,
    };
  });
  const constW = consts.reduce((n, c) => n + c.text.length + 1, 0);
  const line2 = derivedLine(d);
  const warnLine = d.warn.length ? `! ${d.warn.join(' · ')}` : null;

  // Sized to its own content and parked ABOVE the status strip, which owns
  // H-30. Overlapping it hid the warning row behind the crash counter — the one
  // line most worth reading was the one covered up.
  const lineCount = 3 + (warnLine ? 1 : 0);
  const hgt = 5 + lineCount * 9;
  const top = H - 34 - hgt;
  const w = Math.min(W - 4, 8 + Math.max(
    head.length, line2.length, constW, warnLine ? warnLine.length : 0,
  ) * 4);
  drawPanel(ctx, 2, top, w, hgt, 2, 'rgba(11,11,20,0.88)');

  let y = top + 3;
  drawText(ctx, head, 6, y, INK, 0.75);
  y += 9;
  let x = 6;
  for (const c of consts) {
    drawText(ctx, c.text, x, y, c.color, 0.75);
    x += (c.text.length + 1) * 4;
  }
  y += 9;
  drawText(ctx, line2, 6, y, DIM, 0.75);
  if (warnLine) drawText(ctx, warnLine, 6, y + 9, HOT, 0.75);
  return hgt + 4;
}

export function tuneHelp() {
  return '↑↓ pick  ←→ move  shift x10  G group  C copy  R revert  T off';
}

export { revertTuning };
