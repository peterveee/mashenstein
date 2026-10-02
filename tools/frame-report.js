// HOW SMOOTHLY EACH CABINET RUNS ON A PHONE, PORTRAIT FIRST. A report: it plays
// stages in a headless browser dressed as an iPhone and records how long every frame
// took. It never changes the game.
//
// Why it exists (28 Sep 2026): Speed Zone's new mid-century backdrop was "a little
// bit jittery on an actual iPhone ... in portrait", and fine in landscape. Portrait
// is a tall picture — about three times landscape's pixels — so a backdrop with
// headroom in landscape can miss every frame in portrait. Measured here, Speed went
// from 24 ms a frame to 17 once its mesas were cached. This runs the same check on
// every finished cabinet so the next slow backdrop shows up here first.
//
// WHAT IT MEASURES. Each stage, loaded fresh in a phone-shaped page, dropped part way
// in (`startAt`) with the hero invulnerable, then the gap between animation frames
// for a few seconds: median, 90th and 99th percentile, the worst, and how many frames
// took over 20 ms (a frame the eye sees as a hitch). The budget is 16.7 ms (60 fps).
// The browser runs with its frame rate unlocked, so a frame's time is its work, not
// the next refresh (runs before 28 Sep 2026 were locked, and read in 8.3 ms steps).
//
// HOW IT STANDS IN FOR THE PHONE. The picture is the iPhone 15 Pro's: 393x852 points
// at 3x, with the render density pinned where that phone plays (portrait 2 —
// PHONE_PORTRAIT_DENSITY_MAX since 29 Sep 2026, it was native 2.46 before — and
// landscape 3). The game's 2D renderer is forced, because
// headless Chromium has no GPU and its software WebGL spends most of every frame
// uploading the picture, which is a cost of this machine and not of the art. So the
// numbers are this Mac's, not the phone's: read them against each other — cabinet
// against cabinet, portrait against landscape, this run against the last.
//
// THE GAME. Uses the dev server on :8001 (the desk's THE GAME) when it is up, and
// otherwise starts one for the run and stops it after.
//
// Usage:
//   node tools/frame-report.js                   cabinets 1-6, portrait at 3 points + landscape at 1
//   node tools/frame-report.js speed crypt       just those cabinets
//   node tools/frame-report.js --quick           portrait only, one point a stage
//   node tools/frame-report.js --seconds 8       a longer look at each point (default 6)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'work/local/reports/frame-report.json');
const PORT = 8001;
const BASE = `http://localhost:${PORT}`;

// Cabinets 1-6 in the registry's order; the rest have nothing of note on them yet.
const CABINETS = ['plumber', 'speed', 'rhythm', 'frost', 'crypt', 'neon'];
const PHONE = { w: 393, h: 852, dpr: 3 };
const DENSITY = { portrait: 2, landscape: 3 };
const BUDGET = 16.7;
const HITCH = 20;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name, dflt) => {
  const i = args.indexOf(name);
  const v = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : dflt;
};
const quick = flag('--quick');
const seconds = valueOf('--seconds', 6);
const numericArgs = new Set(args.flatMap((a, i) => (a === '--seconds' ? [i + 1] : [])));
const named = args.filter((a, i) => !a.startsWith('--') && !numericArgs.has(i));
const unknown = named.filter((c) => !CABINETS.includes(c));
if (unknown.length) {
  console.error(`not one of cabinets 1-6: ${unknown.join(', ')} (${CABINETS.join(', ')})`);
  process.exit(1);
}
const cabinets = named.length ? named : CABINETS;

// Where in a stage to look: early, middle, late. Landscape is the reference, so it is
// measured once a stage, in the middle.
const POINTS = quick ? [50] : [15, 50, 85];
const plan = [];
for (const cab of cabinets) {
  for (const n of [1, 2, 3]) {
    for (const at of POINTS) plan.push({ cab, stage: `${cab}-${n}`, orient: 'portrait', at });
    if (!quick) plan.push({ cab, stage: `${cab}-${n}`, orient: 'landscape', at: 50 });
  }
}

// ------------------------------------------------------------------ the game server
async function answering() {
  try {
    const r = await fetch(`${BASE}/game.js`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch { return false; }
}
let started = null;
async function ensureGame() {
  if (await answering()) return;
  console.log(`nothing on :${PORT} — starting the dev server for this run`);
  started = spawn(process.execPath, [join(root, 'build/dev.js')], {
    cwd: root, env: { ...process.env, MASH_DEV_PORT: String(PORT) }, stdio: 'ignore',
  });
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await answering()) return;
  }
  throw new Error(`the dev server did not come up on :${PORT}`);
}
function stopGame() {
  if (started) started.kill('SIGTERM');
  started = null;
}

// ------------------------------------------------------------------ one look
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
function stats(gaps) {
  const s = [...gaps].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return {
    frames: s.length,
    median: quantile(s, 0.5),
    p90: quantile(s, 0.9),
    p99: quantile(s, 0.99),
    worst: s[s.length - 1],
    hitches: s.filter((v) => v > HITCH).length / s.length,
    fps: 1000 / mean,
  };
}
// OK: the typical frame fits and slow ones are rare. MARGINAL: typical fits, but one
// frame in ten or more misses. OVER: the typical frame misses — steady judder.
function verdictOf(st) {
  if (st.median > BUDGET + 1) return 'over';
  if (st.p90 > HITCH) return 'marginal';
  return 'ok';
}

async function look(browser, run) {
  const portrait = run.orient === 'portrait';
  const context = await browser.newContext({
    viewport: portrait ? { width: PHONE.w, height: PHONE.h } : { width: PHONE.h, height: PHONE.w },
    deviceScaleFactor: PHONE.dpr, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const q = new URLSearchParams({
      goto: 'stage', cab: run.cab, stage: run.stage, seed: '1', renderer: '2d',
      density: String(DENSITY[run.orient]), startAt: String(run.at),
    });
    await page.goto(`${BASE}/?${q}&invuln&mute`, { waitUntil: 'load' });
    // Past the boot, the stage's intro and the first bakes.
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      window.__frameGaps = [];
      let last = performance.now();
      const tick = (now) => { window.__frameGaps.push(now - last); last = now; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.waitForTimeout(seconds * 1000);
    const { gaps, px } = await page.evaluate(() => {
      const c = document.getElementById('game');
      return { gaps: window.__frameGaps.slice(2), px: c ? [c.width, c.height] : null };
    });
    if (gaps.length < 10) throw new Error(errors[0] || 'the stage did not run');
    const st = stats(gaps);
    return { ...run, ...st, verdict: verdictOf(st), px, errors: errors.slice(0, 2) };
  } finally {
    await context.close();
  }
}

// ------------------------------------------------------------------ the run
const previous = (() => {
  try { return JSON.parse(readFileSync(reportPath, 'utf8')); } catch { return null; }
})();
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—');

await ensureGame();
// Unlocked from the display's refresh: a locked browser reports frame times in whole
// refresh steps (8.3 ms here), which hid savings smaller than a step. Unlocked, a
// frame takes as long as its work, so the numbers move with the work.
const browser = await chromium.launch({ args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const results = [];
const began = Date.now();
try {
  for (const [i, run] of plan.entries()) {
    let r;
    try {
      r = await look(browser, run);
    } catch (e) {
      r = { ...run, error: String(e.message || e).split('\n')[0] };
    }
    results.push(r);
    const where = `${run.stage.padEnd(10)} ${run.orient.padEnd(9)} ${String(run.at).padStart(2)}%`;
    console.log(`[${String(i + 1).padStart(2)}/${plan.length}] ${where}  `
      + (r.error ? `ERROR ${r.error}` : `median ${f1(r.median)}  p90 ${f1(r.p90)}  worst ${f1(r.worst)} ms  hitches ${(r.hitches * 100).toFixed(0)}%  ${r.verdict.toUpperCase()}`));
  }
} finally {
  await browser.close();
  stopGame();
}

// One row a stage per orientation: the worst of its points, since the slowest stretch
// is the one a player feels.
const rows = [];
for (const cab of cabinets) {
  for (const n of [1, 2, 3]) {
    const stage = `${cab}-${n}`;
    for (const orient of ['portrait', 'landscape']) {
      const pts = results.filter((r) => r.stage === stage && r.orient === orient);
      if (!pts.length) continue;
      const ok = pts.filter((r) => !r.error);
      const worst = ok.length ? ok.reduce((a, b) => (b.median > a.median || (b.median === a.median && b.p90 > a.p90) ? b : a)) : null;
      const before = previous?.rows?.find((r) => r.stage === stage && r.orient === orient);
      rows.push({
        cab, stage, orient,
        points: pts.map((r) => (r.error ? { at: r.at, error: r.error }
          : { at: r.at, median: r.median, p90: r.p90, p99: r.p99, worst: r.worst, hitches: r.hitches, fps: r.fps, verdict: r.verdict })),
        median: worst?.median ?? null, p90: worst?.p90 ?? null, worst: worst ? Math.max(...ok.map((r) => r.worst)) : null,
        hitches: ok.length ? Math.max(...ok.map((r) => r.hitches)) : null,
        verdict: !worst ? 'error' : ok.some((r) => r.verdict === 'over') ? 'over' : ok.some((r) => r.verdict === 'marginal') ? 'marginal' : 'ok',
        px: ok[0]?.px ?? null,
        was: before && Number.isFinite(before.median) ? { median: before.median, p90: before.p90, at: previous.at } : null,
        error: pts.find((r) => r.error)?.error ?? null,
      });
    }
  }
}
// A partial run (named cabinets) keeps the other cabinets' last rows, so the page
// always shows all six.
const kept = named.length && previous?.rows ? previous.rows.filter((r) => !cabinets.includes(r.cab)) : [];
const order = (r) => CABINETS.indexOf(r.cab) * 10 + Number(r.stage.split('-')[1]) + (r.orient === 'landscape' ? 0.5 : 0);
const all = [...kept, ...rows].sort((a, b) => order(a) - order(b));

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, JSON.stringify({
  at: new Date().toISOString(),
  budget: BUDGET, hitch: HITCH, seconds, points: POINTS, quick,
  phone: { ...PHONE, density: DENSITY, renderer: '2d', name: 'iPhone 15 Pro' },
  cabinets, minutes: (Date.now() - began) / 60000,
  rows: all,
}, null, 2));

console.log('\nportrait, the slowest point of each stage (ms a frame; budget 16.7):');
for (const r of all.filter((x) => x.orient === 'portrait')) {
  const land = all.find((x) => x.stage === r.stage && x.orient === 'landscape');
  const was = r.was ? `  (was ${f1(r.was.median)})` : '';
  console.log(`  ${r.stage.padEnd(10)} median ${f1(r.median).padStart(5)}  p90 ${f1(r.p90).padStart(5)}  ${String(r.verdict).toUpperCase().padEnd(8)}`
    + (land ? `  landscape ${f1(land.median)}` : '') + was);
}
console.log(`\nwrote ${reportPath.replace(`${root}/`, '')}`);
if (existsSync(reportPath) && results.some((r) => r.error)) process.exitCode = 1;
