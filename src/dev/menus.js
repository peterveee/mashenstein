// Dev menu tree. Each screen is {title, items, rebuild}, where rebuild() is
// re-run after every action so labels track live state — the same approach
// SettingsState uses in game/menus.js.
//
// Items: {label, act?, submenu?, adjust?}
import { W, H } from '../engine/renderer.js';
import { drawText, drawTextCentered, drawPanel } from '../engine/sprites.js';
import { setState } from '../engine/states.js';
import { STAGES, stagesForCabinet, UNLOCKS } from '../data/stages.js';
import { CABINETS, CABINET_BY_ID } from '../data/cabinets.js';
import { BOSSES } from '../game/boss.js';
import { OBSTACLES } from '../game/entities.js';
import { MODS, BENCH_UPGRADES } from '../data/progression.js';
import { MINIGAMES } from '../game/minigames/index.js';
import { applyResult, totalPlugs, MAX_PLUGS, formatCoins } from '../game/progress.js';
import { AttractState } from '../game/attract.js';
import { ResultsState, BriefingState, FieldGuideState, SoundTestState, HowToPlayState, DifficultyState, IntroState } from '../game/menus.js';
import { CastState } from '../game/cast.js';

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

// ------------------------------------------------------------------ screens
function stageActions(dev, stage) {
  const cab = CABINET_BY_ID[stage.cabinet];
  const scenario = { kind: 'stage', id: stage.id };
  const build = () => ({
    title: stage.id.toUpperCase(),
    items: [
      { label: 'PLAY', act: () => { dev.close(); dev.ctx.Flow.launchStage(cab, stage, [], dev.seedLock ?? undefined); } },
      { label: 'BOT-PLAY', act: () => watch(dev, scenario) },
      { label: 'CRASH TEST', act: () => watch(dev, scenario, { crash: true }) },
      { label: 'INSTANT-CLEAR', act: () => instantClear(dev, stage) },
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
      { label: 'BENCH', act: go(() => Flow.openBench()) },
      { label: 'SHOP', act: go(() => Flow.openShop()) },
      { label: 'ARCADE', act: go(() => Flow.openArcade()) },
      { label: 'STAGE SELECT', act: go(() => Flow.openCabinet(CABINETS[0])) },
      { label: 'RESULTS (fake S-rank)', act: () => instantClear(dev, STAGES[0]) },
      { label: 'FINALE', act: go(() => Flow.startFinale()) },
      { label: 'CAST ROLL', act: go(() => setState(new CastState({ realSettings: save.settings, onExit: () => Flow.toTitle() }))) },
      { label: 'ATTRACT (real)', act: go(() => Flow.startAttract()) },
      { label: 'FIELD GUIDE', act: go(() => setState(new FieldGuideState({ settings: save.settings, onDone: () => Flow.toHub() }))) },
      { label: 'SOUND TEST', act: go(() => setState(new SoundTestState({ onDone: () => Flow.toHub() }))) },
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

function saveMenu(dev) {
  const { save } = dev.ctx;
  const slot = () => save.slot;
  const build = () => {
    const s = slot();
    if (!s) return { title: 'SAVE', items: [{ label: 'NO SLOT SELECTED — start a game first', act: null }] };
    return {
      title: 'SAVE',
      items: [
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
        { label: 'WIN NOW', act: () => { dev.close(); r.devPerfect(); } },
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
      { label: 'BOSSES ▸', submenu: () => bossesMenu(dev) },
      { label: 'SCENES ▸', submenu: () => scenesMenu(dev) },
      { label: 'SAVE ▸', submenu: () => saveMenu(dev) },
      { label: 'RUN ▸', submenu: () => runMenu(dev) },
      { label: 'INFO ▸', submenu: () => infoMenu(dev) },
    ],
  });
  return { ...build(), rebuild: build };
}

// ------------------------------------------------------------------- render
const ROW_H = 11;
const MAX_ROWS = 17;

export function drawMenu(ctx, dev) {
  const top = dev.top();
  if (!top) return;

  ctx.fillStyle = 'rgba(11,11,20,0.86)';
  ctx.fillRect(0, 0, W, H);
  drawPanel(ctx, 8, 6, W - 16, H - 12, 3, 'rgba(20,18,34,0.95)');

  const crumbs = dev.stack.map((s) => s.title).join(' / ');
  drawText(ctx, crumbs, 14, 12, GOLD);
  drawText(ctx, '↑↓ move  ←→ adjust  ENTER pick  BKSP back  ` close', 14, H - 16, DIM, 0.75);

  // Scroll window so long lists (27 stages, every obstacle type) stay usable.
  const n = top.items.length;
  const first = Math.max(0, Math.min(n - MAX_ROWS, top.idx - Math.floor(MAX_ROWS / 2)));
  const shown = top.items.slice(first, first + MAX_ROWS);

  shown.forEach((item, i) => {
    const realIdx = first + i;
    const sel = realIdx === top.idx;
    const y = 26 + i * ROW_H;
    const inert = !item.act && !item.submenu && !item.adjust;
    drawText(ctx, (sel ? '> ' : '  ') + item.label, 14, y, sel ? GOLD : inert ? DIM : FG, 0.85);
  });

  if (n > MAX_ROWS) {
    drawTextCentered(ctx, `${top.idx + 1}/${n}`, W - 34, H - 16, DIM, 0.75);
  }
}
