// Filing a preset into src/data/voices.js — the one rulebook for every page that saves
// one. Moved out of tools/mixer.js on 7 Oct 2026 so the Banger Sound Palette's editor
// (tools/banger-sounds.js) files a sound exactly the way the desk does: the same refusals,
// the same measurement, the same roll-back when a render fails.
//
// The entry is rewritten in place in src/data/voices.js, then MEASURED, and the
// measurement spliced into LEVELS and PEAKS.
//
// The measure is not optional and it is not a nicety. `voiceGain` derives a preset's gain
// by dividing the lane's target by its measured level, so a preset whose envelope moved
// and whose level did not is a preset that is quietly the wrong loudness in every song and
// every render. Saving without measuring would be the one thing the desk's own comments
// warn against.
//
// The host supplies the two things that need a browser: `measure(id, preset, src)`, which
// renders one note of the saved entry through the real engine and answers
// `{ level, peak }`, and `restart()`, which drops any warm renderer so the next render
// bundles the file as it is NOW. Everything else here is file text.
import { VOICES } from '../../src/data/voices.js';
import {
  readVoicesSource, writeVoicesSource, upsertPreset, setMeasured, tableOf, TABLES, USER_TABLES,
} from './voices-source.js';

// Read once, at start-up: the starter set is written by tools/freeze-starter-voices.js,
// which is a script somebody types, not something a server can cause to happen.
const STARTER_IDS = new Set(Object.values(VOICES).filter((v) => v.starter).map((v) => v.id));
const LIBRARY_IDS = new Set(Object.values(VOICES).filter((v) => v.factory).map((v) => v.id));

const text = (status, body) => ({ status, type: 'text', body });
const json = (status, body) => ({ status, type: 'json', body });

/**
 * Save `preset` under `id`, measured, or say why not.
 *
 * `dev` is whether the request may write a library table — the desk's DEV_USER and its
 * `x-mixer-role: dev` header, decided by the host. Answers `{ status, type, body }`, `type`
 * being 'text' or 'json', for the host to send as it is.
 */
export async function saveVoice({ id, preset, table, library: requestedLibrary, dev = false }, {
  measure, restart, read = readVoicesSource, write = writeVoicesSource, log = console.log,
}) {
  let src = read();
  const existingTable = tableOf(src, id);
  const libraryTable = LIBRARY_IDS.has(id)
    || (existingTable && Object.values(TABLES).includes(existingTable));
  const devLibraryCreate = dev && requestedLibrary === true && !existingTable
    && Object.values(TABLES).includes(table);
  // Built-in library entries are shipped reference sounds, not user documents.
  // A client-side guard makes the UI clear, but this server-side check is the
  // actual boundary so a stale page or hand-written request cannot overwrite one.
  if (libraryTable && !dev) {
    return text(403, `"${id}" is a library preset and cannot be edited. Save it as a new user preset.`);
  }
  // The starter table is not writable and this is where that is enforced. A pack
  // names these, and the whole reason they exist is that a song generated next
  // month sounds like the pack was written to sound rather than like whatever the
  // library holds by then — see STARTER in src/data/voices.js. `tableOf` cannot
  // find one either, so without this the editor's `table` hint would have it write
  // a SECOND entry under the same id into TONE, and the catalogue would hold two
  // definitions of one sound.
  if (STARTER_IDS.has(id)) {
    return text(409, `"${id}" is a starter sound — the New Song generator is written for it,`
      + ' so it cannot be saved over. Use Save as new to keep your edit under its'
      + ' own name.');
  }
  // A song's own copy is keyed `chordsVoice@bitter-lullaby` — which lane of which
  // song owns it — and that is not a usable identifier in a source file. `commit`
  // in the editor takes a library name before it ever gets here, so an id like this
  // arriving means the flag that says "this belongs to a song" was lost somewhere.
  // Said plainly, because `upsertPreset` throwing on it reaches the desk as a 500
  // and a stack trace in a terminal nobody is looking at.
  if (!/^[A-Za-z_$][\w$]*$/.test(id)) {
    return text(400, `"${id}" is not a library name — it is a song's own copy of a preset.`
      + ' Rename it and save again, and it becomes a preset of its own.');
  }
  const where = existingTable || table;
  if (!where) {
    return text(400, `no table for "${id}" — a new preset has to say whether it is user TONE, NOISE or DRUM`);
  }
  if (!Object.values(USER_TABLES).includes(where)
    && !(dev && (libraryTable || devLibraryCreate)
      && Object.values(TABLES).includes(where))) {
    return text(403, dev
      ? 'presets must be saved to a USER_* table or an existing library table'
      : 'new presets must be saved to a USER_* table; built-in library tables are read-only');
  }
  // Written before it is measured, because the measurement runs the real engine
  // over the real file: there is no way to render a preset that is not in it.
  const before = src;
  src = upsertPreset(src, id, preset, where);
  write(src);
  await restart();          // or the render measures the preset it replaced
  let level; let peak;
  try {
    ({ level, peak } = await measure(id, preset, src));
  } catch (err) {
    // Put the file back. A preset that cannot be rendered is one that would sit
    // in the catalogue sounding fine on the desk and missing from every export,
    // and leaving it there because the measurement threw is the worst of both.
    write(before);
    await restart();
    return text(500, `could not render "${id}", so it was not saved:\n\n${err.message || err}`);
  }
  // Silent is a real outcome, not an error: Tone builds plenty of things that
  // make no sound. It is reported rather than saved, for the same reason.
  if (!(level > 0)) {
    write(before);
    await restart();
    log(`"${id}" renders SILENT — not saved`);
    return json(200, { id, level: 0, peak: 0, silent: true, saved: false });
  }
  // Nearly silent is its own hazard, and a worse one than it looks: `voiceGain`
  // divides the lane's target by this number, so a preset measuring a thousandth
  // of one is not a quiet preset — it is one the engine multiplies by about
  // eleven hundred, and whatever noise floor it has comes up with it. Saved
  // anyway, because tools/measure-voices.js saves it too and the two must not
  // disagree, but said.
  const quiet = level < 0.0004;
  write(setMeasured(src, id, { level, peak }));
  log(`saved voice ${id} to src/data/voices.js — level ${level.toFixed(6)}`
    + `  peak ${peak.toFixed(4)}`
    + (quiet ? '  ** very quiet: check its envelope **' : ''));
  return json(200, {
    id, level: Number(level.toFixed(6)), peak: Number(peak.toFixed(4)),
    silent: false, quiet, saved: true,
  });
}
