// The shop counter's music.
//
// The candidates it was chosen from — Checkout Promenade, Receipt Printer Rhumba,
// After-Hours Layaway and the retail-jazz, organ, bright-organ, dance-mix and v2
// variants — were moved to archive/shop-auditions/ on 2 Oct 2026, with the tools that
// rendered them, so global changes and tests stop walking twenty songs nobody ships.
// See archive/shop-auditions/README.md to bring one back.
import { SONGS } from './songs/index.js';

// What the shop actually plays. Its own song: this used to be a pointer straight at
// the dance-mix audition's bank, so the two ids shared one object and only one of
// their mixes could ever apply.
export const COUNTER_DANCE_MIX_THEME = SONGS.shop.bank;
