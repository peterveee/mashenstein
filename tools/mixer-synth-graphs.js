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

import { synthFamily, CRLS1, TNGR2 } from '../src/engine/synth-families.js';

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
  // An envelope with no RELEASE row is a three-stage envelope, not a four-stage one
  // missing a control: TNGR-2's POSITION walk holds where its decay leaves it for as
  // long as the note lasts. The release span goes to the sustain leg so the curve still
  // fills its box, and the third handle is not drawn.
  const held = !rows.release;
  const A = ENV_SPANS.attack * w;
  const D = ENV_SPANS.decay * w;
  const S = (ENV_SPANS.hold + (held ? ENV_SPANS.release : 0)) * w;
  const R = held ? 0 : ENV_SPANS.release * w;
  const sus = clamp((read(rows.sustain) ?? rows.sustain.def) / rows.sustain.max, 0, 1);
  const xa = A * at(rows.attack);
  const xd = xa + D * at(rows.decay);
  const xs = xd + S;
  const xr = held ? xs : xs + R * at(rows.release);
  const path = `M0,${y(0).toFixed(1)} L${xa.toFixed(1)},${y(1).toFixed(1)}`
    + ` L${xd.toFixed(1)},${y(sus).toFixed(1)} L${xs.toFixed(1)},${y(sus).toFixed(1)}`
    + (held ? '' : ` L${xr.toFixed(1)},${y(0).toFixed(1)}`);
  const endY = held ? y(sus) : y(0);
  return {
    path,
    fill: `${path} L${xr.toFixed(1)},${bot} L0,${bot} Z`,
    grid: `M0,${y(0.5).toFixed(1)} H${w} M${A.toFixed(1)},0 V${h}`
      + ` M${(A + D).toFixed(1)},0 V${h}`
      + (held ? '' : ` M${(A + D + S).toFixed(1)},0 V${h}`),
    handles: [
      { key: 'attack', x: xa, y: y(1) },
      { key: 'decay', x: xd, y: y(sus) },
      ...(held ? [] : [{ key: 'release', x: xr, y: endY }]),
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
export function envelopeGraph({ rows, read, writeMany, onLive, onStart, onEnd, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  // The box is exactly as tall as the drawing. The shape is computed against `h`, so a
  // container fixed at some other height clips the bottom of the curve — and a clipped
  // envelope reads as one that stops early rather than one that has been cut off.
  box.style.height = `${h}px`;
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  const grid = el('path', { class: 'sfgrid', d: '' });
  const fill = el('path', { class: 'sffill', d: '' });
  const line = el('path', { class: 'sfline', d: '' });
  svg.append(grid, fill, line);
  const dots = (rows.release ? [0, 1, 2] : [0, 1]).map(() => {
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
    onStart?.();
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
      if (i === 2 && rows.release) pairs.push([rows.release, timeAt((px - xs) / R, rows.release)]);
      writeMany(pairs);
      onLive?.(pairs);
      draw();
    };
    move(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onEnd?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  dots.forEach((d, i) => { d.onpointerdown = grab(i); });

  return { box, draw };
}

// ---- a string's ring --------------------------------------------------------

/**
 * FZPP-6's RING card, drawn: how the note dies away. The solid line is the body of the
 * note, reaching silence (−60 dB) at RING; the dashed one is its top end, which goes at
 * RING × HIGHS. One look says whether the string is long or short, mellow or bright —
 * which is what the two pots under it mean, and the reason they are drawn at all
 * (Peter, 23 Oct 2026: "it is not easy to work out what is going to change").
 *
 * Time runs on the square root, as the envelope graph's does, so a short pluck and a
 * long harp note both have room. Drag either end to set it; the pots move with it.
 */
export function decayGraph({ rows, read, writeMany, onLive, onStart, onEnd, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  box.style.height = `${h}px`;
  box.title = 'Solid: how long the note rings. Dashed: how long its highs last. Drag either end.';
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  const grid = el('path', { class: 'sfgrid', d: '' });
  const fill = el('path', { class: 'sffill', d: '' });
  const lows = el('path', { class: 'sfline', d: '' });
  const highs = el('path', { class: 'sfline', d: '', 'stroke-dasharray': '4 3', opacity: 0.75 });
  svg.append(grid, fill, lows, highs);
  const dots = [0, 1].map(() => {
    const c = el('circle', { class: 'sfhandle', r: 4.5, cx: -10, cy: -10 });
    svg.append(c);
    return c;
  });
  box.append(svg);
  const top = 6;
  let w = 200;
  const bot = () => h - 6;
  const max = () => rows.ring.max;
  const xOf = (t) => Math.sqrt(clamp(t / max(), 0, 1)) * (w - 8) + 4;
  const tOf = (x) => ((clamp((x - 4) / (w - 8), 0, 1)) ** 2) * max();
  const draw = () => {
    w = svg.clientWidth || box.clientWidth || 200;
    const ring = Number(read(rows.ring)) || rows.ring.def;
    const frac = Number(read(rows.highs)) || rows.highs.def;
    const xl = xOf(ring);
    const xh = xOf(ring * frac);
    const b = bot();
    let g = '';
    for (const s of [0.1, 1, 5]) g += `M${xOf(s).toFixed(1)},0 V${h} `;
    grid.setAttribute('d', g + `M0,${((top + b) / 2).toFixed(1)} H${w}`);
    lows.setAttribute('d', `M4,${top} L${xl.toFixed(1)},${b}`);
    fill.setAttribute('d', `M4,${top} L${xl.toFixed(1)},${b} L4,${b} Z`);
    highs.setAttribute('d', `M4,${top} L${xh.toFixed(1)},${b}`);
    dots[0].setAttribute('cx', xl.toFixed(1)); dots[0].setAttribute('cy', b);
    dots[1].setAttribute('cx', xh.toFixed(1)); dots[1].setAttribute('cy', b);
  };
  const grab = (i) => (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    onStart?.();
    const rect = svg.getBoundingClientRect();
    const move = (e) => {
      const t = tOf(e.clientX - rect.left);
      const ring = Number(read(rows.ring)) || rows.ring.def;
      const pairs = i === 0
        ? [[rows.ring, quantise(rows.ring, clamp(t, rows.ring.min, rows.ring.max))]]
        : [[rows.highs, quantise(rows.highs, clamp(t / ring, rows.highs.min, rows.highs.max))]];
      writeMany(pairs);
      onLive?.(pairs);
      draw();
    };
    move(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onEnd?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  dots.forEach((d, i) => { d.onpointerdown = grab(i); });
  return { box, draw };
}

// ---- FZPP-6's other three pictures, and the hand's timeline ---------------------
//
// Peter, 23 Oct 2026: "is there a simpler way to do any of the other controls like we did
// for the ring graph which makes it super easy to understand?" Each card of FZPP-6's own
// draws what its pots DO: where the string is plucked, which strings there are, what the
// box sounds like, and when the hand's noises happen. They read the voice as it is now, so
// any pot move — on this card or another — redraws them (`redrawGraphs`).

const txt = (x, y, text, anchor = 'start') => {
  const t = el('text', { x, y, class: 'sfgraphtxt', 'text-anchor': anchor });
  t.textContent = text;
  return t;
};
const fz = (voice) => voice?.fzpp6 || {};
// The pickup pills, as the fraction of the string from the bridge each one sits at — the
// same numbers as the engine (schema PICKUP_AT, then dsp's 0.28 − 0.22 × value).
const PICKUP_VALUE = { acoustic: 0, neck: 0.15, neckMiddle: 0.35, middle: 0.55, middleBridge: 0.75, bridge: 0.95 };
const pickupAt = (voice) => {
  const v = PICKUP_VALUE[fz(voice).string?.pickup] ?? 0;
  return v > 0 ? 0.28 - 0.22 * v : 0;
};

/**
 * PLUCK: the string from the bridge (left) to the neck, pulled out where it is plucked.
 * The corner is sharp for a hard pick and rounded for a fingertip (HARD); drag along the
 * string to move the pluck (WHERE). An electric pickup, when there is one, stands on the
 * string where it sits — so the pluck point and the pickup can be read against each other.
 */
export function pluckGraph({ rows, read, writeMany, onLive, onStart, onEnd, voice, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  box.style.height = `${h}px`;
  box.title = 'The string, bridge to neck, pulled out where it is plucked or bowed. Drag to move WHERE. '
    + 'A sharp corner is a hard pick, a rounded one a fingertip (HARD). For REED and JET: the bore and its bell.';
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  const ends = el('path', { class: 'sfgrid', d: '' });
  const line = el('path', { class: 'sfline', d: '' });
  const pick = el('path', { class: 'sfgrid', d: '', 'stroke-dasharray': '2 3' });
  const pu = el('rect', { class: 'sffill', x: -10, y: 0, width: 6, height: 0 });
  const handle = el('circle', { class: 'sfhandle', r: 4.5, cx: -10, cy: -10 });
  const lb = txt(6, h - 5, 'BRIDGE');
  const ln = txt(0, h - 5, 'NECK', 'end');
  const lp = txt(-50, 10, 'PICKUP', 'middle');
  svg.append(ends, pu, pick, line, handle, lb, ln, lp);
  box.append(svg);
  let w = 200;
  const x0 = 10;
  const x1 = () => w - 10;
  const rest = () => h * 0.62;
  const draw = () => {
    w = svg.clientWidth || box.clientWidth || 200;
    const type = fz(voice?.()).exciter?.type ?? 'pick';
    if (type === 'reed' || type === 'sax' || type === 'jet') {
      // A bore with its bell: no string to pluck. The reed or the jet sits at the left.
      const y0 = rest();
      const x1b = x1();
      line.setAttribute('d', `M${x0},${y0 - 9} H${x1b - 30} Q${x1b - 10},${y0 - 9} ${x1b},${y0 - 22} `
        + `M${x0},${y0 + 9} H${x1b - 30} Q${x1b - 10},${y0 + 9} ${x1b},${y0 + 22}`);
      ends.setAttribute('d', `M${x0},${y0 - 9} V${y0 + 9}`);
      pick.setAttribute('d', '');
      handle.setAttribute('cx', -10);
      pu.setAttribute('x', -10); lp.setAttribute('x', -50);
      lb.textContent = type === 'jet' ? 'JET' : 'REED';
      ln.textContent = 'BELL';
      ln.setAttribute('x', x1b);
      return;
    }
    lb.textContent = 'BRIDGE';
    ln.textContent = 'NECK';
    const where = Number(read(rows.where)) || rows.where.def;
    const hard = Number(read(rows.hard));
    const L = x1() - x0;
    const ax = x0 + where * L;
    const ay = h * 0.2;
    const y0 = rest();
    // Round the corner by up to a fifth of the string for the softest finger.
    const r = (1 - (Number.isFinite(hard) ? hard : 0.6)) * 0.2 * L;
    const t1 = Math.min(1, r / Math.hypot(ax - x0, y0 - ay));
    const t2 = Math.min(1, r / Math.hypot(x1() - ax, y0 - ay));
    const p1x = ax - (ax - x0) * t1, p1y = ay + (y0 - ay) * t1;
    const p2x = ax + (x1() - ax) * t2, p2y = ay + (y0 - ay) * t2;
    line.setAttribute('d', `M${x0},${y0} L${p1x.toFixed(1)},${p1y.toFixed(1)} `
      + `Q${ax.toFixed(1)},${ay} ${p2x.toFixed(1)},${p2y.toFixed(1)} L${x1()},${y0}`);
    ends.setAttribute('d', `M${x0},${y0 - 14} V${y0 + 10} M${x1()},${y0 - 14} V${y0 + 10}`);
    pick.setAttribute('d', `M${ax.toFixed(1)},${ay} V${y0 + 10}`);
    handle.setAttribute('cx', ax.toFixed(1)); handle.setAttribute('cy', ay);
    ln.setAttribute('x', x1());
    const p = pickupAt(voice?.());
    if (p > 0) {
      const px = x0 + p * L;
      pu.setAttribute('x', (px - 3).toFixed(1)); pu.setAttribute('y', y0 - 8); pu.setAttribute('height', 16);
      pu.setAttribute('opacity', '0.5');
      lp.setAttribute('x', px.toFixed(1)); lp.setAttribute('y', 10);
    } else {
      pu.setAttribute('x', -10); lp.setAttribute('x', -50);
    }
  };
  const grab = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    onStart?.();
    const rect = svg.getBoundingClientRect();
    const move = (e) => {
      const frac = clamp((e.clientX - rect.left - x0) / (x1() - x0), rows.where.min, rows.where.max);
      const pairs = [[rows.where, quantise(rows.where, frac)]];
      writeMany(pairs);
      onLive?.(pairs);
      draw();
    };
    move(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      onEnd?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  svg.onpointerdown = grab;
  return { box, draw };
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
const TUNING_NOTES = {
  standard: [40, 45, 50, 55, 59, 64], dropD: [38, 45, 50, 55, 59, 64],
  openG: [38, 43, 50, 55, 59, 62], dadgad: [38, 45, 50, 55, 57, 62],
};

/**
 * CHARACTER: the six strings, low at the bottom, each with its open note — so TUNING is
 * read off the drawing. The three wound strings are thicker. DOUBLE draws each string's
 * partner beside it, BUZZ a rattle at the bridge end, and an electric PICKUP stands across
 * all six where it sits. FREE has no open notes: any pitch goes on any string.
 */
export function stringsGraph({ voice, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  box.style.height = `${h}px`;
  box.title = 'The six strings and their open notes (TUNING). Doubled lines are DOUBLE, a '
    + 'rattle at the bridge end is BUZZ, the bar across them is an electric PICKUP.';
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  box.append(svg);
  const draw = () => {
    const w = svg.clientWidth || box.clientWidth || 200;
    svg.replaceChildren();
    const v = fz(voice?.());
    const tuning = TUNING_NOTES[v.strings?.tuning ?? 'standard'];
    const double = v.string?.double ?? 'off';
    const buzz = Number(v.string?.buzz ?? 0);
    const left = 26;
    const right = w - 26;
    for (let i = 0; i < 6; i++) {
      const y = h - 10 - i * ((h - 20) / 5);
      // Alternate sides, low string on the left: at this height six names in one column
      // would sit on top of each other.
      if (tuning) svg.append(i % 2 ? txt(w - 4, y + 3, noteName(tuning[i]), 'end') : txt(4, y + 3, noteName(tuning[i])));
      const wound = i < 3;
      const s = el('path', { class: 'sfline', d: `M${left},${y.toFixed(1)} H${right}`,
        'stroke-width': wound ? 2.4 : 1.2, opacity: wound ? 0.95 : 0.8 });
      svg.append(s);
      if (double !== 'off') {
        svg.append(el('path', { class: 'sfline', d: `M${left},${(y - 3).toFixed(1)} H${right}`,
          'stroke-width': double === 'octave' ? 0.7 : 1, opacity: 0.55 }));
      }
      if (buzz > 0) {
        let d = `M${left},${y}`;
        const len = 10 + buzz * 30;
        for (let k = 1; k <= 8; k++) d += ` L${(left + (len * k) / 8).toFixed(1)},${(y + (k % 2 ? -1 : 1) * buzz * 3).toFixed(1)}`;
        svg.append(el('path', { class: 'sfline', d, 'stroke-width': 1 }));
      }
    }
    const p = pickupAt(voice?.());
    if (p > 0) {
      const px = left + p * (right - left);
      svg.append(el('rect', { class: 'sffill', x: (px - 4).toFixed(1), y: 4, width: 8, height: h - 8, opacity: 0.5 }));
    }
    if (!tuning) svg.append(txt(w / 2, 12, 'FREE — any note on any string', 'middle'));
  };
  return { box, draw };
}

/**
 * BODY: the box's tone, low to high, the way the FILTER card draws its filter. The peaks
 * are its resonances — the air, the top, and the dense rest of the wood. SIZE slides them
 * all down or up together; MIX lifts the curve off the flat line of the bare string.
 */
export function bodyGraph({ rows, read, voice, modesOf, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  box.style.height = `${h}px`;
  box.title = 'The tone of the box, low notes left, high right. Each peak is a resonance. '
    + 'SIZE slides them all, MIX is how much of it you hear.';
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  const grid = el('path', { class: 'sfgrid', d: '' });
  const fill = el('path', { class: 'sffill', d: '' });
  const line = el('path', { class: 'sfline', d: '' });
  svg.append(grid, fill, line, txt(4, h - 4, '100'), txt(0, h - 4, '1k', 'middle'), txt(0, h - 4, '10k', 'end'));
  box.append(svg);
  const draw = () => {
    const w = svg.clientWidth || box.clientWidth || 200;
    const v = fz(voice?.());
    const type = v.body?.type ?? 'steel';
    const mix = type === 'none' ? 0 : Number(read(rows.mix) ?? 0.8);
    const modes = type === 'none' ? [] : modesOf({ type, size: Number(read(rows.size) ?? 1), modes: null });
    const xs = (f) => (Math.log(f / 50) / Math.log(12000 / 50)) * w;
    const pts = [];
    let top = -Infinity;
    for (let i = 0; i <= 120; i++) {
      const f = 50 * (12000 / 50) ** (i / 120);
      let re = 0, im = 0;
      for (let m = 0; m < modes.length; m += 3) {
        const x = f / modes[m];
        const q = modes[m + 1];
        const a = 1 - x * x, b = x / q;
        const d = a * a + b * b;
        re += modes[m + 2] * (b * b) / d;
        im += modes[m + 2] * (b * a) / d;
      }
      re = (1 - mix) + mix * re;
      im *= mix;
      const db = 20 * Math.log10(Math.max(1e-4, Math.hypot(re, im)));
      top = Math.max(top, db);
      pts.push([xs(f), db]);
    }
    const span = 36;
    const y = (db) => 6 + (Math.max(0, (top - db)) / span) * (h - 20);
    const d = pts.map(([x, db], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${Math.min(h - 14, y(db)).toFixed(1)}`).join(' ');
    line.setAttribute('d', d);
    fill.setAttribute('d', `${d} L${w},${h - 14} L0,${h - 14} Z`);
    grid.setAttribute('d', `M${xs(100).toFixed(1)},0 V${h - 14} M${xs(1000).toFixed(1)},0 V${h - 14} M${xs(10000).toFixed(1)},0 V${h - 14}`);
    const labels = svg.querySelectorAll('.sfgraphtxt');
    labels[0].setAttribute('x', (xs(100) + 2).toFixed(1));
    labels[1].setAttribute('x', xs(1000).toFixed(1));
    labels[2].setAttribute('x', (xs(10000) - 2).toFixed(1));
  };
  return { box, draw };
}

/**
 * HAND NOISES: one note, left to right, and where each noise falls on it. FRET ticks as
 * the string lands, SQUEAK is the slide to the next fret, LIFT the scratch as the hand
 * lets go; MUTE shortens the note itself, and CHUCK is the short, choked stroke a soft note
 * becomes. Each mark is as big as its pot — at zero it is not drawn.
 */
export function handGraph({ voice, h = 94 }) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  box.style.height = `${h}px`;
  box.title = 'One note and where each hand noise falls on it: FRET at the start, SQUEAK on a '
    + 'slide, LIFT at the end. MUTE shortens the note; CHUCK is the short muted stroke.';
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  box.append(svg);
  const draw = () => {
    const w = svg.clientWidth || box.clientWidth || 200;
    svg.replaceChildren();
    const d = fz(voice?.()).damping || {};
    const mute = Number(d.mute ?? 0), fret = Number(d.fret ?? 0), squeak = Number(d.squeak ?? 0);
    const lift = Number(d.lift ?? 0), chuck = Number(d.mutedBelow ?? 0);
    const base = h - 22;
    const x0 = 10;
    const end = x0 + (w * 0.68 - x0) * (1 - 0.75 * mute);
    // The note: loud at the strike, falling away.
    svg.append(el('path', { class: 'sffill', d: `M${x0},${base} L${x0},${base - 30} L${end.toFixed(1)},${base - 6} L${end.toFixed(1)},${base} Z` }));
    svg.append(el('path', { class: 'sfline', d: `M${x0},${base - 30} L${end.toFixed(1)},${base - 6}` }));
    svg.append(txt(x0, h - 6, 'NOTE'));
    if (fret > 0) {
      svg.append(el('path', { class: 'sfline', d: `M${x0},${base} V${(base - 30 - 26 * fret).toFixed(1)}`, 'stroke-width': 2 }));
      svg.append(txt(x0 + 4, 10, 'FRET'));
    }
    if (squeak > 0) {
      const sx = x0 + (end - x0) * 0.45;
      let p = `M${sx},${base - 18}`;
      for (let k = 1; k <= 10; k++) p += ` L${(sx + k * 3).toFixed(1)},${(base - 18 - (k % 2 ? 1 : -1) * 6 * squeak - k * 1.2 * squeak).toFixed(1)}`;
      svg.append(el('path', { class: 'sfline', d: p, 'stroke-width': 1.2 }));
      svg.append(txt(sx, 10, 'SQUEAK'));
    }
    if (lift > 0) {
      let p = `M${end.toFixed(1)},${base}`;
      for (let k = 1; k <= 6; k++) p += ` L${(end + k * 2.5).toFixed(1)},${(base - (k % 2 ? 1 : 0.3) * 18 * lift).toFixed(1)}`;
      svg.append(el('path', { class: 'sfline', d: p, 'stroke-width': 1.2 }));
      svg.append(txt(end, h - 6, 'LIFT', 'middle'));
    }
    if (chuck > 0) {
      const cx = w * 0.84;
      svg.append(el('path', { class: 'sffill', d: `M${cx},${base} L${cx},${base - 22} L${cx + 9},${base} Z` }));
      svg.append(el('path', { class: 'sfline', d: `M${cx},${base} L${cx},${base - 22} L${cx + 9},${base}` }));
      svg.append(txt(cx + 4, h - 6, 'CHUCK', 'middle'));
    }
  };
  return { box, draw };
}

// ---- the filter response ----------------------------------------------------

/** Where a frequency sits across a log axis from 20 Hz to 20 kHz. */
export const fx = (f, w) => (Math.log(clamp(f, 20, 20000) / 20) / Math.log(1000)) * w;
export const fxInv = (x, w) => 20 * (1000 ** clamp(x / w, 0, 1));

/**
 * How each engine BUILDS the filter its card describes — because the same four numbers
 * do not make the same filter everywhere, and a curve drawn from the numbers alone was a
 * picture of a filter nobody plays. Measured, not assumed: work/local/_synth-audit
 * renders every engine's filter and compares it with this drawing.
 *
 *   qDb       LOWPASS and HIGHPASS read RESONANCE in DECIBELS. That is Web Audio's
 *             BiquadFilterNode, by specification, and MRDR-3's worklet port of it
 *             (src/engine/mrdr3/primitives.js): a RESONANCE of 4 is a 4 dB peak, a linear
 *             Q of 10^(4/20) = 1.58 — not the 12 dB a linear 4 would be. Bandpass and notch
 *             read it linearly on every engine.
 *   follower  the LINEAR Q of every stage after the first in a cascade. `null` repeats
 *             the first stage's: Tone's Filter fans Q into every stage, so CRLS-1's
 *             resonant -24 peaks twice over. A number is a fixed stage behind a resonant
 *             first one, and on all three of the others it is a true Butterworth stage:
 *             `_filterChain` (MRDR-3, KNDO-5) and MRDR-3's worklet set −3.0103 dB on a
 *             lowpass or highpass (which those read in dB) and 0.7071 on a bandpass or
 *             notch (read linearly) — 1/√2 either way; TNGR-2's SVF sets 1/√2 directly.
 *             Until 15 Oct 2026 the biquad followers were 0.7071 read as dB, linear
 *             1.085, and this drew them that way.
 *   skirt     the bandpass peaks at Q rather than at 0 dB — TNGR-2's state-variable band
 *             tap (src/engine/tngr2/dsp.js), where the biquad's bandpass is normalised.
 */
export const FILTER_MODELS = {
  // MRDR-3 (native and worklet) and KNDO-5.
  biquad: { qDb: true, follower: Math.SQRT1_2, skirt: false },
  // CRLS-1, and the Filter effect: a Tone.Filter.
  tone: { qDb: true, follower: null, skirt: false },
  // TNGR-2.
  svf: { qDb: false, follower: Math.SQRT1_2, skirt: true },
};

/** Which of those an engine's filter card is drawn with. */
export const filterModelOf = (synth) => {
  const family = synthFamily(synth);
  if (family === TNGR2) return 'svf';
  if (family === CRLS1) return 'tone';
  return 'biquad';
};

/** -12 is one stage, -24 two in series, -48 four — the engines' own count. */
const stagesOf = (slope) => {
  const n = Math.abs(Number(slope) || 12);
  return n >= 48 ? 4 : (n >= 24 ? 2 : 1);
};

/**
 * A filter's magnitude at frequency `f`, as the four types the desk offers, in dB.
 *
 * Each stage is the textbook analogue prototype rather than the exact digital response —
 * this is a picture of what the filter is doing, drawn beside the controls doing it. The
 * bilinear warping is the one thing it leaves out, and it only bends the top of the range:
 * within a dB below 5 kHz, more above a high cutoff (measured, ~8 dB at 11 kHz on a 4 kHz
 * resonant -24). A cascade is drawn stage by stage, each with the Q its engine really
 * gives it (see FILTER_MODELS), and the stages' decibels add.
 */
export function magnitudeDb(f, { cutoff, Q, type, slope, model = 'biquad' }) {
  const m = FILTER_MODELS[model] || FILTER_MODELS.biquad;
  const w = f / cutoff;
  const w2 = w * w;
  const dbQ = m.qDb && (type === 'lowpass' || type === 'highpass' || !type);
  let db = 0;
  for (let s = 0, n = stagesOf(slope); s < n; s++) {
    // The first stage's RESONANCE is in the card's units; a follower is stated linear.
    const q = s === 0 || m.follower == null
      ? Math.max(1e-4, dbQ ? 10 ** (Q / 20) : Q)
      : m.follower;
    const den = Math.sqrt((1 - w2) ** 2 + (w / q) ** 2) || 1e-6;
    const mag = type === 'highpass' ? w2 / den
      : type === 'bandpass' ? (m.skirt ? w : w / q) / den
        : type === 'notch' ? Math.abs(1 - w2) / den
          : 1 / den;
    db += 20 * Math.log10(Math.max(mag, 1e-4));
  }
  return clamp(db, -45, 24);
}

/**
 * The response graph, bound to CUTOFF and RESONANCE (and reading TYPE and SLOPE).
 *
 * One handle moves both: x is the cutoff, y is the resonance. That is the gesture a
 * filter actually wants — you are aiming at a corner, not setting two numbers — and it is
 * why `writeMany` exists.
 *
 * `model` names how the engine builds the filter (FILTER_MODELS), or is a function that
 * says so at draw time — a window that can switch preset under its graph asks each time.
 */
export function responseGraph({
  rows, read, writeMany, onLive, onStart, onEnd, h = 94, model = 'biquad',
}) {
  const box = document.createElement('div');
  box.className = 'sfgraph';
  box.style.height = `${h}px`;
  const svg = el('svg', { width: '100%', height: h, preserveAspectRatio: 'none' });
  const grid = el('path', { class: 'sfgrid', d: '' });
  const fill = el('path', { class: 'sffill', d: '' });
  const line = el('path', { class: 'sfline', d: '' });
  const dot = el('circle', { class: 'sfhandle', r: 4.5, cx: -10, cy: -10 });
  svg.append(grid, fill, line, dot);
  box.append(svg);
  box.title = 'Drag to move the cutoff and its resonance together';

  const yd = (db) => (h - 4) * (1 - (db + 42) / 66) + 2;
  // A log axis needs a non-zero bottom, and a RESONANCE row is allowed to start at zero.
  // Its own step is the smallest number that row can mean, so that is the floor.
  const qMin = Math.max(rows.Q.min, rows.Q.step || 0.01);
  // Resonance rides a log axis up the box, the same shape its pot's taper has.
  const qy = (q) => (h - 8) * (1 - Math.log(clamp(q, qMin, rows.Q.max) / qMin)
    / Math.log(rows.Q.max / qMin)) + 4;
  const qAt = (y) => qMin * ((rows.Q.max / qMin)
    ** clamp(1 - (y - 4) / (h - 8), 0, 1));

  let w = 200;
  const draw = () => {
    w = svg.clientWidth || box.clientWidth || 200;
    const spec = {
      cutoff: read(rows.freq) ?? rows.freq.def,
      Q: read(rows.Q) ?? rows.Q.def,
      type: read(rows.type) ?? rows.type.def,
      // No SLOPE row means the card has no slope to choose: one native biquad stage,
      // which is -12 dB per octave.
      slope: rows.slope ? Number(read(rows.slope) ?? rows.slope.def) : -12,
      model: typeof model === 'function' ? model() : model,
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
    onStart?.();
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
      window.removeEventListener('pointercancel', up);
      onEnd?.();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return { box, draw };
}
