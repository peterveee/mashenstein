// The two graphs on the full-window synth editor: an ADSR envelope and a filter response.
//
// ---- what a graph is here ---------------------------------------------------
//
// A SECOND GRIP ON CONTROLS THAT ALREADY EXIST, never a control of its own. Every handle
// is bound to a ROW from the panel definition, reads through that row's `read` and writes
// through it, clamps to its `min`/`max` and quantises to its `step`. So the envelope's
// SUSTAIN handle moves the same 0–100 % view the pot beside it shows, over the same 0–1
// stored value, and `tests/pot-coverage.js` sees no new parameter because there is none.
//
// That discipline is the whole reason a graph is safe to add. Draw a curve from the
// values, let the user push the curve, write the values back — no third source of truth.
//
// The axes are the graph's own and do NOT follow the pot's taper, deliberately. The
// response curve's x is log-frequency because that is what a filter response IS; the
// CUTOFF pot's travel is a power curve because that is what feels right in the hand.
// Different questions.
//
// Split out of mixer-synth-full.js because it is arithmetic with a bit of SVG round it,
// and arithmetic that can be read on its own is arithmetic that can be checked — see
// tests/synth-graphs.js.

const SVG = 'http://www.w3.org/2000/svg';
const el = (name, attrs) => {
  const n = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Snap a value into a row's own range and step, the way `knob` does. */
export const quantise = (row, x) => {
  const stepped = Math.round(x / row.step) * row.step;
  return clamp(+stepped.toFixed(6), row.min, row.max);
};

// ---- the envelope -----------------------------------------------------------

/**
 * Where the four stages sit across the width.
 *
 * Fractions rather than time, because an envelope's SHAPE is what the graph is for and
 * ten seconds of release would otherwise leave attack and decay in the first two pixels.
 * Within its own span a stage is placed by the SQUARE ROOT of its time — the same reason
 * the pots take a power curve, so that 15 ms is visible next to 1 s rather than pinned
 * to the axis.
 */
export const ENV_SPANS = { attack: 0.30, decay: 0.28, hold: 0.16, release: 0.26 };

/**
 * The polyline for an envelope, in a box `w` × `h`.
 *
 * `read(row)` gives each value in the ROW's units, so SUSTAIN arrives as 0–100 and is
 * normalised by its own `row.max` rather than by an assumed 1.
 */
export function envShape({ rows, read, w, h }) {
  const top = 6;
  const bot = h - 5;
  const y = (v) => bot - clamp(v, 0, 1) * (bot - top);
  // Time → a fraction of this stage's span. `row.max` is the pot's own ceiling, so a
  // stage whose range is changed here follows without this file being told.
  const at = (row) => Math.sqrt(clamp((read(row) ?? row.def) / row.max, 0, 1));
  const A = ENV_SPANS.attack * w;
  const D = ENV_SPANS.decay * w;
  const S = ENV_SPANS.hold * w;
  const R = ENV_SPANS.release * w;
  const sus = clamp((read(rows.sustain) ?? rows.sustain.def) / rows.sustain.max, 0, 1);
  const xa = A * at(rows.attack);
  const xd = xa + D * at(rows.decay);
  const xs = xd + S;
  const xr = xs + R * at(rows.release);
  const path = `M0,${y(0).toFixed(1)} L${xa.toFixed(1)},${y(1).toFixed(1)}`
    + ` L${xd.toFixed(1)},${y(sus).toFixed(1)} L${xs.toFixed(1)},${y(sus).toFixed(1)}`
    + ` L${xr.toFixed(1)},${y(0).toFixed(1)}`;
  return {
    path,
    fill: `${path} L${xr.toFixed(1)},${bot} L0,${bot} Z`,
    grid: `M0,${y(0.5).toFixed(1)} H${w} M${A.toFixed(1)},0 V${h}`
      + ` M${(A + D).toFixed(1)},0 V${h} M${(A + D + S).toFixed(1)},0 V${h}`,
    handles: [
      { key: 'attack', x: xa, y: y(1) },
      { key: 'decay', x: xd, y: y(sus) },
      { key: 'release', x: xr, y: y(0) },
    ],
    spans: { A, D, S, R, xa, xd, xs, top, bot },
  };
}

/**
 * An envelope graph bound to four rows.
 *
 * `rows` is `{ attack, decay, sustain, release }` — the row objects themselves, so the
 * graph inherits their ranges and steps. `writeMany` takes every parameter a single
 * gesture moved in ONE call: the decay handle moves DECAY and SUSTAIN together, and two
 * `touched()` per pointermove would re-bank the voice twice a frame.
 */
export function envelopeGraph({ rows, read, writeMany, onLive, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  const grid = el('path', { class: 'sfgrid', d: '' });
  const fill = el('path', { class: 'sffill', d: '' });
  const line = el('path', { class: 'sfline', d: '' });
  svg.append(grid, fill, line);
  const dots = [0, 1, 2].map(() => {
    const c = el('circle', { class: 'sfhandle', r: 4.5, cx: -10, cy: -10 });
    svg.append(c);
    return c;
  });
  box.append(svg);
  box.title = 'Drag a handle to shape the envelope — the pots below move with it';

  let shape = null;
  const draw = () => {
    const w = svg.clientWidth || box.clientWidth || 200;
    shape = envShape({ rows, read, w, h });
    grid.setAttribute('d', shape.grid);
    fill.setAttribute('d', shape.fill);
    line.setAttribute('d', shape.path);
    shape.handles.forEach((pt, i) => {
      dots[i].setAttribute('cx', pt.x.toFixed(1));
      dots[i].setAttribute('cy', pt.y.toFixed(1));
    });
  };

  // A handle's x is its stage's time, squared back out of the square root the drawing
  // took. The decay handle's y is SUSTAIN, in that row's own units.
  const grab = (i) => (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const rect = svg.getBoundingClientRect();
    const move = (e) => {
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { A, D, S, R, xa, xd, xs, top, bot } = shape.spans;
      const timeAt = (frac, row) => quantise(row, (clamp(frac, 0, 1) ** 2) * row.max);
      const pairs = [];
      if (i === 0) pairs.push([rows.attack, timeAt(px / A, rows.attack)]);
      if (i === 1) {
        pairs.push([rows.decay, timeAt((px - xa) / D, rows.decay)]);
        const f = clamp((bot - py) / (bot - top), 0, 1);
        pairs.push([rows.sustain, quantise(rows.sustain, f * rows.sustain.max)]);
      }
      if (i === 2) pairs.push([rows.release, timeAt((px - xs) / R, rows.release)]);
      writeMany(pairs);
      onLive?.(pairs);
      draw();
    };
    move(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  dots.forEach((d, i) => { d.onpointerdown = grab(i); });

  return { box, draw };
}

// ---- the filter response ----------------------------------------------------

/** Where a frequency sits across a log axis from 20 Hz to 20 kHz. */
export const fx = (f, w) => (Math.log(clamp(f, 20, 20000) / 20) / Math.log(1000)) * w;
export const fxInv = (x, w) => 20 * (1000 ** clamp(x / w, 0, 1));

/**
 * A biquad's magnitude at frequency `f`, as the four types the desk offers.
 *
 * The textbook analogue prototype rather than the exact digital response — this is a
 * picture of what the filter is doing, drawn beside the controls doing it, and the
 * bilinear warping near Nyquist would cost accuracy where nobody is looking.
 * `slope` scales it: -24 is two of these in series, which in decibels is twice as far.
 */
export function magnitudeDb(f, { cutoff, Q, type, slope }) {
  const w = f / cutoff;
  const w2 = w * w;
  const den = Math.sqrt((1 - w2) ** 2 + (w / Q) ** 2) || 1e-6;
  const m = type === 'highpass' ? w2 / den
    : type === 'bandpass' ? (w / Q) / den
      : type === 'notch' ? Math.abs(1 - w2) / den
        : 1 / den;
  const db = 20 * Math.log10(Math.max(m, 1e-4)) * (Math.abs(slope) / 12);
  return clamp(db, -45, 24);
}

/**
 * The response graph, bound to CUTOFF and RESONANCE (and reading TYPE and SLOPE).
 *
 * One handle moves both: x is the cutoff, y is the resonance. That is the gesture a
 * filter actually wants — you are aiming at a corner, not setting two numbers — and it is
 * why `writeMany` exists.
 */
export function responseGraph({ rows, read, writeMany, onLive, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  const grid = el('path', { class: 'sfgrid', d: '' });
  const fill = el('path', { class: 'sffill', d: '' });
  const line = el('path', { class: 'sfline', d: '' });
  const dot = el('circle', { class: 'sfhandle', r: 4.5, cx: -10, cy: -10 });
  svg.append(grid, fill, line, dot);
  box.append(svg);
  box.title = 'Drag to move the cutoff and its resonance together';

  const yd = (db) => (h - 4) * (1 - (db + 42) / 66) + 2;
  // Resonance rides a log axis up the box, the same shape its pot's taper has.
  const qy = (q) => (h - 8) * (1 - Math.log(clamp(q, rows.Q.min, rows.Q.max) / rows.Q.min)
    / Math.log(rows.Q.max / rows.Q.min)) + 4;
  const qAt = (y) => rows.Q.min * ((rows.Q.max / rows.Q.min)
    ** clamp(1 - (y - 4) / (h - 8), 0, 1));

  let w = 200;
  const draw = () => {
    w = svg.clientWidth || box.clientWidth || 200;
    const spec = {
      cutoff: read(rows.freq) ?? rows.freq.def,
      Q: read(rows.Q) ?? rows.Q.def,
      type: read(rows.type) ?? rows.type.def,
      slope: Number(read(rows.slope) ?? rows.slope.def),
    };
    let d = '';
    for (let i = 0; i <= 60; i++) {
      const f = 20 * (1000 ** (i / 60));
      d += `${i ? ' L' : 'M'}${fx(f, w).toFixed(1)},${yd(magnitudeDb(f, spec)).toFixed(1)}`;
    }
    line.setAttribute('d', d);
    fill.setAttribute('d', `${d} L${w},${h} L0,${h} Z`);
    grid.setAttribute('d', [100, 1000, 10000].map((f) => `M${fx(f, w).toFixed(1)},0 V${h}`)
      .join(' ') + ` M0,${yd(0).toFixed(1)} H${w}`);
    dot.setAttribute('cx', clamp(fx(spec.cutoff, w), 5, w - 5).toFixed(1));
    dot.setAttribute('cy', qy(spec.Q).toFixed(1));
  };

  svg.onpointerdown = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    const rect = svg.getBoundingClientRect();
    const move = (e) => {
      const pairs = [
        [rows.freq, quantise(rows.freq, fxInv(e.clientX - rect.left, rect.width))],
        [rows.Q, quantise(rows.Q, qAt(e.clientY - rect.top))],
      ];
      writeMany(pairs);
      onLive?.(pairs);
      draw();
    };
    move(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return { box, draw };
}
