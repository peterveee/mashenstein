// A cat swipe is a short, readable hit. These clocks drive only the reaction
// and its presentation; they do not change the runner's movement or hitbox.
export const CAT_HIT_T = 0.8;
export const CAT_IFRAMES_T = 1.2;
export const CAT_SWIPE_ACTIVE_FROM = 0.2;
export const CAT_SWIPE_ACTIVE_TO = 0.48;
export const CAT_HIT_POSE_T = 0.14;
export const CAT_HIT_SLASH_T = 4 / 60;
export const CAT_HIT_KNOCKBACK_FRACTION = 0.04;

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const smoothstep = (q) => q * q * (3 - 2 * q);

export function catSwipeActive(strikeT) {
  return Number.isFinite(strikeT)
    && strikeT > CAT_SWIPE_ACTIVE_FROM
    && strikeT <= CAT_SWIPE_ACTIVE_TO;
}

// Draw-only recoil, in the same logical units as the hero's screen anchor.
// The world camera, playerWorldX and all collision tests stay on their normal
// paths while the figure eases back into its running column.
export function catHitScreenOffset(remaining, viewportWidth) {
  if (!(remaining > 0)) return 0;
  const age = clamp01(1 - remaining / CAT_HIT_T);
  return -Math.max(0, Number(viewportWidth) || 0)
    * CAT_HIT_KNOCKBACK_FRACTION * (1 - smoothstep(age));
}

// A couple of startled running poses, then the live run pose takes over. The
// stride phase shift makes the arms and legs catch themselves without asking
// Player to stumble, slow down, or reject input.
export function catHitPose(pose, age) {
  if (!(age >= 0 && age < CAT_HIT_POSE_T)) return pose;
  const recoil = age < 2 / 60
    ? 1
    : 1 - smoothstep(clamp01((age - 2 / 60) / (CAT_HIT_POSE_T - 2 / 60)));
  const next = {
    ...pose,
    lean: (Number(pose.lean) || 0) - 0.42 * recoil,
    faceSurprised: true,
    browRaise: true,
  };
  if (pose.kind === 'run') {
    next.phase = ((Number(pose.phase) || 0) + 0.27 * recoil) % 1;
  }
  return next;
}

// Ten full flicker cycles per second, with the figure remaining at least 30%
// visible. A value of one leaves the ordinary sprite treatment untouched.
export function catHitFlickerAlpha(t, catIframesT) {
  return catIframesT > 0 && Math.floor((Number(t) || 0) * 20) % 2 === 0 ? 0.3 : 1;
}
