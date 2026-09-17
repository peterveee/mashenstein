// A bake-off, as a page small enough to hand over.
//
// The gallery is one 5.7MB inline bundle that repaints every tile live — the
// right thing on this machine, the wrong thing to send anywhere. This renders
// ONE section of it headless, screenshots each tile at its honest presentation
// scale, and inlines the PNGs into a self-contained page of a few hundred KB:
// no bundle, no source, no server. Small enough to publish as an Artifact and
// read in the editor panel or on a phone, which is the whole point — the answer
// to "which of these six" should arrive where the question was asked.
//
// It is a STILL of the gallery, never a replacement for it: no toggles, no
// zoom, no animation. When the question is "what does this look like", this is
// enough; when it is "how does this move", open the gallery.
//
// Usage:
//   node tools/bakeoff-artifact.js <section-id> [<section-id>…] [options]
//
//   --zoom N       screen scale, as the gallery's control means it (default 3,
//                  the desktop floor — see gallery-shell.html; never below it)
//   --res N        render density, 3 or 6 (default: matched to --zoom so the
//                  capture is 1:1 with the backing store rather than resampled)
//   --filter TEXT  only tiles whose name or sub-label contains TEXT
//   --frame N      freeze every tile at frame N of the 24fps gallery clock, so
//                  a lineup is captured in step (default 24 — one second in).
//                  --frame live lets the clock run and takes each tile whenever
//                  its turn comes, which puts them out of phase with each other.
//   --title TEXT   page title (default: the section's own heading)
//   --out PATH     default work/local/bakeoff-<section>.html
//
// Run `npm run gallery` first: this reads dist/, so it shows the art as of the
// last build, not as of the working tree.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------ arguments
const argv = process.argv.slice(2);
const sections = [];
const opt = { zoom: 3, res: null, filter: '', frame: '24', title: '', out: '' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { sections.push(a); continue; }
  const key = a.slice(2);
  if (!(key in opt)) { console.error(`unknown option --${key}`); process.exit(1); }
  const value = argv[++i];
  if (value === undefined) { console.error(`--${key} needs a value`); process.exit(1); }
  opt[key] = key === 'zoom' ? Number(value) : value;
}
if (!sections.length) {
  console.error('usage: node tools/bakeoff-artifact.js <section-id> [more…] [--zoom 3] [--filter text] [--frame 24|live]');
  process.exit(1);
}
// The gallery offers two render densities and nothing between them. Matching
// the screen scale keeps the screenshot 1:1 with the canvas backing store;
// anything else resamples, and a resampled capture reads as dim art that is not
// actually dim.
const renderScale = opt.res ? Number(opt.res) : (opt.zoom <= 3 ? 3 : 6);
if (![3, 6].includes(renderScale)) { console.error('--res is 3 or 6'); process.exit(1); }
if (opt.zoom < 3) console.warn(`warning: --zoom ${opt.zoom} is below the desktop floor; the page will flatter the art`);

const PAGES = ['dist/gallery-lab.html', 'dist/gallery.html'];
for (const p of PAGES) {
  if (existsSync(join(root, p))) continue;
  console.error(`no ${p} — run \`npm run gallery\` first`);
  process.exit(1);
}

const git = (...args) => {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); } catch { return ''; }
};
const sha = git('rev-parse', '--short=7', 'HEAD');
const dirty = git('status', '--porcelain') ? ' + uncommitted' : '';
const today = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// --------------------------------------------------------------- the capture
const browser = await chromium.launch();
// Tall and wide: the gallery paints a tile when it comes within 200px of the
// viewport, so a big window pays for fewer scroll-and-settle rounds.
const page = await browser.newPage({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

const live = opt.frame === 'live';
const clock = live ? 0 : Number(opt.frame) / 24;
if (!live && !Number.isFinite(clock)) { console.error('--frame takes a number or "live"'); process.exit(1); }

let loaded = '';
const shot = [];

for (const id of sections) {
  // Both pages carry the same bundle but attach different halves of it, so the
  // page a section lives on is a property of the section, not of the caller.
  let host = '';
  for (const candidate of PAGES) {
    if (loaded !== candidate) {
      await page.goto(`file://${join(root, candidate)}?t=${Date.now()}`, { waitUntil: 'load' });
      await page.selectOption('#zoom', String(opt.zoom));
      await page.selectOption('#resolution', String(renderScale));
      if (!live) await page.uncheck('#animate');
      loaded = candidate;
    }
    if (await page.locator(`#${id}`).count()) { host = candidate; break; }
  }
  if (!host) {
    console.error(`no section #${id} on either gallery page`);
    await browser.close();
    process.exit(1);
  }

  const section = page.locator(`#${id}`);
  // textContent, not innerText: the gallery's CSS uppercases its h2, and
  // innerText hands back the transformed text — a heading that SHOUTS.
  const heading = (await section.locator('h2').first().evaluate((el) => el.textContent)).trim();
  const note = await section.locator('p.note').first().count()
    ? (await section.locator('p.note').first().innerText()).trim() : '';

  let cards = section.locator('.card');
  if (opt.filter) cards = cards.filter({ hasText: opt.filter });
  const count = await cards.count();
  if (!count) {
    console.error(`#${id} has no tiles${opt.filter ? ` matching "${opt.filter}"` : ''}`);
    await browser.close();
    process.exit(1);
  }

  const tiles = [];
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    // One tile of this section, at one instant of the gallery clock. Painting
    // explicitly rather than waiting out the animation is what keeps a lineup
    // in step: every tile on the sheet shows the same frame of its own cycle.
    const painted = await card.evaluate((el, t) => {
      const g = window.__gallery;
      const tile = g && g.tiles.find((x) => x.card === el);
      if (!tile) return 'no tile';
      tile.visible = true;
      try { g.paint(tile, t); } catch (e) { return e.message; }
      return tile.stack ? tile.stack.split('\n')[0] : '';
    }, clock);
    if (live) await page.waitForTimeout(120);
    const png = await card.locator('canvas').screenshot({ type: 'png' });
    const label = (await card.locator('.name').innerText()).trim();
    const name = (await card.locator('.name b').count())
      ? (await card.locator('.name b').first().innerText()).trim() : label;
    const sub = label.startsWith(name) ? label.slice(name.length).trim() : '';
    const box = await card.locator('canvas').boundingBox();
    tiles.push({ name, sub, png, w: Math.round(box.width), h: Math.round(box.height), error: painted });
    if (painted) console.warn(`  ! ${name}: ${painted}`);
  }
  shot.push({ id, heading, note, tiles });
  console.log(`#${id}: ${tiles.length} tile${tiles.length === 1 ? '' : 's'} from ${host}`);
}

await browser.close();
if (pageErrors.length) {
  console.error('page errors:\n  ' + pageErrors.join('\n  '));
  process.exit(1);
}

// ----------------------------------------------------------------- the page
// The gallery's own palette, because this is the gallery with the interactivity
// taken out and a reader should recognise it as such. It commits to the one
// dark look on purpose — the art is judged against #0b0b14 in the game, in the
// gallery and here, and a page that flipped to a light ground in a phone's
// light theme would be judging it against something else.
// The gallery names a section as a heading — a name, an em dash, and what the
// question is. The name alone is the page's name; the rest is the h1.
const heading = shot[0].heading.replace(/\s+/g, ' ').trim();
const title = opt.title || (shot.length > 1 ? heading : heading.split(/\s+[—–-]\s+/)[0]);
const banner = shot.length > 1 ? title : heading;
const total = shot.reduce((n, s) => n + s.tiles.length, 0);
const meta = [
  `${sha}${dirty}`,
  today,
  `${opt.zoom}x screen scale · ${renderScale}x render`,
  live ? 'live frame' : `frame ${opt.frame}`,
  `${total} tile${total === 1 ? '' : 's'}`,
];

const html = `<title>${esc(title)}</title>
<style>
  :root { --bg:#0b0b14; --panel:#15151f; --line:#2a2a3a; --ink:#e0e0e8; --dim:#8a8a9e;
          --accent:#f6d33c; --err:#e04848;
          --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  body { margin:0; padding-block:0 40px; background:var(--bg); color:var(--ink);
         font:13px/1.45 var(--mono); }
  header { border-bottom:1px solid var(--line); padding:18px 16px 14px; margin-bottom:22px;
           background-image:radial-gradient(ellipse 900px 420px at 12% -40%, rgba(246,211,60,0.07), transparent); }
  h1 { margin:0; font-size:16px; letter-spacing:0.07em; font-weight:600; color:var(--accent);
       text-wrap:balance; }
  .meta { display:flex; flex-wrap:wrap; gap:6px 14px; margin-top:8px; color:var(--dim); font-size:11px;
          font-variant-numeric:tabular-nums; }
  main { padding:0 16px; display:flex; flex-direction:column; gap:30px; }
  h2 { font-size:12px; letter-spacing:0.14em; text-transform:uppercase; color:var(--accent);
       border-bottom:1px solid var(--line); padding-bottom:6px; margin:0 0 6px; }
  p.note { color:var(--dim); margin:0 0 14px; max-width:68ch; }
  .grid { display:flex; flex-wrap:wrap; gap:10px; align-items:flex-start; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:8px;
          display:flex; flex-direction:column; align-items:safe center; gap:6px;
          max-width:100%; overflow-x:auto; }
  /* An honest capture is shown at the size it was captured. The publish
     skeleton caps images at the column width; a 480x270 frame taken at 3x is
     1440px wide and would come back to the reader at a third of its real read,
     which is the flattery the gallery exists to avoid. It scrolls inside its
     own card instead — the page itself never scrolls sideways. */
  .card img { display:block; max-width:none; border-radius:3px; }
  .card .name { color:var(--dim); font-size:11px; text-align:center;
                width:0; min-width:max(100%, 150px); max-width:100%; word-break:break-word; }
  .card .name b { color:var(--ink); font-weight:normal; }
  .card.err { border-color:var(--err); }
  .card.err .name { color:var(--err); }
  footer { color:var(--dim); font-size:11px; padding:26px 16px 0; max-width:68ch; }
  footer code { color:var(--ink); }
</style>
<header>
  <h1>${esc(banner)}</h1>
  <div class="meta">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
</header>
<main>
${shot.map((s) => `  <section>
${shot.length > 1 ? `    <h2>${esc(s.heading)}</h2>\n` : ''}${s.note ? `    <p class="note">${esc(s.note)}</p>\n` : ''}    <div class="grid">
${s.tiles.map((t) => `      <div class="card${t.error ? ' err' : ''}">
        <img src="data:image/png;base64,${t.png.toString('base64')}" width="${t.w}" height="${t.h}" alt="${esc(t.name)} ${esc(t.sub)}">
        <div class="name"><b>${esc(t.name)}</b>${t.sub ? ' ' + esc(t.sub) : ''}${t.error ? ` — ${esc(t.error)}` : ''}</div>
      </div>`).join('\n')}
    </div>
  </section>`).join('\n')}
</main>
<footer>
  Stills from the MASHENSTEIN asset gallery at <code>${esc(sha)}${esc(dirty)}</code>, captured at the
  ${esc(String(opt.zoom))}x screen scale${live ? '' : ` on frame ${esc(opt.frame)} of the 24fps gallery clock, every tile in step`}.
  The gallery itself animates and zooms: <code>npm run gallery</code>, then <code>dist/gallery${shot.every((s) => s.id) ? '-lab' : ''}.html</code>.
</footer>
`;

const out = opt.out || join(root, 'work/local', `bakeoff-${sections.join('-')}.html`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
const kb = html.length / 1024;
console.log(`${out} written (${kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`})`);
// The Artifact ceiling is 16MB with the base64 counted, and base64 is a third
// bigger than the PNGs it carries. Fail loudly rather than at publish time.
if (html.length > 15 * 1024 * 1024) {
  console.error('too big to publish — narrow it with --filter, or drop --zoom to 3');
  process.exit(1);
}
