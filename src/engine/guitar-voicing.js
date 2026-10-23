// Standard-tuning shapes prepared once, never searched on the audio thread.
const TUNING = [40, 45, 50, 55, 59, 64];
const TYPES = { major: [0, 4, 7], minor: [0, 3, 7], seventh: [0, 4, 7, 10],
  major7: [0, 4, 7, 11], minor7: [0, 3, 7, 10],
  // Recognition only: these overlap other readings, so they use the octave-only fallback.
  sixth: [0, 4, 7, 9], minor6: [0, 3, 7, 9], sus2: [0, 2, 7], sus4: [0, 5, 7] };
const pc = n => ((n % 12) + 12) % 12;
const signature = notes => [...new Set(notes.map(pc))].sort((a, b) => a - b).join(',');
const identities = new Map();
for (const [type, intervals] of Object.entries(TYPES)) for (let root = 0; root < 12; root++) {
  const key = signature(intervals.map(n => n + root));
  const list = identities.get(key) || [];
  list.push({ root, type }); identities.set(key, list);
}
const shapes = new Map();
function add(root, type, frets, open) {
  const notes = frets.flatMap((f, i) => f < 0 ? [] : [TUNING[i] + f]);
  if (signature(notes) !== signature(TYPES[type].map(n => n + root))) return;
  const key = `${pc(root)}:${type}`;
  const list = shapes.get(key) || [];
  list.push({ notes, frequencies: notes.map(n => 440 * 2 ** ((n - 69) / 12)), open, position: Math.min(...frets.filter(f => f > 0)) || 0 });
  shapes.set(key, list);
}
// Familiar open shapes, low E through high E; -1 means a muted string.
for (const [root, type, frets] of [
  [0,'major',[-1,3,2,0,1,0]], [2,'major',[-1,-1,0,2,3,2]], [4,'major',[0,2,2,1,0,0]],
  [7,'major',[3,2,0,0,0,3]], [9,'major',[-1,0,2,2,2,0]],
  [2,'minor',[-1,-1,0,2,3,1]], [4,'minor',[0,2,2,0,0,0]], [9,'minor',[-1,0,2,2,1,0]],
  [0,'seventh',[-1,3,2,3,1,0]], [2,'seventh',[-1,-1,0,2,1,2]],
  [4,'seventh',[0,2,0,1,0,0]], [7,'seventh',[3,2,0,0,0,1]], [9,'seventh',[-1,0,2,0,2,0]],
  [0,'major7',[-1,3,2,0,0,0]], [2,'major7',[-1,-1,0,2,2,2]],
  [4,'major7',[0,2,1,1,0,0]], [9,'major7',[-1,0,2,1,2,0]],
]) add(root, type, frets, true);
// Movable E- and A-root shapes: bounded fret spans and conventional fingerings.
for (const [root, type, pattern] of [
  [4,'major',[0,2,2,1,0,0]], [4,'minor',[0,2,2,0,0,0]],
  [4,'seventh',[0,2,0,1,0,0]], [4,'major7',[0,-1,1,1,0,-1]],
  [9,'major',[-1,0,2,2,2,0]], [9,'minor',[-1,0,2,2,1,0]],
  [9,'seventh',[-1,0,2,0,2,0]], [9,'major7',[-1,0,2,1,2,0]],
]) for (let fret = 1; fret <= 12; fret++) {
  add(root + fret, type, pattern.map(f => f < 0 ? -1 : f + fret), false);
}

// Prepare conservative chord-independent fingerings once. At most four fretted
// strings, a two-fret stretch, one pitch per string, and no doubled pitch classes.
// This needs no assumed root and no fretboard search during playback.
const fallbackShapes = new Map();
for (let position = 0; position <= 12; position++) {
  const bestAtPosition = new Map();
  const walk = (string, notes, used, fingers, frets) => {
    if (string === 6) {
      if (notes.length < 3) return;
      const key = signature(notes);
      const rank = (Math.max(...notes) - Math.min(...notes)) + fingers * 2;
      if (!bestAtPosition.has(key) || rank < bestAtPosition.get(key).rank) {
        bestAtPosition.set(key, { rank, notes: [...notes], frets: [...frets] });
      }
      return;
    }
    walk(string + 1, notes, used, fingers, frets);
    for (let fret = position; fret <= position + 2; fret++) {
      if (fret > 0 && fingers === 4) continue;
      const note = TUNING[string] + fret;
      const bit = 1 << pc(note);
      if (used & bit) continue;
      notes.push(note); frets.push(fret);
      walk(string + 1, notes, used | bit, fingers + (fret > 0 ? 1 : 0), frets);
      notes.pop(); frets.pop();
    }
  };
  walk(0, [], 0, 0, []);
  for (const [key, shape] of bestAtPosition) {
    const list = fallbackShapes.get(key) || [];
    list.push({ position, open: shape.frets.includes(0),
      frequencies: shape.notes.map(n => 440 * 2 ** ((n - 69) / 12)) });
    fallbackShapes.set(key, list);
  }
}

/** Preserve every pitch class; use octave-only fitting when a named shape is uncertain. */

export function guitarVoicing(source, config = {}) {
  if (!config.enabled || source.length < 3) return source;
  const midi = source.map(hz => 69 + 12 * Math.log2(hz / 440));
  if (midi.some(n => !Number.isFinite(n) || Math.abs(n - Math.round(n)) > 0.02)) return source;
  const key = signature(midi.map(Math.round));
  const found = identities.get(key);
  const style = ['open', 'barre'].includes(config.style) ? config.style : 'auto';
  const position = Math.max(0, Math.min(12, Math.round(Number(config.position) || 0)));
  const candidates = found?.length === 1 ? shapes.get(`${found[0].root}:${found[0].type}`) || [] : [];
  const fallback = fallbackShapes.get(key) || [];
  let best = null, score = Infinity;
  for (const shape of [...candidates, ...fallback]) {
    if (style === 'open' && !shape.open || style === 'barre' && shape.open) continue;
    // Retain the authored shapes whenever this style has one.
    const rank = Math.abs(shape.position - position) + (style === 'auto' && shape.open ? -2 : 0)
      + (candidates.includes(shape) ? 0 : 100);
    if (rank < score) { best = shape; score = rank; }
  }
  return best ? best.frequencies : source;
}
