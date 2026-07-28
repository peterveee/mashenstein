// The sequencer's lane list, in mix order.
//
// This used to live in tools/lib/render-bank.js, where only the offline renderer
// could see it. The mixing desk needs the same list at runtime — one channel strip
// per lane — so it belongs in the engine, with the tools importing it from here.
// `label` names a stem file; `group` is for display and printed summaries.
export const LANES = [
  { key: 'bass', label: 'bass', group: 'melodic' },
  { key: 'lead', label: 'lead', group: 'melodic' },
  { key: 'leadHarm', label: 'lead-harmony', group: 'melodic' },
  { key: 'twinkle', label: 'twinkle', group: 'melodic' },
  { key: 'chords', label: 'chords', group: 'melodic' },
  { key: 'organChords', label: 'organ', group: 'melodic' },
  { key: 'organGliss', label: 'organ-gliss', group: 'fx' },
  { key: 'organSwoop', label: 'organ-swoop', group: 'fx' },
  { key: 'keyGliss', label: 'key-gliss', group: 'fx' },
  { key: 'gliss', label: 'gliss', group: 'fx' },
  { key: 'electroFx', label: 'electro-fx', group: 'fx' },
  { key: 'sweeps', label: 'sweeps', group: 'fx' },
  { key: 'vox', label: 'vox', group: 'vocal' },
  { key: 'shout', label: 'shout', group: 'vocal' },
  { key: 'kick', label: 'kick', group: 'drums' },
  { key: 'snare', label: 'snare', group: 'drums' },
  { key: 'clap', label: 'clap', group: 'drums' },
  { key: 'rim', label: 'rim', group: 'drums' },
  { key: 'hats', label: 'hats-closed', group: 'drums' },
  { key: 'ohats', label: 'hats-open', group: 'drums' },
  { key: 'crash', label: 'crash', group: 'drums' },
];

export const LANE_KEYS = LANES.map((l) => l.key);

// Desk order: the order the channel strips appear on the mixing desk, which is not
// the same as the order the renderer walks. A desk reads kit first — kick, snare,
// claps, hats, then the rest of the percussion — then bass, then everything
// pitched. You balance a song from the bottom up, so the bottom lives on the left.
//
// LANES itself is left alone: it numbers the stem files, and renaming those to suit
// a UI layout would be the tail wagging the dog.
const DESK_ORDER = [
  'kick', 'snare', 'clap', 'hats', 'ohats', 'rim', 'crash',
  'bass',
];

/** Active lanes, ordered for the desk. Anything unlisted keeps its LANES order. */
export function deskLanes(bank, repeat = 1) {
  const rank = (key) => {
    const i = DESK_ORDER.indexOf(key);
    return i === -1 ? DESK_ORDER.length + LANE_KEYS.indexOf(key) : i;
  };
  return activeLanes(bank, repeat).slice().sort((a, b) => rank(a.key) - rank(b.key));
}

/** Expand sections/order into the flat block list the sequencer walks. */
export function songBlocks(bank, repeat = 1) {
  const order = bank.order || (bank.sections ? bank.sections.map((_, i) => i) : [0]);
  const blocks = [];
  for (let r = 0; r < repeat; r++) {
    for (const oi of order) blocks.push(bank.sections ? { ...bank, ...bank.sections[oi] } : bank);
  }
  return blocks;
}

/**
 * Which lanes actually fire anywhere in the song form. The desk shows a strip per
 * active lane, so a bank that declares a lane but never plays it does not clutter
 * the rack; the stem renderer uses it to skip writing silent files.
 */
export function activeLanes(bank, repeat = 1) {
  const blocks = songBlocks(bank, repeat);
  return LANES.filter(({ key }) => blocks.some((b) => b[key] && b[key].some(Boolean)));
}

/**
 * Where each lane actually plays, bar by bar.
 *
 * A song is a list of two-bar blocks, so "does the crash sound anywhere" is not
 * something you can read off the bank — the crash might only appear in section 3.
 * This returns, per lane, a density per bar: 0 for silent, up to 1 for a step on
 * every sixteenth. The desk shades a grid with it so you can see where a sound
 * lives and jump straight to it, which is otherwise a matter of listening through
 * the whole song and hoping.
 *
 * `steps` carries the raw values behind each cell in the same order, so the desk
 * can also say WHAT is played there and not only how much of it. Values are
 * whatever the bank holds: true for a percussion hit, a frequency, or an array of
 * them for a chord.
 */
export function laneActivity(bank, repeat = 1, cellsPerBar = 4) {
  const blocks = songBlocks(bank, repeat);
  // A block is 32 sixteenths = 2 bars, so a bar is 16 steps and a beat is 4.
  const stepsPerCell = 16 / cellsPerBar;
  const cells = blocks.length * 2 * cellsPerBar;
  return activeLanes(bank, repeat).map((lane) => {
    const density = new Array(cells).fill(0);
    const steps = Array.from({ length: cells }, () => []);
    blocks.forEach((b, bi) => {
      const arr = b[lane.key];
      if (!arr) return;
      for (let c = 0; c < 2 * cellsPerBar; c++) {
        let hits = 0;
        const cell = bi * 2 * cellsPerBar + c;
        for (let i = c * stepsPerCell; i < (c + 1) * stepsPerCell; i++) {
          const v = arr[i];
          // Percussion lanes are booleans, melodic ones are Hz or an array of Hz.
          if (v === true || (typeof v === 'number' && v > 0) || (Array.isArray(v) && v.length)) hits++;
          steps[cell].push(v ?? null);
        }
        density[cell] = hits / stepsPerCell;
      }
    });
    return { ...lane, density, steps, cellsPerBar };
  });
}

// Lanes whose voices are dry unless the bank opts them in. The melodic and fx
// lanes call play() with echo defaulting to true; percussion and the vocal
// one-shots stay out of the repeats whatever echoLevel says, which is what keeps
// the delay from turning into a wash. Mirrors the connect decisions in
// AudioSys.scheduleStep — if those change, change these.
const ECHO_OPT_IN = {
  bass: (b) => !!b.bassEcho || !!b.echoEverything,
  vox: (b) => !!b.echoEverything,
  shout: (b) => !!b.echoEverything,
  kick: (b) => !!b.echoEverything,
  snare: (b) => !!b.echoEverything,
  clap: (b) => !!b.echoEverything,
  hats: (b) => !!b.echoEverything,
  ohats: (b) => !!b.echoEverything,
  crash: (b) => !!b.crashEcho || !!b.echoEverything,
  // `rim` is deliberately absent: it always taps the echo bus through its own
  // rimEcho send, unlike the rest of the kit.
};

/**
 * Does this lane reach the delay bus anywhere in the song? The desk greys out the
 * delay send where it does not — a control that silently does nothing reads as
 * broken, which is exactly how it was reported.
 */
export function laneUsesEcho(bank, key, repeat = 1) {
  const test = ECHO_OPT_IN[key];
  if (!test) return true; // melodic + fx lanes echo by default
  return songBlocks(bank, repeat).some(test);
}
