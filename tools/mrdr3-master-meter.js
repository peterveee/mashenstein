// The playground's monitor level: one horizontal fader whose rail is also its meter.
//
// The same control the Song Mixer keeps in its header, and deliberately the same in
// every respect a hand or an eye can tell apart — the fader law, the dB range, the
// meter's scale and its ballistics all match tools/mixer-entry.js. Two desks whose
// meters fall at different rates are two desks you have to learn separately, and the
// numbers here are not the sort of thing worth having a second opinion about.
//
// It is a copy rather than an import because tools/mixer-entry.js is an esbuild entry
// point with no exports at all. What is copied is the arithmetic, which is thirty lines
// and has no state in it; the LOOK is not copied at all — every class below is already
// defined in the desk's stylesheet, which the MRDR-3 shell inlines whole.
//
// The engine is the only thing either surface writes to: `setMasterTrim` for the level,
// `masterLevels()` for the pair of numbers the meter draws.

const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

/**
 * The fader law — position up the travel against dB.
 *
 * Unity three quarters of the way up, six dB above it in the top quarter, and the scale
 * falling away faster the further down you go. Straight lines between them, which is all
 * a printed fader scale is. Identical to the desk's, on purpose.
 */
const FADER_SCALE = [[0, -60], [0.15, -35], [0.3, -20], [0.5, -10], [0.75, 0], [1, 6]];
const FADER_DB_MIN = FADER_SCALE[0][1];
const FADER_DB_MAX = FADER_SCALE[FADER_SCALE.length - 1][1];

export function posToDb(p) {
  const t = clamp(p, 0, 1);
  for (let i = 1; i < FADER_SCALE.length; i++) {
    const [p0, d0] = FADER_SCALE[i - 1];
    const [p1, d1] = FADER_SCALE[i];
    if (t <= p1) return d0 + (d1 - d0) * ((t - p0) / (p1 - p0));
  }
  return FADER_DB_MAX;
}

export function dbToPos(db) {
  const d = clamp(db, FADER_DB_MIN, FADER_DB_MAX);
  for (let i = 1; i < FADER_SCALE.length; i++) {
    const [p0, d0] = FADER_SCALE[i - 1];
    const [p1, d1] = FADER_SCALE[i];
    if (d <= d1) return p0 + (p1 - p0) * ((d - d0) / (d1 - d0));
  }
  return 1;
}

// Meter ballistics, again the desk's. The bar rises instantly and falls at a rate you
// can read; the peak line holds where the loudest moment was, which is the number you
// are actually listening against.
const METER_FALL = 55;        // percent of the scale per second
const PEAK_HOLD = 1400;       // ms the line sits before it starts sliding down
const PEAK_FALL = 30;         // percent per second once it does
const METER_FLOOR = 48;       // dB below reference at which the scale bottoms out

/**
 * Build the control. `root` is the element to put in a toolbar; `applyStored` pushes the
 * remembered level at an engine that has just been created, since the mixer a fresh
 * context builds starts at unity however this fader is sitting.
 */
export function createMasterMeter({ Audio, storageKey = 'mash-mrdr3-master-db' } = {}) {
  // Absent reads as 0 dB, which is where a monitor fader should open. A privacy mode that
  // refuses storage outright throws rather than returning null, so it is caught too.
  let db = 0;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved != null && Number.isFinite(Number(saved))) db = clamp(Number(saved), FADER_DB_MIN, FADER_DB_MAX);
  } catch { /* no memory of the last session; 0 dB is the right place to start anyway */ }

  const root = document.createElement('div');
  // The id, not a class: the desk's stylesheet scopes this control's rules to it, and
  // reusing it is what makes the two surfaces the same control rather than two that
  // look alike. There is only ever one of these on a page.
  root.id = 'mastertoolbar';
  root.className = 'grp';
  root.setAttribute('aria-label', 'Master volume');

  const col = document.createElement('div'); col.className = 'mastertoolbar-control';
  const rail = document.createElement('div'); rail.className = 'master-fader-rail';

  const meter = document.createElement('div');
  meter.className = 'meter stereo toolbar-meter';
  meter.setAttribute('aria-hidden', 'true');
  const chans = [];
  for (let i = 0; i < 2; i++) {
    const fill = document.createElement('i');
    const peak = document.createElement('b');
    meter.append(fill, peak);
    chans.push({ fill, peak, shown: 0, held: 0, heldAt: 0 });
  }

  const readout = document.createElement('span');
  readout.className = 'master-fader-readout';
  readout.setAttribute('aria-live', 'polite');

  const fader = document.createElement('input');
  fader.type = 'range'; fader.className = 'master-fader';
  fader.min = 0; fader.max = 1; fader.step = 0.002;
  fader.setAttribute('aria-label', 'Master volume');
  fader.title = 'Monitor level — double-click for 0 dB';

  const fmt = (x) => (x > 0 ? '+' : '') + Number(x).toFixed(1);
  const dbOf = () => Math.round(posToDb(+fader.value) * 10) / 10;

  let hideTimer = 0;
  const hideReadout = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => readout.classList.remove('show'), 700);
  };
  // The dB only appears during the gesture, so the control stays a single slider rather
  // than becoming a labelled control with a second box beside it.
  const show = (x, transient = true) => {
    const text = `${fmt(x)} dB`;
    readout.textContent = text;
    fader.setAttribute('aria-valuetext', text);
    if (!transient) return;
    readout.classList.add('show');
    hideReadout();
  };

  const push = () => { Audio.mixer?.setMasterTrim(db); };
  // Remembering where the fader was left is worth one write when the hand comes off it,
  // and nothing at all during the drag: `localStorage` is synchronous, and sixty writes a
  // second on the thread that is also drawing the meter is exactly the kind of stutter
  // this control exists to stay out of the way of.
  let storeTimer = 0;
  const store = () => {
    clearTimeout(storeTimer);
    storeTimer = setTimeout(() => {
      try { localStorage.setItem(storageKey, String(db)); } catch { /* private mode; the session still works */ }
    }, 250);
  };
  const sync = (x, transient = false) => {
    db = clamp(x, FADER_DB_MIN, FADER_DB_MAX);
    fader.value = dbToPos(db);
    show(db, transient);
  };

  sync(db);
  fader.addEventListener('pointerdown', () => show(dbOf()));
  fader.addEventListener('input', () => { db = dbOf(); show(db); push(); store(); });
  fader.addEventListener('pointerup', hideReadout);
  fader.addEventListener('pointercancel', hideReadout);
  fader.addEventListener('dblclick', () => { sync(0, true); push(); store(); });

  rail.append(meter, readout, fader);
  col.append(rail);
  root.append(col);

  // ---- the meter -------------------------------------------------------------
  let at = 0;
  function tick() {
    const now = performance.now();
    const dt = at ? Math.min(0.25, (now - at) / 1000) : 0;
    at = now;
    // Nothing to read before the first gesture builds the engine, and nothing to draw
    // while the toolbar this lives in is off the page.
    if (Audio.mixer && root.isConnected) {
      const vals = Audio.mixer.masterLevels();
      let loudest = 0;
      chans.forEach((ch, i) => {
        const lin = typeof vals?.[i] === 'number' ? vals[i] : 0;
        if (lin > loudest) loudest = lin;
        // A dB scale bottoming at -48 reads far better than linear for a quiet patch.
        const level = 20 * Math.log10(Math.max(1e-6, lin));
        const pos = clamp((level + METER_FLOOR) / METER_FLOOR * 100, 0, 100);
        ch.shown = Math.max(pos, ch.shown - METER_FALL * dt);
        ch.fill.style.width = `${ch.shown}%`;
        if (pos >= ch.held) { ch.held = pos; ch.heldAt = now; }
        else if (now - ch.heldAt > PEAK_HOLD) {
          ch.held = Math.max(ch.shown, ch.held - PEAK_FALL * dt);
        }
        ch.peak.style.left = `${ch.held}%`;
        ch.peak.style.opacity = ch.held > 0.5 ? '1' : '0';
      });
      meter.classList.toggle('clip', loudest >= 1);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    root,
    /** Put the remembered level on a mixer that has just been built. */
    applyStored: push,
    db: () => db,
  };
}
