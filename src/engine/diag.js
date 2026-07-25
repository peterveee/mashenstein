// Diagnostic overrides that survive a reload.
//
// The switches used to measure a device — ?fps, ?bench, ?renderer= — are query
// parameters, which assumes an address bar to type them into. An installed PWA
// has none, and iPhone is playable ONLY once installed (gate.js enforces that),
// so the one platform whose numbers are hardest to get is also the one where
// the instruments cannot be reached. Everything here exists to close that gap:
// the portrait screen offers the same switches behind a hidden gesture, stores
// the choice here, and boot reads it exactly as it reads the query string.
//
// Storage can throw rather than merely fail — Safari private browsing has
// historically thrown on setItem — so every access is guarded. A device that
// cannot store diagnostics still plays the game; it just cannot be measured.
const KEY = 'mash_diag';

export function readDiag() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function writeDiag(patch) {
  const next = { ...readDiag(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    /* unstorable: the caller's reload will simply find nothing set */
  }
  return next;
}

export function clearDiag() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* nothing to clear */
  }
}
