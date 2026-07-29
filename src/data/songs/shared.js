// The one musical constant more than one song uses. Everything else a song needs
// lives in the song's own file.
import { seq } from '../../engine/notes.js';

// A silent percussion lane, for a section that switches a drum off.
export const PERC_OFF = seq('.').map((v) => !!v);
