// Shared quiet footwork for the club and its gallery previews.
export const SKIRT_LEGS = Object.freeze(['tap', 'stand', 'hop']);
const SKIRT_STANCE = 0.085;   // a planted foot, from the middle (the dances' own stance is 0.1)
const SKIRT_TAP = 0.035;      // how high the tapping toe comes up
const SKIRT_HOP = 0.085;      // springy rise, matched to the clearest current lab hop
const SKIRT_HOP_FOOT = 0.012; // a small foot tuck for softer knees under the hem
const SKIRT_HOP_SQUASH = 0.14;
export function groundDanceFeet(pose) {
  const feet = pose.dance?.feet;
  if (!feet || (!pose.bounce && !pose.tilt)) return pose;
  const bounce = Number(pose.bounce) || 0;
  const tilt = Number(pose.tilt) || 0;
  const sin = Math.sin(tilt), cos = Math.cos(tilt);
  return {
    ...pose,
    dance: {
      ...pose.dance,
      feet: feet.map(([x, y]) => Math.abs(y) < 1e-9
        ? [x, (bounce - x * sin) / cos] : [x, y]),
    },
  };
}
export function tameSkirt(pose, legs, beat) {
  const f = ((beat % 1) + 1) % 1;
  const hopLegFlex = Number(pose.dance?.hopLegFlex);
  const hopLandingCrouch = Number(pose.dance?.hopLandingCrouch) || 0;
  const planted = [[SKIRT_STANCE, 0], [-SKIRT_STANCE, 0]];
  // No feet: the painter stands them as it does at idle, legs straight under the hem
  // (a dance's feet slacken the legs for its kicks, and bowed knees show under a kilt).
  let feet = null, ankles = [0, 0], bounce = pose.bounce * 0.5;
  let squash = Number(pose.squash) || 0;
  if (legs === 'tap') {
    // up through the back half of the beat, down on it
    const up = f > 0.5 ? Math.sin((f - 0.5) * 2 * Math.PI) : 0;
    feet = [[SKIRT_STANCE + 0.01, -SKIRT_TAP * up], planted[1]];
    ankles = [-0.4 * up, 0];
  } else if (legs === 'hop') {
    // A full spring and a little knee/foot gather make the hop read clearly.
    // Keep the tuck shallow so the knees remain under the skirt. Selected C
    // moves add a little outward foot spread, so the knees flex visibly without
    // leaving the hem; compress on takeoff and landing, then release at the top.
    const lift = Math.sin(f * Math.PI);
    const landing = (1 - lift) ** 2;
    bounce = SKIRT_HOP * lift - hopLandingCrouch * landing;
    const spread = SKIRT_STANCE + (Number(pose.dance?.hopKneeSpread) || 0) * lift;
    const footY = bounce < 0 ? bounce : -SKIRT_HOP_FOOT * lift;
    feet = [[spread, footY], [-spread, footY]];
    squash = Math.max(SKIRT_HOP_SQUASH * (1 - lift), hopLandingCrouch * landing);
  } else if (legs === 'stand') {
    bounce = 0;
  }
  return groundDanceFeet({
    ...pose,
    bounce,
    squash,
    ...(legs === 'stand' ? { tilt: 0 } : {}),
    dance: { ...pose.dance, feet, ankles,
      ...(legs === 'hop' ? { legFlex: Number.isFinite(hopLegFlex) ? hopLegFlex : 0.42 } : {}) },
  });
}
