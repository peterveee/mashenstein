// The food court's speech cards: held long enough to be read, and not cut off on a phone.
//
// Every card used to come down after a flat 3.2s (3s for a locked door), however long the line
// was. The median hero line is 58 characters and the longest 102, which is a pace nobody reads
// at. And in phone portrait, where the type is 1.9x, the card seats three rows while Clara's
// longest lines run to four — and the hub never turns a page, so the end of them was never
// shown at all, however long the card stayed up.
import { installDom } from './dom-stub.js';
installDom();

// The stub measures every glyph as 0 wide, which would seat any line on one row. Give the
// context a face of about the game's proportions: Fredoka averages 0.55em a character over the
// hero lines, spaces included, and this is a touch wider so a line that only just fits is flagged.
const EM = 0.6;
const makeElement = document.createElement;
document.createElement = (tag) => {
  const el = makeElement(tag);
  const getContext = el.getContext;
  el.getContext = (type, opts) => {
    const ctx = getContext(type, opts);
    if (ctx && type === '2d') {
      ctx.measureText = (s) => ({ width: String(s).length * EM * parseFloat(/([\d.]+)px/.exec(ctx.font)?.[1] ?? 10) });
    }
    return ctx;
  };
  return el;
};

const { Audio } = await import('../src/engine/audio.js');
const { defaultSlot } = await import('../src/engine/save.js');
const { HUB_LINES } = await import('../src/data/jokes.js');
const { speechHoldSeconds, speechPageCount } = await import('../src/game/hud.js');
const { HubState } = await import('../src/game/hub/index.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// ---- the rule ---------------------------------------------------------------
const OLD_FLAT_S = 3.2;
assert(speechHoldSeconds('NEXT.') >= 4, 'a one-word bark still holds long enough to be noticed');
let prev = 0;
let monotonic = true;
for (let n = 0; n <= 160; n += 4) {
  const held = speechHoldSeconds('X'.repeat(n));
  if (held < prev) monotonic = false;
  prev = held;
}
assert(monotonic, 'a longer line is never held for less time than a shorter one');
assert(Number.isFinite(speechHoldSeconds(undefined)) && speechHoldSeconds(undefined) >= 4,
  'a missing line cannot produce a broken timer');

const pools = Object.entries(HUB_LINES);
const everyLine = pools.flatMap(([id, lines]) => [...lines].map((text) => ({ id, text })));
assert(everyLine.length > 100, `every hero's pool is under test (${everyLine.length} lines)`);
// A brisk reader gets through fifteen characters a second after a second to find the card.
const hurried = everyLine.filter(({ text }) => speechHoldSeconds(text) < 1 + text.length / 15);
assert(hurried.length === 0,
  `no hero line is gone before a brisk reader finishes it${hurried.length ? ` (${hurried[0].id}: "${hurried[0].text}")` : ''}`);
assert(everyLine.every(({ text }) => speechHoldSeconds(text) > OLD_FLAT_S),
  'every hero line now outlasts the flat 3.2s it used to get');

// ---- the hub's cards ---------------------------------------------------------
const slot = defaultSlot();
const save = { slot, settings: {} };
const flow = {
  heroId: () => 'lorenzo',
  setHero: () => {},
  gameSongFor: () => null,
  toHub: () => {},
  toHubPause: () => {},
};
const hub = new HubState({ save, flow });
// Nobody to stand beside: a hero wandering up would dwell-greet and replace the card mid-test.
hub.npcActors = [];

const longest = everyLine.reduce((a, b) => (b.text.length > a.text.length ? b : a));
// talkTo walks a hero's pool in order, so park them one line before the long one.
slot.hub.npcSeen[longest.id] = HUB_LINES[longest.id].indexOf(longest.text);
hub.talkTo({ id: longest.id });
assert(hub.talk.text === longest.text && hub.talk.who === longest.id,
  'talkTo puts the hero\'s next line on the card under their name');
assert(hub.talk.t === speechHoldSeconds(longest.text),
  'and holds it for as long as that line takes to read, not for a flat time');

const hold = speechHoldSeconds(longest.text);
const tick = (seconds) => { for (let i = 0, n = Math.round(seconds * 30); i < n; i++) hub.update(1 / 30); };
tick(OLD_FLAT_S + 0.5);
assert(hub.talk && hub.talk.text === longest.text,
  `the longest line (${longest.text.length} chars) is still up after the old 3.2s`);
tick(hold - OLD_FLAT_S - 0.5 - 0.3);
assert(hub.talk && hub.talk.text === longest.text, 'and still up just before its reading time is out');
tick(0.6);
assert(hub.talk === null, 'and gone once it is');

// A short line that follows is held for its own time, not the long one's.
hub.talkTo({ id: 'dolores' });
assert(hub.talk.t === speechHoldSeconds(hub.talk.text) && hub.talk.t < hold,
  'a short line is held for its own time');

// The room's own notes go through the same clock.
hub.talk = null;
hub.interact({ type: 'shelf' });
assert(hub.talk && /TROPHY ROOM/.test(hub.talk.text) && hub.talk.who === null,
  'the locked trophy room answers on the card, as the room and not a hero');
assert(hub.talk.t === speechHoldSeconds(hub.talk.text) && hub.talk.t > OLD_FLAT_S,
  'and holds past the old three seconds');

hub.talk = null;
hub.interact({ type: 'cabinet', unlocked: false, cab: { id: 'speed' }, lock: { plugs: 12, first: null, playFirst: { name: 'FIELD SERVICE' } } });
assert(hub.talk && /PLUGS/.test(hub.talk.text) && hub.talk.who === null,
  'a locked cabinet answers on the card too');
assert(hub.talk.t === speechHoldSeconds(hub.talk.text) && hub.talk.t > OLD_FLAT_S,
  'and holds for its own reading time');

// ---- the phone's card seats the whole line -----------------------------------
const portrait = { portrait: true, floorY: 200, camY: 0, zoom: 2 };
hub.talk = null;
const cardOpts = hub.speechOpts(portrait, 0);
const cut = everyLine.filter(({ id, text }) => speechPageCount({ text, who: id }, cardOpts) > 1);
assert(cut.length === 0,
  `no hero line spills past the portrait card${cut.length ? ` (${cut.length}, first ${cut[0].id}: "${cut[0].text}")` : ''}`);
const landscapeOpts = hub.speechOpts({ portrait: false }, 0);
assert(landscapeOpts.light === true && landscapeOpts.maxLines === undefined,
  'landscape keeps the shared three-row card');

Audio.ctx = null;
Audio.mixer = null;

console.log(failed ? 'HUB TALK HOLD: FAILED' : 'HUB TALK HOLD: PASSED');
process.exit(failed ? 1 : 0);
