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
save, and serves `dist/` at **http://localhost:8001** locally and
**http://MBP14.local:8001** from a phone or tablet on the same network. Driving
that URL is the best way to never verify a stale bundle. Use it unless you need
the bundle as a standalone file. **Always append `?fps&mute` to the URL** when
driving with Playwright, so the FPS counter is visible and audio doesn't
interfere.

Both halves of that address are pinned deliberately in `build/build.js`, and
both are worth understanding before hardcoding a URL anywhere:

- **The port** (`DEV_PORT`) is the half esbuild picks at random when left alone,
  which is what made the URL move between runs.
- **The name** is the half DHCP moves. Prefer the `.local` name over any
  `192.168.x.y` you see in a banner — the IP is only that day's lease, and a
  script that hardcodes one starts failing the next time the router reboots.

esbuild's own server cannot answer to either name: since 0.25 it refuses any
request whose `Host` is not `localhost`/`127.0.0.1` or an IP the machine held
*at the moment it started*, so a `.local` name gets a flat `403`, and a laptop
that changes network mid-session starts 403ing the very URL that worked an hour
earlier. So esbuild is served on a private loopback port and a small proxy in
`build/build.js` owns 8001, rewriting `Host` on the way through. If you see
`403 - Forbidden: The host "..." is not allowed`, something has bypassed that
proxy and is talking to esbuild directly.

`MASH_DEV_HOST` / `MASH_DEV_PORT` override either half for a one-off; naming a
single interface via `MASH_DEV_HOST` stops `127.0.0.1` listening, and the
startup line says so when that happens.

A phone that hangs forever while localhost is fine is the macOS firewall, which
allows incoming connections per *binary* — the listener is `node`, and its
approval is recorded against an absolute path, so a node upgrade silently
revokes it. The startup banner detects this and prints the two `socketfilterfw`
commands that fix it.

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

## Dev URL shortcuts (preferred — no menu navigation needed)

Append `?goto=X` to jump directly to any surface. Only works in dev/watch
builds (`npm run dev`). A save slot is auto-seeded if none exists.

| URL | Screen |
|---|---|
| `?goto=tutorial` | Interactive mandatory training |
| `?goto=hub` | Food court |
| `?goto=howto` | How To Play reference |
| `?goto=fieldguide` | Field Guide |
| `?goto=settings` | Settings |
| `?goto=cast` | Cast roll |
| `?goto=attract` | Attract demo |
| `?goto=intro` | Opening panels |
| `?goto=soundtest` | Jukebox |

**Launching stages / bosses / overtime directly:**

| URL | Effect |
|---|---|
| `?goto=stage&cab=plumber` | Stage select for Plumber Panic |
| `?goto=stage&cab=plumber&stage=plumber-1` | Launch Plumber Panic stage 1 |
| `?goto=boss&cab=plumber` | Boss fight for Plumber Panic |
| `?goto=overtime` | Endless overtime mode |

**Modifiers (append to stage/boss/overtime URLs):**

| Param | Values | Effect |
|---|---|---|
| `&hero=X` | `lorenzo`, `gnash`, `fernwick`, `b33p`, `mochi`, `chompo`, `raymn`, `grumpos` | Start as this hero |
| `&invuln` | (flag) | God mode — never die |
| `&autoexit` | (flag) | Skip results screen, return to title on end |
| `&time=N` | seconds (e.g. `10`) | Auto-finish the run after N seconds |

All modifiers compose. Example — hands-off verification of stage 1 as B-33P
for 15 seconds, god mode, no results screen:

```
http://localhost:8001/?fps&mute&goto=stage&cab=plumber&stage=plumber-1&hero=b33p&invuln&time=15&autoexit
```

After the `?goto` routes, press Enter once or twice to dismiss the briefing
screen. The run starts immediately after.

## Reaching common surfaces

**Prefer the dev URL shortcuts above.** They skip all manual navigation.
If you must navigate from the hub manually:

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
