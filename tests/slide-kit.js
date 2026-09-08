// THE SLIDE WEARS WHAT THE HERO WEARS.
//
// The slide is its own painter (drawSlideKick). It does not fall through
// drawHumanoid's passes, so every piece of worn kit has to be re-implemented
// there — and each time a hero gained one, the slide was the pose that
// silently lost it. Shipped and then found by eye, one at a time: the tail,
// the carried cane, the tool belt, the canister, Fernwick's quiver sling. Each
// was invisible until someone looked at that hero in that pose.
//
// So this asserts the invariant directly, per hero and per piece: if turning a
// kit dial off changes the STANDING render, it must also change the SLIDE
// render. It cannot check that the piece is drawn *well* — that is what the
// gallery is for — but it does catch the failure that keeps happening, which
// is the piece not being drawn at all.
import { installDom } from './dom-stub.js';
installDom();

const { TOON_SPECS, drawToon } = await import('../src/sprites/toons.js');
const { HERO_SPRITES } = await import('../src/sprites/heroes.js');
const { HEROES } = await import('../src/data/heroes.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

// A context that records every call instead of painting. Comparing two
// recordings is a strictly finer test than comparing pixels — a piece drawn
// in exactly the wrong place still registers as drawn — but it is the right
// side to err on here: this is asking "is it painted at all", and it needs no
// browser to answer.
function recorder() {
  const ops = [];
  const gradient = { addColorStop: () => {} };
  const target = {
    canvas: { width: 512, height: 512 },
    fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, font: '',
    imageSmoothingEnabled: false, globalCompositeOperation: 'source-over',
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: () => ({ width: 0 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  const ctx = new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      return (...args) => { ops.push(k + '(' + args.map(fmt).join(',') + ')'); };
    },
    set(t, k, v) {
      // Style changes are part of the recording: a band that draws in the
      // wrong colour is a change worth seeing, and a piece whose only trace is
      // a fillStyle would otherwise vanish from the diff.
      if (typeof v === 'string' || typeof v === 'number') ops.push(k + '=' + v);
      t[k] = v; return true;
    },
  });
  return { ctx, ops };
}
const fmt = (a) => (typeof a === 'number' ? a.toFixed(2) : String(a));

const POSE = (extra) => ({
  kind: 'idle', phase: 0.25, time: 1.4, vy: 0, grounded: true, squash: 0, lean: 0,
  roll: false, float: false, stomp: false, headless: false, facing: 1, ...extra,
});
const STAND = POSE({});
const SLIDE = POSE({ kind: 'slide', slideStyle: 'kick', time: 0.3 });

function render(id, spec, pose) {
  const { ctx, ops } = recorder();
  drawToon(ctx, id, pose, 256, 460, 300, { spec, pal: HERO_SPRITES[id]?.pal || HERO_SPRITES[id] });
  return ops.join('\n');
}

// The worn pieces the slide has had to re-implement, and has dropped before.
// A dial belongs here when it puts something ON the hero — kit, not build.
const WORN = [
  'tail', 'back', 'bundle', 'gearBelt', 'straps', 'holster', 'quiverMount',
  'necklace', 'bracers', 'stick',
];

// Deliberate exceptions, by hero and dial, each with the reason. A garment the
// slide leaves off ON PURPOSE belongs here rather than in a silent pass.
const EXEMPT = {
  // Nothing yet. When something lands here it needs a sentence saying why the
  // slide is right to omit it, or it is this bug wearing a note.
};

for (const hero of HEROES) {
  const id = hero.id;
  const base = TOON_SPECS[id];
  if (!base || base.rig !== 'humanoid') continue;
  for (const dial of WORN) {
    if (!Object.hasOwn(base, dial) || !base[dial]) continue;
    if ((EXEMPT[id] || []).includes(dial)) continue;
    const off = { ...base, [dial]: undefined };
    const standChanged = render(id, base, STAND) !== render(id, off, STAND);
    const slideChanged = render(id, base, SLIDE) !== render(id, off, SLIDE);
    if (!standChanged) continue;  // the dial does nothing standing; not our business
    assert(slideChanged,
      `${id}: '${dial}' is drawn in the slide as well as standing`);
  }
}

console.log(failed ? 'SLIDE-KIT: FAILED' : 'SLIDE-KIT: PASSED');
process.exit(failed ? 1 : 0);
