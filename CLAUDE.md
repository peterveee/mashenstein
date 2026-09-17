# MASHENSTEIN

## Work on main. Stop if you are not.

Peter does not want branches. Not as a style preference — they are the thing that
has repeatedly cost him work and time here, and a change sitting on a branch is a
change that is not in the game.

**Before you do any work, check the branch. If it is not `main`, STOP and say so.**
Do not commit, do not push, do not start editing. Say which branch you are on and
ask whether to continue. Wait for Peter to answer. He may well say carry on — that
is his call to make, not yours to assume.

This fires most often at the start of a session launched from the web or the phone,
because the harness checks out a `claude/<something>` branch before the agent's
first turn. That is exactly the moment the rule is for: say "this session was
started on branch X, do you want me to work here or on main?" and wait.

The rest of it:

- **Never create a branch** for a piece of work. Commit where you are and push to
  `main`.
- **Never open a pull request** unless Peter asks for one in words. A PR needs a
  branch, so it is the same rule.
- **Warn before anything branch-shaped** — creating one, pushing to one, opening a
  PR — rather than doing it and reporting afterwards.
- **Push to `main` when the work is done.** If `main` has moved and your push is
  not a fast-forward, stop and ask rather than merging or rebasing on his behalf.

## The tree is shared. Stage by path, never by wildcard.

Several Claude sessions work in the same checkout at once, each with its own
uncommitted edits sitting in it. `git status` shows all of them, not just yours.

So **stage the files you personally changed, by explicit path**. Never
`git add -A`, never `git add .`, never `git commit -a` — each of those sweeps
other sessions' in-flight work into your commit. Check `git diff --cached --stat`
before you commit and confirm only your own files are there.

Waiting for the other sessions to go idle does not solve this. Idle sessions leave
their edits in the tree; stopping freezes them, it does not file them.

`git stash`, `git reset --hard`, `git checkout .`, `git restore .` and
`git clean` destroy other sessions' work outright. Do not run them.

## Where generated files go

Nothing generated belongs in the repo root. Everything untracked goes under `work/`,
the one drawer that is always safe to delete; the two tracked destinations are for
things worth keeping. Every tool that writes a file writes it into one of these, and
new tools follow the same rule.

| Output | Goes to | Tracked? |
| --- | --- | --- |
| Rendered SFX cues | `work/sfx/` | no |
| Weapon candidate sweeps | `work/weapons/` | no |
| Audition sweeps (drums, voices, shop themes, …) | `work/auditions/<topic>/` | no |
| Promo art and teaser clips | `work/social/` | no |
| The assembled mashenstein.com site (source is `site/`) | `work/site/` | no |
| Song bounces, stems, visualiser videos, dev-menu gameplay recordings | `work/{tracks,stems,video}/` | no |
| MIDI exports of a song bank | `work/midi/` | no |
| Engine reference renders for the null test | `work/baselines/` | no |
| Throwaway verification shots, one-off scripts | `work/local/` | no |
| Song versions the mixer has overwritten | `work/mix-history/` | no |
| Build output | `dist/` | no |
| Screenshots worth keeping — an approved look, a spec | `docs/shots/<topic>/` | **yes** |
| Archived gallery snapshots | `galleries/` | **yes** |

`work/` and `dist/` are gitignored, and those two lines are the whole rule. `dist/`
stays separate because it is the published site — the Pages workflow uploads it as
the deploy artifact.

Prose that describes a render — a listening index, a README naming what each cue is —
is not itself generated, so it goes to `docs/audio/` and is tracked. Nothing tracked
lives inside `work/`; that is what makes the drawer disposable.

### Audio renders are derived, never source

The game synthesizes every SFX live through Web Audio — nothing under `work/`
is loaded at runtime. It exists so cues can be auditioned, and it is all reproducible:

- `node tools/render-sfx.js` — the ten procedural cues, deterministic from code
- `node tools/render-cues.js <cue>[:shape][@gain]` — any engine cue at any strength,
  e.g. `portal:epic@3.5`
- `node tools/render-*-auditions.js` — the sweep tools, one per topic

Delete any of it freely; re-render rather than committing it. The exception is audio
that came out of Peter's real AU plugins via `tools/audition` — that is not
reproducible from code, so check before discarding it.

### Screenshots

When a look is approved, the screenshot is the spec: commit it to
`docs/shots/<topic>/` with a name that says what it shows. Shots taken only to confirm
a change rendered go to `work/local/` and are never committed.
