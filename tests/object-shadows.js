// Gameplay object shadows should fade at their edges and never become a hard
// rectangle under a grounded obstacle. Airborne hazard shadows are intentionally
// absent: a mark with no visible caster is indistinguishable from a hitbox.
import { installDom } from './dom-stub.js';
installDom();

const { drawSoftContactShadow } = await import('../src/engine/shadows.js');
const { drawWorldEntity } = await import('../src/game/draw.js');
const { makeObstacle } = await import('../src/game/entities.js');
const { applyWorld } = await import('../src/engine/camera.js');
const { GROUND_Y } = await import('../src/engine/camera.js');

let failed = false;
function assert(cond, msg) {
  if (!cond) { console.error('FAIL:', msg); failed = true; }
  else console.log('ok:', msg);
}

function recorder() {
  const calls = [];
  const gradient = { addColorStop: (...args) => calls.push({ key: 'addColorStop', args }) };
  const ctx = new Proxy({ imageSmoothingEnabled: false }, {
    get: (target, key) => {
      if (key === 'calls') return calls;
      if (key === 'createRadialGradient') return (...args) => {
        calls.push({ key, args });
        return gradient;
      };
      if (key === 'fillRect') return (...args) => calls.push({ key, args });
      return key in target ? target[key] : (...args) => calls.push({ key, args });
    },
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return ctx;
}

function hasTwoPixelShadowBar(ctx) {
  return ctx.calls.some((c) => c.key === 'fillRect' && c.args[3] === 2);
}

const shadowCtx = recorder();
drawSoftContactShadow(shadowCtx, 20, 30, 10, 2, { alpha: 0.3 });
assert(shadowCtx.calls.some((c) => c.key === 'createRadialGradient'),
  'object shadow uses a radial falloff');
assert(shadowCtx.calls.filter((c) => c.key === 'addColorStop').some((c) => c.args[1].includes(',0.000)')),
  'object shadow fades fully at its edge');
assert(!shadowCtx.calls.some((c) => c.key === 'fillRect'),
  'object shadow painter never uses a rectangle');

const droneCtx = recorder();
drawWorldEntity(droneCtx, makeObstacle('drone', 200), 0, 0, {}, {});
assert(!droneCtx.calls.some((c) => c.key === 'createRadialGradient'),
  'airborne drones do not paint a detached landing shadow');
assert(!droneCtx.calls.some((c) => c.key === 'fillRect'),
  'airborne drone rendering does not leave a shadow bar');

const icicleCtx = recorder();
drawWorldEntity(icicleCtx, makeObstacle('icicle', 200), 0, 0, {}, {});
assert(!icicleCtx.calls.some((c) => c.key === 'createRadialGradient'),
  'falling icicles do not leave a detached ground shadow');

const gapCtx = recorder();
drawWorldEntity(gapCtx, makeObstacle('gap', 200), 0, 0, {}, {});
assert(!gapCtx.calls.some((c) => c.key === 'fillRect'),
  'gaps leave their pit renderer no detached warning bar');

const slopeCtx = recorder();
drawWorldEntity(slopeCtx, makeObstacle('popSpikes', 200), 150, 0, {}, {}, {
  preculled: true,
  // Deliberately use a world-space-looking center. The renderer must anchor
  // the clip to the local entity x, not to this untransformed metadata.
  beddedSurface: { centerX: 999, centerY: GROUND_Y, angle: 0.1 },
});
const clipEdge = slopeCtx.calls.find((c) => c.key === 'lineTo' && c.args[1] > GROUND_Y);
assert(clipEdge && clipEdge.args[0] === 85,
  'sloped floor plates clip around their local screen-space centre, keeping the art visible');

const trapCtx = recorder();
drawWorldEntity(trapCtx, makeObstacle('bearTrap', 200), 0, 0, {}, {});
assert(trapCtx.calls.filter((c) => c.key === 'createRadialGradient').length === 1,
  'bedded bear traps receive one cold contact shadow, not a duplicate generic shadow');

// A plate cut into the ground paints no warning bar. On the flat the bar was
// invisible behind the plate anyway; on a slope it detached and floated under
// the hill as a red underline with nothing standing on it.
const plateCtx = recorder();
drawWorldEntity(plateCtx, makeObstacle('popSpikes', 200), 0, 0, {}, {}, {
  preculled: true,
  beddedSurface: { centerX: 50, centerY: GROUND_Y - 9, angle: 0.2 },
});
assert(!plateCtx.calls.some((c) => c.key === 'fillRect'),
  'bedded floor plates paint no red ground tick');
assert(!plateCtx.calls.some((c) => c.key === 'createRadialGradient'),
  'bedded floor plates take no contact ellipse either — the burial is the contact');

// The trap's cold shadow rides the sampled surface, not the flat lane line.
const trapSlopeCtx = recorder();
drawWorldEntity(trapSlopeCtx, makeObstacle('bearTrap', 200), 0, 0, {}, {}, {
  preculled: true,
  beddedSurface: { centerX: 50, centerY: GROUND_Y - 9, angle: 0.2 },
});
assert(trapSlopeCtx.calls.some((c) => c.key === 'translate' && c.args[1] === GROUND_Y - 9)
  && trapSlopeCtx.calls.some((c) => c.key === 'rotate' && c.args[0] === 0.2),
  'a bedded trap shadow follows the surface the plate is buried in, not GROUND_Y');

const groundCtx = recorder();
drawWorldEntity(groundCtx, makeObstacle('crate', 200), 0, 0, {}, {});
assert(groundCtx.calls.some((c) => c.key === 'createRadialGradient'),
  'ground obstacle shadow uses the soft object treatment');
assert(!hasTwoPixelShadowBar(groundCtx),
  'ground obstacle shadow is not a hard bar');

const portraitCtx = recorder();
applyWorld(portraitCtx, 2.2, 0);
drawSoftContactShadow(portraitCtx, 20, 30, 8, 2.4, { alpha: 0.34 });
assert(portraitCtx.calls.some((c) => c.key === 'scale'
  && c.args[0] === 2.2 && c.args[1] === 2.2),
  'portrait magnifies the same world-space shadow instead of using a separate CSS size');

console.log(failed ? 'OBJECT SHADOWS: FAILED' : 'OBJECT SHADOWS: PASSED');
process.exit(failed ? 1 : 0);
