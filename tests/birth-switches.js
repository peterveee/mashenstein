// IT'S ALIVE!'s switches (src/game/banger/birth-switches.js): what Gary throws at a new banger's
// birth, one of six at random (Peter, 7 Oct 2026). Each plays the whole birth in both frames,
// keeps his grip within an arm's reach and clear of his chest (where the stand hides its
// hands), and the jukebox hands every birth one of them.
import { installDom } from './dom-stub.js';
installDom();

const { BangerBirthState, BIRTH_S, SWITCH_AT, GARY_BEATS } = await import('../src/game/banger/birth.js');
const { BIRTH_SWITCHES, pickBirthSwitch } = await import('../src/game/banger/birth-switches.js');
const { setPresentationFrame } = await import('../src/engine/renderer.js');
const { frameForViewport, defaultFrame, PHONE_PORTRAIT } = await import('../src/engine/frame.js');
const { W } = await import('../src/engine/renderer.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(BIRTH_SWITCHES.length === 6 && new Set(BIRTH_SWITCHES.map((s) => s.letter)).size === 6,
  'six switches, A to F, each its own letter');
{
  const seen = new Set();
  for (let i = 0; i < 600; i++) seen.add(pickBirthSwitch(() => i / 600));
  seen.add(pickBirthSwitch(() => 0.9999999999));
  assert(seen.size === 6 && [...seen].every((s) => BIRTH_SWITCHES.includes(s)), 'the dice land on every one of them, and only on them');
}

const rec = { name: 'CRYSTAL BEETLE', style: 'big-room', mood: 'dark', n: 1 };
const ctx = document.createElement('canvas').getContext('2d');
for (const [frame, label] of [[null, 'landscape'], [frameForViewport({ mode: PHONE_PORTRAIT, viewportWidth: 393, viewportHeight: 852 }), 'portrait']]) {
  if (frame) setPresentationFrame(frame);
  for (const sw of BIRTH_SWITCHES) {
    let opened = 0, threw = null;
    const birth = new BangerBirthState({ rec, lever: sw, onDone: () => { opened++; } });
    birth.enter();
    try {
      for (let k = 0; k < Math.ceil(BIRTH_S * 60) + 2; k++) { birth.update(1 / 60); birth.draw(ctx); }
    } catch (err) { threw = err; }
    assert(!threw && opened === 1, `${sw.letter} ${sw.name} plays the whole birth in ${label} and opens the club${threw ? ` (${threw.message})` : ''}`);
  }
  if (frame) setPresentationFrame(defaultFrame());
}

// His hands, wherever a switch puts them: within reach of the shoulder they hang from, and
// clear of his chest — the stand draws its arms behind the torso, so a grip there vanishes —
// unless the switch has his arms painted over his front (armsInFront: the plunger's).
for (const sw of BIRTH_SWITCHES) {
  const h = 72, base = 205, gx = W * 0.32;
  let worst = 0, hidden = 0, held = 0;
  for (let t = 0; t <= BIRTH_S; t += 1 / 60) {
    const rig = sw.rig({ t, h, base, gx, coilX: W * 0.2, portrait: false, random: Math.random, since: t - SWITCH_AT });
    (rig.hands || []).forEach((g, i) => {
      if (!g || g.w < 0.5) return;
      const sx = gx + (i ? 0.1 : -0.1) * h, sy = base - 0.511 * h;
      worst = Math.max(worst, Math.hypot(g.at[0] - sx, g.at[1] - sy) / h);
      if (!rig.armsInFront && Math.abs(g.at[0] - gx) < 0.17 * h) hidden++;
      if (t >= SWITCH_AT && t < GARY_BEATS.LET_GO_AT) held++;
    });
  }
  assert(worst <= 0.45, `${sw.letter}: every grip within an arm’s reach (worst ${worst.toFixed(2)} of his height)`);
  assert(hidden === 0, `${sw.letter}: no grip behind his chest`);
  assert(held > 0, `${sw.letter}: he has hold of it as it lands`);
}

// The jukebox: a NEW BANGER's birth comes with one of them.
{
  const { SoundTestState } = await import('../src/game/menus.js');
  const { currentState } = await import('../src/engine/states.js');
  SoundTestState.prototype.openPendingClub.call({ openClub() {} }, { rec, song: {}, from: null, birth: true });
  const st = currentState();
  assert(st instanceof BangerBirthState && BIRTH_SWITCHES.includes(st.lever), 'a new banger’s birth gets one of the six switches');
}

if (failed) { console.error('BIRTH SWITCHES: FAILED'); process.exit(1); }
console.log('BIRTH SWITCHES: PASSED');
