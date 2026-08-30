// The desk's control widgets — the pieces every panel is built out of.
//
// A pot, a pan pot, a typable dB field, and the four rows (check, division, option,
// radio) that carry a labelled control. Lifted out of mixer-entry.js, where they sat
// under the `device panel` banner because that is the panel that needed them first —
// but the synth editor, the Channel EQ, the effect catalogue and the audio settings all
// build themselves out of these, and none of them knows anything about an effect chain.
//
// The one thing the kit cannot supply itself is the drag gesture: `dragNumber` is the
// desk's, shared with controls that are not built here.

/** The same clamp the desk uses. Copied rather than passed: it is one expression. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---- the seam ---------------------------------------------------------------
let dragNumber;

/** Hand the kit the pointer gesture its typable fields ride on. */
export function installControls(deps) { ({ dragNumber } = deps); }

// Readable names for parameters whose internal keys are terse. The Channel EQ's bands
// keep their entries even though the EQ now draws its own labels — a bar-effects
// summary line and the preset diff still name parameters through this table.
const PARAM_LABELS = {
  f1: 'LOW FREQ', g1: 'LOW GAIN',
  f2: 'LOW-MID FREQ', g2: 'LOW-MID GAIN', q2: 'LOW-MID Q',
  f3: 'HIGH-MID FREQ', g3: 'HIGH-MID GAIN', q3: 'HIGH-MID Q',
  f4: 'HIGH FREQ', g4: 'HIGH GAIN',
  // One word for a left/right control across the whole catalogue: BALANCE. The KEYS
  // differ — `pan` on the Advanced Delay, `dryPan`/`wetPan` on the Doubler, `balance`
  // on the Gain — because they are what saved mixes hold and renaming them would read
  // as a reset of every song carrying one. What is on the card is what has to be
  // consistent, and two names for one gesture is what sent you looking for the pan
  // control on an effect that called it something else.
  wet: 'WET / DRY', mix: 'MIX', pan: 'BALANCE', balance: 'BALANCE', tone: 'DAMPING',
  feedback: 'FEEDBACK', delayMs: 'TIME', frequency: 'RATE', depth: 'DEPTH',
  baseFrequency: 'BASE FREQ', octaves: 'OCTAVES', distortion: 'DRIVE',
  order: 'ORDER', width: 'WIDTH', pitch: 'PITCH', windowSize: 'WINDOW',
  detune: 'DETUNE', dryPan: 'DRY BALANCE', wetPan: 'WET BALANCE',
  decay: 'DECAY', preDelay: 'PRE-DELAY', threshold: 'THRESHOLD', ratio: 'RATIO',
  attack: 'ATTACK', release: 'RELEASE', spread: 'SPREAD', sensitivity: 'SENSITIVITY',
  delayTime: 'TIME', Q: 'Q', knee: 'KNEE',
  bits: 'BITS', bias: 'BIAS', density: 'DENSITY', gateLength: 'GATE LENGTH',
  wow: 'WOW', flutter: 'FLUTTER', waveform: 'WAVEFORM',
  lowFrequency: 'LOW X-OVER', highFrequency: 'HIGH X-OVER',
  ceiling: 'OUT CEILING', lookahead: 'LOOKAHEAD', arc: 'Auto Release (ARC)',
  inputGain: 'INPUT', outputGain: 'OUTPUT',
  pump: 'PUMP',
};

/**
 * A parameter's label. Dotted names are labelled a part at a time — `low.threshold`
 * reads LOW THRESHOLD — so the three bands of a multiband compressor need one entry
 * for THRESHOLD between them rather than one per band.
 */
const paramLabel = (p, def = null) => def?.labels?.[p] || PARAM_LABELS[p] || p.split('.')
  .map((s) => PARAM_LABELS[s] || s.replace(/([A-Z])/g, ' $1').toUpperCase())
  .join(' ');

/**
 * Make a dB readout typable, so a level can be entered exactly rather than nudged
 * to it. Double-click still resets, and the Reset channel button is untouched.
 *
 * `ctl` is the level in dB — `{ get, set, min, max, step }` — and not the slider
 * itself, because the slider under a tapered fader holds a position rather than a
 * level. What is typed is what is applied: the position follows, and never the other
 * way round, so a typed −3.0 stays −3.0 and does not come back as whatever the
 * nearest position rounds to.
 */
function makeTypableDb(el, ctl, apply, fmt) {
  el.classList.add('typable');
  el.title = 'Drag to set the level · click to type it · double-click to reset';
  const put = (x) => { const v = clamp(x, ctl.min, ctl.max); ctl.set(v); apply(v); return v; };
  const openEditor = () => {
    if (el.querySelector('input')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein';
    box.value = String(ctl.get());
    el.textContent = '';
    el.append(box);
    box.focus(); box.select();
    const done = (commit) => {
      const n = parseFloat(box.value);
      const v = commit && Number.isFinite(n) ? put(n) : ctl.get();
      el.textContent = fmt(v);
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true);
      else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  };
  dragNumber(el, {
    value: () => ctl.get(),
    set: put,
    range: ctl.max - ctl.min,
    step: ctl.step,
    onClick: openEditor,
  });
}

/**
 * A circular pan pot, as on a Logic channel strip. Drag anywhere on it — vertical
 * or horizontal, whichever your hand does — and the arc fills from centre toward
 * the side you are heading. A horizontal slider reads as a position on a line; a
 * pot reads as a position in the room, which is what pan actually is.
 */
function panKnob({ value, onInput }) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'panpot');
  // Full grey track first, green arc drawn over it from the top centre — the
  // Logic layout. The number lives inside the ring, so the knob needs no label
  // and no separate readout: 0 in the middle with no arc IS "centred".
  const track = document.createElementNS(NS, 'path');
  track.setAttribute('class', 'pottrack');
  const arc = document.createElementNS(NS, 'path');
  arc.setAttribute('class', 'potarc');
  const face = document.createElementNS(NS, 'circle');
  face.setAttribute('cx', 22); face.setAttribute('cy', 22); face.setAttribute('r', 13);
  face.setAttribute('class', 'potface');
  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 22); label.setAttribute('y', 22);
  label.setAttribute('class', 'pottext');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('dominant-baseline', 'central');
  svg.append(track, arc, face, label);

  let val = value;
  const SWEEP = 145;                       // degrees either side of top centre
  const R = 18;
  const pt = (deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [22 + Math.cos(a) * R, 22 + Math.sin(a) * R];
  };
  const arcPath = (fromDeg, toDeg) => {
    const [x1, y1] = pt(fromDeg); const [x2, y2] = pt(toDeg);
    const big = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    const sweep = toDeg > fromDeg ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${big} ${sweep} ${x2} ${y2}`;
  };
  track.setAttribute('d', arcPath(-SWEEP, SWEEP));

  const draw = () => {
    const deg = val * SWEEP;
    arc.setAttribute('d', Math.abs(val) < 0.005 ? '' : arcPath(0, deg));
    const n = Math.round(val * 100);
    label.textContent = n === 0 ? '0' : (n > 0 ? '+' : '') + n;
  };
  draw();

  const set = (x) => { val = clamp(x, -1, 1); draw(); onInput(val); };
  let dragging = false, lastX = 0, lastY = 0, moved = 0, fromLabel = false;
  svg.addEventListener('pointerdown', (e) => {
    // The number drags the knob like the rest of the pot does; a click that never
    // moved opens the type-in instead. Dragging over it used to select the text.
    if (holder.querySelector('.typein')) return;
    dragging = true; moved = 0; fromLabel = e.target === label;
    lastX = e.clientX; lastY = e.clientY;
    svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = lastY - e.clientY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    lastX = e.clientX; lastY = e.clientY;
    // Whichever axis moved more wins, so neither grip feels wrong. Shift is fine.
    const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * (e.shiftKey ? 0.002 : 0.008);
    set(val + delta);
  });
  const stop = () => {
    if (dragging && fromLabel && moved < 3) openPanEditor();
    dragging = false;
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  svg.addEventListener('dblclick', () => set(0));
  svg.title = 'Drag to pan · click the number to type · double-click to centre';

  // Type an exact value. The readout lives inside the SVG, so the editor is an HTML
  // input laid over the knob rather than a foreignObject — simpler, and it inherits
  // the same styling as every other type-in on the desk.
  const holder = document.createElement('div');
  holder.className = 'panholder';
  holder.append(svg);
  function openPanEditor() {
    if (holder.querySelector('.typein')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein panin';
    box.value = String(Math.round(val * 100));
    holder.append(box); box.focus(); box.select();
    let closed = false;
    const done = (commit) => {
      if (closed) return;          // blur fires after Enter has already removed it
      closed = true;
      const n = parseFloat(box.value);
      box.remove();
      if (commit && Number.isFinite(n)) set(clamp(n / 100, -1, 1));
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  }

  // The knob alone: the caller owns the row, because mute and solo share it.
  return { el: holder, set: (x) => { val = x; draw(); } };
}

/**
 * The same knob, sweeping from one end instead of from the centre.
 *
 * `panKnob` is bipolar because pan is: nothing is the middle, and the arc growing
 * either way from top-dead-centre is the whole reading. An attack time has no middle —
 * it has a floor — so this fills from the left stop, which is the pot on every synth
 * ever built.
 *
 * Returns the same shape `slider` does (`{ wrap, label, set }`), so a caller can swap
 * one for the other without knowing which it has.
 */
function knob({ min, max, step, value, fmt, onInput, reset, scale = 1, origin = null,
  taper = null, floor = 0, onStart = null, onEnd = null }) {
  const NS = 'http://www.w3.org/2000/svg';
  const wrap = document.createElement('div');
  wrap.className = 'row potrow';
  const k = document.createElement('span'); k.className = 'k';
  const holder = document.createElement('div'); holder.className = 'panholder';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'panpot vepot');
  const track = document.createElementNS(NS, 'path'); track.setAttribute('class', 'pottrack');
  const arc = document.createElementNS(NS, 'path'); arc.setAttribute('class', 'potarc');
  const face = document.createElementNS(NS, 'circle');
  face.setAttribute('cx', 22); face.setAttribute('cy', 22); face.setAttribute('r', 13);
  face.setAttribute('class', 'potface');
  const text = document.createElementNS(NS, 'text');
  text.setAttribute('x', 22); text.setAttribute('y', 22);
  text.setAttribute('class', 'pottext');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  svg.append(track, arc, face, text);
  holder.append(svg);
  wrap.append(k, holder);

  const SWEEP = 145;                       // degrees either side of top centre
  const R = 18;
  const pt = (deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [22 + Math.cos(a) * R, 22 + Math.sin(a) * R];
  };
  const arcPath = (fromDeg, toDeg) => {
    const [x1, y1] = pt(fromDeg); const [x2, y2] = pt(toDeg);
    const big = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    const sweep = toDeg > fromDeg ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${big} ${sweep} ${x2} ${y2}`;
  };
  track.setAttribute('d', arcPath(-SWEEP, SWEEP));

  // A scale above one gives the low end more physical travel without changing the
  // stored range. Envelope times opt into this shared response; ordinary desk knobs
  // remain linear because their values do not represent elapsed time.
  const curve = Number.isFinite(scale) && scale > 0 ? scale : 1;
  // A BIPOLAR pot tapers about its origin, not across the span. Curving the whole range
  // would drag the centre detent off twelve o'clock — on -10..+10 at curve 3 the middle
  // of the travel reads -7.5 — so each side gets the response applied to its own distance
  // from the origin instead, and zero stays where the eye expects it. Only the two
  // together take this path: without an origin, or at curve 1, the arithmetic below is
  // the linear one it has always been.
  const bipolar = Number.isFinite(origin) && curve !== 1;
  // A TIME pot is dialled in ratios, not in fractions of its ceiling: 5ms to 10ms is the
  // same move as 1s to 2s, and no exponent says that. `taper: 'log'` spends the travel
  // evenly per decade instead — with `floor` as the smallest length it reaches, and the
  // left stop still landing on `min`, so a stage that may be switched off can be.
  const logTaper = taper === 'log' && max > 0;
  const logLo = logTaper ? Math.max(min, floor > 0 ? floor : step, 1e-6) : 0;
  const logSpan = logTaper ? Math.log(max / logLo) : 0;
  const originFrac = (max - min) ? clamp((origin - min) / (max - min), 0, 1) : 0;
  const valueAt = (position) => {
    const pos = clamp(position, 0, 1);
    if (logTaper) return pos <= 0 ? min : logLo * Math.exp(logSpan * pos);
    if (!bipolar) return min + (max - min) * Math.pow(pos, curve);
    if (pos >= originFrac) {
      const f = originFrac >= 1 ? 0 : (pos - originFrac) / (1 - originFrac);
      return origin + (max - origin) * Math.pow(f, curve);
    }
    const f = originFrac <= 0 ? 0 : (originFrac - pos) / originFrac;
    return origin - (origin - min) * Math.pow(f, curve);
  };
  const positionAt = (x) => {
    if (logTaper) {
      const t = clamp(x, min, max);
      // Anything at or under the floor — including a true zero — sits at the stop.
      return t <= logLo ? 0 : clamp(Math.log(t / logLo) / logSpan, 0, 1);
    }
    if (!bipolar) {
      const frac = (max - min) ? clamp((x - min) / (max - min), 0, 1) : 0;
      return Math.pow(frac, 1 / curve);
    }
    const v = clamp(x, min, max);
    if (v >= origin) {
      const span = max - origin;
      return originFrac + (1 - originFrac) * Math.pow(span > 0 ? (v - origin) / span : 0, 1 / curve);
    }
    const span = origin - min;
    return originFrac - originFrac * Math.pow(span > 0 ? (origin - v) / span : 0, 1 / curve);
  };
  // Where the arc grows FROM. Left stop for everything with a floor — an attack time,
  // a level — and the centre for a bipolar control, which is `panKnob`'s reading applied
  // to a pot that still has a min, a max and a step: on a pitch AMOUNT, up and down are
  // opposite directions and an arc that fills leftward from the middle says so at a
  // glance, where a left-filled one says "a bit under half".
  const originPos = Number.isFinite(origin) ? positionAt(clamp(origin, min, max)) : 0;
  const originDeg = -SWEEP + originPos * SWEEP * 2;
  let val = clamp(value, min, max);
  let position = positionAt(val);
  const draw = () => {
    const deg = -SWEEP + position * SWEEP * 2;
    // Nothing to draw at the origin — an arc of zero length still paints a round cap,
    // which reads as a value slightly off it rather than as the value itself.
    arc.setAttribute('d', Math.abs(position - originPos) < 0.004 ? '' : arcPath(originDeg, deg));
    text.textContent = fmt(val);
  };
  draw();

  const set = (x) => {
    onStart?.();
    const stepped = Math.round(x / step) * step;
    const next = clamp(Number(stepped.toFixed(6)), min, max);
    // A pot held against its stop still takes every pointer move — you are past the end
    // of the travel and the hand keeps going — and each one was passed on as an edit of
    // a value that had not moved. Dozens a second of re-writing the preset, rebuilding
    // the rack and re-levelling it, for nothing anyone could hear.
    //
    // Only inside a DRAG. A click, a reset or a type-in still writes its value through
    // even when it matches what is showing: those are a hand saying "this one", and a
    // derived row can put a number somewhere the pot's own reading does not show.
    if (dragging && next === val) return;
    val = next;
    position = positionAt(val);
    draw();
    onInput(val);
    if (!dragging) onEnd?.();
  };
  const setPosition = (x) => set(valueAt(x));

  // The drag accumulates in its own unstepped position, not in `position`: `set`
  // rounds to the step and re-derives `position` from the result, so on a coarse pot
  // (UNISON is four steps across the whole sweep) each few-pixel move would round
  // back to where it started and the pot could never leave its value.
  let dragging = false, lastX = 0, lastY = 0, moved = 0, fromText = false, dragPos = 0;
  svg.addEventListener('pointerdown', (e) => {
    if (holder.querySelector('.typein')) return;
    dragging = true; moved = 0; fromText = e.target === text; dragPos = position;
    lastX = e.clientX; lastY = e.clientY;
    svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = lastY - e.clientY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    lastX = e.clientX; lastY = e.clientY;
    // Whichever axis moved more wins, so neither grip feels wrong. A full sweep in
    // about 150px, a fifth of that with shift — the same feel as the desk's faders.
    const px = Math.abs(dx) > Math.abs(dy) ? dx : dy;
    dragPos = clamp(dragPos + (px / 150) * (e.shiftKey ? 0.2 : 1), 0, 1);
    setPosition(dragPos);
  });
  const stop = () => {
    if (dragging && fromText && moved < 3) openEditor();
    dragging = false;
    onEnd?.();
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  svg.addEventListener('dblclick', () => set(reset));
  svg.title = 'Drag to change · click the number to type · double-click to reset';

  function openEditor() {
    if (holder.querySelector('.typein')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein panin';
    box.value = String(val);
    holder.append(box); box.focus(); box.select();
    let closed = false;
    const done = (commit) => {
      if (closed) return;            // blur fires after Enter has already removed it
      closed = true;
      const n = parseFloat(box.value);
      box.remove();
      if (commit && Number.isFinite(n)) set(n);
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  }

  // Click the label to reset, the way every slider on the desk does.
  k.classList.add('resettable');
  k.title = `Reset to ${fmt(reset)}`;
  k.addEventListener('click', () => set(reset));

  return { wrap, label: k, set: (x) => { val = clamp(x, min, max); position = positionAt(val); draw(); } };
}

/** A one-line labelled switch, using the synth editor's capsule around a real checkbox. */
function checkRow(label, checked, onChange) {
  const row = document.createElement('label');
  row.className = 'checkrow';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = !!checked;
  const sw = document.createElement('span');
  sw.className = `fxswitch${box.checked ? ' on' : ''}`;
  sw.setAttribute('aria-hidden', 'true');
  sw.append(document.createElement('i'));
  box.onchange = () => {
    sw.classList.toggle('on', box.checked);
    onChange(box.checked);
  };
  const t = document.createElement('span');
  t.textContent = label;
  row.append(box, sw, t);
  return row;
}


/**
 * What a dropdown entry reads as. The value is the engine's — a BiquadFilter's type
 * is the string 'lowpass' and nothing else — so the capital goes on at the last
 * moment, on the label alone, and never on what gets stored or sent to the node.
 */
const optionLabel = (s) => String(s).replace(/\b[a-z]/g, (c) => c.toUpperCase());

/**
 * A select row with a live readout, for parameters that are a note division rather
 * than a number — the delay's time, an LFO's rate.
 *
 * A division is still a select, but it occupies the same two-line footprint as every
 * other effect control: label and derived readout on the head line, select underneath.
 * The old one-line exception put RATE/TIME's select at the top of the card while the
 * neighbouring sliders and named choices put their controls underneath their labels.
 * Keeping the value in the head makes the row's rhythm legible without sacrificing the
 * useful Hz/seconds readout.
 */
function divisionRow(label, divisions, value, fmt, onChange) {
  const row = document.createElement('div'); row.className = 'row fxselectrow';
  const hd = document.createElement('div'); hd.className = 'head';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  const v = document.createElement('span'); v.className = 'v';
  hd.append(k, v);
  const sel = document.createElement('select'); sel.className = 'fxsel';
  for (const [name, beats] of Object.entries(divisions)) {
    const o = document.createElement('option');
    o.value = String(beats); o.textContent = optionLabel(name);
    if (Math.abs(beats - value) < 1e-6) o.selected = true;
    sel.append(o);
  }
  const show = () => { v.textContent = fmt(+sel.value); };
  show();
  sel.onchange = () => { show(); onChange(+sel.value); };
  row.append(hd, sel);
  return row;
}

/**
 * A named choice — a filter's shape, anything else that is a list not a range.
 *
 * `texts` renames an entry without renaming the VALUE behind it, which the PRESET row
 * is the one caller of: `Default` is the word for the state a card starts in, and the
 * EQs would rather call theirs `Flat`, which is what it sounds like. The stored value
 * stays `Default` — it is what `matchEffectPreset` returns and what the row is set to.
 */
function optionRow(label, options, value, onChange, texts = null) {
  const row = document.createElement('div'); row.className = 'row fxselectrow';
  const hd = document.createElement('div'); hd.className = 'head';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  hd.append(k);
  const sel = document.createElement('select'); sel.className = 'fxsel';
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = texts?.[o] ?? optionLabel(o);
    if (o === value) opt.selected = true;
    sel.append(opt);
  }
  sel.onchange = () => onChange(sel.value);
  row.select = sel;
  row.append(hd, sel);
  return row;
}

/** A visible mutually-exclusive choice, matching the preset editor's segmented radio row. */
function radioRow(label, options, value, onChange) {
  const row = document.createElement('div'); row.className = 'row fxradio';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  const seg = document.createElement('div'); seg.className = 'seg';
  const offered = options.some((option) => String(option) === String(value))
    ? options : [value, ...options];
  for (const option of offered) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `segbtn${String(option) === String(value) ? ' on' : ''}`;
    button.textContent = optionLabel(option);
    button.onclick = () => {
      if (String(option) === String(value)) return;
      value = option;
      for (const other of seg.children) {
        other.classList.toggle('on', other === button);
      }
      onChange(option);
    };
    seg.append(button);
  }
  row.append(k, seg);
  return row;
}


// PARAM_LABELS and optionLabel stay in: nothing outside asks for either, and both are
// only ever read through the rows above them.
export { paramLabel, makeTypableDb, panKnob, knob, checkRow, divisionRow, optionRow, radioRow };
