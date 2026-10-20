// THE GLITCH LOG: audio trouble and frame trouble on ONE timeline (Peter, 20 Oct 2026:
// "do we track when audio is glitching in the game? ... is audio causing graphics to
// glitch and vice versa?").
//
// The FPS readout already measures both halves once a second (main.js sampleAudioHealth,
// loop.js frameHealth), but only while it is on screen, and it keeps no history — so on
// the iPad, where it matters, nothing said which went first. This keeps every second in
// which either went wrong, side by side, with where in the game it was:
//
//   61.0s C0.86 M-41/3 F9/112 crypt-2 bar41 D2.5 SYNTH PHONE
//
//   C   the audio clock against the wall clock (below ~0.95: the audio thread is not
//       finishing its work in time — crackle)
//   M   the sequencer's worst queue margin in ms / passes that found nothing queued
//       (negative or late: the MAIN thread starved the transport — holes)
//   F   frames lost in that second / its longest frame in ms
//
// Read in order: a run of F before the first C or M is graphics dragging the audio
// down; C first is the synths over budget; M with a clean C is a busy main thread.
//
// Kept a few sessions deep in localStorage, written at most every few seconds and only
// when something has been logged — never per frame. Read back with the crash trail
// (ABOUT > CRASH LOG > SEND, and a dev build's boot upload to work/local/crash-trail.txt).

const KEY = 'mash_glitches';
const SESSIONS = 4;
const ROWS = 600;   // ten minutes of a struggling run, about 40 KB
const WRITE_EVERY_MS = 8000;
// What counts as a bad second.
export const GLITCH = Object.freeze({ clock: 0.95, framesLost: 6, frameMs: 100 });

let store = null;
let session = null;
let dirty = false;
let lastWrite = 0;
let context = () => '';
let onFirst = null;
let lastBadAt = 0;

function load() {
  if (store) return store;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    const parsed = raw ? JSON.parse(raw) : null;
    store = parsed && Array.isArray(parsed.sessions) ? parsed : { sessions: [] };
  } catch (e) {
    store = { sessions: [] };
  }
  return store;
}

function save(force = false) {
  if (!dirty || !session) return;
  const now = Date.now();
  if (!force && now - lastWrite < WRITE_EVERY_MS) return;
  lastWrite = now;
  dirty = false;
  try {
    localStorage.setItem(KEY, JSON.stringify(load()));
  } catch (e) {
    /* unstorable: the log is lost, the game plays on */
  }
}

/**
 * Open this boot's session. `where()` returns a short description of where the game is
 * (stage, bar, density, synth tier) for each logged second; `first(line)` is called on a
 * bad second that follows a clean stretch, for the crash trail. Once per page load.
 */
export function startGlitchSession({ build = '', where = null, first = null } = {}) {
  if (session) return;
  try {
    const s = load();
    session = { at: Date.now(), build: String(build).slice(0, 40), rows: [], seconds: 0, bad: 0 };
    s.sessions.push(session);
    while (s.sessions.length > SESSIONS) s.sessions.shift();
    dirty = true;
    save(true);
    if (typeof where === 'function') context = where;
    if (typeof first === 'function') onFirst = first;
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('pagehide', () => save(true));
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
    }
  } catch (e) {
    session = null;
  }
}

/**
 * One second's health. `clock` is the audio/wall clock ratio, `margin` the worst queue
 * margin in ms (null when nothing played), `late` the starved passes, `framesLost` and
 * `frameMs` the frame window's. Logs the second only when something in it went wrong.
 */
export function noteSecond({ clock, margin = null, late = 0, framesLost = 0, frameMs = 0 }) {
  if (!session) return;
  try {
    session.seconds++;
    const crackle = Number.isFinite(clock) && clock > 0 && clock < GLITCH.clock;
    const holes = late > 0 || (Number.isFinite(margin) && margin < 0);
    const frames = framesLost >= GLITCH.framesLost || frameMs >= GLITCH.frameMs;
    if (!crackle && !holes && !frames) return;
    const t = Math.round((Date.now() - session.at) / 100) / 10;
    const line = `C${(clock || 0).toFixed(2)} ${margin == null ? 'M-' : `M${margin}/${late}`} F${framesLost}/${Math.round(frameMs)}`
      + `${crackle ? ' CRACKLE' : ''}${holes ? ' HOLES' : ''}${frames ? ' FRAMES' : ''}`;
    let where = '';
    try { where = String(context() || '').slice(0, 80); } catch (e) { where = ''; }
    session.rows.push([t, line, where]);
    session.bad++;
    if (session.rows.length > ROWS) session.rows.splice(0, session.rows.length - ROWS);
    dirty = true;
    // The first bad second after a clean stretch goes on the crash trail too, so a page
    // the OS kills mid-struggle shows the struggle beside its last steps.
    const now = Date.now();
    const firstOfRun = now - lastBadAt > 5000;
    if (onFirst && firstOfRun) onFirst(`${line} ${where}`);
    lastBadAt = now;
    // The first of a run is written at once, so a page killed straight after still has it.
    save(firstOfRun);
  } catch (e) {
    /* a diagnostic must never be the reason the game stops */
  }
}

/** Write now (the page is going away). */
export function flushGlitches() { save(true); }

/** The log as text, newest session last. */
export function glitchReport() {
  const out = [];
  for (const s of load().sessions) {
    out.push(`== GLITCHES ${new Date(s.at).toISOString()} ${s.build || ''} — ${s.bad || 0} bad of ${s.seconds || 0} seconds`);
    for (const [t, line, where] of s.rows || []) out.push(`${t}s ${line} ${where}`.trim());
  }
  return out.join('\n') || 'no glitch log yet';
}

/** For tests: forget everything held in memory. */
export const __glitchTesting = { reset() { store = null; session = null; dirty = false; lastWrite = 0; lastBadAt = 0; } };
