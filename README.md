# MASHENSTEIN: THE UNPLUGGENING

*A game stitched together from parts of other games.*

Don K. Eggshell, PhD — a giant egg-shaped ape with a magnificent red mustache,
tiny science goggles, and a spiky shell — has unplugged the arcade's master
power strip after losing to heroes for 40 straight years. Due to budget cuts,
the arcade can only render ONE hero at a time, so eight parody heroes must
relay-run through nine dying cabinets to reach THE SOCKET.

Everything is procedural — vector characters and props, pixel-influenced worlds,
chiptune music, and sound effects. No external art or audio assets and no runtime
dependencies. The built game is one self-contained HTML file that works offline
from `file://`.

## Play

Play the latest version at **https://peterveee.github.io/mashenstein/**.

To run it locally:

```
npm install        # once (esbuild only, dev-time)
npm run build      # writes dist/index.html and dist/v1/index.html
open dist/index.html
```

Or `npm run dev` for a watch + local server loop.

For phone testing on your LAN: `python3 -m http.server -d dist` and open
`http://<your-ip>:8000/`.

### On an iPhone

Safari has no Fullscreen API, so a phone loses about a third of the screen to
its toolbars. The only true fullscreen iOS offers is the Home Screen, and the
first load on an iPhone says so: a card walks through Share → Add to Home
Screen, points at whichever end of the screen Safari's toolbar is currently
living at, and does not ask more than three times. iPad and desktop never see
it (`src/engine/install-prompt.js`).

An installed copy keeps itself current. `dist/sw.js` fetches the page
network-first with `cache: 'no-store'`, because a Home Screen launch will
otherwise happily reopen a build from weeks ago and GitHub Pages gives us no
cache headers to argue with. The cache is only ever the offline fallback.

The Home Screen icon is Lorenzo, rendered from the game's own vector painter
rather than exported by hand: `node tools/render-icon.js` rewrites
`build/icons/icon-{180,192,512}.png` and the build copies them into `dist/`
beside a web manifest. Re-run it if the cast's look changes.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Jump (hold = higher) | Space / W / Up | Tap (or swipe up) |
| Duck | S / Down (hold) | Swipe down (hold) |
| Hero power | Right / D (X / Shift also work) | PWR button |
| Pause / quit | P / Esc (Esc again quits) | ▐▐ icon |
| Mute | M | speaker icon |
| Menus | Arrows + Enter | Tap |
| Debug overlay | ` (backtick) | — |

TURDLE is typed on a keyboard or tapped on the on-screen keys. The turtle is
patient. The turtle is not impressed.

## The game

- **9 arcade cabinets**, 3 stages each, across 3 acts — each cabinet a different
  genre parody in a different visual style (pixel, faux-3D, neon vector,
  watercolor, VHS, LCD handheld, cardboard, notebook doodle; THE SURGE mashes
  all eight). The heroes are procedural vector toons, composited pin-sharp over
  every cabinet's deliberately low-resolution, pixel-influenced world.
- **8 heroes** with distinct kits (stomp/smash, spin-dash, finite shield-roll,
  pellet cannon, cosmic squish, hazard bite, rocket fist, returning axe). The
  full cast rotates through co-op cable portals automatically, and every
  third switch fires a screen-clearing Relay Blast on its own.
- **Missions & plugs:** reach / targets / fragile fuse / chase / relay combo /
  cord recovery / blackout / rescue / escape. Each stage awards up to 3 plugs
  (mission, challenge, hidden GOLDEN APPLIANCE — it is a toaster). Plugs unlock
  cabinets, acts, the finale, and one door you did not see.
- **Breaker-box minigames** power on each cabinet: BLOCK SURGE (MASH-ominoes),
  REWIRE, CODE INJECT, PADDLE WAR, MASH INVADERS, BRICK BONK, TURDLE. All
  replayable in the hub's arcade corner.
- **Progression:** DOLORES' REPAIR COUNTER (power-up levels, relay upgrades), Hero
  Mastery (sidegrades with comic drawbacks), and Cabinet Mods from GARY'S
  LEGALLY DISTINCT PAWN SHOP.
- **Bosses** at the end of each act, fought with runner verbs only. Some health
  bars are labeled PRESENTATION ERROR.
- **Difficulty:** five modes. The first four are — verifiably, by automated
  test — identical and forgiving. UNPLUGGED is real, and a mistake.
- **After the finale:** OVERTIME, an endless one-hit mode with daily seeds, plus
  corrupted stage modifiers for cleared cabinets.

## Development

```
npm test           # migration, difficulty-identity, bot-plays-a-stage,
                   # minigames, bosses, full-flow smoke, fairness + economy sims
npm run sim        # fairness sim only (SEEDS=500 npm run sim for bigger batches)
```

The fairness sim generates obstacle streams through the real spawner across
every cabinet × speed tier × seed batch and asserts that every action-required
obstacle leaves at least worst-case-airtime + reaction-floor of runway. The
difficulty-identity test asserts modes 1–4 resolve to byte-identical gameplay
configs (the joke is load-bearing).

Layout: `src/engine/` (loop, renderer, style packs, sprites, input, audio, rng,
save), `src/game/` (run, relay, spawner, bosses, minigames, hub, menus),
`src/data/` (heroes, cabinets, stages, dialogue, jokes, progression, words),
`src/sprites/` (the active procedural toon renderer in `toons.js`, vector props,
and legacy/string-grid pixel sources for world art and palettes). `build/build.js`
bundles and inlines everything into `dist/index.html` and also writes the first
archived release to `dist/v1/index.html` for GitHub Pages versioned routing.
