// THE BANGER LAB's calibration table (tools/lib/banger/calibration-data.js) is several
// megabytes -- dead weight for every player who never opens the Lab -- so it is its OWN esbuild
// entry (build.js, bangerLab), shipped as dist/bangerLab.js and fetched by menus.js's
// loadBangerModule() when the Lab opens. It is ONLY the table. The Lab's code lives in game.js:
// a separate IIFE bundle would carry its own copy of save, Audio and the state machine, and the
// Lab would see an unloaded save and a silent engine. calibrationPlugin points every other
// import of the table at a live empty object, which this fills in place.
import { BANGER_CALIBRATION } from '../../../tools/lib/banger/calibration-data.js';

Object.assign((globalThis.__mash_calibration ||= {}), BANGER_CALIBRATION);
globalThis.__mash_calibration_loaded = true;
