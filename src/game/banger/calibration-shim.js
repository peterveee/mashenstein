// What the bundled game sees for tools/lib/banger/calibration-data.js (build.js,
// calibrationPlugin): the same object every time, empty until bangerLab.js has filled it.
// The table is several megabytes and only the Lab reads it, so loadBangerModule() fetches it
// when the Lab opens. Not used outside the esbuild bundles; node imports the real file.
export const BANGER_CALIBRATION = (globalThis.__mash_calibration ||= {});
