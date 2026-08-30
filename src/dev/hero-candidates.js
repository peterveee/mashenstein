// Cast candidates — characters being designed, before anyone has picked one.
//
// A candidate is NOT cast. It has no entry in HEROES, TOON_SPECS or
// HERO_SPRITES, and nothing in a build imports this file: the gallery does, and
// the gallery is a dev page. That separation is the whole reason this module
// exists. Registering a proposal in TOON_SPECS would put it in every production
// section of the gallery, on the hub wall, in the design handoff and in the
// roster the tests count — a look that has not been chosen yet, quoted
// everywhere as though it had. So a candidate carries its own spec and its own
// palette and is handed to drawToon through opts, which is the one seam added
// for it (see drawToon's `opts.spec` / `opts.pal`).
//
// Everything else is the SHIPPED painter. Every candidate is the same humanoid
// rig Lorenzo and Gary run on — same gait, same ink, same light, same two-bone
// limbs — differing only in the flags the rig already reads plus the gear
// pieces added alongside them. That is deliberate: the question a bake-off
// answers is "which look", and it can only answer it if the answer is not also
// contaminated by "which rig".
//
// When one wins: move its spec into TOON_SPECS, its palette into HERO_SPRITES
// (palette ONLY — no pixel grid; the grids in sprites/heroes.js are vestigial
// and nothing reads them, see the note above HERO_SPRITES.kiko), add the
// HEROES row, and delete it from here. When the question is settled the
// section comes out of the gallery too — the painter stays, the bake-off does
// not.

// ---------------------------------------------------------------------------
// THE RAIDER used to be worked out here. SETTLED, and shipped as CLARA VAULT:
// her spec is TOON_SPECS.clara, her palette HERO_SPRITES.clara, her row is in
// HEROES (she took Mochi's slot — Mochi retired to the same held-for-a-cameo
// standing as Miss Chomp). A candidate list for a decision that has been made
// is a second source of truth for her costume, which is exactly the drift this
// file exists to avoid.
//
// What shipped, what each cut beat on the way (B/C/D, then E, then the A
// family down to A3, then the hairline rounds — the pulled cut, the swept-back
// fringe, the forelock that lost, the two wisps that won), and her whole
// persona are written up in docs/notes/clara-persona.md. The painter pieces
// the bake-off built all stay live in toons.js: the pulled HAIR_CUT, the
// swept-back/swept-wisps FRINGES, the numeric tendril counts, the pistol and
// its holsters, and the braid.

// ---------------------------------------------------------------------------
// The martial-artist candidates used to live here too. SETTLED: Kiko shipped —
// she is in HEROES, TOON_SPECS and HERO_SPRITES, drawn by the same painter and
// enumerated by every production section like any other hero. Her power move —
// palms forward, ball of ki — is the `kiblast` branch in drawArms, and the
// reason she fits a runner at all: every other signature that character has is
// a kick, and a kick needs the hero to reach a hazard.
//
// KIKO's head was worked out here as well. What shipped, and what each field
// beat, is written up in docs/notes/kiko-persona.md — including the
// constructions that failed on the way, which are the part worth not
// repeating: a lock placed near the fringe rather than cut into it reads as a
// sideburn; a narrow spike drawn as its own shape gets eaten by the rim
// shading and comes out hollow; and a fringe walked as one out-and-back
// polygon self-intersects and comes out a scribble.
