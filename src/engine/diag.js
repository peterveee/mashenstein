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

// A stored benchmark/profile request and its renderer choice belong to one boot only.
// Return the original snapshot so renderer.js can still consume its backend,
// while disarming the benchmark immediately. Once the renderer has initialized,
// releaseBenchRenderer() removes that temporary backend for the next launch.
export function consumeBenchDiag() {
  const diag = readDiag();
  if (diag.bench) {
    writeDiag({ bench: false });
  } else if (diag.renderer && !diag.rendererLock) {
    // Older builds cleared `bench` but stranded its renderer choice forever.
    // The UI has never offered a persistent renderer-only override, so this is
    // unambiguously stale benchmark state and should not survive another boot.
    writeDiag({ renderer: null });
    diag.renderer = null;
  }
  if (diag.titleProfile) writeDiag({ titleProfile: false });
  return diag;
}

export function releaseBenchRenderer(diag) {
  if (diag && diag.bench) writeDiag({ renderer: null, rendererLock: null, density: null });
  if (diag && diag.titleProfileRenderer) {
    writeDiag({ renderer: null, rendererLock: null, density: null, titleProfileRenderer: false });
  }
}

export function forceWebglDensity(n = 3) {
  return writeDiag({ renderer: 'webgl', density: n, rendererLock: true });
}

// Persistent backend-only switches for the portrait menu. Density stays
// adaptive: FORCE 3X GL remains the separate stress button for a fixed 3x
// comparison, while these two buttons answer the simpler question "which
// renderer should ordinary reloads use?".
export function forceRenderer(name) {
  if (name !== '2d' && name !== 'webgl') return readDiag();
  return writeDiag({ renderer: name, density: null, rendererLock: true });
}

export function clearDiag() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    /* nothing to clear */
  }
}
