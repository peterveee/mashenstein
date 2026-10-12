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
  if (diag.gameplayProfile) writeDiag({ gameplayProfile: false });
  return diag;
}

export function releaseBenchRenderer(diag) {
  if (diag && diag.bench) writeDiag({ renderer: null, rendererLock: null, density: null });
  if (diag && diag.titleProfileRenderer) {
    writeDiag({ renderer: null, rendererLock: null, density: null, titleProfileRenderer: false });
  }
  if (diag && diag.gameplayProfileRenderer) {
    writeDiag({ renderer: null, rendererLock: null, density: null, gameplayProfileRenderer: false });
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

// ---- BREADCRUMBS ------------------------------------------------------------------------
// A page the OS kills for memory (iOS reloads it, no error, no sound) leaves nothing behind
// to read, so the trail is written WHILE the game runs: one short line per milestone, into
// localStorage, a few sessions deep. A session that ends without a 'pagehide' line did not
// exit cleanly, and its last line is where it was. Read back from the diagnostics panel
// (five taps on the build stamp → CRASH LOG). Milestones only — nothing here is per frame.
const CRUMB_KEY = 'mash_crumbs';
const CRUMB_SESSIONS = 4;
const CRUMB_LINES = 60;
let session = null;

function readCrumbStore() {
  try {
    const raw = localStorage.getItem(CRUMB_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && Array.isArray(parsed.sessions) ? parsed : { sessions: [] };
  } catch (e) {
    return { sessions: [] };
  }
}

function writeCrumbStore(store) {
  try {
    localStorage.setItem(CRUMB_KEY, JSON.stringify(store));
  } catch (e) {
    /* unstorable: the trail is simply lost, the game plays on */
  }
}

function heapMb() {
  const m = typeof performance !== 'undefined' ? performance.memory : null;
  return m && m.usedJSHeapSize ? Math.round(m.usedJSHeapSize / 1048576) : null;
}

/** Open this boot's session and hook the exits. Once per page load. */
export function startCrumbSession(build = '') {
  if (session || typeof window === 'undefined') return;
  // Booting the game must never depend on the trail: a headless harness with a stub
  // window (no userAgent, no listeners) once failed six suites here. Any throw leaves
  // the game with no trail, never without a boot.
  try {
    const store = readCrumbStore();
    session = { at: Date.now(), build: String(build || '').slice(0, 40), lines: [] };
    store.sessions.push(session);
    while (store.sessions.length > CRUMB_SESSIONS) store.sessions.shift();
    writeCrumbStore(store);
    const listen = (target, type, fn) => { if (typeof target?.addEventListener === 'function') target.addEventListener(type, fn); };
    listen(window, 'error', (e) => crumb('ERROR', `${e?.message || ''} @${String(e?.filename || '').split('/').pop()}:${e?.lineno || 0}`));
    listen(window, 'unhandledrejection', (e) => crumb('REJECTION', String(e?.reason && (e.reason.message || e.reason)).slice(0, 120)));
    listen(window, 'pagehide', () => crumb('pagehide'));
    if (typeof document !== 'undefined') listen(document, 'visibilitychange', () => crumb(document.hidden ? 'hidden' : 'visible'));
    const ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
    crumb('boot', ua.replace(/^Mozilla\/5.0 /, '').slice(0, 80));
    // A DEV BUILD hands the whole trail to the dev server (build/build.js, /__dev/crumbs),
    // so the session a phone just lost can be read on the Mac. Late, so boot is not slowed.
    if (window.__MASH_BUILD__ && typeof setTimeout === 'function') setTimeout(uploadCrumbs, 3000);
  } catch (e) {
    /* no trail this boot */
  }
}

// Dev builds only. The first upload goes to /__dev/crumbs; a dev server started before
// that route existed answers it with the esbuild proxy's 404, and the trail goes through
// the recorder route instead (it keeps a body it cannot convert, under work/video/).
// Once /__dev/crumbs has answered, every new line is sent as it is written.
let liveCrumbs = false;
function uploadCrumbs() {
  if (typeof fetch === 'undefined') return;
  const text = crumbReport();
  fetch('/__dev/crumbs', { method: 'POST', body: text }).then((r) => {
    if (r.ok) { liveCrumbs = true; return; }
    return fetch('/__dev/record?name=crash-trail&ext=webm', { method: 'POST', body: text });
  }).catch(() => { /* no dev server to tell */ });
}

/** One line on the trail. Cheap and never throws. */
export function crumb(tag, detail = '') {
  if (!session) return;
  try {
    const heap = heapMb();
    session.lines.push([Math.round((Date.now() - session.at) / 100) / 10, tag,
      String(detail).slice(0, 120) + (heap ? ` heap=${heap}MB` : '')]);
    if (session.lines.length > CRUMB_LINES) session.lines.splice(1, session.lines.length - CRUMB_LINES);
    const store = readCrumbStore();
    const i = store.sessions.findIndex((x) => x.at === session.at);
    if (i >= 0) store.sessions[i] = session; else store.sessions.push(session);
    writeCrumbStore(store);
    if (liveCrumbs && typeof navigator !== 'undefined' && navigator.sendBeacon) navigator.sendBeacon('/__dev/crumbs', crumbReport());
  } catch (e) {
    /* a diagnostic must never be the reason the game stops */
  }
}

// How a session ended. 'clean' saw a pagehide. 'background' was last seen hidden, which is
// iOS reclaiming an app in the background (or the player swiping it away) — ordinary, not
// a crash. 'crash' stopped while it was on screen: the page was killed mid-play. The
// session still running reads 'live'.
function sessionEnd(s) {
  const lines = s.lines || [];
  if (session && s.at === session.at) return 'live';
  if (lines.some((l) => l[1] === 'pagehide')) return 'clean';
  return lines.length && lines[lines.length - 1][1] === 'hidden' ? 'background' : 'crash';
}
const END_NOTE = { clean: '', live: '  (THIS SESSION)', background: '  (CLOSED IN BACKGROUND)', crash: '  (NO CLEAN EXIT)' };

/** The trail as text, newest session last. A session killed on screen is marked. */
export function crumbReport() {
  const out = [];
  for (const s of readCrumbStore().sessions) {
    const lines = s.lines || [];
    out.push(`== ${new Date(s.at).toISOString()} ${s.build || ''}${END_NOTE[sessionEnd(s)]}`);
    for (const [t, tag, detail] of lines.slice(-CRUMB_LINES)) out.push(`${t}s ${tag} ${detail}`.trim());
  }
  return out.join('\n') || 'no trail yet';
}

/** The newest earlier session that was killed on screen: { at, lines } or null. */
export function lastCrash() {
  const crashes = readCrumbStore().sessions.filter((s) => sessionEnd(s) === 'crash');
  const s = crashes[crashes.length - 1];
  return s ? { at: new Date(s.at), lines: (s.lines || []).map(([t, tag, detail]) => ({ t, tag, detail })) } : null;
}
