# Tap-to-read the stall menus, and a wok that is only three-quarters shut

Spec for recreating on `main`. Written 11 Oct 2026.

## Why this is a spec and not a merge

The branch this was built on (`claude/level-editor-config-x14voq`) and `origin/main`
have **no common ancestor** — different root commits, 263 commits against 76,
`git merge-base` returns nothing. A merge would be `--allow-unrelated-histories`
with a conflict in every shared file. Nothing here should be cherry-picked; it
should be rebuilt against main's own code, which is further along.

In particular: **main already has the food stalls.** `src/sprites/stalls.js`
has WOK THIS WAY and SMOOTHIE OPERATOR standing in the gaps of the cabinet bank,
a neon fascia, a roller shutter, a chiller, five blenders, and a seven-row
smoothie menu drawn fresh on every visit from thirty-odd 80s-song puns. The
branch work was a parallel reinvention of that, built without reading main
first. It has been deleted — **this document is the only thing left of it**, and
it is self-contained: every value it asks you to use is written out below.

Everything below is written against main's files as of `69d03d3`.

---

## What main already has (do not rebuild)

| Thing | Where |
| --- | --- |
| `STALLS` — SMOOTHIE OPERATOR (`open: true`), WOK THIS WAY (`open: false`) | `src/sprites/stalls.js:59` |
| `drawFoodStall(ctx, cx, floorY, stall, { t, lit, width, menu })` | `stalls.js:198` |
| The roller shutter, slats and bottom rail | `stalls.js:225` (the `!stall.open` branch) |
| The menu board: 7 rows, bottom line struck and given away FREE!! | `stalls.js:237` |
| `pickSmoothieMenu()` — six picks plus one dud, no repeated fruit word | `stalls.js:557` |
| `UNIT_FASCIA_TOP = 66`, `UNIT_FASCIA_H = 19`, exported for hit-testing | `stalls.js:17` |
| `counterSignHit()` — tapping Dolores's/Gary's fascia opens the counter | `hub/index.js:592` |
| `this.stalls`, placed at cabinet indices 2 and 5 | `hub/index.js:1839` |
| `drawPosterZoom` — tap a poster, it grows off the wall to full frame | `hub/index.js:4341` |

The stalls are currently **decorative**: nothing in the hub hit-tests them.

---

## Change 1 — tap a stall menu and hold it up to read

### Why

The smoothie board is the best writing in the room and nobody has ever read it.
It sets at `ms = 0.38` in a box `iw - 8` wide (96px on a 112-wide stall), which
is about 1.6 logical px of cap height — under a millimetre on a handset, a grey
smear on a monitor. `pickSmoothieMenu()` reshuffles it every time you walk in,
so there is a different joke on the wall on every visit and the player has never
seen one of them.

The poster read already establishes the gesture and the register: tap it, it
grows out of its own place on the wall, straightens, comes up to full light,
"CLICK OR ESC TO CLOSE". This is that, for the two boards that need it more.

### The one rule that makes it work

A panel painted as *fractions of the fixture it sits in* cannot be zoomed —
paint it four times the size and the type ceiling is still the number that was
tuned for the small one, so the rows come out the same size and the gesture does
nothing. Before anything else:

**Extract the menu board out of `drawFoodStall` into a function that takes its
own rect, and express every magnitude inside as a fraction of that rect.**

```js
// stalls.js
export function paintStallMenu(ctx, x, y, w, h, { menu, stall, seed = 0 }) { … }
```

`drawFoodStall` then calls it with `mb` (`{ x: ix + 4, y: iy + 4, w: iw - 8, h: 45.5 }`);
the zoom calls it with most of the frame. Same function, same object, two sizes.

Specifically, these all have to stop being constants:

| Currently | Becomes |
| --- | --- |
| `const ms = 0.38` | a measure fit under a cap that scales: `cap = w / 150`, then `ms = Math.min(cap, room / textWidth(longest, 1, 'bold'))` |
| `const pitch = 5.5` | `h / (rows.length + 1.3)` — or keep a `pitch` fraction of `h` |
| `0.55` strike width, `0.4` FREE!! scale, `0.26` small-print scale | all `× (ms / 0.38)` so they ride the type |
| `mb.x + 4`, `mb.w - 12`, `-26`, `-5`, `-3` insets | fractions of `w` |

`w / 150` gives `0.38` at the shipped 96-wide board when the measure does not
bind first, and about `1.5` at a 220-wide zoom. Pick the divisor against the
board as shipped so nothing on the wall moves.

Sanity check before going further: screenshot the stall before and after the
extraction and confirm it is pixel-identical. (It was, in the prototype, for the
equivalent refactor of Dolores's board.)

### The hub side

Reuse the poster machinery rather than building a second overlay — it already
pauses the room, swallows every input as "done reading", and hides the touch
walk buttons.

1. Tag the existing poster read so the overlay can carry two kinds:
   `this.poster = { kind: 'poster', station, t: 0, ...posterLook(x) }` at
   `hub/index.js:2686`.

2. In the tap handler, right after the poster block, test the stall boards.
   Hang the rect off one exported helper so the tap target and the thing that
   opens can never be different objects:

   ```js
   // stalls.js — the readable half of a unit, relative to its centre
   export function stallBoardRect(cx) { … }   // fascia top through board bottom
   ```

   ```js
   const tappedStall = (this.stalls || []).find((st) => {
     if (!st.stall.open) return false;              // see Change 2
     const r = stallBoardRect(st.x);
     return pwx >= r.x && pwx <= r.x + r.w && pwy >= r.y && pwy <= r.y + r.h;
   });
   if (tappedStall) {
     this.poster = { kind: 'stall', stall: tappedStall, t: 0 };
     Audio.sfx('uiConfirm');
     Input.endFrame();
     return;
   }
   ```

   The band is safe: it holds nothing else tappable and no floor to walk to.
   Check it does not collide with `counterSignHit` — the counters sit on the
   same fascia band, so the stall test must only match `this.stalls`, never a
   station.

3. Dispatch at `hub/index.js:4126`:
   ```js
   if (this.poster) {
     if (this.poster.kind === 'stall') this.drawStallZoom(ctx); else this.drawPosterZoom(ctx);
     return;
   }
   ```

4. `drawStallZoom(ctx)` — copy `drawPosterZoom` and change what it paints.
   Everything that matters is already in that method: the `0.22s` ease, the
   `rgba(6,4,12,0.95)` backdrop, the lerp from the fixture's own screen position
   to the middle of the frame, the close hint. Replace `drawPoster` with
   `paintStallMenu` (plus `neonFascia` above it, so the board you are holding up
   says whose board it is), and size it:

   ```js
   const DST_H = 228, DST_W = DST_H * (r.w / r.h);
   ```

   Height is the binding dimension; take the width from the rect's own aspect
   rather than choosing it, or the board distorts.

   Pass the live menu: `this.smoothieMenu`, not a re-pick — the board you tapped
   is the board you read.

5. Touch legend at the `'TAP TO WALK, TAP AGAIN TO ENTER, A POSTER TO READ'`
   string: make it name menus too. `'TAP TO WALK OR ENTER. A POSTER OR A MENU TO READ'`
   fits the same measure.

### Phone

Worth deciding deliberately rather than discovering. At `0.38` on a 96-wide
board the rows are ~0.65mm of cap on a handset — half the ~1.3mm floor the
credits screen established. Three options, in preference order:

1. **Leave the wall board as is and let the read carry it.** Simplest, and the
   board is legible *as a board* even when the words are not. The legend change
   above is then doing real work: it is the only thing telling a phone player
   there is something to read.
2. Drop the phone board to three or four rows at a bigger size (what
   `MENU_ROWS_PHONE` does for Dolores's board).
3. Print no rows at all on a phone and let it read as a lit board.

Whichever is chosen, **the zoom must always use the wide telling** — a panel
held up fills the frame on a handset exactly as on a monitor, so a device-keyed
`phoneDressing()` check inside the panel painter will solve a measure problem
the zoom does not have. Give the painter an explicit `telling: 'wide' | 'phone'`
option and have the zoom always pass `'wide'`.

---

## Change 2 — WOK THIS WAY three-quarters shut

Currently `open: false` draws the shutter from `iy` to `floorY`: a flat grey
rectangle, closed and finished. Three-quarters down is a better read, and the
reason is not decoration — a shutter left partway is the posture of a unit that
closed for the night, where a shutter all the way down is one that was cleared
out. It also buys a strip of interior to put something in.

1. Replace the boolean with an amount. Keep `open` for the trading/not-trading
   branch and add `shut` for how far the roller came down:

   ```js
   { name: 'WOK THIS WAY', box: '#c83a2e', ink: '#ffffff', open: false, shut: 0.75 },
   ```

   Default `shut` to `1` so anything else that is `open: false` is unchanged.

2. In the `!stall.open` branch of `drawFoodStall`, draw in this order:

   - **The interior first**, floor to lintel: near-black, `#0a0810`.
   - **The warm pool**, a vertical gradient over the interior, brightest at the
     sill and gone by the time it reaches the roller. The values that worked:
     `rgba(246,168,60,0.50)` at the bottom → `0.26` at `0.28` → `0.04` at `0.72`
     → `0` at the top. It is a heat lamp nobody switched off, and it reads as
     light coming out of a depth rather than a warm panel bolted behind a hole.
   - **The filament**, a hot horizontal line just inside the top of the gap —
     `rgba(255,214,140,0.85)`, about 3% of the opening's height, 64% of its
     width. A heat lamp is a line, not a bulb.
   - **The roller** over the top of all that, down `shut` of the opening: the
     existing slats, with the bottom rail moved to the roller's leading edge
     instead of the floor.
   - The existing surround and `shadeWall` last.

3. Optionally give the sill a pale slab across the opening. In the prototype this
   was the single most load-bearing shape on the whole unit: without it the
   opening read as a dark window in a wall, with it the thing read as somewhere
   food was handed over. Main's open stall already has its counter
   (`floorY - 26`), so match that height and the two units line up.

4. The wok has no menu on main. If one is wanted, it hangs on the fascia *above*
   the shutter — a menu stays up when a unit shuts, which is the whole reason
   this is readable at all. Copy that was written for it, take it or leave it:

   ```
   COMBO 1 …… 3 PLUGS
   COMBO 2 …… 5 PLUGS      (struck through)
   COMBO 3 …… 3 PLUGS      ("IS COMBO 1" in marker above it)
   EXTRA SAUCE … 4 PLUGS   (more than the meal)
   ```

   If it gets one, it joins Change 1's hit test and the `!st.stall.open` guard
   there comes out.

---

## Dead ends, recorded so nobody walks into them twice

- **`hubWallBays` / `drawWallBay` / `WALL_DRESSINGS` as a home for these.** They
  still exist in `backwall.js`, but main's hub stopped calling them — the only
  consumers left are `src/dev/foodcourt-candidates.js`, `src/game/intro.js` and
  `tools/render-social.js`. Hanging a stall off the bay system looks right and
  puts it in a subsystem the food court no longer uses. The stalls are their own
  module; keep them there.
- **A second set of unit painters.** The deleted branch grew `UNIT_SPECS`,
  `paintUnitPlate` and `paintMenuPanel` alongside `stalls.js` doing the same job
  better. Everything in Change 1 is an edit to `drawFoodStall`, not a sibling of
  it.
- **Renaming the stalls.** The deleted work called the smoothie bar BLENDERELLA.
  SMOOTHIE OPERATOR is the better name and has the better menu behind it.

---

## Verifying it

`npm run dev`, then drive `http://localhost:8001/?mute&goto=hub` with Playwright
(see `.claude/skills/verify`). Chromium is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; pass `executablePath`,
the cached Playwright is a different build and will tell you to reinstall.

Park the hero by assigning `window.__mash_cur.px` directly rather than walking,
and null `talk` on an interval or a passing hero's speech card covers the board.

Five things to check:

1. Tapping the smoothie board opens the read, and the rows are set type.
2. Tapping the wok (if it gets a board) opens its own.
3. A cabinet poster still zooms — `poster.kind === 'poster'`.
4. Tapping Dolores's fascia still opens her counter, i.e. `counterSignHit`
   still wins on the band it shares with the stalls. This is the one real
   regression risk in the whole change.
5. A tap on open floor still walks.

`npm test` is 88 suites and takes about seven minutes; none of them render, so
it will not catch a layout mistake — the screenshots are the verification.
