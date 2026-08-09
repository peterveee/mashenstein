// Compact performance keyboard shared by the Advanced editor and the standalone
// MRDR-3 playground. It owns gesture/source bookkeeping and delegates sound to the
// host, so the mixer and the standalone page can use the same visual instrument while
// retaining their own preview routing.

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK = [1, 3, 6, 8, 10];
const COMPUTER = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  ',': 12, l: 13, '.': 14, ';': 15, '/': 16,
  q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19,
  '6': 20, y: 21, '7': 22, u: 23, i: 24, o: 25, '9': 26, p: 27,
};

const midiName = (midi) => {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
};

/**
 * A small Web MIDI event router. The keyboard component accepts an existing router,
 * which is how the Song Mixer shares its already-enabled MIDI session without two
 * handlers competing for `onmidimessage`.
 */
export function createWebMidiRouter({ storageKey = null } = {}) {
  let access = null;
  let enabled = false;
  const listeners = new Set();
  const stateListeners = new Set();

  const inputs = () => access ? [...access.inputs.values()] : [];
  const emit = (event) => { for (const listener of listeners) listener(event); };
  const emitState = () => {
    const state = { on: enabled, inputs: inputs().map((input) => input.name || 'MIDI input') };
    for (const listener of stateListeners) listener(state);
  };
  const onMessage = (event, input) => {
    const data = [...(event.data || [])];
    const status = data[0] || 0;
    const note = Number(data[1]);
    const velocity = Number(data[2] || 0);
    const kind = status & 0xf0;
    const channel = status & 0x0f;
    // Include the port and channel in the source identity. Two keyboards can hold
    // the same note at once, and a channelised controller can release one without
    // releasing the other; collapsing them to `m:<note>` leaves a stuck or prematurely
    // released key in either case.
    const port = input?.id || input?.name || 'midi';
    const source = `m:${port}:${channel}:${note}`;
    if (kind === 0xb0 && note === 64) {
      emit({ type: 'sustain', down: velocity >= 64, source: `s:${port}` });
      return;
    }
    if (kind === 0x80 || (kind === 0x90 && velocity === 0)) {
      emit({ type: 'off', midi: note, source });
    } else if (kind === 0x90) {
      emit({ type: 'on', midi: note, source });
    }
  };
  const attach = () => {
    for (const input of inputs()) input.onmidimessage = (event) => onMessage(event, input);
  };
  const detach = () => { for (const input of inputs()) input.onmidimessage = null; };

  async function setEnabled(on, { announce = true } = {}) {
    if (!on) {
      detach();
      enabled = false;
      if (storageKey) localStorage.removeItem(storageKey);
      emit({ type: 'panic' });
      emitState();
      return false;
    }
    if (!navigator.requestMIDIAccess) throw new Error('This browser has no Web MIDI');
    access ||= await navigator.requestMIDIAccess();
    enabled = true;
    attach();
    if (storageKey) localStorage.setItem(storageKey, '1');
    access.onstatechange = (event) => {
      if (!enabled) return;
      if (event?.port?.type === 'input' && event.port.state === 'disconnected') emit({ type: 'panic' });
      attach(); emitState();
    };
    emitState();
    return true;
  }

  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    onState(listener) { stateListeners.add(listener); return () => stateListeners.delete(listener); },
    state: () => ({ on: enabled, inputs: inputs().map((input) => input.name || 'MIDI input') }),
    setEnabled,
    inputs,
    restore: () => {
      if (storageKey && localStorage.getItem(storageKey)) setEnabled(true, { announce: false }).catch(() => {});
    },
  };
}

export function createSynthKeyboard({
  host,
  midi = null,
  octaves = 2,
  initialOctave = 4,
  minOctave = 1,
  maxOctave = 7,
}) {
  const root = document.createElement('section');
  root.className = 'sfkeyboard';
  root.setAttribute('aria-label', 'Synth performance keyboard');
  let octave = Math.max(minOctave, Math.min(maxOctave, initialOctave));
  let capture = false;
  let active = true;
  let sustain = false;
  const sustainSources = new Set();
  const held = new Map();
  const midiHeld = new Set();
  const keys = new Map();
  const octaveCount = Math.max(1, Math.floor(octaves));
  const whiteCount = octaveCount * WHITE.length;

  const noteAt = (offset) => (octave + 1) * 12 + offset;
  const keyFor = (midi) => keys.get(midi);
  const paint = (midi, on) => keyFor(midi)?.classList.toggle('held', on);
  const noteOn = (midi, source) => {
    if (!Number.isFinite(midi)) return;
    if (held.has(source)) noteOff(source);
    held.set(source, midi);
    paint(midi, true);
    host.onNoteOn?.(midi, source);
  };
  const noteOff = (source) => {
    if (!held.has(source)) return;
    const midiValue = held.get(source);
    held.delete(source);
    paint(midiValue, false);
    if (!(source.startsWith('m:') && midi?.playback === false)) {
      host.onNoteOff?.(midiValue, source);
    }
  };
  const releaseHeld = () => {
    for (const source of [...held.keys()]) noteOff(source);
    midiHeld.clear();
    sustainSources.clear();
    sustain = false;
  };
  const panic = () => {
    releaseHeld();
    host.onPanic?.();
  };
  // Losing window focus must release fingers, but it is not an explicit PANIC. Native
  // select menus can briefly blur the page while they are open; stopping the pattern
  // here makes changing BASE KEY kill auto-play even though the user never pressed PANIC.
  const loseFocus = () => { releaseHeld(); };
  const setOctave = (next) => {
    const value = Math.max(minOctave, Math.min(maxOctave, next));
    if (value === octave) return;
    panic();
    octave = value;
    drawKeys();
  };

  const header = document.createElement('div');
  header.className = 'sfkhead';
  const title = document.createElement('span');
  title.className = 'sfktitle'; title.textContent = 'PLAY';
  const down = document.createElement('button');
  down.type = 'button'; down.className = 'sfkoct'; down.textContent = '−';
  down.title = 'Octave down'; down.onclick = () => setOctave(octave - 1);
  const octaveReadout = document.createElement('span');
  octaveReadout.className = 'sfkoctread';
  const up = document.createElement('button');
  up.type = 'button'; up.className = 'sfkoct'; up.textContent = '+';
  up.title = 'Octave up'; up.onclick = () => setOctave(octave + 1);
  const spacer = document.createElement('span'); spacer.className = 'sfkspacer';
  const computer = document.createElement('button');
  computer.type = 'button'; computer.className = 'sfkcomputer'; computer.textContent = 'KEYBOARD';
  computer.title = 'Play from the computer keyboard';
  computer.onclick = () => { capture = !capture; computer.classList.toggle('on', capture); };
  const midiButton = document.createElement('button');
  midiButton.type = 'button'; midiButton.className = 'sfkmidi'; midiButton.textContent = 'MIDI';
  midiButton.title = 'Listen for a MIDI keyboard';
  midiButton.onclick = async () => {
    try { await midi?.setEnabled(!midi?.state().on); }
    catch (error) { host.onMessage?.(error.message || 'MIDI unavailable'); }
    refresh();
  };
  const panicButton = document.createElement('button');
  panicButton.type = 'button'; panicButton.className = 'sfkpanic'; panicButton.textContent = 'PANIC';
  panicButton.title = 'Release every held note'; panicButton.onclick = panic;
  header.append(title, down, octaveReadout, up, spacer, computer, midiButton, panicButton);
  root.append(header);

  const board = document.createElement('div');
  board.className = 'sfkkeys';
  root.append(board);

  function drawKeys() {
    board.textContent = '';
    keys.clear();
    const base = noteAt(0);
    let whiteIndex = 0;
    for (let octaveIndex = 0; octaveIndex < octaveCount; octaveIndex++) {
      for (const semi of WHITE) {
        const midiValue = base + octaveIndex * 12 + semi;
        const key = document.createElement('button');
        key.type = 'button'; key.className = 'sfkkey sfkwhite';
        key.dataset.midi = String(midiValue);
        key.style.left = `${(whiteIndex / whiteCount) * 100}%`;
        key.style.width = `${(1 / whiteCount) * 100}%`;
        key.append(Object.assign(document.createElement('span'), {
          className: 'sfkname', textContent: semi === 0 ? midiName(midiValue) : '',
        }));
        board.append(key); keys.set(midiValue, key); whiteIndex++;
      }
    }
    whiteIndex = 0;
    for (let octaveIndex = 0; octaveIndex < octaveCount; octaveIndex++) {
      for (const semi of BLACK) {
        const midiValue = base + octaveIndex * 12 + semi;
        const key = document.createElement('button');
        key.type = 'button'; key.className = 'sfkkey sfkblack';
        key.dataset.midi = String(midiValue);
        const preceding = octaveIndex * 7 + WHITE.filter((n) => n < semi).length;
        key.style.left = `${((preceding + 0.68) / whiteCount) * 100}%`;
        key.style.width = `${(0.64 / whiteCount) * 100}%`;
        board.append(key); keys.set(midiValue, key);
      }
      whiteIndex += 7;
    }
    for (const key of keys.values()) wirePointer(key);
    refresh();
  }

  function wirePointer(key) {
    key.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      try { board.setPointerCapture(event.pointerId); } catch { /* not a real pointer */ }
      const source = `p:${event.pointerId}`;
      noteOn(Number(key.dataset.midi), source);
    });
    key.addEventListener('pointerenter', (event) => {
      if (!(event.buttons & 1)) return;
      const source = `p:${event.pointerId}`;
      noteOff(source);
      noteOn(Number(key.dataset.midi), source);
    });
    for (const type of ['pointerup', 'pointercancel']) {
      key.addEventListener(type, (event) => noteOff(`p:${event.pointerId}`));
    }
  }
  board.addEventListener('pointerup', (event) => noteOff(`p:${event.pointerId}`));
  board.addEventListener('pointercancel', (event) => noteOff(`p:${event.pointerId}`));

  const onKeyDown = (event) => {
    if (!active || !capture || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '-' || event.key === '_') { event.preventDefault(); setOctave(octave - 1); return; }
    if (event.key === '=' || event.key === '+') { event.preventDefault(); setOctave(octave + 1); return; }
    const offset = COMPUTER[event.key.toLowerCase()];
    if (offset == null || event.repeat) return;
    event.preventDefault(); noteOn(noteAt(offset), `k:${event.key.toLowerCase()}`);
  };
  const onKeyUp = (event) => noteOff(`k:${event.key.toLowerCase()}`);
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', loseFocus);

  let unsubscribeMidi = null;
  let unsubscribeMidiState = null;
  if (midi) {
    unsubscribeMidi = midi.subscribe((event) => {
      if (event.type === 'on') {
        midiHeld.add(event.source);
        if (midi.playback === false) {
          if (held.has(event.source)) noteOff(event.source);
          held.set(event.source, event.midi); paint(event.midi, true);
        } else noteOn(event.midi, event.source);
      }
      if (event.type === 'off') {
        midiHeld.delete(event.source);
        if (!sustain) noteOff(event.source);
      }
      if (event.type === 'sustain') {
        const source = event.source || 's:midi';
        if (event.down) sustainSources.add(source); else sustainSources.delete(source);
        sustain = sustainSources.size > 0;
        if (!sustain) for (const source of [...held.keys()]) {
          if (source.startsWith('m:') && !midiHeld.has(source)) noteOff(source);
        }
      }
      if (event.type === 'panic') panic();
      refresh();
    });
    unsubscribeMidiState = midi.onState((state) => {
      if (state.on && !state.inputs?.length) panic();
      refresh();
    });
  }

  function refresh() {
    octaveReadout.textContent = `C${octave}`;
    down.classList.toggle('atend', octave <= minOctave);
    up.classList.toggle('atend', octave >= maxOctave);
    const state = midi?.state?.() || { on: false, inputs: [] };
    midiButton.classList.toggle('on', !!state.on);
    midiButton.title = state.inputs?.length
      ? `Listening to ${state.inputs.join(', ')}` : 'Listen for a MIDI keyboard';
  }

  drawKeys();
  return {
    root,
    refresh,
    panic,
    setActive(on) {
      active = !!on;
      if (!active) {
        capture = false;
        computer.classList.remove('on');
        panic();
      }
    },
    destroy() {
      panic();
      unsubscribeMidi?.(); unsubscribeMidiState?.();
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('blur', loseFocus);
      root.remove();
    },
  };
}
