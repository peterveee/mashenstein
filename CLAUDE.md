# MASHENSTEIN

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
| Song bounces, stems, visualiser videos | `work/{tracks,stems,video}/` | no |
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
