// The door-walk sequence is SHIPPED — it lives in game/hub/door-walk.js and the
// hub and the Trophy Room both play it. This file is only the gallery's door
// onto it, so the lab section has somewhere to import from and there is exactly
// one copy of the timing in the repo: a preview that drifts from the thing it
// previews is worse than no preview.
//
// There is no phase TABLE to re-export any more. The sequence is distance-
// driven — it runs for as long as the hero has left to walk — so the only
// honest way to preview it is to build a real one and read it, which is what
// makeDoorWalk gives us.
export { makeDoorWalk, openingEdge, WALK_DIR } from '../game/hub/door-walk.js';
