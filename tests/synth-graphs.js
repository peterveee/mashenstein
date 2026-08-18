// The Advanced editor's graphs are a second grip on existing pots. This suite keeps the
// arithmetic and the two live-update contracts honest without needing a browser layout:
// graph gestures write rows and report the same pairs to the sibling-pot setter, while a
// graph redraw always reads the current row values.
import { readFileSync } from 'node:fs';
import { envelopeGraph, envShape, responseGraph } from '../tools/mixer-synth-graphs.js';

let failed = 0;
const fail = (msg) => { failed++; console.log(`FAIL: ${msg}`); };
const ok = (msg) => console.log(`ok: ${msg}`);
const assert = (condition, msg) => (condition ? ok(msg) : fail(msg));

class Node {
  constructor() {
    this.children = [];
    this.attributes = {};
    this.style = {};
    this.clientWidth = 240;
    this.clientHeight = 94;
  }

  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight };
  }
}

const windowHandlers = new Map();
globalThis.document = {
  createElement: () => new Node(),
  createElementNS: () => new Node(),
};
globalThis.window = {
  addEventListener: (name, fn) => windowHandlers.set(name, fn),
  removeEventListener: (name) => windowHandlers.delete(name),
};

const row = (path, min, max, step, def) => ({ path, min, max, step, def });
const envRows = {
  attack: row('attack', 0, 10, 0.01, 0.1),
  decay: row('decay', 0, 10, 0.01, 0.2),
  sustain: row('sustain', 0, 1, 0.01, 0.5),
  release: row('release', 0, 10, 0.01, 0.3),
};
const values = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.3 };
const read = (r) => values[r.path];
const event = (clientX, clientY) => ({
  clientX, clientY, preventDefault() {}, stopPropagation() {},
});

// Pot → graph: changing the shared row values and redrawing changes the SVG, without
// introducing another value store in the graph.
const before = envShape({ rows: envRows, read, w: 240, h: 94 }).path;
values.attack = 2.5;
values.sustain = 0.8;
const after = envShape({ rows: envRows, read, w: 240, h: 94 }).path;
assert(before !== after, 'an envelope graph redraw reads changed pot values');

// Graph → pot: the envelope decay handle moves both DECAY and SUSTAIN, and the live
// callback receives exactly the pairs that the editor must use to move the pot needles.
let envelopeWrites = [];
let envelopeLive = [];
const envelope = envelopeGraph({
  rows: envRows,
  read,
  writeMany: (pairs) => {
    envelopeWrites = pairs;
    pairs.forEach(([r, x]) => { values[r.path] = x; });
  },
  onLive: (pairs) => { envelopeLive = pairs; },
});
envelope.draw();
// SVG children: grid, fill, line, attack handle, decay handle, release handle.
envelope.box.children[0].children[4].onpointerdown(event(135, 25));
assert(envelopeWrites.some(([r]) => r === envRows.decay)
  && envelopeWrites.some(([r]) => r === envRows.sustain),
  'the envelope graph writes DECAY and SUSTAIN together');
assert(envelopeLive === envelopeWrites,
  'the envelope graph sends the written pairs to the sibling pots');

const filterRows = {
  freq: row('freq', 20, 20000, 5, 1150),
  Q: row('Q', 0.1, 24, 0.05, 1.15),
  type: { path: 'type', min: 0, max: 0, step: 1, def: 'lowpass' },
  slope: { path: 'slope', min: -24, max: -12, step: 12, def: -12 },
};
Object.assign(values, { freq: 1150, Q: 1.15, type: 'lowpass', slope: -12 });
let filterWrites = [];
let filterLive = [];
const filter = responseGraph({
  rows: filterRows,
  read,
  writeMany: (pairs) => {
    filterWrites = pairs;
    pairs.forEach(([r, x]) => { values[r.path] = x; });
  },
  onLive: (pairs) => { filterLive = pairs; },
});
filter.draw();
const filterLine = filter.box.children[0].children[2];
const filterBefore = filterLine.getAttribute('d');
filter.box.children[0].onpointerdown(event(180, 20));
assert(filterWrites.some(([r]) => r === filterRows.freq)
  && filterWrites.some(([r]) => r === filterRows.Q),
  'the filter graph writes CUTOFF and RESONANCE together');
assert(filterLive === filterWrites,
  'the filter graph sends the written pairs to the sibling pots');
filter.draw();
assert(filterLine.getAttribute('d') !== filterBefore,
  'a filter pot change is visible after the graph redraws');

// ---- the cards that have less to draw ---------------------------------------
//
// TNGR-2 brought two shapes the graphs had never been asked for. Both used to make the
// graph vanish with no error, which reads as a broken panel rather than as a card that
// has no such control.

// A three-stage envelope: TNGR-2's POSITION walk holds where its decay leaves it, so
// there is no release stage and no third handle to drag.
const heldRows = { attack: envRows.attack, decay: envRows.decay, sustain: envRows.sustain };
Object.assign(values, { attack: 0.1, decay: 0.2, sustain: 0.5 });
const heldShape = envShape({ rows: heldRows, read, w: 240, h: 94 });
assert(heldShape.handles.length === 2, 'a release-less envelope draws two handles, not three');
assert(/^[ML0-9,.\s]+$/.test(heldShape.path) && !heldShape.path.includes('NaN'),
  'a release-less envelope draws a finite path');
const heldGraph = envelopeGraph({ rows: heldRows, read, writeMany: () => {} });
heldGraph.draw();
assert(heldGraph.box.children[0].children.length === 5,
  'a release-less envelope graph appends only the handles it can move');

// No SLOPE row: a native BiquadFilterNode has one slope, so TNGR-2's filter card has no
// pill to choose it and the curve is drawn at -12 dB/oct.
// And a RESONANCE row whose range starts at zero must not put log(0) on the axis.
const bareRows = {
  freq: filterRows.freq,
  Q: row('Q2', 0, 1, 0.01, 0.2),
  type: filterRows.type,
};
Object.assign(values, { Q2: 0.2 });
const bare = responseGraph({ rows: bareRows, read, writeMany: () => {} });
bare.draw();
const bareLine = bare.box.children[0].children[2].getAttribute('d');
assert(bareLine && !bareLine.includes('NaN'),
  'a slope-less card with a zero-minimum RESONANCE still draws a finite curve');
const bareDot = bare.box.children[0].children[3];
assert(!Number.isNaN(Number(bareDot.getAttribute('cy'))),
  'the handle of a zero-minimum RESONANCE axis has a real position');

// The BOX is as tall as the drawing.
//
// The shape is computed against `h`, and the container used to be pinned at 96px in CSS —
// so any graph asked for at a different height had its bottom clipped, and a clipped
// envelope reads as one that stops early rather than one that has been cut off.
for (const height of [94, 150]) {
  const sized = envelopeGraph({ rows: envRows, read, writeMany: () => {}, h: height });
  assert(sized.box.style.height === `${height}px`,
    `an envelope graph asked for ${height}px sizes its box to match (${sized.box.style.height})`);
  const resp = responseGraph({ rows: filterRows, read, writeMany: () => {}, h: height });
  assert(resp.box.style.height === `${height}px`,
    `a response graph asked for ${height}px sizes its box to match (${resp.box.style.height})`);
}
// And the drawing really does use the full height it was given: the bottom of a curve at
// 150 sits lower than the bottom of the same curve at 94.
{
  const low = envShape({ rows: envRows, read, w: 240, h: 94 });
  const tall = envShape({ rows: envRows, read, w: 240, h: 150 });
  assert(tall.spans.bot > low.spans.bot,
    `a taller graph draws to a lower baseline (${low.spans.bot} then ${tall.spans.bot})`);
}

// Keep the integration seam visible to this source-level suite: the full editor must pass
// a graph-only callback through the shared numeric-row builder rather than rebuilding a
// card during a pointer drag.
const fullSource = readFileSync(new URL('../tools/mixer-synth-full.js', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../tools/mixer-voice-editor.js', import.meta.url), 'utf8');
assert(fullSource.includes('onChange: redrawGraphs')
  && fullSource.includes('kit.numRow(row, guards, redrawGraphs)'),
  'Advanced cards wire pot changes to graph-only redraws');
assert(editorSource.includes('onChange?.();')
  && editorSource.includes('numRow(row, guards, onChange)'),
  'the shared pot builder invokes the graph refresh callback');

if (failed) {
  console.log(`\nSYNTH GRAPHS: ${failed} failure(s)`);
  process.exit(1);
}
console.log('\nSYNTH GRAPHS: PASSED');
