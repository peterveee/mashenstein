// THE DESK'S SMALL DROPDOWN, shared.
//
// Lifted out of the piano roll's closure so the step sequencer can use literally the same
// control rather than a second one that looks nearly like it. It had no roll-local
// dependencies at all — it is a pure factory over {label, title, idPrefix, options, value,
// chooseValue} — so nothing about its behaviour changed in the move.
//
// Why not a native <select>: the popup stays in the document body, which avoids clipping
// inside the keyboard gutter and keeps the open list out of the operating system's own
// chrome, where it cannot be styled to match the desk.
//
// `options` is [{ value, label }]. `value()` is read on every paint, so the caller keeps
// its own state and this never holds a stale copy of it.

export const customPicker = ({ label, title, idPrefix, options, value, chooseValue }) => {
  const field = document.createElement('button');
  field.type = 'button';
  field.className = 'rolltool rollcustomselect';
  field.title = title;
  field.setAttribute('role', 'combobox');
  field.setAttribute('aria-haspopup', 'listbox');
  field.setAttribute('aria-expanded', 'false');
  field.setAttribute('aria-label', label);
  const valueEl = document.createElement('span');
  valueEl.className = 'rolltool-value';
  field.append(valueEl);

  const menu = document.createElement('div');
  menu.className = 'rolltool-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', label);
  menu.hidden = true;
  let open = false;
  let active = 0;

  const optionEls = options.map((option, i) => {
    const o = document.createElement('div');
    o.className = 'rolltool-option';
    o.id = `${idPrefix}-opt-${i}`;
    o.setAttribute('role', 'option');
    o.textContent = option.label;
    o.dataset.value = String(option.value);
    o.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); ev.stopPropagation(); choose(option.value);
    });
    o.addEventListener('pointerenter', () => setActive(i));
    return o;
  });
  menu.append(...optionEls);

  const paint = () => {
    const current = value();
    const selected = options.find((option) => String(option.value) === String(current))
      || options[0];
    valueEl.textContent = selected.label;
    optionEls.forEach((o) => {
      const on = o.dataset.value === String(selected.value);
      o.classList.toggle('on', on);
      o.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  };
  const setActive = (i) => {
    active = (i + optionEls.length) % optionEls.length;
    optionEls.forEach((o, n) => o.classList.toggle('active', n === active));
    field.setAttribute('aria-activedescendant', optionEls[active].id);
  };
  const closeMenu = ({ focus = false } = {}) => {
    if (!open) return;
    open = false; menu.hidden = true; menu.remove();
    field.setAttribute('aria-expanded', 'false');
    field.removeAttribute('aria-activedescendant');
    document.removeEventListener('pointerdown', onDocDown, true);
    window.removeEventListener('resize', onDismiss, true);
    window.removeEventListener('scroll', onDismiss, true);
    if (focus) field.focus();
  };
  const onDocDown = (ev) => {
    if (!menu.contains(ev.target) && !field.contains(ev.target)) closeMenu();
  };
  const onDismiss = () => closeMenu();
  const choose = (next) => {
    chooseValue(next);
    paint();
    closeMenu({ focus: true });
  };
  const openMenu = () => {
    if (open) return;
    open = true; document.body.append(menu); menu.hidden = false;
    field.setAttribute('aria-expanded', 'true');
    const current = String(value());
    setActive(Math.max(0, options.findIndex((o) => String(o.value) === current)));
    const r = field.getBoundingClientRect();
    menu.style.minWidth = `${Math.round(r.width)}px`;
    menu.style.left = `${Math.round(r.left)}px`;
    const height = menu.offsetHeight;
    const below = window.innerHeight - r.bottom;
    const flip = below < height + 8 && r.top > below;
    menu.style.top = `${Math.round(flip ? r.top - height - 3 : r.bottom + 3)}px`;
    field.classList.toggle('flipped', flip);
    document.addEventListener('pointerdown', onDocDown, true);
    window.addEventListener('resize', onDismiss, true);
    window.addEventListener('scroll', onDismiss, true);
  };
  field.onclick = (ev) => {
    ev.stopPropagation();
    if (open) closeMenu({ focus: true }); else openMenu();
  };
  field.onkeydown = (ev) => {
    if (ev.key === 'Tab') { closeMenu(); return; }
    if (ev.key === 'Escape') {
      if (!open) return;
      ev.preventDefault(); ev.stopPropagation(); closeMenu({ focus: true }); return;
    }
    if (!open) {
      if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(ev.key)) return;
      ev.preventDefault(); ev.stopPropagation(); openMenu(); return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(ev.key)) return;
    ev.preventDefault(); ev.stopPropagation();
    if (ev.key === 'ArrowDown') setActive(active + 1);
    else if (ev.key === 'ArrowUp') setActive(active - 1);
    else if (ev.key === 'Home') setActive(0);
    else if (ev.key === 'End') setActive(optionEls.length - 1);
    else choose(optionEls[active].dataset.value);
  };
  paint();
  return field;
};
