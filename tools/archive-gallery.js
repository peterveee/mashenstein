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
// Usage: node tools/archive-gallery.js   (run after `npm run gallery`)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
for (const page of PAGES) {
  if (existsSync(join(root, page.built))) continue;
  console.error(`no ${page.built} -- run \`npm run gallery\` first`);
  process.exit(1);
}

mkdirSync(galleries, { recursive: true });
const sha = git('rev-parse', '--short=7', 'HEAD');
const date = git('log', '-1', '--format=%ad', '--date=short', 'HEAD');
const name = `${date}-${sha}.html`;
const labName = `${date}-${sha}-lab.html`;
for (const page of PAGES) {
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
  'Do not edit by hand.',
  '',
  '| Date | Commit | Gallery | Lab | Change |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.date} | \`${r.commit}\` | [${r.file}](${r.file}) | `
    + `${r.lab ? `[bake-offs](${r.lab})` : '--'} | ${r.subject.replace(/\|/g, '\\|')} |`),
  '',
].join('\n');

writeFileSync(join(galleries, 'index.md'), md);
console.log(`galleries/${name} archived (${rows.length} snapshots indexed)`);
