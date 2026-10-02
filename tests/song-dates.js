// The song drawer's "Newest first": a song's age is when it was MADE — the earlier of its
// first commit and its file's birth time — never when it was last written. Run against a
// throwaway git repo so the dates are ones this test chose.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { songCreatedDates } from '../tools/lib/song-dates.js';

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const root = mkdtempSync(join(tmpdir(), 'mash-song-dates-'));
const bare = mkdtempSync(join(tmpdir(), 'mash-song-dates-nogit-'));
try {
  const git = (...args) => execFileSync('git', args, {
    cwd: root, stdio: 'pipe',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
      GIT_AUTHOR_DATE: '2026-01-05T12:00:00Z', GIT_COMMITTER_DATE: '2026-01-05T12:00:00Z',
    },
  });
  for (const dir of ['src/data/imported', 'src/data/songs', 'work/scratch']) mkdirSync(join(root, dir), { recursive: true });
  git('init', '-q');
  writeFileSync(join(root, 'src/data/imported/old-tune.js'), 'export const bank = {};\n');
  writeFileSync(join(root, 'src/data/songs/crypt.js'), 'export const bank = {};\n');
  git('add', '.');
  git('commit', '-q', '-m', 'songs');
  const committedAt = Date.parse('2026-01-05T12:00:00Z');

  // Moved out of git into the scratch drawer: a brand-new file as far as the disk knows,
  // with today as its birthday. The commit is the truth.
  renameSync(join(root, 'src/data/imported/old-tune.js'), join(root, 'work/scratch/old-tune.js'));
  writeFileSync(join(root, 'work/scratch/old-tune.js'), 'export const bank = { moved: true };\n');
  // Never committed: the file's own birth time is all there is.
  writeFileSync(join(root, 'work/scratch/fresh-idea.js'), 'export const bank = {};\n');

  const dates = await songCreatedDates(root, ['old-tune', 'crypt', 'fresh-idea', 'nowhere']);
  assert(dates['old-tune'] === committedAt, 'a song moved out of git keeps the date it was first committed');
  assert(dates.crypt === committedAt, 'a game song is dated from src/data/songs/<id>.js');
  assert(Math.abs(dates['fresh-idea'] - statSync(join(root, 'work/scratch/fresh-idea.js')).birthtimeMs) < 1,
    'a song git never saw is dated by its birth time');
  assert(!('nowhere' in dates), 'an id with no file and no commit is left undated');

  // A rewrite in place — a save, a catalogue sweep — must not make a song new.
  writeFileSync(join(root, 'src/data/songs/crypt.js'), 'export const bank = { refaded: true };\n');
  assert((await songCreatedDates(root, ['crypt'])).crypt === committedAt, 'rewriting a song does not change its age');

  // No git at all: birth times alone, and no throw.
  mkdirSync(join(bare, 'work/scratch'), { recursive: true });
  writeFileSync(join(bare, 'work/scratch/solo.js'), 'export const bank = {};\n');
  const solo = await songCreatedDates(bare, ['solo']);
  assert(Number.isFinite(solo.solo) && solo.solo > 0, 'outside a git checkout a song is still dated by its file');
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(bare, { recursive: true, force: true });
}

if (failed) process.exit(1);
console.log('song-dates: all passed');
