// Arcade attract mode: a deterministic live AI demo of a real stage or boss.
// No recorded video — the actual game runs against a throwaway save while the
// DemoBot plays. Any HUMAN input (Input.activity) exits immediately and is
// consumed so it can never navigate a menu.
import { W, H, pushOverlayDraw } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { drawTextCentered } from '../engine/sprites.js';
import { defaultSlot, defaultSettings } from '../engine/save.js';
import { STAGES, STAGE_BY_ID } from '../data/stages.js';
import { CABINET_BY_ID } from '../data/cabinets.js';
import { RunState } from './run.js';
import { BossState, BOSSES } from './boss.js';
import { DemoBot } from './bot.js';
import { Rng } from '../engine/rng.js';

// Shuffled rotation: all 27 stages + 3 bosses appear before any repeat.
let rotation = [];
let clipCounter = 0;
const rotRng = new Rng(0xa77c0de);
export function nextScenario() {
  if (!rotation.length) {
    rotation = [
      ...STAGES.map((s) => ({ kind: 'stage', id: s.id })),
      ...Object.keys(BOSSES).map((b) => ({ kind: 'boss', id: b })),
    ];
    for (let i = rotation.length - 1; i > 0; i--) {
      const j = rotRng.int(0, i);
      [rotation[i], rotation[j]] = [rotation[j], rotation[i]];
    }
  }
  return rotation.pop();
}

// Deterministic per-clip seed from the scenario id + clip index.
function clipSeed(id) {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h ^ (clipCounter++ * 0x9e37)) >>> 0;
}

// A cloned, consequence-free save: demo scores/coins/deaths/settings changes
// go nowhere. persist() is a no-op by design.
function demoSave(realSettings) {
  const slot = defaultSlot();
  slot.tutor = { firstPortal: 1, firstSwitch: 1, firstCharge: 1, firstAbility: 1 };
  const settings = { ...defaultSettings(), ...JSON.parse(JSON.stringify(realSettings || {})) };
  return { data: { version: 2, settings, slots: [slot] }, slot, settings, persist() {} };
}

export class AttractState {
  // opts: { realSettings, onExit(autoAdvance) }
  constructor(opts) { this.o = opts; }

  enter() {
    this.scenario = nextScenario();
    this.actTok = Input.activity;
    Input.clearAll();
    const stage = this.scenario.kind === 'stage' ? STAGE_BY_ID[this.scenario.id] : null;
    const saveObj = demoSave(this.o.realSettings);
    const base = {
      save: saveObj,
      seed: clipSeed(this.scenario.id),
      difficulty: 1,
      demo: true,
      onEnd: () => { this.done = true; },
    };
    this.run = stage
      ? new RunState({ ...base, stage })
      : new BossState({ ...base, bossCab: this.scenario.id });
    this.run.enter();
    this.bot = new DemoBot(this.run);
    // Watchdog: mission/AI deadlocks cannot hold the title hostage.
    this.limit = stage ? stage.durationSec + 45 : 180;
    this.name = stage
      ? `${CABINET_BY_ID[stage.cabinet].name} ${stage.index}`
      : `BOSS: ${(BOSSES[this.scenario.id].name || this.scenario.id).toUpperCase()}`;
    this.done = false;
    this.doneT = 0;
  }

  exit() {
    Input.clearAll();
    if (this.run && this.run.exit) this.run.exit();
  }

  update(dt) {
    // Human input: consume it and bail to the title (no interlude).
    if (Input.activity !== this.actTok) {
      Input.clearAll();
      this.o.onExit(false);
      return;
    }
    if (this.done) {
      this.doneT += dt;
      if (this.doneT >= 0.1) this.o.onExit(true); // natural end -> 10s interlude
      return;
    }
    this.bot.update(dt);
    this.run.update(dt);
    if (!this.done && this.run.tRun > this.limit) this.done = true; // watchdog
  }

  draw(ctx) {
    this.run.draw(ctx);
    // Banner above EVERYTHING, including the hero overlay.
    const name = this.name;
    pushOverlayDraw((d) => {
      d.fillStyle = 'rgba(11,11,20,0.82)';
      d.fillRect(0, H - 28, W, 28);
      drawTextCentered(d, 'DEMO MODE - PRESS ANY KEY / TAP TO RETURN', W / 2, H - 24, '#f6d33c');
      drawTextCentered(d, name, W / 2, H - 13, '#8a8a98');
    });
  }
}
