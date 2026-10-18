// game-alternates.js (generated, do not edit) holds every song's "alternate"
// take — 8-bit versions, remixes, scrapped transitions — for the dev-only
// GAME ALTERNATES audition menu (src/dev/menus.js). No shipped gameplay reads
// it; only the staff diagnostics panel does. It alone is ~14MB of the boot
// bundle. Its own esbuild entry (build.js, gameAlternates), fetched with a
// <script> tag only when that dev menu is actually opened — see
// loadGameAlternatesModule() in src/dev/menus.js.
import { gameAlternate, GAME_ALTERNATES } from './game-alternates.js';

window.__mash_game_alternates = { gameAlternate, GAME_ALTERNATES };
