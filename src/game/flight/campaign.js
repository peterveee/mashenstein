import { FlightPrototypeState } from './state.js';
import { W, H, isPhonePortraitPresentation, presentationFrame } from '../../engine/renderer.js';
import { Audio } from '../../engine/audio.js';
import { MusicDirector } from '../../engine/music-director.js';
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { drawPanel, drawTextCenteredForPresentation, textYForMid } from '../../engine/sprites.js';
import { drawFlightBoss, flightBossCentre, FLIGHT_BOSS_SIZE, plate, drawBreakerPanel, drawHangingPlug, drawPlugSpark, breakerSocketPoint, drawShutter } from './scene.js';
import { ACT_ENDINGS } from './acts.js';

// The flight as the end of a stage. The run owns everything up to the moment
// the passage fills the screen (run.js updateFlightExit); this state owns the
// fight from there, the checkpoint writes, and the escape that ends the act.
// No campaign writes in draw.
// The ending, in beats of the victory clock: Eggshell limps off (acts I and II)
// or the machine gives out (III); the tub flies on to the arcade's mains
// socket on its breaker panel; the hero pushes the plug home; the bank's
// lamps come on from it; the plate says what has been won. Peter, 1 Nov:
// "should there be some sort of proper ending, not just eggshell flying off?"
// Beats of the victory clock: he is gone; the passage carries the tub to the
// breaker panel and stops there (an arrival, not a camera freeze); the plug
// hangs swinging off the top rail; the tub noses up and shoves it home — a
// bounce, a spark, the breaker flips, the pilot lamp goes green; the bank's
// lamps race away along the rails; the hero celebrates; the plate.
const END = { arrive: 1.3, stop: 3.0, push: 3.35, seat: 3.75, lever: 4.05, lamps: 4.3, plate: 5.2, done: 7.6 };
const ease01 = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const UNPLUGGED_DOWN_T = 1.2;

export class CampaignFlightState extends FlightPrototypeState {
  constructor({ pending, act = ACT_ENDINGS[pending?.stageId] || ACT_ENDINGS['rhythm-3'], settings, musicSong,
    arrive = null, carried = null, hull = 4, banksBefore = null,
    onMidpoint, onComplete, onExit, onRestart, onFail, onDown }) {
    super({ hero: pending.result.finalHero || 'b33p', seed: pending.seed, onExit, carried, hull, arrive, act: act.act });
    this.pending = pending; this.act = act; this.settings = settings || {};
    this.musicSong = musicSong;
    this.onMidpoint = onMidpoint; this.onComplete = onComplete;
    this.onRestart = onRestart; this.onFail = onFail; this.onDown = onDown;
    this.banksBefore = Number.isFinite(banksBefore) ? banksBefore : Math.max(0, act.bank - 1);
    this.victoryT = 0; this.completed = false; this.downT = null;
    this.seconds = pending.flightSeconds || 0; this.hits = pending.flightHits || 0;
    this.hudTitle = act.hudTitle;
  }

  enter() {
    super.enter();
    this.model.checkpoint = this.pending.checkpoint; this.model.restore();
    // Arriving from the run, the song is already the stage's and already at its
    // tempo. Resuming a saved fight from the cabinet screen it is not: warm the
    // engine the way the run's own enter() does, in the run's order.
    if (!this.arrive) this.startMusic();
    if (!MusicDirector.pending) Audio.setSilentLaneSkip?.(true);
    this.lastCheckpoint = this.model.checkpoint; this.previousHull = this.model.hull;
  }

  startMusic() {
    const bank = this.musicSong?.bank || CABINET_BY_ID[this.act.cabinet].music;
    Audio.warmSongTables?.(bank, this.musicSong?.mix);
    MusicDirector.enterStage(bank, {
      mixOverride: this.musicSong?.mix, arrangementOverride: this.musicSong?.arrangement,
      variants: this.musicSong?.variants,
    });
    // setBank resets the warp; a beat stage that had ramped carries its tempo.
    if (Number.isFinite(this.pending.laneTempo) && this.pending.laneTempo > 0) Audio.setWarp(this.pending.laneTempo, 1);
    Audio.prepareRealtimeVoices?.({ startStep: Audio.step, windowSteps: 256 });
    Audio.prefill?.(1.2);
    Audio.warmWorkletLanes?.();
  }

  exit() {
    super.exit();
    Audio.setSilentLaneSkip?.(false);
    MusicDirector.endStage();
  }

  // UNPLUGGED is one hit in the flight as it is in the run: the vehicle going
  // down ends the attempt, so there is no RETRY card to offer.
  offerRetry() { return this.model.maxHull > 1; }
  canRestart() { return !!this.onRestart; }
  restart() { this.onRestart?.(); }
  leave() { this.onExit?.({ seconds: this.seconds, hits: this.hits }); }

  update(dt) {
    if (this.completed) return;
    // A rotation during the escape or the downed beat still relays.
    if (H !== this.height || presentationFrame().revision !== this.revision) this.relayout();
    if (this.model.phase === 'won') { if (!this.exitBoss) this.beginVictory(); this.updateVictory(dt); return; }
    if (this.downT != null) {
      this.downT += dt;
      if (this.downT >= UNPLUGGED_DOWN_T) { this.completed = true; this.onFail?.(); }
      return;
    }
    super.update(dt);
    const m = this.model;
    if (!this.paused && !['dead', 'won'].includes(m.phase)) this.seconds += dt;
    if (m.hull < this.previousHull) this.hits += this.previousHull - m.hull;
    this.previousHull = m.hull;
    if (m.checkpoint !== this.lastCheckpoint) {
      this.lastCheckpoint = m.checkpoint;
      this.onMidpoint?.(this.seconds, this.hits, m.checkpoint);
      Audio.sfx('checkpoint');
    }
    if (m.phase === 'won') this.beginVictory();
    if (m.phase === 'dead' && !this.offerRetry() && this.downT == null) { this.downT = 0; this.onDown?.(this.seconds, this.hits); }
  }

  beginVictory() {
    const m = this.model;
    this.paused = false; this.panelChanged();
    Audio.sfx('power');
    this.exitBoss = { x: m.layout.bx, y: m.by, vx: 40, t: 0 };
  }

  // He escapes: the rotor stutters, he climbs and accelerates off the right
  // edge, and the bank the act fought for comes on along the rails behind him.
  updateVictory(dt) {
    this.victoryT += dt;
    this.model.advanceScroll(dt);
    const e = this.exitBoss;
    // A beat of sputter where he was hit — the tub drops and rattles — then he
    // climbs away and accelerates off the right edge.
    if (e && this.model.pattern.final) {
      e.t += dt;
      e.sink = e.t < 0.9 ? Math.sin(e.t * 47) * 1.5 : 0.5 * 420 * (e.t - 0.9) ** 2;
    } else if (e) {
      e.t += dt;
      if (e.t < 0.55) { e.y += Math.sin(e.t / 0.55 * Math.PI) * 26 * dt; e.jx = Math.sin(e.t * 61) * 2.2; }
      else { e.jx = 0; e.vx += 240 * dt; e.x += e.vx * dt; e.y -= (30 + (e.t - 0.55) * 46) * dt; }
    }
    this.updateEnding(dt);
  }

  // The panel lives in passage space: it is placed ahead at `arrive`, and the
  // passage's scroll is steered so it comes to rest at the right column.
  updateEnding(dt) {
    const vt = this.victoryT, m = this.model, l = m.layout, s = l.scale;
    if (!this.ending && vt >= END.arrive) {
      const panelX = l.bx - 22 * s;
      this.ending = { panelScroll: m.scroll + (W + 70 * s) - panelX, panelX, swing: 0.55, swingV: 0, pushed: false, sparkT: null };
    }
    const e = this.ending;
    if (!e) return;
    // The passage eases to a stop so the panel lands on its column at END.stop.
    const left = e.panelScroll - m.scroll;
    const tStop = Math.max(0.05, END.stop - vt);
    const wantV = vt < END.stop ? Math.max(0, 2 * left / tStop - m.scrollV) : 0;
    m.scrollV += (wantV - m.scrollV) * Math.min(1, dt * 6);
    if (vt >= END.stop) { m.scrollV = 0; m.scroll = e.panelScroll; }
    const socket = breakerSocketPoint(e.panelX - (e.panelScroll - m.scroll), (l.top + l.bottom) / 2 - 14 * s, s);
    e.socket = socket;
    // The plug hangs from the top rail, left of the socket, and swings.
    e.pivot = { x: socket.x - 46 * s, y: l.top - 10 };
    const L = socket.y - e.pivot.y;
    if (!e.pushed) {
      // A pendulum, nudged by the passage's slowing, then shoved by the tub.
      const g = 9.5;
      e.swingV += (-g / Math.max(40, L / s) * Math.sin(e.swing) * 60 - e.swingV * 0.4) * dt;
      e.swing += e.swingV * dt;
      e.tip = { x: e.pivot.x + Math.sin(e.swing) * L * 0.92 + 22 * s, y: e.pivot.y + Math.cos(e.swing) * L * 0.92 };
      e.ang = e.swing * 0.6;
      if (vt >= END.push) { e.pushed = true; e.from = { ...e.tip }; e.fromAng = e.ang; Audio.sfx('flightShot', { gain: 0.5 }); }
    } else {
      // Into the socket with an overshoot, then seated.
      const k = ease01((vt - END.push) / (END.seat - END.push));
      const bump = Math.sin(Math.min(1, k) * Math.PI) * 4 * s;
      e.tip = { x: e.from.x + (socket.x - e.from.x) * k + bump * 0.3, y: e.from.y + (socket.y - e.from.y) * k - bump };
      e.ang = e.fromAng * (1 - k);
      e.seat = ease01((vt - END.seat + 0.12) / 0.12);
    }
    // The tub comes up behind the plug and gives it the shove.
    const heroWantX = vt < END.push ? l.px + (e.tip.x - 74 * s - l.px) * ease01((vt - END.arrive) / (END.push - END.arrive)) : e.tip.x - 72 * s + 8 * s * ease01((vt - END.push) / 0.3);
    this.heroX = this.heroX == null ? l.px : this.heroX + (heroWantX - this.heroX) * Math.min(1, dt * 5);
    const heroWantY = e.tip.y + 2 * s;
    m.y += (heroWantY - m.y) * Math.min(1, dt * 4);
    if (vt >= END.seat && !this.plugged) { this.plugged = true; e.sparkT = vt; Audio.sfx('socketDrop'); }
    if (vt >= END.lever && !this.levered) { this.levered = true; Audio.sfx('switchFlick'); Audio.sfx('power', { inSeconds: 0.1 }); }
    if (vt >= END.done) { this.completed = true; this.onComplete?.(this.seconds, this.hits); }
  }

  // The banks earlier acts restored are on; this act's comes on behind him as he
  // escapes, lamp by lamp from the left.
  // Act III's BACKUP POWER takes the lit ones back, from the right, as it
  // assembles, and its defeat brings all three on at once.
  passageBanks() {
    const m = this.model, before = this.banksBefore;
    if (m.pattern.final) {
      if (m.phase === 'fall') return { banks: before, stealX: m.fallTime < 2 ? Infinity : W - (m.fallTime - 2) * 520 };
      if (m.phase === 'final') return { banks: 0 };
      if (m.phase === 'won') return { banks: 0, waveBank: 'all', waveX: this.levered ? (this.victoryT - END.lamps) * 700 : -Infinity };
    }
    if (m.phase !== 'won') return { banks: before };
    // The bank comes on from the socket once the plug is in.
    // From the panel outward, both ways, once the breaker is up.
    return { banks: before, waveBank: before, waveX: this.levered ? (this.victoryT - END.lamps) * 700 : -Infinity };
  }

  paintBoss(d, beat) {
    const m = this.model, l = m.layout, e = this.exitBoss;
    if (m.phase !== 'won' || !e) { super.paintBoss(d, beat); return; }
    // The plug, over the tub that is pushing it.
    if (this.ending?.socket) {
      const en = this.ending, s = l.scale, vt = this.victoryT;
      drawHangingPlug(d, en.pivot, en.tip, en.ang, s, { seated: en.seat || 0 });
      if (en.sparkT != null) drawPlugSpark(d, en.socket.x, en.socket.y, s, (vt - en.sparkT) / 0.5);
    }
    // BACKUP POWER gives out: the core goes dark, the fan runs down, and the
    // machine sinks away with him on top of it.
    if (m.pattern.final) {
      this.paintAct3Boss(d, beat, { sink: e.sink || 0, broken: Math.min(1, this.victoryT / 0.8), mood: 'sour', cables: this.victoryT < 0.8 });
      return;
    }
    if (e.x - FLIGHT_BOSS_SIZE * l.scale > W) return;
    // Lamps dead, face sour, and the rattle of the bonk while he limps away.
    drawFlightBoss(d, e.x + (e.jx || 0), flightBossCentre(e.y, l.scale), FLIGHT_BOSS_SIZE * l.scale,
      { t: m.t + this.victoryT, beat, mood: 'sour', hitT: 0.5 + 0.5 * Math.max(0, 1 - this.victoryT) });
  }

  // Plug in: he celebrates, the finish pole's own pose.
  heroPose() {
    if (this.model.phase === 'won' && this.levered) return { kind: 'celebrate', grounded: true, headTurn: 0, time: this.victoryT - END.lever };
    return null;
  }

  paintScenery(d) {
    const m = this.model, l = m.layout, e = this.ending;
    if (m.phase === 'won' && e?.socket) {
      const s = l.scale, vt = this.victoryT;
      const panelX = e.panelX - (e.panelScroll - m.scroll), panelY = (l.top + l.bottom) / 2 - 14 * s;
      drawBreakerPanel(d, panelX, panelY, s, { lever: ease01((vt - END.lever) / 0.25), lamp: this.levered ? 'on' : 'wait', t: vt });
    }
    // 6-3: the shutter he drops behind him as he leaves the game. It starts
    // down while the hero is still crossing and shuts once the whole tub is
    // through: it rides the passage's own scroll, so it never catches him.
    // Its plane starts ahead of the tub and comes back with the passage; it
    // descends to just over the tub while it approaches and slams only once
    // the whole tub (gun and all) is past it: no collision, nothing to dodge.
    if (this.act.act === 2 && Number.isFinite(this.arrive?.plugX) && this.revealT < 8) {
      const s = l.scale, x = this.arrive.plugX + 180 - m.scroll, w = 34 * s;
      const heroLeft = (this.heroX ?? l.px) - 42 * s * (50 / 24) / 1.4 - 6 * s;
      const tubTop = m.y - 36 * s;
      if (!this.shutterSlam && x + w < heroLeft) this.shutterSlam = this.revealT;
      const hover = ease01(this.revealT / 1.1) * Math.max(0, tubTop - 12 * s - (l.top - 24));
      const slam = this.shutterSlam == null ? 0 : ease01((this.revealT - this.shutterSlam) / 0.14);
      const drop = (l.top - 24) + hover + slam * ((l.bottom + 24) - (l.top - 24) - hover);
      if (x > -60 && x < W + 60) drawShutter(d, x, l.top - 24, drop, s);
      if (this.shutterSlam != null && !this.slammed && this.revealT >= this.shutterSlam + 0.12) { this.slammed = true; Audio.sfx('gateSlam'); }
    }
  }

  paint(d) {
    super.paint(d);
    if (this.model.phase === 'won') this.paintVictory(d);
    else if (this.downT != null) this.paintDown(d);
  }

  // A plate across the top of the flight band, clear of the hero's column, with
  // one pip per act lit up to this one.
  paintVictory(d) {
    const l = this.model.layout, s = isPhonePortraitPresentation() ? 1.45 : 1;
    const k = Math.min(1, Math.max(0, (this.victoryT - END.plate) / 0.4));
    if (k <= 0) return;
    const y = l.top + 10 + (1 - k) * -18, w = Math.min(W - 60, 300 * s), x = (W - w) / 2, h = 54 * s;
    drawPanel(d, x, y, w, h, 10, `rgba(33,26,43,${0.93 * k})`, { border: 'rgba(255,218,135,0.5)', shadow: true });
    d.globalAlpha = k;
    drawTextCenteredForPresentation(d, this.act.bankText, W / 2, textYForMid(y + 18 * s, s * 1.15, 'bold'), '#ffda87', s * 1.15, 'bold');
    drawTextCenteredForPresentation(d, this.act.completeText, W / 2, textYForMid(y + 36 * s, s * 0.9, 'bold'), '#e3dce9', s * 0.9, 'bold');
    for (let i = 0; i < 3; i++) plate(d, W / 2 - 28 * s + i * 22 * s, y + h - 9 * s, 12 * s, 5 * s, i < (this.model.pattern.final ? 3 : this.banksBefore + 1) ? '#f5c871' : '#55495c', 2);
    d.globalAlpha = 1;
  }

  paintDown(d) {
    const s = isPhonePortraitPresentation() ? 1.45 : 1;
    d.fillStyle = 'rgba(0,0,0,0.45)'; d.fillRect(0, 0, W, H);
    drawTextCenteredForPresentation(d, 'VEHICLE DOWN', W / 2, textYForMid(this.model.layout.top + 60, 2 * s, 'title'), '#f4c46d', 2 * s, 'title');
  }
}
