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
 * @param {Function} deps.showDrawer         () => void, idempotent unlike openDrawer
 * @param {Function} deps.closePopups        closeMenu — drawer, pickers, context menus
 * @param {Function} deps.makeRoomForStrips  () => did it fold something to fit the rack
 * @param {Function} deps.restoreRoom        () => put that back
 */
export function createTutorial({
  el, placeCard, tourLane, selectLane, openPicker, editVoice, showDrawer, closePopups,
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
        + 'a sample.\n\nTwenty-odd cards. The desk stays live behind them — click anything '
        + 'at any point.',
      start: true,
    },
    {
      id: 'layout',
      title: 'Four regions',
      says: 'TIMELINE across the top. ARRANGEMENT — one row per track, one cell per bar. '
        + 'NOTES — piano roll or kit grid for whichever track is selected. RACK — the '
        + 'channel strips. EFFECTS — the parameters for whatever is selected above.'
        + '\n\nEvery header folds. Drag the seams between them.',
    },
    {
      id: 'transport',
      title: 'Transport',
      key: 'Space',
      anchor: () => $('play'),
      says: 'Space plays and pauses. Stop returns to where playback started; pause holds. '
        + 'Click the timeline to park the playhead, double-click to play from there.'
        + '\n\nDrag across the timeline to pick out bars, then Loop to cycle them.',
    },
    {
      id: 'strip',
      title: 'Signal path, top to bottom',
      anchor: () => strip()?.querySelector('.striphead') || null,
      prefer: 'side',
      says: 'Voice, three-band EQ, up to six inserts, fader and pan, mute, bus. The name at '
        + 'the top is the instrument; everything under it is what has been done to it.'
        + '\n\nClick a strip to select it — the effects panel and the note editor both '
        + 'follow the selection. ↑ and ↓ walk the rack.',
      // Every card from here to 13 is about this one strip, so it is selected once, here,
      // rather than by each of them.
      setup: () => selectLane(lane),
    },
    {
      id: 'gesture',
      title: 'Every number is a control',
      anchor: onStrip('.eqrow'),
      prefer: 'side',
      says: 'Drag up or down, hold shift for a fifth of the speed, click the number to type '
        + 'an exact one, double-click to reset. The same on every knob, fader and readout '
        + 'on the page.\n\nThis EQ is fixed-frequency — 250, 1.2k and 4k, plus or minus '
        + '18 dB. For anything else, insert a parametric.',
    },
    {
      id: 'sends',
      title: 'Two buses, and they are absolute',
      anchor: onStrip('.sendrow'),
      prefer: 'side',
      says: 'Delay and reverb, with their own return strips pinned to the right of the rack.'
        + '\n\nUnlike the fader and the EQ these are not relative trims: 1.00 sends the same '
        + 'amount of the kick as it does of the lead, in every bar. Melodic tracks tap the '
        + 'delay pre-fader; everything else is post.',
    },
    {
      id: 'fader',
      title: 'Level',
      anchor: onStrip('.fadercol'),
      prefer: 'side',
      says: 'The taper is a console law, not a straight line: the bottom of the travel is '
        + 'silence, three-quarters up is unity, and the top quarter is the only gain there '
        + 'is. Double-click to put it back to unity.\n\nThe meter holds its peak for a '
        + 'second and a half. A red border means it clipped.',
    },
    {
      id: 'insert',
      title: 'Six slots per channel',
      anchor: onStrip('.addslot'),
      prefer: 'side',
      says: 'The dashed outline at the bottom of a strip is an empty insert. Click it — or '
        + 'right-click anywhere in the block — for the catalogue.\n\nOrder is the signal '
        + 'path. Drag one slot onto another to reorder the chain.',
    },
    {
      id: 'catalogue',
      title: 'Grouped, and priced',
      anchor: () => $('fxpicker'),
      says: 'Level & EQ, delay, modulation, drive, space & stereo, dynamics. Thirty-odd '
        + 'effects, and each one shows what it costs — a percentage of one core, measured '
        + 'rather than guessed.\n\nMost are under a fifth of a percent. The phaser is two. '
        + 'Watch the CPU readout in the toolbar if you stack them.',
      // Shown by opening the real picker rather than by faking a click on the slot, so the
      // catalogue the visitor is reading is the catalogue they will get.
      setup: () => {
        const slot = strip()?.querySelector('.addslot');
        if (slot) openPicker({ anchor: slot });
      },
      teardown: () => closePopups(),
      // The element is always in the document; it is `.show` that puts it on screen, and
      // that only happens in setup. So the plan asks whether the slot to open it from is
      // there, not whether the panel is.
      available: () => !!strip()?.querySelector('.addslot'),
    },
    {
      id: 'devices',
      title: 'Where the parameters live',
      anchor: () => $('devrack'),
      says: 'One card per insert, for the selected channel, in chain order. Drag the title '
        + 'bar to reorder — dragging the body would fight the sliders. The power mark '
        + 'bypasses, the ✕ removes.\n\nTempo Mode on a delay or an LFO swaps free time for '
        + 'a note division, dotted and triplet included, and the readout says what that is '
        + 'in ms or Hz at this tempo.',
    },
    {
      id: 'chain',
      title: 'Managing it from the strip',
      anchor: onStrip('.fxbtns'),
      prefer: 'side',
      says: 'Hover a slot: the power mark on the left bypasses, the cross on the right '
        + 'removes. ⌥-click anywhere on it bypasses. Click the name to jump to its card '
        + 'below.\n\nRight-click for the rest — copy and paste settings between two of the '
        + 'same effect, duplicate, insert before or after, reset to defaults.',
    },
    {
      id: 'voice',
      title: 'Swap the voice',
      anchor: onStrip('.strippreset'),
      prefer: 'side',
      says: 'Click the name at the top of a strip for the preset picker. Sixty-odd presets, '
        + 'filed by what they sound like — bass, lead, pad, keys, pluck, organ, bells, '
        + 'orch, FX and a kit set — rather than by which track they belong on. Search '
        + 'covers the descriptions too, so "808" and "detune" find things.\n\nA voice is a '
        + 'bank key rather than a live node, so choosing one restarts the sequencer: about '
        + 'half a second of silence with the playhead held.',
    },
    {
      id: 'openSynth',
      title: 'Edit it',
      anchor: onStrip('.stripedit'),
      prefer: 'side',
      says: 'The » beside the name opens the synthesiser itself, docked next to its strip. '
        + 'It is a window, not a menu: leave it open and work while the sound changes under '
        + 'your hands.\n\nEditing from a strip copies the preset into this song first, so '
        + 'you are working on this song’s own version of it. Your edits ride the undo '
        + 'stack and belong to the song.',
      // The pen is display:none until the strip head is hovered, so there is nothing to
      // point at unless the tour holds that state for the length of the card.
      reveal: onStrip('.striphead'),
      // And for the same reason the plan cannot ask whether it is on screen — at the
      // moment the plan is drawn up nothing is hovered and every pen on the desk is
      // hidden. Existence is the question here: a channel running the engine's own voice
      // has no preset to open, and that is what leaves this card out.
      available: () => !!strip()?.querySelector('.stripedit'),
    },
    {
      id: 'insideSynth',
      title: 'What is in there',
      anchor: () => $('voiceedit'),
      says: 'A pitched preset opens with SYNTH at the top, picking the construction — game '
        + 'synth, additive, mono, FM, AM, duo, membrane, metal — and changing it rebuilds '
        + 'the patch from that class’s defaults, so it is a fresh start rather than a '
        + 'conversion. A drum preset has no class: it is the sections themselves, from the '
        + 'oscillator down through noise, ring and metal.\n\nOptional sections carry an '
        + 'on/off switch in their bar, and off is a bypass rather than a delete — it keeps '
        + 'what you had and puts it back exactly as you left it.',
      setup: () => editVoice(lane),
      // Same question as the catalogue: the editor is only reachable from a strip that has
      // a preset to edit, which is what the pen means.
      available: () => !!strip()?.querySelector('.stripedit'),
    },
    {
      id: 'library',
      title: 'Every preset, with no song in front of it',
      anchor: () => $('presetbtn'),
      says: 'A browsing bench. Filter by pitched or drums, filter by which synth class a '
        + 'preset is built from — an FM bell and an additive bell want completely different '
        + 'edits — and audition anything on the keyboard beside it.\n\nUse it to find a '
        + 'sound. Do the editing back on the strip, where it belongs to a song. Use the onscreen keyboard to play, a midi keyboard or your computer keyboard keys.',
    },
    {
      id: 'master',
      title: 'The master strip',
      anchor: () => q('#masterslot .strip') || $('masterslot'),
      prefer: 'side',
      says: 'Left of the rack, with its own six inserts and a limiter that has no controls.'
        + '\n\nThe limiter costs 6 ms of latency, which means it changes what gets rendered '
        + 'as well as what you hear. It is a seatbelt, not a mastering chain.',
    },
    {
      id: 'ab',
      title: 'Hear what you changed',
      anchor: () => $('ab'),
      says: 'Hold A/B to hear the saved version; let go and you are back on yours. '
        + 'Hold-to-compare rather than a toggle, so you cannot lose track of which one you '
        + 'are on.\n\n⌘Z goes back two hundred steps and crosses songs. A parameter drag is '
        + 'one step, not two hundred.',
    },
    {
      id: 'save',
      title: 'Keep it',
      anchor: () => $('save'),
      prefer: 'side',
      says: 'The menu holds your songs and Save. The dialog names which halves it is '
        + 'writing, and the dot on the menu button is the unsaved mark.\n\nYour mixes are '
        + 'kept in this browser, on this computer.',
      setup: () => showDrawer(),
    },
    {
      id: 'newsong',
      title: 'Roll one',
      anchor: () => $('newsong'),
      prefer: 'side',
      says: 'New song generates a whole arrangement from a style pack. Eleven of them: '
        + 'electropop, half-time dirge, surf spy, boom bap, motorik driver, bell box, '
        + 'parade march, dub chamber, house, techno, electro.\n\nLeave Style on AUTO and it '
        + 'picks one. A seed then chooses the key, the mode, the chord progression, the '
        + 'harmonic rhythm, the kick, snare and hat patterns, the bass figure, and each '
        + 'melody’s rhythm and shape.',
      setup: () => showDrawer(),
    },
    {
      id: 'starters',
      title: 'The three starters',
      anchor: () => $('newsong'),
      prefer: 'side',
      says: 'Full Song gives you kit, bass, chords and lead, playable the moment it appears. '
        + 'Beats Only gives you the kit. Blank gives you one silent track to write into.'
        + '\n\nBars sets the length, and the tempo comes from the pack unless you untick '
        + 'it. Every track arrives at unity with no effects — the mix is yours to make. '
        + 'There is no re-roll; if you do not like what came out, make another.',
      setup: () => showDrawer(),
      teardown: () => closePopups(),
    },
    {
      id: 'notes',
      title: 'Two ways in',
      anchor: () => $('rollbtn'),
      also: () => [$('seqbtn')],
      says: 'The piano roll is the melodic view of whichever track is selected — drum tracks '
        + 'get a kit grid instead. The step grid is the same notes as a pattern, steps you '
        + 'toggle.\n\nBoth are windows: leave them open and they follow the selection while '
        + 'the song runs. Sixteenths are the floor. There is nothing finer to draw.',
    },
    {
      id: 'record',
      title: 'Record',
      key: '⇧R',
      anchor: () => $('recbtn'),
      also: () => [$('midibtn'), $('oskbtn')],
      says: 'Turn on MIDI and the desk listens to your controller. Without one, the keyboard '
        + 'button puts two octaves on screen — or the song’s own kit on a drum track — '
        + 'and the computer keys play it.\n\nRecord writes what you play into the selected '
        + 'track, quantised to sixteenths and copied everywhere that part repeats. It only '
        + 'ever adds. ⌘Z takes back a phrase; Esc silences everything and drops whatever '
        + 'has not landed yet.',
    },
    {
      id: 'done',
      title: 'That’s the desk',
      says: 'Right-click is worth exploring — strips, track rows, effect slots and bars all '
        + 'have their own menus. Hover anything to find out what it is.\n\nThe ? brings this '
        + 'back.',
      end: true,
    },
  ];

  let plan = [];          // the steps this run will actually show
  let at = -1;            // index into plan; -1 is closed
  let raf = 0;
  let rung = [];          // elements currently wearing the ring, so they can be cleaned
  let revealed = null;
  let roomMade = false;   // did the tour fold a panel to fit the rack, and owe it back

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
    if (roomMade) await settle();
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
    if (roomMade) { restoreRoom(); roomMade = false; }
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
