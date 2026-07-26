// Shared track-id resolution for the offline render tools, so render-track.js,
// render-stems.js and render-midi.js can never disagree about what "megamix"
// or "shop" means.
import {
  CABINET_BY_ID, HUB_THEME, TITLE_THEME, FINALE_THEME,
} from '../../src/data/cabinets.js';
import { SHOP_THEME_BY_ID, COUNTER_DANCE_MIX_THEME } from '../../src/data/shop-themes.js';
import { MEGAMIX_THEME } from '../../src/data/megamix.js';

// Friendly aliases for the two named themes plus the in-game shop theme. "shop"
// resolves to COUNTER_DANCE_MIX_THEME — the Peter-approved bank both counters
// actually play — rather than one of the parked audition candidates.
const ALIASES = {
  hub: { bank: HUB_THEME, slug: 'food-court', title: 'THE FOOD COURT' },
  title: { bank: TITLE_THEME, slug: 'title-theme', title: 'EMPTY ARCADE' },
  finale: { bank: FINALE_THEME, slug: 'finale-theme', title: 'ONE MORE SWITCH' },
  megamix: { bank: MEGAMIX_THEME, slug: 'megamix', title: 'MONSTER MEGAMIX' },
  shop: { bank: COUNTER_DANCE_MIX_THEME, slug: 'shop-theme', title: 'CHECKOUT PROMENADE' },
};

export function resolveTrack(trackId) {
  if (ALIASES[trackId]) return { id: trackId, ...ALIASES[trackId] };
  if (SHOP_THEME_BY_ID[trackId]) {
    return { id: trackId, bank: SHOP_THEME_BY_ID[trackId], slug: trackId, title: trackId.toUpperCase() };
  }
  const cabinet = CABINET_BY_ID[trackId];
  if (cabinet && cabinet.music) {
    return { id: trackId, bank: cabinet.music, slug: `${trackId}-panic`, title: (cabinet.name || trackId).toUpperCase() };
  }
  return null;
}

export function resolveOrExit(trackId) {
  const track = resolveTrack(trackId);
  if (!track) {
    console.error(`unknown track "${trackId}" — try one of: ${Object.keys(ALIASES).join(', ')}, a cabinet id, or a shop-theme id`);
    process.exit(1);
  }
  return track;
}
