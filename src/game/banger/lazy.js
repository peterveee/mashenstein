// THE BANGER LAB (staff-only) and its "make a banger" machinery pull in a
// generated calibration table (tools/lib/banger/calibration-data.js) that
// alone is several megabytes — dead weight for every player who never opens
// it. This file is its OWN esbuild entry point (see build.js, bangerLab),
// built and shipped as a separate dist/bangerLab.js, exactly the way
// gate.js/game.js already split the pre-install gate from the game itself.
// menus.js's loadBangerModule() fetches it with a <script> tag only when the
// player actually opens the Lab — a plain import() here would NOT achieve
// that: esbuild's IIFE format has no code-splitting, so a dynamic import()
// against this same build is silently inlined into the main bundle anyway.
import { BangerMakerState, rerollTake } from './maker.js';
import {
  jukeboxBangerRows, songFor, deleteBanger, bangerTitle, lastPlayedBanger, rememberBanger,
  reviseBanger, keepBanger,
} from './store.js';
import { BangerClubState } from './club.js';
import { BangerBirthState } from './birth.js';
import { pickBirthSwitch } from './birth-switches.js';
import { pickBirthFace } from './birth-faces.js';

window.__mash_banger = {
  BangerMakerState, rerollTake, jukeboxBangerRows, songFor, deleteBanger, bangerTitle,
  lastPlayedBanger, rememberBanger, reviseBanger, keepBanger, BangerClubState, BangerBirthState,
  pickBirthSwitch, pickBirthFace,
};
