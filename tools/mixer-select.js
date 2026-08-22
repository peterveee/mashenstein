// EVERY DROPDOWN ON THE DESK IS THE DESK'S, not the operating system's.
//
// `appearance: none` only ever styled the closed box. The list a native `<select>`
// opens belongs to the OS — its colours, its row height, its corner radius, its font —
// and there is no property that reaches into it. On a desk with nine themes that means
// every dropdown was a slab of Aqua dropped over the mix the moment it was opened, and
// the one control on the desk that could not be read at the size everything else is
// read at.
//
// The piano roll and the voice editor already had their own; this makes it the rule
// rather than the four places somebody remembered. It works by UPGRADING the native
// select IN PLACE rather than by rewriting twenty-nine call sites:
//
//   · the `<select>` stays in the document and stays the state — every `sel.value`,
//     `sel.onchange`, `sel.options[0].textContent = …` and `sel.add(new Option(…))`
//     already written against it keeps working, and keeps working the same way;
//   · a `createCustomSelect` field is inserted beside it and shown in its place;
//   · choosing on the field writes the select and fires `change` and `input` on it, so
//     the handler that was already there runs, once, with the value it expects.
//
// That seam is the whole point. A rewrite would have been twenty-nine chances to change
// what a control does while changing how it looks, and the failure mode of the ones that
// went wrong would have been silent — a dropdown that still opens and no longer applies.
//
// The sweep is a MutationObserver rather than a list of calls, for the same reason: a
// dropdown built by code written next month is a dropdown nobody will remember to pass
// through here. Everything that reaches the document gets upgraded, including selects
// inside an `ask()` dialog built from an HTML string.
//
// Two ways out, both deliberate and neither of them the default:
//   `data-native` on the select   — leave this one alone, it is a real select on purpose
//   `select[multiple]` / `[size]` — not a dropdown at all; nothing here applies
import { createCustomSelect } from './lib/custom-select.js';

const upgraded = new WeakMap();
// The same fields again, enumerable: `syncDeskSelects` has to walk them every tick and a
// WeakMap cannot be walked. Entries leave when the panel holding them is torn down.
const live = new Set();

const skip = (select) => !(select instanceof HTMLSelectElement)
  || select.multiple || select.size > 1 || select.dataset.native != null;

/**
 * The rows, as `createCustomSelect` wants them.
 *
 * `label` before `textContent`: an `<option label="…">` overrides its text in a native
 * select and one or two on the desk use it. `data-note` opts a list into the two-column
 * layout — nothing does yet, and the engine pickers that want it build their control
 * directly rather than coming through here.
 */
const rowsOf = (select) => [...select.options].map((o) => [
  o.value, o.label || o.textContent, o.dataset.note || '', o.disabled, o.dataset.fxparts || '',
]);

/** True when the two lists differ in any way the field would draw differently. */
const same = (a, b) => a.length === b.length
  && a.every((row, i) => row.every((cell, j) => cell === b[i][j]));

/**
 * Give one `<select>` the desk's dropdown, or refresh the one it already has.
 *
 * Idempotent, and cheap when nothing has changed: the sweep below calls it on every
 * mutation batch, and the desk mutates a great deal.
 */
export function upgradeSelect(select) {
  if (skip(select)) return null;
  const rows = rowsOf(select);
  const held = upgraded.get(select);
  if (held) {
    // Same rows: only the VALUE or the switched-off state can have moved, and both are
    // written straight onto the field. The `disabled` half matters — the observer wakes
    // on that attribute, and a control that was switched off and back on again would
    // otherwise stay greyed with nothing left to change it.
    if (same(held.rows, rows)) {
      if (held.field.value !== select.value) held.field.value = select.value;
      held.field.disabled = select.disabled;
      return held.field;
    }
    // The list itself changed — a song with no drums, a new bank of visualiser presets.
    // Replaced INSIDE the control it is already in, never by putting a new control where
    // the old one was: these lists change while somebody is looking at them, and a field
    // swapped out mid-gesture takes its open menu and the focus with it.
    held.field.setOptions(rows.length ? rows : [['', '—']]);
    held.field.value = select.value;
    held.field.disabled = select.disabled;
    held.rows = rows;
    return held.field;
  }
  const field = createCustomSelect({
    label: select.getAttribute('aria-label') || select.title || select.name || select.id || 'Choose',
    title: select.title,
    idPrefix: select.id || select.name || 'deskselect',
    options: rows.length ? rows : [['', '—']],
    value: select.value,
    fieldClass: 'deskselect',
    menuClass: select.dataset.menuClass || 'rolltool-menu deskmenu',
  });
  // The select's own classes come along, because the desk sizes its dropdowns by
  // context — `.fxsel` is full width on an effect card, `.drawerrow select` is a flex
  // child, `#reinspector select` has a minimum height. Those rules were written for the
  // control in this slot, and this is the control in this slot. The look that must NOT
  // be inherited from them — the font size they shrank to fit an OS popup — is pinned on
  // `button.deskselect`, which outranks a bare class.
  // `deskselect-native` is dropped on the way across: it is the marker that takes the
  // native control out of the layout, and a REBUILD copies the class list a second time,
  // after that marker has been added.
  const carried = select.className.split(/\s+/).filter((c) => c && c !== 'deskselect-native');
  if (carried.length) field.className = `deskselect ${carried.join(' ')}`;
  if (select.id === 'devtarget') {
    const NS = 'http://www.w3.org/2000/svg';
    const caret = document.createElementNS(NS, 'svg');
    caret.classList.add('deskselect-caret');
    caret.setAttribute('viewBox', '0 0 24 24');
    caret.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M4 7.5l8 8 8-8');
    caret.append(path);
    field.append(caret);
  }
  field.disabled = select.disabled;
  select.after(field);
  // Not `hidden` and not removed: still in the document, still the state, still what
  // `document.getElementById` hands back — and out of the layout and off the tab ring,
  // so there is exactly one dropdown here to look at and exactly one to tab to.
  select.classList.add('deskselect-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  field.addEventListener('input', () => {
    if (select.value === field.value) return;
    select.value = field.value;
    // `change` is what a select fires and what every handler on this desk listens for.
    // `input` after it, because a handful listen for that instead, and a control that
    // fires only one of the two is a control that works on some panels and not others.
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
  });
  upgraded.set(select, { field, rows });
  live.add(select);
  return field;
}

/** Upgrade every dropdown in a subtree. */
export function upgradeSelects(root = document) {
  if (root instanceof HTMLSelectElement) upgradeSelect(root);
  root.querySelectorAll?.('select').forEach(upgradeSelect);
}

/**
 * Watch the document and keep every dropdown the desk's.
 *
 * One observer for the whole page rather than one per panel: a dropdown built by code
 * written next month is a dropdown nobody will remember to register.
 *
 * childList and `disabled`, and NOT `characterData`. Catching an option's text being
 * rewritten in place would mean observing character data across the whole desk, and the
 * whole desk is meters and readouts repainting every frame — thousands of records a
 * second, every one of them about a number that is not in a dropdown, on a page whose
 * audio graph is already sized to one core. The two places that rewrite an option's text
 * rather than rebuilding the list are picked up by `syncDeskSelects` instead, which is
 * already being called and can afford to look.
 */
export function watchDeskSelects(root = document.body) {
  upgradeSelects(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') { upgradeSelect(record.target); continue; }
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) upgradeSelects(node);
      }
      // An option added to or removed from a select that is already upgraded: the record
      // names the select as the parent of what moved.
      const target = record.target instanceof HTMLSelectElement
        ? record.target : record.target?.closest?.('select');
      if (target) upgradeSelect(target);
    }
  });
  observer.observe(root, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['disabled', 'title', 'aria-label'],
  });
  return observer;
}

// How often the full re-read below actually reads the option lists. Every call compares
// the VALUES, which is one string per dropdown; the lists are compared on a slower beat
// because rebuilding one is what a panel does, and a panel rebuilding replaces the select
// outright — which the observer sees immediately. This is only for the two controls that
// relabel a row in place.
const RELIST_MS = 400;
let lastRelist = 0;

/**
 * Re-read every upgraded select, in case something assigned to `.value`.
 *
 * Called from the desk's own tick. Deliberately not a property override on each select:
 * redefining `value` on an HTMLSelectElement instance is the kind of trick that works
 * until something reads it through a prototype method. This is one string compare per
 * dropdown on a desk that has around thirty of them, over a Set rather than a query, and
 * it drops the ones whose panel has been torn down as it goes.
 */
export function syncDeskSelects(now = performance.now()) {
  const relist = now - lastRelist >= RELIST_MS;
  if (relist) lastRelist = now;
  for (const select of live) {
    if (!select.isConnected) { live.delete(select); continue; }
    if (relist) { upgradeSelect(select); continue; }
    const held = upgraded.get(select);
    if (held && held.field.value !== select.value) held.field.value = select.value;
  }
}
