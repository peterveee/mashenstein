import { FlightPrototypeState } from './state.js';
import { W, H, isPhonePortraitPresentation, presentationFrame } from '../../engine/renderer.js';
import { Audio } from '../../engine/audio.js';
import { MusicDirector } from '../../engine/music-director.js';
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { drawPanel, drawTextCenteredForPresentation, textYForMid } from '../../engine/sprites.js';
import { drawFlightBoss, flightBossCentre, FLIGHT_BOSS_SIZE, plate, drawSocketPanel, drawShutter } from './scene.js';
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
const END = { socketIn: 1.6, reach: 3.2, seat: 3.9, lamps: 4.3, plate: 5.0, done: 7.2 };
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
    // The socket panel comes in from the right; the tub rises or drops to its
    // line, and the plug goes in on the beat its cue was placed for.
    const vt = this.victoryT, l = this.model.layout;
    const sx = W + 80 - ease01((vt - END.socketIn) / 1.2) * (W + 80 - (l.bx - 10));
    this.socket = { x: sx, y: (l.top + l.bottom) / 2, seat: ease01((vt - END.reach) / (END.seat - END.reach)) };
    const want = this.socket.y - 2;
    this.model.y += (want - this.model.y) * Math.min(1, dt * 3);
    if (vt >= END.seat && !this.plugged) { this.plugged = true; Audio.sfx('socketDrop'); Audio.sfx('switchFlick', { inSeconds: 0.25 }); }
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
      if (m.phase === 'won') return { banks: 0, waveBank: 'all', waveX: this.plugged ? (this.victoryT - END.lamps) * 620 : -Infinity };
    }
    if (m.phase !== 'won') return { banks: before };
    // The bank comes on from the socket once the plug is in.
    return { banks: before, waveBank: before, waveX: this.plugged ? (this.victoryT - END.lamps) * 620 : -Infinity };
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

  paintScenery(d) {
    const m = this.model, l = m.layout;
    if (m.phase === 'won' && this.socket) {
      drawSocketPanel(d, this.socket.x, this.socket.y, l.scale, this.socket.seat, this.victoryT);
    }
    // 6-3: the shutter he drops behind him as he leaves the game. It starts
    // down while the hero is still crossing and shuts once the whole tub is
    // through: it rides the passage's own scroll, so it never catches him.
    if (this.act.act === 2 && Number.isFinite(this.arrive?.plugX) && this.revealT < 6) {
      const x = this.arrive.plugX - 300 - m.scroll;
      const drop = l.top + ease01((this.revealT - 0.9) / 0.5) * (l.bottom - l.top + 24);
      if (x > -60 && x < W + 60) {
        drawShutter(d, x, l.top - 24, drop, l.scale);
        if (!this.slammed && this.revealT >= 1.4) { this.slammed = true; Audio.sfx('gateSlam'); }
      }
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
