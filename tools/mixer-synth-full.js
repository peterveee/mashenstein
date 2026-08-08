// The full-window synth editor: MRDR-3 and Drum Synth's Advanced controls on one screen.
//
// The strip panel is 366px wide — three channel strips — and everything about it is a
// concession to that: 42px pots, 9.5px labels, four grid columns, and one long scroll.
// This is the same preset in a six-column grid where nothing scrolls, opened by EDIT on
// that panel and closed back to it.
//
// ---- what this file is NOT --------------------------------------------------
//
// It is not a second editor. There is one `state.voice` — the live catalogue entry the
// engine reads at play time — one `touched()`, and one write path, all of them inside
// tools/mixer-voice-editor.js. This file gets a KIT and nothing else: no VOICES import,
// no `setAt`, no `state`. So the two surfaces cannot disagree about a value, because
// there is only one value; a repaint redraws both from the same object.
//
// The controls are the strip's own too — `kit.groupCard` builds the same cards with the
// same pots and pills, and the CSS that styles them is written once against
// `:is(#voiceedit, #synthfull)`. What this file owns is WHERE THE CARDS GO, which is the
// whole of the difference between a column and a window.
//
// ---- where the cards go -----------------------------------------------------
//
// `fullLayout()` (in the editor, beside `panelSpec`) says. It is data, and it checks
// itself: every control the panel defines appears in it exactly once, or it throws.
// tests/synth-full-layout.js makes the same assertion in CI, because pot-coverage.js
// works at root-key granularity and cannot see a missing leaf.

import { envelopeGraph, responseGraph } from './mixer-synth-graphs.js';

/** The synth classes that have a full-window layout. The rest open the strip panel only. */
export const FULL_EDITORS = ['MRDR-3', 'drum'];

/** Find a card's rows by the label they carry, which is the name the desk calls them. */
const byLabel = (rows, want) => {
  const out = {};
  for (const [key, label] of Object.entries(want)) {
    out[key] = rows.find((r) => r.label === label);
  }
  return Object.values(out).every(Boolean) ? out : null;
};
const ENV_ROWS = { attack: 'ATTACK', decay: 'DECAY', sustain: 'SUSTAIN', release: 'RELEASE' };
const FILTER_ROWS = { freq: 'CUTOFF', Q: 'RESONANCE', type: 'TYPE', slope: 'SLOPE' };

/**
 * A waveform, drawn.
 *
 * `SIN SQR SAW TRI PLS NOISE` is six abbreviations you decode; six little pictures is a
 * shape you recognise, which is what a waveform is. Same options, same order, same
 * stored values — only the label is a drawing instead of a word. Anything without a
 * glyph here falls back to its word, so a new waveform is legible on the day it lands
 * and prettier on the day someone draws it.
 *
 * Paths are in a 24 × 14 viewBox, drawn at 26 × 15.
 */
const GLYPH = {
  sine: 'M1,7 C3,0.5 6,0.5 8,7 C10,13.5 13,13.5 15,7 C17,0.5 20,0.5 22,7',
  square: 'M1,12 L1,2.5 L8,2.5 L8,12 L15,12 L15,2.5 L22,2.5 L22,12',
  sawtooth: 'M1,12 L7,2.5 L7,12 L13,2.5 L13,12 L19,2.5 L19,12 L23,9',
  triangle: 'M1,12 L6,2.5 L11,12 L16,2.5 L21,12',
  pulse: 'M1,12 L1,2.5 L5,2.5 L5,12 L12,12 L12,2.5 L16,2.5 L16,12 L22,12',
  noise: 'M1,7 L3,3 L5,11 L7,4.5 L9,12 L11,3.5 L13,9 L15,2.5 L17,10.5 L19,5 L21,11.5 L23,6.5',
  // The LFO's three destinations, as what they DO: a corner coming down, a swell, and a bend.
  filter: 'M1,4 L10,4 C15,4 16,11 22,11',
  level: 'M1,11 C5,11 6,4 11,4 C16,4 17,11 22,11',
  pitch: 'M1,10 C5,10 7,3 11,3 S17,11 22,5',
};

/** `osc2` → `LAYER 2`, for the solo readout and the mixer cells. */
const layerName = (n) => `LAYER ${n}`;

export function createSynthFull({ kit, el, backdrop }) {
  // Guards are per-surface: the strip clears its own on every repaint, and one shared
  // list would mean its next build wiped ours and left half this window stuck at
  // whatever it last looked like. See `guardSet` in the editor.
  const guards = kit.guards();

  let showing = false;
  let layer = 1;
  let undoButton = null;
  // Which of a shared card's two sections is on top, per cell. Held here rather than on
  // the preset: it is which one you are LOOKING at, not anything the sound is.
  const tab = new Map();

  const div = (cls, text) => {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  };
  const span = (cls, text) => {
    const s = document.createElement('span');
    if (cls) s.className = cls;
    if (text != null) s.textContent = text;
    return s;
  };

  // ---- the title bar ---------------------------------------------------------
  const head = () => {
    const bar = div('sfhead');
    const v = kit.voice();
    bar.append(
      span('sfsynth', v?.synth || (v?.kind === 'drum' ? 'DRUM SYNTH' : '')),
      span('sfpreset', kit.label()),
    );
    const solo = kit.soloText();
    if (solo) bar.append(span('sfsolotext', solo));
    const undo = document.createElement('button');
    undo.className = 'sfundo';
    undo.type = 'button';
    undo.textContent = 'UNDO';
    undo.title = 'Undo the last Advanced Patch edit (Ctrl/Cmd+Z)';
    undo.disabled = !kit.canUndo();
    undo.onclick = () => kit.undo();
    undoButton = undo;
    bar.append(undo, span('sfspace'));
    const shut = document.createElement('button');
    shut.className = 'sfshut';
    shut.type = 'button';
    shut.textContent = '✕';
    shut.title = 'Close — the panel beside the strip is still on this preset';
    shut.onclick = () => close();
    bar.append(shut);
    return bar;
  };

  // ---- a card ----------------------------------------------------------------
  //
  // `kit.groupCard` does the work. What is handed to it is a SYNTHETIC group: the real
  // one, with the title and the row list the layout decided. That is how the Note card
  // splits in two, how PLS WIDTH moves into the PWM sub-section, and how a card keeps its
  // own switch, its solo button and its tooltips while showing a different set of rows.
  const card = (spec, { graph = null, curves = false, tabs = null } = {}) => {
    // The pots this card drew, by path — so a graph handle can move the needle of the
    // control it is dragging. `set` is display-only, so there is no write loop.
    const pots = new Map();
    // The curve trio comes OUT of the grid and goes behind a door — three pills that are
    // set once and then never touched were costing a full-width row on every amp card.
    const curveRows = curves ? spec.rows.filter((r) => r.trio === 'curve') : [];
    // AMP is env-or-through: whether this layer has an envelope of its own, or hands its
    // shaping to the Global Amp. That is an ON/OFF, and it belongs in the header with the
    // other on/offs rather than as a pair of words inside the card — it is the control
    // that decides whether the four stages under it do anything at all.
    const ampRow = spec.rows.find((r) => r.label === 'AMP' && r.kind === 'pick');
    const bodyRows = spec.rows.filter((r) => r !== ampRow
      && !(curves && r.trio === 'curve'));
    const c = kit.groupCard(
      { ...spec.group, title: spec.title, rows: bodyRows },
      {
        guards,
        repaint: kit.repaint,
        dimOff: true,
        renderPick: choiceRow,
        onRow: (h) => { if (h.set) pots.set(h.row.path, h.set); },
        // A pot must redraw the graph without rebuilding the card under the pointer.
        // `redrawGraphs` only re-reads the shared voice, so the graph and the pot remain
        // two views of the same value throughout a drag.
        onChange: redrawGraphs,
      },
    );
    // A card may ask for a denser grid than the window's default — see `grid` in
    // `fullLayout`. It is a class rather than an inline style so the column floor stays in
    // the stylesheet with the pot size it has to clear.
    if (spec.grid === 4) c.classList.add('sfgrid4');
    // Hung from the TOP instead of the bottom. Every other card bottom-aligns its grid so
    // the pot rows across a band land on one baseline; a card whose first row is a picker
    // and whose length changes with the value of that picker has nothing to align WITH,
    // and bottom-aligning it just parks the wave you are choosing at the foot of a card
    // full of air. See `top` in `fullLayout`.
    if (spec.top) c.classList.add('sftop');
    fitLabels(c);
    pairTypeSlope(c);
    if (graph) addGraph(c, spec, graph, pots);
    // TYPE and SLOPE ride directly under the curve they describe, not down with the pots.
    //
    // The grid takes `margin-top: auto` so that the knob rows across a whole band land on
    // one baseline — which also pushes everything in the grid to the bottom of the card,
    // and the pair went with it. That left the two controls that say what the filter IS
    // floating in the gap below the graph's own shape, as far from it as they could get.
    // Lifted OUT of the grid and dropped after the graph, the pair sits against the curve
    // and the pots keep their shared baseline. Nothing else moves.
    const pair = c.querySelector('.sfpair');
    const gbox = c.querySelector('.sfgraph');
    if (pair && gbox) gbox.after(pair);

    // ---- the header, rebuilt in this window's own terms ----------------------
    const bar = c.querySelector('.devbar');
    if (bar) {
      bar.textContent = '';
      if (spec.group?.optional) {
        const on = kit.sectionOn(spec.group.optional);
        bar.append(capsule(on, {
          title: on ? spec.group.onTip : spec.group.offTip,
          onClick: () => kit.toggleSection(spec.group.optional),
        }));
      }
      if (ampRow) {
        const on = (kit.get(ampRow.path) ?? ampRow.def) === 'env';
        bar.append(capsule(on, {
          title: on
            ? 'This layer has its own amp envelope — switch off to let the Global Amp shape'
              + ' the whole stack instead'
            : 'The Global Amp is shaping this layer — switch on to give it an envelope of'
              + ' its own',
          onClick: () => { kit.pickWrite(ampRow, on ? 'through' : 'env'); kit.repaint(); },
        }));
      }
      if (tabs) bar.append(tabs); else bar.append(span('sftitle', spec.title));
      // No solo here. Solo belongs to the LAYER, and the layer has a cell of its own at
      // the top of the window with the switch and the level already on it — a second S
      // on the oscillator card would be the same monitoring state offered twice.
      const right = div('sfbarright');
      for (const p of spec.panels || []) {
        if (p.rows.length) right.append(sectionPanel(c, p));
      }
      if (curveRows.length) right.append(curvePanel(c, curveRows));
      if (spec.group?.layerCopy) {
        const select = document.createElement('select');
        select.className = 'sfcopyselect';
        select.title = 'Copy the entire layer from another layer';
        const placeholder = document.createElement('option');
        placeholder.textContent = 'COPY';
        placeholder.value = '';
        placeholder.selected = true;
        select.append(placeholder);
        for (const other of [1, 2, 3].filter((n) => n !== spec.group.layerCopy)) {
          const option = document.createElement('option');
          option.value = String(other);
          option.textContent = `Copy from Layer ${other}`;
          select.append(option);
        }
        select.onchange = (ev) => {
          ev.stopPropagation();
          const from = Number(select.value);
          select.value = '';
          if (from) kit.copyLayer(from, spec.group.layerCopy);
        };
        select.onclick = (ev) => ev.stopPropagation();
        right.append(select);
      }
      // No per-card count. It was the completeness invariant rendered, which was a good
      // reason to compute it and a bad reason to show it: eleven numbers down the right
      // of the window that nobody reads and that compete with the readings that matter.
      // The invariant still holds — `fullLayout` throws and tests/synth-full-layout.js
      // fails — it just no longer needs an audience.
      bar.append(right);
    }
    // A card whose whole GROUP does not currently apply. On the strip these are removed —
    // an off Osc 3 takes its Pitch Env, FM, Filter and Amp cards away with it, because a
    // scroll can close up behind them. A fixed grid cannot: removing four of five cells
    // leaves holes, and the layout is not allowed to lurch. So they stay, greyed, saying
    // what they would say if the layer were on.
    if (spec.group?.when && !spec.group.when(kit.voice())) c.classList.add('sfoff');
    // The sub-section, if the layout gave the card one: a labelled rule and then the
    // section's rows. A GRID OF ITS OWN, hung off the bottom of the card rather than
    // running on from the rows above it in one grid.
    //
    // That is what pins it. The card is a flex column, and its own rows are read from the
    // top; the sub-section takes `margin-top: auto`, so it sits against the foot of the
    // card whatever is above it. Which matters because what is above it CHANGES — PWM's
    // five rows or FM's five, and one row more when the wave is noise — and a section that
    // rides up and down the card as you audition waveforms is a section you have to find
    // again every time. Fixed at the bottom, the rule is always in the same place and the
    // air opens up in the middle instead.
    //
    // It is still ABSENT rather than greyed when it does not apply — PWM on anything but a
    // pulse has no width to move — and nothing above it moves when it goes.
    let pinned = false;
    for (const sub of spec.sub || []) {
      if (sub.group?.when && !sub.group.when(kit.voice())) continue;
      // `sffoot` is the one that takes the slack — the first section that actually drew.
      // On the rest it would divide the gap between them rather than bank it above the
      // group, which is the whole point of pinning them.
      const grid = div(`devgrid sfsubgrid${pinned ? '' : ' sffoot'}`);
      pinned = true;
      c.append(grid);
      const rule = div('sfsub');
      // A section with a switch of its own carries it on the rule, and the switch comes
      // FIRST — before the name it governs, the way every card header on this window has
      // it. A switch trailing its label reads as belonging to whatever comes next.
      if (sub.group?.optional) {
        const on = kit.sectionOn(sub.group.optional);
        rule.append(capsule(on, {
          title: on ? sub.group.onTip : sub.group.offTip,
          onClick: () => kit.toggleSection(sub.group.optional),
        }));
      }
      rule.append(span('k', sub.rule), span('rule'));
      grid.append(rule);
      // Off, and drawn anyway: the switch on the rule is the way back on, so the section
      // cannot hide the controls it governs — the same rule the strip's folding cards
      // follow. Dimmed, not removed, so nothing below moves when it is switched.
      const dim = !!sub.group?.optional && !kit.sectionOn(sub.group.optional);
      for (const row of sub.rows) {
        const wrap = rowEl(row);
        if (dim) wrap.classList.add('sfdim');
        grid.append(wrap);
      }
    }
    return c;
  };

  // ---- the card header -------------------------------------------------------
  //
  // The window builds its own, because all of it differs from the strip's: a capsule
  // switch instead of an On/Off word, a 26px bar on `--panel2` instead of a bare rule,
  // the title left rather than centred, and a right-hand group of solo, panel buttons
  // and a control count. `groupCard` still draws the BODY — the controls are the strip's,
  // and that is the part that must not diverge.

  /**
   * The on/off switch: a capsule, not a word.
   *
   * 20 × 11, radius 99, the dot pushed to whichever end it is at. Reads as a state at a
   * glance where `On`/`Off` reads as a label you have to finish, which matters on a
   * window carrying nine of them at once.
   */
  const capsule = (on, { title, onClick }) => {
    const b = document.createElement('button');
    b.className = `sfsw${on ? ' on' : ''}`;
    b.type = 'button';
    b.title = title;
    b.append(document.createElement('i'));
    b.onclick = (ev) => { ev.stopPropagation(); onClick(); };
    return b;
  };

  /** A popover hung off a card's top-right, and the header button that opens it. */
  const panelButton = ({ card: host, label, icon, lit, title, build: buildBody }) => {
    const btn = document.createElement('button');
    btn.className = `sfpanelbtn${icon ? ' sficon' : ''}`;
    btn.type = 'button';
    btn.title = title;
    if (icon) btn.append(icon()); else btn.textContent = label;
    // A dot when the panel holds something other than its default — the only way a
    // control behind a door can say it has been touched.
    const wrap = div('sfpanelwrap');
    wrap.append(btn);
    if (lit) wrap.append(span('sflit'));
    btn.onclick = (ev) => {
      ev.stopPropagation();
      const open = host.querySelector('.sfpop');
      if (open) { open.remove(); btn.classList.remove('on'); return; }
      for (const p of el.querySelectorAll('.sfpop')) p.remove();
      for (const b of el.querySelectorAll('.sfpanelbtn.on')) b.classList.remove('on');
      const pop = div('sfpop');
      const bar = div('sfpophead');
      bar.append(span('t', label || title));
      const shut = document.createElement('button');
      shut.className = 'sfpopshut'; shut.type = 'button'; shut.textContent = '✕';
      shut.onclick = (e) => { e.stopPropagation(); pop.remove(); btn.classList.remove('on'); };
      bar.append(shut);
      pop.append(bar);
      buildBody(pop);
      host.append(pop);
      btn.classList.add('on');
    };
    return wrap;
  };

  /** The three envelope-stage curves, drawn as the shape they are. */
  const CURVE_D = {
    ATK: { exp: 'M2,14 C7,4 12,2 32,2', lin: 'M2,14 L32,2' },
    other: { exp: 'M2,2 C7,12 12,14 32,14', lin: 'M2,2 L32,14' },
  };
  const svgPath = (d, vb, w, h, cls) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', vb);
    s.setAttribute('width', w);
    s.setAttribute('height', h);
    if (cls) s.setAttribute('class', cls);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    s.append(p);
    return s;
  };

  /**
   * The curve panel: three shapes, not three pairs of words.
   *
   * ATK / DEC / REL choose between an exponential and a linear ramp, and the honest way
   * to show the difference between two ramps is to draw them. Each toggle draws its own
   * CURRENT shape and says which it is, so the panel reads at a glance and a click swaps
   * one stage. Only on the two amp envelopes — `adsr()` reads these keys and `centsEnv`,
   * which runs the pitch and filter envelopes, does not, so a curve panel there would be
   * three controls that move no sample.
   */
  const curvePanel = (host, rows) => {
    const anyLin = rows.some((r) => (kit.get(r.path) ?? r.def) === 'lin');
    return panelButton({
      card: host,
      label: 'CURVE',
      title: 'Envelope curves — exponential or linear per stage',
      lit: anyLin,
      icon: () => svgPath('M1,9 C4,2 7,1 15,1', '0 0 16 10', 19, 12, 'sfcurveicon'),
      build: (pop) => {
        const note = document.createElement('p');
        note.className = 'sfpopnote';
        note.textContent = 'Exponential or linear for each stage — the shape of the '
          + 'envelope, not its times. Set once.';
        pop.append(note);
        const grid = div('sfcurvegrid');
        for (const row of rows) {
          const exp = (kit.get(row.path) ?? row.def) === 'exp';
          const d = (row.label === 'ATK' ? CURVE_D.ATK : CURVE_D.other)[exp ? 'exp' : 'lin'];
          const b = document.createElement('button');
          b.className = 'sfcurvebtn'; b.type = 'button';
          b.title = `${row.label} curve — ${exp ? 'EXP (exponential)' : 'LIN (linear)'}.`
            + ' Click to swap.';
          b.append(svgPath(d, '0 0 34 16', '100%', 24, 'sfcurveshape'),
            span('l', row.label), span('m', exp ? 'EXP' : 'LIN'));
          b.onclick = () => { kit.pickWrite(row, exp ? 'lin' : 'exp'); kit.repaint(); };
          grid.append(b);
        }
        pop.append(grid);
      },
    });
  };

  /** A named section behind a door — FM, today. Its own switch rides in the popover head. */
  const sectionPanel = (host, p) => panelButton({
    card: host,
    label: p.label,
    title: p.title || p.label,
    lit: !!(p.group?.optional && kit.sectionOn(p.group.optional)),
    build: (pop) => {
      if (p.group?.optional) {
        const on = kit.sectionOn(p.group.optional);
        pop.querySelector('.sfpophead').prepend(capsule(on, {
          title: on ? p.group.onTip : p.group.offTip,
          onClick: () => kit.toggleSection(p.group.optional),
        }));
      }
      if (p.group?.offTip) {
        const note = document.createElement('p');
        note.className = 'sfpopnote';
        note.textContent = p.group.offTip;
        pop.append(note);
      }
      const grid = div('devgrid sfpopgrid');
      for (const row of p.rows) grid.append(rowEl(row));
      pop.append(grid);
    },
  });

  /**
   * A choice, as a line of words rather than a box of pills.
   *
   * Not decoration — it is what makes the heights work. A pill row is a label over a
   * bordered box, about 44px; this is a label and its options on ONE line over a rule,
   * about 24px. Two of them on the filter card is the forty pixels that decide whether
   * the card fits its cell or grows a scrollbar, and "nothing scrolls" is the whole
   * claim of the layout.
   *
   * Same options, same order, same abbreviations, same write path as the strip's pills —
   * `kit.pickWrite` is `buildSeg`'s own body. Only the clothes differ, and only here,
   * where there is room to read a word and no room to draw a box round it.
   */
  const choiceRow = (row) => {
    // Every choice row takes the whole card. A short list used to take three columns of
    // four, on the theory that it left room for a pot beside it — but a choice row carries
    // a rule under it, and a rule that stops three quarters of the way across reads as a
    // mistake rather than as a boundary. Nothing shares a line with one in practice
    // anyway: SHAPE, KEY MODE and TARGET are each followed by a pot that starts its own
    // row, so the leftover column was never anything but a gap.
    // Every option drawable? Then draw them. That is WAVE on four cards and the LFO's
    // TARGET; everything else stays words.
    const drawn = row.options.every((o) => GLYPH[o]);
    const wrap = div(`row sfchoice${drawn ? ' sfglyphrow' : ''}`);
    const cur = row.read ? row.read(kit.voice()) : (kit.get(row.path) ?? row.def);
    wrap.append(span('k', row.label));
    const opts = div('sfopts');
    for (const o of row.options) {
      const b = document.createElement('button');
      const on = String(o) === String(cur);
      b.type = 'button';
      b.className = `${drawn ? 'sfglyph' : 'sfopt'}${on ? ' on' : ''}`;
      if (drawn) b.append(svgPath(GLYPH[o], '0 0 24 14', 24, 14, 'sfwave'));
      // The word alone, dim until it is the one. A radio dot sat here for a while to
      // carry "these are exclusive" on a channel other than colour, but it doubled the
      // width of every option and made a four-word row read as a form.
      else b.append(span('t', kit.short[o] ?? String(o).toUpperCase()));
      b.title = String(o);
      b.onclick = () => { kit.pickWrite(row, o); kit.repaint(); };
      opts.append(b);
    }
    wrap.append(opts);
    // COLOUR is HIDDEN rather than greyed, unlike everything else in this window — it is
    // the wave row's second half, live on noise and meaningless on the other five, and
    // five dead words sitting under the waveforms on every patch that is not noise is
    // clutter where a greyed pot at least says what it would be. Nothing moves when it
    // comes and goes: it is directly under the picker that summons it.
    if (row.when) guards.push(wrap, row.when, row.label === 'COLOUR');
    return wrap;
  };

  /**
   * TYPE and SLOPE, on ONE LINE.
   *
   * They are one question asked twice — what shape of filter, and how steeply — so they
   * read as a pair rather than as two rows that happen to be adjacent, and as a pair they
   * cost one line instead of two on the card that can least afford it: the filter is the
   * only card carrying a response curve AND four pots AND two choices.
   *
   * One line means one line: each keeps its label BESIDE its options, which is the shape
   * every other choice row on this window has. They were stacked — label above options —
   * for a while on the theory that half a card would not hold a name and four words. Half
   * a card is 117px and the words come to 114 at 10px, so it does; the tightening below is
   * what buys those three pixels, and it is why `.sfopts` may not wrap in here.
   */
  const pairTypeSlope = (c) => {
    const rows = [...c.querySelectorAll('.sfchoice')];
    const type = rows.find((r) => r.querySelector('.k')?.textContent === 'TYPE');
    const slope = rows.find((r) => r.querySelector('.k')?.textContent === 'SLOPE');
    if (!type || !slope || type.nextElementSibling !== slope) return;
    const pair = div('row sfpair');
    type.before(pair);
    for (const r of [type, slope]) pair.append(r);
  };

  /** One control. Pots are the strip's own; choices wear this window's clothes. */
  const rowEl = (row) => (row.kind === 'pick'
    ? choiceRow(row)
    : kit.numRow(row, guards, redrawGraphs).wrap);

  /**
   * A pot name shortened, but only where the column cannot hold the full one.
   *
   * The columns here are narrow on purpose — four pots across a card rather than three —
   * because that is a whole row of height saved on every card, and height is the budget
   * that decides whether the window scrolls. So `ENV AMOUNT`, `KEY FOLLOW`, `RESONANCE`
   * and `PLS WIDTH` all ran off the end of their cell and ellipsised, which is a control
   * whose name you cannot read at all.
   *
   * These are DISPLAY names and nothing else. `row.label` is the identifier the layout,
   * the graphs and the tests all look a control up by (see `byLabel`), so nothing here
   * touches it — the substitution happens on the drawn span, after the card is built.
   * A name is only swapped when the measurement says the real one does not fit, so the
   * same pot reads RESONANCE on a wide card and RES on a narrow one rather than losing
   * its name everywhere to make one card work.
   */
  const SHORT_LABEL = {
    RESONANCE: 'RES',
    'ENV AMOUNT': 'ENV AMT',
    'KEY FOLLOW': 'KEY FLW',
    'PLS WIDTH': 'PLS WID',
    'PARTIAL SPREAD': 'PART SPRD',
    PARTIALS: 'PRTLS',
    FREQUENCY: 'FREQ',
    TRANSPOSE: 'TRANS',
    'FILTER VAR': 'FILT VAR',
    'LEVEL VAR': 'LVL VAR',
    'PITCH VAR': 'PCH VAR',
    'PITCH DROP': 'PCH DROP',
    'DROP TIME': 'DRP TIME',
    'SWEEP TIME': 'SWP TIME',
    'SWEEP TO': 'SWP TO',
    'RATE CURVE': 'RATE CRV',
    'VIB SPREAD': 'VIB SPRD',
    'VIB DEPTH': 'VIB DPTH',
    'VIB DELAY': 'VIB DLY',
    INTERVAL: 'INTVL',
    HARMONIC: 'HARM',
    MODULATOR: 'MOD',
    CARRIER: 'CARR',
    STRETCH: 'STRCH',
    ATTACK: 'ATK',
    DECAY: 'DEC',
    SUSTAIN: 'SUS',
    RELEASE: 'REL',
  };
  const ADSR = new Set(['ATTACK', 'DECAY', 'SUSTAIN', 'RELEASE']);

  /** Draw a label from its parts. The unit is chrome after the name — see `.kunit`. */
  const drawLabel = (k, name, unit) => {
    k.textContent = name;
    if (!unit) return;
    const u = document.createElement('span');
    u.className = 'kunit';
    u.textContent = unit;
    k.append(' ', u);
  };
  const overflows = (k) => k.scrollWidth > k.clientWidth + 0.5;

  /**
   * Fit every pot name in `root` to the width it actually has.
   *
   * Three steps, cheapest first, each one measured rather than guessed: the unit comes
   * off, then the name is swapped for its short form, and only a name with no short form
   * left is allowed to ellipsis. Nothing is lost either way — the full name and its unit
   * go onto the label's own tooltip, so the knob keeps whatever `row.tip` it was given.
   *
   * Called twice: once as the card is built, where the window is still `display: none`
   * and every width is zero, and again once it is up. The zero-width pass is not wasted —
   * it does the envelope-stage unit drop, which is a rule and not a measurement, so the
   * first painted frame is already right.
   */
  const fitLabels = (root) => {
    for (const k of root.querySelectorAll('.potrow .k')) {
      // Parsed once and kept, because every later pass has to start from the FULL name:
      // a window widened after a fit would otherwise stay abbreviated for ever.
      if (k.dataset.potname === undefined) {
        const unit = k.querySelector('.kunit');
        const text = unit ? k.textContent.replace(unit.textContent, '') : k.textContent;
        // `* ` marks a stored value outside the pot's range — see `numRow`. It is a flag
        // on the row, not part of the name, so it survives every substitution below.
        const flagged = text.trimStart().startsWith('* ');
        k.dataset.potflag = flagged ? '* ' : '';
        k.dataset.potname = text.replace(/^\s*\*\s*/, '').trim();
        k.dataset.potunit = unit ? unit.textContent : '';
      }
      const { potname: name, potunit: unit, potflag: flag } = k.dataset;
      // The four envelope stages ALWAYS drop their unit. They are the same four on nine
      // cards, everyone knows attack is a time and sustain is a level, and `ATTACK s`
      // nine times over is the unit repeated ninety times to say nothing.
      const wantUnit = unit && !ADSR.has(name) ? unit : '';
      drawLabel(k, flag + name, wantUnit);
      if (!k.clientWidth) continue;
      if (wantUnit && overflows(k)) drawLabel(k, flag + name, '');
      if (overflows(k) && SHORT_LABEL[name]) drawLabel(k, flag + SHORT_LABEL[name], '');
      // Only where the drawn label is not the whole story. A pot marked RES needs the
      // tooltip as much as one still ellipsising does, and CUTOFF needs neither.
      const shown = k.textContent.trim() === (flag + name + (unit ? ` ${unit}` : '')).trim();
      k.title = shown && !overflows(k) ? '' : (unit ? `${name} (${unit})` : name);
    }
  };

  /**
   * Put a graph at the top of a card, above its controls.
   *
   * The graph is bound to ROWS, not to paths — it reads through each row's `read` and
   * writes through `kit.writeMany`, so it honours SUSTAIN's 0–100 view, every range and
   * every step. It is a second grip on controls that already exist, and adds none.
   *
   * `onLive` moves the sibling pots as the handle drags. The inverse path is the card's
   * `onChange`: a pot drag redraws the SVGs from the shared voice without rebuilding the
   * card. Without both directions the graph and pots would disagree during a gesture.
   */
  const addGraph = (c, spec, kind, pots) => {
    const want = kind === 'filter' ? FILTER_ROWS : ENV_ROWS;
    const rows = byLabel(spec.rows, want);
    if (!rows) return;
    const onLive = (pairs) => {
      for (const [row, x] of pairs) pots.get(row.path)?.(x);
    };
    const graphOptions = {
      rows, read: kit.read, writeMany: kit.writeMany, onLive,
      onStart: kit.beginUndo, onEnd: kit.endUndo,
    };
    const g = kind === 'filter'
      ? responseGraph(graphOptions)
      : envelopeGraph(graphOptions);
    // Before the grid, after the header. The grid then takes `margin-top: auto`, so the
    // knob rows across a band land on one baseline whatever height the graph came out.
    c.classList.add('sfhasgraph');
    c.querySelector('.devgrid')?.before(g.box);
    // Measured after layout: the box has no width until it is in the document, and the
    // curve is drawn across that width.
    graphsToDraw.push(g.draw);
  };
  // Drawn once the cards are in the document — see the end of `render`. Pot changes use
  // the same callbacks without rebuilding the window, which keeps a live drag in place.
  let graphsToDraw = [];
  const redrawGraphs = () => { for (const draw of graphsToDraw) draw(); };
  const syncHistory = () => {
    if (undoButton) undoButton.disabled = !kit.canUndo();
  };

  // ---- the mixer band --------------------------------------------------------
  //
  // Three cells, one per layer, each a level fader and five readings. The readings are a
  // PROJECTION — the live controls are on the oscillator card below, and these exist so
  // you can compare three layers without switching between them. The card is the
  // selector: clicking it puts that layer in the band underneath.
  const mixCell = (cell) => {
    const n = cell.layer;
    const on = layer === n;
    const wrap = div(`sfmix${on ? ' on' : ''}`);
    wrap.onclick = () => { if (layer !== n) { layer = n; render(); } };

    const bar = div('sfmixhead');
    // The layer's own on/off, where the layer's own card has it. Layer 1 has none — it
    // IS the voice — which is the same rule the strip follows.
    if (cell.group?.optional) {
      const live = kit.sectionOn(cell.group.optional);
      bar.append(capsule(live, {
        title: live ? cell.group.onTip : cell.group.offTip,
        onClick: () => kit.toggleSection(cell.group.optional),
      }));
    }
    bar.append(span('sfmixname', layerName(n)));
    // WHAT THIS LAYER IS, in one word, where the picker used to be.
    //
    // The waveform moved down to the OSC card, beside the modulation that acts on it. But
    // "sub, saw, noise" is how you read a three-layer stack at a glance, and that reading
    // is the whole reason these three cells stand side by side — so the name stays, as a
    // reading rather than a control. The full word, not the pill's abbreviation: there is
    // room for it here, and SQUARE is a word where SQR is a thing you decode.
    if (cell.wavePath) {
      const w = kit.get(cell.wavePath);
      if (w) {
        const tag = span('sfmixwave', String(w).toUpperCase());
        tag.title = `${String(w).toUpperCase()} — change it on this layer's OSC card below`;
        bar.append(tag);
      }
    }
    if (cell.group?.solo) {
      const lit = kit.soloOn(cell.group.solo);
      const s = document.createElement('button');
      s.className = `sfsolo${lit ? ' on' : ''}`;
      s.type = 'button';
      s.textContent = 'S';
      s.title = lit ? 'Stop soloing this layer'
        : 'Hear this layer on its own — monitoring, never saved';
      s.onclick = (ev) => { ev.stopPropagation(); kit.setSolo(cell.group.solo, !lit); };
      const right = div('sfbarright');
      right.append(s);
      bar.append(right);
    }
    wrap.append(bar);

    const body = div('sfmixbody');
    // Real controls, in the window's own clothes — the wave picker draws itself, the
    // three pots are the strip's. Clicks inside must not reach the cell's own selector
    // underneath, or turning a knob would also switch which layer is being edited.
    const grid = div('devgrid sfmixgrid');
    grid.onclick = (ev) => ev.stopPropagation();
    grid.onpointerdown = (ev) => ev.stopPropagation();
    // Seven pots and nothing else. WAVE and COLOUR went down to the OSC card, where the
    // modulator that acts on the wave is — so this cell is now what it always claimed to
    // be, the place three layers are balanced against each other: level, where each one
    // sits, how wide it is and when it arrives.
    for (const row of cell.rows) grid.append(rowEl(row));
    fitLabels(grid);
    // LEVEL at the TOP. It is the one control in the cell that is not a description of the
    // oscillator but a statement about the mix, it is the one you reach for most, and three
    // faders on one line across the three cells is the balance of the stack read in a
    // glance — which is the whole reason this band shows all three layers at once.
    body.append(fader(cell.fader), grid);
    wrap.append(body);
    return wrap;
  };

  /**
   * The level, as a fader lying along the whole width of the cell.
   *
   * Horizontal because the cell is now half as tall as it was: a vertical fader in 40px
   * of height is a fader you cannot aim, where the full width of the card gives it more
   * travel than it ever had standing up. Same key, same range, same write path as the pot
   * on the card below — it is that pot, lying down.
   */
  const fader = (row) => {
    const wrap = div('sffader');
    const track = div('sffadertrack');
    const fill = div('sffaderfill');
    const at = (v) => Math.min(1, Math.max(0,
      ((typeof v === 'number' ? v : row.def) - row.min) / (row.max - row.min)));
    fill.style.width = `${(at(kit.read(row)) * 100).toFixed(1)}%`;
    track.append(fill, div('sffaderunity'));
    track.title = `${row.label} — drag across. ${row.min} … ${row.max}`;
    const num = span('sffadernum', row.fmt(kit.read(row) ?? row.def));
    track.onpointerdown = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();   // the cell under it is the layer selector
      // The other half of the `endUndo` below: without it the whole drag was recorded
      // as one undo step per pointermove, and the level estimate fired into the middle
      // of a held fader rather than waiting for it to be let go.
      kit.beginUndo();
      const box = track.getBoundingClientRect();
      const move = (e) => {
        const f = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
        const raw = row.min + f * (row.max - row.min);
        const x = Math.min(row.max, Math.max(row.min, Math.round(raw / row.step) * row.step));
        kit.write(row, x);
        fill.style.width = `${(f * 100).toFixed(1)}%`;
        num.textContent = row.fmt(x);
      };
      move(ev);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        kit.endUndo();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    };
    wrap.append(track, num);
    return wrap;
  };

  /**
   * The five readings, across rather than down.
   *
   * Read-only on purpose — every one of them is a live control on the card below, and
   * this row exists so three layers can be compared without switching between them.
   * Laid out horizontally so the whole cell fits in half the height it used to take,
   * which is height the cards underneath want more than this does.
   */
  const reads = (rows) => {
    const box = div('sfreads');
    for (const row of rows) {
      const v = kit.read(row);
      const cell = div('sfread');
      const shown = row.kind === 'pick'
        ? (kit.short[v] ?? String(v ?? row.def).toUpperCase())
        : `${row.fmt(typeof v === 'number' ? v : row.def)}${row.unit ? ` ${row.unit}` : ''}`;
      cell.append(span('k', row.label), span('v', shown));
      cell.title = `${row.label} — set it on the layer's own card below`;
      box.append(cell);
    }
    return box;
  };

  /** A card whose header names two sections and shows one. */
  const tabbed = (cell, id) => {
    const which = tab.get(id) || 0;
    const chosen = cell.cards[Math.min(which, cell.cards.length - 1)];
    const strip = div('sftabs');
    cell.cards.forEach((one, i) => {
      const b = document.createElement('button');
      b.className = `sftab${i === which ? ' on' : ''}`;
      b.type = 'button';
      b.textContent = one.title;
      b.onclick = () => { tab.set(id, i); render(); };
      strip.append(b);
    });
    return card(chosen, { tabs: strip });
  };

  // ---- the render ------------------------------------------------------------
  function render() {
    if (!showing) return;
    const v = kit.voice();
    const L = v && kit.layout({ layer });
    if (!L) { close(); return; }

    guards.clear();
    graphsToDraw = [];
    el.textContent = '';
    el.append(head());

    const body = div('sfbody');
    for (const band of L.bands) {
      const row = div(`sfband sfband-${band.name}`);
      // Each band carries its own column count — three layers want thirds, five cards
      // want fifths. See the `bands` note in `fullLayout`.
      row.style.setProperty('--sf-cols', String(band.cols || 6));
      band.cells.forEach((cell, i) => {
        const slot = div('sfcell');
        slot.style.gridColumn = `span ${cell.span || 1}`;
        if (cell.kind === 'mixer') slot.append(mixCell(cell));
        else if (cell.kind === 'tabs') slot.append(tabbed(cell, `${band.name}:${i}`));
        else slot.append(card(cell.card, { graph: cell.graph, curves: cell.curves }));
        row.append(slot);
      });
      body.append(row);
    }
    el.append(body);
    kit.sync();
    // Now, and not before: a graph is drawn across the width of its box, and a box that
    // is not in the document yet has none.
    for (const draw of graphsToDraw) draw();
    // The same reason, one step later: a name is fitted to the width of its column, and
    // on the frame a closed window is being built there is no column yet. `open` books
    // this again after `.show` goes on; a re-render of a window already up is measured
    // here and needs no second frame.
    fitLabels(el);
  }

  /**
   * Re-fit after a resize, because a fit is a measurement and the columns just moved.
   *
   * Coalesced onto a frame and skipped while the window is down — the same shape as the
   * desk's own resize handler, and for the same reason: a drag of the window corner fires
   * this a hundred times, and each pass walks every label on nine cards.
   */
  let fitPending = 0;
  addEventListener('resize', () => {
    if (!showing) return;
    cancelAnimationFrame(fitPending);
    fitPending = requestAnimationFrame(() => { if (showing) fitLabels(el); });
  });

  // ---- open, close -----------------------------------------------------------
  //
  // THE FAILURE THIS GUARDS AGAINST, because it is silent and it breaks the whole desk:
  // `#synthfull.show` is a full-screen element with `pointer-events: auto`. If it ever
  // carries `show` while it is EMPTY, it sits invisibly over everything and swallows every
  // click on the desk — the strip panel included. The symptom is not "the full editor is
  // broken", it is "nothing on the mixer responds any more", which points nowhere near
  // here. Two ways in, both closed below:
  //
  //   · the frame race — `show` is added a frame late so the transition has a `display`
  //     to run from, and an open/close inside that frame let the callback re-show an
  //     overlay that had already gone. Now the callback checks it is still wanted.
  //   · a throw in `render()` — `showing` is already true and the frame is already
  //     booked, so a bad layout left the empty shell up. Now it tears itself down.
  let pendingFrame = 0;
  /**
   * ⌘Z BELONGS TO THIS WINDOW WHILE IT IS UP, AND STOPS HERE.
   *
   * The desk has its own ⌘Z on `window` — whole-mix snapshots — and a song-local preset
   * edit reaches it too, because `touched()` writes the parameters into the mix. So with
   * both listeners live, one keypress undid the edit twice: the mix stepped back AND the
   * editor stepped back, off by one for the rest of the session.
   *
   * Capture phase is what makes this winnable. `stopImmediatePropagation` only stops
   * listeners registered after it on the same target, and this one is added on `open()` —
   * long after the desk's, which goes on at module load. Capturing on `window` runs before
   * every bubble-phase listener on it whatever order they went on in, which is the same
   * trick `ask()`'s Escape uses to win over the panic key.
   *
   * Claimed whether or not there is anything to undo: this is a full-screen editor over a
   * desk you cannot see, and a ⌘Z that fell through to the mix underneath would be an
   * invisible edit to something else entirely.
   */
  const onKeyDown = (ev) => {
    if (!showing || !(ev.metaKey || ev.ctrlKey) || String(ev.key).toLowerCase() !== 'z') return;
    const tag = ev.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ev.target?.isContentEditable) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (!kit.canUndo()) { kit.toast('Nothing to undo on this preset'); return; }
    kit.undo();
  };

  function open(n = 1) {
    if (!kit.voice() || !kit.layout({ layer: 1 })) return;
    layer = Math.min(3, Math.max(1, n));
    showing = true;
    window.addEventListener('keydown', onKeyDown, true);
    el.setAttribute('aria-hidden', 'false');
    try {
      render();
    } catch (err) {
      // Never leave the shell up. A layout that cannot be drawn is a bug worth seeing,
      // but not at the price of a desk nobody can click.
      close();
      kit.toast('The full editor could not be drawn — the panel beside the strip still works');
      throw err;
    }
    cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(() => {
      if (!showing) return;
      el.classList.add('show');
      // First frame with real widths: `render` ran against a `display: none` shell, where
      // every column measures zero and no name can be fitted to one. See `fitLabels`.
      fitLabels(el);
      for (const draw of graphsToDraw) draw();
    });
    // Nothing is made inert and nothing is dimmed: the desk stays live underneath. This
    // is a window over a running mixer, not a dialogue in front of a stopped one — you
    // play the song and move a fader while the sound changes under you, which is the
    // whole reason every other panel here is a window too.
  }

  function close() {
    showing = false;
    window.removeEventListener('keydown', onKeyDown, true);
    // Not guarded on `showing`: this is also the way OUT of a half-open state, and an
    // early return there would leave the shell up. Removing a class that is not on and
    // clearing a list that is empty both cost nothing.
    cancelAnimationFrame(pendingFrame);
    guards.clear();
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
    // The strip is about to be the visible one again, and it has been drawing this preset
    // as it was before the window opened — the two share the value, not the DOM. See
    // `onFullClosed`.
    kit.onFullClosed();
    // Emptied after the fade, so the window does not blink out from under the animation.
    setTimeout(() => { if (!showing) el.textContent = ''; }, 200);
  }

  /**
   * The preset under this window changed — a lane follow, or a click in the library.
   *
   * Re-aim on anything that still has a full layout; close on anything that does not.
   * An editor left pointing at a preset nothing is playing is worse than no editor, and
   * a MonoSynth has no MRDR-3 layout to draw.
   */
  function onVoiceChanged() {
    if (!showing) return;
    if (!kit.voice() || !kit.layout({ layer: 1 })) { close(); return; }
    layer = 1;
    render();
  }


  return { open, close, render, onVoiceChanged, syncHistory, isOpen: () => showing };
}
