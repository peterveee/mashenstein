// Screen gallery: drives the real running game in Chromium and screenshots
// every UI screen and every cabinet's gameplay, once in landscape and once in
// portrait, side by side. Unlike tools/gallery-entry.js (which paints isolated
// drawables onto scratch canvases), this is the actual game -- real states,
// real transitions, real letterboxing -- so a screen that has not been given
// a portrait layout shows exactly what a player sees: a small centred
// landscape frame, not a redesigned one.
//
// Requires `npm run dev` already running (serves dist/ at localhost:8001 with
// unminified class names, which window.__mash_state depends on).
// Usage: node tools/build-screens-gallery.js
import { chromium } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.MASH_DEV_URL || 'http://localhost:8001';
const CONCURRENCY = 3;

// Real device shapes, not arbitrary rectangles -- an iPhone 15 Pro's own
// logical points, landscape and portrait. Orientation is not a query param
// here: the renderer decides landscape vs. phone-portrait purely from
// winH > winW at resize time (src/engine/renderer.js), so the viewport shape
// alone is what drives it.
const LANDSCAPE = { width: 852, height: 393 };
const PORTRAIT = { width: 393, height: 852 };

const git = (...args) => {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; }
};

// Every recognised UI surface, one representative capture each. Cabinet-
// specific screens (stage select / briefing / a run) use `plumber` as the
// stand-in; the nine cabinets get their own gameplay shots below instead of
// repeating stage-select nine times.
const SCREENS = [
  { id: 'title', label: 'Title', query: 'goto=title', states: ['TitleState'] },
  { id: 'intro', label: 'Intro panels', query: 'goto=intro', states: ['IntroState'] },
  { id: 'tutorial', label: 'Tutorial', query: 'goto=tutorial', states: ['TutorialState'], settle: 1000 },
  { id: 'difficulty', label: 'Difficulty select', query: 'goto=difficulty', states: ['DifficultyState'] },
  { id: 'cast', label: 'Cast roll', query: 'goto=cast', states: ['CastState'] },
  { id: 'hub', label: 'Hub (food court)', query: 'goto=hub', states: ['HubState'], settle: 1200 },
  { id: 'trophy', label: 'Trophy room', query: 'goto=trophy', states: ['TrophyRoomState'] },
  {
    // Shop/Bench/Arcade have no ?goto= shortcut of their own -- they only open
    // from inside the hub, via Flow.openShop/openBench/openArcade (main.js).
    // window.__mash_cur is the live HubState instance once there, and it
    // carries the same `flow` those hub click-handlers call through.
    id: 'shop', label: 'Pawn shop', query: 'goto=hub', states: ['HubState'],
    openVia: 'openShop', openStates: ['ShopState'], settle: 900,
  },
  {
    id: 'bench', label: 'Repair desk', query: 'goto=hub', states: ['HubState'],
    openVia: 'openBench', openStates: ['BenchState'], settle: 900,
  },
  {
    id: 'arcade', label: 'Arcade', query: 'goto=hub', states: ['HubState'],
    openVia: 'openArcade', openStates: ['ArcadeState'], settle: 900,
  },
  { id: 'howto', label: 'How to play', query: 'goto=howto', states: ['HowToPlayState'] },
  { id: 'fieldguide', label: 'Field guide', query: 'goto=fieldguide', states: ['FieldGuideState'] },
  { id: 'settings', label: 'Settings', query: 'goto=settings', states: ['SettingsState'] },
  { id: 'calibrate', label: 'Calibrate', query: 'goto=calibrate', states: ['CalibrateState'] },
  { id: 'soundtest', label: 'Sound test (jukebox)', query: 'goto=soundtest', states: ['SoundTestState'], settle: 1200 },
  { id: 'attract', label: 'Attract (idle demo)', query: 'goto=attract', states: ['AttractState'], settle: 1500 },
  { id: 'finale', label: 'Finale', query: 'goto=finale', states: ['FinaleState'], settle: 1200 },
  { id: 'stageselect', label: 'Stage select', query: 'goto=stage&cab=plumber', states: ['StageSelectState'], settle: 1000 },
  {
    // The dev shortcut's stage=X-1 form skips straight to RunState (see
    // run.js: "a dev launch that skips the briefing"), so BriefingState is
    // only reachable by landing on stage select and launching a stage the
    // real way -- one Enter picks the first stage and starts it.
    id: 'briefing', label: 'Briefing', query: 'goto=stage&cab=plumber', states: ['StageSelectState'],
    launchStage: true,
  },
  {
    id: 'pause', label: 'Pause menu', query: 'goto=stage&cab=plumber&stage=plumber-1&invuln',
    states: ['RunState'], settle: 1800, pauseAfter: true,
  },
  {
    id: 'results', label: 'Results', query: 'goto=stage&cab=plumber&stage=plumber-1&invuln&time=4',
    states: ['ResultsState'], settle: 600,
  },
  // Only three cabinets have a boss defined (BOSSES in src/game/boss.js) --
  // plumber does not, and crashes reading a boss that doesn't exist.
  { id: 'boss', label: 'Boss fight', query: 'goto=boss&cab=neon&invuln', states: ['BossState'], settle: 2000 },
  { id: 'overtime', label: 'Overtime', query: 'goto=overtime&invuln', states: ['RunState'], settle: 1800 },
];

const CABINETS = [
  { id: 'plumber', name: 'PLUMBER PANIC' },
  { id: 'speed', name: 'SPEED ZONE' },
  { id: 'rhythm', name: 'RHYTHM BANKRUPTCY' },
  { id: 'frost', name: 'FROST FORTRESS' },
  { id: 'crypt', name: 'CRYPT SHIFT' },
  { id: 'neon', name: 'TERMINAL VELOCITY' },
  { id: 'cardboard', name: 'CARDBOARD KINGDOM' },
  { id: 'office', name: 'CORPORATE KOMBAT' },
  { id: 'surge', name: 'THE SURGE' },
];
const CABINET_SHOTS = CABINETS.map((c) => ({
  id: `cab-${c.id}`,
  label: c.name,
  query: `goto=stage&cab=${c.id}&stage=${c.id}-1&invuln`,
  states: ['RunState'],
  settle: 2200,
}));

// A run launched via ?goto=stage lands on BriefingState first; dismiss it with
// Enter unless a briefing screen is actually what we came here to shoot.
async function reachState(page, targetStates, settle) {
  await page.waitForFunction(() => window.__mash_booted === true, null, { timeout: 20000 });
  await page.waitForFunction(
    (ts) => ts.includes(window.__mash_state) || window.__mash_state === 'BriefingState',
    targetStates, { timeout: 20000 },
  );
  while (!targetStates.includes('BriefingState')
      && (await page.evaluate(() => window.__mash_state)) === 'BriefingState') {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
  }
  await page.waitForFunction((ts) => ts.includes(window.__mash_state), targetStates, { timeout: 30000 });
  await page.waitForTimeout(settle);
}

async function shoot(browser, target, orientation) {
  const viewport = orientation === 'portrait' ? PORTRAIT : LANDSCAPE;
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  try {
    await page.goto(`${BASE}/?mute&${target.query}`, { waitUntil: 'load', timeout: 30000 });
    await reachState(page, target.states, (target.launchStage || target.openVia) ? 400 : (target.settle ?? 800));
    if (target.launchStage) {
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.__mash_state === 'BriefingState', null, { timeout: 20000 });
      await page.waitForTimeout(target.settle ?? 800);
    }
    if (target.openVia) {
      await page.evaluate((method) => window.__mash_cur.flow[method](), target.openVia);
      await page.waitForFunction((ts) => ts.includes(window.__mash_state), target.openStates, { timeout: 20000 });
      await page.waitForTimeout(target.settle ?? 800);
    }
    const portraitMode = await page.evaluate(() => window.__mash_cur?.constructor?.portraitMode || null);
    if (target.pauseAfter) {
      await page.keyboard.press('KeyP');
      await page.waitForTimeout(700);
    }
    const jpeg = await page.locator('#game').screenshot({ type: 'jpeg', quality: 85 });
    return { ok: true, jpeg, width: viewport.width, height: viewport.height, portraitMode };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  } finally {
    await page.close();
  }
}

async function runPool(jobs, worker, concurrency) {
  const results = new Array(jobs.length);
  let next = 0;
  async function lane() {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await worker(jobs[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, lane));
  return results;
}

function latestAssetGalleryHref() {
  const indexPath = join(root, 'galleries/index.md');
  if (!existsSync(indexPath)) return null;
  const rows = readFileSync(indexPath, 'utf8').split('\n').filter((l) => /^\| \d{4}-\d{2}-\d{2}/.test(l));
  const last = rows[rows.length - 1];
  const m = last && last.match(/\[([^\]]+\.html)\]\(([^)]+)\)/);
  return m ? m[2] : null;
}

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function shotBlock(orientationLabel, shot) {
  if (!shot) return `<div class="shot err"><p class="err-msg">not captured</p></div>`;
  if (!shot.ok) return `<div class="shot err"><p class="err-msg">${esc(shot.error)}</p></div>`;
  const src = `data:image/jpeg;base64,${shot.jpeg.toString('base64')}`;
  return `<div class="shot">
    <img src="${src}" width="${shot.width}" height="${shot.height}" alt="${esc(orientationLabel)}">
    <span class="dims">${orientationLabel} · ${shot.width}×${shot.height}</span>
  </div>`;
}

function card(target, byOrientation) {
  const { landscape, portrait } = byOrientation;
  const mode = (landscape && landscape.portraitMode) || (portrait && portrait.portraitMode) || null;
  const badge = mode ? `<span class="badge yes">portrait: ${esc(mode)}</span>` : `<span class="badge no">portrait: no</span>`;
  return `<div class="card" id="c-${esc(target.id)}">
    <h3>${esc(target.label)} ${badge}</h3>
    <div class="pair">
      ${shotBlock('Landscape', landscape)}
      ${shotBlock('Portrait', portrait)}
    </div>
  </div>`;
}

function jumpNav(targets) {
  return targets.map((t) => `<a href="#c-${esc(t.id)}">${esc(t.label)}</a>`).join('\n    ');
}

async function main() {
  try {
    const res = await fetch(`${BASE}/`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (e) {
    console.error(`Can't reach ${BASE} -- start it first with \`npm run dev\`. (${e.message || e})`);
    process.exit(1);
  }

  const targets = [...SCREENS, ...CABINET_SHOTS];
  const jobs = [];
  for (const t of targets) {
    jobs.push({ target: t, orientation: 'landscape' });
    jobs.push({ target: t, orientation: 'portrait' });
  }

  console.log(`Capturing ${jobs.length} screenshots (${targets.length} screens x 2 orientations) from ${BASE} ...`);
  const browser = await chromium.launch();
  let done = 0;
  const raw = await runPool(jobs, async (job) => {
    const shot = await shoot(browser, job.target, job.orientation);
    done += 1;
    const tag = shot.ok ? 'ok' : `FAILED: ${shot.error}`;
    console.log(`[${done}/${jobs.length}] ${job.target.id} (${job.orientation}) -- ${tag}`);
    return shot;
  }, CONCURRENCY);
  await browser.close();

  const byTarget = new Map();
  jobs.forEach((job, i) => {
    const entry = byTarget.get(job.target.id) || { target: job.target };
    entry[job.orientation] = raw[i];
    byTarget.set(job.target.id, entry);
  });

  const screenCards = SCREENS.map((t) => card(t, byTarget.get(t.id))).join('\n');
  const cabinetCards = CABINET_SHOTS.map((t) => card(t, byTarget.get(t.id))).join('\n');

  const failures = raw.filter((r) => !r.ok).length;
  const sha = git('rev-parse', '--short=7', 'HEAD') || 'uncommitted';
  const date = new Date().toISOString().slice(0, 10);
  const latestAssetGallery = latestAssetGalleryHref();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>MASHENSTEIN — Screen gallery</title>
<style>
  :root { --bg:#0b0b14; --panel:#15151f; --panel2:#1a1a28; --line:#2a2a3a; --ink:#e0e0e8; --dim:#8a8a9e;
          --accent:#f6d33c; --accent-soft:rgba(246,211,60,0.1); --bad:#e04848; --good:#4ade80; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:var(--bg); color:var(--ink);
               font:13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
  header { position:sticky; top:0; z-index:10; background:rgba(11,11,20,0.94);
           backdrop-filter:blur(8px); border-bottom:1px solid var(--line); padding:12px 20px; }
  h1 { margin:0 0 8px; font-size:15px; letter-spacing:0.08em; font-weight:600;
       background:linear-gradient(90deg, var(--accent), #ffe98a); -webkit-background-clip:text;
       background-clip:text; color:transparent; }
  h1 small { color:var(--dim); font-weight:normal; letter-spacing:0; margin-left:10px; }
  .pages { display:flex; gap:8px; margin:0 0 10px; }
  .pages a { color:var(--dim); text-decoration:none; font-size:11px; letter-spacing:0.1em;
             text-transform:uppercase; padding:3px 11px; border:1px solid var(--line); border-radius:5px; }
  .pages a:hover { color:var(--accent); border-color:var(--accent); }
  .meta { color:var(--dim); max-width:900px; margin:6px 0 0; }
  nav.jump { display:flex; flex-wrap:wrap; gap:4px; margin-top:10px; align-items:center; }
  nav.jump span.grp { color:var(--dim); font-size:10px; text-transform:uppercase; letter-spacing:0.1em;
                       margin:0 2px 0 8px; }
  nav.jump span.grp:first-child { margin-left:0; }
  nav.jump a { color:var(--dim); text-decoration:none; padding:2px 9px; border:1px solid var(--line);
               border-radius:99px; font-size:11px; transition:color .12s ease, border-color .12s ease; }
  nav.jump a:hover { color:var(--accent); border-color:var(--accent); }
  main { padding:20px; }
  section { margin-bottom:34px; }
  section > h2 { font-size:13px; letter-spacing:0.14em; text-transform:uppercase; color:var(--accent);
                 border-bottom:1px solid var(--line); padding-bottom:6px; margin:0 0 14px; }
  .rows { display:flex; flex-direction:column; gap:14px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:10px 12px;
          scroll-margin-top:150px; }
  .card h3 { margin:0 0 8px; font-size:12px; letter-spacing:0.05em; color:var(--ink); font-weight:normal;
             display:flex; align-items:center; gap:8px; }
  .badge { font-size:10px; padding:1px 7px; border-radius:99px; border:1px solid var(--line); color:var(--dim); }
  .badge.yes { color:var(--good); border-color:var(--good); }
  .badge.no { color:var(--dim); }
  .pair { display:flex; gap:12px; align-items:flex-start; overflow-x:auto; padding-bottom:4px; }
  .shot { display:flex; flex-direction:column; align-items:center; gap:4px; flex:none; }
  .shot img { display:block; image-rendering:auto; border-radius:3px; border:1px solid var(--line);
              cursor:zoom-in; }
  .shot img.zoomed { transform:scale(1.6); transform-origin:top left; }
  .shot .dims { color:var(--dim); font-size:10px; }
  .shot.err { width:200px; height:120px; display:flex; align-items:center; justify-content:center;
              border:1px dashed var(--bad); border-radius:4px; }
  .err-msg { color:var(--bad); font-size:10px; text-align:center; padding:6px; margin:0; word-break:break-word; }
</style>
</head>
<body>
<header>
  <h1>MASHENSTEIN — SCREEN GALLERY <small>every UI screen and cabinet, portrait vs. landscape</small></h1>
  <div class="pages">
    <a href="index.md">Asset gallery history</a>
    ${latestAssetGallery ? `<a href="${esc(latestAssetGallery)}">Latest asset gallery</a>` : ''}
  </div>
  <p class="meta">Captured ${date} at commit <code>${sha}</code> from a live, running game (\`npm run dev\`) --
  not isolated art. Landscape is 852×393, portrait is 393×852: an iPhone 15 Pro's own logical points in
  each orientation. A screen with no portrait badge has not been given a portrait layout, so its portrait
  shot is exactly what a player sees today: the same landscape frame, small and centred.
  ${failures ? `<br><strong style="color:var(--bad)">${failures} capture(s) failed -- see the red cards below.</strong>` : ''}
  </p>
  <nav class="jump">
    <span class="grp">Screens</span>
    ${jumpNav(SCREENS)}
    <span class="grp">Cabinets</span>
    ${jumpNav(CABINET_SHOTS)}
  </nav>
</header>
<main>
  <section id="screens"><h2>UI Screens</h2><div class="rows">
${screenCards}
  </div></section>
  <section id="cabinets"><h2>Cabinets — gameplay, stage 1 of each</h2><div class="rows">
${cabinetCards}
  </div></section>
</main>
<script>
document.addEventListener('click', (e) => {
  const img = e.target.closest('.shot img');
  if (img) img.classList.toggle('zoomed');
});
</script>
</body>
</html>
`;

  const outPath = join(root, 'galleries/screens.html');
  writeFileSync(outPath, html);
  console.log(`\nWrote galleries/screens.html (${(html.length / 1024 / 1024).toFixed(1)}MB, ${failures} failure(s)).`);
}

main();
