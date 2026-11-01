import { FlightPrototypeState } from './state.js';
import { W, H, isPhonePortraitPresentation } from '../../engine/renderer.js';
import { Audio } from '../../engine/audio.js';
import { MusicDirector } from '../../engine/music-director.js';
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { drawPanel, drawTextCenteredForPresentation, textYForMid } from '../../engine/sprites.js';
import { drawFlightBoss, flightBossCentre, FLIGHT_BOSS_SIZE, plate } from './scene.js';
import { ACT_ENDINGS } from './acts.js';

// The flight as the end of a stage. The run owns everything up to the moment
// the passage fills the screen (run.js updateFlightExit); this state owns the
// fight from there, the checkpoint writes, and the escape that ends the act.
// No campaign writes in draw.
const VICTORY_T = 3.5;
const UNPLUGGED_DOWN_T = 1.2;

export class CampaignFlightState extends FlightPrototypeState {
  constructor({ pending, act = ACT_ENDINGS[pending?.stageId] || ACT_ENDINGS['rhythm-3'], settings, musicSong,
    arrive = null, carried = null, hull = 4,
    onMidpoint, onComplete, onExit, onRestart, onFail }) {
    super({ hero: pending.result.finalHero || 'b33p', seed: pending.seed, onExit, carried, hull, arrive, act: act.act });
    this.pending = pending; this.act = act; this.settings = settings || {};
    this.musicSong = musicSong;
    this.onMidpoint = onMidpoint; this.onComplete = onComplete;
    this.onRestart = onRestart; this.onFail = onFail;
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
    if (this.model.phase === 'won') { if (!this.exitBoss) this.beginVictory(); this.updateVictory(dt); return; }
    if (this.downT != null) {
      this.downT += dt;
      if (this.downT >= UNPLUGGED_DOWN_T) { this.completed = true; this.onFail?.(this.seconds, this.hits); }
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
    if (m.phase === 'dead' && !this.offerRetry()) this.downT = 0;
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
    if (this.victoryT >= VICTORY_T + (this.model.pattern.final ? 1.2 : 0)) { this.completed = true; this.onComplete?.(this.seconds, this.hits); }
  }

  // The banks earlier acts restored are on; this act's comes on behind him as he
  // escapes, lamp by lamp from the left.
  // Act III's BACKUP POWER takes the lit ones back, from the right, as it
  // assembles, and its defeat brings all three on at once.
  passageBanks() {
    const m = this.model, before = Math.max(0, this.act.bank - 1);
    if (m.pattern.final) {
      if (m.phase === 'fall') return { banks: before, stealX: m.fallTime < 2 ? Infinity : W - (m.fallTime - 2) * 520 };
      if (m.phase === 'final') return { banks: 0 };
      if (m.phase === 'won') return { banks: 0, waveBank: 'all', waveX: (this.victoryT - 0.8) * 420 };
    }
    if (m.phase !== 'won') return { banks: before };
    return { banks: before, waveBank: before, waveX: (this.victoryT - 0.5) * 520 };
  }

  paintBoss(d, beat) {
    const m = this.model, l = m.layout, e = this.exitBoss;
    if (m.phase !== 'won' || !e) { super.paintBoss(d, beat); return; }
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

  paint(d) {
    super.paint(d);
    if (this.model.phase === 'won') this.paintVictory(d);
    else if (this.downT != null) this.paintDown(d);
  }

  // A plate across the top of the flight band, clear of the hero's column, with
  // one pip per act lit up to this one.
  paintVictory(d) {
    const l = this.model.layout, s = isPhonePortraitPresentation() ? 1.45 : 1;
    const k = Math.min(1, Math.max(0, (this.victoryT - 0.9) / 0.4));
    if (k <= 0) return;
    const y = l.top + 10 + (1 - k) * -18, w = Math.min(W - 60, 300 * s), x = (W - w) / 2, h = 54 * s;
    drawPanel(d, x, y, w, h, 10, `rgba(33,26,43,${0.93 * k})`, { border: 'rgba(255,218,135,0.5)', shadow: true });
    d.globalAlpha = k;
    drawTextCenteredForPresentation(d, this.act.bankText, W / 2, textYForMid(y + 18 * s, s * 1.15, 'bold'), '#ffda87', s * 1.15, 'bold');
    drawTextCenteredForPresentation(d, this.act.completeText, W / 2, textYForMid(y + 36 * s, s * 0.9, 'bold'), '#e3dce9', s * 0.9, 'bold');
    for (let i = 0; i < 3; i++) plate(d, W / 2 - 28 * s + i * 22 * s, y + h - 9 * s, 12 * s, 5 * s, i < this.act.bank ? '#f5c871' : '#55495c', 2);
    d.globalAlpha = 1;
  }

  paintDown(d) {
    const s = isPhonePortraitPresentation() ? 1.45 : 1;
    d.fillStyle = 'rgba(0,0,0,0.45)'; d.fillRect(0, 0, W, H);
    drawTextCenteredForPresentation(d, 'VEHICLE DOWN', W / 2, textYForMid(this.model.layout.top + 60, 2 * s, 'title'), '#f4c46d', 2 * s, 'title');
  }
}
