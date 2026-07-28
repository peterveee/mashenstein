// The mixing desk. Imports the game's own engine — every fader you move is moving
// the same channel strip the game will use, and the same one the offline renderer
// runs when it writes a WAV. Nothing here reimplements audio.
import { Audio } from '../src/engine/audio.js';
import { deskLanes, laneUsesEcho, laneActivity } from '../src/engine/lanes.js';
import { noteName } from '../src/engine/notes.js';
import { listTracks, resolveTrack, registerTrack } from '../src/data/tracks.js';
// Side effect on purpose: this registers everything in src/data/imported/ as a track,
// which is what puts an imported .mid in the song picker. The game does not import
// it, so nothing in that folder ships.
import '../src/data/imported/index.js';
import { MIX, laneSettings, LANE_DEFAULTS } from '../src/data/mix.js';
import { DELAY_DIVISIONS, AUXES, AUX_DEFAULTS } from '../src/engine/mixer.js';
import { EFFECTS, EFFECT_BY_ID, paramRange, SYNC_DIVISIONS, RATE_DIVISIONS, MAX_EFFECTS, ENGINE_BASE_COST, syncSeconds, DEFAULT_MASTER_CHAIN } from '../src/engine/effects.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LS_KEY = 'mash-mixer-draft';

// ---- state -----------------------------------------------------------------
// `draft` holds unsaved edits per track id, so switching songs and coming back
// picks up exactly where you left off. `saved` is what is on disk.
const saved = JSON.parse(JSON.stringify(MIX));
let draft = {};
try { draft = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { draft = {}; }

// The song you were last on. A desk that opens on someone else's song makes you
// find yours again before you can hear whether last night's change was right.
const SONG_KEY = 'mash-mixer-song';
const lastSong = localStorage.getItem(SONG_KEY);
let trackId = (lastSong && resolveTrack(lastSong)) ? lastSong : (Object.keys(saved)[0] || 'plumber');
let track = null;
let playing = false;
let abHeld = false;

const emptyMix = () => ({ master: 0, limiter: false, lanes: {}, voice: undefined });
const mixFor = (id) => draft[id] || saved[id] || emptyMix();
// Compared on meaning, not on shape: resetting every channel leaves a draft of
// empty defaults, which is not a change if nothing was saved for the track either.
function normalise(m) {
  if (!m) return null;
  const lanes = {};
  for (const [k, L] of Object.entries(m.lanes || {})) {
    const s = laneSettings(L);
    const bare = !s.gain && !s.pan && !s.mute && !s.eq.low && !s.eq.mid && !s.eq.high
      && !s.send.reverb && (L?.send?.delay == null);
    if (!bare) lanes[k] = s;
  }
  const out = { master: m.master || 0, limiter: !!m.limiter, lanes };
  if (m.voice && Object.keys(m.voice).length) out.voice = m.voice;
  if (!out.master && !out.limiter && !out.voice && !Object.keys(lanes).length) return null;
  return out;
}
const isDirty = (id) => JSON.stringify(normalise(draft[id])) !== JSON.stringify(normalise(saved[id]));

// Undo holds whole-mix snapshots per track. Slider drags coalesce: a continuous
// drag is one gesture, so undo steps back over the whole move rather than one
// step per pixel.
const undoStack = [];
let lastEditTag = null;
let lastEditAt = 0;

function pushUndo(tag) {
  const now = performance.now();
  const coalesce = tag != null && tag === lastEditTag && now - lastEditAt < 700;
  lastEditTag = tag; lastEditAt = now;
  if (coalesce) return;
  undoStack.push({ trackId, mix: JSON.parse(JSON.stringify(draft[trackId] ?? null)) });
  if (undoStack.length > 200) undoStack.shift();
  $('undo').disabled = false;
}

function editMix(mutate, tag) {
  pushUndo(tag);
  const cur = JSON.parse(JSON.stringify(mixFor(trackId)));
  mutate(cur);
  draft[trackId] = cur;
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  updateStatus();
}

let toastTimer = null;
// `ms: 0` holds the toast until something replaces it — for a job that takes longer
// than a message about it should be on screen, like an offline render.
function toast(msg, ms = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function undo() {
  const step = undoStack.pop();
  if (!step) { toast('nothing to undo'); return; }
  lastEditTag = null;
  if (step.mix === null) delete draft[step.trackId];
  else draft[step.trackId] = step.mix;
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  $('undo').disabled = undoStack.length === 0;
  if (step.trackId !== trackId) { selectSong(step.trackId); }
  else { buildRack(); applyToEngine(mixFor(trackId)); updateStatus(); }
  toast('undone');
}

/** The IEC power mark — the same one Logic puts on the left of an insert slot. */
function powerIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('class', 'pwr');
  const ring = document.createElementNS(NS, 'path');
  ring.setAttribute('d', 'M3.6 3.7a3.4 3.4 0 1 0 4.8 0');
  const stem = document.createElementNS(NS, 'path');
  stem.setAttribute('d', 'M6 1.9v3.7');
  svg.append(ring, stem);
  return svg;
}

/**
 * Remove. A drawn multiplication cross — two even diagonals at the same angle —
 * rather than the letter x, which leans and has a different weight in every
 * typeface. Chunkier than the power mark: it is the destructive one.
 */
function closeIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('class', 'pwr cross');
  for (const d of ['M3.3 3.3 8.7 8.7', 'M8.7 3.3 3.3 8.7']) {
    const stroke = document.createElementNS(NS, 'path');
    stroke.setAttribute('d', d);
    svg.append(stroke);
  }
  return svg;
}

/**
 * Where a target keeps its effect chain. A channel, a send and the master each
 * store theirs in a different corner of the mix, and every writer needs all three
 * cases — so there is one of them, and adding a fourth kind of strip is one line.
 */
function storeEffects(m, key, list) {
  if (key === '__master') {
    if (list.length) m.masterEffects = list; else delete m.masterEffects;
  } else if (key.startsWith('__aux:')) {
    const id = key.slice(6);
    m.fx = m.fx || {};
    m.fx[id] = { ...AUX_DEFAULTS[id], ...(m.fx[id] || {}) };
    if (list.length) m.fx[id].effects = list; else delete m.fx[id].effects;
  } else {
    const L = laneOf(m, key);
    if (list.length) L.effects = list; else delete L.effects;
  }
}

/**
 * The insert-slot list every strip carries — channels, sends and master alike, so
 * all three read as the same object. Logic's layout, our palette.
 *
 * `rows` is the longest chain anywhere in the rack plus a spare, not this strip's:
 * every strip reserves the same block so the rule above the slots lands on one line
 * across the whole desk instead of wandering with each channel's count, and the
 * spare is where the next effect goes on whichever strip you are on.
 */
// One line of the insert block: a 23px button, the 2px that sits it off the line
// above, and the 4px gap to the next. The reserved height is counted in these, so
// a chain and the empty slot under it end exactly on the block's bottom edge.
const SLOT_ROW = 29;
// Which slot is being dragged, while it is being dragged. One at a time, so one
// variable — the drag is a gesture, not a state anything else can observe.
let dragFromSlot = null;

function insertSlots(key, label, rows) {
  const el = document.createElement('div');
  el.className = 'fxbtns';
  // The empty slot under the chain is where the next effect would go, so clicking it
  // opens the catalogue. Plain click, not right-click: there is only one thing you
  // could mean by clicking an empty slot, and a menu to choose it from is a step for
  // nothing. Right-click does the same, for anyone who tries it.
  //
  // One click on any strip, selected or not — the outline comes up under the pointer
  // before the click lands, so you are aiming at something you can see, and making
  // you select the strip first would be a click spent on what the click already says.
  const openHere = (ev) => {
    if (ev.target !== el && !ev.target.classList.contains('addslot')) return;
    ev.preventDefault();
    ev.stopPropagation();
    selectLane(key);
    if (effectsOf(key).length >= MAX_EFFECTS) {
      toast(`${MAX_EFFECTS} effects is the limit on one strip — remove one first`);
      return;
    }
    closeMenu();
    openPicker({ anchor: el, x: ev.clientX, y: ev.clientY });
  };
  el.addEventListener('click', openHere);
  el.addEventListener('contextmenu', openHere);
  const list = effectsOf(key);
  const slots = rows ?? Math.max(1, list.length);
  el.style.height = `${slots * SLOT_ROW - 4}px`;      // no gap hanging off the last line
  list.forEach((e, i) => {
    const def = EFFECT_BY_ID[e.id];
    const btn = document.createElement('button');
    btn.className = e.bypass ? '' : 'on';
    // The power mark toggles the effect; the name opens it. Two targets in one slot,
    // the way an insert slot works everywhere else.
    const power = document.createElement('span');
    power.className = 'pwrhit';
    power.append(powerIcon());
    power.title = `${e.bypass ? 'enable' : 'bypass'} ${def?.name || e.id}`;
    const toggle = () => {
      const next = list.map((x, j) => (j === i ? { ...x, bypass: !x.bypass } : x));
      editMix((m) => storeEffects(m, key, next), null);
      bypassOn(key, i, !e.bypass);
      buildRack();
      toast(`${def?.name || e.id} ${next[i].bypass ? 'bypassed' : 'on'} — ${label}`);
    };
    power.onclick = (ev) => { ev.stopPropagation(); toggle(); };
    const name = document.createElement('span');
    name.className = 'fxname';
    name.textContent = def?.short || def?.name || e.id;
    // And out the other side: remove, on the right, on hover. Both marks are
    // revealed by the pointer, so an untouched slot is just a name.
    const remove = document.createElement('span');
    remove.className = 'rmhit';
    remove.append(closeIcon());
    remove.title = `remove ${def?.name || e.id} from ${label}`;
    remove.onclick = (ev) => {
      ev.stopPropagation();
      setEffects(key, list.filter((_, j) => j !== i));
      toast(`${def?.name || e.id} removed from ${label} — ⌘Z to undo`);
    };
    btn.append(power, name, remove);
    btn.title = `${def?.name || e.id} — click to open it below`
      + `\nthe power mark ${e.bypass ? 'enables' : 'bypasses'} it without leaving the fader`;
    btn.onclick = (ev) => {
      ev.stopPropagation();
      if (ev.altKey) { toggle(); return; }        // ⌥-click still works from anywhere
      // Otherwise: switch to this strip and open this effect, which is what clicking
      // the name of a thing usually means.
      selectLane(key);
      focusDevice(i);
    };

    // Drag a slot onto another to reorder the chain, the same gesture as the cards
    // in the panel below. The order IS the signal path, so being able to shove a
    // filter in front of a delay without opening anything is worth the wiring.
    btn.draggable = true;
    btn.addEventListener('dragstart', (ev) => {
      dragFromSlot = i;
      btn.classList.add('dragging');
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', String(i));   // Firefox needs a payload
    });
    btn.addEventListener('dragend', () => {
      dragFromSlot = null;
      for (const b of el.children) b.classList.remove('dragging', 'dropzone');
    });
    btn.addEventListener('dragover', (ev) => {
      if (dragFromSlot == null || dragFromSlot === i) return;
      ev.preventDefault();
      btn.classList.add('dropzone');
    });
    btn.addEventListener('dragleave', () => btn.classList.remove('dropzone'));
    btn.addEventListener('drop', (ev) => {
      ev.preventDefault();
      btn.classList.remove('dropzone');
      if (dragFromSlot == null || dragFromSlot === i) return;
      const next = effectsOf(key);
      const [moved] = next.splice(dragFromSlot, 1);
      next.splice(i, 0, moved);
      dragFromSlot = null;
      setEffects(key, next);
      toast(`${EFFECT_BY_ID[moved.id]?.name || moved.id} moved to ${i + 1} of ${next.length}`);
    });

    // Everything you can do to one slot, in one place — the strip's own menu is
    // about the channel, and a right-click on an effect is about the effect.
    btn.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      selectLane(key);
      const nm = def?.name || e.id;
      const cur = effectsOf(key);
      const room = cur.length < MAX_EFFECTS;
      const reorder = (to) => {
        const next = [...cur];
        const [moved] = next.splice(i, 1);
        next.splice(to, 0, moved);
        setEffects(key, next);
        toast(`${nm} moved to ${to + 1} of ${next.length}`);
      };
      openMenu(ev.clientX, ev.clientY, `${nm} · ${targetLabel(key)}`, [
        { label: 'Open below', run: () => { selectLane(key); focusDevice(i); } },
        { label: e.bypass ? 'Enable' : 'Bypass', run: toggle },
        { label: 'Copy settings', run: () => {
          fxClipboard = { id: e.id, name: nm, params: { ...(e.params || {}) } };
          toast(`${nm} settings copied`);
        } },
        fxClipboard && fxClipboard.id === e.id && {
          label: `Paste settings from ${fxClipboard.name}`,
          run: () => {
            setEffects(key, cur.map((x, j) => (j === i ? { ...x, params: { ...fxClipboard.params } } : x)));
            toast(`${nm} — settings pasted`);
          },
        },
        room && { label: 'Duplicate', run: () => {
          const next = [...cur];
          next.splice(i + 1, 0, JSON.parse(JSON.stringify(cur[i])));
          setEffects(key, next);
          toast(`${nm} duplicated`);
        } },
        room && { label: 'Insert effect before…',
          run: () => openPicker({ at: i, anchor: btn, x: ev.clientX, y: ev.clientY }) },
        room && { label: 'Insert effect after…',
          run: () => openPicker({ at: i + 1, anchor: btn, x: ev.clientX, y: ev.clientY }) },
        i > 0 && { label: 'Move up', run: () => reorder(i - 1) },
        i < cur.length - 1 && { label: 'Move down', run: () => reorder(i + 1) },
        Object.keys(e.params || {}).length && { label: 'Reset to defaults', run: () => {
          setEffects(key, cur.map((x, j) => (j === i ? { id: x.id, ...(x.bypass ? { bypass: true } : {}) } : x)));
          toast(`${nm} back to defaults`);
        } },
        { label: 'Remove', run: () => {
          setEffects(key, cur.filter((_, j) => j !== i));
          toast(`${nm} removed — ⌘Z to undo`);
        } },
      ].filter(Boolean));
    });
    el.append(btn);
  });
  // The next slot, at the end of the chain — the same target whether the strip holds
  // nothing or holds three, so adding a second effect is the click that added the
  // first rather than a right-click and a submenu. Left out when the block has no
  // line spare, which is only the strip carrying the longest chain in the rack: the
  // panel below it ends in its own + card.
  if (list.length < slots && list.length < MAX_EFFECTS) {
    const add = document.createElement('div');
    add.className = 'addslot';
    add.title = `add an effect to ${label}`;
    el.append(add);
  }
  return el;
}

/**
 * A vertical fader with its meter and dB readout — the same control on every strip
 * type. `meter: false` keeps the space but draws nothing, for a bus the engine has
 * no meter on; the fader still lands on the same line as every other one.
 */
function faderBlock({ value, min = -60, max = 6, onInput, onReset, title }) {
  const col = document.createElement('div'); col.className = 'fadercol';
  const fw = document.createElement('div'); fw.className = 'faderwrap';
  const fader = document.createElement('input');
  fader.type = 'range'; fader.className = 'fader';
  // A tenth of a dB. The readout is typable for an exact number, but a fader you
  // can only move in half-dB steps cannot be nudged by ear, which is the whole job.
  fader.min = min; fader.max = max; fader.step = 0.1; fader.value = value;
  if (title) fader.title = title;
  const meter = document.createElement('div'); meter.className = 'meter';
  const fill = document.createElement('i');
  const peak = document.createElement('b');            // the held peak, see tick()
  meter.append(fill, peak);
  fw.append(fader, meter);
  const db = document.createElement('div'); db.className = 'db';
  const fmt = (x) => (x > 0 ? '+' : '') + Number(x).toFixed(1) + ' dB';
  const show = (x) => { db.textContent = fmt(x); };
  show(value);
  fader.addEventListener('input', () => { show(+fader.value); onInput(+fader.value); });
  const reset = () => { fader.value = 0; show(0); (onReset || onInput)(0); };
  fader.addEventListener('dblclick', reset);
  db.addEventListener('dblclick', reset);
  makeTypableDb(db, fader, (x) => { show(x); onInput(x); }, fmt);
  col.append(fw, db);
  return { col, fw, db, fill, peak, meter, fader };
}

/**
 * A strip's right-click menu. Reset used to be a button on every strip: a whole row
 * of height on all fourteen of them, spent on something you press once an hour.
 */
// One strip's settings, held for pasting onto another. `kind` is what it came from,
// because a channel's gain/pan/sends mean nothing on a bus — but an effect chain
// means the same thing on all three, so pasting just the effects always works.
let clipboard = null;

function copyStrip(key, kind) {
  const mix = mixFor(trackId);
  const data = key === '__master' ? { master: mix.master || 0, limiter: !!mix.limiter, effects: effectsOf(key) }
    : key.startsWith('__aux:') ? fxOf(mix)[key.slice(6)]
    : mix.lanes[key] || {};
  clipboard = { kind, from: targetLabel(key), data: JSON.parse(JSON.stringify(data)) };
  toast(`${clipboard.from} copied`);
}

function pasteStrip(key, kind) {
  if (!clipboard || clipboard.kind !== kind) return;
  const { data } = clipboard;
  editMix((m) => {
    if (key === '__master') {
      m.master = data.master || 0;
      m.limiter = !!data.limiter;
      storeEffects(m, key, data.effects || []);
    } else if (key.startsWith('__aux:')) {
      const id = key.slice(6);
      m.fx = m.fx || {};
      // Everything but the chain, which goes through the one writer that knows
      // where each kind of strip keeps it.
      const { effects, ...rest } = data;
      m.fx[id] = { ...AUX_DEFAULTS[id], ...rest };
      storeEffects(m, key, effects || []);
    } else {
      m.lanes[key] = JSON.parse(JSON.stringify(data));
    }
  });
  buildRack();
  applyToEngine(mixFor(trackId));
  toast(`${clipboard.from} → ${targetLabel(key)}`);
}

function pasteEffects(key) {
  if (!clipboard) return;
  const list = JSON.parse(JSON.stringify(clipboard.data.effects || []));
  setEffects(key, list);
  applyToEngine(mixFor(trackId));
  toast(list.length ? `${list.length} effect${list.length === 1 ? '' : 's'} → ${targetLabel(key)}`
    : `${targetLabel(key)} — effects cleared`);
}

function stripMenu(el, key, kind) {
  el.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('input, select')) return;
    ev.preventDefault();
    selectLane(key);
    const list = effectsOf(key);
    const anyOn = list.some((x) => !x.bypass);
    openMenu(ev.clientX, ev.clientY, targetLabel(key), [
      { label: `Copy ${kind}`, run: () => copyStrip(key, kind) },
      clipboard && clipboard.kind === kind && {
        label: `Paste ${kind} from ${clipboard.from}`, run: () => pasteStrip(key, kind),
      },
      clipboard && (clipboard.data.effects || []).length && {
        label: `Paste ${(clipboard.data.effects || []).length} effect`
          + `${(clipboard.data.effects || []).length === 1 ? '' : 's'} from ${clipboard.from}`,
        run: () => pasteEffects(key),
      },
      list.length && {
        label: anyOn ? 'Bypass all effects' : 'Enable all effects',
        run: () => {
          setEffects(key, list.map((x) => ({ ...x, bypass: anyOn })));
          toast(anyOn ? `${targetLabel(key)} — effects bypassed` : `${targetLabel(key)} — effects on`);
        },
      },
      { label: `Reset ${kind}`, run: () => resetTarget(key) },
    ].filter(Boolean));
  });
}

const menu = () => $('ctxmenu');
function openMenu(x, y, title, items) {
  const el = menu();
  el.textContent = '';
  const h = document.createElement('div'); h.className = 'ctxhead'; h.textContent = title;
  el.append(h);
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = it.label;
    b.onclick = () => { closeMenu(); it.run(); };
    el.append(b);
  }
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.classList.add('show');
  // Measured after it is shown, then pulled back on-screen if it ran off an edge.
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.max(4, Math.min(y, innerHeight - r.height - 6))}px`;
}
const closeMenu = () => {
  menu().classList.remove('show');
  $('notepop').classList.remove('show');
  $('fxpicker').classList.remove('show');
  $('moremenu').classList.remove('show');
  $('songpicker').classList.remove('show');
};
// Anything that is not the popup itself dismisses it — including the next click on
// the arrangement, which then opens its own.
addEventListener('pointerdown', (e) => {
  const inside = [menu(), $('notepop'), $('fxpicker'), $('moremenu'), $('songpicker')]
    .some((el) => el.contains(e.target));
  const opener = [$('more'), $('songbtn')].some((el) => el.contains(e.target))
    || (e.target.closest && e.target.closest('.devaddcard'));
  if (!inside && !opener) closeMenu();
}, true);
addEventListener('blur', closeMenu);

/**
 * Bring one effect card into view and flash it. Selecting the strip is what puts
 * the card on screen; this says WHICH of six it was, which the panel cannot show on
 * its own once a chain is long enough to scroll.
 */
function focusDevice(index) {
  $('devices').classList.remove('collapsed');
  $('devfold').classList.remove('folded');
  requestAnimationFrame(() => {
    const card = $('devrack').querySelector(`.device[data-idx="${index}"]`);
    if (!card) return;
    card.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    card.classList.remove('flash');
    void card.offsetWidth;                 // restart the animation on a repeat click
    card.classList.add('flash');
  });
  fitStrips();
}

/** Put one target back to defaults — the right-click menu, and the R key. */
function resetTarget(key) {
  const label = targetLabel(key);
  editMix((m) => {
    if (key === '__master') { m.master = 0; m.limiter = false; delete m.masterEffects; }
    else if (key.startsWith('__aux:')) { if (m.fx) delete m.fx[key.slice(6)]; }
    else delete m.lanes[key];
  });
  buildRack();
  applyToEngine(mixFor(trackId));
  toast(`${label} reset`);
}

function laneOf(mix, key) {
  if (!mix.lanes[key]) mix.lanes[key] = {};
  return mix.lanes[key];
}

// ---- audio -----------------------------------------------------------------
// What the device panel is editing: a channel, the master bus, or a send return.
// All three own an effect chain, so they are the same thing as far as the panel is
// concerned — only where the chain is stored differs.
//
// Remembered across sessions for the same reason the song is: "I am working on the
// bass" outlasts a reload, and finding the strip again before you can hear last
// night's change is a step for nothing. One key, not one per song — the selection
// already survives switching songs, and a lane the new song does not have falls back
// to the master in buildRack.
const LANE_KEY = 'mash-mixer-lane';
let selectedLane = localStorage.getItem(LANE_KEY) || null;
const fxOf = (mix) => Object.fromEntries(AUXES.map((a) => [a.id, {
  ...AUX_DEFAULTS[a.id],
  ...(mix.fx?.[a.id] || {}),
  eq: { ...AUX_DEFAULTS[a.id].eq, ...(mix.fx?.[a.id]?.eq || {}) },
}]));

/**
 * Push a whole mix onto the engine — the engine's OWN apply, not a copy of it, so
 * what the desk hears is exactly what the game will play and what the renderer will
 * write. The copy that used to live here quietly drifted: it never restored effect
 * chains after its own reset(), and it gave every dry lane a delay send of 1, so
 * releasing A/B could leave the kit echoing when the song says it does not.
 */
function applyToEngine(mix) {
  if (!Audio.mixer) return;
  const m = mix || emptyMix();
  // The seeded master compressor has to exist in the ENGINE's chain too, or the
  // desk's card index and the live chain index drift apart and the first slider drag
  // on the master writes to the wrong node. Bypassed, so it is skipped in the wiring
  // and the render is unchanged.
  Audio.applyMix(track?.bank || null,
    m.masterEffects ? m : { ...m, masterEffects: DEFAULT_MASTER_CHAIN() });
}

/** Write one send's settings, and push them straight at the live aux. */
function editFx(id, patch, tag) {
  editMix((m) => {
    m.fx = m.fx || {};
    m.fx[id] = { ...AUX_DEFAULTS[id], ...(m.fx[id] || {}), ...patch };
  }, tag);
  const { effects, eq, level, pan, mute, ...rest } = fxOf(mixFor(trackId))[id];
  if (id === 'delay') {
    // Delay 1's time, feedback and damping are AudioSys nodes; its EQ, level, pan
    // and mute are the mixer's, like every other aux.
    Audio.setDelay(rest);
    Audio.mixer.setAux('delay', { eq, level, pan, mute }, track.bank.bpm);
  } else {
    Audio.mixer.setAux(id, { ...rest, eq, level, pan, mute }, track.bank.bpm);
  }
}

function loadTrack(id) {
  trackId = id;
  track = resolveTrack(id);
  tempoOverride = null;                 // a new song brings its own tempo
  showTempo();
  buildRack();
  buildTimeline();
  buildArrangement();
  if (playing) {
    // A voice change has to come back through setBank; level edits do not, so the
    // song keeps playing without a gap while you mix.
    Audio.setBank(null);
    Audio.setBank(track.bank, mixFor(id));
  }
  applyToEngine(mixFor(id));
  loopAnchor = 0;              // a different song means a different timeline
  parkedAt = 0;
  applyLoop(0);
  updateStatus();
}

// ---- UI --------------------------------------------------------------------
/**
 * Make a readout draggable: pull up or down to change it, click to type it.
 *
 * A number on a mixing desk is a control. Having to find the slider that owns a
 * value before you can nudge it is a step for nothing, and the old behaviour was
 * worse than nothing — dragging over a number selected the text.
 *
 * `moved` is what tells a drag from a click: under three pixels and the pointer was
 * only ever a click, so the type-in opens instead.
 */
function dragNumber(el, { value, set, range, step, onClick }) {
  el.classList.add('draggy');
  let startY = 0, startVal = 0, moved = 0, active = false;
  el.addEventListener('pointerdown', (e) => {
    if (el.querySelector('input')) return;         // already typing into it
    active = true; moved = 0;
    startY = e.clientY; startVal = value();
    el.setPointerCapture(e.pointerId);
    e.preventDefault();                            // and never start a text selection
  });
  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dy = startY - e.clientY;
    moved = Math.max(moved, Math.abs(dy));
    // A full range in 200px, a fifth of that with shift held.
    const perPixel = (range / 200) * (e.shiftKey ? 0.2 : 1);
    const next = startVal + dy * perPixel;
    set(Math.round(next / step) * step);
  });
  const end = (e) => {
    if (!active) return;
    active = false;
    try { el.releasePointerCapture(e.pointerId); } catch { /* already gone */ }
    if (moved < 3 && onClick) onClick();
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function slider({ min, max, step, value, fmt, onInput, reset }) {
  const wrap = document.createElement('div');
  wrap.className = 'row';
  const head = document.createElement('div'); head.className = 'head';
  const k = document.createElement('span'); k.className = 'k';
  const v = document.createElement('span'); v.className = 'v';
  head.append(k, v);
  const input = document.createElement('input');
  input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = value;
  v.textContent = fmt(value);
  // Click the readout to type an exact value. A slider is fine for finding a
  // setting by ear and useless for dialling in one you already know.
  v.classList.add('typable');
  v.title = 'drag to change · click to type a value';
  const openEditor = () => {
    if (v.querySelector('input')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein';
    box.value = String(+input.value);
    v.textContent = '';
    v.append(box);
    box.focus(); box.select();
    const done = (commit) => {
      const n = parseFloat(box.value);
      if (commit && Number.isFinite(n)) {
        input.value = clamp(n, min, max);
        onInput(+input.value);
      }
      v.textContent = fmt(+input.value);
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { done(true); }
      else if (ev.key === 'Escape') { done(false); }
    });
    box.addEventListener('blur', () => done(true));
  };
  dragNumber(v, {
    value: () => +input.value,
    set: (x) => { input.value = clamp(x, min, max); v.textContent = fmt(+input.value); onInput(+input.value); },
    range: max - min,
    step,
    onClick: openEditor,
  });
  input.addEventListener('input', () => { v.textContent = fmt(+input.value); onInput(+input.value); });
  // Reset by clicking the label. Double-clicking the slider itself also works, but
  // it is not discoverable and a double-click on a range often reads as a drag.
  const doReset = () => { input.value = reset; v.textContent = fmt(reset); onInput(reset); };
  k.classList.add('resettable');
  k.title = `reset to ${fmt(reset)}`;
  k.addEventListener('click', doReset);
  input.addEventListener('dblclick', doReset);
  wrap.append(head, input);
  return { wrap, label: k, input, readout: v, reset: doReset };
}

const meters = [];

// Which families of track the desk is showing. A view, not a mix control: the song
// keeps playing every lane, so what you hear while you work on the drums is the song
// with drums in it. Remembered, because "I am working on the percussion" outlasts a
// reload. Numbers come from the full lane list — see buildRack.
const GROUPS_KEY = 'mash-mixer-hidden-groups';
let hiddenGroups = new Set(JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'));
let laneNumbers = new Map();

function buildLaneFilter(all) {
  const wrap = $('lanefilter');
  wrap.textContent = '';
  // Only the families this song actually has: a Vocal button on a song with no vocal
  // lane is a control that does nothing, which is worse than one that is missing.
  const counts = new Map();
  for (const l of all) counts.set(l.group, (counts.get(l.group) || 0) + 1);
  const redraw = () => {
    localStorage.setItem(GROUPS_KEY, JSON.stringify([...hiddenGroups]));
    buildRack();                 // the rack only — the arrangement keeps every lane
  };

  // No All button: the switches stay where they are when they are off, so putting a
  // family back is the same click that took it away — a second control for that is a
  // second thing to look at for nothing.
  for (const [group, n] of counts) {
    const b = document.createElement('button');
    const name = document.createElement('span');
    name.textContent = group;
    const count = document.createElement('span');
    count.className = 'n';
    count.textContent = String(n);
    b.append(groupIcon(group), name, count);
    const shown = !hiddenGroups.has(group);
    b.classList.toggle('off', !shown);
    b.title = `${shown ? 'Hide' : 'Show'} the ${n} ${group} track${n === 1 ? '' : 's'}`
      + ' — this changes what the MIXER shows; the arrangement keeps every lane and'
      + ' nothing is muted';
    b.onclick = () => {
      if (hiddenGroups.has(group)) hiddenGroups.delete(group); else hiddenGroups.add(group);
      // Hiding the last one would leave an empty desk, which is not a view of anything.
      if (hiddenGroups.size >= counts.size) hiddenGroups.delete(group);
      redraw();
    };
    wrap.append(b);
  }
}

function buildRack() {
  const rack = $('rack');
  rack.textContent = '';
  meters.length = 0;
  const mix = mixFor(trackId);
  const all = deskLanes(track.bank, 1);
  // Track numbers come from the whole song, not from what is on screen: hiding the
  // drums must not renumber the bass, or "mute 7" means a different channel every
  // time you change the view.
  laneNumbers = new Map(all.map((l, i) => [l.key, i + 1]));
  const lanes = all.filter((l) => !hiddenGroups.has(l.group));
  // One reserved insert block for the whole rack — sends and master included — so
  // the slots land on the same pixel on every strip rather than wandering up and
  // down with each strip's own count.
  const maxChain = Math.max(
    0,
    ...lanes.map((l) => effectsOf(l.key).length),
    ...AUXES.map((a) => effectsOf(`__aux:${a.id}`).length),
    effectsOf('__master').length,
  );
  // The longest chain and one line more: the spare is the empty slot at the end of
  // the selected strip's chain, and reserving it for the whole rack means selecting
  // a strip reveals an outline rather than moving every fader on the desk down a
  // row. On a rack where something is already at the limit there is nothing to
  // reserve for — a full strip has nowhere to put a seventh effect anyway.
  const slotRows = Math.min(MAX_EFFECTS, maxChain + 1);

  lanes.forEach((lane) => rack.append(channelStrip(lane, mix, slotRows, laneNumbers.get(lane.key))));

  // The master goes in the left column — the one the arrangement spends on names —
  // so the channels start on the same line their lanes do above. The sends stay
  // pinned right, where they never scroll away from the channels feeding them. Same
  // strip as a channel in both cases, because that is what they are: a fader, a
  // chain of inserts and somewhere to send.
  const slot = $('masterslot');
  slot.textContent = '';
  slot.append(masterStrip(mix, slotRows));
  buildLaneFilter(all);          // the switches live in the mixer's header now
  const sends = $('sendslot');
  sends.textContent = '';
  for (const def of AUXES) sends.append(sendStrip(def, mix, slotRows));

  const special = selectedLane === '__master' || (selectedLane || '').startsWith('__aux:');
  if (selectedLane && !special && !lanes.some((l) => l.key === selectedLane)) selectedLane = null;
  requestAnimationFrame(fitStrips);

  // Never nothing: the device panel is the biggest surface on the desk, and opening
  // it empty wastes it. The master is the one strip every song has, and the one you
  // want when you have not said otherwise.
  selectLane(selectedLane || '__master');
}

/**
 * The three zones every strip has: a pinned name, a body that scrolls if it must,
 * and a foot pinned to the bottom. Feet are bottom-anchored in all of them, which
 * is what puts every fader in the rack on one line.
 */
function stripShell(key, { label, tag, colour, tint, cls = '', number = null }) {
  const el = document.createElement('div');
  el.className = `strip ${cls}`.trim();
  el.dataset.lane = key;
  if (colour) {
    el.style.setProperty('--lane', colour);
    if (tint) el.style.setProperty('--lanedim', tint);
  }
  const head = document.createElement('div'); head.className = 'striphead';
  // The same number the arrangement row carries, in the corner where a console
  // stencils it: the strips and the track list are one list, counted once.
  if (number != null) {
    const n = document.createElement('span');
    n.className = 'stripnum';
    n.textContent = String(number);
    head.append(n);
  }
  const h = document.createElement('h3'); h.textContent = label;
  head.append(h, groupChip(tag));
  head.style.cursor = 'pointer';
  head.title = 'click anywhere on this strip to show its devices below';
  const body = document.createElement('div'); body.className = 'stripbody';
  const foot = document.createElement('div'); foot.className = 'stripfoot';
  el.append(head, body, foot);
  // Any empty part of the strip selects it — hunting for a specific hit target on a
  // strip you are already looking at is friction for nothing. Controls stop the
  // event so dragging a fader does not also re-select.
  el.addEventListener('click', (ev) => {
    if (ev.target.closest('input, button, select')) return;
    selectLane(key);
  });
  return { el, head, body, foot };
}

/**
 * The fader group, centred in the strip. The pan pot used to sit in a slot beside the
 * fader, with a mirrored empty slot opposite holding the centre; it has a line of its
 * own under the fader now, so both slots go and the column centres itself.
 */
function faderRow(fadercol) {
  const row = document.createElement('div');
  row.className = 'faderrow';
  row.append(fadercol);
  return row;
}

/**
 * The pan pot on its own line, between the fader and the mute/solo pair and clear of
 * both — beside the fader it read as something hanging off it, where under it, above
 * the buttons, it is the strip's own control in the order a console puts them.
 *
 * Empty on the master, which has no panner: the row keeps its height either way, so
 * every strip's buttons still land on one line.
 */
function panRow(pan) {
  const row = document.createElement('div');
  row.className = 'panrow';
  if (pan) row.append(pan);
  return row;
}

/** Mute and solo under the fader, sharing the width of the strip. */
function btnRow(...kids) {
  const row = document.createElement('div');
  row.className = 'ctlbtns';
  row.append(...kids);
  return row;
}

/** A stand-in for a control the master has no node for — see .gap-btns. */
function gap(cls) {
  const el = document.createElement('div');
  el.className = `gap ${cls}`;
  return el;
}

/** A delay time reads better in seconds once it is past a second. */
const fmtDelay = (secs) => (secs >= 1 ? `${secs.toFixed(2)}s` : `${Math.round(secs * 1000)}ms`);

/**
 * The line at the top of a bus strip: what its own device is set to, and the way in
 * to change it. The parameters live in the panel below now, and a strip that showed
 * nothing about them left you hunting for where they had gone — this both says what
 * the delay is doing and opens the card that changes it.
 */
function deviceSummary(key, text) {
  const b = document.createElement('button');
  b.className = 'devlink';
  b.textContent = text;
  b.title = `${targetLabel(key)} — its own controls live in the panel below. Click to open them.`;
  b.onclick = (ev) => { ev.stopPropagation(); selectLane(key); };
  return b;
}

// A glyph per family, drawn rather than spelled: at a glance you are looking for
// "the drums" or "the effects", and six kinds of thing tell each other apart faster
// by shape than by reading six words in the same typeface.
//
// They live on the ARRANGEMENT rows, not on the strips. On a 118px strip the mark
// had to be 10px to sit beside the word, and at 10px a microphone and a drum are the
// same smudge; an arrangement row is 26px tall with room to its left, so the same
// mark reads there and the strip keeps the plain word.
// `head` is drawn filled — a quaver without a filled note head is a stem with a
// flag on it, which is not a note at all.
const GROUP_ICONS = {
  drums: { d: 'M6 1.6a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8M1.9 4.6h8.2' },
  melodic: { d: 'M6.7 9.1V2.3c2.5.7 3.5 1.9 3.5 3.5', head: [4.5, 9.1, 2.2] },
  // A closed bolt, filled: as an open stroke it was three lines that never met, and
  // at eleven pixels that reads as a scribble rather than as lightning.
  fx: { d: 'M7.3 1.2 3.4 6.6h2.2l-.7 4.2 3.9-5.6H6.6z', fill: true },
  vocal: { d: 'M6 1.5a1.6 1.6 0 0 1 1.6 1.6v2.4a1.6 1.6 0 0 1-3.2 0V3.1A1.6 1.6 0 0 1 6 1.5M3.2 5.8a2.8 2.8 0 0 0 5.6 0M6 8.6v1.9' },
  send: { d: 'M1.8 8.6h4.4a2.6 2.6 0 0 0 0-5.2H3.9M5.6 1.9 3.7 3.4l1.9 1.5' },
  bus: { d: 'M2 2.8h8M2 6h8M2 9.2h5.4' },
};

/** The family mark on its own, for an arrangement row. */
function groupIcon(tag) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('class', 'grpicon');
  const spec = GROUP_ICONS[tag] || { d: '' };
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', spec.d);
  if (spec.fill) path.setAttribute('class', 'grpfill');   // a solid shape, not an outline
  svg.append(path);
  if (spec.head) {
    const [cx, cy, r] = spec.head;
    const head = document.createElementNS(NS, 'ellipse');
    head.setAttribute('cx', cx); head.setAttribute('cy', cy);
    head.setAttribute('rx', r); head.setAttribute('ry', r * 0.82);
    head.setAttribute('class', 'grpfill');
    svg.append(head);
  }
  const t = document.createElementNS(NS, 'title');
  t.textContent = tag;
  svg.append(t);
  return svg;
}

/** The family this strip belongs to, in a word. */
function groupChip(tag) {
  const el = document.createElement('div');
  el.className = 'grp-tag';
  el.textContent = tag;
  return el;
}

/** One EQ band — the same row on a channel and on a send return. */
function eqRow(band, value, onInput) {
  const r = slider({
    min: -18, max: 18, step: 0.1, value, reset: 0,
    fmt: (x) => (x > 0 ? '+' : '') + x.toFixed(1),
    onInput,
  });
  r.label.textContent = band.toUpperCase();
  return r.wrap;
}

// Solo is monitoring only — never written to the draft, never saved — but it does
// have to survive a rack rebuild, so the desk remembers it here rather than in the
// mix. The engine holds the same set; this is what re-draws the lit button.
const soloed = new Set();
const soloedAux = new Set();

/**
 * The M and S pair for one lane. There are two of each on screen — the channel
 * strip and the arrangement row, as in Logic — and pressing either has to light
 * both, so the state lives in the mix and the buttons are only ever a view of it.
 */
function muteSoloPair(key, label) {
  const muted = !!mixFor(trackId).lanes?.[key]?.mute;
  const mute = document.createElement('button');
  mute.textContent = 'M';
  mute.className = 'mutebtn warn' + (muted ? ' on' : '');
  mute.title = `mute ${label} (M)`;
  mute.onclick = (ev) => {
    ev.stopPropagation();
    setLaneMute(key, !mute.classList.contains('on'));
  };
  const solo = document.createElement('button');
  solo.textContent = 'S';
  solo.className = 'solobtn' + (soloed.has(key) ? ' on' : '');
  solo.title = `solo ${label} — monitoring only, never saved (S)`;
  solo.onclick = (ev) => {
    ev.stopPropagation();
    setLaneSolo(key, !solo.classList.contains('on'));
  };
  return [mute, solo];
}

function setLaneMute(key, on) {
  editMix((m) => { laneOf(m, key).mute = on; });
  Audio.mixer?.lane(key)?.setMute(on);
  syncLaneButtons(key);
}

function setLaneSolo(key, on) {
  if (on) soloed.add(key); else soloed.delete(key);
  Audio.mixer?.lane(key)?.setSolo(on);
  syncLaneButtons(key);
  updateSoloLight();
}

/**
 * One light for "something is soloed", and one click to undo it.
 *
 * Solo is the setting you leave on by accident: it is monitoring, so it is never
 * saved, never shows up in a diff, and a soloed channel three screens to the right
 * sounds exactly like every other channel being broken.
 */
function updateSoloLight() {
  const any = soloed.size > 0 || soloedAux.size > 0;
  const btn = $('clearsolo');
  btn.classList.toggle('on', any);
  btn.title = any
    ? `soloed: ${[...soloed, ...[...soloedAux].map((id) => `${id} send`)].join(', ')} — click to clear`
    : 'nothing is soloed';
}

function clearAllSolo() {
  const had = soloed.size + soloedAux.size;
  for (const key of [...soloed]) { soloed.delete(key); Audio.mixer?.lane(key)?.setSolo(false); syncLaneButtons(key); }
  for (const id of [...soloedAux]) { soloedAux.delete(id); Audio.mixer?.setAuxSolo(id, false); }
  for (const b of document.querySelectorAll('.strip.send .solobtn')) b.classList.remove('on');
  updateSoloLight();
  if (had) toast('solo cleared');
}

/** Light both copies of a lane's M and S — the strip's and the arrangement row's. */
function syncLaneButtons(key) {
  const sel = `[data-lane="${CSS.escape(key)}"]`;
  const muted = !!mixFor(trackId).lanes?.[key]?.mute;
  for (const b of document.querySelectorAll(`${sel} .mutebtn`)) b.classList.toggle('on', muted);
  for (const b of document.querySelectorAll(`${sel} .solobtn`)) b.classList.toggle('on', soloed.has(key));
}

function channelStrip(lane, mix, slotRows, number) {
  const key = lane.key;
  const s = laneSettings(mix.lanes[key]);
  const { el, body, foot } = stripShell(key, {
    label: lane.label, tag: lane.group, colour: laneColour(key), tint: laneTint(key), number,
  });

  const setEq = (band) => (x) => {
    editMix((m) => {
      const L = laneOf(m, key);
      L.eq = { ...LANE_DEFAULTS.eq, ...(L.eq || {}), [band]: x };
    }, `eq:${key}:${band}`);
    Audio.mixer?.lane(key)?.setEQ({ [band]: x });
  };
  for (const band of ['high', 'mid', 'low']) {
    body.append(eqRow(band, s.eq[band], setEq(band)));
  }

  // One send per aux, generated from AUXES — adding a fifth send upstream adds a
  // row here with no further work. Full words: a 132px strip has room for them,
  // and DLY/RVB made you translate.
  const SHORT = { delay: 'DELAY SEND', reverb: 'REVERB SEND' };
  for (const aux of AUXES) {
    // Every send starts shut and reads back what the mix actually stores — no family
    // default behind it, so a channel that echoes says so on its own face.
    const dflt = 0;
    const row = slider({
      min: 0, max: 2, step: 0.005,
      value: mix.lanes[key]?.send?.[aux.id] ?? dflt,
      reset: dflt,
      fmt: (x) => x.toFixed(2),
      onInput: (x) => {
        editMix((m) => {
          const L = laneOf(m, key);
          L.send = { ...LANE_DEFAULTS.send, ...(L.send || {}), [aux.id]: x };
        }, `${aux.id}:${key}`);
        Audio.mixer?.lane(key)?.setSend({ [aux.id]: x });
      },
    });
    row.label.textContent = SHORT[aux.id] || aux.id.toUpperCase();
    // How the signal reaches the send is still per lane — melodic voices tap it
    // pre-fader as the echo always did, the rest route the whole channel in — and it
    // is worth saying, because it is the difference between an echo that follows the
    // fader and one that does not.
    row.wrap.title = aux.legacy && !laneUsesEcho(track.bank, key)
      ? `${aux.name} send — ${lane.label} feeds it post-fader (the whole channel)`
      : `${aux.name} send`;
    body.append(row.wrap);
  }

  // Pan sits under the fader, above the buttons — see panRow.
  const pan = panKnob({
    value: s.pan,
    onInput: (x) => {
      editMix((m) => { laneOf(m, key).pan = x; }, `pan:${key}`);
      Audio.mixer?.lane(key)?.setPan(x);
    },
  });
  // Mute and solo close the strip, under the pot — the same small pair the
  // arrangement rows carry, so they read the same in both places.
  const btns = btnRow(...muteSoloPair(key, lane.label));

  const applyGain = (x) => {
    editMix((m) => { laneOf(m, key).gain = x; }, `gain:${key}`);
    Audio.mixer?.lane(key)?.setGain(x);
  };
  const fb = faderBlock({
    value: s.gain,
    title: `${lane.label} level`,
    onInput: applyGain,
    // An untagged edit, so a double-click back to 0 is its own undo step rather
    // than being coalesced into the drag that came before it.
    onReset: (x) => { editMix((m) => { laneOf(m, key).gain = x; }); Audio.mixer?.lane(key)?.setGain(x); },
  });

  foot.append(insertSlots(key, lane.label, slotRows), faderRow(fb.col), panRow(pan.el), btns);
  stripMenu(el, key, 'channel');
  meters.push({ key, fill: fb.fill, peak: fb.peak, meter: fb.meter });
  return el;
}

/**
 * A send return. Its own parameters — the delay's time and feedback, the reverb's
 * decay — are the pinned card in the device panel below, not rows on the strip: a
 * 132px column cannot hold TIME/FBK/DAMP legibly, and the attempt pushed the
 * return EQ off the strip entirely.
 */
function sendStrip(def, mix, slotRows) {
  const key = `__aux:${def.id}`;
  const cur = fxOf(mix)[def.id];
  const hue = def.type === 'delay' ? 196 : 268;
  const { el, body, foot } = stripShell(key, {
    label: def.name.toUpperCase(), tag: 'send', cls: 'send',
    colour: `hsl(${hue} 62% 55%)`, tint: `hsl(${hue} 32% 12%)`,
  });

  // Values only, in the order the card lists them — a 132px strip has room for the
  // numbers or for their names, and the numbers are what you are checking.
  body.append(deviceSummary(key, def.type === 'delay'
    ? `${fmtDelay(syncSeconds(cur.division, track.bank.bpm))} · ${cur.feedback.toFixed(2)}`
      + ` · ${cur.tone >= 1000 ? `${(cur.tone / 1000).toFixed(1)}k` : cur.tone}`
    : `${cur.decay.toFixed(1)}s · pre ${(cur.preDelay * 1000).toFixed(0)}ms`));

  // The return EQ, in the same three rows and the same place a channel keeps its
  // own. On a reverb this is the damping control in everything but name.
  for (const band of ['high', 'mid', 'low']) {
    body.append(eqRow(band, cur.eq?.[band] ?? 0, (x) => {
      editFx(def.id, { eq: { ...(fxOf(mixFor(trackId))[def.id].eq || {}), [band]: x } },
        `${def.id}:eq:${band}`);
    }));
  }

  // The return level IS this strip's fader, which is what it always was
  // semantically — it just used to be a slider called SEND halfway up the panel.
  const lvlDb = 20 * Math.log10(Math.max(0.001, cur.level ?? 1));
  const fb = faderBlock({
    value: Math.round(lvlDb * 10) / 10,
    // +6, the same ceiling every fader on the desk has. A return that went to +12
    // because the echo happens to be quiet is a fader that means something different
    // from the one beside it, and a desk you have to remember exceptions about is
    // worse than an echo you have to push. The loud end is still reachable: the send
    // itself goes to 2, which with this at +6 puts the return within a dB of the
    // channel it came from.
    title: def.legacy
      ? `${def.name} return level — a scale on the echo the song asks for`
        + ' (its sections automate that between 0 and about 0.35, so this lifts the'
        + ' whole ramp and keeps its shape)'
      : `${def.name} return level`,
    onInput: (x) => editFx(def.id, { level: 10 ** (x / 20) }, `${def.id}:level`),
  });

  // A return pans like a channel: the same pot in the same place. Mute takes the
  // return out of the mix; solo leaves the channels feeding it and mutes everything
  // else, so you hear the effect on its own.
  const pan = panKnob({
    value: cur.pan ?? 0,
    onInput: (x) => editFx(def.id, { pan: x }, `${def.id}:pan`),
  });
  const mute = document.createElement('button');
  mute.textContent = 'M';
  mute.className = 'mutebtn warn' + (cur.mute ? ' on' : '');
  mute.title = `mute the ${def.name} return`;
  mute.onclick = (ev) => {
    ev.stopPropagation();
    const on = !mute.classList.contains('on');
    mute.classList.toggle('on', on);
    editFx(def.id, { mute: on }, null);
  };
  const solo = document.createElement('button');
  solo.textContent = 'S';
  solo.className = 'solobtn' + (soloedAux.has(def.id) ? ' on' : '');
  solo.title = `solo the ${def.name} return — monitoring only, never saved`;
  solo.onclick = (ev) => {
    ev.stopPropagation();
    const on = !solo.classList.contains('on');
    solo.classList.toggle('on', on);
    if (on) soloedAux.add(def.id); else soloedAux.delete(def.id);
    Audio.mixer?.setAuxSolo(def.id, on);
    updateSoloLight();
  };
  foot.append(insertSlots(key, def.name, slotRows), faderRow(fb.col), panRow(pan.el),
    btnRow(mute, solo));
  stripMenu(el, key, 'send');
  meters.push({ key, fill: fb.fill, peak: fb.peak, meter: fb.meter });
  return el;
}

/**
 * The master bus. No EQ rows: there is no EQ node on the master path — a parametric
 * EQ in the insert slots is how you do it, and it is a better EQ than three fixed
 * bands anyway. The limiter is the pinned card below.
 */
function masterStrip(mix, slotRows) {
  const { el, body, foot } = stripShell('__master', { label: 'MASTER', tag: 'bus', cls: 'master' });
  body.append(deviceSummary('__master', mix.limiter ? 'limiter on' : 'limiter off'));
  const setMaster = (x) => { editMix((m) => { m.master = x; }, 'master'); Audio.mixer?.setMasterTrim(x); };
  const fb = faderBlock({
    value: mix.master || 0, min: -24, max: 12,
    title: 'master trim, on top of the bank’s own musicTrim',
    onInput: setMaster,
    onReset: (x) => { editMix((m) => { m.master = x; }); Audio.mixer?.setMasterTrim(x); },
  });
  // The master has no panner and nothing to mute; an empty pan row and the gap that
  // stands in for the buttons keep every strip's foot ending on one line.
  foot.append(insertSlots('__master', 'master', slotRows), faderRow(fb.col), panRow(null),
    gap('gap-btns'));
  stripMenu(el, '__master', 'master');
  meters.push({ key: '__master', fill: fb.fill, peak: fb.peak, meter: fb.meter });
  return el;
}

// The fader is the desk's shock absorber. In a short window it gives up height so
// the EQ and send rows above it stay on screen — they are read constantly while
// balancing, where the fader is a grip you can still hit at 48px, with an exact dB
// readout under it either way. Given room it takes all of it — there is no cap, so
// the strips always fill the rack exactly and a tall window ends up with long
// faders rather than a band of empty desk under short ones.
const FADER_MIN = 48;
/**
 * The rack's own vertical chrome: its padding, plus whatever the horizontal
 * scrollbar takes at the bottom. Measured, because `scrollbar-gutter: stable`
 * reserves that space whether or not the bar is showing — assuming 20px left six
 * pixels unaccounted for, which was enough to put a vertical scrollbar down the rack
 * and cut the padding under the strips.
 */
function rackPad() {
  const rack = $('rack');
  if (!rack) return 20;
  return px(rack, 'paddingTop') + px(rack, 'paddingBottom')
    + (rack.offsetHeight - rack.clientHeight);
}

const h = (el) => (el ? el.getBoundingClientRect().height : 0);
const px = (el, prop) => parseFloat(getComputedStyle(el)[prop]) || 0;

/**
 * Everything above and below the rack that holds a fixed height of its own — the
 * splitter included, which is eleven pixels the rack was quietly overrunning by, so
 * its bottom padding sat just under the fold.
 */
const pageChrome = () => [document.querySelector('header'), $('timeline'), $('arrsplit'),
  $('mixhead'), $('devices'), document.querySelector('footer'), $('err')]
  .reduce((t, el) => t + h(el), 0);

/** The least the arrangement will ever be: its header and eight lanes. */
function arrangementFloor() {
  const arrange = $('arrange');
  if (arrange.classList.contains('collapsed')) return h(arrange);
  return h($('arrhead')) + laneRowHeight() * 8;
}

// A height the user dragged the splitter to, which beats the automatic fit until
// they double-click it away. Kept across reloads: it is a preference about this
// screen, not about the mix.
const ARR_KEY = 'mash-mixer-arrh';
// Clamped on the way in: a dragged height is remembered across reloads, and a stale
// or nonsense one (drag hard upwards and it goes negative) would otherwise pin the
// arrangement shut on every load with no way to tell why.
const storedArrH = Number(localStorage.getItem(ARR_KEY));
let userArrH = Number.isFinite(storedArrH) && storedArrH > 40 ? storedArrH : null;

// The arrangement's height is always its header plus a whole number of lanes.
const GRID_PAD = 0;                                  // #arrgrid has none, deliberately
const laneRowHeight = () => h(document.querySelector('.arrrow')) || 26;
const laneCount = () => document.querySelectorAll('.arrrow').length || 1;
/** How many whole lanes fit in `px` of arrangement. Below one is a fold, not a row. */
const lanesIn = (px, round = Math.round) => round((px - h($('arrhead')) - GRID_PAD) / laneRowHeight());
/**
 * The nearest height that shows whole lanes, at least one. Rounding to the NEAREST is
 * right under the hand on the splitter — half a lane either way should settle on the
 * one you meant. It is wrong against a ceiling: rounding up there hands the rack back
 * a few pixels it was promised, and a strip four pixels short scrolls its last send
 * row out of sight. So the automatic fit passes Math.floor.
 */
const arrangeSnap = (px, round = Math.round) => h($('arrhead')) + GRID_PAD
  + clamp(lanesIn(px, round), 1, laneCount()) * laneRowHeight();

/** And the most it can use: every lane at once. */
function arrangementWants() {
  const arrange = $('arrange');
  if (arrange.classList.contains('collapsed')) return h(arrange);
  return h($('arrhead')) + $('arrgrid').scrollHeight;
}

/**
 * What the strip body needs when nothing is squeezing it. Measured by taking the
 * body out of the flex layout for one frame rather than by adding up rows: the rows
 * carry margins as well as the container's gap and padding, and summing the pieces
 * by hand quietly lost the margins — which cost the last send row its slider.
 */
function naturalHeight(body) {
  const was = body.style.flex;
  body.style.flex = '0 0 auto';
  const natural = body.scrollHeight;
  body.style.flex = was;
  return natural;
}

/**
 * Everything in a strip whose height does not move with the fader — the pan, the
 * buttons and the readout are all fixed, so the fader is the only variable left.
 *
 * Measured across EVERY strip, not off the first one: the insert buttons live in the
 * foot, so a channel with five effects on it stands a hundred pixels taller in the
 * fixed parts than a channel with none. Sizing the rack from the first strip gave the
 * busy ones a body too short for their own rows, and the body scrolls without a
 * scrollbar — so the EQ and sends simply vanished off the bottom.
 *
 * Rounded up: a strip half a pixel short scrolls the last send row's slider out of
 * view, which is the whole thing this is here to prevent.
 */
function stripChrome() {
  let chrome = 0;
  for (const s of document.querySelectorAll('.strip')) {
    const b = s.querySelector('.stripbody');
    if (!b) continue;
    // Each strip's own fader comes out of its own total — that is the part this is
    // solving for, and a strip without one has none to subtract.
    chrome = Math.max(chrome, Math.ceil(px(s, 'paddingTop') + px(s, 'paddingBottom')
      + naturalHeight(b) + h(s.querySelector('.striphead'))
      + h(s.querySelector('.stripfoot')) - h(s.querySelector('.faderwrap'))) + 2);
  }
  return chrome;
}

/**
 * What the effects panel is allowed to take. The rows on the strips are the desk, so
 * they come first: the panel gets what is left after the arrangement's last lane and
 * a whole strip, and scrolls inside it. Without the cap the height came out of the
 * strips instead — the body scrolls, and there is deliberately no scrollbar there to
 * say so, so the EQ and send rows simply went missing.
 */
function deviceRoom(chrome = stripChrome()) {
  const fixed = h(document.querySelector('header')) + h($('timeline')) + h($('arrsplit'))
    + h($('mixhead')) + h(document.querySelector('footer')) + h($('err'));
  const room = innerHeight - fixed
    // The arrangement squeezed to a single lane, and a whole strip in the rack: what
    // the panel may have is what is left after both.
    - (h($('arrhead')) + GRID_PAD + laneRowHeight())
    - (chrome + FADER_MIN + rackPad());
  // Never smaller than a card's own controls — below that the panel is a title bar
  // with a sliver under it, which tells you nothing and still costs the height.
  return Math.max(h($('devhead')) + 96, Math.floor(room));
}

function capDevices(chrome) {
  const dev = $('devices');
  if (dev.classList.contains('collapsed')) return;
  const want = deviceRoom(chrome);
  if (h(dev) > want) document.documentElement.style.setProperty('--devh', `${want}px`);
}

/**
 * Size the strips to the window, and give the arrangement what is left.
 *
 * Everything is computed from the window rather than from what is currently on
 * screen, so calling it twice cannot ratchet: measuring the rack, shrinking the
 * fader, then growing the arrangement into the space that freed up would take
 * another slice off the fader on every resize.
 */
function fitStrips() {
  // Mixer folded away: there are no strips to fit, and the arrangement takes the
  // window — which is the reason to fold it.
  if ($('rackwrap').classList.contains('collapsed')) {
    const arrange = $('arrange');
    if (!arrange.classList.contains('collapsed')) {
      const room = innerHeight - pageChrome();
      arrange.style.maxHeight = `${Math.round(arrangeSnap(Math.min(arrangementWants(), room), Math.floor))}px`;
    }
    markClipped();
    return;
  }
  const strip = document.querySelector('.strip[data-lane]');
  const body = strip?.querySelector('.stripbody');
  const fw = strip?.querySelector('.faderwrap');
  if (!strip || !body || !fw) return;
  const chrome = stripChrome();

  // Split the window between the arrangement and the rack: the arrangement gets what
  // it can use, down to eight lanes, and never so much that a whole strip stops
  // fitting. The rack takes the rest — all of it, so there is no dead band.
  capDevices(chrome);
  const total = innerHeight - pageChrome();
  const arrange = $('arrange');
  const floor = arrangementFloor();
  // What the rack keeps whatever the arrangement asks for: a whole strip AND the
  // padding under it, so the rack never shows a strip cut off by its own bottom
  // edge. On a window too short for even that, the arrangement goes down to its
  // header and the rack scrolls — the strip is never squashed to fit.
  const ceiling = Math.max(h($('arrhead')) + 6, total - (chrome + FADER_MIN + rackPad()));
  // A dragged height wins, down to a single lane — "show me less of this" is a
  // legitimate thing to want, and the eight-lane floor is only the automatic answer.
  // Whole lanes only. A row cut in half is a row you cannot read and cannot click,
  // and the eye reads the cut as a rendering fault rather than as a boundary.
  const arrH = arrange.classList.contains('collapsed')
    ? h(arrange)
    : arrangeSnap(Math.min(userArrH != null ? userArrH : arrangementWants(), ceiling), Math.floor);
  if (!arrange.classList.contains('collapsed')) arrange.style.maxHeight = `${Math.round(arrH)}px`;

  const strips = Math.floor(total - arrH - rackPad());
  const fader = Math.max(FADER_MIN, strips - chrome);
  const root = document.documentElement.style;
  root.setProperty('--faderh', `${fader}px`);
  // Sized to the rack, never past it: there is no vertical scrollbar on the rack, so
  // a strip that wanted more would simply be cut off. `strips` already accounts for
  // the rack's padding and its horizontal scrollbar, so this fills the space exactly
  // and leaves the padding showing under the last strip.
  root.setProperty('--striph', `${Math.max(140, Math.min(strips, chrome + fader))}px`);
  markClipped();
}

/**
 * A tooltip only where the name is cut off. "Electro-Fx" fits in a strip and needs no
 * hover; the ones that ellipsis do, and there is no way to read them otherwise. It is
 * a measurement, not a property of the name, so it is re-taken whenever the layout
 * moves — a name that fits at one window width is truncated at another.
 */
function markClipped(root = document) {
  for (const el of root.querySelectorAll('.strip h3, .arrname')) {
    const full = el.dataset.full || el.textContent;
    el.dataset.full = full;
    el.title = el.scrollWidth > el.clientWidth + 1 ? full : '';
  }
}

// The splitter. Dragging it is a claim about how much arrangement you want to see;
// double-clicking it withdraws the claim.
(() => {
  const bar = $('arrsplit');
  let from = 0, startH = 0, dragging = false;
  bar.addEventListener('pointerdown', (e) => {
    dragging = true;
    from = e.clientY;
    startH = h($('arrange'));
    bar.classList.add('dragging');
    try { bar.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    e.preventDefault();
  });
  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const asked = startH + (e.clientY - from);
    // Pulled up past the first lane: fold it away. Half a lane is not a thing to
    // leave someone looking at, and the fold is where they were heading anyway.
    if (lanesIn(asked) < 1) {
      setArrangeCollapsed(true);
      userArrH = null;
    } else {
      setArrangeCollapsed(false);
      userArrH = arrangeSnap(asked);
    }
    fitStrips();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove('dragging');
    if (userArrH != null) localStorage.setItem(ARR_KEY, String(Math.round(userArrH)));
    else localStorage.removeItem(ARR_KEY);
  };
  bar.addEventListener('pointerup', stop);
  bar.addEventListener('pointercancel', stop);
  bar.addEventListener('dblclick', () => {
    userArrH = null;
    localStorage.removeItem(ARR_KEY);
    fitStrips();
    toast('arrangement back to fitting itself');
  });
})();

addEventListener('resize', fitStrips);

// ---- timeline --------------------------------------------------------------
// One segment per two-bar block of the song form. Sections get distinct hues so a
// verse/lift/bridge shape is readable at a glance, which is what you actually
// navigate by when balancing — "the loud bit" is a block, not a timestamp.
const SECTION_HUES = [168, 210, 275, 32, 130, 340, 190, 60];

// One hue per channel, shared by its strip and its arrangement row, so a colour
// means the same thing in both places. Grouped so the kit reads as a family.
const LANE_HUES = {
  kick: 6, snare: 22, clap: 38, hats: 48, ohats: 54, rim: 30, crash: 14,
  bass: 96, lead: 168, leadHarm: 186, twinkle: 200, chords: 212, organChords: 226,
  organGliss: 250, organSwoop: 260, keyGliss: 272, gliss: 284, electroFx: 296,
  sweeps: 308, vox: 330, shout: 344,
};
const laneHue = (key) => LANE_HUES[key] ?? 200;
const laneColour = (key, l = 55) => `hsl(${laneHue(key)} 62% ${l}%)`;
/** The same hue, dark enough to sit behind a name without shouting over it. */
const laneTint = (key) => `hsl(${laneHue(key)} 32% 12%)`;

function songShape() {
  const bank = track.bank;
  const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
  const spb = (60 / deskTempo()) / 4;   // the tempo you are listening at, dragged or not
  return { order, spb, totalSteps: order.length * 32, loopSecs: order.length * 32 * spb };
}

function buildTimeline() {
  const { order, loopSecs } = songShape();
  // Every block is 32 sixteenth-steps: 8 beats, i.e. 2 bars of 4/4. That is the
  // engine's unit (scheduleStep cycles step % 32 and bank.order lists two-bar
  // blocks), so equal-width segments are musically honest — blocks only differ in
  // wall-clock length between songs, never within one.
  // One segment per BAR (4 beats), not per two-bar block. Both are fixed units, but
  // a bar is the one you count in your head. The two bars of a block share the
  // section's hue, with the second slightly darker so the block structure still
  // reads without having to count.
  const secsPerBar = (60 / track.bank.bpm) * 4;

  // The ruler: a tick per bar, numbered often enough to read and rarely enough to
  // stay legible. Percentage positions, so it follows the window without rebuilding.
  const barCount = order.length * 2;
  const every = barCount <= 24 ? 2 : barCount <= 48 ? 4 : barCount <= 96 ? 8 : 16;
  const ruler = $('ruler');
  ruler.textContent = '';
  for (let b = 1; b <= barCount; b++) {
    const major = (b - 1) % every === 0;
    const tick = document.createElement('div');
    tick.className = 'tick' + (major ? ' major' : '');
    tick.style.left = `${((b - 1) / barCount) * 100}%`;
    if (major) {
      const n = document.createElement('span');
      n.textContent = String(b);
      tick.append(n);
    }
    ruler.append(tick);
  }

  const el = $('blocks');
  el.textContent = '';
  order.forEach((sec, i) => {
    const hue = SECTION_HUES[sec % SECTION_HUES.length];
    for (let half = 0; half < 2; half++) {
      const bar = i * 2 + half + 1;
      const d = document.createElement('div');
      d.className = 'blk' + (half ? ' second' : '');
      d.style.background = `hsl(${hue} 42% ${half ? 38 : 46}%)`;
      d.title = `Bar ${bar} · block ${i + 1}/${order.length} · section ${sec + 1}`
        + ` · ${fmtTime((bar - 1) * secsPerBar)} (${secsPerBar.toFixed(1)}s per bar)`;
      // No number in the block: the ruler above counts the bars, and these say which
      // section they belong to. One row, one question.
      el.append(d);
    }
  });
  $('tnow').title = `where you are in ${track.title}, and how long it runs`;
  $('tnow').textContent = `0:00/${fmtTime(loopSecs)}`;
  $('barnow').textContent = `1/${order.length * 2}`;
}

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Loop length in bars; 0 means the whole song form. The length defaults to 1 bar
// because that is the mixing gesture — park on a bar, move a fader, listen again —
// but the loop itself starts OFF, so pressing play gives you the whole song.
let loopBars = 1;
let loopOn = false;
// Two different positions, and they were one for too long. `loopAnchor` is where the
// LOOP REGION starts, which has to sit on a bar line. `parkedAt` is where the
// playhead is, to the step — Play resumes exactly where you paused, because "carry
// on from here" is what a pause means; rounding it to the bar threw away the last
// three beats every time.
let loopAnchor = 0;
let parkedAt = 0;

/** Arm the loop over `loopBars` starting at the bar containing `atStep`. */
function applyLoop(atStep = null) {
  const { totalSteps } = songShape();
  if (!loopOn || !loopBars) { Audio.setLoop(); $('loopregion').style.display = 'none'; return; }
  const stepsPerBar = 16;                       // 16 sixteenths in a bar of 4/4
  const from = atStep != null ? atStep : Audio.step;
  // Snap to a bar line, and to the song form rather than to absolute step count, so
  // the shaded region on the timeline is where the loop actually is.
  const barIndex = Math.floor((from % totalSteps) / stepsPerBar);
  const start = barIndex * stepsPerBar;
  const end = Math.min(totalSteps, start + loopBars * stepsPerBar);
  const cycle = Math.floor(Audio.step / totalSteps) * totalSteps;
  Audio.setLoop(cycle + start, cycle + end);
  loopAnchor = start;
  const reg = $('loopregion');
  reg.style.display = '';
  reg.style.left = (start / totalSteps * 100) + '%';
  reg.style.width = ((end - start) / totalSteps * 100) + '%';
}

$('loopbars').onchange = () => {
  loopBars = +$('loopbars').value;
  applyLoop(playing ? null : loopAnchor);
  toast(loopBars ? `looping ${loopBars} bar${loopBars > 1 ? 's' : ''}` : 'looping the whole song');
};

$('looptoggle').onclick = () => {
  loopOn = !loopOn;
  $('looptoggle').classList.toggle('on', loopOn);
  applyLoop(playing ? null : loopAnchor);
  toast(loopOn ? 'loop on' : 'loop off — playing the whole song');
};

/**
 * Move the playhead. The sequencer's step counter IS the position, so seeking is
 * just moving it and letting the lookahead refill from now. With a bar loop armed,
 * this moves the loop rather than escaping it — which is the point of having one.
 *
 * Stopped, it parks the position instead, so Play starts from where you last
 * pointed; `start: true` (a double-click) skips the wait and plays from there.
 */
function jumpTo(step, { start = false } = {}) {
  const { totalSteps, spb, loopSecs } = songShape();
  const within = ((Math.floor(step) % totalSteps) + totalSteps) % totalSteps;
  if (!playing) {
    parkedAt = within;                              // Play resumes on this step
    loopAnchor = Math.floor(within / 16) * 16;      // the loop region wants the bar
    if (start) { setPlaying(true, within); return; }
    // Nothing is running to move the playhead, so put it where the click was.
    applyLoop(within);
    $('playhead').style.left = `${(within / totalSteps) * 100}%`;
    $('tnow').textContent = `${fmtTime(within * spb)}/${fmtTime(loopSecs)}`;
    $('barnow').textContent = `${Math.floor(within / 16) + 1}/${totalSteps / 16}`;
    return;
  }
  const cycle = Math.floor(Audio.step / totalSteps) * totalSteps;
  Audio.setLoop();                       // release, move, then re-arm around the new spot
  Audio.step = cycle + within;
  Audio.nextTime = Audio.ctx.currentTime + 0.03;
  applyLoop(cycle + within);
}

// The bars area, not the whole strip: the ruler is inset by the arrangement's name
// column, so measuring against the full width put every click a few bars early.
const timelineStep = (e) => {
  const r = $('barsarea').getBoundingClientRect();
  return Math.floor(clamp((e.clientX - r.left) / r.width, 0, 1) * songShape().totalSteps);
};
const barOf = (step) => Math.floor(step / 16) + 1;

// The section blocks under the ruler have been drawn all along and shown to nobody.
// A fold is cheaper than the row they used to cost: songs whose form you are working
// on get it, and the rest of the time the timeline stays one line tall. The choice is
// remembered, because it is a way of working and not a one-off look.
const SECTIONS_KEY = 'mash-mixer-sections';
function setSectionsShown(on, refit = true) {
  $('timeline').classList.toggle('sections', on);
  $('tlfold').classList.toggle('folded', !on);
  $('tlfold').title = on ? 'hide the song sections' : 'show the song sections';
  localStorage.setItem(SECTIONS_KEY, on ? '1' : '0');
  if (refit) fitStrips();       // the timeline is chrome; the rack gets the difference
}
$('tlfold').onclick = (e) => {
  e.stopPropagation();          // the row under it seeks — the fold is not a seek
  setSectionsShown(!$('timeline').classList.contains('sections'));
};
setSectionsShown(localStorage.getItem(SECTIONS_KEY) === '1', false);

$('timeline').onclick = (e) => {
  if (e.target.closest('#tlhead')) return;
  const at = timelineStep(e);
  jumpTo(at);
  toast(!playing ? `parked at bar ${barOf(at)} — double-click to play from here`
    : loopBars && loopOn ? `looping ${loopBars} bar${loopBars > 1 ? 's' : ''} from bar ${barOf(at)}`
    : `jumped to bar ${barOf(at)}`);
};

// Double-click plays from where you pointed. Stopped, reaching for Play and then
// hunting back to the bar you wanted was the long way round to hear one bar.
$('timeline').ondblclick = (e) => {
  if (e.target.closest('#tlhead')) return;
  const at = timelineStep(e);
  jumpTo(at, { start: true });
  toast(`playing from bar ${barOf(at)}`);
};

// ---- device panel ----------------------------------------------------------
// The selected channel's effect chain, along the bottom. Strips carry only a
// one-line summary; a 132px column cannot hold four parameters legibly, and most
// channels have no effects at all.
// Readable names for parameters whose internal keys are terse — the parametric EQ's
// bands especially, where f2/g2/q2 says nothing about what it does.
const PARAM_LABELS = {
  f1: 'LOW FREQ', g1: 'LOW GAIN',
  f2: 'LOW-MID FREQ', g2: 'LOW-MID GAIN', q2: 'LOW-MID Q',
  f3: 'HIGH-MID FREQ', g3: 'HIGH-MID GAIN', q3: 'HIGH-MID Q',
  f4: 'HIGH FREQ', g4: 'HIGH GAIN',
  wet: 'WET / DRY', mix: 'MIX', pan: 'PAN', tone: 'DAMPING',
  feedback: 'FEEDBACK', delayMs: 'TIME', frequency: 'RATE', depth: 'DEPTH',
  baseFrequency: 'BASE FREQ', octaves: 'OCTAVES', distortion: 'DRIVE',
  order: 'ORDER', width: 'WIDTH', pitch: 'PITCH', windowSize: 'WINDOW',
  decay: 'DECAY', preDelay: 'PRE-DELAY', threshold: 'THRESHOLD', ratio: 'RATIO',
  attack: 'ATTACK', release: 'RELEASE', spread: 'SPREAD', sensitivity: 'SENSITIVITY',
  delayTime: 'TIME', Q: 'Q', knee: 'KNEE',
  lowFrequency: 'LOW X-OVER', highFrequency: 'HIGH X-OVER',
};

/**
 * A parameter's label. Dotted names are labelled a part at a time — `low.threshold`
 * reads LOW THRESHOLD — so the three bands of a multiband compressor need one entry
 * for THRESHOLD between them rather than one per band.
 */
const paramLabel = (p) => PARAM_LABELS[p] || p.split('.')
  .map((s) => PARAM_LABELS[s] || s.replace(/([A-Z])/g, ' $1').toUpperCase())
  .join(' ');

/**
 * Make a dB readout typable, so a level can be entered exactly rather than nudged
 * to it. Double-click still resets, and the Reset channel button is untouched.
 */
function makeTypableDb(el, input, apply, fmt) {
  el.classList.add('typable');
  el.title = 'drag to set the level · click to type it · double-click to reset';
  const openEditor = () => {
    if (el.querySelector('input')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein';
    box.value = String(+input.value);
    el.textContent = '';
    el.append(box);
    box.focus(); box.select();
    const done = (commit) => {
      const n = parseFloat(box.value);
      if (commit && Number.isFinite(n)) {
        input.value = clamp(n, +input.min, +input.max);
        apply(+input.value);
      }
      el.textContent = fmt(+input.value);
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true);
      else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  };
  dragNumber(el, {
    value: () => +input.value,
    set: (x) => { input.value = clamp(x, +input.min, +input.max); apply(+input.value); },
    range: +input.max - +input.min,
    step: +input.step || 0.1,
    onClick: openEditor,
  });
}

/**
 * A circular pan pot, as on a Logic channel strip. Drag anywhere on it — vertical
 * or horizontal, whichever your hand does — and the arc fills from centre toward
 * the side you are heading. A horizontal slider reads as a position on a line; a
 * pot reads as a position in the room, which is what pan actually is.
 */
function panKnob({ value, onInput }) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('class', 'panpot');
  // Full grey track first, green arc drawn over it from the top centre — the
  // Logic layout. The number lives inside the ring, so the knob needs no label
  // and no separate readout: 0 in the middle with no arc IS "centred".
  const track = document.createElementNS(NS, 'path');
  track.setAttribute('class', 'pottrack');
  const arc = document.createElementNS(NS, 'path');
  arc.setAttribute('class', 'potarc');
  const face = document.createElementNS(NS, 'circle');
  face.setAttribute('cx', 22); face.setAttribute('cy', 22); face.setAttribute('r', 13);
  face.setAttribute('class', 'potface');
  const label = document.createElementNS(NS, 'text');
  label.setAttribute('x', 22); label.setAttribute('y', 22);
  label.setAttribute('class', 'pottext');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('dominant-baseline', 'central');
  svg.append(track, arc, face, label);

  let val = value;
  const SWEEP = 145;                       // degrees either side of top centre
  const R = 18;
  const pt = (deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [22 + Math.cos(a) * R, 22 + Math.sin(a) * R];
  };
  const arcPath = (fromDeg, toDeg) => {
    const [x1, y1] = pt(fromDeg); const [x2, y2] = pt(toDeg);
    const big = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    const sweep = toDeg > fromDeg ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${big} ${sweep} ${x2} ${y2}`;
  };
  track.setAttribute('d', arcPath(-SWEEP, SWEEP));

  const draw = () => {
    const deg = val * SWEEP;
    arc.setAttribute('d', Math.abs(val) < 0.005 ? '' : arcPath(0, deg));
    const n = Math.round(val * 100);
    label.textContent = n === 0 ? '0' : (n > 0 ? '+' : '') + n;
  };
  draw();

  const set = (x) => { val = clamp(x, -1, 1); draw(); onInput(val); };
  let dragging = false, lastX = 0, lastY = 0, moved = 0, fromLabel = false;
  svg.addEventListener('pointerdown', (e) => {
    // The number drags the knob like the rest of the pot does; a click that never
    // moved opens the type-in instead. Dragging over it used to select the text.
    if (holder.querySelector('.typein')) return;
    dragging = true; moved = 0; fromLabel = e.target === label;
    lastX = e.clientX; lastY = e.clientY;
    svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = lastY - e.clientY;
    moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
    lastX = e.clientX; lastY = e.clientY;
    // Whichever axis moved more wins, so neither grip feels wrong. Shift is fine.
    const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * (e.shiftKey ? 0.002 : 0.008);
    set(val + delta);
  });
  const stop = () => {
    if (dragging && fromLabel && moved < 3) openPanEditor();
    dragging = false;
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);
  svg.addEventListener('dblclick', () => set(0));
  svg.title = 'drag to pan · click the number to type · double-click to centre';

  // Type an exact value. The readout lives inside the SVG, so the editor is an HTML
  // input laid over the knob rather than a foreignObject — simpler, and it inherits
  // the same styling as every other type-in on the desk.
  const holder = document.createElement('div');
  holder.className = 'panholder';
  holder.append(svg);
  function openPanEditor() {
    if (holder.querySelector('.typein')) return;
    const box = document.createElement('input');
    box.type = 'text'; box.className = 'typein panin';
    box.value = String(Math.round(val * 100));
    holder.append(box); box.focus(); box.select();
    let closed = false;
    const done = (commit) => {
      if (closed) return;          // blur fires after Enter has already removed it
      closed = true;
      const n = parseFloat(box.value);
      box.remove();
      if (commit && Number.isFinite(n)) set(clamp(n / 100, -1, 1));
    };
    box.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false);
    });
    box.addEventListener('blur', () => done(true));
  }

  // The knob alone: the caller owns the row, because mute and solo share it.
  return { el: holder, set: (x) => { val = x; draw(); } };
}

/** A one-line labelled checkbox — a whole row plus a full-width button was three
 *  lines of card height to say one boolean. */
function checkRow(label, checked, onChange) {
  const row = document.createElement('label');
  row.className = 'checkrow';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = !!checked;
  box.onchange = () => onChange(box.checked);
  const t = document.createElement('span');
  t.textContent = label;
  row.append(box, t);
  return row;
}

function effectsOf(key) {
  const mix = mixFor(trackId);
  // The master opens with a bypassed bus compressor rather than an empty rack. It is
  // seeded on the way OUT rather than stored, so every song gets it — including the
  // ones that already have a saved mix — and no song gains a masterEffects line in
  // mix.js for a chain nobody has touched.
  if (key === '__master') return mix.masterEffects || DEFAULT_MASTER_CHAIN();
  if (key && key.startsWith('__aux:')) return mix.fx?.[key.slice(6)]?.effects || [];
  return mix.lanes[key]?.effects || [];
}

function liveChain(key) {
  if (key === '__master') return Audio.mixer?.masterEffects;
  if (key && key.startsWith('__aux:')) return Audio.mixer?.auxEffects(key.slice(6));
  return Audio.mixer?.lane(key)?.effects;
}

function bypassOn(key, i, on) {
  if (key === '__master') Audio.mixer?.setMasterEffectBypass(i, on);
  else if (key && key.startsWith('__aux:')) Audio.mixer?.setAuxEffectBypass(key.slice(6), i, on);
  else Audio.mixer?.lane(key)?.setEffectBypass(i, on);
}

function targetLabel(key) {
  if (key === '__master') return 'MASTER';
  if (key && key.startsWith('__aux:')) {
    return (AUXES.find((a) => a.id === key.slice(6))?.name || key.slice(6)) + ' return';
  }
  return deskLanes(track.bank, 1).find((l) => l.key === key)?.label || key;
}

function setEffects(key, list) {
  const bpm = track.bank.bpm;
  if (key === '__master') {
    editMix((m) => { if (list.length) m.masterEffects = list; else delete m.masterEffects; }, null);
    Audio.mixer?.setMasterEffects(list, bpm);
  } else if (key && key.startsWith('__aux:')) {
    const id = key.slice(6);
    editMix((m) => {
      m.fx = m.fx || {};
      m.fx[id] = { ...AUX_DEFAULTS[id], ...(m.fx[id] || {}) };
      if (list.length) m.fx[id].effects = list; else delete m.fx[id].effects;
    }, null);
    Audio.mixer?.setAuxEffects(id, list, bpm);
  } else {
    editMix((m) => {
      const L = laneOf(m, key);
      if (list.length) L.effects = list; else delete L.effects;
    }, null);
    Audio.mixer?.lane(key)?.setEffects(list, bpm);
  }
  // Rebuild the rack, not just the summary line: the per-effect bypass buttons live
  // on the strip and have to appear and disappear with the chain.
  buildRack();
}

/**
 * A select row with a live readout, for parameters that are a note division rather
 * than a number — the delay's time, an LFO's rate.
 *
 * Label, select and readout on one line, unlike every other row. The readout used to
 * sit on a head line above the select, which stacked "1.24 Hz" directly on top of
 * "1/4 dotted": two spellings of the same number, one over the other, and a row twice
 * as tall for it. In tempo mode the division is the value, so it gets the line, and
 * what it works out to trails on the right as a reading rather than a second control.
 */
function divisionRow(label, divisions, value, fmt, onChange) {
  const row = document.createElement('div'); row.className = 'row divrow';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  const v = document.createElement('span'); v.className = 'v';
  const sel = document.createElement('select'); sel.className = 'fxsel';
  for (const [name, beats] of Object.entries(divisions)) {
    const o = document.createElement('option');
    o.value = String(beats); o.textContent = name;
    if (Math.abs(beats - value) < 1e-6) o.selected = true;
    sel.append(o);
  }
  const show = () => { v.textContent = fmt(+sel.value); };
  show();
  sel.onchange = () => { show(); onChange(+sel.value); };
  row.append(k, sel, v);
  return row;
}

/** A named choice — a filter's shape, anything else that is a list not a range. */
function optionRow(label, options, value, onChange) {
  const row = document.createElement('div'); row.className = 'row';
  const hd = document.createElement('div'); hd.className = 'head';
  const k = document.createElement('span'); k.className = 'k'; k.textContent = label;
  hd.append(k);
  const sel = document.createElement('select'); sel.className = 'fxsel';
  for (const o of options) {
    const opt = document.createElement('option');
    opt.value = o; opt.textContent = o;
    if (o === value) opt.selected = true;
    sel.append(opt);
  }
  sel.onchange = () => onChange(sel.value);
  row.append(hd, sel);
  return row;
}

/**
 * The strip's OWN device, pinned as the first card in the panel: a send's delay or
 * reverb, the master's limiter. These used to be rows on the strip itself, where
 * they crowded out the return EQ and still had no room to be read — a note division
 * and a damping frequency need more than 132px of column.
 *
 * It is not an insert: no bypass, no close, no dragging. It is what the strip is.
 */
function pinnedCard(key) {
  const card = document.createElement('div');
  card.className = 'device pinned';
  const bar = document.createElement('div'); bar.className = 'devbar';
  const h = document.createElement('h4');
  const badge = document.createElement('span'); badge.className = 'devbadge'; badge.textContent = 'BUILT IN';
  bar.append(h, badge);
  const grid = document.createElement('div'); grid.className = 'devgrid';
  card.append(bar, grid);

  if (key === '__master') {
    h.textContent = 'Master';
    grid.append(checkRow('Limiter', !!mixFor(trackId).limiter, setLimiter));
    return card;
  }

  const def = AUXES.find((a) => a.id === key.slice(6));
  if (!def) return null;
  const cur = fxOf(mixFor(trackId))[def.id];
  h.textContent = def.name;
  const fxSlider = (param, label, opts) => {
    const r = slider({ ...opts, onInput: (x) => editFx(def.id, { [param]: x }, `${def.id}:${param}`) });
    r.label.textContent = label;
    grid.append(r.wrap);
  };

  if (def.type === 'delay') {
    grid.append(divisionRow('TIME', DELAY_DIVISIONS, cur.division,
      // What the line will actually run, not what the division asks for: past a few
      // bars the delay buffer is the limit and the readout should say so.
      (beats) => fmtDelay(syncSeconds(beats, track.bank.bpm)),
      (beats) => editFx(def.id, { division: beats }, `${def.id}:division`)));
    fxSlider('feedback', 'FEEDBACK', {
      min: 0, max: 0.9, step: 0.01, value: cur.feedback,
      reset: AUX_DEFAULTS[def.id].feedback, fmt: (x) => x.toFixed(2),
    });
    fxSlider('tone', 'DAMPING', {
      min: 400, max: 12000, step: 100, value: cur.tone, reset: AUX_DEFAULTS[def.id].tone,
      fmt: (x) => (x >= 1000 ? `${(x / 1000).toFixed(1)}k` : String(x)) + ' Hz',
    });
  } else {
    fxSlider('decay', 'DECAY', {
      min: 0.1, max: 10, step: 0.1, value: cur.decay,
      reset: AUX_DEFAULTS[def.id].decay, fmt: (x) => `${x.toFixed(1)}s`,
    });
    fxSlider('preDelay', 'PRE-DELAY', {
      min: 0, max: 0.2, step: 0.002, value: cur.preDelay,
      reset: AUX_DEFAULTS[def.id].preDelay, fmt: (x) => `${(x * 1000).toFixed(0)}ms`,
    });
    const note = document.createElement('div');
    note.className = 'devnote';
    note.textContent = 'Tone the tail with the return EQ on the strip — that is what a damping '
      + 'control is, and this reverb is a convolution so it has no other.';
    grid.append(note);
  }
  return card;
}

function buildDevices() {
  const rack = $('devrack');
  rack.textContent = '';
  const title = $('devtitle');
  if (!selectedLane) {
    // Still a headed panel with nothing chosen yet — a header that empties itself
    // reads as a rendering fault, where the bare word reads as a panel waiting.
    // The panel stays exactly as the user left it: folding it is their gesture, and
    // one that closed itself when a selection went away would move the whole desk
    // without being asked.
    title.textContent = 'effects';
    return;
  }
  title.textContent = `effects (${targetLabel(selectedLane)})`;   // the CSS uppercases it

  const pinned = selectedLane === '__master' || selectedLane.startsWith('__aux:')
    ? pinnedCard(selectedLane) : null;
  if (pinned) rack.append(pinned);

  const list = effectsOf(selectedLane);
  if (!list.length) {
    rack.append(addCard(true));
    fitDevices();
    return;
  }

  let dragFrom = null;
  rack.addEventListener('dragover', (e) => e.preventDefault());

  list.forEach((entry, i) => {
    const def = EFFECT_BY_ID[entry.id];
    const card = document.createElement('div');
    card.className = 'device' + (entry.bypass ? ' bypassed' : '');
    // Draggable only while the pointer went down on the title bar. With the whole
    // card draggable, dragging a slider inside it started a card drag instead —
    // the control and the container were fighting for the same gesture.
    card.draggable = false;
    card.dataset.idx = String(i);

    const bar = document.createElement('div');
    bar.className = 'devbar';
    const byp = document.createElement('button');
    byp.className = 'devtoggle' + (entry.bypass ? '' : ' on');
    byp.append(powerIcon());
    byp.title = entry.bypass ? 'enable this effect' : 'bypass this effect';
    byp.onclick = () => {
      const next = list.map((e, j) => (j === i ? { ...e, bypass: !e.bypass } : e));
      editMix((m) => storeEffects(m, selectedLane, next), null);
      bypassOn(selectedLane, i, !entry.bypass);
      buildRack();
    };
    const h = document.createElement('h4');
    h.textContent = `${i + 1}. ${def ? def.name : entry.id}`;
    const close = document.createElement('button');
    close.className = 'devclose';
    close.append(closeIcon());
    close.title = `remove ${def ? def.name : entry.id} from this chain`;
    close.onclick = () => {
      setEffects(selectedLane, list.filter((_, j) => j !== i));
      toast(`${def ? def.name : entry.id} removed`);
    };
    bar.append(byp, h, close);
    bar.title = 'drag here to reorder';
    bar.addEventListener('mousedown', (ev) => {
      if (ev.target.closest('button')) return;
      card.draggable = true;
    });
    addEventListener('mouseup', () => { card.draggable = false; }, { once: true });
    card.append(bar);
    const grid = document.createElement('div');
    grid.className = 'devgrid';
    card.append(grid);
    card.addEventListener('dragstart', (e) => {
      dragFrom = i;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      // Firefox will not start a drag without payload.
      e.dataTransfer.setData('text/plain', String(i));
    });
    card.addEventListener('dragend', () => {
      dragFrom = null; card.classList.remove('dragging'); card.draggable = false;
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (dragFrom == null || dragFrom === i) return;
      card.classList.add('dropzone');
    });
    card.addEventListener('dragleave', () => card.classList.remove('dropzone'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('dropzone');
      if (dragFrom == null || dragFrom === i) return;
      const next = list.slice();
      const [moved] = next.splice(dragFrom, 1);
      next.splice(i, 0, moved);
      dragFrom = null;
      setEffects(selectedLane, next);
      toast(`${moved.id} moved to position ${i + 1}`);
    });

    const entryParams = { ...(def?.defaults || {}), ...(entry.params || {}) };
    const synced = (entryParams.sync ?? 1) >= 0.5;
    const patch = (p, tag) => {
      const next = list.map((e, j) => (j === i ? { ...e, params: { ...(e.params || {}), ...p } } : e));
      const link = liveChain(selectedLane)?.[i];
      if (link) link.set(p, track.bank.bpm);
      editMix((m) => storeEffects(m, selectedLane, next), tag);
      list[i] = next[i];
    };

    for (const pname of (def?.params || [])) {
      // Delay time is either a note division or free milliseconds; show whichever
      // mode is active rather than both.
      const rateSynced = (entryParams.rateSync ?? 0) >= 0.5;
      if (pname === 'division' && !synced) continue;
      if (pname === 'delayMs' && synced) continue;
      if (pname === 'rateDivision' && !rateSynced) continue;
      if (pname === 'frequency' && rateSynced && def.params.includes('rateSync')) continue;
      if (pname === 'rateSync') {
        grid.append(checkRow('Tempo Mode', rateSynced,
          (on) => { patch({ rateSync: on ? 1 : 0 }, null); buildDevices(); }));
        continue;
      }
      if (pname === 'rateDivision') {
        grid.append(divisionRow('RATE', RATE_DIVISIONS, entryParams.rateDivision ?? 1,
          // No space before the unit, as fmtDelay has it: on one line beside the
          // select the reading is fighting for its width, and "1/16 triplet" is
          // the wider thing to keep.
          (beats) => `${(track.bank.bpm / (60 * beats)).toFixed(2)}Hz`,
          (beats) => patch({ rateDivision: beats }, `fx:${selectedLane}:${i}:rate`)));
        continue;
      }
      if (pname === 'sync') {
        grid.append(checkRow('Tempo Mode', synced,
          (on) => { patch({ sync: on ? 1 : 0 }, null); buildDevices(); }));
        continue;
      }
      if (pname === 'division') {
        grid.append(divisionRow('TIME', SYNC_DIVISIONS, entryParams.division ?? 0.5,
          (beats) => fmtDelay(syncSeconds(beats, track.bank.bpm)),
          (beats) => patch({ division: beats }, `fx:${selectedLane}:${i}:div`)));
        continue;
      }
      // An effect can override a shared range — `frequency` is an LFO rate on a
      // tremolo and a cutoff on a filter, and one range cannot be both.
      const rng = paramRange(pname, def);
      if (rng.options) {
        grid.append(optionRow(paramLabel(pname), rng.options,
          entryParams[pname] ?? rng.options[0],
          (v) => patch({ [pname]: v }, null)));
        continue;
      }
      const val = entryParams[pname] ?? rng.min;
      const row = slider({
        min: rng.min, max: rng.max, step: rng.step, value: val,
        reset: def.defaults[pname] ?? rng.min,
        fmt: (x) => (rng.unit === 'Hz' && x >= 1000 ? (x / 1000).toFixed(1) + 'k'
          : rng.unit === 's' ? (x * 1000).toFixed(0) + 'ms'
          : x.toFixed(rng.step >= 1 ? 0 : 2)) + (rng.unit && rng.unit !== 's' ? ' ' + rng.unit : ''),
        // Update the live node directly; a full chain rebuild on every drag would
        // retrigger LFOs and click.
        onInput: (x) => patch({ [pname]: x }, `fx:${selectedLane}:${i}:${pname}`),
      });
      row.label.textContent = paramLabel(pname);
      grid.append(row.wrap);
    }

    rack.append(card);
  });
  rack.append(addCard());              // the next slot, at the end of the chain
  fitDevices();
}

/**
 * The panel's height, reserved ONCE for the tallest card the catalogue can produce.
 *
 * It used to be reserved for the tallest card it had happened to show so far, which
 * meant the panel — and the whole rack sitting on top of it — moved a few pixels
 * every time you opened a channel whose effect was taller than anything you had
 * clicked yet. Cards run from 45px (the Gain, which has one control) to 174px (the
 * Advanced Delay), so that is a lot of small jumps before a session settles down.
 *
 * Only ever four rows tall, however long the list: the grid flows into extra COLUMNS
 * past four, so the Multiband Compressor's seventeen controls make a wide card and
 * not a tall one, and the reserved height still holds.
 *
 * Measured rather than written down: row heights move with the typeface, so a
 * constant would clip the tallest card in one font and waste a band of window in
 * another. The probe is the worst shape a card can take — a grid flows into a second
 * column past four rows, and the tallest row is the one stacking a full-width select
 * under its label. That is optionRow, not divisionRow: a division now puts its label,
 * select and readout on one line, so probing with it under-reserves by a row's worth
 * of height on every card and leaves fitDevices to grow the panel a step at a time,
 * which is the jumping this exists to stop.
 */
function reserveDevices() {
  const probe = document.createElement('div');
  probe.className = 'device';
  probe.style.cssText = 'position:absolute; visibility:hidden; left:-9999px; top:0';
  const bar = document.createElement('div');
  bar.className = 'devbar';
  const title = document.createElement('h4');
  title.textContent = 'probe';
  bar.append(title);
  const grid = document.createElement('div');
  grid.className = 'devgrid';
  for (let i = 0; i < 4; i++) {
    grid.append(optionRow('SHAPE', ['lowpass'], 'lowpass', () => {}));
  }
  probe.append(bar, grid);
  document.body.append(probe);
  // Plus the panel header and its padding, with a couple of pixels over: landing
  // exactly on the card's height puts a scrollbar down the panel.
  const need = Math.ceil(h(probe) + h($('devhead')) + 26);
  probe.remove();
  document.documentElement.style.setProperty('--devh', `${Math.min(need, deviceRoom())}px`);
}

/**
 * The reserve is the height in all but exceptional cases; this is the guard for the
 * card that outgrows it anyway — a future effect with taller rows than the probe.
 * It only ever grows, and never past what the window can spare, so it cannot fight
 * capDevices for the same pixels on a short screen.
 */
function fitDevices() {
  requestAnimationFrame(() => {
    // Folded, the rack is display:none and every card measures zero — a measurement
    // taken there would hand the panel back a height of nothing to unfold into.
    if ($('devices').classList.contains('collapsed')) return;
    const rack = $('devrack');
    const cards = [...rack.children].filter((c) => c.classList.contains('device'));
    if (!cards.length) return;
    // The cards are stretched to a common height, so their measured height is the
    // panel's, not their own. Let them stand up for one measurement to find out how
    // tall the tallest actually needs to be.
    rack.style.alignItems = 'flex-start';
    const tallest = Math.max(...cards.map(h));
    rack.style.alignItems = '';
    const need = Math.min(Math.ceil(tallest + h($('devhead')) + 26), deviceRoom());
    const now = h($('devices'));
    if (need > now) {
      document.documentElement.style.setProperty('--devh', `${need}px`);
      fitStrips();
    }
  });
}

// The catalogue, grouped for the picker. Anything a future effect adds that is not
// listed here still shows up, under Other — a new effect appearing nowhere would be
// a worse bug than one appearing in the wrong column.
const EFFECT_GROUPS = [
  ['Level & EQ', ['gain', 'peq', 'filter']],
  ['Delay', ['chandelay', 'delay', 'pingpong']],
  ['Modulation', ['chorus', 'phaser', 'tremolo', 'vibrato', 'autofilter', 'autowah', 'autopanner']],
  ['Drive', ['distortion', 'chebyshev']],
  ['Space & stereo', ['reverb', 'widener', 'shifter', 'pitch']],
  ['Dynamics', ['compressor', 'msComp', 'mbComp']],
];

function addEffect(id, at = null) {
  if (!id || !selectedLane) return;
  const cur = effectsOf(selectedLane);
  if (cur.length >= MAX_EFFECTS) {
    toast(`${MAX_EFFECTS} effects is the limit on one strip — remove one first`);
    return;
  }
  const next = [...cur];
  if (at == null) next.push({ id, params: {} });
  else next.splice(clamp(at, 0, next.length), 0, { id, params: {} });
  setEffects(selectedLane, next);
  toast(`${EFFECT_BY_ID[id].name} added to ${targetLabel(selectedLane)}`);
}

// One effect's settings, for copying onto another of the same kind. Separate from
// the strip clipboard: a Parametric EQ you have dialled in is worth moving on its
// own, without the channel it happens to sit on.
let fxClipboard = null;

/** The effect catalogue as a panel: grouped, and priced with its measured cost. */
function openPicker({ at = null, anchor = null, x = null, y = null } = {}) {
  const el = $('fxpicker');
  el.textContent = '';
  const placed = new Set();
  const column = (title, ids) => {
    const list = ids.map((id) => EFFECT_BY_ID[id]).filter(Boolean);
    if (!list.length) return;
    const g = document.createElement('div');
    g.className = 'fxgroup';
    const h5 = document.createElement('h5');
    h5.textContent = title;
    g.append(h5);
    for (const def of list) {
      placed.add(def.id);
      const b = document.createElement('button');
      const n = document.createElement('span');
      n.textContent = def.name;
      const c = document.createElement('span');
      c.className = 'cost';
      c.textContent = `${(def.cost ?? 0).toFixed(2)}%`;
      b.append(n, c);
      b.title = `${def.name} — about ${(def.cost ?? 0).toFixed(2)}% of one core each`;
      b.onclick = () => { closeMenu(); addEffect(def.id, at); };
      g.append(b);
    }
    el.append(g);
  };
  for (const [title, ids] of EFFECT_GROUPS) column(title, ids);
  column('Other', EFFECTS.filter((e) => !placed.has(e.id)).map((e) => e.id));

  el.classList.add('show');
  // Anchored to the button, pinned inside the window: the panel is wider than the
  // gap between the button and the right-hand edge.
  // Where the pointer is, when the pointer is what opened it; otherwise above the
  // button that did. Either way it is pulled back inside the window.
  const r = el.getBoundingClientRect();
  const from = (anchor || $('devrack')).getBoundingClientRect();
  const left = x != null ? x : from.right - r.width;
  const top = y != null ? y : from.top - r.height - 6;
  el.style.left = `${Math.max(6, Math.min(left, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.max(6, Math.min(top, innerHeight - r.height - 6))}px`;
}

/**
 * The empty slot at the end of a chain: click it to add the next effect.
 *
 * `first` is the empty rack — nothing added yet, so the square is alone in the panel
 * and wears its plus faintly rather than waiting for the pointer to find it.
 */
function addCard(first = false) {
  const btn = document.createElement('button');
  btn.className = `devaddcard${first ? ' first' : ''}`;
  const full = effectsOf(selectedLane).length >= MAX_EFFECTS;
  btn.disabled = full;
  btn.title = full ? `${MAX_EFFECTS} effects is the limit on one strip`
    : `add an effect to ${targetLabel(selectedLane)}`;
  btn.onclick = (ev) => {
    ev.stopPropagation();
    if (btn.disabled) return;
    if ($('fxpicker').classList.contains('show')) { closeMenu(); return; }
    closeMenu();
    openPicker({ anchor: btn, x: ev.clientX, y: ev.clientY });
  };
  return btn;
}
$('devfold').onclick = () => {
  const folded = $('devices').classList.toggle('collapsed');
  $('devfold').classList.toggle('folded', folded);
  $('devfold').title = folded ? 'show the effects panel' : 'collapse the effects panel';
  fitStrips();                 // the strips just got a panel's worth of height back
};



function selectLane(key) {
  selectedLane = key;
  localStorage.setItem(LANE_KEY, key);
  for (const el of document.querySelectorAll('.strip[data-lane]')) {
    el.classList.toggle('selected', el.dataset.lane === key);
  }
  for (const el of document.querySelectorAll('.arrrow')) {
    el.classList.toggle('sel', el.dataset.lane === key);
  }
  buildDevices();
}

// ---- arrangement -----------------------------------------------------------
// One row per instrument, one cell per bar, shaded by how busy that bar is. This
// is the answer to "there is a lane called crash but I have no idea where it
// sounds" — you can see it, and click straight to it.
let arrCells = [];
// The one bar you clicked — a lane and a bar number, not a column. The playhead has
// the timeline to itself; this marks what you picked.
let selectedBar = null;

function markBar(key = selectedBar?.key, bar = selectedBar?.bar) {
  selectedBar = key != null && bar != null ? { key, bar } : null;
  for (const el of document.querySelectorAll('.arrbar.sel')) el.classList.remove('sel');
  if (!selectedBar) return;
  document.querySelector(`.arrrow[data-lane="${CSS.escape(key)}"]`)
    ?.querySelectorAll('.arrbar')[bar]?.classList.add('sel');
}

/**
 * What a lane actually plays in one cell, step by step: 'A2 · — · A2 · C3'. The
 * shading says how busy a bar is; this says what is in it, which is the difference
 * between finding the bar and knowing whether the bass is on the root.
 *
 * Percussion is a hit or nothing, melodic lanes are frequencies, and chord lanes
 * are arrays of them — all three come back as one line you can read.
 */
function cellSteps(row, cell) {
  return (row.steps?.[cell] || []).map((v) => {
    if (v === true) return '●';
    if (Array.isArray(v)) return v.map(noteName).filter(Boolean).join('+') || '·';
    if (typeof v === 'number' && v > 0) return noteName(v) || '·';
    return '·';
  });
}

const cellNotes = (row, cell) => cellSteps(row, cell).join(' ');

/**
 * One lightness per cell, averaged over the run of playing beats it belongs to, so
 * a contiguous stretch draws as a single even block. Shading each cell by its own
 * density instead made a region that plays throughout look like a bar chart of
 * itself, which says more about the sixteenths than about the arrangement.
 */
function regionShades(density) {
  const out = new Array(density.length).fill(0);
  for (let i = 0; i < density.length;) {
    if (!(density[i] > 0)) { i++; continue; }
    let j = i;
    let sum = 0;
    while (j < density.length && density[j] > 0) { sum += density[j]; j++; }
    const shade = 26 + Math.min(1, (sum / (j - i)) * 1.6) * 30;
    out.fill(shade, i, j);
    i = j;
  }
  return out;
}

/** Nearest MIDI semitone, for laying frequencies out on a keyboard. */
const semitoneOf = (hz) => Math.round(12 * Math.log2(hz / 440) + 69);

/**
 * A click on the arrangement opens the bar it landed in as a piano roll: sixteenths
 * across, pitch up the side. A list of the four notes under the pointer answered
 * "what is on this beat"; a bar of roll answers "what is the line doing", which is
 * the question you actually have when you are looking at a bar.
 *
 * Percussion has no pitch, so those lanes get the same grid one row high.
 */
function showBar(x, y, row, bar, perBar) {
  const steps = [];
  for (let c = bar * perBar; c < (bar + 1) * perBar; c++) steps.push(...(row.steps?.[c] || []));
  const el = $('notepop');
  el.textContent = '';
  el.style.setProperty('--lane', laneColour(row.key));
  const head = document.createElement('div');
  head.className = 'ctxhead';
  head.textContent = `${row.label} · bar ${bar + 1}`;
  el.append(head);

  // Which pitches this bar uses. A contiguous run of semitones is a real keyboard
  // and reads like one; a line that leaps more than two octaves would be mostly
  // empty rows, so that falls back to just the notes it plays.
  const semis = [];
  for (const v of steps) {
    if (typeof v === 'number' && v > 0) semis.push(semitoneOf(v));
    else if (Array.isArray(v)) for (const f of v) if (f > 0) semis.push(semitoneOf(f));
  }
  const uniq = [...new Set(semis)].sort((a, b) => b - a);
  let pitches = uniq;
  if (uniq.length) {
    const span = uniq[0] - uniq[uniq.length - 1];
    if (span <= 23) {
      pitches = [];
      for (let s = uniq[0]; s >= uniq[uniq.length - 1]; s--) pitches.push(s);
    }
  }

  const roll = document.createElement('div');
  roll.className = 'roll';
  const drawRow = (label, hit, isTonic) => {
    const r = document.createElement('div');
    r.className = 'rollrow';
    const n = document.createElement('span');
    n.className = 'rolln' + (isTonic ? ' tonic' : '');
    n.textContent = label;
    const cells = document.createElement('div');
    cells.className = 'rollcells';
    for (let i = 0; i < steps.length; i++) {
      const c = document.createElement('div');
      c.className = 'rollcell'
        + (i % 4 === 0 && i ? ' downbeat' : '')
        + (hit(i) ? ' on' : '');
      cells.append(c);
    }
    r.append(n, cells);
    roll.append(r);
  };

  if (pitches.length) {
    for (const s of pitches) {
      drawRow(noteName(440 * 2 ** ((s - 69) / 12)) || '', (i) => {
        const v = steps[i];
        if (typeof v === 'number' && v > 0) return semitoneOf(v) === s;
        if (Array.isArray(v)) return v.some((f) => f > 0 && semitoneOf(f) === s);
        return false;
      }, s % 12 === 0);
    }
  } else if (steps.some((v) => v === true)) {
    drawRow('hit', (i) => steps[i] === true);       // percussion has no pitch to plot
  } else {
    const quiet = document.createElement('div');
    quiet.className = 'rollquiet';
    quiet.textContent = 'silent in this bar';
    roll.append(quiet);
  }
  el.append(roll);

  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.classList.add('show');
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(4, Math.min(x + 8, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.max(4, Math.min(y + 8, innerHeight - r.height - 6))}px`;
}

function buildArrangement() {
  const grid = $('arrgrid');
  grid.textContent = '';
  arrCells = [];
  // Beat resolution where there is room for it, bar resolution on long songs —
  // 256 cells across a row is still readable, 1024 is a smear.
  const bars = songShape().order.length * 2;
  const perBar = bars * 4 <= 300 ? 4 : 1;
  // Every lane, whatever the mixer is showing: the arrangement is the song, and a
  // song does not lose its drums because you are looking at the melody.
  const desk = deskLanes(track.bank, 1).map((l) => l.key);
  const rows = laneActivity(track.bank, 1, perBar);
  rows.sort((a, b) => desk.indexOf(a.key) - desk.indexOf(b.key));

  rows.forEach((row) => {
    const el = document.createElement('div');
    el.className = 'arrrow';
    el.dataset.lane = row.key;
    el.style.setProperty('--lane', laneColour(row.key));
    // The track header: mute and solo on the far left as Logic has them, then the
    // name. Same two buttons as the strip, same state — see muteSoloPair.
    const header = document.createElement('div');
    header.className = 'arrhead-cell';
    // Desk order, numbered — the way you refer to a track out loud ("mute 3") and
    // the order the strips run in below.
    const num = document.createElement('span');
    num.className = 'arrnum';
    num.textContent = String(laneNumbers.get(row.key) ?? '');
    const btns = document.createElement('div');
    btns.className = 'arrbtns';
    btns.append(...muteSoloPair(row.key, row.label));
    const icon = groupIcon(row.group);
    const name = document.createElement('div');
    name.className = 'arrname';
    name.textContent = row.label;
    // No title here: markClipped() puts one on only if the name is actually cut off.
    name.onclick = () => selectLane(row.key);
    header.append(num, btns, icon, name);
    const bars = document.createElement('div');
    bars.className = 'arrbars';
    // Runs of playing beats are one region, not a row of chips: a lane that plays
    // right through a bar should look like a bar of that lane. The shade comes from
    // the run's average density so the block is one colour, and the 1px gutter
    // between cells is bridged rather than removed — the cells have to stay the same
    // width in every row or the columns stop lining up with the ruler.
    const runShade = regionShades(row.density);
    // A whole bar is the unit you pick, whatever resolution the shading is drawn at:
    // the cells inside a bar are a picture of it, and the bar is the target.
    const barCount = Math.ceil(row.density.length / perBar);
    for (let bar = 0; bar < barCount; bar++) {
      const box = document.createElement('div');
      box.className = 'arrbar';
      // A bar this lane plays in is tinted its own colour end to end, so the rests
      // inside it read as part of the bar rather than as the gap between two bars.
      // The tint also fills the gutters between beats, which is what makes a bar
      // with a hit on every other beat still look like one bar.
      const playing = row.density.slice(bar * perBar, (bar + 1) * perBar).some((v) => v > 0);
      if (playing) box.style.background = `hsl(${laneHue(row.key)} 30% 15%)`;
      for (let beat = 0; beat < perBar; beat++) {
        const cell = bar * perBar + beat;
        const d = row.density[cell] ?? 0;
        const openL = d > 0 && cell > 0 && row.density[cell - 1] > 0;
        const openR = d > 0 && row.density[cell + 1] > 0;
        const c = document.createElement('div');
        // The downbeat tick would cut a region in half, so it only marks bars that
        // start something — a rest, or the first beat of a region.
        c.className = 'arrcell' + (perBar > 1 && beat === 0 && !openL ? ' barstart' : '');
        if (d > 0) {
          // Hue identifies the channel, lightness carries density — so a busy hat bar
          // reads brighter than a single hit without changing what colour "hats" is.
          const col = `hsl(${laneHue(row.key)} 58% ${runShade[cell].toFixed(0)}%)`;
          c.style.background = col;
          if (openR) c.style.boxShadow = `1px 0 0 0 ${col}`;
          c.style.borderRadius = `${openL ? 0 : 3}px ${openR ? 0 : 3}px ${openR ? 0 : 3}px ${openL ? 0 : 3}px`;
        } else if (playing) {
          c.style.background = 'transparent';        // the bar's own tint shows through
        }
        box.append(c);
      }
      const where = `${row.label} · bar ${bar + 1}`;
      const notes = Array.from({ length: perBar }, (_, b) => cellNotes(row, bar * perBar + b)).join('  ');
      box.title = `${where}\n${notes}`;
      const at = bar * 16;
      box.onclick = (ev) => {
        jumpTo(at);
        selectLane(row.key);
        markBar(row.key, bar);
        // What is actually played here, not just how much of it. The grid says a
        // lane is busy in this bar; this shows the bar.
        showBar(ev.clientX, ev.clientY, row, bar, perBar);
        $('section').textContent = `${where} — ${notes}`;
        $('section').title = notes;
      };
      // Same as the timeline: double-click plays from what you are pointing at.
      box.ondblclick = () => { jumpTo(at, { start: true }); toast(`playing from ${where}`); };
      bars.append(box);
    }
    el.append(header, bars);
    grid.append(el);
    arrCells.push({ key: row.key, bars });
  });
  markBar();                    // the rows are new; the parked bar is not
}

function setArrangeCollapsed(on) {
  const arrange = $('arrange');
  // Outside the early return, so the splitter always matches the fold even when the
  // fold itself has not changed: there is nothing to drag the height of when the
  // arrangement is shut, and a handle for it says there is.
  $('arrsplit').classList.toggle('hidden', on);
  if (arrange.classList.contains('collapsed') === on) return;
  arrange.classList.toggle('collapsed', on);
  $('arrfold').classList.toggle('folded', on);
  $('arrfold').title = on ? 'show the arrangement' : 'collapse the arrangement';
}

$('arrfold').onclick = () => {
  setArrangeCollapsed(!$('arrange').classList.contains('collapsed'));
  fitStrips();
};

// The mixer folds like the panels above and below it. The family switches stay in
// the header while it is folded — they are what you are about to unfold it for.
const MIXER_KEY = 'mash-mixer-rack-folded';
function setMixerFolded(on, refit = true) {
  $('rackwrap').classList.toggle('collapsed', on);
  $('mixhead').classList.toggle('folded', on);
  $('mixfold').classList.toggle('folded', on);
  $('mixfold').title = on ? 'show the mixer' : 'collapse the mixer';
  localStorage.setItem(MIXER_KEY, on ? '1' : '0');
  if (refit) fitStrips();
}
$('mixfold').onclick = () => setMixerFolded(!$('rackwrap').classList.contains('collapsed'));
setMixerFolded(localStorage.getItem(MIXER_KEY) === '1', false);

// ---- meters + transport readout --------------------------------------------
let peakSeen = 0;
// Meter ballistics. The bar rises instantly and falls at a rate you can read — a
// meter that tracks the signal exactly flickers and tells you nothing about a hit
// that has already gone. The peak line holds where the loudest moment was, which is
// the number you are actually mixing against.
const METER_FALL = 55;        // percent of the scale per second
const PEAK_HOLD = 1400;       // ms the line sits before it starts sliding down
const PEAK_FALL = 30;         // percent per second once it does
let meterAt = 0;

function tick() {
  const now = performance.now();
  const dt = meterAt ? Math.min(0.25, (now - meterAt) / 1000) : 0;
  meterAt = now;
  if (Audio.mixer) {
    for (const mt of meters) {
      const v = mt.key === '__master' ? Audio.mixer.masterLevel()
        : mt.key.startsWith('__aux:') ? Audio.mixer.auxLevel(mt.key.slice(6))
        : Audio.mixer.lane(mt.key)?.level();
      const lin = typeof v === 'number' ? v : 0;
      // dB scale bottoming at -48 reads far better than linear for quiet lanes.
      const db = 20 * Math.log10(Math.max(1e-6, lin));
      const pos = clamp((db + 48) / 48 * 100, 0, 100);
      mt.shown = Math.max(pos, (mt.shown ?? 0) - METER_FALL * dt);
      mt.fill.style.height = `${mt.shown}%`;
      if (pos >= (mt.held ?? 0)) { mt.held = pos; mt.heldAt = now; }
      else if (now - (mt.heldAt || 0) > PEAK_HOLD) {
        mt.held = Math.max(mt.shown, mt.held - PEAK_FALL * dt);
      }
      mt.peak.style.bottom = `${mt.held || 0}%`;
      mt.peak.style.opacity = mt.held > 0.5 ? '1' : '0';
      mt.meter.classList.toggle('clip', lin >= 1);
      if (mt.key === '__master' && lin > peakSeen) peakSeen = lin;
    }
  }
  const beat = Audio.songBeat();
  if (beat != null && track) {
    const { order, spb, totalSteps, loopSecs } = songShape();
    // songBeat() backs off the scheduler's lookahead, so this is what is being
    // HEARD, not what has been queued — the playhead has to match the ear.
    // Two lags pull the line the other way from the audio's own: a note's attack ramp
    // means it is HEARD a few milliseconds after it is scheduled, and the frame this
    // is painted in reaches the glass a frame or two after that. Both put the line
    // behind the music, which is what "the playhead is early" looks like. phOffset is
    // milliseconds forward — positive moves it right.
    const shown = (beat * 4) + (phOffset / 1000) / spb;
    const heardStep = (shown % totalSteps + totalSteps) % totalSteps;
    const frac = heardStep / totalSteps;
    $('playhead').style.left = (frac * 100) + '%';
    $('tnow').textContent = `${fmtTime(heardStep * spb)}/${fmtTime(loopSecs)}`;
    $('barnow').textContent = `${Math.floor(heardStep / 16) + 1}/${totalSteps / 16}`;
    $('pos').textContent = `beat ${(beat % 4 + 1).toFixed(1)}`;
  }
  $('peakinfo').textContent = peakSeen > 0
    ? `master peak ${(20 * Math.log10(peakSeen)).toFixed(1)} dBFS${peakSeen >= 1 ? '  ** CLIPPING **' : ''}` : '';
  requestAnimationFrame(tick);
}

// A rough live load estimate: the engine's own measured cost plus every active
// effect's. Deliberately approximate — a phone is not this machine — but the
// ratios hold, and it is enough to notice that four Phasers cost more than the
// entire rest of the song.
function updateCpu() {
  const mix = mixFor(trackId);
  let total = ENGINE_BASE_COST;
  const counts = [];
  for (const [key, L] of Object.entries(mix.lanes || {})) {
    for (const e of (L.effects || [])) {
      if (e.bypass) continue;
      const def = EFFECT_BY_ID[e.id];
      if (def) { total += def.cost || 0.1; counts.push(def.name); }
    }
  }
  if ((mix.lanes && Object.values(mix.lanes).some((L) => (L.send?.reverb ?? 0) > 0))) total += 0.73;
  const el = $('cpu');
  el.textContent = `~${total.toFixed(0)}%`;   // the caption beside it says CPU
  el.title = `${counts.length} active effect${counts.length === 1 ? '' : 's'}`
    + (counts.length ? `: ${counts.join(', ')}` : '')
    + `\nEngine alone is about ${ENGINE_BASE_COST}%. Rough estimate on a desktop; audio runs on its own thread.`;
  el.classList.toggle('dirty', total > 45);   // a readout, not a label — see the header CSS
}

function updateStatus() {
  updateCpu();
  const d = isDirty(trackId);
  $('status').textContent = d ? 'unsaved changes' : 'saved';
  $('status').className = d ? 'dirty' : 'label';
}

// Everything that is not part of mixing lives behind one button — see #moremenu.
$('more').onclick = (ev) => {
  ev.stopPropagation();
  const el = $('moremenu');
  if (el.classList.contains('show')) { closeMenu(); return; }
  closeMenu();
  el.classList.add('show');
  const from = $('more').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(6, Math.min(from.left, innerWidth - r.width - 6))}px`;
  el.style.top = `${from.bottom + 6}px`;
};
// A button in the menu does its thing and the menu goes away; the font picker is a
// setting you might change twice in a row, so it stays open.
$('moremenu').addEventListener('click', (ev) => {
  if (ev.target.closest('button')) closeMenu();
});

// ---- typeface --------------------------------------------------------------
// A desk you stare at for hours may as well be set in something you like. Only
// fonts actually on this machine are offered: a list of names that quietly fall
// back to the same default is a list of one font wearing ten labels.
const FONTS = [
  ['System mono', 'ui-monospace, SFMono-Regular, Menlo, monospace'],
  ['SF Mono', '"SF Mono", ui-monospace, monospace'],
  ['Menlo', 'Menlo, monospace'],
  ['Monaco', 'Monaco, monospace'],
  ['JetBrains Mono', '"JetBrains Mono", monospace'],
  ['IBM Plex Mono', '"IBM Plex Mono", monospace'],
  ['Fira Code', '"Fira Code", monospace'],
  ['Source Code Pro', '"Source Code Pro", monospace'],
  ['Iosevka', 'Iosevka, monospace'],
  ['Avenir Next', '"Avenir Next", sans-serif'],
  ['Helvetica Neue', '"Helvetica Neue", sans-serif'],
  ['Futura', 'Futura, sans-serif'],
  ['Optima', 'Optima, sans-serif'],
];

/**
 * Is this family really installed? document.fonts.check answers yes for names it
 * has never heard of, so this measures instead: a string set in the family and in a
 * generic comes out the same width only when the family fell back to the generic.
 */
const fontProbe = document.createElement('canvas').getContext('2d');
function fontInstalled(name) {
  const probe = 'mmmMMMwwWWiil1@%#';
  for (const generic of ['monospace', 'serif']) {
    fontProbe.font = `72px ${generic}`;
    const base = fontProbe.measureText(probe).width;
    fontProbe.font = `72px "${name}", ${generic}`;
    if (Math.abs(fontProbe.measureText(probe).width - base) > 0.5) return true;
  }
  return false;
}

const FONT_KEY = 'mash-mixer-font';
const fontSel = $('font');
for (const [name, stack] of FONTS) {
  if (name !== 'System mono' && !fontInstalled(name.replace(/"/g, ''))) continue;
  const o = document.createElement('option');
  o.value = stack; o.textContent = name;
  fontSel.append(o);
}
const savedFont = localStorage.getItem(FONT_KEY);
if (savedFont && [...fontSel.options].some((o) => o.value === savedFont)) fontSel.value = savedFont;
const applyFont = () => {
  document.documentElement.style.setProperty('--font', fontSel.value);
  localStorage.setItem(FONT_KEY, fontSel.value);
  // Row heights move with the typeface, so the strips and the panel's reserved
  // height both have to be measured again.
  requestAnimationFrame(() => { reserveDevices(); fitStrips(); });
};
applyFont();
fontSel.onchange = () => { applyFont(); toast(`set in ${fontSel.selectedOptions[0].textContent}`); };

// How far behind the graph the speakers actually are, beyond what the browser owns
// up to. songBeat() subtracts ctx.outputLatency already; Bluetooth, an interface
// with its own buffer, or a device that simply reports zero are what this is for.
// Remembered per machine, because that is what it is a property of.
// About three frames: the attack ramp on a note plus the trip from a rAF callback to
// the glass. Set by eye against a kick, and it is a default rather than a constant —
// a different screen or a different device wants a different number.
const PH_KEY = 'mash-mixer-playhead-ms';
const PH_DEFAULT = 50;
const storedPh = localStorage.getItem(PH_KEY);
let phOffset = storedPh == null || storedPh === '' ? PH_DEFAULT : (Number(storedPh) || 0);
const phInput = $('phoffset');
phInput.value = String(phOffset);

function setPhOffset(ms) {
  phOffset = clamp(Math.round(ms), -300, 300);
  phInput.value = String(phOffset);
  localStorage.setItem(PH_KEY, String(phOffset));
}
phInput.oninput = () => {
  // An empty box is someone part-way through typing a number, not a request for
  // zero. Storing 0 there quietly parks the line fifty milliseconds behind the
  // music with nothing on screen to say why — and it is remembered, so it stays
  // wrong across reloads.
  if (phInput.value.trim() === '') return;
  setPhOffset(Number(phInput.value) || 0);
};
phInput.onblur = () => { phInput.value = String(phOffset); };

// Tempo you can drag, for listening — half speed to hear what a reverb is really
// doing, or up ten to check the kick still fits. It is never saved: the bpm belongs
// to the song, not to its mix, and a desk that quietly rewrote it would change what
// the game plays. Click puts the song's own tempo back.
let tempoOverride = null;
const deskTempo = () => tempoOverride ?? track?.bank?.bpm ?? 120;
function showTempo() {
  const el = $('bpm');
  el.textContent = String(Math.round(deskTempo()));
  el.classList.toggle('tweaked', tempoOverride != null);
  el.parentElement.title = tempoOverride != null
    ? `Auditioning at ${Math.round(tempoOverride)} bpm — click to go back to ${track.bank.bpm}. Tempo is not saved with the mix.`
    : 'Drag to change the tempo for listening — it is not saved with the mix';
}
function setDeskTempo(v) {
  const bpm = clamp(Math.round(v), 40, 220);
  tempoOverride = bpm === track?.bank?.bpm ? null : bpm;
  Audio.bpm = bpm;
  Audio.setDelay({});                 // the echo is tempo-synced, so it follows
  Audio.mixer?.retune(bpm);           // and so is every division-based insert
  showTempo();
  buildTimeline();                    // the clock and the song length move with it
}
dragNumber($('bpm'), {
  value: deskTempo,
  set: setDeskTempo,
  range: 80, step: 1,
  onClick: () => { if (tempoOverride != null) { setDeskTempo(track.bank.bpm); toast(`back to ${track.bank.bpm} bpm`); } },
});

// ---- wiring ----------------------------------------------------------------
// Loading a song is a thing you do a few times an hour, so it does not need a
// control sitting open on the header; what you DO need at all times is which song
// you are on, and that reads better in the footer where it has room for its name.
const SONG_GROUPS = [
  ['themes', 'theme'],
  ['cabinets', 'cabinet'],
  ['shop auditions', 'audition'],
  ['imported', 'imported'],
];

function selectSong(id) {
  peakSeen = 0;
  loadTrack(id);
  $('nowsong').textContent = track.title;
  localStorage.setItem(SONG_KEY, id);
}

function openSongs() {
  const el = $('songpicker');
  el.textContent = '';
  const tracks = listTracks();
  for (const [title, group] of SONG_GROUPS) {
    const list = tracks.filter((t) => t.group === group);
    if (!list.length) continue;
    const col = document.createElement('div');
    col.className = 'fxgroup';
    const h5 = document.createElement('h5');
    h5.textContent = title;
    col.append(h5);
    for (const t of list) {
      const b = document.createElement('button');
      b.className = t.id === trackId ? 'on' : '';
      const name = document.createElement('span');
      name.textContent = t.title;
      const id = document.createElement('span');
      id.className = 'cost';
      id.textContent = t.id;
      b.append(name, id);
      b.title = `${t.title} — ${t.id}`;
      b.onclick = () => { closeMenu(); selectSong(t.id); toast(`loaded ${t.title}`); };
      col.append(b);
    }
    el.append(col);
  }
  el.classList.add('show');
  const from = $('songbtn').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(6, Math.min(from.left, innerWidth - r.width - 6))}px`;
  el.style.top = `${Math.min(from.bottom + 6, innerHeight - r.height - 6)}px`;
}

$('songbtn').onclick = (ev) => {
  ev.stopPropagation();
  if ($('songpicker').classList.contains('show')) { closeMenu(); return; }
  closeMenu();
  openSongs();
};

// Where playback last began, so Stop has somewhere to go back to. Pause holds where
// it is; Stop returns to the start of the take. That pair is the reason there are
// four buttons instead of one that changes its mind.
let startedAt = 0;

/** Start or stop the transport, optionally from a given step. */
function setPlaying(on, fromStep = null) {
  playing = on;
  $('play').classList.toggle('on', playing);
  $('pause').disabled = !playing;
  peakSeen = 0;
  if (playing) {
    // Resume where the playhead was parked, not back at the top.
    const at = fromStep != null ? fromStep : parkedAt;
    startedAt = at;
    Audio.setBank(track.bank, mixFor(trackId));
    applyToEngine(mixFor(trackId));
    Audio.step = at;
    applyLoop(at);
  } else {
    // Exactly where the playhead is, so Play carries on from here; the loop region
    // still snaps to the bar that contains it.
    const { totalSteps } = songShape();
    parkedAt = ((Audio.step % totalSteps) + totalSteps) % totalSteps;
    loopAnchor = Math.floor(parkedAt / 16) * 16;
    Audio.setLoop();
    Audio.setBank(null);
    // setBank(null) is the game's "no song" state: applyMix zeroes every send and
    // clears the dry taps, and with no entry to read it never puts them back, so
    // pruneAuxes then unhooks the returns. Harmless in the game, which only reaches
    // that state on the way out of a song — but the desk sits in it every time you
    // pause, and the sends came back only when something re-applied the mix, which
    // made them look like they needed an A/B to wake up. The engine should always
    // carry the mix you are looking at, playing or not.
    applyToEngine(mixFor(trackId));
  }
}
$('play').onclick = () => { if (!playing) setPlaying(true); };
$('pause').onclick = () => { if (playing) setPlaying(false); };
$('stop').onclick = () => {
  if (playing) setPlaying(false);
  jumpTo(startedAt);
  toast(`stopped at bar ${Math.floor(startedAt / 16) + 1}`);
};
$('playstart').onclick = () => { jumpTo(0, { start: true }); };
$('clearsolo').onclick = clearAllSolo;
$('pause').disabled = true;

// Lives on the master's pinned card, not in the toolbar: it is a property of the
// master strip, and the toolbar is for what you touch WHILE mixing.
function setLimiter(on) {
  editMix((m) => { m.limiter = on; });
  Audio.mixer?.setLimiter(on);
  buildRack();
}

// Hold to hear what is on disk, release to come back to the draft.
const abDown = () => { if (abHeld) return; abHeld = true; $('ab').classList.add('on'); applyToEngine(saved[trackId] || emptyMix()); };
const abUp = () => { if (!abHeld) return; abHeld = false; $('ab').classList.remove('on'); applyToEngine(mixFor(trackId)); };
$('ab').addEventListener('mousedown', abDown);
$('ab').addEventListener('mouseup', abUp);
$('ab').addEventListener('mouseleave', abUp);

$('revert').onclick = () => {
  if (!isDirty(trackId)) { toast('nothing to revert — already matches the saved mix'); return; }
  pushUndo(null);
  delete draft[trackId];
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  buildRack(); applyToEngine(mixFor(trackId)); updateStatus();
  toast(`${track.title} reverted to the saved mix — ⌘Z to undo`);
};

$('undo').onclick = undo;

// Keyboard shortcuts. Everything here is something you reach for repeatedly while
// balancing; anything you do once per session stays a button.
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // Never steal keys from a control the user is actually typing or dragging in.
  if (e.target.matches('input, select, textarea')) return;
  const lanes = deskLanes(track.bank, 1);
  const idx = lanes.findIndex((l) => l.key === selectedLane);
  const key = e.key.toLowerCase();

  if (e.code === 'Space') { e.preventDefault(); (playing ? $('pause') : $('play')).click(); return; }
  if (key === 'l') { $('looptoggle').click(); return; }
  if ('1248'.includes(e.key)) { $('loopbars').value = e.key; $('loopbars').onchange(); return; }
  if (key === '0') { $('loopbars').value = '0'; $('loopbars').onchange(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault();
    const { totalSteps } = songShape();
    const step = Audio.step + (e.key === 'ArrowRight' ? 16 : -16);
    Audio.setLoop();
    Audio.step = Math.max(0, step);
    Audio.nextTime = Audio.ctx.currentTime + 0.03;
    applyLoop(Audio.step);
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (!lanes.length) return;
    const next = idx === -1 ? 0 : (idx + (e.key === 'ArrowDown' ? 1 : -1) + lanes.length) % lanes.length;
    selectLane(lanes[next].key);
    return;
  }
  // Line up the playhead with the music, by eye, while the song runs. The number
  // this nudges is the only part of the playhead that cannot be computed: how long
  // a frame takes to reach the glass is a property of the screen, and a display that
  // holds two or three frames leaves the line trailing the kick with everything else
  // about it correct. Under the hand and against the music beats opening a menu,
  // typing a guess, and listening again.
  if (e.key === '[' || e.key === ']') {
    setPhOffset(phOffset + (e.key === ']' ? 10 : -10));
    toast(`playhead ${phOffset > 0 ? '+' : ''}${phOffset}ms — ] if it still lags, [ if it runs ahead`);
    return;
  }
  if (!selectedLane) return;
  const strip = document.querySelector(`.strip[data-lane="${CSS.escape(selectedLane)}"]`);
  if (key === 'm') { strip?.querySelector('.mutebtn')?.click(); return; }
  if (key === 's') { strip?.querySelector('.solobtn')?.click(); return; }
  if (key === 'r') { resetTarget(selectedLane); return; }
  if (key === 'b') {                      // bypass every effect on the selected channel
    const list = effectsOf(selectedLane);
    if (!list.length) return;
    const anyOn = list.some((x) => !x.bypass);
    setEffects(selectedLane, list.map((x) => ({ ...x, bypass: anyOn })));
    toast(anyOn ? 'all effects bypassed' : 'all effects on');
  }
});

// The song as a WAV. The server renders it offline through the real engine with the
// mix currently on the desk — draft included, so you can hear a change before you
// decide to save it — and writes dist/<slug>-mix.wav at unity.
//
// It is a wait, not a click: the render is offline and the first one has to start
// the server's headless Chromium. Hence a toast that stays up until it is done, and
// a button that will not take a second job while the first is running. Everything
// else on the desk keeps working meanwhile; the render happens over there.
let rendering = false;
async function renderJob(btn, route, working, describe) {
  if (rendering) { toast('a render is already running'); return; }
  rendering = true;
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  toast(working, 0);
  try {
    let res;
    try {
      res = await fetch(route, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ trackId, mix: mixFor(trackId) }),
      });
    } catch { res = null; }
    if (!res || !res.ok) {
      // Same trap the MIDI button meets: a mixer left running from before this
      // route existed answers 404, and "render failed" is a poor way to say
      // "restart the tool".
      toast(res && res.status === 404
        ? `no ${route} route — this mixer is running older code, restart npm run mixer`
        : `render failed${res ? ` (${res.status})` : ' — the mixer server is not answering'}`,
      6000);
      // Whatever the server has to say — a missing venv comes back this way, and it
      // comes with the two lines that fix it.
      if (res && res.status !== 404) alert(`could not render:\n\n${await res.text()}`);
      return;
    }
    toast(describe(await res.json()), 8000);
  } finally {
    rendering = false;
    btn.disabled = false;
    btn.textContent = label;
  }
}

// Peak and LUFS both, because they answer different questions: peak says whether
// this render clipped, LUFS says whether it sits with the other thirty-three.
const measured = (info) => `${info.lufs.toFixed(1)} LUFS `
  + `(${info.toTarget >= 0 ? '+' : ''}${info.toTarget.toFixed(1)} dB to target) · `
  + `peak ${info.peakDb.toFixed(1)} dBFS${info.clipping ? ' · ** CLIPPING **' : ''}`;

$('renderwav').onclick = () => renderJob($('renderwav'), '/render',
  `rendering ${track.title} — offline, slower than real time…`,
  (info) => `${info.file} · ${measured(info)}`);

// The same render, straight into tools/audition: a real AU plugin over this mix,
// its own GUI open, previewed before anything is kept. What the desk's effects
// cannot do — Ozone, Valhalla, a Waves shell — happens there, and Audition's OK
// writes its own WAV beside this one.
//
// The plugin window opens on the machine running the mixer, because that is the
// machine the plugins are installed on.
$('auditionwav').onclick = () => renderJob($('auditionwav'), '/audition',
  `rendering ${track.title} for Audition — the plugin window follows…`,
  (info) => `Audition opening on ${info.file} · ${measured(info)}`);

// The notes, as MIDI. The server builds it from the same bank the desk is playing;
// tools/import-midi.js reads the format back into a bank if it comes home edited.
//
// Fetched rather than pointed at with a download link: a plain link happily saves
// whatever comes back, so a server running code older than this route turned its
// 404 into a file called midi.txt. Now it says what actually happened.
$('midi').onclick = async () => {
  // With the GM programs: naming each track's patch is most of what makes the file
  // useful when it lands in a DAW. The channel layout stays as it is — everything on
  // 1, drums on 10 — because Logic externalizes multi-channel files (silent tracks).
  // The chord lane's program must be polyphonic (see render-midi-bank.js).
  const url = `/midi?track=${encodeURIComponent(trackId)}&patches=1`;
  let res;
  try { res = await fetch(url); } catch { res = null; }
  if (!res || !res.ok || !/midi/.test(res.headers.get('content-type') || '')) {
    toast(res && res.status === 404
      ? 'no MIDI route — this mixer is running older code, restart npm run mixer'
      : `MIDI failed${res ? ` (${res.status})` : ''}`);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await res.blob());
  a.download = `${track.slug || trackId}.mid`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`${track.title} — ${a.download}`);
};

// MIDI in. The file goes to the server, which runs the same conversion the CLI does
// and writes a bank beside the hand-written ones; what comes back is the summary and
// the bank itself.
//
// The new song becomes a track and the desk switches to it here and now. It used to
// end at "written to a file, go and register it by hand", which is a strange thing
// for a desk to say — you imported a song because you wanted to hear it. The bank on
// disk is what makes it survive a reload; this is what makes it play.
//
// Importing the same filename again lands on the same track id, so a song that has
// been round the DAW comes back over itself rather than piling up copies.
$('importmidi').onclick = () => $('midifile').click();
$('midifile').onchange = async () => {
  const file = $('midifile').files[0];
  if (!file) return;
  $('midifile').value = '';
  toast(`reading ${file.name}…`);
  const res = await fetch(`/import-midi?file=${encodeURIComponent(file.name)}`, {
    method: 'POST', body: await file.arrayBuffer(),
  });
  const body = await res.text();
  if (!res.ok) { alert(`could not import ${file.name}:\n\n${body}`); return; }
  const out = JSON.parse(body);
  if (!out.track) {                     // server older than this page
    alert(`${file.name} → ${out.file}\n\nRestart npm run mixer to play it.`);
    return;
  }
  const replaced = !!resolveTrack(out.track.id);
  registerTrack(out.track);
  selectSong(out.track.id);
  if (playing) setPlaying(true, 0);     // straight into the new song, from the top

  const lanes = out.assignments.map((a) => `${a.name} → ${a.lane}`).join('\n  ');
  const notes = (out.moved ? `${out.moved} notes moved onto the sixteenth grid.\n` : '')
    + (out.foreignDrums.length ? `GM percussion outside our kit: ${out.foreignDrums.join(', ')}\n` : '');
  toast(`${replaced ? 'replaced' : 'imported'} ${out.track.title} — ${playing ? 'now playing' : 'loaded'}`);
  alert(`${file.name} → ${out.file}\n\n`
    + `${out.bpm} bpm, ${out.blocks} blocks → ${out.sections} sections\n\n`
    + `  ${lanes}\n\n`
    + (notes ? `${notes}\n` : '')
    + `The desk is on it now, under "imported" as ${out.track.id}`
    + `${replaced ? ' (it replaced the last import of that name)' : ''}.\n`
    + 'Timbres, glissandi and per-section overrides are not in a MIDI file — set '
    + `those by hand in ${out.file}.`);
};

$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'mix.json'; a.click();
};

$('import').onclick = async () => {
  const text = prompt('Paste a mix JSON (the whole file, or one track entry):');
  if (!text) return;
  try {
    const parsed = JSON.parse(text);
    if (parsed.lanes || parsed.master != null) draft[trackId] = parsed;
    else Object.assign(draft, parsed);
    localStorage.setItem(LS_KEY, JSON.stringify(draft));
    buildRack(); applyToEngine(mixFor(trackId)); updateStatus();
  } catch (e) { alert('not valid JSON: ' + e.message); }
};

/**
 * Write the mix file. `ids` is which songs' drafts to fold in — the file always
 * holds every song, so the rest are written back exactly as they already were.
 *
 * Saving one song at a time is the default because that is how mixing goes: you
 * work on a song, you finish with it, you commit it. Sweeping up three other songs
 * you happened to touch an hour ago into the same write is how a change nobody
 * remembers making ends up in a diff.
 */
async function saveMix(ids) {
  const merged = { ...saved };
  for (const id of ids) merged[id] = draft[id];
  const res = await fetch('/save', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(merged, null, 2),
  });
  const body = await res.text();
  if (!res.ok) { alert('save failed: ' + body); return false; }
  for (const id of ids) {
    saved[id] = JSON.parse(JSON.stringify(draft[id]));
    delete draft[id];
  }
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  updateStatus();
  return true;
}

$('save').onclick = async () => {
  if (!isDirty(trackId)) { toast(`${track.title} already matches the file`); return; }
  const others = Object.keys(draft).filter((id) => id !== trackId && isDirty(id));
  const ok = confirm(`Write ${track.title} to src/data/mix.js?\n\n`
    + (others.length
      ? `${others.length} other song${others.length === 1 ? '' : 's'} still hold unsaved `
        + `changes and will be left alone:\n  `
        + others.map((id) => resolveTrack(id)?.title || id).join('\n  ') + '\n\n'
      : '')
    + 'The game and every render tool read this file. Peter commits it, so nothing '
    + 'is final until you do.');
  if (!ok) { toast('save cancelled'); return; }
  if (await saveMix([trackId])) {
    $('status').textContent = 'written to src/data/mix.js';
    toast(`${track.title} saved`);
  }
};

// Everything at once, for when you have been across several songs and mean it.
$('saveall').onclick = async () => {
  const dirty = Object.keys(draft).filter((id) => isDirty(id));
  if (!dirty.length) { toast('nothing to save — the file already matches'); return; }
  const names = dirty.map((id) => resolveTrack(id)?.title || id);
  const ok = confirm(`Write ${dirty.length} song${dirty.length === 1 ? '' : 's'} to `
    + `src/data/mix.js?\n\n  ${names.join('\n  ')}`);
  if (!ok) { toast('save cancelled'); return; }
  if (await saveMix(dirty)) {
    $('status').textContent = 'written to src/data/mix.js';
    toast(`${dirty.length} songs saved`);
  }
};

$('resetsong').onclick = () => {
  pushUndo(null);
  draft[trackId] = { master: 0, limiter: false, lanes: {} };
  localStorage.setItem(LS_KEY, JSON.stringify(draft));
  buildRack(); applyToEngine(mixFor(trackId)); updateStatus();
  toast(`every channel in ${track.title} reset — ⌘Z to undo`);
};

// Web Audio needs a gesture before it will make a sound.
$('start').onclick = () => {
  Audio.ensure();
  $('gate').remove();
  selectSong(trackId);
  tick();
};
