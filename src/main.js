// MASHENSTEIN: THE UNPLUGGENING — boot + campaign flow orchestration.
import {
  initRenderer, beginRenderFrame, bctx, blit, setShakeScale, setFancyFx, pushOverlayDraw,
  noteRendererFrame, rendererDiagnostics, rendererBackend, W, chrome, screen, visualiserFrame, setChromeOverlay,
} from './engine/renderer.js';
import { startLoop, frameRate, frameHealth } from './engine/loop.js';
import { drawText, textWidth } from './engine/sprites.js';
import { VISUALISER_NAMES, setMegamixAudition } from './engine/visualisers.js';
import { Input } from './engine/input.js';
import { Audio, PORTAL_RELAY, PORTAL_RELAY_GAIN } from './engine/audio.js';

/**
 * The swoosh that opens a level, fired at the PRESS rather than at the level.
 *
 * setState only queues: the shutter takes ~0.29s to close, the incoming state's enter()
 * runs at the covered midpoint, and the reveal takes another ~0.29s. Fired from
 * RunState.enter the cue's loudest moment landed 0.2s AFTER the picture had finished
 * arriving — too late to answer the button and too late to greet the level.
 *
 * From here it answers the press immediately and peaks 0.08s before the reveal
 * completes, so the swell rides the wipe and lands as the level appears. Which is also
 * the honest reading of the sound: the player is going through a doorway, and the wipe
 * IS the doorway.
 */
const levelOpenCue = () => Audio.sfx('portal', { gain: PORTAL_RELAY_GAIN, shape: PORTAL_RELAY });
import { save } from './engine/save.js';
import { setState, setStateFade, setStateNoCameo, updateState, drawState, currentState, setTransitionHero, isTransitioning } from './engine/states.js';
import { Rng, dailySeed } from './engine/rng.js';
import { buildAllSprites } from './game/draw.js';
import { RunState, applyFraming } from './game/run.js';
import { BossState } from './game/boss.js';
import { MinigameState } from './game/minigames/index.js';
import { POWER_DEFS } from './game/powerups.js';
import { REWARDS, ARCADE_PLAY_COST } from './data/progression.js';
import { CABINET_BY_ID } from './data/cabinets.js';
import { gameAlternate, GAME_ALTERNATES } from './data/game-alternates.js';
import { STAGE_BY_ID } from './data/stages.js';
import { HERO_BY_ID } from './data/heroes.js';
import { TitleState, DifficultyState, IntroState, BriefingState, ResultsState, FinaleState, SettingsState, HowToPlayState, FieldGuideState, SoundTestState, JUKEBOX } from './game/menus.js';
import { HubState, TrophyRoomState, StageSelectState, BenchState, ShopState, ArcadeState, heroIdFor } from './game/hub/index.js';
import { CalibrateState } from './game/calibrate.js';
import { applyResult } from './game/progress.js';
import { CastState } from './game/cast.js';
import { AttractState } from './game/attract.js';
import { TutorialState } from './game/tutorial.js';
import { initUpdates } from './engine/updates.js';
import { LifecycleController, lifecyclePolicy, portraitNow, portraitAllowedFor } from './engine/lifecycle.js';
import { readPlatform } from './engine/platform.js';
import { applyPhoneAudioProfile } from './engine/phone-audio.js';
import { sendTelemetry, sendSessionEnd, sendRunResult } from './engine/telemetry.js';
import { startBench, benchFrame, drawBench } from './engine/bench.js';
import { consumeBenchDiag, releaseBenchRenderer, readDiag } from './engine/diag.js';
import { startTitleProfile, titleProfileActive, titleProfileFrame, titleProfileReportVisible, drawTitleProfile } from './engine/title-profile.js';
import {
  startGameplayProfile, gameplayProfileActive, gameplayProfileWaiting,
  gameplayProfileFrame, gameplayProfileReportVisible,
  drawGameplayProfile, drawGameplayProfileWaiting,
} from './engine/gameplay-profile.js';
import { Dev } from './dev/index.js';

save.load();
setShakeScale(save.settings.screenShake);
// Resolve the camera framing before anything draws. RunState re-resolves every
// frame, but menus, the hub and the tutorial all read the camera's resting zoom
// straight off the module, so it has to be right from the first frame.
applyFraming(save.settings);

// Idle attract cycle: meet the cast, then two playable demos, then round again.
const ATTRACT_CYCLE = ['cast', 'demo', 'demo'];
let attractStep = 0;
const nextAttract = () => ATTRACT_CYCLE[attractStep % ATTRACT_CYCLE.length];

// ---- dev URL router --------------------------------------------------------
// Gated on Dev.enabled + __MASH_BUILD__. Reads ?goto=X from the query string
// and jumps directly to a surface, skipping the title screen entirely.
// Extra params depend on the target:
//   ?goto=stage&cab=plumber&stage=plumber-1   — launch a specific stage
//   ?goto=stage&cab=plumber&stage=plumber-1&seed=7   — ...on a known seed
//   ?goto=stage&cab=plumber                   — stage select for that cabinet
//   ?goto=hub&hero=lorenzo                     — start hub as a specific hero
//   ?goto=soundtest&audition                   — audition every megamix move
//
// Recognised goto values:
//   title  tutorial  hub  howto  fieldguide  settings  calibrate  cast
//   attract  intro  finale  soundtest  stage  boss  overtime
function routeDevUrl(goto, p) {
  // So Flow.toTitle() is skipped. The last line of boot() guards on this flag.
  window.__mash_routed = true;

  // ?hero=lorenzo — pick a starting hero (dev builds only)
  const heroFrom = (params) => {
    const id = params.get('hero');
    if (!id) return undefined;
    if (HERO_BY_ID[id]) { Flow.setHero(id); return id; }
    return undefined;
  };
  // ?invuln — god mode through the whole stage (dev builds only)
  const invulnFrom = (params) => params.has('invuln');
  // ?autoexit — skip results screen, return to title when stage ends
  const autoExitFrom = (params) => params.has('autoexit');
  // ?time=N — auto-finish the stage after N seconds
  const timeFrom = (params) => {
    const t = parseFloat(params.get('time'));
    return Number.isFinite(t) && t > 0 ? t : 0;
  };
  // ?startAt=N — start the stage at N% progress (1–99)
  //
  // ?finish or ?finish=N — the shortcut for working on the END of a stage.
  // startAt on its own is not enough: the finish only arms once the mission is
  // satisfied, so a run dropped at 97% just keeps going past where the marker
  // should be. This pairs the two — drop in near the tape AND force the mission
  // — so the flag, the plunger and the whole payoff are a page load away
  // instead of a played stage away. N is seconds of run before the finish arms
  // (default 5); it is converted to a percentage against the stage's own
  // length, so 5 means five seconds on a short stage and on a long one alike.
  const finishFrom = (params, stage) => {
    if (!params.has('finish')) return 0;
    const want = parseFloat(params.get('finish'));
    const lead = Number.isFinite(want) && want > 0 ? want : 5;
    const dur = (stage && stage.durationSec) || 330;
    return Math.max(0.01, Math.min(0.99, 1 - lead / dur));
  };
  const startAtFrom = (params, stage) => {
    const pct = parseFloat(params.get('startAt'));
    if (Number.isFinite(pct) && pct > 0 && pct < 100) return pct / 100;
    return finishFrom(params, stage);
  };
  // ?seed=N — launch with a known seed (dev builds only). A run is
  // deterministic given one, which is what lets the level editor's forecast
  // and the game it opens be the same deal rather than two of the same shape.
  const seedFrom = (params) => {
    if (!params.has('seed')) return undefined;
    const n = Number.parseInt(params.get('seed'), 10);
    return Number.isFinite(n) ? (n >>> 0) : undefined;
  };
  const alternateFrom = (params, parentId) => {
    const id = params.get('alt');
    const song = gameAlternate(id, parentId);
    if (id && !song) return false;
    Flow.setGameAlternate(song?.id || null);
    return true;
  };

  // Some targets need a valid save slot. Seed one if none exists.
  const anySlot = save.data.slots.some(Boolean);
  if (!anySlot) {
    save.newSlot(0, Date.now());
    save.selectSlot(0);
    save.slot.campaign.storyFlags.sawIntro = true;
    save.persist();
  } else if (!save.slot) {
    // A save file exists but no slot is active (edge case: reload without
    // selecting). Pick the first populated slot.
    const idx = save.data.slots.findIndex(Boolean);
    if (idx >= 0) save.selectSlot(idx);
  }

  switch (goto) {
    case 'tutorial':
      setState(new TutorialState({ save, onDone: () => Flow.toTitle() }));
      break;
    case 'hub': {
      if (!alternateFrom(p, 'hub')) { Flow.toTitle(); break; }
      heroFrom(p); // validates and calls Flow.setHero if valid
      Flow.toHub();
      break;
    }
    case 'howto':
      setState(new HowToPlayState({ onDone: () => Flow.toTitle() }));
      break;
    case 'fieldguide':
      setState(new FieldGuideState({ settings: save.settings, onDone: () => Flow.toTitle() }));
      break;
    case 'settings':
      setState(new SettingsState({ save,
        onDone: () => { setShakeScale(save.settings.screenShake); Flow.toTitle(); },
        onCalibrate: () => Flow.toCalibrate(() => routeDevUrl('settings', p)) }));
      break;
    case 'calibrate':
      Flow.toCalibrate(() => Flow.toTitle());
      break;
    case 'cast':
      setState(new CastState({ realSettings: save.settings, slot: save.slot, onExit: () => Flow.toTitle() }));
      break;
    case 'attract':
      setState(new AttractState({ realSettings: save.settings, onExit: () => Flow.toTitle() }));
      break;
    case 'intro':
      setState(new IntroState({ onDone: () => Flow.toTitle() }));
      break;
    // ?audition — open straight into the VJ MEGAMIX on its short dev cycle, so
    // every transition in the set is shown and named within about forty seconds
    // instead of one every sixteen bars.
    case 'soundtest': {
      const audition = p.has('audition');
      setMegamixAudition(audition);
      setState(new SoundTestState({
        onDone: () => { setMegamixAudition(false); Flow.toTitle(); },
        // The visualiser only starts over a playing track, so the audition
        // cues the megamix song itself — the last row of the jukebox, and the
        // one the mixer was written against.
        ...(audition ? {
          initialTrack: JUKEBOX.length - 1,
          startVisualiser: true,
          startVisualiserIndex: VISUALISER_NAMES.indexOf('VJ MEGAMIX'),
        } : {}),
      }));
      break;
    }
    // Built here rather than through Flow.startFinale so a preview lands back on
    // the title instead of the hub. Note it still sets sawEnding on the way out
    // — the same catch SCENES ▸ FINALE has always had.
    case 'finale':
      setState(new FinaleState({ save, onDone: () => Flow.toTitle() }));
      break;
    case 'stage': {
      const cabId = p.get('cab');
      const stageId = p.get('stage');
      if (!cabId) { Flow.toTitle(); break; }
      const cab = CABINET_BY_ID[cabId];
      if (!cab) { Flow.toTitle(); break; }
      if (!alternateFrom(p, cabId)) { Flow.toTitle(); break; }
      if (stageId) {
        const stage = STAGE_BY_ID[stageId];
        if (stage && stage.cabinet === cabId) {
          Flow.launchStage(cab, stage, [], seedFrom(p), heroFrom(p), true, invulnFrom(p), autoExitFrom(p),
            timeFrom(p), startAtFrom(p, stage), p.has('finish'));
        } else {
          Flow.toTitle();
        }
      } else {
        Flow.openCabinet(cab);
      }
      break;
    }
    case 'boss': {
      const cabId = p.get('cab') || 'plumber';
      Flow.startBoss(cabId, undefined, heroFrom(p), invulnFrom(p), autoExitFrom(p), timeFrom(p), startAtFrom(p));
      break;
    }
    case 'overtime':
      Flow.startOvertime(undefined, heroFrom(p), invulnFrom(p), autoExitFrom(p), timeFrom(p));
      break;
    case 'title':
    default:
      window.__mash_routed = false; // let Flow.toTitle() run normally
      break;
  }
}

const Flow = {
  lastTeam: null,
  // The hero you are currently carrying. Set by a hub swap, and re-set at the
  // end of every run to whoever was holding the baton when it finished — so the
  // relay's own shuffling gradually puts you in most of the cast without ever
  // asking, and the food court always shows the one you just were.
  hubAvatar: null,
  pendingCab: null,
  pendingStage: null,
  pendingCorrupted: [],
  pendingBoss: false,
  gameAlternate: null,

  // One answer to "who am I", used by the hub, by the stage launcher and by the
  // transition cameo. Without a single source these three drifted: the hub read
  // lastTeam[0] (the run's STARTER), the stage drew a fresh random hero, and the
  // shutter drew a third one at random.
  heroId() { return heroIdFor(Flow); },
  setHero(id) {
    if (id) Flow.hubAvatar = id;
    setTransitionHero(Flow.heroId());
  },
  setGameAlternate(id) {
    this.gameAlternate = id ? GAME_ALTERNATES[id] || null : null;
    return this.gameAlternate;
  },
  gameSongFor(parentId) {
    return this.gameAlternate?.alternateOf === parentId ? this.gameAlternate : null;
  },

  toTitle(opts = {}) {
    const go = opts.fade ? setStateFade : setState;
    go(new TitleState({
    save,
    attractDelay: opts.attractDelay,
    attractLabel: nextAttract() === 'cast' ? 'CAST ROLL' : 'DEMO',
    openExtras: opts.openExtras,
    extrasFocus: opts.extrasFocus,
    onAttract: () => Flow.startAttract(),
    onSlotChosen: (i, isNew) => {
      Flow.hubPosition = null;
      if (isNew) {
        setState(new DifficultyState({ save, onStart: () => save.newSlot(i, Date.now()), onCancel: () => { save.eraseSlot(i); Flow.toTitle(); }, onDone: () => setState(new IntroState({ onDone: () => {
          save.slot.campaign.storyFlags.sawIntro = true;
          save.persist();
          Flow.toHub();
        } })) }));
      } else {
        save.selectSlot(i);
        Flow.toHub();
      }
    },
    onSettings: () => Flow.toSettings(),
    onHowTo: () => setState(new HowToPlayState({ onDone: () => Flow.toExtras('howto') })),
    onTutorial: () => Flow.toTutorial(true),
    onGuide: () => setState(new FieldGuideState({ settings: save.settings, onDone: () => Flow.toExtras('guide') })),
    onSoundTest: () => setState(new SoundTestState({ onDone: () => Flow.toExtras('soundtest') })),
    // A replay, not the real thing: this onDone only walks back to the title.
    // The new-file path above is the one that sets sawIntro and persists.
    onIntro: () => setState(new IntroState({ onDone: () => Flow.toExtras('intro') })),
    }));
  },

  toExtras(extrasFocus = null) { Flow.toTitle({ openExtras: true, extrasFocus }); },

  // cameo=false for the results hand-off: the run already ended on a cast
  // celebration, so neither shutter on the way out needs a hero in it.
  toHub(cameo = true) {
    const go = cameo ? setState : setStateNoCameo;
    go(new HubState({ save, flow: Flow }));
  },

  startAttract() {
    const kind = nextAttract();
    attractStep++;
    const opts = {
      realSettings: save.settings,
      slot: save.slot,
      onExit: (auto) => Flow.toTitle(auto ? { attractDelay: 10 } : {}),
    };
    setState(kind === 'cast' ? new CastState(opts) : new AttractState(opts));
  },

  openCabinet(cab) {
    // Cabinets open straight onto their stages. The breaker box used to gate
    // this door; it now lives in Arcade Corner, where playing it is a choice.
    setState(new StageSelectState({ save, cab, flow: Flow }));
  },

  // Team select is gone: stages start immediately with the full cast in play.
  pickTeam(cab, stage, corrupted, boss = false) {
    if (boss) Flow.startBoss(cab.id);
    else Flow.startStage(cab, stage, this.pendingCorrupted = corrupted || []);
  },

  toSettings() {
    setState(new SettingsState({ save,
      onDone: () => { setShakeScale(save.settings.screenShake); Flow.toExtras('settings'); },
      onCalibrate: () => Flow.toCalibrate(() => Flow.toSettings()) }));
  },

  toCalibrate(onDone) {
    setState(new CalibrateState({ save, onDone }));
  },

  startStage(cab, stage, corrupted) {
    // The Briefing Manifest: every stage opens on its establishment screen.
    //
    // WHERE THE GAME ASKS ABOUT LATENCY. Rhythm is the only cabinet that puts
    // obstacles on the beat and scores presses against it, so it is the only
    // place a wireless output's unreported delay costs a life rather than being
    // invisible — and it is therefore the place the correction has to be one
    // press away. EVERY rhythm briefing carries the offer, not just the first:
    // headphones change between sessions, a reading taken on the laptop speaker
    // is wrong on the bus, and sending a player to SETTINGS to fix a stage they
    // are standing in front of is a detour. PLAY stays preselected, so the
    // permanent offer costs a player who does not want it nothing.
    //
    // `audioSyncAsked` no longer gates the offer; it decides how the row reads.
    // Before a first calibration it names itself; afterwards it shows the number
    // in force, so the briefing doubles as the readout.
    const ask = cab.id === 'rhythm';
    const markAsked = () => { save.settings.audioSyncAsked = true; save.persist(); };
    setState(new BriefingState({ cab, stage, askCalibrate: ask, settings: save.settings,
      onDone: () => { if (ask) markAsked(); Flow.launchStage(cab, stage, corrupted); },
      onCalibrate: () => { markAsked(); Flow.toCalibrate(() => Flow.startStage(cab, stage, corrupted)); } }));
  },

  // seedOverride: dev-menu seed lock. Runs are deterministic given a seed
  // (Rng uses named streams), so pinning it makes a spawn pattern replayable.
  launchStage(cab, stage, corrupted, seedOverride, initialHeroId, announceBench = true, devInvuln = false, devAutoExit = false, devMaxTime = 0, devStartPercent = 0, devForceMission = false) {
    // You walk into the cabinet as yourself. The dev menu still overrides.
    initialHeroId = initialHeroId || Flow.heroId();
    levelOpenCue();
    // Breaker-box bonus: consumed by the next stage run only (not boss/overtime).
    const flags = save.slot.campaign.storyFlags;
    const startingPowerup = flags.pendingPowerup || null;
    if (startingPowerup) { delete flags.pendingPowerup; save.persist(); }
    setState(new RunState({
      stage, save, startingPowerup,
      seed: seedOverride ?? ((Date.now() ^ (stage ? stage.id.length * 7919 : 0)) >>> 0),
      difficulty: save.slot.difficulty,
      corrupted,
      initialHeroId,
      devInvuln, devAutoExit, devMaxTime, devStartPercent, devForceMission,
      musicSong: this.gameSongFor(cab.id),
      // The bench-upgrade parade is a once-per-visit thing; a retry has already
      // seen it (same as the briefing it also skips).
      announceBench,
      onEnd: (result) => {
        Flow.lastTeam = result.team;
        Flow.setHero(result.finalHero);
        if (devAutoExit) { Flow.toTitle(); return; }
        const gains = applyResult(save, result);
        setStateNoCameo(new ResultsState({
          result, gains, save,
          onDone: () => Flow.toHub(false),
          // launchStage, not startStage: a retry has already read the briefing.
          // No seed passed either, so the next attempt is a fresh roll rather
          // than a replay of the pattern that just went wrong. announceBench:false
          // so the bench-upgrade toasts don't parade a second time.
          onRetry: () => Flow.launchStage(cab, stage, corrupted, undefined, undefined, false),
        }));
      },
    }));
  },

  startBoss(cabId, seedOverride, initialHeroId, devInvuln = false, devAutoExit = false, devMaxTime = 0, devStartPercent = 0) {
    levelOpenCue();
    setState(new BossState({
      bossCab: cabId, save,
      seed: seedOverride ?? ((Date.now() ^ 0xb055) >>> 0),
      difficulty: save.slot.difficulty,
      initialHeroId: initialHeroId || Flow.heroId(),
      devInvuln, devAutoExit, devMaxTime, devStartPercent,
      onEnd: (result) => {
        Flow.lastTeam = result.team;
        Flow.setHero(result.finalHero);
        if (devAutoExit) { Flow.toTitle(); return; }
        if (result.success) {
          save.slot.campaign.bossesDown[cabId] = true;
          save.persist();
        }
        const gains = applyResult(save, result);
        setStateNoCameo(new ResultsState({
          result, gains, save,
          onDone: () => {
            if (result.success && cabId === 'surge') Flow.startFinale();
            else Flow.toHub(false);
          },
          onRetry: () => Flow.startBoss(cabId, undefined, initialHeroId, devInvuln, devAutoExit, devMaxTime),
        }));
      },
    }));
  },

  startFinale() {
    setState(new FinaleState({ save, onDone: () => Flow.toHub() }));
  },

  startOvertime(seedOverride, initialHeroId, devInvuln = false, devAutoExit = false, devMaxTime = 0, devStartPercent = 0) {
    setState(new RunState({
      overtime: true, save,
      seed: seedOverride ?? dailySeed(),
      difficulty: save.slot.difficulty,
      initialHeroId: initialHeroId || Flow.heroId(),
      devInvuln, devAutoExit, devMaxTime, devStartPercent,
      onEnd: (result) => {
        if (devAutoExit) { Flow.toTitle(); return; }
        Flow.lastTeam = result.team;
        Flow.setHero(result.finalHero);
        const gains = applyResult(save, result);
        setStateNoCameo(new ResultsState({ result, gains, save, onDone: () => Flow.toHub(false) }));
      },
    }));
  },

  openBench() { setState(new BenchState({ save, flow: Flow })); },
  openShop() { setState(new ShopState({ save, flow: Flow })); },
  openArcade() { setState(new ArcadeState({ save, flow: Flow })); },
  openTrophyRoom() { setState(new TrophyRoomState({ save, flow: Flow })); },

  toTutorial(fromExtras = false) {
    setState(new TutorialState({ save, onDone: () => (fromExtras ? Flow.toExtras('tutorial') : Flow.toTitle()) }));
  },

  playMinigame(game) {
    // Arcade Corner takes its coin up front, so a bail-out still costs the play.
    const flags = save.slot.campaign.storyFlags;
    save.slot.coins -= ARCADE_PLAY_COST;
    save.persist();
    const rr = new Rng(game + save.slot.stats.runs + save.slot.coins);
    const reward = rr.pick(Object.keys(POWER_DEFS));
    setState(new MinigameState({
      game,
      seed: Date.now() & 0xffff,
      settings: save.settings,
      bonusText: `BONUS: ${POWER_DEFS[reward].name} ON YOUR NEXT RUN`,
      onEnd: (success) => {
        if (success) {
          save.slot.coins += REWARDS.arcadeWin;
          flags.pendingPowerup = reward;
          save.persist();
        }
        Flow.openArcade();
      },
    }));
  },
};

// THE AUDIO HEALTH PROBE, and why it is three numbers rather than one.
//
// On an installed iPhone there is no console, no profiler and no desk: the FPS
// readout is the only instrument that reaches the device, so the audio has to
// report itself through the same corner of the screen. Sampled once a second
// because that is the shortest window a ratio of two clocks is steady over.
//
// The fields separate the two failures that both present as "the music breaks up",
// and that no single number can tell apart (see phone-audio.js):
//
//   C0.98  the audio clock against the wall clock over the last second. Below ~0.9
//          the AUDIO thread is not finishing its work — the DSP is over budget for
//          the buffer it was given, heard as crackle. It is a DEADLINE, not a load:
//          it reads 1.00 on an empty song and on a nearly-full one alike, so it may
//          only ever say "behind", never "how busy". Never coloured, never a gauge.
//   M-23/2 the sequencer's minimum queue margin in ms, and how many passes ran with
//          nothing left. Negative margin with the clock at 1.00 is the OTHER failure:
//          the MAIN thread starved the transport and notes landed in the past, heard
//          as holes. Positive and quiet means the frame is feeding it fine.
//   L48ms  what the output buffer actually came out at, next to the rate. The phone
//          profile ASKS for 50ms; this is the only place that says what was granted.
const audioProbe = { at: 0, ctxAt: 0, ratio: 0, margin: null, late: 0 };
let audioTxt = '';
// The same fields split for the chrome box, whose rows are short on purpose so the
// lettering can grow in a phone's narrow side pillar rather than shrinking to fit.
let audioRows = [];
function sampleAudioHealth() {
  const ctx = Audio.ctx;
  if (!ctx) { audioTxt = ''; audioRows = []; audioProbe.at = 0; return; }
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
  if (!audioProbe.at) { audioProbe.at = now; audioProbe.ctxAt = ctx.currentTime; return; }
  const wall = now - audioProbe.at;
  if (wall < 1) return;
  audioProbe.ratio = (ctx.currentTime - audioProbe.ctxAt) / wall;
  audioProbe.at = now;
  audioProbe.ctxAt = ctx.currentTime;
  // takeSchedulerHealth RESETS as it reads, so this sample is the last second's
  // worst case rather than a running floor — which is what makes a hole that has
  // stopped happening disappear from the readout instead of staying up all run.
  const h = Audio.takeSchedulerHealth();
  audioProbe.margin = Number.isFinite(h.marginMin) ? Math.round(h.marginMin * 1000) : null;
  audioProbe.late = h.late;
  const lat = Math.round((ctx.outputLatency || ctx.baseLatency || 0) * 1000);
  const rate = Math.round(ctx.sampleRate / 100) / 10;
  const marginTxt = audioProbe.margin == null ? 'M-' : `M${audioProbe.margin}/${audioProbe.late}`;
  // NO WORKLET HERE, and therefore no TNGR-2 and no MRDR-3 AW — those two synths are
  // their AudioWorklet and have no second synthesis path, so their lanes play nothing
  // at all. AudioWorklet needs a SECURE context, which the LAN dev URL
  // (http://MBP14.local:8001) is not: `ctx.audioWorklet` is simply undefined there.
  //
  // The engine already says so on the console, once, loudly (VoiceRack.warmTngr2Lane) —
  // and a phone has no console, which is exactly how "the pad is missing on mobile"
  // becomes a performance mystery instead of a one-line answer. Shown only when it is
  // true, like the drops row: on the shipped https build this field never appears.
  const noWorklet = !ctx.audioWorklet;
  audioRows = [`C${audioProbe.ratio.toFixed(2)} ${marginTxt}`, `L${lat}ms ${rate}k`];
  if (noWorklet) audioRows.push('NO WORKLET');
  audioTxt = `C${audioProbe.ratio.toFixed(2)} ${marginTxt} L${lat}ms ${rate}k`
    + (noWorklet ? ' NOWORKLET' : '');
}

// The same numbers for the beacon, so a phone reports without anyone holding it.
// Empty before the context exists — telemetry drops the fields rather than sending
// zeroes that would read as a measured silence.
function audioTelemetry() {
  const ctx = Audio.ctx;
  if (!ctx) return {};
  return {
    audioClock: Math.round(audioProbe.ratio * 100) / 100,
    audioMarginMs: audioProbe.margin,
    audioLate: audioProbe.late,
    audioLatencyMs: Math.round((ctx.outputLatency || ctx.baseLatency || 0) * 1000),
    audioRate: ctx.sampleRate,
  };
}

function boot() {
  // URL parameters to force settings on initial load.
  //   ?fps  or  ?start=fps   → show FPS counter
  //   ?mute                  → start muted
  //   ?bench                 → sweep the density ladder and report FPS per rung
  //   ?norewind              → stop recording rewind snapshots (see run.js), to
  //                            test whether scattered dropped frames are GC
  // The same three switches are also reachable without an address bar, from the
  // hidden panel on the portrait screen — the only way to turn them on inside an
  // installed PWA, which is the only way iPhone runs this game at all.
  let benchRequested = false;
  let titleProfileRequested = false;
  let gameplayProfileRequested = false;
  let benchDiag = null;
  let sessionMute = false;
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search);
    const diag = consumeBenchDiag();
    if (p.has('fps') || p.get('start') === 'fps' || diag.fps) save.settings.showFps = true;
    // Silence for THIS BOOT, never the player's setting. This used to write
    // `save.settings.muted`, which persists — so a single verification run with
    // `?mute` in the address bar left the game muted for good, and toggling it
    // back only lasted until the next load with the flag still there. The switch
    // is applied to the audio output instead; Audio.silent ORs it with the saved
    // setting, so `?mute` can add silence but can never clear a real mute.
    if (p.has('mute')) sessionMute = true;
    benchRequested = p.has('bench') || !!diag.bench;
    titleProfileRequested = p.has('titleProfile') || !!diag.titleProfile;
    gameplayProfileRequested = p.has('gameplayProfile') || !!diag.gameplayProfile;
    benchDiag = diag;
    // URL diagnostics are one-shot tools. Leaving ?bench or ?titleProfile in
    // the address bar made every ordinary reload throw the player back into a
    // title benchmark, which is especially disruptive when testing a level.
    // Storage-backed portrait buttons are already consumed above; this clears
    // the equivalent query flags without navigating away from the PWA.
    if ((p.has('bench') || p.has('titleProfile') || p.has('gameplayProfile')) && window.history?.replaceState) {
      try {
        const clean = new URL(window.location.href);
        clean.searchParams.delete('bench');
        clean.searchParams.delete('titleProfile');
        clean.searchParams.delete('gameplayProfile');
        window.history.replaceState(null, '', clean.pathname + clean.search + clean.hash);
      } catch (e) { /* a restricted standalone URL can simply keep the flag for this boot */ }
    }
  }

  const platform = window.__mash_platform || readPlatform();
  // The renderer measures each device and settles on a sustainable density;
  // persist that so the next launch starts near it (the renderer re-probes one
  // rung optimistically on top of this seed).
  initRenderer(platform, {
    savedDensities: save.settings.renderDensityByBackend,
    onSettle: (v, backend) => {
      if (save.settings.renderDensityByBackend[backend] !== v) {
        save.settings.renderDensityByBackend[backend] = v;
        save.persist();
      }
      // Fire telemetry once the render density settles — the most important
      // number: it tells us whether this device actually kept up.
      sendTelemetry({ density: rendererDiagnostics().density, backend, ...audioTelemetry() });
    },
  });
  releaseBenchRenderer(benchDiag);
  setFancyFx(save.settings.fancyFx);
  Input.init();
  buildAllSprites();

  // Touch players cannot rewind, so do not create the continuously-running
  // audio capture node on coarse-pointer devices. Same capability the snapshot
  // ring asks (run.js), so the two halves of rewind can never disagree about
  // whether the feature exists. Read once here because the capture node is a
  // boot-time fixture; no pad has been polled yet, so this is exactly the
  // coarse-pointer test it has always been.
  Audio.setCaptureEnabled(Input.rewindAvailable());
  // A phone gets a bigger output buffer and a wider scheduler window; everything
  // else keeps the browser's default. Here rather than anywhere later because
  // latencyHint is an AudioContext constructor argument — see phone-audio.js, and
  // note that this line and the one above it are both "before ensure()" fixtures.
  applyPhoneAudioProfile(Audio, platform);
  // Prime Web Audio before the title state is installed. Browsers/builds that
  // permit autoplay now begin the menu theme immediately; stricter browsers
  // leave the context suspended and the first gesture resumes this same
  // already-configured sequencer instead of creating it late.
  Audio.setVolumes(save.settings.volumes);
  // One portrait predicate, shared by this boot-time seed and the lifecycle
  // controller installed further down, so the two can never disagree about
  // which screens are allowed to stay running sideways. Read the diag switch
  // once here the way every other diag switch is read: changing it takes a
  // reload regardless. No state is installed yet at this point, so this seed
  // resolves to "not portrait-capable" — matching the landscape gate the old
  // inline check applied by simply omitting allowPortrait.
  const diagPortrait = !!readDiag().portrait;
  // The open dev menu is a portrait surface of its own. It consumes the frame
  // before any state updates (see Dev.update), so admitting portrait here runs
  // the loop for the overlay alone — the landscape-only screen underneath stays
  // frozen exactly as it would behind the rotate card, and a tester who opened
  // the menu from that card reads it without turning the phone back.
  //
  // A shutter in flight is admitted too, in dev builds only, because that menu
  // can launch a screen with the phone still upright: the transition needs
  // frames to land and a paused phone gives it none, so the pick would freeze
  // half-way, leaving the old screen current and the new one pending. The
  // destination gets the deciding vote a moment later — publish() re-applies on
  // the swap, and the loop below re-applies once the reveal ends. A shipped
  // build has no such launcher and keeps the old behaviour untouched.
  const allowPortraitNow = () => Dev.open || (Dev.enabled && isTransitioning())
    || portraitAllowedFor(currentState(), diagPortrait);
  Audio.setLifecyclePaused(lifecyclePolicy({
    ...platform,
    visible: !document.hidden,
    portrait: portraitNow(window),
    allowPortrait: allowPortraitNow(),
  }).paused);
  Audio.ensure();
  Audio.setSessionMute(sessionMute);
  Audio.setMuted(save.settings.muted);
  Audio.setSyncOffset(save.settings.audioSyncMs);
  // Touch only, and only once. A phone browser's toolbars eat a third of a
  // landscape screen, so the first tap asks for them back; iPad and Android
  // Chrome grant it, iPhone Safari has no Fullscreen API and rejects, which is
  // what the home-screen meta tags in the page head are for. A desktop player
  // clicking the canvas sized their own window and would read this as a jump
  // scare, so they never get asked. Once either way: a rejection will keep
  // rejecting, and a player who backed out of fullscreen meant to.
  let askedFullscreen = false;
  const goFullscreen = () => {
    askedFullscreen = true;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    // Both shapes of failure — a throw and a rejected promise — mean the same
    // thing here (this browser will not do it) and there is nothing to say.
    try {
      const p = req.call(el);
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* not available: play windowed */ }
  };
  Input.onAnyGesture = () => {
    Audio.ensure();
    Audio.setVolumes(save.settings.volumes);
    Audio.setMuted(save.settings.muted);
    Audio.setSyncOffset(save.settings.audioSyncMs);
    // Must run inside the gesture's own call stack to count as user-activated,
    // which it does: Input fires this synchronously from its pointerdown
    // handler, after usingTouch is set from the event's pointerType.
    if (!askedFullscreen && Input.usingTouch) goFullscreen();
  };
  // Dev menu: local builds only. __MASH_BUILD__ is emitted by build/build.js
  // under --watch and is absent from a published bundle, so install() never
  // runs there and no listener is ever registered.
  Dev.enabled = !!(typeof window !== 'undefined' && window.__MASH_BUILD__);
  // onOpenChange: opening or closing the overlay changes the answer
  // allowPortraitNow gives, and nothing else would ask the question again while
  // the phone is held still.
  if (Dev.enabled) {
    Dev.install({ Flow, save, onOpenChange: () => window.__mash_lifecycle?.apply() });
  }

  // Dev URL shortcuts — append ?goto=screen to jump directly to any surface.
  // Only active when __MASH_BUILD__ is set (npm run dev / watch builds).
  if (Dev.enabled && typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search);
    const goto = p.get('goto');
    if (goto) routeDevUrl(goto, p);
  }

  if (!window.__mash_routed) Flow.toTitle();
  // Keep an installed copy current silently. Browser-only iPhones never reach
  // this boot path: gate.js owns the sole Home Screen installation flow.
  initUpdates();
  // The trailing edge of a transition, dev builds only, matching the clause
  // allowPortraitNow adds there. The shutter is admitted so it can land; the
  // frame it finishes on is the frame the destination's own orientation policy
  // has to take over, and no DOM event will say so.
  let wasTransitioning = false;
  const loop = startLoop({
    update: (dt) => {
      if (Dev.enabled) {
        const transitioning = isTransitioning();
        if (wasTransitioning && !transitioning) window.__mash_lifecycle?.apply();
        wasTransitioning = transitioning;
      }
      if (Dev.update(dt)) return;
      updateState(dt * Dev.timeScale);
    },
    draw: (renderAlpha) => {
      // TOP THE SEQUENCER UP FROM THE FRAME, before anything is drawn.
      //
      // The transport is otherwise fed by a 25ms setInterval, and a timer is exactly
      // the thing a busy main thread delays: the frame that just ran up to eight
      // catch-up update() steps (loop.js) is the frame most likely to have eaten the
      // slot the queue needed. schedule() is idempotent and costs one compare plus an
      // empty while loop when the queue is already full, and early-outs entirely with
      // no bank — so a menu pays nothing and a stage pays for the pass it needed.
      // All platforms: there is no phone-only reason for it and one path is easier to
      // keep correct than two.
      Audio.schedule();
      beginRenderFrame();
      let drawFpsReadout = null;
      const menuState = currentState();
      const visualiserActive = menuState instanceof SoundTestState
        && menuState.visualState !== 'list';
      // The visualiser introduces itself with the track and preset names for
      // five seconds. Do not compete with that lower-third; the diagnostics
      // take its place only once those titles have faded cleanly away.
      //
      // A megamix audition is the exception, because it is a measuring surface:
      // the frame cost IS what you opened it to look at, and its record tag
      // re-announces on every handover, so yielding to the titles would keep the
      // readout down almost the whole time. It also forces the readout up
      // without touching the saved setting.
      const auditioning = visualiserActive && menuState.visualiser?.audition === true;
      const visualiserTitlesVisible = visualiserActive && !auditioning && menuState.labelT < 6;
      // Touch devices with a letterbox margin get the readout out on #chrome,
      // in the dead black beside/above the game, rather than over the art.
      // A screen can stand the diagnostic down for as long as it is up, the
      // same way the visualiser's titles do below. Read as a static off the
      // constructor rather than an instanceof, matching how lifecycle.js reads
      // portraitMode: a static survives the module-identity mismatches that
      // make instanceof quietly fail.
      // The dev recorder captures this very canvas, so a diagnostic left up
      // would be burned into every frame of the file.
      const hidesFps = menuState?.constructor?.hidesFps === true || Dev.recording;
      const showChromeFps = save.settings.showFps && !visualiserActive && !hidesFps
        && Input.isTouchDevice() && chrome.mode !== 'none';
      if ((save.settings.showFps || auditioning) && !hidesFps) {
        const fps = frameRate() || '--';
        // Render density rides along with the FPS: on a device you can only
        // look at, "blocky" and "which rung did it settle on" are the same
        // question, and there is no console to ask rendererDiagnostics().
        // Density alone is ambiguous: 1X reads the same whether the controller
        // ratcheted down to the floor, a ?density pin disabled it, or the
        // viewport is so small that native IS 1 and there is no ladder at all.
        // Native is what separates those, so both numbers show — "1X/5.69X" is
        // a controller problem, "1X/1X" is a viewport one.
        //
        // Flags say why it is where it is. P = pinned by ?density (adaptation
        // off); A = adaptation off for any other reason (a single-rung ladder);
        // F = frozen, two drops in a row failed to buy frames so it gave up;
        // Ln = n rungs barred from recovery by strikes; T = drops suspended.
        const rd = rendererDiagnostics();
        const r2 = (v) => Math.round(v * 100) / 100;
        const flags = (rd.pinned != null ? 'P' : (rd.adaptive ? '' : 'A'))
          + (rd.frozen ? 'F' : '') + (rd.lockedRungs.length ? 'L' + rd.lockedRungs.length : '')
          + (rd.throttled ? 'T' : '');
        // Backend too: "60 at 2x" means the pipeline is saturated if it is GL
        // and something else entirely if it is 2D, and the two are
        // indistinguishable without it.
        const dens = `${r2(rd.density)}X/${r2(rd.native)}X ${rendererBackend()}${flags ? ' ' + flags : ''}`;
        // THE TEMPO THE TRANSPORT IS ACTUALLY PLAYING, warp included — never the
        // number the song was written at. A beat stage steps its bpm up at every
        // checkpoint (stages.js `bpmRamp`) and the ramp is otherwise
        // something you can only hear; this is also the ground truth the lane's
        // own arithmetic has to agree with, so a lane that has drifted reads here
        // as a tempo that is not the one coming out of the speakers.
        //
        // Blank when there is no song, so a menu with the music off keeps the
        // short readout — the same rule the hitch fields follow.
        const playingBpm = Audio.bank ? (Audio.bpm || 0) * (Audio.tempo || 1) : 0;
        const bpmTxt = playingBpm > 0 ? `${r2(playingBpm)}BPM` : '';
        // The audio's own half of the diagnostic. Sampled here rather than on a timer
        // of its own so it lives and dies with the readout that shows it, and so the
        // window it measures is the window the player was watching.
        sampleAudioHealth();
        // Dropped vsyncs, which the averaged FPS cannot show: a run that hitches
        // three times a second still reads a flat 60. "!3/34" is three drops in
        // the last second, worst frame 34ms. Shown only when there is something
        // to report, so a clean run keeps the short readout it has now. The
        // session totals ride along once anything has happened at all, because
        // the interesting hitch is usually the one that already scrolled out of
        // the window while you were looking at the screen instead of the corner.
        const fh = frameHealth();
        const hitchNow = fh.hitches ? `!${fh.hitches}/${fh.worstMs}` : '';
        // "D95in80/159" — 95 frames lost across 80 separate hitches, deepest
        // 159ms. Both numbers earn their place: frames lost is what the player
        // saw, while the gap between the two says whether it was even judder
        // (the counts converge) or a handful of deep lurches (they diverge),
        // and those do not have the same cause.
        const hitchSum = (fh.hitchTotal || fh.stallTotal)
          ? `${fh.hitchTotal}${fh.hitchEvents && fh.hitchEvents !== fh.hitchTotal ? 'in' + fh.hitchEvents : ''}`
            + `${fh.sessionWorstMs ? '/' + fh.sessionWorstMs : ''}`
            + `${fh.stallTotal ? '+' + fh.stallTotal + 's' : ''}`
          : '';
        if (showChromeFps) {
          // #chrome is its own canvas in WINDOW CSS PIXELS, and it sits BEHIND
          // #game — so this painter has to place itself against the margin
          // geometry. The 480x270 game-space painter below cannot be reused
          // here: its coordinates land inside the area #game covers, where the
          // readout is faithfully painted every frame and never once seen.
          setChromeOverlay(`fps|${fps}|${hitchNow}|${hitchSum}|${dens}|${bpmTxt}|${audioTxt}|${chrome.mode}|${Math.round(chrome.vw)}`, (ctx) => {
            // A landscape phone's side pillar is narrow but tall. Short,
            // single-stat rows let the lettering grow instead of shrinking one
            // long density/backend string to fit. A top/bottom band has width
            // to spare, so pair the same fields across two larger rows.
            const side = chrome.mode === 'side';
            const backend = rendererBackend().toUpperCase();
            const state = flags || 'AUTO';
            const density = `${r2(rd.density)}X`;
            const native = `${r2(rd.native)}X`;
            // The drops row only appears once there are drops, so a clean run
            // keeps the compact box — and on a phone the row arriving IS the
            // signal, without having to read the number.
            const drops = [hitchNow, hitchSum && 'D' + hitchSum].filter(Boolean).join(' ');
            const lines = side
              ? [`FPS ${fps}`, `D ${density}`, `N ${native}`, backend, state]
              : [`FPS ${fps}  ${backend} ${state}`, `D ${density}  N ${native}`];
            // Last, and only when a song is on: it is the one row here that is
            // not about the frame, so it reads as a footnote rather than as
            // another number competing with the FPS.
            if (bpmTxt) lines.push(bpmTxt);
            // And under it, the audio. Below the tempo because it is a diagnostic
            // about the machine rather than about the song, and it is the last thing
            // added so a device with no context yet keeps the box it has always had.
            // Two short rows in the pillar, one wide row in a band.
            if (audioRows.length) {
              lines.push(...(side ? audioRows : [audioRows.join('  ')]));
            }
            if (drops) lines.splice(1, 0, drops);
            const pad = 8;
            const widest = Math.max(...lines.map((l) => textWidth(l, 1, 'ui')));
            // Respect both dimensions: side mode is width-bound, while a thin
            // iPad band can be height-bound. The shorter rows materially raise
            // the side-mode scale without ever spilling under #game.
            const availW = (side ? screen.ox : chrome.vw) - pad * 2;
            const availH = side ? chrome.vh - 52 : screen.oy - pad * 2;
            const s = Math.max(1, Math.min(2.8, availW / widest, availH / (lines.length * 12)));
            const lineH = 12 * s;
            const boxH = lines.length * lineH + pad;
            // Dropped clear of the top corner: a phone screen is a squircle, so
            // a box parked in the corner gets its own corner shaved off by the
            // curve — the same clearance CHROME_EDGE_PAD buys the buttons. In
            // 'topbottom' the band is only oy tall, so never push past its
            // bottom edge (an iPad's is 72-128px, not a phone's 300+).
            const top = chrome.mode === 'topbottom'
              ? Math.min(26, Math.max(pad, screen.oy - boxH - pad))
              : 26;
            ctx.fillStyle = 'rgba(5,6,12,0.68)';
            ctx.fillRect(pad - 4, top - 4, widest * s + 12, boxH);
            for (let i = 0; i < lines.length; i++) {
              const ink = i === 0 ? '#f4f1fa'
                : lines[i] === drops ? '#f6b45c'
                  : lines[i] === backend ? '#8ef0c0'
                    : lines[i] === bpmTxt ? '#c9a6f0'
                      : '#b9c9e3';
              drawText(ctx, lines[i], pad, top + i * lineH, ink, s, 'ui');
            }
          });
        } else if (!visualiserTitlesVisible) {
          const label = `FPS ${fps}${hitchNow ? ' ' + hitchNow : ''}${hitchSum ? ' D' + hitchSum : ''} ${dens}`
            + (bpmTxt ? ` ${bpmTxt}` : '') + (audioTxt ? ` ${audioTxt}` : '');
          // Keep the diagnostic above the visualiser surface. Once its titles
          // are gone, use their bottom-centre berth in both orientations.
          drawFpsReadout = (ctx) => {
            const availableW = visualiserFrame.right - visualiserFrame.left - 18;
            const scale = visualiserActive
              ? Math.max(0.42, Math.min(0.65, availableW / textWidth(label, 1, 'bold')))
              : 0.65;
            const tw = textWidth(label, scale, 'bold');
            const x = visualiserActive
              ? (visualiserFrame.left + visualiserFrame.right - tw) * 0.5
              : W - 5 - tw;
            const y = visualiserActive
              ? visualiserFrame.bottom - 14
              : 3;
            ctx.fillStyle = 'rgba(5,6,12,0.68)';
            ctx.fillRect(x - 5, y - scale * 3, tw + 10, scale * 16);
            drawText(ctx, label, x, y, '#f4f1fa', scale, 'bold');
          };
        }
      }
      if (!showChromeFps && Input.isTouchDevice() && chrome.mode !== 'none') {
        setChromeOverlay('', null);
      }
      const gameplayState = ['RunState', 'BossState', 'MinigameState', 'TutorialState']
        .includes(currentState()?.constructor?.name);
      const profileOn = titleProfileActive() || gameplayProfileActive();
      const drawStartedAt = profileOn && typeof performance !== 'undefined' ? performance.now() : 0;
      drawState(bctx, renderAlpha);
      const drawMs = profileOn ? performance.now() - drawStartedAt : 0;
      Dev.draw(bctx);
      if (drawFpsReadout) pushOverlayDraw(drawFpsReadout);
      if (benchRequested) pushOverlayDraw(drawBench);
      if (titleProfileReportVisible()) pushOverlayDraw(drawTitleProfile);
      if (gameplayProfileWaiting()) pushOverlayDraw(drawGameplayProfileWaiting);
      if (gameplayProfileReportVisible()) pushOverlayDraw(drawGameplayProfile);
      const blitStartedAt = profileOn && typeof performance !== 'undefined' ? performance.now() : 0;
      blit();
      if (profileOn) {
        const now = performance.now();
        const timings = {
          drawMs,
          blitMs: performance.now() - blitStartedAt,
        };
        titleProfileFrame(now, timings);
        gameplayProfileFrame(now, timings, gameplayState);
      } else if (gameplayProfileRequested) {
        gameplayProfileFrame(performance.now(), {}, gameplayState);
      }
    },
    // The sweep counts presented frames, so it reads the same clock the density
    // controller does. While it holds a pin the controller is inert anyway.
    present: (now) => { noteRendererFrame(now); benchFrame(now); },
  });
  if (benchRequested) startBench();
  if (titleProfileRequested) {
    startTitleProfile({ restorePin: benchDiag?.titleProfileRenderer ? null : undefined });
  }
  if (gameplayProfileRequested) {
    startGameplayProfile({ restorePin: benchDiag?.gameplayProfileRenderer ? null : undefined });
  }
  // Install after startLoop in the same task: no animation frame can run
  // between these calls, and the controller can immediately pause the loop
  // through its public handle when booting hidden or in iPhone portrait.
  window.__mash_lifecycle = new LifecycleController({
    platform,
    loop,
    input: Input,
    audio: Audio,
    // Screens opt in by declaring a static portraitMode (see portraitAllowedFor);
    // today that is the jukebox alone, a self-contained listening/visualiser
    // surface intentionally usable in portrait. The landscape gate still covers
    // everything else, including the title and gameplay states.
    allowPortrait: allowPortraitNow,
    onPortraitJukebox: () => setStateFade(new SoundTestState({ onDone: () => Flow.toTitle({ fade: true }) })),
    // Five taps on the portrait heading. Local builds only, like every other
    // door into the dev menu: a published bundle never sets __MASH_BUILD__, so
    // this reports false and the overlay says nothing.
    onDevMenu: () => {
      if (!Dev.enabled) return false;
      Dev.openMenu();
      return true;
    },
  });
  window.__mash_booted = true;
  // The audio engine, for a verification script measuring cue timing against the
  // song from outside the bundle — the same reason __mash_cur is there.
  window.__mash_audio = Audio;

  // Fire session duration on tab close. sendBeacon guarantees delivery.
  window.addEventListener('beforeunload', () => sendSessionEnd());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
