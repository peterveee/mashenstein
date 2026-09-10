# Character editor

Start it with `npm run characters` and open <http://127.0.0.1:8030>. The page uses
the production `drawToon` painter, so NOW and EDIT are comparisons against the actual
body renderer. NOW is the saved source; EDIT is the local draft.

The left rail selects a hero. Controls are grouped into body size, torso and shoulders,
arms, hips and joins, and legs. The **Body shape** selector switches between the
renderer’s Round and Tapered torso constructions; shape-specific controls remain visible
with an explanation when they are unavailable. Four arm controls (length, width,
shoulder height, and shoulder spread) use the existing humanoid arm solver, so hands,
props, cuffs, and Lorenzo’s two straps follow the edited sockets.

A yellow handle on the focused canvas edits shoulder width, torso length, body-over-leg,
or near-hip position; sliders and number fields remain the exact controls. Every label
has a keyboard-accessible help button with plain-language guidance. The pose selector,
attack selector, and timeline keep NOW and EDIT on one clock. Characters with a real
weapon or ability expose **Shoot / attack** and show the production wind-up, release,
and recovery painter; unsupported characters do not get a fabricated attack.

The focus frame measures its actual CSS size and uses one uniform logical draw height.
Zoom and Fit change view state only, so high zoom crops deliberately without stretching
the character. Pose cards keep a readable minimum size and stack below the preview when
the rail is narrow. ResizeObserver redraws paused previews after a layout change.

The slide card follows the game’s real policy: Gary and Dolores retain their crouch,
while supported playable humanoids and Rusty use kick-slide. For leg work, enable
`hide skirts on slide · preview only`. This passes the existing `pose.hideSkirt` anatomy
flag to the slide painter only; run, walk, jump, stand, and attack retain their garments.
It is transient UI state: it is not a dial, is not stored in local drafts or variants,
and cannot be written by `APPLY TO SOURCE`.

`SAVE VARIANT` stores an experiment in this browser only. `APPLY TO SOURCE` is the
explicit write operation. It snapshots the current source under
`work/toon-specs-history/`, checks the source revision, validates the candidate, and
atomically updates only the selected hero literal. A stale draft is refused with a
conflict rather than overwriting another edit. Reloading the page restores drafts only
when their source revision still matches.

The writer owns the marked block between:

```js
// proportions — written by the character editor (tools/character-editor.js)
// end character editor proportions
```

Hand-written properties remain outside that block. `inherit` removes a local override;
it does not force a renderer default, which matters for Rusty’s spread from `RUSTY_T1`.
The editor does not change collision dimensions or promote Rusty into the production cast.

The exposed controls intentionally stop at renderer-backed behavior:

| Group | Controls | Renderer coverage |
| --- | --- | --- |
| Body size | Height | Shared humanoid height path; head size is preserved. |
| Torso and shoulders | Torso length, shoulder width, waist taper, waist, shoulder corner | Round and Tapered humanoid torso paths; waist controls are Tapered-only. |
| Arms | Arm length, arm width, shoulder height, shoulder spread | Humanoid arm sockets, reach, hands, held props, and kick-slide reach where supported. |
| Hips and joins | Body over leg, hip tuck, hip round, thigh join, underside line, near hip back | Existing body/leg join paths; underside line requires Flush and near-hip back is pose-specific. |
| Legs | Leg length, leg width, leg into body, near leg back | Existing leg dimensions and supported run/jump targets. |

The old `armLen` property remains a B-33P-specific authored key and is deliberately
not exposed; the renderer reads `armLength` for the shared arm control. Zoom, Fit,
Facing, overlays, tooltips, and Hide skirts are view state and never enter drafts,
variants, or source writes.

Focused checks are `node tests/hero-dials.js`, `node tests/character-editor-viewport.js`,
`node tests/character-editor-actions.js`, `node tests/character-rendering.js`, and
`node tests/slide-kit.js`. When a Chromium binary is available, run
`node tests/character-editor-browser.js` for the DOM, action, tooltip, and NOW/EDIT
regressions. The browser suite is registered in `tests/run-all.js` as an on-demand
browser suite.
