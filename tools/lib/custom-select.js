/**
 * A small themed combobox for controls whose open list must belong to the desk rather
 * than to the operating system. The field exposes a select-like `.value` property and
 * emits `input` when a user chooses an option, so existing editor wiring can use it
 * without knowing whether the closed control is native or custom.
 *
 * `options` is `[value, label]`, or `[value, label, note]` where a second COLUMN is
 * wanted. The note is the reason this control exists on the engine pickers: an OS
 * dropdown can only draw one run of text per row, so `MRDR-3 · Layered analogue` had to
 * be one string, and eight of those in a column is eight names and eight descriptions
 * interleaved with nothing lining up. Given its own cell, every description starts at
 * the same x and the list reads as two columns — which is what it always was.
 *
 * The note lives in the OPEN list only. The closed field keeps the label alone: it is
 * 132px wide beside a search box, and the answer to "which engine" is the name.
 *
 * A fourth slot, `[value, label, note, disabled]`, closes one row without removing it.
 * Removing it is the tempting alternative and it is the wrong one: the M8TRX kit offer
 * closes the two modes that replay a song's own drums when the song has none, and
 * relabels them "— none in song". A row that is simply absent answers "why can I not
 * pick that" with silence. A closed row cannot be chosen, cannot be landed on by the
 * arrow keys, and says why it is closed.
 */
export function createCustomSelect({
  label, title = '', idPrefix, options, value,
  fieldClass = 'regselect', menuClass = 'rolltool-menu regcustommenu',
  optionClass = 'rolltool-option',
}) {
  const field = document.createElement('button');
  field.type = 'button';
  field.className = fieldClass;
  field.title = title;
  field.setAttribute('role', 'combobox');
  field.setAttribute('aria-haspopup', 'listbox');
  field.setAttribute('aria-expanded', 'false');
  field.setAttribute('aria-label', label);

  const valueEl = document.createElement('span');
  valueEl.className = `${fieldClass}-value`;
  field.append(valueEl);

  const safePrefix = String(idPrefix || label || 'custom-select')
    .replace(/[^a-z0-9_-]+/gi, '-');
  const menu = document.createElement('div');
  menu.className = menuClass;
  menu.id = `${safePrefix}-menu`;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', label);
  menu.hidden = true;
  field.setAttribute('aria-controls', menu.id);

  let current = String(value ?? options[0]?.[0] ?? '');
  let open = false;
  let active = 0;
  // `rows` and `optionEls` are rebindable because the list can be REPLACED — see
  // `setOptions` at the bottom. The menu element itself never is: a field whose node is
  // swapped out when its contents change is a field that can disappear from under the
  // pointer that is using it.
  let rows = options;
  let optionEls = [];
  const buildOptions = () => {
  // Two columns only when something asks for them, so every existing caller draws
  // exactly the single-column list it drew before.
  menu.className = rows.some(([, , note]) => note) ? `${menuClass} twocol` : menuClass;
  return rows.map(([optionValue, optionLabel, optionNote, optionOff, optionMeta], index) => {
    const option = document.createElement('div');
    option.className = optionOff ? `${optionClass} off` : optionClass;
    option.id = `${safePrefix}-option-${index}`;
    option.setAttribute('role', 'option');
    if (optionOff) {
      option.dataset.off = '1';
      option.setAttribute('aria-disabled', 'true');
    }
    if (optionNote) {
      const name = document.createElement('span');
      name.className = `${optionClass}-label`;
      name.textContent = optionLabel;
      const note = document.createElement('span');
      note.className = `${optionClass}-note`;
      let parts = null;
      if (optionMeta) {
        try {
          const parsed = JSON.parse(optionMeta);
          if (Array.isArray(parsed)) parts = parsed;
        } catch { parts = null; }
      }
      if (parts?.length) {
        parts.forEach((part, partIndex) => {
          if (partIndex) note.append(document.createTextNode(' + '));
          const effect = document.createElement('span');
          effect.className = `${optionClass}-effect${part.off ? ' off' : ''}`;
          effect.textContent = part.text || '';
          note.append(effect);
        });
      } else {
        note.textContent = optionNote;
      }
      option.append(name, note);
    } else {
      option.textContent = optionLabel;
    }
    option.dataset.value = String(optionValue);
    option.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (optionOff) return;
      choose(option.dataset.value);
    });
    option.addEventListener('pointerenter', () => { if (!optionOff) setActive(index); });
    menu.append(option);
    return option;
  });
  };
  optionEls = buildOptions();

  const paint = () => {
    const selected = rows.find(([optionValue]) => String(optionValue) === current)
      || rows[0];
    if (!selected) return;
    current = String(selected[0]);
    valueEl.textContent = selected[1];
    optionEls.forEach((option) => {
      const on = option.dataset.value === current;
      option.classList.toggle('on', on);
      option.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  };

  const openable = (index) => !optionEls[index]?.dataset.off;
  // Step PAST a closed row rather than stopping on it, in whichever direction the caller
  // was already going, and give up rather than spin if every row is closed.
  const nextOpen = (index, step) => {
    let at = (index + optionEls.length) % optionEls.length;
    for (let i = 0; i < optionEls.length; i++) {
      if (openable(at)) return at;
      at = (at + step + optionEls.length) % optionEls.length;
    }
    return -1;
  };
  const setActive = (index, step = 1) => {
    if (!optionEls.length) return;
    const at = nextOpen(index, step);
    if (at < 0) return;
    active = at;
    optionEls.forEach((option, item) => option.classList.toggle('active', item === active));
    field.setAttribute('aria-activedescendant', optionEls[active].id);
    // A list long enough to scroll — a note picker is eighty-eight keys — must follow
    // the arrow keys, or Down walks the selection off the bottom of a menu that never
    // moves. Written as the menu's own scrollTop rather than `scrollIntoView`, which is
    // free to scroll ancestors as well: a stray document scroll under a FIXED menu moves
    // nothing on screen but reaches the dismiss listener, which would shut the menu the
    // moment it opened.
    if (open) {
      const top = optionEls[active].offsetTop;
      const bottom = top + optionEls[active].offsetHeight;
      if (top < menu.scrollTop) menu.scrollTop = top;
      else if (bottom > menu.scrollTop + menu.clientHeight) {
        menu.scrollTop = bottom - menu.clientHeight;
      }
    }
  };

  const closeMenu = ({ focus = false } = {}) => {
    if (!open) return;
    open = false;
    menu.hidden = true;
    menu.remove();
    field.setAttribute('aria-expanded', 'false');
    field.removeAttribute('aria-activedescendant');
    field.classList.remove('flipped');
    document.removeEventListener('click', onDocDown);
    window.removeEventListener('resize', onDismiss, true);
    window.removeEventListener('scroll', onDismiss, true);
    document.removeEventListener('mash-close-custom-select', onGlobalClose);
    if (focus) field.focus();
  };
  const onDocDown = (ev) => {
    // The field's caret is a pseudo-element, and some browser pointer paths report
    // the surrounding control rather than the button as the event target. Check the
    // composed path and the actual screen hit as well as `target`; otherwise the
    // outside listener closes the menu before the caret's click handler can finish its
    // toggle, which would make the same click immediately reopen it.
    const path = typeof ev.composedPath === 'function' ? ev.composedPath() : [];
    const hit = Number.isFinite(ev.clientX) && Number.isFinite(ev.clientY)
      ? document.elementFromPoint(ev.clientX, ev.clientY) : null;
    const inMenu = path.includes(menu) || menu.contains(ev.target) || menu.contains(hit);
    const inField = path.includes(field) || field.contains(ev.target) || field.contains(hit);
    if (!inMenu && !inField) closeMenu();
  };
  // The desk scrolling under an open menu should close it — the menu is fixed and would
  // be left pointing at nothing. The menu scrolling INSIDE ITSELF is the opposite: a
  // capped list is meant to be wheeled through. Ignore scrolls that came from the list.
  const onDismiss = (ev) => {
    if (ev?.target instanceof Node && menu.contains(ev.target)) return;
    closeMenu();
  };
  const onGlobalClose = () => closeMenu();
  const choose = (next) => {
    const nextValue = String(next);
    const changed = nextValue !== current;
    current = nextValue;
    paint();
    if (changed) field.dispatchEvent(new Event('input', { bubbles: true }));
    closeMenu({ focus: true });
  };

  const openMenu = () => {
    if (open || !optionEls.length) return;
    // Only one custom list should occupy the top layer at a time. The field stops the
    // bubbling click so its own toggle can win, which means an already-open sibling would
    // otherwise never see that click as an outside interaction.
    document.dispatchEvent(new Event('mash-close-custom-select'));
    open = true;
    // Native popovers and dialogs live in the browser's top layer. Anything appended to
    // BODY is painted underneath them, regardless of its z-index, so an open list inside
    // Advanced M8TRX or Mixer settings would be visible only in the DOM and every pointer
    // would hit the field below. Keep the menu in the active layer's subtree; ordinary desk
    // panels still use BODY so their fixed menu can escape clipping and stacking contexts.
    const popover = field.closest('[popover]');
    const dialog = field.closest('dialog[open]');
    const host = popover?.matches(':popover-open')
      ? popover
      : dialog?.open ? dialog : document.body;
    host.append(menu);
    menu.hidden = false;
    field.setAttribute('aria-expanded', 'true');
    setActive(Math.max(0, optionEls.findIndex((option) => option.dataset.value === current)));
    const rect = field.getBoundingClientRect();
    menu.style.minWidth = `${Math.round(rect.width)}px`;
    menu.style.left = `${Math.round(rect.left)}px`;
    const height = menu.offsetHeight;
    const below = window.innerHeight - rect.bottom;
    const flip = below < height + 8 && rect.top > below;
    menu.style.top = `${Math.round(flip ? rect.top - height - 3 : rect.bottom + 3)}px`;
    field.classList.toggle('flipped', flip);
    // Bubble after the field's own click handler. A capture-phase pointerdown here can
    // race a caret click: it closes the menu, then the field sees `open === false` and
    // reopens it during the same interaction.
    document.addEventListener('click', onDocDown);
    window.addEventListener('resize', onDismiss, true);
    window.addEventListener('scroll', onDismiss, true);
    document.addEventListener('mash-close-custom-select', onGlobalClose);
  };

  field.onclick = (ev) => {
    ev.stopPropagation();
    if (open) closeMenu({ focus: true });
    else openMenu();
  };
  field.onkeydown = (ev) => {
    if (ev.key === 'Tab') { closeMenu(); return; }
    if (ev.key === 'Escape') {
      if (!open) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeMenu({ focus: true });
      return;
    }
    if (!open) {
      if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(ev.key)) return;
      ev.preventDefault();
      ev.stopPropagation();
      openMenu();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(ev.key)) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.key === 'ArrowDown') setActive(active + 1, 1);
    else if (ev.key === 'ArrowUp') setActive(active - 1, -1);
    else if (ev.key === 'Home') setActive(0, 1);
    else if (ev.key === 'End') setActive(optionEls.length - 1, -1);
    else if (openable(active)) choose(optionEls[active].dataset.value);
  };

  Object.defineProperty(field, 'value', {
    configurable: true,
    get: () => current,
    set: (next) => { current = String(next); paint(); },
  });
  /**
   * Replace the list without replacing the control.
   *
   * The alternative — build a new field and put it where the old one was — loses
   * whatever the old one was in the middle of: an open menu vanishes, focus goes back to
   * the document, and a pointer already on its way to a row lands on nothing. Lists on
   * this desk change while they are being looked at (the drum offer relabels itself when
   * the song under it changes), so the control has to survive its own contents.
   */
  field.setOptions = (next) => {
    rows = next;
    menu.textContent = '';
    optionEls = buildOptions();
    active = 0;
    paint();
    if (open) setActive(Math.max(0, optionEls.findIndex((o) => o.dataset.value === current)));
  };
  paint();
  return field;
}
