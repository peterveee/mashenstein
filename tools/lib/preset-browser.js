import { createCustomSelect } from './custom-select.js';

import { emptyPresetFilters, presetBrowserModel } from './preset-browser-model.js';

let browserSequence = 0;

/** Shared browser; hosts own eligibility, search, selection, and audio actions. */
export function createPresetBrowser({ voices, renderPreset, state = emptyPresetFilters(),
  query = () => '', onClear = () => {} }) {
  const instance = ++browserSequence;
  const element = document.createElement('div');
  element.className = 'preset-browser';
  const columns = document.createElement('div');
  columns.className = 'preset-columns';
  const clear = document.createElement('button');
  clear.type = 'button'; clear.className = 'preset-clear'; clear.textContent = 'Clear filters';
  clear.onclick = () => { Object.assign(state, emptyPresetFilters()); onClear(); refresh(); };
  element.append(clear, columns);

  const keyboard = (list) => {
    const buttons = [...list.querySelectorAll('button')];
    const current = buttons.find((button) => button.classList.contains('on')) || buttons[0];
    for (const button of buttons) button.tabIndex = button === current ? 0 : -1;
    list.addEventListener('keydown', (ev) => {
      // Let the focused native button activate, without the Desk treating Space or
      // Enter as a transport/editor shortcut underneath the browser.
      if (ev.key === 'Enter' || ev.key === ' ') { ev.stopPropagation(); return; }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(ev.key)) return;
      if (!buttons.length) return;
      ev.preventDefault(); ev.stopPropagation();
      let index = buttons.indexOf(document.activeElement);
      index = ev.key === 'Home' ? 0 : ev.key === 'End' ? buttons.length - 1
        : Math.max(0, Math.min(buttons.length - 1, index + (ev.key === 'ArrowDown' ? 1 : -1)));
      for (const [i, button] of buttons.entries()) button.tabIndex = i === index ? 0 : -1;
      buttons[index].focus();
    });
  };
  function refresh({ reconcile = false, focusKey = null } = {}) {
    const model = presetBrowserModel(voices(), state, query(), { reconcile });
    Object.assign(state, model.filters);
    columns.replaceChildren();
    for (const [key, label] of [['category', 'Category'], ['subcategory', 'Subcategory'], ['engine', 'Engine']]) {
      const col = document.createElement('section'); col.className = 'preset-facet';
      const heading = document.createElement('h5'); heading.textContent = label;
      const list = document.createElement('div'); list.className = 'preset-options';
      list.setAttribute('role', 'group'); list.setAttribute('aria-label', label);
      const choose = (value, compact = false) => {
        state[key] = value;
        refresh({ reconcile: true, focusKey: { key, compact } });
      };
      for (const option of model.facets[key]) {
        const button = document.createElement('button'); button.type = 'button';
        button.dataset.value = option.value;
        button.classList.toggle('on', state[key] === option.value);
        button.setAttribute('aria-pressed', String(state[key] === option.value));
        const name = document.createElement('span'); name.textContent = option.label;
        const count = document.createElement('span'); count.className = 'preset-count'; count.textContent = option.count;
        button.append(name, count); button.onclick = () => choose(option.value);
        list.append(button);
      }
      const select = createCustomSelect({ label, idPrefix: `preset-${instance}-${key}`,
        options: model.facets[key].map((o) => [o.value, `${o.label} (${o.count})`]),
        value: state[key], fieldClass: 'deskselect',
      });
      select.classList.add('preset-compact');
      select.addEventListener('input', () => choose(select.value, true));
      keyboard(list); col.dataset.facet = key; col.append(heading, select, list); columns.append(col);
    }
    const result = document.createElement('section'); result.className = 'preset-result';
    const heading = document.createElement('h5'); heading.setAttribute('aria-live', 'polite');
    heading.textContent = `Preset · ${model.results.length}`;
    const list = document.createElement('div'); list.className = 'preset-list';
    list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Presets');
    for (const row of model.results) {
      const button = renderPreset(row.voice, row);
      button.type = 'button'; button.dataset.voice = row.voice.id;
      button.setAttribute('aria-pressed', String(button.classList.contains('on')));
      list.append(button);
    }
    if (!model.results.length) {
      const none = document.createElement('p'); none.className = 'preset-empty';
      none.textContent = 'No presets match these filters. Clear filters to browse again.'; list.append(none);
    }
    keyboard(list); result.append(heading, list); columns.append(result);
    if (focusKey) {
      const col = columns.querySelector(`[data-facet="${focusKey.key}"]`);
      const target = focusKey.compact ? col.querySelector('.preset-compact') : col.querySelector('button.on');
      target?.focus();
      if (focusKey.compact) requestAnimationFrame(() => target?.isConnected && target.focus());
    }
  }
  function reveal(id) {
    let row = [...element.querySelectorAll('.preset-list button')].find((b) => b.dataset.voice === id);
    if (!row) {
      Object.assign(state, emptyPresetFilters()); onClear(); refresh();
      row = [...element.querySelectorAll('.preset-list button')].find((b) => b.dataset.voice === id);
    }
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    row?.focus({ preventScroll: true });
  }
  refresh({ reconcile: true });
  return { element, refresh, reveal };
}
