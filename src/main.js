// MASHENSTEIN: THE UNPLUGGENING — boot + campaign flow orchestration.
import { initRenderer, bctx, blit, setShakeScale } from './engine/renderer.js';
import { startLoop } from './engine/loop.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { save } from './engine/save.js';
import { setState, updateState, drawState } from './engine/states.js';
import { Rng, dailySeed } from './engine/rng.js';
import { buildAllSprites } from './game/draw.js';
import { RunState } from './game/run.js';
import { BossState } from './game/boss.js';
import { MinigameState, MINIGAMES } from './game/minigames/index.js';
import { TitleState, DifficultyState, IntroState, ResultsState, FinaleState, SettingsState, HowToPlayState, FieldGuideState, SoundTestState } from './game/menus.js';
import { HubState, StageSelectState, TeamSelectState, BenchState, ShopState, ArcadeState } from './game/hub/index.js';
import { applyResult } from './game/progress.js';

save.load();
setShakeScale(save.settings.screenShake);

const Flow = {
  lastTeam: null,
  pendingCab: null,
  pendingStage: null,
  pendingCorrupted: [],
  pendingBoss: false,

  toTitle() { setState(new TitleState({
    save,
    onSlotChosen: (i, isNew) => {
      if (isNew) {
        save.newSlot(i, Date.now());
        setState(new DifficultyState({ save, onDone: () => setState(new IntroState({ onDone: () => {
          save.slot.campaign.storyFlags.sawIntro = true;
          save.persist();
          Flow.toHub();
        } })) }));
      } else {
        save.selectSlot(i);
        Flow.toHub();
      }
    },
    onOvertime: () => {
      const slotIdx = save.data.slots.findIndex((s) => s && s.campaign.storyFlags.sawEnding);
      if (slotIdx >= 0) { save.selectSlot(slotIdx); Flow.startOvertime(); }
    },
    onSettings: () => setState(new SettingsState({ save, onDone: () => { setShakeScale(save.settings.screenShake); Flow.toTitle(); } })),
    onHowTo: () => setState(new HowToPlayState({ onDone: () => Flow.toTitle() })),
    onGuide: () => setState(new FieldGuideState({ onDone: () => Flow.toTitle() })),
    onSoundTest: () => setState(new SoundTestState({ onDone: () => Flow.toTitle() })),
  })); },

  toHub() { setState(new HubState({ save, flow: Flow })); },

  openCabinet(cab) {
    // First power-on: a breaker-box minigame powers the cabinet.
    const flags = save.slot.campaign.storyFlags;
    flags.minigamesSeen = flags.minigamesSeen || [];
    if (!flags['powered_' + cab.id]) {
      const unseen = MINIGAMES.filter((m) => !flags.minigamesSeen.includes(m));
      const pool = unseen.length ? unseen : MINIGAMES;
      const game = pool[new Rng(cab.id + save.slot.stats.runs).int(0, pool.length - 1)];
      flags.minigamesSeen.push(game);
      setState(new MinigameState({
        game,
        seed: (Date.now() & 0xffff) ^ 17,
        settings: save.settings,
        onEnd: (success) => {
          flags['powered_' + cab.id] = true;
          if (success) { save.slot.coins += 300; }
          save.persist();
          setState(new StageSelectState({ save, cab, flow: Flow }));
        },
      }));
      return;
    }
    setState(new StageSelectState({ save, cab, flow: Flow }));
  },

  pickTeam(cab, stage, corrupted, boss = false) {
    this.pendingCab = cab; this.pendingStage = stage; this.pendingCorrupted = corrupted || []; this.pendingBoss = boss;
    setState(new TeamSelectState({
      save, flow: Flow,
      onGo: (team) => {
        if (this.pendingBoss) Flow.startBoss(cab.id, team);
        else Flow.startStage(cab, this.pendingStage, team, this.pendingCorrupted);
      },
    }));
  },

  startStage(cab, stage, team, corrupted) {
    setState(new RunState({
      stage, team, save,
      seed: (Date.now() ^ (stage ? stage.id.length * 7919 : 0)) >>> 0,
      difficulty: save.slot.difficulty,
      corrupted,
      onEnd: (result) => {
        const gains = applyResult(save, result);
        setState(new ResultsState({ result, gains, save, onDone: () => Flow.toHub() }));
      },
    }));
  },

  startBoss(cabId, team) {
    setState(new BossState({
      bossCab: cabId, team, save,
      seed: (Date.now() ^ 0xb055) >>> 0,
      difficulty: save.slot.difficulty,
      onEnd: (result) => {
        if (result.success) {
          save.slot.campaign.bossesDown[cabId] = true;
          save.persist();
        }
        const gains = applyResult(save, result);
        setState(new ResultsState({ result, gains, save, onDone: () => {
          if (result.success && cabId === 'surge') Flow.startFinale();
          else Flow.toHub();
        } }));
      },
    }));
  },

  startFinale() {
    setState(new FinaleState({ save, onDone: () => Flow.toHub() }));
  },

  startOvertime(seedOverride) {
    setState(new RunState({
      overtime: true, save,
      team: Flow.lastTeam || ['lorenzo', 'gnash', 'mochi'],
      seed: seedOverride ?? dailySeed(),
      difficulty: save.slot.difficulty,
      onEnd: (result) => {
        const gains = applyResult(save, result);
        setState(new ResultsState({ result, gains, save, onDone: () => Flow.toHub() }));
      },
    }));
  },

  openBench() { setState(new BenchState({ save, flow: Flow })); },
  openShop() { setState(new ShopState({ save, flow: Flow })); },
  openArcade() { setState(new ArcadeState({ save, flow: Flow })); },

  playMinigame(game, replay) {
    setState(new MinigameState({
      game,
      seed: Date.now() & 0xffff,
      settings: save.settings,
      onEnd: (success) => {
        if (success && replay) { save.slot.coins += 100; save.persist(); }
        Flow.openArcade();
      },
    }));
  },
};

function boot() {
  initRenderer();
  Input.init();
  buildAllSprites();
  Input.onAnyGesture = () => {
    Audio.ensure();
    Audio.setMuted(save.settings.muted);
  };
  Flow.toTitle();
  startLoop({
    update: (dt) => updateState(dt),
    draw: () => { drawState(bctx); blit(); },
  });
  window.__mash_booted = true;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
