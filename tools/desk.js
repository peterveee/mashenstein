// THE DESK: one page that knows where every tool lives, and starts it for you.
//
// The tools are separate servers on purpose — the mixer wants a whole core to
// itself, and a level editor that crashed inside the same process would take a
// mix down with it. So this is a launcher, not a merger: it holds the PORT MAP,
// spawns a tool when you ask for one, and gets out of the way. No tool knows it
// exists, and every one of them still runs standalone from its own npm script.
//
// Two rules it will not break:
//
//   ADOPT, NEVER KILL. A port that is already answering belongs to somebody
//   else — most likely Peter's live mixer on 8010, mid-song. The desk links to
//   it, shows it as running, and refuses to stop it. Only a process this desk
//   started is one this desk will stop.
//
//   THE DIRECT URLS STILL WORK. 8010 is the mixer, 8020 is the SFX desk, 8001
//   is the game, as they always were. Nothing here is in the way of typing them.
//   /mixer is a shortcut ON TOP of that, not a replacement for it: it starts the
//   desk if it is cold and sends you there either way.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listBrowsers, stopBrowser } from './browsers.js';
import { BANGER_STYLES } from './lib/banger/styles/index.js';
import { BANGER_LEVEL_DATA } from './lib/banger/levels-data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = process.env.MASH_DESK_HOST || '127.0.0.1';
const PORT = Number(process.env.MASH_DESK_PORT) || 8000;

// The map. Each tool reads its port from an env var already, so the desk hands
// it one and nothing else has to change. The numbers below ARE the defaults
// those tools ship with — the desk does not move anything under you.
const TOOLS = [
  {
    id: 'game', label: 'THE GAME', port: 8001,
    script: 'build/dev.js', portEnv: 'MASH_DEV_PORT', npm: 'npm run dev',
    blurb: 'the game itself, rebuilt as you save. Also what the level editor’s PLAY button opens.',
  },
  {
    id: 'mixer', label: 'MIXER', port: 8010,
    script: 'tools/mixer.js', portEnv: 'MASH_MIXER_PORT', npm: 'npm run mixer',
    blurb: 'the song desk: lanes, voices, effects, the piano roll. Writes src/data/songs/.',
  },
  {
    id: 'sfx', label: 'SFX DESK', port: 8020,
    script: 'tools/sfx-desk.js', portEnv: 'SFX_DESK_PORT', npm: 'npm run sfx',
    blurb: 'a fader per cue over a real song. Auto walks the list; Save writes SFX_TRIM.',
  },
  {
    id: 'bangersounds', label: 'BANGER SOUND PALETTE', port: 8022,
    script: 'tools/banger-sounds.js', portEnv: 'MASH_BANGER_SOUNDS_PORT', npm: 'npm run banger-sounds',
    blurb: 'alternative style and mood presets, levels and channel effects. Compare them against a banger loop; advanced sound tables stay one click away.',
  },
  {
    id: 'levels', label: 'LEVEL EDITOR', port: 8021,
    script: 'tools/level-editor.js', portEnv: 'MASH_LEVELS_PORT', npm: 'npm run levels',
    blurb: 'the timeline of a stage: sections, set pieces, checkpoints, clock. Writes src/data/stage-layouts.js.',
  },
  {
    id: 'characters', label: 'CHARACTER EDITOR', port: 8030,
    script: 'tools/character-editor.js', portEnv: 'MASH_CHARACTERS_PORT', npm: 'npm run characters',
    blurb: 'a hero’s body dials. Applies to the hand-authored spec files only when you say so.',
  },
  {
    id: 'composition', label: 'COMPOSITION TUNER', port: 8031,
    script: 'tools/composition-tuner.js', portEnv: 'MASH_COMPOSITION_PORT', npm: 'npm run composition',
    blurb: 'where the scenery bands sit behind a level. Writes src/data/composition-profiles.js.',
  },
];
const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

// Galleries are not servers -- they are a script that runs once, writes into
// galleries/, and exits. So they get a different shape than TOOLS: no port,
// no live/dead, just RUN and a log. `needsTool` is started first (and waited
// on) when it is not already up, the way THE GAME has to be for a screenshot.
// ids come from the browser (whatever was typed or pasted into the prune
// card), so they are filtered to plausible kebab-case section ids before
// ever reaching spawn — not for injection safety (array-form spawn already
// has none of that risk), just so a stray paste cannot pass through as a
// silent no-op-looking argument.
function idsFrom(args) {
  const raw = Array.isArray(args?.ids) ? args.ids : [];
  return raw.map((s) => String(s).trim()).filter((s) => /^[a-z][a-z0-9-]*$/.test(s));
}

const ACTIONS = [
  {
    id: 'screens', label: 'REFRESH SCREEN GALLERY',
    blurb: 'drives the real game and screenshots every UI screen and cabinet, landscape + portrait, into galleries/screens.html.',
    needsTool: 'game',
    speed: 'background',
    steps: [['node', ['tools/build-screens-gallery.js']]],
    openPath: () => (existsSync(join(root, 'galleries/screens.html')) ? '/galleries/screens.html' : null),
  },
  {
    id: 'assetgallery', label: 'REFRESH ASSET GALLERY',
    blurb: 'renders every drawable (backgrounds, heroes, props, cabinets…) via the real draw functions, then archives a dated snapshot into galleries/ and rewrites the index.',
    speed: 'background',
    steps: [['node', ['tools/build-gallery.js']], ['node', ['tools/archive-gallery.js']]],
    openPath: () => latestAssetGalleryHref(),
  },
  // The lab gallery's own checkbox picker hands you a `node tools/
  // gallery-prune.js <ids> --yes` command to paste into a terminal; these two
  // let you paste the ids here instead. Split in two on purpose — PLAN never
  // writes, APPLY does — because this one action edits gallery-entry.js
  // itself, everything else here only ever writes into galleries/.
  {
    id: 'pruneplan', label: 'GALLERY: PREVIEW DELETE',
    blurb: 'dry-run of tools/gallery-prune.js for the ids below — prints exactly what would go, writes nothing.',
    needsIds: true,
    steps: (args) => [['node', ['tools/gallery-prune.js', ...idsFrom(args), '--dry-run']]],
    openPath: () => null,
  },
  {
    id: 'pruneapply', label: 'GALLERY: DELETE FOR REAL',
    blurb: 'the same ids, for real — edits tools/gallery-entry.js, drops the imports that go orphaned with them, rebuilds.',
    needsIds: true,
    steps: (args) => [['node', ['tools/gallery-prune.js', ...idsFrom(args), '--yes']]],
    openPath: () => null,
  },
];
// AUDIO REPORTS: the two song-balance tools, run from here and read on /reports.
// Each tool writes its own latest result to work/local/reports/ whether it was
// started from this desk or from a terminal, so the page is always the last run
// and never a second copy of the numbers.
//
// Under `nice`, because both render through headless Chromium for minutes at a
// time and the mixer's playback is the thing on this machine that must not glitch
// (the renders inherit the niceness from the node that spawns them).
const REPORTS_DIR = join(root, 'work/local/reports');
const BALANCE_OVERRIDES_FILE = join(root, 'tools/lib/banger/balance-overrides.json');
const reportHref = (file, anchor) => () => (existsSync(join(REPORTS_DIR, file)) ? `/reports#${anchor}` : null);
const niced = (args) => ['nice', ['-n', '15', process.execPath, ...args]];

const BALANCE_ROLE_GROUPS = [
  { id: 'lead', label: 'Leads and harmony', roles: ['square', 'bell', 'megaSaw', 'arp', 'choir', 'third', 'counter'] },
  { id: 'chords', label: 'Chords and keys', roles: ['saws', 'pad', 'piano'] },
  { id: 'bass', label: 'Bass and sub', roles: ['bass', 'sub'] },
  { id: 'drums', label: 'Drums', roles: ['kick', 'snare', 'clap', 'hats', 'ohats', 'crash', 'impact', 'fill', 'shaker', 'tambourine', 'cowbell', 'congas', 'ride'] },
];
const BALANCE_ROLE_LABELS = {
  square: 'Square lead', bell: 'Bell lead', megaSaw: 'Mega saw', arp: 'Arpeggio', choir: 'Choir',
  third: 'Third harmony', counter: 'Counter line', saws: 'Supersaw chords', pad: 'Pad chords', piano: 'Piano',
  bass: 'Bass', sub: 'Sub', kick: 'Kick', snare: 'Snare', clap: 'Clap', hats: 'Closed hats', ohats: 'Open hats',
  crash: 'Crash', impact: 'Impact', fill: 'Fill', shaker: 'Shaker', tambourine: 'Tambourine',
  cowbell: 'Cowbell', congas: 'Congas', ride: 'Ride',
};
const BALANCE_DEFAULTS = { leadCautionDb: -2.5, riffTrimDb: -3 };
const finiteDb = value => Number.isFinite(value) && value >= -12 && value <= 12;
function readBalanceOverrides() {
  try { return JSON.parse(readFileSync(BALANCE_OVERRIDES_FILE, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}
const balanceFileHash = () => createHash('sha256').update(readFileSync(BALANCE_OVERRIDES_FILE)).digest('hex');
function balancePageData() {
  const overrides = readBalanceOverrides();
  return {
    hash: balanceFileHash(),
    styles: BANGER_STYLES.map(style => {
      const base = style.balance || {};
      const saved = overrides[style.id] || {};
      const available = new Set(Object.keys(BANGER_LEVEL_DATA.refs?.[style.id] || {}).filter(role => role !== 'hook'));
      return {
        id: style.id,
        label: style.label,
        overridden: !!overrides[style.id],
        balance: {
          leadCautionDb: finiteDb(saved.leadCautionDb) ? saved.leadCautionDb
            : finiteDb(base.leadCautionDb) ? base.leadCautionDb : BALANCE_DEFAULTS.leadCautionDb,
          riffTrimDb: finiteDb(saved.riffTrimDb) ? saved.riffTrimDb
            : finiteDb(base.riffTrimDb) ? base.riffTrimDb : BALANCE_DEFAULTS.riffTrimDb,
          roleGainDb: Object.fromEntries(BALANCE_ROLE_GROUPS.flatMap(group => group.roles
            .filter(role => available.has(role)).map(role => [role,
              finiteDb(saved.roleGainDb?.[role]) ? saved.roleGainDb[role]
                : finiteDb(base.roleGainDb?.[role]) ? base.roleGainDb[role] : 0]))),
        },
        roleGroups: BALANCE_ROLE_GROUPS.map(group => ({
          id: group.id,
          label: group.label,
          roles: group.roles.filter(role => available.has(role)).map(role => ({ id: role, label: BALANCE_ROLE_LABELS[role] || role })),
        })).filter(group => group.roles.length),
      };
    }),
  };
}
function atomicWrite(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}
function balanceDb(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < -12 || n > 12 || Math.abs(n * 2 - Math.round(n * 2)) > 1e-8) {
    throw new Error(`${name} must be between -12 and +12 dB in half-dB steps`);
  }
  return Math.round(n * 2) / 2;
}
function saveBalanceOverride({ styleId, balance, reset = false }) {
  const style = BANGER_STYLES.find(item => item.id === styleId);
  if (!style) throw new Error('choose a Banger style');
  const overrides = readBalanceOverrides();
  if (reset) {
    delete overrides[styleId];
  } else {
    if (!balance || typeof balance !== 'object' || Array.isArray(balance)) throw new Error('balance values are missing');
    const allowed = new Set(Object.keys(BANGER_LEVEL_DATA.refs?.[styleId] || {}).filter(role => role !== 'hook'));
    const submitted = balance.roleGainDb || {};
    if (!submitted || typeof submitted !== 'object' || Array.isArray(submitted)) throw new Error('part balances are invalid');
    for (const role of Object.keys(submitted)) if (!allowed.has(role)) throw new Error(`unknown role for ${styleId}: ${role}`);
    const requested = {
      leadCautionDb: balanceDb(balance.leadCautionDb, 'Lead trim'),
      riffTrimDb: balanceDb(balance.riffTrimDb, 'Main hook trim'),
      roleGainDb: Object.fromEntries([...allowed].map(role => [role,
        Object.hasOwn(submitted, role) ? balanceDb(submitted[role], `${role} trim`)
          : balancePageData().styles.find(row => row.id === styleId).balance.roleGainDb[role]])),
    };
    const base = style.balance || {};
    const patch = {};
    const leadDefault = finiteDb(base.leadCautionDb) ? base.leadCautionDb : BALANCE_DEFAULTS.leadCautionDb;
    const hookDefault = finiteDb(base.riffTrimDb) ? base.riffTrimDb : BALANCE_DEFAULTS.riffTrimDb;
    if (requested.leadCautionDb !== leadDefault) patch.leadCautionDb = requested.leadCautionDb;
    if (requested.riffTrimDb !== hookDefault) patch.riffTrimDb = requested.riffTrimDb;
    const rolePatch = {};
    for (const role of allowed) {
      const baseDb = finiteDb(base.roleGainDb?.[role]) ? base.roleGainDb[role] : 0;
      if (requested.roleGainDb[role] !== baseDb) rolePatch[role] = requested.roleGainDb[role];
    }
    if (Object.keys(rolePatch).length) patch.roleGainDb = rolePatch;
    if (Object.keys(patch).length) overrides[styleId] = patch;
    else delete overrides[styleId];
  }
  atomicWrite(BALANCE_OVERRIDES_FILE, `${JSON.stringify(overrides, null, 2)}\n`);
  return balancePageData();
}

ACTIONS.push(
  {
    id: 'songlevels', group: 'audio', label: 'SONG LEVELS: MEASURE',
    blurb: 'renders every song that ships and measures it against its line — -21 LUFS for the cabinets, finale and megamix, -24 for the title, Food Court and shop (tools/song-levels.js). Writes only the report. About fifteen minutes.',
    speed: 'background',
    steps: [niced(['tools/song-levels.js'])],
    openPath: reportHref('song-levels.json', 'levels'),
  },
  {
    id: 'songlevelsapply', group: 'audio', label: 'SONG LEVELS: APPLY',
    blurb: 'measures, sets each off-line song’s level, and re-measures until it lands — edits src/data/songs/. A song with a compressor on its master is levelled by a Gain at the END of its master chain, so the compressor keeps working as you tuned it; the master fader stays yours. Save the mixer first, and reload the song there after.',
    confirm: true,
    speed: 'background',
    steps: [niced(['tools/song-levels.js', '--apply'])],
    openPath: reportHref('song-levels.json', 'levels'),
  },
  {
    id: 'bassreport', group: 'audio', label: 'BASS REPORT',
    blurb: 'band balance of the ticked songs against the finished cabinets’ median, with advice (tools/bass-report.js). Unticked songs keep their last rows. Only songs that changed are re-rendered. + LANES also solos every lane of each ticked song — slow, about ten minutes a song. Writes only the report.',
    // One card, a toggle per shipped song (all on by default); + LANES is an option,
    // off by default, that adds the per-lane breakdown for whatever is ticked.
    choices: ['plumber', 'speed', 'rhythm', 'frost', 'crypt', 'neon', 'cardboard', 'office', 'surge', 'title', 'hub', 'shop', 'finale', 'megamix'],
    options: [{ key: 'lanes', label: '+ LANES', flag: '--lanes' }],
    needsIds: true,
    speed: 'background',
    steps: (args) => [niced(['tools/bass-report.js', ...idsFrom(args), ...optionFlags('bassreport', args)])],
    openPath: reportHref('bass-report.json', 'bass'),
  },
  {
    id: 'bangerlevels', group: 'audio', label: 'BANGER LEVELS',
    blurb: 'makes test bangers in the ticked styles and renders them channel by channel: how far each channel lands from the part it is matched to (the style’s seed banger once you have used one, else its seed remix), before levelling and after (tools/banger-levels.js). Measures any new banger sound first. Writes only the report. About ten minutes a style. + FIT folds each channel’s average miss into the levels.',
    choices: ['big-room', 'trance', 'future-bass', 'eurobeat', 'chipstep', 'synthwave', 'shibuya', 'dnb', 'electro', 'megadrive', 'deep-house', 'nu-disco', 'downtempo', 'eurodance', 'italo-disco', 'electro-funk', 'french-house', 'reggaeton', 'moombahton', 'merenhouse', 'afro-house'],
    options: [{ key: 'fit', label: '+ FIT', flag: '--fit' }],
    needsIds: true,
    speed: 'background',
    steps: (args) => [
      niced(['tools/banger-levels.js', 'curves']),
      niced(['tools/banger-levels.js', 'check', ...idsFrom(args), ...optionFlags('bangerlevels', args)]),
    ],
    openPath: reportHref('banger-levels.json', 'bangers'),
  },
);
// PERFORMANCE: how smoothly cabinets 1-6 run on a phone-shaped screen, portrait first
// (tools/frame-report.js). Niced like the audio reports; the measurements are relative,
// so run it with the machine otherwise quiet and compare against the last run. No
// BACKGROUND switch: what it measures is frame time, and in the background band every
// number would be the efficiency cores' and incomparable with the runs before.
ACTIONS.push(
  {
    id: 'framereport', group: 'perf', label: 'FRAME REPORT',
    blurb: 'plays every stage of the ticked cabinets on an iPhone-shaped screen and times each frame — portrait at three points a stage, landscape at one (tools/frame-report.js). Cabinets left unticked keep their last numbers on the report. Uses THE GAME on :8001, or starts it for the run. About two minutes a cabinet; best with the mixer quiet.',
    // One card, a toggle per cabinet (all on by default): RUN measures what is ticked.
    choices: ['plumber', 'speed', 'rhythm', 'frost', 'crypt', 'neon'],
    needsIds: true,
    steps: (args) => [niced(['tools/frame-report.js', ...idsFrom(args)])],
    openPath: reportHref('frame-report.json', 'frames'),
  },
);
ACTIONS.push({
  id: 'bangerbalancebuild', group: 'internal', label: 'BANGER BALANCE BUILD',
  blurb: 'builds the game after a Desk balance change so the next take uses the saved faders.',
  speed: 'background', steps: [niced(['build/build.js'])], openPath: () => null,
}, {
  id: 'bangercalibration', group: 'audio', label: 'BANGER CALIBRATION',
  blurb: 'Measures instruments playing short, sustained, busy and chord phrases through their channels. Reuses unchanged measurements, checks unseen phrases, publishes validated offsets, then rebuilds the game. The first full run is lengthy; interrupted runs resume from cached renders. FULL rebuilds everything selected. Weekly runs use all styles while the desk is open.',
  choices: ['big-room', 'trance', 'future-bass', 'eurobeat', 'chipstep', 'synthwave', 'shibuya', 'dnb', 'electro', 'megadrive', 'deep-house', 'nu-disco', 'downtempo', 'eurodance', 'italo-disco', 'electro-funk', 'french-house', 'reggaeton', 'moombahton', 'merenhouse', 'afro-house'],
  options: [{ key: 'full', label: 'FULL REBUILD', flag: '--full' }], needsIds: true, speed: 'background', buildAfter: true,
  steps: args => [niced(['tools/banger-calibrate.js', 'refresh', ...idsFrom(args), ...optionFlags('bangercalibration', args)])],
  openPath: reportHref('banger-calibration.json', 'calibration'),
}, {
  id: 'bangercalibrationreport', group: 'audio', label: 'BANGER CALIBRATION COVERAGE',
  blurb: 'Quick coverage check: which current instrument/channel combinations have validated measurements. Does not render audio or change published offsets.',
  steps: [niced(['tools/banger-calibrate.js', 'report'])], speed: 'background',
  openPath: reportHref('banger-calibration.json', 'calibration'),
});
const SCHEDULE_FILE = join(root, 'work/local/banger-calibration/weekly.json');
function calibrationSchedule() {
  try { return JSON.parse(readFileSync(SCHEDULE_FILE, 'utf8')); } catch { return { enabled: false, nextRun: null }; }
}
function saveCalibrationSchedule(value) {
  mkdirSync(dirname(SCHEDULE_FILE), { recursive: true });
  const tmp = `${SCHEDULE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value)); renameSync(tmp, SCHEDULE_FILE);
}
function tickCalibrationSchedule() {
  const schedule = calibrationSchedule();
  if (!schedule.enabled || Date.now() < schedule.nextRun || [...runs.values()].some(r => r.running)) return;
  saveCalibrationSchedule({ enabled: true, nextRun: Date.now() + 7 * 86400000 });
  runAction(ACTION_BY_ID.bangercalibration, { ids: ACTION_BY_ID.bangercalibration.choices });
}
const ACTION_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

// The option flags a RUN asked for, filtered to the ones that action declares: the
// browser sends keys, and only a declared key turns into an argument.
function optionFlags(id, args) {
  const asked = new Set(Array.isArray(args?.opts) ? args.opts : []);
  return (ACTION_BY_ID[id].options || []).filter((o) => asked.has(o.key)).map((o) => o.flag);
}

// The index is rebuilt from disk on every archive run (see archive-gallery.js),
// so the newest asset gallery is always its last row -- no separate bookkeeping.
function latestAssetGalleryHref() {
  const indexPath = join(root, 'galleries/index.md');
  if (!existsSync(indexPath)) return null;
  const rows = readFileSync(indexPath, 'utf8').split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2}/.test(l));
  const last = rows[rows.length - 1];
  const m = last && last.match(/\[([^\]]+\.html)\]\(([^)]+)\)/);
  return m ? `/galleries/${m[2]}` : null;
}

// --------------------------------------------------------------- children ----

// Only what this process started. Anything else on a port is somebody's, and
// the difference between the two is the whole safety story.
const mine = new Map();   // id -> { child, log: string[] }

const LOG_KEEP = 40;

function start(tool) {
  // `mine` keeps the entry after a child dies, so its last words survive to be
  // shown. So the question is not whether we have an entry — it is whether that
  // entry still has a process. Asking the wrong one leaves a tool that crashed
  // unable to be started again, with a START button that quietly does nothing.
  const existing = mine.get(tool.id);
  if (existing?.child) return existing;
  const entry = existing ?? { child: null, log: [] };
  const keep = (buf) => {
    for (const line of String(buf).split('\n')) if (line.trim()) entry.log.push(line);
    while (entry.log.length > LOG_KEEP) entry.log.shift();
  };
  const child = spawn(process.execPath, [join(root, tool.script)], {
    cwd: root,
    env: { ...process.env, [tool.portEnv]: String(tool.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  child.on('exit', (code, signal) => {
    keep(`— exited (${signal || `code ${code}`}) —`);
    entry.child = null;
  });
  // An unlistened 'error' is a throw, and a desk that dies because one tool's
  // script moved would take every other tool down on its way out.
  child.on('error', (err) => {
    keep(`— could not start: ${err.message} —`);
    entry.child = null;
  });
  entry.child = child;
  mine.set(tool.id, entry);
  console.log(`  started ${tool.id} on ${tool.port} (pid ${child.pid})`);
  return entry;
}

function stop(tool) {
  const entry = mine.get(tool.id);
  if (!entry?.child) return false;
  entry.child.kill('SIGTERM');
  mine.delete(tool.id);
  console.log(`  stopped ${tool.id}`);
  return true;
}

// A port answers or it does not. Cheaper and more honest than tracking state:
// it is true of a tool started by hand in another terminal too.
const probe = (port) => new Promise((resolve) => {
  const sock = connect({ host: '127.0.0.1', port });
  const done = (live) => { sock.destroy(); resolve(live); };
  sock.setTimeout(400);
  sock.once('connect', () => done(true));
  sock.once('timeout', () => done(false));
  sock.once('error', () => done(false));
});

async function statusOf(tool) {
  const entry = mine.get(tool.id);
  return {
    id: tool.id,
    label: tool.label,
    port: tool.port,
    blurb: tool.blurb,
    npm: tool.npm,
    live: await probe(tool.port),
    mine: !!entry?.child,          // ours to stop; anything else is adopted
    pid: entry?.child?.pid ?? null,
    log: entry?.log.slice(-6) ?? [],
  };
}

// Wait for the port to answer. Bundling tools take a second or two on a cold
// start and the mixer takes longer than the rest, hence the patience — but a
// tool that has already exited is never going to answer, so the wait ends with
// the process rather than running the clock down on a corpse.
async function waitLive(tool, ms = 30000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await probe(tool.port)) return true;
    if (mine.has(tool.id) && !mine.get(tool.id).child) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

// -------------------------------------------------------------------- speed --

// BACKGROUND or FULL SPEED. A card with a `speed` runs its job in macOS's
// background band by default (what `taskpolicy -b` sets): efficiency cores only and
// throttled disk, so the performance cores stay with the mixer and the game. It
// costs real time — a CPU-bound loop measured 4-5x slower there — so the card has a
// switch, and the switch reaches a job already running: every process in its tree
// (node, its Chromium, each renderer) is moved, and whatever it starts afterwards
// inherits the move.
//
// The job is spawned normally and moved from here a moment later, never launched as
// `taskpolicy -b node …`. A process that put ITSELF in the background, which is what
// that form does, cannot be brought out by anyone else: -B on it is a silent no-op.
// Moved from outside, it comes back.
const speedOf = new Map(ACTIONS.filter((a) => a.speed).map((a) => [a.id, a.speed]));

// The pid and everything under it, parents before children.
function treeOf(pid) {
  const kids = new Map();
  for (const line of execFileSync('ps', ['-Ao', 'pid=,ppid='], { encoding: 'utf8' }).split('\n')) {
    const [p, pp] = line.trim().split(/\s+/).map(Number);
    if (p) (kids.get(pp) || kids.set(pp, []).get(pp)).push(p);
  }
  const tree = [pid];
  for (let i = 0; i < tree.length; i++) tree.push(...(kids.get(tree[i]) || []));
  return tree;
}

// Twice over: a process born between the listing and its parent's move inherits the
// old band, and the second pass catches it.
function setBand(pid, speed) {
  const moved = new Set();
  for (let pass = 0; pass < 2; pass++) {
    for (const p of treeOf(pid)) {
      try {
        execFileSync('taskpolicy', [speed === 'full' ? '-B' : '-b', '-p', String(p)], { stdio: 'ignore' });
        moved.add(p);
      } catch { /* exited mid-walk */ }
    }
  }
  return moved.size;
}

// ------------------------------------------------------------------ actions --

// One run at a time per action, remembered after it exits so a finished RUN
// reads as done/failed rather than snapping back to idle.
const runs = new Map(); // id -> { running, code, log }

function runLog(state) {
  return (buf) => {
    for (const line of String(buf).split('\n')) if (line.trim()) state.log.push(line);
    while (state.log.length > LOG_KEEP) state.log.shift();
  };
}

async function runAction(action, runArgs = {}) {
  const existing = runs.get(action.id);
  if (existing?.running) return existing;
  const state = existing ?? { running: false, code: null, log: [] };
  state.running = true;
  state.code = null;
  state.log = [];
  state.keep = runLog(state);
  runs.set(action.id, state);
  console.log(`  running ${action.id}`);
  (async () => {
    if (action.needsTool) {
      const tool = TOOL_BY_ID[action.needsTool];
      if (!(await probe(tool.port))) {
        state.keep(`— ${tool.label} is not up, starting it first —`);
        start(tool);
        if (!(await waitLive(tool))) {
          state.keep(`— ${tool.label} did not come up on ${tool.port} —`);
          state.code = 1;
          state.running = false;
          return;
        }
      }
    }
    // Most actions have a fixed command; the prune pair build theirs from
    // whatever ids the browser sent, so `steps` can be either shape.
    const steps = typeof action.steps === 'function' ? action.steps(runArgs) : [...action.steps];
    if (action.buildAfter) steps.push(niced(['build/build.js']));
    for (const [cmd, args] of steps) {
      state.keep(`$ ${cmd} ${args.join(' ')}`);
      const code = await new Promise((res) => {
        const child = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
        // Read per step, so a switch flipped mid-run also holds for the steps after.
        if (child.pid && speedOf.get(action.id) === 'background') setBand(child.pid, 'background');
        state.child = child;
        child.stdout.on('data', state.keep);
        child.stderr.on('data', state.keep);
        child.on('exit', (c) => { state.child = null; res(c ?? 1); });
        child.on('error', (err) => { state.keep(`— could not start: ${err.message} —`); res(1); });
      });
      if (code !== 0) {
        state.keep(`— exited ${code} —`);
        state.code = code;
        state.running = false;
        return;
      }
    }
    state.code = 0;
    state.running = false;
    console.log(`  ${action.id} done`);
  })();
  return state;
}

function actionStatus(action) {
  const state = runs.get(action.id);
  return {
    id: action.id,
    label: action.label,
    blurb: action.blurb,
    needsIds: !!action.needsIds,
    schedule: action.id === 'bangercalibration' ? calibrationSchedule() : null,
    group: action.group || 'galleries',
    input: action.input || null,
    choices: action.choices || null,
    options: (action.options || []).map(({ key, label }) => ({ key, label })),
    confirm: !!action.confirm,
    speed: speedOf.get(action.id) ?? null,
    running: !!state?.running,
    code: state?.code ?? null,
    // The audio cards sit beside the tall explainer, so they have room to show the
    // whole result table a run prints rather than its last few lines.
    log: state?.log.slice(action.group === 'audio' ? -30 : -8) ?? [],
    openPath: action.openPath(),
  };
}

// ------------------------------------------------------------------ serve ----

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
async function requestJSON(req, limit = 50000) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > limit) throw new Error('request is too large');
  }
  return JSON.parse(body || '{}');
}

// Redirect to the hostname the request arrived on, so the desk reached as
// MBP14.local sends you to MBP14.local and not to a loopback address the phone
// cannot open.
const hostnameOf = (req) => {
  const raw = req.headers.host || `${HOST}:${PORT}`;
  const m = /^(\[[^\]]+\]|[^:]+)/.exec(raw);
  return m ? m[1] : HOST;
};

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/banger-balance' && req.method === 'GET') {
    return json(res, 200, balancePageData());
  }
  if (url.pathname === '/api/banger-balance' && req.method === 'POST') {
    let body;
    try { body = await requestJSON(req); }
    catch (error) { return json(res, 400, { ok: false, error: error.message || 'invalid JSON' }); }
    if (body.baseHash !== balanceFileHash()) {
      return json(res, 409, { ok: false, error: 'the balance settings changed since this page loaded — reload the Desk before saving' });
    }
    if (runs.get('bangerbalancebuild')?.running || runs.get('bangercalibration')?.running) {
      return json(res, 409, { ok: false, error: 'wait for the current Banger build or calibration to finish first' });
    }
    try {
      const result = saveBalanceOverride(body);
      runAction(ACTION_BY_ID.bangerbalancebuild);
      return json(res, 200, { ok: true, ...result });
    } catch (error) {
      return json(res, 422, { ok: false, error: error.message || String(error) });
    }
  }
  const weekly = /^\/api\/banger-calibration\/weekly\/(on|off)$/.exec(url.pathname);
  if (weekly && req.method === 'POST') {
    const enabled = weekly[1] === 'on';
    saveCalibrationSchedule({ enabled, nextRun: enabled ? Date.now() + 7 * 86400000 : null });
    return json(res, 200, { ok: true, schedule: calibrationSchedule() });
  }

  if (url.pathname === '/') {
    const html = readFileSync(join(root, 'tools/desk-shell.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (url.pathname === '/api/status') {
    return json(res, 200, {
      tools: await Promise.all(TOOLS.map(statusOf)),
      actions: ACTIONS.map(actionStatus),
      browsers: listBrowsers(),
    });
  }

  // BACKGROUND BROWSERS: the one thing on this page the desk will kill that it did
  // not start. A headless Chromium left spinning has no window and no port, and it
  // cost two nights of chasing glitches that were really a busy machine — so it is
  // listed here, where it cannot hide, and killed on an explicit click per row. The
  // mixer's warm renderer is the exception, for the same reason as ADOPT, NEVER KILL.
  const kill = /^\/api\/browsers\/kill\/(\d+)$/.exec(url.pathname);
  if (kill && req.method === 'POST') {
    const pid = Number(kill[1]);
    const row = listBrowsers().find((b) => b.pid === pid);
    if (row?.kind === 'mixer') {
      return json(res, 409, { ok: false, error: 'the mixer keeps that one warm on purpose — not the desk’s to stop' });
    }
    return json(res, 200, await stopBrowser(pid));
  }

  // The AUDIO REPORTS page and the two result files it draws from. Missing files are
  // null rather than an error: a report that has never been run is a normal state.
  if (url.pathname === '/reports' && req.method === 'GET') {
    const html = readFileSync(join(root, 'tools/desk-reports.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  if (url.pathname === '/api/reports' && req.method === 'GET') {
    const read = (file) => {
      try { return JSON.parse(readFileSync(join(REPORTS_DIR, file), 'utf8')); } catch { return null; }
    };
    return json(res, 200, {
      levels: read('song-levels.json'),
      bass: read('bass-report.json'),
      bangers: read('banger-levels.json'),
      calibration: read('banger-calibration.json'),
      frames: read('frame-report.json'),
      running: ACTIONS.filter((a) => (a.group === 'audio' || a.group === 'perf') && runs.get(a.id)?.running).map((a) => a.label),
    });
  }

  if (url.pathname.startsWith('/galleries/') && req.method === 'GET') {
    // Serves the tracked galleries/ directory only -- resolve and check the
    // result still starts with that directory before ever touching disk, so
    // a `..` in the URL cannot walk this out into the rest of the repo.
    const safeRoot = join(root, 'galleries') + sep;
    const filePath = resolve(root, `.${url.pathname}`);
    if (!filePath.startsWith(safeRoot)) { res.writeHead(403); return res.end('forbidden'); }
    try {
      const buf = readFileSync(filePath);
      const type = filePath.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';
      res.writeHead(200, { 'Content-Type': type });
      return res.end(buf);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('not found');
    }
  }

  // The BACKGROUND / FULL SPEED switch: holds for the next RUN, and moves the one
  // running now, if there is one.
  const speed = /^\/api\/speed\/([a-z]+)\/(background|full)$/.exec(url.pathname);
  if (speed && req.method === 'POST') {
    if (!speedOf.has(speed[1])) return json(res, 404, { ok: false, error: 'that card has no speed switch' });
    speedOf.set(speed[1], speed[2]);
    const state = runs.get(speed[1]);
    if (state?.child?.pid) {
      const n = setBand(state.child.pid, speed[2]);
      state.keep(`— ${speed[2] === 'full' ? 'FULL SPEED' : 'BACKGROUND'} from here: ${n} process${n === 1 ? '' : 'es'} moved —`);
    }
    return json(res, 200, { ok: true });
  }

  const run = /^\/api\/run\/([a-z]+)$/.exec(url.pathname);
  if (run && req.method === 'POST') {
    const action = ACTION_BY_ID[run[1]];
    if (!action) return json(res, 404, { ok: false, error: 'no such action' });
    if (action.id === 'bangercalibration' && runs.get('bangerbalancebuild')?.running) {
      return json(res, 409, { ok: false, error: 'wait for the Banger balance build to finish first' });
    }
    let args = {};
    if (action.needsIds) {
      const raw = await new Promise((resolve) => {
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
        req.on('end', () => resolve(body));
      });
      try { args = JSON.parse(raw || '{}'); } catch { args = {}; }
      if (!idsFrom(args).length) return json(res, 400, { ok: false, error: `${action.label} needs at least one id` });
    }
    const alreadyRunning = !!runs.get(action.id)?.running;
    runAction(action, args); // fire-and-forget; /api/status polls its progress
    return json(res, 200, { ok: true, alreadyRunning });
  }

  const act = /^\/api\/(start|stop)\/([a-z]+)$/.exec(url.pathname);
  if (act && req.method === 'POST') {
    const tool = TOOL_BY_ID[act[2]];
    if (!tool) return json(res, 404, { ok: false, error: 'no such tool' });
    if (act[1] === 'start') {
      if (await probe(tool.port)) return json(res, 200, { ok: true, adopted: true });
      start(tool);
      return json(res, 200, { ok: true, adopted: false });
    }
    // Refusing to stop what we did not start is the point, not a limitation.
    if (!mine.get(tool.id)?.child) {
      return json(res, 409, { ok: false, error: `${tool.id} on ${tool.port} is not this desk’s to stop` });
    }
    stop(tool);
    return json(res, 200, { ok: true });
  }

  // The shortcut: /mixer, /levels, /sfx … Warm, you are redirected straight
  // away. Cold, the tool is started and the REQUEST is held until its port
  // answers — the browser shows its own loading state, which is a truer
  // progress bar than anything served here, and the redirect lands the moment
  // the tool is ready. A tool that dies on the way up says so instead, with the
  // last thing it printed.
  const tool = TOOL_BY_ID[url.pathname.slice(1)];
  if (tool && req.method === 'GET') {
    const to = `http://${hostnameOf(req)}:${tool.port}/`;
    if (await probe(tool.port)) {
      res.writeHead(302, { Location: to });
      return res.end();
    }
    start(tool);
    const live = await waitLive(tool);
    if (live) {
      res.writeHead(302, { Location: to });
      return res.end();
    }
    const log = mine.get(tool.id)?.log || [];
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(`${tool.label} did not come up on ${tool.port}.\n\n`
      + `${log.length ? log.join('\n') : '(it printed nothing)'}\n\n`
      + `Start it by hand to see more:  ${tool.npm}\n`);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
}

// Imported for the map alone — by tests/desk.js — this file must not take a
// port. Everything below the guard is the running desk; everything above it is
// data about where the tools live.
const asServer = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

export { TOOLS, ACTIONS, probe, setBand };

if (asServer) startDesk();

function startDesk() {
const server = createServer((req, res) => handle(req, res).catch((err) => {
  console.error(err);
  if (!res.headersSent) json(res, 500, { ok: false, error: err.message });
}));

// Nothing this desk started outlives it. What it adopted is untouched.
const shutdown = () => {
  for (const [id, entry] of mine) if (entry.child) { entry.child.kill('SIGTERM'); console.log(`  stopped ${id}`); }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is in use — a desk is probably already running.`);
    console.error(`  open it:   http://localhost:${PORT}/`);
    console.error(`  or move it: MASH_DESK_PORT=8002 npm run desk\n`);
    process.exit(3);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  setInterval(tickCalibrationSchedule, 60000).unref();
  tickCalibrationSchedule();
  console.log(`THE DESK  http://${HOST}:${PORT}`);
  console.log('  straight to a tool:');
  for (const t of TOOLS) console.log(`    http://${HOST}:${PORT}/${t.id}`.padEnd(38) + `→ :${t.port}  ${t.label}`);
  console.log('  ^C stops only what this desk started.');
});
}
