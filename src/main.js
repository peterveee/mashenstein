// MASHENSTEIN: THE UNPLUGGENING — boot + campaign flow orchestration.
import { initRenderer, bctx, blit, setShakeScale, setFancyFx } from './engine/renderer.js';
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
import { POWER_DEFS } from './game/powerups.js';
import { TitleState, DifficultyState, IntroState, ResultsState, FinaleState, SettingsState, HowToPlayState, FieldGuideState, SoundTestState } from './game/menus.js';
import { HubState, StageSelectState, BenchState, ShopState, ArcadeState } from './game/hub/index.js';
import { applyResult } from './game/progress.js';
import { CastState } from './game/cast.js';
import { AttractState } from './game/attract.js';

save.load();
setShakeScale(save.settings.screenShake);

// Idle attract cycle: meet the cast, then two playable demos, then round again.
const ATTRACT_CYCLE = ['cast', 'demo', 'demo'];
let attractStep = 0;
const nextAttract = () => ATTRACT_CYCLE[attractStep % ATTRACT_CYCLE.length];

const Flow = {
  lastTeam: null,
  pendingCab: null,
  pendingStage: null,
  pendingCorrupted: [],
  pendingBoss: false,

  toTitle(opts = {}) { setState(new TitleState({
    save,
    attractDelay: opts.attractDelay,
    attractLabel: nextAttract() === 'cast' ? 'CAST ROLL' : 'DEMO',
    onAttract: () => Flow.startAttract(),
    onSlotChosen: (i, isNew) => {
      Flow.hubPosition = null;
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
    onGuide: () => setState(new FieldGuideState({ settings: save.settings, onDone: () => Flow.toTitle() })),
    onSoundTest: () => setState(new SoundTestState({ onDone: () => Flow.toTitle() })),
  })); },

  toHub() { setState(new HubState({ save, flow: Flow })); },

  startAttract() {
    const kind = nextAttract();
    attractStep++;
    const opts = {
      realSettings: save.settings,
      onExit: (auto) => Flow.toTitle(auto ? { attractDelay: 10 } : {}),
    };
    setState(kind === 'cast' ? new CastState(opts) : new AttractState(opts));
  },

  openCabinet(cab) {
    // First power-on: a breaker-box minigame powers the cabinet. Touch devices
    // skip it — the minigames want a keyboard and are miserable on glass.
    const flags = save.slot.campaign.storyFlags;
    flags.minigamesSeen = flags.minigamesSeen || [];
    if (!flags['powered_' + cab.id] && Input.isTouchDevice()) {
      flags['powered_' + cab.id] = true;
      save.persist();
    }
    if (!flags['powered_' + cab.id]) {
      const rr = new Rng(cab.id + save.slot.stats.runs);
      const unseen = MINIGAMES.filter((m) => !flags.minigamesSeen.includes(m));
      const pool = unseen.length ? unseen : MINIGAMES;
      const game = pool[rr.int(0, pool.length - 1)];
      const reward = rr.pick(Object.keys(POWER_DEFS));
      flags.minigamesSeen.push(game);
      setState(new MinigameState({
        game,
        seed: (Date.now() & 0xffff) ^ 17,
        settings: save.settings,
        bonusText: `BONUS: ${POWER_DEFS[reward].name} ON YOUR NEXT RUN`,
        onEnd: (success) => {
          flags['powered_' + cab.id] = true;
          if (success) {
            save.slot.coins += 300;
            flags.pendingPowerup = reward;
          }
          save.persist();
          setState(new StageSelectState({ save, cab, flow: Flow }));
        },
      }));
      return;
    }
    setState(new StageSelectState({ save, cab, flow: Flow }));
  },

  // Team select is gone: stages start immediately with the full cast in play.
  pickTeam(cab, stage, corrupted, boss = false) {
    if (boss) Flow.startBoss(cab.id);
    else Flow.startStage(cab, stage, this.pendingCorrupted = corrupted || []);
  },

  startStage(cab, stage, corrupted) {
    // Breaker-box bonus: consumed by the next stage run only (not boss/overtime).
    const flags = save.slot.campaign.storyFlags;
    const startingPowerup = flags.pendingPowerup || null;
    if (startingPowerup) { delete flags.pendingPowerup; save.persist(); }
    setState(new RunState({
      stage, save, startingPowerup,
      seed: (Date.now() ^ (stage ? stage.id.length * 7919 : 0)) >>> 0,
      difficulty: save.slot.difficulty,
      corrupted,
      onEnd: (result) => {
        Flow.lastTeam = result.team;
        const gains = applyResult(save, result);
        setState(new ResultsState({ result, gains, save, onDone: () => Flow.toHub() }));
      },
    }));
  },

  startBoss(cabId) {
    setState(new BossState({
      bossCab: cabId, save,
      seed: (Date.now() ^ 0xb055) >>> 0,
      difficulty: save.slot.difficulty,
      onEnd: (result) => {
        Flow.lastTeam = result.team;
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
      seed: seedOverride ?? dailySeed(),
      difficulty: save.slot.difficulty,
      onEnd: (result) => {
        Flow.lastTeam = result.team;
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
  setFancyFx(save.settings.fancyFx);
  Input.init();
  buildAllSprites();
  // Prime Web Audio before the title state is installed. Browsers/builds that
  // permit autoplay now begin the menu theme immediately; stricter browsers
  // leave the context suspended and the first gesture resumes this same
  // already-configured sequencer instead of creating it late.
  Audio.setVolumes(save.settings.volumes);
  Audio.ensure();
  Audio.setMuted(save.settings.muted);
  Input.onAnyGesture = () => {
    Audio.ensure();
    Audio.setVolumes(save.settings.volumes);
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
