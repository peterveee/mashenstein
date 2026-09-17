# mashenstein.com

Three hand-written files — `index.html`, `style.css`, `site.js` — that the build
welds into **one self-contained page**.

```
node tools/build-site.js                     # -> work/site/index.html
python3 -m http.server -d work/site 8020     # -> http://localhost:8020
```

Deploying is copying `work/site/index.html` to wherever the domain points. It is
about 53 KB, has no build step of its own, and fetches exactly one thing from
the network: the three Google faces the game itself loads.

## Zero bitmaps

There is not a raster image on the page. The game synthesizes all of its own art
and ships no asset files, and the site holds the same line — everything is SVG
or CSS:

- **The sign** is a *measurement* of the game's title screen, not a copy of it.
  The build runs the game's own text engine headless (`textWidth` for the
  advances, `drawTextCentered` for the ink), reads back where every glyph and
  every cross-stitch lands in the logical 480-wide frame, and emits that as SVG.
  Change the face, the tracking or `TITLE_SCALE` and re-run — the website's sign
  moves with the game's. The cord hangs off the anchor the type engine actually
  measured, so it can never end up dangling in mid air.
- **The starfield** is `drawRetainedTitleBase`'s sky and
  `drawRetainedTitleStars`' ninety stars, which are pure arithmetic, computed at
  build time and written out as gradients and circles.
- **The trailer** shows its own INSERT COIN card, set as type rather than
  fetched as a thumbnail, and only loads YouTube when somebody clicks it.

It costs one thing: **no link-preview image**. `og:image` is fetched by URL by
Facebook, iMessage, Slack, WhatsApp and X, and all of them ignore an SVG and a
`data:` URI alike. `node tools/build-site.js --og` writes a 1200×630 `og.png`
beside the page and switches the meta tags back on. That is the one deliberate
exception, and it is off by default.

## The PLAY link

One place: the `data-play-url` attribute on `<body>`. While it is empty, every
PLAY button renders greyed with a COMING SOON pill and refuses to be clicked.
Paste a URL in and all of them become real links.

## Switched-off sections

`SECTIONS` in `tools/build-site.js` hides THE RELAY, NINE CABINETS and
MANAGEMENT & STAFF. Their writing is kept in `index.html`. MANAGEMENT has no
pictures and can simply come back; the other two lost theirs to the zero-bitmap
rule — a hero comes out of `drawToon` and a cabinet out of `render-social.js`,
and both are canvas painters — so turning them back on gives text-only cards
until there is vector art for them.

## Copy

The blurb, the cast lines and Eggshell's grievances are the game's own, from
`docs/GAME_BIBLE.md`, `src/data/heroes.js` and `EGGSHELL_TAUNTS` in
`src/data/jokes.js`. They are duplicated here rather than generated, because
marketing copy wants writing and not a stat string — so if a hero is recast or a
character redesigned, this page is one of the surfaces that has to be told.
`site.js` keeps its taunt list in one labelled block for that reason.
