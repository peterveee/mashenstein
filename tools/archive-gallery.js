// Copy the current dist/gallery.html and dist/gallery-lab.html into galleries/
// under their commit, then regenerate galleries/index.md. This is the visual history of the game: every
// snapshot renders every drawable by calling the real draw functions at that
// commit, so it shows what the art actually looked like, not what a stale
// screenshot claimed. Sibling of tools/archive-release.js, which does the same
// for the playable build.
//
// Unlike releases/, this does NOT run on every push -- only when a commit
// touches art (see ART_PATHS in .github/workflows/deploy-pages.yml). Snapshots
// are ~230KB each and the art moves far slower than the code.
// Usage: node tools/archive-gallery.js               (run after `npm run gallery`)
//        node tools/archive-gallery.js --prune-only  (apply retention, archive nothing)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const galleries = join(root, 'galleries');

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

// Same, but empty instead of throwing when the commit is unreachable -- a
// shallow CI clone or rewritten history should degrade one row of the index,
// not fail the archive.
function gitTry(...args) {
  try {
    return git(...args);
  } catch {
    return '';
  }
}

// The gallery is two pages -- the production reference and the lab -- and they
// link to each other. A snapshot has to carry BOTH or the link at the top of an
// archived page would dangle, so they are archived as a pair, named for the same
// commit, with the dist hrefs rewritten to the pair's archived names.
const PAGES = [
  { built: 'dist/gallery.html', suffix: '' },
  { built: 'dist/gallery-lab.html', suffix: '-lab' },
];
// --prune-only applies the retention rule below to what is already on disk and
// rebuilds the index, without needing a build to archive. It is how a policy
// change is applied to the existing history in one pass.
const pruneOnly = process.argv.includes('--prune-only');
if (!pruneOnly) {
  for (const page of PAGES) {
    if (existsSync(join(root, page.built))) continue;
    console.error(`no ${page.built} -- run \`npm run gallery\` first`);
    process.exit(1);
  }
}

mkdirSync(galleries, { recursive: true });
const sha = git('rev-parse', '--short=7', 'HEAD');
const date = git('log', '-1', '--format=%ad', '--date=short', 'HEAD');
const name = `${date}-${sha}.html`;
const labName = `${date}-${sha}-lab.html`;
for (const page of pruneOnly ? [] : PAGES) {
  const html = readFileSync(join(root, page.built), 'utf8');
  // Assert both rewrites: a silent no-op would archive a page whose header
  // links point at dist filenames that do not exist beside it.
  let out = html;
  for (const [from, to] of [['href="gallery.html"', `href="${name}"`],
    ['href="gallery-lab.html"', `href="${labName}"`]]) {
    if (!out.includes(from)) throw new Error(`${page.built} has no ${from} to rewrite`);
    out = out.split(from).join(to);
  }
  writeFileSync(join(galleries, `${date}-${sha}${page.suffix}.html`), out);
}

// Retention. A snapshot is archived after every art change and the recent ones
// run ~4MB a pair, so an unbounded galleries/ grows by that much per iteration.
// Keep the last snapshot of each ISO week as the periodic backup, plus every
// snapshot from the last week so an in-flight iteration keeps all of its steps.
// The index below is rebuilt from disk, so pruning needs no other bookkeeping.
const KEEP_RECENT_DAYS = 7;
const DAY = 86400;
const now = Date.now() / 1000;

// A snapshot is dated by its commit, not its file -- but a rewritten or
// unreachable commit falls back to mtime rather than sorting to 1970 and
// getting swept on the next run.
const snapshotTime = (file, commit) => Number(gitTry('show', '-s', '--format=%ct', commit))
  || statSync(join(galleries, file)).mtimeMs / 1000;

// ISO week, so a bucket boundary does not drift with the length of the month.
// It buckets on the snapshot's FILENAME date, not its commit instant: the
// filename and the index carry the author-local date, so a commit made late on
// a Sunday evening is filed under Monday. Bucketing on the UTC instant would
// put it in the previous week and silently sweep the Monday snapshot that the
// index appears to show as that week's only one. Ordering still uses the true
// commit time -- bucket by the date on display, pick within it by what is newest.
function isoWeek(date) {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const jan1 = Date.UTC(t.getUTCFullYear(), 0, 1);
  return `${t.getUTCFullYear()}-W${Math.ceil(((t - jan1) / DAY / 1000 + 1) / 7)}`;
}

const snapshots = readdirSync(galleries)
  .filter((f) => f.endsWith('.html') && !f.endsWith('-lab.html'))
  .map((file) => ({ file, time: snapshotTime(file, file.slice(0, -5).split('-').pop()) }))
  .sort((a, b) => a.time - b.time);

// Ascending, so the last write into a week's slot is that week's newest.
const weekly = new Map();
for (const s of snapshots) weekly.set(isoWeek(s.file.slice(0, 10)), s.file);
const keep = new Set(weekly.values());
for (const s of snapshots) if (s.time > now - KEEP_RECENT_DAYS * DAY) keep.add(s.file);
keep.add(name); // never prune the snapshot this run just wrote

let pruned = 0;
for (const s of snapshots) {
  if (keep.has(s.file)) continue;
  // A snapshot is its pair. Dropping a gallery without its lab page would leave
  // an orphan whose header link points at a file that is no longer beside it.
  for (const f of [s.file, s.file.replace(/\.html$/, '-lab.html')]) {
    if (existsSync(join(galleries, f))) unlinkSync(join(galleries, f));
  }
  pruned += 1;
}

// Rebuild the index from whatever is on disk, so a hand-deleted or
// hand-added snapshot stays consistent without a separate bookkeeping file.
const all = readdirSync(galleries).filter((f) => f.endsWith('.html'));
// Lab pages are listed as a column on their sibling's row, not as rows of their
// own -- one snapshot, two files.
const rows = all
  .filter((f) => !f.endsWith('-lab.html'))
  .map((file) => {
    const commit = file.slice(0, -5).split('-').pop();
    const lab = file.replace(/\.html$/, '-lab.html');
    return {
      file,
      lab: all.includes(lab) ? lab : '',
      commit,
      // A commit can go missing if history is rewritten; keep the row anyway.
      // Fall back to the filename's date so an unresolvable commit still sorts
      // roughly right instead of jumping to the top of the table.
      when: Number(gitTry('show', '-s', '--format=%ct', commit))
        || Date.parse(file.slice(0, 10)) / 1000,
      date: file.slice(0, 10),
      subject: gitTry('show', '-s', '--format=%s', commit) || '(commit not in history)',
    };
  })
  .sort((a, b) => a.when - b.when);

const md = [
  '# Asset gallery history',
  '',
  'Each file is a self-contained snapshot of every drawable in the game as of',
  'that commit -- backgrounds, heroes, props, world sprites, obstacles, pickups,',
  'the style matrix, and HUD bits. From 2026-09 a snapshot is two files: the',
  'gallery itself and a Lab page holding that commit\'s open bake-offs, linked',
  'to each other at the top. Open one directly in a browser -- no server',
  'needed. Zoom, filter by name, and click any tile to save it as a PNG.',
  '',
  'These render by calling the real draw functions, so a snapshot cannot drift',
  'from the source it was built at.',
  '',
  'Written by `tools/archive-gallery.js`, on pushes to `main` that touch art.',
  'It keeps the last snapshot of each week plus every snapshot from the last',
  'seven days, so an iteration in flight keeps all of its steps while older',
  'history thins to one a week. Do not edit by hand.',
  '',
  '| Date | Commit | Gallery | Lab | Change |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.date} | \`${r.commit}\` | [${r.file}](${r.file}) | `
    + `${r.lab ? `[bake-offs](${r.lab})` : '--'} | ${r.subject.replace(/\|/g, '\\|')} |`),
  '',
].join('\n');

writeFileSync(join(galleries, 'index.md'), md);
console.log(`${pruneOnly ? 'galleries/ pruned' : `galleries/${name} archived`} (${rows.length} indexed`
  + `${pruned ? `, ${pruned} pruned` : ''})`);
