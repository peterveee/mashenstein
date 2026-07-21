// Boss encounters: runner-verbs only. One shared skeleton, three bosses as data.
// Damage the boss by breaking what it throws at you (the redirect fantasy) —
// stomps, axes, pellets, dashes all count. Every boss has a joke phase.
import { W, H, shake } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { Audio } from '../engine/audio.js';
import { drawText, drawTextCentered, getSprite, UI_PLATE } from '../engine/sprites.js';
import { drawProp } from '../sprites/props.js';
import { VIEW_W, applyWorld } from '../engine/camera.js';
import { RunState, GROUND_Y } from './run.js';
import { makeObstacle } from './entities.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { BOSS_HIT_SHORT, BOSS_DEFLECT_SHORT } from '../data/jokes.js';

// How often a boss hit spends its floatie on the long line instead of a short
// one. Low on purpose: in a sustained fight the long variants stack into a wall
// of text over the boss you are trying to read.
const BOSS_LONG_CHANCE = 0.1;

export const BOSSES = {
  neon: {
    name: 'THE UNDERINSURED CLOWN-COPTER',
    hp: 6, sprite: 'eggshell',
    drops: ['barrel', 'crate', 'cactus'],
    dropEvery: [2.6, 2.0, 1.5],
    jokeAt: 0.5,
    jokeText: 'LOW BATTERY. THE COPTER PAUSES. EGGSHELL DISPUTES ALL DAMAGE SO FAR.',
    fakeBars: 4,
    intro: 'IT HAS FIVE HEALTH BARS. FOUR ARE LABELED "PRESENTATION ERROR".',
  },
  rhythm: {
    name: 'DUST DEVIL 9000 - DEEP CLEAN MODE',
    hp: 8, sprite: 'dustdevil',
    drops: ['barrel', 'crate', 'tombstone'], // it suctions up level junk and hurls it, apologetically
    dropEvery: [2.2, 1.8, 1.4],
    jokeAt: 0.5,
    jokeText: 'IT STOPS TO EMPTY ITS BAG. IT IS VISIBLY ASHAMED. IT APOLOGIZES VIA LED.',
    pull: true,
    intro: 'IT IS SET TO DEEP CLEAN. IT IS SO SORRY ABOUT THIS.',
    subtitle: 'HE HAS MOPPED THE CEILING. HE HAS POLISHED THE INSIDE OF A GLASS TUBE. NOW, HE HAS TO CLEAN YOU. HE IS NOT HAPPY ABOUT IT.',
  },
  surge: {
    name: 'EGGSHELL & THE ABSOLUTELY FINAL POWER STRIP',
    hp: 12, sprite: 'eggshell',
    drops: ['barrel', 'crate', 'drone', 'cardboardMonster', 'chair'],
    dropEvery: [2.0, 1.6, 1.2],
    jokeAt: 0.6,
    jokeText: 'THE CRAYON IQ CERTIFICATE DEPLOYS AS A SHIELD. IT ABSORBS NOTHING.',
    joke2At: 0.25,
    joke2Text: 'HIS SHELL IS STUCK IN THE COPTER DOOR. HE INSISTS THIS IS PHASE FIVE.',
    fakeBars: 4, fakeBarsReal: false,
    switches: true,
    intro: 'THE STRIP HAS ONE MORE SWITCH THAN PHYSICALLY POSSIBLE. DO NOT COUNT THEM.',
  },
};

export class BossState extends RunState {
  constructor(opts) {
    super({ ...opts, stage: null, cabinet: CABINET_BY_ID[opts.bossCab] });
    this.bossCab = opts.bossCab;
    this.boss = BOSSES[opts.bossCab];
    this.unpluggedReal = opts.difficulty === 5;
  }

  enter() {
    super.enter();
    // The arena is the boss's show: suppress the normal obstacle stream.
    this.spawner.cabinet = { ...this.spawner.cabinet, patterns: [] };
    this.mission = { type: 'boss', desc: this.boss.name };
    this.challenge = null;
    this.totalDist = Infinity;
    this.bossHp = this.boss.hp;
    this.bossMax = this.boss.hp;
    this.dropT = 2.5;
    this.jokeDone = false;
    this.joke2Done = false;
    this.jokeT = 0;
    this.bossX = VIEW_W * 0.68;   // first-frame seed, before update() frames it
    this.bossAlt = 60;
    this.speech = { text: this.boss.intro, t: 4, who: 'eggshell' };
    // The Dust Devil's tragedy gets a narrator card after Eggshell's pitch.
    if (this.boss.subtitle) this.speechQueue = [{ text: this.boss.subtitle, t: 4.5, who: null }];
    this.checkpoints = [];
    this.snapshot = this.makeSnapshot();
    this.switchesFlipped = 0;
  }

  phaseIdx() {
    const f = this.bossHp / this.bossMax;
    return f > 0.66 ? 0 : f > 0.33 ? 1 : 2;
  }

  update(dt) {
    if (this.jokeT > 0) {
      this.jokeT -= dt;
      Input.endFrame();
      return;
    }
    super.update(dt);
    if (this.dead || this.paused || this.hitstop > 0) return;

    const wdt = dt;
    // Boss hovers ahead.
    // Framing, not distance: this is "hovering in the upper right of the frame",
    // so it is measured against the VIEW. At a literal 300 the boss would sit
    // well past the right edge of a 213-px-wide view and never be seen.
    this.bossX = this.camX + VIEW_W * 0.62 + Math.sin(this.tRun * 0.9) * VIEW_W * 0.12;
    this.bossAlt = 55 + Math.sin(this.tRun * 1.6) * (this.boss.pull ? 32 : 18);

    // Drop attacks.
    this.dropT -= wdt;
    if (this.dropT <= 0) {
      this.dropT = this.boss.dropEvery[this.phaseIdx()];
      const type = this.rng.pick(this.boss.drops);
      const ob = makeObstacle(type, this.bossX + this.rng.range(-20, 60));
      ob.fromBoss = true;
      this.obstacles.push(ob);
      Audio.sfx('plop');
    }

    // Pull (Dust Devil): drags the player toward it unless jumping on beat.
    if (this.boss.pull && this.phaseIdx() >= 1) {
      if (this.player.grounded) this.camX += 12 * wdt; // suction: world creeps forward under you
    }

    // Hero projectiles that strike the boss directly damage it ("destroy armor
    // with character abilities" — the reliable path for ability-heavy teams).
    // The hit zone reaches the ground — the copter drags its barrel-dropper low,
    // so ground-level pellets and axes connect. Forgiving by design.
    const bossBox = { x: this.bossX - 12, y: GROUND_Y - this.bossAlt - 28, w: 28, h: this.bossAlt + 28 };
    for (const pr of this.projectiles) {
      if (!pr.live || (pr.type !== 'pellet' && pr.type !== 'axe' && pr.type !== 'fist')) continue;
      const pbox = { x: pr.x, y: GROUND_Y - pr.alt - 6, w: 8, h: 10 };
      if (pbox.x < bossBox.x + bossBox.w && pbox.x + pbox.w > bossBox.x && pbox.y < bossBox.y + bossBox.h && pbox.y + pbox.h > bossBox.y) {
        pr.hitIds ||= new Set();
        if (pr.hitIds.has('boss')) continue;
        pr.hitIds.add('boss');
        if (pr.type === 'axe') pr.returning = true; else if (!pr.pierce) pr.live = false;
        this.bossHp--;
        shake(3, 0.2);
        Audio.sfx('boom');
        this.floatText(this.rng.chance(BOSS_LONG_CHANCE) ? 'FORM 27-B: DAMAGE DISPUTE. DENIED.' : this.rng.pick(BOSS_HIT_SHORT), '#f6d33c');
      }
    }

    // Joke phases.
    const f = this.bossHp / this.bossMax;
    if (!this.jokeDone && f <= this.boss.jokeAt) {
      this.jokeDone = true;
      this.jokeT = 2.2;
      this.speech = { text: this.boss.jokeText, t: 4, who: 'eggshell' };
      Audio.sfx('uiBad');
    }
    if (this.boss.joke2At && !this.joke2Done && f <= this.boss.joke2At) {
      this.joke2Done = true;
      this.jokeT = 2.2;
      this.speech = { text: this.boss.joke2Text, t: 4, who: 'eggshell' };
    }

    if (this.bossHp <= 0) this.endRun(true);
  }

  breakObstacle(ob, silent) {
    const wasLive = ob.live;
    super.breakObstacle(ob, silent);
    if (wasLive && ob.fromBoss && this.bossHp > 0) {
      this.bossHp--;
      shake(3, 0.2);
      Audio.sfx('boom');
      this.floatText(this.rng.chance(BOSS_LONG_CHANCE) ? 'THAT ONE DIDN\'T COUNT. - EGGSHELL' : this.rng.pick(BOSS_DEFLECT_SHORT), '#f6d33c');
    }
  }

  endRun(success) {
    if (this.finished) return;
    this.finished = true;
    Audio.setDetune(1);
    this.o.onEnd({
      success, boss: this.bossCab,
      score: Math.floor(this.score), coins: this.coins + (success ? 500 : 0),
      damageTaken: this.damageTaken, bestCombo: 0,
      team: [...this.usedHeroes], time: this.tRun, overtime: false, stage: null,
      challengeDone: false, applianceGot: false, failMsg: this.failMsg,
    });
  }

  draw(ctx) {
    super.draw(ctx);
    // Boss sprite + health bars. super.draw() has already closed its world band,
    // so the boss — a thing IN the world — reopens one; the bars below are HUD.
    const x = Math.round(this.bossX - this.camX);
    const y = Math.round(GROUND_Y - this.bossAlt - 24);
    const big = this.boss.sprite === 'dustdevil';
    ctx.save();
    applyWorld(ctx, this.camZoom);
    drawProp(ctx, this.boss.sprite, x - 12, y, big ? 28 : 24, big ? 24 : 20);
    ctx.fillStyle = 'rgba(200,200,216,0.6)';
    ctx.fillRect(x - 8 + Math.round(Math.sin(this.tRun * 40) * 3), y - 4, 24, 1);
    ctx.restore();

    // Health bars: 1 real + N fake labeled PRESENTATION ERROR.
    const bw = 160;
    const bx = W / 2 - bw / 2, by = H - 40;
    drawTextCentered(ctx, this.boss.name, W / 2, by - 10, '#f0a0a0', 1, 'ui', UI_PLATE);
    ctx.fillStyle = '#20242c';
    ctx.fillRect(bx, by, bw, 6);
    const realOrAllReal = this.unpluggedReal && this.boss.fakeBars ? (this.bossHp / this.bossMax) : (this.bossHp / this.bossMax);
    ctx.fillStyle = '#e04848';
    ctx.fillRect(bx, by, bw * Math.max(0, realOrAllReal), 6);
    if (this.boss.fakeBars) {
      for (let i = 0; i < Math.min(2, this.boss.fakeBars); i++) {
        ctx.fillStyle = '#20242c';
        ctx.fillRect(bx, by + 8 + i * 7, bw, 4);
        ctx.fillStyle = this.unpluggedReal ? '#e04848' : '#5a3a3a';
        ctx.fillRect(bx, by + 8 + i * 7, bw * (this.unpluggedReal ? realOrAllReal : 1), 4);
        drawText(ctx, this.unpluggedReal ? 'REAL NOW' : 'PRESENTATION ERROR', bx + bw + 6, by + 6 + i * 7, '#5a5a68', 1, 'ui', UI_PLATE);
      }
    }
    if (this.jokeT > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, W, H);
      drawTextCentered(ctx, 'LOW BATTERY', W / 2, H / 2 - 20, '#f6d33c', 2, 'ui', UI_PLATE);
      drawTextCentered(ctx, '(THE BOSS FIGHT WILL RESUME SHORTLY)', W / 2, H / 2 + 4, '#8a8a98', 1, 'ui', UI_PLATE);
    }
  }
}
