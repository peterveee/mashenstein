// Compact performance keyboard shared by the Advanced editor and the standalone
// MRDR-3 playground. It owns gesture/source bookkeeping and delegates sound to the
// host, so the mixer and the standalone page can use the same visual instrument while
// retaining their own preview routing.

import { deskNoteName } from './mixer-note-names.js';

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK = [1, 3, 6, 8, 10];
const COMPUTER = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  ',': 12, l: 13, '.': 14, ';': 15, '/': 16,
  q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19,
  '6': 20, y: 21, '7': 22, u: 23, i: 24, o: 25, '9': 26, p: 27,
};

const midiName = (midi) => deskNoteName(midi, { fancy: true });

/**
 * Where every key goes, as fractions of the board's width — whites edge to edge, blacks
 * straddling the seam between the two they belong to.
 *
 * Pure, exported and out of `drawKeys` because this is the part that was WRONG and could
 * not be caught. `preceding` names WHICH WHITE KEY a black sits after, which is an index,
 * and `WHITE.filter(...).length` is a count — one too many. Every black key drew a white
 * key to the right of where it belonged.
 *
 * That failure is close to invisible. The 2-and-3 grouping survives it intact, so the
 * board still reads as a piano; it just starts a key late, and the white key under the C
 * label has quietly become the B below it. Nothing sounded wrong either — the MIDI
 * numbers were right all along, so the keys played what they said and only sat in the
 * wrong place. You could only catch it by counting from one end of the board. Hence a
 * function that returns numbers, and a test that counts for you.
 */
export function keyGeometry(octaveCount, base = 0) {
  const whiteCount = octaveCount * WHITE.length;
  const white = [];
  const black = [];
  for (let octaveIndex = 0; octaveIndex < octaveCount; octaveIndex++) {
    for (const semi of WHITE) {
      white.push({
        midi: base + octaveIndex * 12 + semi,
        left: white.length / whiteCount,
        width: 1 / whiteCount,
      });
    }
  }
  for (let octaveIndex = 0; octaveIndex < octaveCount; octaveIndex++) {
    for (const semi of BLACK) {
      // The white key a semitone below this one: `semi - 1` is always white for all five
      // blacks, which is what makes "sits after" well defined at all.
      const after = octaveIndex * WHITE.length + WHITE.indexOf(semi - 1);
      black.push({
        midi: base + octaveIndex * 12 + semi,
        after,
        // 0.68 rather than 0.5 of a white key wide, offset so the black's centre lands on
        // the seam: two blacks in a group must not touch, and the whites either side keep
        // a playable front edge.
        left: (after + 0.68) / whiteCount,
        width: 0.64 / whiteCount,
      });
    }
  }
  return { whiteCount, white, black };
}

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
}) {
  const root = document.createElement('section');
  root.className = 'sfkeyboard';
  root.setAttribute('aria-label', 'Synth performance keyboard');
  let capture = false;
  let active = true;
  let sustain = false;
  const sustainSources = new Set();
  const held = new Map();
  const midiHeld = new Set();
  const keys = new Map();
  const octaveCount = Math.max(1, Math.floor(octaves));
  const whiteCount = octaveCount * WHITE.length;
  // The board does not move — every key it has is on screen, so there is nothing an
  // octave shift could reach that a click cannot. All the base has to be is legal: the
  // highest one that keeps the top key inside MIDI 0–127, which is the number the
  // callers used to have to work out and pass in as `maxOctave`.
  //
  // `initialOctave` is a MIDI base, not a label: 2 means the board starts at MIDI 36,
  // and MIDI 36 PRINTS as C1 because the desk spells middle C as C3 — see
  // `mixer-note-names.js`. Do not "correct" it to match the number under the first key;
  // that would transpose the instrument rather than rename it.
  const highestBase = Math.floor((128 - octaveCount * 12) / 12) - 1;
  const octave = Math.max(-1, Math.min(highestBase, Math.floor(initialOctave)));

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
  // Losing window focus must release fingers, but it is not a deliberate stop. Native
  // select menus can briefly blur the page while they are open; stopping the pattern
  // here makes changing BASE KEY kill auto-play even though nobody asked it to.
  const loseFocus = () => { releaseHeld(); };

  const header = document.createElement('div');
  header.className = 'sfkhead';
  // No title. A keyboard does not need a caption saying it is a keyboard — the row is
  // eighty-four keys wide and there is nothing else it could be. What the header is for
  // is the two things you cannot see by looking: which INPUTS are listening.
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
  header.append(spacer, computer, midiButton);
  root.append(header);

  const board = document.createElement('div');
  board.className = 'sfkkeys';
  root.append(board);

  function drawKeys() {
    board.textContent = '';
    keys.clear();
    const { white, black } = keyGeometry(octaveCount, noteAt(0));
    for (const spot of white) {
      const key = document.createElement('button');
      key.type = 'button'; key.className = 'sfkkey sfkwhite';
      key.dataset.midi = String(spot.midi);
      key.style.left = `${spot.left * 100}%`;
      key.style.width = `${spot.width * 100}%`;
      key.append(Object.assign(document.createElement('span'), {
        className: 'sfkname', textContent: spot.midi % 12 === 0 ? midiName(spot.midi) : '',
      }));
      board.append(key); keys.set(spot.midi, key);
    }
    // After the whites, so they stack over them without needing a z-index fight.
    for (const spot of black) {
      const key = document.createElement('button');
      key.type = 'button'; key.className = 'sfkkey sfkblack';
      key.dataset.midi = String(spot.midi);
      key.style.left = `${spot.left * 100}%`;
      key.style.width = `${spot.width * 100}%`;
      board.append(key); keys.set(spot.midi, key);
    }
    refresh();
  }

  // One listener on the board rather than one per key, so a drag across it glides —
  // which is how you find the note you are after, and what the desk's mini keyboard and
  // the piano roll's key column already do. Per-key `pointerenter` cannot: the capture
  // that keeps a glide off the end of the board ending here is also what stops the keys
  // you pass over from ever seeing the pointer.
  board.addEventListener('pointerdown', (event) => {
    const key = event.target.closest?.('.sfkkey');
    if (!key) return;
    event.preventDefault();
    try { board.setPointerCapture(event.pointerId); } catch { /* not a real pointer */ }
    noteOn(Number(key.dataset.midi), `p:${event.pointerId}`);
  });
  board.addEventListener('pointermove', (event) => {
    if (!(event.buttons & 1)) return;
    const source = `p:${event.pointerId}`;
    // Only a gesture that started on a key glides. A drag that arrives from the header
    // or from the window edge is on its way somewhere, not playing.
    if (!held.has(source)) return;
    // Capture does not move hit testing, so the page still knows which key is under the
    // pointer — `event.target` would name the key we pressed and nothing else.
    const key = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.sfkkey');
    const midiValue = key ? Number(key.dataset.midi) : NaN;
    if (!Number.isFinite(midiValue) || held.get(source) === midiValue) return;
    // A glide is one gesture looking for one note, not a chord built by dragging, and
    // `noteOn` releases what this pointer was holding before it sounds the next one.
    noteOn(midiValue, source);
  });
  board.addEventListener('pointerup', (event) => noteOff(`p:${event.pointerId}`));
  board.addEventListener('pointercancel', (event) => noteOff(`p:${event.pointerId}`));
  // Pointer capture normally routes these to the board, but it can be lost when the
  // editor is rebuilt, another surface takes the gesture, or the browser cancels a
  // native control. Keep the board handler for the ordinary path and add a window
  // backstop so a short click cannot leave a held preview with no note-off.
  const releasePointer = (event) => noteOff(`p:${event.pointerId}`);
  addEventListener('pointerup', releasePointer);
  addEventListener('pointercancel', releasePointer);
  board.addEventListener('lostpointercapture', releasePointer);

  const onKeyDown = (event) => {
    if (!active || !capture || event.metaKey || event.ctrlKey || event.altKey) return;
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
      removeEventListener('pointerup', releasePointer);
      removeEventListener('pointercancel', releasePointer);
      root.remove();
    },
  };
}
