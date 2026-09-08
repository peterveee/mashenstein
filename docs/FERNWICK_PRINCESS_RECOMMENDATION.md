# Fernwick princess direction — recommendation

## Shipped quiver attachment — 8 September 2026

The approved attachment is the rounded **B** sling at **W2 (20% thinner)**:
width `0.024u`, quiver palette brown, and **85% opacity**. It has a tapered
shoulder start, two short quiver connections, and a shorter return in the jump.
The quiver and arrows sit `0.035u` above their former position; the bow stays
at its original height. The near arm uses the smaller inward/upward adjustment
only while running (`0.0285u` inward seat, `0.01u` downward seat).

These settings are now in the production Fernwick spec. The comparison page
retains width options and labels W2 as shipped. The older recommendation below
is historical and predates the production character and this selection.


Date: 2026-09-06  
Status: visual recommendation / gallery study; not yet a final production integration

## Recommendation

Recast Fernwick as a female princess-adventurer while keeping the character recognisably
Fernwick. The strongest direction is **G1 — GREEN / CLEAN JOIN**: the existing 2D vector
identity, face, proportions, green palette and readable silhouette stay in place, while
the hair, ears, cap details and ranged weapon provide the new princess-heroine read.

The tone should be a light Zelda parody rather than a direct imitation. Fernwick is a
capable heroine who is genuinely ready to take on the quest, but her earnestness and
slightly awkward grocery-prophecy logic remain the joke.

## Character and personality

Fernwick remains Fernwick; a new name is not recommended at this stage. The gender change
should feel like a confident reinterpretation of the existing hero, not a replacement
character or a generic “girl version.”

Her personality can lean into:

- cheerful determination;
- princessly confidence that is occasionally undercut by practical or bureaucratic
  details;
- sincere excitement about using her bow and taking responsibility for the quest;
- the existing deadpan relationship between heroic prophecy and ordinary supermarket
  paperwork.

The bow-and-arrow direction supports this especially well. The longbow gives her a clear
ranged identity and feels natural for a storybook princess-adventurer without requiring a
new body silhouette.

## Dialogue direction

The line “I finally get to play as the hero” is not recommended. It is too meta and only
lands if the player already understands the joke about character selection or role
assignment.

The coupon gag is worth keeping. The important adjustment is to make the setup
self-contained: the player should understand that Fernwick is treating a faded receipt or
coupon as a sacred prophecy within the same exchange or immediately preceding beat. The
joke should not require prior knowledge of an unseen receipt.

The writing should therefore preserve the contrast between grand heroic language and
mundane shopping language. The receipt/coupon is not merely a prop; it is Fernwick’s
slightly ridiculous but completely sincere source of destiny.

## Approved visual direction: G1

G1 is the current selected head design:

- thick blonde side locks based on reference image #4;
- short, broad outward tufts that read clearly at game scale;
- swept bangs and side pieces that visibly join the tufts;
- small pointed elf-like ears;
- simple green hair ties that are clearly ties, not earrings;
- ties angled with the direction of the tufts rather than parallel to the side hair;
- a clean overlap-free join between side hair, tie and tuft;
- slight tuft bounce during movement;
- green cap and green outfit retained so the redesign remains Fernwick;
- gold cap trim and a ruby centre gem to provide the princess accent.

The body remains roughly the existing Fernwick body for now. A more dress-like lower
silhouette is a possible later refinement, but it is not part of the approved head study
and should not be allowed to weaken the existing readable running shape.

## Cap and headpiece

The compact floppy cap is retained rather than replaced with a conventional crown. This
keeps Fernwick’s silhouette and gives the princess treatment a stronger parody identity.

The current cap treatment uses:

- a full-wrap curved gold band following the cap’s lower line;
- a slightly raised placement so it sits on the cap rather than reading as hair colour;
- a subtle angle rather than a perfectly flat horizontal strip;
- a ruby gem in the central pointed setting;
- a visible but restrained folded-over detail in the floppy cap.

The remaining cap question is the outer point. The point should be narrower and shorter,
with its tip raised so it does not hang too low beside the head. The fold must remain
visible after this change; it is what keeps the cap reading as a floppy folded cap rather
than a plain green wedge.

Two focused cap studies are retained for comparison against G1:

| Study | Direction |
| --- | --- |
| C1 — NARROWER / SHORTER FOLD | A modestly narrower, shorter cap with the point raised and the existing fold retained. |
| C2 — TIGHTER POINT / DEEPER FOLD | A stronger version with a tighter raised point and a more noticeable fold. |

G1 remains the baseline. C1 and C2 are experiments around the cap only; they do not
change the approved hair, ears, ties, palette or body direction.

## What has been rejected or retired from the active comparison

The following alternatives are no longer surfaced in the active gallery:

- the bolder G2 tie;
- the earlier short-versus-wrap tie treatments;
- the earlier compact-setting and wide-tiara alternatives;
- the older hair, ear, gem and headwear bake-off rows;
- wispy pigtails and rounded decorative oval ties.

The reference-art lesson is clear: the hair needs substantial readable masses, and the
ties need to explain the construction of the hairstyle. The green angular G1 bands solve
that better than the rounded ornament-like versions.

## Current implementation status

This work is currently a gallery-only visual study. The normal production Fernwick path
remains unchanged unless the gallery passes are later promoted deliberately.

The active study is implemented through the candidate seam in:

- [src/dev/fernwick-princess-candidates.js](../src/dev/fernwick-princess-candidates.js)
- [src/sprites/toons.js](../src/sprites/toons.js)
- [tools/gallery-entry.js](../tools/gallery-entry.js)

The active gallery now presents G1 followed by the two cap studies. Older alternatives
remain available in the development source as historical material but are not part of the
current decision set.

The gallery was rebuilt with `npm run gallery`, and `git diff --check` passed. The current
comparison page is [dist/gallery-lab.html](../dist/gallery-lab.html). Final art approval
should still be judged at the game camera scale and during movement before any production
asset or hero-data promotion.

## Recommended next decision

Compare C1 and C2 directly against G1 at running scale. If C1 keeps the point high enough
without losing the floppy fold, use it as the next working cap. If the fold disappears at
the real sprite size, use C2’s stronger fold while keeping its point raised and narrow.

After the cap is chosen, the next separate decision is whether the existing green body
should receive a restrained dress-like adjustment. That should be evaluated independently
so it does not disturb the approved head silhouette or bow readability.
