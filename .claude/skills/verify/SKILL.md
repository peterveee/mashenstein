---
name: verify
description: Drive MASHENSTEIN in a real browser and screenshot the canvas to verify a change. Use when confirming gameplay, HUD, or menu changes actually render.
---

# Verifying MASHENSTEIN

The game is a single `<canvas id="game">` (logical 480x270) bundled to one
HTML file. Verification means driving it in Chromium and screenshotting the
canvas. `npm test` is CI — it does not verify rendering.

## Build an unminified bundle first

`npm run build` minifies, which mangles class names and makes
`window.__mash_state` useless for knowing where you are.

`npm run dev` builds unminified with an inline sourcemap, rebuilds on every
save, and serves `dist/` at http://127.0.0.1:8000 — driving that URL is the
best way to never verify a stale bundle. Use it unless you need the bundle as
a standalone file. To bundle by hand instead:

```js
const r = await esbuild.build({
  entryPoints: ['src/main.js'], bundle: true, format: 'iife', write: false,
  target: ['es2020'], minify: false, logLevel: 'silent',
});
const tpl = fs.readFileSync('build/template.html', 'utf8');
const safe = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
fs.writeFileSync('<scratch>/debug.html', tpl.replace('/*__BUNDLE__*/', () => safe));
```

## Drive it

Playwright is not a dependency; `npx playwright` installs it and Chromium is
usually already cached. Import it by absolute path from the npx cache
(`~/.npm/_npx/*/node_modules/playwright/index.mjs`).

Useful handles the bundle exposes on `window`:

- `__mash_booted` — true once boot() finished; wait on this before driving.
- `__mash_state` — current state class name (`HubState`, `StageSelectState`,
  `RunState`, `MinigameState`, ...). Only readable in an unminified build.
- `__mash_cur` — the live state instance itself. In a RunState you can force
  UI deterministically instead of waiting for gameplay: call `floatText(...)`,
  assign `speech = {text, t, who}`, and stretch `t` so nothing fades mid-shot.

Screenshot `page.locator('#game')`, not the viewport, to get just the canvas.

## Skip the slow parts by seeding a save

Playing from a new file costs ~30 keypresses (title, difficulty, 9 intro
panels). Instead inject `localStorage['mashenstein.v2']` before load with
`page.addInitScript`. Build the blob from the real schema so it stays valid:

```js
const slot = defaultSlot();            // src/engine/save.js
slot.createdAt = 1;                    // non-zero, or the slot reads as empty
slot.campaign.storyFlags.sawIntro = true;
slot.campaign.plugs['plumber-1'] = [true, true, true];   // [mission, challenge, toaster]
const blob = { version: 2, settings: defaultSettings(), slots: [slot, null, null] };
```

With `sawIntro` set, one Enter on the title goes straight to the hub.

## Reaching common surfaces from the hub

- **Stage select** — hold ArrowRight ~400ms to reach the first cabinet, Enter.
  On a cabinet's first open a breaker-box minigame fires; press Escape to skip
  it, then Enter to dismiss the result.
- **A run** — from stage select, ArrowDown to pick a stage, Enter. Give it
  ~2s so the HUD populates.
- **Touch/mobile behaviour** — set
  `window.matchMedia = (q) => ({ matches: q.includes('coarse') })` in an init
  script. `Input.isTouchDevice()` keys off `(pointer: coarse)`, and touch
  builds bypass the minigames entirely.

## Gotchas

- Stage ids are `<cabinet>-<n>` (`plumber-1`); cabinet ids come from
  `src/data/cabinets.js`, `CABINETS[0]` is `plumber`.
- The HUD left column stacks score / coins / battery / shields / plug tally on
  a running cursor, not fixed y values — each row advances it only when it
  draws, and the shield row is skipped entirely when no shield is held. Adding
  a row means advancing the cursor by its own height plus the gap.
- Menu text is drawn with a proportional font measured via canvas
  `measureText`. In Node the DOM stub returns bogus metrics, so `textWidth()`
  is meaningless headlessly — check text fit by screenshotting, or compare
  character counts against a line already known to fit.
- `#game` gets a WebGL context whenever `glfx.init()` succeeds, and the
  `fancyFx` setting does not change that. So `drawImage(canvas, ...)` reads
  back **black** — you cannot magnify by copying the live canvas. Capture with
  `locator('#game').screenshot()` (a compositor grab, which works), then
  upscale that PNG in a second page with `imageSmoothingEnabled = false`.
- Canvas screenshots come out 960x540, exactly 2x the 480x270 logical space —
  double logical coordinates when cropping.
- `strokeRect`/`stroke` inherit `ctx.lineWidth` from whatever drew last, and it
  persists across frames. New HUD chrome should `save()`/`restore()` or set
  width explicitly, or it renders at different weights on different screens.
