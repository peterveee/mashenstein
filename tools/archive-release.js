// Copy the current dist/index.html into releases/ under its commit, then
// regenerate releases/index.md. Every push to main archives one playable,
// self-contained copy of the game -- GitHub Pages artifacts expire after a day,
// so this repo is the only durable record of what was published.
// Usage: node tools/archive-release.js   (run after `npm run build`)
import { execFileSync } from 'node:child_process';
import { readdirSync, copyFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const releases = join(root, 'releases');

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

const built = join(root, 'dist/index.html');
if (!existsSync(built)) {
  console.error('no dist/index.html -- run `npm run build` first');
  process.exit(1);
}

mkdirSync(releases, { recursive: true });
const sha = git('rev-parse', '--short=7', 'HEAD');
const date = git('log', '-1', '--format=%ad', '--date=short', 'HEAD');
const name = `${date}-${sha}.html`;
copyFileSync(built, join(releases, name));

// Rebuild the index from whatever is on disk, so a hand-deleted or
// hand-added archive stays consistent without a separate bookkeeping file.
const rows = readdirSync(releases)
  .filter((f) => f.endsWith('.html'))
  .map((file) => {
    const commit = file.slice(0, -5).split('-').pop();
    return {
      file,
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
  '# Published versions',
  '',
  'Each file is a self-contained build of the game as it was deployed to GitHub',
  'Pages by that commit. Open one directly in a browser -- no server needed.',
  '',
  'Written by `tools/archive-release.js` on every push to `main`. Do not edit by hand.',
  '',
  '| Date | Commit | Build | Change |',
  '| --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.date} | \`${r.commit}\` | [${r.file}](${r.file}) | ${r.subject.replace(/\|/g, '\\|')} |`),
  '',
].join('\n');

writeFileSync(join(releases, 'index.md'), md);
console.log(`releases/${name} archived (${rows.length} versions indexed)`);
