# Notes to make 3-quarter 3D characters

These notes record what we changed while converting the flat character rig into a convincing chibi 3/4 view, using Grumpos as the main test case.

## Angle convention

- The character travels from left to right.
- Gallery angles are measured inward from a right-facing profile.
- A 25-degree inward turn therefore means a 65-degree yaw from a front-facing pose.
- In the current positive-yaw gallery pose, the screen-left limbs are foreground and the screen-right limbs recede behind the torso.
- Keep this convention consistent across the head, torso, shoulders, pelvis, arms, legs, clothing and draw order. Mixing conventions is the main cause of a figure looking assembled from unrelated parts.

## Do not fake the turn by only squashing the sprite

A horizontal scale makes a front-facing character narrower, but it does not produce a 3/4 pose. The model needs real asymmetry:

- The foreground shoulder and rib edge are broader.
- The far shoulder and side of the torso are compressed.
- The shoulder line slopes into depth.
- The foreground limbs are slightly wider than the far limbs.
- The far side receives a receding-side shade.
- The head keeps its rounded chibi volume; only a small amount of horizontal compression is needed.

The silhouette and overlaps should communicate most of the turn. Excessive projection scaling makes the character look squashed.

## Face and head

Compressing eye spacing alone still looks like a flat face stuck onto an oval head.

For a turned head:

- Move the whole facial mask—eyes, nose and mouth—toward the direction the character is looking.
- Compress the far-eye spacing.
- Keep the skull, beard, hair and cheek paint anchored to the head.
- This creates a broader near cheek and a narrower far cheek.
- Preserve the large rounded chibi head instead of turning it into a narrow profile.

Grumpos's face tattoo remains attached to the tattooed cheek while the facial landmarks shift beneath the head silhouette.

## Torso

The torso needs an asymmetric path, not a rounded rectangle with a scale transform.

- Use different near and far shoulder widths.
- Use different near and far waist widths.
- Slope the top shoulder edge.
- Offset the torso centre slightly from shoulder to pelvis.
- Shade the far side with a clipped side plane.
- Keep most of the original barrel/chibi width; reduce it only slightly during the turn.

Grumpos's pale torso and skin colours are very similar, so the receding-side shade must use a genuinely contrasting palette colour or it becomes invisible.

## Torso tattoo or sash

A constant-width stroke reads as paint on a flat board. Use a filled, tapered ribbon clipped to the torso.

- Start it on the correct tattooed shoulder.
- Bow it inward over the visible ribcage.
- Keep it on the tattooed side.
- Taper it as it disappears around that same waist contour.
- Do not accidentally send it to the opposite side of the body.

The path should follow the torso's curved volume and use the same near/far convention as the body.

## Shoulder and arm attachment

An arm must merge into the shoulder silhouette. A complete outlined circle at the root looks like a separate ball joint.

- Root each arm at the actual asymmetric shoulder edge.
- Fill the shoulder bridge over the arm's round root cap.
- Stroke only the exposed outer half of the shoulder cap.
- Draw the far arm behind the torso.
- Draw the near arm over the torso where appropriate.
- Make the foreground arm slightly wider and the receding arm slightly narrower.

## Arm motion and elbows

The original elbow problem came from allowing the IK bend sign to change during the cycle. That made an elbow teleport through a 180-degree arc.

- Keep each elbow's bend side fixed throughout the complete walk cycle.
- Swing arms along the left-to-right travel axis, not sideways out from a front-facing chest.
- Use cosine for the arm counter-swing because the gait foot's forward/back position also uses cosine.
- Keep the far hand close to full arm reach. A short target distance forces a two-bone solver into an extreme folded elbow.
- The far elbow should fold inward behind the ribcage so only the appropriate lower-arm portion emerges from behind the torso.
- Use restrained angles for a walk; the larger run angles look frantic on a heavy character.

## Pelvis and leg attachment

The skirt initially hid the fact that the legs ended at independent points inside the abdomen. Hiding the skirt was useful for diagnosing this.

The final structure is:

1. Draw the far thigh behind the body.
2. Draw a real pelvis mass spanning both hip sockets.
3. Draw the torso over the upper pelvis edge.
4. Draw the foreground thigh from the foreground pelvis socket.
5. Draw the skirt over the completed anatomy.

Important details:

- Centre the pelvis beneath the turned torso, not on the old front-facing run axis.
- Separate the left and right hip sockets horizontally.
- Start both thighs at the underside of the pelvis, not inside the belly.
- Do not place a large circular cap over the foreground hip; it reads as a ball stuck to the abdomen.
- The pelvis needs one continuous lower mass joining the torso and thighs.
- The far thigh passes behind the pelvis; the near thigh emerges over its foreground lobe.
- Both knees hinge toward the direction of travel. Opposite bend signs make one leg bow sideways.
- Keep feet aligned with their own hips rather than spreading them independently as a depth trick.
- Grumpos needed slightly shorter walk-cycle leg segments to prevent the knees buckling inward.

## Belt and skirt wrap

A slanted rectangular belt still looks pasted onto the body. It needs curved upper and lower rims.

- Match the belt width to the torso width at the belt's actual height.
- Make the foreground side wider and the far side shorter.
- Bow both belt edges around the waist.
- Add a small far-side turnover so the belt visibly disappears around the body.
- Offset the buckle with the visible front surface instead of always centring it geometrically.

The skirt panel roots must follow the same curved waist edge:

- Use a bowed root line rather than a straight line.
- Scale near and far panels differently.
- Paint far panels first and near panels last.
- Drive each panel from the thigh beneath it.
- Keep far-panel motion quieter.
- Let the belt cover the panel roots and pelvis seam.

## Walk-cycle proportions

For Grumpos's heavy walk:

- Use a short planted stride.
- Use low foot lift.
- Keep body bob small.
- Keep the torso nearly upright.
- Use restrained arm counter-swing.
- Preserve the round chibi head, broad torso and substantial limb widths.

## Useful debugging process

- Build a dedicated gallery cycle rather than judging a single game frame.
- Include a live animation and an eight-frame contact/down/pass/up strip.
- Temporarily hide obstructing costume pieces to inspect the underlying anatomy.
- Check roots and draw order before tuning decorative shapes.
- Inspect contact and passing poses carefully; attachment errors are clearest there.
- Treat screenshots as evidence. In this pass, the no-skirt screenshot exposed an oversized foreground hip cap and missing pelvis bridge that were not obvious from the code alone.
- Restore clothing only after the naked rig reads as one continuous body.

## Final checklist

- [ ] Face points toward travel and is not merely centred and squashed.
- [ ] Near/far eye spacing is asymmetric.
- [ ] Shoulder line and torso silhouette slope into depth.
- [ ] Torso side shading is visible.
- [ ] Tattoo follows the correct side and wraps with the torso.
- [ ] Arms visibly attach at the shoulders.
- [ ] Elbows never flip bend direction during the cycle.
- [ ] Far elbow stays behind the ribcage.
- [ ] Pelvis connects the torso to both thighs.
- [ ] Thigh roots sit below the pelvis rather than over the belly.
- [ ] Knees hinge toward travel.
- [ ] Feet remain under their corresponding hips.
- [ ] Belt has curved wrap and a far-side turnover.
- [ ] Skirt roots follow the curved belt and correct underlying legs.
- [ ] Foreground shapes draw over receding shapes in a consistent order.
- [ ] Rounded chibi proportions survive the turn.
