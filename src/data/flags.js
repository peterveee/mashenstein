// Experiment flags. Flip the default here, or override per-load with a query
// string (?relay=charge) so both versions can be played back to back.
const params = typeof location !== 'undefined' && location.search
  ? new URLSearchParams(location.search)
  : null;

function pick(name, fallback, allowed) {
  const v = params && params.get(name);
  return v && allowed.includes(v) ? v : fallback;
}

// 'blast'  — every 3rd switch auto-clears the screen (original).
// 'charge' — every 3rd switch banks an empowered ability the player spends.
export const RELAY_MODE = pick('relay', 'charge', ['blast', 'charge']);
