# MASHENSTEIN

## Where generated files go

Nothing generated belongs in the repo root. Every tool that writes a file writes it
into one of these, and new tools follow the same rule.

| Output | Goes to | Tracked? |
| --- | --- | --- |
| Rendered SFX cues | `audio/renders/sfx/` | no |
| Weapon candidate sweeps | `audio/renders/weapons/` | no |
| Audition sweeps (drums, voices, shop themes, …) | `audio/renders/auditions/<topic>/` | no |
| Engine reference renders for the null test | `baselines/` | no |
| Screenshots worth keeping — an approved look, a spec | `docs/shots/<topic>/` | **yes** |
| Throwaway verification shots, one-off scripts | `local/` | no |
| Build output | `dist/` | no |
| Archived gallery snapshots | `galleries/` | **yes** |

`audio/renders/**/*.wav`, `local/`, `dist/`, and `baselines/` are gitignored. READMEs
beside the renders stay tracked, so a listening index can live next to its files.

### Audio renders are derived, never source

The game synthesizes every SFX live through Web Audio — nothing under `audio/renders/`
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
a change rendered go to `local/` and are never committed.
