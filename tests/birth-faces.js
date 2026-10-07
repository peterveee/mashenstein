// IT'S ALIVE!'s faces (src/game/banger/birth-faces.js): what stands on the slab at a new banger's
// birth, one of five at random (Peter, 7 Oct 2026: "i like x,a,b,c ... and d.. mix it up"). Each
// plays the whole birth in both frames, keeps the song's name back until the flash (Peter, the
// same day: "not show the title but show it with ITS ALIVE"), and the jukebox hands every birth
// one of them.
import { installDom } from './dom-stub.js';
installDom();

const { BangerBirthState, BIRTH_S, FLASH_AT } = await import('../src/game/banger/birth.js');
const { BIRTH_FACES, GIANT_CASSETTE, pickBirthFace } = await import('../src/game/banger/birth-faces.js');
const { setPresentationFrame } = await import('../src/engine/renderer.js');
const { frameForViewport, defaultFrame, PHONE_PORTRAIT } = await import('../src/engine/frame.js');
const { bangerTitle } = await import('../src/game/banger/store.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

assert(BIRTH_FACES.map((f) => f.letter).join('') === 'XABCD' && BIRTH_FACES[0] === GIANT_CASSETTE,
  'five faces, X A B C D, the giant cassette first');
{
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(pickBirthFace(() => i / 500));
  seen.add(pickBirthFace(() => 0.9999999999));
  assert(seen.size === 5 && [...seen].every((f) => BIRTH_FACES.includes(f)), 'the dice land on every one of them, and only on them');
}

const rec = { name: 'CRYSTAL BEETLE', style: 'big-room', mood: 'dark', n: 1 };
const ctx = document.createElement('canvas').getContext('2d');
const said = [];
const fillText = ctx.fillText;
ctx.fillText = function (text, ...rest) { said.push(String(text)); return fillText?.call(this, text, ...rest); };
const named = () => said.some((s) => s.includes(rec.name) || s === bangerTitle(rec));

for (const [frame, label] of [[null, 'landscape'], [frameForViewport({ mode: PHONE_PORTRAIT, viewportWidth: 393, viewportHeight: 852 }), 'portrait']]) {
  if (frame) setPresentationFrame(frame);
  for (const face of BIRTH_FACES) {
    let opened = 0, threw = null, early = false, late = false;
    const birth = new BangerBirthState({ rec, subject: face.paint, onDone: () => { opened++; } });
    birth.enter();
    try {
      for (let k = 0; k < Math.ceil(BIRTH_S * 60) + 2; k++) {
        birth.update(1 / 60);
        said.length = 0;
        birth.draw(ctx);
        if (birth.t < FLASH_AT && named()) early = true;
        if (birth.t >= FLASH_AT && named()) late = true;
      }
    } catch (err) { threw = err; }
    assert(!threw && opened === 1, `${face.letter} ${face.name} plays the whole birth in ${label} and opens the club${threw ? ` (${threw.message})` : ''}`);
    if (!frame) assert(!early && late, `${face.letter}: nothing names the song until the flash, and then it is named`);
  }
  if (frame) setPresentationFrame(defaultFrame());
}

// The face itself carries the name once it's alive — on its label, strip or display.
for (const face of BIRTH_FACES) {
  const s = { charge: 1, since: 1, t: 4, name: rec.name };
  said.length = 0; face.paint(ctx, 240, 140, 30, { ...s, alive: false });
  const asleep = said.includes(rec.name);
  said.length = 0; face.paint(ctx, 240, 140, 30, { ...s, alive: true });
  assert(!asleep && said.includes(rec.name), `${face.letter}: the name is on it once it's alive, and not before`);
}

// The jukebox: a NEW BANGER's birth comes with one of them.
{
  const { SoundTestState } = await import('../src/game/menus.js');
  const { currentState } = await import('../src/engine/states.js');
  SoundTestState.prototype.openPendingClub.call({ openClub() {} }, { rec, song: {}, from: null, birth: true });
  const st = currentState();
  assert(st instanceof BangerBirthState && BIRTH_FACES.some((f) => f.paint === st.subject), 'a new banger’s birth gets one of the five faces');
}

if (failed) { console.error('BIRTH FACES: FAILED'); process.exit(1); }
console.log('BIRTH FACES: PASSED');
