// MASHENSTEIN: THE UNPLUGGENING — boot + campaign flow orchestration.
import {
  initRenderer, beginRenderFrame, bctx, blit, setShakeScale, setFancyFx, pushOverlayDraw,
  noteRendererFrame, rendererDiagnostics, rendererBackend, W, chrome, screen, visualizerFrame, setChromeOverlay,
} from './engine/renderer.js';
import { startLoop, frameRate, frameHealth } from './engine/loop.js';
import { drawText, textWidth } from './engine/sprites.js';
import { VISUALIZER_NAMES, setMegamixAudition } from './engine/visualizers.js';
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
import { STAGE_BY_ID } from './data/stages.js';
import { HERO_BY_ID } from './data/heroes.js';
import { TitleState, DifficultyState, IntroState, BriefingState, ResultsState, FinaleState, SettingsState, HowToPlayState, FieldGuideState, SoundTestState, JUKEBOX } from './game/menus.js';
import { HubState, TrophyRoomState, StageSelectState, BenchState, ShopState, ArcadeState, heroIdFor } from './game/hub/index.js';
import { applyResult } from './game/progress.js';
import { CastState } from './game/cast.js';
import { AttractState } from './game/attract.js';
import { TutorialState } from './game/tutorial.js';
import { initUpdates } from './engine/updates.js';
import { LifecycleController, lifecyclePolicy, portraitNow, portraitAllowedFor } from './engine/lifecycle.js';
import { readPlatform } from './engine/platform.js';
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
//   ?goto=stage&cab=plumber                   — stage select for that cabinet
//   ?goto=hub&hero=lorenzo                     — start hub as a specific hero
//   ?goto=soundtest&audition                   — audition every megamix move
//
// Recognised goto values:
//   title  tutorial  hub  howto  fieldguide  settings  cast  attract
//   intro  finale  soundtest  stage  boss  overtime
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
      setState(new SettingsState({ save, onDone: () => { setShakeScale(save.settings.screenShake); Flow.toTitle(); } }));
      break;
    case 'cast':
      setState(new CastState({ realSettings: save.settings, onExit: () => Flow.toTitle() }));
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
        // The visualizer only starts over a playing track, so the audition
        // cues the megamix song itself — the last row of the jukebox, and the
        // one the mixer was written against.
        ...(audition ? {
          initialTrack: JUKEBOX.length - 1,
          startVisualizer: true,
          startVisualizerIndex: VISUALIZER_NAMES.indexOf('VJ MEGAMIX'),
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
      if (stageId) {
        const stage = STAGE_BY_ID[stageId];
        if (stage && stage.cabinet === cabId) {
          Flow.launchStage(cab, stage, [], undefined, heroFrom(p), true, invulnFrom(p), autoExitFrom(p),
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

  // One answer to "who am I", used by the hub, by the stage launcher and by the
  // transition cameo. Without a single source these three drifted: the hub read
  // lastTeam[0] (the run's STARTER), the stage drew a fresh random hero, and the
  // shutter drew a third one at random.
  heroId() { return heroIdFor(Flow); },
  setHero(id) {
    if (id) Flow.hubAvatar = id;
    setTransitionHero(Flow.heroId());
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
    onSettings: () => setState(new SettingsState({ save, onDone: () => { setShakeScale(save.settings.screenShake); Flow.toExtras('settings'); } })),
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

  startStage(cab, stage, corrupted) {
    // The Briefing Manifest: every stage opens on its establishment screen.
    setState(new BriefingState({ cab, stage, onDone: () => Flow.launchStage(cab, stage, corrupted) }));
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
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search);
    const diag = consumeBenchDiag();
    if (p.has('fps') || p.get('start') === 'fps' || diag.fps) save.settings.showFps = true;
    if (p.has('mute')) save.settings.muted = true;
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
      sendTelemetry({ density: rendererDiagnostics().density, backend });
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
  Audio.setMuted(save.settings.muted);
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
      beginRenderFrame();
      let drawFpsReadout = null;
      const menuState = currentState();
      const visualizerActive = menuState instanceof SoundTestState
        && menuState.visualState !== 'list';
      // The visualizer introduces itself with the track and preset names for
      // five seconds. Do not compete with that lower-third; the diagnostics
      // take its place only once those titles have faded cleanly away.
      //
      // A megamix audition is the exception, because it is a measuring surface:
      // the frame cost IS what you opened it to look at, and its record tag
      // re-announces on every handover, so yielding to the titles would keep the
      // readout down almost the whole time. It also forces the readout up
      // without touching the saved setting.
      const auditioning = visualizerActive && menuState.visualizer?.audition === true;
      const visualizerTitlesVisible = visualizerActive && !auditioning && menuState.labelT < 6;
      // Touch devices with a letterbox margin get the readout out on #chrome,
      // in the dead black beside/above the game, rather than over the art.
      // A screen can stand the diagnostic down for as long as it is up, the
      // same way the visualizer's titles do below. Read as a static off the
      // constructor rather than an instanceof, matching how lifecycle.js reads
      // portraitMode: a static survives the module-identity mismatches that
      // make instanceof quietly fail.
      const hidesFps = menuState?.constructor?.hidesFps === true;
      const showChromeFps = save.settings.showFps && !visualizerActive && !hidesFps
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
          setChromeOverlay(`fps|${fps}|${hitchNow}|${hitchSum}|${dens}|${chrome.mode}|${Math.round(chrome.vw)}`, (ctx) => {
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
                    : '#b9c9e3';
              drawText(ctx, lines[i], pad, top + i * lineH, ink, s, 'ui');
            }
          });
        } else if (!visualizerTitlesVisible) {
          const label = `FPS ${fps}${hitchNow ? ' ' + hitchNow : ''}${hitchSum ? ' D' + hitchSum : ''} ${dens}`;
          // Keep the diagnostic above the visualizer surface. Once its titles
          // are gone, use their bottom-centre berth in both orientations.
          drawFpsReadout = (ctx) => {
            const availableW = visualizerFrame.right - visualizerFrame.left - 18;
            const scale = visualizerActive
              ? Math.max(0.42, Math.min(0.65, availableW / textWidth(label, 1, 'bold')))
              : 0.65;
            const tw = textWidth(label, scale, 'bold');
            const x = visualizerActive
              ? (visualizerFrame.left + visualizerFrame.right - tw) * 0.5
              : W - 5 - tw;
            const y = visualizerActive
              ? visualizerFrame.bottom - 14
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
    // today that is the jukebox alone, a self-contained listening/visualizer
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

  // Fire session duration on tab close. sendBeacon guarantees delivery.
  window.addEventListener('beforeunload', () => sendSessionEnd());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
