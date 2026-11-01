import { FlightPrototypeState } from './state.js';
import { W, H, isPhonePortraitPresentation, presentationFrame } from '../../engine/renderer.js';
import { Audio } from '../../engine/audio.js';
import { MusicDirector } from '../../engine/music-director.js';
import { CABINET_BY_ID } from '../../data/cabinets.js';
import { drawPanel, drawTextCenteredForPresentation, textYForMid } from '../../engine/sprites.js';
import { drawFlightBoss, flightBossCentre, FLIGHT_BOSS_SIZE, plate, drawMainsLever, mainsGrip, MAINS_LEVER, drawMainsSpark, drawShutter, drawHeroTub, flightHeroFloor, FLIGHT_HERO_H, FLIGHT_LEAN, TUB } from './scene.js';
import { drawToon } from '../../sprites/toons.js';
import { ACT_ENDINGS } from './acts.js';

// THE ENDING (victory clock): Eggshell limps off; the passage carries the
// tub to the MAINS lever on the wall and stops there (an arrival, not a
// camera freeze); the tub sets down on the rail; the hero hops out, runs to
// the lever, jumps for its grip and rides it down with his own weight — clunk,
// spark, ON goes green, the bank's lamps race away along the rails; he lets
// go, lands and celebrates; the plate. (Peter, 1 Nov: "land, jump out and
// click a switch", replacing the plug the tub shoved into a socket.)
const END = { arrive: 1.3, land: 3.0, hop: 3.3, run: 3.75, leap: 4.25, grab: 4.6, pull: 4.78, clunk: 5.05, drop: 5.2, floor: 5.45, plate: 5.9, done: 8.4 };
const ease01 = (x) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };
const UNPLUGGED_DOWN_T = 1.2;

export class CampaignFlightState extends FlightPrototypeState {
  constructor({ pending, act = ACT_ENDINGS[pending?.stageId] || ACT_ENDINGS['rhythm-3'], settings, musicSong,
    arrive = null, carried = null, hull = 4, banksBefore = null, devLastHit = null,
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
    this.devLastHit = devLastHit;
  }

  enter() {
    super.enter();
    this.model.checkpoint = this.pending.checkpoint; this.model.restore();
    // Dev SCENES ▸ EGGSHELL DEFEAT: a pellet from the win ('boss': his last
    // 3 HP — one on-beat shot, two off it; 'core': BACKUP POWER's last point,
    // taken at its first vent).
    if (this.devLastHit === 'boss') this.model.hp = 3;
    else if (this.devLastHit === 'core') this.model.finalHp = 1;
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

  // The lever lives in passage space: placed ahead at `arrive`, with the
  // passage's scroll steered so it comes to rest in Eggshell's old column.
  updateEnding(dt) {
    const vt = this.victoryT, m = this.model, l = m.layout, s = l.scale;
    if (!this.ending && vt >= END.arrive) {
      const leverX = l.bx - 4 * s;
      this.ending = { leverScroll: m.scroll + (W + 80 * s) - leverX, leverX };
    }
    const e = this.ending;
    if (!e) return;
    const left = e.leverScroll - m.scroll;
    const tStop = Math.max(0.05, END.land - vt);
    const wantV = vt < END.land ? Math.max(0, 2 * left / tStop - m.scrollV) : 0;
    m.scrollV += (wantV - m.scrollV) * Math.min(1, dt * 6);
    if (vt >= END.land) { m.scrollV = 0; m.scroll = e.leverScroll; }
    // The floor is the bottom rail; the pivot sits a hero and a half above it.
    const G = l.bottom + 8, P = { x: e.leverX - (e.leverScroll - m.scroll), y: G - 70 * s };
    const grip0 = mainsGrip(P, s, MAINS_LEVER.off);
    const tubX = grip0.x - 150 * s, outX = tubX + 46 * s, underX = grip0.x - 12 * s;
    // The tub flies to its spot and sets down: its base on the rail, a bump.
    const restY = G - 15 * s - (TUB.bottom + 0.4) * (FLIGHT_HERO_H * s / 24);
    const k = ease01((vt - END.arrive) / (END.land - END.arrive));
    this.heroX = (this.heroX ?? l.px) + ((l.px + (tubX - l.px) * k) - (this.heroX ?? l.px)) * Math.min(1, dt * 6);
    const bump = vt > END.land ? Math.sin(Math.min(1, (vt - END.land) / 0.25) * Math.PI) * 3 * s : 0;
    m.y += (restY - m.y) * Math.min(1, dt * (vt < END.land ? 3 + 6 * k : 30)); m.vy = 0;
    if (vt >= END.land && !e.landed) { e.landed = true; Audio.sfx('plop', { gain: 0.6 }); }
    e.tubBump = bump;
    // The lever: up until he hangs on it, then down under his weight.
    let ang = MAINS_LEVER.off;
    if (vt >= END.grab) ang += 0.05 * ease01((vt - END.grab) / 0.12);
    if (vt >= END.pull) { const q = Math.min(1, (vt - END.pull) / (END.clunk - END.pull)); ang = MAINS_LEVER.off + 0.05 + (MAINS_LEVER.on - MAINS_LEVER.off - 0.05) * q * q; }
    e.P = P; e.ang = ang; e.jaw = mainsGrip(P, s * 0.62, MAINS_LEVER.on);
    // The hero: in the tub, then on his own feet (`feet` is where they are).
    const tubFloor = flightHeroFloor(m.y, s);
    const arc = (a, b, q, hgt) => a + (b - a) * q - Math.sin(q * Math.PI) * hgt;
    let h;
    if (vt < END.hop) h = { inTub: true };
    else if (vt < END.run) {
      const q = (vt - END.hop) / (END.run - END.hop);
      h = { x: outX - 46 * s * (1 - q), feet: arc(tubFloor, G, q, 38 * s), pose: { kind: 'jump', grounded: false, vy: q < 0.5 ? -320 : 320, time: vt } };
    } else if (vt < END.leap) {
      const q = (vt - END.run) / (END.leap - END.run);
      h = { x: outX + (underX - outX) * q, feet: G, pose: { kind: 'run', grounded: true, time: vt } };
    } else if (vt < END.grab) {
      const q = (vt - END.leap) / (END.grab - END.leap), top = grip0.y + 36 * s;
      h = { x: underX + (grip0.x - underX) * q, feet: G + (top - G) * (1 - (1 - q) ** 2), pose: { kind: 'jump', grounded: false, vy: -320, time: vt } };
    } else if (vt < END.drop) {
      const g = mainsGrip(P, s, ang);
      h = { x: g.x, feet: g.y + 36 * s, pose: { kind: 'celebrate', grounded: false, time: 0.15 } };
    } else if (vt < END.floor) {
      const g = mainsGrip(P, s, MAINS_LEVER.on), q = (vt - END.drop) / (END.floor - END.drop);
      h = { x: g.x, feet: g.y + 36 * s + (G - g.y - 36 * s) * q * q, pose: { kind: 'jump', grounded: false, vy: 320, time: vt } };
    } else {
      const g = mainsGrip(P, s, MAINS_LEVER.on);
      h = { x: g.x, feet: G, pose: { kind: 'celebrate', grounded: true, headTurn: 0, time: vt - END.floor } };
    }
    e.hero = h;
    if (vt >= END.hop && !e.hopped) { e.hopped = true; Audio.sfx('jump', { gain: 0.7 }); }
    if (vt >= END.grab && !e.grabbed) { e.grabbed = true; Audio.sfx('clickHard', { gain: 0.5 }); }
    if (vt >= END.clunk && !this.levered) { this.levered = true; e.sparkT = vt; Audio.sfx('switchFlick'); Audio.sfx('power', { inSeconds: 0.1 }); }
    if (vt >= END.done) { this.completed = true; this.onComplete?.(this.seconds, this.hits); }
  }

  // Levels out as it comes in to land.
  heroLean() {
    if (this.model.phase !== 'won') return super.heroLean();
    return FLIGHT_LEAN * (1 - ease01((this.victoryT - END.arrive) / (END.land - END.arrive)));
  }
  streakAmount() { return this.model.phase === 'won' && this.ending?.landed ? 0 : super.streakAmount(); }

  heroThrust() {
    const e = this.ending;
    if (this.model.phase === 'won' && e) return e.landed ? 0 : 0.3;
    return super.heroThrust();
  }

  // Out of the tub the hero is his own figure beside it.
  paintHero(d) {
    const h = this.ending?.hero;
    if (!h || h.inTub) { super.paintHero(d); return; }
    const m = this.model, s = m.layout.scale, u = FLIGHT_HERO_H * s / 24;
    drawToon(d, this.hero, h.pose, h.x, h.feet, 24 * u);
    drawHeroTub(d, this.heroX, flightHeroFloor(m.y, s) + (this.ending.tubBump || 0), { u, thrust: 0, t: this.artClock() });
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
      if (m.phase === 'won') return { banks: 0, waveBank: 'all', waveX: this.levered ? (this.victoryT - END.clunk) * 700 : -Infinity };
    }
    if (m.phase !== 'won') return { banks: before };
    // This act's bank comes on along the rails once the lever is down.
    return { banks: before, waveBank: before, waveX: this.levered ? (this.victoryT - END.clunk) * 700 : -Infinity };
  }

  paintBoss(d, beat) {
    const m = this.model, l = m.layout, e = this.exitBoss;
    if (m.phase !== 'won' || !e) { super.paintBoss(d, beat); return; }
    // The flash where the lever closes on its jaws.
    const en = this.ending;
    if (en?.sparkT != null) drawMainsSpark(d, en.jaw.x, en.jaw.y, l.scale, (this.victoryT - en.sparkT) / 0.5);
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
    const m = this.model, l = m.layout, e = this.ending;
    if (m.phase === 'won' && e?.P) drawMainsLever(d, e.P, l.scale, { ang: e.ang, on: !!this.levered, t: this.victoryT });
    // 6-3: the shutter he drops behind him as he leaves the game. It starts
    // down while the hero is still crossing and shuts once the whole tub is
    // through: it rides the passage's own scroll, so it never catches him.
    // Its plane starts ahead of the tub and comes back with the passage; it
    // descends to just over the tub while it approaches and slams only once
    // the whole tub (gun and all) is past it: no collision, nothing to dodge.
    if (this.act.act === 2 && Number.isFinite(this.arrive?.plugX) && this.revealT < 8) {
      const s = l.scale, x = this.arrive.plugX + 180 - m.scroll, w = 34 * s;
      const heroLeft = (this.heroX ?? l.px) - (TUB.halfW + 1.4) * (FLIGHT_HERO_H * s / 24) - 6 * s;
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
