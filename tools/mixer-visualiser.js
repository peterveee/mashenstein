// The desk's full-screen visualiser, as a panel.
//
// Lifted out of mixer-entry.js. The jukebox visuals, run against the desk's own
// playback: the song is already going through Audio's song lane and the analyser that
// feeds these presets is tapped off it, so this needs no audio work at all — only a
// canvas and the engine's own analysis object. That is why it could leave with a
// three-item deps bag rather than a share of the desk's state.
//
// What it DOES need is for the desk to stop drawing. A preset painting the whole
// window at native density is real fill rate, and it is being asked for on a machine
// whose one job is not to drop the song. The desk's own frame is a picture of audio
// nobody can see while this is up, so tick() returns early the same way it already does
// when the window loses focus — transport work above that line still runs, so loops arm
// and seeks land while the visual is playing. `isOpen()` is the half of that the desk
// reads; it is the only thing this hands back.

import { Audio } from '../src/engine/audio.js';
import {
  createVisualiser, VISUALISER_NAMES, createHalfPipeLab, HALF_PIPE_CONTROLS, HALF_PIPE_DEFAULTS,
} from '../src/engine/visualisers.js';

const $ = (id) => document.getElementById(id);

/**
 * Build the panel and wire it to the window.
 *
 * @param closeMenu   the desk's own menu close — the button that opens this lives in one.
 * @param trackBpm    what the presets ride: the playing bank's tempo, or the applied one.
 * @param onClose     the desk's chance to put itself back. The meter clock is a
 *                    timestamp, and left alone it would come back to a dt of however
 *                    long the visual was up and snap every meter to the floor in one
 *                    frame — so the desk resets it here rather than this reaching in.
 */
export function createVisualiserPanel({ closeMenu, trackBpm, onClose }) {
  let visPreset = null;
  let visFrame = 0;
  let visAt = 0;
  let visIdleTimer = 0;
  let visIndex = 0;
  let visualiserOpen = false;
  // The tunable half-pipe. It is not a member of the pack — it is the same preset
  // with its constants brought out where they can be turned, so it sits after the
  // list rather than inside it, the way every dev-only section in this project
  // sorts after the production ones. Its settings live for the session only: they
  // are a way to play with the picture, not a property of the song.
  const VIS_LAB = 'HALF-PIPE HORIZON — LAB';
  let visLabTune = HALF_PIPE_DEFAULTS();

  /** Backing store at the window's size, capped: this is fill rate, not detail. */
  function sizeVisualiser() {
    const canvas = $('viscanvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(innerWidth * dpr));
    canvas.height = Math.max(1, Math.round(innerHeight * dpr));
  }

  function visualiserFrame() {
    if (!visualiserOpen) return;
    visFrame = requestAnimationFrame(visualiserFrame);
    const canvas = $('viscanvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !visPreset) return;
    const now = performance.now();
    const dt = visAt ? Math.min(0.25, (now - visAt) / 1000) : 1 / 60;
    visAt = now;
    visPreset.update(dt, Audio.musicAnalysis());
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Cover, not stretch. The presets are composed in a fixed 480x270 space and a
    // non-uniform scale turns every ring in them into an ellipse; cropping the long
    // edge is what the game's own full-screen visual mode does.
    const fit = Math.max(canvas.width / 480, canvas.height / 270);
    ctx.setTransform(fit, 0, 0, fit, (canvas.width - 480 * fit) / 2, (canvas.height - 270 * fit) / 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    visPreset.draw(ctx);
  }

  /** Show the hint again, with a message, and start it fading out afresh. */
  function visHint(text) {
    const panel = $('visualiser');
    $('vishint').textContent = text;
    panel.classList.remove('idle');
    clearTimeout(visIdleTimer);
    visIdleTimer = setTimeout(() => panel.classList.add('idle'), 2600);
  }

  /**
   * Build a preset and put it up. Seeded off the clock rather than fixed, so
   * arriving at the same preset twice deals a different palette and layout the way
   * the jukebox does rather than replaying one picture.
   */
  function startPreset(index) {
    // The lab sits one past the end of the pack, so browsing with the arrows reaches
    // it and wraps past it like anything else.
    const total = VISUALISER_NAMES.length + 1;
    visIndex = ((index % total) + total) % total;
    const track = { bpm: trackBpm() };
    const seed = ((Math.random() * 0xffffffff) ^ (visIndex * 0x9e3779b9)) >>> 0;
    const lab = visIndex === VISUALISER_NAMES.length;
    visPreset = lab ? createHalfPipeLab(seed, track, visLabTune) : createVisualiser(visIndex, seed, track);
    // The drawer's picker is the same choice by another route, so it follows along
    // and is already on the right preset when the desk comes back.
    $('vispreset').value = lab ? VIS_LAB : VISUALISER_NAMES[visIndex];
    $('visualiser').classList.toggle('lab', lab);
    if (lab) renderVisKnobs();
  }

  /** One row of steppers, rebuilt from the preset's own control list. */
  function renderVisKnobs() {
    const bar = $('viscontrols');
    if (bar.childElementCount) { syncVisKnobs(); return; }
    for (const control of HALF_PIPE_CONTROLS) {
      const knob = document.createElement('div');
      knob.className = 'visknob';
      knob.dataset.key = control.key;
      knob.innerHTML = '<span>' + control.label + '</span>'
        + '<button type="button" data-step="-1" aria-label="less">−</button>'
        + '<b></b>'
        + '<button type="button" data-step="1" aria-label="more">+</button>';
      bar.appendChild(knob);
    }
    for (const [label, act] of [['RANDOMISE', randomiseVisTune], ['RESET', resetVisTune]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'visact';
      button.textContent = label;
      button.onclick = act;
      bar.appendChild(button);
    }
    syncVisKnobs();
  }

  /** AUTO and OFF are values, not absences — see nextHold() in visualisers.js. */
  function visKnobText(control, value) {
    if (control.unit === 'beats') {
      if (value < 0) return 'OFF';
      if (value === 0) return 'AUTO';
      return String(value);
    }
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function syncVisKnobs() {
    for (const knob of $('viscontrols').querySelectorAll('.visknob')) {
      const control = HALF_PIPE_CONTROLS.find((c) => c.key === knob.dataset.key);
      const value = visLabTune[control.key];
      knob.querySelector('b').textContent = visKnobText(control, value);
      knob.querySelector('[data-step="-1"]').disabled = value <= control.min;
      knob.querySelector('[data-step="1"]').disabled = value >= control.max;
    }
  }

  function setVisTune(next) {
    visLabTune = { ...visLabTune, ...next };
    // Straight onto the running preset. Rebuilding it would restart the ride every
    // time a number moved, which is the opposite of what a knob is for.
    if (visPreset?.applyTune) visPreset.applyTune(next);
    syncVisKnobs();
  }

  function randomiseVisTune() {
    const next = {};
    for (const control of HALF_PIPE_CONTROLS) {
      const steps = Math.round((control.max - control.min) / control.step);
      next[control.key] = Number((control.min + Math.round(Math.random() * steps) * control.step)
        .toFixed(2));
    }
    setVisTune(next);
    visHint('RANDOMISED');
  }

  function resetVisTune() {
    setVisTune(HALF_PIPE_DEFAULTS());
    visHint('BACK TO THE SHIPPED SETTINGS');
  }

  function openVisualiser() {
    if (visualiserOpen) return;
    startPreset(VISUALISER_NAMES.indexOf($('vispreset').value));
    visualiserOpen = true;
    visAt = 0;
    sizeVisualiser();
    const panel = $('visualiser');
    panel.classList.add('show');
    panel.setAttribute('aria-hidden', 'false');
    visHint('← → TO BROWSE · CLICK OR ESC TO RETURN TO THE DESK');
    visFrame = requestAnimationFrame(visualiserFrame);
  }

  function closeVisualiser() {
    if (!visualiserOpen) return;
    visualiserOpen = false;
    cancelAnimationFrame(visFrame);
    clearTimeout(visIdleTimer);
    visPreset = null;
    const panel = $('visualiser');
    panel.classList.remove('show', 'idle', 'lab');
    panel.setAttribute('aria-hidden', 'true');
    onClose();
  }

  for (const name of VISUALISER_NAMES) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    $('vispreset').appendChild(option);
  }
  {
    const lab = document.createElement('option');
    lab.value = VIS_LAB;
    lab.textContent = VIS_LAB;
    $('vispreset').appendChild(lab);
  }
  $('vispreset').value = 'HALF-PIPE HORIZON';
  $('viscontrols').onclick = (ev) => {
    // The bar sits on top of the panel whose own click is the way out.
    ev.stopPropagation();
    const button = ev.target.closest('button[data-step]');
    if (!button) return;
    const control = HALF_PIPE_CONTROLS.find((c) => c.key === button.closest('.visknob').dataset.key);
    const step = Number(button.dataset.step) * control.step;
    const value = Math.min(control.max, Math.max(control.min,
      Number((visLabTune[control.key] + step).toFixed(2))));
    setVisTune({ [control.key]: value });
    visHint(control.label + '  ' + visKnobText(control, value));
  };
  $('visopen').onclick = () => { closeMenu(); openVisualiser(); };
  $('visualiser').onclick = closeVisualiser;
  addEventListener('resize', () => { if (visualiserOpen) sizeVisualiser(); });
  // Everything the keyboard does while the visual is up, and nothing reaches the
  // desk underneath: it is not on screen, and a keystroke aimed at a picture must
  // not move a fader. Ahead of the desk's panic handler on the same window, for the
  // same reason the drawer's Escape is — leaving is not a reason to cut the sound.
  const VIS_STEP = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
  addEventListener('keydown', (ev) => {
    if (!visualiserOpen) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const step = VIS_STEP[ev.key];
    if (step) {
      startPreset(visIndex + step);
      visHint(VISUALISER_NAMES[visIndex]);
      return;
    }
    closeVisualiser();
  }, true);

  return { isOpen: () => visualiserOpen };
}
