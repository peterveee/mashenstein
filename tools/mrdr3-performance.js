// Session-only performance controls for the standalone MRDR-3 playground.
//
// This is deliberately a small view/controller: the synth editor still owns the live
// voice, while the pattern player and the audio effect graph stay in the standalone
// entrypoint. The panel only reports user choices, which keeps the shared Advanced
// renderer free of catalogue and mixer state.

import { EFFECT_BY_ID, paramRange, TEMPO_DIVISIONS } from '../src/engine/effects.js';
import { PATTERNS as BENCH_PATTERNS, PATTERN_RATES as BENCH_RATES } from './mixer-voice-library.js';

const PITCH_CLASSES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const NOTE_OPTIONS = Array.from({ length: 49 }, (_, i) => {
  const midi = 36 + i;
  return { midi, label: `${PITCH_CLASSES[midi % 12]}${Math.floor(midi / 12) - 1}` };
});

// Keep the two effect rows grounded in the desk catalogue. The two custom effects are
// native Web Audio implementations, so they work before Tone has had to initialise and
// in the standalone browser shell just as they do on a Song Mixer insert.
const EFFECTS = {
  reverb: {
    id: 'reverb', label: 'REVERB',
    params: [
      ['decay', 'DECAY', { min: 0.1, max: 8, step: 0.1, unit: 's' }],
      ['preDelay', 'PRE-DELAY', { min: 0, max: 0.2, step: 0.005, unit: 's' }],
      ['wet', 'MIX', paramRange('wet')],
    ],
    defaults: { ...(EFFECT_BY_ID.reverb?.defaults || {}), decay: 2, preDelay: 0.01, wet: 0.4 },
  },
  delay: {
    // Advanced Delay is the project's native, tempo-aware delay and has a fully
    // deterministic Web Audio path (unlike a second ad-hoc DelayNode in this page).
    id: 'chandelay', label: 'DELAY',
    params: [
      ['sync', 'SYNC', { min: 0, max: 1, step: 1 }],
      ['division', 'DIVISION', { min: 0.125, max: 8, step: 0.125 }],
      ['delayMs', 'TIME', paramRange('delayMs')],
      ['feedback', 'FEEDBACK', paramRange('feedback')],
      ['tone', 'TONE', paramRange('tone')],
      ['mix', 'MIX', paramRange('mix')],
      ['pan', 'PAN', paramRange('pan')],
    ],
    defaults: { ...(EFFECT_BY_ID.chandelay?.defaults || {}), sync: 0, division: 0.5,
      delayMs: 250, feedback: 0.3, tone: 4000, mix: 0.35, pan: 0 },
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const number = (value, fallback, range) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(range.min, Math.min(range.max, n)) : fallback;
};

function controlLabel(text) {
  const label = document.createElement('label');
  label.className = 'sfpcontrol';
  const caption = document.createElement('span');
  caption.className = 'sfpcontrol-label'; caption.textContent = text;
  label.append(caption);
  return { label, caption };
}

// The standalone popup deliberately uses the same device/rack primitives as the
// Song Mixer effects panel.  It owns no mixer state, but matching `.device`,
// `.devbar`, `.devtoggle`, `.devgrid`, `.row`, `.head`, `.k`, `.v`, and `.fxsel`
// means the two surfaces keep the same visual rhythm and keyboard-friendly controls.
function effectPowerIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12'); svg.setAttribute('class', 'pwr');
  const ring = document.createElementNS(NS, 'path');
  ring.setAttribute('d', 'M3.6 3.7a3.4 3.4 0 1 0 4.8 0');
  const stem = document.createElementNS(NS, 'path'); stem.setAttribute('d', 'M6 1.9v3.7');
  svg.append(ring, stem);
  return svg;
}

function effectFormat(name, key, value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  if (key === 'decay') return `${n.toFixed(1)}s`;
  if (key === 'preDelay') return `${Math.round(n * 1000)}ms`;
  if (key === 'delayMs') return `${Math.round(n)}ms`;
  if (key === 'tone') return n >= 1000 ? `${(n / 1000).toFixed(1)}kHz` : `${Math.round(n)}Hz`;
  if (['wet', 'mix', 'feedback'].includes(key)) return `${Math.round(n * 100)}%`;
  if (key === 'pan') return n === 0 ? 'C' : `${n > 0 ? '+' : ''}${n.toFixed(2)}`;
  if (key === 'division') {
    const entry = Object.entries(TEMPO_DIVISIONS).find(([, beats]) => Math.abs(beats - n) < 1e-6);
    return entry?.[0] || `${n} beats`;
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function effectRangeRow(name, key, label, value, range, onChange) {
  const row = document.createElement('div'); row.className = 'row';
  const head = document.createElement('div'); head.className = 'head';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  const v = document.createElement('span'); v.className = 'v';
  const input = document.createElement('input'); input.type = 'range';
  input.min = String(range.min); input.max = String(range.max);
  input.step = String(range.step || 0.01); input.value = String(value);
  const show = () => { v.textContent = effectFormat(name, key, input.value); };
  input.addEventListener('input', () => { show(); onChange(number(input.value, value, range)); });
  show(); head.append(k, v); row.append(head, input);
  return row;
}

function effectSelectRow(label, options, value, onChange) {
  const row = document.createElement('div'); row.className = 'row';
  const head = document.createElement('div'); head.className = 'head';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  const v = document.createElement('span'); v.className = 'v';
  const select = document.createElement('select'); select.className = 'fxsel';
  for (const option of options) {
    const el = document.createElement('option');
    el.value = String(option.value); el.textContent = option.label;
    if (el.value === String(value)) el.selected = true;
    select.append(el);
  }
  const show = () => { v.textContent = select.selectedOptions?.[0]?.textContent || ''; };
  select.addEventListener('change', () => { show(); onChange(Number(select.value)); });
  show(); head.append(k, v); row.append(head, select); row.select = select;
  return row;
}

function effectCheckRow(label, checked, onChange) {
  const row = document.createElement('label'); row.className = 'checkrow';
  const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!checked;
  input.addEventListener('change', () => onChange(input.checked));
  const text = document.createElement('span'); text.textContent = label;
  row.append(input, text); row.input = input;
  return row;
}

function selectControl(text, options, value, onChange) {
  const { label } = controlLabel(text);
  const select = document.createElement('select');
  select.className = 'sfpselect';
  for (const option of options) {
    const el = document.createElement('option');
    // Note choices use `midi` as their value; catalogue choices use `id` and the
    // remaining controls use `value`. Keeping the fallback here means every select
    // writes a real value instead of the string "undefined" into its state.
    const optionValue = option.value ?? option.id ?? option.midi;
    el.value = String(optionValue);
    el.textContent = option.label ?? option.name ?? option.id;
    if (el.value === String(value)) el.selected = true;
    select.append(el);
  }
  select.onchange = () => onChange(select.value);
  label.append(select);
  return { label, select };
}

function valueControl(text, value, range, onChange) {
  const { label } = controlLabel(text);
  const input = document.createElement('input');
  input.type = 'number'; input.className = 'sfpnumber';
  input.min = String(range.min); input.max = String(range.max); input.step = String(range.step || 0.01);
  input.value = String(value);
  const set = () => {
    const next = number(input.value, value, range);
    input.value = String(next);
    onChange(next);
  };
  input.onchange = set; input.onblur = set;
  label.append(input);
  return { label, input };
}

function toggleControl(text, value, onChange) {
  const { label } = controlLabel(text);
  const button = document.createElement('button');
  button.type = 'button'; button.className = `sfptoggle${value ? ' on' : ''}`;
  button.textContent = value ? 'ON' : 'OFF';
  button.onclick = () => {
    value = !value; button.classList.toggle('on', value); button.textContent = value ? 'ON' : 'OFF';
    onChange(value);
  };
  label.append(button);
  return { label, button };
}

/**
 * Build the strip directly above the shared performance keyboard.
 *
 * `onPattern`, `onRate`, `onAutoPlay`, `onBpm`, `onRoot`, and `onEffects` are all
 * optional so the shared editor can use the same keyboard without importing this
 * standalone-only control surface.
 */
export function createPerformancePanel({
  bpm = 120,
  rootMidi = 48,
  pattern = 'arp',
  rate = '8',
  auto = false,
  onBpm = () => {},
  onRoot = () => {},
  onPattern = () => {},
  onRate = () => {},
  onAutoPlay = () => {},
  onEffects = () => {},
  toast = () => {},
} = {}) {
  const state = {
    bpm: Math.max(20, Math.min(300, Number(bpm) || 120)),
    rootMidi: Number(rootMidi) || 48,
    pattern,
    rate,
    auto: !!auto,
    effects: {
      reverb: { enabled: false, params: clone(EFFECTS.reverb.defaults) },
      delay: { enabled: false, params: clone(EFFECTS.delay.defaults) },
    },
  };

  const root = document.createElement('section');
  root.className = 'sfperformance';
  root.setAttribute('aria-label', 'Playground performance controls');

  const title = document.createElement('span');
  title.className = 'sfptitle'; title.textContent = 'PERFORM'; root.append(title);

  const bpmCtl = valueControl('BPM', state.bpm, { min: 20, max: 300, step: 1 }, (next) => {
    state.bpm = next; onBpm(next);
  });
  bpmCtl.input.title = 'Tempo for auto-play and tempo-synced delay';
  root.append(bpmCtl.label);

  const base = selectControl('BASE KEY', NOTE_OPTIONS, state.rootMidi, (value) => {
    state.rootMidi = Number(value); onRoot(state.rootMidi);
  });
  base.select.title = 'Root note used by auto-play figures'; root.append(base.label);

  const patterns = BENCH_PATTERNS.map((p) => ({ value: p.id, label: p.label }));
  const rates = BENCH_RATES.map((r) => ({ value: r.id, label: r.label }));
  const patternCtl = selectControl('FIGURE', patterns, state.pattern, (value) => {
    state.pattern = value; onPattern(value);
  });
  const rateCtl = selectControl('RATE', rates, state.rate, (value) => {
    state.rate = value; onRate(value);
  });
  root.append(patternCtl.label, rateCtl.label);

  const autoButton = document.createElement('button');
  autoButton.type = 'button'; autoButton.className = `sfpauto${state.auto ? ' on' : ''}`;
  autoButton.textContent = state.auto ? 'STOP AUTO' : 'AUTO PLAY';
  autoButton.title = 'Play the selected figure from the base key';
  autoButton.onclick = () => {
    state.auto = !state.auto;
    autoButton.classList.toggle('on', state.auto);
    autoButton.textContent = state.auto ? 'STOP AUTO' : 'AUTO PLAY';
    onAutoPlay(state.auto);
  };
  root.append(autoButton);

  const fxButtons = {};
  for (const name of Object.keys(EFFECTS)) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'sfpfx';
    button.textContent = EFFECTS[name].label;
    button.title = `Alter ${EFFECTS[name].label.toLowerCase()}`;
    fxButtons[name] = button;
    root.append(button);
  }

  const popup = document.createElement('div');
  popup.className = 'sfpfpopup'; popup.hidden = true;
  const popupHead = document.createElement('div'); popupHead.className = 'sfpfhead';
  const popupTitle = Object.assign(document.createElement('strong'), { textContent: 'AUDITION FX' });
  popupHead.append(popupTitle);
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '✕'; close.title = 'Close effects';
  close.onclick = () => { popup.hidden = true; };
  popupHead.append(close); popup.append(popupHead);
  const popupBody = document.createElement('div'); popupBody.className = 'sfpfbody'; popup.append(popupBody);

  function syncFxButtons() {
    for (const name of Object.keys(EFFECTS)) fxButtons[name].classList.toggle('on', !!state.effects[name].enabled);
  }
  function emitEffects() { syncFxButtons(); onEffects(clone(state.effects)); }
  function drawEffect(name) {
    const spec = EFFECTS[name];
    const current = state.effects[name];
    const box = document.createElement('div');
    box.className = `device sfpdevice${current.enabled ? '' : ' bypassed'}`;
    const bar = document.createElement('div'); bar.className = 'devbar';
    const enabled = document.createElement('button');
    enabled.type = 'button'; enabled.className = `devtoggle${current.enabled ? ' on' : ''}`;
    enabled.title = current.enabled ? `Bypass ${spec.label.toLowerCase()}` : `Enable ${spec.label.toLowerCase()}`;
    enabled.append(effectPowerIcon());
    enabled.onclick = () => {
      current.enabled = !current.enabled;
      enabled.classList.toggle('on', current.enabled);
      box.classList.toggle('bypassed', !current.enabled);
      enabled.title = current.enabled ? `Bypass ${spec.label.toLowerCase()}` : `Enable ${spec.label.toLowerCase()}`;
      emitEffects();
    };
    const heading = document.createElement('h4'); heading.textContent = spec.label;
    bar.append(enabled, heading); box.append(bar);
    const grid = document.createElement('div'); grid.className = 'devgrid'; box.append(grid);

    const appendRange = (key, label, rawRange) => {
      const range = { ...rawRange };
      grid.append(effectRangeRow(name, key, label, current.params[key], range, (next) => {
        current.params[key] = next; emitEffects();
      }));
    };

    if (name === 'delay') {
      const sync = effectCheckRow('SYNC TO TEMPO', current.params.sync >= 0.5, (on) => {
        current.params.sync = on ? 1 : 0;
        drawPopup(openEffect); emitEffects();
      });
      grid.append(sync);
      const divisions = Object.entries(TEMPO_DIVISIONS).map(([label, value]) => ({ label, value }));
      const division = effectSelectRow('TIME', divisions, current.params.division, (next) => {
        current.params.division = next; emitEffects();
      });
      division.hidden = current.params.sync < 0.5; grid.append(division);
      const time = effectRangeRow(name, 'delayMs', 'TIME', current.params.delayMs,
        paramRange('delayMs'), (next) => { current.params.delayMs = next; emitEffects(); });
      time.hidden = current.params.sync >= 0.5; grid.append(time);
      appendRange('feedback', 'FEEDBACK', paramRange('feedback'));
      appendRange('tone', 'TONE', paramRange('tone'));
      appendRange('mix', 'MIX', paramRange('mix'));
      appendRange('pan', 'PAN', paramRange('pan'));
      return box;
    }

    for (const [key, label, rawRange] of spec.params) {
      appendRange(key, label, rawRange);
    }
    return box;
  }
  let openEffect = 'reverb';
  function drawPopup(name = openEffect) {
    openEffect = name;
    popupBody.textContent = '';
    popupTitle.textContent = `AUDITION FX · ${EFFECTS[name].label}`;
    popupBody.append(drawEffect(name));
  }
  for (const name of Object.keys(EFFECTS)) {
    fxButtons[name].onclick = (event) => {
      event.stopPropagation();
      // The strip button is an "add/open" gesture, like an empty Song Mixer insert:
      // opening an effect that is currently bypassed should make the audition audible
      // immediately. Bypass remains an explicit power-button action inside the card.
      if (!state.effects[name].enabled) {
        state.effects[name].enabled = true;
        emitEffects();
      }
      if (!popup.hidden && openEffect === name) popup.hidden = true;
      else { popup.hidden = false; drawPopup(name); }
    };
  }
  syncFxButtons();
  popup.addEventListener('click', (event) => event.stopPropagation());
  root.append(popup);

  const api = {
    root,
    state: () => clone(state),
    setPlaying(on) {
      state.auto = !!on; autoButton.classList.toggle('on', state.auto);
      autoButton.textContent = state.auto ? 'STOP AUTO' : 'AUTO PLAY';
    },
    setEffects(next = {}) {
      for (const name of Object.keys(EFFECTS)) {
        if (next[name]) {
          state.effects[name] = {
            enabled: !!next[name].enabled,
            params: { ...state.effects[name].params, ...(next[name].params || {}) },
          };
        }
      }
      syncFxButtons();
      drawPopup(openEffect);
    },
  };
  return api;
}
