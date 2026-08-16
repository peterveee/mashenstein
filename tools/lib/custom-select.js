/**
 * A small themed combobox for controls whose open list must belong to the desk rather
 * than to the operating system. The field exposes a select-like `.value` property and
 * emits `input` when a user chooses an option, so existing editor wiring can use it
 * without knowing whether the closed control is native or custom.
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
  const optionEls = options.map(([optionValue, optionLabel], index) => {
    const option = document.createElement('div');
    option.className = optionClass;
    option.id = `${safePrefix}-option-${index}`;
    option.setAttribute('role', 'option');
    option.textContent = optionLabel;
    option.dataset.value = String(optionValue);
    option.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      choose(option.dataset.value);
    });
    option.addEventListener('pointerenter', () => setActive(index));
    menu.append(option);
    return option;
  });

  const paint = () => {
    const selected = options.find(([optionValue]) => String(optionValue) === current)
      || options[0];
    if (!selected) return;
    current = String(selected[0]);
    valueEl.textContent = selected[1];
    optionEls.forEach((option) => {
      const on = option.dataset.value === current;
      option.classList.toggle('on', on);
      option.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  };

  const setActive = (index) => {
    if (!optionEls.length) return;
    active = (index + optionEls.length) % optionEls.length;
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
    document.removeEventListener('pointerdown', onDocDown, true);
    window.removeEventListener('resize', onDismiss, true);
    window.removeEventListener('scroll', onDismiss, true);
    document.removeEventListener('mash-close-custom-select', onGlobalClose);
    if (focus) field.focus();
  };
  const onDocDown = (ev) => {
    if (!menu.contains(ev.target) && !field.contains(ev.target)) closeMenu();
  };
  // The desk scrolling under an open menu should close it — the menu is fixed and would
  // be left pointing at nothing. The menu scrolling INSIDE ITSELF is the opposite: a
  // capped list is meant to be wheeled through, and the capture-phase listener sees
  // that scroll too. Ignore the ones that came from the list.
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
    open = true;
    document.body.append(menu);
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
    document.addEventListener('pointerdown', onDocDown, true);
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
    if (ev.key === 'ArrowDown') setActive(active + 1);
    else if (ev.key === 'ArrowUp') setActive(active - 1);
    else if (ev.key === 'Home') setActive(0);
    else if (ev.key === 'End') setActive(optionEls.length - 1);
    else choose(optionEls[active].dataset.value);
  };

  Object.defineProperty(field, 'value', {
    configurable: true,
    get: () => current,
    set: (next) => { current = String(next); paint(); },
  });
  paint();
  return field;
}
