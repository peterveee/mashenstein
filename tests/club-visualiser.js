// THE CLUB'S VISUALISER (src/game/banger/club-visualiser.js): a double tap on the mirror ball
// brings up one of the jukebox's visualisers over the club (Peter, 10 Oct 2026). It fades in
// through black and takes the full screen only once the room is black; a swipe steps it, a tap
// fades it out and hands the screen back; one tap on the ball is still just the spin.
import { installDom } from './dom-stub.js';
installDom();

const { Input } = await import('../src/engine/input.js');
const { VISUALISER_NAMES, isVisualiserExcluded } = await import('../src/engine/visualisers.js');
const { ClubVisualiser, clubVisualiserPack, CLUB_VISUALISERS } = await import('../src/game/banger/club-visualiser.js');
const { BangerClubState } = await import('../src/game/banger/club.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}
const frame = () => Input.endFrame();
const run = (v, s) => { for (let k = 0; k < Math.round(s * 60); k++) v.tick(1 / 60); };

const pack = clubVisualiserPack();
assert(CLUB_VISUALISERS.every((name) => VISUALISER_NAMES.includes(name)),
  'every visualiser the club names is in the pack (a renamed one would silently drop out)');
assert(pack.length === CLUB_VISUALISERS.filter((name) => !isVisualiserExcluded(VISUALISER_NAMES.indexOf(name))).length
  && pack.every((i) => CLUB_VISUALISERS.includes(VISUALISER_NAMES[i])),
  `the club deals only its own kid-friendly list (${pack.length} visualisers)`);
assert(!pack.includes(VISUALISER_NAMES.indexOf('VJ MEGAMIX')), 'never the megamix, which would deal the rest of the pack back in');

const v = new ClubVisualiser();
const ctx = document.createElement('canvas').getContext('2d');
assert(!v.open && v.roomAlpha() === 1, 'shut, the room is the picture');
v.start({ bpm: 124, title: 'NEON ORBIT' });
assert(v.open && v.state === 'in' && !v.full && v.roomAlpha() === 1 && v.visualAlpha() === 0, 'a start begins the fade with the room still up');
run(v, 0.2);
assert(!v.full && v.roomAlpha() > 0 && v.roomAlpha() < 1, 'the room fades down first, the canvas not yet full-screen');
run(v, 0.3);
assert(v.full && v.hidesRoom, 'the full screen is taken once the room is black');
let threw = null;
try { v.draw(ctx, () => { throw new Error('the room was drawn behind a black screen'); }); } catch (e) { threw = e; }
assert(!threw, `the room is not drawn while it is hidden${threw ? ` (${threw.message})` : ''}`);
run(v, 0.6);
assert(v.state === 'active' && v.visualAlpha() === 1, 'and the visualiser is up in a second');
assert(pack.includes(v.index) && v.preset?.track?.bpm === 124, 'one from the pack, at the song\'s tempo');

// a swipe left steps to the next one, and is not a tap
const first = v.index;
Input.usingTouch = true;
Input.pointer = { x: 240, y: 135, down: true };
Input.press('pointer');
v.input(); frame();
Input.pointer.x = 200;
v.input(); frame();
Input.pointer.down = false;
Input.release('pointer');
v.input(); frame();
assert(v.state === 'active' && (pack.length < 2 || v.index !== first) && v.previous, 'a swipe steps to another, cross-faded, and leaves it up');

// the arrows step it as well
const second = v.index;
Input.press('left'); v.input(); Input.release('left'); frame();
assert(pack.length < 2 || v.index !== second, 'an arrow key steps it');

// a tap closes it: fade out, the screen handed back, then the room
Input.pointer = { x: 240, y: 135, down: true };
Input.press('pointer');
v.input(); frame();
Input.pointer.down = false;
Input.release('pointer');
v.input(); frame();
assert(v.state === 'out', 'a tap is back to the club');
run(v, 0.32);
assert(!v.full && v.roomAlpha() > 0, 'the full screen is handed back before the room fades up');
run(v, 0.2);
assert(!v.open && !v.preset, 'and then it is gone');

// drop: the club left with it up
v.start({ bpm: 120 }); run(v, 0.6);
v.drop();
assert(!v.open && !v.full, 'leaving the club drops it at once, the screen handed back');

// THE MIRROR BALL: one tap spins it; a second within DOUBLE_TAP_S brings the visualiser up
Input.clearAll();
const club = {
  t: 0, spinV: 0, mirrorFlashAt: -Infinity, ballTapAt: -Infinity, ballAnchor: null,
  ballSwing: { a: 0, va: 0, stretch: 1, vs: 0 }, vis: new ClubVisualiser(), playedBpm: 128,
  rec: { name: 'NEON ORBIT', style: 'house', mood: 'happy' },
};
const tap = (t0, t) => {
  club.t = t;
  club.ballGrab = { touch: null, dx: 0, dy: 0, lastX: 0, x0: 0, y0: 0, t0, moved: 0, vSpin: 0 };
  BangerClubState.prototype.ballOn.call(club, 1 / 60);
};
tap(1.0, 1.08);
assert(club.spinV > 20 && !club.vis.open, 'one tap on the ball spins it, no visualiser');
tap(2.0, 2.08);
assert(!club.vis.open, 'nor does another a second later');
tap(2.25, 2.32);
assert(club.vis.open && club.vis.track.bpm === 128 && club.vis.title.startsWith('NEON ORBIT'), 'a second tap straight after brings it up, with the song\'s name and tempo');
club.vis.drop();
tap(2.5, 2.58);
assert(!club.vis.open, 'a third tap is a fresh first tap, not another double');

if (failed) { console.error('\nclub-visualiser: FAILED'); process.exit(1); }
console.log('\nclub-visualiser: all passed');
