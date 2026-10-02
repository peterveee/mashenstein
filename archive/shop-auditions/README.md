# Shop theme auditions (archived 2 Oct 2026)

The candidates the shop counter's music was chosen from. The shop plays
`src/data/songs/shop.js`; nothing here is loaded by the game, the desk, the render
tools or the tests, so global changes stop having to carry these twenty songs.

- `songs/`: the twenty song files as they last stood in `src/data/songs/`:
  Checkout Promenade, Receipt Printer Rhumba, After-Hours Layaway, Basket Bounce,
  Coupon Carousel and Service Bell Stroll, Dolores and Gary each, plus the organ,
  bright-organ, dance-mix and v2 variants.
- `tools/`: the `render-shop-*-auditions.js` scripts that bounced them. They import
  the old `SHOP_THEME_*` registry, which is gone, so they do not run from here.

To bring one back, move its file into `src/data/songs/` and regenerate the index
(`writeSongsIndex` in `tools/lib/songs-index.js`). To list it on the desk again it
also needs an entry in `src/data/tracks.js` — each file still says
`group = "audition"`, the heading they used to sit under. For the registry the render tools
used (`SHOP_THEME_CANDIDATES` and friends) and the audition half of
`tests/shop-themes.js`, see `src/data/shop-themes.js` and `tests/shop-themes.js` in
git history before this move.
