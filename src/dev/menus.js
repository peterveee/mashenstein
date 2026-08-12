// Dev menu tree. Each screen is {title, items, rebuild}, where rebuild() is
// re-run after every action so labels track live state — the same approach
// SettingsState uses in game/menus.js.
//
// Items: {label, act?, submenu?, adjust?}
import { W, H, screen } from '../engine/renderer.js';
import { Input } from '../engine/input.js';
import { drawText, drawTextCentered, drawPanel, textYForMid, textWidth } from '../engine/sprites.js';
import { setState, currentState } from '../engine/states.js';
import { STAGES, stagesForCabinet, UNLOCKS } from '../data/stages.js';
import { CABINETS, CABINET_BY_ID } from '../data/cabinets.js';
import { GAME_ALTERNATES } from '../data/game-alternates.js';
import { DESK_SONGS } from './desk-songs.js';
import { BOSSES } from '../game/boss.js';
import { OBSTACLES } from '../game/entities.js';
import { MODS, BENCH_UPGRADES } from '../data/progression.js';
import { MINIGAMES } from '../game/minigames/index.js';
import { HEROES } from '../data/heroes.js';
import { applyResult, totalPlugs, MAX_PLUGS, formatCoins } from '../game/progress.js';
import { AttractState } from '../game/attract.js';
import { ResultsState, BriefingState, FieldGuideState, SoundTestState, JUKEBOX, HowToPlayState, DifficultyState, IntroState } from '../game/menus.js';
import { CastState } from '../game/cast.js';
import { CreditsState } from '../game/credits.js';
import { VISUALIZER_NAMES, MEGAMIX_AUDITION_BEATS, MEGAMIX_TRANSITIONS, setMegamixAudition } from '../engine/visualizers.js';
import { GROUPS, byGroup } from '../../tools/lib/tunables.js';
import { readOne, defaultOf, knows, changed, tuningAvailable } from './tunables.js';
import { nudge, revertTuning, resyncRun } from './tune-store.js';
import { derived, TuneStrip } from './tune-strip.js';
import { PAN_MAX } from '../engine/camera.js';
import { proseMenu } from './prose.js';

const GOLD = '#f6d33c';
const DIM = '#5a5a68';
const FG = '#c8c8d8';

// A plausible perfect result, shaped exactly like the object RunState.endRun
// builds, so ResultsState can be opened cold without playing.
function fakeResult(stage) {
  return {
    success: true, reason: null,
    stage, overtime: false, corrupted: [],
    score: 12345, coins: 250,
    damageTaken: 0, bestCombo: 0,
    challengeDone: true, applianceGot: true,
    team: ['lorenzo', 'gnash', 'b33p'],
    failMsg: null,
    distance: stage ? Math.floor(stage.durationSec * 160) : 4000,
    time: stage ? stage.durationSec : 60,
  };
}

// ---------------------------------------------------------------- launchers
function watch(dev, scenario, { crash = false } = {}) {
  const { Flow } = dev.ctx;
  dev.close();
  setState(new AttractState({
    scenario,
    seed: dev.seedLock ?? undefined,
    devMode: true,
    crash,
    realSettings: dev.ctx.save.settings,
    onExit: () => Flow.toHub(),
  }));
}

function instantClear(dev, stage) {
  const { save, Flow } = dev.ctx;
  const result = fakeResult(stage);
  const gains = applyResult(save, result);
  dev.close();
  setState(new ResultsState({ result, gains, save, onDone: () => Flow.toHub() }));
}

// The mirror of INSTANT-CLEAR: the finish crossed with the mission still short.
// It is the only results screen that carries a shortfall line, a locked-stage
// line and the retry rows, and the only way to reach it by playing is to lose
// on purpose at the very end of a run.
function instantFail(dev, stage) {
  const { save, Flow } = dev.ctx;
  const cab = CABINET_BY_ID[stage.cabinet];
  const m = stage.mission;
  const result = {
    ...fakeResult(stage),
    success: false, reason: 'MISSION INCOMPLETE',
    score: 4210, coins: 120,
    challengeDone: false, applianceGot: false,
    failMsg: 'MISSION INCOMPLETE',
    // Two short of the bar, or blank on the survive-to-the-end types — which
    // can never actually fail this way, but the preview should still open.
    failDetail: m.n ? `${m.type.toUpperCase()} ${Math.max(0, m.n - 2)}/${m.n}` : '',
  };
  const gains = applyResult(save, result);
  dev.close();
  setState(new ResultsState({
    result, gains, save,
    onDone: () => Flow.toHub(),
    onRetry: () => Flow.launchStage(cab, stage, []),
  }));
}

// ------------------------------------------------------------------ screens
function stageActions(dev, stage) {
  const cab = CABINET_BY_ID[stage.cabinet];
  const scenario = { kind: 'stage', id: stage.id };
  const playAsMenu = () => ({
    title: 'PLAY AS',
    items: HEROES.map((hero) => ({
      label: hero.short,
      act: () => {
        dev.close();
        dev.ctx.Flow.launchStage(cab, stage, [], dev.seedLock ?? undefined, hero.id);
      },
    })),
  });
  const build = () => ({
    title: stage.id.toUpperCase(),
    items: [
      { label: 'PLAY', act: () => { dev.close(); dev.ctx.Flow.launchStage(cab, stage, [], dev.seedLock ?? undefined); } },
      { label: 'PLAY AS ▸', submenu: playAsMenu },
      { label: 'BOT-PLAY', act: () => watch(dev, scenario) },
      { label: 'CRASH TEST', act: () => watch(dev, scenario, { crash: true }) },
      { label: 'INSTANT-CLEAR', act: () => instantClear(dev, stage) },
      { label: 'INSTANT-FAIL', act: () => instantFail(dev, stage) },
      { label: 'BRIEFING', act: () => { dev.close(); setState(new BriefingState({ cab, stage, onDone: () => dev.ctx.Flow.toHub() })); } },
      { label: `MISSION: ${stage.mission.type}${stage.mission.n ? ' x' + stage.mission.n : ''}`, act: null },
      { label: `CHALLENGE: ${stage.challenge.type}`, act: null },
      { label: `DURATION: ${stage.durationSec}s`, act: null },
    ],
  });
  return { ...build(), rebuild: build };
}

function cabinetStages(dev, cab) {
  const build = () => ({
    title: cab.name.toUpperCase(),
    items: stagesForCabinet(cab.id).map((s) => ({
      label: `${s.id}  ${s.mission.type}`,
      submenu: () => stageActions(dev, s),
    })),
  });
  return { ...build(), rebuild: build };
}

function stagesMenu(dev) {
  const build = () => ({
    title: 'STAGES',
    items: CABINETS.map((cab) => ({
      label: `${cab.name}  (needs ${UNLOCKS[cab.id] ?? 0} plugs)`,
      submenu: () => cabinetStages(dev, cab),
    })),
  });
  return { ...build(), rebuild: build };
}

function bossesMenu(dev) {
  const build = () => ({
    title: 'BOSSES',
    items: Object.keys(BOSSES).flatMap((id) => {
      const scenario = { kind: 'boss', id };
      return [{
        label: `${id.toUpperCase()} — ${BOSSES[id].name || id}`,
        submenu: () => ({
          title: id.toUpperCase(),
          items: [
            { label: 'FIGHT', act: () => { dev.close(); dev.ctx.Flow.startBoss(id, dev.seedLock ?? undefined); } },
            { label: 'BOT-PLAY', act: () => watch(dev, scenario) },
            { label: 'CRASH TEST', act: () => watch(dev, scenario, { crash: true }) },
          ],
        }),
      }];
    }),
  });
  return { ...build(), rebuild: build };
}

// The new-file opening — difficulty select, then the intro panels — is
// otherwise reachable only by starting a genuine new save, which makes it the
// hardest sequence in the game to iterate on.
//
// REPLAY is non-destructive: it runs the same two screens against the current
// slot, so wording and pacing can be checked without losing progress. Note
// DifficultyState does commit its pick to the slot, so the difficulty may
// change — reset it under SAVE. FRESH SLOT is the honest end-to-end version
// and says so in the label, because it erases.
function newFileSequence(dev, { wipe }) {
  const { Flow, save } = dev.ctx;
  dev.close();
  if (wipe) save.newSlot(save.slotIndex, Date.now());
  setState(new DifficultyState({
    save,
    onDone: () => setState(new IntroState({
      onDone: () => {
        save.slot.campaign.storyFlags.sawIntro = true;
        save.persist();
        Flow.toHub();
      },
    })),
  }));
}

function newFileMenu(dev) {
  const { Flow, save } = dev.ctx;
  const go = (fn) => () => { dev.close(); fn(); };
  const build = () => ({
    title: 'NEW FILE',
    items: [
      { label: 'REPLAY OPENING (keeps save)', act: () => newFileSequence(dev, { wipe: false }) },
      { label: `FRESH SLOT ${save.slotIndex + 1} — ERASES IT`, act: () => newFileSequence(dev, { wipe: true }) },
      { label: 'DIFFICULTY SELECT only', act: go(() => setState(new DifficultyState({ save, onDone: () => Flow.toHub() }))) },
      { label: 'INTRO PANELS only', act: go(() => setState(new IntroState({ onDone: () => Flow.toHub() }))) },
      {
        label: 'REARM INTRO (clear sawIntro)',
        act: () => {
          if (!save.slot) return dev.say('NO SLOT');
          save.slot.campaign.storyFlags.sawIntro = false;
          save.persist();
          dev.say('INTRO WILL REPLAY FROM TITLE');
        },
      },
    ],
  });
  return { ...build(), rebuild: build };
}

function scenesMenu(dev) {
  const { Flow, save } = dev.ctx;
  const go = (fn) => () => { dev.close(); fn(); };
  const build = () => ({
    title: 'SCENES',
    items: [
      { label: 'HUB', act: go(() => Flow.toHub()) },
      { label: 'TITLE', act: go(() => Flow.toTitle()) },
      { label: 'NEW FILE ▸', submenu: () => newFileMenu(dev) },
      { label: 'ARCADE', act: go(() => Flow.openArcade()) },
      { label: 'STAGE SELECT', act: go(() => Flow.openCabinet(CABINETS[0])) },
      { label: 'RESULTS (fake S-rank)', act: () => instantClear(dev, STAGES[0]) },
      // The losing half of the same screen. Deliberately not STAGES[0]: the
      // shortfall line only has something to say on a counted mission, and
      // plumber-1 is a reach.
      { label: 'RESULTS (fake mission fail)', act: () => instantFail(dev, STAGES.find((s) => s.mission.n)) },
      { label: 'FINALE', act: go(() => Flow.startFinale()) },
      // Every authored text screen in one index — see dev/prose.js for why the
      // rows below cannot cover it (the stage intros have no other route at
      // all, and the briefings are one stage launch each).
      { label: 'STORY TEXT ▸', submenu: () => proseMenu(dev) },
      { label: 'ATTRACT (real)', act: go(() => Flow.startAttract()) },
      { label: 'FIELD GUIDE', act: go(() => setState(new FieldGuideState({ settings: save.settings, onDone: () => Flow.toHub() }))) },
      { label: 'SOUND TEST', act: go(() => setState(new SoundTestState({ onDone: () => Flow.toHub() }))) },
      // The desk's own songs, heard on the game's jukebox rather than through the
      // mixing desk — the game's master chain, the game's visualisers, the game's
      // speakers. There is no production route to these and there is not meant to be:
      // see src/dev/desk-songs.js for what is in the list and what it costs.
      ...(DESK_SONGS.length ? [{
        label: 'DESK SONGS (JUKEBOX) ▸',
        submenu: () => ({
          title: 'DESK SONGS',
          items: DESK_SONGS.map((song, i) => ({
            label: song.name,
            // Opened on the row it names, already playing, with the whole jukebox
            // behind it — so the game's own tracks are one press away for a comparison.
            act: go(() => setState(new SoundTestState({
              onDone: () => Flow.toHub(),
              tracks: [...JUKEBOX, ...DESK_SONGS],
              initialTrack: JUKEBOX.length + i,
            }))),
          })),
        }),
      }] : []),
      { label: 'HOW TO PLAY', act: go(() => setState(new HowToPlayState({ onDone: () => Flow.toHub() }))) },
      { label: 'OVERTIME', act: go(() => Flow.startOvertime(dev.seedLock ?? undefined)) },
      {
        label: 'MINIGAMES ▸',
        submenu: () => ({
          title: 'MINIGAMES',
          items: MINIGAMES.map((g) => ({ label: g.toUpperCase(), act: go(() => Flow.playMinigame(g)) })),
        }),
      },
    ],
  });
  return { ...build(), rebuild: build };
}

function gameAlternatesMenu(dev) {
  const { Flow } = dev.ctx;
  const go = (fn) => () => { dev.close(); fn(); };
  const launchMenu = (song) => {
    // The food court is the game's hub, not a cabinet, but it is still a live
    // game loop. There is no cabinet screen between START and that loop, so
    // both entries land in the hub with the alternate selected.
    if (song.alternateOf === 'hub') {
      const enterHub = () => { Flow.setGameAlternate(song.id); Flow.toHub(); };
      return {
        title: song.title,
        items: [
          { label: 'START', act: go(enterHub) },
          { label: 'GAME LOOP', act: go(enterHub) },
        ],
      };
    }
    const cab = CABINET_BY_ID[song.alternateOf];
    if (!cab) {
      return {
        title: song.title,
        items: [{ label: 'GAME LOOP', act: go(() => { Flow.setGameAlternate(song.id); Flow.toHub(); }) }],
      };
    }
    const stages = stagesForCabinet(cab.id);
    return {
      title: song.title,
      items: [
        { label: 'START', act: go(() => { Flow.setGameAlternate(song.id); Flow.openCabinet(cab); }) },
        {
          label: 'GAME LOOP ▸',
          submenu: () => ({
            title: 'GAME LOOP',
            items: stages.map((stage) => ({
              label: stage.id.toUpperCase(),
              act: go(() => { Flow.setGameAlternate(song.id); Flow.launchStage(cab, stage, []); }),
            })),
          }),
        },
      ],
    };
  };
  return {
    title: 'GAME ALTERNATES',
    items: Object.values(GAME_ALTERNATES)
      .filter((song) => song.alternateOf === 'hub' || CABINET_BY_ID[song.alternateOf])
      .map((song) => ({
      label: `${song.title}  (${song.alternateOf.toUpperCase()})`,
      submenu: () => launchMenu(song),
      })),
  };
}

function visualizersMenu(dev) {
  const previousState = currentState();
  const launch = (index, audition = false) => {
    // Set on every launch, not just the audition one, so the mode cannot leak
    // from an audition into the next preset opened from this list.
    setMegamixAudition(audition);
    dev.close();
    setState(new SoundTestState({
      onDone: () => {
        setMegamixAudition(false);
        if (!previousState) return dev.ctx.Flow.toHub();
        setState(previousState);
        dev.reopenMenuAfterState(previousState);
      },
      initialTrack: JUKEBOX.length - 1,
      startVisualizer: true,
      startVisualizerIndex: index,
    }));
  };
  const megamixIndex = VISUALIZER_NAMES.indexOf('VJ MEGAMIX');
  const build = () => ({
    title: 'VISUALISERS',
    items: [
      ...VISUALIZER_NAMES.map((name, index) => ({
        label: `${String(index + 1).padStart(2, '0')}  ${name}`,
        act: () => launch(index),
      })),
      // The audition sorts after the pack it is auditioning: it is a bench, not
      // a preset, and it never ships.
      ...(megamixIndex >= 0 ? [{
        label: `--  AUDITION MEGAMIX MOVES  (${MEGAMIX_TRANSITIONS.length} x ${MEGAMIX_AUDITION_BEATS} BEATS)`,
        act: () => launch(megamixIndex, true),
      }] : []),
    ],
  });
  return { ...build(), rebuild: build };
}

function saveMenu(dev) {
  const { save } = dev.ctx;
  const slot = () => save.slot;
  const build = () => {
    const s = slot();
    if (!s) return { title: 'SAVE', items: [{ label: 'NO SLOT SELECTED — start a game first', act: null }] };
    return {
      title: 'SAVE',
      items: [
        { label: 'EXPORT SAVE FILE', act: () => dev.exportSave() },
        { label: 'IMPORT SAVE FILE', act: () => dev.importSave() },
        {
          label: 'UNLOCK EVERYTHING',
          act: () => {
            for (const st of STAGES) s.campaign.plugs[st.id] = [true, true, true];
            for (const cab of CABINETS) s.campaign.cleared[cab.id] = true;
            for (const b of Object.keys(BOSSES)) s.campaign.bossesDown[b] = true;
            s.campaign.storyFlags.sawIntro = true;
            save.persist();
            dev.say('EVERYTHING UNLOCKED');
          },
        },
        {
          label: 'WIPE PROGRESS (keep slot)',
          act: () => {
            s.campaign.plugs = {}; s.campaign.cleared = {}; s.campaign.bossesDown = {};
            save.persist();
            dev.say('PROGRESS WIPED');
          },
        },
        { label: `PLUGS: ${totalPlugs(s)}/${MAX_PLUGS}`, act: null },
        {
          label: `COINS: ${formatCoins(s.coins)}`,
          adjust: (d) => { s.coins = Math.max(0, s.coins + d * 500); save.persist(); },
        },
        {
          label: `DIFFICULTY: ${s.difficulty}`,
          adjust: (d) => { s.difficulty = Math.min(5, Math.max(1, s.difficulty + d)); save.persist(); },
        },
        {
          label: 'GRANT ALL MODS',
          act: () => {
            s.mods.found = MODS.map((m) => m.id);
            save.persist();
            dev.say(`${s.mods.found.length} MODS GRANTED`);
          },
        },
        {
          label: 'MAX BENCH UPGRADES',
          act: () => {
            for (const u of BENCH_UPGRADES) s.bench[u.id] = u.max;
            save.persist();
            dev.say('BENCH MAXED');
          },
        },
        {
          label: 'MARK BOSSES DOWN',
          act: () => {
            for (const b of Object.keys(BOSSES)) s.campaign.bossesDown[b] = true;
            save.persist();
            dev.say('BOSSES MARKED DOWN');
          },
        },
      ],
    };
  };
  return { ...build(), rebuild: build };
}

function spawnMenu(dev) {
  const build = () => ({
    title: 'SPAWN',
    items: Object.keys(OBSTACLES).map((type) => ({
      label: type,
      act: () => {
        const r = dev.run();
        if (!r) return dev.say('NO RUN ACTIVE');
        r.devSpawn(type);
        dev.say(`SPAWNED ${type}`);
      },
    })),
  });
  return { ...build(), rebuild: build };
}

// The reference view for the tuning constants. The strip (`T` during a run) is
// the working surface — it leaves the game running, which is the only way to
// judge a stride. This is the other half: full names, the whole group at once,
// and the derived block spelled out rather than compressed onto one line.
//
// Adjusting from here freezes the frame, which is fine for the numbers you read
// rather than watch — a jump height or a fairness gap tells you the answer
// without anything having to move.
function tuneMenu(dev, group) {
  const build = () => {
    const rows = byGroup(group);
    const items = [];
    if (!tuningAvailable()) {
      items.push({ label: 'NO TUNABLES REGISTERED', act: null });
      items.push({ label: 'this is not a watch build (npm run dev)', act: null });
      return { title: group.toUpperCase(), items };
    }
    const run = dev.run();
    for (const row of rows) {
      if (!knows(row.name)) continue;
      const v = readOne(row.name);
      const moved = v !== defaultOf(row.name);
      const shown = row.fmt > 0 ? v.toFixed(row.fmt) : String(Math.round(v));
      items.push({
        label: `${row.name}: ${shown}${moved ? ` (was ${defaultOf(row.name)})` : ''}`,
        adjust: (d) => { nudge(row.name, d * row.step, run); },
      });
    }

    // ---- derived: what the numbers above actually cost --------------------
    const d = derived(run);
    items.push({ label: '─── derived ───', act: null });
    if (!run) {
      items.push({ label: 'no run active — start a stage for live figures', act: null });
    } else {
      items.push({ label: `HERO: ${d.hero} jumpMult ${d.jumpMult} maxJumps ${d.maxJumps}`, act: null });
      items.push({ label: `JUMP HEIGHT: ${d.jump.toFixed(1)}px   AIRTIME: ${d.air.toFixed(3)}s`, act: null });
      items.push({ label: `SPEED NOW: ${Math.round(d.speed)} px/s`, act: null });
      if (d.gap != null) {
        items.push({ label: `FAIR GAP jump>duck: ${Math.round(d.gap)}px  (react ${d.react})`, act: null });
        items.push({ label: `RUNWAY: ${d.runway.toFixed(2)}s   MARGIN: ${d.margin.toFixed(3)}s`, act: null });
      }
      if (d.pan != null) {
        items.push({
          label: `CAMERA: peak ${Math.round(d.peak)}px  pan ${Math.round(d.pan)}/${Math.round(PAN_MAX)}  zoom ${d.zoom.toFixed(2)}`,
          act: null,
        });
      } else {
        items.push({ label: 'CAMERA: jump to measure the crane', act: null });
      }
      // Declared fairness estimate vs what the cast can actually produce. The
      // spawner sizes every jump gap off the former, so if it sits below the
      // latter the guaranteed runway is short for whoever can outjump it.
      //
      // Stated rather than flagged: worstAirtime() is
      // (2·BASE_JUMP_V·0.9)/(GRAVITY·1.25), so this ratio does not move when
      // anything on this screen moves. It is a fact about the spawner, not a
      // consequence of your tuning — which is exactly why it is worth printing
      // where somebody will read it rather than warning about it every frame.
      items.push({
        label: `WORST AIRTIME: declared ${d.worst.toFixed(3)}s vs cast max ${d.castMax.toFixed(3)}s`,
        act: null,
      });
      if (d.airtimeUnderstated) {
        const short = (d.castMax - d.worst) * d.speed;
        items.push({
          label: `  understated by ${Math.round((d.castMax - d.worst) * 1000)}ms = ${Math.round(short)}px of runway here`,
          act: null,
        });
      }
    }
    for (const w of d.warn) items.push({ label: `! ${w}`, act: null });

    items.push({ label: '─── actions ───', act: null });
    const moved = changed().length;
    items.push({
      label: `COPY CONSTANTS${moved ? ` (${moved} changed)` : ' (nothing changed)'}`,
      act: () => dev.copyConstants(),
    });
    items.push({
      label: 'REVERT ALL',
      act: () => {
        const n = revertTuning();
        dev.say(n ? `REVERTED ${n}` : 'NOTHING TO REVERT');
        if (run) resyncRun(run);
      },
    });
    items.push({
      label: `LIVE STRIP: ${TuneStrip.on ? 'ON' : 'off'} — press T with the menu closed`,
      // Through dev.setTuneMode rather than TuneStrip.toggle: the strip coming
      // up also takes the arrow keys off the game and makes the run
      // invulnerable, and a second door into the same state must do all of it.
      act: () => { dev.setTuneMode(!TuneStrip.on); },
    });
    return { title: group.toUpperCase(), items };
  };
  return { ...build(), rebuild: build };
}

function runMenu(dev) {
  const build = () => {
    const r = dev.run();
    if (!r) {
      return {
        title: 'RUN',
        items: [
          { label: 'NO RUN ACTIVE', act: null },
          { label: `SEED LOCK: ${dev.seedLock ?? 'off'}`, adjust: (d) => { dev.seedLock = dev.seedLock == null ? 1000 : Math.max(0, dev.seedLock + d); } },
          { label: `TIME SCALE: x${dev.timeScale}`, adjust: (d) => dev.cycleSpeed(d) },
        ],
      };
    }
    return {
      title: 'RUN',
      items: [
        { label: `INVULNERABLE: ${r.devInvuln ? 'ON' : 'off'}`, act: () => { r.devInvuln = !r.devInvuln; } },
        { label: `FORCE MISSION: ${r.devForceMission ? 'ON' : 'off'}`, act: () => { r.devForceMission = !r.devForceMission; } },
        { label: `HITBOXES: ${r.debug ? 'ON' : 'off'}`, act: () => { r.debug = !r.debug; } },
        { label: `TIME SCALE: x${dev.timeScale}`, adjust: (d) => dev.cycleSpeed(d) },
        { label: `SEED LOCK: ${dev.seedLock ?? 'off'}`, adjust: (d) => { dev.seedLock = dev.seedLock == null ? r.seed : Math.max(0, dev.seedLock + d); } },
        { label: `BATTERY: ${r.battery}/${r.maxBattery()}`, adjust: (d) => { r.battery = Math.min(r.maxBattery(), Math.max(0, r.battery + d)); } },
        { label: 'REFILL BATTERY', act: () => { r.battery = r.maxBattery(); dev.say('BATTERY FULL'); } },
        // Distinct from WIN NOW, which calls endRun() and never draws the
        // marker at all. This plays the real ending: the dash, the plunger, the
        // flag. 5 seconds of lead so the approach is in shot too.
        { label: 'RUN THE FINISH (5s)', act: () => { dev.close(); r.devRunFinish(5); } },
        { label: 'WIN NOW (skips the finish)', act: () => { dev.close(); r.devPerfect(); } },
        { label: 'LOSE NOW', act: () => { dev.close(); r.endRun(false, 'DEV'); } },
        { label: 'SPAWN ▸', submenu: () => spawnMenu(dev) },
        { label: `HITS: ${r.devHits.length}  ${JSON.stringify(r.devHitTally())}`, act: null },
      ],
    };
  };
  return { ...build(), rebuild: build };
}

function infoMenu(dev) {
  const build = () => {
    const r = dev.run();
    const cur = typeof window !== 'undefined' ? window.__mash_state : '?';
    const s = dev.ctx.save.slot;
    const items = [
      { label: `STATE: ${cur}`, act: null },
      { label: `SLOT: ${s ? `plugs ${totalPlugs(s)}/${MAX_PLUGS}  coins ${formatCoins(s.coins)}  diff ${s.difficulty}` : 'none'}`, act: null },
    ];
    if (r) {
      items.push(
        { label: `STAGE: ${r.stage ? r.stage.id : r.bossCab || 'overtime'}`, act: null },
        { label: `SEED: ${r.seed}`, act: null },
        { label: `BATTERY: ${r.battery}/${r.maxBattery()}`, act: null },
        { label: `HERO: ${r.relay ? r.relay.current : '?'}`, act: null },
        { label: `MISSION: ${r.mission.type} ${r.mission.count ?? ''}/${r.mission.n ?? ''} sat=${r.missionSatisfied()}`, act: null },
        { label: `DIST: ${Math.floor(r.distance)}/${Math.floor(r.totalDist)}`, act: null },
        { label: `ENTITIES: ob ${r.obstacles.length}  pk ${r.pickups.length}  pr ${r.projectiles.length}`, act: null },
      );
    }
    return { title: 'INFO', items };
  };
  return { ...build(), rebuild: build };
}

export function rootMenu(dev) {
  const build = () => ({
    title: 'DEV MENU',
    items: [
      { label: 'STAGES ▸', submenu: () => stagesMenu(dev) },
      // Keep the saved-song launcher in the first screenful. On a phone the
      // root menu has fewer visible rows, and this overlay deliberately has no
      // swipe-to-scroll gesture; a row below the fold is otherwise unreachable
      // without a physical keyboard.
      { label: 'GAME ALTERNATES ▸', submenu: () => gameAlternatesMenu(dev) },
      { label: 'BOSSES ▸', submenu: () => bossesMenu(dev) },
      { label: 'TROPHY ROOM', act: () => {
        dev.close();
        dev.ctx.Flow.openTrophyRoom();
      } },
      { label: "DOLORES' REPAIR BENCH", act: () => {
        dev.close();
        dev.ctx.Flow.openBench();
      } },
      { label: "GARY'S PAWN SHOP", act: () => {
        dev.close();
        dev.ctx.Flow.openShop();
      } },
      { label: 'CAST ROLL', act: () => {
        dev.close();
        setState(new CastState({ realSettings: dev.ctx.save.settings, slot: dev.ctx.save.slot, onExit: () => dev.ctx.Flow.toTitle() }));
      } },
      { label: 'CREDITS', act: () => {
        dev.close();
        setState(new CreditsState({ settings: dev.ctx.save.settings, onDone: () => dev.ctx.Flow.toHub() }));
      } },
      { label: 'VISUALISERS ▸', submenu: () => visualizersMenu(dev) },
      { label: 'SCENES ▸', submenu: () => scenesMenu(dev) },
      { label: 'SAVE ▸', submenu: () => saveMenu(dev) },
      { label: 'RUN ▸', submenu: () => runMenu(dev) },
      { label: 'PHYSICS ▸', submenu: () => tuneMenu(dev, GROUPS[0]) },
      { label: 'GAIT ▸', submenu: () => tuneMenu(dev, GROUPS[1]) },
      { label: 'INFO ▸', submenu: () => infoMenu(dev) },
    ],
  });
  return { ...build(), rebuild: build };
}

// ------------------------------------------------------------------- render
// One size for every screen in this menu. The root used to be drawn smaller
// than its own submenus, which made "how deep am I" a question you answered by
// squinting; a single size is both easier to read and one less thing to tune.
// Portrait multiplies it by PORTRAIT_TEXT_S, which is picked so the lettering
// comes out the same physical size in both orientations (~18 CSS px on a phone).
const ROW_TEXT_S = 1.5;
// The breadcrumb is a heading, so it outranks the rows it sits above.
const HEADER_TEXT_S = 1.85;
const ROW_H = 21;
// Portrait fill hands this overlay the whole phone (setDevPortraitFill). Rows
// stay in logical units and the stretch makes them finger-sized for free: 17
// units lands at ~42 CSS px on a 390-wide phone, which is the size a thumb
// expects, and still leaves room for thirteen of them. Glyphs are the only
// thing that has to fight the stretch.
const PORTRAIT_ROW_H = 17;
const PORTRAIT_TEXT_S = 1.75;

// The header is one button — the whole strip above the first row goes back —
// sized like one rather than like the line of text it carries: a bar tall
// enough for a heading and an arrow a thumb can hit without aiming.
const HEADER_H = 22;
const PORTRAIT_HEADER_H = 30;
// Arrow height as a fraction of the bar, in the square units the text transform
// restores. Both orientations use it, so the arrow is always in proportion to
// the header it sits in.
const BACK_ARROW_F = 0.42;
// Clearance below the last row, so a list that exactly fills the screen still
// leaves the footer hint its line.
const FOOT_GAP = 6;

// One layout for the painter and for the pointer hit-test in index.js, so a tap
// always lands on the row it is under. Both orientations run the same shape:
// header band, then as many rows as fit above the footer.
export function menuLayout() {
  const fill = !!screen.portraitFill;
  // Glyphs are drawn into a logical canvas that portrait then stretches
  // vertically, so they are pre-compressed by exactly that factor and come out
  // with normal proportions — the same trick the jukebox list uses.
  const yScale = fill ? screen.cssH / (H * Math.max(0.001, screen.scale)) : 1;
  // Portrait reaches the physical edges, so the notch and the home indicator
  // are the overlay's problem: the header drops below the island and the footer
  // lifts off the indicator. The pad applies either way, so the arrow is never
  // jammed against the glass edge on a flat-topped phone.
  const headerH = fill ? PORTRAIT_HEADER_H : HEADER_H;
  const headerTop = (fill ? screen.safeTop : 0) + 4;
  const listTop = headerTop + headerH;
  const footY = H - (fill ? screen.safeBottom : 0) - 16;
  const rowH = fill ? PORTRAIT_ROW_H : ROW_H;
  const maxRows = Math.max(1, Math.floor((footY - FOOT_GAP - listTop) / rowH));
  return {
    fill, yScale, textS: fill ? PORTRAIT_TEXT_S : 1,
    rowTextS: ROW_TEXT_S, headerTextS: HEADER_TEXT_S,
    headerTop, crumbMid: headerTop + headerH / 2,
    listTop, rowH, maxRows, footY,
  };
}

// A left arrow drawn in square units whatever the canvas is doing to the axes:
// the same y-compression the glyphs get, so it cannot come out as a stretched
// wedge. `h` is its full height, and it is centred on (x, midY).
function drawBackArrow(ctx, L, x, midY, h, color) {
  ctx.save();
  ctx.translate(x, midY);
  if (L.fill) ctx.scale(1, 1 / L.yScale);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, h * 0.15);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(h * 0.06, -h * 0.42);
  ctx.lineTo(-h * 0.34, 0);
  ctx.lineTo(h * 0.06, h * 0.42);
  ctx.moveTo(-h * 0.30, 0);
  ctx.lineTo(h * 0.40, 0);
  ctx.stroke();
  ctx.restore();
}

export function drawMenu(ctx, dev) {
  const top = dev.top();
  if (!top) return;
  const L = menuLayout();
  // Text is the only thing the portrait stretch is allowed to touch: compress
  // by yScale so the fill expands it back, and take the size back up so a
  // phone-sized row is legible rather than merely tall.
  const text = (str, x, y, color, scale = 1, centered = false) => {
    const paint = centered ? drawTextCentered : drawText;
    if (!L.fill) return paint(ctx, str, x, y, color, scale);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 1 / L.yScale);
    paint(ctx, str, 0, 0, color, scale * L.textS);
    ctx.restore();
  };
  // One size for every row means the longest label decides nothing: the few
  // lines that would run off the edge are shrunk to fit and the rest are left
  // alone. Portrait needs this most — 390 CSS px where landscape has 693, and a
  // stage row carries its plug requirement too — but a 27-character boss name
  // can overrun either.
  const fit = (str, scale, x, right = 8) => {
    const w = textWidth(str, scale * L.textS);
    const avail = W - x - right;
    return w > avail ? scale * (avail / w) : scale;
  };

  // A rounded panel drawn in a stretched space has stretched corners, so
  // portrait takes a plain full-bleed backing instead — opaque, because the
  // frozen screen behind it is stretched too and reads as smeared ghosting
  // through anything less.
  if (L.fill) {
    ctx.fillStyle = '#14121f';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = 'rgba(11,11,20,0.86)';
    ctx.fillRect(0, 0, W, H);
    drawPanel(ctx, 8, 6, W - 16, H - 12, 3, 'rgba(20,18,34,0.95)');
  }

  // A phone has no Backspace and no backquote, so the way out has to be visible
  // rather than known: the whole header is the back button, and the arrow is
  // what says so. At the root screen back IS close, which is the escape from the
  // overlay itself. Desktop keeps the bare breadcrumb and its key hints.
  const touch = Input.isTouchDevice();
  const arrowH = BACK_ARROW_F * (L.listTop - L.headerTop) * L.yScale;
  let crumbX = 14;
  if (touch) {
    const arrowX = 14 + arrowH * 0.34;
    drawBackArrow(ctx, L, arrowX, L.crumbMid, arrowH, GOLD);
    crumbX = arrowX + arrowH * 0.4 + (L.fill ? 16 : 7);
    // A tint and a rule, so the header reads as its own surface rather than as
    // the first row. The rule is ~1.5 CSS px in whichever axis scale is in force.
    if (L.fill) {
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(0, 0, W, L.listTop);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, L.listTop - (L.fill ? 0.6 : 1), W, L.fill ? 0.6 : 1);
  }

  const crumbs = dev.stack.map((s) => s.title).join(' / ');
  const crumbS = fit(crumbs, L.headerTextS, crumbX);
  text(crumbs, crumbX, textYForMid(L.crumbMid, crumbS * L.textS / L.yScale), GOLD, crumbS);
  // Name the controls the device in hand actually has: the phone that opened
  // this from the portrait card has no key to press and no ` to close with.
  text(touch
    ? 'TAP A ROW TO PICK   ← GOES BACK'
    : '↑↓ MOVE  ←→ ADJUST  ENTER PICK  BKSP BACK  ` CLOSE', 14, L.footY, DIM, 0.75);

  // Scroll window so long lists (27 stages, every obstacle type) stay usable.
  const n = top.items.length;
  const first = Math.max(0, Math.min(n - L.maxRows, top.idx - Math.floor(L.maxRows / 2)));
  const shown = top.items.slice(first, first + L.maxRows);

  shown.forEach((item, i) => {
    const realIdx = first + i;
    const sel = realIdx === top.idx;
    const inert = !item.act && !item.submenu && !item.adjust;
    const label = (sel ? '> ' : '  ') + item.label;
    const scale = fit(label, L.rowTextS, 14);
    // The ink is centred in its row in both orientations: the label is sized
    // against the row height the layout chose, not the other way round, and a
    // line shrunk to fit still sits on the same centreline as its neighbours.
    const y = textYForMid(L.listTop + (i + 0.5) * L.rowH, scale * L.textS / L.yScale);
    text(label, 14, y, sel ? GOLD : inert ? DIM : FG, scale);
  });

  if (n > L.maxRows) {
    text(`${top.idx + 1}/${n}`, W - 34, L.footY, DIM, 0.75, true);
  }
}
