// MASHENSTEIN: THE UNPLUGGENING — boot + campaign flow orchestration.
import {
  initRenderer, bctx, blit, setShakeScale, setFancyFx, pushOverlayDraw,
  noteRendererFrame, rendererDiagnostics, W, chrome, setChromeOverlay,
} from './engine/renderer.js';
import { startLoop, frameRate } from './engine/loop.js';
import { drawText, textWidth } from './engine/sprites.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { save } from './engine/save.js';
import { setState, setStateNoCameo, updateState, drawState, setTransitionHero } from './engine/states.js';
import { Rng, dailySeed } from './engine/rng.js';
import { buildAllSprites } from './game/draw.js';
import { RunState } from './game/run.js';
import { BossState } from './game/boss.js';
import { MinigameState } from './game/minigames/index.js';
import { POWER_DEFS } from './game/powerups.js';
import { REWARDS, ARCADE_PLAY_COST } from './data/progression.js';
import { CABINET_BY_ID } from './data/cabinets.js';
import { STAGE_BY_ID } from './data/stages.js';
import { HERO_BY_ID } from './data/heroes.js';
import { TitleState, DifficultyState, IntroState, BriefingState, ResultsState, FinaleState, SettingsState, HowToPlayState, FieldGuideState, SoundTestState } from './game/menus.js';
import { HubState, TrophyRoomState, StageSelectState, BenchState, ShopState, ArcadeState, heroIdFor } from './game/hub/index.js';
import { applyResult } from './game/progress.js';
import { CastState } from './game/cast.js';
import { AttractState } from './game/attract.js';
import { TutorialState } from './game/tutorial.js';
import { initUpdates } from './engine/updates.js';
import { LifecycleController, lifecyclePolicy } from './engine/lifecycle.js';
import { readPlatform } from './engine/platform.js';
import { Dev } from './dev/index.js';

save.load();
setShakeScale(save.settings.screenShake);

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
  const startAtFrom = (params) => {
    const pct = parseFloat(params.get('startAt'));
    return Number.isFinite(pct) && pct > 0 && pct < 100 ? pct / 100 : 0;
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
    case 'soundtest':
      setState(new SoundTestState({ onDone: () => Flow.toTitle() }));
      break;
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
          Flow.launchStage(cab, stage, [], undefined, heroFrom(p), true, invulnFrom(p), autoExitFrom(p), timeFrom(p), startAtFrom(p));
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

  toTitle(opts = {}) { setState(new TitleState({
    save,
    attractDelay: opts.attractDelay,
    attractLabel: nextAttract() === 'cast' ? 'CAST ROLL' : 'DEMO',
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
    onSettings: () => setState(new SettingsState({ save, onDone: () => { setShakeScale(save.settings.screenShake); Flow.toTitle(); } })),
    onHowTo: () => setState(new HowToPlayState({ onDone: () => Flow.toTitle() })),
    onTutorial: () => Flow.toTutorial(),
    onGuide: () => setState(new FieldGuideState({ settings: save.settings, onDone: () => Flow.toTitle() })),
    onSoundTest: () => setState(new SoundTestState({ onDone: () => Flow.toTitle() })),
    // A replay, not the real thing: this onDone only walks back to the title.
    // The new-file path above is the one that sets sawIntro and persists.
    onIntro: () => setState(new IntroState({ onDone: () => Flow.toTitle() })),
  })); },

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
  launchStage(cab, stage, corrupted, seedOverride, initialHeroId, announceBench = true, devInvuln = false, devAutoExit = false, devMaxTime = 0, devStartPercent = 0) {
    // You walk into the cabinet as yourself. The dev menu still overrides.
    initialHeroId = initialHeroId || Flow.heroId();
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
      devInvuln, devAutoExit, devMaxTime, devStartPercent,
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

  toTutorial() {
    setState(new TutorialState({ save, onDone: () => Flow.toTitle() }));
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
  if (typeof window !== 'undefined') {
    const p = new URLSearchParams(window.location.search);
    if (p.has('fps') || p.get('start') === 'fps') save.settings.showFps = true;
    if (p.has('mute')) save.settings.muted = true;
  }

  const platform = window.__mash_platform || readPlatform();
  // The renderer measures each device and settles on a sustainable density;
  // persist that so the next launch starts near it (the renderer re-probes one
  // rung optimistically on top of this seed).
  initRenderer(platform, {
    savedDensity: save.settings.renderDensity || 0,
    onSettle: (v) => {
      if (save.settings.renderDensity !== v) { save.settings.renderDensity = v; save.persist(); }
    },
  });
  setFancyFx(save.settings.fancyFx);
  Input.init();
  buildAllSprites();
  // Prime Web Audio before the title state is installed. Browsers/builds that
  // permit autoplay now begin the menu theme immediately; stricter browsers
  // leave the context suspended and the first gesture resumes this same
  // already-configured sequencer instead of creating it late.
  Audio.setVolumes(save.settings.volumes);
  Audio.setLifecyclePaused(lifecyclePolicy({
    ...platform,
    visible: !document.hidden,
    portrait: window.matchMedia
      ? window.matchMedia('(orientation: portrait)').matches
      : window.innerHeight > window.innerWidth,
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
  if (Dev.enabled) Dev.install({ Flow, save });

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
  const loop = startLoop({
    update: (dt) => { if (Dev.update(dt)) return; updateState(dt * Dev.timeScale); },
    draw: () => {
      if (save.settings.showFps) {
        const fps = frameRate() || '--';
        const label = `${fps}`;
        // Tiny top-right readout, common to touch chrome and desktop overlay.
        const drawFps = (ctx) => {
          const tw = textWidth(label, 0.65, 'bold');
          ctx.fillStyle = 'rgba(5,6,12,0.55)';
          ctx.fillRect(W - tw - 10, 1, tw + 10, 11);
          drawText(ctx, label, W - 5 - tw, 3, '#f4f1fa', 0.65, 'bold');
        };
        if (Input.isTouchDevice() && chrome.mode !== 'none') {
          setChromeOverlay(`fps|${fps}`, drawFps);
        } else {
          pushOverlayDraw(drawFps);
        }
      } else if (Input.isTouchDevice() && chrome.mode !== 'none') {
        setChromeOverlay('', null);
      }
      drawState(bctx);
      Dev.draw(bctx);
      blit();
    },
    present: noteRendererFrame,
  });
  // Install after startLoop in the same task: no animation frame can run
  // between these calls, and the controller can immediately pause the loop
  // through its public handle when booting hidden or in iPhone portrait.
  window.__mash_lifecycle = new LifecycleController({
    platform, loop, input: Input, audio: Audio,
  });
  window.__mash_booted = true;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
