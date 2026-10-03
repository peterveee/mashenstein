// Shared quiet footwork for the club and its gallery previews.
export const SKIRT_LEGS = Object.freeze(['tap', 'stand', 'hop']);
const SKIRT_STANCE = 0.085;   // a planted foot, from the middle (the dances' own stance is 0.1)
const SKIRT_TAP = 0.035;      // how high the tapping toe comes up
const SKIRT_HOP = 0.045;      // how high a hop goes, as a share of the hero's height
export function tameSkirt(pose, legs, beat) {
  const f = ((beat % 1) + 1) % 1;
  const planted = [[SKIRT_STANCE, 0], [-SKIRT_STANCE, 0]];
  // No feet: the painter stands them as it does at idle, legs straight under the hem
  // (a dance's feet slacken the legs for its kicks, and bowed knees show under a kilt).
  let feet = null, ankles = [0, 0], bounce = pose.bounce * 0.5;
  if (legs === 'tap') {
    // up through the back half of the beat, down on it
    const up = f > 0.5 ? Math.sin((f - 0.5) * 2 * Math.PI) : 0;
    feet = [[SKIRT_STANCE + 0.01, -SKIRT_TAP * up], planted[1]];
    ankles = [-0.4 * up, 0];
  } else if (legs === 'hop') {
    // off the floor between beats, landing on each one
    bounce = SKIRT_HOP * Math.sin(f * Math.PI);
  }
  return { ...pose, bounce, dance: { ...pose.dance, feet, ankles } };
}
