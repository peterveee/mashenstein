/**
 * The guided tour.
 *
 * A card that walks the desk, pointing at one control at a time. The written source is
 * `mixertutorialscript.md` at the repo root — this file and that file have to agree,
 * and a change to the copy belongs in both in the same commit.
 *
 * Three rules the whole thing is built around:
 *
 *   1. Nothing is modal. The card floats over a live desk. There is no scrim and no
 *      pointer-events trap, so the music keeps playing and every control stays where
 *      the visitor left it. The one concession is that the card itself is not
 *      click-through — it has buttons on it.
 *   2. It never blocks. No card waits for the visitor to do the thing it describes.
 *      Next always works, Back always works, and closing puts back whatever the tour
 *      opened.
 *   3. A card that cannot point at its subject does not run. The desk sheds the
 *      effects, sends and EQ rows on a short window, and an arrow aimed at nothing is
 *      worse than a tour one card shorter — so the plan is worked out when the tour
 *      opens, from what is actually on screen, and the counter is honest about it.
 *      `makeRoomForStrips` runs FIRST, because the bottom half of the desk holds the
 *      mixer or a note editor and not both: opened over the piano roll, a plan drawn up
 *      before the switch would have written off every card about a channel strip.
 *
 * The audience already mixes. Nothing here explains what a fader is; the words go on
 * what is peculiar to this desk — live synths instead of samples, an instrument you can
 * open, and a song you can generate.
 */

const SEEN_KEY = 'mash-mixer-tutorial-seen';

/**
 * @param {object} deps
 * @param {HTMLElement} deps.el              the `#tut` card, empty in the shell
 * @param {Function} deps.placeCard          shared with the tooltip — see mixer-entry
 * @param {Function} deps.tourLane           () => the strip element the tour should use
 * @param {Function} deps.selectLane         (laneKey) => void
 * @param {Function} deps.openPicker         ({anchor}) => void, the effect catalogue
 * @param {Function} deps.editVoice          (laneKey) => void, opens the synth editor
 * @param {Function} deps.hasPreset          (laneKey) => is there a preset to edit at all
 * @param {Function} deps.showDrawer         () => void, idempotent unlike openDrawer
 * @param {Function} deps.closePopups        closeMenu — drawer, pickers, context menus
 * @param {Function} deps.showDevices        (on) => void, the Effects panel's own switch
 * @param {Function} deps.devicesOpen        () => is that panel on screen right now
 * @param {Function} deps.voiceEditorOpen    () => is the synth editor up right now
 * @param {Function} deps.closeVoiceEditor   () => put it away, both surfaces
 * @param {Function} deps.makeRoomForStrips  () => false, or a token naming what it moved
 * @param {Function} deps.restoreRoom        (token) => put that back
 */
export function createTutorial({
  el, placeCard, tourLane, selectLane, openPicker, editVoice, showDrawer, closePopups,
  hasPreset = () => false,
  showDevices = () => {}, devicesOpen = () => true,
  voiceEditorOpen = () => true, closeVoiceEditor = () => {},
  makeRoomForStrips = () => false, restoreRoom = () => {},
}) {
  const $ = (id) => document.getElementById(id);
  const q = (sel) => document.querySelector(sel);
  // The strip the middle of the tour is about. Chosen once when the tour opens and held,
  // because `buildRack` replaces every strip element on a preset change — and cards 12
  // and 13 change the preset — so a card that re-found "the first strip" each frame
  // would be pointing at a different object than the one it selected.
  let lane = null;
  const strip = () => (lane ? q(`.strip[data-lane="${CSS.escape(lane)}"]`) : null);
  const onStrip = (sel) => () => strip()?.querySelector(sel) || null;

  /**
   * The script, in order. `anchor` returns a FRESH element every time it is called:
   * `buildRack` destroys and rebuilds every strip on a lane-filter, preset or effect
   * change, so a held node goes stale in the middle of the tour.
   */
  const STEPS = [
    {
      id: 'welcome',
      title: 'A synth workstation, not a tape machine',
      says: 'There are no audio files here. Every channel is a synthesiser rendered live, '
        + 'so changing the bass sound means opening the bass and editing it, not swapping '
        + 'a sample.\n\nTen cards. The desk stays live behind them — click anything at any '
        + 'point.',
      start: true,
    },
    {
      id: 'desk',
      title: 'Getting around the desk',
      key: 'Space',
      anchor: () => $('play'),
      says: 'TIMELINE and ARRANGEMENT fill the top half — one row per track, one cell per '
        + 'bar. The bottom half holds one of three, switched from the toolbar: MIXER, PIANO '
        + 'ROLL, STEP GRID. EFFECTS is a panel down one side, right or left, and drag the '
        + 'bar between the halves to give one of them more room.'
        + '\n\nSpace plays and pauses; Stop returns to where playback started, pause holds '
        + 'where you are. Click the timeline to park the playhead, double-click to play from '
        + 'there, and drag across it to pick out bars for Loop.',
    },
    {
      id: 'strip',
      title: 'The channel strip',
      anchor: () => strip()?.querySelector('.striphead') || null,
      prefer: 'side',
      says: 'Voice, three-band EQ, two sends, up to six inserts, then fader, pan, mute and '
        + 'solo. Click a strip to select it — the Effects panel and the note editors follow '
        + 'the selection, and ↑ and ↓ walk the rack.'
        + '\n\nEvery number on the page is a control: drag it, hold shift for a fifth of the '
        + 'speed, click it to type an exact one, double-click to reset. The EQ is fixed at '
        + '250, 1.2k and 4k, plus or minus 18 dB — for anything else, insert a Channel EQ.',
      // Every card from here to the synth editor is about this one strip, so it is
      // selected once, here, rather than by each of them.
      setup: () => selectLane(lane),
    },
    {
      id: 'levels',
      title: 'Levels, and two buses',
      anchor: onStrip('.fadercol'),
      also: () => [strip()?.querySelector('.sendrow')],
      prefer: 'side',
      says: 'The fader taper is a console law, not a straight line: the bottom of the travel '
        + 'is silence, three-quarters up is unity, and the top quarter is the only gain '
        + 'there is. The meter’s peak line sits where the loudest moment was, and a red '
        + 'border means it clipped — though the master’s own LIMITER is off on purpose, '
        + 'because the 6 ms of lookahead it cannot give up would change what gets rendered.'
        + '\n\nDelay and reverb have their own return strips at the right of the rack. Both '
        + 'read in dB and tap the channel AFTER its fader, and both are absolute rather than '
        + 'relative trims — the same reading sends the same amount of the kick as it does of '
        + 'the lead, in every bar.',
    },
    {
      id: 'effects',
      title: 'Effects',
      anchor: () => $('devrack'),
      also: () => [strip()?.querySelector('.fxbtns'), strip()?.querySelector('.addslot')],
      key: 'E',
      says: 'The dashed outline on a strip, under the sends, is an empty insert — click it '
        + 'for a catalogue of thirty-odd in six groups, each showing what it costs as a '
        + 'percentage of one core, measured rather than guessed. Six slots per channel, and '
        + 'their order is the signal path.'
        + '\n\nTheir parameters live here, one card per insert in chain order. The arrow in '
        + 'the header moves the panel to the other side of the desk; drag a title bar to '
        + 'reorder, the power mark bypasses and the ✕ removes. Tempo Mode on a delay or an '
        + 'LFO swaps free time for a note division, and says what that is at this tempo.',
      // Shown by working the panel's own switch, so what the visitor reads is what E
      // gives them. Put back on the way out only if the tour is what opened it: a
      // visitor who was already mixing with it up does not want it shut behind them.
      setup: () => { devicesWereOpen = devicesOpen(); showDevices(true); },
      teardown: () => { if (!devicesWereOpen) showDevices(false); },
      // Asked of the desk rather than of the DOM: `#devrack` is always in the document
      // and off screen until the panel slides in, which only happens in setup — so the
      // plan would read a closed panel as a card with nothing to point at and drop it
      // before it ever ran. There is always an Effects panel to open.
      available: () => true,
    },
    {
      id: 'voice',
      title: 'Swap the voice',
      anchor: onStrip('.strippreset'),
      prefer: 'side',
      says: 'Click the name at the top of a strip for the preset picker: four hundred and '
        + 'fifty-odd presets, filed by what they SOUND like — bass, lead, pad, keys, organ, '
        + 'bells, orch, FX and ten kit categories — rather than by which track they belong '
        + 'on. Search covers the descriptions, so "808" and "detune" find things.'
        + '\n\nA voice is a bank key rather than a live node, so choosing one restarts the '
        + 'sequencer: about half a second of silence with the playhead held. The preset '
        + 'library in the toolbar is the same catalogue with no song in front of it.',
    },
    {
      id: 'synth',
      title: 'Open the instrument',
      anchor: () => $('voiceedit'),
      says: 'Right-click a strip for Edit Simple — or Edit Advanced, where that instrument '
        + 'has a full window. It opens where you clicked and stays open, so you can work '
        + 'while the sound changes under your hands, and the preset is copied into this song '
        + 'first: your edits belong to the song and ride its undo stack.'
        + '\n\nSYNTH at the top names which of six instruments builds a pitched preset — '
        + 'KNDO-5, WNDR-9, MRDR-3, TNGR-2, CRLS-1, RMND-2 — and changing it rebuilds the '
        + 'patch from the new one’s defaults rather than converting it. A drum preset names '
        + 'none: it is the sections themselves, and each one switches off as a bypass rather '
        + 'than a delete.',
      setup: () => { voiceWasOpen = voiceEditorOpen(); editVoice(lane); },
      // It is a window, and a window nobody closes covers the cards after it. Left up if
      // the visitor already had one open when the tour started.
      teardown: () => { if (!voiceWasOpen) closeVoiceEditor(); },
      // A channel running the engine's own voice has no preset to open, and that is what
      // leaves this card out. Asked of the desk rather than of the strip's DOM.
      available: () => hasPreset(lane),
    },
    {
      id: 'songs',
      title: 'Songs',
      anchor: () => $('save'),
      also: () => [$('newsong')],
      prefer: 'side',
      says: 'The menu holds your songs and Save; the dot on the menu button is the unsaved '
        + 'mark, and your mixes are kept in this browser, on this computer. ⌘Z goes back two '
        + 'hundred steps and crosses songs, a whole parameter drag counting as one of them.'
        + '\n\nNew song generates a complete arrangement from one of eleven style packs — '
        + 'leave Style on AUTO and a seed picks the key, the chord progression, the drum '
        + 'patterns and each melody’s shape. Full Song gives you kit, bass, chords and lead; '
        + 'Beats Only the kit; Blank one silent track. There is no re-roll.',
      setup: () => showDrawer(),
      teardown: () => closePopups(),
    },
    {
      id: 'notes',
      title: 'Drawing and playing',
      anchor: () => $('rollbtn'),
      also: () => [$('seqbtn'), $('recbtn')],
      key: 'N · G',
      says: 'N puts the piano roll in the bottom half of the desk, where the rack was — what '
        + 'the SELECTED CHANNEL plays, as notes against bars. G puts the step grid there — '
        + 'what the KIT plays, sixteen squares a bar. The mixer button beside them brings '
        + 'the strips back.'
        + '\n\nRecord — ⇧R — writes what you play into the selected track, from MIDI, the '
        + 'on-screen keys or the computer keyboard, quantised to sixteenths and copied '
        + 'everywhere that part repeats. It only ever adds; ⌘Z takes back a phrase, and Esc '
        + 'silences everything and drops whatever has not landed.',
    },
    {
      id: 'done',
      title: 'That’s the desk',
      says: 'Right-click is worth exploring — strips, track rows, effect slots and bars all '
        + 'have their own menus. Hover anything to find out what it is, and the gear beside '
        + 'this ? holds appearance, playback and diagnostics.\n\nThe ? brings this back.',
      end: true,
    },
  ];

  let plan = [];          // the steps this run will actually show
  let at = -1;            // index into plan; -1 is closed
  let raf = 0;
  let rung = [];          // elements currently wearing the ring, so they can be cleaned
  let revealed = null;
  let roomMade = false;   // what the tour moved to fit the rack, and owes back on close
  let devicesWereOpen = true;   // was the Effects panel up before its card opened it
  let voiceWasOpen = true;      // and the same question for the synth editor

  // A fold is animated and the rack is re-measured after it, so the strips are not their
  // final height on the next frame. Long enough to be sure, short enough that the tour
  // still looks like it opened when the button was pressed.
  const settle = () => new Promise((done) => setTimeout(done, 240));

  const open = () => at >= 0;
  const step = () => plan[at] || null;

  /** Is the element on screen at all? A folded panel keeps its node and loses its box. */
  const onScreen = (node) => !!node && node.getClientRects().length > 0;

  function clearMarks() {
    for (const node of rung) node.classList.remove('tut-target');
    rung = [];
    revealed?.classList.remove('tut-reveal');
    revealed = null;
  }

  function mark(s) {
    clearMarks();
    // Reveal FIRST. The one card that needs it is pointing at a control that is
    // display:none until its row is hovered, so asking whether it is on screen before
    // holding it open is asking about the wrong state — and the ring went nowhere.
    const hold = s.reveal?.();
    if (hold) { hold.classList.add('tut-reveal'); revealed = hold; }
    const targets = [s.anchor?.(), ...(s.also?.() || [])].filter(onScreen);
    for (const node of targets) node.classList.add('tut-target');
    rung = targets;
  }

  /**
   * The card, rebuilt per step. Cheap, and it keeps the two shapes — a centred welcome
   * with its own buttons, and an anchored card with Back/Next — from having to share
   * one set of nodes that is wrong for both.
   */
  function render() {
    const s = step();
    if (!s) return;
    el.textContent = '';
    el.classList.toggle('centred', !s.anchor);

    const head = document.createElement('div');
    head.className = 'tuthead';
    const name = document.createElement('span');
    name.className = 'tutname';
    name.textContent = s.title;
    head.append(name);
    if (s.key) {
      const key = document.createElement('kbd');
      key.className = 'tutkey';
      key.textContent = s.key;
      head.append(key);
    }
    el.append(head);

    // Blank lines in the copy are paragraph breaks, so the second thought is not glued to
    // the first. Written as \n\n in the script and here, rather than as markup.
    for (const para of s.says.split('\n\n')) {
      const p = document.createElement('div');
      p.className = 'tutsays';
      p.textContent = para;
      el.append(p);
    }

    const foot = document.createElement('div');
    foot.className = 'tutfoot';
    if (s.start) {
      foot.append(button('No thanks', 'tutskip', () => close()),
        button('Start', 'tutgo', () => go(1)));
    } else if (s.end) {
      foot.append(button('Back', 'tutback', () => go(-1)),
        button('Close', 'tutgo', () => close()));
    } else {
      const count = document.createElement('span');
      count.className = 'tutcount';
      count.textContent = `${at + 1} / ${plan.length}`;
      foot.append(count,
        button('Back', 'tutback', () => go(-1)),
        button('Next', 'tutgo', () => go(1)));
    }
    el.append(foot);

    if (!s.start) {
      const x = button('×', 'tutclose', () => close());
      x.setAttribute('aria-label', 'Close the tour');
      el.append(x);
    }

    const arrow = document.createElement('span');
    arrow.className = 'tutarrow';
    el.append(arrow);

    mark(s);
    position();
  }

  function button(label, cls, onclick) {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = label;
    b.onclick = onclick;
    return b;
  }

  /**
   * Follow the anchor. Run every frame while the tour is open, because the thing being
   * pointed at moves under a rack rebuild, a panel fold, a window resize and a scroll —
   * and there is no one event for all four.
   */
  function position() {
    const s = step();
    if (!s) return;
    const arrow = el.querySelector('.tutarrow');
    const target = s.anchor?.();
    // An anchored card whose subject has gone — a panel folded mid-card, a strip rebuilt
    // without it — falls back to the centre rather than pointing off into the desk.
    if (!onScreen(target)) {
      el.classList.add('centred');
      el.style.left = '';
      el.style.top = '';
      if (arrow) arrow.hidden = true;
      return;
    }
    el.classList.remove('centred');
    if (arrow) arrow.hidden = false;
    placeCard(el, target, arrow, { prefer: s.prefer || 'below' });
  }

  function frame() {
    if (!open()) return;
    position();
    raf = requestAnimationFrame(frame);
  }

  function go(delta) {
    const s = step();
    s?.teardown?.();
    const next = at + delta;
    if (next < 0) return;
    if (next >= plan.length) { close(); return; }
    at = next;
    plan[at].setup?.();
    render();
  }

  async function start() {
    // Before the plan is drawn up, not after: the point of making room is to put the
    // strip's own rows back on the desk, and a plan worked out first would have already
    // written those cards off.
    roomMade = makeRoomForStrips();
    if (roomMade) {
      await settle();
      // A SECOND PASS, and it is not belt and braces. Switching the lower half back to
      // the mixer is asynchronous — the rack is laid out and refitted a frame or two
      // later — so the first pass asked whether the shrink ladder was eating the strips
      // at a moment when there was no rack on screen to eat, and always heard no. The
      // answer is only available once the switch has landed, which is here.
      const more = makeRoomForStrips();
      if (more) {
        // The FIRST pass holds the view to go back to; either may hold the splitter.
        roomMade = { view: roomMade.view, ratio: roomMade.ratio ?? more.ratio };
        await settle();
      }
    }
    lane = tourLane();
    // Worked out once, up front, so the counter can be honest. A card whose subject is
    // not on this desk right now — the sends row on a short window, the pen on a channel
    // running the engine's own voice — is left out of the run rather than skipped
    // through, which would make "7 / 23" a lie about what is left.
    plan = STEPS.filter((s) => {
      if (s.available) return s.available();
      if (!s.anchor) return true;
      return onScreen(s.anchor());
    });
    at = 0;
    el.hidden = false;
    plan[0].setup?.();
    render();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function close() {
    step()?.teardown?.();
    cancelAnimationFrame(raf);
    raf = 0;
    at = -1;
    clearMarks();
    el.hidden = true;
    el.textContent = '';
    // Give back whatever was folded to make room. The desk is left as it was found.
    if (roomMade) { restoreRoom(roomMade); roomMade = false; }
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* private window; ask again */ }
  }

  // Arrow keys and Enter drive the tour, but only when the visitor is not typing into
  // something. Escape closes the tour — unless a panel the tour opened is on top of it,
  // where Escape belongs to that panel and this handler has already been beaten to it by
  // the drawer's own listener.
  addEventListener('keydown', (ev) => {
    if (!open()) return;
    if (ev.target instanceof HTMLElement
      && ev.target.closest('input, textarea, select, [contenteditable]')) return;
    if (ev.key === 'ArrowRight' || ev.key === 'Enter') { ev.preventDefault(); go(1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); close(); }
  });

  return {
    open: () => (open() ? close() : start()),
    isOpen: open,
    /** First visit only, and declining counts as a visit — see `close`. */
    offerOnce() {
      try { if (localStorage.getItem(SEEN_KEY)) return; } catch { return; }
      start();
    },
  };
}
