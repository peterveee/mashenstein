// Combine the current split dist/index.html + dist/game.js into one release
// HTML under its commit, then regenerate releases/index.md. The live build
// keeps game.js behind the iPhone install gate; historical snapshots remain
// self-contained because GitHub Pages artifacts expire after a day.
// Usage: node tools/archive-release.js   (run after `npm run build`)
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
const builtGame = join(root, 'dist/game.js');
if (!existsSync(built) || !existsSync(builtGame)) {
  console.error('no complete dist build -- run `npm run build` first');
  process.exit(1);
}

mkdirSync(releases, { recursive: true });
const sha = git('rev-parse', '--short=7', 'HEAD');
const date = git('log', '-1', '--format=%ad', '--date=short', 'HEAD');
const name = `${date}-${sha}.html`;
const html = readFileSync(built, 'utf8');
// A non-JavaScript script element is inert until the already-inlined gate
// copies its text into a real script after platform approval. Escape a literal
// closing tag so game source can never terminate this storage element early.
const game = readFileSync(builtGame, 'utf8').replace(/<\/script/gi, '<\\/script');
const embedded = `<script id="mash-embedded-game" type="application/x-mashenstein">${game}</script>\n`;
writeFileSync(join(releases, name), html.replace('</body>', `${embedded}</body>`));

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
