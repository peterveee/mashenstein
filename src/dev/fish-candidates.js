// LORENZO'S FISH BAKE-OFF — candidate fish for the club's flood. 5 Oct 2026.
//
// Peter: "can we do a bake off to get better fish for lorenzo... a bunch of different styles...
// perhaps a bit larger and more comical". Today's was a small, plain fish in three colourings,
// a third of a hero long; these are half a hero and more, and each has a joke of its own.
//
// SETTLED 5 Oct 2026: all eight, in CUT PAPER, at random and a few at a time ("cut paper for
// the fish - i want to use all of them randomly.. perhaps even 2 at a time or more"). They live
// in the game now (src/game/banger/club-fish.js); the bake-off shows them from there. The
// FISHBOWL came out of the club again the same day ("get rid of the one in the fish bowl").
import { FISHES, FISHBOWL } from '../game/banger/club-fish.js';

export const FISH_CANDIDATES = Object.freeze([...FISHES, FISHBOWL]);
