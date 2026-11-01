// Act-ending flight: the chase itself. FlightPrototypeState is the bare fight
// (?goto=flight); CampaignFlightState (campaign.js) adds the save, the music and
// the stage's ending around it. Both paint through scene.js — the run uses the
// same painters while it hands over — and both put the whole picture on the
// overlay, where the run's handover frame was painted, so nothing changes
// resolution or treatment on the frame the states swap.
//
// Controls are the run's: the JUMP and SLIDE discs (or keys) climb and drop the
// tub, PAUSE pauses, and the pause card is the run's card — RESUME, EXIT and,
// in a campaign, RESTART. Escape pauses; it never leaves.
import { W, H, presentationFrame, pushOverlayDraw, isPhonePortraitPresentation, chrome } from '../../engine/renderer.js';
import { Input } from '../../engine/input.js';
import { Audio } from '../../engine/audio.js';
import { drawPanel, drawMenuRow, drawTextForPresentation, drawTextCenteredForPresentation, textYForMid, textWidth } from '../../engine/sprites.js';
import { runChromeButtons, declareRunChrome } from '../touchchrome.js';
import { portraitHudLayout } from '../portrait-layout.js';
import { FlightModel, BACKUP } from './model.js';
import {
  drawPassage, drawFlightHero, drawFlightBoss, flightBossCentre, FLIGHT_BOSS_SIZE, FLIGHT_LEAN, drawSpeedStreaks,
  plate, warmPassage, currentFlightLayout, flightHudTop,
  drawFlightBalloon, drawBalloonBasket, drawBalloonBurst, drawBackupMachine, backupCopterCentre,
  drawGiantPlug, drawPassageReveal,
} from './scene.js';

const smooth01 = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
// Each act's halfway line and what the weapon is doing while he says it.
const MIDPOINT_LINES = {
  1: ['DO YOU KNOW WHAT THAT COST?', 'WEAPON DEPLOYING...'],
  2: ['THAT COPTER WAS A RENTAL.', 'WEAPON DEPLOYING...'],
  3: ['FINE. THE COILS.', 'COILS CHARGING...'],
};

const ACTION_INK = { jump: '#3fbf5a', slide: '#72d8f0' };
const CHROME_SHIM = {};
const HUD_IN = 0.55;
// Tub travel per unit of finger travel when steering by drag (touch).
const DRAG_GAIN = 1.6;

// The run's pause plates, laid out the same way: a centred row of 120x26 at
// y 230 in landscape, a card with a row of tall plates in portrait.
function landscapePlates(list) {
  const w = 120, gap = 14, row = w * list.length + gap * (list.length - 1);
  return list.map((p, i) => ({ ...p, x: W / 2 - row / 2 + i * (w + gap), y: 230, w, h: 26 }));
}
function portraitCard() {
  const safe = presentationFrame()?.safeRect || { left: 0, right: W, top: 0, bottom: H };
  const edge = 28;
  const panelX = Math.max(edge, Number(safe.left) + edge);
  const panelRight = Math.min(W - edge, Number(safe.right) - edge);
  const panelTop = Math.max(edge, Number(safe.top) + edge);
  const panelBottom = Math.min(H - edge, Number(safe.bottom) - edge);
  return { panelX, panelRight, panelW: panelRight - panelX, panelTop, panelBottom,
    panelH: panelBottom - panelTop, innerX: panelX + 16, innerW: panelRight - panelX - 32 };
}
function portraitPlates(list) {
  const { innerX, innerW, panelBottom } = portraitCard();
  const gap = 12, h = 84;
  const w = Math.max(1, (innerW - gap * (list.length - 1)) / list.length);
  const y = Math.min(H - h - 44, panelBottom - h - 16);
  return list.map((p, i) => ({ ...p, x: innerX + i * (w + gap), y, w, h }));
}

export class FlightPrototypeState {
  static portraitMode = 'frame';
  constructor({ hero = 'b33p', seed = 7, onExit, carried = null, hull = 4, arrive = null, act = 1 } = {}) {
    this.hero = hero; this.seed = seed; this.onExit = onExit; this.paused = false;
    this.carried = carried; this.hull = hull; this.arrive = arrive; this.actNo = act;
    this.panelIdx = 0; this.panelT = 0; this.hudT = arrive ? 0 : HUD_IN;
    this.hudTitle = 'FLIGHT LAB';
    // The reveal's clock, carried on from the run's at a handover.
    this.revealT = Number.isFinite(arrive?.revealT) ? arrive.revealT : 99;
  }

  enter() {
    Input.setContext('flight');
    // A finger or key that was holding JUMP across the handover is still
    // holding it: the tub keeps climbing instead of stalling on the swap.
    Input.restoreHeld?.(this.carried);
    this.carried = null;
    warmPassage();
    this.relayout();
    this.setButtons();
  }

  makeModel(layout) {
    const a = this.arrive;
    return new FlightModel(layout, this.seed, { hull: this.hull, act: this.actNo,
      scroll: a?.scroll, scrollV: a?.scrollV });
  }

  relayout() {
    const frame = presentationFrame();
    const layout = currentFlightLayout(frame);
    if (this.model) this.model.resize(layout); else this.model = this.makeModel(layout);
    this.height = H; this.revision = frame.revision;
    this.hudTop = flightHudTop(frame);
    if (this.panel()) this.setButtons();
  }

  exit() {
    Input.setButtons([]); Input.setChromeButtons([]);
    Input.setMenuKeys?.(false);
    Input.setContext('default');
  }

  // ---- panels: paused, or the vehicle is down
  panel() {
    if (this.paused) return 'paused';
    if (this.model?.phase === 'dead' && this.offerRetry()) return 'down';
    if (this.model?.phase === 'won' && !this.onComplete) return 'down';
    return null;
  }
  offerRetry() { return true; }
  canRestart() { return false; }
  plateList() {
    if (this.panel() === 'paused') {
      const list = [{ id: 'resume', action: 'pause', label: 'RESUME' }, { id: 'quit', action: 'quit', label: 'EXIT' }];
      if (this.canRestart()) list.push({ id: 'restart', action: 'restart', label: 'RESTART' });
      return list;
    }
    return [{ id: 'retry', action: 'retry', label: 'RETRY' }, { id: 'quit', action: 'quit', label: 'EXIT' }];
  }
  plates() {
    const list = this.plateList();
    return isPhonePortraitPresentation() ? portraitPlates(list) : landscapePlates(list);
  }
  setButtons() {
    this.touchButtons = Input.usingTouch; this.chromeGen = chrome.gen;
    if (this.panel()) { Input.setChromeButtons([]); Input.setButtons(this.plates()); return; }
    Input.setButtons([]);
    Input.setChromeButtons(Input.usingTouch ? runChromeButtons({ hasPower: false }) : []);
  }
  panelChanged() {
    this.panelIdx = 0; this.panelT = 0;
    this.setButtons();
    Input.setMenuKeys?.(!!this.panel());
  }

  update(dt) {
    if (H !== this.height || presentationFrame().revision !== this.revision) this.relayout();
    if (Input.usingTouch !== this.touchButtons || chrome.gen !== this.chromeGen) this.setButtons();
    this.hudT += dt; if (!this.paused) this.revealT += dt;
    const was = this.panel();
    if (!was && (Input.pressed('escape') || Input.pressed('pause'))) this.paused = true;
    // The press that opened a card is spent: the card reads input from the next frame.
    if (this.panel() !== was) { this.panelChanged(); return; }
    if (this.panel()) { this.updatePanel(dt); return; }
    this.step(dt);
    if (this.panel()) this.panelChanged();
  }

  // On touch the picture is a steering surface too: put a finger anywhere off
  // the discs and drag it up or down, and the tub follows the drag (the tub
  // goes where the finger has moved it from where it started), easing to a
  // hover when the finger stops or lifts. The discs still work alongside it.
  // The model counts what happened; the sounds follow the counts, once each.
  soundCounts() {
    const m = this.model, c = this.counts || (this.counts = { fired: 0, pinged: 0, warned: 0, hurts: 0, phase: m.phase });
    if ((m.fired || 0) > c.fired) { Audio.sfx('flightShot'); c.fired = m.fired; }
    if ((m.pinged || 0) > c.pinged) { Audio.sfx('flightPing'); c.pinged = m.pinged; }
    if ((m.warned || 0) > c.warned) { Audio.sfx('flightWarn'); c.warned = m.warned; }
    if ((m.hurts || 0) > c.hurts) { Audio.sfx('flightHurt'); c.hurts = m.hurts; }
    if (m.phase !== c.phase) {
      if (m.phase === 'fall' || (m.phase === 'won' && m.pattern.final)) Audio.sfx('flightPop');
      if (m.phase === 'dead') Audio.sfx('powerDown');
      if (m.phase === 'midpoint') Audio.sfx('smallBoom');
      c.phase = m.phase;
    }
  }
  step(dt) {
    let up = Input.held('jump'), down = Input.held('slide');
    const steer = this.steerTarget();
    if (steer != null && !up && !down) {
      const dy = steer - this.model.y, dead = 6 * this.model.layout.scale;
      up = dy < -dead; down = dy > dead;
    }
    // The tub fires on the song's half-beats: the pellets and their sound are
    // part of the music, as everything on a rhythm cabinet is.
    const beat = Audio.songBeat();
    let fireNow = null;
    if (Number.isFinite(beat)) {
      const half = Math.floor(beat * 2);
      fireNow = this.lastHalf != null && half !== this.lastHalf;
      this.lastHalf = half;
    } else this.lastHalf = null;
    this.model.update(dt, up, down, fireNow);
    this.soundCounts();
  }
  steerTarget() {
    let finger = null;
    for (const [id, t] of Input.touches || []) {
      if (t.isButton || t.action) continue;
      finger = { id, t };
      break;
    }
    if (!finger) { this.drag = null; return null; }
    if (!this.drag || this.drag.id !== finger.id) this.drag = { id: finger.id, fy: finger.t.y, my: this.model.y };
    const l = this.model.layout;
    const target = this.drag.my + (finger.t.y - this.drag.fy) * DRAG_GAIN;
    // A drag past the band's edge re-anchors, so reversing answers at once.
    const lo = l.top + l.radius, hi = l.bottom - l.radius;
    if (target < lo || target > hi) {
      const c = Math.max(lo, Math.min(hi, target));
      this.drag.my = c; this.drag.fy = finger.t.y;
      return c;
    }
    return target;
  }

  updatePanel(dt) {
    this.panelT += dt;
    const kind = this.panel();
    // JUMP was the climb a moment ago: a press still held from the fight must
    // not be read as RETRY the instant the card goes up.
    if (kind === 'down' && this.panelT < 0.5) return;
    const plates = Input.buttons?.length ? Input.buttons : this.plates();
    const n = plates.length;
    let act = ['quit', 'retry', 'restart'].find((a) => Input.pressed(a)) || null;
    if (!act && kind === 'paused' && (Input.pressed('pause') || Input.pressed('escape') || Input.pressed('back'))) act = 'pause';
    if (!act) {
      if (Input.pressed('up') || Input.pressed('left')) { this.panelIdx = (this.panelIdx + n - 1) % n; Audio.sfx('ui'); }
      if (Input.pressed('down') || Input.pressed('right')) { this.panelIdx = (this.panelIdx + 1) % n; Audio.sfx('ui'); }
      if (Input.pressed('confirm')) act = plates[this.panelIdx]?.action || null;
    }
    if (!act) return;
    Audio.sfx('uiConfirm');
    this.choose(act);
  }

  choose(act) {
    if (act === 'quit') { this.leave(); return; }
    if (act === 'restart') { this.restart?.(); return; }
    if (act === 'pause') { this.paused = false; this.panelChanged(); return; }
    if (act === 'retry') {
      if (this.model.phase === 'won') this.model.checkpoint = 0;
      this.model.restore(); this.panelChanged();
    }
  }
  leave() { this.onExit?.(); }

  // ---- drawing
  // Power banks already on in the passage (scene.js drawPassage).
  passageBanks() { return { banks: 0 }; }
  bossMood() {
    const m = this.model;
    if (m.phase === 'midpoint' || m.phase === 'fall' || m.hitFlash > 0) return 'sour';
    // Gloating as the chase opens (the run hands him over smiling) and over a downed tub.
    if (m.phase === 'dead' || (m.lead > 0 && m.phase === 'first')) return 'smile';
    return 'flat';
  }

  draw(c) {
    // The overlay paints the whole frame; the backbuffer under it is one fill.
    c.fillStyle = '#191523'; c.fillRect(0, 0, W, H);
    const paint = (d) => this.paint(d);
    if (!pushOverlayDraw(paint)) paint(c);
    declareRunChrome(CHROME_SHIM);
  }

  paint(d) {
    this.paintWorld(d);
    this.paintHud(d);
    if (this.panel()) this.paintPanel(d);
  }

  paintWorld(d) {
    const m = this.model, l = m.layout;
    const beat = Audio.songBeat();
    drawPassage(d, { scroll: m.scroll, top: l.top, bottom: l.bottom, ...this.passageBanks() });
    if (Number.isFinite(this.arrive?.plugX)) drawGiantPlug(d, this.arrive.plugX - m.scroll, l.bottom, l.scale);
    this.paintScenery(d);
    drawPassageReveal(d, { top: l.top, bottom: l.bottom, scroll: m.scroll, rt: this.revealT, act: this.actNo, heroX: l.px, heroY: m.y, s: l.scale });
    const t = this.artClock();
    if (m.warning && m.warning.kind === 'column') this.paintColumnWarning(d, m.warning.gapY, m.pattern.columnGap, 'spark');
    else if (m.warning) {
      d.strokeStyle = '#ffbf6680'; d.lineWidth = 1; d.setLineDash([5, 5]); d.beginPath();
      for (const k of m.warning.fan ? [-1, 0, 1] : [0]) {
        d.moveTo(l.bx - 25 * l.scale, m.warning.source); d.lineTo(l.px, m.warning.y + k * m.warning.fan);
      }
      d.stroke(); d.setLineDash([]);
      drawTextCenteredForPresentation(d, '!', l.bx - 34, m.warning.source - 14, '#ffd17b', 1.6, 'bold');
    }
    if (m.phase === 'final' && m.fin.mode === 'surge' && !m.fin.fired) this.paintColumnWarning(d, m.fin.gapY, BACKUP.surgeGap, 'surge');
    if (m.beam) this.paintBeam(d, t);
    for (const p of m.pellets) this.paintPellet(d, p, l.scale);
    for (const p of m.shots) {
      if (p.kind === 'spark' || p.kind === 'surge') { this.paintSpark(d, p, t); continue; }
      d.fillStyle = '#ffbb60'; d.beginPath(); d.arc(p.x, p.y, 6, 0, Math.PI * 2); d.fill();
      d.fillStyle = '#fff0bf'; d.beginPath(); d.arc(p.x - 1, p.y, 3, 0, Math.PI * 2); d.fill();
    }
    d.globalAlpha = m.grace > 0 && m.lead <= 0 ? 0.55 + 0.45 * Math.abs(Math.sin(m.t * 16)) : 1;
    this.paintStreaks(d);
    this.paintHero(d);
    d.globalAlpha = 1;
    this.paintBoss(d, beat);
  }
  // Scenery behind the actors that a subclass owns (the mains lever, 6-3's shutter).
  paintScenery() {}
  // The pictures' clock: the model's, carried on from the run's at a handover
  // so faces, rotors and jets do not jump on the swap frame.
  artClock() { return this.model.t + (this.arrive?.clock || 0); }
  heroClock() { return this.artClock(); }
  heroPose() { return null; }
  paintHero(d) {
    const m = this.model, l = m.layout;
    drawFlightHero(d, this.hero, this.heroX ?? l.px, m.y, l.scale, { t: this.heroClock(), thrust: this.heroThrust(), pose: this.heroPose(), lean: this.heroLean() });
  }
  // The forward lean, with a little more nose-down diving and less climbing.
  heroLean() {
    const vy = this.model.vy || 0;
    return FLIGHT_LEAN + Math.max(-1, Math.min(1, vy / 240)) * 0.07;
  }
  // How hard the air streams past: full at cruise, none stopped.
  streakAmount() { return Math.max(0, Math.min(1, (this.model.scrollV || 0) / 110)); }
  paintStreaks(d) {
    const m = this.model, l = m.layout, s = l.scale, k = this.streakAmount();
    if (k <= 0.01) return;
    drawSpeedStreaks(d, (this.heroX ?? l.px) - 36 * s, m.y + 9 * s, s, m.scroll, k);
    if (!m.pattern.final || m.phase === 'first' || m.phase === 'midpoint' || m.phase === 'second') {
      if (m.phase !== 'won' && m.phase !== 'fall') drawSpeedStreaks(d, l.bx - 40 * s, m.by + 8 * s, s, m.scroll + 50, k);
    }
  }

  // A bolt: a bright head with a tail that fades back along its path.
  paintPellet(d, p, s) {
    const len = 16 * s, h = 3.2 * s;
    const g = d.createLinearGradient(p.x - len, p.y, p.x, p.y);
    g.addColorStop(0, 'rgba(133,239,255,0)'); g.addColorStop(0.7, 'rgba(133,239,255,0.6)'); g.addColorStop(1, 'rgba(230,255,255,1)');
    d.fillStyle = g;
    d.beginPath(); d.moveTo(p.x - len, p.y); d.lineTo(p.x - 3 * s, p.y - h); d.lineTo(p.x + 2 * s, p.y); d.lineTo(p.x - 3 * s, p.y + h); d.closePath(); d.fill();
    d.fillStyle = '#ffffff'; d.beginPath(); d.arc(p.x - 1 * s, p.y, 2.2 * s, 0, Math.PI * 2); d.fill();
    d.fillStyle = 'rgba(133,239,255,0.35)'; d.beginPath(); d.arc(p.x - 1 * s, p.y, 4.5 * s, 0, Math.PI * 2); d.fill();
  }
  // Act III's sparks (the coils) and BACKUP POWER's surge orbs.
  paintSpark(d, p, t) {
    const s = this.model.layout.scale;
    if (p.kind === 'surge') {
      const g = d.createRadialGradient(p.x, p.y, 0, p.x, p.y, 13 * s);
      g.addColorStop(0, 'rgba(255,244,200,1)'); g.addColorStop(0.45, 'rgba(255,150,60,0.95)'); g.addColorStop(1, 'rgba(255,110,40,0)');
      d.fillStyle = g; d.beginPath(); d.arc(p.x, p.y, 13 * s, 0, Math.PI * 2); d.fill();
      return;
    }
    d.strokeStyle = 'rgba(255,248,170,0.95)'; d.lineWidth = 1.4 * s;
    d.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = t * 9 + i * Math.PI / 2;
      d.moveTo(p.x, p.y); d.lineTo(p.x + Math.cos(a) * 8 * s, p.y + Math.sin(a) * 8 * s);
    }
    d.stroke();
    d.fillStyle = '#fffbe0'; d.beginPath(); d.arc(p.x, p.y, 4.2 * s, 0, Math.PI * 2); d.fill();
  }
  // A column about to come: its sparks' places along the boss's side, and the gap.
  paintColumnWarning(d, gapY, gap, kind) {
    const l = this.model.layout, s = l.scale;
    const lo = l.top + l.radius * 0.4, hi = l.bottom - l.radius * 0.4, step = 44 * s, half = this.model.columnGapPx(gap) / 2;
    const x = l.bx - 25 * s;
    d.fillStyle = kind === 'surge' ? 'rgba(255,150,60,0.45)' : 'rgba(255,240,150,0.45)';
    for (let y = lo; y <= hi + 0.01; y += step) {
      if (Math.abs(y - gapY) < half) continue;
      d.beginPath(); d.arc(x, y, 3 * s, 0, Math.PI * 2); d.fill();
    }
    d.strokeStyle = 'rgba(160,255,200,0.7)'; d.lineWidth = 1.5;
    d.beginPath(); d.moveTo(x - 8 * s, gapY - half + 6 * s); d.lineTo(x - 14 * s, gapY - half + 6 * s);
    d.moveTo(x - 8 * s, gapY + half - 6 * s); d.lineTo(x - 14 * s, gapY + half - 6 * s); d.stroke();
  }
  // BACKUP POWER's beam: the band it will fill while it charges, then the beam.
  paintBeam(d, t) {
    const m = this.model, l = m.layout, s = l.scale, ms = l.mscale || s;
    const half = Math.max(4, m.beamHalf() - 19 * s), x1 = l.bx - 50 * ms;
    if (!m.beam.on) {
      const k = Math.min(1, m.beam.t / BACKUP.charge);
      d.fillStyle = `rgba(255,96,64,${0.08 + 0.14 * k})`;
      d.fillRect(0, m.beam.y - half, x1, half * 2);
      d.strokeStyle = `rgba(255,140,100,${0.4 + 0.4 * k})`; d.lineWidth = 1; d.setLineDash([6, 5]);
      d.beginPath(); d.moveTo(0, m.beam.y - half); d.lineTo(x1, m.beam.y - half); d.moveTo(0, m.beam.y + half); d.lineTo(x1, m.beam.y + half); d.stroke();
      d.setLineDash([]);
      return;
    }
    const g = d.createLinearGradient(0, m.beam.y - half, 0, m.beam.y + half);
    g.addColorStop(0, 'rgba(255,120,60,0)'); g.addColorStop(0.3, 'rgba(255,170,90,0.9)');
    g.addColorStop(0.5, 'rgba(255,252,235,1)'); g.addColorStop(0.7, 'rgba(255,170,90,0.9)'); g.addColorStop(1, 'rgba(255,120,60,0)');
    d.fillStyle = g; d.fillRect(0, m.beam.y - half, x1, half * 2);
  }
  heroThrust() {
    const m = this.model;
    return Math.min(1, 0.32 + Math.abs(m.vy || 0) / 400);
  }

  paintBoss(d, beat) {
    const m = this.model, l = m.layout;
    if (m.pattern.final) { this.paintAct3Boss(d, beat); return; }
    const sag = m.phase === 'midpoint' ? Math.sin(m.midpointTime / 3 * Math.PI) * 14 : 0;
    const size = FLIGHT_BOSS_SIZE * l.scale;
    const cy = flightBossCentre(m.by, l.scale) + sag;
    drawFlightBoss(d, l.bx, cy, size, { t: this.artClock(), beat, mood: this.bossMood(), hitT: m.hitFlash > 0 ? 0.3 : 0 });
    if (m.checkpoint || m.phase === 'midpoint') {
      plate(d, l.bx - 36 * l.scale, m.by + 4 * l.scale + sag, 19 * l.scale, 9 * l.scale, '#77717f', 2);
      for (let i = 0; i < 3; i++) { d.fillStyle = '#edb55e'; d.fillRect(l.bx - 34 * l.scale + i * 4 * l.scale, m.by + 3 * l.scale + sag, 2 * l.scale, 11 * l.scale); }
    }
  }

  // Act III: the balloon; its pop and his drop; the machine rising; BACKUP POWER.
  paintAct3Boss(d, beat, o = {}) {
    const m = this.model, l = m.layout, s = l.scale, ms = l.mscale || s, t = this.artClock();
    const hitY = m.by + 7 * s;
    if (m.phase === 'first' || m.phase === 'second' || m.phase === 'midpoint') {
      const sag = m.phase === 'midpoint' ? Math.sin(m.midpointTime / 3 * Math.PI) * 14 : 0;
      drawFlightBalloon(d, l.bx, hitY + sag, s, { patches: Math.min(3, Math.floor((100 - m.hp) / 25)), t });
      // The coils he deploys at halfway, on the basket's side.
      if (m.checkpoint || m.phase === 'midpoint') {
        const cy = hitY + 52 * s + sag;
        for (let i = 0; i < 3; i++) plate(d, l.bx - 33 * s + i * 4 * s, cy - 6 * s, 2.6 * s, 12 * s, '#f2c14e', 1);
        if (Math.sin(t * 23) > 0.3) { d.strokeStyle = 'rgba(255,250,190,0.8)'; d.lineWidth = 1; d.beginPath(); d.moveTo(l.bx - 34 * s, cy - 8 * s); d.lineTo(l.bx - 39 * s, cy - 2 * s); d.lineTo(l.bx - 35 * s, cy + 3 * s); d.stroke(); }
      }
      return;
    }
    const machine = (coreY, extra = {}) => {
      const f = m.fin || {};
      const charge = f.mode === 'charge' ? Math.min(1, f.t / BACKUP.charge) : f.mode === 'beam' ? 1 : 0;
      drawBackupMachine(d, l.bx, coreY, ms, { vent: m.vent, charge, t, beat, hit: m.hitFlash, deflect: m.deflect, ...extra });
      // Bolted to the machine: no lean.
      drawFlightBoss(d, l.bx, backupCopterCentre(coreY, ms), FLIGHT_BOSS_SIZE * ms,
        { lean: 0, t, beat, mood: extra.mood || (m.vent > 0.5 ? 'sour' : 'smile'), hitT: m.hitFlash > 0 ? 0.3 : 0 });
    };
    if (m.phase === 'fall') {
      const ft = m.fallTime;
      const popY = (Number.isFinite(m.popY) ? m.popY : m.by) + 7 * s;
      // Burst, then he and the tub drop out of the bottom of the frame.
      const drop = ft > 0.12 ? 0.5 * 1150 * (ft - 0.12) ** 2 : 0;
      if (popY + drop < this.height + 220) drawBalloonBasket(d, l.bx, popY + drop, s, {});
      drawBalloonBurst(d, l.bx, popY, s, ft / 0.55);
      // BACKUP POWER rises from below, the cables drawing the arcade's power.
      if (ft > 2.8) {
        const rise = (1 - smooth01((ft - 2.8) / 2.4)) * (this.height - m.by + 200 * ms);
        machine(m.by + rise, { mood: 'smile' });
      }
      return;
    }
    machine(m.by + (o.sink || 0), o);
  }

  hudScale() { return isPhonePortraitPresentation() ? 1.45 : 1; }
  hudOffset() {
    const k = Math.max(0, Math.min(1, this.hudT / HUD_IN));
    return -90 * (1 - k * k * (3 - 2 * k));
  }

  paintHud(d) {
    const m = this.model, l = m.layout, s = this.hudScale();
    const portrait = isPhonePortraitPresentation();
    const top = this.hudTop + this.hudOffset();
    if (!portrait) { this.paintSlimHud(d, top); return; }
    // Portrait leaves the PAUSE disc its corner.
    const right = portrait ? W - 76 : W - 12;
    drawPanel(d, 12, top + 7, right - 12, 53, 8, 'rgba(24,20,33,0.93)', { border: 'rgba(255,255,255,0.14)' });
    drawTextForPresentation(d, this.hudTitle, 23, textYForMid(top + 21, s, 'bold'), '#94e3e7', s, 'bold');
    // Hull as battery cells, the run's own picture of how much you can take.
    const cells = m.maxHull, cw = 9 * s, ch = 11 * s, gap = 3 * s;
    let x = right - 10 - cells * (cw + gap) + gap;
    for (let i = 0; i < cells; i++) {
      plate(d, x, top + 21 - ch / 2, cw, ch, i < m.hull ? '#7be38b' : '#3a3346', 2);
      x += cw + gap;
    }
    // BACKUP POWER gets its own bar, filling as the machine assembles.
    const backup = m.pattern.final && (m.phase === 'final' || m.phase === 'won' || (m.phase === 'fall' && m.fallTime > 3));
    const label = backup ? 'BACKUP POWER' : 'EGGSHELL';
    const frac = !backup ? m.hp / 100
      : m.phase === 'fall' ? smooth01((m.fallTime - 3) / 2.2) : m.finalHp / BACKUP.hp;
    const ly = top + 44;
    drawTextForPresentation(d, label, 23, textYForMid(ly, s * 0.9, 'bold'), backup ? '#ffb38a' : '#e8e2f0', s * 0.9, 'bold');
    const bx = 23 + textWidth(label, s * 0.9, 'bold') + 10, bw = right - 10 - bx;
    plate(d, bx, ly - 6, bw, 12, '#41364c', 4);
    plate(d, bx + 2, ly - 4, Math.max(0, (bw - 4) * frac), 8, m.hitFlash ? '#fff3ce' : backup ? '#ff8a5c' : '#eab35a', 3);
    if (!backup) { d.fillStyle = '#171321'; d.fillRect(bx + bw / 2, ly - 6, 2, 12); }
    if (m.lead > 0 && m.phase === 'first' || (m.lead > 0 && m.phase === 'second' && this.showHintOnRetry)) {
      drawTextCenteredForPresentation(d, Input.usingTouch ? 'DRAG UP OR DOWN  ·  OR HOLD JUMP / SLIDE' : 'HOLD JUMP TO RISE  ·  SLIDE TO DROP', W / 2,
        textYForMid(l.top + 22, s * 0.9, 'bold'), '#e8dcba', s * 0.9, 'bold');
    }
    const said = m.phase === 'midpoint' ? (MIDPOINT_LINES[this.actNo] || MIDPOINT_LINES[1])
      : m.phase === 'fall' && m.fallTime > 1.9 && m.fallTime < 4.2 ? ['BACKUP. POWER.', 'DRAWING ON THE ARCADE...'] : null;
    if (said) {
      drawPanel(d, 45, l.top + 5, W - 90, 46, 8, 'rgba(238,234,242,0.96)');
      drawTextCenteredForPresentation(d, said[0], W / 2, textYForMid(l.top + 22, s, 'bold'), '#30273c', s, 'bold');
      drawTextCenteredForPresentation(d, said[1], W / 2, textYForMid(l.top + 40, s * 0.8, 'ui'), '#675b75', s * 0.8, 'ui');
    }
    if (portrait) this.paintCaptions(d);
  }

  // Landscape: one row the height of the run's status pill — hull cells, the
  // boss bar with its name inside it, nothing else.
  paintSlimHud(d, top) {
    const m = this.model, l = m.layout;
    const backup = m.pattern.final && (m.phase === 'final' || m.phase === 'won' || (m.phase === 'fall' && m.fallTime > 3));
    const frac = !backup ? m.hp / 100 : m.phase === 'fall' ? smooth01((m.fallTime - 3) / 2.2) : m.finalHp / BACKUP.hp;
    const y = top + 4, h = 16;
    drawPanel(d, 6, y, W - 12, h, 6, 'rgba(24,20,33,0.85)', { border: 'rgba(255,255,255,0.12)' });
    let x = 12;
    for (let i = 0; i < m.maxHull; i++) { plate(d, x, y + 4, 6, 8, i < m.hull ? '#7be38b' : '#3a3346', 1.5); x += 9; }
    const bx = x + 6, bw = W - 18 - bx;
    plate(d, bx, y + 3, bw, h - 6, '#41364c', 3);
    plate(d, bx + 1, y + 4, Math.max(0, (bw - 2) * frac), h - 8, m.hitFlash ? '#fff3ce' : backup ? '#ff8a5c' : '#eab35a', 2.5);
    if (!backup) { d.fillStyle = '#171321'; d.fillRect(bx + bw / 2, y + 3, 1.5, h - 6); }
    drawTextForPresentation(d, backup ? 'BACKUP POWER' : 'EGGSHELL', bx + 5, textYForMid(y + h / 2, 0.75, 'bold'), '#2a2132', 0.75, 'bold');
    const said = m.phase === 'midpoint' ? (MIDPOINT_LINES[this.actNo] || MIDPOINT_LINES[1])
      : m.phase === 'fall' && m.fallTime > 1.9 && m.fallTime < 4.2 ? ['BACKUP. POWER.', 'DRAWING ON THE ARCADE...'] : null;
    if (said) {
      drawPanel(d, 90, l.top + 4, W - 180, 34, 8, 'rgba(238,234,242,0.96)');
      drawTextCenteredForPresentation(d, said[0], W / 2, textYForMid(l.top + 16, 1, 'bold'), '#30273c', 1, 'bold');
      drawTextCenteredForPresentation(d, said[1], W / 2, textYForMid(l.top + 30, 0.75, 'ui'), '#675b75', 0.75, 'ui');
    } else if (m.lead > 0 && m.phase === 'first') {
      drawTextCenteredForPresentation(d, Input.usingTouch ? 'DRAG UP OR DOWN  ·  OR HOLD JUMP / SLIDE' : 'HOLD JUMP TO RISE  ·  SLIDE TO DROP', W / 2,
        textYForMid(l.top + 12, 0.85, 'bold'), '#e8dcba', 0.85, 'bold');
    }
  }

  // The run's portrait legend under the two discs: same words, same place.
  paintCaptions(d) {
    const frame = presentationFrame();
    const layout = portraitHudLayout(frame);
    const sc = Number(layout.scale) > 0 ? Number(layout.scale) : 1;
    const s = layout.actionLabelScale || 1.8;
    for (const [id, label] of [['jump', 'JUMP'], ['slide', 'SLIDE']]) {
      const control = layout.touch?.controls?.[id];
      if (!control || !Number.isFinite(Number(control.cx))) continue;
      const cx = Number(control.cx) / sc;
      const w = (textWidth(label, 0.95, 'bold') + 12) * s;
      drawPanel(d, cx - w / 2, layout.powerLabelY - 7 * s, w, 14 * s, 4 * s, 'rgba(28,32,48,0.72)');
      drawTextCenteredForPresentation(d, label, cx, textYForMid(layout.powerLabelY, 0.95 * s, 'bold'), ACTION_INK[id], 0.95 * s, 'bold');
    }
  }

  panelTitle() { return this.panel() === 'paused' ? 'PAUSED' : this.model.phase === 'won' ? 'POWER BANK RESTORED' : 'VEHICLE DOWN'; }

  paintPanel(d) {
    const plates = Input.buttons?.length ? Input.buttons : this.plates();
    const cursor = !Input.usingTouch;
    const title = this.panelTitle();
    if (isPhonePortraitPresentation()) {
      const { panelX, panelW, panelTop, panelH, innerW } = portraitCard();
      d.fillStyle = 'rgba(0,0,0,0.72)'; d.fillRect(0, 0, W, H);
      drawPanel(d, panelX, panelTop, panelW, panelH, 10, 'rgba(11,11,20,0.94)', { border: 'rgba(72,224,200,0.42)', shadow: true });
      const ts = Math.min(6.4, innerW / Math.max(1, textWidth(title, 1, 'title')));
      drawTextCenteredForPresentation(d, title, W / 2, panelTop + 42, '#fff', ts, 'title');
      drawTextCenteredForPresentation(d, this.hudTitle, W / 2, panelTop + 124, '#e8e8f0', Math.min(3, innerW / Math.max(1, textWidth(this.hudTitle, 1, 'bold'))), 'bold');
      const ls = plates.reduce((sc, b) => Math.min(sc, (b.w - 14) / Math.max(1, textWidth(b.label, 1, 'bold'))), 2.8);
      plates.forEach((b, i) => {
        const go = b.id === 'resume' || b.id === 'retry';
        const sel = cursor && i === this.panelIdx;
        drawPanel(d, b.x, b.y, b.w, b.h, 8, 'rgba(11,11,20,0.88)',
          { border: sel ? '#ffcf33' : go ? 'rgba(72,224,200,0.75)' : 'rgba(255,255,255,0.28)', shadow: true });
        if (sel) drawMenuRow(d, b.x + 2, b.y + 2, b.w - 4, b.h - 4, 6);
        drawTextCenteredForPresentation(d, b.label, b.x + b.w / 2, textYForMid(b.y + b.h / 2, ls, 'bold'), go ? '#48e0c8' : '#c8c8d8', ls, 'bold');
      });
      return;
    }
    d.fillStyle = 'rgba(0,0,0,0.6)'; d.fillRect(0, 0, W, H);
    drawTextCenteredForPresentation(d, title, W / 2, 28, '#fff', 2, 'title');
    drawTextCenteredForPresentation(d, this.hudTitle, W / 2, 66, '#e8e8f0', 1, 'bold');
    plates.forEach((b, i) => {
      const go = b.id === 'resume' || b.id === 'retry';
      const sel = cursor && i === this.panelIdx;
      drawPanel(d, b.x, b.y, b.w, b.h, 5, 'rgba(11,11,20,0.82)',
        { border: sel ? '#ffcf33' : go ? 'rgba(72,224,200,0.75)' : 'rgba(255,255,255,0.22)', shadow: true });
      if (sel) drawMenuRow(d, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 4);
      drawTextCenteredForPresentation(d, b.label, b.x + b.w / 2, textYForMid(b.y + b.h / 2), go ? '#48e0c8' : '#c8c8d8');
    });
  }
}
