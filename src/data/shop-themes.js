// The shop counter's music: the one the game plays, and the parked candidates it
// was chosen from.
//
// The songs themselves are one file each in src/data/songs/ — this is only the
// registry that groups them, which is what the audition render tools and the shop
// menu walk. It used to BUILD the songs, out of a `counterPair` factory that turned
// one set of notes into a dolores/gary pair; they are written out individually now,
// so editing one changes only that one.
import { SONGS } from './songs/index.js';

const bankOf = (id) => SONGS[id].bank;
// A candidate pair — the same tune played by both counter staff, one file each.
const pair = (id, name) => ({ id, name, dolores: bankOf(`${id}-dolores`), gary: bankOf(`${id}-gary`) });
const variant = (id) => ({ id, name: SONGS[id].title, bank: bankOf(id) });

export const SHOP_THEME_CANDIDATES = [
  pair("checkout-promenade", "CHECKOUT PROMENADE"),
  pair("receipt-printer-rhumba", "RECEIPT PRINTER RHUMBA"),
  pair("after-hours-layaway", "AFTER-HOURS LAYAWAY"),
];

export const SHOP_THEME_RETAIL_JAZZ_CANDIDATES = [
  pair("basket-bounce", "BASKET BOUNCE"),
  pair("coupon-carousel", "COUPON CAROUSEL"),
  pair("service-bell-stroll", "SERVICE BELL STROLL"),
];

export const SHOP_THEME_ORGAN_VARIANTS = [
  variant("checkout-promenade-gary-organ"),
  variant("after-hours-layaway-dolores-organ"),
  variant("after-hours-layaway-gary-organ"),
];

export const SHOP_THEME_BRIGHT_ORGAN_VARIANTS = [
  variant("checkout-promenade-dolores-bright-organ"),
  variant("checkout-promenade-gary-bright-organ"),
];

export const SHOP_THEME_DANCE_MIX_VARIANTS = [
  variant("checkout-promenade-gary-bright-organ-dance-mix"),
];

export const SHOP_THEME_LAYAWAY_V2_VARIANTS = [
  variant("after-hours-layaway-dolores-v2"),
  variant("after-hours-layaway-gary-v2"),
];

// What the shop actually plays. Its own song now: this used to be a pointer straight
// at the dance-mix audition's bank, so the two ids shared one object and only one of
// their mixes could ever apply.
export const COUNTER_DANCE_MIX_THEME = SONGS.shop.bank;

export const SHOP_THEME_BY_ID = Object.fromEntries(
  ["checkout-promenade-dolores","checkout-promenade-gary","receipt-printer-rhumba-dolores","receipt-printer-rhumba-gary","after-hours-layaway-dolores","after-hours-layaway-gary","basket-bounce-dolores","basket-bounce-gary","coupon-carousel-dolores","coupon-carousel-gary","service-bell-stroll-dolores","service-bell-stroll-gary","checkout-promenade-gary-organ","after-hours-layaway-dolores-organ","after-hours-layaway-gary-organ","checkout-promenade-dolores-bright-organ","checkout-promenade-gary-bright-organ","checkout-promenade-gary-bright-organ-dance-mix","after-hours-layaway-dolores-v2","after-hours-layaway-gary-v2"].map((id) => [id, bankOf(id)]),
);
