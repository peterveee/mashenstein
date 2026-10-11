# Founder Poster Collection — current art brief

Current implementation brief for GPT-6 Luna, Max reasoning. This version describes the implemented direction and replaces the earlier generic gag-poster brief.

## Goal

The gallery now contains twenty-nine comedic vanity portraits: ten retained originals, fifteen previously added styles, and four new treatments based on the office-style bake-off. These are portrait artworks, not announcement posters: the Founder’s face should dominate, and each should feel like a different medium or art movement. Keep his silver mane, sharp glasses, heavy brows, moustache, warm skin, and self-important expression. The joke is that he has commissioned a roomful of incompatible masterpieces of himself.

The new art is deterministic Canvas code. The childlike crayon drawing has been removed; the Warhol print remains in the lobby and floor 23 rotations. Five portraits reuse the actual office-style painters and their own frames: Art Deco, Gouache, Mid-Century Modern, Busytown Cutaway, and Wax Crayon. All five appear in the full collection previews; Art Deco and Gouache also hang in the lobby rotation with a plain 3px solid outer frame. Gouache's featured portrait is baked at 4× logical resolution to retain its fine brush texture. The other 16 additions remain candidates in the gallery lab only. Gallery names and descriptions identify styles outside the image; do not paint headlines, slogans, credits, or footer bands into the portraits.

## Collection briefs

| ID and poster | Famous-poster cue and art language | Pose, composition, and visual joke | Suggested floor |
| --- | --- | --- | --- |
| `founderTravel` — **Baroque Court Portrait** | Old-master oil painting: velvet shadows, gilt frame, formal pose. | Give him the solemn, self-satisfied bust of a royal portrait, with a tiny crown almost lost in his silver mane. | lobby |
| `founderNouveau` — **1940s Screenprint** | Limited-colour morale screenprint: flat yellow, navy, red scarf, coarse halftone. | Use a close, iconic flexing pose. Keep the face large and the gesture secondary. No slogan or badge text. | lobby |
| `founderDeco` — **Art Deco Monument** | Stepped gold geometry, vertical skyline, radiating fan, monumental scale. | Make a giant bust the center of a stylized Deco city. Keep the architecture as framing, not a workplace scene. | lobby |
| `founderWoodblock` — **Ukiyo-e Wave Portrait** | Japanese woodblock: indigo masses, carved foam, cream paper, small red sun. | Let the wave curl echo and frame his silver mane. The Founder is a large bust, not a worker or surfer. | open |
| `founderCubist` — **Picasso Cubist Portrait** | Picasso-inspired synthetic cubism: angular colour planes and asymmetric facets. | Keep the Founder’s actual silver mane, sharp glasses, heavy brows, and moustache clearly recognizable; use fractured planes as face shading and framing. | exec |
| `founderSurreal` — **Warhol Four-Panel Face Print** | Square Warhol-inspired silkscreen grid with fluorescent palettes and close-cropped repeats. | Repeat the same face four times, filling each square panel with his mane, glasses, and moustache. No labels, slogans, or signatures. | lobby / open |
| `founderBauhaus` — **Bauhaus Geometric** | Primary-colour geometric portrait: circles, blocks, diagonals, flat planes. | Build his recognizable face from a small number of crisp shapes; use asymmetry rather than text to carry the composition. | open |
| `founderNoir` — **Noir Chiaroscuro** | Black-and-white film-noir lighting, hard shadow, narrow beam of light. | Keep only half of his face illuminated, with glasses and moustache emerging from the dark. | exec |
| `founderDiner` — **Art Nouveau Lithograph** | Ornamental lithograph: floral halo, curling vines, muted cream and green, fine gold lines. | Set a centered bust inside the halo and let the silver mane echo the flowing ornament. | lobby |
| `founderPsychedelic` — **80s Airbrush Sci-Fi** | 1980s airbrush illustration: neon orbital halo, chrome colour, distant planet. | Paint a large portrait bust with an atmospheric glow. Avoid modern screens or interface graphics. | open |
| `founderDisco` — **Surrealist Mirror Portrait** | Dalí-inspired surrealism: quiet ochre plain, stretched mirrors, dreamlike scale. | Repeat his reflection in two melting mirrors around the central bust. | lobby |
| `founderFitness` — **Swirling Post-Impressionist** | Van Gogh-inspired brushwork: cobalt field, short gold and turquoise strokes, visible movement. | Keep the portrait still while the painted sky swirls around it. | open |
| `founderMedieval` — **Byzantine Gold Icon** | Gold-leaf icon language: stamped halo, jewel-like marks, frontal pose. | Give him the solemn stare of a saint who has mistaken himself for one. | exec |
| `founderCutout` — **Expressionist Woodcut** | German Expressionist linocut: rough black cuts, ivory face, red shadow, angular border. | Carve a sharp, dramatic likeness from a few high-contrast shapes. | lobby |
| `founderSafety` — **Sumi-e Ink Portrait** | Japanese ink painting: rice paper, restrained monochrome brushwork, broken enso circle. | Make the final portrait quiet and sparse, with his mane and glasses picked out in a few confident strokes. | open |
| `founderGouache` — **Gouache Portrait** | Match the gallery's close 1988-style power portrait: warm umber ground, opaque face and cape, dry-brush highlights, gold frame details. | Keep the Founder nearly life-size in the canvas, with a stern front-facing face, black cape, and red collar; use painted light and texture for depth. | lobby |
| `founderMidcentury` — **Mid-Century Modern Portrait** | Match the teal-and-mustard sunburst screenprint, crisp cut-paper shapes, fine texture, and brass frame. | Use the formal frontal bust, strong red-lined collar, and a clean geometric halo; let the color blocks do the framing. | open |
| `founderCutaway` — **Busytown Cutaway Portrait** | Match the warm storybook ink-and-wash portrait, cream paper, muted green canvas, and hand-drawn timber frame. | Keep one smaller stern bust inside the portrait frame; texture its edges like watercolor and brown ink rather than adding miniature rooms. | exec |
| `founderCrayon` — **Wax Crayon Self-Portrait** | Match the formal kraft-paper portrait from the gallery: layered wax and oil pastel, broad darks, cream highlights, and a handmade gilt edge. | Keep the close frontal bust and high red-lined collar; use confident strokes and hatching, not a childlike figure or doodle. | lobby |

## Drawing and anatomy rules

Use `professorHead` for the established face except for the intentional Picasso plane-split and Bauhaus shape studies. Do not change the production head renderer or the ten retained original paintings. Keep most additions as bust-length portraits; the screenprint may use one flexing arm. Every visible limb must stay connected through its joints and end in a clear hand shape.

Arms use taper from shoulder through elbow to wrist. Sleeves overlap upper arms, hands sit over the wrist ends, and a hand holding a prop must make contact with the grip. Open hands show four unequal fingers and a thumb; closed hands show knuckles and a thumb fold. Keep palms attached to the arm silhouette.

Trousers meet at one pelvis and split into two shaped legs. The hip-to-knee and knee-to-ankle forms overlap cleanly. Draw shoes as footwear with a sole, heel, and toe direction; each ankle ends inside its shoe. For seated poses, connect the thigh to the seat. For climbing, surfing, or standing, visibly connect hands or feet to the supporting ledge, board, or floor.

Change line weight, surface marks, framing, value structure, and silhouette for each art tradition. A palette swap alone is not a new art style. Keep marks intentional and limited; no noisy random texture. Do not add text to the image: gallery metadata names the art style outside the frame.

## Period-correct office equipment

The game world is set in the late 1980s/early 1990s. These portrait studies do not need equipment or workers. If office equipment is ever added to a separate scene, use period-appropriate beige CRT terminals and wired phones; do not draw laptops, flat-panel displays, smartphones, tablets, touch interfaces, Wi-Fi/network symbols, or modern web/cloud UI.

## Integration and review

- `src/engine/stylePacks/officeLigne/professorPosters.js` defines the nineteen added portraits and calls the five exact office-style portrait exports for the matching treatments.
- `src/dev/office-styles/{deco,gouache,mcm,cutaway,crayon}.js` expose `paintFounderGalleryPortrait`; each wrapper uses the same private painter that draws that style's office portrait. The game build tree-shakes the surrounding room renderer and keeps only the portrait call graph.
- `src/engine/stylePacks/officeLigne/professorArt.js` combines the additions with the ten retained posters and dispatches full-frame gallery paintings without an extra generic mat. Warhol remains in the lobby and floor 23 rotations; Art Deco and Gouache are scheduled on lobby wall bays, each inside a plain 3px solid frame.
- `tools/gallery-entry.js` splits the scheduled in-game posters into the main gallery and the unselected poster candidates into `gallery-lab.html`.
- `work/mockups/founder-posters/render.mjs` exports individual poster PNGs and a contact sheet from the served gallery. Re-export after art changes; inspect both thumbnail and enlarged views before treating those images as current.
- Run `npm run gallery` and `npm run build`, then check the five direct painter exports, selected posters in the main gallery, candidate posters in the Lab gallery, Warhol's lobby/floor 23 placements, and Deco/Gouache's lobby placements. The other 16 additions remain gallery candidates only. `node tests/office-climb.js` currently stops at its open-floor landmark-kind uniqueness assertion: the itinerary intentionally contains two lifts, so the test fails before it reaches poster-related code.

The final review should list current rendering evidence and any remaining concern per poster; source checks and a passing build do not establish visual acceptance. The existing PNGs and contact sheet in `work/mockups/founder-posters/` are stale and must not be presented as proof of this revision.
