// Stand-in for src/sprites/toons.js and src/sprites/props.js — and Lorenzo's fish,
// src/game/banger/club-fish.js, and the fish tank's mermaids, src/sprites/mermaids.js — for
// builds that must not carry MASHENSTEIN's cast.
//
// src/engine/visualisers.js imports both at module scope, so the ~5,500 lines of
// hero painters and the whole prop atlas land in any bundle that touches the
// preset pack — whether or not the two presets that draw them are on offer.
// tools/build-visualiser.js resolves both modules here instead, which lets
// esbuild drop the real ones entirely.
//
// Nothing here should ever be CALLED. The same build excludes ARCADE ART GALLERY,
// TOASTER SKY PARADE and DEEP BLUE DISCO from every path that deals a preset, so these exist to
// satisfy the import and to fail loudly rather than quietly if that ever slips:
// a silently blank frame is the version of this bug that ships.
const stripped = (name) => () => {
  throw new Error(`${name}() is not available in a sprite-free build — `
    + 'the SPRITE_VISUALISERS presets should have been excluded');
};

export const drawToon = stripped('drawToon');
export const drawProp = stripped('drawProp');
export const drawApplianceFinish = stripped('drawApplianceFinish');
export const glowSprite = stripped('glowSprite');
export const transitionCameoAction = stripped('transitionCameoAction');

// The three read-only queries are the exception: ArcadeArtGallery calls hasProp()
// in a loop and `continue`s when it is false, so an honest "there are no props
// here" lets even a mistakenly-constructed preset fall through to an empty stage
// rather than throw inside a frame.
export const hasProp = () => false;
export const propFrames = () => 1;
export const propFps = () => 1;

// No fish: a DEEP BLUE DISCO built here anyway finds none to deal and throws in its constructor.
export const FISHES = Object.freeze([]);
export const drawPaperFish = stripped('drawPaperFish');
export const MERMAIDS = Object.freeze([]);

export const setPropCacheProfile = () => {};
export const propCacheStats = () => ({ entries: 0, bytes: 0 });
