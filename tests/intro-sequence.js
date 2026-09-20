// THE OPENING FILM: one arcade, one camera, eleven shots.
//
// What this suite is really guarding is the claim the film is built on — that
// every frame of it is a function of the film clock and nothing else. The old
// film seeded its static from Math.random() at enter(), so it could not be shot
// twice the same way and the screens gallery was capturing a different picture
// every run. The two determinism cases at the bottom are the ones that make the
// gallery and the video render trustworthy; the rest is timing and plumbing.
import { installDom } from './dom-stub.js';

installDom();

const { IntroState, IntroFilm } = await import('../src/game/intro.js');
const { INTRO_FILM, INTRO_SHOTS } = await import('../src/data/jokes.js');
const { SURGE_THEME, TITLE_THEME } = await import('../src/data/cabinets.js');
const { Audio } = await import('../src/engine/audio.js');
const { Input } = await import('../src/engine/input.js');
const { wrapText } = await import('../src/engine/sprites.js');
const { HUB_ROOM } = await import('../src/game/hub/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

const TICK = 1 / 60;
const DUR = INTRO_FILM.duration;

// The film must run identically with no audio context at all — that is the
// headless case, the muted case, and the ?goto=intro-before-any-bank case, and
// they all have to be the same film.
function spy() {
  const calls = [];
  Audio.sfx = (name, opt) => calls.push(['sfx', name, opt]);
  Audio.setBank = (bank, mix, arr, opt) => calls.push(['bank', bank, opt]);
  Audio.startCrowdCheer = (opt) => calls.push(['crowd-start', opt]);
  Audio.stopCrowdCheer = () => calls.push(['crowd-stop']);
  Audio.songBeat = () => null;
  Audio.cueLeadSec = () => 0.12;
  Audio.heardLatencySec = () => 0.03;
  return calls;
}

function run(state, until) {
  let elapsed = 0;
  while (state.t < until && elapsed < DUR + 4) { state.update(TICK); elapsed += TICK; }
  return elapsed;
}

// --- The timeline resolves to what it says it does -------------------------
{
  // Seven bars of hero section on top of the 18.00s of setup. The window is
  // tight because the length is now a consequence of the tempo rather than a
  // target: anything outside it means a shot is no longer a whole number of bars.
  assert(DUR > 32 && DUR < 35, `film runs ${DUR.toFixed(2)}s, inside the bar-locked cut`);
  let acc = 0;
  let ok = true;
  for (const s of INTRO_FILM.shots) {
    if (Math.abs(s.t0 - acc) > 1e-9) ok = false;
    if (!(s.seconds > 0) || Math.abs(s.sec - s.seconds) > 1e-9) ok = false;
    acc += s.sec;
  }
  assert(ok, 'every action shot starts at the previous end and uses its authored seconds');
  assert(Math.abs(acc - DUR) < 1e-9, 'the shot lengths sum to the published duration');
  const bounds = INTRO_FILM.shots.map((s) => s.t0);
  // The throw happens INSIDE the shot that also holds the terminal — no cutaway
  // to a prop, and no cut between the gesture and its consequence.
  const socketShot = INTRO_FILM.shots.find((s) => s.id === 'socket');
  assert(INTRO_FILM.cutAt > socketShot.t0 && INTRO_FILM.cutAt < socketShot.t1,
    'the music cut is the rocker contact, inside the switch shot');
  assert(!INTRO_FILM.shots.some((s) => s.id === 'reach'),
    'the separate switch close-up is gone');
  assert(bounds.includes(INTRO_FILM.slamAt), 'the downbeat is a shot boundary, not a constant');
  assert(INTRO_FILM.socketAt > INTRO_FILM.cutAt && INTRO_FILM.socketAt < socketShot.t1,
    'the bank empties after the throw, not before it');
  assert(INTRO_FILM.cabinetCutAt > INTRO_FILM.shots.find((s) => s.id === 'dark').t0
    && INTRO_FILM.cabinetCutAt < INTRO_FILM.shots.find((s) => s.id === 'dark').t1,
  'the socket is visibly off before the cabinet row begins to fail');
  assert(INTRO_FILM.slamAt > INTRO_FILM.cutAt, 'the silence has positive length');
const caps = INTRO_FILM.captions;
  const says = (t) => caps.some((c) => c.text.replace(/\n/g, ' ') === t);
  const arrivalLines = wrapText(caps.find((c) => c.text.startsWith('DON K. EGGSHELL')).text, 2000, 1, 12);
  assert(arrivalLines.join('|') === 'DON K. EGGSHELL, PHD.|FORTY YEARS OF DEFEAT BY PLUMBERS.|NEVER ON TOP.',
    'authored caption breaks do not duplicate the final word of the previous line');
  assert(says('DON K. EGGSHELL, PHD. FORTY YEARS OF DEFEAT BY PLUMBERS. NEVER ON TOP.'),
    'the forty-year grievance remains explicit');
  assert(says('THE ARCADE GOES DARK. EGGSHELL TAKES THE CREDIT.'),
    'the blackout gets Eggshell\'s dry self-awarded victory');
  assert(says('IF HE CANNOT WIN... NOBODY PLAYS.'), 'the threat line remains exact');
  assert(says('DUE TO BUDGET CUTS, ONLY ONE HERO CAN PLAY AT A TIME.'),
    'the relay rule uses the player-facing wording');
  assert(caps.filter((c) => c.text === 'EIGHT HEROES. ONE SOCKET.\nA RELAY BEGINS.').length === 1,
    'the relay line is said once');
  // THE SCRIPT RUNS ON ITS OWN CLOCK, not on the shot lengths. These are the
  // properties that were impossible while it did.
  const timed = caps.filter((c) => !c.withPrompt);
  let overlap = false, gap = null, prev = null;
  for (const c of timed) {
    if (prev && c.at < prev.t1 - 1e-9) overlap = true;
    if (prev && c.at > prev.t1 + 1e-6) gap = prev.t1;
    prev = c;
  }
  assert(!overlap, 'no two captions are ever on screen at once');
  // ...and the band is never empty either. A shot that did not want a caption
  // used to leave a hole, and the switch beat played five seconds in silence.
  assert(gap === null, `the caption band is never empty mid-film${gap ? ` (from ${gap.toFixed(2)}s)` : ''}`);
  assert(Math.abs(timed.at(-1).t1 - DUR) < 0.05,
    'the last timed line runs to the end of the film');
  const budget = timed.find((c) => c.text.startsWith('DUE TO BUDGET'));
  const relay = timed.find((c) => c.text.startsWith('EIGHT HEROES'));
  assert(Math.abs(budget.sec - relay.sec) < 0.5,
    'the two entrance lines get comparable time to each other');
  assert(budget.sec > 4 && relay.sec > 4, 'and enough of it to read');
  // Eggshell's whole section carries a line — the switch used to play silent.
  const eggshell = [4.5, 6.0, 7.5, 9.0, 11.0, 12.5, 13.5];
  assert(eggshell.every((t) => timed.some((c) => t >= c.at && t < c.t1)),
    'something is on screen throughout the villain\'s section');
  // THE CLOSER BELONGS TO THE PROMPT, not to the timeline. Authored to end with
  // the film it faded out on the last frame and snapped back under the prompt,
  // which read as the same line arriving twice.
  const closer = caps.find((c) => c.withPrompt);
  assert(closer && closer.text.startsWith('HISTORY WILL RECORD WHAT HAPPENS NEXT.'),
    'the closing line is the prompt\'s, and is shown only with it');
  assert(!timed.includes(closer) && !Number.isFinite(closer.at),
    'and it never appears on the film clock');
}

// --- It plays on a wall clock with nothing to listen to --------------------
{
  Input.clearAll();
  spy();
  let done = 0;
  const state = new IntroState({ onDone: () => { done++; } });
  state.enter();
  const seen = [];
  let elapsed = 0;
  while (!state.awaitingClose && elapsed < DUR + 2) {
    const id = IntroFilm.shotAt(state.t).id;
    if (seen.at(-1) !== id) seen.push(id);
    state.update(TICK);
    elapsed += TICK;
  }
  assert(done === 0 && state.awaitingClose, 'autoplay reaches the close prompt without exiting');
  assert(elapsed >= DUR - 0.001 && elapsed < DUR + 0.1, `autoplay lasts the authored ${DUR.toFixed(2)}s`);
  assert(seen.join(',') === INTRO_SHOTS.map((s) => s.id).join(','),
    'every shot plays, once, in the authored order');
}

// The close prompt is not a freeze-frame. Keep the film clock stopped at its
// authored end, but let the final grounded reaction rig continue animating
// until the player confirms the close.
{
  Input.clearAll();
  spy();
  const state = new IntroState({ onDone: () => {} });
  state.enter();
  state.seek(DUR);
  state.update(0.35);
  assert(state.awaitingClose && state.closeHoldT > 0,
    'the final celebration/idle clock continues under the close prompt');
  state.seek(DUR);
  assert(state.closeHoldT === 0, 'seeking the final frame resets the close-prompt animation clock');
}

// --- The cut: one bank swap, on the frame, with the right hole in it -------
{
  Input.clearAll();
  const calls = spy();
  const state = new IntroState({ onDone: () => {} });
  state.enter();
  const armed = calls.filter(([k]) => k === 'bank');
  assert(armed.length === 1 && armed[0][1] === TITLE_THEME,
    'enter() arms the title theme when nothing is playing');

  run(state, INTRO_FILM.cutAt - 0.5);
  assert(calls.filter(([k]) => k === 'bank').length === 1, 'nothing is swapped before the click');

  run(state, INTRO_FILM.cutAt + 0.05);
  const swaps = calls.filter(([k, bank]) => k === 'bank' && bank === SURGE_THEME);
  assert(swaps.length === 1, 'the driving bank is armed exactly once, at the cut');
  const gap = swaps[0]?.[2]?.gap ?? -1;
  const want = INTRO_FILM.slamAt - INTRO_FILM.cutAt - 0.03;   // less the heard latency
  assert(Math.abs(gap - want) < 0.05, `the pre-doors silence asked for (${gap.toFixed(3)}s) is latency-compensated`);

  run(state, DUR);
  assert(calls.filter(([k, bank]) => k === 'bank' && bank === SURGE_THEME).length === 1,
    'the swap never fires twice');
}

// --- Skipping still lands the downbeat on the door ------------------------
{
  Input.clearAll();
  const calls = spy();
  const state = new IntroState({ onDone: () => {} });
  state.enter();
  // Tap through to the dark shot rather than waiting for it.
  while (IntroFilm.shotAt(state.t).id !== 'dark') {
    Input.press('confirm');
    state.update(TICK);
    Input.clearAll();
  }
  const swap = calls.find(([k, bank]) => k === 'bank' && bank === SURGE_THEME);
  assert(!!swap, 'tapping into the dark still cuts the music');
  const gap = swap?.[2]?.gap ?? -1;
  const want = INTRO_FILM.slamAt - INTRO_FILM.cutAt - 0.03;
  assert(Math.abs(gap - want) < 0.05,
    'the hole is recomputed from the cut before the skipped dark shot, so the downbeat stays on the door');
}

// --- Cues are placed, not fired; a skipped span spends them ---------------
{
  Input.clearAll();
  const calls = spy();
  const state = new IntroState({ onDone: () => {} });
  state.enter();
  run(state, DUR);
  const sfx = calls.filter(([k]) => k === 'sfx');
  // The per-cabinet static is a BED, not a cue: it is edge-triggered off a
  // screen's own burst and has no authored moment to be placed on, so it is the
  // one sound in the film that is fired rather than scheduled.
  const placed = sfx.filter(([, name]) => name !== 'static');
  assert(placed.length > 0 && placed.every(([, , opt]) => Number.isFinite(opt?.inBeats) && opt.inBeats >= 0),
    'every authored cue is placed on the clock with a finite, non-negative lead');
  assert(sfx.some(([, name]) => name === 'static'), 'the dead screens cough in the dark');
  assert(sfx.filter(([, name]) => name === 'popSmall').length === 0,
    'the running entrance has no stationary roll-call pops');
  assert(sfx.some(([, name]) => name === 'powerDown'), 'the shutdown fires');
  assert(sfx.some(([, name]) => name === 'stripThrow'), 'the rocker is thrown');
  // The leap is the hub's own animation, so its sounds are the hub's own cues,
  // lifted onto the film's sheet at that animation's phase times. `boom` is the
  // glass; `land` and `jump` are the little figure inside it.
  assert(sfx.some(([, name]) => name === 'boom')
    && sfx.some(([, name]) => name === 'land')
    && sfx.some(([, name]) => name === 'jump')
    && sfx.some(([, name]) => name === 'portal'),
  'the cabinet dive carries the shared leap, glass, landing and exit cues');
  assert(calls.filter(([k]) => k === 'crowd-start').length === 1, 'the crowd bed starts exactly once');
}
{
  Input.clearAll();
  const calls = spy();
  const state = new IntroState({ onDone: () => {} });
  state.enter();
  while (!state.awaitingClose) { Input.press('confirm'); state.update(TICK); Input.clearAll(); }
  const pops = calls.filter(([k, name]) => k === 'sfx' && name === 'popSmall');
  assert(pops.length === 0,
    'tapping through the running entrance does not manufacture arrival pops');
}

// --- Input and lifecycle ---------------------------------------------------
{
  Input.clearAll();
  spy();
  let done = 0;
  const state = new IntroState({ onDone: () => { done++; } });
  state.enter();
  const first = IntroFilm.shotAt(state.t);
  Input.press('confirm');
  state.update(TICK);
  Input.clearAll();
  assert(done === 0, 'a tap does not skip the film');
  assert(Math.abs(state.t - first.t1) < 1e-6, 'a tap advances to the next shot');

  Input.press('confirm');
  state.update(TICK);
  Input.clearAll();
  while (!state.awaitingClose) { Input.press('confirm'); state.update(TICK); Input.clearAll(); }
  Input.press('confirm');
  state.update(TICK);
  Input.clearAll();
  assert(done === 1, 'one more tap closes it once every shot has played');
  state.update(TICK);
  assert(done === 1, 'the completion callback fires only once');
}
{
  Input.clearAll();
  const calls = spy();
  let backed = 0;
  const state = new IntroState({ onDone: () => { backed++; } });
  state.enter();
  Input.press('back');
  state.update(TICK);
  Input.clearAll();
  assert(backed === 1, 'Back exits the film');
  assert(calls.at(-1)?.[0] === 'crowd-stop', 'Back stops the crowd bed');
}
{
  // The leak the old film had: it defined no exit() at all, so leaving by any
  // route that was not its own close left the crowd cheering underneath
  // whatever came next.
  Input.clearAll();
  const calls = spy();
  const state = new IntroState({ onDone: () => {} });
  state.enter();
  run(state, INTRO_FILM.shots.find((s) => s.id === 'lineup').t0 + 0.5);
  assert(calls.some(([k]) => k === 'crowd-start'), 'the crowd is running');
  state.exit();
  assert(calls.at(-1)?.[0] === 'crowd-stop', 'exit() stops the crowd without going through finish()');
}

// --- DETERMINISM: the same second of film is the same picture -------------
//
// The fingerprint is everything the picture is made of that a human would
// notice changing: where the camera is, where the villain is and which rotor
// frame he is on, how open the door is, how far in each hero has landed, and
// which screens have died. If any of it ever depends on Math.random(), on the
// wall clock, or on what the music happens to be doing, these two cases fail.
const SHOT_T = (id) => INTRO_FILM.shots.find((s) => s.id === id).t0;
const DOOR_T = SHOT_T('doors');
const DIVE_SHOT_T = SHOT_T('dive');
const PROBES = [0, 1.7, 3.9, 4.4, 6.2, 7.6, 9.9, 11.8, 12.0, 12.5, 13.4, 14.3,
  14.4, 15.9, 17.2, DOOR_T, DOOR_T + 0.20, DOOR_T + 0.50, DOOR_T + 1.22,
  IntroFilm.LORENZO_REVEAL_T - TICK, IntroFilm.LORENZO_REVEAL_T,
  IntroFilm.LORENZO_RUN_T - TICK, IntroFilm.LORENZO_RUN_T,
  IntroFilm.GROUP_RUN_T - TICK, IntroFilm.GROUP_RUN_T,
  IntroFilm.SCREEN_REVEAL_AT - TICK, IntroFilm.SCREEN_REVEAL_AT,
  DIVE_SHOT_T, IntroFilm.DIVE_AT - TICK, IntroFilm.DIVE_AT,
  IntroFilm.SCREEN_VISIBLE_AT - TICK, IntroFilm.SCREEN_VISIBLE_AT,
  IntroFilm.DIVE_END - TICK, IntroFilm.DIVE_END, 26.6, DUR - 0.05];

function fingerprint(t) {
  const gate = IntroFilm.introGate();
  const cam = IntroFilm.cameraAt(t, gate);
  const c = IntroFilm.copterAt(t);
  const d = IntroFilm.diveAt(t);
  const out = [
    t.toFixed(4), cam.x.toFixed(4), cam.y.toFixed(4), cam.zoom.toFixed(5),
    IntroFilm.doorOpenAt(t).toFixed(5),
    IntroFilm.roomLitAt(t).toFixed(5),
    IntroFilm.stripLiveAt(t) ? 1 : 0,
    c ? `${c.x.toFixed(4)},${c.y.toFixed(4)},${c.seat.toFixed(5)}` : 'none',
    d ? `${d.x.toFixed(4)},${d.inside ? 1 : 0},${d.flash.toFixed(5)}` : 'none',
  ];
  for (let i = 0; i < IntroFilm.HERO_IDS.length; i++) {
    const p = IntroFilm.heroPosAt(t, i);
    out.push(`${IntroFilm.heroLandedAt(t, i).toFixed(5)}:${p.x.toFixed(4)}:${p.moving ? 1 : 0}`);
  }
  for (let i = 0; i < 6; i++) {
    const d = IntroFilm.cabinetDeathAt(t, i);
    out.push(`${d.dead ? 1 : 0}:${d.flash.toFixed(5)}`);
  }
  return out.join('|');
}

// --- Staging contracts -----------------------------------------------------
{
  const target = IntroFilm.CAB_CX[IntroFilm.DIVE_CAB];
  const lastMark = IntroFilm.heroX(IntroFilm.HERO_IDS.length - 1);
  assert(IntroFilm.DIVE_CAB === 0, 'Lorenzo dives into the first Plumber Panic cabinet');
  assert(target > lastMark, 'the dive target sits beyond the last hero mark');
  assert(IntroFilm.CAB_CX[0] - lastMark > 150,
    'the hero runway clears the cabinet bank by a large visual gap');
  assert(IntroFilm.SOCKET_CX - IntroFilm.CAB_CX[IntroFilm.CAB_CX.length - 1] > 120,
    'the socket remains a separate far-right electrical destination');
  // A one-sheet advertises the thing under it, so there is exactly one per
  // machine and none anywhere else. Continuing the rhythm over bare runway is
  // wallpaper by another route, and the wall beside the last cabinet stays clean
  // — no conduit, no loose wire, and no poster for a machine that is not there.
  assert(IntroFilm.POSTER_XS.length === IntroFilm.CAB_CX.length
    && IntroFilm.POSTER_XS.every((x, i) => x === IntroFilm.CAB_CX[i]),
  'there is one poster per machine and not one more');
  // The ceiling, though, does run the length of the room the way the concourse
  // does — including over the runway, which a fixed loop starting at the
  // cabinets left entirely unlit.
  const bays = IntroFilm.bayXsIn(0, IntroFilm.CAB_CX[0]);
  assert(bays.length > 4 && bays.every((x, i) => i === 0
    || Math.abs((x - bays[i - 1]) - HUB_ROOM.bayPitch) < 1e-6),
  'the bay grid runs back across the runway on the hub cabinet pitch');
  const entryTimes = IntroFilm.HERO_IDS.map((_, i) => IntroFilm.heroOnStageT(i));
  const STAG = IntroFilm.FOLLOWER_STAGGER;
  assert(Math.abs(entryTimes[0] - IntroFilm.LORENZO_REVEAL_T) < 1e-6
    && Math.abs(entryTimes[1] - IntroFilm.GROUP_RUN_T) < 1e-6
    && Math.abs(entryTimes.at(-1) - (IntroFilm.GROUP_RUN_T + 6 * STAG)) < 1e-6,
  'the doors reveal Lorenzo idle, then the seven pour out behind him');
  const crossings = entryTimes.slice(1).map((t, i) => (i ? t - entryTimes[i] : null)).filter(Boolean);
  assert(crossings.every((d) => Math.abs(d - STAG) < 1e-9),
    'the door crossings are evenly spaced on the music grid, not on round decimals');
  // The door is a bottleneck, not a queue: the whole seven are through it in a
  // third of a second, which is what lets the camera start moving while the run
  // is still gathering.
  assert(Math.abs(STAG - IntroFilm.SIXTEENTH / 2) < 1e-9 && 6 * STAG < 0.40,
    `all seven clear the doorway inside ${(6 * STAG).toFixed(2)}s`);
  // Off the downbeat itself, not off the 18.00 it used to fall on: the pre-door
  // shots are still being retimed for reading speed and these must follow.
  assert(Math.abs(IntroFilm.LORENZO_RUN_T - (INTRO_FILM.slamAt + IntroFilm.BAR)) < 1e-9,
    'Lorenzo launches on the downbeat of bar two');
  assert(Math.abs(IntroFilm.DIVE_AT - (INTRO_FILM.slamAt + IntroFilm.BAR * 4)) < 1e-9,
    'the takeoff is a downbeat');
  // THE LEAP IS THE HUB'S LEAP. The shared animation moves him from the
  // CABINET's x, not from a distant mark, so his run has to deliver him onto the
  // machine — hand it a launch point a bay short and he teleports on the first
  // leap frame. This is the assertion that catches that.
  assert(IntroFilm.LORENZO_LAUNCH_X === IntroFilm.CAB_CX[IntroFilm.DIVE_CAB],
    'the run ends on the machine the shared leap starts from');
  assert(Math.abs(IntroFilm.SCREEN_VISIBLE_AT - IntroFilm.DIVE_AT - 0.60) < 1e-9,
    'the glass crossing is the shared animation\'s own, not a time of our own');
  const idle = IntroFilm.heroPosAt(IntroFilm.LORENZO_REVEAL_T + 0.35, 0);
  const run = IntroFilm.heroPosAt(IntroFilm.LORENZO_RUN_T + 0.35, 0);
  assert(!idle.moving && Math.abs(idle.x - 68) < 1e-6 && run.moving,
    'Lorenzo holds an idle reveal beat before launching the group run');
  // The opening reveal deliberately stays wide while the seven followers
  // cross. The pan begins only after the last one is visible, then the final
  // pull-out takes a full six beats so the cabinet remains readable.
  const gate = IntroFilm.introGate();
  const heldBefore = IntroFilm.cameraAt(IntroFilm.HERO_PAN_START_T - 0.01, gate);
  const heldAt = IntroFilm.cameraAt(IntroFilm.HERO_PAN_START_T, gate);
  assert(Math.abs(heldBefore.x - heldAt.x) < 1e-6
    && Math.abs(heldBefore.zoom - heldAt.zoom) < 1e-6,
  'the hero reveal holds its wider framing until the last follower crosses');
  const afterHold = IntroFilm.cameraAt(IntroFilm.HERO_PAN_START_T + IntroFilm.BEAT, gate);
  assert(afterHold.x > heldAt.x, 'the camera starts its purposeful pan after the full reveal');
  assert(IntroFilm.PULL_OUT_SEC === IntroFilm.BEAT * 6,
    'the final cabinet hold uses the slower six-beat ease-out');
  const cabinetCentreT = IntroFilm.SCREEN_VISIBLE_AT + IntroFilm.PULL_OUT_SEC;
  const centred = IntroFilm.cameraAt(cabinetCentreT, gate);
  const held = IntroFilm.cameraAt(cabinetCentreT + 1.0, gate);
  assert(Math.abs(centred.x - IntroFilm.CAB_CX[IntroFilm.DIVE_CAB]) < 1e-6
    && Math.abs(held.x - centred.x) < 1e-6,
  'the pan stops on the Plumber Panic centre and holds through the reaction');
  // The last to halt is still moving while his run inside the screen plays out.
  const lastIn = IntroFilm.FOLLOWER_PATHS.reduce((b, p, k) => (p.settle > IntroFilm.FOLLOWER_PATHS[b - 1].settle ? k + 1 : b), 1);
  const before = IntroFilm.heroPosAt(IntroFilm.DIVE_END - 0.02, lastIn).x;
  const settled = IntroFilm.heroPosAt(IntroFilm.heroArrivalT(lastIn) + 0.02, lastIn).x;
  assert(settled !== before, 'the observers continue advancing into their own final marks');
  // THE FINISH IS TWO WAVES, IN REVERSE ORDER. The three nearest him when he
  // jumps brake on that frame and stop SHORT of the machine; the four behind
  // carry past the glass and stop on the far side — and only once his run
  // inside the screen has had a beat to register, so nobody crosses in front
  // of it while it is the picture. Each wave pulls up as one event; the
  // reactions are what stagger.
  const paths = IntroFilm.FOLLOWER_PATHS;
  const near = paths.filter((p) => p.wave === 'near'), far = paths.filter((p) => p.wave === 'far');
  assert(near.length === 4 && far.length === 3, 'the first four pull up short, the last three carry past');
  // The far three are the slow ones: overtaken early, a bay or more back when
  // he jumps, and from that frame they SPRINT — faster than anything in the run
  // — so that they cross the picture only once he has left it.
  const takeoffCam = IntroFilm.cameraAt(IntroFilm.DIVE_AT, gate);
  const takeoffEdge = takeoffCam.x - gate.w / (2 * takeoffCam.zoom);
  assert(far.every((p) => IntroFilm.heroPosAt(IntroFilm.DIVE_AT, paths.indexOf(p) + 1).x < takeoffEdge - 60),
    'the far three are well back, out of the frame he jumps from');
  assert(far.every((p) => p.vBrake > p.v1 * 1.6 && p.vBrake > IntroFilm.LORENZO_V1),
    'and sprint past faster than anyone ran, Lorenzo included');
  // Each wave pulls up inside a quarter of a beat of its base, but NOT on one
  // frame: a shared frame read as a cue firing, and the marks are uneven for
  // the same reason.
  assert(near.every((p) => p.settle > IntroFilm.DIVE_AT + 0.5 && p.settle < IntroFilm.SCREEN_VISIBLE_AT + 0.9),
    'the near four pull up inside the beat after the glass');
  const farHalts = far.map((p) => p.settle).sort((a, b) => a - b);
  assert(farHalts[2] - farHalts[0] > 0.6,
    'the far three halt one at a time across most of a second, not as a wave');
  // Evenly spaced by design; what must NOT be even is how they get there.
  assert(new Set(paths.map((p) => p.settle.toFixed(3))).size === 7, 'no two halts share a frame');
  assert(new Set(paths.map((p) => p.brake.toFixed(3))).size === 7, 'no two skids are the same length');
  assert(new Set(near.map((p) => p.brakeAt.toFixed(3))).size === near.length,
    'the near four do not all react to the jump on the same frame');
  assert(near.every((p) => p.brakeAt >= IntroFilm.DIVE_AT && p.brakeAt < IntroFilm.DIVE_AT + 0.2),
    'the near wave brakes as he leaves the floor, each on their own reaction');
  const glassL = IntroFilm.CAB_CX[IntroFilm.DIVE_CAB] - 24;
  assert(near.every((p) => p.target < glassL - 8),
    'the near wave never reaches the glass');
  const crossAt = (p) => {
    const i = paths.indexOf(p) + 1;
    for (let t = p.t0; t < DUR; t += 1 / 120) if (IntroFilm.heroPosAt(t, i).x >= glassL) return t;
    return Infinity;
  };
  const glassCrossings = far.map(crossAt).sort((a, b) => a - b);
  const nearHalts = near.map((p) => p.settle).sort((a, b) => a - b);
  // NOBODY CROSSES THE PICTURE WHILE HE IS IN IT. The first crossing waits for
  // his run inside the screen to finish, not merely for the glass to take him.
  assert(glassCrossings[0] >= IntroFilm.FAR_CROSS_OK,
    `no one passes the machine until half a second after his jump inside it (${(glassCrossings[0] - IntroFilm.FAR_CROSS_OK).toFixed(2)}s after)`);
  void nearHalts;
  assert(glassCrossings[2] - glassCrossings[0] > 0.3 && new Set(glassCrossings.map((t) => t.toFixed(2))).size === 3,
    `the three go past one at a time, not as a wave (${(glassCrossings[2] - glassCrossings[0]).toFixed(2)}s apart)`);
  assert(near.every((p) => far.every((q) => p.target < q.target)),
    'the fast ones end on the left and the slow ones on the right');
  const reactionStarts = [1, 2, 3, 4, 5, 6, 7].map((i) => {
    for (let t = IntroFilm.DIVE_AT; t < DUR; t += 1 / 120) {
      if (IntroFilm.observerReactionAt(t, i)?.kind === 'celebrate') return t;
    }
    return null;
  });
  // Three celebrate — Grumpos, Clara, B-33P — and hold it to the end; the other
  // four just stop and watch. Seven cheering is a curtain call.
  const celebrants = ['grumpos', 'clara', 'b33p'];
  const isCel = (i) => celebrants.includes(IntroFilm.HERO_IDS[i]);
  assert([1, 2, 3, 4, 5, 6, 7].every((i) => (reactionStarts[i - 1] !== null) === isCel(i)),
    'exactly the three celebrants get a reaction beat');
  assert(celebrants.every((id) => IntroFilm.observerReactionAt(DUR - 0.05, IntroFilm.HERO_IDS.indexOf(id))?.kind === 'celebrate'),
    'the celebrants are still celebrating on the last frame');
  const celStarts = [1, 2, 3, 4, 5, 6, 7].filter(isCel).map((i) => reactionStarts[i - 1]);
  assert(new Set(celStarts.map((t) => t.toFixed(3))).size === celStarts.length,
    'no two celebrations start on the same frame');
  assert(Math.max(...celStarts) < DUR - 0.5,
    'the last celebration lands with the film still running');
  const watcher = IntroFilm.HERO_IDS.indexOf('rusty');
  assert(!IntroFilm.observerReactionAt(IntroFilm.heroArrivalT(watcher) + 0.7, watcher),
    'a non-celebrant settles into an animated idle hold');
  const observerBeforeExit = IntroFilm.observerPosAt(IntroFilm.DIVE_END - 0.02, lastIn);
  assert(observerBeforeExit.moving, 'followers keep running through Lorenzo\'s visible cabinet exit');
  const lorenzoBreak = IntroFilm.diveRunAt(IntroFilm.DIVE_BREAK.t0 + 0.4);
  const followerBreak = IntroFilm.heroPosAt(IntroFilm.DIVE_BREAK.t0 + 0.4, IntroFilm.HERO_IDS.length - 1);
  assert(lorenzoBreak != null && followerBreak.x < lorenzoBreak,
    'Lorenzo pulls ahead before the cabinet jump');
  {
    let lead = true;
    for (let t = IntroFilm.GROUP_RUN_T; t < IntroFilm.DIVE_AT; t += 1 / 30) {
      const lorenzoX = IntroFilm.heroPosAt(t, 0).x;
      for (let i = 1; i < IntroFilm.HERO_IDS.length; i++) {
        if (IntroFilm.heroPosAt(t, i).x >= lorenzoX) lead = false;
      }
    }
    assert(lead, 'every follower stays behind Lorenzo until his dive begins');
  }
  const runwayMoment = IntroFilm.SCREEN_REVEAL_AT - 0.1;
  assert(IntroFilm.HERO_IDS.every((_, i) => IntroFilm.heroPosAt(runwayMoment, i).moving),
    'the full cast is still running together before Lorenzo breaks away');
  assert(IntroFilm.heroPosAt(runwayMoment, IntroFilm.HERO_IDS.length - 1).x
    < target - 150,
  'the runners keep a long runway gap before the first cabinet');
  const rightCrosses = [1, 2, 3].map((i) => {
    for (let t = IntroFilm.SCREEN_VISIBLE_AT; t < IntroFilm.DIVE_END + 2; t += 1 / 60) {
      if (IntroFilm.heroPosAt(t, i).x >= target) return t;
    }
    return Infinity;
  });
  assert(rightCrosses.every((t) => t >= IntroFilm.SCREEN_VISIBLE_AT),
    'right-side followers only cross the cabinet after Lorenzo is visible inside the screen');
  const preRevealGate = { x: 0, y: 0, w: 480, h: 186, portrait: false };
  const preReveal = IntroFilm.cameraAt(IntroFilm.SCREEN_REVEAL_AT - 1 / 60, preRevealGate);
  assert(preReveal.x + preRevealGate.w / (2 * preReveal.zoom) < target - 24 + 1e-3,
    'the first cabinet stays outside the landscape frame during the shared run');
  const preRevealPortrait = IntroFilm.cameraAt(IntroFilm.SCREEN_REVEAL_AT - 1 / 60,
    { ...preRevealGate, portrait: true });
  assert(preRevealPortrait.x + preRevealGate.w / (2 * preRevealPortrait.zoom) < target - 24 + 1e-3,
    'the first cabinet stays outside the portrait frame during the shared run');
  const socketShot = INTRO_FILM.shots.find((s) => s.id === 'socket');
  const darkShot = INTRO_FILM.shots.find((s) => s.id === 'dark');
  assert(socketShot && darkShot
    && INTRO_FILM.socketAt > socketShot.t0 && INTRO_FILM.socketAt < socketShot.t1
    && Math.abs(socketShot.t1 - darkShot.t0) < 1e-9,
    'the terminal empties inside the switch shot, before the cabinet row dies');
  // Cause then effect, with the villain still in the frame for both.
  assert(IntroFilm.copterAt(INTRO_FILM.cutAt + 0.01) !== null
    && IntroFilm.copterAt(socketShot.t1 - 0.01) !== null,
  'Eggshell stays over his own handiwork while the bank empties');
  assert(IntroFilm.copterAt(darkShot.t0 + 0.01) === null,
    'and is gone by the time the row fails');
  // HE SITS ON IT, THEN LIFTS OFF. Airborne when the shot opens, the hull on
  // the bar's switch end on the frame of the cut, a beat on it, and back up in
  // the air while the bank empties.
  {
    const early = IntroFilm.copterAt(socketShot.t0 + 0.5);
    const cut = IntroFilm.copterAt(INTRO_FILM.cutAt);
    const late = IntroFilm.copterAt(INTRO_FILM.cutAt + IntroFilm.SEAT_HOLD_SEC * 0.5);
    const up = IntroFilm.copterAt(socketShot.t1 - 0.05);
    assert(INTRO_FILM.cutAt + IntroFilm.SEAT_HOLD_SEC + IntroFilm.LIFT_SEC < socketShot.t1,
      'the lift-off finishes inside the switch shot');
    assert(up.seat === 0 && up.drift === 1 && up.y <= IntroFilm.LIFT_Y + 1e-9
      && up.y < IntroFilm.SEAT_Y - 30,
      'he is back in the air, hovering, before the shot ends');
    assert(early.seat === 0 && early.drift === 1, 'he is still hovering when the switch shot opens');
    assert(IntroFilm.SEAT_DROP_T > socketShot.t0 && IntroFilm.SEAT_DROP_T < INTRO_FILM.cutAt,
      'the descent starts inside the switch shot and ends on the cut');
    assert(cut.seat > 0.999 && Math.abs(cut.x - IntroFilm.SEAT_X) < 1e-9
      && Math.abs(cut.y - IntroFilm.SEAT_Y) < 1e-6,
      'the hull is on the switch end of the bar on the frame of the cut');
    assert(late.seat > 0.999 && late.drift === 0 && Math.abs(late.y - IntroFilm.SEAT_Y) < 1.7,
      'and he sits on it, unswaying, for a beat');
    // He lands ON the rocker, at the switch end — not somewhere along the bar.
    assert(Math.abs(IntroFilm.SEAT_X - IntroFilm.ROCKER_X) < 1e-9,
      'the seat is the rocker, so stretching the bar cannot move him off it');
  }
  const cabinetMid = (IntroFilm.CAB_CX[0] + IntroFilm.CAB_CX.at(-1)) / 2;
  assert(darkShot
    && darkShot.cam.from.cx === cabinetMid
    && darkShot.portrait.from.cx === cabinetMid,
  'the shutdown frame centres the cabinet bank in both orientations');
  assert(socketShot && socketShot.cam.from.cx > target + 400,
    'the terminal insert is far off the cabinet composition');
  assert(IntroFilm.introSocketProgressAt(INTRO_FILM.cutAt - 0.01) === 1
    && socketShot
    && IntroFilm.introSocketProgressAt(socketShot.t0) === 1
    && IntroFilm.introSocketProgressAt(socketShot.t1) === 0
    && IntroFilm.cabinetCutAt > socketShot.t1,
  'the socket starts filled, empties deterministically, then the cabinets begin their cut');
  assert(IntroFilm.diveCabWakeAt(IntroFilm.DIVE_AT - 0.1) > 0
    && IntroFilm.diveCabWakeAt(IntroFilm.SCREEN_VISIBLE_AT) === 1
    && IntroFilm.diveCabWakeAt(IntroFilm.DIVE_END + 0.2) === 1,
  'the target cabinet wakes for the jump and stays on through the final hold');
}

// Check displacement and stride reference, not merely the moving flag: a
// running pose over a stationary or oscillating position is still a pause.
{
  let continuous = true;
  for (let i = 1; i < IntroFilm.HERO_IDS.length; i++) {
    let previous = null;
    const end = IntroFilm.heroArrivalT(i);
    for (let t = IntroFilm.heroOnStageT(i); t <= end; t += 1 / 60) {
      const p = IntroFilm.heroPosAt(t, i);
      if (previous?.moving && p.moving
        && (!(p.x > previous.x) || p.ref !== previous.ref)) continuous = false;
      if (!p.moving && t < end - 1 / 60) continuous = false;
      previous = p;
    }
  }
  assert(continuous, 'followers advance continuously with an unbroken stride until their final marks');
}
{
  let accelerating = true;
  for (let i = 1; i < IntroFilm.HERO_IDS.length; i++) {
    const start = IntroFilm.heroOnStageT(i);
    const a = IntroFilm.heroPosAt(start + 0.75, i).x;
    const b = IntroFilm.heroPosAt(start + 1.75, i).x;
    const c = IntroFilm.heroPosAt(start + 2.75, i).x;
    if (!((b - a) > (a - IntroFilm.heroPosAt(start - 0.01, i).x)
      && (c - b) > (b - a))) accelerating = false;
  }
  assert(accelerating, 'the longer runway visibly builds each follower\'s pace before deceleration');
}

// The sag that used to live here was a property of interpolating POSITION with
// endpoint speeds the span could not support. Now the velocity is the authored
// thing, so check the velocity: strictly rising through the chase, never
// negative anywhere, and monotonically falling once the brake is on.
{
  let rising = true, negative = false, falling = true;
  for (let i = 1; i < IntroFilm.HERO_IDS.length; i++) {
    const path = IntroFilm.FOLLOWER_PATHS[i - 1];
    let prev = null;
    for (let t = path.t0; t < path.runEnd; t += 1 / 60) {
      const v = IntroFilm.heroSpeedAt(t, i);
      if (v < 0) negative = true;
      if (prev !== null && v < prev - 1e-9) rising = false;
      prev = v;
    }
    prev = null;
    for (let t = path.brakeAt; t <= path.settle; t += 1 / 60) {
      const v = IntroFilm.heroSpeedAt(t, i);
      if (v < 0) negative = true;
      if (prev !== null && v > prev + 1e-9) falling = false;
      prev = v;
    }
    if (Math.abs(IntroFilm.heroSpeedAt(path.settle, i)) > 1e-6) falling = false;
  }
  assert(rising, 'every follower accelerates monotonically across the whole chase');
  assert(!negative, 'no runner is ever handed a negative speed');
  assert(falling, 'the brake falls monotonically and arrives at exactly zero');
}
{
  // EVERY follower leaves the floor once on the way, and no two together — the
  // point of the hops is that the group stops moving as a single object, which
  // a shared cadence would undo.
  const hops = IntroFilm.HERO_HOPS;
  const who = new Set(hops.map((h) => h.i));
  assert(hops.length === 7 && who.size === 7 && !who.has(0),
    'all seven followers hop once, and Lorenzo does not');
  const times = hops.map((h) => h.t0).sort((a, b) => a - b);
  const apart = times.slice(1).map((t, i) => t - times[i]);
  assert(apart.every((d) => d > 0.15), 'no two hops land together');
  const spread = Math.max(...apart) - Math.min(...apart);
  assert(spread > 0.15, `the hops are scattered, not on a cadence (spread ${spread.toFixed(2)}s)`);
  // Airborne and back down inside the run, never mid-brake.
  for (const h of hops) {
    const path = IntroFilm.FOLLOWER_PATHS[h.i - 1];
    assert(h.t0 > path.t0 && h.t0 + h.dur < IntroFilm.SCREEN_VISIBLE_AT,
      `hero ${h.i} hops while it is actually running`);
    assert(IntroFilm.heroHopAt(h.t0 + h.dur / 2, h.i) > 1
      && IntroFilm.heroHopAt(h.t0 - 0.01, h.i) === 0
      && IntroFilm.heroHopAt(h.t0 + h.dur + 0.01, h.i) === 0,
    `hero ${h.i} leaves the floor and lands again`);
  }
}
{
  // Lorenzo's end speed is solved from the distance, so the launch lands ON the
  // bay mark rather than near it. If this drifts, the dive starts from a
  // position his run never actually reached.
  const at = IntroFilm.heroPosAt(IntroFilm.DIVE_AT, 0).x;
  assert(Math.abs(at - IntroFilm.LORENZO_LAUNCH_X) < 0.5,
    'Lorenzo\'s integrated run ends exactly on his launch mark');
  assert(IntroFilm.LORENZO_V1 > IntroFilm.LORENZO_V0,
    'he is faster at the jump than he was off the mark');
  assert(IntroFilm.FOLLOWER_PATHS.every((p) => p.v1 < IntroFilm.LORENZO_V1),
    'no follower is ever faster than the leader');
}
{
  // The camera is the point of the re-cut: it takes its x from the runner, so
  // the room streams past at the pace he is running. Measured as travel rate,
  // because that is what the audience actually sees moving.
  const gate = IntroFilm.introGate();
  let peak = 0, prev = null;
  for (let t = IntroFilm.LORENZO_RUN_T; t < IntroFilm.DIVE_AT; t += 1 / 60) {
    const cx = IntroFilm.cameraAt(t, gate).x;
    if (prev !== null) peak = Math.max(peak, (cx - prev) * 60);
    prev = cx;
  }
  assert(peak > 100, `the background streams with the run (peak ${peak.toFixed(0)} u/s)`);
  // And the target has to be on screen well before he leaves the ground, or the
  // jump is aimed at something the audience has not been shown.
  let reveal = null;
  for (let t = IntroFilm.LORENZO_RUN_T; t < IntroFilm.DIVE_AT; t += 1 / 60) {
    const cam = IntroFilm.cameraAt(t, gate);
    if (cam.x + gate.w / (2 * cam.zoom) >= IntroFilm.CAB_CX[0] - 24) { reveal = t; break; }
  }
  assert(reveal !== null && IntroFilm.DIVE_AT - reveal > 0.6,
    'the audience sees the target well before the takeoff');
  // AND THE CHASE STAYS IN THE PICTURE. The frame is wide and only gently ahead
  // of the leader, rather than narrow and running off up the room in front of
  // him — which looked correct in the numbers and put all but two of the pack
  // behind the left edge.
  // Not all eight, all the time — a frame wide enough to guarantee that is a
  // frame nobody is readable in, and they all end up together anyway. What the
  // run has to keep is the leader and a chase behind him; a trailing hero
  // dropping off the left edge is allowed.
  // ...through the CHASE. From the reveal the frame hands over to the machine
  // and closes on it, and for that last bar the leader running alone into a
  // frame that has already arrived is the shot.
  let worst = 8;
  for (let t = IntroFilm.GROUP_RUN_T + 0.5; t <= IntroFilm.SCREEN_REVEAL_AT; t += 1 / 30) {
    const cam = IntroFilm.cameraAt(t, gate);
    const half = gate.w / (2 * cam.zoom);
    const seen = IntroFilm.HERO_IDS
      .map((_, i) => IntroFilm.heroPosAt(t, i).x)
      .filter((x) => x > cam.x - half - 24 && x < cam.x + half + 24).length;
    worst = Math.min(worst, seen);
  }
  assert(worst >= 4, `the leader is never running alone (worst ${worst}/8 in frame)`);
  // ...and there is a real window where the WHOLE cast is on screen together.
  // Not every frame — the leader outruns them and that is the point — but the
  // run has to show you who it is that is running.
  let together = 0;
  for (let t = IntroFilm.GROUP_RUN_T; t <= IntroFilm.DIVE_AT; t += 1 / 60) {
    const cam = IntroFilm.cameraAt(t, gate);
    const half = gate.w / (2 * cam.zoom);
    const xs = IntroFilm.HERO_IDS.map((_, i) => IntroFilm.heroPosAt(t, i).x);
    if (xs.every((x) => x > cam.x - half - 16 && x < cam.x + half + 16)) together += 1 / 60;
  }
  assert(together > 1.0, `all eight share the frame for a readable stretch (${together.toFixed(2)}s)`);
  // THEY CHANGE PLACES. Counted as every time any pair swaps order at any
  // point from the door to the last halt — not as a before/after comparison,
  // which is blind to a pass that is later undone, and a pass that is undone is
  // exactly the disorganised arrival wanted here.
  let passes = 0;
  for (let i = 1; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      let prev = null;
      for (let t = IntroFilm.GROUP_RUN_T + 0.5; t <= DUR; t += 1 / 60) {
        const s = Math.sign(IntroFilm.heroPosAt(t, i).x - IntroFilm.heroPosAt(t, j).x);
        if (prev !== null && s !== 0 && s !== prev) passes++;
        if (s !== 0) prev = s;
      }
    }
  }
  assert(passes >= 2, `runners overtake each other on the way (${passes} changes of place)`);
  // AND THE PAN ENDS ON THE MACHINE. The whole chase is aimed at one cabinet, so
  // the move that follows them has to finish with it in the middle of the frame.
  const settled = IntroFilm.cameraAt(DUR - 0.1, gate);
  // The machine is centred from the TAKEOFF, not from the end: he jumps out of
  // a frame that has already stopped, and x never changes again after it.
  let xMoves = 0, offCentre = 0;
  for (let t = IntroFilm.DIVE_AT + 1 / 60; t <= DUR; t += 1 / 60) {
    const c = IntroFilm.cameraAt(t, gate);
    if (Math.abs(c.x - IntroFilm.CAB_CX[IntroFilm.DIVE_CAB]) > 0.5) offCentre++;
    if (Math.abs(c.x - IntroFilm.cameraAt(t - 1 / 60, gate).x) > 1e-6) xMoves++;
  }
  assert(offCentre === 0 && xMoves === 0,
    `from the takeoff the target is centred and the camera x never moves (${offCentre} off, ${xMoves} moves)`);
  assert(Math.abs(settled.x - IntroFilm.CAB_CX[IntroFilm.DIVE_CAB]) < 6,
    `the camera settles with the target cabinet centred (off by ${(settled.x - IntroFilm.CAB_CX[IntroFilm.DIVE_CAB]).toFixed(1)})`);
  // And the gather is what makes that safe: everybody is in the last shot.
  const endCam = IntroFilm.cameraAt(DUR - 0.1, gate);
  const endHalf = gate.w / (2 * endCam.zoom);
  const endSeen = IntroFilm.HERO_IDS.slice(1)
    .map((_, i) => IntroFilm.heroPosAt(DUR - 0.1, i + 1).x)
    .filter((x) => x > endCam.x - endHalf && x < endCam.x + endHalf).length;
  assert(endSeen === 7, `all seven are in the closing frame (${endSeen}/7)`);
  // A CHASE CAMERA MAY TRACK OR HOLD. IT MAY NEVER REVERSE.
  //
  // Authored as two compositions the door beat and the weld disagreed, and the
  // disagreement showed: the frame slid backwards on his first running step and
  // the doorway drifted rightwards before the run dragged it back.
  let reversals = 0, firstReversal = 0;
  let prevX = null;
  for (let t = INTRO_FILM.slamAt; t <= DUR; t += 1 / 120) {
    const cx = IntroFilm.cameraAt(t, gate).x;
    if (prevX !== null && cx < prevX - 1e-9) {
      reversals++;
      if (!firstReversal) firstReversal = t;
    }
    prevX = cx;
  }
  assert(reversals === 0,
    `the camera never travels backwards through the hero section (${reversals}, first at ${firstReversal.toFixed(2)}s)`);
}
{
  // THE VILLAIN NEVER SHARES A FRAME WITH A MACHINE. The switch beat is at the
  // service end precisely so the cause can be shown without the consequence
  // already sitting in the corner of the shot.
  const gate = IntroFilm.introGate();
  const lastCabRight = IntroFilm.CAB_CX.at(-1) + 24;
  let clash = null;
  for (let t = 4; t < INTRO_FILM.shots.find((s) => s.id === 'dark').t0; t += 1 / 60) {
    if (!IntroFilm.copterAt(t)) continue;
    const cam = IntroFilm.cameraAt(t, gate);
    if (cam.x - gate.w / (2 * cam.zoom) < lastCabRight) { clash = t; break; }
  }
  assert(clash === null,
    `no cabinet is ever in frame with Eggshell${clash ? ` (at ${clash.toFixed(2)}s)` : ''}`);
}
{
  // THE FLOOR IS THE ONE THING THAT MUST NOT MOVE. Every figure in the picture
  // stands on it, so a ground line drifting up and down as the camera pushes in
  // makes the whole room rise and settle under people who are only running.
  for (const portrait of [false, true]) {
    const gate = { ...IntroFilm.introGate(), portrait };
    let lo = 9, hi = -9;
    for (let t = 0; t <= DUR; t += 1 / 60) {
      // The close-ups on Eggshell have no floor in them and are exempt. Taken
      // from the shot table rather than typed, because those shots move.
      if (t >= INTRO_FILM.shots.find((x) => x.id === 'arrival').t0
        && t < INTRO_FILM.shots.find((x) => x.id === 'dark').t0) continue;
      const cam = IntroFilm.cameraAt(t, gate);
      const frac = 0.5 + ((IntroFilm.FLOOR_Y - cam.y) * cam.zoom) / gate.h;
      lo = Math.min(lo, frac); hi = Math.max(hi, frac);
    }
    assert(hi - lo < 0.01,
      `${portrait ? 'portrait' : 'landscape'}: the floor holds one screen row through every zoom (${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}%)`);
  }
}

{
  const a = PROBES.map(fingerprint);
  const b = PROBES.map(fingerprint);
  assert(a.join('\n') === b.join('\n'),
    'the film draws the same frame twice — no Math.random(), no wall clock, no song beat');
}
{
  // Ticked-to vs sought-to. This is what the screens gallery and the video
  // render depend on: a projector dropped at a time must agree with one that
  // got there the long way.
  Input.clearAll();
  spy();
  let ok = true;
  for (const t of PROBES) {
    const state = new IntroState({ onDone: () => {} });
    state.enter();
    state.seek(t);
    if (Math.abs(state.t - Math.min(t, DUR)) > 1e-9) ok = false;
    if (fingerprint(state.t) !== fingerprint(t)) ok = false;
  }
  assert(ok, 'seek(t) lands exactly on t and produces that frame');
}
{
  // Actual stepped playback versus seek. The pure fingerprint check above
  // catches time-dependent drawing; this pass also checks the projector's
  // edge-triggered state (music cut, cue cursor, static beds and close prompt)
  // after walking through the same boundaries a browser render will cross.
  const milestones = [0, 4, 6.5, 8.5, INTRO_FILM.cutAt, 12.5, 14.3,
    INTRO_FILM.cabinetCutAt, DOOR_T, IntroFilm.LORENZO_REVEAL_T,
    IntroFilm.LORENZO_RUN_T, IntroFilm.LORENZO_IDLE_T,
    IntroFilm.GROUP_RUN_T, IntroFilm.SCREEN_REVEAL_AT,
    IntroFilm.DIVE_AT, IntroFilm.SCREEN_VISIBLE_AT, IntroFilm.DIVE_END,
    24.65, 25, 25.9, 26.6, DUR];
  const playTo = (target) => {
    Input.clearAll();
    spy();
    const state = new IntroState({ onDone: () => {} });
    state.enter();
    let left = target;
    while (left > TICK + 1e-9) {
      state.update(TICK);
      Input.clearAll();
      left -= TICK;
    }
    if (left > 1e-9) {
      state.update(left);
      Input.clearAll();
    }
    return {
      t: state.t, awaitingClose: state.awaitingClose, didCut: state.didCut,
      frame: fingerprint(state.t),
    };
  };
  const seekTo = (target) => {
    Input.clearAll();
    spy();
    const state = new IntroState({ onDone: () => {} });
    state.enter();
    state.seek(target);
    return {
      t: state.t, awaitingClose: state.awaitingClose, didCut: state.didCut,
      frame: fingerprint(state.t),
    };
  };
  let ok = true;
  for (const t of milestones) {
    const a = playTo(t), b = seekTo(t);
    if (JSON.stringify(a) !== JSON.stringify(b)) ok = false;
  }
  assert(ok, 'stepped playback and seek agree at entrances, socket cut, dive, run-off and reactions');
}
{
  // Seeking backwards must re-arm, not double-fire: the gallery shoots its
  // probe list out of order.
  Input.clearAll();
  const calls = spy();
  const state = new IntroState({ onDone: () => {} });
  state.enter();
  run(state, DUR);
  const before = calls.length;
  state.seek(2);
  state.seek(28);
  assert(calls.filter(([k], i) => i >= before && k === 'sfx').length === 0,
    'seeking does not fire the cues it skips over');
}

// --- Portrait --------------------------------------------------------------
{
  assert(IntroState.portraitMode === 'frame', 'the film declares itself a portrait-framed screen');
  const gate = IntroFilm.introGate();
  assert(gate.w > 0 && gate.h > 0, 'the picture gate has positive area');
  assert(gate.capTop > gate.y + gate.h - 1, 'the caption band sits under the picture, not over it');
  assert(gate.capBottom > gate.capTop, 'the caption band has positive height');
  // Every shot must solve to a sane magnification in the frame it is given.
  let ok = true;
  for (const s of INTRO_SHOTS) {
    for (const box of [s.cam.from, s.cam.to, s.portrait?.from, s.portrait?.to]) {
      if (!box) continue;
      const z = IntroFilm.fitBox(box, gate).zoom;
      if (!(z > 0.3 && z < 20)) ok = false;
    }
  }
  assert(ok, 'every authored box solves to a usable zoom');
}

process.exit(failed ? 1 : 0);
