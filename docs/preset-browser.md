# Preset browsing

The track selector and preset library share Category → Subcategory → Engine → Preset
facets. Search intersects the selected filters; it never silently switches engines.
Opening an existing track starts in its current sound’s category, with all subcategories
and engines and an empty search. New tracks start with all categories. Clicking a
preset applies it immediately and keeps the selector open, preserving filters for
comparison. After adding a track, further choices replace that same track’s sound.
Every result names its engine. The track selector has a compact Show current preset
action instead of repeating the preset and engine in its header. Narrow browser regions use
compact selectors above the results; the Desk's existing minimum window size remains.

## Classification and compatibility

- `src/data/preset-browsing.js` defines the taxonomy and the fallback for older/user
  presets. `browse: { category, subcategory }` is optional saved metadata, independent
  of the legacy `category` field used for playback and percussion compatibility.
- `src/data/preset-browsing-catalog.js` files factory preset IDs explicitly. Add new
  factory IDs here; tests flag missing or stale entries. Renaming a factory preset
  cannot change its filing. Explicit saved `browse` metadata takes precedence.
- Saving or duplicating through the voice editor carries browsing metadata. The save
  sheet edits Category and Subcategory without changing the playback category.
- Each host still supplies its own eligible presets and selection handlers. Filtering
  does not select, edit, or audition a sound. Song snapshots and preset IDs are unchanged.

## Windows and keyboard

Opening, clicking, or focusing the selector, library, or Advanced editor brings that
window forward. The previous front window stays immediately behind it. The bounded
window stack remains below save dialogs and dropdowns. Clicking Advanced does not
dismiss an open selector; clicking elsewhere on the Desk retains the usual dismissal.

Tab moves between filter/result groups. Arrow keys, Home, and End navigate within a
list; Enter or Space selects. Escape dismisses the browser (or clears an active search
first). The current-preset button reveals its row, clearing filters when necessary.

## Verification

Run `node tests/preset-browser.js` for catalogue coverage, filter intersections,
reconciliation, legacy/saved metadata, unchanged playback data, and window ordering.
`node tests/voice-source.js` exercises source round-trips; `node tests/voice-edit.js`
and `node tests/synth-full-layout.js` cover the existing editor/audio paths.

With `npm run mixer` running, opt-in browser checks are:

```sh
node tests/preset-browser-ui.js
node tests/preset-window-stack-ui.js
```

Set `MASH_PRESET_TEST_URL` to test another local mixer URL. These use an isolated browser,
never save presets or songs, and write screenshots under `work/mockups/preset-browser/`.
They cover selection/undo, drum eligibility, keyboard navigation, audition, save-sheet
controls, compact filters, filtering during playback, and overlapping window activation.
Playback checks establish functioning audio scheduling, not listening acceptance.

Processing-cost ratings, genre, ratings, and favourites are not part of this version.
