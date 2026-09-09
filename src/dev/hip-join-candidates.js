// THE HIP JOIN — how the near thigh meets the body on a hero with nothing
// hanging over it. Opened 9 Sep 2026 off a lane-size run frame of Lorenzo: the
// near leg arrived as a rounded lozenge stuck across the lower torso, with a
// socket arc printed over its top. On a cast drawn as one continuous mass that
// arc was the only place a limb was announced as a separate part.
//
// SETTLED THE SAME DAY at FLUSH. Nine cuts ran — flush, butt, buttdeep, bare,
// taper (a hip-width wedge into the bone), pelvis and melt (one trouser mass
// bridging both hips, before and after the leg), and under (the near leg
// painted behind the torso). Flush won: the smallest of them, and the arm's own
// fix. The rest are gone from the painter; this comment is their record.
//
// The one thing kept from the losers is limb2's flat `'butt'` root, because the
// SLIDE needs it. Flush's inset — the root pulled half a stroke back up the
// bone — is right for a shoulder buried in a torso and wrong at a reclined hip,
// where it reads as the thigh beginning some way off the body with a gap where
// the buttock should be. So `flush` means the inset root in the run and the
// flat cut in the slide, and both drop the socket arc.
export const HIP_JOIN_CANDIDATES = [
  {
    key: 'now',
    label: 'NOW — round cap, socket disc, socket arc',
    note: 'Shipped. The thigh is stroked with a round cap that crowns half a stroke PAST its '
      + 'root, a trouser disc is filled over that root, and the disc\'s outboard half is '
      + 'OUTLINED. That outline is the complaint: a joint line across the top of the leg.',
  },
  {
    key: 'flush',
    label: 'FLUSH — the cap on the root, no arc',
    note: 'CHOSEN 9 Sep 2026. The cap lands ON the root instead of standing proud of it and the '
      + 'socket arc is dropped; the disc stays, so the root is still buried. In the slide the '
      + 'root is CUT FLAT at full length rather than inset, which is the same fix without the '
      + 'gap an inset opens at a reclined hip.',
  },
];

// WHO THIS IS ABOUT. Every humanoid whose trousers meet the torso in the open:
// no gown (Fernwick), no split dress (Kiko), no apron (Dolores), and not
// Grumpos, who already has a drawn pelvis bridging his thighs. Lorenzo is the
// hero it was raised on and the one it costs most, since his bib and trousers
// are the same blue.
export const HIP_JOIN_HEROES = [
  { id: 'lorenzo', note: 'bib and trousers are ONE blue — the socket arc was the only line there' },
  { id: 'clara', note: 'cropped tank over a hip belt: skin to khaki, nothing to hide a seam' },
  { id: 'rusty', note: 'guest — the dispenser hangs over the join and covers most of it' },
  { id: 'gnash', note: 'plain trousers, plain torso' },
  { id: 'b33p', note: 'short legs, wide hip: the disc is proportionally largest here' },
  { id: 'gary', note: 'cast-roll, but the same painter and the same join' },
];

// ---------------------------------------------------------------- round two
// "Can we shift the near leg further to the left?" — asked of the RUN once the
// join settled, and of the run ALONE: the slide is not in this question.
//
// Left on screen is BACKWARD in body space, so every shift below travels with
// the hero rather than always going the same way on screen. Two different
// things can move, and they do not look alike:
//
//   ROOT moves the hip and nothing else. The feet are absolute gait targets, so
//   the stride lands exactly where it did and the thigh RAKES back from a hip
//   set further behind it — more thigh in the open, the same footfall.
//
//   FOOT moves hip and stride together. The whole leg slides bodily back and
//   keeps its shape; what changes is where the leg sits under the body, and the
//   feet land further behind the chest.
//
// Both are in `u` (the draw height), both are near-leg only, and both are run
// and jump only — `pose.legShift`, unset in production. For scale: 0.03u is
// about 0.7px on the 24px lane hero and about 3px in a gallery study, so read
// the AT SIZE row before believing any of it.
export const LEG_SHIFT_CANDIDATES = [
  { key: 'none', label: 'NONE — flush as chosen', shift: null,
    note: 'The control. Everything below moves the near leg back from exactly this.' },
  { key: 'rake-s', label: 'RAKE, small — hip back 0.03u', shift: { root: -0.03 },
    note: 'Hip only. The foot does not move, so the stride is untouched and the thigh simply '
      + 'leaves from further back — the cheapest of the six, and the one that cannot change '
      + 'where he lands.' },
  { key: 'rake-m', label: 'RAKE, medium — hip back 0.06u', shift: { root: -0.06 },
    note: 'The same move, twice as far. Watch the lead frames of the stride: past a point the '
      + 'raked thigh reads as the leg trailing the body rather than carrying it.' },
  { key: 'shift-s', label: 'SHIFT, small — whole leg back 0.035u', shift: { foot: -0.035 },
    note: 'Hip and stride together. The leg keeps its shape and sits further back under the '
      + 'body; the near foot now lands a little behind where it used to.' },
  { key: 'shift-m', label: 'SHIFT, medium — whole leg back 0.07u', shift: { foot: -0.07 },
    note: 'The same, twice as far — the clearest read of what moving the whole leg buys, and '
      + 'the first cut where the near foot visibly trails the far one.' },
  { key: 'both', label: 'BOTH — whole leg back 0.03u, hip a further 0.03u', shift: { foot: -0.03, root: -0.03 },
    note: 'The leg moves back AND rakes: the hip ends 0.06u behind where it was with the foot '
      + 'only 0.03u behind. The compromise, if one move alone overshoots in one direction and '
      + 'undershoots in the other.' },
];
