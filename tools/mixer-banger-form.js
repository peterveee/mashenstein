// MAKE A BANGER… — the Form row: the song's shape, drawn, and editable.
//
// A strip of the song's sections, left to right, each as wide as it is long and as tall
// as it hits (its energy), coloured by its kind (tools/lib/banger/form-types.js). The
// template buttons (Club, Pop Song, Anthem, Groove) fill it; touching it — dragging a
// section to a new place, resizing one, changing its kind, name, energy, variant or lift,
// adding or removing one — makes it a DRAWN form, which the request then carries as
// `options.form.sections` and every take re-makes. Reset (or another template, or another
// style) goes back to the template's own.
//
// The moves are pure functions in tools/lib/banger/form-edit.js; this file only draws
// them and wires the keys and the pointer. Its dropdowns are plain <select>s, which the
// desk turns into its own (tools/mixer-select.js) — no OS popups.
import { SECTION_TYPES, SECTION_TYPE_IDS } from './lib/banger/form-types.js';
import { buildForm, formFromList, identifySections } from './lib/banger/form.js';
import { bangerBars, bangerBpm } from './lib/banger/options.js';
import { FORM_TEMPLATES } from './lib/banger/templates.js';
import { sectionFxInspector, wireSectionFx } from './mixer-banger-section-fx.js';
import { expandSectionRules } from './lib/banger/section-effects.js';
import * as edit from './lib/banger/form-edit.js';

const TEMPLATES = [['club', 'Club', 'Build and drop: intro, build, drop, breakdown, a harder second drop, outro'],
  ...Object.entries(FORM_TEMPLATES).map(([id, t]) => [id, t.label, t.title])];
const ENERGY_STEPS = [0.2, 0.4, 0.6, 0.8, 1];
const ENERGY_NAMES = ['Quietest', 'Low', 'Middle', 'High', 'Flat out'];
const ENERGY_TITLE = 'How hard this section hits. It sets the kit in a verse or pre-chorus (half time at the bottom, open hats and shaker from the middle, sixteenth hats near the top), how many layers a groove plays, and how big the join into the next section is — a big rise gets a riser and a drop-out';
/** A section-kind list: each kind with its one-line note beside it in the open list. */
const kindOptions = (selected, escapeHtml) => SECTION_TYPE_IDS.map((t) => `<option value="${t}" data-note="${escapeHtml(SECTION_TYPES[t].note)}"${t === selected ? ' selected' : ''}>${escapeHtml(SECTION_TYPES[t].label)}</option>`).join('');
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/**
 * The editor in `host`. `request()` is the dialog's request as it stands (normalised
 * options without a drawn form, and its style); `changed()` is called after every edit.
 */
export function createFormEditor({ host, escapeHtml, request, changed, toast, availability }) {
  const state = { edited: false, list: [], selected: null, pressing: false, assignments: {}, locked: false };

  /** The form as it will be made: the drawn one, or the template's at the chosen length. */
  function shown() {
    const { options, style } = request();
    if (state.edited) return identifySections(formFromList(state.list, options, style));
    return buildForm(options, bangerBars(options), style);
  }
  /** Start drawing: the template's form becomes the list being edited. */
  function ensureEdited() {
    if (state.edited) return;
    const { options } = request();
    state.list = edit.fromForm(shown(), (options.form.template || 'club') === 'club');
    state.edited = true;
  }
  function commit(list, select = state.selected) {
    state.list = list;
    state.selected = select == null ? null : Math.max(0, Math.min(list.length - 1, select));
    render();
    changed();
    host.querySelector(`.bgblock[data-i="${state.selected}"]`)?.focus();
  }
  const apply = (fn, select) => { if (state.locked) return; ensureEdited(); commit(fn(state.list), select); };

  // ---------------------------------------------------------------- drawing
  function render() {
    const { options, style, sourceBpm } = request();
    const form = shown();
    const template = options.form.template || 'club';
    const bars = form.length ? form[form.length - 1].to : 0;
    const bpm = bangerBpm(options, style, sourceBpm);
    const problems = state.edited ? edit.issues(state.list) : [];
    const sel = state.selected != null ? form[state.selected] : null;
    host.innerHTML = '<div class="bangerrow"><span class="bangerlabel">Form</span>'
      + '<div class="askseg" id="bgtemplate" role="group" aria-label="Form">'
      + TEMPLATES.map(([id, label, title]) => `<button type="button" data-template="${id}" title="${escapeHtml(title)}"`
        + ` aria-pressed="${!state.edited && template === id}" class="${!state.edited && template === id ? 'on' : ''}">${escapeHtml(label)}</button>`).join('')
      + '</div>'
      + (state.edited ? '<span class="bgformdrawn">Drawn <button type="button" id="bgformreset" title="Throw your changes away and go back to this form\'s own sections">Reset</button></span>' : '')
      + `<span class="bgformsum" title="How long the song will be: its sections, its bars, and its running time at ${bpm} BPM">${form.length} sections · ${bars} bars · ${mmss((bars * 240) / bpm)}</span></div>`
      + `<div class="bgstrip" id="bgstrip" role="listbox" aria-label="The song's sections — click to change one, drag to move it">`
      + form.map((f, i) => {
        const def = SECTION_TYPES[f.type] || SECTION_TYPES.groove;
        const lifted = f.lifted && options.form.keyLift !== 'none';
        return `<div class="bgblock${state.selected === i ? ' on' : ''}" data-i="${i}" tabindex="0" role="option" aria-selected="${state.selected === i}"`
          + ` style="flex-grow:${f.bars};--c:${def.colour};--e:${Math.round((0.25 + 0.75 * (f.energy ?? def.energy)) * 100)}%"`
          + ` title="${escapeHtml(`${f.label} (${def.label}) — ${def.title}.\n${f.bars} bars, bars ${f.from}–${f.to} · energy ${ENERGY_NAMES[Math.max(0, Math.min(4, Math.round((f.energy ?? def.energy) * 5) - 1))]}${lifted ? ' · lifted by the Key Lift' : ''}\nClick to change it, drag to move it`)}">`
          + '<span class="bgblockfill"></span>'
          + `<span class="bgblocklab">${escapeHtml(f.label)}${lifted ? ' ↑' : ''}</span><span class="bgblockn">${f.bars}${state.assignments[f.id]?.length ? ' · FX' : ''}</span></div>`;
      }).join('')
      + '</div>'
      + `<div class="bgformtools">${sel ? inspector(sel, state.selected) + sectionFxInspector(state.assignments[sel.id] || [], escapeHtml, availability?.(sel, state.assignments[sel.id] || []) || []) : hint(form.length)}</div>`
      + (problems.length ? `<div class="bangerwarn">${escapeHtml(problems.join(' · '))}</div>` : '');
    wire();
    if (state.locked) host.querySelectorAll('#bgtemplate button, #bgformreset, .bgformtools > label input, .bgformtools > label select, .bgformtools > button, .bgfsbars button, .bgfsenergy button, #bgfsadd').forEach(el => el.disabled = true);
  }

  const hint = (n) => '<span class="bangernote">Click a section to change it, drag one to move it. A changed form is kept for every take.</span>'
    + addControl(n - 1, 'Add at the end');

  function addControl(after, label = 'Add after') {
    return `<label class="askfield bgformadd" title="Put a new section ${after < 0 ? 'at the start' : 'after this one'} — each kind plays something different (its note says what)">${label}<select id="bgfsadd" data-after="${after}" title="Add a section"><option value="" data-note=" ">Add a section…</option>`
      + kindOptions(null, escapeHtml) + '</select></label>';
  }

  function inspector(f, i) {
    const def = SECTION_TYPES[f.type];
    const variant = def.variants
      ? `<label class="askfield" title="What this ${escapeHtml(def.label.toLowerCase())} plays">Plays<select id="bgfsvariant" title="What this section plays">${def.variants.map(([id, label, note]) => `<option value="${id}" data-note="${escapeHtml(note || '')}"${(f.variant || def.variants[0][0]) === id ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label>`
      : '';
    const energy = f.energy ?? def.energy;
    const near = ENERGY_STEPS.reduce((best, x) => (Math.abs(x - energy) < Math.abs(best - energy) ? x : best), ENERGY_STEPS[0]);
    return `<label class="askfield" title="${escapeHtml(`What kind of section this is. ${def.label}: ${def.title}`)}">Kind<select id="bgfstype" title="What kind of section this is">${kindOptions(f.type, escapeHtml)}</select></label>`
      + `<label class="askfield" title="What this section is called — on the strip and in the song's notes. Empty: its kind's own name">Name<input id="bgfslabel" type="text" maxlength="24" value="${escapeHtml(f.label)}" title="What this section is called"></label>`
      + `<div class="bgfsbars" title="How long this section is (${def.min}–${def.max} bars). Also + and − on the strip"><span class="bangerlabel">Bars</span>`
      + `<button type="button" id="bgfsless" title="Four bars shorter (−)"${f.bars <= def.min ? ' disabled' : ''}>−</button><b>${f.bars}</b>`
      + `<button type="button" id="bgfsmore" title="Four bars longer (+)"${f.bars >= def.max ? ' disabled' : ''}>+</button></div>`
      + `<div class="bgfsenergy" title="${escapeHtml(ENERGY_TITLE)}"><span class="bangerlabel">Energy</span><div class="askseg" id="bgfsenergy">`
      + ENERGY_STEPS.map((x, k) => `<button type="button" data-energy="${x}" title="${ENERGY_NAMES[k]} — ${escapeHtml(ENERGY_TITLE)}" class="${x === near ? 'on' : ''}">${k + 1}</button>`).join('')
      + '</div></div>'
      + variant
      + (def.hook ? `<label class="askcheck askcheck-toggle" title="Lift: this section goes up by the Key Lift (More Options → Form) — the last-chorus key change"><input type="checkbox" id="bgfslift"${f.lifted ? ' checked' : ''}><span class="fxswitch${f.lifted ? ' on' : ''}" aria-hidden="true"><i></i></span><span>Lift</span></label>` : '')
      + addControl(i)
      + `<button type="button" id="bgfsdel" class="bgfsdel" title="Remove this section (Delete)">Remove</button>`;
  }

  // ---------------------------------------------------------------- wiring
  function wire() {
    host.querySelectorAll('#bgtemplate button').forEach((b) => {
      b.onclick = () => {
        if (state.locked) return;
        clearEffects();
        const input = document.getElementById('bgtemplatevalue');
        state.edited = false; state.list = []; state.selected = null;
        if (input) { input.value = b.dataset.template; input.dispatchEvent(new Event('change', { bubbles: true })); }
        render();
        changed();
      };
    });
    const reset = host.querySelector('#bgformreset');
    if (reset) reset.onclick = () => { if (state.locked) return; clearEffects(); state.edited = false; state.list = []; state.selected = null; render(); changed(); };

    const strip = host.querySelector('#bgstrip');
    strip.addEventListener('pointerdown', onPointerDown);
    host.querySelectorAll('.bgblock').forEach((el) => {
      el.addEventListener('keydown', onKey);
      el.addEventListener('focus', () => { if (!state.pressing && state.selected !== Number(el.dataset.i)) { state.selected = Number(el.dataset.i); render(); host.querySelector(`.bgblock[data-i="${state.selected}"]`)?.focus(); } });
    });

    const f = shown()[state.selected];
    if (f) wireSectionFx(host, state.assignments[f.id] || [], rows => {
      if (rows.length) state.assignments[f.id] = rows;
      else delete state.assignments[f.id];
      changed();
    });
    const i = state.selected;
    const on = (id, ev, fn) => { const el = host.querySelector(`#${id}`); if (el) el.addEventListener(ev, fn); };
    on('bgfstype', 'change', (e) => apply((l) => edit.setSection(l, i, { type: e.target.value }), i));
    on('bgfslabel', 'change', (e) => apply((l) => edit.setSection(l, i, { label: e.target.value.trim() || null }), i));
    on('bgfsless', 'click', () => apply((l) => edit.resizeSection(l, i, -4), i));
    on('bgfsmore', 'click', () => apply((l) => edit.resizeSection(l, i, 4), i));
    host.querySelectorAll('#bgfsenergy button').forEach((b) => {
      b.onclick = () => apply((l) => edit.setSection(l, i, { energy: Number(b.dataset.energy) }), i);
    });
    on('bgfsvariant', 'change', (e) => apply((l) => edit.setSection(l, i, { variant: e.target.value }), i));
    on('bgfslift', 'change', (e) => apply((l) => edit.setSection(l, i, { lift: e.target.checked || null }), i));
    on('bgfsdel', 'click', () => remove(i));
    on('bgfsadd', 'change', (e) => {
      if (!e.target.value) return;
      const after = Number(e.target.dataset.after);
      apply((l) => edit.addSection(l, after, e.target.value), after + 1);
    });
  }

  function remove(i) {
    if (state.locked) return;
    if (shown().length <= 1) { toast?.('A song needs at least one section', 1500); return; }
    delete state.assignments[shown()[i]?.id];
    apply((l) => edit.removeSection(l, i), Math.min(i, shown().length - 2));
  }

  function onKey(e) {
    const i = Number(e.currentTarget.dataset.i);
    const n = shown().length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const to = i + (e.key === 'ArrowLeft' ? -1 : 1);
      if (to < 0 || to >= n) return;
      e.preventDefault();
      if (e.altKey && !state.locked) apply((l) => edit.moveSection(l, i, to), to);
      else host.querySelector(`.bgblock[data-i="${to}"]`)?.focus();
    } else if (state.locked) return;
    else if (e.key === '+' || e.key === '=') {
      e.preventDefault(); apply((l) => edit.resizeSection(l, i, 4), i);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault(); apply((l) => edit.resizeSection(l, i, -4), i);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); remove(i);
    }
  }

  /** Drag to reorder: a press that moves more than a few pixels picks the section up. */
  function onPointerDown(e) {
    const block = e.target.closest('.bgblock');
    if (!block || e.button !== 0) return;
    const strip = e.currentTarget;
    const from = Number(block.dataset.i);
    const x0 = e.clientX;
    let to = from;
    let dragging = false;
    state.pressing = true;
    strip.setPointerCapture(e.pointerId);
    const blocks = [...strip.querySelectorAll('.bgblock')];
    const move = (ev) => {
      if (state.locked) return;
      if (!dragging && Math.abs(ev.clientX - x0) < 5) return;
      dragging = true;
      block.classList.add('dragging');
      to = blocks.findIndex((b) => { const r = b.getBoundingClientRect(); return ev.clientX < r.left + r.width / 2; });
      if (to < 0) to = blocks.length;
      if (to > from) to -= 1;
      blocks.forEach((b, k) => b.classList.toggle('dropmark', k === (to >= from ? to + 1 : to) && k !== from));
      strip.classList.toggle('dropend', to === blocks.length - 1 && to !== from);
    };
    const up = () => {
      state.pressing = false;
      strip.removeEventListener('pointermove', move);
      strip.removeEventListener('pointerup', up);
      strip.removeEventListener('pointercancel', up);
      if (dragging && to !== from) apply((l) => edit.moveSection(l, from, to), to);
      else { state.selected = from; render(); host.querySelector(`.bgblock[data-i="${from}"]`)?.focus(); }
    };
    strip.addEventListener('pointermove', move);
    strip.addEventListener('pointerup', up);
    strip.addEventListener('pointercancel', up);
  }

  function clearEffects() {
    if (Object.keys(state.assignments).length) toast?.('Explicit section effects cleared', 1800);
    state.assignments = {};
  }
  return {
    render,
    setStructureLocked(value) { state.locked = value; render(); },
    loadEffects(config) { state.assignments = expandSectionRules(config, shown()); render(); },
    /** The request with the drawn form in it, when there is one. */
    apply(raw) {
      raw.sectionFx = { ...raw.sectionFx, firstEffect: 'none', secondEffect: 'none', assignments: structuredClone(state.assignments) };
      if (state.edited) raw.form = { ...(raw.form || {}), sections: state.list.map((s) => ({ ...s })) };
      return raw;
    },
    /** Back to the template's own form — `why` says so, when there was a drawn one. */
    reset(why = null) {
      if (state.edited && why) toast?.(why, 1800);
      clearEffects();
      if (!state.locked) { state.edited = false; state.list = []; state.selected = null; }
      render();
    },
    /** A drawn form to start from (a banger's own settings). */
    load(list) {
      if (!list?.length) return;
      state.edited = true; state.list = list.map((s, i) => ({ ...s, id: s.id || `custom:${s.type}:${list.slice(0,i+1).filter(x=>x.type===s.type).length}` })); state.selected = null;
      render();
    },
    /** A new Length: a drawn form rescales to it, keeping its sections. */
    rescale(bars) {
      if (!state.edited) { render(); return; }
      state.list = edit.scaleTo(state.list, bars);
      render();
    },
    get edited() { return state.edited; },
  };
}
