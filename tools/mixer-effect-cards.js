// The Channel EQ's surface, and the effect cards that share its machinery.
//
// Lifted out of mixer-entry.js. The EQ has a graph rather than ten sliders — eight of
// its parameters are two coordinates each, and a curve you drag is faster than four
// numbers you type. The log-frequency and dB mappings here are the whole of that, and
// the filter and multiband panels reuse them, which is why `fillEffectControls` — the
// builder that decides which surface an effect gets — travels with them rather than
// staying behind with the panel that calls it.
//
// It knows nothing about the desk's mix: every card is handed its `params` and an
// `apply`, and what comes back out is two functions the desk calls.

import { Audio } from '../src/engine/audio.js';
import {
  EFFECT_BY_ID, paramRange, visibleParams, SYNC_DIVISIONS, RATE_DIVISIONS,
  AUTOPANNER_RATE_DIVISIONS, syncSeconds,
  effectPresetNames, resolveEffectPreset, resolveEffectSnapshot, matchEffectPreset,
  PEQ_BANDS, peqResponse,
} from '../src/engine/effects.js';
import { responseGraph } from './mixer-synth-graphs.js';
import { paramLabel, checkRow, divisionRow, optionRow, radioRow } from './mixer-controls.js';

/** The same clamp the desk uses. Copied rather than passed: it is one expression. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** And the same height read. Copied for the same reason, rather than importing the
 * whole vertical budget for one expression. */
const h = (el) => (el ? el.getBoundingClientRect().height : 0);

// ---- the seam ---------------------------------------------------------------
// Four things the cards need that are not theirs: the desk's slider row, its drag
// gesture, the song tempo a sync division is read against, and how it spells one.
let slider, dragNumber, deskTempo, fmtDelay;

/** Hand the cards the four desk facts they cannot work out for themselves. */
export function installEffectCards(deps) {
  ({ slider, dragNumber, deskTempo, fmtDelay } = deps);
}

/**
 * The Channel EQ has a surface of its own rather than ten sliders.
 *
 * Ten sliders is what the generic control builder makes of it, and it was the widest
 * card in the rack — three columns of f/g/q with nothing to say which of them was the
 * dip you had just put in the low mids. An EQ is the one effect whose settings ARE a
 * shape, so the shape is the control: the curve is what the four biquads actually do,
 * and the four handles on it are the frequency and gain of each band.
 *
 * The numbers stay underneath, draggable and typable, because a graph cannot be read
 * to a decimal place and Q has no second axis to live on. Every parameter the engine
 * reads still has a control here — the graph is a faster way to reach eight of them,
 * not a replacement for two.
 */
const EQ_MIN_HZ = 20;
const EQ_MAX_HZ = 20000;
const EQ_MAX_DB = 20;                 // the graph's vertical extent; the bands stop at ±18
const EQ_DECADES = Math.log(EQ_MAX_HZ / EQ_MIN_HZ);
// Lines where a mixing engineer expects them, labelled only at the decades — a label
// on every line is nine numbers across 320 pixels and reads as texture, not as a scale.
const EQ_GRID_HZ = [30, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const EQ_LABEL_HZ = { 100: '100', 1000: '1k', 10000: '10k' };
const EQ_GRID_DB = [-12, -6, 6, 12];
const EQ_GRAB_PX = 26;                // how near a handle a press has to land to take it

// Every graph currently on screen. The curve is painted into a canvas, so it is the
// one part of the desk a theme switch cannot restyle — CSS reaches the card, the band
// boxes and the graph's background, and stops at the pixels. Cards come and go with
// every rebuild of the rack, so the set is swept for canvases that have left the
// document rather than each panel having to remember to unregister itself.
const eqGraphs = new Set();
function sweepEqGraphs() {
  for (const g of eqGraphs) if (!g.canvas.isConnected) eqGraphs.delete(g);
}
// Swept as each new card registers as well as on the way past, so the set stays the
// size of what is on screen rather than the size of everything that ever was.
function registerEqGraph(entry) { sweepEqGraphs(); eqGraphs.add(entry); }
function repaintEqGraphs() {
  sweepEqGraphs();
  for (const g of eqGraphs) g.draw();
}

/** Where a frequency sits across the graph, and back again. Log, as an EQ is read. */
const eqX = (f, w) => (Math.log(clamp(f, EQ_MIN_HZ, EQ_MAX_HZ) / EQ_MIN_HZ) / EQ_DECADES) * w;
const eqFreq = (x, w) => EQ_MIN_HZ * Math.exp((clamp(x, 0, w) / w) * EQ_DECADES);
const eqY = (db, h) => (h / 2) * (1 - clamp(db, -EQ_MAX_DB, EQ_MAX_DB) / EQ_MAX_DB);
const eqDb = (y, h) => clamp((1 - (y / (h / 2))) * EQ_MAX_DB, -EQ_MAX_DB, EQ_MAX_DB);

/** A frequency as the readouts write it: 120 Hz, 2.4 kHz. */
const eqHz = (f) => (f >= 10000 ? `${(f / 1000).toFixed(1)} kHz`
  : f >= 1000 ? `${(f / 1000).toFixed(2)} kHz`
    : `${Math.round(f)} Hz`);
const eqDbText = (g) => `${g > 0 ? '+' : ''}${g.toFixed(1)} dB`;

/**
 * A number under the graph: drag it to change it, click it to type it, click its
 * label to put it back. The same three gestures a slider's readout has — see
 * `slider` — because this IS that readout, without a slider above it.
 */
function eqNumber(el, { get, set, rng, fmt, parse }) {
  el.classList.add('typable');
  const openEditor = () => {
    if (el.querySelector('input')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein';
    box.value = fmt(get());
    el.textContent = '';
    el.append(box);
    box.focus(); box.select();
    const done = (commit) => {
      const n = commit ? parse(box.value) : null;
      if (n != null) set(clamp(n, rng.min, rng.max));
      el.textContent = fmt(get());
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true);
      else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  };
  dragNumber(el, {
    value: get,
    set: (x) => set(clamp(x, rng.min, rng.max)),
    range: rng.max - rng.min,
    step: rng.step,
    onClick: openEditor,
  });
}

/**
 * Build the Channel EQ's graph and its four band readouts.
 *
 * `params` is the live settings object the caller keeps up to date, and `apply` is
 * how a change reaches the node and the mix — the same pair every other control in
 * `fillEffectControls` is given, so the graph works identically on a channel insert
 * and on a staged bar effect with no live node behind it at all.
 */
function eqGraphPanel({ params, apply }) {
  const panel = document.createElement('div');
  panel.className = 'eqpanel';
  const canvas = document.createElement('canvas');
  canvas.className = 'eqcurve';
  canvas.title = 'Drag a band to move it · shift for gain only, alt for frequency only'
    + ' · wheel over a peak for its Q · double-click to reset the band';
  const strip = document.createElement('div');
  strip.className = 'eqbands';
  // The band count reaches the stylesheet from the catalogue rather than being written
  // out twice — a fifth band was added to PEQ_BANDS and a `repeat(4, …)` left behind
  // would have squeezed five boxes into four columns and wrapped the last one.
  strip.style.setProperty('--eqbands', String(PEQ_BANDS.length));
  panel.append(canvas, strip);

  const sampleRate = () => Audio.ctx?.sampleRate || 44100;
  const rangeOf = (key) => paramRange(key, EFFECT_BY_ID.peq);
  const val = (key) => params[key] ?? EFFECT_BY_ID.peq.defaults[key];
  const put = (patch, part) => { apply(patch, part); refresh(); };

  // One box per band, in the order they sit across the graph. The box is the legend:
  // there is no room for a readable digit inside a 6px handle, and a colour key would
  // be four more colours to tell apart on five themes.
  const boxes = PEQ_BANDS.map((b) => {
    const box = document.createElement('div');
    box.className = 'eqband';
    const name = document.createElement('span');
    name.className = 'eqbandname resettable';
    name.textContent = b.label;
    name.title = `Reset the ${b.label.toLowerCase()} band`;
    name.addEventListener('click', () => resetBand(b));
    const fEl = document.createElement('span'); fEl.className = 'eqnum';
    const gEl = document.createElement('span'); gEl.className = 'eqnum eqgain';
    const qEl = document.createElement('span'); qEl.className = 'eqnum eqq';
    eqNumber(fEl, {
      get: () => val(`f${b.n}`), rng: rangeOf(`f${b.n}`), fmt: eqHz,
      parse: eqParseHz, set: (x) => put({ [`f${b.n}`]: x }, `eq${b.n}`),
    });
    eqNumber(gEl, {
      get: () => val(`g${b.n}`), rng: rangeOf(`g${b.n}`), fmt: eqDbText,
      parse: eqParseNumber, set: (x) => put({ [`g${b.n}`]: x }, `eq${b.n}`),
    });
    box.append(name, fEl, gEl, qEl);
    if (b.type === 'peaking') {
      eqNumber(qEl, {
        get: () => val(`q${b.n}`), rng: rangeOf(`q${b.n}`), fmt: (q) => `Q ${q.toFixed(1)}`,
        parse: eqParseNumber, set: (x) => put({ [`q${b.n}`]: x }, `eq${b.n}`),
      });
    } else {
      // A shelf's Q is not a control — a BiquadFilterNode shelf ignores it — so the
      // slot says so rather than standing empty and leaving the four boxes ragged.
      qEl.classList.add('eqnone');
      qEl.textContent = 'SHELF';
      qEl.title = 'A shelf has no Q — its slope is fixed, as a console shelf’s is';
    }
    strip.append(box);
    return { band: b, box, fEl, gEl, qEl };
  });

  function resetBand(b) {
    const d = EFFECT_BY_ID.peq.defaults;
    const patch = { [`f${b.n}`]: d[`f${b.n}`], [`g${b.n}`]: d[`g${b.n}`] };
    if (b.type === 'peaking') patch[`q${b.n}`] = d[`q${b.n}`];
    put(patch, null);
  }

  // ---- the curve ----------------------------------------------------------
  let hot = null;                      // the band being dragged, or hovered
  let freqs = new Float64Array(0);     // one frequency per pixel column, cached by width
  let ink = {};

  const readInk = () => {
    const cs = getComputedStyle(canvas);
    const v = (n) => cs.getPropertyValue(n).trim();
    ink = {
      line: v('--line'), dim: v('--dim'), accent: v('--accent'),
      ctl: v('--ctl'), inkc: v('--ink'), input: v('--input'),
    };
  };

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    if (freqs.length !== w) {
      freqs = new Float64Array(w);
      for (let x = 0; x < w; x++) freqs[x] = eqFreq(x + 0.5, w);
    }
    readInk();
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);

    // The grid. Frequencies first, then the dB lines over them, then the zero line
    // last and brighter: it is the one line the curve is read against.
    g.lineWidth = 1;
    g.strokeStyle = ink.line;
    g.beginPath();
    for (const f of EQ_GRID_HZ) {
      const x = Math.round(eqX(f, w)) + 0.5;
      g.moveTo(x, 0); g.lineTo(x, h);
    }
    for (const db of EQ_GRID_DB) {
      const y = Math.round(eqY(db, h)) + 0.5;
      g.moveTo(0, y); g.lineTo(w, y);
    }
    g.stroke();
    g.strokeStyle = ink.dim;
    g.beginPath();
    const zero = Math.round(eqY(0, h)) + 0.5;
    g.moveTo(0, zero); g.lineTo(w, zero);
    g.stroke();

    // The scale. Each label is painted on a chip of the graph's own background: the
    // grid runs behind it, and on the light themes a line through a 8px numeral is
    // the difference between reading "100" and reading a smudge.
    g.font = '8px system-ui, sans-serif';
    g.textBaseline = 'middle';
    const chip = (text, cx, cy, align) => {
      g.textAlign = align;
      const tw = g.measureText(text).width;
      const left = align === 'center' ? cx - tw / 2 : cx;
      g.fillStyle = ink.input;
      g.fillRect(left - 2, cy - 5, tw + 4, 10);
      g.fillStyle = ink.dim;
      g.fillText(text, cx, cy);
    };
    for (const f of EQ_GRID_HZ) {
      if (EQ_LABEL_HZ[f]) chip(EQ_LABEL_HZ[f], eqX(f, w), h - 7, 'center');
    }
    chip('+12', 3, eqY(12, h), 'left');
    chip('\u221212', 3, eqY(-12, h), 'left');

    // The band being touched, drawn on its own behind the total: with five bands
    // overlapping, the curve alone does not say which of them a handle owns.
    if (hot) {
      const solo = peqResponse(params, freqs, sampleRate(), hot.n);
      g.strokeStyle = ink.ctl;
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x < w; x++) {
        const y = eqY(solo[x], h);
        if (x) g.lineTo(x + 0.5, y); else g.moveTo(x + 0.5, y);
      }
      g.stroke();
    }

    // The total: what the four biquads in the chain actually do to the channel.
    const resp = peqResponse(params, freqs, sampleRate());
    g.beginPath();
    for (let x = 0; x < w; x++) {
      const y = eqY(resp[x], h);
      if (x) g.lineTo(x + 0.5, y); else g.moveTo(x + 0.5, y);
    }
    g.lineWidth = 2;
    g.strokeStyle = ink.accent;
    g.stroke();
    // Filled back to the zero line, which is what makes a boost read as a boost at a
    // glance. Faint: the fill is a hint about direction, and the curve is the reading.
    g.lineTo(w, zero); g.lineTo(0, zero); g.closePath();
    g.globalAlpha = 0.14;
    g.fillStyle = ink.accent;
    g.fill();
    g.globalAlpha = 1;

    // The handles.
    for (const b of PEQ_BANDS) {
      const x = eqX(val(`f${b.n}`), w);
      const y = eqY(val(`g${b.n}`), h);
      const live = hot?.n === b.n;
      g.beginPath();
      g.arc(x, y, live ? 6 : 4.5, 0, Math.PI * 2);
      g.fillStyle = live ? ink.accent : ink.input;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = live ? ink.inkc : ink.accent;
      g.stroke();
    }
  }

  function refresh() {
    for (const s of boxes) {
      if (!s.fEl.querySelector('input')) s.fEl.textContent = eqHz(val(`f${s.band.n}`));
      if (!s.gEl.querySelector('input')) s.gEl.textContent = eqDbText(val(`g${s.band.n}`));
      if (s.band.type === 'peaking' && !s.qEl.querySelector('input')) {
        s.qEl.textContent = `Q ${val(`q${s.band.n}`).toFixed(1)}`;
      }
      s.box.classList.toggle('hot', hot?.n === s.band.n);
      // A band at 0dB is doing nothing, and saying so is the fastest read on the card.
      s.box.classList.toggle('flat', !val(`g${s.band.n}`));
    }
    draw();
  }

  /**
   * The band under the pointer — near enough to a handle to be meant.
   *
   * Nothing when the press lands in open graph, deliberately: a press that grabbed
   * whichever band was nearest would move a band by an octave on a click that only
   * wandered a pixel, and a graph you cannot click without editing is one you stop
   * clicking. The handles are the controls; 26px of slack is what makes them easy to
   * hit without making the rest of the graph live.
   */
  function pick(px, py) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    let best = null, bestD = Infinity;
    for (const b of PEQ_BANDS) {
      const d = Math.hypot(eqX(val(`f${b.n}`), w) - px, eqY(val(`g${b.n}`), h) - py);
      if (d < bestD) { bestD = d; best = b; }
    }
    return bestD <= EQ_GRAB_PX ? best : null;
  }

  /** The peak a wheel belongs to: the nearer of the two, by frequency alone. */
  function nearestPeak(px) {
    const w = canvas.clientWidth;
    let best = null, bestD = Infinity;
    for (const b of PEQ_BANDS) {
      if (b.type !== 'peaking') continue;
      const d = Math.abs(eqX(val(`f${b.n}`), w) - px);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    const { x, y } = at(e);
    dragging = pick(x, y);
    hot = dragging;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    refresh();
  });
  canvas.addEventListener('pointermove', (e) => {
    const { x, y } = at(e);
    if (!dragging) {
      const near = pick(x, y);
      if (near?.n !== hot?.n) { hot = near; refresh(); }
      canvas.style.cursor = near ? 'grab' : 'default';
      return;
    }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const fr = rangeOf(`f${dragging.n}`), gr = rangeOf(`g${dragging.n}`);
    const patch = {};
    // Shift keeps the frequency, alt keeps the gain: an EQ move is usually one of the
    // two and a mouse is not steady enough to promise the other stayed where it was.
    if (!e.shiftKey) {
      patch[`f${dragging.n}`] = clamp(Math.round(eqFreq(x, w) / fr.step) * fr.step,
        fr.min, fr.max);
    }
    if (!e.altKey) {
      patch[`g${dragging.n}`] = clamp(Math.round(eqDb(y, h) / gr.step) * gr.step,
        gr.min, gr.max);
    }
    put(patch, `eq${dragging.n}`);
  });
  const release = (e) => {
    if (!dragging) return;
    dragging = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
    refresh();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => {
    if (dragging || !hot) return;
    hot = null; refresh();
  });
  canvas.addEventListener('dblclick', (e) => {
    const { x, y } = at(e);
    const b = pick(x, y);
    if (b) resetBand(b);
  });
  // Q on the wheel, which is the axis the graph has no room for. Peaks only: a shelf
  // has none, and rolling over one silently doing nothing is worse than not reacting.
  canvas.addEventListener('wheel', (e) => {
    const b = nearestPeak(at(e).x);
    if (!b) return;
    e.preventDefault();
    const qr = rangeOf(`q${b.n}`);
    const step = qr.step * (e.shiftKey ? 1 : 3);
    const next = clamp(val(`q${b.n}`) - Math.sign(e.deltaY) * step, qr.min, qr.max);
    hot = b;
    put({ [`q${b.n}`]: Math.round(next / qr.step) * qr.step }, `eq${b.n}`);
  }, { passive: false });

  // The card is a fixed width in the rack and a fluid one in the Bar Effects sheet,
  // so the curve is redrawn off the box rather than off a number written down here.
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => draw()).observe(canvas);
  }
  registerEqGraph({ canvas, draw });
  requestAnimationFrame(refresh);
  return { el: panel, refresh };
}

/** "2.4 kHz", "2400", "2k4" — anything a mixing engineer would type into a frequency. */
function eqParseHz(text) {
  const s = String(text).trim().toLowerCase().replace(/\s+/g, '');
  const k = /^([0-9]*\.?[0-9]+)k/.exec(s);
  if (k) return parseFloat(k[1]) * 1000;
  const n = parseFloat(s.replace(/[^0-9.\-+eE]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function eqParseNumber(text) {
  const n = parseFloat(String(text).replace(/[^0-9.\-+eE]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * The Filter effect's response curve is the same second grip used by the synth editors.
 * Its two controls remain sliders below the graph — the graph makes the relationship
 * visible, while the sliders keep the effect card's ordinary precise control surface.
 */
function filterGraphPanel({ def, params, apply }) {
  const frequency = paramRange('frequency', def);
  const resonance = paramRange('Q', def);
  const rows = {
    freq: { path: 'frequency', min: frequency.min, max: frequency.max,
      step: frequency.step, def: def.defaults.frequency },
    Q: { path: 'Q', min: resonance.min, max: resonance.max,
      step: resonance.step, def: def.defaults.Q },
    type: { path: 'type', def: def.defaults.type },
  };
  let graph = null;
  const writeGraph = (pairs) => {
    apply(Object.fromEntries(pairs.map(([row, value]) => [row.path, value])), 'filter-graph');
    graph?.draw();
  };
  graph = responseGraph({
    rows,
    read: (row) => params[row.path] ?? row.def,
    writeMany: writeGraph,
  });
  graph.box.classList.add('fxfiltergraph');
  return graph;
}

/**
 * The multiband compressor is easier to mix as three small compressors than as a
 * seventeen-row list. Keep the engine's dotted parameter names, but give the card a
 * surface that follows the signal: crossover points first, then LOW/MID/HIGH bands.
 */
function multibandControls({ def, entryParams, applyPatch }) {
  const panel = document.createElement('div');
  panel.className = 'mbpanel';

  const numberRow = (pname, label) => {
    const rng = paramRange(pname, def);
    const value = entryParams[pname] ?? rng.min;
    const useLog = rng.log && rng.min > 0;
    const logToPos = (v) => Math.log(v / rng.min) / Math.log(rng.max / rng.min);
    const logFromPos = (p) => rng.min * Math.pow(rng.max / rng.min, p);
    const unitFmt = (x) => (rng.unit === 'Hz' && x >= 1000 ? (x / 1000).toFixed(1) + 'k'
      : rng.unit === 's' ? (x * 1000).toFixed(0) + 'ms'
      : x.toFixed(rng.step >= 1 ? 0 : 2)) + (rng.unit && rng.unit !== 's' ? ' ' + rng.unit : '');
    const row = slider({
      min: useLog ? 0 : rng.min,
      max: useLog ? 1 : rng.max,
      step: useLog ? 0.001 : rng.step,
      value: useLog ? logToPos(value) : value,
      reset: useLog ? logToPos(def.defaults[pname] ?? rng.min) : (def.defaults[pname] ?? rng.min),
      fmt: (x) => unitFmt(useLog ? logFromPos(x) : x),
      display: useLog ? {
        format: (pos) => unitFmt(logFromPos(pos)),
        parse: (s) => {
          const n = parseFloat(String(s).replace(/[^0-9.\-+eE]/g, ''));
          return Number.isFinite(n) ? clamp(logToPos(n), 0, 1) : null;
        },
      } : undefined,
      onInput: (x) => applyPatch({ [pname]: useLog ? logFromPos(x) : x }, pname),
    });
    row.label.textContent = label;
    return row.wrap;
  };

  const crossovers = document.createElement('section');
  crossovers.className = 'mbsection mbcrossovers';
  const crossoverTitle = document.createElement('h5');
  crossoverTitle.textContent = 'CROSSOVERS';
  crossovers.append(crossoverTitle,
    numberRow('lowFrequency', 'LOW / MID'),
    numberRow('highFrequency', 'MID / HIGH'));
  panel.append(crossovers);

  const bands = document.createElement('div');
  bands.className = 'mbbands';
  for (const [id, label] of [['low', 'LOW BAND'], ['mid', 'MID BAND'], ['high', 'HIGH BAND']]) {
    const band = document.createElement('section');
    band.className = `mbsection mbband mbband-${id}`;
    const title = document.createElement('h5');
    title.textContent = label;
    band.append(title,
      numberRow(`${id}.threshold`, 'THRESH'),
      numberRow(`${id}.ratio`, 'RATIO'),
      numberRow(`${id}.attack`, 'ATTACK'),
      numberRow(`${id}.release`, 'RELEASE'),
      numberRow(`${id}.knee`, 'KNEE'));
    bands.append(band);
  }
  panel.append(bands);
  return panel;
}

/**
 * Draw one insert's editable parameter surface.
 *
 * Channel inserts and bar snapshots are the same engine objects (`{ id, params,
 * bypass }`). Keeping their controls here means a Delay cannot expose tempo mode in
 * one editor and only milliseconds in the other, and a new effect automatically
 * becomes editable in both places. The caller owns where changes land: the channel
 * inspector supplies a live-node writer, while Bar Effects supplies a staged array
 * that is silent until Apply.
 */
function fillEffectControls({
  grid, def, entry, presetScope = 'inserts', patch, replaceParams, rebuild,
  tag = () => null,
}) {
  if (!def) return;
  const entryParams = { ...(def.defaults || {}), ...(entry.params || {}) };
  let filterGraph = null;
  const controlSyncs = new Map();
  let presetSelect = null;
  const syncPreset = () => {
    if (presetSelect) {
      presetSelect.value = matchEffectPreset(def.id, entryParams, presetScope) || 'Custom';
    }
  };
  const applyPatch = (next, part = null) => {
    patch(next, tag(part));
    Object.assign(entryParams, next);
    for (const [pname, value] of Object.entries(next)) controlSyncs.get(pname)?.(value);
    syncPreset();
    filterGraph?.draw();
  };
  const applySnapshot = (snapshot, part = null) => {
    const resolved = resolveEffectSnapshot(def.id, snapshot);
    if (!resolved) return false;
    replaceParams(resolved, tag(part));
    for (const key of Object.keys(entryParams)) delete entryParams[key];
    Object.assign(entryParams, def.defaults || {}, resolved);
    for (const [pname, sync] of controlSyncs) {
      if (Object.prototype.hasOwnProperty.call(entryParams, pname)) sync(entryParams[pname]);
    }
    syncPreset();
    filterGraph?.draw();
    return true;
  };

  const presetNames = effectPresetNames(def.id, presetScope);
  // Every effect gets a reset path, even before it has named creative presets. The
  // catalogue default is the safe way back from a hand-tuned card; removing and
  // re-adding an insert should never be necessary just to recover its starting sound.
  if ((def.params || []).length) {
    const currentPreset = matchEffectPreset(def.id, entryParams, presetScope) || 'Custom';
    const row = optionRow('PRESET', ['Custom', 'Default', ...presetNames], currentPreset, (name) => {
      if (name === 'Custom') return;
      const resolved = resolveEffectPreset(def.id, name, presetScope);
      if (!resolved || !applySnapshot(resolved, 'preset')) return;
      rebuild();
    }, def.defaultPresetName ? { Default: def.defaultPresetName } : null);
    presetSelect = row.select;
    // FIRST, and the full width of the card, on every card that has one. A preset is not
    // one parameter among the others — it sets all of them — so it does not belong in the
    // left-hand column of a two-column grid with a pot beside it, where it reads as the
    // first control rather than as the thing that decides what the controls say. Appended
    // before anything else here; `.fxpresetrow` is what makes it span. */
    row.classList.add('fxpresetrow');
    grid.append(row);
  }

  // The Channel EQ draws itself: a response graph with the bands on it, in place of
  // the ten sliders this builder would otherwise make of f/g/q times four. It still
  // takes the PRESET row above it, which is why it is placed here and not earlier.
  if (def.id === 'peq') {
    const eq = eqGraphPanel({ params: entryParams, apply: applyPatch });
    grid.append(eq.el);
    return;
  }

  if (def.id === 'filter') {
    filterGraph = filterGraphPanel({ def, params: entryParams, apply: applyPatch });
    grid.append(filterGraph.box);
    requestAnimationFrame(() => filterGraph.draw());
  }

  if (def.id === 'mbCompN') {
    grid.append(multibandControls({ def, entryParams, applyPatch }));
    return;
  }

  // Delay time is either a note division or free milliseconds, and a modulation rate
  // either a division or a free frequency. Only the active mode is drawn.
  const hasSync = (def.params || []).includes('sync');
  const synced = hasSync && (entryParams.sync ?? 1) >= 0.5;
  for (const pname of visibleParams(def, entryParams)) {
    const rateSynced = (entryParams.rateSync ?? 0) >= 0.5;
    if (pname === 'rateSync') {
      const tempoMode = checkRow('Tempo Mode', rateSynced, (on) => {
        applyPatch({ rateSync: on ? 1 : 0 }); rebuild();
      });
      tempoMode.classList.add('tempo-mode-toggle');
      grid.append(tempoMode);
      continue;
    }
    if (pname === 'rateDivision') {
      const divisions = def.id === 'autopanner' ? AUTOPANNER_RATE_DIVISIONS : RATE_DIVISIONS;
      grid.append(divisionRow('RATE', divisions, entryParams.rateDivision ?? 1,
        (beats) => `${(deskTempo() / (60 * beats)).toFixed(2)}Hz`,
        (beats) => applyPatch({ rateDivision: beats }, 'rate')));
      continue;
    }
    if (pname === 'sync') {
      const tempoMode = checkRow('Tempo Mode', synced, (on) => {
        applyPatch({ sync: on ? 1 : 0 }); rebuild();
      });
      tempoMode.classList.add('tempo-mode-toggle');
      grid.append(tempoMode);
      continue;
    }
    if (pname === 'division') {
      grid.append(divisionRow('TIME', SYNC_DIVISIONS, entryParams.division ?? 0.5,
        (beats) => fmtDelay(syncSeconds(beats, deskTempo())),
        (beats) => applyPatch({ division: beats }, 'div')));
      continue;
    }

    const rng = paramRange(pname, def);
    if (rng.toggle) {
      const toggle = checkRow(paramLabel(pname, def),
        (entryParams[pname] ?? def.defaults?.[pname] ?? 0) >= 0.5,
        (on) => applyPatch({ [pname]: on ? 1 : 0 }));
      if (def.id === 'l7') {
        toggle.classList.add('l7control');
        toggle.dataset.l7Param = pname;
      }
      grid.append(toggle);
      continue;
    }
    if (rng.options) {
      const value = entryParams[pname] ?? rng.options[0];
      grid.append(def.id === 'filter' && pname === 'type'
        ? radioRow(paramLabel(pname, def), rng.options, value,
          (next) => applyPatch({ [pname]: next }))
        : optionRow(paramLabel(pname, def), rng.options, value,
          (next) => applyPatch({ [pname]: next })));
      continue;
    }

    const value = entryParams[pname] ?? rng.min;
    const useLog = rng.log && rng.min > 0;
    const logToPos = (v) => Math.log(v / rng.min) / Math.log(rng.max / rng.min);
    const logFromPos = (p) => rng.min * Math.pow(rng.max / rng.min, p);
    const unitFmt = (x) => (rng.unit === 'Hz' && x >= 1000 ? (x / 1000).toFixed(1) + 'k'
      : rng.unit === 's' ? (x * 1000).toFixed(0) + 'ms'
      : x.toFixed(rng.step >= 1 ? 0 : 2)) + (rng.unit && rng.unit !== 's' ? ' ' + rng.unit : '');
    const row = slider({
      min: useLog ? 0 : rng.min,
      max: useLog ? 1 : rng.max,
      step: useLog ? 0.001 : rng.step,
      value: useLog ? logToPos(value) : value,
      reset: useLog ? logToPos(def.defaults[pname] ?? rng.min) : (def.defaults[pname] ?? rng.min),
      fmt: (x) => unitFmt(useLog ? logFromPos(x) : x),
      display: useLog ? {
        format: (pos) => unitFmt(logFromPos(pos)),
        parse: (s) => {
          const n = parseFloat(String(s).replace(/[^0-9.\-+eE]/g, ''));
          return Number.isFinite(n) ? clamp(logToPos(n), 0, 1) : null;
        },
      } : undefined,
      onInput: (x) => applyPatch({ [pname]: useLog ? logFromPos(x) : x }, pname),
    });
    row.label.textContent = paramLabel(pname, def);
    controlSyncs.set(pname, (next) => row.sync(useLog ? logToPos(next) : next));
    if (def.id === 'l7') {
      row.wrap.classList.add('l7control');
      row.wrap.dataset.l7Param = pname;
      // On the two level controls the mono meter is the slider groove. The input
      // remains above it and owns every pointer event; the moving colour underneath
      // is only a reading, in the same visual language as the mixer faders.
      if (pname === 'threshold' || pname === 'ceiling') {
        const rail = document.createElement('span'); rail.className = 'l7sliderrail';
        const level = document.createElement('i'); level.className = 'l7sliderlevel';
        row.input.replaceWith(rail);
        rail.append(level, row.input);
      }
    }
    if (def.id === 'compressor') {
      row.wrap.classList.add('compressorcontrol');
      row.wrap.dataset.compressorParam = pname;
      // INPUT and OUTPUT share their slider grooves with the live levels, just like
      // the L7's threshold and ceiling. The handles remain the editable layer.
      if (pname === 'inputGain' || pname === 'outputGain') {
        const rail = document.createElement('span'); rail.className = 'l7sliderrail';
        const level = document.createElement('i'); level.className = 'l7sliderlevel';
        row.input.replaceWith(rail);
        rail.append(level, row.input);
      }
    }
    grid.append(row.wrap);
  }
}

export { fillEffectControls, repaintEqGraphs };
