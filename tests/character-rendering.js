// Character rendering contract: playable heroes stay on the native-density
// overlay in every run state, while their shield geometry is finite and stable.
import { installDom } from './dom-stub.js';
installDom();

const { RunState, FINISH_CELEBRATION_POSE } = await import('../src/game/run.js');
const { Player } = await import('../src/game/player.js');
const { HEROES } = await import('../src/data/heroes.js');
const { HERO_SPRITES } = await import('../src/sprites/heroes.js');
const { HERO_DISC_PLATE } = await import('../src/game/hud.js');
const {
  TOON_SPECS, toonEffectEllipse, poseFromPlayer, RUN_HEAD_TURN, drawToon,
  ACTIVE_CELEBRATION_STYLE, ACTIVE_LOCOMOTION_STYLE, ACTIVE_LIMB_STYLE,
  TITLE_PARADE_ACTIONS, titleParadeAction, transitionCameoAction,
  B33P_TITLE_WINDUP_T, b33pTitleShotPose,
} = await import('../src/sprites/toons.js');
const { initRenderer, blit, bctx, pendingOverlayDrawCount } = await import('../src/engine/renderer.js');
const { save } = await import('../src/engine/save.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

save.load();
save.newSlot(0, 0);
initRenderer();

const stage = {
  id: 'character-render-1', cabinet: 'plumber', index: 1,
  mission: { type: 'reach', desc: 'TEST' },
  challenge: { type: 'coins', n: 99, desc: 'TEST' },
  durationSec: 40, applianceAt: 0.5,
};
const run = new RunState({ stage, save, seed: 17, difficulty: 1, onEnd: () => {} });
run.enter();

function queuedFor(hero, state) {
  // Drain the previous sample. blit() also exercises callback execution, so a
  // broken mirror/camera transform fails the test instead of merely queueing.
  blit();
  run.relay.current = hero.id;
  run.player = new Player(hero.id);
  run.paused = state === 'paused';
  run.dead = state === 'dead';
  run.mirror = state === 'mirrored';
  // Off his floor, the hero's overlay pass is held back and re-queued after the
  // chatter so a jump prints over the popup cards — the layer COUNT must not
  // move, only where in the list he lands.
  run.player.y = state === 'airborne' ? 24 : 0;
  run.draw(bctx);
  const queued = pendingOverlayDrawCount();
  blit();
  return queued;
}

for (const hero of HEROES) {
  const normal = queuedFor(hero, 'normal');
  const paused = queuedFor(hero, 'paused');
  const dead = queuedFor(hero, 'dead');
  const mirrored = queuedFor(hero, 'mirrored');
  const airborne = queuedFor(hero, 'airborne');
  // A live frame queues hero, chatter (floaties + speech) and frame (HUD and
  // its banners). Pause/death each add their covering callback after those
  // three; mirroring changes transforms, not layer count, and neither does the
  // jump lift — it reorders the same three.
  assert(normal === 3, `${hero.id} normal queues hero + chatter + HUD at native density`);
  assert(paused === 4, `${hero.id} pause cover is queued after hero + HUD`);
  assert(dead === 4, `${hero.id} death cover is queued after hero + HUD`);
  assert(mirrored === 3, `${hero.id} mirrored hero remains on the overlay path`);
  assert(airborne === 3, `${hero.id} jump lift reorders the overlay, it does not add a layer`);
}

for (const hero of HEROES) {
  const a = toonEffectEllipse(hero.id);
  const b = toonEffectEllipse(hero.id);
  const values = [a.cx, a.cy, a.rx, a.ry];
  assert(a === b, `${hero.id} reuses one shield envelope across frames`);
  assert(Object.isFrozen(a), `${hero.id} shield envelope cannot be mutated`);
  assert(values.every(Number.isFinite), `${hero.id} shield envelope is finite`);
  assert(a.rx > 0.5 && a.ry > 0.6, `${hero.id} shield envelope keeps a padded air gap`);
}

// The head-yaw gallery section iterates TOON_SPECS, and drawToon looks each
// hero's palette up in HERO_SPRITES — so the invariant worth guarding is that
// the two tables AGREE, not that either is a particular length. A hardcoded
// count of ten went stale the moment a hero joined the cast, and then failed as
// though something had broken when nothing had: a test that has to be edited
// every time the roster changes is a test that will eventually be edited
// without being read.
const toonIds = Object.keys(TOON_SPECS);
assert(toonIds.length >= HEROES.length,
  `the toon roster covers at least the playable cast (${toonIds.length} toons, ${HEROES.length} heroes)`);
assert(toonIds.every((id) => HERO_SPRITES[id] && HERO_SPRITES[id].pal),
  'every toon in the roster has a palette to draw with');
assert(HEROES.every((h) => TOON_SPECS[h.id]),
  'every playable hero has a toon rig');
assert(HERO_DISC_PLATE === 'rgba(144,170,190,0.98)',
  'HUD hero faceplate keeps the lifted slate plate');
assert(ACTIVE_CELEBRATION_STYLE === 'reworked', 'results-screen celebrations default to the approved rework');
assert(ACTIVE_LOCOMOTION_STYLE === 'enhanced', 'jump and duck default to the improved motion');
assert(ACTIVE_LIMB_STYLE === 'snap', 'the run and jump default to the ported limb spec');
assert(FINISH_CELEBRATION_POSE.kind === 'celebrate' && FINISH_CELEBRATION_POSE.headTurn === 0,
  'the flag-pole celebration clears the inherited run face angle');

// The limb styles are ONE painter shared by seven heroes plus a pose-level
// override, so the failure mode is not "the run looks wrong" — it is one hero,
// in one pose, quietly solving its IK on undefined. These pin the seams.
{
  const humanoids = Object.keys(TOON_SPECS).filter((id) => TOON_SPECS[id].rig === 'humanoid');
  assert(humanoids.every((id) => TOON_SPECS[id].limbStyle),
    'every hero on the shared humanoid painter carries a limb style');
  assert(!TOON_SPECS.mochi.limbStyle && !TOON_SPECS.chompo.limbStyle,
    'the two non-humanoid rigs stay out of the limb-style port');

  const KINDS = [
    { kind: 'run', grounded: true, vy: 0 },
    { kind: 'jump', grounded: false, vy: 380 },
    { kind: 'jump', grounded: false, vy: -380 },
    { kind: 'duck', grounded: true, vy: 0, duckAmount: 1 },
    { kind: 'idle', grounded: true, vy: 0 },
    { kind: 'celebrate', grounded: true, vy: 0 },
    // gaitTune is a pose-level dial sweep for the gallery. Garbage in it must
    // degrade to the table's own values — never reach the IK as NaN.
    { kind: 'run', grounded: true, vy: 0, gaitTune: { hold: 'garbage', skew: {}, lean: '1.5', holdAt: 1e9, stride: null } },
  ];
  // 'legacy' is the painter's rollback and must stay reachable; 'float' is
  // Raymn's partial entry and must be SAFE on a rig it was never meant for,
  // because limbStyle is a pose field and nothing stops a caller passing it.
  // snapWide is the gallery's before-column for the geometry rework: never on
  // a spec, so nothing else would ever draw it.
  const OVERRIDES = [undefined, 'legacy', 'float', 'snapWide', 'nonexistent-style'];

  // The shared canvas stub swallows every call, so "it did not throw" proves
  // nothing here: an incomplete style resolves to `legL * undefined` and paints
  // a whole hero out of NaN without raising anything. This counts the numbers
  // that actually reach the 2D API instead.
  const grad = { addColorStop() {} };
  const GEOM = new Set(['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc',
    'arcTo', 'ellipse', 'rect', 'roundRect', 'translate', 'scale', 'rotate',
    'transform', 'setTransform', 'fillRect', 'strokeRect']);
  const tally = { n: 0, bad: 0 };
  const record = (...args) => {
    for (const v of args) if (typeof v === 'number') { tally.n++; if (!Number.isFinite(v)) tally.bad++; }
  };
  const probe = new Proxy({
    canvas: { width: 480, height: 270 },
    fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, font: '',
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    measureText: () => ({ width: 0 }),
    getLineDash: () => [],
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  }, {
    get(t, k) { return k in t ? t[k] : (GEOM.has(k) ? record : () => {}); },
    set(t, k, v) { t[k] = v; return true; },
  });

  let drew = 0;
  const emptyFrames = [];
  for (const id of Object.keys(TOON_SPECS)) {
    for (const k of KINDS) for (const limbStyle of OVERRIDES) for (const facing of [1, -1]) {
      for (const phase of [0, 0.375, 0.5]) {
        const before = tally.n;
        drawToon(probe, id, {
          ...k, phase, time: 0.4, squash: 0, lean: 0, facing, limbStyle,
        }, 40, 80, 60);
        if (tally.n === before) emptyFrames.push(`${id}/${k.kind}/${limbStyle}`);
        drew++;
      }
    }
  }
  // Derived, not hardcoded: the point of the number is that the loops below
  // ran every combination, and stating it as a literal only proved that the
  // roster was still the size it was on the day it was written.
  const expected = Object.keys(TOON_SPECS).length * KINDS.length * OVERRIDES.length * 2 * 3;
  assert(drew === expected,
    `limb-style matrix covered every combination (drew ${drew} of ${expected})`);
  assert(tally.bad === 0,
    `every coordinate the limb styles paint is finite (${tally.bad} of ${tally.n} were not)`);
  assert(emptyFrames.length === 0,
    `no hero/style combination paints nothing at all (${emptyFrames.slice(0, 3).join(', ')})`);
}
// COVERAGE, not a length match. What matters is that every playable hero has a
// parade action; a leftover entry for a character who has left the playable
// roster is dead data rather than a bug, and comparing lengths reported the
// second as though it were the first.
for (const hero of HEROES) {
  assert(typeof TITLE_PARADE_ACTIONS[hero.id] === 'string' && TITLE_PARADE_ACTIONS[hero.id],
    `${hero.id} has a title parade action`);
}
for (const hero of HEROES) {
  const action = titleParadeAction(hero.id, 0.4, 0.5);
  assert(action && Number.isFinite(action.feetLift) && action.pose,
    `${hero.id} title beat comes from the shared gallery/game choreography`);
  drawToon(bctx, hero.id, {
    kind: 'run', grounded: true, phase: 0.3, time: 0.4, menu: true,
    ...action.pose,
  }, 40, 80 - action.feetLift * 60, 60);
  const cameo = transitionCameoAction(hero.id);
  assert(cameo && typeof cameo === 'object', `${hero.id} transition cameo is catalogued`);
}
assert(titleParadeAction('lorenzo', 0.4, 0.5).pose.menuAction === 'wave',
  'Lorenzo title beat uses the updated compact wave');
assert(!titleParadeAction('raymn', 0.4, 0.5).pose.menuAction,
  'Ray M\'N title beat is correctly documented as a rocket-fist toss, not a wave');
const titleAimStart = b33pTitleShotPose(0);
const titleAimMid = b33pTitleShotPose(B33P_TITLE_WINDUP_T / 2);
const titleAimFire = b33pTitleShotPose(B33P_TITLE_WINDUP_T);
assert(titleAimStart.aimAmount === 0 && !titleAimStart.shotFired,
  'B-33P title click starts with the cannon at its running carry');
assert(titleAimMid.aimAmount > 0 && titleAimMid.aimAmount < 1 && !titleAimMid.shotFired,
  'B-33P visibly raises the cannon before firing');
assert(titleAimFire.aimAmount === 1 && titleAimFire.shotFired,
  'B-33P fires only after the cannon reaches its raised aim');
const GALLERY_BODY_DIALS = [
  'torsoWidth', 'waistScale', 'legLength', 'legWidth', 'armLength', 'armWidth',
  'figureScaleX', 'figureScaleY',
];
// The guard is against a PROPOSAL leaking into the cast: the body-shape section
// drives these dials on real rigs, and a value that survives into TOON_SPECS is
// a bake-off candidate nobody chose. An approved one is listed here by hero and
// dial, so shipping a shape stays a deliberate edit to this line rather than
// something a gallery experiment can do quietly.
const APPROVED_BODY_DIALS = { kiko: ['legLength'] };
assert(Object.entries(TOON_SPECS).every(([id, spec]) =>
  GALLERY_BODY_DIALS.every((key) =>
    !Object.hasOwn(spec, key) || (APPROVED_BODY_DIALS[id] || []).includes(key))),
'gallery body-shape candidates do not alter production specs');
// `legLength` moves the HIP, not the crown — it splits her height between torso
// and leg, and cannot make her taller on its own. Her height is `tall`, and the
// band is the brief: above the rig default, under Lorenzo's crown (1.025 of the
// draw height) and well under B-33P's dome (1.094). 1.02 measures 1.006.
assert(TOON_SPECS.kiko.legLength > 1,
  'a little more of Kiko\'s height sits in the leg than the rig default');
assert(TOON_SPECS.kiko.tall > 1 && TOON_SPECS.kiko.tall < 1.04,
  'Kiko stands taller than the rig default but no taller than Lorenzo');

for (const id of Object.keys(TOON_SPECS)) {
  let safe = true;
  try {
    // The dev gallery uses this opt-in pose on real rigs. Exercise several
    // points so every proposed move reaches both its signature and big beat.
    for (const time of [0, 0.65, 1.3, 1.95, 2.55]) {
      drawToon(bctx, id, {
        kind: 'celebrate', time, phase: 0, grounded: true, facing: 1,
        menu: true, celebrateStyle: ACTIVE_CELEBRATION_STYLE,
      }, 40, 80, 60);
    }
  } catch (err) {
    safe = false;
    console.error(err);
  }
  assert(safe, `${id} gallery celebration candidate renders through a full cycle`);
}

for (const id of Object.keys(TOON_SPECS)) {
  let safe = true;
  try {
    for (const motionStyle of ['legacy', ACTIVE_LOCOMOTION_STYLE]) {
      for (const vy of [-460, 0, 460]) {
        drawToon(bctx, id, {
          kind: 'jump', time: 0.3, phase: 0.25, grounded: false, facing: 1,
          vy, motionStyle,
        }, 40, 80, 60);
      }
      drawToon(bctx, id, {
        kind: 'duck', time: 0.3, phase: 0.25, grounded: true, facing: 1,
        vy: 0, motionStyle,
      }, 40, 80, 60);
      if (motionStyle === ACTIVE_LOCOMOTION_STYLE) {
        for (const duckAmount of [0, 0.5, 1]) {
          drawToon(bctx, id, {
            kind: 'duck', time: 0.3, phase: 0.25, grounded: true, facing: 1,
            vy: 0, motionStyle, duckAmount, duckDirection: 1,
          }, 40, 80, 60);
        }
      }
    }
  } catch (err) {
    safe = false;
    console.error(err);
  }
  assert(safe, `${id} legacy and improved jump/duck poses render safely`);
}

const duckTransition = new Player('lorenzo');
const duckInput = (down) => ({ held: (action) => action === 'duck' && down });
duckTransition.update(0.07, duckInput(true), null);
assert(duckTransition.duckAmount > 0 && duckTransition.duckAmount < 1,
  'duck input animates through a partial crouch');
duckTransition.update(0.07, duckInput(true), null);
assert(duckTransition.duckAmount === 1 && poseFromPlayer(duckTransition, 0).kind === 'duck',
  'held duck settles into the planted pose');
duckTransition.update(0.05, duckInput(false), null);
const recoveringPose = poseFromPlayer(duckTransition, 0);
assert(recoveringPose.kind === 'duck' && recoveringPose.duckAmount > 0 && recoveringPose.duckAmount < 1,
  'duck release keeps the recovery animation visible');
duckTransition.update(0.05, duckInput(false), null);
assert(duckTransition.duckAmount === 0 && poseFromPlayer(duckTransition, 0).kind === 'run',
  'duck recovery returns cleanly to the run pose');

for (const hero of HEROES) {
  const player = new Player(hero.id);
  const running = poseFromPlayer(player, 0);
  // AIRBORNE IS NOT THE SAME AS JUMPING, so a jump has to be built as one: a
  // hero who has spent no jump and is not falling fast has stepped off a ledge,
  // and he keeps the run cycle rather than being drawn tucked with his arms up.
  player.grounded = false;
  player.jumps = 1;
  const jumping = poseFromPlayer(player, 0);
  player.jumps = 0;
  const stepped = poseFromPlayer(player, 0);
  // Fast enough to be a real fall — off a cloud, or off the top of a stack.
  player.vy = -420;
  const falling = poseFromPlayer(player, 0);
  player.fallFace = true;
  const startledFall = poseFromPlayer(player, 0);
  player.vy = 0;
  player.fallFace = false;
  player.grounded = true;
  player.ducking = true;
  const ducking = poseFromPlayer(player, 0);
  assert(running.headTurn === RUN_HEAD_TURN, `${hero.id} gets the production treatment while running`);
  assert(jumping.headTurn === 0 && ducking.headTurn === 0,
    `${hero.id} keeps non-run poses front-facing`);
  assert(stepped.kind === 'run' && stepped.headTurn === RUN_HEAD_TURN,
    `${hero.id} keeps running off a short ledge, head and all — the snap to front-facing at the edge was the tell`);
  assert(falling.kind === 'jump' && falling.headTurn === 0,
    `${hero.id} does read as falling once the drop is a real one`);
  assert(startledFall.faceSurprised && startledFall.browRaise,
    `${hero.id} wears the full startled face during an unplanned fall`);
}

const lorenzo = new Player('lorenzo');
lorenzo.powerType = 'stomp';
lorenzo.powerPoseT = 0.2;
const smash = poseFromPlayer(lorenzo, 0);
assert(smash.menuAction === 'smash' && smash.actionTime > 0,
  'grounded Lorenzo drives the hand-registered wrench-smash pose');
lorenzo.grounded = false;
lorenzo.stomping = true;
const stomp = poseFromPlayer(lorenzo, 0);
assert(stomp.stomp && stomp.menuAction !== 'smash',
  'airborne Lorenzo keeps the separate stomp pose');

const b33p = new Player('b33p');
b33p.powerType = 'shoot';
b33p.powerPoseT = 0.24;
const shot = poseFromPlayer(b33p, 0);
assert(shot.menuAction === 'aim' && shot.actionTime > 0,
  'B-33P cannon receives deterministic muzzle-flash and recoil timing');

console.log(failed ? 'CHARACTER RENDERING: FAILED' : 'CHARACTER RENDERING: PASSED');
process.exit(failed ? 1 : 0);
